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

  // ─── Smooth animation state refs ───
  const speakingWeightRef = useRef(0);
  const nextBlinkRef = useRef(2 + Math.random() * 3);
  const blinkProgressRef = useRef(-1);
  // Smoothed bone rotation targets (per-bone damping)
  const smoothBonesRef = useRef({
    headX: 0, headY: 0, headZ: 0,
    neckX: 0, neckY: 0, neckZ: 0,
    spineX: 0, spineZ: 0,
    chestX: 0, chestZ: 0,
    luaX: 0, luaY: 0, luaZ: 0,
    ruaX: 0, ruaY: 0, ruaZ: 0,
    llaX: 0, llaY: 0,
    rlaX: 0, rlaY: 0,
    lhX: 0, lhZ: 0,
    rhX: 0, rhZ: 0,
    // Smoothed mouth visemes
    mouthAa: 0, mouthOh: 0, mouthIh: 0, mouthEe: 0, mouthOu: 0,
  });

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      '/models/siti-chan.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm;
        if (!vrm) return;

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        VRMUtils.rotateVRM0(vrm);

        vrm.scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.frustumCulled = false;
            if (obj.material) {
              obj.material.side = THREE.DoubleSide;
            }
          }
        });

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
    const sb = smoothBonesRef.current;

    // Clamp delta to prevent huge jumps on tab-switch
    const dt = Math.min(delta, 0.05);

    vrm.update(dt);

    // ─── Helper: layered organic noise (non-repeating) ───
    // Uses irrational frequency ratios so the pattern never exactly repeats
    const noise = (freq, phase = 0) =>
      Math.sin(t * freq + phase) * 0.5 +
      Math.sin(t * freq * 1.618 + phase + 1.3) * 0.3 +
      Math.sin(t * freq * 2.317 + phase + 2.7) * 0.2;

    // ─── Speaking weight with smooth ease ───
    const targetWeight = jawOpen > 0.02 ? 1.0 : 0.0;
    speakingWeightRef.current = THREE.MathUtils.lerp(
      speakingWeightRef.current, targetWeight, dt * 4
    );
    const sw = speakingWeightRef.current;

    // Gesture phrasing: creates natural bursts of gesturing
    const gesturePhrase = 0.65 + noise(0.4, 5.0) * 0.35;
    const gw = sw * gesturePhrase;

    // ─── Posture: Spine & Chest ───
    const spine = vrm.humanoid?.getNormalizedBoneNode('spine');
    const chest = vrm.humanoid?.getNormalizedBoneNode('chest');

    if (spine) {
      const idleX = noise(0.3, 0.0) * 0.012;
      const speakX = noise(0.7, 1.0) * 0.025 + noise(0.25, 3.0) * 0.01;
      const idleZ = noise(0.2, 4.0) * 0.008;
      const speakZ = noise(0.5, 2.0) * 0.015;
      sb.spineX = THREE.MathUtils.lerp(sb.spineX, THREE.MathUtils.lerp(idleX, speakX, sw), dt * 4);
      sb.spineZ = THREE.MathUtils.lerp(sb.spineZ, THREE.MathUtils.lerp(idleZ, speakZ, sw), dt * 4);
      spine.rotation.x = sb.spineX;
      spine.rotation.z = sb.spineZ;
    }
    if (chest) {
      const idleX = noise(0.35, 1.5) * 0.008;
      const speakX = noise(0.6, 3.5) * 0.018;
      const idleZ = noise(0.25, 2.0) * 0.005;
      const speakZ = noise(0.55, 4.5) * 0.012;
      sb.chestX = THREE.MathUtils.lerp(sb.chestX, THREE.MathUtils.lerp(idleX, speakX, sw), dt * 5);
      sb.chestZ = THREE.MathUtils.lerp(sb.chestZ, THREE.MathUtils.lerp(idleZ, speakZ, sw), dt * 5);
      chest.rotation.x = sb.chestX;
      chest.rotation.z = sb.chestZ;
    }

    // ─── Head & Neck: Mouse tracking + organic movement ───
    const head = vrm.humanoid?.getNormalizedBoneNode('head');
    const neck = vrm.humanoid?.getNormalizedBoneNode('neck');
    if (head) {
      const mouseX = state.pointer.x;
      const mouseY = state.pointer.y;
      const lookX = THREE.MathUtils.clamp(-mouseY * 0.12, -0.12, 0.12);
      const lookY = THREE.MathUtils.clamp(mouseX * 0.2, -0.25, 0.25);

      const idleX = noise(0.25, 0.0) * 0.02;
      const idleY = noise(0.18, 1.0) * 0.015;
      const idleZ = noise(0.15, 2.0) * 0.012;

      const speakX = noise(1.2, 0.5) * 0.03 + noise(0.4, 3.0) * 0.015;
      const speakY = noise(0.6, 1.5) * 0.025;
      const speakZ = noise(0.45, 4.0) * 0.02;

      const tgtX = THREE.MathUtils.lerp(idleX, speakX, sw) + lookX;
      const tgtY = THREE.MathUtils.lerp(idleY, speakY, sw) + lookY;
      const tgtZ = THREE.MathUtils.lerp(idleZ, speakZ, sw);

      sb.headX = THREE.MathUtils.lerp(sb.headX, tgtX, dt * 4);
      sb.headY = THREE.MathUtils.lerp(sb.headY, tgtY, dt * 4);
      sb.headZ = THREE.MathUtils.lerp(sb.headZ, tgtZ, dt * 4);
      head.rotation.x = sb.headX;
      head.rotation.y = sb.headY;
      head.rotation.z = sb.headZ;

      if (neck) {
        sb.neckX = THREE.MathUtils.lerp(sb.neckX, sb.headX * 0.35, dt * 3);
        sb.neckY = THREE.MathUtils.lerp(sb.neckY, sb.headY * 0.35, dt * 3);
        sb.neckZ = THREE.MathUtils.lerp(sb.neckZ, sb.headZ * 0.35, dt * 3);
        neck.rotation.x = sb.neckX;
        neck.rotation.y = sb.neckY;
        neck.rotation.z = sb.neckZ;
      }
    }

    // ─── Eye Blinking: randomized intervals with smooth curve ───
    if (vrm.expressionManager) {
      let blinkVal = 0;
      if (blinkProgressRef.current >= 0) {
        blinkProgressRef.current += dt;
        const bp = blinkProgressRef.current;
        const blinkDuration = 0.15;
        if (bp < blinkDuration) {
          blinkVal = Math.sin((bp / blinkDuration) * Math.PI);
        } else {
          blinkProgressRef.current = -1;
          const isDouble = Math.random() < 0.2;
          nextBlinkRef.current = t + (isDouble ? 0.25 : 2 + Math.random() * 4);
        }
      } else if (t >= nextBlinkRef.current) {
        blinkProgressRef.current = 0;
      }
      vrm.expressionManager.setValue(VRMExpressionPresetName.Blink, blinkVal);
    }

    // ─── Lip Sync: multi-viseme blending ───
    if (vrm.expressionManager) {
      // Use time-varying modulation to cycle between mouth shapes
      // This creates the illusion of different phonemes
      const visemeCycle = noise(2.5, 10.0); // fast modulation: -1 to 1
      const visemeSlow = noise(0.8, 12.0);  // slower shape variation

      let targetAa = 0, targetOh = 0, targetIh = 0, targetEe = 0, targetOu = 0;

      if (jawOpen > 0.01) {
        const open = jawOpen;

        // Cycle between viseme shapes based on noise
        // Aa = wide open (like "ah")
        targetAa = open * Math.max(0, 0.5 + visemeCycle * 0.5) * 0.9;
        // Oh = rounded (like "oh")
        targetOh = open * Math.max(0, 0.5 - visemeCycle * 0.4) * 0.6;
        // Ih = narrow (like "ee" / "ih")
        targetIh = open * Math.max(0, visemeSlow * 0.6) * 0.5;
        // Ee = smile-stretch (like "ee")
        targetEe = open * Math.max(0, -visemeSlow * 0.5) * 0.35;
        // Ou = pursed (like "oo")
        targetOu = open * Math.max(0, visemeCycle * visemeSlow) * 0.4;
      }

      // Smooth each viseme independently
      const mouthSpeed = 10;
      sb.mouthAa = THREE.MathUtils.lerp(sb.mouthAa, targetAa, dt * mouthSpeed);
      sb.mouthOh = THREE.MathUtils.lerp(sb.mouthOh, targetOh, dt * mouthSpeed);
      sb.mouthIh = THREE.MathUtils.lerp(sb.mouthIh, targetIh, dt * mouthSpeed);
      sb.mouthEe = THREE.MathUtils.lerp(sb.mouthEe, targetEe, dt * mouthSpeed);
      sb.mouthOu = THREE.MathUtils.lerp(sb.mouthOu, targetOu, dt * mouthSpeed);

      vrm.expressionManager.setValue(VRMExpressionPresetName.Aa, sb.mouthAa);
      vrm.expressionManager.setValue(VRMExpressionPresetName.Oh, sb.mouthOh);
      vrm.expressionManager.setValue(VRMExpressionPresetName.Ih, sb.mouthIh);
      vrm.expressionManager.setValue(VRMExpressionPresetName.Ee, sb.mouthEe);
      vrm.expressionManager.setValue(VRMExpressionPresetName.Ou, sb.mouthOu);
    }

    // ─── Warm smile (slightly brighter when speaking) ───
    if (vrm.expressionManager) {
      const smileIdle = 0.2 + noise(0.15, 6.0) * 0.06;
      const smileSpeak = 0.35 + noise(0.3, 7.0) * 0.08;
      vrm.expressionManager.setValue(
        VRMExpressionPresetName.Happy,
        THREE.MathUtils.lerp(smileIdle, smileSpeak, sw)
      );
    }

    // ─── Arms: organic idle + conversational gestures ───
    const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
    const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode('leftLowerArm');
    const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm');
    const leftHand = vrm.humanoid?.getNormalizedBoneNode('leftHand');
    const rightHand = vrm.humanoid?.getNormalizedBoneNode('rightHand');

    if (leftUpperArm) {
      const idleZ = 1.25 + noise(0.2, 0.0) * 0.02;
      const idleX = 0.08 + noise(0.15, 1.0) * 0.01;
      const idleY = noise(0.1, 2.0) * 0.01;
      const speakZ = 0.95 + noise(0.35, 3.0) * 0.06 * gesturePhrase;
      const speakX = 0.4 + noise(0.5, 4.0) * 0.1 * gesturePhrase;
      const speakY = -0.4 + noise(0.3, 5.0) * 0.06 * gesturePhrase;
      sb.luaZ = THREE.MathUtils.lerp(sb.luaZ, THREE.MathUtils.lerp(idleZ, speakZ, sw), dt * 3.5);
      sb.luaX = THREE.MathUtils.lerp(sb.luaX, THREE.MathUtils.lerp(idleX, speakX, sw), dt * 3.5);
      sb.luaY = THREE.MathUtils.lerp(sb.luaY, THREE.MathUtils.lerp(idleY, speakY, sw), dt * 3.5);
      leftUpperArm.rotation.z = sb.luaZ;
      leftUpperArm.rotation.x = sb.luaX;
      leftUpperArm.rotation.y = sb.luaY;
    }

    if (rightUpperArm) {
      const idleZ = -1.25 - noise(0.22, 0.5) * 0.02;
      const idleX = 0.08 - noise(0.17, 1.5) * 0.01;
      const idleY = noise(0.12, 2.5) * 0.01;
      const speakZ = -0.95 - noise(0.4, 3.5) * 0.05 * gesturePhrase;
      const speakX = 0.4 + noise(0.45, 4.5) * 0.08 * gesturePhrase;
      const speakY = 0.4 - noise(0.35, 5.5) * 0.06 * gesturePhrase;
      sb.ruaZ = THREE.MathUtils.lerp(sb.ruaZ, THREE.MathUtils.lerp(idleZ, speakZ, sw), dt * 3.5);
      sb.ruaX = THREE.MathUtils.lerp(sb.ruaX, THREE.MathUtils.lerp(idleX, speakX, sw), dt * 3.5);
      sb.ruaY = THREE.MathUtils.lerp(sb.ruaY, THREE.MathUtils.lerp(idleY, speakY, sw), dt * 3.5);
      rightUpperArm.rotation.z = sb.ruaZ;
      rightUpperArm.rotation.x = sb.ruaX;
      rightUpperArm.rotation.y = sb.ruaY;
    }

    if (leftLowerArm) {
      const idleX = -0.15 + noise(0.12, 0.0) * 0.02;
      const idleY = 0.15;
      const speakX = -0.55 + noise(0.6, 1.0) * 0.12 * gesturePhrase;
      const speakY = 0.9 + noise(0.5, 2.0) * 0.12 * gesturePhrase;
      sb.llaX = THREE.MathUtils.lerp(sb.llaX, THREE.MathUtils.lerp(idleX, speakX, sw), dt * 3.5);
      sb.llaY = THREE.MathUtils.lerp(sb.llaY, THREE.MathUtils.lerp(idleY, speakY, sw), dt * 3.5);
      leftLowerArm.rotation.x = sb.llaX;
      leftLowerArm.rotation.y = sb.llaY;
    }

    if (rightLowerArm) {
      const idleX = -0.15 - noise(0.14, 0.5) * 0.02;
      const idleY = -0.15;
      const speakX = -0.55 - noise(0.55, 1.5) * 0.1 * gesturePhrase;
      const speakY = -0.9 + noise(0.45, 2.5) * 0.12 * gesturePhrase;
      sb.rlaX = THREE.MathUtils.lerp(sb.rlaX, THREE.MathUtils.lerp(idleX, speakX, sw), dt * 3.5);
      sb.rlaY = THREE.MathUtils.lerp(sb.rlaY, THREE.MathUtils.lerp(idleY, speakY, sw), dt * 3.5);
      rightLowerArm.rotation.x = sb.rlaX;
      rightLowerArm.rotation.y = sb.rlaY;
    }

    if (leftHand) {
      const idleX = noise(0.1, 3.0) * 0.015;
      const speakX = noise(0.8, 4.0) * 0.12 * gesturePhrase;
      const speakZ = noise(0.65, 5.0) * 0.15 * gesturePhrase;
      sb.lhX = THREE.MathUtils.lerp(sb.lhX, THREE.MathUtils.lerp(idleX, speakX, sw), dt * 4);
      sb.lhZ = THREE.MathUtils.lerp(sb.lhZ, THREE.MathUtils.lerp(0, speakZ, sw), dt * 4);
      leftHand.rotation.x = sb.lhX;
      leftHand.rotation.z = sb.lhZ;
    }

    if (rightHand) {
      const idleX = noise(0.11, 3.5) * 0.015;
      const speakX = noise(0.75, 4.5) * 0.1 * gesturePhrase;
      const speakZ = noise(0.7, 5.5) * 0.12 * gesturePhrase;
      sb.rhX = THREE.MathUtils.lerp(sb.rhX, THREE.MathUtils.lerp(idleX, speakX, sw), dt * 4);
      sb.rhZ = THREE.MathUtils.lerp(sb.rhZ, THREE.MathUtils.lerp(0, speakZ, sw), dt * 4);
      rightHand.rotation.x = sb.rhX;
      rightHand.rotation.z = sb.rhZ;
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
