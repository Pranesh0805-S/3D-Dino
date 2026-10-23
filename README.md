<div align="center">

<img src="docs/banner.svg" alt="3D Dino — a pixel dino jumping over a cactus" width="100%">

### The Chrome dino, rebuilt as a third-person 3D platformer.

[![Play now](https://img.shields.io/badge/▶_PLAY_NOW-acacac?style=for-the-badge&labelColor=202124)](https://3d-dino.vercel.app)
&nbsp;
![TypeScript](https://img.shields.io/badge/TypeScript-202124?style=for-the-badge&logo=typescript&logoColor=acacac)
![Three.js](https://img.shields.io/badge/Three.js-202124?style=for-the-badge&logo=threedotjs&logoColor=acacac)
![Vite](https://img.shields.io/badge/Vite-202124?style=for-the-badge&logo=vite&logoColor=acacac)
![Vercel](https://img.shields.io/badge/Vercel-202124?style=for-the-badge&logo=vercel&logoColor=acacac)

[![QA: 76/100](https://img.shields.io/badge/QA_run-76%2F100-202124?style=for-the-badge&labelColor=202124&color=acacac)](https://github.com/Pranesh0805-S/Game-Dev-Skills/blob/main/examples/3d-dino-pro-run/BUG_REPORT.md)
[![Tested with Game-Dev-Skills Pro](https://img.shields.io/badge/Tested_with-Game--Dev--Skills_Pro-202124?style=for-the-badge&labelColor=202124&color=acacac)](https://github.com/Pranesh0805-S/Game-Dev-Skills)

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
- 🧠 **Easy / Hard mode** — Hard has a rule engine that reacts to how you play (see below)
- ⚡ **Keeps accelerating** like the original, with variable-height jumps, duck and fast-fall
- 🏆 **Current score + HI score** (`HI 01415  00018`), saved in the browser; the score flashes every 100 points
- 🔊 **Retro beeps** generated with WebAudio — no audio files
- 🥇 **"NEW HI!"** callout the moment you pass your best, and again on the game-over screen
- 📱 **Touch controls** appear automatically on phones

## 🎮 Controls

| Action | Keyboard | Touch |
| :-- | :-- | :-- |
| Jump (hold = higher) | `Space` · `↑` · `W` | ▲ or tap anywhere |
| Duck / fast-fall | `↓` · `S` | ▼ |
| Move sideways | `←` `→` · `A` `D` | ◀ ▶ |
| Start / restart | `Space` · `Enter` | tap |
| Switch Easy / Hard (between runs) | `M` | `MODE` button (top left) |
| Pause | `P` · `Esc` | `PAUSE` button |
| Sound on / off | — | `SOUND` button |


## 🧠 Game modes & the rule engine

**EASY** is the classic game: random obstacles, speed ramps up over time.
**HARD** adds a *director* ([`src/game/rules.ts`](src/game/rules.ts)) that watches how you play and shapes the track. Each high score is kept per mode.

| # | Rule | What it does |
| :-: | :-- | :-- |
| 1 | **No dodging** | Sidestep 2 obstacles in a row without a real jump/duck and the next row is an unbroken wall of cacti (or birds) you must go over or under. A callout warns you ~1 second ahead. |
| 2 | **Overdrive** | Speed is tied to score: 18 → 40 at **2000 points**, then +1 per 1000 (cap 46). |
| 3 | **Duck zone** | No real squat (hold ↓ for 0.4 s) for 250 points → a long low ceiling you must stay ducked under for **100 points** (**200 after 1500**). Squat fans still get one every 1200 points. |
| 4 | **Gauntlet** | Every 1000 points, 3 full walls in a row on a fixed jump rhythm. |
| 5 | **Breather** | After any hazard there are plain rows again, and a duck zone never shares the track with cacti or birds, so rules never stack into an impossible spot. |

Hard also uses wider gaps, tighter spacing and birds from 100 points. Every number is in the `HARD` object at the top of `rules.ts`.

## 🎮 Game-portal build (CrazyGames)

The same code can be built for game portals. `npm run build:portal` writes `dist-portal/` with the [CrazyGames SDK](https://docs.crazygames.com/sdk/intro/) switched on:
a midgame ad on every 3rd restart (never sooner than 150 s apart, sound muted while it plays), gameplay start/stop and loading events, and no external links.
The normal `npm run build` (Vercel) never loads the SDK. Submission steps: [`docs/PORTAL.md`](docs/PORTAL.md).

## 🧪 Tested with Game-Dev-Skills Pro

This game was rule-checked and QA-tested with the Pro edition of [Game-Dev-Skills](https://github.com/Pranesh0805-S/Game-Dev-Skills), a set of Claude Skills that write a numbered `RULES.md` and then run automated checks against it.

| | |
| :-- | :-- |
| **Release readiness** | **76 / 100 — ship with known issues** |
| **Rules documented** | 47 (inferred from the code, linted with 0 errors) |
| **Automated checks** | 49 run against the real `Game` class: 39 pass, 10 fail |
| **Bugs found** | 7 — 0 critical, 1 major, 4 minor, 2 polish |

- 📋 [`RULES.md`](https://github.com/Pranesh0805-S/Game-Dev-Skills/blob/main/examples/3d-dino-pro-run/RULES.md) — every rule with trigger, condition, effect and edge case
- 🐞 [`BUG_REPORT.md`](https://github.com/Pranesh0805-S/Game-Dev-Skills/blob/main/examples/3d-dino-pro-run/BUG_REPORT.md) — severity-ranked findings, plus what was **not** tested

The one major finding: pausing mid-jump keeps simulating the dino, which can cause an unfair death on resume. The report also notes that jump height varies slightly with frame rate and that Hard-mode gauntlets are rare for players who never duck. These are known and documented rather than hidden.

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
      ├─ world.ts        endless track, gaps, spawning rows + duck zones
      ├─ rules.ts        Easy / Hard rule engine (the director)
      ├─ portal.ts       CrazyGames SDK wrapper (portal build only)
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