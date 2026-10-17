# Dino 3D

A third-person 3D platformer take on the Chrome dino game. Same monochrome pixel look, day/night
cycle every 700 points, HI + current score (HI is saved in `localStorage`).

**Stack:** TypeScript · Three.js · Vite (no framework, static site).

## Controls
| Action | Keys |
| --- | --- |
| Jump (hold = higher) | `Space` / `↑` / `W` / tap |
| Duck / fast-fall | `↓` / `S` |
| Move sideways | `←` `→` / `A` `D` |
| Start / restart | `Space` / `Enter` / tap |

Touch devices get on-screen buttons automatically.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
```

## Deploy to Vercel
```bash
npm i -g vercel
vercel --prod      # framework is auto-detected (Vite), config is in vercel.json
```
or push to GitHub → vercel.com → *Add New Project* → import the repo → *Deploy*.

## Layout
```
src/
├─ main.ts            entry
├─ style.css          HUD, game-over, touch buttons
└─ game/
   ├─ config.ts       all tuning: gravity, jump, speed ramp, scoring
   ├─ sprites.ts      ASCII pixel art (dino, cacti, pterodactyl)
   ├─ voxel.ts        ASCII bitmap -> extruded voxel mesh + outline
   ├─ theme.ts        day / night palettes + material lerp
   ├─ sky.ts          moon, stars, clouds
   ├─ player.ts       dino physics, animation, hitbox
   ├─ obstacles.ts    cacti + pterodactyls, collision
   ├─ world.ts        endless ground, gaps, obstacle spawning
   ├─ input.ts        keyboard + touch
   ├─ audio.ts        WebAudio beeps (no audio files)
   └─ game.ts         state machine, camera, HUD, score / HI
```
