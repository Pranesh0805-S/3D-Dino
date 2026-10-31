import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AIR_TIME, CFG } from './config';
import { Obstacles } from './obstacles';
import { random } from './rng';
import type { Theme } from './theme';
import type { Box } from './player';
import type { Rules } from './rules';

interface Slab {
  group: THREE.Group; front: number; back: number; geos: THREE.BufferGeometry[];
  sz: number; // z of the next row to place on this slab (rows are placed lazily, close to the player)
  end: number; // no rows beyond this (room to take off for the next gap)
  calm: boolean; // next to a duck zone: plain rows only
}

const LOOKAHEAD = 85; // obstacles appear this far ahead, so the rule engine reacts to what you did a moment ago

const rand = (a: number, b: number) => a + random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(random() * a.length)];

export class World {
  readonly group = new THREE.Group();
  readonly obstacles: Obstacles;
  private slabs: Slab[] = [];
  private edge = 0; // z of the far end of generated terrain
  private rowId = 0;

  constructor(private th: Theme, private rules: Rules) {
    this.obstacles = new Obstacles(this.group, th);
  }

  reset() {
    for (const s of this.slabs) this.removeSlab(s);
    this.slabs.length = 0;
    this.obstacles.clear();
    // long safe runway to start on
    this.rowId = 0;
    this.addSlab(16, -60, 0, 0, false);
    this.edge = -60;
    const v = this.rules.startSpeed();
    this.generate(v, 0);
    this.spawnRows(v, 0);
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
    for (const s of this.slabs) { s.sz += dz; s.end += dz; }
    this.obstacles.update(dt, dz);
    this.generate(speed, score);
    this.spawnRows(speed, score);
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
      const gap = Math.max(3.2, jump * this.rules.gapFactor());
      const front = this.edge - gap;
      const pts = this.rules.planSlab(score);
      if (pts > 0) {
        // duck zone: landing room, the low ceiling, then room to stand up and take off
        const len = pts / CFG.scorePerUnit;
        const runIn = jump * 0.75 + 8;
        const runOut = jump * 0.85 + 9;
        const back = front - runIn - len - runOut;
        const prev = this.slabs[this.slabs.length - 1];
        if (prev) prev.calm = true; // nothing nasty right before it
        this.addSlab(front, back, 0, 0, true);
        this.obstacles.addTunnel(front - runIn - len / 2, len, 'DUCK ZONE - HOLD DOWN!');
        this.edge = back;
        continue;
      }
      const back = front - rand(32, 58) - jump * 0.5;
      // keep room to land after a gap jump and to take off for the next one
      const sz = front - Math.max(9, jump * 0.75 + 3);
      const end = back + jump * 0.85 + 5;
      const calm = this.slabs.length > 0 && this.slabs[this.slabs.length - 1].group.userData.tunnel === true;
      this.addSlab(front, back, sz, end, false, calm);
      this.edge = back;
    }
  }

  /** place rows of obstacles on slabs, but only once they are within LOOKAHEAD of the player */
  private spawnRows(speed: number, score: number) {
    const jump = speed * AIR_TIME;
    for (const s of this.slabs) {
      while (s.sz > s.end && s.sz > -LOOKAHEAD) {
        const z = this.placeRow(s, s.sz, speed, score);
        s.sz = z - this.rules.spacing(jump);
      }
    }
  }

  /** returns the z of the last obstacle placed (rows can be several cacti deep) */
  private placeRow(s: Slab, z: number, speed: number, score: number): number {
    const row = ++this.rowId;
    const { kind, tag } = this.rules.nextRow(score, s.calm);
    // birds fly faster than the ground scrolls, so spawn them further out to arrive on schedule
    const birdZ = z * (1 + CFG.pteraExtraSpeed / speed);

    if (kind === 'wall') { this.obstacles.addWall(z, row, tag); return z; }
    if (kind === 'birds-duck') { this.obstacles.addBirdWall(birdZ, 1.15, row, tag); return z; }
    if (kind === 'birds-jump') { this.obstacles.addBirdWall(birdZ, 0.15, row, tag); return z; }

    const r = random();
    if (score >= this.rules.pteraFrom() && r > this.rules.pteraChance()) {
      this.obstacles.addPtera(rand(-4, 4), birdZ, pick([0.15, 1.15, 1.15, 2.35]), row);
    } else if (r > 0.6) {
      // wall of small cacti with a 1–2 wide opening
      const gapAt = Math.floor(rand(0, 7));
      for (let i = 0; i < 7; i++) {
        if (i === gapAt || (random() < 0.4 && i === gapAt + 1)) continue;
        this.obstacles.addCactus(-4.8 + i * 1.6, z, false, row);
      }
    } else if (r > 0.4) {
      const n = random() < 0.5 ? 2 : 3;
      const x = rand(-4.2, 4.2);
      for (let i = 0; i < n; i++) this.obstacles.addCactus(x, z - i * 1.3, n === 2 && random() < 0.5, row);
      return z - (n - 1) * 1.3;
    } else {
      this.obstacles.addCactus(rand(-4.2, 4.2), z, random() < 0.45, row);
    }
    return z;
  }

  private addSlab(front: number, back: number, sz: number, end: number, tunnel: boolean, calm = false) {
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
    group.userData.tunnel = tunnel;
    this.slabs.push({ group, front, back, geos, sz: tunnel ? back : sz, end: tunnel ? back : end, calm: tunnel || calm });
  }

  private removeSlab(s: Slab) {
    this.group.remove(s.group);
    s.geos.forEach((g) => g.dispose());
  }
}
