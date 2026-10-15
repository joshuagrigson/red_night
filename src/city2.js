/* =====================================================================
   RED NIGHT — city realism pass.
   - Photo-scanned CC0 facades (ambientCG) with lit offices at night on normal buildings
   - Five realistic skyscraper designs, used only for skyscrapers
   - Scanned CC0 street props (Poly Haven), mailboxes, parks with grass and rocks
   - Everything streams by distance so phones only draw what is near the player
   ===================================================================== */
const FLOOR_H = 3.6;
// floors per texture tile (counted on the source photos)
const FACDEF = { Facade001: 10, Facade005: 12, Facade006: 8, Facade009: 16, Facade010: 30, Facade017: 12, Facade018A: 6, Facade019A: 6, Facade020A: 6 };
const FAC = { tex: {}, mats: {}, ok: false };
function loadFacades() {
  const L = new T.TextureLoader(); const jobs = [];
  for (const id in FACDEF) for (const k of ['d', 'n', 'orm', 'e']) jobs.push(new Promise(res => L.load(`assets/fac/${id}_${k}.jpg`, t => {
    t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = G.quality === 'high' ? 8 : 4; if (k === 'd' || k === 'e') t.encoding = T.sRGBEncoding; FAC.tex[id + '_' + k] = t; res();
  }, undefined, () => res())));
  return Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 15000))]).then(() => { FAC.ok = Object.keys(FAC.tex).length >= 4 * Object.keys(FACDEF).length; });
}
// world-projected facade UVs; 'cyl' wraps around the instance centre; each instance gets its own offset so neighbours don't repeat
function facUV(mat, s, cyl) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uvS = { value: s };
    sh.vertexShader = 'uniform float uvS;\n' + sh.vertexShader.replace('#include <uv_vertex>', `
#ifdef USE_UV
  mat4 imU = mat4(1.0);
  #ifdef USE_INSTANCING
    imU = instanceMatrix;
  #endif
  vec4 wpU = modelMatrix * imU * vec4(position, 1.0);
  vec3 cU = (modelMatrix * imU * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 wnU = normalize(mat3(modelMatrix * imU) * normal);
  vec3 anU = abs(wnU);
  float hU = fract(sin(dot(floor(cU.xz), vec2(12.9898, 78.233))) * 43758.5453);
  ${cyl ? `vec2 dU = wpU.xz - cU.xz; float uU = atan(dU.y, dU.x) * length(dU);` : `float uU = anU.x > anU.z ? wpU.z : wpU.x;`}
  if (anU.y > 0.6) vUv = vec2(0.012, 0.47);
  else vUv = vec2(uU * uvS + hU * 7.0, wpU.y * uvS);
#endif`);
  };
  mat.customProgramCacheKey = () => 'fuv' + s.toFixed(4) + (cyl ? 'c' : '');
}
function facMat(id, cyl) {
  const key = id + (cyl ? 'c' : ''); if (FAC.mats[key]) return FAC.mats[key];
  const t = FAC.tex;
  const m = new T.MeshStandardMaterial({ map: t[id + '_d'], normalMap: t[id + '_n'], roughnessMap: t[id + '_orm'], metalnessMap: t[id + '_orm'], emissiveMap: t[id + '_e'], emissive: new T.Color(1, 1, 1), emissiveIntensity: 1.7, roughness: 1, metalness: 1, envMapIntensity: .85 });
  m.normalScale.set(.8, .8);
  facUV(m, 1 / (FACDEF[id] * FLOOR_H), cyl);
  return FAC.mats[key] = m;
}
// stable per-building pick that does not disturb the city's seeded RNG
const hpick = (arr, x, z) => arr[Math.floor(Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % arr.length)];
// normal buildings: which photo facade a style gets (stone/Cairo and wood/Salem keep their hand-made look)
function photoStyleFor(style, x0, z0, h) {
  if (!FAC.ok) return style;
  let pool = null;
  if (style === 'brick') pool = ['Facade018A', 'Facade020A', 'Facade018A'];
  else if (style === 'white') pool = ['Facade019A'];
  else if (style === 'glass') pool = h > 40 ? ['Facade006', 'Facade017', 'Facade001'] : ['Facade019A', 'Facade006', 'Facade020A'];
  if (!pool) return style;
  const id = hpick(pool, x0, z0), key = 'ph_' + id;
  if (!STYLES[key]) STYLES[key] = { mat: facMat(id), list: [] };
  return key;
}

