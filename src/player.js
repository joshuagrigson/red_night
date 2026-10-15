/* =====================================================================
   RED NIGHT — player: movement, first/third person, weapons, viewmodel, driving
   ===================================================================== */
const P = {
  pos: new T.Vector3(), vel: new T.Vector3(), yaw: 0, pitch: 0, onGround: true, crouch: 0, crouching: false, slide: 0, sprint: false, tac: false,
  hp: 150, maxHp: 150, regenT: 0, dead: false, deadT: 0, ads: 0, adsHeld: false, cur: 0, slots: [null, null, null], fireCd: 0,
  reloadT: 0, reloadDur: 0, shellMode: false, cycleT: 0, switchT: 0, meleeT: 0, meleeDur: 0, meleeHitDone: false, quick: false, combo: 0,
  inCar: null, possT: 0, possMash: 0, hexT: 0, acidT: 0, punch: new T.Vector2(), shakeA: 0, bodyYaw: 0, steady: 4, inspectT: 0, landDip: 0,
  score: 0, kills: 0, heads: 0, longest: 0, exorcisms: 0, lastFire: 0, sawRev: 0, eyeH: 1.66, recoilBuf: new T.Vector2(),
  // feel: stride phase (a footfall at every multiple of pi) + its weight, landing spring, scoped sway, look rate for the gun's inertia
  strideA: 0, strideK: 0, stepT: -99, walking: false, landV: 0, swayAmp: 0, swayOx: 0, swayOy: 0, steadyK: 1, lookVX: 0, lookVY: 0, fireQ: 0,
  eye() { return new T.Vector3(this.pos.x, this.pos.y + this.eyeH, this.pos.z); },
  fwd() { const cp = Math.cos(this.pitch); return new T.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp); },
  eyeInto(v) { return v.set(this.pos.x, this.pos.y + this.eyeH, this.pos.z); },
  fwdInto(v) { const cp = Math.cos(this.pitch); return v.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp); },
  w() { const s = this.slots[this.cur]; return s ? s.w : null; },
  s() { return this.slots[this.cur]; },
};
G.load = store('load') || { s1: 'patriot15', s2: 'preacher', melee: 'katana' };
G.cfgs = store('cfgs') || {};
G.char = store('char') || { gender: 'm', skin: 1, hair: 'short', hairCol: 0, outfit: 'samurai' };
function cfgOf(id) { if (!G.cfgs[id]) G.cfgs[id] = defaultCfg(W[id]); return G.cfgs[id]; }
function saveLoad() { store('load', G.load); store('cfgs', G.cfgs); }

/* ---------------- input ---------------- */
const KEY = {}; const PRESS = new Set();
const INP = { mx: 0, my: 0, lookX: 0, lookY: 0, fire: false, joyMag: 0, joyRaw: 0, brake: false };
function press(k) { PRESS.add(k); }
function took(k) { if (PRESS.has(k)) { PRESS.delete(k); return true; } return false; }
let lastShift = 0;
window.addEventListener('keydown', e => {
  if (e.repeat) { if (e.code === 'Tab') e.preventDefault(); return; }
  KEY[e.code] = true;
  const map = { Space: 'jump', KeyC: 'crouch', ControlLeft: 'crouch', KeyR: 'reload', KeyF: 'melee', KeyQ: 'swap', KeyV: 'cam', KeyX: 'shoulder', KeyE: 'act', KeyI: 'inspect', Digit1: 's1', Digit2: 's2', Digit3: 's3', Escape: 'pause', Tab: 'pause', KeyP: 'pause' };
  if (map[e.code]) { press(map[e.code]); if (e.code === 'Tab' || e.code === 'Space') e.preventDefault(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { const n = performance.now(); if (n - lastShift < 300) P.tacReq = true; lastShift = n; P.sprintPressT = G.t; }
});
window.addEventListener('keyup', e => { KEY[e.code] = false; if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') P.tacReq = false; });
let mouseDown = false, rmb = false;
// keys, buttons and touches let go while the window is in the background never send their up event: drop them all
function releaseInputs() { for (const k in KEY) KEY[k] = false; mouseDown = rmb = false; INP.fire = INP.brake = false; P.tacReq = false; touchReset(); }
window.addEventListener('blur', releaseInputs); window.addEventListener('pagehide', releaseInputs);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseInputs(); });
// the click that captures the mouse only captures it (it also fired a round); two refused locks in a row (a sandboxed
// frame) and clicks fire without it, looking by drag
const PL = { fails: 0 };
canvas.addEventListener('mousedown', e => {
  if (IS_TOUCH) return;
  if (G.state === 'city' || G.state === 'apt') {
    const locked = document.pointerLockElement === canvas;
    if (!locked && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { PL.fails++; }); } catch (er) { PL.fails++; } }
    const arm = locked || PL.fails >= 2 || !canvas.requestPointerLock;
    if (e.button === 0) { if (arm) mouseDown = true; if (G.state === 'apt') press('click'); }
    if (e.button === 2) { rmb = true; }
  }
});
document.addEventListener('pointerlockerror', () => { PL.fails++; });
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement === canvas) PL.fails = 0; });
window.addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; if (e.button === 2) rmb = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('mousemove', e => {
  if (IS_TOUCH) return;
  if (document.pointerLockElement === canvas || mouseDown || rmb) { INP.lookX += e.movementX || 0; INP.lookY += e.movementY || 0; }
});

// touch: floating joystick on the left, look anywhere on the right, buttons. Each touch is tracked by its identifier and
// every touch event is checked against the live touch list, so a lost touchend (a notification, an app switch, the layer
// hidden mid-press) can't leave FIRE held, a button lit or the stick dead.
const TOUCH = { joy: null, look: null, fireIds: new Set(), bt: new Map(), sprint: false, sprintT: 0, st: '', lbl: '', actT: -1e9 };
const JOY_R = 56, JOY_DZ = .14;
// Look speed (Settings, touch only; mouse sensitivity is separate), button size and the optional left FIRE
G.lookSpd = (() => { const v = store('ls'); return typeof v === 'number' ? clamp(v, .5, 2) : 1; })();
G.btnSize = ['s', 'm', 'l'].includes(store('bsz')) ? store('bsz') : 'm';
G.leftFire = store('lf') === 1;
function setLookSpd(v) { G.lookSpd = clamp(v, .5, 2); store('ls', G.lookSpd); }
function setBtnSize(v) { G.btnSize = v === 's' || v === 'l' ? v : 'm'; store('bsz', G.btnSize); touchPrefs(); }
function setLeftFire(on) { G.leftFire = !!on; store('lf', on ? 1 : 0); touchPrefs(); }
function touchPrefs() { const b = document.body; b.style.setProperty('--bs', G.btnSize === 's' ? .9 : G.btnSize === 'l' ? 1.12 : 1); b.classList.toggle('lfire', G.leftFire); }
// Touch look. 1.0 turns 180 degrees per 280 px of drag at an ordinary swipe; a slow, careful drag runs a little finer
// and a fast flick up to 1.5x further. The gain follows the finger's own speed (px/s on the event clock, smoothed over
// ~45 ms), so it is the same at 30 or 120 fps, and a steady drag maps linearly. Vertical runs at 3/4.
// LOOK_SLOP: how far a thumb on a button that acts on press slides before it steers. TAP_SLOP: the same for the two that act
// on release (the weapon panel, ACT), which also counts as their tap tolerance, as roomy as a tap on open screen
const LOOK_K = Math.PI / 280, LOOK_KY = .75, LOOK_SLOP = 6, TAP_SLOP = 14;
function lookGain(v) { return v < 600 ? lerp(.86, 1, smooth01((v - 120) / 480)) : 1 + .5 * smooth01((v - 900) / 1700); }
function touchTs(e) { const t = e.timeStamp; return t > 0 && isFinite(t) ? t : performance.now(); }
// kx, ky: px added to (or held back from) this move's travel; the speed is the finger's own
function lookMove(o, x, y, ts, kx, ky) {
  const dx = x - o.x, dy = y - o.y, dt = ts > o.ts ? clamp((ts - o.ts) / 1000, .004, .1) : .016, vi = Math.hypot(dx, dy) / dt; o.x = x; o.y = y; o.ts = ts;
  o.v = o.v < 0 ? vi : o.v + (vi - o.v) * (1 - Math.exp(-dt / .045)); // the first move seeds it: a flick starts at speed
  const g = lookGain(o.v); INP.lookX += (dx + (kx || 0)) * g; INP.lookY += (dy + (ky || 0)) * g * LOOK_KY;
}
// a finger that starts on a button steers once it has slid past its slop (a press with a wobble stays a press). The move
// that crosses it steers from the press point less the slop, and the slop is paid back over the next few px of slide, so a
// flick from FIRE turns as far as one from open space and a slow slide starts without a jump
function btnLook(b, t, ts) {
  const x = t.clientX, y = t.clientY, dx = x - b.x, dy = y - b.y, L = Math.hypot(dx, dy); let k = 0;
  if (!b.live) { if (L < b.slop) return; b.live = true; b.owe = b.slop; k = -b.slop; } // b.x, b.y are still the press point here
  if (b.owe > 0) { const p = Math.min(b.owe, (L + k) * .5); b.owe -= p; k += p; }
  lookMove(b, x, y, ts, L > 0 ? dx / L * k : 0, L > 0 ? dy / L * k : 0);
}
function touchLive(e, id) { const l = e.touches; for (let i = 0; i < l.length; i++) if (l[i].identifier === id) return true; return false; }
function joyEnd() { TOUCH.joy = null; INP.mx = INP.my = INP.joyMag = INP.joyRaw = 0; const j = $('joy'); if (j) j.style.opacity = 0; }
function btnUp(id, b, lost) {
  TOUCH.bt.delete(id); if (b.up) b.up(id, b, lost);
  for (const v of TOUCH.bt.values()) if (v.el === b.el) return; // another finger still holds it
  if (b.el.id !== 'bAds') b.el.classList.remove('on');
}
function touchSync(e) {
  if (TOUCH.joy && !touchLive(e, TOUCH.joy.id)) joyEnd();
  if (TOUCH.look && !touchLive(e, TOUCH.look.id)) TOUCH.look = null;
  for (const [id, b] of TOUCH.bt) if (!touchLive(e, id)) btnUp(id, b, true);
}
function touchReset() {
  if (TOUCH.joy) joyEnd(); TOUCH.look = null;
  for (const [id, b] of TOUCH.bt) btnUp(id, b, true);
  TOUCH.fireIds.clear(); INP.fire = INP.brake = false; TOUCH.sprint = false; TOUCH.sprintT = 0;
}
function setupTouch() {
  const joyEl = $('joy'), knob = $('knob');
  touchPrefs();
  // look: how far (px) the thumb slides before the button steers the view; 0 and it never does
  const btn = (id, down, up, look) => {
    const el = $(id); if (!el) return;
    el.addEventListener('touchstart', e => {
      e.preventDefault(); e.stopPropagation(); touchSync(e); const ts = touchTs(e);
      for (const t of e.changedTouches) { const b = { el, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, ts, ts0: ts, te: ts, v: -1, live: false, up, slop: look || 0, owe: 0, t0: performance.now() }; TOUCH.bt.set(t.identifier, b); if (down) down(t.identifier, b); }
      if (id !== 'bAds') el.classList.add('on');
    }, { passive: false });
    // every action button steers the view once the thumb slides (press RELOAD and keep aiming, as in mobile CoD)
    el.addEventListener('touchmove', e => { e.preventDefault(); e.stopPropagation(); const ts = touchTs(e); for (const t of e.changedTouches) { const b = TOUCH.bt.get(t.identifier); if (b && b.slop) btnLook(b, t, ts); } }, { passive: false });
    // ts0 / te: the press and the release on the event clock, so a hitch between the two handlers can't turn a tap into a hold
    const end = e => { e.preventDefault(); e.stopPropagation(); const lost = e.type === 'touchcancel', te = touchTs(e); for (const t of e.changedTouches) { const b = TOUCH.bt.get(t.identifier); if (b) { b.te = te; btnUp(t.identifier, b, lost); } } touchSync(e); };
    el.addEventListener('touchend', end, { passive: false }); el.addEventListener('touchcancel', end, { passive: false });
  };
  const fireDown = id => { TOUCH.fireIds.add(id); INP.fire = true; AU.init(); }, fireUp = id => { TOUCH.fireIds.delete(id); INP.fire = TOUCH.fireIds.size > 0; };
  btn('bFire', fireDown, fireUp, LOOK_SLOP); btn('bFire2', fireDown, fireUp, LOOK_SLOP);
  btn('bAds', () => { P.adsHeld = !P.adsHeld; $('bAds').classList.toggle('on', P.adsHeld); }, null, LOOK_SLOP);
  // JUMP is the handbrake in a car, held for as long as the thumb stays on it
  btn('bJump', () => { if (P.inCar) INP.brake = true; else press('jump'); }, () => { INP.brake = false; }, LOOK_SLOP);
  btn('bCrouch', () => press('crouch'), null, LOOK_SLOP); btn('bReload', () => press('reload'), null, LOOK_SLOP); btn('bMelee', () => press('melee'), null, LOOK_SLOP);
  btn('bPause', () => press('pause'));
  // ACT and the weapon panel act on release, and only if the thumb never slid off into a look, so a look that lands on
  // DRIVE turns instead of getting in. ACT also ignores a press that began within .3 s of its label appearing or changing
  // (setPrompt), so a double tap on EXIT CAR doesn't get straight back in
  btn('bAct', null, (id, b, lost) => { if (!lost && !b.live && b.t0 - TOUCH.actT >= 300) press('act'); }, TAP_SLOP);
  // the weapon panel (top right) is the swap: tap for the other gun, hold for the blade
  btn('hBR', null, (id, b, lost) => { if (!lost && !b.live) press(b.te - b.ts0 > 450 ? 's3' : 'swap'); }, TAP_SLOP);
  $('hBR').setAttribute('role', 'button'); $('hBR').setAttribute('aria-label', 'Swap weapon (hold for the blade)');
  const surface = document.body;
  // in play the touches this claims are consumed: Chromium (Android) otherwise holds back every move inside its 15 px slop,
  // and a tap can't become a ghost click on a menu it opens. Menus, the buttons and the rotate hint keep their own
  surface.addEventListener('touchstart', e => {
    touchSync(e);
    if (!(G.state === 'city' || G.state === 'apt')) return;
    let claimed = false;
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('.menu,.tb,[role=button]')) continue;
      if (t.clientX < window.innerWidth * .42 && !TOUCH.joy) { TOUCH.joy = { id: t.identifier, x: t.clientX, y: t.clientY }; joyEl.style.left = t.clientX + 'px'; joyEl.style.top = t.clientY + 'px'; joyEl.style.opacity = 1; knob.style.transform = 'translate(0,0)'; claimed = true; }
      else if (!TOUCH.look) { TOUCH.look = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, ts: touchTs(e), v: -1, t0: performance.now() }; claimed = true; }
    }
    if (claimed && e.cancelable) e.preventDefault();
  }, { passive: false });
  surface.addEventListener('touchmove', e => {
    const ts = touchTs(e);
    for (const t of e.changedTouches) {
      const J = TOUCH.joy;
      if (J && t.identifier === J.id) {
        let dx = t.clientX - J.x, dy = t.clientY - J.y, L = Math.hypot(dx, dy); const F = JOY_R * 1.6;
        if (L > F) { const k = (L - F) / L; J.x += dx * k; J.y += dy * k; dx = t.clientX - J.x; dy = t.clientY - J.y; L = F; joyEl.style.left = J.x + 'px'; joyEl.style.top = J.y + 'px'; } // the base trails a thumb that wanders far past the rim
        const m = L / JOY_R, mm = clamp((m - JOY_DZ) / (1 - JOY_DZ), 0, 1), ux = L > 0 ? dx / L : 0, uy = L > 0 ? dy / L : 0; // dead zone, rescaled so the stick still reaches full speed
        INP.mx = ux * mm; INP.my = -uy * mm; INP.joyMag = mm; INP.joyRaw = m;
        const kr = Math.min(L, JOY_R); knob.style.transform = `translate(${ux * kr}px,${uy * kr}px)`;
      } else if (TOUCH.look && t.identifier === TOUCH.look.id) lookMove(TOUCH.look, t.clientX, t.clientY, ts);
    }
    if (G.state === 'city' || G.state === 'apt') e.preventDefault();
  }, { passive: false });
  const endT = e => {
    for (const t of e.changedTouches) {
      if (TOUCH.joy && t.identifier === TOUCH.joy.id) joyEnd();
      if (TOUCH.look && t.identifier === TOUCH.look.id) {
        const moved = Math.hypot(t.clientX - TOUCH.look.sx, t.clientY - TOUCH.look.sy); if (e.type === 'touchend' && moved < 12 && performance.now() - TOUCH.look.t0 < 280) tapAt(t.clientX, t.clientY);
        TOUCH.look = null;
      }
    }
    touchSync(e);
  };
  surface.addEventListener('touchend', endT); surface.addEventListener('touchcancel', endT);
  // at the wheel the cluster is just BRAKE where FIRE was (body.drive). Checked every frame in every state, so dying in a
  // car or restarting from one never leaves the apartment with only BRAKE showing
  UPD.push(() => { const lb = P.inCar ? 'BRAKE' : 'JUMP'; if (TOUCH.lbl !== lb) { TOUCH.lbl = lb; $('bJump').textContent = lb; document.body.classList.toggle('drive', !!P.inCar); } });
  // leaving play (pause, gunsmith, photo, the end screen) lets go of everything the hidden layer was holding
  UPD.push(() => { if (TOUCH.st === G.state) return; const was = TOUCH.st; TOUCH.st = G.state; if ((was === 'city' || was === 'apt') && G.state !== 'city' && G.state !== 'apt' && G.state !== 'transit') touchReset(); });
}
// tap on the weapons wall (mobile) or click while looking at it
const _ray = new T.Raycaster();
function tapAt(x, y) {
  if (G.state !== 'apt') return;
  _ray.setFromCamera({ x: x / window.innerWidth * 2 - 1, y: -(y / window.innerHeight) * 2 + 1 }, camera);
  const hits = _ray.intersectObjects(WALL_SLOTS.map(s => s.hit));
  if (hits.length && hits[0].distance < 7) openSmith(hits[0].object.userData.cls);
}

