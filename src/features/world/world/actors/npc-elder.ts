import * as THREE from 'three';

// Elder villager (~1.7 tall): white ponytail + bun, beard, spectacles,
// rust shawl over a patched brown coat, wooden staff with a hanging lantern.
// Feet origin, faces +Z. All toon-shaded primitives; no textures.

function toon(color: number): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color });
}

const skin = (): THREE.MeshToonMaterial => toon(0xf0c39a);
const hair = (): THREE.MeshToonMaterial => toon(0xe8e8e6);
const coat = (): THREE.MeshToonMaterial => toon(0x6e4a33);
const coatDark = (): THREE.MeshToonMaterial => toon(0x5a3a28);
const shawl = (): THREE.MeshToonMaterial => toon(0xc2682f);
const trouser = (): THREE.MeshToonMaterial => toon(0x4a3b30);
const boot = (): THREE.MeshToonMaterial => toon(0x4e3423);
const wood = (): THREE.MeshToonMaterial => toon(0x6b4a2e);
const patch = (): THREE.MeshToonMaterial => toon(0xc9a06a);
const frame = (): THREE.MeshToonMaterial => toon(0x3a2c22);
const leaf = (): THREE.MeshToonMaterial => toon(0x6f9a5a);

function shadowed(root: THREE.Object3D): void {
  root.traverse((o: THREE.Object3D) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

export function createElder(): THREE.Group {
  const skinMat = skin();
  const hairMat = hair();
  const coatMat = coat();
  const coatDarkMat = coatDark();
  const shawlMat = shawl();
  const trouserMat = trouser();
  const bootMat = boot();
  const woodMat = wood();
  const patchMat = patch();
  const frameMat = frame();
  const leafMat = leaf();
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2320 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd489 });

  const g = new THREE.Group();
  g.name = 'npcElder';

  const body = new THREE.Group();
  body.name = 'body';
  g.add(body);

  // Boots + legs ---------------------------------------------------------
  const bootGeo = new THREE.BoxGeometry(0.16, 0.14, 0.28);
  const legGeo = new THREE.CylinderGeometry(0.1, 0.11, 0.42, 8);
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(bootGeo, bootMat);
    b.position.set(s * 0.13, 0.07, 0.03);
    const leg = new THREE.Mesh(legGeo, trouserMat);
    leg.position.set(s * 0.13, 0.34, 0);
    body.add(b, leg);
  }
  const legL = new THREE.Group();
  legL.name = 'legL';
  legL.position.set(-0.13, 0.55, 0);
  const legR = new THREE.Group();
  legR.name = 'legR';
  legR.position.set(0.13, 0.55, 0);
  body.add(legL, legR);

  // Long patched coat -----------------------------------------------------
  const coatMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.46, 1.0, 12),
    coatMat,
  );
  coatMesh.name = 'coat';
  coatMesh.position.y = 0.98;
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 14), coatDarkMat);
  hem.position.y = 0.5;
  hem.rotation.x = Math.PI / 2;
  const shirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.2, 0.72, 8),
    toon(0xd9c9a8),
  );
  shirt.position.set(0, 1.0, 0.22);
  shirt.scale.z = 0.5;
  body.add(coatMesh, hem, shirt);

  const patches = new THREE.Group();
  patches.name = 'patches';
  const patchGeo = new THREE.BoxGeometry(0.12, 0.12, 0.02);
  const patchSpots: Array<[number, number, number, number]> = [
    [-0.3, 0.62, 0.3, 0.5],
    [0.34, 0.78, -0.2, -0.4],
    [0.1, 1.2, -0.31, 0.2],
  ];
  for (const [px, py, pz, ry] of patchSpots) {
    const p = new THREE.Mesh(patchGeo, patchMat);
    p.position.set(px, py, pz);
    p.rotation.y = ry;
    patches.add(p);
  }
  body.add(patches);

  // Rust shawl: shoulder drape + hanging ends ------------------------------
  const shawlGroup = new THREE.Group();
  shawlGroup.name = 'shawl';
  const drape = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.42, 12), shawlMat);
  drape.position.y = 1.38;
  drape.scale.set(1, 1, 0.85);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.07, 8, 12), shawlMat);
  collar.position.y = 1.52;
  collar.rotation.x = Math.PI / 2;
  const endGeo = new THREE.BoxGeometry(0.12, 0.42, 0.04);
  const endL = new THREE.Mesh(endGeo, shawlMat);
  endL.position.set(-0.14, 1.18, 0.33);
  endL.rotation.z = 0.08;
  const endR = new THREE.Mesh(endGeo, shawlMat);
  endR.position.set(0.16, 1.16, 0.32);
  endR.rotation.z = -0.1;
  shawlGroup.add(drape, collar, endL, endR);
  body.add(shawlGroup);

  // Arms: left hangs, right grips the staff --------------------------------
  const sleeveGeo = new THREE.CapsuleGeometry(0.09, 0.24, 4, 8);
  const handGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const armL = new THREE.Group();
  armL.name = 'armL';
  armL.position.set(-0.36, 1.34, 0);
  const sleeveL = new THREE.Mesh(sleeveGeo, coatMat);
  sleeveL.position.y = -0.16;
  const handL = new THREE.Mesh(handGeo, skinMat);
  handL.position.y = -0.38;
  armL.add(sleeveL, handL);
  armL.rotation.z = 0.12;

  const armR = new THREE.Group();
  armR.name = 'armR';
  armR.position.set(0.36, 1.34, 0);
  const sleeveR = new THREE.Mesh(sleeveGeo, coatMat);
  sleeveR.position.set(0.04, -0.14, 0.1);
  sleeveR.rotation.x = -0.5;
  sleeveR.rotation.z = -0.25;
  const handR = new THREE.Mesh(handGeo, skinMat);
  handR.name = 'handR';
  handR.position.set(0.12, -0.3, 0.26);
  armR.add(sleeveR, handR);
  body.add(armL, armR);

  // Head pivot (look-at) ---------------------------------------------------
  const headPivot = new THREE.Group();
  headPivot.name = 'headPivot';
  headPivot.position.set(0, 1.56, 0.02);
  body.add(headPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), skinMat);
  head.name = 'head';
  head.position.y = 0.1;
  headPivot.add(head);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), skinMat);
  nose.position.set(0, 0.09, 0.2);
  const earGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const earL = new THREE.Mesh(earGeo, skinMat);
  earL.position.set(-0.2, 0.1, 0);
  const earR = new THREE.Mesh(earGeo, skinMat);
  earR.position.set(0.2, 0.1, 0);
  headPivot.add(nose, earL, earR);

  // White hair: cap + top bun + low ponytail -------------------------------
  const hairGroup = new THREE.Group();
  hairGroup.name = 'hair';
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.215, 14, 12), hairMat);
  cap.position.set(0, 0.16, -0.03);
  cap.scale.set(1, 0.9, 1);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), hairMat);
  bun.name = 'bun';
  bun.position.set(0, 0.3, -0.1);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 6, 10), shawlMat);
  tie.position.set(0, 0.1, -0.22);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 4, 8), hairMat);
  tail.name = 'ponytail';
  tail.position.set(0, -0.08, -0.26);
  tail.rotation.x = 0.25;
  hairGroup.add(cap, bun, tie, tail);
  headPivot.add(hairGroup);

  // Beard + spectacles + eyes -----------------------------------------------
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 10), hairMat);
  beard.name = 'beard';
  beard.position.set(0, -0.08, 0.12);
  beard.rotation.x = Math.PI;
  beard.scale.z = 0.7;
  headPivot.add(beard);

  const glasses = new THREE.Group();
  glasses.name = 'glasses';
  const rimGeo = new THREE.TorusGeometry(0.05, 0.012, 6, 12);
  const rimL = new THREE.Mesh(rimGeo, frameMat);
  rimL.position.set(-0.08, 0.13, 0.185);
  const rimR = new THREE.Mesh(rimGeo, frameMat);
  rimR.position.set(0.08, 0.13, 0.185);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.015), frameMat);
  bridge.position.set(0, 0.13, 0.185);
  glasses.add(rimL, rimR, bridge);
  headPivot.add(glasses);

  const eyeGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.08, 0.13, 0.175);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.08, 0.13, 0.175);
  headPivot.add(eyeL, eyeR);

  // Staff with hanging lantern (held in right hand) -------------------------
  const staff = new THREE.Group();
  staff.name = 'staff';
  staff.position.set(0.5, 0, 0.28);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.5, 8), woodMat);
  pole.position.y = 0.75;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), woodMat);
  knob.position.y = 1.52;
  staff.add(pole, knob);
  const leafGeo = new THREE.SphereGeometry(0.045, 6, 5);
  const leafSpots: Array<[number, number]> = [
    [0.05, 0.7],
    [-0.05, 1.0],
    [0.05, 1.25],
  ];
  for (const [lx, ly] of leafSpots) {
    const lf = new THREE.Mesh(leafGeo, leafMat);
    lf.position.set(lx, ly, 0);
    lf.scale.set(1.4, 0.5, 0.8);
    staff.add(lf);
  }

  const lantern = new THREE.Group();
  lantern.name = 'lantern';
  lantern.position.set(0, 1.32, 0.1);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.12), frameMat);
  hook.position.set(0, 0.1, -0.04);
  const cage = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), frameMat);
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.08), glowMat);
  core.name = 'lanternCore';
  const lid = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.07, 4), frameMat);
  lid.position.y = 0.115;
  lid.rotation.y = Math.PI / 4;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.11), frameMat);
  base.position.y = -0.095;
  lantern.add(hook, cage, core, lid, base);
  staff.add(lantern);
  g.add(staff);

  shadowed(g);
  return g;
}

