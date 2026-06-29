// AvatarScene.js – Rewritten with professional conversational animation system
"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin, VRMUtils, VRMExpressionPresetName } from "@pixiv/three-vrm";

/*** Utility: layered organic noise (non‑repeating) ***/
const noise = (time, freq, phase = 0) =>
  Math.sin(time * freq + phase) * 0.5 +
  Math.sin(time * freq * 1.618 + phase + 1.3) * 0.3 +
  Math.sin(time * freq * 2.317 + phase + 2.7) * 0.2;

/*** GestureEngine – state machine for conversational gestures ***/
class GestureEngine {
  constructor() {
    this.leftState = "Idle";
    this.rightState = "Idle";
    this.leftTimer = 0;
    this.rightTimer = 0;
    this.leftNextChange = this._interval();
    this.rightNextChange = this._interval();
    this.blendSpeed = 2.5; // smooth visible transitions
    this.time = 0;

    // Reusable temp quaternion for noise overlay
    this._tmpQ = new THREE.Quaternion();
    this._tmpE = new THREE.Euler();

    // Initialize both current and target to Idle pose with INDEPENDENT quaternion objects
    const idle = GestureEngine.Gestures.Idle;
    this.current = {
      leftShoulder: new THREE.Quaternion(),
      leftUpper: new THREE.Quaternion().setFromEuler(idle.leftUpper),
      leftLower: new THREE.Quaternion().setFromEuler(idle.leftLower),
      leftHand: new THREE.Quaternion().setFromEuler(idle.leftHand),
      rightShoulder: new THREE.Quaternion(),
      rightUpper: new THREE.Quaternion().setFromEuler(idle.rightUpper),
      rightLower: new THREE.Quaternion().setFromEuler(idle.rightLower),
      rightHand: new THREE.Quaternion().setFromEuler(idle.rightHand),
    };
    this.target = {
      leftShoulder: new THREE.Quaternion(),
      leftUpper: new THREE.Quaternion().setFromEuler(idle.leftUpper),
      leftLower: new THREE.Quaternion().setFromEuler(idle.leftLower),
      leftHand: new THREE.Quaternion().setFromEuler(idle.leftHand),
      rightShoulder: new THREE.Quaternion(),
      rightUpper: new THREE.Quaternion().setFromEuler(idle.rightUpper),
      rightLower: new THREE.Quaternion().setFromEuler(idle.rightLower),
      rightHand: new THREE.Quaternion().setFromEuler(idle.rightHand),
    };
  }

