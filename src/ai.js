/* =====================================================================
   RED NIGHT — AI: perception (sight cone + hearing), tactical purgers
   (cover, peeking, suppression, flanking squads, retreat, molotovs, frags),
   HEAT, monsters that stalk civilians until they notice you, and civilians,
   who run for a doorway or drop behind a parked car when it starts.
   ===================================================================== */
const _av1 = new T.Vector3(), _av2 = new T.Vector3(), _av3 = new T.Vector3(), _av4 = new T.Vector3(), _av5 = new T.Vector3(), _avUp = new T.Vector3(0, 1, 0);

/* ---------- grid ray: rayBoxes' answer from the boxes in the 20 m cells the ray crosses, not a scan of all ~3k ---------- */
let _rq = 0; const _rgHit = { t: 0, ax: 0, sg: 0, box: null, n: new T.Vector3() }, _rgD = new T.Vector3();
function rayGrid(o, d, maxT) {
  if (++_rq === 1) for (const b of BOX) b._rq = 0; // stamp every box up front so they keep one hidden class
  let best = maxT, ax = -1, sg = 0, bb = null, ci = Math.floor(o.x / CELL), cj = Math.floor(o.z / CELL);
  const adx = Math.abs(d.x), adz = Math.abs(d.z), si = d.x > 0 ? 1 : -1, sj = d.z > 0 ? 1 : -1;
  const ddx = adx > 1e-9 ? CELL / adx : 1e30, ddz = adz > 1e-9 ? CELL / adz : 1e30;
  let tx = adx > 1e-9 ? ((d.x > 0 ? ci + 1 : ci) * CELL - o.x) / d.x : 1e30, tz = adz > 1e-9 ? ((d.z > 0 ? cj + 1 : cj) * CELL - o.z) / d.z : 1e30;
  for (let tc = 0, n = 0; tc <= best && n < 64; n++) {
    const l = grid.get(gk(ci, cj));
    if (l) for (let k = 0; k < l.length; k++) {
      const b = l[k]; if (b._rq === _rq || !b.shoot) continue; b._rq = _rq;
      let t0 = 0, t1 = best, na = -1, ns = 0;
      if (adx < 1e-9) { if (o.x < b.x0 || o.x > b.x1) continue; }
      else { let ta = (b.x0 - o.x) / d.x, tb = (b.x1 - o.x) / d.x, s = -1; if (ta > tb) { const q = ta; ta = tb; tb = q; s = 1; } if (ta > t0) { t0 = ta; na = 0; ns = s; } if (tb < t1) t1 = tb; if (t0 > t1) continue; }
      if (Math.abs(d.y) < 1e-9) { if (o.y < b.y0 || o.y > b.y1) continue; }
      else { let ta = (b.y0 - o.y) / d.y, tb = (b.y1 - o.y) / d.y, s = -1; if (ta > tb) { const q = ta; ta = tb; tb = q; s = 1; } if (ta > t0) { t0 = ta; na = 1; ns = s; } if (tb < t1) t1 = tb; if (t0 > t1) continue; }
      if (adz < 1e-9) { if (o.z < b.z0 || o.z > b.z1) continue; }
      else { let ta = (b.z0 - o.z) / d.z, tb = (b.z1 - o.z) / d.z, s = -1; if (ta > tb) { const q = ta; ta = tb; tb = q; s = 1; } if (ta > t0) { t0 = ta; na = 2; ns = s; } if (tb < t1) t1 = tb; if (t0 > t1) continue; }
      if (t0 > 0 && t0 < best && na >= 0) { best = t0; ax = na; sg = ns; bb = b; }
    }
    if (tx < tz) { tc = tx; tx += ddx; ci += si; } else { tc = tz; tz += ddz; cj += sj; }
  }
  if (d.y < 0) { const tg = -o.y / d.y; if (tg > 0 && tg < best) { best = tg; ax = 1; sg = 1; bb = null; } }
  if (ax < 0) return null;
  const h = _rgHit; h.t = best; h.ax = ax; h.sg = sg; h.box = bb; h.n.set(0, 0, 0).setComponent(ax, sg); return h;
}
// losClear on the grid (same .3 m slack, cars block, your own car doesn't); world only when cars shouldn't count
function aiLos(a, b, noCars) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.sqrt(dx * dx + dy * dy + dz * dz); if (L < 1e-4) return true;
  _rgD.set(dx / L, dy / L, dz / L);
  const h = rayGrid(a, _rgD, L); if (h && h.t < L - .3) return false;
  if (!noCars && typeof rayCar === 'function') { const c = rayCar(a, _rgD, L - .3); if (c && !(P.inCar && c.car === P.inCar)) return false; }
  return true;
}

/* ---------- HEAT 0..5: how loud the night is around you. Gunfire people hear, bodies, blasts and roadkill raise it;
   it only cools while nothing has eyes on you (faster behind a door). Squads coordinate harder and traffic spooks easier as it climbs. ---------- */
const HEAT = {
  level: 0, lk: new T.Vector3(), lkT: -99, calm: 0, still: 0, shotT: -9, scanT: 0,
  add(n) { if (!(n > 0) || !G.started) return; this.level = Math.min(5, this.level + n * (1 - this.level * .12)); this.calm = 0; },
  shot(heard) { if (heard > 0 && G.t - this.shotT > .35) { this.shotT = G.t; this.add(.03 + Math.min(heard, 6) * .006); } }, // a sustained fight, not one burst, is what lights you up
  update(dt) {
    if (!G.started) return;
    this.still = P.vel.x * P.vel.x + P.vel.z * P.vel.z < .8 && !P.inCar && !P.dead ? this.still + dt : 0;
    if ((this.scanT -= dt) <= 0) { this.scanT = .25; this.scan(); }
    this.calm += dt; if (this.calm > 6) this.level = Math.max(0, this.level - dt * (G.inside ? .16 : .045));
  },
  scan() { // eyes on you, fresh bodies (purgers count most: they're the organised ones), cars that just went up
    let eyes = false;
    for (const e of ENEMIES) {
      if (!e.dead) { if (e.seesP) eyes = true; continue; }
      if (e._hk) continue; e._hk = 1; if (e.deadT > 1.5 || e.pos.distanceToSquared(P.pos) > 140 * 140) continue;
      let k = e.type === 'purger' ? (e.possessed ? .55 : .35) : .18; if (P.inCar && Math.abs(P.inCar.speed) > 5 && e.pos.distanceToSquared(P.inCar.pos) < 30) k += .3; this.add(k);
    }
    if (eyes) { this.calm = 0; this.lk.copy(P.pos); this.lkT = G.t; }
    for (const c of CARS) if (c.dead && !c._hx) { c._hx = 1; if (c.pos.distanceToSquared(P.pos) < 100 * 100) this.add(.5); }
  },
};
window.HEAT = HEAT;

/* ---------- noise events ---------- */
const NOISES = []; let _noiseI = 0;
// returns how many people (enemies + civilians) heard it
function makeNoise(pos, radius, kind) {
  let nz = NOISES[_noiseI]; if (!nz) nz = NOISES[_noiseI] = { p: new T.Vector3(), r: 0, t: 0, kind: '' }; _noiseI = (_noiseI + 1) % 20;
  nz.p.copy(pos); nz.r = radius; nz.t = G.t; nz.kind = kind;
  let heard = 0;
  for (const e of ENEMIES) { if (e.dead || (kind === 'eshot' && e.aware)) continue; const d = e.pos.distanceTo(pos); if (d < radius) { alertEnemy(e, pos, d < radius * .4 ? 1.5 : 5); heard++; } }
  for (const c of CIVS) { if (c.dead) continue; if (c.pos.distanceTo(pos) < radius * .8) { c.panic(pos); heard++; } }
  return heard;
}
function alertEnemy(e, pos, fuzz) {
  if (e.mode === 'disguise') return;
  e.aware = true; e.awareT = G.t; (e.lastKnown || (e.lastKnown = new T.Vector3())).set(pos.x + rand(-fuzz, fuzz), pos.y, pos.z + rand(-fuzz, fuzz));
}
// the player's shots tell everyone in earshot, and rattle anyone the rounds pass near
function playerShotNoise(o, d, len, sup) {
  const heard = makeNoise(P.pos, sup ? 16 : 75, 'shot'); if (!sup) trafficPanic(P.pos);
  if (heard) { HEAT.shot(heard); HEAT.lk.copy(P.pos); HEAT.lkT = G.t; }
  for (const e of ENEMIES) {
    if (e.dead) continue; const v = _av1.set(e.pos.x - o.x, e.pos.y + 1.68 * e.scale * (e.st.crouch ? .8 : 1) - o.y, e.pos.z - o.z); const t = clamp(v.dot(d), 0, len); const miss = v.addScaledVector(d, -t).length();
    if (miss < 1.8 && t > 2) { e.supp = Math.min(1, (e.supp || 0) + (1.8 - miss) * .35); if (e.aware) e.lastKnown.copy(P.pos); else alertEnemy(e, P.pos, 3); }
  }
}

