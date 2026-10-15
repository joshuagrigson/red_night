/* =====================================================================
   RED NIGHT — story beats: emergency broadcasts, survivor safehouse runs,
   the final wave, and the dawn sign-off. All copy is original.
   ===================================================================== */
const STORY = { queue: [], cur: null, t: 0, safe: null, beacon: null, done: {}, el: null, tagEl: null, txtEl: null, key: -1, on: false, wave: 0, waveT: 0 };

function bcastEl() {
  if (STORY.el) return STORY.el;
  let el = document.getElementById('bcast');
  if (!el) {
    el = document.createElement('div'); el.id = 'bcast';
    el.style.cssText = "position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 74px);transform:translateX(-50%);max-width:min(560px,86vw);padding:8px 14px 9px;background:rgba(8,4,12,.78);border:1px solid rgba(255,31,61,.7);border-left:4px solid #ff1f3d;font:500 14px/1.35 'Share Tech Mono',monospace;color:#ffd8de;z-index:30;pointer-events:none;opacity:0;transition:opacity .35s;text-shadow:0 0 6px rgba(255,31,61,.5)";
    el.innerHTML = "<div style=\"font:700 11px 'Chakra Petch',sans-serif;letter-spacing:.18em;color:#ff1f3d;margin-bottom:3px\" id='bcastTag'>EMERGENCY BROADCAST</div><div id='bcastTxt'></div>";
    document.body.appendChild(el);
  }
  STORY.el = el; STORY.tagEl = document.getElementById('bcastTag'); STORY.txtEl = document.getElementById('bcastTxt'); return el;
}
// queue lines; each types out, holds, then the next one plays. On a 667 px phone the box (38vw) holds three lines of
// ~105 characters before it runs into the banner, so longer copy is split at a sentence break
function broadcast(lines, tag) {
  (Array.isArray(lines) ? lines : [lines]).forEach(l => {
    while (l.length > 105) { const k = Math.max(l.lastIndexOf('. ', 105), l.lastIndexOf('? ', 105), l.lastIndexOf('! ', 105)); if (k < 20) break; STORY.queue.push({ text: l.slice(0, k + 1), tag: tag || 'EMERGENCY BROADCAST' }); l = l.slice(k + 2); }
    STORY.queue.push({ text: l, tag: tag || 'EMERGENCY BROADCAST' });
  });
}

