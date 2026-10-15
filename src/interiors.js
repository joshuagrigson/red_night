/* =====================================================================
   RED NIGHT — enterable interiors. Rooms are built off-map (like the apartment);
   doors on real street facades teleport in and out. While inside, the street's
   spawner pauses (except the club, which is an ambush).
   ===================================================================== */
const ROOMS = {};
G.inside = null;

function roomShell(id, ox, oz, W, D, H, wallC, floorC, ceilC) {
  const g = new T.Group(); g.position.set(ox, 0, oz); scene.add(g);
  const fl = mesh(new T.PlaneGeometry(W, D), new T.MeshStandardMaterial({ color: lc(floorC), roughness: .35, metalness: .2 }), 0, .01, 0, g); fl.rotation.x = -Math.PI / 2;
  const ce = mesh(new T.PlaneGeometry(W, D), STD(ceilC || 0x0c0a10, .9), 0, H, 0, g); ce.rotation.x = Math.PI / 2;
  const wm = STD(wallC, .85);
  const n = mesh(new T.PlaneGeometry(W, H), wm, 0, H / 2, -D / 2, g);
  const s = mesh(new T.PlaneGeometry(W, H), wm, 0, H / 2, D / 2, g); s.rotation.y = Math.PI;
  const w = mesh(new T.PlaneGeometry(D, H), wm, -W / 2, H / 2, 0, g); w.rotation.y = Math.PI / 2;
  const e = mesh(new T.PlaneGeometry(D, H), wm, W / 2, H / 2, 0, g); e.rotation.y = -Math.PI / 2;
  addBox(ox - W / 2 - 1, ox + W / 2 + 1, oz - D / 2 - 1, oz - D / 2, H + 1).surf = 'plaster'; addBox(ox - W / 2 - 1, ox + W / 2 + 1, oz + D / 2, oz + D / 2 + 1, H + 1).surf = 'plaster';
  addBox(ox - W / 2 - 1, ox - W / 2, oz - D / 2, oz + D / 2, H + 1).surf = 'plaster'; addBox(ox + W / 2, ox + W / 2 + 1, oz - D / 2, oz + D / 2, H + 1).surf = 'plaster';
  addBox(ox - W / 2 - 1, ox + W / 2 + 1, oz - D / 2 - 1, oz + D / 2 + 1, H + 2, { y0: H });
  // exit door on the south wall
  mesh(new T.BoxGeometry(1.3, 2.3, .08), STD(0x1a1418, .6, .3), 0, 1.15, D / 2 - .04, g);
  const [ec, ex] = cvs(128, 48); ex.fillStyle = '#3dff6a'; ex.font = "700 36px 'Chakra Petch', sans-serif"; ex.textAlign = 'center'; ex.shadowColor = '#3dff6a'; ex.shadowBlur = 10; ex.fillText('EXIT', 64, 38);
  const es = mesh(new T.PlaneGeometry(.6, .22), new T.MeshBasicMaterial({ map: texFrom(ec, true), transparent: true, toneMapped: false }), 0, 2.55, D / 2 - .05, g); es.rotation.y = Math.PI;
  INTER.push({ p: new T.Vector3(ox, 1.1, oz + D / 2 - .6), r: 1.8, label: 'Back to the street', key: 'E', act: () => exitRoom() });
  ROOMS[id] = { g, ox, oz, W, D, H, spawn: new T.Vector3(ox, 0, oz + D / 2 - 3.2), doors: [] };
  return ROOMS[id];
}
function signTex(txt, col, w, h, font) {
  const [c, x] = cvs(w || 512, h || 128); x.fillStyle = 'rgba(6,4,10,.92)'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = col; x.lineWidth = 6; x.strokeRect(5, 5, c.width - 10, c.height - 10);
  x.font = font || "700 64px 'Chakra Petch', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = col; x.shadowBlur = 18; x.fillStyle = col; x.fillText(txt, c.width / 2, c.height / 2 + 4);
  return texFrom(c, true);
}
// find a street-facing facade in a district for a door (north face of a lot, on a real building)
function findFacade(d, skip) {
  let found = 0;
  const order = []; for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) order.push([i, j]);
  const cxD = d === 0 || d === 3 ? -120 : 120, czD = d < 2 ? -120 : 120;
  order.sort((a, b) => Math.hypot(-HALF + a[0] * CW + 20 - cxD, -HALF + a[1] * CW + 20 - czD) - Math.hypot(-HALF + b[0] * CW + 20 - cxD, -HALF + b[1] * CW + 20 - czD));
  for (const [i, j] of order) {
    const bx = -HALF + i * CW, bz = -HALF + j * CW; if (districtAt(bx + 20, bz + 20) !== d) continue;
    for (const x of [bx + 12, bx + 27]) {
      const z = bz + 7.4; const hit = BOX.find(b => !b.water && b.y0 === 0 && b.y1 > 5 && x > b.x0 + 1.5 && x < b.x1 - 1.5 && z > b.z0 && z < b.z0 + 1 && Math.abs(b.z0 - (bz + 7)) < .3);
      if (!hit) continue;
      if (found++ < (skip || 0)) continue;
      return { x, z: hit.z0, ret: new T.Vector3(x, 0, hit.z0 - 2.2) };
    }
  }
  return null;
}
function streetDoor(roomId, label, sign, col, d, skip, metro) {
  const f = findFacade(d, skip); if (!f) return null;
  const c3 = new T.Color(col);
  mesh(new T.BoxGeometry(2.2, 2.9, .3), STD(0x0c0a10, .4, .7), f.x, 1.45, f.z - .3);                       // recessed frame
  const door = mesh(new T.PlaneGeometry(1.6, 2.5), new T.MeshBasicMaterial({ color: c3.clone().multiplyScalar(.55), toneMapped: false }), f.x, 1.3, f.z - .47); door.rotation.y = Math.PI;
  const sg = mesh(new T.PlaneGeometry(metro ? 3.2 : 4.2, metro ? 1 : 1.05), new T.MeshBasicMaterial({ map: signTex(sign, col), transparent: true, toneMapped: false }), f.x, 3.6, f.z - .5); sg.rotation.y = Math.PI;
  if (metro) { for (const s of [-1, 1]) mesh(new T.BoxGeometry(.06, 1, 2.4), STD(0x1a5a2a, .4, .7), f.x + s * 1.2, .5, f.z - 1.6); }
  addLS(f.x, 3, f.z - 2, c3, 2.6, 14);
  const D = { room: roomId, ret: f.ret, label, d }; ROOMS[roomId] && ROOMS[roomId].doors.push(D);
  INTER.push({ p: new T.Vector3(f.x, 1.2, f.z - 1.2), r: 2.4, label, key: 'E', act: () => enterRoom(roomId, D) });
  return D;
}

