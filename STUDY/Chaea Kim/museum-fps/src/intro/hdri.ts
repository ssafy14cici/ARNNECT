import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export async function loadHdriWithPmrem(renderer: THREE.WebGLRenderer, url: string) {
  const rgbe = new RGBELoader();
  const hdr = await rgbe.loadAsync(url);
  hdr.mapping = THREE.EquirectangularReflectionMapping;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const env = pmrem.fromEquirectangular(hdr).texture;
  pmrem.dispose();

  return { background: hdr, environment: env };
}
