import * as THREE from 'three';

// Tree of Life — world-center landmark (~14 units tall).
// Gnarled trunk with a door hollow, pink-gold layered canopy of instanced
// leaf puffs, hanging lanterns with warm emissive glow, and a ring of stone
// steps with glowing runes at the base. Base at y=0, door faces +Z.

export type ToonLike = (color: number) => THREE.MeshToonMaterial;

const defaultToon: ToonLike = (color: number) => new THREE.MeshToonMaterial({ color });

// Local deterministic PRNG (mulberry32) so the model is self-contained.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Faceted toon read: expand to a non-indexed soup, then per-face normals.
function facet(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = geo.index ? geo.toNonIndexed() : geo;
  out.computeVertexNormals();
  return out;
}

// Gnarl: deterministic radial jitter on x/z for bark character.
function gnarl(geo: THREE.BufferGeometry, rand: () => number, amt: number): THREE.BufferGeometry {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) + (rand() - 0.5) * amt);
    pos.setZ(i, pos.getZ(i) + (rand() - 0.5) * amt);
  }
  pos.needsUpdate = true;
  return geo;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);

// All-pink cherry canopy per turnaround ref 04 (warm light comes from lanterns).
const PUFF_PINKS = [0xf2a7c3, 0xef8fb5, 0xf7c1d5, 0xf9d3e3, 0xe98bb0, 0xf7c1d5];

interface PuffSpot {
  x: number;
  y: number;
  z: number;
  s: number;
  color: number;
}

