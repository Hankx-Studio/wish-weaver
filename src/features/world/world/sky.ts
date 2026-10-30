import * as THREE from 'three';
import { mulberry32 } from '@/lib/effects/types';
import { makeSoftDotTexture } from '../particles';

// Factory for toon materials sharing one gradient ramp. Owned by Game,
// passed into builders so every module shades identically.
export type ToonFactory = (
  color: number,
  extra?: Partial<THREE.MeshToonMaterialParameters>,
) => THREE.MeshToonMaterial;

export function makeToonRamp(steps = 4): THREE.DataTexture {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round((i / (steps - 1)) * 255);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export const SKY_TOP = new THREE.Color(0x6ea8dd);
export const SKY_BOTTOM = new THREE.Color(0xf3cd94);
export const FOG_COLOR = new THREE.Color(0xe8d3ae);

// Golden-hour direction shared by the dome tint and every sun sprite.
const SUN_DIR = new THREE.Vector3(150, 190, 60).normalize();
// Extra gradient stops between SKY_BOTTOM (horizon) and SKY_TOP (zenith).
const HORIZON_GLOW = new THREE.Color(0xffdca6);
const MID_PEACH = new THREE.Color(0xf0c193);
const MID_LAVENDER = new THREE.Color(0xa9b4d6);
const SUN_TINT = new THREE.Color(0xffc37a);

export function setupLightsAndFog(scene: THREE.Scene): void {
  scene.fog = new THREE.Fog(FOG_COLOR, 80, 300);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a9a7b, 1.05);
  scene.add(hemi);
  // Cool fill from the opposite side so dark-cloaked shapes stay readable.
  const fill = new THREE.DirectionalLight(0xbcd0ff, 0.55);
  fill.position.set(-35, 24, -45);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(0xffe3b3, 2.6);
  sun.position.set(40, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
}

function gradientStop(t: number, out: THREE.Color): void {
  // Multi-stop golden-hour ramp: horizon glow -> peach -> lavender -> zenith.
  if (t < 0.18) out.copy(HORIZON_GLOW).lerp(MID_PEACH, t / 0.18);
  else if (t < 0.45) out.copy(MID_PEACH).lerp(MID_LAVENDER, (t - 0.18) / 0.27);
  else out.copy(MID_LAVENDER).lerp(SKY_TOP, (t - 0.45) / 0.55);
}

export function buildSkyDome(scene: THREE.Scene): void {
  const geo = new THREE.SphereGeometry(400, 32, 20);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const dir = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp(pos.getY(i) / 400 + 0.12, 0, 1);
    gradientStop(Math.pow(t, 0.7), c);
    // Sunward warmth: bake a soft glow around the sun direction.
    dir.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const sunAmount = Math.pow(Math.max(0, dir.dot(SUN_DIR)), 6) * (1 - t * 0.7);
    if (sunAmount > 0.001) c.lerp(SUN_TINT, Math.min(0.65, sunAmount));
    // Below-horizon haze so the dome meets fogged ground without a hard line.
    if (pos.getY(i) < 0) c.lerp(SKY_BOTTOM, 0.5);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  sky.renderOrder = -10;
  scene.add(sky);

  const dot = makeSoftDotTexture();
  const sunPos = SUN_DIR.clone().multiplyScalar(340);
  const addGlow = (
    color: number,
    opacity: number,
    size: number,
    blending: THREE.Blending = THREE.NormalBlending,
  ): void => {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dot,
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        fog: false,
        blending,
      }),
    );
    halo.position.copy(sunPos);
    halo.scale.set(size, size, 1);
    halo.renderOrder = -9;
    scene.add(halo);
  };
  // Layered sun: hot core + warm inner halo + wide faint outer glow.
  addGlow(0xfffdf4, 1, 46, THREE.AdditiveBlending);
  addGlow(0xffedb8, 0.85, 110, THREE.AdditiveBlending);
  addGlow(0xffc98a, 0.35, 220, THREE.AdditiveBlending);

  // Horizontal anamorphic-style streak for golden-hour sparkle.
  const streak = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: dot,
      color: 0xffe2ae,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  streak.position.copy(sunPos);
  streak.scale.set(340, 26, 1);
  streak.renderOrder = -9;
  scene.add(streak);

  // Light-shaft feel: faint slanted additive shafts leaning away from the sun.
  const rand = mulberry32(7);
  for (let i = 0; i < 4; i++) {
    const shaft = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dot,
        color: 0xffd9a0,
        transparent: true,
        opacity: 0.1 + rand() * 0.06,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
        rotation: 0.5 + rand() * 0.25,
      }),
    );
    shaft.position.set(
      sunPos.x - 90 - rand() * 130,
      sunPos.y - 60 - rand() * 90,
      sunPos.z - 20 + rand() * 40,
    );
    shaft.scale.set(26 + rand() * 22, 190 + rand() * 90, 1);
    shaft.renderOrder = -8;
    scene.add(shaft);
  }
}

