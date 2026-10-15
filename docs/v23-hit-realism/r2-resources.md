# R2: test-driving outside resources for being shot and taking damage

Run date: 2026-10-15. I only read the repo through `git show HEAD:` (v21, commit 73e5197). Everything below was run in this sandbox without Chromium. I wrote files only under `combat-research/`. I logged into nothing and spent nothing. The Hugging Face connector in this session is signed in as Joshua's account, so I did not use it. I made every Space call anonymously from a fresh venv, with no token.

Paths are relative to `/tmp/claude-0/-home-user/861f674d-fac1-597f-9be1-0bd1ebab3896/scratchpad/combat-research/`.

## Headline findings

1. **The Quaternius UAL 1+2 (CC0) clips work with the game's bake.** I built a 14-clip damage pack, retargeted onto the game's library skeleton. The game can load it with no changes to its bake code. It is 158 KB as a GLB, 211 KB as `.glb.txt`, and it is staged.
2. **v21 has a bug that undoes death animations.** `bakeClip()` in `src/chars.js` samples with the action left on `LoopRepeat`. Its last sample time, `Math.min(src.duration, f/fps)`, always equals the clip duration, and three r128 wraps that time to 0. So the last baked key of every clip holds the rotations of frame 0.
   - `die`/`fall` (and `hit`, `slash`, `punch`, `cast`) are played `LoopOnce` with `clampWhenFinished`. Every non-female GLB corpse therefore snaps back to the standing pose of frame 0 when the 3.0 s `fall` clip ends. The hips position track is copied rather than sampled, so the hips stay at lying height. The result is a standing body sunk into the floor from about t=3 s until animation stops at `deadT` 6 s (actors.js:270).
   - I reproduced this in Node with three r128 and the bake code from HEAD: on the male rig the last frame of `fall` has the hips at 0.864 of standing height instead of 0.292. See `evidence/v21_fall_wrap_bug.png` (top row, t=3.00).
   - The fix is one line in `bakeClip`: `act.setLoop(T.LoopOnce, 1); act.clampWhenFinished = true;` before `act.play()`. Clamping the sample time to `src.duration - 1e-4` also works. With LoopOnce the last frame is correct (hips at 0.292).
   - I have not seen this in a browser.
3. **v21's own Tripo-to-Tripo retarget is off by about 8 to 11 degrees on average, and up to 24.** The world-space bake assumes every Tripo rig has the same rest pose, and they don't. The female library rig rests with its arms 18° below horizontal, the male with 16°, and the purger with its arms 5° above. A per-bone rest swing (about 10 lines in `bakeCtx`) removes this: UAL to Tripo with the swing measured 0.0 to 0.1° mean and 3.3° max.
4. **HY-Motion is blocked for anonymous use.** The exact error was `You have exceeded your ZeroGPU quota (120s requested vs. 0s left). Try again in 0:00:00. Authenticate with a Hugging Face token for more quota`. I stopped there, as instructed.
5. **MoMask works anonymously and returns a BVH.** It runs on CPU, takes about 7 s per call and needs no quota. The motion quality was hit and miss on the three prompts, and the licence of its output is unclear.
6. **The sound set is staged.** It is 36 CC0 MP3s, 374 KB in total, in the game's own sfx format (mono, 44.1 kHz).
   - Correction to the brief: v21 already has near-miss whizzes. In `src/ai.js:308`, an enemy round that misses within 2.2 m plays `whiz_1`/`whiz_2` and adds `P.suppressed`. A ricochet is also in `combat.js:162`.
   - What is missing is a supersonic crack, flesh impacts, body falls, pain voices and a low-health heartbeat or breathing loop.
7. **Physics:** cannon-es 0.20.0 is about 37 KB over the wire, and its repo has a ragdoll example. A hand-rolled verlet ragdoll cost 10 to 25 times less per step in my Node benchmark.

---

## 1. Quaternius Universal Animation Library 1 + 2, Standard (CC0)

**Licence:** CC0 1.0 (`License.txt` in both zips). The itch page says: "Standard 15 MB free; Pro 41 MB at $9.99+; Source (.blend) at $14.99+", and "120+ animations" for UAL1.

### (a) Clips relevant to being shot

