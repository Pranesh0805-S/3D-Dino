import * as THREE from 'three';

// Turns an ASCII bitmap into an extruded voxel mesh containing only exposed faces.
// Exposed-faces-only matters: EdgesGeometry then yields a clean pixel-art outline.

const FACES = [
  { dir: [-1, 0, 0], c: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] },
  { dir: [1, 0, 0], c: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] },
  { dir: [0, -1, 0], c: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] },
  { dir: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] },
  { dir: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] },
] as const;

export interface BitmapOpts {
  size: number;
  depthOf: (ch: string) => number; // must be odd
  include?: (ch: string) => boolean;
  pivotCol?: number;
}

export function bitmapGeometry(rows: string[], o: BitmapOpts): THREE.BufferGeometry {
  const H = rows.length;
  const W = Math.max(...rows.map((r) => r.length));
  const include = o.include ?? (() => true);
  const pivot = o.pivotCol ?? W / 2;
  const occ = new Set<string>();
  const cells: [number, number, number][] = [];

  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ' || !include(ch)) continue;
      const d = o.depthOf(ch);
      const half = (d - 1) / 2;
      for (let k = 0; k < d; k++) {
        const cell: [number, number, number] = [c, H - 1 - r, Math.round(k - half)];
        cells.push(cell);
        occ.add(cell.join(','));
      }
    }
  });

  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  for (const [cx, cy, cz] of cells) {
    for (const f of FACES) {
      if (occ.has(`${cx + f.dir[0]},${cy + f.dir[1]},${cz + f.dir[2]}`)) continue;
      const base = pos.length / 3;
      for (const k of f.c) {
        pos.push((cx + k[0] - pivot) * o.size, (cy + k[1]) * o.size, (cz + k[2] - 0.5) * o.size);
        nor.push(...f.dir);
      }
      idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** Filled mesh + crisp pixel outline. */
export function outlined(
  geo: THREE.BufferGeometry,
  fill: THREE.Material,
  line: THREE.LineBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, fill));
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), line));
  return g;
}
