/* =====================================================================
   RED NIGHT — combat feel: CoD-accurate staged reloads, surface-aware impacts,
   dropped mags, vehicle damage, layered gun audio (samples when present,
   synthesis otherwise) with street/room reverb.
   ===================================================================== */

/* ---------- reload specs ----------
   [tactical s, empty s, seat (fraction of the reload where the new mag counts), +1 in chamber]
   Times follow MW-era Call of Duty for each platform; closed-bolt guns keep a round chambered
   on a tactical reload, open-bolt guns (BAR, Bren, AA-12) and revolvers do not. */
const RL = {
  iron45: [1.6, 2.1, .6, 1], polymer19: [1.45, 1.9, .58, 1], preacher: [2.7, 2.7, .78, 0], macro: [1.4, 1.85, .58, 1], stutter18: [1.6, 2.1, .6, 1],
  kurz5: [2.0, 2.65, .55, 1], vexor: [1.9, 2.45, .58, 1], unit45: [2.1, 2.6, .57, 1], bullpup90: [2.8, 3.3, .62, 1],
  kalash: [2.25, 2.9, .57, 1], bullpupA3: [2.4, 3.05, .6, 1], patriot15: [2.05, 2.6, .56, 1], battlefal: [2.45, 3.0, .58, 1],
  tundra: [2.6, 3.2, .6, 1], longshot: [2.7, 3.4, .6, 1], anvil50: [2.2, 2.2, .7, 0],
  drumauto: [3.0, 3.0, .66, 0], doughboy: [2.6, 2.6, .64, 0], rpk: [3.9, 4.6, .6, 1], marine27: [3.1, 3.7, .58, 1], l86: [3.4, 4.0, .6, 1], bren: [2.9, 2.9, .64, 0],
  xeno: [2.2, 2.2, .6, 0], stars: [1.0, 1.0, .6, 0], chainsaw: [2.4, 2.4, .7, 0],
};
/* shell-fed: [raise s, per shell s, lower s, chamber-load s (empty pump/semi loads one straight into the breech)] */
const SHELLS = { riot: [.42, .48, .36, .85], autoloader: [.4, .42, .3, .75], twin: [.4, .5, .34, 0], sawed: [.36, .46, .3, 0] };
const capOf = (w, chambered) => w.mag + ((RL[w.id] && RL[w.id][3] && chambered) ? 1 : 0);
const BOLTFAM = { patriot15: 'ar', bullpupA3: 'ar', marine27: 'ar', l86: 'ar', kurz5: 'hk', unit45: 'hk', kalash: 'ak', rpk: 'ak', tundra: 'ak', battlefal: 'ak', vexor: 'ar', bullpup90: 'ar' };

function startReloadCoD() {
  const s = P.s(), w = s.w;
  if (P.reloadT > 0 || !w.mag || s.res <= 0 || P.switchT > 0 || P.meleeT > 0) return;
  if (w.kind === 'saw' || w.kind === 'melee') return;
  const sh = SHELLS[w.id];
  if (sh) {
    if (s.mag >= w.mag) return;
    P.shellMode = true; P.shellPh = 'raise'; P.shellT = 0; P.shellEmpty = s.mag === 0; P.reloadT = 99; P.reloadDur = 99; P.shellBreak = w.id === 'twin' || w.id === 'sawed';
    AU.play('foley_shell_raise', { vol: .5 }) || AU.mag(true);
    if (P.shellBreak) setTimeout(() => AU.play('foley_break', { vol: .7 }) || AU.rack(), 120);
    return;
  }
  const spec = RL[w.id] || [w.reload, w.reload * 1.12, .6, 0];
  const empty = s.mag === 0; if (s.mag >= capOf(w, true)) return;
  P.shellMode = false; P.reloadEmpty = empty; P.reloadDur = empty ? spec[1] : spec[0]; P.reloadT = P.reloadDur; P.reloadEl = 0;
  P.reloadSeat = P.reloadDur * spec[2]; P.reloadCommitted = false; P.ads = Math.min(P.ads, .5);
  const fam = w.cls === 'pistol' ? (w.id === 'preacher' ? 'rev' : 'pistol') : (BOLTFAM[w.id] || (w.action === 'bolt' ? 'bolt' : 'ar'));
  P.reloadFam = fam;
  const out = P.reloadDur * (fam === 'rev' ? .12 : .17);
  P.rStages = [
    { t: out, f: () => { AU.play(fam === 'rev' ? 'foley_cyl_open' : 'foley_magout', { vol: .8 }) || AU.mag(true); if (empty && fam !== 'rev') dropMag(w); } },
    { t: P.reloadSeat - .05, f: () => AU.play(fam === 'rev' ? 'foley_speedloader' : 'foley_magin', { vol: .9 }) || AU.mag(false) },
  ];
  if (empty && fam !== 'rev') P.rStages.push({ t: P.reloadSeat + (P.reloadDur - P.reloadSeat) * .5, f: () => AU.play(fam === 'pistol' ? 'foley_slide' : fam === 'bolt' ? 'foley_bolt' : 'foley_charge', { vol: .9 }) || AU.rack() });
  if (fam === 'rev') P.rStages.push({ t: P.reloadDur * .9, f: () => AU.play('foley_cyl_close', { vol: .8 }) || AU.mag(false) });
  P.rStages.forEach(st => st.done = false);
}
function commitReloadCoD() {
  const s = P.s(), w = s.w; if (P.reloadCommitted) return; P.reloadCommitted = true;
  const cap = capOf(w, !P.reloadEmpty); const take = Math.min(cap - s.mag, s.res); if (take > 0) { s.mag += take; s.res -= take; }
}
// called each frame while reloading (replaces the old single-timer path)
function tickReloadCoD(dt) {
  const s = P.s(), w = s.w;
  if (P.shellMode) {
    const sh = SHELLS[w.id] || [.4, w.reload, .3, 0];
    P.shellT += dt;
    if (P.shellPh === 'raise' && P.shellT >= sh[0]) { P.shellPh = (P.shellEmpty && sh[3]) ? 'chamber' : 'load'; P.shellT = 0; }
    else if (P.shellPh === 'chamber' && P.shellT >= sh[3]) { if (s.res > 0) { s.mag++; s.res--; } AU.play('foley_shell', { vol: .9 }) || AU.mag(false); P.shellPh = s.mag >= w.mag || s.res <= 0 ? 'lower' : 'load'; P.shellT = 0; }
    else if (P.shellPh === 'load' && P.shellT >= sh[1]) { if (s.res > 0 && s.mag < w.mag) { s.mag++; s.res--; AU.play('foley_shell', { vol: .9, rate: rand(.95, 1.05) }) || AU.mag(false); } P.shellT = 0; if (s.mag >= w.mag || s.res <= 0) P.shellPh = 'lower'; }
    else if (P.shellPh === 'lower' && P.shellT >= sh[2]) {
      P.reloadT = 0; P.shellMode = false;
      if (P.shellBreak) AU.play('foley_break_close', { vol: .8 }) || AU.rack();
      else if (w.action === 'pump' && P.shellEmpty && !sh[3]) { P.cycleT = P.cycleDur = .5; AU.play('foley_pump', { vol: .9 }) || AU.rack(); }
    }
    return;
  }
  P.reloadEl += dt; P.reloadT = Math.max(0, P.reloadDur - P.reloadEl);
  for (const st of P.rStages || []) if (!st.done && P.reloadEl >= st.t) { st.done = true; st.f(); }
  if (!P.reloadCommitted && P.reloadEl >= P.reloadSeat) { commitReloadCoD(); P.seatKick = .12; }
  if (P.reloadEl >= P.reloadDur) { P.reloadT = 0; if (!P.reloadCommitted) commitReloadCoD(); }
}
// shotguns: firing interrupts a shell reload once the gun is up (break-actions can't)
function shellInterruptible() { return P.shellMode && !P.shellBreak && P.shellPh !== 'raise' && P.shellPh !== 'chamber'; }