Each library has 43 clips at 30 fps, and both use the same 65-joint skeleton. I measured every clip in Node (three r128, LoopOnce sampling). I rendered stick-figure contact sheets in side and front views in `evidence/ual_retarget_sheet.png`.

| Clip | Lib | Dur s | What it is (measured or seen) | Use |
|---|---|---|---|---|
| Hit_Chest | 1 | 0.333 | Short flinch. The pelvis drops 2 cm and moves 3 cm back. | Per-hit body flinch |
| Hit_Head | 1 | 0.433 | Head snap. The pelvis is static. | Headshot flinch |
| Death01 | 1 | 2.400 | Falls **backward** onto the back. The pelvis ends 0.06 m high and the head 0.64 m behind the pelvis. The plain file moves the pelvis 0.46 m back. The _RM file moves the root 0.65 m back (1.11 m in total). | Death |
| Crouch_Idle_Loop / Crouch_Fwd_Loop | 1 | 2.93 / 2.00 | Crouch with the hips at 0.47 m. | Cover, wounded crouch |
| Roll | 1 | 1.467 | Dive forward, roll, and stand up. _RM moves 5.0 m. | Dodge |
| Pistol_Idle_Loop / _Shoot / _Reload | 1 | 1.67 / 0.63 / 1.67 | Two-handed pistol stance. | NPC pistol |
| Pistol_Aim_Up / Neutral / Down | 1 | 0.167 each | Single aim poses: blend these for aim pitch. | Aim offsets |
| Hit_Knockback | 2 | 0.833 | Launched up and back, then lands flat on the back. The pelvis ends 0.057 m high and the head 0.65 m behind. _RM moves the root **3.0 m** back. | Shotgun or explosion knockdown |
| LayToIdle | 2 | 1.533 | Gets up from lying on the back. Its start pose matches the end of Death01 and Hit_Knockback. | Get up after a knockdown |
| Idle_Shield_Break | 2 | 1.067 | Stagger back and recover. | Heavy-hit stagger |
| OverhandThrow | 2 | 1.333 | Full-body overhand throw. | Enemy frag throw |
| Slide_Start / Loop / Exit | 2 | 0.83 / 2.0 / 0.5 | Floor slide with the pelvis at 0.048 m. _RM moves 4 m and 2 m. | Player slide |
| Zombie_Walk_Fwd_Loop | 2 | 1.333 | **It is effectively a limp.** The right foot lifts 4.5 cm against 14.4 cm for the left. The right knee bends 0 to 57° against 9 to 77° for the left. The hands hang 41 to 44 cm below the shoulders (they are not stretched forward), and the body is hunched. _RM covers 1.4 m per cycle (1.05 m/s). | Wounded limp (mirror it for the other leg) |
| Zombie_Idle_Loop, Zombie_Scratch | 2 | 1.33 / 1.8 | A hunched idle and a lunging claw attack. | Supernatural enemies |

- **Not in Standard:** any crawl, Death02, or directional hits. They are only in the paid set (see section 5).
- **Root motion:** in the plain files the `root` bone is static. Pelvis motion stays in the clip: Death01 moves 0.46 m back, and the locomotion loops stay in place.

### (b) Bone map: UAL (Unreal mannequin) to the game rigs

Every game rig has **65 joints**, not 52. I checked all 20 GLBs in `optc/`, and `char_nomadf` has 66 because of an extra `neutral_bone`. The names are `mixamorig:*`, which three sanitises to `mixamorigHips` and so on; `boneKey()` strips the prefix. UAL also has 65 joints, and the topology matches one to one.

| UAL | Game (`mixamorig:` +) |
|---|---|
| pelvis | Hips |
| spine_01, spine_02, spine_03 | Spine, Spine1, Spine2 |
| neck_01, Head | Neck, Head |
| clavicle_l, upperarm_l, lowerarm_l, hand_l | LeftShoulder, LeftArm, LeftForeArm, LeftHand |
| thigh_l, calf_l, foot_l, ball_l, ball_leaf_l | LeftUpLeg, LeftLeg, LeftFoot, LeftToeBase, LeftToe_End |
| thumb/index/middle/ring/pinky_0N_l (N = 1 to 3) | LeftHand{Thumb,Index,Middle,Ring,Pinky}N |
| thumb/index/middle/ring/pinky_04_leaf_l | LeftHand{...}4 |
| `_r` versions | Right… |

