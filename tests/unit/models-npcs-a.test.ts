import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  createShopkeeper,
  updateShopkeeper,
} from '../../src/features/world/world/actors/npc-shopkeeper';
import {
  createButler,
  updateButler,
} from '../../src/features/world/world/actors/npc-butler';
import {
  createFlowerKid,
  updateFlowerKid,
} from '../../src/features/world/world/actors/npc-flowerkid';

const stubToon = (color: number): THREE.MeshToonMaterial =>
  new THREE.MeshToonMaterial({ color });

function bbox(g: THREE.Group): THREE.Vector3 {
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g);
  return box.getSize(new THREE.Vector3());
}

function expectFacesPositiveZ(g: THREE.Group): void {
  const nose = g.getObjectByName('nose')!;
  const v = new THREE.Vector3();
  nose.getWorldPosition(v);
  expect(v.z).toBeGreaterThan(0);
}

describe('createShopkeeper', () => {
  const parts = ['body', 'head', 'face', 'cap', 'apron', 'basket', 'bread'];

  it('builds a group with feet origin and key named parts', () => {
    const g = createShopkeeper(stubToon);
    expect(g).toBeInstanceOf(THREE.Group);
    expect(g.position.y).toBe(0);
    for (const name of parts) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
  });

  it('builds without an explicit toon factory', () => {
    const g = createShopkeeper();
    expect(g.getObjectByName('cap')).toBeDefined();
  });

  it('has plump adult proportions and faces +Z', () => {
    const size = bbox(createShopkeeper(stubToon));
    expect(size.y).toBeGreaterThan(1.4);
    expect(size.y).toBeLessThan(1.9);
    expect(size.x).toBeLessThan(1.6);
    expectFacesPositiveZ(createShopkeeper(stubToon));
  });

  it('runs 60 idle frames without throwing and honors lookAt', () => {
    const g = createShopkeeper(stubToon);
    g.userData.lookAt = { yaw: 0.5, pitch: -0.2 };
    for (let i = 0; i < 60; i++) {
      expect(() => updateShopkeeper(g, i / 60, 1 / 60)).not.toThrow();
    }
    const head = g.getObjectByName('head')!;
    expect(Math.abs(head.rotation.y - 0.5)).toBeLessThanOrEqual(0.12);
    expect(() => updateShopkeeper(new THREE.Group(), 1, 1 / 60)).not.toThrow();
  });
});

describe('createButler', () => {
  const parts = [
    'body',
    'head',
    'face',
    'glasses',
    'vest',
    'bowtie',
    'lantern',
    'lamp',
  ];

  it('builds a group with feet origin and key named parts', () => {
    const g = createButler(stubToon);
    expect(g).toBeInstanceOf(THREE.Group);
    expect(g.position.y).toBe(0);
    for (const name of parts) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
  });

  it('builds without an explicit toon factory', () => {
    const g = createButler();
    expect(g.getObjectByName('lamp')).toBeDefined();
  });

  it('has tall adult proportions, faces +Z, and carries a warm light', () => {
    const g = createButler(stubToon);
    const size = bbox(g);
    expect(size.y).toBeGreaterThan(1.6);
    expect(size.y).toBeLessThan(2.0);
    expect(size.x).toBeLessThan(1.4);
    expectFacesPositiveZ(g);
    const lamp = g.getObjectByName('lamp') as THREE.PointLight;
    expect(lamp.isPointLight).toBe(true);
    expect(lamp.color.getHex()).toBe(0xffbe78);
  });

  it('runs 60 idle frames without throwing and honors lookAt', () => {
    const g = createButler(stubToon);
    g.userData.lookAt = { yaw: -0.4, pitch: 0.15 };
    for (let i = 0; i < 60; i++) {
      expect(() => updateButler(g, i / 60, 1 / 60)).not.toThrow();
    }
    const head = g.getObjectByName('head')!;
    expect(Math.abs(head.rotation.y - -0.4)).toBeLessThanOrEqual(0.12);
    expect(() => updateButler(new THREE.Group(), 1, 1 / 60)).not.toThrow();
  });
});

describe('createFlowerKid', () => {
  const parts = ['body', 'head', 'face', 'hat', 'flowers', 'wateringCan', 'bib'];

  it('builds a group with feet origin and key named parts', () => {
    const g = createFlowerKid(stubToon);
    expect(g).toBeInstanceOf(THREE.Group);
    expect(g.position.y).toBe(0);
    for (const name of parts) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
  });

  it('builds without an explicit toon factory', () => {
    const g = createFlowerKid();
    expect(g.getObjectByName('hat')).toBeDefined();
  });

  it('has small child proportions and faces +Z', () => {
    const g = createFlowerKid(stubToon);
    const size = bbox(g);
    expect(size.y).toBeGreaterThan(0.85);
    expect(size.y).toBeLessThan(1.15);
    expectFacesPositiveZ(g);
  });

  it('runs 60 idle frames without throwing and honors lookAt', () => {
    const g = createFlowerKid(stubToon);
    g.userData.lookAt = { yaw: 0.3, pitch: 0.1 };
    for (let i = 0; i < 60; i++) {
      expect(() => updateFlowerKid(g, i / 60, 1 / 60)).not.toThrow();
    }
    const head = g.getObjectByName('head')!;
    expect(Math.abs(head.rotation.y - 0.3)).toBeLessThanOrEqual(0.12);
    expect(() => updateFlowerKid(new THREE.Group(), 1, 1 / 60)).not.toThrow();
  });
});