/* ---------- perception tick (all enemies) ---------- */
function perceive(e, dt, dist) {
  e.percT = (e.percT || 0) - dt; e.supp = Math.max(0, (e.supp || 0) - dt * .35);
  if (e.percT > 0) return; e.percT = .25 + Math.random() * .1;
  if (G.inside && !e.clubber) { e.seesP = false; return; }
  const tx = P.pos.x - e.pos.x, tz = P.pos.z - e.pos.z, L = Math.hypot(tx, tz) || 1;
  const fov = (tx * -Math.sin(e.face) + tz * -Math.cos(e.face)) / L > (e.aware ? -.2 : .45);  // ~120° unaware, wider once alert
  const range = (e.aware ? 70 : 45 * (1 + HEAT.level * .06)) * (P.crouching ? .7 : 1);         // a hot night has everyone looking
  const feel = dist < (P.crouching ? 3 : 6);
  let sees = false;
  if (!P.dead && (feel || (fov && dist < range))) sees = aiLos(_av1.set(e.pos.x, e.pos.y + 1.68 * e.scale * (e.st.crouch ? .8 : 1), e.pos.z), _av2.set(P.pos.x, P.pos.y + P.eyeH, P.pos.z));
  e.seesP = sees;
  if (sees) { if (!e.aware) { e.reactT = rand(.45, .85); e.spotT = G.t; } alertEnemy(e, P.pos, 0); e.lastSeen = G.t; }
  if (e.aware && G.t - (e.lastSeen || -99) > 14 && G.t - (e.awareT || -99) > 14) { e.aware = false; e.searchT = 0; } // lost you for good
}

/* ---------- navigation: straight if clear, else hop between street intersections ---------- */
const _nav = []; for (let k = 0; k < 13; k++) _nav.push({ p: new T.Vector3(), b: 0 });
function navPoint(e, tgt) {
  e.navCk = (e.navCk || 0) - G.dt;
  if (e.navCk > 0 && e.navTo && e.navTo.distanceToSquared(tgt) < 4) return e.navWp || tgt;
  e.navCk = .6; e.navTo = (e.navTo || new T.Vector3()).copy(tgt);
  const from = _av1.set(e.pos.x, 1.1, e.pos.z);
  if (aiLos(from, _av2.set(tgt.x, 1.1, tgt.z))) { e.navWp = null; return tgt; }
  if (e.navWp && e.pos.distanceTo(e.navWp) > 2.5 && aiLos(from, _av2.set(e.navWp.x, 1.1, e.navWp.z))) return e.navWp;
  const ci = Math.round((e.pos.x + HALF) / CW), cj = Math.round((e.pos.z + HALF) / CW); let n = 0;
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) { const c = _nav[n++]; c.p.set(-HALF + i * CW + rand(-2, 2), 0, -HALF + j * CW + rand(-2, 2)); c.b = 0; }
  // street points square-on to the target (the mouth of the alley / gap it's in), which can see it
  const xa = -HALF + Math.floor((tgt.x + HALF) / CW) * CW, za = -HALF + Math.floor((tgt.z + HALF) / CW) * CW;
  for (let k = 0; k < 4; k++) { const c = _nav[n++]; c.p.set(k === 0 ? xa : k === 1 ? xa + CW : tgt.x, 0, k === 2 ? za : k === 3 ? za + CW : tgt.z); c.b = aiLos(_av2.set(c.p.x, 1.1, c.p.z), _av3.set(tgt.x, 1.1, tgt.z)) ? -25 : 8; }
  let best = null, bs = 1e9;
  for (let k = 0; k < n; k++) {
    const c = _nav[k], dn = c.p.distanceTo(e.pos); if (dn < 3) continue;
    const sc = dn + c.p.distanceTo(tgt) * 1.25 + c.b; if (sc >= bs) continue;   // score first: the LOS test is the expensive part
    if (!aiLos(from, _av2.set(c.p.x, 1.1, c.p.z))) continue;
    bs = sc; best = c.p;
  }
  if (!best) { e.navWp = null; return tgt; }
  e.navWp = (e._nwp || (e._nwp = new T.Vector3())).copy(best); return e.navWp;
}

/* ---------- cover ---------- */
const _cc = []; let _ccN = 0;
const _ccPush = (x, z) => { const v = _cc[_ccN] || (_cc[_ccN] = new T.Vector3()); _ccN++; return v.set(x, 0, z); };
function coverCandidates(e) {
  _ccN = 0;
  // the far side of parked cars and low street clutter (crates, dumpsters, barriers), then random probes
  for (const c of CARS) { if (c.gone || c === P.inCar || c.pos.distanceToSquared(e.pos) > 22 * 22) continue; let ux = c.pos.x - P.pos.x, uz = c.pos.z - P.pos.z; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul; for (const k of [0, 1.6, -1.6]) _ccPush(c.pos.x + ux * 2.3 - uz * k, c.pos.z + uz * 2.3 + ux * k); }
  for (const b of boxesNear(e.pos.x, e.pos.z)) { if (b.y1 < .9 || b.y1 > 2.2 || b.water || _ccN > 56) continue; const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2; let ux = cx - P.pos.x, uz = cz - P.pos.z; const ul = Math.hypot(ux, uz) || 1; const r = Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2 + .7; _ccPush(cx + ux / ul * r, cz + uz / ul * r); }
  for (let k = 0; k < 8; k++) { const a = Math.random() * TAU, r = rand(3, 13); _ccPush(e.pos.x + Math.cos(a) * r, e.pos.z + Math.sin(a) * r); }
  return _ccN;
}
function findCover(e, from) {
  let best = null, bs = 1e9, bpk = false; const tgt = from || _av5.set(P.pos.x, P.pos.y + P.eyeH, P.pos.z);
  const n = coverCandidates(e);
  for (let i = 0; i < n; i++) {
    const p = _cc[i], r = p.distanceTo(e.pos); if (r > 22) continue;
    const dP = p.distanceTo(P.pos); if (dP < 7 || dP > 42) continue;
    let taken = false; for (const o of ENEMIES) if (o !== e && o.cover && o.cover.p.distanceToSquared(p) < 1.5) { taken = true; break; } if (taken) continue;
    const test = _av4.copy(p); collideCircle(test, .5, 0, 1.8); if (test.distanceTo(p) > .05) continue;
    if (aiLos(_av1.set(p.x, 1.0, p.z), tgt)) continue;                                        // must hide a crouched body
    const peek = aiLos(_av1.set(p.x, 1.65, p.z), tgt) || aiLos(_av1.set(p.x + .9, 1.65, p.z), tgt) || aiLos(_av1.set(p.x, 1.65, p.z + .9), tgt);
    const s = r + (peek ? 0 : 6) + Math.abs(dP - 20) * .25;
    if (s < bs) { bs = s; best = p; bpk = peek; }
  }
  return best ? { p: best.clone(), peek: bpk } : null;
}

