// Pure 3D platformer physics (meters, y-up, feet origin).
// Camera-agnostic: the scene converts camera-relative input to world (mx, mz).
// Kept free of three.js so unit tests drive it directly.

export interface BodyState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  onGround: boolean;
  facing: number; // model yaw, radians; atan2 convention (x right, z toward cam)
}

export interface MoveInput {
  mx: number; // world-space wish direction
  mz: number;
  jumpPressed: boolean;
}

// Flat-topped stepping stone. One-way: land from above only.
export interface Stone {
  x: number;
  z: number;
  y: number;
  r: number;
}

export const WORLD3D = {
  radius: 55,
  gravity: 22,
  moveSpeed: 8,
  jumpVel: 8,
} as const;

export const STONES: Stone[] = [
  { x: 10, z: -8, y: 1.6, r: 3.2 },
  { x: -12, z: -16, y: 3.0, r: 2.8 },
  { x: 2, z: -26, y: 4.4, r: 2.6 },
  { x: -20, z: 8, y: 1.6, r: 3.0 },
];

export function initialBody3(): BodyState {
  return { x: 0, y: 0, z: 6, vx: 0, vy: 0, vz: 0, onGround: true, facing: Math.PI };
}

export function emptyMoveInput(): MoveInput {
  return { mx: 0, mz: 0, jumpPressed: false };
}

export function stepBody3(
  s: BodyState,
  input: MoveInput,
  dt: number,
  stones: Stone[] = STONES,
): BodyState {
  const step = Math.min(Math.max(dt, 0), 0.05);
  let { x, y, z, vx, vy, vz, onGround, facing } = s;

  const mag = Math.hypot(input.mx, input.mz);
  if (mag > 0.01) {
    const nx = input.mx / Math.max(mag, 1);
    const nz = input.mz / Math.max(mag, 1);
    vx = nx * WORLD3D.moveSpeed;
    vz = nz * WORLD3D.moveSpeed;
    facing = Math.atan2(nx, nz);
  } else {
    vx = 0;
    vz = 0;
  }

  if (input.jumpPressed && onGround) {
    vy = WORLD3D.jumpVel;
    onGround = false;
  }

  vy -= WORLD3D.gravity * step;
  const prevY = y;
  x += vx * step;
  y += vy * step;
  z += vz * step;

  const dist = Math.hypot(x, z);
  if (dist > WORLD3D.radius) {
    x = (x / dist) * WORLD3D.radius;
    z = (z / dist) * WORLD3D.radius;
  }

  onGround = false;
  if (y <= 0) {
    y = 0;
    vy = 0;
    onGround = true;
  } else if (vy <= 0) {
    for (const st of stones) {
      const dx = x - st.x;
      const dz = z - st.z;
      if (dx * dx + dz * dz <= st.r * st.r && prevY >= st.y && y <= st.y) {
        y = st.y;
        vy = 0;
        onGround = true;
        break;
      }
    }
  }

  return { x, y, z, vx, vy, vz, onGround, facing };
}
