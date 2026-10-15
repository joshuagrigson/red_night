/* =====================================================================
   RED NIGHT — arsenal data + procedural weapon models
   ===================================================================== */
const lc = h => new T.Color(h).convertSRGBToLinear();

const CLS = [
  { id: 'pistol', name: 'Pistols', short: 'PISTOL', wall: 'preacher', ids: ['iron45', 'polymer19', 'preacher', 'macro', 'stutter18'] },
  { id: 'smg', name: 'SMGs', short: 'SMG', wall: 'vexor', ids: ['kurz5', 'vexor', 'unit45', 'bullpup90'] },
  { id: 'ar', name: 'Assault Rifles', short: 'RIFLE', wall: 'kalash', ids: ['kalash', 'bullpupA3', 'patriot15', 'battlefal'] },
  { id: 'sniper', name: 'Snipers', short: 'SNIPER', wall: 'longshot', ids: ['tundra', 'anvil50', 'longshot'] },
  { id: 'shotgun', name: 'Shotguns', short: 'SHOTGUN', wall: 'riot', ids: ['twin', 'sawed', 'riot', 'autoloader', 'drumauto'] },
  { id: 'lmg', name: 'LMGs', short: 'LMG', wall: 'bren', ids: ['doughboy', 'rpk', 'marine27', 'l86', 'bren'] },
  { id: 'melee', name: 'Melee', short: 'MELEE', wall: 'katana', ids: ['katana', 'barbedbat', 'hockey', 'slasher'] },
  { id: 'special', name: 'Other', short: 'OTHER', wall: 'xeno', ids: ['xeno', 'chainsaw', 'nodachi', 'slasher', 'stars', 'karambit'] },
];
// dmg, dmgMin, r1, r2 (m), rpm, mag, reserve, reload(s), hip/ads spread (deg), recoil V/H (deg), adsT (s), mob (speed mult)
const WDEF = [
  // pistols
  ['iron45', 'pistol', 'Iron 45', '1911-style · .45 ACP', 'p1911', { dmg: 42, dmgMin: 28, r1: 15, r2: 40, rpm: 420, mag: 8, res: 64, reload: 1.7, hip: 2.4, ads: .55, recV: 1.6, recH: .4, adsT: .16, mob: 1.0, head: 1.8 }],
  ['polymer19', 'pistol', 'Polymer 19', 'Glock-style · 9mm', 'pglock', { dmg: 30, dmgMin: 20, r1: 14, r2: 36, rpm: 480, mag: 17, res: 102, reload: 1.45, hip: 2.2, ads: .5, recV: 1.1, recH: .35, adsT: .14, mob: 1.0, head: 1.8 }],
  ['preacher', 'pistol', 'Silver Preacher', 'Nickel-plated revolver · .357', 'prev', { dmg: 72, dmgMin: 46, r1: 22, r2: 55, rpm: 170, mag: 6, res: 42, reload: 2.8, hip: 2.8, ads: .4, recV: 3.4, recH: .6, adsT: .18, mob: .98, head: 2.0 }],
  ['macro', 'pistol', 'Pocket Macro', 'P365 X-Macro-style · 9mm compact', 'pmacro', { dmg: 29, dmgMin: 19, r1: 13, r2: 34, rpm: 520, mag: 17, res: 102, reload: 1.35, hip: 2.0, ads: .55, recV: 1.0, recH: .4, adsT: .12, mob: 1.02, head: 1.8 }],
  ['stutter18', 'pistol', 'Stutter 18', 'Full-auto machine pistol · 9mm', 'pauto', { dmg: 21, dmgMin: 14, r1: 10, r2: 28, rpm: 1100, auto: 1, mag: 33, res: 165, reload: 1.8, hip: 3.2, ads: 1.4, recV: .65, recH: .55, adsT: .15, mob: 1.0, head: 1.6 }],
  // smgs
  ['kurz5', 'smg', 'Kurz 5', 'MP5-style · 9mm', 'mp5', { dmg: 25, dmgMin: 17, r1: 16, r2: 42, rpm: 800, auto: 1, mag: 30, res: 180, reload: 2.0, hip: 3.2, ads: .7, recV: .55, recH: .3, adsT: .2, mob: .96, head: 1.5 }],
  ['vexor', 'smg', 'Vexor', 'Kriss Vector-style · .45', 'vector', { dmg: 22, dmgMin: 14, r1: 12, r2: 32, rpm: 1150, auto: 1, mag: 25, res: 175, reload: 2.1, hip: 3.4, ads: .8, recV: .38, recH: .28, adsT: .19, mob: .97, head: 1.5 }],
  ['unit45', 'smg', 'Unit 45', 'UMP-style · .45', 'ump', { dmg: 31, dmgMin: 20, r1: 18, r2: 45, rpm: 650, auto: 1, mag: 25, res: 150, reload: 2.2, hip: 3.0, ads: .65, recV: .75, recH: .35, adsT: .21, mob: .95, head: 1.5 }],
  ['bullpup90', 'smg', 'Bullpup 90', 'P90-style · 5.7mm', 'p90', { dmg: 23, dmgMin: 15, r1: 15, r2: 40, rpm: 900, auto: 1, mag: 50, res: 200, reload: 2.6, hip: 3.0, ads: .75, recV: .45, recH: .25, adsT: .22, mob: .95, head: 1.5 }],
  // rifles
  ['kalash', 'ar', 'Kalash 47', 'AK-47-style · 7.62', 'ak', { dmg: 38, dmgMin: 28, r1: 35, r2: 80, rpm: 600, auto: 1, mag: 30, res: 180, reload: 2.4, hip: 4.0, ads: .55, recV: 1.05, recH: .65, adsT: .27, mob: .9, head: 1.6 }],
  ['bullpupA3', 'ar', 'Bullpup A3', 'AUG-style · 5.56', 'aug', { dmg: 31, dmgMin: 23, r1: 32, r2: 75, rpm: 720, auto: 1, mag: 30, res: 180, reload: 2.5, hip: 3.8, ads: .45, recV: .7, recH: .35, adsT: .28, mob: .9, head: 1.6 }],
  ['patriot15', 'ar', 'Patriot 15', 'AR-15-style · 5.56', 'ar15', { dmg: 30, dmgMin: 22, r1: 30, r2: 72, rpm: 780, auto: 1, mag: 30, res: 210, reload: 2.2, hip: 3.6, ads: .45, recV: .65, recH: .3, adsT: .25, mob: .92, head: 1.6 }],
  ['battlefal', 'ar', 'Battle FAL', 'FAL-style battle rifle · 7.62', 'fal', { dmg: 48, dmgMin: 36, r1: 45, r2: 100, rpm: 560, auto: 1, mag: 20, res: 120, reload: 2.6, hip: 4.4, ads: .5, recV: 1.35, recH: .55, adsT: .3, mob: .88, head: 1.7 }],
  // snipers
  ['tundra', 'sniper', 'Tundra SVD', 'SVD-style marksman · 7.62x54R', 'svd', { dmg: 95, dmgMin: 72, r1: 70, r2: 150, rpm: 280, mag: 10, res: 50, reload: 2.6, hip: 7, ads: .06, recV: 2.4, recH: .5, adsT: .38, mob: .86, head: 2.2, optic: 'scope8' }],
  ['anvil50', 'sniper', 'Anvil .50', 'M99-style single shot · .50 BMG', 'm99', { dmg: 320, dmgMin: 250, r1: 120, r2: 250, rpm: 40, mag: 1, res: 20, reload: 2.2, hip: 9, ads: 0, recV: 6, recH: 1.2, adsT: .5, mob: .78, head: 2.5, optic: 'scope12' }],
  ['longshot', 'sniper', 'Longshot 2010', 'M2010-style bolt action · .300 WM', 'm2010', { dmg: 170, dmgMin: 130, r1: 100, r2: 220, rpm: 50, mag: 5, res: 35, reload: 3.0, hip: 8, ads: 0, recV: 4, recH: .6, adsT: .42, mob: .84, head: 2.5, action: 'bolt', optic: 'scope8' }],
  // shotguns (pellets)
  ['twin', 'shotgun', 'Twin Barrel', 'Side-by-side double · 12ga', 'dbl', { dmg: 22, dmgMin: 6, pellets: 10, r1: 8, r2: 22, rpm: 300, mag: 2, res: 40, reload: 2.4, hip: 5.5, ads: 4.2, recV: 5, recH: 1, adsT: .22, mob: .93, head: 1.2 }],
  ['sawed', 'shotgun', 'Sawed-Off', 'Cut-down double · 12ga', 'sawed', { dmg: 20, dmgMin: 5, pellets: 12, r1: 6, r2: 16, rpm: 320, mag: 2, res: 40, reload: 2.0, hip: 7.5, ads: 6.5, recV: 6, recH: 1.2, adsT: .18, mob: .97, head: 1.2 }],
  ['riot', 'shotgun', 'Riot Pump', 'Pump action · 12ga', 'pump', { dmg: 24, dmgMin: 7, pellets: 8, r1: 9, r2: 25, rpm: 75, mag: 6, res: 42, reload: .45, shell: 1, hip: 5, ads: 3.6, recV: 4, recH: .8, adsT: .24, mob: .92, head: 1.2, action: 'pump' }],
  ['autoloader', 'shotgun', 'Auto-Loader', 'Semi-auto tactical · 12ga', 'semi', { dmg: 19, dmgMin: 6, pellets: 8, r1: 8, r2: 22, rpm: 220, mag: 7, res: 49, reload: .4, shell: 1, hip: 5.2, ads: 4, recV: 3, recH: .7, adsT: .25, mob: .91, head: 1.2 }],
  ['drumauto', 'shotgun', 'Drum Auto', 'Full-auto drum shotgun · 12ga', 'aa12', { dmg: 14, dmgMin: 4, pellets: 8, r1: 7, r2: 20, rpm: 300, auto: 1, mag: 20, res: 80, reload: 3.0, hip: 6, ads: 4.8, recV: 2.2, recH: .8, adsT: .3, mob: .87, head: 1.2 }],
  // lmgs
  ['doughboy', 'lmg', 'Doughboy BAR', 'BAR-style · .30-06', 'bar', { dmg: 46, dmgMin: 34, r1: 40, r2: 90, rpm: 520, auto: 1, mag: 20, res: 160, reload: 2.8, hip: 4.5, ads: .6, recV: 1.1, recH: .5, adsT: .38, mob: .84, head: 1.6 }],
  ['rpk', 'lmg', 'Kalash RPK', 'RPK-style drum · 7.62', 'rpk', { dmg: 36, dmgMin: 27, r1: 38, r2: 85, rpm: 620, auto: 1, mag: 75, res: 225, reload: 4.2, hip: 4.8, ads: .6, recV: .9, recH: .6, adsT: .4, mob: .82, head: 1.6 }],
  ['marine27', 'lmg', 'Marine 27', 'M27-style IAR · 5.56', 'm27', { dmg: 31, dmgMin: 24, r1: 35, r2: 80, rpm: 760, auto: 1, mag: 60, res: 240, reload: 3.6, hip: 4.4, ads: .5, recV: .7, recH: .35, adsT: .36, mob: .85, head: 1.6 }],
  ['l86', 'lmg', 'Royal L86', 'L86-style bullpup LSW · 5.56', 'l86', { dmg: 33, dmgMin: 25, r1: 40, r2: 90, rpm: 700, auto: 1, mag: 60, res: 240, reload: 3.8, hip: 4.6, ads: .45, recV: .75, recH: .3, adsT: .38, mob: .84, head: 1.6 }],
  ['bren', 'lmg', 'Blitz Bren', 'Bren-style top-feed · .303', 'bren', { dmg: 42, dmgMin: 31, r1: 42, r2: 92, rpm: 540, auto: 1, mag: 30, res: 210, reload: 3.0, hip: 4.5, ads: .55, recV: .95, recH: .4, adsT: .37, mob: .83, head: 1.6 }],
  // melee
  ['katana', 'melee', 'Neon Katana', 'Mono-edge sword', 'katana', { kind: 'melee', dmg: 165, swing: .5, reach: 2.8, mob: 1.02 }],
  ['barbedbat', 'melee', 'Barbed Bat', 'Baseball bat wrapped in barbed wire', 'bat', { kind: 'melee', dmg: 125, swing: .62, reach: 2.5, wood: 1, bleed: 1, mob: 1.0 }],
  ['hockey', 'melee', 'Slapshot', 'Hockey stick', 'hockey', { kind: 'melee', dmg: 95, swing: .46, reach: 2.7, wood: 1, knock: 1, mob: 1.03 }],
  ['slasher', 'melee', 'Slasher Knife', 'Big clip-point hunting knife', 'knife', { kind: 'melee', dmg: 130, swing: .36, reach: 1.9, mob: 1.06 }],
  // other
  ['xeno', 'special', 'Xeno Blaster', 'Alien plasma pistol · splash', 'blaster', { kind: 'plasma', dmg: 90, dmgMin: 90, splash: 3.2, r1: 999, r2: 999, rpm: 260, mag: 12, res: 60, reload: 2.2, hip: 1.6, ads: .3, recV: 1.4, recH: .3, adsT: .2, mob: .97, head: 1.3, speed: 75 }],
  ['chainsaw', 'special', 'Chainsaw', 'Hold fire to rip', 'saw', { kind: 'saw', dmg: 420, reach: 2.5, mag: 100, res: 300, reload: 2.4, mob: .9 }],
  ['nodachi', 'special', 'Red Nodachi', 'Long two-hand sword', 'nodachi', { kind: 'melee', dmg: 230, swing: .78, reach: 3.5, mob: .96 }],
  ['stars', 'special', 'Ninja Stars', 'Thrown shuriken · fast', 'stars', { kind: 'throw', dmg: 95, rpm: 170, mag: 12, res: 36, reload: 1.0, hip: .6, ads: .2, recV: .4, recH: .2, adsT: .12, mob: 1.05, head: 1.8, speed: 55 }],
  ['karambit', 'special', 'Karambit & Dagger', 'Dual blades · combo', 'karambit', { kind: 'melee', dmg: 72, swing: .24, reach: 1.9, mob: 1.08, dual: 1 }],
];
const W = {};
for (const [id, cls, name, sub, model, s] of WDEF) {
  W[id] = Object.assign({ id, cls, name, sub, model, kind: 'gun', pellets: 1, head: 1.5, auto: 0, recH: .3, recV: .5, hip: 3, ads: .5, adsT: .25, mob: 1, action: 'semi' }, s);
  if (W[id].auto) W[id].action = 'auto';
  if (s.action) W[id].action = s.action;
}

