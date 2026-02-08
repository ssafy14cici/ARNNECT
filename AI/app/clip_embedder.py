# app/clip_embedder.py
from __future__ import annotations

import io
import numpy as np
from PIL import Image

class ClipImageEmbedder:
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32", device: str = "cpu"):
        self.model_name = model_name
        self.device_str = device  # 문자열 보관
        self.device = None        # torch.device는 lazy_load에서 생성
        self._model = None
        self._processor = None
        self._torch = None

    def _lazy_load(self):
        if self._model is not None:
            return

        print(f"🔄 [ClipEmbedder] 모델 로딩 시작: {self.model_name}")
        from transformers import CLIPModel, CLIPProcessor
        import torch

        self._torch = torch
        self.device = torch.device(self.device_str)

        self._processor = CLIPProcessor.from_pretrained(self.model_name)
        self._model = CLIPModel.from_pretrained(self.model_name)
        self._model.eval()
        self._model.to(self.device)

        # (선택) 성능/메모리 최적화: GPU일 때 half
        # if self.device.type == "cuda":
        #     self._model.half()

        print(f"✅ [ClipEmbedder] 모델 로딩 완료 (device={self.device})")

    def embed_pil(self, image: Image.Image) -> np.ndarray:
        self._lazy_load()
        torch = self._torch

        inputs = self._processor(images=image, return_tensors="pt")
        # ✅ inputs를 CUDA로
        inputs = {k: v.to(self.device, non_blocking=True) for k, v in inputs.items()}

        with torch.no_grad():
            # get_image_features는 보통 (1, 512)
            outputs = self._model.get_image_features(**inputs)

        vec = outputs[0].detach().float().cpu().numpy().reshape(-1)

        # ✅ CLIP은 원래 512가 정상이라 보정 로직 사실상 불필요하지만,
        # 혹시라도 대비해 남기려면 유지 가능
        target_dim = 512
        if vec.shape[0] > target_dim:
            vec = vec[:target_dim]
        elif vec.shape[0] < target_dim:
            vec = np.pad(vec, (0, target_dim - vec.shape[0]))

        norm = np.linalg.norm(vec) + 1e-12
        vec = (vec / norm).astype(np.float32)
        return vec

    # ✅ 서비스 코드 호환용 alias (RecoService에서 self.clip.encode(image) 쓰면 여기로 연결)
    def encode(self, image: Image.Image) -> np.ndarray:
        return self.embed_pil(image)

    def embed_bytes(self, image_bytes: bytes) -> np.ndarray:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return self.embed_pil(img)

    def embed_image_path(self, image_path: str) -> np.ndarray:
        img = Image.open(image_path).convert("RGB")
        return self.embed_pil(img)
