import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) { const d = await io.read(f);
  const p=d.getRoot().listMeshes()[0].listPrimitives()[0]; const j=p.getAttribute('JOINTS_0').getArray(), w=p.getAttribute('WEIGHTS_0').getArray();
  const set=new Set(j); let nz=0; for(const v of j) if(v) nz++; console.log(f, 'unique joints', set.size, 'nonzero', nz, '/', j.length, 'w0', Array.from(w.slice(0,8))); }
