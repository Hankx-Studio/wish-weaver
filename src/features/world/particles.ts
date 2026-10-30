import * as THREE from 'three';
import { mulberry32, type EffectEvent } from '@/lib/effects/types';

const MAX = 600;

type RitualMotion = EffectEvent['motion'];

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 0xff) / 255, ((v >> 8) & 0xff) / 255, (v & 0xff) / 255];
}

// Hot white core with a soft halo falloff. Vertex colors tint the sprite;
// the texture only shapes the glow. Size attenuation + additive blending
// (set on the materials below) keep the Sky/Ghibli soft-light feel.
export function makeSoftDotTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

interface Particle {
  motion: RitualMotion;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  ttl: number;
  r: number;
  g: number;
  b: number;
  baseAlpha: number;
  // Burst center (XZ) for vortex steering, plus a per-particle sway phase.
  cx: number;
  cz: number;
  sw: number;
}

// Seeded ritual bursts as a single THREE.Points cloud (additive; fade-out by
// darkening vertex colors). Alive particles stay packed at the front.
export class ParticleField {
  readonly group = new THREE.Group();
  reducedMotion = false;
  private geo = new THREE.BufferGeometry();
  private posAttr: THREE.BufferAttribute;
  private colAttr: THREE.BufferAttribute;
  private parts: Particle[] = [];
  private ring: THREE.Mesh | null = null;
  private ringLife = 0;
  private ringTtl = 0;

