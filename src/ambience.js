/* =====================================================================
   RED NIGHT — ambience: the city sounds and feels alive, and hostile.
   All synthesized (or the shipped SFX); no new assets.
   - own bus (muffled indoors / in a car), low-health muffle on the master, street reverb
   - distant life on a 10 Hz scheduler: gunfire, sirens, dogs, car alarms, glass, screams,
     Salem's church bell on the hour; busier through the night and with HEAT
   - a police helicopter: searchlight sweeps the street and gives you away if it rests on you
   - skyline events past the fog (fog:false): explosions + smoke columns, tracer streams, flares
   - rain over the night (drives G.rainK), rain on car roofs, gutters by the walls
   - footsteps, barks, heartbeat, doors, thunder, the purge siren, and an adaptive score
   ===================================================================== */
const AMB = {
  ok: false, gfx: false, nv: 0, cap: 12, ns: 0, scap: 5, live: [], tk: 0, danger: 0, ms: 0, I: 0,
  L: new T.Vector3(), extPT: -99, extNT: -99, extBT: -99, lhExt: 0, lhT: -99, lh: 0, hbNext: 0,
  ph: 0, eph: new WeakMap(), eb: new WeakMap(), barkT: 0, bellH: -1, bellQ: 0, bellNext: 0, wasIn: null, wasSt: '', nightT: 0,
  storm0: rand(4.6, 5.8), stormL: rand(2.3, 3.4), lastScream: -99, wind: { x: .9, z: .35 }, grass: new Set(), SE: [], TS: [], FL: [],
};
const SFXbuf = n => typeof SFX !== 'undefined' && SFX.buf && SFX.buf[n];
const _ab = new T.Vector3(), _ac = new T.Vector3(), _ad = new T.Vector3(), _aq = new T.Quaternion(), _aDown = new T.Vector3(0, -1, 0);

/* ---------- audio graph (built once AU.init has made the context) ---------- */
AMB.pan = function () { return this.c.createStereoPanner ? this.c.createStereoPanner() : this.c.createGain(); };
AMB.audio = function () {
  if (this.ok) return true; if (!AU.ok || !AU.ctx || this.err) return false;
  try { this.build(); this.ok = true; } catch (e) {
    this.err = String(e); console.warn('ambience audio', e);
    try { AU.master.disconnect(); AU.master.connect(AU.ctx.destination); if (AU.rainG) { AU.rainG.disconnect(); AU.rainG.connect(AU.master); } } catch (e2) { } // put the original routing back
  }
  return this.ok;
};
AMB.build = function () {
  const c = this.c = AU.ctx;
  const G1 = this.G1 = v => { const n = c.createGain(); n.gain.value = v; return n; };
  const BQ = this.BQ = (t, f, q) => { const n = c.createBiquadFilter(); n.type = t; n.frequency.value = f; n.Q.value = q === undefined ? .7 : q; return n; };
  // low health muffles everything; the heartbeat bypasses it
  this.mfl = BQ('lowpass', 20000, .5); AU.master.disconnect(); AU.master.connect(this.mfl); this.mfl.connect(c.destination);
  this.hb = G1(1); this.hb.connect(c.destination);
  // the world bus: what reaches you from the street, muffled through walls; dry = close interior sounds
  this.lp = BQ('lowpass', 18000, .5); this.lp.connect(AU.master); this.bus = G1(1); this.bus.connect(this.lp);
  this.dry = G1(1); this.dry.connect(AU.master);
  // street reverb: 50 ms pre-delay, ~1.4 s exponential tail, slapback off the facades
  const sr = c.sampleRate, len = Math.floor(sr * 1.75), pre = Math.floor(sr * .05), b = c.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let e = .55; const dk = Math.exp(-4.93 / sr);
    for (let i = pre; i < len; i++) { d[i] = (Math.random() * 2 - 1) * e; e *= dk; }
    for (const [tt, g] of [[.085, .5], [.15, .38], [.23, .28], [.36, .2], [.52, .13], [.78, .08]]) { const i0 = pre + Math.floor((tt + ch * .011 + Math.random() * .008) * sr); let a = g; for (let k = 0; k < 360 && i0 + k < len; k++) { d[i0 + k] += (Math.random() * 2 - 1) * a; a *= .985; } }
  }
  const cv = c.createConvolver(); cv.buffer = b; this.verbIn = G1(1); const vh = BQ('highpass', 140, .5), vl = BQ('lowpass', 3400, .5); this.vout = G1(.5);
  this.verbIn.connect(cv); cv.connect(vh); vh.connect(vl); vl.connect(this.vout); this.vout.connect(this.lp);
  this.send = G1(.085); AU.sfx.connect(this.send); this.send.connect(this.verbIn); // every gunshot rings off the buildings a little
  if (AU.rainG) { AU.rainG.disconnect(); AU.rainG.connect(this.bus); }
  // beds share one noise loop: city rumble, wind, room tone
  const ns = this.nsrc = c.createBufferSource(); ns.buffer = AU.noise; ns.loop = true; ns.playbackRate.value = .71; ns.start();
  const rl = BQ('lowpass', 150, .6); this.rumG = G1(0); ns.connect(rl); rl.connect(this.rumG); this.rumG.connect(this.bus);
  this.windF = BQ('bandpass', 520, .9); this.windG = G1(0); ns.connect(this.windF); this.windF.connect(this.windG); this.windG.connect(this.bus);
  const rf = BQ('lowpass', 260, .5); this.roomG = G1(0); ns.connect(rf); rf.connect(this.roomG); this.roomG.connect(this.dry);
  this.hum = c.createOscillator(); this.hum.frequency.value = 120; this.humG = G1(0); this.hum.connect(this.humG); this.humG.connect(this.dry); this.hum.start();
  // rain textures: patter on puddles (also taps the apartment window), drops on a car roof, a gutter trickling.
  // The loops are generated one per timeout so the first tap doesn't hitch.
  this.patG = G1(0); this.patG.connect(this.bus);
  this.winF = BQ('bandpass', 2600, .8); this.winG = G1(0); this.winP = this.pan(); this.winF.connect(this.winG); this.winG.connect(this.winP); this.winP.connect(this.dry);
  this.roofG = G1(0); this.roofP = this.pan(); this.roofG.connect(this.roofP); this.roofP.connect(this.dry);
  this.gutG = G1(0); this.gutP = this.pan(); this.gutG.connect(this.gutP); this.gutP.connect(this.dry);
  const loop = (kind, dsts, k) => setTimeout(() => { try { const buf = rainBuf(c, kind), s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * buf.duration); for (const d of dsts) s.connect(d); } catch (e) { } }, k * 120 + 60);
  loop('drops', [this.patG, this.winF], 0); loop('roof', [this.roofG], 1); loop('gutter', [this.gutG], 2);
};
// procedural rain loops: many tiny damped sinusoids (drops), longer ringing pings (sheet metal), rising bubbles (gutter)
function rainBuf(c, kind) {
  const sr = c.sampleRate, n = Math.floor(sr * (kind === 'gutter' ? 3.1 : 2.3)), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
  const ring = (i0, f, tau, a, L) => { const w = TAU * f / sr, dk = Math.exp(-1 / tau); let e = a; for (let j = 0; j < L; j++) { d[(i0 + j) % n] += Math.sin(w * j) * e; e *= dk; } };
  if (kind === 'gutter') {
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * .015;
    for (let k = 0; k < 150; k++) { const i0 = Math.floor(Math.random() * n), L = Math.floor(sr * rand(.012, .045)), f0 = rand(380, 1300), a = rand(.15, .5); let ph = 0; for (let j = 0; j < L; j++) { ph += TAU * f0 * (1 + 1.6 * j / L) / sr; d[(i0 + j) % n] += Math.sin(ph) * a * (1 - j / L); } }
  } else if (kind === 'roof') {
    for (let k = 0; k < 1100; k++) { const tau = sr * rand(.003, .011); ring(Math.floor(Math.random() * n), rand(1700, 4600), tau, rand(.05, .35) * (Math.random() < .08 ? 2.2 : 1), Math.min(1800, Math.floor(tau * 5))); }
    for (let k = 0; k < 220; k++) { const tau = sr * .006; ring(Math.floor(Math.random() * n), rand(240, 520), tau, rand(.2, .5), Math.floor(tau * 5)); } // heavy drops: a dull tok on the panel
  } else for (let k = 0; k < 2400; k++) { const tau = sr * rand(.0006, .0025); ring(Math.floor(Math.random() * n), rand(1200, 6000), tau, rand(.05, .32) * (Math.random() < .08 ? 2.2 : 1), Math.floor(tau * 5)); }
  let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(d[i])); if (m > 0) for (let i = 0; i < n; i++) d[i] *= .8 / m;
  return b;
}

/* ---------- voices: sources → env → distance gain → air lowpass → pan → bus (+ reverb send) ---------- */
function ambVoice(x, z, loud, send, prio, y, near) {
  const A = AMB; if (!A.ok || (A.nv >= A.cap + (near ? 4 : 0) && !prio)) return null; // close cues (barks) outrank distant ones
  const c = A.c, v = { x, z, y, loud, send: near ? 0 : send || 0, near, src: [], nodes: [], left: 0, dead: 0, vx: 0, vz: 0, dop: null, track: 0 };
  v.env = c.createGain(); v.env.gain.value = 0; v.sp = c.createGain(); v.lp = c.createBiquadFilter(); v.lp.type = 'lowpass'; v.lp.Q.value = .5; v.pn = A.pan();
  v.env.connect(v.sp); v.sp.connect(v.lp); v.lp.connect(v.pn); v.pn.connect(near ? AU.sfx : A.bus);
  if (v.send) { v.sg = c.createGain(); v.lp.connect(v.sg); v.sg.connect(A.verbIn); }
  A.nv++; A.live.push(v); ambPlace(v, 0, true); return v;
}
function ambPlace(v, dt, hard) {
  const A = AMB, L = v.near ? camera.position : A.L, m = camera.matrixWorld.elements, now = A.c.currentTime;
  if (dt && !v.track) { v.x += v.vx * dt; v.z += v.vz * dt; }
  const dx = v.x - L.x, dz = v.z - L.z, dy = v.y === undefined ? 0 : v.y - L.y, dh = Math.sqrt(dx * dx + dz * dz) + .001, d = Math.sqrt(dh * dh + dy * dy);
  const pan = clamp((dx * m[0] + dz * m[2]) / dh, -1, 1) * (dh / d) * .9, behind = (dx * m[8] + dz * m[10]) / dh > .3; // camera looks down -Z
  const f = clamp(16000 * Math.exp(-d / 140), 260, 16000) * (behind ? .72 : 1), g = v.loud * 25 / (25 + d), sg = v.send * clamp(.3 + d / 260, .3, 1.3);
  if (hard) { v.sp.gain.value = g; v.lp.frequency.value = f; if (v.pn.pan) v.pn.pan.value = pan; if (v.sg) v.sg.gain.value = sg; }
  else { v.sp.gain.setTargetAtTime(g, now, .08); v.lp.frequency.setTargetAtTime(f, now, .08); if (v.pn.pan) v.pn.pan.setTargetAtTime(pan, now, .08); if (v.sg) v.sg.gain.setTargetAtTime(sg, now, .2); }
  if (v.dop && (v.vx || v.vz)) { const vr = clamp(-(dx * v.vx + dz * v.vz) / d, -120, 120), ct = 1200 * Math.log2(343 / (343 - vr)); for (const o of v.dop) o.detune.setTargetAtTime(ct, now, .12); }
}
function avFree(v) {
  if (v.dead) return; v.dead = 1; const A = AMB;
  for (const n of v.src) n.disconnect(); for (const n of v.nodes) n.disconnect();
  v.env.disconnect(); v.sp.disconnect(); v.lp.disconnect(); v.pn.disconnect(); if (v.sg) v.sg.disconnect();
  const i = A.live.indexOf(v); if (i >= 0) { A.live[i] = A.live[A.live.length - 1]; A.live.pop(); } A.nv--;
}
const avN = (v, rate) => { const s = AMB.c.createBufferSource(); s.buffer = AU.noise; s.loop = true; s.nz = 1; s.playbackRate.value = rate || 1; v.src.push(s); return s; };
const avB = (v, buf, rate) => { const s = AMB.c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate || 1; v.src.push(s); return s; };
const avO = (v, type, f) => { const o = AMB.c.createOscillator(); o.type = type; o.frequency.value = f; v.src.push(o); return o; };
const avF = (v, type, f, q) => { const n = AMB.BQ(type, f, q); v.nodes.push(n); return n; };
const avG = (v, g) => { const n = AMB.G1(g); v.nodes.push(n); return n; };
// start every source at t0 and stop at t1 (or its own .stopAt); the voice frees itself when the last one ends
function avGo(v, t0, t1) {
  v.left = v.src.length;
  for (const s of v.src) { s.onended = () => { if (--v.left <= 0) avFree(v); }; s.start(t0, s.nz ? Math.random() * 1.5 : 0); const e = s.stopAt || t1; if (e) s.stop(e); }
}
// a random spot around the listener; front = biased into view (skyline events)
const _fp = { x: 0, z: 0, d: 0 };
function farPt(d0, d1, front, L) {
  const m = camera.matrixWorld.elements, c = L || AMB.L; let a = rand(0, TAU);
  if (front && Math.random() < .75) a = Math.atan2(-m[10], -m[8]) + rand(-1, 1);
  const d = rand(d0, d1); _fp.x = clamp(c.x + Math.cos(a) * d, -HALF - 80, HALF + 80); _fp.z = clamp(c.z + Math.sin(a) * d, -HALF - 80, HALF + 80); _fp.d = Math.hypot(_fp.x - c.x, _fp.z - c.z); return _fp;
}
// tallest box under a point (rooftops for the searchlight, flares, tracers)
function roofAt(x, z) {
  const l = grid.get(gk(Math.floor(x / CELL), Math.floor(z / CELL))); let h = 0;
  if (l) for (let i = 0; i < l.length; i++) { const b = l[i]; if (!b.water && x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && b.y1 > h) h = b.y1; }
  return h;
}