- **No counterpart:** UAL `root`, which is the ground and root-motion bone above the pelvis, and the game's `HeadTop_End`.
- **Sides agree:** both skeletons face +Z, and UAL `_l` is at +X, the character's left, the same as Tripo `Left`.
- The map is in `tools/bonemap.cjs`.

### (c) Rest poses and whether the chars.js bake can retarget UAL

Measured in world space as three r128 loads the files (`evidence/rest.json`):

| | UAL | Tripo female (library) | Tripo male | Tripo purger |
|---|---|---|---|---|
| Upper arm elevation | 0° (strict T) | −18.4° | −16.5° | +5.0° |
| Thigh direction | straight down | 8.4° outward | 8.6° outward | 6.7° outward |
| Toe yaw (outward) | 0° | 16° | 19° | 18° |
| Spine lean | 6.5° forward | 6.2° back | 4.8° back | 3.3° back |
| Hips height | 0.9167 m (metres) | 0.557 (unit-normalised) | 0.534 | 0.515 |
| Facing / left side | +Z / +X | +Z / +X | +Z / +X | +Z / +X |

The `A_TPose` clip in UAL holds the same strict T-pose as the rest pose.

**Verdict:** yes, the world-space bake can retarget UAL, but the name map alone is not enough. I tested it with the bake code from HEAD reproduced in Node (`tools/bake.cjs`, `evidence/bake_report.json`).

| Path | Mean error | Max error | Hips height |
|---|---|---|---|
| Name map only | 14 to 18° | 33 to 36° | Broken: 9% of normal in idle |
| Name map + the three fixes below | 0.0 to 0.1° | 3.3° | Correct |

The fixes, in order of importance:
1. **Hips translation must be taken in world space.** UAL's `pelvis` is parented under `root`, which is rotated −90° about X (a Z-up armature). Copying the raw `pelvis.position` values, as `bakeClip` does (`v[i] *= C.ratio`), puts Z-up numbers into a Y-up parent, and the character sinks into the floor. Use the source hips' world displacement, scaled by the leg-height ratio, measured from the ground rather than as a raw local length.
2. **A per-bone rest swing.** For each bone, compute the quaternion that rotates the source rest direction (bone to child) onto the target rest direction, and use `srcInv = inverse(swing * srcRest)`. This removes the 18° arm, 8° leg and 16 to 19° toe offsets.
3. **Root motion.** Use the plain file and ignore `root`. Read `_RM` only if you want knockback distances: Hit_Knockback moves 3.0 m and Death01 0.65 m.

No axis or forward correction is needed.

### (d) Trimmed, animation-only GLBs (staged)

I pre-retargeted the clips onto the game's library skeleton: the `anims.glb` female, with `mixamorig:` names and her rest pose. `chars.js` can therefore treat them exactly like its own library clips. The bake is unchanged, and the only new code is loading one more file into `ANIMLIB.raw`.

Each pack has no mesh and no textures. It keeps the skin (65 joints, so three r128 marks them as Bones), the hips translation and the joint rotations. It is meshopt-compressed with QUATERNION/EXPONENTIAL filters, the same toolchain and encoding as `anims.glb` (glTF-Transform 4). The `_lite` variants drop the finger channels, so the fingers hold the character's rest pose.

| File | Clips | GLB bytes | `.glb.txt` bytes |
|---|---|---|---|
| `assets/anim/ual_hits_lite.glb` (**recommended**) | 14 | 158,336 | 211,116 |
| `assets/anim/ual_hits.glb` (with fingers) | 14 | 333,988 | 445,320 |
| `assets/anim/ual_extras_lite.glb` | 10 | 96,248 | 128,332 |
| `assets/anim/ual_extras.glb` | 10 | 201,456 | 268,608 |
| `assets/anim/ual_hits_raw.glb` (uncompressed reference) | 14 | 513,540 | n/a |

