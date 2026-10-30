import * as THREE from 'three';
import type { ToonFactory } from '../sky';

const STONE = 0x9a938a;
const STONE_DARK = 0x7b766d;
const WOOD = 0x8a6238;
const DARK_WOOD = 0x5f4128;
const IRON = 0x3a3430;
const WATER = 0x5fb8e6;
const FOAM = 0xeaf7ff;
const LAMP_WARM = 0xffd489;
const BULB_WARM = 0xffc46a;
const LEAF = 0x5f8f4e;

const BLOSSOMS = [0xf2a0b5, 0xf6c453, 0x8fb8f6, 0xffffff, 0xe88ca0, 0xf6a05c];

function shadowed(root: THREE.Object3D): void {
  root.traverse((o: THREE.Object3D) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

// Circular stone plaza with a 3-tier fountain, benches, lamp posts with
// overhead string lights, and a flower ring. Feet origin, ~15 wide.
export function createPlaza(toon: ToonFactory): THREE.Group {
  const plaza = new THREE.Group();
  plaza.name = 'plaza';

  const stone = toon(STONE);
  const stoneDark = toon(STONE_DARK);
  const wood = toon(WOOD);
  const darkWood = toon(DARK_WOOD);
  const iron = toon(IRON);
  const leaf = toon(LEAF);
  const blossom = toon(0xffffff);

  // Plaza floor + rim.
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(7.5, 7.8, 0.3, 28),
    stone,
  );
  floor.name = 'floor';
  floor.position.y = -0.15;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(7.55, 0.2, 8, 40), stoneDark);
  rim.name = 'rim';
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.05;
  plaza.add(floor, rim);

  // 3-tier fountain -------------------------------------------------------
  const fountain = new THREE.Group();
  fountain.name = 'fountain';
  plaza.add(fountain);

  const waterMat = (): THREE.MeshToonMaterial => {
    const m = toon(WATER);
    m.transparent = true;
    m.opacity = 0.9;
    return m;
  };
  const foamMat = new THREE.MeshBasicMaterial({
    color: FOAM,
    transparent: true,
    opacity: 0.75,
  });

  const basinWall = new THREE.Mesh(
    new THREE.CylinderGeometry(2.7, 2.9, 0.75, 24, 1, true),
    stone,
  );
  basinWall.name = 'basinWall';
  basinWall.position.y = 0.375;
  const basinRim = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.16, 8, 28), stoneDark);
  basinRim.name = 'basinRim';
  basinRim.rotation.x = Math.PI / 2;
  basinRim.position.y = 0.75;
  const basinFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(2.75, 2.75, 0.12, 24),
    stoneDark,
  );
  basinFloor.name = 'basinFloor';
  basinFloor.position.y = 0.06;
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.55, 28), waterMat());
  water.name = 'water';
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.58;
  fountain.add(basinWall, basinRim, basinFloor, water);

  // Foam arcs riding the basin water so the shimmer rotation is visible.
  const arcGeo = new THREE.RingGeometry(1.7, 1.95, 24, 1, 0, Math.PI * 0.7);
  for (let i = 0; i < 2; i++) {
    const arc = new THREE.Mesh(arcGeo, foamMat);
    arc.name = `waterArc${i}`;
    arc.rotation.x = -Math.PI / 2;
    arc.rotation.z = i * Math.PI;
    arc.position.y = 0.6;
    arc.userData.spin = i === 0 ? 0.35 : -0.22;
    fountain.add(arc);
  }

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.45, 1.7, 12),
    stone,
  );
  column.name = 'column';
  column.position.y = 1.2;
  fountain.add(column);

  const tierDefs: Array<{ r: number; y: number; water: string }> = [
    { r: 1.55, y: 1.6, water: 'water1' },
    { r: 0.85, y: 2.35, water: 'water2' },
  ];
  for (const def of tierDefs) {
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(def.r, def.r * 0.55, 0.28, 20),
      stone,
    );
    bowl.position.y = def.y;
    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(def.r, 0.09, 6, 24),
      stoneDark,
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.y = def.y + 0.14;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(def.r - 0.12, 20), waterMat());
    disc.name = def.water;
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = def.y + 0.13;
    fountain.add(bowl, lip, disc);
  }

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.7, 10), stone);
  stem.name = 'stem';
  stem.position.y = 2.7;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), stoneDark);
  finial.name = 'finial';
  finial.position.y = 3.1;
  // Particle-ready emitter node at the fountain crown.
  const emit = new THREE.Object3D();
  emit.name = 'emit';
  emit.position.y = 3.25;
  fountain.add(stem, finial, emit);

  // Benches (4) -----------------------------------------------------------
  const benches = new THREE.Group();
  benches.name = 'benches';
  plaza.add(benches);
  const seatGeo = new THREE.BoxGeometry(1.9, 0.12, 0.55);
  const backGeo = new THREE.BoxGeometry(1.9, 0.42, 0.1);
  const legGeo = new THREE.BoxGeometry(0.14, 0.45, 0.5);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const bench = new THREE.Group();
    bench.name = `bench${i}`;
    const seat = new THREE.Mesh(seatGeo, wood);
    seat.position.y = 0.45;
    const back = new THREE.Mesh(backGeo, wood);
    back.position.set(0, 0.78, -0.26);
    back.rotation.x = 0.12;
    const legL = new THREE.Mesh(legGeo, darkWood);
    legL.position.set(-0.7, 0.225, 0);
    const legR = new THREE.Mesh(legGeo, darkWood);
    legR.position.set(0.7, 0.225, 0);
    bench.add(seat, back, legL, legR);
    bench.position.set(Math.cos(a) * 4.7, 0, Math.sin(a) * 4.7);
    bench.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    benches.add(bench);
  }

  // Lamp posts (4) with string-light catenaries ---------------------------
  const lamps = new THREE.Group();
  lamps.name = 'lamps';
  plaza.add(lamps);
  const postGeo = new THREE.CylinderGeometry(0.09, 0.13, 2.7, 8);
  const lampBaseGeo = new THREE.CylinderGeometry(0.22, 0.3, 0.25, 8);
  const lampCapGeo = new THREE.ConeGeometry(0.3, 0.28, 6);
  const lampGlassGeo = new THREE.BoxGeometry(0.3, 0.36, 0.3);
  const haloGeo = new THREE.SphereGeometry(0.42, 10, 8);
  const lampTops: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const x = Math.cos(a) * 6.1;
    const z = Math.sin(a) * 6.1;
    const lamp = new THREE.Group();
    lamp.name = `lamp${i}`;
    lamp.userData.phase = (i * Math.PI) / 2;
    const base = new THREE.Mesh(lampBaseGeo, iron);
    base.position.y = 0.125;
    const post = new THREE.Mesh(postGeo, iron);
    post.position.y = 1.5;
    const glass = new THREE.Mesh(
      lampGlassGeo,
      new THREE.MeshBasicMaterial({ color: LAMP_WARM, transparent: true, opacity: 0.95 }),
    );
    glass.name = `lampGlass${i}`;
    glass.position.y = 3.0;
    const cap = new THREE.Mesh(lampCapGeo, iron);
    cap.position.y = 3.3;
    const halo = new THREE.Mesh(
      haloGeo,
      new THREE.MeshBasicMaterial({
        color: BULB_WARM,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.name = `lampHalo${i}`;
    halo.position.y = 3.0;
    lamp.add(base, post, glass, cap, halo);
    lamp.position.set(x, 0, z);
    lamps.add(lamp);
    lampTops.push(new THREE.Vector3(x, 3.15, z));
    glass.castShadow = false;
    halo.castShadow = false;
    halo.receiveShadow = false;
  }

  // Catenary string lights between adjacent lamp tops + instanced bulbs.
  const strings = new THREE.Group();
  strings.name = 'stringLights';
  plaza.add(strings);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x2b2620 });
  const bulbPositions: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    const from = lampTops[i]!;
    const to = lampTops[(i + 1) % 4]!;
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.y -= 0.85;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const pts = curve.getPoints(20);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      wireMat,
    );
    line.name = `wire${i}`;
    strings.add(line);
    for (let b = 1; b <= 7; b++) {
      const p = curve.getPoint(b / 8);
      p.y -= 0.09;
      bulbPositions.push(p);
    }
  }
  const bulbs = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.07, 6, 5),
    new THREE.MeshBasicMaterial({ color: BULB_WARM, transparent: true, opacity: 0.95 }),
    bulbPositions.length,
  );
  bulbs.name = 'bulbs';
  const dummy = new THREE.Object3D();
  bulbPositions.forEach((p, i) => {
    dummy.position.copy(p);
    dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
  });
  bulbs.instanceMatrix.needsUpdate = true;
  bulbs.castShadow = false;
  strings.add(bulbs);

  // Flower ring -----------------------------------------------------------
  const flowers = new THREE.Group();
  flowers.name = 'flowers';
  plaza.add(flowers);
  const COUNT = 24;
  const leafMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.22, 0),
    leaf,
    COUNT,
  );
  leafMesh.name = 'flowerLeaves';
  const puffMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.15, 0),
    blossom,
    COUNT,
  );
  puffMesh.name = 'flowerPuffs';
  const color = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const a = (i / COUNT) * Math.PI * 2;
    const r = 6.85 + (i % 2) * 0.25;
    dummy.position.set(Math.cos(a) * r, 0.16, Math.sin(a) * r);
    dummy.scale.setScalar(1);
    dummy.rotation.set(0, a, 0);
    dummy.updateMatrix();
    leafMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 0.38;
    dummy.scale.setScalar(0.8 + (i % 3) * 0.25);
    dummy.updateMatrix();
    puffMesh.setMatrixAt(i, dummy.matrix);
    color.setHex(BLOSSOMS[i % BLOSSOMS.length]!);
    puffMesh.setColorAt(i, color);
  }
  leafMesh.instanceMatrix.needsUpdate = true;
  puffMesh.instanceMatrix.needsUpdate = true;
  if (puffMesh.instanceColor) puffMesh.instanceColor.needsUpdate = true;
  flowers.add(leafMesh, puffMesh);

  shadowed(plaza);
  // Additive/transparent glow bits should not cast.
  plaza.traverse((o: THREE.Object3D) => {
    if (o.name.startsWith('lampHalo') || o.name === 'bulbs' || o.name.startsWith('waterArc')) {
      o.castShadow = false;
    }
  });
  return plaza;
}

