'use strict';
/* =====================================================================
   RED NIGHT — core: utils, renderer, textures, audio, particles, collision
   ===================================================================== */
const T = THREE;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const rand = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const TAU = Math.PI * 2;
const smooth01 = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
// how much of an Augment-only set is shown: nothing below ~.1, everything at 1
const augShare = a => Math.pow(clamp((a - .1) / .9, 0, 1), 1.5);
// the primary pointer decides: a touchscreen laptop keeps mouse controls (it used to be treated as a phone and ignore the mouse)
const IS_TOUCH = matchMedia('(any-pointer:fine)').matches ? matchMedia('(pointer:coarse)').matches : (matchMedia('(pointer:coarse)').matches || (('ontouchstart' in window) && navigator.maxTouchPoints > 0));
function store(k, v) {
  try {
    if (v === undefined) { const s = localStorage.getItem('rn_' + k); return s === null ? null : JSON.parse(s); }
    localStorage.setItem('rn_' + k, JSON.stringify(v));
  } catch (e) { return null; }
  return null;
}
// seeded RNG so the city is the same every night
let _seed = 1692;
function srand() { _seed |= 0; _seed = _seed + 0x6D2B79F5 | 0; let t = Math.imul(_seed ^ _seed >>> 15, 1 | _seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const sr = (a, b) => a + srand() * (b - a);
const spick = a => a[Math.floor(srand() * a.length)];

const G = {
  state: 'boot',
  quality: store('q') || (IS_TOUCH ? 'low' : 'high'),
  nightMin: store('n') || 14,
  sens: store('s') || 1,
  music: store('m') !== 0,
  t: 0, dt: 0,
  camMode: 'fpp',
};
if (IS_TOUCH) document.body.classList.add('touch');
// Augment: how much of the cyberpunk "net layer" sits over the real city (0 = bare city, 1 = full overlay)
G.aug = (() => { const v = store('aug'); return typeof v === 'number' ? v : .35; })();
G.fov = store('fov') || 0;              // 0 = the camera mode's default FOV; otherwise degrees
G.aimAssist = store('aa') !== 0;        // touch aim assist, on unless switched off
G.invertY = store('inv') === 1;
G.rainK = 1;                            // rain intensity 0..1 (ambience drives it over the night)
const AUG_HOOKS = [];
function augApply(v) { G.aug = clamp(v, 0, 1); for (const f of AUG_HOOKS) f(G.aug); } // live value (animations), not saved
function setAug(v) { if (typeof DIG !== 'undefined') DIG.tipAnim = null; augApply(v); store('aug', G.aug); }
function setFov(v) { G.fov = v ? clamp(v, 50, 100) : 0; store('fov', G.fov); }
function setAimAssist(on) { G.aimAssist = !!on; store('aa', on ? 1 : 0); }
function setInvertY(on) { G.invertY = !!on; store('inv', on ? 1 : 0); }
// asset fetch progress for the loading screen (every GLB/texture goes through fetch or Image)
const NET = { req: 0, done: 0 };
(() => {
  const f0 = window.fetch && window.fetch.bind(window); if (!f0) return;
  window.fetch = function () { NET.req++; return f0.apply(null, arguments).then(r => { NET.done++; return r; }, e => { NET.done++; throw e; }); };
})();

// adaptive resolution state (declared before the renderer reads it; drsTick below)
const DRS = { k: 1, t: 0, on: !navigator.webdriver, floor: IS_TOUCH ? .62 : .7, buf: new Float32Array(256), srt: new Float32Array(256), n: 0, bad: 0, good: 0, hold: 0, probe: null };
/* ---------------- renderer ---------------- */
const canvas = $('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: !IS_TOUCH && G.quality === 'high', powerPreference: 'high-performance' });
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.autoClear = false;
function applyPixelRatio() {
  const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio((G.quality === 'high' ? Math.min(dpr, 2) : Math.min(dpr, IS_TOUCH ? 1.1 : 1.25)) * DRS.k);
}
applyPixelRatio();

const scene = new T.Scene();
scene.fog = new T.FogExp2(0x1b0d30, 0.0115);
scene.background = new T.Color(0x07040f);
const camera = new T.PerspectiveCamera(IS_TOUCH ? 80 : 74, 1, 0.05, 1500);
scene.add(camera);
const vmScene = new T.Scene();
const vmCam = new T.PerspectiveCamera(54, 1, 0.01, 20);

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  vmCam.aspect = w / h; vmCam.updateProjectionMatrix();
  const sc = $('scopeC'); sc.width = w; sc.height = h;
  if (typeof onResizeHook === 'function') onResizeHook();
}
window.addEventListener('resize', onResize);

/* ---------------- lights ---------------- */
const hemi = new T.HemisphereLight(0x8394b8, 0x2a2016, 0.5); // overcast sky over a sodium-lit city
scene.add(hemi);
const moon = new T.DirectionalLight(0xc8857a, 0.22);          // the blood moon behind the clouds
moon.position.set(-200, 300, -400);
scene.add(moon);
const NL = IS_TOUCH ? 4 : 8;
const lightPool = [];
for (let i = 0; i < NL; i++) { const l = new T.PointLight(0xffffff, 0, 26, 2); scene.add(l); lightPool.push(l); }
const flashLight = new T.PointLight(0xffc070, 0, 14, 2); scene.add(flashLight);
// viewmodel lighting
const vmHemi = new T.HemisphereLight(0xaab4cc, 0x2a2018, 0.85); vmScene.add(vmHemi);
const vmKey = new T.DirectionalLight(0xfff2e0, 0.85); vmKey.position.set(1, 2, 1.5); vmScene.add(vmKey);
// rims read as streetlight (sodium) and sky (cool) on a bare city; they drift toward magenta/cyan as Augment rises
const vmRim = new T.DirectionalLight(0xffa860, 0.55); vmRim.position.set(-2, 0.5, -1); vmScene.add(vmRim);
const vmCyan = new T.DirectionalLight(0x8ab4ff, 0.4); vmCyan.position.set(2, -0.5, -1); vmScene.add(vmCyan);
const VM_RIM = [new T.Color(0xffa860), new T.Color(0xff2a6d), new T.Color(0x8ab4ff), new T.Color(0x05d9e8)];
function augVM(a) { const k = smooth01(a); vmRim.color.copy(VM_RIM[0]).lerp(VM_RIM[1], k); vmCyan.color.copy(VM_RIM[2]).lerp(VM_RIM[3], k); vmRim.intensity = .55 + k * .25; vmCyan.intensity = .4 + k * .2; }
AUG_HOOKS.push(augVM); augVM(G.aug);
const vmFlash = new T.PointLight(0xffb060, 0, 3, 2); vmFlash.position.set(0, 0, -0.8); vmScene.add(vmFlash);

/* ---------------- canvas textures ---------------- */
function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function texFrom(c, srgb = true, rep) {
  const t = new T.CanvasTexture(c);
  if (srgb) t.encoding = T.sRGBEncoding;
  t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; }
  return t;
}
// soft glow sprite
const glowTex = (() => {
  const [c, x] = cvs(128, 128); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return texFrom(c, false);
})();
const flashTex = (() => {
  const [c, x] = cvs(128, 128); x.translate(64, 64);
  for (let i = 0; i < 7; i++) {
    x.rotate(TAU / 7 + Math.random() * .3);
    const g = x.createLinearGradient(0, 0, 0, -60); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(1, 'rgba(255,140,40,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(-7, 0); x.lineTo(0, -40 - Math.random() * 22); x.lineTo(7, 0); x.fill();
  }
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 30); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(1, 'rgba(255,160,60,0)');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, 30, 0, TAU); x.fill();
  return texFrom(c, false);
})();
// facade windows: emissive window grid
function makeWindowTex(palette, litChance, style) {
  const [c, x] = cvs(256, 512);
  x.fillStyle = '#05030a'; x.fillRect(0, 0, 256, 512);
  const cols = style === 'old' ? 4 : 8, rows = style === 'old' ? 8 : 16;
  const cw = 256 / cols, rh = 512 / rows;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const lit = Math.random() < litChance;
    const px = q * cw + cw * 0.18, py = r * rh + rh * 0.22, w = cw * 0.64, h = rh * 0.56;
    if (lit) {
      const col = pick(palette);
      const g = x.createLinearGradient(0, py, 0, py + h); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,.6)');
      x.fillStyle = g; x.globalAlpha = rand(0.45, 1);
    } else { x.fillStyle = '#0d0a18'; x.globalAlpha = 1; }
    if (style === 'old') { x.fillRect(px, py, w, h); x.globalAlpha = 1; x.fillStyle = '#05030a'; x.fillRect(px + w / 2 - 1, py, 2, h); x.fillRect(px, py + h / 2 - 1, w, 2); }
    else x.fillRect(px, py, w, h);
    x.globalAlpha = 1;
  }
  // corner pixels dark (roofs sample here)
  x.fillStyle = '#05030a'; x.fillRect(0, 0, 4, 4);
  return texFrom(c, true, true);
}
// ground: one 40x40 city cell (road on two edges)
function makeGroundTex() {
  const S = 512; const [c, x] = cvs(S, S);
  const k = S / 40; // px per meter
  x.fillStyle = '#161616'; x.fillRect(0, 0, S, S);
  // asphalt noise
  for (let i = 0; i < 9000; i++) { const v = rint(28, 70); x.fillStyle = `rgba(${v},${v - 2},${v - 4},${rand(0.05, 0.25)})`; x.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
  // sidewalks / block (block spans 6..34 m)
  x.fillStyle = '#2c2b29'; x.fillRect(6 * k, 6 * k, 28 * k, 28 * k);
  x.fillStyle = '#3e3c38'; x.fillRect(6 * k, 6 * k, 28 * k, 1.2 * k); x.fillRect(6 * k, 6 * k, 1.2 * k, 28 * k); x.fillRect(6 * k, 32.8 * k, 28 * k, 1.2 * k); x.fillRect(32.8 * k, 6 * k, 1.2 * k, 28 * k);
  for (let i = 8; i < 34; i += 2) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(i * k, 6 * k, 1, 28 * k); x.fillRect(6 * k, i * k, 28 * k, 1); }
  // lane dashes on the road strips (centered on 0 / 40)
  x.fillStyle = '#9c8a24'; // worn lane paint
  for (let i = 0; i < 40; i += 4) { x.fillRect(i * k, 0, 2 * k, 0.25 * k); x.fillRect(i * k, S - 0.25 * k, 2 * k, 0.25 * k); x.fillRect(0, i * k, 0.25 * k, 2 * k); x.fillRect(S - 0.25 * k, i * k, 0.25 * k, 2 * k); }
  // crosswalk near intersections
  x.fillStyle = 'rgba(220,218,210,.42)';
  for (let i = 0; i < 6; i++) { x.fillRect(7 * k + i * 0.9 * k, 2 * k, 0.45 * k, 3 * k); x.fillRect(2 * k, 7 * k + i * 0.9 * k, 3 * k, 0.45 * k); }
  const map = texFrom(c, true, true);
  // roughness: puddles
  const [c2, y] = cvs(256, 256); y.fillStyle = '#b0b0b0'; y.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) { const r = rand(6, 28); const g = y.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, '#101010'); g.addColorStop(1, 'rgba(16,16,16,0)'); y.save(); y.translate(Math.random() * 256, Math.random() * 256); y.scale(rand(1, 2.4), 1); y.fillStyle = g; y.beginPath(); y.arc(0, 0, r, 0, TAU); y.fill(); y.restore(); }
  const rough = texFrom(c2, false, true);
  return [map, rough];
}
// sign atlas: 4 cols x 16 rows of 256x64 neon words
const SIGN_W = 256, SIGN_H = 64;
const signAtlas = { c: null, x: null, n: 0, tex: null };
(() => { const [c, x] = cvs(1024, 1024); x.clearRect(0, 0, 1024, 1024); signAtlas.c = c; signAtlas.x = x; })();
const BOX_SIGNS = [['#f1ead8', '#b3121e'], ['#f6d23a', '#151515'], ['#ffffff', '#1b3a8a'], ['#b3121e', '#ffffff'], ['#1d4d2c', '#f4ecd0'], ['#151515', '#f3c13a']];
function addSign(text, color, font, box) {
  const i = signAtlas.n++; const col = i % 4, row = Math.floor(i / 4);
  const x = signAtlas.x, ox = col * SIGN_W, oy = row * SIGN_H;
  x.save(); x.beginPath(); x.rect(ox, oy, SIGN_W, SIGN_H); x.clip();
  if (box) { // backlit lightbox: printed panel, soft falloff to the edges, dark letters
    const [bg, fg] = box; x.fillStyle = '#0c0c0c'; x.fillRect(ox, oy, SIGN_W, SIGN_H); x.fillStyle = bg; x.fillRect(ox + 4, oy + 4, SIGN_W - 8, SIGN_H - 8);
    const vg = x.createRadialGradient(ox + SIGN_W / 2, oy + SIGN_H / 2, 10, ox + SIGN_W / 2, oy + SIGN_H / 2, SIGN_W * .6); vg.addColorStop(0, 'rgba(255,255,255,.18)'); vg.addColorStop(1, 'rgba(0,0,0,.28)'); x.fillStyle = vg; x.fillRect(ox + 4, oy + 4, SIGN_W - 8, SIGN_H - 8);
    let fs = 32; const ff = font || "'Chakra Petch', sans-serif"; x.font = `700 ${fs}px ${ff}`;
    while (x.measureText(text).width > SIGN_W - 30 && fs > 12) { fs -= 2; x.font = `700 ${fs}px ${ff}`; }
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fg; x.fillText(text, ox + SIGN_W / 2, oy + SIGN_H / 2 + 2);
    x.restore(); return { u0: col / 4, v0: 1 - (row + 1) / 16, u1: (col + 1) / 4, v1: 1 - row / 16 };
  }
  x.fillStyle = 'rgba(4,2,10,.85)'; x.fillRect(ox + 2, oy + 2, SIGN_W - 4, SIGN_H - 4);
  x.strokeStyle = color; x.lineWidth = 3; x.shadowColor = color; x.shadowBlur = 10; x.strokeRect(ox + 5, oy + 5, SIGN_W - 10, SIGN_H - 10);
  let fs = 34; x.font = `700 ${fs}px ${font || "'Chakra Petch', sans-serif"}`;
  while (x.measureText(text).width > SIGN_W - 26 && fs > 12) { fs -= 2; x.font = `700 ${fs}px ${font || "'Chakra Petch', sans-serif"}`; }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.shadowBlur = 16;
  x.fillText(text, ox + SIGN_W / 2, oy + SIGN_H / 2 + 2); x.fillStyle = color; x.shadowBlur = 4; x.globalAlpha = .55; x.fillText(text, ox + SIGN_W / 2, oy + SIGN_H / 2 + 2);
  x.restore();
  return { u0: col / 4, v0: 1 - (row + 1) / 16, u1: (col + 1) / 4, v1: 1 - row / 16 };
}
// big billboard textures
function makeBillboard(lines, c1, c2, glyph) {
  const [c, x] = cvs(512, 256);
  const g = x.createLinearGradient(0, 0, 512, 256); g.addColorStop(0, c1); g.addColorStop(1, c2);
  x.fillStyle = '#05020c'; x.fillRect(0, 0, 512, 256); x.globalAlpha = .35; x.fillStyle = g; x.fillRect(0, 0, 512, 256); x.globalAlpha = 1;
  if (glyph) { x.font = "180px 'Rubik Glitch', Impact, sans-serif"; x.fillStyle = 'rgba(255,255,255,.08)'; x.fillText(glyph, 300, 210); }
  x.fillStyle = '#fff'; x.shadowColor = c1; x.shadowBlur = 18; x.textBaseline = 'top';
  x.font = "64px 'Rubik Glitch', Impact, sans-serif"; x.fillText(lines[0], 26, 40);
  x.font = "600 26px 'Chakra Petch', sans-serif"; x.fillStyle = c2; x.shadowColor = c2; x.fillText(lines[1] || '', 30, 132);
  x.font = "18px 'Share Tech Mono', monospace"; x.fillStyle = 'rgba(255,255,255,.75)'; x.shadowBlur = 0; x.fillText(lines[2] || '', 30, 196);
  for (let y = 0; y < 256; y += 3) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, y, 512, 1); }
  return texFrom(c, true);
}