function enterRoom(id, door) {
  const R = ROOMS[id]; if (!R || G.state !== 'city' || P.inCar) return;
  $('fade').style.transition = 'opacity .35s'; $('fade').style.opacity = 1; G.state = 'transit';
  setTimeout(() => {
    G.inside = id; G.door = door; P.pos.copy(R.spawn); P.vel.set(0, 0, 0); P.yaw = 0; P.pitch = 0;
    G.state = 'city'; $('fade').style.opacity = 0;
    setTxt('distName', R.name); setTxt('objective', R.sub); flashBanner(R.name, R.sub, 2);
    R.onEnter && R.onEnter();
  }, 380);
}
function exitRoom(toDoor) {
  if (!G.inside) return; const door = toDoor || G.door; if (!door) return;
  $('fade').style.transition = 'opacity .35s'; $('fade').style.opacity = 1; G.state = 'transit';
  setTimeout(() => {
    const R = ROOMS[G.inside]; R && R.onExit && R.onExit();
    G.inside = null; P.pos.copy(door.ret); P.vel.set(0, 0, 0); P.yaw = 0; G.dist = -1; G.state = 'city'; $('fade').style.opacity = 0;
  }, 380);
}
// a new night (or quit to title) while still inside a room: nothing reset G.inside, so the next night ran with the spawner,
// crowd and traffic paused, the rain off and the interior fog over the street. Called from the resetCombat hook in ai.js.
function interiorsReset() { if (!G.inside) return; const R = ROOMS[G.inside]; R && R.onExit && R.onExit(); G.inside = null; G.door = null; }

