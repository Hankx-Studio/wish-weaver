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

// Tall guide with glasses (~1.85 tall). Feet origin, faces +Z.
// Original design: cream shirt, navy vest with gold buttons, bow tie,
// dark trousers, brass lantern with a warm light held in the right hand.
export function createButler(toon: ToonFactory = defaultToon): THREE.Group {
  const g = new THREE.Group();
  g.name = 'butler';
  const body = new THREE.Group();
  body.name = 'body';
  g.add(body);

  const skin = toon(0xf2c49b);
  const shirt = toon(0xf0e8d8);
  const vest = toon(0x2b3a5e);
  const trouser = toon(0x232838);
  const gold = toon(0xc9a24a);
  const brass = toon(0xb08a3e);
  const hairMat = toon(0x1d1f26);
  const shoeMat = toon(0x1a1c22);
  const frameMat = toon(0x3a3f4a);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2118 });
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd489 });

  // Shoes + long trouser legs.
  const shoeGeo = new THREE.BoxGeometry(0.13, 0.09, 0.26);
  const legGeo = new THREE.CylinderGeometry(0.1, 0.085, 0.85, 10);
  for (const s of [-1, 1]) {
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(s * 0.13, 0.045, 0.05);
    const leg = new THREE.Mesh(legGeo, trouser);
    leg.name = s < 0 ? 'legL' : 'legR';
    leg.position.set(s * 0.13, 0.5, 0);
    body.add(shoe, leg);
  }
  const hips = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.2, 0.25, 10),
    trouser,
  );
  hips.position.y = 0.95;
  body.add(hips);

  // Shirt torso + navy vest + gold buttons.
  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.23, 0.55, 12),
    shirt,
  );
  chest.name = 'torso';
  chest.position.y = 1.28;
  body.add(chest);
  const vestGroup = new THREE.Group();
  vestGroup.name = 'vest';
  const vestL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.06), vest);
  vestL.position.set(-0.11, 1.28, 0.19);
  vestL.rotation.y = 0.15;
  const vestR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.06), vest);
  vestR.position.set(0.11, 1.28, 0.19);
  vestR.rotation.y = -0.15;
  const vestBack = new THREE.Mesh(
    // Open shell: gap centered on +Z where the shirt front shows.
    new THREE.CylinderGeometry(0.225, 0.245, 0.52, 12, 1, true, Math.PI * 0.3, Math.PI * 1.4),
    vest,
  );
  vestBack.position.y = 1.28;
  vestGroup.add(vestL, vestR, vestBack);
  const buttonGeo = new THREE.SphereGeometry(0.02, 8, 8);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(buttonGeo, gold);
    b.position.set(0.045, 1.1 + i * 0.11, 0.225);
    vestGroup.add(b);
  }
  body.add(vestGroup);

  // Bow tie: two wings + center knot.
  const bowtie = new THREE.Group();
  bowtie.name = 'bowtie';
  bowtie.position.set(0, 1.52, 0.2);
  const wingGeo = new THREE.ConeGeometry(0.055, 0.1, 4);
  const wingL = new THREE.Mesh(wingGeo, vest);
  wingL.rotation.z = Math.PI / 2;
  wingL.position.x = -0.07;
  const wingR = new THREE.Mesh(wingGeo, vest);
  wingR.rotation.z = -Math.PI / 2;
  wingR.position.x = 0.07;
  const knot = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.04),
    vest,
  );
  bowtie.add(wingL, wingR, knot);
  body.add(bowtie);

  // Arms: shirt sleeves + hands; right hand carries the lantern.
  const sleeveGeo = new THREE.CapsuleGeometry(0.075, 0.3, 4, 8);
  const handGeo = new THREE.SphereGeometry(0.07, 8, 8);
  const makeArm = (side: 1 | -1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.name = side < 0 ? 'armL' : 'armR';
    pivot.position.set(side * 0.29, 1.46, 0);
    const sleeve = new THREE.Mesh(sleeveGeo, shirt);
    sleeve.position.y = -0.2;
    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.06, 8),
      shirt,
    );
    cuff.position.y = -0.4;
    const hand = new THREE.Mesh(handGeo, skin);
    hand.position.y = -0.5;
    pivot.add(sleeve, cuff, hand);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  armL.rotation.z = 0.08;
  armR.rotation.z = -0.14;
  body.add(armL, armR);

  // Head pivot (look-at) with hair, glasses, and face.
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.56, 0);
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8),
    skin,
  );
  neck.position.y = -0.02;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), skin);
  face.name = 'face';
  face.position.y = 0.12;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), skin);
  nose.name = 'nose';
  nose.position.set(0, 0.1, 0.15);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 10, 0, Math.PI * 2, 0, 1.7),
    hairMat,
  );
  hair.name = 'hair';
  hair.position.set(0, 0.14, -0.02);
  hair.rotation.x = -0.3;
  const eyeGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.06, 0.13, 0.13);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.06, 0.13, 0.13);
  const sparkGeo = new THREE.SphereGeometry(0.009, 6, 6);
  for (const eye of [eyeL, eyeR]) {
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.set(0.01, 0.01, 0.024);
    eye.add(spark);
  }
  head.add(neck, face, nose, hair, eyeL, eyeR);

  // Round spectacles: rims + bridge + temples.
  const glasses = new THREE.Group();
  glasses.name = 'glasses';
  const rimGeo = new THREE.TorusGeometry(0.05, 0.008, 6, 14);
  const rimL = new THREE.Mesh(rimGeo, frameMat);
  rimL.position.set(-0.06, 0.13, 0.135);
  const rimR = new THREE.Mesh(rimGeo, frameMat);
  rimR.position.set(0.06, 0.13, 0.135);
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.008, 0.008),
    frameMat,
  );
  bridge.position.set(0, 0.135, 0.135);
  const templeGeo = new THREE.BoxGeometry(0.008, 0.008, 0.12);
  const templeL = new THREE.Mesh(templeGeo, frameMat);
  templeL.position.set(-0.11, 0.135, 0.08);
  const templeR = new THREE.Mesh(templeGeo, frameMat);
  templeR.position.set(0.11, 0.135, 0.08);
  glasses.add(rimL, rimR, bridge, templeL, templeR);
  head.add(glasses);
  body.add(head);

  // Brass lantern hanging from the right hand.
  const lantern = new THREE.Group();
  lantern.name = 'lantern';
  lantern.position.set(0.42, 0.72, 0.08);
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.012, 6, 12, Math.PI),
    brass,
  );
  handle.position.y = 0.2;
  const capTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.075, 0.06, 8),
    brass,
  );
  capTop.position.y = 0.15;
  const cage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffe2b0,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  cage.position.y = 0.04;
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.1, 8),
    glowMat,
  );
  core.name = 'flame';
  core.position.y = 0.02;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.06, 0.05, 8),
    brass,
  );
  base.position.y = -0.065;
  const barGeo = new THREE.BoxGeometry(0.014, 0.2, 0.014);
  for (const [bx, bz] of [[-0.06, 0], [0.06, 0], [0, -0.06]] as const) {
    const bar = new THREE.Mesh(barGeo, brass);
    bar.position.set(bx, 0.04, bz);
    lantern.add(bar);
  }
  const lamp = new THREE.PointLight(0xffbe78, 4, 5, 2);
  lamp.name = 'lamp';
  lamp.position.y = 0.04;
  lantern.add(handle, capTop, cage, core, base, lamp);
  body.add(lantern);

  shadowed(g);
  return g;
}

