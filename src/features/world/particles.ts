import * as THREE from 'three';
import { mulberry32, type EffectEvent } from '@/lib/effects/types';

const MAX = 600;

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 0xff) / 255, ((v >> 8) & 0xff) / 255, (v & 0xff) / 255];
}

export function makeSoftDotTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

interface Particle {
  vx: number;
  vy: number;
  vz: number;
  life: number;
  ttl: number;
  r: number;
  g: number;
  b: number;
  baseAlpha: number;
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
      const up = rand() * 0.9 + 0.25;
      const speed = this.initialSpeed(fx.motion, rand);
      const spread = fx.motion === 'halo' ? 0.8 + rand() * 0.7 : rand() * 0.5;
      const idx = this.parts.length;
      this.posAttr.setXYZ(
        idx,
        at.x + Math.cos(theta) * spread,
        at.y + (rand() - 0.3) * spread,
        at.z + Math.sin(theta) * spread,
      );
      this.parts.push({
        vx: Math.cos(theta) * speed,
        vy: up * speed * (fx.motion === 'drift' ? 0.4 : 0.8),
        vz: Math.sin(theta) * speed,
        life: 0,
        ttl: ttl * (0.6 + rand() * 0.4),
        r,
        g,
        b,
        baseAlpha: Math.min(fx.brightness + 0.3, 1),
      });
    }
    this.geo.setDrawRange(0, this.parts.length);
    this.posAttr.needsUpdate = true;
  }

  private initialSpeed(motion: EffectEvent['motion'], rand: () => number): number {
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
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]!;
      p.life += dt;
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
        }
        this.parts.pop();
        continue;
      }
      const k = p.life / p.ttl;
      const x = this.posAttr.getX(i) + p.vx * dt;
      const y = this.posAttr.getY(i) + (p.vy - 0.35 * dt * 60 * 0.02) * dt;
      const z = this.posAttr.getZ(i) + p.vz * dt;
      p.vx *= 1 - 0.6 * dt;
      p.vz *= 1 - 0.6 * dt;
      p.vy = p.vy * (1 - 0.4 * dt) + 0.25 * dt;
      this.posAttr.setXYZ(i, x, y, z);
      const throb = 0.75 + 0.25 * Math.sin(time * 6 + i);
      const fade = p.baseAlpha * (1 - k) * throb;
      this.colAttr.setXYZ(i, p.r * fade, p.g * fade, p.b * fade);
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

// Slow ambient fireflies drifting over the meadow.
export class Fireflies {
  readonly points: THREE.Points;
  private geo = new THREE.BufferGeometry();
  private base: Float32Array;
  private phase: Float32Array;
  private count: number;

  constructor(count = 120, radius = 50, seed = 77) {
    this.count = count;
    const rand = mulberry32(seed);
    this.base = new Float32Array(count * 3);
    this.phase = new Float32Array(count);
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
      col[i * 3] = warm ? 1 : 0.6;
      col[i * 3 + 1] = warm ? 0.85 : 0.85;
      col[i * 3 + 2] = warm ? 0.5 : 1;
    }
    pos.set(this.base);
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
  }

  update(time: number): void {
    const attr = this.geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.count; i++) {
      const ph = this.phase[i]!;
      attr.setXYZ(
        i,
        this.base[i * 3]! + Math.sin(time * 0.4 + ph) * 1.2,
        this.base[i * 3 + 1]! + Math.sin(time * 0.6 + ph * 1.7) * 0.5,
        this.base[i * 3 + 2]! + Math.cos(time * 0.33 + ph) * 1.2,
      );
    }
    attr.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
