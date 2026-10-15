// Write an uncompressed, texture-free copy of a GLB (so three r128 can parse it in Node without a DOM).
// usage: node notex.mjs in.glb out.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { prune } from '@gltf-transform/functions';

const [, , inp, out] = process.argv;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
for (const t of doc.getRoot().listTextures()) t.dispose();
for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt|webp|quantization|basisu|ktx/i.test(e.extensionName)) e.dispose();
await doc.transform(prune({ keepLeaves: true, keepAttributes: true }));
await io.write(out, doc);
console.log('wrote', out);