function buildCanopyLayer(
  name: string,
  spots: PuffSpot[],
  puffGeo: THREE.BufferGeometry,
  canopyMat: THREE.MeshToonMaterial,
): THREE.Group {
  const layer = new THREE.Group();
  layer.name = name;
  const mesh = new THREE.InstancedMesh(puffGeo, canopyMat, spots.length);
  mesh.name = `${name}Mesh`;
  spots.forEach((p, i) => {
    _dummy.position.set(p.x, p.y, p.z);
    _dummy.rotation.set(0, i * 2.39996, 0);
    _dummy.scale.setScalar(p.s);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
    _color.setHex(p.color);
    mesh.setColorAt(i, _color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  layer.add(mesh);
  return layer;
}

function ringSpots(
  rand: () => number,
  count: number,
  radius: number,
  y: number,
  size: number,
  paletteOffset: number,
): PuffSpot[] {
  const spots: PuffSpot[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.5;
    const r = radius + (rand() - 0.5) * 0.9;
    spots.push({
      x: Math.cos(a) * r,
      y: y + (rand() - 0.5) * 0.9,
      z: Math.sin(a) * r,
      s: size + (rand() - 0.5) * 0.5,
      color: PUFF_PINKS[(paletteOffset + i) % PUFF_PINKS.length] as number,
    });
  }
  return spots;
}

export function createTreeOfLife(toon: ToonLike = defaultToon): THREE.Group {
  const rand = mulberry32(104);
  const tree = new THREE.Group();
  tree.name = 'treeOfLife';

  const barkMat = toon(0x7a5c42);
  const darkBarkMat = toon(0x5d4636);
  const woodMat = toon(0x8a6238);
  const darkWoodMat = toon(0x2e2018);
  const stoneMat = toon(0x8f8b82);
  const darkStoneMat = toon(0x6e6a62);
  const cordMat = toon(0x4a3a2c);
  const canopyMat = toon(0xffffff);

  // Stone step tiers -------------------------------------------------------
  const steps = new THREE.Group();
  steps.name = 'steps';
  const tierSpecs: Array<[number, number]> = [
    [4.2, 0.125],
    [3.4, 0.375],
    [2.6, 0.625],
  ];
  tierSpecs.forEach(([r, y], i) => {
    const tier = new THREE.Mesh(facet(new THREE.CylinderGeometry(r, r + 0.15, 0.25, 14)), stoneMat);
    tier.name = `stepTier${i}`;
    tier.position.y = y;
    tier.castShadow = true;
    tier.receiveShadow = true;
    steps.add(tier);
  });
  // Scattered flat stones ringing the platform.
  const stoneGeo = facet(new THREE.BoxGeometry(0.7, 0.12, 0.55));
  const stepStones = new THREE.InstancedMesh(stoneGeo, darkStoneMat, 12);
  stepStones.name = 'stepStones';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + rand() * 0.3;
    const r = 4.9 + rand() * 0.5;
    const s = 0.8 + rand() * 0.5;
    _dummy.position.set(Math.cos(a) * r, 0.06 * s, Math.sin(a) * r);
    _dummy.rotation.set(0, rand() * Math.PI, 0);
    _dummy.scale.setScalar(s);
    _dummy.updateMatrix();
    stepStones.setMatrixAt(i, _dummy.matrix);
  }
  stepStones.instanceMatrix.needsUpdate = true;
  stepStones.castShadow = true;
  stepStones.receiveShadow = true;
  steps.add(stepStones);
  tree.add(steps);

  // Glowing runes on the middle tier ---------------------------------------
  const runes = new THREE.Group();
  runes.name = 'runes';
  const slabGeo = facet(new THREE.BoxGeometry(0.42, 0.16, 0.3));
  const glyphGeo = new THREE.OctahedronGeometry(0.1);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const rune = new THREE.Group();
    rune.name = `rune${i}`;
    rune.position.set(Math.cos(a) * 3.0, 0.5, Math.sin(a) * 3.0);
    rune.rotation.y = -a;
    const slab = new THREE.Mesh(slabGeo, darkStoneMat);
    slab.name = 'slab';
    slab.position.y = 0.08;
    slab.castShadow = true;
    const glyphMat = toon(0xffd166);
    glyphMat.emissive = new THREE.Color(0xffb84d);
    glyphMat.emissiveIntensity = 1.0;
    const glyph = new THREE.Mesh(glyphGeo, glyphMat);
    glyph.name = 'glyph';
    glyph.position.y = 0.26;
    glyph.scale.set(1, 0.6, 1);
    rune.add(slab, glyph);
    runes.add(rune);
  }
  tree.add(runes);

  // Gnarled trunk -----------------------------------------------------------
  const trunk = new THREE.Group();
  trunk.name = 'trunk';
  const segSpecs: Array<[number, number, number, number, number]> = [
    // rTop, rBottom, h, centerY, xOffset
    [1.05, 1.5, 2.4, 1.95, 0],
    [0.9, 1.05, 2.2, 4.25, 0.15],
    [0.72, 0.9, 2.2, 6.45, -0.1],
  ];
  segSpecs.forEach(([rTop, rBottom, h, y, x], i) => {
    const geo = facet(gnarl(new THREE.CylinderGeometry(rTop, rBottom, h, 7), rand, 0.16));
    const seg = new THREE.Mesh(geo, i === 1 ? darkBarkMat : barkMat);
    seg.name = `trunkSeg${i}`;
    seg.position.set(x, y, 0);
    seg.rotation.y = i * 0.7;
    seg.castShadow = true;
    seg.receiveShadow = true;
    trunk.add(seg);
  });
  // Root flares gripping the platform.
  const rootGeo = facet(new THREE.ConeGeometry(0.32, 1.7, 6));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rand() * 0.3;
    const root = new THREE.Mesh(rootGeo, darkBarkMat);
    root.name = `root${i}`;
    const dir = new THREE.Vector3(Math.cos(a), -0.5, Math.sin(a)).normalize();
    root.quaternion.setFromUnitVectors(_up, dir);
    root.position.set(Math.cos(a) * 1.3, 1.3, Math.sin(a) * 1.3);
    root.castShadow = true;
    trunk.add(root);
  }
  // Branches reaching into the canopy.
  const branchGeo = facet(new THREE.CylinderGeometry(0.16, 0.3, 2.6, 6));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const branch = new THREE.Mesh(branchGeo, barkMat);
    branch.name = `branch${i}`;
    const dir = new THREE.Vector3(Math.cos(a) * 0.8, 0.75, Math.sin(a) * 0.8).normalize();
    branch.quaternion.setFromUnitVectors(_up, dir);
    branch.position.set(Math.cos(a) * 0.5 - 0.1, 7.0, Math.sin(a) * 0.5);
    branch.position.addScaledVector(dir, 1.1);
    branch.castShadow = true;
    trunk.add(branch);
  }
  tree.add(trunk);

  // Door hollow (faces +Z) --------------------------------------------------
  const door = new THREE.Group();
  door.name = 'door';
  door.position.set(0, 0.75, 1.18);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.7, 0.14), woodMat);
  frame.name = 'doorFrame';
  frame.position.y = 0.85;
  frame.castShadow = true;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.1), darkWoodMat);
  panel.name = 'doorPanel';
  panel.position.set(0, 0.75, 0.05);
  const windowMat = toon(0xffd489);
  windowMat.emissive = new THREE.Color(0xff9a3c);
  windowMat.emissiveIntensity = 1.2;
  const window = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 10), windowMat);
  window.name = 'doorWindow';
  window.rotation.x = Math.PI / 2;
  window.position.set(0, 1.15, 0.12);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), windowMat);
  knob.name = 'doorKnob';
  knob.position.set(0.28, 0.7, 0.12);
  const threshold = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.5), stoneMat);
  threshold.name = 'doorThreshold';
  threshold.position.set(0, 0.07, 0.3);
  threshold.castShadow = true;
  door.add(frame, panel, window, knob, threshold);
  tree.add(door);

  // Layered canopy: instanced leaf puffs ------------------------------------
  const canopy = new THREE.Group();
  canopy.name = 'canopy';
  const puffGeo = facet(new THREE.IcosahedronGeometry(1, 1));
  const layer0 = buildCanopyLayer(
    'canopyLayer0',
    ringSpots(rand, 10, 3.6, 8.6, 1.5, 0),
    puffGeo,
    canopyMat,
  );
  const midSpots: PuffSpot[] = [
    ...ringSpots(rand, 10, 2.8, 10.2, 1.6, 2),
    { x: 0, y: 10.4, z: 0, s: 1.9, color: PUFF_PINKS[3] as number },
  ];
  const layer1 = buildCanopyLayer('canopyLayer1', midSpots, puffGeo, canopyMat);
  const topSpots: PuffSpot[] = [
    ...ringSpots(rand, 6, 1.6, 11.8, 1.4, 4),
    { x: 0, y: 12.4, z: 0, s: 1.7, color: PUFF_PINKS[5] as number },
  ];
  const layer2 = buildCanopyLayer('canopyLayer2', topSpots, puffGeo, canopyMat);
  canopy.add(layer0, layer1, layer2);
  tree.add(canopy);

  // Hanging lanterns ---------------------------------------------------------
  const lanterns = new THREE.Group();
  lanterns.name = 'lanterns';
  const cordGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 5);
  const lanternBodyGeo = new THREE.SphereGeometry(0.22, 10, 8);
  const lanternCapGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.09, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.35;
    const r = 3.1 + (i % 3) * 0.55;
    const cordLen = 1.1 + (i % 3) * 0.4;
    const lantern = new THREE.Group();
    lantern.name = `lantern${i}`;
    lantern.position.set(Math.cos(a) * r, 7.4, Math.sin(a) * r);
    lantern.userData.phase = i * 0.9;
    const cord = new THREE.Mesh(cordGeo, cordMat);
    cord.name = 'cord';
    cord.scale.y = cordLen;
    cord.position.y = -cordLen / 2;
    const bodyMat = toon(0xffc98a);
    bodyMat.emissive = new THREE.Color(0xff9a3c);
    bodyMat.emissiveIntensity = 1.2;
    const body = new THREE.Mesh(lanternBodyGeo, bodyMat);
    body.name = 'body';
    body.scale.set(1, 1.25, 1);
    body.position.y = -cordLen - 0.3;
    const cap = new THREE.Mesh(lanternCapGeo, cordMat);
    cap.name = 'cap';
    cap.position.y = -cordLen - 0.04;
    lantern.add(cord, body, cap);
    lanterns.add(lantern);
  }
  tree.add(lanterns);

  return tree;
}

