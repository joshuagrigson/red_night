import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const [src, dst] = process.argv.slice(2); const doc = await io.read(src);
doc.getRoot().listAnimations().forEach(a => a.dispose());
for (const a of doc.getRoot().listAccessors()) if (!a.listParents().some(p => p.propertyType !== 'Root')) a.dispose();
let joints = new Set(); for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const j = p.getAttribute('JOINTS_0'); if (j) { const e = []; for (let i = 0; i < j.getCount(); i++) { j.getElement(i, e); e.forEach(v => joints.add(v)); } } }
await io.write(dst, doc); console.log(dst, 'joints used', joints.size);
