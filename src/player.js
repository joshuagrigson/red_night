/* =====================================================================
   RED NIGHT — player: movement, first/third person, weapons, viewmodel, driving
   ===================================================================== */
const P = {
  pos: new T.Vector3(), vel: new T.Vector3(), yaw: 0, pitch: 0, onGround: true, crouch: 0, crouching: false, slide: 0, sprint: false, tac: false,
  hp: 150, maxHp: 150, regenT: 0, dead: false, deadT: 0, ads: 0, adsHeld: false, cur: 0, slots: [null, null, null], fireCd: 0,
  reloadT: 0, reloadDur: 0, shellMode: false, cycleT: 0, switchT: 0, meleeT: 0, meleeDur: 0, meleeHitDone: false, quick: false, combo: 0,
  inCar: null, possT: 0, possMash: 0, hexT: 0, acidT: 0, punch: new T.Vector2(), shakeA: 0, bodyYaw: 0, steady: 4, inspectT: 0, landDip: 0,
  score: 0, kills: 0, heads: 0, longest: 0, exorcisms: 0, lastFire: 0, sawRev: 0, eyeH: 1.66, recoilBuf: new T.Vector2(),
  eye() { return new T.Vector3(this.pos.x, this.pos.y + this.eyeH, this.pos.z); },
  fwd() { const cp = Math.cos(this.pitch); return new T.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp); },
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
const INP = { mx: 0, my: 0, lookX: 0, lookY: 0, fire: false, joyMag: 0 };
function press(k) { PRESS.add(k); }
function took(k) { if (PRESS.has(k)) { PRESS.delete(k); return true; } return false; }
let lastShift = 0;
window.addEventListener('keydown', e => {
  if (e.repeat) { if (e.code === 'Tab') e.preventDefault(); return; }
  KEY[e.code] = true;
  const map = { Space: 'jump', KeyC: 'crouch', ControlLeft: 'crouch', KeyR: 'reload', KeyF: 'melee', KeyQ: 'swap', KeyV: 'cam', KeyE: 'act', KeyI: 'inspect', Digit1: 's1', Digit2: 's2', Digit3: 's3', Escape: 'pause', Tab: 'pause', KeyP: 'pause' };
  if (map[e.code]) { press(map[e.code]); if (e.code === 'Tab' || e.code === 'Space') e.preventDefault(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { const n = performance.now(); if (n - lastShift < 300) P.tacReq = true; lastShift = n; }
});
window.addEventListener('keyup', e => { KEY[e.code] = false; if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') P.tacReq = false; });
let mouseDown = false, rmb = false;
canvas.addEventListener('mousedown', e => {
  if (IS_TOUCH) return;
  if (G.state === 'city' || G.state === 'apt') {
    if (document.pointerLockElement !== canvas) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (er) { } }
    if (e.button === 0) { mouseDown = true; if (G.state === 'apt') press('click'); }
    if (e.button === 2) { rmb = true; }
  }
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; if (e.button === 2) rmb = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('mousemove', e => {
  if (IS_TOUCH) return;
  if (document.pointerLockElement === canvas || mouseDown || rmb) { INP.lookX += e.movementX || 0; INP.lookY += e.movementY || 0; }
});
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== canvas && G.state === 'city' && !P.dead && !G.noPauseOnUnlock) { /* user pressed Esc */ } });

// touch: floating joystick on the left, look anywhere on the right, buttons
const TOUCH = { joy: null, look: null, fireIds: new Set(), lastLook: {} };
function setupTouch() {
  const joyEl = $('joy'), knob = $('knob');
  const btn = (id, down, up) => {
    const el = $(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); for (const t of e.changedTouches) { down(t); TOUCH.lastLook[t.identifier] = { x: t.clientX, y: t.clientY, btn: id }; } el.classList.add('on'); }, { passive: false });
    el.addEventListener('touchmove', e => { e.preventDefault(); e.stopPropagation(); for (const t of e.changedTouches) { const L = TOUCH.lastLook[t.identifier]; if (L && (id === 'bFire' || id === 'bFire2' || id === 'bAds')) { INP.lookX += (t.clientX - L.x) * 1.6; INP.lookY += (t.clientY - L.y) * 1.6; L.x = t.clientX; L.y = t.clientY; } } }, { passive: false });
    const end = e => { e.preventDefault(); e.stopPropagation(); for (const t of e.changedTouches) { if (up) up(t); delete TOUCH.lastLook[t.identifier]; } if (!(id === 'bAds' && P.adsHeld)) el.classList.remove('on'); };
    el.addEventListener('touchend', end, { passive: false }); el.addEventListener('touchcancel', end, { passive: false });
  };
  btn('bFire', t => { TOUCH.fireIds.add(t.identifier); INP.fire = true; AU.init(); }, t => { TOUCH.fireIds.delete(t.identifier); INP.fire = TOUCH.fireIds.size > 0; });
  btn('bFire2', t => { TOUCH.fireIds.add(t.identifier); INP.fire = true; }, t => { TOUCH.fireIds.delete(t.identifier); INP.fire = TOUCH.fireIds.size > 0; });
  btn('bAds', () => { P.adsHeld = !P.adsHeld; $('bAds').classList.toggle('on', P.adsHeld); });
  btn('bJump', () => press(P.inCar ? 'brake' : 'jump')); btn('bCrouch', () => press('crouch')); btn('bReload', () => press('reload'));
  btn('bMelee', () => press('melee')); btn('bSwap', () => press('swap')); btn('bCam', () => press('cam')); btn('bAct', () => press('act')); btn('bPause', () => press('pause'));
  const surface = document.body;
  surface.addEventListener('touchstart', e => {
    if (!(G.state === 'city' || G.state === 'apt')) return;
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('.menu,.tb')) continue;
      if (t.clientX < window.innerWidth * .42 && !TOUCH.joy) { TOUCH.joy = { id: t.identifier, x: t.clientX, y: t.clientY }; joyEl.style.left = t.clientX + 'px'; joyEl.style.top = t.clientY + 'px'; joyEl.style.opacity = 1; knob.style.transform = 'translate(0,0)'; }
      else if (!TOUCH.look) { TOUCH.look = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t0: performance.now() }; }
    }
  }, { passive: true });
  surface.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (TOUCH.joy && t.identifier === TOUCH.joy.id) {
        let dx = t.clientX - TOUCH.joy.x, dy = t.clientY - TOUCH.joy.y; const L = Math.hypot(dx, dy), R = 56;
        if (L > R) { dx = dx / L * R; dy = dy / L * R; }
        INP.mx = dx / R; INP.my = -dy / R; INP.joyMag = Math.min(1, L / R); knob.style.transform = `translate(${dx}px,${dy}px)`;
      } else if (TOUCH.look && t.identifier === TOUCH.look.id) { INP.lookX += (t.clientX - TOUCH.look.x) * 1.5; INP.lookY += (t.clientY - TOUCH.look.y) * 1.5; TOUCH.look.x = t.clientX; TOUCH.look.y = t.clientY; }
    }
    if (G.state === 'city' || G.state === 'apt') e.preventDefault();
  }, { passive: false });
  const endT = e => {
    for (const t of e.changedTouches) {
      if (TOUCH.joy && t.identifier === TOUCH.joy.id) { TOUCH.joy = null; INP.mx = INP.my = 0; INP.joyMag = 0; joyEl.style.opacity = 0; }
      if (TOUCH.look && t.identifier === TOUCH.look.id) {
        const moved = Math.hypot(t.clientX - TOUCH.look.sx, t.clientY - TOUCH.look.sy); if (moved < 12 && performance.now() - TOUCH.look.t0 < 280) tapAt(t.clientX, t.clientY);
        TOUCH.look = null;
      }
    }
  };
  surface.addEventListener('touchend', endT); surface.addEventListener('touchcancel', endT);
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
  P.cur = i; P.reloadT = 0; P.cycleT = 0; P.meleeT = 0; P.switchT = instant ? 0 : .38; P.shellMode = false; P.rStages = null;
  buildVM(); buildTPPWeapon(); drawReticleHUD(); updateHUDWeapon();
}

