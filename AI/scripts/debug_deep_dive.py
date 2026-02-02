import sys
import torch
import numpy as np
from pathlib import Path

# 1. 프로젝트 루트 경로를 확실하게 잡습니다.
current_dir = Path(__file__).resolve().parent   # .../scripts
project_root = current_dir.parent               # .../reco_service_runpod
sys.path.append(str(project_root))

from app.config import settings
from app.item_vector_table import ItemVectorTable
from app.models.loader import load_models

def debug_system():
    print("="*40)
    print("🕵️‍♂️ [심층 진단] 추천 시스템 상태 점검")
    print(f"📂 프로젝트 루트: {project_root}")
    print("="*40)

    # -------------------------------------------
    # [수정] 경로 강제 지정 (절대 경로 사용)
    # -------------------------------------------
    # config.py의 설정을 믿지 않고, 실제 파일 위치를 찍어버립니다.
    # 파일명이 'BEST_SASRec_model.pth'가 맞는지 꼭 확인하세요!
    sasrec_path = project_root / "artifacts" / "checkpoints" / "BEST_SASRec_model.pth"
    twotower_path = project_root / "artifacts" / "checkpoints" / "BEST_BestRecommend_model.pth"
    
    # -------------------------------------------
    # 1. 아이템 벡터 테이블 점검
    # -------------------------------------------
    print("\n1️⃣ 아이템 벡터 테이블 점검")
    table_path = project_root / "artifacts" / "item_vectors.bin"
    
    if not table_path.exists():
        print(f"   ❌ 파일 없음: {table_path}")
        print("   👉 'python scripts/migrate_vectors.py' 를 먼저 실행하세요.")
        return

    try:
        item_table = ItemVectorTable(table_path, settings.num_items, settings.d_model)
        vec_1 = item_table.get(1)
        norm1 = np.linalg.norm(vec_1)
        
        print(f"   - 1번 아이템 벡터 Norm: {norm1:.4f}")
        
        if norm1 == 0:
            print("   🚨 [치명적] 벡터가 0입니다! (데이터 비어있음)")
            print("   👉 해결책: scripts/migrate_vectors.py 다시 실행")
            return
        else:
            print("   ✅ 벡터 데이터 정상.")

    except Exception as e:
        print(f"   ❌ 테이블 로드 에러: {e}")
        return

    # -------------------------------------------
    # 2. 모델 반응성 점검
    # -------------------------------------------
    print("\n2️⃣ 모델 반응성 점검")
    print(f"   -> 로딩 시도 경로: {sasrec_path}")
    
    if not sasrec_path.exists():
        print("   ❌ [오류] .pth 파일이 없습니다!")
        print("      폴더 안에 'BEST_SASRec_model.pth' 파일이 있는지 확인하세요.")
        return

    # 모델 로드 (강제 경로 주입)
    loaded = load_models(
        sasrec_ckpt=sasrec_path,      # <--- 절대 경로 주입
        twotower_ckpt=twotower_path,  # <--- 절대 경로 주입
        device=settings.device,
        num_items=settings.num_items,
        max_len=settings.max_len,
        d_model=settings.d_model,
        n_heads=settings.n_heads,
        n_layers=settings.n_layers,
        ff_dim=settings.ff_dim,
        dropout=settings.dropout,
        num_actions=settings.num_actions
    )
    
    model = loaded.sasrec
    if model is None:
        print("   ❌ 모델 로드 실패 (로그 확인 필요)")
        return

    # 테스트 입력 (유저 A vs 유저 B)
    input_a = torch.tensor([[1, 2, 3]], dtype=torch.long, device=settings.device)
    input_b = torch.tensor([[4, 5, 6]], dtype=torch.long, device=settings.device)
    
    vec_table_tensor = torch.from_numpy(item_table.as_numpy()).to(settings.device)

    with torch.no_grad():
        _, out_a = model(input_a, vec_table_tensor)
        _, out_b = model(input_b, vec_table_tensor)
        
    res_a = out_a.cpu().numpy().flatten()[:5]
    res_b = out_b.cpu().numpy().flatten()[:5]
    
    print(f"   - 결과 A: {res_a}")
    print(f"   - 결과 B: {res_b}")
    
    diff = np.linalg.norm(res_a - res_b)
    print(f"   - 차이값: {diff:.6f}")
    
    if diff < 1e-5:
        print("   🚨 [문제] 모델이 죽었습니다 (결과가 똑같음).")
    else:
        print("   ✅ 모델 정상 작동! (입력에 따라 결과가 다름)")

if __name__ == "__main__":
    debug_system()