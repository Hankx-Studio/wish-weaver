import { Application, Container, Graphics, Texture } from 'pixi.js';
import { mulberry32, type EffectEvent } from '@/lib/effects/types';
import { ParticleField } from './particles';
import {
  PLATFORMS,
  WORLD,
  emptyInput,
  initialBody,
  stepBody,
  type BodyState,
  type InputState,
} from './physics';

// Grayscale watercolor start: the world gains color as the spirit grows.
const SKY_TOP = 0xd8d5cc;
const SKY_BOTTOM = 0xf2efe6;
const HILL_FAR = 0xb9beb4;
const HILL_NEAR = 0x9aa39b;
const GROUND = 0x7d8478;
const GROUND_TOP = 0xa9b09f;
const PLATFORM = 0x8a6f55;
const PLATFORM_TOP = 0xb99a76;

export class Game {
  private app: Application;
  private container: HTMLElement;
  private world = new Container();
  private sky = new Graphics();
  private sun = new Container();
  private hillsFar = new Container();
  private hillsNear = new Container();
  private playerView = new Container();
  private playerBody = new Graphics();
  private spiritView = new Container();
  private spiritBody = new Graphics();
  private particles: ParticleField;
  private body: BodyState = initialBody();
  private input: InputState = emptyInput();
  private spiritPos = { x: 120, y: 90 };
  private spiritAction: EffectEvent['spirit_action'] = 'idle';
  private spiritActionT = 99;
  private camX = 0;
  private time = 0;
  private viewW = 800;
  private viewH = 450;
  private resizeObserver: ResizeObserver | null = null;
  private tickFn: () => void;
  private destroyed = false;

  private constructor(app: Application, container: HTMLElement, dot: Texture) {
    this.app = app;
    this.container = container;
    this.particles = new ParticleField(dot);
    this.tickFn = () => this.tick();
  }

  static async create(container: HTMLElement): Promise<Game> {
    const app = new Application();
    await app.init({ background: SKY_BOTTOM, antialias: true });
    container.appendChild(app.canvas);
    const dotGraphic = new Graphics();
    dotGraphic.circle(8, 8, 8).fill(0xffffff);
    const dot = app.renderer.generateTexture(dotGraphic);
    dotGraphic.destroy();
    const game = new Game(app, container, dot);
    game.build();
    game.resize();
    game.resizeObserver = new ResizeObserver(() => game.resize());
    game.resizeObserver.observe(container);
    app.ticker.add(game.tickFn);
    return game;
  }

  setInput(patch: Partial<InputState>): void {
    Object.assign(this.input, patch);
  }

  castRitual(fx: EffectEvent): void {
    this.particles.burst(fx, this.body.x, -(this.body.y + 44));
    this.spiritAction = fx.spirit_action;
    this.spiritActionT = 0;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.app.ticker.remove(this.tickFn);
    this.resizeObserver?.disconnect();
    this.particles.destroy();
    this.app.destroy();
    this.container.innerHTML = '';
  }

  private groundScreenY(): number {
    return this.viewH * 0.78;
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.viewW = w;
    this.viewH = h;
    this.app.renderer.resize(w, h);
    this.drawSky();
  }

  private build(): void {
    this.particles.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.drawSun();
    this.drawHills(this.hillsFar, 0.2, HILL_FAR, 11);
    this.drawHills(this.hillsNear, 0.45, HILL_NEAR, 23);
    this.app.stage.addChild(this.sky, this.sun, this.hillsFar, this.hillsNear);

    const ground = new Graphics();
    ground.rect(0, 0, WORLD.width, 600).fill(GROUND);
    ground.rect(0, -5, WORLD.width, 5).fill(GROUND_TOP);
    this.world.addChild(ground);
    for (const p of PLATFORMS) {
      const g = new Graphics();
      g.roundRect(p.x, -(p.y + 18), p.w, 18, 6).fill(PLATFORM);
      g.rect(p.x + 4, -(p.y + 18), p.w - 8, 4).fill(PLATFORM_TOP);
      this.world.addChild(g);
    }
    this.buildPlayer();
    this.buildSpirit();
    this.world.addChild(this.particles.container);
    this.app.stage.addChild(this.world);
  }

  private drawSky(): void {
    const { sky, viewW: w, viewH: h } = this;
    sky.clear();
    const bands = 10;
    const top = { r: (SKY_TOP >> 16) & 0xff, g: (SKY_TOP >> 8) & 0xff, b: SKY_TOP & 0xff };
    const bottom = { r: (SKY_BOTTOM >> 16) & 0xff, g: (SKY_BOTTOM >> 8) & 0xff, b: SKY_BOTTOM & 0xff };
    for (let i = 0; i < bands; i++) {
      const t0 = i / bands;
      const r = Math.round(top.r + (bottom.r - top.r) * t0);
      const g = Math.round(top.g + (bottom.g - top.g) * t0);
      const b = Math.round(top.b + (bottom.b - top.b) * t0);
      sky.rect(0, t0 * h, w, h / bands + 1).fill((r << 16) | (g << 8) | b);
    }
    this.sun.position.set(w * 0.72, h * 0.24);
  }

