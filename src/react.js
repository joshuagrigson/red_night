/* =====================================================================
   RED NIGHT — v24 hit reactions. Every number is sourced in docs/v23-hit-realism/r1-cod-reference.md.
   - The Universal Animation Library's hit, death, limp and crawl clips (Quaternius, CC0: Joshua's Pro pack), retargeted onto each
     body in the background by the same world-space bake as its other clips.
   - Spring flinches laid on the bones after the clip, adapted from HurtFlinch.js.
   - A Verlet ragdoll for the dead, adapted from Ragdoll.js.
   HurtFlinch.js and Ragdoll.js are LaurentBerier/ThreeJS_UE_TPS_FPS, MIT licence: https://github.com/LaurentBerier/ThreeJS_UE_TPS_FPS
   ===================================================================== */

/* ---------- the extra clips ---------- */
const XPACKS = ['assets/ual_hits.glb', 'assets/ual_wounded.glb'];
// logical name -> pack clip. '_m' is a mirrored copy, so a reaction can come from either side. Baked in this order: the hits first
const XCLIP = { hit_chest: 'hit_chest', hit_chest_m: 'hit_chest_m', hit_stom: 'hit_stomach', hit_stom_m: 'hit_stomach_m', hit_head: 'hit_head', hit_head_m: 'hit_head_m', hit_shl: 'hit_shoulder_l', hit_shr: 'hit_shoulder_r', death1: 'death01', death1_m: 'death01_m', limp_r: 'limp_r_loop', limp_l: 'limp_l_loop', knock: 'hit_knockback', getup: 'getup_back', crawl_in: 'crawl_enter', crawl_fwd: 'crawl_fwd_loop', crawl_idle: 'crawl_idle_loop' };
const XCLIP_N = Object.keys(XCLIP).length;
const XLOOP = { limp_r: 1, limp_l: 1, crawl_fwd: 1, crawl_idle: 1 };
// clips that travel in place: the actor does the moving
const INPLACE = { walk: 1, run: 1, limp_r: 1, limp_l: 1, crawl_fwd: 1 };
for (const k in XCLIP) if (!XLOOP[k]) ONESHOT[k] = 1;
const XL = { raw: null, p: null };
// fetched once the boot set is in (charStreamStart): ~300 KB, nothing waits on it
function animPacks() {
  if (XL.p || !_cLoader) return XL.p;
  XL.p = Promise.all(XPACKS.map(u => parseGLBText(_cLoader, u).then(gl => gl.animations).catch(() => []))).then(lists => {
    const map = {}; for (const l of lists) for (const c of l) map[c.name.toLowerCase().replace(/^.*\|/, '')] = c;
    XL.raw = map; xbakeKick();
  });
  return XL.p;
}
// The lite packs carry no finger keys: under them the library idle's hands, not the bind pose's flat fingers
function fingerIdle() {
  if (RT.fi !== undefined) return RT.fi; const i = ANIMLIB.raw && ANIMLIB.raw.idle;
  const tr = i ? i.tracks.filter(t => /Hand(Thumb|Index|Middle|Ring|Pinky)/i.test(t.name)) : [];
  return RT.fi = tr.length ? new T.AnimationClip('fingers', i.duration, tr) : null;
}
// Per body, the extra clips bake one at a time in the background (a desktop does one in 1-5 ms, a phone in ~5-25), the bodies on
// the street first. A phone bakes only for bodies on the street, a clip every 120 ms, so it never eats more than a slice of a frame
// budget. A rig that wants one before it's in goes without (the springs, the plain fall, a walk for a limp)
const XB = { on: false, gap: LOWMEM ? 120 : 40 };
function xbakeKick() { if (!XB.on && XL.raw) { XB.on = true; setTimeout(xbakeStep, XB.gap); } }
function xbakeStep() {
  XB.on = false; if (!XL.raw || !CHARS_READY) return;
  const id = xbakeNext(); if (!id) return; // idle until the next body lands
  const def = CHARS[id], C = def.xc || (def.xc = bakeCtx(id)), X = def.xclips || (def.xclips = {});
  for (const k in XCLIP) if (!(k in X)) { X[k] = null; try { X[k] = bakeClip(C, k); } catch (e) { XB.err = XB.err || (id + ' ' + k + ': ' + (e && e.stack)); } break; } // a clip that fails to bake stays null, never retried
  if (Object.keys(X).length >= XCLIP_N) def.xc = null;
  XB.on = true; setTimeout(xbakeStep, XB.gap);
}
function xbakeNext() {
  const need = id => { const d = CHARS[id]; return !!(d && d.scene && d.clips && !(d.xclips && Object.keys(d.xclips).length >= XCLIP_N)); };
  for (const e of ENEMIES) if (e.human && e.R && e.R.glb && need(e.R.glb)) return e.R.glb;
  for (const c of CIVS) if (c.R && c.R.glb && need(c.R.glb)) return c.R.glb;
  for (const e of ENEMIES) if (e.R && e.R.glb && need(e.R.glb)) return e.R.glb;
  if (!LOWMEM) for (const id in CHARS) if (need(id)) return id;
  return null;
}
// a phone's queue goes quiet with no one on the street to bake for: look again every few seconds
setInterval(() => { if (LOWMEM && G.state === 'city') xbakeKick(); }, 3000);
// the action for an extra clip, made the first time a rig plays it (rigs are built before their extras bake); null until baked
function xAction(R, n) {
  if (!R || !R.actions) return null; let a = R.actions[n]; if (a) return a;
  const d = CHARS[R.glb], c = d && d.xclips && d.xclips[n]; if (!c) return null;
  a = R.actions[n] = R.mixer.clipAction(c); if (ONESHOT[n]) { a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; }
  return a;
}
const xReady = (R, n) => !!(R && R.glb && (R.actions[n] || (CHARS[R.glb].xclips && CHARS[R.glb].xclips[n])));

