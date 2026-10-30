import * as THREE from 'three';

// Hooded female traveler (~1.7 tall, feet origin, faces +Z).
// Matches visual-plan/refs/turnarounds/02-hero-female.jpg: cream short hood
// with a flower pin, teal scarf, cream dress with belt + hip satchel,
// ponytail, cuffed boots.

export type HeroFToon = (color: number) => THREE.MeshToonMaterial;

const defaultToon: HeroFToon = (color: number): THREE.MeshToonMaterial =>
  new THREE.MeshToonMaterial({ color });

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
  const creamMat = toon(0xece0c8);
  const dressMat = toon(0xe4d6bc);
  const scarfMat = toon(0x4d8a84);
  const leatherMat = toon(0x7a5238);
  const darkLeatherMat = toon(0x5d3f2c);
  const skinMat = toon(0xf2c19b);
  const hairMat = toon(0xd9b06a);
  const goldMat = toon(0xc9a24a);
  const petalMat = toon(0x5fa3b8);
  const leafMat = toon(0x6f9a5a);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e5a66 });
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const group = new THREE.Group();
  group.name = 'heroF';

  // Hips + legs ---------------------------------------------------------
  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.82, 0);
  group.add(hips);

  const pelvis = part(new THREE.BoxGeometry(0.32, 0.2, 0.22), dressMat, 'pelvis');
  pelvis.position.y = 0.02;
  hips.add(pelvis);

  const legGeo = new THREE.CapsuleGeometry(0.085, 0.16, 4, 10);
  const bootGeo = new THREE.CylinderGeometry(0.09, 0.095, 0.24, 10);
  const cuffGeo = new THREE.TorusGeometry(0.09, 0.03, 6, 12);
  const footGeo = new THREE.BoxGeometry(0.16, 0.12, 0.26);

  const makeLeg = (side: 1 | -1): THREE.Group => {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'legL' : 'legR';
    leg.position.set(side * 0.12, -0.02, 0);
    const shin = part(legGeo, skinMat);
    shin.position.y = -0.24;
    const boot = part(bootGeo, leatherMat, side < 0 ? 'bootL' : 'bootR');
    boot.position.y = -0.56;
    const cuff = part(cuffGeo, darkLeatherMat);
    cuff.position.y = -0.45;
    cuff.rotation.x = Math.PI / 2;
    const foot = part(footGeo, leatherMat);
    foot.position.set(0, -0.74, 0.045);
    leg.add(shin, boot, cuff, foot);
    return leg;
  };
  hips.add(makeLeg(-1), makeLeg(1));

  // Torso: bodice + skirt + belt + cloak ---------------------------------
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.1, 0);
  hips.add(torso);

  const bodice = part(
    new THREE.CylinderGeometry(0.22, 0.27, 0.42, 12),
    dressMat,
    'bodice',
  );
  bodice.position.y = 0.3;
  const skirt = part(new THREE.ConeGeometry(0.36, 0.5, 14), dressMat, 'dress');
  skirt.position.y = 0.02;
  const hem = part(new THREE.TorusGeometry(0.35, 0.025, 6, 16), creamMat, 'hem');
  hem.position.y = -0.22;
  hem.rotation.x = Math.PI / 2;
  const belt = part(new THREE.TorusGeometry(0.26, 0.04, 8, 14), leatherMat, 'belt');
  belt.position.y = 0.12;
  belt.rotation.x = Math.PI / 2;
  const buckle = part(new THREE.BoxGeometry(0.07, 0.06, 0.03), goldMat, 'buckle');
  buckle.position.set(0, 0.12, 0.26);
  torso.add(bodice, skirt, hem, belt, buckle);

  const cloak = part(new THREE.ConeGeometry(0.46, 0.86, 14), creamMat, 'cloak');
  cloak.position.set(0, 0.06, -0.12);
  cloak.scale.set(1, 1, 0.62);
  const capelet = part(new THREE.ConeGeometry(0.33, 0.3, 12), creamMat, 'capelet');
  capelet.position.set(0, 0.42, -0.05);
  capelet.scale.set(1, 1, 0.8);
  torso.add(cloak, capelet);

  const scarfWrap = part(
    new THREE.TorusGeometry(0.15, 0.06, 8, 14),
    scarfMat,
    'scarfWrap',
  );
  scarfWrap.position.set(0, 0.45, 0.02);
  scarfWrap.rotation.x = Math.PI / 2;
  torso.add(scarfWrap);

  // Scarf tail: 3 chained segments down the chest.
  const tailWidths = [0.14, 0.13, 0.12];
  let scarfParent: THREE.Object3D = torso;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.name = `scarf${i}`;
    if (i === 0) seg.position.set(-0.09, 0.4, 0.19);
    else seg.position.set(0, -0.14, 0.01);
    const cloth = part(new THREE.BoxGeometry(tailWidths[i]!, 0.15, 0.05), scarfMat);
    cloth.position.y = -0.065;
    seg.add(cloth);
    if (i === 2) {
      const fringe = part(new THREE.BoxGeometry(0.12, 0.04, 0.05), scarfMat, 'scarfFringe');
      fringe.position.y = -0.15;
      seg.add(fringe);
    }
    scarfParent.add(seg);
    scarfParent = seg;
  }

  // Small hip satchel ----------------------------------------------------
  const satchel = new THREE.Group();
  satchel.name = 'satchel';
  satchel.position.set(-0.27, 0.02, 0.12);
  const pouch = part(new THREE.BoxGeometry(0.15, 0.18, 0.1), leatherMat, 'pouch');
  const flap = part(new THREE.BoxGeometry(0.16, 0.07, 0.11), darkLeatherMat, 'satchelFlap');
  flap.position.y = 0.08;
  const clasp = part(new THREE.BoxGeometry(0.04, 0.05, 0.02), goldMat, 'clasp');
  clasp.position.set(0, 0.01, 0.06);
  satchel.add(pouch, flap, clasp);
  torso.add(satchel);

  // Arms -----------------------------------------------------------------
  const sleeveGeo = new THREE.CapsuleGeometry(0.08, 0.1, 4, 10);
  const handGeo = new THREE.SphereGeometry(0.07, 10, 8);
  const makeArm = (side: 1 | -1): THREE.Group => {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'armL' : 'armR';
    arm.position.set(side * 0.27, 0.36, 0);
    const sleeve = part(sleeveGeo, dressMat, side < 0 ? 'sleeveL' : 'sleeveR');
    sleeve.position.y = -0.11;
    const hand = part(handGeo, skinMat, side < 0 ? 'handL' : 'handR');
    hand.position.y = -0.26;
    hand.scale.set(1, 1.2, 1);
    arm.add(sleeve, hand);
    return arm;
  };
  torso.add(makeArm(-1), makeArm(1));

  // Head + short hood + flower pin + ponytail -----------------------------
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.48, 0.02);
  torso.add(head);

  const face = part(new THREE.SphereGeometry(0.195, 16, 14), skinMat, 'face');
  face.position.set(0, 0.02, 0.02);
  const hood = part(new THREE.SphereGeometry(0.235, 16, 14), creamMat, 'hood');
  hood.position.set(0, 0.06, -0.05);
  hood.scale.set(1.08, 1.0, 1.08);
  const hoodRim = part(new THREE.TorusGeometry(0.18, 0.038, 8, 16), creamMat, 'hoodRim');
  hoodRim.position.set(0, 0.02, 0.155);
  const hairCap = part(new THREE.SphereGeometry(0.2, 14, 12), hairMat, 'hair');
  hairCap.position.set(0, 0.09, -0.02);
  hairCap.scale.set(1, 0.7, 1);
  const ponytail = part(
    new THREE.CapsuleGeometry(0.06, 0.16, 4, 8),
    hairMat,
    'ponytail',
  );
  ponytail.position.set(0, -0.06, -0.24);
  ponytail.rotation.x = 0.5;
  head.add(face, hood, hoodRim, hairCap, ponytail);

  const fringeGeo = new THREE.SphereGeometry(0.05, 8, 8);
  for (const fx of [-0.09, 0, 0.09]) {
    const fringe = part(fringeGeo, hairMat);
    fringe.position.set(fx, 0.14, 0.15);
    fringe.scale.set(1, 1.3, 0.7);
    head.add(fringe);
  }

  // Flower pin on the hood's left side.
  const flower = new THREE.Group();
  flower.name = 'flowerPin';
  flower.position.set(-0.21, 0.16, 0.1);
  flower.rotation.y = -0.5;
  const petalGeo = new THREE.SphereGeometry(0.032, 8, 6);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const petal = part(petalGeo, petalMat);
    petal.position.set(Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0);
    petal.scale.set(1, 1, 0.5);
    flower.add(petal);
  }
  const heart = part(new THREE.SphereGeometry(0.022, 8, 6), goldMat, 'flowerHeart');
  heart.position.z = 0.015;
  const leaf = part(new THREE.SphereGeometry(0.028, 8, 6), leafMat, 'flowerLeaf');
  leaf.position.set(0.05, -0.06, -0.01);
  leaf.scale.set(1.4, 0.7, 0.4);
  flower.add(heart, leaf);
  head.add(flower);

  const eyeGeo = new THREE.SphereGeometry(0.034, 10, 8);
  const sparkGeo = new THREE.SphereGeometry(0.011, 6, 6);
  for (const sx of [-1, 1]) {
    const eye = part(eyeGeo, eyeMat, sx < 0 ? 'eyeL' : 'eyeR');
    eye.position.set(sx * 0.074, 0.01, 0.185);
    const spark = part(sparkGeo, sparkMat);
    spark.position.set(0.012, 0.012, 0.026);
    spark.castShadow = false;
    eye.add(spark);
    head.add(eye);
  }

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