/* ---------------- loadout / equip ---------------- */
function makeSlot(id) { const w = W[id]; const cfg = cfgOf(id); const st = statsOf(w, cfg); return { id, w, cfg, st, mag: w.mag || 0, res: w.res || 0 }; }
function equipLoadout(keepAmmo) {
  const old = P.slots.slice();
  P.slots = [makeSlot(G.load.s1), makeSlot(G.load.s2), makeSlot(G.load.melee)];
  if (keepAmmo) P.slots.forEach((s, i) => { if (old[i] && old[i].id === s.id) { s.mag = Math.min(s.mag, old[i].mag); s.res = old[i].res; } });
  setWeapon(P.cur, true);
}
function setWeapon(i, instant) {
  if (!P.slots[i]) return;
  if (i === P.cur && !instant && VM.gun) return; // re-selecting the gun in hand used to cancel its reload and rebuild it
  P.cur = i; P.reloadT = 0; P.cycleT = 0; P.meleeT = 0; P.switchT = instant ? 0 : .38; P.shellMode = false; P.rStages = null; P.inspectT = 0; P.fireQ = 0;
  if (!instant) P.ads = 0;
  buildVM(); buildTPPWeapon(); drawReticleHUD(); updateHUDWeapon();
}
// built guns are cached per weapon + attachments + which meshes had streamed in: every swap used to build (and leak)
// a fresh viewmodel and world gun, ~3 geometries and 2 textures a time
function wKey(s) { const w = s.w, ok = id => MODELS[id] && MODELS[id].scene ? 1 : 0; return w.id + '|' + JSON.stringify(s.cfg) + '|' + ok(w.id) + (w.dual ? ok('slasher') : ''); }
const VMC = new Map();

