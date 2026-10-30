import { describe, expect, it } from 'vitest';
import { walkPose } from '../../src/features/world/traveler';

describe('walkPose', () => {
  it('swings limbs antisymmetrically', () => {
    for (const phase of [0, 0.7, 2.1, 4.4]) {
      const p = walkPose(phase);
      expect(p.legL).toBeCloseTo(-p.legR, 10);
      expect(p.armL).toBeCloseTo(-p.armR, 10);
    }
  });

  it('stays within joint limits with non-negative bob', () => {
    for (let i = 0; i < 16; i++) {
      const p = walkPose((i / 16) * Math.PI * 2);
      for (const a of [p.legL, p.legR, p.armL, p.armR]) {
        expect(Math.abs(a)).toBeLessThanOrEqual(0.6);
      }
      expect(p.bob).toBeGreaterThanOrEqual(0);
      expect(p.bob).toBeLessThanOrEqual(0.08);
    }
  });

  it('completes a full cycle every 2π', () => {
    expect(walkPose(0)).toEqual(walkPose(Math.PI * 2));
  });
});
