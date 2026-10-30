import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createSpirit, updateSpirit } from '../../src/features/world/world/actors/spirit';

const NAMED_PARTS = [
  'inner',
  'body',
  'shell',
  'halo',
  'eyeL',
  'eyeR',
  'blushL',
  'blushR',
  'armL',
  'armR',
  'glintL',
  'glintR',
  'tail',
  'sparkles',
];

describe('createSpirit', () => {
  it('builds a group facing +Z', () => {
    const g = createSpirit();
    expect(g).toBeInstanceOf(THREE.Group);
    expect(g.children.length).toBeGreaterThan(0);
    // Face parts sit on the +Z side.
    for (const name of ['eyeL', 'eyeR', 'blushL', 'blushR']) {
      const part = g.getObjectByName(name)!;
      expect(part.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(0);
    }
  });

  it('exposes every key named part', () => {
    const g = createSpirit();
    for (const name of NAMED_PARTS) {
      expect(g.getObjectByName(name), `missing ${name}`).toBeDefined();
    }
  });

  it('has bounding-box dims within the expected companion range', () => {
    const g = createSpirit();
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    const size = box.getSize(new THREE.Vector3());
    // Chubby droplet ~0.7 wide; sparkle ring stays inside ~1.2.
    expect(size.x).toBeGreaterThan(0.6);
    expect(size.x).toBeLessThan(1.4);
    // Droplet body ~1.1 tall (halo shell extends it).
    expect(size.y).toBeGreaterThan(1.0);
    expect(size.y).toBeLessThan(1.8);
    expect(size.z).toBeGreaterThan(0.5);
    expect(size.z).toBeLessThan(1.4);
  });
});

describe('updateSpirit', () => {
  it('runs 60 frames without throwing', () => {
    const g = createSpirit();
    const dt = 1 / 60;
    let t = 0;
    expect(() => {
      for (let i = 0; i < 60; i++) {
        t += dt;
        updateSpirit(g, t, dt);
      }
    }).not.toThrow();
  });

  it('never throws on an empty group', () => {
    expect(() => updateSpirit(new THREE.Group(), 1.23, 1 / 60)).not.toThrow();
  });

  it('bobs, blinks, and tilts toward userData.velocity', () => {
    const g = createSpirit();
    const inner = g.getObjectByName('inner')!;
    const eyeL = g.getObjectByName('eyeL')!;

    updateSpirit(g, 0, 0.016);
    const y0 = inner.position.y;
    updateSpirit(g, 0.7, 0.016);
    expect(inner.position.y).not.toBeCloseTo(y0, 5);

    // Mid-blink (phase ~0.07 of the 3.2s cycle) squeezes the eye arc.
    updateSpirit(g, 3.27, 0.016);
    expect(eyeL.scale.y).toBeLessThan(0.6);
    updateSpirit(g, 1.0, 0.016);
    expect(eyeL.scale.y).toBeCloseTo(1, 5);

    // Sustained +X velocity leans the body sideways (negative roll).
    g.userData.velocity.set(2, 0, 0);
    for (let i = 0; i < 30; i++) updateSpirit(g, 2 + i * 0.016, 0.016);
    expect(inner.rotation.z).toBeLessThan(-0.1);
  });
});
