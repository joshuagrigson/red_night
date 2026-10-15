/* =====================================================================
   RED NIGHT — rigs, the player's body, and everything hunting you
   ===================================================================== */
const GEO = {};
function gBox(w, h, d) { const k = 'b' + w + '_' + h + '_' + d; return GEO[k] || (GEO[k] = new T.BoxGeometry(w, h, d)); }
function gLimb(r1, r2, len) { const k = 'l' + r1 + '_' + r2 + '_' + len; if (GEO[k]) return GEO[k]; const g = new T.CylinderGeometry(r1, r2, len, 9); g.translate(0, -len / 2, 0); return GEO[k] = g; }
function gSph(r, sx, sy, sz) { const k = 's' + r; return GEO[k] || (GEO[k] = new T.SphereGeometry(r, 14, 10)); }
function gCone(r, h, seg) { const k = 'c' + r + '_' + h + '_' + seg; return GEO[k] || (GEO[k] = new T.ConeGeometry(r, h, seg || 8)); }

const OUTFITS = {
  samurai: { name: 'Cybergang', top: 0x121218, bottom: 0x1a1a22, accent: 0xf3e600, sleeve: 1 },
  netrunner: { name: 'Hacker', top: 0x0a1a24, bottom: 0x0a1018, accent: 0x05d9e8, sleeve: 1, visor: 1 },
  nomad: { name: 'Nomad', top: 0x4a2a16, bottom: 0x1c2a44, accent: 0xff6a00, sleeve: 1 },
  corpo: { name: 'Corporate', top: 0xd8d6dc, bottom: 0x2a2a30, accent: 0xff2a6d, sleeve: 1 },
};
const SKINS = [0xf1c8a8, 0xd9a07a, 0xa86a44, 0x7a4a2c, 0x4a2c1a];
const HAIRS = ['buzz', 'short', 'long', 'mohawk', 'bob'];
const HAIR_COLS = [0x111014, 0x4a2a16, 0xd9b26a, 0xff2a6d, 0x05d9e8, 0xe8e8f0];

/* ---------- the night's people: the masked purgers and four kinds of ordinary people at war with each other.
   The supernatural is a setting (Settings > Monsters): off, rare (the default: a few after 10 PM) or classic (v21) ---------- */
G.supernatural = ['off', 'rare', 'classic'].indexOf(store('sn')) >= 0 ? store('sn') : 'rare';
function setSupernatural(v) {
  if (['off', 'rare', 'classic'].indexOf(v) < 0) return G.supernatural;
  G.supernatural = v; store('sn', v);
  if ((v === 'classic' || (v === 'rare' && G.hour >= 2)) && typeof charStreamMore === 'function') charStreamMore(); // their models only stream in when they can turn up
  return v;
}
const FACTIONS = {
  purger: { name: 'Purgers', short: 'PURGER', one: 'a purger', color: '#ff2a6d' },
  watch: { name: 'Block Watch', short: 'BLOCK WATCH', one: 'a Block Watch guard', color: '#ff7a1a' },
  eastline: { name: 'Eastline', short: 'EASTLINE', one: 'an Eastline runner', color: '#f2cf1d' },
  rails: { name: 'Rail Kings', short: 'RAIL KINGS', one: 'a Rail King', color: '#3ccf62' },
  looter: { name: 'Looters', short: 'LOOTER', one: 'a looter', color: '#c9b48a' },
  sweeper: { name: 'Council Sweepers', short: 'SWEEPER', one: 'a Council Sweeper', color: '#7fb0ff' },
};
for (const k in FACTIONS) FACTIONS[k].dot = '#' + new T.Color(FACTIONS[k].color).lerp(new T.Color(0x8a8a92), .45).getHexString(); // the minimap's muted dot
// is this NPC after the player right now: the faction's rule (purgers, sweepers, monsters always; the rest when you're close) or a grudge
function hostileToPlayer(e) {
  if (!e || e.dead || e.mode === 'disguise' || e.waitT >= 0) return false;
  if (!e.human || e.fac === 'purger' || e.fac === 'sweeper') return true;
  return e.tg === PLY || grudge(e, PLY) || factionHostile(e, PLY);
}
function npcDotColor(e) { if (e.mode === 'disguise') return '#c8c8d0'; if (hostileToPlayer(e)) return '#ff1f3d'; return (FACTIONS[e.fac] && FACTIONS[e.fac].dot) || '#c8c8d0'; }
const npcName = e => (e.type === 'crew' && FACTIONS[e.fac] ? FACTIONS[e.fac].name : ET[e.type] ? ET[e.type].name : 'Someone');
const npcOne = e => FACTIONS[e.fac] ? FACTIONS[e.fac].one : 'a ' + (ET[e.type] ? ET[e.type].name.toLowerCase() : 'stranger');
// how each faction dresses and arms: a plain crowd body in faction colours, one or two shared pieces, a gun from the core arsenal
const FLOOK = {
  watch: { rigs: ['male_lo', 'male_lo', 'female_lo', 'civilian_lo'], top: [0xd8561a, 0xc84a12, 0xe0661e], bottom: [0x2a3550, 0x3a3428, 0x2a2e36], k: .82, guns: ['riot', 'riot', 'longshot', 'preacher'], ranged: 1, att: ['cap'] },
  eastline: { rigs: ['male_lo', 'civilian_lo', 'female_lo', 'male_lo', 'suit_lo'], top: [0xc8a414, 0xb89410, 0xd2ae1c], bottom: [0x141418, 0x1c1c22, 0x22201c], k: .82, guns: ['vexor', 'vexor', 'preacher', 'kalash'], ranged: .8, att: ['band'] },
  rails: { rigs: ['male_lo', 'civilian_lo', 'female_lo', 'male_lo', 'suit_lo'], top: [0x23743a, 0x1e6432, 0x2a8444], bottom: [0x141418, 0x1c1c22, 0x26241e], k: .82, guns: ['vexor', 'kalash', 'preacher', 'kalash'], ranged: .8, att: ['band'] },
  looter: { rigs: ['civilian_lo', 'civilian_lo', 'female_lo'], top: [0x6a6a70, 0x5e5862, 0x4e565e, 0x6a5e50], bottom: [0x1c2a44, 0x2a2a2e, 0x3a3428], k: .85, guns: ['preacher'], ranged: .25, att: ['bag'] },
  sweeper: { rigs: ['male_lo', 'suit_lo', 'male_lo'], top: [0x22261e, 0x1e201c], bottom: [0x1c1e1a, 0x1a1a1c], k: .92, guns: ['patriot15', 'patriot15', 'kalash', 'riot'], ranged: 1, att: ['helmet', 'vest'] },
};
const HUMAN = { purger: 1, watch: 1, crew: 1, looter: 1, sweeper: 1 }, SUPER = { demon: 1, vampire: 1, shifter: 1, reptile: 1, witch: 1 };
const HEAVY_GUN = { kalash: 1, patriot15: 1, riot: 1, longshot: 1 };
// the pieces: one geometry and one material per kind (and per crew colour), built on first use. Sized for a ~23 cm head.
const FATT = { geo: {}, mat: {} };
function fattMerge(parts) { // [geometry, x, y, z, colour] → one non-indexed geometry with vertex colours
  let n = 0; const qs = parts.map(([g, x, y, z, c]) => { const q = g.index ? g.toNonIndexed() : g; q.translate(x, y, z); n += q.attributes.position.count; return [q, lc(c)]; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const [q, c] of qs) { const m = q.attributes.position.count; pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3); for (let i = 0; i < m; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; } o += m; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeBoundingSphere(); return g;
}
const fattDome = (rx, ry, rz) => { const g = new T.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI / 2); g.scale(rx, ry, rz); return g; };
function fattGeo(kind) {
  const G0 = FATT.geo; if (G0[kind]) return G0[kind];
  if (kind === 'cap') G0[kind] = fattMerge([[fattDome(.112, .085, .122), 0, 0, 0, 0xf06418], [new T.BoxGeometry(.17, .012, .09), 0, .006, -.14, 0xd85a14]]);
  else if (kind === 'band') G0[kind] = fattMerge([[new T.CylinderGeometry(.098, .112, .1, 14, 1, true), 0, 0, 0, 0xffffff]]);
  else if (kind === 'helmet') G0[kind] = fattMerge([[fattDome(.118, .1, .13), 0, 0, 0, 0x4a4e3e], [new T.CylinderGeometry(.121, .123, .028, 14, 1, true), 0, .01, 0, 0x3a3e30], [new T.BoxGeometry(.15, .022, .02), 0, .03, -.128, 0x9fc4ff]]);
  else if (kind === 'bag') G0[kind] = fattMerge([[new T.BoxGeometry(.3, .36, .15), 0, 0, 0, 0x6a5a3a], [new T.BoxGeometry(.31, .07, .16), 0, .16, 0, 0x4a3e28]]);
  else if (kind === 'vest') G0[kind] = fattMerge([[new T.BoxGeometry(.39, .34, .3), 0, 0, 0, 0x3e3e2c], [new T.BoxGeometry(.28, .11, .04), 0, -.08, -.16, 0x34342a], [new T.BoxGeometry(.2, .035, .012), 0, .09, -.156, 0x7fa0d8], [new T.BoxGeometry(.28, .04, .012), 0, .07, .156, 0x7fa0d8]]);
  return G0[kind];
}
function fattMat(kind, fac) {
  const k = kind === 'band' ? kind + fac : kind, M = FATT.mat; if (M[k]) return M[k];
  const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: kind === 'helmet' ? .55 : .85, metalness: kind === 'helmet' ? .25 : 0 });
  if (kind === 'band') m.color.copy(lc(FACTIONS[fac].color)); // a crew's colour, worn over the face
  if (kind === 'cap' || kind === 'band') { m.emissive = lc(kind === 'cap' ? 0x3a1404 : FACTIONS[fac].color).multiplyScalar(kind === 'cap' ? 1 : .05); } // blaze orange and crew colours have to read at 40 m on a dark street
  return (M[k] = m);
}
const _faP = new T.Vector3(), _faQ = new T.Quaternion(), _faS = new T.Vector3();
// a piece on a bone, oriented with the body (not the bone's roll, which differs per Tripo model) at p in body space; the
// rig is fresh: root at the origin, unrotated, in its rest pose, so body space is world space here
function rigAttach(R, bone, mesh, p) {
  const g = new T.Group(); bone.add(g); g.add(mesh); R.root.updateMatrixWorld(true);
  bone.matrixWorld.decompose(_faS, _faQ, _faS); g.quaternion.copy(_faQ).invert();
  bone.getWorldScale(_faS); g.scale.setScalar(1 / (_faS.x || 1)); g.position.copy(bone.worldToLocal(p)); return g;
}
function fattach(e, kind) {
  const R = e.R, mesh = new T.Mesh(fattGeo(kind), fattMat(kind, e.fac)); mesh.castShadow = false; (R.pieces || (R.pieces = [])).push(mesh); // a draw call each: shown only up close (update)
  if (!R.glb) { // the box rig: head centre at (0, .1, 0) on R.head, chest box on R.chest, facing -Z
    const body = kind === 'bag' || kind === 'vest'; (body ? R.chest : R.head).add(mesh);
    if (kind === 'cap') mesh.position.set(0, .17, .005); else if (kind === 'helmet') mesh.position.set(0, .16, 0); else if (kind === 'band') mesh.position.set(0, .04, -.01);
    else if (kind === 'bag') mesh.position.set(0, .12, .2); else { mesh.position.set(0, .12, 0); mesh.scale.set(1.08, .78, 1.02); }
    return;
  }
  const m = R.model, hb = findBone(m, 'head'), ht = findBone(m, 'headtopend'), sp = R.spine || R.hips; if (!hb || !sp) return;
  R.root.updateMatrixWorld(true); const a = hb.getWorldPosition(new T.Vector3()), b = ht ? ht.getWorldPosition(new T.Vector3()) : a.clone().setY(a.y + .22), L = clamp(b.y - a.y, .15, .3), s = sp.getWorldPosition(new T.Vector3());
  let bone = hb, k = L / .22;
  if (kind === 'cap' || kind === 'helmet') _faP.set(a.x, a.y + L * (kind === 'cap' ? .44 : .4), (a.z + b.z) * .5); // the head-top bone sits a few cm over the crown
  else if (kind === 'band') _faP.set(a.x, a.y - L * .1, a.z - .02);                                                  // the head bone is at the eyes on these rigs: under it is mouth and chin
  else { bone = sp; k = (CHARS[R.glb].h || 1.8) / 1.8; _faP.set(a.x, s.y + (kind === 'bag' ? .02 : .05), s.z + (kind === 'bag' ? .19 : -.02)); }
  rigAttach(R, bone, mesh, _faP).scale.multiplyScalar(k);
}
const PIECE_D2 = () => G.quality === 'high' ? 34 * 34 : 26 * 26;
function piecesShow(R, on) { R.piecesOn = on; for (const m of R.pieces) m.visible = on; }

