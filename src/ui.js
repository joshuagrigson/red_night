/* =====================================================================
   RED NIGHT — loading screen, menus, settings, gunsmith, HUD, minimap, photo mode
   ===================================================================== */
const show = (id, on) => $(id).classList.toggle('hide', !on);
function releaseMouse() { G.noPauseOnUnlock = true; try { document.exitPointerLock(); } catch (e) { } setTimeout(() => G.noPauseOnUnlock = false, 300); }
function pulse(el, cls) { if (typeof el === 'string') el = $(el); if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); } // restart a one-shot CSS animation

/* ---------- loading screen: runs from the moment this file evaluates (before the loaders start) until init removes #loading ---------- */
(() => {
  const L = $('loading'); if (!L) return;
  const fill = $('ldFill'), pct = $('ldPct'), stg = $('ldStage'), line = $('ldLine');
  const tips = [
    'The sirens test every year at 6:58 PM. Nobody tests what comes after.',
    'Green crates restock your ammo and patch you up.',
    'Headshots score half again. Possessed kills score double.',
    'Vampires, demons and witches burn when the sun comes up. Hold out.',
    'The survivor net calls out safehouses twice a night. Follow the ring on your map.',
    'Some of them wear faces. Watch the ones that stand too still.',
    'Texarkana sits on a state line. Tonight neither state is watching.',
    'In Salem they still count the hours by the church bell.',
    'Cars run. Running things over counts.',
    'Augment, in Settings, sets how much of the net layer you see over the city.',
    IS_TOUCH ? 'Push the left stick to the edge to sprint. Hold it there for a tac sprint.' : 'Double-tap Shift for a tac sprint. Press C mid-sprint to slide.',
    IS_TOUCH ? 'Every button on the right steers too: press it, then slide your thumb to keep aiming.' : 'Scoped in, hold Shift to steady your breath.',
    IS_TOUCH ? 'Tap your weapon, top right, to swap guns. Hold it to draw your blade.' : 'Q swaps guns. 3 draws your blade.',
  ];
  for (let i = tips.length - 1; i > 1; i--) { const j = 1 + Math.floor(Math.random() * i); const t = tips[i]; tips[i] = tips[j]; tips[j] = t; }
  const expect = Math.max(24, +store('ldN') || 0); // the request count of the last boot keeps the bar honest before every fetch is issued
  let shown = 0, goal = 0, li = 0, nextT = performance.now() + 4200, prev = performance.now(), alive = true, lastW = '', lastS = '';
  const tick = now => {
    if (!alive) return;
    const dt = Math.min(.1, Math.max(0, now - prev) / 1000); prev = now;
    const req = NET.req, done = NET.done;
    goal = Math.max(goal, Math.min(.96, .03 + done / Math.max(req, expect, 1) * .93)); // never backwards, never 100% before init
    shown += (goal - shown) * (1 - Math.exp(-dt * 2.5));
    const w = (shown * 100).toFixed(1); if (w !== lastW) { lastW = w; fill.style.width = w + '%'; pct.textContent = Math.floor(shown * 100) + '%'; }
    const s = !req ? 'Waking up' : done < req ? 'Streaming the city · ' + done + ' / ' + req : 'Building the streets'; if (s !== lastS) { lastS = s; stg.textContent = s; }
    if (now > nextT) { nextT = now + 4600; line.style.opacity = 0; setTimeout(() => { li = (li + 1) % tips.length; line.textContent = tips[li]; line.style.opacity = ''; }, 500); }
    requestAnimationFrame(tick);
  };
  // init() calls $('loading').remove(): finish the bar and fade out instead of vanishing
  L.remove = function () {
    if (!alive) return; alive = false; store('ldN', NET.req);
    fill.style.width = '100%'; pct.textContent = '100%'; stg.textContent = 'Ready'; L.classList.add('done');
    setTimeout(() => Element.prototype.remove.call(L), 1100);
  };
  line.textContent = tips[0]; requestAnimationFrame(tick);
})();

/* ---------- preview renderer (character + gunsmith) ---------- */
const PV = { r: null, scene: new T.Scene(), cam: new T.PerspectiveCamera(32, 1, .01, 50), obj: null, rotY: .6, drag: null, mode: null, rig: null };
(() => {
  // lit like the street (sodium rim, cool sky fill); the Augment dial pulls the rims toward the net's magenta and cyan, as RIM_AUG does in game
  const h = new T.HemisphereLight(0xc4c0bc, 0x1a1410, .9); PV.scene.add(h);
  const k = new T.DirectionalLight(0xfff1de, 1.2); k.position.set(2, 3, 2); PV.scene.add(k);
  const m = new T.DirectionalLight(0xffa860, 1.3); m.position.set(-3, 1, -1); PV.scene.add(m);
  const c = new T.DirectionalLight(0x8fb4d8, 1); c.position.set(3, -1, -2); PV.scene.add(c);
  PV.scene.environment = scene.environment;
  const fl = new T.Mesh(new T.CircleGeometry(1.2, 40), new T.MeshBasicMaterial({ map: glowTex, color: 0xffa860, transparent: true, opacity: .22, blending: T.AdditiveBlending, depthWrite: false }));
  fl.rotation.x = -Math.PI / 2; fl.userData.floor = 1; PV.floor = fl;
  const W0 = [new T.Color(0xffa860), new T.Color(0x8fb4d8), new T.Color(0xc4c0bc)], N1 = [new T.Color(0xff2a6d), new T.Color(0x05d9e8), new T.Color(0xb0a0ff)];
  const pvAug = a => { const t = smooth01((a - .05) / .7); m.color.copy(W0[0]).lerp(N1[0], t); c.color.copy(W0[1]).lerp(N1[1], t); h.color.copy(W0[2]).lerp(N1[2], t); fl.material.color.copy(m.color); fl.material.opacity = .22 + .13 * t; G.stillN = 0; };
  AUG_HOOKS.push(pvAug); pvAug(G.aug);
})();
function pvMount(holderId) {
  if (!PV.r) {
    const cv = document.createElement('canvas'); cv.id = 'pv';
    PV.r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); PV.r.outputEncoding = T.sRGBEncoding; PV.r.toneMapping = T.ACESFilmicToneMapping; PV.r.toneMappingExposure = 1.25;
    PV.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    cv.addEventListener('pointerdown', e => { PV.drag = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (er) { } });
    cv.addEventListener('pointermove', e => { if (PV.drag !== null) { PV.rotY += (e.clientX - PV.drag) * .01; PV.drag = e.clientX; } });
    const end = () => PV.drag = null; // a cancelled touch (scroll, notification) must not leave the turntable stuck
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('lostpointercapture', end); cv.style.touchAction = 'none';
  }
  $(holderId).appendChild(PV.r.domElement); pvSize();
}
function pvSize() { if (!PV.r) return; const el = PV.r.domElement.parentElement; if (!el) return; const w = el.clientWidth || 300, h = el.clientHeight || 300; PV.r.setSize(w, h, false); PV.cam.aspect = w / h; PV.cam.updateProjectionMatrix(); }
function pvSet(obj, mode) {
  if (PV.obj) PV.scene.remove(PV.obj); PV.obj = obj; PV.mode = mode; if (obj) PV.scene.add(obj);
  if (mode === 'char') { PV.cam.fov = 30; PV.cam.position.set(0, 1.15, 4.3); PV.cam.lookAt(0, .95, 0); PV.scene.add(PV.floor); PV.floor.position.y = .01; }
  else { PV.scene.remove(PV.floor); }
  PV.cam.updateProjectionMatrix();
}
function pvGun(w, cfg) {
  const b = buildWeapon(w, cfg); const g = new T.Group(); g.add(b.g);
  const box = new T.Box3().setFromObject(b.g); const c = box.getCenter(new T.Vector3()); const sz = box.getSize(new T.Vector3());
  b.g.position.sub(c); const L = Math.max(sz.x, sz.y, sz.z);
  PV.cam.fov = 28; PV.cam.position.set(0, L * .22, L * 1.85); PV.cam.lookAt(0, 0, 0); PV.cam.updateProjectionMatrix();
  g.rotation.x = .12; pvSet(g, 'gun');
}
function pvRender(dt) {
  if (!PV.r || !PV.obj) return;
  if (PV.drag === null) PV.rotY += dt * .35;
  if (PV.mode === 'gun') { PV.obj.rotation.y = PV.rotY; }
  else if (PV.mode === 'char' && PV.rig) { PV.obj.rotation.y = PV.rotY + (PV.rig.glb ? Math.PI : 0); PV.rig.st.t += dt; if (PV.rig.glb) animGLB(PV.rig, PV.rig.st, dt); else animRig(PV.rig, PV.rig.st, dt); }
  PV.r.render(PV.scene, PV.cam);
}