  private drawSun(): void {
    const glow = new Graphics();
    glow.circle(0, 0, 64).fill({ color: 0xfff6dd, alpha: 0.5 });
    glow.circle(0, 0, 40).fill({ color: 0xffedb8, alpha: 0.7 });
    glow.circle(0, 0, 26).fill(0xffe9a8);
    this.sun.addChild(glow);
  }

  private drawHills(layer: Container, _factor: number, color: number, seed: number): void {
    const rand = mulberry32(seed);
    const g = new Graphics();
    let x = -100;
    while (x < WORLD.width + 100) {
      const w = 260 + rand() * 320;
      const h = 90 + rand() * 150;
      g.ellipse(x + w / 2, 0, w / 2, h).fill(color);
      x += w * (0.55 + rand() * 0.3);
    }
    layer.addChild(g);
  }

  private buildPlayer(): void {
    const g = this.playerBody;
    // Cloak, hood, face, facing eye. Feet origin.
    g.roundRect(-15, -40, 30, 40, 9).fill(0x2e3a44);
    g.circle(0, -47, 11.5).fill(0x2e3a44);
    g.circle(0, -45, 8).fill(0xf2c9a0);
    g.circle(3.5, -45, 1.7).fill(0x2b2620);
    g.rect(-13, -14, 26, 3).fill({ color: 0xd9b36a, alpha: 0.9 });
    this.playerView.addChild(g);
    this.world.addChild(this.playerView);
  }

  private buildSpirit(): void {
    const g = this.spiritBody;
    g.circle(0, 0, 26).fill({ color: 0xfff3cf, alpha: 0.35 });
    g.circle(0, 0, 17).fill({ color: 0xffedb8, alpha: 0.6 });
    g.circle(0, 0, 11).fill(0xfffdf4);
    g.circle(-3.5, -2, 1.6).fill(0x4a4438);
    g.circle(3.5, -2, 1.6).fill(0x4a4438);
    this.spiritView.addChild(g);
    this.world.addChild(this.spiritView);
  }

  private tick(): void {
    if (this.destroyed) return;
    const dt = Math.min(this.app.ticker.deltaMS / 1000, 0.05);
    this.time += dt;
    this.body = stepBody(this.body, this.input, dt);
    this.input.jumpPressed = false;
    this.updateCamera(dt);
    this.updatePlayerView();
    this.updateSpirit(dt);
    this.particles.update(dt, this.time);
    this.world.position.set(-this.camX, this.groundScreenY());
    this.hillsFar.position.set(-this.camX * 0.2, this.groundScreenY() + 6);
    this.hillsNear.position.set(-this.camX * 0.45, this.groundScreenY() + 6);
  }

  private updateCamera(dt: number): void {
    const maxCam = Math.max(0, WORLD.width - this.viewW);
    const target = Math.min(Math.max(this.body.x - this.viewW * 0.42, 0), maxCam);
    this.camX += (target - this.camX) * Math.min(1, dt * 6);
  }

  private updatePlayerView(): void {
    const b = this.body;
    const moving = Math.abs(b.vx) > 1 && b.onGround;
    const bob = moving ? Math.sin(this.time * 14) * 2.2 : Math.sin(this.time * 3) * 1.1;
    this.playerView.position.set(b.x, -b.y + bob);
    this.playerView.scale.x = b.facing;
    this.playerView.rotation = moving ? b.facing * 0.04 : 0;
  }

  private updateSpirit(dt: number): void {
    this.spiritActionT += dt;
    const hoverY = 96 + Math.sin(this.time * 2.2) * 8;
    const targetX = this.body.x - this.body.facing * 74;
    const targetY = this.body.y + hoverY;
    const k = Math.min(1, dt * 3.2);
    this.spiritPos.x += (targetX - this.spiritPos.x) * k;
    this.spiritPos.y += (targetY - this.spiritPos.y) * k;

    let dx = 0;
    let dy = 0;
    let scale = 1;
    const t = this.spiritActionT;
    if (t < 1.4) {
      if (this.spiritAction === 'nod') dy = Math.abs(Math.sin(t * 9)) * 9;
      else if (this.spiritAction === 'bounce') dy = -Math.abs(Math.sin(t * 9)) * 26;
      else if (this.spiritAction === 'wave') dx = Math.sin(t * 12) * 10;
      else if (this.spiritAction === 'curl') scale = 0.72;
    }
    this.spiritView.position.set(this.spiritPos.x + dx, -(this.spiritPos.y + dy));
    this.spiritView.scale.set(scale);
  }
}
