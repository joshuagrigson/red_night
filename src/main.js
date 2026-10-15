/* =====================================================================
   RED NIGHT — game flow + main loop
   ===================================================================== */
const PICKS = [];
const FOGC = DIST.map(d => lc(d.fog));                 // district haze (authored as on-screen sRGB)
const APT_FOG = lc(0x161412), IN_FOG = lc(0x141311), DAWN_FOG = lc(0x8a7672);

function init() {
  if (CHARS_READY) for (const id in CHARS) if (CHARS[id].scene) clipsFor(id); // bake retargets up front, not mid-fight
  buildCity(); if (FAC.ok) buildSkyscrapers(); buildProps(); buildGrassAndMail(); trafficInit(); finishVegetation(); buildApartment(); buildInteriors(); buildStaticGlows(); G.baked = bakeStatic(); setupPost();
  buildPlayerBody();
  setupMenus(); if (IS_TOUCH) setupTouch();
  G.camMode = store('cam') || 'fpp';
  $('pCam').textContent = 'Camera: ' + (G.camMode === 'fpp' ? 'first person' : 'third person');
  onResize();
  G.state = 'title'; show('mTitle', true);
  $('fade').style.opacity = 0;
  if (IS_TOUCH && window.innerHeight > window.innerWidth) show('rotate', true);
  $('loading').remove();
  requestAnimationFrame(loop);
}
window.onResizeHook = () => { pvSize(); postSize(); HUD.scopeKey = null; if (IS_TOUCH) show('rotate', window.innerHeight > window.innerWidth && (G.state === 'title' || G.state === 'char')); };

