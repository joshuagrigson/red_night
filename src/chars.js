/* =====================================================================
   RED NIGHT — skinned AI-generated characters (Tripo, Mixamo skeleton)
   One animation library (retargeted onto every character by bone name)
   ===================================================================== */
const CHARS = {
  female: { url: 'assets/anims.glb', h: 1.72 },
  male: { url: 'assets/char_male.glb', h: 1.82 },
  purger: { url: 'assets/char_purger.glb', h: 1.8 },
  demon: { url: 'assets/char_demon.glb', h: 2.05 },
  vampire: { url: 'assets/char_vampire.glb', h: 1.86 },
  reptile: { url: 'assets/char_reptile.glb', h: 1.85 },
  witch: { url: 'assets/char_witch.glb', h: 1.74 },
  beast: { url: 'assets/char_beast.glb', h: 2.25 },
  civilian: { url: 'assets/char_civilian.glb', h: 1.66 },
  suit: { url: 'assets/char_suit.glb', h: 1.82 },
  // dedicated player outfits (one Tripo model per outfit and body)
  hackm: { url: 'assets/char_hackm.glb', h: 1.8 }, hackf: { url: 'assets/char_hackf.glb', h: 1.7 }, nomadm: { url: 'assets/char_nomadm.glb', h: 1.83 },
  nomadf: { url: 'assets/char_nomadf.glb', h: 1.71 }, corpof: { url: 'assets/char_corpof.glb', h: 1.72 }, corpom: { url: 'assets/char_corpom.glb', h: 1.83 },
  // ~9k-triangle crowd versions (same skeletons) so the streets can hold many more people
  civilian_lo: { url: 'assets/char_civilian_lo.glb', h: 1.66, crowd: 1 }, suit_lo: { url: 'assets/char_suit_lo.glb', h: 1.8, crowd: 1 },
  male_lo: { url: 'assets/char_male_lo.glb', h: 1.8, crowd: 1 }, female_lo: { url: 'assets/char_female_lo.glb', h: 1.7, crowd: 1 },
};
const ANIMLIB = { url: 'assets/anims.glb', clips: null, hipsRest: 1 };
// which library clip each logical state uses
const CLIPMAP = { idle: 'idle', walk: 'walk', run: 'run', shoot: 'shoot', slash: 'slash', punch: 'box_01', hit: 'hit_to_body_01', die: 'fall', fall: 'fall', cast: 'cast_a_spell', plead: 'frightened' };
let CHARS_READY = false;
// rest-pose bounds measured from the uncompressed Tripo exports (unit-normalized, feet at 0)
const RAWB_LO = { civilian_lo: 'civilian', suit_lo: 'suit', male_lo: 'male', female_lo: 'female' };
const RAWB = { corpom: { minY: 0, h: .9786 }, hackm: { minY: 0, h: .9806 }, hackf: { minY: 0, h: .9797 }, nomadm: { minY: 0, h: .9794 }, nomadf: { minY: 0, h: .9795 }, corpof: { minY: 0, h: .9822 }, female: { minY: 0, h: .9803 }, purger: { minY: 0, h: .9797 }, demon: { minY: 0, h: .9793 }, vampire: { minY: 0, h: .9792 }, reptile: { minY: 0, h: .965 }, witch: { minY: 0, h: .9805 }, beast: { minY: 0, h: .9661 }, suit: { minY: 0, h: .9801 }, male: { minY: 0, h: .9799 }, civilian: { minY: 0, h: .9785 } };

