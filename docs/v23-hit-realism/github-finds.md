# GitHub finds for Red Night hit realism (2026-10-15)

How these were found: web search restricted to github.com, then each candidate was shallow-cloned (code and docs only) and its license file was read.
Clones live in /tmp/claude-0/-home-user/861f674d-fac1-597f-9be1-0bd1ebab3896/scratchpad/gh/<owner>__<repo>.

## Port (the license allows it; keep the attribution)

### LaurentBerier/ThreeJS_UE_TPS_FPS
- License: MIT, declared in package.json. There is no LICENSE file. Code only: the assets carry other licenses.
- Built on three r127 with Ammo.js.
- Last commit 2026-09-21.

**js/entities/NPC/Ragdoll.js** (669 lines): the death ragdoll.
- A verlet ragdoll built from any SkinnedMesh's skeleton. It keeps the major bones and drops fingers, toes, twist and IK bones. Bones are matched by name, and it works on Mixamo and UE rigs.
- Each joint is a particle. Distance sticks join it to its parent, and a brace stick to its grandparent gives bending stiffness.
- Joint limits work as a min/max span on each A-B-C chain, so limbs can't hyperextend or fold through themselves. Legs get stiffer braces.
- Gravity is -22. The death impulse is given as a velocity, plus an optional spin. The impulse lands on a random hit bone, never the same one twice in a row, so deaths vary.
- Collision: Ammo sphere-sweeps when a physics world is passed, otherwise a flat groundY. For Red Night, swap in a groundY floor plus our box colliders (core.js boxesNearN).
- Settings: iterations 12, substeps 2, damping .985.

**js/entities/Common/HurtFlinch.js** (141 lines): the additive hit flinch.
- An upper-body spring layered after the mixer pose. It finds the spine, neck and head bones by name.
- A hit recoils away from the shooter: shot from the front leans back, from behind pitches forward, and it twists to the struck side.
- Strength is clamp(.7 + dmg/5, .35, 2.2). Repeated hits add to the current velocity, so sustained fire builds into a stagger.
- Spring: k 210, damping 17, a single overshoot, settles in about 0.4 s. Max pitch 22°, max yaw 16°.

**js/entities/NPC/UeSoldierCollision.js**: per-bone hit spheres (radius in m):
- head .13, spine_03 .19, spine_01 .20, pelvis .17
- upperarm .09, lowerarm .08, thigh .12, calf .10

**js/entities/Common/BloodDecals.js**: two blood paths.
- A cheap path: a flat blood card that rides the exact hit bone.
- A costly path: DecalGeometry projected onto a baked local patch of the skinned mesh. That patch is capped at 700 tris; projecting onto the full body costs about 90 ms.

**UeSoldierController.js**: a suppression pin.
- Being shot pins the soldier in place for a beat, refreshed on each hit.
- It remembers who shot it (provokedBy) and pushes toward that shooter.

### blugart-dev/kickback (MIT, Godot 4.7, last commit 2026-09-12)
Euphoria-style hit reactions for Mixamo rigs. We borrow its tuning and design, since Godot code won't run here.

Impact profiles, from addons/kickback/resources/impact_profile.gd:

| Weapon | Impulse | Transfer | Up | Ragdoll chance | Strength cut | Recovery |
|---|---|---|---|---|---|---|
| Bullet | 8 | .15 | 0 | .05 | .85 | .4 |
| Shotgun | 20 | .40 | .05 | .40 | .92 | .25 |
| Explosion | 40 | 1.0 | .40 | .95 | 1.0 | .15 |

It also has:
- pain escalation;
- per-limb injuries (0-1) that weaken that limb's strength;
- a stagger sway that decays.

### Vaei/ProcHitReact (MIT, Unreal 5)
Design rules only:
- overlapping hits blend without snapping;
- the arms can be excluded so aim holds;
- the pelvis is blacklisted so the whole body doesn't go limp;
- a per-hit cooldown.

### lbcrv/boneyard (MIT, three.js + cannon-es from a CDN, no build step)
A full active ragdoll:
- 16 bodies, 15 joint servos, balance and a foot planner;
- protective hands before landing, and it gets up again;
- a broken limb loses its muscle and hangs.

Thresholds: a hit above 3 m/s unbalances it; above 7.5 m/s it falls. That's too heavy for a phone crowd. Borrow the thresholds and the idea that a leg wound makes a limp.

### Other permissive finds
- **Mugen87/dive** (MIT, three.js + Yuka, last commit 2022): shooter bot AI with goals, memory, perception and fuzzy weapon choice. A reference for faction AI.
- **irademos/qwop-tps** src/combat/bloodEffect.js (ISC, 147 lines): InstancedMesh droplets that fall, flatten into ground splats and fade, with at most 24 bursts.
- **mattvb91/rapierjs-ragdoll** (MIT per its README): the Rapier original that LaurentBerier's ragdoll credits. Heavier, because Rapier is WASM.

## Ideas only (no license or proprietary, so don't copy code)
- **nearbycoder/PainKiller** (no license; three r180 + Rapier):
  - death hands the current animated pose to the ragdoll;
  - stakes pin corpses to walls;
  - directional hit reactions are built as procedural layers.
- **APPARANYX/grasstex** (proprietary, all rights reserved):
  - Wound decals anchored to the nearest skinned vertex. Bone-parented decals drifted (a leg wound showed at the hip).
  - Near-miss cracks, ricochets, flesh hits and pain sounds.
- **JoshuaLRay/Sandline** (no license): a hit reaction must never accumulate. A second hit sets a new peak, and bones are restored exactly when it ends.
- **chrisbuczek/threejs-multiplayer-fps** (no license): inspired by MW2019. Limb x.85 and falloff to x.75 minimum, about what Red Night already has.

## Tools for Joshua
- **YasinSHV/Mixamo-Bulk-Downloader** (MIT): a console script with resume and retry, and FPS, skin and keyframe options. It downloads EVERYTHING, with no search filter. Write a filtered version for: hit reactions, deaths, dying, stagger, injured walk, wounded crawl.

## Skip or caution
- **HY-Motion (Tencent license):**
  - The territory excludes the EU, UK and South Korea, and the license forbids using or displaying Output outside the territory. A worldwide web game would breach that.
  - Products over 1M monthly active users need a separate license.
  - Prototype with it only.
- **LAFAN1** (CC BY-NC-ND) and the **Bandai Namco dataset** (CC BY-NC): non-commercial only.
- **PanderMusubi/sound-effects-library-weapons** (CC0): just a wrapper for Still North Media's gunshot packs on MediaFire (2015). No flesh impacts or flybys.
- **CoD damage tables:** none on GitHub; R1 gets them from data sites.
- **js-ballistics** (ISC, WASM): overkill. Plain gravity drop plus travel time is enough.
