'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

/* ─────────────────────────────────────────────
   Kawaii Anime Girl – procedural Three.js avatar
   Features: idle sway, breathing, eye blinking,
   head tilt, lip-sync via jawOpen prop
   ───────────────────────────────────────────── */

function KawaiiAvatar({ jawOpen = 0 }) {
  const groupRef = useRef();
  const headGroupRef = useRef();
  const jawRef = useRef();
  const leftEyeLidRef = useRef();
  const rightEyeLidRef = useRef();
  const leftPupilRef = useRef();
  const rightPupilRef = useRef();
  const bodyRef = useRef();
  const hairBackRef = useRef();
  const blushLeftRef = useRef();
  const blushRightRef = useRef();

  // Skin & palette
  const skin = '#ffe0d0';
  const hairColor = '#ff69b4';
  const hairDark = '#d44a8f';
  const eyeColor = '#6a0dad';
  const dressColor = '#7c3aed';
  const dressDark = '#5b21b6';
  const ribbonColor = '#f472b6';
  const blushColor = '#ffb3c6';
  const lipColor = '#e8457a';
  const shoeColor = '#1e1e2e';
  const white = '#ffffff';
  const black = '#1a1a2e';

  // Materials (memoised so they don't recreate every frame)
  const mats = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.55, metalness: 0.0 }),
    hair: new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.4, metalness: 0.05 }),
    hairDark: new THREE.MeshStandardMaterial({ color: hairDark, roughness: 0.45 }),
    eye: new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.15, metalness: 0.1 }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: white, roughness: 0.3 }),
    pupil: new THREE.MeshStandardMaterial({ color: black, roughness: 0.1 }),
    sparkle: new THREE.MeshStandardMaterial({ color: white, emissive: white, emissiveIntensity: 0.8, roughness: 0 }),
    dress: new THREE.MeshStandardMaterial({ color: dressColor, roughness: 0.35, metalness: 0.05 }),
    dressDark: new THREE.MeshStandardMaterial({ color: dressDark, roughness: 0.4 }),
    ribbon: new THREE.MeshStandardMaterial({ color: ribbonColor, roughness: 0.3 }),
    blush: new THREE.MeshStandardMaterial({ color: blushColor, transparent: true, opacity: 0.45, roughness: 0.6 }),
    lip: new THREE.MeshStandardMaterial({ color: lipColor, roughness: 0.35 }),
    shoe: new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.5 }),
    eyelid: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.55, side: THREE.DoubleSide }),
  }), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // --- Idle sway (whole body gentle rock) ---
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.03;
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.02;
    }

    // --- Head bob & tilt ---
    if (headGroupRef.current) {
      headGroupRef.current.rotation.z = Math.sin(t * 0.6) * 0.05;
      headGroupRef.current.rotation.x = Math.sin(t * 0.9) * 0.03;
      headGroupRef.current.position.y = Math.sin(t * 1.5) * 0.015 + 0.72;
    }

    // --- Breathing (body scale Y) ---
    if (bodyRef.current) {
      bodyRef.current.scale.y = 1 + Math.sin(t * 2.0) * 0.012;
    }

    // --- Eye blinking (periodic) ---
    const blinkCycle = t % 4;
    const isBlinking = blinkCycle > 3.7 && blinkCycle < 3.9;
    const lidScale = isBlinking ? 1.0 : 0.0;
    if (leftEyeLidRef.current) leftEyeLidRef.current.scale.y = lidScale;
    if (rightEyeLidRef.current) rightEyeLidRef.current.scale.y = lidScale;

    // --- Pupil micro-movement ---
    const px = Math.sin(t * 0.7) * 0.008;
    const py = Math.cos(t * 1.1) * 0.005;
    if (leftPupilRef.current) {
      leftPupilRef.current.position.x = -0.12 + px;
      leftPupilRef.current.position.y = 0.07 + py;
    }
    if (rightPupilRef.current) {
      rightPupilRef.current.position.x = 0.12 + px;
      rightPupilRef.current.position.y = 0.07 + py;
    }

    // --- Hair sway ---
    if (hairBackRef.current) {
      hairBackRef.current.rotation.x = Math.sin(t * 1.0) * 0.06 + 0.1;
    }

    // --- Blush pulse ---
    const blushOpacity = 0.35 + Math.sin(t * 2.5) * 0.1;
    if (blushLeftRef.current) blushLeftRef.current.material.opacity = blushOpacity;
    if (blushRightRef.current) blushRightRef.current.material.opacity = blushOpacity;

    // --- Mouth lip-sync ---
    if (jawRef.current) {
      jawRef.current.scale.y = 0.6 + jawOpen * 2.5;
      jawRef.current.position.y = -0.16 - jawOpen * 0.025;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.3, 0]} scale={1.4}>

      {/* ====== BODY ====== */}
      <group ref={bodyRef}>
        {/* Torso */}
        <mesh position={[0, 0.05, 0]} material={mats.skin}>
          <cylinderGeometry args={[0.12, 0.14, 0.3, 24]} />
        </mesh>

        {/* Dress - upper */}
        <mesh position={[0, -0.05, 0]} material={mats.dress}>
          <cylinderGeometry args={[0.14, 0.16, 0.22, 24]} />
        </mesh>

        {/* Dress - skirt (cone) */}
        <mesh position={[0, -0.32, 0]} material={mats.dress}>
          <coneGeometry args={[0.32, 0.45, 24, 1, true]} />
        </mesh>

        {/* Dress - skirt frills / highlight ring */}
        <mesh position={[0, -0.52, 0]} material={mats.ribbon}>
          <torusGeometry args={[0.30, 0.018, 8, 32]} />
        </mesh>

        {/* Ribbon bow on chest */}
        <mesh position={[0, 0.12, 0.13]} material={mats.ribbon}>
          <boxGeometry args={[0.12, 0.06, 0.03]} />
        </mesh>
        <mesh position={[-0.07, 0.13, 0.13]} rotation={[0, 0, 0.4]} material={mats.ribbon}>
          <boxGeometry args={[0.06, 0.03, 0.02]} />
        </mesh>
        <mesh position={[0.07, 0.13, 0.13]} rotation={[0, 0, -0.4]} material={mats.ribbon}>
          <boxGeometry args={[0.06, 0.03, 0.02]} />
        </mesh>

        {/* Arms */}
        <mesh position={[-0.19, 0.0, 0]} rotation={[0, 0, 0.25]} material={mats.skin}>
          <capsuleGeometry args={[0.035, 0.22, 8, 16]} />
        </mesh>
        <mesh position={[0.19, 0.0, 0]} rotation={[0, 0, -0.25]} material={mats.skin}>
          <capsuleGeometry args={[0.035, 0.22, 8, 16]} />
        </mesh>

        {/* Dress sleeves (puffy) */}
        <mesh position={[-0.16, 0.08, 0]} material={mats.dress}>
          <sphereGeometry args={[0.06, 16, 16]} />
        </mesh>
        <mesh position={[0.16, 0.08, 0]} material={mats.dress}>
          <sphereGeometry args={[0.06, 16, 16]} />
        </mesh>

        {/* Legs */}
        <mesh position={[-0.08, -0.62, 0]} material={mats.skin}>
          <capsuleGeometry args={[0.04, 0.2, 8, 16]} />
        </mesh>
        <mesh position={[0.08, -0.62, 0]} material={mats.skin}>
          <capsuleGeometry args={[0.04, 0.2, 8, 16]} />
        </mesh>

        {/* Shoes */}
        <mesh position={[-0.08, -0.78, 0.02]} material={mats.shoe}>
          <boxGeometry args={[0.06, 0.04, 0.1]} />
        </mesh>
        <mesh position={[0.08, -0.78, 0.02]} material={mats.shoe}>
          <boxGeometry args={[0.06, 0.04, 0.1]} />
        </mesh>
      </group>

      {/* ====== HEAD GROUP ====== */}
      <group ref={headGroupRef} position={[0, 0.72, 0]}>

        {/* Head sphere */}
        <mesh material={mats.skin}>
          <sphereGeometry args={[0.22, 32, 32]} />
        </mesh>

        {/* ---- EYES ---- */}
        {/* Left eye white */}
        <mesh position={[-0.12, 0.04, 0.17]} material={mats.eyeWhite}>
          <sphereGeometry args={[0.055, 24, 24]} />
        </mesh>
        {/* Left iris */}
        <mesh position={[-0.12, 0.04, 0.215]} material={mats.eye}>
          <circleGeometry args={[0.04, 24]} />
        </mesh>
        {/* Left pupil */}
        <mesh ref={leftPupilRef} position={[-0.12, 0.07, 0.222]} material={mats.pupil}>
          <circleGeometry args={[0.02, 16]} />
        </mesh>
        {/* Left sparkle (top-right) */}
        <mesh position={[-0.10, 0.065, 0.225]} material={mats.sparkle}>
          <circleGeometry args={[0.008, 8]} />
        </mesh>
        {/* Left sparkle (bottom-left, smaller) */}
        <mesh position={[-0.135, 0.035, 0.225]} material={mats.sparkle}>
          <circleGeometry args={[0.005, 8]} />
        </mesh>

        {/* Right eye white */}
        <mesh position={[0.12, 0.04, 0.17]} material={mats.eyeWhite}>
          <sphereGeometry args={[0.055, 24, 24]} />
        </mesh>
        {/* Right iris */}
        <mesh position={[0.12, 0.04, 0.215]} material={mats.eye}>
          <circleGeometry args={[0.04, 24]} />
        </mesh>
        {/* Right pupil */}
        <mesh ref={rightPupilRef} position={[0.12, 0.07, 0.222]} material={mats.pupil}>
          <circleGeometry args={[0.02, 16]} />
        </mesh>
        {/* Right sparkle */}
        <mesh position={[0.14, 0.065, 0.225]} material={mats.sparkle}>
          <circleGeometry args={[0.008, 8]} />
        </mesh>
        <mesh position={[0.105, 0.035, 0.225]} material={mats.sparkle}>
          <circleGeometry args={[0.005, 8]} />
        </mesh>

        {/* ---- EYELIDS (for blinking) ---- */}
        <mesh ref={leftEyeLidRef} position={[-0.12, 0.06, 0.218]} scale={[1, 0, 1]} material={mats.eyelid}>
          <planeGeometry args={[0.12, 0.11]} />
        </mesh>
        <mesh ref={rightEyeLidRef} position={[0.12, 0.06, 0.218]} scale={[1, 0, 1]} material={mats.eyelid}>
          <planeGeometry args={[0.12, 0.11]} />
        </mesh>

        {/* ---- BLUSH ---- */}
        <mesh ref={blushLeftRef} position={[-0.16, -0.02, 0.16]} rotation={[0, -0.4, 0]} material={mats.blush}>
          <circleGeometry args={[0.035, 16]} />
        </mesh>
        <mesh ref={blushRightRef} position={[0.16, -0.02, 0.16]} rotation={[0, 0.4, 0]} material={mats.blush}>
          <circleGeometry args={[0.035, 16]} />
        </mesh>

        {/* ---- MOUTH ---- */}
        <mesh ref={jawRef} position={[0, -0.06, 0.20]} material={mats.lip}>
          <capsuleGeometry args={[0.018, 0.035, 4, 12]} />
        </mesh>

        {/* Nose (tiny bump) */}
        <mesh position={[0, 0.0, 0.22]} material={mats.skin}>
          <sphereGeometry args={[0.012, 12, 12]} />
        </mesh>

        {/* ---- HAIR ---- */}
        {/* Hair top (dome) */}
        <mesh position={[0, 0.08, -0.01]} material={mats.hair}>
          <sphereGeometry args={[0.24, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        </mesh>

        {/* Hair bangs (front fringe) */}
        <mesh position={[0, 0.12, 0.15]} rotation={[0.3, 0, 0]} material={mats.hair}>
          <boxGeometry args={[0.38, 0.08, 0.08]} />
        </mesh>
        {/* Bangs — side tufts left */}
        <mesh position={[-0.18, 0.06, 0.12]} rotation={[0.2, 0.3, 0.15]} material={mats.hair}>
          <boxGeometry args={[0.08, 0.1, 0.06]} />
        </mesh>
        {/* Bangs — side tufts right */}
        <mesh position={[0.18, 0.06, 0.12]} rotation={[0.2, -0.3, -0.15]} material={mats.hair}>
          <boxGeometry args={[0.08, 0.1, 0.06]} />
        </mesh>

        {/* Hair side — left long strand */}
        <mesh position={[-0.22, -0.08, 0.02]} material={mats.hair}>
          <capsuleGeometry args={[0.04, 0.35, 8, 16]} />
        </mesh>
        {/* Hair side — right long strand */}
        <mesh position={[0.22, -0.08, 0.02]} material={mats.hair}>
          <capsuleGeometry args={[0.04, 0.35, 8, 16]} />
        </mesh>

        {/* Hair back (long flowing) */}
        <group ref={hairBackRef} position={[0, -0.05, -0.12]}>
          <mesh material={mats.hair}>
            <capsuleGeometry args={[0.16, 0.5, 12, 24]} />
          </mesh>
          {/* Hair back darker inner layer */}
          <mesh position={[0, 0.05, 0.04]} material={mats.hairDark}>
            <capsuleGeometry args={[0.12, 0.4, 8, 16]} />
          </mesh>
        </group>

        {/* ---- HAIR ACCESSORIES ---- */}
        {/* Ribbon / hair clip */}
        <mesh position={[-0.18, 0.16, 0.0]} rotation={[0, 0, 0.3]} material={mats.ribbon}>
          <boxGeometry args={[0.10, 0.06, 0.04]} />
        </mesh>
        <mesh position={[-0.22, 0.18, 0.0]} rotation={[0, 0, 0.6]} material={mats.ribbon}>
          <boxGeometry args={[0.06, 0.03, 0.03]} />
        </mesh>
        <mesh position={[-0.14, 0.18, 0.0]} rotation={[0, 0, -0.1]} material={mats.ribbon}>
          <boxGeometry args={[0.06, 0.03, 0.03]} />
        </mesh>

        {/* Ears (small bumps behind hair) */}
        <mesh position={[-0.21, 0.02, 0.0]} material={mats.skin}>
          <sphereGeometry args={[0.03, 12, 12]} />
        </mesh>
        <mesh position={[0.21, 0.02, 0.0]} material={mats.skin}>
          <sphereGeometry args={[0.03, 12, 12]} />
        </mesh>
      </group>

    </group>
  );
}

export default function AvatarScene({ jawOpen }) {
  return (
    <div className="w-full h-full min-h-[400px] relative">
      <Canvas camera={{ position: [0, 0.5, 1.8], fov: 40 }}>
        {/* Soft lighting setup */}
        <ambientLight intensity={1.2} color="#ffe8f0" />
        <directionalLight position={[3, 5, 4]} intensity={1.4} color="#ffffff" />
        <directionalLight position={[-2, 3, 2]} intensity={0.6} color="#dab3ff" />
        <pointLight position={[0, 1, 2]} intensity={0.4} color="#ffb3d9" />

        <KawaiiAvatar jawOpen={jawOpen} />

        <OrbitControls
          enableZoom={true}
          minDistance={1}
          maxDistance={4}
          target={[0, 0.3, 0]}
          enablePan={false}
          maxPolarAngle={Math.PI * 0.75}
          minPolarAngle={Math.PI * 0.25}
        />
      </Canvas>
    </div>
  );
}