/* ---------- spent magazines ---------- */
const MAGS = [];
function dropMag(w) {
  if (G.camMode !== 'fpp' && !PBODY) return;
  const len = w.cls === 'pistol' ? .12 : w.cls === 'lmg' ? .2 : .18, depth = w.cls === 'pistol' ? .03 : .06;
  const m = new T.Mesh(gBox(.03, len, depth), STD(w.cls === 'pistol' ? 0x18181c : 0x24221e, .5, .6));
  const f = P.fwd(), r = new T.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  m.position.copy(P.eye()).addScaledVector(f, .42).addScaledVector(r, .05); m.position.y -= .32; scene.add(m);
  // it lands on whatever the player stands on (rooftop, room floor), not always the street plane
  MAGS.push({ m, v: new T.Vector3(f.x * .6 + rand(-.2, .2), -.6, f.z * .6 + rand(-.2, .2)).addScaledVector(P.vel, .8), w: new T.Vector3(rand(-6, 6), rand(-3, 3), rand(-6, 6)), life: 30, rest: false, floor: groundAt(P.pos.x, P.pos.z, P.pos.y + .1) + .03 });
  if (MAGS.length > 14) { const o = MAGS.shift(); scene.remove(o.m); }
}
function updateMags(dt) {
  for (const g of MAGS) {
    g.life -= dt; if (g.rest) continue;
    g.v.y -= 9.8 * dt; g.m.position.addScaledVector(g.v, dt); g.m.rotation.x += g.w.x * dt; g.m.rotation.y += g.w.y * dt; g.m.rotation.z += g.w.z * dt;
    if (g.m.position.y < g.floor) { g.m.position.y = g.floor; if (Math.abs(g.v.y) > 1.2) { g.v.y *= -.32; g.v.x *= .6; g.v.z *= .6; g.w.multiplyScalar(.5); AU.play('foley_magdrop', { vol: .35, rate: rand(.9, 1.1) }) || AU.nz(.05, 'bandpass', 1800, 900, 3, .12); } else { g.rest = true; g.m.rotation.set(Math.PI / 2, rand(0, TAU), 0); } }
  }
}