// Idle: upright breathing sway + lantern swing + head look-at.
// Never throws on an empty group.
export function updateButler(g: THREE.Group, t: number, dt: number): void {
  void dt;
  const time = Number.isFinite(t) ? t : 0;
  const body = g.getObjectByName('body');
  if (body) {
    body.position.y = Math.sin(time * 1.8) * 0.015;
    body.rotation.z = Math.sin(time * 1.1) * 0.015;
    body.rotation.y = Math.sin(time * 0.45) * 0.06;
  }
  const armL = g.getObjectByName('armL');
  if (armL) armL.rotation.x = Math.sin(time * 1.8) * 0.05;
  const armR = g.getObjectByName('armR');
  if (armR) armR.rotation.x = Math.sin(time * 1.8 + 0.4) * 0.04;
  const lantern = g.getObjectByName('lantern');
  if (lantern) {
    lantern.rotation.z = Math.sin(time * 2.2) * 0.08;
    lantern.rotation.x = Math.sin(time * 1.6 + 0.5) * 0.05;
  }
  const lamp = g.getObjectByName('lamp');
  if (lamp && (lamp as THREE.PointLight).isPointLight) {
    (lamp as THREE.PointLight).intensity = 4 + Math.sin(time * 7.3) * 0.5;
  }
  const head = g.getObjectByName('head');
  if (head) {
    const look = lookTarget(g);
    head.rotation.y = look.yaw + Math.sin(time * 0.7) * 0.07;
    head.rotation.x = look.pitch + Math.sin(time * 1.0) * 0.025;
  }
}
