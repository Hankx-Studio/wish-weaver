import * as THREE from 'three';
import { mulberry32 } from '@/lib/effects/types';
import { STONES, WORLD3D } from '../physics';
import type { ToonFactory } from './sky';

export interface ScatterSpot {
  x: number;
  z: number;
  s: number;
  r: number;
}

export function scatterOnDisc(count: number, radius: number, seed: number): ScatterSpot[] {
  const rand = mulberry32(seed);
  const out: ScatterSpot[] = [];
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * radius;
    out.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.7 + rand() * 0.7, r: rand() * Math.PI * 2 });
  }
  return out;
}

// --- Meadow layout landmarks (module-private) -------------------------------
// Pond sits in open grass south-west of spawn; the dirt path curves from
// spawn toward the stone arch. Scatter keeps clear of both.
const POND = { x: -8, z: 24, r: 6 };
const PATH_HALF_WIDTH = 1.35;
const PATH_CLEARANCE = 1.9;

function dirtPathCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 9),
    new THREE.Vector3(3, 0, -1),
    new THREE.Vector3(8, 0, -11),
    new THREE.Vector3(13, 0, -20),
    new THREE.Vector3(17, 0, -28),
  ]);
}

let pathSamples: THREE.Vector3[] | null = null;
function getPathSamples(): THREE.Vector3[] {
  if (!pathSamples) pathSamples = dirtPathCurve().getSpacedPoints(48);
  return pathSamples;
}

function distToPath(x: number, z: number): number {
  let best = Infinity;
  for (const p of getPathSamples()) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < best) best = d;
  }
  return best;
}

function isClearSpot(x: number, z: number): boolean {
  if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.2) return false;
  if (distToPath(x, z) < PATH_CLEARANCE) return false;
  return true;
}

// Deterministic scatter that avoids the pond and the dirt path.
function scatterOnDiscClear(count: number, radius: number, seed: number): ScatterSpot[] {
  const rand = mulberry32(seed);
  const out: ScatterSpot[] = [];
  const fallback: ScatterSpot[] = [];
  for (let i = 0; i < count * 8 && out.length < count; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * radius;
    const spot = {
      x: Math.cos(a) * d,
      z: Math.sin(a) * d,
      s: 0.7 + rand() * 0.7,
      r: rand() * Math.PI * 2,
    };
    if (isClearSpot(spot.x, spot.z)) out.push(spot);
    else if (fallback.length < count) fallback.push(spot);
  }
  while (out.length < count && fallback.length > 0) out.push(fallback.pop()!);
  return out;
}

export function buildGround(scene: THREE.Scene): void {
  buildMeadowDisc(scene);
  buildDirtPath(scene);
  buildPond(scene);
}

function buildMeadowDisc(scene: THREE.Scene): void {
  const geo = new THREE.CircleGeometry(WORLD3D.radius + 8, 72);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(0x7fa35a);
  const sunlit = new THREE.Color(0xa9c46b);
  const shade = new THREE.Color(0x5e8a4e);
  const dry = new THREE.Color(0xb5a86b);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Sunlit drifts (warm, toward the sun side) layered over cool shade pools.
    const sun =
      0.5 + 0.5 * Math.sin(x * 0.11 + 1.7) * Math.cos(z * 0.13 - 0.6);
    const pools =
      0.5 + 0.5 * Math.sin(x * 0.05 - 0.4 + Math.sin(z * 0.07)) * Math.cos(z * 0.06 + 1.1);
    const parched =
      0.5 + 0.5 * Math.sin(x * 0.21 + 0.3) * Math.sin(z * 0.19 + 2.2);
    c.copy(base).lerp(sunlit, sun * 0.75);
    if (pools > 0.62) c.lerp(shade, (pools - 0.62) * 1.4);
    if (parched > 0.86) c.lerp(dry, (parched - 0.86) * 2.2);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
  );
  ground.receiveShadow = true;
  scene.add(ground);
}

