# Bug Report: 3D Dino

Date: 2026-10-22  
Release readiness: **76/100: SHIP WITH KNOWN ISSUES**

## Summary

| Severity | Confirmed |
|---|---|
| Critical | 0 |
| Major | 1 |
| Minor | 4 |
| Polish | 2 |
| **Total** | **7** |

## Confirmed bugs

### BUG-001: Pausing (or alt-tabbing) mid-jump keeps simulating the dino, causing unfair deaths on resume
- **Severity**: Major
- **Steps to reproduce**:
  1. Run npx tsx qa/sim_harness.ts (EASY, seed 5)
  2. Press jump, step 12 frames (dino at y=2.40), call pause()
  3. Step 60-120 frames while paused, then press to resume and step once
- **Expected**: While paused the dino and world are both frozen; resuming continues the same jump
- **Actual**: Dino keeps falling while the world is frozen. After 2 s paused: y=0, vy=0, landed. With a cactus under the pause point, resume ends the run immediately; over a gap the dino falls to y=-38.2 during 1.5 s of pause
- **Evidence**: harness_output.txt: 'FAIL pause freezes the dino mid-jump: before y=2.403 vy=7.80; after 2 s paused y=0.000 vy=0.00 grounded=true'; 'FAIL pause above a gap: y after 1.5 s paused over a gap = -38.22'; 'FAIL pause mid-jump above a cactus, wait 1 s, resume: dino y at pause=2.40 (cactus top y=1.33); after resume state=dead'. Cause: src/game/game.ts:237-243 the non-running branch still calls player.update(dt, ...) so gravity runs while paused; auto-pause on blur/visibilitychange is at game.ts:103-104, so alt-tab during a jump triggers it
- **Suggested fix**: Skip player.update (or only update when state is idle/dead) while state === 'paused'.

### BUG-002: Jump height depends on frame rate (variable-step semi-implicit Euler, no fixed timestep)
- **Severity**: Minor
- **Steps to reproduce**:
  1. Run npx tsx qa/sim_harness.ts
  2. Compare 'FPS parity (full)' peaks at 20/30/60/120/144 FPS
- **Expected**: Peak within 2% of design 3.141 units at every frame rate (RULES PHY-02, PHY-05)
- **Actual**: Peak 2.73 (20 FPS), 2.86 (30), 3.00 (60), 3.07 (120), 3.08 (144) units: 11.2% spread; 4.5% low at 60 FPS. Air time stays 0.733-0.736 s at 30-144 FPS, 0.70 s at 20 FPS. Distance and score are frame-rate independent (0.02% spread over 60 s)
- **Evidence**: harness_output.txt 'FAIL FPS parity (full)'. Same numbers as physics tuner (qa/physics_tuner_output.txt: Euler 30 FPS 8.95%, 60 FPS 4.48%, 144 FPS 1.87%). Code: src/game/player.ts:103-105 (vy -= g*dt; y += vy*dt) and game.ts:195 (dt = min(0.05, ...)), no accumulator
- **Suggested fix**: Fixed-step accumulator (for example 1/120 s) with the closed-form update y += v*dt - 0.5*g*dt^2, or substep player.update.

### BUG-003: Cactus collision can be skipped at 20-22 FPS when speed is above about 36 units/s (HARD mode)
- **Severity**: Minor
- **Steps to reproduce**:
  1. Run npx tsx qa/sim_harness.ts
  2. See the tunnelling checks: HARD, standing dino, lone cactus in lane, dt = 0.05 s (the frame clamp), 40 start alignments
- **Expected**: A standing dino in the cactus lane always collides
- **Actual**: 40 units/s at 20 FPS (step 2.00 units): 4/40 alignments passed through. 46 units/s at 20 FPS (step 2.30 units): 8/40 passed through. 32 units/s at 20 FPS (1.61 units), and 46 units/s at 30 and 60 FPS: 0/40
- **Evidence**: harness_output.txt 'FAIL tunnelling ... 40 units/s, 20 FPS: 4/40' and '46 units/s, 20 FPS: 8/40'. Cactus depth 2 x 0.28 + dino depth 2 x 0.62 = 1.8 units overlap window (obstacles.ts:65, player.ts:148) versus per-step travel speed x dt in game.ts:195-211; discrete test in obstacles.ts:172-183. HARD speed passes 36 units/s at about 1500 points (rules.ts:82-88)
- **Suggested fix**: Sweep the test (check overlap of the z interval travelled this step) or substep world.update/collision when speed*dt > 1.0.