/* ---------- distant life ---------- */
// a burst of distant shots: one noise source, a transient per shot on the envelope, a slap echo off a far facade
function ambGun(x, z, n, gap, heavy, delay) {
  const v = ambVoice(x, z, heavy ? 3 : 2.2, .8); if (!v) return;
  try {
    const c = AMB.c, t0 = c.currentTime + .03 + (delay || 0), g = v.env.gain, sb = SFXbuf('gun_distant');
    let t = t0, tail = 0;
    if (sb && n <= 3 && Math.random() < .6) { g.setValueAtTime(.8, t0); for (let i = 0; i < n; i++) { const s = avB(v, sb, rand(.78, 1.08)); s.connect(v.env); s._at = t; tail = t + sb.duration / s.playbackRate.value + .05; t += gap * rand(.8, 1.3); } }
    else {
      const s = avN(v, rand(.8, 1.15)), bp = avF(v, 'bandpass', rand(700, 1500), .6), lo = avF(v, 'lowpass', 230, .8), lg = avG(v, heavy ? 1.8 : 1.2);
      s.connect(bp); bp.connect(v.env); s.connect(lo); lo.connect(lg); lg.connect(v.env);
      const dur = Math.min(.15, gap * .8);
      for (let i = 0; i < n; i++) { const pk = rand(.6, 1); g.setValueAtTime(.0001, t); g.exponentialRampToValueAtTime(pk, t + .003); g.exponentialRampToValueAtTime(pk * .18, t + dur * .4); g.exponentialRampToValueAtTime(.0001, t + dur); t += gap * rand(.8, 1.25) + (Math.random() < .12 ? rand(.2, .6) : 0); }
    }
    const dl = c.createDelay(1); v.nodes.push(dl); dl.delayTime.value = rand(.16, .6); const el = avF(v, 'lowpass', 1100, .5), eg = avG(v, rand(.22, .42));
    v.env.connect(dl); dl.connect(el); el.connect(eg); eg.connect(v.sp);
    v.left = v.src.length; const end = Math.max(t + 1.4, tail);
    for (const s of v.src) { s.onended = () => { if (--v.left <= 0) avFree(v); }; s.start(s._at || t0, s.nz ? Math.random() * 1.5 : 0); s.stop(end); }
  } catch (e) { avFree(v); }
}
// a cruiser crossing the grid somewhere: wail or yelp, Doppler as it passes
function ambSirenPass() {
  const A = AMB, L = A.L, a = rand(0, TAU), dmin = rand(70, 240), sp = rand(18, 28) * (Math.random() < .5 ? 1 : -1), dur = rand(14, 22);
  const ux = -Math.sin(a), uz = Math.cos(a), v = ambVoice(L.x + Math.cos(a) * dmin - ux * sp * dur / 2, L.z + Math.sin(a) * dmin - uz * sp * dur / 2, 2.4, .6); if (!v) return;
  v.vx = ux * sp; v.vz = uz * sp;
  const c = A.c, t0 = c.currentTime + .05, yelp = Math.random() < .35;
  const o1 = avO(v, 'sawtooth', 760), o2 = avO(v, 'square', 772), g2 = avG(v, .3), bp = avF(v, 'bandpass', 1300, 1.4), lfo = avO(v, yelp ? 'triangle' : 'sine', yelp ? 3.2 : rand(.17, .25)), lg = avG(v, yelp ? 220 : 330);
  lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency); o1.connect(bp); o2.connect(g2); g2.connect(bp); bp.connect(v.env); v.dop = [o1, o2];
  if (!yelp && Math.random() < .5) { lfo.frequency.setValueAtTime(3.3, t0 + dur * .55); lg.gain.setValueAtTime(220, t0 + dur * .55); }
  const g = v.env.gain; g.setValueAtTime(.0001, t0); g.exponentialRampToValueAtTime(.55, t0 + 1.5); g.setValueAtTime(.55, t0 + dur - 2); g.exponentialRampToValueAtTime(.0001, t0 + dur);
  avGo(v, t0, t0 + dur + .1);
}
function ambDog(x, z, n, big, delay) {
  const v = ambVoice(x, z, big ? 1.8 : 1.3, .5); if (!v) return;
  const c = AMB.c, t0 = c.currentTime + .05 + (delay || 0), o = avO(v, 'sawtooth', 400), f = avF(v, 'bandpass', big ? 750 : 1400, 2.2), ns = avN(v, 1), nf = avF(v, 'bandpass', big ? 1100 : 2200, 1.2), ng = avG(v, .4);
  o.connect(f); f.connect(v.env); ns.connect(nf); nf.connect(ng); ng.connect(v.env);
  const g = v.env.gain, fr = o.frequency; let t = t0;
  for (let i = 0; i < n; i++) {
    const f0 = big ? rand(240, 320) : rand(480, 650); fr.setValueAtTime(f0, t); fr.exponentialRampToValueAtTime(f0 * 1.15, t + .03); fr.exponentialRampToValueAtTime(f0 * .6, t + .14);
    g.setValueAtTime(.0001, t); g.exponentialRampToValueAtTime(1, t + .015); g.exponentialRampToValueAtTime(.35, t + .07); g.exponentialRampToValueAtTime(.0001, t + .17);
    t += rand(.26, .48) + (Math.random() < .2 ? rand(.5, 1.1) : 0);
  }
  avGo(v, t0, t + .3);
}
// classic car alarm: a few of whoop / two-tone / horn / warble
function ambAlarm(x, z) {
  const v = ambVoice(x, z, 1.8, .55); if (!v) return;
  const c = AMB.c, t0 = c.currentTime + .05, o = avO(v, 'square', 900), o2 = avO(v, 'square', 520), g2 = avG(v, 0), bp = avF(v, 'bandpass', 1500, .9);
  o.connect(bp); o2.connect(g2); g2.connect(bp); bp.connect(v.env);
  const g = v.env.gain, f = o.frequency; g.setValueAtTime(.0001, t0); g.exponentialRampToValueAtTime(.5, t0 + .05); let t = t0 + .06;
  for (let p = 0, np = rint(2, 4), k0 = rint(0, 3); p < np; p++) {
    const k = (k0 + p) % 4;
    if (k === 0) for (let i = 0; i < 6; i++) { f.setValueAtTime(500, t); f.exponentialRampToValueAtTime(1700, t + .4); t += .45; }
    else if (k === 1) for (let i = 0; i < 20; i++) { f.setValueAtTime(i % 2 ? 1150 : 780, t); t += .13; }
    else if (k === 2) { f.setValueAtTime(415, t); g2.gain.setValueAtTime(.8, t); for (let i = 0; i < 8; i++) { g.setValueAtTime(.5, t); g.setValueAtTime(.0001, t + .28); t += .5; } g.setValueAtTime(.5, t); g2.gain.setValueAtTime(0, t); }
    else for (let i = 0; i < 24; i++) { f.setValueAtTime(i % 2 ? 1300 : 950, t); t += .06; }
  }
  g.setValueAtTime(.5, t); g.exponentialRampToValueAtTime(.0001, t + .06); avGo(v, t0, t + .1);
}
function ambGlass(x, z) {
  const v = ambVoice(x, z, 1.6, .6); if (!v) return;
  const c = AMB.c, t0 = c.currentTime + .05, sb = SFXbuf('glass_shatter'), g = v.env.gain;
  if (sb) { const s = avB(v, sb, rand(.82, 1.06)); s.connect(v.env); g.setValueAtTime(.9, t0); avGo(v, t0, t0 + sb.duration / .8 + .1); return; }
  const s = avN(v, 1.3), hp = avF(v, 'highpass', 3200, .7), o = avO(v, 'sine', 4000), og = avG(v, 0); s.connect(hp); hp.connect(v.env); o.connect(og); og.connect(v.sp);
  g.setValueAtTime(.0001, t0); g.exponentialRampToValueAtTime(1, t0 + .005); g.exponentialRampToValueAtTime(.08, t0 + .25); g.exponentialRampToValueAtTime(.0001, t0 + .6);
  let t = t0 + .06; for (let k = 0; k < 7; k++) { o.frequency.setValueAtTime(rand(2600, 6500), t); og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(rand(.12, .32), t + .004); og.gain.exponentialRampToValueAtTime(.0001, t + .09); t += rand(.05, .16); }
  avGo(v, t0, Math.max(t, t0 + .6) + .1);
}
// far screams: rare, always distant and heavily filtered
function ambScream(x, z) {
  const A = AMB; if (G.t - A.lastScream < 30) return;
  const v = ambVoice(x, z, 1.2, 1.1); if (!v) return; A.lastScream = G.t;
  const c = A.c, t0 = c.currentTime + .05, sb = SFXbuf(Math.random() < .5 ? 'scream_1' : 'scream_2'), lp = avF(v, 'lowpass', 1400, .5); lp.connect(v.env);
  if (sb) { const s = avB(v, sb, rand(.8, .97)); s.connect(lp); v.env.gain.setValueAtTime(.6, t0); avGo(v, t0, t0 + sb.duration / .8 + .1); return; }
  const o = avO(v, 'sawtooth', 520), vib = avO(v, 'sine', 5.5), vg = avG(v, 14), f1 = avF(v, 'bandpass', 850, 6), f2 = avF(v, 'bandpass', 1250, 8), f2g = avG(v, .7);
  vib.connect(vg); vg.connect(o.frequency); o.connect(f1); o.connect(f2); f1.connect(lp); f2.connect(f2g); f2g.connect(lp);
  const fr = o.frequency, d = rand(.9, 1.5); fr.setValueAtTime(rand(440, 560), t0); fr.linearRampToValueAtTime(rand(720, 880), t0 + .25); fr.linearRampToValueAtTime(rand(420, 520), t0 + d);
  const g = v.env.gain; g.setValueAtTime(.0001, t0); g.exponentialRampToValueAtTime(.45, t0 + .12); g.setValueAtTime(.45, t0 + d * .7); g.exponentialRampToValueAtTime(.0001, t0 + d);
  avGo(v, t0, t0 + d + .1);
}
function ambBoom(x, z, big, delay, y) {
  const v = ambVoice(x, z, big ? 7 : 5, 1, true, y); if (!v) return;
  const c = AMB.c, t0 = c.currentTime + .03 + (delay || 0), sb = SFXbuf('car_explode'), lp = avF(v, 'lowpass', 900, .6); lp.connect(v.env);
  if (sb) avB(v, sb, rand(.62, .82)).connect(lp);
  const n = avN(v, .6), nl = avF(v, 'lowpass', 420, .7), ng = avG(v, sb ? .8 : 1.4); n.connect(nl); nl.connect(ng); ng.connect(v.env);
  nl.frequency.setValueAtTime(520, t0); nl.frequency.exponentialRampToValueAtTime(70, t0 + 3.2);
  const o = avO(v, 'triangle', 55), og = avG(v, 1); o.connect(og); og.connect(v.env); o.frequency.setValueAtTime(62, t0); o.frequency.exponentialRampToValueAtTime(26, t0 + 1.4); o.stopAt = t0 + 1.6;
  const g = v.env.gain; g.setValueAtTime(.0001, t0); g.exponentialRampToValueAtTime(1, t0 + .02); g.exponentialRampToValueAtTime(.35, t0 + .7); g.exponentialRampToValueAtTime(.0001, t0 + 4);
  avGo(v, t0, t0 + 4.1);
}
// Salem's bell: inharmonic partials (hum, prime, tierce, quint, nominal...) in the score's key of D
const BELL_PARTIALS = [[.5, 9, .3], [1, 6.5, .5], [1.19, 4.5, .32], [1.5, 3.2, .18], [2, 3.4, .42], [2.51, 2.2, .14], [3.01, 1.6, .1]];
function ambToll(x, z) {
  const v = ambVoice(x, z, 3.2, .9, true, 26); if (!v) return;
  const c = AMB.c, t0 = c.currentTime + .05, f = 146.83; v.env.gain.setValueAtTime(1, t0);
  for (const [r, dec, a] of BELL_PARTIALS) { const o = avO(v, 'sine', f * r * rand(.998, 1.002)), g = avG(v, 0); o.connect(g); g.connect(v.env); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(a, t0 + .006); g.gain.exponentialRampToValueAtTime(.0001, t0 + dec); o.stopAt = t0 + dec + .05; }
  const s = avN(v, 1), sf = avF(v, 'bandpass', 2400, 1.5), sg = avG(v, 0); s.connect(sf); sf.connect(sg); sg.connect(v.env); s.stopAt = t0 + .1;
  sg.gain.setValueAtTime(.0001, t0); sg.gain.exponentialRampToValueAtTime(.4, t0 + .003); sg.gain.exponentialRampToValueAtTime(.0001, t0 + .06);
  avGo(v, t0, t0 + 9.1);
}
AMB.bellPos = function () {
  if (this._bell) return this._bell; const r = typeof ROOMS !== 'undefined' && ROOMS.church && ROOMS.church.doors[0];
  return this._bell = r ? { x: r.ret.x, z: r.ret.z + 8 } : { x: -140, z: 140 };
};
AMB.firefight = function () { const p = farPt(150, 480); let d = 0; const x = p.x, z = p.z; for (let k = 0, n = rint(3, 6); k < n; k++) { const q = k % 2 ? 18 : 0; ambGun(x + q, z + q * .6, rint(2, 9), rand(.08, .14), k % 2 === 1, d); d += rand(.4, 1.8); } };

