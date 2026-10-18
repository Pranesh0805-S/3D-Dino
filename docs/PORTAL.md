# Publishing 3D Dino on CrazyGames

Docs: https://docs.crazygames.com  ·  Requirements: https://docs.crazygames.com/requirements/intro/

## 1. Build the portal package

```powershell
npm install
npm run build:portal
Compress-Archive -Path dist-portal\* -DestinationPath 3d-dino-crazygames.zip -Force
```

`index.html` must sit at the **root** of the zip (the command above does that). Size is about 0.6 MB, far under the 50 MB first-load limit.

## 2. Test locally (optional)

```powershell
npm run preview:portal
```

Open the printed `http://localhost:...` address. On localhost the SDK runs in *local* mode: ads show a text overlay,
events are logged in the browser console (`gameplayStart`, `loadingStop`, ...). Add `?useLocalSdk=true` to test on another host.

## 3. Submit

Create a developer account on the CrazyGames Developer Portal (linked from docs.crazygames.com), upload the zip and fill in:

| Field | Text to use |
| :-- | :-- |
| Title | 3D Dino |
| Short description | The Chrome dino game as a third-person 3D platformer. Jump gaps, dodge cacti and birds, and try Hard mode, where the game reacts to how you play. |
| Controls | Space / Up / W = jump (hold = higher) · Down / S = duck · Left / Right / A / D = move sideways · M = Easy/Hard · P = pause |
| Mobile | Yes (on-screen buttons) |
| Covers | Take screenshots at 16:9 from the game (night and day) and a short GIF/video of a Hard-mode wall or duck zone. Sizes are listed in the portal. |

Pitch point for the review: *not a clone* - it is a 3D rethink with a rule engine (anti-dodge walls, duck zones, speed ramp, gauntlets) that reacts to the player.

## 4. What happens next

1. **Basic Launch** (7-21 days): limited test, ads and revenue are **off**.
2. **Full Launch**: only if CrazyGames selects the game. Ads and revenue share start then.
3. If it is declined, the same zip can be submitted to other portals (each has its own SDK; ask me to add it).

## How the integration works (`src/game/portal.ts`)

| Game moment | SDK call |
| :-- | :-- |
| Page ready | `SDK.init()`, `game.loadingStart()`, `game.loadingStop()` |
| Run starts / resumes | `game.gameplayStart()` |
| Death, pause, menu | `game.gameplayStop()` |
| Restart after 3 deaths (150 s apart at least) | `ad.requestAd('midgame')`, sound muted while it plays |
| New high score | `game.happytime()` |
| Platform mute setting | honoured automatically |

If the SDK is blocked (ad blocker, offline) the game simply runs without it.
