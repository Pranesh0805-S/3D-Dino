import { CFG } from './config';
import type { Player } from './player';
import type { Obstacle } from './obstacles';

export type Mode = 'easy' | 'hard';
export type RowKind = 'normal' | 'wall' | 'birds-duck' | 'birds-jump';

/** Every number of the HARD rule set lives here. */
export const HARD = {
  // R2 overdrive: speed climbs with score and tops out at 2000 points
  speedStart: 18,
  speedAt2000: 40,
  speedMax: 46, // after 2000 it keeps creeping up, 1 per 1000 points
  rampScore: 2000,
  // R1 no-dodge: this many sidesteps in a row (without one real jump/duck) => full wall
  evadeLimit: 2,
  // R3 duck zone: no real squat for this many points => a long low ceiling
  duckEvery: 250,
  duckMinScore: 300,
  duckHold: 0.4, // seconds of holding DOWN that count as a real squat
  forceEvery: 1200, // ...and one duck zone at least this often even for squat fans
  tunnelShort: 100, // length of a duck zone in score points
  tunnelLong: 200,
  tunnelLongFrom: 1500,
  // R4 gauntlet: every 1000 points, 3 full walls in a row on a jump rhythm
  gauntletEvery: 1000,
  gauntletRows: 3,
  // R5 breather: normal rows only after any hazard (also keeps hazards from stacking)
  breatherRows: 2,
  // plain tuning
  pteraMinScore: 100,
  pteraShare: 0.25,
  gapMin: 0.4,
  gapMax: 0.6,
  spaceMin: 0.8,
  spaceMax: 1.3,
  spaceAdd: 4.5,
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * The "director". It watches how you play and decides what the world throws at you next.
 * EASY mode = it stays out of the way (classic random spawns).
 */
export class Rules {
  mode: Mode = 'easy';
  /** called with a short message when a rule fires (the game shows it as a callout) */
  onEvent: (msg: string) => void = () => {};

  // counters (handy for tests and for the README)
  stats = { walls: 0, birdWalls: 0, gauntlets: 0, tunnels: 0 };

  // what we learned about the player
  private evasions = 0;
  private lastEvadeRow = -1;
  private evadeKind: 'cactus' | 'ptera' = 'cactus';
  private lastDuckScore = 0;
  private lastTunnelScore = 0;
  private duckT = 0;
  // what we owe the player
  private wallPending = false;
  private gauntletLeft = 0;
  private nextGauntlet = HARD.gauntletEvery;
  private rowsSince = 99; // normal rows since the last hazard
  private lastSlabTunnel = false;
  private speedMark = 0;

  get hard() { return this.mode === 'hard'; }

  reset() {
    this.stats = { walls: 0, birdWalls: 0, gauntlets: 0, tunnels: 0 };
    this.evasions = 0; this.lastEvadeRow = -1; this.evadeKind = 'cactus';
    this.lastDuckScore = 0; this.lastTunnelScore = 0; this.duckT = 0;
    this.wallPending = false; this.gauntletLeft = 0; this.nextGauntlet = HARD.gauntletEvery;
    this.rowsSince = 99; this.lastSlabTunnel = false; this.speedMark = 0;
  }

  // ---------- R2: overdrive ----------
  startSpeed() { return this.hard ? HARD.speedStart : CFG.speed0; }

  targetSpeed(score: number, time: number): number {
    if (!this.hard) return Math.min(CFG.speedMax, CFG.speed0 + CFG.accel * time);
    const t = Math.min(1, score / HARD.rampScore);
    const base = HARD.speedStart + (HARD.speedAt2000 - HARD.speedStart) * t;
    const extra = Math.max(0, score - HARD.rampScore) / 1000;
    return Math.min(HARD.speedMax, base + extra);
  }

  // ---------- terrain / row tuning ----------
  gapFactor(): number { return this.hard ? rand(HARD.gapMin, HARD.gapMax) : rand(0.3, 0.5); }
  pteraFrom() { return this.hard ? HARD.pteraMinScore : CFG.pteraMinScore; }
  pteraChance() { return this.hard ? 1 - HARD.pteraShare : 0.8; } // r > chance => bird row

  /** distance from one row to the next */
  spacing(jump: number): number {
    if (!this.hard) return jump * rand(0.85, 1.5) + 5;
    // inside a gauntlet the rhythm is fixed: land, breathe, jump again
    if (this.gauntletLeft > 0) return jump * 0.95 + 6;
    return jump * rand(HARD.spaceMin, HARD.spaceMax) + HARD.spaceAdd;
  }

  // ---------- R3: duck zone (decided per terrain slab) ----------
  /** returns the length in score points of a duck zone to build into the next slab, or 0 */
  planSlab(score: number): number {
    if (!this.hard || this.lastSlabTunnel) { this.lastSlabTunnel = false; return 0; }
    const lazy = score - this.lastDuckScore >= HARD.duckEvery; // hasn't squatted for a while
    const due = score - this.lastTunnelScore >= HARD.forceEvery; // squat fans still get one now and then
    if (score >= HARD.duckMinScore && (lazy || due) && this.rowsSince >= HARD.breatherRows && this.gauntletLeft === 0) {
      this.lastSlabTunnel = true;
      this.lastTunnelScore = score;
      this.lastDuckScore = score; // don't plan another straight away
      this.rowsSince = 0;
      this.stats.tunnels++;
      return score >= HARD.tunnelLongFrom ? HARD.tunnelLong : HARD.tunnelShort;
    }
    return 0;
  }

  // ---------- R1 + R4: what the next row of obstacles is ----------
  nextRow(score: number, calm: boolean): { kind: RowKind; tag?: string } {
    if (!this.hard) return { kind: 'normal' };
    // R5: a calm slab (right next to a duck zone) only ever gets plain rows
    if (calm) return { kind: 'normal' };
    if (this.gauntletLeft > 0) {
      this.gauntletLeft--;
      this.rowsSince = 0;
      return { kind: 'wall' };
    }
    if (this.rowsSince < HARD.breatherRows) { this.rowsSince++; return { kind: 'normal' }; }

    if (score >= this.nextGauntlet) {
      this.nextGauntlet += HARD.gauntletEvery;
      this.gauntletLeft = HARD.gauntletRows - 1;
      this.rowsSince = 0;
      this.stats.gauntlets++;
      return { kind: 'wall', tag: `GAUNTLET X${HARD.gauntletRows} - JUMP!` };
    }
    if (this.wallPending) {
      this.wallPending = false;
      this.evasions = 0;
      this.rowsSince = 0;
      if (this.evadeKind === 'ptera') {
        this.stats.birdWalls++;
        return Math.random() < 0.5
          ? { kind: 'birds-duck', tag: 'BIRD WALL - DUCK!' }
          : { kind: 'birds-jump', tag: 'LOW BIRDS - JUMP!' };
      }
      this.stats.walls++;
      return { kind: 'wall', tag: 'NO DODGING - JUMP!' };
    }
    this.rowsSince++;
    return { kind: 'normal' };
  }

  // ---------- watching the player ----------
  observe(dt: number, score: number, p: Player, list: Obstacle[]) {
    if (!this.hard) return;

    // squat tracking: only a held duck counts, a tap does not
    if (p.ducking) {
      this.duckT += dt;
      if (this.duckT >= HARD.duckHold) this.lastDuckScore = score;
    } else this.duckT = 0;

    // speed milestones
    const mark = Math.min(4, Math.floor(score / 500));
    if (mark > this.speedMark) {
      this.speedMark = mark;
      this.onEvent(mark === 4 ? 'TOP SPEED!' : 'SPEED UP!');
    }

    for (const o of list) {
      const z = o.group.position.z;
      if (o.tag && !o.tagged && z + o.hz > -34) { o.tagged = true; this.onEvent(o.tag); }
      if (o.kind === 'tunnel') continue;
      // 1) when it comes into reaction range, note whether it threatens the lane we are in
      if (!o.seen && z > -24) {
        o.seen = true;
        o.threat = o.y0 < 2.0 && Math.abs(o.group.position.x - p.x) < o.hx + 1.0;
      }
      // 2) when it passes us, did we deal with it (jump / duck) or just step aside?
      if (!o.done && z > 0) {
        o.done = true;
        if (!o.threat) continue;
        const dx = Math.abs(o.group.position.x - p.x);
        if (dx < o.hx + 0.32) {
          this.evasions = 0; this.lastEvadeRow = -1; // went over / under it: honest play
        } else if (o.row !== this.lastEvadeRow) {
          this.lastEvadeRow = o.row;
          this.evadeKind = o.kind === 'ptera' ? 'ptera' : 'cactus';
          if (++this.evasions >= HARD.evadeLimit) this.wallPending = true;
        }
      }
    }
  }
}
