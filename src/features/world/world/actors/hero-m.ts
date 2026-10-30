import * as THREE from 'three';

// Hooded male traveler (~1.8 tall, feet origin, faces +Z).
// Matches visual-plan/refs/turnarounds/01-hero-male.jpg: slate-blue hooded
// cloak with gold toggles, mustard scarf with a front tail, cross-body
// leather satchel, cuffed boots.

export type HeroMToon = (color: number) => THREE.MeshToonMaterial;

const defaultToon: HeroMToon = (color: number): THREE.MeshToonMaterial =>
  new THREE.MeshToonMaterial({ color });

// ---------------------------------------------------------------------------
// Module-shared geometry (built once, reused by every hero instance).
// ---------------------------------------------------------------------------

// Radians of front opening left in the cloak lathe so the tunic shows.
const CLOAK_GAP = 1.0;

const cloakProfile = [
  new THREE.Vector2(0.2, 0.55),
  new THREE.Vector2(0.24, 0.42),
  new THREE.Vector2(0.28, 0.25),
  new THREE.Vector2(0.34, 0.05),
  new THREE.Vector2(0.42, -0.2),
  new THREE.Vector2(0.5, -0.4),
  new THREE.Vector2(0.55, -0.52),
];

// Cross-body strap path in torso space: left shoulder to satchel top.
const strapCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.26, 0.44, 0.06),
  new THREE.Vector3(-0.1, 0.3, 0.27),
  new THREE.Vector3(0.12, 0.16, 0.28),
  new THREE.Vector3(0.29, 0.1, 0.15),
]);

const GEO = {
  pelvis: new THREE.BoxGeometry(0.34, 0.22, 0.24),
  belt: new THREE.TorusGeometry(0.19, 0.04, 8, 16),
  beltBuckle: new THREE.BoxGeometry(0.09, 0.07, 0.025),
  beltPin: new THREE.BoxGeometry(0.016, 0.05, 0.03),
  shorts: new THREE.CapsuleGeometry(0.09, 0.18, 4, 10),
  knee: new THREE.SphereGeometry(0.075, 10, 8),
  sock: new THREE.CylinderGeometry(0.075, 0.08, 0.22, 10),
  boot: new THREE.CylinderGeometry(0.095, 0.1, 0.24, 12),
  cuff: new THREE.TorusGeometry(0.095, 0.03, 6, 14),
  foot: new THREE.BoxGeometry(0.17, 0.13, 0.28),
  sole: new THREE.BoxGeometry(0.18, 0.05, 0.3),
  toe: new THREE.SphereGeometry(0.085, 10, 8),
  lace: new THREE.BoxGeometry(0.1, 0.018, 0.02),
  tunic: new THREE.CylinderGeometry(0.24, 0.3, 0.5, 14),
  toggleBar: new THREE.CylinderGeometry(0.016, 0.016, 0.1, 8),
  toggleKnob: new THREE.SphereGeometry(0.022, 8, 8),
  cloak: new THREE.LatheGeometry(cloakProfile, 16, CLOAK_GAP / 2, Math.PI * 2 - CLOAK_GAP),
  stitchCord: new THREE.CylinderGeometry(0.012, 0.012, 1, 6),
  capelet: new THREE.ConeGeometry(0.37, 0.36, 12),
  clasp: new THREE.TorusGeometry(0.05, 0.02, 8, 12),
  scarfWrap: new THREE.TorusGeometry(0.155, 0.06, 8, 16),
  scarfWrap2: new THREE.TorusGeometry(0.14, 0.05, 8, 16),
  scarfKnot: new THREE.SphereGeometry(0.07, 10, 8),
  scarfTail0: new THREE.BoxGeometry(0.15, 0.17, 0.05),
  scarfTail1: new THREE.BoxGeometry(0.14, 0.16, 0.05),
  scarfTail2: new THREE.BoxGeometry(0.13, 0.15, 0.05),
  fringe: new THREE.BoxGeometry(0.02, 0.06, 0.045),
  pouch: new THREE.BoxGeometry(0.2, 0.24, 0.13),
  flap: new THREE.BoxGeometry(0.21, 0.1, 0.14),
  buckle: new THREE.TorusGeometry(0.028, 0.01, 6, 12),
  bucklePin: new THREE.BoxGeometry(0.012, 0.05, 0.012),
  strapRing: new THREE.TorusGeometry(0.025, 0.008, 6, 12),
  strap: new THREE.TubeGeometry(strapCurve, 20, 0.024, 8),
  sleeve: new THREE.CapsuleGeometry(0.085, 0.12, 4, 10),
  wrist: new THREE.TorusGeometry(0.08, 0.028, 6, 12),
  wristBead: new THREE.SphereGeometry(0.024, 8, 8),
  hand: new THREE.SphereGeometry(0.075, 10, 8),
  face: new THREE.SphereGeometry(0.205, 18, 14),
  nose: new THREE.SphereGeometry(0.022, 8, 8),
  smile: new THREE.TorusGeometry(0.032, 0.0075, 6, 12, Math.PI),
  hood: new THREE.SphereGeometry(0.25, 18, 14),
  hoodInner: new THREE.SphereGeometry(0.23, 14, 12),
  hoodRim: new THREE.TorusGeometry(0.19, 0.04, 8, 18),
  hairCap: new THREE.SphereGeometry(0.21, 14, 12),
  tuft: new THREE.SphereGeometry(0.06, 8, 8),
  fringeTuft: new THREE.SphereGeometry(0.05, 8, 8),
  sclera: new THREE.SphereGeometry(0.04, 12, 10),
  iris: new THREE.SphereGeometry(0.021, 10, 8),
  pupil: new THREE.SphereGeometry(0.01, 8, 8),
  spark: new THREE.SphereGeometry(0.008, 6, 6),
  brow: new THREE.BoxGeometry(0.07, 0.02, 0.02),
  freckle: new THREE.SphereGeometry(0.008, 6, 6),
};

