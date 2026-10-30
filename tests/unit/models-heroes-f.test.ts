import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createHeroF, updateHeroF } from '../../src/features/world/world/actors/hero-f';

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

const DETAIL_PARTS = ['hood', 'flowerPin', 'dress', 'satchel', 'scarfFringe', 'bootL', 'bootR'];

describe('createHeroF (fidelity upgrade)', () => {
  it('builds all 11 rig nodes', () => {
    const g = createHeroF();
    expect(g).toBeInstanceOf(THREE.Group);
    for (const name of RIG_NODES) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
    // Eyes stay Meshes so scene.ts buildHeroRig can cast them.
    expect(g.getObjectByName('eyeL')).toBeInstanceOf(THREE.Mesh);
    expect(g.getObjectByName('eyeR')).toBeInstanceOf(THREE.Mesh);
  });

  it('stands 1.5-1.8 tall on a feet origin facing +Z', () => {
    const g = createHeroF();
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    const size = box.getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(1.5);
    expect(size.y).toBeLessThan(1.8);
    expect(Math.abs(box.min.y)).toBeLessThan(0.05);
    expect(g.getObjectByName('eyeL')!.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(0);
  });

  it('includes key detail parts', () => {
    const g = createHeroF();
    for (const name of DETAIL_PARTS) {
      expect(g.getObjectByName(name), name).toBeDefined();
    }
    // Dress is lathe-turned with a hem; fringe has multiple strands.
    const dress = g.getObjectByName('dress') as THREE.Mesh;
    expect(dress.geometry.type).toBe('LatheGeometry');
    expect(g.getObjectByName('scarfFringe')!.children.length).toBeGreaterThanOrEqual(3);
    expect(g.getObjectByName('satchel')!.position.z).toBeGreaterThan(0);
  });

  it('runs 60 idle + 60 walk frames without throwing', () => {
    const g = createHeroF();
    for (let i = 0; i < 60; i++) {
      updateHeroF(g, i / 60, 1 / 60);
    }
    g.userData.phase = 0;
    for (let i = 0; i < 60; i++) {
      updateHeroF(g, i / 60, 1 / 60);
    }
    expect(g.userData.phase).toBeGreaterThan(0);
  });

  it('never throws on an empty group', () => {
    const empty = new THREE.Group();
    for (let i = 0; i < 60; i++) {
      updateHeroF(empty, i / 60, 1 / 60);
    }
    empty.userData.phase = 0;
    for (let i = 0; i < 60; i++) {
      updateHeroF(empty, i / 60, 1 / 60);
    }
  });
});
