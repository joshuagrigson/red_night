/* =====================================================================
   RED NIGHT — menus, gunsmith, HUD
   ===================================================================== */
const show = (id, on) => $(id).classList.toggle('hide', !on);
function releaseMouse() { G.noPauseOnUnlock = true; try { document.exitPointerLock(); } catch (e) { } setTimeout(() => G.noPauseOnUnlock = false, 300); }

/* ---------- preview renderer (character + gunsmith) ---------- */
const PV = { r: null, scene: new T.Scene(), cam: new T.PerspectiveCamera(32, 1, .01, 50), obj: null, rotY: .6, drag: null, mode: null, rig: null };
(() => {
  PV.scene.add(new T.HemisphereLight(0xb0a0ff, 0x200818, .9));
  const k = new T.DirectionalLight(0xffffff, 1.2); k.position.set(2, 3, 2); PV.scene.add(k);
  const m = new T.DirectionalLight(0xff2a6d, 1.4); m.position.set(-3, 1, -1); PV.scene.add(m);
  const c = new T.DirectionalLight(0x05d9e8, 1.1); c.position.set(3, -1, -2); PV.scene.add(c);
  PV.scene.environment = scene.environment;
  const fl = new T.Mesh(new T.CircleGeometry(1.2, 40), new T.MeshBasicMaterial({ map: glowTex, color: 0xff2a6d, transparent: true, opacity: .35, blending: T.AdditiveBlending, depthWrite: false }));
  fl.rotation.x = -Math.PI / 2; fl.userData.floor = 1; PV.floor = fl;
})();
function pvMount(holderId) {
  if (!PV.r) {
    const cv = document.createElement('canvas'); cv.id = 'pv';
    PV.r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); PV.r.outputEncoding = T.sRGBEncoding; PV.r.toneMapping = T.ACESFilmicToneMapping; PV.r.toneMappingExposure = 1.25;
    PV.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    cv.addEventListener('pointerdown', e => { PV.drag = e.clientX; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (PV.drag !== null) { PV.rotY += (e.clientX - PV.drag) * .01; PV.drag = e.clientX; } });
    cv.addEventListener('pointerup', () => PV.drag = null); cv.style.touchAction = 'none';
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
}
function setupMenus() {
  if (IS_TOUCH) $('keysHelp').textContent = 'Left thumb: move (push to the edge to sprint) · Right thumb: look · FIRE buttons let you look while shooting · AIM toggles sights · CAM swaps first / third person · tap a gun on the wall to open its class.';
  document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { G.quality = b.dataset.q; store('q', G.quality); applyPixelRatio(); onResize(); postSize(); syncChips(); });
  document.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { G.nightMin = +b.dataset.n; store('n', G.nightMin); syncChips(); });
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { G.sens = +b.dataset.s; store('s', G.sens); syncChips(); });
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { AU.setMusic(b.dataset.m === '1'); syncChips(); });
  syncChips();
  $('goChar').onclick = () => { AU.init(); openChar(); };
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
  $('pCam').onclick = () => toggleCam(); $('pLoad').onclick = openLoadGrid; $('loadBack').onclick = () => { show('mLoad', false); show('mPause', true); };
  $('endAgain').onclick = () => { show('mEnd', false); startNight(); }; $('endTitleBtn').onclick = () => { show('mEnd', false); quitToTitle(); };
  $('rotate').onclick = () => show('rotate', false);
}
function openChar() {
  G.state = 'char'; show('mTitle', false); show('mChar', true); pvMount('charPv'); charChanged();
}
function charChanged() {
  store('char', G.char);
  { const want = (PLAYER_MODELS[G.char.gender] || PLAYER_MODELS.m)[G.char.outfit]; if (CHARS_READY && CHARS[want] && !CHARS[want].scene) ensureChar(want).then(() => { if (CHARS[want].scene) charChanged(); }); }
  document.querySelectorAll('[data-g]').forEach(b => b.classList.toggle('sel', b.dataset.g === G.char.gender));
  [...$('skinSw').children].forEach((b, i) => b.classList.toggle('sel', i === G.char.skin));
  { const mm = maskMode(), nm = neonMode(); const lab = $('hairSw').previousElementSibling; if (lab) lab.textContent = nm ? 'Hair & neon' : mm ? 'Mask color' : CHARS_READY && playerGLBId() === 'witch' ? 'Hair & eyes' : 'Hair color';
    const hx = c => '#' + c.toString(16).padStart(6, '0');
    [...$('hairSw').children].forEach((b, i) => { b.classList.toggle('sel', i === G.char.hairCol);
      if (nm) { b.style.background = `linear-gradient(135deg, ${hx(HAIR_COLS[i])} 50%, ${hx(MASK_COLS[i])} 50%)`; b.style.boxShadow = '0 0 10px ' + hx(MASK_COLS[i]); b.ariaLabel = 'Hair and neon color ' + (i + 1); return; }
      const c = (mm ? MASK_COLS : HAIR_COLS)[i]; b.style.background = hx(c); b.style.boxShadow = mm ? '0 0 10px ' + hx(c) : ''; b.ariaLabel = (mm ? 'Mask color ' : 'Hair color ') + (i + 1); }); }
  [...$('hairOpts').children].forEach(b => b.classList.toggle('sel', b.dataset.hair === G.char.hair));
  [...$('fitOpts').children].forEach(b => b.classList.toggle('sel', b.dataset.fit === G.char.outfit));
  const o = OUTFITS[G.char.outfit];
  const hairRow = $('hairOpts').closest('.opt'); if (hairRow) hairRow.hidden = !!CHARS_READY; // the scanned models have fixed hairstyles
  const glb = CHARS_READY && makeGLBRig(playerGLBId());
  if (glb) {
    customizeGLB(glb, playerCust()); glb.st = { speed: 0, phase: 0, hold: 'none', t: 0 };
    const gun = buildWeapon(W.preacher, cfgOf('preacher'), true); const holder = new T.Group(); gun.g.rotation.x = -Math.PI / 2; gun.g.position.set(0, -.02, .01); holder.add(gun.g); const mount = attachToBone(glb.rArm.hand, holder, 0, 0, Math.PI); glb.gunMount = { g: mount, mode: 'tpp' };
    PV.rig = glb; pvSet(glb.root, 'char'); return;
  }
  const rig = makeRig({ gender: G.char.gender, skin: SKINS[G.char.skin], hair: G.char.hair, hairCol: HAIR_COLS[G.char.hairCol], top: o.top, bottom: o.bottom, accent: o.accent, sleeve: 1, visor: o.visor, leather: G.char.outfit !== 'corpo', collar: G.char.outfit === 'corpo' });
  rig.st = { speed: 0, phase: 0, hold: 'none', t: 0 };
  // a pistol in hand for the pose
  const gun = buildWeapon(W.preacher, cfgOf('preacher'), true); gun.g.rotation.x = -Math.PI / 2; gun.g.position.set(0, -.07, -.02); rig.rArm.hand.add(gun.g);
  PV.rig = rig; pvSet(rig.root, 'char');
}