  /*
   * 12 natural conversation gestures.
   * VRM normalized bone conventions (T-pose):
   *   leftUpperArm  Z > 0 = arm DOWN (toward body), Z ~ 1.25 = resting
   *   rightUpperArm Z < 0 = arm DOWN (toward body), Z ~ -1.25 = resting
   *   Z values closer to 0 = arm raised outward
   *
   * SAFE RANGE to avoid chest clipping:
   *   Left  Z:  0.75 .. 1.30   (never below 0.75)
   *   Right Z: -1.30 .. -0.75  (never above -0.75)
   */
  static Gestures = {
    Idle: {
      leftShoulder:  new THREE.Euler(0, 0, 0),
      leftUpper:     new THREE.Euler(0.08, 0, 1.25),
      leftLower:     new THREE.Euler(-0.12, 0.15, 0),
      leftHand:      new THREE.Euler(0, 0, 0),
      rightShoulder: new THREE.Euler(0, 0, 0),
      rightUpper:    new THREE.Euler(0.08, 0, -1.25),
      rightLower:    new THREE.Euler(-0.12, -0.15, 0),
      rightHand:     new THREE.Euler(0, 0, 0),
    },
    // Both palms open, presenting something
    OpenPalmPresent: {
      leftShoulder:  new THREE.Euler(0, 0, -0.05),
      leftUpper:     new THREE.Euler(0.35, -0.25, 0.85),
      leftLower:     new THREE.Euler(-0.45, 0.65, 0),
      leftHand:      new THREE.Euler(-0.15, 0.2, 0.1),
      rightShoulder: new THREE.Euler(0, 0, 0.05),
      rightUpper:    new THREE.Euler(0.35, 0.25, -0.85),
      rightLower:    new THREE.Euler(-0.45, -0.65, 0),
      rightHand:     new THREE.Euler(-0.15, -0.2, -0.1),
    },
    // Right hand gesturing, left relaxed
    RightExplain: {
      leftShoulder:  new THREE.Euler(0, 0, 0),
      leftUpper:     new THREE.Euler(0.1, 0, 1.2),
      leftLower:     new THREE.Euler(-0.15, 0.2, 0),
      leftHand:      new THREE.Euler(0, 0.05, 0),
      rightShoulder: new THREE.Euler(0, 0, 0.06),
      rightUpper:    new THREE.Euler(0.45, 0.15, -0.80),
      rightLower:    new THREE.Euler(-0.50, -0.70, 0),
      rightHand:     new THREE.Euler(-0.1, -0.25, -0.15),
    },
    // Left hand gesturing, right relaxed
    LeftExplain: {
      leftShoulder:  new THREE.Euler(0, 0, -0.06),
      leftUpper:     new THREE.Euler(0.45, -0.15, 0.80),
      leftLower:     new THREE.Euler(-0.50, 0.70, 0),
      leftHand:      new THREE.Euler(-0.1, 0.25, 0.15),
      rightShoulder: new THREE.Euler(0, 0, 0),
      rightUpper:    new THREE.Euler(0.1, 0, -1.2),
      rightLower:    new THREE.Euler(-0.15, -0.2, 0),
      rightHand:     new THREE.Euler(0, -0.05, 0),
    },
    // Both hands slightly raised, emphasizing a point
    Emphasize: {
      leftShoulder:  new THREE.Euler(0, 0, -0.04),
      leftUpper:     new THREE.Euler(0.40, -0.10, 0.90),
      leftLower:     new THREE.Euler(-0.40, 0.55, 0),
      leftHand:      new THREE.Euler(-0.20, 0.15, 0),
      rightShoulder: new THREE.Euler(0, 0, 0.04),
      rightUpper:    new THREE.Euler(0.40, 0.10, -0.90),
      rightLower:    new THREE.Euler(-0.40, -0.55, 0),
      rightHand:     new THREE.Euler(-0.20, -0.15, 0),
    },
    // Light shrug – shoulders up, forearms out
    Shrug: {
      leftShoulder:  new THREE.Euler(0, 0, -0.10),
      leftUpper:     new THREE.Euler(0.15, -0.10, 0.95),
      leftLower:     new THREE.Euler(-0.30, 0.45, 0),
      leftHand:      new THREE.Euler(0, 0.2, 0.15),
      rightShoulder: new THREE.Euler(0, 0, 0.10),
      rightUpper:    new THREE.Euler(0.15, 0.10, -0.95),
      rightLower:    new THREE.Euler(-0.30, -0.45, 0),
      rightHand:     new THREE.Euler(0, -0.2, -0.15),
    },
    // One hand near chin, thinking
    ThinkRight: {
      leftShoulder:  new THREE.Euler(0, 0, 0),
      leftUpper:     new THREE.Euler(0.1, 0, 1.20),
      leftLower:     new THREE.Euler(-0.15, 0.18, 0),
      leftHand:      new THREE.Euler(0, 0, 0),
      rightShoulder: new THREE.Euler(0, 0, 0.04),
      rightUpper:    new THREE.Euler(0.55, 0.20, -0.78),
      rightLower:    new THREE.Euler(-0.65, -0.80, 0),
      rightHand:     new THREE.Euler(-0.10, -0.10, 0),
    },
    // Gentle agree nod hands
    AgreeGesture: {
      leftShoulder:  new THREE.Euler(0, 0, -0.03),
      leftUpper:     new THREE.Euler(0.30, -0.10, 0.95),
      leftLower:     new THREE.Euler(-0.35, 0.50, 0),
      leftHand:      new THREE.Euler(-0.10, 0.10, 0),
      rightShoulder: new THREE.Euler(0, 0, 0.03),
      rightUpper:    new THREE.Euler(0.25, 0.05, -1.05),
      rightLower:    new THREE.Euler(-0.20, -0.30, 0),
      rightHand:     new THREE.Euler(0, -0.05, 0),
    },
    // Hands out to the side, "I don't know"
    UncertainOpen: {
      leftShoulder:  new THREE.Euler(0, 0, -0.08),
      leftUpper:     new THREE.Euler(0.20, -0.15, 0.80),
      leftLower:     new THREE.Euler(-0.25, 0.35, 0),
      leftHand:      new THREE.Euler(0, 0.30, 0.20),
      rightShoulder: new THREE.Euler(0, 0, 0.08),
      rightUpper:    new THREE.Euler(0.20, 0.15, -0.80),
      rightLower:    new THREE.Euler(-0.25, -0.35, 0),
      rightHand:     new THREE.Euler(0, -0.30, -0.20),
    },
    // Right hand counting/listing
    ListPoints: {
      leftShoulder:  new THREE.Euler(0, 0, 0),
      leftUpper:     new THREE.Euler(0.10, 0, 1.18),
      leftLower:     new THREE.Euler(-0.15, 0.20, 0),
      leftHand:      new THREE.Euler(0, 0, 0),
      rightShoulder: new THREE.Euler(0, 0, 0.05),
      rightUpper:    new THREE.Euler(0.50, 0.12, -0.82),
      rightLower:    new THREE.Euler(-0.55, -0.65, 0),
      rightHand:     new THREE.Euler(-0.20, -0.30, 0),
    },
    // Calm down / settling gesture
    CalmSettle: {
      leftShoulder:  new THREE.Euler(0, 0, -0.03),
      leftUpper:     new THREE.Euler(0.25, -0.08, 0.95),
      leftLower:     new THREE.Euler(-0.30, 0.40, 0),
      leftHand:      new THREE.Euler(-0.25, 0.10, 0),
      rightShoulder: new THREE.Euler(0, 0, 0.03),
      rightUpper:    new THREE.Euler(0.25, 0.08, -0.95),
      rightLower:    new THREE.Euler(-0.30, -0.40, 0),
      rightHand:     new THREE.Euler(-0.25, -0.10, 0),
    },
    // Excited / welcoming – arms wider
    Welcome: {
      leftShoulder:  new THREE.Euler(0, 0, -0.06),
      leftUpper:     new THREE.Euler(0.30, -0.20, 0.78),
      leftLower:     new THREE.Euler(-0.35, 0.50, 0),
      leftHand:      new THREE.Euler(-0.10, 0.20, 0.10),
      rightShoulder: new THREE.Euler(0, 0, 0.06),
      rightUpper:    new THREE.Euler(0.30, 0.20, -0.78),
      rightLower:    new THREE.Euler(-0.35, -0.50, 0),
      rightHand:     new THREE.Euler(-0.10, -0.20, -0.10),
    },
    // Contemplative – left hand touching opposite elbow area
    Contemplative: {
      leftShoulder:  new THREE.Euler(0, 0, -0.02),
      leftUpper:     new THREE.Euler(0.30, -0.05, 1.0),
      leftLower:     new THREE.Euler(-0.40, 0.55, 0),
      leftHand:      new THREE.Euler(-0.05, 0.10, 0),
      rightShoulder: new THREE.Euler(0, 0, 0.02),
      rightUpper:    new THREE.Euler(0.20, 0.05, -1.10),
      rightLower:    new THREE.Euler(-0.18, -0.22, 0),
      rightHand:     new THREE.Euler(0, -0.05, 0),
    },
  };