/* ---------------- environment map (wet reflections) ---------------- */
(() => {
  const pm = new T.PMREMGenerator(renderer);
  const es = new T.Scene();
  const [c, x] = cvs(512, 256);
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#0d0f14'); g.addColorStop(.45, '#262019'); g.addColorStop(.55, '#0a0908'); g.addColorStop(1, '#050404');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  const cols = ['#ffb066', '#ffd9a0', '#fff1d8', '#ffb066', '#b8c8ff', '#ff4030'];
  for (let i = 0; i < 70; i++) { x.fillStyle = pick(cols); x.globalAlpha = rand(.3, 1); x.fillRect(Math.random() * 512, rand(100, 140), rand(2, 8), rand(2, 10)); }
  x.globalAlpha = 1;
  const t = texFrom(c, true);
  const m = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ map: t, side: T.BackSide }));
  es.add(m);
  const rt = pm.fromScene(es, 0.02);
  scene.environment = rt.texture; vmScene.environment = rt.texture;
  pm.dispose();
  // then the real thing: a CC0 night-street panorama (Poly Haven "Hansaplatz") for wet-street, car and glass reflections
  const im = new Image();
  im.onload = () => {
    try {
      const et = new T.Texture(im); et.encoding = T.sRGBEncoding; et.mapping = T.EquirectangularReflectionMapping; et.needsUpdate = true;
      const pm2 = new T.PMREMGenerator(renderer); const rt2 = pm2.fromEquirectangular(et);
      scene.environment = rt2.texture; vmScene.environment = rt2.texture; pm2.dispose(); et.dispose(); rt.texture.dispose();
    } catch (e) { }
  };
  im.src = 'assets/sky/street_env.jpg';
})();
/* ---------------- adaptive resolution: hold the frame rate on phones by trading pixels ---------------- */
// Dynamic resolution, judged on the median frame of each 2 s window (one GC hitch can't move it).
// A slow window only steps down after a second one agrees, and every step down is a probe: if the
// next windows aren't clearly faster, the frame rate is capped by something else (iOS Low Power Mode,
// a 30 Hz vsync lock, the CPU), so the old resolution comes back and DRS leaves it alone for 30 s.
function drsSet(k) { k = clamp(k, DRS.floor, 1); if (Math.abs(k - DRS.k) < .01) return; DRS.k = k; applyPixelRatio(); if (typeof postSize === 'function') postSize(); }
function drsTick(dt) {
  if (!DRS.on || G.state === 'boot') return;
  if (DRS.n < 256) DRS.buf[DRS.n++] = dt; DRS.t += dt; if (DRS.t < 2) return; DRS.t = 0;
  const n = DRS.n; DRS.n = 0; if (n < 8) return;
  const s = DRS.srt.subarray(0, n); s.set(DRS.buf.subarray(0, n)); s.sort(); const med = s[n >> 1];
  if (DRS.hold > 0) DRS.hold -= 2;
  const P0 = DRS.probe;
  if (P0) { // judging a step down
    if (med < P0.med * .93) { DRS.probe = null; DRS.fails = 0; return; } // it bought frames: keep it
    if (++P0.w >= 2) { DRS.probe = null; DRS.fails = Math.min(4, (DRS.fails || 0) + 1); DRS.hold = 15 << DRS.fails; drsSet(P0.k); } // it didn't: not GPU-bound, put it back (and wait 30, 60, 120, 240 s before asking again)
    return;
  }
  if (med > 1 / 44) { DRS.good = 0; if (++DRS.bad >= 2 && DRS.hold <= 0 && DRS.k > DRS.floor + .005) { DRS.bad = 0; DRS.probe = { k: DRS.k, med, w: 0 }; drsSet(DRS.k - .08); } }
  else if (med < 1 / 57) { DRS.bad = 0; if (++DRS.good >= 3 && DRS.k < 1) { DRS.good = 0; drsSet(DRS.k + .04); } }
  else DRS.bad = DRS.good = 0;
}

