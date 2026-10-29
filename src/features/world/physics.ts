// Pure platformer physics (world units = pixels, y-up, feet origin).
// Kept free of Pixi so unit tests can drive it directly.

export interface BodyState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facing: 1 | -1;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
}

// y = top surface height. One-way: land from above only.
export interface Platform {
  x: number;
  y: number;
  w: number;
}

export const WORLD = {
  width: 2400,
  minX: 40,
  maxX: 2360,
  gravity: 1500,
  moveSpeed: 260,
  jumpVel: 560,
} as const;

export const PLATFORMS: Platform[] = [
  { x: 500, y: 120, w: 220 },
  { x: 900, y: 220, w: 200 },
  { x: 1300, y: 140, w: 240 },
  { x: 1750, y: 240, w: 200 },
];

export function initialBody(): BodyState {
  return { x: 200, y: 0, vx: 0, vy: 0, onGround: true, facing: 1 };
}

export function emptyInput(): InputState {
  return { left: false, right: false, jumpHeld: false, jumpPressed: false };
}

export function stepBody(
  s: BodyState,
  input: InputState,
  dt: number,
  platforms: Platform[] = PLATFORMS,
): BodyState {
  const step = Math.min(Math.max(dt, 0), 0.05);
  let { x, y, vx, vy, onGround, facing } = s;

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  vx = dir * WORLD.moveSpeed;
  if (dir !== 0) facing = dir as 1 | -1;

  if (input.jumpPressed && onGround) {
    vy = WORLD.jumpVel;
    onGround = false;
  }

  vy -= WORLD.gravity * step;
  const prevY = y;
  x += vx * step;
  y += vy * step;

  if (x < WORLD.minX) x = WORLD.minX;
  if (x > WORLD.maxX) x = WORLD.maxX;

  onGround = false;
  if (y <= 0) {
    y = 0;
    vy = 0;
    onGround = true;
  } else if (vy <= 0) {
    for (const p of platforms) {
      const withinX = x >= p.x && x <= p.x + p.w;
      if (withinX && prevY >= p.y && y <= p.y) {
        y = p.y;
        vy = 0;
        onGround = true;
        break;
      }
    }
  }

  return { x, y, vx, vy, onGround, facing };
}