  _interval() {
    return 0.6 + Math.random() * 1.2; // 0.6–1.8 s
  }

  _pickLeftGesture() {
    const keys = Object.keys(GestureEngine.Gestures).filter(k => k !== "Idle");
    const name = keys[Math.floor(Math.random() * keys.length)];
    this.leftState = name;
    const d = GestureEngine.Gestures[name];
    this.target.leftShoulder.setFromEuler(d.leftShoulder);
    this.target.leftUpper.setFromEuler(d.leftUpper);
    this.target.leftLower.setFromEuler(d.leftLower);
    this.target.leftHand.setFromEuler(d.leftHand);
    this.leftTimer = 0;
    this.leftNextChange = this._interval();
  }

  _pickRightGesture() {
    const keys = Object.keys(GestureEngine.Gestures).filter(k => k !== "Idle");
    const name = keys[Math.floor(Math.random() * keys.length)];
    this.rightState = name;
    const d = GestureEngine.Gestures[name];
    this.target.rightShoulder.setFromEuler(d.rightShoulder);
    this.target.rightUpper.setFromEuler(d.rightUpper);
    this.target.rightLower.setFromEuler(d.rightLower);
    this.target.rightHand.setFromEuler(d.rightHand);
    this.rightTimer = 0;
    this.rightNextChange = this._interval();
  }

