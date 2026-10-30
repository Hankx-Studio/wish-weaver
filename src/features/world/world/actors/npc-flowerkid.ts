import * as THREE from 'three';
import type { ToonFactory } from '../sky';

export interface NpcLookAt {
  yaw: number;
  pitch: number;
}

const defaultToon: ToonFactory = (color: number) =>
  new THREE.MeshToonMaterial({ color });

function lookTarget(g: THREE.Group): NpcLookAt {
  const v = (g.userData as { lookAt?: unknown }).lookAt as
    | NpcLookAt
    | undefined;
  const yaw = typeof v?.yaw === 'number' && Number.isFinite(v.yaw) ? v.yaw : 0;
  const pitch =
    typeof v?.pitch === 'number' && Number.isFinite(v.pitch) ? v.pitch : 0;
  return {
    yaw: THREE.MathUtils.clamp(yaw, -0.7, 0.7),
    pitch: THREE.MathUtils.clamp(pitch, -0.45, 0.45),
  };
}

function shadowed(root: THREE.Object3D): void {
  root.traverse((o: THREE.Object3D) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

// Small gardener child (~1.0 tall, big-head proportions).
// Feet origin, faces +Z. Original design: straw hat with flowers,
// yellow shirt, green overalls, boots, watering can held in front.
export function createFlowerKid(toon: ToonFactory = defaultToon): THREE.Group {
  const g = new THREE.Group();
  g.name = 'flowerkid';
  const body = new THREE.Group();
  body.name = 'body';
  g.add(body);

  const skin = toon(0xf2c49b);
  const shirt = toon(0xe8c95c);
  const overall = toon(0x5e8a5a);
  const overallDark = toon(0x4c7350);
  const bootMat = toon(0x7a5a3a);
  const straw = toon(0xd9b36a);
  const bandMat = toon(0x8a6242);
  const hairMat = toon(0xd9a95e);
  const canMat = toon(0x7fa3b0);
  const pinkMat = toon(0xe88aa8);
  const yellowMat = toon(0xf2d06b);
  const leafMat = toon(0x5e8a4e);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2118 });
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf0a0a0 });

  // Boots + overall legs.
  const bootGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.14, 8);
  const legGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.22, 8);
  for (const s of [-1, 1]) {
    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(s * 0.09, 0.07, 0.01);
    const toe = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      bootMat,
    );
    toe.position.set(s * 0.09, 0.04, 0.08);
    const leg = new THREE.Mesh(legGeo, overall);
    leg.name = s < 0 ? 'legL' : 'legR';
    leg.position.set(s * 0.09, 0.25, 0);
    body.add(boot, toe, leg);
  }

  // Overall torso: bib + waist + straps + buttons.
  const waist = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.16, 0.18, 10),
    overall,
  );
  waist.position.y = 0.44;
  const bib = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.06),
    overall,
  );
  bib.name = 'bib';
  bib.position.set(0, 0.52, 0.13);
  const shirtBack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.15, 0.18, 10),
    shirt,
  );
  shirtBack.position.y = 0.55;
  const strapGeo = new THREE.BoxGeometry(0.06, 0.16, 0.03);
  const strapL = new THREE.Mesh(strapGeo, overallDark);
  strapL.position.set(-0.09, 0.62, 0.12);
  const strapR = new THREE.Mesh(strapGeo, overallDark);
  strapR.position.set(0.09, 0.62, 0.12);
  const buttonGeo = new THREE.SphereGeometry(0.018, 6, 6);
  const btnL = new THREE.Mesh(buttonGeo, bandMat);
  btnL.position.set(-0.09, 0.58, 0.16);
  const btnR = new THREE.Mesh(buttonGeo, bandMat);
  btnR.position.set(0.09, 0.58, 0.16);
  const patch = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.07, 0.02),
    straw,
  );
  patch.position.set(0.09, 0.42, 0.155);
  patch.rotation.z = 0.15;
  body.add(waist, bib, shirtBack, strapL, strapR, btnL, btnR, patch);

  // Arms reach forward to hold the watering can.
  const sleeveGeo = new THREE.SphereGeometry(0.07, 8, 8);
  const armGeo = new THREE.CapsuleGeometry(0.05, 0.14, 4, 8);
  const handGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const makeArm = (side: 1 | -1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.name = side < 0 ? 'armL' : 'armR';
    pivot.position.set(side * 0.19, 0.58, 0.02);
    const sleeve = new THREE.Mesh(sleeveGeo, shirt);
    sleeve.position.y = -0.02;
    const arm = new THREE.Mesh(armGeo, skin);
    arm.position.set(side * -0.04, -0.14, 0.1);
    arm.rotation.x = -0.9;
    const hand = new THREE.Mesh(handGeo, skin);
    hand.position.set(side * -0.07, -0.2, 0.2);
    pivot.add(sleeve, arm, hand);
    return pivot;
  };
  body.add(makeArm(-1), makeArm(1));

  // Big child head on a look-at pivot.
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.66, 0);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), skin);
  face.name = 'face';
  face.position.y = 0.1;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), skin);
  nose.name = 'nose';
  nose.position.set(0, 0.08, 0.15);
  const eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.058, 0.12, 0.125);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.058, 0.12, 0.125);
  const sparkGeo = new THREE.SphereGeometry(0.01, 6, 6);
  for (const eye of [eyeL, eyeR]) {
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.set(0.011, 0.011, 0.024);
    eye.add(spark);
  }
  const blushGeo = new THREE.SphereGeometry(0.026, 8, 8);
  const blushL = new THREE.Mesh(blushGeo, blushMat);
  blushL.position.set(-0.095, 0.05, 0.11);
  const blushR = new THREE.Mesh(blushGeo, blushMat);
  blushR.position.set(0.095, 0.05, 0.11);
  // Blonde curls peeking under the hat.
  const curlGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const curlSpots: Array<[number, number, number]> = [
    [-0.13, 0.1, 0.05],
    [0.13, 0.1, 0.05],
    [-0.12, 0.08, -0.07],
    [0.12, 0.08, -0.07],
    [0, 0.06, -0.13],
  ];
  const curls = new THREE.Group();
  curls.name = 'curls';
  for (const [cx, cy, cz] of curlSpots) {
    const curl = new THREE.Mesh(curlGeo, hairMat);
    curl.position.set(cx, cy, cz);
    curls.add(curl);
  }
  head.add(face, nose, eyeL, eyeR, blushL, blushR, curls);

  // Straw hat: wide brim + dome + band + flower cluster.
  const hat = new THREE.Group();
  hat.name = 'hat';
  hat.position.y = 0.19;
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.27, 0.025, 14),
    straw,
  );
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, 1.4),
    straw,
  );
  crown.position.y = 0.01;
  crown.scale.set(1, 0.85, 1);
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.025, 6, 14),
    bandMat,
  );
  band.position.y = 0.02;
  band.rotation.x = Math.PI / 2;
  hat.add(brim, crown, band);
  const flowers = new THREE.Group();
  flowers.name = 'flowers';
  const petalGeo = new THREE.SphereGeometry(0.028, 6, 6);
  const centerGeo = new THREE.SphereGeometry(0.014, 6, 6);
  const flowerSpots: Array<[number, number, number, THREE.Material]> = [
    [0.14, 0.03, 0.1, pinkMat],
    [0.18, 0.025, 0.02, yellowMat],
    [0.12, 0.03, -0.06, pinkMat],
  ];
  for (const [fx, fy, fz, mat] of flowerSpots) {
    const bloom = new THREE.Mesh(petalGeo, mat);
    bloom.position.set(fx, fy, fz);
    const center = new THREE.Mesh(centerGeo, leafMat);
    center.position.set(fx, fy + 0.022, fz);
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 6, 6),
      leafMat,
    );
    leaf.position.set(fx - 0.04, fy - 0.01, fz + 0.02);
    leaf.scale.set(1.4, 0.5, 0.8);
    flowers.add(bloom, center, leaf);
  }
  hat.add(flowers);
  head.add(hat);
  body.add(head);

  // Watering can held in front with both hands.
  const can = new THREE.Group();
  can.name = 'wateringCan';
  can.position.set(0, 0.38, 0.3);
  const canBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.15, 10),
    canMat,
  );
  const canRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.015, 6, 12),
    canMat,
  );
  canRim.position.y = 0.075;
  canRim.rotation.x = Math.PI / 2;
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.03, 0.2, 8),
    canMat,
  );
  spout.position.set(0.1, 0.06, 0.05);
  spout.rotation.z = -1.0;
  const rose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.03, 0.04, 8),
    canMat,
  );
  rose.position.set(0.19, 0.1, 0.05);
  rose.rotation.z = -1.0;
  const canHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.014, 6, 12, Math.PI),
    canMat,
  );
  canHandle.position.set(-0.02, 0.05, -0.08);
  canHandle.rotation.y = Math.PI / 2;
  const bloom = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 6, 6),
    pinkMat,
  );
  bloom.position.set(0.03, 0.02, 0.095);
  can.add(canBody, canRim, spout, rose, canHandle, bloom);
  body.add(can);

  shadowed(g);
  return g;
}