// Tall oval sclera; baked so eye children stay undistorted.
GEO.sclera.scale(1, 1.15, 0.6);

// ---------------------------------------------------------------------------
// Materials: one shared set per toon factory, reused across all meshes.
// ---------------------------------------------------------------------------

interface HeroMMats {
  cloak: THREE.MeshToonMaterial;
  cloakInner: THREE.MeshToonMaterial;
  tunic: THREE.MeshToonMaterial;
  scarf: THREE.MeshToonMaterial;
  leather: THREE.MeshToonMaterial;
  darkLeather: THREE.MeshToonMaterial;
  skin: THREE.MeshToonMaterial;
  hair: THREE.MeshToonMaterial;
  sock: THREE.MeshToonMaterial;
  gold: THREE.MeshToonMaterial;
  stitch: THREE.MeshToonMaterial;
  iris: THREE.MeshToonMaterial;
  lip: THREE.MeshToonMaterial;
  freckle: THREE.MeshToonMaterial;
}

const matCache = new WeakMap<HeroMToon, HeroMMats>();

function matsFor(toon: HeroMToon): HeroMMats {
  let m = matCache.get(toon);
  if (!m) {
    m = {
      cloak: toon(0x5a718c),
      cloakInner: toon(0x46586e),
      tunic: toon(0x3d4a5c),
      scarf: toon(0xd9a441),
      leather: toon(0x7a5238),
      darkLeather: toon(0x5d3f2c),
      skin: toon(0xf2c19b),
      hair: toon(0x3a2c22),
      sock: toon(0x6e6a63),
      gold: toon(0xc9a24a),
      stitch: toon(0xe0b95a),
      iris: toon(0x7a4a21),
      lip: toon(0x8a4f3a),
      freckle: toon(0xb57a4e),
    };
    // Lathe shell has a front opening; render the inside too.
    m.cloak.side = THREE.DoubleSide;
    matCache.set(toon, m);
  }
  return m;
}

const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xfdf6ec });
const pupilMat = new THREE.MeshBasicMaterial({ color: 0x241a12 });
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