const ATT = {
  optic: [
    { id: 'iron', name: 'Iron Sights', d: 'Clean, no zoom', zoom: 1.15 },
    { id: 'reddot', name: 'Red Dot', d: '1.2× · fastest', zoom: 1.25, adsT: .02, ret: 1 },
    { id: 'holo', name: 'Holo Sight', d: '1.4× · wide window', zoom: 1.4, adsT: .03, ret: 1 },
    { id: 'acog', name: '3× Combat Scope', d: '3× · mid range', zoom: 2.4, adsT: .06, ret: 1 },
    { id: 'scope4', name: '4× Scope', d: '4× · steady view', zoom: 3.4, adsT: .08, overlay: 1 },
    { id: 'scope8', name: '8× Sniper Scope', d: '8× · long range', zoom: 6, adsT: .1, overlay: 1 },
    { id: 'scope12', name: '12× Sniper Scope', d: '12× · extreme range', zoom: 9, adsT: .14, overlay: 1 },
  ],
  barrel: [
    { id: 'std', name: 'Factory Barrel', d: 'Balanced' },
    { id: 'long', name: 'Extended Barrel', d: '+30% range', range: 1.3, recV: .95, mob: -.03, adsT: .03 },
    { id: 'short', name: 'Short Barrel', d: 'Faster handling', range: .8, mob: .03, adsT: -.03, hip: .9 },
    { id: 'supp', name: 'Suppressor', d: 'Silent · no flash', sup: 1, range: .95, adsT: .02 },
    { id: 'comp', name: 'Compensator', d: '-20% vertical kick', recV: .8, recH: 1.1 },
    { id: 'brake', name: 'Muzzle Brake', d: '-30% side kick', recH: .7, recV: .92 },
  ],
  under: [
    { id: 'none', name: 'None', d: '—' },
    { id: 'vgrip', name: 'Vertical Grip', d: '-15% vertical kick', recV: .85, adsT: .01 },
    { id: 'agrip', name: 'Angled Grip', d: 'Faster aim', adsT: -.04, recV: .94 },
    { id: 'stop', name: 'Handstop', d: '-25% side kick', recH: .75, hip: .95 },
    { id: 'laser', name: 'Tac Laser', d: 'Tighter hipfire', hip: .7, adsT: -.02 },
  ],
  rear: [
    { id: 'std', name: 'Factory Grip', d: 'Balanced' },
    { id: 'stipple', name: 'Stippled Grip', d: 'Faster aim', adsT: -.03 },
    { id: 'rubber', name: 'Rubber Grip', d: '-8% recoil', recV: .92, recH: .92 },
    { id: 'ergo', name: 'Ergo Grip', d: 'Move + aim', mob: .02, hip: .95 },
  ],
  stock: [
    { id: 'std', name: 'Factory Stock', d: 'Balanced' },
    { id: 'heavy', name: 'Heavy Stock', d: '-18% recoil, slower', recV: .82, recH: .85, mob: -.04, adsT: .03 },
    { id: 'light', name: 'Skeleton Stock', d: 'Faster, more kick', mob: .04, adsT: -.03, recV: 1.08 },
    { id: 'none', name: 'No Stock', d: 'Fastest, wild kick', mob: .08, adsT: -.06, recV: 1.3, recH: 1.25, hip: 1.1 },
  ],
};
const ATT_NAMES = { optic: 'Optic', barrel: 'Barrel', under: 'Underbarrel', rear: 'Rear grip', stock: 'Stock' };
function allowedAtt(w) {
  if (w.kind !== 'gun') return {};
  const all = k => ATT[k].map(a => a.id);
  switch (w.cls) {
    case 'pistol': return { optic: ['iron', 'reddot', 'holo'], barrel: ['std', 'long', 'supp', 'comp'], under: ['none', 'laser'], rear: all('rear') };
    case 'smg': return { optic: ['iron', 'reddot', 'holo', 'acog'], barrel: all('barrel'), under: all('under'), rear: all('rear'), stock: all('stock') };
    case 'shotgun': return { optic: ['iron', 'reddot', 'holo'], barrel: ['std', 'long', 'short', 'supp'], under: all('under'), rear: all('rear'), stock: w.id === 'sawed' ? undefined : all('stock') };
    case 'sniper': return { optic: all('optic'), barrel: all('barrel'), under: all('under'), rear: all('rear'), stock: all('stock') };
    default: return { optic: ['iron', 'reddot', 'holo', 'acog', 'scope4'], barrel: all('barrel'), under: all('under'), rear: all('rear'), stock: all('stock') };
  }
}
function attOf(cat, id) { return ATT[cat].find(a => a.id === id) || ATT[cat][0]; }

const CAMOS = [
  { id: 'stock', name: 'Factory' }, { id: 'carbon', name: 'Midnight Carbon' }, { id: 'tiger', name: 'Neon Tiger' }, { id: 'blood', name: 'Blood Moon' },
  { id: 'gold', name: 'Gold Rush' }, { id: 'chrome', name: 'Chrome' }, { id: 'hex', name: 'Salem Hex' }, { id: 'glitch', name: 'Glitch' },
  { id: 'scales', name: 'Reptile Scale' }, { id: 'damascus', name: 'Damascus' },
];
const RET_COLORS = ['#ff1f3d', '#3dff6a', '#05d9e8', '#ff2a6d', '#f3e600', '#ffffff'];
const RET_SHAPES = [{ id: 'dot', name: 'Dot' }, { id: 'circle', name: 'Circle dot' }, { id: 'chevron', name: 'Chevron' }, { id: 'cross', name: 'Cross' }, { id: 'diamond', name: 'Diamond' }];

function defaultCfg(w) {
  return { optic: w.optic || 'iron', barrel: 'std', under: 'none', rear: 'std', stock: 'std', camo: 'stock', retCol: '#ff1f3d', retShape: 'dot' };
}
// final stats including attachments
function statsOf(w, cfg) {
  const s = { dmg: w.dmg, dmgMin: w.dmgMin || w.dmg, r1: w.r1 || 2, r2: w.r2 || 3, rpm: w.rpm || 60, hip: w.hip, ads: w.ads, recV: w.recV, recH: w.recH, adsT: w.adsT, mob: w.mob, zoom: 1.15, sup: 0, overlay: 0, ret: 0 };
  if (w.kind !== 'gun' || !cfg) return s;
  const al = allowedAtt(w);
  if (MODELS[w.id] && MODELS[w.id].scene && MODELS[w.id].builtinDot && cfg.optic === 'iron') { s.zoom = 1.25; s.ret = 1; }
  for (const cat of ['optic', 'barrel', 'under', 'rear', 'stock']) {
    if (!al[cat]) continue; const a = attOf(cat, cfg[cat]);
    if (a.range) { s.r1 *= a.range; s.r2 *= a.range; }
    if (a.recV) s.recV *= a.recV; if (a.recH) s.recH *= a.recH; if (a.hip) s.hip *= a.hip;
    if (a.mob) s.mob += a.mob; if (a.adsT) s.adsT = Math.max(.08, s.adsT + a.adsT);
    if (a.sup) s.sup = 1; if (a.zoom) s.zoom = a.zoom; if (a.overlay) s.overlay = 1; if (a.ret) s.ret = 1;
  }
  return s;
}