  _setIdleLeft() {
    const d = GestureEngine.Gestures.Idle;
    this.target.leftShoulder.setFromEuler(d.leftShoulder);
    this.target.leftUpper.setFromEuler(d.leftUpper);
    this.target.leftLower.setFromEuler(d.leftLower);
    this.target.leftHand.setFromEuler(d.leftHand);
    this.leftState = "Idle";
  }

  _setIdleRight() {
    const d = GestureEngine.Gestures.Idle;
    this.target.rightShoulder.setFromEuler(d.rightShoulder);
    this.target.rightUpper.setFromEuler(d.rightUpper);
    this.target.rightLower.setFromEuler(d.rightLower);
    this.target.rightHand.setFromEuler(d.rightHand);
    this.rightState = "Idle";
  }

  update(delta, speakingWeight) {
    this.time += delta;

    if (speakingWeight < 0.02) {
      // Return to idle
      if (this.leftState !== "Idle") this._setIdleLeft();
      if (this.rightState !== "Idle") this._setIdleRight();
    } else {
      // Independent left/right arm gesture timing
      this.leftTimer += delta;
      this.rightTimer += delta;
      if (this.leftTimer >= this.leftNextChange) this._pickLeftGesture();
      if (this.rightTimer >= this.rightNextChange) this._pickRightGesture();
    }

    // Smooth quaternion blending with exponential decay
    const blend = 1 - Math.exp(-this.blendSpeed * delta);
    this.current.leftShoulder.slerp(this.target.leftShoulder, blend);
    this.current.leftUpper.slerp(this.target.leftUpper, blend);
    this.current.leftLower.slerp(this.target.leftLower, blend);
    this.current.leftHand.slerp(this.target.leftHand, blend);
    this.current.rightShoulder.slerp(this.target.rightShoulder, blend);
    this.current.rightUpper.slerp(this.target.rightUpper, blend);
    this.current.rightLower.slerp(this.target.rightLower, blend);
    this.current.rightHand.slerp(this.target.rightHand, blend);
  }

