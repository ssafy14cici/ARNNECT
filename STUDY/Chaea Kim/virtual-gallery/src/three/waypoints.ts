import * as THREE from "three";

export type WaypointId = `WP_${number}` | "ENTRY";
export type Waypoint = { id: WaypointId; pos: THREE.Vector3; target: THREE.Vector3 };

export type PathConfig = {
  floorName: string;
  start: "RIGHT" | "ENTRY";
  direction: "CCW" | "CW";
  count: number;
  radius: number;
  eyeHeight: number;
  angleOffsetDeg: number;
};

export function createCircularPathWaypoints(root: THREE.Object3D, cfg: PathConfig) {
  const floor = root.getObjectByName(cfg.floorName);
  if (!floor) throw new Error(`Floor not found: ${cfg.floorName}`);

  const floorBox = new THREE.Box3().setFromObject(floor);
  const center = floorBox.getCenter(new THREE.Vector3());

  const target = center.clone().add(new THREE.Vector3(0, cfg.eyeHeight, 0));
  const dirSign = cfg.direction === "CCW" ? 1 : -1;
  const offset = THREE.MathUtils.degToRad(cfg.angleOffsetDeg);

  const waypoints: Record<WaypointId, Waypoint> = {
    ENTRY: {
      id: "ENTRY",
      pos: target.clone().add(new THREE.Vector3(0, 0, cfg.radius * 1.2)),
      target: target.clone(),
    },
  };

  for (let i = 0; i < cfg.count; i++) {
    const t = i / cfg.count;
    const a = offset + dirSign * t * Math.PI * 2;

    const pos = target
      .clone()
      .add(new THREE.Vector3(Math.cos(a) * cfg.radius, 0, Math.sin(a) * cfg.radius));

    const id: WaypointId = `WP_${i}`;
    waypoints[id] = { id, pos, target: target.clone() };
  }

  const hotspotGroup = makeHotspots(waypoints, cfg.count);
  return { waypoints, hotspotGroup, center };
}

/**
 * ✅ 네가 콘솔로 찍은 pos/target을 그대로 웨이포인트로 쓰는 방식
 */
export function createManualWaypoints(points: Array<{ pos: [number, number, number]; target: [number, number, number] }>) {
  const waypoints: Record<WaypointId, Waypoint> = {
    ENTRY: {
      id: "ENTRY",
      pos: new THREE.Vector3(points[0].pos[0], points[0].pos[1], points[0].pos[2]),
      target: new THREE.Vector3(points[0].target[0], points[0].target[1], points[0].target[2]),
    },
  };

  for (let i = 0; i < points.length; i++) {
    const id: WaypointId = `WP_${i}`;
    waypoints[id] = {
      id,
      pos: new THREE.Vector3(points[i].pos[0], points[i].pos[1], points[i].pos[2]),
      target: new THREE.Vector3(points[i].target[0], points[i].target[1], points[i].target[2]),
    };
  }

  const hotspotGroup = makeHotspots(waypoints, points.length);
  return { waypoints, hotspotGroup };
}

function makeHotspots(waypoints: Record<WaypointId, Waypoint>, count: number) {
  const hotspotGroup = new THREE.Group();
  hotspotGroup.name = "HOTSPOTS";

  const geo = new THREE.SphereGeometry(0.12, 18, 18);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

  for (let i = 0; i < count; i++) {
    const id: WaypointId = `WP_${i}`;
    const wp = waypoints[id];

    const marker = new THREE.Mesh(geo, mat);
    marker.name = `HOTSPOT_${id}`;
    marker.position.copy(wp.pos).add(new THREE.Vector3(0, -0.2, 0));
    marker.userData.type = "waypoint";
    marker.userData.waypointId = id;
    hotspotGroup.add(marker);
  }

  return hotspotGroup;
}
