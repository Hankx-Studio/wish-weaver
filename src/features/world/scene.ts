import * as THREE from 'three';
import { type EffectEvent } from '@/lib/effects/types';
import { Fireflies, ParticleField, makeSoftDotTexture } from './particles';
import { buildTraveler, walkPose, type TravelerRig } from './traveler';
import {
  emptyMoveInput,
  initialBody3,
  stepBody3,
  type BodyState,
  type MoveInput,
} from './physics';
import {
  buildClouds,
  buildMountains,
  buildSkyDome,
  makeToonRamp,
  setupLightsAndFog,
  updateClouds,
} from './world/sky';
import { buildFlowers, buildGrass, buildGround, buildStones } from './world/ground';
import { buildArch, buildStoneLanterns, buildTrees } from './world/props';
import { wispActionOffset } from './world/wisp';
import { buildCast, type Cast } from './world/cast';
import { createHeroM } from './world/actors/hero-m';
import { createHeroF } from './world/actors/hero-f';
import { createSpirit, updateSpirit } from './world/actors/spirit';

// Screen-space input from keyboard/touch. iz=-1 means "away from camera".
export interface ScreenInput {
  ix: number;
  iz: number;
  jumpPressed: boolean;
}

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private clock = new THREE.Clock();
  private toonRamp = makeToonRamp();
  private player = new THREE.Group();
  private rig: TravelerRig | null = null;
  private walkPhase = 0;
  private squash = 0;
  private wasGround = true;
  private wisp = new THREE.Group();
  private wispLight: THREE.PointLight;
  private particles: ParticleField;
  private fireflies = new Fireflies();
  private clouds: THREE.Sprite[] = [];
  private body: BodyState = initialBody3();
  private move: MoveInput = emptyMoveInput();
  private camYaw = 0;
  private camPitch = 0.42;
  private camPos = new THREE.Vector3(0, 8, 20);
  private spiritAction: EffectEvent['spirit_action'] = 'idle';
  private spiritT = 99;
  private cast: Cast | null = null;
  private heroGender: 'm' | 'f' = 'm';
  private wispLast = new THREE.Vector3();
  private time = 0;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;
  private disposables: Array<{ dispose(): void }> = [];

  private constructor(renderer: THREE.WebGLRenderer, container: HTMLElement) {
    this.renderer = renderer;
    this.container = container;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    const dot = makeSoftDotTexture();
    this.particles = new ParticleField(dot);
    this.disposables.push(dot);
    this.wispLight = new THREE.PointLight(0xffe9b8, 8, 18, 2);
  }

  static async create(container: HTMLElement): Promise<Game> {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    const game = new Game(renderer, container);
    game.build();
    game.resize();
    game.resizeObserver = new ResizeObserver(() => game.resize());
    game.resizeObserver.observe(container);
    renderer.setAnimationLoop(() => game.tick());
    return game;
  }

  setInput(patch: Partial<ScreenInput>): void {
    if (patch.ix !== undefined || patch.iz !== undefined) {
      const ix = patch.ix ?? this.screenIx;
      const iz = patch.iz ?? this.screenIz;
      this.screenIx = ix;
      this.screenIz = iz;
      // Rotate screen input by camera yaw into world space. Camera sits at
      // yaw behind the player, so forward = -(sin yaw, cos yaw).
      const s = Math.sin(this.camYaw);
      const c = Math.cos(this.camYaw);
      this.move.mx = ix * c + iz * s;
      this.move.mz = -ix * s + iz * c;
    }
    if (patch.jumpPressed !== undefined) this.move.jumpPressed = patch.jumpPressed;
  }

  private screenIx = 0;
  private screenIz = 0;

  castRitual(fx: EffectEvent): void {
    this.particles.burst(
      fx,
      new THREE.Vector3(this.body.x, this.body.y + 1.4, this.body.z),
    );
    this.spiritAction = fx.spirit_action;
    this.spiritT = 0;
  }

  /** Swap the playable hero model (M/F). Called by the H key. */
  toggleHero(): void {
    this.heroGender = this.heroGender === 'm' ? 'f' : 'm';
    this.player.clear();
    this.rig = this.buildHeroRig();
    this.player.add(this.rig.group);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver?.disconnect();
    this.particles.dispose();
    this.fireflies.dispose();
    this.scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    for (const d of this.disposables) d.dispose();
    const canvas = this.renderer.domElement;
    this.renderer.dispose();
    // Only remove OUR canvas; a newer StrictMode boot may own the container now.
    if (canvas && canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }

  private toon(color: number, extra: Partial<THREE.MeshToonMaterialParameters> = {}) {
    return new THREE.MeshToonMaterial({ color, gradientMap: this.toonRamp, ...extra });
  }

  private build(): void {
    this.particles.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setupLightsAndFog(this.scene);

    const toon = (color: number) => this.toon(color);
    buildSkyDome(this.scene);
    buildGround(this.scene);
    buildMountains(this.scene, toon);
    const clouds = buildClouds(this.scene);
    this.clouds = clouds.sprites;
    this.disposables.push(clouds.texture);
    buildArch(this.scene, toon);
    buildTrees(this.scene, toon);
    // (Legacy roadside stall retired: shop-center in cast.ts is the shop now,
    // and the stall sat in the spawn-camera path.)
    buildStoneLanterns(this.scene, toon);
    buildGrass(this.scene, toon);
    buildFlowers(this.scene, toon, this.toonRamp);
    buildStones(this.scene, toon);
    this.buildTraveler();
    this.buildWisp();
    this.cast = buildCast(this.scene, toon);
    this.scene.add(this.particles.group, this.fireflies.points);
    this.attachOrbit();
  }

  private buildTraveler(): void {
    this.rig = this.buildHeroRig();
    this.player.add(this.rig.group);
    this.scene.add(this.player);
  }

  /** Player visual = detailed hero model; falls back to the legacy traveler. */
  private buildHeroRig(): TravelerRig {
    const toon = (color: number) => this.toon(color);
    const hero = this.heroGender === 'm' ? createHeroM(toon) : createHeroF(toon);
    const get = (name: string) => hero.getObjectByName(name);
    const legL = get('legL');
    const legR = get('legR');
    const armL = get('armL');
    const armR = get('armR');
    const s0 = get('scarf0');
    const s1 = get('scarf1');
    const s2 = get('scarf2');
    const eyeL = get('eyeL');
    const eyeR = get('eyeR');
    if (!legL || !legR || !armL || !armR || !s0 || !s1 || !s2 || !eyeL || !eyeR) {
      return buildTraveler(toon);
    }
    // Outer group keeps feet origin + yaw; inner body takes bob/squash.
    const group = new THREE.Group();
    const body = new THREE.Group();
    body.add(hero);
    group.add(body);
    return {
      group,
      body,
      legL: legL as THREE.Group,
      legR: legR as THREE.Group,
      armL: armL as THREE.Group,
      armR: armR as THREE.Group,
      scarf: [s0 as THREE.Group, s1 as THREE.Group, s2 as THREE.Group],
      eyeL: eyeL as THREE.Mesh,
      eyeR: eyeR as THREE.Mesh,
    };
  }

  private buildWisp(): void {
    this.wisp = createSpirit();
    this.wispLight.position.set(0, 0.6, 0);
    this.wisp.add(this.wispLight);
    this.wispLast.set(0, 2.4, 6);
    this.scene.add(this.wisp);
  }

  private attachOrbit(): void {
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      this.dragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.dragging) return;
      this.camYaw -= (e.clientX - this.lastPointer.x) * 0.005;
      this.camPitch = THREE.MathUtils.clamp(
        this.camPitch + (e.clientY - this.lastPointer.y) * 0.003,
        0.12,
        1.1,
      );
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });
    const stop = () => {
      this.dragging = false;
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private tick(): void {
    if (this.destroyed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    this.body = stepBody3(this.body, this.move, dt);
    this.move.jumpPressed = false;
    this.updateCamera(dt);
    this.updatePlayer(dt);
    this.updateWisp(dt);
    this.cast?.update(this.time, dt, this.player.position);
    this.particles.update(dt, this.time);
    this.fireflies.update(this.time);
    updateClouds(this.clouds, dt);
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(dt: number): void {
    const dist = 14;
    const target = new THREE.Vector3(
      this.body.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * dist,
      this.body.y + 2 + Math.sin(this.camPitch) * dist,
      this.body.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * dist,
    );
    this.camPos.lerp(target, Math.min(1, dt * 6));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.body.x, this.body.y + 2, this.body.z);
  }

  private updatePlayer(dt: number): void {
    const b = this.body;
    const rig = this.rig;
    const speed = Math.hypot(b.vx, b.vz);
    const moving = speed > 0.5 && b.onGround;

    if (!this.wasGround && b.onGround) this.squash = 0.22;
    this.wasGround = b.onGround;
    this.squash *= Math.exp(-9 * dt);

    if (rig) {
      if (!b.onGround) {
        // Airborne: legs tucked, arms out.
        rig.legL.rotation.x = -0.55;
        rig.legR.rotation.x = 0.4;
        rig.armL.rotation.set(-0.4, 0, 0.7);
        rig.armR.rotation.set(-0.4, 0, -0.7);
        rig.body.position.y = 0;
        rig.body.scale.set(1.02, 0.98, 1.02);
      } else if (moving) {
        this.walkPhase += dt * (4 + speed * 1.1);
        const p = walkPose(this.walkPhase);
        rig.legL.rotation.x = p.legL;
        rig.legR.rotation.x = p.legR;
        rig.armL.rotation.set(p.armL, 0, 0.08);
        rig.armR.rotation.set(p.armR, 0, -0.08);
        rig.body.position.y = p.bob;
        rig.body.scale.set(1, 1, 1);
      } else {
        // Idle: ease to neutral + breathe.
        const k = Math.min(1, dt * 8);
        for (const [joint, target] of [
          [rig.legL, 0],
          [rig.legR, 0],
          [rig.armL, 0],
          [rig.armR, 0],
        ] as const) {
          joint.rotation.x += (target - joint.rotation.x) * k;
          joint.rotation.z += (0 - joint.rotation.z) * k;
        }
        const breath = 1 + Math.sin(this.time * 2.4) * 0.015;
        rig.body.scale.set(2 - breath, breath, 2 - breath);
        rig.body.position.y = Math.sin(this.time * 2.4) * 0.02;
      }
      if (this.squash > 0.003) {
        const s = this.squash;
        rig.body.scale.set(1 + s * 0.6, 1 - s, 1 + s * 0.6);
      }
      // Blink.
      const blink = this.time % 3.7 < 0.12 ? 0.12 : 1;
      rig.eyeL.scale.y = blink;
      rig.eyeR.scale.y = blink;
      // Scarf flutter: traveling wave, stronger when moving.
      const amp = 0.18 + (moving ? 0.3 : 0) + (!b.onGround ? 0.35 : 0);
      rig.scarf.forEach((seg, i) => {
        seg.rotation.x = -0.35 - i * 0.12 + Math.sin(this.time * 7 - i * 1.1) * amp;
        seg.rotation.y = Math.sin(this.time * 5.3 - i * 0.9) * amp * 0.5;
      });
    }

    this.player.position.set(b.x, b.y, b.z);
    // Smooth-turn toward the physics facing.
    let d = b.facing - this.player.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.player.rotation.y += d * 0.18;
    this.player.rotation.x = moving ? 0.08 : 0;
  }

  private updateWisp(dt: number): void {
    this.spiritT += dt;
    const hoverY = 2.4 + Math.sin(this.time * 2.2) * 0.25;
    const fx = Math.sin(this.body.facing);
    const fz = Math.cos(this.body.facing);
    const target = new THREE.Vector3(
      this.body.x - fx * 2.4,
      this.body.y + hoverY,
      this.body.z - fz * 2.4,
    );
    this.wisp.position.lerp(target, Math.min(1, dt * 3.2));

    // Feed velocity into the spirit so it tilts into motion.
    if (dt > 0) {
      const vel = this.wisp.position.clone().sub(this.wispLast).divideScalar(dt);
      this.wisp.userData.velocity = vel;
    }
    this.wispLast.copy(this.wisp.position);
    updateSpirit(this.wisp, this.time, dt);
    const { dx, dy, scale } = wispActionOffset(this.spiritAction, this.spiritT);
    this.wisp.position.y += dy;
    this.wisp.position.x += dx;
    this.wisp.scale.setScalar(scale);
    this.wispLight.intensity = 8 + Math.sin(this.time * 3) * 1.5;
  }
}
