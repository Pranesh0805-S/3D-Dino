import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CFG } from './config';
import { CACTUS_BIG, CACTUS_SMALL, PTERA_DOWN, PTERA_UP } from './sprites';
import { bitmapGeometry, outlined } from './voxel';
import type { Theme } from './theme';
import type { Box } from './player';

export interface Obstacle {
  group: THREE.Group;
  kind: 'cactus' | 'ptera' | 'tunnel';
  hx: number; hz: number; y0: number; y1: number;
  vExtra: number;
  wings?: [THREE.Group, THREE.Group];
  t: number;
  row: number; // obstacles spawned together share a row id
  tag?: string; // callout shown when it comes into view
  // bookkeeping for the rule engine
  tagged?: boolean; seen?: boolean; done?: boolean; threat?: boolean;
  dispose?: () => void;
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

  constructor(private parent: THREE.Group, private th: Theme) {
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

  hxOf(big: boolean) { return (big ? this.dims.big : this.dims.small).w * 0.4; }

  addCactus(x: number, z: number, big: boolean, row = 0) {
    const d = big ? this.dims.big : this.dims.small;
    const g = (big ? this.big : this.small).clone();
    g.position.set(x, 0, z);
    this.parent.add(g);
    this.list.push({ group: g, kind: 'cactus', hx: d.w * 0.4, hz: 0.28, y0: 0, y1: d.h * 0.95, vExtra: 0, t: 0, row });
  }

  addPtera(x: number, z: number, bottom: number, row = 0) {
    const g = new THREE.Group();
    const up = this.pteraUp.clone();
    const down = this.pteraDown.clone();
    g.add(up, down);
    down.visible = false;
    g.position.set(x, bottom, z);
    this.parent.add(g);
    this.list.push({
      group: g, kind: 'ptera', hx: 0.55, hz: 0.85, y0: bottom, y1: bottom + 0.95,
      vExtra: CFG.pteraExtraSpeed, wings: [up, down], t: Math.random(), row,
    });
  }

  /** unbroken line of cacti across the whole track: the only way past is over */
  addWall(z: number, row: number, tag?: string) {
    let x = -5.6;
    let prev = 0;
    for (let i = 0; ; i++) {
      const big = Math.random() < 0.3;
      const hx = this.hxOf(big);
      if (i > 0) x += prev + hx + 0.4; // 0.4 < dino width (0.64): no squeezing through
      if (x > 5.8) break;
      this.addCactus(x, z, big, row);
      if (i === 0) this.list[this.list.length - 1].tag = tag;
      prev = hx;
    }
  }

  /** unbroken line of pterodactyls: low (bottom 0.15) to jump over, or at head height (1.15) to duck under */
  addBirdWall(z: number, bottom: number, row: number, tag?: string) {
    for (let i = 0, x = -5.4; x <= 5.6; i++, x += 1.5) {
      this.addPtera(x, z, bottom, row);
      if (i === 0) this.list[this.list.length - 1].tag = tag;
    }
  }

  /** long low ceiling: stay ducked from one end to the other */
  addTunnel(zc: number, len: number, tag?: string) {
    const W = CFG.groundW + 0.6;
    const y = CFG.tunnelY;
    const group = new THREE.Group();
    const geos: THREE.BufferGeometry[] = [];

    const deck = new THREE.BoxGeometry(W, 0.16, len);
    deck.translate(0, y + 0.08, 0);
    geos.push(deck);
    group.add(new THREE.Mesh(deck, this.th.deck));
    const deckEdges = new THREE.EdgesGeometry(deck);
    geos.push(deckEdges);
    group.add(new THREE.LineSegments(deckEdges, this.th.outline));

    // thin see-through cross beams so the dino stays visible underneath
    const beams: THREE.BufferGeometry[] = [];
    const posts: THREE.BufferGeometry[] = [];
    for (let z = -len / 2; z <= len / 2 + 0.01; z += 6) {
      const b = new THREE.BoxGeometry(W, 0.12, 0.22);
      b.translate(0, y + 0.22, z);
      beams.push(b);
    }
    for (let z = -len / 2; z <= len / 2 + 0.01; z += 16) {
      for (const sx of [-1, 1]) {
        const p = new THREE.BoxGeometry(0.5, y + 0.3, 0.5);
        p.translate(sx * (W / 2), (y + 0.3) / 2, z);
        posts.push(p);
      }
    }
    const beamGeo = mergeGeometries(beams)!;
    const postGeo = mergeGeometries(posts)!;
    beams.forEach((g) => g.dispose());
    posts.forEach((g) => g.dispose());
    geos.push(beamGeo, postGeo);
    group.add(new THREE.Mesh(beamGeo, this.th.beam));
    group.add(new THREE.Mesh(postGeo, this.th.fill));
    const postEdges = new THREE.EdgesGeometry(postGeo, 20);
    geos.push(postEdges);
    group.add(new THREE.LineSegments(postEdges, this.th.outline));

    group.position.set(0, 0, zc);
    this.parent.add(group);
    this.list.push({
      group, kind: 'tunnel', hx: 8, hz: len / 2, y0: y, y1: y + 3, vExtra: 0, t: 0, row: 0, tag,
      dispose: () => geos.forEach((g) => g.dispose()),
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
      if (o.group.position.z - o.hz > CFG.despawnZ) {
        this.parent.remove(o.group);
        o.dispose?.();
        this.list.splice(i, 1);
      }
    }
  }

  hits(b: Box): boolean {
    for (const o of this.list) {
      const p = o.group.position;
      if (Math.abs(p.z) > o.hz + 3) continue;
      if (
        b.x0 < p.x + o.hx && b.x1 > p.x - o.hx &&
        b.z0 < p.z + o.hz && b.z1 > p.z - o.hz &&
        b.y0 < o.y1 && b.y1 > o.y0
      ) return true;
    }
    return false;
  }

  clear() {
    for (const o of this.list) { this.parent.remove(o.group); o.dispose?.(); }
    this.list.length = 0;
  }
}