/* ---------- starting / ending a night ---------- */
function clearNight() {
  for (const e of ENEMIES.slice()) e.remove(); ENEMIES.length = 0;
  for (const w of WISPS) scene.remove(w.g); WISPS.length = 0;
  for (const p of PROJ) scene.remove(p.obj); PROJ.length = 0;
  for (const p of PICKS) scene.remove(p.m); PICKS.length = 0;
  FXA.clear(); FXN.clear(); decals.forEach(d => d.visible = false);
  if (P.inCar) { P.inCar.occ = false; P.inCar = null; }
  AU.engineSet(false);
  resetCombat();
}
function startNight() {
  clearNight();
  Object.assign(P, { hp: 150, dead: false, deadT: 0, possT: 0, hexT: 0, acidT: 0, score: 0, kills: 0, heads: 0, longest: 0, exorcisms: 0, ads: 0, slide: 0, crouching: false, vel: new T.Vector3(), cur: 0, reloadT: 0, meleeT: 0, landDip: 0 });
  P.eyeH = 1.66;
  buildPlayerBody(); buildArms(); equipLoadout(false);
  // wake up on the bed
  P.pos.set(APT.x - 3.2, 0, APT.z + 2.4); P.yaw = .9; P.pitch = .9; G.wakeT = 3.2;
  G.state = 'apt'; G.nightT = 0; G.hour = 0; G.lastHour = -1; G.started = false; G.dawn = 0; SPAWN.t = 3; SPAWN.first = true;
  scene.fog.color.copy(APT_FOG); G.sky.uniforms.dawn.value = 0;
  show('hud', true); if (IS_TOUCH) show('touch', true); show('rotate', false);
  setTxt('distName', 'APARTMENT'); setTxt('objective', IS_TOUCH ? 'Tap a gun on the wall to gear up' : 'Gear up at the wall · door is behind you');
  setTxt('clock', '6:58 PM'); setTxt('clockSub', 'Sirens in two minutes');
  $('fade').style.transition = 'none'; $('fade').style.opacity = 1; requestAnimationFrame(() => { $('fade').style.transition = 'opacity 2.4s'; $('fade').style.opacity = 0; });
  canvas.style.filter = 'blur(8px)';
  AU.siren(9);
  flashBanner('WAKE UP', 'The sirens are going off', 3);
  G.dusk = 1; STORY.done = {}; STORY.safe = null; STORY.queue = []; STORY.cur = null; hideBeacon(); setTimeout(storyIntro, 2600);
}
function leaveApartment() {
  if (G.state !== 'apt') return;
  $('fade').style.transition = 'opacity .5s'; $('fade').style.opacity = 1; G.state = 'transit';
  setTimeout(() => {
    P.pos.set(0, 0, 8); P.yaw = 0; P.pitch = 0; P.vel.set(0, 0, 0); G.state = 'city'; G.started = true; G.dist = -1;
    $('fade').style.opacity = 0; AU.siren(12); shake(.2);
    flashBanner('THE PURGE HAS BEGUN', 'Survive until 7:00 AM', 3.4);
    feed('<b>7:00 PM</b> · Every street is open season');
  }, 550);
}
function addScore(n, label) { P.score += n; setTxt('score', P.score.toLocaleString()); if (label) feed(`<b>+${n}</b> ${label}`); }
function onKill(e, part, src) {
  P.kills++; if (part === 'head') P.heads++;
  let n = ET[e.type].score; const tags = [];
  if (part === 'head') { n = Math.round(n * 1.5); tags.push('HEADSHOT'); }
  if (e.possessed) { n *= 2; tags.push('POSSESSED'); }
  if (src && src.w && src.w.kind === 'melee') { n += 50; tags.push('MELEE'); }
  if (src === 'car') tags.push('ROADKILL'); if (src && src.blast) tags.push('EXPLOSION');
  if (src && src.dist > 60) { n += 100; tags.push(Math.round(src.dist) + 'M'); }
  addScore(n, (e.possessed ? 'Possessed ' : '') + ET[e.type].name.toUpperCase() + (tags.length ? ' · ' + tags.join(' · ') : ''));
  setTxt('kills', P.kills + ' KILLS');
  if (Math.random() < .38) dropPickup(e.pos);
}
function dropPickup(pos) {
  const g = new T.Group(); g.position.set(pos.x, .5, pos.z);
  const m = new T.Mesh(gBox(.36, .24, .24), new T.MeshStandardMaterial({ color: lc(0x1a3a2a), metalness: .6, roughness: .3, emissive: lc(0x3dff9a), emissiveIntensity: .5 })); g.add(m);
  const s = new T.Mesh(gBox(.38, .04, .26), NEON(0x3dff9a)); s.position.y = .06; g.add(s);
  glowSprite(0, 0, 0, lc(0x3dff9a), 1.6, g); scene.add(g); PICKS.push({ m: g, pos: g.position, t: 0 });
}
function updatePicks(dt) {
  for (let i = PICKS.length - 1; i >= 0; i--) {
    const p = PICKS[i]; p.t += dt; p.m.rotation.y += dt * 2; p.m.position.y = .5 + Math.sin(p.t * 3) * .1;
    if (p.t > 45) { scene.remove(p.m); PICKS.splice(i, 1); continue; }
    const dx = p.pos.x - P.pos.x, dz = p.pos.z - P.pos.z;
    if (dx * dx + dz * dz < 1.8 && !P.inCar) {
      P.slots.forEach(s => { if (!s || !s.w.mag) return; s.res = Math.min(s.w.res * 2, s.res + Math.ceil(s.w.mag * 1.5)); });
      P.hp = Math.min(P.maxHp, P.hp + 25); AU.mag(false); feed('<b>+AMMO</b> resupplied'); scene.remove(p.m); PICKS.splice(i, 1);
    }
  }
}
function damagePlayer(dmg, from, e) {
  if (P.dead || G.state !== 'city') return;
  P.hp -= dmg; P.regenT = 4; G.dmgFlash = .6; shake(Math.min(.5, dmg / 40)); AU.hurt(); damageDir(from);
  if (P.hp <= 0) killPlayer(e ? ET[e.type].name : 'the night');
}
function startPossession() {
  if (P.possT > 0 || P.dead) return;
  P.possT = 4.5; P.possMash = 0; flashBanner('POSSESSED', IS_TOUCH ? 'Mash MELEE to fight it out' : 'Mash F to fight it out', 2); AU.roar(0, 1); shake(.6);
}
function killPlayer(cause) {
  if (P.dead) return; P.dead = true; P.deadT = 0; P.hp = 0; P.possT = 0; G.deathCause = cause;
  flashBanner('FLATLINED', 'Taken by ' + cause, 3); AU.engineSet(false); P.inCar && (P.inCar.occ = false, P.inCar = null);
  setTimeout(() => endScreen(false), 2600);
}
function fmtClock(h) { const tot = 19 * 60 + Math.floor(h * 60); const hh = Math.floor(tot / 60) % 24, mm = tot % 60; const h12 = hh % 12 === 0 ? 12 : hh % 12; return `${h12}:${String(mm).padStart(2, '0')} ${hh >= 12 && hh < 24 ? 'PM' : 'AM'}`; }
function endScreen(won) {
  G.state = 'end'; releaseMouse(); show('touch', false); show('hud', false); show('mEnd', true);
  $('endTitle').textContent = won ? 'YOU SURVIVED' : 'FLATLINED'; $('endTitle').style.color = won ? 'var(--volt)' : 'var(--blood)';
  $('endEyebrow').textContent = won ? '07:00 AM · SUNRISE' : fmtClock(G.hour) + ' · ' + (G.deathCause || '');
  $('endText').textContent = won ? 'The sirens wind down. The sun comes up over four cities that are pretending it never happened.' : 'Red Night keeps going without you. Wake up and try again.';
  const sv = Math.floor(G.hour); const mins = Math.floor((G.hour - sv) * 60);
  const stats = [[P.score.toLocaleString(), 'Score'], [P.kills, 'Kills'], [P.heads, 'Headshots'], [Math.round(P.longest) + 'm', 'Longest shot'], [P.exorcisms, 'Exorcisms'], [`${sv}h ${mins}m`, 'Survived']];
  $('endStats').innerHTML = stats.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');
  const best = store('best') || 0; if (P.score > best) store('best', P.score);
}