- **Hits pack:** Hit_Chest, Hit_Chest_M, Hit_Head, Hit_Head_M, Stagger_Back (from Idle_Shield_Break), Hit_Knockback, Death01, Death01_M, GetUp_Back (from LayToIdle), Limp_R_Loop and Limp_L_Loop (from the zombie walk, plus its mirror), Crouch_Idle_Loop, Crouch_Fwd_Loop, OverhandThrow. The `_M` clips are mirrored left to right for variety.
- **Extras pack:** Pistol_Idle_Loop, Pistol_Shoot, Pistol_Reload, Pistol_Aim_Up/Neutral/Down, Roll, Slide_Start, Slide_Loop, Slide_Exit.
- The clip lists with their sources are in `*.clips.json`, and the licence texts are in `UAL1_License.txt` and `UAL2_License.txt`.

**Verification** (`evidence/verify_*.txt`):
- The Khronos glTF validator reports 0 errors and 0 warnings on all packs.
- They parse with the game's own loaders (three r128 GLTFLoader plus r128 `meshopt_decoder.js`) into 65 Bones and 14 clips. The meshopt decode error is at most 0.005°.
- Run through the **unchanged** v21 bake (library to male and purger), with the LoopOnce fix added, the pose error against the original UAL clip is 8.2 to 8.3° mean and 23.8° max on the male. On the purger it is 10.6 to 10.7° mean and 24° max. That is the same residual v21's own clips have, from the Tripo rest mismatch in finding 3, and the rest swing removes it.
- The mirrored clips match the mirror image of their source with the same residual.
- **Without** the LoopOnce fix, the last frames of Death01, Hit_Knockback and GetUp_Back are the first frame. For example, Death01 ends with the hips at standing height.

**Bake cost** (Node, a desktop CPU with load average about 14 on 4 cores): the 10 v21 library clips take 60 ms per character, and the 14-clip pack adds 14 ms (586 frames). `bakeSoon` already spreads this one clip per 20 ms tick.

**Integration sketch** (not applied; I am read-only):
1. In `animLib()`, after `ANIMLIB.raw = map`, load `assets/ual_hits_lite.glb` through `parseGLBText` and add each clip with `map[c.name.toLowerCase()] = c`.
2. Add `CLIPMAP` entries such as `hitChest: 'hit_chest'`, `hitHead: 'hit_head'`, `stagger: 'stagger_back'`, `knock: 'hit_knockback'`, `dieBack: 'death01'`, `getup: 'getup_back'`, `limp: 'limp_r_loop'`.
3. Add `LoopOnce` and `clampWhenFinished` for the one-shot clips in `makeGLBRig`.
4. Apply the `bakeClip` LoopOnce fix.

For a directional reaction from a hit direction:
- front chest: Hit_Chest or _M
- head: Hit_Head or _M
- heavy hit: Stagger_Back
- shotgun at close range or an explosion: Hit_Knockback, then GetUp_Back or death
- leg hit: switch locomotion to Limp_L or Limp_R for a few seconds

Hits from behind are not covered by any clip, so keep the existing procedural spine pitch for those, with the sign flipped.

## 2. Tencent HY-Motion-1.0 and MoMask

### HY-Motion (`https://tencent-hy-motion-1-0.hf.space`, Gradio 6.14.0, ZeroGPU a10g)

- **Call:** gradio_client 2.7.2 with `token=None` and `HF_HUB_DISABLE_IMPLICIT_TOKEN=1`. No token file exists in this sandbox. Endpoint `/generate_motion_func` with (prompt, prompt, "42", 3.0, 5.0).
- **Result, prompt 1** ("a man is shot in the chest…"): `AppError: You have exceeded your ZeroGPU quota (120s requested vs. 0s left). Try again in 0:00:00. Authenticate with a Hugging Face token for more quota - https://huggingface.co/settings/tokens`. The call returned in 1.2 s. I stopped as instructed and did not try prompts 2 and 3.
- **Why 120 s:** `gradio_app.py:226` has `@spaces.GPU(duration=120)`, so every call asks for 120 s of GPU time.
- **Facts from the public Space source, no login:**
  - The output is a SMPL-H motion converted to FBX by `hymotion/utils/smplh2woodfbx.py`, at `fps=30` and `scale=100` (centimetres).
  - The skeleton is SMPL-H with 52 joints: 22 body joints (Pelvis, L_Hip, L_Knee, L_Ankle, L_Foot, Spine1 to 3, Neck, Head, L_Collar, L_Shoulder, L_Elbow, L_Wrist, and the R_ versions) plus 30 finger joints (`scripts/gradio/static/assets/dump_wooden/joint_names.json`).
  - It is not Mixamo-named, but it maps cleanly: Pelvis to Hips, L_Hip to LeftUpLeg, L_Knee to LeftLeg, L_Ankle to LeftFoot, L_Foot to LeftToeBase, Spine1/2/3 to Spine/Spine1/Spine2, L_Collar to LeftShoulder, L_Shoulder to LeftArm, L_Elbow to LeftForeArm, L_Wrist to LeftHand, and the fingers 1 to 3 to LeftHand*1 to 3.
  - The rig FBX (`assets/wooden_models/boy_Rigging_smplx_tex.fbx`, 16.5 MB) converted with FBX2glTF has all local rotations at identity, so it is a T-pose. It would go through the same rest-swing bake.
  - Running it locally needs 24 to 26 GB of VRAM (model card).
