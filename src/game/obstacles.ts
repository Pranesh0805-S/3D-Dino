import * as THREE from 'three';
import { CFG } from './config';
import { CACTUS_BIG, CACTUS_SMALL, PTERA_DOWN, PTERA_UP } from './sprites';
import { bitmapGeometry, outlined } from './voxel';
import type { Theme } from './theme';
import type { Box } from './player';

export interface Obstacle {
  group: THREE.Group;
  kind: 'cactus' | 'ptera';
  hx: number; hz: number; y0: number; y1: number;
  vExtra: number;
  wings?: [THREE.Group, THREE.Group];
  t: number;
}

export class Obstacles {
  readonly list: Obstacle[] = [];
  private small: THREE.Group;
  private big: THREE.Group;
  private pteraUp: THREE.Group;
  private pteraDown: THREE.Group;
  private dims = {
    small: { w: CACTUS_SMALL[0].length * CFG.VOX_OBJ, h: CACTUS_SMALL.length * CFG.VOX_OBJ },
    big: { w: CACTUS_BIG[0].length * CFG.VOX_OBJ, h: CACTUS_BIG.length * CFG.VOX_OBJ },
  };

  constructor(private parent: THREE.Group, th: Theme) {
    const s = CFG.VOX_OBJ;
    const cactus = (rows: string[]) => outlined(bitmapGeometry(rows, { size: s, depthOf: () => 5 }), th.fill, th.outline);
    this.small = cactus(CACTUS_SMALL);
    this.big = cactus(CACTUS_BIG);
    const ptera = (rows: string[]) => {
      const g = outlined(
        bitmapGeometry(rows, { size: s, depthOf: (c) => (c === 'w' ? 11 : 5), pivotCol: 11 }),
        th.fill,
        th.outline,
      );
      g.add(
        new THREE.Mesh(
          bitmapGeometry(rows, { size: s, depthOf: () => 7, include: (c) => c === 'e', pivotCol: 11 }),
          th.eye,
        ),
      );
      g.rotation.y = -Math.PI / 2; // face the camera (+z)
      return g;
    };
    this.pteraUp = ptera(PTERA_UP);
    this.pteraDown = ptera(PTERA_DOWN);
  }

  addCactus(x: number, z: number, big: boolean) {
    const d = big ? this.dims.big : this.dims.small;
    const g = (big ? this.big : this.small).clone();
    g.position.set(x, 0, z);
    this.parent.add(g);
    this.list.push({ group: g, kind: 'cactus', hx: d.w * 0.4, hz: 0.28, y0: 0, y1: d.h * 0.95, vExtra: 0, t: 0 });
  }

  addPtera(x: number, z: number, bottom: number) {
    const g = new THREE.Group();
    const up = this.pteraUp.clone();
    const down = this.pteraDown.clone();
    g.add(up, down);
    down.visible = false;
    g.position.set(x, bottom, z);
    this.parent.add(g);
    this.list.push({
      group: g, kind: 'ptera', hx: 0.55, hz: 0.85, y0: bottom, y1: bottom + 0.95,
      vExtra: CFG.pteraExtraSpeed, wings: [up, down], t: Math.random(),
    });
  }

  update(dt: number, dz: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const o = this.list[i];
      o.group.position.z += dz + o.vExtra * dt;
      if (o.wings) {
        o.t += dt;
        const f = Math.floor(o.t / 0.16) % 2;
        o.wings[0].visible = f === 0;
        o.wings[1].visible = f === 1;
      }
      if (o.group.position.z > CFG.despawnZ) {
        this.parent.remove(o.group);
        this.list.splice(i, 1);
      }
    }
  }

  hits(b: Box): boolean {
    for (const o of this.list) {
      const p = o.group.position;
      if (Math.abs(p.z) > 3) continue;
      if (
        b.x0 < p.x + o.hx && b.x1 > p.x - o.hx &&
        b.z0 < p.z + o.hz && b.z1 > p.z - o.hz &&
        b.y0 < o.y1 && b.y1 > o.y0
      ) return true;
    }
    return false;
  }

  clear() {
    for (const o of this.list) this.parent.remove(o.group);
    this.list.length = 0;
  }
}