/* ---------- squad director: who suppresses, who flanks, who radios it in ---------- */
let squadT = 0;
const _sqL = [], _sqCmp = (a, b) => (a.sq || 0) - (b.sq || 0) || a._d2 - b._d2;
function updateSquads(dt) {
  HEAT.update(dt);
  squadT -= dt; if (squadT > 0) return; squadT = .6;
  const heat = HEAT.level; _sqL.length = 0;
  for (const e of ENEMIES) {
    if (e.dead || e.type !== 'purger') continue;
    if (!e.aware) { // on a hot night the idle ones drift in on where you were last heard or seen
      if (heat >= 1.5 && !G.inside && G.t - HEAT.lkT < 20 && e.pos.distanceToSquared(HEAT.lk) < (40 + heat * 22) ** 2 && Math.random() < heat * .03) alertEnemy(e, HEAT.lk, 8 - heat);
      continue;
    }
    e._d2 = e.dist2(); _sqL.push(e);
  }
  if (!_sqL.length) return;
  _sqL.sort(_sqCmp);
  for (let i0 = 0; i0 < _sqL.length;) { const sq = _sqL[i0].sq || 0; let i1 = i0 + 1; while (i1 < _sqL.length && (_sqL[i1].sq || 0) === sq) i1++; squadRoles(i0, i1, heat); i0 = i1; }
}
// one squad (a gang crew, or the street's loose purgers as squad 0), nearest first
function squadRoles(i0, i1, heat) {
  let cx = 0, cz = 0, nr = 0, eyes = false;
  for (let i = i0; i < i1; i++) { const e = _sqL[i]; cx += e.pos.x; cz += e.pos.z; if (e.ranged) nr++; if (e.seesP) eyes = true; }
  cx /= i1 - i0; cz /= i1 - i0;
  // whoever has eyes on you calls it out; the hotter the night the tighter the callout
  if (eyes) { const f = Math.max(0, 3.5 - heat); for (let i = i0; i < i1; i++) { const e = _sqL[i]; if (e.seesP) continue; e.lastKnown.set(P.pos.x + rand(-f, f), 0, P.pos.z + rand(-f, f)); e.awareT = G.t; } }
  const tg = eyes ? P.pos : G.t - HEAT.lkT < 8 ? HEAT.lk : _sqL[i0].lastKnown;
  let ax = cx - tg.x, az = cz - tg.z; const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
  const nSup = heat >= 3 ? 1 : 2, flankMin = heat >= 2 ? 2 : 3, wide = 16 + heat * 2; let ri = 0;
  for (let i = i0; i < i1; i++) {
    const e = _sqL[i];
    if (e.role === 'retreat') continue;
    if (!e.ranged) { e.role = 'rush'; e.flankSide = i % 2 ? 1 : -1; continue; }
    if (ri < nSup || nr < flankMin) e.role = 'suppress'; // indexes count gunmen only: rushers used to take the suppress slots
    else if (e.role !== 'flank') { e.role = 'flank'; e.flankSide = ri % 2 ? 1 : -1; e.flankPt = (e.flankPt || new T.Vector3()).set(tg.x - az * wide * e.flankSide + ax * 4, 0, tg.z + ax * wide * e.flankSide + az * 4); collideCircle(e.flankPt, .5, 0, 1.8); e.flankT = 9; }
    ri++;
  }
}

/* ---------- tactical purger ---------- */
function purgerAI(e, dt, dist) {
  const px = P.pos.x, pz = P.pos.z; const spd = e.speed * (e.possessed ? 1.4 : 1);
  if (!e.aware) return idleAI(e, dt, dist);
  if (e.hp < e.maxHp * .32 && e.role !== 'retreat' && !e.possessed) { e.role = 'retreat'; e.cover = null; e.coverT = 0; makeNoise(e.pos, 30, 'callout'); }
  const tgt = e.seesP || G.t - (e.lastSeen || -99) < 1.2 ? P.pos : e.lastKnown;
  if (!e.ranged) { // melee rusher: arc in from the side, sprint the last stretch
    const nv = e.seesP ? tgt : navPoint(e, tgt); let tx = nv.x - e.pos.x, tz = nv.z - e.pos.z; const d0 = Math.hypot(tx, tz) || 1; tx /= d0; tz /= d0; const d = e.pos.distanceTo(tgt);
    const arc = d > 5 && e.seesP ? .55 * (e.flankSide || 1) : 0; let dx = tx - tz * arc, dz = tz + tx * arc; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    const s = d > 2 ? spd * (d < 12 ? 1.35 : 1) : 0; e.vel.x = damp(e.vel.x, dx * s, 8, dt); e.vel.z = damp(e.vel.z, dz * s, 8, dt);
    e.turnTo(tgt.x, tgt.z, dt, 9); e.melee(1.9, 14, .55, 1.0, dist); return;
  }
  // ranged. Lost sight for a while → leave cover and hunt; the suppressor holds the angle a bit longer, flankers swing wide
  const lostFor = e.seesP ? 0 : G.t - (e.lastSeen || -99);
  const lost = lostFor > (e.role === 'suppress' ? 9 : 4);
  if (lost && e.cover) { e.cover = null; e.coverT = 3; }
  if (lost && e.role === 'flank' && !(e.flankT > 0) && e.lastKnown) { let sx = -(e.lastKnown.z - e.pos.z), sz = e.lastKnown.x - e.pos.x; const sl = Math.hypot(sx, sz) || 1; e.flankPt = (e.flankPt || new T.Vector3()).set(e.lastKnown.x + sx / sl * 9 * (e.flankSide || 1), 0, e.lastKnown.z + sz / sl * 9 * (e.flankSide || 1)); collideCircle(e.flankPt, .5, 0, 1.8); e.flankT = 7; }
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
  if (inCover && (e.cvT = (e.cvT || 0) - dt) <= 0) { e.cvT = .5; if (aiLos(_av4.set(e.cover.p.x, 1.0, e.cover.p.z), _av5.set(P.pos.x, P.pos.y + P.eyeH, P.pos.z))) { e.cover = null; e.coverT = 0; inCover = false; } }
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
  // molotov to flush a player who's been hiding (the cooldown now runs all the time, not only inside the throw window)
  if (e.molotov) { e.moloCd = (e.moloCd || 0) - dt; const ls = G.t - (e.lastSeen || -99); if (e.moloCd <= 0 && !e.seesP && ls > 2.5 && ls < 10 && dist > 7 && dist < 26) { e.moloCd = rand(9, 14); if (aiLos(_av4.set(e.pos.x, 3.2, e.pos.z), _av5.set(e.lastKnown.x, 1.2, e.lastKnown.z))) throwMolotov(e, e.lastKnown); else e.moloCd = 2; } }
  // frag: for a player dug in behind cover, or camping one spot
  if (e.frags === undefined) e.frags = !e.molotov && Math.random() < .3 + HEAT.level * .06 ? rint(1, 2) : 0;
  if (e.frags > 0) { if (e.fragCd === undefined) e.fragCd = rand(2, 5); if ((e.fragCd -= dt) <= 0) fragTry(e); }
}

// unaware: patrol, or prey on a civilian if one is close (the search and its sightline refresh a few times a second, not every frame)
function idleAI(e, dt, dist) {
  if ((e.preyT = (e.preyT || 0) - dt) <= 0 || (e.preyCiv && (e.preyCiv.dead || e.preyCiv.gone))) {
    e.preyT = .3; const prey = e.mode !== 'disguise' ? nearestCiv(e.pos, e.type === 'purger' ? 22 : 30) : null; e.preyCiv = prey;
    e.preyLos = !!prey && e.type === 'purger' && e.ranged && prey.pos.distanceToSquared(e.pos) < 400 && aiLos(_av1.set(e.pos.x, e.pos.y + 1.68 * e.scale, e.pos.z), _av2.set(prey.pos.x, 1.4, prey.pos.z));
  }
  const prey = e.preyCiv;
  if (prey) {
    const d = prey.pos.distanceTo(e.pos);
    if (e.preyLos && d < 20) {
      e.vel.x = damp(e.vel.x, 0, 6, dt); e.vel.z = damp(e.vel.z, 0, 6, dt); e.turnTo(prey.pos.x, prey.pos.z, dt, 8); e.st.aimHoldCiv = 1;
      if (e.cd <= 0) { e.cd = rand(.6, 1.2); civFire(e, prey); }
    } else {
      e.moveToward(prey.pos.x, prey.pos.z, d > 2 ? e.speed * .9 : 0, dt); e.turnTo(prey.pos.x, prey.pos.z, dt, 8);
      if (d < 2 && e.cd <= 0) { e.cd = 1.1; e.atk = e.atkDur = .55; setTimeout(() => { if (!e.dead && !prey.dead && prey.pos.distanceTo(e.pos) < 2.6) { prey.hurt(e.type === 'vampire' ? 35 : 25, e); if (e.type === 'vampire') e.hp = Math.min(e.maxHp, e.hp + 20); } }, 270); }
    }
    return;
  }
  if (!e.wDir || Math.random() < dt * .25) { e.wDir = Math.random() * TAU; if (e.type === 'purger' && HEAT.level >= 2.5 && G.t - HEAT.lkT < 30 && Math.random() < .7) e.wDir = Math.atan2(HEAT.lk.x - e.pos.x, HEAT.lk.z - e.pos.z) + rand(-.5, .5); } // hot night: patrols drift your way
  const sp = e.type === 'witch' ? 1.8 : 1.5; e.vel.x = damp(e.vel.x, Math.sin(e.wDir) * sp, 2, dt); e.vel.z = damp(e.vel.z, Math.cos(e.wDir) * sp, 2, dt);
  e.turnTo(e.pos.x + e.vel.x, e.pos.z + e.vel.z, dt, 3);
  if (e.type === 'witch') e.pos.y = .7 + Math.sin(e.t * 2) * .25;
}

