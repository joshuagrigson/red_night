# Staging for v23 (hit and damage realism)

Nothing in this folder ships yet. build.sh doesn't read it. v23 will wire these files in.

## anim/: retargeted animation packs (CC0)

Source: Quaternius Universal Animation Library 1 **Pro** (Joshua bought it on itch.io for $9.99 on 2026-10-15) and Library 2 Standard. Both are CC0; see LICENSE-UAL.txt.

Every clip is already retargeted onto the game's library skeleton (`optc/anims.glb`, `mixamorig:*` names). So chars.js only has to:
- merge each pack's clips into `ANIMLIB.raw`;
- add `CLIPMAP` entries;
- bake them onto each character with the existing world-space bake.

The `_lite` files drop the finger channels. The fingers then hold the character's rest pose, and the file has half the keys.

| Pack | Clips | lite | full |
|---|---|---|---|
| ual_hits | 18: Hit_Chest(+_M), Hit_Head(+_M), Hit_Shoulder_L/R, Hit_Stomach(+_M), Stagger_Back, Hit_Knockback, GetUp_Back, Death01(+_M), Death02(+_M), Limp_R/L_Loop, Idle_Tired_Loop | 199 KB | 416 KB |
| ual_wounded | 7: Crawl_Enter, Crawl_Idle/Fwd/Bwd/Left/Right_Loop, Crawl_Exit | 106 KB | 184 KB |
| ual_moves | 23: Crouch_Enter/Exit/Idle/Fwd/Bwd/Left/Right, Jog_Left/Right/Bwd_Loop, Dodge_Left/Right, Roll, OverhandThrow, Pistol_Idle/Shoot/Reload/Aim_Up/Neutral/Down, Idle_LookAround_Loop, Turn90_L/R | 244 KB | 499 KB |

`_M` is a mirrored copy, so a reaction can come from either side. Limp_R and Limp_L are UAL2's Zombie walk, which drags the right leg, and its mirror.

### Two requirements before wiring them in

1. **The LoopOnce bake fix (required).** chars.js `bakeClip` samples with the mixer's default LoopRepeat. The sample at t = duration wraps to frame 0, so every one-shot clip ends on its FIRST pose. In v21 that makes every corpse except the 'female' rig's snap back upright 3 s after death.
   - Fix: call `setLoop(T.LoopOnce, 1)` and set `clampWhenFinished` on one-shot clips before sampling. Keep LoopRepeat for loops.
   - Measured on the male and purger rigs (tools/verify_pack.cjs): with the fix, every clip lands within the same 8-11° mean (24° max) error v21's own clips already have. Without it, the deaths, knockback, get-up, crawl enter/exit, dodge and roll end up to 164° wrong. Death01 even ends with the hips at standing height.
   - Evidence: ../docs/v23-hit-realism/v21_fall_wrap_bug.png.
2. **Bake cost.** Each clip costs about 200 ms of main-thread baking per character type. 48 clips times 16 types would hitch phones. Bake lazily: only the clips a character type actually uses, the first time it needs them.

The optional per-bone rest swing (`tools/bake.cjs` with `fix: true`) removes the remaining 8-11° mean error between Tripo rigs.

## sfx/: 36 sound effects (CC0, 464 KB)

Flesh hits, a headshot hit, a gore splat, body falls, hitmarker ticks, a kill thunk and chime, a headshot ding, male and female pain and death vocals, a slow, fast and single heartbeat, tired breathing, and two generated near-miss cracks.

They come from Kenney and OpenGameArt, and every one is CC0. Per-file sources are in manifest.json and LICENSES.txt.

None has been auditioned by ear yet. MP3 loops have a gap, so schedule `heartbeat_single` instead of looping.

## tools/: how the packs were made

```
npm i   # three@0.128, @gltf-transform/*, meshoptimizer
node build_pack_pro.mjs <UAL1_Pro.glb> <UAL2_Standard.glb> ../../optc/anims.glb <anims_notex.glb> <outdir>
node verify_pack.cjs <pack.glb> <pack_raw.glb> <anims_notex.glb> <male_notex.glb> <purger_notex.glb> <UAL1_Pro.glb> <UAL2_Standard.glb>
```

`notex.mjs` makes the texture-free copies of the rigs that the bake reads.

The Pro source file itself (21 MB) is not committed. It's Joshua's download from itch.io.

The research behind all of this (Call of Duty reference numbers, resource tests and GitHub finds) is in ../docs/v23-hit-realism/.
