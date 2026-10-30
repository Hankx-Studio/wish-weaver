import * as THREE from 'three';
import type { ToonFactory } from './sky';
import { createTreeOfLife, updateTreeOfLife } from './props/tree-of-life';
import { createPlaza, updatePlaza } from './props/plaza';
import { createShopCenter, updateShopCenter } from './props/shop-center';
import { createShopkeeper, updateShopkeeper } from './actors/npc-shopkeeper';
import { createButler, updateButler } from './actors/npc-butler';
import { createFlowerKid, updateFlowerKid } from './actors/npc-flowerkid';
import { createElder, updateElder } from './actors/npc-elder';
import { createGardener, updateGardener } from './actors/npc-gardener';
import { createHeroF, updateHeroF } from './actors/hero-f';

// World cast: landmark venues + NPCs + a fellow traveler, placed around the
// spawn (0,0,6). NPCs turn their heads toward the player when close.

type Updater = (g: THREE.Group, t: number, dt: number) => void;

interface NpcEntry {
  group: THREE.Group;
  update: Updater;
  seed: number;
}

function place(
  parent: THREE.Group,
  g: THREE.Group,
  x: number,
  z: number,
  yaw: number,
): THREE.Group {
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  parent.add(g);
  return g;
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export interface Cast {
  update(t: number, dt: number, player: THREE.Vector3): void;
}

export function buildCast(scene: THREE.Scene, toon: ToonFactory): Cast {
  const root = new THREE.Group();
  root.name = 'cast';
  scene.add(root);

  // Landmarks: tree ahead of spawn, plaza east, shop west.
  const tree = place(root, createTreeOfLife(toon), 0, -18, 0);
  const plaza = place(root, createPlaza(toon), 12, -2, 0.4);
  const shop = place(root, createShopCenter(toon), -12, 0, Math.PI / 2);

  // NPCs: shopkeeper by her stall, butler + flower kid at the plaza,
  // elder by the tree steps, gardener by the shop garden.
  const npcs: NpcEntry[] = [
    { group: place(root, createShopkeeper(toon), -9.6, 1.2, Math.PI / 2), update: updateShopkeeper, seed: 0 },
    { group: place(root, createButler(toon), 8.6, 1.2, Math.PI * 0.9), update: updateButler, seed: 1 },
    { group: place(root, createFlowerKid(toon), 10.4, -5.2, 0.5), update: updateFlowerKid, seed: 2 },
    { group: place(root, createElder(), 3.0, -13.0, 0), update: updateElder, seed: 3 },
    { group: place(root, createGardener(), -8.5, 4.2, 1.3), update: updateGardener, seed: 4 },
  ];

  // Fellow traveler idling south of the plaza.
  const fellow = place(root, createHeroF(toon), 5.5, 8.5, -2.0);

  return {
    update(t: number, dt: number, player: THREE.Vector3): void {
      updateTreeOfLife(tree, t, dt);
      updatePlaza(plaza, t, dt);
      updateShopCenter(shop, t, dt);
      for (const npc of npcs) {
        const dx = player.x - npc.group.position.x;
        const dz = player.z - npc.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 9) {
          const rel = wrapAngle(Math.atan2(dx, dz) - npc.group.rotation.y);
          npc.group.userData.lookAt = { yaw: rel, pitch: 0 };
        } else {
          npc.group.userData.lookAt = {
            yaw: Math.sin(t * 0.5 + npc.seed * 1.7) * 0.3,
            pitch: 0,
          };
        }
        npc.update(npc.group, t, dt);
      }
      updateHeroF(fellow, t, dt);
    },
  };
}
