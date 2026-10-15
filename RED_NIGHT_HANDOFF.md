# Red Night: handoff for Claude Code

**For:** Claude Code. Joshua wants the code reviewed and improved: performance, polish and bugs.
**Live build:** https://claude.ai/artifact/7ti2u8WeK1PpiHHHTZ8bw9 (version 21, 2026-10-15; v20 was 2026-10-14)
**Repo:** github.com/joshuagrigson/red_night, branch `claude/inspiring-euler-4ewuw9` (v20 baseline is commit `b13e661`)
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

- **Concatenation order** (from `build.sh`; the order matters because these are globals, not modules): `core pbr data world facade dressing city2 interiors story combat ai traffic ambience actors chars landmarks player ui post digital main`. `tools/dupcheck.sh` runs inside `build.sh` and fails the build on a duplicate top-level name (a second function with the same name silently replaces the first).
- **Why the `.glb.txt` files:** the artifact host serves `.txt` but not `.glb`, so every GLB ships as base64 text. Loaders call `fetch(url + '.txt')`, then `atob`, then `GLTFLoader.parse`.
- **Publishing:** the page is `dist/red-night.html`. Assets are published alongside it under `assets/...`.
  - A publish adds or replaces only the files it sends; it never deletes the rest.
  - The artifact holds 173 files (v21 added `assets/sky/clouds.jpg`, `street_env.jpg`, `hero.jpg`).
  - The page declares the `downloads` capability: photo mode's Download goes through the viewer's save prompt (`phSave` in ui.js), because a plain download link does nothing inside the Claude app. Republish with the same declaration (omit `capabilities` to keep it).
  - Before a republish the Artifact tool requires a full read of the live page; it is about 6,350 lines, so read it in chunks of about 450 lines.
- **Test scripts and scratch paths:** the Python test scripts (`*.py` at the root) are headless Playwright runs using swiftshader. They write screenshots to a hard-coded scratch path (`/tmp/claude-0/...`); change `OUT=` in each.
- **Headless speed:** the game loop runs at about 0.05× real time headless. AI tests step update functions directly, with `requestAnimationFrame` stubbed.

## v21: what changed (read this first)

