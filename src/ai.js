/* =====================================================================
   RED NIGHT — AI: perception (sight cone + hearing), tactical purgers
   (cover, peeking, suppression, flanking squads, retreat, molotovs),
   monsters that stalk civilians until they notice you, and civilians.
   ===================================================================== */

/* ---------- noise events ---------- */
const NOISES = [];
function makeNoise(pos, radius, kind) {
  NOISES.push({ p: pos.clone(), r: radius, t: G.t, kind });
  for (const e of ENEMIES) { if (e.dead || (kind === 'eshot' && e.aware)) continue; const d = e.pos.distanceTo(pos); if (d < radius) alertEnemy(e, pos, d < radius * .4 ? 1.5 : 5); }
  for (const c of CIVS) { if (c.dead) continue; if (c.pos.distanceTo(pos) < radius * .8) c.panic(pos); }
  if (NOISES.length > 20) NOISES.shift();
}
function alertEnemy(e, pos, fuzz) {
  if (e.mode === 'disguise') return;
  e.aware = true; e.awareT = G.t; e.lastKnown = (e.lastKnown || new T.Vector3()).copy(pos).add(new T.Vector3(rand(-fuzz, fuzz), 0, rand(-fuzz, fuzz)));
}
// the player's shots tell everyone in earshot, and rattle anyone the rounds pass near
function playerShotNoise(o, d, len, sup) {
  makeNoise(P.pos, sup ? 16 : 75, 'shot'); if (!sup) trafficPanic(P.pos);
  for (const e of ENEMIES) {
    if (e.dead) continue; const h = e.headPos(); const v = h.clone().sub(o); const t = clamp(v.dot(d), 0, len); const miss = v.addScaledVector(d, -t).length();
    if (miss < 1.8 && t > 2) { e.supp = Math.min(1, (e.supp || 0) + (1.8 - miss) * .35); if (e.aware) e.lastKnown.copy(P.pos); else alertEnemy(e, P.pos, 3); }
  }
}

/* ---------- perception tick (all enemies) ---------- */
function perceive(e, dt, dist) {
  e.percT = (e.percT || 0) - dt; e.supp = Math.max(0, (e.supp || 0) - dt * .35);
  if (e.percT > 0) return; e.percT = .25 + Math.random() * .1;
  if (G.inside && !e.clubber) { e.seesP = false; return; }
  const fwd = new T.Vector3(-Math.sin(e.face), 0, -Math.cos(e.face)); const to = P.pos.clone().sub(e.pos).setY(0); const L = to.length() || 1;
  const fov = to.dot(fwd) / L > (e.aware ? -.2 : .45);                       // ~120° unaware, wider once alert
  const range = (e.aware ? 70 : 45) * (P.crouching ? .7 : 1) * (G.camMode === 'tpp' ? 1 : 1);
  const feel = dist < (P.crouching ? 3 : 6);
  let sees = false;
  if (!P.dead && (feel || (fov && dist < range))) sees = losClear(e.headPos(), P.eye());
  e.seesP = sees;
  if (sees) { if (!e.aware) { e.reactT = rand(.45, .85); e.spotT = G.t; } alertEnemy(e, P.pos, 0); e.lastSeen = G.t; }
  if (e.aware && G.t - (e.lastSeen || -99) > 14 && G.t - (e.awareT || -99) > 14) { e.aware = false; e.searchT = 0; } // lost you for good
}

/* ---------- navigation: straight if clear, else hop between street intersections ---------- */
function navPoint(e, tgt) {
  e.navCk = (e.navCk || 0) - G.dt;
  if (e.navCk > 0 && e.navTo && e.navTo.distanceToSquared(tgt) < 4) return e.navWp || tgt;
  e.navCk = .6; e.navTo = (e.navTo || new T.Vector3()).copy(tgt);
  const from = e.pos.clone().setY(1.1);
  if (losClear(from, tgt.clone().setY(1.1))) { e.navWp = null; return tgt; }
  if (e.navWp && e.pos.distanceTo(e.navWp) > 2.5 && losClear(from, e.navWp.clone().setY(1.1))) return e.navWp;
  const ci = Math.round((e.pos.x + HALF) / CW), cj = Math.round((e.pos.z + HALF) / CW); let best = null, bs = 1e9;
  const cand = [];
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) cand.push([new T.Vector3(-HALF + i * CW + rand(-2, 2), 0, -HALF + j * CW + rand(-2, 2)), 0]);
  // street points square-on to the target (the mouth of the alley / gap it's in), which can see it
  const xa = -HALF + Math.floor((tgt.x + HALF) / CW) * CW, za = -HALF + Math.floor((tgt.z + HALF) / CW) * CW;
  for (const q of [new T.Vector3(xa, 0, tgt.z), new T.Vector3(xa + CW, 0, tgt.z), new T.Vector3(tgt.x, 0, za), new T.Vector3(tgt.x, 0, za + CW)]) cand.push([q, losClear(q.clone().setY(1.1), tgt.clone().setY(1.1)) ? -25 : 8]);
  for (const [n, bonus] of cand) {
    const dn = n.distanceTo(e.pos); if (dn < 3) continue;
    if (!losClear(from, n.clone().setY(1.1))) continue;
    const sc = dn + n.distanceTo(tgt) * 1.25 + bonus; if (sc < bs) { bs = sc; best = n; }
  }
  e.navWp = best; return best || tgt;
}

