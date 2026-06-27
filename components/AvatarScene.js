'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

// Cute robot or anime mannequin mesh fallback
function DummyAvatar({ jawOpen }) {
  const headRef = useRef();
  const jawRef = useRef();

  useFrame((state) => {
    // Idle animation (gentle float/breath)
    const t = state.clock.getElapsedTime();
    headRef.current.position.y = Math.sin(t * 1.5) * 0.05 + 1.5;
    // Animate jaw open based on jawOpen prop
    if (jawRef.current) {
      jawRef.current.scale.y = 1 + jawOpen * 1.5;
    }
  });

  return (
    <group ref={headRef} position={[0, 1.5, 0]}>
      {/* Head */}
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#ffc0cb" roughness={0.3} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.1, 0.1, 0.25]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.1, 0.1, 0.25]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      {/* Mouth/Jaw */}
      <mesh ref={jawRef} position={[0, -0.1, 0.25]}>
        <boxGeometry args={[0.1, 0.04, 0.05]} />
        <meshStandardMaterial color="#ff007f" />
      </mesh>
      {/* Body */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.2, 0.4, 0.8, 32]} />
        <meshStandardMaterial color="#4b0082" />
      </mesh>
    </group>
  );
}

// Loaded Avatar (supports standard blendshapes from Ready Player Me or standard GLBs)
function RealAvatar({ url, jawOpen }) {
  const { scene } = useGLTF(url);
  const avatarRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Idle breathing and head bobs
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetInfluences) {
        // Find standard morph targets
        const jawOpenIdx = child.morphTargetDictionary['jawOpen'] || child.morphTargetDictionary['mouthOpen'] || child.morphTargetDictionary['vowel_a'];
        if (jawOpenIdx !== undefined) {
          child.morphTargetInfluences[jawOpenIdx] = jawOpen;
        }
        
        // Random eye blinking
        const blinkIdx = child.morphTargetDictionary['eyeBlinkLeft'] || child.morphTargetDictionary['eyesClosed'];
        if (blinkIdx !== undefined) {
          const blinkValue = Math.sin(t * 3) > 0.98 ? 1 : 0;
          child.morphTargetInfluences[blinkIdx] = blinkValue;
          const blinkRightIdx = child.morphTargetDictionary['eyeBlinkRight'];
          if (blinkRightIdx !== undefined) child.morphTargetInfluences[blinkRightIdx] = blinkValue;
        }
      }
    });
  });

  return <primitive object={scene} ref={avatarRef} scale={1.8} position={[0, -1, 0]} />;
}

export default function AvatarScene({ avatarUrl, jawOpen }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="w-full h-full min-h-[400px] relative">
      <Canvas camera={{ position: [0, 1.5, 2.5], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[2, 4, 3]} intensity={1.5} />
        <pointLight position={[-2, 1, 1]} intensity={0.5} />
        
        {avatarUrl && !hasError ? (
          <group onError={() => setHasError(true)}>
            <RealAvatar url={avatarUrl} jawOpen={jawOpen} />
          </group>
        ) : (
          <DummyAvatar jawOpen={jawOpen} />
        )}
        
        <OrbitControls enableZoom={true} minDistance={1} maxDistance={5} target={[0, 1.4, 0]} />
      </Canvas>
    </div>
  );
}
