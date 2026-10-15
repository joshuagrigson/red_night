/* =====================================================================
   RED NIGHT — the net layer: the cyberpunk overlay that tips in over the real city.
   Like the Window app's digital canvas: drifting code fragments on angled panels at the
   screen edges, a holographic scan sweep, data motes, AR tags on landmarks/doors/threats.
   Everything here scales with G.aug; at 0 the city is bare. N tips the layer in and out.
   ===================================================================== */
const DIG = { c: null, x: null, w: 1, h: 1, k: 1, frags: [], motes: [], acc: 0, t: 0, sweepT: 4, sweepY: -1, tagT: 0, tags: [], on: false, tipK: 1, tipAnim: null, mem: .6, last: -1 };
const DIG_COLS = ['#05d9e8', '#05d9e8', '#e8f6ff', '#ff2a6d', '#05d9e8', '#f3e600'];
const DIG_MARKS = [
  { n: 'CITADEL', p: [-140, 12, -140] }, { n: 'CAPITOL', p: [100, 16, -140] }, { n: 'GOLD BRIDGE', p: [200, 20, -120] },
  { n: 'STATE LINE P.O.', p: [120, 14, 100] }, { n: 'WITCH HOUSE', p: [-180, 12, 60] }, { n: 'OLD BURYING POINT', p: [-100, 3, 100] },
  { n: 'WITCH MUSEUM', p: [-60, 16, 180] }, { n: 'WATER TOWER', p: [180, 26, 60] },
];
const hexs = n => { let s = ''; for (let i = 0; i < n; i++) s += '0123456789ABCDEF'[Math.floor(Math.random() * 16)]; return s; };
function digText() {
  const d = Math.max(0, G.dist | 0), D = DIST[d] || DIST[0], r = Math.random();
  if (G.state === 'city' && r < .5) {
    const k = Math.floor(Math.random() * 7);
    if (k === 0) return `${D.id.toUpperCase()}-NODE ${hexs(4)} ▸ ${rint(9, 140)}ms`;
    if (k === 1) return `POS ${P.pos.x.toFixed(1)} ${P.pos.z.toFixed(1)} · HDG ${String(Math.round(((-P.yaw * 57.3) % 360 + 360) % 360)).padStart(3, '0')}`;
    if (k === 2) { let n = 0, best = null, bd = 1e9; for (const e of ENEMIES) { if (e.dead) continue; n++; const dd = e.pos.distanceTo(P.pos); if (dd < bd) { bd = dd; best = e; } } return best ? `HOSTILES ${n} · ${(ET[best.type] ? ET[best.type].name : best.type).toUpperCase()} ${Math.round(bd)}m` : 'HOSTILES 0 · SECTOR QUIET'; }
    if (k === 3) return `RAIN ${Math.round(G.rainK * 100)}% · VIS ${Math.round(1 / Math.max(.001, scene.fog.density))}m`;
    if (k === 4) return `${fmtClock(Math.min(12, G.hour || 0))} · DAWN -${Math.max(0, 12 - (G.hour || 0)).toFixed(1)}h`;
    if (k === 5) return `VITALS ${Math.max(0, Math.round(P.hp))} · ${P.hp < 60 ? 'BLEED RISK' : 'NOMINAL'}`;
    return `${D.name} // ${pick(['CCTV', 'TRAFFIC', 'GRID', 'DOORS'])} ${pick(['SPOOFED', 'OFFLINE', 'RELAY', 'OPEN'])}`;
  }
  return pick([() => `SECTOR ${String(rint(1, 24)).padStart(2, '0')} // CURFEW ${G.started ? 'LIFTED' : 'PENDING'}`, () => 'EMS ▸ OFFLINE · 19:00—07:00', () => `BIOSIG ${hexs(4)} :: NONHUMAN ${rand(.2, .99).toFixed(2)}`,
    () => `0x${hexs(8)} ${hexs(8)}`, () => `0x${hexs(4)} MOV R${rint(0, 9)}, #${hexs(2)}`, () => `LOCK ▸ ${pick(['DOOR', 'GRID', 'CCTV', 'LIFT'])} ${pick(['DENIED', 'SPOOFED', 'RELAY', 'OPEN'])}`,
    () => `TRACE ${hexs(3)}.${hexs(3)}.${hexs(2)} ${pick(['▸ LOST', '▸ HOLD', '▸ OK'])}`, () => `${pick(['PURGE', 'COUNCIL', 'NFFA'])}_FEED ${rint(1, 9)}${rint(0, 9)}% · ${hexs(5)}`])();
}
function digFrag(f, fresh) {
  const side = Math.random() < .5 ? -1 : 1, w = DIG.w, h = DIG.h;
  f.side = side; f.x = side < 0 ? rand(.015, .2) * w : rand(.8, .985) * w; f.y = fresh ? rand(.08, .95) * h : rand(.55, .98) * h;
  f.vy = -rand(5, 13) * DIG.k; f.vx = side * rand(-1.5, 1.5) * DIG.k; f.life = 0; f.max = rand(5, 13); f.text = digText(); f.col = pick(DIG_COLS); f.sz = rand(9, 12.5); f.a = rand(.35, .8);
  return f;
}
function digSize() {
  if (!DIG.c) return; const k = Math.min(window.devicePixelRatio || 1, 1.25);
  DIG.k = k; DIG.w = Math.max(1, Math.round(innerWidth * k)); DIG.h = Math.max(1, Math.round(innerHeight * k)); DIG.c.width = DIG.w; DIG.c.height = DIG.h;
}
function digAug(a) {
  if (!DIG.c) return; const v = smooth01((a - .03) / .45) * DIG.tipK;
  DIG.c.style.opacity = v; DIG.on = v > .01; const sc = $('scan'); if (sc) sc.style.opacity = smooth01((a - .15) / .6);
}
// N: tip the layer in/out (the dial value is remembered)
function digToggle() {
  const from = G.aug, to = from > .05 ? 0 : (DIG.mem > .05 ? DIG.mem : .6); if (from > .05) DIG.mem = from;
  DIG.tipAnim = { t: 0, from, to }; DIG.sweepT = 0; if (AU.ok) AU.tone('sine', to > from ? 1500 : 2400, to > from ? 2600 : 900, .12, .05);
}
function digInit() {
  DIG.c = $('dig'); if (!DIG.c) return; DIG.x = DIG.c.getContext('2d'); digSize();
  for (let i = 0; i < 30; i++) DIG.frags.push(digFrag({}, true));
  for (let i = 0; i < 60; i++) DIG.motes.push({ x: Math.random(), y: Math.random(), v: rand(.004, .02), s: rand(.6, 1.8), a: rand(.2, .7) });
  window.addEventListener('resize', digSize); AUG_HOOKS.push(digAug); digAug(G.aug);
  window.addEventListener('keydown', e => { if (e.code === 'KeyN' && !e.repeat && /^(title|apt|city|photo)$/.test(G.state) && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) digToggle(); });
}
const _dv = new T.Vector3();
function digProject(x, y, z) {
  _dv.set(x, y, z).project(camera); if (_dv.z > 1 || _dv.z < -1 || Math.abs(_dv.x) > 1.05 || Math.abs(_dv.y) > 1.05) return null;
  return [(_dv.x * .5 + .5) * DIG.w, (-_dv.y * .5 + .5) * DIG.h];
}
function digTags() { // refreshed at 4 Hz: landmarks, doors and (on a strong dial) threats you can actually see
  DIG.tags.length = 0; if (G.state !== 'city' || G.inside) return; const cp = camera.position;
  for (const m of DIG_MARKS) { const d = Math.hypot(m.p[0] - cp.x, m.p[2] - cp.z); if (d > 40 && d < 420) DIG.tags.push({ kind: 'mark', n: m.n, p: m.p, d }); }
  for (const it of INTER) if (!it.apt && !it.car && it.p && it.label && /^Enter|^Take/.test(it.label)) { const d = it.p.distanceTo(cp); if (d < 60 && d > 4) DIG.tags.push({ kind: 'door', n: it.label.replace(/^Enter |^Take the /, '').toUpperCase(), p: [it.p.x, it.p.y + 2.6, it.p.z], d }); }
  if (G.aug > .55) for (const e of ENEMIES) {
    if (e.dead || !e.pos) continue; const d = e.pos.distanceTo(cp); if (d > 45 || d < 3) continue;
    const top = e.pos.clone().setY((e.pos.y || 0) + 2.1); if (!losClear(cp, top)) continue;
    DIG.tags.push({ kind: 'threat', n: (ET[e.type] ? ET[e.type].name : e.type).toUpperCase(), p: [top.x, top.y, top.z], d, e });
  }
}
function updateDigital(dt, st) {
  if (!DIG.c) { if (typeof $ === 'function' && $('dig')) digInit(); else return; }
  // tip animation: the dial value glides and the panel tilts in from above
  if (DIG.tipAnim) {
    const A = DIG.tipAnim; A.t += dt / .7; const k = smooth01(A.t); augApply(lerp(A.from, A.to, k));
    const tilt = (A.to > A.from ? 1 - k : k) * 26; DIG.c.style.transform = tilt > .2 ? `perspective(900px) rotateX(${tilt.toFixed(1)}deg)` : '';
    if (A.t >= 1) { DIG.tipAnim = null; DIG.c.style.transform = ''; store('aug', G.aug); }
  }
  if (!DIG.on) { if (DIG.last !== 0) { DIG.x.clearRect(0, 0, DIG.w, DIG.h); DIG.last = 0; } return; }
  DIG.acc += dt; DIG.t += dt; if (DIG.acc < 1 / 30) return; const ft = DIG.acc; DIG.acc = 0; DIG.last = 1;
  const x = DIG.x, W = DIG.w, H = DIG.h, a = G.aug, k = DIG.k, live = st === 'city' || st === 'apt' || st === 'title' || st === 'char' || st === 'photo';
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); if (!live) return;
  x.globalCompositeOperation = 'lighter';
  // data motes
  for (const m of DIG.motes) { m.y -= m.v * ft; if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); } x.fillStyle = `rgba(5,217,232,${(m.a * a).toFixed(3)})`; x.fillRect(m.x * W, m.y * H, m.s * k, m.s * k); }
  // code fragments on angled edge panels ("tipped" toward the viewer)
  const n = Math.round(6 + 24 * smooth01(a)); x.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const f = DIG.frags[i]; f.life += ft; f.y += f.vy * ft; f.x += f.vx * ft; if (f.life > f.max || f.y < H * .04) digFrag(f, false);
    const fa = Math.min(1, f.life / .8, (f.max - f.life) / 1.2) * f.a * (.45 + a * .55); if (fa <= .01) continue;
    const edge = f.side < 0 ? 1 - f.x / (W * .22) : (f.x - W * .78) / (W * .22), sk = f.side * .07;
    x.setTransform(1, sk * .6, 0, 1, f.x, f.y); x.font = `${(f.sz * (1 + clamp(edge, 0, 1) * .25) * k).toFixed(1)}px 'Share Tech Mono', monospace`;
    x.textAlign = f.side < 0 ? 'left' : 'right'; x.fillStyle = f.col; x.globalAlpha = fa; x.fillText(f.text, 0, 0);
  }
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1;
  // holographic scan sweep
  DIG.sweepT -= ft; if (DIG.sweepT <= 0) { DIG.sweepT = lerp(16, 7, a) * rand(.8, 1.2); DIG.sweepY = -60 * k; }
  if (DIG.sweepY > -100 * k && DIG.sweepY < H + 60 * k) {
    DIG.sweepY += H * ft / 1.8; const y = DIG.sweepY, g = x.createLinearGradient(0, y - 46 * k, 0, y + 4 * k);
    g.addColorStop(0, 'rgba(5,217,232,0)'); g.addColorStop(1, `rgba(5,217,232,${(.07 * a + .02).toFixed(3)})`); x.fillStyle = g; x.fillRect(0, y - 46 * k, W, 50 * k);
    x.fillStyle = `rgba(200,250,255,${(.12 * a + .03).toFixed(3)})`; x.fillRect(0, y, W, Math.max(1, k));
  }
  // corner chrome on a strong dial
  if (a > .45) {
    const c = smooth01((a - .45) / .3) * .5, m = 16 * k, L = 34 * k; x.strokeStyle = `rgba(5,217,232,${c.toFixed(3)})`; x.lineWidth = Math.max(1, k);
    x.beginPath(); for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { x.moveTo(cx, cy + sy * L); x.lineTo(cx, cy); x.lineTo(cx + sx * L, cy); } x.stroke();
  }
  // signal tears at the top of the dial
  if (a > .7 && Math.random() < (a - .7) * .5) { x.fillStyle = `rgba(255,42,109,${(.25 * a).toFixed(3)})`; x.fillRect(0, Math.random() * H, W, (1 + Math.random() * 3) * k); }
  // AR tags
  DIG.tagT -= ft; if (DIG.tagT <= 0) { DIG.tagT = .25; digTags(); }
  if (DIG.tags.length && st === 'city') {
    x.font = `${(10.5 * k).toFixed(1)}px 'Share Tech Mono', monospace`; x.textAlign = 'left'; x.lineWidth = Math.max(1, k);
    for (const t of DIG.tags) {
      const p = t.e ? (t.e.dead ? null : digProject(t.e.pos.x, (t.e.pos.y || 0) + 2.1, t.e.pos.z)) : digProject(t.p[0], t.p[1], t.p[2]); if (!p) continue;
      const near = t.kind === 'threat', col = near ? '255,42,109' : t.kind === 'door' ? '243,230,0' : '5,217,232';
      const al = (near ? .9 : .65) * smooth01((a - .08) / .4) * (t.kind === 'mark' ? clamp((t.d - 40) / 60, 0, 1) : 1); if (al < .02) continue;
      x.strokeStyle = x.fillStyle = `rgba(${col},${al.toFixed(3)})`; const r = (near ? 9 : 5) * k;
      x.beginPath(); if (near) { x.moveTo(p[0] - r, p[1] - r + 4 * k); x.lineTo(p[0] - r, p[1] - r); x.lineTo(p[0] - r + 4 * k, p[1] - r); x.moveTo(p[0] + r - 4 * k, p[1] - r); x.lineTo(p[0] + r, p[1] - r); x.lineTo(p[0] + r, p[1] - r + 4 * k); }
      else { x.moveTo(p[0], p[1] - r); x.lineTo(p[0] + r, p[1]); x.lineTo(p[0], p[1] + r); x.lineTo(p[0] - r, p[1]); x.closePath(); } x.stroke();
      x.fillText(`${t.n} ${Math.round(t.d)}m`, p[0] + r + 5 * k, p[1] - (near ? r : 0));
    }
  }
  x.globalCompositeOperation = 'source-over';
}