- **Licence:** Tencent HY-Motion 1.0 Community License. It **does not apply in the EU, UK or South Korea**, outputs may not be used outside that Territory, and products with more than 1M MAU need a separate licence. If Joshua is in the UK or EU, HY-Motion output is unusable regardless of the quota.
- **FBX-to-GLB converter that works here:** the npm package `fbx2gltf@0.9.7`, whose bundled `bin/Linux/FBX2glTF` is version 0.9.7.
  - It converted UAL1's Unity FBX (42 clips; it warned that `A_TPose has zero channels`) and the HY-Motion rig FBX.
  - Not tried: pip `bpy` and assimp.

### MoMask (`MeYourHint/MoMask`, Gradio 3.24.1, cpu-basic, MIT code)

- **Call:** raw Gradio 3 queue websocket, `fn_index 3` with (prompt, "4", "IK"). Each call took 7.0 to 8.2 s and returned HTML with a **"BVH Download" link** (`file/./cached/12138/sample_repeat0.bvh`) and an MP4. Both downloaded with HTTP 200, with no login.
  - All three calls returned the same server path, so concurrent users of the Space can overwrite each other's file.
- **BVH:** 22 joints with Mixamo-like names (Hips, LeftUpLeg, LeftLeg, LeftFoot, LeftToe, Spine, Spine1, Spine2, Neck, Head, LeftShoulder, LeftArm, LeftForeArm, LeftHand, and the Right versions), no fingers, **20 fps** (frame time 0.05), 80 frames (3.95 s), metres. The rest pose has the hips at y −0.223, below the ground, so hips height must be measured from the clip's first frame.
- **Retarget:** with three r128's BVHLoader and the fixed bake onto the male rig, the mean error is 0.2 to 0.7°. The only name difference is LeftToe for LeftToeBase. See `evidence/momask_retarget_sheet.png`.
- **Quality on the three prompts:**
  1. Staggers, then dives or flips and **stands back up**; it does not stay down.
  2. Stands still for about 1.7 s, then stumbles forward and recovers; there is no sustained limp.
  3. Walks, then collapses (the hips drop to 0.18 to 0.32 of standing height at 2.8 to 3.4 s), then rises again by 3.95 s.

  Each clip would need hand trimming to be usable.
- **Licence:** the code is MIT, but the model is trained on HumanML3D, which is derived from AMASS and licensed for research only, so the rights to its output are unclear.
- **Files:** `work/momask_dl/p1..p3/*.bvh` and `.mp4`. I did not stage them as usable assets.

## 3. Sound (staged: `assets/sfx/`, 36 files, 374,007 bytes, all CC0)

**Reachable:** kenney.nl (HTTP 200), opengameart.org (200), soundbible.com (200).
**Blocked:** pixabay.com/sound-effects (403); freesound.org (301 redirect, and 403 per the brief); Wikimedia Commons API (`429` on every search, so I did not retry). I did not try Zapsplat or Sonniss.

**Format:** the files match v21's sfx files (mono, 44.1 kHz MP3; v21's are 112 kbps, these are 96 kbps). They use the same `AU.play(name)` loader in `combat.js:268`: add each name to `assets/sfx/index.json`. `manifest.json` gives the source, licence, source segment and use for every file, and `LICENSES.txt` lists every source.

