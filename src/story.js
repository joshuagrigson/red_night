/* =====================================================================
   RED NIGHT — story beats: emergency broadcasts, survivor safehouse runs,
   the final wave, and the dawn sign-off. All copy is original.
   ===================================================================== */
const STORY = { queue: [], cur: null, t: 0, safe: null, beacon: null, done: {} };

function bcastEl() {
  let el = document.getElementById('bcast'); if (el) return el;
  el = document.createElement('div'); el.id = 'bcast';
  el.style.cssText = "position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 74px);transform:translateX(-50%);max-width:min(560px,86vw);padding:8px 14px 9px;background:rgba(8,4,12,.78);border:1px solid rgba(255,31,61,.7);border-left:4px solid #ff1f3d;font:500 14px/1.35 'Share Tech Mono',monospace;color:#ffd8de;z-index:30;pointer-events:none;opacity:0;transition:opacity .35s;text-shadow:0 0 6px rgba(255,31,61,.5)";
  el.innerHTML = "<div style=\"font:700 11px 'Chakra Petch',sans-serif;letter-spacing:.18em;color:#ff1f3d;margin-bottom:3px\" id='bcastTag'>EMERGENCY BROADCAST</div><div id='bcastTxt'></div>";
  document.body.appendChild(el); return el;
}
// queue lines; each types out, holds, then the next one plays
function broadcast(lines, tag) { (Array.isArray(lines) ? lines : [lines]).forEach(l => STORY.queue.push({ text: l, tag: tag || 'EMERGENCY BROADCAST' })); }

function storyIntro() {
  broadcast(['This is the Municipal Alert Network. This is not a drill.', 'From 7:00 PM to 7:00 AM, every law in Cairo, Sacramento, Texarkana and Salem is suspended.', 'Police, fire and medical services will not respond. Stay indoors. Lock your doors.', 'And whatever knocks tonight — do not let it wear a familiar face.']);
}
const HOUR_LINES = [
  null,
  ['KTXK 101.9 — Callers in Cairo say the bazaar lights came on by themselves.', 'RADIO'],
  ['Anonymous caller: "My neighbor\'s skin slipped. Like a glove." Line goes dead.', 'RADIO'],
  null, // 10 PM: safehouse broadcast handles this hour
  ['The moon is coming up red over Sacramento. The vampires love a blood moon.', 'RADIO'],
  ['Salem PD scanner, unattended: "...circle on Gallows Hill... seven of them chanting..."', 'SCANNER'],
  ['Halfway. If you can hear this, you\'re doing better than most.', 'RADIO'],
  ['Texarkana: the state line is meaningless tonight. Both sides are burning.', 'RADIO'],
  null, // 3 AM: second safehouse
  ['The devil\'s hour is over. Whatever made it through is the worst of them.', 'RADIO'],
  ['Survivor network: four hours of signal left. Ration your ammo.', 'SURVIVOR NET'],
  null, // 6 AM: final wave
];
const SAFEHOUSES = [
  { hour: 3, room: 'church', line: 'Survivor transmission: the Old North Church in Salem is holding. Doors open for ten minutes. Get there.' },
  { hour: 8, room: 'guns', line: 'Survivor transmission: Red River Arms in Texarkana still has lights and a full ammo cage. Move.' },
];
function storyHour(h) {
  if (h === 0) return;
  const L = HOUR_LINES[h]; if (L) broadcast(L[0], L[1]);
  const sh = SAFEHOUSES.find(s => s.hour === h);
  if (sh && !STORY.done['safe' + h]) {
    STORY.done['safe' + h] = 1; const R = ROOMS[sh.room]; const door = R && R.doors[0]; if (!door) return;
    broadcast(sh.line, 'SURVIVOR NET');
    STORY.safe = { door, until: G.hour + 1.5, name: sh.room === 'church' ? 'Old North Church' : 'Red River Arms' };
    showBeacon(door.ret);
  }
  if (h === 11 && !STORY.done.final) {
    STORY.done.final = 1;
    broadcast(['Final hour. They know the sun is coming — and they are coming for you first.'], 'EMERGENCY BROADCAST');
    flashBanner('FINAL WAVE', 'Hold out until 7:00 AM', 2.6); AU.siren(4); shake(.3);
    if (!G.inside) for (let k = 0; k < 6; k++) { const pt = spawnPoint(); if (pt) ENEMIES.push(new Enemy(pick(['purger', 'demon', 'vampire', 'shifter', 'reptile']), pt.x, pt.z)); }
    SPAWN.t = Math.min(SPAWN.t, .5);
  }
}
function storyDawn() { broadcast(['7:00 AM. This concludes Red Night. Emergency services will resume shortly.', 'The city thanks you for your participation.'], 'MUNICIPAL ALERT NETWORK'); }

