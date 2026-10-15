// Load three r128 (the game's exact version) plus its examples/js GLTFLoader, SkeletonUtils and meshopt decoder in Node.
const fs = require('fs'), path = require('path'), vm = require('vm');
const base = path.join(__dirname, 'node_modules/three');
globalThis.THREE = require(path.join(base, 'build/three.js'));
for (const f of ['examples/js/loaders/GLTFLoader.js', 'examples/js/utils/SkeletonUtils.js', 'examples/js/libs/meshopt_decoder.js'])
  vm.runInThisContext(fs.readFileSync(path.join(base, f), 'utf8'), { filename: f });
const T = globalThis.THREE;
function loadGLB(file) {
  const buf = fs.readFileSync(file); const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new T.GLTFLoader(); if (globalThis.MeshoptDecoder) loader.setMeshoptDecoder(globalThis.MeshoptDecoder);
  return new Promise((res, rej) => loader.parse(ab, '', res, rej));
}
module.exports = { T, loadGLB };
