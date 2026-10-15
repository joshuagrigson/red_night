let FD_BOX = null; // set by building() so storefront bays can tag their box for bullet impacts
/* =====================================================================
   RED NIGHT — facade detail: every building gets real geometry on top of its box.
   All detail is instanced (one draw call per kind) so it stays cheap on phones.
   ===================================================================== */
const FD = {}; // kind -> [{x,y,z,sx,sy,sz,ry,c}]
const fdPush = (k, x, y, z, sx, sy, sz, ry, c, rx, rz) => (FD[k] || (FD[k] = [])).push({ x, y, z, sx, sy, sz, ry: ry || 0, c, rx: rx || 0, rz: rz || 0 });

// ---- storefront textures: lit interiors + purge shutters (graffiti)
const GRAFF = ['PURGE', 'NO ONE IS SAFE', 'DAWN OR DIE', 'THEY WALK AMONG US', 'GOD SAVE US', 'LIZARD PPL', 'BURN THE WITCH', 'SAFE HOUSE →', 'CLOSED 4 PURGE', 'STAY INSIDE', 'RUN', '12 HRS'];
function shopTex(kind, seedCol) {
  const [c, x] = cvs(256, 128);
  if (kind === 'lit') {
    const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, seedCol); g.addColorStop(.6, 'rgba(20,10,30,1)'); g.addColorStop(1, '#05030a');
    x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    x.fillStyle = 'rgba(0,0,0,.55)'; for (let i = 0; i < 5; i++) { const sx = 10 + i * 50; x.fillRect(sx, 40 + Math.random() * 20, 36, 70); }   // shelving silhouettes
    x.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * 256, 30 + Math.random() * 70, rand(3, 10), rand(2, 5)); // product glints
    x.fillStyle = 'rgba(0,0,0,.9)'; x.fillRect(0, 0, 256, 6); x.fillRect(0, 122, 256, 6); x.fillRect(0, 0, 6, 128); x.fillRect(250, 0, 6, 128); x.fillRect(125, 0, 6, 128); // mullions
    x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.moveTo(20, 6); x.lineTo(60, 6); x.lineTo(20, 120); x.lineTo(6, 120); x.fill(); // glass reflection
  } else {
    x.fillStyle = kind === 'shutterR' ? '#3a2a24' : '#4a4e56'; x.fillRect(0, 0, 256, 128);
    for (let y = 0; y < 128; y += 6) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, y, 256, 2); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, y + 2, 256, 1); }
    for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '90,40,20' : '0,0,0'},${rand(.05, .2)})`; x.fillRect(Math.random() * 256, Math.random() * 128, rand(1, 6), rand(1, 4)); } // rust
    // graffiti (not on every shutter, smaller tags, placed off-center)
    if (Math.random() < .6) {
    const t = pick(GRAFF); x.save(); x.translate(rand(70, 186), rand(50, 84)); x.rotate(rand(-.14, .14));
    x.font = `900 ${t.length > 10 ? 17 : 24}px Impact, 'Arial Black', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(t, 0, 0);
    x.fillStyle = pick(['#ff2a6d', '#f3e600', '#05d9e8', '#ffffff', '#3dff6a', '#ff6a00']); x.fillText(t, 0, 0);
    for (let i = 0; i < 8; i++) { x.fillRect(rand(-50, 50), rand(9, 14), 1.5, rand(4, 14)); } // drips
    x.restore(); }
    if (Math.random() < .5) { x.fillStyle = '#ff2a6d'; x.font = "900 22px Impact, sans-serif"; x.fillText('X', rand(20, 230), rand(20, 110)); }
  }
  return texFrom(c, true);
}

