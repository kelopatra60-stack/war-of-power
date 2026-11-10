/* ============================================================
   War of Power — الخرائط: التوليد، التضاريس، قابلية العبور، قائمة الخرائط
   الملف: js/map/map.js   ·   ترتيب التحميل: 17 من 43
   ============================================================ */
'use strict';
/* ===== Map: generation, terrain data, passability ===== */
const PASS = { VEH: 1, INF: 2, FOREST: 4, BLD: 8, ROAD: 16, WATER: 32, AIRPAD: 64 };
const MAPS = [
  { id: 'dunes', n: 'وادي الرمال', theme: 'desert', w: 96, h: 96, max: 2, seed: 11, d: 'خريطة صحراوية صغيرة لمعركة سريعة بين قوتين.' },
  { id: 'forest', n: 'الغابة الخضراء', theme: 'temperate', w: 128, h: 128, max: 4, seed: 23, d: 'غابات كثيفة وأنهار ومراعٍ أوروبية.' },
  { id: 'winter', n: 'سهول الشتاء', theme: 'snow', w: 128, h: 128, max: 4, seed: 37, d: 'ثلوج وغابات صنوبر وبحيرات متجمدة.' },
  { id: 'pass', n: 'مضيق الجبال', theme: 'mountain', w: 160, h: 160, max: 4, seed: 41, d: 'جبال وعرة وممرات ضيقة حاسمة.' },
  { id: 'steppe', n: 'السهوب الكبرى', theme: 'steppe', w: 160, h: 160, max: 5, seed: 53, d: 'سهول مفتوحة واسعة مثالية لحرب الدبابات.' },
  { id: 'wide', n: 'الخريطة الواسعة', theme: 'mixed', w: 192, h: 192, max: 5, seed: 67, d: 'صحارٍ وغابات وجبال وأنهار.' },
  { id: 'giant', n: 'القارة', theme: 'mixed', w: 288, h: 288, max: 6, seed: 79, d: 'خريطة ضخمة جداً: قارة كاملة بمدن ومناجم وجبهات متعددة.' },
  { id: 'vast', n: 'الأرض الشاسعة', theme: 'steppe', w: 384, h: 384, max: 6, seed: 97, d: 'أضخم الخرائط: سهول وصحارٍ لا نهاية لها وحروب طويلة.' },
  { id: 'lava', nu: 1, n: 'أرض اللافا', theme: 'lava', w: 192, h: 192, max: 6, seed: 211, d: 'أرض بركانية من الصخور السوداء تشقها أنهار من الحمم المتوهجة.' },
  // shop maps (nu = «جديدة» tag on the battlefield picker)
  { id: 'oasis', nu: 1, n: 'واحة النخيل', theme: 'desert', w: 128, h: 128, max: 4, seed: 131, d: 'واحات وكثبان رملية ومعابر ضيقة بين الرمال.' },
  { id: 'tundra', nu: 1, n: 'التندرا المتجمدة', theme: 'snow', w: 160, h: 160, max: 5, seed: 149, d: 'سهول جليدية واسعة وبحيرات متجمدة وغابات صنوبر متناثرة.' },
  { id: 'canyon', nu: 1, n: 'الأخدود العظيم', theme: 'mountain', w: 192, h: 192, max: 5, seed: 163, d: 'أخاديد عميقة وهضاب مرتفعة تحكمها ممرات قليلة.' },
  { id: 'frontier', nu: 1, n: 'خط الجبهة', theme: 'temperate', w: 224, h: 224, max: 6, seed: 181, d: 'جبهة طويلة من الغابات والأنهار والقرى تتسع لستة جيوش.' },
];
function sizedDef(def, s) { s = +s || 1; if (s === 1) return def; const k = v => clamp(Math.round(v * s / 16) * 16, 64, 512); return Object.assign({}, def, { w: k(def.w), h: k(def.h) }); }
class GameMap {
  constructor(w, h) {
    this.w = w; this.h = h; const N = w * h;
    this.hgt = new Float32Array(N); this.spl = new Uint8Array(N * 8); this.pass = new Uint8Array(N);
    this.vary = new Float32Array(N); this.road = new Uint8Array(N);
    this.trees = []; this.treeAt = new Int32Array(N).fill(-1); this.props = [];
    this.starts = []; this.res = []; this.ore = []; this.sea = 0.3; this.theme = 'temperate'; this.name = '';
    this.bldAt = new Int32Array(N).fill(0); // building id occupying tile (0 = none)
  }
  idx(x, y) { return y * this.w + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  heightAt(wx, wy) { const x = clamp(Math.floor(wx / TILE), 0, this.w - 1), y = clamp(Math.floor(wy / TILE), 0, this.h - 1); return this.hgt[y * this.w + x]; }
  isWater(tx, ty) { return !this.inb(tx, ty) || this.hgt[ty * this.w + tx] < this.sea; }
  blockedVeh(tx, ty) { if (!this.inb(tx, ty)) return true; const p = this.pass[ty * this.w + tx]; return (p & (PASS.VEH | PASS.BLD)) !== 0; }
  blockedInf(tx, ty) { if (!this.inb(tx, ty)) return true; const p = this.pass[ty * this.w + tx]; return (p & (PASS.INF | PASS.BLD)) !== 0; }
  // terrain layer dominance at tile
  domLayer(tx, ty) { const o = (ty * this.w + tx) * 8; let b = 0, bv = -1; for (let i = 0; i < 8; i++) if (this.spl[o + i] > bv) { bv = this.spl[o + i]; b = i; } return b; }
  computePass() {
    const { w, h, hgt } = this; const sc = this.slopeScale || 9;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; let p = this.pass[i] & (PASS.BLD | PASS.ROAD | PASS.AIRPAD);
      if (hgt[i] < this.sea) p |= PASS.VEH | PASS.INF | PASS.WATER;
      else {
        let s = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = clamp(x + dx, 0, w - 1), yy = clamp(y + dy, 0, h - 1); s = Math.max(s, Math.abs(hgt[yy * w + xx] - hgt[i])); }
        s *= sc; if (s > 0.55) p |= PASS.VEH; if (s > 0.95) p |= PASS.INF;
      }
      if (this.treeAt[i] >= 0) p |= PASS.FOREST;
      this.pass[i] = p;
    }
  }
  // connected components for vehicles (used to validate orders)
  computeComponents() {
    const { w, h } = this; const comp = new Int32Array(w * h).fill(-1); let id = 0; const q = new Int32Array(w * h);
    for (let s = 0; s < w * h; s++) {
      if (comp[s] >= 0 || (this.pass[s] & PASS.VEH)) continue; let qh = 0, qt = 0; q[qt++] = s; comp[s] = id;
      while (qh < qt) { const c = q[qh++]; const cx = c % w, cy = (c / w) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const ni = ny * w + nx; if (comp[ni] < 0 && !(this.pass[ni] & PASS.VEH)) { comp[ni] = id; q[qt++] = ni; } } }
      id++;
    }
    this.comp = comp; this.ncomp = id;
  }
  // build GPU terrain textures
  buildTerrainData() {
    const { w, h, hgt } = this; const N = w * h; const data = new Uint8Array(N * 4), s0 = new Uint8Array(N * 4), s1 = new Uint8Array(N * 4);
    const nk = this.normalScale || 6;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; const hl = hgt[y * w + Math.max(0, x - 1)], hr = hgt[y * w + Math.min(w - 1, x + 1)], hu = hgt[Math.max(0, y - 1) * w + x], hd = hgt[Math.min(h - 1, y + 1) * w + x];
      let nx = -(hr - hl) * nk, ny = -(hd - hu) * nk; const l = Math.hypot(nx, ny, 1); nx /= l; ny /= l;
      data[i * 4] = clamp(nx * 127.5 + 127.5, 0, 255); data[i * 4 + 1] = clamp(ny * 127.5 + 127.5, 0, 255); data[i * 4 + 2] = clamp(hgt[i] * 255, 0, 255); data[i * 4 + 3] = clamp(this.vary[i] * 255, 0, 255);
      for (let k = 0; k < 4; k++) { s0[i * 4 + k] = this.spl[i * 8 + k]; s1[i * 4 + k] = this.spl[i * 8 + 4 + k]; }
    }
    return { w, h, data, splat0: s0, splat1: s1, sea: this.sea, lava: this.theme === 'lava' ? 1 : 0 };
  }
  // oil fields: one per oil spot; wells may only be drilled inside them
  fields() { if (!this._of || this._ofn !== this.ore.length) { this._ofn = this.ore.length; this._of = this.ore.map((o, i) => ({ i, x: (o.tx + 1) * TILE, y: (o.ty + 1) * TILE, r: (o.r || 4.6) * TILE, home: !!o.home })); } return this._of; }
  oilAt(x, y, pad) { for (const f of this.fields()) if (Math.hypot(x - f.x, y - f.y) <= f.r - (pad || 0)) return f; return null; }
  setSplat(i, weights) { let s = 0; for (let k = 0; k < 8; k++) s += Math.max(0, weights[k] || 0); s = s || 1; for (let k = 0; k < 8; k++) this.spl[i * 8 + k] = clamp(Math.round(Math.max(0, weights[k] || 0) / s * 255), 0, 255); }
  paintLayer(tx, ty, r, layer, strength) { // used for base pads, roads, craters
    for (let y = Math.floor(ty - r); y <= Math.ceil(ty + r); y++) for (let x = Math.floor(tx - r); x <= Math.ceil(tx + r); x++) {
      if (!this.inb(x, y)) continue; const d = Math.hypot(x + 0.5 - tx, y + 0.5 - ty); if (d > r) continue; const k = (strength || 1) * smooth(sat((r - d) / Math.max(1, r * 0.35)));
      const i = y * this.w + x; const wts = []; for (let j = 0; j < 8; j++) wts.push(this.spl[i * 8 + j] * (1 - k)); wts[layer] += 255 * k; this.setSplat(i, wts);
    }
  }
  addTree(x, y, type, scale) { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); if (!this.inb(tx, ty)) return; const i = ty * this.w + tx; if (this.treeAt[i] >= 0) return; const id = this.trees.length; this.trees.push({ x, y, t: type, s: scale || 1, r: hash2(tx, ty, 3) * TAU, alive: 1, fall: 0, fa: 0 }); this.treeAt[i] = id; }
  removeTree(i) { const t = this.trees[i]; if (!t || !t.alive) return; t.alive = 0; const tx = Math.floor(t.x / TILE), ty = Math.floor(t.y / TILE); const ii = ty * this.w + tx; if (this.treeAt[ii] === i) { this.treeAt[ii] = -1; this.pass[ii] &= ~PASS.FOREST; } }
  clearTrees(tx, ty, tw, th) { for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) { if (!this.inb(x, y)) continue; const t = this.treeAt[y * this.w + x]; if (t >= 0) this.removeTree(t); } }
}

