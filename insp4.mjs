import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) { const d = await io.read(f); const r=d.getRoot();
  for (const m of r.listMeshes()) for (const p of m.listPrimitives()) { const names=p.listSemantics(); const j=p.getAttribute('JOINTS_0'); if(!j){console.log(f,'no joints',names);continue;} const a=j.getArray(); const set=new Set(a); let nz=0; for(const v of a) if(v) nz++; console.log(f.split('/').pop(), m.getName(), names.join(','), 'uniq', set.size, 'nz', nz, '/', a.length, j.getComponentType()); }
  console.log(' nodes', r.listNodes().length, 'skins', r.listSkins().map(s=>s.listJoints().length));
}