/* ---------------- skyscrapers ---------------- */
const SKY = { parts: {}, trims: [], beacons: [] };
const SKYGEO = {};
function skyGeo(k) {
  if (SKYGEO[k]) return SKYGEO[k];
  let g;
  if (k === 'box') g = new T.BoxGeometry(1, 1, 1);
  else if (k === 'oct') { g = new T.CylinderGeometry(.5, .5, 1, 8, 1); g.rotateY(Math.PI / 8); }
  else if (k === 'taper') { g = new T.CylinderGeometry(.44, .5, 1, 8, 1); g.rotateY(Math.PI / 8); }
  else if (k === 'cyl') g = new T.CylinderGeometry(.5, .5, 1, 32, 1);
  else if (k === 'spire') g = new T.ConeGeometry(.5, 1, 8);
  return SKYGEO[k] = g;
}
function skyPush(geo, matId, x, y, z, sx, sy, sz, ry, solid) {
  const key = geo + '|' + matId; (SKY.parts[key] = SKY.parts[key] || []).push([x, y, z, sx, sy, sz, ry || 0]);
  if (solid !== false) { const r = Math.max(sx, sz) * (ry ? .62 : .5), rx = ry ? r : sx / 2, rz = ry ? r : sz / 2; const b = addBox(x - rx, x + rx, z - rz, z + rz, y + sy / 2, { y0: Math.max(0, y - sy / 2) }); b.surf = matId.startsWith('Facade0') ? 'glass' : 'concrete'; return b; }
}
function skyTrim(x, y, z, w, d, col) { SKY.trims.push([x, y, z, w, d, col]); }
// five designs. footprint x0..x1 / z0..z1, total height h
function skyscraper(x0, x1, z0, z1, h, d) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, dd = z1 - z0, r = Math.min(w, dd) / 2;
  const kind = hpick(['setback', 'octo', 'round', 'twist', 'deco'], cx, cz);
  const col = new T.Color(spick(DIST[d].cols));
  const podH = 2 * FLOOR_H + .6;
  // a stone/glass podium with real storefronts on every tower
  const pod = skyPush('box', 'Facade019A', cx, podH / 2, cz, w, podH, dd); FD_BOX = pod; facadeDetail('glass', x0, x1, z0, z1, podH, d);
  let top = podH;
  if (kind === 'setback') { // glass slab with two setbacks, crown fins and a mast
    const m = hpick(['Facade006', 'Facade001'], cx, cz);
    const h1 = h * .55, h2 = h * .8;
    skyPush('box', m, cx, podH + (h1 - podH) / 2, cz, w - 1, h1 - podH, dd - 1);
    skyPush('box', m, cx, h1 + (h2 - h1) / 2, cz, w - 5, h2 - h1, dd - 5);
    skyPush('box', m, cx, h2 + (h - h2) / 2, cz, w - 9, h - h2, dd - 9);
    skyTrim(cx, h1, cz, w - 1, dd - 1, col); skyTrim(cx, h2, cz, w - 5, dd - 5, col); skyTrim(cx, h, cz, w - 9, dd - 9, col);
    for (let k = -1; k <= 1; k += 2) skyPush('box', 'Facade019A', cx + k * (w - 9) * .35, h + 3, cz, .5, 6, dd - 9, 0, false);
    top = h; skyPush('box', 'Facade019A', cx, h + 1.6, cz, (w - 9) * .5, 3.2, (dd - 9) * .5);
    skyPush('box', 'Facade019A', cx, h + h * .06 + 3, cz, .45, h * .12, .45, 0, false); top = h + h * .12 + 3;
  } else if (kind === 'octo') { // tapering octagon to a needle
    const m = hpick(['Facade005', 'Facade001'], cx, cz); let rr = r * 2 - 1, y = podH; const seg = 6, sh = (h - podH) / seg;
    for (let k = 0; k < seg; k++) { skyPush('taper', m, cx, y + sh / 2, cz, rr, sh, rr); y += sh; if (k % 2 === 1) skyTrim(cx, y, cz, rr * .8, rr * .8, col); rr *= .88; }
    skyPush('spire', 'Facade019A', cx, y + h * .1, cz, rr * .5, h * .2, rr * .5, 0, false); top = y + h * .2;
  } else if (kind === 'round') { // glass cylinder with a lit crown ring
    const m = 'Facade001', rr = r * 2 - 1;
    skyPush('cyl', m + 'c', cx, podH + (h - podH) / 2, cz, rr, h - podH, rr);
    skyPush('cyl', 'Facade019A', cx, h + 1.5, cz, rr * .7, 3, rr * .7);
    SKY.rings.push([cx, h - 1.5, cz, rr * .5 + .1, col]); SKY.rings.push([cx, h * .5, cz, rr * .5 + .06, col]);
    top = h + 3;
  } else if (kind === 'twist') { // stacked floor plates turning 2.4 degrees per plate
    const m = hpick(['Facade006', 'Facade009'], cx, cz); const n = Math.max(6, Math.round((h - podH) / (FLOOR_H * 2))), sh = (h - podH) / n, s = Math.min(w, dd) * .78;
    for (let k = 0; k < n; k++) skyPush('box', m, cx, podH + sh * (k + .5), cz, s, sh + .02, s, k * .042, k === 0);
    addBox(cx - s * .55, cx + s * .55, cz - s * .55, cz + s * .55, h).surf = 'glass';
    skyTrim(cx, h, cz, s, s, col); top = h;
  } else { // art-deco stepped tower with piers, stepped crown and spire
    const m = hpick(['Facade017', 'Facade020A'], cx, cz); const steps = [[1, .5], [.82, .72], [.64, .86], [.46, .95], [.3, 1]];
    let y = podH;
    for (const [k, f] of steps) { const hh = h * f - y; skyPush('box', m, cx, y + hh / 2, cz, (w - 1) * k, hh, (dd - 1) * k); y = h * f; skyTrim(cx, y, cz, (w - 1) * k, (dd - 1) * k, col); }
    skyPush('spire', 'Facade019A', cx, h + h * .09, cz, 1.2, h * .18, 1.2, 0, false); top = h + h * .18;
  }
  SKY.beacons.push([cx, top + .4, cz]);
  addLS(cx, Math.min(top, 40), cz, col, 2.2, 40);
}
SKY.rings = [];
function buildSkyscrapers() {
  const mt = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(), Y = new T.Vector3(0, 1, 0);
  for (const key in SKY.parts) {
    const [geo, mid] = key.split('|'); const cyl = mid.endsWith('c'); const id = cyl ? mid.slice(0, -1) : mid;
    const L = SKY.parts[key]; const im = new T.InstancedMesh(skyGeo(geo), facMat(id, cyl), L.length);
    L.forEach((e, i) => { p.set(e[0], e[1], e[2]); s.set(e[3], e[4], e[5]); q.setFromAxisAngle(Y, e[6]); mt.compose(p, q, s); im.setMatrixAt(i, mt); });
    im.frustumCulled = false; scene.add(im);
  }
  // crown outlines (neon), rings, and blinking aircraft warning lights
  if (SKY.trims.length) {
    const g = skyGeo('box'); const im = new T.InstancedMesh(g, new T.MeshBasicMaterial({ toneMapped: false }), SKY.trims.length * 4); let n = 0;
    for (const [x, y, z, w, d, c] of SKY.trims) for (const [ox, oz, sx, sz] of [[0, -d / 2, w + .2, .16], [0, d / 2, w + .2, .16], [-w / 2, 0, .16, d], [w / 2, 0, .16, d]]) { p.set(x + ox, y - .1, z + oz); s.set(sx, .2, sz); q.identity(); mt.compose(p, q, s); im.setMatrixAt(n, mt); im.setColorAt(n, c.clone().multiplyScalar(1.8)); n++; }
    im.frustumCulled = false; scene.add(im);
  }
  for (const [x, y, z, r, c] of SKY.rings) { const m = new T.Mesh(new T.TorusGeometry(r, .14, 6, 48), NEON(c)); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); scene.add(m); }
  if (SKY.beacons.length) {
    const mat = new T.SpriteMaterial({ map: glowTex, color: 0xff1020, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
    const spr = SKY.beacons.map(([x, y, z]) => { const s2 = new T.Sprite(mat); s2.position.set(x, y, z); s2.scale.setScalar(3.2); s2.userData.dyn = 1; scene.add(s2); return s2; });
    UPD.push((dt, t) => { mat.opacity = Math.sin(t * 2.4) > .2 ? 1 : .08; });
  }
}

/* ---------------- scanned street props (Poly Haven CC0) ---------------- */
const PROPDEF = {
  fire_hydrant: { r: .22 }, metal_trash_can: { r: .32 }, utility_box_01: { box: 1 }, utility_box_02: { box: 1 }, concrete_road_barrier: { box: 1 },
  old_tyre: {}, trashbag: {}, cardboard_box_01: {}, Barrel_01: { r: .32 }, shrub_02: {}, shrub_03: {}, shrub_04: {}, rock_07: { box: 1 }, rock_09: { box: 1 }, stone_01: { box: 1 },
  planter_box_01: { box: 1 }, covered_car: { box: 1 }, security_light: {}, street_lamp_01: { r: .14 }, painted_wooden_bench: { box: 1 }, planter_pot_clay: { r: .3 },
};
const PROPS = {};
function loadProps() {
  if (!T.GLTFLoader) return Promise.resolve(); const loader = new T.GLTFLoader();
  const jobs = Object.keys(PROPDEF).map(id => parseGLBText(loader, 'assets/p_' + id + '.glb').then(gl => {
    gl.scene.updateMatrixWorld(true); const parts = []; const bb = new T.Box3();
    gl.scene.traverse(o => { if (!o.isMesh) return; const g = o.geometry.clone().applyMatrix4(o.matrixWorld); g.computeBoundingBox(); bb.union(g.boundingBox); const m = o.material; m.envMapIntensity = .55; if (m.map) m.map.anisotropy = 4; parts.push({ g, m }); });
    PROPS[id] = { id, parts, bb, list: [], near: [] };
  }).catch(() => { }));
  return Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 15000))]);
}
// place a prop: feet on y, rotated ry, uniform scale k. Solid ones get a collision box.
function propAt(id, x, z, ry, k, y) {
  const P0 = PROPS[id]; if (!P0) return false; k = k || 1; y = y || 0;
  P0.list.push([x, y, z, ry || 0, k]);
  const D = PROPDEF[id];
  if (D.r || D.box) {
    const b = P0.bb, hx = (b.max.x - b.min.x) / 2 * k, hz = (b.max.z - b.min.z) / 2 * k, rr = D.r ? D.r * k : Math.max(hx, hz) * (Math.abs(Math.sin(ry * 2)) > .3 ? .9 : 1);
    const ex = D.r ? rr : (Math.abs(Math.cos(ry)) > .7 ? hx : hz), ez = D.r ? rr : (Math.abs(Math.cos(ry)) > .7 ? hz : hx);
    const bx = addBox(x - ex, x + ex, z - ez, z + ez, y + (b.max.y) * k); bx.surf = id.includes('rock') || id.includes('stone') || id.includes('barrier') ? 'concrete' : id.includes('bench') || id.includes('box_01') ? 'wood' : 'metal';
  }
  return true;
}
// near-set streaming: one InstancedMesh per prop part, refilled with the instances around the camera
const NEAR = { meshes: [], t: 0, r: 60 };
function buildProps() {
  NEAR.r = G.quality === 'high' ? 85 : 58;
  for (const id in PROPS) {
    const P0 = PROPS[id]; if (!P0.list.length) continue;
    P0.ims = P0.parts.map(pt => { const im = new T.InstancedMesh(pt.g, pt.m, Math.min(P0.list.length, 900)); im.count = 0; im.frustumCulled = false; im.userData.dyn = 1; scene.add(im); return im; });
    NEAR.meshes.push(P0);
  }
  UPD.push(dt => { NEAR.t -= dt; if (NEAR.t > 0) return; NEAR.t = .2; refillNear(); });
  refillNear();
}
const _nm = new T.Matrix4(), _nq = new T.Quaternion(), _np = new T.Vector3(), _ns = new T.Vector3(), _ny = new T.Vector3(0, 1, 0);
// how far each prop is drawn (metres, high quality; low quality uses 70%)
const PROPFAR = { fire_hydrant: 34, metal_trash_can: 34, old_tyre: 26, trashbag: 28, cardboard_box_01: 24, planter_pot_clay: 28, painted_wooden_bench: 34, security_light: 30, shrub_02: 46, shrub_03: 46, shrub_04: 46, rock_07: 40, rock_09: 40, stone_01: 40 };
const _cf = new T.Vector3();
function refillNear() {
  const c = G.inside ? null : camera.position; const lowK = G.quality === 'high' ? 1 : .7;
  camera.getWorldDirection(_cf);
  for (const P0 of NEAR.meshes) {
    let n = 0; const cap = P0.ims[0].instanceMatrix.count; const far = (PROPFAR[P0.id] || 55) * lowK, R2 = far * far;
    if (c) for (const e of P0.list) {
      const dx = e[0] - c.x, dz = e[2] - c.z, d2 = dx * dx + dz * dz; if (d2 > R2 || n >= cap) continue;
      if (d2 > 100 && (dx * _cf.x + dz * _cf.z) < -.35 * Math.sqrt(d2)) continue; // well behind the camera
      _np.set(e[0], e[1], e[2]); _nq.setFromAxisAngle(_ny, e[3]); _ns.setScalar(e[4]); _nm.compose(_np, _nq, _ns);
      for (const im of P0.ims) im.setMatrixAt(n, _nm); n++;
    }
    for (const im of P0.ims) { im.count = n; im.visible = n > 0; im.instanceMatrix.needsUpdate = true; }
  }
}