export function createHeroM(toon: HeroMToon = defaultToon): THREE.Group {
  const mat = matsFor(toon);
  const group = new THREE.Group();
  group.name = 'heroM';

  // Hips + legs ---------------------------------------------------------
  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.88, 0);
  group.add(hips);

  const pelvis = part(GEO.pelvis, mat.tunic, 'pelvis');
  pelvis.position.y = 0.02;
  const belt = part(GEO.belt, mat.darkLeather, 'belt');
  belt.position.y = 0.12;
  belt.rotation.x = Math.PI / 2;
  const beltBuckle = part(GEO.beltBuckle, mat.gold, 'beltBuckle');
  beltBuckle.position.set(0, 0.12, 0.222);
  const beltPin = part(GEO.beltPin, mat.darkLeather);
  beltPin.position.set(0, 0.12, 0.228);
  hips.add(pelvis, belt, beltBuckle, beltPin);

  const makeLeg = (side: 1 | -1): THREE.Group => {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'legL' : 'legR';
    leg.position.set(side * 0.13, -0.02, 0);
    const shorts = part(GEO.shorts, mat.tunic);
    shorts.position.y = -0.14;
    const knee = part(GEO.knee, mat.skin);
    knee.position.y = -0.33;
    const sock = part(GEO.sock, mat.sock);
    sock.position.y = -0.44;
    const boot = part(GEO.boot, mat.leather, side < 0 ? 'bootL' : 'bootR');
    boot.position.y = -0.6;
    const cuff = part(GEO.cuff, mat.darkLeather);
    cuff.position.y = -0.49;
    cuff.rotation.x = Math.PI / 2;
    const foot = part(GEO.foot, mat.leather);
    foot.position.set(0, -0.79, 0.05);
    const sole = part(GEO.sole, mat.darkLeather);
    sole.position.set(0, -0.845, 0.05);
    const toe = part(GEO.toe, mat.leather);
    toe.position.set(0, -0.8, 0.16);
    toe.scale.set(1, 0.75, 1);
    const laces = new THREE.Group();
    laces.name = side < 0 ? 'lacesL' : 'lacesR';
    for (let i = 0; i < 3; i++) {
      const lace = part(GEO.lace, mat.darkLeather);
      lace.position.set(0, -0.55 - i * 0.05, 0.09);
      laces.add(lace);
    }
    leg.add(shorts, knee, sock, boot, cuff, foot, sole, toe, laces);
    return leg;
  };
  hips.add(makeLeg(-1), makeLeg(1));

  // Torso ---------------------------------------------------------------
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.1, 0);
  hips.add(torso);

  const tunic = part(GEO.tunic, mat.tunic, 'tunic');
  tunic.position.y = 0.28;
  torso.add(tunic);

  // Gold toggles down the front (scarf tail hangs opposite).
  const toggles = new THREE.Group();
  toggles.name = 'toggles';
  for (let i = 0; i < 4; i++) {
    const y = 0.08 + i * 0.11;
    const r = 0.3 - ((y - 0.03) / 0.5) * 0.06;
    const toggle = new THREE.Group();
    toggle.name = `toggle${i}`;
    toggle.position.set(-0.1, y, r + 0.005);
    const bar = part(GEO.toggleBar, mat.gold);
    bar.rotation.z = Math.PI / 2;
    const knobL = part(GEO.toggleKnob, mat.gold);
    knobL.position.x = -0.05;
    const knobR = part(GEO.toggleKnob, mat.gold);
    knobR.position.x = 0.05;
    toggle.add(bar, knobL, knobR);
    toggles.add(toggle);
  }
  torso.add(toggles);

  // Draped cloak shell with a front opening + gold edge stitching.
  const cloak = part(GEO.cloak, mat.cloak, 'cloak');
  cloak.position.set(0, 0.05, -0.1);
  const edgeDir = new THREE.Vector3(Math.sin(CLOAK_GAP / 2), 0, Math.cos(CLOAK_GAP / 2));
  const up = new THREE.Vector3(0, 1, 0);
  for (const side of [-1, 1] as const) {
    const top = new THREE.Vector3(edgeDir.x * side * 0.22, 0.54, edgeDir.z * 0.22);
    const bottom = new THREE.Vector3(edgeDir.x * side * 0.57, -0.51, edgeDir.z * 0.57);
    const dir = bottom.clone().sub(top);
    const cord = part(GEO.stitchCord, mat.stitch, side < 0 ? 'stitchL' : 'stitchR');
    cord.scale.y = dir.length();
    cord.position.copy(top).add(bottom).multiplyScalar(0.5);
    cord.quaternion.setFromUnitVectors(up, dir.normalize());
    cloak.add(cord);
  }
  const capelet = part(GEO.capelet, mat.cloak, 'capelet');
  capelet.position.set(0, 0.44, -0.05);
  capelet.scale.set(1, 1, 0.8);
  const clasp = part(GEO.clasp, mat.gold, 'clasp');
  clasp.position.set(0, 0.4, 0.24);
  torso.add(cloak, capelet, clasp);

  // Mustard scarf: double wrap + knot + 3 chained tail segments.
  const scarfWrap = part(GEO.scarfWrap, mat.scarf, 'scarfWrap');
  scarfWrap.position.set(0, 0.47, 0.02);
  scarfWrap.rotation.x = Math.PI / 2;
  const scarfWrap2 = part(GEO.scarfWrap2, mat.scarf, 'scarfWrap2');
  scarfWrap2.position.set(0, 0.39, 0.03);
  scarfWrap2.rotation.x = Math.PI / 2;
  const scarfKnot = part(GEO.scarfKnot, mat.scarf, 'scarfKnot');
  scarfKnot.position.set(0.1, 0.44, 0.15);
  scarfKnot.scale.set(1, 0.8, 0.8);
  torso.add(scarfWrap, scarfWrap2, scarfKnot);

  const tailGeos = [GEO.scarfTail0, GEO.scarfTail1, GEO.scarfTail2];
  let scarfParent: THREE.Object3D = torso;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.name = `scarf${i}`;
    if (i === 0) seg.position.set(0.12, 0.42, 0.2);
    else seg.position.set(0, -0.15, 0.01);
    const cloth = part(tailGeos[i]!, mat.scarf);
    cloth.position.y = -0.07;
    seg.add(cloth);
    if (i === 2) {
      const fringe = new THREE.Group();
      fringe.name = 'scarfFringe';
      for (let f = 0; f < 5; f++) {
        const strip = part(GEO.fringe, mat.scarf);
        strip.position.set(-0.05 + f * 0.025, -0.17, 0);
        fringe.add(strip);
      }
      seg.add(fringe);
    }
    scarfParent.add(seg);
    scarfParent = seg;
  }

  // Satchel + cross-body strap ------------------------------------------
  const satchel = new THREE.Group();
  satchel.name = 'satchel';
  satchel.position.set(0.31, 0.02, 0.14);
  const pouch = part(GEO.pouch, mat.leather, 'pouch');
  const flap = part(GEO.flap, mat.darkLeather, 'satchelFlap');
  flap.position.y = 0.09;
  const buckle = part(GEO.buckle, mat.gold, 'buckle');
  buckle.position.set(0, -0.01, 0.068);
  const bucklePin = part(GEO.bucklePin, mat.gold, 'bucklePin');
  bucklePin.position.set(0, -0.01, 0.07);
  const strapRing = part(GEO.strapRing, mat.gold, 'strapRing');
  strapRing.position.set(-0.02, 0.12, 0.01);
  strapRing.rotation.y = Math.PI / 2;
  satchel.add(pouch, flap, buckle, bucklePin, strapRing);
  const strap = part(GEO.strap, mat.darkLeather, 'strap');
  torso.add(satchel, strap);

  // Arms ----------------------------------------------------------------
  const makeArm = (side: 1 | -1): THREE.Group => {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'armL' : 'armR';
    arm.position.set(side * 0.3, 0.36, 0);
    const sleeve = part(GEO.sleeve, mat.cloak, side < 0 ? 'sleeveL' : 'sleeveR');
    sleeve.position.y = -0.12;
    const wrist = part(GEO.wrist, mat.darkLeather);
    wrist.position.y = -0.25;
    wrist.rotation.x = Math.PI / 2;
    const hand = part(GEO.hand, mat.skin, side < 0 ? 'handL' : 'handR');
    hand.position.y = -0.33;
    hand.scale.set(1, 1.2, 1);
    arm.add(sleeve, wrist, hand);
    if (side > 0) {
      const bead = part(GEO.wristBead, mat.gold, 'wristBead');
      bead.position.set(0.08, -0.25, 0.02);
      arm.add(bead);
    }
    return arm;
  };
  torso.add(makeArm(-1), makeArm(1));

  // Head + hood ---------------------------------------------------------
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.5, 0.02);
  torso.add(head);

  const face = part(GEO.face, mat.skin, 'face');
  face.position.set(0, 0.02, 0.02);
  const nose = part(GEO.nose, mat.skin, 'nose');
  nose.position.set(0, -0.035, 0.208);
  const smile = part(GEO.smile, mat.lip, 'smile');
  smile.position.set(0, -0.075, 0.196);
  smile.rotation.z = Math.PI;
  const hood = part(GEO.hood, mat.cloak, 'hood');
  hood.position.set(0, 0.05, -0.04);
  hood.scale.set(1.1, 1.12, 1.1);
  const hoodInner = part(GEO.hoodInner, mat.cloakInner, 'hoodInner');
  hoodInner.position.set(0, 0.05, -0.06);
  hoodInner.scale.set(1.1, 1.12, 1.1);
  const hoodRim = part(GEO.hoodRim, mat.cloak, 'hoodRim');
  hoodRim.position.set(0, 0.02, 0.16);
  const hairCap = part(GEO.hairCap, mat.hair, 'hair');
  hairCap.position.set(0, 0.1, -0.02);
  hairCap.scale.set(1, 0.7, 1);
  head.add(face, nose, smile, hood, hoodInner, hoodRim, hairCap);

  for (const sx of [-1, 1] as const) {
    const tuft = part(GEO.tuft, mat.hair);
    tuft.position.set(sx * 0.17, 0.06, 0.1);
    head.add(tuft);
  }
  const fringeSpots: Array<[number, number, number]> = [
    [-0.08, 0.13, 0.15],
    [0, 0.15, 0.16],
    [0.08, 0.13, 0.15],
  ];
  for (const [x, y, z] of fringeSpots) {
    const tuft = part(GEO.fringeTuft, mat.hair);
    tuft.position.set(x, y, z);
    head.add(tuft);
  }

  // Expressive eyes: sclera mesh (keeps the rig node a Mesh) + iris,
  // pupil, and highlight children.
  for (const sx of [-1, 1] as const) {
    const eye = part(GEO.sclera, eyeWhiteMat, sx < 0 ? 'eyeL' : 'eyeR');
    eye.position.set(sx * 0.078, 0.01, 0.19);
    const iris = part(GEO.iris, mat.iris);
    iris.position.set(0, -0.002, 0.02);
    const pupil = part(GEO.pupil, pupilMat);
    pupil.position.set(0, -0.002, 0.036);
    const spark = part(GEO.spark, sparkMat);
    spark.position.set(0.011, 0.011, 0.042);
    spark.castShadow = false;
    eye.add(iris, pupil, spark);
    head.add(eye);
    const brow = part(GEO.brow, mat.hair, sx < 0 ? 'browL' : 'browR');
    brow.position.set(sx * 0.082, 0.095, 0.19);
    brow.rotation.z = sx * -0.12;
    head.add(brow);
  }

  const freckles = new THREE.Group();
  freckles.name = 'freckles';
  const freckleSpots: Array<[number, number, number]> = [
    [-0.07, -0.01, 0.213],
    [-0.1, 0.01, 0.202],
    [-0.055, -0.045, 0.209],
    [0.07, -0.01, 0.213],
    [0.1, 0.01, 0.202],
    [0.055, -0.045, 0.209],
  ];
  for (const [x, y, z] of freckleSpots) {
    const f = part(GEO.freckle, mat.freckle);
    f.position.set(x, y, z);
    f.scale.z = 0.5;
    freckles.add(f);
  }
  head.add(freckles);

  return group;
}

