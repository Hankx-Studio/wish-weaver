import * as THREE from 'three';
import { mulberry32 } from '@/lib/effects/types';
import { makeSoftDotTexture } from '../particles';
import type { ToonFactory } from './sky';

// Shared helpers -----------------------------------------------------------
// NOTE: the scene passes a color-only `toon` adapter, so material extras
// (flatShading, map) are applied post-hoc, never via the factory's 2nd arg.

// MeshToonMaterial has no flatShading flag, so facets come from the
// geometry: expand to a non-indexed soup, then per-face normals.
function facet(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = geo.index ? geo.toNonIndexed() : geo;
  out.computeVertexNormals();
  return out;
}

function shadowed(root: THREE.Object3D): void {
  root.traverse((o: THREE.Object3D) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function setInstance(
  mesh: THREE.InstancedMesh,
  i: number,
  x: number,
  y: number,
  z: number,
  opts: { ry?: number; rz?: number; s?: number; sy?: number; color?: number } = {},
): void {
  _dummy.position.set(x, y, z);
  _dummy.rotation.set(0, opts.ry ?? 0, opts.rz ?? 0);
  _dummy.scale.set(opts.s ?? 1, opts.sy ?? opts.s ?? 1, opts.s ?? 1);
  _dummy.updateMatrix();
  mesh.setMatrixAt(i, _dummy.matrix);
  if (opts.color !== undefined) {
    _color.setHex(opts.color);
    mesh.setColorAt(i, _color);
  }
}

function finishInstances(mesh: THREE.InstancedMesh, shadows = true): void {
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
}

// Stone arch landmark --------------------------------------------------------
// Restyle: weathered stone posts + gently upswept beam (original design),
// moss patches and a dark tile cap rail for the Japanese-fantasy read.

export function buildArch(scene: THREE.Scene, toon: ToonFactory): void {
  const rand = mulberry32(41);
  const stone = toon(0x9a938a);
  const darkTile = toon(0x4a4640);
  const moss = toon(0x6f9a5a);
  const arch = new THREE.Group();

  const pillarGeo = facet(new THREE.CylinderGeometry(0.9, 1.15, 5.4, 7));
  const slabGeo = new THREE.BoxGeometry(2.6, 0.6, 2.6);
  const capGeo = new THREE.BoxGeometry(2.2, 0.5, 2.2);
  for (const sx of [-4, 4]) {
    const slab = new THREE.Mesh(slabGeo, stone);
    slab.position.set(sx, 0.3, 0);
    const pillar = new THREE.Mesh(pillarGeo, stone);
    pillar.position.set(sx, 3.0, 0);
    pillar.rotation.y = rand() * Math.PI;
    const cap = new THREE.Mesh(capGeo, stone);
    cap.position.set(sx, 5.9, 0);
    arch.add(slab, pillar, cap);
  }

  // Beam: flat center + tilted upswept ends, with a thin dark cap rail.
  const beamCenter = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.9, 1.6), stone);
  beamCenter.position.y = 6.6;
  const railCenter = new THREE.Mesh(new THREE.BoxGeometry(10.9, 0.22, 1.9), darkTile);
  railCenter.position.y = 7.15;
  arch.add(beamCenter, railCenter);
  const endGeo = new THREE.BoxGeometry(2.8, 0.8, 1.5);
  const railEndGeo = new THREE.BoxGeometry(3.0, 0.2, 1.8);
  for (const s of [-1, 1]) {
    const end = new THREE.Mesh(endGeo, stone);
    end.position.set(s * 6.2, 6.95, 0);
    end.rotation.z = s * 0.18;
    const rail = new THREE.Mesh(railEndGeo, darkTile);
    rail.position.set(s * 6.25, 7.42, 0);
    rail.rotation.z = s * 0.18;
    arch.add(end, rail);
  }

  // Moss patches clinging to pillars and beam.
  const mossGeo = facet(new THREE.IcosahedronGeometry(0.45, 0));
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(mossGeo, moss);
    const onBeam = i >= 3;
    if (onBeam) {
      m.position.set((rand() - 0.5) * 8, 7.1, (rand() - 0.5) * 1.2);
    } else {
      const sx = i % 2 === 0 ? -4 : 4;
      m.position.set(sx + (rand() - 0.5) * 1.6, 1 + rand() * 4, (rand() - 0.5) * 1.6);
    }
    m.scale.set(1 + rand() * 0.6, 0.45, 1 + rand() * 0.6);
    m.rotation.y = rand() * Math.PI;
    arch.add(m);
  }

  arch.position.set(18, 0, -30);
  arch.rotation.y = 0.5;
  shadowed(arch);
  scene.add(arch);
}