  constructor(dot: THREE.Texture) {
    this.posAttr = new THREE.BufferAttribute(new Float32Array(MAX * 3), 3);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(MAX * 3), 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('color', this.colAttr);
    this.geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({
      size: 0.55,
      map: dot,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(this.geo, mat);
    points.frustumCulled = false;
    this.group.add(points);
  }

  burst(fx: EffectEvent, at: THREE.Vector3): void {
    if (this.reducedMotion) {
      this.showRing(fx, at);
      return;
    }
    const rand = mulberry32(fx.seed);
    const count = Math.min(140, MAX - this.parts.length);
    const ttl = fx.duration_ms / 1000;
    for (let i = 0; i < count; i++) {
      const color = fx.palette[Math.floor(rand() * fx.palette.length)] ?? '#FFFFFF';
      const [r, g, b] = hexToRgb(color);
      const theta = rand() * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const speed = this.initialSpeed(fx.motion, rand);
      const idx = this.parts.length;
      const baseAlpha = Math.min(fx.brightness + 0.3, 1);
      const sw = rand() * Math.PI * 2;
      let px = at.x;
      let py = at.y;
      let pz = at.z;
      let vx = 0;
      let vy = 0;
      let vz = 0;
      switch (fx.motion) {
        case 'halo': {
          // Ring expansion: spawn on a flat ring, fly radially outward.
          const radius = 0.8 + rand() * 0.7;
          px += cos * radius;
          py += (rand() - 0.5) * 0.35;
          pz += sin * radius;
          vx = cos * speed;
          vy = 0.25 + rand() * 0.5;
          vz = sin * speed;
          break;
        }
        case 'swirl': {
          // Vortex: spawn in a small disc, launch tangentially around Y.
          const radius = rand() * 0.9;
          px += cos * radius;
          py += (rand() - 0.5) * 0.8;
          pz += sin * radius;
          const inward = 0.35;
          vx = -sin * speed - cos * inward;
          vy = 0.9 + rand() * 1.2;
          vz = cos * speed - sin * inward;
          break;
        }
        case 'pulse': {
          // Shockwave: spawn near the center, expand as a spherical shell.
          const phi = Math.acos(2 * rand() - 1);
          const dx = Math.sin(phi) * cos;
          const dy = Math.cos(phi) * 0.9 + 0.25;
          const dz = Math.sin(phi) * sin;
          const off = rand() * 0.25;
          px += dx * off;
          py += dy * off;
          pz += dz * off;
          vx = dx * speed;
          vy = dy * speed;
          vz = dz * speed;
          break;
        }
        case 'drift': {
          // Petals: spawn across a wide soft disc, barely moving.
          const radius = Math.sqrt(rand()) * 1.6;
          px += cos * radius;
          py += (rand() - 0.4) * 1.2;
          pz += sin * radius;
          vx = cos * speed * 0.3;
          vy = 0.15 + rand() * 0.35;
          vz = sin * speed * 0.3;
          break;
        }
      }
      this.posAttr.setXYZ(idx, px, py, pz);
      this.colAttr.setXYZ(idx, r * baseAlpha, g * baseAlpha, b * baseAlpha);
      this.parts.push({
        motion: fx.motion,
        vx,
        vy,
        vz,
        life: 0,
        ttl: ttl * (0.6 + rand() * 0.4),
        r,
        g,
        b,
        baseAlpha,
        cx: at.x,
        cz: at.z,
        sw,
      });
    }
    this.geo.setDrawRange(0, this.parts.length);
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  private initialSpeed(motion: RitualMotion, rand: () => number): number {
    switch (motion) {
      case 'halo':
        return 1.2 + rand() * 1.6;
      case 'swirl':
        return 2.6 + rand() * 3.2;
      case 'pulse':
        return 0.5 + rand() * 0.9;
      case 'drift':
        return 0.9 + rand() * 1.2;
    }
  }

  private showRing(fx: EffectEvent, at: THREE.Vector3): void {
    this.clearRing();
    const color = fx.palette[0] ?? '#FFFFFF';
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.45, 40),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.position.copy(at);
    mesh.rotation.x = -Math.PI / 2;
    this.group.add(mesh);
    this.ring = mesh;
    this.ringLife = 0;
    this.ringTtl = fx.duration_ms / 1000;
  }

  private clearRing(): void {
    if (this.ring) {
      this.group.remove(this.ring);
      this.ring.geometry.dispose();
      (this.ring.material as THREE.Material).dispose();
      this.ring = null;
    }
  }

  update(dt: number, time: number): void {
    if (this.ring) {
      this.ringLife += dt;
      const k = this.ringLife / Math.max(this.ringTtl, 0.001);
      const mat = this.ring.material as THREE.MeshBasicMaterial;
      mat.opacity = k >= 1 ? 0 : 0.8 * (1 - k);
      const s = 1 + k * 0.6;
      this.ring.scale.set(s, s, s);
      if (k >= 1) this.clearRing();
    }
    const dtc = Math.min(dt, 0.05);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]!;
      p.life += dtc;
      if (p.life >= p.ttl) {
        const last = this.parts.length - 1;
        if (i !== last) {
          this.parts[i] = this.parts[last]!;
          this.posAttr.setXYZ(
            i,
            this.posAttr.getX(last),
            this.posAttr.getY(last),
            this.posAttr.getZ(last),
          );
          this.colAttr.setXYZ(
            i,
            this.colAttr.getX(last),
            this.colAttr.getY(last),
            this.colAttr.getZ(last),
          );
        }
        this.parts.pop();
        continue;
      }
      const k = p.life / p.ttl;
      let x = this.posAttr.getX(i);
      let y = this.posAttr.getY(i);
      let z = this.posAttr.getZ(i);
      let fade: number;
      switch (p.motion) {
        case 'halo': {
          // Expanding ring: radial glide with mild damping + gentle lift.
          const damp = 1 - 0.9 * dtc;
          p.vx *= damp;
          p.vz *= damp;
          p.vy = p.vy * (1 - 0.5 * dtc) + 0.2 * dtc;
          x += p.vx * dtc;
          y += (p.vy + Math.sin(time * 3 + p.sw) * 0.12) * dtc;
          z += p.vz * dtc;
          fade = 1 - k;
          break;
        }
        case 'swirl': {
          // Vortex: curl around the burst axis, spiral up and out.
          const dx = x - p.cx;
          const dz = z - p.cz;
          const dist = Math.sqrt(dx * dx + dz * dz) + 0.001;
          const nx = dx / dist;
          const nz = dz / dist;
          const curl = 3.2 * dtc;
          const pinch = (1.1 - Math.min(dist, 1.1)) * 1.6 * dtc;
          p.vx += (-nz * curl + nx * pinch) * (1 - k * 0.6);
          p.vz += (nx * curl + nz * pinch) * (1 - k * 0.6);
          const damp = 1 - 0.35 * dtc;
          p.vx *= damp;
          p.vz *= damp;
          p.vy = p.vy * (1 - 0.3 * dtc) + 0.55 * dtc;
          x += p.vx * dtc;
          y += p.vy * dtc;
          z += p.vz * dtc;
          fade = 1 - k;
          break;
        }
        case 'pulse': {
          // Shockwave: fast early expansion, then the shell dissolves.
          const boost = k < 0.35 ? 1 + 2.4 * dtc : 1 - 1.4 * dtc;
          p.vx *= boost;
          p.vz *= boost;
          p.vy = p.vy * boost + 0.15 * dtc;
          x += p.vx * dtc;
          y += p.vy * dtc;
          z += p.vz * dtc;
          const shell = 1 - k;
          fade = shell * shell;
          break;
        }
        case 'drift': {
          // Petals: buoyant flutter with sinusoidal sway.
          const sway = Math.sin(time * 2.1 + p.sw);
          const sway2 = Math.cos(time * 1.6 + p.sw * 1.3);
          p.vx = p.vx * (1 - 1.2 * dtc) + sway * 0.55 * dtc;
          p.vz = p.vz * (1 - 1.2 * dtc) + sway2 * 0.55 * dtc;
          p.vy = p.vy * (1 - 0.8 * dtc) + (0.22 + sway * 0.1) * dtc;
          x += p.vx * dtc;
          y += p.vy * dtc;
          z += p.vz * dtc;
          fade = Math.pow(Math.sin(Math.PI * Math.min(Math.max(k, 0), 1)), 0.7);
          break;
        }
      }
      this.posAttr.setXYZ(i, x, y, z);
      const throb = 0.75 + 0.25 * Math.sin(time * 6 + p.sw);
      const a = p.baseAlpha * fade * throb;
      this.colAttr.setXYZ(i, p.r * a, p.g * a, p.b * a);
    }
    this.geo.setDrawRange(0, this.parts.length);
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  dispose(): void {
    this.clearRing();
    this.geo.dispose();
    const points = this.group.children[0] as THREE.Points | undefined;
    if (points) (points.material as THREE.Material).dispose();
  }
}

// Slow ambient fireflies drifting over the meadow, with a gentle color
// twinkle (warm gold breathing toward cool white, each on its own phase).
export class Fireflies {
  readonly points: THREE.Points;
  private geo = new THREE.BufferGeometry();
  private base: Float32Array;
  private phase: Float32Array;
  private warmMix: Float32Array;
  private count: number;

