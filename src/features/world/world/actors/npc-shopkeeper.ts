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

// Plump baker woman (~1.7 tall). Feet origin, faces +Z.
// Original design: ochre mob cap, cream blouse, sage apron dress with
// straps + pocket, bread basket held in the right hand.
export function createShopkeeper(toon: ToonFactory = defaultToon): THREE.Group {
  const g = new THREE.Group();
  g.name = 'shopkeeper';
  const body = new THREE.Group();
  body.name = 'body';
  g.add(body);

  const skin = toon(0xf2c49b);
  const blouse = toon(0xf0e6d2);
  const apron = toon(0x7a9a5e);
  const apronDark = toon(0x64824d);
  const strap = toon(0x7a5a3a);
  const capMat = toon(0xc8924c);
  const hairMat = toon(0x6b4a2f);
  const wicker = toon(0x9a7040);
  const breadMat = toon(0xd9a05e);
  const appleMat = toon(0xc74a3a);
  const shoeMat = toon(0x5d4632);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2118 });
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf0a0a0 });

  // Shoes + calves.
  const shoeGeo = new THREE.BoxGeometry(0.13, 0.09, 0.24);
  const calfGeo = new THREE.CapsuleGeometry(0.08, 0.3, 4, 8);
  for (const s of [-1, 1]) {
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(s * 0.15, 0.045, 0.04);
    const calf = new THREE.Mesh(calfGeo, skin);
    calf.position.set(s * 0.15, 0.32, 0);
    body.add(shoe, calf);
  }

  // Skirt + plump torso.
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.42, 0.8, 12),
    apronDark,
  );
  skirt.name = 'skirt';
  skirt.position.y = 0.55;
  const torso = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 14, 12),
    blouse,
  );
  torso.name = 'torso';
  torso.position.y = 1.1;
  torso.scale.set(1.05, 0.95, 0.9);
  body.add(skirt, torso);

  // Apron: front bib panel + waist wrap + straps + pocket + belt.
  const apronGroup = new THREE.Group();
  apronGroup.name = 'apron';
  const bib = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.08), apron);
  bib.position.set(0, 1.12, 0.26);
  const waist = new THREE.Mesh(
    new THREE.CylinderGeometry(0.33, 0.38, 0.34, 12, 1, false, -0.7, 1.4),
    apron,
  );
  waist.position.y = 0.82; // arc centered on +Z, opening faces back
  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.04, 6, 14),
    strap,
  );
  belt.position.y = 0.95;
  belt.rotation.x = Math.PI / 2;
  const pocket = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.16, 0.05),
    apronDark,
  );
  pocket.position.set(0, 0.78, 0.36);
  const strapGeo = new THREE.BoxGeometry(0.08, 0.42, 0.04);
  const strapL = new THREE.Mesh(strapGeo, strap);
  strapL.position.set(-0.16, 1.32, 0.2);
  strapL.rotation.x = -0.12;
  const strapR = new THREE.Mesh(strapGeo, strap);
  strapR.position.set(0.16, 1.32, 0.2);
  strapR.rotation.x = -0.12;
  apronGroup.add(bib, waist, belt, pocket, strapL, strapR);
  body.add(apronGroup);

  // Arms: puffed sleeves + forearms; right arm angles out to the basket.
  const sleeveGeo = new THREE.SphereGeometry(0.12, 10, 8);
  const foreGeo = new THREE.CapsuleGeometry(0.06, 0.2, 4, 8);
  const handGeo = new THREE.SphereGeometry(0.07, 8, 8);
  const makeArm = (side: 1 | -1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.name = side < 0 ? 'armL' : 'armR';
    pivot.position.set(side * 0.36, 1.3, 0);
    const sleeve = new THREE.Mesh(sleeveGeo, blouse);
    sleeve.position.y = -0.04;
    const fore = new THREE.Mesh(foreGeo, skin);
    fore.position.y = -0.28;
    const hand = new THREE.Mesh(handGeo, skin);
    hand.position.y = -0.44;
    pivot.add(sleeve, fore, hand);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  armL.rotation.z = 0.12;
  armR.rotation.z = -0.28;
  body.add(armL, armR);

  // Head pivot (look-at) with face, hair, and mob cap.
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.38, 0);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), skin);
  face.name = 'face';
  face.position.y = 0.12;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), skin);
  nose.name = 'nose';
  nose.position.set(0, 0.1, 0.16);
  const eyeGeo = new THREE.SphereGeometry(0.032, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.06, 0.14, 0.135);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.06, 0.14, 0.135);
  const sparkGeo = new THREE.SphereGeometry(0.01, 6, 6);
  const sparkL = new THREE.Mesh(sparkGeo, sparkMat);
  sparkL.position.set(0.012, 0.012, 0.025);
  const sparkR = new THREE.Mesh(sparkGeo, sparkMat);
  sparkR.position.set(0.012, 0.012, 0.025);
  eyeL.add(sparkL);
  eyeR.add(sparkR);
  const blushGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const blushL = new THREE.Mesh(blushGeo, blushMat);
  blushL.position.set(-0.1, 0.06, 0.12);
  const blushR = new THREE.Mesh(blushGeo, blushMat);
  blushR.position.set(0.1, 0.06, 0.12);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.165, 12, 10, 0, Math.PI * 2, 0, 1.4),
    hairMat,
  );
  hair.position.y = 0.13;
  hair.rotation.x = -0.25;
  head.add(face, nose, eyeL, eyeR, blushL, blushR, hair);

  // Mob cap: gathered dome + ruffled brim + back knot.
  const cap = new THREE.Group();
  cap.name = 'cap';
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 14, 10, 0, Math.PI * 2, 0, 1.5),
    capMat,
  );
  dome.position.y = 0.16;
  dome.scale.set(1, 0.8, 1);
  const brim = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.05, 8, 16),
    capMat,
  );
  brim.position.y = 0.17;
  brim.rotation.x = Math.PI / 2;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), capMat);
  knot.position.set(0, 0.1, -0.18);
  cap.add(dome, brim, knot);
  head.add(cap);
  body.add(head);

  // Bread basket in the right hand.
  const basket = new THREE.Group();
  basket.name = 'basket';
  basket.position.set(0.52, 0.62, 0.1);
  const tub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.12, 0.16, 10),
    wicker,
  );
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 12), wicker);
  rim.position.y = 0.08;
  rim.rotation.x = Math.PI / 2;
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.02, 6, 12, Math.PI),
    wicker,
  );
  handle.position.y = 0.08;
  const bread = new THREE.Group();
  bread.name = 'bread';
  const baguette = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.045, 0.18, 4, 8),
    breadMat,
  );
  baguette.position.set(-0.05, 0.16, 0);
  baguette.rotation.z = 0.5;
  const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), breadMat);
  loaf.position.set(0.06, 0.14, 0.03);
  loaf.scale.set(1, 0.75, 1);
  const apple = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), appleMat);
  apple.position.set(0.02, 0.13, -0.06);
  bread.add(baguette, loaf, apple);
  basket.add(tub, rim, handle, bread);
  body.add(basket);

  shadowed(g);
  return g;
}

// Idle: gentle breathing sway + basket counter-swing + head look-at.
// Never throws on an empty group.
export function updateShopkeeper(g: THREE.Group, t: number, dt: number): void {
  void dt;
  const time = Number.isFinite(t) ? t : 0;
  const body = g.getObjectByName('body');
  if (body) {
    body.position.y = Math.sin(time * 2) * 0.02;
    body.rotation.z = Math.sin(time * 1.3) * 0.02;
    body.rotation.y = Math.sin(time * 0.5) * 0.05;
  }
  const armL = g.getObjectByName('armL');
  if (armL) armL.rotation.x = Math.sin(time * 2) * 0.06;
  const armR = g.getObjectByName('armR');
  if (armR) armR.rotation.x = Math.sin(time * 2 + 0.6) * 0.05;
  const basket = g.getObjectByName('basket');
  if (basket) basket.rotation.z = Math.sin(time * 1.7 + 1) * 0.06;
  const head = g.getObjectByName('head');
  if (head) {
    const look = lookTarget(g);
    head.rotation.y = look.yaw + Math.sin(time * 0.8) * 0.08;
    head.rotation.x = look.pitch + Math.sin(time * 1.1) * 0.03;
  }
}
