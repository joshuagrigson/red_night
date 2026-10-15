import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/core';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const out = {};
for (const [id, f] of Object.entries(JSON.parse(process.argv[2]))) {
  const d = await io.read(f); const sc = d.getRoot().listScenes()[0];
  const b = getBounds(sc); out[id] = { minY: +b.min[1].toFixed(4), h: +(b.max[1] - b.min[1]).toFixed(4), w: +(b.max[0]-b.min[0]).toFixed(3), d: +(b.max[2]-b.min[2]).toFixed(3) };
}
console.log(JSON.stringify(out));
