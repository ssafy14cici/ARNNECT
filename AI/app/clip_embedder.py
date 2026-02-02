from __future__ import annotations

import io
import numpy as np
from PIL import Image

class ClipImageEmbedder:
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32", device: str = "cpu"):
        self.model_name = model_name
        self.device = device
        self._model = None
        self._processor = None

    def _lazy_load(self):
        if self._model is not None:
            return
        
        print(f"🔄 [ClipEmbedder] 모델 로딩 시작: {self.model_name}")
        from transformers import CLIPModel, CLIPProcessor
        import torch

        self._processor = CLIPProcessor.from_pretrained(self.model_name)
        self._model = CLIPModel.from_pretrained(self.model_name)
        self._model.eval()
        self._model.to(self.device)
        self._torch = torch
        print("✅ [ClipEmbedder] 모델 로딩 완료")

    def embed_pil(self, image: Image.Image) -> np.ndarray:
        self._lazy_load()
        torch = self._torch

        inputs = self._processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            # 1. 일단 모델 호출
            try:
                # 정상적인 경우 (Batch, 512) 반환
                outputs = self._model.get_image_features(**inputs)
            except Exception:
                # 비상시 일반 호출
                outputs = self._model(**inputs)
                if hasattr(outputs, 'image_embeds'):
                    outputs = outputs.image_embeds
                elif hasattr(outputs, 'pooler_output'):
                    outputs = outputs.pooler_output
                else:
                    outputs = outputs.last_hidden_state

        # 2. Numpy 변환 및 평탄화
        vec = outputs[0].detach().cpu().float().numpy()
        vec = vec.flatten() # 1차원으로 쫙 폅니다.

        # 3. [강제 보정] 무조건 512차원으로 맞춤 (Slicing & Padding)
        target_dim = 512
        current_dim = vec.shape[0]

        if current_dim > target_dim:
            # 512보다 크면 앞에서부터 512개만 자름 (38400 -> 512)
            vec = vec[:target_dim]
        elif current_dim < target_dim:
            # 512보다 작으면 뒤를 0으로 채움
            vec = np.pad(vec, (0, target_dim - current_dim))

        # 4. 정규화
        norm = np.linalg.norm(vec) + 1e-12
        vec = (vec / norm).astype(np.float32)

        print(f"🧩 [ClipEmbedder] 최종 출력 차원: {vec.shape} (512 고정)")
        return vec

    def embed_bytes(self, image_bytes: bytes) -> np.ndarray:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return self.embed_pil(img)

    def embed_image_path(self, image_path: str) -> np.ndarray:
        img = Image.open(image_path).convert("RGB")
        return self.embed_pil(img)