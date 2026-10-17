import * as THREE from 'three';
import type { Theme } from './theme';

// Moon, stars and clouds are camera-attached sprites drawn far behind the world,
// so they behave like the 2D backdrop of the original game.

const DIST = 170;

function tex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const disk = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, f: (x: number, y: number) => void) => {
  for (let y = 0; y < ctx.canvas.height; y++)
    for (let x = 0; x < ctx.canvas.width; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) f(x, y);
};

interface Item { s: THREE.Sprite; nx: number; ny: number; speed: number; size: number }

export class Sky {
  readonly group = new THREE.Group();
  private halfH = 1;
  private halfW = 1;
  private clouds: Item[] = [];
  private stars: Item[] = [];
  private moon: Item;
  private starMats: THREE.SpriteMaterial[] = [];
  private moonMat: THREE.SpriteMaterial;
  private cloudMat: THREE.SpriteMaterial;

  constructor() {
    const mk = (map: THREE.Texture) =>
      new THREE.SpriteMaterial({ map, transparent: true, fog: false, depthWrite: false });

    // moon: crescent
    const moonTex = tex(24, 24, (ctx) => {
      const a: boolean[][] = [];
      disk(ctx, 14, 12, 11, (x, y) => ((a[y] ??= [])[x] = true));
      disk(ctx, 8, 12, 10, (x, y) => { if (a[y]) a[y][x] = false; });
      a.forEach((row, y) => row?.forEach((on, x) => on && ctx.fillRect(x, y, 1, 1)));
    });
    this.moonMat = mk(moonTex);
    this.moon = this.add(this.moonMat, -0.62, 0.1, 24, 0, this.group);

    // stars: two plus shapes
    const star3 = tex(3, 3, (ctx) => { ctx.fillRect(1, 0, 1, 3); ctx.fillRect(0, 1, 3, 1); });
    const star5 = tex(5, 5, (ctx) => { ctx.fillRect(2, 0, 1, 5); ctx.fillRect(0, 2, 5, 1); });
    const sm3 = mk(star3);
    const sm5 = mk(star5);
    this.starMats = [sm3, sm5];
    const spots: [number, number, 0 | 1][] = [
      [-0.97, -0.05, 1], [-0.48, 0.55, 1], [-0.2, 0.78, 0], [0.12, 0.62, 0], [0.35, 0.85, 1],
      [0.62, 0.5, 0], [0.5, 0.88, 0], [-0.38, 0.92, 0], [0.05, 0.3, 0], [0.75, 0.2, 1],
    ];
    for (const [nx, ny, k] of spots) this.stars.push(this.add(k ? sm5 : sm3, nx, ny, k ? 5 : 3, 0, this.group));

    // clouds
    const cloudTex = tex(48, 14, (ctx) => {
      const fill = (cx: number, cy: number, r: number) => disk(ctx, cx, cy, r, (x, y) => ctx.fillRect(x, y, 1, 1));
      ctx.fillRect(4, 10, 40, 4);
      fill(12, 10, 4); fill(21, 7, 6); fill(31, 8, 5); fill(39, 10, 4);
    });
    this.cloudMat = mk(cloudTex);
    for (const [nx, ny, sp] of [[0.6, 0.45, 0.012], [-0.2, 0.7, 0.008], [-0.9, 0.35, 0.01], [0.1, 0.15, 0.006]] as const)
      this.clouds.push(this.add(this.cloudMat, nx, ny, 36, sp, this.group));
  }

  private add(mat: THREE.SpriteMaterial, nx: number, ny: number, size: number, speed: number, parent: THREE.Group): Item {
    const s = new THREE.Sprite(mat);
    s.renderOrder = -10;
    s.scale.set(size, size * (mat === this.cloudMat ? 14 / 48 : 1), 1);
    parent.add(s);
    return { s, nx, ny, speed, size };
  }

  resize(aspect: number, fovDeg: number) {
    this.halfH = DIST * Math.tan(THREE.MathUtils.degToRad(fovDeg / 2));
    this.halfW = this.halfH * aspect;
    this.place();
  }

  private place() {
    for (const it of [this.moon, ...this.stars, ...this.clouds]) it.s.position.set(it.nx * this.halfW, it.ny * this.halfH, -DIST);
  }

  update(dt: number, speed: number, th: Theme) {
    for (const c of this.clouds) {
      c.nx -= c.speed * dt * (0.4 + speed / 20);
      if (c.nx < -1.3) { c.nx = 1.3; c.ny = 0.1 + Math.random() * 0.7; }
    }
    this.place();
    this.cloudMat.color.copy(th.cloud);
    this.moonMat.color.copy(th.moon);
    this.moonMat.opacity = th.night;
    for (const m of this.starMats) { m.color.copy(th.star); m.opacity = th.night; }
  }
}