/* ---------------- viewmodel ---------------- */
const VM = { root: new T.Group(), holder: new T.Group(), gun: null, gun2: null, sw: { x: 0, y: 0, vx: 0, vy: 0 }, kick: { z: 0, rx: 0, ry: 0, rz: 0 }, flash: null, flashT: 0, arms: null };
vmScene.add(VM.root); VM.root.add(VM.holder);
const limbGeo = new T.CylinderGeometry(.04, .05, 1, 10);
function buildArms() {
  if (VM.arms) { VM.root.remove(VM.arms.g); VM.arms.g.traverse(o => { if (o.isMesh) { if (o.geometry !== limbGeo) o.geometry.dispose(); o.material.dispose(); } }); } // a new set every night
  const o = OUTFITS[G.char.outfit]; const g = new T.Group(); VM.root.add(g);
  const sleeve = new T.MeshStandardMaterial({ color: lc(o.top), roughness: .55, metalness: .2 });
  const glove = new T.MeshStandardMaterial({ color: lc(0x121216), roughness: .45, metalness: .3 });
  const skin = new T.MeshStandardMaterial({ color: lc(SKINS[G.char.skin]), roughness: .55 });
  const accent = new T.MeshBasicMaterial({ color: lc(o.accent), toneMapped: false });
  const mk = () => { const f = new T.Mesh(limbGeo, sleeve); const cuff = new T.Mesh(new T.CylinderGeometry(.043, .043, .025, 10), accent); const wrist = new T.Mesh(new T.CylinderGeometry(.032, .035, .05, 10), skin); const h = new T.Group(); const palm = new T.Mesh(new T.BoxGeometry(.06, .05, .1), glove); palm.position.set(0, -.012, .0); h.add(palm); const fing = new T.Mesh(new T.BoxGeometry(.058, .03, .05), glove); fing.position.set(0, -.04, -.03); fing.rotation.x = .6; h.add(fing); const thumb = new T.Mesh(new T.BoxGeometry(.02, .02, .05), glove); thumb.position.set(-.035, .0, -.03); h.add(thumb); g.add(f, cuff, wrist, h); return { f, cuff, wrist, h }; };
  VM.arms = { g, R: mk(), L: mk() };
}
const _Y = new T.Vector3(0, 1, 0), _paD = new T.Vector3(), _paW = new T.Vector3();
function placeArm(A, hand, elbow, show) {
  A.f.visible = A.cuff.visible = A.wrist.visible = A.h.visible = show;
  if (!show) return;
  const d = _paD.copy(elbow).sub(hand); const L = d.length(); d.normalize();
  const wr = _paW.copy(hand).addScaledVector(d, .06);
  A.f.position.copy(wr).addScaledVector(d, L / 2); A.f.scale.set(1, L, 1); A.f.quaternion.setFromUnitVectors(_Y, d);
  A.cuff.position.copy(wr).addScaledVector(d, .05); A.cuff.quaternion.copy(A.f.quaternion);
  A.wrist.position.copy(hand).addScaledVector(d, .03); A.wrist.quaternion.copy(A.f.quaternion);
  A.h.position.copy(hand);
}
function buildVM() {
  if (VM.gun) VM.holder.remove(VM.gun.g); if (VM.gun2) VM.holder.remove(VM.gun2.g);
  const s = P.s(), k = wKey(s); let e = VMC.get(k);
  if (e) VMC.delete(k); // re-inserted below: the map stays in least-recently-used order
  else { e = { gun: buildWeapon(s.w, s.cfg), gun2: null }; if (s.w.dual) { const oh = W[s.w.offhand]; e.gun2 = buildWeapon(oh || W.slasher, s.cfg); if (!oh) e.gun2.g.scale.setScalar(.75); } /* the karambit's off-hand is the new dagger */ }
  VMC.set(k, e); if (VMC.size > 8) VMC.delete(VMC.keys().next().value);
  VM.gun = e.gun; VM.gun2 = e.gun2; VM.holder.add(VM.gun.g); if (VM.gun2) VM.holder.add(VM.gun2.g);
  if (!VM.flash) { VM.flash = new T.Sprite(new T.SpriteMaterial({ map: flashTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); VM.flash.visible = false; vmScene.add(VM.flash); }
  if (!VM.arms) buildArms();
  P.starGeo = s.w.model === 'stars' ? VM.gun.meta.starGeo : P.starGeo;
}
// rest poses, shared (never mutated)
const VPOSE = {
  melee: { p: new T.Vector3(.27, -.3, -.46), r: new T.Euler(.78, .38, -.28) }, saw: { p: new T.Vector3(.16, -.3, -.42), r: new T.Euler(.25, .05, -.05) },
  throw: { p: new T.Vector3(.2, -.2, -.34), r: new T.Euler(.4, -.2, -.2) }, pistol: { p: new T.Vector3(.12, -.115, -.3), r: new T.Euler(0, .04, 0) },
  gun: { p: new T.Vector3(.14, -.135, -.32), r: new T.Euler(0, .025, 0) },
};
function vmPose(w) { const k = w.kind; return k === 'melee' ? VPOSE.melee : k === 'saw' ? VPOSE.saw : k === 'throw' ? VPOSE.throw : w.cls === 'pistol' || w.model === 'blaster' ? VPOSE.pistol : VPOSE.gun; }
const tmpV = new T.Vector3(), tmpV2 = new T.Vector3();
const _vp = new T.Vector3(), _vr = new T.Vector3(), _va = new T.Vector3(), _hR = new T.Vector3(), _hL = new T.Vector3(), _hE = new T.Vector3(), _hG = new T.Vector3();
const SUP0 = new T.Vector3(0, 0, -.3), GRIP0 = new T.Vector3(0, -.04, .07), DUAL_H = new T.Vector3(0, 0, .04), SAW_H = new T.Vector3(0, .1, -.02);
function updateVM(dt) {
  const s = P.s(); if (!s || !VM.gun) return;
  const w = s.w, base = vmPose(w), gun = VM.gun, K = VM.kick, S = VM.sw;
  const hidden = (G.camMode === 'tpp' && G.state === 'city') || P.inCar || (P.ads > .92 && s.st.overlay && w.kind === 'gun');
  VM.root.visible = !hidden;
  // recoil kick (spring back)
  K.z = damp(K.z, 0, 14, dt); K.rx = damp(K.rx, 0, 12, dt); K.ry = damp(K.ry, 0, 12, dt); K.rz = damp(K.rz, 0, 12, dt);
  // look inertia: a spring chasing the turn rate, so the gun trails a flick and settles with a touch of overshoot
  const tx = clamp((P.lookVX || 0) * .0065, -.04, .04), ty = clamp(-(P.lookVY || 0) * .0065, -.04, .04);
  S.vx += ((tx - S.x) * 90 - S.vx * 13) * dt; S.x += S.vx * dt; S.vy += ((ty - S.y) * 90 - S.vy * 13) * dt; S.y += S.vy * dt;
  if (hidden) { VM.flashT = Math.max(0, VM.flashT - dt); if (VM.flash) VM.flash.visible = false; vmFlash.intensity = 0; return; } // third person, driving, scoped: nothing to pose
  const pos = _vp.copy(base.p), rot = _vr.set(base.r.x, base.r.y, base.r.z);
  // ADS
  if (w.kind === 'gun' || w.kind === 'plasma') {
    const adsZ = gun.meta.glb && !s.st.overlay ? -.3 : s.st.overlay ? -.16 : (gun.meta.irons || s.cfg.optic === 'iron') ? (w.cls === 'pistol' ? -.3 : -.24) : (w.cls === 'pistol' ? -.3 : -.22);
    pos.lerp(_va.set(-gun.sightX, -gun.sightY, adsZ), P.ads); rot.multiplyScalar(1 - P.ads);
  }
  // sprint & tac sprint
  const sp = P.sprintK || 0;
  if (sp > 0 && w.kind !== 'melee') {
    if (P.tac) { pos.x -= .02 * sp; pos.y += .07 * sp; pos.z += .03 * sp; rot.x += 1.0 * sp; rot.z -= .5 * sp; rot.y -= .2 * sp; }
    else { pos.x -= .06 * sp; pos.y -= .05 * sp; pos.z += .05 * sp; rot.y += .75 * sp; rot.x -= .25 * sp; rot.z += .3 * sp; }
  }
  if (w.kind === 'melee' && sp > 0) { rot.x += .3 * sp; pos.y -= .03 * sp; }
  // bob rides the stride (lowest at each footfall, swinging over the planted foot), then breathing, look inertia, a strafe lean
  const ba = P.strideK * (1 - P.ads * .85) * (sp > 0 ? 1.8 : 1), sa = Math.sin(P.strideA), br = 1 - P.ads * .9;
  pos.x += sa * .011 * ba; pos.y -= Math.abs(Math.cos(P.strideA)) * .013 * ba; rot.z += sa * .02 * ba;
  pos.y += Math.sin(G.t * 1.6) * .002 * br; pos.x += Math.sin(G.t * .8) * .0012 * br;
  const sw = 1 - P.ads * .7; pos.x += S.x * sw; pos.y += S.y * sw; rot.y -= S.x * 1.6 * sw; rot.x += S.y * 1.6 * sw; rot.z += S.x * 1.2 * sw;
  const lv = clamp(P.vel.x * Math.cos(P.yaw) - P.vel.z * Math.sin(P.yaw), -8, 8) * (1 - P.ads * .8); pos.x -= lv * .0012; rot.z -= lv * .004;
  pos.y -= P.landDip * .06; pos.y -= P.slide > 0 ? .02 : 0; if (P.slide > 0) rot.z += .25;
  pos.z += K.z; rot.x += K.rx; rot.y += K.ry; rot.z += K.rz;
  // switching
  if (P.switchT > 0) { const k = P.switchT / .38; pos.y -= k * .3; rot.x -= k * .7; }
  // inspect
  if (P.inspectT > 0) { const k = Math.sin(clamp(1 - P.inspectT / 2.4, 0, 1) * Math.PI); rot.y += k * 1.3; rot.z += k * .5; pos.x -= k * .08; pos.z += k * .05; pos.y += k * .03; }
  // reload choreography
  let leftT = null;
  const sup = gun.meta.sup || SUP0;
  if (P.reloadT > 0 && !P.shellMode && P.reloadEl !== undefined && P.rStages) {
    // CoD-style staged reload: tilt in → mag out → fetch → seat (kick) → [empty: slide / charging handle] → back on target
    const D = P.reloadDur, k = clamp(P.reloadEl / D, 0, 1), seat = P.reloadSeat / D, outK = P.rStages[0].t / D, fam = P.reloadFam, empty = P.reloadEmpty;
    const endK = empty && fam !== 'rev' ? .93 : .9;
    const tilt = k < .12 ? k / .12 : k > endK ? (1 - k) / (1 - endK) : 1; const ti = tilt * tilt * (3 - 2 * tilt);
    const roll = fam === 'rev' ? .85 : fam === 'pistol' ? .45 : .55;
    rot.z += ti * roll; rot.x += ti * (fam === 'pistol' ? .3 : .16); pos.y += ti * .025; pos.x -= ti * .04; pos.z += ti * .02;
    const mg = gun.magG, home = gun.magHome;
    if (k < outK) { leftT = tmpV.lerpVectors(sup, tmpV2.set(0, -.12 + home.y, -.06), clamp(k / outK, 0, 1)); mg.position.copy(home); mg.visible = true; }
    else if (k < outK + .1) { const a = (k - outK) / .1; mg.visible = true; mg.position.y = home.y - a * (empty ? .5 : .3); leftT = empty ? tmpV.set(-.03, -.3, .02) : tmpV.set(0, -.12 + mg.position.y, -.06); }
    else if (k < seat - .13) { mg.visible = false; leftT = tmpV.set(-.07, -.46, .08); }
    else if (k < seat) { const a = (k - (seat - .13)) / .13; const e = 1 - Math.pow(1 - a, 2); mg.visible = true; mg.position.y = home.y - (1 - e) * .26; leftT = tmpV.set(0, -.12 + mg.position.y, -.06); }
    else if (empty && fam !== 'rev') {
      mg.position.copy(home); mg.visible = true;
      const a = clamp((k - seat) / (endK - seat), 0, 1); const pull = a > .35 && a < .75 ? Math.sin((a - .35) / .4 * Math.PI) : 0;
      if (fam === 'pistol') { leftT = tmpV.set(.0, .05, .02 + pull * .05); gun.boltG.position.z = pull * .05; rot.x -= pull * .08; }
      else if (fam === 'ak') { leftT = tmpV.set(.07, .04, -.02 + pull * .08); gun.boltG.position.z = pull * .08; rot.z += pull * .12; }
      else if (fam === 'hk') { leftT = tmpV.set(-.02, .05, -.32 + pull * .06); rot.x -= pull * .1; }
      else if (fam === 'bolt') { leftT = sup; gun.boltG.position.z = pull * .08; gun.boltG.rotation.z = -pull * .8; }
      else { leftT = tmpV.set(.0, .06, .14 + pull * .07); gun.boltG.position.z = pull * .06; rot.x += pull * .06; } // AR: charging handle behind the optic
      if (a > .8) leftT = tmpV.lerpVectors(leftT, sup, (a - .8) / .2);
    } else { mg.position.copy(home); mg.visible = true; leftT = tmpV.lerpVectors(tmpV2.set(0, -.12 + home.y, -.06), sup, clamp((k - seat) / Math.max(.05, endK - seat), 0, 1)); }
    if (P.seatKick > 0) { pos.y += P.seatKick * .12; rot.x += P.seatKick * .5; P.seatKick = Math.max(0, P.seatKick - dt * .9); }
  } else if (P.reloadT > 0 && P.shellMode) {
    // shell-fed: roll the gun, thumb shells into the tube one by one (break-actions open and drop two)
    const ph = P.shellPh, sh = SHELLS[s.w.id] || [.4, s.w.reload, .3, 0];
    const rk = ph === 'raise' ? clamp(P.shellT / sh[0], 0, 1) : ph === 'lower' ? 1 - clamp(P.shellT / sh[2], 0, 1) : 1; const re = rk * rk * (3 - 2 * rk);
    if (P.shellBreak) { rot.x -= re * .55; pos.y -= re * .04; rot.z += re * .15; }
    else { rot.z += re * (ph === 'chamber' ? .9 : .55); rot.x += re * .12; pos.x -= re * .03; }
    const per = ph === 'load' ? clamp(P.shellT / sh[1], 0, 1) : ph === 'chamber' ? clamp(P.shellT / sh[3], 0, 1) : 0; const push = Math.sin(per * Math.PI);
    leftT = ph === 'raise' || ph === 'lower' ? tmpV.lerpVectors(sup, tmpV2.set(0, -.14, -.05), re) : tmpV.set(ph === 'chamber' ? .06 : 0, -.12 - (1 - push) * .1, -.05 + push * .05);
  } else if (P.reloadT > 0) { // chainsaw refuel / legacy timer
    const k = 1 - P.reloadT / P.reloadDur; const tilt = Math.sin(clamp(k, 0, 1) * Math.PI); rot.z += tilt * .5; rot.x += tilt * .18; leftT = sup;
  } else { gun.magG.position.copy(gun.magHome); gun.magG.visible = true; }
  // pump / bolt cycle
  if (P.cycleT > 0) {
    const k = 1 - P.cycleT / P.cycleDur;
    if (w.action === 'pump') { gun.pumpG.position.z = Math.sin(k * Math.PI) * .09; leftT = tmpV.copy(sup); leftT.z += gun.pumpG.position.z; }
    if (w.action === 'bolt') { const b = Math.sin(k * Math.PI); gun.boltG.position.z = b * .08; gun.boltG.rotation.z = -b * .8; rot.z += b * .25; }
  } else { gun.pumpG.position.z = damp(gun.pumpG.position.z, 0, 20, dt); if (P.reloadT <= 0) gun.boltG.position.z = 0, gun.boltG.rotation.z = 0; }
  // melee choreography
  let swingK = -1;
  if (P.meleeT > 0) {
    const k = 1 - P.meleeT / P.meleeDur; swingK = k;
    if (P.quick) { const b = Math.sin(k * Math.PI); pos.x -= .12 * b; pos.y += .06 * b; pos.z -= .18 * b; rot.y -= b * .9; rot.z += b * .6; }
    else if (w.model === 'knife' || w.dual) {
      const alt = P.combo % 2;
      if (w.dual && alt) { /* left-hand stroke */ }
      else { const b = k < .3 ? -k / .3 * .1 : k < .55 ? -.1 + (k - .3) / .25 * .55 : .45 * (1 - (k - .55) / .45); pos.z -= b * .5; pos.x -= b * .25; rot.x -= b * 1.3; rot.y += b * .9; rot.z += b * 1.2; }
    } else if (w.kind === 'melee') {
      let ex, ey, ez, px, py, pz, a = 1;
      if (k < .25) { a = k / .25; ex = 1.9; ey = -.6; ez = -1.1; px = .38; py = -.02; pz = -.32; }
      else if (k < .55) { const q = (k - .25) / .3; ex = lerp(1.9, .35, q); ey = lerp(-.6, 1.0, q); ez = lerp(-1.1, 1.45, q); px = lerp(.38, -.3, q); py = lerp(-.02, -.32, q); pz = lerp(-.32, -.52, q); }
      else { const q = 1 - (k - .55) / .45; ex = lerp(base.r.x, .35, q); ey = lerp(base.r.y, 1.0, q); ez = lerp(base.r.z, 1.45, q); px = lerp(base.p.x, -.3, q); py = lerp(base.p.y, -.32, q); pz = lerp(base.p.z, -.52, q); }
      if (P.combo % 2) { ez = -ez * .7; ey = -ey; px = -px * .6; }
      rot.set(lerp(rot.x, ex, a), lerp(rot.y, ey, a), lerp(rot.z, ez, a)); pos.set(lerp(pos.x, px, a), lerp(pos.y, py, a), lerp(pos.z, pz, a));
    } else if (w.kind === 'throw') { const b = Math.sin(k * Math.PI); pos.z -= b * .25; pos.y += b * .08; rot.x -= b * 1.2; }
  }
  if (w.kind === 'saw') { const r = P.sawRev; pos.x += (Math.random() - .5) * .012 * r; pos.y += (Math.random() - .5) * .012 * r; if (gun.meta.chainMat) gun.meta.chainMat.map.offset.x -= dt * (1 + r * 14); }
  if (P.slideCam) rot.z += P.slideCam * .2;
  VM.holder.position.copy(pos); VM.holder.rotation.set(rot.x, rot.y, rot.z, 'XYZ');
  const adsNear = gun.meta.glb && gun.meta.sightZ !== undefined ? clamp(-(-.3 + gun.meta.sightZ) - .05, .04, .45) : .045; const nearW = gun.meta.glb ? lerp(.01, adsNear, Math.pow(P.ads, 4)) : .01; if (Math.abs(vmCam.near - nearW) > .002) { vmCam.near = nearW; vmCam.updateProjectionMatrix(); }
  if (VM.gun2) {
    const alt = P.combo % 2, b = P.meleeT > 0 && alt ? Math.sin(swingK * Math.PI) : 0;
    VM.gun2.g.position.set(-.36 - b * -.2, -.04 + b * .05, .04 - b * .35); VM.gun2.g.rotation.set(-.3 - b * .8, .5 + b * .6, .7 - b * 1.4);
  }
  VM.holder.updateMatrixWorld(true);
  // hands
  const MW = VM.holder.matrixWorld, grip = _hG.copy(gun.meta.grip || GRIP0), handR = _hR.copy(grip).applyMatrix4(MW);
  let handL = null;
  if (VM.gun2) handL = _hL.copy(DUAL_H).applyMatrix4(VM.gun2.g.matrixWorld);
  else if (w.kind === 'melee' && (w.model === 'knife' || w.model === 'karambit')) handL = null;
  else if (w.kind === 'melee') { handL = _hL.copy(grip); handL.z += .11; handL.applyMatrix4(MW); }
  else if (w.kind === 'throw') handL = null;
  else if (w.kind === 'saw') handL = _hL.copy(SAW_H).applyMatrix4(MW);
  else handL = _hL.copy(leftT || sup).applyMatrix4(MW);
  const adsA = P.ads * P.ads; placeArm(VM.arms.R, handR, _hE.set(handR.x + lerp(.14, .34, adsA), handR.y + lerp(-.26, -.46, adsA), handR.z + lerp(.3, .1, adsA)), true);
  VM.arms.R.h.quaternion.copy(VM.holder.quaternion);
  if (handL) { placeArm(VM.arms.L, handL, _hE.set(handL.x + lerp(-.2, -.36, adsA), handL.y + lerp(-.24, -.44, adsA), handL.z + lerp(.3, .08, adsA)), true); VM.arms.L.h.quaternion.copy(VM.holder.quaternion); VM.arms.L.h.rotateZ(.3); }
  else placeArm(VM.arms.L, tmpV2.set(0, 0, 0), tmpV2, false);
  // muzzle flash
  if (VM.flashT > 0) {
    VM.flashT -= dt; VM.flash.visible = true; gun.muzzle.getWorldPosition(VM.flash.position);
    VM.flash.material.rotation = Math.random() * TAU; VM.flash.scale.setScalar(rand(.14, .22) * (w.cls === 'shotgun' || w.cls === 'sniper' ? 1.6 : 1));
  } else VM.flash.visible = false;
  vmFlash.intensity = VM.flashT > 0 ? 3 : 0;
}

/* ---------------- third-person body ---------------- */
let PBODY = null, PGUN = null, PFLASH = null;
function buildPlayerBody() {
  if (PBODY) scene.remove(PBODY.root);
  const o = OUTFITS[G.char.outfit];
  const g = CHARS_READY && makeGLBRig(playerGLBId());
  if (g) { customizeGLB(g, playerCust()); PBODY = g; PBODY.st = { speed: 0, phase: 0, hold: 'rifle', t: 0 }; scene.add(PBODY.root); return; }
  PBODY = makeRig({ gender: G.char.gender, skin: SKINS[G.char.skin], hair: G.char.hair, hairCol: HAIR_COLS[G.char.hairCol], top: o.top, bottom: o.bottom, accent: o.accent, sleeve: 1, visor: o.visor, leather: G.char.outfit === 'nomad' || G.char.outfit === 'samurai', collar: G.char.outfit === 'corpo' });
  PBODY.st = { speed: 0, phase: 0, hold: 'rifle', t: 0 }; scene.add(PBODY.root);
}
// the world gun in the third-person hand, cached per body (it used to leave an empty mount group on the hand bone per swap)
function buildTPPWeapon() {
  if (!PBODY) return;
  if (PGUN && PGUN.mount && PGUN.mount.parent) PGUN.mount.parent.remove(PGUN.mount);
  if (!PFLASH) { PFLASH = new T.Sprite(new T.SpriteMaterial({ map: flashTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); PFLASH.visible = false; scene.add(PFLASH); }
  const s = P.s(), k = wKey(s), C = PBODY.gunC || (PBODY.gunC = new Map()); let e = C.get(k);
  if (!e) {
    const built = buildWeapon(s.w, s.cfg, true), holder = new T.Group(); built.g.rotation.x = -Math.PI / 2; holder.add(built.g);
    if (s.w.kind === 'melee') { built.g.rotation.x = Math.PI / 2 + .3; }
    built.g.position.set(0, PBODY.glb ? -.02 : -.07, PBODY.glb ? .01 : -.02);
    let mount = holder; if (PBODY.glb) mount = attachToBone(PBODY.rArm.hand, holder, 0, 0, Math.PI); else PBODY.rArm.hand.add(holder);
    e = { holder, mount, muzzle: built.muzzle }; C.set(k, e); if (C.size > 6) C.delete(C.keys().next().value);
  } else PBODY.rArm.hand.add(e.mount);
  if (PBODY.glb) PBODY.gunMount = s.w.kind === 'melee' ? null : { g: e.mount, mode: 'tpp' };
  PGUN = { g: e.holder, mount: e.mount, muzzle: e.muzzle, flashT: 0, flash: PFLASH }; PFLASH.visible = false;
}

/* ---------------- shooting ---------------- */
const _adR = new T.Vector3(), _adU = new T.Vector3();
function aimDir(spreadDeg, base, out) {
  const f = (out || new T.Vector3()).copy(base || P.fwd()); if (spreadDeg <= 0) return f;
  const r = Math.tan(Math.sqrt(Math.random()) * spreadDeg * Math.PI / 180), a = Math.random() * TAU;
  _adR.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); _adU.crossVectors(_adR, f).normalize();
  return f.addScaledVector(_adR, Math.cos(a) * r).addScaledVector(_adU, Math.sin(a) * r).normalize();
}
// Where a shot goes. First person: from the eye along the view. In third person the crosshair sits on the camera's ray,
// which runs ~.55 m beside the head, so shots landed that far left of it at every range: resolve what the crosshair ray
// hits and fire from the eye at that point (cover right at the muzzle can still catch the round, as it should).
const AIMB = { o: new T.Vector3(), d: new T.Vector3() }, _fA = new T.Vector3(), _fP = new T.Vector3(), _fO = new T.Vector3(), _fD = new T.Vector3();
function aimBasis() {
  const o = P.eyeInto(AIMB.o), d = P.fwdInto(AIMB.d);
  if (G.camMode !== 'tpp' || G.state !== 'city' || P.inCar) return AIMB;
  const cp = camera.position, t0 = Math.max(0, (o.x - cp.x) * d.x + (o.y - cp.y) * d.y + (o.z - cp.z) * d.z); // start level with the head
  _fA.copy(cp).addScaledVector(d, t0); const h = hitscan(_fA, d, 320);
  _fP.copy(_fA).addScaledVector(d, h ? h.t : 320).sub(o); const L = _fP.length();
  if (L > 1.2) d.copy(_fP).divideScalar(L);
  return AIMB;
}
function currentSpread(s) {
  const w = s.w; let sp = lerp(s.st.hip, s.st.ads, P.ads);
  const mv = Math.hypot(P.vel.x, P.vel.z);
  sp *= 1 + (mv > .5 ? (w.cls === 'shotgun' ? .1 : .5) * (1 - P.ads * .8) : 0);
  if (P.crouching) sp *= .8; if (!P.onGround) sp *= 1.8; if (P.sprintK > .3) sp *= 2;
  return sp;
}
function muzzleWorld() {
  if (G.camMode === 'tpp' && PGUN && PBODY && PBODY.root.visible) { const v = new T.Vector3(); PBODY.root.updateMatrixWorld(true); PGUN.muzzle.getWorldPosition(v); return v; }
  const f = P.fwd(); const right = new T.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  return P.eye().addScaledVector(f, .7).addScaledVector(right, .14 * (1 - P.ads)).add(new T.Vector3(0, -.12 * (1 - P.ads) - .04, 0));
}
// world ray: ai.js's grid walk (only the 20 m cells the ray crosses) when it is there, else rayBoxes' scan of all ~3.2k boxes.
// Same answer; the hit (and its normal) may be a shared object, so use it before the next ray
const rayW = (o, d, t) => (typeof rayGrid === 'function' ? rayGrid : rayBoxes)(o, d, t);
// cheap reject before the capsule tests: is a body's bounding sphere (center cy above its feet) anywhere near the ray?
function nearRay(o, d, x, y, z, r, maxT) { const vx = x - o.x, vy = y - o.y, vz = z - o.z, t = vx * d.x + vy * d.y + vz * d.z; return t > -r && t < maxT + r && vx * vx + vy * vy + vz * vz - t * t < r * r; }
function hitscan(o, d, maxR) {
  let best = null, bt = maxR;
  for (const e of ENEMIES) { if (e.dead || !nearRay(o, d, e.pos.x, e.pos.y + 1 * e.scale, e.pos.z, 1.25 * e.scale, bt)) continue; const h = e.partAt(o, d); if (h && h.t < bt) { bt = h.t; best = { e, part: h.part, t: h.t }; } }
  for (const w of WISPS) { const t = raySphere(o, d, w.pos, .45); if (t > 0 && t < bt) { bt = t; best = { w, t }; } }
  for (const c of CIVS) { if (c.dead || !nearRay(o, d, c.pos.x, .95, c.pos.z, 1.2, bt)) continue; const h = c.partAt(o, d); if (h && h.t < bt) { bt = h.t; best = { civ: c, part: h.part, t: h.t }; } }
  const ch = rayCar(o, d, bt); if (ch && ch.car !== P.inCar) { bt = ch.t; best = { car: ch.car, t: ch.t, n: ch.n, glass: ch.glass }; }
  const wh = rayW(o, d, bt);
  if (wh && (!best || wh.t < best.t)) return { world: true, t: wh.t, n: wh.n, box: wh.box };
  return best;
}
const COL_BRASS = C(0xc9a24a);
const dmgAt = (st, d) => d <= st.r1 ? st.dmg : d >= st.r2 ? st.dmgMin : lerp(st.dmg, st.dmgMin, (d - st.r1) / (st.r2 - st.r1));
// hit feedback. ui.js's marker ignores its head flag, so a headshot also gets a sharper crack and a bigger marker here
function hitFX(killed, head) {
  hitMarker(killed, head);
  const el = $('hit'); if (el) { el.classList.toggle('head', !!head); el.style.transform = head ? 'scale(1.35)' : ''; }
  if (head && AU.ok && !AU.play('headshot', { vol: .7 })) { AU.tone('triangle', 3600, 2300, .07, .16); AU.nz(.035, 'highpass', 7000, 9500, 1, .12); }
}
// thin cover a round can punch through once: max thickness (m) for a full-power round, scaled by the weapon class.
// Car windows are the one that matters (enemies use cars as cover); a pellet never penetrates
const PEN = { glass: 1, wood: .45, plaster: .35 }, PENW = { sniper: 1, lmg: .9, ar: .8, smg: .5, pistol: .4 };
function boxExit(b, o, d) { // where a ray leaves an AABB it is in or about to enter
  let t1 = 1e9;
  for (let a = 0; a < 3; a++) { const oa = a === 0 ? o.x : a === 1 ? o.y : o.z, da = a === 0 ? d.x : a === 1 ? d.y : d.z; if (Math.abs(da) < 1e-9) continue; const tb = ((da > 0 ? (a === 0 ? b.x1 : a === 1 ? b.y1 : b.z1) : (a === 0 ? b.x0 : a === 1 ? b.y0 : b.z0)) - oa) / da; if (tb < t1) t1 = tb; }
  return t1;
}
// one bullet along o + d·t: damage what it meets, maybe carry on through thin cover (k = power left, d0 = distance so far)
function shotRay(o, d, s, i, k, d0, depth) {
  const w = s.w, pel = w.pellets || 1, h = hitscan(o, d, 320 - d0), end = o.clone().addScaledVector(d, h ? h.t : 200);
  if (!h) return end;
  const pw = pel > 1 || depth ? 0 : PENW[w.cls] || 0, dist = d0 + h.t;
  if (h.world) {
    const surf = surfOfHit(h, end);
    impact(end, h.n, surf, { pellet: pel > 1, fx: i < 5, snd: i === 0, size: (pel > 1 ? .1 : w.cls === 'sniper' || w.cls === 'lmg' ? .2 : .16) });
    if (pw && PEN[surf] && h.box) { const th = boxExit(h.box, o, d) - h.t; if (th < PEN[surf] * pw) return shotRay(_fA.copy(o).addScaledVector(d, h.t + th + .02), d, s, 1, k * (1 - th / (PEN[surf] * pw) * .6) * .8, dist + th, 1); }
    return end;
  }
  if (h.car) {
    carHit(h.car, dmgAt(s.st, dist) * k, end, h.n, h.glass);
    if (pw && h.glass) return shotRay(_fA.copy(end).addScaledVector(d, .05), d, s, 1, k * .75, dist, 1); // in through a window: the ray now starts inside that car, which rayCar skips
    return end;
  }
  if (h.civ) { burst(FXN, end, 7, 2.5, .5, .09, .04, COL.blood, 7, .3); h.civ.hurt(s.st.dmg * k * (h.part === 'head' ? w.head : 1), 'player'); return end; }
  if (h.w) { h.w.hp -= s.st.dmg * k; hitFX(h.w.hp <= 0, false); burst(FXA, end, 6, 3, .3, .2, .02, COL.ember, 0); return end; }
  const e = h.e, head = h.part === 'head';
  let dmg = dmgAt(s.st, dist) * k;
  dmg *= head ? w.head : h.part === 'limb' ? .88 : 1;
  if (e.possessed) dmg *= .9;
  const col = e.type === 'reptile' ? COL.green : e.type === 'shifter' || e.type === 'vampire' ? COL.ichor : e.type === 'demon' ? COL.ember : e.type === 'witch' ? COL.purple : COL.blood;
  const fx = e.type === 'demon' || e.type === 'witch' ? FXA : FXN;
  burst(fx, end, 7, 2.5, .5, .09, .04, col, 7, .3); if (head) burst(fx, end, 6, 3.4, .35, .07, .03, col, 6, .6); // a headshot throws a mist up and back
  const killed = e.hurt(dmg, h.part, d, { w, big: dmg > 90, dist });
  hitFX(killed, head); if (killed && dist > P.longest) P.longest = dist;
  return end;
}
function fire() {
  const s = P.s(), w = s.w;
  if (w.kind === 'melee') return startMelee(false);
  if (w.kind === 'saw') return;
  if (P.fireCd > 0 || P.cycleT > 0 || P.switchT > 0 || P.meleeT > 0) return;
  if (P.reloadT > 0) { if (shellInterruptible() && s.mag > 0) { P.reloadT = 0; P.shellMode = false; if (w.action === 'pump' && P.shellEmpty) { P.cycleT = P.cycleDur = .5; AU.play('foley_pump', { vol: .9 }) || AU.rack(); return; } } else return; }
  if (s.mag <= 0) { AU.click(); P.fireCd = .25; startReload(); return; }
  // sprint-out first (the trigger also blocks sprint); a tap during it is kept and fires once the gun is up
  if (P.sprintK > .2) { P.sprintBlock = .3; P.fireQ = .35; return; }
  // carry the leftover cooldown: resetting it each shot rounded every gap up to whole frames (Vexor 1150 rpm fired ~900 at 60 fps)
  s.mag--; P.fireCd = Math.max(P.fireCd, -G.dt) + 60 / s.st.rpm; P.lastFire = G.t; P.inspectT = 0; P.fireQ = 0;
  const sup = s.st.sup, A = aimBasis();
  if (w.kind === 'plasma' || w.kind === 'throw') {
    const tgtHit = hitscan(A.o, A.d, 300); const tp = _fP.copy(A.o).addScaledVector(A.d, tgtHit ? tgtHit.t : 120);
    const from = muzzleWorld(); const v = tp.clone().sub(from).normalize();
    const sp = currentSpread(s); const d = aimDir(sp, A.d, _fD); v.lerp(d, .3).normalize();
    const p = makeProj(w.kind === 'plasma' ? 'plasma' : 'star', from, v.multiplyScalar(w.speed), 'player', w.dmg, { w, head: w.head, splash: w.splash || 0 });
    if (w.kind === 'throw') { P.meleeT = P.meleeDur = .28; P.quick = false; AU.swish(false); }
    else { AU.shot(w, false); VM.flashT = .05; }
  } else {
    const o = _fO.copy(A.o), sp = currentSpread(s), from = muzzleWorld(), pel = w.pellets || 1;
    // tracers as loaded in real belts and mags: on full-auto every third round plus the last three (the burnout warning
    // that the mag is nearly dry); semi-autos show each shot, shotguns two pellets
    s.shotN = (s.shotN || 0) + 1; const trc = pel > 1 ? 2 : !w.auto || s.shotN % 3 === 1 || s.mag < 3 ? 1 : 0;
    for (let i = 0; i < pel; i++) {
      const d = aimDir(sp, A.d, _fD), end = shotRay(o, d, s, i, 1, 0, 0);
      if (i < trc) tracer(from, end, sup ? 0x9ab0ff : 0xffd28a, pel > 1 ? .6 : 1);
    }
    AU.shot(w, sup); if (!sup) VM.flashT = .045;
    if (!sup) { P.eyeInto(flashLight.position).addScaledVector(A.d, 1.2); flashLight.color.set(0xffb060); flashLight.intensity = 5; G.flashT = .05; }
    if (G.camMode === 'tpp' && PGUN && !sup) { PGUN.flash.position.copy(from); PGUN.flash.visible = true; PGUN.flash.scale.setScalar(.6); PGUN.flash.material.rotation = Math.random() * TAU; PGUN.flashT = .05; }
    // brass
    if (pel === 1 && w.action !== 'bolt' && w.model !== 'prev') { const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw), e = A.o; FXN.emit(e.x + A.d.x * .4 + rx * .12, e.y - .1, e.z + A.d.z * .4 + rz * .12, rx * 2.5 + rand(-.3, .3), 2 + rand(0, 1), rz * 2.5 + rand(-.3, .3), 1.2, .03, .03, COL_BRASS, 1, 12); }
  }
  // recoil
  const adsK = lerp(1.15, 1, P.ads) * (P.crouching ? .85 : 1);
  P.recoilBuf.y += s.st.recV * adsK * rand(.85, 1.15) * Math.PI / 180;
  P.recoilBuf.x += s.st.recH * adsK * rand(-1, 1) * Math.PI / 180;
  VM.kick.z += w.cls === 'sniper' || w.cls === 'shotgun' ? .09 : .03; VM.kick.rx += (w.cls === 'pistol' ? .18 : .05) * (1 - P.ads * .5); VM.kick.rz += rand(-.04, .04);
  P.punch.x += rand(-.4, .4) * .01; P.punch.y += .012 * (w.cls === 'sniper' || w.cls === 'shotgun' ? 3 : 1);
  if (w.action === 'pump' || w.action === 'bolt') { P.cycleT = P.cycleDur = w.action === 'pump' ? .55 : .85; setTimeout(() => AU.play(w.action === 'pump' ? 'foley_pump' : 'foley_bolt', { vol: .85 }) || AU.rack(), w.action === 'pump' ? 140 : 180); }
  if (s.mag === 0 && s.res > 0 && w.mag > 0) setTimeout(() => { if (P.s() === s && s.mag === 0) startReload(); }, 220);
  playerShotNoise(P.eye(), P.fwd(), 80, sup);
}
function alertNearby() { /* every enemy already hunts you on Red Night */ }
function startReload() {
  const s = P.s(), w = s.w; P.reloadStartT = G.t; P.inspectT = 0;
  if (w.kind === 'saw') { // refuel: single timer
    if (P.reloadT > 0 || s.mag >= w.mag || s.res <= 0 || P.switchT > 0 || P.meleeT > 0) return;
    P.shellMode = false; P.rStages = null; P.reloadEl = undefined; P.reloadDur = w.reload || 2.4; P.reloadT = P.reloadDur; AU.mag(true); return;
  }
  startReloadCoD();
}
function finishReload() { const s = P.s(); const need = s.w.mag - s.mag; const take = Math.min(need, s.res); s.mag += take; s.res -= take; }
function startMelee(quick) {
  if (P.meleeT > 0 || P.switchT > 0) return;
  const s = P.s(), w = s.w;
  const melee = quick ? (w.kind === 'melee' ? w : null) : w;
  P.quick = quick && w.kind !== 'melee' && w.kind !== 'saw';
  P.meleeDur = P.quick ? .45 : (melee ? melee.swing : .45); P.meleeT = P.meleeDur; P.meleeHitDone = false; P.combo++;
  P.reloadT = 0; P.shellMode = false; P.rStages = null;
  AU.swish(w.model === 'nodachi' || w.model === 'bat');
  if (P.possT > 0) { P.possMash++; P.possT -= .7; }
}
function meleeHit() {
  const s = P.s(), w = s.w; const quick = P.quick;
  const reach = quick ? 2.1 : w.reach, dmg = quick ? 70 : w.dmg;
  const f = P.fwd(); const fl = new T.Vector2(f.x, f.z).normalize(), eye = P.eye();
  let any = false, kills = 0; const targets = [];
  for (const e of ENEMIES) {
    if (e.dead) continue; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z; const d = Math.hypot(dx, dz);
    if (d > reach + e.r * e.scale || Math.abs(e.pos.y - P.pos.y) > 2) continue; const dot = (dx * fl.x + dz * fl.y) / (d || 1); if (dot < .45 && d > 1) continue;
    if (!meleeClear(eye, e)) continue; // a blade used to reach through a wall or a fence
    targets.push([d, e]);
  }
  targets.sort((a, b) => a[0] - b[0]);
  const cleave = w.model === 'katana' || w.model === 'nodachi' || w.model === 'saw';
  for (const [d, e] of targets.slice(0, cleave ? 3 : 1)) {
    let mult = 1; if (w.wood && e.type === 'vampire') mult = 2.2;
    const hp = e.pos.clone().setY(1.2);
    const killed = e.hurt(dmg * mult, 'body', f, { w, big: !quick && (w.model === 'katana' || w.model === 'nodachi') });
    if (w.bleed && !killed) e.bleed = 3; if (w.knock && !killed) e.vel.addScaledVector(new T.Vector3(f.x, 0, f.z).normalize(), 9);
    burst(FXN, hp, 14, 3.5, .6, .1, .05, e.type === 'reptile' ? COL.green : COL.blood, 8, .2); AU.thud(); hitFX(killed, false); any = true; if (killed) kills++; shake(.12);
  }
  for (const wi of WISPS) { const dx = wi.pos.x - eye.x, dy = wi.pos.y - eye.y, dz = wi.pos.z - eye.z, L = Math.hypot(dx, dy, dz); if (L < reach + .5 && (dx * f.x + dy * f.y + dz * f.z) > L * .3) { wi.hp -= dmg; any = true; if (wi.hp <= 0) kills++; hitFX(wi.hp <= 0, false); } }
  // hit-stop: a beat on contact, a longer one when the blow kills
  if (any) G.hitStop = Math.max(G.hitStop || 0, kills ? .085 : .03);
}
const _mlD = new T.Vector3();
function meleeClear(eye, e) {
  _mlD.set(e.pos.x - eye.x, e.pos.y + 1.1 * e.scale - eye.y, e.pos.z - eye.z); const L = _mlD.length(); if (L < .8) return true;
  _mlD.divideScalar(L); const h = rayW(eye, _mlD, L); return !h || h.t > L - .3;
}
function sawTick(dt) {
  const s = P.s(); const firing = (INP.fire || mouseDown) && G.state === 'city' && s.mag > 0 && P.reloadT <= 0;
  P.sawRev = damp(P.sawRev, firing ? 1 : .15, 8, dt);
  AU.engineSet(G.state === 'city' && !P.inCar, 6 + P.sawRev * 22);
  if (!firing) return;
  s.mag = Math.max(0, s.mag - 9 * dt); if (s.mag <= 0 && s.res > 0) startReload();
  P.sawAcc = (P.sawAcc || 0) + dt; if (P.sawAcc < .1) return; P.sawAcc = 0;
  const f = P.fwd(), eye = P.eye(); for (const e of ENEMIES) {
    if (e.dead) continue; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z; const d = Math.hypot(dx, dz); if (d > 2.6 || Math.abs(e.pos.y - P.pos.y) > 2) continue;
    if ((dx * f.x + dz * f.z) / (d || 1) < .4 && d > 1) continue;
    if (!meleeClear(eye, e)) continue;
    const k = e.hurt(s.w.dmg * .1, 'body', f, { w: s.w, big: true }); hitFX(k, false); shake(.06); if (k) G.hitStop = Math.max(G.hitStop || 0, .06);
    burst(FXN, e.pos.clone().setY(1.2), 10, 5, .5, .1, .05, e.type === 'reptile' ? COL.green : COL.blood, 9, .4);
  }
}

/* ---------------- player update ---------------- */
// what the player stands on, for footsteps: the box's surf tag, the river, the room's floor, the street (wet once it rains)
const ROOM_FLOOR = { church: 'stone', guns: 'wood', club: 'concrete', metro: 'concrete' };
function stepSurf() {
  if (G.state === 'apt') return 'wood';
  if (G.inside) return ROOM_FLOOR[G.inside] || 'concrete';
  const x = P.pos.x, z = P.pos.z, y = P.pos.y, l = grid.get(gk(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (l) for (let i = 0; i < l.length; i++) { const b = l[i]; if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue; if (b.water && y < b.y1 + .1) return 'water'; if (y > .1 && Math.abs(b.y1 - y) < .12) return b.surf || 'concrete'; }
  if (typeof AMB !== 'undefined' && AMB.grass && typeof gcell === 'function' && AMB.grass.has(gcell(x, z))) return 'grass';
  const lx = ((x + HALF) % CW + CW) % CW, lz = ((z + HALF) % CW + CW) % CW;
  return lx > 5 && lx < 35 && lz > 5 && lz < 35 ? (G.rainK > .6 ? 'wet' : 'concrete') : G.rainK > .3 ? 'wet' : 'asphalt';
}
function plStep(k, heavy) { if (typeof AMB !== 'undefined' && AMB.footstep) AMB.footstep(stepSurf(), k, true, P.pos, heavy); }
// Scoped snipers breathe: a slow drift the aim really follows (the shot lands on the crosshair). Shift holds the breath
// for up to 4 s; run it out and the sway comes back worse until you let go and recover. (The old hold flickered on and
// off every frame once the breath ran out, and its drift was ~0.1 degree, too small to see.)
function breathSway(dt, s, w, moving) {
  const scoped = P.ads > .6 && !!s && w.kind === 'gun' && s.st.zoom > 3, hold = !IS_TOUCH && (KEY.ShiftLeft || KEY.ShiftRight);
  const holding = scoped && hold && P.steady > 0 && !P.breathLock;
  if (holding !== !!P.holding) { P.holding = holding; if (holding) AU.nz(.35, 'bandpass', 500, 900, .7, .05, undefined, .12); else AU.nz(.7, 'bandpass', 900, 300, .7, .06, undefined, .05); } // in / out
  if (holding) { P.steady -= dt; if (P.steady <= 0) { P.steady = 0; P.breathLock = true; P.gaspT = 1.8; } }
  else { P.steady = Math.min(4, P.steady + dt * .6); if (!hold) P.breathLock = false; }
  if (P.gaspT > 0) P.gaspT -= dt;
  P.steadyK = damp(P.steadyK, holding ? .12 : P.gaspT > 0 ? 2 : 1, 6, dt);
  P.swayAmp = damp(P.swayAmp, scoped ? .0065 * (P.crouching ? .6 : 1) * (moving ? 1.5 : 1) * (IS_TOUCH ? .7 : 1) * P.steadyK : 0, 5, dt);
  const ox = Math.sin(G.t * .9) * P.swayAmp, oy = Math.sin(G.t * 1.7) * P.swayAmp * .7; // same phase as the scope overlay's drift in ui.js
  P.yaw += ox - P.swayOx; P.pitch += oy - P.swayOy; P.swayOx = ox; P.swayOy = oy;
}
function updatePlayer(dt) {
  if (P.dead) { P.deadT += dt; P.eyeH = damp(P.eyeH, .3, 3, dt); return; }
  // heartbeat and the world going soft below half health (ambience.js)
  if (typeof AMB !== 'undefined' && AMB.lowHealth) AMB.lowHealth(G.state === 'city' ? smooth01((.5 - P.hp / P.maxHp) / .42) : 0);
  if (P.inCar) return driveUpdate(dt);
  const s = P.s(), w = s ? s.w : null, aimable = !!w && (w.kind === 'gun' || w.kind === 'plasma' || w.kind === 'throw');
  // movement input
  let mx = 0, mz = 0;
  if (IS_TOUCH) { mx = INP.mx; mz = INP.my; } else { mx = (KEY.KeyD ? 1 : 0) - (KEY.KeyA ? 1 : 0); mz = (KEY.KeyW ? 1 : 0) - (KEY.KeyS ? 1 : 0); }
  if (P.possT > 0 && Math.sin(G.t * 1.3) > .6) { mx = -mx; mz = -mz; }
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  // touch sprint: the stick at the rim and roughly forward, with hysteresis so the edge doesn't flicker;
  // shoving it on past the rim breaks out of toggled sights
  if (IS_TOUCH) {
    const fw = INP.joyMag > 0 ? INP.my / INP.joyMag : 0;
    TOUCH.sprint = TOUCH.sprint ? INP.joyMag > .72 && fw > .4 : INP.joyMag > .92 && fw > .6;
    if (TOUCH.sprint && P.adsHeld && INP.joyRaw > 1.25 && fw > .8) { P.adsHeld = false; const ba = $('bAds'); if (ba) ba.classList.remove('on'); }
  }
  // look: sensitivity (mouse) or look speed (touch), invert Y, the sights slow it, aim-assist friction over a target
  const zk = s && s.st.zoom > 2 ? .45 : .7, sensK = (IS_TOUCH ? LOOK_K * G.lookSpd : .0022 * G.sens) * lerp(1, zk, smooth01(P.ads)) * aaFriction();
  let dyaw = -INP.lookX * sensK, dpit = -INP.lookY * sensK * (G.invertY ? -1 : 1);
  INP.lookX = 0; INP.lookY = 0;
  if (!IS_TOUCH) { if (KEY.ArrowLeft) dyaw += 2.2 * dt; if (KEY.ArrowRight) dyaw -= 2.2 * dt; if (KEY.ArrowUp) dpit += 1.6 * dt; if (KEY.ArrowDown) dpit -= 1.6 * dt; }
  P.yaw += dyaw; P.pitch += dpit; AAS.iy = dyaw; AAS.ip = dpit; // this frame's look input, for the aim assist's turn-away test
  P.lookVX = damp(P.lookVX, dyaw / Math.max(dt, .001), 30, dt); P.lookVY = damp(P.lookVY, dpit / Math.max(dt, .001), 30, dt); // turn rate, for the gun's inertia
  // recoil: the buffered kick lands fast; once the trigger rests most of the climb comes back down, minus whatever the
  // player already pulled down against it (it used to recover on top of their correction and drag the aim low)
  const ry = P.recoilBuf.y * Math.min(1, dt * 22), rx = P.recoilBuf.x * Math.min(1, dt * 22);
  P.pitch += ry; P.yaw += rx; P.recoilBuf.y -= ry; P.recoilBuf.x -= rx;
  P.recoverPitch = Math.min(.5, (P.recoverPitch || 0) + ry); if (dpit < 0 && P.recoverPitch > 0) P.recoverPitch = Math.max(0, P.recoverPitch + dpit);
  if (G.t - P.lastFire > .12 && P.recoverPitch > 0) { const r = Math.min(P.recoverPitch, dt * (.35 + P.recoverPitch * 3)); P.pitch -= r * .7; P.recoverPitch -= r; }
  // possession: the demon fights you for the wheel
  if (P.possT > 0) {
    P.possT -= dt; P.hp -= 5 * dt; P.regenT = 3;
    P.yaw += Math.sin(G.t * 3.1) * dt * 1.2; P.pitch += Math.sin(G.t * 2.3) * dt * .7;
    if (P.hp <= 0) killPlayer('possessed');
    if (P.possT <= 0) { P.exorcisms++; addScore(150, 'EXORCISED YOURSELF'); flashBanner('EXORCISED', 'The demon lost its grip', 1.2); AU.roar(0, .6); }
  }
  P.pitch = clamp(P.pitch, -1.45, 1.45);
  // aim assist: touch only, and only with the setting on
  if (IS_TOUCH && G.aimAssist && aimable) aimAssist(dt); else AAS.e = null;
  breathSway(dt, s, w, mx !== 0 || mz !== 0);
  // ADS (a fresh press also starts the aim-assist pull, unless the look is turning away from the target as the sights come up)
  const wantAds = (IS_TOUCH ? P.adsHeld : rmb || KEY.KeyZ) && aimable && P.reloadT <= 0 || (P.reloadT > 0 && P.shellMode && (IS_TOUCH ? P.adsHeld : rmb));
  if (wantAds && !P.wantAds0) AAS.snap = AAS.away > 0 ? 0 : .25; P.wantAds0 = !!wantAds;
  const adsSpeed = s ? 1 / s.st.adsT : 4;
  P.ads = clamp(P.ads + (wantAds && P.switchT <= 0 && (P.sprintK || 0) < .2 ? dt * adsSpeed : -dt * adsSpeed * 1.4), 0, 1);
  // sprint. The trigger (or a shot waiting on sprint-out) stops it: P.sprintBlock was set but never read, so pressing
  // FIRE mid-sprint did nothing at all. Sprinting also stands you up from a crouch or the end of a slide, as in CoD
  const sprintKey = IS_TOUCH ? TOUCH.sprint : (KEY.ShiftLeft || KEY.ShiftRight);
  const trig = (INP.fire || (mouseDown && G.state === 'city')) && aimable;
  // a reload pressed mid-sprint drops you to a run and finishes; a fresh Shift press during it sprints and cancels it (CoD).
  // Holding Shift through R used to cancel every reload .25 s in, so a sprinting player could never reload
  const reSprint = !IS_TOUCH && (P.sprintPressT || -1) > (P.reloadStartT || -1);
  const canSprint = mz > .3 && P.onGround && P.slide <= 0 && P.ads < .3 && !trig && !(P.sprintBlock > 0) && (P.reloadT <= 0 || reSprint);
  P.sprint = !!(sprintKey && canSprint); P.tac = P.sprint && (P.tacReq || P.tacHold);
  if (P.sprint && IS_TOUCH) { P.sprintTime = (P.sprintTime || 0) + dt; P.tac = P.sprintTime > 1.6; } else P.sprintTime = 0;
  if (P.sprint && P.reloadT > 0 && !P.shellMode && P.rStages) { /* sprinting cancels a reload like CoD, unless the new mag is already seated */ if (P.reloadCommitted) { P.reloadT = 0; P.rStages = null; } else if (P.reloadEl > .25) { P.reloadT = 0; P.rStages = null; if (P.reloadEmpty) { /* mag already dropped: you keep nothing */ } } }
  P.sprintK = damp(P.sprintK || 0, P.sprint ? 1 : 0, 9, dt);
  if (P.inspectT > 0 && (P.ads > .05 || P.sprint || P.reloadT > 0 || P.meleeT > 0)) P.inspectT = 0;
  // crouch / slide
  if (took('crouch')) {
    if (P.sprint && P.onGround && P.slide <= 0) { P.slide = .8; P.vel.x = -Math.sin(P.yaw) * 11.5; P.vel.z = -Math.cos(P.yaw) * 11.5; P.crouching = true; P.slideCam = 1; AU.nz(.5, 'lowpass', 1200, 300, 1, .3); plStep(.8, true); }
    else P.crouching = !P.crouching;
  }
  if (P.sprint && P.crouching && P.slide <= 0) P.crouching = false;
  const hexK = P.hexT > 0 ? .55 : 1; if (P.hexT > 0) P.hexT -= dt; if (P.acidT > 0) { P.acidT -= dt; }
  const mob = s ? s.st.mob : 1;
  let spd = (P.sprint ? (P.tac ? 9.4 : 7.6) : 5.1) * mob * hexK;
  if (P.crouching) spd *= .55; spd *= lerp(1, .55, P.ads);
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), wx = (-sy * mz + cy * mx) * spd, wz = (-cy * mz - sy * mx) * spd;
  if (P.slide > 0) { P.slide -= dt; P.vel.x = damp(P.vel.x, 0, 1.6, dt); P.vel.z = damp(P.vel.z, 0, 1.6, dt); if (P.slide <= 0) { P.slideCam = 0; } }
  else { const k = P.onGround ? 12 : 2.5; P.vel.x = damp(P.vel.x, wx, k, dt); P.vel.z = damp(P.vel.z, wz, k, dt); }
  P.slideCam = damp(P.slideCam || 0, P.slide > 0 ? 1 : 0, 8, dt);
  if (took('jump') && P.onGround) { P.vel.y = 6.4; P.onGround = false; P.crouching = false; if (P.slide > 0) { P.slide = 0; } plStep(.35); }
  P.vel.y -= 19 * dt; P.pos.y += P.vel.y * dt;
  // sub-step fast moves: a slide at 20 fps covers .58 m a frame, enough to pop straight through a .2 m park fence
  const hgt = P.crouching ? 1.2 : 1.8, stx = P.vel.x * dt, stz = P.vel.z * dt, nst = Math.min(4, Math.ceil(Math.hypot(stx, stz) / .25)) || 1;
  for (let i = 0; i < nst; i++) { P.pos.x += stx / nst; P.pos.z += stz / nst; collideCircle(P.pos, .36, P.pos.y, hgt); }
  // cars push you out along their short side (no per-car allocation now), then the boxes again so a car can't shove you into a wall
  let pushed = false;
  for (const c of CARS) {
    const dx = P.pos.x - c.pos.x, dz = P.pos.z - c.pos.z; if (dx * dx + dz * dz > 9 || P.pos.y >= 1.3 || c.gone) continue;
    const fx = -Math.sin(c.h), fz = -Math.cos(c.h), along = dx * fx + dz * fz, side = dx * fz - dz * fx;
    if (Math.abs(along) < 2.6 && Math.abs(side) < 1.4) { const pushA = 2.6 - Math.abs(along), pushS = 1.4 - Math.abs(side); if (pushS < pushA) { const q = Math.sign(side) * pushS; P.pos.x += fz * q; P.pos.z -= fx * q; } else { const q = Math.sign(along) * pushA; P.pos.x += fx * q; P.pos.z += fz * q; } pushed = true; }
  }
  if (pushed) collideCircle(P.pos, .36, P.pos.y, hgt);
  const gnd = groundAt(P.pos.x, P.pos.z, P.pos.y);
  if (P.pos.y <= gnd) {
    // landing: the view sinks on a spring and a thump plays, both scaled by how fast you came down (it was all-or-nothing past 7 m/s)
    if (!P.onGround) { const v = -P.vel.y; if (v > 2.5) { P.landV += Math.min(12, (v - 2.5) * 1.3); plStep(clamp(v / 12, .35, 1), v > 7); if (v > 9) { AU.thud(); shake(Math.min(.3, (v - 9) * .05)); } } }
    P.pos.y = gnd; P.vel.y = 0; P.onGround = true;
  } else if (P.pos.y > gnd + .05) P.onGround = false;
  P.landV += (-60 * P.landDip - 11 * P.landV) * dt; P.landDip = clamp(P.landDip + P.landV * dt, -.3, 1.2);
  P.crouch = damp(P.crouch, P.slide > 0 ? 1.3 : P.crouching ? 1 : 0, 10, dt);
  P.eyeH = 1.66 - P.crouch * .55;
  // stride: a footfall per step length (crouch, walk, sprint); the head bob and the gun bob ride the same phase
  const hs = Math.hypot(P.vel.x, P.vel.z), walking = P.onGround && P.slide <= 0 && hs > .6;
  P.strideK = damp(P.strideK, walking ? Math.min(1, hs / 5) : 0, 6, dt);
  if (walking) {
    const len = P.crouching ? .95 : P.sprint ? (P.tac ? 2.5 : 2.2) : clamp(.75 + hs * .17, .8, 1.65), a0 = P.strideA;
    if (!P.walking && G.t - P.stepT > .3) P.strideA = (Math.floor(P.strideA / Math.PI) + 1) * Math.PI - 1e-4; // the first step lands at once (and stands the ambience's own stepper down)
    P.strideA += hs / len * Math.PI * dt;
    if (Math.floor(P.strideA / Math.PI) !== Math.floor(a0 / Math.PI)) { P.stepT = G.t; plStep(clamp(hs / 9.4, 0, 1)); }
  }
  P.walking = walking;
  // weapon actions
  if (s) {
    P.fireCd -= dt; if (P.sprintBlock > 0) P.sprintBlock -= dt;
    if (P.switchT > 0) P.switchT = Math.max(0, P.switchT - dt);
    if (P.cycleT > 0) P.cycleT = Math.max(0, P.cycleT - dt);
    if (P.inspectT > 0) P.inspectT -= dt;
    if (P.reloadT > 0) {
      if (P.shellMode || P.rStages) tickReloadCoD(dt);
      else { P.reloadT -= dt; if (P.reloadT <= 0) { P.reloadT = 0; finishReload(); } }
      if (P.reloadT <= 0) P.rStages = null;
    }
    if (P.meleeT > 0) {
      P.meleeT -= dt; const k = 1 - P.meleeT / P.meleeDur;
      if (!P.meleeHitDone && k > (P.quick ? .35 : w.model === 'knife' || w.dual ? .4 : .42)) { P.meleeHitDone = true; if (w.kind !== 'throw') meleeHit(); }
      if (P.meleeT <= 0) P.meleeT = 0;
    }
    const firing = INP.fire || (mouseDown && G.state === 'city');
    if (w.kind === 'saw') sawTick(dt); else AU.engineSet(false);
    if (firing && w.kind !== 'saw' && G.state === 'city') {
      if (w.kind === 'melee') { if (P.meleeT <= 0) startMelee(false); }
      else if (w.auto || w.kind === 'throw') fire();
      else if (!P.triggerHeld || P.fireQ > 0) fire();
    } else if (P.fireQ > 0) { P.fireQ -= dt; if (P.sprintK <= .2 && G.state === 'city') fire(); } // the tap that came mid-sprint
    P.triggerHeld = firing;
    if (took('reload')) startReload();
    if (took('melee')) { if (P.possT > 0) { P.possMash++; P.possT -= .7; VM.kick.z -= .05; AU.swish(); } else startMelee(true); }
    if (took('swap')) setWeapon(P.cur === 0 ? 1 : 0);
    if (took('s1')) setWeapon(0); if (took('s2')) setWeapon(1); if (took('s3')) setWeapon(2);
    if (took('inspect') && P.reloadT <= 0) P.inspectT = 2.4;
  }
  if (took('cam')) toggleCam();
  if (took('shoulder')) swapShoulder();
  // health regen
  P.regenT -= dt; if (P.regenT <= 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + 32 * dt);
  // body facing for third person
  const mv = Math.hypot(P.vel.x, P.vel.z);
  const aimingNow = P.ads > .1 || G.t - P.lastFire < 1.2 || P.meleeT > 0 || (w && w.kind === 'saw' && P.sawRev > .4);
  if (aimingNow || mv < .5) P.bodyYaw = lerpAngle(P.bodyYaw, P.yaw, 1 - Math.exp(-14 * dt));
  else { const my = Math.atan2(-P.vel.x, -P.vel.z); P.bodyYaw = lerpAngle(P.bodyYaw, my, 1 - Math.exp(-10 * dt)); }
}
function lerpAngle(a, b, t) { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * t; }
// Touch aim assist (Settings > Aim assist; never on a mouse). The look slows while the crosshair is over a visible enemy,
// the sights pull gently onto one as they come up, and a light follow holds it while aiming or firing. The old version
// was a constant 1.8-3.5/s magnet toward anything in a 3-5 degree cone, through walls and onto disguised shifters.
// It never fights a turn: look input that widens the gap to the target, however slow, stops every pull for .2 s and
// cancels a pending snap; a swing faster than ~90 deg/s stops it too, and the friction fades out on a fast swing. So it
// only pulls while the finger rests or heads for the target. Only NPCs hostile to you are pulled onto; a bystander gets the
// friction alone, and only once the crosshair is already right on them.
const AAS = { e: null, t: 0, los: false, k: 0, snap: 0, hold: 0, away: 0, iy: 0, ip: 0, host: true }, _aaO = new T.Vector3(), _aaF = new T.Vector3(), _aaC = new T.Vector3();
const aaBubble = (e, L, ads) => Math.atan2((ads ? 1.1 : .8) * e.scale, L) + .012; // angular radius around the chest
const aaHostile = e => typeof hostileToPlayer !== 'function' || !!hostileToPlayer(e);
function aimAssist(dt) {
  const ads = P.ads > .5, o = P.eyeInto(_aaO), f = P.fwdInto(_aaF);
  if (G.camMode === 'tpp' && G.state === 'city') o.copy(camera.position); // the crosshair's ray
  AAS.t -= dt; AAS.snap -= dt; AAS.hold = Math.max(0, AAS.hold - dt); AAS.away = Math.max(0, AAS.away - dt);
  if (AAS.t <= 0) { // ~10 Hz: the enemy nearest the crosshair inside its bubble, then one line-of-sight ray for it
    AAS.t = .1; let best = null, bk = 1.25, bh = true;
    for (const e of ENEMIES) {
      if (e.dead || e.mode === 'disguise' || (e.R && !e.R.root.visible)) continue;
      _aaC.set(e.pos.x - o.x, e.pos.y + 1.2 * e.scale - o.y, e.pos.z - o.z); const L = _aaC.length(); if (L < .5 || L > (ads ? 70 : 40)) continue;
      const h = aaHostile(e), k = Math.acos(clamp(_aaC.dot(f) / L, -1, 1)) / aaBubble(e, L, ads) * (h ? 1 : 1.8); // a bystander has to be right under the crosshair
      if (k < bk) { bk = k; best = e; bh = h; }
    }
    AAS.e = best; AAS.host = bh; AAS.los = !!best && (typeof aiLos === 'function' ? aiLos : losClear)(o, _aaC.set(best.pos.x, best.pos.y + 1.2 * best.scale, best.pos.z));
  }
  const e = AAS.e; AAS.k = 0;
  if (!e || !AAS.los || e.dead) return;
  _aaC.set(e.pos.x - o.x, e.pos.y + 1.2 * e.scale - o.y, e.pos.z - o.z); const L = _aaC.length(); _aaC.divideScalar(L);
  const a = Math.acos(clamp(_aaC.dot(f), -1, 1)), bub = aaBubble(e, L, ads); if (a > bub * 1.25) return;
  const ty = Math.atan2(-_aaC.x, -_aaC.z), tp = Math.asin(clamp(_aaC.y, -1, 1));
  let ey = ty - P.yaw; ey = Math.atan2(Math.sin(ey), Math.cos(ey)); const ep = tp - P.pitch, cp = Math.cos(P.pitch);
  // turning away: the gap to the target now is wider than it was before this frame's look input (AAS.iy, AAS.ip)
  if (Math.hypot(ey * cp, ep) > Math.hypot((ey + AAS.iy) * cp, ep + AAS.ip) + 1e-5) { AAS.away = .2; AAS.snap = 0; }
  const rate = Math.hypot(P.lookVX || 0, P.lookVY || 0); if (rate > 1.6) AAS.hold = .2;
  AAS.k = smooth01(1 - a / bub) * (1 - smooth01((rate - 1.2) / 2.5)); // friction for next frame's look
  if (AAS.hold > 0 || AAS.away > 0 || !AAS.host) return;
  const r = AAS.snap > 0 && P.ads > .05 ? 5 : ads || G.t - P.lastFire < .2 ? 1.1 * AAS.k : 0;
  if (r > 0) { const k = Math.min(1, r * dt); P.yaw = lerpAngle(P.yaw, ty, k); P.pitch = lerp(P.pitch, tp, k); }
}
function aaFriction() { return IS_TOUCH && G.aimAssist && AAS.e && AAS.los ? 1 - .35 * AAS.k : 1; }
function toggleCam() { G.camMode = G.camMode === 'fpp' ? 'tpp' : 'fpp'; store('cam', G.camMode); $('pCam').textContent = 'Camera: ' + (G.camMode === 'fpp' ? 'first person' : 'third person'); flashBanner(G.camMode === 'fpp' ? 'FIRST PERSON' : 'THIRD PERSON', '', .7); }
function swapShoulder() { camState.pref = -camState.pref; store('sh', camState.pref); const b = $('pShoulder'); if (b) b.textContent = 'Shoulder: ' + (camState.pref > 0 ? 'right' : 'left'); }

/* ---------------- camera ---------------- */
const camState = { tppDist: 2.25, side: 1, pref: store('sh') === -1 ? -1 : 1, want: 1, sideT: 0 };
// prefers-reduced-motion: shake, head bob, the landing dip, rolls and FOV kicks drop to 30%
const RMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const _cq = new T.Quaternion(), _ce = new T.Euler(0, 0, 0, 'YXZ'), _cpv = new T.Vector3(), _csr = new T.Vector3(), _cof = new T.Vector3(), _cdr = new T.Vector3(), _ccW = new T.Vector3();
function updateCamera(dt) {
  const s = P.s(); const w = s && s.w; const M = RMQ && RMQ.matches ? .3 : 1;
  P.punch.x = damp(P.punch.x, 0, 10, dt); P.punch.y = damp(P.punch.y, 0, 10, dt);
  P.shakeA = damp(P.shakeA, 0, 6, dt);
  // shake from layered sines rather than a fresh random offset every frame (a rumble, not static)
  const sh = P.shakeA * M, shx = (Math.sin(G.t * 41.3) * .6 + Math.sin(G.t * 23.7 + 1.3) * .4) * sh * .03, shy = (Math.sin(G.t * 37.9 + .7) * .6 + Math.sin(G.t * 29.1 + 2.1) * .4) * sh * .03;
  const bk = P.strideK * (1 - P.ads * .8) * M, sa = Math.sin(P.strideA);
  let roll = (P.slideCam || 0) * -.06 * M + sa * .004 * bk;
  if (P.possT > 0) roll += Math.sin(G.t * 2.7) * .25 * (M < 1 ? .4 : 1);
  if (P.dead) roll = Math.min(1.2, P.deadT * .9);
  // fov: Settings > Field of view is the base for both views (0 = the default); sights keep their zoom ratio; a small
  // sprint / slide kick proportional to the base
  const base = G.fov || (IS_TOUCH ? 66 : 64);
  let fov = base * (1 + ((P.sprintK || 0) * (P.tac ? .1 : .07) + (P.slide > 0 ? .06 : 0)) * M);
  if (s && (w.kind === 'gun' || w.kind === 'plasma' || w.kind === 'throw')) fov = lerp(fov, base / s.st.zoom, P.ads);
  if (P.inCar) fov = base + Math.min(14, Math.abs(P.inCar.speed) * .35) * M;
  const nf = damp(camera.fov, fov, 16, dt); if (Math.abs(nf - camera.fov) > 1e-3) { camera.fov = nf; camera.updateProjectionMatrix(); }
  if (P.inCar) {
    const c = P.inCar, fx = -Math.sin(c.h), fz = -Math.cos(c.h);
    camera.position.lerp(_ccW.set(c.pos.x - fx * 6.2, c.pos.y + 2.4, c.pos.z - fz * 6.2), 1 - Math.exp(-6 * dt)); camera.lookAt(c.pos.x + fx * 4, 1.2, c.pos.z + fz * 4);
    camera.rotation.z += shx; P.yaw = Math.atan2(-fx, -fz); P.pitch = -.12;
    return;
  }
  const pitch = P.pitch + P.punch.y + shy, yaw = P.yaw + P.punch.x + shx;
  if (G.camMode === 'fpp' || G.state === 'apt') {
    // head bob: the head drops into each footfall and drifts over the planted foot
    const amp = (P.sprint ? .034 : P.crouching ? .012 : .02) * bk, hx = sa * amp * .45;
    camera.position.set(P.pos.x + Math.cos(P.yaw) * hx, P.pos.y + P.eyeH - P.landDip * .08 * M - amp * (1 - Math.abs(sa)), P.pos.z - Math.sin(P.yaw) * hx);
    camera.rotation.set(pitch, yaw, roll, 'YXZ');
  } else {
    const ads = P.ads; const dist = lerp(2.25, 1.2, ads) + (P.sprintK || 0) * .35;
    const piv = _cpv.set(P.pos.x, P.pos.y + 1.55 - P.crouch * .45, P.pos.z);
    _cq.setFromEuler(_ce.set(pitch, yaw, 0, 'YXZ'));
    // over the preferred shoulder (X / hold CAM swaps it); a wall close on that side flips it for you (narrow sidewalks).
    // The two side rays only need checking 10 times a second
    camState.sideT -= dt;
    if (camState.sideT <= 0) { camState.sideT = .1; const p = camState.pref; _csr.set(p, 0, 0).applyQuaternion(_cq); const hp = rayW(piv, _csr, 1.2), tp = hp ? hp.t : 9; _csr.negate(); const ho = rayW(piv, _csr, 1.2); camState.want = tp < .9 && !(ho && ho.t < tp) ? -p : p; }
    camState.side = damp(camState.side, camState.want, 9, dt);
    const off = _cof.set(lerp(.55, .62, ads) * camState.side, .12, dist).applyQuaternion(_cq);
    let L = off.length(); const dir = _cdr.copy(off).divideScalar(L), hit = rayW(piv, dir, L + .3);
    if (hit && hit.t < L + .3) L = Math.max(.3, hit.t - .3);
    camState.tppDist = damp(camState.tppDist, L, L < camState.tppDist ? 30 : 6, dt);
    camera.position.copy(piv).addScaledVector(dir, camState.tppDist);
    camera.rotation.set(pitch, yaw, roll, 'YXZ');
  }
}
function shake(a) { P.shakeA = Math.min(1.2, P.shakeA + a); }

/* ---------------- third person body animation ---------------- */
function updateBody(dt) {
  if (!PBODY) return;
  const show = (G.state === 'city' && G.camMode === 'tpp' || G.state === 'photo' && G.pausedFrom === 'city') && !P.inCar;
  PBODY.root.visible = show || (G.state === 'city' && P.dead);
  if (!PBODY.root.visible) return;
  const s = P.s(), w = s.w; const st = PBODY.st;
  st.t = G.t; st.speed = Math.hypot(P.vel.x, P.vel.z) * (P.onGround ? 1 : 0); st.air = !P.onGround; st.crouch = clamp(P.crouch, 0, 1);
  st.hold = w.kind === 'melee' ? 'melee' : (w.cls === 'pistol' || w.kind === 'throw' || w.model === 'blaster') ? 'pistol' : 'rifle';
  if (w.kind !== 'melee' && w.kind !== 'saw' && P.ads < .1 && G.t - P.lastFire > 1.2 && st.speed > 6) st.hold = 'none';
  st.aimPitch = P.pitch; st.attack = P.meleeT > 0 ? 1 - P.meleeT / P.meleeDur : 0;
  st.death = P.dead ? P.deadT * 2 : 0;
  if (PBODY.glb) {
    st.aimHold = w.kind !== 'melee' && (P.ads > .1 || G.t - P.lastFire < 1.2);
    st.attackClip = w.kind === 'melee' || P.quick ? 'slash' : null; st.attackJust = P.meleeT > 0 && !P.prevMelee; P.prevMelee = P.meleeT > 0;
    st.deathClip = 'fall'; st.aimPitch = clamp(P.pitch, -.9, .9); animGLB(PBODY, st, dt);
  } else animRig(PBODY, st, dt);
  PBODY.root.position.copy(P.pos); PBODY.root.rotation.y = P.bodyYaw;
  if (PGUN) { PGUN.g.visible = true; if (PGUN.flashT > 0) { PGUN.flashT -= dt; if (PGUN.flashT <= 0) PGUN.flash.visible = false; } }
}

/* ---------------- driving ---------------- */
function enterCar(c) {
  if (P.inCar || G.state !== 'city') return;
  if (c.ai) { c.ai = null; c.aiInp = null; const ti = TRAFFIC.indexOf(c); if (ti >= 0) TRAFFIC.splice(ti, 1); }
  // drop whatever the hands were doing (a reload, swing or inspect used to resume mid-way on the way out)
  P.inCar = c; c.occ = true; P.ads = 0; P.adsHeld = false; P.reloadT = 0; P.shellMode = false; P.rStages = null; P.meleeT = 0; P.inspectT = 0; P.cycleT = 0; P.slide = 0; P.slideCam = 0; P.crouching = false; P.sprint = false; P.fireQ = 0; INP.brake = false;
  const ba = $('bAds'); if (ba) ba.classList.remove('on');
  flashBanner('BEHIND THE WHEEL', IS_TOUCH ? 'Stick to drive · BRAKE slides · EXIT CAR gets out' : 'WASD drive · Space handbrake · E to exit', 1.4);
  AU.engineSet(true, 0);
}
function exitCar() {
  const c = P.inCar; if (!c) return; c.occ = false; P.inCar = null; AU.engineSet(false); INP.brake = false;
  const sx = Math.cos(c.h), sz = -Math.sin(c.h);
  P.pos.set(c.pos.x - sx * 2.2, 0, c.pos.z - sz * 2.2); collideCircle(P.pos, .36, 0, 1.8); P.vel.set(0, 0, 0);
  P.yaw = c.h; P.onGround = true; P.walking = false;
}
const _drv = { x: 0, y: 0, brake: false }, DRV_DROP = ['jump', 'reload', 'melee', 'swap', 'crouch', 'inspect', 's1', 's2', 's3', 'shoulder', 'brake'];
function driveUpdate(dt) {
  const c = P.inCar, I = _drv;
  if (IS_TOUCH) { I.x = INP.mx; I.y = INP.my; } else { I.x = (KEY.KeyD ? 1 : 0) - (KEY.KeyA ? 1 : 0); I.y = (KEY.KeyW ? 1 : 0) - (KEY.KeyS ? 1 : 0); }
  I.brake = !!(KEY.Space || INP.brake); // the touch handbrake was a one-frame press, so it barely slowed the car
  c.update(dt, I); P.pos.copy(c.pos); P.vel.set(-Math.sin(c.h) * c.speed, 0, -Math.cos(c.h) * c.speed);
  AU.engineSet(true, c.speed);
  INP.lookX = 0; INP.lookY = 0;
  P.regenT -= dt; if (P.regenT <= 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + 32 * dt);
  if (took('cam')) toggleCam();
  for (const k of DRV_DROP) PRESS.delete(k); // presses made at the wheel don't fire on the way out (C used to crouch you on exit)
}
