// Build animation-only GLB packs from the Quaternius UAL (CC0): clips pre-retargeted onto the game's library skeleton
// (optc/anims.glb, the 'female' Tripo rig, mixamorig:* names), so chars.js can merge them into ANIMLIB.raw and bake them
// onto every character with its existing code. No meshes, no textures; the skin is kept so three r128 marks the joints as Bones.
// usage: node build_pack_pro.mjs  (ual1 = UAL1 PRO glb)  was: node build_pack.mjs <UAL1.glb> <UAL2.glb> <anims.glb (original)> <anims_notex.glb> <outdir>
import { createRequire } from 'module';
import { NodeIO, Document, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { resample, prune, dedup } from '@gltf-transform/functions';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { T, loadGLB, skel, bakeClip, ualKey, gameKey } = require('./bake.cjs');

const [, , ual1, ual2, animsOrig, animsNotex, outdir] = process.argv;
const PACKS = {
  // being shot, going down, dying, getting up (UAL1 here is the PRO file: 120 clips, same rig as Standard)
  hits: [
    [ual1, 'Hit_Chest'], [ual1, 'Hit_Chest', 'Hit_Chest_M'], [ual1, 'Hit_Head'], [ual1, 'Hit_Head', 'Hit_Head_M'],
    [ual1, 'Hit_Shoulder_L'], [ual1, 'Hit_Shoulder_R'], [ual1, 'Hit_Stomach'], [ual1, 'Hit_Stomach', 'Hit_Stomach_M'],
    [ual2, 'Idle_Shield_Break', 'Stagger_Back'], [ual2, 'Hit_Knockback'], [ual2, 'LayToIdle', 'GetUp_Back'],
    [ual1, 'Death01'], [ual1, 'Death01', 'Death01_M'], [ual1, 'Death02'], [ual1, 'Death02', 'Death02_M'],
    [ual2, 'Zombie_Walk_Fwd_Loop', 'Limp_R_Loop'], [ual2, 'Zombie_Walk_Fwd_Loop', 'Limp_L_Loop'], [ual1, 'Idle_Tired_Loop'],
  ],
  // the wounded 'long death' and the downed state: drop, crawl, lie and fire, get back up
  wounded: [
    [ual1, 'Crawl_Enter'], [ual1, 'Crawl_Idle_Loop'], [ual1, 'Crawl_Fwd_Loop'], [ual1, 'Crawl_Bwd_Loop'],
    [ual1, 'Crawl_Left_Loop'], [ual1, 'Crawl_Right_Loop'], [ual1, 'Crawl_Exit'],
  ],
  // fighting on the move: cover, strafing, evasion, pistols, grenades
  moves: [
    [ual1, 'Crouch_Enter'], [ual1, 'Crouch_Exit'], [ual1, 'Crouch_Idle_Loop'], [ual1, 'Crouch_Fwd_Loop'], [ual1, 'Crouch_Bwd_Loop'],
    [ual1, 'Crouch_Left_Loop'], [ual1, 'Crouch_Right_Loop'], [ual1, 'Jog_Left_Loop'], [ual1, 'Jog_Right_Loop'], [ual1, 'Jog_Bwd_Loop'],
    [ual1, 'Dodge_Left'], [ual1, 'Dodge_Right'], [ual1, 'Roll'], [ual2, 'OverhandThrow'],
    [ual1, 'Pistol_Idle_Loop'], [ual1, 'Pistol_Shoot'], [ual1, 'Pistol_Reload'], [ual1, 'Pistol_Aim_Up'], [ual1, 'Pistol_Aim_Neutral'], [ual1, 'Pistol_Aim_Down'],
    [ual1, 'Idle_LookAround_Loop'], [ual1, 'Turn90_L'], [ual1, 'Turn90_R'],
  ],
};
const sanitize = n => T.PropertyBinding.sanitizeNodeName(n);

await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

// three-side: source skeletons and the target (library) skeleton
const tgtGL = await loadGLB(animsNotex); const TG = skel(tgtGL, gameKey);
const srcCache = {};
async function src(file) { if (!srcCache[file]) { const g = await loadGLB(file); srcCache[file] = { g, S: skel(g, ualKey) }; } return srcCache[file]; }

for (const [pack, list] of Object.entries(PACKS)) {
  // gltf-transform side: a fresh document holding only the library skeleton (rest TRS copied from anims.glb)
  const lib = await io.read(animsOrig);
  const doc = new Document(); const buf = doc.createBuffer();
  const libSkin = lib.getRoot().listSkins()[0]; const libJoints = libSkin.listJoints();
  const map = new Map();
  const copyNode = n => { const m = doc.createNode(n.getName()).setTranslation(n.getTranslation()).setRotation(n.getRotation()).setScale(n.getScale()); map.set(n, m); for (const c of n.listChildren()) if (libJoints.includes(c) || c.listChildren().length) m.addChild(copyNode(c)); return m; };
  const libRoot = lib.getRoot().listScenes()[0].listChildren().find(n => n.getName() === 'Armature');
  const arm = copyNode(libRoot); doc.createScene('Scene').addChild(arm);
  const skin = doc.createSkin('Armature'); for (const j of libJoints) skin.addJoint(map.get(j));
  // inverse bind matrices from the source skin keep the file valid for viewers/validators; three ignores them here (no mesh)
  const ibm = libSkin.getInverseBindMatrices(); if (ibm) skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm.getArray().slice()).setBuffer(buf));
  const bySan = new Map(); for (const [orig, mine] of map) bySan.set(sanitize(orig.getName()), mine);
  const meta = [];
  for (const [file, name, outName] of list) {
    const { g, S } = await src(file); const clip = g.animations.find(a => a.name === name); if (!clip) throw new Error('missing clip ' + name);
    const mirror = /_M$|^Limp_L/.test(outName || '');
    // the Zombie walk drags the RIGHT leg; mirrored, it drags the left
    const baked = bakeClip(S, TG, clip, { fix: true, loopOnce: true, mirror });
    const anim = doc.createAnimation(outName || name);
    const times = baked.tracks[0].times; const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(times)).setBuffer(buf);
    for (const tr of baked.tracks) {
      const dot = tr.name.lastIndexOf('.'), node = bySan.get(tr.name.slice(0, dot)), prop = tr.name.slice(dot + 1);
      if (!node) throw new Error('no node for ' + tr.name);
      const path = prop === 'quaternion' ? 'rotation' : 'translation';
      const out = doc.createAccessor().setType(path === 'rotation' ? 'VEC4' : 'VEC3').setArray(new Float32Array(tr.values)).setBuffer(buf);
      const smp = doc.createAnimationSampler().setInput(input).setOutput(out).setInterpolation('LINEAR');
      anim.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(smp));
    }
    meta.push({ name: outName || name, from: (file === ual1 ? 'UAL1' : 'UAL2') + ':' + name, mirror, dur: +clip.duration.toFixed(3), frames: times.length });
  }
  doc.getRoot().getAsset().generator = 'red-night combat-research build_pack.mjs (glTF-Transform v4)';
  doc.getRoot().getAsset().extras = { license: 'CC0 1.0 (Quaternius Universal Animation Library 1 Pro + 2 Standard), retargeted to the Red Night Tripo library skeleton', clips: meta };
  await doc.transform(resample({ tolerance: 1e-4 }), dedup(), prune({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.ANIMATION_SAMPLER], keepLeaves: true }));
  const raw = `${outdir}/ual_${pack}_raw.glb`; await io.write(raw, doc);
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  const opt = `${outdir}/ual_${pack}.glb`; await io.write(opt, doc);
  fs.writeFileSync(opt + '.txt', fs.readFileSync(opt).toString('base64'));
  console.log(pack, 'clips', meta.length, 'raw', fs.statSync(raw).size, 'meshopt', fs.statSync(opt).size, 'b64', fs.statSync(opt + '.txt').size);
  // lite: no finger channels (fingers then hold the character's rest pose; half the keys)
  for (const a of doc.getRoot().listAnimations()) for (const c of a.listChannels()) if (/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(c.getTargetNode().getName())) { const smp = c.getSampler(); c.dispose(); smp.dispose(); }
  await doc.transform(prune({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.ANIMATION_SAMPLER], keepLeaves: true }));
  const lite = `${outdir}/ual_${pack}_lite.glb`; await io.write(lite, doc);
  fs.writeFileSync(lite + '.txt', fs.readFileSync(lite).toString('base64'));
  console.log(pack, 'lite meshopt', fs.statSync(lite).size, 'b64', fs.statSync(lite + '.txt').size);
  fs.writeFileSync(`${outdir}/ual_${pack}.clips.json`, JSON.stringify(meta, null, 1));
}