| File(s) | Duration (s) | Source (all CC0) | Use |
|---|---|---|---|
| flesh_hit_1..3 | 0.32 each | Kenney Impact `impactPunch_heavy_00{2,0,4}`, layered with qubodup "Punch" 03/05/01 | Bullet into a body |
| flesh_head_1 | 0.35 | qubodup Punch05 + EZduzziteh `squishsplat_impact` + Kenney punch | Headshot impact |
| gore_splat_1 | 0.44 | Independent.nu "wet squish" `impactsplat07` | Big-gun head pop |
| body_fall_1, body_fall_2 | 0.75 each | Kenney `impactSoft_heavy` + RPG Audio cloth + a second small bounce | Corpse lands |
| hit_tick_1 / hit_tick_2 | 0.02 / 0.04 | Kenney Interface `tick_002` / UI Audio `click4` | Hitmarker |
| kill_thunk | 0.12 | Kenney Interface `bong_001` (low thunk) | Kill confirm (layer it on the tick) |
| headshot_ding | 0.12 | Kenney Interface `glass_002` | Sample alternative to the synth ding |
| kill_chime | 0.29 | Kenney Interface `confirmation_001` | Optional streak chime |
| pain_m_1..8 | 0.51 to 1.28 | thebardofblasphemy, "grunts of male death and pain" (sliced) | Male pain |
| death_m_1..3 | 1.43 to 1.76 | same source (the longer takes) | Male death |
| pain_f_1..7 | 0.45 to 1.22 | Nocturnal_Vanguard, "Female Hurt Grunts & Groans" (sliced) | Female pain |
| heartbeat_slow / heartbeat_fast | 1.80 / 1.12 | bart, "Heartbeat sounds" | Low and critical HP loops |
| heartbeat_single | 1.30 | qubodup, "Heartbeat (single sound)" | Schedule beats from HP. This avoids the MP3 loop gap. |
| breath_tired | 3.17 | mikeask, "Breathing Tired" | Breathing under the heartbeat during regen |
| crack_1, crack_2 | 0.12 / 0.18 | **Generated here** (N-wave plus high-passed noise, `tools/build_sfx.py`) | Supersonic near-miss crack, layered with the existing `whiz_1`/`2` |

- **None of these were auditioned by ear.** I chose them by description and by measured duration, attack, loudness and spectral centroid (`tools/audio_stats.py`). The pain and death slices from the male take were split on silence and assigned by length.
- The MP3 encoder delay adds a small gap if `heartbeat_slow`/`heartbeat_fast` are looped with `AudioBufferSourceNode.loop`. Set `loopStart`/`loopEnd`, or schedule `heartbeat_single` instead.

## 4. Physics (facts only)