/* ---------------- audio (all synthesized) ---------------- */
const AU = {
  ctx: null, master: null, sfx: null, mus: null, noise: null, rainG: null, ok: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.ctx.destination);
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(this.master);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(comp);
      this.mus = this.ctx.createGain(); this.mus.gain.value = G.music ? 0.32 : 0; this.mus.connect(this.master);
      const len = this.ctx.sampleRate * 2; const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b; this.ok = true;
      this.startRain(); this.startMusic();
    } catch (e) { this.ok = false; }
  },
  now() { return this.ctx.currentTime; },
  out(pan) {
    if (pan === undefined || !this.ctx.createStereoPanner) return this.sfx;
    const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(this.sfx); return p;
  },
  nz(dur, type, f0, f1, q, vol, pan, attack) {
    if (!this.ok || !(vol > .002)) return;
    const t = this.now(); const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = rand(.8, 1.2);
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out(pan)); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  tone(type, f0, f1, dur, vol, pan, attack) {
    if (!this.ok || !(vol > .002)) return;
    const t = this.now(); const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out(pan)); o.start(t); o.stop(t + dur + 0.05);
  },
  shot(w, sup) {
    if (!this.ok) return;
    const c = w.cls, heavy = w.dmg > 60;
    if (w.kind === 'plasma') { this.tone('sawtooth', 1400, 180, 0.28, 0.35); this.tone('sine', 300, 60, 0.3, 0.4); this.nz(0.2, 'bandpass', 3000, 600, 2, 0.25); return; }
    if (sup) { this.nz(0.12, 'highpass', 2500, 1200, 0.7, 0.35); this.tone('sine', 180, 60, 0.08, 0.25); return; }
    if (c === 'shotgun') { this.nz(0.45, 'lowpass', 3000, 200, 0.8, 1.0); this.tone('sine', 110, 35, 0.35, 0.9); return; }
    if (c === 'sniper') { this.nz(0.8, 'lowpass', 5000, 150, 0.7, 1.0); this.tone('sine', 90, 28, 0.6, 1.0); this.nz(1.4, 'bandpass', 700, 120, 1, 0.2, undefined, 0.2); return; }
    if (c === 'pistol') { this.nz(heavy ? 0.3 : 0.18, 'lowpass', 6000, 500, 0.9, heavy ? 0.95 : 0.7); this.tone('sine', heavy ? 140 : 190, 50, 0.12, 0.6); return; }
    if (c === 'smg') { this.nz(0.14, 'lowpass', 5000, 700, 0.9, 0.6); this.tone('sine', 170, 60, 0.08, 0.45); return; }
    this.nz(c === 'lmg' ? 0.26 : 0.22, 'lowpass', 4500, 380, 0.9, 0.8); this.tone('sine', 120, 40, 0.14, 0.7);
  },
  click() { this.tone('square', 2400, 1800, 0.03, 0.12); },
  mag(out) { this.nz(0.08, 'bandpass', out ? 1800 : 2600, out ? 900 : 2000, 4, 0.35); this.tone('square', out ? 900 : 1300, 600, 0.04, 0.1); },
  rack() { this.nz(0.12, 'bandpass', 1500, 3000, 3, 0.4); setTimeout(() => this.nz(0.1, 'bandpass', 3200, 1600, 3, 0.4), 120); },
  swish(heavy) { this.nz(heavy ? 0.32 : 0.2, 'bandpass', 400, 2600, 1.4, heavy ? 0.5 : 0.35); },
  hitmark(kill) { this.tone('sine', kill ? 1400 : 2200, kill ? 900 : 2000, kill ? 0.12 : 0.04, kill ? 0.3 : 0.18); },
  thud(pan) { this.nz(0.12, 'lowpass', 900, 200, 1, 0.5, pan); },
  ping(pan) { this.nz(0.06, 'highpass', 4000, 6000, 1, 0.2, pan); },
  hurt() { this.tone('sine', 90, 50, 0.2, 0.5); this.nz(0.15, 'lowpass', 1200, 300, 1, 0.3); },
  growl(pan, vol) { this.tone('sawtooth', rand(60, 80), 40, 0.7, 0.25 * (vol || 1), pan, 0.08); this.nz(0.6, 'lowpass', 500, 120, 3, 0.25 * (vol || 1), pan, 0.08); },
  screech(pan, vol) { this.nz(0.5, 'bandpass', 2400, 5200, 5, 0.3 * (vol || 1), pan, 0.03); this.tone('sawtooth', 1200, 2200, 0.4, 0.08 * (vol || 1), pan); },
  hiss(pan, vol) { this.nz(0.6, 'highpass', 3000, 6000, 1, 0.25 * (vol || 1), pan, 0.06); },
  cackle(pan, vol) { if (!this.ok) return; for (let i = 0; i < 5; i++) setTimeout(() => this.tone('triangle', rand(700, 1000), 500, 0.12, 0.12 * (vol || 1), pan), i * 110); },
  roar(pan, vol) { this.tone('sawtooth', 110, 45, 1.1, 0.35 * (vol || 1), pan, 0.1); this.nz(1.0, 'lowpass', 900, 100, 2, 0.45 * (vol || 1), pan, 0.1); },
  zap(pan) { this.tone('sawtooth', 900, 120, 0.3, 0.2, pan); },
  boom(pan) { this.nz(1.2, 'lowpass', 1500, 60, 0.8, 1, pan); this.tone('sine', 70, 25, 0.9, 0.8, pan); },
  thunder() { this.nz(3.5, 'lowpass', 600, 40, 0.5, 0.8, undefined, 0.15); },
  siren(dur) {
    if (!this.ok) return;
    const t = this.now();
    [0, 0.02].forEach((det, i) => {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth';
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.11; const lg = this.ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(o.frequency);
      o.frequency.value = 600 + det * 1000;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 1.5); g.gain.setValueAtTime(0.09, t + dur - 2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(this.sfx); o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
    });
  },
  startRain() {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    this.rainG = this.ctx.createGain(); this.rainG.gain.value = 0.07;
    s.connect(hp); hp.connect(lp); lp.connect(this.rainG); this.rainG.connect(this.master); s.start();
  },
  startMusic() {
    // dark synthwave: bass pulse + arpeggio, scheduled ahead
    const ctx = this.ctx; const notes = [45, 45, 48, 45, 43, 45, 50, 48]; const arp = [69, 72, 76, 79, 76, 72, 74, 77];
    const mf = n => 440 * Math.pow(2, (n - 69) / 12);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 6; lp.connect(this.mus);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 600; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    const delay = ctx.createDelay(); delay.delayTime.value = 0.375; const fb = ctx.createGain(); fb.gain.value = 0.35; delay.connect(fb); fb.connect(delay); delay.connect(this.mus);
    let step = 0, next = ctx.currentTime + 0.1; const spb = 0.1875;
    const tick = () => {
      while (next < ctx.currentTime + 0.4) {
        const bar = Math.floor(step / 8) % notes.length;
        if (step % 2 === 0) {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mf(notes[bar] - 12);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, next); g.gain.exponentialRampToValueAtTime(0.5, next + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, next + spb * 1.8);
          o.connect(g); g.connect(lp); o.start(next); o.stop(next + spb * 2);
        }
        if (step % 3 !== 2) {
          const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = mf(arp[step % 8] + (bar % 4 === 3 ? -2 : 0) - 12);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, next); g.gain.exponentialRampToValueAtTime(0.06, next + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, next + spb * 0.9);
          o.connect(g); g.connect(delay); g.connect(this.mus); o.start(next); o.stop(next + spb);
        }
        if (step % 8 === 0) { // kick
          const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, next); o.frequency.exponentialRampToValueAtTime(40, next + 0.18);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.7, next); g.gain.exponentialRampToValueAtTime(0.0001, next + 0.3);
          o.connect(g); g.connect(this.mus); o.start(next); o.stop(next + 0.32);
        }
        step++; next += spb;
      }
    };
    setInterval(() => { if (this.ctx.state === 'running') tick(); }, 120);
  },
  setMusic(on) { G.music = on; store('m', on ? 1 : 0); if (this.mus) this.mus.gain.setTargetAtTime(on ? 0.32 : 0, this.now(), 0.3); },
  engine: null,
  engineSet(on, speed) {
    if (!this.ok) return;
    if (on && !this.engine) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; const o2 = this.ctx.createOscillator(); o2.type = 'square';
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const g = this.ctx.createGain(); g.gain.value = 0.08;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfx); o.start(); o2.start();
      this.engine = { o, o2, g, f };
    }
    if (!on && this.engine) { const e = this.engine; e.g.gain.setTargetAtTime(0.0001, this.now(), 0.1); setTimeout(() => { try { e.o.stop(); e.o2.stop(); } catch (er) { } }, 400); this.engine = null; }
    if (on && this.engine) { const fr = 45 + Math.abs(speed) * 4.2; this.engine.o.frequency.setTargetAtTime(fr, this.now(), 0.05); this.engine.o2.frequency.setTargetAtTime(fr * 0.5, this.now(), 0.05); this.engine.f.frequency.setTargetAtTime(400 + Math.abs(speed) * 40, this.now(), 0.05); }
  },
};
// distance/pan helper for 3D sound sources
function spatial(pos) {
  const dx = pos.x - camera.position.x, dz = pos.z - camera.position.z; const d = Math.hypot(dx, dz) || 1;
  const pan = (dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw)) / d;
  return { pan: pan * 0.8, vol: clamp(1 - d / 70, 0, 1) };
}

