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
};
const ENEMIES = [], WISPS = [], PROJ = [];
let enemyId = 0;
class Enemy {
  constructor(type, x, z, opts) {
    const d = ET[type]; this.type = type; this.id = ++enemyId; this.pos = new T.Vector3(x, 0, z); this.vel = new T.Vector3(); this.face = Math.random() * TAU;
    this.hp = d.hp; this.maxHp = d.hp; this.speed = d.speed; this.r = d.r; this.scale = 1; this.dead = false; this.deadT = 0; this.cd = rand(.5, 1.5); this.t = Math.random() * 10;
    this.st = { speed: 0, phase: Math.random() * 6, hold: 'none', t: 0, attack: 0, flinch: 0, death: 0 };
    this.atk = 0; this.mode = 'hunt'; this.dmgMul = 1; this.seen = false; this.stuckT = 0; this.lastPos = this.pos.clone(); this.sideStep = 0;
    this.possessed = false; this.revealed = false; this.bleed = 0; this.slowT = 0;
    this.aware = !!(opts && opts.aware); this.supp = 0; this.role = null; if (this.aware) { this.awareT = G.t; this.lastSeen = G.t; this.lastKnown = P.pos.clone(); }
    const o = { gender: Math.random() < .5 ? 'f' : 'm', skin: pick(SKINS), hair: pick(HAIRS), hairCol: pick(HAIR_COLS.slice(0, 3)) };
    if (type === 'purger') {
      Object.assign(o, { top: pick([0x15151a, 0x2a1010, 0x1a1a2a, 0x2a2a20]), bottom: pick([0x111114, 0x1c2a44]), accent: pick([0xff2a6d, 0x05d9e8, 0xf3e600, 0xff1f3d]), sleeve: 1, mask: maskMat(), hair: Math.random() < .5 ? 'buzz' : 'short' });
      this.ranged = Math.random() < (opts && opts.ranged !== undefined ? opts.ranged : .45);
      this.st.hold = this.ranged ? 'pistol' : 'melee';
      this.molotov = this.ranged && Math.random() < .25;
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
    const glbId = { purger: 'purger', demon: 'demon', vampire: 'vampire', shifter: 'civilian', reptile: 'suit', witch: 'witch' }[type];
    this.R = (CHARS_READY && makeGLBRig(glbId)) || makeRig(o); this.o = o;
    this.R.root.scale.setScalar(this.scale);
    if (type === 'purger') this.attachWeapon(this.ranged ? 'gun' : 'bat');
    if (type === 'witch') this.attachWeapon('staff');
    if (type === 'reptile') { this.R.tail = null; }
    scene.add(this.R.root); this.sync();
    if (type === 'demon') { this.glow = glowSprite(0, 1.6, 0, lc(0xff3a10), 2.2, this.R.root); this.glow.material.opacity = .5; }
  }
  attachWeapon(k) {
    const hand = this.R.rArm.hand; const g = new T.Group();
    if (this.R.glb) { const mg = attachToBone(hand, g, 0, 0, Math.PI); if (k === 'gun') this.R.gunMount = { g: mg, mode: 'npc' }; } else hand.add(g);
    if (k === 'gun' && this.R.glb) { // a real modelled weapon from the arsenal, oriented by aimOverlay like the player's
      const id = this.gunId = pick(['preacher', 'preacher', 'vexor', 'kalash', 'patriot15', 'riot']);
      const built = buildWeapon(W[id], defaultCfg(W[id]), true); built.g.rotation.x = -Math.PI / 2; built.g.position.set(0, -.02, .01); g.add(built.g);
      this.R.gunMount.mode = 'tpp'; this.gun = built.g; this.heavyGun = id !== 'preacher' && id !== 'vexor';
    } else if (k === 'gun') { const m = new T.Mesh(gBox(.04, .06, .22), STD(0x111114, .4, .8)); m.position.set(0, -.07, -.08); g.add(m); this.gun = m; }
    if (k === 'bat') { const m = new T.Mesh(gLimb(.022, .04, .8), Math.random() < .5 ? STD(0x5a3a1a, .6) : STD(0x9a9aa0, .3, .9)); m.rotation.x = Math.PI; m.position.set(0, -.07, 0); g.add(m); }
    if (k === 'staff') { const m = new T.Mesh(gLimb(.018, .018, 1.5), STD(0x2a1a10, .8)); m.rotation.x = Math.PI; m.position.set(0, -.6, 0); g.add(m); const orb = new T.Mesh(gSph(.07), NEON(0x3dff6a)); orb.position.set(0, .2, 0); g.add(orb); glowSprite(0, .2, 0, lc(0x3dff6a), .9, g); }
  }
  sync() { this.R.root.position.copy(this.pos); if (this.R.crouchW) this.R.root.position.y -= this.R.crouchW * .17 * this.scale; this.R.root.rotation.y = this.face; }
  headPos() { return new T.Vector3(this.pos.x, this.pos.y + 1.68 * this.scale * (this.st.crouch ? .8 : 1), this.pos.z); }
  dist2() { const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z; return dx * dx + dz * dz; }
  turnTo(x, z, dt, k) { const tgt = Math.atan2(-(x - this.pos.x), -(z - this.pos.z)); let d = tgt - this.face; d = Math.atan2(Math.sin(d), Math.cos(d)); this.face += d * Math.min(1, dt * (k || 8)); }
  moveToward(x, z, spd, dt) {
    const dx = x - this.pos.x, dz = z - this.pos.z; const L = Math.hypot(dx, dz) || 1;
    let vx = dx / L * spd, vz = dz / L * spd;
    if (this.sideStep > 0) { this.sideStep -= dt; const s = this.sideDir; const tx = -vz * s, tz = vx * s; vx = vx * .2 + tx; vz = vz * .2 + tz; }
    this.vel.x = damp(this.vel.x, vx, 8, dt); this.vel.z = damp(this.vel.z, vz, 8, dt);
  }
  update(dt) {
    this.t += dt; this.st.t = this.t;
    const d2 = this.dist2(), dist = Math.sqrt(d2);
    if (this.dead) {
      this.deadT += dt; this.st.death = this.deadT * 2.2; this.st.speed = 0; if (this.R.glb) { if (this.deadT < 6) animGLB(this.R, this.st, dt); } else animRig(this.R, this.st, dt);
      if (this.deadT > 7) { const k = clamp((this.deadT - 7) / 1.5, 0, 1); this.R.root.position.y = -k * .6; if (k >= 1) this.remove(); }
      return;
    }
    if (this.bleed > 0) { this.bleed -= dt; this.hurt(9 * dt, null, null, true); if (Math.random() < .3) FXN.emit(this.pos.x, 1.1, this.pos.z, rand(-.3, .3), -1, rand(-.3, .3), .6, .08, .05, COL.blood, 1, 6); if (this.dead) return; }
    this.st.flinch = Math.max(0, this.st.flinch - dt * 4);
    if (this.slowT > 0) this.slowT -= dt;
    // far LOD: freeze animation, still move
    const far = d2 > 90 * 90;
    if (this.mode !== 'disguise') perceive(this, dt, dist);
    this.ai(dt, dist);
    // movement & collision
    const sp = this.slowT > 0 ? .5 : 1;
    this.pos.x += this.vel.x * dt * sp; this.pos.z += this.vel.z * dt * sp;
    if (this.type !== 'witch' && this.type !== 'demon') this.pos.y = 0;
    collideCircle(this.pos, this.r * this.scale, Math.max(0, this.pos.y), 1.8);
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
      this.st.attackClip = { purger: this.ranged ? null : 'slash', demon: 'punch', vampire: 'slash', shifter: 'punch', reptile: 'cast', witch: 'cast' }[this.type];
      this.st.aimHold = this.type === 'purger' && this.ranged && (this.burst > 0 || (this.aware && this.seesP && dist < 50) || !!this.st.aimHoldCiv); this.st.aimHoldCiv = 0;
      if (!far || Math.random() < .2) animGLB(this.R, this.st, far ? dt * 5 : dt);
    } else if (!far) animRig(this.R, this.st, dt);
    this.sync();
    if (this.type === 'demon' && Math.random() < dt * 14 && d2 < 60 * 60) FXA.emit(this.pos.x + rand(-.4, .4), rand(.4, 2), this.pos.z + rand(-.4, .4), rand(-.3, .3), rand(.6, 1.6), rand(-.3, .3), rand(.6, 1.2), .1, .02, COL.ember, 1, 0, 0);
    if (this.possessed && Math.random() < dt * 10) FXA.emit(this.pos.x, rand(1, 2), this.pos.z, rand(-.3, .3), rand(.5, 1.2), rand(-.3, .3), .7, .14, .02, COL.ember, 1);
  }
  ai(dt, dist) {
    const px = P.pos.x, pz = P.pos.z; const D = this;
    const melee = (range, dmg, dur, cd) => {
      if (dist < range && this.cd <= 0 && this.atk <= 0) { this.atk = this.atkDur = dur; this.cd = cd; this.hitPending = { t: dur * .5, dmg, range }; if (this.type === 'purger') AU.swish(); }
      if (this.hitPending) { this.hitPending.t -= dt; if (this.hitPending.t <= 0) { if (Math.sqrt(this.dist2()) < this.hitPending.range + .4 && !P.inCar) damagePlayer(this.hitPending.dmg * this.dmgMul, this.pos, this); this.hitPending = null; } }
    };
    this.cd -= dt; this._dt = dt;
    if (P.dead) { this.moveToward(this.pos.x + Math.sin(this.t) * 3, this.pos.z + Math.cos(this.t) * 3, 1, dt); return; }
    if (this.type === 'purger') { purgerAI(this, dt, dist); return; }
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
          melee(1.9, 14, .55, 1.0);
        }
        break;
      }
      case 'demon': {
        if (!this.leapT && dist < 9 && dist > 3.5 && this.cd <= 0) { this.leapT = .7; this.cd = 3; this.vel.set((px - this.pos.x) / dist * 13, 0, (pz - this.pos.z) / dist * 13); AU.roar(spatial(this.pos).pan, spatial(this.pos).vol); }
        if (this.leapT > 0) { this.leapT -= dt; this.pos.y = Math.sin((1 - this.leapT / .7) * Math.PI) * 2.2; if (this.leapT <= 0) { this.leapT = 0; this.pos.y = 0; burst(FXN, this.pos.clone().setY(.2), 14, 4, .8, .5, 1.2, COL.smoke, 0, .3, .5, 2); if (dist < 3) damagePlayer(30, this.pos, this); } }
        else { this.pos.y = 0; this.moveToward(px, pz, dist < 1.6 ? 0 : this.speed, dt); melee(2.2, 24, .6, 1.1); }
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
        } else { this.moveToward(px, pz, dist < 2 ? 0 : this.speed, dt); this.turnTo(px, pz, dt, 9); melee(2.6, 30, .6, 1.2); }
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
          melee(2.2, 16, .5, 1.2);
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
        if (dist < 35 && this.cd <= 0) { this.cd = rand(2, 2.8); this.atk = this.atkDur = .6; setTimeout(() => { if (!this.dead && !this.vanish) hexOrb(this); }, 300); }
        if (Math.random() < dt * 6) FXA.emit(this.pos.x, this.pos.y + .2, this.pos.z, rand(-.3, .3), -.2, rand(-.3, .3), .8, .18, .02, COL.purple, .8);
        break;
      }
    }
  }
  melee(range, dmg, dur, cd, dist) {
    if (range > 0 && dist < range && this.cd <= 0 && this.atk <= 0) { this.atk = this.atkDur = dur; this.cd = cd; this.hitPending = { t: dur * .5, dmg, range }; if (this.type === 'purger') AU.swish(); }
    if (this.hitPending) { this.hitPending.t -= this._dt || 1 / 60; if (this.hitPending.t <= 0) { if (Math.sqrt(this.dist2()) < this.hitPending.range + .4 && !P.inCar) damagePlayer(this.hitPending.dmg * this.dmgMul, this.pos, this); this.hitPending = null; } }
  }
  blink() { this.vanish = .9; this.R.root.visible = false; burst(FXA, this.pos.clone().setY(this.pos.y + 1.2), 30, 5, .8, .3, .05, COL.purple, 0, .2, 1, 1); this.cd = Math.max(this.cd, .8); }
  swapRig(id) {
    const nr = CHARS_READY && makeGLBRig(id); if (!nr) return false;
    scene.remove(this.R.root); this.R = nr; nr.root.scale.setScalar(this.scale); scene.add(nr.root); this.sync();
    burst(FXN, this.pos.clone().setY(1.2), 46, 4, 1.1, .35, 1.2, COL.smoke, -.3, .4, .8, 1.5); burst(FXN, this.pos.clone().setY(1.2), 24, 5, .7, .12, .05, COL.blood, 9);
    return true;
  }
  transform() { if (this.mode !== 'disguise') return; this.mode = 'morph'; this.morphT = 0; this.hp = this.maxHp = 320; if (this.R.glb) this.swapRig('beast'); AU.roar(spatial(this.pos).pan, 1); shake(.15); flashBanner('SHAPESHIFTER', 'It was never a person', 1.6); }
  reveal() {
    if (this.mode !== 'disguise') return; this.mode = 'morph'; this.morphT = 0; this.hp = this.maxHp = Math.max(this.hp, 190);
    if (this.R.glb) { this.swapRig('reptile'); this.st.hold = 'claw'; AU.hiss(spatial(this.pos).pan, 1); flashBanner('REPTILIAN', 'The suit was a skin', 1.6); return; }
    const scale = new T.MeshStandardMaterial({ map: camoTex('scales').map, roughness: .5, metalness: .2 });
    this.R.skull.material = scale; this.R.mats.skin.color.copy(lc(0x2a6a2a)); this.R.eyes.forEach(e => { e.material = NEON(0xf3e600); e.scale.set(.4, 2.4, 1); });
    this.R.head.children.forEach(c => { if (c.material && c.material.metalness === 1) c.visible = false; });
    // grow a tail
    this.R.tail = []; let par = this.R.hips; const tm = this.o.tailMat;
    for (let i = 0; i < 6; i++) { const seg = new T.Group(); seg.position.set(0, i === 0 ? -.05 : 0, i === 0 ? .1 : .16); par.add(seg); const m = new T.Mesh(gLimb(.05 - i * .007, .045 - i * .007, .17), tm); m.rotation.x = Math.PI / 2; seg.add(m); seg.scale.setScalar(.01); this.R.tail.push(seg); par = seg; }
    this.st.hold = 'claw'; AU.hiss(spatial(this.pos).pan, 1); flashBanner('REPTILIAN', 'The suit was a skin', 1.6);
  }
  possess() {
    this.possessed = true; this.hp = this.maxHp = this.maxHp * 2.3; this.dmgMul = 1.8; this.scale = 1.12; this.R.root.scale.setScalar(1.12);
    if (this.R.glb) tintGLB(this.R, 0xff2a00, .55);
    this.R.eyeM.color.set(0xff3a00); this.R.mats.top.emissive = lc(0x5a0a00); this.R.mats.top.emissiveIntensity = .6; this.R.mats.skin.color.copy(lc(0x6a2020));
    this.glow = glowSprite(0, 1.5, 0, lc(0xff2a00), 2, this.R.root); this.glow.material.opacity = .45;
    burst(FXA, this.pos.clone().setY(1.4), 40, 5, .9, .25, .02, COL.ember, 0, .3, 1, 1); AU.growl(spatial(this.pos).pan, 1);
  }
  partAt(o, d) {
    // returns {t, part} for a ray, or null
    if (this.dead || (this.R && !this.R.root.visible)) return null;
    const sc = this.scale, hy = this.pos.y; const hp = this.headPos();
    const th = raySphere(o, d, hp, .17 * sc);
    const tb = rayVCapsule(o, d, this.pos.x, this.pos.z, hy + .35 * sc, hy + 1.38 * sc, (this.type === 'witch' ? .45 : .3) * sc);
    if (th > 0 && (tb < 0 || th <= tb + .2)) return { t: th, part: 'head' };
    if (tb > 0) { const y = o.y + d.y * tb - hy; return { t: tb, part: y < .8 * sc ? 'limb' : 'body' }; }
    return null;
  }
  hurt(amount, part, dir, src) {
    if (this.dead) return false;
    if (this.mode === 'disguise' && src !== true) { if (this.type === 'shifter') this.transform(); else this.reveal(); }
    this.hp -= amount; if (src !== true) this.st.flinch = Math.min(1, this.st.flinch + .5);
    if (src && src !== true && src !== 'car' && !this.aware) alertEnemy(this, P.pos, 2.5); if (src && src.w) this.supp = Math.min(1, (this.supp || 0) + .35);
    if (this.type === 'vampire' && this.hp < this.maxHp * .35 && !this.usedVanish && src !== true) { this.usedVanish = 1; this.vanish = 1; this.R.root.visible = false; burst(FXN, this.pos.clone().setY(1.2), 40, 5, 1, .25, .05, COL.ichor, 0, .3, 1, 1); }
    if (this.hp <= 0) { this.die(part, dir, src); return true; }
    return false;
  }
  die(part, dir, src) {
    this.dead = true; this.deadT = 0; this.vel.set(0, 0, 0); this.R.root.visible = true; this.pos.y = 0;
    if (dir) { const fwd = new T.Vector3(-Math.sin(this.face), 0, -Math.cos(this.face)); this.st.fallDir = fwd.dot(dir) > 0 ? -1 : 1; }
    const c = this.pos.clone().setY(1.2);
    if (this.type === 'demon') { burst(FXA, c, 50, 6, 1.2, .3, .02, COL.ember, -1, .3, 1, 1); this.R.root.visible = false; this.deadT = 8.4; spawnWisp(this.pos.x, this.pos.z, 'player'); AU.roar(spatial(this.pos).pan, 1); }
    else if (this.type === 'vampire') { burst(FXN, c, 50, 3, 1.6, .35, .7, COL.ash, -.5, .4, .9, 1); this.R.root.visible = false; this.deadT = 8.4; AU.screech(spatial(this.pos).pan, 1); }
    else if (this.type === 'witch') { burst(FXA, c, 60, 7, 1.2, .35, .02, COL.purple, 0, .2, 1, 1); this.R.root.visible = false; this.deadT = 8.4; AU.cackle(spatial(this.pos).pan, 1); }
    else if (this.type === 'reptile') { burst(FXN, c, 26, 4, .9, .12, .05, COL.green, 9); }
    else if (this.type === 'shifter') { burst(FXN, c, 30, 4, .9, .14, .05, COL.ichor, 9); }
    else burst(FXN, c, 22, 3.5, .8, .12, .05, COL.blood, 9);
    if (this.R.glb) this.st.deathClip = 'fall';
    if (part === 'head' && (src && src.big)) { if (this.R.glb) this.R.head.scale.setScalar(.001); else this.R.head.visible = false; burst(FXN, this.headPos(), 26, 5, .8, .12, .05, this.type === 'reptile' ? COL.green : COL.blood, 9); }
    if (this.possessed) spawnWisp(this.pos.x, this.pos.z, 'player');
    decal(new T.Vector3(this.pos.x, .02, this.pos.z), new T.Vector3(0, 1, 0), rand(1.4, 2.4), splatTex, this.type === 'reptile' ? 0x1a8a2a : this.type === 'demon' || this.type === 'vampire' || this.type === 'witch' ? 0x1a1a1a : 0x5a0010);
    onKill(this, part, src);
  }
  remove() { scene.remove(this.R.root); const i = ENEMIES.indexOf(this); if (i >= 0) ENEMIES.splice(i, 1); }
}
/* ---------- wisps: demons between bodies ---------- */
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
    // prefer a living purger to ride; else the player
    let tgt = null, best = 30 * 30;
    if (w.t > 1.2) for (const e of ENEMIES) { if (e.dead || e.type !== 'purger' || e.possessed) continue; const d = e.pos.distanceToSquared(w.pos); if (d < best) { best = d; tgt = e; } }
    const tp = tgt ? tgt.pos.clone().setY(1.4) : P.eye();
    const dir = tp.clone().sub(w.pos); const L = dir.length();
    const spd = w.t < 1.2 ? 1 : 7.5;
    w.pos.addScaledVector(dir.normalize(), spd * dt); w.pos.y += Math.sin(w.t * 6) * .01;
    w.g.lookAt(tp);
    if (Math.random() < .6) FXA.emit(w.pos.x, w.pos.y, w.pos.z, rand(-.3, .3), rand(-.3, .3), rand(-.3, .3), .5, .3, .05, COL.ember, .8);
    if (Math.random() < .3) FXN.emit(w.pos.x, w.pos.y, w.pos.z, 0, .4, 0, .9, .3, .8, COL.smoke, .5);
    if (L < .8 && w.t > 1.2) {
      if (tgt) tgt.possess(); else if (!P.dead && !P.inCar) startPossession(); else if (P.inCar) { w.life = 0; }
      if (tgt || !P.dead) { scene.remove(w.g); WISPS.splice(i, 1); continue; }
    }
    if (w.hp <= 0 || w.life <= 0) { burst(FXA, w.pos, 30, 5, .7, .25, .02, COL.ember, 0, 0, 1, 1); scene.remove(w.g); WISPS.splice(i, 1); }
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
function makeProj(type, pos, vel, owner, dmg, opts) {
  let obj;
  if (type === 'star') { obj = new T.Mesh(P.starGeo || gBox(.1, .01, .1), STD(0xf0f2f8, .05, 1)); obj.scale.setScalar(1.6); }
  else { const col = type === 'hex' ? 0xb04dff : type === 'acid' ? 0x3dff6a : type === 'plasma' ? 0x5dff7a : 0xffffff; obj = new T.Group(); obj.add(new T.Mesh(gSph(type === 'plasma' ? .09 : .14), NEON(col))); const gs = glowSprite(0, 0, 0, lc(col), type === 'plasma' ? 1.2 : 1.6, obj); }
  obj.position.copy(pos); scene.add(obj);
  const p = Object.assign({ type, pos: obj.position, vel, owner, dmg, obj, life: 4, g: type === 'acid' ? 9 : 0 }, opts || {}); PROJ.push(p); return p;
}
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
    if (p.homing && !P.dead) { const want = P.eye().sub(p.pos).normalize().multiplyScalar(p.vel.length()); p.vel.lerp(want, Math.min(1, p.homing * dt)); }
    p.vel.y -= p.g * dt;
    const step = p.vel.clone().multiplyScalar(dt); const L = step.length(); const dir = step.clone().divideScalar(L || 1);
    const wh = rayBoxes(p.pos, dir, L);
    if (p.owner === 'player') {
      let best = null, bt = L;
      for (const e of ENEMIES) { const h = e.partAt(p.pos, dir); if (h && h.t < bt) { bt = h.t; best = { e, part: h.part }; } }
      for (const w of WISPS) { const t = raySphere(p.pos, dir, w.pos, .5); if (t > 0 && t < bt) { bt = t; best = { w }; } }
      if (best && (!wh || bt < wh.t)) {
        const hp = p.pos.clone().addScaledVector(dir, bt);
        if (best.w) { best.w.hp -= p.dmg; hitMarker(best.w.hp <= 0); }
        else { const mult = best.part === 'head' ? p.head : best.part === 'limb' ? .85 : 1; const k = best.e.hurt(p.dmg * mult, best.part, dir, { w: p.w, big: p.type === 'plasma' }); hitMarker(k, best.part === 'head'); burst(FXN, hp, 6, 2, .4, .08, .05, COL.blood, 6); }
        if (p.type === 'plasma') splash(hp, p); dead = true;
        if (p.type === 'star') AU.thud();
      } else if (wh) {
        const hp = p.pos.clone().addScaledVector(dir, wh.t);
        if (p.type === 'plasma') splash(hp, p); else { burst(FXA, hp, 8, 3, .3, .08, .02, COL.spark, 8); AU.ping(spatial(hp).pan); }
        dead = true;
      }
    } else {
      const c = P.pos.clone().setY(P.pos.y + 1.0); const tt = raySphere(p.pos, dir, c, .65);
      if (tt > 0 && tt <= L && !P.dead) {
        damagePlayer(p.dmg, p.pos, null);
        if (p.type === 'hex') { P.hexT = 3; flashBanner('HEXED', 'Movement slowed', .9); }
        if (p.type === 'acid') { P.acidT = 1.2; }
        burst(FXA, p.pos, 14, 3, .5, .15, .02, p.type === 'hex' ? COL.purple : COL.green, 0); dead = true;
      } else if (wh) { burst(FXA, p.pos.clone().addScaledVector(dir, wh.t), 12, 3, .5, .2, .02, p.type === 'hex' ? COL.purple : COL.green, 3); dead = true; }
    }
    p.pos.add(step);
    if (p.type === 'star') { p.obj.rotation.x = -Math.PI / 2; p.obj.rotation.z += dt * 30; }
    if (p.type === 'hex' && Math.random() < .6) FXA.emit(p.pos.x, p.pos.y, p.pos.z, rand(-.2, .2), rand(-.2, .2), rand(-.2, .2), .4, .2, .02, COL.purple, .9);
    if (p.type === 'acid' && Math.random() < .5) FXN.emit(p.pos.x, p.pos.y, p.pos.z, 0, -.5, 0, .4, .1, .05, COL.green, .8, 4);
    if (p.type === 'plasma' && Math.random() < .8) FXA.emit(p.pos.x, p.pos.y, p.pos.z, rand(-.3, .3), rand(-.3, .3), rand(-.3, .3), .3, .25, .02, COL.plasma, .9);
    if (dead) { scene.remove(p.obj); PROJ.splice(i, 1); }
  }
}
function splash(at, p) {
  burst(FXA, at, 40, 7, .6, .3, .02, COL.plasma, 0, .3, 1, 1); AU.boom(spatial(at).pan);
  flashLight.position.copy(at); flashLight.color.set(0x5dff7a); flashLight.intensity = 6; G.flashT = .12;
  for (const e of ENEMIES) { if (e.dead) continue; const d = e.pos.clone().setY(1).distanceTo(at); if (d < p.splash) { const k = e.hurt(45 * (1 - d / p.splash) + 10, 'body', null, { w: p.w }); if (k) hitMarker(true); } }
  const pd = P.eye().distanceTo(at); if (pd < 2.5) damagePlayer(12, at, null);
}

