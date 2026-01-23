import * as THREE from "three";
import { updateFrameForSlot } from "./frames";

type ArtSlot = { group: THREE.Group; plane: THREE.Mesh };

export function installArtworkUploader(args: {
  container?: HTMLElement;
  artSlots: ArtSlot[];
  // frames.ts에서 fallback으로 쓰는 값(내부 기본값)
  fallbackArtworkSize?: { W: number; H: number };
}) {
  const { artSlots } = args;
  const container = args.container ?? document.body;
  const fallbackArtworkSize = args.fallbackArtworkSize ?? { W: 3.2, H: 2.2 };

  if (document.getElementById("art-upload-btn")) return;

  const btn = document.createElement("button");
  btn.id = "art-upload-btn";
  btn.textContent = "+ Add Artwork";
  btn.style.position = "fixed";
  btn.style.right = "18px";
  btn.style.bottom = "18px";
  btn.style.zIndex = "9999";
  btn.style.padding = "10px 14px";
  btn.style.borderRadius = "12px";
  btn.style.border = "1px solid rgba(0,0,0,0.15)";
  btn.style.background = "#ffffff";
  btn.style.cursor = "pointer";
  btn.style.font = "600 14px system-ui, -apple-system, Segoe UI, Roboto";
  container.appendChild(btn);

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.style.display = "none";
  container.appendChild(input);

  btn.addEventListener("click", () => input.click());

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    // 다음 빈 슬롯(그림 미표시) 찾기
    const slot = artSlots.find((s) => !s.plane.visible);
    if (!slot) {
      alert("No empty frame slot left.");
      input.value = "";
      return;
    }

    const url = URL.createObjectURL(file);

    // TextureLoader로 텍스처 로드
    const tex = await new Promise<THREE.Texture>((resolve, reject) => {
      new THREE.TextureLoader().load(url, resolve, undefined, reject);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    // ✅ 이미지 비율(가로/세로)을 읽어 plane geometry 갱신
    // - THREE.Texture 이미지 객체는 tex.image에 들어있음(HTMLImageElement 등)
    const img: any = (tex as any).image;
    const iw = Math.max(1, img?.width ?? 1);
    const ih = Math.max(1, img?.height ?? 1);
    const aspect = iw / ih;

    // 기준 높이: 기존 plane 높이(없으면 fallback)
    const currentGeom = slot.plane.geometry as THREE.PlaneGeometry;
    const params: any = (currentGeom as any).parameters ?? {};
    const baseH = params.height ?? slot.plane.userData?.artSize?.h ?? fallbackArtworkSize.H;

    const newW = baseH * aspect;
    const newH = baseH;

    // geometry 교체
    slot.plane.geometry.dispose();
    slot.plane.geometry = new THREE.PlaneGeometry(newW, newH);

    // artSize 갱신(프레임 리사이즈의 기준)
    slot.plane.userData.artSize = { w: newW, h: newH };

    // material 적용
    const mat = slot.plane.material as THREE.MeshStandardMaterial;
    mat.map = tex;
    mat.needsUpdate = true;

    slot.plane.visible = true;

    // ✅ 프레임도 새 artSize에 맞게 갱신
    updateFrameForSlot(slot, fallbackArtworkSize);

    URL.revokeObjectURL(url);
    input.value = "";
  });

  return () => {
    btn.remove();
    input.remove();
  };
}