/* ---------- title ---------- */
function syncChips() {
  document.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('sel', b.dataset.q === G.quality));
  document.querySelectorAll('[data-n]').forEach(b => b.classList.toggle('sel', +b.dataset.n === +G.nightMin));
  document.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('sel', +b.dataset.s === +G.sens));
  document.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('sel', (+b.dataset.m === 1) === G.music));
  document.querySelectorAll('[data-aa]').forEach(b => b.classList.toggle('sel', (b.dataset.aa === '1') === !!G.aimAssist));
  document.querySelectorAll('[data-inv]').forEach(b => b.classList.toggle('sel', (b.dataset.inv === '1') === !!G.invertY));
  document.querySelectorAll('[data-bsz]').forEach(b => b.classList.toggle('sel', b.dataset.bsz === G.btnSize));
  document.querySelectorAll('[data-lf]').forEach(b => b.classList.toggle('sel', (b.dataset.lf === '1') === !!G.leftFire));
  document.querySelectorAll('[data-sn]').forEach(b => b.classList.toggle('sel', b.dataset.sn === G.supernatural));
  { const l = document.getElementById('ledeSn'); if (l) l.hidden = G.supernatural === 'off'; } // the title's monster line goes with them
  document.querySelectorAll('.chip[data-q],.chip[data-n],.chip[data-s],.chip[data-m],.chip[data-aa],.chip[data-inv],.chip[data-bsz],.chip[data-lf],.chip[data-sn]').forEach(b => b.setAttribute('aria-pressed', b.classList.contains('sel')));
}
function setupMenus() {
  if (IS_TOUCH) $('keysHelp').textContent = 'Left thumb: move (push to the edge to sprint) · Right thumb: look anywhere on the right, and every button there steers once you slide · AIM toggles sights · tap your weapon (top right) to swap, hold it for the blade · camera and shoulder are in Pause · tap a gun on the wall to open its class.';
  document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { G.quality = b.dataset.q; store('q', G.quality); applyPixelRatio(); onResize(); postSize(); syncChips(); });
  document.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { G.nightMin = +b.dataset.n; store('n', G.nightMin); syncChips(); });
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { G.sens = +b.dataset.s; store('s', G.sens); syncChips(); });
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { AU.setMusic(b.dataset.m === '1'); syncChips(); });
  document.querySelectorAll('[data-aa]').forEach(b => b.onclick = () => { setAimAssist(b.dataset.aa === '1'); syncChips(); });
  document.querySelectorAll('[data-inv]').forEach(b => b.onclick = () => { setInvertY(b.dataset.inv === '1'); syncChips(); });
  document.querySelectorAll('[data-bsz]').forEach(b => b.onclick = () => { setBtnSize(b.dataset.bsz); syncChips(); });
  document.querySelectorAll('[data-lf]').forEach(b => b.onclick = () => { setLeftFire(b.dataset.lf === '1'); syncChips(); });
  // monsters: actors.js owns the dial (it also reweights the spawns at once); the row only shows once it exists
  if (typeof setSupernatural === 'function') document.querySelectorAll('[data-sn]').forEach(b => b.onclick = () => { setSupernatural(b.dataset.sn); syncChips(); });
  else $('rowSn').hidden = true;
  syncChips();
  $('goChar').onclick = () => { AU.init(); openChar(); };
  $('goSet').onclick = () => { AU.init(); openSettings('title'); };
  $('charBack').onclick = () => { show('mChar', false); show('mTitle', true); G.state = 'title'; };
  $('goNight').onclick = () => { AU.init(); show('mChar', false); startNight(); };
  // char options
  const sk = $('skinSw'); SKINS.forEach((c, i) => { const b = document.createElement('button'); b.className = 'swatch'; b.style.background = '#' + c.toString(16).padStart(6, '0'); b.ariaLabel = 'Skin tone ' + (i + 1); b.onclick = () => { G.char.skin = i; charChanged(); }; sk.appendChild(b); });
  const hc = $('hairSw'); HAIR_COLS.forEach((c, i) => { const b = document.createElement('button'); b.className = 'swatch'; b.style.background = '#' + c.toString(16).padStart(6, '0'); b.ariaLabel = 'Hair color ' + (i + 1); b.onclick = () => { G.char.hairCol = i; charChanged(); }; hc.appendChild(b); });
  const ho = $('hairOpts'); HAIRS.forEach(h => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = h; b.dataset.hair = h; b.onclick = () => { G.char.hair = h; charChanged(); }; ho.appendChild(b); });
  const fo = $('fitOpts'); Object.keys(OUTFITS).forEach(k => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = OUTFITS[k].name; b.dataset.fit = k; b.onclick = () => { G.char.outfit = k; charChanged(); }; fo.appendChild(b); });
  document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { G.char.gender = b.dataset.g; charChanged(); });
  // gunsmith
  $('smClose').onclick = closeSmith;
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { SM.tab = b.dataset.tab; document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('sel', x === b)); show('smTabAtt', SM.tab === 'att'); show('smTabCus', SM.tab === 'cus'); });
  // pause
  $('pResume').onclick = resume; $('pQuit').onclick = () => { location.hash = ''; quitToTitle(); };
  $('pCam').onclick = () => toggleCam(); $('pLoad').onclick = openLoadGrid;
  $('pShoulder').onclick = swapShoulder; $('pShoulder').textContent = 'Shoulder: ' + (camState.pref > 0 ? 'right' : 'left');
  $('loadBack').onclick = () => { show('mLoad', false); show('mPause', true); G.state = 'paused'; }; // was left in 'pauseload', so Esc and photo mode stopped working
  $('pSet').onclick = () => openSettings('pause'); $('pPhoto').onclick = enterPhoto;
  $('endAgain').onclick = () => { show('mEnd', false); document.body.classList.remove('inMenu'); startNight(); }; $('endTitleBtn').onclick = () => { show('mEnd', false); quitToTitle(); };
  $('rotate').onclick = () => show('rotate', false);
  setupSettings(); setupPhoto();
  // end screen: personal best, districts and peak heat under the night's stats
  if (typeof endScreen === 'function' && !endScreen.ui) { const f0 = endScreen; endScreen = function (won) { const best = +store('best') || 0; f0(won); document.body.classList.add('inMenu'); try { endExtras(best); } catch (e) { } }; endScreen.ui = 1; }
  window.addEventListener('resize', () => { HUD.miniD = 0; });
  // Esc for the menus the main loop does not handle (settings, loadout grid, photo preview); runs after player.js queued 'pause'
  window.addEventListener('keydown', e => {
    if (e.repeat) return; const esc = e.code === 'Escape';
    if (esc && SET.from) { closeSettings(); PRESS.delete('pause'); }
    else if (esc && G.state === 'pauseload') { $('loadBack').onclick(); PRESS.delete('pause'); }
    else if (G.state === 'photo') { if (esc) { if (PH.out) closeShot(); else exitPhoto(); PRESS.delete('pause'); } else if (e.code === 'KeyH') phToggleUI(); }
  });
}
function openChar() {
  G.state = 'char'; show('mTitle', false); show('mChar', true); pvMount('charPv'); charChanged();
}
function charChanged() {
  charFit(); store('char', G.char);
  document.querySelectorAll('[data-g]').forEach(b => b.classList.toggle('sel', b.dataset.g === G.char.gender));
  [...$('skinSw').children].forEach((b, i) => b.classList.toggle('sel', i === G.char.skin));
  { const mm = maskMode(), nm = neonMode(); const lab = $('hairSw').previousElementSibling; if (lab) lab.textContent = nm ? 'Hair & neon' : mm ? 'Mask color' : CHARS_READY && playerGLBId() === 'witch' ? 'Hair & eyes' : 'Hair color';
    const hx = c => '#' + c.toString(16).padStart(6, '0');
    [...$('hairSw').children].forEach((b, i) => { b.classList.toggle('sel', i === G.char.hairCol);
      if (nm) { b.style.background = `linear-gradient(135deg, ${hx(HAIR_COLS[i])} 50%, ${hx(MASK_COLS[i])} 50%)`; b.style.boxShadow = '0 0 10px ' + hx(MASK_COLS[i]); b.ariaLabel = 'Hair and neon color ' + (i + 1); return; }
      const c = (mm ? MASK_COLS : HAIR_COLS)[i]; b.style.background = hx(c); b.style.boxShadow = mm ? '0 0 10px ' + hx(c) : ''; b.ariaLabel = (mm ? 'Mask color ' : 'Hair color ') + (i + 1); }); }
  [...$('hairOpts').children].forEach(b => b.classList.toggle('sel', b.dataset.hair === G.char.hair));
  [...$('fitOpts').children].forEach(b => { b.classList.toggle('sel', b.dataset.fit === G.char.outfit); b.hidden = G.char.gender === 'f' && !!OUTFITS[b.dataset.fit].male; });
  const o = OUTFITS[G.char.outfit];
  const hairRow = $('hairOpts').closest('.opt'); if (hairRow) hairRow.hidden = !!CHARS_READY; // the scanned models have fixed hairstyles
  for (const id of ['skinSw', 'hairSw']) { const r = $(id).closest('.opt'); if (r) r.hidden = !!o.dressed; } // a dressed outfit is worn as modelled: no skin or hair picks
  const glb = CHARS_READY && makeGLBRig(playerGLBId());
  if (glb) {
    customizeGLB(glb, playerCust()); glb.st = { speed: 0, phase: 0, hold: 'none', t: 0 };
    const gun = buildWeapon(W.preacher, cfgOf('preacher'), true); const holder = new T.Group(); gun.g.rotation.x = -Math.PI / 2; gun.g.position.set(0, -.02, .01); holder.add(gun.g); const mount = attachToBone(glb.rArm.hand, holder, 0, 0, Math.PI); glb.gunMount = { g: mount, mode: 'tpp' };
    PV.rig = glb; pvSet(glb.root, 'char'); return;
  }
  const rig = makeRig({ gender: G.char.gender, skin: o.skin !== undefined ? o.skin : SKINS[G.char.skin], hair: G.char.hair, hairCol: HAIR_COLS[G.char.hairCol], top: o.top, bottom: o.bottom, accent: o.accent, sleeve: 1, visor: o.visor, leather: G.char.outfit !== 'corpo', collar: G.char.outfit === 'corpo' });
  rig.st = { speed: 0, phase: 0, hold: 'none', t: 0 };
  // a pistol in hand for the pose
  const gun = buildWeapon(W.preacher, cfgOf('preacher'), true); gun.g.rotation.x = -Math.PI / 2; gun.g.position.set(0, -.07, -.02); rig.rArm.hand.add(gun.g);
  PV.rig = rig; pvSet(rig.root, 'char');
}

