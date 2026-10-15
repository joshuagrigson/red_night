/* =====================================================================
   RED NIGHT — traffic: a pool of AI cars that drive the street grid in the
   right-hand lane, turn at intersections, brake for people and cars, and
   get recycled around the player. Any of them can be carjacked (the driver
   bails and runs). When the night runs hot, purger crews drive in; after
   midnight the Council's sweep vans do, and street crews roll up in numbers.
   ===================================================================== */
const TRAFFIC = [], TRAFFIC_ALL = [];
const LANE = 1.45;
const roadNear = v => Math.round((v + HALF) / CW) * CW - HALF;
const trafficHeat = () => typeof HEAT !== 'undefined' ? HEAT.level : 0;
function trafficState(cruise) { return { f: new T.Vector3(1, 0, 0), g: new T.Vector3(1, 0, 0), entry: new T.Vector3(), exit: new T.Vector3(), wp: null, stage: 0, turning: false, wait: 0, honkT: 0, stuck: 0, scan: 0, civBlock: 99, panic: 0, cruise, inp: { x: 0, y: 0, brake: false, ai: 1 } }; }
function trafficInit() {
  const n = G.quality === 'high' ? 12 : 7;
  const glowCols = [0xff2a6d, 0x05d9e8, 0xf3e600, 0xb04dff, 0x3dff6a];
  for (let k = 0; k < n; k++) {
    const c = new Car(0, -1000 - k * 10, 0, pick([0x1a1a22, 0x8a0a2a, 0x0a2a4a, 0xe8e8f0, 0x111111, 0x3a0a5a, 0x5a5a60, 0x2a4a3a]), pick(glowCols));
    c.ai = trafficState(rand(8.5, 12));
    CARS.push(c); TRAFFIC.push(c); TRAFFIC_ALL.push(c); trafficPlace(c, true);
  }
  gangInit();
}
// is a ground point inside the camera's horizontal view (plus a margin)? Occlusion is ignored: in view means in view
const _tvF = new T.Vector3();
function trafficInView(x, z) {
  camera.getWorldDirection(_tvF); const fl = Math.hypot(_tvF.x, _tvF.z) || 1, dx = x - camera.position.x, dz = z - camera.position.z, dl = Math.hypot(dx, dz) || 1;
  return (dx * _tvF.x + dz * _tvF.z) / (fl * dl) > Math.cos(Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect) + .2);
}
// put a car in a lane on a road 45-110 m from the player (anywhere on first spawn), never popping in where you're looking
function trafficPlace(c, first) {
  for (let tries = 0; tries < 30; tries++) {
    const alongX = Math.random() < .5, line = ROADS[1 + Math.floor(Math.random() * (ROADS.length - 2))], dirS = Math.random() < .5 ? 1 : -1;
    const t = roadNear(rand(-HALF + 20, HALF - 20)) + CW / 2 + rand(-8, 8);
    const fx = alongX ? dirS : 0, fz = alongX ? 0 : dirS, x = (alongX ? t : line) - fz * LANE, z = (alongX ? line : t) + fx * LANE;
    const d = Math.hypot(x - P.pos.x, z - P.pos.z); if (!first && (d < 45 || d > 110)) continue;
    if (!first && d < 85 && trafficInView(x, z)) continue;
    let clear = true; for (const o of CARS) if (o !== c && !o.gone && (o.pos.x - x) ** 2 + (o.pos.z - z) ** 2 < 64) { clear = false; break; } if (!clear) continue;
    const A = c.ai; c.pos.set(x, 0, z); c.h = Math.atan2(-fx, -fz); c.speed = A.cruise * .6; A.f.set(fx, 0, fz); A.wp = null; A.stuck = 0; A.wait = 0; A.panic = 0; c.dead = false; c.g.visible = true;
    if (c.dm) { c.dm.hp = c.dm.max; if (c.hoodFire) { const k = FIRES.indexOf(c.hoodFire); if (k >= 0) FIRES.splice(k, 1); c.hoodFire = null; } } // a recycled car used to leave its hood fire burning in mid-air
    c.sync(); return true;
  }
  return false;
}
// next waypoint: drive to the far side of the coming intersection, maybe turning. A turn is only legal if the junction
// after it is still an inner one (the old 9 m look-ahead let cars run straight onto the perimeter and into the wall)
function trafficPlan(c) {
  const A = c.ai, f = A.f; const ax = Math.abs(f.x) > .5;
  const along = ax ? c.pos.x : c.pos.z, cross = ax ? c.pos.z : c.pos.x, sgn = ax ? Math.sign(f.x) : Math.sign(f.z);
  let nextLine = roadNear(along + sgn * (CW / 2)); if ((nextLine - along) * sgn < 6) nextLine += sgn * CW;
  const lineHere = roadNear(cross), cx = ax ? nextLine : lineHere, cz = ax ? lineHere : nextLine, rx = -f.z, rz = f.x, IN = HALF - CW + 1;
  const ok = (x, z) => Math.abs(cx + x * CW) < IN && Math.abs(cz + z * CW) < IN;
  let gx = f.x, gz = f.z;
  if (A.gang) { // a crew heads for your block: the legal exit that ends nearest you
    let bd = 1e9; for (let k = 0; k < 3; k++) { const ox = k === 0 ? f.x : k === 1 ? rx : -rx, oz = k === 0 ? f.z : k === 1 ? rz : -rz; if (!ok(ox, oz)) continue; const d = Math.hypot(cx + ox * CW - P.pos.x, cz + oz * CW - P.pos.z) + Math.random() * 6; if (d < bd) { bd = d; gx = ox; gz = oz; } }
  } else {
    const r = Math.random(); if (r < .22) { gx = rx; gz = rz; } else if (r < .36) { gx = -rx; gz = -rz; }
    if (!ok(gx, gz)) { if (ok(f.x, f.z)) { gx = f.x; gz = f.z; } else if (ok(rx, rz)) { gx = rx; gz = rz; } else if (ok(-rx, -rz)) { gx = -rx; gz = -rz; } else { gx = -f.x; gz = -f.z; } }
  }
  A.entry.set(cx - f.x * 5 + rx * LANE, 0, cz - f.z * 5 + rz * LANE);
  A.exit.set(cx + gx * 6 - gz * LANE, 0, cz + gz * 6 + gx * LANE);
  A.g.set(gx, 0, gz); A.turning = gx * f.x + gz * f.z < .5; A.wp = 1; A.stage = 0;
}
function laneBlock(c, fx, fz, x, z, r, block) { const dx = x - c.pos.x, dz = z - c.pos.z, fwd = dx * fx + dz * fz; if (fwd < 1 || fwd > 13) return block; return Math.abs(dx * fz - dz * fx) < 1.3 + r ? Math.min(block, fwd) : block; }
function trafficDrive(c, dt) {
  const A = c.ai; if (!A.wp) trafficPlan(c);
  const fx = -Math.sin(c.h), fz = -Math.cos(c.h), heat = trafficHeat();
  // stage 0: to the intersection entry, 1: through it to the exit, then lane-follow on the new road
  const wp = A.stage === 0 ? A.entry : A.exit;
  const dist = Math.hypot(wp.x - c.pos.x, wp.z - c.pos.z);
  if (A.stage === 0 && dist < 3.5) A.stage = 1;
  else if (A.stage === 1 && dist < 3) { A.f.copy(A.g); A.wp = null; }
  // pure pursuit: steer toward a point 7 m down the lane
  let ax_ = wp.x, az_ = wp.z;
  if (A.stage === 0 && dist > 10) { ax_ = c.pos.x + A.f.x * 7; az_ = c.pos.z + A.f.z * 7; if (Math.abs(A.f.x) > .5) az_ = roadNear(c.pos.z) + A.f.x * LANE; else ax_ = roadNear(c.pos.x) - A.f.z * LANE; }
  let dvx = ax_ - c.pos.x, dvz = az_ - c.pos.z; const dl = Math.hypot(dvx, dvz) || 1; dvx /= dl; dvz /= dl;
  const steer = clamp((fx * dvz - fz * dvx) * 2.6, -1, 1);
  // speed: slow for turns, stop for anything in the lane ahead; a hot night has everyone driving faster
  let want = A.turning && (A.stage === 1 || dist < 14) ? (A.gang ? 7 : 5) : A.gang ? 17 + heat : A.cruise * (1 + heat * .04);
  let block = 99;
  if (!P.dead) block = laneBlock(c, fx, fz, P.pos.x, P.pos.z, .4, block);
  if (A.wait < (A.gang ? 1.5 : 4)) for (const o of CARS) if (o !== c && !o.gone) block = laneBlock(c, fx, fz, o.pos.x, o.pos.z, .3, block); // after a while stuck behind a car, creep through (breaks intersection deadlocks)
  if ((A.scan -= dt) <= 0) { A.scan = .2; let b = 99; for (const p of CIVS) if (!p.dead) b = laneBlock(c, fx, fz, p.pos.x, p.pos.z, .4, b); for (const e of ENEMIES) if (!e.dead) b = laneBlock(c, fx, fz, e.pos.x, e.pos.z, .4, b); A.civBlock = b; }
  if (!A.gang || A.wait < 1.5) block = Math.min(block, A.civBlock); // a crew on its way doesn't wait for pedestrians
  if (block < 13) want = Math.min(want, Math.max(0, (block - 4) * 1.1));
  if (A.panic > 0) { A.panic -= dt; if (block > 9) want = Math.max(want, 15 + heat); } // floor it, but not through the people in the lane
  const y = want > c.speed + .5 ? 1 : want < c.speed - .8 ? -1 : 0;
  if (Math.abs(c.speed) < .4) A.stuck += dt; else A.stuck = 0;
  if (Math.abs(c.speed) < .5 && block < 6) { A.wait += dt; if (A.wait > 5 && (A.honkT -= dt) <= 0) { A.honkT = rand(3, 6); const sp = spatial(c.pos); AU.tone('square', 392, 380, .5, .08 * sp.vol, sp.pan); AU.tone('square', 466, 450, .5, .06 * sp.vol, sp.pan); } } else A.wait = 0;
  const I = A.inp; I.x = steer; I.y = y; I.brake = block < 5; return I;
}
let trafT = 0;
function updateTraffic(dt) {
  if (G.state !== 'city') return;
  trafT -= dt; const recheck = trafT <= 0; if (recheck) trafT = .5;
  for (const c of TRAFFIC) {
    if (!c.ai || c.dead || P.inCar === c) continue; // burnt wrecks stay where they burned
    if (G.inside) continue;
    c.aiInp = trafficDrive(c, dt);
    if (recheck && (c.pos.distanceToSquared(P.pos) > 130 * 130 || (c.ai.stuck > 9 && c.pos.distanceToSquared(P.pos) > 35 * 35))) { c.ai.stuck = 0; trafficPlace(c); }
  }
  if (recheck) { trafficKeep(); gangTick(.5); }
  gangDrive(dt);
  // draw-distance culling for every car (parked or moving)
  if (recheck) for (const c of CARS) { const d2 = c.pos.distanceToSquared(camera.position); const vis = d2 < (G.quality === 'high' ? 130 : 95) ** 2; if (c.g.visible !== vis && !c.gone) c.g.visible = vis; }
}
// gunfire nearby makes drivers floor it; the hotter the night, the wider and longer they spook
function trafficPanic(pos) { const h = trafficHeat(), r = 50 + h * 12; for (const c of TRAFFIC) if (c.ai && !c.dead && c.pos.distanceToSquared(pos) < r * r) c.ai.panic = Math.max(c.ai.panic, rand(5, 9) * (1 + h * .15)); }
// carjacks: the driver bails out of the door and runs; a car you leave behind goes back into traffic once you're well away
function trafficKeep() {
  for (const c of TRAFFIC_ALL) {
    if (c.ai || c.dead) continue;
    if (P.inCar === c) { if (!c.jackT) { c.jackT = G.t; carjackBail(c); } continue; }
    if (c.pos.distanceToSquared(P.pos) > 125 * 125 && !trafficInView(c.pos.x, c.pos.z)) trafficAdopt(c);
  }
  const h = trafficHeat(); // past heat 3 people just start running red lights near you
  if (h > 3) for (const c of TRAFFIC) if (c.ai && !c.dead && Math.random() < (h - 3) * .02 && c.pos.distanceToSquared(P.pos) < 70 * 70) c.ai.panic = Math.max(c.ai.panic, rand(4, 7));
}
function trafficAdopt(c) { c.ai = trafficState(rand(8.5, 12)); c.jackT = 0; if (TRAFFIC.indexOf(c) < 0) TRAFFIC.push(c); trafficPlace(c, G.state !== 'city'); }
function carjackBail(c) {
  if (typeof HEAT !== 'undefined') HEAT.add(.35);
  if (CIVS.length > 60 || typeof Civ === 'undefined') return;
  const sx = Math.cos(c.h), sz = -Math.sin(c.h); // the driver's door is on the left, where exitCar puts you
  const cv = new Civ(c.pos.x - sx * 1.9, c.pos.z - sz * 1.9, null, 0); collideCircle(cv.pos, .3, 0, 1.8); CIVS.push(cv); cv.mode = 'flee'; cv.panic(P.pos); civScream(cv.pos);
}
function trafficNightReset() { for (const c of TRAFFIC_ALL) if (!c.ai && P.inCar !== c) trafficAdopt(c); for (const c of TRAFFIC_ALL) c.jackT = 0; gangReset(); }

