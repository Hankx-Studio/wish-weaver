import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createHeroM, updateHeroM } from '../../src/features/world/world/actors/hero-m';

// Full rig contract: pivots plus both eye mounts.
const RIG_NODES = [
  'hips',
  'legL',
  'legR',
  'torso',
  'head',
  'armL',
  'armR',
  'scarf0',
  'scarf1',
  'scarf2',
  'eyeL',
  'eyeR',
];

// Turnaround detail parts (plus cloak/scarfWrap kept from the base suite).
const DETAIL_PARTS = [
  'hood',
  'cloak',
  'scarfWrap',
  'scarfFringe',
  'satchel',
  'satchelFlap',
  'buckle',
  'strap',
  'bootL',
  'bootR',
  'belt',
  'toggles',
  'lacesL',
  'lacesR',
  'freckles',
];

function boxOf(g: THREE.Group): THREE.Box3 {
  return new THREE.Box3().setFromObject(g);
}

describe('hero-m fidelity', () => {
  it('builds every rig node', () => {
    const g = createHeroM();
    expect(g).toBeInstanceOf(THREE.Group);
    for (const name of RIG_NODES) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
  });

  it('stands 1.6-1.9 tall on a feet origin facing +Z', () => {
    const g = createHeroM();
    const box = boxOf(g);
    const size = box.getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(1.6);
    expect(size.y).toBeLessThan(1.9);
    expect(Math.abs(box.min.y)).toBeLessThan(0.05);
    expect(g.getObjectByName('eyeL')!.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(0);
  });

  it('includes all key detail parts', () => {
    const g = createHeroM();
    for (const name of DETAIL_PARTS) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
    // Satchel rides front-right, cloak shell sits behind the torso.
    expect(g.getObjectByName('satchel')!.position.z).toBeGreaterThan(0);
    expect(g.getObjectByName('cloak')!.position.z).toBeLessThan(0);
  });

  it('runs 60 idle + 60 walk frames without throwing', () => {
    const g = createHeroM();
    for (let i = 0; i < 60; i++) {
      updateHeroM(g, i / 60, 1 / 60);
    }
    g.userData.phase = 0;
    for (let i = 0; i < 60; i++) {
      updateHeroM(g, i / 60, 1 / 60);
    }
    expect(g.userData.phase).toBeGreaterThan(0);
  });

  it('never throws on an empty group', () => {
    const empty = new THREE.Group();
    for (let i = 0; i < 60; i++) {
      updateHeroM(empty, i / 60, 1 / 60);
    }
    empty.userData.phase = 0;
    for (let i = 0; i < 60; i++) {
      updateHeroM(empty, i / 60, 1 / 60);
    }
  });
});