function parseGLBText(loader, url) {
  return fetch(url + '.txt').then(r => { if (!r.ok) throw 0; return r.text(); }).then(b64 => new Promise((res, rej) => {
    const bin = atob(b64.trim()); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    loader.parse(buf.buffer, '', res, rej);
  }));
}
const boneKey = n => n.replace(/^mixamorig[:_]?/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
function findBone(root, key) { let b = null; root.traverse(o => { if (!b && o.isBone && boneKey(o.name) === key) b = o; }); return b; }
function loadChars() {
  if (!T.GLTFLoader || !T.SkeletonUtils) return Promise.resolve();
  const loader = new T.GLTFLoader(); if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
  const jobs = Object.keys(CHARS).map(id => parseGLBText(loader, CHARS[id].url).then(gl => prepChar(id, gl)).catch(() => { }));
  jobs.push(parseGLBText(loader, ANIMLIB.url).then(gl => {
    const map = {}; for (const c of gl.animations) map[c.name.toLowerCase().replace(/^.*\|/, '')] = c;
    ANIMLIB.raw = map; const hips = findBone(gl.scene, 'hips'); ANIMLIB.hipsRest = hips ? hips.position.length() : 1;
    ANIMLIB.hipsName = hips ? hips.name : 'mixamorigHips';
  }).catch(() => { }));
  return Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 25000))]).then(() => { CHARS_READY = !!ANIMLIB.raw; });
}
function prepChar(id, gl) {
  const def = CHARS[id]; const sc = gl.scene;
  sc.traverse(o => {
    if (o.isMesh) {
      o.frustumCulled = false; o.castShadow = false;
      if (o.material) { o.material.envMapIntensity = .6; o.material.side = T.FrontSide; o.material.roughness = Math.min(1, (o.material.roughness || 1) * 1.05); }
    }
  });
  sc.updateMatrixWorld(true);
  // rest-pose height. Meshopt quantizes positions and r128 computes bounds from the raw integers,
  // so measured-offline numbers win; otherwise fall back to the skeleton (crown bone to lowest toe).
  let size, minY;
  const rb = RAWB[id] || RAWB[RAWB_LO[id]];
  if (rb) { size = new T.Vector3(1, rb.h, 1); minY = rb.minY; }
  else { let lo = 1e9, hi = -1e9; const v = new T.Vector3(); sc.traverse(o => { if (o.isBone) { o.getWorldPosition(v); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); } }); size = new T.Vector3(1, Math.max(.01, (hi - lo) * 1.04), 1); minY = lo; }
  const box = { min: { y: minY } };
  def.k = def.h / Math.max(.01, size.y); def.minY = box.min.y; def.scene = sc;
  const hips = findBone(sc, 'hips'); def.hipsRest = hips ? hips.position.length() : 1;
  def.hipsName = hips ? hips.name : null;
  // the model's forward: glTF characters face +Z; our actors face -Z
  def.flip = true;
}
// per-character clips. Tripo auto-rigs every model with its own bone rolls (the right arm chain differs by up
// to 180deg between characters), so raw local quaternions from the library twist limbs. Instead we bake a
// world-space retarget: for each frame, take each library bone's world rotation relative to its T-pose,
// apply that delta to this character's T-pose world rotation, and convert back to local. Hips translation
// is rescaled to the character's proportions.
const RT = {};
function retargetSrc() {
  if (RT.src) return RT.src;
  const s = T.SkeletonUtils.clone(CHARS.female.scene); s.updateMatrixWorld(true);
  const bones = {}, rest = {}; s.traverse(o => { if (o.isBone) { const k = boneKey(o.name); bones[k] = o; rest[k] = o.getWorldQuaternion(new T.Quaternion()); } });
  return RT.src = { s, bones, rest, mixer: new T.AnimationMixer(s) };
}
function clipsFor(id) {
  const def = CHARS[id]; if (def.clips) return def.clips;
  const out = {}; const ratio = def.hipsRest / (ANIMLIB.hipsRest || 1);
  const names = {}; def.scene.traverse(o => { if (o.isBone) names[boneKey(o.name)] = o.name; });
  const bake = id !== 'female' && T.SkeletonUtils && CHARS.female.scene;
  let tgt = null;
  if (bake) {
    def.scene.updateMatrixWorld(true); const order = [];
    def.scene.traverse(o => { if (o.isBone) order.push(o); });
    tgt = order.map(b => ({ b, k: boneKey(b.name), rest: b.getWorldQuaternion(new T.Quaternion()), local: b.quaternion.clone(), parentBone: b.parent && b.parent.isBone ? b.parent : null, parentStatic: b.parent && !b.parent.isBone ? b.parent.getWorldQuaternion(new T.Quaternion()) : new T.Quaternion() }));
  }
  const S = bake ? retargetSrc() : null;
  const qa = new T.Quaternion(), qd = new T.Quaternion(), qi = new T.Quaternion();
  for (const logical in CLIPMAP) {
    const want = CLIPMAP[logical]; let src = ANIMLIB.raw && ANIMLIB.raw[want];
    if (!src && ANIMLIB.raw) { const k = Object.keys(ANIMLIB.raw).find(n => n.startsWith(want)); if (k) src = ANIMLIB.raw[k]; }
    if (!src) continue;
    const tracks = [];
    // hips translation (and, without baking, raw rotations)
    for (const t of src.tracks) {
      const dot = t.name.lastIndexOf('.'); const bone = t.name.slice(0, dot), prop = t.name.slice(dot + 1);
      const mine = names[boneKey(bone)]; if (!mine) continue;
      if (prop === 'scale') continue;
      if (prop === 'quaternion' && bake) continue;
      const nt = t.clone(); nt.name = mine + '.' + prop;
      if (prop === 'position') {
        if (boneKey(bone) !== 'hips') continue; // only the hips may translate
        const v = nt.values; for (let i = 0; i < v.length; i++) v[i] *= ratio;
        if (logical === 'walk' || logical === 'run') { for (let i = 0; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; } } // in place
      }
      tracks.push(nt);
    }
    if (bake) {
      const fps = 30, n = Math.max(2, Math.ceil(src.duration * fps) + 1); const times = new Float32Array(n);
      const vals = tgt.map(() => new Float32Array(n * 4)); const W = new Map();
      const act = S.mixer.clipAction(src); act.reset(); act.play();
      for (let f = 0; f < n; f++) {
        const time = Math.min(src.duration, f / fps); times[f] = time;
        S.mixer.setTime(time); S.s.updateMatrixWorld(true); W.clear();
        tgt.forEach((T0, j) => {
          const sb = S.bones[T0.k]; const pw = T0.parentBone ? W.get(T0.parentBone) : T0.parentStatic;
          let w;
          if (sb) { sb.getWorldQuaternion(qa); qd.copy(qa).multiply(qi.copy(S.rest[T0.k]).invert()); w = qd.clone().multiply(T0.rest); }
          else w = pw.clone().multiply(T0.local);
          W.set(T0.b, w);
          const loc = pw.clone().invert().multiply(w); const v = vals[j]; v[f * 4] = loc.x; v[f * 4 + 1] = loc.y; v[f * 4 + 2] = loc.z; v[f * 4 + 3] = loc.w;
        });
      }
      act.stop(); S.mixer.uncacheAction(src);
      tgt.forEach((T0, j) => { if (S.bones[T0.k] || T0.k.startsWith('hips')) tracks.push(new T.QuaternionKeyframeTrack(T0.b.name + '.quaternion', times, vals[j])); });
    }
    out[logical] = new T.AnimationClip(logical, src.duration, tracks);
  }
  def.clips = out; return out;
}
function makeGLBRig(id) {
  const def = CHARS[id]; if (!def || !def.scene || !CHARS_READY) return null;
  const root = new T.Group();
  const m = T.SkeletonUtils.clone(def.scene);
  const pivot = new T.Group(); pivot.add(m); root.add(pivot);
  pivot.scale.setScalar(def.k); pivot.position.y = -def.minY * def.k; if (def.flip) pivot.rotation.y = Math.PI;
  const mixer = new T.AnimationMixer(m); const clips = clipsFor(id); const actions = {};
  for (const n in clips) {
    const a = mixer.clipAction(clips[n]); actions[n] = a;
    if (n === 'die' || n === 'fall' || n === 'hit' || n === 'slash' || n === 'punch' || n === 'cast') { a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; }
  }
  const head = findBone(m, 'head'), hand = findBone(m, 'righthand'), lhand = findBone(m, 'lefthand'), hips = findBone(m, 'hips'), spine = findBone(m, 'spine2') || findBone(m, 'spine1');
  const dummyStd = () => new T.MeshStandardMaterial(); const mats = { skin: dummyStd(), top: dummyStd(), bottom: dummyStd(), shoe: dummyStd(), acc: new T.MeshBasicMaterial(), eyeM: new T.MeshBasicMaterial() };
  const rc = RIMCOL[id] || [0x7ab8ff, .3];
  const meshes = []; m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); addRim(o.material, rc[0], rc[1]); meshes.push(o); } });
  const R = { glb: id, root, model: m, mixer, actions, cur: null, mats, eyeM: mats.eyeM, eyes: [], head: head || new T.Object3D(), skull: { material: null }, rArm: { hand: hand || root }, lArm: { hand: lhand || root }, hips, spine, meshes, f: id === 'female' || id === 'witch' || id === 'civilian' };
  play(R, 'idle', 0);
  return R;
}
function play(R, name, fade, speed) {
  const a = R.actions[name] || R.actions.idle; if (!a) return;
  if (speed !== undefined) a.timeScale = speed;
  if (R.cur === a) return;
  if (R.cur) { a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); R.cur.crossFadeTo(a, fade === undefined ? .2 : fade, false); }
  else { a.reset(); a.play(); }
  R.cur = a; R.curName = name;
}
// state -> clip, mirrors animRig's inputs so actors don't need two code paths
function animGLB(R, st, dt, kind) {
  let n = 'idle', sp;
  if (st.death > 0) n = st.deathClip || 'die';
  else if (st.attack > 0 && st.attackClip) n = st.attackClip;
  else if (st.flinch > .45 && R.actions.hit) n = 'hit';
  else if (st.hold === 'plead') n = st.speed > .3 ? 'walk' : 'plead';
  else if (st.air) n = 'run';
  else if (st.speed > 4.6) { n = 'run'; sp = clamp(st.speed / 6.5, .7, 1.5); }
  else if (st.speed > .35) { n = 'walk'; sp = clamp(st.speed / 1.6, .6, 1.8); }
  else if (st.aimHold) n = 'idle';
  if (n === 'hit' && R.curName === 'hit' && R.cur && R.cur.time >= R.cur.getClip().duration - .02) n = 'idle';
  play(R, n, n === 'die' ? .12 : .22, sp);
  if (st.attack > 0 && st.attackClip && R.curName === st.attackClip && st.attackJust) { R.cur.reset(); R.cur.play(); }
  R.mixer.update(dt); if (R.cust) custBase(R);
  R.crouchW = (R.crouchW || 0) + ((st.crouch && !(st.death > 0) ? 1 : 0) - (R.crouchW || 0)) * Math.min(1, dt * 8);
  if (R.crouchW > .01) crouchOverlay(R, R.crouchW);
  // procedural aim layered over the clip: Tripo's 'shoot' preset is a run-and-gun sequence, so arms are posed by hand
  const want = st.aimHold && !(st.death > 0) && !(st.attack > 0 && st.attackClip) ? 1 : 0;
  R.aimW = (R.aimW || 0) + (want - (R.aimW || 0)) * Math.min(1, dt * 10);
  if (R.aimW > .01 || R.gunMount) aimOverlay(R, st);
}
const _q1 = new T.Quaternion(), _q2 = new T.Quaternion(), _q3 = new T.Quaternion(), _v1 = new T.Vector3(), _v2 = new T.Vector3(), _v3 = new T.Vector3(), _m4 = new T.Matrix4();
// rotate `bone` (in its parent's space) so the bone->child segment points along world `dir`, blended by w
function pointBone(bone, child, dir, w) {
  if (!bone || !child || w <= 0) return;
  bone.updateWorldMatrix(true, true);
  bone.getWorldPosition(_v1); child.getWorldPosition(_v2); _v2.sub(_v1); if (_v2.lengthSq() < 1e-10) return; _v2.normalize();
  _q1.setFromUnitVectors(_v2, dir);                 // world-space delta
  bone.getWorldQuaternion(_q2); _q2.premultiply(_q1); // desired world rotation
  bone.parent.getWorldQuaternion(_q3); _q3.invert().multiply(_q2); // back to local
  bone.quaternion.slerp(_q3, w);
  bone.updateWorldMatrix(false, true);
}
function aimOverlay(R, st) {
  if (!R.aimBones) { const m = R.model; R.aimBones = { ra: findBone(m, 'rightarm'), rf: findBone(m, 'rightforearm'), rh: findBone(m, 'righthand'), la: findBone(m, 'leftarm'), lf: findBone(m, 'leftforearm'), lh: findBone(m, 'lefthand'), mid: findBone(m, 'righthandmiddle1') }; }
  const B = R.aimBones, w = R.aimW || 0;
  R.root.updateWorldMatrix(true, false); R.root.getWorldQuaternion(_q1);
  const pitch = st.aimPitch || 0;
  const F = new T.Vector3(0, Math.sin(pitch), -Math.cos(pitch)).applyQuaternion(_q1).normalize();
  const U = new T.Vector3(0, 1, 0), Rt = new T.Vector3().crossVectors(F, U).normalize();
  if (w > .01) {
    const d = (f, u, r) => new T.Vector3().addScaledVector(F, f).addScaledVector(U, u).addScaledVector(Rt, r).normalize();
    pointBone(B.ra, B.rf, d(.55, -.75, .12), w);   // right elbow tucked low
    pointBone(B.rf, B.rh, d(.9, .12, -.38), w);    // right forearm across to the grip
    pointBone(B.la, B.lf, d(.8, -.45, -.18), w);   // left arm reaches forward
    pointBone(B.lf, B.lh, d(.88, .05, .45), w);    // left hand under the handguard
  }
  // guns are oriented in world space: low-ready when relaxed, down the sightline when aiming
  if (R.gunMount) {
    const g = R.gunMount.g, low = (1 - (R.aimW || 0)) * .55;
    const Fg = F.clone().applyAxisAngle(Rt, -low).normalize(), Ug = new T.Vector3().crossVectors(Rt, Fg).normalize();
    if (R.gunMount.mode === 'tpp') _m4.makeBasis(Rt, Fg.clone().negate(), Ug.clone().negate()); // built gun: forward is -Y, up is -Z
    else _m4.makeBasis(Rt, Ug, Fg.clone().negate());                                              // npc gun: forward -Z
    _q2.setFromRotationMatrix(_m4); g.parent.updateWorldMatrix(true, false); g.parent.getWorldQuaternion(_q3); g.quaternion.copy(_q3.invert().multiply(_q2));
    // seat the grip in the palm (between wrist and knuckles) — hand bones sit differently on every scanned model
    if (B.rh && B.mid) { B.rh.getWorldPosition(_v1); B.mid.getWorldPosition(_v2); _v1.lerp(_v2, .5); g.position.copy(g.parent.worldToLocal(_v1)); }
  }
}
// procedural crouch over any clip: thighs forward, shins down; the actor's sync() drops the root to match
function crouchOverlay(R, w) {
  if (!R.legB) { const m = R.model; R.legB = ['left', 'right'].map(k => [findBone(m, k + 'upleg'), findBone(m, k + 'leg'), findBone(m, k + 'foot')]); }
  R.root.updateWorldMatrix(true, false); R.root.getWorldQuaternion(_q1);
  const F = new T.Vector3(0, 0, -1).applyQuaternion(_q1); F.y = 0; F.normalize(); const Rt = new T.Vector3().crossVectors(F, new T.Vector3(0, 1, 0));
  R.legB.forEach(([u, l, f], i) => {
    const side = i ? 1 : -1;
    pointBone(u, l, new T.Vector3().addScaledVector(F, .8).addScaledVector(Rt, .14 * side).add(new T.Vector3(0, -.6, 0)).normalize(), w);
    pointBone(l, f, new T.Vector3().addScaledVector(F, -.14).add(new T.Vector3(0, -1, 0)).normalize(), w);
  });
}
// neon rim light so characters read against the night streets (Cyberpunk-style silhouettes)
function addRim(mat, col, k) {
  if (mat.userData.rim) return; mat.userData.rim = { c: { value: new T.Color(col) }, k: { value: k } };
  const prev = mat.onBeforeCompile, U = mat.userData.rim;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(mat, sh, r);
    sh.uniforms.rimC = U.c; sh.uniforms.rimK = U.k;
    sh.fragmentShader = 'uniform vec3 rimC; uniform float rimK;\n' + sh.fragmentShader.replace('#include <output_fragment>', 'outgoingLight += rimC * pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.4) * rimK;\n#include <output_fragment>');
  };
  const pk = mat.customProgramCacheKey; mat.customProgramCacheKey = () => (pk ? pk.call(mat) : '') + '|rim'; mat.needsUpdate = true;
}
const RIMCOL = { hackm: [0x05d9e8, .35], hackf: [0x05d9e8, .35], nomadm: [0xff8a3a, .3], nomadf: [0xff8a3a, .3], corpof: [0xff2a6d, .3], corpom: [0xff2a6d, .3], purger: [0xff2a6d, .5], demon: [0xff5a10, .45], vampire: [0xff1030, .45], reptile: [0x3dff6a, .4], witch: [0xb04dff, .5], beast: [0xff2a3a, .45], civilian_lo: [0x7ab8ff, .28], suit_lo: [0x7ab8ff, .28], male_lo: [0x7ab8ff, .28], female_lo: [0x7ab8ff, .28], civilian: [0x7ab8ff, .3], suit: [0x7ab8ff, .3], male: [0x05d9e8, .35], female: [0x05d9e8, .35] };
// player customization on the Tripo models: recolor by body band (world height / character height) and by
// what the texel looks like. Skin-hued texels take the chosen skin tone, the rest of the head takes the hair
// colour, torso/arms take the outfit top, legs the bottom. Luminance is kept so the texture's detail survives.
// women whose model shows a bare stomach: the top is extended down to the belt in this colour (null = the outfit colour)
const COVER = { female: 0x17171c, female_lo: null, hackf: 0x131317, nomadf: 0xcbbfa8 };
function bindBounds(geo) {
  if (geo.userData.bb) return geo.userData.bb;
  const a = geo.attributes.position, arr = a.isInterleavedBufferAttribute ? a.data.array : a.array, st = a.isInterleavedBufferAttribute ? a.data.stride : a.itemSize, of = a.isInterleavedBufferAttribute ? a.offset : 0; let k = 1;
  if (a.normalized) k = arr instanceof Int16Array ? 32767 : arr instanceof Uint16Array ? 65535 : arr instanceof Int8Array ? 127 : arr instanceof Uint8Array ? 255 : 1;
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < a.count; i++) for (let j = 0; j < 3; j++) { const v = arr[i * st + of + j] / k; if (v < mn[j]) mn[j] = v; if (v > mx[j]) mx[j] = v; }
  const min = new T.Vector3(mn[0], mn[1], mn[2]), size = new T.Vector3(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
  return (geo.userData.bb = { min, size });
}
function customizeGLB(R, o) {
  const H = (CHARS[R.glb] && CHARS[R.glb].h) || 1.8;
  const lin = hex => new T.Color(hex).convertSRGBToLinear();
  const U = R.cust = { cBase: { value: 0 }, cH: { value: H * (R.root.scale.y || 1) }, cSkin: { value: lin(o.skin) }, cHair: { value: lin(o.hairCol) }, cTop: { value: lin(o.top) }, cBot: { value: lin(o.bottom) }, cAcc: { value: lin(o.accent) }, cMask: { value: o.mask === 3 ? 3 : o.mask === 2 ? 2 : o.mask ? 1 : 0 }, cNeon: { value: lin(o.neon || 0x05d9e8) }, cCov: { value: COVER[R.glb] !== undefined ? 1 : 0 }, cCovC: { value: lin(COVER[R.glb] || o.top) }, cBMin: { value: new T.Vector3() }, cBSize: { value: new T.Vector3(1, 1, 1) }, cK: { value: o.k === undefined ? .78 : o.k } };
  for (const mesh of R.meshes) {
    const mat = mesh.material; if (!mat || !mat.map) continue;
    const prevOBC = mat.onBeforeCompile;
    const bb = bindBounds(mesh.geometry); const MU = Object.assign({}, U, { cBMin: { value: bb.min }, cBSize: { value: bb.size } });
    mat.onBeforeCompile = (sh, r) => {
      if (prevOBC) prevOBC.call(mat, sh, r);
      Object.assign(sh.uniforms, MU);
      sh.vertexShader = 'varying float vCY; varying vec3 vBP; uniform vec3 cBMin; uniform vec3 cBSize;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBP = (position - cBMin) / cBSize;').replace('#include <skinning_vertex>', '#include <skinning_vertex>\n  vCY = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = 'uniform float cBase; uniform float cH; uniform vec3 cSkin; uniform vec3 cHair; uniform vec3 cTop; uniform vec3 cBot; uniform vec3 cAcc; uniform float cK; uniform float cMask; uniform vec3 cNeon; uniform float cCov; uniform vec3 cCovC; uniform vec3 cBSize;\nvarying float vCY; varying vec3 vBP;\n' +
        'vec3 rnHSV(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-6)),d/(q.x+1e-6),q.x); }\n' +
        sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  float rnGlow = 0.0; vec3 rnGlowC = vec3(0.); float rnCov = 0.;
  {
    vec3 src = diffuseColor.rgb; vec3 g = pow(max(src, vec3(0.)), vec3(1. / 2.2)); vec3 hsv = rnHSV(g);
    float lum = dot(src, vec3(.2126, .7152, .0722));
    float yN = (vCY - cBase) / cH;
    float hueSkin = 1. - smoothstep(.07, .13, min(hsv.x, 1. - hsv.x + .02));
    float skin = hueSkin * smoothstep(.06, .14, hsv.y) * (1. - smoothstep(.62, .75, hsv.y)) * smoothstep(.18, .3, hsv.z);
    float head = smoothstep(.84, .87, yN), legs = 1. - smoothstep(.44, .5, yN), feet = 1. - smoothstep(.04, .07, yN);
    float tl = dot(cSkin, vec3(.2126, .7152, .0722));
    vec3 skinC = cSkin * clamp(lum / .2, .25, 2.2);
    vec3 cloth = mix(cTop, cBot, legs);
    float cl = max(.02, dot(cloth, vec3(.2126, .7152, .0722)));
    vec3 clothC = cloth * clamp(lum / max(cl, .06), .15, 2.4) + cloth * .08;
    vec3 hairC = cHair * clamp(.25 + lum * 5., .2, 2.2);
    vec3 headC = hairC;
    if (cMask > .5) { // hooded mask: the hood takes the outfit colour, the painted neon face takes the chosen colour and glows
      float pk = max(g.r, max(g.g, g.b)); rnGlow = smoothstep(.5, .68, pk) * head * (1. - smoothstep(.94, .955, yN)) * (1. - skin); // the face only, not the top of the hood
      vec3 nc = cHair / max(max(cHair.r, cHair.g), max(cHair.b, 1e-3));      // full-saturation neon, so every pick reads as its own colour
      vec3 paint = nc * clamp(.3 + lum * 1.2, .3, 1.1);
      headC = mix(clothC, paint, rnGlow); rnGlowC = nc;
    }
    if (cMask > 1.5) { // hooded robe: hood keeps the robe colour, dark strands under it are hair, the eyes glow in the same colour
      float hairK = (1. - smoothstep(.015, .06, lum)) * head * (1. - skin);
      float pk2 = max(g.r, max(g.g, g.b)); float eye = smoothstep(.45, .65, pk2) * hsv.y * head * (1. - skin);
      float hl = dot(cHair, vec3(.2126, .7152, .0722)); vec3 nc = cHair / max(max(cHair.r, cHair.g), max(cHair.b, 1e-3));
      headC = mix(mix(clothC, cHair * clamp(.35 + lum * 8., .3, 2.), hairK), hl > .08 ? nc : src, eye);
      rnGlow = eye; rnGlowC = hl > .08 ? nc * 1.5 : vec3(0.);
    }
    vec3 neonPaint = vec3(0.); float neonK = 0.;
    if (cMask > 2.5) { // dedicated outfit model: the designed clothes stay as sculpted, hair takes the hair colour, cyan trims take the neon colour and glow
      clothC = src;
      float hairK = (1. - smoothstep(.03, .1, lum)) * smoothstep(.885, .91, yN) * (1. - skin);
      headC = mix(src, cHair * clamp(.35 + lum * 8., .3, 2.), hairK);
      float band = smoothstep(.40, .46, hsv.x) * (1. - smoothstep(.62, .68, hsv.x));
      neonK = band * smoothstep(.2, .38, hsv.y) * smoothstep(.24, .42, hsv.z) * (1. - skin);
      vec3 nc = cNeon / max(max(cNeon.r, cNeon.g), max(cNeon.b, 1e-3));
      neonPaint = nc * clamp(.4 + lum * 1.3, .4, 1.2); rnGlow = max(rnGlow, neonK); rnGlowC = nc;
    }
    vec3 notSkin = mix(mix(clothC, src, feet * .7), headC, head);
    float cov = 0.;
    if (cCov > .5) { // bare midriff -> the top continues down to the belt (bind pose: arms are out to the sides, torso is the centre column)
      float bx = abs(vBP.x - .5) * cBSize.x / cBSize.y;
      cov = smoothstep(.485, .505, vBP.y) * (1. - smoothstep(.69, .71, vBP.y)) * (1. - smoothstep(.115, .135, bx)) * max(smoothstep(.25, .6, skin), hueSkin * smoothstep(.05, .12, hsv.y) * (1. - smoothstep(.75, .85, hsv.y)));
      rnCov = cov;
    }
    vec3 outC = mix(mix(notSkin, skinC, skin), neonPaint, neonK);
    vec3 shirt = cCovC * clamp(.86 + (lum - .2) * .45, .74, 1.08); outC = mix(outC, shirt, cov);
    diffuseColor.rgb = mix(src, outC, max(max(cK * (skin > .5 ? .85 : 1.), rnGlow), cov));
  }`).replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  vec3 rnGeoN = normal;').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n  normal = normalize(mix(normal, rnGeoN, rnCov * .85));').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += rnGlowC * rnGlow * 1.05;');
    };
    mat.customProgramCacheKey = () => 'rncust' + (mat.userData.rim ? 'r' : '') + (o.mask ? 'm' + o.mask : '') + (COVER[R.glb] !== undefined ? 'c' : '');
    mat.needsUpdate = true;
  }
  return R;
}
function custBase(R) { if (R && R.cust) { R.root.updateWorldMatrix(true, false); const v = new T.Vector3(); R.root.getWorldPosition(v); R.cust.cBase.value = v.y; const s = new T.Vector3(); R.root.getWorldScale(s); R.cust.cH.value = (CHARS[R.glb].h) * s.y; } }
// one dedicated Tripo model per outfit and body
const PLAYER_MODELS = { m: { samurai: 'male', netrunner: 'hackm', nomad: 'nomadm', corpo: 'corpom' }, f: { samurai: 'female', netrunner: 'hackf', nomad: 'nomadf', corpo: 'corpof' } };
const PLAYER_FALLBACK = { hackm: 'purger', nomadm: 'vampire', corpom: 'suit', hackf: 'civilian', nomadf: 'witch', corpof: 'female' };
const DESIGNED = ['hackm', 'hackf', 'nomadm', 'nomadf', 'corpom', 'corpof'];
const NEON_OUTFIT = ['hackm', 'hackf'];
function playerGLBId() { let id = (PLAYER_MODELS[G.char.gender] || PLAYER_MODELS.m)[G.char.outfit]; if (!(CHARS[id] && CHARS[id].scene)) id = PLAYER_FALLBACK[id] || id; return CHARS[id] && CHARS[id].scene ? id : (G.char.gender === 'f' ? 'female' : 'male'); }
const neonMode = () => CHARS_READY && NEON_OUTFIT.includes(playerGLBId());
// long coats and robes are one garment: colour them top to bottom in the jacket colour
const MASK_COLS = [0xf4f8ff, 0xff1f3d, 0xf3e600, 0x3dff6a, 0x05d9e8, 0xb04dff];
const maskMode = () => CHARS_READY && playerGLBId() === 'purger'; // painted neon mask (Hacker man)
function playerCust() { const o = OUTFITS[G.char.outfit]; const long = ['vampire', 'witch'].includes(playerGLBId());
  if (CHARS_READY && DESIGNED.includes(playerGLBId())) return { skin: SKINS[G.char.skin], hairCol: HAIR_COLS[G.char.hairCol], neon: MASK_COLS[G.char.hairCol] || MASK_COLS[4], top: o.top, bottom: o.bottom, accent: o.accent, mask: 3, k: 1 };
  if (CHARS_READY && playerGLBId() === 'witch') return { skin: SKINS[G.char.skin], hairCol: HAIR_COLS[G.char.hairCol], top: o.top, bottom: o.top, accent: o.accent, mask: 2 };
  if (maskMode()) return { skin: SKINS[G.char.skin], hairCol: MASK_COLS[G.char.hairCol] || MASK_COLS[0], top: o.top, bottom: long ? o.top : o.bottom, accent: o.accent, mask: true }; return { skin: SKINS[G.char.skin], hairCol: HAIR_COLS[G.char.hairCol], top: o.top, bottom: long ? o.top : o.bottom, accent: o.accent, mask: playerGLBId() === 'purger' }; }
function tintGLB(R, hex, intensity) {
  for (const o of R.meshes) { const m = o.material; if (!m.emissive) continue; m.emissive.set(hex); m.emissiveIntensity = intensity; if (!m.emissiveMap && m.map) m.emissiveMap = m.map; m.needsUpdate = true; }
}
// world-sized attachment on a bone
function attachToBone(bone, obj, rx, ry, rz) {
  const g = new T.Group(); bone.add(g); g.add(obj);
  bone.updateWorldMatrix(true, false); const s = new T.Vector3(); bone.getWorldScale(s); g.scale.setScalar(1 / (s.x || 1));
  g.rotation.set(rx || 0, ry || 0, rz || 0); return g;
}