function maskTex(kind) {
  const [c, x] = cvs(128, 128); x.fillStyle = '#0a0a0e'; x.fillRect(0, 0, 128, 128);
  const col = pick(['#ff2a6d', '#05d9e8', '#f3e600', '#ff1f3d', '#3dff6a']); x.strokeStyle = col; x.fillStyle = col; x.shadowColor = col; x.shadowBlur = 10; x.lineWidth = 6;
  if (kind === 0) { x.beginPath(); x.moveTo(30, 50); x.lineTo(50, 44); x.stroke(); x.beginPath(); x.moveTo(78, 44); x.lineTo(98, 50); x.stroke(); x.beginPath(); x.arc(64, 70, 34, .2, Math.PI - .2); x.stroke(); }
  if (kind === 1) { x.fillRect(30, 46, 22, 8); x.fillRect(76, 46, 22, 8); for (let i = 0; i < 6; i++) x.fillRect(32 + i * 11, 86, 6, 12); }
  if (kind === 2) { x.beginPath(); x.moveTo(26, 40); x.lineTo(58, 56); x.lineTo(26, 60); x.closePath(); x.fill(); x.beginPath(); x.moveTo(102, 40); x.lineTo(70, 56); x.lineTo(102, 60); x.closePath(); x.fill(); x.font = "700 30px 'Share Tech Mono', monospace"; x.fillText('XII', 40, 106); }
  if (kind === 3) { x.beginPath(); x.arc(44, 52, 10, 0, TAU); x.stroke(); x.beginPath(); x.arc(84, 52, 10, 0, TAU); x.stroke(); x.beginPath(); x.moveTo(40, 92); x.quadraticCurveTo(64, 74, 88, 92); x.stroke(); }
  return texFrom(c, true);
}
const MASKS = []; function maskMat() { if (MASKS.length < 6) { const t = maskTex(MASKS.length % 4); MASKS.push(new T.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new T.Color(1, 1, 1), emissiveIntensity: 2, roughness: .3, metalness: .4 })); } return pick(MASKS); }

function makeRig(o) {
  const f = o.gender === 'f';
  const sw = f ? .36 : .42, hipW = f ? .34 : .32, legL = f ? .44 : .46, armU = f ? .28 : .3, armL = f ? .26 : .27;
  const skin = new T.MeshStandardMaterial({ color: lc(o.skin), roughness: .55, metalness: 0 });
  const top = new T.MeshStandardMaterial({ color: lc(o.top), roughness: o.leather ? .35 : .7, metalness: o.leather ? .25 : .05 });
  const bottom = new T.MeshStandardMaterial({ color: lc(o.bottom), roughness: .8 });
  const shoe = new T.MeshStandardMaterial({ color: lc(0x0a0a0c), roughness: .4, metalness: .3 });
  const acc = new T.MeshBasicMaterial({ color: lc(o.accent || 0xff2a6d), toneMapped: false });
  const eyeM = new T.MeshBasicMaterial({ color: lc(o.eye || 0x111111), toneMapped: false });
  const R = { mats: { skin, top, bottom, shoe, acc, eyeM }, f, eyeM };
  const root = new T.Group(); R.root = root;
  const hips = new T.Group(); hips.position.y = legL * 2 + .06; root.add(hips); R.hips = hips;
  const M = (geo, mat, x, y, z, par) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); par.add(m); return m; };
  M(gBox(hipW, .17, .21), bottom, 0, 0, 0, hips);
  const spine = new T.Group(); spine.position.y = .06; hips.add(spine); R.spine = spine;
  M(gBox(f ? .27 : .31, .22, .19), top, 0, .12, 0, spine);
  const chest = new T.Group(); chest.position.y = .22; spine.add(chest); R.chest = chest;
  M(gBox(sw, .28, .23), top, 0, .14, 0, chest);
  if (f) { M(gSph(.075), top, -.075, .14, -.1, chest).scale.set(1, .85, .7); M(gSph(.075), top, .075, .14, -.1, chest).scale.set(1, .85, .7); }
  M(gBox(sw + .01, .02, .235), acc, 0, .02, 0, chest);
  M(gBox(.012, .26, .012), acc, sw / 2 - .03, .14, -.118, chest);
  if (o.collar) M(gBox(sw * .8, .08, .25), top, 0, .3, 0, chest);
  const neck = new T.Group(); neck.position.y = .3; chest.add(neck); R.neck = neck;
  M(gLimb(.05, .055, .08), skin, 0, .07, 0, neck);
  const head = new T.Group(); head.position.y = .1; neck.add(head); R.head = head;
  const skull = M(gSph(.115), o.headMat || skin, 0, .1, 0, head); skull.scale.set(.92, 1.08, 1.02); R.skull = skull;
  M(gBox(.15, .08, .14), o.headMat || skin, 0, .02, -.02, head);
  R.eyes = [M(gBox(.035, .014, .01), eyeM, -.042, .1, -.112, head), M(gBox(.035, .014, .01), eyeM, .042, .1, -.112, head)];
  // hair
  if (o.hair && o.hair !== 'none') {
    const hm = new T.MeshStandardMaterial({ color: lc(o.hairCol || 0x111111), roughness: .6, metalness: .1 });
    const neonHair = [0xff2a6d, 0x05d9e8].includes(o.hairCol); if (neonHair) { hm.emissive = lc(o.hairCol); hm.emissiveIntensity = .5; }
    if (o.hair === 'buzz') M(gSph(.118), hm, 0, .12, .005, head).scale.set(.95, .95, 1.03);
    if (o.hair === 'short') { M(gSph(.122), hm, 0, .13, .01, head).scale.set(1, .9, 1.06); M(gBox(.2, .05, .1), hm, 0, .2, -.06, head).rotation.x = -.3; }
    if (o.hair === 'long') { M(gSph(.124), hm, 0, .13, .012, head).scale.set(1.02, .95, 1.08); M(gBox(.22, .32, .07), hm, 0, -.04, .09, head); }
    if (o.hair === 'mohawk') { M(gSph(.117), hm, 0, .11, .01, head).scale.set(.9, .9, 1); M(gBox(.035, .12, .24), hm, 0, .25, .01, head); }
    if (o.hair === 'bob') { M(gSph(.13), hm, 0, .11, .015, head).scale.set(1.08, 1, 1.1); M(gBox(.25, .14, .2), hm, 0, .0, .04, head); }
  }
  if (o.visor) M(gBox(.2, .035, .03), acc, 0, .1, -.115, head);
  if (o.mask) { const mk = M(gBox(.19, .2, .02), o.mask, 0, .07, -.122, head); }
  if (o.glasses) M(gBox(.19, .035, .02), new T.MeshStandardMaterial({ color: 0x050505, metalness: 1, roughness: .1 }), 0, .1, -.12, head);
  if (o.horns) { const hmat = STD(0x1a0a08, .4, .3); M(gCone(.03, .2, 6), hmat, -.07, .26, -.02, head).rotation.z = .4; M(gCone(.03, .2, 6), hmat, .07, .26, -.02, head).rotation.z = -.4; }
  if (o.hood) { const hd = M(gCone(.17, .42, 10), o.hood, 0, .17, .02, head); hd.rotation.x = -.12; }
  // arms
  const arm = (side) => {
    const sh = new T.Group(); sh.position.set(side * (sw / 2 + .04), .24, 0); chest.add(sh);
    M(gLimb(.055, .045, armU), o.sleeveless ? skin : top, 0, 0, 0, sh);
    const el = new T.Group(); el.position.y = -armU; sh.add(el);
    M(gLimb(.045, .036, armL), o.sleeve ? top : skin, 0, 0, 0, el);
    const hand = new T.Group(); hand.position.y = -armL; el.add(hand);
    M(gBox(.06, .09, .035), o.handMat || skin, 0, -.04, 0, hand);
    if (o.claws) for (let i = 0; i < 3; i++) M(gCone(.008, .1, 4), STD(0xe0e0d0, .3), -.02 + i * .02, -.13, -.01, hand).rotation.x = Math.PI;
    return { sh, el, hand };
  };
  R.lArm = arm(-1); R.rArm = arm(1);
  const leg = (side) => {
    const hp = new T.Group(); hp.position.set(side * hipW * .3, -.04, 0); hips.add(hp);
    M(gLimb(.075, .06, legL), bottom, 0, 0, 0, hp);
    const kn = new T.Group(); kn.position.y = -legL; hp.add(kn);
    M(gLimb(.058, .045, legL), bottom, 0, 0, 0, kn);
    const ft = new T.Group(); ft.position.y = -legL; kn.add(ft);
    M(gBox(.09, .07, .22), shoe, 0, -.03, -.05, ft);
    return { hp, kn, ft };
  };
  R.lLeg = leg(-1); R.rLeg = leg(1);
  if (o.coat) { const ct = M(gBox(hipW + .06, .62, .26), o.coat, 0, -.28, .01, hips); R.coat = ct; }
  if (o.cloak) { const cl = M(gCone(.42, 1.45, 10), o.cloak, 0, -.25, .02, chest); R.cloak = cl; }
  if (o.tail) {
    R.tail = []; let par = hips; const tm = o.tailMat;
    for (let i = 0; i < 6; i++) { const seg = new T.Group(); seg.position.set(0, i === 0 ? -.05 : 0, i === 0 ? .1 : .16); par.add(seg); M(gLimb(.05 - i * .007, .045 - i * .007, .17), tm, 0, 0, 0, seg).rotation.x = Math.PI / 2; R.tail.push(seg); par = seg; }
  }
  root.traverse(m => { if (m.isMesh) m.frustumCulled = true; });
  return R;
}
// procedural animation (st: speed, phase, aim, hold, attack, crouch, air, death, flinch, t)
function animRig(R, st, dt) {
  const s = clamp(st.speed / 7, 0, 1.4), run = st.speed > 5.2;
  st.phase = (st.phase || 0) + dt * (2.2 + st.speed * 1.45);
  const p = st.phase, a = Math.min(1, s * 1.1);
  const legA = (run ? .85 : .6) * a, kneeA = (run ? 1.3 : .9) * a;
  const cr = st.crouch || 0;
  R.lLeg.hp.rotation.x = Math.sin(p) * legA - cr * .9; R.rLeg.hp.rotation.x = Math.sin(p + Math.PI) * legA - cr * .9;
  R.lLeg.kn.rotation.x = Math.max(0, -Math.cos(p)) * kneeA + .05 + cr * 1.6; R.rLeg.kn.rotation.x = Math.max(0, -Math.cos(p + Math.PI)) * kneeA + .05 + cr * 1.6;
  R.lLeg.ft.rotation.x = -cr * .7; R.rLeg.ft.rotation.x = -cr * .7;
  if (st.air) { R.lLeg.hp.rotation.x = -.6; R.rLeg.hp.rotation.x = .2; R.lLeg.kn.rotation.x = 1.1; R.rLeg.kn.rotation.x = .5; }
  const bob = Math.abs(Math.sin(p)) * .05 * a;
  R.hips.position.y = (R.f ? .94 : .98) - cr * .32 + bob - (run ? .04 : 0);
  R.spine.rotation.x = -(run ? .22 : .05) * a + cr * .1 + (st.hunch || 0);
  R.spine.rotation.y = Math.sin(p) * .12 * a * (st.hold === 'none' ? 1 : .3);
  R.chest.scale.y = 1 + Math.sin(st.t * 1.8) * .012;
  const swing = Math.sin(p) * (run ? .9 : .55) * a;
  const ap = st.aimPitch || 0;
  if (st.hold === 'rifle' && st.aim !== false) {
    R.rArm.sh.rotation.set(-1.15 + ap * .9, 0, -.12); R.rArm.el.rotation.set(-.75, 0, 0);
    R.lArm.sh.rotation.set(-1.3 + ap * .9, 0, .62); R.lArm.el.rotation.set(-.25, 0, 0);
  } else if (st.hold === 'pistol') {
    R.rArm.sh.rotation.set(-1.45 + ap, 0, .15); R.rArm.el.rotation.set(-.05, 0, 0);
    R.lArm.sh.rotation.set(-1.4 + ap, 0, -.35); R.lArm.el.rotation.set(-.15, 0, 0);
  } else if (st.hold === 'melee') {
    const k = st.attack || 0; const sw2 = k > 0 ? Math.sin(k * Math.PI) : 0;
    R.rArm.sh.rotation.set(-.5 - (k > 0 ? 2.2 - k * 3.2 : 0) + swing * .3, 0, .2 + sw2 * .6); R.rArm.el.rotation.set(-.6, 0, 0);
    R.lArm.sh.rotation.set(-swing * .8, 0, -.1); R.lArm.el.rotation.set(-.3, 0, 0);
  } else if (st.hold === 'claw') {
    const k = st.attack || 0; const sw2 = k > 0 ? Math.sin(k * Math.PI) : 0;
    R.rArm.sh.rotation.set(-.7 - sw2 * 1.6 + swing * .4, 0, .3 - sw2 * .5); R.rArm.el.rotation.set(-.4 - sw2 * .5, 0, 0);
    R.lArm.sh.rotation.set(-.7 - sw2 * 1.2 - swing * .4, 0, -.3 + sw2 * .5); R.lArm.el.rotation.set(-.4, 0, 0);
  } else if (st.hold === 'plead') {
    R.rArm.sh.rotation.set(-2.6, 0, .4); R.rArm.el.rotation.set(-.6, 0, 0); R.lArm.sh.rotation.set(-2.6, 0, -.4); R.lArm.el.rotation.set(-.6, 0, 0);
  } else if (st.hold === 'cast') {
    const k = st.attack || 0; R.rArm.sh.rotation.set(-1.6 - Math.sin(k * Math.PI) * .9, 0, .2); R.rArm.el.rotation.set(-.2, 0, 0);
    R.lArm.sh.rotation.set(-.4 - Math.sin(st.t * 3) * .2, 0, -.5); R.lArm.el.rotation.set(-.8, 0, 0);
  } else {
    R.rArm.sh.rotation.set(-swing, 0, .08); R.rArm.el.rotation.set(-.25 - Math.max(0, swing) * .4, 0, 0);
    R.lArm.sh.rotation.set(swing, 0, -.08); R.lArm.el.rotation.set(-.25 - Math.max(0, -swing) * .4, 0, 0);
  }
  R.head.rotation.x = -ap * .6 + (st.hunch ? -st.hunch : 0);
  if (R.tail) R.tail.forEach((sg, i) => { sg.rotation.y = Math.sin(st.t * 3 + i * .7) * .25; sg.rotation.x = .15; });
  if (R.coat) R.coat.rotation.x = Math.min(.5, st.speed * .06);
  if (st.flinch > 0) { R.spine.rotation.x -= st.flinch * .5; R.head.rotation.x -= st.flinch * .4; }
  if (st.death > 0) {
    const k = Math.min(1, st.death); const e = 1 - Math.pow(1 - k, 3);
    R.root.rotation.x = -e * Math.PI / 2 * (st.fallDir || 1); R.hips.position.y = lerp(R.hips.position.y, .2, e);
    R.lArm.sh.rotation.set(-e * 2.6, 0, -.6 * e); R.rArm.sh.rotation.set(-e * 2.2, 0, .9 * e); R.lLeg.kn.rotation.x = .3 * e; R.rLeg.kn.rotation.x = .1 * e;
  }
}