/* ---------- enemy fire: real rays (cover works, cars soak bullets) ---------- */
const _ef = new T.Vector3(), _efT = new T.Vector3(), _efD = new T.Vector3(), _efR = new T.Vector3(), _efU = new T.Vector3(), _efE = new T.Vector3(), _efN = new T.Vector3(), _efH = { t: 0, n: null, box: null };
function enemyFire(e, dmg, dist, moving) {
  const fx = -Math.sin(e.face), fz = -Math.cos(e.face);
  const from = _ef.set(e.pos.x + fx * .5, (e.st.crouch ? 1.0 : 1.38) * e.scale, e.pos.z + fz * .5);
  const tgt = _efT.set(P.pos.x, P.pos.y + P.eyeH + (P.crouching ? -.25 : -.4), P.pos.z);
  const pv = Math.hypot(P.vel.x, P.vel.z);
  const spread = (1.5 + dist * .055 + pv * .55 + (P.slide > 0 ? 2 : 0) + e.supp * 4.5 + (moving ? 1.8 : 0) - (e.possessed ? .6 : 0)) * (P.inCar ? 1.6 : 1) * (e.shotsAt ? 1 : 1.5); // first shots go wide
  e.shotsAt = (e.shotsAt || 0) + 1;
  const d = _efD.subVectors(tgt, from).normalize(); const r = Math.sqrt(Math.random()) * spread * Math.PI / 180, a = Math.random() * TAU;
  const right = _efR.set(-d.z, 0, d.x).normalize(), up = _efU.crossVectors(right, d);
  d.addScaledVector(right, Math.cos(a) * Math.tan(r)).addScaledVector(up, Math.sin(a) * Math.tan(r)).normalize();
  // what's in the way?
  const L = 120; let tHit = L, what = 0, ch = null, civ = null, box = null;
  const wh = rayGrid(from, d, L); if (wh) { tHit = wh.t; what = 1; box = wh.box; _efN.copy(wh.n); }
  const cr = rayCar(from, d, tHit); if (cr && !(P.inCar && cr.car === P.inCar)) { tHit = cr.t; what = 2; ch = cr; }
  const pt = rayVCapsule(from, d, P.pos.x, P.pos.z, P.pos.y + .1, P.pos.y + (P.crouching ? 1.15 : 1.7), P.inCar ? .9 : .35);
  if (pt > 0 && pt < tHit) { tHit = pt; what = 3; }
  for (const c of CIVS) { if (c.dead) continue; const tc = rayVCapsule(from, d, c.pos.x, c.pos.z, .1, 1.7, .32); if (tc > 0 && tc < tHit) { tHit = tc; what = 4; civ = c; } }
  const end = _efE.copy(from).addScaledVector(d, tHit);
  tracer(from, end, 0xff6060, 1.3); FXA.emit(from.x, from.y, from.z, 0, 0, 0, .06, .5, .7, COL.spark, 1);
  AU.farShot(e.pos, !!e.heavyGun); if ((e.shotsAt % 4) === 1) { makeNoise(e.pos, 45, 'eshot'); if (HEAT.level >= 2) trafficPanic(e.pos); }
  if (what === 3) { if (P.inCar) { carHit(P.inCar, dmg * 2, end, _efN.copy(d).negate(), false); damagePlayer(dmg * .5, e.pos, e); } else damagePlayer(dmg, e.pos, e); return; }
  if (what === 2) { carHit(ch.car, dmg * 2, end, ch.n, ch.glass); return; }
  if (what === 4) { civ.hurt(dmg * 2, e); return; }
  if (what === 1) { _efH.t = tHit; _efH.n = _efN; _efH.box = box; impact(end, _efN, surfOfHit(_efH, end), { size: .14 }); }
  // near miss: bullet crack past your head (into a wall, or on out into the night)
  const v = _efT.set(P.pos.x - from.x, P.pos.y + P.eyeH - from.y, P.pos.z - from.z); const tt = clamp(v.dot(d), 0, tHit); const miss = v.addScaledVector(d, -tt).length();
  if (miss < 2.2) { const sp = spatial(e.pos); AU.play('whiz_' + (1 + Math.floor(Math.random() * 2)), { vol: .7, pan: sp.pan }) || AU.nz(.08, 'highpass', 6000, 2500, 1, .3, sp.pan); P.suppressed = Math.min(1, (P.suppressed || 0) + .25); }
}
function civFire(e, c) {
  tracer(_av1.set(e.pos.x, 1.38, e.pos.z), _av2.set(c.pos.x, rand(.9, 1.5), c.pos.z), 0xff6060, 1.2); AU.farShot(e.pos, false); if (Math.random() < .55) c.hurt(18, e);
  if ((e.civShots = (e.civShots || 0) + 1) % 3 === 1) for (const o of CIVS) if (o !== c && !o.dead && o.pos.distanceToSquared(e.pos) < 28 * 28) o.panic(e.pos); // the street scatters
}

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
    const sp = o.v.length(); const hitW = sp > 1e-3 && rayGrid(o.m.position, _av1.copy(o.v).divideScalar(sp), sp * dt + .1);
    if (o.m.position.y <= .05 || hitW || o.t > 3) {
      const p = o.m.position.clone().setY(0); scene.remove(o.m); MOLOS.splice(i, 1);
      const s = spatial(p); AU.play('glass_shatter', { vol: .7 * s.vol, pan: s.pan }); AU.play('fire_whoosh', { vol: .8 * s.vol, pan: s.pan }) || AU.nz(.8, 'lowpass', 1200, 200, 1, .5 * s.vol, s.pan);
      const fires = []; for (let k = 0; k < 5; k++) { const f = { p: p.clone().add(new T.Vector3(rand(-1.6, 1.6), .2, rand(-1.6, 1.6))), s: rand(.7, 1.1) }; FIRES.push(f); fires.push(f); }
      const ls = { p: p.clone().setY(1.5), c: new T.Color(0xff6a10), i: 4, d: 16, f: 1, aiFire: 1 }; LS.push(ls);
      FIREZONES.push({ p, r: 3.2, t: 6.5, fires, ls }); makeNoise(p, 40, 'fire'); HEAT.add(.12);
    }
  }
  for (let i = FIREZONES.length - 1; i >= 0; i--) {
    const z = FIREZONES[i]; z.t -= dt;
    if (P.pos.distanceTo(z.p) < z.r && !P.inCar) { damagePlayer(24 * dt, z.p, null); }
    for (const e of ENEMIES) if (!e.dead && e.pos.distanceTo(z.p) < z.r) e.hurt(30 * dt, null, null, true);
    for (const c of CIVS) if (!c.dead && c.pos.distanceTo(z.p) < z.r) c.hurt(40 * dt, null);
    if (z.t <= 0) { z.fires.forEach(f => { const k = FIRES.indexOf(f); if (k >= 0) FIRES.splice(k, 1); }); z.ls.i = 0; const k = LS.indexOf(z.ls); if (k >= 0) LS.splice(k, 1); FIREZONES.splice(i, 1); } // its light used to stay in LS forever
  }
  updateFrags(dt);
}