// Flat ribbon following the dirt curve, edges melting into the grass color.
function buildDirtPath(scene: THREE.Scene): void {
  const curve = dirtPathCurve();
  const SEGMENTS = 44;
  const ACROSS = 5;
  const dirt = new THREE.Color(0xc49a66);
  const dirtDark = new THREE.Color(0xa87f52);
  const grassEdge = new THREE.Color(0x7fa35a);
  const positions = new Float32Array((SEGMENTS + 1) * ACROSS * 3);
  const colors = new Float32Array((SEGMENTS + 1) * ACROSS * 3);
  const c = new THREE.Color();
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    curve.getPointAt(t, p);
    curve.getTangentAt(t, tan);
    const nx = -tan.z;
    const nz = tan.x;
    const half = PATH_HALF_WIDTH - 0.3 * t;
    for (let j = 0; j < ACROSS; j++) {
      const f = (j / (ACROSS - 1)) * 2 - 1; // -1..1 across
      const k = (i * ACROSS + j) * 3;
      positions[k] = p.x + nx * f * half;
      positions[k + 1] = 0.03;
      positions[k + 2] = p.z + nz * f * half;
      const edge = THREE.MathUtils.smoothstep(Math.abs(f), 0.55, 1);
      const wear = 0.5 + 0.5 * Math.sin(t * 31 + f * 2.4);
      c.copy(dirt).lerp(dirtDark, wear * 0.35).lerp(grassEdge, edge);
      colors[k] = c.r;
      colors[k + 1] = c.g;
      colors[k + 2] = c.b;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    for (let j = 0; j < ACROSS - 1; j++) {
      const a = i * ACROSS + j;
      const b = a + 1;
      const d = a + ACROSS;
      const e = d + 1;
      index.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const path = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
  );
  path.receiveShadow = true;
  scene.add(path);
}

// Sandy rim + teal disc + additive glint ring; opacity shimmer is driven by
// onBeforeRender so no per-frame wiring is needed from the scene orchestrator.
function buildPond(scene: THREE.Scene): void {
  const rim = new THREE.Mesh(
    new THREE.CircleGeometry(POND.r + 0.9, 40).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xd9c28f, roughness: 1, metalness: 0 }),
  );
  rim.position.set(POND.x, 0.02, POND.z);
  rim.receiveShadow = true;

  const waterGeo = new THREE.CircleGeometry(POND.r, 44);
  waterGeo.rotateX(-Math.PI / 2);
  const pos = waterGeo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const deep = new THREE.Color(0x3e8fa8);
  const shallow = new THREE.Color(0x7fd4d4);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const d = Math.hypot(pos.getX(i), pos.getZ(i)) / POND.r;
    c.copy(deep).lerp(shallow, THREE.MathUtils.smoothstep(d, 0.15, 1));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  waterGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const waterMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.84,
    roughness: 0.3,
    metalness: 0,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(POND.x, 0.05, POND.z);

  const glintMat = new THREE.MeshBasicMaterial({
    color: 0xeafcff,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glint = new THREE.Mesh(new THREE.RingGeometry(POND.r * 0.35, POND.r * 0.62, 40).rotateX(-Math.PI / 2), glintMat);
  glint.position.set(POND.x, 0.07, POND.z);

  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    // No allocations per frame: closed-over materials only.
    water.onBeforeRender = () => {
      const t = performance.now() * 0.001;
      waterMat.opacity = 0.8 + Math.sin(t * 1.7) * 0.07 + Math.sin(t * 3.1 + 1.3) * 0.03;
      glintMat.opacity = 0.22 + Math.sin(t * 2.3 + 2.1) * 0.1;
    };
  }
  scene.add(rim, water, glint);
}