/* ---------- interactions ---------- */
function updateInteract() {
  if (P.dead) { setPrompt(null); return; }
  if (P.inCar) { setPrompt('Exit car', 'E'); if (took('act')) exitCar(); return; }
  const eye = P.eye(), f = P.fwd(); let best = null, bd = 1e9;
  for (const it of INTER) {
    if (it.apt && G.state !== 'apt') continue; if (!it.apt && G.state !== 'city') continue; if (it.when && !it.when()) continue;
    const d = (it.car ? it.car.pos : it.p).distanceTo(it.car ? P.pos : P.pos.clone().setY(it.p.y));
    if (d > it.r) continue;
    if (it.look) { const v = it.p.clone().sub(eye).normalize(); if (v.dot(f) < .9) continue; }
    if (d < bd) { bd = d; best = it; }
  }
  if (!best && G.state === 'apt' && P.pos.z < APT.z - 1 && IS_TOUCH) best = { label: 'Open arsenal', key: 'E', act: () => { G.state = 'apt'; openLoadGridFromWall(); } };
  if (best) { setPrompt(best.label, best.key); if (took('act') || (best.look && took('click'))) best.act(); }
  else { setPrompt(null); took('act'); took('click'); }
}
function openLoadGridFromWall() { openSmith('ar'); }