/* ---------- the flinch ---------- */
// A hit puts velocity into small damped springs whose angles are laid on the bones after the clip, as world-space turns (so any
// rig's bone rolls work). Torso: rocked along the round and twisted to the struck side; a gut shot folds you. Head: a snap. Arm:
// that arm knocked back. Leg: that hip drops and the knee buckles. A burst stacks into a stagger. Strength follows Black Ops 1's
// hit-pose weight, min(1, (damage% + 50) / 250); the springs peak in ~60 ms and settle in ~0.3 s (BO1: 0.05 s in, 0.2 s out).
// Torso, head and legs go on before the aim overlay, so a gun stays on target while the body jolts; an arm hit goes on after it
const FL_K = 190, FL_D = 15;
// eight channels, each an (angle, velocity) pair: 0 torso pitch, 1 torso yaw, 2 head pitch, 3 head yaw, 4-5 arms, 6-7 legs (L, R)
function flinchRig(R) {
  const m = R.model, b = k => findBone(m, k), torso = ['spine', 'spine1', 'spine2'].map(b).filter(Boolean), neck = b('neck');
  if (!torso.length && !neck) return null;
  return { s: new Float32Array(16), on: false, torso, neck, head: b('head'), arm: [b('leftarm'), b('rightarm')], leg: [b('leftupleg'), b('rightupleg')], hips: b('hips') };
}
// w: BO1's weight; zone and side (+1 the body's right) from bodyZone; dir: the round's direction; face: the body's yaw
function hitSpring(R, w, zone, side, dir, face) {
  if (!R || !R.glb || R.fl === null) return; const F = R.fl || (R.fl = flinchRig(R)); if (!F) return;
  const k = clamp(w * 2.6, .35, 2.2), v = F.s;
  let fw = -1; // the push in the body's frame: fw > 0 shoves it forward (shot from behind)
  if (dir) { const L = Math.hypot(dir.x, dir.z); if (L > 1e-4) fw = -(dir.x * Math.sin(face) + dir.z * Math.cos(face)) / L; }
  const sd = side || (Math.random() < .5 ? -1 : 1), back = fw < 0 ? 1 : -1, tw = sd * (fw || -1); // twist: the struck shoulder goes with the round
  const legHit = zone === 'thigh' || zone === 'shin', tk = zone === 'head' ? .45 : legHit ? .35 : 1;
  v[1] += 3.4 * k * tk * (zone === 'belly' ? -1.1 : back);
  v[3] += 2.2 * k * tk * tw;
  if (zone === 'head' || zone === 'neck') { v[5] += 7 * k * back; v[7] += 4 * k * tw; } else v[5] += 1.4 * k * back;
  if (zone === 'uarm' || zone === 'larm') v[sd > 0 ? 11 : 9] += 7 * k;
  if (legHit) v[sd > 0 ? 15 : 13] += 5 * k;
  F.on = true;
}
const _flR = new T.Vector3(), _flF = new T.Vector3(), _flU = new T.Vector3(0, 1, 0), _flQ = new T.Quaternion(), _flQ2 = new T.Quaternion(), _flP = new T.Quaternion();
function flinchTurn(bone, q) { // turn a bone by world rotation q about its own joint: local' = parentW^-1 q parentW local
  bone.parent.getWorldQuaternion(_flP); _flQ2.copy(_flP).invert().multiply(q).multiply(_flP); bone.quaternion.premultiply(_flQ2);
}
function flinchApply(R, dt, arms) {
  const F = R.fl; if (!F || !F.on) return; const v = F.s;
  if (!arms) { // integrate once per animation update (semi-implicit Euler, substeps of a 60th at most)
    const n = Math.min(8, Math.max(1, Math.ceil(dt * 60))), h = dt / n; let e = 0;
    for (let i = 0; i < n; i++) for (let c = 0; c < 16; c += 2) { v[c + 1] += (-FL_K * v[c] - FL_D * v[c + 1]) * h; v[c] += v[c + 1] * h; }
    for (let c = 0; c < 16; c++) e += Math.abs(v[c]);
    if (e < 2e-3) { v.fill(0); F.on = false; return; }
  }
  const face = R.root.rotation.y; _flR.set(Math.cos(face), 0, -Math.sin(face)); _flF.set(-Math.sin(face), 0, -Math.cos(face));
  if (arms) { for (let i = 0; i < 2; i++) { const a = clamp(v[8 + i * 2], -.6, .6); if (Math.abs(a) > 1e-3 && F.arm[i]) flinchTurn(F.arm[i], _flQ.setFromAxisAngle(_flR, -a)); } return; }
  const n = F.torso.length + (F.neck ? 1 : 0), tp = clamp(v[0], -.38, .38) * 1.1 / n, ty = clamp(v[2], -.28, .28) * 1.1 / n, hp = clamp(v[4], -.52, .52) * .5, hy = clamp(v[6], -.35, .35) * .5;
  for (const b of F.torso) flinchTurn(b, _flQ.setFromAxisAngle(_flU, ty).multiply(_flQ2.setFromAxisAngle(_flR, tp)));
  if (F.neck) flinchTurn(F.neck, _flQ.setFromAxisAngle(_flU, ty + hy).multiply(_flQ2.setFromAxisAngle(_flR, tp + hp)));
  if (F.head) flinchTurn(F.head, _flQ.setFromAxisAngle(_flU, hy).multiply(_flQ2.setFromAxisAngle(_flR, hp)));
  for (let i = 0; i < 2; i++) { const a = clamp(v[12 + i * 2], -.32, .32); if (Math.abs(a) < 1e-3) continue; if (F.hips) flinchTurn(F.hips, _flQ.setFromAxisAngle(_flF, a * (i ? .4 : -.4))); if (F.leg[i]) flinchTurn(F.leg[i], _flQ.setFromAxisAngle(_flR, a * .8)); }
}

