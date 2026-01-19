import { useEffect, useRef } from "react";
import * as THREE from "three";

/** 최신 three.js 대응 커스텀 커브 */
class RingCurve extends THREE.Curve<THREE.Vector3> {
  length: number;
  radius: number;

  constructor(length: number, radius: number) {
    super();
    this.length = length;
    this.radius = radius;
  }

  getPoint(t: number): THREE.Vector3 {
    const pi2 = Math.PI * 2;
    const { length, radius } = this;

    const x = length * Math.sin(pi2 * t);
    const y = radius * Math.cos(pi2 * 3 * t);

    let tt = (t % 0.25) / 0.25;
    tt = t % 0.25 - (2 * (1 - tt) * tt * -0.0185 + tt * tt * 0.25);

    if (Math.floor(t / 0.25) === 0 || Math.floor(t / 0.25) === 2) tt *= -1;

    const z = radius * Math.sin(pi2 * 2 * (t - tt));
    return new THREE.Vector3(x, y, z);
  }
}

type HerRingLoaderProps = {
  /** 0~100 */
  progress?: number;
  /** canvas size(px) */
  size?: number;
  /** background */
  bg?: string;
  /** stroke color */
  stroke?: string;
  className?: string;
  label?: string;
};

export default function HerRingLoader({
  progress = 0,
  size = 500,
  bg = "#F8F6F2",
  stroke = "#2B2A28",
  className = "",
  label = "Loading",
}: HerRingLoaderProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // progress가 바뀔 때 three를 다시 만들지 않기 위해 ref로 보관
  const progressRef = useRef<number>(progress);
  progressRef.current = progress;

  // RAF id
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    // StrictMode/리렌더 시 캔버스 중복 방지
    wrap.innerHTML = "";

    const canvassize = size;
    const length = 30;
    const radius = 5.6;
    const rotatevalue = 0.035;

    // scene/camera/renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 1, 10000);
    camera.position.z = 150;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvassize, canvassize);
    renderer.setClearColor(new THREE.Color(bg), 1);

    wrap.appendChild(renderer.domElement);

    // group
    const group = new THREE.Group();
    scene.add(group);

    // tube mesh
    const curve = new RingCurve(length, radius);
    const tube = new THREE.TubeGeometry(curve, 200, 1.1, 2, true);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(stroke),
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(tube, tubeMat);
    group.add(mesh);

    // ring cover / ring
    const coverMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(bg),
      opacity: 0,
      transparent: true,
    });
    const ringcover = new THREE.Mesh(new THREE.PlaneGeometry(50, 15, 1), coverMat);
    ringcover.position.x = length + 1;
    ringcover.rotation.y = Math.PI / 2;
    group.add(ringcover);

    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(stroke),
      opacity: 0,
      transparent: true,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.3, 5.55, 32), ringMat);
    ring.position.x = length + 1.1;
    ring.rotation.y = Math.PI / 2;
    group.add(ring);

    // shadow-ish planes
    const shadowPlanes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(bg),
        transparent: true,
        opacity: 0.13,
      });
      const plain = new THREE.Mesh(new THREE.PlaneGeometry(length * 2 + 1, radius * 3, 1), mat);
      plain.position.z = -2.5 + i * 0.5;
      group.add(plain);
      shadowPlanes.push(plain);
    }

    // easing
    const easing = (t: number, b: number, c: number, d: number) => {
      t /= d / 2;
      if (t < 1) return (c / 2) * t * t + b;
      t -= 2;
      return (c / 2) * (t * t * t + 2) + b;
    };

    let animatestep = 0;
    let acceleration = 0;

    const render = () => {
      // progress(0~100) -> step(0~240)
      const pNow = Math.max(0, Math.min(100, progressRef.current));
      const target = Math.round((pNow / 100) * 240);

      // 부드러운 추종
      if (animatestep < target) animatestep += 0.5;
      else if (animatestep > target) animatestep -= 0.5;
      animatestep = Math.max(0, Math.min(240, animatestep));

      acceleration = easing(animatestep, 0, 1, 240);

      if (acceleration > 0.35) {
        let p = (acceleration - 0.35) / 0.65;
        group.rotation.y = (-Math.PI / 2) * p;
        group.position.z = 50 * p;

        // 마지막 구간 페이드/링 등장
        p = Math.max(0, (acceleration - 0.97) / 0.03);
        mesh.material.opacity = 1 - p;
        ringcover.material.opacity = ring.material.opacity = p;
        ring.scale.x = ring.scale.y = 0.9 + 0.1 * p;
      } else {
        group.rotation.y = 0;
        group.position.z = 0;
        mesh.material.opacity = 1;
        ringcover.material.opacity = 0;
        ring.material.opacity = 0;
      }

      mesh.rotation.x += rotatevalue + acceleration * 0.02;

      renderer.render(scene, camera);
      rafRef.current = window.requestAnimationFrame(render);
    };

    rafRef.current = window.requestAnimationFrame(render);

    const onResize = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(rafRef.current);

      shadowPlanes.forEach((p) => {
        p.geometry.dispose();
        p.material.dispose();
      });

      ring.geometry.dispose();
      ring.material.dispose();
      ringcover.geometry.dispose();
      ringcover.material.dispose();

      mesh.geometry.dispose();
      mesh.material.dispose();

      renderer.dispose();

      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [size, bg, stroke]);

  return (
    <div
      className={className}
      aria-label={label}
      style={{
        position: "fixed",
        inset: 0,
        background: bg,
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
      }}
    >
      <div style={{ display: "grid", placeItems: "center", gap: 28 }}>
        {/* 1) 큰 로고 */}
        <img
          src="/arnnect_logo_ver1.png"
          alt="logo"
          style={{
            width: 360,
            maxWidth: "70vw",
            height: "auto",
            marginBottom: 36,
            userSelect: "none",
            pointerEvents: "none",
          }}
        />

        {/* 2) 로딩 영역 */}
        <div style={{ display: "grid", placeItems: "center", gap: 8 }}>
          {/* 링 캔버스 */}
          <div ref={wrapRef} style={{ width: 180, height: 180 }} />

          {/* 퍼센트 */}
          <div style={{ fontFamily: "serif", color: stroke, letterSpacing: "0.02em" }}>
            {Math.round(progress)}%
          </div>
        </div>
      </div>
    </div>
  );
}