/* ---------- cover ---------- */
function coverCandidates(e) {
  const out = []; const toP = new T.Vector3();
  // the far side of parked cars and low street clutter (crates, dumpsters, barriers), then random probes
  for (const c of CARS) { if (c.pos.distanceToSquared(e.pos) > 22 * 22 || c === P.inCar) continue; toP.copy(c.pos).sub(P.pos).setY(0).normalize(); const sd = new T.Vector3(-toP.z, 0, toP.x); for (const k of [0, 1.6, -1.6]) out.push(c.pos.clone().addScaledVector(toP, 2.3).addScaledVector(sd, k).setY(0)); }
  for (const b of boxesNear(e.pos.x, e.pos.z)) { if (b.y1 < .9 || b.y1 > 2.2 || b.water) continue; const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2; toP.set(cx - P.pos.x, 0, cz - P.pos.z).normalize(); const r = Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2 + .7; out.push(new T.Vector3(cx + toP.x * r, 0, cz + toP.z * r)); }
  for (let k = 0; k < 8; k++) { const a = Math.random() * TAU, r = rand(3, 13); out.push(new T.Vector3(e.pos.x + Math.cos(a) * r, 0, e.pos.z + Math.sin(a) * r)); }
  return out;
}
function findCover(e, from) {
  let best = null, bs = 1e9; const tgt = from || P.eye();
  for (const p of coverCandidates(e)) {
    const r = p.distanceTo(e.pos); if (r > 22) continue;
    if (ENEMIES.some(o => o !== e && o.cover && o.cover.p.distanceToSquared(p) < 1.5)) continue;
    const test = p.clone(); collideCircle(test, .5, 0, 1.8); if (test.distanceTo(p) > .05) continue;
    const dP = p.distanceTo(P.pos); if (dP < 7 || dP > 42) continue;
    const low = p.clone().setY(1.0), high = p.clone().setY(1.65);
    if (losClear(low, tgt)) continue;                                        // must hide a crouched body
    const peek = losClear(high, tgt) || losClear(high.clone().add(new T.Vector3(.9, 0, 0)), tgt) || losClear(high.clone().add(new T.Vector3(0, 0, .9)), tgt);
    const s = r + (peek ? 0 : 6) + Math.abs(dP - 20) * .25;
    if (s < bs) { bs = s; best = { p, peek }; }
  }
  return best;
}

/* ---------- squad director: who suppresses, who flanks ---------- */
let squadT = 0;
function updateSquads(dt) {
  squadT -= dt; if (squadT > 0) return; squadT = .6;
  const gun = ENEMIES.filter(e => !e.dead && e.type === 'purger' && e.aware);
  if (!gun.length) return;
  gun.sort((a, b) => a.dist2() - b.dist2());
  const c = new T.Vector3(); gun.forEach(e => c.add(e.pos)); c.divideScalar(gun.length);
  const axis = c.clone().sub(P.pos).setY(0).normalize(); const side = new T.Vector3(-axis.z, 0, axis.x);
  gun.forEach((e, i) => {
    if (e.role === 'retreat') return;
    if (!e.ranged) { e.role = 'rush'; e.flankSide = i % 2 ? 1 : -1; return; }
    if (i < 2 || gun.length < 3) e.role = 'suppress';
    else if (e.role !== 'flank') { e.role = 'flank'; e.flankSide = i % 2 ? 1 : -1; e.flankPt = P.pos.clone().addScaledVector(side, 16 * e.flankSide).addScaledVector(axis, 4); e.flankT = 9; }
  });
}