/* ---------- arrivals: at HEAT 2+ a purger crew speeds in through traffic, brakes hard short of you and spills out. After
   midnight a sweep van does the same whatever the heat, and the director can call a van or a crew car in ---------- */
const GANG = { cars: [], t: 18, sq: 100, req: null };
// the director asks for a van (kind: 'sweeper' | 'crew' | 'purger'); false if none is free
function gangCall(kind) { if (!G.started || G.inside || P.dead) return false; for (const o of GANG.cars) if (o.gang.st !== 'idle' && o.gang.st !== 'parked') return false; GANG.req = kind; GANG.t = 0; return true; }
function gangInit() { for (let k = 0; k < (G.quality === 'high' ? 2 : 1); k++) gangNew(); }
function gangNew() {
  const c = new Car(0, -2600 - GANG.cars.length * 12, 0, pick([0x0b0b0e, 0x1a0608, 0x0c1014]), pick([0xff1f3d, 0xff2a6d, 0xb04dff]));
  c.gang = { st: 'idle', t: 0, stopD: 30, crew: 3, k: 0, uT: 0, sq: 0, ix: GANG.cars.length }; c.gone = true; c.g.visible = false; CARS.push(c); GANG.cars.push(c); return c;
}
function gangHide(c) { const S = c.gang; S.st = 'idle'; c.ai = null; c.aiInp = null; c.gone = true; c.g.visible = false; c.speed = 0; c.pos.set(0, 0, -2600 - S.ix * 12); if (c.dm && !c.dead) { c.dm.hp = c.dm.max; if (c.hoodFire) { const k = FIRES.indexOf(c.hoodFire); if (k >= 0) FIRES.splice(k, 1); c.hoodFire = null; } } c.sync(); }
function gangReset() { for (const c of GANG.cars) gangHide(c); GANG.t = rand(15, 25); GANG.req = null; }
function gangTick(step) {
  const heat = trafficHeat(), late = (G.hour || 0) >= 5;
  if ((heat < 2 && !late && !GANG.req) || !G.started || G.inside || P.dead) return;
  if ((GANG.t -= step) > 0) return;
  let busy = 0, c = null;
  for (const o of GANG.cars) { const s = o.gang.st; if (s === 'drive' || s === 'brake' || s === 'unload') busy++; else if (s === 'idle' && !o.dead && !c) c = o; }
  const room = (typeof fightCap === 'function' ? fightCap() : 16) - (typeof fightersAlive === 'function' ? fightersAlive() : 0);
  if (busy >= (G.quality === 'high' ? 2 : 1) || room < 2) { GANG.t = 4; return; }
  if (!c && GANG.cars.length < 3) c = gangNew();
  const kind = GANG.req || (heat >= 2 && (!late || Math.random() < .5) ? 'purger' : late ? 'sweeper' : 'crew'); GANG.req = null;
  if (!c || !gangPlace(c, kind, room)) { GANG.t = 3; return; }
  GANG.t = rand(45, 80) / (1 + Math.max(0, heat - 2) * .4) * (heat < 2 ? 1.6 : 1);
}
// a lane 75-120 m out, pointed at you, out of sight unless it's far
function gangPlace(c, kind, room) {
  for (let tries = 0; tries < 40; tries++) {
    const alongX = Math.random() < .5, line = ROADS[1 + Math.floor(Math.random() * (ROADS.length - 2))];
    const t = roadNear(rand(-HALF + 20, HALF - 20)) + CW / 2 + rand(-8, 8), px = alongX ? t : line, pz = alongX ? line : t;
    const dirS = (alongX ? Math.sign(P.pos.x - px) : Math.sign(P.pos.z - pz)) || 1, fx = alongX ? dirS : 0, fz = alongX ? 0 : dirS;
    const x = px - fz * LANE, z = pz + fx * LANE, d = Math.hypot(x - P.pos.x, z - P.pos.z);
    if (d < 75 || d > 120 || (d < 100 && trafficInView(x, z))) continue;
    let clear = true; for (const o of CARS) if (o !== c && !o.gone && (o.pos.x - x) ** 2 + (o.pos.z - z) ** 2 < 100) { clear = false; break; } if (!clear) continue;
    c.pos.set(x, 0, z); c.h = Math.atan2(-fx, -fz); c.speed = 12; c.gone = false; c.g.visible = true; c.g.position.y = 0;
    const A = c.ai = trafficState(17); A.f.set(fx, 0, fz); A.gang = true;
    const S = c.gang; S.st = 'drive'; S.t = 0; S.stopD = rand(25, 40); S.crew = Math.min(room || 4, trafficHeat() >= 4 || kind === 'sweeper' ? rint(3, 4) : rint(2, 4)); S.k = 0; S.uT = 0; S.sq = ++GANG.sq;
    S.kind = kind || 'purger'; S.fac = S.kind === 'crew' ? pick(['eastline', 'rails']) : S.kind;
    c.sync(); return true;
  }
  return false;
}
function gangBrake(c) { const I = c.ai.inp; I.x = 0; I.y = c.speed > .6 ? -1 : 0; I.brake = true; c.aiInp = I; }
function gangDrive(dt) {
  for (const c of GANG.cars) {
    const S = c.gang; if (S.st === 'idle') continue;
    if (c.dead) { if (S.st !== 'parked') { S.st = 'parked'; c.ai = null; c.aiInp = null; } continue; } // the crew went up with it
    if (P.inCar === c) { if (S.st !== 'parked') { while (S.k < S.crew) { gangDismount(c, true); S.k++; } S.st = 'parked'; } continue; } // jacked before they got out: they pile out
    const d = Math.hypot(c.pos.x - P.pos.x, c.pos.z - P.pos.z);
    if (S.st === 'drive') {
      if (G.inside || !c.ai) continue;
      S.t += dt; c.aiInp = trafficDrive(c, dt);
      if (d < S.stopD || ((S.t > 50 || c.ai.stuck > 6) && d < 70)) { // brake hard, tyres howling
        S.st = 'brake'; const sp = spatial(c.pos); AU.nz(.75, 'bandpass', 2700, 1700, 6, .3 * sp.vol, sp.pan, .03); AU.nz(.5, 'lowpass', 900, 200, 1, .2 * sp.vol, sp.pan);
      } else if (S.t > 50 || c.ai.stuck > 6) gangHide(c);
    } else if (S.st === 'brake') {
      gangBrake(c); if (Math.random() < dt * 30) { const fx = -Math.sin(c.h), fz = -Math.cos(c.h); FXN.emit(c.pos.x - fx * 1.6 + rand(-.8, .8), .2, c.pos.z - fz * 1.6 + rand(-.8, .8), rand(-.3, .3), rand(.3, .8), rand(-.3, .3), rand(.8, 1.4), .4, 1.1, COL.ash, .35, -.1, 1); }
      if (Math.abs(c.speed) < 1.2) { S.st = 'unload'; S.uT = .3; }
    } else if (S.st === 'unload') {
      gangBrake(c);
      if ((S.uT -= dt) <= 0) { S.uT = rand(.3, .5); if (gangDismount(c, false) || d > 60) S.k++; if (S.k >= S.crew) { S.st = 'parked'; c.ai = null; c.aiInp = null; c.speed = 0; } }
    } else if (S.st === 'parked' && d > 150 && !trafficInView(c.pos.x, c.pos.z)) gangHide(c);
  }
}
// one out of a door, registered with the car's squad; never materialises in view inside 20 m. Purgers and sweepers come for
// you, aware (you're armed); a street crew gets out to find its rivals, and you're only its business up close
function gangDismount(c, force) {
  const S = c.gang, k = S.k, fx = -Math.sin(c.h), fz = -Math.cos(c.h), side = k % 2 ? 1 : -1;
  const p = _tvF.set(c.pos.x - fz * side * 1.7 + fx * (k < 2 ? .5 : -.9), 0, c.pos.z + fx * side * 1.7 + fz * (k < 2 ? .5 : -.9)); collideCircle(p, .45, 0, 1.8);
  const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z); if (!force && d < 20 && trafficInView(p.x, p.z)) return false;
  const kind = S.kind || 'purger', crew = kind === 'crew', e = new Enemy(kind, p.x, p.z, { aware: !crew, ranged: kind === 'purger' ? .8 : undefined, fac: S.fac, sq: S.sq });
  e.sq = S.sq; e.face = Math.atan2(-(P.pos.x - e.pos.x), -(P.pos.z - e.pos.z)); e.reactT = rand(.6, 1.1);
  if (crew) { // toward the nearest group it has a quarrel with, else on up the street the car was driving
    let rv = null, bd = 80 * 80; for (const o of ENEMIES) { if (o.dead || !o.human || !factionHostile(e, o)) continue; const d2 = o.pos.distanceToSquared(c.pos); if (d2 < bd) { bd = d2; rv = o; } }
    e.roam = rv ? rv.pos.clone() : new T.Vector3(c.pos.x + fx * rand(14, 24), 0, c.pos.z + fz * rand(14, 24)); collideCircle(e.roam, .6, 0, 1.8); e.roamT = rand(12, 20);
  } else { e.lastKnown.set(P.pos.x + rand(-3, 3), 0, P.pos.z + rand(-3, 3)); e.frags = Math.random() < .5 ? rint(1, 2) : 0; }
  ENEMIES.push(e); const sp = spatial(e.pos); AU.nz(.12, 'lowpass', 900, 160, 1, .45 * sp.vol, sp.pan); // door slam
  if (k === 0 && typeof feed === 'function') feed(kind === 'sweeper' ? '<b>COUNCIL SWEEPERS</b> · A van just stopped' : kind === 'crew' ? `<b>${FACTIONS[S.fac].name.toUpperCase()}</b> · Rolling up` : '<b>PURGER CREW</b> · Pulling up on you');
  return true;
}