/* ---------- gunsmith ---------- */
const SM = { cls: 'ar', sel: null, cat: 'optic', tab: 'att', back: 'apt' };
function openSmith(clsId) {
  SM.back = G.state === 'pauseload' ? 'pause' : 'apt'; SM.cls = clsId; releaseMouse();
  const cl = CLS.find(c => c.id === clsId);
  const eq = [G.load.s1, G.load.s2, G.load.melee];
  SM.sel = cl.ids.find(id => eq.includes(id)) || cl.wall;
  G.prevState = G.state === 'pauseload' ? 'paused' : G.state; G.state = 'smith';
  show('mSmith', true); show('mLoad', false); show('mPause', false); show('touch', false); show('hud', false);
  pvMount('smPv');
  // class tabs for quick hopping
  const tabs = $('smClassTabs'); tabs.innerHTML = '';
  CLS.forEach(c => { const b = document.createElement('button'); b.className = 'chip' + (c.id === clsId ? ' sel' : ''); b.textContent = c.short; b.onclick = () => openSmith(c.id); tabs.appendChild(b); });
  if (G.prevState === 'paused') G.prevState = 'paused';
  smRefresh();
}
function closeSmith() {
  show('mSmith', false); PV.obj && PV.scene.remove(PV.obj); PV.obj = null;
  if (G.prevState === 'paused') { G.state = 'paused'; show('mPause', true); }
  else { G.state = G.prevState || 'apt'; if (IS_TOUCH) show('touch', true); show('hud', true); }
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
function afterEquip(slot) { saveLoad(); equipLoadout(true); if (slot !== undefined) setWeapon(slot, true); if (slot === undefined) setWeapon(2, true); smRefresh(); toast('Equipped ' + W[SM.sel].name); }
function openLoadGrid() {
  G.state = 'pauseload'; show('mPause', false); show('mLoad', true);
  const g = $('loadGrid'); g.innerHTML = '';
  CLS.forEach(c => { const b = document.createElement('button'); b.className = 'btn'; b.innerHTML = `${c.name}`; b.onclick = () => openSmith(c.id); g.appendChild(b); });
}
function toast(msg) { feed(msg); }

/* ---------- pause ---------- */
function pause() {
  if (G.state !== 'city' && G.state !== 'apt') return;
  G.pausedFrom = G.state; G.state = 'paused'; releaseMouse(); show('mPause', true); show('touch', false); show('hud', false);
  AU.engineSet(false); mouseDown = false; rmb = false; INP.fire = false;
}
function resume() { show('mPause', false); show('mLoad', false); G.state = G.pausedFrom || 'city'; if (IS_TOUCH) show('touch', true); show('hud', true); }
function quitToTitle() {
  for (const id of ['mPause', 'mLoad', 'mSmith', 'mEnd', 'hud', 'touch']) show(id, false);
  clearNight(); G.state = 'title'; show('mTitle', true); AU.engineSet(false);
}

/* ---------- HUD ---------- */
const HUD = { last: {}, feedEls: [], dirs: [], dirI: 0, miniF: 0, bannerT: 0 };
function setTxt(id, v) { if (HUD.last[id] !== v) { HUD.last[id] = v; $(id).textContent = v; } }
function updateHUDWeapon() {
  const s = P.s(); if (!s) return; setTxt('wName', s.w.name);
  ['s1', 's2', 's3'].forEach((id, i) => { $(id).classList.toggle('on', P.cur === i); $(id).textContent = P.slots[i] ? (i === 2 ? P.slots[i].w.name : (i + 1) + ' ' + P.slots[i].w.name) : '—'; });
}
function hudUpdate(dt) {
  const s = P.s();
  // health
  const hp = Math.max(0, P.hp); const pct = hp / P.maxHp * 100;
  const fill = $('hpFill'); if (HUD.last.hp !== Math.round(pct)) { HUD.last.hp = Math.round(pct); fill.style.width = pct + '%'; }
  setTxt('hpTxt', Math.ceil(hp) + ' / ' + P.maxHp);
  setTxt('status', P.possT > 0 ? 'POSSESSED · MASH MELEE' : P.hexT > 0 ? 'HEXED · SLOWED' : P.inCar ? 'DRIVING · ' + Math.round(Math.abs(P.inCar.speed) * 3.6) + ' KM/H' : '');
  $('dmg').style.opacity = clamp((1 - hp / P.maxHp) * 1.2 + (G.dmgFlash || 0), 0, 1);
  G.dmgFlash = Math.max(0, (G.dmgFlash || 0) - dt * 2);
  $('poss').style.opacity = P.possT > 0 ? .55 + Math.sin(G.t * 9) * .2 : 0;
  $('hex').style.opacity = P.hexT > 0 ? .6 : 0;
  // ammo
  if (s) {
    const w = s.w;
    if (w.kind === 'melee') { setTxt('ammo', '∞'); }
    else if (w.kind === 'saw') { $('ammo').innerHTML = Math.round(s.mag) + '<small>% fuel</small>'; HUD.last.ammo = null; }
    else { const k = s.mag + '|' + s.res; if (HUD.last.ammoK !== k) { HUD.last.ammoK = k; $('ammo').innerHTML = s.mag + `<small> / ${s.res}</small>`; $('ammo').style.color = s.mag <= Math.ceil(w.mag * .25) ? 'var(--blood)' : ''; } }
  }
  // crosshair
  const cross = $('cross'); const hideC = !s || P.ads > .35 || P.inCar || (P.sprintK || 0) > .5 || G.state !== 'city';
  cross.style.opacity = hideC ? 0 : 1;
  if (!hideC && s) {
    const sp = s.w.kind === 'melee' || s.w.kind === 'saw' ? .8 : currentSpread(s);
    const gap = 4 + Math.tan(sp * Math.PI / 180) / Math.tan(camera.fov * Math.PI / 360) * window.innerHeight / 2;
    const g = Math.round(gap);
    if (HUD.last.gap !== g) { HUD.last.gap = g; const [t, b, l, r] = cross.querySelectorAll('i'); t.style.top = (-g - 9) + 'px'; b.style.top = g + 'px'; l.style.left = (-g - 9) + 'px'; r.style.left = g + 'px'; }
  }
  // reticle & scope
  const showRet = s && P.ads > .85 && s.st.ret && !s.st.overlay && !P.inCar && G.camMode === 'fpp';
  $('ret').style.opacity = showRet ? 1 : (s && P.ads > .85 && G.camMode === 'tpp' && !P.inCar ? 1 : 0);
  const scoped = s && P.ads > .92 && s.st.overlay && !P.inCar;
  $('scope').style.opacity = scoped ? 1 : 0;
  if (scoped && HUD.scopeKey !== s.id + s.cfg.retCol + s.cfg.retShape + window.innerWidth) drawScope(s);
  if (scoped) { const sw = (P.steadyK || 1) * 6; $('scope').style.transform = `translate(${Math.sin(G.t * .9) * sw}px,${Math.sin(G.t * 1.7) * sw * .8}px)`; }
  // hit marker
  if (HUD.hitT > 0) { HUD.hitT -= dt; $('hit').style.opacity = clamp(HUD.hitT / .15, 0, 1); }
  // damage directions
  HUD.dirs.forEach((d, i) => { const el = $('dirs').children[i]; if (d.t > 0) { d.t -= dt; const ang = Math.atan2(d.x - P.pos.x, -(d.z - P.pos.z)) + P.yaw; el.style.transform = `rotate(${ang}rad)`; el.style.opacity = clamp(d.t, 0, 1); } else el.style.opacity = 0; });
  // banner
  if (HUD.bannerT > 0) { HUD.bannerT -= dt; if (HUD.bannerT <= 0) $('banner').style.opacity = 0; }
  // prompt
  // minimap
  if (++HUD.miniF % 3 === 0) drawMini();
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
  x.strokeStyle = 'rgba(5,217,232,.35)'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, R - 6, -.6, .6); x.stroke();
  x.fillStyle = 'rgba(5,217,232,.7)'; x.font = "12px 'Share Tech Mono', monospace"; x.fillText(attOf('optic', s.cfg.optic).name.toUpperCase(), cx + R * .5, cy + R * .7);
}
function drawMini() {
  const c = $('mini'), x = c.getContext('2d'); const S = c.width, H = S / 2, sc = .62;
  x.clearRect(0, 0, S, S); x.save(); x.beginPath(); x.arc(H, H, H - 1, 0, TAU); x.clip();
  x.fillStyle = 'rgba(6,3,14,.85)'; x.fillRect(0, 0, S, S);
  x.translate(H, H); x.rotate(P.yaw); const px = P.pos.x, pz = P.pos.z;
  if (G.state === 'city') {
    const qc = ['rgba(243,166,0,.13)', 'rgba(5,217,232,.12)', 'rgba(255,42,109,.12)', 'rgba(176,77,255,.14)'];
    x.fillStyle = qc[0]; x.fillRect((-HALF - px) * sc, (-HALF - pz) * sc, HALF * sc, HALF * sc);
    x.fillStyle = qc[1]; x.fillRect((0 - px) * sc, (-HALF - pz) * sc, HALF * sc, HALF * sc);
    x.fillStyle = qc[2]; x.fillRect((0 - px) * sc, (0 - pz) * sc, HALF * sc, HALF * sc);
    x.fillStyle = qc[3]; x.fillRect((-HALF - px) * sc, (0 - pz) * sc, HALF * sc, HALF * sc);
    x.strokeStyle = 'rgba(200,200,255,.22)'; x.lineWidth = 12 * sc;
    for (const k of ROADS) { x.beginPath(); x.moveTo((k - px) * sc, (-HALF - pz) * sc); x.lineTo((k - px) * sc, (HALF - pz) * sc); x.moveTo((-HALF - px) * sc, (k - pz) * sc); x.lineTo((HALF - px) * sc, (k - pz) * sc); x.stroke(); }
    x.fillStyle = 'rgba(5,40,60,.9)'; x.fillRect((188 - px) * sc, (-240 - pz) * sc, 24 * sc, 234 * sc);
    x.strokeStyle = '#f3e600'; x.lineWidth = 1.5; x.beginPath(); x.moveTo((120 - px) * sc, (0 - pz) * sc); x.lineTo((120 - px) * sc, (240 - pz) * sc); x.stroke();
    for (const c2 of CARS) { x.fillStyle = '#05d9e8'; x.fillRect((c2.pos.x - px) * sc - 2, (c2.pos.z - pz) * sc - 2, 4, 4); }
    for (const p of PICKS) { x.fillStyle = '#3dff9a'; x.fillRect((p.pos.x - px) * sc - 2.5, (p.pos.z - pz) * sc - 2.5, 5, 5); }
    for (const e of ENEMIES) { if (e.dead || !e.R.root.visible) continue; x.fillStyle = e.mode === 'disguise' ? '#c8c8d0' : e.possessed ? '#ff6a00' : '#ff1f3d'; x.beginPath(); x.arc((e.pos.x - px) * sc, (e.pos.z - pz) * sc, 3, 0, TAU); x.fill(); }
    if (STORY.beacon && STORY.beacon.visible) { const bp = STORY.beacon.position; x.strokeStyle = '#3dff9a'; x.lineWidth = 2; x.beginPath(); x.arc((bp.x - px) * sc, (bp.z - pz) * sc, 6 + Math.sin(performance.now() / 200) * 1.5, 0, TAU); x.stroke(); }
    for (const w of WISPS) { x.fillStyle = '#ffb000'; x.beginPath(); x.arc((w.pos.x - px) * sc, (w.pos.z - pz) * sc, 2.5, 0, TAU); x.fill(); }
  }
  x.restore();
  x.fillStyle = '#f3e600'; x.beginPath(); x.moveTo(H, H - 7); x.lineTo(H + 5, H + 5); x.lineTo(H, H + 2); x.lineTo(H - 5, H + 5); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(5,217,232,.5)'; x.lineWidth = 1; x.beginPath(); x.arc(H, H, H - 1, 0, TAU); x.stroke();
  x.fillStyle = 'rgba(236,232,255,.8)'; x.font = "10px 'Share Tech Mono', monospace"; x.textAlign = 'center'; x.fillText('N', H + Math.sin(P.yaw) * (H - 9) * -1 * -1, H - Math.cos(P.yaw) * (H - 9) + 3);
}
function hitMarker(kill, head) {
  HUD.hitT = kill ? .32 : .15; const el = $('hit'); el.classList.toggle('kill', !!kill); el.style.opacity = 1; AU.hitmark(kill);
}
function flashBanner(h, p, dur) { $('bannerH').textContent = h; $('bannerP').textContent = p || ''; $('banner').style.opacity = 1; HUD.bannerT = dur || 2; }
function feed(html) {
  const f = $('feed'); const d = document.createElement('div'); d.innerHTML = html; f.prepend(d);
  while (f.children.length > 5) f.removeChild(f.lastChild);
  setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 4500);
}
function damageDir(src) { if (!src) return; const d = HUD.dirs[HUD.dirI] = { x: src.x, z: src.z, t: 1.2 }; HUD.dirI = (HUD.dirI + 1) % 4; }
function setPrompt(label, key) {
  const el = $('prompt');
  if (!label) { if (HUD.last.prompt) { el.style.opacity = 0; HUD.last.prompt = null; } $('bAct').classList.add('hide'); return; }
  if (HUD.last.prompt !== label) { HUD.last.prompt = label; el.innerHTML = (IS_TOUCH ? '' : `<kbd>${key}</kbd>`) + label; el.style.opacity = 1; $('bAct').textContent = label.toUpperCase(); }
  $('bAct').classList.remove('hide');
}
