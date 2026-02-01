import * as THREE from "three";

export type WaypointId = `WP_${number}` | "ENTRY";
export type Waypoint = {
  id: WaypointId;
  pos: THREE.Vector3;
  target: THREE.Vector3;
};

export function createManualWaypoints(
  points: Array<{ pos: [number, number, number]; target: [number, number, number] }>
) {
  const waypoints: Record<WaypointId, Waypoint> = {
    ENTRY: {
      id: "ENTRY",
      pos: new THREE.Vector3(...points[0].pos),
      target: new THREE.Vector3(...points[0].target),
    },
  };

  for (let i = 0; i < points.length; i++) {
    const id: WaypointId = `WP_${i}`;
    waypoints[id] = {
      id,
      pos: new THREE.Vector3(...points[i].pos),
      target: new THREE.Vector3(...points[i].target),
    };
  }

  return {
    waypoints,
    count: points.length,
  };
}
