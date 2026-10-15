import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f); const r = doc.getRoot();
  const anims = r.listAnimations().map(a => a.getName() + ':' + a.listChannels().length);
  const skins = r.listSkins().map(s => s.listJoints().length);
  let tris = 0; for (const m of r.listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(); tris += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
  const joints = r.listSkins()[0]?.listJoints().slice(0, 6).map(j => j.getName());
  const tex = r.listTextures().map(t => t.getImage()?.length);
  console.log(f.split('/').pop(), 'tris', tris, 'skins', skins, 'joints', joints, 'anims', anims.length, anims.slice(0, 12).join(','), 'tex', tex.length, tex.reduce((a, b) => a + b, 0));
}