export interface ElderLookAt {
  yaw: number;
  pitch: number;
}

/** Idle sway + staff-side lean; honors `group.userData.lookAt` for the head. Pure; safe on an empty group. */
export function updateElder(g: THREE.Group, t: number, _dt: number): void {
  const body = g.getObjectByName('body');
  if (body) {
    body.rotation.z = Math.sin(t * 0.9) * 0.02;
    body.rotation.y = Math.sin(t * 0.5) * 0.03;
    body.position.y = Math.sin(t * 1.8) * 0.012;
  }
  const armL = g.getObjectByName('armL');
  if (armL) armL.rotation.x = Math.sin(t * 0.9) * 0.06;
  const armR = g.getObjectByName('armR');
  if (armR) armR.rotation.x = Math.sin(t * 0.9 + 1.2) * 0.03;
  const shawlEnd = g.getObjectByName('shawl');
  if (shawlEnd) shawlEnd.rotation.x = Math.sin(t * 1.3) * 0.02;
  const lantern = g.getObjectByName('lantern');
  if (lantern) {
    lantern.rotation.x = Math.sin(t * 1.7) * 0.08;
    lantern.rotation.z = Math.sin(t * 1.3 + 0.6) * 0.08;
  }
  const head = g.getObjectByName('headPivot');
  if (head) {
    const look = (g.userData?.lookAt ?? {}) as Partial<ElderLookAt>;
    const yaw = THREE.MathUtils.clamp(look.yaw ?? 0, -0.9, 0.9);
    const pitch = THREE.MathUtils.clamp(look.pitch ?? 0, -0.5, 0.5);
    head.rotation.y = yaw + Math.sin(t * 0.6) * 0.04;
    head.rotation.x = pitch + Math.sin(t * 1.1) * 0.02;
  }
}
