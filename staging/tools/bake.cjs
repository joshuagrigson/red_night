// The game's world-space retarget bake (src/chars.js bakeCtx/bakeClip at v21 HEAD), reproduced in Node on three r128,
// with a pluggable source skeleton, plus an optional rest-pose correction for sources whose rest is not the target's.
const { T, loadGLB } = require('./three-node.cjs');
const { MAP, boneKey } = require('./bonemap.cjs');

const ualKey = n => (MAP[n] ? boneKey(MAP[n]) : null); // UAL bone name -> game boneKey
const gameKey = n => boneKey(n);

// primary child per logical bone (used for the rest-pose swing); bones without one copy their parent's swing
const CHILD = { hips: 'spine', spine: 'spine1', spine1: 'spine2', spine2: 'neck', neck: 'head' };
for (const S of ['left', 'right']) {
  Object.assign(CHILD, { [S + 'shoulder']: S + 'arm', [S + 'arm']: S + 'forearm', [S + 'forearm']: S + 'hand', [S + 'hand']: S + 'handmiddle1', [S + 'upleg']: S + 'leg', [S + 'leg']: S + 'foot', [S + 'foot']: S + 'toebase', [S + 'toebase']: S + 'toeend' });
  for (const f of ['thumb', 'index', 'middle', 'ring', 'pinky']) for (let i = 1; i <= 3; i++) CHILD[`${S}hand${f}${i}`] = `${S}hand${f}${i + 1}`;
}

function skel(gl, keyFn) {
  const s = T.SkeletonUtils.clone(gl.scene); s.updateMatrixWorld(true);
  const bones = {}, rest = {}, pos = {}; s.traverse(o => { if (o.isBone) { const k = keyFn(o.name); if (!k) return; bones[k] = o; rest[k] = o.getWorldQuaternion(new T.Quaternion()); pos[k] = o.getWorldPosition(new T.Vector3()); } });
  // ground = lowest rest foot/toe joint; legH = rest hips height above it (BVH rests can sit below y=0, e.g. MoMask's hips at -0.22)
  let ground = 1e9; for (const k in pos) if (/foot|toe/.test(k)) ground = Math.min(ground, pos[k].y); if (ground > 1e8) ground = 0;
  return { s, bones, rest, pos, ground, mixer: new T.AnimationMixer(s), hipsRest: bones.hips ? bones.hips.position.length() : 1, hipsWorldY: pos.hips ? pos.hips.y - ground : 1 };
}
// per-bone world swing taking the source rest direction onto the target rest direction (identity when they already agree)
function restSwing(S, Tg) {
  const sw = {};
  const order = Object.keys(Tg.bones).sort((a, b) => depth(Tg.bones[a]) - depth(Tg.bones[b]));
  for (const k of order) {
    const c = CHILD[k];
    if (c && S.pos[k] && S.pos[c] && Tg.pos[k] && Tg.pos[c]) {
      const ds = S.pos[c].clone().sub(S.pos[k]).normalize(), dt = Tg.pos[c].clone().sub(Tg.pos[k]).normalize();
      sw[k] = new T.Quaternion().setFromUnitVectors(ds, dt);
    } else { const p = Tg.bones[k].parent; const pk = p && p.isBone ? Object.keys(Tg.bones).find(x => Tg.bones[x] === p) : null; sw[k] = pk && sw[pk] ? sw[pk].clone() : new T.Quaternion(); }
  }
  return sw;
}
const depth = o => { let d = 0; while (o.parent) { d++; o = o.parent; } return d; };

