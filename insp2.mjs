import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
for (const f of process.argv.slice(2)) { const d = await io.read(f);
  for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const j=p.getAttribute('JOINTS_0'), w=p.getAttribute('WEIGHTS_0'); console.log(f, 'J', j.getComponentType(), j.getType(), j.getCount(), 'W', w.getComponentType(), w.getNormalized(), 'J1', !!p.getAttribute('JOINTS_1')); } }