/* ---------- tactical purger ---------- */
function purgerAI(e, dt, dist) {
  const px = P.pos.x, pz = P.pos.z; const spd = e.speed * (e.possessed ? 1.4 : 1);
  if (!e.aware) return idleAI(e, dt, dist);
  if (e.hp < e.maxHp * .32 && e.role !== 'retreat' && !e.possessed) { e.role = 'retreat'; e.cover = null; e.coverT = 0; makeNoise(e.pos, 30, 'callout'); }
  const tgt = e.seesP || G.t - (e.lastSeen || -99) < 1.2 ? P.pos : e.lastKnown;
  if (!e.ranged) { // melee rusher: arc in from the side, sprint the last stretch
    const nv = e.seesP ? tgt : navPoint(e, tgt); const to = nv.clone().sub(e.pos).setY(0); const d0 = to.length() || 1; to.divideScalar(d0); const d = e.pos.distanceTo(tgt);
    const arc = d > 5 && e.seesP ? .55 * (e.flankSide || 1) : 0; const dir = new T.Vector3(to.x - to.z * arc, 0, to.z + to.x * arc).normalize();
    const s = d > 2 ? spd * (d < 12 ? 1.35 : 1) : 0; e.vel.x = damp(e.vel.x, dir.x * s, 8, dt); e.vel.z = damp(e.vel.z, dir.z * s, 8, dt);
    e.turnTo(tgt.x, tgt.z, dt, 9); e.melee(1.9, 14, .55, 1.0, dist); return;
  }
  // ranged. Lost sight for a while → leave cover and hunt; the suppressor holds the angle a bit longer, flankers swing wide
  const lostFor = e.seesP ? 0 : G.t - (e.lastSeen || -99);
  const lost = lostFor > (e.role === 'suppress' ? 9 : 4);
  if (lost && e.cover) { e.cover = null; e.coverT = 3; }
  if (lost && e.role === 'flank' && !(e.flankT > 0) && e.lastKnown) { const sd = new T.Vector3(-(e.lastKnown.z - e.pos.z), 0, e.lastKnown.x - e.pos.x).normalize(); e.flankPt = e.lastKnown.clone().addScaledVector(sd, 9 * (e.flankSide || 1)); collideCircle(e.flankPt, .5, 0, 1.8); e.flankT = 7; }
  e.coverT = (e.coverT || 0) - dt;
  if (!lost && (!e.cover || e.coverT <= 0) && (e.supp > .35 || e.role === 'suppress' || e.role === 'retreat' || Math.random() < dt * .4)) {
    e.cover = findCover(e); e.coverT = e.cover ? rand(5, 9) : 2;
    if (e.role === 'retreat' && e.cover && e.cover.p.distanceTo(P.pos) < e.pos.distanceTo(P.pos)) e.cover = null;
  }
  let moving = false;
  if (e.role === 'flank' && e.flankPt && e.flankT > 0) {
    e.flankT -= dt; { const n = navPoint(e, e.flankPt); e.moveToward(n.x, n.z, spd * 1.15, dt); } moving = true; if (e.pos.distanceTo(e.flankPt) < 3) { e.flankT = 0; e.cover = null; e.coverT = 0; }
  } else if (e.cover && e.pos.distanceTo(e.cover.p) > .8) { e.moveToward(e.cover.p.x, e.cover.p.z, spd * (e.supp > .5 ? 1.25 : 1), dt); moving = true; }
  else if (!e.seesP && !e.cover) { // no cover and no sight: push toward last known, then search
    if (e.pos.distanceTo(tgt) > 3) { const n = navPoint(e, tgt); e.moveToward(n.x, n.z, spd * .9, dt); moving = true; }
    else { e.searchT = (e.searchT || 0) + dt; if (!e.wDir || Math.random() < dt) e.wDir = Math.random() * TAU; e.vel.x = damp(e.vel.x, Math.sin(e.wDir) * 1.6, 3, dt); e.vel.z = damp(e.vel.z, Math.cos(e.wDir) * 1.6, 3, dt); }
  } else if (!e.cover) { // in the open with eyes on you: close, keep distance, strafe
    if (dist > 32) { e.moveToward(px, pz, spd, dt); moving = true; }
    else if (dist < 9) { e.moveToward(e.pos.x * 2 - px, e.pos.z * 2 - pz, spd * .7, dt); moving = true; }
    else { e.strafeT = (e.strafeT || 0) - dt; if (e.strafeT <= 0) { e.strafeT = rand(.9, 2.2); e.strafeS = Math.random() < .5 ? 1 : -1; } const s = e.strafeS * (e.supp > .4 ? 1.5 : 1); e.vel.x = damp(e.vel.x, -(pz - e.pos.z) / dist * 2.4 * s, 4, dt); e.vel.z = damp(e.vel.z, (px - e.pos.x) / dist * 2.4 * s, 4, dt); moving = true; }
  } else { e.vel.x = damp(e.vel.x, 0, 6, dt); e.vel.z = damp(e.vel.z, 0, 6, dt); }
  // in cover: crouch, pop up to fire, duck when suppressed. Flanked cover is abandoned.
  let inCover = e.cover && e.pos.distanceTo(e.cover.p) <= .8;
  if (inCover && (e.cvT = (e.cvT || 0) - dt) <= 0) { e.cvT = .5; if (losClear(e.cover.p.clone().setY(1.0), P.eye())) { e.cover = null; e.coverT = 0; inCover = false; } }
  e.peekT = (e.peekT || 0) - dt;
  if (inCover) { if (e.peekT <= 0) { e.peeking = !e.peeking; e.peekT = e.peeking ? rand(1.2, 2.2) * (1 - e.supp * .6) : rand(.8, 1.8) + e.supp * 1.5; } }
  else e.peeking = true;
  e.st.crouch = inCover && !e.peeking ? 1 : 0;
  e.turnTo(tgt.x, tgt.z, dt, 10);
  // shoot: reaction time after first sighting, bursts, worse when suppressed or moving
  if (e.reactT === undefined) e.reactT = rand(.3, .6); if (e.reactT > 0) e.reactT -= dt;
  const canShoot = e.seesP && e.peeking && e.reactT <= 0 && dist < 55;
  if (canShoot && e.cd <= 0 && !e.burst) { e.burst = e.role === 'suppress' ? rint(4, 7) : rint(2, 4); e.cd = rand(1.0, 1.9) / (e.possessed ? 1.6 : 1); e.bT = 0; }
  if (e.burst > 0) { e.bT -= dt; if (e.bT <= 0) { e.burst--; e.bT = e.role === 'suppress' ? .11 : .14; enemyFire(e, 7 * e.dmgMul, dist, moving); } if (!e.seesP) e.burst = 0; }
  // molotov to flush a player who's been hiding
  if (e.molotov && !e.seesP && G.t - (e.lastSeen || -99) > 2.5 && G.t - (e.lastSeen || -99) < 10 && dist > 7 && dist < 26 && (e.moloCd = (e.moloCd || 0) - dt) <= 0) { e.moloCd = rand(9, 14); if (losClear(e.pos.clone().setY(3.2), e.lastKnown.clone().setY(1.2))) throwMolotov(e, e.lastKnown); else e.moloCd = 2; }
}

