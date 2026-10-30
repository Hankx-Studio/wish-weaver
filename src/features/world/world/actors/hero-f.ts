import * as THREE from 'three';

// Hooded female traveler (~1.7 tall, feet origin, faces +Z).
// Matches visual-plan/refs/turnarounds/02-hero-female.jpg: cream short hood
// with a flower pin, teal scarf with a 3-segment front tail + fringe, cream
// lathe-turned dress with hem embroidery, belt + hip satchel with strap,
// ponytail, cuffed lace boots, gentle face with expressive eyes.
//
// Rig contract (scene.ts buildHeroRig depends on it): named Groups
// hips/legL/legR/torso/head/armL/armR/scarf0/scarf1/scarf2 plus eyeL/eyeR
// Meshes; feet origin; faces +Z. Idle motion always runs; when
// `group.userData.phase` is a finite number a walk cycle layers on top.

export type HeroFToon = (color: number) => THREE.MeshToonMaterial;

const defaultToon: HeroFToon = (color: number): THREE.MeshToonMaterial =>
  new THREE.MeshToonMaterial({ color });

// ---------------------------------------------------------------------------
// Module-shared geometries (one instance reused by every hero build).
// ---------------------------------------------------------------------------

const pelvisGeo = new THREE.BoxGeometry(0.32, 0.2, 0.22);
const tightsGeo = new THREE.CapsuleGeometry(0.085, 0.16, 4, 10);
const bootGeo = new THREE.CylinderGeometry(0.09, 0.095, 0.24, 10);
const cuffGeo = new THREE.TorusGeometry(0.09, 0.03, 6, 12);
const footGeo = new THREE.BoxGeometry(0.16, 0.12, 0.26);
const soleGeo = new THREE.BoxGeometry(0.17, 0.045, 0.29);
const toeGeo = new THREE.SphereGeometry(0.07, 10, 8);
const laceGeo = new THREE.BoxGeometry(0.05, 0.16, 0.02);

const bodiceGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.34, 12);
const dressGeo = new THREE.LatheGeometry(
  [
    new THREE.Vector2(0.2, 0.2),
    new THREE.Vector2(0.235, 0.1),
    new THREE.Vector2(0.28, 0.0),
    new THREE.Vector2(0.33, -0.12),
    new THREE.Vector2(0.365, -0.22),
  ],
  16,
);
const hemGeo = new THREE.TorusGeometry(0.36, 0.024, 6, 20);
const hemFlowerGeo = new THREE.SphereGeometry(0.026, 8, 6);
const hemDotGeo = new THREE.SphereGeometry(0.011, 6, 6);
const beltGeo = new THREE.TorusGeometry(0.245, 0.038, 8, 16);
const buckleGeo = new THREE.BoxGeometry(0.07, 0.06, 0.03);
const bellGeo = new THREE.SphereGeometry(0.026, 8, 6);
const cloakGeo = new THREE.ConeGeometry(0.46, 0.86, 14);
const capeletGeo = new THREE.ConeGeometry(0.33, 0.3, 12);
const scarfWrapGeo = new THREE.TorusGeometry(0.15, 0.058, 8, 16);
const scarfWrap2Geo = new THREE.TorusGeometry(0.125, 0.042, 8, 14);
const tailGeo0 = new THREE.BoxGeometry(0.14, 0.15, 0.05);
const tailGeo1 = new THREE.BoxGeometry(0.13, 0.15, 0.05);
const tailGeo2 = new THREE.BoxGeometry(0.12, 0.14, 0.05);
const fringeStrandGeo = new THREE.BoxGeometry(0.017, 0.055, 0.02);

const pouchGeo = new THREE.BoxGeometry(0.15, 0.18, 0.1);
const flapGeo = new THREE.BoxGeometry(0.16, 0.07, 0.11);
const claspGeo = new THREE.BoxGeometry(0.04, 0.05, 0.02);
const strapGeo = new THREE.BoxGeometry(0.05, 0.24, 0.025);

const sleeveGeo = new THREE.CapsuleGeometry(0.08, 0.1, 4, 10);
const ruffleGeo = new THREE.TorusGeometry(0.072, 0.022, 6, 12);
const handGeo = new THREE.SphereGeometry(0.07, 10, 8);