/* ---------- settings: title and pause share one panel ---------- */
const SET = { from: null, sl: [] };
// a pointer-driven slider: tap anywhere on the track or drag the thumb (a native range input only drags from the thumb on iOS)
function mkSlider(el, o) {
  const trk = el.firstElementChild, fil = trk.children[0], th = trk.children[1];
  const draw = () => { const v = o.get(), t = o.fmt(v); fil.style.width = th.style.left = clamp((v - o.min) / (o.max - o.min), 0, 1) * 100 + '%'; el.setAttribute('aria-valuenow', v); el.setAttribute('aria-valuetext', t); if (o.out) o.out.textContent = t; };
  const put = v => { v = clamp(Math.round(v / o.step) * o.step, o.min, o.max); if (v !== o.get()) o.set(v); draw(); };
  const at = e => { const r = trk.getBoundingClientRect(); if (r.width > 0) put(o.min + (e.clientX - r.left) / r.width * (o.max - o.min)); };
  let id = null;
  el.addEventListener('pointerdown', e => { id = e.pointerId; try { el.setPointerCapture(id); } catch (er) { } at(e); e.preventDefault(); });
  el.addEventListener('pointermove', e => { if (e.pointerId === id) at(e); });
  const end = e => { if (e.pointerId === id) id = null; }; el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', e => { const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[e.key]; if (d) put(o.get() + d * o.step); else if (e.key === 'Home') put(o.min); else if (e.key === 'End') put(o.max); else return; e.preventDefault(); e.stopPropagation(); });
  el.setAttribute('aria-valuemin', o.min); el.setAttribute('aria-valuemax', o.max);
  el._draw = draw; SET.sl.push(el); draw(); return el;
}
const augSlider = (id, out) => mkSlider($(id), { min: 0, max: 100, step: 1, get: () => Math.round(G.aug * 100), set: v => setAug(v / 100), fmt: v => v ? v + '%' : 'Off', out: out && $(out) });
function setupSettings() {
  augSlider('sAug', 'vAug');
  // 54 is the "Default" notch: the camera mode picks its own FOV
  mkSlider($('sFov'), { min: 54, max: 95, step: 1, get: () => G.fov ? clamp(Math.round(G.fov), 55, 95) : 54, set: v => setFov(v <= 54 ? 0 : v), fmt: v => v <= 54 ? 'Default' : v + '°', out: $('vFov') });
  mkSlider($('sLook'), { min: 50, max: 200, step: 5, get: () => Math.round(G.lookSpd * 100), set: v => setLookSpd(v / 100), fmt: v => v + '%', out: $('vLook') });
  $('setBack').onclick = closeSettings;
}
function openSettings(from) {
  SET.from = from === 'pause' ? 'pause' : 'title';
  show(SET.from === 'pause' ? 'mPause' : 'mTitle', false); show('mSet', true); syncChips(); SET.sl.forEach(s => s._draw());
}
function closeSettings() {
  if (!SET.from) return; show('mSet', false); show(SET.from === 'pause' ? 'mPause' : 'mTitle', true); SET.from = null;
}