export function buildMountains(scene: THREE.Scene, toon: ToonFactory): void {
  const rand = mulberry32(31);
  // Far ring: fog-washed silhouettes; near ring: deeper dusk blue-violet.
  const farMat = toon(0x9fa9bd);
  const nearMat = toon(0x66788f);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + rand() * 0.4;
    const r = 195 + rand() * 45;
    const h = 55 + rand() * 50;
    const m = new THREE.Mesh(new THREE.ConeGeometry(34 + rand() * 24, h, 5), farMat);
    m.position.set(Math.cos(a) * r, h / 2 - 6, Math.sin(a) * r);
    m.rotation.y = rand() * Math.PI;
    scene.add(m);
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3 + rand() * 0.4;
    const r = 140 + rand() * 35;
    const h = 38 + rand() * 34;
    const m = new THREE.Mesh(new THREE.ConeGeometry(26 + rand() * 18, h, 5), nearMat);
    m.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r);
    m.rotation.y = rand() * Math.PI;
    scene.add(m);
  }
}

// Original gull/"V" bird sprite texture, drawn procedurally (no copied art).
let birdTextureCache: THREE.CanvasTexture | null = null;
function makeBirdTexture(): THREE.CanvasTexture {
  if (birdTextureCache) return birdTextureCache;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  // Left wing.
  ctx.beginPath();
  ctx.moveTo(6, 22);
  ctx.quadraticCurveTo(20, 22, 32, 12);
  ctx.stroke();
  // Right wing.
  ctx.beginPath();
  ctx.moveTo(58, 22);
  ctx.quadraticCurveTo(44, 22, 32, 12);
  ctx.stroke();
  birdTextureCache = new THREE.CanvasTexture(c);
  return birdTextureCache;
}

interface DriftMeta {
  speed: number;
  wrap: number;
  bird?: { phase: number; flap: number; baseY: number; baseScaleY: number };
}

function tag(sprite: THREE.Sprite, meta: DriftMeta): void {
  sprite.userData.skyDrift = meta;
}

export function buildClouds(scene: THREE.Scene): { sprites: THREE.Sprite[]; texture: THREE.Texture } {
  const tex = makeSoftDotTexture();
  const rand = mulberry32(97);
  const sprites: THREE.Sprite[] = [];
  const addCloud = (
    color: number,
    opacity: number,
    rMin: number,
    rMax: number,
    yMin: number,
    yMax: number,
    wMin: number,
    wMax: number,
    speed: number,
    wrap: number,
  ): void => {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const s = new THREE.Sprite(mat);
    const a = rand() * Math.PI * 2;
    const r = rMin + rand() * (rMax - rMin);
    s.position.set(Math.cos(a) * r, yMin + rand() * (yMax - yMin), Math.sin(a) * r);
    const w = wMin + rand() * (wMax - wMin);
    s.scale.set(w, w * 0.42, 1);
    tag(s, { speed, wrap });
    sprites.push(s);
    scene.add(s);
  };
  // Far layer: small, cool rose-tinted, slow.
  for (let i = 0; i < 8; i++) {
    addCloud(
      [0xf6cfd8, 0xf9d9c2, 0xe8cfe0][i % 3],
      0.5 + rand() * 0.2,
      120, 175, 40, 62, 26, 48,
      0.25 + rand() * 0.2,
      200,
    );
  }
  // Near layer: bigger, warm-lit, slightly faster.
  for (let i = 0; i < 6; i++) {
    addCloud(
      i % 2 === 0 ? 0xfff3df : 0xffe3c2,
      0.7 + rand() * 0.2,
      60, 120, 24, 42, 34, 62,
      0.5 + rand() * 0.35,
      170,
    );
  }

  // Distant birds: dark animated "V" sprites riding the same drift update.
  const birdTex = makeBirdTexture();
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.SpriteMaterial({
      map: birdTex,
      color: 0x44506a,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const b = new THREE.Sprite(mat);
    const a = rand() * Math.PI * 2;
    const r = 95 + rand() * 50;
    b.position.set(Math.cos(a) * r, 32 + rand() * 14, Math.sin(a) * r);
    const w = 5 + rand() * 3;
    b.scale.set(w, w * 0.5, 1);
    tag(b, {
      speed: 1.6 + rand() * 1.2,
      wrap: 180,
      bird: {
        phase: rand() * Math.PI * 2,
        flap: 6 + rand() * 3,
        baseY: b.position.y,
        baseScaleY: b.scale.y,
      },
    });
    sprites.push(b);
    scene.add(b);
  }
  return { sprites, texture: tex };
}

export function updateClouds(clouds: THREE.Sprite[], dt: number): void {
  for (let i = 0; i < clouds.length; i++) {
    const cloud = clouds[i];
    const meta = cloud.userData.skyDrift as DriftMeta | undefined;
    const speed = meta?.speed ?? 0.3 + (i % 3) * 0.15;
    const wrap = meta?.wrap ?? 160;
    cloud.position.x += dt * speed;
    if (cloud.position.x > wrap) cloud.position.x = -wrap;
    const bird = meta?.bird;
    if (bird) {
      // Wing flap: squash-and-stretch the V silhouette + gentle bob.
      bird.phase += dt * bird.flap;
      const flap = Math.sin(bird.phase);
      cloud.scale.y = bird.baseScaleY * (0.55 + 0.45 * Math.abs(flap));
      cloud.position.y = bird.baseY + Math.sin(bird.phase * 0.35) * 1.2;
    }
  }
}