function showBeacon(p) {
  if (!STORY.beacon) {
    const g = new T.Group(); g.userData.dyn = true;
    // no light column in the road: the objective is a pulsing ground ring plus a minimap marker
    const ring = new T.Mesh(new T.TorusGeometry(2.4, .08, 6, 40), NEON(0x3dff9a)); ring.rotation.x = Math.PI / 2; ring.position.y = .15; g.add(ring);
    scene.add(g); STORY.beacon = g; STORY.beaconLS = { p: new T.Vector3(), c: new T.Color(0x3dff9a), i: 3, d: 18, f: 0 }; LS.push(STORY.beaconLS);
    UPD.push((dt, tt) => { if (!g.visible) return; ring.scale.setScalar(1 + Math.sin(tt * 4) * .15); });
  }
  STORY.beacon.position.set(p.x, 0, p.z); STORY.beacon.visible = true; STORY.beaconLS.p.set(p.x, 3, p.z); STORY.beaconLS.i = 3;
}
function hideBeacon() { if (STORY.beacon) { STORY.beacon.visible = false; STORY.beaconLS.i = 0; } }

function storyUpdate(dt) {
  // broadcast typewriter
  const el = bcastEl();
  if (!STORY.cur && STORY.queue.length) { STORY.cur = STORY.queue.shift(); STORY.t = 0; document.getElementById('bcastTag').textContent = STORY.cur.tag; el.style.opacity = 1; AU.mag && AU.mag(true); }
  if (STORY.cur) {
    STORY.t += dt; const n = Math.floor(STORY.t * 42); const txt = STORY.cur.text;
    document.getElementById('bcastTxt').textContent = txt.slice(0, n) + (n < txt.length && Math.floor(STORY.t * 6) % 2 ? '▌' : '');
    const hold = txt.length / 42 + 2.6;
    if (STORY.t > hold) { STORY.cur = null; if (!STORY.queue.length) el.style.opacity = 0; }
  }
  // safehouse run
  const S = STORY.safe;
  if (S && G.state === 'city') {
    if (G.hour > S.until) { STORY.safe = null; hideBeacon(); feed('<b>SURVIVOR NET</b> · The safehouse went quiet'); setTxt('objective', G.inside ? '' : DIST[Math.max(0, G.dist)].sub); return; }
    if (G.inside) return;
    const dx = S.door.ret.x - P.pos.x, dz = S.door.ret.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d < 4) {
      STORY.safe = null; hideBeacon(); P.hp = P.maxHp; P.slots.forEach(s => { if (s && s.w.mag) { s.mag = s.w.mag; s.res = s.w.res * 2; } });
      addScore(1000, 'SAFEHOUSE REACHED'); flashBanner('SAFEHOUSE', 'Healed · Restocked · +1000', 2.4); broadcast('"Got you on camera. Door\'s open — get inside and breathe."', 'SURVIVOR NET');
      return;
    }
    const a = Math.atan2(dx, -dz) + P.yaw; const arr = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
    setTxt('objective', `${arr} Safehouse: ${S.name} · ${Math.round(d)}m`);
  }
}