/* ---------------- camo textures ---------------- */
const camoCache = {};
function camoTex(id) {
  if (camoCache[id]) return camoCache[id];
  const [c, x] = cvs(256, 256); let emis = null;
  if (id === 'carbon') { x.fillStyle = '#0c0d10'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 256; i += 8) for (let j = 0; j < 256; j += 8) { x.fillStyle = ((i + j) / 8) % 2 ? '#1c1e24' : '#131418'; x.fillRect(i, j, 8, 4); x.fillRect(i + 4, j + 4, 4, 4); } }
  if (id === 'tiger') { x.fillStyle = '#0a0410'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#ff2a6d'; for (let i = 0; i < 14; i++) { x.beginPath(); const y = rand(0, 256); x.moveTo(0, y); for (let k = 0; k <= 256; k += 32) x.lineTo(k, y + Math.sin(k * .05 + i) * 14 + rand(-6, 6)); x.lineTo(256, y + 10); for (let k = 256; k >= 0; k -= 32) x.lineTo(k, y + 8 + Math.sin(k * .05 + i) * 10); x.fill(); } }
  if (id === 'blood') { x.fillStyle = '#1a0004'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${rint(140, 255)},0,${rint(10, 40)},${rand(.3, .8)})`; x.beginPath(); x.arc(rand(0, 256), rand(0, 256), rand(4, 30), 0, TAU); x.fill(); } x.strokeStyle = '#000'; x.lineWidth = 3; for (let i = 0; i < 10; i++) { x.beginPath(); x.arc(rand(0, 256), rand(0, 256), rand(10, 30), .5, 4); x.stroke(); } }
  if (id === 'hex') { x.fillStyle = '#16052a'; x.fillRect(0, 0, 256, 256); const [ce, xe] = cvs(256, 256); xe.fillStyle = '#000'; xe.fillRect(0, 0, 256, 256); xe.strokeStyle = '#b04dff'; xe.lineWidth = 2; xe.shadowColor = '#b04dff'; xe.shadowBlur = 6; for (let i = 0; i < 26; i++) { xe.save(); xe.translate(rand(0, 256), rand(0, 256)); xe.rotate(rand(0, TAU)); xe.beginPath(); xe.moveTo(-8, 0); xe.lineTo(8, 0); xe.moveTo(0, -10); xe.lineTo(0, 10); xe.moveTo(-6, -6); xe.lineTo(6, 6); xe.stroke(); xe.restore(); } x.drawImage(ce, 0, 0); emis = texFrom(ce, true, true); }
  if (id === 'glitch') { x.fillStyle = '#05030a'; x.fillRect(0, 0, 256, 256); const [ce, xe] = cvs(256, 256); xe.fillStyle = '#000'; xe.fillRect(0, 0, 256, 256); for (let i = 0; i < 70; i++) { const col = pick(['#05d9e8', '#ff2a6d', '#f3e600']); const rx = rand(0, 256), ry = rand(0, 256), w = rand(6, 60), h = rand(2, 10); x.fillStyle = col; x.globalAlpha = .5; x.fillRect(rx, ry, w, h); x.globalAlpha = 1; xe.fillStyle = col; xe.globalAlpha = .6; xe.fillRect(rx, ry, w, h); xe.globalAlpha = 1; } emis = texFrom(ce, true, true); }
  if (id === 'scales') { x.fillStyle = '#0d2a12'; x.fillRect(0, 0, 256, 256); for (let j = 0; j < 20; j++) for (let i = 0; i < 20; i++) { const cx = i * 14 + (j % 2) * 7, cy = j * 12; const g = x.createRadialGradient(cx, cy, 1, cx, cy, 9); g.addColorStop(0, '#5cff7a'); g.addColorStop(.6, '#1d6a2a'); g.addColorStop(1, '#06180a'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 8, 0, Math.PI); x.fill(); } }
  if (id === 'damascus') { x.fillStyle = '#3b3e45'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 60; i++) { x.strokeStyle = i % 2 ? '#7a7f8a' : '#24262b'; x.lineWidth = 2; x.beginPath(); for (let k = 0; k <= 256; k += 8) x.lineTo(k, i * 5 + Math.sin(k * .06 + i * .4) * 8); x.stroke(); } }
  const t = (id === 'stock' || id === 'gold' || id === 'chrome') ? null : texFrom(c, true, true);
  camoCache[id] = { map: t, emis };
  return camoCache[id];
}
function applyCamo(mat, id, isWood) {
  if (!id || id === 'stock') return;
  if (id === 'gold') { mat.color.copy(lc(0xd4a43a)); mat.metalness = 1; mat.roughness = .22; return; }
  if (id === 'chrome') { mat.color.copy(lc(0xe8eaf0)); mat.metalness = 1; mat.roughness = .06; return; }
  const ct = camoTex(id); mat.map = ct.map; mat.color.setRGB(1, 1, 1); mat.metalness = .35; mat.roughness = .5;
  if (ct.emis) { mat.emissiveMap = ct.emis; mat.emissive = new T.Color(1, 1, 1); mat.emissiveIntensity = 1.4; }
  if (isWood && id !== 'scales') mat.metalness = .2;
}

/* ---------------- reticles ---------------- */
function drawReticle(x, cx, cy, s, color, shape) {
  x.save(); x.strokeStyle = color; x.fillStyle = color; x.shadowColor = color; x.shadowBlur = s * .6; x.lineWidth = Math.max(1.5, s * .12);
  if (shape === 'dot') { x.beginPath(); x.arc(cx, cy, s * .22, 0, TAU); x.fill(); }
  if (shape === 'circle') { x.beginPath(); x.arc(cx, cy, s * .16, 0, TAU); x.fill(); x.beginPath(); x.arc(cx, cy, s * 1.1, 0, TAU); x.stroke(); }
  if (shape === 'chevron') { x.beginPath(); x.moveTo(cx - s * .6, cy + s * .5); x.lineTo(cx, cy - s * .2); x.lineTo(cx + s * .6, cy + s * .5); x.stroke(); }
  if (shape === 'cross') { x.beginPath(); x.moveTo(cx - s, cy); x.lineTo(cx - s * .3, cy); x.moveTo(cx + s * .3, cy); x.lineTo(cx + s, cy); x.moveTo(cx, cy - s); x.lineTo(cx, cy - s * .3); x.moveTo(cx, cy + s * .3); x.lineTo(cx, cy + s); x.stroke(); x.beginPath(); x.arc(cx, cy, s * .1, 0, TAU); x.fill(); }
  if (shape === 'diamond') { x.beginPath(); x.moveTo(cx, cy - s * .6); x.lineTo(cx + s * .6, cy); x.lineTo(cx, cy + s * .6); x.lineTo(cx - s * .6, cy); x.closePath(); x.stroke(); x.beginPath(); x.arc(cx, cy, s * .1, 0, TAU); x.fill(); }
  x.restore();
}

/* ---------------- procedural weapon models ---------------- */
// gun space: origin near the trigger, barrel along -Z, up +Y, meters
function buildWeapon(w, cfg, forWorld) {
  cfg = cfg || defaultCfg(w);
  const g = new T.Group();
  const M = {
    body: new T.MeshStandardMaterial({ color: lc(0x1c1e23), metalness: .55, roughness: .42 }),
    metal: new T.MeshStandardMaterial({ color: lc(0x2b2e35), metalness: .92, roughness: .28 }),
    dark: new T.MeshStandardMaterial({ color: lc(0x0e0f12), metalness: .7, roughness: .4 }),
    poly: new T.MeshStandardMaterial({ color: lc(0x15161a), metalness: .1, roughness: .72 }),
    wood: new T.MeshStandardMaterial({ color: lc(0x6a3418), metalness: 0, roughness: .5 }),
    nickel: new T.MeshStandardMaterial({ color: lc(0xe2e3e8), metalness: 1, roughness: .12 }),
    brass: new T.MeshStandardMaterial({ color: lc(0xc9a24a), metalness: 1, roughness: .25 }),
    glass: new T.MeshStandardMaterial({ color: lc(0x081a2a), metalness: 1, roughness: .04, emissive: lc(0x0a3a55), emissiveIntensity: .6 }),
    neon: new T.MeshBasicMaterial({ color: lc(0x05d9e8), toneMapped: false }),
    neonM: new T.MeshBasicMaterial({ color: lc(0xff2a6d), toneMapped: false }),
    grip: new T.MeshStandardMaterial({ color: lc(0x141518), metalness: .1, roughness: .8 }),
    chrome: new T.MeshStandardMaterial({ color: lc(0xf0f2f8), metalness: 1, roughness: .05 }),
  };
  if (cfg.rear === 'stipple') M.grip.color.copy(lc(0x2b2b31)), M.grip.roughness = 1;
  if (cfg.rear === 'rubber') M.grip.color.copy(lc(0x4a0a18));
  if (cfg.rear === 'ergo') M.grip.color.copy(lc(0x0a3036));
  applyCamo(M.body, cfg.camo); applyCamo(M.wood, cfg.camo, true);
  if (cfg.camo && cfg.camo !== 'stock' && w.kind !== 'gun') { applyCamo(M.poly, cfg.camo); }
  const magG = new T.Group(), pumpG = new T.Group(), boltG = new T.Group(); g.add(magG, pumpG, boltG);
  let tgt = g, part = null;
  const add = (me) => { me.userData.part = part; tgt.add(me); return me; };
  const B = (w_, h, d, m, x, y, z, rx, ry, rz) => { const me = new T.Mesh(new T.BoxGeometry(w_, h, d), m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, rz || 0); return add(me); };
  const Cy = (rF, rB, len, m, x, y, z, seg) => { const me = new T.Mesh(new T.CylinderGeometry(rF, rB, len, seg || 12), m); me.rotation.x = -Math.PI / 2; me.position.set(x, y, z); return add(me); };
  const Cv = (r1, r2, len, m, x, y, z, seg) => { const me = new T.Mesh(new T.CylinderGeometry(r1, r2, len, seg || 10), m); me.position.set(x, y, z); return add(me); };
  const Cx = (r, len, m, x, y, z, seg) => { const me = new T.Mesh(new T.CylinderGeometry(r, r, len, seg || 18), m); me.rotation.z = Math.PI / 2; me.position.set(x, y, z); return add(me); };
  const S = (r, m, x, y, z, sx, sy, sz) => { const me = new T.Mesh(new T.SphereGeometry(r, 14, 10), m); me.position.set(x, y, z); me.scale.set(sx || 1, sy || 1, sz || 1); return add(me); };
  const curvedMag = (m, z0, y0, n, segH, curve, wid) => { tgt = magG; for (let i = 0; i < n; i++) B(wid || .03, segH, .062, m, 0, y0 - segH * .9 * i, z0 - curve * i * i * .5 - .004 * i, -(.06 + curve * 2.2 * i)); tgt = g; };
  const bipod = (z, y) => { Cv(.006, .006, .2, M.metal, .03, y - .1, z).rotation.z = .25; Cv(.006, .006, .2, M.metal, -.03, y - .1, z).rotation.z = -.25; };
  const meta = { top: .09, optZ: -.02, underZ: -.3, underY: .015, muzzleZ: -.7, boreY: .05, sightX: 0, grip: new T.Vector3(0, -.04, .07), sup: new T.Vector3(0, .0, -.32), frontZ: -.5, hasStock: true, irons: false };
  const m = w.model;
  // ---------------------------------------------------------------- families
  if (m === 'ar15' || m === 'm27') {
    const L = m === 'm27' ? 1.25 : 1;
    B(.05, .06, .2, M.body, 0, 0, -.02); B(.054, .05, .27, M.body, 0, .055, -.05);
    B(.032, .012, .25, M.metal, 0, .086, -.06);
    B(.062, .062, .3 * L, M.body, 0, .05, -.3 - .03 * L); B(.064, .006, .2, M.neon, 0, .025, -.32);
    for (let i = 0; i < 5; i++) B(.064, .01, .025, M.dark, 0, .05, -.22 - i * .05 * L);
    Cy(.012, .012, .28 * L, M.metal, 0, .05, -.48 - .14 * L); B(.016, .04, .02, M.metal, 0, .09, -.46 * L);
    if (m === 'm27') { tgt = magG; B(.034, .19, .066, M.poly, 0, -.1, -.06, -.1); tgt = g; } else curvedMag(M.poly, -.06, -.04, 4, .042, .006);
    B(.03, .1, .04, M.grip, 0, -.06, .07, .3); B(.006, .01, .07, M.metal, 0, -.035, .02);
    part = 'stock'; Cy(.017, .017, .16, M.metal, 0, .05, .16); B(.046, .075, .13, M.body, 0, .035, .27); B(.048, .02, .1, M.neonM, 0, .075, .27); part = null;
    tgt = boltG; B(.04, .01, .02, M.metal, 0, .082, .08); tgt = g;
    Object.assign(meta, { top: .092, optZ: -.04, underZ: -.34 * L, muzzleZ: -.62 - .28 * L, boreY: .05, frontZ: -.46 * L, sup: new T.Vector3(0, .01, -.34 * L) });
    if (m === 'm27') bipod(-.42, .02);
  }
  else if (m === 'ak' || m === 'rpk') {
    const L = m === 'rpk' ? 1.4 : 1;
    B(.05, .07, .3, M.metal, 0, .03, -.03); B(.046, .022, .28, M.body, 0, .072, -.03);
    B(.058, .052, .2, M.wood, 0, .035, -.29); B(.042, .026, .17, M.wood, 0, .082, -.29);
    Cy(.011, .011, .32 * L, M.metal, 0, .045, -.38 - .16 * L); B(.01, .05, .015, M.metal, 0, .08, -.36 - .3 * L); Cy(.017, .017, .05, M.metal, 0, .045, -.42 - .32 * L);
    B(.03, .02, .04, M.metal, 0, .078, -.17);
    if (m === 'rpk') { tgt = magG; const d = Cx(.085, .07, M.poly, 0, -.1, -.07); B(.03, .06, .05, M.poly, 0, -.02, -.07); tgt = g; bipod(-.62, .03); }
    else curvedMag(M.wood.map ? M.poly : lcMag(), -.05, -.03, 5, .036, .009);
    B(.03, .09, .036, M.grip, 0, -.05, .08, .35);
    part = 'stock'; B(.045, .08, .27, M.wood, 0, .005, .25, .12); B(.047, .09, .02, M.dark, 0, -.01, .385, .12); part = null;
    tgt = boltG; B(.015, .012, .03, M.metal, .03, .055, .05); tgt = g;
    Object.assign(meta, { top: .086, optZ: -.08, underZ: -.3, underY: .005, muzzleZ: -.45 - .32 * L, boreY: .045, frontZ: -.36 - .3 * L, sup: new T.Vector3(0, .01, -.3) });
  }
  else if (m === 'aug' || m === 'l86') {
    const L = m === 'l86' ? 1.5 : 1, bc = m === 'aug' ? lc(0x2d3b2a) : null;
    if (bc && (!cfg.camo || cfg.camo === 'stock')) M.body.color.copy(bc);
    B(.062, .1, .5, M.body, 0, .02, .05); B(.064, .04, .2, M.body, 0, .01, -.27);
    B(.032, .012, .26, M.metal, 0, .08, -.08); B(.014, .085, .17, M.poly, 0, -.05, -.13);
    B(.03, .1, .04, M.grip, 0, -.06, -.12, .2); B(.026, .09, .03, M.poly, 0, -.06, -.26);
    tgt = magG; B(.028, .13, .055, m === 'aug' ? M.poly : M.dark, 0, -.08, .07, -.12); tgt = g;
    Cy(.012, .012, .26 * L, M.metal, 0, .04, -.38 - .13 * L); B(.064, .006, .3, M.neon, 0, -.02, .05);
    part = 'stock'; B(.06, .11, .04, M.dark, 0, .02, .31); part = null;
    if (m === 'l86') bipod(-.5, .0);
    Object.assign(meta, { top: .086, optZ: -.06, underZ: -.25, underY: -.01, muzzleZ: -.38 - .26 * L, boreY: .04, grip: new T.Vector3(0, -.04, -.12), sup: new T.Vector3(0, -.02, -.3), frontZ: -.32, hasStock: false });
  }
  else if (m === 'fal') {
    B(.05, .07, .34, M.body, 0, .03, -.05); B(.044, .02, .3, M.metal, 0, .072, -.05);
    B(.056, .06, .22, M.wood, 0, .035, -.32); Cy(.012, .012, .34, M.metal, 0, .045, -.6); Cy(.016, .016, .06, M.dark, 0, .045, -.79);
    B(.012, .05, .015, M.metal, 0, .08, -.7);
    tgt = magG; B(.03, .12, .075, M.metal, 0, -.07, -.06); tgt = g;
    B(.03, .1, .04, M.grip, 0, -.06, .07, .3);
    part = 'stock'; B(.046, .088, .3, M.wood, 0, .008, .27, .1); part = null;
    tgt = boltG; B(.012, .012, .04, M.metal, -.03, .06, -.12); tgt = g;
    Object.assign(meta, { top: .084, optZ: -.08, underZ: -.32, underY: .005, muzzleZ: -.82, boreY: .045, frontZ: -.7, sup: new T.Vector3(0, .01, -.33) });
  }
  else if (m === 'mp5') {
    B(.05, .062, .3, M.body, 0, .04, -.02); Cy(.011, .011, .22, M.metal, 0, .082, -.18);
    B(.062, .056, .15, M.poly, 0, .028, -.24); for (let i = 0; i < 4; i++) B(.064, .006, .012, M.dark, 0, .03, -.19 - i * .03);
    Cy(.013, .013, .09, M.metal, 0, .04, -.35); Cv(.012, .012, .02, M.metal, 0, .09, .08);
    curvedMag(M.metal, -.07, -.02, 4, .035, .012, .024);
    B(.03, .09, .038, M.grip, 0, -.05, .07, .3);
    part = 'stock'; Cy(.005, .005, .2, M.metal, .02, .05, .2); Cy(.005, .005, .2, M.metal, -.02, .05, .2); B(.05, .07, .014, M.dark, 0, .04, .3); part = null;
    B(.052, .006, .1, M.neonM, 0, .072, .02);
    Object.assign(meta, { top: .1, optZ: -.02, underZ: -.24, underY: .0, muzzleZ: -.4, boreY: .04, frontZ: -.3, sup: new T.Vector3(0, .0, -.24) });
  }
  else if (m === 'vector') {
    B(.05, .13, .3, M.body, 0, .01, -.02); B(.05, .08, .13, M.body, 0, -.02, -.2, .5);
    B(.052, .008, .3, M.neon, 0, -.05, -.02);
    tgt = magG; B(.028, .16, .05, M.poly, 0, -.12, -.12, .08); tgt = g;
    Cy(.012, .012, .17, M.metal, 0, .0, -.3); B(.032, .012, .32, M.metal, 0, .082, -.04);
    B(.03, .1, .04, M.grip, 0, -.09, .06, .25);
    part = 'stock'; B(.03, .05, .18, M.poly, 0, .03, .22); B(.04, .08, .02, M.poly, 0, .02, .31); part = null;
    Object.assign(meta, { top: .088, optZ: -.04, underZ: -.2, underY: -.05, muzzleZ: -.39, boreY: .0, frontZ: -.17, grip: new T.Vector3(0, -.06, .06), sup: new T.Vector3(0, -.05, -.21) });
  }
  else if (m === 'ump') {
    B(.056, .08, .33, M.body, 0, .03, -.04); B(.058, .006, .25, M.neonM, 0, .0, -.06);
    tgt = magG; B(.03, .13, .05, M.poly, 0, -.08, -.07); tgt = g;
    Cy(.013, .013, .12, M.metal, 0, .045, -.27); B(.032, .012, .25, M.metal, 0, .076, -.04);
    B(.034, .1, .045, M.grip, 0, -.07, .07, .3);
    part = 'stock'; B(.012, .06, .22, M.poly, 0, .03, .22); B(.04, .014, .2, M.poly, 0, .06, .22); B(.045, .08, .02, M.poly, 0, .02, .32); part = null;
    Object.assign(meta, { top: .082, optZ: -.04, underZ: -.18, underY: -.01, muzzleZ: -.33, boreY: .045, frontZ: -.18, sup: new T.Vector3(0, -.01, -.19) });
  }
  else if (m === 'p90') {
    B(.06, .11, .46, M.body, 0, .01, .0); S(.05, M.body, 0, .01, -.2, 1.2, 1.1, 1);
    tgt = magG; const mg = B(.046, .03, .3, new T.MeshStandardMaterial({ color: lc(0xd9a040), transparent: true, opacity: .55, metalness: .2, roughness: .2 }), 0, .085, -.03); tgt = g;
    B(.03, .06, .08, M.grip, 0, -.07, -.06, .2); B(.06, .006, .4, M.neon, 0, -.03, .0);
    Cy(.012, .012, .09, M.metal, 0, .035, -.29);
    Object.assign(meta, { top: .1, optZ: -.04, underZ: -.18, underY: -.04, muzzleZ: -.33, boreY: .035, grip: new T.Vector3(0, -.05, -.06), sup: new T.Vector3(0, -.03, -.17), frontZ: -.2, hasStock: false });
  }
  else if (m === 'p1911' || m === 'pglock' || m === 'pmacro' || m === 'pauto') {
    const glock = m !== 'p1911', len = m === 'pmacro' ? .165 : .2;
    tgt = boltG; B(.028, .033, len, glock ? M.body : M.metal, 0, .04, -.05 - (.2 - len) / 2); B(.03, .004, len * .5, M.neon, 0, .058, -.03); tgt = g;
    B(.026, .022, .17, glock ? M.poly : M.body, 0, .014, -.04);
    B(.03, .1, .05, glock ? M.grip : M.wood, 0, -.045, .045, glock ? .3 : .22);
    B(.006, .016, .055, M.metal, 0, -.008, -.01);
    tgt = magG; B(.026, m === 'pauto' ? .2 : .03, .045, M.poly, 0, m === 'pauto' ? -.17 : -.1, m === 'pauto' ? .075 : .06, glock ? .3 : .22); tgt = g;
    if (!glock) B(.008, .02, .012, M.metal, 0, .058, .06);
    if (m === 'pauto') { B(.03, .02, .03, M.dark, 0, .04, -.17); B(.004, .006, .02, M.neonM, .016, .03, .03); }
    B(.004, .008, .006, M.metal, 0, .061, -.14); B(.02, .01, .008, M.metal, 0, .061, .035);
    Object.assign(meta, { top: .057, optZ: -.02, underZ: -.09, underY: -.002, muzzleZ: -.155 - (m === 'pauto' ? .03 : 0), boreY: .04, grip: new T.Vector3(0, -.04, .045), sup: new T.Vector3(0, -.05, .05), frontZ: -.14, hasStock: false, irons: true, ironY: .066 });
  }
  else if (m === 'prev') {
    B(.022, .05, .075, M.nickel, 0, .03, .0); Cy(.026, .026, .046, M.nickel, 0, .036, -.04, 6);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; B(.006, .006, .044, M.dark, Math.cos(a) * .024, .036 + Math.sin(a) * .024, -.04); }
    Cy(.01, .01, .17, M.nickel, 0, .046, -.15); B(.012, .018, .16, M.nickel, 0, .03, -.15); B(.008, .006, .17, M.nickel, 0, .059, -.14);
    B(.008, .02, .014, M.nickel, 0, .062, .04, -.4); B(.004, .012, .008, M.metal, 0, .064, -.22);
    B(.026, .095, .042, new T.MeshStandardMaterial({ color: lc(0xe8e0d0), metalness: .1, roughness: .3 }), 0, -.035, .05, .45);
    B(.006, .016, .045, M.nickel, 0, -.004, .005);
    Object.assign(meta, { top: .062, optZ: -.08, underZ: -.15, underY: .015, muzzleZ: -.24, boreY: .046, grip: new T.Vector3(0, -.03, .05), sup: new T.Vector3(0, -.05, .055), frontZ: -.22, hasStock: false, irons: true, ironY: .07 });
  }
  else if (m === 'svd' || m === 'm2010' || m === 'm99') {
    if (m === 'svd') {
      B(.045, .06, .25, M.body, 0, .03, -.05); B(.055, .05, .24, M.wood, 0, .03, -.3); Cy(.011, .011, .44, M.metal, 0, .04, -.62); Cy(.015, .015, .06, M.dark, 0, .04, -.86);
      tgt = magG; B(.03, .1, .065, M.poly, 0, -.05, -.05, -.1); tgt = g;
      B(.03, .09, .036, M.grip, 0, -.045, .07, .3);
      part = 'stock'; B(.04, .03, .3, M.wood, 0, .05, .22); B(.04, .03, .25, M.wood, 0, -.035, .22, -.25); B(.045, .13, .04, M.wood, 0, .005, .36); part = null;
      Object.assign(meta, { top: .07, optZ: -.08, underZ: -.3, muzzleZ: -.9, boreY: .04, frontZ: -.8 });
    } else if (m === 'm2010') {
      B(.05, .07, .4, M.body, 0, .02, -.04); Cy(.014, .014, .44, M.metal, 0, .04, -.45); Cy(.018, .018, .06, M.dark, 0, .04, -.69);
      tgt = boltG; B(.008, .008, .06, M.metal, .04, .06, .06, 0, 0, -.6); S(.012, M.metal, .065, .045, .06); tgt = g;
      tgt = magG; B(.03, .06, .07, M.poly, 0, -.04, -.04); tgt = g;
      B(.03, .09, .04, M.grip, 0, -.05, .08, .3); B(.052, .006, .3, M.neon, 0, .0, -.12);
      part = 'stock'; B(.045, .09, .28, M.body, 0, .005, .3); B(.04, .025, .14, M.dark, 0, .06, .3); part = null;
      Object.assign(meta, { top: .07, optZ: -.06, underZ: -.3, muzzleZ: -.72, boreY: .04, frontZ: -.6 });
    } else {
      B(.08, .1, .36, M.body, 0, .03, -.02); Cy(.021, .021, .52, M.metal, 0, .05, -.46); B(.065, .05, .1, M.dark, 0, .05, -.76);
      for (let i = 0; i < 3; i++) B(.07, .01, .012, M.metal, 0, .05, -.73 - i * .025);
      B(.035, .1, .045, M.grip, 0, -.06, .1, .3); bipod(-.55, .02); B(.082, .006, .3, M.neonM, 0, -.01, -.02);
      part = 'stock'; B(.06, .1, .28, M.body, 0, .02, .3); part = null;
      Object.assign(meta, { top: .082, optZ: -.04, underZ: -.3, muzzleZ: -.81, boreY: .05, frontZ: -.7 });
    }
  }
  else if (m === 'dbl' || m === 'sawed') {
    const L = m === 'sawed' ? .3 : .62;
    Cy(.016, .016, L, M.metal, .017, .045, -.08 - L / 2); Cy(.016, .016, L, M.metal, -.017, .045, -.08 - L / 2); B(.01, .008, L, M.metal, 0, .064, -.08 - L / 2);
    B(.05, .06, .13, M.metal, 0, .03, .0); B(.05, .035, L * .45, M.wood, 0, .018, -.08 - L * .25);
    if (m === 'sawed') { B(.04, .1, .07, M.wood, 0, -.045, .1, .5); } else { part = 'stock'; B(.045, .09, .36, M.wood, 0, -.01, .25, .15); part = null; }
    B(.006, .02, .05, M.brass, 0, -.01, .02);
    Object.assign(meta, { top: .07, optZ: .0, underZ: -.08 - L * .3, underY: .0, muzzleZ: -.08 - L, boreY: .045, frontZ: -.08 - L, hasStock: m !== 'sawed', irons: true, ironY: .072, grip: new T.Vector3(0, -.03, .08) });
  }
  else if (m === 'pump' || m === 'semi') {
    B(.05, .07, .22, M.body, 0, .03, -.02); Cy(.015, .015, .48, M.metal, 0, .06, -.36); Cy(.013, .013, .38, M.metal, 0, .025, -.32);
    tgt = pumpG; Cy(.027, .027, .16, m === 'pump' ? M.poly : M.body, 0, .025, -.27); for (let i = 0; i < 4; i++) Cy(.029, .029, .008, M.dark, 0, .025, -.21 - i * .035); tgt = g;
    B(.052, .006, .16, M.neonM, 0, .055, -.02);
    if (m === 'semi') B(.03, .1, .04, M.grip, 0, -.06, .07, .3);
    part = 'stock'; if (m === 'pump') B(.045, .09, .32, M.poly, 0, -.005, .24, .12); else { Cy(.016, .016, .16, M.metal, 0, .04, .16); B(.045, .08, .14, M.body, 0, .025, .27); } part = null;
    Object.assign(meta, { top: .068, optZ: -.02, underZ: -.27, underY: -.0, muzzleZ: -.6, boreY: .06, frontZ: -.58, sup: new T.Vector3(0, .0, -.27), irons: true, ironY: .082 });
  }
  else if (m === 'aa12') {
    B(.07, .11, .5, M.body, 0, .04, -.05); Cy(.02, .02, .2, M.metal, 0, .06, -.38);
    B(.01, .05, .01, M.metal, 0, .12, .05); B(.01, .05, .01, M.metal, 0, .12, -.2); B(.012, .012, .27, M.metal, 0, .145, -.07);
    tgt = magG; Cx(.085, .065, M.poly, 0, -.07, -.13); tgt = g;
    B(.035, .1, .045, M.grip, 0, -.06, .08, .25); B(.072, .006, .4, M.neon, 0, .0, -.05);
    Object.assign(meta, { top: .1, optZ: .0, underZ: -.28, underY: -.02, muzzleZ: -.48, boreY: .06, frontZ: -.4, hasStock: false });
  }
  else if (m === 'bar') {
    B(.05, .08, .34, M.metal, 0, .03, -.04); B(.05, .05, .22, M.wood, 0, .02, -.3); Cy(.012, .012, .4, M.metal, 0, .045, -.6); Cy(.016, .016, .05, M.metal, 0, .045, -.82);
    tgt = magG; B(.03, .1, .08, M.metal, 0, -.06, -.05); tgt = g;
    B(.03, .09, .04, M.grip, 0, -.05, .09, .35); bipod(-.62, .03);
    part = 'stock'; B(.045, .09, .32, M.wood, 0, .0, .28, .1); part = null;
    Object.assign(meta, { top: .074, optZ: -.08, underZ: -.3, underY: -.005, muzzleZ: -.85, boreY: .045, frontZ: -.78, irons: true, ironY: .09 });
  }
  else if (m === 'bren') {
    B(.05, .08, .42, M.metal, 0, .03, -.05); B(.05, .05, .16, M.body, 0, .02, -.32); Cy(.013, .013, .44, M.metal, 0, .045, -.55); Cy(.024, .013, .07, M.metal, 0, .045, -.8);
    tgt = magG; for (let i = 0; i < 5; i++) B(.03, .04, .075, M.metal, 0, .1 + i * .034, -.07 - i * i * .006, .08 + i * .06); tgt = g;
    B(.012, .06, .012, M.metal, 0, .11, -.35); B(.03, .1, .04, M.grip, 0, -.06, .07, .3); bipod(-.55, .02);
    part = 'stock'; B(.045, .09, .3, M.body, 0, .0, .28, .1); part = null;
    B(.052, .006, .3, M.neon, 0, .0, -.06);
    Object.assign(meta, { top: .074, optZ: .02, underZ: -.32, underY: -.0, muzzleZ: -.84, boreY: .045, sightX: -.055, frontZ: -.7 });
  }
  // --------------------------------------------------------- melee + specials
  else if (m === 'katana' || m === 'nodachi') {
    const L = m === 'nodachi' ? 1.05 : .74, edge = m === 'nodachi' ? M.neonM : M.neon;
    const sh = new T.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(L * .5, .012, L, .03); sh.lineTo(L - .05, .0); sh.quadraticCurveTo(L * .5, -.018, 0, -.03); sh.lineTo(0, 0);
    const bg = new T.ExtrudeGeometry(sh, { depth: .006, bevelEnabled: false }); bg.translate(0, 0, -.003);
    const bl = new T.Mesh(bg, M.chrome); bl.rotation.y = Math.PI / 2; bl.position.set(0, 0, -.1); add(bl);
    const eg = new T.Mesh(new T.BoxGeometry(.0075, .005, L * .96), edge); eg.position.set(0, -.026 + .01, -.1 - L * .48); eg.rotation.x = -.03; add(eg);
    Cy(.045, .045, .012, M.brass, 0, 0, -.09, 16); Cy(.017, .017, m === 'nodachi' ? .34 : .25, new T.MeshStandardMaterial({ color: lc(0x111018), roughness: .9 }), 0, 0, .04);
    for (let i = 0; i < 6; i++) B(.036, .006, .01, M.neonM, 0, 0, -.06 + i * .035, 0, 0, .7);
    Object.assign(meta, { tip: -.1 - L, grip: new T.Vector3(0, 0, .04) });
  }
  else if (m === 'bat') {
    Cy(.04, .018, .86, M.wood, 0, 0, -.33, 14); Cy(.022, .022, .02, M.wood, 0, 0, .1);
    const pts = []; for (let i = 0; i <= 140; i++) { const t = i / 140, a = t * TAU * 6, z = -.12 - t * .62, r = .028 + .014 * t + .006; pts.push(new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, z)); }
    add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 220, .0035, 4), M.metal));
    for (let i = 0; i < 18; i++) { const t = i / 18, a = t * TAU * 6 + .3, z = -.12 - t * .62, r = .03 + .014 * t + .006; const b = B(.003, .003, .03, M.metal, Math.cos(a) * r, Math.sin(a) * r, z); b.rotation.set(rand(-1, 1), rand(-1, 1), 0); }
    Object.assign(meta, { tip: -.76 });
  }
  else if (m === 'hockey') {
    B(.03, .022, 1.15, M.body.map ? M.body : new T.MeshStandardMaterial({ color: lc(0x101114), roughness: .5 }), 0, 0, -.38); B(.032, .024, .3, M.neonM, 0, 0, -.1);
    const bl = B(.012, .075, .27, new T.MeshStandardMaterial({ color: lc(0xf0f0f0), roughness: .7 }), .1, -.03, -.98, 0, .9, 0); B(.034, .03, .05, M.dark, 0, 0, .2);
    Object.assign(meta, { tip: -1.0 });
  }
  else if (m === 'knife' || m === 'karambit') {
    if (m === 'knife') {
      B(.022, .03, .13, M.poly, 0, 0, .045); B(.024, .034, .012, M.brass, 0, 0, -.025); B(.024, .032, .012, M.brass, 0, 0, .115);
      const sh = new T.Shape(); sh.moveTo(0, -.012); sh.lineTo(.2, -.014); sh.quadraticCurveTo(.26, -.008, .27, .012); sh.lineTo(.2, .008); sh.lineTo(.17, .02); sh.lineTo(0, .018); sh.lineTo(0, -.012);
      const bg = new T.ExtrudeGeometry(sh, { depth: .004, bevelEnabled: true, bevelThickness: .0015, bevelSize: .002, bevelSegments: 1 }); bg.translate(0, 0, -.002);
      const bl = new T.Mesh(bg, M.chrome); bl.rotation.y = Math.PI / 2; bl.position.set(0, 0, -.03); add(bl);
      Object.assign(meta, { tip: -.3 });
    } else {
      const sh = new T.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(.06, .02, .1, -.05); sh.quadraticCurveTo(.06, -.005, 0, -.015); sh.lineTo(0, 0);
      const bg = new T.ExtrudeGeometry(sh, { depth: .004, bevelEnabled: false }); const bl = new T.Mesh(bg, M.chrome); bl.rotation.y = Math.PI / 2; bl.position.set(0, .01, -.04); add(bl);
      B(.02, .024, .1, M.poly, 0, 0, .02); const ring = new T.Mesh(new T.TorusGeometry(.022, .006, 6, 16), M.metal); ring.position.set(0, 0, .09); ring.rotation.y = Math.PI / 2; add(ring);
      B(.022, .004, .08, M.neonM, 0, .013, .02);
      Object.assign(meta, { tip: -.14 });
    }
  }
  else if (m === 'stars') {
    const sh = new T.Shape(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? .016 : .055; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const hole = new T.Path(); hole.absarc(0, 0, .008, 0, TAU, true); sh.holes.push(hole);
    const sg = new T.ExtrudeGeometry(sh, { depth: .003, bevelEnabled: false });
    for (let k = 0; k < 3; k++) { const s = new T.Mesh(sg, M.chrome); s.position.set(-.03 + k * .03, .0, -.02 - k * .01); s.rotation.set(-1.2, k * .3, 0); add(s); }
    Object.assign(meta, { tip: -.05, starGeo: sg });
  }
  else if (m === 'saw') {
    const bodyM = (cfg.camo && cfg.camo !== 'stock') ? M.body : new T.MeshStandardMaterial({ color: lc(0xff6a00), metalness: .3, roughness: .45 });
    B(.12, .15, .3, bodyM, 0, 0, .05); B(.122, .04, .2, M.dark, 0, -.06, .05);
    for (let i = 0; i < 5; i++) B(.124, .006, .14, M.dark, 0, .02 + i * .012, .1);
    const h = new T.Mesh(new T.TorusGeometry(.07, .012, 6, 14, Math.PI), M.poly); h.position.set(0, .07, .02); h.rotation.y = Math.PI / 2; add(h);
    B(.014, .075, .6, M.metal, 0, -.02, -.4);
    const [cc, cx] = cvs(64, 8); cx.fillStyle = '#111'; cx.fillRect(0, 0, 64, 8); for (let i = 0; i < 64; i += 8) { cx.fillStyle = '#ff2a6d'; cx.fillRect(i, 0, 4, 8); }
    const ct = texFrom(cc, true, true); ct.repeat.set(6, 1);
    meta.chainMat = new T.MeshBasicMaterial({ map: ct, toneMapped: false });
    B(.016, .085, .62, meta.chainMat, 0, -.02, -.4);
    Object.assign(meta, { tip: -.7, muzzleZ: -.7, boreY: -.02 });
  }
  else if (m === 'blaster') {
    const glow = new T.MeshBasicMaterial({ color: lc(0x5dff7a), toneMapped: false });
    S(.06, M.body.map ? M.body : M.chrome, 0, .03, .0, 1, .8, 1.4); Cy(.018, .03, .2, M.chrome, 0, .03, -.15, 16);
    for (let i = 0; i < 3; i++) { const r = new T.Mesh(new T.TorusGeometry(.03 - i * .004, .006, 8, 20), glow); r.position.set(0, .03, -.1 - i * .05); add(r); }
    S(.016, glow, 0, .03, -.27); B(.004, .05, .08, M.chrome, 0, .09, .02, -.3); B(.08, .004, .06, M.chrome, 0, .02, .04);
    B(.03, .1, .04, M.grip, 0, -.05, .05, .35); S(.02, glow, 0, .08, .05);
    Object.assign(meta, { top: .1, muzzleZ: -.28, boreY: .03, irons: true, ironY: .1, hasStock: false, grip: new T.Vector3(0, -.03, .05), sup: new T.Vector3(0, -.05, .06) });
  }
  // -------------------------------------------------------------- attachments
  if (MODELS[w.id] && !MODELS[w.id].scene) loadModel(w.id);
  const glb = MODELS[w.id] && MODELS[w.id].scene ? MODELS[w.id] : null;
  if (glb) {
    // AI-generated model: hide the procedural body, place the mesh by its measured anchor points
    g.traverse(o => { if (o.isMesh) o.visible = false; });
    const A = glb.anchors, k = glb.len / glb.nativeLen, m = glb.scene.clone(true);
    if (glb.q) m.quaternion.premultiply(new T.Quaternion(glb.q[0], glb.q[1], glb.q[2], glb.q[3]));
    const mid = new T.Group(); mid.add(m); if (glb.off) mid.position.set(glb.off[0], glb.off[1], glb.off[2]);
    m.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.envMapIntensity = .55; o.material.side = T.FrontSide; o.material.color.multiplyScalar(glb.tint || .7); o.material.roughness = Math.min(1, (o.material.roughness || 1) * 1.15);
      if (glb.glow && o.material.map) { o.material.emissiveMap = o.material.map; o.material.emissive = new T.Color(glb.glow, glb.glow, glb.glow); }
      applyCamo(o.material, cfg.camo); o.frustumCulled = !!forWorld; } });
    const holder = new T.Group(); holder.add(mid); holder.scale.setScalar(k);
    const gp = meta.grip.clone(); holder.position.set(gp.x - k * A.grip[0], gp.y - k * A.grip[1], gp.z - k * A.grip[2]); g.add(holder);
    const at = a => new T.Vector3(holder.position.x + k * a[0], holder.position.y + k * a[1], holder.position.z + k * a[2]);
    const mz = at(A.muzzle), sp = at(A.sup), si = at(A.sight), rl = at(A.rail);
    Object.assign(meta, { muzzleZ: mz.z, boreY: mz.y, sup: sp, top: rl.y, optZ: rl.z, underZ: sp.z - .02, underY: sp.y - .015, frontZ: mz.z + .05, hasStock: false, irons: true, ironY: si.y, sightZ: si.z, glb: 1 });
  }
  part = 'att';
  let sightY = meta.top + .016;
  const al = allowedAtt(w);
  const sx = meta.sightX || 0;
  if (w.kind === 'gun') {
    const opt = al.optic ? cfg.optic : 'iron';
    const oz = meta.optZ, ty = meta.top;
    if (opt === 'iron') {
      if (meta.irons) sightY = meta.ironY;
      else { B(.022, .02, .012, M.metal, sx, ty + .01, oz + .1); B(.006, .024, .008, M.metal, sx, ty + .012, Math.max(meta.frontZ, oz - .32)); sightY = ty + .018; }
    } else if (opt === 'reddot') {
      B(.03, .034, .045, M.dark, sx, ty + .019, oz); B(.024, .024, .004, M.glass, sx, ty + .026, oz - .02); sightY = ty + .026;
      B(.032, .004, .03, M.neonM, sx, ty + .037, oz);
    } else if (opt === 'holo') {
      B(.036, .012, .075, M.dark, sx, ty + .006, oz); B(.005, .042, .05, M.dark, sx + .018, ty + .03, oz - .01); B(.005, .042, .05, M.dark, sx - .018, ty + .03, oz - .01);
      B(.041, .006, .05, M.dark, sx, ty + .052, oz - .01); B(.031, .03, .002, M.glass, sx, ty + .033, oz - .03); sightY = ty + .032;
    } else if (opt === 'acog') {
      B(.034, .02, .09, M.dark, sx, ty + .01, oz); Cy(.022, .017, .15, M.dark, sx, ty + .042, oz); sightY = ty + .042;
      B(.006, .01, .01, M.neon, sx, ty + .066, oz + .03);
    } else {
      const L = opt === 'scope4' ? .18 : opt === 'scope8' ? .26 : .32;
      B(.02, .032, .012, M.dark, sx, ty + .016, oz + L * .28); B(.02, .032, .012, M.dark, sx, ty + .016, oz - L * .28);
      Cy(.017, .017, L, M.dark, sx, ty + .05, oz); Cy(.03, .017, .08, M.dark, sx, ty + .05, oz - L / 2 - .035); Cy(.017, .023, .06, M.dark, sx, ty + .05, oz + L / 2 + .025);
      Cv(.008, .008, .03, M.metal, sx, ty + .075, oz); Cx(.008, .025, M.metal, sx + .022, ty + .05, oz);
      const lens = new T.Mesh(new T.CircleGeometry(.028, 20), M.glass); lens.position.set(sx, ty + .05, oz - L / 2 - .076); lens.rotation.y = Math.PI; add(lens);
      B(.036, .004, L * .6, M.neon, sx, ty + .068, oz);
      sightY = ty + .05;
    }
    // barrel
    const bz = meta.muzzleZ, by = meta.boreY, pistolish = w.cls === 'pistol';
    const br = al.barrel ? cfg.barrel : 'std';
    if (br === 'long') { Cy(.011, .011, .12, M.metal, 0, by, bz - .06); meta.muzzleZ -= .12; }
    if (br === 'short') { meta.muzzleZ += .02; B(.03, .028, .03, M.dark, 0, by, bz - .015); }
    if (br === 'supp') { const r = pistolish ? .016 : .022, L2 = pistolish ? .13 : .19; Cy(r, r, L2, M.dark, 0, by, bz - L2 / 2); B(r * 2.05, .004, L2 * .7, M.neonM, 0, by + r, bz - L2 / 2); meta.muzzleZ -= L2; }
    if (br === 'comp') { B(.03, .028, .055, M.metal, 0, by, bz - .027); for (let i = 0; i < 3; i++) B(.031, .006, .006, M.neon, 0, by + .014, bz - .012 - i * .014); meta.muzzleZ -= .055; }
    if (br === 'brake') { B(.044, .026, .06, M.metal, 0, by, bz - .03); B(.046, .008, .03, M.dark, 0, by, bz - .03); meta.muzzleZ -= .06; }
    // underbarrel
    const ub = al.under ? cfg.under : 'none', uz = meta.underZ, uy = meta.underY;
    if (ub === 'vgrip') { Cv(.014, .017, .09, M.poly, 0, uy - .06, uz); meta.sup = new T.Vector3(0, uy - .07, uz); }
    if (ub === 'agrip') { B(.026, .045, .07, M.poly, 0, uy - .03, uz, -.7); meta.sup = new T.Vector3(0, uy - .04, uz); }
    if (ub === 'stop') { B(.022, .025, .03, M.poly, 0, uy - .02, uz - .04); }
    if (ub === 'laser') {
      B(.026, .026, .065, M.dark, 0, uy - .018, uz - .03); B(.008, .008, .004, new T.MeshBasicMaterial({ color: 0xff2030, toneMapped: false }), 0, uy - .018, uz - .064);
      const beam = new T.Mesh(new T.CylinderGeometry(.0015, .0015, 30, 4, 1, true), new T.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      beam.rotation.x = -Math.PI / 2; beam.position.set(0, uy - .018, uz - .064 - 15); beam.userData.beam = 1; add(beam);
    }
    // stock
    if (al.stock && meta.hasStock) {
      const st = cfg.stock; const stockMeshes = []; g.traverse(o => { if (o.userData.part === 'stock') stockMeshes.push(o); });
      if (st === 'none') { stockMeshes.forEach(o => o.visible = false); B(.024, .024, .02, M.dark, 0, .04, .15); }
      if (st === 'heavy') stockMeshes.forEach(o => o.scale.set(1.25, 1.15, 1.05));
      if (st === 'light') { stockMeshes.forEach(o => o.visible = false); part = 'stock'; B(.012, .012, .24, M.metal, 0, .06, .26); B(.012, .012, .26, M.metal, 0, -.0, .25, -.15); B(.03, .08, .02, M.poly, 0, .025, .37); part = null; }
    }
  }
  part = null;
  const muzzle = new T.Object3D(); muzzle.position.set(0, meta.boreY, meta.muzzleZ !== undefined ? meta.muzzleZ : (meta.tip || -.3)); g.add(muzzle);
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = !forWorld ? false : true; } });
  return { g, M, meta, muzzle, sightY, sightX: sx, magG, pumpG, boltG, magHome: magG.position.clone() };
}
/* AI-generated meshes (Tripo), loaded before the world is built */
const MODELS = {
  // Tripo-generated meshes. q/off align the raw mesh (barrel along -Z, up +Y, y=0 at the bottom); anchors are in that frame.
  preacher: {"url":"assets/preacher.glb","q":[-0.04119,-0.7012,0.02045,0.71148],"off":[-0.0162,-0.03,0.0292],"nativeLen":1.0189,"len":0.3,"anchors":{"grip":[0,0.2382,0.3712],"sup":[0,0.1557,0.4125],"sight":[0,0.575,0.165],"rail":[0,0.5654,-0.1375],"muzzle":[0,0.4953,-0.5018]},"tint":0.85},
  vexor: {"url":"assets/vexor.glb","q":[-0.03822,-0.70636,0.03519,0.70594],"off":[-0.0019,0.0017,0.0318],"nativeLen":0.9904,"len":0.64,"anchors":{"grip":[0,0.289,0.1791],"sup":[0,0.27,-0.2238],"sight":[0,0.4569,-0.1399],"rail":[0,0.4401,0.0448],"muzzle":[0,0.336,-0.4924]},"tint":0.7},
  kalash: {"url":"assets/kalash.glb","q":[-0.00069,0.89088,-0.01121,0.45411],"off":[-0.008,0.0007,0.0152],"nativeLen":1.1833,"len":0.88,"anchors":{"grip":[0,0.2494,0.2651],"sup":[0,0.2859,-0.1546],"sight":[0,0.3742,-0.0442],"rail":[0,0.3787,0.1325],"muzzle":[0,0.3025,-0.5909]},"tint":0.7},
  longshot: {"url":"assets/longshot.glb","q":[0.01507,0.99986,-0.00736,-0.00096],"off":[-0.0109,0.0023,0.0044],"nativeLen":0.9827,"len":1.18,"anchors":{"grip":[0,0.1846,0.2452],"sup":[0,0.2141,-0.1177],"sight":[0,0.371,0.1079],"rail":[0,0.3269,0.1079],"muzzle":[0,0.2415,-0.4905]},"tint":0.7},
  riot: {"url":"assets/riot.glb","q":[-0.16882,0.68778,-0.18987,0.68],"off":[-0.009,-0.182,0.1668],"nativeLen":1.0925,"len":0.99,"anchors":{"grip":[0,0.0849,0.2753],"sup":[0,0.09,-0.1224],"sight":[0,0.2205,0.1478],"rail":[0,0.1868,0.102],"muzzle":[0,0.1175,-0.5455]},"tint":0.7},
  bren: {"url":"assets/bren.glb","q":[-0.04457,-0.70795,0.05078,0.70302],"off":[0,0.0382,0.0421],"nativeLen":0.9914,"len":1.1,"anchors":{"grip":[0,0.2701,0.287],"sup":[0,0.3305,-0.1208],"sight":[0,0.4211,0.141],"rail":[0,0.4211,0.0805],"muzzle":[0,0.3637,-0.4934]},"tint":0.7},
  katana: {"url":"assets/katana.glb","q":[-0.63976,0.30145,0.66497,-0.24009],"off":[0.0306,0.4278,-0.3261],"nativeLen":1.3408,"len":1.0,"anchors":{"grip":[0,0.1011,0.5095],"sup":[0,0.1011,0.5765],"sight":[0,0.2101,0],"rail":[0,0.2101,0],"muzzle":[0,0.0829,-0.6704]},"glow":0.9,"tint":1},
  xeno: {"url":"assets/xeno.glb","q":[-0.02207,-0.70353,0.02694,0.70981],"off":[0.0034,-0.0203,0.0415],"nativeLen":0.9803,"len":0.32,"anchors":{"grip":[0,0.3342,0.2994],"sup":[0,0.2294,0.3294],"sight":[0,0.6411,0.1347],"rail":[0,0.6336,-0.0749],"muzzle":[0,0.5168,-0.4865]},"glow":0.8,"tint":1},
  barbedbat: {"url":"assets/barbedbat.glb","q":[-0.6284,-0.31436,-0.07323,0.70776],"off":[-0.2453,-0.0055,0.4073],"nativeLen":1.1045,"len":0.86,"anchors":{"grip":[0,0.1085,0.4197],"sup":[0,0.1085,0.4749],"sight":[0,0.1971,0],"rail":[0,0.1971,0],"muzzle":[0,0.1,-0.5522]},"tint":0.9},
  slasher: {"url":"assets/slasher.glb","q":[-0.26296,-0.50099,0.27338,0.7779],"off":[0.0801,-0.2368,0.3677],"nativeLen":1.4007,"len":0.4,"anchors":{"grip":[0,0.1425,0.5323],"sup":[0,0.1425,0.6023],"sight":[0,0.2727,0],"rail":[0,0.2727,0],"muzzle":[0,0.0997,-0.7003]},"tint":0.7},
  patriot15: {"url":"assets/patriot15.glb","q":[-0.03159,0.00375,0.00787,0.99946],"off":[0.0064,0.0126,0.0152],"nativeLen":0.9976,"len":0.84,"anchors":{"grip":[0,0.1583,0.0466],"sup":[0,0.2002,-0.2607],"sight":[0,0.3119,-0.1257],"rail":[0,0.2886,-0.0466],"muzzle":[0,0.216,-0.4982]},"builtinDot":1,"tint":0.7},
  polymer19: {"url":"assets/polymer19.glb","q":[-0.07683,-0.70269,0.07338,0.70352],"off":[-0.0032,-0.0609,0.1083],"nativeLen":1.0407,"len":0.19,"anchors":{"grip":[0,0.3966,0.3126],"sup":[0,0.3766,0.3326],"sight":[0,0.6254,0.1496],"rail":[0,0.6663,0.4098],"muzzle":[0,0.5643,-0.5204]},"tint":0.75},
  macro: {"url":"assets/macro.glb","q":[-0.10006,-0.7013,0.10388,0.69812],"off":[0.0018,0.0723,0.1092],"nativeLen":0.9961,"len":0.17,"anchors":{"grip":[0,0.5297,0.4211],"sup":[0,0.5097,0.4411],"sight":[0,0.839,-0.2304],"rail":[0,0.7978,0.33],"muzzle":[0,0.6063,-0.4981]},"tint":0.75},
  stutter18: {"url":"assets/stutter18.glb","q":[-0.00215,-0.70934,0.00456,0.70485],"off":[0.002,-0.0024,0.0054],"nativeLen":0.9781,"len":0.23,"anchors":{"grip":[0,0.3865,0.3196],"sup":[0,0.3665,0.3396],"sight":[0,0.6108,0.1161],"rail":[0,0.656,0.3851],"muzzle":[0,0.5654,-0.489]},"tint":0.75},
  kurz5: {"url":"assets/kurz5.glb","q":[-0.102,-0.69858,0.09998,0.70114],"off":[0.0002,0.0199,0.0874],"nativeLen":1.0242,"len":0.56,"anchors":{"grip":[0,0.3556,0.2473],"sup":[0,0.3123,-0.2212],"sight":[0,0.4574,0.1472],"rail":[0,0.4389,-0.1293],"muzzle":[0,0.3224,-0.5121]},"tint":0.75},
  unit45: {"url":"assets/unit45.glb","q":[-0.01815,0.70637,-0.01182,0.70751],"off":[0.0032,-0.0015,0.0154],"nativeLen":0.982,"len":0.62,"anchors":{"grip":[0,0.3316,0.2186],"sup":[0,0.3028,-0.1995],"sight":[0,0.4046,0.1289],"rail":[0,0.4084,-0.1117],"muzzle":[0,0.3333,-0.491]},"tint":0.75},
  battlefal: {"url":"assets/battlefal.glb","q":[-0.08648,-0.70161,0.0747,0.70334],"off":[-0.0041,0.0093,0.0581],"nativeLen":0.9934,"len":1.04,"anchors":{"grip":[0,0.2351,0.2337],"sup":[0,0.2368,-0.1891],"sight":[0,0.322,0.1428],"rail":[0,0.3086,-0.1254],"muzzle":[0,0.2485,-0.4967]},"tint":0.75},
  tundra: {"url":"assets/tundra.glb","q":[-0.03953,0.70536,-0.03944,0.70664],"off":[-0.0003,-0.0101,0.0161],"nativeLen":0.9914,"len":1.2,"anchors":{"grip":[0,0.1427,0.2664],"sup":[0,0.1447,-0.1301],"sight":[0,0.2938,0.0929],"rail":[0,0.2839,0.1475],"muzzle":[0,0.138,-0.4957]},"tint":0.75},
  anvil50: {"url":"assets/anvil50.glb","q":[-0.02827,-0.70789,0.03506,0.70488],"off":[-0.0005,0.0131,0.0204],"nativeLen":0.9857,"len":1.28,"anchors":{"grip":[0,0.1746,0.3142],"sup":[0,0.1638,-0.0801],"sight":[0,0.3319,0.1417],"rail":[0,0.3482,0.1959],"muzzle":[0,0.2508,-0.4928]},"tint":0.75},
  twin: {"url":"assets/twin.glb","q":[-0.15809,-0.68834,0.13832,0.69431],"off":[-0.0086,-0.1779,0.1224],"nativeLen":1.0419,"len":1.08,"anchors":{"grip":[0,0.1322,0.3972],"sup":[0,0.1049,-0.0195],"sight":[0,0.1983,0.1367],"rail":[0,0.1711,0.2722],"muzzle":[0,0.0986,-0.5209]},"tint":0.75},
  sawed: {"url":"assets/sawed.glb","q":[-0.70604,-0.02507,0.7067,0.03811],"off":[0.0038,0.2056,0.0142],"nativeLen":0.9789,"len":0.66,"anchors":{"grip":[0,0.0793,0.1285],"sup":[0,0.0567,-0.2631],"sight":[0,0.124,0.1407],"rail":[0,0.0921,0.011],"muzzle":[0,0.0845,-0.4894]},"tint":0.75},
  autoloader: {"url":"assets/autoloader.glb","q":[-0.10629,-0.69921,0.11229,0.698],"off":[0.002,-0.121,0.0696],"nativeLen":1.0479,"len":0.95,"anchors":{"grip":[0,0.1974,0.4126],"sup":[0,0.1289,-0.0065],"sight":[0,0.2904,0.1506],"rail":[0,0.2966,0.2869],"muzzle":[0,0.1396,-0.5239]},"tint":0.75},
  drumauto: {"url":"assets/drumauto.glb","q":[-0.03148,0.70589,-0.04061,0.70646],"off":[-0.0043,0.0007,0.0312],"nativeLen":0.9888,"len":0.96,"anchors":{"grip":[0,0.2977,0.1958],"sup":[0,0.2817,-0.2238],"sight":[0,0.4002,0.1421],"rail":[0,0.3941,-0.1248],"muzzle":[0,0.316,-0.4944]},"tint":0.75},
  doughboy: {"url":"assets/doughboy.glb","q":[-0.06364,0.70254,-0.0649,0.70582],"off":[-0.0012,0.0826,0.051],"nativeLen":0.9964,"len":1.15,"anchors":{"grip":[0,0.338,0.201],"sup":[0,0.3494,-0.201],"sight":[0,0.4316,0.1432],"rail":[0,0.4393,-0.1258],"muzzle":[0,0.3841,-0.4982]},"tint":0.75},
  rpk: {"url":"assets/rpk.glb","q":[-0.03261,-0.68952,0.07192,0.71995],"off":[0.0188,0.049,0.0347],"nativeLen":0.9372,"len":1.04,"anchors":{"grip":[0,0.2752,0.1922],"sup":[0,0.2752,-0.105],"sight":[0,0.3753,0.1347],"rail":[0,0.3649,-0.0949],"muzzle":[0,0.2902,-0.4686]},"tint":0.75},
  marine27: {"url":"assets/marine27.glb","q":[-0.02139,-0.70664,0.0198,0.70698],"off":[-0.0007,-0.0027,0.0135],"nativeLen":0.9817,"len":0.94,"anchors":{"grip":[0,0.2158,0.2516],"sup":[0,0.2217,-0.1411],"sight":[0,0.3831,0.0675],"rail":[0,0.3743,0.1338],"muzzle":[0,0.2338,-0.4909]},"tint":0.75},
  l86: {"url":"assets/l86.glb","q":[-0.03318,-0.70566,0.03179,0.70706],"off":[-0.0006,0.0275,0.0371],"nativeLen":0.9977,"len":0.9,"anchors":{"grip":[0,0.3587,0.1757],"sup":[0,0.3163,-0.1502],"sight":[0,0.5386,-0.0437],"rail":[0,0.5229,-0.338],"muzzle":[0,0.5173,-0.4989]},"tint":0.75},
  hockey: {"url":"assets/hockey.glb","q":[0.65563,0.3507,0.64864,0.16259],"off":[-0.0897,0.3854,-0.265],"nativeLen":1.1901,"len":1.45,"anchors":{"grip":[0,0.1581,0.4523],"sup":[0,0.1581,0.5118],"sight":[0,0.2568,0],"rail":[0,0.2568,0],"muzzle":[0,0.0604,-0.5951]},"tint":0.75},
  chainsaw: {"url":"assets/chainsaw.glb","q":[-0.01363,-0.25592,0.08237,0.96309],"off":[-0.0082,0.0161,0.0152],"nativeLen":1.1035,"len":0.85,"anchors":{"grip":[0,0.1468,0.4193],"sup":[0,0.1468,0.4745],"sight":[0,0.5248,0],"rail":[0,0.5248,0],"muzzle":[0,0.1654,-0.5517]},"tint":0.75},
  stars: {"url":"assets/stars.glb","q":[0.53114,0.1961,0.67426,-0.47413],"off":[-0.2238,0.758,0.056],"nativeLen":1.2756,"len":0.13,"anchors":{"grip":[0,0.793,0.4847],"sup":[0,0.793,0.5485],"sight":[0,1.2551,0],"rail":[0,1.2551,0],"muzzle":[0,0.4065,-0.6378]},"tint":0.75},
  karambit: {"url":"assets/karambit.glb","q":[0.73895,0.19523,0.63305,0.12282],"off":[-0.0513,0.4817,-0.1114],"nativeLen":1.1288,"len":0.21,"anchors":{"grip":[0,0.1579,0.4289],"sup":[0,0.1579,0.4854],"sight":[0,0.2741,0],"rail":[0,0.2741,0],"muzzle":[0,0.2617,-0.5644]},"tint":0.75},
  iron45: {"url":"assets/iron45.glb","q":[-0.08332,-0.7032,0.09029,0.70029],"off":[0.0048,-0.0674,0.0909],"nativeLen":1.0713,"len":0.22,"anchors":{"grip":[0,0.3781,0.3531],"sup":[0,0.3581,0.3731],"sight":[0,0.5946,0.154],"rail":[0,0.5023,0.4218],"muzzle":[0,0.4291,-0.5356]},"tint":0.75},
  bullpup90: {"url":"assets/bullpup90.glb","q":[-0.05639,-0.70558,0.06692,0.7032],"off":[0.0043,-0.0016,0.0536],"nativeLen":1.0109,"len":0.5,"anchors":{"grip":[0,0.3977,0.398],"sup":[0,0.2965,-0.2253],"sight":[0,0.6136,0.1327],"rail":[0,0.5286,0.2767],"muzzle":[0,0.3322,-0.5054]},"tint":0.75},
  bullpupA3: {"url":"assets/bullpupA3.glb","q":[-0.02682,0.69291,-0.06841,0.71727],"off":[-0.0203,0.0057,0.0415],"nativeLen":0.9791,"len":0.74,"anchors":{"grip":[0,0.2736,0.2509],"sup":[0,0.277,-0.1407],"sight":[0,0.4336,-0.0918],"rail":[0,0.3939,0.1334],"muzzle":[0,0.28,-0.4895]},"tint":0.75},
  nodachi: {"url":"assets/nodachi.glb","q":[0.50456,-0.49468,-0.50125,-0.49947],"off":[0.0621,0.0705,0.0005],"nativeLen":0.9854,"len":1.35,"anchors":{"grip":[0,0.0691,0.3745],"sup":[0,0.0691,0.4237],"sight":[0,0.1387,0],"rail":[0,0.1387,0],"muzzle":[0,0.0697,-0.4927]},"tint":0.75},
};
// The 11 original models load before the game starts; the rest stream in afterwards (or on demand when a
// weapon is equipped/previewed) so phones don't wait on ~35 meshes up front.
const MODEL_CORE = ['preacher', 'vexor', 'kalash', 'longshot', 'riot', 'bren', 'katana', 'xeno', 'barbedbat', 'slasher', 'patriot15'];
let _mLoader = null;
function loadModel(id) {
  const def = MODELS[id]; if (!def || !_mLoader) return Promise.resolve();
  if (def.p) return def.p;
  def.p = new Promise(res => {
    // GLBs ship as base64 text: the artifact host serves .txt but not .glb
    fetch(def.url + '.txt').then(r => { if (!r.ok) throw 0; return r.text(); }).then(b64 => {
      const bin = atob(b64.trim()); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      _mLoader.parse(buf.buffer, '', gl => { def.scene = gl.scene; res(); modelArrived(id); }, () => res());
    }).catch(() => res());
  });
  return def.p;
}
function modelArrived(id) {
  try {
    if (typeof VM !== 'undefined' && VM.gun && P.s() && (P.s().w.id === id || (P.s().w.dual && id === 'slasher'))) buildVM();
    const list = document.getElementById('smList');
    if (typeof SM !== 'undefined' && SM.sel === id && list && list.offsetParent) smRefresh();
  } catch (e) { }
}
function loadModels() {
  if (!T.GLTFLoader) return Promise.resolve();
  _mLoader = new T.GLTFLoader(); if (window.MeshoptDecoder) _mLoader.setMeshoptDecoder(window.MeshoptDecoder);
  let want = MODEL_CORE.slice();
  try { const L = JSON.parse(localStorage.getItem('rn_load') || 'null') || {}; want.push(L.s1, L.s2, L.melee); } catch (e) { }
  want = [...new Set(want.filter(id => MODELS[id]))];
  const rest = Object.keys(MODELS).filter(id => !want.includes(id));
  const first = Promise.all(want.map(loadModel));
  // background: two at a time once the core set is in
  first.then(() => { let k = 0; const next = () => { if (k >= rest.length) return; const id = rest[k++]; loadModel(id).then(() => setTimeout(next, 60)); }; setTimeout(() => { next(); next(); }, 1500); });
  return Promise.race([first, new Promise(r => setTimeout(r, 15000))]);
}
function lcMag() { return new T.MeshStandardMaterial({ color: lc(0x6a2a10), metalness: .2, roughness: .5 }); }
