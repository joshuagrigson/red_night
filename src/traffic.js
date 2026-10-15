/* =====================================================================
   RED NIGHT — traffic: a pool of AI cars that drive the street grid in the
   right-hand lane, turn at intersections, brake for people and cars, and
   get recycled around the player. Any of them can be carjacked.
   ===================================================================== */
const TRAFFIC = [];
const LANE = 1.45;
const roadNear = v => Math.round((v + HALF) / CW) * CW - HALF;
function trafficInit() {
  const n = G.quality === 'high' ? 12 : 7;
  const glowCols = [0xff2a6d, 0x05d9e8, 0xf3e600, 0xb04dff, 0x3dff6a];
  for (let k = 0; k < n; k++) {
    const c = new Car(0, -1000 - k * 10, 0, pick([0x1a1a22, 0x8a0a2a, 0x0a2a4a, 0xe8e8f0, 0x111111, 0x3a0a5a, 0x5a5a60, 0x2a4a3a]), pick(glowCols));
    c.ai = { f: new T.Vector3(1, 0, 0), wp: null, next: null, wait: 0, honkT: 0, cruise: rand(8.5, 12) };
    CARS.push(c); TRAFFIC.push(c); trafficPlace(c, true);
  }
}
// put a car in a lane on a road 45-110 m from the player (anywhere on first spawn)
function trafficPlace(c, first) {
  for (let tries = 0; tries < 30; tries++) {
    const alongX = Math.random() < .5, line = pick(ROADS.slice(1, -1)), dirS = Math.random() < .5 ? 1 : -1;
    const t = roadNear(rand(-HALF + 20, HALF - 20)) + CW / 2 + rand(-8, 8);
    const f = alongX ? new T.Vector3(dirS, 0, 0) : new T.Vector3(0, 0, dirS); const right = new T.Vector3(-f.z, 0, f.x);
    const p = alongX ? new T.Vector3(t, 0, line) : new T.Vector3(line, 0, t); p.addScaledVector(right, LANE);
    const d = p.distanceTo(P.pos); if (!first && (d < 45 || d > 110)) continue;
    if (CARS.some(o => o !== c && o.pos.distanceToSquared(p) < 64)) continue;
    c.pos.copy(p); c.h = Math.atan2(-f.x, -f.z); c.speed = c.ai.cruise * .6; c.ai.f.copy(f); c.ai.wp = null; c.dead = false; c.g.visible = true;
    if (c.dm) { c.dm.hp = c.dm.max; }
    c.sync(); return true;
  }
  return false;
}
// next waypoint: drive to the far side of the coming intersection, maybe turning
function trafficPlan(c) {
  const A = c.ai, f = A.f; const ax = Math.abs(f.x) > .5;
  const along = ax ? c.pos.x : c.pos.z; const cross = ax ? c.pos.z : c.pos.x;
  const sgn = ax ? Math.sign(f.x) : Math.sign(f.z);
  let nextLine = roadNear(along + sgn * (CW / 2)); if ((nextLine - along) * sgn < 6) nextLine += sgn * CW;
  const lineHere = roadNear(cross);
  // turn options (stay inside the map's inner roads)
  const r = Math.random(); let g = f.clone();
  const right = new T.Vector3(-f.z, 0, f.x);
  if (r < .22) g = right.clone(); else if (r < .36) g = right.clone().negate();
  const ctr = ax ? new T.Vector3(nextLine, 0, lineHere) : new T.Vector3(lineHere, 0, nextLine);
  const out = ctr.clone().addScaledVector(g, 9);
  if (Math.abs(out.x) > HALF - 30 || Math.abs(out.z) > HALF - 30) g = f.clone().negate().dot(g) > .5 ? right.clone() : g; // don't drive off the map
  if (Math.abs(ctr.x + g.x * 9) > HALF - 30 || Math.abs(ctr.z + g.z * 9) > HALF - 30) g = right.clone().negate();
  const gr = new T.Vector3(-g.z, 0, g.x);
  A.entry = ctr.clone().addScaledVector(f, -5).addScaledVector(right, LANE);
  A.exit = ctr.clone().addScaledVector(g, 6).addScaledVector(gr, LANE);
  A.g = g; A.turning = g.dot(f) < .5; A.wp = A.entry; A.stage = 0;
}
const _ta = new T.Vector3();
function trafficDrive(c, dt) {
  const A = c.ai; if (!A.wp) trafficPlan(c);
  const fw = c.fwd();
  // stage 0: to the intersection entry, 1: through it to the exit, then lane-follow on the new road
  const wp = A.stage === 0 ? A.entry : A.exit;
  const to = _ta.copy(wp).sub(c.pos).setY(0); const dist = to.length();
  if (A.stage === 0 && dist < 3.5) A.stage = 1;
  else if (A.stage === 1 && dist < 3) { A.f.copy(A.g); A.wp = null; }
  // pure pursuit: steer toward a point 6 m down the lane
  let aim;
  if (A.stage === 0 && dist > 10) { const right = new T.Vector3(-A.f.z, 0, A.f.x); const ax = Math.abs(A.f.x) > .5; const lane = (ax ? roadNear(c.pos.z) : roadNear(c.pos.x)); aim = c.pos.clone().addScaledVector(A.f, 7); if (ax) aim.z = lane + right.z * LANE; else aim.x = lane + right.x * LANE; }
  else aim = wp.clone();
  const dv = aim.sub(c.pos).setY(0).normalize();
  const crossY = fw.x * dv.z - fw.z * dv.x; const steer = clamp(crossY * 2.6, -1, 1);
  // speed: slow for turns, stop for anything in the lane ahead
  let want = A.turning && (A.stage === 1 || dist < 14) ? 5 : A.cruise;
  let block = 99;
  const chk = (p, r) => { const dx = p.x - c.pos.x, dz = p.z - c.pos.z; const fwd = dx * fw.x + dz * fw.z; if (fwd < 1 || fwd > 13) return; const lat = Math.abs(dx * fw.z - dz * fw.x); if (lat < 1.3 + r) block = Math.min(block, fwd); };
  if (!P.dead) chk(P.pos, .4);
  if (A.wait < 4) for (const o of CARS) if (o !== c && !o.gone) chk(o.pos, .3); // after 4 s stuck behind a car, creep through (breaks intersection deadlocks)
  if ((A.scan = (A.scan || 0) - dt) <= 0) { A.scan = .2; A.civBlock = 99; for (const p of CIVS) if (!p.dead) { const dx = p.pos.x - c.pos.x, dz = p.pos.z - c.pos.z; const fwd = dx * fw.x + dz * fw.z; if (fwd > 1 && fwd < 13 && Math.abs(dx * fw.z - dz * fw.x) < 1.7) A.civBlock = Math.min(A.civBlock, fwd); } for (const e of ENEMIES) if (!e.dead) { const dx = e.pos.x - c.pos.x, dz = e.pos.z - c.pos.z; const fwd = dx * fw.x + dz * fw.z; if (fwd > 1 && fwd < 13 && Math.abs(dx * fw.z - dz * fw.x) < 1.7) A.civBlock = Math.min(A.civBlock, fwd); } }
  block = Math.min(block, A.civBlock || 99);
  if (block < 13) want = Math.min(want, Math.max(0, (block - 4) * 1.1));
  if (A.panic > 0) { A.panic -= dt; want = Math.max(want, 15); }
  const y = want > c.speed + .5 ? 1 : want < c.speed - .8 ? -1 : 0;
  if (Math.abs(c.speed) < .4) A.stuck = (A.stuck || 0) + dt; else A.stuck = 0;
  if (Math.abs(c.speed) < .5 && block < 6) { A.wait += dt; if (A.wait > 5 && (A.honkT -= dt) <= 0) { A.honkT = rand(3, 6); const sp = spatial(c.pos); AU.tone('square', 392, 380, .5, .08 * sp.vol, sp.pan); AU.tone('square', 466, 450, .5, .06 * sp.vol, sp.pan); } } else A.wait = 0;
  return { x: steer, y, brake: block < 5, ai: 1 };
}
let trafT = 0;
function updateTraffic(dt) {
  if (G.state !== 'city') return;
  trafT -= dt; const recheck = trafT <= 0; if (recheck) trafT = .5;
  for (const c of TRAFFIC) {
    if (!c.ai) continue;
    if (c.dead || P.inCar === c) { if (recheck && c.dead && c.pos.distanceTo(P.pos) > 120) { /* burnt wrecks stay */ } continue; }
    if (G.inside) continue;
    const inp = trafficDrive(c, dt); c.aiInp = inp;
    if (recheck && (c.pos.distanceTo(P.pos) > 130 || (c.ai.stuck > 9 && c.pos.distanceTo(P.pos) > 35))) { c.ai.stuck = 0; trafficPlace(c); }
  }
  // draw-distance culling for every car (parked or moving)
  if (recheck) for (const c of CARS) { const d2 = c.pos.distanceToSquared(camera.position); const vis = d2 < (G.quality === 'high' ? 130 : 95) ** 2; if (c.g.visible !== vis && !c.gone) c.g.visible = vis; }
}
// gunfire nearby makes drivers floor it
function trafficPanic(pos) { for (const c of TRAFFIC) if (c.ai && !c.dead && c.pos.distanceToSquared(pos) < 50 * 50) c.ai.panic = rand(5, 9); }
