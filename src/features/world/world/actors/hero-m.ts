import * as THREE from 'three';

// Hooded male traveler (~1.8 tall, feet origin, faces +Z).
// Matches visual-plan/refs/turnarounds/01-hero-male.jpg: slate-blue hooded
// cloak with gold toggles, mustard scarf with a front tail, cross-body
// leather satchel, cuffed boots.

export type HeroMToon = (color: number) => THREE.MeshToonMaterial;

const defaultToon: HeroMToon = (color: number): THREE.MeshToonMaterial =>
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

export function createHeroM(toon: HeroMToon = defaultToon): THREE.Group {
  const cloakMat = toon(0x5b6f86);
  const tunicMat = toon(0x3d4a5c);
  const scarfMat = toon(0xd9a441);
  const leatherMat = toon(0x7a5238);
  const darkLeatherMat = toon(0x5d3f2c);
  const skinMat = toon(0xf2c19b);
  const hairMat = toon(0x3a2c22);
  const sockMat = toon(0x6e6a63);
  const goldMat = toon(0xc9a24a);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2018 });
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const group = new THREE.Group();
  group.name = 'heroM';

  // Hips + legs ---------------------------------------------------------
  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.88, 0);
  group.add(hips);

  const pelvis = part(new THREE.BoxGeometry(0.34, 0.22, 0.24), tunicMat, 'pelvis');
  pelvis.position.y = 0.02;
  const belt = part(new THREE.TorusGeometry(0.19, 0.04, 8, 14), darkLeatherMat, 'belt');
  belt.position.y = 0.12;
  belt.rotation.x = Math.PI / 2;
  hips.add(pelvis, belt);

  const thighGeo = new THREE.CapsuleGeometry(0.09, 0.18, 4, 10);
  const sockGeo = new THREE.CylinderGeometry(0.075, 0.08, 0.22, 10);
  const bootGeo = new THREE.CylinderGeometry(0.095, 0.1, 0.24, 10);
  const cuffGeo = new THREE.TorusGeometry(0.095, 0.03, 6, 12);
  const footGeo = new THREE.BoxGeometry(0.17, 0.13, 0.28);

  const makeLeg = (side: 1 | -1): THREE.Group => {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'legL' : 'legR';
    leg.position.set(side * 0.13, -0.02, 0);
    const thigh = part(thighGeo, tunicMat);
    thigh.position.y = -0.16;
    const sock = part(sockGeo, sockMat);
    sock.position.y = -0.42;
    const boot = part(bootGeo, leatherMat, side < 0 ? 'bootL' : 'bootR');
    boot.position.y = -0.6;
    const cuff = part(cuffGeo, darkLeatherMat);
    cuff.position.y = -0.49;
    cuff.rotation.x = Math.PI / 2;
    const foot = part(footGeo, leatherMat);
    foot.position.set(0, -0.79, 0.05);
    leg.add(thigh, sock, boot, cuff, foot);
    return leg;
  };
  hips.add(makeLeg(-1), makeLeg(1));

  // Torso ---------------------------------------------------------------
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.1, 0);
  hips.add(torso);

  const tunic = part(
    new THREE.CylinderGeometry(0.24, 0.3, 0.5, 12),
    tunicMat,
    'tunic',
  );
  tunic.position.y = 0.28;
  torso.add(tunic);

  const toggleGeo = new THREE.SphereGeometry(0.028, 8, 8);
  for (let i = 0; i < 3; i++) {
    const toggle = part(toggleGeo, goldMat);
    toggle.position.set(0.07, 0.18 + i * 0.11, 0.26);
    torso.add(toggle);
  }

  const cloak = part(new THREE.ConeGeometry(0.52, 0.98, 14), cloakMat, 'cloak');
  cloak.position.set(0, 0.02, -0.12);
  cloak.scale.set(1, 1, 0.66);
  const capelet = part(new THREE.ConeGeometry(0.37, 0.36, 12), cloakMat, 'capelet');
  capelet.position.set(0, 0.44, -0.05);
  capelet.scale.set(1, 1, 0.8);
  const clasp = part(new THREE.TorusGeometry(0.05, 0.02, 8, 12), goldMat, 'clasp');
  clasp.position.set(0, 0.4, 0.24);
  torso.add(cloak, capelet, clasp);

  const scarfWrap = part(
    new THREE.TorusGeometry(0.155, 0.06, 8, 14),
    scarfMat,
    'scarfWrap',
  );
  scarfWrap.position.set(0, 0.47, 0.02);
  scarfWrap.rotation.x = Math.PI / 2;
  torso.add(scarfWrap);

  // Scarf tail: 3 chained segments hanging down the chest.
  const tailWidths = [0.15, 0.14, 0.13];
  const tailHeights = [0.17, 0.16, 0.15];
  let scarfParent: THREE.Object3D = torso;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.name = `scarf${i}`;
    if (i === 0) seg.position.set(0.12, 0.42, 0.2);
    else seg.position.set(0, -0.15, 0.01);
    const cloth = part(
      new THREE.BoxGeometry(tailWidths[i]!, tailHeights[i]!, 0.05),
      scarfMat,
    );
    cloth.position.y = -0.07;
    seg.add(cloth);
    if (i === 2) {
      const fringe = part(new THREE.BoxGeometry(0.13, 0.045, 0.05), scarfMat, 'scarfFringe');
      fringe.position.y = -0.16;
      seg.add(fringe);
    }
    scarfParent.add(seg);
    scarfParent = seg;
  }

  // Satchel + cross-body strap ------------------------------------------
  const satchel = new THREE.Group();
  satchel.name = 'satchel';
  satchel.position.set(0.31, 0.02, 0.14);
  const pouch = part(new THREE.BoxGeometry(0.2, 0.24, 0.13), leatherMat, 'pouch');
  const flap = part(new THREE.BoxGeometry(0.21, 0.09, 0.14), darkLeatherMat, 'satchelFlap');
  flap.position.y = 0.1;
  const buckle = part(new THREE.BoxGeometry(0.05, 0.06, 0.02), goldMat, 'buckle');
  buckle.position.set(0, 0.02, 0.075);
  satchel.add(pouch, flap, buckle);
  const strap = part(new THREE.BoxGeometry(0.07, 0.62, 0.03), darkLeatherMat, 'strap');
  strap.position.set(0.05, 0.24, 0.17);
  strap.rotation.z = 0.7;
  torso.add(satchel, strap);

  // Arms ----------------------------------------------------------------
  const sleeveGeo = new THREE.CapsuleGeometry(0.085, 0.12, 4, 10);
  const handGeo = new THREE.SphereGeometry(0.075, 10, 8);
  const wristGeo = new THREE.TorusGeometry(0.08, 0.028, 6, 12);
  const makeArm = (side: 1 | -1): THREE.Group => {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'armL' : 'armR';
    arm.position.set(side * 0.3, 0.36, 0);
    const sleeve = part(sleeveGeo, cloakMat, side < 0 ? 'sleeveL' : 'sleeveR');
    sleeve.position.y = -0.12;
    const wrist = part(wristGeo, scarfMat);
    wrist.position.y = -0.2;
    wrist.rotation.x = Math.PI / 2;
    const hand = part(handGeo, skinMat, side < 0 ? 'handL' : 'handR');
    hand.position.y = -0.28;
    hand.scale.set(1, 1.2, 1);
    arm.add(sleeve, wrist, hand);
    return arm;
  };
  torso.add(makeArm(-1), makeArm(1));

  // Head + hood ---------------------------------------------------------
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.5, 0.02);
  torso.add(head);

  const face = part(new THREE.SphereGeometry(0.205, 16, 14), skinMat, 'face');
  face.position.set(0, 0.02, 0.02);
  const hood = part(new THREE.SphereGeometry(0.25, 16, 14), cloakMat, 'hood');
  hood.position.set(0, 0.05, -0.04);
  hood.scale.set(1.1, 1.12, 1.1);
  const hoodRim = part(new THREE.TorusGeometry(0.19, 0.04, 8, 16), cloakMat, 'hoodRim');
  hoodRim.position.set(0, 0.02, 0.16);
  const hairCap = part(new THREE.SphereGeometry(0.21, 14, 12), hairMat, 'hair');
  hairCap.position.set(0, 0.1, -0.02);
  hairCap.scale.set(1, 0.7, 1);
  head.add(face, hood, hoodRim, hairCap);

  const tuftGeo = new THREE.SphereGeometry(0.06, 8, 8);
  for (const sx of [-1, 1]) {
    const tuft = part(tuftGeo, hairMat);
    tuft.position.set(sx * 0.17, 0.06, 0.1);
    head.add(tuft);
  }

  const eyeGeo = new THREE.SphereGeometry(0.034, 10, 8);
  const sparkGeo = new THREE.SphereGeometry(0.011, 6, 6);
  for (const sx of [-1, 1]) {
    const eye = part(eyeGeo, eyeMat, sx < 0 ? 'eyeL' : 'eyeR');
    eye.position.set(sx * 0.078, 0.01, 0.195);
    const spark = part(sparkGeo, sparkMat);
    spark.position.set(0.012, 0.012, 0.026);
    spark.castShadow = false;
    eye.add(spark);
    head.add(eye);
  }

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