/* ---------- one-shot cues other systems can ask for ---------- */
AMB.event = function (kind, pos) {
  if (kind === 'explosion' && pos && this.gfx && camera.position.distanceTo(pos) > 120) return this.skyBoom(pos.x, pos.z);
  if (!this.ok) return; let x, z;
  if (pos) { x = pos.x; z = pos.z; } else { const p = farPt(kind === 'door' ? 0 : 100, kind === 'door' ? 0 : 380); x = p.x; z = p.z; }
  switch (kind) {
    case 'glass': ambGlass(x, z); break;
    case 'alarm': ambAlarm(x, z); break;
    case 'dog': ambDog(x, z, rint(2, 6), Math.random() < .5); break;
    case 'scream': this.lastScream = -99; ambScream(x, z); break;
    case 'gunfire': ambGun(x, z, rint(2, 9), rand(.08, .3), Math.random() < .5); break;
    case 'siren': ambSirenPass(); break;
    case 'explosion': ambBoom(x, z, Math.random() < .4, Math.hypot(x - this.L.x, z - this.L.z) / 343); break;
    case 'door': this.door(pos); break;
  }
};
AMB.door = function (pos) {
  if (!this.ok) return; const c = this.c, t = c.currentTime + .02, out = this.G1(.5);
  let pn = null; if (pos) { const sp = spatial(pos); out.gain.value = .5 * Math.max(.1, sp.vol); pn = this.pan(); if (pn.pan) pn.pan.value = sp.pan; out.connect(pn); pn.connect(AU.sfx); } else out.connect(AU.sfx);
  const o = c.createOscillator(), of = this.BQ('bandpass', 900, 14), og = this.G1(0); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(110, t + .25); o.frequency.linearRampToValueAtTime(85, t + .45); o.connect(of); of.connect(og); og.connect(out);
  og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(.35, t + .06); og.gain.exponentialRampToValueAtTime(.0001, t + .5);
  const s = c.createBufferSource(); s.buffer = AU.noise; const sf = this.BQ('lowpass', 220, 1), sg = this.G1(0), cl = this.BQ('bandpass', 3200, 3), cg = this.G1(0);
  s.connect(sf); sf.connect(sg); sg.connect(out); s.connect(cl); cl.connect(cg); cg.connect(out);
  sg.gain.setValueAtTime(.0001, t + .42); sg.gain.exponentialRampToValueAtTime(1.2, t + .43); sg.gain.exponentialRampToValueAtTime(.0001, t + .62);
  cg.gain.setValueAtTime(.0001, t + .43); cg.gain.exponentialRampToValueAtTime(.4, t + .432); cg.gain.exponentialRampToValueAtTime(.0001, t + .47);
  o.start(t); o.stop(t + .55); s.start(t, Math.random()); s.stop(t + .7);
  s.onended = () => { for (const n of [o, of, og, s, sf, sg, cl, cg, out]) n.disconnect(); if (pn) pn.disconnect(); };
};

/* ---------- footsteps ---------- */
// [heel band f, Q, heel decay, body lowpass f, body gain]
const STEP_SYN = { asphalt: [1600, 1.1, .045, 240, .8], concrete: [2300, 1.4, .038, 300, .7], stone: [2700, 1.6, .05, 320, .6], wood: [520, 3.2, .085, 150, 1.1], metal: [1150, 9, .17, 210, .55], grass: [3600, .5, .13, 0, 0], water: [850, .7, .24, 170, .7], wet: [1600, 1.1, .045, 240, .8] };
const SURF_ALIAS = { brick: 'concrete', plaster: 'concrete', tile: 'concrete', glass: 'concrete', dirt: 'grass', puddle: 'wet', carroof: 'metal' };
AMB.footstep = function (surf, k, isPlayer, pos, heavy) {
  if (!this._int) { if (isPlayer) this.extPT = G.t; else this.extNT = G.t; }
  if (!this.ok || this.ns >= this.scap) return;
  surf = STEP_SYN[surf] ? surf : SURF_ALIAS[surf] || 'asphalt'; const S = STEP_SYN[surf]; k = clamp(k === undefined ? .4 : k, 0, 1);
  const c = this.c, t = c.currentTime + .005, out = this.G1(0); let pn = null;
  if (isPlayer || !pos) { out.gain.value = (.09 + .2 * k) * (P.crouching ? .55 : 1); out.connect(AU.sfx); }
  else {
    const dx = pos.x - camera.position.x, dz = pos.z - camera.position.z, d = Math.hypot(dx, dz) + .01; if (d > 32) return;
    const m = camera.matrixWorld.elements; out.gain.value = (.12 + .25 * k) * 7 / (7 + d) * (heavy ? 1.6 : 1);
    pn = this.pan(); if (pn.pan) pn.pan.value = clamp((dx * m[0] + dz * m[2]) / d, -1, 1) * .85; out.connect(pn); pn.connect(AU.sfx);
  }
  const s = c.createBufferSource(); s.buffer = AU.noise; s.playbackRate.value = rand(.85, 1.15); const nodes = [out], hv = heavy ? .6 : 1;
  const lay = (type, f, q, a, att, dec) => { const fl = this.BQ(type, f, q), g = this.G1(0); s.connect(fl); fl.connect(g); g.connect(out); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(a, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + att + dec); nodes.push(fl, g); return fl; };
  if (surf === 'grass') { lay('bandpass', 3800, .6, .7, .02, .12); lay('highpass', 6000, .5, .35, .01, .07); }
  else lay('bandpass', S[0] * rand(.9, 1.1) * hv, S[1], 1, .002, S[2]);                                         // heel strike
  if (S[3]) lay('lowpass', S[3] * hv, .8, S[4], .004, .07);                                                     // body weight
  if (surf === 'wet') lay('bandpass', rand(2800, 4800), .9, .6, .008, .11);                                     // splash off the puddles
  if (surf === 'water') { const w = lay('bandpass', 1200, .8, 1, .012, .24); w.frequency.setValueAtTime(1300, t); w.frequency.exponentialRampToValueAtTime(420, t + .25); lay('highpass', 4000, .6, .3, .02, .15); }
  if (surf === 'metal') lay('bandpass', rand(2400, 3200), 14, .4, .002, .25);                                   // the panel rings
  if (k > .6 && surf !== 'grass') lay('highpass', 4500, .6, .25 * k, .01, .06);                                 // sprint scuff
  s.start(t, Math.random() * 1.6); s.stop(t + .45); this.ns++;
  s.onended = () => { s.disconnect(); for (const n of nodes) n.disconnect(); if (pn) pn.disconnect(); this.ns--; };
};
AMB.surfAt = function (x, z, y, st) {
  if (st === 'apt') return 'wood';
  if (G.inside) return ({ church: 'stone', guns: 'concrete', club: 'concrete', metro: 'concrete' })[G.inside] || 'concrete';
  const l = grid.get(gk(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (l) for (let i = 0; i < l.length; i++) { const b = l[i]; if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue; if (b.water && y < b.y1 + .1) return 'water'; if (y > .2 && Math.abs(b.y1 - y) < .3) return b.surf === 'wood' ? 'wood' : b.surf || 'metal'; }
  if (y > .7) for (const c of CARS) { const dx = c.pos.x - x, dz = c.pos.z - z; if (dx * dx + dz * dz < 6.5) return 'metal'; }
  if (this.grass.has(gcell(x, z))) return 'grass';
  const lx = ((x + HALF) % CW + CW) % CW, lz = ((z + HALF) % CW + CW) % CW, base = lx > 5 && lx < 35 && lz > 5 && lz < 35 ? 'concrete' : 'asphalt';
  return G.rainK > .3 && Math.random() < G.rainK * .85 ? 'wet' : base;
};
const gcell = (x, z) => (Math.floor(x / 2.5) + 4000) * 8000 + Math.floor(z / 2.5) + 4000;
// player and nearby enemies step on their own unless another system is calling footstep()
AMB.steps = function (dt, st) {
  if (st !== 'city' && st !== 'apt') return;
  if (!P.inCar && !P.dead && P.onGround && !(st === 'apt' && G.wakeT > 0)) {
    const sp = Math.hypot(P.vel.x, P.vel.z);
    if (sp < .7) this.ph = Math.min(this.ph, .55);
    else { this.ph += sp * dt / (P.sprint ? 1.25 : P.crouching ? .55 : .78); if (this.ph >= 1) { this.ph -= 1; if (G.t - this.extPT > 1.5) { this._int = 1; this.footstep(this.surfAt(P.pos.x, P.pos.z, P.pos.y, st), clamp(sp / 9, 0, 1), true); this._int = 0; } } }
  }
  if (st !== 'city' || G.t - this.extNT < 1.5) return;
  for (const e of ENEMIES) {
    if (e.dead || e.type === 'witch' || (e.R && !e.R.root.visible) || e.pos.y > .3) continue;
    const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z; if (dx * dx + dz * dz > 22 * 22) continue;
    const sp = e.st ? e.st.speed : 0; if (sp < .8) continue;
    let ph = (this.eph.get(e) || 0) + sp * dt / (e.type === 'demon' ? 1.1 : sp > 5 ? 1.2 : .8);
    if (ph >= 1) { ph -= 1; this._int = 1; this.footstep(this.surfAt(e.pos.x, e.pos.z, 0, st), clamp(sp / 8, 0, 1), false, e.pos, e.type === 'demon' || e.type === 'shifter' && e.mode !== 'disguise'); this._int = 0; }
    this.eph.set(e, ph);
  }
};

/* ---------- barks: short non-verbal vocal cues ---------- */
// f = pitch contour (0 = unvoiced), d = length, F = formants, b = breath, a = attack
const BARK_SYN = {
  grunt: { f: [125, 95], d: .2, F: [620, 1080], b: .12, a: .012 }, shout: { f: [175, 245, 150], d: .38, F: [760, 1650], b: .2, a: .02 },
  death: { f: [150, 70], d: .5, F: [560, 950], b: .25, a: .01 }, mutter: { f: [115, 105, 120], d: .6, F: [520, 1250], b: .1, a: .05, syl: 4 },
  demon: { f: [64, 44], d: .75, F: [330, 760], b: .35, a: .03, drive: 1 }, shifter: { f: [92, 60], d: .5, F: [450, 900], b: .3, a: .02, drive: 1 },
  witch: { f: 0, d: .55, F: [900, 2600], b: 1, a: .06, syl: 3 }, vampire: { f: 0, d: .5, F: [5200, 7600], b: 1, a: .03, hp: 1 },
  reptile: { f: 0, d: .45, F: [2600, 5400], b: 1, a: .01, syl: 3 }, civ: { f: 0, d: .28, F: [1300, 2300], b: 1, a: .05 },
};
const BARK_TYPE = { purger: ['shout', 'grunt'], demon: ['demon'], vampire: ['vampire'], witch: ['witch'], reptile: ['reptile'], shifter: ['shifter'], civilian: ['civ'] };
AMB.bark = function (pos, kind) {
  if (!this._int) this.extBT = G.t;
  if (!this.ok || !pos) return; if (BARK_TYPE[kind]) kind = pick(BARK_TYPE[kind]);
  const B = BARK_SYN[kind] || BARK_SYN.grunt, v = ambVoice(pos.x, pos.z, kind === 'demon' ? 1.1 : kind === 'mutter' ? .45 : .8, 0, false, (pos.y || 0) + 1.6, true); if (!v) return;
  try {
    const c = this.c, t0 = c.currentTime + .02, d = B.d * rand(.85, 1.15), g = v.env.gain, pk = .5, sum = avG(v, 1); sum.connect(v.env);
    if (B.f) {
      const o = avO(v, 'sawtooth', B.f[0]), f1 = avF(v, 'bandpass', B.F[0] * rand(.92, 1.08), 5), f2 = avF(v, 'bandpass', B.F[1] * rand(.92, 1.08), 7), f2g = avG(v, .55); let src = o;
      if (B.drive) { const ws = c.createWaveShaper(); ws.curve = this.drv || (this.drv = (() => { const a = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; a[i] = Math.tanh(x * 4); } return a; })()); v.nodes.push(ws); o.connect(ws); src = ws; }
      src.connect(f1); src.connect(f2); f1.connect(sum); f2.connect(f2g); f2g.connect(sum);
      const fr = o.frequency, r = rand(.9, 1.12); fr.setValueAtTime(B.f[0] * r, t0); if (B.f.length > 2) fr.linearRampToValueAtTime(B.f[1] * r, t0 + d * .3); fr.linearRampToValueAtTime(B.f[B.f.length - 1] * r, t0 + d);
      if (B.syl) for (let i = 1; i < B.syl; i++) f1.frequency.setValueAtTime(rand(400, 760), t0 + i * d / B.syl);
    }
    const n = avN(v, 1), nf = avF(v, B.hp ? 'highpass' : 'bandpass', B.F[B.hp ? 0 : 1], B.f ? 1.5 : 4), ng = avG(v, B.b); n.connect(nf); nf.connect(ng); ng.connect(sum);
    if (!B.f && !B.hp) { const nf2 = avF(v, 'bandpass', B.F[0], 5); n.connect(nf2); nf2.connect(ng); }
    if (B.syl) { const sd = d / B.syl; for (let i = 0; i < B.syl; i++) { const ti = t0 + i * sd; g.setValueAtTime(.0001, ti); g.exponentialRampToValueAtTime(pk * rand(.5, 1), ti + Math.min(B.a, sd * .3)); g.exponentialRampToValueAtTime(.0001, ti + sd * .9); } }
    else { g.setValueAtTime(.0001, t0); g.exponentialRampToValueAtTime(pk, t0 + B.a); g.setValueAtTime(pk, t0 + d * .55); g.exponentialRampToValueAtTime(.0001, t0 + d); }
    avGo(v, t0, t0 + d + .05);
  } catch (e) { avFree(v); }
};
const ALERT_BARK = { purger: 'shout', demon: 'demon', vampire: 'vampire', witch: 'witch', reptile: 'reptile' }, PAIN_BARK = { purger: 'grunt', demon: 'demon', shifter: 'shifter', reptile: 'reptile' };
// enemies voice what they're doing (spotted you, hurt, dying, idle chatter) unless the AI is calling bark() itself
AMB.autoBarks = function (dt) {
  if (G.state !== 'city' || G.t - this.extBT < 12) return; this.barkT -= dt;
  for (const e of ENEMIES) {
    let s = this.eb.get(e); if (!s) { this.eb.set(e, { aw: e.aware, hp: e.hp, dead: e.dead }); continue; }
    const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d2 = dx * dx + dz * dz;
    if (d2 < 45 * 45 && this.barkT <= 0 && e.mode !== 'disguise') {
      let k = null;
      if (e.dead && !s.dead) k = e.type === 'purger' && Math.random() < .7 ? 'death' : null;
      else if (!e.dead && e.aware && !s.aw && Math.random() < .75) k = ALERT_BARK[e.type];
      else if (!e.dead && s.hp - e.hp > 12 && Math.random() < .55) k = PAIN_BARK[e.type];
      else if (!e.dead && !e.aware && e.type === 'purger' && d2 < 20 * 20 && Math.random() < .006) k = 'mutter';
      if (k) { this._int = 1; this.bark(e.pos, k); this._int = 0; this.barkT = .7; }
    }
    s.aw = e.aware; s.hp = e.hp; s.dead = e.dead;
  }
};

/* ---------- low health: heartbeat + muffling ---------- */
AMB.lowHealth = function (k) { this.lhExt = clamp(k || 0, 0, 1); this.lhT = G.t; };
AMB.beat = function (t, k) {
  const c = this.c, o = c.createOscillator(), g = this.G1(0); o.type = 'triangle'; o.connect(g); g.connect(this.hb);
  const f = o.frequency, a = .5 * k + .08, gg = g.gain;
  f.setValueAtTime(64, t); f.exponentialRampToValueAtTime(40, t + .11); f.setValueAtTime(58, t + .25); f.exponentialRampToValueAtTime(38, t + .36);
  gg.setValueAtTime(.0001, t); gg.exponentialRampToValueAtTime(a, t + .012); gg.exponentialRampToValueAtTime(.0001, t + .16); gg.setValueAtTime(.0001, t + .25); gg.exponentialRampToValueAtTime(a * .65, t + .262); gg.exponentialRampToValueAtTime(.0001, t + .4);
  o.start(t); o.stop(t + .42); o.onended = () => { o.disconnect(); g.disconnect(); };
};
AMB.flatline = function () {
  const c = this.c, t = c.currentTime + .05, o = c.createOscillator(), g = this.G1(0); o.frequency.value = 960; o.connect(g); g.connect(this.hb);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.035, t + .05); g.gain.setValueAtTime(.035, t + 2.2); g.gain.exponentialRampToValueAtTime(.0001, t + 2.8);
  o.start(t); o.stop(t + 2.9); o.onended = () => { o.disconnect(); g.disconnect(); };
};

