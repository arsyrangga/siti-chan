'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import React, { useRef, useState, useEffect, Suspense, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils, VRMExpressionPresetName } from '@pixiv/three-vrm';

/* ─────────────────────────────────────────────
   VRM Anime Avatar Loader
   Loads a VRM model (VRoid Studio anime style)
   with idle animation, eye blinking, and lip-sync
   ───────────────────────────────────────────── */

function VRMAvatar({ jawOpen = 0, onLoaded }) {
  const vrmRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const { scene } = useThree();

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      '/models/siti-chan.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm;
        if (!vrm) return;

        // Optimize VRM scene
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        // Rotate VRM to face camera (VRM models face +Z by default)
        VRMUtils.rotateVRM0(vrm);

        // Set up materials for anime toon look
        vrm.scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.frustumCulled = false;
            if (obj.material) {
              obj.material.side = THREE.DoubleSide;
            }
          }
        });

        // Scale up the model for better visibility
        vrm.scene.scale.set(2.5, 2.5, 2.5);
        vrm.scene.position.set(0, -2.2, 0);

        scene.add(vrm.scene);
        vrmRef.current = vrm;

        if (onLoaded) onLoaded();
        console.log('VRM model loaded successfully');
      },
      (progress) => {
        const pct = (progress.loaded / progress.total) * 100;
        console.log(`Loading VRM: ${pct.toFixed(1)}%`);
      },
      (error) => {
        console.error('Error loading VRM:', error);
      }
    );

    return () => {
      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
        vrmRef.current = null;
      }
    };
  }, [scene, onLoaded]);

  useFrame((state, delta) => {
    if (!vrmRef.current) return;
    const vrm = vrmRef.current;
    const t = state.clock.getElapsedTime();

    // Update VRM (springs, etc.)
    vrm.update(delta);

    // ─── Idle Breathing ───
    const hips = vrm.humanoid?.getNormalizedBoneNode('hips');
    if (hips) {
      hips.position.y = hips.position.y + Math.sin(t * 1.5) * 0.0003;
    }

    // ─── Head subtle movement ───
    const head = vrm.humanoid?.getNormalizedBoneNode('head');
    if (head) {
      head.rotation.x = Math.sin(t * 0.8) * 0.03;
      head.rotation.z = Math.sin(t * 0.5) * 0.02;
    }

    // ─── Eye Blinking ───
    const blinkCycle = t % 4.5;
    const isBlinking = blinkCycle > 4.0 && blinkCycle < 4.2;
    if (vrm.expressionManager) {
      vrm.expressionManager.setValue(VRMExpressionPresetName.Blink, isBlinking ? 1.0 : 0.0);
    }

    // ─── Lip Sync (jawOpen prop) ───
    if (vrm.expressionManager && jawOpen > 0.01) {
      // Use 'aa' expression for mouth open (standard VRM expression)
      vrm.expressionManager.setValue(VRMExpressionPresetName.Aa, Math.min(1.0, jawOpen * 1.5));
      // Add slight 'oh' for rounder mouth at medium opening
      vrm.expressionManager.setValue(VRMExpressionPresetName.Oh, Math.min(0.5, jawOpen * 0.6));
    } else if (vrm.expressionManager) {
      vrm.expressionManager.setValue(VRMExpressionPresetName.Aa, 0);
      vrm.expressionManager.setValue(VRMExpressionPresetName.Oh, 0);
    }

    // ─── Idle expression: slight smile ───
    if (vrm.expressionManager && jawOpen < 0.05) {
      vrm.expressionManager.setValue(VRMExpressionPresetName.Happy, 0.2 + Math.sin(t * 0.7) * 0.05);
    } else if (vrm.expressionManager) {
      vrm.expressionManager.setValue(VRMExpressionPresetName.Happy, 0);
    }

    // ─── Arm pose (slight natural hang) ───
    const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
    if (leftUpperArm) {
      leftUpperArm.rotation.z = 1.1 + Math.sin(t * 0.6) * 0.02;
    }
    if (rightUpperArm) {
      rightUpperArm.rotation.z = -1.1 - Math.sin(t * 0.6) * 0.02;
    }
  });

  return null; // VRM is added directly to the scene
}

// Loading spinner shown while VRM loads
function LoadingIndicator() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 2;
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime()) * 0.3;
    }
  });

  return (
    <group position={[0, 1, 0]}>
      <mesh ref={meshRef}>
        <torusGeometry args={[0.2, 0.05, 16, 32]} />
        <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.5} />
      </mesh>
      {/* Small static spheres */}
      <mesh position={[0, -0.4, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

export default function AvatarScene({ jawOpen }) {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoaded = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="avatar-canvas-wrapper">
      <Canvas
        camera={{ position: [0, 2.0, 5], fov: 35 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
      >
        {/* Soft anime-style lighting */}
        <ambientLight intensity={1.8} color="#fff5f9" />
        <directionalLight position={[3, 5, 4]} intensity={1.6} color="#ffffff" castShadow />
        <directionalLight position={[-3, 3, 2]} intensity={0.7} color="#e8d5ff" />
        <pointLight position={[0, 2, 3]} intensity={0.5} color="#ffd6e8" />
        {/* Rim light for anime glow effect */}
        <pointLight position={[0, 1.5, -2]} intensity={0.4} color="#b388ff" />

        <Suspense fallback={<LoadingIndicator />}>
          <VRMAvatar jawOpen={jawOpen} onLoaded={handleLoaded} />
        </Suspense>

        {!isLoaded && <LoadingIndicator />}

        <OrbitControls
          enableZoom={true}
          minDistance={0.5}
          maxDistance={5}
          target={[0, 0.8, 0]}
          enablePan={false}
          maxPolarAngle={Math.PI * 0.75}
          minPolarAngle={Math.PI * 0.25}
        />
      </Canvas>
    </div>
  );
}