### BUG-004: HARD mode: gauntlet (3 walls every 1000 points) is starved for a player who never squats
- **Severity**: Minor
- **Steps to reproduce**:
  1. Run npx tsx qa/sim_harness.ts (section 10: HARD, god mode, seed 5, 10 sim-minutes, dino standing still at x=0)
  2. Compare a player who never holds DOWN with one who holds DOWN 30% of the time
- **Expected**: RULES DIF-04: one gauntlet per 1000 points (15 due by score 15,342)
- **Actual**: Never squats: 1 gauntlet delivered (15 due), 29 duck zones, 34.3% of the time inside a duck zone. Squats 30%: 14 gauntlets, 11 duck zones. Another run (soak, seed 1234) delivered 0 gauntlets and 30 duck zones
- **Evidence**: harness_output.txt 'FAIL HARD director, player never squats: score=15342 gauntlets due=15 delivered=1, duck zones=29, time spent inside a duck zone=34.3%'. Code: rules.ts:105-118 (a lazy player is always due a duck zone) and rules.ts:121-131 (calm slabs and rowsSince gate the gauntlet check). Caveat: god mode and a stationary dino, so sidestepping (DIF-03) was not simulated
- **Suggested fix**: Decide the intended priority between duck zones and gauntlets; either let a due gauntlet pre-empt a duck zone, or document the behaviour in the README.

### BUG-005: All randomness uses unseeded Math.random, so runs cannot be replayed (no seed in RULES RNG-01)
- **Severity**: Minor
- **Steps to reproduce**:
  1. Open the S006 hits listed in qa/static_scan_output.txt
  2. Note the harness had to replace Math.random with a seeded generator to get determinism
- **Expected**: Randomness is seedable and the seed is recorded (skill hard rule, playbook item 3)
- **Actual**: Math.random used in world.ts:18, rules.ts:40, obstacles.ts:78/87, sky.ts:98 and many direct calls. Additionally three.js UUID generation also draws from Math.random: the first Game built in a process consumed 2629 draws and later ones 2806, so even a replaced Math.random is not reproducible unless the harness warms up first
- **Evidence**: static_scan S006 x5 (qa/static_scan_output.txt); in-session measurement 'construct 0 random calls 2629 obstacles 2' vs 'construct 1 random calls 2806 obstacles 6' (same seed 42). Harness warm-up at qa/sim_harness.ts make('easy', 0)
- **Suggested fix**: Pass a seeded PRNG (mulberry32) into World/Rules/Obstacles and keep it separate from three.js; show the seed in the debug overlay.

### BUG-006: Negative frame delta is not clamped: time, distance and the dino can step backwards
- **Severity**: Polish
- **Steps to reproduce**:
  1. Run npx tsx qa/sim_harness.ts
  2. See 'negative frame delta': last=1000, frame(984)
- **Expected**: dt is clamped to the range 0 to 0.05 s
- **Actual**: Time 0.5000 -> 0.4840 and distance 7.026 -> 6.800 units after one frame with a 16 ms negative delta
- **Evidence**: harness_output.txt 'FAIL negative frame delta (rAF timestamp earlier than last)'. Code: src/game/game.ts:195 Math.min(0.05, (now - this.last) / 1000) has no lower bound; game.ts:139 sets last = performance.now() on resume, while the next rAF timestamp can be earlier than that
- **Suggested fix**: Math.max(0, Math.min(0.05, ...)).

### BUG-007: A corrupt negative high score in storage is accepted and shown as 'HI 000-5'
- **Severity**: Polish
- **Steps to reproduce**:
  1. Set localStorage dino3d:hi to -5 and load the game (harness: make('easy', 5, '-5'))