export function buildGrass(scene: THREE.Scene, toon: ToonFactory): void {
  const geo = new THREE.ConeGeometry(0.13, 0.38, 5);
  const mat = toon(0xffffff);
  const spots = scatterOnDiscClear(900, 52, 11);
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  spots.forEach((p, i) => {
    dummy.position.set(p.x, 0.17 * p.s, p.z);
    dummy.rotation.set(0, p.r, 0);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.setHex(0x7fa85c).offsetHSL((p.r % 1) * 0.02 - 0.01, 0, (p.s - 1) * 0.1);
    mesh.setColorAt(i, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);

  // Low clover tufts: one extra instanced draw call, darker than the grass.
  const cloverGeo = new THREE.IcosahedronGeometry(0.11, 0);
  cloverGeo.scale(1, 0.55, 1);
  const cloverMat = toon(0xffffff);
  const clover = scatterOnDiscClear(220, 50, 83);
  const cloverMesh = new THREE.InstancedMesh(cloverGeo, cloverMat, clover.length);
  clover.forEach((p, i) => {
    dummy.position.set(p.x, 0.06 * p.s, p.z);
    dummy.rotation.set(0, p.r, 0);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    cloverMesh.setMatrixAt(i, dummy.matrix);
    color.setHex(0x4e7d43).offsetHSL(0, 0, (p.s - 1) * 0.12);
    cloverMesh.setColorAt(i, color);
  });
  cloverMesh.instanceMatrix.needsUpdate = true;
  if (cloverMesh.instanceColor) cloverMesh.instanceColor.needsUpdate = true;
  scene.add(cloverMesh);
}

export function buildFlowers(
  scene: THREE.Scene,
  toon: ToonFactory,
  gradientMap: THREE.DataTexture,
): void {
  const spots = scatterOnDiscClear(150, 50, 29);
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 5);
  const stemMat = toon(0x4f7d46);
  const stems = new THREE.InstancedMesh(stemGeo, stemMat, spots.length);
  const headGeo = new THREE.IcosahedronGeometry(0.13, 0);
  const headMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap,
    emissive: 0x554422,
    emissiveIntensity: 0.7,
  });
  const heads = new THREE.InstancedMesh(headGeo, headMat, spots.length);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const palette = [0xffb3d9, 0x9ad9ff, 0xffd97a];
  spots.forEach((p, i) => {
    dummy.position.set(p.x, 0.25 * p.s, p.z);
    dummy.rotation.set(0, p.r, 0);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 0.52 * p.s;
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    color.setHex(palette[i % palette.length]!);
    heads.setColorAt(i, color);
  });
  stems.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  scene.add(stems, heads);
}

export function buildStones(scene: THREE.Scene, toon: ToonFactory): void {
  const rockMat = toon(0x8d8a80);
  const mossMat = toon(0x6f9a52);
  // Restyled stepping stones: tapered rock with a mossy cap. Tops stay
  // exactly on the physics heights (st.y) so collision is unchanged.
  for (const [i, st] of STONES.entries()) {
    const stone = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.CylinderGeometry(st.r * 0.92, st.r * 1.22, 1.7, 7), rockMat);
    rock.position.y = st.y - 0.85;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(st.r * 0.94, st.r * 0.99, 0.2, 7), mossMat);
    cap.position.y = st.y - 0.1;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(st.r * 1.22, st.r * 1.38, 0.35, 7), rockMat);
    skirt.position.y = st.y - 1.75;
    stone.add(rock, cap, skirt);
    stone.position.set(st.x, 0, st.z);
    stone.rotation.y = i * 0.7;
    stone.traverse((o: THREE.Object3D) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(stone);
  }

  // Pebble scatter: one instanced draw call of small faceted stones.
  const pebGeo = new THREE.DodecahedronGeometry(0.14, 0);
  pebGeo.scale(1, 0.6, 1);
  const pebMat = toon(0xffffff);
  const spots = scatterOnDiscClear(130, 50, 77);
  const pebbles = new THREE.InstancedMesh(pebGeo, pebMat, spots.length);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  spots.forEach((p, i) => {
    dummy.position.set(p.x, 0.07 * p.s, p.z);
    dummy.rotation.set(0, p.r, 0);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
    color.setHex(0x9a958a).offsetHSL(0.02 * (p.r % 1), 0, (p.s - 1) * 0.12);
    pebbles.setColorAt(i, color);
  });
  pebbles.instanceMatrix.needsUpdate = true;
  if (pebbles.instanceColor) pebbles.instanceColor.needsUpdate = true;
  pebbles.receiveShadow = true;
  scene.add(pebbles);
}