/* ---------- surfaces & impacts ---------- */
const SURF = {
  concrete: { dust: 0x8a8a90, spark: .5, decal: 'hole', snd: 'imp_concrete', col: 0x6a6a70 },
  stone: { dust: 0xc8a878, spark: .3, decal: 'hole', snd: 'imp_concrete', col: 0x8a6a46 },
  brick: { dust: 0xa04a30, spark: .2, decal: 'hole', snd: 'imp_concrete', col: 0x7a3020 },
  plaster: { dust: 0xd8d0c8, spark: .1, decal: 'hole', snd: 'imp_concrete', col: 0xb0a8a0 },
  wood: { dust: 0x6a4a2a, spark: 0, decal: 'splinter', snd: 'imp_wood', col: 0x3a2414 },
  glass: { dust: 0xd8f0ff, spark: 0, decal: 'crack', snd: 'imp_glass', col: 0xffffff },
  metal: { dust: 0x9aa0a8, spark: 1, decal: 'metal', snd: 'imp_metal', col: 0x202024 },
  asphalt: { dust: 0x3a3a40, spark: .4, decal: 'hole', snd: 'imp_concrete', col: 0x1a1a1e },
  flesh: { dust: 0x6a0010, spark: 0, decal: null, snd: null },
  // what a round carries out of a body onto the wall or the floor behind (fleshHit): red, a reptilian's green, the undead's ichor
  blood: { decal: 'blood', tint: BLOOD.spray.getHex() }, gblood: { decal: 'blood', tint: CS(0x1f6a22).getHex() }, iblood: { decal: 'blood', tint: CS(0x2a0c22).getHex() },
};
const DEC = {};
function decalTex(kind) {
  const [c, x] = cvs(64, 64); x.clearRect(0, 0, 64, 64);
  if (kind === 'crack') {
    x.strokeStyle = 'rgba(225,238,250,.72)'; x.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rand(-.2, .2); x.beginPath(); x.moveTo(32, 32); let px = 32, py = 32; for (let k = 0; k < 4; k++) { px += Math.cos(a + rand(-.4, .4)) * rand(4, 9); py += Math.sin(a + rand(-.4, .4)) * rand(4, 9); x.lineTo(px, py); } x.stroke(); }
    for (let r = 6; r < 22; r += 7) { x.beginPath(); x.arc(32, 32, r, 0, TAU); x.globalAlpha = .45; x.stroke(); x.globalAlpha = 1; }
    x.fillStyle = 'rgba(10,10,14,.9)'; x.beginPath(); x.arc(32, 32, 3, 0, TAU); x.fill();
  } else if (kind === 'metal') {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 14); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.5, 'rgba(20,20,22,1)'); g.addColorStop(.66, 'rgba(150,152,158,.75)'); g.addColorStop(1, 'rgba(60,60,66,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 14, 0, TAU); x.fill();
  } else if (kind === 'carhole') { // punched sheet metal: black core, torn bright rim, paint chipped around it
    x.fillStyle = 'rgba(30,30,34,.55)'; x.beginPath(); x.arc(32, 32, 20, 0, TAU); x.fill();
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 13); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,1)'); g.addColorStop(.7, 'rgba(225,228,235,1)'); g.addColorStop(1, 'rgba(150,150,158,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 13, 0, TAU); x.fill();
  } else if (kind === 'splinter') {
    x.fillStyle = 'rgba(12,8,4,.95)'; x.beginPath(); x.arc(32, 32, 5, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(190,150,100,.85)'; x.lineWidth = 2; for (let i = 0; i < 7; i++) { const a = rand(-.5, .5) + (i % 2 ? Math.PI : 0) + Math.PI / 2; x.beginPath(); x.moveTo(32, 32); x.lineTo(32 + Math.cos(a) * rand(8, 18), 32 + Math.sin(a) * rand(8, 18)); x.stroke(); }
  } else if (kind === 'blood') { // a spray off a round: a dense core, droplets thrown out to one side
    x.fillStyle = '#fff';
    for (let i = 0; i < 9; i++) { x.globalAlpha = rand(.55, .95); x.beginPath(); x.arc(32 + rand(-6, 6), 32 + rand(-6, 6), rand(3, 8), 0, TAU); x.fill(); }
    for (let i = 0; i < 28; i++) { const a = rand(-.8, .8), r = rand(8, 30); x.globalAlpha = rand(.5, 1); x.beginPath(); x.arc(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, Math.max(.6, rand(.8, 2.8) * (1 - r / 40)), 0, TAU); x.fill(); }
    x.globalAlpha = 1;
  } else { // chipped crater
    for (let i = 0; i < 16; i++) { x.fillStyle = `rgba(255,255,255,${rand(.45, .85)})`; const a = rand(0, TAU), r = rand(5, 13); x.beginPath(); x.arc(32 + Math.cos(a) * r * .6, 32 + Math.sin(a) * r * .6, rand(2, 6), 0, TAU); x.fill(); }
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 9); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.6, 'rgba(8,6,6,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(32, 32, 9, 0, TAU); x.fill();
  }
  return texFrom(c, true);
}
// one instanced pool per decal look: ~8 draw calls for hundreds of holes
function decalPool(kind, tint, cap) {
  const k = kind + '_' + tint; if (DEC[k]) return DEC[k];
  const mat = new T.MeshBasicMaterial({ map: decalTex(kind), color: tint, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const im = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mat, cap || 96); im.frustumCulled = false; im.count = 0; im.userData.dyn = true; scene.add(im);
  return DEC[k] = { im, i: 0, cap: cap || 96 };
}
const _dm = new T.Matrix4(), _dq = new T.Quaternion(), _dq2 = new T.Quaternion(), _dz = new T.Vector3(0, 0, 1), _dp = new T.Vector3(), _ds = new T.Vector3();
function surfDecal(p, n, surf, size) {
  const S = SURF[surf] || SURF.concrete; if (!S.decal) return;
  if (S.tint === undefined) S.tint = S.decal === 'hole' ? new T.Color(S.col).lerp(new T.Color(0xffffff), .55).getHex() : 0xffffff;
  const D = decalPool(S.decal, S.tint);
  _dq.setFromUnitVectors(_dz, n); _dq.multiply(_dq2.setFromAxisAngle(_dz, Math.random() * TAU));
  _dp.copy(p).addScaledVector(n, .015); _ds.setScalar(size * (S.decal === 'crack' ? 2.4 : 1));
  _dm.compose(_dp, _dq, _ds); D.im.setMatrixAt(D.i, _dm); D.i = (D.i + 1) % D.cap; D.im.count = Math.max(D.im.count, D.i === 0 ? D.cap : D.i); D.im.instanceMatrix.needsUpdate = true;
}
// A round into a body (v24): a mist sized to the gun (cal ~ dmg/30: MW19 wanted target effects to read a weapon's power), a puff
// out of the far side along the round, and, with spray, the blood it carries onto whatever stands within 2.5 m behind (CoD: a
// headshot's blood lands on the wall behind). This is the blood Gore Off keeps; what Gore On adds is in die()
const _fhO = new T.Vector3(), _fhP = new T.Vector3(), BLOOD_SURF = new Map();
function fleshHit(p, d, col, sys, cal, head, spray) {
  const c = clamp(cal, .5, 2.2), n = Math.round(4 + 4 * c);
  burst(sys, p, n, 2.2 * Math.sqrt(c), .5, .08 * c, .04, col, 7, .3);                                          // spatter
  sys.emit(p.x, p.y, p.z, d.x * .4, .25, d.z * .4, .55, .1 * c, .42 * c, col, .5, .4, 2.2);                     // mist
  for (let k = 0, m = head ? n : n >> 1; k < m; k++) { const v = rand(2.5, 5.5) * c; sys.emit(p.x + d.x * .12, p.y + d.y * .12, p.z + d.z * .12, d.x * v + rand(-.6, .6), d.y * v + rand(-.3, .9), d.z * v + rand(-.6, .6), rand(.25, .45), .06 * c, .02, col, 1, 9, .4); } // out the far side
  if (!spray) return;
  if (!BLOOD_SURF.size) { BLOOD_SURF.set(COL.blood, 'blood'); BLOOD_SURF.set(COL.green, 'gblood'); BLOOD_SURF.set(COL.ichor, 'iblood'); }
  const surf = BLOOD_SURF.get(col); if (!surf) return;
  _fhO.copy(p).addScaledVector(d, .35); const h = rayW(_fhO, d, 2.5);
  if (h) surfDecal(_fhP.copy(_fhO).addScaledVector(d, h.t), h.n, surf, rand(.25, .6) * c);
}
// the slap of a round going in, from where it landed: once a shot (a shotgun's first pellet speaks for the rest)
function fleshSnd(p, head, i) {
  if (i) return; const sp = spatial(p); if (sp.vol < .06) return;
  AU.play(head ? 'flesh_head_1' : 'flesh_hit_' + (1 + Math.floor(Math.random() * 3)), { vol: .55 * sp.vol, pan: sp.pan, rate: rand(.9, 1.1) }) || AU.nz(.05, 'lowpass', 900, 300, 1, .14 * sp.vol, sp.pan);
}
function impact(p, n, surf, opts) {
  const S = SURF[surf] || SURF.concrete; const o = opts || {};
  surfDecal(p, n, surf, o.size || (o.pellet ? .1 : .16));
  if (o.fx === false) return;
  const dc = S.dc || (S.dc = C(S.dust));
  burst(FXN, p.clone().addScaledVector(n, .05), o.pellet ? 1 : 3, 1.1, .55, .08, .28, dc, -.3, .45, .35, 2);         // dust puff
  if (S.spark && Math.random() < S.spark) burst(FXA, p, o.pellet ? 2 : 6, 5, .22, .05, .02, COL.spark, 14, .4);    // sparks
  if (surf === 'glass') burst(FXN, p, 10, 3, .7, .04, .05, C(0xd8f0ff), 11, .2);
  if (surf === 'wood') burst(FXN, p, 5, 3, .6, .05, .06, C(0x8a6a3a), 10, .2);
  if (surf === 'brick' || surf === 'stone' || surf === 'concrete') burst(FXN, p, 3, 3, .5, .04, .06, dc, 11, .2);    // chips
  if (o.snd !== false) { const sp = spatial(p); if (sp.vol > .05) AU.play(S.snd + '_' + (1 + Math.floor(Math.random() * 2)), { vol: .5 * sp.vol, pan: sp.pan }) || AU.play(S.snd, { vol: .5 * sp.vol, pan: sp.pan, rate: rand(.9, 1.1) }) || (surf === 'metal' ? AU.ping(sp.pan) : surf === 'glass' ? AU.nz(.16, 'highpass', 5000, 8000, 1, .25 * sp.vol, sp.pan) : AU.nz(.06, 'bandpass', 1400, 600, 2, .18 * sp.vol, sp.pan)); }
  if ((surf === 'concrete' || surf === 'metal' || surf === 'asphalt') && Math.random() < .12) { const sp = spatial(p); AU.play('ricochet', { vol: .45 * sp.vol, pan: sp.pan, rate: rand(.85, 1.15) }) || AU.tone('sine', rand(2200, 3200), rand(800, 1200), .25, .07 * sp.vol, sp.pan); }
}
// what did the ray hit? boxes carry .surf; ground splits into curb concrete vs asphalt
function surfOfHit(h, p) {
  if (h.box) {
    const b = h.box;
    if (b.bays && p.y < 3.6) for (const [bx, bz, ux, uz, hw, sh, kind] of b.bays) {
      const dx = p.x - bx, dz = p.z - bz; if (Math.abs(dx * uz - dz * ux) < .7 && Math.abs(dx * ux + dz * uz) < hw && p.y < sh) { p.addScaledVector(h.n, .14); return kind; } // the shopfront plane sits 14cm proud of the wall
    }
    return b.surf || 'concrete';
  }
  const lx = ((p.x + HALF) % CW + CW) % CW, lz = ((p.z + HALF) % CW + CW) % CW;
  return lx > 5 && lx < 35 && lz > 5 && lz < 35 ? 'concrete' : 'asphalt';
}

/* ---------- vehicles: ray test + damage ---------- */
const _cl = new T.Vector3(), _cd = new T.Vector3(), CAR_MN = [-1.03, .34, -2.32], CAR_MX = [1.03, 1.42, 2.32];
// every hitscan pellet and every AI line-of-sight check runs this over all cars: skip cars nowhere near the ray (a car fits
// in a 2.7 m sphere) before the box test, and keep the box bounds out of the loop (two arrays per car per ray before)
function rayCar(o, d, maxT) {
  let best = null, bt = maxT;
  for (const c of CARS) {
    if (c.gone) continue; const dx = c.pos.x - o.x, dz = c.pos.z - o.z, dy = c.g.position.y + .9 - o.y, tc = dx * d.x + dy * d.y + dz * d.z;
    if (tc < -2.7 || tc > bt + 2.7 || dx * dx + dy * dy + dz * dz - tc * tc > 7.3) continue;
    const ch = Math.cos(-c.h), sh = Math.sin(-c.h);
    const rx = o.x - c.pos.x, rz = o.z - c.pos.z; _cl.set(rx * ch + rz * sh, o.y - c.g.position.y, -rx * sh + rz * ch); _cd.set(d.x * ch + d.z * sh, d.y, -d.x * sh + d.z * ch);
    const mn = CAR_MN, mx = CAR_MX; let t0 = 0, t1 = bt, ax = -1, sg = 0; let ok = true;
    for (let a = 0; a < 3; a++) {
      const oa = _cl.getComponent(a), da = _cd.getComponent(a);
      if (Math.abs(da) < 1e-9) { if (oa < mn[a] || oa > mx[a]) { ok = false; break; } continue; }
      let ta = (mn[a] - oa) / da, tb = (mx[a] - oa) / da, s = -1; if (ta > tb) { const q = ta; ta = tb; tb = q; s = 1; }
      if (ta > t0) { t0 = ta; ax = a; sg = s; } if (tb < t1) t1 = tb; if (t0 > t1) { ok = false; break; }
    }
    if (!ok || ax < 0 || t0 <= 0 || t0 >= bt) continue;
    const ln = new T.Vector3(); ln.setComponent(ax, sg);
    const wn = ln.clone().applyAxisAngle(new T.Vector3(0, 1, 0), c.h);
    const ly = _cl.y + _cd.y * t0;
    bt = t0; best = { car: c, t: t0, n: wn, glass: ly > 1.0 && ax !== 1 ? true : ax === 1 && ly > 1.3 };
  }
  return best;
}
function carInit(c) {
  if (c.dm) return; c.dm = { hp: 360, max: 360, holes: null, glassGone: false, fireT: 0 };
  c.g.traverse(o => { if (o.isMesh && o.material && o.material.metalness === 1 && o.material.roughness < .1) c.dm.glassMesh = o; if (o.isMesh && o.material && o.material.color && o.material.metalness >= .8 && o.material.roughness < .3 && o.material !== (c.dm.glassMesh && c.dm.glassMesh.material)) c.dm.bodyMat = o.material; });
  if (c.dm.bodyMat) c.dm.orig = { col: c.dm.bodyMat.color.clone(), m: c.dm.bodyMat.metalness, r: c.dm.bodyMat.roughness }; if (c.dm.glassMesh) c.dm.glassMat = c.dm.glassMesh.material;
  const mat = DEC.carHole || (DEC.carHole = new T.MeshBasicMaterial({ map: decalTex('carhole'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  c.dm.holes = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mat, 40); c.dm.holes.count = 0; c.dm.holes.frustumCulled = false; c.g.add(c.dm.holes); c.dm.hi = 0;
}
// by: who fired (an enemy), or nothing for the player's rounds
function carHit(c, dmg, p, n, glass, by) {
  carInit(c); if (c.dead) { impact(p, n, 'metal', { snd: true }); return; }
  // local-space hole that rides with the car
  const inv = new T.Matrix4().copy(c.g.matrixWorld).invert(); const lp = p.clone().applyMatrix4(inv); const ln = n.clone().applyAxisAngle(new T.Vector3(0, 1, 0), -c.h);
  _dq.setFromUnitVectors(_dz, ln); _dm.compose(lp.addScaledVector(ln, .012), _dq, _ds.setScalar(glass ? .3 : .2));
  if (!glass) { c.dm.holes.setMatrixAt(c.dm.hi, _dm); c.dm.hi = (c.dm.hi + 1) % 40; c.dm.holes.count = Math.max(c.dm.holes.count, c.dm.hi || 40); c.dm.holes.instanceMatrix.needsUpdate = true; }
  const sp = spatial(p);
  if (glass && !c.dm.glassGone) {
    c.dm.glassHits = (c.dm.glassHits || 0) + 1;
    if (c.dm.glassHits >= 2 && c.dm.glassMesh) { c.dm.glassGone = true; c.dm.glassMesh.material = new T.MeshStandardMaterial({ color: lc(0x0a0c10), metalness: .6, roughness: .6, transparent: true, opacity: .35 }); burst(FXN, p, 30, 4, .9, .05, .06, C(0xd8f0ff), 11, .2); AU.play('glass_shatter', { vol: .8 * sp.vol, pan: sp.pan }) || AU.nz(.5, 'highpass', 4000, 9000, 1, .4 * sp.vol, sp.pan); }
    else impact(p, n, 'glass', { fx: true });
  } else impact(p, n, 'metal', { fx: true, size: .001 });
  c.dm.hp -= dmg; c.lastHitBy = by || (typeof PLY !== 'undefined' ? PLY : 'player');
  if (c.dm.hp <= 0) carExplode(c);
}
function carExplode(c) {
  if (c.dead) return; c.dead = true; carInit(c);
  const p = c.pos.clone().setY(1); const sp = spatial(p);
  AU.play('car_explode', { vol: 1 * sp.vol + .2, pan: sp.pan }) || AU.boom(sp.pan); shake(clamp(1.2 - p.distanceTo(P.pos) / 30, .1, 1));
  burst(FXA, p, 70, 9, 1.4, .5, .02, COL.ember, -1, .4, 1, 2); burst(FXA, p.clone().setY(1.6), 26, 3.5, .7, 1.6, .6, COL.fire, -2, .6, 1, 2.5); burst(FXN, p, 50, 5, 2.2, .9, 1.4, COL.smoke, -.6, .5, .9, 3);
  flashLight.position.copy(p).setY(3); flashLight.color.set(0xff7a20); flashLight.intensity = 14; G.flashT = .25;
  // blast damage
  const byP = c.lastHitBy === 'player' || (typeof PLY !== 'undefined' && c.lastHitBy === PLY), src = { big: true, w: null, dist: 0, blast: true, by: byP ? PLY : (c.lastHitBy && c.lastHitBy.pos ? c.lastHitBy : null) };
  for (const e of ENEMIES) { if (e.dead) continue; const d = e.pos.distanceTo(c.pos); if (d < 9) e.hurt(lerp(340, 20, d / 9), 'body', e.pos.clone().sub(c.pos).normalize(), src); if (d < 9) e.vel.add(e.pos.clone().sub(c.pos).setY(0).normalize().multiplyScalar(12 * (1 - d / 9))); }
  for (const cv of CIVS) { if (cv.dead) continue; const d = cv.pos.distanceTo(c.pos); if (d < 8) cv.hurt(400, byP ? null : src.by); }
  blastCorpses(c.pos, 9, 300);
  const pd = P.pos.distanceTo(c.pos);
  if (P.inCar === c) { exitCar(); damagePlayer(90, c.pos, null); } else if (pd < 9) damagePlayer(lerp(110, 8, pd / 9), c.pos, null);
  for (const o of CARS) if (o !== c && !o.dead && o.pos.distanceTo(c.pos) < 7) { carInit(o); o.dm.hp -= 200 * (1 - o.pos.distanceTo(c.pos) / 7); o.lastHitBy = c.lastHitBy; if (o.dm.hp <= 0) setTimeout(() => carExplode(o), rand(250, 700)); }
  // wreck: burnt shell, lights out, a hop and a burning hulk
  if (c.dm.bodyMat) { c.dm.bodyMat.color.set(0x0c0a0a); c.dm.bodyMat.metalness = .3; c.dm.bodyMat.roughness = .9; }
  c.dm.hidden = []; c.g.traverse(o => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial && o !== c.dm.holes && o.visible) { o.visible = false; c.dm.hidden.push(o); } });
  if (c.dm.glassMesh) c.dm.glassMesh.visible = false;
  c.hopV = 6.5; c.spin = rand(-1.5, 1.5); c.speed = 0; c.occ = false;
  c.fire = { p: c.pos.clone().setY(1.2), s: 1.4 }; FIRES.push(c.fire); c.fireLS = { p: c.pos.clone().setY(2.2), c: new T.Color(0xff6a10), i: 4, d: 20, f: 1 }; LS.push(c.fireLS);
  if (byP) addScore(150, 'VEHICLE DESTROYED');
}
// per-frame vehicle damage state: smoke → fire → hop after the blast
const _hood = new T.Vector3(), SMOKE_K = C(0x1a1a1a), SMOKE_G = C(0x8a8a90);
function updateCarDamage(dt) {
  for (const c of CARS) {
    if (!c.dm) continue; const hood = _hood.set(c.pos.x - Math.sin(c.h) * 1.5, 1.05, c.pos.z - Math.cos(c.h) * 1.5); // every hit car, every frame: no allocation
    if (c.dead) {
      if (c.hopV !== undefined) { c.g.position.y += c.hopV * dt; c.hopV -= 18 * dt; c.h += c.spin * dt; c.spin *= .96; if (c.g.position.y <= 0) { c.g.position.y = 0; c.hopV = c.hopV < -3 ? -c.hopV * .25 : undefined; } c.g.rotation.y = c.h; }
      if (c.fire) { c.fire.p.copy(c.pos).setY(1.2); c.fireLS.p.copy(c.pos).setY(2.2); }
      if (Math.random() < dt * 9) FXN.emit(c.pos.x + rand(-.8, .8), 1.6, c.pos.z + rand(-.8, .8), rand(-.2, .2), rand(1.5, 2.6), rand(-.2, .2), rand(2, 3.4), .9, .5, COL.smoke, -.3);
      continue;
    }
    const k = c.dm.hp / c.dm.max;
    if (k < .6 && Math.random() < dt * (k < .3 ? 14 : 6)) FXN.emit(hood.x + rand(-.3, .3), hood.y, hood.z + rand(-.3, .3), rand(-.2, .2), rand(.8, 1.6), rand(-.2, .2), rand(1.2, 2.2), .45, .4, k < .3 ? SMOKE_K : SMOKE_G, -.3);
    if (k < .3) {
      if (!c.hoodFire) { c.hoodFire = { p: hood.clone(), s: .6 }; FIRES.push(c.hoodFire); AU.play('fire_whoosh', { vol: .5 }) || AU.nz(.6, 'lowpass', 900, 200, 1, .25); }
      c.hoodFire.p.copy(hood); c.dm.hp -= dt * 12; if (c.dm.hp <= 0) carExplode(c); // it cooks off on its own
      if (c.occ) c.speed = Math.min(c.speed, 22);
    }
  }
}

/* ---------- audio: samples + layered synthesis + reverb ---------- */
const SFX = { buf: {}, ok: false };
AU.loadSamples = function () {
  if (!this.ok || SFX.loading) return; SFX.loading = true;
  fetch('assets/sfx/index.json').then(r => r.ok ? r.json() : []).then(list => {
    list.forEach(n => fetch('assets/sfx/' + n + '.mp3').then(r => r.ok ? r.arrayBuffer() : null).then(b => b && this.ctx.decodeAudioData(b, d => { SFX.buf[n] = d; SFX.ok = true; }, () => { })).catch(() => { }));
  }).catch(() => { });
};
AU.reverb = function (kind) {
  if (!this.ok) return null; this.rv = this.rv || {};
  if (this.rv[kind]) return this.rv[kind];
  const sr = this.ctx.sampleRate, len = Math.floor(sr * (kind === 'room' ? .7 : 2.2)); const b = this.ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, kind === 'room' ? 4 : 2.6) * (kind === 'room' ? .9 : .5); }
    if (kind !== 'room') for (const [dt, g] of [[.09, .7], [.17, .5], [.29, .38], [.46, .25], [.71, .16]]) { const i0 = Math.floor((dt + ch * .013) * sr); for (let k = 0; k < 220; k++) d[i0 + k] += (Math.random() * 2 - 1) * g * (1 - k / 220); } // slapback off the buildings
  }
  const cv = this.ctx.createConvolver(); cv.buffer = b; const g = this.ctx.createGain(); g.gain.value = kind === 'room' ? .55 : .42;
  const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'room' ? 3200 : 2200; cv.connect(lp); lp.connect(g); g.connect(this.sfx);
  return this.rv[kind] = cv;
};
// play a loaded sample; returns false if we don't have it (callers fall back to synth)
const SFX_ALIAS = { foley_break_close: 'foley_cyl_open', foley_speedloader: 'foley_magin', foley_cyl_close: 'foley_cyl_open' };
AU.play = function (name, o) {
  if (!SFX.buf[name] && SFX_ALIAS[name]) name = SFX_ALIAS[name];
  if (!this.ok || !SFX.buf[name]) return false; o = o || {}; if (o.vol !== undefined && !(o.vol > .002)) return true;
  const s = this.ctx.createBufferSource(); s.buffer = SFX.buf[name]; s.playbackRate.value = o.rate || rand(.97, 1.03);
  const g = this.ctx.createGain(); g.gain.value = o.vol === undefined ? 1 : o.vol;
  let node = g; if (o.lp) { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); node = f; }
  s.connect(g); node.connect(this.out(o.pan));
  if (o.verb) { const rv = this.reverb(G.inside ? 'room' : 'city'); if (rv) { const sg = this.ctx.createGain(); sg.gain.value = o.verb; node.connect(sg); sg.connect(rv); } }
  s.start(); return true;
};
// layered synthetic gunshot: transient crack, muzzle blast, low body, mechanism, reverb tail
const GUNVOICE = {
  pistol: { blast: .16, f: 5200, body: 170, bodyT: .1, mech: 1, crack: 0, vol: .8, smp: 'gun_pistol' },
  pistolH: { blast: .26, f: 4200, body: 130, bodyT: .14, mech: 1, crack: 0, vol: .95, smp: 'gun_pistol45', alt: 'gun_pistol', rate: .86 },
  revolver: { blast: .34, f: 4000, body: 110, bodyT: .18, mech: 0, crack: 0, vol: 1, smp: 'gun_revolver' },
  smg: { blast: .12, f: 5600, body: 160, bodyT: .07, mech: 1, crack: 0, vol: .65, smp: 'gun_smg' },
  ar: { blast: .2, f: 6000, body: 120, bodyT: .1, mech: 1, crack: 1, vol: .85, smp: 'gun_ar' },
  ak: { blast: .24, f: 4600, body: 100, bodyT: .12, mech: 1, crack: 1, vol: .95, smp: 'gun_ak' },
  battle: { blast: .3, f: 4400, body: 90, bodyT: .14, mech: 1, crack: 1, vol: 1, smp: 'gun_battle' },
  lmg: { blast: .26, f: 4800, body: 95, bodyT: .12, mech: 1, crack: 1, vol: .95, smp: 'gun_lmg' },
  sniper: { blast: .55, f: 5000, body: 70, bodyT: .3, mech: 0, crack: 1, vol: 1.1, smp: 'gun_sniper' },
  fifty: { blast: .8, f: 3600, body: 50, bodyT: .45, mech: 0, crack: 1, vol: 1.25, smp: 'gun_fifty', alt: 'gun_sniper', rate: .78 },
  shotgun: { blast: .42, f: 3200, body: 80, bodyT: .3, mech: 0, crack: 0, vol: 1.1, smp: 'gun_shotgun' },
};
function voiceOf(w) {
  if (w.cls === 'pistol') return w.id === 'preacher' ? 'revolver' : w.id === 'iron45' ? 'pistolH' : 'pistol';
  if (w.cls === 'smg') return 'smg'; if (w.cls === 'shotgun') return 'shotgun'; if (w.cls === 'lmg') return 'lmg';
  if (w.cls === 'sniper') return w.id === 'anvil50' ? 'fifty' : w.id === 'tundra' ? 'battle' : 'sniper';
  if (w.id === 'kalash') return 'ak'; if (w.id === 'battlefal') return 'battle'; return 'ar';
}
AU.shot = function (w, sup, from) {
  if (!this.ok) return;
  if (w.kind === 'plasma') { this.tone('sawtooth', 1400, 180, 0.28, 0.35); this.tone('sine', 300, 60, 0.3, 0.4); this.nz(0.2, 'bandpass', 3000, 600, 2, 0.25); return; }
  const V = GUNVOICE[voiceOf(w)]; const indoor = !!G.inside;
  if (sup) { if (!this.play(V.smp + '_sup', { vol: .7, verb: .15 }) && !this.play(V.smp, { vol: .32 * V.vol, lp: 1700, rate: 1.12, verb: .08 })) { this.nz(.04, 'highpass', 4000, 2500, .7, .4); this.nz(.12, 'bandpass', 1800, 700, 1.2, .3); this.tone('sine', 160, 60, .06, .2); this.mech(V); } return; }
  if (this.play(V.smp, { vol: V.vol, verb: indoor ? .55 : .4 }) || (V.alt && this.play(V.alt, { vol: V.vol, rate: V.rate * rand(.97, 1.03), verb: indoor ? .6 : .45 }))) { if (V.mech) setTimeout(() => this.mech(V, .5), 30); return; }
  const t = this.now(); const out = this.sfx; const rv = this.reverb(indoor ? 'room' : 'city');
  const layer = (dur, type, f0, f1, q, vol, att) => {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = rand(.85, 1.15);
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur); f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (att || .0015)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); if (rv) { const sg = this.ctx.createGain(); sg.gain.value = indoor ? .7 : .55; g.connect(sg); sg.connect(rv); }
    s.start(t, Math.random()); s.stop(t + dur + .05);
  };
  layer(.012, 'highpass', 7000, 3000, .6, .9 * V.vol);                  // transient
  if (V.crack) layer(.006, 'highpass', 9000, 7000, .5, .7 * V.vol);     // supersonic crack
  layer(V.blast, 'lowpass', V.f, 260, .8, 1.0 * V.vol);                 // muzzle blast
  layer(V.blast * .6, 'bandpass', 900, 300, 1.2, .5 * V.vol);           // midrange punch
  const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(V.body, t); o.frequency.exponentialRampToValueAtTime(38, t + V.bodyT);
  const og = this.ctx.createGain(); og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(.85 * V.vol, t + .004); og.gain.exponentialRampToValueAtTime(.0001, t + V.bodyT); o.connect(og); og.connect(out); o.start(t); o.stop(t + V.bodyT + .05);
  if (V.mech) this.mech(V);
};
AU.mech = function (V, vol) { if (!this.ok) return; setTimeout(() => { this.nz(.035, 'bandpass', 2600, 1800, 4, .16 * (vol || 1)); this.nz(.02, 'highpass', 5000, 4000, 2, .08 * (vol || 1)); }, 38 + Math.random() * 10); };
// enemy / distant gunfire: lowpassed with distance, delayed slap, quieter
AU.farShot = function (pos, heavy) {
  if (!this.ok) return; const sp = spatial(pos); const d = pos.distanceTo(P.pos);
  if (this.play(d > 45 ? 'gun_distant' : (heavy ? 'gun_ak' : 'gun_pistol'), { vol: clamp(1.1 - d / 90, .08, .7), pan: sp.pan, lp: clamp(9000 - d * 120, 900, 9000), verb: .5 })) return;
  this.nz(.16, 'lowpass', clamp(5000 - d * 60, 700, 5000), 300, .8, clamp(.6 - d / 120, .05, .5), sp.pan);
  this.tone('sine', 120, 45, .1, clamp(.4 - d / 140, .03, .35), sp.pan);
  setTimeout(() => this.nz(.3, 'lowpass', 1200, 200, .8, clamp(.25 - d / 300, .02, .2), -sp.pan), 80 + d * 2);
};