/* ---------- frag grenades: a lob into the spot you're hiding in; 2.5 s fuse, beeping, a red ring where it lies ---------- */
const FRAGS = [], FRAGSQ = {}, FRAGM = {}, FRAG_R = 7, _fbDirt = new T.Color(0x3a3026), _fbC = new T.Vector3(); let _fragFeedT = -99;
function fragGet() {
  for (const g of FRAGS) if (!g.live) return g;
  if (FRAGS.length >= 4) return null;
  if (!FRAGM.body) { FRAGM.body = new T.SphereGeometry(.06, 8, 6); FRAGM.led = new T.BoxGeometry(.024, .024, .024); FRAGM.ring = new T.RingGeometry(.92, 1.06, 40); FRAGM.ring.rotateX(-Math.PI / 2); }
  const m = new T.Group(); m.add(new T.Mesh(FRAGM.body, STD(0x343a2c, .55, .45)));
  const led = new T.Mesh(FRAGM.led, NEON(0xff2020)); led.position.y = .066; m.add(led);
  const rm = new T.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending });
  const ring = new T.Mesh(FRAGM.ring, rm); ring.renderOrder = 4; m.visible = ring.visible = false; scene.add(m, ring);
  const g = { m, led, ring, rm, p: m.position, v: new T.Vector3(), fuse: 0, live: false, owner: null, sq: 0, beepT: 0, pulse: 0, rest: false, touched: false };
  FRAGS.push(g); return g;
}
const fragLive = sq => { for (const g of FRAGS) if (g.live && g.sq === sq) return true; return false; };
// throw rules: you're behind cover (lost sight 1.2-9 s) or standing still in the open; 9-30 m; one in the air per squad; no friends at the target
function fragTry(e) {
  e.fragCd = .7;
  const ls = G.t - (e.lastSeen || -99), hiding = !e.seesP && ls > 1.2 && ls < 9, camping = e.seesP && e.reactT <= 0 && HEAT.still > 1.8;
  if (!(hiding || camping) || e.atk > 0) return;
  const at = hiding ? e.lastKnown : P.pos, d = Math.hypot(at.x - e.pos.x, at.z - e.pos.z); if (d < 9 || d > 30) return;
  const sq = e.sq || 0; if (fragLive(sq) || G.t - (FRAGSQ[sq] || -99) < 5) return;
  for (const o of ENEMIES) if (o !== e && !o.dead && o.pos.distanceToSquared(at) < 20) return;
  if (!aiLos(_av4.set(e.pos.x, 3.4, e.pos.z), _av5.set(at.x, 1.2, at.z), true)) return; // needs an arc over the cover
  throwFrag(e, at);
}
function throwFrag(e, at) {
  const g = fragGet(); if (!g) return false;
  g.p.set(e.pos.x - Math.sin(e.face) * .35, 1.7 * e.scale, e.pos.z - Math.cos(e.face) * .35);
  const er = 1 + Math.hypot(at.x - e.pos.x, at.z - e.pos.z) * .05, tx = at.x + rand(-er, er), tz = at.z + rand(-er, er), dx = tx - g.p.x, dz = tz - g.p.z;
  const T0 = clamp(Math.hypot(dx, dz) / 13, .75, 1.45); g.v.set(dx / T0, (.12 - g.p.y + 4.9 * T0 * T0) / T0, dz / T0);
  g.fuse = 2.5; g.live = true; g.rest = false; g.touched = false; g.owner = e; g.sq = e.sq || 0; g.beepT = .2; g.pulse = 0; g.m.visible = true; g.ring.visible = false;
  e.atk = e.atkDur = .5; e.frags--; e.fragCd = rand(10, 16); FRAGSQ[g.sq] = G.t; AU.swish(false);
  if (G.t - _fragFeedT > 6) { _fragFeedT = G.t; feed('<b>GRENADE</b> · Get clear!'); }
  return true;
}
function updateFrags(dt) {
  for (const g of FRAGS) {
    if (!g.live) continue;
    g.fuse -= dt;
    if (!g.rest) {
      g.v.y -= 9.8 * dt; const sp = g.v.length();
      if (sp > 1e-3) {
        const dir = _av1.copy(g.v).divideScalar(sp), h = rayGrid(g.p, dir, sp * dt + .07);
        if (h) {
          g.p.addScaledVector(dir, Math.max(0, h.t - .06)); g.touched = true; const vn = g.v.dot(h.n);
          g.v.addScaledVector(h.n, -vn);                                                    // keep the tangent part...
          if (vn < -.9) { g.v.multiplyScalar(.55).addScaledVector(h.n, -vn * .35); if (vn < -2.2) { const s = spatial(g.p); AU.tone('triangle', rand(1500, 2300), 900, .05, .12 * s.vol, s.pan); AU.nz(.05, 'bandpass', 2600, 1800, 3, .1 * s.vol, s.pan); } } // ...scrub it and bounce, with a clink
          else if (h.n.y > .5) { const k = Math.exp(-5 * dt); g.v.x *= k; g.v.z *= k; if (g.v.lengthSq() < .04) { g.rest = true; g.v.set(0, 0, 0); } } // rolling on a roof or a car
        } else g.p.addScaledVector(g.v, dt);
        if (g.p.y <= .06) { g.p.y = .06; if (g.v.y < 0) g.v.y = 0; g.touched = true; const k = Math.exp(-5 * dt); g.v.x *= k; g.v.z *= k; if (g.v.lengthSq() < .04) { g.rest = true; g.v.set(0, 0, 0); } } // rolling on the street
      }
      g.m.rotation.x += sp * dt * 3;
    }
    // the cue: beeps that speed up, an LED, a red ring pulsing on the ground under it
    if ((g.beepT -= dt) <= 0) { g.beepT = .1 + .3 * clamp(g.fuse / 2.5, 0, 1); g.pulse = 1; const s = spatial(g.p); AU.tone('square', 2350, 2300, .045, .09 * s.vol + .015, s.pan); }
    g.pulse = Math.max(0, g.pulse - dt * 5); g.led.visible = g.pulse > .45;
    if (g.touched) { g.ring.visible = true; g.ring.position.set(g.p.x, g.p.y - .045, g.p.z); g.ring.scale.setScalar(1 + g.pulse * .35); g.rm.opacity = (.32 + g.pulse * .5) * (.55 + .45 * smooth01(G.aug * 2.5)); } // a warning first, net chrome second: Augment only sharpens it
    if (g.fuse <= 0) { fragBlast(g); g.live = false; g.m.visible = g.ring.visible = false; }
  }
}
// falloff with distance, stopped by cover; enemies, civilians and cars all take it through their own hurt paths
function fragBlast(g) {
  const p = g.p, s = spatial(p), c0 = _fbC.set(p.x, Math.max(.35, p.y), p.z); // own vector: the hurt() calls below re-plan civilians with the _av scratch
  AU.play('car_explode', { vol: .8 * s.vol + .12, pan: s.pan, rate: rand(1.2, 1.35) }) || AU.boom(s.pan); AU.nz(.4, 'highpass', 6000, 2500, .7, .22 * s.vol, s.pan);
  flashLight.position.set(p.x, p.y + 1.2, p.z); flashLight.color.set(0xffa040); flashLight.intensity = 12; G.flashT = .16;
  burst(FXA, c0, 32, 8, .4, .2, .02, COL.spark, 9, .5, 1, 1.5); burst(FXA, c0, 10, 3, .3, 1.2, .3, COL.fire, -1, .4, 1, 3);
  burst(FXN, c0, 22, 3, 2.6, .8, 1.8, COL.smoke, -.3, .6, .7, 2.2); burst(FXN, c0, 14, 5.5, 1, .07, .09, _fbDirt, 10, .6, .9, .4);
  if (p.y < .4) decal(_av2.set(p.x, .02, p.z), _avUp, rand(1.7, 2.3), splatTex, 0x0b0907);
  const pd = P.pos.distanceTo(p); shake(clamp(1 - pd / 26, .06, .7));
  const fall = d => 1 - Math.max(0, d - 1.5) / (FRAG_R - 1.5);
  if (pd < FRAG_R && !P.dead && (aiLos(c0, _av3.set(P.pos.x, P.pos.y + 1, P.pos.z)) || aiLos(c0, _av3.set(P.pos.x, P.pos.y + P.eyeH, P.pos.z)))) {
    const k = fall(pd), own = g.owner && ET[g.owner.type] ? g.owner : null;
    if (P.inCar) { const c = P.inCar; carHit(c, 320 * k, _av4.set(c.pos.x, .8, c.pos.z), _av5.set(p.x - c.pos.x, 0, p.z - c.pos.z).normalize(), false); damagePlayer(30 * k, p, own); }
    else damagePlayer(10 + 105 * k, p, own);
    P.suppressed = 1;
  }
  for (const e of ENEMIES) {
    if (e.dead) continue; const dx = e.pos.x - p.x, dz = e.pos.z - p.z, d = Math.hypot(dx, dz); if (d > FRAG_R || !aiLos(c0, _av3.set(e.pos.x, 1, e.pos.z))) continue;
    const k = fall(d); e.hurt(15 + 200 * k, 'body', _av4.set(dx, 0, dz).normalize(), true); if (!e.dead && d > .1) { e.vel.x += dx / d * 8 * k; e.vel.z += dz / d * 8 * k; }
  }
  for (const c of CIVS) { if (c.dead) continue; const d = Math.hypot(c.pos.x - p.x, c.pos.z - p.z); if (d < FRAG_R && aiLos(c0, _av3.set(c.pos.x, 1, c.pos.z))) c.hurt(20 + 160 * fall(d), g.owner); }
  for (const c of CARS) { if (c.gone || c === P.inCar) continue; const dx = c.pos.x - p.x, dz = c.pos.z - p.z, d = Math.hypot(dx, dz); if (d < 6) carHit(c, 280 * (1 - d / 6), _av4.set(c.pos.x - dx * .4, .8, c.pos.z - dz * .4), _av5.set(-dx, 0, -dz).normalize(), false); }
  HEAT.add(.25); makeNoise(p, 55, 'blast'); trafficPanic(p);
}