/* ---------- lights: the nearest neon gets the real lights ---------- */
let lightT = 0; const activeLS = [];
function updateLights(dt) {
  lightT -= dt;
  if (lightT <= 0) {
    lightT = .25; const cp = camera.position;
    const cand = LS.map(l => [l.p.distanceToSquared(cp), l]).filter(a => a[0] < 90 * 90).sort((a, b) => a[0] - b[0]).slice(0, NL);
    activeLS.length = 0;
    for (let i = 0; i < NL; i++) { const L = lightPool[i]; const c = cand[i]; if (c) { L.position.copy(c[1].p); L.color.copy(c[1].c); L.distance = c[1].d; activeLS.push(c[1]); L.userData.ls = c[1]; } else { L.intensity = 0; L.userData.ls = null; } }
  }
  for (let i = 0; i < NL; i++) { const L = lightPool[i], s = L.userData.ls; if (!s) continue; const fl = s.f ? (1 - s.f * .5 + Math.random() * s.f * .5 + Math.sin(G.t * 17 + i) * .1 * s.f) : 1; L.intensity = damp(L.intensity, s.i * fl, 12, dt); }
  if (G.flashT > 0) { G.flashT -= dt; if (G.flashT <= 0) flashLight.intensity = 0; }
}
function updateFires(dt) {
  const cp = camera.position;
  for (const f of FIRES) {
    const dx = f.p.x - cp.x, dz = f.p.z - cp.z; if (dx * dx + dz * dz > 55 * 55) continue;
    if (Math.random() < dt * 30 * f.s) FXA.emit(f.p.x + rand(-.3, .3) * f.s, f.p.y, f.p.z + rand(-.3, .3) * f.s, rand(-.2, .2), rand(1.5, 3) * f.s, rand(-.2, .2), rand(.4, .8), .5 * f.s, .1, Math.random() < .5 ? COL.fire : COL.ember, .9, -1.5, 1);
    if (Math.random() < dt * 6 * f.s) FXN.emit(f.p.x, f.p.y + 1, f.p.z, rand(-.3, .3), rand(1, 2), rand(-.3, .3), rand(2, 3.5), .6, 2.5, COL.smoke, .35, -.3, .5);
  }
}
let lightningT = 15;
function updateWeather(dt) {
  lightningT -= dt;
  if (lightningT <= 0 && G.dawn < .2) { lightningT = rand(18, 40); G.bolt = .35; setTimeout(() => AU.thunder(), rand(400, 1600)); }
  const base = lerp(.5 + (G.dusk || 0) * .3, 1.2, G.dawn);
  if (G.bolt > 0) { G.bolt -= dt; const k = G.bolt > .25 || (G.bolt < .15 && G.bolt > .08) ? 1 : 0; G.sky.uniforms.flash.value = k; hemi.intensity = base + k * 1.4; $('flash').style.opacity = k * .12; }
  else { G.sky.uniforms.flash.value = 0; hemi.intensity = base; $('flash').style.opacity = 0; }
}

/* ---------- the clock ---------- */
function updateClock(dt) {
  if (!G.started || P.dead) return;
  G.nightT += dt; const total = G.nightMin * 60; G.hour = G.nightT / total * 12;
  setTxt('clock', fmtClock(Math.min(12, G.hour)));
  $('nightFill').style.width = clamp(G.hour / 12 * 100, 0, 100) + '%';
  const h = Math.floor(G.hour);
  if (h !== G.lastHour) {
    G.lastHour = h; const hh = (19 + h) % 24; G.holoDraw(String(hh).padStart(2, '0') + ':00', h < 11 ? (12 - h) + ' HOURS LEFT' : 'ALMOST DAWN');
    if (h > 0 && h < 12) { const msgs = ['', 'The demons are awake', 'Reptilians are dropping the disguise', 'The witches are out in Salem', 'Midnight. It gets worse from here', 'Half the city is burning', 'Something is wearing faces', 'The blood moon is at its peak', 'They can smell dawn coming', 'Hold on', 'Two hours left', 'Last hour. Run if you have to']; flashBanner(fmtClock(h), msgs[h] || '', 2.4); AU.siren(4); }
    setTxt('clockSub', h < 11 ? 'Survive until 7:00 AM' : 'Sunrise is close');
    storyHour(h);
  }
  if (G.hour >= 11.6) G.dawn = clamp((G.hour - 11.6) / .4, 0, 1);
  G.dusk = 1 - smooth01(G.hour / 1.4);               // 7 PM: the last light leaves the western sky
  G.sky.uniforms.dawn.value = G.dawn; G.sky.uniforms.dusk.value = G.dusk;
  if (G.hour >= 12 && G.state === 'city') {
    // sunrise: what can burn, burns
    for (const e of ENEMIES) if (!e.dead && (e.type === 'vampire' || e.type === 'demon' || e.type === 'witch')) e.die('body', null, 'sun');
    G.started = false; flashBanner('SUNRISE', 'You made it to 7:00 AM', 3); AU.siren(5); storyDawn(); hideBeacon();
    setTimeout(() => endScreen(true), 3200);
  }
}

