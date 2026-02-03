// import * as THREE from "three";
// import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

// export async function loadHdriWithPmrem(
//   renderer: THREE.WebGLRenderer,
//   url: string
// ) {
//   const rgbe = new RGBELoader();
//   const hdr = await rgbe.loadAsync(url);
//   hdr.mapping = THREE.EquirectangularReflectionMapping;

//   const pmrem = new THREE.PMREMGenerator(renderer);
//   pmrem.compileEquirectangularShader();

//   const env = pmrem.fromEquirectangular(hdr).texture;

//   // PMREMGenerator는 여기서 바로 dispose 가능
//   pmrem.dispose();

//   // ✅ intro에서만 쓸 거라면 dispose 함수까지 같이 넘기는 게 안전
//   const dispose = () => {
//     hdr.dispose(); // background로 쓰던 HDR 텍스처
//     env.dispose(); // PMREM 결과 텍스처(환경맵)
//   };

//   return { background: hdr, environment: env, dispose };
// }

import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

export async function loadHdriWithPmrem(renderer: THREE.WebGLRenderer, url: string) {
  const loader = new HDRLoader();
  const hdr = await loader.loadAsync(url);
  hdr.mapping = THREE.EquirectangularReflectionMapping;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const env = pmrem.fromEquirectangular(hdr).texture;
  pmrem.dispose();

  return { background: hdr, environment: env };
}