// unaware: patrol, or prey on a civilian if one is close
function idleAI(e, dt, dist) {
  const prey = nearestCiv(e.pos, e.type === 'purger' ? 22 : 30);
  if (prey && e.mode !== 'disguise') {
    e.preyCiv = prey; const d = prey.pos.distanceTo(e.pos);
    if (e.type === 'purger' && e.ranged && d < 20 && losClear(e.headPos(), prey.pos.clone().setY(1.4))) {
      e.vel.x = damp(e.vel.x, 0, 6, dt); e.vel.z = damp(e.vel.z, 0, 6, dt); e.turnTo(prey.pos.x, prey.pos.z, dt, 8); e.st.aimHoldCiv = 1;
      if (e.cd <= 0) { e.cd = rand(.6, 1.2); civFire(e, prey); }
    } else {
      e.moveToward(prey.pos.x, prey.pos.z, d > 2 ? e.speed * .9 : 0, dt); e.turnTo(prey.pos.x, prey.pos.z, dt, 8);
      if (d < 2 && e.cd <= 0) { e.cd = 1.1; e.atk = e.atkDur = .55; setTimeout(() => { if (!e.dead && !prey.dead && prey.pos.distanceTo(e.pos) < 2.6) { prey.hurt(e.type === 'vampire' ? 35 : 25, e); if (e.type === 'vampire') e.hp = Math.min(e.maxHp, e.hp + 20); } }, 270); }
    }
    return;
  }
  e.preyCiv = null;
  if (!e.wDir || Math.random() < dt * .25) e.wDir = Math.random() * TAU;
  const sp = e.type === 'witch' ? 1.8 : 1.5; e.vel.x = damp(e.vel.x, Math.sin(e.wDir) * sp, 2, dt); e.vel.z = damp(e.vel.z, Math.cos(e.wDir) * sp, 2, dt);
  e.turnTo(e.pos.x + e.vel.x, e.pos.z + e.vel.z, dt, 3);
  if (e.type === 'witch') e.pos.y = .7 + Math.sin(e.t * 2) * .25;
}

/* ---------- enemy fire: real rays (cover works, cars soak bullets) ---------- */
const _ef = new T.Vector3();
function enemyFire(e, dmg, dist, moving) {
  const from = e.pos.clone().setY((e.st.crouch ? 1.0 : 1.38) * e.scale).addScaledVector(new T.Vector3(-Math.sin(e.face), 0, -Math.cos(e.face)), .5);
  const tgt = P.eye().add(new T.Vector3(0, P.crouching ? -.25 : -.4, 0));
  const pv = Math.hypot(P.vel.x, P.vel.z);
  const spread = (1.5 + dist * .055 + pv * .55 + (P.slide > 0 ? 2 : 0) + e.supp * 4.5 + (moving ? 1.8 : 0) - (e.possessed ? .6 : 0)) * (P.inCar ? 1.6 : 1) * (e.shotsAt ? 1 : 1.5); // first shots go wide
  e.shotsAt = (e.shotsAt || 0) + 1;
  const d = tgt.clone().sub(from).normalize(); const r = Math.sqrt(Math.random()) * spread * Math.PI / 180, a = Math.random() * TAU;
  const right = new T.Vector3(-d.z, 0, d.x).normalize(), up = new T.Vector3().crossVectors(right, d);
  d.addScaledVector(right, Math.cos(a) * Math.tan(r)).addScaledVector(up, Math.sin(a) * Math.tan(r)).normalize();
  // what's in the way?
  const L = 120; let tHit = L, what = null;
  const wh = rayBoxes(from, d, L); if (wh && wh.t < tHit) { tHit = wh.t; what = { world: wh }; }
  const ch = rayCar(from, d, tHit); if (ch && !(P.inCar && ch.car === P.inCar)) { tHit = ch.t; what = { car: ch }; }
  const pt = rayVCapsule(from, d, P.pos.x, P.pos.z, P.pos.y + .1, P.pos.y + (P.crouching ? 1.15 : 1.7), P.inCar ? .9 : .35);
  if (pt > 0 && pt < tHit) { tHit = pt; what = { player: true }; }
  for (const c of CIVS) { if (c.dead) continue; const tc = rayVCapsule(from, d, c.pos.x, c.pos.z, .1, 1.7, .32); if (tc > 0 && tc < tHit) { tHit = tc; what = { civ: c }; } }
  const end = from.clone().addScaledVector(d, tHit);
  tracer(from, end, 0xff6060, 1.3); FXA.emit(from.x, from.y, from.z, 0, 0, 0, .06, .5, .7, COL.spark, 1);
  AU.farShot(e.pos, !!e.heavyGun); if ((e.shotsAt % 4) === 1) makeNoise(e.pos, 45, 'eshot');
  if (!what) return;
  if (what.player) { if (P.inCar) { carHit(P.inCar, dmg * 2, end, d.clone().negate(), false); damagePlayer(dmg * .5, e.pos, e); } else damagePlayer(dmg, e.pos, e); return; }
  if (what.car) { carHit(what.car.car, dmg * 2, end, what.car.n, what.car.glass); return; }
  if (what.civ) { what.civ.hurt(dmg * 2, e); return; }
  impact(end, what.world.n, surfOfHit(what.world, end), { size: .14 });
  // near miss: bullet crack past your head
  const v = P.eye().sub(from); const tt = clamp(v.dot(d), 0, tHit); const miss = v.addScaledVector(d, -tt).length();
  if (miss < 2.2) { const sp = spatial(e.pos); AU.play('whiz_' + (1 + Math.floor(Math.random() * 2)), { vol: .7, pan: sp.pan }) || AU.nz(.08, 'highpass', 6000, 2500, 1, .3, sp.pan); P.suppressed = Math.min(1, (P.suppressed || 0) + .25); }
}
function civFire(e, c) { const from = e.pos.clone().setY(1.38); const to = c.pos.clone().setY(rand(.9, 1.5)); tracer(from, to, 0xff6060, 1.2); AU.farShot(e.pos, false); if (Math.random() < .55) c.hurt(18, e); }

