import * as THREE from 'three';
import type { EffectEvent } from '@/lib/effects/types';
import { makeSoftDotTexture } from '../particles';

export type SpiritAction = EffectEvent['spirit_action'];

// Stable API (split contract): group, glow, light, texture must stay.
// Extra fields are additive for the art-pass2 remodel.
export interface WispRig {
  group: THREE.Group;
  glow: THREE.Sprite;
  light: THREE.PointLight;
  texture: THREE.Texture;
  /** Inner pivot: animator drives squash/tilt here so scene.ts group motion never fights it. */
  inner: THREE.Group;
  body: THREE.Mesh;
  eyeL: THREE.Mesh;
  eyeR: THREE.Mesh;
  armL: THREE.Group;
  armR: THREE.Group;
  /** Instanced trailing sparkles (single draw call). */
  sparkles: THREE.InstancedMesh;
}

const WISP_COLOR = 0xfff3cf;
const WISP_EMISSIVE = 0xffdf9e;
const SPARK_COUNT = 14;

// Shared 4-step toon ramp (PRD recipe: NearestFilter keeps the bands crisp).
let rampTex: THREE.DataTexture | null = null;
function wispRamp(): THREE.DataTexture {
  if (!rampTex) {
    const steps = 4;
    const data = new Uint8Array(steps);
    for (let i = 0; i < steps; i++) data[i] = Math.round((i / (steps - 1)) * 255);
    rampTex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
    rampTex.minFilter = THREE.NearestFilter;
    rampTex.magFilter = THREE.NearestFilter;
    rampTex.needsUpdate = true;
  }
  return rampTex;
}

// Teardrop / flame-ish silhouette: round base tapering to a soft tip.
// Original procedural profile (no copied character design).
function makeTeardropGeometry(): THREE.LatheGeometry {
  const profile: Array<[number, number]> = [
    [0.001, -0.36],
    [0.16, -0.345],
    [0.26, -0.26],
    [0.325, -0.1],
    [0.33, 0.04],
    [0.29, 0.18],
    [0.225, 0.32],
    [0.15, 0.45],
    [0.085, 0.56],
    [0.032, 0.65],
    [0.001, 0.7],
  ];
  const points = profile.map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(points, 20);
  geo.computeVertexNormals();
  return geo;
}

function makeNubArm(side: 1 | -1, mat: THREE.Material): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.27, -0.04, 0.03);
  const nub = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.1, 4, 10), mat);
  nub.position.set(side * 0.09, -0.07, 0);
  nub.rotation.z = side * -0.7;
  pivot.add(nub);
  pivot.rotation.z = side * 0.45;
  return pivot;
}

export function buildWisp(light: THREE.PointLight): WispRig {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  const bodyMat = new THREE.MeshToonMaterial({
    color: WISP_COLOR,
    gradientMap: wispRamp(),
    emissive: WISP_EMISSIVE,
    emissiveIntensity: 0.45,
  });
  const body = new THREE.Mesh(makeTeardropGeometry(), bodyMat);
  inner.add(body);

  const glowTex = makeSoftDotTexture();
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffe9b8,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.scale.set(2.4, 2.4, 1);

  const eyeGeo = new THREE.SphereGeometry(0.05, 10, 10);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x4a4438 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.115, 0.06, 0.285);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.115, 0.06, 0.285);
  inner.add(eyeL, eyeR);

  const armMat = new THREE.MeshToonMaterial({
    color: 0xffe9b8,
    gradientMap: wispRamp(),
    emissive: WISP_EMISSIVE,
    emissiveIntensity: 0.35,
  });
  const armL = makeNubArm(-1, armMat);
  const armR = makeNubArm(1, armMat);
  inner.add(armL, armR);

  // Trailing sparkle ribbon: instanced tumbling octahedra, additive gold
  // fading along the tail via per-instance color. One draw call.
  const sparkGeo = new THREE.OctahedronGeometry(0.05);
  const sparkMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sparkles = new THREE.InstancedMesh(sparkGeo, sparkMat, SPARK_COUNT);
  sparkles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sparkles.frustumCulled = false;
  const warm = new THREE.Color(0xffd97a);
  const dark = new THREE.Color(0x1a0f00);
  const c = new THREE.Color();
  for (let i = 0; i < SPARK_COUNT; i++) {
    c.copy(warm).lerp(dark, i / (SPARK_COUNT - 1));
    sparkles.setColorAt(i, c);
  }
  if (sparkles.instanceColor) sparkles.instanceColor.needsUpdate = true;
  group.add(sparkles);

  group.add(glow, light);
  return { group, glow, light, texture: glowTex, inner, body, eyeL, eyeR, armL, armR, sparkles };
}

export interface WispActionOffset {
  dx: number;
  dy: number;
  scale: number;
}

// Ritual reaction overlay: positional/scale offsets for the wisp, active for
// the first 1.4s after a cast. Pure function of (action, elapsed).
export function wispActionOffset(action: SpiritAction, t: number): WispActionOffset {
  let dy = 0;
  let dx = 0;
  let scale = 1;
  if (t < 1.4) {
    if (action === 'nod') dy = -Math.abs(Math.sin(t * 9)) * 0.25;
    else if (action === 'bounce') dy = Math.abs(Math.sin(t * 9)) * 0.8;
    else if (action === 'wave') dx = Math.sin(t * 12) * 0.3;
    else if (action === 'curl') scale = 0.72;
  }
  return { dx, dy, scale };
}