/* ---------- gunsmith ---------- */
const SM = { cls: 'ar', sel: null, cat: 'optic', tab: 'att', back: 'apt' };
function openSmith(clsId) {
  // hopping between class tabs re-enters from 'smith': keep where we came from, or Close would leave the game stuck in 'smith'
  if (G.state !== 'smith') { SM.back = G.state === 'pauseload' ? 'pause' : 'apt'; G.prevState = G.state === 'pauseload' ? 'paused' : G.state; }
  SM.cls = clsId; releaseMouse();
  const cl = CLS.find(c => c.id === clsId);
  const eq = [G.load.s1, G.load.s2, G.load.melee];
  SM.sel = cl.ids.find(id => eq.includes(id)) || cl.wall;
  G.state = 'smith'; document.body.classList.add('inMenu');
  show('mSmith', true); show('mLoad', false); show('mPause', false); show('touch', false); show('hud', false);
  pvMount('smPv');
  // class tabs for quick hopping
  const tabs = $('smClassTabs'); tabs.innerHTML = '';
  CLS.forEach(c => { const b = document.createElement('button'); b.className = 'chip' + (c.id === clsId ? ' sel' : ''); b.textContent = c.short; b.onclick = () => openSmith(c.id); tabs.appendChild(b); });
  smRefresh();
}
function closeSmith() {
  show('mSmith', false); PV.obj && PV.scene.remove(PV.obj); PV.obj = null;
  if (G.prevState === 'paused') { G.state = 'paused'; show('mPause', true); }
  else { G.state = G.prevState || 'apt'; document.body.classList.remove('inMenu'); if (IS_TOUCH) show('touch', true); show('hud', true); }
}
function smRefresh() {
  const cl = CLS.find(c => c.id === SM.cls); $('smClass').textContent = cl.name; $('smEyebrow').textContent = SM.back === 'pause' ? 'Loadout' : 'Weapons wall';
  const list = $('smList'); list.innerHTML = '';
  const eq = [G.load.s1, G.load.s2, G.load.melee];
  cl.ids.forEach(id => {
    const w = W[id]; const b = document.createElement('button'); b.className = 'wItem' + (id === SM.sel ? ' sel' : '') + (eq.includes(id) ? ' eq' : '');
    b.innerHTML = `<b>${w.name}</b><span>${w.sub}</span>`; b.onclick = () => { SM.sel = id; smRefresh(); }; list.appendChild(b);
  });
  const w = W[SM.sel], cfg = cfgOf(SM.sel);
  $('smName').textContent = w.name; $('smSub').textContent = w.sub;
  pvGun(w, cfg);
  // stats
  const st = statsOf(w, cfg), base = statsOf(w, defaultCfg(w));
  const meleeLike = w.kind === 'melee' || w.kind === 'saw';
  const rows = meleeLike ? [
    ['Damage', w.dmg / 420, w.dmg / 420], ['Speed', w.swing ? 1 - (w.swing - .2) / .7 : .5, w.swing ? 1 - (w.swing - .2) / .7 : .5], ['Reach', (w.reach || 2) / 3.6, (w.reach || 2) / 3.6], ['Mobility', (w.mob - .8) / .3, (w.mob - .8) / .3],
  ] : [
    ['Damage', st.dmg * (w.pellets || 1) / 320, base.dmg * (w.pellets || 1) / 320], ['Fire rate', st.rpm / 1200, base.rpm / 1200], ['Range', st.r2 / 160, base.r2 / 160],
    ['Accuracy', 1 - st.hip / 10 * .55 - st.ads / 7 * .45, 1 - base.hip / 10 * .55 - base.ads / 7 * .45], ['Control', 1 - st.recV / 5.5, 1 - base.recV / 5.5], ['Mobility', (st.mob - .74) / .36, (base.mob - .74) / .36], ['Aim speed', 1 - (st.adsT - .08) / .5, 1 - (base.adsT - .08) / .5],
  ];
  $('smStats').innerHTML = rows.map(([n, v, b]) => {
    v = clamp(v, .03, 1); b = clamp(b, .03, 1); const lo = Math.min(v, b), hi = Math.max(v, b); const col = v > b ? 'var(--good)' : 'var(--bad)';
    return `<div class="stat"><span>${n}</span><span class="bar"><i style="width:${lo * 100}%"></i>${Math.abs(v - b) > .005 ? `<u style="left:${lo * 100}%;width:${(hi - lo) * 100}%;background:${col}"></u>` : ''}</span><em>${Math.round(v * 100)}</em></div>`;
  }).join('');
  const sp = [];
  if (w.mag) sp.push(['Magazine', w.kind === 'saw' ? 'fuel 100' : w.mag], ['Reserve', w.res]);
  if (w.rpm && w.kind !== 'melee') sp.push(['RPM', w.rpm]); if (w.reload) sp.push(['Reload', (w.shell ? w.reload + 's/shell' : w.reload + 's')]);
  if (w.pellets > 1) sp.push(['Pellets', w.pellets]); if (w.head && w.kind !== 'melee') sp.push(['Headshot', '×' + w.head]);
  sp.push(['Action', w.kind === 'gun' ? w.action : w.kind]);
  $('smSpecs').innerHTML = sp.map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('');
  // attachments
  const al = allowedAtt(w); const cats = Object.keys(al).filter(k => al[k]);
  const cEl = $('smCats'), oEl = $('smOpts'); cEl.innerHTML = ''; oEl.innerHTML = '';
  if (!cats.length) { oEl.innerHTML = '<span style="color:var(--dim);font-size:12px">No attachments for this one. Make it yours in Custom.</span>'; }
  else {
    if (!cats.includes(SM.cat)) SM.cat = cats[0];
    cats.forEach(c => { const b = document.createElement('button'); b.className = 'chip' + (c === SM.cat ? ' sel' : ''); b.textContent = ATT_NAMES[c]; b.onclick = () => { SM.cat = c; smRefresh(); }; cEl.appendChild(b); });
    al[SM.cat].forEach(id => { const a = attOf(SM.cat, id); const b = document.createElement('button'); b.className = cfg[SM.cat] === id ? 'sel' : ''; b.innerHTML = `${a.name}<span>${a.d}</span>`; b.onclick = () => { cfg[SM.cat] = id; cfgChanged(); }; oEl.appendChild(b); });
  }
  // custom
  const cm = $('smCamo'); cm.innerHTML = '';
  CAMOS.forEach(c => { const b = document.createElement('button'); b.className = cfg.camo === c.id ? 'sel' : ''; b.innerHTML = `${c.name}<span>${c.id === 'stock' ? 'Factory finish' : 'Camo'}</span>`; b.onclick = () => { cfg.camo = c.id; cfgChanged(); }; cm.appendChild(b); });
  const rc = $('smRetCol'); rc.innerHTML = '';
  RET_COLORS.forEach(c => { const b = document.createElement('button'); b.className = 'swatch' + (cfg.retCol === c ? ' sel' : ''); b.style.background = c; b.ariaLabel = 'Dot color ' + c; b.onclick = () => { cfg.retCol = c; cfgChanged(); }; rc.appendChild(b); });
  const rs = $('smRetShape'); rs.innerHTML = '';
  RET_SHAPES.forEach(s => {
    const b = document.createElement('button'); b.className = cfg.retShape === s.id ? 'sel' : ''; const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40; cv.style.width = '20px'; cv.style.height = '20px';
    drawReticle(cv.getContext('2d'), 20, 20, 9, cfg.retCol, s.id); b.appendChild(cv); b.appendChild(document.createTextNode(s.name)); b.onclick = () => { cfg.retShape = s.id; cfgChanged(); }; rs.appendChild(b);
  });
  // equip
  const ft = $('smFoot'); ft.innerHTML = '';
  const mk = (label, fn, primary) => { const b = document.createElement('button'); b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label; b.onclick = fn; ft.appendChild(b); };
  if (w.kind === 'melee') mk(G.load.melee === w.id ? 'Equipped as melee' : 'Equip as melee', () => { G.load.melee = w.id; afterEquip(); }, G.load.melee !== w.id);
  else {
    mk(G.load.s1 === w.id ? 'In slot 1' : 'Equip slot 1 · ' + W[G.load.s1].name, () => { if (G.load.s2 === w.id) G.load.s2 = G.load.s1; G.load.s1 = w.id; afterEquip(0); }, G.load.s1 !== w.id && G.load.s2 !== w.id);
    mk(G.load.s2 === w.id ? 'In slot 2' : 'Equip slot 2 · ' + W[G.load.s2].name, () => { if (G.load.s1 === w.id) G.load.s1 = G.load.s2; G.load.s2 = w.id; afterEquip(1); });
  }
}
function cfgChanged() { saveLoad(); smRefresh(); const eq = [G.load.s1, G.load.s2, G.load.melee]; if (eq.includes(SM.sel) && P.slots[0]) equipLoadout(true); }
function afterEquip(slot) {
  saveLoad(); equipLoadout(true); if (slot !== undefined) setWeapon(slot, true); if (slot === undefined) setWeapon(2, true); smRefresh(); toast('Equipped ' + W[SM.sel].name);
  const f = $('smFoot'); if (f) pulse(f, 'ok'); // the HUD feed is hidden behind the gunsmith, so confirm here too
}
function openLoadGrid() {
  G.state = 'pauseload'; show('mPause', false); show('mLoad', true);
  const g = $('loadGrid'); g.innerHTML = '';
  CLS.forEach(c => { const b = document.createElement('button'); b.className = 'btn'; b.innerHTML = `${c.name}`; b.onclick = () => openSmith(c.id); g.appendChild(b); });
}
function toast(msg) { feed(msg); }

