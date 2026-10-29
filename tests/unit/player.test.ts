import { describe, expect, it } from 'vitest';
import {
  WORLD,
  emptyInput,
  initialBody,
  stepBody,
} from '../../src/features/world/physics';

function run(body = initialBody(), input = emptyInput(), frames = 120, dt = 1 / 60) {
  let s = body;
  for (let i = 0; i < frames; i++) s = stepBody(s, { ...input, jumpPressed: i === 0 && input.jumpPressed }, dt);
  return s;
}

describe('stepBody', () => {
  it('stands still on the ground without input', () => {
    const s = run();
    expect(s.y).toBe(0);
    expect(s.onGround).toBe(true);
    expect(s.x).toBe(200);
  });

  it('runs right and left', () => {
    const right = run(initialBody(), { ...emptyInput(), right: true }, 60);
    expect(right.x).toBeGreaterThan(200);
    expect(right.facing).toBe(1);
    const left = run(initialBody(), { ...emptyInput(), left: true }, 60);
    expect(left.x).toBeLessThan(200);
    expect(left.facing).toBe(-1);
  });

  it('jumps and lands back on the ground', () => {
    let s = stepBody(initialBody(), { ...emptyInput(), jumpPressed: true }, 1 / 60);
    expect(s.onGround).toBe(false);
    let peak = 0;
    for (let i = 0; i < 180; i++) {
      s = stepBody(s, emptyInput(), 1 / 60);
      peak = Math.max(peak, s.y);
    }
    expect(peak).toBeGreaterThan(50);
    expect(s.y).toBe(0);
    expect(s.onGround).toBe(true);
  });

  it('ignores jump while airborne', () => {
    const air = { ...initialBody(), y: 100, vy: 0, onGround: false };
    const s = stepBody(air, { ...emptyInput(), jumpPressed: true }, 1 / 60);
    expect(s.vy).toBeLessThan(0);
  });

  it('stays inside world bounds', () => {
    const farLeft = run(initialBody(), { ...emptyInput(), left: true }, 600);
    expect(farLeft.x).toBe(WORLD.minX);
    const farRight = run(initialBody(), { ...emptyInput(), right: true }, 1200);
    expect(farRight.x).toBe(WORLD.maxX);
  });

  it('lands on a platform top when falling onto it', () => {
    const above = { ...initialBody(), x: 600, y: 300, vy: -10, onGround: false };
    const s = run(above, emptyInput(), 120);
    expect(s.y).toBe(120);
    expect(s.onGround).toBe(true);
  });
});