/* ---------- the ragdoll ---------- */
// A particle at each main joint; sticks hold the bone lengths hard, softer braces to the grandparent make the body fold at the
// joints instead of like a noodle, joint-span limits stop anything bending through itself, and a weak pull toward the bind pose
// keeps the angles natural. Gravity is 2.2 g so a body drops heavy. The death impulse goes in height-weighted (it tips the body over
// its feet) plus a kick at the joint the round hit. The ground and the street's boxes push particles out and bounce them. It freezes
// soon after its second ground impact, or once it comes to rest, and costs nothing after that. The constants are Ragdoll.js's,
// with less bounce: a CoD body lands dead
const RAG_KEEP = ['hips', 'spine', 'spine1', 'spine2', 'neck', 'head', 'leftarm', 'leftforearm', 'lefthand', 'rightarm', 'rightforearm', 'righthand', 'leftupleg', 'leftleg', 'leftfoot', 'rightupleg', 'rightleg', 'rightfoot'];
const RAG_LEG = /upleg|leg$|foot/, RAG_HIT = { head: 'head', neck: 'neck', chest: 'spine2', belly: 'spine', uarm: 'arm', larm: 'forearm', thigh: 'upleg', shin: 'leg' };
const RAGS = [], RAG_MAX = () => LOWMEM ? 4 : 6;
const _rv = new T.Vector3(), _rv2 = new T.Vector3(), _rn = new T.Vector3(), _rt = new T.Vector3(), _rgq = new T.Quaternion(), _rgq2 = new T.Quaternion(), _rgm = new T.Matrix4(), _rbx = new T.Vector3(), _rbz = new T.Vector3();
// the bone each torso joint aims at (the chain), and the pair across it (shoulders, hips) that fixes its turn about that line
const RAG_CHAIN = { hips: 'spine', spine: 'spine1', spine1: 'spine2', spine2: 'neck', neck: 'head' }, RAG_LAT = { hips: ['leftupleg', 'rightupleg'], spine2: ['leftarm', 'rightarm'] };
const RAG_SPINE = /^(hips|spine\d?|neck|head)$/;
// a frame from an aim line and a cross line: y along the aim, x the cross line made square to it
function ragBasis(aim, cross, out) { _rbx.copy(cross).addScaledVector(aim, -cross.dot(aim)); if (_rbx.lengthSq() < 1e-8) return null; _rbx.normalize(); _rbz.crossVectors(_rbx, aim); return out.setFromRotationMatrix(_rgm.makeBasis(_rbx, aim, _rbz)); }
const ragBones = R => R.ragB || (R.ragB = RAG_KEEP.map(k => findBone(R.model, k)));
class Ragdoll {
  // o: { imp (m/s, the death impulse), zone (where the round went), last (each RAG_KEEP joint's position a frame ago), ldt (that frame's dt), pos (the body's feet) }
  constructor(R, o) {
    this.R = R; this.age = 0; this.asleep = false; this.frozen = false; this.still = 0; this.hits = 0; this.lastHit = -1; this.freezeT = -1; this.hitNow = false; this.cen = null;
    R.root.updateMatrixWorld(true);
    const B = ragBones(R), byBone = new Map(); this.nodes = [];
    B.forEach((b, i) => { if (!b) return; const p = b.getWorldPosition(new T.Vector3()); const n = { b, k: RAG_KEEP[i], i, p, prev: p.clone(), v0: new T.Vector3(), rq: b.getWorldQuaternion(new T.Quaternion()), parent: null, grand: null, kids: [], pc: null, rd: null, lat: null, rb: null, leg: RAG_LEG.test(RAG_KEEP[i]) }; byBone.set(b, n); this.nodes.push(n); });
    if (this.nodes.length < 8) throw new Error('ragdoll: too few bones');
    for (const n of this.nodes) { let p = n.b.parent; n.mid = []; while (p && p.isBone && !byBone.has(p)) { n.mid.unshift(p); p = p.parent; } n.parent = (p && byBone.get(p)) || null; } // mid: unkept bones between it and its kept parent (a clavicle, a pelvis), top down
    for (const n of this.nodes) { n.grand = n.parent ? n.parent.parent : null; if (n.parent) n.parent.kids.push(n); }
    this.root = this.nodes.find(n => !n.parent) || this.nodes[0];
    // what each bone aims at: up the spine for the torso (the hips at the spine, the chest at the neck), otherwise the kept child with
    // the most below it (an arm its forearm). The hips and the chest also hold their turn from the line across the legs or the arms
    const size = n => n.kids.reduce((s, c) => s + size(c), 1), byKey = k => this.nodes.find(m => m.k === k);
    for (const n of this.nodes) if (n.kids.length) {
      n.pc = n.kids.find(c => c.k === RAG_CHAIN[n.k]) || (RAG_SPINE.test(n.k) && n.kids.find(c => RAG_SPINE.test(c.k))) || n.kids.reduce((a, c) => size(c) > size(a) ? c : a, n.kids[0]);
      n.rd = n.pc.p.clone().sub(n.p).normalize();
      const L = RAG_LAT[n.k] && RAG_LAT[n.k].map(byKey);
      if (L && L[0] && L[1]) { const rb = ragBasis(n.rd, _rv.copy(L[1].p).sub(L[0].p), new T.Quaternion()); if (rb) { n.lat = L; n.rb = rb.invert(); } }
    }
    this.order = []; const q = [this.root]; while (q.length) { const n = q.shift(); this.order.push(n); for (const c of n.kids) q.push(c); }
    this.sticks = [];
    for (const n of this.nodes) {
      if (n.parent) this.sticks.push({ a: n, b: n.parent, len: n.p.distanceTo(n.parent.p), k: 1 });
      if (n.grand) this.sticks.push({ a: n, b: n.grand, len: n.p.distanceTo(n.grand.p), k: n.leg || n.grand.leg ? .55 : .2 });
    }
    // joint limits on each three-joint chain A-B-C: |A-C| between a fold and just short of straight. The bind pose's span is the rest
    // the soft pull goes toward, scaled from bind units to this body's (the scanned models carry a scale on their pivot)
    let sk = null; R.model.traverse(m => { if (!sk && m.isSkinnedMesh && m.skeleton && m.skeleton.bones.indexOf(this.root.b) >= 0) sk = m.skeleton; });
    const bp = new Map(); if (sk) sk.bones.forEach((b, i) => { if (byBone.has(b) && sk.boneInverses[i]) bp.set(b, new T.Vector3().setFromMatrixPosition(_rgm.copy(sk.boneInverses[i]).invert())); });
    this.lims = [];
    for (const n of this.nodes) {
      const B1 = n.parent, A = B1 && B1.parent; if (!A) continue;
      const ab = n.p.distanceTo(B1.p), bc = B1.p.distanceTo(A.p), st = ab + bc; if (st < 1e-5) continue;
      // the spine straightens fully; a knee or an elbow keeps a little bend at its straightest (Ragdoll.js's .965 bent every corpse ~30 deg)
      const leg = n.leg || B1.leg || A.leg, spine = RAG_SPINE.test(n.k) && RAG_SPINE.test(B1.k) && RAG_SPINE.test(A.k), L = { a: n, b: A, min: st * (leg ? .7 : .5), max: st * (spine ? .998 : .985), rest: null, rk: leg ? .16 : .05 };
      const pa = bp.get(n.b), pb = bp.get(B1.b), pc = bp.get(A.b);
      if (pa && pb && pc) { const bst = pa.distanceTo(pb) + pb.distanceTo(pc); if (bst > 1e-6) L.rest = clamp(pa.distanceTo(pc) * st / bst, L.min, L.max); }
      this.lims.push(L);
    }
    this.boxes = []; this.gc = new T.Vector3(); this.gather(o.pos || this.root.p);
    // seed velocities in m/s (each joint's v0, laid down on the first step at that step's length, so a body flies the same at any frame
    // rate): the death clip's own motion a frame ago, then the round
    if (o.last && o.ldt > 1e-4) for (const n of this.nodes) { const l = o.last[n.i]; if (l) { n.v0.copy(n.p).sub(l).divideScalar(o.ldt); if (n.v0.lengthSq() > 36) n.v0.setLength(6); } }
    const imp = o.imp;
    if (imp && imp.lengthSq() > 1e-6) {
      let lo = 1e9, hi = -1e9; for (const n of this.nodes) { lo = Math.min(lo, n.p.y); hi = Math.max(hi, n.p.y); }
      const span = Math.max(.2, hi - lo);
      for (const n of this.nodes) { const h = .3 + 1.7 * (n.p.y - lo) / span; n.v0.x += imp.x * h; n.v0.z += imp.z * h; n.v0.y += imp.y; }
      // the joint the round hit takes a kick of its own, its neighbours less: so no two deaths fold the same way
      const want = RAG_HIT[o.zone] || 'spine2', side = o.side > 0 ? 'right' : 'left';
      const hit = this.nodes.find(n => n.k === want || n.k === side + want) || this.nodes.find(n => n.k === 'spine2') || this.root;
      const s = imp.length() * rand(.6, 1.1), push = (n, f) => { if (n) n.v0.addScaledVector(_rv.copy(imp).normalize().add(_rv2.set(rand(-.4, .4), rand(0, .4), rand(-.4, .4))), s * f); };
      push(hit, 1); push(hit.parent, .5); push(hit.grand, .25); for (const k of hit.kids) push(k, .5);
      // and a little spin about the vertical, a different way each time
      const tw = rand(-1.6, 1.6); let cx = 0, cz = 0; for (const n of this.nodes) { cx += n.p.x; cz += n.p.z; } cx /= this.nodes.length; cz /= this.nodes.length;
      for (const n of this.nodes) { n.v0.x += tw * (n.p.z - cz); n.v0.z -= tw * (n.p.x - cx); }
    }
    this.seeded = false; this.sub = 1 / 60;
    this.iters = LOWMEM ? 7 : 10;
  }
  // false once it has stopped for good (frozen or asleep)
  update(dt) {
    if (this.asleep || this.frozen) return false;
    this.age += dt; this.hitNow = false;
    const sub = this.sub = Math.max(1e-3, Math.min(1 / 30, dt)) / 2;
    if (!this.seeded) { this.seeded = true; for (const n of this.nodes) n.prev.copy(n.p).addScaledVector(n.v0, -sub); }
    if (this.root.p.distanceToSquared(this.gc) > 2.25) this.gather(this.root.p); // thrown clear of the street it started in
    for (let s = 0; s < 2; s++) this.step(sub);
    if (this.hitNow) this.groundHit();
    if (this.freezeT >= 0 && (this.freezeT -= dt) <= 0) this.frozen = true;
    this.apply();
    let cx = 0, cy = 0, cz = 0; for (const n of this.nodes) { cx += n.p.x; cy += n.p.y; cz += n.p.z; } const k = 1 / this.nodes.length; cx *= k; cy *= k; cz *= k;
    if (this.cen) { const dx = cx - this.cen.x, dy = cy - this.cen.y, dz = cz - this.cen.z; if (dx * dx + dy * dy + dz * dz < 1e-4) { if ((this.still += dt) > 1.8) this.asleep = true; } else this.still = 0; this.cen.set(cx, cy, cz); } else this.cen = new T.Vector3(cx, cy, cz);
    if (this.age > 5) this.asleep = true;
    return !(this.asleep || this.frozen);
  }
  // Verlet, then contacts once with their bounce, then the constraints relaxed with the contacts projected in among them (as
  // Jakobsen's Hitman paper does: otherwise a limb pinned against a box and the stick to its neighbour fight, and the limb stretches)
  step(dt) {
    const g = -22 * dt * dt, drag = Math.pow(.985, dt * 60); // Ragdoll.js's drag was per 60 Hz step: the same per second at any step
    for (const n of this.nodes) { _rv.copy(n.p).sub(n.prev).multiplyScalar(drag); n.prev.copy(n.p); n.p.add(_rv); n.p.y += g; }
    this.collide(true);
    for (let it = 0; it < this.iters; it++) {
      if (it && it % 3 === 0) this.collide(false);
      for (const s of this.sticks) { _rv.copy(s.b.p).sub(s.a.p); const d = _rv.length(); if (d < 1e-5) continue; _rv.multiplyScalar((d - s.len) / d * .5 * s.k); s.a.p.add(_rv); s.b.p.sub(_rv); }
      for (const L of this.lims) { _rv.copy(L.b.p).sub(L.a.p); const d = _rv.length(); if (d < 1e-5) continue; const t = d > L.max ? L.max : d < L.min ? L.min : -1; if (t < 0) continue; _rv.multiplyScalar((d - t) / d * .5 * .97); L.a.p.add(_rv); L.b.p.sub(_rv); }
    }
    for (const L of this.lims) { if (L.rest === null) continue; _rv.copy(L.b.p).sub(L.a.p); const d = _rv.length(); if (d < 1e-5) continue; _rv.multiplyScalar((d - L.rest) / d * .5 * L.rk); L.a.p.add(_rv); L.b.p.sub(_rv); }
    this.collide(false);
  }
  // bounce off a surface with outward normal nm, given the velocity before the fix: the into-surface part comes back at the
  // restitution (none when it's slow, so a body comes to rest), the along-surface part keeps most of itself (it slides and rolls)
  reflect(n, nm, vIn) {
    const vn = vIn.dot(nm); if (vn >= 0) { n.prev.copy(n.p).sub(vIn); return; }
    const e = -vn < .02 ? 0 : .3; _rt.copy(vIn).addScaledVector(nm, -vn).multiplyScalar(.82).addScaledVector(nm, -vn * e); n.prev.copy(n.p).sub(_rt);
  }
  // bounce: the contact pass with restitution and friction (and impact counting); without, a plain push out
  collide(bounce) {
    const r = .09;
    for (const n of this.nodes) {
      const p = n.p;
      for (const b of this.boxes) {
        if (p.x < b.x0 - r || p.x > b.x1 + r || p.z < b.z0 - r || p.z > b.z1 + r || p.y > b.y1 + r || p.y < b.y0) continue;
        const d0 = p.x - b.x0 + r, d1 = b.x1 + r - p.x, d2 = p.z - b.z0 + r, d3 = b.z1 + r - p.z, d4 = b.y1 + r - p.y, m = Math.min(d0, d1, d2, d3, d4);
        if (bounce) _rv.copy(p).sub(n.prev);
        if (m === d4) { if (bounce && -_rv.y > .012) this.hitNow = true; p.y = b.y1 + r; _rn.set(0, 1, 0); } else if (m === d0) { p.x = b.x0 - r; _rn.set(-1, 0, 0); } else if (m === d1) { p.x = b.x1 + r; _rn.set(1, 0, 0); } else if (m === d2) { p.z = b.z0 - r; _rn.set(0, 0, -1); } else { p.z = b.z1 + r; _rn.set(0, 0, 1); }
        if (bounce) this.reflect(n, _rn, _rv);
      }
      if (p.y < r) { if (bounce) { _rv.copy(p).sub(n.prev); if (-_rv.y > .012) this.hitNow = true; } p.y = r; if (bounce) this.reflect(n, _rn.set(0, 1, 0), _rv); }
    }
  }
  // the body hitting the ground: the first impact is heard and gives a small rebound. A person lands in stages (knees, hips, chest,
  // head), so the quick end (half a second on) waits for an impact with the torso already down; otherwise it stops 1.3 s after the
  // first, or when it comes to rest
  groundHit() {
    if (this.lastHit >= 0 && this.age - this.lastHit < .12) return; this.lastHit = this.age;
    if (++this.hits === 1) {
      for (const n of this.nodes) { _rv.copy(n.p).sub(n.prev); if (_rv.y > 0) { _rv.y *= 1.4; n.prev.copy(n.p).sub(_rv); } }
      this.freezeT = 1.6; const sp = spatial(this.root.p); if (sp.vol > .05) AU.play('body_fall_' + rint(1, 2), { vol: .7 * sp.vol, pan: sp.pan, rate: rand(.9, 1.08) }) || AU.nz(.18, 'lowpass', 500, 120, 1, .25 * sp.vol, sp.pan);
    } else if (this.isDown()) this.freezeT = Math.min(this.freezeT, .5);
  }
  // the street's boxes within reach of a sprawl from c (re-gathered when the body travels, and on every kick)
  gather(c) {
    this.boxes.length = 0; this.gc.set(c.x, 0, c.z); const nb = boxesNearN(c.x, c.z);
    for (let i = 0; i < nb; i++) { const b = _bn[i]; if (b.water) continue; if (b.x1 > c.x - 3 && b.x0 < c.x + 3 && b.z1 > c.z - 3 && b.z0 < c.z + 3) this.boxes.push(b); }
  }
  isDown() { const ch = this.torso || (this.torso = this.nodes.find(n => n.k === 'spine2') || this.root); return ch.p.y < this.floorAt(ch.p) + .35; }
  floorAt(p) { let g = 0; for (const b of this.boxes) if (p.x >= b.x0 && p.x <= b.x1 && p.z >= b.z0 && p.z <= b.z1 && b.y1 <= p.y + .1 && b.y1 > g) g = b.y1; return g; }
  // joints back onto the bones, root to leaf: the hips take their particle's position, every bone with a limb below it turns its
  // pose at death so that limb points where the simulation has it
  // Each bone's parent is fresh when it's reached: the kept parent was just done, and the unkept bones between are brought up first
  apply() {
    for (const n of this.order) {
      const b = n.b;
      if (n === this.root) { _rv.copy(n.p); if (b.parent) { b.parent.updateWorldMatrix(true, false); b.parent.worldToLocal(_rv); } b.position.copy(_rv); }
      for (const m of n.mid) m.updateWorldMatrix(false, false);
      if (n.pc) {
        _rv.copy(n.pc.p).sub(n.p); if (_rv.lengthSq() > 1e-8) {
          _rv.normalize();
          if (n.lat && ragBasis(_rv, _rv2.copy(n.lat[1].p).sub(n.lat[0].p), _rgq)) _rgq.multiply(n.rb).multiply(n.rq); // aim and turn
          else _rgq.setFromUnitVectors(n.rd, _rv).multiply(n.rq);
          if (b.parent) { b.parent.matrixWorld.decompose(_rv2, _rgq2, _rt); b.quaternion.copy(_rgq2.invert()).multiply(_rgq); } else b.quaternion.copy(_rgq);
        }
        b.updateWorldMatrix(false, false);
      }
    }
  }
  // another round into a body that's already down (Black Ops 1 lets corpses take hits): wake it and kick that joint, or all of it
  kick(n, d, s) {
    // hits stays counted: the thud and the rebound belong to the first landing only
    this.asleep = this.frozen = false; this.freezeT = -1; this.still = 0; this.age = Math.min(this.age, 3.5); this.gather(this.root.p);
    const k = this.seeded ? this.sub : 0; // velocity s m/s along d (before the first step, into the seed)
    if (!n) { for (const m of this.nodes) { const f = s * rand(.7, 1.2); if (k) m.prev.addScaledVector(d, -f * k); else m.v0.addScaledVector(d, f); } return; }
    if (k) { n.prev.addScaledVector(d, -s * k); if (n.parent) n.parent.prev.addScaledVector(d, -s * k * .5); } else { n.v0.addScaledVector(d, s); if (n.parent) n.parent.v0.addScaledVector(d, s * .5); }
  }
}

