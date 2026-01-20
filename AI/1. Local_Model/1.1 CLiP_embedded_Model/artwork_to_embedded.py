import json
import os
import torch
import open_clip
from PIL import Image
from pathlib import Path
from tqdm import tqdm
import numpy as np

# ==========================================
# 1. 설정 (요청하신 설정값 그대로 유지)
# ==========================================
# IMAGE_SUB_DIRS에 이미지가 담긴 폴더 이름을 입력 ㄱㄱ
IMAGE_SUB_DIRS = ["artwork_image"] 
MODEL_NAME = "ViT-B-32" # 512차원으로 벡터를 임베딩
PRETRAINED_DATA = "datacomp_xl_s13b_b90k" # 원래는 openai 데이터를 썻지만, 최근에는 datacomp 이 데이터셋이 더 좋은 성능을 낸다고 함.

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n[System] 현재 디바이스: {device.upper()}")

    # --- [Step 1] 모델 로딩 ---
    print(f"\n[1/4] 모델 로딩 중... ({MODEL_NAME} / {PRETRAINED_DATA})")
    try:
        model, _, preprocess = open_clip.create_model_and_transforms(
            MODEL_NAME, pretrained=PRETRAINED_DATA, device=device
        )
        model.eval()
        tokenizer = open_clip.get_tokenizer(MODEL_NAME)
    except Exception as e:
        print(f"❌ 모델 로딩 실패: {e}")
        return

    # --- [Step 2] 데이터 로드 (JSON 방식 수정됨) ---
    # [수정] 이전에 만든 파일명으로 변경
    input_json_file = "artwork.json" 
    print(f"\n[2/4] '{input_json_file}' 데이터 읽는 중...")
    
    items = []
    meta_path = Path(input_json_file)
    
    if not meta_path.exists():
        print(f"❌ '{input_json_file}' 파일이 없습니다. 파일명을 확인해주세요.")
        return

    # [수정 핵심] 한 줄씩(Loop) 읽지 않고, 통째로(json.load) 읽습니다.
    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            items = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ JSON 문법 오류: {e}")
        return
    
    print(f" -> 총 {len(items)}개의 후보 데이터를 찾았습니다.")
    if len(items) > 0:
        print(f" -> 데이터 키 확인: {list(items[0].keys())}")

    # --- [Step 3] 임베딩 생성 ---
    results = []
    skipped_unknown = 0
    missing_image = 0
    success_count = 0
    
    print(f"\n[3/4] 임베딩 생성 및 필터링 시작...")
    
    for item in tqdm(items, desc="Embedding"):
        # 1. 작가 필터링 (Unknown 제외)
        artist_id = item.get("artist_id") or item.get("artist_name")
        if not artist_id or str(artist_id).strip().lower() == "unknown":
            skipped_unknown += 1
            continue

        # 2. 이미지 파일 찾기
        # [수정] processed_artwork.json은 'image_path' 키를 사용합니다.
        # (기존 코드의 'file_name'을 'image_path'로 변경하여 호환성 확보)
        json_path_str = item.get("image_path", "")
        if not json_path_str:
            missing_image += 1
            continue
            
        # 우선 JSON에 적힌 경로 그대로 확인
        img_path = Path(json_path_str)
        
        # 만약 그대로 없으면, 설정된 SUB_DIR과 결합 시도
        if not img_path.exists():
            filename = os.path.basename(json_path_str)
            found = False
            for sub in IMAGE_SUB_DIRS:
                target = Path(sub) / filename
                if target.exists():
                    img_path = target
                    found = True
                    break
            
            if not found:
                missing_image += 1
                continue

        # 3. 임베딩 연산
        try:
            # 이미지 인코딩
            image_obj = Image.open(img_path).convert("RGB")
            image_input = preprocess(image_obj).unsqueeze(0).to(device)
            
            # Autocast 문법 (PyTorch 버전에 따라 경고가 뜰 수 있어 안전한 방식으로 작성)
            with torch.no_grad(), torch.amp.autocast('cuda' if device=='cuda' else 'cpu'):
                image_features = model.encode_image(image_input)
                image_features /= image_features.norm(dim=-1, keepdim=True)

            final_vec = image_features

            # 텍스트(설명) 결합 (5% 비중)
            description = item.get("description", "")
            if description:
                # [수정] CLIP은 최대 77토큰까지만 처리 가능 (200 -> 77)
                text_input = tokenizer([description[:77]]).to(device)
                
                with torch.no_grad(), torch.amp.autocast('cuda' if device=='cuda' else 'cpu'):
                    text_features = model.encode_text(text_input)
                    text_features /= text_features.norm(dim=-1, keepdim=True)
                
                # 가중치 결합 (0.95 : 0.05)
                combined = (image_features * 0.95) + (text_features * 0.05)
                combined /= combined.norm(dim=-1, keepdim=True)
                final_vec = combined

            # 4. 결과 리스트 추가
            results.append({
                "artist_id": artist_id,
                "artwork_id": item.get("artwork_id", item.get("item_id", img_path.stem)),
                "artwork_vector": final_vec.cpu().float().numpy().flatten().tolist()
            })
            success_count += 1

        except Exception as e:
            # 이미지 손상 등의 에러
            missing_image += 1
            continue

    # --- [Step 4] 결과 저장 (JSON Format) ---
    output_file = Path("artwork_vector.json")
    print(f"\n[4/4] 결과 저장 중 (Prettified Format)...")

    try:
        with open(output_file, "w", encoding="utf-8") as f:
            # indent=4: 4칸 들여쓰기 적용
            json.dump(results, f, ensure_ascii=False, indent=4, sort_keys=True)
            
        print(f"\n" + "="*45)
        print(f"✅ 가독성 높은 JSON 파일 저장 완료!")
        print(f" - 파일 경로: {output_file.absolute()}")
        print(f" - 데이터 구조: [ {{ 'artist_id': ..., 'artwork_id': ..., 'artwork_vector': [...] }}, ... ]")
        print("="*45)
    except Exception as e:
        print(f"❌ 저장 중 오류 발생: {e}")

if __name__ == "__main__":
    main()