// opts: { fix: bool (rest swing + world-space hips translation), srcKey, inPlace }
function bakeClip(S, Tg, src, opts) {
  opts = opts || {};
  const order = []; Tg.s.traverse(o => { if (o.isBone) order.push(o); });
  const idx = new Map(order.map((b, i) => [b, i]));
  const sw = opts.fix ? restSwing(S, Tg) : null;
  const mk = k => opts.mirror ? k.replace(/^left/, '#').replace(/^right/, 'left').replace(/^#/, 'right') : k;
  const tgt = order.map(b => {
    const k = gameKey(b.name), sk = mk(k), sb = S.bones[sk] || null;
    let srcRest = sb ? S.rest[sk].clone() : null;
    if (sb && sw && sw[k]) srcRest = sw[k].clone().multiply(srcRest); // aligned source rest = swing * rest
    const rest = b.getWorldQuaternion(new T.Quaternion());
    // mirror path: w = M(Qs(t) * Qs_rest^-1) * swing^-1 * Qt_rest, M(q) = reflection across the body's mid plane (x -> -x)
    const rawInv = sb ? S.rest[sk].clone().invert() : null, post = sb ? (sw && sw[k] ? sw[k].clone().invert() : new T.Quaternion()).multiply(rest) : null;
    return { b, k, sb, rest, srcInv: sb ? srcRest.invert() : null, rawInv, post, local: b.quaternion.clone(), pi: b.parent && b.parent.isBone ? idx.get(b.parent) : -1, parentStatic: b.parent && !b.parent.isBone ? b.parent.getWorldQuaternion(new T.Quaternion()) : new T.Quaternion(), w: new T.Quaternion() };
  });
  const ratio = Tg.hipsRest / (S.hipsRest || 1);
  const tracks = [];
  const _bq = new T.Quaternion(), _bq2 = new T.Quaternion(), _bv = new T.Vector3(), _bs = new T.Vector3();
  const fps = 30, n = Math.max(2, Math.ceil(src.duration * fps) + 1), times = new Float32Array(n), vals = tgt.map(() => new Float32Array(n * 4));
  const hipsPos = new Float32Array(n * 3);
  const act = S.mixer.clipAction(src); act.reset();
  if (opts.loopOnce) { act.setLoop(T.LoopOnce, 1); act.clampWhenFinished = true; }
  act.play();
  const tHips = order.find(b => gameKey(b.name) === 'hips');
  const tHipsParentInv = tHips.parent.matrixWorld.clone().invert();
  let srcGround = S.ground;
  if (opts.fix && opts.groundFromClip) { S.mixer.setTime(0); S.s.updateMatrixWorld(true); srcGround = 1e9; for (const k in S.bones) if (/foot|toe/.test(k)) srcGround = Math.min(srcGround, S.bones[k].getWorldPosition(new T.Vector3()).y); }
  const hr = Tg.hipsWorldY / S.hipsWorldY;
  for (let f = 0; f < n; f++) {
    const time = Math.min(src.duration, f / fps); times[f] = time;
    S.mixer.setTime(time); S.s.updateMatrixWorld(true);
    for (let j = 0; j < tgt.length; j++) {
      const T0 = tgt[j], pw = T0.pi >= 0 ? tgt[T0.pi].w : T0.parentStatic, w = T0.w;
      if (T0.sb && opts.mirror) { T0.sb.matrixWorld.decompose(_bv, _bq, _bs); _bq.multiply(T0.rawInv); _bq.y = -_bq.y; _bq.z = -_bq.z; w.copy(_bq).multiply(T0.post); }
      else if (T0.sb) { T0.sb.matrixWorld.decompose(_bv, _bq, _bs); w.copy(_bq).multiply(T0.srcInv).multiply(T0.rest); }
      else w.copy(pw).multiply(T0.local);
      _bq2.copy(pw).invert().multiply(w); const v = vals[j], i4 = f * 4; v[i4] = _bq2.x; v[i4 + 1] = _bq2.y; v[i4 + 2] = _bq2.z; v[i4 + 3] = _bq2.w;
    }
    // hips translation
    if (opts.fix) { // source hips world displacement from its rest, scaled, added to the target hips rest, then into the parent's space
      const w = S.bones.hips.getWorldPosition(new T.Vector3());
      const sp = new T.Vector3((w.x - S.pos.hips.x) * hr, (w.y - srcGround) * hr, (w.z - S.pos.hips.z) * hr);
      if (opts.mirror) sp.x = -sp.x;
      const tp = new T.Vector3(Tg.pos.hips.x + sp.x, Tg.ground + sp.y, Tg.pos.hips.z + sp.z).applyMatrix4(tHipsParentInv);
      hipsPos[f * 3] = tp.x; hipsPos[f * 3 + 1] = tp.y; hipsPos[f * 3 + 2] = tp.z;
    } else { // the game's way: the raw local position track values times the hips ratio
      const p = S.bones.hips.position; hipsPos[f * 3] = p.x * ratio; hipsPos[f * 3 + 1] = p.y * ratio; hipsPos[f * 3 + 2] = p.z * ratio;
    }
  }
  act.stop(); S.mixer.uncacheAction(src);
  if (opts.inPlace) for (let f = 0; f < n; f++) { hipsPos[f * 3] = hipsPos[0]; hipsPos[f * 3 + 2] = hipsPos[2]; }
  tracks.push(new T.VectorKeyframeTrack(tHips.name + '.position', times, hipsPos));
  tgt.forEach((T0, j) => { if (T0.sb || T0.k.startsWith('hips')) tracks.push(new T.QuaternionKeyframeTrack(T0.b.name + '.quaternion', times, vals[j])); });
  return new T.AnimationClip(src.name, src.duration, tracks);
}

// sample a clip (LoopOnce, so the last frame is really the last frame) on a skeleton; returns per-frame world positions
function sample(Sk, clip, times) {
  const act = Sk.mixer.clipAction(clip); act.reset(); act.setLoop(T.LoopOnce, 1); act.clampWhenFinished = true; act.play();
  const out = [];
  for (const t of times) { Sk.mixer.setTime(t); Sk.s.updateMatrixWorld(true); const fr = {}; for (const k in Sk.bones) fr[k] = Sk.bones[k].getWorldPosition(new T.Vector3()); out.push(fr); }
  act.stop(); Sk.mixer.uncacheAction(clip); return out;
}
const SEGS = [['leftarm', 'leftforearm'], ['leftforearm', 'lefthand'], ['rightarm', 'rightforearm'], ['rightforearm', 'righthand'], ['leftupleg', 'leftleg'], ['leftleg', 'leftfoot'], ['rightupleg', 'rightleg'], ['rightleg', 'rightfoot'], ['leftfoot', 'lefttoebase'], ['rightfoot', 'righttoebase'], ['hips', 'spine2'], ['spine2', 'head'], ['leftshoulder', 'leftarm'], ['rightshoulder', 'rightarm']];
function compare(A, B) { // A, B: arrays of frames of world positions; returns mean/max angle (deg) over segments and frames
  let sum = 0, cnt = 0, max = 0, worst = '';
  const per = {};
  for (let f = 0; f < A.length; f++) for (const [a, b] of SEGS) {
    if (!A[f][a] || !A[f][b] || !B[f][a] || !B[f][b]) continue;
    const da = A[f][b].clone().sub(A[f][a]).normalize(), db = B[f][b].clone().sub(B[f][a]).normalize();
    const ang = Math.acos(Math.max(-1, Math.min(1, da.dot(db)))) * 180 / Math.PI;
    sum += ang; cnt++; if (ang > max) { max = ang; worst = a + '>' + b + '@f' + f; }
    const key = a + '>' + b; per[key] = (per[key] || 0) + ang / A.length;
  }
  return { mean: +(sum / cnt).toFixed(1), max: +max.toFixed(1), worst, per };
}
module.exports = { T, loadGLB, skel, bakeClip, sample, compare, ualKey, gameKey, restSwing, SEGS };
