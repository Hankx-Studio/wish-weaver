import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildTraveler, walkPose } from '../../src/features/world/traveler';

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
    const a = walkPose(0);
    const b = walkPose(Math.PI * 2);
    for (const k of ['legL', 'legR', 'armL', 'armR', 'bob'] as const) {
      expect(b[k]).toBeCloseTo(a[k], 10);
    }
  });
});

const stubToon = (color: number): THREE.MeshToonMaterial =>
  new THREE.MeshToonMaterial({ color });

describe('buildTraveler', () => {
  it('returns a complete rig with feet-origin group', () => {
    const rig = buildTraveler(stubToon);
    expect(rig.group.position.y).toBe(0);
    expect(rig.body.parent).toBe(rig.group);
    for (const joint of [rig.legL, rig.legR, rig.armL, rig.armR]) {
      expect(joint.parent).toBe(rig.body);
    }
    expect(rig.eyeL.parent).toBe(rig.body);
    expect(rig.eyeR.parent).toBe(rig.body);
  });

  it('builds a 3-segment cape-hem flutter chain behind the body', () => {
    const rig = buildTraveler(stubToon);
    expect(rig.scarf).toHaveLength(3);
    expect(rig.scarf[0].parent).toBe(rig.body);
    expect(rig.scarf[0].position.z).toBeLessThan(0);
    for (let i = 1; i < 3; i++) {
      expect(rig.scarf[i].parent).toBe(rig.scarf[i - 1]);
      expect(rig.scarf[i].position.z).toBeLessThan(0);
    }
  });

  it('includes layered cape, clasp, hair tufts, satchel, and bedroll', () => {
    const rig = buildTraveler(stubToon);
    for (const name of [
      'capelet',
      'capeOuter',
      'capeLining',
      'clasp',
      'hairTufts',
      'satchel',
      'bedroll',
    ]) {
      expect(rig.group.getObjectByName(name), name).toBeDefined();
    }
    // Cape layers sit behind the torso, clasp at the chest front.
    expect(rig.group.getObjectByName('capeOuter')!.position.z).toBeLessThan(0);
    expect(rig.group.getObjectByName('clasp')!.position.z).toBeGreaterThan(0);
  });

  it('gives each eye a sparkle child that blinks with it', () => {
    const rig = buildTraveler(stubToon);
    expect(rig.eyeL.children).toHaveLength(1);
    expect(rig.eyeR.children).toHaveLength(1);
  });
});
