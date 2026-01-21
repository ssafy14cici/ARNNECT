import json
import os
import shutil
import random
from pathlib import Path
from tqdm import tqdm

# ==========================================
# 1. 설정 (환경에 맞게 수정 필요)
# ==========================================
# 원본 메타데이터 파일 (전체 데이터가 들어있는 파일)
SOURCE_METADATA_FILE = "artwork.json"

# 이미지가 저장되어 있는 원본 폴더들 (리스트로 여러 개 지정 가능)
# 예: ["images", "train", "artwork_image"]
SOURCE_IMAGE_DIRS = ["test_image", "."]

# 결과물이 저장될 폴더 및 파일명
TARGET_DIR = "new_test_image"
TARGET_METADATA_FILE = "test_dataset.json"
TARGET_COUNT = 1500  # 추출할 개수

def create_verification_dataset():
    # 1. 경로 설정 및 초기화
    source_meta_path = Path(SOURCE_METADATA_FILE)
    target_dir_path = Path(TARGET_DIR)
    
    if not source_meta_path.exists():
        print(f"❌ 원본 메타데이터 파일이 없습니다: {SOURCE_METADATA_FILE}")
        return

    # 결과 폴더 생성 (이미 있으면 경고 후 진행)
    if not target_dir_path.exists():
        target_dir_path.mkdir(parents=True)
        print(f"[System] '{TARGET_DIR}' 폴더를 생성했습니다.")
    else:
        print(f"[System] '{TARGET_DIR}' 폴더가 이미 존재합니다. 내부에 파일을 추가합니다.")

    # 2. 데이터 로드 및 셔플
    print(f" -> 메타데이터 로딩 중...")
    try:
        with open(source_meta_path, "r", encoding="utf-8") as f:
            full_data = json.load(f)
    except Exception as e:
        print(f"❌ JSON 로딩 실패: {e}")
        return

    print(f" -> 전체 데이터: {len(full_data)}개")
    
    if len(full_data) < TARGET_COUNT:
        print(f"⚠️ 경고: 데이터가 부족합니다. (요청: {TARGET_COUNT} / 보유: {len(full_data)})")
        print("   -> 가능한 모든 데이터를 사용합니다.")
    
    # [핵심] 무작위 섞기
    random.shuffle(full_data)

    # 3. 데이터 추출 및 파일 복사
    new_dataset = []
    success_count = 0
    
    print(f" -> 이미지 추출 및 복사 시작 (목표: {TARGET_COUNT}개)...")
    
    # 진행률 표시줄
    pbar = tqdm(total=TARGET_COUNT)
    
    for item in full_data:
        # 목표 개수 채우면 중단
        if success_count >= TARGET_COUNT:
            break

        # 원본 이미지 경로 찾기
        # (image_path, image_url, file_name 등 가능한 키 모두 확인)
        src_filename_str = item.get("image_path") or item.get("image_url") or item.get("file_name")
        
        if not src_filename_str:
            continue
            
        src_path = Path(src_filename_str)
        
        # 파일이 실제 존재하는지 확인 (경로 탐색)
        real_src_path = None
        if src_path.exists():
            real_src_path = src_path
        else:
            # 파일명만 떼어서 서브 폴더 검색
            fname = src_path.name
            for sub_dir in SOURCE_IMAGE_DIRS:
                candidate = Path(sub_dir) / fname
                if candidate.exists():
                    real_src_path = candidate
                    break
        
        if real_src_path is None:
            # 이미지가 없으면 건너뜀 (카운트 X)
            continue

        # 4. 파일 복사 및 이름 변경
        # 확장자 추출 (.jpg, .png 등)
        ext = real_src_path.suffix
        if not ext:
            ext = ".jpg" # 확장자가 없는 경우 기본값
            
        # 새로운 ID 생성 (test_image_00000)
        new_id = f"test_image_{success_count:05d}"
        new_filename = f"{new_id}{ext}"
        target_file_path = target_dir_path / new_filename
        
        try:
            # 이미지 복사 (shutil.copy2는 메타데이터 보존)
            shutil.copy2(real_src_path, target_file_path)
            
            # 5. 새로운 메타데이터 생성
            # artwork_id는 파일명(확장자 제외)과 동일하게 설정
            new_meta_item = {
                "artwork_id": new_id,
                "image_path": new_filename,  # 상대 경로 (폴더 내부 기준)
                "artist_id": item.get("artist_id", "Unknown"),
                "description": item.get("description", "")
            }
            new_dataset.append(new_meta_item)
            
            success_count += 1
            pbar.update(1)
            
        except Exception as e:
            print(f"⚠️ 복사 실패 ({real_src_path}): {e}")
            continue

    pbar.close()

    # 6. 결과 JSON 저장
    try:
        with open(TARGET_METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(new_dataset, f, ensure_ascii=False, indent=4)
            
        print(f"\n{'='*40}")
        print(f"✅ 데이터셋 생성 완료!")
        print(f" - 이미지 저장 폴더: {target_dir_path.absolute()}")
        print(f" - 메타데이터 파일 : {Path(TARGET_METADATA_FILE).absolute()}")
        print(f" - 생성된 파일 수  : {success_count}개")
        print(f"{'='*40}")
        
    except Exception as e:
        print(f"❌ 메타데이터 저장 실패: {e}")

if __name__ == "__main__":
    create_verification_dataset()