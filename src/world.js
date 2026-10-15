/* =====================================================================
   RED NIGHT — the city: Cairo (NW) · Sacramento (NE) · Texarkana (SE) · Salem (SW)
   ===================================================================== */
const HALF = 240, CW = 40;
const DIST = [
  { id: 'cairo', name: 'CAIRO', sub: 'Old Bazaar · Nile Quarter', fog: 0x54463a, warm: ['#ffb36a', '#ffd08a', '#ffe6c0'], amb: 0xff9a3c, signs: ['القاهرة', 'NILE NOODLE', 'SPHINX PHARMACY', 'KHAN BAZAAR', 'PHARAOH ARMS', 'OASIS HOTEL', 'KOSHARY 24H', 'DUNE TELECOM', 'GIZA GRILL', 'SCARAB GOLD'], cols: ['#f3a600', '#ff6a00', '#05d9e8', '#ff2a6d'] },
  { id: 'sac', name: 'SACRAMENTO', sub: 'Capitol Mall · Gold River', fog: 0x3a4352, warm: ['#fff1dc', '#e8eeff', '#ffd9a8'], amb: 0x05d9e8, signs: ['SACRAMENTO', 'GOLD RUSH', 'CAPITOL LIQUOR', 'DELTA DINER', 'RIVER CITY', 'SUTTER PAWN', 'CALI TIRE', 'MIDTOWN MOTO', 'K ST CLINIC', 'OLD TOWN'], cols: ['#05d9e8', '#f3e600', '#3dff9a', '#ffffff'] },
  { id: 'tex', name: 'TEXARKANA', sub: 'State Line Avenue', fog: 0x4e3e36, warm: ['#ffb060', '#ffd49a', '#fff0d8'], amb: 0xff2a6d, signs: ['TEXARKANA', 'STATE LINE', 'TWICE AS NICE', 'RED RIVER ARMS', 'PIT BBQ', 'RAILYARD', 'TOPAZ MOTEL', 'BOWIE BAR', 'LONE STAR', 'RAZORBACK'], cols: ['#ff2a6d', '#ff1f3d', '#f3e600', '#05d9e8'] },
  { id: 'salem', name: 'SALEM', sub: 'Witch City · 1692', fog: 0x363e42, warm: ['#ffb050', '#ffc878', '#ffe0b0'], amb: 0xb04dff, signs: ['SALEM', 'WITCH CITY', 'HEX & BREW', '1692', 'GALLOWS HILL', 'TAROT 24/7', 'BLACK CAT', 'OLD BURYING', 'APOTHECARY', 'COVEN CLUB'], cols: ['#b04dff', '#3dff6a', '#ff2a6d', '#f3a600'] },
];
const hash2 = (x, z) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
const districtAt = (x, z) => z < 0 ? (x < 0 ? 0 : 1) : (x < 0 ? 3 : 2);
const LS = [];   // light sources the light pool picks from
const FIRES = []; // fire emitters
const INTER = []; // interactables
const CARS = [];
const UPD = [];  // per-frame world updaters
const WITCH_CIRCLES = [];
const ROADS = []; // road centerlines for spawns
for (let k = -HALF; k <= HALF; k += CW) ROADS.push(k);
function addLS(x, y, z, color, intensity, dist, flick) { LS.push({ p: new T.Vector3(x, y, z), c: new T.Color(color), i: intensity, d: dist || 22, f: flick || 0 }); }