/* ---------- Skirmish map generator ---------- */
const THEMES = {
  temperate: { base: [1, 0.15, 0.2, 0, 0, 0, 0, 0], hill: 0.22, ridge: 0.12, water: 0.33, forest: 0.32, tree: ['oak', 'oak', 'pine', 'bush'], rough: 1 },
  desert: { base: [0, 0.18, 0.12, 1, 0, 0, 0, 0], hill: 0.2, ridge: 0.18, water: 0.06, forest: 0.03, tree: ['palm', 'bush'], rough: 1.1 },
  snow: { base: [0, 0.05, 0.05, 0, 0, 1, 0, 0], hill: 0.2, ridge: 0.14, water: 0.25, forest: 0.3, tree: ['snowpine', 'pine', 'snowpine'], rough: 1 },
  mountain: { base: [0.8, 0.25, 0.25, 0, 0.3, 0, 0, 0], hill: 0.34, ridge: 0.32, water: 0.18, forest: 0.24, tree: ['pine', 'pine', 'oak'], rough: 1.3 },
  steppe: { base: [0.15, 1, 0.25, 0, 0, 0, 0, 0], hill: 0.15, ridge: 0.08, water: 0.14, forest: 0.08, tree: ['bush', 'oak'], rough: 0.8 },
  mixed: { base: [0.8, 0.5, 0.2, 0.5, 0, 0, 0, 0], hill: 0.24, ridge: 0.18, water: 0.22, forest: 0.24, tree: ['oak', 'pine', 'bush', 'palm'], rough: 1 },
  lava: { base: [0, 0.55, 1, 0, 0.7, 0, 0, 0], hill: 0.28, ridge: 0.26, water: 0.24, forest: 0.03, tree: ['bush'], rough: 1.25, lava: 1 }, // volcanic: basalt, glowing lava rivers
};
function generateSkirmishMap(def, nPlayers) {
  const W = def.w, H = def.h, th = THEMES[def.theme] || THEMES.temperate; const r = RNG(def.seed), n = Noise(def.seed), n2 = Noise(def.seed + 7), n3 = Noise(def.seed + 13);
  const m = new GameMap(W, H); m.theme = def.theme; m.name = def.n; m.id = def.id; m.sea = 0.3;
  const sc = 1 / 48 * (128 / Math.max(W, H)) ** 0.15;
  // start positions
  const P = Math.max(2, Math.min(nPlayers || 2, def.max)); const starts = [];
  const ang0 = r() * TAU;
  if (P === 2) { const a = ang0; starts.push([0.5 + Math.cos(a) * 0.36, 0.5 + Math.sin(a) * 0.36], [0.5 - Math.cos(a) * 0.36, 0.5 - Math.sin(a) * 0.36]); }
  else for (let i = 0; i < P; i++) { const a = ang0 + i / P * TAU; starts.push([0.5 + Math.cos(a) * 0.37, 0.5 + Math.sin(a) * 0.37]); }
  m.starts = starts.map(([x, y]) => ({ tx: Math.round(x * W), ty: Math.round(y * H) }));
  // heights
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; const fx = x * sc * th.rough, fy = y * sc * th.rough;
    let h = 0.5 + n.fbm(fx, fy, 5) * th.hill + Math.max(0, n2.ridge(fx * 0.7, fy * 0.7, 4) - 0.55) * th.ridge * 2.2;
    const wv = n3.fbm(fx * 0.6 + 3, fy * 0.6 + 5, 4); if (wv < -th.water * 1.2 + 0.05 && th.water > 0.05) h -= (-th.water * 1.2 + 0.05 - wv) * 2.4;
    // edges slightly raised for framing
    const e = Math.min(x, y, W - 1 - x, H - 1 - y) / Math.max(W, H); if (e < 0.03) h += (0.03 - e) * 2;
    m.hgt[i] = h; m.vary[i] = n2.fbm(x * 0.09, y * 0.09, 3) * 0.5 + 0.5;
  }
  if (th.lava) { // volcanic land: rivers of lava from the map edges and crater pools (the corridors between bases bridge them below)
    const lower = (cx, cy, rad) => { for (let y = Math.floor(cy - rad - 3); y <= cy + rad + 3; y++) for (let x = Math.floor(cx - rad - 3); x <= cx + rad + 3; x++) { if (x < 0 || y < 0 || x >= W || y >= H) continue; const d = Math.hypot(x - cx, y - cy); const k = d < rad ? 1 : d < rad + 3 ? smooth(1 - (d - rad) / 3) : 0; if (k > 0) { const i = y * W + x; m.hgt[i] = Math.min(m.hgt[i], lerp(m.hgt[i], 0.12, k)); } } };
    const nearStart = (x, y, R) => m.starts.some(s => Math.hypot(s.tx - x, s.ty - y) < R);
    const rivers = 2 + (W > 160 ? 1 : 0);
    for (let k = 0; k < rivers; k++) {
      const side = r.int(0, 3); let x = side === 0 ? 1 : side === 1 ? W - 2 : r.int(8, W - 8), y = side === 2 ? 1 : side === 3 ? H - 2 : r.int(8, H - 8);
      let a = Math.atan2(H / 2 - y, W / 2 - x) + r.range(-0.7, 0.7);
      for (let s = 0; s < W * 1.7; s++) { a += n3.fbm(x * 0.05 + k * 9, y * 0.05 + k * 4, 2) * 0.32; x += Math.cos(a); y += Math.sin(a); if (x < 0 || y < 0 || x >= W || y >= H) break; if (!nearStart(x, y, 19)) lower(x, y, 2.1 + Math.sin(s * 0.07 + k) * 0.8); }
    }
    for (let k = 0, t = 0; k < 6 && t < 60; t++) { const x = r.int(10, W - 10), y = r.int(10, H - 10); if (nearStart(x, y, 26)) continue; lower(x, y, r.range(3, 6.5)); k++; }
  }
  // flatten bases + corridors
  const flat = (cx, cy, rad, lvl) => { for (let y = Math.floor(cy - rad - 6); y <= cy + rad + 6; y++) for (let x = Math.floor(cx - rad - 6); x <= cx + rad + 6; x++) { if (!m.inb(x, y)) continue; const d = Math.hypot(x - cx, y - cy); const k = d < rad ? 1 : d < rad + 6 ? smooth(1 - (d - rad) / 6) : 0; if (k > 0) { const i = y * W + x; m.hgt[i] = lerp(m.hgt[i], lvl, k); } } };
  const carve = (ax, ay, bx, by, wdt) => { const L = Math.hypot(bx - ax, by - ay); for (let s = 0; s <= L; s += 1) { const t = s / L, cx = lerp(ax, bx, t) + Math.sin(t * 7 + ax) * 3, cy = lerp(ay, by, t) + Math.cos(t * 5 + by) * 3; for (let y = Math.floor(cy - wdt - 3); y <= cy + wdt + 3; y++) for (let x = Math.floor(cx - wdt - 3); x <= cx + wdt + 3; x++) { if (!m.inb(x, y)) continue; const d = Math.hypot(x - cx, y - cy); const i = y * W + x; const tgt = Math.max(m.sea + 0.06, Math.min(m.hgt[i], 0.62)); const k = d < wdt ? 0.85 : d < wdt + 3 ? 0.85 * (1 - (d - wdt) / 3) : 0; if (k > 0) m.hgt[i] = lerp(m.hgt[i], tgt, k); } } };
  for (const s of m.starts) flat(s.tx, s.ty, 13, 0.5);
  for (let i = 0; i < m.starts.length; i++) { const a = m.starts[i], b = m.starts[(i + 1) % m.starts.length]; carve(a.tx, a.ty, b.tx, b.ty, 3); carve(a.tx, a.ty, W / 2, H / 2, 2.5); }
  flat(W / 2, H / 2, 6, 0.5);
  // smooth heights lightly
  smoothHeights(m, 1);
  // splat / biome
  paintBiomes(m, th, def, n, n2);
  // resources: supply depots
  for (const s of m.starts) {
    const a = Math.atan2(H / 2 - s.ty, W / 2 - s.tx);
    for (const off of [-0.9, 0.9]) { const d = 11; m.res.push({ tx: Math.round(s.tx + Math.cos(a + off) * d), ty: Math.round(s.ty + Math.sin(a + off) * d), amt: 40000 }); }
  }
  m.res.push({ tx: Math.round(W / 2) - 1, ty: Math.round(H / 2) - 1, amt: 80000 });
  for (let i = 0; i < m.starts.length; i++) { const a = m.starts[i], b = m.starts[(i + 1) % m.starts.length]; const mx = (a.tx + b.tx) / 2, my = (a.ty + b.ty) / 2; m.res.push({ tx: Math.round(lerp(mx, W / 2, 0.25)), ty: Math.round(lerp(my, H / 2, 0.25)), amt: 60000 }); m.ore.push({ tx: Math.round(lerp(mx, W / 2, 0.55)) + 3, ty: Math.round(lerp(my, H / 2, 0.55)) + 2 }); }
  // iron veins: one behind every base plus deposits scattered across the map
  for (const s of m.starts) { const a = Math.atan2(s.ty - H / 2, s.tx - W / 2); for (const off of [0, 0.7, -0.7, 1.4]) { const tx = clamp(Math.round(s.tx + Math.cos(a + off) * 10) - 1, 4, W - 6), ty = clamp(Math.round(s.ty + Math.sin(a + off) * 10) - 1, 4, H - 6); if (!m.res.some(o => Math.hypot(o.tx - tx, o.ty - ty) < 6)) { m.ore.push({ tx, ty, home: 1 }); break; } } }
  { const extra = Math.max(4, Math.round(W * H / 5000)); for (let k = 0, tries = 0; k < extra && tries < extra * 30; tries++) { const tx = r.int(8, W - 10), ty = r.int(8, H - 10); if (m.starts.some(s => Math.hypot(s.tx - tx, s.ty - ty) < 18) || m.ore.some(o => Math.hypot(o.tx - tx, o.ty - ty) < 14) || m.res.some(o => Math.hypot(o.tx - tx, o.ty - ty) < 8)) continue; m.ore.push({ tx, ty }); k++; } }
  for (const o of m.res.concat(m.ore)) flat(o.tx + 1, o.ty + 1, m.ore.includes(o) ? 4 : 3, Math.max(m.hgt[clamp(o.ty, 0, H - 1) * W + clamp(o.tx, 0, W - 1)], m.sea + 0.08));
  for (const o of m.res) m.paintLayer(o.tx + 1.5, o.ty + 1.5, 3.5, TL.DIRT, 0.8);
  // forests
  placeForests(m, th, n3, r, def);
  m.computePass(); fixConnectivity(m); m.computeComponents();
  // remove resources placed in water/unreachable
  const main = m.comp[m.starts[0].ty * W + m.starts[0].tx];
  m.res = m.res.filter(o => m.inb(o.tx, o.ty) && m.comp[o.ty * W + o.tx] === main); m.ore = m.ore.filter(o => m.inb(o.tx + 1, o.ty + 1) && m.comp[(o.ty + 1) * W + o.tx + 1] === main);
  addVillages(m, RNG(def.seed + 99), th.style || 'eu', Math.max(1, Math.round(W * H / 9000)));
  return m;
}
function smoothHeights(m, passes) { const { w, h } = m; const t = new Float32Array(w * h); for (let p = 0; p < passes; p++) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; s += m.hgt[yy * w + xx]; c++; } t[y * w + x] = s / c; } m.hgt.set(t); } }
function paintBiomes(m, th, def, n, n2) {
  const { w, h } = m; const theme = def.theme;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; const hh = m.hgt[i]; const wts = th.base.slice();
    let s = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = clamp(x + dx, 0, w - 1), yy = clamp(y + dy, 0, h - 1); s = Math.max(s, Math.abs(m.hgt[yy * w + xx] - hh)); }
    const slope = s * 9;
    const mo = n.fbm(x * 0.05 + 20, y * 0.05, 4), mo2 = n2.fbm(x * 0.11, y * 0.11 + 9, 3);
    if (theme === 'mixed') { const b = n2.fbm(x * 0.012, y * 0.012, 3); wts[3] = sat(-b * 3 + 0.2) * 1.4; wts[0] = sat(b * 3 + 0.6); wts[1] = 0.4 + mo * 0.4; }
    wts[2] += sat(mo2 * 2.5 - 0.35) * 0.9; // dirt patches
    if (theme !== 'desert' && theme !== 'snow') wts[1] += sat(mo * 2 - 0.2) * 0.7;
    if (theme === 'desert') wts[1] += sat(mo * 2.4 - 0.5) * 0.8;
    const rock = sat((slope - 0.25) * 3) + sat((hh - 0.66) * 6);
    wts[4] += rock * 2.2;
    if (theme === 'snow' || theme === 'mountain') wts[5] += sat((hh - 0.62) * 7) * (theme === 'snow' ? 1 : 1.6);
    // shore: sand/dirt near water
    if (hh < m.sea + 0.035 && hh >= m.sea - 0.02) { if (theme === 'snow') wts[2] += 1.2; else wts[3] += 1.6; }
    if (hh < m.sea) { wts[2] += 1; wts[3] += 0.6; }
    m.setSplat(i, wts);
  }
  // base pads
  for (const s of m.starts) { m.paintLayer(s.tx, s.ty, 10, TL.DIRT, 0.55); }
}
function placeForests(m, th, n3, r, def) {
  const { w, h } = m; const kinds = th.tree; const nearBlock = (x, y, R) => { for (const s of m.starts) if (Math.hypot(s.tx - x, s.ty - y) < R) return true; for (const o of m.res) if (Math.hypot(o.tx - x, o.ty - y) < 6) return true; for (const o of m.ore) if (Math.hypot(o.tx - x, o.ty - y) < 7) return true; return false; };
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    const i = y * w + x; if (m.hgt[i] < m.sea + 0.02) continue; if (nearBlock(x, y, 16)) continue;
    const f = n3.fbm(x * 0.06 + 50, y * 0.06 + 11, 4); let dens = sat((f - (0.36 - th.forest)) * 4);
    const l = m.domLayer(x, y); if (l === TL.ROCK) dens *= 0.25; if (l === TL.SAND) dens *= 0.35;
    if (dens > 0.05 && r() < dens * 0.85) {
      const kind = kinds[Math.floor(r() * kinds.length)]; const v = kind === 'oak' ? 'oak' + r.int(0, 3) : kind === 'pine' ? 'pine' + r.int(0, 3) : kind === 'palm' ? 'palm' + r.int(0, 2) : kind === 'snowpine' ? 'snowpine' + r.int(0, 1) : 'bush' + r.int(0, 2);
      m.addTree((x + 0.2 + r() * 0.6) * TILE, (y + 0.2 + r() * 0.6) * TILE, v, 0.85 + r() * 0.4);
      if (dens > 0.4) { const wts = []; for (let k = 0; k < 8; k++) wts.push(m.spl[i * 8 + k]); wts[TL.FOREST] += 200 * dens; m.setSplat(i, wts); }
    }
  }
  // scattered rocks
  for (let k = 0; k < w * h / 900; k++) { const x = r.int(4, w - 5), y = r.int(4, h - 5); if (nearBlock(x, y, 14) || m.hgt[y * w + x] < m.sea + 0.03) continue; m.props.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, t: 'rock' + r.int(0, 2), r: r() * TAU, s: 0.8 + r() * 0.8 }); }
}
function fixConnectivity(m) {
  m.computeComponents(); const W = m.w; const cid = s => m.comp[s.ty * W + s.tx];
  const base = cid(m.starts[0]);
  for (let k = 1; k < m.starts.length; k++) {
    const s = m.starts[k]; if (cid(s) === base && cid(s) >= 0) continue;
    // carve straight bridge corridor
    const a = m.starts[0]; const L = Math.hypot(s.tx - a.tx, s.ty - a.ty);
    for (let t = 0; t <= L; t++) { const x = Math.round(lerp(a.tx, s.tx, t / L)), y = Math.round(lerp(a.ty, s.ty, t / L)); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (!m.inb(x + dx, y + dy)) continue; const i = (y + dy) * W + x + dx; m.hgt[i] = Math.max(m.sea + 0.05, Math.min(m.hgt[i], 0.6)); m.pass[i] &= ~(PASS.VEH | PASS.INF | PASS.WATER); const tr = m.treeAt[i]; if (tr >= 0) m.removeTree(tr); } }
    m.computePass(); m.computeComponents();
  }
}
// minimap base image (RGBA w*h)
function minimapImage(m) {
  const { w, h } = m; const img = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let r = 0, g = 0, b = 0; for (let k = 0; k < 8; k++) { const wt = m.spl[i * 8 + k] / 255; r += TL_COL[k][0] * wt; g += TL_COL[k][1] * wt; b += TL_COL[k][2] * wt; }
    const sh = 0.85 + (m.hgt[i] - 0.5) * 0.6; r *= sh; g *= sh; b *= sh;
    if (m.theme === 'lava') { r *= 0.42; g *= 0.36; b *= 0.34; }
    if (m.hgt[i] < m.sea) { const d = sat((m.sea - m.hgt[i]) * 8); if (m.theme === 'lava') { r = lerp(255, 200, d); g = lerp(140, 60, d); b = lerp(40, 12, d); } else { r = lerp(48, 18, d); g = lerp(96, 50, d); b = lerp(104, 72, d); } }
    if (m.treeAt[i] >= 0) { r *= 0.72; g *= 0.8; b *= 0.7; }
    if (m.road[i]) { r = g = b = 92; }
    img[i * 4] = r; img[i * 4 + 1] = g; img[i * 4 + 2] = b; img[i * 4 + 3] = 255;
  }
  return img;
}