/* ---------- civilians: crowds that walk the sidewalks in groups ---------- */
const CIVS = [], GROUPS = [], CIVHID = [], CIVCAM = { x: 0, z: 0, fx: 0, fz: -1 };
const CIV_RIGS = ['civilian_lo', 'suit_lo', 'male_lo', 'female_lo', 'civilian_lo', 'female_lo'];
const CLOTHES = [0x1c1c22, 0x2a2f3a, 0x3a2a24, 0x5a5048, 0x6a1a1a, 0x1a3a5a, 0x2a4a2a, 0x8a8478, 0xa89a7a, 0x4a3a5a, 0x101014, 0x7a5a2a];
const HAIRN = [0x0e0c0c, 0x2a1a10, 0x4a2a16, 0x8a6a3a, 0xc8b080, 0x6a6a6a];
let _scrT = -9;
// one scream at a time across the whole crowd; the ambience engine voices it when it's there
function civScream(pos) {
  if (G.t - _scrT < .9) return; _scrT = G.t;
  if (typeof AMB !== 'undefined' && AMB.event) { AMB.event('scream', pos); return; }
  const sp = spatial(pos); AU.play('scream_' + (1 + Math.floor(Math.random() * 2)), { vol: .55 * sp.vol, pan: sp.pan, rate: rand(.9, 1.15) }) || AU.tone('sawtooth', rand(700, 950), rand(1100, 1400), .45, .06 * sp.vol, sp.pan, .04);
}
class Civ {
  constructor(x, z, grp, slot) {
    this.pos = new T.Vector3(x, 0, z); this.vel = new T.Vector3(); this.tv = new T.Vector3(); this.threat = new T.Vector3(); this.goal = new T.Vector3(); this.dir = new T.Vector3();
    this.face = Math.random() * TAU; this.hp = 60; this.dead = false; this.deadT = 0; this.t = Math.random() * 9; this.gone = false; this.scared = false;
    this.goalK = 0; this.goalT = -9; this.ginX = 0; this.ginZ = 0; this.hideCar = null; this.fade = 0; this.fm = null; this.pushT = 0;
    this.mode = 'walk'; this.st = { speed: 0, phase: 0, hold: 'none', t: 0, attack: 0, flinch: 0, death: 0, crouch: 0 };
    this.grp = grp || null; this.slot = slot || 0; this.pace = rand(.92, 1.08);
    this.rig = pick(CIV_RIGS);
    const glb = CHARS_READY && (makeGLBRig(this.rig) || makeGLBRig(this.rig.replace('_lo', '')));
    if (glb) { customizeGLB(glb, { skin: pick(SKINS), hairCol: pick(HAIRN), top: pick(CLOTHES), bottom: pick(CLOTHES), accent: 0x222222, k: .62 }); this.R = glb; }
    else this.R = makeRig({ gender: Math.random() < .5 ? 'f' : 'm', skin: pick(SKINS), hair: pick(HAIRS), hairCol: pick(HAIR_COLS), top: pick([0x4a4a52, 0x2a3a4a, 0x5a3a2a]), bottom: 0x1c2a44, accent: 0x222222 });
    scene.add(this.R.root); this.pickDir();
  }
  pickDir() { const ax = Math.random() < .5; this.dir.set(ax ? (Math.random() < .5 ? 1 : -1) : 0, 0, ax ? 0 : (Math.random() < .5 ? 1 : -1)); this.walkT = rand(5, 14); }
  panic(from) {
    if (this.dead || this.mode === 'enter') return;
    if (this.grp) { const g = this.grp; this.grp = null; g.members = g.members.filter(m => m !== this); if (g.members.length) { g.alarm.copy(from); g.alarmOn = true; } }
    const d = Math.hypot(this.pos.x - from.x, this.pos.z - from.z);
    if (this.mode === 'duck') { // stay down behind the car unless the danger is on top of you or the car is leaving
      const c = this.hideCar; if (d > 5 && c && !c.dead && Math.abs(c.speed) < 1) { this.threat.copy(from); this.fleeT = Math.max(this.fleeT, rand(6, 10)); return; }
      this.mode = 'flee'; this.goalK = 0; this.st.crouch = 0;
    }
    if (this.mode === 'cower' && d > 6) this.mode = 'flee';
    if (this.mode !== 'flee' && this.mode !== 'cower') { this.mode = d < 6 && Math.random() < .4 ? 'cower' : 'flee'; if (Math.random() < .55) civScream(this.pos); }
    // re-plan only when there's no shelter yet or the new threat sits between us and it
    const rethink = !this.goalK ? G.t - this.goalT > 1.5 : (this.goal.x - this.pos.x) * (from.x - this.pos.x) + (this.goal.z - this.pos.z) * (from.z - this.pos.z) > 0 && d < this.goal.distanceTo(this.pos) && G.t - this.goalT > .8;
    this.threat.copy(from); this.scared = true; this.fleeT = rand(7, 12);
    if (this.mode === 'flee' && rethink) this.seekShelter();
  }
  // the nearest building face that isn't toward the shooter, or the far side of a parked car
  seekShelter() {
    this.goalT = G.t; this.goalK = 0; if (Math.random() < .22) return; // some just run, and look for a way in later
    const px = this.pos.x, pz = this.pos.z, tx = this.threat.x - px, tz = this.threat.z - pz, tl = Math.hypot(tx, tz) || 1, near = tl < 40;
    let bs = 1e9, bx = 0, bz = 0, k = 0, gx = 0, gz = 0, car = null;
    for (const b of boxesNear(px, pz)) {
      if (b.water || b.y1 <= 3 || b.y0 > .5 || b.x1 - b.x0 < 3 || b.z1 - b.z0 < 3 || Math.abs(b.x0 + b.x1) > 2 * HALF || Math.abs(b.z0 + b.z1) > 2 * HALF) continue;
      // the face we're outside of, and its nearest door (every 9 m along the facade, 3 m in from the corner)
      const ox = px < b.x0 ? -1 : px > b.x1 ? 1 : 0, oz = pz < b.z0 ? -1 : pz > b.z1 ? 1 : 0; if (!ox && !oz) continue;
      let nx = 0, nz = 0, dx, dz;
      if (ox && (!oz || Math.abs(px - (ox < 0 ? b.x0 : b.x1)) > Math.abs(pz - (oz < 0 ? b.z0 : b.z1)))) { nx = ox; dx = ox < 0 ? b.x0 : b.x1; dz = clamp(b.z0 + 3 + Math.round((pz - b.z0 - 3) / 9) * 9, b.z0 + 1, b.z1 - 1); }
      else { nz = oz; dz = oz < 0 ? b.z0 : b.z1; dx = clamp(b.x0 + 3 + Math.round((px - b.x0 - 3) / 9) * 9, b.x0 + 1, b.x1 - 1); }
      const ex = dx + nx * .45 - px, ez = dz + nz * .45 - pz, dd = Math.hypot(ex, ez); if (dd > 24) continue;
      const s = dd + (near && dd > .5 && (ex * tx + ez * tz) / (dd * tl) > .5 ? 30 : 0) + Math.random() * 3;
      if (s < bs) { bs = s; gx = -nx; gz = -nz; bx = dx + nx * .45; bz = dz + nz * .45; k = 1; }
    }
    for (const c of CARS) {
      if (c.ai || c.occ || c.dead || c.gone || Math.abs(c.speed) > .3) continue;
      const ddx = c.pos.x - px, ddz = c.pos.z - pz; if (ddx * ddx + ddz * ddz > 144) continue;
      let ax = c.pos.x - this.threat.x, az = c.pos.z - this.threat.z; const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
      const j = rand(-.8, .8), hx = c.pos.x + ax * 2.5 - az * j, hz = c.pos.z + az * 2.5 + ax * j, s = Math.hypot(hx - px, hz - pz) + 2 + Math.random() * 6;
      if (s < bs) { bs = s; bx = hx; bz = hz; k = 2; car = c; }
    }
    if (k && !aiLos(_av1.set(px, 1, pz), _av2.set(bx, 1, bz), true)) k = 0; // no straight run to it
    this.goalK = k; this.hideCar = car; this.pushT = 0; if (k) { this.goal.set(bx, 0, bz); this.ginX = gx; this.ginZ = gz; }
  }
  setFade(k) {
    if (!this.fm) { const fm = this.fm = []; this.R.root.traverse(o => { const m = o.isMesh && o.material; if (m && !fm.some(f => f.m === m)) { fm.push({ m, t: m.transparent, o: m.opacity }); m.transparent = true; } }); }
    for (const f of this.fm) f.m.opacity = f.o * k;
  }
  hurt(dmg, src) {
    if (this.dead) return; this.hp -= dmg; this.st.flinch = 1; if (this.scared) this.panic(this.threat); else this.panic(_av3.set(this.pos.x + rand(-3, 3), 0, this.pos.z + rand(-3, 3)));
    burst(FXN, _av3.set(this.pos.x, 1.2, this.pos.z), 8, 2.5, .5, .09, .04, COL.blood, 7, .3);
    if (this.hp <= 0) {
      this.dead = true; this.deadT = 0; this.st.deathClip = 'fall'; this.st.crouch = 0; this.vel.set(0, 0, 0);
      if (this.fm) for (const f of this.fm) { f.m.opacity = f.o; f.m.transparent = f.t; } // shot in the doorway
      decal(_av3.set(this.pos.x, .02, this.pos.z), _avUp, rand(1.4, 2.2), splatTex, 0x5a0010);
      if (src === 'player') { addScore(-250, 'CIVILIAN DOWN'); flashBanner('CIVILIAN DOWN', 'That one was a person', 1.4); P.civKills = (P.civKills || 0) + 1; HEAT.add(1); }
      else if (src && src.type) feed(`<b>${ET[src.type].name}</b> · killed a civilian`);
      for (const c of CIVS) if (!c.dead && c !== this && c.pos.distanceToSquared(this.pos) < 400) c.panic(this.pos); // a body hits the ground: everyone near runs
    }
  }
  partAt(o, d) { if (this.dead) return null; const th = raySphere(o, d, _av4.set(this.pos.x, 1.64, this.pos.z), .17); const tb = rayVCapsule(o, d, this.pos.x, this.pos.z, .35, 1.38, .3); if (th > 0 && (tb < 0 || th <= tb + .2)) return { t: th, part: 'head' }; if (tb > 0) return { t: tb, part: 'body' }; return null; }
  update(dt) {
    this.t += dt; const d2p = this.pos.distanceToSquared(P.pos), far = d2p > 45 * 45;
    if (this.dead) { this.deadT += dt; this.st.death = this.deadT * 2.2; if (this.R.glb && this.deadT < 5) animGLB(this.R, this.st, dt); else if (!this.R.glb) animRig(this.R, this.st, dt); this.sync(); return; }
    // threats: nearby awake monsters, anyone shooting is handled by noise events
    if (this.mode === 'walk' && (this.chk = (this.chk || 0) - dt) <= 0) { this.chk = .4; for (const e of ENEMIES) if (!e.dead && e.mode !== 'disguise' && e.pos.distanceToSquared(this.pos) < 14 * 14) { this.panic(e.pos); break; } }
    const tv = this.tv.set(0, 0, 0); let faceTo = null;
    if (this.mode === 'walk' && this.grp) {
      const g = this.grp, tgt = g.slotPos(this.slot, _av3);
      const to = tgt.sub(this.pos).setY(0); const L = to.length();
      if (g.standing) { if (L > .25) tv.copy(to).multiplyScalar(Math.min(1.4, L * 1.6) / (L || 1)); faceTo = g.pos; }
      else { const want = g.speed * this.pace * clamp(.75 + L * .45, .6, 1.6); if (L > .08) tv.copy(to).multiplyScalar(Math.min(want, L * 3) / L); }
    } else if (this.mode === 'walk') {
      this.walkT -= dt; if (this.walkT <= 0) this.pickDir();
      tv.copy(this.dir).multiplyScalar(1.25);
    } else if (this.mode === 'flee') {
      this.fleeT -= dt;
      if (this.goalK === 2 && (this.hideCar.dead || this.hideCar.gone || Math.abs(this.hideCar.speed) > 1)) this.goalK = 0;
      if (this.goalK) {
        const gx = this.goal.x - this.pos.x, gz = this.goal.z - this.pos.z, gl = Math.hypot(gx, gz);
        const behind = this.goalK === 2 && this.hideCar.pos.distanceToSquared(this.pos) < 9.6 && (this.pos.x - this.hideCar.pos.x) * (this.threat.x - this.hideCar.pos.x) + (this.pos.z - this.hideCar.pos.z) * (this.threat.z - this.hideCar.pos.z) < 0;
        if (gl < (this.goalK === 2 ? .7 : .8) || behind) { if (this.goalK === 2) { this.mode = 'duck'; this.fleeT = rand(9, 18); } else { this.mode = 'enter'; this.fade = 0; } }
        else tv.set(gx / gl * 5.2, 0, gz / gl * 5.2);
      } else {
        let ax = this.pos.x - this.threat.x, az = this.pos.z - this.threat.z; const al = Math.hypot(ax, az); if (al < .1) { ax = 1; az = 0; } else { ax /= al; az /= al; }
        const j = Math.sin(this.t * 1.7) * .35; tv.set(ax - az * j, 0, az + ax * j).normalize().multiplyScalar(5.4);
      }
      if (this.fleeT <= 0 && this.mode === 'flee') { this.mode = 'walk'; this.goalK = 0; this.pickDir(); }
    } else if (this.mode === 'cower') { this.fleeT -= dt; if (this.fleeT <= 0) { this.mode = 'flee'; this.fleeT = 6; this.seekShelter(); } }
    else if (this.mode === 'duck') { // crouched behind a parked car until it's quiet, or the car goes
      const c = this.hideCar; this.fleeT -= dt; faceTo = c && c.pos;
      if (!c || c.dead || Math.abs(c.speed) > 1) { this.mode = 'flee'; this.goalK = 0; this.fleeT = rand(5, 8); }
      else if (this.fleeT <= 0) { this.mode = 'walk'; this.goalK = 0; this.pickDir(); }
    } else if (this.mode === 'enter') { // slipping in through a door: walk into the wall and fade, back out on the street later as someone else
      tv.set(this.ginX * 1.1, 0, this.ginZ * 1.1); this.fade += dt / .7; this.setFade(Math.max(0, 1 - this.fade));
      if (this.fade >= 1) { CIVHID.push(G.t + rand(25, 60)); this.remove(); return; }
    }
    this.st.crouch = this.mode === 'duck' ? 1 : 0;
    // keep a little personal space
    if (this.mode === 'walk' && (this.sepT = (this.sepT || 0) - dt) <= 0) { this.sepT = .15; this.sep = this.sep || new T.Vector3(); this.sep.set(0, 0, 0); for (const c of CIVS) { if (c === this || c.dead) continue; const dx = this.pos.x - c.pos.x, dz = this.pos.z - c.pos.z, dd = dx * dx + dz * dz; if (dd < .36 && dd > 1e-4) { const k = (.6 - Math.sqrt(dd)) * 2.5; this.sep.x += dx * k; this.sep.z += dz * k; } } }
    if (this.sep && this.mode === 'walk') tv.add(this.sep);
    this.vel.x = damp(this.vel.x, tv.x, 5, dt); this.vel.z = damp(this.vel.z, tv.z, 5, dt);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    // far away, the walls only need checking a few times a second
    let pushed = false; if (!far || (this.colT = (this.colT || 0) - dt) <= 0) { this.colT = .12; pushed = collideCircle(this.pos, .3, 0, 1.8); }
    if (pushed && this.mode === 'walk' && !this.grp) this.pickDir();
    if (pushed && this.mode === 'flee') { if (this.goalK) { if ((this.pushT += dt) > .9) { this.goalK = 0; this.goalT = G.t; } } else { const s = Math.random() < .5 ? 1 : -1; this.threat.x -= this.vel.z * s; this.threat.z += this.vel.x * s; } }
    for (const c of CARS) { const dx = this.pos.x - c.pos.x, dz = this.pos.z - c.pos.z; const dd = dx * dx + dz * dz; if (dd < 6) { if (c.occ && Math.abs(c.speed) > 6) { HEAT.add(.4); this.hurt(999, 'player'); return; } if (c.ai && Math.abs(c.speed) > 7) { this.hurt(999, null); return; } const L = Math.sqrt(dd) || 1; this.pos.x = c.pos.x + dx / L * 2.45; this.pos.z = c.pos.z + dz / L * 2.45; } }
    const sp = Math.hypot(this.vel.x, this.vel.z);
    let tf = null; if (faceTo && sp < .3) tf = Math.atan2(-(faceTo.x - this.pos.x), -(faceTo.z - this.pos.z)); else if (sp > .2) tf = Math.atan2(-this.vel.x, -this.vel.z);
    if (tf !== null) { let d = tf - this.face; d = Math.atan2(Math.sin(d), Math.cos(d)); this.face += d * Math.min(1, dt * 6); }
    this.st.speed = sp; this.st.hold = this.mode === 'cower' || this.mode === 'duck' ? 'plead' : 'none'; this.st.t = this.t;
    this.st.flinch = Math.max(0, this.st.flinch - dt * 3);
    // animation LOD: near every frame, mid every few frames, far rarely, behind the camera hardly at all
    this.aT = (this.aT || 0) + dt; let every = d2p < 12 * 12 ? 0 : d2p < 22 * 22 ? .033 : d2p < 45 * 45 ? .066 : .2;
    if (d2p > 64 && (this.pos.x - CIVCAM.x) * CIVCAM.fx + (this.pos.z - CIVCAM.z) * CIVCAM.fz < -3) every = .5;
    if (this.aT >= every) { if (this.R.glb) animGLB(this.R, this.st, this.aT); else animRig(this.R, this.st, this.aT); this.aT = 0; }
    this.sync();
  }
  sync() { this.R.root.position.copy(this.pos); if (this.R.crouchW) this.R.root.position.y -= this.R.crouchW * .17; this.R.root.rotation.y = this.face; } // knees bent behind a car: drop the hips like Enemy.sync does
  remove() { this.gone = true; scene.remove(this.R.root); const i = CIVS.indexOf(this); if (i >= 0) CIVS.splice(i, 1); if (this.grp) this.grp.members = this.grp.members.filter(m => m !== this); }
}
/* a group walks a loop around a block on the sidewalk (centre line 6 m in from the road centre),
   turning at corners or crossing the street to the next block; some groups stand and chat */
