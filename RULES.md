# RULES: 3D Dino (endless runner, Three.js)

All rules are **[inferred]** from the existing code (`src/game/config.ts`, `rules.ts`, `player.ts`, `obstacles.ts`, `world.ts`, plus `game.ts` and `input.ts` for loop, score and input). Nothing here is a written design spec. World unit is about 1 metre. The dino runs toward -z and the world scrolls toward +z. The dino sits at z = 0.

Source of every number is cited as `file:symbol`. Two modes exist: EASY (classic random spawns) and HARD (the "director" in `rules.ts`).

## Physics constants
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| PHY-01 [inferred] | Every simulation step | State is running | Gravity of 46 units/s^2 is subtracted from vertical speed (`CFG.gravity`) | Applied also while idle or dead, so a dead dino over a gap keeps falling |
| PHY-02 [inferred] | Jump starts | Grounded or coyote timer above 0 s | Vertical speed is set to 17 units/s (`CFG.jumpVel`); theoretical peak 3.14 units and air time 0.739 s (`AIR_TIME`) | Real peak is below 3.14 units at 60 FPS because of Euler drift, see PHY-05 |
| PHY-03 [inferred] | Jump key released | Airborne and vertical speed above 0 units/s | Vertical speed is multiplied by 0.45 (`CFG.jumpCut`) | A tap released before the buffered jump fires has no effect, so the jump is full height |
| PHY-04 [inferred] | Every step | Airborne, DOWN held, vertical speed below 0 units/s | Extra downward acceleration of 70 units/s^2 (`CFG.fastFall`) | Not applied while dead |
| PHY-05 [inferred] | Every rendered frame | Always | Frame time is clamped to 0.05 s (20 FPS floor) then one variable step is run: `vy -= g*dt; y += vy*dt` (semi-implicit Euler, no fixed timestep) | Jump peak depends on frame rate: tuner shows 2.86 units at 30 FPS, 3.00 units at 60 FPS and 3.08 units at 144 FPS against 3.14 units designed |
| PHY-06 [inferred] | Dino lands | y at or below 0 units, previous y at or above -0.01 units, floor present, vertical speed at or below 0 units/s | y set to 0 units, vertical speed set to 0 units/s, grounded set | If no floor is present the dino keeps falling and never lands |
| PHY-07 [inferred] | Every step | Dino standing | Hitbox is 0.64 units wide (x), 1.24 units deep (z) and 2.0 units tall; ducked height is 1.0 units | Ducking is only possible while grounded |

## Input
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| INP-01 [inferred] | Space, ArrowUp, W, Enter, tap, or JUMP button pressed | State is running | Jump request stored for 0.1 s (`CFG.jumpBuffer`) and fires on the next grounded step | Held key does not repeat (`e.repeat` ignored) |
| INP-02 [inferred] | Dino leaves ground by walking off a slab | Not jumped | Jump still allowed for 0.08 s (`CFG.coyote`) | Coyote timer is reset to 0 s when a jump fires |
| INP-03 [inferred] | ArrowLeft/A or ArrowRight/D held | State is running | x moves 11 units/s (`CFG.strafe`), clamped to -4.6 to +4.6 units (`CFG.laneMax`) | Both held cancel out to 0 units/s |
| INP-04 [inferred] | ArrowDown or S held | Running and grounded | Dino ducks, hitbox height 1.0 units | Releasing under the tunnel (underside 1.45 units) lets the dino stand at once; standing height 2.0 units then overlaps the ceiling and kills it |
| INP-05 [inferred] | Window blur | Any state | left, right, down cleared to false and jump released | Window blur also pauses a running game, see STA-04 |
| INP-06 [inferred] | M pressed or MODE button clicked | State is idle or dead | Mode toggles EASY/HARD, run is reset, state set to idle | Ignored while running or paused |
| INP-07 [inferred] | P or Escape pressed | State is running | State set to paused | Ignored in other states; resume needs jump press |

## State machine
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| STA-01 [inferred] | Jump pressed | State is idle | State set to running, speed set to start speed, first jump requested | Start speed is 14 units/s (EASY) or 18 units/s (HARD) |
| STA-02 [inferred] | Jump pressed | State is paused | State set to running, frame timer reset | Resume does not request a jump |
| STA-03 [inferred] | Jump pressed | State is dead, more than 0.45 s since death, no ad playing | Restart, see RST-01 | Presses within 0.45 s are ignored |
| STA-04 [inferred] | Tab hidden or window blur | State is running | State set to paused | Dead or idle states are not paused |

## Spawn/Despawn
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| SPN-01 [inferred] | Far edge of terrain is nearer than 130 units ahead (`CFG.spawnDist`) | Every step | New floor slab generated; gap before it is max(3.2 units, jump distance x gap factor) | Gap factor is random 0.3 to 0.5 in EASY and 0.4 to 0.6 in HARD |
| SPN-02 [inferred] | Slab row position is within 85 units ahead (`LOOKAHEAD`) | Slab has room before its end marker | Row of obstacles placed; row spacing is jump distance x 0.85 to 1.5 plus 5 units (EASY) | HARD spacing is jump distance x 0.8 to 1.3 plus 4.5 units, or x 0.95 plus 6 units inside a gauntlet |
| SPN-03 [inferred] | Spawn roll after score reaches 200 points (EASY) or 100 points (HARD) | Row is a plain row | Pterodactyl row chance is 20% EASY and 25% HARD; bottoms at 0.15, 1.15, 1.15 or 2.35 units | Pterodactyls move 4 units/s faster than the ground (`pteraExtraSpeed`) and are spawned further out to arrive on time |
| SPN-04 [inferred] | Plain row roll below pterodactyl chance | Random r above 0.6 / 0.4 to 0.6 / up to 0.4 | Spawn 7-cactus fence (1.6 units apart) with 1 or 2 cacti skipped / spawn 2 to 3 cacti in a column 1.3 units apart / spawn 1 cactus | Fence opening is 3.2 units centre to centre (4.8 units when 2 are skipped) |
| SPN-05 [inferred] | Obstacle trailing edge passes z = 12 units (`CFG.despawnZ`) | Every step | Obstacle removed and disposed | Tunnel uses its half length, so a long tunnel despawns later |
| SPN-06 [inferred] | Slab back edge passes z = 16 units (`despawnZ + 4`) | Every step | Slab removed and geometry disposed | Initial runway slab is 76 units long (z from 16 to -60) |