// Trees ----------------------------------------------------------------------
// Restyle: instanced trunks + faceted canopy puffs; one hero blossom tree
// (pink canopy) with a fallen-petal ring. Same 5 green spots as before.

const TREE_SPOTS: Array<[number, number]> = [
  [-24, -6],
  [26, 10],
  [-8, -34],
  [34, -22],
  [-34, 20],
];
// South-east of spawn: was (-7,15), where its crown blocked the spawn camera.
const BLOSSOM_SPOT: [number, number] = [20, 16];
const LEAF_GREENS = [0x74a75e, 0x86b968, 0x67995a];
const BLOSSOM_PINKS = [0xf2a7c3, 0xef8fb5, 0xf7c1d5];

export function buildTrees(scene: THREE.Scene, toon: ToonFactory): void {
  const rand = mulberry32(53);
  const trunkMat = toon(0xffffff);
  const canopyMat = toon(0xffffff);

  interface Puff {
    x: number;
    y: number;
    z: number;
    s: number;
    color: number;
  }
  const puffs: Puff[] = [];
  const trunks: Array<{ x: number; z: number; s: number; tilt: number; color: number }> = [];

  TREE_SPOTS.forEach(([x, z], t) => {
    const s = 0.9 + rand() * 0.5;
    trunks.push({ x, z, s, tilt: (rand() - 0.5) * 0.08, color: 0x7a5c42 });
    const count = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
      puffs.push({
        x: x + (rand() - 0.5) * 2.4 * s,
        y: (3 + rand() * 1.6) * s,
        z: z + (rand() - 0.5) * 2.4 * s,
        s: (0.9 + rand() * 0.6) * s,
        color: LEAF_GREENS[(t + i) % LEAF_GREENS.length]!,
      });
    }
  });

  // Hero blossom tree: darker trunk, fuller pink crown.
  const [bx, bz] = BLOSSOM_SPOT;
  trunks.push({ x: bx, z: bz, s: 1.35, tilt: 0.07, color: 0x5d4636 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rand() * 0.6;
    const r = i === 0 ? 0 : 1.4 + rand() * 0.8;
    puffs.push({
      x: bx + Math.cos(a) * r,
      y: 4.4 + rand() * 1.6 - (i === 0 ? 0.6 : 0),
      z: bz + Math.sin(a) * r,
      s: 1.15 + rand() * 0.55,
      color: BLOSSOM_PINKS[i % BLOSSOM_PINKS.length]!,
    });
  }

  const trunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.35, 0.55, 2.6, 6),
    trunkMat,
    trunks.length,
  );
  trunks.forEach((t, i) => {
    setInstance(trunkMesh, i, t.x, 1.3 * t.s, t.z, { ry: i * 1.7, rz: t.tilt, s: t.s, color: t.color });
  });
  finishInstances(trunkMesh);

  const canopyMesh = new THREE.InstancedMesh(
    facet(new THREE.IcosahedronGeometry(1.55, 1)),
    canopyMat,
    puffs.length,
  );
  puffs.forEach((p, i) => {
    setInstance(canopyMesh, i, p.x, p.y, p.z, { ry: i * 2.3, s: p.s, color: p.color });
  });
  finishInstances(canopyMesh);

  // Fallen petals ringing the blossom tree.
  const petalGeo = new THREE.CircleGeometry(0.09, 5);
  petalGeo.rotateX(-Math.PI / 2);
  const petalMesh = new THREE.InstancedMesh(petalGeo, toon(0xffffff), 40);
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2;
    const d = 1 + Math.sqrt(rand()) * 3.4;
    setInstance(petalMesh, i, bx + Math.cos(a) * d, 0.03, bz + Math.sin(a) * d, {
      ry: rand() * Math.PI,
      s: 0.7 + rand() * 0.7,
      color: i % 3 === 2 ? 0xffffff : BLOSSOM_PINKS[i % BLOSSOM_PINKS.length]!,
    });
  }
  finishInstances(petalMesh, false);
  petalMesh.castShadow = false;

  scene.add(trunkMesh, canopyMesh, petalMesh);
}

// Market stall (future shop) ---------------------------------------------------
// Wooden stall with a striped canvas awning, crates, produce and a woven mat.
// Original procedural design; stripes are a generated CanvasTexture.

function makeAwningTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#f3e6c8' : '#c1503c';
    ctx.fillRect((i * c.width) / stripes, 0, c.width / stripes + 1, c.height);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function buildMarketStall(scene: THREE.Scene, toon: ToonFactory): void {
  const wood = toon(0x8a6238);
  const darkWood = toon(0x6b4a2c);
  const stall = new THREE.Group();

  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.2), wood);
  counter.position.y = 0.5;
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.12, 1.5), darkWood);
  counterTop.position.y = 1.06;
  stall.add(counter, counterTop);

  const postGeo = new THREE.BoxGeometry(0.18, 2.6, 0.18);
  for (const [px, pz] of [[-1.55, -0.65], [1.55, -0.65], [-1.55, 0.65], [1.55, 0.65]]) {
    const post = new THREE.Mesh(postGeo, darkWood);
    post.position.set(px, 1.3, pz);
    stall.add(post);
  }

  // Striped awning, tilted forward, with a front valance.
  const awningMat = toon(0xffffff);
  awningMat.map = makeAwningTexture();
  awningMat.needsUpdate = true;
  const awning = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.08, 2.2), awningMat);
  awning.position.set(0, 2.8, 0.1);
  awning.rotation.x = -0.16;
  const valance = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.34, 0.06), awningMat);
  valance.position.set(0, 2.55, 1.2);
  stall.add(awning, valance);

  // Crates + produce beside the counter.
  const crateGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const crateRimGeo = new THREE.BoxGeometry(0.98, 0.1, 0.98);
  const crateSpots: Array<[number, number, number, number]> = [
    [2.5, 0.45, 0.2, 0.15],
    [2.45, 1.35, 0.25, -0.1],
    [-2.5, 0.45, -0.1, 0.4],
  ];
  for (const [cx, cy, cz, ry] of crateSpots) {
    const crate = new THREE.Mesh(crateGeo, wood);
    crate.position.set(cx, cy, cz);
    crate.rotation.y = ry;
    const rim = new THREE.Mesh(crateRimGeo, darkWood);
    rim.position.set(cx, cy + 0.42, cz);
    rim.rotation.y = ry;
    stall.add(crate, rim);
  }
  const produceGeo = new THREE.SphereGeometry(0.14, 6, 5);
  const produceMats = [toon(0xd95f4b), toon(0xe8a13c), toon(0xc74a3a)];
  const produceRand = mulberry32(7);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(produceGeo, produceMats[i % produceMats.length]!);
    p.position.set(-2.5 + (produceRand() - 0.5) * 0.55, 0.98, -0.1 + (produceRand() - 0.5) * 0.55);
    stall.add(p);
  }

  // Woven mat at the front.
  const mat = new THREE.Mesh(new THREE.CircleGeometry(1.2, 12), toon(0xb98a4e));
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0, 0.02, 2.4);
  stall.add(mat);

  stall.position.set(9, 0, 9);
  stall.rotation.y = -Math.PI * 0.75; // face the spawn clearing
  shadowed(stall);
  scene.add(stall);
}

// Stone lanterns -----------------------------------------------------------------
// Three original-design stone lanterns (tōrō-inspired) marking the path
// toward the arch, each with a warm additive glow sprite. No real lights.

const LANTERN_SPOTS: Array<[number, number, number]> = [
  [4, -2, 0.3],
  [7, -13, 1.2],
  [13, -21, 2.1],
];

function makeLantern(toon: ToonFactory, glowTex: THREE.Texture): THREE.Group {
  const stone = toon(0x8f8b82);
  const lantern = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.7), stone);
  base.position.y = 0.125;
  const shaft = new THREE.Mesh(facet(new THREE.CylinderGeometry(0.16, 0.2, 0.9, 6)), stone);
  shaft.position.y = 0.7;
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.6), stone);
  sill.position.y = 1.2;
  lantern.add(base, shaft, sill);

  // Warm light-box core between two stone slabs.
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.4, 0.44),
    new THREE.MeshBasicMaterial({ color: 0xffd489 }),
  );
  core.position.y = 1.46;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.58), stone);
  lid.position.y = 1.7;
  lantern.add(core, lid);

  const cap = new THREE.Mesh(facet(new THREE.ConeGeometry(0.55, 0.4, 4)), stone);
  cap.position.y = 1.95;
  cap.rotation.y = Math.PI / 4;
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), stone);
  jewel.position.y = 2.2;
  lantern.add(cap, jewel);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffbe78,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.position.y = 1.46;
  glow.scale.set(2.2, 2.2, 1);
  lantern.add(glow);

  shadowed(lantern);
  glow.castShadow = false;
  glow.receiveShadow = false;
  return lantern;
}

export function buildStoneLanterns(scene: THREE.Scene, toon: ToonFactory): void {
  const glowTex = makeSoftDotTexture();
  for (const [x, z, ry] of LANTERN_SPOTS) {
    const lantern = makeLantern(toon, glowTex);
    lantern.position.set(x, 0, z);
    lantern.rotation.y = ry;
    scene.add(lantern);
  }
}
