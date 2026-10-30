import * as THREE from 'three';

export interface TravelerRig {
  group: THREE.Group; // feet origin; yaw applied here
  body: THREE.Group; // bob / squash / lean
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  scarf: THREE.Group[];
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

// Detailed chibi traveler from primitives (~2.0 tall). Feet origin, faces +z.
export function buildTraveler(
  toon: (color: number) => THREE.MeshToonMaterial,
): TravelerRig {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const cloakMat = toon(0x2e3a44);
  const skinMat = toon(0xf2c9a0);
  const goldMat = toon(0xd9b36a);
  const darkMat = toon(0x2b2620);
  const brownMat = toon(0x6b4f36);
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf0a0a8 });
  const hairMat = toon(0x5a3d26);

  // Cloak + belt + satchel
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 10), cloakMat);
  cloak.position.y = 1.0;
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.06, 8, 14), brownMat);
  belt.position.y = 1.02;
  belt.rotation.x = Math.PI / 2;
  const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.14), brownMat);
  satchel.position.set(0.34, 0.95, 0.06);
  satchel.rotation.z = -0.08;
  const satchelFlap = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.15), goldMat);
  satchelFlap.position.set(0.34, 1.06, 0.06);
  satchelFlap.rotation.z = -0.08;
  body.add(cloak, belt, satchel, satchelFlap);

  // Head: hood, face, hair fringe, eyes, blush
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), cloakMat);
  hood.position.set(0, 1.82, -0.06);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), skinMat);
  face.position.set(0, 1.78, 0.1);
  const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), hairMat);
  fringe.position.set(0, 1.95, 0.16);
  fringe.scale.set(1, 0.55, 0.7);
  const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, darkMat);
  eyeL.position.set(-0.11, 1.8, 0.36);
  const eyeR = new THREE.Mesh(eyeGeo, darkMat);
  eyeR.position.set(0.11, 1.8, 0.36);
  const blushGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const blushL = new THREE.Mesh(blushGeo, blushMat);
  blushL.position.set(-0.18, 1.71, 0.31);
  const blushR = new THREE.Mesh(blushGeo, blushMat);
  blushR.position.set(0.18, 1.71, 0.31);
  body.add(hood, face, fringe, eyeL, eyeR, blushL, blushR);

  // Scarf: knot + 3 chained flutter segments behind the neck
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), goldMat);
  knot.position.set(0, 1.5, -0.32);
  body.add(knot);
  const scarf: THREE.Group[] = [];
  let parent: THREE.Object3D = body;
  let pz = -0.4;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.position.set(0, 1.48 - i * 0.03, i === 0 ? pz : -0.3);
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.2 - i * 0.03, 0.05, 0.32), goldMat);
    cloth.position.z = -0.15;
    seg.add(cloth);
    parent.add(seg);
    parent = seg;
    scarf.push(seg);
    pz = -0.3;
  }

  // Arms: shoulder pivots with sleeves + hands
  const makeArm = (side: 1 | -1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.44, 1.4, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 4, 8), cloakMat);
    sleeve.position.y = -0.2;
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 10), goldMat);
    cuff.position.y = -0.38;
    cuff.rotation.x = Math.PI / 2;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), skinMat);
    hand.position.y = -0.5;
    pivot.add(sleeve, cuff, hand);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  body.add(armL, armR);

  // Legs: hip pivots with thighs + boots
  const makeLeg = (side: 1 | -1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.16, 0.85, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 4, 8), darkMat);
    thigh.position.y = -0.25;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.34), brownMat);
    boot.position.set(0, -0.68, 0.05);
    pivot.add(thigh, boot);
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