/* ---------- molotov ---------- */
const MOLOS = [], FIREZONES = [];
function throwMolotov(e, at) {
  const from = e.pos.clone().setY(1.6); const to = at.clone().add(new T.Vector3(rand(-2, 2), 0, rand(-2, 2)));
  const T0 = .95; const v = to.clone().sub(from).divideScalar(T0); v.y = (to.y - from.y + .5 * 9.8 * T0 * T0) / T0;
  const m = new T.Group(); m.add(new T.Mesh(gBox(.08, .22, .08), STD(0x3a6a2a, .2, .1))); const fl = glowSprite(0, .14, 0, lc(0xff8a20), .8, m); m.position.copy(from); scene.add(m);
  MOLOS.push({ m, v, t: 0 }); e.atk = e.atkDur = .5; AU.swish(false);
  feed('<b>MOLOTOV</b> · Move!');
}
function updateMolotovs(dt) {
  for (let i = MOLOS.length - 1; i >= 0; i--) {
    const o = MOLOS[i]; o.t += dt; o.v.y -= 9.8 * dt; o.m.position.addScaledVector(o.v, dt); o.m.rotation.x += dt * 9;
    const hitW = rayBoxes(o.m.position, o.v.clone().normalize(), o.v.length() * dt + .1);
    if (o.m.position.y <= .05 || hitW || o.t > 3) {
      const p = o.m.position.clone().setY(0); scene.remove(o.m); MOLOS.splice(i, 1);
      const sp = spatial(p); AU.play('glass_shatter', { vol: .7 * sp.vol, pan: sp.pan }); AU.play('fire_whoosh', { vol: .8 * sp.vol, pan: sp.pan }) || AU.nz(.8, 'lowpass', 1200, 200, 1, .5 * sp.vol, sp.pan);
      const fires = []; for (let k = 0; k < 5; k++) { const f = { p: p.clone().add(new T.Vector3(rand(-1.6, 1.6), .2, rand(-1.6, 1.6))), s: rand(.7, 1.1) }; FIRES.push(f); fires.push(f); }
      const ls = { p: p.clone().setY(1.5), c: new T.Color(0xff6a10), i: 4, d: 16, f: 1 }; LS.push(ls);
      FIREZONES.push({ p, r: 3.2, t: 6.5, fires, ls }); makeNoise(p, 40, 'fire');
    }
  }
  for (let i = FIREZONES.length - 1; i >= 0; i--) {
    const z = FIREZONES[i]; z.t -= dt;
    if (P.pos.distanceTo(z.p) < z.r && !P.inCar) { damagePlayer(24 * dt, z.p, null); }
    for (const e of ENEMIES) if (!e.dead && e.pos.distanceTo(z.p) < z.r) e.hurt(30 * dt, null, null, true);
    for (const c of CIVS) if (!c.dead && c.pos.distanceTo(z.p) < z.r) c.hurt(40 * dt, null);
    if (z.t <= 0) { z.fires.forEach(f => { const k = FIRES.indexOf(f); if (k >= 0) FIRES.splice(k, 1); }); z.ls.i = 0; FIREZONES.splice(i, 1); }
  }
}