// --- Animator: idle squash-stretch + 5 action poses + blink + ribbon ---
//
// Owns only rig.inner (squash/tilt), eyes, arms, and sparkle instances, so it
// composes with scene.ts group motion + wispActionOffset without fighting it.
// Zero per-frame allocation: all temps are module-level.

const _dummy = new THREE.Object3D();
const ACTION_WINDOW = 1.4;

export interface WispAnimator {
  readonly action: SpiritAction;
  setAction(action: SpiritAction): void;
  update(dt: number, time: number): void;
}

export function createWispAnimator(rig: WispRig): WispAnimator {
  let action: SpiritAction = 'idle';
  let actionT = ACTION_WINDOW; // start settled

  const setAction = (next: SpiritAction): void => {
    if (next !== action) {
      action = next;
      actionT = 0;
    }
  };

  const update = (dt: number, time: number): void => {
    actionT += dt;
    const active = actionT < ACTION_WINDOW;
    const t = actionT;

    // Idle squash-stretch breathing (always on, layered under actions).
    const breath = Math.sin(time * 2.2);
    let sxz = 1 - 0.045 * breath;
    let sy = 1 + 0.06 * breath;
    let tiltX = 0;
    let tiltZ = Math.sin(time * 1.1) * 0.04;
    let armLz = -0.45;
    let armRz = 0.45;
    let armRx = 0;
    let eyeSY = 1;

    if (active) {
      if (action === 'nod') {
        // Two forward bows with a soft squash at the bottom of each.
        const n = Math.abs(Math.sin(t * 9));
        tiltX = n * 0.42;
        sy *= 1 - n * 0.1;
        sxz *= 1 + n * 0.06;
        armLz = -0.7;
        armRz = 0.7;
      } else if (action === 'curl') {
        // Tuck tight: shrink, round in, happy closed eyes.
        const k = Math.min(1, t * 6) * (t > 1.0 ? Math.max(0, 1 - (t - 1.0) * 2.5) : 1);
        sxz *= 1 - 0.22 * k;
        sy *= 1 - 0.3 * k;
        tiltX = -0.25 * k;
        armLz = -0.45 - 0.9 * k;
        armRz = 0.45 + 0.9 * k;
        eyeSY = 1 - 0.9 * k;
      } else if (action === 'bounce') {
        // Stretch rising, squash landing; arms up mid-bounce.
        const ph = Math.sin(t * 9);
        const air = Math.max(0, ph);
        const land = Math.max(0, -ph);
        sy *= 1 + air * 0.16 - land * 0.14;
        sxz *= 1 - air * 0.08 + land * 0.1;
        armLz = -0.45 - air * 1.4;
        armRz = 0.45 + air * 1.4;
        eyeSY = 1 + air * 0.15;
      } else if (action === 'wave') {
        // Right nub up, oscillating; slight lean into it; idle arms sway.
        const env = Math.sin(Math.min(1, t / ACTION_WINDOW) * Math.PI);
        armRx = -2.1 * env;
        armRz = 0.45 + Math.sin(t * 12) * 0.55 * env;
        tiltZ += 0.1 * env;
        armLz = -0.45 - 0.2 * env;
        eyeSY = 1 + 0.1 * env;
      }
    }

    // Blink: brief lid every ~2.8s (skipped while curl holds eyes shut).
    if (action !== 'curl' || !active) {
      const phase = time % 2.8;
      if (phase < 0.12) {
        const k = Math.sin((phase / 0.12) * Math.PI);
        eyeSY *= 1 - 0.92 * k;
      }
    }

    rig.inner.scale.set(sxz, sy, sxz);
    rig.inner.rotation.set(tiltX, 0, tiltZ);
    rig.eyeL.scale.set(1, eyeSY, 1);
    rig.eyeR.scale.set(1, eyeSY, 1);
    rig.armL.rotation.set(0, 0, armLz);
    rig.armR.rotation.set(armRx, 0, armRz);

    // Sparkle ribbon: tail curling down-back, swaying; bounce stretches it.
    const stretch = active && action === 'bounce' ? 1 + Math.max(0, Math.sin(t * 9)) * 0.5 : 1;
    for (let i = 0; i < SPARK_COUNT; i++) {
      const f = i / (SPARK_COUNT - 1);
      _dummy.position.set(
        Math.sin(time * 2.6 - i * 0.55) * 0.14 * f - f * 0.12,
        (-0.3 - f * 0.85) * stretch + Math.sin(time * 3.4 - i * 0.7) * 0.07 * f,
        -0.12 - f * 0.75 + Math.cos(time * 2.1 - i * 0.5) * 0.06 * f,
      );
      _dummy.rotation.set(time * 2 + i * 1.3, time * 1.6 + i * 0.9, 0);
      const s = (1 - f * 0.72) * (0.85 + 0.15 * Math.sin(time * 5 - i));
      _dummy.scale.setScalar(Math.max(0.05, s));
      _dummy.updateMatrix();
      rig.sparkles.setMatrixAt(i, _dummy.matrix);
    }
    rig.sparkles.instanceMatrix.needsUpdate = true;
  };

  return {
    get action() {
      return action;
    },
    setAction,
    update,
  };
}
