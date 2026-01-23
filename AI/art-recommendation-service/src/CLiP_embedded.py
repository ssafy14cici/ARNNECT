import torch
import open_clip
from PIL import Image
import numpy as np

class ArtworkEmbedder:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[Embedder] Loading CLIP on {self.device}...")
        # 모델 로딩
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained="datacomp_xl_s13b_b90k", device=self.device
        )
        self.model.eval()

    def encode_image(self, image: Image.Image):
        """이미지 객체를 받아 벡터 리스트 반환"""
        image_input = self.preprocess(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            features = self.model.encode_image(image_input)
            features /= features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy().flatten().tolist()