/* ---------- civilians: crowds that walk the sidewalks in groups ---------- */
const CIVS = [], GROUPS = [];
const CIV_RIGS = ['civilian_lo', 'suit_lo', 'male_lo', 'female_lo', 'civilian_lo', 'female_lo'];
const CLOTHES = [0x1c1c22, 0x2a2f3a, 0x3a2a24, 0x5a5048, 0x6a1a1a, 0x1a3a5a, 0x2a4a2a, 0x8a8478, 0xa89a7a, 0x4a3a5a, 0x101014, 0x7a5a2a];
const HAIRN = [0x0e0c0c, 0x2a1a10, 0x4a2a16, 0x8a6a3a, 0xc8b080, 0x6a6a6a];
class Civ {
  constructor(x, z, grp, slot) {
    this.pos = new T.Vector3(x, 0, z); this.vel = new T.Vector3(); this.face = Math.random() * TAU; this.hp = 60; this.dead = false; this.deadT = 0; this.t = Math.random() * 9;
    this.mode = 'walk'; this.st = { speed: 0, phase: 0, hold: 'none', t: 0, attack: 0, flinch: 0, death: 0 };
    this.grp = grp || null; this.slot = slot || 0; this.pace = rand(.92, 1.08);
    this.rig = pick(CIV_RIGS);
    const glb = CHARS_READY && (makeGLBRig(this.rig) || makeGLBRig(this.rig.replace('_lo', '')));
    if (glb) { customizeGLB(glb, { skin: pick(SKINS), hairCol: pick(HAIRN), top: pick(CLOTHES), bottom: pick(CLOTHES), accent: 0x222222, k: .62 }); this.R = glb; }
    else this.R = makeRig({ gender: Math.random() < .5 ? 'f' : 'm', skin: pick(SKINS), hair: pick(HAIRS), hairCol: pick(HAIR_COLS), top: pick([0x4a4a52, 0x2a3a4a, 0x5a3a2a]), bottom: 0x1c2a44, accent: 0x222222 });
    scene.add(this.R.root); this.pickDir();
  }
  pickDir() { const ax = Math.random() < .5; this.dir = ax ? new T.Vector3(Math.random() < .5 ? 1 : -1, 0, 0) : new T.Vector3(0, 0, Math.random() < .5 ? 1 : -1); this.walkT = rand(5, 14); }
  panic(from) {
    if (this.dead) return; if (this.grp) { const g = this.grp; this.grp = null; g.members = g.members.filter(m => m !== this); if (g.members.length) g.alarm = from.clone(); }
    if (this.mode === 'cower' && this.pos.distanceTo(from) > 6) { this.mode = 'flee'; }
    const d = this.pos.distanceTo(from);
    if (this.mode !== 'flee' && this.mode !== 'cower') { this.mode = d < 6 && Math.random() < .45 ? 'cower' : 'flee'; if (Math.random() < .55) { const sp = spatial(this.pos); AU.play('scream_' + (1 + Math.floor(Math.random() * 2)), { vol: .55 * sp.vol, pan: sp.pan, rate: rand(.9, 1.15) }) || AU.tone('sawtooth', rand(700, 950), rand(1100, 1400), .45, .06 * sp.vol, sp.pan, .04); } }
    this.threat = from.clone(); this.fleeT = rand(7, 12);
  }
  hurt(dmg, src) {
    if (this.dead) return; this.hp -= dmg; this.st.flinch = 1; if (this.threat) this.panic(this.threat); else this.panic(this.pos.clone().add(new T.Vector3(rand(-3, 3), 0, rand(-3, 3))));
    burst(FXN, this.pos.clone().setY(1.2), 8, 2.5, .5, .09, .04, COL.blood, 7, .3);
    if (this.hp <= 0) {
      this.dead = true; this.deadT = 0; this.st.deathClip = 'fall'; this.vel.set(0, 0, 0);
      decal(new T.Vector3(this.pos.x, .02, this.pos.z), new T.Vector3(0, 1, 0), rand(1.4, 2.2), splatTex, 0x5a0010);
      if (src === 'player') { addScore(-250, 'CIVILIAN DOWN'); flashBanner('CIVILIAN DOWN', 'That one was a person', 1.4); P.civKills = (P.civKills || 0) + 1; }
      else if (src && src.type) feed(`<b>${ET[src.type].name}</b> · killed a civilian`);
      for (const c of CIVS) if (!c.dead && c !== this && c.pos.distanceToSquared(this.pos) < 400) c.panic(this.pos); // a body hits the ground: everyone near runs
    }
  }
  partAt(o, d) { if (this.dead) return null; const th = raySphere(o, d, new T.Vector3(this.pos.x, 1.64, this.pos.z), .17); const tb = rayVCapsule(o, d, this.pos.x, this.pos.z, .35, 1.38, .3); if (th > 0 && (tb < 0 || th <= tb + .2)) return { t: th, part: 'head' }; if (tb > 0) return { t: tb, part: 'body' }; return null; }
  update(dt) {
    this.t += dt; const d2p = this.pos.distanceToSquared(P.pos), far = d2p > 45 * 45;
    if (this.dead) { this.deadT += dt; this.st.death = this.deadT * 2.2; if (this.R.glb && this.deadT < 5) animGLB(this.R, this.st, dt); else if (!this.R.glb) animRig(this.R, this.st, dt); this.sync(); return; }
    // threats: nearby awake monsters, anyone shooting is handled by noise events
    if (this.mode === 'walk' && (this.chk = (this.chk || 0) - dt) <= 0) { this.chk = .4; for (const e of ENEMIES) if (!e.dead && e.mode !== 'disguise' && e.pos.distanceToSquared(this.pos) < 14 * 14) { this.panic(e.pos); break; } }
    let tv = new T.Vector3(); let faceTo = null;
    if (this.mode === 'walk' && this.grp) {
      const g = this.grp, tgt = g.slotPos(this.slot);
      const to = tgt.sub(this.pos).setY(0); const L = to.length();
      if (g.standing) { if (L > .25) tv.copy(to).multiplyScalar(Math.min(1.4, L * 1.6) / (L || 1)); faceTo = g.pos; }
      else { const want = g.speed * this.pace * clamp(.75 + L * .45, .6, 1.6); if (L > .08) tv.copy(to).multiplyScalar(Math.min(want, L * 3) / L); }
    } else if (this.mode === 'walk') {
      this.walkT -= dt; if (this.walkT <= 0) this.pickDir();
      tv.copy(this.dir).multiplyScalar(1.25);
    } else if (this.mode === 'flee') {
      this.fleeT -= dt; const away = this.pos.clone().sub(this.threat).setY(0); if (away.lengthSq() < .01) away.set(1, 0, 0); away.normalize();
      const j = Math.sin(this.t * 1.7) * .35; tv.set(away.x - away.z * j, 0, away.z + away.x * j).normalize().multiplyScalar(5.4);
      if (this.fleeT <= 0) { this.mode = 'walk'; this.pickDir(); }
    } else if (this.mode === 'cower') { tv.set(0, 0, 0); this.fleeT -= dt; if (this.fleeT <= 0) this.mode = 'flee', this.fleeT = 6; }
    // keep a little personal space
    if (this.mode === 'walk' && (this.sepT = (this.sepT || 0) - dt) <= 0) { this.sepT = .15; this.sep = this.sep || new T.Vector3(); this.sep.set(0, 0, 0); for (const c of CIVS) { if (c === this || c.dead) continue; const dx = this.pos.x - c.pos.x, dz = this.pos.z - c.pos.z, dd = dx * dx + dz * dz; if (dd < .36 && dd > 1e-4) { const k = (.6 - Math.sqrt(dd)) * 2.5; this.sep.x += dx * k; this.sep.z += dz * k; } } }
    if (this.sep && this.mode === 'walk') tv.add(this.sep);
    this.vel.x = damp(this.vel.x, tv.x, 5, dt); this.vel.z = damp(this.vel.z, tv.z, 5, dt);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    const pushed = collideCircle(this.pos, .3, 0, 1.8); if (pushed && this.mode === 'walk' && !this.grp) this.pickDir();
    if (pushed && this.mode === 'flee') { const s = Math.random() < .5 ? 1 : -1; this.threat.add(new T.Vector3(-this.vel.z * s, 0, this.vel.x * s)); }
    for (const c of CARS) { const dx = this.pos.x - c.pos.x, dz = this.pos.z - c.pos.z; const dd = dx * dx + dz * dz; if (dd < 6) { if (c.occ && Math.abs(c.speed) > 6) { this.hurt(999, 'player'); return; } if (c.ai && Math.abs(c.speed) > 7) { this.hurt(999, null); return; } const L = Math.sqrt(dd) || 1; this.pos.x = c.pos.x + dx / L * 2.45; this.pos.z = c.pos.z + dz / L * 2.45; } }
    const sp = Math.hypot(this.vel.x, this.vel.z);
    let tf = null; if (faceTo && sp < .3) tf = Math.atan2(-(faceTo.x - this.pos.x), -(faceTo.z - this.pos.z)); else if (sp > .2) tf = Math.atan2(-this.vel.x, -this.vel.z);
    if (tf !== null) { let d = tf - this.face; d = Math.atan2(Math.sin(d), Math.cos(d)); this.face += d * Math.min(1, dt * 6); }
    this.st.speed = sp; this.st.hold = this.mode === 'cower' ? 'plead' : 'none'; this.st.t = this.t;
    this.st.flinch = Math.max(0, this.st.flinch - dt * 3);
    // animation LOD: near every frame, mid every few frames, far rarely
    this.aT = (this.aT || 0) + dt; const every = d2p < 22 * 22 ? 0 : d2p < 45 * 45 ? .066 : .2;
    if (this.aT >= every) { if (this.R.glb) animGLB(this.R, this.st, this.aT); else animRig(this.R, this.st, this.aT); this.aT = 0; }
    this.sync();
  }
  sync() { this.R.root.position.copy(this.pos); this.R.root.rotation.y = this.face; }
  remove() { scene.remove(this.R.root); const i = CIVS.indexOf(this); if (i >= 0) CIVS.splice(i, 1); if (this.grp) this.grp.members = this.grp.members.filter(m => m !== this); }
}
/* a group walks a loop around a block on the sidewalk (centre line 6 m in from the road centre),
   turning at corners or crossing the street to the next block; some groups stand and chat */