/* ---------- spawning: the night gets worse every hour ---------- */
const SPAWN = { t: 2, first: true };
function spawnTable(d, hour) {
  // [type, weight]
  const base = { purger: 5, demon: hour > 1 ? 1.5 : .4, vampire: hour > 2 ? 1.5 : .3, shifter: 1, reptile: hour > 1 ? 1.2 : .5, witch: hour > 3 ? 1 : .2 };
  if (d === 0) base.demon *= 3;
  if (d === 1) base.reptile *= 3.2;
  if (d === 2) { base.shifter *= 2.6; base.purger *= 1.3; }
  if (d === 3) { base.witch *= 4.5; base.vampire *= 2.4; base.demon *= .6; }
  return base;
}
function updateSpawns(dt) {
  if (P.dead || G.state !== 'city' || G.inside) return;
  const hour = G.hour; const maxE = (G.quality === 'high' ? 14 : 9) + Math.floor(hour * (G.quality === 'high' ? .7 : .45));
  SPAWN.t -= dt; if (SPAWN.t > 0) return;
  SPAWN.t = Math.max(1.1, 4.2 - hour * .28) * rand(.7, 1.2);
  const alive = ENEMIES.filter(e => !e.dead).length; if (alive >= maxE) return;
  const n = SPAWN.first ? 4 : (Math.random() < .25 + hour * .03 ? rint(2, 3) : 1); SPAWN.first = false;
  for (let k = 0; k < n; k++) {
    const pt = spawnPoint(); if (!pt) continue;
    const tab = spawnTable(districtAt(pt.x, pt.z), hour); let sum = 0; for (const t in tab) sum += tab[t];
    let r = Math.random() * sum, type = 'purger'; for (const t in tab) { r -= tab[t]; if (r <= 0) { type = t; break; } }
    if (type === 'witch' && districtAt(pt.x, pt.z) === 3 && Math.random() < .6) { const wc = pick(WITCH_CIRCLES); if (wc.distanceTo(P.pos) > 18 && wc.distanceTo(P.pos) < 70) pt.copy(wc); }
    ENEMIES.push(new Enemy(type, pt.x, pt.z, { aware: Math.random() < .3 + hour * .04 }));
  }
}
function spawnPoint() {
  for (let tries = 0; tries < 14; tries++) {
    const behind = Math.random() < .55; const a = (behind ? -P.yaw + Math.PI : -P.yaw) + rand(-1.4, 1.4);
    const d = rand(32, 58); let x = P.pos.x + Math.sin(a) * d, z = P.pos.z - Math.cos(a) * d;
    if (Math.random() < .5) x = Math.round((x + HALF) / CW) * CW - HALF + rand(-3, 3); else z = Math.round((z + HALF) / CW) * CW - HALF + rand(-3, 3);
    x = clamp(x, -HALF + 4, HALF - 4); z = clamp(z, -HALF + 4, HALF - 4);
    const p = new T.Vector3(x, 0, z); const test = p.clone(); collideCircle(test, .6, 0, 1.8);
    if (test.distanceTo(p) > .01) continue;
    if (p.distanceTo(P.pos) < 25) continue;
    return p;
  }
  return null;
}