- **cannon-es 0.20.0** (the `latest` tag on jsDelivr; MIT; https://github.com/pmndrs/cannon-es):
  - `dist/cannon-es.js` (ESM) is 346,256 B. jsDelivr's auto-minified `cannon-es.min.js` is 139,855 B: **36,736 B with gzip -9, and 37,928 B brotli as jsDelivr actually serves it**.
  - The package ships only ESM and CJS builds; there is no UMD or global build.
  - The CJS build calls `require('perf_hooks')` unconditionally (line 12966), so it fails in a browser without a shim. The ESM build uses `globalThis.performance` and is the browser path.
- **Ragdoll example:** yes. `examples/ragdoll.html` (12,912 B, also at https://pmndrs.github.io/cannon-es/examples/ragdoll) has 11 bodies (box limbs, sphere head) and 10 `ConeTwistConstraint`s, and is Z-up.
- **Running it next to three r128:**
  - It has no dependency on three.
  - The game is concatenated classic scripts, so cannon-es would load as `<script type="module">import * as C from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js'; window.CANNON = C</script>`. jsDelivr npm with an exact version is allowed by the artifact host.
  - Module scripts run deferred, after the classic scripts, so the game must check for `window.CANNON` lazily, at the first ragdoll.
  - Per ragdoll you would build 11 bodies sized from each rig, switch the actor from the animation mixer to physics at death, seed the velocities from the last animation frames plus the bullet impulse, and write the body transforms back into bone local rotations every frame.
  - The city has no physics colliders, so you would add at least a ground plane and static boxes for nearby buildings and cars, or the bodies pass through walls.
- **Verlet alternative:** I benchmarked a hand-rolled verlet ragdoll (14 points, 27 distance sticks, 6 iterations, ground clamp; `tools/ragbench.mjs`). It has no angle limits, no self-collision and no wall collision unless you write them, and it adds no library bytes.

**Benchmark** (Node, contended CPU, steps at 1/60 s, three repeats; noisy):

| Ragdolls | cannon-es (ms/step) | verlet (ms/step) |
|---|---|---|
| 1 | 0.18 to 0.36 (2.0 on a cold start) | 0.013 to 0.017 |
| 4 | 0.8 to 1.7 | 0.04 to 0.07 |
| 8 | 1.7 to 1.9 | 0.08 to 0.14 |
| 16 | 4.6 to 4.9 | 0.19 to 0.42 |

Verlet is roughly 10 to 25 times cheaper per step. Phones are slower than this desktop. Both would map onto bones the same way.

## 5. Not used (need a login, credits or payment): what each would add

- **Mixamo:** needs Joshua's Adobe ID login. It adds a large library with many hit reactions, deaths, stumbles and injured walks. Its bone names are `mixamorig:*`, so they already match `boneKey()`, but they still need the rest swing. Downloads are FBX, and FBX2glTF 0.9.7 works here. Adobe's terms allow use in projects but not redistributing the raw files. I could not read the FAQ: helpx.adobe.com returned 403.
- **Tripo animation presets:** cost credits. The public SDK (`tripo3d` 1.0.0 on PyPI) lists the biped presets as idle, walk, run, dive, climb, jump, slash, shoot, **hurt**, **fall** and turn, retargeted through `POST /v3/animations/retarget`, up to 5 per call. Only hurt and fall concern damage, and the game already has `hit_to_body_01` and `fall`. Whether other names (`defeat_02`, …) are requestable is not documented, and I did not verify it.
- **ElevenLabs sound effects:** needs Joshua's account and API key. It generates sound from a text prompt, 0.1 to 30 s long, as MP3 or 48 kHz WAV, with optional looping, at "40 credits per second when duration is specified" (docs page). The free plan gives 10k credits a month without a commercial licence, which starts at the Starter plan (pricing page, promo price shown $1 for the first month, then $6). It would fill the gaps by ear: flesh hits, cracks, gear rattle, voice efforts.
- **Quaternius UAL Pro / Source:** paid, $9.99 and $14.99. I listed the clip names in the public animation viewer's data pack (`quaternius.com/index.pck`, 8.6 MB, inspected with `strings`). Pro and Source add directional hits (**Hit_Shoulder_L, Hit_Shoulder_R, Hit_Stomach**), **Death02**, a **crawl set** (Crawl_Enter, Crawl_Exit, Crawl_Fwd/Bwd/Left/Right/Idle loops) for a "downed" state, Idle_Tired, Dodge_Left/Right, 8-way jog and crouch, and Turn90. The tags in that pack include wounded, stagger and knockback. Retargeting would be identical to Standard, because the rig is the same.

## Files

- **Staged:** `assets/anim/` (the packs, `.txt` versions, clip lists, licences) and `assets/sfx/` (36 MP3s, `manifest.json`, `LICENSES.txt`).
- **Evidence:** `evidence/ual_retarget_sheet.png`, `evidence/momask_retarget_sheet.png`, `evidence/v21_fall_wrap_bug.png`, `evidence/verify_*.txt`, `evidence/bake_report.json`, `evidence/rest.json`.
- **Tools (re-runnable):** `tools/bake.cjs` (the v21 bake plus fix, mirror and ground options), `tools/build_pack.mjs`, `tools/verify_pack.cjs`, `tools/test_bake.cjs`, `tools/build_sfx.py`, `tools/hy_motion.py`, `tools/momask.py`, `tools/test_bvh.cjs`, `tools/ragbench.mjs`.
- **Downloads:** under `work/` (Kenney zips, OpenGameArt sources, MoMask BVHs, FBX2glTF output).