// ---- per-building facade pass (called from building())
function facadeDetail(style, x0, x1, z0, z1, h, d, tier) {
  const w = x1 - x0, dd = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const ledgeCol = { glass: 0x1a2230, neon: 0x221a2c, stone: 0x8a6a46, brick: 0x4a2a22, wood: 0x241c26, white: 0xb0aaa0 }[style] || 0x222222;
  const plinthCol = { glass: 0x10141c, neon: 0x120e18, stone: 0x5a4430, brick: 0x2a1a16, wood: 0x16121a, white: 0x6a6660 }[style] || 0x111111;
  const tall = h > 30;
  // plinth (ground-floor band) + base ledge
  const ph = tier ? h * .55 : Math.min(4.6, h * .45);
  if (!tier) { fdPush('ledge', cx, ph / 2, cz, w + .24, ph, dd + .24, 0, plinthCol); fdPush('ledge', cx, ph + .15, cz, w + .6, .3, dd + .6, 0, ledgeCol); }
  // floor ledges (one box per level wraps all four faces)
  const every = style === 'glass' ? 999 : tall ? 10.5 : 7;
  for (let y = ph + every; y < h - 2; y += every) fdPush('ledge', cx, y, cz, w + .36, .26, dd + .36, 0, ledgeCol);
  // cornice + parapet
  if (style !== 'wood') { fdPush('ledge', cx, h - .25, cz, w + .7, .5, dd + .7, 0, ledgeCol); fdPush('ledge', cx, h + .5, cz, w + .1, 1, dd + .1, 0, plinthCol); }
  // corner pilasters
  if (style === 'stone' || style === 'brick' || style === 'white') for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) fdPush('ledge', px, h / 2, pz, .7, h, .7, 0, ledgeCol);
  // glass towers: vertical neon fins + mullion fins
  if (style === 'glass' || style === 'neon') {
    const col = new T.Color(spick(DIST[d].cols));
    const nf = style === 'glass' ? 3 : 2;
    for (let k = 1; k <= nf; k++) {
      const fx = x0 + w * k / (nf + 1), fz = z0 + dd * k / (nf + 1);
      if (srand() < .6) { fdPush('fin', fx, ph + (h - ph) / 2, z0 - .12, .14, h - ph, .14, 0, col); fdPush('fin', fx, ph + (h - ph) / 2, z1 + .12, .14, h - ph, .14, 0, col); }
      else { fdPush('ledge', fx, ph + (h - ph) / 2, z0 - .25, .4, h - ph, .5, 0, ledgeCol); fdPush('ledge', fx, ph + (h - ph) / 2, z1 + .25, .4, h - ph, .5, 0, ledgeCol); }
      if (srand() < .5) { fdPush('fin', x0 - .12, ph + (h - ph) / 2, fz, .14, h - ph, .14, 0, col); fdPush('fin', x1 + .12, ph + (h - ph) / 2, fz, .14, h - ph, .14, 0, col); }
    }
    if (h > 60 && srand() < .7) { fdPush('metal', cx, h + 1 + 6, cz, .35, 12, .35, 0, 0x2a2a30); fdPush('fin', cx, h + 13.2, cz, .5, .5, .5, 0, new T.Color(0xff1f3d)); addLS(cx, h + 13, cz, 0xff1f3d, 1.2, 30, 2); }
  }
  // per-face wall stuff
  const faces = [[0, x0, z0, x1, z0], [1, x1, z0, x1, z1], [2, x1, z1, x0, z1], [3, x0, z1, x0, z0]];
  for (const [fi, ax, az, bx, bz] of faces) {
    const len = Math.hypot(bx - ax, bz - az); const ux = (bx - ax) / len, uz = (bz - az) / len; // along face
    const nx = uz, nz = -ux; // outward normal (faces wind clockwise seen from above)
    const ry = Math.atan2(nx, nz); // local +z = outward, local x = along the face
    if (tier) continue;
    // storefront bays on the ground floor
    const bays = Math.max(1, Math.floor(len / 5.5)); const bw = len / bays;
    for (let b = 0; b < bays; b++) {
      const t = (b + .5) * bw, px = ax + ux * t + nx * .14, pz = az + uz * t + nz * .14;
      const r = srand(); const pLit = d === 3 ? .55 : d === 1 ? .5 : .4; const kind = r < pLit ? 'lit' : r < pLit + (d === 3 ? .15 : .35) ? 'shutter' : r < pLit + (d === 3 ? .25 : .47) ? 'shutterR' : 'dark';
      const sh = Math.min(3.4, ph - .6);
      fdPush('shop_' + kind + (kind === 'lit' ? Math.floor(srand() * 4) : Math.floor(srand() * 6)), px, sh / 2 + .1, pz, bw - .5, sh, 1, ry);
      if (FD_BOX) (FD_BOX.bays = FD_BOX.bays || []).push([px, pz, ux, uz, (bw - .5) / 2, sh + .1, kind === 'lit' || kind === 'dark' ? 'glass' : 'metal']);
      if (kind === 'lit' && srand() < .6) { // awning
        fdPush('awning', ax + ux * t + nx * .75, sh + .45, az + uz * t + nz * .75, bw - .3, .1, 1.4, ry, new T.Color(spick(DIST[d].cols)).multiplyScalar(.6), .32);
        if (srand() < .35) addLS(ax + ux * t + nx * 2.5, 2.2, az + uz * t + nz * 2.5, new T.Color(spick(DIST[d].cols)), 1.1, 9);
      }
    }
    // AC units / dishes / mashrabiya / shutters on upper floors
    const floors = Math.floor((h - ph - 1) / 3.5);
    const acChance = { stone: .11, brick: .09, white: .05, neon: .03, glass: 0, wood: 0 }[style] || 0;
    for (let f = 0; f < Math.min(floors, 14); f++) {
      const y = ph + 1.4 + f * 3.5;
      const slots = Math.floor(len / 3.2);
      for (let k = 0; k < slots; k++) {
        const t = (k + .5) * len / slots, bx2 = ax + ux * t, bz2 = az + uz * t;
        const rr = srand();
        if (rr < acChance) fdPush('metal', bx2 + nx * .35, y - .9, bz2 + nz * .35, .9, .6, .7, ry, 0x6a6e74);
        else if (style === 'stone' && rr < acChance + .07) { fdPush('mash', bx2 + nx * .3, y + .2, bz2 + nz * .3, 1.5, 2.2, .5, ry, 0x4a2c18); }
        else if (style === 'stone' && rr < acChance + .1 && f % 2 === 0) { fdPush('ledge', bx2 + nx * .55, y - 1.1, bz2 + nz * .55, 2.4, .18, 1.1, ry, ledgeCol); fdPush('metal', bx2 + nx * 1.05, y - .6, bz2 + nz * 1.05, 2.4, .9, .06, ry, 0x2a2420); }
        else if (style === 'wood' && rr < .22) { fdPush('mash', bx2 + nx * .12 - ux * .9, y + .1, bz2 + nz * .12 - uz * .9, .45, 1.8, .12, ry, 0x1a2a20); fdPush('mash', bx2 + nx * .12 + ux * .9, y + .1, bz2 + nz * .12 + uz * .9, .45, 1.8, .12, ry, 0x1a2a20); }
      }
    }
    // Texarkana/brick fire escape on one long face
    if ((style === 'brick' || (style === 'white' && srand() < .4)) && fi === (Math.floor(srand() * 4)) && floors >= 2) {
      const t = len * sr(.3, .7), fx = ax + ux * t, fz = az + uz * t;
      for (let f = 0; f < Math.min(floors, 9); f++) {
        const y = ph + .6 + f * 3.5;
        fdPush('metal', fx + nx * .75, y, fz + nz * .75, 3.6, .1, 1.4, ry, 0x1c1c20);            // landing
        fdPush('metal', fx + nx * 1.42, y + .5, fz + nz * 1.42, 3.6, .06, .06, ry, 0x1c1c20);   // rail
        fdPush('metal', fx + nx * .75, y + 1.75, fz + nz * .75, 4.4, .1, .7, ry, 0x1c1c20, 0, (f % 2) ? .8 : -.8); // stair
      }
    }
  }
  // rooftops
  if (style === 'brick' || (style === 'white' && srand() < .5) || (style === 'stone' && srand() < .25)) if (srand() < .55) {
    const tx = sr(x0 + 2, x1 - 2), tz = sr(z0 + 2, z1 - 2), top = h + 1;
    fdPush('tank', tx, top + 3.4, tz, 1.5, 2.6, 1.5, 0, 0x5a3e2a);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) fdPush('metal', tx + ox * 1.1, top + 1, tz + oz * 1.1, .12, 2, .12, 0, 0x1c1c20);
  }
  if (style === 'stone') { const nd = Math.floor(sr(1, 4)); for (let k = 0; k < nd; k++) fdPush('dish', sr(x0 + 1.5, x1 - 1.5), h + 1.4, sr(z0 + 1.5, z1 - 1.5), .7, .7, .7, srand() * TAU, 0xc8c8c8); }
  if (style === 'wood' && srand() < .35) { // porch roof on a random face
    const f = Math.floor(srand() * 4); const P = [[cx, z0 - 1.2, w * .6, 2.4, 0], [x1 + 1.2, cz, 2.4, dd * .6, 0], [cx, z1 + 1.2, w * .6, 2.4, 0], [x0 - 1.2, cz, 2.4, dd * .6, 0]][f];
    fdPush('ledge', P[0], 3.1, P[1], P[2], .18, P[3], 0, 0x1d1620);
  }
}