/* ---------- the apartment TV: a muffled emergency broadcast ---------- */
const TV_VOWELS = [[730, 1090], [530, 1840], [300, 2200], [570, 840], [440, 1020], [660, 1700], [400, 1900]];
AMB.tvOn = function () {
  if (this.tv || !this.ok) return; const c = this.c, now = c.currentTime, T = this.tv = { nodes: [], ph: 0 }, N = n => (T.nodes.push(n), n);
  T.o = N(c.createOscillator()); T.o.type = 'sawtooth'; T.o.frequency.value = 120;
  T.f1 = N(this.BQ('bandpass', 700, 6)); T.f2 = N(this.BQ('bandpass', 1300, 8)); T.env = N(this.G1(0)); T.band = N(this.BQ('bandpass', 1700, .6)); T.g = N(this.G1(0)); T.pn = N(this.pan());
  const f2g = N(this.G1(.7)); T.o.connect(T.f1); T.o.connect(T.f2); T.f1.connect(T.env); T.f2.connect(f2g); f2g.connect(T.env);
  T.n = N(c.createBufferSource()); T.n.buffer = AU.noise; T.n.loop = true; const nf = N(this.BQ('bandpass', 4200, 1.2)); T.ng = N(this.G1(0)); const hs = N(this.G1(.025));
  T.n.connect(nf); nf.connect(T.ng); T.ng.connect(T.band); T.n.connect(hs); hs.connect(T.band);
  T.env.connect(T.band); T.band.connect(T.g); T.g.connect(T.pn); T.pn.connect(this.dry);
  // the EAS attention tone (853 + 960 Hz) before the announcer
  const a = N(c.createOscillator()), b = N(c.createOscillator()), ag = N(this.G1(0)); a.frequency.value = 853; b.frequency.value = 960; a.connect(ag); b.connect(ag); ag.connect(T.band);
  ag.gain.setValueAtTime(0, now); ag.gain.setTargetAtTime(.1, now + .3, .02); ag.gain.setTargetAtTime(0, now + 3.6, .03);
  a.start(now); b.start(now); a.stop(now + 4); b.stop(now + 4); T.o.start(now); T.n.start(now, Math.random()); T.next = now + 4.1;
};
AMB.tvOff = function () {
  const T = this.tv; if (!T) return; this.tv = null; T.g.gain.setTargetAtTime(0, this.c.currentTime, .05);
  setTimeout(() => { for (const n of T.nodes) { try { if (n.stop) n.stop(); } catch (e) { } n.disconnect(); } }, 300);
};
AMB.tvTick = function () {
  const T = this.tv; if (!T) return; const c = this.c, now = c.currentTime, cp = camera.position, m = camera.matrixWorld.elements;
  const dx = APT.x + 4.94 - cp.x, dz = APT.z + 2.2 - cp.z, d = Math.hypot(dx, dz) + .3;
  T.g.gain.setTargetAtTime(clamp(1.4 / (d + .6), 0, 1) * .3, now, .1); if (T.pn.pan) T.pn.pan.setTargetAtTime(clamp((dx * m[0] + dz * m[2]) / d, -1, 1) * .8, now, .1);
  while (T.next < now + .35) {
    const t = T.next; T.ph++;
    if (Math.random() < .14) { T.next += rand(.18, .45); continue; }                                            // between words
    const dur = rand(.09, .21), f0 = 118 * (1 + .12 * Math.sin(T.ph * .31) + .05 * Math.sin(T.ph * 1.7)) * (T.ph % 23 > 20 ? .86 : 1), vw = TV_VOWELS[(Math.random() * TV_VOWELS.length) | 0];
    T.o.frequency.setTargetAtTime(f0, t, .03); T.f1.frequency.setTargetAtTime(vw[0], t, .02); T.f2.frequency.setTargetAtTime(vw[1], t, .02);
    T.env.gain.setTargetAtTime(rand(.5, 1), t, .015); T.env.gain.setTargetAtTime(0, t + dur * .75, .025);
    if (Math.random() < .3) { T.ng.gain.setTargetAtTime(.5, t + dur * .8, .01); T.ng.gain.setTargetAtTime(0, t + dur * .8 + .05, .015); }
    T.next += dur;
  }
};

/* ---------- patched AU voices ---------- */
// the street reverb replaces the old 'city' convolver (one convolver, not two)
const _amb_reverb = AU.reverb;
AU.reverb = function (kind) { if (kind !== 'room' && AMB.ok && AMB.verbIn) return AMB.verbIn; return _amb_reverb ? _amb_reverb.call(this, kind) : null; };
// thunder: a crack when close, then a rolling rumble from somewhere in the clouds
const _amb_thunder = AU.thunder;
AU.thunder = function () {
  if (!AMB.ok) return _amb_thunder.call(this);
  const p = farPt(250, 1200 * (1.25 - G.rainK * .55)), v = ambVoice(p.x, p.z, 16, 1.1, true, 420); if (!v) return;
  const c = AMB.c, t0 = c.currentTime + .03, n = avN(v, .45), lp = avF(v, 'lowpass', 380, .6); n.connect(lp); lp.connect(v.env);
  if (p.d < 600) { const cr = avF(v, 'highpass', 900, .6), cg = avG(v, 0); n.connect(cr); cr.connect(cg); cg.connect(v.sp); cg.gain.setValueAtTime(.0001, t0); cg.gain.exponentialRampToValueAtTime(.9, t0 + .01); cg.gain.exponentialRampToValueAtTime(.0001, t0 + .35); }
  const g = v.env.gain; let t = t0; g.setValueAtTime(0, t0);
  for (let k = 0, nk = rint(3, 6); k < nk; k++) { g.setTargetAtTime(rand(.5, 1) * (1 - k * .1), t, .07); t += rand(.25, .8); g.setTargetAtTime(rand(.15, .35), t, .3); t += rand(.2, .6); }
  g.setTargetAtTime(0, t, .9); avGo(v, t0, t + 4.5);
};
// the purge siren: two distant civil-defence horns winding up, rotating, winding down; muffled indoors
const _amb_siren = AU.siren;
AU.siren = function (dur) {
  if (!AMB.ok) return _amb_siren.call(this, dur);
  for (let k = 0; k < 2; k++) {
    const p = farPt(240, 520), v = ambVoice(p.x, p.z, 4.2, 1.1, true, 30); if (!v) continue;
    const c = AMB.c, t0 = c.currentTime + .05 + k * rand(.3, 1.4), T0 = Math.max(4, dur || 6), up = Math.min(3.5, T0 * .35), dn = Math.min(4, T0 * .4), f = rand(430, 470) * (k ? 1.05 : 1);
    const o1 = avO(v, 'sawtooth', 90), o2 = avO(v, 'sawtooth', 108), o2g = avG(v, .55), bp = avF(v, 'bandpass', 400, .7), am = avG(v, .6), lfo = avO(v, 'sine', rand(.11, .17)), lg = avG(v, .4);
    o1.connect(bp); o2.connect(o2g); o2g.connect(bp); bp.connect(am); am.connect(v.env); lfo.connect(lg); lg.connect(am.gain);
    for (const [o, r] of [[o1, 1], [o2, 1.2]]) { o.frequency.setValueAtTime(90 * r, t0); o.frequency.setTargetAtTime(f * r, t0, up / 3); o.frequency.setTargetAtTime(70 * r, t0 + T0 - dn, dn / 2.5); }
    bp.frequency.setValueAtTime(400, t0); bp.frequency.setTargetAtTime(1100, t0, up / 3); bp.frequency.setTargetAtTime(350, t0 + T0 - dn, dn / 2.5);
    const g = v.env.gain; g.setValueAtTime(.0001, t0); g.exponentialRampToValueAtTime(.7, t0 + up * .6); g.setValueAtTime(.7, t0 + T0 - dn * .6); g.exponentialRampToValueAtTime(.0001, t0 + T0 + .5);
    avGo(v, t0, t0 + T0 + .6);
  }
};
// the club's beat (interiors.js calls AU.thump on every beat): kick, offbeat bass and hat through the walls of the room
if (!AU.thump) AU.thump = function () {
  if (!AMB.ok || G.inside !== 'club') return; const A = AMB, c = A.c, t = c.currentTime + .01, h = t + .238, out = A.G1(.55); out.connect(A.dry);
  const k = c.createOscillator(), kg = A.G1(0), b = c.createOscillator(), bf = A.BQ('lowpass', 420, 4), bg = A.G1(0), s = c.createBufferSource(), sf = A.BQ('highpass', 7000, .7), sg = A.G1(0);
  k.type = 'triangle'; k.frequency.setValueAtTime(150, t); k.frequency.exponentialRampToValueAtTime(44, t + .16); kg.gain.setValueAtTime(.0001, t); kg.gain.exponentialRampToValueAtTime(.9, t + .004); kg.gain.exponentialRampToValueAtTime(.0001, t + .3);
  b.type = 'sawtooth'; b.frequency.value = (A.cb = (A.cb || 0) + 1) % 8 < 6 ? 73.42 : 87.31; bg.gain.setValueAtTime(.0001, h); bg.gain.exponentialRampToValueAtTime(.5, h + .01); bg.gain.exponentialRampToValueAtTime(.0001, h + .2);
  s.buffer = AU.noise; sg.gain.setValueAtTime(.0001, h); sg.gain.exponentialRampToValueAtTime(.25, h + .002); sg.gain.exponentialRampToValueAtTime(.0001, h + .05);
  k.connect(kg); kg.connect(out); b.connect(bf); bf.connect(bg); bg.connect(out); s.connect(sf); sf.connect(sg); sg.connect(out);
  k.start(t); k.stop(t + .32); b.start(h); b.stop(h + .22); s.start(h, Math.random()); s.stop(h + .07);
  s.onended = () => { for (const n of [k, kg, b, bf, bg, s, sf, sg, out]) n.disconnect(); };
};

