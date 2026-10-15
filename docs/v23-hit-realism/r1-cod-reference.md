# R1: "Call of Duty level" hit and damage feel, a sourced spec for Red Night

Author: R1 research agent, 15 Oct 2026. Read-only on `/home/user/red_night` (only `git show HEAD:` reads).
Everything here is sourced: either a URL or a local measurement in
`/tmp/claude-0/-home-user/861f674d-fac1-597f-9be1-0bd1ebab3896/scratchpad/combat-research/bench/bench.mjs`.
Section 9 lists what I could not verify.

Game abbreviations: **CoD4** (2007), **MW3-11** (Modern Warfare 3, 2011, IW5 engine), **BO1** (Black Ops, 2010),
**MW19** (Modern Warfare 2019), **MWII** (2022), **MWIII** (2023), **BOCW** (Cold War), **BO6** (Black Ops 6, 2024),
**WZ** (Warzone 2020), **WZ2** (Warzone 2.0).

### What kind of source each number comes from

1. **Official patch notes** (callofduty.com). These give exact damage, multiplier and regen numbers for MWIII and BO6.
2. **Engine scripts.** CoD's AI pain and death logic and its health and overlay logic live in GSC script files that are public.
   - Stock CoD4 MP scripts: [volkv/CoD4-Default-GSC-Scripts](https://github.com/volkv/CoD4-Default-GSC-Scripts).
   - Decompiled MW3-11 (IW5) scripts: [plutoniummod/iw5-scripts](https://github.com/plutoniummod/iw5-scripts), "Decompiled by gsc-tool".
   - BO1 (T5) SP scripts with developer comments: [plutoniummod/t5-scripts](https://github.com/plutoniummod/t5-scripts).

   These are the closest public look at how Infinity Ward and Treyarch actually wire hit reactions. The IW engine began as
   id Tech 3 ([Wikipedia: IW engine](https://en.wikipedia.org/wiki/IW_(game_engine))), and MW19, MWII and MWIII run on
   rebuilt versions of the same engine. The AI rules below are dated 2010–2011, but they are real, shipped CoD code.
   IW units are inches: the CoD wiki gives the MW19 M4A1 range as "1000–1800 inches (25.5–45.75 m)"
   ([wiki](https://callofduty.fandom.com/wiki/M4A1)).
3. **Community data** (CoD wiki via its API, CODMunity, TrueGameData through press). This is marked as such where used.
4. **Developer talks and papers** (GDC Vault, SIGGRAPH, Activision blog, A Sound Effect interviews).

---

## 0. Bottom line

The biggest gap is the **NPC side**. Today a hit does three things:
- adds `flinch += .5`;
- plays one generic `hit_to_body_01` clip;
- on death, always plays `fall`.

CoD's own engine code layers several things on every hit:
- a **location × direction additive pose**, weighted by damage (BO1);
- a separate **"pain" interrupt** behind thresholds and cooldowns;
- **wounded "long deaths"**: crawling, firing a pistol from your back;
- **death animations picked by hit zone and direction**, which then **hand off to ragdoll at 35 % of the clip** with an impulse
  along the bullet;
- **corpses that respond to extra damage**.

All of this can be built on a phone with no physics engine and no new animation clips:
- **spring-driven additive bone offsets** cost 0.044 ms per frame for 30 NPCs, measured;
- a **Jakobsen/Hitman-style Verlet ragdoll** costs about 12 µs per body per step, measured, with a cap of 4–6 live bodies.

On the player side, the cheapest high-impact items are:
- a Quake-3-lineage **view kick on damage** (100 ms out, 400 ms back);
- the **IW campaign low-health stack**: hit blur, splatter alpha curve, breathing;
- **tiered hitmarkers and sounds**: headshot ping, kill, armor, armor break;
- **near-miss whiz and crack**.

**Ruled out:**
- cannon-es ragdolls: 0.75 ms per step for 4 bodies on this server, so about 3–4.5 ms on a phone;
- `DecalGeometry` on characters: 4–69 ms per decal;
- Euphoria-style active ragdoll: DReCon costs 340 µs per character in native C++;
- baking extra clips per character: about 200 ms per clip per character.

## 1. Ranked features: impact on feel against phone cost

Impact is on a 1–10 scale. Cost is the phone cost class from section 7.

| # | Feature | CoD reference | Gap in Red Night v21 | Technique | Phone cost | Impact |
|---|---|---|---|---|---|---|
| 1 | Hit reaction by zone and direction, weighted by damage | BO1 `PlayHitAnimation`: 4 zones × 4 directions, weight `min(1,(dmg+50)/250)`, in 0.05 s, out 0.2 s ([BO1 pain.gsc](https://github.com/plutoniummod/t5-scripts/blob/main/SP/Common/animscripts/pain.gsc)) | one generic clip when flinch > .45 | Critically damped and underdamped springs on Spine/Spine1/Spine2/Neck/Head, the arms and the hit leg, applied as world-axis rotations after `mixer.update` | low (0.044 ms / 30 NPCs) | 10 |
| 2 | Death animation handed to ragdoll, with impulse along the bullet | CoD4 MP and IW5: ragdoll at the `start_ragdoll` notetrack or at **35 %** of the clip; IW5 impulse = 10×max(dmg,300) with dir.z ≥ 0.3; BO1 impulse scaled by weapon class, halved for headshots | always `fall`; `fallDir` barely used | 15-particle Verlet ragdoll seeded from the current animated pose; up to 4–6 live; freeze after about 3 s | low–medium (≈12 µs/body/step) | 9 |
| 3 | Tiered hitmarkers and sounds | CoD4/IW5 hitmarker shader 24×48, fades over 1 s; armor variant; headshot "ping" since CoD4; Warzone blue armor marker and a separate plate-break sound | headshot scale and ding only | Marker types normal, head, kill, armor, armor-break; audio sprites | low | 8 |
| 4 | View kick and flinch when the player is shot | Q3 `CG_DamageFeedback`: kick 5–10°, scaled by 40/health, 100 ms deflect + 400 ms return; MWIII per-weapon "target flinch" 0.5–1.7 N; BOCW gun stays on target | camera shake only, no aim flinch | Pitch and roll kick from the hit direction, scaled by damage and current hp; ADS ×0.5 | low | 8 |
| 5 | Low-health stack | IW5 SP: 3 px blur on every hit (fades 0.8 s); splatter alpha = 1.2·(1−hp)²; breathing loop below the cutoff; exhale on recovery; MW19 MP greyscale **removed** because it hid enemies | red flash only | Vignette/splatter on the existing post pass; breathing and heartbeat; low-pass on the SFX bus; **no greyscale (night game)** | low | 7 |
| 6 | Damage model retune | MWIII/BO6 zones head/neck/upper torso/lower torso/upper and lower arm/hand/upper and lower leg/foot; step falloff; regen 3 s delay, 75 hp/s | 3 zones (head/body/limb), limb .88 (hitscan) vs .85 (projectile) | Per-class multiplier tables and step falloff (data-only) | low | 7 |
| 7 | Wounded "long death" (crawl, fire a pistol from the back) | IW5 `dying_crawl`/`back_fire`: leg hit and hp < 40 %, cooldowns 3 s / 7–13 s, never within 175 in (4.4 m) of the player, 4–20 s on the back | none | State in `ai.js`; needs crawl and back-idle poses (no such clip in `anims.glb`) | medium | 7 |
| 8 | Near-miss whiz and crack, plus player suppression | MW19 whizbys timed to the projectile's approach; PUBG: whiz radius > crack radius, no crack when subsonic | none | Closest point of each enemy round to the camera; audio when inside the radius | low | 6 |
| 9 | Exit spray on the wall behind, blood pool, caliber-scaled mist | CoD wiki: headshot blood lands on objects **behind** the victim; IW5 blood pool 2 s after death only on flat ground (normal.z > 0.9) | burst plus a floor decal | Continue the ray 2–3 m and call `surfDecal(...,'blood')`; mist size by `w.dmg` | low | 6 |
| 10 | Armored faction | WZ plates 3×50; BOCW armor absorbs 60 %, 150 hp, 40 % overflow; BO1 juggernaut gets additive pain only until 30 % hp; IW5 `damageshield` | none | `armor` pool; blue marker; plate-break sound and icon; suppress pain | low | 6 |
| 11 | Corpse reacts to more hits | BO1 `death_anim_short_circuit`: after 0.3 s, extra damage > 100 aborts the death clip and ragdolls at once | none | Verlet impulse on the corpse at the hit particle | low | 5 |
| 12 | Big-gun "flying" deaths | IW5: shotgun within 512 in (13 m), sniper with dmg > maxHealth, or dmg > 500 picks special deaths | none | Larger Verlet impulse | low | 5 |
| 13 | Gibs (shotgun at close range, explosives) | BO1 shotgun gib chance 100 % < 110 in, 75 % < 200, 50 % < 270, ~25 % < 330 | big-gun head pop only | Bone scale 0.001 plus chunk particles | medium | 5 |
| 14 | Last-chance invulnerability | IW5 SP: on a heavy hit 0.5–1.0 s invulnerable (Regular), `player_deathInvulnerableTime` 2500 ms | none | Timer in `damagePlayer` | low | 5 |
| 15 | cannon-es ragdolls | — | — | rejected: 0.75 ms/step for 4 bodies here, ×4–6 on a phone, 36.7 KB gz, ESM only | high | (8) |
| 16 | Active ragdoll (Euphoria, DReCon) | DReCon 340 µs/char native | — | rejected | high | (9) |
| 17 | Projected blood decals on bodies (`DecalGeometry`) | — | — | rejected: 4.4–69 ms per decal | high | (4) |

---

## 2. (a) Damage model

### 2.1 Health pools

| Game | MP health | Notes | Source |
|---|---|---|---|
| CoD4 → MW3-11 | 100 | Hardcore 30 hp with no regen; Old School 200 | [CoD wiki Health](https://callofduty.fandom.com/wiki/Health) |
| MW19 | 100 | WZ: +150 armor (3 plates × 50) = 250 | [wiki Health](https://callofduty.fandom.com/wiki/Health) |
| BOCW, BO4 | 150 | | [wiki Health](https://callofduty.fandom.com/wiki/Health) |
| MWII | 100 | "In Modern Warfare 2, operators had 100 health" | [Dexerto](https://www.dexerto.com/call-of-duty/black-ops-6-devs-confirms-faster-time-to-kill-speed-than-mw3-and-black-ops-cold-war-2880526/) |
| WZ2 Season 4 | 150 base, 300 with full plates | "Regen Delay increased to 7 seconds, up from 5" | [WZ2 S4 notes (Gfinity copy)](https://www.gfinityesports.com/article/warzone-2-season-4-patch-notes) |
| MWIII | 150 | "Core Multiplayer health is being increased to 150 points" | [GamingTrend, COD Next](https://gamingtrend.com/news/what-multiplayer-looks-like-in-call-of-duty-modern-warfare-iii-straight-from-call-of-duty-next/) |
| BO6 | 100 | "operator health has been reduced from 150 in MW3 to 100" (Treyarch at COD Next) | [Dexerto](https://www.dexerto.com/call-of-duty/black-ops-6-devs-confirms-faster-time-to-kill-speed-than-mw3-and-black-ops-cold-war-2880526/) |
| MW3-11 campaign (IW5) | Recruit 475 / Regular 275 / Hardened 165 / Veteran 115 | `playerDifficultyHealth` | [IW5 _gameskill.gsc](https://github.com/plutoniummod/iw5-scripts/blob/master/maps/_gameskill.gsc) |

**For Red Night:** this is a single-player game against crowds, so the IW campaign model fits better than MP. Use a
larger health pool plus the short invulnerability windows in section 3.5, rather than raw MP numbers.

### 2.2 Hitbox zones and multipliers

The zone set is head, neck, upper torso, lower torso, upper arm, lower arm, hand, upper leg, lower leg, foot. MWIII and BO6
patch notes tune each of these separately. Examples, with each row's source:

| Game, weapon (class) | Head | Neck | Upper torso | Lower torso | Arms | Legs | Source |
|---|---|---|---|---|---|---|---|
| CoD4/MW2/MW3-11, AR/SMG/LMG/pistol | 1.4 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | [wiki Damage Multiplier](https://callofduty.fandom.com/wiki/Damage_Multiplier) |
| CoD4–MW3-11, shotguns | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | same |
| CoD4 R700/Barrett (sniper) | 1.5 | 1.5 | 1.5 | 1.1 | 1.0 | 1.0 | same |
| MW19 M4A1 (AR) | 1.6 | — | 1.15 ("torso") | 1.15 | — | — | [wiki M4A1, MW section](https://callofduty.fandom.com/wiki/M4A1) |
| MWII-era M13C in MWIII (AR) | — | — | — | — | — | 0.88 → 1.0 | [MWIII S3 notes](https://www.callofduty.com/patchnotes/2024/04/call-of-duty-modern-warfare-iii-season-3-patch-notes) |
| MWIII TAQ Evolvere 7.62 (LMG) | 1.2 → 1.4 | 1.0 → 1.2 (later 1.4 → 1.2) | 1.0 → 1.2 | — | 1.0 → 1.2 (upper and lower arm) | — | [MWIII S2 notes](https://www.callofduty.com/patchnotes/2024/02/call-of-duty-modern-warfare-iii-season-2-patch-notes), [S3](https://www.callofduty.com/patchnotes/2024/04/call-of-duty-modern-warfare-iii-season-3-patch-notes) |
| MWIII BAS-B JAK Outlaw (battle rifle) | — | — | 2.0 → 1.4 | 1.0 → 1.1 | 1.6 → 1.1 | — | [MWIII S2](https://www.callofduty.com/patchnotes/2024/02/call-of-duty-modern-warfare-iii-season-2-patch-notes) |
| MWIII MCW (AR) | 1.3 → 1.1 | — | — | — | — | — | [MWIII S3](https://www.callofduty.com/patchnotes/2024/04/call-of-duty-modern-warfare-iii-season-3-patch-notes) |
| MWIII SO-14 full-auto (battle rifle) | — | — | 0.8 → 0.74 (torso) | 0.8 → 0.74 | 0.8 → 0.74 | 0.8 → 0.74 | same |
| MWIII Haymaker .410 slug (shotgun) | — | 0.6 → 1.1 | 0.6 → 1.1 | 0.6 → 1.0 | 0.6 → 0.8 | 0.5 → 0.8 | same |
| BO6 XM4 (AR) | 1.3 (CHF barrel 1.48 → 1.42) | | | | | | [BO6 preseason notes](https://www.callofduty.com/patchnotes/2024/10/bo6-preseason-patch-notes), [wiki XM4](https://callofduty.fandom.com/wiki/XM4) |
| BO6 AK-74 (AR) | 1.3 → 1.15 | | | | | | [BO6 preseason](https://www.callofduty.com/patchnotes/2024/10/bo6-preseason-patch-notes) |
| BO6 Marine SP (shotgun) | 1 | 1 | 1 | 1 | 1 | 0.8 | [wiki Marine SP](https://callofduty.fandom.com/wiki/Marine_SP) |

How the zones relate in practice:
- **MWIII** often gives the arms, chest and lower torso the **same** profile, a "gigantic chest hitbox". Head and neck
  hitboxes are "significantly bigger" than in MWII (TrueGameData via [GGRecon](https://ggrecon.com/articles/cod-pro-explains-why-you-die-instantly-in-mw3-despite-ttk)).
- **MWII** patch notes changed multipliers without giving numbers ([MP1st, 24 July 2023](https://mp1st.com/news/cod-modern-warfare-2-and-warzone-update-for-july-24-brings-weapon-changes-and-more)).

**Recommended Red Night table.** These are design values distilled from the rows above, not copied from one weapon:

| Class | Head | Neck | Upper torso | Lower torso | Upper arm | Lower arm/hand | Upper leg | Lower leg/foot |
|---|---|---|---|---|---|---|---|---|
| Pistol / SMG | 1.3 | 1.15 | 1.0 | 1.0 | 1.0 | 0.9 | 0.9 | 0.88 |
| AR / LMG | 1.4 | 1.2 | 1.1 | 1.0 | 1.0 | 0.9 | 0.9 | 0.88 |
| Marksman / sniper | 2.0+ (one-shot kill) | 1.5 | 1.5 | 1.1 | 1.0 | 1.0 | 1.0 | 0.9 |
| Shotgun pellet | 1.0–1.2 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 0.8 | 0.8 |

Zones can come from the hit point's height on the capsule (head, neck, chest, belly, thigh, shin) plus left/right of the
spine plane for arms. Red Night already resolves `head`/`limb`, so this is a lookup change.

> v21 inconsistency, noted in passing: `player.js:461` uses limb ×0.88, but `actors.js:538` (projectiles) uses ×0.85.

### 2.3 Range falloff is a step function, not a ramp

Official BO6 preseason values ([notes](https://www.callofduty.com/patchnotes/2024/10/bo6-preseason-patch-notes)):
- **XM4:** 21 (0–16.5 m) / 20 (16.6–40.6 m) / 17 (> 40.6 m).
- **AK-74:** 27 (0–38.1 m) / 22 (> 38.1 m). Its medium step was removed, leaving two steps.
- **C9 (SMG):** 29 (0–13.3 m) / 23 (–16.5 m) / 19 (–30.5 m) / 16 (> 30.5 m).
- **KSV:** 26 / 21 / 15 / 13 at 10.8 / 15.9 / 29.2 m.
- **MWIII .410 slug:** near-medium 90 to 15.2 m, medium 74 to 29.2 m, minimum 70
  ([MWIII S3](https://www.callofduty.com/patchnotes/2024/04/call-of-duty-modern-warfare-iii-season-3-patch-notes)).

**Shape rule:** ARs lose 15–20 % across 2–3 steps. SMGs lose 45 % across 4 steps, with the first drop at 10–13 m.
`dmgAt(st, dist)` should return the step values, so the player can count shots to kill.

### 2.4 Typical TTK

These are fastest-to-slowest ranges per class for 100 hp, from [CODMunity BO6, Season 6 snapshot of 16/10/2025](https://codmunity.gg/ttk/bo6):

| Class (BO6) | 0–10 m | 10–40 m | 40–80 m |
|---|---|---|---|
| AR (14 guns) | 200–364 ms | 203–388 ms | 321–521 ms |
| SMG (11 guns) | 220–300 ms | 330–394 ms | 478–601 ms |
| LMG (5 guns) | 225–264 ms | 225–264 ms | 287–415 ms |

Values I computed from the cited stats:
- **MW19 M4A1:** 28 × 1.15 = 32.2 per chest hit, so 4 shots. At 809 RPM that is 3 × 74.2 ms = **222 ms**
  ([wiki](https://callofduty.fandom.com/wiki/M4A1)).
- **BO6 XM4:** 21 damage, 800 RPM, 5 shots = **300 ms** ([BO6 notes](https://www.callofduty.com/patchnotes/2024/10/bo6-preseason-patch-notes), [wiki](https://callofduty.fandom.com/wiki/XM4)).
- **MWIII TAQ Evolvere 7.62:** 40 × 1.2 upper body against 150 hp needs 4 shots. At 500 RPM that is **360 ms**
  ([S2](https://www.callofduty.com/patchnotes/2024/02/call-of-duty-modern-warfare-iii-season-2-patch-notes)).

**Takeaway:** CoD sits at 200–400 ms close-range TTK. Gunfights end in 3–6 hits, so each hit's feedback has to land
within about 50 ms.

### 2.5 Shotgun pellets

- **BO6 Marine SP:** 8 pellets of 60/34/25/17 per step; legs 0.8 ([wiki](https://callofduty.fandom.com/wiki/Marine_SP)).
- **MWIII Haymaker:** 8 × 21/17/15/13 at 3/7/11/32 m; head 1.2; one-shot kill within 3 m only if every pellet hits
  ([wiki](https://callofduty.fandom.com/wiki/Haymaker)).
- **MWII Lockwood 300:** 9 × 25, "No multipliers in effect" ([wiki](https://callofduty.fandom.com/wiki/Lockwood_300)).
- **Older games:** shotguns had no multipliers at all ([wiki](https://callofduty.fandom.com/wiki/Damage_Multiplier)).
- **Range:** "shotgun hitscans disappear after passing a certain distance" ([wiki Hitscan](https://callofduty.fandom.com/wiki/Hitscan)).

**Model:** N independent rays, each running through the zone table (mostly 1.0), with per-pellet step falloff and a hard
maximum range.

### 2.6 Penetration

- The CoD wiki says damage lost through cover depends on material type, thickness, angle of incidence and the weapon's
  penetration class; FMJ or Deep Impact reduces the loss ([wiki Penetration](https://callofduty.fandom.com/wiki/Penetration)).
- MWIII also penetrates *through enemy operators*: "Improved consistency of penetration damage through enemy Operators"
  ([MWIII S3](https://www.callofduty.com/patchnotes/2024/04/call-of-duty-modern-warfare-iii-season-3-patch-notes)).
- BO6 map notes tune penetrability per prop: dish panels, doubled-up panels ([BO6 preseason](https://www.callofduty.com/patchnotes/2024/10/bo6-preseason-patch-notes)).
- I found **no published per-material damage numbers** for MW19 to BO6.

Red Night already has per-class thin-cover penetration. The missing piece is **through-body** penetration, which matters
for v22 crowds: a body hit continues with reduced damage and can hit the NPC behind.

### 2.7 Armor, as a model for an armored faction

- **WZ/WZ2:** "an extra 150 health" as plates; spawn with 2 ([wiki Armor Plates](https://callofduty.fandom.com/wiki/Armor_Plates)).
- **Warzone feedback:**
  - "the hitmarker sound is different when you're hitting armor vs. when it's been depleted" (Tim Stasica,
    [A Sound Effect](https://www.asoundeffect.com/call-of-duty-warzone-sound));
  - armor hits use blue hitmarkers, and a broken-armor icon plus an audio cue mark the break
    ([CharlieIntel](https://www.charlieintel.com/call-of-duty-warzone/warzone-2-devs-finally-remove-atrocious-armor-break-feature-in-season-2-reloaded-236477/)).
- **BOCW armor scorestreak:** absorbs **60 %** of bullet damage, has **150** hp, and passes **40 %** of overflow damage
  ([wiki](https://callofduty.fandom.com/wiki/Armor_Plates)).
- **MW3-11 Ballistic Vest:** absorbs 50 damage, and the last shot on the vest can absorb 50 more
  ([wiki Health](https://callofduty.fandom.com/wiki/Health)).
- **BO1 juggernaut-type AI:** `additive_pain_think` turns off full pain and plays only 0.4 s **additive** flinches. Regular
  pain comes back once hp < **30 %** of the starting hp ([BO1 pain.gsc](https://github.com/plutoniummod/t5-scripts/blob/main/SP/Common/animscripts/pain.gsc)).
- **IW5 `damageshield` AI:** never long-deaths. It plays an "extended pain" only every 2–3 hits within 1.5 s, and never
  when the attacker is within 512 in (13 m) ([IW5 pain.gsc](https://github.com/plutoniummod/iw5-scripts/blob/master/animscripts/pain.gsc)).

**Armored faction spec:**
- **Damage:** `armor` = 150 in 3 plates of 50. While armor holds, bullets to torso, arms and legs deal 40 % to hp; the head
  is unarmored.
- **Hitmarkers:** blue while armor holds; a plate-break icon and sound on each break.
- **Reactions:** additive flinches only while armor > 0. Full pain and long deaths unlock after the last plate breaks.

### 2.8 Health regeneration

| Game | Delay | Rate / behaviour | Source |
|---|---|---|---|
| CoD4 MP | 5 s | above 55 %: snap to full; at or below 55 %: +10 % of max every 0.05 s (+3 s extra hold) | [CoD4 _healthoverlay.gsc](https://github.com/volkv/CoD4-Default-GSC-Scripts/blob/master/maps/mp/gametypes/_healthoverlay.gsc), [wiki](https://callofduty.fandom.com/wiki/Health) |
| MW3-11 MP | 5 s | 1 hp per 0.05 s (20 hp/s) | [wiki Health](https://callofduty.fandom.com/wiki/Health) |
| MW3-11 campaign (IW5) | 4000 ms (Regular), 1200 ms (Veteran) | `longRegenTime` 5000 ms; rate 0.02 of max per 0.05 s tick | [IW5 _gameskill.gsc](https://github.com/plutoniummod/iw5-scripts/blob/master/maps/_gameskill.gsc) |
| MW19 MP | ~6 s | ~1.4 s more to full | [Upcomer](https://upcomer.com/is-the-quickfix-perk-worth-running-in-modern-warfare/) (search snippet; fetch returned 403) |
| WZ2 S4 | 5 → 7 s | — | [WZ2 S4](https://www.gfinityesports.com/article/warzone-2-season-4-patch-notes) |
| **MWIII** S2 | **4 → 3 s** | **40 → 75 hp/s**; "~5s to heal from 1 to 150" | [official MWIII S2](https://www.callofduty.com/patchnotes/2024/02/call-of-duty-modern-warfare-iii-season-2-patch-notes) |
| BO6 | ~3.5 s (fan guide) | ~40 hp/s (fan guide) | [mmoexp guide](https://www.mmoexp.com/News/health-regeneration-guide-in-call-of-duty-black-ops-6.html), low confidence |

**For Red Night:** keep the 4 s delay (a 3 s delay suits faster play), then regenerate at **75 hp/s per 150 max**, which is
about 50 % of max per second.

---

## 3. (b) Player-side feedback

### 3.1 Hitmarkers and hit sounds

- **CoD4 MP hitmarker:** a `damage_feedback` shader at **24×48** units on the 640×480 virtual HUD, centred, alpha 1 fading
  over **1.0 s**, sound `MP_hit_alert`. A separate shader, `damage_feedback_j`, marks a hit on body armor
  ([CoD4 _damagefeedback.gsc](https://github.com/volkv/CoD4-Default-GSC-Scripts/blob/master/maps/mp/gametypes/_damagefeedback.gsc)).
- **IW5 SP hitmarker:** the same 24×48 shader, `SP_hit_alert`, fading over 1 s by default. It is suppressed for team,
  neutral or god-mode targets and for bullet damage at or below a per-target threshold
  ([IW5 _damagefeedback.gsc](https://github.com/plutoniummod/iw5-scripts/blob/master/maps/_damagefeedback.gsc)).
- **Headshot sound:** "A sound of a bullet 'ping' can be heard immediately after a headshot ... in CoD4 and all games after"
  ([wiki Headshot](https://callofduty.fandom.com/wiki/Headshot)).
  - BO1 plays `prj_bullet_impact_headshot_helmet_nodie` when the helmet is hit and the target survives
    ([BO1 pain.gsc](https://github.com/plutoniummod/t5-scripts/blob/main/SP/Common/animscripts/pain.gsc)).
  - BO1 MP gives a headshot sound even on a non-kill ([wiki Headshot](https://callofduty.fandom.com/wiki/Headshot)).
- **Armor:** a separate armor-hit sound, a separate armor-depleted sound, blue markers and a break icon (section 2.7 sources).
- **Settings:** MWII and BO6 expose a "Hit Marker Sound Effects" setting and Classic/MW presets
  ([Dexerto BO6 audio](https://www.dexerto.com/call-of-duty/best-audio-settings-black-ops-6-2885702),
  [Gameranx MWII](https://gameranx.com/features/id/426576/article/call-of-duty-modern-warfare-2-how-to-get-classic-hit-marker-sounds/)).
- **Kill hitmarker colour (red X) in MW19 and later: not verified.** No source found.

**Spec for `ui.js hitMarker`:**
- normal: white, 1.0 s fade, `hit_alert`;
- head: same marker scaled ×1.25, plus a short metallic "ping" layered on the hit sound;
- kill: a heavier body thump; colour it red (common practice, not verified for MW19 and later);
- armor: blue marker and a duller "plate" tick;
- armor break: a break icon and a crack sound.

Fade starts at full alpha right away. The marker scales slightly with damage.

### 3.2 View kick when hit, and the damage direction (Quake 3 lineage)

From Quake III, the ancestor of the IW engine ([cg_playerstate.c](https://github.com/id-Software/Quake-III-Arena/blob/master/code/cgame/cg_playerstate.c),
[cg_local.h](https://github.com/id-Software/Quake-III-Arena/blob/master/code/cgame/cg_local.h)):
- `scale = health<40 ? 1 : 40/health`
- `kick = clamp(damage*scale, 5, 10)` degrees
- `v_dmg_pitch = -kick*front`, `v_dmg_roll = kick*left`, using the attacker direction projected on the view axes
- the kick ramps in over `DAMAGE_DEFLECT_TIME` = **100 ms** and returns over `DAMAGE_RETURN_TIME` = **400 ms**
- the damage-direction marker uses `damageX = -left/front` and `damageY = up/dist`, each clamped to ±1

**In other words, low health kicks harder.**

I could not confirm CoD's own defaults for its `bg_viewKick*` dvars. `bg_viewKickMax` is said to switch off damage kick when
set to 0 ([iw3sp_mod issue](https://gitea.com/JerryALT/iw3sp_mod/issues/15)).

### 3.3 Flinch (aim punch when shot)

- **MWIII** exposes flinch per weapon in Newtons: "target flinch" is what you inflict, "incoming flinch" is what you receive.
  - Longbow target 0.8 → **1.7 N**, incoming 0.75 → 1.0 N.
  - TAQ Evolvere 7.62 target 0.5 → 0.8 N.
  - JAK Outlaw target 0.9 → 1 N, incoming 0.17 → 0.23 N.
  - Sources: [S2](https://www.callofduty.com/patchnotes/2024/02/call-of-duty-modern-warfare-iii-season-2-patch-notes).
  - Attachments add a "flinch resistance benefit/penalty"; WSP Swarm flinch resistance 0.8 → 0.15 N ([S3](https://www.callofduty.com/patchnotes/2024/04/call-of-duty-modern-warfare-iii-season-3-patch-notes)).
- **MW3-11** Focus proficiency: −50 % flinch ([wiki Focus](https://callofduty.fandom.com/wiki/Focus)).
- **BOCW** (Treyarch designer Tony Flame, 12 Sept 2020): flinch is "more so a feedback mechanism", "without affecting the
  aim position of your weapon"; the gun "will move with your screen to stay on target"
  ([CharlieIntel](https://www.charlieintel.com/black-ops-cold-war/flinch-system-redesigned-to-not-effect-aim-in-black-ops-cold-war-62427/)).

**For Red Night**, where touch aim is hard:
- Use the BOCW model for ADS: camera kick only, crosshair stays on target.
- When hip-firing, add a small real aim offset (≤ 1.5° at 40 damage, decaying over 300 ms).
- Scale by damage and the weapon's `targetFlinch` (0.5–1.7), and halve it while ADS.

### 3.4 Low-health stack: IW campaign code, `_gameskill.gsc`

Everything in this list comes from [IW5 _gameskill.gsc](https://github.com/plutoniummod/iw5-scripts/blob/master/maps/_gameskill.gsc):
- **Every hit:** `setblurforplayer(3, 0)`, then a fade to 0 over **0.8 s**.
- **First time crossing the near-death cutoff:** blur 3.6 fading over 2 s, plus `painvisionon()` and a near-death audio
  state.
- **Blood splatter overlay** (`splatter_alt_sp`, fullscreen): target alpha = `clamp(1.2·(1−hp/max)², 0, 1)`. It rises
  instantly and decays at **0.3/s**.
- **Red flashing overlay:** pulses on a **0.8 s** cycle while critical, then fades over 1.0 s.
- **Breathing:** `breathing_hurt` loops with 0.1–0.9 s random gaps while below the cutoff; `breathing_better` plays when
  the player recovers.

CoD4 MP uses the same pattern ([_healthoverlay.gsc](https://github.com/volkv/CoD4-Default-GSC-Scripts/blob/master/maps/mp/gametypes/_healthoverlay.gsc)):
the overlay pulse starts at **55 %** hp, and breathing starts below **35 %**, every 0.784 s + 0.1–0.9 s.

Other games:
- **Wiki summary:** below 33 %, "tunnel vision or a red tinge" plus "a raised heartbeat and strained breathing". MW2-09
  replaced tunnel vision with blood that builds up gradually ([wiki Health](https://callofduty.fandom.com/wiki/Health)).
- **MW19:** the campaign turns the screen greyscale at critical damage. The MP beta's black-and-white effect with shake below
  half health was cut at launch for red splotches, because it "can make you not see enemies"
  ([MP1st](https://mp1st.com/news/modern-warfare-connection-meter-available-for-consoles-black-white-effect-death-effect-taken-out),
  [Upcomer](https://upcomer.com/3-gameplay-elements-modern-warfare-changed-for-release/)).
  **Red Night is a night game: do not desaturate.**
- **Tinnitus:** BO6 has "Reduce Tinnitus Sound" for flashes and stuns ([Dexerto](https://www.dexerto.com/call-of-duty/best-audio-settings-black-ops-6-2885702)).
  CoD4 grenade earthquake: scale 0.3, 0.5 s, radius 400 in; shellshock 0.5 s ([_shellshock.gsc](https://github.com/volkv/CoD4-Default-GSC-Scripts/blob/master/maps/mp/gametypes/_shellshock.gsc)).

### 3.5 The "you didn't die from full" shield (IW campaign)

From [IW5 _gameskill.gsc](https://github.com/plutoniummod/iw5-scripts/blob/master/maps/_gameskill.gsc):
- **Invulnerability on a heavy hit (Regular):** **0.5 s** before the shield, **1.0 s** on the shield, **0.4 s** after it.
  On Veteran these are 0 / 0.25 / 0 s.
- **`player_deathInvulnerableTime`:** 2500 ms on Regular, 100 ms on Veteran.
- **During the window:** enemies' `attackeraccuracy` is set to 0.
- **Threshold:** the shield fires when a hit costs more than `worthyDamageRatio` (0.1 on Regular), or that ratio × 3 when
  only one attacker is engaging.

**This is a large part of why CoD campaign deaths feel fair.** It costs one timer in `damagePlayer()`.

### 3.6 Near-miss cracks and suppression

- **MW19:** projectile weapons "afford us the ability to play more realistic whiz-bys, correctly timed with a projectile's
  approach"; "the whole game has a concept of the actual speed of sound" (Tim Stasica,
  [A Sound Effect](https://www.asoundeffect.com/call-of-duty-modern-warfare-sound/)).
- **PUBG**, as reported by [PC Gamer](https://www.pcgamer.com/au/how-gunshot-sounds-work-in-playerunknowns-battlegrounds)
  (from a search summary; the page body would not load):
  - a whiz means a nearby pass; a crack is the supersonic shockwave;
  - **the whiz radius is "considerably bigger" than the crack radius**;
  - subsonic rounds whiz with no crack.
- **Real-world crack-thump:** the crack arrives before the muzzle "thump", which travels at about 340 m/s; a ~1 s gap means
  more than 600 m ([Max Velocity Tactical](https://maxvelocitytactical.com/crack-thump)).

**Spec:**
- For each enemy hitscan round, take the closest-approach distance d to the camera.
- d < 3 m: whiz. d < 1 m on a rifle round: crack, plus a small vignette pulse and a 0.15 s suppression kick.
- Delay distant gun reports by distance/343 s.

### 3.7 Camera on death

- **CoD4 MP:** the corpse plays its death animation, then ragdolls at the `start_ragdoll` notetrack or at **35 %** of clip
  length, waiting at least **0.2 s** first. The killcam starts after a **1.75 s** post-death delay. The death icon lasts 5 s
  ([_globallogic.gsc](https://github.com/volkv/CoD4-Default-GSC-Scripts/blob/master/maps/mp/gametypes/_globallogic.gsc)).
- **Modern death-cam behaviour (MWII/BO6): not verified.**

Red Night has no killcam, so the cheap analogue is:
- 0.3 s: kick the camera toward the hit direction;
- 1.5 s: drop and roll the camera to the floor, as a first-person "fall";
- hold, with the low-pass audio on.

---

## 4. (c) NPC hit reactions and deaths

### 4.1 What CoD's engine actually does on a non-lethal hit

From the BO1 SP scripts, written by Treyarch with comments ([pain.gsc](https://github.com/plutoniummod/t5-scripts/blob/main/SP/Common/animscripts/pain.gsc)):

> "Two pain animations are played. One is a longer, detailed animation with little to do with the actual location and
> direction of the shot, but depends on what pose the character starts in. The other is a 'hit' animation that is very
> location-specific, but is just a single pose for the affected bones so it can be played easily whichever position the
> character is in."

**The location-specific "hit" layer (`PlayHitAnimation`):**
- 4 zones: chest, head, left arm, right arm. Leg hits play no hit pose.
- Each zone has 4 direction poses (front, back, left, right), blended by `QuadrantAnimWeights(damageYaw+180)`.
- Weight = `damage>200 ? 1 : (damage+50)/250`.
- Blends in over `0.05/weight` s and clears over `0.2/weight` s.

**Additive pain for heavies (`additive_pain`):**
- Poses: belly, left arm, right arm, left leg, right leg.
- Blends in over 0.1 s, holds **0.4 s**, clears over 0.2 s.

**The "big" pain interrupt** is a full clip that stops the AI acting:
- It triggers when the hit's damage is more than **40 %** of max hp, except hits to the hands, feet or helmet.
- It is picked by zone: chest, groin, left arm, right arm, leg, and **`drop_gun`** for the right hand, right arm or upper
  torso.
- Wounded animations switch in when hp < 75 %.

**IW5 pain gating** ([IW5 pain.gsc](https://github.com/plutoniummod/iw5-scripts/blob/master/animscripts/pain.gsc)):
- Cover and special pains set `allowpain = 0` for **0.5 s** (`_id_0D37`); extended pains keep it at 0 until they end.
- A pain clip is only allowed if its root motion has room (`maymovetopoint`).
- Running NPCs use stumbles chosen by free space ahead:
  - 300 in (7.6 m): leg, shoulder, stomach, head stumbles;
  - 200 in (5 m): fall-on-knee, stomach, stumble;
  - 120 in (3 m): fall-on-knee only.
- Standing pain is picked by zone, mirroring BO1:
  - head/neck → `exposed_pain_face`;
  - lower legs/feet → `extendedpain_thigh`;
  - groin → `pain_groin`;
  - left arm → `shoulderswing`;
  - otherwise a "2-crouch" fall.

**Caliber:** MW19's animation team says: "Tag an enemy with a larger caliber round and they're sent flying back, compared
to a smaller round" ([Activision blog](https://blog.activision.com/call-of-duty/2019-07/Modern-Warfare-Initial-Intel-Detailing-Advancements-in-Animation-and-Authenticity)).

### 4.2 Leg hits: limps and knee drops

- IW5 running pain includes `run_pain_leg`, `run_pain_fallonknee(_02/_03)` and `run_pain_leg_fast` (above).
- The long-death crawl (section 4.4) is gated mostly on **leg hit and hp < 40 % of max**.
- I found no persistent limp locomotion in either script set. **Not verified for MW19 or later.**

**Recommendation:** after any leg hit, scale the NPC's speed by 0.75 for 3 s and add a hip-drop spring on the hit side.

### 4.3 Arm hits: disrupted aim, dropped weapon

- BO1 has `drop_gun` pain for the right hand, arm or upper torso, plus left and right arm pains ([BO1 pain.gsc](https://github.com/plutoniummod/t5-scripts/blob/main/SP/Common/animscripts/pain.gsc)).
- IW5 drops the weapon (`_id_0D73`) at death unless the clip has a `dropgun` or `fire_spray` notetrack ([IW5 death.gsc](https://github.com/plutoniummod/iw5-scripts/blob/master/animscripts/death.gsc)).

**Recommendation:**
- An arm hit adds ±4° of aim error to that NPC's next 0.6 s of fire.
- A right-arm hit for more than 40 % of max hp has a 25 % chance to drop the weapon, after which the NPC draws a pistol or
  flees. **These numbers are design values, not CoD values.**

### 4.4 Wounded and downed states (IW "long death")

From [IW5 pain.gsc](https://github.com/plutoniummod/iw5-scripts/blob/master/animscripts/pain.gsc) `_id_0D3F` and `_id_0D67`.
I could not confirm this exact behaviour in MW19 itself. It shipped in the IW engine from 2011.

**Eligible when all of these hold:**
- not shielded, not on stairs, and the fall clip has room;
- remaining hp ≤ 100;
- no player within **175 in (4.4 m)**;
- the hit was **not** to the head, helmet, gun or hands;
- the NPC is not holding a sidearm.

**Rate limits:**
- **Leg hit with hp < 40 %:** a global gate only. After any long death starts, the gate is 3 s, then reset to **7–13 s**.
- **Any other hit:** needs a global death counter at 0 and a timer expired. After a crawl starts, the counter becomes
  **10–30 deaths** and the timer **15–60 s** if the player is within 1024 in (26 m); otherwise **5–12 deaths** and
  **5–25 s**. Every NPC death decrements the counter ([death.gsc](https://github.com/plutoniummod/iw5-scripts/blob/master/animscripts/death.gsc)).

**Behaviour:**
1. hp is set to 10000 for **0.75 s**, an invulnerable fall, then to **1 hp**, so one more hit kills.
2. The NPC falls to its back (`dying_stand_2_back`) or to a crawl (`dying_stand_2_crawl`, `dying_crawl`).
3. It lies on its back for **4–20 s**, twitching 40 % of the time, and fires a pistol (`dying_back_fire`) whenever the enemy
   is inside an aim cone.
4. It then dies (`dying_back_death_v1..4`, `dying_crawl_death_v1/v2`) and leaves a crawl blood-smear decal
   (`impacts/blood_smear_decal`).

BO1 has the same `crawlingPain` and `crawlingPistol`, with a separate leg-damage timer
(`anim.nextCrawlingPainTimeFromLegDamage`) ([BO1 pain.gsc](https://github.com/plutoniummod/t5-scripts/blob/main/SP/Common/animscripts/pain.gsc)).

### 4.5 Head hits

- **Helmet hit:** pops the helmet as a physics prop. Horizontal velocity = damage dir × 2000–4000; vertical 1500–3000; the
  prop is deleted after 60 s ([IW5 death.gsc `_id_0D17`/`_id_0ED0`](https://github.com/plutoniummod/iw5-scripts/blob/master/animscripts/death.gsc)).
  The AI may survive (BO1 `..._helmet_nodie` sound).
- **Headshot death:** **no death vocal**. `playdeathsound()` is skipped when the hit zone is head or helmet. Head-specific
  deaths play: `stand_death_headshot_slowfall`, `stand_death_head_straight_back`, `exposed_death_headshot`.
- **Ragdoll impulse:** **halved** for head and neck kills in BO1 ([BO1 death.gsc](https://github.com/plutoniummod/t5-scripts/blob/main/SP/Common/animscripts/death.gsc)).
  A headshot reads as a collapse, not a launch.
- **Head-snap (non-lethal):** the BO1 hit layer has `head_front/back/left/right` poses. IW5 crouch pain has
  `exposed_crouch_pain_headsnap`.

### 4.6 Deaths: direction, zone, weapon, and the handoff to ragdoll

**Death clips by direction** (IW5 `_id_0EDD`):
- from behind (|yaw| > 135°): head and neck → face-plant or headshot slow-fall; upper torso → tumble back or chest-stunned;
- from the front (−45°..45°): fall to the knees;
- 15 % chance of the generic `exposed_death_02` or `nerve`;
- **10 % "death while firing"** (`exposed_death_firing`).

**Special "big gun" deaths** (IW5 `_id_0ED5`):
- any hit with damage > 500;
- a sniper with damage > maxHealth;
- a shotgun within 512 in (13 m);
- a Desert Eagle within 425 in (10.8 m).

For a running target hit from more than 275 in (7 m), there is a 65 % chance to skip the special death. The special deaths
include shotgun leg, back and spin deaths ([IW5 death.gsc](https://github.com/plutoniummod/iw5-scripts/blob/master/animscripts/death.gsc)).

**Handoff to ragdoll:**
- The death clip blends in over **0.1 s**.
- Ragdoll starts at the `start_ragdoll` notetrack, or at **0.35 × clip length** if there is none. Both IW5 and CoD4 MP do
  this ([CoD4 _globallogic.gsc delayStartRagdoll](https://github.com/volkv/CoD4-Default-GSC-Scripts/blob/master/maps/mp/gametypes/_globallogic.gsc)).

**Impulses:**
- **IW5 immediate ragdoll:** `|F| = 10 × max(damage, 300)` for bullets, ×5 instead of ×10 for player melee. The direction is
  the damage dir with **z raised to at least 0.3**. Add `prevanimdelta*20*10` to carry the animation's own velocity.
- **BO1:** `F = (dir + (0,0,0.2)) × 60 × force`, where force is:
  - bullets: **0.35** (damage < 75) or **0.45**, ×2 on gib deaths;
  - shotgun: **0.3 + 0.7·(1 − d²/300²)** (300 in cap, so up to 1.0 point blank);
  - explosive: **1.6**;
  - **×0.5 for head and neck**.
- Source: [BO1 death.gsc launch_ragdoll_based_on_damage_type](https://github.com/plutoniummod/t5-scripts/blob/main/SP/Common/animscripts/death.gsc).

**Corpse reacting to more hits:** BO1 `death_anim_short_circuit` waits **0.3 s**, then sums later damage. Once the sum
passes **100** it abandons the death clip and launches ragdoll with the same formula.

**Blood pool:** IW5 traces down from `j_SpineUpper` **2 s** after death and places the pool only if the ground normal z
> **0.9** ([IW5 death.gsc `_id_0ECA`](https://github.com/plutoniummod/iw5-scripts/blob/master/animscripts/death.gsc)).

### 4.7 Pain vocalizations

- **IW5:** every pain triggers a "pain" face and voice (`animscripts\face`).
- **BO1:** `SayGenericDialogue("pain")`, plus a special gib scream `chr_spl_generic_gib_<voice>` lasting 1.6 s.
- **Both:** headshot deaths are silent, as above.
- **ESRB for MW19:** "screams of pain, and large blood-splatter effects" ([ESRB](https://www.esrb.org/ratings/36491/call-of-dutyr-modern-warfarer/)).

**Spec:**
- 1 pain grunt per NPC per 0.6 s at most.
- Death scream on non-head kills.
- A sustained moan loop in long-death.
- v22 human factions should get per-faction voice banks.

### 4.8 AAA physics-based approaches, and why they don't fit

- **Rockstar / NaturalMotion Euphoria** (GTA IV, RDR, Max Payne 3, GTA V, RDR2): motion "based on a full simulation of the
  3D character, including body, muscles and motor nervous system". Licensing ended in 2017 ([Wikipedia](https://en.wikipedia.org/wiki/Euphoria_(software))).
  RDR2: "Enemies now have a greater array of reactions if they're injured" (Phil Hooker, [Wccftech/VG247, Oct 2018](https://wccftech.com/rockstar-euphoria-evolved-rdr2/amp/)).
  Proprietary and unavailable.
- **Respawn, Star Wars Jedi: Fallen Order:** physical simulation blended with authored animation, including stormtrooper
  death performances, using motors and constraints in PhysX ([GDC 2020 Vault](https://gdcvault.com/play/1026848/Physical-Animation-in-Star-Wars)).
  Members-only; numbers not checked.
- **Ubisoft La Forge DReCon** (SIGGRAPH Asia 2019): an RL-controlled physics character tracking Motion Matching. It was
  impact-tested with 0.2 m cubes. Simulation runs at 60 Hz, the policy at 30 Hz. **Runtime 340 µs per character**:
  kinematic 40 + state 40 + policy 60 + physics 200, measured on a Xeon E5-1650 v3 in native code
  ([paper](https://theorangeduck.com/media/uploads/other_stuff/DReCon.pdf), [Ubisoft page](https://montreal.ubisoft.com/en/drecon-data-driven-responsive-control-of-physics-based-characters/)).
  On a phone, in JS and WASM, that is several ms per character. Rejected.
- **Naughty Dog, TLOU2:** the GDC talks found cover Motion Matching, Melee AI, Allies and Ranged Combat
  ([Motion Matching](https://gdcvault.com/play/1027118/Motion-Matching-in-The-Last), [Melee AI slides](https://media.gdcvault.com/GDC+2021/Melee+AI+in+The+Last+of+Us+Part+II.pdf),
  [A Second Shot](https://gdcvault.com/play/1034314/A-Second-Shot-Improving-Ranged)).
  **None I found is about hit reactions specifically.** Not verified.
- **Hitman: Codename 47 (IO Interactive), Jakobsen, GDC 2001:** corpses "consist of particles connected by stick
  constraints in effect forming stick figures". Relaxation iterations "vary between 1 and 10". The constraint solver uses
  "zero square roots, one division only". Collisions: "Offending points are simply projected out of the obstacle"
  ([Game Developer](https://www.gamedeveloper.com/programming/advanced-character-physics)).
  **This is the technique that fits a phone.**
- **Wolfire, GDC 2014** "An Indie Approach to Procedural Animation": a few keyframes plus procedural blending
  ([Game Developer video](https://gamedeveloper.com/design/video-an-indie-approach-to-procedural-animation)).
  This supports the spring-additive approach.

---

## 5. (d) Impact VFX and gore

- **Exit spray onto the wall behind:** "If a person is shot in the head, there will be blood splatter on a nearby wall ...
  blood coming out of the opposite side of the bullet entry and landing on an object" ([wiki Headshot](https://callofduty.fandom.com/wiki/Headshot)).
  **Implementation:** after a flesh hit, continue the ray 2.5 m. On a hit, call
  `surfDecal(p, n, 'blood', 0.25–0.6 × caliber)` using the existing InstancedMesh pool in `combat.js`. This is cheap.
- **Mist sized by caliber:** MW19 wants target effects "representative of the power" of the weapon (Mark Grigsby,
  [Activision blog](https://blog.activision.com/call-of-duty/2019-07/Modern-Warfare-Initial-Intel-Detailing-Advancements-in-Animation-and-Authenticity)).
  **No CoD numbers found.** Recommended scale is about `w.dmg/30`: pistol 0.6×, AR 1×, sniper or shotgun 2× particles and
  radius. Add an exit puff with half the particles along the bullet direction.
- **Decal rules:**
  - pool after 2 s on flat ground only (IW5);
  - crawl smear on long deaths (IW5);
  - rotate the decal pool (it already exists: `decalPool(kind, tint, cap = 96)`).
- **Does CoD dismember? Yes, gated by weapon and by a content filter:**
  - **MW19** ESRB: "A sniper rifle causes increased damage (e.g., decapitation, dismemberment)" ([ESRB](https://www.esrb.org/ratings/36491/call-of-dutyr-modern-warfarer/)).
  - **BO6** ESRB: "Some weapons cause characters to explode into bloody chunks of flesh"; zombie and hallucination sequences
    show "decapitation and dismemberment" ([ESRB](https://www.esrb.org/ratings/40588/call-of-dutyr-black-ops-6/)).
    BO6 has a "Gore & Dismemberment Effects" toggle under Content Filter ([guide](https://thefilibusterblog.com/call-of-duty-black-ops-6-disabling-kill-effects-and-killcams/), via search snippet).
  - **BO1 SP gib rules** ([death.gsc](https://github.com/plutoniummod/t5-scripts/blob/main/SP/Common/animscripts/death.gsc)):
    - shotgun gib chance **100 % < 110 in (2.8 m)**, **75 % < 200 in (5.1 m)**, **50 % < 270 in (6.9 m)**,
      **about 25 % < 330 in (8.4 m)**, none beyond;
    - other bullets need damage ≥ 50 and a gib-capable weapon;
    - explosive gibs need damage ≥ **165**;
    - a global `gibDelay` cooldown applies;
    - limb by zone: torso → an arm; arm → that arm; leg → that leg or "no_legs"; head → head;
    - gib velocity = dir × 500–900 + random ±600 sideways, +400–1000 up.

**Gore note for Red Night:** Red Night already pops heads on big-gun headshots. Adding BO1-style shotgun limb gibs is the
next step: scale the bone to 0.001 and emit a chunk burst. Put it behind a "Gore" setting, as MWII and BO6 do.

---

## 6. (e) Phone feasibility in three.js r128: measured costs

**Method:** I wrote `bench/bench.mjs`. It runs under Node 22 with three@0.128.0 and cannon-es@0.20.0, both from npm into the
scratch folder (MIT, free). Each test reports the median of 5 batches.

**Machine:** a 4-core Intel Xeon @ 2.1 GHz that was **heavily loaded** by the other job (load average 14.8–15.5 during the
runs), so these numbers are pessimistic for an idle desktop. No browser was launched, as instructed.

**Phone factor:** budget test devices are "15-25% as fast as those carried by programmers"
([Alex Russell, 2024](https://infrequently.org/2024/01/performance-inequality-gap-2024/)), so I estimate **× 4–6**.

| Technique | Measured | Phone estimate (×4–6) | Verdict |
|---|---|---|---|
| Spring additive offsets, **30 NPCs × 8 bones** (step and apply quaternion) | **0.044 ms**/frame | 0.18–0.26 ms | **Yes** |
| For reference, the `updateMatrixWorld` already paid for 30 × 52 joints | 0.219 ms | 0.9–1.3 ms | (already paid) |
| Verlet ragdoll, 1 body, 15 particles, 24 sticks, **4 iterations**, 8 AABBs | 0.0042 ms/step | 0.017–0.025 ms | **Yes** |
| Same with **8 iterations** | 0.0079 ms/step | 0.03–0.05 ms | **Yes** |
| Map Verlet to 11 bones (`setFromUnitVectors` plus a parent world-inverse per bone) | 0.0044 ms | 0.018–0.026 ms | **Yes** |
| → **6 live Verlet ragdolls, 8 iterations, mapped** | ≈0.074 ms | **≈0.3–0.45 ms** | **Yes, cap at 6** |
| cannon-es, 1 ragdoll (11 bodies, 10 cone-twists), solver 10 iterations, SAP | 0.18 ms/step | 0.7–1.1 ms | marginal |
| cannon-es, 4 ragdolls | 0.75 ms | 3.0–4.5 ms | **No** |
| cannon-es, 8 ragdolls | 1.93 ms | 7.7–11.6 ms | **No** |
| cannon-es, 4 ragdolls + 60 static city boxes | 1.10 ms | 4.4–6.6 ms | **No** |
| cannon-es download | 140 KB minified (jsDelivr Terser), **36.7 KB gzip**; ESM only, no global build | — | extra cost: module loader, and the city colliders must be mirrored |
| `DecalGeometry` (r128) projected onto a ~3k-tri mesh | **4.4 ms** per decal | 17–26 ms | **No** |
| `DecalGeometry` onto a ~16k-tri mesh | **69 ms** per decal | 280–415 ms | **No** |
| Instanced quad decal pool (`setMatrixAt`), already in `combat.js` | < 0.001 ms | ~0 | **Yes** |
| Extra baked clips through `clipsFor` (task's figure ~200 ms per clip per character) | e.g. 8 hit/death clips × 16 character types = **25.6 s** of main-thread baking, streamed | same, ×4–6 if measured on desktop | Avoid, use procedural instead |

How the bench was set up:
- **cannon-es ragdoll:** follows [pmndrs/cannon-es examples/ragdoll.html](https://github.com/pmndrs/cannon-es/blob/master/examples/ragdoll.html),
  timing the awake first 1.5 s of each fall.
- **r128 references:** [webgl_decals.html](https://github.com/mrdoob/three.js/blob/r128/examples/webgl_decals.html).
  r128 also ships `AnimationUtils.makeClipAdditive` and `AdditiveAnimationBlendMode` (checked in `three.module.js`
  r128, line 32731) with the [additive blending example](https://github.com/mrdoob/three.js/blob/r128/examples/webgl_animation_skinning_additive_blending.html).
  These are needed only if real additive clips are wanted later.

### Cheapest technique that reads as CoD-like at phone frame rates

**1. Hit reactions: spring-driven additive offsets. No clips, no physics.**
- On `hurt(amount, part, dir)`, add angular velocity to the springs. Then:
  - torso hit: Spine, Spine1, Spine2 and Neck pitch and roll away from the shot;
  - head hit: a large Neck and Head snap;
  - arm hit: that Arm and ForeArm swing back, and the aim error from section 4.3;
  - leg hit: that UpLeg bends and the Hips drop on that side.
- Impulse scale follows BO1: `w = min(1, (dmgPct·100 + 50)/250)` (BO1 `PlayHitAnimation`).
- Spring tuning: k ≈ 180, ζ ≈ 0.55. This gives about 60 ms to peak and settles in about 0.3 s, which matches BO1's
  0.05 s in and 0.2 s out.
- Apply each offset as a **world-axis** rotation turned into local space with the parent's world quaternion. This works
  whatever bone roll each Tripo model has, which is the very problem `clipsFor` bakes around.
- Run it after `mixer.update`. The generic `hit_to_body_01` clip can stay for the "big pain" (> 40 % of max hp, BO1 rule)
  and its cooldown, 0.5 s re-entry block (IW5).

**2. Deaths: keep the `fall` clip for 35 % of its length, then switch to a Verlet ragdoll.**
- Seed the particles from the current bone world positions and from the previous frame's positions, so the ragdoll
  carries the clip's momentum.
- Impulse: BO1 force (bullets 0.35–0.45, shotgun 0.3–1.0 by distance, explosive 1.6, head ×0.5) along `dir + (0, 0.2, 0)`.
- Cap 6 live ragdolls. Freeze after 3 s or when they come to rest, and bake the final pose.
- Corpse short circuit: 0.3 s after death, another 100 % of max hp in damage → immediate impulse.
- Big-gun special death: shotgun < 13 m or sniper overkill → ×2 impulse.

**3. VFX:** exit-wall blood through the existing instanced `surfDecal` pool; a floor pool after 2 s if the floor is flat.

**4. Player:** the Q3 kick, IW blur, the splatter curve, the breathing loop, hitmarker tiers and the near-miss whiz. All of
it is UI and audio with no per-frame physics.

---

## 7. Implementation order

| Step | What | Done when |
|---|---|---|
| 1 | Zone and multiplier tables plus step falloff (data); fix limb .85 vs .88 | per-class TTKs fall within section 2.4's ranges |
| 2 | Tiered hitmarkers and sounds (head ping, kill, armor, break); silent headshot deaths | — |
| 3 | Player view kick (Q3 constants), hit blur 0.8 s, splatter alpha, breathing, no greyscale, last-chance shield | — |
| 4 | Spring additive hit reactions with BO1 weighting; big-pain gate at > 40 % max hp; 0.5 s re-entry block | — |
| 5 | Verlet ragdoll handoff at 35 %, BO1 impulse table, corpse short circuit, flat-floor blood pool after 2 s, exit-wall splatter | — |
| 6 | Long-death crawl and back-pistol, with the IW5 gates and cooldowns | needs crawl and back-idle poses: a new clip source, or procedural Verlet with an animated arm |
| 7 | Armored faction (plates, blue markers, BO1 juggernaut additive-only pain until < 30 %) | — |
| 8 | Near-miss whiz and crack; distance-delayed reports | — |
| 9 | Optional gore: BO1 shotgun gib table behind a setting | — |

---

## 8. Numbers quick list

Every number with its source appears in the structured result. These are the key ones:
- **Q3 view kick:** 5–10° clamp, 100/400 ms.
- **IW5 SP:** 3 px blur fading 0.8 s; splatter 1.2·(1−h)², decaying 0.3/s; shield 0.5/1.0/0.4 s; death invulnerability
  2500 ms.
- **CoD4 MP:** overlay at 55 %, breath at 35 %, regen delay 5 s.
- **MWIII:** regen 3 s and 75 hp/s.
- **BO1:** hit-pose weight (d+50)/250, 0.05 s in, 0.2 s out; additive 0.4 s; big pain > 40 %.
- **IW5:** long death at hp < 40 % on leg hits, 4.4 m exclusion, cooldowns 3 s / 7–13 s / 5–60 s, 4–20 s on the back;
  ragdoll at 35 %; impulse 10·max(d,300) with z ≥ 0.3.
- **BO1 ragdoll force:** 0.35 / 0.45 / 0.3–1.0 / 1.6, head ×0.5; corpse short circuit at 0.3 s and > 100 damage.
- **BO1 shotgun gib:** 100/75/50/25 % at 2.8/5.1/6.9/8.4 m.

---

## 9. Could not verify, and access errors

- **sym.gg:** a client-rendered SPA. I downloaded its bundle (`/1bc04b52-BHxuSGTt.js`) and the article chunks. The CoD
  "game-mechanics" articles for mw2, mw3 and wz are one shared recoil article; no hitbox tables are reachable without
  running its app. No numbers came from sym.gg.
- **`callofduty.fandom.com/wiki/Damage_Multiplier` through WebFetch:** "HTTP 402 Payment Required". The MediaWiki API
  (`api.php?action=parse`) returned 200 and was used instead.
- **Official callofduty.com pages through WebFetch:** "timeout of 60000ms exceeded". `curl` worked and was used.
- **`upcomer.com` (MW19 regen) and `sportskeeda.com` (WZ2 S4):** HTTP 403. MW19 regen is cited from the search snippet only;
  WZ2 S4 was confirmed through Gfinity's copy of the notes.
- **PC Gamer's PUBG audio article:** the body did not load (navigation only); cited from the search summary.
- **80.lv's Respawn GDC summary:** redirected to a 404. The GDC Vault page is members-only.
- **MW19/MWII/MWIII/BO6 kill-hitmarker colour (red):** not verified.
- **CoD `bg_viewKick*` defaults:** not verified (only `bg_viewKickMax` = 0 disabling it, from a mod tracker).
- **Death-cam behaviour in MWII/BO6:** not verified.
- **MW19 campaign wounded or crawling enemies:** not verified for MW19 itself. The behaviour is documented from IW5 (2011)
  and BO1 (2010) engine scripts.
- **TLOU2 hit-reaction specifics:** no talk found.
- **Euphoria internals and Respawn numbers:** proprietary or members-only.
- **BO6 regen** (3.5 s / 40 hp/s): fan guide only, low confidence.
- **MWII per-hitbox numbers:** patch notes give no values. MWII-era weapons appear inside MWIII notes (M13C legs 0.88).
- **The 200 ms-per-clip bake figure:** taken from the task brief, not re-measured. I did not run the game.
