import * as THREE from "three";

type Slot = {
  pos: [number, number, number];
  target: [number, number, number];
};

export function installDebugCapture(
  camera: THREE.PerspectiveCamera,
  targetRef: { current: THREE.Vector3 }
) {
  const slots: Record<number, Slot> = {};

  const round3 = (n: number) => Math.round(n * 1000) / 1000;
  const v3 = (v: THREE.Vector3): [number, number, number] => [round3(v.x), round3(v.y), round3(v.z)];

  const dump = () => {
    const data = { pos: v3(camera.position), target: v3(targetRef.current) };
    console.log("[CAM]", JSON.stringify(data));
    return data;
  };

  const printAll = () => {
    const keys = Object.keys(slots).map(Number).sort((a, b) => a - b);
    const ordered: Record<string, Slot> = {};
    for (const k of keys) ordered[`WP_${k - 1}`] = slots[k];
    console.log("[WAYPOINTS]\n" + JSON.stringify(ordered, null, 2));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === "d") {
      dump();
      return;
    }

    if (e.key >= "1" && e.key <= "8") {
      const idx = Number(e.key);
      slots[idx] = dump();
      console.log(`✅ saved slot ${idx} (=> WP_${idx - 1})`);
      return;
    }

    if (e.key.toLowerCase() === "p") {
      printAll();
      return;
    }
  };

  window.addEventListener("keydown", onKeyDown);

  console.log(
    [
      "[DebugCapture] ON",
      "- Press D: dump current camera pos/target",
      "- Press 1~8: save to WP_0..WP_7",
      "- Press P: print all saved waypoints JSON",
    ].join("\n")
  );

  return () => window.removeEventListener("keydown", onKeyDown);
}
