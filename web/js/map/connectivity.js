/* ============================================================
   War of Power — اتصال الخريطة لكل نوع حركة + القرى
   الملف: js/map/connectivity.js   ·   ترتيب التحميل: 18 من 43
   ============================================================ */
'use strict';
/* ===== Map connectivity per movement class + villages ===== */
// movement classes: 0 infantry, 1 tracked, 2 wheeled
for (const [k, st] of [['temperate', 'eu'], ['desert', 'arb'], ['snow', 'rus'], ['mountain', 'eu'], ['steppe', 'rus'], ['mixed', 'usa']]) if (THEMES[k]) THEMES[k].style = st;
{ const wd = MAPS.find(m => m.id === 'wide'); if (wd) wd.max = 6; }

// passability for a movement class from terrain only (buildings excluded: they come and go)
GameMap.prototype.terrainOK = function (i, mc) {
  const p = this.pass[i];
  if (mc === 0) return !(p & PASS.INF);
  return !(p & PASS.VEH);
};
GameMap.prototype.compFor = function (mc) {
  if (mc === 1 || mc === 2) return this.comp;
  if (!this.compCache) this.compCache = {}; if (this.compCache[mc]) return this.compCache[mc];
  const { w, h } = this, N = w * h; const comp = new Int32Array(N).fill(-1); const q = new Int32Array(N); let id = 0;
  for (let s = 0; s < N; s++) {
    if (comp[s] >= 0 || !this.terrainOK(s, mc)) continue; let qh = 0, qt = 0; q[qt++] = s; comp[s] = id;
    while (qh < qt) { const c = q[qh++]; const cx = c % w, cy = (c / w) | 0;
      for (let k = 0; k < 4; k++) { const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0); if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const ni = ny * w + nx; if (comp[ni] < 0 && this.terrainOK(ni, mc)) { comp[ni] = id; q[qt++] = ni; } } }
    id++;
  }
  this.compCache[mc] = comp; return comp;
};
{ const cc = GameMap.prototype.computeComponents; GameMap.prototype.computeComponents = function () { cc.call(this); this.compCache = {}; }; }
/* ---------- villages: clusters of civilian houses with dirt lanes (decor + cover) ---------- */
function addVillages(m, r, style, count) {
  const W = m.w, H = m.h; m.villages = m.villages || []; let made = 0;
  const near = (x, y, R) => { for (const s of m.starts) if (Math.hypot(s.tx - x, s.ty - y) < R) return true; for (const o of m.res) if (Math.hypot(o.tx - x, o.ty - y) < 8) return true; for (const o of m.ore) if (Math.hypot(o.tx - x, o.ty - y) < 6) return true; for (const v of m.villages) if (Math.hypot(v.tx - x, v.ty - y) < 26) return true; return false; };
  for (let tries = 0; tries < 400 && made < count; tries++) {
    const x = r.int(14, W - 15), y = r.int(14, H - 15); if (near(x, y, 24)) continue;
    let ok = true; for (let dy = -6; dy <= 6 && ok; dy += 2) for (let dx = -6; dx <= 6; dx += 2) { const i = (y + dy) * W + x + dx; if (!m.inb(x + dx, y + dy) || (m.pass[i] & (PASS.VEH | PASS.WATER))) { ok = false; break; } }
    if (!ok) continue;
    const v = { tx: x, ty: y, st: style, props: [], city: { tx: x - 2, ty: y - 2 } }; const n = r.int(4, 8); const occ = new Set();
    for (let yy = y - 3; yy <= y + 2; yy++) for (let xx = x - 3; xx <= x + 2; xx++) occ.add(yy * W + xx); // the city itself (WC4-style, capturable) sits in the middle
    const fits = (t, tx, ty) => { const d = CIV[t]; for (let yy = ty - 1; yy <= ty + d.h; yy++) for (let xx = tx - 1; xx <= tx + d.w; xx++) { if (!m.inb(xx, yy)) return false; const i = yy * W + xx; if (occ.has(i) || (m.pass[i] & (PASS.VEH | PASS.WATER))) return false; } return true; };
    // lane through the village
    const ang = r() * PI; for (let k = -9; k <= 9; k++) { const lx = Math.round(x + Math.cos(ang) * k), ly = Math.round(y + Math.sin(ang) * k); if (m.inb(lx, ly)) { m.paintLayer(lx + 0.5, ly + 0.5, 1.2, TL.DIRT, 0.7); occ.add(ly * W + lx); } }
    for (let k = 0; k < 60 && v.props.length < n; k++) { const t = r() < 0.18 ? 'villa' : 'house'; const tx = x + r.int(-6, 5), ty = y + r.int(-6, 5); if (!fits(t, tx, ty)) continue; const d = CIV[t]; for (let yy = ty; yy < ty + d.h; yy++) for (let xx = tx; xx < tx + d.w; xx++) { const i = yy * W + xx; occ.add(i); const tr = m.treeAt[i]; if (tr >= 0) m.removeTree(tr); } v.props.push({ t, x: (tx + d.w / 2) * TILE, y: (ty + d.h / 2) * TILE, tx, ty }); }
    if (v.props.length >= 3) { m.villages.push(v); made++; m.paintLayer(x, y, 6, TL.DIRT, 0.35); }
  }
}
// called after the Game exists: villages become solid decor props drawn with the city renderer
function placeVillages(G) {
  const m = G.map; if (!m.villages || !m.villages.length) return; G.cityProps = G.cityProps || [];
  for (const v of m.villages) for (const p of v.props) { const d = CIV[p.t]; for (let y = p.ty; y < p.ty + d.h; y++) for (let x = p.tx; x < p.tx + d.w; x++) if (m.inb(x, y)) m.pass[y * m.w + x] |= PASS.BLD; G.cityProps.push({ t: p.t, st: v.st, x: p.x, y: p.y }); }
}
