// Separate hands fused to the hips in single-surface Tripo characters (generated in an A-pose with the hands resting on the
// thighs, the skin of hand and thigh became one surface, and auto-rigging smeared weights across the join). In the contact
// zone each vertex is assigned to the surface its normal faces away from: the hand/forearm or the hip/thigh. Weights from
// the other side are removed (a vertex left with none borrows its nearest same-side neighbour's), and the triangles that
// still join the two sides are deleted, so raising the arm no longer drags a strip of belt with it.
// usage: node tools/handcut.cjs <in.glb> <out.glb> [--dry]   (v23: drifter, drifter_lo, cop had fused hands; every tr2 body had
// arm weight in the hair). Run on the optc/ file, then look at it posed (aim, run, die) in the game before shipping
const fs = require('fs'), path = require('path'), vm = require('vm'), { createRequire } = require('module');
const r = createRequire(path.join(__dirname, '..', 'package.json'));
const base = path.join(__dirname, '..', 'node_modules', 'three');
globalThis.THREE = require(path.join(base, 'build/three.js'));
for (const f of ['examples/js/loaders/GLTFLoader.js', 'examples/js/libs/meshopt_decoder.js']) vm.runInThisContext(fs.readFileSync(path.join(base, f), 'utf8'), { filename: f });
const T = globalThis.THREE;
// Node has no image decoder: drop textures from the GLB's JSON before three parses it (geometry and skin are all we need)
function noTex(buf) {
  const jl = buf.readUInt32LE(12), json = JSON.parse(buf.slice(20, 20 + jl).toString('utf8'));
  delete json.textures; delete json.images; delete json.samplers;
  const strip = o => { if (!o || typeof o !== 'object') return; for (const k of Object.keys(o)) { if (/Texture$/.test(k)) delete o[k]; else strip(o[k]); } };
  for (const m of json.materials || []) strip(m);
  if (json.extensionsUsed) json.extensionsUsed = json.extensionsUsed.filter(e => !/texture/i.test(e));
  if (json.extensionsRequired) json.extensionsRequired = json.extensionsRequired.filter(e => !/texture/i.test(e));
  let js = Buffer.from(JSON.stringify(json), 'utf8'); const pad = (4 - js.length % 4) % 4; js = Buffer.concat([js, Buffer.alloc(pad, 0x20)]);
  const rest = buf.slice(20 + jl), head = Buffer.alloc(20); head.write('glTF', 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(20 + js.length + rest.length, 8); head.writeUInt32LE(js.length, 12); head.write('JSON', 16);
  return Buffer.concat([head, js, rest]);
}
const { NodeIO } = r('@gltf-transform/core');
const { ALL_EXTENSIONS } = r('@gltf-transform/extensions');
const { MeshoptDecoder, MeshoptEncoder } = r('meshoptimizer');
const args = process.argv.slice(2), DRY = args.includes('--dry'), [inPath, outPath] = args.filter(a => !a.startsWith('--'));
const ARM = s => new RegExp('^' + s + '_(Forearm|ForearmTwist0\\d|Hand)$'), BODY = s => new RegExp('^(Hip|Pelvis|Waist|Spine01|' + s + '_(Thigh|ThighTwist0\\d))$');

(async () => {
  await globalThis.MeshoptDecoder.ready; await MeshoptDecoder.ready; await MeshoptEncoder.ready;
  const buf = noTex(fs.readFileSync(inPath)), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gl = await new Promise((res, rej) => { const L = new T.GLTFLoader(); L.setMeshoptDecoder(globalThis.MeshoptDecoder); L.parse(ab, '', res, rej); });
  let mesh = null; gl.scene.traverse(o => { if (o.isSkinnedMesh && !mesh) mesh = o; }); gl.scene.updateMatrixWorld(true);
  const g = mesh.geometry, pa = g.attributes.position, na = g.attributes.normal, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, n = pa.count;
  const bones = mesh.skeleton.bones, inv = mesh.skeleton.boneInverses, names = bones.map(b => b.name);
  const g4 = (A, i, c) => c === 0 ? A.getX(i) : c === 1 ? A.getY(i) : c === 2 ? A.getZ(i) : A.getW(i);
  const kP = pa.normalized ? 32767 : 1, kN = na && na.normalized ? (na.array instanceof Int8Array ? 127 : 32767) : 1, kW = sw.normalized ? (sw.array instanceof Uint8Array ? 255 : 65535) : 1;
  const D = new T.Matrix4().multiplyMatrices(bones[0].matrixWorld, inv[0]), Nm = new T.Matrix3().getNormalMatrix(D);
  const P = [], N = [], v = new T.Vector3();
  for (let i = 0; i < n; i++) { P.push(new T.Vector3(pa.getX(i) / kP, pa.getY(i) / kP, pa.getZ(i) / kP).applyMatrix4(D)); N.push(na ? new T.Vector3(na.getX(i) / kN, na.getY(i) / kN, na.getZ(i) / kN).applyMatrix3(Nm).normalize() : new T.Vector3()); }
  const J = new Int32Array(n * 4), W = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < 4; c++) { J[i * 4 + c] = g4(si, i, c); W[i * 4 + c] = g4(sw, i, c) / kW; s += W[i * 4 + c]; } if (s > 0) for (let c = 0; c < 4; c++) W[i * 4 + c] /= s; }
  const bpos = nm => { const b = bones[names.indexOf(nm)]; return b ? new T.Vector3().setFromMatrixPosition(b.matrixWorld) : null; };
  const closest = (p, a, b, out) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return out.copy(a).addScaledVector(ab, t); };
  // adjacency (welded by position, so UV seams don't hide neighbours)
  const idx = Array.from(g.index.array), canon = new Int32Array(n), seen = new Map();
  for (let i = 0; i < n; i++) { const k = pa.getX(i) + ',' + pa.getY(i) + ',' + pa.getZ(i); if (!seen.has(k)) seen.set(k, i); canon[i] = seen.get(k); }
  const adj = Array.from({ length: n }, () => new Set()); for (let t = 0; t < idx.length; t += 3) for (const [a, b] of [[idx[t], idx[t + 1]], [idx[t + 1], idx[t + 2]], [idx[t + 2], idx[t]]]) { adj[a].add(b); adj[b].add(a); }
  for (let i = 0; i < n; i++) if (canon[i] !== i) { for (const x of adj[i]) adj[canon[i]].add(x); }
  const cls = new Int8Array(n); // 0 untouched, 1 arm surface, 2 body surface
  const report = {};
  for (const S of ['L', 'R']) {
    const elbow = bpos(S + '_Forearm'), wrist = bpos(S + '_Hand'), hipJ = bpos(S + '_Thigh'), knee = bpos(S + '_Calf'), pelvis = bpos('Hip'), sp1 = bpos('Spine01');
    if (!elbow || !wrist || !hipJ || !knee) continue;
    const handEnd = wrist.clone().addScaledVector(wrist.clone().sub(elbow).normalize(), .065);
    const isArm = ARM(S), isBody = BODY(S), q1 = new T.Vector3(), q2 = new T.Vector3(), q3 = new T.Vector3();
    let zone = 0, toArm = 0, toBody = 0;
    for (let i = 0; i < n; i++) {
      let aw = 0, bw = 0; for (let c = 0; c < 4; c++) { const nm = names[J[i * 4 + c]], w = W[i * 4 + c]; if (isArm.test(nm)) aw += w; else if (isBody.test(nm)) bw += w; }
      if (aw <= 0 && bw <= 0) continue;
      const p = P[i], dA = Math.min(p.distanceTo(closest(p, elbow, wrist, q1)), p.distanceTo(closest(p, wrist, handEnd, q2)));
      const qa = p.distanceTo(q1) < p.distanceTo(q2) ? q1 : q2;
      const qb = closest(p, hipJ, knee, q3), qb2 = closest(p, pelvis, sp1, new T.Vector3()); const qB = p.distanceTo(qb) < p.distanceTo(qb2) ? qb : qb2, dB = p.distanceTo(qB);
      if (cls[i]) continue; // settled by the other side
      const dom = aw > .5 ? 1 : bw > .5 ? 2 : 0;
      if (dom && ((dom === 1 && dB < .085) || (dom === 2 && dA < .05))) {
        // contact zone. The palm faces the thigh (normal away from the hand axis, toward the thigh's); the thigh under the hand
        // faces it back (away from the thigh axis, toward the hand's); the back of the hand faces away from both, so it stays
        // with its dominant bone. Only a vertex that clearly faces the wrong way changes side
        zone++;
        const sa = N[i].dot(p.clone().sub(qa).normalize()), sb = N[i].dot(p.clone().sub(qB).normalize());
        if (dom === 1) { cls[i] = sb > .3 && sa < 0 ? 2 : 1; if (cls[i] === 2) toBody++; }
        else { cls[i] = sa > .3 && sb < 0 ? 1 : 2; if (cls[i] === 1) toArm++; }
      } else cls[i] = dom;
      if (cls[i] === 0) continue;
      // strip the other side's weight
      let rest = 0; for (let c = 0; c < 4; c++) { const nm = names[J[i * 4 + c]]; if ((cls[i] === 1 && isBody.test(nm)) || (cls[i] === 2 && isArm.test(nm))) W[i * 4 + c] = 0; rest += W[i * 4 + c]; }
      if (rest > 0) for (let c = 0; c < 4; c++) W[i * 4 + c] /= rest; else W[i * 4] = -1; // orphan: filled below
    }
    report[S] = { zone, toArm, toBody };
  }
  // the head column: hair, glasses and the back of the collar above the head bone take no arm weight (the T-pose rigs smeared
  // upper-arm twist and even hand weight into the hair, which flew off in spikes when the arms came up to aim)
  const head = bpos('Head'); let headStrip = 0;
  if (head) for (let i = 0; i < n; i++) {
    const p = P[i]; if (p.y < head.y - .005 || Math.abs(p.x - head.x) > .11 || Math.abs(p.z - head.z) > .13 || W[i * 4] < 0) continue;
    let hit = false, rest = 0; for (let c = 0; c < 4; c++) { if (W[i * 4 + c] > 0 && /^(L|R)_(Upperarm|Forearm|Hand)/.test(names[J[i * 4 + c]])) { W[i * 4 + c] = 0; hit = true; } rest += W[i * 4 + c]; }
    if (!hit) continue; headStrip++; cls[i] = 3;
    if (rest > 0) for (let c = 0; c < 4; c++) W[i * 4 + c] /= rest; else W[i * 4] = -1;
  }
  report.head = headStrip;
  // orphans borrow the nearest same-class neighbour's weights (breadth-first)
  let orphans = 0;
  for (let i = 0; i < n; i++) if (W[i * 4] < 0) {
    orphans++; const want = cls[i], seenB = new Set([i]); let q = [i], src = -1;
    while (q.length && src < 0) { const nq = []; for (const x of q) for (const y of adj[canon[x]]) { if (seenB.has(y)) continue; seenB.add(y); if (cls[y] === want && W[y * 4] >= 0) { src = y; break; } nq.push(y); } q = nq; if (seenB.size > 5000) break; }
    if (src >= 0) for (let c = 0; c < 4; c++) { J[i * 4 + c] = J[src * 4 + c]; W[i * 4 + c] = W[src * 4 + c]; } else { W[i * 4] = 1; W[i * 4 + 1] = W[i * 4 + 2] = W[i * 4 + 3] = 0; }
  }
  // duplicates of one position (UV seams) share the canonical vertex's class and weights, or the seam opens when skinned
  for (let i = 0; i < n; i++) if (canon[i] !== i) { const c0 = canon[i]; cls[i] = cls[c0]; for (let c = 0; c < 4; c++) { J[i * 4 + c] = J[c0 * 4 + c]; W[i * 4 + c] = W[c0 * 4 + c]; } }
  // cut: drop triangles that still join arm skin to hip/thigh skin
  const keep = []; let cut = 0;
  for (let t = 0; t < idx.length; t += 3) { const s = [cls[idx[t]], cls[idx[t + 1]], cls[idx[t + 2]]]; if (s.includes(1) && s.includes(2)) { cut++; continue; } keep.push(idx[t], idx[t + 1], idx[t + 2]); }
  console.log(JSON.stringify({ file: path.basename(inPath), report, orphans, cutTris: cut, trisLeft: keep.length / 3 }));
  if (DRY) return;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  const doc = await io.read(inPath), prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const JA = prim.getAttribute('JOINTS_0'), WA = prim.getAttribute('WEIGHTS_0'), ja = JA.getArray(), wa = WA.getArray(), WM = WA.getNormalized() ? (wa instanceof Uint8Array ? 255 : 65535) : 1;
  if (JA.getCount() !== n) throw new Error('vertex count mismatch');
  for (let i = 0; i < n; i++) { let sum = 0, big = 0; for (let c = 0; c < 4; c++) { ja[i * 4 + c] = J[i * 4 + c]; wa[i * 4 + c] = WM === 1 ? W[i * 4 + c] : Math.round(W[i * 4 + c] * WM); sum += wa[i * 4 + c]; if (wa[i * 4 + c] > wa[i * 4 + big]) big = c; } if (WM !== 1) wa[i * 4 + big] += WM - sum; }
  JA.setArray(ja); WA.setArray(wa);
  const IA = prim.getIndices(), Ctor = IA.getArray().constructor; IA.setArray(new Ctor(keep));
  await io.write(outPath, doc);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