/* ---------------- viewmodel ---------------- */
const VM = { root: new T.Group(), holder: new T.Group(), gun: null, gun2: null, sway: new T.Vector2(), kick: { z: 0, rx: 0, ry: 0, rz: 0 }, bob: 0, flash: null, flashT: 0, arms: null };
vmScene.add(VM.root); VM.root.add(VM.holder);
const limbGeo = new T.CylinderGeometry(.04, .05, 1, 10);
function buildArms() {
  if (VM.arms) { VM.root.remove(VM.arms.g); }
  const o = OUTFITS[G.char.outfit]; const g = new T.Group(); VM.root.add(g);
  const sleeve = new T.MeshStandardMaterial({ color: lc(o.top), roughness: .55, metalness: .2 });
  const glove = new T.MeshStandardMaterial({ color: lc(0x121216), roughness: .45, metalness: .3 });
  const skin = new T.MeshStandardMaterial({ color: lc(SKINS[G.char.skin]), roughness: .55 });
  const accent = new T.MeshBasicMaterial({ color: lc(o.accent), toneMapped: false });
  const mk = () => { const f = new T.Mesh(limbGeo, sleeve); const cuff = new T.Mesh(new T.CylinderGeometry(.043, .043, .025, 10), accent); const wrist = new T.Mesh(new T.CylinderGeometry(.032, .035, .05, 10), skin); const h = new T.Group(); const palm = new T.Mesh(new T.BoxGeometry(.06, .05, .1), glove); palm.position.set(0, -.012, .0); h.add(palm); const fing = new T.Mesh(new T.BoxGeometry(.058, .03, .05), glove); fing.position.set(0, -.04, -.03); fing.rotation.x = .6; h.add(fing); const thumb = new T.Mesh(new T.BoxGeometry(.02, .02, .05), glove); thumb.position.set(-.035, .0, -.03); h.add(thumb); g.add(f, cuff, wrist, h); return { f, cuff, wrist, h }; };
  VM.arms = { g, R: mk(), L: mk() };
}
const _Y = new T.Vector3(0, 1, 0);
function placeArm(A, hand, elbow, show) {
  A.f.visible = A.cuff.visible = A.wrist.visible = A.h.visible = show;
  if (!show) return;
  const d = elbow.clone().sub(hand); const L = d.length(); d.normalize();
  const wr = hand.clone().addScaledVector(d, .06);
  A.f.position.copy(wr).addScaledVector(d, L / 2); A.f.scale.set(1, L, 1); A.f.quaternion.setFromUnitVectors(_Y, d);
  A.cuff.position.copy(wr).addScaledVector(d, .05); A.cuff.quaternion.copy(A.f.quaternion);
  A.wrist.position.copy(hand).addScaledVector(d, .03); A.wrist.quaternion.copy(A.f.quaternion);
  A.h.position.copy(hand);
}
function buildVM() {
  if (VM.gun) VM.holder.remove(VM.gun.g); if (VM.gun2) VM.holder.remove(VM.gun2.g);
  const s = P.s(); VM.gun = buildWeapon(s.w, s.cfg); VM.holder.add(VM.gun.g); VM.gun2 = null;
  if (s.w.dual) { VM.gun2 = buildWeapon(W.slasher, s.cfg); VM.holder.add(VM.gun2.g); VM.gun2.g.scale.setScalar(.75); }
  if (!VM.flash) { VM.flash = new T.Sprite(new T.SpriteMaterial({ map: flashTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); VM.flash.visible = false; vmScene.add(VM.flash); }
  if (!VM.arms) buildArms();
  P.starGeo = s.w.model === 'stars' ? VM.gun.meta.starGeo : P.starGeo;
}
function vmPose(w) {
  const k = w.kind;
  if (k === 'melee') return { p: new T.Vector3(.27, -.3, -.46), r: new T.Euler(.78, .38, -.28) };
  if (k === 'saw') return { p: new T.Vector3(.16, -.3, -.42), r: new T.Euler(.25, .05, -.05) };
  if (k === 'throw') return { p: new T.Vector3(.2, -.2, -.34), r: new T.Euler(.4, -.2, -.2) };
  if (w.cls === 'pistol' || w.model === 'blaster') return { p: new T.Vector3(.12, -.115, -.3), r: new T.Euler(0, .04, 0) };
  return { p: new T.Vector3(.14, -.135, -.32), r: new T.Euler(0, .025, 0) };
}
const tmpV = new T.Vector3(), tmpV2 = new T.Vector3();
function updateVM(dt) {
  const s = P.s(); if (!s || !VM.gun) return;
  const w = s.w, base = vmPose(w), gun = VM.gun;
  const hidden = (G.camMode === 'tpp' && G.state === 'city') || P.inCar || (P.ads > .92 && s.st.overlay && w.kind === 'gun');
  VM.root.visible = !hidden;
  const pos = base.p.clone(), rot = new T.Vector3(base.r.x, base.r.y, base.r.z);
  // ADS
  if (w.kind === 'gun' || w.kind === 'plasma') {
    const adsZ = gun.meta.glb && !s.st.overlay ? -.3 : s.st.overlay ? -.16 : (gun.meta.irons || s.cfg.optic === 'iron') ? (w.cls === 'pistol' ? -.3 : -.24) : (w.cls === 'pistol' ? -.3 : -.22);
    const ap = new T.Vector3(-gun.sightX, -gun.sightY, adsZ);
    pos.lerp(ap, P.ads); rot.multiplyScalar(1 - P.ads);
  }
  // sprint & tac sprint
  const sp = P.sprintK || 0;
  if (sp > 0 && w.kind !== 'melee') {
    if (P.tac) { pos.add(new T.Vector3(-.02, .07, .03).multiplyScalar(sp)); rot.x += 1.0 * sp; rot.z -= .5 * sp; rot.y -= .2 * sp; }
    else { pos.add(new T.Vector3(-.06, -.05, .05).multiplyScalar(sp)); rot.y += .75 * sp; rot.x -= .25 * sp; rot.z += .3 * sp; }
  }
  if (w.kind === 'melee' && sp > 0) { rot.x += .3 * sp; pos.y -= .03 * sp; }
  // bob + sway
  const spd = Math.hypot(P.vel.x, P.vel.z) * (P.onGround ? 1 : .2); VM.bob += dt * (4 + spd * 1.2);
  const ba = Math.min(1, spd / 6) * (1 - P.ads * .85) * (sp > 0 ? 1.8 : 1);
  pos.x += Math.sin(VM.bob) * .011 * ba; pos.y += -Math.abs(Math.cos(VM.bob)) * .013 * ba; rot.z += Math.sin(VM.bob) * .02 * ba;
  pos.y += Math.sin(G.t * 1.6) * .002 * (1 - P.ads); // breathing
  VM.sway.x = damp(VM.sway.x, 0, 8, dt); VM.sway.y = damp(VM.sway.y, 0, 8, dt);
  pos.x += VM.sway.x * (1 - P.ads * .7); pos.y += VM.sway.y * (1 - P.ads * .7); rot.y += VM.sway.x * 2; rot.x += VM.sway.y * 2;
  pos.y -= P.landDip * .06; pos.y -= P.slide > 0 ? .02 : 0; if (P.slide > 0) rot.z += .25;
  // recoil kick (spring back)
  const K = VM.kick; K.z = damp(K.z, 0, 14, dt); K.rx = damp(K.rx, 0, 12, dt); K.ry = damp(K.ry, 0, 12, dt); K.rz = damp(K.rz, 0, 12, dt);
  pos.z += K.z; rot.x += K.rx; rot.y += K.ry; rot.z += K.rz;
  // switching
  if (P.switchT > 0) { const k = P.switchT / .38; pos.y -= k * .3; rot.x -= k * .7; }
  // inspect
  if (P.inspectT > 0) { const k = Math.sin(clamp(1 - P.inspectT / 2.4, 0, 1) * Math.PI); rot.y += k * 1.3; rot.z += k * .5; pos.x -= k * .08; pos.z += k * .05; pos.y += k * .03; }
  // reload choreography
  let leftT = null; let showL = true;
  const sup = gun.meta.sup || new T.Vector3(0, 0, -.3);
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
    if (w.action === 'pump') { gun.pumpG.position.z = Math.sin(k * Math.PI) * .09; leftT = sup.clone().add(new T.Vector3(0, 0, gun.pumpG.position.z)); }
    if (w.action === 'bolt') { const b = Math.sin(k * Math.PI); gun.boltG.position.z = b * .08; gun.boltG.rotation.z = -b * .8; rot.z += b * .25; }
  } else { gun.pumpG.position.z = damp(gun.pumpG.position.z, 0, 20, dt); if (P.reloadT <= 0) gun.boltG.position.z = 0, gun.boltG.rotation.z = 0; }
  // melee choreography
  let swingK = -1;
  if (P.meleeT > 0) {
    const k = 1 - P.meleeT / P.meleeDur; swingK = k;
    if (P.quick) { const b = Math.sin(k * Math.PI); pos.add(new T.Vector3(-.12 * b, .06 * b, -.18 * b)); rot.y -= b * .9; rot.z += b * .6; }
    else if (w.model === 'knife' || w.dual) {
      const alt = P.combo % 2;
      if (w.dual && alt) { /* left-hand stroke */ }
      else { const b = k < .3 ? -k / .3 * .1 : k < .55 ? -.1 + (k - .3) / .25 * .55 : .45 * (1 - (k - .55) / .45); pos.z -= b * .5; pos.x -= b * .25; rot.x -= b * 1.3; rot.y += b * .9; rot.z += b * 1.2; }
    } else if (w.kind === 'melee') {
      let e;
      if (k < .25) { const a = k / .25; e = { x: 1.9, y: -.6, z: -1.1, px: .38, py: -.02, pz: -.32, a }; }
      else if (k < .55) { const a = (k - .25) / .3; e = { x: lerp(1.9, .35, a), y: lerp(-.6, 1.0, a), z: lerp(-1.1, 1.45, a), px: lerp(.38, -.3, a), py: lerp(-.02, -.32, a), pz: lerp(-.32, -.52, a), a: 1 }; }
      else { const a = 1 - (k - .55) / .45; e = { x: lerp(base.r.x, .35, a), y: lerp(base.r.y, 1.0, a), z: lerp(base.r.z, 1.45, a), px: lerp(base.p.x, -.3, a), py: lerp(base.p.y, -.32, a), pz: lerp(base.p.z, -.52, a), a: 1 }; }
      const a = e.a; if (P.combo % 2) { e.z = -e.z * .7; e.y = -e.y; e.px = -e.px * .6; }
      rot.set(lerp(rot.x, e.x, a), lerp(rot.y, e.y, a), lerp(rot.z, e.z, a)); pos.set(lerp(pos.x, e.px, a), lerp(pos.y, e.py, a), lerp(pos.z, e.pz, a));
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
  const grip = (gun.meta.grip || new T.Vector3(0, -.04, .07)).clone();
  const handR = grip.clone().applyMatrix4(VM.holder.matrixWorld);
  let handL;
  if (VM.gun2) handL = new T.Vector3(0, 0, .04).applyMatrix4(VM.gun2.g.matrixWorld);
  else if (w.kind === 'melee' && (w.model === 'knife' || w.model === 'karambit')) handL = null;
  else if (w.kind === 'melee') handL = grip.clone().add(new T.Vector3(0, 0, .11)).applyMatrix4(VM.holder.matrixWorld);
  else if (w.kind === 'throw') handL = null;
  else if (w.kind === 'saw') handL = new T.Vector3(0, .1, -.02).applyMatrix4(VM.holder.matrixWorld);
  else handL = (leftT || sup).clone().applyMatrix4(VM.holder.matrixWorld);
  const adsA = P.ads * P.ads; placeArm(VM.arms.R, handR, handR.clone().add(new T.Vector3(lerp(.14, .34, adsA), lerp(-.26, -.46, adsA), lerp(.3, .1, adsA))), true);
  VM.arms.R.h.quaternion.copy(VM.holder.quaternion);
  if (handL) { placeArm(VM.arms.L, handL, handL.clone().add(new T.Vector3(lerp(-.2, -.36, adsA), lerp(-.24, -.44, adsA), lerp(.3, .08, adsA))), true); VM.arms.L.h.quaternion.copy(VM.holder.quaternion); VM.arms.L.h.rotateZ(.3); }
  else placeArm(VM.arms.L, tmpV2.set(0, 0, 0), tmpV2, false);
  // muzzle flash
  if (VM.flashT > 0) {
    VM.flashT -= dt; VM.flash.visible = !hidden; gun.muzzle.getWorldPosition(VM.flash.position);
    VM.flash.material.rotation = Math.random() * TAU; VM.flash.scale.setScalar(rand(.14, .22) * (w.cls === 'shotgun' || w.cls === 'sniper' ? 1.6 : 1));
  } else VM.flash.visible = false;
  vmFlash.intensity = VM.flashT > 0 ? 3 : 0;
}

/* ---------------- third-person body ---------------- */
let PBODY = null, PGUN = null;
function buildPlayerBody() {
  if (PBODY) scene.remove(PBODY.root);
  const o = OUTFITS[G.char.outfit];
  const g = CHARS_READY && makeGLBRig(playerGLBId());
  if (g) { customizeGLB(g, playerCust()); PBODY = g; PBODY.st = { speed: 0, phase: 0, hold: 'rifle', t: 0 }; scene.add(PBODY.root); return; }
  PBODY = makeRig({ gender: G.char.gender, skin: SKINS[G.char.skin], hair: G.char.hair, hairCol: HAIR_COLS[G.char.hairCol], top: o.top, bottom: o.bottom, accent: o.accent, sleeve: 1, visor: o.visor, leather: G.char.outfit === 'nomad' || G.char.outfit === 'samurai', collar: G.char.outfit === 'corpo' });
  PBODY.st = { speed: 0, phase: 0, hold: 'rifle', t: 0 }; scene.add(PBODY.root);
}
function buildTPPWeapon() {
  if (!PBODY) return;
  if (PGUN) { if (PGUN.g.parent) PGUN.g.parent.remove(PGUN.g); scene.remove(PGUN.flash); }
  const s = P.s(); const built = buildWeapon(s.w, s.cfg, true);
  const holder = new T.Group(); built.g.rotation.x = -Math.PI / 2; holder.add(built.g);
  if (s.w.kind === 'melee') { built.g.rotation.x = Math.PI / 2 + .3; }
  built.g.position.set(0, PBODY.glb ? -.02 : -.07, PBODY.glb ? .01 : -.02);
  if (PBODY.glb) { const mg = attachToBone(PBODY.rArm.hand, holder, 0, 0, Math.PI); PBODY.gunMount = s.w.kind === 'melee' ? null : { g: mg, mode: 'tpp' }; } else PBODY.rArm.hand.add(holder);
  PGUN = { g: holder, muzzle: built.muzzle, flashT: 0 };
  PGUN.flash = new T.Sprite(new T.SpriteMaterial({ map: flashTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); PGUN.flash.visible = false; scene.add(PGUN.flash);
}

/* ---------------- shooting ---------------- */
const _dir = new T.Vector3(), _o = new T.Vector3();
function aimDir(spreadDeg) {
  const f = P.fwd(); if (spreadDeg <= 0) return f;
  const r = Math.sqrt(Math.random()) * spreadDeg * Math.PI / 180, a = Math.random() * TAU;
  const right = new T.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); const up = new T.Vector3().crossVectors(right, f).normalize();
  return f.addScaledVector(right, Math.cos(a) * Math.tan(r)).addScaledVector(up, Math.sin(a) * Math.tan(r)).normalize();
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
function hitscan(o, d, maxR) {
  let best = null, bt = maxR;
  for (const e of ENEMIES) { const dx = e.pos.x - o.x, dz = e.pos.z - o.z; if (dx * dx + dz * dz > (maxR + 2) * (maxR + 2)) continue; const h = e.partAt(o, d); if (h && h.t < bt) { bt = h.t; best = { e, part: h.part, t: h.t }; } }
  for (const w of WISPS) { const t = raySphere(o, d, w.pos, .45); if (t > 0 && t < bt) { bt = t; best = { w, t }; } }
  for (const c of CIVS) { const h = c.partAt(o, d); if (h && h.t < bt) { bt = h.t; best = { civ: c, part: h.part, t: h.t }; } }
  const ch = rayCar(o, d, bt); if (ch && ch.car !== P.inCar) { bt = ch.t; best = { car: ch.car, t: ch.t, n: ch.n, glass: ch.glass }; }
  const wh = rayBoxes(o, d, bt);
  if (wh && (!best || wh.t < best.t)) return { world: true, t: wh.t, n: wh.n, box: wh.box };
  return best;
}
function fire() {
  const s = P.s(), w = s.w;
  if (w.kind === 'melee') return startMelee(false);
  if (w.kind === 'saw') return;
  if (P.fireCd > 0 || P.cycleT > 0 || P.switchT > 0 || P.meleeT > 0) return;
  if (P.reloadT > 0) { if (shellInterruptible() && s.mag > 0) { P.reloadT = 0; P.shellMode = false; if (w.action === 'pump' && P.shellEmpty) { P.cycleT = P.cycleDur = .5; AU.play('foley_pump', { vol: .9 }) || AU.rack(); return; } } else return; }
  if (s.mag <= 0) { AU.click(); P.fireCd = .25; startReload(); return; }
  if (P.sprintK > .2) { P.sprintBlock = .12; return; }
  s.mag--; P.fireCd = 60 / s.st.rpm; P.lastFire = G.t;
  const sup = s.st.sup;
  if (w.kind === 'plasma' || w.kind === 'throw') {
    const tgtHit = hitscan(P.eye(), P.fwd(), 300); const tp = P.eye().addScaledVector(P.fwd(), tgtHit ? tgtHit.t : 120);
    const from = muzzleWorld(); const v = tp.clone().sub(from).normalize();
    const sp = currentSpread(s); const d = aimDir(sp); v.lerp(d, .3).normalize();
    const p = makeProj(w.kind === 'plasma' ? 'plasma' : 'star', from, v.multiplyScalar(w.speed), 'player', w.dmg, { w, head: w.head, splash: w.splash || 0 });
    if (w.kind === 'throw') { P.meleeT = P.meleeDur = .28; P.quick = false; AU.swish(false); }
    else { AU.shot(w, false); VM.flashT = .05; }
  } else {
    const o = P.eye(); const sp = currentSpread(s); const from = muzzleWorld();
    for (let i = 0; i < (w.pellets || 1); i++) {
      const d = aimDir(sp); const h = hitscan(o, d, 320);
      const end = o.clone().addScaledVector(d, h ? h.t : 200);
      if (i < 3 || Math.random() < .3) tracer(from, end, sup ? 0x9ab0ff : 0xffd28a, w.pellets > 1 ? .6 : 1);
      if (!h) continue;
      if (h.world) { impact(end, h.n, surfOfHit(h, end), { pellet: w.pellets > 1, fx: i < 5, snd: i === 0, size: (w.pellets > 1 ? .1 : w.cls === 'sniper' || w.cls === 'lmg' ? .2 : .16) }); continue; }
      if (h.car) { const dist = h.t; const dmg = dist <= s.st.r1 ? s.st.dmg : dist >= s.st.r2 ? s.st.dmgMin : lerp(s.st.dmg, s.st.dmgMin, (dist - s.st.r1) / (s.st.r2 - s.st.r1)); carHit(h.car, dmg, end, h.n, h.glass); continue; }
      if (h.civ) { burst(FXN, end, 7, 2.5, .5, .09, .04, COL.blood, 7, .3); h.civ.hurt(s.st.dmg * (h.part === 'head' ? w.head : 1), 'player'); continue; }
      if (h.w) { h.w.hp -= s.st.dmg; hitMarker(h.w.hp <= 0); burst(FXA, end, 6, 3, .3, .2, .02, COL.ember, 0); continue; }
      const e = h.e; const dist = h.t;
      let dmg = dist <= s.st.r1 ? s.st.dmg : dist >= s.st.r2 ? s.st.dmgMin : lerp(s.st.dmg, s.st.dmgMin, (dist - s.st.r1) / (s.st.r2 - s.st.r1));
      dmg *= h.part === 'head' ? w.head : h.part === 'limb' ? .88 : 1;
      if (e.possessed) dmg *= .9;
      const col = e.type === 'reptile' ? COL.green : e.type === 'shifter' || e.type === 'vampire' ? COL.ichor : e.type === 'demon' ? COL.ember : e.type === 'witch' ? COL.purple : COL.blood;
      burst(e.type === 'demon' || e.type === 'witch' ? FXA : FXN, end, 7, 2.5, .5, .09, .04, col, 7, .3);
      const killed = e.hurt(dmg, h.part, d, { w, big: dmg > 90, dist });
      hitMarker(killed, h.part === 'head'); if (killed && dist > P.longest) P.longest = dist;
    }
    AU.shot(w, sup); if (!sup) VM.flashT = .045;
    if (!sup) { flashLight.position.copy(P.eye()).addScaledVector(P.fwd(), 1.2); flashLight.color.set(0xffb060); flashLight.intensity = 5; G.flashT = .05; }
    if (G.camMode === 'tpp' && PGUN && !sup) { PGUN.flash.position.copy(from); PGUN.flash.visible = true; PGUN.flash.scale.setScalar(.6); PGUN.flash.material.rotation = Math.random() * TAU; PGUN.flashT = .05; }
    // brass
    if (w.pellets === 1 && w.action !== 'bolt' && w.model !== 'prev') { const r = new T.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); const bp = P.eye().addScaledVector(P.fwd(), .4).addScaledVector(r, .12).setY(P.eye().y - .1); FXN.emit(bp.x, bp.y, bp.z, r.x * 2.5 + rand(-.3, .3), 2 + rand(0, 1), r.z * 2.5 + rand(-.3, .3), 1.2, .03, .03, C(0xc9a24a), 1, 12); }
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
  const s = P.s(), w = s.w;
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
  const f = P.fwd(); const fl = new T.Vector2(f.x, f.z).normalize();
  let any = false; const targets = [];
  for (const e of ENEMIES) {
    if (e.dead) continue; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z; const d = Math.hypot(dx, dz);
    if (d > reach + e.r * e.scale) continue; const dot = (dx * fl.x + dz * fl.y) / (d || 1); if (dot < .45 && d > 1) continue;
    targets.push([d, e]);
  }
  targets.sort((a, b) => a[0] - b[0]);
  const cleave = w.model === 'katana' || w.model === 'nodachi' || w.model === 'saw';
  for (const [d, e] of targets.slice(0, cleave ? 3 : 1)) {
    let mult = 1; if (w.wood && e.type === 'vampire') mult = 2.2;
    const hp = e.pos.clone().setY(1.2);
    const killed = e.hurt(dmg * mult, 'body', f, { w, big: !quick && (w.model === 'katana' || w.model === 'nodachi') });
    if (w.bleed && !killed) e.bleed = 3; if (w.knock && !killed) e.vel.addScaledVector(new T.Vector3(f.x, 0, f.z).normalize(), 9);
    burst(FXN, hp, 14, 3.5, .6, .1, .05, e.type === 'reptile' ? COL.green : COL.blood, 8, .2); AU.thud(); hitMarker(killed); any = true; shake(.12);
  }
  for (const wi of WISPS) if (wi.pos.distanceTo(P.eye()) < reach + .5) { wi.hp -= dmg; any = true; hitMarker(wi.hp <= 0); }
  if (any) G.hitStop = .05;
}
function sawTick(dt) {
  const s = P.s(); const firing = (INP.fire || mouseDown) && G.state === 'city' && s.mag > 0 && P.reloadT <= 0;
  P.sawRev = damp(P.sawRev, firing ? 1 : .15, 8, dt);
  AU.engineSet(G.state === 'city' && !P.inCar, 6 + P.sawRev * 22);
  if (!firing) return;
  s.mag = Math.max(0, s.mag - 9 * dt); if (s.mag <= 0 && s.res > 0) startReload();
  P.sawAcc = (P.sawAcc || 0) + dt; if (P.sawAcc < .1) return; P.sawAcc = 0;
  const f = P.fwd(); for (const e of ENEMIES) {
    if (e.dead) continue; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z; const d = Math.hypot(dx, dz); if (d > 2.6) continue;
    if ((dx * f.x + dz * f.z) / (d || 1) < .4 && d > 1) continue;
    const k = e.hurt(s.w.dmg * .1, 'body', f, { w: s.w, big: true }); hitMarker(k); shake(.06);
    burst(FXN, e.pos.clone().setY(1.2), 10, 5, .5, .1, .05, e.type === 'reptile' ? COL.green : COL.blood, 9, .4);
  }
}

/* ---------------- player update ---------------- */
function updatePlayer(dt) {
  if (P.dead) { P.deadT += dt; P.eyeH = damp(P.eyeH, .3, 3, dt); return; }
  if (P.inCar) return driveUpdate(dt);
  const s = P.s(), w = s ? s.w : null;
  // look
  const sensK = (IS_TOUCH ? .0042 : .0022) * G.sens * (P.ads > .5 ? (s && s.st.zoom > 2 ? .45 : .7) : 1);
  P.yaw -= INP.lookX * sensK; P.pitch -= INP.lookY * sensK;
  VM.sway.x += -INP.lookX * .00022 * G.sens; VM.sway.y += INP.lookY * .00022 * G.sens; VM.sway.x = clamp(VM.sway.x, -.04, .04); VM.sway.y = clamp(VM.sway.y, -.04, .04);
  INP.lookX = 0; INP.lookY = 0;
  if (!IS_TOUCH) { if (KEY.ArrowLeft) P.yaw += 2.2 * dt; if (KEY.ArrowRight) P.yaw -= 2.2 * dt; if (KEY.ArrowUp) P.pitch += 1.6 * dt; if (KEY.ArrowDown) P.pitch -= 1.6 * dt; }
  // recoil: apply buffered kick quickly, partial recovery
  const ry = P.recoilBuf.y * Math.min(1, dt * 22), rx = P.recoilBuf.x * Math.min(1, dt * 22);
  P.pitch += ry; P.yaw += rx; P.recoilBuf.y -= ry; P.recoilBuf.x -= rx;
  P.recoverPitch = (P.recoverPitch || 0) + ry;
  if (G.t - P.lastFire > .12 && P.recoverPitch > 0) { const r = Math.min(P.recoverPitch, dt * .25); P.pitch -= r * .6; P.recoverPitch -= r; }
  // possession: the demon fights you for the wheel
  if (P.possT > 0) {
    P.possT -= dt; P.hp -= 5 * dt; P.regenT = 3;
    P.yaw += Math.sin(G.t * 3.1) * dt * 1.2; P.pitch += Math.sin(G.t * 2.3) * dt * .7;
    if (P.hp <= 0) killPlayer('possessed');
    if (P.possT <= 0) { P.exorcisms++; addScore(150, 'EXORCISED YOURSELF'); flashBanner('EXORCISED', 'The demon lost its grip', 1.2); AU.roar(0, .6); }
  }
  P.pitch = clamp(P.pitch, -1.45, 1.45);
  // aim assist on touch
  if (IS_TOUCH && w && w.kind !== 'melee') aimAssist(dt);
  // sniper sway
  if (P.ads > .9 && s && s.st.zoom > 3) { P.steadyK = (KEY.ShiftLeft && P.steady > 0) ? (P.steady -= dt, .15) : (P.steady = Math.min(4, P.steady + dt * .5), 1); P.yaw += Math.sin(G.t * .9) * .0022 * P.steadyK * dt * 60 * .016; P.pitch += Math.sin(G.t * 1.7) * .0018 * P.steadyK * dt * 60 * .016; }
  // movement input
  let mx = 0, mz = 0;
  if (IS_TOUCH) { mx = INP.mx; mz = INP.my; } else { mx = (KEY.KeyD ? 1 : 0) - (KEY.KeyA ? 1 : 0); mz = (KEY.KeyW ? 1 : 0) - (KEY.KeyS ? 1 : 0); }
  if (P.possT > 0 && Math.sin(G.t * 1.3) > .6) { mx = -mx; mz = -mz; }
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  // ADS
  const wantAds = (IS_TOUCH ? P.adsHeld : rmb || KEY.KeyZ) && w && (w.kind === 'gun' || w.kind === 'plasma' || w.kind === 'throw') && P.reloadT <= 0 || (P.reloadT > 0 && P.shellMode && (IS_TOUCH ? P.adsHeld : rmb));
  const adsSpeed = s ? 1 / s.st.adsT : 4;
  P.ads = clamp(P.ads + (wantAds && P.switchT <= 0 && (P.sprintK || 0) < .2 ? dt * adsSpeed : -dt * adsSpeed * 1.4), 0, 1);
  // sprint
  const sprintKey = IS_TOUCH ? (INP.joyMag > .92 && mz > .6) : (KEY.ShiftLeft || KEY.ShiftRight);
  const canSprint = mz > .3 && P.onGround && !P.crouching && P.ads < .3 && !(P.fireCd > 0 && (INP.fire || mouseDown)) && P.reloadT <= 0 || (P.reloadT > 0 && !IS_TOUCH && sprintKey && mz > .3);
  P.sprint = sprintKey && canSprint; P.tac = P.sprint && (P.tacReq || P.tacHold);
  if (P.sprint && IS_TOUCH) { P.sprintTime = (P.sprintTime || 0) + dt; P.tac = P.sprintTime > 1.6; } else P.sprintTime = 0;
  if (P.sprint && P.reloadT > 0 && !P.shellMode && P.rStages) { /* sprinting cancels a reload like CoD, unless the new mag is already seated */ if (P.reloadCommitted) { P.reloadT = 0; P.rStages = null; } else if (P.reloadEl > .25) { P.reloadT = 0; P.rStages = null; if (P.reloadEmpty) { /* mag already dropped: you keep nothing */ } } }
  P.sprintK = damp(P.sprintK || 0, P.sprint ? 1 : 0, 9, dt);
  // crouch / slide
  if (took('crouch')) {
    if (P.sprint && P.onGround && P.slide <= 0) { P.slide = .8; const f = new T.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); P.vel.x = f.x * 11.5; P.vel.z = f.z * 11.5; P.crouching = true; P.slideCam = 1; AU.nz(.5, 'lowpass', 1200, 300, 1, .3); }
    else P.crouching = !P.crouching;
  }
  if (P.sprint && P.crouching && P.slide <= 0) P.crouching = false;
  const hexK = P.hexT > 0 ? .55 : 1; if (P.hexT > 0) P.hexT -= dt; if (P.acidT > 0) { P.acidT -= dt; }
  const mob = s ? s.st.mob : 1;
  let spd = (P.sprint ? (P.tac ? 9.4 : 7.6) : 5.1) * mob * hexK;
  if (P.crouching) spd *= .55; spd *= lerp(1, .55, P.ads);
  const f = new T.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), r = new T.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  const wish = f.multiplyScalar(mz).add(r.multiplyScalar(mx)).multiplyScalar(spd);
  if (P.slide > 0) { P.slide -= dt; P.vel.x = damp(P.vel.x, 0, 1.6, dt); P.vel.z = damp(P.vel.z, 0, 1.6, dt); if (P.slide <= 0) { P.slideCam = 0; } }
  else { const k = P.onGround ? 12 : 2.5; P.vel.x = damp(P.vel.x, wish.x, k, dt); P.vel.z = damp(P.vel.z, wish.z, k, dt); }
  P.slideCam = damp(P.slideCam || 0, P.slide > 0 ? 1 : 0, 8, dt);
  if (took('jump') && P.onGround) { P.vel.y = 6.4; P.onGround = false; P.crouching = false; if (P.slide > 0) { P.slide = 0; } }
  P.vel.y -= 19 * dt;
  P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt; P.pos.y += P.vel.y * dt;
  collideCircle(P.pos, .36, P.pos.y, P.crouching ? 1.2 : 1.8);
  for (const c of CARS) { const dx = P.pos.x - c.pos.x, dz = P.pos.z - c.pos.z; const fwd = c.fwd(); const along = dx * fwd.x + dz * fwd.z; const side = dx * fwd.z - dz * fwd.x; if (Math.abs(along) < 2.6 && Math.abs(side) < 1.4 && P.pos.y < 1.3) { const pushA = 2.6 - Math.abs(along), pushS = 1.4 - Math.abs(side); if (pushS < pushA) { const n = Math.sign(side) * pushS; P.pos.x += fwd.z * n; P.pos.z -= fwd.x * n; } else { const n = Math.sign(along) * pushA; P.pos.x += fwd.x * n; P.pos.z += fwd.z * n; } } }
  const gnd = groundAt(P.pos.x, P.pos.z, P.pos.y);
  if (P.pos.y <= gnd) { if (!P.onGround && P.vel.y < -7) { P.landDip = 1; AU.thud(); } P.pos.y = gnd; P.vel.y = 0; P.onGround = true; } else if (P.pos.y > gnd + .05) P.onGround = false;
  P.landDip = damp(P.landDip, 0, 6, dt);
  P.crouch = damp(P.crouch, P.slide > 0 ? 1.3 : P.crouching ? 1 : 0, 10, dt);
  P.eyeH = 1.66 - P.crouch * .55;
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
      else if (!P.triggerHeld) fire();
    }
    P.triggerHeld = firing;
    if (took('reload')) startReload();
    if (took('melee')) { if (P.possT > 0) { P.possMash++; P.possT -= .7; VM.kick.z -= .05; AU.swish(); } else startMelee(true); }
    if (took('swap')) setWeapon(P.cur === 0 ? 1 : 0);
    if (took('s1')) setWeapon(0); if (took('s2')) setWeapon(1); if (took('s3')) setWeapon(2);
    if (took('inspect') && P.reloadT <= 0) P.inspectT = 2.4;
  }
  if (took('cam')) toggleCam();
  // health regen
  P.regenT -= dt; if (P.regenT <= 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + 32 * dt);
  // body facing for third person
  const mv = Math.hypot(P.vel.x, P.vel.z);
  const aimingNow = P.ads > .1 || G.t - P.lastFire < 1.2 || P.meleeT > 0 || (w && w.kind === 'saw' && P.sawRev > .4);
  if (aimingNow || mv < .5) P.bodyYaw = lerpAngle(P.bodyYaw, P.yaw, 1 - Math.exp(-14 * dt));
  else { const my = Math.atan2(-P.vel.x, -P.vel.z); P.bodyYaw = lerpAngle(P.bodyYaw, my, 1 - Math.exp(-10 * dt)); }
}
function lerpAngle(a, b, t) { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * t; }
function aimAssist(dt) {
  let best = null, bestA = P.ads > .5 ? .09 : .06; const o = P.eye(), f = P.fwd();
  for (const e of ENEMIES) {
    if (e.dead || !e.R.root.visible) continue; const c = e.pos.clone().setY(e.pos.y + 1.2 * e.scale); const d = c.clone().sub(o); const L = d.length(); if (L > 60) continue;
    const a = Math.acos(clamp(d.dot(f) / L, -1, 1)); if (a < bestA) { bestA = a; best = d.normalize(); }
  }
  if (!best) return;
  const ty = Math.atan2(-best.x, -best.z), tp = Math.asin(best.y);
  const k = (P.ads > .5 ? 3.5 : 1.8) * dt;
  P.yaw = lerpAngle(P.yaw, ty, k); P.pitch = lerp(P.pitch, tp, k);
}
function toggleCam() { G.camMode = G.camMode === 'fpp' ? 'tpp' : 'fpp'; store('cam', G.camMode); $('pCam').textContent = 'Camera: ' + (G.camMode === 'fpp' ? 'first person' : 'third person'); flashBanner(G.camMode === 'fpp' ? 'FIRST PERSON' : 'THIRD PERSON', '', .7); }

/* ---------------- camera ---------------- */
const camState = { tppDist: 2.25 };
function updateCamera(dt) {
  const s = P.s(); const w = s && s.w;
  P.punch.x = damp(P.punch.x, 0, 10, dt); P.punch.y = damp(P.punch.y, 0, 10, dt);
  P.shakeA = damp(P.shakeA, 0, 6, dt);
  const sh = P.shakeA; const shx = (Math.random() - .5) * sh * .06, shy = (Math.random() - .5) * sh * .06;
  let roll = (P.slideCam || 0) * -.06 + Math.sin(VM.bob) * .003 * Math.min(1, Math.hypot(P.vel.x, P.vel.z) / 6);
  if (P.possT > 0) roll += Math.sin(G.t * 2.7) * .25;
  if (P.dead) roll = Math.min(1.2, P.deadT * .9);
  // fov
  const base = IS_TOUCH ? 66 : 64; let fov = base + (P.sprintK || 0) * 7 + (P.slide > 0 ? 5 : 0);
  if (s && (w.kind === 'gun' || w.kind === 'plasma' || w.kind === 'throw')) fov = lerp(fov, base / s.st.zoom, P.ads);
  if (P.inCar) fov = base + Math.min(14, Math.abs(P.inCar.speed) * .35);
  camera.fov = damp(camera.fov, fov, 16, dt); camera.updateProjectionMatrix();
  if (P.inCar) {
    const c = P.inCar; const f = c.fwd(); const want = c.pos.clone().addScaledVector(f, -6.2).add(new T.Vector3(0, 2.4, 0));
    camera.position.lerp(want, 1 - Math.exp(-6 * dt)); camera.lookAt(c.pos.clone().addScaledVector(f, 4).setY(1.2));
    camera.rotation.z += shx; P.yaw = Math.atan2(-f.x, -f.z); P.pitch = -.12;
    return;
  }
  const pitch = P.pitch + P.punch.y + shy, yaw = P.yaw + P.punch.x + shx;
  if (G.camMode === 'fpp' || G.state === 'apt') {
    camera.position.set(P.pos.x, P.pos.y + P.eyeH - P.landDip * .08 + (G.state === 'apt' ? 0 : 0), P.pos.z);
    camera.rotation.set(pitch, yaw, roll, 'YXZ');
  } else {
    const ads = P.ads; const dist = lerp(2.25, 1.2, ads) + (P.sprintK || 0) * .35;
    const piv = new T.Vector3(P.pos.x, P.pos.y + 1.55 - P.crouch * .45, P.pos.z);
    const q = new T.Quaternion().setFromEuler(new T.Euler(pitch, yaw, 0, 'YXZ'));
    // over-the-right-shoulder, swapping to the left shoulder when a wall is on the right (narrow sidewalks)
    const sideRay = new T.Vector3(1, 0, 0).applyQuaternion(q); const hr = rayBoxes(piv, sideRay, 1.2), hl = rayBoxes(piv, sideRay.clone().negate(), 1.2);
    const wantSide = hr && hr.t < .9 && !(hl && hl.t < hr.t) ? -1 : 1; camState.side = damp(camState.side === undefined ? 1 : camState.side, wantSide, 9, dt);
    const off = new T.Vector3(lerp(.55, .62, ads) * camState.side, .12, dist).applyQuaternion(q);
    const dir = off.clone().normalize(); const hit = rayBoxes(piv, dir, off.length() + .3);
    let L = off.length(); if (hit && hit.t < L + .3) L = Math.max(.3, hit.t - .3);
    camState.tppDist = damp(camState.tppDist, L, L < camState.tppDist ? 30 : 6, dt);
    camera.position.copy(piv).addScaledVector(dir, camState.tppDist);
    camera.rotation.set(pitch, yaw, roll, 'YXZ');
  }
}
function shake(a) { P.shakeA = Math.min(1.2, P.shakeA + a); }

/* ---------------- third person body animation ---------------- */
function updateBody(dt) {
  if (!PBODY) return;
  const show = G.state === 'city' && G.camMode === 'tpp' && !P.inCar;
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
  P.inCar = c; c.occ = true; P.ads = 0; P.reloadT = 0; flashBanner('BEHIND THE WHEEL', IS_TOUCH ? 'Stick to drive · JUMP = handbrake · ACT to exit' : 'WASD drive · Space handbrake · E to exit', 1.4);
  AU.engineSet(true, 0); $('bJump').textContent = 'BRAKE';
}
function exitCar() {
  const c = P.inCar; if (!c) return; c.occ = false; P.inCar = null; AU.engineSet(false);
  const side = new T.Vector3(Math.cos(c.h), 0, -Math.sin(c.h));
  P.pos.copy(c.pos).addScaledVector(side, -2.2); P.pos.y = 0; collideCircle(P.pos, .36, 0, 1.8); P.vel.set(0, 0, 0);
  P.yaw = c.h; $('bJump').textContent = 'JUMP';
}
function driveUpdate(dt) {
  const c = P.inCar; let x = 0, y = 0;
  if (IS_TOUCH) { x = INP.mx; y = INP.my; } else { x = (KEY.KeyD ? 1 : 0) - (KEY.KeyA ? 1 : 0); y = (KEY.KeyW ? 1 : 0) - (KEY.KeyS ? 1 : 0); }
  const brake = KEY.Space || took('brake');
  c.update(dt, { x, y, brake }); P.pos.copy(c.pos); P.vel.copy(c.fwd().multiplyScalar(c.speed));
  AU.engineSet(true, c.speed);
  INP.lookX = 0; INP.lookY = 0;
  P.regenT -= dt; if (P.regenT <= 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + 32 * dt);
  if (took('cam')) toggleCam();
  PRESS.delete('jump'); PRESS.delete('reload'); PRESS.delete('melee'); PRESS.delete('swap');
}
