// End-to-end check of the packs with the game's own loaders (three r128 GLTFLoader + r128 meshopt_decoder.js):
// 1) the file parses, joints come in as THREE.Bone, clip names/durations; 2) meshopt decode error vs the raw pack;
// 3) the game's UNCHANGED bake (library skeleton -> male / purger) on the pack clips, versus the original UAL clip pose.
const { T, loadGLB, skel, bakeClip, sample, compare, ualKey, gameKey } = require('./bake.cjs');
const [, , packOpt, packRaw, animsNotex, maleNotex, purgerNotex, ual1, ual2] = process.argv;
const times = d => { const n = Math.max(2, Math.ceil(d * 30) + 1); return Array.from({ length: n }, (_, f) => Math.min(d, f / 30)); };
(async () => {
  const P = await loadGLB(packOpt), PR = await loadGLB(packRaw);
  let bones = 0, objs = 0; P.scene.traverse(o => { if (o.isBone) bones++; else objs++; });
  console.log('parsed', packOpt.split('/').pop(), 'bones', bones, 'other objects', objs, 'clips', P.animations.map(a => a.name + ':' + a.duration.toFixed(2) + 's/' + a.tracks.length + 'tr').join(' '));
  // decode error: max angle between quaternion samples of the meshopt pack and the raw pack
  let maxAng = 0, maxPos = 0;
  for (const a of P.animations) { const b = PR.animations.find(x => x.name === a.name); for (const tr of a.tracks) { const tb = b.tracks.find(x => x.name === tr.name); if (!tb) continue;
    const ia = tr.createInterpolant(), ib = tb.createInterpolant();
    for (let t = 0; t <= a.duration; t += 1 / 60) { const va = ia.evaluate(t).slice(), vb = ib.evaluate(t).slice();
      if (tr.ValueTypeName === 'quaternion') { const qa = new T.Quaternion().fromArray(va).normalize(), qb = new T.Quaternion().fromArray(vb).normalize(); maxAng = Math.max(maxAng, qa.angleTo(qb) * 57.3); }
      else maxPos = Math.max(maxPos, Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2])); } } }
  console.log('meshopt decode error vs raw: max quaternion', maxAng.toFixed(3), 'deg, max hips position', maxPos.toFixed(5), 'units (library units, ~1 = body height)');
  const F = await loadGLB(animsNotex); const SF = skel(F, gameKey);
  const U = { UAL1: await loadGLB(ual1), UAL2: await loadGLB(ual2) }; const SU = { UAL1: skel(U.UAL1, ualKey), UAL2: skel(U.UAL2, ualKey) };
  const meta = P.parser.json.asset.extras.clips;
  for (const [id, file] of [['male', maleNotex], ['purger', purgerNotex]]) {
    const TG = skel(await loadGLB(file), gameKey);
    for (const clip of P.animations) {
      const m = meta.find(x => x.name === clip.name); const [lib, orig] = m.from.split(':');
      const ts = times(clip.duration);
      const srcClip = U[lib].animations.find(a => a.name === orig);
      let A = sample(SU[lib], srcClip, ts);
      if (m.mirror) A = A.map(fr => { const o = {}; for (const k in fr) { const mk = k.replace(/^left/, '#').replace(/^right/, 'left').replace(/^#/, 'right'); o[mk] = fr[k].clone(); o[mk].x = -o[mk].x; } return o; });
      const gameBake = bakeClip(SF, TG, clip, {}); // v21 code path, as-is
      const fixedBake = bakeClip(SF, TG, clip, { loopOnce: true }); // v21 code + the one-line LoopOnce fix
      const B1 = sample(TG, gameBake, ts), B2 = sample(TG, fixedBake, ts);
      const c1 = compare(A, B1), c2 = compare(A, B2);
      const endHips = fr => +(fr.hips.y / TG.hipsWorldY).toFixed(3);
      console.log(`${id.padEnd(6)} ${clip.name.padEnd(17)} v21-bake mean ${String(c1.mean).padStart(4)} max ${String(c1.max).padStart(5)} | +LoopOnce mean ${String(c2.mean).padStart(4)} max ${String(c2.max).padStart(5)} | hips end: src ${(A[A.length - 1].hips.y / SU[lib].hipsWorldY).toFixed(3)} v21 ${endHips(B1[B1.length - 1])} fixed ${endHips(B2[B2.length - 1])}${m.mirror ? '  (mirrored: compared against the mirror image of the source)' : ''}`);
    }
  }
})().catch(e => { console.error('ERR', e && e.stack || e); process.exit(1); });
