import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Environment, Loader } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import SceneController from './components/SceneController';
import Gallery from './components/Gallery';
import Overlay from './components/Overlay';

export default function App() {
  return (
    <>
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        camera={{ fov: 75, position: [0, 2.5, 10] }} // 초기 카메라 높이도 2.5로
        style={{ background: '#f5f5f5' }} 
      >
        {/* 안개 시작점: 10 -> 40 (가까운 곳은 선명하게) */}
        <fog attach="fog" args={['#f5f5f5', 40, 100]} />
        <Environment preset="city" background={false} blur={1} />
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={2} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />
        <Suspense fallback={null}>
            <SceneController />
            <Gallery />
        </Suspense>
        
        {/* 수정됨: disableNormalPass -> enableNormalPass={false} */}
        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.6} />
          <Noise opacity={0.02} />
          <Vignette eskil={false} offset={0.1} darkness={0.5} />
        </EffectComposer>
      </Canvas>
      <Overlay />
      <Loader />
    </>
  );
}