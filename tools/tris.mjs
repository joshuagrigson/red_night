import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f); let tris = 0, prims = 0; const mats = new Set();
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { prims++; mats.add(p.getMaterial()); const idx = p.getIndices(); tris += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
  const tex = doc.getRoot().listTextures().map(t => (t.getImage()?.byteLength / 1024 | 0) + 'k');
  console.log(f.split('/').pop(), 'tris', tris | 0, 'prims', prims, 'mats', mats.size, 'tex', tex.join(','));
}