const faceGeo = new THREE.SphereGeometry(0.195, 18, 14);
const hoodGeo = new THREE.SphereGeometry(0.235, 18, 14);
const hoodRimGeo = new THREE.TorusGeometry(0.18, 0.038, 8, 18);
const hairGeo = new THREE.SphereGeometry(0.2, 14, 12);
const hairFringeGeo = new THREE.SphereGeometry(0.05, 8, 8);
const ponytailGeo = new THREE.CapsuleGeometry(0.062, 0.15, 4, 8);
const ponytailTipGeo = new THREE.SphereGeometry(0.055, 8, 8);
const hairTieGeo = new THREE.TorusGeometry(0.055, 0.018, 6, 10);

const petalGeo = new THREE.SphereGeometry(0.032, 8, 6);
const flowerHeartGeo = new THREE.SphereGeometry(0.022, 8, 6);
const flowerLeafGeo = new THREE.SphereGeometry(0.028, 8, 6);

const eyeWhiteGeo = new THREE.SphereGeometry(0.037, 12, 10);
const irisGeo = new THREE.SphereGeometry(0.021, 10, 8);
const pupilGeo = new THREE.SphereGeometry(0.0095, 8, 6);
const sparkGeo = new THREE.SphereGeometry(0.0075, 6, 6);
const blushGeo = new THREE.SphereGeometry(0.028, 8, 6);
const smileGeo = new THREE.TorusGeometry(0.032, 0.008, 6, 12, Math.PI * 0.7);
const browGeo = new THREE.CapsuleGeometry(0.008, 0.05, 3, 6);

// ---------------------------------------------------------------------------
// Materials: one cached set per toon factory; basic mats shared globally.
// ---------------------------------------------------------------------------

interface HeroFMats {
  cream: THREE.MeshToonMaterial;
  dress: THREE.MeshToonMaterial;
  scarf: THREE.MeshToonMaterial;
  scarfDark: THREE.MeshToonMaterial;
  leather: THREE.MeshToonMaterial;
  darkLeather: THREE.MeshToonMaterial;
  skin: THREE.MeshToonMaterial;
  hair: THREE.MeshToonMaterial;
  gold: THREE.MeshToonMaterial;
  petal: THREE.MeshToonMaterial;
  leaf: THREE.MeshToonMaterial;
  blush: THREE.MeshToonMaterial;
  eyeWhite: THREE.MeshToonMaterial;
  iris: THREE.MeshToonMaterial;
}

const matCache = new WeakMap<HeroFToon, HeroFMats>();

function matsFor(toon: HeroFToon): HeroFMats {
  let m = matCache.get(toon);
  if (!m) {
    m = {
      cream: toon(0xece0c8),
      dress: toon(0xe4d6bc),
      scarf: toon(0x4d8a84),
      scarfDark: toon(0x3d726d),
      leather: toon(0x7a5238),
      darkLeather: toon(0x5d3f2c),
      skin: toon(0xf2c19b),
      hair: toon(0xd9b06a),
      gold: toon(0xc9a24a),
      petal: toon(0x5fa3b8),
      leaf: toon(0x6f9a5a),
      blush: toon(0xf0a08a),
      eyeWhite: toon(0xfdfbf4),
      iris: toon(0x1e7a8c),
    };
    matCache.set(toon, m);
  }
  return m;
}

const pupilMat = new THREE.MeshBasicMaterial({ color: 0x14323a });
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

function part(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  name?: string,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  if (name) m.name = name;
  m.castShadow = true;
  return m;
}

