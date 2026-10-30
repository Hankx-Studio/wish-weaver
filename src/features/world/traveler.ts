import * as THREE from 'three';

export interface TravelerRig {
  group: THREE.Group; // feet origin; yaw applied here
  body: THREE.Group; // bob / squash / lean
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  scarf: THREE.Group[]; // cape-hem flutter chain (kept name for API stability)
  eyeL: THREE.Mesh;
  eyeR: THREE.Mesh;
}

export interface WalkPose {
  legL: number;
  legR: number;
  armL: number;
  armR: number;
  bob: number;
}

// Pure walk cycle: legs and arms swing antisymmetrically, body bobs twice.
export function walkPose(phase: number): WalkPose {
  const s = Math.sin(phase);
  return {
    legL: -s * 0.55,
    legR: s * 0.55,
    armL: s * 0.42,
    armR: -s * 0.42,
    bob: Math.abs(Math.cos(phase)) * 0.07,
  };
}

// Sky-like caped kid from primitives (~2.1 tall). Feet origin, faces +z.
// Original design: layered two-tone cape with clasp, big glossy eyes, hair
// tufts, mittens, cuffed boots, satchel with a strapped bedroll.
export function buildTraveler(
  toon: (color: number) => THREE.MeshToonMaterial,
): TravelerRig {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const capeMat = toon(0x2e3a44);
  const liningMat = toon(0xd9b36a);
  const skinMat = toon(0xf2c9a0);
  const tunicMat = toon(0xe6d3ac);
  const goldMat = toon(0xd9b36a);
  const darkMat = toon(0x2b2620);
  const brownMat = toon(0x6b4f36);
  const hairMat = toon(0x5a3d26);
  const browMat = toon(0x4a3120);
  const mittenMat = toon(0xb5674c);
  const cuffMat = toon(0xf0e6cf);
  const rollMat = toon(0x4e8a7e);
  const gemMat = toon(0x7fd4c1);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x241d18 });
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf0a0a8 });

  // Tunic + belt
  const tunic = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.44, 0.75, 12),
    tunicMat,
  );
  tunic.position.y = 1.05;
  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(0.33, 0.055, 8, 14),
    brownMat,
  );
  belt.position.y = 1.0;
  belt.rotation.x = Math.PI / 2;
  const tunicHem = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.04, 6, 14),
    goldMat,
  );
  tunicHem.position.y = 0.69;
  tunicHem.rotation.x = Math.PI / 2;
  body.add(tunic, belt, tunicHem);

  // Layered cape: shoulder capelet + outer shell + peeking gold lining.
  const capelet = new THREE.Mesh(
    new THREE.ConeGeometry(0.52, 0.5, 12),
    capeMat,
  );
  capelet.name = 'capelet';
  capelet.position.set(0, 1.42, -0.08);
  capelet.scale.set(1, 1, 0.72);
  const capeOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.56, 1.2, 12),
    capeMat,
  );
  capeOuter.name = 'capeOuter';
  capeOuter.position.set(0, 0.95, -0.16);
  capeOuter.scale.set(1, 1, 0.52);
  const capeLining = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.16, 12),
    liningMat,
  );
  capeLining.name = 'capeLining';
  capeLining.position.set(0, 0.9, -0.14);
  capeLining.scale.set(1, 1, 0.5);
  body.add(capelet, capeOuter, capeLining);

  // Clasp: gold ring + gem + shoulder straps at the chest.
  const clasp = new THREE.Group();
  clasp.name = 'clasp';
  clasp.position.set(0, 1.44, 0.34);
  const claspRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.025, 8, 12),
    goldMat,
  );
  const claspGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), gemMat);
  claspGem.position.z = 0.02;
  clasp.add(claspRing, claspGem);
  const strapGeo = new THREE.BoxGeometry(0.07, 0.07, 0.3);
  const strapL = new THREE.Mesh(strapGeo, capeMat);
  strapL.position.set(-0.2, 1.5, 0.2);
  strapL.rotation.y = 0.5;
  const strapR = new THREE.Mesh(strapGeo, capeMat);
  strapR.position.set(0.2, 1.5, 0.2);
  strapR.rotation.y = -0.5;
  body.add(clasp, strapL, strapR);

  // Head: face, hair cap + tufts, big glossy eyes, brows, blush.
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), skinMat);
  face.position.set(0, 1.78, 0.1);
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.33, 14, 12),
    hairMat,
  );
  hairCap.position.set(0, 1.85, 0.0);
  hairCap.scale.set(1.02, 0.92, 1.0);
  body.add(face, hairCap);

  const tuftGeo = new THREE.ConeGeometry(0.07, 0.24, 7);
  const fringeGeo = new THREE.SphereGeometry(0.075, 8, 8);
  const tufts = new THREE.Group();
  tufts.name = 'hairTufts';
  for (const x of [-0.15, 0, 0.15]) {
    const fringe = new THREE.Mesh(fringeGeo, hairMat);
    fringe.position.set(x, 1.99, 0.3);
    fringe.scale.set(1, 1.5, 0.8);
    tufts.add(fringe);
  }
  const sideTuftL = new THREE.Mesh(tuftGeo, hairMat);
  sideTuftL.position.set(-0.3, 1.86, 0.04);
  sideTuftL.rotation.z = 2.2;
  const sideTuftR = new THREE.Mesh(tuftGeo, hairMat);
  sideTuftR.position.set(0.3, 1.86, 0.04);
  sideTuftR.rotation.z = -2.2;
  const backTuft = new THREE.Mesh(tuftGeo, hairMat);
  backTuft.position.set(0, 1.92, -0.28);
  backTuft.rotation.x = 2.4;
  const cowlick = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 6), hairMat);
  cowlick.position.set(0.04, 2.16, 0.0);
  cowlick.rotation.z = -0.35;
  tufts.add(sideTuftL, sideTuftR, backTuft, cowlick);
  body.add(tufts);

  const eyeGeo = new THREE.SphereGeometry(0.085, 12, 10);
  const sparkGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const makeEye = (side: 1 | -1): THREE.Mesh => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.12, 1.79, 0.345);
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.set(0.03, 0.035, 0.06);
    eye.add(spark); // squash with the eye on blink
    return eye;
  };
  const eyeL = makeEye(-1);
  const eyeR = makeEye(1);
  const browGeo = new THREE.BoxGeometry(0.11, 0.03, 0.03);
  const browL = new THREE.Mesh(browGeo, browMat);
  browL.position.set(-0.12, 1.94, 0.345);
  browL.rotation.z = 0.1;
  const browR = new THREE.Mesh(browGeo, browMat);
  browR.position.set(0.12, 1.94, 0.345);
  browR.rotation.z = -0.1;
  const blushGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const blushL = new THREE.Mesh(blushGeo, blushMat);
  blushL.position.set(-0.2, 1.7, 0.29);
  const blushR = new THREE.Mesh(blushGeo, blushMat);
  blushR.position.set(0.2, 1.7, 0.29);
  body.add(eyeL, eyeR, browL, browR, blushL, blushR);

  // Cape-hem flutter chain (3 chained segments, driven like the old scarf).
  const scarf: THREE.Group[] = [];
  let parent: THREE.Object3D = body;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.position.set(0, i === 0 ? 0.45 : -0.02, i === 0 ? -0.42 : -0.3);
    const w = 0.36 - i * 0.04;
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.045, 0.32),
      capeMat,
    );
    cloth.position.z = -0.15;
    const hem = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.06, 0.02, 0.28),
      liningMat,
    );
    hem.position.set(0, -0.03, -0.15);
    seg.add(cloth, hem);
    parent.add(seg);
    parent = seg;
    scarf.push(seg);
  }

  // Satchel + flap + strapped bedroll on the right hip.
  const satchel = new THREE.Group();
  satchel.name = 'satchel';
  satchel.position.set(0.38, 0.95, 0.06);
  satchel.rotation.z = -0.06;
  const pouch = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.28, 0.15),
    brownMat,
  );
  const satchelFlap = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.1, 0.16),
    goldMat,
  );
  satchelFlap.position.y = 0.12;
  const bedroll = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.09, 0.3, 4, 10),
    rollMat,
  );
  bedroll.name = 'bedroll';
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.y = 0.26;
  const strapWrapGeo = new THREE.TorusGeometry(0.095, 0.02, 6, 12);
  const wrapL = new THREE.Mesh(strapWrapGeo, darkMat);
  wrapL.rotation.y = Math.PI / 2;
  wrapL.position.set(-0.1, 0.26, 0);
  const wrapR = new THREE.Mesh(strapWrapGeo, darkMat);
  wrapR.rotation.y = Math.PI / 2;
  wrapR.position.set(0.1, 0.26, 0);
  satchel.add(pouch, satchelFlap, bedroll, wrapL, wrapR);
  body.add(satchel);

  // Arms: shoulder pivots with sleeves + skin forearms + mittens.
  const makeArm = (side: 1 | -1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.42, 1.38, 0);
    const sleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.18, 4, 8),
      tunicMat,
    );
    sleeve.position.y = -0.15;
    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.035, 6, 10),
      goldMat,
    );
    cuff.position.y = -0.28;
    cuff.rotation.x = Math.PI / 2;
    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.07, 0.1, 4, 8),
      skinMat,
    );
    forearm.position.y = -0.36;
    const mitten = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 8),
      mittenMat,
    );
    mitten.position.y = -0.5;
    mitten.scale.set(1.1, 1.25, 1.0);
    const thumb = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      mittenMat,
    );
    thumb.position.set(side * -0.09, -0.48, 0.03);
    pivot.add(sleeve, cuff, forearm, mitten, thumb);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  body.add(armL, armR);

  // Legs: hip pivots with trousers + cuffed boots.
  const makeLeg = (side: 1 | -1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.16, 0.85, 0);
    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.13, 0.22, 4, 8),
      darkMat,
    );
    thigh.position.y = -0.2;
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.12, 0.28, 10),
      brownMat,
    );
    shin.position.y = -0.48;
    const bootCuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.04, 6, 12),
      cuffMat,
    );
    bootCuff.position.y = -0.35;
    bootCuff.rotation.x = Math.PI / 2;
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.33),
      brownMat,
    );
    foot.position.set(0, -0.68, 0.05);
    pivot.add(thigh, shin, bootCuff, foot);
    return pivot;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);
  body.add(legL, legR);

  group.traverse((o: THREE.Object3D) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return { group, body, legL, legR, armL, armR, scarf, eyeL, eyeR };
}