  /** Apply blended rotations + micro-noise overlay to VRM bones */
  applyToVRM(vrm, speakingWeight) {
    const ls = vrm.humanoid?.getNormalizedBoneNode("leftShoulder");
    const lu = vrm.humanoid?.getNormalizedBoneNode("leftUpperArm");
    const ll = vrm.humanoid?.getNormalizedBoneNode("leftLowerArm");
    const lh = vrm.humanoid?.getNormalizedBoneNode("leftHand");
    const rs = vrm.humanoid?.getNormalizedBoneNode("rightShoulder");
    const ru = vrm.humanoid?.getNormalizedBoneNode("rightUpperArm");
    const rl = vrm.humanoid?.getNormalizedBoneNode("rightLowerArm");
    const rh = vrm.humanoid?.getNormalizedBoneNode("rightHand");

    // Micro-noise for organic feel (small additive rotations)
    const sw = Math.min(speakingWeight, 1);
    const t = this.time;
    const mn = (freq, phase) => noise(t, freq, phase) * 0.025 * sw; // subtle

    if (ls) ls.quaternion.copy(this.current.leftShoulder);
    if (lu) {
      lu.quaternion.copy(this.current.leftUpper);
      // Add micro-noise on top
      this._tmpE.set(mn(0.7, 0), mn(0.5, 1), mn(0.3, 2));
      this._tmpQ.setFromEuler(this._tmpE);
      lu.quaternion.multiply(this._tmpQ);
    }
    if (ll) {
      ll.quaternion.copy(this.current.leftLower);
      this._tmpE.set(mn(0.8, 3), mn(0.6, 4), 0);
      this._tmpQ.setFromEuler(this._tmpE);
      ll.quaternion.multiply(this._tmpQ);
    }
    if (lh) {
      lh.quaternion.copy(this.current.leftHand);
      this._tmpE.set(mn(1.0, 5), mn(0.9, 6), mn(0.7, 7));
      this._tmpQ.setFromEuler(this._tmpE);
      lh.quaternion.multiply(this._tmpQ);
    }
    if (rs) rs.quaternion.copy(this.current.rightShoulder);
    if (ru) {
      ru.quaternion.copy(this.current.rightUpper);
      this._tmpE.set(mn(0.65, 8), mn(0.45, 9), mn(0.35, 10));
      this._tmpQ.setFromEuler(this._tmpE);
      ru.quaternion.multiply(this._tmpQ);
    }
    if (rl) {
      rl.quaternion.copy(this.current.rightLower);
      this._tmpE.set(mn(0.75, 11), mn(0.55, 12), 0);
      this._tmpQ.setFromEuler(this._tmpE);
      rl.quaternion.multiply(this._tmpQ);
    }
    if (rh) {
      rh.quaternion.copy(this.current.rightHand);
      this._tmpE.set(mn(0.95, 13), mn(0.85, 14), mn(0.65, 15));
      this._tmpQ.setFromEuler(this._tmpE);
      rh.quaternion.multiply(this._tmpQ);
    }
  }
}

/*** PostureEngine – breathing, sway, head bob, nodding ***/
class PostureEngine {
  constructor() {
    this.time = 0;
    this.breathSpeed = 0.2;
    this.swaySpeed = 0.07;
    this.headBobSpeed = 1.1;
    this.nodSpeed = 3.5;
    this.nodPhase = 0;
    this.nodActive = false;
    this.nodTimer = 0;
  }

  update(delta, speakingWeight, pointer) {
    this.time += delta;
    const breath = Math.sin(this.time * Math.PI * this.breathSpeed) * 0.015;
    const sway = Math.sin(this.time * this.swaySpeed) * 0.008;
    const bob = Math.sin(this.time * this.headBobSpeed) * 0.005;
    this.breath = breath;
    this.sway = sway;
    this.bob = bob;
    if (speakingWeight > 0.6 && !this.nodActive) {
      this.nodActive = true;
      this.nodTimer = 0;
    }
    if (this.nodActive) {
      this.nodTimer += delta;
      const phase = Math.min(this.nodTimer * this.nodSpeed, Math.PI);
      this.nodPhase = Math.sin(phase) * 0.12;
      if (phase >= Math.PI) this.nodActive = false;
    } else {
      this.nodPhase = 0;
    }
  }

  applyToVRM(vrm) {
    const spine = vrm.humanoid?.getNormalizedBoneNode("spine");
    const chest = vrm.humanoid?.getNormalizedBoneNode("chest");
    if (spine) spine.rotation.x = this.breath;
    if (chest) chest.rotation.z = this.sway;
    const head = vrm.humanoid?.getNormalizedBoneNode("head");
    if (head) {
      head.rotation.y += this.bob;
      head.rotation.x += this.nodPhase;
    }
  }
}

