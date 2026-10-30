import * as THREE from 'three';
import { mulberry32, type EffectEvent } from '@/lib/effects/types';
import { Fireflies, ParticleField, makeSoftDotTexture } from './particles';
import {
  STONES,
  WORLD3D,
  emptyMoveInput,
  initialBody3,
  stepBody3,
  type BodyState,
  type MoveInput,
} from './physics';

// Screen-space input from keyboard/touch. iz=-1 means "away from camera".
export interface ScreenInput {
  ix: number;
  iz: number;
  jumpPressed: boolean;
}

const SKY_TOP = new THREE.Color(0x7fb2e5);
const SKY_BOTTOM = new THREE.Color(0xf6d9a8);
const FOG_COLOR = new THREE.Color(0xeed9b4);

function makeToonRamp(steps = 4): THREE.DataTexture {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round((i / (steps - 1)) * 255);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private clock = new THREE.Clock();
  private toonRamp = makeToonRamp();
  private player = new THREE.Group();
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
    renderer.toneMappingExposure = 1.05;
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
    this.scene.fog = new THREE.Fog(FOG_COLOR, 60, 220);

    const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a9a7b, 0.9);
    this.scene.add(hemi);
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
    this.scene.add(sun);

    this.buildSky();
    this.buildGround();
    this.buildMountains();
    this.buildClouds();
    this.buildArch();
    this.buildTrees();
    this.buildGrass();
    this.buildFlowers();
    this.buildStones();
    this.buildTraveler();
    this.buildWisp();
    this.scene.add(this.particles.group, this.fireflies.points);
    this.attachOrbit();
  }

  private buildSky(): void {
    const geo = new THREE.SphereGeometry(400, 24, 16);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = THREE.MathUtils.clamp(pos.getY(i) / 400 + 0.12, 0, 1);
      c.copy(SKY_BOTTOM).lerp(SKY_TOP, Math.pow(t, 0.65));
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
    this.scene.add(sky);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeSoftDotTexture(),
        color: 0xffedb8,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        fog: false,
      }),
    );
    halo.position.set(150, 190, 60);
    halo.scale.set(150, 150, 1);
    this.scene.add(halo);
  }

  private buildGround(): void {
    const geo = new THREE.CircleGeometry(WORLD3D.radius + 8, 56);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(0x7fa35a);
    const sunlit = new THREE.Color(0xa9c46b);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n = 0.5 + 0.5 * Math.sin(x * 0.11 + 1.7) * Math.cos(z * 0.13 - 0.6);
      c.copy(base).lerp(sunlit, n * 0.75);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const ground = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
    );
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private buildMountains(): void {
    const rand = mulberry32(31);
    const mat = this.toon(0x8fa3b8);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
      const r = 150 + rand() * 60;
      const h = 40 + rand() * 45;
      const m = new THREE.Mesh(new THREE.ConeGeometry(28 + rand() * 22, h, 5), mat);
      m.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r);
      m.rotation.y = rand() * Math.PI;
      this.scene.add(m);
    }
  }

  private buildClouds(): void {
    const tex = makeSoftDotTexture();
    this.disposables.push(tex);
    const rand = mulberry32(97);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: 0xfff6e8,
        transparent: true,
        opacity: 0.75 + rand() * 0.2,
        depthWrite: false,
      });
      const s = new THREE.Sprite(mat);
      const a = rand() * Math.PI * 2;
      const r = 60 + rand() * 90;
      s.position.set(Math.cos(a) * r, 26 + rand() * 22, Math.sin(a) * r);
      const w = 30 + rand() * 30;
      s.scale.set(w, w * 0.42, 1);
      this.clouds.push(s);
      this.scene.add(s);
    }
  }

  private buildArch(): void {
    const mat = this.toon(0x9a958a);
    const arch = new THREE.Group();
    const top = new THREE.Mesh(new THREE.TorusGeometry(4, 0.9, 8, 14, Math.PI), mat);
    top.position.y = 5;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5, 1.8), mat);
    legL.position.set(-4, 2.5, 0);
    const legR = legL.clone();
    legR.position.x = 4;
    arch.add(top, legL, legR);
    arch.position.set(18, 0, -30);
    arch.rotation.y = 0.5;
    arch.traverse((o: THREE.Object3D) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.scene.add(arch);
  }

  private buildTrees(): void {
    const rand = mulberry32(53);
    const trunkMat = this.toon(0x7a5c42);
    const leafMats = [0x5d8f4e, 0x6fa055, 0x4f7d46].map(
      (c) => this.toon(c),
    );
    const spots: Array<[number, number]> = [[-24, -6], [26, 10], [-8, -34], [34, -22], [-34, 20]];
    for (const [x, z] of spots) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 2.6, 6), trunkMat);
      trunk.position.y = 1.3;
      tree.add(trunk);
      const puffs = 2 + Math.floor(rand() * 2);
      for (let i = 0; i < puffs; i++) {
        const mat = leafMats[Math.floor(rand() * leafMats.length)]!;
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + rand() * 0.9, 1), mat);
        puff.position.set((rand() - 0.5) * 2.2, 3 + rand() * 1.6, (rand() - 0.5) * 2.2);
        tree.add(puff);
      }
      tree.position.set(x, 0, z);
      tree.traverse((o: THREE.Object3D) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this.scene.add(tree);
    }
  }

  private scatterOnDisc(count: number, radius: number, seed: number): Array<{ x: number; z: number; s: number; r: number }> {
    const rand = mulberry32(seed);
    const out: Array<{ x: number; z: number; s: number; r: number }> = [];
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * radius;
      out.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.7 + rand() * 0.7, r: rand() * Math.PI * 2 });
    }
    return out;
  }

  private buildGrass(): void {
    const geo = new THREE.ConeGeometry(0.09, 0.55, 4);
    const mat = this.toon(0xffffff);
    const spots = this.scatterOnDisc(600, 52, 11);
    const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    spots.forEach((p, i) => {
      dummy.position.set(p.x, 0.24 * p.s, p.z);
      dummy.rotation.set(0, p.r, 0);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setHex(0x6f9a4e).offsetHSL((p.r % 1) * 0.02 - 0.01, 0, (p.s - 1) * 0.1);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
  }

  private buildFlowers(): void {
    const spots = this.scatterOnDisc(150, 50, 29);
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 5);
    const stemMat = this.toon(0x4f7d46);
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, spots.length);
    const headGeo = new THREE.IcosahedronGeometry(0.13, 0);
    const headMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      gradientMap: this.toonRamp,
      emissive: 0x554422,
      emissiveIntensity: 0.7,
    });
    const heads = new THREE.InstancedMesh(headGeo, headMat, spots.length);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const palette = [0xffb3d9, 0x9ad9ff, 0xffd97a];
    spots.forEach((p, i) => {
      dummy.position.set(p.x, 0.25 * p.s, p.z);
      dummy.rotation.set(0, p.r, 0);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.52 * p.s;
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
      color.setHex(palette[i % palette.length]!);
      heads.setColorAt(i, color);
    });
    stems.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    this.scene.add(stems, heads);
  }

  private buildStones(): void {
    const mat = this.toon(0x8d8a80);
    for (const st of STONES) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(st.r, st.r * 1.15, 1.2, 7), mat);
      m.position.set(st.x, st.y - 0.6, st.z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    }
  }

  private buildTraveler(): void {
    const cloak = this.toon(0x2e3a44);
    const skin = this.toon(0xf2c9a0);
    const gold = this.toon(0xd9b36a);
    const dark = this.toon(0x2b2620);

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 10), cloak);
    body.position.y = 0.9;
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), cloak);
    hood.position.set(0, 1.82, -0.06);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), skin);
    head.position.set(0, 1.78, 0.1);
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, dark);
    eyeL.position.set(-0.11, 1.8, 0.37);
    const eyeR = new THREE.Mesh(eyeGeo, dark);
    eyeR.position.set(0.11, 1.8, 0.37);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 14), gold);
    scarf.position.y = 1.42;
    scarf.rotation.x = Math.PI / 2;
    this.player.add(body, hood, head, eyeL, eyeR, scarf);
    this.player.traverse((o: THREE.Object3D) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    this.scene.add(this.player);
  }

  private buildWisp(): void {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0xfffdf4 }),
    );
    const glowTex = makeSoftDotTexture();
    this.disposables.push(glowTex);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffe9b8,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.scale.set(2.4, 2.4, 1);
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x4a4438 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.11, 0.05, 0.29);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.11, 0.05, 0.29);
    this.wisp.add(core, glow, eyeL, eyeR, this.wispLight);
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
    this.updatePlayer();
    this.updateWisp(dt);
    this.particles.update(dt, this.time);
    this.fireflies.update(this.time);
    for (const [i, cloud] of this.clouds.entries()) {
      cloud.position.x += dt * (0.3 + (i % 3) * 0.15);
      if (cloud.position.x > 160) cloud.position.x = -160;
    }
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

  private updatePlayer(): void {
    const b = this.body;
    const moving = Math.hypot(b.vx, b.vz) > 0.5;
    const bob = b.onGround
      ? moving
        ? Math.abs(Math.sin(this.time * 11)) * 0.09
        : Math.sin(this.time * 2.4) * 0.02
      : 0;
    this.player.position.set(b.x, b.y + bob, b.z);
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

    let dy = 0;
    let dx = 0;
    let scale = 1;
    const t = this.spiritT;
    if (t < 1.4) {
      if (this.spiritAction === 'nod') dy = -Math.abs(Math.sin(t * 9)) * 0.25;
      else if (this.spiritAction === 'bounce') dy = Math.abs(Math.sin(t * 9)) * 0.8;
      else if (this.spiritAction === 'wave') dx = Math.sin(t * 12) * 0.3;
      else if (this.spiritAction === 'curl') scale = 0.72;
    }
    this.wisp.position.y += dy;
    this.wisp.position.x += dx;
    this.wisp.scale.setScalar(scale);
    this.wispLight.intensity = 8 + Math.sin(this.time * 3) * 1.5;
  }
}