- **Expected**: RULES SCR-04: corrupt value falls back to 0 points
- **Actual**: hi = -5 and the HUD text is 'HI 000-5'. 'abc', 'NaN' and '' correctly give 0
- **Evidence**: harness_output.txt 'FAIL corrupt high score "-5" falls back to 0: hi=-5, HUD text="HI 000-5"'. Code: src/game/game.ts:266 parseInt(...) || 0 accepts negatives. Needs manual tampering of storage to occur
- **Suggested fix**: Math.max(0, parseInt(...) || 0).

## Tested

- Static scan of src/ (15 files, 10 candidate hits), every hit triaged: py scripts/static_scan.py src --json qa/findings_scan.json (see qa/STATIC_SCAN_TRIAGE.md)
- Simulation harness driving the real Game class from src/ (no copy of its logic), 49 checks: npx tsx qa/sim_harness.ts. Results: qa/harness_output.txt, qa/harness_results.json. 39 pass, 10 fail; each failure is a finding below or a reported rule deviation
- Determinism: same seed + same scripted inputs, 3600 steps at 60 FPS, EASY and HARD (seeds 42/43), identical state every step
- FPS parity at 20/30/60/120/144 FPS: jump peak and air time, jump cut, duck-held jump, distance after 60 s sim time (EASY and HARD)
- Restart: counters reset, director private counters equal a fresh game, 0.45 s lockout, 50 restarts with scene node count bounded (EASY and HARD)
- Frame time: 10,000 s frame through frame() clamp, negative delta, dt=0, dt=5 s direct, dt=NaN direct
- Tunnelling sweep: 40 start alignments x 5 speed/FPS cases against a lone cactus
- Pause: mid-jump freeze, pause over a gap, pause over a cactus then resume
- Score/high score: NEW HI once, save on death, corrupt storage values abc / -5 / NaN / empty, score never decreases over 90 s
- Input: left+right cancel, strafe clamp 4.6 units, mode toggle ignored while running, tap-release jump, duck held at start
- Spawn fairness: 81 consecutive full-width cactus row pairs in HARD (100 seeds x 40 s at top speed), 0 in the unwinnable timing window; EASY generates no full-width rows (0 pairs)
- 10 simulated-minute soak, EASY and HARD, 60 FPS, god mode (collisions off, floor always present): no NaN, bounded obstacles/slabs/nodes, speed cap respected
- HARD director cadence over 10 simulated minutes for a player who never squats and one who squats 30% of the time
- Physics tuner on config.ts values (jump 3.1413 units, apex 0.3696 s, 14 units/s): qa/physics_tuner_output.txt. RULES.md lint: 47 rules, 0 errors, 0 warnings (qa/rules_lint_output.txt)

## NOT tested

- Real browser rendering, WebGL, GPU memory (renderer.info) and real frame pacing: the harness replaces WebGLRenderer with a no-op. Geometry disposal was reviewed in code (world.ts:190, obstacles.ts:150,167,186), not executed
- CrazyGames portal build, ads and SDK mute: portal.ts is replaced by a no-op shim (it is a no-op in the normal build anyway). reviewed, not executed
- Touch, pointer and on-screen button input, real keyboard events, window blur/visibilitychange events: input.ts reviewed, not executed. The harness calls input callbacks and flags directly
- Audio (Web Audio): reviewed, not executed
- Camera behaviour, clipping, resize and devicePixelRatio, portrait layout: reviewed, not executed
- HARD rules DIF-03 (two sidesteps => wall / bird wall) and bird-wall rows: director counters are read, but no sidestepping bot was run, so a triggered wall from dodging was only seen once by accident (walls=1 in one run). reviewed, not executed
- Full unwinnable-pattern solver: only consecutive full-width cactus rows were analysed. Fence rows, columns, bird rows, gap + obstacle combinations and duck zones with a real player were not solved. reviewed, not executed
- Gap-jump fairness with a bot that plays (gaps are generated and tested only as soak scenery in god mode)
- Running with the real Vite build (npm run build), localStorage in private mode, share button, restart ad flow
- Mobile device performance (30 FPS floor on a mid device)

---
Scoring: Critical -25, Major -10, Minor -3, Polish -1. Any Critical forces Do Not Ship.