// Idle animation: water shimmer (opacity + arc spin) and lamp glow pulse.
// Pure w.r.t. the group: safe on an empty or foreign group.
export function updatePlaza(g: THREE.Group, t: number, _dt: number): void {
  const waterNames = ['water', 'water1', 'water2'];
  for (let i = 0; i < waterNames.length; i++) {
    const mesh = g.getObjectByName(waterNames[i]!) as THREE.Mesh | undefined;
    const mat = mesh?.material as THREE.MeshToonMaterial | undefined;
    if (mat && typeof mat.opacity === 'number') {
      mat.opacity = 0.82 + 0.1 * Math.sin(t * 1.6 + i * 1.3);
    }
  }
  for (let i = 0; i < 2; i++) {
    const arc = g.getObjectByName(`waterArc${i}`);
    const spin = arc?.userData.spin;
    if (arc && typeof spin === 'number') {
      arc.rotation.z += spin * 0.016;
    }
  }
  for (let i = 0; i < 4; i++) {
    const lamp = g.getObjectByName(`lamp${i}`);
    const phase = typeof lamp?.userData.phase === 'number' ? lamp.userData.phase : i;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.1 + phase);
    const glass = g.getObjectByName(`lampGlass${i}`) as THREE.Mesh | undefined;
    const glassMat = glass?.material as THREE.MeshBasicMaterial | undefined;
    if (glassMat && typeof glassMat.opacity === 'number') {
      glassMat.opacity = 0.85 + 0.15 * pulse;
    }
    const halo = g.getObjectByName(`lampHalo${i}`) as THREE.Mesh | undefined;
    const haloMat = halo?.material as THREE.MeshBasicMaterial | undefined;
    if (haloMat && typeof haloMat.opacity === 'number') {
      haloMat.opacity = 0.22 + 0.12 * pulse;
    }
  }
  const bulbs = g.getObjectByName('bulbs') as THREE.InstancedMesh | undefined;
  const bulbMat = bulbs?.material as THREE.MeshBasicMaterial | undefined;
  if (bulbMat && typeof bulbMat.opacity === 'number') {
    bulbMat.opacity = 0.88 + 0.1 * Math.sin(t * 3.1);
  }
}
