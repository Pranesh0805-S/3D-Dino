// All gameplay tuning lives here. World unit ≈ 1 metre.
export const CFG = {
  VOX: 0.09, // size of one "pixel" (voxel) on the dino
  VOX_OBJ: 0.1, // size of one "pixel" on cacti / pterodactyls

  // player physics
  gravity: 46,
  jumpVel: 17,
  jumpCut: 0.45, // release jump early => shorter hop
  fastFall: 70, // extra downward accel while holding duck in mid-air
  strafe: 11,
  laneMax: 4.6,
  coyote: 0.08,
  jumpBuffer: 0.1,

  // speed ramp (like the original: starts slow, keeps accelerating)
  speed0: 14,
  speedMax: 32,
  accel: 0.2,

  // world
  groundW: 12,
  spawnDist: 130,
  despawnZ: 12,

  // scoring (original: distance * 0.025; tuned for our units)
  scorePerUnit: 0.62,
  milestone: 100,
  nightEvery: 700, // theme flips every 700 points, like the original

  pteraMinScore: 200,
  pteraExtraSpeed: 4,

  hiKey: 'dino3d:hi',
  modeKey: 'dino3d:mode',
  muteKey: 'dino3d:mute',
  tunnelY: 1.45, // underside of a duck-zone ceiling (a ducked dino is ~1.4 tall, standing is 2.3)
  siteUrl: 'https://3-d-dino.vercel.app/',
  repoUrl: 'https://github.com/Pranesh0805-S/3D-Dino',
};

export const AIR_TIME = (2 * CFG.jumpVel) / CFG.gravity;

/** easy keeps the original `dino3d:hi` key so existing high scores survive */
export const hiKeyFor = (mode: 'easy' | 'hard') => (mode === 'hard' ? `${CFG.hiKey}:hard` : CFG.hiKey);