/* ---------- enemy definitions ---------- */
const ET = {
  purger: { name: 'Purger', hp: 110, speed: 4.4, score: 100, r: .4 },
  demon: { name: 'Demon', hp: 260, speed: 5.4, score: 250, r: .5 },
  vampire: { name: 'Vampire', hp: 170, speed: 6.2, score: 200, r: .4 },
  shifter: { name: 'Shapeshifter', hp: 70, speed: 1.2, score: 300, r: .45 },
  reptile: { name: 'Reptilian', hp: 190, speed: 2.6, score: 250, r: .42 },
  witch: { name: 'Witch', hp: 150, speed: 4.5, score: 250, r: .4 },
  watch: { name: 'Block Watch', hp: 120, speed: 3.6, score: 80, r: .4 },
  crew: { name: 'Street Crew', hp: 105, speed: 4.6, score: 120, r: .4 },
  looter: { name: 'Looter', hp: 70, speed: 4.9, score: 50, r: .4 },
  sweeper: { name: 'Council Sweeper', hp: 150, speed: 4.2, score: 220, r: .42 },
};
const ENEMIES = [], WISPS = [], PROJ = [];
let enemyId = 0;
// rigs built this frame: past the budget, a deferred one waits for the next frame
const BUILDS = { t: -1, n: 0 };
function buildsNow() { if (BUILDS.t !== G.t) { BUILDS.t = G.t; BUILDS.n = 0; } return BUILDS; }
const buildSlot = () => buildsNow().n < (G.quality === 'high' ? 3 : 2);
// scanned model per type, and every model a type can end up wearing (the shapeshifter's beast, the reptilian under the suit)
const ENEMY_GLB = { purger: 'purger', demon: 'demon', vampire: 'vampire', shifter: 'civilian', reptile: 'suit', witch: 'witch' };
const ENEMY_NEEDS = { purger: ['purger'], demon: ['demon'], vampire: ['vampire'], shifter: ['civilian', 'beast'], reptile: ['suit', 'reptile'], witch: ['witch'], watch: [], crew: [], looter: [], sweeper: [] }; // the people wear the boot-set crowd bodies
const ATK_CLIP = { demon: 'punch', vampire: 'slash', shifter: 'punch', reptile: 'cast', witch: 'cast' };
// the supernatural tell: eye colour per model (the suit and the civilian only flash it, while the disguise holds)
const EYE_COL = { demon: 0xff6a10, vampire: 0xff1030, witch: 0x3dff6a, reptile: 0xf3e600, beast: 0xff2a14, suit: 0xf3e600, civilian: 0xff2a14 };
// what each type sounds like from down the block, before it's seen
const IDLE_BARK = { purger: 'mutter', demon: 'demon', vampire: 'vampire', witch: 'witch', reptile: 'reptile', shifter: 'shifter', watch: 'mutter', crew: 'mutter', looter: 'mutter', sweeper: 'radio' };
const BLEED = { dot: 1, by: PLY }; // only your blades open a bleed
let _idleBarkT = -9;
const NPC_GUNS = {};
const _eHP = new T.Vector3(), _wT = new T.Vector3(), _wD = new T.Vector3(), _pStep = new T.Vector3(), _pDir = new T.Vector3(), _pHit = new T.Vector3(), _pC = new T.Vector3();
class Enemy {
  constructor(type, x, z, opts) {
    if (SUPER[type] && (G.supernatural === 'off' || (G.supernatural === 'rare' && G.started && G.hour < 3))) type = 'purger'; // the club's set piece and the final wave included
    const d = ET[type]; this.type = type; this.id = ++enemyId; this.pos = new T.Vector3(x, 0, z); this.vel = new T.Vector3(); this.face = Math.random() * TAU;
    this.hp = d.hp; this.maxHp = d.hp; this.speed = d.speed; this.r = d.r; this.scale = 1; this.dead = false; this.deadT = 0; this.cd = rand(.5, 1.5); this.t = Math.random() * 10;
    this.st = { speed: 0, phase: Math.random() * 6, hold: 'none', t: 0, attack: 0, flinch: 0, death: 0 };
    this.atk = 0; this.mode = 'hunt'; this.dmgMul = 1; this.seen = false; this.stuckT = 0; this.lastPos = this.pos.clone(); this.sideStep = 0;
    this.possessed = false; this.revealed = false; this.bleed = 0; this.slowT = 0; this.waitT = -1; this.voiceT = rand(3, 12); this.eyeT = rand(2, 6); this.castT = 0; this.hH = 1.68;
    this.aware = !!(opts && opts.aware); this.supp = 0; this.role = null; if (this.aware) { this.awareT = G.t; this.lastSeen = G.t; this.lastKnown = P.pos.clone(); }
    this.human = !!HUMAN[type]; this.fac = type === 'crew' ? ((opts && opts.fac) || pick(['eastline', 'rails'])) : this.human ? type : 'monster';
    this.tg = null; this.seesT = false; this.gr = null; this.wst = null; this.camD2 = 0; this.unseen = false; this.npcSrc = { by: this }; this.lastShotT = -99;
    if (opts && opts.sq) this.sq = opts.sq;
    const o = { gender: Math.random() < .5 ? 'f' : 'm', skin: pick(SKINS), hair: pick(HAIRS), hairCol: pick(HAIR_COLS.slice(0, 3)) };
    if (type === 'purger') {
      Object.assign(o, { top: pick([0x15151a, 0x2a1010, 0x1a1a2a, 0x2a2a20]), bottom: pick([0x111114, 0x1c2a44]), accent: pick([0xff2a6d, 0x05d9e8, 0xf3e600, 0xff1f3d]), sleeve: 1, mask: maskMat(), hair: Math.random() < .5 ? 'buzz' : 'short' });
      this.ranged = Math.random() < (opts && opts.ranged !== undefined ? opts.ranged : .45);
      this.st.hold = this.ranged ? 'pistol' : 'melee';
      this.molotov = this.ranged && Math.random() < .25;
    } else if (this.human) { // ordinary people: faction colours on a plain body, the faction's guns
      const L = FLOOK[this.fac], fc = new T.Color(FACTIONS[this.fac].color).getHex();
      Object.assign(o, { top: pick(L.top), bottom: pick(L.bottom), accent: fc, hairCol: pick(HAIRN), sleeve: 1 });
      if (type === 'looter') o.hood = STD(0x1c1c20, .9);
      if (type === 'sweeper') { o.visor = 1; o.hair = 'buzz'; o.gender = 'm'; this.armor = .45; }
      this.rig = pick(L.rigs); if (this.rig === 'female_lo') o.gender = 'f';
      this.ranged = Math.random() < (opts && opts.ranged !== undefined ? opts.ranged : L.ranged);
      if (this.ranged) { this.gunId = pick(L.guns); this.wst = NPC_WEAP[this.gunId] || null; this.heavyGun = !!HEAVY_GUN[this.gunId]; }
      this.st.hold = this.ranged ? 'pistol' : 'melee';
      if (opts && opts.post) { this.post = opts.post; this.home = opts.home ? opts.home.clone() : this.pos.clone(); this.homeN = opts.homeN || null; this.postObj = opts.postObj || null; }
      else if (type === 'looter') { this.home = (opts && opts.home ? opts.home : this.pos).clone(); this.homeN = (opts && opts.homeN) || null; }
      if (type === 'watch' && !this.post) { this.post = this.pos.clone(); this.home = this.pos.clone(); }
    } else if (type === 'demon') {
      Object.assign(o, { gender: 'm', skin: 0x3a0806, top: 0x2a0604, bottom: 0x1a0402, accent: 0xff5a10, eye: 0xff8a10, horns: 1, sleeveless: 1, hair: 'none', claws: 1 });
      this.scale = 1.18; this.st.hold = 'claw'; this.st.hunch = .25;
    } else if (type === 'vampire') {
      Object.assign(o, { skin: 0xe6dce6, top: 0x0a0a0e, bottom: 0x0a0a0e, accent: 0x8a0010, eye: 0xff1030, coat: new T.MeshStandardMaterial({ color: lc(0x08080a), roughness: .35, metalness: .2 }), collar: 1, hair: Math.random() < .5 ? 'short' : 'long', hairCol: 0x0a0a0c, claws: 1 });
      this.st.hold = 'claw';
    } else if (type === 'shifter') {
      Object.assign(o, { top: pick([0x4a4a52, 0x2a3a2a, 0x3a2a2a]), bottom: 0x1c2a44, accent: 0x222222, hair: 'short' });
      this.st.hold = 'plead'; this.mode = 'disguise';
    } else if (type === 'reptile') {
      Object.assign(o, { gender: 'm', top: 0x0c0c10, bottom: 0x0c0c10, accent: 0xeeeeee, glasses: 1, collar: 1, hair: 'short', hairCol: 0x1a1a1a, tailMat: new T.MeshStandardMaterial({ map: camoTex('scales').map, color: 0xffffff, roughness: .5, metalness: .2 }) });
      this.mode = 'disguise';
    } else if (type === 'witch') {
      const cloakM = new T.MeshStandardMaterial({ color: lc(0x1a0a2a), roughness: .8, emissive: lc(0x2a0a4a), emissiveIntensity: .3 });
      Object.assign(o, { gender: 'f', skin: 0xb8c8b0, top: 0x1a0a2a, bottom: 0x1a0a2a, accent: 0xb04dff, eye: 0x3dff6a, hair: 'long', hairCol: 0x0a0a0a, cloak: cloakM, hood: cloakM });
      this.st.hold = 'cast';
    }
    this.o = o;
    // a type whose models are still streaming in waits, unseen and untouchable, and materialises when they land. So does a member
    // of a group (opts.defer): a rig costs 1-3 ms on a phone, so a squad builds a couple a frame instead of all in one
    const pend = enemyPending(type);
    if (pend || (opts && opts.defer)) { this.R = { root: new T.Group() }; this.R.root.visible = false; scene.add(this.R.root); this.waitT = 0; if (pend) wantEnemy(type); }
    else this.build();
  }
  build() {
    const type = this.type; let R = null; buildsNow().n++;
    if (this.human && type !== 'purger') { // a crowd body, recoloured, with the faction's pieces on it
      const L = FLOOK[this.fac], id = CHARS_READY && [this.rig, ...L.rigs].find(k => CHARS[k] && CHARS[k].scene);
      R = id ? makeGLBRig(id) : null;
      if (R) { customizeGLB(R, { skin: this.o.skin, hairCol: this.o.hairCol, top: this.o.top, bottom: this.o.bottom, accent: this.o.accent, k: L.k }); for (const ms of R.meshes) { const u = ms.material.userData.rim; if (u) { u.c.value.set(FACTIONS[this.fac].color); u.k.value = .42; } } }
    } else { const glb = CHARS_READY && ENEMY_NEEDS[type].every(id => CHARS[id].scene); R = glb ? makeGLBRig(ENEMY_GLB[type]) : null; } // half a set (a failed beast) would leave a broken transform: box rig instead
    this.R = R || makeRig(this.o);
    if (this.human && FLOOK[this.fac]) for (const k of FLOOK[this.fac].att) fattach(this, k);
    this.R.root.scale.setScalar(this.scale); this.hH = this.R.glb ? charHeadY(this.R.glb) : 1.68;
    if (this.human) this.attachWeapon(this.ranged ? 'gun' : type === 'looter' ? 'crowbar' : 'bat');
    if (type === 'witch') this.attachWeapon('staff');
    if (type === 'reptile') { this.R.tail = null; }
    scene.add(this.R.root); this.sync();
    if (type === 'demon') { this.glow = glowSprite(0, 1.6, 0, lc(0xff3a10), 2.2, this.R.root); this.glow.material.opacity = .42; }
    this.eyesOn();
  }
  // glowing eyes on the scanned models; a disguise keeps them dark except for the odd flash (updateEyes)
  eyesOn() { if (!this.R.glb) return; const c = this.possessed ? 0xff3a00 : EYE_COL[this.R.glb]; if (!c) return; const q = addEyes(this.R, c); if (q) { q.visible = this.mode !== 'disguise'; if (this.possessed) q.scale.multiplyScalar(1.25); } }
  updateEyes(dt, d2) {
    const q = this.R.eyeQ; if (!q || this.mode !== 'disguise') return;
    if ((this.eyeT -= dt) > 0) return; q.visible = !q.visible && d2 < 32 * 32; this.eyeT = q.visible ? rand(.07, .14) : rand(5, 10);
  }
  // an idle cue by ear at a distance (the close-range alerts and pain are the ambience's autoBarks): one per enemy every
  // 10-20 s, one across the whole street every 2 s. Marked internal so autoBarks keeps voicing the rest.
  idleVoice(dt, d2) {
    if ((this.voiceT -= dt) > 0) return; this.voiceT = rand(10, 20);
    if (d2 < 16 * 16 || d2 > 72 * 72 || G.t - _idleBarkT < 2 || this.mode === 'morph' || typeof AMB === 'undefined' || !AMB.bark) return;
    if (this.mode === 'disguise' && (this.type !== 'shifter' || Math.random() > .3)) return; // a shifter in the crowd sometimes growls when nobody's close
    _idleBarkT = G.t;
    try { AMB.bark(this.pos, this.human && this.aware && this.type !== 'sweeper' ? 'shout' : IDLE_BARK[this.type], { ambient: 1 }); } catch (e) { }
  }
  attachWeapon(k) {
    const hand = this.R.rArm.hand; const g = new T.Group();
    if (this.R.glb) { const mg = attachToBone(hand, g, 0, 0, Math.PI); if (k === 'gun') this.R.gunMount = { g: mg, mode: 'npc' }; } else hand.add(g);
    if (k === 'gun' && this.R.glb) { // a real modelled weapon from the arsenal, oriented by aimOverlay like the player's
      const id = this.gunId = this.gunId || pick(['preacher', 'preacher', 'vexor', 'kalash', 'patriot15', 'riot']);
      // one built gun per model, cloned per purger (shared geometry and materials): a spawn no longer rebuilds a whole weapon
      let tpl = NPC_GUNS[id]; if (!tpl && MODELS[id] && MODELS[id].scene) tpl = NPC_GUNS[id] = buildWeapon(W[id], defaultCfg(W[id]), true).g;
      const gg = tpl ? tpl.clone() : buildWeapon(W[id], defaultCfg(W[id]), true).g; gg.rotation.x = -Math.PI / 2; gg.position.set(0, -.02, .01); g.add(gg);
      this.R.gunMount.mode = 'tpp'; this.gun = gg; this.heavyGun = !!HEAVY_GUN[id];
    } else if (k === 'gun') { const m = new T.Mesh(gBox(.04, .06, .22), STD(0x111114, .4, .8)); m.position.set(0, -.07, -.08); g.add(m); this.gun = m; }
    if (k === 'bat') { const m = new T.Mesh(gLimb(.022, .04, .8), Math.random() < .5 ? STD(0x5a3a1a, .6) : STD(0x9a9aa0, .3, .9)); m.rotation.x = Math.PI; m.position.set(0, -.07, 0); g.add(m); }
    if (k === 'crowbar') { const mt = STD(0x1c1c20, .45, .8), m = new T.Mesh(gLimb(.012, .012, .72), mt); m.rotation.x = Math.PI; m.position.set(0, -.07, 0); g.add(m); const hk = new T.Mesh(gBox(.025, .025, .09), mt); hk.position.set(0, .64, -.035); g.add(hk); }
    if (k === 'staff') { const m = new T.Mesh(gLimb(.018, .018, 1.5), STD(0x2a1a10, .8)); m.rotation.x = Math.PI; m.position.set(0, -.6, 0); g.add(m); const orb = new T.Mesh(gSph(.07), NEON(0x3dff6a)); orb.position.set(0, .2, 0); g.add(orb); glowSprite(0, .2, 0, lc(0x3dff6a), .9, g); }
  }
  sync() { this.R.root.position.copy(this.pos); if (this.R.crouchW) this.R.root.position.y -= this.R.crouchW * .17 * this.scale; this.R.root.rotation.y = this.face; }
  // hH: the rig's head height at scale 1 (1.68 for the box rig, measured for scanned models); the root scale is what's drawn
  headPos(out) { return (out || new T.Vector3()).set(this.pos.x, this.pos.y + this.hH * this.R.root.scale.y * (this.st.crouch ? .8 : 1), this.pos.z); }
  dist2() { const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z; return dx * dx + dz * dz; }
  turnTo(x, z, dt, k) { const tgt = Math.atan2(-(x - this.pos.x), -(z - this.pos.z)); let d = tgt - this.face; d = Math.atan2(Math.sin(d), Math.cos(d)); this.face += d * Math.min(1, dt * (k || 8)); }
  moveToward(x, z, spd, dt) {
    const dx = x - this.pos.x, dz = z - this.pos.z; const L = Math.hypot(dx, dz) || 1;
    let vx = dx / L * spd, vz = dz / L * spd;
    if (this.sideStep > 0) { this.sideStep -= dt; const s = this.sideDir; const tx = -vz * s, tz = vx * s; vx = vx * .2 + tx; vz = vz * .2 + tz; }
    this.vel.x = damp(this.vel.x, vx, 8, dt); this.vel.z = damp(this.vel.z, vz, 8, dt);
  }
  update(dt) {
    if (this.waitT >= 0) { this.waitT += dt; if ((enemyPending(this.type) && this.waitT < 12) || !buildSlot()) return; scene.remove(this.R.root); this.waitT = -1; this.build(); } // models landed (or gave up: box rig) and this frame has room for a rig
    this.t += dt; this.st.t = this.t;
    const d2 = this.dist2(), dist = Math.sqrt(d2);
    { const C = camFrame(), cx = this.pos.x - camera.position.x, cz = this.pos.z - camera.position.z; this.camD2 = cx * cx + cz * cz; this.unseen = this.camD2 > 4900 && cx * C.x + cz * C.z < Math.sqrt(this.camD2) * C.cos; if (this.R.pivot) this.R.pivot.visible = bodyInView(this.pos.x, this.pos.z, this.camD2); }
    if (this.R.pieces) { const pv = this.camD2 < PIECE_D2(); if (this.R.piecesOn !== pv) piecesShow(this.R, pv); } // past ~26 m the body colour and the faction rim carry the read
    if (this.dead) {
      this.deadT += dt; this.st.death = this.deadT * 2.2; this.st.speed = 0; if (this.R.glb) { if (this.deadT < 6) animGLB(this.R, this.st, dt); } else animRig(this.R, this.st, dt);
      const sink = this.killedByP || !this.human ? 7 : 14; // the street's own dead lie there a while: it's how you know what happened
      if (this.deadT > sink) { const k = clamp((this.deadT - sink) / 1.5, 0, 1); this.R.root.position.y = -k * .6; if (k >= 1) this.remove(); }
      return;
    }
    if (this.bleed > 0) { this.bleed -= dt; this.hurt(9 * dt, null, null, BLEED); if (Math.random() < .3) FXN.emit(this.pos.x, 1.1, this.pos.z, rand(-.3, .3), -1, rand(-.3, .3), .6, .08, .05, COL.blood, 1, 6); if (this.dead) return; }
    this.st.flinch = Math.max(0, this.st.flinch - dt * 4);
    if (this.slowT > 0) this.slowT -= dt;
    // far LOD: freeze animation, still move
    const far = d2 > 90 * 90;
    if (this.human) fighterScan(this, dt); else if (this.mode !== 'disguise') perceive(this, dt, dist);
    this.ai(dt, dist);
    // movement & collision
    const sp = this.slowT > 0 ? .5 : 1;
    this.pos.x += this.vel.x * dt * sp; this.pos.z += this.vel.z * dt * sp;
    if (this.type !== 'witch' && this.type !== 'demon') this.pos.y = 0;
    if (!this.unseen || (this.colT = (this.colT || 0) - dt) <= 0) { this.colT = .1; collideCircle(this.pos, this.r * this.scale, Math.max(0, this.pos.y), 1.8); } // far and off screen: a few times a second
    for (const c of CARS) { const dx = this.pos.x - c.pos.x, dz = this.pos.z - c.pos.z; const dd = dx * dx + dz * dz; if (dd < 6) { const L = Math.sqrt(dd) || 1; if (c.occ && Math.abs(c.speed) > 6) { this.hurt(Math.abs(c.speed) * 9, 'body', c.fwd(), 'car'); this.vel.addScaledVector(c.fwd(), c.speed * .6); this.pos.y = 0; shake(.25); } this.pos.x = c.pos.x + dx / L * 2.45; this.pos.z = c.pos.z + dz / L * 2.45; } }
    // separation
    for (const e of ENEMIES) { if (e === this || e.dead) continue; const dx = this.pos.x - e.pos.x, dz = this.pos.z - e.pos.z; const dd = dx * dx + dz * dz; const rr = (this.r + e.r) * 1.2; if (dd < rr * rr && dd > 1e-4) { const L = Math.sqrt(dd); const push = (rr - L) * .5; this.pos.x += dx / L * push; this.pos.z += dz / L * push; } }
    // stuck detection: sidestep around corners
    this.stuckT += dt; if (this.stuckT > 1.2) { const mv = this.pos.distanceTo(this.lastPos); if (mv < .6 && dist > 3 && this.mode !== 'disguise') { this.sideStep = 1.4; this.sideDir = Math.random() < .5 ? 1 : -1; } this.lastPos.copy(this.pos); this.stuckT = 0; }
    this.st.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.atk > 0) { this.atk = Math.max(0, this.atk - dt); this.st.attack = 1 - this.atk / this.atkDur; } else this.st.attack = 0;
    this.st.aimPitch = 0;
    if (this.R.glb) {
      const ak = this.atk > 0; this.st.attackJust = ak && !this.prevAtk; this.prevAtk = ak;
      this.st.attackClip = this.human ? (this.ranged ? null : 'slash') : ATK_CLIP[this.type];
      this.st.aimHold = this.human && this.ranged && (this.burst > 0 || (this.aware && this.seesT && (this.tgD || 99) < 50) || !!this.warnAim || !!this.st.aimHoldCiv); this.st.aimHoldCiv = 0;
      // animation LOD: every frame up close, every few frames down the block, rarely far off or behind the camera
      this.aT = (this.aT || 0) + dt; const every = far ? .2 : this.unseen || (this.R.pivot && !this.R.pivot.visible) ? .25 : this.camD2 > 45 * 45 ? .066 : this.camD2 > 22 * 22 ? .033 : 0;
      if (this.aT >= every) { animGLB(this.R, this.st, this.aT); this.aT = 0; }
    } else if (!far) animRig(this.R, this.st, dt);
    this.sync();
    if (this.type === 'demon' && Math.random() < dt * 14 && d2 < 60 * 60) FXA.emit(this.pos.x + rand(-.4, .4), rand(.4, 2), this.pos.z + rand(-.4, .4), rand(-.3, .3), rand(.6, 1.6), rand(-.3, .3), rand(.6, 1.2), .1, .02, COL.ember, 1, 0, 0);
    if (this.possessed && Math.random() < dt * 10) FXA.emit(this.pos.x, rand(1, 2), this.pos.z, rand(-.3, .3), rand(.5, 1.2), rand(-.3, .3), .7, .14, .02, COL.ember, 1);
    if (this.castT > 0 && (this.castT -= dt) <= 0 && !(this.vanish > 0)) hexOrb(this); // the orb leaves the staff mid-cast (game time: pause and photo mode hold it). vanish sits just below 0 after a blink, so !vanish never fired again
    this.updateEyes(dt, d2); this.idleVoice(dt, d2);
  }
  ai(dt, dist) {
    const px = P.pos.x, pz = P.pos.z;
    this.cd -= dt; this._dt = dt;
    if (this.human) { fighterAI(this, dt); return; } // people fight whoever they're after (ai.js); monsters only ever want you
    if (P.dead) { this.moveToward(this.pos.x + Math.sin(this.t) * 3, this.pos.z + Math.cos(this.t) * 3, 1, dt); return; }
    if (!this.aware && this.mode !== 'disguise' && !(this.vanish > 0) && !(this.leapT > 0) && !(this.dashT > 0)) { this.melee(0, 0, 0, 0, dist); idleAI(this, dt, dist); return; }
    if (this.aware && !this.seesP && this.lastKnown && this.mode !== 'disguise' && G.t - (this.lastSeen || -99) > 2 && this.type !== 'witch') { // monsters hunt your last known spot by scent/sound
      const lk = this.lastKnown; if (this.pos.distanceTo(lk) > 2.5) { const n = navPoint(this, lk); this.moveToward(n.x, n.z, this.speed * .9, dt); this.turnTo(n.x, n.z, dt, 6); return; }
    }
    switch (this.type) {
      case 'purger': {
        const spd = this.speed * (this.possessed ? 1.4 : 1);
        if (this.ranged) {
          const los = dist < 45 && (this.losT = (this.losT || 0) - dt) <= 0 ? (this.los = losClear(this.headPos(), P.eye()), this.losT = .4, this.los) : this.los;
          if (dist > 22 || !los) this.moveToward(px, pz, spd, dt);
          else if (dist < 8) this.moveToward(this.pos.x * 2 - px, this.pos.z * 2 - pz, spd * .7, dt);
          else { const s = Math.sin(this.t * .7 + this.id) > 0 ? 1 : -1; this.vel.x = damp(this.vel.x, -(pz - this.pos.z) / dist * 2 * s, 4, dt); this.vel.z = damp(this.vel.z, (px - this.pos.x) / dist * 2 * s, 4, dt); }
          this.turnTo(px, pz, dt, 10);
          if (los && dist < 40 && this.cd <= 0) { this.burst = rint(2, 4); this.cd = rand(1.2, 2.2) / (this.possessed ? 1.6 : 1); this.bT = 0; }
          if (this.burst > 0) { this.bT -= dt; if (this.bT <= 0) { this.burst--; this.bT = .13; enemyFire(this, 7 * this.dmgMul, dist, false); } }
        } else {
          this.moveToward(px, pz, dist < 2 ? 0 : spd, dt); this.turnTo(px, pz, dt);
          this.melee(1.9, 14, .55, 1.0, dist);
        }
        break;
      }
      case 'demon': {
        if (!this.leapT && dist < 9 && dist > 3.5 && this.cd <= 0) { this.leapT = .7; this.cd = 3; this.vel.set((px - this.pos.x) / dist * 13, 0, (pz - this.pos.z) / dist * 13); AU.roar(spatial(this.pos).pan, spatial(this.pos).vol); }
        if (this.leapT > 0) { this.leapT -= dt; this.pos.y = Math.sin((1 - this.leapT / .7) * Math.PI) * 2.2; if (this.leapT <= 0) { this.leapT = 0; this.pos.y = 0; burst(FXN, this.pos.clone().setY(.2), 14, 4, .8, .5, 1.2, COL.smoke, 0, .3, .5, 2); if (dist < 3) damagePlayer(30, this.pos, this); } }
        else { this.pos.y = 0; this.moveToward(px, pz, dist < 1.6 ? 0 : this.speed, dt); this.melee(2.2, 24, .6, 1.1, dist); }
        this.turnTo(px, pz, dt, 10);
        if (Math.random() < dt * .15) AU.growl(spatial(this.pos).pan, spatial(this.pos).vol);
        break;
      }
      case 'vampire': {
        if (this.vanish > 0) { this.vanish -= dt; if (this.vanish <= 0) { const a = -P.yaw + Math.PI + rand(-.6, .6); this.pos.set(px + Math.sin(a) * 7, 0, pz + Math.cos(a) * 7); this.R.root.visible = true; burst(FXN, this.pos.clone().setY(1.2), 30, 4, 1, .25, .05, COL.ichor, 0, .2, 1, 1); AU.screech(spatial(this.pos).pan, 1); } break; }
        if (this.dashT > 0) {
          this.dashT -= dt; this.vel.set(this.dashV.x, 0, this.dashV.z);
          if (dist < 1.6 && !this.bit) { this.bit = 1; damagePlayer(20, this.pos, this); this.hp = Math.min(this.maxHp, this.hp + 30); AU.screech(0, .6); this.dashT = 0; this.retreatT = .6; burst(FXN, P.eye().addScaledVector(P.fwd(), .5), 12, 2, .6, .08, .05, COL.blood, 6); }
        } else if (this.retreatT > 0) { this.retreatT -= dt; this.moveToward(this.pos.x * 2 - px, this.pos.z * 2 - pz, 7, dt); }
        else {
          const zig = Math.sin(this.t * 4 + this.id) * .9; const dx = (px - this.pos.x) / dist, dz = (pz - this.pos.z) / dist;
          this.vel.x = damp(this.vel.x, (dx - dz * zig) * this.speed, 6, dt); this.vel.z = damp(this.vel.z, (dz + dx * zig) * this.speed, 6, dt);
          if (dist < 10 && dist > 2.5 && this.cd <= 0) { this.dashT = .45; this.cd = 2.6; this.bit = 0; this.dashV = new T.Vector3(dx * 17, 0, dz * 17); AU.screech(spatial(this.pos).pan, spatial(this.pos).vol); this.atk = this.atkDur = .45; }
        }
        this.turnTo(px, pz, dt, 12);
        break;
      }
      case 'shifter': {
        if (this.mode === 'disguise') {
          if (!this.wDir || Math.random() < dt * .3) this.wDir = Math.random() * TAU;
          this.vel.x = damp(this.vel.x, Math.sin(this.wDir) * 1.1, 2, dt); this.vel.z = damp(this.vel.z, Math.cos(this.wDir) * 1.1, 2, dt); this.turnTo(this.pos.x + this.vel.x, this.pos.z + this.vel.z, dt, 3);
          if (dist < 11) this.transform();
        } else if (this.mode === 'morph') {
          this.morphT += dt; const k = clamp(this.morphT / 1.1, 0, 1); this.vel.set(0, 0, 0);
          if (!this.R.glb) {
            this.R.root.scale.setScalar(lerp(1, 1.45, k)); this.scale = lerp(1, 1.45, k);
            this.R.mats.skin.color.lerpColors(lc(this.o.skin), lc(0x3a4436), k); this.R.mats.top.color.lerpColors(lc(this.o.top), lc(0x1a1e18), k);
            this.R.lArm.sh.scale.y = this.R.rArm.sh.scale.y = lerp(1, 1.5, k); this.st.hunch = k * .4; this.R.eyeM.color.set(0xff1020);
          } else { this.st.attack = 0; if (this.R.glb === 'beast') this.scale = 1.2; }
          if (Math.random() < .5) FXN.emit(this.pos.x + rand(-.5, .5), rand(.5, 2.2), this.pos.z + rand(-.5, .5), rand(-1, 1), rand(0, 2), rand(-1, 1), .6, .2, .5, COL.ichor, .8);
          if (k >= 1) { this.mode = 'hunt'; this.st.hold = 'claw'; this.speed = 6.8; }
          this.turnTo(px, pz, dt, 6);
        } else { this.moveToward(px, pz, dist < 2 ? 0 : this.speed, dt); this.turnTo(px, pz, dt, 9); this.melee(2.6, 30, .6, 1.2, dist); }
        break;
      }
      case 'reptile': {
        if (this.mode === 'disguise') { this.moveToward(px, pz, 2.4, dt); this.turnTo(px, pz, dt, 4); if (dist < 20) this.reveal(); }
        else if (this.mode === 'morph') { this.morphT += dt; this.vel.set(0, 0, 0); const k = clamp(this.morphT / .8, 0, 1); if (this.R.tail) this.R.tail.forEach((sg, i) => sg.scale.setScalar(k)); if (k >= 1) { this.mode = 'hunt'; this.speed = 5.2; } this.turnTo(px, pz, dt, 6); }
        else {
          if (dist > 14) this.moveToward(px, pz, this.speed, dt); else if (dist < 6) this.moveToward(this.pos.x * 2 - px, this.pos.z * 2 - pz, this.speed * .8, dt);
          else { const s = Math.sin(this.t * .5 + this.id) > 0 ? 1 : -1; this.vel.x = damp(this.vel.x, -(pz - this.pos.z) / dist * 3 * s, 4, dt); this.vel.z = damp(this.vel.z, (px - this.pos.x) / dist * 3 * s, 4, dt); }
          this.turnTo(px, pz, dt, 9);
          if (dist < 26 && this.cd <= 0) { this.cd = rand(1.8, 2.6); spit(this); this.atk = this.atkDur = .4; }
          this.melee(2.2, 16, .5, 1.2, dist);
        }
        break;
      }
      case 'witch': {
        this.pos.y = .7 + Math.sin(this.t * 2) * .25;
        if (this.vanish > 0) { this.vanish -= dt; if (this.vanish <= 0) { const a = Math.random() * TAU; this.pos.x = px + Math.sin(a) * rand(14, 20); this.pos.z = pz + Math.cos(a) * rand(14, 20); collideCircle(this.pos, 1, 0, 2); this.R.root.visible = true; burst(FXA, this.pos.clone().setY(1.4), 30, 5, .8, .3, .05, COL.purple, 0, .2, 1, 1); AU.cackle(spatial(this.pos).pan, spatial(this.pos).vol); } break; }
        if (dist > 24) this.moveToward(px, pz, this.speed, dt); else if (dist < 12) this.moveToward(this.pos.x * 2 - px, this.pos.z * 2 - pz, this.speed, dt);
        else { this.vel.x = damp(this.vel.x, 0, 2, dt); this.vel.z = damp(this.vel.z, 0, 2, dt); }
        this.turnTo(px, pz, dt, 6);
        if ((dist < 6 || Math.random() < dt * .08) && this.cd > -5) { this.blink(); }
        if (dist < 35 && this.cd <= 0) { this.cd = rand(2, 2.8); this.atk = this.atkDur = .6; this.castT = .3; }
        if (Math.random() < dt * 6) FXA.emit(this.pos.x, this.pos.y + .2, this.pos.z, rand(-.3, .3), -.2, rand(-.3, .3), .8, .18, .02, COL.purple, .8);
        break;
      }
    }
  }
  // dist: to whoever is being swung at (the player for monsters, the target for people)
  melee(range, dmg, dur, cd, dist) {
    if (range > 0 && dist < range && this.cd <= 0 && this.atk <= 0) { this.atk = this.atkDur = dur; this.cd = cd; this.hitPending = { t: dur * .5, dmg, range, tg: this.human && this.tg ? this.tg : PLY }; if (this.human && this.pos.distanceToSquared(P.pos) < 25 * 25) AU.swish(); }
    if (this.hitPending) {
      const h = this.hitPending; h.t -= this._dt || 1 / 60; if (h.t > 0) return; this.hitPending = null;
      if (h.tg === PLY) { if (Math.sqrt(this.dist2()) < h.range + .4 && !P.inCar) damagePlayer(h.dmg * this.dmgMul, this.pos, this); }
      else if (tgOk(this, h.tg) && h.tg.pos.distanceTo(this.pos) < h.range + .5) tgHurt(h.tg, h.dmg * this.dmgMul, this, 'body', null);
    }
  }
  blink() { this.vanish = .9; this.R.root.visible = false; burst(FXA, this.pos.clone().setY(this.pos.y + 1.2), 30, 5, .8, .3, .05, COL.purple, 0, .2, 1, 1); this.cd = Math.max(this.cd, .8); }
  swapRig(id) {
    const nr = CHARS_READY && makeGLBRig(id); if (!nr) return false;
    scene.remove(this.R.root); rigDispose(this.R); this.R = nr; nr.root.scale.setScalar(this.scale); scene.add(nr.root); this.sync(); this.eyesOn(); this.hH = charHeadY(id);
    if (!this.unseen) { burst(FXN, this.pos.clone().setY(1.2), 46, 4, 1.1, .35, 1.2, COL.smoke, -.3, .4, .8, 1.5); burst(FXN, this.pos.clone().setY(1.2), 24, 5, .7, .12, .05, COL.blood, 9); }
    return true;
  }
  // a disguise that drops on you or in front of you gets the banner and the full cue; one a stray round unmasks down the block just happens
  nearYou() { if (this.dist2() < 25 * 25) return true; const C = camFrame(), cx = this.pos.x - camera.position.x, cz = this.pos.z - camera.position.z, d2 = cx * cx + cz * cz; return d2 < 45 * 45 && cx * C.x + cz * C.z > Math.sqrt(d2) * C.cos; }
  transform() {
    if (this.mode !== 'disguise') return; this.mode = 'morph'; this.morphT = 0; this.hp = this.maxHp = 320; if (this.R.glb) this.swapRig('beast');
    const near = this.nearYou(), s = spatial(this.pos); AU.roar(s.pan, near ? 1 : s.vol); if (near) { shake(.15); flashBanner('SHAPESHIFTER', 'It was never a person', 1.6); }
  }
  reveal() {
    if (this.mode !== 'disguise') return; this.mode = 'morph'; this.morphT = 0; this.hp = this.maxHp = Math.max(this.hp, 190);
    const near = this.nearYou(), s = spatial(this.pos); AU.hiss(s.pan, near ? 1 : s.vol);
    if (this.R.glb) { this.swapRig('reptile'); this.st.hold = 'claw'; if (near) flashBanner('REPTILIAN', 'The suit was a skin', 1.6); return; }
    const scale = new T.MeshStandardMaterial({ map: camoTex('scales').map, roughness: .5, metalness: .2 });
    this.R.skull.material = scale; this.R.mats.skin.color.copy(lc(0x2a6a2a)); this.R.eyes.forEach(e => { e.material = NEON(0xf3e600); e.scale.set(.4, 2.4, 1); });
    this.R.head.children.forEach(c => { if (c.material && c.material.metalness === 1) c.visible = false; });
    // grow a tail
    this.R.tail = []; let par = this.R.hips; const tm = this.o.tailMat;
    for (let i = 0; i < 6; i++) { const seg = new T.Group(); seg.position.set(0, i === 0 ? -.05 : 0, i === 0 ? .1 : .16); par.add(seg); const m = new T.Mesh(gLimb(.05 - i * .007, .045 - i * .007, .17), tm); m.rotation.x = Math.PI / 2; seg.add(m); seg.scale.setScalar(.01); this.R.tail.push(seg); par = seg; }
    this.st.hold = 'claw'; if (near) flashBanner('REPTILIAN', 'The suit was a skin', 1.6);
  }
  possess() {
    if (this.waitT >= 0 || this.dead) return;
    this.possessed = true; this.hp = this.maxHp = this.maxHp * 2.3; this.dmgMul = 1.8; this.scale = 1.12; this.R.root.scale.setScalar(1.12);
    // the tell is in the eyes and the ember aura, not a lit-up body: emissive on the eyes only
    if (this.R.glb) this.eyesOn(); else { this.R.eyeM.color.set(0xff3a00); this.R.mats.top.emissive = lc(0x5a0a00); this.R.mats.top.emissiveIntensity = .6; this.R.mats.skin.color.copy(lc(0x6a2020)); }
    this.glow = glowSprite(0, 1.5, 0, lc(0xff2a00), 2, this.R.root); this.glow.material.opacity = .38;
    burst(FXA, this.pos.clone().setY(1.4), 40, 5, .9, .25, .02, COL.ember, 0, .3, 1, 1); AU.growl(spatial(this.pos).pan, 1);
  }
  partAt(o, d) {
    // returns {t, part} for a ray, or null
    if (this.dead || (this.R && !this.R.root.visible)) return null;
    const sc = this.scale, hy = this.pos.y, hk = this.hH / 1.68 * this.R.root.scale.y; const hp = this.headPos(_eHP); // every ray tests every enemy: no allocation
    const th = raySphere(o, d, hp, .17 * hk);
    const tb = rayVCapsule(o, d, this.pos.x, this.pos.z, hy + .35 * hk, hy + 1.38 * hk, (this.type === 'witch' ? .45 : .3) * sc);
    if (th > 0 && (tb < 0 || th <= tb + .2)) return { t: th, part: 'head' };
    if (tb > 0) { const y = o.y + d.y * tb - hy; return { t: tb, part: y < .8 * hk ? 'limb' : 'body' }; }
    return null;
  }
  // src: the player's {w...} (or 'car'), a fighter's npcSrc {by}, a damage-over-time {dot, by}, true (unowned), or nothing.
  // Whoever it was holds the grudge; only the player's kills score
  hurt(amount, part, dir, src) {
    if (this.dead || this.waitT >= 0) return false; // not materialised yet
    const dot = src === true || !!(src && src.dot), by = !src || src === true ? null : src === 'car' ? PLY : typeof src !== 'object' ? null : src.by !== undefined ? src.by : 'w' in src ? PLY : null;
    if (this.mode === 'disguise' && !dot) { if (this.type === 'shifter') this.transform(); else this.reveal(); }
    if (this.armor && part !== 'head' && !dot) amount *= 1 - this.armor; // plates: only a headshot gets the full round
    this.hp -= amount; if (!dot) this.st.flinch = Math.min(1, this.st.flinch + .5);
    if (by === PLY) { if (!dot && src !== 'car' && !this.aware) alertEnemy(this, P.pos, 2.5); if (this.human && !grudge(this, PLY)) squadGrudge(this, PLY, 40); if (this.fac === 'looter') looterScare(this, P.pos); }
    else if (by && by !== this && by.pos && !(by.sq && by.sq === this.sq) && by.fac !== this.fac) { // crossfire from your own side is forgiven
      if (this.human && !grudge(this, by)) squadGrudge(this, by, 30);
      if (this.fac === 'looter') looterScare(this, by.pos);
      else if (this.human && !(this.tg && this.seesT) && !by.dead) { this.tg = by; this.aware = true; this.awareT = G.t; (this.lastKnown || (this.lastKnown = new T.Vector3())).copy(by.pos); }
    }
    if (src && src !== true && (src.w || src.by)) this.supp = Math.min(1, (this.supp || 0) + .35);
    if (this.type === 'vampire' && this.hp < this.maxHp * .35 && !this.usedVanish && !dot) { this.usedVanish = 1; this.vanish = 1; this.R.root.visible = false; burst(FXN, this.pos.clone().setY(1.2), 40, 5, 1, .25, .05, COL.ichor, 0, .3, 1, 1); }
    if (this.hp <= 0) { this.die(part, dir, src, by); return true; }
    return false;
  }
  die(part, dir, src, by) {
    this.dead = true; this.deadT = 0; this.vel.set(0, 0, 0); this.R.root.visible = true; this.pos.y = 0;
    if (dir) { const fwd = new T.Vector3(-Math.sin(this.face), 0, -Math.cos(this.face)); this.st.fallDir = fwd.dot(dir) > 0 ? -1 : 1; }
    const c = this.pos.clone().setY(1.2), fx = !this.unseen; // a death nobody can see doesn't spend particles
    // the demon in a body goes looking for another: yours only if you were the one who freed it. Somebody else's kill is heard from where it happened
    const wisp = by === PLY ? 'player' : 'npc', sp = spatial(this.pos), vol = by === PLY ? 1 : sp.vol;
    if (this.type === 'demon') { fx && burst(FXA, c, 50, 6, 1.2, .3, .02, COL.ember, -1, .3, 1, 1); this.R.root.visible = false; this.deadT = 8.4; spawnWisp(this.pos.x, this.pos.z, wisp); AU.roar(sp.pan, vol); }
    else if (this.type === 'vampire') { fx && burst(FXN, c, 50, 3, 1.6, .35, .7, COL.ash, -.5, .4, .9, 1); this.R.root.visible = false; this.deadT = 8.4; AU.screech(sp.pan, vol); }
    else if (this.type === 'witch') { fx && burst(FXA, c, 60, 7, 1.2, .35, .02, COL.purple, 0, .2, 1, 1); this.R.root.visible = false; this.deadT = 8.4; AU.cackle(sp.pan, vol); }
    else if (this.type === 'reptile') { fx && burst(FXN, c, 26, 4, .9, .12, .05, COL.green, 9); }
    else if (this.type === 'shifter') { fx && burst(FXN, c, 30, 4, .9, .14, .05, COL.ichor, 9); }
    else if (fx) burst(FXN, c, 22, 3.5, .8, .12, .05, COL.blood, 9);
    if (this.R.glb) this.st.deathClip = 'fall';
    if (part === 'head' && (src && src.big)) { if (this.R.glb) this.R.head.scale.setScalar(.001); else this.R.head.visible = false; fx && burst(FXN, this.headPos(), 26, 5, .8, .12, .05, this.type === 'reptile' ? COL.green : COL.blood, 9); }
    if (this.possessed) spawnWisp(this.pos.x, this.pos.z, wisp);
    decal(new T.Vector3(this.pos.x, .02, this.pos.z), new T.Vector3(0, 1, 0), rand(1.4, 2.4), splatTex, this.type === 'reptile' ? 0x1a8a2a : this.type === 'demon' || this.type === 'vampire' || this.type === 'witch' ? 0x1a1a1a : 0x5a0010);
    this.tg = null; this.burst = 0; this.hitPending = null;
    if (by === PLY) { this.killedByP = true; onKill(this, part, src); } else npcKilled(this, by); // only your kills score, pay out and drop ammo
  }
  remove() { this.gone = true; scene.remove(this.R.root); rigDispose(this.R); const i = ENEMIES.indexOf(this); if (i >= 0) ENEMIES.splice(i, 1); }
}
/* ---------- wisps: demons between bodies. target 'player': you freed it, and it wants you; 'npc': somebody else did, and it
   rides the nearest purger or thins out where it rose ---------- */
