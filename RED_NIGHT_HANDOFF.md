# Red Night: handoff for Claude Code

**For:** Claude Code. Joshua wants the code reviewed and improved: performance, polish and bugs.
**Live build:** https://claude.ai/artifact/7ti2u8WeK1PpiHHHTZ8bw9 (version 20, 2026-10-14)
**Source:** `red-night-source.zip`, next to this file in Downloads. It holds the code, tools, test scripts and optimized assets.
**Raw Tripo exports:** `~/Downloads/rn_*.glb`. Re-run calibration from these.

## What the game is

A GTA-style night shooter set during a "Purge night", in a Gotham / Cyberpunk look.

- **Controls:** Call of Duty style. First-person and third-person views, swappable, with shoulder swap.
- **City:** four districts, Cairo, Sacramento, Texarkana and Salem.
- **Enemies:** purgers (a hacker gang), demons, vampires, shapeshifters, reptilians and witches.
- **Device:** it must run on an iPhone inside the Claude app, so mobile performance is the top constraint.
- **Tech:** three.js r128, loaded from cdnjs and jsdelivr. Everything else is vanilla JS concatenated into one HTML page.

## Build and run

```bash
unzip red-night-source.zip -d red-night && cd red-night
npm install            # three@0.128, @gltf-transform/cli, meshoptimizer, playwright
./build.sh             # -> dist/red-night.html (CDN libs) + dist/test.html (local libs) + dist/assets/*.glb.txt
cd dist && python3 -m http.server 8765    # open http://localhost:8765/test.html
```

- **Concatenation order** (from `build.sh`; the order matters because these are globals, not modules): `core pbr data world facade dressing city2 interiors story combat ai traffic actors chars landmarks player ui post main`.
- **Why the `.glb.txt` files:** the artifact host serves `.txt` but not `.glb`, so every GLB ships as base64 text. Loaders call `fetch(url + '.txt')`, then `atob`, then `GLTFLoader.parse`.
- **Publishing:** the page is `dist/red-night.html`. Assets are published alongside it under `assets/...`.
  - A publish adds or replaces only the files it sends; it never deletes the rest.
  - The artifact currently holds 170 files.
- **Test scripts and scratch paths:** the Python test scripts (`*.py` at the root) are headless Playwright runs using swiftshader. They write screenshots to a hard-coded scratch path (`/tmp/claude-0/...`); change `OUT=` in each.
- **Headless speed:** the game loop runs at about 0.05× real time headless. AI tests step update functions directly, with `requestAnimationFrame` stubbed.

## Source map (`src/`, about 6,000 lines)

| File | Responsibility |
|---|---|
| core.js | Renderer and helpers: `store()` (localStorage, `rn_` prefix), audio engine `AU` (samples plus synth fallback), `rayBoxes`, `losClear` |
| pbr.js | PBR texture loading |
| data.js | Weapon table `WDEF`/`W` (35 weapons), attachments, camos, the `buildWeapon()` procedural builder plus the GLB overlay, the **`MODELS`** table (Tripo weapon meshes with q/off/anchors/len), and lazy `loadModel()` |
| world.js | Grid city (`ROADS`, `CW`, `HALF`), `building()`, the `Car` class, parked cars, the `centerHolo()` sign |
| facade.js / city2.js | ambientCG photo facades (`FACDEF`), the 5 skyscraper templates, Poly Haven props with near-set streaming (`refillNear`), parks, grass, mailboxes |
| dressing.js | Curbs and street furniture |
| interiors.js / story.js | Apartment, interiors, broadcast story, objective beacon (now a ground ring plus a minimap ring) |
| combat.js | CoD reload table `RL`, surface impacts `SURF` with instanced decals, car damage and explosions, SFX aliases |
| ai.js | Perception (FOV, line of sight, noise), squads, `purgerAI` (cover, peek, flank, `navPoint`), `enemyFire` rays, molotovs, crowds (`Group` and `Civ` sidewalk groups) |
| traffic.js | AI cars: lane following, intersection waypoints, braking, panic, carjack |
| actors.js | The `Enemy` class, `OUTFITS`, `SKINS`, `HAIR_COLS` |
| chars.js | Skinned Tripo characters (see "Characters" below) |
| landmarks.js | Five district landmark GLBs |
| player.js | Player, camera (FOV 64/66, third-person distance 2.25), viewmodel `buildVM()`, hitscan, loadout `G.load` |
| ui.js | Menus, character creator (`charChanged`), weapons wall (`smRefresh`/`pvGun`), HUD, minimap |
| post.js / main.js | Bloom and post effects; boot (`Promise.all` of loaders, then `init`) and the main loop |

## Characters (`src/chars.js`)

- **Rigs:** every character is a Tripo text-to-3D model with an auto-rigged Mixamo skeleton (52 joints used).
- **Animation:** one shared library lives in `assets/anims.glb` (the female model plus all clips).
  - `clipsFor(id)` bakes a world-space retarget per character: `D = Wsrc_anim·inv(Wsrc_rest); Wt = D·Wt_rest`, sampled at 30 fps.
  - All characters are baked at boot.
- **`CHARS`:** the model list. `RAWB` holds offline-measured rest bounds; these are needed because meshopt quantization breaks r128 bounds.
- **`PLAYER_MODELS`:** one dedicated model per outfit × gender.

  | Outfit | Man | Woman |
  |---|---|---|
  | Cybergang | `male` | `female` |
  | Hacker | `hackm` | `hackf` |
  | Nomad | `nomadm` | `nomadf` |
  | Corporate | `corpom` | `corpof` |

  `PLAYER_FALLBACK` is used if a model fails to load.
