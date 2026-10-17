import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AIR_TIME, CFG } from './config';
import { Obstacles } from './obstacles';
import type { Theme } from './theme';
import type { Box } from './player';

interface Slab { group: THREE.Group; front: number; back: number; geos: THREE.BufferGeometry[] }

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export class World {
  readonly group = new THREE.Group();
  readonly obstacles: Obstacles;
  private slabs: Slab[] = [];
  private edge = 0; // z of the far end of generated terrain

  constructor(private th: Theme) {
    this.obstacles = new Obstacles(this.group, th);
  }

  reset() {
    for (const s of this.slabs) this.removeSlab(s);
    this.slabs.length = 0;
    this.obstacles.clear();
    // long safe runway to start on
    this.addSlab(16, -60);
    this.edge = -60;
    this.generate(CFG.speed0, 0);
  }

  update(dt: number, speed: number, score: number) {
    const dz = speed * dt;
    for (let i = this.slabs.length - 1; i >= 0; i--) {
      const s = this.slabs[i];
      s.front += dz; s.back += dz;
      s.group.position.z += dz;
      if (s.back > CFG.despawnZ + 4) { this.removeSlab(s); this.slabs.splice(i, 1); }
    }
    this.edge += dz;
    this.obstacles.update(dt, dz);
    this.generate(speed, score);
  }

  /** is there solid floor at world z (dino sits at z≈0)? */
  supported(): boolean {
    const at = (z: number) => this.slabs.some((s) => s.front >= z && s.back <= z);
    return at(-0.45) || at(0.45);
  }

  collides(b: Box) { return this.obstacles.hits(b); }

  // ---------- generation ----------
  private generate(speed: number, score: number) {
    const jump = speed * AIR_TIME;
    while (this.edge > -CFG.spawnDist) {
      const gap = Math.max(3.2, jump * rand(0.3, 0.5));
      const front = this.edge - gap;
      const back = front - rand(32, 58) - jump * 0.5;
      this.addSlab(front, back);
      this.populate(front, back, jump, score);
      this.edge = back;
    }
  }

  private populate(front: number, back: number, jump: number, score: number) {
    // keep room to land after a gap jump and to take off for the next one
    let z = front - Math.max(9, jump * 0.75 + 3);
    const end = back + jump * 0.85 + 5;
    const ptera = score >= CFG.pteraMinScore;
    while (z > end) {
      const r = Math.random();
      if (ptera && r > 0.8) {
        // birds fly faster than the ground scrolls, so spawn them further out to arrive on schedule
        const speed = jump / AIR_TIME;
        this.obstacles.addPtera(rand(-4, 4), z * (1 + CFG.pteraExtraSpeed / speed), pick([0.15, 1.15, 1.15, 2.35]));
      } else if (r > 0.6) {
        // wall of small cacti with a 1–2 wide opening
        const gapAt = Math.floor(rand(0, 7));
        for (let i = 0; i < 7; i++) {
          if (i === gapAt || (Math.random() < 0.4 && i === gapAt + 1)) continue;
          this.obstacles.addCactus(-4.8 + i * 1.6, z, false);
        }
      } else if (r > 0.4) {
        const n = Math.random() < 0.5 ? 2 : 3;
        const x = rand(-4.2, 4.2);
        for (let i = 0; i < n; i++) this.obstacles.addCactus(x, z - i * 1.3, n === 2 && Math.random() < 0.5);
        z -= (n - 1) * 1.3;
      } else {
        this.obstacles.addCactus(rand(-4.2, 4.2), z, Math.random() < 0.45);
      }
      z -= jump * rand(0.85, 1.5) + 5;
    }
  }

  private addSlab(front: number, back: number) {
    const L = front - back;
    const W = CFG.groundW;
    const group = new THREE.Group();
    const geos: THREE.BufferGeometry[] = [];

    const body = new THREE.BoxGeometry(W, 3, L);
    geos.push(body);
    const m = new THREE.Mesh(body, this.th.ground);
    m.position.y = -1.5;
    group.add(m);

    // the classic horizon line, running along both edges of the track
    const edgeGeo = new THREE.BoxGeometry(0.22, 0.12, L);
    geos.push(edgeGeo);
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(edgeGeo, this.th.line);
      e.position.set(sx * (W / 2 - 0.11), 0.06, 0);
      group.add(e);
    }
    // front lip (the visible end of a platform before a gap)
    const lipGeo = new THREE.BoxGeometry(W, 0.12, 0.2);
    geos.push(lipGeo);
    const lip = new THREE.Mesh(lipGeo, this.th.line);
    lip.position.set(0, 0.06, -L / 2 + 0.1);
    group.add(lip);
    const lip2 = new THREE.Mesh(lipGeo, this.th.line);
    lip2.position.set(0, 0.06, L / 2 - 0.1);
    group.add(lip2);

    // ground speckles (the little dashes under the line in the original)
    const specks: THREE.BufferGeometry[] = [];
    const n = Math.floor(L * 1.6);
    for (let i = 0; i < n; i++) {
      const g = new THREE.BoxGeometry(rand(0.12, 0.7), 0.02, 0.1);
      g.translate(rand(-W / 2 + 0.6, W / 2 - 0.6), 0.011, rand(-L / 2 + 0.3, L / 2 - 0.3));
      specks.push(g);
    }
    const speckGeo = mergeGeometries(specks)!;
    specks.forEach((g) => g.dispose());
    geos.push(speckGeo);
    group.add(new THREE.Mesh(speckGeo, this.th.speck));

    group.position.z = (front + back) / 2;
    this.group.add(group);
    this.slabs.push({ group, front, back, geos });
  }

  private removeSlab(s: Slab) {
    this.group.remove(s.group);
    s.geos.forEach((g) => g.dispose());
  }
}