/* ---------- main loop ---------- */
// title: slow dolly shots down each district's streets in the rain, cut through black
const TITLE_SHOTS = [
  [[40, 2.3, -14], [40, 2.8, -78], [40, 9, -170]],          // Sacramento: up the palm avenue toward the towers
  [[-80, 2.6, -24], [-80, 3.2, -84], [-80, 6, -200]],       // Cairo: into the old bazaar
  [[118, 1.9, 24], [121, 2.4, 86], [120, 4, 200]],          // Texarkana: down the state line
  [[-120, 2.1, 36], [-120, 2.5, 96], [-120, 5, 220]],       // Salem: wet cobbles, lanterns
  [[6, 3, 28], [10, 36, 70], [0, 34, -120]],                // crane up over the centre
];
const _tA = new T.Vector3(), _tB = new T.Vector3(), _tL = new T.Vector3();
function titleCam(dt) {
  const len = 13, t = (G.t + 2) / len, i = Math.floor(t) % TITLE_SHOTS.length, f = t - Math.floor(t), sh = TITLE_SHOTS[i];
  _tA.fromArray(sh[0]); _tB.fromArray(sh[1]); camera.position.lerpVectors(_tA, _tB, smooth01(f * .9 + .05));
  _tL.fromArray(sh[2]); camera.lookAt(_tL.x + Math.sin(G.t * .21) * 4, _tL.y + Math.sin(G.t * .13), _tL.z);
  camera.fov = 52; camera.updateProjectionMatrix(); G.rain.visible = true;
  const fd = f < .06 ? 1 - f / .06 : f > .94 ? (f - .94) / .06 : 0; $('fade').style.transition = 'none'; $('fade').style.opacity = Math.min(1, fd * 1.1);
  scene.fog.color.lerp(FOGC[districtAt(camera.position.x, camera.position.z)], Math.min(1, dt * 3));
  scene.fog.density = .0105; G.sky.uniforms.dusk.value = .2; G.sky.uniforms.dawn.value = 0;
}
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  drsTick(Math.min(.25, (now - last) / 1000));
  let dt = Math.min(.05, (now - last) / 1000); last = now;
  if (G.hitStop > 0) { G.hitStop -= dt; dt *= .2; }
  G.t += dt; G.dt = dt;
  const st = G.state;
  if (took('pause')) { if (st === 'city' || st === 'apt') pause(); else if (st === 'paused') resume(); else if (st === 'smith') closeSmith(); }
  if (st === 'title' || st === 'char') titleCam(dt);
  if (st === 'apt' || st === 'city') {
    if (st === 'apt' && G.wakeT > 0) {
      G.wakeT -= dt; const k = 1 - clamp(G.wakeT / 3.2, 0, 1);
      canvas.style.filter = k < .95 ? `blur(${(1 - k) * 8}px)` : 'none';
      P.pitch = lerp(.9, -.05, k * k); P.eyeH = lerp(.75, 1.66, Math.min(1, k * 1.4)); P.yaw = lerp(.9, .25, k);
      INP.lookX = INP.lookY = 0; PRESS.clear();
    } else { canvas.style.filter = 'none'; updatePlayer(dt); }
    updateInteract(); storyUpdate(dt);
    G.rain.visible = st === 'city' && !G.inside;
    if (st === 'city') {
      updateTraffic(dt);
      for (const c of CARS) if (c !== P.inCar) c.update(dt, c.ai && !c.dead && c.aiInp && !G.inside ? c.aiInp : { x: 0, y: 0 });
      updateSpawns(dt);
      for (let i = ENEMIES.length - 1; i >= 0; i--) ENEMIES[i] && ENEMIES[i].update(dt);
      updateSquads(dt); updateCivs(dt); updateMolotovs(dt); updateCarDamage(dt);
      updateWisps(dt); updateProj(dt); updatePicks(dt); updateClock(dt);
      const d = G.inside ? Math.max(0, G.dist) : districtAt(P.pos.x, P.pos.z);
      if (G.inside) { scene.fog.color.lerp(IN_FOG, dt * 3); scene.fog.density = .012; }
      else if (d !== G.dist) { G.dist = d; flashBanner(DIST[d].name, DIST[d].sub, 2.2); setTxt('distName', DIST[d].name); setTxt('objective', DIST[d].sub); }
      if (!G.inside) scene.fog.color.lerp(G.dawn > 0 ? DAWN_FOG : FOGC[d], dt * .6);
      if (!G.inside) scene.fog.density = lerp(G.quality === 'high' ? .0105 : .0125, .006, G.dawn) * (d === 3 ? 1.25 : 1);
      updateWeather(dt);
    } else { scene.fog.color.copy(APT_FOG); scene.fog.density = .02; }
    updateCamera(dt); updateBody(dt); updateVM(dt); updateFires(dt); updateMags(dt);
    P.suppressed = Math.max(0, (P.suppressed || 0) - dt * .7);
    hudUpdate(dt);
  } else if (st === 'photo') {
    if (typeof updatePhoto === 'function') updatePhoto(dt);
  } else if (st === 'smith' || st === 'paused' || st === 'pauseload') {
    if (G.pausedFrom === 'city' || G.prevState === 'city') { /* frozen world */ }
  } else if (st === 'end') {
    if (P.dead) { P.deadT += dt; updateCamera(dt); updateBody(dt); }
  }
  for (const f of UPD) f(dt, G.t);
  if (typeof updateAmbience === 'function') updateAmbience(dt, st);
  if (typeof updateDigital === 'function') updateDigital(dt, st);
  FXA.update(dt); FXN.update(dt);
  for (const tr of tracers) { if (tr.t > 0) { tr.t -= dt; tr.m.material.opacity = Math.max(0, tr.t / .07) * .9; if (tr.t <= 0) tr.m.visible = false; } }
  updateLights(dt);
  const pscale = renderer.domElement.height / 2 / Math.tan(camera.fov * Math.PI / 360);
  FXA.pts.material.uniforms.scale.value = FXN.pts.material.uniforms.scale.value = pscale;
  if (G.sglow) { G.sglow.uniforms.scale.value = pscale; G.sglow.uniforms.fogD.value = scene.fog.density; }
  G.vmOn = (st === 'apt' || st === 'city') && VM.root.visible && (G.camMode === 'fpp' || st === 'apt');
  if (POST.on) {
    POST.fin.uniforms.time.value = G.t; POST.fin.uniforms.hurt.value = (G.dmgFlash || 0) + (P.possT > 0 ? .6 : 0) + (P.suppressed || 0) * .22;
    POST.composer.render();
  } else {
    renderer.clear(); renderer.render(scene, camera);
    if (G.vmOn) { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
  }
  if (st === 'char' || st === 'smith') pvRender(dt);
}
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && (G.state === 'city' || G.state === 'apt') && !G.noPauseOnUnlock && !P.dead) pause();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && (G.state === 'city' || G.state === 'apt')) pause(); });

// fonts first so canvas signs render with the right faces
const fontReady = (document.fonts && document.fonts.load) ? Promise.race([Promise.all([document.fonts.load("700 30px 'Chakra Petch'"), document.fonts.load("40px 'Rubik Glitch'"), document.fonts.load("20px 'Share Tech Mono'")]), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
fontReady.then(() => Promise.all([loadModels(), loadChars(), loadLandmarks(), loadPBR(), loadFacades(), loadProps()])).then(() => setTimeout(init, 30)).catch(() => setTimeout(init, 30));