/* ---------- corpses ---------- */
// A body going down plays its death clip for the first 35 % (CoD4's and IW5's handoff point, at most 0.9 s here), then the ragdoll
// takes it. A big hit goes to the ragdoll at once, as IW5 launches its immediate ragdolls: a blast, a shotgun up close, a sniper
// round. The impulse is Black Ops 1's (launch_ragdoll_based_on_damage_type): F = (dir + (0, 0, .2)) x 60 x force, force .35 for a
// bullet under 75 damage, .45 over, .3 + .7(1 - d^2 / 7.6^2) for a shotgun, 1.6 for a blast, halved for the head and neck (a headshot
// collapses rather than flies). One BO1 force unit is ~3.6 m/s here. Off screen and far away a body keeps its clip
const CORPSES = [];
function corpseInit(a, dir, zone, side, src, dmg) {
  const blast = !!(src && src.blast), w = src && src.w, sg = !!(w && w.cls === 'shotgun'), d = (src && src.dist) || 0;
  let f = blast ? 1.6 * clamp(dmg / 200, .45, 1) : sg ? .3 + .7 * Math.max(0, 1 - (d / 7.6) * (d / 7.6)) : dmg > 75 ? .45 : .35; // a blast by how close it was
  if (zone === 'head' || zone === 'neck') f *= .5;
  const big = blast || (sg && d < 13) || !!(w && w.cls === 'sniper'); if (big) f *= 1.25; // IW5's big-gun deaths fly further
  const dx = dir ? dir.x : 0, dz = dir ? dir.z : 0, L = Math.hypot(dx, dz) || 1;
  a.corpse = { t: 0, zone, side: side || 0, imp: new T.Vector3(dx / L, blast ? .55 : .2, dz / L).multiplyScalar(3.6 * f), when: blast || (sg && d < 5) || (w && w.cls === 'sniper') ? 0 : -1, rag: null, done: false, last: null, ldt: 0, pool: 0, sum: 0 };
}
function corpseUpdate(a, dt) {
  const R = a.R, C = a.corpse; if (!C || !R || !R.glb) return false;
  C.t += dt;
  if (C.rag) { if (!C.rag.update(dt)) { ragOff(C.rag); C.done = true; } }
  else if (!C.done) {
    animGLB(R, a.st, dt);
    if (C.when < 0) C.when = Math.min(.9, .35 * (R.cur ? R.cur.getClip().duration : 1));
    const cd2 = a.camD2 !== undefined ? a.camD2 : a.pos.distanceToSquared(camera.position), seen = !a.unseen && cd2 < 70 * 70;
    // the handoff only at its moment: a body first seen after it has already fallen keeps its clip (no fresh launch from the floor)
    if (C.t >= C.when && C.t < C.when + .25 && seen && !C.noRag) ragOn(a);
    else { if (seen && !C.noRag) ragRecord(R, C, dt); else C.last = null; if (C.t > C.when + 3.2) C.done = true; } // a body that never ragdolls plays its clip out
  }
  if (C.t > 2 && !C.pool) { C.pool = 1; bloodPool(a); }
  return true;
}
function ragRecord(R, C, dt) {
  const B = ragBones(R); if (!C.last) C.last = B.map(() => new T.Vector3()); R.root.updateMatrixWorld(true);
  B.forEach((b, i) => { if (b) b.getWorldPosition(C.last[i]); }); C.ldt = dt;
}
// over the cap, a body already on the ground gives up its slot; while every live one is still falling, the new one keeps its clip
// (it ends lying down too). Freezing one mid-fall would leave it hanging in the air
function ragRoom() {
  if (RAGS.length < RAG_MAX()) return true;
  const i = RAGS.findIndex(rg => rg.hits > 0 && rg.isDown()); if (i < 0) return false;
  RAGS[i].frozen = true; RAGS.splice(i, 1); return true;
}
function ragOn(a) {
  const C = a.corpse;
  if (!ragRoom()) { C.noRag = true; return; }
  try { C.rag = new Ragdoll(a.R, { imp: C.imp, zone: C.zone, side: C.side, last: C.last, ldt: C.ldt, pos: a.pos }); RAGS.push(C.rag); if (CORPSES.indexOf(a) < 0) CORPSES.push(a); while (CORPSES.length > 14) CORPSES.shift(); }
  catch (e) { C.noRag = true; }
}
function ragOff(rg) { const i = RAGS.indexOf(rg); if (i >= 0) RAGS.splice(i, 1); }
function corpseGone(a) { if (a.corpse && a.corpse.rag) ragOff(a.corpse.rag); const i = CORPSES.indexOf(a); if (i >= 0) CORPSES.splice(i, 1); }
// a round or a blast reaching a body already down. Rounds pass through (a corpse never blocks a shot), but it twitches; before its
// ragdoll, more than 100 damage after the first 0.3 s cuts the death clip short (BO1 death_anim_short_circuit)
function corpseHit(a, d, dmg, n) {
  const C = a.corpse; if (!C || !a.R.glb || a.gone) return;
  if (a.deadT > 6) return; // it's sinking away
  if (C.rag) { if (RAGS.indexOf(C.rag) < 0) { if (!ragRoom()) return; RAGS.push(C.rag); } C.done = false; C.rag.kick(n, d, clamp(dmg / 12, 1.5, 9)); return; }
  if (C.t > .3 && !C.done && !C.noRag && (C.sum += dmg) > 100) { C.imp.addScaledVector(d, clamp(dmg / 40, 1, 4)); ragOn(a); }
}
// a player's round past the bodies already down: the nearest joint within 12 cm of the line before the round stopped
function ragShot(o, d, maxT, dmg) {
  let best = null, bn = null, bt = maxT;
  for (const a of CORPSES) {
    const rg = a.corpse && a.corpse.rag; if (!rg) continue;
    const vx = rg.root.p.x - o.x, vz = rg.root.p.z - o.z, tc = vx * d.x + vz * d.z; if (tc < -1.5 || tc > bt + 1.5 || vx * vx + vz * vz - tc * tc > 2.6) continue;
    for (const n of rg.nodes) { const t = raySphere(o, d, n.p, .12); if (t > 0 && t < bt) { bt = t; best = a; bn = n; } }
  }
  if (best) { corpseHit(best, d, dmg, bn); burst(FXN, _rv.copy(o).addScaledVector(d, bt), 5, 2, .4, .07, .04, COL.blood, 7, .2); }
}
// a blast near bodies already down throws them (and cuts a death clip short)
function blastCorpses(at, r, dmg) {
  const f = a => { if (!a.dead || !a.corpse) return; const dx = a.pos.x - at.x, dz = a.pos.z - at.z, d = Math.hypot(dx, dz); if (d > r) return; _rv2.set(dx / (d || 1), .7, dz / (d || 1)).normalize(); corpseHit(a, _rv2, 60 + dmg * (1 - d / r), null); };
  for (const e of ENEMIES) f(e); for (const c of CIVS) f(c);
}
// IW5 pools blood two seconds after a death, traced down from the upper spine, and only on flat ground. This one spreads for 3 s
const POOLS = [];
function bloodPool(a) {
  const C = a.corpse; let x = a.pos.x, z = a.pos.z, y = .021;
  const ch = C && C.rag && (C.rag.nodes.find(n => n.k === 'spine2') || C.rag.nodes.find(n => n.k === 'spine1'));
  if (ch) { if (ch.p.y > .55) return; x = ch.p.x; z = ch.p.z; y = Math.max(.021, ch.p.y - .09 + .012); } // draped over something: no pool
  else if (a.R && a.R.ragB && a.R.ragB[3]) { a.R.ragB[3].getWorldPosition(_rv); x = _rv.x; z = _rv.z; }
  const col = a.type === 'reptile' ? CS(0x1a6a22) : a.type === 'shifter' ? CS(0x1c0c18) : BLOOD.pool;
  const m = decal(_rv.set(x, y, z), _flU, .2, splatTex, col); if (m) POOLS.push({ m, k: m.userData.k, s: rand(1.3, 2.1), t: 0 });
}
function updatePools(dt) {
  for (let i = POOLS.length - 1; i >= 0; i--) { const p = POOLS[i]; p.t += dt; if (p.m.userData.k !== p.k || p.t > 3) { POOLS.splice(i, 1); continue; } p.m.scale.setScalar(p.s * (.15 + .85 * smooth01(p.t / 3))); }
}
UPD.push(dt => { if (G.state === 'city') updatePools(dt); });

