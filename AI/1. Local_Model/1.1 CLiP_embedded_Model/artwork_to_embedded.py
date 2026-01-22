import json
import os
import torch
import open_clip
from PIL import Image
from pathlib import Path
from tqdm import tqdm
import numpy as np
import contextlib
import sys

# ==========================================
# 1. 설정
# ==========================================

# [Modified] 절대 경로 대신, 현재 실행 중인 파일(artwork_to_embedded.py)의 위치를 기준으로 경로를 설정합니다.
# 이렇게 하면 폴더 이름이 조금 바뀌거나 다른 컴퓨터로 옮겨도 에러가 나지 않습니다.
CURRENT_DIR = Path(__file__).resolve().parent
IMAGE_DIR = CURRENT_DIR / "artwork_image"

# [Modified] 코드 아래쪽에서 사용되나 선언이 누락되어 있어 추가했습니다.
# 특정 ID에서 멈추고 싶다면 "test_01000" 처럼 문자열을 넣으세요. (없으면 None)
STOP_AT_ID = None  

MODEL_NAME = "ViT-B-32"
PRETRAINED_DATA = "datacomp_xl_s13b_b90k"

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
    # [Modified] 폴더 확인 로직 강화
    if not IMAGE_DIR.exists():
        print(f"❌ [치명적 에러] 폴더가 없습니다: {IMAGE_DIR}")
        print(f"   (현재 스크립트 위치: {CURRENT_DIR})")
        
        # [Modified] 디버깅을 위해 현재 폴더에 무엇이 있는지 출력해줍니다.
        print("\n👇 현재 폴더에 있는 파일/폴더 목록:")
        for item in CURRENT_DIR.glob("*"):
            print(f"   - {item.name}")
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
        CURRENT_DIR / "artwork.json", # [Modified] 현재 경로 기준 탐색 추가
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
    
    # [Modified] STOP_AT_ID가 None일 경우를 대비해 출력 메시지 수정
    stop_msg = STOP_AT_ID if STOP_AT_ID else "끝"
    print(f"\n[3/4] 임베딩 변환 시작 (목표: {stop_msg} 까지)...")
    
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

        # 🛑 [종료 조건] STOP_AT_ID가 설정되어 있고 일치하면 멈춤
        if STOP_AT_ID and str(artwork_id) == STOP_AT_ID:
            print(f"\n🛑 목표 ID '{STOP_AT_ID}' 도달! 여기서 멈춥니다.")
            break

    # --- [Step 5] 저장 ---
    # [Modified] 저장 위치도 현재 폴더 기준 상대 경로로 명확히 지정
    output_file = CURRENT_DIR / "artwork_vector.json"
    print(f"\n[4/4] 저장 중... ({output_file})")
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n" + "="*50)
    print(f"✅ 완료되었습니다!")
    print(f"  - 성공: {success_count}개")
    print(f"  - 실패(파일없음): {missing_count}개")
    print("="*50)

if __name__ == "__main__":
    main()