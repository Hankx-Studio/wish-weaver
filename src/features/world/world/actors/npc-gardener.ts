import * as THREE from 'three';

// Gardener villager (~1.75 tall): straw flat cap, denim shirt with rolled
// sleeves, suspenders, tool belt, work boots; holds a shovel, with a crate
// of flowers at his side. Feet origin, faces +Z. Toon-shaded primitives.

function toon(color: number): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color });
}

export function createGardener(): THREE.Group {
  const skinMat = toon(0xe8b088);
  const denimMat = toon(0x5b7d9a);
  const denimLightMat = toon(0x8ba3b5);
  const strapMat = toon(0x6b6a4a);
  const pantsMat = toon(0x7a5c42);
  const beltMat = toon(0x5a3e28);
  const bootMat = toon(0x4e3423);
  const capMat = toon(0xc9a75a);
  const hairMat = toon(0x4a3120);
  const woodMat = toon(0x8a6238);
  const steelMat = toon(0x8f959c);
  const darkMat = toon(0x2b2620);
  const crateMat = toon(0x9a7448);
  const stemMat = toon(0x5d8a4a);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2320 });

  const g = new THREE.Group();
  g.name = 'npcGardener';

  const body = new THREE.Group();
  body.name = 'body';
  g.add(body);

  // Boots + work pants ------------------------------------------------------
  const bootGeo = new THREE.BoxGeometry(0.17, 0.15, 0.3);
  const legGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.5, 8);
  const cuffGeo = new THREE.TorusGeometry(0.12, 0.035, 6, 10);
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(bootGeo, bootMat);
    b.position.set(s * 0.14, 0.075, 0.03);
    const leg = new THREE.Mesh(legGeo, pantsMat);
    leg.position.set(s * 0.14, 0.42, 0);
    const cuff = new THREE.Mesh(cuffGeo, pantsMat);
    cuff.position.set(s * 0.14, 0.2, 0);
    cuff.rotation.x = Math.PI / 2;
    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.03), pantsMat);
    knee.position.set(s * 0.14, 0.5, 0.12);
    body.add(b, leg, cuff, knee);
  }
  const legL = new THREE.Group();
  legL.name = 'legL';
  legL.position.set(-0.14, 0.67, 0);
  const legR = new THREE.Group();
  legR.name = 'legR';
  legR.position.set(0.14, 0.67, 0);
  body.add(legL, legR);

  // Denim torso + suspenders -------------------------------------------------
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.33, 0.62, 12),
    denimMat,
  );
  torso.name = 'torso';
  torso.position.y = 1.02;
  body.add(torso);

  const suspenders = new THREE.Group();
  suspenders.name = 'suspenders';
  const strapGeoF = new THREE.BoxGeometry(0.09, 0.55, 0.03);
  for (const s of [-1, 1]) {
    const strap = new THREE.Mesh(strapGeoF, strapMat);
    strap.position.set(s * 0.17, 1.04, 0.3);
    const back = new THREE.Mesh(strapGeoF, strapMat);
    back.position.set(s * 0.17, 1.04, -0.3);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), beltMat);
    buckle.position.set(s * 0.17, 0.82, 0.32);
    suspenders.add(strap, back, buckle);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.03), strapMat);
  cross.position.set(0, 1.2, -0.3);
  cross.rotation.z = Math.PI / 4;
  suspenders.add(cross);
  body.add(suspenders);

  // Tool belt with pouches + shears ------------------------------------------
  const belt = new THREE.Group();
  belt.name = 'belt';
  const beltRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 14), beltMat);
  beltRing.position.y = 0.72;
  beltRing.rotation.x = Math.PI / 2;
  belt.add(beltRing);
  const pouchGeo = new THREE.BoxGeometry(0.12, 0.16, 0.1);
  for (const s of [-1, 1]) {
    const pouch = new THREE.Mesh(pouchGeo, beltMat);
    pouch.position.set(s * 0.34, 0.66, 0.05);
    belt.add(pouch);
  }
  const shears = new THREE.Group();
  shears.name = 'shears';
  shears.position.set(-0.34, 0.82, 0.05);
  const bladeGeo = new THREE.BoxGeometry(0.03, 0.14, 0.02);
  const bladeL = new THREE.Mesh(bladeGeo, steelMat);
  bladeL.position.x = -0.02;
  bladeL.rotation.z = 0.15;
  const bladeR = new THREE.Mesh(bladeGeo, steelMat);
  bladeR.position.x = 0.02;
  bladeR.rotation.z = -0.15;
  const grip = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 8), darkMat);
  grip.position.y = -0.09;
  shears.add(bladeL, bladeR, grip);
  belt.add(shears);
  body.add(belt);

  // Arms with rolled sleeves --------------------------------------------------
  const sleeveGeo = new THREE.CapsuleGeometry(0.105, 0.16, 4, 8);
  const rollGeo = new THREE.TorusGeometry(0.1, 0.04, 6, 10);
  const foreGeo = new THREE.CapsuleGeometry(0.075, 0.12, 4, 8);
  const handGeo = new THREE.SphereGeometry(0.085, 8, 8);
  const makeArm = (s: 1 | -1): THREE.Group => {
    const arm = new THREE.Group();
    arm.name = s < 0 ? 'armL' : 'armR';
    arm.position.set(s * 0.4, 1.26, 0);
    const sleeve = new THREE.Mesh(sleeveGeo, denimMat);
    sleeve.position.y = -0.13;
    const roll = new THREE.Mesh(rollGeo, denimLightMat);
    roll.name = s < 0 ? 'sleeveRollL' : 'sleeveRollR';
    roll.position.y = -0.24;
    roll.rotation.x = Math.PI / 2;
    const fore = new THREE.Mesh(foreGeo, skinMat);
    fore.position.y = -0.35;
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.y = -0.5;
    arm.add(sleeve, roll, fore, hand);
    arm.rotation.z = s * -0.1;
    return arm;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  body.add(armL, armR);

  // Head pivot (look-at) ------------------------------------------------------
  const headPivot = new THREE.Group();
  headPivot.name = 'headPivot';
  headPivot.position.set(0, 1.36, 0.02);
  body.add(headPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), skinMat);
  head.name = 'head';
  head.position.y = 0.14;
  headPivot.add(head);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), skinMat);
  nose.position.set(0, 0.12, 0.2);
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), hairMat);
  hairBack.name = 'hair';
  hairBack.position.set(0, 0.13, -0.06);
  hairBack.scale.set(1, 0.85, 0.9);
  headPivot.add(nose, hairBack);

  const eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.08, 0.16, 0.18);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.08, 0.16, 0.18);
  const browGeo = new THREE.BoxGeometry(0.09, 0.025, 0.02);
  const browL = new THREE.Mesh(browGeo, hairMat);
  browL.position.set(-0.08, 0.24, 0.18);
  const browR = new THREE.Mesh(browGeo, hairMat);
  browR.position.set(0.08, 0.24, 0.18);
  headPivot.add(eyeL, eyeR, browL, browR);

  // Straw flat cap --------------------------------------------------------------
  const hat = new THREE.Group();
  hat.name = 'hat';
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 10), capMat);
  crown.position.y = 0.3;
  crown.scale.set(1, 0.55, 1);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12, 1, false, -Math.PI / 2.4, Math.PI / 1.2), capMat);
  brim.position.set(0, 0.28, 0.16);
  brim.rotation.x = 0.12;
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), capMat);
  button.position.y = 0.42;
  hat.add(crown, brim, button);
  headPivot.add(hat);

  // Shovel gripped in the right hand --------------------------------------------
  const shovel = new THREE.Group();
  shovel.name = 'shovel';
  shovel.position.set(0.52, 0.14, 0.18);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.0, 8), woodMat);
  shaft.position.y = 0.62;
  const gripBar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), darkMat);
  gripBar.position.y = 1.13;
  const gripSideGeo = new THREE.BoxGeometry(0.05, 0.14, 0.05);
  const gripSideL = new THREE.Mesh(gripSideGeo, darkMat);
  gripSideL.position.set(-0.075, 1.05, 0);
  const gripSideR = new THREE.Mesh(gripSideGeo, darkMat);
  gripSideR.position.set(0.075, 1.05, 0);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8), steelMat);
  socket.position.y = 0.14;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.04), steelMat);
  blade.name = 'shovelBlade';
  blade.position.y = 0.02;
  shovel.add(shaft, gripBar, gripSideL, gripSideR, socket, blade);
  shovel.rotation.z = -0.06;
  g.add(shovel);

  // Crate of flowers at his left side --------------------------------------------
  const crate = new THREE.Group();
  crate.name = 'crate';
  crate.position.set(-0.75, 0, 0.3);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.36), crateMat);
  box.position.y = 0.15;
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.4), beltMat);
  rim.position.y = 0.3;
  const soil = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.3), toon(0x4a3426));
  soil.position.y = 0.31;
  crate.add(box, rim, soil);

  const flowers = new THREE.Group();
  flowers.name = 'flowers';
  const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6);
  const bloomGeo = new THREE.IcosahedronGeometry(0.06, 0);
  const bloomMats = [toon(0xe86a8a), toon(0xf2d06b), toon(0xf5f0e6), toon(0xc96ae8)];
  const flowerSpots: Array<[number, number]> = [
    [-0.14, -0.07],
    [0.0, 0.02],
    [0.14, -0.06],
    [-0.02, -0.1],
    [0.1, 0.08],
    [-0.12, 0.08],
  ];
  flowerSpots.forEach(([fx, fz], i) => {
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(fx, 0.42, fz);
    const bloom = new THREE.Mesh(bloomGeo, bloomMats[i % bloomMats.length]!);
    bloom.position.set(fx, 0.54, fz);
    flowers.add(stem, bloom);
  });
  crate.add(flowers);
  g.add(crate);

  g.traverse((o: THREE.Object3D) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

export interface GardenerLookAt {
  yaw: number;
  pitch: number;
}

/** Idle sway + breathing; honors `group.userData.lookAt` for the head. Pure; safe on an empty group. */
export function updateGardener(g: THREE.Group, t: number, _dt: number): void {
  const body = g.getObjectByName('body');
  if (body) {
    body.rotation.z = Math.sin(t * 1.0) * 0.022;
    body.rotation.y = Math.sin(t * 0.45) * 0.04;
    body.position.y = Math.sin(t * 2.0) * 0.014;
    body.scale.y = 1 + Math.sin(t * 2.0) * 0.004;
  }
  const armL = g.getObjectByName('armL');
  if (armL) armL.rotation.x = Math.sin(t * 1.0) * 0.07;
  const armR = g.getObjectByName('armR');
  if (armR) armR.rotation.x = Math.sin(t * 1.0 + 0.9) * 0.05;
  const shovel = g.getObjectByName('shovel');
  if (shovel) shovel.rotation.x = Math.sin(t * 1.0 + 0.9) * 0.02;
  const flowers = g.getObjectByName('flowers');
  if (flowers) flowers.rotation.y = Math.sin(t * 0.8) * 0.05;
  const head = g.getObjectByName('headPivot');
  if (head) {
    const look = (g.userData?.lookAt ?? {}) as Partial<GardenerLookAt>;
    const yaw = THREE.MathUtils.clamp(look.yaw ?? 0, -0.9, 0.9);
    const pitch = THREE.MathUtils.clamp(look.pitch ?? 0, -0.5, 0.5);
    head.rotation.y = yaw + Math.sin(t * 0.7) * 0.05;
    head.rotation.x = pitch + Math.sin(t * 1.2) * 0.02;
  }
}