/* ---------- adaptive score (replaces the synthwave loop) ----------
   D minor, cinematic: a D pedal drone, low detuned-saw strings gliding through a dark
   progression, a muted low pulse, clock ticks, taiko hits, and a braam when a fight starts.
   Every layer is a persistent oscillator whose gain/filter is automated: no per-note nodes. */
const SCORE_PROG = [[38, 50, 57, 62, 65], [34, 46, 58, 62, 65], [39, 51, 58, 63, 67], [38, 50, 57, 62, 65], [43, 55, 58, 62, 67], [34, 46, 58, 62, 65], [45, 52, 57, 61, 64]];
const PULSE_T = [1, 0, 0, 0, .6, 0, 0, 0, 1, 0, 0, 0, .6, 0, .4, 0], PULSE_C = [1, 0, .5, .7, 1, 0, .5, 0, 1, 0, .5, .7, 1, .4, .7, .5];
const mfreq = n => 440 * Math.pow(2, (n - 69) / 12);
AU.startMusic = function () {
  if (!AMB.audio()) return; const c = this.ctx, A = AMB, G1 = A.G1, BQ = A.BQ, M = A.M = { step: 0, next: c.currentTime + .3, ci: -1, braamT: -99, wasCb: false };
  const osc = (type, f, det, dst) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.connect(dst); o.start(); return o; };
  M.out = G1(1); M.out.connect(this.mus);
  // drone: a D pedal breathing through a slow filter
  M.dF = BQ('lowpass', 420, 1.4); M.dG = G1(0); M.dF.connect(M.dG); M.dG.connect(M.out);
  for (const [f, det, ty] of [[73.42, -7, 'sawtooth'], [73.42, 6, 'sawtooth'], [110, 4, 'sawtooth'], [146.83, -3, 'triangle'], [55, 0, 'sine']]) osc(ty, f, det, M.dF);
  const dlg = G1(190); osc('sine', .043, 0, dlg); dlg.connect(M.dF.frequency);
  // low strings: four voices of detuned saw pairs, vibrato, tremolo in a fight
  M.sF = BQ('lowpass', 900, .6); M.trem = G1(1); M.sG = G1(0); M.sF.connect(M.trem); M.trem.connect(M.sG); M.sG.connect(M.out);
  const vibG = G1(5); osc('sine', 4.6, 0, vibG); M.sv = [];
  for (let i = 0; i < 4; i++) { const g = G1(0); g.connect(M.sF); const a = osc('sawtooth', 147, -11, g), b = osc('sawtooth', 147, 10, g); vibG.connect(a.detune); vibG.connect(b.detune); M.sv.push({ a, b, g }); }
  M.tD = G1(0); osc('sine', 7.5, 0, M.tD); M.tD.connect(M.trem.gain);
  // pulse: a muted low saw with a plucked filter
  M.pF = BQ('lowpass', 180, 6); M.pO = osc('sawtooth', 73.42, 0, M.pF); M.pE = G1(0); M.pG = G1(0); M.pF.connect(M.pE); M.pE.connect(M.pG); M.pG.connect(M.out);
  // ticks and drums ride the shared bed noise
  const kh = BQ('highpass', 6500, .7); M.kE = G1(0); M.kG = G1(0); A.nsrc.connect(kh); kh.connect(M.kE); M.kE.connect(M.kG); M.kG.connect(M.out);
  M.tE = G1(0); M.tG = G1(0); M.tO = osc('sine', 60, 0, M.tE); M.tE.connect(M.tG); M.tG.connect(M.out);
  const tn = BQ('lowpass', 380, .7); M.nE = G1(0); A.nsrc.connect(tn); tn.connect(M.nE); M.nE.connect(M.tG);
  setInterval(() => { if (c.state === 'running') A.musTick(); }, 90);
};
AMB.musTick = function () {
  const M = this.M; if (!M) return; const c = this.c, now = c.currentTime, I = this.danger, cb = this.ms === 2, tn = this.ms >= 1, k = G.inside === 'club' ? .35 : 1;
  M.dG.gain.setTargetAtTime((cb ? .11 : tn ? .14 : .17) * k, now, 1);
  M.sG.gain.setTargetAtTime((cb ? .13 : tn ? .1 : .065) * k, now, 1.5);
  M.pG.gain.setTargetAtTime((cb ? .34 : tn ? .2 * clamp((I - .25) * 6, 0, 1) : 0) * k, now, 1.2);
  M.kG.gain.setTargetAtTime(tn && !cb ? .045 * k : 0, now, 1);
  M.tG.gain.setTargetAtTime((cb ? .7 : tn ? .32 : 0) * k, now, .8);
  M.tD.gain.setTargetAtTime(cb ? .42 : 0, now, .6);
  M.sF.frequency.setTargetAtTime(600 + 1900 * I, now, 1);
  if (cb && !M.wasCb && G.t - M.braamT > 25 && G.music) { M.braamT = G.t; this.braam(now + .05); } M.wasCb = cb;
  if (!G.music) { M.next = now + .1; return; }
  if (M.next < now - .2) M.next = now + .05;
  const s16 = 60 / lerp(66, 96, I) / 4;
  while (M.next < now + .32) { this.musStep(M.step++, M.next, s16, I); M.next += s16; }
};
AMB.musStep = function (s, t, s16, I) {
  const M = this.M, pos = s % 16, bar = s >> 4, cb = this.ms === 2, tn = this.ms >= 1;
  if (pos === 0 && (bar % 2 === 0 || M.ci < 0)) { // chord change every two bars
    M.ci = (M.ci + 1) % SCORE_PROG.length; const ch = SCORE_PROG[M.ci];
    M.pO.frequency.setTargetAtTime(mfreq(ch[0]), t, .03);
    for (let i = 0; i < 4; i++) { const v = M.sv[i], f = mfreq(ch[i + 1] + (cb && i > 1 ? 12 : 0)); v.a.frequency.setTargetAtTime(f, t, .5); v.b.frequency.setTargetAtTime(f, t, .5); v.g.gain.setTargetAtTime(.3, t, 1.1); v.g.gain.setTargetAtTime(.16, t + s16 * 20, 2.5); }
  }
  const pk = cb ? PULSE_C[pos] : tn ? PULSE_T[pos] : 0;
  if (pk) { M.pE.gain.setTargetAtTime(pk, t, .004); M.pE.gain.setTargetAtTime(0, t + s16 * .55, .04); M.pF.frequency.setTargetAtTime(220 + 1500 * pk * I, t, .003); M.pF.frequency.setTargetAtTime(170, t + .015, .06); }
  if (tn && !cb && pos % 2 === 0) { M.kE.gain.setTargetAtTime(pos % 8 === 0 ? .9 : .4, t, .001); M.kE.gain.setTargetAtTime(0, t + .01, .012); }
  const hit = cb ? (pos === 0 ? 1 : pos === 6 || pos === 10 || (bar % 2 && pos === 13) ? .65 : 0) : tn && pos === 0 && bar % 2 === 0 ? .55 : 0;
  if (hit) { const o = M.tO.frequency; o.setValueAtTime(96, t); o.exponentialRampToValueAtTime(41, t + .32); M.tE.gain.setTargetAtTime(hit, t, .002); M.tE.gain.setTargetAtTime(0, t + .05, .17); M.nE.gain.setTargetAtTime(hit * .9, t, .001); M.nE.gain.setTargetAtTime(0, t + .012, .06); }
};
AMB.braam = function (t) {
  const c = this.c, f = this.BQ('lowpass', 160, 2.5), g = this.G1(0); f.connect(g); g.connect(this.M.out); const os = [];
  for (const fr of [36.71, 73.42, 77.78, 110, 146.83]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = rand(-12, 12); o.connect(f); o.start(t); o.stop(t + 4.6); os.push(o); }
  f.frequency.setValueAtTime(160, t); f.frequency.exponentialRampToValueAtTime(1900, t + .9); f.frequency.exponentialRampToValueAtTime(220, t + 4.3);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.3, t + .35); g.gain.exponentialRampToValueAtTime(.0001, t + 4.5);
  os[0].onended = () => { for (const o of os) o.disconnect(); f.disconnect(); g.disconnect(); };
};
// danger 0..1 from alerted/nearby enemies, sightlines, recent fire, health, the hour and HEAT
AMB.dangerTick = function (dt, st) {
  let tgt = .06;
  if (st === 'city' && G.started !== undefined) {
    let a = 0, s = 0, n = 0;
    for (const e of ENEMIES) { if (e.dead) continue; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d2 = dx * dx + dz * dz; if (d2 > 6400) continue; if (e.aware) a++; if (e.seesP) s++; if (d2 < 900 && e.mode !== 'disguise') n++; }
    const h = clamp((G.hour || 0) / 12, 0, 1), heat = typeof HEAT !== 'undefined' ? clamp((HEAT.level || 0) / 5, 0, 1) : 0, hp = P.maxHp ? clamp(1 - P.hp / P.maxHp, 0, 1) : 0;
    const hot = a > 0 && (G.t - (P.lastFire || -99) < 3 || P.regenT > 0);   // regenT > 0: hit in the last few seconds
    tgt = P.dead ? .1 : clamp(.07 + .12 * h + .1 * heat + Math.min(1, a * .2 + n * .1) * .38 + (s > 0 ? .28 : 0) + (hot ? .22 : 0) + hp * .14, 0, 1);
  } else if (st === 'paused' || st === 'smith' || st === 'photo' || st === 'pauseload' || st === 'transit') tgt = this.danger;
  this.danger += (tgt - this.danger) * (tgt > this.danger ? 1 - Math.exp(-dt / 1.1) : 1 - Math.exp(-dt / 7));
  const d = this.danger; this.ms = this.ms === 2 ? (d < .55 ? 1 : 2) : this.ms === 1 ? (d > .62 ? 2 : d < .25 ? 0 : 1) : (d > .3 ? 1 : 0);
};

/* ---------- rain over the night ---------- */
// drizzle at 7 PM, a storm somewhere around midnight to 3 AM, clearing toward dawn
AMB.rainCurve = function (h) {
  const s0 = this.storm0, s1 = s0 + this.stormL;
  const k = h < 1 ? lerp(.22, .3, h) : h < s0 - 1 ? lerp(.3, .45, (h - 1) / Math.max(.1, s0 - 2)) : h < s0 ? lerp(.45, .9, h - s0 + 1) : h < s1 ? .88 + .12 * Math.sin((h - s0) * 2.3)
    : h < s1 + 1.5 ? lerp(.9, .35, (h - s1) / 1.5) : h < 11 ? lerp(.35, .12, (h - s1 - 1.5) / Math.max(.1, 9.5 - s1)) : lerp(.12, 0, h - 11);
  return clamp(k + .06 * Math.sin(G.t * .21) * Math.sin(G.t * .057 + 1), 0, 1);
};
AMB.rainTick = function (dt, st, inside) {
  const title = st === 'title' || st === 'char';
  if (title) G.rainK = damp(G.rainK, .55, .5, dt);
  else if (st === 'apt' || st === 'city' || st === 'end') G.rainK = damp(G.rainK, this.rainCurve(clamp(G.hour || 0, 0, 12)) * (1 - (G.dawn || 0) * .8), .4, dt);
  if (!this.ok) return;
  const now = this.c.currentTime, rk = G.rainK, m = camera.matrixWorld.elements, cp = camera.position, out = !inside;
  if (AU.rainG) AU.rainG.gain.setTargetAtTime(lerp(.012, .2, Math.pow(rk, 1.2)) * (P.inCar ? .6 : 1), now, .5);
  this.patG.gain.setTargetAtTime(out ? (.04 + .28 * rk) * (P.inCar ? .4 : 1) : .05 * rk, now, .5);
  // the nearest car: drumming on the roof you're under, or one you're standing next to
  let cd = 99, cx = 0, cz = 0; if (out && st === 'city') for (const c of CARS) { if (c.gone) continue; const dx = c.pos.x - cp.x, dz = c.pos.z - cp.z, d = dx * dx + dz * dz; if (d < cd) { cd = d; cx = dx; cz = dz; } }
  cd = Math.sqrt(cd);
  const roof = !out ? 0 : P.inCar ? .55 * rk : cd < 4 ? .22 * rk * (1 - cd / 4) : 0; this.roofG.gain.setTargetAtTime(roof, now, .3);
  if (this.roofP.pan) this.roofP.pan.setTargetAtTime(P.inCar ? 0 : clamp((cx * m[0] + cz * m[2]) / (cd + .01), -1, 1) * .7, now, .2);
  // gutters and downpipes along the facades
  let wd = 9, wx = 0, wz = 0;
  if (out && st === 'city' && !P.inCar) for (let i = Math.floor((cp.x - 3) / CELL); i <= Math.floor((cp.x + 3) / CELL); i++) for (let j = Math.floor((cp.z - 3) / CELL); j <= Math.floor((cp.z + 3) / CELL); j++) {
    const l = grid.get(gk(i, j)); if (l) for (let q = 0; q < l.length; q++) { const b = l[q]; if (b.water || b.y1 < 4) continue; const dx = clamp(cp.x, b.x0, b.x1) - cp.x, dz = clamp(cp.z, b.z0, b.z1) - cp.z, d = Math.hypot(dx, dz); if (d < wd) { wd = d; wx = dx; wz = dz; } }
  }
  this.gutG.gain.setTargetAtTime(wd < 3 && rk > .25 ? .3 * rk * (1 - wd / 3) : 0, now, .4);
  if (this.gutP.pan) this.gutP.pan.setTargetAtTime(clamp((wx * m[0] + wz * m[2]) / (wd + .01), -1, 1) * .8, now, .3);
  // the apartment window (west wall)
  if (st === 'apt') { const dx = APT.x - 4.98 - cp.x, dz = APT.z + .4 - cp.z, d = Math.hypot(dx, dz) + .3; this.winG.gain.setTargetAtTime((.08 + .32 * rk) * clamp(2.5 / (d + 1), 0, 1), now, .3); if (this.winP.pan) this.winP.pan.setTargetAtTime(clamp((dx * m[0] + dz * m[2]) / d, -1, 1) * .8, now, .2); }
  else this.winG.gain.setTargetAtTime(0, now, .2);
};

