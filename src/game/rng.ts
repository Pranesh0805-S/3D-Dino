// Seedable randomness (BUG-005). Two independent streams so replays are exact:
//  - random():   everything that shapes a run (rows, gaps, obstacle types)
//  - fxRandom(): purely cosmetic (cloud heights, wing phase), drawn at frame-dependent
//                times, so it must never share a stream with the gameplay draws.
// three.js still uses Math.random for its own UUIDs; that no longer matters because
// the game never calls Math.random.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let gameplay = mulberry32(1);
let cosmetic = mulberry32(2);

export function seedRng(seed: number) {
  gameplay = mulberry32(seed);
  cosmetic = mulberry32(seed ^ 0x9e3779b9);
}

export const random = () => gameplay();
export const fxRandom = () => cosmetic();

/** a fresh 32-bit seed for a new run */
export const newSeed = () => (Math.random() * 0x100000000) >>> 0;
