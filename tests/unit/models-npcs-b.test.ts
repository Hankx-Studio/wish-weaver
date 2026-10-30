import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createElder, updateElder } from '../../src/features/world/world/actors/npc-elder';
import {
  createGardener,
  updateGardener,
} from '../../src/features/world/world/actors/npc-gardener';

function dims(g: THREE.Group): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(g);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
}

describe('createElder', () => {
  it('builds a feet-origin group facing +Z', () => {
    const g = createElder();
    expect(g).toBeInstanceOf(THREE.Group);
    const box = new THREE.Box3().setFromObject(g);
    expect(box.min.y).toBeCloseTo(0, 1);
    // Face features sit on the +Z side.
    const w = new THREE.Vector3();
    expect(g.getObjectByName('beard')!.getWorldPosition(w).z).toBeGreaterThan(0);
    expect(g.getObjectByName('glasses')!.getWorldPosition(w).z).toBeGreaterThan(0);
  });

  it('exposes key named parts', () => {
    const g = createElder();
    for (const name of [
      'headPivot',
      'head',
      'hair',
      'bun',
      'beard',
      'glasses',
      'shawl',
      'coat',
      'staff',
      'lantern',
      'armL',
      'armR',
    ]) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
  });

  it('has granny-scale bounding-box dimensions', () => {
    const s = dims(createElder());
    expect(s.y).toBeGreaterThan(1.4);
    expect(s.y).toBeLessThan(2.1);
    expect(s.x).toBeGreaterThan(0.6);
    expect(s.x).toBeLessThan(1.6);
    expect(s.z).toBeGreaterThan(0.4);
    expect(s.z).toBeLessThan(1.4);
  });

  it('runs 60 idle frames without throwing and honors lookAt', () => {
    const g = createElder();
    g.userData.lookAt = { yaw: 0.5, pitch: -0.2 };
    for (let i = 0; i < 60; i++) {
      expect(() => updateElder(g, i / 60, 1 / 60)).not.toThrow();
    }
    const head = g.getObjectByName('headPivot')!;
    expect(head.rotation.y).toBeCloseTo(0.5, 0);
    // Clamps out-of-range lookAt.
    g.userData.lookAt = { yaw: 5, pitch: -5 };
    updateElder(g, 10, 0.016);
    expect(Math.abs(head.rotation.y)).toBeLessThanOrEqual(0.95);
  });

  it('update is safe on an empty group', () => {
    expect(() => updateElder(new THREE.Group(), 1, 0.016)).not.toThrow();
  });
});

describe('createGardener', () => {
  it('builds a feet-origin group facing +Z', () => {
    const g = createGardener();
    expect(g).toBeInstanceOf(THREE.Group);
    const box = new THREE.Box3().setFromObject(g);
    expect(box.min.y).toBeCloseTo(0, 1);
    expect(g.getObjectByName('hat')!.position.z).toBeGreaterThanOrEqual(0);
    expect(g.getObjectByName('shovelBlade')!.position.y).toBeLessThan(0.3);
  });

  it('exposes key named parts', () => {
    const g = createGardener();
    for (const name of [
      'headPivot',
      'head',
      'hat',
      'torso',
      'suspenders',
      'belt',
      'armL',
      'armR',
      'sleeveRollL',
      'sleeveRollR',
      'shovel',
      'crate',
      'flowers',
    ]) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
  });

  it('has gardener-scale bounding-box dimensions', () => {
    const s = dims(createGardener());
    expect(s.y).toBeGreaterThan(1.5);
    expect(s.y).toBeLessThan(2.1);
    expect(s.x).toBeGreaterThan(1.0);
    expect(s.x).toBeLessThan(2.2);
    expect(s.z).toBeGreaterThan(0.4);
    expect(s.z).toBeLessThan(1.4);
  });

  it('runs 60 idle frames without throwing and honors lookAt', () => {
    const g = createGardener();
    g.userData.lookAt = { yaw: -0.4, pitch: 0.15 };
    for (let i = 0; i < 60; i++) {
      expect(() => updateGardener(g, i / 60, 1 / 60)).not.toThrow();
    }
    const head = g.getObjectByName('headPivot')!;
    expect(head.rotation.y).toBeCloseTo(-0.4, 0);
  });

  it('update is safe on an empty group', () => {
    expect(() => updateGardener(new THREE.Group(), 1, 0.016)).not.toThrow();
  });
});