export function createHeroF(toon: HeroFToon = defaultToon): THREE.Group {
  const mat = matsFor(toon);
  const group = new THREE.Group();
  group.name = 'heroF';

  // Hips + legs ---------------------------------------------------------
  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.82, 0);
  group.add(hips);

  const pelvis = part(pelvisGeo, mat.dress, 'pelvis');
  pelvis.position.y = 0.02;
  hips.add(pelvis);

  const makeLeg = (side: 1 | -1): THREE.Group => {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'legL' : 'legR';
    leg.position.set(side * 0.12, -0.02, 0);
    const tights = part(tightsGeo, mat.cream);
    tights.position.y = -0.24;
    const boot = part(bootGeo, mat.leather, side < 0 ? 'bootL' : 'bootR');
    boot.position.y = -0.56;
    const cuff = part(cuffGeo, mat.darkLeather);
    cuff.position.y = -0.45;
    cuff.rotation.x = Math.PI / 2;
    const foot = part(footGeo, mat.leather);
    foot.position.set(0, -0.74, 0.045);
    const sole = part(soleGeo, mat.darkLeather);
    sole.position.set(0, -0.79, 0.05);
    const toe = part(toeGeo, mat.leather);
    toe.position.set(0, -0.75, 0.16);
    toe.scale.set(1, 0.75, 0.8);
    const lace = part(laceGeo, mat.darkLeather);
    lace.position.set(0, -0.55, 0.09);
    lace.rotation.x = 0.1;
    leg.add(tights, boot, cuff, foot, sole, toe, lace);
    return leg;
  };
  hips.add(makeLeg(-1), makeLeg(1));

  // Torso: bodice + lathe dress + belt + cloak ---------------------------
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.1, 0);
  hips.add(torso);

  const bodice = part(bodiceGeo, mat.dress, 'bodice');
  bodice.position.y = 0.32;
  const dress = part(dressGeo, mat.dress, 'dress');
  const hem = part(hemGeo, mat.cream, 'hem');
  hem.position.y = -0.22;
  hem.rotation.x = Math.PI / 2;
  const belt = part(beltGeo, mat.leather, 'belt');
  belt.position.y = 0.13;
  belt.rotation.x = Math.PI / 2;
  const buckle = part(buckleGeo, mat.gold, 'buckle');
  buckle.position.set(0, 0.13, 0.245);
  const bell = part(bellGeo, mat.gold, 'beltBell');
  bell.position.set(0.12, 0.1, 0.21);
  torso.add(bodice, dress, hem, belt, buckle, bell);

  // Hem embroidery: small teal flowers with gold hearts around the skirt.
  const hemR = 0.345;
  [-1.05, -0.55, 0, 0.55, 1.05, Math.PI].forEach((a, i) => {
    const f = part(hemFlowerGeo, mat.scarf, `hemFlower${i}`);
    f.position.set(Math.sin(a) * hemR, -0.15, Math.cos(a) * hemR);
    f.scale.set(1, 1, 0.45);
    f.rotation.y = a;
    const dot = part(hemDotGeo, mat.gold);
    dot.position.set(0, 0.005, 0.022);
    dot.castShadow = false;
    f.add(dot);
    torso.add(f);
  });

  const cloak = part(cloakGeo, mat.cream, 'cloak');
  cloak.position.set(0, 0.06, -0.12);
  cloak.scale.set(1, 1, 0.62);
  const capelet = part(capeletGeo, mat.cream, 'capelet');
  capelet.position.set(0, 0.42, -0.05);
  capelet.scale.set(1, 1, 0.8);
  torso.add(cloak, capelet);

  // Teal scarf: double neck wrap + 3 chained tail segments, fringed tip.
  const scarfWrap = part(scarfWrapGeo, mat.scarf, 'scarfWrap');
  scarfWrap.position.set(0, 0.45, 0.02);
  scarfWrap.rotation.x = Math.PI / 2;
  const scarfWrap2 = part(scarfWrap2Geo, mat.scarfDark, 'scarfWrap2');
  scarfWrap2.position.set(0, 0.38, 0.03);
  scarfWrap2.rotation.x = Math.PI / 2 + 0.12;
  torso.add(scarfWrap, scarfWrap2);

  const tailGeos = [tailGeo0, tailGeo1, tailGeo2];
  let scarfParent: THREE.Object3D = torso;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.name = `scarf${i}`;
    if (i === 0) seg.position.set(-0.09, 0.4, 0.19);
    else seg.position.set(0, -0.14, 0.01);
    const cloth = part(tailGeos[i]!, i === 1 ? mat.scarfDark : mat.scarf);
    cloth.position.y = -0.065;
    seg.add(cloth);
    if (i === 2) {
      const fringe = new THREE.Group();
      fringe.name = 'scarfFringe';
      fringe.position.y = -0.135;
      for (let s = 0; s < 5; s++) {
        const strand = part(fringeStrandGeo, mat.scarfDark);
        strand.position.set(-0.044 + s * 0.022, -0.025, 0);
        strand.rotation.z = (s - 2) * 0.06;
        fringe.add(strand);
      }
      seg.add(fringe);
    }
    scarfParent.add(seg);
    scarfParent = seg;
  }

  // Hip satchel with strap + clasp --------------------------------------
  const satchel = new THREE.Group();
  satchel.name = 'satchel';
  satchel.position.set(-0.28, 0.02, 0.13);
  const pouch = part(pouchGeo, mat.leather, 'pouch');
  const flap = part(flapGeo, mat.darkLeather, 'satchelFlap');
  flap.position.y = 0.08;
  const clasp = part(claspGeo, mat.gold, 'clasp');
  clasp.position.set(0, 0.01, 0.06);
  const strap = part(strapGeo, mat.darkLeather, 'strap');
  strap.position.set(0.06, 0.17, -0.01);
  strap.rotation.z = 0.5;
  satchel.add(pouch, flap, clasp, strap);
  torso.add(satchel);

  // Arms ----------------------------------------------------------------
  const makeArm = (side: 1 | -1): THREE.Group => {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'armL' : 'armR';
    arm.position.set(side * 0.27, 0.36, 0);
    const sleeve = part(sleeveGeo, mat.dress, side < 0 ? 'sleeveL' : 'sleeveR');
    sleeve.position.y = -0.11;
    const ruffle = part(ruffleGeo, mat.cream);
    ruffle.position.y = -0.18;
    ruffle.rotation.x = Math.PI / 2;
    const hand = part(handGeo, mat.skin, side < 0 ? 'handL' : 'handR');
    hand.position.y = -0.27;
    hand.scale.set(1, 1.2, 1);
    arm.add(sleeve, ruffle, hand);
    return arm;
  };
  torso.add(makeArm(-1), makeArm(1));

  // Head + short hood + flower pin + ponytail ---------------------------
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.48, 0.02);
  torso.add(head);

  const face = part(faceGeo, mat.skin, 'face');
  face.position.set(0, 0.02, 0.02);
  const hood = part(hoodGeo, mat.cream, 'hood');
  hood.position.set(0, 0.06, -0.05);
  hood.scale.set(1.08, 1.0, 1.08);
  const hoodRim = part(hoodRimGeo, mat.cream, 'hoodRim');
  hoodRim.position.set(0, 0.02, 0.155);
  const hairCap = part(hairGeo, mat.hair, 'hair');
  hairCap.position.set(0, 0.09, -0.02);
  hairCap.scale.set(1, 0.7, 1);
  const ponytail = part(ponytailGeo, mat.hair, 'ponytail');
  ponytail.position.set(0, -0.08, -0.25);
  ponytail.rotation.x = 0.5;
  const ponytailTip = part(ponytailTipGeo, mat.hair, 'ponytailTip');
  ponytailTip.position.set(0, -0.19, -0.3);
  ponytailTip.scale.set(0.9, 1.25, 0.9);
  const hairTie = part(hairTieGeo, mat.scarf, 'hairTie');
  hairTie.position.set(0, 0.0, -0.21);
  hairTie.rotation.x = 0.5;
  head.add(face, hood, hoodRim, hairCap, ponytail, ponytailTip, hairTie);

  for (const fx of [-0.09, 0, 0.09]) {
    const fringe = part(hairFringeGeo, mat.hair);
    fringe.position.set(fx, 0.14, 0.15);
    fringe.scale.set(1, 1.3, 0.7);
    head.add(fringe);
  }

  // Flower pin on the hood's left side: 5 petals, gold heart, 2 leaves.
  const flower = new THREE.Group();
  flower.name = 'flowerPin';
  flower.position.set(-0.21, 0.16, 0.1);
  flower.rotation.y = -0.5;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const petal = part(petalGeo, mat.petal);
    petal.position.set(Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0);
    petal.scale.set(1, 1, 0.5);
    flower.add(petal);
  }
  const heart = part(flowerHeartGeo, mat.gold, 'flowerHeart');
  heart.position.z = 0.015;
  const leafA = part(flowerLeafGeo, mat.leaf, 'flowerLeaf');
  leafA.position.set(0.05, -0.06, -0.01);
  leafA.scale.set(1.4, 0.7, 0.4);
  leafA.rotation.z = -0.4;
  const leafB = part(flowerLeafGeo, mat.leaf, 'flowerLeaf2');
  leafB.position.set(-0.045, 0.065, -0.01);
  leafB.scale.set(1.3, 0.65, 0.4);
  leafB.rotation.z = 0.7;
  flower.add(heart, leafA, leafB);
  head.add(flower);

  // Expressive eyes: white + teal iris + pupil + sparkle.
  for (const sx of [-1, 1]) {
    const eye = part(eyeWhiteGeo, mat.eyeWhite, sx < 0 ? 'eyeL' : 'eyeR');
    eye.position.set(sx * 0.074, 0.01, 0.185);
    eye.scale.set(1, 1.15, 0.7);
    const iris = part(irisGeo, mat.iris);
    iris.position.set(0, 0.002, 0.024);
    iris.scale.set(1, 1.1, 0.45);
    const pupil = part(pupilGeo, pupilMat);
    pupil.position.set(0, 0.003, 0.038);
    pupil.scale.set(1, 1.15, 0.5);
    const spark = part(sparkGeo, sparkMat);
    spark.position.set(0.009, 0.012, 0.042);
    spark.castShadow = false;
    pupil.castShadow = false;
    iris.castShadow = false;
    eye.add(iris, pupil, spark);
    head.add(eye);
  }

  // Gentle face: blush, smile, soft brows.
  for (const sx of [-1, 1]) {
    const blush = part(blushGeo, mat.blush, sx < 0 ? 'blushL' : 'blushR');
    blush.position.set(sx * 0.12, -0.045, 0.152);
    blush.scale.set(1, 0.7, 0.4);
    blush.castShadow = false;
    const brow = part(browGeo, mat.hair, sx < 0 ? 'browL' : 'browR');
    brow.position.set(sx * 0.075, 0.078, 0.182);
    brow.rotation.z = Math.PI / 2 - sx * 0.12;
    brow.castShadow = false;
    head.add(blush, brow);
  }
  const smile = part(smileGeo, pupilMat, 'smile');
  smile.position.set(0, -0.075, 0.175);
  smile.rotation.set(-0.2, 0, Math.PI * 1.15);
  smile.castShadow = false;
  head.add(smile);

  return group;
}