// ---- world-mapped UVs for instanced facades
function worldUV(mat, sx, sy) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uvS = { value: new T.Vector2(sx, sy) };
    sh.vertexShader = 'uniform vec2 uvS;\n' + sh.vertexShader.replace('#include <uv_vertex>', `
#ifdef USE_UV
  mat4 imU = mat4(1.0);
  #ifdef USE_INSTANCING
    imU = instanceMatrix;
  #endif
  vec4 wpU = modelMatrix * imU * vec4(position, 1.0);
  vec3 wnU = normalize(mat3(modelMatrix * imU) * normal);
  vec3 anU = abs(wnU);
  if (anU.y > 0.5) vUv = vec2(0.003, 0.003);
  else if (anU.x > anU.z) vUv = vec2(wpU.z, wpU.y) * uvS;
  else vUv = vec2(wpU.x, wpU.y) * uvS;
#endif`);
  };
  mat.customProgramCacheKey = () => 'wuv' + sx + '_' + sy;
}
function facadeTex(palette, lit, style, base) {
  const old = style === 'old';
  const cols = old ? 4 : 8, rows = old ? 8 : 16;
  const [ca, xa] = cvs(256, 512), [ce, xe] = cvs(256, 512), [cb, xb] = cvs(256, 512);
  xb.fillStyle = '#fff'; xb.fillRect(0, 0, 256, 512);
  xa.fillStyle = base; xa.fillRect(0, 0, 256, 512); xe.fillStyle = '#000'; xe.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2500; i++) { xa.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${rand(.02, .08)})`; xa.fillRect(Math.random() * 256, Math.random() * 512, rand(1, 4), rand(1, 4)); }
  const cw = 256 / cols, rh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    xa.fillStyle = 'rgba(0,0,0,.35)'; xa.fillRect(0, r * rh, 256, 2);
    for (let q = 0; q < cols; q++) {
      const px = q * cw + cw * .16, py = r * rh + rh * .2, w = cw * .68, h = rh * .58;
      xa.fillStyle = old ? '#1a1418' : '#0b0f18'; xa.fillRect(px, py, w, h);
      xb.fillStyle = '#9a9a9a'; xb.fillRect(px - 3, py - 3, w + 6, h + 6); xb.fillStyle = '#000'; xb.fillRect(px, py, w, h); xb.fillStyle = '#d0d0d0'; xb.fillRect(px - 4, py + h, w + 8, 4); // frame, recess, sill
      xa.fillStyle = 'rgba(255,255,255,.07)'; xa.fillRect(px, py, w, 2);
      if (Math.random() < lit) {
        const col = pick(palette); const g = xe.createLinearGradient(0, py, 0, py + h); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,.5)');
        xe.globalAlpha = rand(.35, 1); xe.fillStyle = g; xe.fillRect(px, py, w, h); xe.globalAlpha = 1;
        if (Math.random() < .3) { xe.fillStyle = 'rgba(0,0,0,.7)'; xe.fillRect(px + w * rand(.1, .6), py + h * .3, w * .25, h * .7); }
      }
      if (old) { xa.fillStyle = 'rgba(0,0,0,.6)'; xa.fillRect(px + w / 2 - 1, py, 2, h); xa.fillRect(px, py + h / 2 - 1, w, 2); xe.fillStyle = '#000'; xe.fillRect(px + w / 2 - 1, py, 2, h); xe.fillRect(px, py + h / 2 - 1, w, 2); }
    }
  }
  xa.fillStyle = '#26222c'; xa.fillRect(0, 0, 6, 6); xe.fillStyle = '#000'; xe.fillRect(0, 0, 6, 6);
  return [texFrom(ca, true, true), texFrom(ce, true, true), texFrom(cb, false, true)];
}
const STYLES = {};
function makeStyle(id, palette, lit, style, base, sx, sy, rough, metal) {
  const [a, e, bm] = facadeTex(palette, lit, style, base);
  const mat = new T.MeshStandardMaterial({ map: a, emissiveMap: e, bumpMap: bm, bumpScale: style === 'old' ? .09 : .05, emissive: new T.Color(1, 1, 1), emissiveIntensity: 1.25, roughness: rough, metalness: metal, envMapIntensity: .8 });
  worldUV(mat, sx, sy);
  STYLES[id] = { mat, list: [] };
}

function buildCity() {
  makeStyle('glass', ['#fff1dc', '#e6eeff', '#ffe2b0', '#d2e0ff'], .34, 'new', '#3a4452', 1 / 24, 1 / 56, .25, .7);
  makeStyle('neon', ['#ffd9a0', '#ffe8c8', '#eef2ff', '#ffc070', '#9ab4ff'], .36, 'new', '#2c2a2e', 1 / 24, 1 / 56, .35, .5);
  makeStyle('stone', ['#ffb85a', '#ffcf8a', '#ffe2b0', '#ff9a40'], .3, 'old', '#9a7a52', 1 / 16, 1 / 28, .85, .05);
  makeStyle('brick', ['#ffc27a', '#ffe0a8', '#ffd090', '#a8c0ff'], .28, 'old', '#6e3426', 1 / 14, 1 / 26, .8, .05);
  makeStyle('wood', ['#ffb050', '#ff9a3c', '#ffd8a0', '#ff8030'], .24, 'old', '#3a3236', 1 / 12, 1 / 22, .9, .02);
  makeStyle('white', ['#fff4d0', '#ffd27a'], .4, 'old', '#c9c4bc', 1 / 14, 1 / 26, .6, .05);

  // ground
  const [gm, gr] = makeGroundTex(); const rep = 560 / CW; gm.repeat.set(rep, rep); gr.repeat.set(rep, rep);
  const ground = new T.Mesh(new T.PlaneGeometry(560, 560), new T.MeshStandardMaterial({ map: gm, roughnessMap: gr, roughness: 1, metalness: .25, envMapIntensity: 1.6 })); PBR.ground = ground.material;
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  const signMat = new T.MeshBasicMaterial({ transparent: true, toneMapped: false, side: T.DoubleSide, depthWrite: false });
  const trimGroups = [], clutter = [], roofs = [], roofCols = [], domes = [], domeCols = [];
  const reserved = new Set();
  const blockKey = (i, j) => i * 100 + j;
  const blockOf = (x, z) => [Math.floor((x + HALF) / CW), Math.floor((z + HALF) / CW)];
  [[-140, -140], [100, -140], [100, 100], [140, 100], [180, 60], [-100, 100], [-180, 60], [-60, 180], [20, 20], [-20, -20], [-140, -60], [60, 180]].forEach(([x, z]) => { const [i, j] = blockOf(x, z); reserved.add(blockKey(i, j)); });
  let signsLeft = 54;
  const mtx = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3();

  function building(style, x0, x1, z0, z1, h, opts) {
    STYLES[photoStyleFor(style, x0, z0, h)].list.push([x0, x1, z0, z1, h]);
    const bx = addBox(x0, x1, z0, z1, h); bx.surf = ({ stone: 'stone', brick: 'brick', wood: 'wood', white: 'plaster', glass: 'glass', neon: 'concrete' })[style] || 'concrete'; FD_BOX = bx;
    const d = districtAt((x0 + x1) / 2, (z0 + z1) / 2), D = DIST[d];
    if (!(opts && opts.tier)) facadeDetail(style, x0, x1, z0, z1, h, d); else facadeDetail(style, x0, x1, z0, z1, h, d, true);
    // neon trims
    if (srand() < .55 && !(opts && opts.notrim)) {
      const col = new T.Color(spick(D.cols)); const t = .12;
      const yy = h - .2;
      const tg = { col, k: hash2(x0, z0) * (style === 'neon' || style === 'glass' ? .55 : 1), list: [[x0 - .05, x1 + .05, yy, z0 - .05, z0 + t], [x0 - .05, x1 + .05, yy, z1 - t, z1 + .05], [x0 - .05, x0 + t, yy, z0, z1], [x1 - t, x1 + .05, yy, z0, z1]] };
      if (srand() < .4 && h > 14) tg.list.push([x0 - .06, x0 + .1, h / 2, z0 - .06, z0 + .1, h]);
      trimGroups.push(tg);
    }
    // rooftop clutter
    const n = Math.floor(sr(0, 3));
    for (let k = 0; k < n; k++) { const w = sr(1.2, 3), dd = sr(1.2, 3), hh = sr(.8, 2.4); clutter.push([sr(x0 + 1, x1 - 1 - w), 0, h + 1, sr(z0 + 1, z1 - 1 - dd), w, hh, dd]); }
    // signs facing streets
    if (signsLeft > 0 && srand() < .7 && !(opts && opts.nosign)) {
      signsLeft--;
      const txt = spick(D.signs), col = spick(D.cols);
      const hs = hash2(x1, z1), isNeon = hs < (d === 1 ? .42 : .3), box = isNeon ? null : BOX_SIGNS[Math.floor(hs * 97) % BOX_SIGNS.length];
      const uv = addSign(txt, col, txt === 'القاهرة' ? "'Segoe UI', 'Noto Naskh Arabic', sans-serif" : null, box);
      const blade = srand() < .45; const w = blade ? sr(3.2, 4.5) : sr(5, 8.5);
      const geo = new T.PlaneGeometry(w, w / 4); const uva = geo.attributes.uv;
      uva.setXY(0, uv.u0, uv.v1); uva.setXY(1, uv.u1, uv.v1); uva.setXY(2, uv.u0, uv.v0); uva.setXY(3, uv.u1, uv.v0);
      const me = new T.Mesh(geo, signMat);
      // pick the face nearest a road
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const lx = ((x0 + HALF) % CW), lz = ((z0 + HALF) % CW);
      const faces = [];
      if (lx < 8) faces.push(['w', x0]); if (((x1 + HALF) % CW) > 32 || ((x1 + HALF) % CW) === 0) faces.push(['e', x1]);
      if (lz < 8) faces.push(['n', z0]); if (((z1 + HALF) % CW) > 32 || ((z1 + HALF) % CW) === 0) faces.push(['s', z1]);
      if (!faces.length) faces.push(['w', x0]);
      const [f, fv] = spick(faces); const y = Math.min(h - 2, sr(4.5, 13));
      if (f === 'w' || f === 'e') {
        const out = f === 'w' ? -1 : 1;
        if (blade) { me.position.set(fv + out * (w / 2 + .2), y, sr(z0 + 3, z1 - 3)); me.rotation.y = 0; }
        else { me.position.set(fv + out * .15, y, cz); me.rotation.y = out * Math.PI / 2; }
        if (blade) { me.rotation.y = Math.PI / 2 * 0; }
      } else {
        const out = f === 'n' ? -1 : 1;
        if (blade) { me.position.set(sr(x0 + 3, x1 - 3), y, fv + out * (w / 2 + .2)); me.rotation.y = Math.PI / 2; }
        else { me.position.set(cx, y, fv + out * .15); me.rotation.y = out < 0 ? Math.PI : 0; }
      }
      if (blade && (f === 'w' || f === 'e')) me.rotation.y = 0; // blade perpendicular to facade: plane spans x
      if (blade && (f === 'n' || f === 's')) me.rotation.y = Math.PI / 2;
      scene.add(me);
      const c3 = new T.Color(isNeon ? col : '#fff0d8'); addLS(me.position.x, y, me.position.z, c3, isNeon ? 2 : 1.4, isNeon ? 18 : 14);
      // wet street reflection smear
      const smk = 'sm' + c3.getHexString(); const sm = new T.Mesh(new T.PlaneGeometry(blade ? 1.2 : w * .7, 9), MATC[smk] || (MATC[smk] = new T.MeshBasicMaterial({ map: glowTex, color: c3, transparent: true, opacity: isNeon ? .3 : .16, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })));
      sm.rotation.x = -Math.PI / 2; const ox = f === 'w' ? -5 : f === 'e' ? 5 : 0, oz = f === 'n' ? -5 : f === 's' ? 5 : 0;
      sm.position.set(me.position.x + ox, .04, me.position.z + oz); if (f === 'w' || f === 'e') sm.rotation.z = Math.PI / 2; scene.add(sm);
    }
  }
  function gable(x0, x1, z0, z1, y, rh, alongX, col) {
    roofs.push([x0, x1, z0, z1, y, rh, alongX]); roofCols.push(new T.Color(col || 0x1d1620));
  }
  function lots(x0, x1, z0, z1, n) {
    const out = []; const gap = 2;
    if (n === 1) out.push([x0 + 1, x1 - 1, z0 + 1, z1 - 1]);
    else if (n === 2) { const m = sr(.4, .6) * (x1 - x0) + x0; out.push([x0 + 1, m - gap / 2, z0 + 1, z1 - 1], [m + gap / 2, x1 - 1, z0 + 1, z1 - 1]); }
    else { const mx = sr(.4, .6) * (x1 - x0) + x0, mz = sr(.4, .6) * (z1 - z0) + z0; out.push([x0 + 1, mx - gap / 2, z0 + 1, mz - gap / 2], [mx + gap / 2, x1 - 1, z0 + 1, mz - gap / 2], [x0 + 1, mx - gap / 2, mz + gap / 2, z1 - 1], [mx + gap / 2, x1 - 1, mz + gap / 2, z1 - 1]); }
    return out;
  }

  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
    if (reserved.has(blockKey(i, j))) continue;
    let x0 = -HALF + i * CW + 6, x1 = x0 + 28, z0 = -HALF + j * CW + 6, z1 = z0 + 28;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, d = districtAt(cx, cz);
    const center = Math.abs(cx) < 70 && Math.abs(cz) < 70;
    if (d === 1 && z1 < 0) { if (i === 10) x1 = 186; if (i === 11) x0 = 214; }
    if (srand() < .07 && !center) { if (PROPS.shrub_02 && srand() < .6) park(x0, x1, z0, z1, d); else plaza(x0, x1, z0, z1, d); continue; }
    if (center) { for (const L of lots(x0, x1, z0, z1, srand() < .5 ? 1 : 2)) { if (FAC.ok) skyscraper(L[0], L[1], L[2], L[3], sr(70, 140), d); else building('neon', L[0], L[1], L[2], L[3], sr(45, 110)); } continue; }
    if (d === 0) { // Cairo
      for (const L of lots(x0, x1, z0, z1, srand() < .6 ? 4 : 2)) {
        const h = sr(8, 26); building('stone', L[0], L[1], L[2], L[3], h);
        if (srand() < .3) domes.push([(L[0] + L[1]) / 2, h, (L[2] + L[3]) / 2, Math.min(L[1] - L[0], L[3] - L[2]) * .38]), domeCols.push(new T.Color(spick([0x2a9a8a, 0xc9a24a, 0x3a6aa0])));
        if (srand() < .5) { clutter.push([L[0], 0, h, L[2], L[1] - L[0], .8, .3]); }
      }
    } else if (d === 1) { // Sacramento
      for (const L of lots(x0, x1, z0, z1, srand() < .55 ? 1 : 2)) {
        const hh = sr(25, 95), st = srand() < .7 ? 'glass' : 'neon';
        if (hh > 60 && FAC.ok && L[1] - L[0] > 12 && L[3] - L[2] > 12) { skyscraper(L[0], L[1], L[2], L[3], hh * 1.2, d); continue; }
        if (hh > 50 && srand() < .7 && L[1] - L[0] > 12 && L[3] - L[2] > 12) { // wedding-cake setbacks
          const h1 = hh * sr(.45, .6), h2 = hh * sr(.75, .85), i1 = sr(2, 3.5), i2 = i1 + sr(1.5, 3);
          building(st, L[0], L[1], L[2], L[3], h1);
          building(st, L[0] + i1, L[1] - i1, L[2] + i1, L[3] - i1, h2, { nosign: true, tier: true });
          building(st, L[0] + i2, L[1] - i2, L[2] + i2, L[3] - i2, hh, { nosign: true, tier: true });
        } else building(st, L[0], L[1], L[2], L[3], hh);
      }
    } else if (d === 2) { // Texarkana
      for (const L of lots(x0, x1, z0, z1, srand() < .5 ? 4 : 2)) building(srand() < .85 ? 'brick' : 'white', L[0], L[1], L[2], L[3], srand() < .1 ? sr(26, 40) : sr(6, 18));
    } else { // Salem
      const n = srand() < .7 ? 4 : 2;
      for (const L of lots(x0, x1, z0, z1, n)) {
        const h = sr(6, 11); const alongX = (L[1] - L[0]) > (L[3] - L[2]);
        building('wood', L[0], L[1], L[2], L[3], h, { notrim: srand() < .6 });
        gable(L[0] - .4, L[1] + .4, L[2] - .4, L[3] + .4, h, sr(3, 5.5), alongX);
        if (srand() < .5) clutter.push([(L[0] + L[1]) / 2 - .5, 0, h + 1.5, (L[2] + L[3]) / 2 - .5, 1, 3, 1]); // chimney
      }
    }
  }

  // ---- instanced buildings per style
  const boxG = new T.BoxGeometry(1, 1, 1);
  for (const id in STYLES) {
    const st = STYLES[id]; if (!st.list.length) continue;
    const im = new T.InstancedMesh(boxG, st.mat, st.list.length);
    st.list.forEach((b, k) => { v.set((b[0] + b[1]) / 2, b[4] / 2, (b[2] + b[3]) / 2); s.set(b[1] - b[0], b[4], b[3] - b[2]); q.identity(); mtx.compose(v, q, s); im.setMatrixAt(k, mtx); });
    im.frustumCulled = false; scene.add(im);
  }
  // trims: an Augment layer (sorted so the dial adds whole buildings; warm architectural light when bare, neon when full)
  if (trimGroups.length) {
    trimGroups.sort((a, b) => a.k - b.k);
    const total = trimGroups.reduce((n, g) => n + g.list.length, 0), cum = [], neon = [], real = new T.Color(0xffd6a0).convertSRGBToLinear().multiplyScalar(.75);
    const im = new T.InstancedMesh(boxG, new T.MeshBasicMaterial({ toneMapped: false }), total); let k = 0;
    for (const g of trimGroups) {
      for (const t of g.list) {
        v.set((t[0] + t[1]) / 2, t[2], (t[3] + t[4]) / 2); s.set(t[1] - t[0], t.length === 6 ? t[5] : .18, t[4] - t[3]);
        q.identity(); mtx.compose(v, q, s); im.setMatrixAt(k, mtx); neon.push(g.col.clone().multiplyScalar(1.6)); im.setColorAt(k, real); k++;
      }
      cum.push(k);
    }
    const tmp = new T.Color();
    const augTrims = a => {
      const share = .14 + .86 * augShare(a), n = cum[Math.max(0, Math.round(share * cum.length) - 1)] || 0, m = smooth01((a - .12) / .6);
      im.count = n; for (let i = 0; i < n; i++) im.setColorAt(i, tmp.copy(real).lerp(neon[i], m));
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    };
    AUG_HOOKS.push(augTrims); augTrims(G.aug);
    im.frustumCulled = false; scene.add(im);
  }
  // clutter
  if (clutter.length) {
    const im = new T.InstancedMesh(boxG, new T.MeshStandardMaterial({ color: lc(0x2a2833), roughness: .7, metalness: .4 }), clutter.length);
    clutter.forEach((c, k) => { v.set(c[0] + c[4] / 2, c[2] + c[5] / 2, c[3] + c[6] / 2); s.set(c[4], c[5], c[6]); q.identity(); mtx.compose(v, q, s); im.setMatrixAt(k, mtx); });
    im.frustumCulled = false; scene.add(im);
  }
  // gable roofs (triangular prism)
  if (roofs.length) {
    const pg = new T.BufferGeometry();
    const P = [-.5, 0, -.5, .5, 0, -.5, 0, 1, -.5, -.5, 0, .5, 0, 1, .5, .5, 0, .5,
      -.5, 0, -.5, 0, 1, -.5, 0, 1, .5, -.5, 0, -.5, 0, 1, .5, -.5, 0, .5,
      .5, 0, -.5, .5, 0, .5, 0, 1, .5, .5, 0, -.5, 0, 1, .5, 0, 1, -.5];
    pg.setAttribute('position', new T.Float32BufferAttribute(P, 3)); pg.computeVertexNormals();
    const im = new T.InstancedMesh(pg, new T.MeshStandardMaterial({ color: 0xffffff, roughness: .85, metalness: .1, side: T.DoubleSide }), roofs.length);
    roofs.forEach((r, k) => { v.set((r[0] + r[1]) / 2, r[4], (r[2] + r[3]) / 2); if (r[6]) { q.setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 2); s.set(r[3] - r[2], r[5], r[1] - r[0]); } else { q.identity(); s.set(r[1] - r[0], r[5], r[3] - r[2]); } mtx.compose(v, q, s); im.setMatrixAt(k, mtx); im.setColorAt(k, roofCols[k]); });
    im.frustumCulled = false; scene.add(im);
  }
  // domes
  if (domes.length) {
    const dg = new T.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2);
    const im = new T.InstancedMesh(dg, new T.MeshStandardMaterial({ color: 0xffffff, roughness: .3, metalness: .7 }), domes.length);
    domes.forEach((d, k) => { v.set(d[0], d[1], d[2]); s.set(d[3], d[3] * 1.15, d[3]); q.identity(); mtx.compose(v, q, s); im.setMatrixAt(k, mtx); im.setColorAt(k, domeCols[k]); });
    im.frustumCulled = false; scene.add(im);
  }
  streetDressing(); districtSignatures(); if (Object.keys(PROPS).length) streetProps();
  buildFacades(); applyCityDetail();
  signAtlas.tex = texFrom(signAtlas.c, true); signMat.map = signAtlas.tex; signMat.needsUpdate = true;

  // ---- landmarks & props
  cairoLandmarks(); sacLandmarks(); texLandmarks(); salemLandmarks();
  streetFurniture(); boundary(); sky(); centerHolo(); billboards();
}

function plaza(x0, x1, z0, z1, d) {
  // open lot: barricades, fire barrels, a wrecked car
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  fireBarrel(cx + sr(-6, 6), cz + sr(-6, 6));
  wreck(cx + sr(-5, 5), cz + sr(-5, 5), srand() * TAU);
  for (let k = 0; k < 4; k++) barrier(cx + sr(-11, 11), cz + sr(-11, 11), srand() < .5);
}
const MATC = {};
const STD = (c, r, m, e, ei) => { const k = 's' + c + '_' + r + '_' + m + '_' + e + '_' + ei; if (MATC[k]) return MATC[k]; const o = { color: lc(c), roughness: r === undefined ? .7 : r, metalness: m || 0 }; if (e) { o.emissive = lc(e); o.emissiveIntensity = ei || 1; } return (MATC[k] = new T.MeshStandardMaterial(o)); };
const NEON = c => { const k = 'n' + (c.isColor ? c.getHexString() : c); return MATC[k] || (MATC[k] = new T.MeshBasicMaterial({ color: c.isColor ? c : lc(c), toneMapped: false })); };
const ADD = (c, op, extra) => { const k = 'a' + (c.isColor ? c.getHexString() : c) + '_' + op + (extra ? 'd' : ''); return MATC[k] || (MATC[k] = new T.MeshBasicMaterial(Object.assign({ color: c.isColor ? c : lc(c), transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }, extra ? { side: T.DoubleSide } : {}))); };
// static glows: one point cloud instead of hundreds of sprites
const SGLOW = [];
function buildStaticGlows() {
  const n = SGLOW.length; if (!n) return; const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
  SGLOW.forEach((g, i) => { pos.set([g[0], g[1], g[2]], i * 3); col.set([g[3].r, g[3].g, g[3].b], i * 3); size[i] = g[4]; });
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setAttribute('size', new T.BufferAttribute(size, 1));
  const mat = new T.ShaderMaterial({
    uniforms: { map: { value: glowTex }, scale: { value: 400 }, fogD: { value: .01 } },
    vertexShader: 'attribute float size; attribute vec3 color; varying vec3 vC; varying float vF; uniform float scale; uniform float fogD; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); float d=-mv.z; vF=exp(-fogD*fogD*d*d); gl_PointSize=size*scale/max(0.1,d); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform sampler2D map; varying vec3 vC; varying float vF; void main(){ vec4 t=texture2D(map, gl_PointCoord); gl_FragColor=vec4(vC*t.rgb*1.6, t.a*vF); }',
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
  });
  const pts = new T.Points(geo, mat); pts.frustumCulled = false; scene.add(pts); G.sglow = mat;
}
// merge static meshes by material into spatial chunks so the city costs a few dozen draw calls
function bakeStatic() {
  scene.updateMatrixWorld(true);
  const groups = new Map(); const wp = new T.Vector3();
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    for (let a = o; a; a = a.parent) if (a.userData && a.userData.dyn) return;
    const m = o.material; if (Array.isArray(m) || !o.visible || (m && m.visible === false)) return;
    o.getWorldPosition(wp); const ck = Math.floor((wp.x + 2000) / 240) + '_' + Math.floor((wp.z + 2000) / 240);
    const k = m.uuid + '|' + ck; if (!groups.has(k)) groups.set(k, { m, list: [] }); groups.get(k).list.push(o);
  });
  let merged = 0;
  for (const { m, list } of groups.values()) {
    if (list.length < 2) continue;
    const geos = list.map(o => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); return g; });
    let total = 0; geos.forEach(g => total += g.attributes.position.count);
    const P3 = new Float32Array(total * 3), N3 = new Float32Array(total * 3), U2 = new Float32Array(total * 2); let off = 0;
    geos.forEach(g => { const c = g.attributes.position.count; P3.set(g.attributes.position.array, off * 3); if (g.attributes.normal) N3.set(g.attributes.normal.array, off * 3); if (g.attributes.uv) U2.set(g.attributes.uv.array, off * 2); off += c; g.dispose(); });
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(P3, 3)); bg.setAttribute('normal', new T.BufferAttribute(N3, 3)); bg.setAttribute('uv', new T.BufferAttribute(U2, 2));
    bg.computeBoundingSphere();
    const mesh = new T.Mesh(bg, m); mesh.renderOrder = list[0].renderOrder; mesh.userData.baked = 1; mesh.userData.off = bg.boundingSphere.center.x > 1000; scene.add(mesh);
    list.forEach(o => o.parent && o.parent.remove(o)); merged += list.length;
  }
  return merged;
}
function mesh(geo, mat, x, y, z, parent) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); (parent || scene).add(m); return m; }
function glowSprite(x, y, z, col, size, parent) {
  if (!parent) { SGLOW.push([x, y, z, col.isColor ? col : lc(col), size]); return null; }
  const sp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: col, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  sp.position.set(x, y, z); sp.scale.setScalar(size); (parent || scene).add(sp); return sp;
}
function fireBarrel(x, z) {
  mesh(new T.CylinderGeometry(.35, .35, 1, 12), STD(0x3a2a20, .6, .6), x, .5, z);
  addBox(x - .35, x + .35, z - .35, z + .35, 1).surf = 'metal';
  FIRES.push({ p: new T.Vector3(x, 1.05, z), s: .6 }); addLS(x, 1.8, z, 0xff7a1a, 3.2, 16, 1);
}
function barrier(x, z, rot) {
  const m = mesh(new T.BoxGeometry(rot ? .6 : 3, 1, rot ? 3 : .6), STD(0x8a8478, .9), x, .5, z);
  const st = mesh(new T.BoxGeometry(rot ? .62 : 3.02, .12, rot ? 3.02 : .62), STD(0xb81c1c, .45, .1, 0x5a0a0a, 1), x, .78, z);
  addBox(x - (rot ? .3 : 1.5), x + (rot ? .3 : 1.5), z - (rot ? 1.5 : .3), z + (rot ? 1.5 : .3), 1).surf = 'concrete';
}
function wreck(x, z, h) {
  const g = new T.Group(); const burnt = STD(0x151214, .9, .3);
  mesh(new T.BoxGeometry(2, .6, 4.4), burnt, 0, .55, 0, g); mesh(new T.BoxGeometry(1.7, .5, 2), burnt, 0, 1.1, .2, g).rotation.z = .1;
  for (const [a, b] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) mesh(new T.CylinderGeometry(.3, .3, .25, 10), STD(0x0a0a0a, .9), a, .28, b, g).rotation.z = Math.PI / 2;
  g.position.set(x, 0, z); g.rotation.y = h; g.rotation.z = rand(-.05, .05); scene.add(g);
  const c = Math.abs(Math.cos(h)), sn = Math.abs(Math.sin(h)); const hx = c * 1 + sn * 2.2, hz = sn * 1 + c * 2.2;
  addBox(x - hx, x + hx, z - hz, z + hz, 1.4).surf = 'metal';
  FIRES.push({ p: new T.Vector3(x, 1.2, z), s: 1.3 }); addLS(x, 2.2, z, 0xff6a10, 4, 20, 1);
}
function lamp(x, z, col) {
  const g = new T.Group(); mesh(new T.CylinderGeometry(.07, .1, 7, 8), STD(0x1a1a22, .5, .8), 0, 3.5, 0, g);
  mesh(new T.BoxGeometry(1.6, .1, .1), STD(0x1a1a22, .5, .8), .75, 6.9, 0, g); mesh(new T.BoxGeometry(.7, .08, .3), NEON(col), 1.4, 6.82, 0, g);
  g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z) + Math.PI / 2 + (Math.random() < .5 ? 0 : Math.PI); scene.add(g);
  addBox(x - .12, x + .12, z - .12, z + .12, 7, { noshoot: true });
  const hp = new T.Vector3(1.4, 6.8, 0).applyAxisAngle(new T.Vector3(0, 1, 0), g.rotation.y).add(g.position);
  addLS(hp.x, hp.y - .5, hp.z, col, 2.6, 20);
  const cone = new T.Mesh(new T.ConeGeometry(2.6, 6.6, 16, 1, true), ADD(col, .018, 1));
  cone.position.set(hp.x, 3.4, hp.z); scene.add(cone);
}
// (was also named streetProps, which city2.js's prop pass silently overrode: no lamps, parked cars or barricades were ever built)
function streetFurniture() {
  // lamps at alternating intersections
  for (let a = -HALF + CW; a < HALF; a += CW) for (let b = -HALF + CW; b < HALF; b += CW) {
    if (((a + b) / CW) % 2 !== 0) continue;
    const d = districtAt(a, b); const col = d === 3 ? 0xffa040 : d === 0 ? 0xffa860 : d === 1 ? 0xe6ecff : 0xffa050;
    if (d === 3) salemLantern(a + 6.6, b + 6.6); else lamp(a + 6.6, b + 6.6, col);
  }
  // parked cars (drivable) & wrecks
  const glowCols = [0xff2a6d, 0x05d9e8, 0xf3e600, 0xb04dff, 0x3dff6a];
  const nPark = G.quality === 'high' ? 20 : 12; let nWreck = 6;
  for (let k = 0; k < nPark + nWreck + 10; k++) {
    const alongX = srand() < .5, line = spick(ROADS.slice(1, -1)), t = sr(-HALF + 10, HALF - 10), side = srand() < .5 ? -3.3 : 3.3;
    const x = alongX ? t : line + side, z = alongX ? line + side : t;
    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;
    if (x > 186 && x < 214 && z < 0) continue;
    if (CARS.some(o => Math.abs(o.pos.x - x) < 3 && Math.abs(o.pos.z - z) < 6.5)) continue;
    if (CARS.length < nPark) CARS.push(new Car(x, z, alongX ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI), spick([0x1a1a22, 0x8a0a2a, 0x0a2a4a, 0xe8e8f0, 0x111111, 0x3a0a5a]), spick(glowCols)));
    else if (nWreck-- > 0) wreck(x, z, alongX ? Math.PI / 2 : 0);
  }
  // barricades + fire barrels at random intersections
  for (let k = 0; k < 16; k++) { const a = spick(ROADS.slice(1, -1)), b = spick(ROADS.slice(1, -1)); if (Math.abs(a) < 20 && Math.abs(b) < 20) continue; if (a === 200 && b < 0) continue; fireBarrel(a + sr(-4, 4), b + sr(-4, 4)); barrier(a + sr(-5, 5), b + sr(-5, 5), srand() < .5); }
}
function boundary() {
  const [c, x] = cvs(256, 128); x.fillStyle = '#16121c'; x.fillRect(0, 0, 256, 128);
  for (let i = -128; i < 256; i += 32) { x.fillStyle = '#c9b200'; x.beginPath(); x.moveTo(i, 128); x.lineTo(i + 16, 128); x.lineTo(i + 48, 96); x.lineTo(i + 32, 96); x.fill(); }
  x.fillStyle = '#ff1f3d'; x.font = "700 30px 'Chakra Petch', sans-serif"; x.fillText('SECTOR SEALED', 20, 50);
  const t = texFrom(c, true, true); t.repeat.set(30, 1);
  const mat = new T.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new T.Color(.22, .22, .22), roughness: .8, metalness: .2 });
  const W = 2 * HALF + 24, H = 22;
  [[0, -HALF - 9, W, 4], [0, HALF + 9, W, 4], [-HALF - 9, 0, 4, W], [HALF + 9, 0, 4, W]].forEach(([x0, z0, w, d]) => {
    const m = mesh(new T.BoxGeometry(w, H, d), mat, x0, H / 2, z0); addBox(x0 - w / 2, x0 + w / 2, z0 - d / 2, z0 + d / 2, H);
    mesh(new T.BoxGeometry(w, .3, d + .1), NEON(0x7a1010), x0, H, z0);
  });
}
function sky() {
  // a real overcast night sky (CC0 Poly Haven "Kloppenheim 07", upper hemisphere) graded per hour: dusk at 7 PM,
  // a blood moon reddening the cloud deck, sodium light pollution at the horizon matched to the fog, dawn at the end
  const moonDir = new T.Vector3(-.289, .625, -.724).normalize();
  const mat = new T.ShaderMaterial({
    uniforms: { map: { value: null }, hasMap: { value: 0 }, uOff: { value: .4111 }, expo: { value: .11 }, glow: { value: new T.Color(.08, .065, .05) }, moonDir: { value: moonDir }, moonCol: { value: new T.Color(1, .32, .24) }, dawn: { value: 0 }, dusk: { value: 0 }, flash: { value: 0 }, time: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform sampler2D map; uniform float hasMap, uOff, expo, dawn, dusk, flash, time; uniform vec3 glow, moonDir, moonCol;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
      void main(){
        vec3 d = normalize(vP); float y = d.y, el = max(y, 0.0);
        vec2 uv = vec2(atan(d.z, d.x) * .15915494 + .5 + uOff, clamp(asin(el) * .63661977, .004, .996));
        vec3 tx = texture2D(map, uv).rgb; vec3 cl = mix(vec3(.25, .27, .32) * (1.0 - el * .4), pow(tx, vec3(2.2)), hasMap);
        float md = max(dot(d, moonDir), 0.0);
        vec3 c = cl * expo * vec3(.92, .96, 1.08);
        c *= mix(vec3(1.0), moonCol * 2.2, smoothstep(.8, .995, md) * (1.0 - dawn));      // the moon reddens the clouds it lights
        float hz = 1.0 - smoothstep(0.0, .3, el);
        c = mix(c, glow, hz * hz * .9) + glow * .18 * (1.0 - smoothstep(0.0, .55, el)); // the city's own haze
        vec3 dk = mix(vec3(.55, .2, .08), vec3(.05, .07, .16), smoothstep(0.0, .45, el)); // 7 PM: last light in the west
        c = mix(c, c * .55 + dk * (.35 + .65 * smoothstep(.3, -1.0, d.x)) * cl * 1.6, dusk);
        vec3 dw = mix(vec3(1.0, .55, .35), vec3(.25, .35, .7), smoothstep(0.0, .6, el));
        c = mix(c, dw * (.6 + cl * .6), dawn);
        if (y < 0.0) c = mix(glow, glow * .6, smoothstep(0.0, -.25, y));
        c += flash * (cl * .9 + vec3(.04, .05, .08)) * smoothstep(-.05, .3, y);          // lightning inside the cloud deck
        float thin = 1.0 - smoothstep(.04, .12, dot(cl, vec3(.333)));
        c += step(.9972, h(floor(d * 460.0))) * smoothstep(.12, .5, el) * thin * .25 * (1.0 - dawn) * (1.0 - dusk);
        c += (h(vec3(gl_FragCoord.xy, time)) - .5) / 300.0;                                 // dither the 8-bit photo
        gl_FragColor = vec4(max(c, 0.0), 1.0); }`,
    side: T.BackSide, depthWrite: false, fog: false,
  });
  new T.TextureLoader().load('assets/sky/clouds.jpg', t => { t.wrapS = T.RepeatWrapping; t.minFilter = T.LinearFilter; t.generateMipmaps = false; mat.uniforms.map.value = t; mat.uniforms.hasMap.value = 1; });
  const sk = new T.Mesh(new T.SphereGeometry(1200, 48, 24), mat); sk.renderOrder = -10; sk.userData.dyn = 1; sk.frustumCulled = false; scene.add(sk); G.sky = mat;
  UPD.push((dt, t) => { sk.position.copy(camera.position); mat.uniforms.time.value = t % 100; mat.uniforms.glow.value.copy(scene.fog.color); });
  // blood moon: a soft disc behind thin cloud, where the photo's own moon is
  const [c, x] = cvs(256, 256); const g = x.createRadialGradient(110, 110, 10, 128, 128, 120); g.addColorStop(0, '#ff9a7a'); g.addColorStop(.7, '#c0283a'); g.addColorStop(1, '#5a0010');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 118, 0, TAU); x.fill();
  for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(60,0,10,${rand(.15, .4)})`; x.beginPath(); x.arc(rand(40, 216), rand(40, 216), rand(5, 22), 0, TAU); x.fill(); }
  const moonS = new T.Sprite(new T.SpriteMaterial({ map: texFrom(c, true), fog: false, depthWrite: false, toneMapped: false, transparent: true, opacity: .62 })); moonS.scale.setScalar(70);
  const moonG = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xff3040, fog: false, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: .3 })); moonG.scale.setScalar(360);
  moonS.renderOrder = moonG.renderOrder = -9; scene.add(moonS, moonG);
  UPD.push(() => { moonS.position.copy(camera.position).addScaledVector(moonDir, 1000); moonG.position.copy(moonS.position); const k = 1 - Math.max(G.dawn || 0, 0); moonS.material.opacity = .62 * k; moonG.material.opacity = .3 * k; });
  // searchlights: pale police/military beams sweeping the cloud deck
  for (const [x, z, col] of [[-200, -200, 0xdfe8ff], [200, -230, 0xdfe8ff], [220, 220, 0xffe6c8], [-220, 200, 0xdfe8ff]]) {
    const geo = new T.ConeGeometry(12, 420, 24, 1, true); geo.translate(0, -210, 0); geo.rotateX(Math.PI);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: lc(col), transparent: true, opacity: .035, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
    m.position.set(x, 0, z); m.userData.dyn = 1; scene.add(m); const ph = Math.random() * 10;
    UPD.push((dt, t) => { m.rotation.set(Math.sin(t * .23 + ph) * .45, 0, Math.cos(t * .17 + ph) * .45); });
  }
  // rain
  const N = G.quality === 'high' ? 1800 : 650;
  const rg = new T.BufferGeometry(); const rp = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) { const x = rand(-35, 35), y = rand(-5, 30), z = rand(-35, 35); rp.set([x, y, z, x + .05, y - .9, z + .05], i * 6); }
  rg.setAttribute('position', new T.BufferAttribute(rp, 3));
  const rain = new T.LineSegments(rg, new T.LineBasicMaterial({ color: 0xb4bcc8, transparent: true, opacity: .24, depthWrite: false })); rain.frustumCulled = false; scene.add(rain); G.rain = rain;
  UPD.push((dt) => {
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z; const a = rg.attributes.position.array; const sp = 32 * dt;
    for (let i = 0; i < N; i++) {
      const o = i * 6; a[o + 1] -= sp; a[o + 4] -= sp;
      if (a[o + 1] < cy - 6 || Math.abs(a[o] - cx) > 36 || Math.abs(a[o + 2] - cz) > 36) { const x = cx + rand(-35, 35), y = cy + rand(15, 30), z = cz + rand(-35, 35); a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = x + .05; a[o + 4] = y - .9; a[o + 5] = z + .05; }
    }
    rg.attributes.position.needsUpdate = true; rg.setDrawRange(0, Math.round(N * clamp(G.rainK, 0, 1)) * 2); rain.material.opacity = .14 + .12 * G.rainK;
  });
}
function centerHolo() {
  const g = new T.Group(); g.position.set(0, 46, 0); g.userData.dyn = 1; scene.add(g);
  let ringM = NEON(0xff2a6d), ringC = NEON(0x05d9e8);
  const r1 = mesh(new T.TorusGeometry(14, .25, 6, 64), ringM, 0, 0, 0, g); const r2 = mesh(new T.TorusGeometry(11, .18, 6, 64), ringC, 0, 0, 0, g);
  const [c, x] = cvs(512, 256); const t = texFrom(c, true);
  const pl = mesh(new T.PlaneGeometry(22, 11), new T.MeshBasicMaterial({ map: t, transparent: true, side: T.DoubleSide, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending }), 0, 0, 0, g);
  // (the pink light column under the hologram was removed: it read as a cylinder sitting in the intersection)
  G.holoDraw = (txt, sub) => {
    x.clearRect(0, 0, 512, 256); x.textAlign = 'center'; x.shadowColor = '#ff2a6d'; x.shadowBlur = 20; x.fillStyle = '#ffd0e0';
    x.font = "120px 'Share Tech Mono', monospace"; x.fillText(txt, 256, 150); x.font = "600 28px 'Chakra Petch', sans-serif"; x.fillStyle = '#05d9e8'; x.shadowColor = '#05d9e8'; x.fillText(sub, 256, 210);
    for (let y = 0; y < 256; y += 4) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, y, 512, 2); }
    t.needsUpdate = true;
  };
  G.holoDraw('19:00', 'RED NIGHT · 12 HOURS');
  addLS(0, 30, 0, 0xff2a6d, 3, 40); const ls = LS[LS.length - 1];
  const augHolo = a => { const k = smooth01((a - .25) / .5); g.visible = k > .01; ls.i = 3 * k; ringM.color.copy(lc(0xff2a6d)).multiplyScalar(k); ringC.color.copy(lc(0x05d9e8)).multiplyScalar(k); };
  ringM = NEON(0xff2a6d).clone(); ringC = NEON(0x05d9e8).clone(); r1.material = ringM; r2.material = ringC;
  AUG_HOOKS.push(augHolo); augHolo(G.aug);
  UPD.push((dt, tt) => { if (!g.visible) return; g.rotation.y += dt * .25; r1.rotation.x = Math.sin(tt * .5) * .6 + Math.PI / 2; r2.rotation.y = tt * .7; pl.material.opacity = (.8 + Math.sin(tt * 13) * .08 * (Math.random() < .05 ? 4 : 1)) * smooth01((G.aug - .25) / .5); });
}
function billboards() {
  const ads = [
    [['STAY INSIDE', 'OR DON’T. NOBODY’S COMING.', 'CITY ALERT 19:00 — 07:00'], '#ff1f3d', '#f3e600', 'XII'],
    [['CLEAR EYES OPTICAL', 'SEE THEM BEFORE THEY SEE YOU', 'NIGHT SCOPES 40% OFF TONIGHT'], '#05d9e8', '#ff2a6d', '◉'],
    [['BLESS THE NIGHT', 'RELEASE · RESET · RENEW', 'A MESSAGE FROM THE COUNCIL'], '#b04dff', '#ffffff', '☾'],
    [['NILE COLA', 'ICE COLD IN THE HEAT', 'CAIRO · SINCE 1952'], '#f3a600', '#05d9e8', '𓂀'],
    [['GOLD RUSH ARMS', 'EVERY GUN. EVERY NIGHT.', 'K ST · SACRAMENTO'], '#f3e600', '#ff2a6d', '$'],
    [['TWICE AS NICE', 'TEXARKANA · TX | AR', 'ONE CITY TWO STATES'], '#ff2a6d', '#05d9e8', '⇄'],
    [['HEX & BREW', 'CURSES REMOVED WHILE U WAIT', 'SALEM · OPEN TILL DAWN'], '#3dff6a', '#b04dff', '✶'],
    [['SYNTH SKIN', 'LOOK HUMAN. MOSTLY.', 'CLINIC 24/7'], '#ff2a6d', '#f3e600', '◈'],
  ];
  const spots = [[-60, -100, 0], [80, -60, 1], [-100, -180, 3], [-180, -100, 2], [140, -180, 1], [160, 140, 0], [60, 60, 3], [-140, 140, 2], [-60, 60, 1], [120, 200, 0]];
  spots.forEach(([x, z, r], k) => {
    const a = ads[k % ads.length]; const tex = makeBillboard(a[0], a[1], a[2], a[3]);
    const g = new T.Group(); g.position.set(x + 20 * (r === 1 ? 1 : r === 3 ? -1 : 0), 0, z + 20 * (r === 0 ? 1 : r === 2 ? -1 : 0)); g.rotation.y = r * Math.PI / 2; scene.add(g);
    const y = sr(14, 26);
    const pl = mesh(new T.PlaneGeometry(14, 7), new T.MeshBasicMaterial({ map: tex, toneMapped: false, side: T.DoubleSide }), 0, y, 0, g);
    mesh(new T.BoxGeometry(14.4, 7.4, .3), STD(0x111018, .5, .7), 0, y, -.2, g);
    mesh(new T.CylinderGeometry(.25, .25, y - 3.5, 8), STD(0x1a1a22, .5, .8), 0, (y - 3.5) / 2, -.4, g);
    const wp = new T.Vector3(); pl.getWorldPosition(wp); addLS(wp.x, wp.y - 3, wp.z, new T.Color(a[1]), 3, 30);
    const ph = Math.random() * 9; UPD.push((dt, t) => { const f = Math.sin(t * 31 + ph) > 1.02 - G.aug * .06 ? .3 : .82; pl.material.color.setScalar(f); });
  });
}
/* ---------- district landmarks ---------- */
function minaret(x, z, h, col) {
  const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
  const st = STD(0xc9a87a, .8);
  mesh(new T.CylinderGeometry(1.3, 1.6, h, 12), st, 0, h / 2, 0, g);
  mesh(new T.CylinderGeometry(2, 2, .4, 16), st, 0, h * .78, 0, g); mesh(new T.TorusGeometry(2, .08, 6, 24), NEON(col), 0, h * .78 + .25, 0, g).rotation.x = Math.PI / 2;
  mesh(new T.CylinderGeometry(1, 1.2, h * .2, 12), st, 0, h * .9, 0, g); mesh(new T.ConeGeometry(1.2, 4, 12), STD(0x2a9a8a, .3, .8), 0, h + 2, 0, g);
  mesh(new T.SphereGeometry(.3, 8, 6), NEON(col), 0, h + 4.2, 0, g);
  addBox(x - 1.6, x + 1.6, z - 1.6, z + 1.6, h); addLS(x, h * .8, z, col, 2.5, 22);
}
function cairoLandmarks() {
  // citadel mosque plaza at (-140,-140)
  const cx = -140, cz = -140;
  if (!placeLM('cairo', -140, -140, 30, 0, 0)) {
  const st = STD(0xd9b98a, .85);
  mesh(new T.BoxGeometry(22, 14, 22), st, cx, 7, cz); addBox(cx - 11, cx + 11, cz - 11, cz + 11, 14);
  mesh(new T.CylinderGeometry(7.6, 8, 3, 24), st, cx, 15.5, cz);
  mesh(new T.SphereGeometry(7.6, 32, 16, 0, TAU, 0, Math.PI / 2), STD(0x2aa090, .25, .85), cx, 17, cz);
  mesh(new T.TorusGeometry(7.7, .15, 6, 48), NEON(0xf3a600), cx, 17, cz).rotation.x = Math.PI / 2;
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { mesh(new T.SphereGeometry(2.4, 16, 8, 0, TAU, 0, Math.PI / 2), STD(0x2aa090, .25, .85), cx + a * 7.5, 14, cz + b * 7.5); }
  minaret(cx - 13, cz - 13, 38, 0x9affb4); minaret(cx + 13, cz - 13, 38, 0x9affb4);
  // arches on the facade
  for (let i = -2; i <= 2; i++) mesh(new T.BoxGeometry(2.2, 5, .2), NEON(0xff8a2a), cx + i * 4, 3, cz + 11.1);
  addLS(cx, 6, cz + 13, 0xf3a600, 3, 26);
  }
  minaret(-60, -200, 30, 0x9affb4); minaret(-200, -60, 28, 0xffe0b0); minaret(-100, -60, 26, 0x9affb4);
  // bazaar canopies along x=-80 and z=-100
  const cols = [0xff2a6d, 0xf3a600, 0x05d9e8, 0xb04dff, 0x3dff6a];
  for (let k = 0; k < 18; k++) {
    const along = k % 2 === 0; const t = -220 + k * 11; const x = along ? -80 + (k % 4 < 2 ? -7.2 : 7.2) : t + 4, z = along ? t : -100 + (k % 4 < 2 ? -7.2 : 7.2);
    if (x > -6 || z > -6) continue;
    const col = spick(cols);
    const c = mesh(new T.PlaneGeometry(along ? 2.6 : 5, along ? 5 : 2.6), new T.MeshStandardMaterial({ color: lc(col), emissive: lc(col), emissiveIntensity: .1, side: T.DoubleSide, roughness: .9 }), x, 3.2, z);
    c.rotation.x = -Math.PI / 2 + (along ? 0 : .25); if (along) c.rotation.y = x < -80 ? -.25 : .25;
    for (let l = 0; l < 6; l++) glowSprite(x + (along ? 0 : -2 + l * .8), 3.0, z + (along ? -2 + l * .8 : 0), lc(0xffd27a), .5);
    if (k % 3 === 0) addLS(x, 2.8, z, col, 1.8, 12);
  }
  // pyramids on the horizon (beyond the fog, unfogged neon outlines)
  for (const [x, z, r, h] of [[-640, -560, 210, 230], [-430, -780, 150, 160], [-820, -340, 120, 130]]) {
    const geo = new T.ConeGeometry(r, h, 4, 1); geo.rotateY(Math.PI / 4);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x0b0907, fog: false })); m.position.set(x, h / 2 - 2, z); scene.add(m);
    const e = new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color: 0xf3a600, fog: false, transparent: true, opacity: .8 })); e.position.copy(m.position); e.userData.dyn = 1; scene.add(e);
    const cap = glowSprite(x, h - 2, z, lc(0xf3e600), 60, scene); cap.material.fog = false;
    const augPyr = a => { const k = augShare(a); e.visible = cap.visible = k > .01; e.material.opacity = .8 * k; cap.material.opacity = k; };
    AUG_HOOKS.push(augPyr); augPyr(G.aug);
  }
}
function sacLandmarks() {
  // river (x 188..212, z -240..0) with the gold lift bridge at z=-120
  const water = new T.Mesh(new T.PlaneGeometry(24, 234), new T.MeshStandardMaterial({ color: lc(0x041824), roughness: .05, metalness: 1, envMapIntensity: 2 }));
  water.rotation.x = -Math.PI / 2; water.position.set(200, .05, -123); scene.add(water);
  addBox(188, 212, -240, -126, .6, { water: true, noshoot: true }); addBox(188, 212, -114, -6, .6, { water: true, noshoot: true });
  mesh(new T.BoxGeometry(24, .4, 12), STD(0x3a3a42, .7, .4), 200, .2, -120);
  if (!placeLM('bridge', 200, -120, 44, 0, -5.0)) {
const gold = STD(0xc9a24a, .3, .9);
  for (const x of [190, 210]) for (const z of [-126.5, -113.5]) { mesh(new T.BoxGeometry(2.4, 32, 2.4), gold, x, 16, z); addBox(x - 1.2, x + 1.2, z - 1.2, z + 1.2, 32); }
  mesh(new T.BoxGeometry(22, 2.2, 14), gold, 200, 22, -120); for (const z of [-126.5, -113.5]) mesh(new T.BoxGeometry(22, .2, .2), NEON(0xf3e600), 200, 23.3, z);
  mesh(new T.BoxGeometry(.25, .9, 12), NEON(0xf3e600), 188.2, .9, -120); mesh(new T.BoxGeometry(.25, .9, 12), NEON(0xf3e600), 211.8, .9, -120);
  addLS(200, 20, -120, 0xf3e600, 3.5, 34);
  }
  // capitol at (100,-140)
  const cx = 100, cz = -140; const wh = STD(0xe8e2d8, .6);
  if (!placeLM('capitol', 100, -140, 27, 0, 0)) {
mesh(new T.BoxGeometry(26, 14, 18), wh, cx, 7, cz); addBox(cx - 13, cx + 13, cz - 9, cz + 9, 14);
  for (let i = -5; i <= 5; i++) { mesh(new T.CylinderGeometry(.45, .5, 11, 10), wh, cx + i * 2.2, 5.5, cz + 10); }
  mesh(new T.BoxGeometry(26, 1.5, 3), wh, cx, 11.8, cz + 10); addBox(cx - 13, cx + 13, cz + 9, cz + 11, 12.5);
  mesh(new T.CylinderGeometry(5.5, 6, 6, 24), wh, cx, 17, cz); mesh(new T.SphereGeometry(5.5, 32, 16, 0, TAU, 0, Math.PI / 2), STD(0xf0ece4, .4, .3), cx, 20, cz);
  mesh(new T.SphereGeometry(.9, 12, 8), STD(0xd4a43a, .2, 1), cx, 26.4, cz); glowSprite(cx, 26.4, cz, lc(0xf3e600), 6);
  addLS(cx, 10, cz + 14, 0x9fe8ff, 3, 28);
  }
  // palms along k street (z=-80) and x=40
  for (let k = 0; k < 26; k++) { const along = k < 13; const t = 12 + (k % 13) * 17; palm(along ? t : 40 + (k % 2 ? 7 : -7), along ? -80 + (k % 2 ? 7 : -7) : -t); }
}
const palmTrunks = [], palmLeaves = [];
function palm(x, z) {
  const h = sr(8, 13), lean = sr(-.12, .12);
  palmTrunks.push([x, z, h, lean]);
  const top = new T.Vector3(x + Math.sin(lean) * h, h, z);
  for (let i = 0; i < 7; i++) palmLeaves.push([top.x, top.y, top.z, i / 7 * TAU + srand()]);
  addBox(x - .25, x + .25, z - .25, z + .25, h, { noshoot: true });
}
function texLandmarks() {
  // state line down x=120 (z 0..240): painted neon line + labels
  const line = mesh(new T.PlaneGeometry(.4, 240), STD(0xd8b820, .55, 0, 0x3a3000, 1), 120, .05, 120); line.rotation.x = -Math.PI / 2;
  for (let z = 20; z < 240; z += 60) {
    for (const [txt, side] of [['TEXAS', -1], ['ARKANSAS', 1]]) {
      const [c, x] = cvs(512, 128); x.font = "700 80px 'Chakra Petch', sans-serif"; x.fillStyle = '#e8d24a'; x.textAlign = 'center'; x.fillText(txt, 256, 95);
      const p = mesh(new T.PlaneGeometry(9, 2.25), new T.MeshStandardMaterial({ map: texFrom(c, true), transparent: true, depthWrite: false, roughness: .6, emissive: lc(0x2a2400), emissiveMap: texFrom(c, true) }), 120 + side * 3.5, .06, z);
      p.rotation.x = -Math.PI / 2; p.rotation.z = Math.PI / 2;
    }
  }
  // federal building straddling the line at (120,100)
  const cx = 120, cz = 100; const st = STD(0xb8b0a0, .75);
  if (!placeLM('tex', 120, 100, 30, Math.PI, 0)) {
mesh(new T.BoxGeometry(30, 16, 22), st, cx, 8, cz); addBox(cx - 15, cx + 15, cz - 11, cz + 11, 16);
  for (let i = -6; i <= 6; i++) mesh(new T.CylinderGeometry(.5, .55, 12, 10), st, cx + i * 2.2, 6, cz - 12);
  mesh(new T.BoxGeometry(30, 2, 3), st, cx, 13, cz - 12.4); addBox(cx - 15, cx + 15, cz - 14, cz - 11, 14);
  mesh(new T.BoxGeometry(.3, 16.2, 22.2), STD(0xd8b820, .5, .2), cx, 8, cz);
  const [c, x] = cvs(1024, 128); x.font = "700 64px 'Chakra Petch', sans-serif"; x.fillStyle = '#f4ead6'; x.shadowColor = '#ffcf8a'; x.shadowBlur = 6; x.textAlign = 'center'; x.fillText('STATE LINE POST OFFICE · TX | AR', 512, 88);
  const sg = mesh(new T.PlaneGeometry(26, 3.25), new T.MeshBasicMaterial({ map: texFrom(c, true), transparent: true, toneMapped: false }), cx, 15, cz - 14.05); sg.rotation.y = Math.PI;
  addLS(cx, 10, cz - 16, 0xffd9a8, 3, 26);
  }
  // rail line along z=200 with a stopped freight train
  const rail = STD(0x3a3a3a, .4, .9);
  for (const off of [-.75, .75]) { const r = mesh(new T.BoxGeometry(240, .15, .12), rail, 120, .08, 200 + off); }
  for (let k = 0; k < 6; k++) {
    const x = 18 + k * 15.5; const col = spick([0x5a1a10, 0x1a2a3a, 0x3a3a1a, 0x2a1a3a]);
    const bc = mesh(new T.BoxGeometry(14, 4, 3.2), STD(col, .8, .3), x, 2.6, 200); addBox(x - 7, x + 7, 198.4, 201.6, 4.6);
    const [gc, gx] = cvs(256, 64); gx.font = "48px 'Rubik Glitch', Impact, sans-serif"; gx.fillStyle = spick(['#ff2a6d', '#05d9e8', '#f3e600', '#3dff6a']); gx.fillText(spick(['RED NITE', 'TXK', 'NO GODS', 'PURGE', 'ARKTEX', '1692']), 10, 50);
    const gr = mesh(new T.PlaneGeometry(12, 3), new T.MeshBasicMaterial({ map: texFrom(gc, true), transparent: true }), x, 2.6, 198.35); gr.rotation.y = Math.PI;
  }
  // water tower at (180,60)
  const wx = 180, wz = 60;
  for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { mesh(new T.CylinderGeometry(.25, .25, 22, 6), rail, wx + a, 11, wz + b); addBox(wx + a - .3, wx + a + .3, wz + b - .3, wz + b + .3, 22); }
  mesh(new T.CylinderGeometry(6, 6, 7, 24), STD(0xd8d4cc, .6, .4), wx, 25, wz); mesh(new T.ConeGeometry(6.2, 3, 24), STD(0x8a8a8a, .6, .6), wx, 30, wz);
  const [tc, tx] = cvs(512, 128); tx.font = "700 72px 'Chakra Petch', sans-serif"; tx.fillStyle = '#7a1a14'; tx.textAlign = 'center'; tx.fillText('TEXARKANA', 256, 92);
  const tt = texFrom(tc, true); const ring = new T.Mesh(new T.CylinderGeometry(6.05, 6.05, 2.4, 32, 1, true), new T.MeshStandardMaterial({ map: tt, transparent: true, roughness: .7 })); ring.position.set(wx, 25, wz); scene.add(ring); tt.wrapS = T.RepeatWrapping; tt.repeat.set(2, 1);
  addLS(wx, 18, wz, 0xfff0d8, 2.5, 24); // floodlight on the tank
  // second plaza
  plaza(46, 74, 166, 194, 2);
}
const deadTrees = [];
function salemLantern(x, z) {
  const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
  mesh(new T.CylinderGeometry(.06, .09, 4, 8), STD(0x0a0a0a, .4, .8), 0, 2, 0, g);
  mesh(new T.BoxGeometry(.45, .6, .45), STD(0x0a0a0a, .4, .8), 0, 4.2, 0, g); mesh(new T.BoxGeometry(.35, .45, .35), NEON(0xffa040), 0, 4.2, 0, g);
  glowSprite(x, 4.2, z, lc(0xffa040), 2.4); addLS(x, 4, z, 0xffa040, 2.4, 16, .3); addBox(x - .12, x + .12, z - .12, z + .12, 4.5, { noshoot: true });
}
function salemLandmarks() {
  // Old burying point (-100,100)
  const cx = -100, cz = 100; const fence = STD(0x0a0a0c, .5, .8);
  const stones = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), STD(0x6a6a72, .95), 46); const mt = new T.Matrix4(); let n = 0;
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { if (n >= 46 || srand() < .1) continue; const h = sr(.8, 1.6); mt.compose(new T.Vector3(cx + i * 3.4 + sr(-.4, .4), h / 2, cz + j * 3.4), new T.Quaternion().setFromEuler(new T.Euler(sr(-.15, .15), sr(-.3, .3), sr(-.15, .15))), new T.Vector3(sr(.7, 1.1), h, .2)); stones.setMatrixAt(n++, mt); }
  stones.count = n; stones.frustumCulled = false; scene.add(stones);
  for (let k = 0; k < 4; k++) { const side = k; const L = 28; const fm = mesh(new T.BoxGeometry(side % 2 ? .1 : L, 1.6, side % 2 ? L : .1), new T.MeshStandardMaterial({ color: lc(0x0a0a0c), metalness: .8, roughness: .4, transparent: true, opacity: .9 }), cx + (side === 1 ? 14 : side === 3 ? -14 : 0), .8, cz + (side === 0 ? -14 : side === 2 ? 14 : 0)); }
  addBox(cx - 14.1, cx - 13.9, cz - 14, cz + 14, 1.6); addBox(cx + 13.9, cx + 14.1, cz - 14, cz + 14, 1.6); addBox(cx - 14, cx - 3, cz + 13.9, cz + 14.1, 1.6); addBox(cx + 3, cx + 14, cz + 13.9, cz + 14.1, 1.6); addBox(cx - 14, cx + 14, cz - 14.1, cz - 13.9, 1.6);
  for (let k = 0; k < 7; k++) deadTree(cx + sr(-12, 12), cz + sr(-12, 12));
  witchCircle(cx, cz + 4);
  // The black witch house (-180,60)
  const hx = -180, hz = 60; const blk = STD(0x121014, .85);
  if (!placeLM('salem', -180, 60, 22, 0, 0)) {
mesh(new T.BoxGeometry(16, 10, 14), blk, hx, 5, hz); addBox(hx - 8, hx + 8, hz - 7, hz + 7, 10);
  for (const [a, rot] of [[-4, 0], [4, 0]]) { const r = mesh(new T.ConeGeometry(5.5, 9, 4), blk, hx + a, 14.5, hz); r.rotation.y = Math.PI / 4; }
  for (let i = -2; i <= 2; i++) mesh(new T.BoxGeometry(1.2, 1.8, .1), NEON(0xffa040), hx + i * 3, 6, hz + 7.05);
  addLS(hx, 6, hz + 9, 0xffa040, 2.5, 18, .4);
  }
  witchCircle(hx, hz + 16);
  // witch museum castle (-60,180)
  const mx = -60, mz = 180; const sst = STD(0x5a4a5a, .9);
  mesh(new T.BoxGeometry(20, 14, 14), sst, mx, 7, mz); addBox(mx - 10, mx + 10, mz - 7, mz + 7, 14);
  for (const a of [-10, 10]) { mesh(new T.CylinderGeometry(2.4, 2.6, 22, 10), sst, mx + a, 11, mz - 7); mesh(new T.ConeGeometry(3, 8, 10), STD(0x1a1020, .8), mx + a, 26, mz - 7); addBox(mx + a - 2.6, mx + a + 2.6, mz - 9.6, mz - 4.4, 22); mesh(new T.SphereGeometry(.4, 8, 6), NEON(0xb04dff), mx + a, 30.3, mz - 7); }
  mesh(new T.CircleGeometry(3.2, 24), NEON(0xb04dff), mx, 9, mz - 7.05).rotation.y = Math.PI;
  addLS(mx, 9, mz - 10, 0xb04dff, 3.5, 28);
  witchCircle(mx, mz - 18); witchCircle(-200, 200);
  for (let k = 0; k < 18; k++) deadTree(sr(-235, -10), sr(10, 235), true);
  // fireflies / will-o-wisps
  UPD.push((dt, t) => {
    if (G.dist !== 3 || Math.random() > .5) return;
    const p = camera.position; FXA.emit(p.x + rand(-25, 25), rand(.5, 4), p.z + rand(-25, 25), rand(-.3, .3), rand(-.1, .3), rand(-.3, .3), rand(2, 4), .12, .05, Math.random() < .5 ? COL.green : COL.purple, .9, 0, 0);
  });
}
function deadTree(x, z, checkFree) {
  if (checkFree) { const near = boxesNear(x, z).some(b => x > b.x0 - 1 && x < b.x1 + 1 && z > b.z0 - 1 && z < b.z1 + 1); if (near) return; const lx = (x + HALF) % CW, lz = (z + HALF) % CW; if (lx < 7 || lx > 33 || lz < 7 || lz > 33) return; }
  deadTrees.push([x, z, sr(4, 7), srand() * TAU]); addBox(x - .2, x + .2, z - .2, z + .2, 4, { noshoot: true });
}
function witchCircle(x, z) {
  const [c, cx] = cvs(256, 256); cx.translate(128, 128); cx.strokeStyle = '#c070ff'; cx.shadowColor = '#b04dff'; cx.shadowBlur = 10; cx.lineWidth = 4;
  cx.beginPath(); cx.arc(0, 0, 118, 0, TAU); cx.stroke(); cx.beginPath(); cx.arc(0, 0, 96, 0, TAU); cx.stroke();
  cx.font = "22px 'Share Tech Mono', monospace"; cx.fillStyle = '#e0b0ff';
  const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'; for (let i = 0; i < 18; i++) { cx.save(); cx.rotate(i / 18 * TAU); cx.fillText(runes[i % runes.length], -6, -100); cx.restore(); }
  cx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU * 3; cx.lineTo(Math.cos(a) * 92, Math.sin(a) * 92); } cx.closePath(); cx.stroke();
  const m = new T.Mesh(new T.PlaneGeometry(9, 9), new T.MeshBasicMaterial({ map: texFrom(c, true), transparent: true, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, .06, z); m.userData.dyn = 1; scene.add(m);
  UPD.push((dt, t) => { m.rotation.z += dt * .2; m.material.opacity = .7 + Math.sin(t * 2 + x) * .3; });
  addLS(x, 1, z, 0xb04dff, 2.5, 14, .2); WITCH_CIRCLES.push(new T.Vector3(x, 0, z));
}
function finishVegetation() {
  const mt = new T.Matrix4(), qq = new T.Quaternion(), e = new T.Euler();
  if (palmTrunks.length) {
    const tg = new T.CylinderGeometry(.18, .3, 1, 7); tg.translate(0, .5, 0);
    const ti = new T.InstancedMesh(tg, STD(0x4a3a2a, .9), palmTrunks.length);
    palmTrunks.forEach((p, k) => { qq.setFromEuler(e.set(0, 0, -p[3])); mt.compose(new T.Vector3(p[0], 0, p[1]), qq, new T.Vector3(1, p[2], 1)); ti.setMatrixAt(k, mt); }); ti.frustumCulled = false; scene.add(ti);
    const lg = new T.ConeGeometry(.5, 4.2, 4); lg.rotateX(Math.PI / 2); lg.translate(0, 0, 2); lg.scale(1, .15, 1);
    const li = new T.InstancedMesh(lg, STD(0x1a5a3a, .7, 0, 0x0a3a2a, .4), palmLeaves.length);
    palmLeaves.forEach((l, k) => { qq.setFromEuler(e.set(.5, l[3], 0, 'YXZ')); mt.compose(new T.Vector3(l[0], l[1], l[2]), qq, new T.Vector3(1, 1, 1)); li.setMatrixAt(k, mt); }); li.frustumCulled = false; scene.add(li);
  }
  if (deadTrees.length) {
    const tg = new T.CylinderGeometry(.06, .22, 1, 6); tg.translate(0, .5, 0);
    const n = deadTrees.length * 4; const ti = new T.InstancedMesh(tg, STD(0x1a1418, .95), n); let k = 0;
    for (const d of deadTrees) {
      mt.compose(new T.Vector3(d[0], 0, d[1]), qq.identity(), new T.Vector3(1, d[2], 1)); ti.setMatrixAt(k++, mt);
      for (let b = 0; b < 3; b++) { qq.setFromEuler(e.set(sr(.6, 1.1), d[3] + b * 2.1, 0, 'YXZ')); mt.compose(new T.Vector3(d[0], d[2] * sr(.5, .85), d[1]), qq, new T.Vector3(.6, d[2] * .45, .6)); ti.setMatrixAt(k++, mt); }
    }
    ti.frustumCulled = false; scene.add(ti);
  }
}

/* ---------- the apartment you wake up in ---------- */
const APT = new T.Vector3(1500, 0, 0);
const WALL_SLOTS = [];
function buildApartment() {
  const ax = APT.x, az = APT.z; const g = new T.Group(); g.position.copy(APT); scene.add(g);
  const W = 10, D = 8, H = 3.2;
  const wallM = STD(0x2a2433, .85), floorM = new T.MeshStandardMaterial({ color: lc(0x3a2a22), roughness: .45, metalness: .1 });
  const fl = mesh(new T.PlaneGeometry(W, D), floorM, 0, 0.01, 0, g); fl.rotation.x = -Math.PI / 2;
  const ce = mesh(new T.PlaneGeometry(W, D), STD(0x1a1622, .9), 0, H, 0, g); ce.rotation.x = Math.PI / 2;
  // walls (inner faces)
  const wN = mesh(new T.PlaneGeometry(W, H), STD(0x15121c, .6, .3), 0, H / 2, -D / 2, g);
  const wS = mesh(new T.PlaneGeometry(W, H), wallM, 0, H / 2, D / 2, g); wS.rotation.y = Math.PI;
  const wW = mesh(new T.PlaneGeometry(D, H), wallM, -W / 2, H / 2, 0, g); wW.rotation.y = Math.PI / 2;
  const wE = mesh(new T.PlaneGeometry(D, H), wallM, W / 2, H / 2, 0, g); wE.rotation.y = -Math.PI / 2;
  addBox(ax - W / 2 - 1, ax + W / 2 + 1, az - D / 2 - 1, az - D / 2, 4); addBox(ax - W / 2 - 1, ax + W / 2 + 1, az + D / 2, az + D / 2 + 1, 4);
  addBox(ax - W / 2 - 1, ax - W / 2, az - D / 2, az + D / 2, 4); addBox(ax + W / 2, ax + W / 2 + 1, az - D / 2, az + D / 2, 4);
  addBox(ax - W / 2 - 1, ax + W / 2 + 1, az - D / 2 - 1, az + D / 2 + 1, 5, { y0: H });
  // window on the west wall looking out on the neon skyline
  const [wc, wx] = cvs(512, 256); const gg = wx.createLinearGradient(0, 0, 0, 256); gg.addColorStop(0, '#0d0f15'); gg.addColorStop(1, '#3a2c24'); wx.fillStyle = gg; wx.fillRect(0, 0, 512, 256);
  wx.fillStyle = '#c0182a'; wx.beginPath(); wx.arc(400, 50, 22, 0, TAU); wx.fill();
  for (let i = 0; i < 40; i++) { const bw = rand(14, 40), bh = rand(60, 220), bx = rand(0, 512); wx.fillStyle = '#07040c'; wx.fillRect(bx, 256 - bh, bw, bh); for (let k = 0; k < 20; k++) { wx.fillStyle = pick(['#ffcf8a', '#ffe6b8', '#ffd9a0', '#c8d8ff']); wx.globalAlpha = rand(.3, 1); wx.fillRect(bx + rand(2, bw - 4), 256 - rand(4, bh), 2, 2); } wx.globalAlpha = 1; }
  const win = mesh(new T.PlaneGeometry(3.6, 1.8), new T.MeshBasicMaterial({ map: texFrom(wc, true), toneMapped: false }), -W / 2 + .02, 1.8, .4, g); win.rotation.y = Math.PI / 2;
  for (let i = 0; i < 4; i++) mesh(new T.BoxGeometry(.05, 1.8, .04), STD(0x0a0a0a, .5, .5), -W / 2 + .05, 1.8, .4 - 1.35 + i * .9, g);
  // bed (player wakes here, south-west corner)
  mesh(new T.BoxGeometry(1.8, .45, 2.2), STD(0x1a1420, .8), -3.6, .22, 2.6, g); mesh(new T.BoxGeometry(1.7, .2, 2.1), STD(0x5a1a3a, .9), -3.6, .52, 2.6, g);
  mesh(new T.BoxGeometry(.7, .14, .45), STD(0xd8d0e0, .9), -3.6, .68, 3.4, g); addBox(ax - 4.5, ax - 2.7, az + 1.5, az + 3.7, .62);
  // TV with the emergency broadcast
  const [tc, tx] = cvs(512, 288); const tvTex = texFrom(tc, true);
  const tv = mesh(new T.PlaneGeometry(1.9, 1.07), new T.MeshBasicMaterial({ map: tvTex, toneMapped: false }), W / 2 - .06, 1.7, 2.2, g); tv.rotation.y = -Math.PI / 2;
  mesh(new T.BoxGeometry(.06, 1.15, 2), STD(0x050505, .3, .6), W / 2 - .03, 1.7, 2.2, g);
  UPD.push((dt, t) => {
    if (G.state !== 'apt' && G.state !== 'title') return; if (Math.floor(t * 8) % 2) return;
    tx.fillStyle = '#1a0004'; tx.fillRect(0, 0, 512, 288); tx.fillStyle = Math.floor(t * 2) % 2 ? '#ff1f3d' : '#7a0010'; tx.fillRect(0, 0, 512, 54);
    tx.fillStyle = '#fff'; tx.font = "700 30px 'Chakra Petch', sans-serif"; tx.fillText('CITY ALERT · RED NIGHT', 18, 38);
    tx.font = "22px 'Share Tech Mono', monospace"; tx.fillStyle = '#ffd0d8';
    ['Police, fire and medical are offline', 'from 19:00 until 07:00.', 'Reports: possession, bloodletting,', 'things wearing faces. Lock your door.', '', 'Or come out and play.'].forEach((l, i) => tx.fillText(l, 18, 92 + i * 30));
    for (let y = 0; y < 288; y += 3) { tx.fillStyle = 'rgba(0,0,0,.25)'; tx.fillRect(0, y + (t * 40 % 3), 512, 1); }
    tvTex.needsUpdate = true;
  });
  // weapons wall on the north wall: pegboard, LED strips, one weapon per class
  const board = mesh(new T.BoxGeometry(8.4, 2.5, .08), STD(0x111016, .5, .6), 0, 1.65, -D / 2 + .05, g);
  mesh(new T.BoxGeometry(8.4, .04, .04), NEON(0xff2a6d), 0, 2.92, -D / 2 + .1, g); mesh(new T.BoxGeometry(8.4, .04, .04), NEON(0x05d9e8), 0, .38, -D / 2 + .1, g);
  const [hc, hx] = cvs(256, 64); hx.font = "40px 'Rubik Glitch', Impact, sans-serif"; hx.fillStyle = '#f3e600'; hx.shadowColor = '#f3e600'; hx.shadowBlur = 10; hx.textAlign = 'center'; hx.fillText('ARSENAL', 128, 46);
  mesh(new T.PlaneGeometry(2.4, .6), new T.MeshBasicMaterial({ map: texFrom(hc, true), transparent: true, toneMapped: false }), 0, 3.12 - .25, -D / 2 + .12, g).scale.set(.8, .8, 1);
  CLS.forEach((cl, k) => {
    const col = k % 4, row = Math.floor(k / 4); const px = -3.15 + col * 2.1, py = row === 0 ? 2.25 : 1.05;
    const w = W_(cl.wall); const built = buildWeapon(w, null, true);
    const holder = new T.Group(); holder.position.set(px, py, -D / 2 + .22); holder.rotation.y = Math.PI / 2; holder.add(built.g);
    const s = cl.id === 'pistol' || cl.id === 'special' ? 2.2 : cl.id === 'melee' ? 1.25 : 1.35; holder.scale.setScalar(s);
    if (cl.id === 'melee') { holder.rotation.z = .2; }
    g.add(holder);
    const [lc_, lx] = cvs(256, 48); lx.font = "600 28px 'Chakra Petch', sans-serif"; lx.fillStyle = '#05d9e8'; lx.textAlign = 'center'; lx.fillText(cl.short, 128, 34);
    mesh(new T.PlaneGeometry(1.1, .2), new T.MeshBasicMaterial({ map: texFrom(lc_, true), transparent: true, toneMapped: false }), px, py - .52, -D / 2 + .11, g);
    const spot = glowSprite(px, py, -D / 2 + .14, lc(k % 2 ? 0xff2a6d : 0x05d9e8), 1.6, g); spot.material.opacity = .35;
    const hit = mesh(new T.BoxGeometry(1.9, 1, .4), new T.MeshBasicMaterial({ visible: false }), px, py, -D / 2 + .3, g);
    hit.userData.cls = cl.id; WALL_SLOTS.push({ hit, holder, cls: cl.id, wp: new T.Vector3(ax + px, py, az - D / 2 + .3) });
    INTER.push({ p: new T.Vector3(ax + px, py, az - D / 2 + .4), r: 1.9, label: 'Open ' + cl.name, key: 'E', act: () => openSmith(cl.id), apt: 1, look: 1 });
  });
  // door + EXIT sign on the east wall
  mesh(new T.BoxGeometry(.08, 2.2, 1.1), STD(0x2a1a14, .6, .3), W / 2 - .04, 1.1, -2, g);
  mesh(new T.BoxGeometry(.1, .05, .2), STD(0xc9a24a, .2, 1), W / 2 - .1, 1.05, -1.6, g);
  const [ec, ex] = cvs(128, 48); ex.fillStyle = '#3dff6a'; ex.font = "700 36px 'Chakra Petch', sans-serif"; ex.textAlign = 'center'; ex.shadowColor = '#3dff6a'; ex.shadowBlur = 10; ex.fillText('EXIT', 64, 38);
  const es = mesh(new T.PlaneGeometry(.6, .22), new T.MeshBasicMaterial({ map: texFrom(ec, true), transparent: true, toneMapped: false }), W / 2 - .05, 2.45, -2, g); es.rotation.y = -Math.PI / 2;
  INTER.push({ p: new T.Vector3(ax + W / 2 - .5, 1.1, az - 2), r: 1.8, label: 'Step out into the night', key: 'E', act: () => leaveApartment(), apt: 1 });
  // neon strips + lights
  mesh(new T.BoxGeometry(.04, .04, D), NEON(0xffb070), -W / 2 + .05, H - .05, 0, g); mesh(new T.BoxGeometry(.04, .04, D), NEON(0xff2a6d), W / 2 - .05, H - .05, 0, g);
  addLS(ax, 2.6, az - 1.5, 0xffc89a, 3.3, 12); addLS(ax - 4, 2.4, az + 2, 0x8aa2ff, 1.8, 10); addLS(ax + 4, 2.2, az + 2.2, 0xff2030, 2.4, 9, .2);
  // table & clutter
  mesh(new T.BoxGeometry(1.4, .75, .8), STD(0x1a1418, .5, .4), 2.5, .38, 2.8, g); addBox(ax + 1.8, ax + 3.2, az + 2.4, az + 3.2, .76);
  mesh(new T.CylinderGeometry(.05, .05, .2, 8), NEON(0x05d9e8), 2.3, .86, 2.8, g);
}
const W_ = id => W[id];

/* ---------- drivable cars ---------- */
function mergeLocal(group) {
  group.updateMatrixWorld(true); const inv = new T.Matrix4().copy(group.matrixWorld).invert(); const by = new Map();
  group.children.slice().forEach(o => { if (!o.isMesh || o.userData.keep) return; const k = o.material.uuid; if (!by.has(k)) by.set(k, []); by.get(k).push(o); });
  for (const list of by.values()) {
    if (list.length < 2) continue;
    const geos = list.map(o => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld)); return g; });
    let total = 0; geos.forEach(g => total += g.attributes.position.count);
    const P3 = new Float32Array(total * 3), N3 = new Float32Array(total * 3), U2 = new Float32Array(total * 2); let off = 0;
    geos.forEach(g => { const c = g.attributes.position.count; P3.set(g.attributes.position.array, off * 3); N3.set(g.attributes.normal.array, off * 3); if (g.attributes.uv) U2.set(g.attributes.uv.array, off * 2); off += c; });
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(P3, 3)); bg.setAttribute('normal', new T.BufferAttribute(N3, 3)); bg.setAttribute('uv', new T.BufferAttribute(U2, 2));
    group.add(new T.Mesh(bg, list[0].material)); list.forEach(o => group.remove(o));
  }
}
class Car {
  constructor(x, z, h, col, glow) {
    this.g = new T.Group(); this.pos = new T.Vector3(x, 0, z); this.h = h; this.speed = 0; this.steer = 0; this.occ = false; this.hp = 1;
    const body = new T.MeshStandardMaterial({ color: lc(col), metalness: .85, roughness: .22, envMapIntensity: 1.5 });
    const dark = STD(0x08080a, .4, .5), glass = new T.MeshStandardMaterial({ color: lc(0x05070c), metalness: 1, roughness: .05, envMapIntensity: 2 });
    mesh(new T.BoxGeometry(2.05, .5, 4.6), body, 0, .62, 0, this.g);
    const nose = mesh(new T.BoxGeometry(2.0, .28, 1.3), body, 0, .82, -1.55, this.g); nose.rotation.x = .12;
    mesh(new T.BoxGeometry(1.75, .5, 2.1), glass, 0, 1.1, .25, this.g).rotation.x = 0;
    mesh(new T.BoxGeometry(1.8, .08, 1.9), body, 0, 1.36, .35, this.g);
    mesh(new T.BoxGeometry(1.9, .08, .35), body, 0, 1.12, 2.15, this.g);
    mesh(new T.BoxGeometry(1.8, .07, .05), NEON(0xff1f3d), 0, .8, 2.31, this.g);
    mesh(new T.BoxGeometry(.5, .08, .05), NEON(0xeaf6ff), -.65, .8, -2.31, this.g); mesh(new T.BoxGeometry(.5, .08, .05), NEON(0xeaf6ff), .65, .8, -2.31, this.g);
    if (glow != null && Math.random() > .22) glow = null; // underglow is a gang-car thing, not every car
    if (glow != null) mesh(new T.BoxGeometry(2.07, .03, 3.6), NEON(glow), 0, .5, 0, this.g);
    this.wheels = [];
    for (const [a, b] of [[-1, -1.5], [1, -1.5], [-1, 1.5], [1, 1.5]]) { const w = mesh(new T.CylinderGeometry(.36, .36, .28, 14), dark, a * .98, .36, b, this.g); w.rotation.z = Math.PI / 2; this.wheels.push(w); }
    if (glow != null) { const ug = new T.Mesh(new T.PlaneGeometry(3.2, 6), new T.MeshBasicMaterial({ map: glowTex, color: lc(glow), transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    ug.rotation.x = -Math.PI / 2; ug.position.y = .04; this.g.add(ug); }
    this.beams = new T.Mesh(new T.ConeGeometry(2.5, 14, 12, 1, true), new T.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: .0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    this.beams.rotation.x = -Math.PI / 2; this.beams.position.set(0, .8, -9.3); this.g.add(this.beams);
    this.wheels.forEach(w => w.userData.keep = 1); this.beams.userData.keep = 1;
    mergeLocal(this.g);
    this.g.userData.dyn = 1; scene.add(this.g); this.sync();
    INTER.push({ car: this, p: this.pos, r: 3.2, label: 'Drive', key: 'E', act: () => { if (!this.dead) enterCar(this); }, when: () => !this.dead });
  }
  sync() { this.g.position.copy(this.pos); this.g.rotation.y = this.h; }
  fwd() { return new T.Vector3(-Math.sin(this.h), 0, -Math.cos(this.h)); }
  update(dt, inp) {
    if (this.occ || inp.ai) {
      const thr = inp.y, st = inp.x;
      if (thr > 0) this.speed += (this.speed < 0 ? 26 : 15) * thr * dt; else if (thr < 0) this.speed += (this.speed > 0 ? 28 : 9) * thr * dt;
      if (inp.brake) this.speed = damp(this.speed, 0, 3, dt);
      this.steer = damp(this.steer, st, 6, dt);
    } else this.steer = damp(this.steer, 0, 4, dt);
    this.speed = damp(this.speed, 0, this.occ || inp.ai ? .25 : 1.8, dt);
    this.speed = clamp(this.speed, -12, 42);
    const sf = clamp(Math.abs(this.speed) / 8, 0, 1) * (1 - clamp(Math.abs(this.speed) / 80, 0, .4));
    this.h -= this.steer * sf * 1.9 * dt * Math.sign(this.speed || 1);
    const f = this.fwd(); const old = this.pos.clone();
    this.pos.addScaledVector(f, this.speed * dt);
    // two-circle collision against the city
    const front = this.pos.clone().addScaledVector(f, 1.3), back = this.pos.clone().addScaledVector(f, -1.3);
    const f0 = front.clone(), b0 = back.clone();
    const hit1 = collideCircle(front, 1.15, 0, 1.4), hit2 = collideCircle(back, 1.15, 0, 1.4);
    if (hit1 || hit2) {
      const corr = front.sub(f0).add(back.sub(b0)).multiplyScalar(.5); this.pos.add(corr);
      if (Math.abs(this.speed) > 8) { shake(Math.min(.6, Math.abs(this.speed) / 50)); AU.thud(); burst(FXA, this.pos.clone().addScaledVector(f, 2).setY(.8), 12, 6, .4, .12, .02, COL.spark, 9); }
      this.speed *= -.25;
    }
    for (const w of this.wheels) w.rotation.x += this.speed * dt / .36;
    this.wheels[0].rotation.y = this.wheels[1].rotation.y = this.steer * .45;
    this.beams.visible = this.occ; this.beams.material.opacity = this.occ ? .07 : 0; // an invisible cone still costs a draw call
    this.sync();
  }
}