/* ---------- gore (the setting) ---------- */
// Gore On. A big gun's headshot takes the head (v23 did this always; now it's this setting's). Black Ops 1's gib rules otherwise: a
// shotgun takes a limb 100 % of the time inside 2.8 m, 75 % to 5.1, 50 % to 6.9, 25 % to 8.4; a blast of 165 or more takes one too.
// Which limb by where it hit: an arm hit, that arm; a leg, that leg; the torso, an arm. The limb's bone shrinks away (BO1 swapped
// in gib models; a bone scale is what a phone can afford) and a burst of chunks goes with it
function goreDeath(a, zone, side, src, dmg) {
  if (G.gore !== 'on' || !src || src === true) return false;
  const w = src.w, d = src.dist || 0, sd = side || (Math.random() < .5 ? -1 : 1);
  let limb = null;
  if (zone === 'head' && src.big) limb = 'head';
  else if (w && w.cls === 'shotgun') { const p = d < 2.8 ? 1 : d < 5.1 ? .75 : d < 6.9 ? .5 : d < 8.4 ? .25 : 0; if (Math.random() < p) limb = gibLimb(zone, sd); }
  else if (src.blast && dmg >= 165) limb = gibLimb(zone, sd);
  else if (w && w.kind === 'saw') limb = gibLimb(zone, sd); // the chainsaw: not Black Ops, just Gore On
  if (!limb) return false;
  const R = a.R, at = _rv.copy(a.pos).setY(1.2);
  if (R.glb) { const b = limb === 'head' ? R.head : findBone(R.model, limb); if (!b) return false; b.updateWorldMatrix(true, false); b.getWorldPosition(at); b.scale.setScalar(.001); }
  else if (limb === 'head') R.head.visible = false; else return false;
  const col = a.type === 'reptile' ? COL.green : COL.blood, fx = !a.unseen;
  if (fx) { burst(FXN, at, 30, 5.5, .9, .14, .06, col, 9, .5); burst(FXN, at, 8, 3.5, 1.1, .22, .12, GIB_C, 12, .7); burst(FXN, at, 3, 1, .8, .2, .7, col, .5, .3, .5); for (let i = 0; i < 3; i++) decal(_rv2.set(at.x + rand(-1.2, 1.2), .022, at.z + rand(-1.2, 1.2)), _flU, rand(.4, .9), splatTex, BLOOD.pool); }
  const sp = spatial(at); if (sp.vol > .05) AU.play('gore_splat_1', { vol: .8 * sp.vol, pan: sp.pan }) || AU.nz(.2, 'lowpass', 900, 200, 1, .3 * sp.vol, sp.pan);
  return true;
}
const GIB_C = CS(0x3a0608);
function gibLimb(zone, sd) {
  const s = sd > 0 ? 'right' : 'left';
  if (zone === 'head') return 'head';
  if (zone === 'thigh' || zone === 'shin') return s + 'upleg';
  if (zone === 'uarm' || zone === 'larm') return s + 'arm';
  return (Math.random() < .5 ? 'left' : 'right') + 'arm';
}