/*** VRM Avatar component – loads model and runs animation loops ***/
function VRMAvatar({ jawOpen = 0, onLoaded }) {
  const vrmRef = useRef(null);
  const { scene } = useThree();
  const speakingWeight = useRef(0);

  const gestureEngine = useMemo(() => new GestureEngine(), []);
  const postureEngine = useMemo(() => new PostureEngine(), []);

  // Load VRM model once
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register(parser => new VRMLoaderPlugin(parser));
    loader.load(
      "/models/siti-chan.vrm",
      gltf => {
        const vrm = gltf.userData.vrm;
        if (!vrm) return;
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        VRMUtils.rotateVRM0(vrm);
        vrm.scene.traverse(obj => {
          if (obj.isMesh) {
            obj.frustumCulled = false;
            if (obj.material) obj.material.side = THREE.DoubleSide;
          }
        });
        vrm.scene.scale.set(2.5, 2.5, 2.5);
        vrm.scene.position.set(0, -2.2, 0);
        scene.add(vrm.scene);
        vrmRef.current = vrm;
        if (onLoaded) onLoaded();
        console.log("VRM model loaded successfully");
      },
      undefined,
      err => console.error("VRM load error", err)
    );
    return () => {
      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
        vrmRef.current = null;
      }
    };
  }, [scene, onLoaded]);

  // Main frame loop
  useFrame((state, delta) => {
    const vrm = vrmRef.current;
    if (!vrm) return;
    const dt = Math.min(delta, 0.05);
    const targetWeight = jawOpen > 0.02 ? 1 : 0;
    speakingWeight.current = THREE.MathUtils.lerp(speakingWeight.current, targetWeight, dt * 4);
    const sw = speakingWeight.current;

    // Eye blinking (original logic retained)
    if (!vrm._blink) vrm._blink = { next: 2 + Math.random() * 3, progress: -1 };
    const blink = vrm._blink;
    if (blink.progress >= 0) {
      blink.progress += dt;
      const dur = 0.15;
      if (blink.progress < dur) {
        vrm.expressionManager.setValue(VRMExpressionPresetName.Blink, Math.sin((blink.progress / dur) * Math.PI));
      } else {
        blink.progress = -1;
        blink.next = state.clock.getElapsedTime() + (Math.random() < 0.2 ? 0.25 : 2 + Math.random() * 4);
      }
    } else if (state.clock.getElapsedTime() >= blink.next) {
      blink.progress = 0;
    }

    // Lip sync (original logic retained)
    const visCycle = noise(state.clock.getElapsedTime(), 2.5, 10);
    const visSlow = noise(state.clock.getElapsedTime(), 0.8, 12);
    const mouth = { Aa: 0, Oh: 0, Ih: 0, Ee: 0, Ou: 0 };
    if (jawOpen > 0.01) {
      const open = jawOpen;
      mouth.Aa = open * Math.max(0, 0.5 + visCycle * 0.5) * 0.9;
      mouth.Oh = open * Math.max(0, 0.5 - visCycle * 0.4) * 0.6;
      mouth.Ih = open * Math.max(0, visSlow * 0.6) * 0.5;
      mouth.Ee = open * Math.max(0, -visSlow * 0.5) * 0.35;
      mouth.Ou = open * Math.max(0, visCycle * visSlow) * 0.4;
    }
    const mouthSpeed = 10;
    const smooth = vrm._smoothMouth || (vrm._smoothMouth = { Aa: 0, Oh: 0, Ih: 0, Ee: 0, Ou: 0 });
    smooth.Aa = THREE.MathUtils.lerp(smooth.Aa, mouth.Aa, dt * mouthSpeed);
    smooth.Oh = THREE.MathUtils.lerp(smooth.Oh, mouth.Oh, dt * mouthSpeed);
    smooth.Ih = THREE.MathUtils.lerp(smooth.Ih, mouth.Ih, dt * mouthSpeed);
    smooth.Ee = THREE.MathUtils.lerp(smooth.Ee, mouth.Ee, dt * mouthSpeed);
    smooth.Ou = THREE.MathUtils.lerp(smooth.Ou, mouth.Ou, dt * mouthSpeed);
    vrm.expressionManager.setValue(VRMExpressionPresetName.Aa, smooth.Aa);
    vrm.expressionManager.setValue(VRMExpressionPresetName.Oh, smooth.Oh);
    vrm.expressionManager.setValue(VRMExpressionPresetName.Ih, smooth.Ih);
    vrm.expressionManager.setValue(VRMExpressionPresetName.Ee, smooth.Ee);
    vrm.expressionManager.setValue(VRMExpressionPresetName.Ou, smooth.Ou);

    // Warm smile
    const smileIdle = 0.2 + noise(state.clock.getElapsedTime(), 0.15, 6) * 0.06;
    const smileSpeak = 0.35 + noise(state.clock.getElapsedTime(), 0.3, 7) * 0.08;
    vrm.expressionManager.setValue(VRMExpressionPresetName.Happy, THREE.MathUtils.lerp(smileIdle, smileSpeak, sw));

    // Mouse look (head & neck)
    const head = vrm.humanoid?.getNormalizedBoneNode("head");
    const neck = vrm.humanoid?.getNormalizedBoneNode("neck");
    if (head) {
      const mouseX = state.pointer.x;
      const mouseY = state.pointer.y;
      const lookX = THREE.MathUtils.clamp(-mouseY * 0.12, -0.12, 0.12);
      const lookY = THREE.MathUtils.clamp(mouseX * 0.2, -0.25, 0.25);
      const idleX = noise(state.clock.getElapsedTime(), 0.25, 0) * 0.02;
      const idleY = noise(state.clock.getElapsedTime(), 0.18, 1) * 0.015;
      const idleZ = noise(state.clock.getElapsedTime(), 0.15, 2) * 0.012;
      const speakX = noise(state.clock.getElapsedTime(), 1.2, 0.5) * 0.03 + noise(state.clock.getElapsedTime(), 0.4, 3) * 0.015;
      const speakY = noise(state.clock.getElapsedTime(), 0.6, 1.5) * 0.025;
      const speakZ = noise(state.clock.getElapsedTime(), 0.45, 4) * 0.02;
      const tgtX = THREE.MathUtils.lerp(idleX, speakX, sw) + lookX;
      const tgtY = THREE.MathUtils.lerp(idleY, speakY, sw) + lookY;
      const tgtZ = THREE.MathUtils.lerp(idleZ, speakZ, sw);
      head.rotation.set(tgtX, tgtY, tgtZ);
      if (neck) neck.rotation.set(tgtX * 0.35, tgtY * 0.35, tgtZ * 0.35);
    }

    // Update engines
    gestureEngine.update(dt, sw);
    gestureEngine.applyToVRM(vrm, sw);
    postureEngine.update(dt, sw, state.pointer);
    postureEngine.applyToVRM(vrm);

    vrm.update(dt);
  });

  return null;
}

/*** Simple loading spinner ***/
function LoadingIndicator() {
  const meshRef = useRef();
  useFrame(state => {
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
      <mesh position={[0, -0.4, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/*** Main exported component ***/
export default function AvatarScene({ jawOpen }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const handleLoaded = useCallback(() => setIsLoaded(true), []);
  return (
    <div className="avatar-canvas-wrapper">
      <Canvas
        camera={{ position: [0, 2.0, 5], fov: 35 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        <ambientLight intensity={1.8} color="#fff5f9" />
        <directionalLight position={[3, 5, 4]} intensity={1.6} color="#ffffff" castShadow />
        <directionalLight position={[-3, 3, 2]} intensity={0.7} color="#e8d5ff" />
        <pointLight position={[0, 2, 3]} intensity={0.5} color="#ffd6e8" />
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