interface HeroMBase {
  hipsY: number;
}

function heroPivot(g: THREE.Group, name: string): THREE.Group | null {
  const o = g.getObjectByName(name);
  return o && (o as THREE.Group).isGroup ? (o as THREE.Group) : null;
}

// Gentle idle sway; when `group.userData.phase` is a finite number a walk
// cycle is layered on top and the phase advances by `dt`. Never throws,
// even on an empty group.
export function updateHeroM(g: THREE.Group, t: number, dt: number): void {
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

    let base = g.userData.heroBase as HeroMBase | undefined;
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
        base.hipsY + Math.sin(time * 2) * 0.012 + (walking ? Math.abs(Math.cos(phase)) * 0.06 : 0);
    }
    if (torso) {
      torso.rotation.y = Math.sin(time * 0.5) * 0.04;
      torso.rotation.x = walking ? 0.06 : Math.sin(time * 2 + 0.5) * 0.01;
    }
    if (head) {
      head.rotation.y = Math.sin(time * 0.7) * 0.09;
      head.rotation.x = Math.sin(time * 1.1 + 1) * 0.05;
    }
    if (armL) {
      armL.rotation.x = Math.sin(time * 2) * 0.06 + (walking ? s * 0.45 : 0);
      armL.rotation.z = 0.08 + Math.sin(time * 1.3) * 0.02;
    }
    if (armR) {
      armR.rotation.x = -Math.sin(time * 2) * 0.06 + (walking ? -s * 0.45 : 0);
      armR.rotation.z = -0.08 - Math.sin(time * 1.3 + 1) * 0.02;
    }
    if (legL) legL.rotation.x = walking ? -s * 0.55 : Math.sin(time * 2) * 0.02;
    if (legR) legR.rotation.x = walking ? s * 0.55 : -Math.sin(time * 2) * 0.02;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (seg) {
        seg.rotation.x =
          0.1 + Math.sin(time * 2.4 - i * 0.7) * 0.1 + (walking ? Math.abs(s) * 0.15 : 0);
        seg.rotation.z = Math.sin(time * 1.8 - i * 0.9) * 0.07;
      }
    }
    if (walking) g.userData.phase = phase + step * 7;
  } catch {
    // Idle animation must never break the frame loop.
  }
}