/* ---------- hooks ---------- */
const _auInit = AU.init; AU.init = function () { _auInit.call(this); this.loadSamples(); };
const _rmFire = f => { const k = FIRES.indexOf(f); if (k >= 0) FIRES.splice(k, 1); };
// a fresh night: wrecks are towed, holes patched, the street swept
function resetCombat() {
  for (const c of CARS) {
    if (!c.dm) continue; const D = c.dm;
    if (D.orig) { D.bodyMat.color.copy(D.orig.col); D.bodyMat.metalness = D.orig.m; D.bodyMat.roughness = D.orig.r; }
    if (D.glassMesh) { D.glassMesh.material = D.glassMat; D.glassMesh.visible = true; }
    (D.hidden || []).forEach(o => o.visible = true); D.hidden = [];
    D.holes.count = 0; D.hi = 0; D.hp = D.max; D.glassGone = false; D.glassHits = 0;
    if (c.fire) { _rmFire(c.fire); c.fire = null; } if (c.hoodFire) { _rmFire(c.hoodFire); c.hoodFire = null; } if (c.fireLS) { const li = LS.indexOf(c.fireLS); if (li >= 0) LS.splice(li, 1); c.fireLS = null; } // don't leave dead lights in the pool's candidate list
    c.dead = false; c.hopV = undefined; c.spin = 0; c.g.position.y = 0; c.lastHitBy = null;
  }
  for (const k in DEC) if (DEC[k].im) { DEC[k].im.count = 0; DEC[k].i = 0; }
  MAGS.forEach(g => scene.remove(g.m)); MAGS.length = 0;
  for (const c of CIVS.slice()) c.remove(); CIVS.length = 0; GROUPS.length = 0;
  MOLOS.forEach(o => scene.remove(o.m)); MOLOS.length = 0;
  FIREZONES.forEach(z => { z.fires.forEach(_rmFire); z.ls.i = 0; }); FIREZONES.length = 0;
  NOISES.length = 0; P.suppressed = 0; P.civKills = 0;
  if (typeof TRAFFIC !== 'undefined') for (const c of TRAFFIC) trafficPlace(c, true);
}