/* ---------------- mailboxes, grass, parks ---------------- */
const MAILBOX = [], GRASS = [];
function mailboxGeo() {
  const parts = [];
  const post = new T.BoxGeometry(.09, 1.05, .09); post.translate(0, .52, 0); parts.push(post);
  const body = new T.BoxGeometry(.24, .2, .48); body.translate(0, 1.12, 0); parts.push(body);
  const top = new T.CylinderGeometry(.12, .12, .48, 12, 1, false, 0, Math.PI); top.rotateZ(Math.PI / 2); top.rotateY(Math.PI / 2); top.translate(0, 1.22, 0); parts.push(top);
  const flag = new T.BoxGeometry(.02, .16, .05); flag.translate(.13, 1.2, .1); parts.push(flag);
  return mergeGeos(parts);
}
function mergeGeos(list) { // tiny merge for non-indexed copies (BufferGeometryUtils isn't loaded)
  const arrs = list.map(g => g.index ? g.toNonIndexed() : g); let n = 0; arrs.forEach(g => n += g.attributes.position.count);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of arrs) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); return out;
}
// wind-swayed grass tufts: crossed blades, colour varied per instance
function grassGeo() {
  const pos = [], nor = [], col = [];
  for (let b = 0; b < 7; b++) {
    const a = b / 7 * Math.PI + rand(-.2, .2), r = rand(0, .12), x = Math.cos(a * 2.3) * r, z = Math.sin(a * 2.3) * r, h = rand(.25, .5), w = .035, lean = rand(-.12, .12);
    const dx = Math.cos(a) * w, dz = Math.sin(a) * w;
    const v = [[x - dx, 0, z - dz], [x + dx, 0, z + dz], [x + lean * Math.sin(a), h, z - lean * Math.cos(a)]];
    v.forEach(p => { pos.push(...p); nor.push(0, 1, 0); col.push(p[1] / .5); });
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('hk', new T.Float32BufferAttribute(col, 1)); return g;
}
function grassMat() {
  const m = new T.MeshStandardMaterial({ color: 0x5a7a32, roughness: .9, metalness: 0, side: T.DoubleSide });
  m.onBeforeCompile = sh => {
    sh.uniforms.gT = { value: 0 }; m.userData.gT = sh.uniforms.gT;
    sh.vertexShader = 'uniform float gT; attribute float hk; varying float vHk;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  vHk = hk; vec4 gw = instanceMatrix * vec4(0., 0., 0., 1.);
  transformed.x += sin(gT * 1.7 + gw.x * .35 + gw.z * .21) * .07 * hk * hk; transformed.z += cos(gT * 1.3 + gw.z * .3) * .05 * hk * hk;`);
    sh.fragmentShader = 'varying float vHk;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(.35, 1.15, vHk);');
  };
  return m;
}
function park(x0, x1, z0, z1, d) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  // lawn slab with a photo grass ground (asphalt detail set reused as dirt when grass isn't in)
  const lawn = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), PARKMAT || (PARKMAT = new T.MeshStandardMaterial({ color: lc(0x24301a), roughness: .95 })));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(cx, .17, cz); scene.add(lawn);
  // paths
  const path = new T.Mesh(new T.PlaneGeometry(2.4, z1 - z0), STD(0x3a3833, .9)); path.rotation.x = -Math.PI / 2; path.position.set(cx, .18, cz); scene.add(path);
  const path2 = new T.Mesh(new T.PlaneGeometry(x1 - x0, 2.4), STD(0x3a3833, .9)); path2.rotation.x = -Math.PI / 2; path2.position.set(cx, .181, cz); scene.add(path2);
  for (let k = 0; k < 650; k++) { const x = sr(x0 + .5, x1 - .5), z = sr(z0 + .5, z1 - .5); if (Math.abs(x - cx) < 1.6 || Math.abs(z - cz) < 1.6) continue; GRASS.push([x, .17, z, srand() * TAU, sr(.7, 1.5)]); }
  for (let k = 0; k < 9; k++) propAt(spick(['shrub_02', 'shrub_03', 'shrub_04']), sr(x0 + 2, x1 - 2), sr(z0 + 2, z1 - 2), srand() * TAU, sr(.8, 1.3), .17);
  for (let k = 0; k < 6; k++) { const x = sr(x0 + 2, x1 - 2), z = sr(z0 + 2, z1 - 2); if (Math.abs(x - cx) < 2.5 || Math.abs(z - cz) < 2.5) continue; propAt(spick(['rock_07', 'rock_09', 'stone_01']), x, z, srand() * TAU, sr(.6, 1.4), .1); }
  for (const [ox, oz, ry] of [[3, 6, Math.PI / 2], [-3, -6, -Math.PI / 2], [6, -3, 0], [-6, 3, Math.PI]]) propAt('painted_wooden_bench', cx + ox, cz + oz, ry, 1, .17);
  for (const [ox, oz] of [[-10, -10], [10, 10], [-10, 10], [10, -10]]) propAt('street_lamp_01', cx + ox, cz + oz, srand() * TAU, 1, .17), addLS(cx + ox, 3.5, cz + oz, 0xffd9a0, 1.6, 14);
  propAt('metal_trash_can', cx + 2, cz + 2, 0, 1, .17);
}
let PARKMAT = null;
// ground-level clutter along every sidewalk, mailboxes at houses, alley junk in the gaps between buildings
function streetProps() {
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
    const bx = -HALF + i * CW, bz = -HALF + j * CW, d = districtAt(bx + 20, bz + 20);
    for (let side = 0; side < 4; side++) {
      const alongX = side % 2 === 0, off = side < 2 ? 5.45 : 34.55, ry = side === 0 ? 0 : side === 1 ? Math.PI / 2 : side === 2 ? Math.PI : -Math.PI / 2;
      for (let t = 8; t < 33; t += sr(3.2, 5.5)) {
        const x = alongX ? bx + t : bx + off, z = alongX ? bz + off : bz + t; const r = srand();
        if (r < .12) propAt('fire_hydrant', x, z, srand() * TAU, 1);
        else if (r < .27) propAt('metal_trash_can', x, z, srand() * TAU, 1);
        else if (r < .34) propAt(spick(['utility_box_01', 'utility_box_02']), x, z, ry, 1);
        else if (r < .45 && d !== 1) { propAt('trashbag', x + sr(-.4, .4), z + sr(-.4, .4), srand() * TAU, sr(.9, 1.2)); if (srand() < .6) propAt('trashbag', x + sr(-.6, .6), z + sr(-.6, .6), srand() * TAU, sr(.8, 1.1)); if (srand() < .4) propAt('cardboard_box_01', x + sr(-.6, .6), z + sr(-.6, .6), srand() * TAU, 1); }
        else if (r < .5) propAt('planter_pot_clay', x, z, 0, sr(1, 1.4));
        else if (r < .55 && d === 2) propAt('Barrel_01', x, z, srand() * TAU, 1);
        else if (r < .58) propAt('old_tyre', x, z, srand() * TAU, 1);
        else if (r < .62 && (d === 1 || d === 0)) propAt('planter_box_01', x, z, ry, 1);
        else if (r < .65) propAt('painted_wooden_bench', x, z, ry + Math.PI, 1);
      }
      // houses get a mailbox at the curb for every lot frontage
      if (d === 3 || d === 2) for (let t = 10; t < 32; t += 8) if (srand() < (d === 3 ? .8 : .35)) { const x = alongX ? bx + t : bx + off, z = alongX ? bz + off : bz + t; MAILBOX.push([x, z, ry + Math.PI, d === 3 ? spick([0x1a1a20, 0x6a1a14, 0x2a3a2a]) : 0x2a3a6a]); }
    }
    // weeds and grass along the building line and in cracks on the poorer blocks
    if (d === 2 || d === 3) for (let k = 0; k < 40; k++) { const s = Math.floor(sr(0, 4)), t = sr(6, 34), o = s < 2 ? sr(6.2, 6.9) : sr(33.1, 33.8); GRASS.push([s % 2 === 0 ? bx + t : bx + o, .15, s % 2 === 0 ? bz + o : bz + t, srand() * TAU, sr(.5, 1)]); }
    if (d === 2 && srand() < .5) for (let k = 0; k < 3; k++) propAt(spick(['rock_07', 'rock_09']), bx + sr(6, 34), bz + (srand() < .5 ? 6.4 : 33.6), srand() * TAU, sr(.3, .6), .1);
    if (srand() < .25) propAt('covered_car', bx + (srand() < .5 ? 3.2 : 36.8), bz + sr(10, 30), Math.PI / 2 * (srand() < .5 ? 0 : 2), 1);
  }
}
function buildGrassAndMail() {
  if (MAILBOX.length) {
    const im = new T.InstancedMesh(mailboxGeo(), new T.MeshStandardMaterial({ color: 0xffffff, roughness: .45, metalness: .6, envMapIntensity: .7 }), MAILBOX.length);
    const mt = new T.Matrix4(), q = new T.Quaternion(), Y = new T.Vector3(0, 1, 0);
    MAILBOX.forEach(([x, z, ry, c], k) => { q.setFromAxisAngle(Y, ry); mt.compose(new T.Vector3(x, .15, z), q, new T.Vector3(1, 1, 1)); im.setMatrixAt(k, mt); im.setColorAt(k, new T.Color(c)); addBox(x - .14, x + .14, z - .14, z + .14, 1.3, { noshoot: true }); });
    im.frustumCulled = false; scene.add(im);
  }
  if (GRASS.length) {
    const g = grassGeo(), m = grassMat(); const cap = G.quality === 'high' ? 9000 : 4500;
    const im = new T.InstancedMesh(g, m, Math.min(cap, GRASS.length)); im.count = 0; im.frustumCulled = false; im.userData.dyn = 1; scene.add(im);
    const mt = new T.Matrix4(), q = new T.Quaternion(), Y = new T.Vector3(0, 1, 0), p = new T.Vector3(), s = new T.Vector3(); let gt = 0, t0 = 0;
    const fill = () => { const c = camera.position, R2 = (G.quality === 'high' ? 70 : 45) ** 2; let n = 0; for (const e of GRASS) { const dx = e[0] - c.x, dz = e[2] - c.z; if (dx * dx + dz * dz > R2 || n >= cap) continue; p.set(e[0], e[1], e[2]); q.setFromAxisAngle(Y, e[3]); s.setScalar(e[4]); mt.compose(p, q, s); im.setMatrixAt(n++, mt); } im.count = G.inside ? 0 : n; im.visible = im.count > 0; im.instanceMatrix.needsUpdate = true; };
    UPD.push((dt, t) => { if (m.userData.gT) m.userData.gT.value = t; gt -= dt; if (gt <= 0) { gt = .5; fill(); } });
    fill();
  }
}
