import json
import os
import torch
import open_clip
from PIL import Image
from pathlib import Path
from tqdm import tqdm
import numpy as np

# ==========================================
# 1. 설정 (보내주신 샘플 구조에 최적화)
# ==========================================
# 이미지가 들어있는 폴더 이름 (현재 폴더의 images 또는 train 등)
IMAGE_SUB_DIRS = ["train", "images", "train_test", "."]
MODEL_NAME = "ViT-B-32"
PRETRAINED_DATA = "openai" 

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

    # --- [Step 2] 데이터 로드 (JSONL 형식 대응) ---
    print(f"\n[2/4] 'artwork.json' 데이터 읽는 중...")
    items = []
    meta_path = Path("artwork.json")
    
    if not meta_path.exists():
        print("❌ 'artwork.json' 파일이 없습니다. 파일명을 확인해주세요.")
        return

    with open(meta_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    items.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    
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
        # 샘플 기준: artist_name 또는 artist_id 사용
        artist_id = item.get("artist_id") or item.get("artist_name")
        if not artist_id or str(artist_id).strip().lower() == "unknown":
            skipped_unknown += 1
            continue

        # 2. 이미지 파일 찾기
        # 샘플 기준: file_name 필드 사용
        file_name = item.get("file_name")
        if not file_name:
            missing_image += 1
            continue
            
        # 여러 폴더 후보군에서 이미지 검색
        img_path = None
        for sub in IMAGE_SUB_DIRS:
            target = Path(sub) / file_name
            if target.exists():
                img_path = target
                break
        
        if img_path is None:
            missing_image += 1
            continue

        # 3. 임베딩 연산
        try:
            # 이미지 인코딩
            image_obj = Image.open(img_path).convert("RGB")
            image_input = preprocess(image_obj).unsqueeze(0).to(device)
            
            with torch.no_grad(), torch.cuda.amp.autocast():
                image_features = model.encode_image(image_input)
                image_features /= image_features.norm(dim=-1, keepdim=True)

            final_vec = image_features

            # 텍스트(설명) 결합 (10% 비중)
            description = item.get("description", "")
            if description:
                # CLIP은 최대 77토큰까지만 처리 가능
                text_input = tokenizer([description[:200]]).to(device)
                with torch.no_grad(), torch.cuda.amp.autocast():
                    text_features = model.encode_text(text_input)
                    text_features /= text_features.norm(dim=-1, keepdim=True)
                
                # 가중치 결합
                combined = (image_features * 0.9) + (text_features * 0.1)
                combined /= combined.norm(dim=-1, keepdim=True)
                final_vec = combined

            # 4. 결과 리스트 추가 (요청하신 형식)
            results.append({
                "artist_id": artist_id,
                "artwork_id": item.get("item_id", img_path.stem),
                "artwork_vector": final_vec.cpu().float().numpy().flatten().tolist()
            })
            success_count += 1

        except Exception as e:
            # 이미지 손상 등의 에러
            missing_image += 1
            continue

    # --- [Step 4] 결과 저장 (Prettified JSON) ---
    output_file = Path("artwork_vector.json")
    print(f"\n[4/4] 결과 저장 중 (Prettified Format)...")

    # 리스트 구조로 묶어서 저장해야 전체 파일이 하나의 유효한 JSON 객체가 됩니다.
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            # indent=4: 4칸 들여쓰기 적용
            # ensure_ascii=False: 한글 등 유니코드 문자를 그대로 저장 (읽기 편함)
            # sort_keys=True: 키를 알파벳 순으로 정렬하여 일관성 유지
            json.dump(results, f, ensure_ascii=False, indent=4, sort_keys=True)
            
        print(f"\n" + "="*45)
        print(f"✅ 가독성 높은 JSON 파일 저장 완료!")
        print(f" - 파일 경로: {output_dir.absolute() if 'output_dir' in locals() else output_file.absolute()}")
        print(f" - 데이터 구조: [ {{ 'artist_id': ..., 'artwork_id': ..., 'artwork_vector': [...] }}, ... ]")
        print("="*45)
    except Exception as e:
        print(f"❌ 저장 중 오류 발생: {e}")

if __name__ == "__main__":
    main()