function spawnWisp(x, z, target) {
  const g = new T.Group(); g.position.set(x, 1.4, z); scene.add(g);
  const core = new T.Mesh(gSph(.18), NEON(0xff3a10)); g.add(core);
  const halo = glowSprite(0, 0, 0, lc(0xff2a00), 2.6, g);
  const eyes = [new T.Mesh(gBox(.07, .02, .02), NEON(0xffffff)), new T.Mesh(gBox(.07, .02, .02), NEON(0xffffff))]; eyes[0].position.set(-.06, .03, -.16); eyes[1].position.set(.06, .03, -.16); eyes.forEach(e => g.add(e));
  WISPS.push({ g, pos: g.position, hp: 45, t: 0, target, life: 30 });
}
function updateWisps(dt) {
  for (let i = WISPS.length - 1; i >= 0; i--) {
    const w = WISPS[i]; w.t += dt; w.life -= dt;
    // prefer a living purger to ride; else the player, if it's the player's
    let tgt = null, best = 30 * 30;
    if (w.t > 1.2) for (const e of ENEMIES) { if (e.dead || e.type !== 'purger' || e.possessed || e.waitT >= 0) continue; const d = e.pos.distanceToSquared(w.pos); if (d < best) { best = d; tgt = e; } }
    const mine = w.target === 'player'; if (!tgt && !mine && w.t > 1.2 && w.life > 3) w.life = 3;
    const tp = tgt ? _wT.copy(tgt.pos).setY(1.4) : mine ? _wT.set(P.pos.x, P.pos.y + P.eyeH, P.pos.z) : _wT.set(w.pos.x, 2.4, w.pos.z);
    const dir = _wD.copy(tp).sub(w.pos); const L = dir.length();
    const spd = w.t < 1.2 || !(tgt || mine) ? 1 : 7.5;
    w.pos.addScaledVector(dir.normalize(), Math.min(spd * dt, L)); w.pos.y += Math.sin(w.t * 6) * .01;
    if (L > .01) w.g.lookAt(tp);
    if (w.pos.distanceToSquared(camera.position) < 80 * 80) {
      if (Math.random() < .6) FXA.emit(w.pos.x, w.pos.y, w.pos.z, rand(-.3, .3), rand(-.3, .3), rand(-.3, .3), .5, .3, .05, COL.ember, .8);
      if (Math.random() < .3) FXN.emit(w.pos.x, w.pos.y, w.pos.z, 0, .4, 0, .9, .3, .8, COL.smoke, .5);
    }
    if (L < .8 && w.t > 1.2 && (tgt || mine)) {
      if (tgt) tgt.possess(); else if (!P.dead && !P.inCar) startPossession(); else if (P.inCar) { w.life = 0; }
      if (tgt || !P.dead) { scene.remove(w.g); WISPS.splice(i, 1); continue; }
    }
    if (w.hp <= 0 || w.life <= 0) { if (w.pos.distanceToSquared(camera.position) < 80 * 80) burst(FXA, w.pos, 30, 5, .7, .25, .02, COL.ember, 0, 0, 1, 1); scene.remove(w.g); WISPS.splice(i, 1); }
  }
}
/* ---------- enemy attacks ---------- */
function enemyShoot(e, dmg, dist) {
  const from = e.pos.clone().setY(1.35 * e.scale).addScaledVector(new T.Vector3(-Math.sin(e.face), 0, -Math.cos(e.face)), .5);
  const moving = Math.hypot(P.vel.x, P.vel.z);
  const chance = clamp(.7 - dist / 55 - (moving > 5 ? .22 : moving > 2 ? .1 : 0) - (P.slide > 0 ? .2 : 0), .08, .75) * (P.inCar ? .4 : 1);
  const hit = Math.random() < chance;
  const to = P.eye().add(new T.Vector3(rand(-1, 1), rand(-.6, .4), rand(-1, 1)).multiplyScalar(hit ? .15 : 1.4));
  tracer(from, to, 0xff6060, 1.3); FXA.emit(from.x, from.y, from.z, 0, 0, 0, .06, .5, .7, COL.spark, 1);
  const s = spatial(e.pos); AU.nz(.14, 'lowpass', 3000, 400, .9, .45 * s.vol + .05, s.pan);
  if (hit) damagePlayer(dmg, e.pos, e); else if (dist < 15 && Math.random() < .5) AU.ping(s.pan);
}
// projectile meshes are pooled per type (each used to bring a fresh sprite material: a witch fight churned dozens)
const PPOOL = {};
function makeProj(type, pos, vel, owner, dmg, opts) {
  let obj = PPOOL[type] && PPOOL[type].pop();
  if (!obj && type === 'star') { obj = new T.Mesh(P.starGeo || gBox(.1, .01, .1), STD(0xf0f2f8, .05, 1)); obj.scale.setScalar(1.6); }
  else if (!obj) { const col = type === 'hex' ? 0xb04dff : type === 'acid' ? 0x3dff6a : type === 'plasma' ? 0x5dff7a : 0xffffff; obj = new T.Group(); obj.add(new T.Mesh(gSph(type === 'plasma' ? .09 : .14), NEON(col))); glowSprite(0, 0, 0, lc(col), type === 'plasma' ? 1.2 : 1.6, obj); }
  obj.position.copy(pos); obj.rotation.set(0, 0, 0); scene.add(obj);
  const p = Object.assign({ type, pos: obj.position, vel, owner, dmg, obj, life: 4, g: type === 'acid' ? 9 : 0 }, opts || {}); PROJ.push(p); return p;
}
function freeProj(p) { scene.remove(p.obj); (PPOOL[p.type] || (PPOOL[p.type] = [])).push(p.obj); }
function spit(e) {
  const from = e.headPos().addScaledVector(new T.Vector3(-Math.sin(e.face), 0, -Math.cos(e.face)), .3);
  const tgt = P.eye().addScaledVector(P.vel, .5); const d = tgt.clone().sub(from); const L = d.length(); const t = L / 18;
  const v = new T.Vector3(d.x / t, d.y / t + 9 * t / 2, d.z / t);
  makeProj('acid', from, v, 'enemy', 15, { slow: 0 }); const s = spatial(e.pos); AU.hiss(s.pan, s.vol * .7);
}
function hexOrb(e) {
  const from = e.pos.clone().setY(e.pos.y + 1.9); const v = P.eye().sub(from).normalize().multiplyScalar(11);
  makeProj('hex', from, v, 'enemy', 15, { homing: 2.2 }); const s = spatial(e.pos); AU.zap(s.pan);
}
function updateProj(dt) {
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const p = PROJ[i]; p.life -= dt; let dead = p.life <= 0;
    if (p.homing && !P.dead) { const want = _pC.set(P.pos.x, P.pos.y + P.eyeH, P.pos.z).sub(p.pos).normalize().multiplyScalar(p.vel.length()); p.vel.lerp(want, Math.min(1, p.homing * dt)); }
    p.vel.y -= p.g * dt;
    const step = _pStep.copy(p.vel).multiplyScalar(dt); const L = step.length(); const dir = _pDir.copy(step).divideScalar(L || 1);
    const wh = rayBoxes(p.pos, dir, L);
    if (p.owner === 'player') {
      let best = null, bt = L;
      for (const e of ENEMIES) { const h = e.partAt(p.pos, dir); if (h && h.t < bt) { bt = h.t; best = { e, part: h.part }; } }
      for (const w of WISPS) { const t = raySphere(p.pos, dir, w.pos, .5); if (t > 0 && t < bt) { bt = t; best = { w }; } }
      if (best && (!wh || bt < wh.t)) {
        const hp = _pHit.copy(p.pos).addScaledVector(dir, bt);
        if (best.w) { best.w.hp -= p.dmg; hitMarker(best.w.hp <= 0); }
        else { const mult = best.part === 'head' ? p.head : best.part === 'limb' ? .85 : 1; const k = best.e.hurt(p.dmg * mult, best.part, dir, { w: p.w, big: p.type === 'plasma' }); hitMarker(k, best.part === 'head'); burst(FXN, hp, 6, 2, .4, .08, .05, COL.blood, 6); }
        if (p.type === 'plasma') splash(hp, p); dead = true;
        if (p.type === 'star') AU.thud();
      } else if (wh) {
        const hp = _pHit.copy(p.pos).addScaledVector(dir, wh.t);
        if (p.type === 'plasma') splash(hp, p); else { burst(FXA, hp, 8, 3, .3, .08, .02, COL.spark, 8); AU.ping(spatial(hp).pan); }
        dead = true;
      }
    } else {
      const c = _pC.set(P.pos.x, P.pos.y + 1.0, P.pos.z); const tt = raySphere(p.pos, dir, c, .65);
      if (tt > 0 && tt <= L && !P.dead) {
        damagePlayer(p.dmg, p.pos, null);
        if (p.type === 'hex') { P.hexT = 3; flashBanner('HEXED', 'Movement slowed', .9); }
        if (p.type === 'acid') { P.acidT = 1.2; }
        burst(FXA, p.pos, 14, 3, .5, .15, .02, p.type === 'hex' ? COL.purple : COL.green, 0); dead = true;
      } else if (wh) { burst(FXA, _pHit.copy(p.pos).addScaledVector(dir, wh.t), 12, 3, .5, .2, .02, p.type === 'hex' ? COL.purple : COL.green, 3); dead = true; }
    }
    p.pos.add(step);
    if (p.type === 'star') { p.obj.rotation.x = -Math.PI / 2; p.obj.rotation.z += dt * 30; }
    if (p.type === 'hex' && Math.random() < .6) FXA.emit(p.pos.x, p.pos.y, p.pos.z, rand(-.2, .2), rand(-.2, .2), rand(-.2, .2), .4, .2, .02, COL.purple, .9);
    if (p.type === 'acid' && Math.random() < .5) FXN.emit(p.pos.x, p.pos.y, p.pos.z, 0, -.5, 0, .4, .1, .05, COL.green, .8, 4);
    if (p.type === 'plasma' && Math.random() < .8) FXA.emit(p.pos.x, p.pos.y, p.pos.z, rand(-.3, .3), rand(-.3, .3), rand(-.3, .3), .3, .25, .02, COL.plasma, .9);
    if (dead) { freeProj(p); PROJ.splice(i, 1); }
  }
}
function splash(at, p) {
  burst(FXA, at, 40, 7, .6, .3, .02, COL.plasma, 0, .3, 1, 1); AU.boom(spatial(at).pan);
  flashLight.position.copy(at); flashLight.color.set(0x5dff7a); flashLight.intensity = 6; G.flashT = .12;
  for (const e of ENEMIES) { if (e.dead) continue; const d = Math.hypot(e.pos.x - at.x, 1 - at.y, e.pos.z - at.z); if (d < p.splash) { const k = e.hurt(45 * (1 - d / p.splash) + 10, 'body', null, { w: p.w }); if (k) hitMarker(true); } }
  const pd = P.eye().distanceTo(at); if (pd < 2.5) damagePlayer(12, at, null);
}

