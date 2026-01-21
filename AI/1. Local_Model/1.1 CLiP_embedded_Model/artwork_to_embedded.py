import json
import os
import torch
import open_clip
from PIL import Image
from pathlib import Path
from tqdm import tqdm
import numpy as np
import contextlib  # ✅ 추가

# ==========================================
# 1. 설정
# ==========================================
IMAGE_DIR = Path("artwork_image")  # ✅ 여기만 믿고 파일 찾기
MODEL_NAME = "ViT-B-32"
PRETRAINED_DATA = "datacomp_xl_s13b_b90k"

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n[System] 현재 디바이스: {device.upper()}")

    # ✅ CPU에서는 autocast 안 씀 (버전/호환 문제 방지)
    autocast_ctx = torch.cuda.amp.autocast if device == "cuda" else contextlib.nullcontext

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

    # --- [Step 2] 데이터 로드 ---
    input_json_file = "artwork.json"
    print(f"\n[2/4] '{input_json_file}' 데이터 읽는 중...")

    meta_path = Path(input_json_file)
    if not meta_path.exists():
        print(f"❌ '{input_json_file}' 파일이 없습니다. 파일명을 확인해주세요.")
        return

    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            items = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ JSON 문법 오류: {e}")
        return

    print(f" -> 총 {len(items)}개의 후보 데이터를 찾았습니다.")
    if len(items) > 0:
        print(f" -> 데이터 키 확인: {list(items[0].keys())}")

    # ✅ 이미지 폴더 존재 확인
    if not IMAGE_DIR.exists():
        print(f"❌ 이미지 폴더가 없습니다: {IMAGE_DIR.resolve()}")
        return
    else:
        # 폴더 안 파일이 실제 있는지도 한 번 확인
        sample_files = list(IMAGE_DIR.glob("*"))
        print(f" -> 이미지 폴더 확인: {IMAGE_DIR.resolve()} (파일 {len(sample_files)}개)")

    # --- [Step 3] 임베딩 생성 ---
    results = []
    skipped_unknown = 0
    missing_image = 0
    failed_embed = 0
    success_count = 0

    # ✅ 누락 이미지 로그 (최초 몇 개만 기록)
    missing_examples = []

    print(f"\n[3/4] 임베딩 생성 및 필터링 시작...")

    for item in tqdm(items, desc="Embedding"):
        # 1) 작가 필터링
        artist_id = item.get("artist_id") or item.get("artist_name")
        if not artist_id or str(artist_id).strip().lower() == "unknown":
            skipped_unknown += 1
            continue

        # 2) artwork_id 확보
        artwork_id = item.get("artwork_id") or item.get("item_id")
        if not artwork_id:
            # artwork_id까지 없으면 의미가 없어서 스킵
            failed_embed += 1
            continue

        # 3) 이미지 파일명만 뽑아서 artwork_image에서만 찾기
        #    ✅ image_path / image_url 둘 다 지원
        path_str = item.get("image_path") or item.get("image_url") or ""
        if not path_str:
            missing_image += 1
            if len(missing_examples) < 20:
                missing_examples.append({"artwork_id": artwork_id, "reason": "no image_path/image_url"})
            continue

        filename = os.path.basename(str(path_str).replace("\\", "/"))
        img_path = IMAGE_DIR / filename  # ✅ 핵심: 무조건 여기서만 찾음

        # 혹시 확장자만 다른 케이스(.png/.jpg) 대비: 같은 stem으로 탐색
        if not img_path.exists():
            stem = Path(filename).stem
            candidates = list(IMAGE_DIR.glob(stem + ".*"))
            if candidates:
                img_path = candidates[0]

        if not img_path.exists():
            missing_image += 1
            if len(missing_examples) < 20:
                missing_examples.append({
                    "artwork_id": artwork_id,
                    "filename": filename,
                    "expected": str(img_path)
                })
            continue

        # 4) 임베딩
        try:
            image_obj = Image.open(img_path).convert("RGB")
            image_input = preprocess(image_obj).unsqueeze(0).to(device)

            with torch.no_grad():
                with autocast_ctx():
                    image_features = model.encode_image(image_input)
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            final_vec = image_features

            description = item.get("description", "")
            if description:
                text_input = tokenizer([description]).to(device)
                with torch.no_grad():
                    with autocast_ctx():
                        text_features = model.encode_text(text_input)
                    text_features = text_features / text_features.norm(dim=-1, keepdim=True)

                combined = (image_features * 0.95) + (text_features * 0.05)
                combined = combined / combined.norm(dim=-1, keepdim=True)
                final_vec = combined

            results.append({
                "artist_id": artist_id,
                "artwork_id": artwork_id,
                "artwork_vector": final_vec.detach().cpu().float().numpy().flatten().tolist()
            })
            success_count += 1

        except Exception:
            failed_embed += 1
            continue

    # --- [Step 4] 저장 ---
    output_file = Path("artwork_vector.json")
    print(f"\n[4/4] 결과 저장 중...")

    try:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        # ✅ 누락 예시도 파일로 저장
        with open("missing_images_preview.json", "w", encoding="utf-8") as f:
            json.dump(missing_examples, f, ensure_ascii=False, indent=2)

        print(f"\n" + "="*45)
        print(f"✅ 저장 완료!")
        print(f"- 총 입력: {len(items)}")
        print(f"- 성공: {success_count}")
        print(f"- artist_id Unknown 스킵: {skipped_unknown}")
        print(f"- 이미지 누락: {missing_image}")
        print(f"- 임베딩 실패: {failed_embed}")
        print(f"- 출력 파일: {output_file.resolve()}")
        print(f"- 누락 예시 파일: {Path('missing_images_preview.json').resolve()}")
        print("="*45)

    except Exception as e:
        print(f"❌ 저장 중 오류 발생: {e}")

if __name__ == "__main__":
    main()