function storyIntro() {
  broadcast(['This is the Municipal Alert Network. This is not a drill.', 'From 7:00 PM to 7:00 AM, every law in Cairo, Sacramento, Texarkana and Salem is suspended.', 'Police, fire and medical services will not respond. Stay indoors. Lock your doors.',
    G.supernatural === 'off' ? 'Council sweep teams deploy at midnight. They will not ask whose side you are on.' : 'And whatever knocks tonight — do not let it wear a familiar face.']);
}
// the night on the radio: crews, looters, the porches, the grid and the sweep teams. The supernatural lines replace a few only
// when the Monsters setting lets them in (rare: two after 10 PM; classic: v21's)
const HOUR_LINES = [
  null,
  ['KTXK 101.9 — Callers on State Line say Eastline and the Rail Kings are fighting over the rail bridge.', 'RADIO'],
  ['Scanner, unattended: "...windows going all down Capitol Mall... they\'re taking the pharmacies first..."', 'SCANNER'],
  null, // 10 PM: safehouse broadcast handles this hour
  ['Block Watch on Gallows Hill: anyone armed on their street will be fired on. They mean it.', 'RADIO'],
  ['Council notice: sweep teams are deployed citywide. Armed persons will be engaged without warning.', 'MUNICIPAL ALERT NETWORK'],
  ['Halfway. If you can hear this, you\'re doing better than most.', 'RADIO'],
  ['Texarkana: the state line is meaningless tonight. Both sides are burning.', 'RADIO'],
  null, // 3 AM: second safehouse
  ['Caller: "The sweepers cleared our block. Everyone. Even the ones with their hands up."', 'RADIO'],
  ['Survivor network: two hours of signal left. Ration your ammo.', 'SURVIVOR NET'],
  null, // 6 AM: final wave
];
const HOUR_LINES_SN = {
  classic: { 1: ['KTXK 101.9 — Callers in Cairo say the bazaar lights came on by themselves.', 'RADIO'], 2: ['Anonymous caller: "My neighbor\'s skin slipped. Like a glove." Line goes dead.', 'RADIO'], 4: ['The moon is coming up red over Sacramento. The vampires love a blood moon.', 'RADIO'], 9: ['The devil\'s hour is over. Whatever made it through is the worst of them.', 'RADIO'] },
  rare: { 4: ['Unconfirmed, Salem: something on Gallows Hill that walks like a man and isn\'t one.', 'SCANNER'], 9: ['The devil\'s hour is over. Whatever made it through is the worst of them.', 'RADIO'] },
};
const SAFEHOUSES = [
  { hour: 3, room: 'church', d: 3, line: 'Survivor transmission: the Old North Church in Salem is holding. Doors open for ten minutes. Get there.' },
  { hour: 8, room: 'guns', d: 2, line: 'Survivor transmission: Red River Arms in Texarkana still has lights and a full ammo cage. Move.' },
];
function storyHour(h) {
  if (h === 0) return;
  const L = (HOUR_LINES_SN[G.supernatural] || {})[h] || HOUR_LINES[h]; if (L) broadcast(L[0], L[1]);
  const sh = SAFEHOUSES.find(s => s.hour === h);
  if (sh && !STORY.done['safe' + h]) {
    STORY.done['safe' + h] = 1; const R = ROOMS[sh.room]; const door = R && (R.doors.find(o => o.d === sh.d) || R.doors[0]); // the guns room has a door in two districts
    if (door) {
      broadcast(sh.line, 'SURVIVOR NET');
      STORY.safe = { door, until: G.hour + 1.5, name: sh.room === 'church' ? 'Old North Church' : door.label.replace('Enter ', '') }; // the name of the door we actually point at
      showBeacon(door.ret);
    }
  }
  if (h === 11 && !STORY.done.final) {
    STORY.done.final = 1;
    broadcast(['Final hour. They know the sun is coming — and they are coming for you first.'], 'EMERGENCY BROADCAST');
    flashBanner('FINAL WAVE', 'Hold out until 7:00 AM', 2.6); AU.siren(4); shake(.3);
    STORY.wave = 6; STORY.waveT = 0; // they come for you even if you're indoors when the hour strikes: the wave waits at the door
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
const storyStreetSub = () => G.inside ? (ROOMS[G.inside] && ROOMS[G.inside].sub) || '' : DIST[districtAt(P.pos.x, P.pos.z)].sub;

function storyUpdate(dt) {
  // broadcast typewriter: the DOM is only touched when the visible text changes (it was rewritten every frame)
  const el = bcastEl();
  if (!STORY.cur && STORY.queue.length) { STORY.cur = STORY.queue.shift(); STORY.t = 0; STORY.key = -1; STORY.tagEl.textContent = STORY.cur.tag; el.style.opacity = 1; STORY.on = true; AU.mag && AU.mag(true); }
  if (STORY.cur) {
    STORY.t += dt; const txt = STORY.cur.text, n = Math.min(txt.length, Math.floor(STORY.t * 42)), caret = n < txt.length && Math.floor(STORY.t * 6) % 2 === 1;
    const key = n * 2 + (caret ? 1 : 0); if (key !== STORY.key) { STORY.key = key; STORY.txtEl.textContent = txt.slice(0, n) + (caret ? '▌' : ''); }
    if (STORY.t > txt.length / 42 + 2.6) { STORY.cur = null; if (!STORY.queue.length) { el.style.opacity = 0; STORY.on = false; } }
  } else if (STORY.on) { el.style.opacity = 0; STORY.on = false; } // a night restarted mid-line used to leave the old line up
  // safehouse run
  const S = STORY.safe;
  if (S && G.state === 'city') {
    if (G.hour > S.until) { STORY.safe = null; hideBeacon(); feed('<b>SURVIVOR NET</b> · The safehouse went quiet'); setTxt('objective', storyStreetSub()); }
    else if (!G.inside) {
      const dx = S.door.ret.x - P.pos.x, dz = S.door.ret.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d < 4) {
        STORY.safe = null; hideBeacon(); P.hp = P.maxHp; P.slots.forEach(s => { if (s && s.w.mag) { s.mag = s.w.mag; s.res = s.w.res * 2; } });
        addScore(1000, 'SAFEHOUSE REACHED'); flashBanner('SAFEHOUSE', 'Healed · Restocked · +1000', 2.4); broadcast('"Got you on camera. Door\'s open — get inside and breathe."', 'SURVIVOR NET');
        setTxt('objective', storyStreetSub()); // the "Safehouse · 3m" arrow used to stay up for the rest of the district
      } else {
        const a = Math.atan2(dx, -dz) + P.yaw; const arr = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
        setTxt('objective', `${arr} Safehouse: ${S.name} · ${Math.round(d)}m`);
      }
    }
  }
  // the final wave, staggered so six rigs don't build in one frame, held while you're indoors
  if (STORY.wave > 0 && G.state === 'city' && !G.inside && G.started && !P.dead && (STORY.waveT -= dt) <= 0) {
    STORY.waveT = .25; STORY.wave--; const pt = spawnPoint();
    if (pt) { const d = districtAt(pt.x, pt.z), m = Math.random() < superChance(11, d) ? pickMonster(d, 11) : null; ENEMIES.push(new Enemy(m || pick(['purger', 'purger', 'sweeper']), pt.x, pt.z, { aware: true, sq: 4999 })); } // the last push: purgers and a sweep team, one squad, all on you
  }
}