/* ---------- the 10 Hz audio/scheduler tick ---------- */
AMB.tick10 = function (dt, st) {
  const title = st === 'title' || st === 'char', A = this;
  if (st !== 'transit' && st !== 'paused' && st !== 'smith' && st !== 'pauseload') A.inside = !!G.inside || st === 'apt';
  const inside = A.inside;
  // where distant sound is heard from: the street outside the room / below the apartment
  if (G.inside && G.door && G.door.ret) A.L.set(G.door.ret.x, 1.6, G.door.ret.z); else if (st === 'apt' || (st === 'transit' && inside && !G.inside)) A.L.set(0, 10, 8); else A.L.copy(camera.position);
  if (G.nightT !== undefined && G.nightT < A.nightT - .5) { A.storm0 = rand(4.6, 5.8); A.stormL = rand(2.3, 3.4); A.bellH = -1; A.bellQ = 0; HELI.cd = rand(35, 55); }
  A.nightT = G.nightT || 0;
  A.rainTick(dt, st, inside); A.dangerTick(dt, st);
  if (A.gfx || A.ok) A.sched(dt, st);
  if (!A.ok) return;
  const c = A.c, now = c.currentTime, frozen = st === 'paused' || st === 'smith' || st === 'pauseload';
  for (let i = A.live.length - 1; i >= 0; i--) ambPlace(A.live[i], dt);
  // walls and car doors between you and the street
  A.lp.frequency.setTargetAtTime(inside ? 460 : P.inCar && st === 'city' ? 2300 : 18000, now, .15);
  A.bus.gain.setTargetAtTime((inside ? .7 : 1) * (frozen ? .45 : 1), now, .2);
  A.send.gain.setTargetAtTime(inside ? 0 : .085, now, .2); A.vout.gain.setTargetAtTime(inside ? .2 : .5, now, .3);
  const gust = .5 + .5 * Math.sin(G.t * .13) * Math.sin(G.t * .071 + 2);
  A.windG.gain.setTargetAtTime(title ? .03 : (.02 + .045 * G.rainK + .03 * gust), now, .6); A.windF.frequency.setTargetAtTime(360 + 380 * gust, now, .8);
  A.rumG.gain.setTargetAtTime(title ? .05 : .06 + .03 * A.I, now, 1);
  A.roomG.gain.setTargetAtTime(inside ? (G.inside === 'church' ? .06 : .04) : 0, now, .4);
  A.humG.gain.setTargetAtTime(inside && G.inside !== 'church' ? .0045 : 0, now, .4);
  // doors: entering/leaving a room, walking out of the apartment
  if (A.wasIn !== undefined && (G.inside || null) !== A.wasIn) A.door(); A.wasIn = G.inside || null;
  if (A.wasSt === 'apt' && st === 'transit') A.door();
  if (st === 'apt') { A.tvOn(); A.tvTick(); } else if (st !== 'paused' && st !== 'smith' && st !== 'pauseload') A.tvOff();
  // Salem's bell tolls the hour
  if (st === 'city' && G.nightT > 0) { const h = Math.floor(G.hour || 0); if (h !== A.bellH && h <= 12) { A.bellH = h; A.bellQ = ((19 + h) % 12) || 12; A.bellNext = now + 1.5; } }
  if (A.bellQ > 0 && now >= A.bellNext) { A.bellQ--; A.bellNext += 3.3; const b = A.bellPos(); ambToll(b.x, b.z); }
  // low health: heartbeat and the world going soft
  const own = st === 'city' && P.maxHp ? (P.dead ? .85 : clamp((.42 - P.hp / P.maxHp) / .32, 0, 1)) : st === 'end' && P.dead ? .85 : 0;
  A.lh = damp(A.lh, G.t - A.lhT < 1.2 ? A.lhExt : own, 3, dt);
  A.mfl.frequency.setTargetAtTime(20000 * Math.pow(.045, Math.pow(A.lh, 1.2)), now, .25);
  if (A.lh > .06 && st === 'city' && !P.dead) { if (A.hbNext < now) A.hbNext = now + .05; while (A.hbNext < now + .3) { A.beat(A.hbNext, A.lh); A.hbNext += 60 / (64 + 56 * A.lh); } }
  if (P.dead && !A.wasDead && st === 'city') A.flatline(); A.wasDead = P.dead;
  A.autoBarks(dt);
  A.wasSt = st;
};
// the distant-life scheduler: busier through the night and with HEAT
AMB.sched = function (dt, st) {
  const city = st === 'city', title = st === 'title' || st === 'char', apt = st === 'apt'; if (!city && !title && !apt) return;
  const h = clamp((G.hour || 0) / 12, 0, 1), heat = typeof HEAT !== 'undefined' ? clamp(HEAT.level || 0, 0, 5) : 0;
  const I = this.I = title ? .45 : apt ? .22 : clamp(.16 + .7 * h + .06 * heat, 0, 1), r = x => Math.random() < x * dt, out = (city && !G.inside) || title;
  if (this.ok) {
    if (r(.035 + .13 * I)) { const p = farPt(120, 620), auto = Math.random() < .55; ambGun(p.x, p.z, auto ? rint(3, 12) : rint(1, 4), auto ? rand(.075, .13) : rand(.3, .9), Math.random() < .4); }
    if (r(.004 + .03 * I)) this.firefight();
    if (r(.006 + .012 * I)) ambSirenPass();
    if (r(.03)) { let p = farPt(90, 380); ambDog(p.x, p.z, rint(2, 7), Math.random() < .5); if (Math.random() < .45) { p = farPt(120, 420); ambDog(p.x, p.z, rint(2, 5), Math.random() < .5, rand(.8, 2.5)); } }
    if (r(.005 + .012 * I)) { const p = farPt(70, 260); ambAlarm(p.x, p.z); }
    if (r(.01 + .02 * I)) { const p = farPt(80, 300); ambGlass(p.x, p.z); }
    if (r(.004 + .014 * I)) { const p = farPt(160, 420); ambScream(p.x, p.z); }
    if (!out && r(.004 + .01 * I)) { const p = farPt(250, 600); ambBoom(p.x, p.z, false, 0); }   // indoors you only hear them
  }
  if (out && this.gfx) {
    if (r(.007 + .022 * I)) this.skyBoom();
    if (r(.012 + .04 * I)) this.skyTracers();
    if (r(.006 + .014 * I)) this.skyFlare();
  }
};

