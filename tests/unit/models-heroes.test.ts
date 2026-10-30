import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createHeroF, updateHeroF } from '../../src/features/world/world/actors/hero-f';
import { createHeroM, updateHeroM } from '../../src/features/world/world/actors/hero-m';

const RIG_NODES = [
  'hips',
  'torso',
  'head',
  'armL',
  'armR',
  'legL',
  'legR',
  'scarf0',
  'scarf1',
  'scarf2',
];

function sizeOf(g: THREE.Group): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(g);
  return box.getSize(new THREE.Vector3());
}

function minOf(g: THREE.Group): THREE.Vector3 {
  return new THREE.Box3().setFromObject(g).min;
}

describe('createHeroM', () => {
  it('builds a group with the full articulated rig', () => {
    const g = createHeroM();
    expect(g).toBeInstanceOf(THREE.Group);
    for (const name of RIG_NODES) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
  });

  it('includes hood, cloak, scarf, satchel, and boots', () => {
    const g = createHeroM();
    for (const name of ['hood', 'cloak', 'scarfWrap', 'satchel', 'bootL', 'bootR']) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
    // Satchel rides front-right, cloak shell sits behind the torso.
    expect(g.getObjectByName('satchel')!.position.z).toBeGreaterThan(0);
    expect(g.getObjectByName('cloak')!.position.z).toBeLessThan(0);
  });

  it('chains scarf segments downward from the torso', () => {
    const g = createHeroM();
    const s0 = g.getObjectByName('scarf0')!;
    const s1 = g.getObjectByName('scarf1')!;
    const s2 = g.getObjectByName('scarf2')!;
    expect(s0.parent).toBe(g.getObjectByName('torso'));
    expect(s1.parent).toBe(s0);
    expect(s2.parent).toBe(s1);
  });

  it('stands ~1.6-1.8 tall on a feet origin facing +Z', () => {
    const g = createHeroM();
    const size = sizeOf(g);
    expect(size.y).toBeGreaterThan(1.5);
    expect(size.y).toBeLessThan(2.0);
    expect(size.x).toBeGreaterThan(0.6);
    expect(size.x).toBeLessThan(1.4);
    expect(size.z).toBeGreaterThan(0.4);
    expect(size.z).toBeLessThan(1.2);
    expect(Math.abs(minOf(g).y)).toBeLessThan(0.05);
    expect(g.getObjectByName('eyeL')!.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(0);
  });

  it('runs 60 idle frames without throwing', () => {
    const g = createHeroM();
    for (let i = 0; i < 60; i++) {
      updateHeroM(g, i / 60, 1 / 60);
    }
  });

  it('walks when userData.phase is set and never throws on an empty group', () => {
    const g = createHeroM();
    g.userData.phase = 0;
    for (let i = 0; i < 60; i++) {
      updateHeroM(g, i / 60, 1 / 60);
    }
    expect(g.userData.phase).toBeGreaterThan(0);
    const legL = g.getObjectByName('legL')!;
    const legR = g.getObjectByName('legR')!;
    expect(Math.abs(legL.rotation.x + legR.rotation.x)).toBeLessThan(0.01);

    const empty = new THREE.Group();
    for (let i = 0; i < 60; i++) {
      updateHeroM(empty, i / 60, 1 / 60);
    }
  });
});

describe('createHeroF', () => {
  it('builds a group with the full articulated rig', () => {
    const g = createHeroF();
    expect(g).toBeInstanceOf(THREE.Group);
    for (const name of RIG_NODES) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
  });

  it('includes hood, flower pin, dress, satchel, and boots', () => {
    const g = createHeroF();
    for (const name of ['hood', 'flowerPin', 'dress', 'satchel', 'bootL', 'bootR', 'ponytail']) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
    expect(g.getObjectByName('satchel')!.position.z).toBeGreaterThan(0);
    expect(g.getObjectByName('cloak')!.position.z).toBeLessThan(0);
  });

  it('chains scarf segments downward from the torso', () => {
    const g = createHeroF();
    const s0 = g.getObjectByName('scarf0')!;
    const s1 = g.getObjectByName('scarf1')!;
    const s2 = g.getObjectByName('scarf2')!;
    expect(s0.parent).toBe(g.getObjectByName('torso'));
    expect(s1.parent).toBe(s0);
    expect(s2.parent).toBe(s1);
  });

  it('stands ~1.6 tall on a feet origin facing +Z', () => {
    const g = createHeroF();
    const size = sizeOf(g);
    expect(size.y).toBeGreaterThan(1.4);
    expect(size.y).toBeLessThan(1.9);
    expect(size.x).toBeGreaterThan(0.6);
    expect(size.x).toBeLessThan(1.4);
    expect(size.z).toBeGreaterThan(0.4);
    expect(size.z).toBeLessThan(1.2);
    expect(Math.abs(minOf(g).y)).toBeLessThan(0.05);
    expect(g.getObjectByName('eyeL')!.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(0);
  });

  it('runs 60 idle frames without throwing', () => {
    const g = createHeroF();
    for (let i = 0; i < 60; i++) {
      updateHeroF(g, i / 60, 1 / 60);
    }
  });

  it('walks when userData.phase is set and never throws on an empty group', () => {
    const g = createHeroF();
    g.userData.phase = 0;
    for (let i = 0; i < 60; i++) {
      updateHeroF(g, i / 60, 1 / 60);
    }
    expect(g.userData.phase).toBeGreaterThan(0);
    const legL = g.getObjectByName('legL')!;
    const legR = g.getObjectByName('legR')!;
    expect(Math.abs(legL.rotation.x + legR.rotation.x)).toBeLessThan(0.01);

    const empty = new THREE.Group();
    for (let i = 0; i < 60; i++) {
      updateHeroF(empty, i / 60, 1 / 60);
    }
  });
});