/* ---------- pause ---------- */
function pause() {
  if (G.state !== 'city' && G.state !== 'apt') return;
  if (P.dead || (G.state === 'city' && G.hour >= 12)) return; // the death and sunrise countdowns end in the end screen; a menu opened over them soft-locked the game
  G.pausedFrom = G.state; G.state = 'paused'; releaseMouse(); show('mPause', true); show('touch', false); show('hud', false); document.body.classList.add('inMenu');
  AU.engineSet(false); mouseDown = false; rmb = false; INP.fire = false;
}
function resume() { if (SET.from) { show('mSet', false); SET.from = null; } show('mPause', false); show('mLoad', false); G.state = G.pausedFrom || 'city'; document.body.classList.remove('inMenu'); if (IS_TOUCH) show('touch', true); show('hud', true); }
/* every overlay a night can leave open: photo mode, pause, loadout, gunsmith, settings */
function uiReset() {
  if (G.state === 'photo' && PH.hurt) { G.dmgFlash = PH.hurt[0]; P.suppressed = PH.hurt[1]; }
  PH.hurt = null; PH.ptrs.clear(); if (PH.out) closeShot();
  for (const id of ['mPause', 'mLoad', 'mSmith', 'mSet', 'photoBar', 'photoPad', 'phHint', 'phOut']) show(id, false);
  SET.from = null; document.body.classList.remove('inMenu', 'photo', 'phHidden');
  G.wakeT = 0; canvas.style.filter = 'none';
}
function quitToTitle() {
  for (const id of ['mEnd', 'hud', 'touch']) show(id, false);
  uiReset();
  // a broadcast cut off mid-line would otherwise hang over the title screen
  if (typeof STORY !== 'undefined') { STORY.queue.length = 0; STORY.cur = null; const bc = $('bcast'); if (bc) bc.style.opacity = 0; }
  clearNight(); G.state = 'title'; show('mTitle', true); AU.engineSet(false);
}