/* ---------- skyline: additive/smoke points with fog:false, pooled ---------- */
function skyPts(max, add) {
  const geo = new T.BufferGeometry(), pos = new Float32Array(max * 3), col = new Float32Array(max * 3), size = new Float32Array(max), alpha = new Float32Array(max);
  geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setAttribute('size', new T.BufferAttribute(size, 1)); geo.setAttribute('alpha', new T.BufferAttribute(alpha, 1));
  const mat = new T.ShaderMaterial({
    uniforms: { scale: { value: 400 } },
    vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
      void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(1000.0, size*scale/max(0.1,-mv.z)); gl_Position=projectionMatrix*mv; if(alpha<=0.001) gl_Position=vec4(2.0,2.0,2.0,1.0); }`,
    fragmentShader: add ? `varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0; if(r>1.0) discard; gl_FragColor=vec4(vC*1.5, vA*(exp(-r*5.0)*0.85+(1.0-r)*0.15)); }`
      : `varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0; if(r>1.0) discard; float k=1.0-r; gl_FragColor=vec4(vC, vA*k*k); }`,
    transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending,
  });
  const pts = new T.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = add ? 6 : 4; pts.userData.dyn = 1; pts.visible = false; scene.add(pts);
  const P0 = []; for (let i = 0; i < max; i++) P0.push({ on: 0, man: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, s0: 1, s1: 1, s: 1, r: 1, g: 1, b: 1, a0: 1, a: 0, cv: 0, drag: 0, lift: 0, fl: 0 });
  return { pts, geo, mat, pos, col, size, alpha, P: P0, max, cur: 0 };
}
// cv: 0 fade, 1 flash (snap in, exp out), 2 smoke (ease in, long fade)
function skyAdd(S, x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a0, cv, lift, drag, fl) {
  let p = null; for (let k = 0; k < S.max; k++) { const i = (S.cur + k) % S.max; if (!S.P[i].on) { p = S.P[i]; S.cur = (i + 1) % S.max; break; } }
  if (!p) return null;
  p.on = 1; p.man = 0; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = p.max = life; p.s0 = p.s = s0; p.s1 = s1; p.r = r; p.g = g; p.b = b; p.a0 = a0; p.a = 0; p.cv = cv; p.lift = lift || 0; p.drag = drag || 0; p.fl = fl || 0;
  return p;
}
function skyMan(S) { const p = skyAdd(S, 0, -999, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0); if (p) p.man = 1; return p; }
function manSet(q, x, y, z, s, a, r, g, b) { q.x = x; q.y = y; q.z = z; q.s = s; q.a = a; q.r = r; q.g = g; q.b = b; }
function skyUpdate(S, dt) {
  let n = 0;
  for (let i = 0; i < S.max; i++) {
    const p = S.P[i]; if (!p.on) { S.alpha[i] = 0; continue; } n++;
    if (!p.man) {
      p.life -= dt; if (p.life <= 0) { p.on = 0; S.alpha[i] = 0; continue; }
      const k = 1 - p.life / p.max, dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy = p.vy * dr + p.lift * dt; p.vz *= dr; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.s = p.s0 + (p.s1 - p.s0) * (p.cv === 2 ? 1 - (1 - k) * (1 - k) : k);
      p.a = p.a0 * (p.cv === 1 ? (k < .06 ? k / .06 : Math.exp(-(k - .06) * 5)) : p.cv === 2 ? Math.min(1, k * 8) * (1 - k) * (1 - k) : 1 - k * k) * (p.fl ? .75 + Math.random() * .25 : 1);
    }
    const o = i * 3; S.pos[o] = p.x; S.pos[o + 1] = p.y; S.pos[o + 2] = p.z; S.col[o] = p.r; S.col[o + 1] = p.g; S.col[o + 2] = p.b; S.size[i] = p.s; S.alpha[i] = p.a;
  }
  S.pts.visible = n > 0;
  if (n) { const a = S.geo.attributes; a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = a.alpha.needsUpdate = true; }
}
// tracer streams: one LineSegments, head bright → tail dark (additive)
function trInit() {
  const n = 48, geo = new T.BufferGeometry(), pos = new Float32Array(n * 6), col = new Float32Array(n * 6);
  geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
  const mesh = new T.LineSegments(geo, new T.LineBasicMaterial({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  mesh.frustumCulled = false; mesh.userData.dyn = 1; mesh.visible = false; mesh.renderOrder = 6; scene.add(mesh);
  const b = []; for (let i = 0; i < n; i++) b.push({ on: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, len: 8, r: 1, g: .5, bb: .2 });
  AMB.TR = { n, geo, pos, col, mesh, b };
}
function trUpdate(dt) {
  const R = AMB.TR; let n = 0;
  for (const s of AMB.TS) {
    if (!s.on) continue; s.t -= dt;
    while (s.t <= 0 && s.n > 0) {
      s.n--; s.t += s.gap; let q = null; for (const o of R.b) if (!o.on) { q = o; break; } if (!q) continue;
      const dx = s.tx + rand(-4, 4) - s.x, dy = s.ty + rand(-3, 3) - s.y, dz = s.tz + rand(-4, 4) - s.z, L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      q.on = 1; q.x = s.x; q.y = s.y; q.z = s.z; q.vx = dx / L * s.sp; q.vy = dy / L * s.sp + 4; q.vz = dz / L * s.sp; q.life = L / s.sp * rand(.9, 1.15); q.len = rand(6, 10); q.r = s.r; q.g = s.g; q.bb = s.b;
    }
    if (s.n <= 0) s.on = 0;
  }
  for (let i = 0; i < R.n; i++) {
    const q = R.b[i], o = i * 6;
    if (q.on) { q.life -= dt; if (q.life <= 0) q.on = 0; }
    if (!q.on) { R.col[o] = R.col[o + 1] = R.col[o + 2] = R.col[o + 3] = R.col[o + 4] = R.col[o + 5] = 0; R.pos[o + 1] = R.pos[o + 4] = -999; continue; }
    n++; q.vy -= 3 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
    const sp = Math.sqrt(q.vx * q.vx + q.vy * q.vy + q.vz * q.vz) || 1, k = q.len / sp;
    R.pos[o] = q.x; R.pos[o + 1] = q.y; R.pos[o + 2] = q.z; R.pos[o + 3] = q.x - q.vx * k; R.pos[o + 4] = q.y - q.vy * k; R.pos[o + 5] = q.z - q.vz * k;
    R.col[o] = q.r; R.col[o + 1] = q.g; R.col[o + 2] = q.bb; R.col[o + 3] = q.r * .08; R.col[o + 4] = q.g * .08; R.col[o + 5] = q.bb * .08;
  }
  R.mesh.visible = n > 0; if (n) { R.geo.attributes.position.needsUpdate = true; R.geo.attributes.color.needsUpdate = true; }
}
AMB.skyBoom = function (x, z, big) {
  if (!this.gfx) return; const cp = camera.position;
  if (x === undefined) { const p = farPt(160, 340, true, cp); x = p.x; z = p.z; }
  if (big === undefined) big = Math.random() < .35;
  const y = roofAt(x, z) * .4 + rand(3, 9), pa = this.pa, d = Math.hypot(x - cp.x, z - cp.z);
  skyAdd(pa, x, y + 4, z, 0, 2, 0, .9, big ? 55 : 38, big ? 90 : 60, 1, .7, .4, 1, 1);                        // the flash
  skyAdd(pa, x, y + 70, z, 0, 0, 0, 1.6, 170, 220, .7, .28, .12, .26, 1);                                     // the low cloud lights up over the rooftops
  skyAdd(pa, x, y + 6, z, 0, 8, 0, 3.4, 18, big ? 44 : 32, 1, .38, .12, .85, 2, 6, .3, 1);                   // fireball climbing over the roofs
  for (let k = 0; k < (big ? 10 : 6); k++) skyAdd(pa, x, y + 4, z, rand(-14, 14), rand(14, 30), rand(-14, 14), rand(1.6, 3), 1.6, .6, 1, .6, .25, 1, 0, -9.8, .2, 1);   // burning debris
  for (const e of this.SE) if (!e.on) { e.on = 1; e.x = x; e.y = y; e.z = z; e.t = 0; e.acc = 0; e.big = big; e.life = rand(20, 30) * (big ? 1.3 : 1); break; }
  ambBoom(x, z, big, d / 343, y);
};
AMB.skyTracers = function () {
  if (!this.gfx) return; let s = null; for (const q of this.TS) if (!q.on) { s = q; break; } if (!s) return;
  const cp = camera.position, p = farPt(170, 330, true, cp), m = camera.matrixWorld.elements, rh = roofAt(p.x, p.z);
  s.x = p.x; s.z = p.z; s.y = rh > 4 ? rh + 1 : rand(6, 22);
  const side = Math.random() < .5 ? 1 : -1, L = rand(70, 160); s.tx = s.x + m[0] * side * L + rand(-30, 30); s.tz = s.z + m[2] * side * L + rand(-30, 30);
  s.ty = Math.random() < .3 ? s.y + rand(80, 160) : roofAt(s.tx, s.tz) + rand(2, 12);                        // across the rooftops, or up at something in the sky
  s.n = rint(6, 22); s.gap = rand(.06, .11); s.t = 0; s.sp = rand(170, 260); const gr = Math.random() < .25; s.r = gr ? .35 : 1; s.g = gr ? 1 : .42; s.b = gr ? .35 : .18; s.on = 1;
  ambGun(s.x, s.z, s.n, s.gap, true, p.d / 343);
};
AMB.skyFlare = function () {
  if (!this.gfx) return; let f = null; for (const q of this.FL) if (!q.on) { f = q; break; } if (!f) return;
  const cp = camera.position, p = farPt(150, 330, true, cp); f.core = skyMan(this.pa); f.halo = skyMan(this.pa); f.glow = skyMan(this.pa);
  if (!f.core || !f.halo || !f.glow) { for (const q of [f.core, f.halo, f.glow]) if (q) q.on = 0; return; }
  f.x = p.x; f.z = p.z; f.y = roofAt(p.x, p.z) + 2; f.vy = rand(54, 66); f.t = 0; f.sm = 0; f.on = 1;
  ambGun(p.x, p.z, 1, .5, false, p.d / 343);                                                                  // the launcher's pop
};
function skyFx(dt) {
  const A = AMB, w = A.wind; w.x = .9 + .5 * Math.sin(G.t * .011); w.z = .35 + .4 * Math.sin(G.t * .007 + 1);
  for (const e of A.SE) {
    if (!e.on) continue; e.t += dt; if (e.t > e.life) { e.on = 0; continue; } e.acc += dt; const rate = e.t < 3 ? .25 : .55, young = e.t < 5, sc = e.big ? 1.3 : 1;
    while (e.acc > rate) {
      e.acc -= rate;
      skyAdd(A.pn, e.x + rand(-3, 3), e.y + rand(0, 5), e.z + rand(-3, 3), w.x * rand(.4, 1) + rand(-.6, .6), rand(6, 9), w.z * rand(.4, 1) + rand(-.6, .6), rand(15, 21), rand(6, 10) * sc, rand(34, 52) * sc, young ? .3 : .24, young ? .19 : .19, young ? .15 : .2, .5, 2, -.08, .03);   // lit warm from the fire below, grey higher up
      if (e.t < 8 && Math.random() < .6) skyAdd(A.pa, e.x + rand(-2, 2), e.y + rand(0, 3), e.z + rand(-2, 2), 0, 1.5, 0, rand(.6, 1.1), rand(8, 14), rand(4, 8), 1, .42, .14, .5 * (1 - e.t / 8), 1, 0, 0, 1);  // fire still burning at the base
    }
  }
  for (const f of A.FL) {
    if (!f.on) continue; f.t += dt;
    if (f.vy > 0) { f.vy -= 15 * dt; f.y += f.vy * dt; } else { f.y -= 2.3 * dt; f.x += (w.x * 1.3 + Math.sin(f.t * 1.1) * .5) * dt; f.z += w.z * 1.3 * dt; }   // under its parachute
    const fl = .8 + Math.random() * .2, fade = clamp((40 - f.t) / 3, 0, 1);
    manSet(f.core, f.x, f.y, f.z, 3, fl * fade, 1, .25, .16); manSet(f.halo, f.x, f.y, f.z, 16, .45 * fl * fade, 1, .12, .08); manSet(f.glow, f.x, f.y, f.z, 70, .12 * fade, .9, .1, .06);
    if ((f.sm -= dt) <= 0) { f.sm = .28; skyAdd(A.pn, f.x, f.y, f.z, rand(-.2, .2), .2, rand(-.2, .2), 7, 1.2, 6, .36, .1, .11, .4, 2, 0, .2); }
    if (f.t > 40 || (f.vy <= 0 && f.y < 8)) { f.on = 0; f.core.on = f.halo.on = f.glow.on = 0; }
  }
}

/* ---------- the helicopter ---------- */
const HELI = AMB.H = { st: 'off', cd: 40, pos: new T.Vector3(0, 80, 400), prev: new T.Vector3(), vel: new T.Vector3(), c: new T.Vector3(), ang: 0, w: .13, R: 48, alt0: 72, T: 60, spot: new T.Vector3(), sw: 0, lock: 0, lit: 0, acd: 0, yaw: 0, bank: 0, ox: 0, oz: 0, osp: 0, v: null, g: null, nav: [] };
const HELI_NAV = [[0, 1.25, .9, 1, .08, .06, 2.4], [0, .95, 7.0, 1, 1, 1, 3.2], [-.95, -.2, -.6, 1, .1, .08, 1.1], [.95, -.2, -.6, .1, 1, .3, 1.1], [.55, -.85, -1.35, .95, .97, 1, 2.6]]; // beacon, tail strobe, port, starboard, the lamp
function heliBuild() {
  const parts = [], m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3();
  const add = (list, geo, x, y, z, rx, ry, rz, sx, sy, sz) => { const g = geo.index ? geo.toNonIndexed() : geo; e.set(rx || 0, ry || 0, rz || 0); m4.compose(p.set(x, y, z), q.setFromEuler(e), s.set(sx || 1, sy || 1, sz || 1)); g.applyMatrix4(m4); list.push(g); };
  const merge = list => {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const P3 = new Float32Array(n * 3), N3 = new Float32Array(n * 3), U2 = new Float32Array(n * 2); let o = 0;
    for (const g of list) { const c = g.attributes.position.count; P3.set(g.attributes.position.array, o * 3); N3.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U2.set(g.attributes.uv.array, o * 2); o += c; g.dispose(); }
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(P3, 3)); bg.setAttribute('normal', new T.BufferAttribute(N3, 3)); bg.setAttribute('uv', new T.BufferAttribute(U2, 2)); bg.computeBoundingSphere(); return bg;
  };
  add(parts, new T.SphereGeometry(1.25, 9, 6), 0, 0, 0, 0, 0, 0, 1, .92, 1.75);                    // cabin, nose toward -Z
  add(parts, new T.BoxGeometry(.95, .5, 1.8), 0, .95, .5);                                         // engine deck
  add(parts, new T.CylinderGeometry(.16, .34, 5.2, 6), 0, .35, 4.2, Math.PI / 2);                  // tail boom
  add(parts, new T.BoxGeometry(.08, 1.3, .9), 0, .9, 6.6, .3);                                    // fin
  add(parts, new T.BoxGeometry(1.6, .06, .45), 0, .35, 5.7);                                       // stabiliser
  for (const sx of [-1, 1]) { add(parts, new T.BoxGeometry(.09, .09, 3.4), sx * .95, -1.25, -.1); for (const sz of [-.9, .7]) add(parts, new T.BoxGeometry(.07, .6, .07), sx * .85, -.95, sz, 0, 0, sx * .25); }
  add(parts, new T.CylinderGeometry(.07, .07, .5, 5), 0, 1.4, .3);                                 // mast
  add(parts, new T.BoxGeometry(.32, .3, .42), .55, -.85, -1.2);                                     // searchlight housing
  const body = new T.Mesh(merge(parts), new T.MeshStandardMaterial({ color: lc(0x1c2028), roughness: .42, metalness: .55, envMapIntensity: .7 }));
  const [cv, x] = cvs(128, 128); x.translate(64, 64);
  for (let b = 0; b < 2; b++) for (let k = 0; k < 26; k++) { x.save(); x.rotate(b * Math.PI - k * .055); x.fillStyle = `rgba(255,255,255,${.6 * Math.pow(1 - k / 26, 2)})`; x.fillRect(5, -3, 58, 6); x.restore(); }
  x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(0, 0, 5, 0, TAU); x.fill();
  const rt = texFrom(cv, false); rt.center.set(.5, .5); AMB.rotorTex = rt; const rp = [];
  add(rp, new T.CircleGeometry(4.6, 20), 0, 1.68, .3, -Math.PI / 2); add(rp, new T.CircleGeometry(.75, 12), .2, .95, 6.75, 0, Math.PI / 2);
  const rotor = new T.Mesh(merge(rp), new T.MeshBasicMaterial({ map: rt, color: 0x0c0d10, transparent: true, depthWrite: false, side: T.DoubleSide }));
  const g = new T.Group(); g.add(body, rotor); g.visible = false; g.userData.dyn = 1; scene.add(g); HELI.g = g;
  // searchlight: a soft volumetric cone and a pool on the street
  const cg = new T.ConeGeometry(1, 1, 18, 1, true); cg.translate(0, -.5, 0);
  const beam = new T.Mesh(cg, new T.ShaderMaterial({
    uniforms: { col: { value: new T.Color(0xcfdcff) }, op: { value: .25 } },
    vertexShader: 'varying float vV; varying vec3 vN; varying vec3 vP; void main(){ vV=-position.y; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 col; uniform float op; varying float vV; varying vec3 vN; varying vec3 vP; void main(){ float e=abs(dot(normalize(vN),normalize(-vP))); gl_FragColor=vec4(col, pow(e,2.2)*(1.0-vV*0.6)*smoothstep(0.0,0.06,vV)*op); }',
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
  }));
  beam.frustumCulled = false; beam.visible = false; beam.userData.dyn = 1; beam.renderOrder = 7; scene.add(beam); AMB.beam = beam;
  const [sc, sx] = cvs(128, 128), sgr = sx.createRadialGradient(64, 64, 0, 64, 64, 64); sgr.addColorStop(0, 'rgba(255,255,255,.95)'); sgr.addColorStop(.5, 'rgba(255,255,255,.55)'); sgr.addColorStop(.82, 'rgba(255,255,255,.22)'); sgr.addColorStop(1, 'rgba(255,255,255,0)');
  sx.fillStyle = sgr; sx.fillRect(0, 0, 128, 128);
  const pg = new T.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2);
  const spot = new T.Mesh(pg, new T.MeshBasicMaterial({ map: texFrom(sc, false), color: 0xcfdcff, transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  spot.visible = false; spot.userData.dyn = 1; spot.renderOrder = 3; scene.add(spot); AMB.spotM = spot;
  AMB.sLS = { p: new T.Vector3(), c: new T.Color(0xcfdcff), i: 3.4, d: 18, f: 0 };
}
function heliOn(title) {
  const L = title ? _ab.set(0, 0, 0) : P.pos, a = rand(0, TAU);
  HELI.pos.set(L.x + Math.cos(a) * 420, 90, L.z + Math.sin(a) * 420); HELI.prev.copy(HELI.pos); HELI.vel.set(0, 0, 0); HELI.c.set(L.x, 0, L.z); HELI.ang = a;
  HELI.st = 'in'; HELI.T = rand(45, 80); HELI.R = rand(38, 58); HELI.w = rand(.1, .16) * (Math.random() < .5 ? 1 : -1); HELI.alt0 = rand(62, 88); HELI.spot.set(L.x, 0, L.z); HELI.lock = 0; HELI.lit = 0;
  HELI.g.visible = AMB.beam.visible = AMB.spotM.visible = true; if (LS.indexOf(AMB.sLS) < 0) LS.push(AMB.sLS);
  for (let i = 0; i < HELI_NAV.length; i++) HELI.nav[i] = skyMan(AMB.pa);
  if (AMB.ok) {
    const v = HELI.v = ambVoice(HELI.pos.x, HELI.pos.z, 1.5, .4, true, HELI.pos.y); if (!v) return; v.track = 1;
    const c = AMB.c, t0 = c.currentTime + .05, s = avN(v, 1), bp = avF(v, 'bandpass', 380, .9), lo = avF(v, 'lowpass', 120, .7), lg = avG(v, 2.2), am = avG(v, .5), lfo = avO(v, 'sawtooth', rand(14.5, 17.5)), lfg = avG(v, -.5), wh = avO(v, 'triangle', 3300), wg = avG(v, .015), th = avO(v, 'sine', 64), tg = avG(v, .5);
    s.connect(bp); bp.connect(am); s.connect(lo); lo.connect(lg); lg.connect(am); th.connect(tg); tg.connect(am); lfo.connect(lfg); lfg.connect(am.gain); am.connect(v.env); wh.connect(wg); wg.connect(v.env);   // blade slap: noise AM'd by a falling saw
    v.dop = [lfo, wh]; v.env.gain.setValueAtTime(.0001, t0); v.env.gain.exponentialRampToValueAtTime(1, t0 + 3); avGo(v, t0, 0);
  }
}
function heliOff() {
  HELI.st = 'off'; const heat = typeof HEAT !== 'undefined' ? HEAT.level || 0 : 0; HELI.cd = rand(80, 160) / (1 + heat * .25 + (G.hour || 0) * .04);
  HELI.g.visible = AMB.beam.visible = AMB.spotM.visible = false; const i = LS.indexOf(AMB.sLS); if (i >= 0) LS.splice(i, 1);
  for (const L of lightPool) if (L.userData.ls === AMB.sLS) { L.intensity = 0; L.userData.ls = null; }
  for (let k = 0; k < HELI.nav.length; k++) if (HELI.nav[k]) { HELI.nav[k].on = 0; HELI.nav[k] = null; }
  if (HELI.v && AMB.ok) { const v = HELI.v, now = AMB.c.currentTime; v.env.gain.cancelScheduledValues(now); v.env.gain.setTargetAtTime(0, now, .5); for (const s of v.src) s.stop(now + 2.5); } HELI.v = null;
}
function heliUpdate(dt, st) {
  const title = st === 'title' || st === 'char', ok = (st === 'city' && !G.inside) || title;
  if (!ok) { if (HELI.st !== 'off') heliOff(); return; }
  if (HELI.st === 'off') { HELI.cd -= dt; if (HELI.cd > 0) return; heliOn(title); }
  const tx = title ? 0 : P.pos.x, tz = title ? 0 : P.pos.z; HELI.c.x = damp(HELI.c.x, tx, .4, dt); HELI.c.z = damp(HELI.c.z, tz, .4, dt);
  const ex = HELI.c.x + Math.cos(HELI.ang) * HELI.R, ez = HELI.c.z + Math.sin(HELI.ang) * HELI.R;
  if (HELI.st === 'in') { const dx = ex - HELI.pos.x, dz = ez - HELI.pos.z, L = Math.hypot(dx, dz) || 1, sp = Math.min(26, L * .5 + 6); HELI.pos.x += dx / L * sp * dt; HELI.pos.z += dz / L * sp * dt; HELI.ang += HELI.w * dt * .5; if (L < 8) HELI.st = 'orbit'; }
  else if (HELI.st === 'orbit') {
    HELI.ang += HELI.w * dt; HELI.pos.x = damp(HELI.pos.x, ex, 1.2, dt); HELI.pos.z = damp(HELI.pos.z, ez, 1.2, dt);
    if ((HELI.T -= dt) <= 0 && HELI.lock <= 0) { HELI.st = 'out'; const sg = Math.sign(HELI.w); HELI.ox = -Math.sin(HELI.ang) * sg; HELI.oz = Math.cos(HELI.ang) * sg; HELI.osp = 8; }
  } else { HELI.osp = Math.min(32, HELI.osp + dt * 4); HELI.pos.x += HELI.ox * HELI.osp * dt; HELI.pos.z += HELI.oz * HELI.osp * dt; if (Math.hypot(HELI.pos.x - HELI.c.x, HELI.pos.z - HELI.c.z) > 480) { heliOff(); return; } }
  const roof = Math.max(roofAt(HELI.pos.x, HELI.pos.z), roofAt(HELI.pos.x + HELI.vel.x * 2, HELI.pos.z + HELI.vel.z * 2)); HELI.pos.y = damp(HELI.pos.y, Math.max(HELI.alt0, roof + 24) + Math.sin(G.t * .2) * 3, .7, dt);
  _ab.subVectors(HELI.pos, HELI.prev).divideScalar(Math.max(dt, 1e-3)); HELI.vel.lerp(_ab, 1 - Math.exp(-4 * dt)); HELI.prev.copy(HELI.pos);
  const spd = Math.hypot(HELI.vel.x, HELI.vel.z), py = HELI.yaw;
  if (spd > 1) HELI.yaw = lerpAngle(HELI.yaw, Math.atan2(-HELI.vel.x, -HELI.vel.z) + (HELI.st === 'orbit' ? .3 * Math.sign(HELI.w) : 0), 1 - Math.exp(-1.5 * dt));
  const yr = Math.atan2(Math.sin(HELI.yaw - py), Math.cos(HELI.yaw - py)) / Math.max(dt, 1e-3); HELI.bank = damp(HELI.bank, clamp(yr * spd * .05, -.45, .45), 2, dt);
  HELI.g.position.copy(HELI.pos); HELI.g.rotation.set(-clamp(spd * .012, 0, .3), HELI.yaw, HELI.bank, 'YXZ'); HELI.g.updateMatrixWorld(true);
  AMB.rotorTex.rotation -= dt * 7;
  // the searchlight sweeps the block, locks on now and then; resting on you gives you away
  const heat = typeof HEAT !== 'undefined' ? HEAT.level || 0 : 0;
  if (!title && HELI.st === 'orbit' && HELI.lock <= 0 && Math.random() < dt * (.02 + heat * .02 + (G.hour || 0) * .003)) HELI.lock = rand(5, 9);
  let sx, sz;
  if (HELI.lock > 0 && !title) { HELI.lock -= dt; sx = P.pos.x; sz = P.pos.z; }
  else if (HELI.st === 'in' && Math.hypot(HELI.pos.x - HELI.c.x, HELI.pos.z - HELI.c.z) > 140) { sx = HELI.pos.x + HELI.vel.x * 1.5; sz = HELI.pos.z + HELI.vel.z * 1.5 + 10; }
  else { HELI.sw += dt; const r = 6 + 10 * (.5 + .5 * Math.sin(HELI.sw * .23)); sx = HELI.c.x + Math.sin(HELI.sw * .41) * r; sz = HELI.c.z + Math.cos(HELI.sw * .29) * r; }
  const sk = HELI.lock > 0 ? 1.6 : .8; HELI.spot.x = damp(HELI.spot.x, sx, sk, dt); HELI.spot.z = damp(HELI.spot.z, sz, sk, dt); HELI.spot.y = damp(HELI.spot.y, roofAt(HELI.spot.x, HELI.spot.z), 8, dt); // a sprint (7.6 m/s) outruns the chase, a walk doesn't
  _ac.set(HELI_NAV[4][0], HELI_NAV[4][1], HELI_NAV[4][2]).applyMatrix4(HELI.g.matrixWorld); _ad.subVectors(HELI.spot, _ac); const len = _ad.length() || 1; _ad.divideScalar(len);
  const r = 2.6 + len * .028, B = AMB.beam, S = AMB.spotM, on = 1 - (G.dawn || 0);
  B.position.copy(_ac); B.quaternion.setFromUnitVectors(_aDown, _ad); B.scale.set(r, len, r); B.material.uniforms.op.value = (.14 + .2 * G.rainK) * on;
  S.position.set(HELI.spot.x, HELI.spot.y + .07, HELI.spot.z); S.rotation.y = Math.atan2(_ad.x, _ad.z); S.scale.set(r * 2, 1, r * 2 * Math.min(2.5, 1 / Math.max(.4, -_ad.y))); S.material.opacity = .42 * on;
  AMB.sLS.p.set(HELI.spot.x, HELI.spot.y + 4, HELI.spot.z); AMB.sLS.i = 3.4 * on; for (const L of lightPool) if (L.userData.ls === AMB.sLS) L.position.copy(AMB.sLS.p);
  if (!title) {
    const dx = HELI.spot.x - P.pos.x, dz = HELI.spot.z - P.pos.z;
    if (dx * dx + dz * dz < r * r * .64 && HELI.st !== 'out' && !P.dead && Math.abs(P.pos.y - HELI.spot.y) < 3) HELI.lit += dt; else HELI.lit = Math.max(0, HELI.lit - dt * .5);
    HELI.acd -= dt;
    if (HELI.lit > 1.5 && HELI.acd <= 0) {
      HELI.acd = 6; HELI.lit = 0; HELI.lock = Math.max(HELI.lock, rand(6, 10));
      if (typeof makeNoise === 'function') makeNoise(P.pos, 55, 'heli');
      if (typeof HEAT !== 'undefined' && HEAT.add) HEAT.add(.5);
      if (typeof feed === 'function') feed('<b>SPOTLIGHT</b> · The chopper has you. Everyone near knows where you are.');
    }
  }
  // nav lights: red beacon, white double strobe, port/starboard, the lamp itself
  const t = G.t;
  for (let i = 0; i < HELI_NAV.length; i++) {
    const q = HELI.nav[i]; if (!q) continue; const n = HELI_NAV[i]; _ab.set(n[0], n[1], n[2]).applyMatrix4(HELI.g.matrixWorld);
    const ph = t % 1.4, a = i === 0 ? ((t % 1.1) < .12 ? 1 : .05) : i === 1 ? (ph < .05 || (ph > .16 && ph < .21) ? 1 : 0) : i === 4 ? .9 * on : .8;
    manSet(q, _ab.x, _ab.y, _ab.z, n[6], a, n[3], n[4], n[5]);
  }
  if (HELI.v) { HELI.v.x = HELI.pos.x; HELI.v.z = HELI.pos.z; HELI.v.y = HELI.pos.y; HELI.v.vx = HELI.vel.x; HELI.v.vz = HELI.vel.z; }
}

/* ---------- setup + per-frame entry ---------- */
AMB.gfxInit = function () {
  if (this.gfx || typeof scene === 'undefined') return; this.gfx = true;
  try {
    for (let i = 0; i < 3; i++) { this.SE.push({ on: 0 }); this.TS.push({ on: 0 }); this.FL.push({ on: 0 }); }
    this.pa = skyPts(140, true); this.pn = skyPts(120, false); trInit(); heliBuild();
    if (typeof GRASS !== 'undefined') { const cnt = new Map(); for (const e of GRASS) { const k = gcell(e[0], e[2]); cnt.set(k, (cnt.get(k) || 0) + 1); } for (const [k, n] of cnt) if (n >= 3) this.grass.add(k); }
  } catch (e) { this.gfx = false; this.gfxDead = true; console.warn('ambience gfx', e); }
};
AMB.gfxUpdate = function (dt, st) {
  const indoor = !!G.inside || st === 'apt' || st === 'transit';
  heliUpdate(dt, st); skyFx(dt); skyUpdate(this.pa, dt); skyUpdate(this.pn, dt); trUpdate(dt);
  if (indoor) { this.pa.pts.visible = this.pn.pts.visible = this.TR.mesh.visible = false; }
  this.pa.mat.uniforms.scale.value = this.pn.mat.uniforms.scale.value = FXA.pts.material.uniforms.scale.value;
};
AMB.stats = function () { return { ok: this.ok, gfx: this.gfx, nv: this.nv, ns: this.ns, live: this.live.length, heli: HELI.st, rainK: +G.rainK.toFixed(3), danger: +this.danger.toFixed(3), ms: this.ms, I: +this.I.toFixed(3), lh: +this.lh.toFixed(3), err: this.err || null }; };
function updateAmbience(dt, st) {
  const A = AMB;
  if (!A.gfx && !A.gfxDead && st !== 'boot') A.gfxInit();
  if (!A.ok && AU.ok) A.audio();
  const frozen = st === 'photo' || st === 'paused' || st === 'smith' || st === 'pauseload';
  try {
    if (A.gfx && !frozen) A.gfxUpdate(dt, st);
    if (A.ok && !frozen) A.steps(dt, st);
    A.tk += dt; if (A.tk >= .1) { A.tick10(Math.min(A.tk, .5), st); A.tk = 0; }
  } catch (e) { if (!A.warned) { A.warned = 1; console.warn('ambience', e); } }
}