function buildFacades() {
  const box = new T.BoxGeometry(1, 1, 1), plane = new T.PlaneGeometry(1, 1);
  const cyl = new T.CylinderGeometry(.5, .5, 1, 12), dish = new T.SphereGeometry(.5, 10, 6, 0, TAU, 0, Math.PI / 2.6);
  const mats = {
    ledge: (PBR.ledge = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .85, metalness: .1 })),
    metal: new T.MeshStandardMaterial({ color: 0xffffff, roughness: .55, metalness: .7 }),
    mash: new T.MeshStandardMaterial({ color: 0xffffff, roughness: .9, metalness: 0 }),
    tank: new T.MeshStandardMaterial({ color: 0xffffff, roughness: .9, metalness: .1 }),
    dish: new T.MeshStandardMaterial({ color: 0xffffff, roughness: .4, metalness: .6, side: T.DoubleSide }),
    awning: new T.MeshStandardMaterial({ color: 0xffffff, roughness: .7, metalness: 0, emissive: 0xffffff, emissiveIntensity: .12 }),
    fin: new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  };
  const shopCols = ['#ffb347', '#05d9e8', '#ff2a6d', '#f3e600'];
  for (let i = 0; i < 4; i++) mats['shop_lit' + i] = new T.MeshBasicMaterial({ map: shopTex('lit', shopCols[i]), toneMapped: false });
  for (let i = 0; i < 6; i++) { mats['shop_shutter' + i] = new T.MeshStandardMaterial({ map: shopTex('shutter'), roughness: .6, metalness: .6 }); mats['shop_shutterR' + i] = new T.MeshStandardMaterial({ map: shopTex('shutterR'), roughness: .8, metalness: .3 }); }
  for (let i = 0; i < 6; i++) mats['shop_dark' + i] = new T.MeshStandardMaterial({ color: 0x07080c, roughness: .1, metalness: .9 });
  const m4 = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(), Y = new T.Vector3(0, 1, 0), col = new T.Color();
  let total = 0, calls = 0;
  for (const k in FD) {
    const list = FD[k]; if (!list.length) continue;
    const geo = FDGEO[k] || (k.startsWith('shop_') ? plane : k === 'tank' ? cyl : k === 'dish' ? dish : box);
    const mat = FDMAT[k] || mats[k] || mats.ledge;
    const im = new T.InstancedMesh(geo, mat, list.length);
    list.forEach((e, i) => {
      p.set(e.x, e.y, e.z); s.set(e.sx, e.sy, e.sz); q.setFromAxisAngle(Y, e.ry); if (e.rx || e.rz) q.multiply(new T.Quaternion().setFromEuler(new T.Euler(e.rx, 0, e.rz)));
      if (k === 'dish') q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -.9));
      m4.compose(p, q, s); im.setMatrixAt(i, m4);
      if (e.c !== undefined && !k.startsWith('shop_')) { if (e.c.isColor) col.copy(e.c); else col.set(e.c).convertSRGBToLinear(); if (k === 'fin') col.multiplyScalar(1.7); im.setColorAt(i, col); }
    });
    im.frustumCulled = false; scene.add(im); total += list.length; calls++;
  }
  FD._stats = { instances: total, drawCalls: calls };
}
