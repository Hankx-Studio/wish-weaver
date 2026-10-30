import { describe, expect, it } from 'vitest';
import {
  WORLD3D,
  emptyMoveInput,
  initialBody3,
  stepBody3,
} from '../../src/features/world/physics';

function run(
  body = initialBody3(),
  input = emptyMoveInput(),
  frames = 120,
  dt = 1 / 60,
) {
  let s = body;
  for (let i = 0; i < frames; i++) {
    s = stepBody3(s, { ...input, jumpPressed: i === 0 && input.jumpPressed }, dt);
  }
  return s;
}

describe('stepBody3', () => {
  it('stands still on the ground without input', () => {
    const s = run();
    expect(s.y).toBe(0);
    expect(s.onGround).toBe(true);
    expect(s.x).toBe(0);
    expect(s.z).toBe(6);
  });

  it('runs in the wish direction and faces it', () => {
    const s = run(initialBody3(), { mx: 1, mz: 0, jumpPressed: false }, 60);
    expect(s.x).toBeGreaterThan(0);
    expect(s.facing).toBeCloseTo(Math.PI / 2, 5);
  });

  it('jumps and lands back on the ground', () => {
    let s = stepBody3(initialBody3(), { mx: 0, mz: 0, jumpPressed: true }, 1 / 60);
    expect(s.onGround).toBe(false);
    let peak = 0;
    for (let i = 0; i < 180; i++) {
      s = stepBody3(s, emptyMoveInput(), 1 / 60);
      peak = Math.max(peak, s.y);
    }
    expect(peak).toBeGreaterThan(1);
    expect(s.y).toBe(0);
    expect(s.onGround).toBe(true);
  });

  it('ignores jump while airborne', () => {
    const air = { ...initialBody3(), y: 3, vy: 0, onGround: false };
    const s = stepBody3(air, { mx: 0, mz: 0, jumpPressed: true }, 1 / 60);
    expect(s.vy).toBeLessThan(0);
  });

  it('stays inside the meadow radius', () => {
    const s = run(initialBody3(), { mx: 1, mz: 0, jumpPressed: false }, 1200);
    expect(Math.hypot(s.x, s.z)).toBeLessThanOrEqual(WORLD3D.radius + 1e-6);
  });

  it('lands on a stone top when falling onto it', () => {
    const above = { ...initialBody3(), x: 10, y: 8, z: -8, vy: -1, onGround: false };
    const s = run(above, emptyMoveInput(), 120);
    expect(s.y).toBe(1.6);
    expect(s.onGround).toBe(true);
  });
});
