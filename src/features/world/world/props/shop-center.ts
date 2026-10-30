import * as THREE from 'three';
import type { ToonFactory } from '../sky';

const WOOD = 0x8a6238;
const DARK_WOOD = 0x5f4128;
const TIMBER = 0x4e3520;
const ROOF = 0x4a4640;
const ROOF_EDGE = 0x3a362f;
const STONE = 0x8f8b82;
const CREAM = 0xf3e6c8;
const STRIPE_RED = 0xc1503c;
const GLOW = 0xffc46a;
const LEAF = 0x5f8f4e;

function shadowed(root: THREE.Object3D): void {
  root.traverse((o: THREE.Object3D) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

function glowMat(color = GLOW, opacity = 0.95): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
}

// Timber shop with a red-white striped awning, produce stall, hanging sign,
// and warm glowing windows. Feet origin, front faces +Z, ~5 wide.
export function createShopCenter(toon: ToonFactory): THREE.Group {
  const shop = new THREE.Group();
  shop.name = 'shopCenter';

  const wood = toon(WOOD);
  const darkWood = toon(DARK_WOOD);
  const timber = toon(TIMBER);
  const roofMat = toon(ROOF);
  const roofEdge = toon(ROOF_EDGE);
  const stone = toon(STONE);
  const cream = toon(CREAM);
  const red = toon(STRIPE_RED);
  const leaf = toon(LEAF);

  // Foundation + walls ----------------------------------------------------
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.35, 3.8), stone);
  foundation.name = 'foundation';
  foundation.position.y = 0.175;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 3.4), wood);
  walls.name = 'walls';
  walls.position.y = 1.55;
  shop.add(foundation, walls);

  // Timber frame: corner posts + front beams.
  const postGeo = new THREE.BoxGeometry(0.22, 2.4, 0.22);
  for (const [px, pz] of [[-2.05, 1.65], [2.05, 1.65], [-2.05, -1.65], [2.05, -1.65]]) {
    const post = new THREE.Mesh(postGeo, timber);
    post.position.set(px, 1.55, pz);
    shop.add(post);
  }
  const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.22, 0.18), timber);
  frontBeam.position.set(0, 2.62, 1.72);
  const midBeam = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.18, 0.14), timber);
  midBeam.position.set(0, 1.5, 1.72);
  shop.add(frontBeam, midBeam);

  // Pitched roof: two slabs + ridge + gable triangles ---------------------
  const roof = new THREE.Group();
  roof.name = 'roof';
  shop.add(roof);
  const slabGeo = new THREE.BoxGeometry(4.9, 0.14, 2.35);
  for (const s of [-1, 1]) {
    const slab = new THREE.Mesh(slabGeo, roofMat);
    slab.position.set(0, 3.55, s * 0.95);
    slab.rotation.x = s * 0.62;
    roof.add(slab);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.18, 0.3), roofEdge);
  ridge.name = 'ridge';
  ridge.position.set(0, 4.28, 0);
  roof.add(ridge);
  // Triangular gables (front/back) from an extruded triangle shape.
  const tri = new THREE.Shape();
  tri.moveTo(-2.05, 0);
  tri.lineTo(2.05, 0);
  tri.lineTo(0, 1.35);
  tri.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.18, bevelEnabled: false });
  const gableF = new THREE.Mesh(gableGeo, wood);
  gableF.name = 'gableFront';
  gableF.position.set(0, 2.75, 1.55);
  const gableB = new THREE.Mesh(gableGeo, wood);
  gableB.name = 'gableBack';
  gableB.position.set(0, 2.75, -1.73);
  roof.add(gableF, gableB);

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), stone);
  chimney.name = 'chimney';
  chimney.position.set(-1.4, 4.2, -0.6);
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.8), roofEdge);
  chimneyCap.position.set(-1.4, 5.05, -0.6);
  roof.add(chimney, chimneyCap);

  // Striped awning --------------------------------------------------------
  const awning = new THREE.Group();
  awning.name = 'awning';
  awning.position.set(0, 2.75, 2.35);
  awning.rotation.x = 0.32;
  shop.add(awning);
  const stripeGeo = new THREE.BoxGeometry(0.55, 0.06, 1.9);
  for (let i = 0; i < 8; i++) {
    const stripe = new THREE.Mesh(stripeGeo, i % 2 === 0 ? cream : red);
    stripe.name = `stripe${i}`;
    stripe.position.set(-1.925 + i * 0.55, 0, 0);
    awning.add(stripe);
  }
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.5, 7);
  for (const s of [-1, 1]) {
    const pole = new THREE.Mesh(poleGeo, darkWood);
    pole.position.set(s * 2.05, -1.15, 0.75);
    pole.rotation.x = -0.12;
    awning.add(pole);
  }

  // Door + round front window with warm glow ------------------------------
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.7, 0.12), darkWood);
  door.name = 'door';
  door.position.set(0.75, 1.2, 1.74);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toon(0xd9b36a));
  knob.position.set(0.45, 1.2, 1.82);
  shop.add(door, knob);

  const porthole = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 18), darkWood);
  porthole.name = 'porthole';
  porthole.position.set(-0.85, 1.7, 1.74);
  const windowGlow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 18), glowMat());
  windowGlow.name = 'windowGlow';
  windowGlow.position.set(-0.85, 1.7, 1.75);
  const muntinV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.76, 0.04), darkWood);
  muntinV.position.set(-0.85, 1.7, 1.78);
  const muntinH = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.04), darkWood);
  muntinH.position.set(-0.85, 1.7, 1.78);
  shop.add(porthole, windowGlow, muntinV, muntinH);

  // Side display window, also warmly lit.
  const sideFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 1.3), darkWood);
  sideFrame.name = 'sideFrame';
  sideFrame.position.set(2.12, 1.6, 0.2);
  const windowSide = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), glowMat(GLOW, 0.9));
  windowSide.name = 'windowSide';
  windowSide.rotation.y = Math.PI / 2;
  windowSide.position.set(2.19, 1.6, 0.2);
  shop.add(sideFrame, windowSide);

  // Hanging sign board ----------------------------------------------------
  const sign = new THREE.Group();
  sign.name = 'sign';
  sign.position.set(1.75, 2.35, 1.85);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.7), timber);
  bracket.position.set(0, 0.35, -0.2);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.08), wood);
  board.name = 'signBoard';
  const boardTrim = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.09), toon(0xd9b36a));
  boardTrim.position.y = 0.24;
  const chainGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5);
  const chainMat = toon(0x3a3430);
  const chainL = new THREE.Mesh(chainGeo, chainMat);
  chainL.position.set(-0.25, 0.15, 0);
  const chainR = new THREE.Mesh(chainGeo, chainMat);
  chainR.position.set(0.25, 0.15, 0);
  sign.add(bracket, board, boardTrim, chainL, chainR);
  shop.add(sign);

  // Vegetable stall crates ------------------------------------------------
  const stall = new THREE.Group();
  stall.name = 'stall';
  stall.position.set(-1.35, 0, 2.6);
  shop.add(stall);
  const crateGeo = new THREE.BoxGeometry(0.8, 0.45, 0.6);
  const crateRimGeo = new THREE.BoxGeometry(0.88, 0.08, 0.68);
  const produceGeo = new THREE.SphereGeometry(0.11, 7, 6);
  const apple = toon(0xd95f4b);
  const lemon = toon(0xe8c13c);
  const greens = toon(0x6f9a5a);
  const bread = toon(0xc98d4e);
  const produceSets = [apple, lemon, greens];
  for (let c = 0; c < 3; c++) {
    const cx = (c - 1) * 0.95;
    const crate = new THREE.Mesh(crateGeo, wood);
    crate.name = `crate${c}`;
    crate.position.set(cx, 0.575, 0);
    const rim = new THREE.Mesh(crateRimGeo, darkWood);
    rim.position.set(cx, 0.78, 0);
    stall.add(crate, rim);
    const mat = produceSets[c]!;
    for (let p = 0; p < 4; p++) {
      const piece = new THREE.Mesh(produceGeo, mat);
      piece.position.set(cx - 0.18 + (p % 2) * 0.36, 0.88, -0.14 + Math.floor(p / 2) * 0.28);
      stall.add(piece);
    }
  }
  // Bread crate stacked beside the stall.
  const breadCrate = new THREE.Mesh(crateGeo, wood);
  breadCrate.name = 'breadCrate';
  breadCrate.position.set(1.95, 0.575, -0.2);
  breadCrate.rotation.y = 0.2;
  stall.add(breadCrate);
  const loafGeo = new THREE.CapsuleGeometry(0.09, 0.3, 4, 8);
  for (let i = 0; i < 3; i++) {
    const loaf = new THREE.Mesh(loafGeo, bread);
    loaf.rotation.z = Math.PI / 2;
    loaf.rotation.y = 0.2 + i * 0.15;
    loaf.position.set(1.95 - 0.15 + i * 0.15, 0.88, -0.2);
    stall.add(loaf);
  }

  // Hanging lanterns under the awning -------------------------------------
  const lanterns = new THREE.Group();
  lanterns.name = 'lanterns';
  shop.add(lanterns);
  const lampGlassGeo = new THREE.BoxGeometry(0.22, 0.28, 0.22);
  for (let i = 0; i < 2; i++) {
    const hang = new THREE.Group();
    hang.name = `lantern${i}`;
    hang.position.set(i === 0 ? -1.7 : 1.7, 2.35, 2.9);
    hang.userData.phase = i * Math.PI;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5), timber);
    cord.position.y = 0.28;
    const glass = new THREE.Mesh(lampGlassGeo, glowMat());
    glass.name = `lanternGlass${i}`;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 6), timber);
    cap.position.y = 0.2;
    hang.add(cord, glass, cap);
    lanterns.add(hang);
  }

  // Potted herbs flanking the door ----------------------------------------
  const potGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.28, 8);
  const herbGeo = new THREE.IcosahedronGeometry(0.2, 0);
  const potMat = toon(0xa9603c);
  for (let i = 0; i < 2; i++) {
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(i === 0 ? -0.1 : 1.6, 0.49, 2.0);
    const herb = new THREE.Mesh(herbGeo, leaf);
    herb.position.set(i === 0 ? -0.1 : 1.6, 0.78, 2.0);
    shop.add(pot, herb);
  }

  shadowed(shop);
  shop.traverse((o: THREE.Object3D) => {
    if (
      o.name === 'windowGlow' ||
      o.name === 'windowSide' ||
      o.name.startsWith('lanternGlass')
    ) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  return shop;
}

// Idle animation: warm window flicker + gentle lantern sway.
// Pure w.r.t. the group: safe on an empty or foreign group.
export function updateShopCenter(g: THREE.Group, t: number, _dt: number): void {
  const flicker = 0.9 + 0.07 * Math.sin(t * 7.3) + 0.03 * Math.sin(t * 13.7);
  for (const name of ['windowGlow', 'windowSide', 'lanternGlass0', 'lanternGlass1']) {
    const mesh = g.getObjectByName(name) as THREE.Mesh | undefined;
    const mat = mesh?.material as THREE.MeshBasicMaterial | undefined;
    if (mat && typeof mat.opacity === 'number') {
      mat.opacity = Math.min(1, Math.max(0.7, flicker));
    }
  }
  for (let i = 0; i < 2; i++) {
    const hang = g.getObjectByName(`lantern${i}`);
    const phase = hang?.userData.phase;
    if (hang && typeof phase === 'number') {
      hang.rotation.z = 0.06 * Math.sin(t * 1.4 + phase);
      hang.rotation.x = 0.04 * Math.sin(t * 1.1 + phase * 0.5);
    }
  }
  const sign = g.getObjectByName('sign');
  if (sign) {
    sign.rotation.x = 0.03 * Math.sin(t * 0.9);
  }
}