const SW = 6, SWL = 28;
class Group {
  constructor(i, j, edge, t, dir, standing) {
    this.i = i; this.j = j; this.edge = edge; this.t = t; this.dir = dir; this.speed = rand(1.15, 1.5); this.members = [];
    this.standing = standing; this.standT = standing ? rand(14, 40) : rand(25, 70); this.pos = new T.Vector3(); this.head = new T.Vector3(1, 0, 0); this.cross = null; this.place();
  }
  corner(i, j, k) { const bx = -HALF + i * CW, bz = -HALF + j * CW; return [[bx + SW, bz + SW], [bx + CW - SW, bz + SW], [bx + CW - SW, bz + CW - SW], [bx + SW, bz + CW - SW]][k]; }
  place() {
    if (this.cross) { const c = this.cross; this.pos.set(lerp(c.a[0], c.b[0], c.k), 0, lerp(c.a[1], c.b[1], c.k)); this.head.set(c.b[0] - c.a[0], 0, c.b[1] - c.a[1]).normalize(); return; }
    const a = this.corner(this.i, this.j, this.edge), b = this.corner(this.i, this.j, (this.edge + 1) % 4), k = this.t / SWL;
    this.pos.set(lerp(a[0], b[0], k), 0, lerp(a[1], b[1], k)); this.head.set(b[0] - a[0], 0, b[1] - a[1]).normalize().multiplyScalar(this.dir);
  }
  // side-by-side in pairs, a second row behind for bigger groups; standing groups make a loose circle
  slotPos(s) {
    if (this.standing) { const n = Math.max(2, this.members.length), a = s / n * TAU + this.i; const inward = new T.Vector3(-this.head.z, 0, this.head.x).multiplyScalar(this.dir); return this.pos.clone().addScaledVector(inward, .35).add(new T.Vector3(Math.cos(a) * .85, 0, Math.sin(a) * .85)); }
    const side = new T.Vector3(-this.head.z, 0, this.head.x); const row = Math.floor(s / 2), col = s % 2 ? .38 : -.38;
    return this.pos.clone().addScaledVector(side, (this.members.length === 1 ? 0 : col) * (this.cross ? 1.2 : 1)).addScaledVector(this.head, -row * .95);
  }
  update(dt) {
    if (this.alarm) { this.members.forEach(m => m.panic(this.alarm)); this.alarm = null; }
    this.standT -= dt;
    if (this.standing) { if (this.standT <= 0) { this.standing = false; this.standT = rand(25, 70); } this.place(); return; }
    if (this.standT <= 0 && !this.cross && Math.random() < .5) { this.standing = true; this.standT = rand(10, 25); return; }
    // wait for the slowest member
    let lag = 0; for (const m of this.members) lag = Math.max(lag, m.pos.distanceTo(this.slotPos(m.slot)));
    const v = this.speed * (lag > 2.5 ? .35 : 1) * dt;
    if (this.cross) {
      const c = this.cross; const L = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]);
      // don't step out in front of a moving car
      if (c.k < .05) { for (const car of CARS) if (car.ai && Math.abs(car.speed) > 2 && car.pos.distanceToSquared(this.pos) < 16 * 16) { this.place(); return; } }
      c.k += v / L; if (c.k >= 1) { this.i = c.ni; this.j = c.nj; this.t = this.dir > 0 ? 0 : SWL; this.cross = null; }
      this.place(); return;
    }
    this.t += v * this.dir;
    if (this.t > SWL || this.t < 0) {
      const endK = this.dir > 0 ? (this.edge + 1) % 4 : this.edge; const vdir = this.head.clone();
      const ni = this.i + Math.round(vdir.x), nj = this.j + Math.round(vdir.z);
      if (Math.random() < .35 && ni >= 0 && ni < 12 && nj >= 0 && nj < 12) { const a = this.corner(this.i, this.j, endK); this.cross = { a, b: [a[0] + vdir.x * 2 * SW, a[1] + vdir.z * 2 * SW], k: 0, ni, nj }; this.t = clamp(this.t, 0, SWL); }
      else { this.edge = (this.edge + this.dir + 4) % 4; this.t = this.dir > 0 ? 0 : SWL; }
    }
    this.place();
  }
}
function nearestCiv(p, r) { let b = null, bd = r * r; for (const c of CIVS) { if (c.dead) continue; const d = c.pos.distanceToSquared(p); if (d < bd) { bd = d; b = c; } } return b; }
let civT = 0;
function spawnGroup() {
  for (let tries = 0; tries < 10; tries++) {
    const a = Math.random() * TAU, r = rand(G.started && CIVS.length > 6 ? 16 : 6, 70); const x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
    if (CIVS.length > 6 && r < 38) { const cf = new T.Vector3(); camera.getWorldDirection(cf); if (Math.cos(a) * cf.x + Math.sin(a) * cf.z > -.2) continue; } // close spawns only behind the camera
    const i = Math.floor((x + HALF) / CW), j = Math.floor((z + HALF) / CW); if (i < 0 || j < 0 || i > 11 || j > 11) continue;
    const g = new Group(i, j, Math.floor(Math.random() * 4), rand(2, SWL - 2), Math.random() < .5 ? 1 : -1, Math.random() < .25);
    const t = g.pos.clone(); collideCircle(t, .4, 0, 1.8); if (t.distanceTo(g.pos) > .3) continue;
    const n = Math.random() < .3 ? 1 : Math.random() < .55 ? 2 : Math.random() < .6 ? 3 : rint(4, 5);
    for (let k = 0; k < n; k++) { const p = g.slotPos(k); const c = new Civ(p.x, p.z, g, k); g.members.push(c); CIVS.push(c); }
    GROUPS.push(g); return true;
  }
  return false;
}
function updateCivs(dt) {
  if (G.state !== 'city' || G.inside || !G.started) { for (const c of CIVS) c.R.root.visible = !G.inside; return; }
  for (const c of CIVS) c.R.root.visible = true;
  civT -= dt;
  const cap = G.quality === 'high' ? 46 : 28;
  const want = Math.max(10, Math.round(cap - G.hour * (cap * .045)));
  if (civT <= 0) {
    civT = .6;
    for (const c of CIVS.slice()) { const d = c.pos.distanceTo(P.pos); if (d > 105 || (c.dead && c.deadT > 14)) c.remove(); }
    for (let i = GROUPS.length - 1; i >= 0; i--) if (!GROUPS[i].members.length) GROUPS.splice(i, 1);
    const alive = CIVS.filter(c => !c.dead).length; if (alive < want) { spawnGroup(); if (alive < want * .5) { spawnGroup(); spawnGroup(); } }
  }
  for (const g of GROUPS) g.update(dt);
  for (let i = CIVS.length - 1; i >= 0; i--) CIVS[i] && CIVS[i].update(dt);
}