## Difficulty
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| DIF-01 [inferred] | Every step | EASY mode | Speed = min(32, 14 + 0.2 x seconds survived) units/s | Reaches the 32 units/s cap after 90 s |
| DIF-02 [inferred] | Every step | HARD mode | Speed ramps linearly from 18 units/s at 0 points to 40 units/s at 2000 points, then adds 1 units/s per 1000 points, capped at 46 units/s | Cap reached at 8000 points |
| DIF-03 [inferred] | Dino dodges sideways around 2 threatening rows in a row | HARD, rows are different, no jump or duck between | Next row is spawned as a full wall (cactus line spaced 0.4 units apart) or a bird wall 1.5 units apart | A jump or duck over a threat resets the sidestep count to 0 |
| DIF-04 [inferred] | Score reaches 1000 points and every 1000 points after | HARD | Spawn gauntlet of 3 full walls, spacing jump distance x 0.95 plus 6 units | Needs 2 normal rows of breather before it |
| DIF-05 [inferred] | 250 points without a real squat (DOWN held 0.4 s), or 1200 points since last duck zone | HARD, score at least 300 points, 2 breather rows done | Duck zone slab built, length 100 points (200 points from 1500 points) | Never planned back to back or during a gauntlet |
| DIF-06 [inferred] | After any hazard row | HARD | Keep at least 2 plain rows before the next hazard | Keeps hazards from stacking |
| DIF-07 [inferred] | Theme check every step | Score reaches each multiple of 700 points (`nightEvery`) | Day/night theme flips; night is on for the first 700 points | Cosmetic only |

## Score
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| SCR-01 [inferred] | Every step | Running | Record distance += speed x dt; set score = floor(distance x 0.62) points | Score depends on speed, so it is not points per second; frame time clamp of 0.05 s limits one step |
| SCR-02 [inferred] | Score crosses a multiple of 100 points | Running | Point sound plays and score flashes for 0.65 s | Fires once per milestone |
| SCR-03 [inferred] | Score first exceeds the high score from run start | High score above 0 points | NEW HI callout shown and sound plays once | Not shown when the high score at run start was 0 points |
| SCR-04 [inferred] | Player dies | Score above high score | High score saved under `dino3d:hi` (EASY) or `dino3d:hi:hard` (HARD) | Storage errors are swallowed; corrupt value parses to 0 points |
| SCR-05 [inferred] | HUD update | Always | Score shown as 5 digits zero padded | Scores above 99999 points show 6 digits |

## Health/Lives
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| HLT-01 [inferred] | Dino hitbox overlaps any obstacle box in x, y and z | Running | Death: state set to dead, hit sound plays, death timer set to 0 s | One life only; obstacle is skipped when more than hz + 3 units away in z |
| HLT-02 [inferred] | Dino has no floor and y at or below 0 units | Running | End run (death) by falling into a gap | Checked in the same step as the collision check; collision is only evaluated if the floor check did not fire |

## Lose
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| LOS-01 [inferred] | HLT-01 or HLT-02 fires | Running | Game over screen shown; score and speed freeze; run ends | Death can fire at most once per run because state leaves running |

## Win
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| WIN-01 [inferred] | None | Endless | No win state; the run continues until death | No score cap is applied; see SCR-05 for display |

## Restart
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| RST-01 [inferred] | Jump pressed 0.45 s or more after death | State is dead | Reset director counters, world, player, speed to 0 units/s, distance 0 units, time 0 s, score 0 points; then start running at the start speed | High score is kept; on the portal build an ad plays first after 3 deaths and 150 s since the last ad |
| RST-02 [inferred] | Mode toggled | State is idle or dead | Full reset, state idle, high score reloaded for the new mode | Cannot be done while running |

## Bounds
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| BND-01 [inferred] | Dino strafes | Running | x is clamped to -4.6 to +4.6 units | The ground is 12 units wide (-6 to +6 units), so the dino cannot walk off the sides |
| BND-02 [inferred] | Dino y reaches 0 units or lower | Floor present | Clamp y to 0 units and ground the dino | See PHY-06 |
| BND-03 [inferred] | Dino y reaches 0 units or lower | No floor | Falls without limit until death fires, see HLT-02 | No kill plane; y keeps decreasing while in the dead state |
| BND-04 [inferred] | Obstacle passes behind the dino | z above 12 units | Removed, see SPN-05 | Obstacles placed at x between -5.8 and +5.8 units |

## Randomness (seed)
| ID | Trigger | Condition | Effect | Edge case |
|---|---|---|---|---|
| RNG-01 [inferred] | Any random choice | Slab, row, cactus, pterodactyl, wall composition | Keep calling `Math.random()` directly in `world.ts`, `obstacles.ts`, `rules.ts` (0 seeds) | There is NO seed (spec gap). A run cannot be replayed. Seed is none (0 recorded). The QA harness replaces `Math.random` with a seeded generator only in `qa/` |
