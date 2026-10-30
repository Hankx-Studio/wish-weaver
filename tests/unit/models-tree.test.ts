import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createTreeOfLife, updateTreeOfLife } from '../../src/features/world/world/props/tree-of-life';

const stubToon = (color: number): THREE.MeshToonMaterial =>
  new THREE.MeshToonMaterial({ color });

function boxOf(g: THREE.Group): THREE.Box3 {
  g.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(g);
}

describe('createTreeOfLife', () => {
  it('builds a named group with trunk, door, canopy, lanterns, steps, and runes', () => {
    const tree = createTreeOfLife(stubToon);
    expect(tree).toBeInstanceOf(THREE.Group);
    expect(tree.name).toBe('treeOfLife');
    for (const name of [
      'trunk',
      'trunkSeg0',
      'door',
      'doorPanel',
      'doorWindow',
      'canopy',
      'canopyLayer0',
      'canopyLayer1',
      'canopyLayer2',
      'lanterns',
      'lantern0',
      'lantern7',
      'steps',
      'stepTier0',
      'runes',
      'rune0',
    ]) {
      expect(tree.getObjectByName(name), name).toBeDefined();
    }
  });

  it('builds with the default toon factory too', () => {
    const tree = createTreeOfLife();
    expect(tree.getObjectByName('canopy')).toBeDefined();
    expect(tree.getObjectByName('lantern0')).toBeDefined();
  });

  it('stands ~14 units tall with a wide canopy footprint', () => {
    const tree = createTreeOfLife(stubToon);
    const box = boxOf(tree);
    const size = box.getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(12);
    expect(size.y).toBeLessThan(16);
    expect(size.x).toBeGreaterThan(8);
    expect(size.x).toBeLessThan(14);
    expect(size.z).toBeGreaterThan(8);
    expect(size.z).toBeLessThan(14);
    expect(box.min.y).toBeGreaterThanOrEqual(-0.01);
  });

  it('faces the door toward +Z with a warm emissive window', () => {
    const tree = createTreeOfLife(stubToon);
    const door = tree.getObjectByName('door')!;
    expect(door.position.z).toBeGreaterThan(0);
    const window = tree.getObjectByName('doorWindow') as THREE.Mesh;
    const mat = window.material as THREE.MeshToonMaterial;
    expect(mat.emissiveIntensity).toBeGreaterThan(0);
  });

  it('uses instanced leaf puffs and emissive lantern bodies', () => {
    const tree = createTreeOfLife(stubToon);
    const layer0 = tree.getObjectByName('canopyLayer0Mesh');
    expect(layer0).toBeInstanceOf(THREE.InstancedMesh);
    expect((layer0 as THREE.InstancedMesh).count).toBeGreaterThanOrEqual(6);
    const body = tree.getObjectByName('lantern0')!.getObjectByName('body') as THREE.Mesh;
    const mat = body.material as THREE.MeshToonMaterial;
    expect(mat.emissive.getHex()).toBe(0xff9a3c);
    expect(mat.emissiveIntensity).toBeGreaterThan(0);
  });
});

describe('updateTreeOfLife', () => {
  it('runs 60 frames without throwing and animates the canopy', () => {
    const tree = createTreeOfLife(stubToon);
    const layer = tree.getObjectByName('canopyLayer1')!;
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) {
      expect(() => updateTreeOfLife(tree, i / 60, 1 / 60)).not.toThrow();
      seen.add(Number(layer.rotation.z.toFixed(5)));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('flickers lantern emissiveIntensity over time', () => {
    const tree = createTreeOfLife(stubToon);
    const body = tree.getObjectByName('lantern3')!.getObjectByName('body') as THREE.Mesh;
    const mat = body.material as THREE.MeshToonMaterial;
    const values = new Set<number>();
    for (let i = 0; i < 30; i++) {
      updateTreeOfLife(tree, i / 10, 1 / 60);
      values.add(Number(mat.emissiveIntensity.toFixed(4)));
      expect(mat.emissiveIntensity).toBeGreaterThan(0.5);
      expect(mat.emissiveIntensity).toBeLessThan(2.0);
    }
    expect(values.size).toBeGreaterThan(1);
  });

  it('never throws on an empty group', () => {
    expect(() => updateTreeOfLife(new THREE.Group(), 1.23, 1 / 60)).not.toThrow();
  });
});