**Direction.** The city is realistic first: sodium streetlights, lit windows in real palettes, wet asphalt, a blood moon behind real clouds (Poly Haven HDRIs cut by `tools/hdriprep.py` into `assets/sky/clouds.jpg`, `street_env.jpg`, `hero.jpg`). The cyberpunk is a layer on top, the **Augment dial** `G.aug` (0..1, default .35, saved as `rn_aug`):
- Settings → Augment sets it; **N** tips the layer in or out with a tilt animation (the Window weather app's code overlay).
- Everything neon registers on `AUG_HOOKS` (`augApply(v)` runs them): tower fins, trims, crowns, the hologram, pyramid outlines, ad drones, car underglow, character rims (`RIM_AUG`), the viewmodel rims, the menu previews and the post grade (`fin` shader `aug` uniform: chromatic fringe and the net grade). At 0 the city is bare.
- **The net layer** (`src/digital.js`, canvas `#dig`): code fragments on tipped edge panels, motes, a scan sweep, corner chrome, AR tags for landmarks, doors and (above .55) visible threats. It stays in a mid-height band and off the HUD corners and touch buttons (`digKeep` rects, refreshed every 2 s), redraws at 20 Hz on touch and low quality (30 Hz otherwise), and renders at 1x on phones.

**New systems.**
- `ambience.js`: audio bus with reverb, rain curve, footsteps, barks (`AMB.bark(pos, kind, opt)`), a helicopter, skyline beds, and a danger-driven score.
- HEAT (wanted level, pips under the clock) → gang cars, enemy frag grenades, helicopter.
- Civilians flee into buildings or crouch behind cars.
- The 11 PM grid blackout in Cairo or Salem (`GRID`, `gridFail` / `gridRestore` / `gridReset`), restored at 2 AM.
- Photo mode (pause → Photo): free camera, FOV, roll, hide UI, save JPEG.
- Settings: FOV, aim assist (touch only), invert Y, rain, Augment.
- Title flythrough (`TITLE_SHOTS`).

**Performance.**
- Off-map interiors are split into their own group (`splitWorld`) and hidden while you're in the city.
- Cached STD/NEON materials are merged by vertex colour (`bakeStatic`).
- Line of sight and ray tests walk a grid (`rayGrid`, `aiLos`).
- `boxesNearN` is count-based and allocation-free.
- Paused, loadout and gunsmith frames are held, not redrawn.
- Downtown: triangles about 975k → 494k, draw calls 455 → 294.
- Characters load lazily: boot download 30.9 MB → 20.2 MB.
- **DRS** (`drsTick`, core.js):
  - It reads the median frame of each 2 s window.
  - It steps down only after two slow windows, and every step down is a probe.
  - If the next windows aren't at least 7% faster, the resolution comes back and DRS waits 30, 60, 120, then 240 s before probing again. This keeps a 30 Hz Low Power Mode cap or a CPU-bound scene from pinning the resolution at the floor.
  - Known limit: on a phone that is vsync-locked to 30 fps by the GPU, a single .08 step can't show a gain, so DRS stays at full resolution there.

**Review pass (v21, all fixed and checked headless).**
- Photo mode or pause during the death or sunrise countdown no longer soft-locks; `pause()` refuses then, and `uiReset()` clears every overlay at the end screen, restart and quit.
- End-screen and intro timers are cleared on quit or restart (`G.endT`, `STORY.introT`).
- The body shows in photo mode from first person.
- The net layer no longer tags disguised shapeshifters or reptilians, or enemies that haven't loaded yet.
- Score and kills reset each night, and quitting clears the blackout.
- The club ambush cooldown resets per night (`G.nightId`).
- The wake-up blur no longer leaks into the title screen or photo mode.
- Phone layout:
  - The creator's Outfit row sits above the fold.
  - Banners sit under the crosshair rather than on it.
  - The broadcast box has a fixed frame, and the objective reserves two lines.
  - The feed allows two lines.
  - HUD text has an 11 px floor.
  - The gunsmith shows attachments first, with Close pinned.
  - Portrait mid-night pauses behind the rotate hint.
- The creator and gunsmith previews are lit like the street.
- The apartment copy tells one story: the 6:58 sirens are the two-minute warning.

**Deliberately kept:** the green and warm lamps on the Cairo minarets (real mosques light them that way); the HUD stays HUD and is not drawn by the net layer.

## Source map (`src/`, about 9,500 lines)

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
| ambience.js | Audio bus, reverb, rain, footsteps, barks, helicopter, danger score (`AMB`) |
| digital.js | The net layer canvas `#dig` and the N toggle (`DIG`, `updateDigital`, `digTags`) |
| post.js / main.js | Bloom and the fin grade (Augment-aware); boot (`Promise.all` of loaders, then `init`), the night lifecycle (`startNight`/`clearNight`/`endScreen`), the GRID blackout, and the main loop |

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

1. **Mobile performance is still unmeasured on a real iPhone.**
   - v21 headless numbers: about 494k triangles and 294 draw calls downtown; boot download 20.2 MB, because characters now load lazily.
   - Next steps: KTX2 textures; drop the normal maps on `_lo` crowd models.
   - Verify DRS on a real device in Low Power Mode.
2. **Bullpups aren't bullpups.** Tripo text-to-3D always produced conventional layouts: Bullpup A3 (AUG) is an olive carbine, Bullpup 90 (P90) is a compact PDW, Royal L86 is an AR with a bipod.
   - Fix with image-to-3D from a reference picture, or a CC0/CC-BY model.
   - Joshua is down to **80 Tripo credits**, so ask before spending.
3. ~~A cyan bar draws above the built-in scope on Tundra SVD and Anvil .50.~~ Fixed in v21 with the `builtinScope` flag in `MODELS`.
4. **Model proportions:**
   - Sawed-Off is a full-length double barrel.
   - Red Nodachi is broad.
   - Drum Auto has a box magazine, not a drum.
   - Pocket Macro has a translucent weapon light.

   Tune `len`, or regenerate.
5. **Viewmodel hand placement** on the 24 new guns comes from auto anchors and has only been spot-checked in headless shots. Check the hands on every gun in first person, aim-down-sights and third person, and nudge `anchors.grip`/`sup` in `MODELS`.
6. ~~Karambit & Dagger~~: fixed in v21. The off-hand is its own `dagger` weapon (`W[s.w.offhand]`).
7. **Long-coat rule:** `playerCust()` still carries the `long` rule (bottom = top for `vampire`/`witch`), which is only used by the fallbacks now. The mode-1 and mode-2 code paths are fallback-only for the player; enemies don't use `customizeGLB`.
8. **Headless realism:** time runs at 0.05×, so any timing-based test (reloads, AI reaction) must step update functions manually.
9. **AI and gameplay ideas.** v21 shipped frags, fleeing civilians, gang cars and HEAT. Still open:
   - real CoD reload animations (the current ones are procedural transforms).

## Conventions Joshua expects

- Act on reversible changes without asking. Ask first only for irreversible deletes, spending money or credits, or messaging people.
- Give code changes as complete, paste-ready blocks.
- Answer the question in the first sentence.
- Keep a Brain log in his Google Drive folder "Claude Brain" (ID `1zFTLpUzFbY_kWTL8afU5f3KhmaqU-BFn`). Docs there are append-only and titled with the conclusion.