/* ---------------- particles (two point clouds: additive + alpha) ---------------- */
function makeParticles(max, additive) {
  const geo = new T.BufferGeometry();
  const pos = new Float32Array(max * 3), col = new Float32Array(max * 3), size = new Float32Array(max), alpha = new Float32Array(max);
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  geo.setAttribute('size', new T.BufferAttribute(size, 1));
  geo.setAttribute('alpha', new T.BufferAttribute(alpha, 1));
  const mat = new T.ShaderMaterial({
    uniforms: { scale: { value: 400 } },
    vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
      void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0; if(r>1.0) discard; float a=vA*(1.0-r); gl_FragColor=vec4(vC*${additive ? '1.6' : '1.0'},a); }`,
    transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
  });
  const pts = new T.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
  const P = [];
  for (let i = 0; i < max; i++) P.push({ life: 0, max: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, g: 0, s0: 1, s1: 1, r: 1, gc: 1, b: 1, a0: 1, drag: 0 });
  let cursor = 0;
  return {
    pts, emit(x, y, z, vx, vy, vz, life, s0, s1, color, a0, g, drag) {
      const p = P[cursor]; cursor = (cursor + 1) % max;
      p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = life; p.max = life; p.s0 = s0; p.s1 = s1;
      p.r = color.r; p.gc = color.g; p.b = color.b; p.a0 = a0 === undefined ? 1 : a0; p.g = g || 0; p.drag = drag || 0;
    },
    update(dt) {
      for (let i = 0; i < max; i++) {
        const p = P[i];
        if (p.life <= 0) { alpha[i] = 0; pos[i * 3 + 1] = -999; continue; }
        p.life -= dt; const k = 1 - p.life / p.max;
        p.vy -= p.g * dt; const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy *= dr; p.vz *= dr;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.02 && p.g > 0) { p.y = 0.02; p.vy *= -0.2; p.vx *= 0.5; p.vz *= 0.5; }
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        col[i * 3] = p.r; col[i * 3 + 1] = p.gc; col[i * 3 + 2] = p.b;
        size[i] = lerp(p.s0, p.s1, k); alpha[i] = p.a0 * (1 - k * k);
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.attributes.size.needsUpdate = true; geo.attributes.alpha.needsUpdate = true;
    },
    clear() { for (const p of P) p.life = 0; },
  };
}
const FXA = makeParticles(G.quality === 'high' ? 900 : 420, true);
const FXN = makeParticles(G.quality === 'high' ? 600 : 300, false);
const C = (hex) => new T.Color(hex);
const COL = { spark: C(0xffc070), blood: C(0x6a0010), ichor: C(0x111111), green: C(0x2cff6a), ember: C(0xff5a10), purple: C(0xb04dff), smoke: C(0x2c2a28), ash: C(0x777777), cyan: C(0x05d9e8), mag: C(0xff2a6d), white: C(0xffffff), fire: C(0xff7a1a), plasma: C(0x5dff7a) };
function burst(fx, p, n, spd, life, s0, s1, color, g, up, a0, drag) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, e = rand(-0.3, 1);
    fx.emit(p.x, p.y, p.z, Math.cos(a) * spd * rand(.3, 1), (e + (up || 0)) * spd * rand(.3, 1), Math.sin(a) * spd * rand(.3, 1), life * rand(.6, 1.2), s0, s1, color, a0, g, drag);
  }
}

/* ---------------- tracers & decals ---------------- */
const tracerGeo = new T.BoxGeometry(0.025, 0.025, 1); tracerGeo.translate(0, 0, -0.5);
const tracers = [];
for (let i = 0; i < 40; i++) {
  const m = new T.Mesh(tracerGeo, new T.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
  m.visible = false; m.frustumCulled = false; scene.add(m); tracers.push({ m, t: 0 });
}
let tracerI = 0;
function tracer(from, to, color, w) {
  const tr = tracers[tracerI]; tracerI = (tracerI + 1) % tracers.length;
  const d = from.distanceTo(to); if (d < 0.5) return;
  tr.m.position.copy(from); tr.m.lookAt(to); tr.m.scale.set(w || 1, w || 1, d);
  tr.m.material.color.set(color || 0xffd28a); tr.m.material.opacity = 0.9; tr.m.visible = true; tr.t = 0.07;
}
const decalGeo = new T.PlaneGeometry(1, 1);
const holeTex = (() => { const [c, x] = cvs(64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.3, 'rgba(10,6,4,.9)'); g.addColorStop(.5, 'rgba(60,40,30,.4)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return texFrom(c, true); })();
const splatTex = (() => { const [c, x] = cvs(128, 128); x.fillStyle = '#fff'; for (let i = 0; i < 22; i++) { x.globalAlpha = rand(.4, 1); x.beginPath(); x.arc(64 + rand(-40, 40) * Math.random(), 64 + rand(-40, 40) * Math.random(), rand(3, 18), 0, TAU); x.fill(); } return texFrom(c, true); })();
const decals = [];
for (let i = 0; i < 70; i++) {
  const m = new T.Mesh(decalGeo, new T.MeshBasicMaterial({ map: holeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  m.visible = false; scene.add(m); decals.push(m);
}
let decalI = 0;
function decal(p, n, size, tex, color) {
  const m = decals[decalI]; decalI = (decalI + 1) % decals.length;
  m.material.map = tex || holeTex; m.material.color.set(color || 0xffffff); m.material.needsUpdate = true;
  m.position.copy(p).addScaledVector(n, 0.02); m.lookAt(p.x + n.x, p.y + n.y, p.z + n.z); m.rotateZ(Math.random() * TAU);
  m.scale.setScalar(size); m.visible = true;
}

/* ---------------- collision world (AABBs on a grid) ---------------- */
const BOX = []; // {x0,x1,z0,z1,y0,y1, water}
const CELL = 20; const grid = new Map();
const gk = (i, j) => i * 10007 + j;
function addBox(x0, x1, z0, z1, y1, opt) {
  const b = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0: (opt && opt.y0) || 0, y1, water: !!(opt && opt.water), shoot: !(opt && opt.noshoot) };
  BOX.push(b);
  for (let i = Math.floor(b.x0 / CELL); i <= Math.floor(b.x1 / CELL); i++) for (let j = Math.floor(b.z0 / CELL); j <= Math.floor(b.z1 / CELL); j++) {
    const k = gk(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(b);
  }
  return b;
}
// shared result, stamp-deduped (collideCircle runs ~100x a frame). The array is never truncated
// (length = 0 drops V8's backing store, so every push reallocated): hot callers read the first n.
const _bn = []; let _bnS = 0;
function boxesNearN(x, z) {
  const i = Math.floor(x / CELL), j = Math.floor(z / CELL); let n = 0; _bnS++;
  for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) { const l = grid.get(gk(i + a, j + c)); if (l) for (let k = 0; k < l.length; k++) { const b = l[k]; if (b._bn !== _bnS) { b._bn = _bnS; _bn[n++] = b; } } }
  return n;
}
function boxesNear(x, z) { return _bn.slice(0, boxesNearN(x, z)); } // a copy, for the occasional callers (AI cover, setup)
// push a circle out of boxes; feet y used so you can stand on low things
function collideCircle(pos, r, feetY, h) {
  const n = boxesNearN(pos.x, pos.z); let hit = false;
  for (let q = 0; q < n; q++) { const b = _bn[q];
    if (feetY >= b.y1 - 0.05 && !b.water) continue; // above it
    if (feetY + (h || 1.8) <= b.y0) continue;
    const cx = clamp(pos.x, b.x0, b.x1), cz = clamp(pos.z, b.z0, b.z1);
    let dx = pos.x - cx, dz = pos.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x = cx + dx / d * r; pos.z = cz + dz / d * r; }
      else { // center inside: push to nearest face
        const l = pos.x - b.x0, rr = b.x1 - pos.x, f = pos.z - b.z0, bk = b.z1 - pos.z; const m = Math.min(l, rr, f, bk);
        if (m === l) pos.x = b.x0 - r; else if (m === rr) pos.x = b.x1 + r; else if (m === f) pos.z = b.z0 - r; else pos.z = b.z1 + r;
      }
      hit = true;
    }
  }
  return hit;
}
function groundAt(x, z, feetY) {
  let g = 0; const n = boxesNearN(x, z);
  for (let q = 0; q < n; q++) { const b = _bn[q]; if (b.water) continue; if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && b.y1 <= feetY + 0.45 && b.y1 > g) g = b.y1; }
  return g;
}
// ray vs all boxes (slab). returns {t, n}
const _n = new T.Vector3();
function rayBoxes(o, d, maxT) {
  // the grid walk in ai.js gives the same answer ~200x faster (only the cells the ray crosses)
  if (typeof rayGrid === 'function') { const h = rayGrid(o, d, maxT); return h ? { t: h.t, n: h.n.clone(), box: h.box } : null; }
  let best = maxT, bn = null, bb = null;
  for (let k = 0; k < BOX.length; k++) {
    const b = BOX[k]; if (!b.shoot) continue;
    let t0 = 0, t1 = best, nAxis = -1, nSign = 0;
    // x
    if (Math.abs(d.x) < 1e-9) { if (o.x < b.x0 || o.x > b.x1) continue; }
    else { let ta = (b.x0 - o.x) / d.x, tb = (b.x1 - o.x) / d.x; let s = -1; if (ta > tb) { const q = ta; ta = tb; tb = q; s = 1; } if (ta > t0) { t0 = ta; nAxis = 0; nSign = s; } if (tb < t1) t1 = tb; if (t0 > t1) continue; }
    if (Math.abs(d.y) < 1e-9) { if (o.y < b.y0 || o.y > b.y1) continue; }
    else { let ta = (b.y0 - o.y) / d.y, tb = (b.y1 - o.y) / d.y; let s = -1; if (ta > tb) { const q = ta; ta = tb; tb = q; s = 1; } if (ta > t0) { t0 = ta; nAxis = 1; nSign = s; } if (tb < t1) t1 = tb; if (t0 > t1) continue; }
    if (Math.abs(d.z) < 1e-9) { if (o.z < b.z0 || o.z > b.z1) continue; }
    else { let ta = (b.z0 - o.z) / d.z, tb = (b.z1 - o.z) / d.z; let s = -1; if (ta > tb) { const q = ta; ta = tb; tb = q; s = 1; } if (ta > t0) { t0 = ta; nAxis = 2; nSign = s; } if (tb < t1) t1 = tb; if (t0 > t1) continue; }
    if (t0 > 0 && t0 < best && nAxis >= 0) { best = t0; bn = [nAxis, nSign]; bb = b; }
  }
  // ground plane
  if (d.y < 0) { const tg = -o.y / d.y; if (tg > 0 && tg < best) { best = tg; bn = [1, 1]; bb = null; } }
  if (!bn) return null;
  _n.set(0, 0, 0); _n.setComponent(bn[0], bn[1]);
  return { t: best, n: _n.clone(), box: bb };
}
function losClear(a, b) {
  if (typeof aiLos === 'function') return aiLos(a, b);
  const d = new T.Vector3().subVectors(b, a); const L = d.length(); d.divideScalar(L);
  const h = rayBoxes(a, d, L); if (h && h.t < L - 0.3) return false;
  if (typeof rayCar === 'function') { const c = rayCar(a, d, L - 0.3); if (c && !(P.inCar && c.car === P.inCar)) return false; }
  return true;
}
// ray vs capsule/sphere
function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z; const cc = ox * ox + oy * oy + oz * oz - r * r; const h = b * b - cc;
  if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 ? t : -1;
}
function rayVCapsule(o, d, x, z, y0, y1, r) {
  // vertical capsule: check infinite cylinder then clamp to caps via spheres
  const ox = o.x - x, oz = o.z - z; const a = d.x * d.x + d.z * d.z;
  if (a > 1e-9) {
    const b = ox * d.x + oz * d.z, c = ox * ox + oz * oz - r * r; const h = b * b - a * c;
    if (h >= 0) { const t = (-b - Math.sqrt(h)) / a; if (t > 0) { const y = o.y + d.y * t; if (y >= y0 && y <= y1) return t; } }
  }
  const t0 = raySphere(o, d, { x, y: y0, z }, r), t1 = raySphere(o, d, { x, y: y1, z }, r);
  if (t0 > 0 && t1 > 0) return Math.min(t0, t1); return Math.max(t0, t1);
}