// Idle: bouncy kid sway + can tilt + head look-at.
// Never throws on an empty group.
export function updateFlowerKid(g: THREE.Group, t: number, dt: number): void {
  void dt;
  const time = Number.isFinite(t) ? t : 0;
  const body = g.getObjectByName('body');
  if (body) {
    body.position.y = Math.abs(Math.sin(time * 2.6)) * 0.03;
    body.rotation.z = Math.sin(time * 1.9) * 0.03;
    body.rotation.y = Math.sin(time * 0.6) * 0.08;
  }
  const armL = g.getObjectByName('armL');
  if (armL) armL.rotation.x = Math.sin(time * 2.6) * 0.08;
  const armR = g.getObjectByName('armR');
  if (armR) armR.rotation.x = Math.sin(time * 2.6 + 0.5) * 0.08;
  const can = g.getObjectByName('wateringCan');
  if (can) {
    can.rotation.z = Math.sin(time * 2.2 + 0.8) * 0.07;
    can.rotation.x = Math.sin(time * 1.5) * 0.04;
  }
  const head = g.getObjectByName('head');
  if (head) {
    const look = lookTarget(g);
    head.rotation.y = look.yaw + Math.sin(time * 1.0) * 0.1;
    head.rotation.x = look.pitch + Math.sin(time * 1.4) * 0.04;
  }
}
