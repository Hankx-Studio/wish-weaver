import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createPlaza, updatePlaza } from '../../src/features/world/world/props/plaza';
import {
  createShopCenter,
  updateShopCenter,
} from '../../src/features/world/world/props/shop-center';

const stubToon = (color: number): THREE.MeshToonMaterial =>
  new THREE.MeshToonMaterial({ color });

function dims(g: THREE.Group): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(g);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
}

describe('createPlaza', () => {
  it('builds a non-empty group', () => {
    const plaza = createPlaza(stubToon);
    expect(plaza).toBeInstanceOf(THREE.Group);
    expect(plaza.children.length).toBeGreaterThan(0);
  });

  it('exposes key named parts', () => {
    const plaza = createPlaza(stubToon);
    for (const name of [
      'fountain',
      'water',
      'water1',
      'water2',
      'emit',
      'bench0',
      'bench1',
      'bench2',
      'bench3',
      'lamp0',
      'lamp1',
      'lamp2',
      'lamp3',
      'stringLights',
      'bulbs',
      'flowers',
    ]) {
      expect(plaza.getObjectByName(name), name).toBeDefined();
    }
    // Emitter sits at the fountain crown; water sits in the basin.
    expect(plaza.getObjectByName('emit')!.position.y).toBeGreaterThan(2.5);
    expect(plaza.getObjectByName('water')!.position.y).toBeLessThan(1);
  });

  it('has plaza-scale bounding-box dims', () => {
    const s = dims(createPlaza(stubToon));
    expect(s.x).toBeGreaterThan(10);
    expect(s.x).toBeLessThan(20);
    expect(s.z).toBeGreaterThan(10);
    expect(s.z).toBeLessThan(20);
    expect(s.y).toBeGreaterThan(2);
    expect(s.y).toBeLessThan(7);
  });

  it('runs updatePlaza for 60 frames without throwing', () => {
    const plaza = createPlaza(stubToon);
    expect(() => {
      for (let i = 0; i < 60; i++) updatePlaza(plaza, i / 60, 1 / 60);
    }).not.toThrow();
    const water = plaza.getObjectByName('water') as THREE.Mesh;
    const mat = water.material as THREE.MeshToonMaterial;
    expect(mat.opacity).toBeGreaterThanOrEqual(0.7);
    expect(mat.opacity).toBeLessThanOrEqual(1);
  });

  it('updatePlaza never throws on an empty group', () => {
    expect(() => {
      for (let i = 0; i < 60; i++) updatePlaza(new THREE.Group(), i / 60, 1 / 60);
    }).not.toThrow();
  });
});

describe('createShopCenter', () => {
  it('builds a non-empty group facing +Z', () => {
    const shop = createShopCenter(stubToon);
    expect(shop).toBeInstanceOf(THREE.Group);
    expect(shop.children.length).toBeGreaterThan(0);
    // Front features (door, awning, stall) sit at +Z.
    expect(shop.getObjectByName('door')!.position.z).toBeGreaterThan(0);
    expect(shop.getObjectByName('awning')!.position.z).toBeGreaterThan(0);
    expect(shop.getObjectByName('stall')!.position.z).toBeGreaterThan(0);
  });

  it('exposes key named parts', () => {
    const shop = createShopCenter(stubToon);
    for (const name of [
      'awning',
      'sign',
      'signBoard',
      'windowGlow',
      'windowSide',
      'stall',
      'crate0',
      'crate1',
      'crate2',
      'roof',
      'chimney',
      'door',
      'lantern0',
      'lantern1',
    ]) {
      expect(shop.getObjectByName(name), name).toBeDefined();
    }
    // Awning has 8 alternating stripes.
    const awning = shop.getObjectByName('awning')!;
    expect(awning.children.filter((c) => c.name.startsWith('stripe'))).toHaveLength(8);
  });

  it('has shop-scale bounding-box dims', () => {
    const s = dims(createShopCenter(stubToon));
    expect(s.x).toBeGreaterThan(3);
    expect(s.x).toBeLessThan(9);
    expect(s.y).toBeGreaterThan(3);
    expect(s.y).toBeLessThan(8);
    expect(s.z).toBeGreaterThan(2);
    expect(s.z).toBeLessThan(8);
  });

  it('runs updateShopCenter for 60 frames without throwing', () => {
    const shop = createShopCenter(stubToon);
    expect(() => {
      for (let i = 0; i < 60; i++) updateShopCenter(shop, i / 60, 1 / 60);
    }).not.toThrow();
    const glow = shop.getObjectByName('windowGlow') as THREE.Mesh;
    const mat = glow.material as THREE.MeshBasicMaterial;
    expect(mat.opacity).toBeGreaterThanOrEqual(0.7);
    expect(mat.opacity).toBeLessThanOrEqual(1);
  });

  it('updateShopCenter never throws on an empty group', () => {
    expect(() => {
      for (let i = 0; i < 60; i++) updateShopCenter(new THREE.Group(), i / 60, 1 / 60);
    }).not.toThrow();
  });
});