- **`customizeGLB` recolor shader:** one `onBeforeCompile` with height bands (head > .85, legs < .47, feet < .07) and HSV skin detection. Modes come from the `cMask` uniform:

  | `cMask` | Look | What gets recolored |
  |---|---|---|
  | 0 | Crowd and Cybergang | Full recolor to top / bottom / skin / hair |
  | 1 | Hood with painted neon mask (old Hacker) | Mask paint |
  | 2 | Hooded robe (witch) | Hair and glowing eyes |
  | 3 | **Dedicated outfit** (the six new models) | Skin and hair only. Clothes keep their sculpted texture. Cyan trims (hue .40–.68) are recolored to the chosen neon and glow; Hacker uses `NEON_OUTFIT`, and the picker shows "Hair & neon" swatches. |

- **Stomach cover (`COVER` table):** the women's tops are extended down to the belt.
  - Applies to `female`, `female_lo`, `hackf` and `nomadf`.
  - Masked in **bind-pose (T-pose) space** using `vBP`, the normalized pre-skinning position from `bindBounds(geo)`, which handles interleaved int16 positions:
    - height band `vBP.y` .49–.71;
    - torso column `|x| < .125 × height`;
    - skin hue.
  - Normals are flattened under the cover so the sculpted abs don't show.
  - It's a shader trick, not geometry: the abs and navel silhouette is still very faint on Nomad.
- **Crowds:** `*_lo` models (~9k tris) with random clothes, `k = .62`.

## Weapons pipeline (`src/data.js` → `MODELS`)

All 35 weapons now have Tripo meshes. 24 were new in v19. The loading and calibration steps:

1. **Optimize:** `tools/gunopt.sh id…` turns `raw/rn_<id>.glb` into `opt/rn_<id>.glb` (meshopt, webp 1024, no simplify).
2. **Calibrate:** `align.py` and `anchors.py`, driven by `SPEC=spec_x.json AOUT=anchors_x.json python3 anchors.py`, load `dist/raw/<file>`.
   - **Copy raw files into `dist/raw` first.** `dist/raw` is a real folder, not a symlink.
   - PCA aligns the barrel to −Z. `fz`/`fy` flip the long and up axes; `tilt` (degrees) is for pistols.
   - The script auto-estimates the anchors grip / sup / sight / rail / muzzle.
   - Manual overrides: `gx`/`sx` give the grip and support as a fraction of screen x in the 1200×500 side render, and `gk` sets grip height within the profile.
   - It renders `an_*.png` with the anchors drawn on. **Always look at them**; magazines and bipods fool the grip estimator.
3. **Lengths:** the `len` per weapon (meters) is set by hand in the generator. Pistols get a synthetic `sup` (grip + small offset).
4. **Lazy loading:** `MODEL_CORE` (the original 11) plus the saved loadout load before boot. The other 24 stream in two at a time. `buildWeapon` triggers `loadModel` on demand, and `modelArrived` rebuilds the viewmodel or weapons-wall preview when a mesh lands.

## Known issues and improvement backlog (highest value first)

1. **Mobile performance is unmeasured on a real iPhone.**
   - Headless swiftshader shows about 540k triangles on low and roughly 1M on high with 50 civilians.
   - Assets total about 40 MB of base64.
   - All 25 characters load at boot, about 16 MB. Lazy-load the player outfits that aren't selected and the enemy types not yet spawned.
   - Consider KTX2 textures and dropping the normal maps on `_lo` crowd models.
2. **Bullpups aren't bullpups.** Tripo text-to-3D always produced conventional layouts: Bullpup A3 (AUG) is an olive carbine, Bullpup 90 (P90) is a compact PDW, Royal L86 is an AR with a bipod.
   - Fix with image-to-3D from a reference picture, or a CC0/CC-BY model.
   - Joshua is down to **80 Tripo credits**, so ask before spending.
3. **A cyan bar draws above the built-in scope on Tundra SVD and Anvil .50.** The procedural optic or neon attachment draws on top of the GLB's own scope. Add a `builtinScope` flag (like the existing `builtinDot` on patriot15) and skip the optic mesh.
4. **Model proportions:**
   - Sawed-Off is a full-length double barrel.
   - Red Nodachi is broad.
   - Drum Auto has a box magazine, not a drum.
   - Pocket Macro has a translucent weapon light.

   Tune `len`, or regenerate.
5. **Viewmodel hand placement** on the 24 new guns comes from auto anchors and has only been spot-checked in headless shots. Check the hands on every gun in first person, aim-down-sights and third person, and nudge `anchors.grip`/`sup` in `MODELS`.
6. **Karambit & Dagger:** the dagger is `W.slasher` scaled to .75. It should be its own model.
7. **Long-coat rule:** `playerCust()` still carries the `long` rule (bottom = top for `vampire`/`witch`), which is only used by the fallbacks now. The mode-1 and mode-2 code paths are fallback-only for the player; enemies don't use `customizeGLB`.
8. **Headless realism:** time runs at 0.05×, so any timing-based test (reloads, AI reaction) must step update functions manually.
9. **AI and gameplay ideas still open:**
   - enemy grenades other than the molotov;
   - civilians fleeing into buildings;
   - vehicle AI for gangs;
   - a wanted or heat system;
   - real CoD reload animations (the current ones are procedural transforms).

## Conventions Joshua expects

- Act on reversible changes without asking. Ask first only for irreversible deletes, spending money or credits, or messaging people.
- Give code changes as complete, paste-ready blocks.
- Answer the question in the first sentence.
- Keep a Brain log in his Google Drive folder "Claude Brain" (ID `1zFTLpUzFbY_kWTL8afU5f3KhmaqU-BFn`). Docs there are append-only and titled with the conclusion.