function buildInteriors() {
  // ---------------- GUN SHOP (Red River Arms / Pharaoh Arms share one back room)
  {
    const R = roomShell('guns', 1600, 0, 14, 10, 4, 0x34303a, 0x3a3028); R.name = 'GUN SHOP'; R.sub = 'Restock · Gunsmith · No refunds';
    const g = R.g;
    mesh(new T.BoxGeometry(9, 1.05, .9), STD(0x16141a, .4, .6), 0, .53, -1.6, g); mesh(new T.BoxGeometry(9.1, .06, 1), STD(0x3a3440, .2, .9), 0, 1.08, -1.6, g);
    mesh(new T.BoxGeometry(9, .04, .04), NEON(0xff2a6d), 0, 1.12, -1.12, g); addBox(1600 - 4.5, 1600 + 4.5, -2.05, -1.15, 1.1);
    // back-wall racks: one display gun per class
    const board = mesh(new T.BoxGeometry(12.5, 2.4, .08), new T.MeshStandardMaterial({ color: lc(0x2a2a30), roughness: .6, emissive: lc(0x6a5a50), emissiveIntensity: .55 }), 0, 2, -4.95, g);
    addLS(1600 - 3, 2.2, -4, 0xfff0d0, 3, 7); addLS(1600 + 3, 2.2, -4, 0xfff0d0, 3, 7);
    CLS.forEach((cl, k) => {
      const w = W_(cl.wall); if (!w) return; const built = buildWeapon(w, null, true);
      const h = new T.Group(); h.position.set(-5.2 + (k % 6) * 2.08, k < 6 ? 2.55 : 1.45, -4.75); h.rotation.y = Math.PI / 2; h.add(built.g); h.scale.setScalar(cl.id === 'pistol' || cl.id === 'special' ? 2 : 1.25); g.add(h);
    });
    for (let k = 0; k < 6; k++) { mesh(new T.BoxGeometry(.9, .55, .6), STD(0x2a3a22, .7, .3), -5.6 + k * .4 + (k > 2 ? 9 : 0), .28 + (k % 3 === 2 ? .55 : 0), 3.4 - (k % 3) * .1, g); }
    const s1 = mesh(new T.PlaneGeometry(6, 1.1), new T.MeshBasicMaterial({ map: signTex('AMMO · ARMS · ARMOR', '#f3e600', 1024, 160, "700 72px 'Chakra Petch', sans-serif"), transparent: true, toneMapped: false }), 0, 3.5, -4.9, g);
    addLS(1600, 3.4, -1.5, 0xffe0a0, 5, 16); addLS(1600 - 4, 3.2, -3.5, 0xfff0d0, 3.5, 10); addLS(1600 + 4, 3.2, -3.5, 0xfff0d0, 3.5, 10); addLS(1600 - 5, 2.5, 3, 0xff2a6d, 2.6, 10); addLS(1600 + 5, 2.5, 3, 0x05d9e8, 2.6, 10);
    for (const x of [-4, 0, 4]) { mesh(new T.BoxGeometry(2.6, .06, .3), NEON(0xfff0d0), x, 3.94, -2.5, g); mesh(new T.BoxGeometry(2.6, .06, .3), NEON(0xfff0d0), x, 3.94, 1.5, g); }
    let lastRestock = -9;
    INTER.push({ p: new T.Vector3(1600, 1.1, -.9), r: 2.2, label: 'Restock ammo', key: 'E', act: () => {
      if (G.hour - lastRestock < 1) { feed('<b>SHOP</b> · Shelves are empty — come back in an hour'); return; }
      lastRestock = G.hour; P.slots.forEach(s => { if (s && s.w.mag) { s.mag = s.w.mag; s.res = s.w.res * 2; } }); AU.mag(false); feed('<b>+FULL AMMO</b> · Paid in cash. Nobody asks.');
    } });
    INTER.push({ p: new T.Vector3(1600 - 4, 1.1, -.9), r: 1.8, label: 'Gunsmith', key: 'E', act: () => openSmith('ar') });
  }
  // ---------------- CHURCH (Salem) — sanctuary
  {
    const R = roomShell('church', 1700, 0, 16, 26, 9, 0x2a2430, 0x2a2018, 0x120e16); R.name = 'OLD NORTH CHURCH'; R.sub = 'Sanctuary · Nothing follows you in here';
    const g = R.g;
    FDGEO.pew = FDGEO.pew || new T.BoxGeometry(1, 1, 1);
    for (let r = 0; r < 8; r++) for (const sx of [-1, 1]) { mesh(new T.BoxGeometry(5.6, .5, .5), STD(0x3a2416, .7), sx * 3.6, .45, 7 - r * 2.2, g); mesh(new T.BoxGeometry(5.6, .9, .12), STD(0x3a2416, .7), sx * 3.6, .8, 7.25 - r * 2.2, g); addBox(1700 + sx * 3.6 - 2.8, 1700 + sx * 3.6 + 2.8, 7 - r * 2.2 - .3, 7 - r * 2.2 + .35, .9); }
    mesh(new T.BoxGeometry(5, 1.1, 1.6), STD(0xd8d0c0, .6), 0, .55, -10.5, g); addBox(1700 - 2.5, 1700 + 2.5, -11.3, -9.7, 1.1);
    mesh(new T.BoxGeometry(16, .3, 6), STD(0x3a2a22, .7), 0, .15, -10.5, g);
    // rose window + lancet windows (stained glass)
    const [rc, rx] = cvs(256, 256); const cols = ['#b04dff', '#ff2a6d', '#05d9e8', '#f3a600', '#3dff6a'];
    for (let i = 0; i < 16; i++) { rx.fillStyle = cols[i % 5]; rx.beginPath(); rx.moveTo(128, 128); rx.arc(128, 128, 120, i / 16 * TAU, (i + 1) / 16 * TAU); rx.fill(); }
    rx.strokeStyle = '#0a0608'; rx.lineWidth = 6; for (let i = 0; i < 16; i++) { rx.beginPath(); rx.moveTo(128, 128); rx.lineTo(128 + Math.cos(i / 16 * TAU) * 124, 128 + Math.sin(i / 16 * TAU) * 124); rx.stroke(); } rx.beginPath(); rx.arc(128, 128, 120, 0, TAU); rx.stroke(); rx.beginPath(); rx.arc(128, 128, 40, 0, TAU); rx.stroke();
    mesh(new T.CircleGeometry(2.6, 32), new T.MeshBasicMaterial({ map: texFrom(rc, true), toneMapped: false }), 0, 6.2, -12.95, g);
    for (let k = 0; k < 5; k++) for (const sx of [-1, 1]) {
      const [lc2, lx] = cvs(64, 192); for (let y = 0; y < 192; y += 16) for (let x = 0; x < 64; x += 16) { lx.fillStyle = pick(cols); lx.fillRect(x, y, 16, 16); } lx.strokeStyle = '#0a0608'; lx.lineWidth = 3; for (let y = 0; y <= 192; y += 16) { lx.beginPath(); lx.moveTo(0, y); lx.lineTo(64, y); lx.stroke(); }
      const p = mesh(new T.PlaneGeometry(1.2, 3.6), new T.MeshBasicMaterial({ map: texFrom(lc2, true), toneMapped: false, transparent: true, opacity: .85 }), sx * 7.95, 4.2, 8 - k * 4.4, g); p.rotation.y = -sx * Math.PI / 2;
    }
    // candles
    for (let k = 0; k < 14; k++) { const x = -2.2 + (k % 7) * .7, z = -10.1 - Math.floor(k / 7) * .5; mesh(new T.CylinderGeometry(.04, .04, .3, 6), STD(0xf0e8d0, .8), x, 1.25, z, g); glowSprite(x, 1.45, z, lc(0xffb347), .45, g); }
    addLS(1700, 2.4, -10, 0xffb347, 3.2, 14, .6); addLS(1700, 6, -12, 0xb04dff, 2.4, 18); addLS(1700, 4, 4, 0x6a4aff, 1.8, 16);
    let lastPray = -9;
    INTER.push({ p: new T.Vector3(1700, 1.1, -9.2), r: 2.4, label: 'Pray', key: 'E', act: () => {
      if (G.hour - lastPray < 1) { feed('<b>SANCTUARY</b> · The candles are still burning from your last prayer'); return; }
      lastPray = G.hour; P.hp = P.maxHp; flashBanner('SANCTUARY', 'Fully healed', 1.6); feed('<b>+FULL HEALTH</b> · Something is still listening');
    } });
  }
  // ---------------- CLUB NEON NOIR (Sacramento) — ambush arena
  {
    const R = roomShell('club', 1800, 0, 24, 24, 6, 0x0a0812, 0x08060c, 0x050408); R.name = 'NEON NOIR'; R.sub = 'The music never stopped. Neither did they.';
    const g = R.g; const club = new T.Group(); club.userData.dyn = true; g.add(club);
    const tiles = new T.InstancedMesh(new T.BoxGeometry(1.36, .06, 1.36), new T.MeshBasicMaterial({ toneMapped: false }), 64); const m4 = new T.Matrix4(); const col = new T.Color();
    for (let i = 0; i < 64; i++) { m4.makeTranslation(-5.25 + (i % 8) * 1.5, .04, -5.25 + Math.floor(i / 8) * 1.5); tiles.setMatrixAt(i, m4); tiles.setColorAt(i, col.set(0x111111)); }
    tiles.frustumCulled = false; club.add(tiles);
    mesh(new T.BoxGeometry(5, 1.2, 1.6), STD(0x101014, .3, .8), 0, .6, -10, club); mesh(new T.BoxGeometry(5.1, .05, .05), NEON(0x05d9e8), 0, 1.22, -9.2, club); addBox(1800 - 2.5, 1800 + 2.5, -10.8, -9.2, 1.2);
    const lasers = []; const lcols = [0xff2a6d, 0x05d9e8, 0x3dff6a, 0xf3e600];
    for (let k = 0; k < 8; k++) { const piv = new T.Group(); piv.position.set(-9 + (k % 4) * 6, 5.8, k < 4 ? -9 : 9); const b = new T.Mesh(new T.CylinderGeometry(.03, .03, 18, 6), ADD(lcols[k % 4], .55)); b.position.y = -9; piv.add(b); club.add(piv); lasers.push(piv); }
    const sp1 = { p: new T.Vector3(1800, 4, 0), c: new T.Color(0xff2a6d), i: 3, d: 20, f: 0 }, sp2 = { p: new T.Vector3(1800, 4, -8), c: new T.Color(0x05d9e8), i: 3, d: 20, f: 0 }; LS.push(sp1, sp2);
    const pal = [0xff2a6d, 0x05d9e8, 0xb04dff, 0xf3e600, 0x3dff6a];
    let beat = 0;
    UPD.push((dt, tt) => {
      if (G.inside !== 'club') return;
      const b = Math.floor(tt * 2.1); if (b !== beat) { beat = b; for (let i = 0; i < 64; i++) tiles.setColorAt(i, col.set(Math.random() < .45 ? pick(pal) : 0x0a0a0a).multiplyScalar(1.4)); tiles.instanceColor.needsUpdate = true; sp1.c.set(pick(pal)); sp2.c.set(pick(pal)); AU.thump && AU.thump(); }
      lasers.forEach((l, k) => { l.rotation.z = Math.sin(tt * (1 + k * .13) + k) * .7; l.rotation.x = Math.cos(tt * (.8 + k * .11)) * .5; });
    });
    let lastAmbush = -9;
    R.onEnter = () => {
      if (G.hour - lastAmbush < 1) return; lastAmbush = G.hour;
      flashBanner('AMBUSH', 'They were waiting on the dance floor', 2.2); AU.roar && AU.roar(0, 1);
      const types = ['vampire', 'vampire', 'purger', 'purger', 'vampire', G.hour > 4 ? 'demon' : 'purger'];
      types.forEach((t, k) => { const e = new Enemy(t, 1800 - 8 + (k % 3) * 8, -6 + Math.floor(k / 3) * 4); e.clubber = true; ENEMIES.push(e); });
    };
    R.onExit = () => { ENEMIES.filter(e => e.clubber && !e.dead).forEach(e => e.remove()); };
  }
  // ---------------- METRO — one platform, an entrance in every district
  {
    const R = roomShell('metro', 1900, 0, 44, 12, 5, 0x2a3a34, 0x3a3a3c); R.name = 'RED LINE METRO'; R.sub = 'Trains still running. Drivers not included.';
    const g = R.g;
    mesh(new T.BoxGeometry(44, .2, 4), STD(0x0a0a0c, .9), 0, -.08, -4, g);                       // track bed (visual)
    mesh(new T.BoxGeometry(44, .06, .5), NEON(0xf3e600), 0, .03, -1.75, g);                        // platform edge
    addBox(1900 - 22, 1900 + 22, -6, -2, 3);                                                        // keep off the tracks
    const car = new T.Group(); car.position.set(0, 0, -4); g.add(car);
    mesh(new T.BoxGeometry(30, 3.4, 3), STD(0xb8bcc4, .4, .7), 0, 1.9, 0, car);
    for (let k = 0; k < 9; k++) mesh(new T.PlaneGeometry(2, 1.1), new T.MeshBasicMaterial({ color: lc(0x8a8070), toneMapped: false }), -12 + k * 3, 2.3, 1.52, car);
    mesh(new T.BoxGeometry(30.1, .2, 3.05), NEON(0xff1f3d), 0, 1.1, 0, car);
    const names = ['CAIRO', 'SACRAMENTO', 'TEXARKANA', 'SALEM'], cols = ['#f3a600', '#05d9e8', '#ff2a6d', '#b04dff'];
    names.forEach((nm, d) => {
      const x = -15 + d * 10;
      mesh(new T.BoxGeometry(1.2, 1.4, .6), STD(0x1a1a20, .4, .7), x, .7, 4.8, g); addBox(1900 + x - .6, 1900 + x + .6, 4.5, 5.1, 1.4);
      const s = mesh(new T.PlaneGeometry(3, .75), new T.MeshBasicMaterial({ map: signTex(nm, cols[d]), transparent: true, toneMapped: false }), x, 2.6, 5.9, g); s.rotation.y = Math.PI;
      addLS(1900 + x, 3, 4, new T.Color(cols[d]), 1.6, 9);
      INTER.push({ p: new T.Vector3(1900 + x, 1.1, 4.2), r: 1.9, label: 'Ride to ' + nm, key: 'E', act: () => { const door = R.doors.find(o => o.d === d); if (door) { exitRoom(door); feed('<b>METRO</b> · Arriving ' + nm); } } });
    });
    addLS(1900 - 12, 4.5, 0, 0xd8f0ff, 2.6, 18); addLS(1900 + 12, 4.5, 0, 0xd8f0ff, 2.6, 18);
  }
  // ---------------- street doors
  streetDoor('guns', 'Enter Red River Arms', 'RED RIVER ARMS', '#ff2a6d', 2, 1);
  streetDoor('guns', 'Enter Pharaoh Arms', 'PHARAOH ARMS', '#f3a600', 0, 1);
  streetDoor('church', 'Enter Old North Church', '✝ OLD NORTH', '#b04dff', 3, 0);
  streetDoor('club', 'Enter Neon Noir', 'NEON NOIR', '#ff2a6d', 1, 0);
  for (let d = 0; d < 4; d++) streetDoor('metro', 'Take the metro', 'METRO ↓', ['#f3a600', '#05d9e8', '#ff2a6d', '#b04dff'][d], d, d === 1 || d === 3 ? 2 : 3, true);
}