/* ---------- the director: the purge is everyone against everyone. Factions spawn as groups: often two hostile ones a block
   ahead of you, already at it; Block Watch on the porches, looters at the shopfronts, sweep teams after midnight. It gets
   worse every hour, and the supernatural turns up only as far as the setting allows ---------- */
const SPAWN = { t: 2, first: true, chk: 0, sq: 5000, posts: [], pairs: [], ev: {} };
const _spP = new T.Vector3(), _spA = new T.Vector3(), _spB = new T.Vector3();
let _npcFeedT = -99;
// somebody else's kill: no score, no ammo, at most a line in the feed when it was close
function npcKilled(e, by) {
  if (!by || by === PLY || !by.type || G.t - _npcFeedT < 5 || e.pos.distanceToSquared(P.pos) > 60 * 60) return;
  _npcFeedT = G.t; feed(`<b>${npcName(by)}</b> dropped ${npcOne(e)}`);
}
// v21's mix by district and hour: purgers 5, the rest supernatural (the 'classic' setting keeps exactly this share)
function spawnTable(d, hour) {
  // [type, weight]
  const base = { purger: 5, demon: hour > 1 ? 1.5 : .4, vampire: hour > 2 ? 1.5 : .3, shifter: 1, reptile: hour > 1 ? 1.2 : .5, witch: hour > 3 ? 1 : .2 };
  if (d === 0) base.demon *= 3;
  if (d === 1) base.reptile *= 3.2;
  if (d === 2) { base.shifter *= 2.6; base.purger *= 1.3; }
  if (d === 3) { base.witch *= 4.5; base.vampire *= 2.4; base.demon *= .6; }
  return base;
}
// the share of spawns that are something else: none, a few after 10 PM, or v21's
function superChance(hour, d) {
  if (G.supernatural === 'off') return 0;
  if (G.supernatural !== 'classic') return hour >= 3 ? .07 : 0;
  const t = spawnTable(d, hour); let m = 0; for (const k in t) if (k !== 'purger') m += t[k]; return m / (m + t.purger);
}
// a type whose models haven't streamed in yet is skipped this time (and fetched now)
function pickMonster(d, hour) {
  const t = spawnTable(d, hour); let sum = 0; t.purger = 0; for (const k in t) { if (t[k] && enemyPending(k)) { wantEnemy(k); t[k] = 0; } sum += t[k]; }
  let r = Math.random() * sum; for (const k in t) { r -= t[k]; if (r <= 0 && t[k] > 0) return k; } return null;
}
const fightCap = () => G.quality === 'high' ? 24 : 14;
function fightersAlive() { let n = 0; for (const e of ENEMIES) if (!e.dead && !e.clubber) n++; return n; }
// what happens next: early on it's crews, looters and porches; by midnight the sweep teams are out
function pickEvent(hour, heat, room) {
  if (Math.random() < superChance(hour, districtAt(P.pos.x, P.pos.z))) return 'monster';
  const W = SPAWN.ev; W.clash = room >= 4 ? 3 + hour * .35 : 0; W.purgers = 2.2 + heat * .5; W.post = room >= 2 && SPAWN.posts.length < (G.quality === 'high' ? 3 : 2) ? (hour < 7 ? 1.6 : .6) : 0;
  W.loot = room >= 2 ? (hour < 9 ? 1.6 : .7) : 0; W.crew = room >= 3 ? 1.4 : 0; W.sweep = room >= 3 && hour >= 5 ? 1.2 + (hour - 5) * .25 : 0;
  let sum = 0; for (const k in W) sum += W[k]; let r = Math.random() * sum; for (const k in W) { r -= W[k]; if (r <= 0 && W[k] > 0) return k; } return 'purgers';
}
function updateSpawns(dt) {
  if (SPAWN.pairs.length) clashPairs();
  if (P.dead || G.state !== 'city' || G.inside) return;
  if ((SPAWN.chk -= dt) <= 0) { SPAWN.chk = 1; spawnRecycle(); if (G.supernatural === 'rare' && G.hour >= 2 && typeof charStreamMore === 'function') charStreamMore(); } // rare: an hour ahead of when they can turn up
  // more people out, and more often, every hour; a hot night (the AI's HEAT, 0..5) brings them faster still
  const hour = G.hour, heat = typeof HEAT !== 'undefined' ? clamp(HEAT.level || 0, 0, 5) : 0, hi = G.quality === 'high';
  const cap = Math.min(fightCap(), Math.round((hi ? 12 : 8) + hour * (hi ? 1.3 : .75) + heat * (hi ? .8 : .45)));
  SPAWN.t -= dt; if (SPAWN.t > 0) return;
  SPAWN.t = Math.max(2.4, 6.5 - hour * .32) * rand(.7, 1.2) / (1 + heat * .12);
  const room = cap - fightersAlive(); if (room <= 0) return;
  if (SPAWN.first) { SPAWN.first = false; if (spawnEvent('clash', room)) return; } // the night opens on somebody else's fight
  spawnEvent(pickEvent(hour, heat, room), room);
}
const F2T = f => f === 'eastline' || f === 'rails' ? 'crew' : f;
function spawnEvent(kind, room) {
  const hour = G.hour;
  if (kind === 'monster') {
    const pt = spawnPoint(); if (!pt) return false; const d = districtAt(pt.x, pt.z), type = pickMonster(d, hour); if (!type) return spawnEvent('purgers', room);
    if (type === 'witch' && d === 3 && Math.random() < .6) { const wc = pick(WITCH_CIRCLES); if (wc && wc.distanceTo(P.pos) > 18 && wc.distanceTo(P.pos) < 70) pt.copy(wc); }
    ENEMIES.push(new Enemy(type, pt.x, pt.z, { aware: Math.random() < .3 + hour * .04 })); return true;
  }
  if (kind === 'purgers') { // v21's street purgers: one to three, some already hunting you
    const pt = spawnPoint(); if (!pt) return false; const n = Math.min(room, Math.random() < .25 + hour * .03 ? rint(2, 3) : 1);
    spawnSquad('purger', 'purger', pt.x, pt.z, n, { aware: Math.random() < .3 + hour * .04 }, n < 2); return true;
  }
  if (kind === 'clash') {
    const late = hour >= 5, r = Math.random() * (late ? 10 : 7.4);
    if (r < 1.4) return spawnPost(room, pick(['looter', 'looter', 'purger']));
    const pr = r < 4.4 ? ['eastline', 'rails'] : r < 5.9 ? [pick(['eastline', 'rails']), 'purger'] : r < 7.4 ? [pick(['eastline', 'rails']), 'looter'] : r < 8.8 ? ['sweeper', pick(['eastline', 'rails'])] : ['sweeper', 'purger'];
    const at = clashSpot(); if (!at) return false;
    const na = Math.max(2, Math.min(rint(2, 4), room - 2)), nb = Math.max(2, Math.min(rint(2, 4), room - na));
    spawnClash(pr[0], pr[1], at[0], at[1], at[2], at[3], na, nb); return true;
  }
  if (kind === 'post') return spawnPost(room, null);
  if (kind === 'loot') return spawnLooters(room);
  if (kind === 'crew') { // a crew walking its streets, or one rolling up in a car
    if (Math.random() < .35 && typeof gangCall === 'function' && gangCall('crew')) return true;
    const pt = spawnPoint(42, 70); if (!pt) return false; spawnSquad('crew', pick(['eastline', 'rails']), pt.x, pt.z, Math.min(room, rint(3, 5)), {}); return true;
  }
  if (kind === 'sweep') { // a sweep team hunting anything armed, you included: some by van, some on foot
    if (Math.random() < .4 && typeof gangCall === 'function' && gangCall('sweeper')) return true;
    const pt = spawnPoint(55, 85); if (!pt) return false; spawnSquad('sweeper', 'sweeper', pt.x, pt.z, Math.min(room, rint(3, 4)), { aware: true }); return true;
  }
  return false;
}
// n of one faction around (x, z), one squad (loose: no squad, the v21 street purger). They materialise over the next few frames
function spawnSquad(type, fac, x, z, n, o, loose) {
  const sq = loose ? 0 : ++SPAWN.sq, out = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + rand(-.4, .4), r = i ? rand(1.4, 3.2) : 0, p = _spP.set(x + Math.cos(a) * r, 0, z + Math.sin(a) * r); collideCircle(p, .5, 0, 1.8);
    const e = new Enemy(type, p.x, p.z, Object.assign({ fac, sq, defer: true }, o)); ENEMIES.push(e); out.push(e);
  }
  return out;
}
// two hostile groups, each on the other: mutual targets and a squad grudge, so the rules can't talk them out of it.
// Set once both sides have materialised (a target that is still building would be dropped)
function spawnClash(fa, fb, ax, az, bx, bz, na, nb) {
  const A = spawnSquad(F2T(fa), fa, ax, az, na, {}), B = spawnSquad(F2T(fb), fb, bx, bz, nb, {});
  SPAWN.pairs.push([A, B]); return [A, B];
}
function clashPairs() {
  const building = X => X.some(e => e.waitT >= 0 && !e.gone);
  for (let i = SPAWN.pairs.length - 1; i >= 0; i--) { const [A, B] = SPAWN.pairs[i]; if (building(A) || building(B)) continue; SPAWN.pairs.splice(i, 1); clashOn(A, B); clashOn(B, A); }
}
function clashOn(X, Y) {
  for (const e of X) {
    if (e.dead || e.gone) continue;
    let best = null, bd = 1e9; for (const o of Y) { if (o.dead || o.gone) continue; const d = o.pos.distanceToSquared(e.pos); if (d < bd) { bd = d; best = o; } } if (!best) continue;
    e.aware = true; e.awareT = G.t; e.tg = best; (e.lastKnown || (e.lastKnown = new T.Vector3())).copy(best.pos); e.lastSeen = G.t - 1.5; e.reactT = rand(.1, .5);
    addGrudge(e, -best.sq, 90); e.face = Math.atan2(-(best.pos.x - e.pos.x), -(best.pos.z - e.pos.z));
  }
}
const spotFree = (x, z) => { _spP.set(x, 0, z); collideCircle(_spP, .6, 0, 1.8); return Math.abs(_spP.x - x) + Math.abs(_spP.z - z) < .05; };
// would a group appear in plain sight? (in view, under 70 m, nothing in the way)
function popsIn(x, z) { const d = Math.hypot(x - camera.position.x, z - camera.position.z); return d < 70 && trafficInView(x, z) && aiLos(_spA.copy(camera.position), _spB.set(x, 1.5, z)); }
// two spots 25-40 m apart on one street, 50-90 m ahead of or beside the player, so the fight is down the block you're walking
function clashSpot() {
  for (let tries = 0; tries < 24; tries++) {
    const a = -P.yaw + rand(-1.7, 1.7), d = rand(50, 90); let x = P.pos.x + Math.sin(a) * d, z = P.pos.z - Math.cos(a) * d;
    const sx = roadNear(x), sz = roadNear(z), alongZ = Math.abs(sx - x) < Math.abs(sz - z);
    if (alongZ) x = sx + rand(-3, 3); else z = sz + rand(-3, 3);
    const h = rand(12.5, 20), ax = alongZ ? x : x - h, az = alongZ ? z - h : z, bx = alongZ ? x : x + h, bz = alongZ ? z + h : z;
    if (Math.max(Math.abs(ax), Math.abs(az), Math.abs(bx), Math.abs(bz)) > HALF - 8) continue;
    if (Math.hypot(ax - P.pos.x, az - P.pos.z) < 42 || Math.hypot(bx - P.pos.x, bz - P.pos.z) < 42) continue;
    if (!spotFree(ax, az) || !spotFree(bx, bz) || popsIn(ax, az) || popsIn(bx, bz)) continue;
    return [ax, az, bx, bz];
  }
  return null;
}
// a building frontage (a shopfront bay on a real facade) dMin-dMax from the player, ahead first: [x, z, nx, nz] on the sidewalk
const _frC = [];
function frontage(dMin, dMax, glass) {
  for (let tries = 0; tries < 10; tries++) {
    const a = -P.yaw + rand(-1.8, 1.8) + (tries > 6 ? Math.PI : 0), d = rand(dMin, dMax), cx = P.pos.x + Math.sin(a) * d, cz = P.pos.z - Math.cos(a) * d;
    const n = boxesNearN(cx, cz); _frC.length = 0;
    for (let q = 0; q < n; q++) {
      const b = _bn[q]; if (!b.bays || b.y0 > .1 || b.y1 < 4) continue;
      for (const bay of b.bays) { if (glass && bay[6] !== 'glass') continue; const nx = bay[3], nz = -bay[2], x = bay[0] + nx * 1.7, z = bay[1] + nz * 1.7, dp = Math.hypot(x - P.pos.x, z - P.pos.z); if (dp > dMin && dp < dMax && Math.abs(x) < HALF - 6 && Math.abs(z) < HALF - 6) _frC.push([x, z, nx, nz, Math.hypot(x - cx, z - cz) + Math.random() * 4]); }
    }
    _frC.sort((p, q) => p[4] - q[4]);
    for (let i = 0; i < _frC.length && i < 6; i++) { const f = _frC[i]; if (spotFree(f[0], f[1]) && !popsIn(f[0], f[1])) return f; }
  }
  return null;
}
// Block Watch: two or three on a porch or a storefront; sometimes somebody's already trying the block
function spawnPost(room, foe) {
  const f = frontage(45, 85, false); if (!f) return false;
  const [x, z, nx, nz] = f, n = Math.min(room - (foe ? 2 : 0), rint(2, 3)); if (n < 1) return false;
  const post = new T.Vector3(x + nx * 1.2, 0, z + nz * 1.2), W = { warnT: -99, feedT: -99, sq: ++SPAWN.sq, post }, out = [];
  SPAWN.posts.push(W);
  for (let i = 0; i < n; i++) {
    const s = (i - (n - 1) / 2) * 2.4, hp = new T.Vector3(x - nz * s, 0, z + nx * s); collideCircle(hp, .5, 0, 1.8);
    const e = new Enemy('watch', hp.x, hp.z, { sq: W.sq, post, home: hp, homeN: new T.Vector3(nx, 0, nz), postObj: W, defer: true }); e.face = Math.atan2(-nx, -nz); ENEMIES.push(e); out.push(e);
  }
  if (foe && room - n >= 2) {
    const sd = Math.random() < .5 ? 1 : -1, d = rand(17, 24), ax = post.x - nz * sd * d + nx * 3, az = post.z + nx * sd * d + nz * 3;
    if (foe === 'looter') { // they've come for the shop next door: walking into the porch's line is what starts it
      const hx = x - nz * sd * 7, hz = z + nx * sd * 7, k = Math.min(room - n, rint(2, 3)), sq = ++SPAWN.sq;
      for (let i = 0; i < k; i++) { const p = _spP.set(ax + rand(-2, 2), 0, az + rand(-2, 2)); collideCircle(p, .5, 0, 1.8); ENEMIES.push(new Enemy('looter', p.x, p.z, { sq, home: new T.Vector3(hx - nz * i * 1.6, 0, hz + nx * i * 1.6), homeN: new T.Vector3(nx, 0, nz), defer: true })); }
    } else SPAWN.pairs.push([spawnSquad(F2T(foe), foe, ax, az, Math.min(room - n, rint(2, 3)), {}), out]);
  }
  return true;
}
function spawnLooters(room) {
  const f = frontage(42, 80, true); if (!f) return false;
  const [x, z, nx, nz] = f, n = Math.min(room, rint(2, 4)), sq = ++SPAWN.sq;
  for (let i = 0; i < n; i++) { const s = (i - (n - 1) / 2) * 1.8, hp = new T.Vector3(x - nz * s, 0, z + nx * s); collideCircle(hp, .5, 0, 1.8); ENEMIES.push(new Enemy('looter', hp.x, hp.z, { sq, home: hp, homeN: new T.Vector3(nx, 0, nz), defer: true })); }
  return true;
}
// the city keeps the people near you: whoever is well out of range (and not on your trail) goes home
function spawnRecycle() {
  for (let i = ENEMIES.length - 1; i >= 0; i--) {
    const e = ENEMIES[i]; if (!e || e.dead || e.clubber || e.waitT >= 0) continue; const d2 = e.pos.distanceToSquared(P.pos);
    if (d2 > 150 * 150 || (d2 > 115 * 115 && e.unseen && e.tg !== PLY)) e.remove();
  }
  for (let i = SPAWN.posts.length - 1; i >= 0; i--) { const W = SPAWN.posts[i]; let live = false; for (const e of ENEMIES) if (e.postObj === W && !e.dead) { live = true; break; } if (!live) SPAWN.posts.splice(i, 1); }
}
// a street point dMin-dMax away (default 32-58 m, more often behind you than ahead)
function spawnPoint(dMin, dMax) {
  for (let tries = 0; tries < 14; tries++) {
    const behind = Math.random() < .55; const a = (behind ? -P.yaw + Math.PI : -P.yaw) + rand(-1.4, 1.4);
    const d = rand(dMin || 32, dMax || 58); let x = P.pos.x + Math.sin(a) * d, z = P.pos.z - Math.cos(a) * d;
    if (Math.random() < .5) x = Math.round((x + HALF) / CW) * CW - HALF + rand(-3, 3); else z = Math.round((z + HALF) / CW) * CW - HALF + rand(-3, 3);
    x = clamp(x, -HALF + 4, HALF - 4); z = clamp(z, -HALF + 4, HALF - 4);
    const p = new T.Vector3(x, 0, z); const test = p.clone(); collideCircle(test, .6, 0, 1.8);
    if (test.distanceTo(p) > .01) continue;
    if (p.distanceTo(P.pos) < 25) continue;
    if ((dMin || 0) > 40 && popsIn(x, z)) continue;
    return p;
  }
  return null;
}
