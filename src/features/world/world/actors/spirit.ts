import * as THREE from 'three';

// Upgraded companion spirit: a glowing cream droplet with a leaf sprout,
// closed happy eyes (^ ^), blush cheeks, and tiny nub arms. Original
// procedural design matching the turnaround refs.
//
// Structure: outer group (feet/center origin, faces +Z) owns userData.velocity
// and the sparkle orbit; `inner` pivot owns bob / squash / tilt so scene
// motion never fights the animator. Emissive toon core + translucent shell +
// additive back-side halo give the glow with no textures or lights.

// Shared 4-step toon ramp (same recipe as wisp/sky: NearestFilter bands).
let rampTex: THREE.DataTexture | null = null;
function spiritRamp(): THREE.DataTexture {
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

const CREAM = 0xfff3cf;
const GLOW_GOLD = 0xffdf9e;
const DARK = 0x4a4438;
const BLUSH_PINK = 0xf0a0a8;
const LEAF_GREEN = 0x74a75e;
const STEM_GREEN = 0x5d8a4a;
const SPARK_COUNT = 10;

// Shared geometries / materials across all spirit instances (modest draws).
let teardropGeo: THREE.LatheGeometry | null = null;
let nubGeo: THREE.CapsuleGeometry | null = null;
let eyeArcGeo: THREE.TorusGeometry | null = null;
let blushGeo: THREE.SphereGeometry | null = null;
let stemGeo: THREE.CylinderGeometry | null = null;
let leafGeo: THREE.SphereGeometry | null = null;
let tailGeo: THREE.ConeGeometry | null = null;
let sparkGeo: THREE.OctahedronGeometry | null = null;

function getTeardrop(): THREE.LatheGeometry {
  if (!teardropGeo) {
    // Rounder, chubbier drop than the base wisp: plump base, soft tip.
    const profile: Array<[number, number]> = [
      [0.001, -0.38],
      [0.17, -0.365],
      [0.28, -0.28],
      [0.345, -0.12],
      [0.35, 0.03],
      [0.315, 0.18],
      [0.25, 0.32],
      [0.175, 0.45],
      [0.1, 0.56],
      [0.04, 0.65],
      [0.001, 0.71],
    ];
    teardropGeo = new THREE.LatheGeometry(
      profile.map(([x, y]) => new THREE.Vector2(x, y)),
      20,
    );
    teardropGeo.computeVertexNormals();
  }
  return teardropGeo;
}

interface SpiritMats {
  core: THREE.MeshToonMaterial;
  shell: THREE.MeshToonMaterial;
  halo: THREE.MeshBasicMaterial;
  arm: THREE.MeshToonMaterial;
  eye: THREE.MeshBasicMaterial;
  blush: THREE.MeshBasicMaterial;
  leaf: THREE.MeshToonMaterial;
  stem: THREE.MeshToonMaterial;
  spark: THREE.MeshBasicMaterial;
}

let mats: SpiritMats | null = null;
function getMats(): SpiritMats {
  if (!mats) {
    mats = {
      core: new THREE.MeshToonMaterial({
        color: CREAM,
        gradientMap: spiritRamp(),
        emissive: GLOW_GOLD,
        emissiveIntensity: 0.55,
      }),
      shell: new THREE.MeshToonMaterial({
        color: CREAM,
        gradientMap: spiritRamp(),
        emissive: GLOW_GOLD,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
      halo: new THREE.MeshBasicMaterial({
        color: 0xffe9b8,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
      arm: new THREE.MeshToonMaterial({
        color: 0xffe9b8,
        gradientMap: spiritRamp(),
        emissive: GLOW_GOLD,
        emissiveIntensity: 0.4,
      }),
      eye: new THREE.MeshBasicMaterial({ color: DARK }),
      blush: new THREE.MeshBasicMaterial({ color: BLUSH_PINK, transparent: true, opacity: 0.85 }),
      leaf: new THREE.MeshToonMaterial({
        color: LEAF_GREEN,
        gradientMap: spiritRamp(),
        emissive: LEAF_GREEN,
        emissiveIntensity: 0.15,
      }),
      stem: new THREE.MeshToonMaterial({
        color: STEM_GREEN,
        gradientMap: spiritRamp(),
      }),
      spark: new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    };
  }
  return mats;
}

function makeNubArm(side: 1 | -1, mat: THREE.Material): THREE.Group {
  if (!nubGeo) nubGeo = new THREE.CapsuleGeometry(0.055, 0.1, 4, 10);
  const pivot = new THREE.Group();
  pivot.name = side < 0 ? 'armL' : 'armR';
  pivot.position.set(side * 0.29, -0.05, 0.03);
  const nub = new THREE.Mesh(nubGeo, mat);
  nub.position.set(side * 0.09, -0.07, 0);
  nub.rotation.z = side * -0.7;
  pivot.add(nub);
  pivot.rotation.z = side * 0.45;
  return pivot;
}

function makeSprout(m: SpiritMats): THREE.Group {
  if (!stemGeo) stemGeo = new THREE.CylinderGeometry(0.022, 0.03, 0.18, 6);
  if (!leafGeo) {
    leafGeo = new THREE.SphereGeometry(0.085, 8, 6);
    leafGeo.scale(1, 0.35, 1.6);
  }
  const sprout = new THREE.Group();
  sprout.name = 'sprout';
  // Lean off the tip so the droplet silhouette stays clean.
  sprout.position.set(0.07, 0.62, 0);
  sprout.rotation.z = -0.28;
  const stem = new THREE.Mesh(stemGeo, m.stem);
  stem.position.y = 0.09;
  const leafL = new THREE.Mesh(leafGeo, m.leaf);
  leafL.name = 'leafL';
  leafL.position.set(-0.09, 0.19, 0);
  leafL.rotation.set(0.1, 0.5, 0.5);
  const leafR = new THREE.Mesh(leafGeo, m.leaf);
  leafR.name = 'leafR';
  leafR.position.set(0.09, 0.22, 0);
  leafR.rotation.set(-0.1, -0.4, -0.45);
  leafR.scale.setScalar(1.15);
  sprout.add(stem, leafL, leafR);
  return sprout;
}

export function createSpirit(): THREE.Group {
  const m = getMats();
  const group = new THREE.Group();
  group.name = 'spirit';
  // External motion writes a velocity here; updateSpirit tilts toward it.
  group.userData.velocity = new THREE.Vector3();

  const inner = new THREE.Group();
  inner.name = 'inner';
  group.add(inner);

  // Emissive core + translucent outer shell + additive halo shell.
  const body = new THREE.Mesh(getTeardrop(), m.core);
  body.name = 'body';
  const shell = new THREE.Mesh(getTeardrop(), m.shell);
  shell.name = 'shell';
  shell.scale.setScalar(1.08);
  const halo = new THREE.Mesh(getTeardrop(), m.halo);
  halo.name = 'halo';
  halo.scale.setScalar(1.26);
  inner.add(body, shell, halo);

  // Closed happy eyes: upward-bulging arcs (upper half of a torus ring).
  if (!eyeArcGeo) {
    const arc = Math.PI * 0.9;
    eyeArcGeo = new THREE.TorusGeometry(0.05, 0.013, 8, 14, arc);
    eyeArcGeo.rotateZ((Math.PI - arc) / 2);
  }
  const eyeL = new THREE.Mesh(eyeArcGeo, m.eye);
  eyeL.name = 'eyeL';
  eyeL.position.set(-0.115, 0.09, 0.3);
  const eyeR = new THREE.Mesh(eyeArcGeo, m.eye);
  eyeR.name = 'eyeR';
  eyeR.position.set(0.115, 0.09, 0.3);
  inner.add(eyeL, eyeR);

  if (!blushGeo) {
    blushGeo = new THREE.SphereGeometry(0.05, 8, 8);
    blushGeo.scale(1, 0.62, 0.4);
  }
  const blushL = new THREE.Mesh(blushGeo, m.blush);
  blushL.name = 'blushL';
  blushL.position.set(-0.2, -0.02, 0.25);
  const blushR = new THREE.Mesh(blushGeo, m.blush);
  blushR.name = 'blushR';
  blushR.position.set(0.2, -0.02, 0.25);
  inner.add(blushL, blushR);

  inner.add(makeNubArm(-1, m.arm), makeNubArm(1, m.arm));
  inner.add(makeSprout(m));

  // Tail nub at the back-bottom (see turnaround side/back views).
  if (!tailGeo) tailGeo = new THREE.ConeGeometry(0.07, 0.14, 8);
  const tail = new THREE.Mesh(tailGeo, m.arm);
  tail.name = 'tail';
  tail.position.set(0, -0.34, -0.24);
  tail.rotation.x = -2.2;
  inner.add(tail);

  // Orbiting sparkles: one instanced draw call, gold fading along the ring.
  if (!sparkGeo) sparkGeo = new THREE.OctahedronGeometry(0.045);
  const sparkles = new THREE.InstancedMesh(sparkGeo, m.spark, SPARK_COUNT);
  sparkles.name = 'sparkles';
  sparkles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sparkles.frustumCulled = false;
  const warm = new THREE.Color(0xffd97a);
  const dark = new THREE.Color(0x3a2200);
  const c = new THREE.Color();
  for (let i = 0; i < SPARK_COUNT; i++) {
    c.copy(warm).lerp(dark, i / (SPARK_COUNT - 1));
    sparkles.setColorAt(i, c);
  }
  if (sparkles.instanceColor) sparkles.instanceColor.needsUpdate = true;
  group.add(sparkles);

  // Lay out the sparkle ring at t=0 so the first frame is already posed.
  updateSpirit(group, 0, 0);
  return group;
}

const _dummy = new THREE.Object3D();

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Idle animation: bob + breathing squash, tilt leaned into userData.velocity,
// arm/sprout sway, eye blink via scale, orbiting sparkles.
// Pure w.r.t. the group (no allocation); never throws on an empty group.
export function updateSpirit(g: THREE.Group, t: number, dt: number): void {
  const time = typeof t === 'number' ? t : 0;
  const step = typeof dt === 'number' ? Math.max(0, dt) : 0.016;

  const inner = g.getObjectByName('inner');
  if (inner) {
    inner.position.y = Math.sin(time * 2.2) * 0.07;
    const breath = Math.sin(time * 2.2);
    inner.scale.set(1 - 0.04 * breath, 1 + 0.05 * breath, 1 - 0.04 * breath);

    // Lean into the travel direction (velocity stored on the outer group).
    const v = (g.userData?.velocity ?? null) as { x?: number; z?: number } | null;
    const vx = typeof v?.x === 'number' ? v.x : 0;
    const vz = typeof v?.z === 'number' ? v.z : 0;
    const targetX = clamp(vz * 0.3, -0.35, 0.35) + Math.sin(time * 1.4) * 0.02;
    const targetZ = clamp(-vx * 0.3, -0.35, 0.35) + Math.sin(time * 1.1) * 0.04;
    const k = Math.min(1, step * 6);
    inner.rotation.x += (targetX - inner.rotation.x) * k;
    inner.rotation.z += (targetZ - inner.rotation.z) * k;
  }

  // Blink: brief happy squeeze every ~3.2s via eye scale.
  const phase = ((time % 3.2) + 3.2) % 3.2;
  let eyeSY = 1;
  if (phase < 0.14) eyeSY = 1 - 0.85 * Math.sin((phase / 0.14) * Math.PI);
  const eyeL = g.getObjectByName('eyeL');
  if (eyeL) eyeL.scale.set(1, eyeSY, 1);
  const eyeR = g.getObjectByName('eyeR');
  if (eyeR) eyeR.scale.set(1, eyeSY, 1);

  // Arm sway (base pose +/- gentle swing).
  const armL = g.getObjectByName('armL');
  if (armL) armL.rotation.z = -0.45 - 0.12 * Math.sin(time * 2.2 + 0.6);
  const armR = g.getObjectByName('armR');
  if (armR) armR.rotation.z = 0.45 + 0.12 * Math.sin(time * 2.2 + 0.6);

  // Sprout wobble.
  const sprout = g.getObjectByName('sprout');
  if (sprout) {
    sprout.rotation.z = -0.28 + Math.sin(time * 2.6) * 0.06;
    sprout.rotation.x = Math.sin(time * 1.9) * 0.05;
  }

  // Sparkle ring orbit (single instanced draw call).
  const sparkles = g.getObjectByName('sparkles') as THREE.InstancedMesh | undefined;
  if (sparkles && (sparkles as THREE.InstancedMesh).isInstancedMesh) {
    for (let i = 0; i < sparkles.count; i++) {
      const f = i / sparkles.count;
      const a = time * 1.6 + f * Math.PI * 2;
      const r = 0.5 + 0.06 * Math.sin(time * 2 + i * 1.7);
      _dummy.position.set(
        Math.cos(a) * r,
        -0.05 + 0.28 * Math.sin(time * 1.3 + i * 0.9) - f * 0.15,
        Math.sin(a) * r * 0.8,
      );
      _dummy.rotation.set(time * 2 + i * 1.3, time * 1.6 + i * 0.9, 0);
      _dummy.scale.setScalar(Math.max(0.05, 1 - f * 0.55));
      _dummy.updateMatrix();
      sparkles.setMatrixAt(i, _dummy.matrix);
    }
    sparkles.instanceMatrix.needsUpdate = true;
  }
}
