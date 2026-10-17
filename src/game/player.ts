import * as THREE from 'three';
import { CFG } from './config';
import { DINO_BODY, DINO_LEGS } from './sprites';
import { bitmapGeometry, outlined } from './voxel';
import type { Theme } from './theme';
import type { Input } from './input';

export interface Box { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }

export class Player {
  readonly root = new THREE.Group();
  private pivot = new THREE.Group();
  private frames: Record<'a' | 'b' | 'stand', THREE.Group>;
  private shadow: THREE.Mesh;

  x = 0;
  y = 0;
  vy = 0;
  grounded = true;
  ducking = false;
  dead = false;
  private yaw = 0;
  private runT = 0;
  private coyote = 0;
  private jumpBuf = 0;

  onJump: () => void = () => {};

  constructor(th: Theme) {
    const size = CFG.VOX;
    const build = (legs: string[]) => {
      const rows = [...DINO_BODY, ...legs];
      const g = outlined(
        bitmapGeometry(rows, { size, depthOf: () => 7, pivotCol: 11 }),
        th.fill,
        th.outline,
      );
      // eye: slightly wider than the body so it pokes out on both sides
      const eye = new THREE.Mesh(
        bitmapGeometry(rows, { size, depthOf: () => 9, include: (c) => c === 'e', pivotCol: 11 }),
        th.eye,
      );
      g.add(eye);
      // bitmap x-axis (head direction) -> world -z
      g.rotation.y = Math.PI / 2;
      return g;
    };
    this.frames = { a: build(DINO_LEGS.a), b: build(DINO_LEGS.b), stand: build(DINO_LEGS.stand) };
    for (const f of Object.values(this.frames)) this.pivot.add(f);
    this.root.add(this.pivot);

    this.shadow = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.02, 1),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }),
    );
    this.reset();
  }

  reset() {
    this.x = 0; this.y = 0; this.vy = 0;
    this.grounded = true; this.ducking = false; this.dead = false;
    this.yaw = 0; this.runT = 0; this.coyote = 0; this.jumpBuf = 0;
    this.pivot.scale.set(1, 1, 1);
    this.pivot.rotation.set(0, 0, 0);
    this.show('stand');
    this.syncTransform();
  }

  get shadowMesh() { return this.shadow; }

  requestJump() { this.jumpBuf = CFG.jumpBuffer; }
  releaseJump() {
    if (this.vy > 0 && !this.grounded) this.vy *= CFG.jumpCut;
  }

  private show(k: 'a' | 'b' | 'stand') {
    for (const [name, f] of Object.entries(this.frames)) f.visible = name === k;
  }

  /** supported(z) tells whether solid ground exists under the dino right now */
  update(dt: number, inp: Input, speed: number, supported: boolean, running: boolean) {
    const prevY = this.y;

    if (!this.dead) {
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      if (running) this.x = THREE.MathUtils.clamp(this.x + dir * CFG.strafe * dt, -CFG.laneMax, CFG.laneMax);
      // lean into the turn (heading -z, rotates towards +x when moving right)
      this.yaw += (-dir * 0.4 - this.yaw) * (1 - Math.exp(-12 * dt));

      this.jumpBuf = Math.max(0, this.jumpBuf - dt);
      this.coyote = this.grounded ? CFG.coyote : Math.max(0, this.coyote - dt);
      if (running && this.jumpBuf > 0 && (this.grounded || this.coyote > 0)) {
        this.vy = CFG.jumpVel;
        this.grounded = false;
        this.coyote = 0;
        this.jumpBuf = 0;
        this.onJump();
      }
      this.ducking = running && inp.down && this.grounded;
    }

    // vertical physics
    this.vy -= CFG.gravity * dt;
    if (!this.grounded && !this.dead && inp.down && this.vy < 0) this.vy -= CFG.fastFall * dt;
    this.y += this.vy * dt;

    if (this.y <= 0 && prevY >= -0.01 && supported && this.vy <= 0) {
      this.y = 0;
      this.vy = 0;
      this.grounded = true;
    } else if (this.y < 0 || !supported) {
      if (!supported && this.y <= 0) this.grounded = false;
    }
    if (this.y > 0) this.grounded = false;

    this.animate(dt, speed, running);
    this.syncTransform();
  }

  private animate(dt: number, speed: number, running: boolean) {
    if (running && this.grounded && !this.dead) {
      this.runT += dt * (speed / 14);
      this.show(Math.floor(this.runT / 0.085) % 2 ? 'a' : 'b');
    } else this.show('stand');

    const sy = this.ducking ? 0.6 : 1;
    const sz = this.ducking ? 1.15 : 1;
    this.pivot.scale.x += (1 - this.pivot.scale.x) * 0.3;
    this.pivot.scale.y += (sy - this.pivot.scale.y) * (1 - Math.exp(-30 * dt));
    this.pivot.scale.z += (sz - this.pivot.scale.z) * (1 - Math.exp(-30 * dt));
    this.pivot.rotation.y = this.yaw;
    // little forward pitch while airborne going up / back when falling
    this.pivot.rotation.x = this.grounded ? 0 : THREE.MathUtils.clamp(-this.vy * 0.012, -0.2, 0.2);
    if (this.dead) this.pivot.rotation.z += dt * 0; // reserved
  }

  private syncTransform() {
    this.root.position.set(this.x, this.y, 0);
    // blob shadow stays on the floor, shrinks with height
    const s = Math.max(0.35, 1.3 - this.y * 0.18);
    this.shadow.position.set(this.x, 0.03, 0);
    this.shadow.scale.set(0.8 * s, 1, 1.9 * s);
    this.shadow.visible = this.y >= -0.05 && !this.dead;
  }

  hitbox(): Box {
    const h = this.ducking ? 1.0 : 2.0;
    return { x0: this.x - 0.32, x1: this.x + 0.32, y0: this.y, y1: this.y + h, z0: -0.62, z1: 0.62 };
  }
}