// Idle animation: canopy layers sway, lanterns flicker + sway, runes pulse.
// Pure function of (g, t); never throws on an empty or partial group.
export function updateTreeOfLife(g: THREE.Group, t: number, _dt: number): void {
  if (!g || typeof g.getObjectByName !== 'function') return;

  for (let i = 0; i < 3; i++) {
    const layer = g.getObjectByName(`canopyLayer${i}`);
    if (!layer) continue;
    layer.rotation.z = Math.sin(t * 0.6 + i * 2.1) * 0.02;
    layer.rotation.x = Math.cos(t * 0.45 + i * 1.3) * 0.016;
    layer.rotation.y = Math.sin(t * 0.23 + i * 1.7) * 0.03;
  }

  const lanterns = g.getObjectByName('lanterns');
  if (lanterns) {
    for (const child of lanterns.children) {
      const phase = (child.userData.phase as number | undefined) ?? 0;
      child.rotation.x = Math.sin(t * 0.9 + phase) * 0.06;
      child.rotation.z = Math.cos(t * 0.7 + phase) * 0.06;
      const body = child.getObjectByName('body');
      const mat = (body as THREE.Mesh | undefined)?.material as
        | THREE.MeshToonMaterial
        | undefined;
      if (mat && typeof mat.emissiveIntensity === 'number') {
        mat.emissiveIntensity =
          1.15 + Math.sin(t * 7 + phase) * 0.22 + Math.sin(t * 13.7 + phase * 1.7) * 0.08;
      }
    }
  }

  const runes = g.getObjectByName('runes');
  if (runes) {
    runes.children.forEach((child, i) => {
      const glyph = child.getObjectByName('glyph');
      const mat = (glyph as THREE.Mesh | undefined)?.material as
        | THREE.MeshToonMaterial
        | undefined;
      if (mat && typeof mat.emissiveIntensity === 'number') {
        mat.emissiveIntensity = 0.95 + Math.sin(t * 2 + i * 0.8) * 0.35;
      }
    });
  }
}