  constructor(count = 120, radius = 50, seed = 77) {
    this.count = count;
    const rand = mulberry32(seed);
    this.base = new Float32Array(count * 3);
    this.phase = new Float32Array(count);
    this.warmMix = new Float32Array(count);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(rand()) * radius;
      const t = rand() * Math.PI * 2;
      this.base[i * 3] = Math.cos(t) * r;
      this.base[i * 3 + 1] = 0.6 + rand() * 3.4;
      this.base[i * 3 + 2] = Math.sin(t) * r;
      this.phase[i] = rand() * Math.PI * 2;
      const warm = rand() > 0.35;
      const w = warm ? 0.75 + rand() * 0.25 : rand() * 0.25;
      this.warmMix[i] = w;
      col[i * 3] = 0.6 + 0.4 * w;
      col[i * 3 + 1] = 0.85;
      col[i * 3 + 2] = 1 - 0.5 * w;
    }
    pos.set(this.base);
    const posAttr = new THREE.BufferAttribute(pos, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const colAttr = new THREE.BufferAttribute(col, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', posAttr);
    this.geo.setAttribute('color', colAttr);
    const mat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    // Round soft sprites; guarded so non-DOM imports (SSR/tests) stay safe.
    if (typeof document !== 'undefined') {
      mat.map = makeSoftDotTexture();
      mat.needsUpdate = true;
    }
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
  }

  update(time: number): void {
    const posAttr = this.geo.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geo.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < this.count; i++) {
      const ph = this.phase[i]!;
      posAttr.setXYZ(
        i,
        this.base[i * 3]! + Math.sin(time * 0.4 + ph) * 1.2,
        this.base[i * 3 + 1]! + Math.sin(time * 0.6 + ph * 1.7) * 0.5,
        this.base[i * 3 + 2]! + Math.cos(time * 0.33 + ph) * 1.2,
      );
      // Gentle twinkle: brightness breathes and the hue sways between
      // warm gold and cool white around each firefly's base mix.
      const w = this.warmMix[i]!;
      const tw = 0.62 + 0.38 * Math.sin(time * 1.7 + ph * 2.3);
      const sway = 0.5 + 0.5 * Math.sin(time * 0.9 + ph);
      const m = Math.min(Math.max(w + (sway - 0.5) * 0.35, 0), 1);
      colAttr.setXYZ(
        i,
        (0.6 + 0.4 * m) * tw,
        0.85 * tw,
        (1 - 0.5 * m) * tw,
      );
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    const mat = this.points.material as THREE.PointsMaterial;
    mat.map?.dispose();
    mat.dispose();
  }
}
