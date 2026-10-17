<div align="center">

<img src="docs/banner.svg" alt="3D Dino — a pixel dino jumping over a cactus" width="100%">

### The Chrome dino, rebuilt as a third-person 3D platformer.

[![Play now](https://img.shields.io/badge/▶_PLAY_NOW-acacac?style=for-the-badge&labelColor=202124)](https://3d-dino.vercel.app)
&nbsp;
![TypeScript](https://img.shields.io/badge/TypeScript-202124?style=for-the-badge&logo=typescript&logoColor=acacac)
![Three.js](https://img.shields.io/badge/Three.js-202124?style=for-the-badge&logo=threedotjs&logoColor=acacac)
![Vite](https://img.shields.io/badge/Vite-202124?style=for-the-badge&logo=vite&logoColor=acacac)
![Vercel](https://img.shields.io/badge/Vercel-202124?style=for-the-badge&logo=vercel&logoColor=acacac)

</div>

<table>
  <tr>
    <td align="center"><img src="docs/night.png" alt="Night mode"><br><sub><b>Night</b> — the dark dino theme</sub></td>
    <td align="center"><img src="docs/day.png" alt="Day mode"><br><sub><b>Day</b> — flips every 700 points</sub></td>
  </tr>
</table>

---

## ✨ Features

- 🦖 **Pixel-art dino in 3D** — every model is built from ASCII pixel art, extruded into voxels with a crisp outline
- 🎥 **Third-person camera** that follows the dino and leans into your strafing
- 🌗 **Day / night cycle** every 700 points, with moon, stars and clouds
- 🕳️ **Platformer mechanics** — gaps in the track, cacti, walls of cacti and pterodactyls (after 200 pts)
- ⚡ **Keeps accelerating** like the original, with variable-height jumps, duck and fast-fall
- 🏆 **Current score + HI score** (`HI 01415  00018`), saved in the browser; the score flashes every 100 points
- 🔊 **Retro beeps** generated with WebAudio — no audio files
- 📱 **Touch controls** appear automatically on phones

## 🎮 Controls

| Action | Keyboard | Touch |
| :-- | :-- | :-- |
| Jump (hold = higher) | `Space` · `↑` · `W` | ▲ or tap anywhere |
| Duck / fast-fall | `↓` · `S` | ▼ |
| Move sideways | `←` `→` · `A` `D` | ◀ ▶ |
| Start / restart | `Space` · `Enter` | tap |

<details>
<summary><b>🚀 Run it locally</b></summary>

```bash
git clone https://github.com/Pranesh0805-S/3D-Dino.git
cd 3D-Dino
npm install
npm run dev          # http://localhost:5173
```

Production build: `npm run build` → `dist/` · preview it with `npm run preview`.

</details>

<details>
<summary><b>☁️ Deploy to Vercel</b></summary>

**Dashboard:** vercel.com → *Add New → Project* → import this repo → *Deploy*. Vite is auto-detected.

**CLI:**
```bash
npm i -g vercel
vercel login
vercel --prod
```

</details>

<details>
<summary><b>🗂️ Project structure</b></summary>

```
3D-Dino/
├─ index.html            canvas + score / HI / game-over HUD
├─ vercel.json           Vite build + caching headers
├─ docs/                 banner and screenshots
└─ src/
   ├─ main.ts            entry point
   ├─ style.css          pixel-font HUD, touch buttons
   └─ game/
      ├─ config.ts       gravity, jump, speed ramp, scoring
      ├─ sprites.ts      dino / cactus / pterodactyl as ASCII pixel art
      ├─ voxel.ts        ASCII bitmap → voxel mesh + outline
      ├─ theme.ts        day / night palettes
      ├─ sky.ts          moon, stars, clouds
      ├─ player.ts       jump, duck, strafe, hitbox
      ├─ obstacles.ts    cacti, pterodactyls, collisions
      ├─ world.ts        endless track, gaps, spawning
      ├─ input.ts        keyboard + touch
      ├─ audio.ts        WebAudio sound effects
      └─ game.ts         state machine, camera, score / HI
```

</details>

<details>
<summary><b>🧠 How it works</b></summary>

```mermaid
flowchart LR
  A[Input] --> B[Game.step]
  B --> C[World: scroll track, spawn gaps + obstacles]
  B --> D[Player: physics, jump, duck, strafe]
  C --> E{Collision or fell in a gap?}
  D --> E
  E -- yes --> F[Game over, save HI]
  E -- no --> G[Score += distance]
  G --> H[Theme flips every 700 pts]
  B --> I[Three.js renders at low-res, CSS upscales]
```

The dino stays at the origin while the world scrolls toward the camera. Gap width and obstacle
spacing are computed from the current speed and jump air-time, so every layout is jumpable.

</details>

<details>
<summary><b>🎛️ Tweak the feel</b></summary>

Everything lives in [`src/game/config.ts`](src/game/config.ts):

| Setting | What it does |
| :-- | :-- |
| `gravity`, `jumpVel` | jump height and hang time |
| `speed0`, `speedMax`, `accel` | start speed, top speed, ramp-up |
| `scorePerUnit` | how fast the score climbs |
| `nightEvery` | points between day / night flips |
| `pteraMinScore` | when pterodactyls appear |

</details>

---

<div align="center">
<sub>Inspired by Chrome's offline dino game. Not affiliated with Google.</sub>
</div>
