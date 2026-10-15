/* =====================================================================
   RED NIGHT — Tripo hero landmarks (one per district + Tower Bridge).
   Unit-normalized GLBs (front = +Z, base at y=0); procedural versions stay as fallback.
   ===================================================================== */
const LMS = {
  cairo: { url: 'assets/lm_cairo.glb', glow: [0xf3a600, 0x05d9e8] },
  capitol: { url: 'assets/lm_capitol.glb', glow: [0x9fe8ff, 0xff1f3d] },
  tex: { url: 'assets/lm_tex.glb', glow: [0xff2a6d, 0xf3e600] },
  salem: { url: 'assets/lm_salem.glb', glow: [0x3dff6a, 0xb04dff] },
  bridge: { url: 'assets/lm_bridge.glb', glow: [0xf3e600, 0xff2a6d] },
};
function loadLandmarks() {
  if (!T.GLTFLoader) return Promise.resolve();
  const loader = new T.GLTFLoader(); if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
  const jobs = Object.keys(LMS).map(id => parseGLBText(loader, LMS[id].url).then(gl => {
    const sc = gl.scene; sc.updateMatrixWorld(true);
    sc.traverse(o => { if (o.isMesh) { o.frustumCulled = true; const m = o.material; if (m) { m.envMapIntensity = .5; m.side = T.FrontSide; if (m.color) m.color.multiplyScalar(.82); if (m.map && !m.emissiveMap) { m.emissive = new T.Color(1, 1, 1); m.emissiveMap = m.map; m.emissiveIntensity = .06; } } } });
    LMS[id].scene = sc;
  }).catch(() => { }));
  return Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 25000))]);
}
// place a landmark: s = metres per model unit, ry = facing, y = vertical offset. Returns false if not loaded.
function placeLM(id, x, z, s, ry, y) {
  const L = LMS[id]; if (!L || !L.scene) return false;
  const m = L.scene; m.scale.setScalar(s); m.position.set(x, y || 0, z); m.rotation.y = ry || 0; scene.add(m);
  m.updateMatrixWorld(true);
  // collision: core footprint (inset so steps/fences stay walkable), and a light wash so the model reads at night
  const box = new T.Box3(); const bb = { cairo: [.6, .9, .55], capitol: [.84, .8, .6], tex: [.84, .82, .7], salem: [.8, .76, .75], bridge: [0, 0, 0] }[id];
  const hw = .5 * s * bb[0], hd = .5 * s * bb[1];
  if (id === 'bridge') { for (const sx of [-1, 1]) addBox(x + sx * s * .41 - 1.6, x + sx * s * .41 + 1.6, z - 2.2, z + 2.2, s * .58).surf = 'metal'; }
  else { const c = Math.abs(Math.cos(ry || 0)) > .5; addBox(x - (c ? hw : hd), x + (c ? hw : hd), z - (c ? hd : hw), z + (c ? hd : hw), s * bb[2]).surf = id === 'tex' ? 'brick' : 'stone'; }
  const f = new T.Vector3(Math.sin(ry || 0), 0, Math.cos(ry || 0));
  addLS(x + f.x * s * .62, s * .25, z + f.z * s * .62, L.glow[0], 3.4, s * 1.1);
  addLS(x - f.x * s * .3, s * .7, z - f.z * s * .3, L.glow[1], 2.4, s * .9);
  return true;
}