const SW = 6, SWL = 28;
class Group {
  constructor(i, j, edge, t, dir, standing) {
    this.i = i; this.j = j; this.edge = edge; this.t = t; this.dir = dir; this.speed = rand(1.15, 1.5); this.members = [];
    this.standing = standing; this.standT = standing ? rand(14, 40) : rand(25, 70); this.pos = new T.Vector3(); this.head = new T.Vector3(1, 0, 0); this.cross = null; this.alarm = new T.Vector3(); this.alarmOn = false; this.place();
  }
  // corners of block (i, j) clockwise from its north-west one, as plain numbers (place() runs every frame for every group)
  cx(i, k) { return -HALF + i * CW + (k === 1 || k === 2 ? CW - SW : SW); }
  cz(j, k) { return -HALF + j * CW + (k >= 2 ? CW - SW : SW); }
  corner(i, j, k) { return [this.cx(i, k), this.cz(j, k)]; }
  place() {
    if (this.cross) { const c = this.cross; this.pos.set(lerp(c.a[0], c.b[0], c.k), 0, lerp(c.a[1], c.b[1], c.k)); this.head.set(c.b[0] - c.a[0], 0, c.b[1] - c.a[1]).normalize(); return; }
    const e0 = this.edge, e1 = (this.edge + 1) % 4, ax = this.cx(this.i, e0), az = this.cz(this.j, e0), bx = this.cx(this.i, e1), bz = this.cz(this.j, e1), k = this.t / SWL;
    this.pos.set(lerp(ax, bx, k), 0, lerp(az, bz, k)); this.head.set(bx - ax, 0, bz - az).normalize().multiplyScalar(this.dir);
  }
  // side-by-side in pairs, a second row behind for bigger groups; standing groups make a loose circle
  slotPos(s, out) {
    out = out || new T.Vector3(); const h = this.head;
    if (this.standing) { const n = Math.max(2, this.members.length), a = s / n * TAU + this.i, k = .35 * this.dir; return out.set(this.pos.x - h.z * k + Math.cos(a) * .85, 0, this.pos.z + h.x * k + Math.sin(a) * .85); }
    const row = Math.floor(s / 2) * .95, col = (this.members.length === 1 ? 0 : s % 2 ? .38 : -.38) * (this.cross ? 1.2 : 1);
    return out.set(this.pos.x - h.z * col - h.x * row, 0, this.pos.z + h.x * col - h.z * row);
  }
  update(dt) {
    if (this.alarmOn) { this.alarmOn = false; this.members.forEach(m => m.panic(this.alarm)); }
    this.standT -= dt;
    if (this.standing) { if (this.standT <= 0) { this.standing = false; this.standT = rand(25, 70); } this.place(); return; }
    if (this.standT <= 0 && !this.cross && Math.random() < .5) { this.standing = true; this.standT = rand(10, 25); return; }
    // wait for the slowest member
    let lag = 0; for (const m of this.members) lag = Math.max(lag, m.pos.distanceTo(this.slotPos(m.slot, _av4)));
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
      const endK = this.dir > 0 ? (this.edge + 1) % 4 : this.edge; const vx = this.head.x, vz = this.head.z;
      const ni = this.i + Math.round(vx), nj = this.j + Math.round(vz);
      if (Math.random() < .35 && ni >= 0 && ni < 12 && nj >= 0 && nj < 12) { const a = this.corner(this.i, this.j, endK); this.cross = { a, b: [a[0] + vx * 2 * SW, a[1] + vz * 2 * SW], k: 0, ni, nj }; this.t = clamp(this.t, 0, SWL); }
      else { this.edge = (this.edge + this.dir + 4) % 4; this.t = this.dir > 0 ? 0 : SWL; }
    }
    this.place();
  }
}
function nearestCiv(p, r) { let b = null, bd = r * r; for (const c of CIVS) { if (c.dead) continue; const d = c.pos.distanceToSquared(p); if (d < bd) { bd = d; b = c; } } return b; }
let civT = 0;
function spawnGroup() {
  camera.getWorldDirection(_av5);
  for (let tries = 0; tries < 10; tries++) {
    const a = Math.random() * TAU, r = rand(G.started && CIVS.length > 6 ? 16 : 6, 70); const x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
    if (CIVS.length > 6 && r < 38 && Math.cos(a) * _av5.x + Math.sin(a) * _av5.z > -.2) continue; // close spawns only behind the camera
    const i = Math.floor((x + HALF) / CW), j = Math.floor((z + HALF) / CW); if (i < 0 || j < 0 || i > 11 || j > 11) continue;
    const g = new Group(i, j, Math.floor(Math.random() * 4), rand(2, SWL - 2), Math.random() < .5 ? 1 : -1, Math.random() < .25);
    const t = _av4.copy(g.pos); collideCircle(t, .4, 0, 1.8); if (t.distanceTo(g.pos) > .3) continue;
    const n = Math.random() < .3 ? 1 : Math.random() < .55 ? 2 : Math.random() < .6 ? 3 : rint(4, 5);
    for (let k = 0; k < n; k++) { const p = g.slotPos(k, _av3); const c = new Civ(p.x, p.z, g, k); g.members.push(c); CIVS.push(c); }
    GROUPS.push(g); return true;
  }
  return false;
}
function updateCivs(dt) {
  if (G.state !== 'city' || G.inside || !G.started) { for (const c of CIVS) c.R.root.visible = !G.inside; return; }
  camera.getWorldDirection(_av5); const fl = Math.hypot(_av5.x, _av5.z) || 1; CIVCAM.fx = _av5.x / fl; CIVCAM.fz = _av5.z / fl; CIVCAM.x = camera.position.x; CIVCAM.z = camera.position.z;
  for (const c of CIVS) c.R.root.visible = true;
  civT -= dt;
  const cap = G.quality === 'high' ? 46 : 28;
  const want = Math.max(10, Math.round(cap - G.hour * (cap * .045)));
  if (civT <= 0) {
    civT = .6;
    for (let i = CIVS.length - 1; i >= 0; i--) { const c = CIVS[i]; if ((c.dead && c.deadT > 14) || c.pos.distanceToSquared(P.pos) > 105 * 105) c.remove(); }
    for (let i = GROUPS.length - 1; i >= 0; i--) if (!GROUPS[i].members.length) GROUPS.splice(i, 1);
    let hid = 0; for (let i = CIVHID.length - 1; i >= 0; i--) if (CIVHID[i] < G.t) CIVHID.splice(i, 1); else hid++;
    let alive = 0; for (const c of CIVS) if (!c.dead) alive++;
    const w = want - Math.min(hid, want * .6); // the ones who made it indoors stay in a while
    if (alive < w) { spawnGroup(); if (alive < w * .5) { spawnGroup(); spawnGroup(); } }
  }
  for (const g of GROUPS) g.update(dt);
  for (let i = CIVS.length - 1; i >= 0; i--) CIVS[i] && CIVS[i].update(dt);
}

/* ---------- a fresh night: hooked onto combat.js's resetCombat (clearNight runs it for a new night and for quit-to-title) ---------- */
function aiNightReset() {
  HEAT.level = 0; HEAT.calm = 0; HEAT.lkT = -99; HEAT.still = 0;
  for (const g of FRAGS) { g.live = false; g.m.visible = g.ring.visible = false; }
  for (const k in FRAGSQ) delete FRAGSQ[k];
  CIVHID.length = 0; for (const c of CARS) c._hx = 0;
  for (let i = LS.length - 1; i >= 0; i--) if (LS[i].aiFire) LS.splice(i, 1);
  if (typeof STORY !== 'undefined') STORY.wave = 0;
  if (typeof trafficNightReset === 'function') trafficNightReset();
  if (typeof interiorsReset === 'function') interiorsReset();
}
if (typeof resetCombat === 'function' && !resetCombat.ai) { const f0 = resetCombat; resetCombat = function () { f0(); aiNightReset(); }; resetCombat.ai = 1; }
