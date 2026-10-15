/* =====================================================================
   RED NIGHT — photo-scanned CC0 detail (Poly Haven) layered onto the city.
   World-space projected (picks the dominant axis), so instanced boxes, the ground
   and curbs need no UVs. Albedo is luminance-normalized so each district keeps its
   hue; the normal map adds real surface relief; asphalt gets wet roughness.
   ===================================================================== */
const PBR = { tex: {}, gain: {} };
const PBR_LIST = ['asphalt_d', 'asphalt_n', 'asphalt_r', 'pavement_d', 'pavement_n', 'sandstone_d', 'sandstone_n', 'brick_d', 'brick_n', 'planks_d', 'planks_n', 'concrete_d', 'concrete_n', 'plaster_d', 'plaster_n'];
const PBR_WHITE = (() => { const t = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t; })();
const PBR_FLAT = (() => { const t = new T.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1); t.needsUpdate = true; return t; })();
function loadPBR() {
  const L = new T.TextureLoader();
  const jobs = PBR_LIST.map(n => new Promise(res => {
    L.load('assets/tex/' + n + '.jpg', t => {
      t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = G.quality === 'high' ? 8 : 4; PBR.tex[n] = t;
      if (n.endsWith('_d')) { // mean linear colour per channel, so the detail is hue-neutral
        const [c, x] = cvs(16, 16); x.drawImage(t.image, 0, 0, 16, 16); const px = x.getImageData(0, 0, 16, 16).data; const m = [0, 0, 0];
        for (let i = 0; i < px.length; i += 4) for (let k = 0; k < 3; k++) m[k] += Math.pow(px[i + k] / 255, 2.2);
        PBR.gain[n] = new T.Vector3(...m.map(v => 256 / Math.max(.002, v)));
      }
      res();
    }, undefined, () => res());
  }));
  return Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 15000))]);
}
// layer a detail set onto a MeshStandardMaterial. o: { set, scale (tiles per metre), k (albedo strength), nk (normal strength), wet }
function applyDetail(mat, o) {
  const D = PBR.tex[o.set + '_d']; if (!D) return;
  const U = {
    detD: { value: D }, detN: { value: PBR.tex[o.set + '_n'] || PBR_FLAT }, detR: { value: (o.wet && PBR.tex[o.set + '_r']) || PBR_WHITE },
    detS: { value: o.scale }, detK: { value: o.k }, detNK: { value: o.nk === undefined ? .8 : o.nk }, detG: { value: PBR.gain[o.set + '_d'] || new T.Vector3(1, 1, 1) }, detW: { value: o.wet ? 1 : 0 }, detC: { value: o.c || 1 },
  };
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey && mat.customProgramCacheKey();
  mat.onBeforeCompile = (sh, r) => {
    prev && prev.call(mat, sh, r);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vDW; varying vec3 vDN;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  vec4 dwp = vec4(transformed, 1.0); mat3 dnm = mat3(modelMatrix);
  #ifdef USE_INSTANCING
    dwp = instanceMatrix * dwp; dnm = dnm * mat3(instanceMatrix);
  #endif
  vDW = (modelMatrix * dwp).xyz; vDN = normalize(dnm * objectNormal);`);
    sh.fragmentShader = 'uniform sampler2D detD; uniform sampler2D detN; uniform sampler2D detR; uniform float detS; uniform float detK; uniform float detNK; uniform vec3 detG; uniform float detW; uniform float detC;\nvarying vec3 vDW; varying vec3 vDN;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
  vec3 dAn = abs(vDN); int dAx = dAn.y > .55 ? 1 : (dAn.x > dAn.z ? 0 : 2);
  vec2 dUv = (dAx == 1 ? vDW.xz : (dAx == 0 ? vDW.zy : vDW.xy)) * detS;
  vec3 dCol = pow(texture2D(detD, dUv).rgb, vec3(2.2)) * detG;
  float dLum = dot(dCol, vec3(.299, .587, .114)); dLum = max(.05, (dLum - 1.0) * detC + 1.0); dCol = max(vec3(.05), (dCol - 1.0) * detC + 1.0);
  diffuseColor.rgb *= mix(vec3(1.0), mix(vec3(dLum), dCol, .35), detK);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  if (detW > .5) { float wr = texture2D(detR, dUv).g; float puddle = smoothstep(.55, .35, wr); roughnessFactor = mix(roughnessFactor, .08, puddle * .85); roughnessFactor *= mix(1.0, wr * 1.4, .5); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  {
    vec3 tn = texture2D(detN, dUv).xyz * 2.0 - 1.0;
    vec3 wn = normalize(vDN);
    vec3 Tw = dAx == 1 ? vec3(1., 0., 0.) : (dAx == 0 ? vec3(0., 0., 1.) : vec3(1., 0., 0.));
    vec3 Bw = dAx == 1 ? vec3(0., 0., 1.) : vec3(0., 1., 0.);
    vec3 pw = normalize(wn + (Tw * tn.x + Bw * tn.y) * detNK * (detW > .5 ? .6 : 1.0));
    normal = normalize(mix(normal, normalize((viewMatrix * vec4(pw, 0.)).xyz), .85));
  }`);
  };
  mat.userData.det = U;
  mat.customProgramCacheKey = () => (prevKey || '') + '|det' + o.set + (o.wet ? 'w' : '');
  mat.needsUpdate = true;
}
function applyCityDetail() {
  const map = { stone: ['sandstone', 1 / 2.2, 1, 1.2, 2.2], brick: ['brick', 1 / 2.2, .9, 1, 1.1], wood: ['planks', 1 / 2, .95, 1.1, 1.5], white: ['plaster', 1 / 2.5, .9, .9, 2], neon: ['concrete', 1 / 3.5, .65, .7, 1.5] };
  for (const id in map) if (STYLES[id]) { const [set, scale, k, nk, c] = map[id]; applyDetail(STYLES[id].mat, { set, scale, k, nk, c }); }
  if (PBR.ground) applyDetail(PBR.ground, { set: 'asphalt', scale: 1 / 3.2, k: .9, nk: .9, wet: true, c: 1.4 });
  if (FDMAT.curb) applyDetail(FDMAT.curb, { set: 'pavement', scale: 1 / 2, k: .9, nk: .8, c: 1.4 });
  if (PBR.ledge) applyDetail(PBR.ledge, { set: 'concrete', scale: 1 / 2.5, k: .7, nk: .6, c: 1.5 });
}
