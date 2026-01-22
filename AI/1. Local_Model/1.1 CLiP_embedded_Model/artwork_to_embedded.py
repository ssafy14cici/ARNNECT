import json
import os
import torch
import open_clip
from PIL import Image
from pathlib import Path
from tqdm import tqdm
import numpy as np
import contextlib

# ==========================================
# 1. 설정 (절대 경로 유지)
# ==========================================
# 폴더 경로는 아까 확인된 절대 경로를 그대로 씁니다.
IMAGE_DIR = Path(r"C:\Users\SSAFY\Desktop\git\S14P11E107\AI\1. Local_Model\1.1 CLiP_embedded_Model\artwork_image")

MODEL_NAME = "ViT-B-32"
PRETRAINED_DATA = "datacomp_xl_s13b_b90k"

# 🛑 [범위 설정] test_01000 번까지 처리
# (만약 파일이 1000개라면 끝까지 돌아갑니다)
STOP_AT_ID = "test_01000"

def build_smart_index(directory):
    """
    폴더 내의 모든 파일을 미리 스캔해서 지도를 만듭니다.
    Key: "확장자를 뺀 파일명" (예: 'test_image_00001')
    Value: "실제 파일 전체 경로"
    """
    print(f"\n[System] '{directory}' 파일 인덱싱(지도 생성) 중...")
    
    stem_map = {} 
    
    count = 0
    # 하위 폴더까지 싹 다 뒤집니다
    for root, _, files in os.walk(directory):
        for file in files:
            full_path = Path(root) / file
            # 확장자를 뗀 이름 (stem)을 키로 사용
            file_stem = full_path.stem 
            stem_map[file_stem] = full_path
            count += 1
            
    print(f" -> 총 {count}개의 이미지 파일을 발견했습니다.")
    return stem_map

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n[System] 디바이스: {device.upper()}")
    autocast_ctx = torch.cuda.amp.autocast if device == "cuda" else contextlib.nullcontext

    # --- [Step 1] 인덱싱 ---
    if not IMAGE_DIR.exists():
        print(f"❌ [치명적 에러] 폴더가 없습니다: {IMAGE_DIR}")
        return

    # 실제 파일 목록 지도 생성 (예: 'test_image_00001' -> 경로)
    file_map = build_smart_index(IMAGE_DIR)
    
    if not file_map:
        print("❌ 폴더가 비어있습니다.")
        return

    # --- [Step 2] 모델 로딩 ---
    print(f"\n[1/4] 모델 로딩 중... ({MODEL_NAME})")
    try:
        model, _, preprocess = open_clip.create_model_and_transforms(
            MODEL_NAME, pretrained=PRETRAINED_DATA, device=device
        )
        model.eval()
        tokenizer = open_clip.get_tokenizer(MODEL_NAME)
    except Exception as e:
        print(f"❌ 모델 로딩 실패: {e}")
        return

    # --- [Step 3] JSON 로드 ---
    json_candidates = [
        Path("artwork.json"), 
        Path(__file__).resolve().parent / "artwork.json",
        Path(__file__).resolve().parent.parent / "artwork.json"
    ]
    
    input_json_path = None
    for p in json_candidates:
        if p.exists():
            input_json_path = p
            break
            
    if not input_json_path:
        print(f"❌ 'artwork.json' 파일을 찾을 수 없습니다.")
        return

    print(f"\n[2/4] '{input_json_path.name}' 읽는 중...")
    with open(input_json_path, "r", encoding="utf-8") as f:
        all_items = json.load(f)
    print(f" -> 전체 데이터: {len(all_items)}개")


    # --- [Step 4] 임베딩 변환 ---
    results = []
    success_count = 0
    missing_count = 0
    
    print(f"\n[3/4] 임베딩 변환 시작 (목표: {STOP_AT_ID} 까지)...")
    
    for item in tqdm(all_items):
        artist_id = item.get("artist_id") or item.get("artist_name")
        artwork_id = item.get("artwork_id") or item.get("item_id")  # 예: test_00001
        
        if not artist_id or str(artist_id).lower() == "unknown": continue
        if not artwork_id: continue

        # ---------------------------------------------------------
        # 🔥 파일명 매칭 로직 (Prefix 처리)
        # ---------------------------------------------------------
        # 1. JSON ID (test_00001)
        target_stem = str(artwork_id) 
        
        # 2. 사용자 파일명 패턴 (test_image_00001)
        # test_ 부분을 test_image_ 로 바꿔서 시도
        alt_stem = target_stem.replace("test_", "test_image_")

        img_path = None
        
        # 전략 1: 그냥 ID랑 똑같은 파일이 있나? (test_00001)
        if target_stem in file_map:
            img_path = file_map[target_stem]
            
        # 전략 2: '_image_' 붙인 파일이 있나? (test_image_00001)
        elif alt_stem in file_map:
            img_path = file_map[alt_stem]
        
        if img_path is None:
            missing_count += 1
            if missing_count <= 5:
                # 너무 많이 출력되지 않게 처음 5개만 로그
                print(f"   [Missing] 못 찾음: {alt_stem} (ID: {artwork_id})")
            continue

        # ---------------------------------------------------------
        # 임베딩 수행
        # ---------------------------------------------------------
        try:
            image_obj = Image.open(img_path).convert("RGB")
            image_input = preprocess(image_obj).unsqueeze(0).to(device)

            with torch.no_grad(), autocast_ctx():
                image_features = model.encode_image(image_input)
                image_features /= image_features.norm(dim=-1, keepdim=True)
                
                final_vec = image_features
                desc = item.get("description", "")
                if desc:
                    text_input = tokenizer([desc]).to(device)
                    text_features = model.encode_text(text_input)
                    text_features /= text_features.norm(dim=-1, keepdim=True)
                    final_vec = (image_features * 0.95) + (text_features * 0.05)
                    final_vec /= final_vec.norm(dim=-1, keepdim=True)

            results.append({
                "artist_id": artist_id,
                "artwork_id": artwork_id,
                "artwork_vector": final_vec.cpu().float().numpy().flatten().tolist()
            })
            success_count += 1

        except Exception as e:
            print(f"Error processing {img_path}: {e}")
            continue

        # 🛑 [종료 조건] test_01000 번이면 멈춤
        if str(artwork_id) == STOP_AT_ID:
            print(f"\n🛑 목표 ID '{STOP_AT_ID}' 도달! 여기서 멈춥니다.")
            break

    # --- [Step 5] 저장 ---
    output_file = Path("artwork_vector.json")
    print(f"\n[4/4] 저장 중... ({output_file.absolute()})")
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n" + "="*50)
    print(f"✅ 완료되었습니다!")
    print(f"  - 성공: {success_count}개")
    print(f"  - 실패(파일없음): {missing_count}개")
    print("="*50)

if __name__ == "__main__":
    main()