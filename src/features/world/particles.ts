import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { mulberry32, type EffectEvent } from '@/lib/effects/types';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  spin: number;
  baseAlpha: number;
}

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// Seeded particle bursts driven by an EffectEvent. Lives inside the world
// container so bursts use world coordinates.
export class ParticleField {
  readonly container = new Container();
  reducedMotion = false;
  private dot: Texture;
  private live: Particle[] = [];
  private ring: Graphics | null = null;
  private ringLife = 0;
  private ringTtl = 0;
  private readonly maxParticles: number;

  constructor(dot: Texture, maxParticles = 400) {
    this.dot = dot;
    this.maxParticles = maxParticles;
  }

  burst(fx: EffectEvent, x: number, y: number): void {
    if (this.reducedMotion) {
      this.showRing(fx, x, y);
      return;
    }
    const rand = mulberry32(fx.seed);
    const count = Math.min(140, this.maxParticles - this.live.length);
    const ttl = fx.duration_ms / 1000;
    for (let i = 0; i < count; i++) {
      const sprite = new Sprite(this.dot);
      const color = fx.palette[Math.floor(rand() * fx.palette.length)] ?? '#FFFFFF';
      sprite.tint = hexToInt(color);
      const size = 4 + rand() * 8;
      sprite.setSize(size, size);
      sprite.anchor.set(0.5);
      const angle = rand() * Math.PI * 2;
      const speed = this.initialSpeed(fx.motion, rand);
      const p: Particle = {
        sprite,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        ttl: ttl * (0.6 + rand() * 0.4),
        spin: (rand() - 0.5) * 4,
        baseAlpha: Math.min(fx.brightness + 0.25, 0.95),
      };
      if (fx.motion === 'halo') {
        // Start on a ring, drift outward.
        const r = 24 + rand() * 20;
        sprite.position.set(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      } else {
        sprite.position.set(x + (rand() - 0.5) * 30, y + (rand() - 0.5) * 30);
      }
      if (fx.motion === 'drift') {
        p.vx = 20 + rand() * 40;
        p.vy = -10 - rand() * 25;
      }
      this.container.addChild(sprite);
      this.live.push(p);
    }
  }

  private initialSpeed(motion: EffectEvent['motion'], rand: () => number): number {
    switch (motion) {
      case 'halo':
        return 40 + rand() * 60;
      case 'swirl':
        return 90 + rand() * 120;
      case 'pulse':
        return 15 + rand() * 30;
      case 'drift':
        return 30 + rand() * 40;
    }
  }

  private showRing(fx: EffectEvent, x: number, y: number): void {
    this.clearRing();
    const ring = new Graphics();
    const color = hexToInt(fx.palette[0] ?? '#FFFFFF');
    ring.circle(0, 0, 46).stroke({ color, width: 6, alpha: 0.8 });
    ring.position.set(x, y);
    this.container.addChild(ring);
    this.ring = ring;
    this.ringLife = 0;
    this.ringTtl = fx.duration_ms / 1000;
  }

  private clearRing(): void {
    if (this.ring) {
      this.ring.destroy();
      this.ring = null;
    }
  }

  update(dt: number, time: number): void {
    if (this.ring) {
      this.ringLife += dt;
      const k = this.ringLife / Math.max(this.ringTtl, 0.001);
      this.ring.alpha = k >= 1 ? 0 : 0.8 * (1 - k);
      if (k >= 1) this.clearRing();
    }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i]!;
      p.life += dt;
      if (p.life >= p.ttl) {
        p.sprite.destroy();
        this.live.splice(i, 1);
        continue;
      }
      const k = p.life / p.ttl;
      // Gentle curl so swirls read as spirals; others drift and settle.
      const curl = p.spin * 22 * dt;
      const vx = p.vx + -p.vy * curl * 0.02;
      const vy = p.vy + p.vx * curl * 0.02 - 14 * dt;
      p.vx = vx;
      p.vy = vy;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      const throb = 0.75 + 0.25 * Math.sin(time * 6 + p.spin * 10);
      p.sprite.alpha = p.baseAlpha * (1 - k) * throb;
    }
  }

  destroy(): void {
    for (const p of this.live) p.sprite.destroy();
    this.live = [];
    this.clearRing();
    this.container.destroy({ children: true });
  }
}