/* ---------- HUD ---------- */
const HUD = { last: {}, feedEls: [], dirs: [], dirI: 0, miniF: 0, bannerT: 0, miniD: 0, qc: null, coneG: null, heatQ: -1, heatMax: 0, heatPT: 0, seen: 0, resId: null, res: 0, pips: null, act: null };
function setTxt(id, v) {
  if (HUD.last[id] === v) return; HUD.last[id] = v; const el = $(id); el.textContent = v;
  // a new objective (not just the distance ticking down) gets a brief highlight
  if (id === 'objective') { const k = String(v).replace(/[↑↗→↘↓↙←↖]|\d+m?/g, ''); if (k !== HUD.objK) { HUD.objK = k; if (G.state === 'city') pulse(el, 'new'); } }
}
function updateHUDWeapon() {
  const s = P.s(); if (!s) return; setTxt('wName', s.w.name);
  ['s1', 's2', 's3'].forEach((id, i) => { $(id).classList.toggle('on', P.cur === i); $(id).textContent = P.slots[i] ? (i === 2 ? P.slots[i].w.name : (i + 1) + ' ' + P.slots[i].w.name) : '—'; });
}
function setOp(id, v) { if (HUD.last[id] !== v) { HUD.last[id] = v; $(id).style.opacity = v; } }
function hudUpdate(dt) {
  const s = P.s(), city = G.state === 'city';
  // health (a jump bigger than regen is a pickup or a safehouse: flash the bar)
  const hp = Math.max(0, P.hp); const pct = hp / P.maxHp * 100, hpr = Math.round(pct);
  if (HUD.last.hp !== hpr) { if (city && HUD.last.hp !== undefined && hpr - HUD.last.hp >= 8) pulse('hpWrap', 'up'); HUD.last.hp = hpr; $('hpFill').style.width = pct + '%'; $('hpWrap').classList.toggle('low', pct < 30 && hp > 0); }
  setTxt('hpTxt', Math.ceil(hp) + ' / ' + P.maxHp);
  setTxt('status', P.possT > 0 ? 'POSSESSED · MASH MELEE' : P.hexT > 0 ? 'HEXED · SLOWED' : P.inCar ? 'DRIVING · ' + Math.round(Math.abs(P.inCar.speed) * 3.6) + ' KM/H' : '');
  setOp('dmg', Math.round(clamp((1 - hp / P.maxHp) * 1.2 + (G.dmgFlash || 0), 0, 1) * 50) / 50);
  G.dmgFlash = Math.max(0, (G.dmgFlash || 0) - dt * 2);
  setOp('poss', P.possT > 0 ? Math.round((.55 + Math.sin(G.t * 9) * .2) * 50) / 50 : 0);
  setOp('hex', P.hexT > 0 ? .6 : 0);
  // ammo
  if (s) {
    const w = s.w;
    // one cache key for all three kinds: gun -> melee -> same gun used to leave "∞" on screen until the next shot
    const k = w.kind === 'melee' ? 'm' : w.kind === 'saw' ? 'saw' + Math.round(s.mag) : s.mag + '|' + s.res;
    if (HUD.last.ammoK !== k) {
      HUD.last.ammoK = k; const a = $('ammo');
      if (w.kind === 'melee') { a.textContent = '∞'; a.style.color = ''; }
      else if (w.kind === 'saw') { a.innerHTML = Math.round(s.mag) + '<small>% fuel</small>'; a.style.color = ''; }
      else { a.innerHTML = s.mag + `<small> / ${s.res}</small>`; a.style.color = s.mag <= Math.ceil(w.mag * .25) ? 'var(--blood)' : ''; }
    }
    if (city && HUD.resId === s.id && s.res > HUD.res) pulse('ammo', 'up'); // reserve only grows from pickups and safehouses
    HUD.resId = s.id; HUD.res = s.res;
  }
  // crosshair
  const cross = $('cross'); const hideC = !s || P.ads > .35 || P.inCar || (P.sprintK || 0) > .5 || !city;
  setOp('cross', hideC ? 0 : 1);
  if (!hideC && s) {
    const sp = s.w.kind === 'melee' || s.w.kind === 'saw' ? .8 : currentSpread(s);
    const gap = 4 + Math.tan(sp * Math.PI / 180) / Math.tan(camera.fov * Math.PI / 360) * window.innerHeight / 2;
    const g = Math.round(gap);
    if (HUD.last.gap !== g) { HUD.last.gap = g; const [t, b, l, r] = cross.querySelectorAll('i'); t.style.top = (-g - 9) + 'px'; b.style.top = g + 'px'; l.style.left = (-g - 9) + 'px'; r.style.left = g + 'px'; }
  }
  // reticle & scope
  const showRet = s && P.ads > .85 && s.st.ret && !s.st.overlay && !P.inCar && G.camMode === 'fpp';
  setOp('ret', showRet ? 1 : (s && P.ads > .85 && G.camMode === 'tpp' && !P.inCar ? 1 : 0));
  const scoped = s && P.ads > .92 && s.st.overlay && !P.inCar;
  setOp('scope', scoped ? 1 : 0);
  if (scoped && HUD.scopeKey !== s.id + s.cfg.retCol + s.cfg.retShape + window.innerWidth) drawScope(s);
  if (scoped) { const sw = Math.min(2, (P.steadyK || 1) * 2); /* the aim itself sways now; the ring only breathes a little */ $('scope').style.transform = `translate(${Math.sin(G.t * .9) * sw}px,${Math.sin(G.t * 1.7) * sw * .8}px)`; }
  // hit marker
  if (HUD.hitT > 0) { HUD.hitT -= dt; $('hit').style.opacity = clamp(HUD.hitT / .15, 0, 1); }
  // damage directions
  HUD.dirs.forEach((d, i) => { const el = $('dirs').children[i]; if (d.t > 0) { d.t -= dt; const ang = Math.atan2(d.x - P.pos.x, -(d.z - P.pos.z)) + P.yaw; el.style.transform = `rotate(${ang}rad)`; el.style.opacity = clamp(d.t, 0, 1); } else if (d.t > -1) { d.t = -1; el.style.opacity = 0; } });
  // banner
  if (HUD.bannerT > 0) { HUD.bannerT -= dt; if (HUD.bannerT <= 0) $('banner').style.opacity = 0; }
  // heat (owned by ai.js; only shown once it exists)
  if (typeof HEAT !== 'undefined' && HEAT) heatDraw(+HEAT.level || 0, dt);
  // night stats for the end screen
  if (G.state === 'apt') { HUD.seen = 0; HUD.heatMax = 0; } else if (city && !G.inside && G.dist >= 0) HUD.seen |= 1 << G.dist;
  // minimap
  if (++HUD.miniF % 3 === 0) drawMini();
}
function heatDraw(lv, dt) {
  HUD.heatPT -= dt; const q = Math.round(clamp(lv, 0, 5) * 20) / 20; if (q === HUD.heatQ) return;
  const el = $('heat'); if (!el) return;
  if (!HUD.pips) { HUD.pips = el.querySelectorAll('b'); el.classList.remove('hide'); }
  for (let i = 0; i < HUD.pips.length; i++) HUD.pips[i].style.transform = 'scaleX(' + clamp(q - i, 0, 1) + ')';
  // pulse on a new pip or a sudden jump, at most every .6 s
  if (HUD.heatQ >= 0 && (Math.floor(q) > Math.floor(HUD.heatQ) || q - HUD.heatQ >= .2) && HUD.heatPT <= 0) { HUD.heatPT = .6; pulse(el, 'rise'); }
  el.classList.toggle('hot', q >= 3); el.classList.toggle('cold', q <= 0);
  HUD.heatQ = q; HUD.heatMax = Math.max(HUD.heatMax, q);
}
function drawReticleHUD() {
  const s = P.s(); if (!s) return; const c = $('ret'), x = c.getContext('2d'); x.clearRect(0, 0, 120, 120);
  const shape = s.st.ret ? s.cfg.retShape : 'dot'; drawReticle(x, 60, 60, s.cfg.optic === 'acog' ? 13 : 10, s.cfg.retCol, shape);
}
function drawScope(s) {
  HUD.scopeKey = s.id + s.cfg.retCol + s.cfg.retShape + window.innerWidth;
  const c = $('scopeC'), x = c.getContext('2d'); const w = c.width, h = c.height; const R = Math.min(w, h) * .46, cx = w / 2, cy = h / 2;
  x.clearRect(0, 0, w, h); x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  x.save(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill(); x.restore();
  const g = x.createRadialGradient(cx, cy, R * .82, cx, cy, R); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.95)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(0,0,0,.9)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx - 22, cy); x.moveTo(cx + 22, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy - 22); x.moveTo(cx, cy + 22); x.lineTo(cx, cy + R); x.stroke();
  x.lineWidth = 5; x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx - R * .55, cy); x.moveTo(cx + R * .55, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy + R * .55); x.lineTo(cx, cy + R); x.stroke();
  x.fillStyle = 'rgba(0,0,0,.9)'; for (let i = 1; i < 6; i++) { x.beginPath(); x.arc(cx + i * R * .09, cy, 2.5, 0, TAU); x.arc(cx - i * R * .09, cy, 2.5, 0, TAU); x.fill(); x.beginPath(); x.arc(cx, cy + i * R * .09, 2.5, 0, TAU); x.fill(); }
  drawReticle(x, cx, cy, 9, s.cfg.retCol, s.cfg.retShape);
  const a = .15 + G.aug * .5; // the glass readout is part of the net layer
  x.strokeStyle = `rgba(5,217,232,${(a * .6).toFixed(3)})`; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, R - 6, -.6, .6); x.stroke();
  x.fillStyle = `rgba(5,217,232,${a.toFixed(3)})`; x.font = "12px 'Share Tech Mono', monospace"; x.fillText(attOf('optic', s.cfg.optic).name.toUpperCase(), cx + R * .5, cy + R * .7);
}
/* ---------- minimap: hi-dpi, rotates with you; view cone, north tick, district tint, objective ring + rim arrow ---------- */
const MINI_R = 106; // meters from the center to the rim
function miniSize() {
  const c = $('mini'), w = c.clientWidth; if (!w) return false;
  const px = Math.round(w * Math.min(2, window.devicePixelRatio || 1)); if (c.width !== px) { c.width = c.height = px; HUD.coneG = null; }
  HUD.miniD = px / w; return true;
}
const ENEMY_DOT = { disguise: '#c9c9cf', poss: '#ff7a1a', base: '#ff1f3d' };
function drawMini() {
  if (!HUD.miniD && !miniSize()) return;
  const c = $('mini'), x = c.getContext('2d'), S = c.width, H = S / 2, d = HUD.miniD, sc = H / MINI_R;
  if (!HUD.qc) { const a = (.05 + G.aug * .12).toFixed(3); HUD.qc = DIST.map(q => `rgba(${q.amb >> 16 & 255},${q.amb >> 8 & 255},${q.amb & 255},${a})`); }
  x.clearRect(0, 0, S, S); x.save(); x.beginPath(); x.arc(H, H, H - d, 0, TAU); x.clip();
  x.fillStyle = 'rgba(9,9,12,.82)'; x.fillRect(0, 0, S, S);
  x.save(); x.translate(H, H); x.rotate(P.yaw); const px = P.pos.x, pz = P.pos.z;
  const city = G.state === 'city';
  if (city) {
    const Q = HALF * sc;
    x.fillStyle = HUD.qc[0]; x.fillRect((-HALF - px) * sc, (-HALF - pz) * sc, Q, Q);
    x.fillStyle = HUD.qc[1]; x.fillRect(-px * sc, (-HALF - pz) * sc, Q, Q);
    x.fillStyle = HUD.qc[2]; x.fillRect(-px * sc, -pz * sc, Q, Q);
    x.fillStyle = HUD.qc[3]; x.fillRect((-HALF - px) * sc, -pz * sc, Q, Q);
    x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 12 * sc; x.beginPath();
    for (const k of ROADS) { x.moveTo((k - px) * sc, (-HALF - pz) * sc); x.lineTo((k - px) * sc, (HALF - pz) * sc); x.moveTo((-HALF - px) * sc, (k - pz) * sc); x.lineTo((HALF - px) * sc, (k - pz) * sc); }
    x.stroke();
    x.fillStyle = 'rgba(26,52,70,.92)'; x.fillRect((188 - px) * sc, (-240 - pz) * sc, 24 * sc, 234 * sc);
    x.strokeStyle = 'rgba(243,230,0,.5)'; x.lineWidth = 1.2 * d; x.beginPath(); x.moveTo((120 - px) * sc, -pz * sc); x.lineTo((120 - px) * sc, (240 - pz) * sc); x.stroke();
    const cs = 3 * d; x.fillStyle = 'rgba(196,200,210,.5)'; for (const c2 of CARS) x.fillRect((c2.pos.x - px) * sc - cs / 2, (c2.pos.z - pz) * sc - cs / 2, cs, cs);
    const ps = 4.5 * d; x.fillStyle = '#3dff9a'; for (const p of PICKS) x.fillRect((p.pos.x - px) * sc - ps / 2, (p.pos.z - pz) * sc - ps / 2, ps, ps);
    // actors.js colours each NPC: red if it is after you, a muted faction colour if not, grey in disguise
    const dotC = typeof npcDotColor === 'function' ? npcDotColor : null;
    for (const e of ENEMIES) { if (e.dead || !e.R || !e.R.root.visible) continue; x.fillStyle = e.mode === 'disguise' ? (dotC ? dotC(e) : ENEMY_DOT.disguise) : e.possessed ? ENEMY_DOT.poss : dotC ? dotC(e) : ENEMY_DOT.base; x.beginPath(); x.arc((e.pos.x - px) * sc, (e.pos.z - pz) * sc, 2.8 * d, 0, TAU); x.fill(); }
    x.fillStyle = '#ffb000'; for (const w of WISPS) { x.beginPath(); x.arc((w.pos.x - px) * sc, (w.pos.z - pz) * sc, 2.3 * d, 0, TAU); x.fill(); }
    if (STORY.beacon && STORY.beacon.visible) { const bp = STORY.beacon.position; x.strokeStyle = '#3dff9a'; x.lineWidth = 2 * d; x.beginPath(); x.arc((bp.x - px) * sc, (bp.z - pz) * sc, (6 + Math.sin(G.t * 5) * 1.5) * d, 0, TAU); x.stroke(); }
  }
  x.restore();
  // view cone: the map turns with you, so the camera always looks up the map
  const hf = Math.min(2.6, 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
  if (!HUD.coneG) { HUD.coneG = x.createRadialGradient(H, H, 0, H, H, H); HUD.coneG.addColorStop(0, 'rgba(255,255,255,.24)'); HUD.coneG.addColorStop(1, 'rgba(255,255,255,0)'); }
  x.fillStyle = HUD.coneG; x.beginPath(); x.moveTo(H, H); x.arc(H, H, H, -Math.PI / 2 - hf / 2, -Math.PI / 2 + hf / 2); x.closePath(); x.fill();
  // objective off the map: an arrow on the rim
  if (city && STORY.beacon && STORY.beacon.visible) {
    const bp = STORY.beacon.position, dx = (bp.x - px) * sc, dz = (bp.z - pz) * sc, cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), rx = dx * cy - dz * sy, ry = dx * sy + dz * cy;
    if (rx * rx + ry * ry > (H - 10 * d) * (H - 10 * d)) { const a = Math.atan2(ry, rx), R = H - 7 * d; x.save(); x.translate(H + Math.cos(a) * R, H + Math.sin(a) * R); x.rotate(a); x.fillStyle = '#3dff9a'; x.beginPath(); x.moveTo(5 * d, 0); x.lineTo(-4 * d, -4.5 * d); x.lineTo(-4 * d, 4.5 * d); x.closePath(); x.fill(); x.restore(); }
  }
  x.restore();
  x.fillStyle = '#f3e600'; x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = d; x.beginPath(); x.moveTo(H, H - 7 * d); x.lineTo(H + 5 * d, H + 5 * d); x.lineTo(H, H + 2 * d); x.lineTo(H - 5 * d, H + 5 * d); x.closePath(); x.fill(); x.stroke();
  x.strokeStyle = 'rgba(255,255,255,.24)'; x.lineWidth = d; x.beginPath(); x.arc(H, H, H - d * .5, 0, TAU); x.stroke();
  // north: world -Z, rotated with the map
  const nx = Math.sin(P.yaw), ny = -Math.cos(P.yaw);
  x.strokeStyle = '#f1efe9'; x.lineWidth = 2 * d; x.beginPath(); x.moveTo(H + nx * (H - d), H + ny * (H - d)); x.lineTo(H + nx * (H - 6 * d), H + ny * (H - 6 * d)); x.stroke();
  x.fillStyle = 'rgba(241,239,233,.9)'; x.font = `700 ${Math.round(9 * d)}px 'Chakra Petch', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('N', H + nx * (H - 13 * d), H + ny * (H - 13 * d));
}
function hitMarker(kill, head) {
  HUD.hitT = kill ? .32 : .15; const el = $('hit'); el.classList.toggle('kill', !!kill); el.classList.toggle('head', !!head); el.style.opacity = 1; AU.hitmark(kill);
}
function flashBanner(h, p, dur) { $('bannerH').textContent = h; $('bannerP').textContent = p || ''; const b = $('banner'); b.style.opacity = 1; pulse(b, 'go'); HUD.bannerT = dur || 2; }
function feed(html) {
  const f = $('feed'); const d = document.createElement('div'); d.innerHTML = html; f.prepend(d);
  while (f.children.length > 5) f.removeChild(f.lastChild);
  setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 4500);
}
function damageDir(src) { if (!src) return; const d = HUD.dirs[HUD.dirI] = { x: src.x, z: src.z, t: 1.2 }; HUD.dirI = (HUD.dirI + 1) % 4; }
function setPrompt(label, key) {
  const el = $('prompt');
  if (!label) { if (HUD.last.prompt) { el.style.opacity = 0; HUD.last.prompt = null; } if (HUD.act !== false) { HUD.act = false; $('bAct').classList.add('hide'); } return; }
  // TOUCH.actT: when ACT last showed or changed its label; it takes no press that begins in the next .3 s (player.js)
  if (HUD.last.prompt !== label) { HUD.last.prompt = label; el.innerHTML = (IS_TOUCH ? '' : `<kbd>${key}</kbd>`) + label; el.style.opacity = 1; $('bAct').textContent = label.toUpperCase(); TOUCH.actT = performance.now(); }
  if (HUD.act !== true) { HUD.act = true; $('bAct').classList.remove('hide'); TOUCH.actT = performance.now(); }
}
function endExtras(prevBest) {
  const el = $('endStats'); if (!el) return; const nb = P.score > prevBest && P.score > 0;
  const add = (b, s, cls) => { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = `<b>${b}</b><span>${s}</span>`; el.appendChild(d); };
  add(Math.max(P.score, prevBest).toLocaleString(), nb ? 'New best' : 'Best', nb ? 'best' : '');
  let n = 0; for (let i = 0; i < 4; i++) if (HUD.seen & 1 << i) n++; add(n + ' / 4', 'Districts');
  if (typeof HEAT !== 'undefined' && HEAT) add(Math.floor(HUD.heatMax) + ' / 5', 'Peak heat');
}

/* ---------- photo mode: the world freezes, a free camera flies, one frame saves at up to 2x ---------- */
const PH = { pos: new T.Vector3(), yaw: 0, pitch: 0, fov: 60, saved: null, lo: new T.Vector3(), hi: new T.Vector3(), ptrs: new Map(), pinch: 0, cx: 0, cy: 0, mv: new T.Vector3(), ui: true, out: false, tap: null, blob: null, jpg: null, name: '', dls: null, hintT: 0 };
// inside the Claude app a plain download link does nothing; the artifact's downloads capability asks the viewer and saves
try { if (window.claude && window.claude.use) window.claude.use('downloads').then(d => { PH.dls = d; }).catch(() => { }); } catch (e) { }
function phSave(e) {
  if (!PH.dls || !PH.jpg) return; // plain link (local builds, browsers)
  if (e) e.preventDefault();
  PH.dls.save({ filename: PH.name, data: PH.jpg }).then(() => phHint('Saved', 1.6)).catch(er => {
    const c = er && er.code; if (c === 'declined') return;
    phHint(c === 'rate_limited' ? 'One moment, then try again' : IS_TOUCH ? 'Press and hold the picture to save it' : 'Use Open and save it from there', 2.6);
  });
}
const _phF = new T.Vector3(), _phR = new T.Vector3(), _phE = new T.Euler(0, 0, 0, 'YXZ');
function setupPhoto() {
  augSlider('phAug');
  mkSlider($('phFov'), { min: 20, max: 100, step: 1, get: () => Math.round(PH.fov), set: v => { PH.fov = v; }, fmt: v => v + '°', out: $('phFovV') });
  $('phHide').onclick = phToggleUI; $('phShot').onclick = () => photoShot(); $('phExit').onclick = exitPhoto; $('phBack').onclick = closeShot;
  PH.help = IS_TOUCH ? 'Drag to look · two fingers to move · pinch to zoom' : 'Drag to look · WASD and Q / E to move · Shift for speed · wheel to zoom · H hides the UI';
  const pad = $('photoPad');
  pad.addEventListener('pointerdown', e => {
    try { pad.setPointerCapture(e.pointerId); } catch (er) { }
    PH.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); phGesture(true);
    PH.tap = PH.ptrs.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; e.preventDefault();
  });
  pad.addEventListener('pointermove', e => {
    const p = PH.ptrs.get(e.pointerId); if (!p) return;
    if (PH.ptrs.size === 1) { const k = .0045 * PH.fov / 70; PH.yaw -= (e.clientX - p.x) * k; PH.pitch -= (e.clientY - p.y) * k * (G.invertY ? -1 : 1); }
    p.x = e.clientX; p.y = e.clientY; if (PH.ptrs.size === 2) phGesture(false);
    if (PH.tap && Math.abs(e.clientX - PH.tap.x) + Math.abs(e.clientY - PH.tap.y) > 12) PH.tap = null;
  });
  const up = e => {
    if (!PH.ptrs.delete(e.pointerId)) return;
    if (PH.tap && !PH.ptrs.size && performance.now() - PH.tap.t < 320 && !PH.ui) phToggleUI(); // a tap brings hidden controls back
    PH.tap = null; phGesture(true);
  };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
  pad.addEventListener('gesturestart', e => e.preventDefault()); // iOS: our pinch is FOV, not page zoom
  pad.addEventListener('wheel', e => { PH.fov = clamp(PH.fov * (e.deltaY > 0 ? 1.06 : 1 / 1.06), 20, 100); $('phFov')._draw(); e.preventDefault(); }, { passive: false });
}
// two fingers: drag moves the camera (up = forward, sideways = strafe), pinch zooms
function phGesture(reset) {
  if (PH.ptrs.size !== 2) { PH.pinch = 0; return; }
  const it = PH.ptrs.values(), a = it.next().value, b = it.next().value;
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, dd = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y));
  if (!reset && PH.pinch > 0) { PH.mv.x += (cx - PH.cx) * .05; PH.mv.z -= (cy - PH.cy) * .05; PH.fov = clamp(PH.fov * PH.pinch / dd, 20, 100); $('phFov')._draw(); }
  PH.cx = cx; PH.cy = cy; PH.pinch = dd;
}
function enterPhoto() {
  if (G.state !== 'paused') return;
  PH.saved = { p: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov };
  _phE.setFromQuaternion(camera.quaternion, 'YXZ'); PH.yaw = _phE.y; PH.pitch = _phE.x; PH.pos.copy(camera.position); PH.fov = camera.fov;
  const c = camera.position;
  if (Math.abs(c.x) <= HALF && Math.abs(c.z) <= HALF) { PH.lo.set(-HALF, .3, -HALF); PH.hi.set(HALF, 160, HALF); }
  else { PH.lo.set(c.x - 14, .3, c.z - 14); PH.hi.set(c.x + 14, Math.max(4, c.y + 2), c.z + 14); } // apartment and interiors live outside the grid
  G.wakeT = 0; canvas.style.filter = 'none'; // the wake-up blur would otherwise sit over every shot taken in the first seconds
  G.state = 'photo'; PH.ui = true; PH.out = false; PH.ptrs.clear(); PH.mv.set(0, 0, 0); PRESS.clear();
  PH.hurt = [G.dmgFlash || 0, P.suppressed || 0]; G.dmgFlash = 0; P.suppressed = 0; // the post pass reads these: keep the red hurt fringe out of photos
  setOp('dmg', 0); setOp('poss', 0); setOp('hex', 0); // and the hurt vignettes out of the live view (hudUpdate restores them)
  document.body.classList.add('photo'); document.body.classList.remove('phHidden');
  show('mPause', false); show('phOut', false); show('photoPad', true); show('photoBar', true); phHint(PH.help, 5);
  SET.sl.forEach(s => s._draw());
  updateBody(0); // first-person hides the body; a free camera should find you standing there
}
function phHint(t, dur) { const h = $('phHint'); h.textContent = t; h.classList.remove('fade', 'hide'); PH.hintT = dur; }
function exitPhoto() {
  if (G.state !== 'photo') return;
  if (PH.saved) { camera.position.copy(PH.saved.p); camera.quaternion.copy(PH.saved.q); camera.fov = PH.saved.fov; camera.updateProjectionMatrix(); }
  if (PH.hurt) { G.dmgFlash = PH.hurt[0]; P.suppressed = PH.hurt[1]; PH.hurt = null; }
  closeShot(); for (const id of ['photoPad', 'photoBar', 'phHint']) show(id, false);
  document.body.classList.remove('photo', 'phHidden'); PH.ptrs.clear(); PRESS.clear();
  G.state = 'paused'; show('mPause', true);
  if (PBODY) PBODY.root.visible = G.camMode === 'tpp' && !P.inCar;
}
function phToggleUI() {
  if (G.state !== 'photo') return; PH.ui = !PH.ui; document.body.classList.toggle('phHidden', !PH.ui);
  if (!PH.ui) phHint(IS_TOUCH ? 'Tap to show the controls' : 'Click or press H to show the controls', 2.2);
}
function updatePhoto(dt) {
  if (took('pause')) { if (PH.out) closeShot(); else { exitPhoto(); return; } }
  PRESS.clear(); // Q/E/Space etc. would otherwise fire as swap/act/jump on resume
  if (PH.hintT > 0 && (PH.hintT -= dt) <= 0) $('phHint').classList.add('fade');
  const K = typeof KEY !== 'undefined' ? KEY : {};
  if (!PH.out) {
    if (K.ArrowLeft) PH.yaw += 1.4 * dt; if (K.ArrowRight) PH.yaw -= 1.4 * dt; if (K.ArrowUp) PH.pitch += 1.1 * dt; if (K.ArrowDown) PH.pitch -= 1.1 * dt;
    const mx = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0), mz = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0), my = (K.KeyE ? 1 : 0) - (K.KeyQ ? 1 : 0), sp = (K.ShiftLeft || K.ShiftRight ? 22 : 6) * dt;
    PH.pitch = clamp(PH.pitch, -1.5, 1.5); const cp = Math.cos(PH.pitch);
    _phF.set(-Math.sin(PH.yaw) * cp, Math.sin(PH.pitch), -Math.cos(PH.yaw) * cp); _phR.set(Math.cos(PH.yaw), 0, -Math.sin(PH.yaw));
    PH.pos.addScaledVector(_phF, mz * sp + PH.mv.z).addScaledVector(_phR, mx * sp + PH.mv.x); PH.pos.y += my * sp; PH.mv.set(0, 0, 0);
    PH.pos.clamp(PH.lo, PH.hi);
  }
  camera.position.copy(PH.pos); camera.rotation.set(PH.pitch, PH.yaw, 0, 'YXZ');
  if (camera.fov !== PH.fov) { camera.fov = PH.fov; camera.updateProjectionMatrix(); }
}
// render one frame and read it back in the same task (the drawing buffer is not preserved)
function photoShot(noDownload) {
  if (G.state !== 'photo') return null;
  camera.position.copy(PH.pos); camera.rotation.set(PH.pitch, PH.yaw, 0, 'YXZ'); camera.fov = PH.fov; camera.updateProjectionMatrix();
  const pr = renderer.getPixelRatio(), hi = Math.min(2, window.devicePixelRatio || 1), up = hi > pr + .15;
  let url = '';
  try {
    if (up) { renderer.setPixelRatio(hi); if (typeof postSize === 'function') postSize(); }
    if (POST.on) POST.composer.render(); else { renderer.clear(); renderer.render(scene, camera); }
    url = phCompose(renderer.domElement);
  } catch (e) { url = ''; }
  if (up) { renderer.setPixelRatio(pr); if (typeof postSize === 'function') postSize(); }
  pulse('phFlash', 'go'); try { AU.nz(.05, 'highpass', 3000, 5200, 1, .22); } catch (e) { }
  if (!url || url.length < 2000) { phHint('Could not capture this frame', 2.5); return null; }
  let href = url;
  try { const bin = atob(url.slice(url.indexOf(',') + 1)), n = bin.length, u8 = new Uint8Array(n); for (let i = 0; i < n; i++) u8[i] = bin.charCodeAt(i); if (PH.blob) URL.revokeObjectURL(PH.blob); PH.jpg = new Blob([u8], { type: 'image/jpeg' }); PH.blob = href = URL.createObjectURL(PH.jpg); } catch (e) { PH.jpg = null; }
  const name = 'red-night-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.jpg';
  PH.name = name; $('phImg').src = href; const dl = $('phDl'); dl.href = href; dl.download = name; $('phOpen').href = href; dl.onclick = phSave;
  $('phNote').textContent = PH.dls ? (IS_TOUCH ? 'Download asks where to save it. You can also press and hold the picture.' : 'Download asks where to save it.') : IS_TOUCH ? 'Press and hold the picture to save it to Photos, or use Download.' : 'If nothing downloaded, use Open and save it from the new tab.';
  show('phOut', true); PH.out = true;
  if (!IS_TOUCH && !noDownload && !PH.dls) try { dl.click(); } catch (e) { } // in the app the viewer confirms each save, so it waits for the button
  return url;
}
function closeShot() { if (!PH.out) return; PH.out = false; show('phOut', false); }
// the photo should match the live view minus the HUD: WebGL frame + the net layer canvas (#dig) at its current opacity + the vignette
function phCompose(gl) {
  const w = gl.width, h = gl.height; let cv = PH.cv; if (!cv) cv = PH.cv = document.createElement('canvas');
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const x = cv.getContext('2d'); x.globalAlpha = 1; x.drawImage(gl, 0, 0, w, h); // same task as the render, so the buffer is still there
  const dg = $('dig'); if (dg && dg.width && dg.height) { const op = +getComputedStyle(dg).opacity || 0; if (op > .01) { x.globalAlpha = Math.min(1, op); x.drawImage(dg, 0, 0, w, h); x.globalAlpha = 1; } }
  const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.hypot(w, h) / 2); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  return cv.toDataURL('image/jpeg', .92);
}

/* ---------- Augment drives the accent layer of the whole UI ---------- */
function uiAug(v) { document.body.style.setProperty('--aug', (+v || 0).toFixed(3)); HUD.qc = null; SET.sl.forEach(s => s._draw && s._draw()); }
uiAug(G.aug); AUG_HOOKS.push(uiAug);
