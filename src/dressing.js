/* =====================================================================
   RED NIGHT — purge-night street dressing. Instanced where possible (via FD),
   animated bits register in UPD.
   ===================================================================== */
const FDGEO = {}, FDMAT = {};
function streetDressing() {
  // shared geometry / materials for the instanced kinds
  FDGEO.trash = new T.IcosahedronGeometry(.5, 0); FDMAT.trash = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .35, metalness: .1 });
  FDGEO.cone = new T.ConeGeometry(.5, 1, 10); FDMAT.cone = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .6, emissive: 0xff5a00, emissiveIntensity: .25 });
  FDGEO.hydrant = new T.CylinderGeometry(.5, .6, 1, 10); FDMAT.hydrant = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .5, metalness: .4 });
  FDGEO.drum = new T.CylinderGeometry(.5, .5, 1, 12); FDMAT.drum = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .6, metalness: .6 });
  FDGEO.pumpkin = new T.SphereGeometry(.5, 10, 8); FDMAT.pumpkin = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .6, emissive: 0xff7a10, emissiveIntensity: .9 });
  FDGEO.bag = new T.CylinderGeometry(.5, .5, 1, 8); FDMAT.bag = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .3, metalness: .2 });
  FDMAT.curb = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .9, metalness: .05 });
  FDMAT.debris = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: T.DoubleSide });
  FDMAT.crate = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .85 });
  FDMAT.cable = new T.MeshBasicMaterial({ color: 0x05040a });

  const curbCol = [0x4a3e34, 0x2c3440, 0x3a2a2a, 0x2a2430];
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
    const bx = -HALF + i * CW, bz = -HALF + j * CW, d = districtAt(bx + 20, bz + 20);
    // raised sidewalk slab with a curb edge (visual; 15 cm)
    fdPush('curb', bx + 20, .07, bz + 20, 30, .15, 30, 0, curbCol[d]);
    fdPush('curb', bx + 20, .02, bz + 20, 30.5, .04, 30.5, 0, 0x6a6a70);
    // per side of the block: curbside clutter
    for (let side = 0; side < 4; side++) {
      const along = side % 2 === 0, off = side < 2 ? 5.3 : 34.7;
      for (let k = 0; k < 7; k++) {
        const t = 7 + k * 3.8 + sr(-1, 1);
        const x = along ? bx + t : bx + off, z = along ? bz + off : bz + t;
        const r = srand();
        if (r < .26) { const n = 1 + Math.floor(sr(0, 4)); for (let m = 0; m < n; m++) fdPush('trash', x + sr(-.6, .6), .3, z + sr(-.6, .6), sr(.6, 1), sr(.5, .8), sr(.6, 1), srand() * TAU, spick([0x0c0c10, 0x16201a, 0x1a1a24])); }
        else if (r < .31) fdPush('hydrant', x, .45, z, .32, .9, .32, 0, d === 1 ? 0xe8d000 : 0xb01818);
        else if (r < .37 && d !== 3) { fdPush('cone', x + sr(-1, 1), .38, z + sr(-1, 1), .45, .75, .45, 0, 0xff5a00); }
        else if (r < .41 && d === 2) { fdPush('drum', x, .5, z, .62, 1, .62, 0, spick([0x2a4a2a, 0x5a2a1a, 0x1a2a4a])); }
        else if (r < .46 && d === 3) { fdPush('pumpkin', x, .25, z, sr(.45, .7), sr(.4, .55), sr(.45, .7), 0, 0xd86a10); if (srand() < .3) addLS(x, .8, z, 0xff8a20, .7, 6, 1); }
      }
    }
    // paper / debris scattered on the roads around the block
    for (let k = 0; k < 10; k++) {
      const onX = srand() < .5, x = onX ? bx + sr(0, 40) : bx + sr(-5, 5), z = onX ? bz + sr(-5, 5) : bz + sr(0, 40);
      fdPush('debris', x, .03, z, sr(.3, 1.2), .02, sr(.2, .8), srand() * TAU, spick([0x9a9488, 0x6a6458, 0x3a3630, 0xc0b8a8]));
    }
    // overhead cables across the street (Cairo + Texarkana are a mess of them)
    const nc = d === 0 ? 4 : d === 2 ? 3 : d === 3 ? 1 : 0;
    for (let k = 0; k < nc; k++) {
      const onX = srand() < .5, t = sr(8, 32), y = sr(7, 12), sag = sr(.6, 1.6);
      const p0 = onX ? [bx + t, bz - 6] : [bx - 6, bz + t], p1 = onX ? [bx + t, bz + 6] : [bx + 6, bz + t];
      const segs = 4;
      for (let s = 0; s < segs; s++) {
        const a = s / segs, b = (s + 1) / segs, ya = y - sag * 4 * a * (1 - a), yb = y - sag * 4 * b * (1 - b);
        const xa = p0[0] + (p1[0] - p0[0]) * a, za = p0[1] + (p1[1] - p0[1]) * a, xb = p0[0] + (p1[0] - p0[0]) * b, zb = p0[1] + (p1[1] - p0[1]) * b;
        const len = Math.hypot(xb - xa, zb - za, yb - ya);
        fdPush('cable', (xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2, .05, .05, len, onX ? 0 : Math.PI / 2, 0x05040a, onX ? -Math.atan2(yb - ya, zb - za) : -Math.atan2(yb - ya, xb - xa));
      }
    }
  }

  // dumpsters in some alleys (solid)
  for (let k = 0; k < 40; k++) {
    const i = Math.floor(sr(0, 12)), j = Math.floor(sr(0, 12)); const bx = -HALF + i * CW, bz = -HALF + j * CW;
    const x = bx + sr(8, 32), z = bz + 5.6 + (srand() < .5 ? 0 : 29);
    if (Math.abs(x) < 14 && Math.abs(z) < 14) continue;
    fdPush('crate', x, .65, z, 2.4, 1.3, 1.2, 0, spick([0x1a3a2a, 0x2a2a3a, 0x3a2a1a])); fdPush('crate', x, 1.36, z - .1, 2.5, .12, 1.4, 0, 0x101014, -.12);
    addBox(x - 1.2, x + 1.2, z - .6, z + .6, 1.4).surf = 'wood';
  }

  // purge banners strung across streets
  const BANNERS = ['THE ANNUAL PURGE HAS BEGUN', 'ALL EMERGENCY SERVICES SUSPENDED', 'BLESSED BE THE NEW FOUNDING FATHERS', 'SURVIVE THE NIGHT', 'PURGE · 7PM — 7AM', 'STAY INSIDE · LOCK YOUR DOORS'];
  const bannerMats = BANNERS.map((t, i) => {
    const [c, x] = cvs(1024, 128); x.fillStyle = i % 2 ? '#0c0a10' : '#6a0a14'; x.fillRect(0, 0, 1024, 128);
    x.strokeStyle = i % 2 ? '#ff1f3d' : '#f3e600'; x.lineWidth = 6; x.strokeRect(8, 8, 1008, 112);
    x.fillStyle = i % 2 ? '#ff1f3d' : '#ffffff'; x.font = "700 56px 'Chakra Petch', Impact, sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 512, 66);
    for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(0,0,0,${rand(.05, .2)})`; x.fillRect(Math.random() * 1024, Math.random() * 128, rand(2, 8), rand(1, 4)); }
    return new T.MeshStandardMaterial({ map: texFrom(c, true), side: T.DoubleSide, roughness: .9, emissive: 0xffffff, emissiveMap: texFrom(c, true), emissiveIntensity: .35 });
  });
  for (let k = 0; k < 18; k++) {
    const line = spick(ROADS.slice(1, -1)), t = spick(ROADS.slice(1, -1)) + sr(12, 28), alongX = srand() < .5;
    const x = alongX ? t : line, z = alongX ? line : t; const y = sr(7.5, 10);
    const m = new T.Mesh(new T.PlaneGeometry(11.5, 1.45, 8, 1), bannerMats[k % bannerMats.length]);
    const pa = m.geometry.attributes.position; for (let v = 0; v < pa.count; v++) { const u = pa.getX(v) / 5.75; pa.setY(v, pa.getY(v) - .55 * (1 - u * u)); } pa.needsUpdate = true;
    m.position.set(x, y, z); m.rotation.y = alongX ? Math.PI / 2 : 0; m.userData.dyn = true; scene.add(m);
    const ph = srand() * 10; UPD.push((dt, tt) => { m.rotation.x = Math.sin(tt * 1.3 + ph) * .08; });
  }

  // abandoned police cruisers, light bars still strobing
  const strobes = [];
  for (let k = 0; k < 8; k++) {
    const line = spick(ROADS.slice(1, -1)), t = sr(-HALF + 20, HALF - 20), alongX = srand() < .5;
    const x = alongX ? t : line + sr(-2.5, 2.5), z = alongX ? line + sr(-2.5, 2.5) : t;
    if (Math.abs(x) < 14 && Math.abs(z) < 14) continue;
    const g = new T.Group(); const body = STD(0x0a0a10, .4, .6), white = STD(0xd8d8e0, .5, .3);
    mesh(new T.BoxGeometry(2, .7, 4.6), body, 0, .62, 0, g); mesh(new T.BoxGeometry(2.02, .3, 1.6), white, 0, .75, 1.2, g); mesh(new T.BoxGeometry(2.02, .3, 1.4), white, 0, .75, -1.4, g);
    mesh(new T.BoxGeometry(1.7, .55, 2.2), STD(0x05060a, .1, .9), 0, 1.25, -.1, g);
    const red = new T.Mesh(new T.BoxGeometry(.6, .14, .3), new T.MeshBasicMaterial({ color: 0xff1030, toneMapped: false })), blue = new T.Mesh(new T.BoxGeometry(.6, .14, .3), new T.MeshBasicMaterial({ color: 0x1060ff, toneMapped: false }));
    red.position.set(-.35, 1.6, -.1); blue.position.set(.35, 1.6, -.1); g.add(red, blue);
    for (const [a, b] of [[-1, 1.5], [1, 1.5], [-1, -1.5], [1, -1.5]]) mesh(new T.CylinderGeometry(.33, .33, .26, 10), STD(0x0a0a0a, .9), a, .3, b, g).rotation.z = Math.PI / 2;
    const flip = srand() < .3; const h = (alongX ? Math.PI / 2 : 0) + sr(-.5, .5);
    g.position.set(x, flip ? 1.0 : 0, z); g.rotation.y = h; if (flip) g.rotation.z = Math.PI * .5; scene.add(g);
    addBox(x - 2.2, x + 2.2, z - 2.2, z + 2.2, 1.6).surf = 'metal';
    const lsR = { p: new T.Vector3(x, 2, z), c: new T.Color(0xff1030), i: 0, d: 16, f: 0 }, lsB = { p: new T.Vector3(x, 2, z), c: new T.Color(0x1060ff), i: 0, d: 16, f: 0 }; LS.push(lsR, lsB);
    strobes.push({ red, blue, lsR, lsB, ph: srand() });
    if (srand() < .4) FIRES.push({ p: new T.Vector3(x, 1.2, z), s: 1 });
  }
  UPD.push((dt, tt) => { for (const s of strobes) { const on = ((tt * 2.5 + s.ph) % 1) < .5; s.red.visible = on; s.blue.visible = !on; s.lsR.i = on ? 3.2 : 0; s.lsB.i = on ? 0 : 3.2; } });

  // steam from manholes
  const [sc, sx] = cvs(64, 256); const sg = sx.createLinearGradient(0, 256, 0, 0); sg.addColorStop(0, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); sx.fillStyle = sg;
  for (let i = 0; i < 30; i++) { sx.globalAlpha = rand(.2, .6); sx.beginPath(); sx.arc(32 + rand(-14, 14), rand(20, 256), rand(10, 26), 0, TAU); sx.fill(); }
  const steamTex = texFrom(sc, false); steamTex.wrapT = T.RepeatWrapping;
  for (let k = 0; k < 26; k++) {
    const x = spick(ROADS.slice(1, -1)) + sr(-2, 2), z = spick(ROADS.slice(1, -1)) + sr(8, 32);
    const xs = srand() < .5 ? [x, z] : [z, x];
    mesh(new T.CylinderGeometry(.55, .55, .04, 14), STD(0x1a1a1e, .5, .8), xs[0], .02, xs[1]);
    const mat = new T.MeshBasicMaterial({ map: steamTex.clone(), transparent: true, depthWrite: false, opacity: .35, color: 0xd8c8e8, side: T.DoubleSide });
    mat.map.needsUpdate = true; mat.map.wrapT = T.RepeatWrapping;
    for (let p = 0; p < 2; p++) { const pl = mesh(new T.PlaneGeometry(1.6, 6), mat, xs[0], 3, xs[1]); pl.rotation.y = p * Math.PI / 2; }
    const sp = sr(.2, .5); UPD.push((dt) => { mat.map.offset.y -= dt * sp; });
  }

  // body bags & chalk outlines (it's the purge)
  const [oc, ox] = cvs(128, 128); ox.strokeStyle = 'rgba(240,240,240,.85)'; ox.lineWidth = 4; ox.beginPath();
  ox.arc(64, 22, 12, 0, TAU); ox.moveTo(64, 34); ox.lineTo(64, 80); ox.lineTo(44, 120); ox.moveTo(64, 80); ox.lineTo(86, 118); ox.moveTo(64, 46); ox.lineTo(34, 66); ox.moveTo(64, 46); ox.lineTo(96, 58); ox.stroke();
  const outlineMat = new T.MeshBasicMaterial({ map: texFrom(oc, true), transparent: true, depthWrite: false, opacity: .7 });
  for (let k = 0; k < 22; k++) {
    const x = spick(ROADS.slice(1, -1)) + sr(-4, 4), z = spick(ROADS.slice(1, -1)) + sr(6, 34); const xs = srand() < .5 ? [x, z] : [z, x];
    if (Math.abs(xs[0]) < 14 && Math.abs(xs[1]) < 14) continue;
    if (srand() < .5) { const m = mesh(new T.PlaneGeometry(1.4, 2), outlineMat, xs[0], .035, xs[1]); m.rotation.x = -Math.PI / 2; m.rotation.z = srand() * TAU; }
    else fdPush('bag', xs[0], .18, xs[1], .55, 1.85, .4, srand() * TAU, 0x0a0a0c, Math.PI / 2);
  }
}

function districtSignatures() {
  // ---- CAIRO: festoon bulbs strung across the bazaar streets
  FDGEO.bulb = new T.SphereGeometry(.5, 6, 4); FDMAT.bulb = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  for (let k = 0; k < 26; k++) {
    const line = spick(ROADS.filter(r => r < -10 && r > -HALF)), t = sr(-HALF + 10, -12), onX = srand() < .5;
    const y = sr(5.5, 7.5), sag = sr(.8, 1.6), col = spick([0xffd27a, 0xffb347, 0xff6a3c, 0xfff0d0]);
    for (let b = 0; b <= 12; b++) {
      const a = b / 12, yy = y - sag * 4 * a * (1 - a), w = -6 + 12 * a;
      const x = onX ? t : line + w, z = onX ? line + w : t;
      fdPush('bulb', x, yy, z, .16, .16, .16, 0, new T.Color(col).multiplyScalar(2.2));
      if (b % 4 === 2) fdPush('cable', x, yy + .06, z, .03, .03, 3, onX ? Math.PI / 2 : 0, 0x05040a);
    }
    if (k % 3 === 0) addLS(onX ? t : line, y - 1, onX ? line : t, col, 1.4, 12);
  }

  // ---- SACRAMENTO: ad drones hovering over the arcology, slowly orbiting
  const adTxt = ['GOLD RUSH 2.0', 'NEW FOUNDING FATHERS', 'PURGE INSURANCE', 'CAPITOL CYBER', 'STAY SAFE · BUY ARMOR'];
  for (let k = 0; k < 7; k++) {
    const [c, x] = cvs(512, 256); const col = spick(['#05d9e8', '#f3e600', '#ff2a6d', '#3dff9a']);
    x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(0, 0, 512, 256); x.strokeStyle = col; x.lineWidth = 8; x.strokeRect(6, 6, 500, 244);
    x.fillStyle = col; x.font = "700 52px 'Chakra Petch', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(adTxt[k % adTxt.length], 256, 128);
    for (let y = 0; y < 256; y += 4) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, y, 512, 1); }
    const g = new T.Group(); const pan = new T.Mesh(new T.PlaneGeometry(12, 6), new T.MeshBasicMaterial({ map: texFrom(c, true), transparent: true, opacity: .9, side: T.DoubleSide, toneMapped: false, depthWrite: false }));
    g.add(pan); mesh(new T.BoxGeometry(2, .6, 1.2), STD(0x1a1a22, .4, .8), 0, 3.6, 0, g);
    for (const s of [-1, 1]) { const r = mesh(new T.BoxGeometry(.1, .1, .1), NEON(0xff1f3d), s * 1.1, 3.6, 0, g); }
    const cx = sr(30, 180), cz = sr(-220, -30), rad = sr(15, 40), hgt = sr(35, 70), ph = srand() * TAU, sp = sr(.03, .07);
    g.userData.dyn = true; scene.add(g); const pm = pan.material; AUG_HOOKS.push(a => { g.visible = a > .14; pm.opacity = .9 * smooth01((a - .14) / .5); }); g.visible = G.aug > .14; pm.opacity = .9 * smooth01((G.aug - .14) / .5);
    UPD.push((dt, tt) => { if (!g.visible) return; const a = ph + tt * sp; g.position.set(cx + Math.cos(a) * rad, hgt + Math.sin(tt * .7 + ph) * 1.5, cz + Math.sin(a) * rad); g.rotation.y = -a; });
  }

  // ---- TEXARKANA: the existing rail line (z=200) gets a crossing that won't stop flashing
  const tz = 200;
  // crossing: posts + alternating red lamps
  const xing = []; for (const [x, z] of [[118, tz - 3.2], [122, tz + 3.2]]) {
    mesh(new T.CylinderGeometry(.08, .08, 4, 8), STD(0xd8d8d8, .5, .5), x, 2, z);
    const xb = mesh(new T.BoxGeometry(1.8, .2, .05), STD(0xe8e8e8, .6), x, 3.4, z); xb.rotation.z = .6; const xb2 = mesh(new T.BoxGeometry(1.8, .2, .05), STD(0xe8e8e8, .6), x, 3.4, z); xb2.rotation.z = -.6;
    const l1 = mesh(new T.SphereGeometry(.16, 8, 6), new T.MeshBasicMaterial({ color: 0xff1020, toneMapped: false }), x - .35, 2.7, z), l2 = mesh(new T.SphereGeometry(.16, 8, 6), new T.MeshBasicMaterial({ color: 0xff1020, toneMapped: false }), x + .35, 2.7, z);
    const ls = { p: new T.Vector3(x, 2.8, z), c: new T.Color(0xff1020), i: 0, d: 14, f: 0 }; LS.push(ls); xing.push({ l1, l2, ls });
  }
  UPD.push((dt, tt) => { const on = (tt * 1.6) % 1 < .5; for (const c of xing) { c.l1.visible = on; c.l2.visible = !on; c.ls.i = 2.4; } });

  // ---- SALEM: low ground fog drifting through the old town
  const [fc, fx] = cvs(256, 256); for (let i = 0; i < 70; i++) { const g = fx.createRadialGradient(0, 0, 0, 0, 0, 1); const r = rand(20, 60), x = rand(0, 256), y = rand(0, 256); const gr = fx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); fx.fillStyle = gr; fx.fillRect(0, 0, 256, 256); }
  const fogTex = texFrom(fc, false, true); fogTex.repeat.set(3, 3);
  for (let k = 0; k < 3; k++) {
    const mat = new T.MeshBasicMaterial({ map: fogTex.clone(), color: 0x3a4246, transparent: true, opacity: .07 - k * .015, depthWrite: false });
    mat.map.wrapS = mat.map.wrapT = T.RepeatWrapping; mat.map.repeat.set(3 + k, 3 + k); mat.map.needsUpdate = true;
    const m = new T.Mesh(new T.PlaneGeometry(236, 236), mat); m.rotation.x = -Math.PI / 2; m.position.set(-120, .35 + k * .45, 120); scene.add(m);
    const sp = .006 + k * .004; UPD.push((dt) => { mat.map.offset.x += dt * sp; mat.map.offset.y += dt * sp * .6; });
  }
}