interface HeroFBase {
  hipsY: number;
}

function heroPivot(g: THREE.Group, name: string): THREE.Group | null {
  const o = g.getObjectByName(name);
  return o && (o as THREE.Group).isGroup ? (o as THREE.Group) : null;
}

// Gentle idle sway; when `group.userData.phase` is a finite number a walk
// cycle is layered on top and the phase advances by `dt`. Never throws,
// even on an empty group.
export function updateHeroF(g: THREE.Group, t: number, dt: number): void {
  try {
    const time = Number.isFinite(t) ? t : 0;
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
    const hips = heroPivot(g, 'hips');
    const torso = heroPivot(g, 'torso');
    const head = heroPivot(g, 'head');
    const armL = heroPivot(g, 'armL');
    const armR = heroPivot(g, 'armR');
    const legL = heroPivot(g, 'legL');
    const legR = heroPivot(g, 'legR');
    const segs = [heroPivot(g, 'scarf0'), heroPivot(g, 'scarf1'), heroPivot(g, 'scarf2')];

    let base = g.userData.heroBase as HeroFBase | undefined;
    if (!base) {
      base = { hipsY: hips?.position.y ?? 0 };
      g.userData.heroBase = base;
    }

    const phaseRaw = g.userData.phase as unknown;
    const walking = typeof phaseRaw === 'number' && Number.isFinite(phaseRaw);
    const phase = walking ? (phaseRaw as number) : 0;
    const s = walking ? Math.sin(phase) : 0;

    if (hips) {
      hips.position.y =
        base.hipsY + Math.sin(time * 2.1 + 0.4) * 0.012 + (walking ? Math.abs(Math.cos(phase)) * 0.055 : 0);
    }
    if (torso) {
      torso.rotation.y = Math.sin(time * 0.55 + 1) * 0.04;
      torso.rotation.x = walking ? 0.06 : Math.sin(time * 2.1 + 0.9) * 0.01;
    }
    if (head) {
      head.rotation.y = Math.sin(time * 0.75 + 0.5) * 0.09;
      head.rotation.x = Math.sin(time * 1.15) * 0.05;
    }
    if (armL) {
      armL.rotation.x = Math.sin(time * 2.1) * 0.06 + (walking ? s * 0.45 : 0);
      armL.rotation.z = 0.08 + Math.sin(time * 1.35 + 0.6) * 0.02;
    }
    if (armR) {
      armR.rotation.x = -Math.sin(time * 2.1) * 0.06 + (walking ? -s * 0.45 : 0);
      armR.rotation.z = -0.08 - Math.sin(time * 1.35 + 1.6) * 0.02;
    }
    if (legL) legL.rotation.x = walking ? -s * 0.55 : Math.sin(time * 2.1) * 0.02;
    if (legR) legR.rotation.x = walking ? s * 0.55 : -Math.sin(time * 2.1) * 0.02;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (seg) {
        seg.rotation.x =
          0.1 + Math.sin(time * 2.6 - i * 0.8) * 0.1 + (walking ? Math.abs(s) * 0.15 : 0);
        seg.rotation.z = Math.sin(time * 1.9 - i) * 0.07;
      }
    }
    if (walking) g.userData.phase = phase + step * 7;
  } catch {
    // Idle animation must never break the frame loop.
  }
}
