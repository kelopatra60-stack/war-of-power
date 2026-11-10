/* ============================================================
   War of Power — رسومات الوحدات: المركبات، المشاة، الطائرات، الآلات
   الملف: js/art/units.js   ·   ترتيب التحميل: 8 من 43
   ============================================================ */
'use strict';
/* ===== Unit art: top-down vehicles, infantry, aircraft, machines ===== */
const S_VEH = 2.6, S_INF = 3.4, S_AIR = 2.0;
const M = (c, h, ex) => Object.assign({ c, h }, ex || {});
const HO = (h, ex) => Object.assign({ c: null, h }, ex || {}); // height-only
const AL = (c, ex) => Object.assign({ c }, ex || {}); // albedo-only
function fpaint(f, h, ex) { const key = FACTIONS[f].camo; const C = CAMO[key] || {}; return Object.assign({ c: camo(key, C.upt || (key === 'chn' ? 46 : 64)), h, s: C.s || 0.12 }, ex || {}); }
function fcol(f) { const k = FACTIONS[f].camo; return (CAMO[k] || CAMO.usa).cols[0]; }
const STEEL = '#3b3c37', RUB = '#262523', GLASS = '#1f2c35';
// cylinder shading along x (height ridge at center line)
function cyl(p, x0, x1, y, r, c, h0, h1, ex) {
  p.rect(x0, y - r, x1 - x0, r * 2, AL(c), Math.min(r, 0.4));
  p.rect(x0, y - r, x1 - x0, r, Object.assign({ c: null, h: h1, hg: [0, y - r, h0, 0, y, h1], s: (ex && ex.s) || 0.25 }, ex));
  p.rect(x0, y, x1 - x0, r, Object.assign({ c: null, h: h1, hg: [0, y, h1, 0, y + r, h0], s: (ex && ex.s) || 0.25 }, ex));
}
function cylY(p, x, y0, y1, r, c, h0, h1) { // cylinder along y
  p.rect(x - r, y0, r * 2, y1 - y0, AL(c));
  p.rect(x - r, y0, r, y1 - y0, { c: null, h: h1, hg: [x - r, 0, h0, x, 0, h1], s: 0.25 });
  p.rect(x, y0, r, y1 - y0, { c: null, h: h1, hg: [x, 0, h1, x + r, 0, h0], s: 0.25 });
}
function dome(p, x, y, r, c, h0, h1, ex) { p.circ(x, y, r, Object.assign({ c, h: h1, hr: [x - r * 0.15, y - r * 0.15, r, h1, h0] }, ex || {})); }
function track(p, x, y, L, w) {
  p.rect(x, y, L, w, M(RUB, 0.2), 0.9);
  for (let i = x + 0.5; i < x + L - 0.5; i += 1.2) p.rect(i, y + 0.25, 0.6, w - 0.5, M('#3e3c37', 0.32));
  for (let i = x + 1; i < x + L - 1; i += 2.4) p.rect(i, y + w / 2 - 0.4, 0.9, 0.8, M('#5b574e', 0.42, { s: 0.3 }));
}
function wheel(p, x, y, l, w) { p.rect(x - l / 2, y - w / 2, l, w, M('#22211f', 0.32), Math.min(l, w) * 0.45); for (let k = -l / 2 + 0.5; k < l / 2; k += 0.9) p.rect(x + k, y - w / 2 + 0.2, 0.35, w - 0.4, HO(0.38)); }
function grille(p, x, y, w, h, n, dir) { // engine deck louvres
  p.rect(x, y, w, h, M('#2f302b', 0.3), 0.3);
  if (dir === 'y') { for (let i = 0; i < n; i++) { const xx = x + (i + 0.5) * w / n; p.line([xx, y + 0.4, xx, y + h - 0.4], w / n * 0.45, M('#4a4a42', 0.42)); } }
  else for (let i = 0; i < n; i++) { const yy = y + (i + 0.5) * h / n; p.line([x + 0.4, yy, x + w - 0.4, yy], h / n * 0.45, M('#4a4a42', 0.42)); }
}
function hatch(p, x, y, r, f, ex) { p.circ(x, y, r, Object.assign(fpaint(f, 0.72), ex || {})); p.circ(x, y, r * 0.78, HO(0.8)); p.rect(x - r * 0.15, y - r * 0.9, r * 0.3, r * 0.5, M('#2a2a26', 0.85)); }
function boxes(p, x, y, w, h, f, n, hh) { for (let i = 0; i < n; i++) { const bw = w / n; p.rect(x + i * bw + 0.15, y, bw - 0.3, h, fpaint(f, hh || 0.5), 0.3); p.line([x + i * bw + 0.5, y + h / 2, x + (i + 1) * bw - 0.5, y + h / 2], 0.2, AL('rgba(0,0,0,0.35)')); } }
function smokeLaunchers(p, x, y, n, ang) { for (let i = 0; i < n; i++) { const xx = x + Math.cos(ang) * i * 0.9, yy = y + Math.sin(ang) * i * 0.9; p.circ(xx, yy, 0.42, M('#2d2e29', 0.85)); p.circ(xx, yy, 0.22, HO(0.6)); } }
function lightBox(p, x, y) { p.rect(x - 0.5, y - 0.6, 1, 1.2, M('#2b2b28', 0.5)); p.rect(x + 0.1, y - 0.4, 0.35, 0.8, M('#e8e4c8', 0.55, { s: 0.9 })); }
function teamFlag(p, x, y, w, h) { p.rect(x, y, w, h, M('#d0d0d0', 0.82, { t: 1 }), 0.2); }
function era(p, x, y, cols, rows, bw, bh, f, h, gap) { gap = gap || 0.25; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) p.rect(x + i * (bw + gap), y + j * (bh + gap), bw, bh, fpaint(f, h || 0.62), 0.15); }
function slat(p, x, y, w, h, vertical) { p.rect(x, y, w, h, HO(0.2)); if (vertical) for (let i = x + 0.3; i < x + w; i += 0.8) p.line([i, y, i, y + h], 0.22, M('#3a3a32', 0.5)); else for (let j = y + 0.3; j < y + h; j += 0.8) p.line([x, j, x + w, j], 0.22, M('#3a3a32', 0.5)); }
function rws(p, x, y, f, ang) { // remote weapon station with MG
  p.rect(x - 1.1, y - 1.1, 2.2, 2.2, fpaint(f, 0.95), 0.4); p.rect(x - 0.4, y - 0.8, 1.2, 1.6, M('#232d33', 1, { s: 0.8 }));
  const a = ang || 0; p.line([x + 0.6, y + 0.35, x + 0.6 + Math.cos(a) * 3.6, y + 0.35 + Math.sin(a) * 3.6], 0.35, M(STEEL, 0.98, { s: 0.3 }));
}
function mgOnRing(p, x, y, r, f) { p.circ(x, y, r, M('#34342f', 0.8)); p.circ(x, y, r * 0.7, fpaint(f, 0.78)); p.line([x + 0.4, y, x + r + 3.2, y], 0.38, M(STEEL, 0.95, { s: 0.3 })); p.rect(x - 0.3, y - 0.9, 1.2, 1.8, M('#3c3d36', 0.92)); }
// Gun barrel sprite: from pivot (0,0) forward
function barrelArt(p, len, d, o) {
  o = o || {};
  const col = o.col || '#3d3e37';
  const r0 = d * 0.55, r1 = d * 0.42;
  p.poly([0, -r0, len, -r1, len, r1, 0, r0], AL(col));
  p.poly([0, -r0, len, -r1, len, 0, 0, 0], { c: null, h: 0.95, hg: [0, -r0, 0.55, 0, 0, 0.95], s: 0.35 });
  p.poly([0, 0, len, 0, len, r1, 0, r0], { c: null, h: 0.95, hg: [0, 0, 0.95, 0, r0, 0.55], s: 0.35 });
  if (o.sleeve) for (let x = 2.5; x < len - 2; x += o.sleeve) p.line([x, -r0 * 0.95, x, r0 * 0.95], 0.18, AL('rgba(0,0,0,0.35)'));
  if (o.evac) { const ex = len * o.evac; cyl(p, ex - 1.3, ex + 1.3, 0, d * 0.78, col, 0.6, 1); }
  if (o.brake) { cyl(p, len - 1.6, len + 0.3, 0, d * 0.95, '#353630', 0.6, 1); p.rect(len - 1.4, -d * 1.05, 0.5, d * 2.1, M('#222', 0.7)); p.rect(len - 0.7, -d * 1.05, 0.5, d * 2.1, M('#222', 0.7)); }
  if (o.pepper) { cyl(p, len - 2.2, len + 0.2, 0, d * 0.82, '#353630', 0.6, 1); for (let k = 0; k < 4; k++) { p.circ(len - 1.9 + k * 0.5, -d * 0.6, 0.16, M('#111', 0.6)); p.circ(len - 1.9 + k * 0.5, d * 0.6, 0.16, M('#111', 0.6)); } }
  if (o.mrs) p.rect(len - 1.3, -0.5, 0.9, 1, M('#4a4a42', 1));
  p.circ(len, 0, d * 0.28, M('#0b0b0a', 0.5));
}
function autoBarrel(p, x, y, len, d) { cyl(p, x, x + len, y, d / 2, '#33342f', 0.55, 0.95); p.circ(x + len, y, d * 0.22, M('#0b0b0a', 0.6)); }

// faceted armour: sloped faces from outline down to an inset roof
function insetPoly(pts, d) {
  const n = pts.length / 2; let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += pts[i * 2]; cy += pts[i * 2 + 1]; } cx /= n; cy /= n;
  const L = []; for (let i = 0; i < n; i++) { const ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[((i + 1) % n) * 2], by = pts[((i + 1) % n) * 2 + 1]; let nx = -(by - ay), ny = bx - ax; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; if ((cx - (ax + bx) / 2) * nx + (cy - (ay + by) / 2) * ny < 0) { nx = -nx; ny = -ny; } L.push([ax + nx * d, ay + ny * d, bx + nx * d, by + ny * d, nx, ny]); }
  const out = []; for (let i = 0; i < n; i++) { const a = L[(i + n - 1) % n], b = L[i]; const d1x = a[2] - a[0], d1y = a[3] - a[1], d2x = b[2] - b[0], d2y = b[3] - b[1]; const den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-6) { out.push(b[0], b[1]); continue; } const t = ((b[0] - a[0]) * d2y - (b[1] - a[1]) * d2x) / den; let x = a[0] + d1x * t, y = a[1] + d1y * t; const ox = pts[i * 2], oy = pts[i * 2 + 1]; const dd = Math.hypot(x - ox, y - oy); if (dd > d * 3) { x = ox + (x - ox) / dd * d * 3; y = oy + (y - oy) / dd * d * 3; } out.push(x, y); }
  return { out, L };
}
function facet(p, pts, f, hTop, hEdge, d, ex) {
  const { out, L } = insetPoly(pts, d || 2); const n = pts.length / 2; const base = Object.assign(typeof f === 'string' && f.length > 3 && f[0] === '#' ? M(f, hTop) : fpaint(f, hTop), ex || {});
  p.poly(pts, Object.assign({}, base, { h: hEdge }));
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; const ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[j * 2], by = pts[j * 2 + 1]; const mx = (ax + bx) / 2, my = (ay + by) / 2; const nx = L[i][4], ny = L[i][5];
    p.poly([ax, ay, bx, by, out[j * 2], out[j * 2 + 1], out[i * 2], out[i * 2 + 1]], { c: null, h: hTop, hg: [mx, my, hEdge, mx + nx * (d || 2), my + ny * (d || 2), hTop], s: base.s || 0.12 }); }
  p.poly(out, Object.assign({}, base, { c: null, h: hTop }));
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; p.line([out[i * 2], out[i * 2 + 1], out[j * 2], out[j * 2 + 1]], 0.18, AL('rgba(0,0,0,0.22)')); }
}
/* ---- generic hulls ---- */
function trackedHull(p, f, o) {
  const L = o.L, W = o.W, tw = o.tw || 3.6, hx = -L / 2;
  track(p, hx, -W / 2, L, tw); track(p, hx, W / 2 - tw, L, tw);
  // hull body (between tracks + fenders over them)
  const fr = o.front || 5, rr = o.rear || 2.5;
  facet(p, [hx + rr * 0.3, -W / 2 + tw * 0.75, L / 2 - fr * 0.25, -W / 2 + tw * 0.75, L / 2, -W / 2 + tw + 0.4, L / 2, W / 2 - tw - 0.4, L / 2 - fr * 0.25, W / 2 - tw * 0.75, hx + rr * 0.3, W / 2 - tw * 0.75, hx, W / 2 - tw - 0.3, hx, -W / 2 + tw + 0.3], f, 0.52, 0.34, 1.6);
  // glacis (sloped front)
  facet(p, [L / 2 - fr, -W / 2 + tw * 0.75, L / 2 - fr * 0.25, -W / 2 + tw * 0.75, L / 2, -W / 2 + tw + 0.4, L / 2, W / 2 - tw - 0.4, L / 2 - fr * 0.25, W / 2 - tw * 0.75, L / 2 - fr, W / 2 - tw * 0.75], f, 0.54, 0.26, 2.2);
  if (o.skirt !== false) { // side skirts over tracks
    const s0 = hx + (o.skirtR || 2), s1 = L / 2 - (o.skirtF || 3.2);
    p.rect(s0, -W / 2 + 0.25, s1 - s0, tw * 0.85, fpaint(f, 0.42), 0.35); p.rect(s0, W / 2 - tw * 0.85 - 0.25, s1 - s0, tw * 0.85, fpaint(f, 0.42), 0.35); p.rect(s0, -W / 2 + 0.25, s1 - s0, tw * 0.85, AL('rgba(40,34,26,0.18)')); p.rect(s0, W / 2 - tw * 0.85 - 0.25, s1 - s0, tw * 0.85, AL('rgba(40,34,26,0.18)'));
    for (let x = s0 + (o.panel || 4); x < s1 - 0.5; x += (o.panel || 4)) { p.line([x, -W / 2, x, -W / 2 + tw * 0.9], 0.2, AL('rgba(0,0,0,0.35)')); p.line([x, W / 2 - tw * 0.9, x, W / 2], 0.2, AL('rgba(0,0,0,0.35)')); }
  }
  lightBox(p, L / 2 - 0.8, -W / 2 + tw + 1.1); lightBox(p, L / 2 - 0.8, W / 2 - tw - 1.1);
}
function wheeledHull(p, f, o) {
  const L = o.L, W = o.W, n = o.axles || 4, ww = o.ww || 3.1, wl = o.wl || 3.6;
  const xs = o.axleX || Array.from({ length: n }, (_, i) => -L / 2 + 4 + i * (L - 9) / Math.max(1, n - 1));
  for (const x of xs) { wheel(p, x, -W / 2 + ww / 2 - 0.4, wl, ww); wheel(p, x, W / 2 - ww / 2 + 0.4, wl, ww); }
  const nose = o.nose || 4;
  facet(p, [-L / 2, -W / 2 + 1.3, L / 2 - nose, -W / 2 + 1.1, L / 2, -W / 2 + 2.6, L / 2, W / 2 - 2.6, L / 2 - nose, W / 2 - 1.1, -L / 2, W / 2 - 1.3], f, 0.54, 0.34, 1.5);
  facet(p, [L / 2 - nose, -W / 2 + 1.1, L / 2, -W / 2 + 2.6, L / 2, W / 2 - 2.6, L / 2 - nose, W / 2 - 1.1], f, 0.54, 0.26, 2.2);
  lightBox(p, L / 2 - 0.6, -W / 2 + 2.8); lightBox(p, L / 2 - 0.6, W / 2 - 2.8);
}
function truckCab(p, f, x, W, len, o) { // cab at front (x = rear edge of cab)
  o = o || {};
  p.rect(x, -W / 2 + 0.3, len, W - 0.6, fpaint(f, 0.78), 1.0);
  p.rect(x + len - 1.6, -W / 2 + 0.9, 1.1, W - 1.8, M(GLASS, 0.72, { s: 0.95 }), 0.3); // windscreen
  if (o.armored) { p.rect(x + 0.6, -W / 2 + 0.8, len - 2.6, W - 1.6, HO(0.86)); }
  p.circ(x + len * 0.4, -W / 4, 0.7, M('#2d2d29', 0.86)); // roof hatch
  p.rect(x + len - 0.5, -W / 2 - 0.3, 0.6, 1, M('#2a2a2a', 0.6)); p.rect(x + len - 0.5, W / 2 - 0.7, 0.6, 1, M('#2a2a2a', 0.6)); // mirrors
}

/* ---- Vehicle art definitions: each returns parts {hull, tur?, gun?, tx, gx, ...} ---- */
// Parts: hull(p) drawn with origin at hull center; tur(p) origin turret ring; gun(p) origin trunnion
const VART = {};
function V(id, def) { VART[id] = def; }
// --- USA ---
V('usa_mbt', { L: 34, W: 16, tx: -1.5, gx: 10.5, gl: 21, gd: 1.5, hull(p, f) {
  trackedHull(p, f, { L: 34, W: 16, front: 6, skirtF: 3.5, panel: 3.4 });
  grille(p, -16.6, -4, 6.5, 8, 7, 'y'); p.rect(-17, -2, 0.8, 4, M('#1a1a18', 0.4, { e: 0.15 })); // turbine exhaust
  hatch(p, 13.5, 0, 1.3, f); p.rect(11.8, -1.6, 0.8, 3.2, M(GLASS, 0.75, { s: 0.9 }));
  boxes(p, -9, -7.6, 12, 1.6, f, 3, 0.55); boxes(p, -9, 6.0, 12, 1.6, f, 3, 0.55);
}, tur(p, f) {
  p.poly([-10.5, -7.3, -17.5, -7.3, -17.5, 7.3, -10.5, 7.3], M('#2e2f2a', 0.62)); // bustle rack
  for (let x = -17; x < -10.5; x += 1.6) p.line([x, -7.2, x, 7.2], 0.25, M('#4a4a40', 0.75));
  p.rect(-16.8, -6.4, 2.6, 4.5, M('#6b6a4a', 0.78), 0.8); p.rect(-14, -5.5, 3.2, 3.8, M('#5f6142', 0.8), 0.9); p.rect(-16.5, 1.2, 5.6, 4.8, M('#7a7356', 0.8), 1.0);
  facet(p, [11, -3.8, 7.5, -7.6, -8, -7.9, -10.6, -7.1, -10.6, 7.1, -8, 7.9, 7.5, 7.6, 11, 3.8], f, 0.86, 0.58, 2.2);
  p.poly([11, -3.8, 7.5, -7.6, 6, -7.6, 9, -3.4], HO(0.72)); p.poly([11, 3.8, 7.5, 7.6, 6, 7.6, 9, 3.4], HO(0.72));
  p.rect(9.2, -2.7, 2.6, 5.4, M('#3e3f38', 0.9), 0.4); // mantlet
  p.rect(3.2, 2.4, 3.6, 2.6, fpaint(f, 0.98)); p.rect(5.6, 2.8, 1.1, 1.8, M(GLASS, 1, { s: 0.9 })); // GPS
  rws(p, -3.6, 4.2, f, 0.1); hatch(p, -2.6, -4.2, 1.5, f); p.line([-1.6, -4.4, 3, -5.2], 0.35, M(STEEL, 0.97));
  p.rect(-1, -6.4, 2.6, 1.8, fpaint(f, 0.97), 0.3); // CITV
  smokeLaunchers(p, 6, -6.9, 4, -0.5); smokeLaunchers(p, 6, 6.9, 4, 0.5);
  teamFlag(p, -10.2, -2.2, 1.6, 4.4); p.grain(0.18);
}, gun(p) { barrelArt(p, 21, 1.5, { evac: 0.5, sleeve: 4.2, mrs: 1 }); } });
V('usa_tank2', { L: 30, W: 14.5, tx: 0, gx: 8.5, gl: 17.5, gd: 1.3, hull(p, f) {
  trackedHull(p, f, { L: 30, W: 14.5, front: 6, skirtF: 3, panel: 3.6 });
  grille(p, -14.2, -3.5, 5, 7, 6, 'y'); hatch(p, 11.8, -2.6, 1.2, f); boxes(p, -8, -7, 10, 1.4, f, 2);
}, tur(p, f) {
  facet(p, [9, -4, 6, -6.6, -8, -6.6, -10.5, -5.2, -10.5, 5.2, -8, 6.6, 6, 6.6, 9, 4], f, 0.84, 0.56, 2.2);
  p.rect(-14, -5, 3.6, 10, M('#2e2f2a', 0.6)); for (let x = -13.6; x < -10.6; x += 1.2) p.line([x, -5, x, 5], 0.22, M('#4a4a40', 0.72)); p.rect(-13.4, -3.8, 2.8, 3.4, M('#666346', 0.75), 0.7);
  p.rect(7.4, -2.3, 2.3, 4.6, M('#3e3f38', 0.88), 0.4); rws(p, -2.5, 3.8, f, 0); hatch(p, -2, -3.6, 1.3, f);
  p.rect(2.5, 2.2, 2.6, 2, fpaint(f, 0.95)); smokeLaunchers(p, 4.5, -6, 3, -0.4); smokeLaunchers(p, 4.5, 6, 3, 0.4); teamFlag(p, -10.2, -1.8, 1.4, 3.6); p.grain(0.18);
}, gun(p) { barrelArt(p, 17.5, 1.3, { evac: 0.45, brake: 1 }); } });
V('usa_ifv', { L: 28, W: 14, tx: 1, gx: 3.2, gl: 11, gd: 0.75, hull(p, f) {
  trackedHull(p, f, { L: 28, W: 14, front: 7, skirtF: 2.5, panel: 3.2 });
  p.rect(-13.2, -4.8, 3.5, 9.6, fpaint(f, 0.55)); p.rect(-14, -3.5, 1.2, 7, M('#2a2a26', 0.6)); // ramp
  grille(p, 7, 1, 4, 4, 4); hatch(p, 9.5, -3.2, 1.2, f); hatch(p, -9, -3, 1.2, f); hatch(p, -9, 3, 1.2, f);
  boxes(p, -6, -6.5, 9, 1.3, f, 2);
}, tur(p, f) {
  facet(p, [5.5, -3.4, 3.8, -5, -5, -5, -6, -3.6, -6, 3.6, -5, 5, 3.8, 5, 5.5, 3.4], f, 0.86, 0.58, 2.2);
  p.rect(-5, -7.6, 8.5, 2.6, fpaint(f, 0.86), 0.5); p.circ(3.4, -6.9, 0.6, M('#141414', 0.7)); p.circ(3.4, -5.7, 0.6, M('#141414', 0.7)); // TOW box
  hatch(p, -2, 2.2, 1.3, f); p.rect(0.5, -2.8, 2.3, 1.6, M(GLASS, 0.95, { s: 0.9 })); teamFlag(p, -5.8, -1.6, 1.2, 3.2); p.grain(0.18);
}, gun(p) { barrelArt(p, 11, 0.75, {}); } });
V('usa_scout', { L: 24, W: 11, tx: -2, gx: 0.4, gl: 5.5, gd: 0.5, hull(p, f) {
  wheeledHull(p, f, { L: 24, W: 11, axles: 2, axleX: [-6.5, 7], nose: 6.5, ww: 2.6, wl: 3.8 });
  p.rect(5, -3.6, 6, 7.2, Object.assign(fpaint(f, 0.6), { hg: [11, 0, 0.5, 5, 0, 0.62] }), 0.8); grille(p, 10, -2, 1.2, 4, 3, 'y');
  p.rect(-6, -4.5, 11.5, 9, fpaint(f, 0.82), 0.8); p.rect(3.4, -3.7, 1.7, 7.4, M(GLASS, 0.8, { s: 0.95 }), 0.3);
  p.rect(-11.5, -4.2, 5, 8.4, fpaint(f, 0.55), 0.4); p.rect(-11, -3.5, 4, 7, M('#5d5a45', 0.62), 0.5);
}, tur(p, f) { p.poly([2.5, -2.8, 0.5, -3.6, -2.2, -3.2, -2.2, 3.2, 0.5, 3.6, 2.5, 2.8], fpaint(f, 0.97)); p.circ(-0.3, 0, 1.4, M('#2c2c28', 0.95)); teamFlag(p, -2, -0.7, 0.8, 1.4); }, gun(p) { autoBarrel(p, 0, 0, 5.2, 0.55); p.rect(-0.8, -0.6, 1.6, 1.2, M(STEEL, 1)); } });
// (artillery, rocket launcher and air-defence art: see 05e_art_arty.js)
// --- RUSSIA ---
V('rus_mbt', { L: 32, W: 16, tx: 0.5, gx: 9.5, gl: 22, gd: 1.55, hull(p, f) {
  trackedHull(p, f, { L: 32, W: 16, front: 6.5, skirtF: 3, panel: 2.8 });
  era(p, 11, -5.2, 3, 7, 1.3, 1.25, f, 0.6, 0.25); // glacis ERA
  grille(p, -15.5, -4.8, 7, 9.6, 8, 'y'); p.rect(-15.6, -7.6, 3.5, 1.6, M('#3a3a34', 0.6)); p.rect(-15.6, 6, 3.5, 1.6, M('#3a3a34', 0.6));
  cylY(p, -14.5, -6.8, -3.2, 1.5, '#4b5536', 0.4, 0.85); cylY(p, -14.5, 3.2, 6.8, 1.5, '#4b5536', 0.4, 0.85); // fuel drums
  hatch(p, 13.8, 0, 1.2, f); boxes(p, -6, -7.6, 10, 1.4, f, 3); boxes(p, -6, 6.2, 10, 1.4, f, 3);
}, tur(p, f) {
  p.poly([-8.5, -7, -14.2, -6.4, -14.2, 6.4, -8.5, 7], Object.assign(fpaint(f, 0.66))); slat(p, -14.6, -6.6, 0.7, 13.2, true); // bustle + slats
  facet(p, [10.5, -2.8, 7.5, -8.2, -5, -8.6, -8.5, -7.2, -8.5, 7.2, -5, 8.6, 7.5, 8.2, 10.5, 2.8], f, 0.84, 0.56, 2.2);
  // Relikt ERA "brow" panels
  p.poly([10.5, -2.8, 7.5, -8.2, 4.2, -8.0, 7.6, -2.6], fpaint(f, 0.86)); p.poly([10.5, 2.8, 7.5, 8.2, 4.2, 8.0, 7.6, 2.6], fpaint(f, 0.86));
  for (let k = 0; k < 4; k++) { p.line([9.8 - k * 0.9, -3.4 - k * 1.25, 6.9 - k * 0.9, -3.2 - k * 1.25], 0.12, AL('rgba(0,0,0,0.4)')); p.line([9.8 - k * 0.9, 3.4 + k * 1.25, 6.9 - k * 0.9, 3.2 + k * 1.25], 0.12, AL('rgba(0,0,0,0.4)')); }
  era(p, -1.5, -7.6, 3, 1, 1.6, 1.2, f, 0.86); era(p, -1.5, 6.4, 3, 1, 1.6, 1.2, f, 0.86);
  p.rect(8.4, -2.4, 2.4, 4.8, M('#3e3f38', 0.9), 0.5);
  p.rect(1.5, -5.6, 3.2, 2.4, fpaint(f, 0.97)); p.rect(3.6, -5.2, 0.9, 1.6, M(GLASS, 1, { s: 0.9 })); // gunner sight
  dome(p, -1.8, 4, 1.9, fcol(f), 0.82, 0.98); p.rect(-0.4, 3.3, 1.6, 1.4, M(GLASS, 1, { s: 0.9 })); // commander sight
  rws(p, -5, 2.4, f, 0.2); hatch(p, -4.2, -3.8, 1.3, f); smokeLaunchers(p, 3.5, -8.4, 6, -0.12); smokeLaunchers(p, 3.5, 8.4, 6, 0.12);
  teamFlag(p, -8.2, -2, 1.5, 4); p.grain(0.2);
}, gun(p) { barrelArt(p, 22, 1.55, { sleeve: 3.6, evac: 0.55 }); } });
V('rus_tank2', { L: 37, W: 16.5, tx: -4, gx: 8, gl: 23, gd: 1.6, aps: 1, hull(p, f) {
  trackedHull(p, f, { L: 37, W: 16.5, front: 7.5, skirtF: 3, panel: 3.4 });
  for (let i = 0; i < 3; i++) hatch(p, 13.5, -4 + i * 4, 1.2, f); p.rect(10.5, -6, 1.2, 12, M(GLASS, 0.62, { s: 0.6 }));
  grille(p, -17.5, -5, 6, 10, 7, 'y'); slat(p, -18.6, -7.5, 1, 15, true); boxes(p, -9, -7.8, 12, 1.5, f, 3); boxes(p, -9, 6.3, 12, 1.5, f, 3);
}, tur(p, f) {
  facet(p, [8.5, -3.2, 6, -7, -9.5, -7, -11.5, -5, -11.5, 5, -9.5, 7, 6, 7, 8.5, 3.2], f, 0.82, 0.54, 2.2);
  p.poly([6, -7, -9.5, -7, -9.5, -6, 5.5, -6], HO(0.7)); p.poly([6, 7, -9.5, 7, -9.5, 6, 5.5, 6], HO(0.7));
  for (const sy of [-1, 1]) { for (let i = 0; i < 5; i++) p.circ(-2 + i * 1.2, sy * 6.2, 0.5, M('#2a2a26', 0.9)); p.rect(-3.2, sy * 6.2 - 0.9, 6.6, 1.8, HO(0.85)); } // Afganit tubes
  p.rect(5.5, -6.6, 2, 1.6, M('#2b3a40', 0.95, { s: 0.9 })); p.rect(5.5, 5, 2, 1.6, M('#2b3a40', 0.95, { s: 0.9 })); p.rect(-11, -6.6, 1.8, 1.6, M('#2b3a40', 0.9)); p.rect(-11, 5, 1.8, 1.6, M('#2b3a40', 0.9));
  p.rect(7, -2.2, 2.2, 4.4, M('#3e3f38', 0.9), 0.4); rws(p, -6, 0, f, 0); p.rect(-0.5, -3.6, 3, 2, M(GLASS, 0.96, { s: 0.9 })); p.rect(-0.5, 1.6, 3, 2, fpaint(f, 0.95));
  teamFlag(p, -11.2, -1.8, 1.4, 3.6); p.grain(0.18);
}, gun(p) { barrelArt(p, 23, 1.6, { sleeve: 3.5, evac: 0.52 }); } });
V('rus_ifv', { L: 29, W: 14.5, tx: 2, gx: 5, gl: 9, gd: 1.4, hull(p, f) {
  trackedHull(p, f, { L: 29, W: 14.5, front: 6, skirt: false });
  p.rect(12.5, -6, 1.5, 12, fpaint(f, 0.42), 0.4); // trim vane
  grille(p, -13.5, -4.8, 5, 9.6, 6, 'y'); hatch(p, 10.3, -4.2, 1.1, f); hatch(p, 10.3, 0, 1.1, f); hatch(p, 10.3, 4.2, 1.1, f);
  p.rect(-8, -6, 4, 2.2, fpaint(f, 0.58), 0.3); p.rect(-8, 3.8, 4, 2.2, fpaint(f, 0.58), 0.3); boxes(p, -3, -7, 8, 1.3, f, 2);
}, tur(p, f) {
  p.path(c => { c.moveTo(5.5, -3); c.quadraticCurveTo(6, -5.6, 2, -5.8); c.lineTo(-4.8, -5.3); c.quadraticCurveTo(-6.4, 0, -4.8, 5.3); c.lineTo(2, 5.8); c.quadraticCurveTo(6, 5.6, 5.5, 3); c.closePath(); }, Object.assign(fpaint(f, 0.82), { hr: [0, 0, 6.5, 0.86, 0.7] }));
  p.rect(4, -2, 2, 4, M('#3e3f38', 0.9), 0.4); hatch(p, -2, -2.8, 1.2, f); hatch(p, -2, 2.8, 1.2, f); p.rect(1, 2.4, 2.4, 1.8, M(GLASS, 0.95, { s: 0.9 }));
  smokeLaunchers(p, 0.5, -5.8, 3, 0); smokeLaunchers(p, 0.5, 5.8, 3, 0); teamFlag(p, -5.2, -1.2, 1, 2.4); p.grain(0.18);
}, gun(p) { barrelArt(p, 9, 1.4, { evac: 0.4 }); autoBarrel(p, 0, 1.6, 10.5, 0.55); } });
V('rus_scout', { L: 23, W: 11, tx: -2.5, gx: 0.4, gl: 6, gd: 0.5, hull(p, f) {
  wheeledHull(p, f, { L: 23, W: 11, axles: 2, axleX: [-6.5, 6.8], nose: 7 });
  p.path(c => { c.moveTo(4.5, -3.8); c.lineTo(9, -3.4); c.quadraticCurveTo(11.4, 0, 9, 3.4); c.lineTo(4.5, 3.8); c.closePath(); }, Object.assign(fpaint(f, 0.6), { hg: [11, 0, 0.48, 4.5, 0, 0.62] })); grille(p, 9.4, -1.6, 1, 3.2, 3, 'y');
  p.rect(-10.5, -4.6, 15.5, 9.2, fpaint(f, 0.84), 1.4); p.rect(2.6, -3.8, 1.8, 7.6, M(GLASS, 0.82, { s: 0.95 }), 0.4); p.rect(-10.7, -2.4, 0.8, 4.8, M('#3a3a34', 0.7));
}, tur(p, f) { p.circ(0, 0, 2.3, fpaint(f, 0.95)); p.rect(-1.6, -2.6, 2.4, 1.2, M('#3c3d36', 1)); teamFlag(p, -1.8, -0.6, 0.8, 1.2); }, gun(p) { autoBarrel(p, 0, 0, 6, 0.6); p.rect(-0.8, -0.7, 1.8, 1.4, M(STEEL, 1)); } });
// (artillery, rocket launcher and air-defence art: see 05e_art_arty.js)
// --- CHINA ---
V('chn_mbt', { L: 35, W: 16, tx: -1, gx: 11.5, gl: 22, gd: 1.55, hull(p, f) {
  trackedHull(p, f, { L: 35, W: 16, front: 7, skirtF: 3, panel: 3.4 }); era(p, 11.5, -5, 3, 7, 1.3, 1.2, f, 0.58);
  grille(p, -17, -4.6, 7, 9.2, 8, 'y'); hatch(p, 14.6, -2.6, 1.2, f); boxes(p, -8, -7.6, 12, 1.4, f, 3); boxes(p, -8, 6.2, 12, 1.4, f, 3);
}, tur(p, f) {
  p.poly([-9, -7.6, -16.5, -6.8, -16.5, 6.8, -9, 7.6], M('#33342e', 0.62)); for (let x = -16 ; x < -9; x += 1.5) p.line([x, -6.8, x, 6.8], 0.22, M('#4a4a40', 0.74)); p.rect(-15.8, -5.6, 5, 4.4, M('#596040', 0.78), 0.7);
  facet(p, [13.5, -1.4, 9, -8.4, -9.5, -8.6, -9.5, 8.6, 9, 8.4, 13.5, 1.4], f, 0.84, 0.56, 2.2);
  era(p, 3, -7.9, 4, 1, 1.4, 1.15, f, 0.9); era(p, 3, 6.75, 4, 1, 1.4, 1.15, f, 0.9);
  for (let k = 0; k < 3; k++) { p.poly([12.5 - k * 1.5, -1.2 - k * 1.9, 11.2 - k * 1.5, -3.2 - k * 1.9, 9.8 - k * 1.5, -2.9 - k * 1.9, 11 - k * 1.5, -0.9 - k * 1.9], fpaint(f, 0.86)); p.poly([12.5 - k * 1.5, 1.2 + k * 1.9, 11.2 - k * 1.5, 3.2 + k * 1.9, 9.8 - k * 1.5, 2.9 + k * 1.9, 11 - k * 1.5, 0.9 + k * 1.9], fpaint(f, 0.86)); }
  p.rect(10, -2.3, 2.3, 4.6, M('#3e3f38', 0.9), 0.4); p.rect(1, 3.6, 3.6, 2.6, M('#2b3036', 0.98, { s: 0.6 })); p.rect(3.5, 4, 1, 1.8, M('#6a1a10', 1, { e: 0.4 })); // laser dazzler
  dome(p, -3, -3.8, 2, fcol(f), 0.82, 0.97); p.rect(-1.6, -4.5, 1.4, 1.4, M(GLASS, 1, { s: 0.9 })); rws(p, -5.5, 3.6, f, 0.1);
  smokeLaunchers(p, 5.5, -8.5, 4, -0.1); smokeLaunchers(p, 5.5, 8.5, 4, 0.1); teamFlag(p, -9.2, -2, 1.5, 4); p.grain(0.2);
}, gun(p) { barrelArt(p, 22, 1.55, { sleeve: 3.8, evac: 0.55 }); } });
V('chn_tank2', { L: 31, W: 15, tx: 1, gx: 9, gl: 20.5, gd: 1.5, hull(p, f) {
  trackedHull(p, f, { L: 31, W: 15, front: 6, skirtF: 3, panel: 3 }); era(p, 10, -4.6, 3, 6, 1.25, 1.25, f, 0.58);
  grille(p, -15, -4.4, 6, 8.8, 7, 'y'); cylY(p, -14.2, -6.4, -3.6, 1.3, '#4e5638', 0.4, 0.85); cylY(p, -14.2, 3.6, 6.4, 1.3, '#4e5638', 0.4, 0.85); hatch(p, 13, 0, 1.1, f);
}, tur(p, f) {
  p.path(c => { c.moveTo(9.5, -2.4); c.quadraticCurveTo(8, -7.8, 1, -8); c.quadraticCurveTo(-8.4, -8, -9.6, -3); c.lineTo(-9.6, 3); c.quadraticCurveTo(-8.4, 8, 1, 8); c.quadraticCurveTo(8, 7.8, 9.5, 2.4); c.closePath(); }, Object.assign(fpaint(f, 0.82), { hr: [0, 0, 9.5, 0.86, 0.66] }));
  for (const s of [-1, 1]) { p.poly([9.5, s * 2.4, 6.2, s * 7, 3.4, s * 6.4, 6.8, s * 2.1], fpaint(f, 0.88)); p.line([8.4, s * 3.4, 5.6, s * 5.4], 0.14, AL('rgba(0,0,0,0.4)')); }
  p.rect(8, -2.2, 2.2, 4.4, M('#3e3f38', 0.9), 0.4); mgOnRing(p, -3, 3.6, 1.9, f); hatch(p, -3.5, -3.6, 1.3, f); p.rect(2.5, -5.4, 2.8, 2, fpaint(f, 0.97));
  smokeLaunchers(p, 3, -8, 4, -0.15); smokeLaunchers(p, 3, 8, 4, 0.15); teamFlag(p, -9.4, -1.8, 1.3, 3.6); p.grain(0.2);
}, gun(p) { barrelArt(p, 20.5, 1.5, { sleeve: 3.5, evac: 0.55 }); } });
V('chn_ifv', { L: 29, W: 14.5, tx: 2, gx: 5, gl: 9, gd: 1.4, hull(p, f) {
  trackedHull(p, f, { L: 29, W: 14.5, front: 6.5, skirtF: 2.5, panel: 3 }); p.rect(11, -5.6, 1.4, 11.2, fpaint(f, 0.44), 0.3);
  for (let i = -12; i < 8; i += 3) { p.rect(i, -7.3, 2.6, 1.4, fpaint(f, 0.52), 0.2); p.rect(i, 5.9, 2.6, 1.4, fpaint(f, 0.52), 0.2); }
  grille(p, -13.5, -4.6, 5, 9.2, 6, 'y'); hatch(p, 9.4, -3.8, 1.1, f); hatch(p, 9.4, 3.8, 1.1, f);
}, tur(p, f) {
  facet(p, [6, -3.4, 3.2, -5.8, -4.5, -5.8, -6, -4.2, -6, 4.2, -4.5, 5.8, 3.2, 5.8, 6, 3.4], f, 0.86, 0.58, 2.2);
  era(p, 0.5, -5.6, 2, 1, 1.4, 1, f, 0.88); era(p, 0.5, 4.6, 2, 1, 1.4, 1, f, 0.88);
  p.rect(4.4, -2, 2, 4, M('#3e3f38', 0.9), 0.4); hatch(p, -2.5, -2.6, 1.2, f); hatch(p, -2.5, 2.6, 1.2, f); p.rect(0.6, 2.6, 2.2, 1.6, M(GLASS, 0.95, { s: 0.9 }));
  teamFlag(p, -5.8, -1.2, 1, 2.4); p.grain(0.18);
}, gun(p) { barrelArt(p, 9, 1.4, { evac: 0.4 }); autoBarrel(p, 0, -1.6, 10.5, 0.55); } });
V('chn_scout', { L: 24, W: 11.5, tx: -2, gx: 0.4, gl: 6, gd: 0.5, hull(p, f) {
  wheeledHull(p, f, { L: 24, W: 11.5, axles: 2, axleX: [-6.8, 7], nose: 7.5 });
  p.rect(4, -4.6, 7.4, 9.2, Object.assign(fpaint(f, 0.58), { hg: [11.4, 0, 0.5, 4, 0, 0.6] }), 0.5); grille(p, 10.4, -3, 1, 6, 5, 'y');
  p.rect(-6.5, -4.8, 11, 9.6, fpaint(f, 0.8), 0.6); p.rect(2.6, -4, 1.6, 8, M(GLASS, 0.82, { s: 0.95 }), 0.3); p.rect(-11.6, -4.8, 5.2, 9.6, fpaint(f, 0.55), 0.3);
}, tur(p, f) { p.circ(0, 0, 2.2, M('#33342f', 0.95)); p.rect(-0.6, -2.4, 1.6, 4.8, fpaint(f, 0.97)); teamFlag(p, -1.9, -0.6, 0.8, 1.2); }, gun(p) { autoBarrel(p, 0, 0, 6, 0.55); p.rect(-0.8, -0.6, 1.6, 1.2, M(STEEL, 1)); } });
// (artillery, rocket launcher and air-defence art: see 05e_art_arty.js)
// --- EU ---
V('eu_mbt', { L: 35, W: 16, tx: -1, gx: 12, gl: 24, gd: 1.5, hull(p, f) {
  trackedHull(p, f, { L: 35, W: 16, front: 5.5, skirtF: 3, panel: 3.6 }); p.rect(14, -5, 1.6, 10, fpaint(f, 0.48));
  grille(p, -17, -5, 7.5, 10, 9, 'y'); hatch(p, 13.6, -3.5, 1.2, f); boxes(p, -8, -7.7, 13, 1.5, f, 3); boxes(p, -8, 6.2, 13, 1.5, f, 3);
}, tur(p, f) {
  p.rect(-15.5, -6.6, 4.5, 13.2, fpaint(f, 0.72), 0.4); p.rect(-15.2, -6, 2.4, 3.6, M('#34352e', 0.8));
  facet(p, [16, -2.2, 7.5, -8.2, -11.5, -8.2, -11.5, 8.2, 7.5, 8.2, 16, 2.2], f, 0.86, 0.58, 2.2);
  p.poly([16, -2.2, 7.5, -8.2, 4.6, -8.2, 4.6, -2.5, 12, -2.4], HO(0.86)); p.poly([16, 2.2, 7.5, 8.2, 4.6, 8.2, 4.6, 2.5, 12, 2.4], HO(0.86));
  p.line([15.5, -2.4, 7.4, -7.9], 0.16, AL('rgba(0,0,0,0.35)')); p.line([15.5, 2.4, 7.4, 7.9], 0.16, AL('rgba(0,0,0,0.35)'));
  p.rect(9.5, -2.2, 3.4, 4.4, M('#3e3f38', 0.9), 0.4);
  p.rect(-4, 3.4, 2.8, 2.8, fpaint(f, 0.98)); p.circ(-2.6, 4.8, 1.1, M('#28343c', 1, { s: 0.9 })); // PERI sight
  rws(p, -6.5, -3.6, f, 0); hatch(p, -7, 3.8, 1.3, f); p.rect(2, -5.6, 2.8, 2, fpaint(f, 0.96)); smokeLaunchers(p, 0, -8.6, 4, 0); smokeLaunchers(p, 0, 8.6, 4, 0);
  teamFlag(p, -11.2, -2, 1.5, 4); p.grain(0.18);
}, gun(p) { barrelArt(p, 24, 1.5, { sleeve: 4.2, evac: 0.48 }); } });
V('eu_tank2', { L: 29, W: 13, tx: -4, gx: 7.5, gl: 18, gd: 1.3, hull(p, f) {
  wheeledHull(p, f, { L: 29, W: 13, axles: 3, axleX: [-9, -1, 8], nose: 6, ww: 3, wl: 4.2 }); hatch(p, 11, -2.5, 1.1, f); grille(p, -13.8, -3.6, 3.6, 7.2, 5, 'y');
}, tur(p, f) {
  p.path(c => { c.moveTo(8, -3.4); c.lineTo(5, -6.2); c.lineTo(-6, -6.2); c.quadraticCurveTo(-9, -6, -9, -2); c.lineTo(-9, 2); c.quadraticCurveTo(-9, 6, -6, 6.2); c.lineTo(5, 6.2); c.lineTo(8, 3.4); c.closePath(); }, Object.assign(fpaint(f, 0.82), { hg: [8, 0, 0.7, 0, 0, 0.84] }));
  p.rect(6.5, -2, 2, 4, M('#3e3f38', 0.9), 0.4); hatch(p, -3, -3, 1.3, f); hatch(p, -3, 3, 1.2, f); p.rect(1, 3.5, 2.6, 1.8, M(GLASS, 0.95, { s: 0.9 })); smokeLaunchers(p, 1, -6.4, 3, 0); smokeLaunchers(p, 1, 6.4, 3, 0);
  teamFlag(p, -8.8, -1.6, 1.2, 3.2); p.grain(0.18);
}, gun(p) { barrelArt(p, 18, 1.3, { brake: 1, evac: 0.5 }); } });
V('eu_ifv', { L: 30, W: 15.5, tx: 0, gx: 4, gl: 13, gd: 0.8, hull(p, f) {
  trackedHull(p, f, { L: 30, W: 15.5, front: 6, skirtF: 2, skirtR: 1, panel: 2.6 });
  p.rect(-14, -5.6, 26, 11.2, fpaint(f, 0.6), 0.6); grille(p, 7.5, -5, 4, 4, 4); hatch(p, 11.4, 3.2, 1.1, f); hatch(p, -11, -3, 1.2, f); hatch(p, -11, 3, 1.2, f);
}, tur(p, f) {
  facet(p, [6, -3.2, 4.5, -4.6, -5, -4.6, -6.5, -3.5, -6.5, 3.5, -5, 4.6, 4.5, 4.6, 6, 3.2], f, 0.82, 0.54, 2.2);
  p.rect(-4.5, -7.2, 7, 2.4, M('#3f4138', 0.86), 0.5); p.circ(2, -6, 0.75, M('#151515', 0.9)); p.circ(0.2, -6, 0.75, M('#151515', 0.9)); // Spike launcher
  p.rect(-3, 1.6, 3, 2.2, M(GLASS, 0.95, { s: 0.9 })); p.rect(-6, -1.2, 1.4, 2.4, fpaint(f, 0.86)); teamFlag(p, -6.3, -1.3, 1.1, 2.6); p.grain(0.15);
}, gun(p) { autoBarrel(p, 0, 0, 13, 0.85); } });
V('eu_scout', { L: 22, W: 11, tx: 1, gx: 0.4, gl: 5.5, gd: 0.5, hull(p, f) {
  wheeledHull(p, f, { L: 22, W: 11, axles: 2, axleX: [-6, 6.5], nose: 8, ww: 2.8 });
  facet(p, [3, -4.4, 11, -2.6, 11, 2.6, 3, 4.4], f, 0.62, 0.34, 2.2);
  p.rect(-9, -4.6, 12.5, 9.2, fpaint(f, 0.7), 0.8); p.rect(1.5, -3.6, 1.6, 7.2, M(GLASS, 0.74, { s: 0.95 }), 0.3);
  p.rect(-8, -1.2, 8, 2.4, M('#4a4c42', 0.82), 0.4); p.rect(-8.6, -1.6, 2.6, 3.2, M('#2b343a', 0.9, { s: 0.8 }), 0.3); // folded sensor mast
}, tur(p, f) { p.rect(-1.4, -1.6, 2.8, 3.2, fpaint(f, 0.92), 0.5); p.rect(-0.6, -1.2, 1.2, 1, M(GLASS, 1, { s: 0.9 })); teamFlag(p, -1.3, 0.4, 0.8, 1); }, gun(p) { autoBarrel(p, 0, 0, 5.5, 0.55); } });
// (artillery, rocket launcher and air-defence art: see 05e_art_arty.js)
// --- ARAB COALITION ---
V('arb_mbt', { L: 32, W: 15.5, tx: 0.5, gx: 8.5, gl: 22.5, gd: 1.5, hull(p, f) {
  trackedHull(p, f, { L: 32, W: 15.5, front: 6.5, skirtF: 3, panel: 3.2 }); hatch(p, 13, -3, 1.2, f);
  grille(p, -15.6, -5, 6.5, 10, 8, 'y'); boxes(p, -7, -7.4, 11, 1.4, f, 3); boxes(p, -7, 6, 11, 1.4, f, 3);
}, tur(p, f) {
  facet(p, [-6, -7.4, -17.5, -6.9, -17.5, 6.9, -6, 7.4], f, 0.82, 0.54, 2.2); // autoloader bustle
  p.line([-12, -6.9, -12, 6.9], 0.18, AL('rgba(0,0,0,0.35)'));
  facet(p, [9.5, -5, 7.5, -8, -6, -8.2, -6, 8.2, 7.5, 8, 9.5, 5], f, 0.86, 0.58, 2.2);
  p.rect(7.3, -2.4, 2.6, 4.8, M('#3e3f38', 0.9), 0.4);
  dome(p, 1.5, -4.6, 1.8, fcol(f), 0.85, 1); p.rect(2.6, -5.2, 1, 1.2, M(GLASS, 1, { s: 0.9 })); // HL-70 sight
  p.rect(2.5, 3, 3, 2.6, fpaint(f, 0.98)); p.rect(4.6, 3.4, 0.9, 1.8, M(GLASS, 1, { s: 0.9 }));
  hatch(p, -3, -4, 1.4, f); hatch(p, -3, 4, 1.3, f); p.line([-2, 4.3, 2, 5.6], 0.3, M(STEEL, 0.97)); smokeLaunchers(p, 4, -8.3, 5, 0); smokeLaunchers(p, 4, 8.3, 5, 0);
  teamFlag(p, -17.2, -2, 1.5, 4); p.grain(0.16);
}, gun(p) { barrelArt(p, 22.5, 1.5, { sleeve: 4 }); } });
V('arb_tank2', { L: 33, W: 16, tx: 0, gx: 9, gl: 19, gd: 1.45, hull(p, f) {
  trackedHull(p, f, { L: 33, W: 16, front: 6.5, skirt: false }); p.path(c => { c.moveTo(16.5, -5); c.quadraticCurveTo(18, 0, 16.5, 5); c.lineTo(15, 5); c.lineTo(15, -5); c.closePath(); }, fpaint(f, 0.42));
  grille(p, -16, -5, 6, 10, 7, 'y'); hatch(p, 13.5, 0, 1.2, f); boxes(p, -6, -7.8, 10, 1.4, f, 2); boxes(p, -6, 6.4, 10, 1.4, f, 2);
}, tur(p, f) {
  p.path(c => { c.moveTo(9.5, -3); c.quadraticCurveTo(9, -8.6, 0, -8.8); c.quadraticCurveTo(-10, -8.6, -11, -3); c.lineTo(-11, 3); c.quadraticCurveTo(-10, 8.6, 0, 8.8); c.quadraticCurveTo(9, 8.6, 9.5, 3); c.closePath(); }, Object.assign(fpaint(f, 0.84), { hr: [-0.5, 0, 10.5, 0.9, 0.62] }));
  p.rect(-14.5, -6.5, 3.6, 13, M('#33342e', 0.62)); for (let y = -6; y < 6.5; y += 1.4) p.line([-14.5, y, -11, y], 0.2, M('#4a4a40', 0.7));
  p.rect(9, -3.6, 3.2, 3, M('#3b3c36', 0.98), 0.3); p.rect(11.2, -3.2, 0.8, 2.2, M('#d8d4c0', 1, { s: 1 })); // searchlight
  p.rect(8, -2.2, 2.2, 4.4, M('#3e3f38', 0.9), 0.4);
  p.circ(-3.5, 4, 2.6, fpaint(f, 0.97)); p.circ(-3.5, 4, 1.7, M('#3d3e37', 1)); p.line([-2.5, 4, 3, 4.6], 0.4, M(STEEL, 1)); // M19 cupola + .50
  hatch(p, -3.5, -4.2, 1.3, f); teamFlag(p, -10.7, -1.8, 1.3, 3.6); p.grain(0.2);
}, gun(p) { barrelArt(p, 19, 1.45, { evac: 0.55 }); } });
V('arb_ifv', { L: 30, W: 13, tx: 1, gx: 5, gl: 9, gd: 1.4, hull(p, f) {
  wheeledHull(p, f, { L: 30, W: 13, axles: 4, nose: 6 }); hatch(p, 11.5, -2.8, 1.1, f); grille(p, 8, 1, 3.6, 3.6, 4); p.rect(-15, -3.6, 1.4, 7.2, M('#3a3a34', 0.6)); hatch(p, -10, -2.8, 1.1, f); hatch(p, -10, 2.8, 1.1, f);
}, tur(p, f) {
  p.path(c => { c.moveTo(5.5, -3); c.quadraticCurveTo(6, -5.6, 2, -5.8); c.lineTo(-4.8, -5.3); c.quadraticCurveTo(-6.4, 0, -4.8, 5.3); c.lineTo(2, 5.8); c.quadraticCurveTo(6, 5.6, 5.5, 3); c.closePath(); }, Object.assign(fpaint(f, 0.82), { hr: [0, 0, 6.5, 0.86, 0.7] }));
  p.rect(4, -2, 2, 4, M('#3e3f38', 0.9), 0.4); hatch(p, -2, -2.8, 1.2, f); hatch(p, -2, 2.8, 1.2, f); rws(p, -3.8, 0, f, 0); teamFlag(p, -5.2, -1.2, 1, 2.4); p.grain(0.18);
}, gun(p) { barrelArt(p, 9, 1.4, { evac: 0.4 }); autoBarrel(p, 0, 1.6, 10.5, 0.55); } });
V('arb_scout', { L: 23, W: 11.5, tx: -3, gx: 0.4, gl: 6, gd: 0.5, hull(p, f) {
  wheeledHull(p, f, { L: 23, W: 11.5, axles: 2, axleX: [-6.5, 6.8], nose: 6 });
  p.rect(5, -4.2, 6, 8.4, Object.assign(fpaint(f, 0.6), { hg: [11, 0, 0.5, 5, 0, 0.6] }), 0.6); grille(p, 10.1, -2.2, 1, 4.4, 4, 'y');
  p.rect(-10.8, -4.9, 16, 9.8, fpaint(f, 0.84), 0.6); p.rect(3.2, -4.1, 1.8, 8.2, M(GLASS, 0.82, { s: 0.95 }), 0.3);
}, tur(p, f) { p.rect(-2, -2, 4, 4, fpaint(f, 0.95), 0.6); p.rect(-0.4, -1.5, 1.6, 1, M(GLASS, 1, { s: 0.9 })); teamFlag(p, -1.9, 0.6, 0.8, 1.2); }, gun(p) { autoBarrel(p, 0, 0, 6, 0.6); } });
// (artillery, rocket launcher and air-defence art: see 05e_art_arty.js)

/* ---- supply trucks & machines (shared shapes, faction paint) ---- */
function supplyTruck(id) { V(id, { L: 30, W: 11, hull(p, f) {
  wheeledHull(p, f, { L: 30, W: 11, axles: 4, axleX: [-11, -6.5, 6, 10.5], nose: 2 }); truckCab(p, f, 7.5, 11, 7.5, { armored: f === 'usa' || f === 'rus' });
  p.rect(-15, -5, 22, 10, fpaint(f, 0.55), 0.3); p.rect(-14.4, -4.4, 20.8, 8.8, M('#4a4a3e', 0.6), 0.2); for (let x = -14; x < 6; x += 2.5) p.line([x, -4.4, x, 4.4], 0.2, AL('rgba(0,0,0,0.3)'));
  teamFlag(p, -14.8, -1.5, 1.2, 3);
} }); }
for (const f of FACTION_IDS) supplyTruck(f + '_supply');
// armoured 8×8 supply truck: armoured cab and cargo module, ring-mounted heavy machine gun on the cab roof
function supplyTruck2(id) { V(id, { L: 36, W: 14, tx: 8, gx: 0.6, gl: 5.6, gd: 0.5, hull(p, f) {
  wheeledHull(p, f, { L: 36, W: 14, axles: 4, axleX: [-13, -7.5, 5.5, 11.5], nose: 3, ww: 3.2, wl: 4.2 });
  facet(p, [17.6, -5.2, 17.6, 5.2, 15.6, 6.4, 4.4, 6.4, 4.4, -6.4, 15.6, -6.4], f, 0.84, 0.56, 1.6);
  p.rect(14.7, -4.5, 1.4, 9, M(GLASS, 0.9, { s: 0.9 }), 0.3); p.rect(16.9, -4.6, 0.7, 9.2, M('#2b2c27', 0.86), 0.2);
  facet(p, [3.6, -6.7, 3.6, 6.7, -17.6, 6.7, -17.6, -6.7], f, 0.68, 0.46, 1.4);
  for (let x = -15.4; x < 2.5; x += 3.6) p.line([x, -6.1, x, 6.1], 0.24, AL('rgba(0,0,0,0.3)'));
  p.rect(-16.8, -5.4, 6, 2.2, M('#4a4a3e', 0.74), 0.3); p.rect(-16.8, 3.2, 6, 2.2, M('#4a4a3e', 0.74), 0.3); boxes(p, -8.5, -7.1, 10, 1.2, f, 3, 0.7); boxes(p, -8.5, 5.9, 10, 1.2, f, 3, 0.7);
  hatch(p, -3, 0, 1.3, f); teamFlag(p, -17.3, -1.5, 1.2, 3); p.grain(0.15);
}, tur(p, f) { mgOnRing(p, 0, 0, 2.2, f); p.rect(-2.7, -2.9, 1.4, 5.8, fpaint(f, 0.9), 0.3); } }); }
for (const f of FACTION_IDS) supplyTruck2(f + '_supply2');
function hazard(p, x0, y0, x1, y1, w, n) { // yellow / black warning stripes along a segment
  const L = Math.hypot(x1 - x0, y1 - y0); n = n || Math.max(2, Math.round(L / 1.5));
  for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; p.line([x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1], w, M(i % 2 ? '#1f1f1c' : '#d2a52e', 0.66, { s: 0.2 })); }
}
// military engineering machines: faction paint, armoured cabs, warning stripes only where steel works the ground
function machineArt(f) {
  const mp = (h, ex) => fpaint(f, h, ex);
  V(f + '_eng', { L: 34, W: 16, tx: -6, ex: [-12, 5], hull(p) {
    trackedHull(p, f, { L: 34, W: 16, front: 5, skirtF: 3, panel: 3.4 });
    p.path(c => { c.moveTo(16, -9.2); c.quadraticCurveTo(18.6, 0, 16, 9.2); c.lineTo(17.5, 9.2); c.quadraticCurveTo(20.2, 0, 17.5, -9.2); c.closePath(); }, fpaint(f, 0.6, { hg: [16, 0, 0.75, 19, 0, 0.4] })); hazard(p, 18.9, -8.4, 18.9, 8.4, 0.55, 10);
    p.rect(4, -5.6, 7, 11.2, fpaint(f, 0.82), 0.6); p.rect(9.2, -4, 1.4, 8, M(GLASS, 0.9, { s: 0.9 })); grille(p, -16, -4.4, 6, 8.8, 6, 'y'); hatch(p, 6, -3, 1.2, f);
    rws(p, 7, 3.2, f, 0); // remote weapon station: the vehicle defends itself
  }, tur(p) {
    p.rect(-4, -3.5, 8, 7, fpaint(f, 0.82), 0.8); p.rect(0, -1.2, 16, 2.4, mp(0.92), 0.4); hazard(p, 13, -1.2, 13, 1.2, 0.9, 2); p.rect(14.5, -2.2, 3, 4.4, M('#3a3935', 0.95), 0.4); teamFlag(p, -3.8, -1, 1, 2); p.grain(0.15);
  } });
}
for (const f of FACTION_IDS) machineArt(f);

/* ---- Infantry ---- */
const INF_KIT = { // role → silhouette parts
  rifle: { gun: 1 }, at: { at: 1 }, sniper: { snp: 1 }, spec: { gun: 1, dark: 1 }, aainf: { aa: 1 }, mortar: { mortar: 1 }, medic: { gun: 1, short: 1, medic: 1 }, el2: { tow: 1 }, jav: { tow: 1 }, eng: { gun: 1, short: 1, eng: 1 },
};
/* per-nation kit: real uniforms, helmets, vests and weapons (not a recolour) */
const INF_STY = {
  usa: { uni: 'u_usa', atgm: 'tow', helm: 'ech', hc: '#857555', vest: '#7c6d50', pouch: '#695c44', pack: '#73684d', glove: '#76664a', boot: '#6c5a40', gun: 'm4', at: 'jav', snp: 'm2010', aa: 'stinger', skin: '#c79f80', dkHelm: 'nvg4' },
  rus: { uni: 'u_rus', atgm: 'kornet', helm: 'ratnik', hc: '#56603f', vest: '#4c5438', pouch: '#41482f', pack: '#495135', glove: '#2b2c28', boot: '#25241f', gun: 'ak12', at: 'rpg29', snp: 'svd', aa: 'igla', skin: '#cfa68a', dkHelm: 'balaclava' },
  chn: { uni: 'u_chn', atgm: 'hj8', helm: 'qgf', hc: '#56603f', vest: '#4a5436', pouch: '#3e472d', pack: '#465030', glove: '#373a2c', boot: '#2b2a24', gun: 'qbz', at: 'pf98', snp: 'qbu', aa: 'fn6', skin: '#cca37e', dkHelm: 'nvg2' },
  eu: { uni: 'u_eu', atgm: 'mmp', helm: 'm92', hc: '#4c5437', vest: '#454b31', pouch: '#3a3f2a', pack: '#414731', glove: '#2a2b27', boot: '#262520', gun: 'g36', at: 'pzf', snp: 'g28', aa: 'mistral', skin: '#d6b296', dkHelm: 'nvg2' },
  arb: { uni: 'u_arb', atgm: 'kornet', helm: 'des', hc: '#b39e77', vest: '#a38f69', pouch: '#917e5b', pack: '#998660', glove: '#9c8762', boot: '#86714f', gun: 'g3', at: 'carl', snp: 'm24', aa: 'stinger', skin: '#a87f5f', scarf: '#d8d2c2', dkHelm: 'nvg2' },
};
CAMO.u_usa = { type: 'blotch', cols: ['#a49373', '#7d6d52', '#6f7353', '#c3b694'], seed: 41 };           // OCP / MultiCam
CAMO.u_rus = { type: 'digital', cols: ['#636b4c', '#454c35', '#8a876a', '#2e3026'], seed: 42, px: 3 };    // EMR "tsifra"
CAMO.u_chn = { type: 'digital', cols: ['#5b6744', '#3d482d', '#7f7b59', '#2b2f22'], seed: 43, px: 3 };    // Type 07 woodland
CAMO.u_eu = { type: 'flecks', cols: ['#6c7250', '#3c4a2e', '#5b4b35', '#1f241c'], seed: 44 };            // Flecktarn
CAMO.u_arb = { type: 'digital', cols: ['#c4b08a', '#a58e68', '#8a7455', '#dccca8'], seed: 45, px: 3 };    // desert digital
function gunTop(p, type, X, y, wood) {
  const BLK = '#1c1d1a', PLY = '#2b2c27', WD = '#7b4e2b', WD2 = '#8d5d34';
  const optic = (x) => { p.rect(x, y - 0.5, 1.25, 1.0, M('#121311', 0.98, { s: 0.5 }), 0.15); p.circ(x + 1.2, y, 0.26, M('#557282', 1, { s: 1 })); };
  if (type === 'm4') { p.rect(X - 2.0, y - 0.38, 1.8, 0.76, M(PLY, 0.85), 0.25); p.rect(X - 0.3, y - 0.36, 3.4, 0.72, M(BLK, 0.9, { s: 0.3 })); optic(X + 0.5); p.rect(X + 3.1, y - 0.42, 2.5, 0.84, M('#2f302a', 0.9)); p.line([X + 5.6, y, X + 6.8, y], 0.3, M('#151614', 0.9)); }
  else if (type === 'ak12') { p.rect(X - 2.2, y - 0.4, 2.0, 0.8, M(BLK, 0.84), 0.3); p.rect(X - 0.3, y - 0.4, 3.6, 0.8, M(BLK, 0.9, { s: 0.25 })); optic(X + 0.6); p.rect(X + 3.3, y - 0.45, 2.3, 0.9, M('#232421', 0.9)); p.rect(X + 5.6, y - 0.3, 1.2, 0.6, M('#111', 0.92)); p.rect(X + 6.6, y - 0.38, 0.5, 0.76, M('#0d0d0c', 0.95)); }
  else if (type === 'ak12s') { p.rect(X - 2.2, y - 0.4, 2.0, 0.8, M(BLK, 0.84), 0.3); p.rect(X - 0.3, y - 0.4, 3.6, 0.8, M(BLK, 0.9, { s: 0.25 })); optic(X + 0.6); p.rect(X + 3.3, y - 0.45, 2.3, 0.9, M('#232421', 0.9)); p.rect(X + 4.2, y + 0.4, 1.6, 0.55, M('#1a1b18', 0.86)); p.rect(X + 5.5, y - 0.42, 2.6, 0.84, M('#141512', 0.95, { s: 0.35 }), 0.35); } // suppressed, with GP-34 underneath
  else if (type === 'akm' || type === 'aks') { if (type === 'akm') p.poly([X - 2.4, y - 0.5, X - 0.2, y - 0.3, X - 0.2, y + 0.3, X - 2.4, y + 0.5], M(WD, 0.84, { s: 0.2 })); else { p.line([X - 2.4, y - 0.42, X - 0.2, y - 0.3], 0.18, M('#2a2a26', 0.85)); p.line([X - 2.4, y + 0.42, X - 0.2, y + 0.3], 0.18, M('#2a2a26', 0.85)); p.line([X - 2.4, y - 0.42, X - 2.4, y + 0.42], 0.2, M('#2a2a26', 0.85)); }
    p.rect(X - 0.3, y - 0.38, 3.2, 0.76, M('#262622', 0.9, { s: 0.35 })); p.rect(X + 2.9, y - 0.46, 2.3, 0.92, M(WD2, 0.9, { s: 0.2 })); p.line([X + 5.2, y, X + 6.7, y], 0.3, M('#141412', 0.9)); p.line([X + 3.0, y - 0.12, X + 5.4, y - 0.12], 0.16, AL('rgba(0,0,0,0.35)')); }
  else if (type === 'qbz') { p.rect(X - 1.9, y - 0.42, 2.0, 0.84, M('#41463a', 0.85), 0.35); p.rect(X + 0.1, y - 0.44, 4.2, 0.88, M('#3a3f34', 0.9, { s: 0.2 }), 0.25); optic(X + 1.0); p.line([X + 4.3, y, X + 6.4, y], 0.3, M('#151614', 0.9)); }
  else if (type === 'g36') { p.rect(X - 2.1, y - 0.4, 1.9, 0.8, M('#2c2e2b', 0.85), 0.25); p.rect(X - 0.2, y - 0.42, 4.6, 0.84, M('#30322e', 0.9, { s: 0.2 }), 0.25); p.rect(X + 0.4, y - 0.18, 2.6, 0.36, M('#454843', 0.99, { s: 0.3 })); p.line([X + 4.4, y, X + 6.6, y], 0.3, M('#151614', 0.9)); }
  else if (type === 'g3') { p.rect(X - 2.3, y - 0.42, 2.1, 0.84, M(BLK, 0.85), 0.2); p.rect(X - 0.2, y - 0.36, 3.4, 0.72, M('#222320', 0.9, { s: 0.3 })); p.rect(X + 3.2, y - 0.5, 2.6, 1.0, M('#262723', 0.9), 0.2); p.line([X + 5.8, y, X + 7.3, y], 0.3, M('#141412', 0.9)); optic(X + 0.6); }
}
function launcherTop(p, type, X, y) {
  if (type === 'jav') { cyl(p, X - 4.6, X + 5.4, y, 0.95, '#5e6346', 0.75, 0.96); p.rect(X - 0.6, y - 2.0, 2.8, 1.5, M('#3c3f33', 0.99), 0.3); p.circ(X + 0.8, y - 1.3, 0.35, M('#5b7a88', 1, { s: 0.9 })); }
  else if (type === 'rpg29') { cyl(p, X - 5, X + 5.6, y, 0.62, '#4b5240', 0.72, 0.95); p.rect(X + 0.5, y - 1.3, 1.4, 0.9, M('#2a2b25', 0.98)); p.rect(X - 1.2, y + 0.5, 0.6, 1.2, M('#222', 0.9)); }
  else if (type === 'pf98') { cyl(p, X - 4.8, X + 5.2, y, 0.8, '#3f4632', 0.72, 0.95); p.rect(X + 0.4, y - 1.5, 1.6, 1.0, M('#25281f', 0.98)); }
  else if (type === 'pzf') { cyl(p, X - 4.2, X + 3.4, y, 0.6, '#4a4f3a', 0.72, 0.94); p.circ(X + 4.4, y, 1.15, M('#5a5d46', 0.97, { s: 0.3 })); p.circ(X + 4.4, y, 0.6, HO(0.99)); p.rect(X + 0.4, y - 1.2, 1.2, 0.8, M('#2a2b25', 0.98)); }
  else if (type === 'carl') { cyl(p, X - 4.6, X + 4.8, y, 0.78, '#575a49', 0.72, 0.95); p.rect(X - 4.9, y - 1.0, 1.0, 2.0, M('#3a3b33', 0.9), 0.3); p.rect(X + 0.5, y - 1.5, 1.4, 0.9, M('#2a2b25', 0.98)); }
  else { /* rpg7 */ cyl(p, X - 4.4, X + 3.2, y, 0.5, '#4a4b44', 0.72, 0.94); p.rect(X - 1.2, y - 0.62, 2.2, 1.24, M('#7b4e2b', 0.95, { s: 0.2 })); p.poly([X + 3.2, y - 0.9, X + 5.4, y, X + 3.2, y + 0.9], M('#5d6448', 0.98, { s: 0.3 })); p.line([X + 5.3, y, X + 6.0, y], 0.22, M('#3b3b33', 0.98)); }
}
function sniperTop(p, type, X, y) {
  const st = type === 'm2010' ? '#8b7b5b' : type === 'svd' || type === 'svdw' ? '#7b4e2b' : type === 'qbu' ? '#41463a' : type === 'm24' ? '#6b6a4f' : '#2c2e2b';
  p.rect(X - 2.6, y - 0.45, 2.6, 0.9, M(st, 0.84, { s: 0.2 }), 0.3); p.rect(X - 0.2, y - 0.38, 4.6, 0.76, M(type === 'svdw' || type === 'svd' ? '#262622' : '#2a2b26', 0.9, { s: 0.3 }));
  p.rect(X + 0.3, y - 0.62, 3.0, 1.24, M('#111210', 0.98, { s: 0.6 }), 0.3); p.circ(X + 3.3, y, 0.38, M('#557282', 1, { s: 1 })); if (type === 'svd' || type === 'svdw') p.rect(X + 2.4, y - 0.52, 2.0, 1.04, M('#8d5d34', 0.9, { s: 0.2 }));
  p.line([X + 4.4, y, X + 8.6, y], 0.32, M('#161714', 0.9)); if (type !== 'svdw') { p.line([X + 4.8, y, X + 5.6, y - 1.1], 0.16, M('#2a2a26', 0.9)); p.line([X + 4.8, y, X + 5.6, y + 1.1], 0.16, M('#2a2a26', 0.9)); }
}
function aaTop(p, type, X, y) {
  const col = type === 'stinger' ? '#4f5440' : type === 'mistral' ? '#5a5f52' : '#4b5240';
  cyl(p, X - 4.8, X + 5.6, y, 0.72, col, 0.74, 0.95); p.circ(X + 5.2, y, 0.5, M('#d8d0b8', 0.97, { s: 0.6 }));
  if (type === 'stinger') { p.rect(X + 0.2, y - 2.3, 0.4, 1.8, M('#2a2c24', 0.98)); p.line([X + 0.4, y - 2.3, X + 2.2, y - 2.7], 0.16, M('#333', 0.99)); }
  else p.rect(X + 0.4, y - 1.4, 1.4, 0.9, M('#2a2c24', 0.98));
}
function helmetTop(p, st, kind, dark) {
  const rim = M('#1d1e1a', 0.86); const cover = kind === 'ratnik' || kind === 'qgf' || kind === 'm92' ? { c: camo(st.uni, 14), h: 0.98, hr: [-0.1, -0.5, 2.0, 1, 0.78], s: 0.05 } : M(st.hc, 0.98, { hr: [-0.1, -0.5, 1.9, 1, 0.78] });
  if (kind === 'shemagh' || kind === 'shemaghB') { const red = kind === 'shemaghB' ? '#1c1c1c' : st.hc2 || '#a3261f';
    p.circ(0.3, 0, 1.95, M('#3a3326', 0.86)); p.circ(0.35, 0, 1.78, { c: (ctx) => { const c2 = document.createElement('canvas'); c2.width = c2.height = 4; const x2 = c2.getContext('2d'); x2.fillStyle = '#e9e4d6'; x2.fillRect(0, 0, 4, 4); x2.fillStyle = red; x2.fillRect(0, 0, 2, 2); x2.fillRect(2, 2, 2, 2); const pt = ctx.createPattern(c2, 'repeat'); if (pt.setTransform) pt.setTransform(new DOMMatrix().scale(0.22)); return pt; }, h: 0.98, hr: [-0.1, -0.5, 1.9, 1, 0.8] });
    p.line([-1.2, -1.4, -2.7, -2.5], 0.62, M('#e0dacb', 0.7)); return; }
  if (kind === 'cap') { p.circ(0.25, 0, 1.78, M('#2b241c', 0.9)); p.circ(0.2, 0, 1.62, M(st.hc, 0.97, { hr: [-0.2, -0.4, 1.7, 1, 0.8] })); p.ell(1.75, 0, 0.85, 1.32, 0, M('#3b3a2c', 0.95)); return; }
  if (kind === 'beanie') { p.circ(0.25, 0, 1.8, M(st.hc, 0.96, { hr: [-0.2, -0.4, 1.8, 1, 0.82] })); for (let a = -1.2; a <= 1.2; a += 0.6) p.line([0.25 + Math.cos(a + Math.PI) * 1.75, Math.sin(a + Math.PI) * 1.75, 0.25 + Math.cos(a + Math.PI) * 0.9, Math.sin(a + Math.PI) * 0.9], 0.12, AL('rgba(255,255,255,0.08)')); return; }
  if (kind === 'balaclava') { p.circ(0.3, 0, 1.92, M('#141513', 0.9)); p.circ(0.32, 0, 1.75, M('#1e201d', 0.97, { s: 0.15 })); p.rect(1.2, -0.9, 0.6, 1.8, M('#0a0a0a', 0.99)); return; }
  p.circ(0.3, 0, kind === 'ratnik' ? 2.08 : 1.96, rim);
  if (dark) p.circ(0.35, 0, 1.78, M('#1f2220', 0.98, { s: 0.25 })); else p.circ(0.35, 0, kind === 'ratnik' ? 1.9 : 1.78, cover);
  if (kind === 'ratnik') p.spath(c => { c.arc(0.35, 0, 1.45, 0, TAU); }, 0.2, M('#3a412c', 0.99)); // retention band
  if (kind === 'm92') p.spath(c => { c.arc(0.35, 0, 1.5, 0, TAU); }, 0.22, M('#2c3324', 0.99));
  if (kind === 'qgf') p.path(c => { c.arc(0.35, 0, 1.96, -0.95, 0.95); c.arc(0.35, 0, 1.55, 0.95, -0.95, true); c.closePath(); }, M(st.hc, 0.9));
  if (kind === 'ech' || dark) { p.line([-0.9, -1.55, 1.2, -1.62], 0.18, M('#3a3428', 0.99)); p.line([-0.9, 1.55, 1.2, 1.62], 0.18, M('#3a3428', 0.99)); }
  if (kind === 'des') { p.rect(1.3, -1.5, 0.55, 3.0, M('#2a2a26', 0.99), 0.2); p.circ(1.6, -0.7, 0.42, M('#4f6a78', 1, { s: 1 })); p.circ(1.6, 0.7, 0.42, M('#4f6a78', 1, { s: 1 })); return; }
  if (dark && st.dkHelm === 'nvg4') { p.rect(1.5, -1.0, 0.9, 2.0, M('#0c0c0c', 1, { s: 0.5 })); for (const yy of [-0.65, -0.22, 0.22, 0.65]) p.circ(2.35, yy, 0.22, M('#3b5a3a', 1, { s: 1, e: 0.3 })); return; }
  p.rect(1.62, -0.45, 0.72, 0.9, M('#111', 1)); if (dark) p.rect(2.0, -0.8, 0.9, 1.6, M('#0c0c0c', 1, { s: 0.6 }));
}
// tripod anti-tank guided missile launchers: TOW-2 (M220), 9M133 Kornet, HJ-8, MMP firing post, 9P135 Konkurs
const ATGM_KIT = { tow: { L: 9.6, d: 1.7, col: '#4d5240', sight: [2.6, 1.7], tri: 1 }, kornet: { L: 8.2, d: 1.5, col: '#4a5038', sight: [2.2, 1.9], tri: 1, box: 1 }, hj8: { L: 8.8, d: 1.6, col: '#56604a', sight: [2.4, 1.6], tri: 1 }, mmp: { L: 7.8, d: 1.7, col: '#5b5d4c', sight: [3.0, 2.2], post: 1 }, konkurs: { L: 8.4, d: 1.45, col: '#53583f', sight: [2.0, 1.7], tri: 1 } };
function atgmKit(p, type, rec, walk) {
  const K = ATGM_KIT[type] || ATGM_KIT.tow;
  if (walk) { cyl(p, -3.4, -3.4 + K.L * 0.8, 1.7, K.d * 0.42, K.col, 0.86, 1.0); p.rect(-5.6, -2.3, 2.8, 4.6, M('#3e4034', 0.66), 0.6); for (const yy of [-1.2, 1.2]) p.line([-5.4, yy, -7.2, yy * 1.6], 0.3, M('#2e3029', 0.62)); return; } // tube on the shoulder, tripod on the back
  if (K.post) { p.rect(0.4, 0.2, 3.6, 3.4, M('#3c3e33', 0.52), 0.4); } else for (const [lx, ly] of [[1.5, 4.8], [1.5, -1.2], [-1.8, 3.2]]) p.line([3, 1.8, lx, ly], 0.35, M('#2e3029', 0.5));
  p.rect(-1 + rec, 1.85 - K.d / 2, K.L, K.d, M(K.col, 0.96, { s: 0.2 }), 0.7); p.rect(K.L - 3 + rec, 1.85 - K.d / 2 - 0.25, 2.2, K.d + 0.5, M(shade(K.col, -0.25), 0.98), 0.3); // tube + muzzle cap
  if (K.box) p.rect(2.2, 2.9, 2.4, 1.4, M('#2f3128', 0.96), 0.2);
  p.rect(1.2, 1.85 - K.d / 2 - K.sight[1], K.sight[0], K.sight[1], M('#2a2c26', 0.98), 0.25); p.circ(1.2 + K.sight[0] * 0.5, 1.85 - K.d / 2 - K.sight[1] * 0.55, 0.45, M('#4f6f80', 1, { s: 0.9 }));
}
function infantryFrame(p, f, role, frame, vi) {
  const kit = INF_KIT[role] || INF_KIT.rifle; const st = INF_STY[f] || INF_STY.usa;
  const dark = kit.dark; const uni = dark ? M('#272a27', 0.55) : { c: camo(st.uni, 22), h: 0.55, s: 0.05 };
  const skin = st.skin; const hand = st.glove && !dark ? st.glove : dark ? '#20211e' : skin;
  const walk = frame >= 0 && frame < 4 ? [0, 1, 0, -1][frame] : 0; const fire = frame === 4 || frame === 5; const rec = frame === 5 ? -0.55 : 0;
  const moving = (kit.mortar || kit.tow) && frame >= 0 && frame < 4; // crew-served weapons: frames 0-3 carry it, 4-6 have it set up
  if (kit.mortar && !moving) { // crew kneeling behind the tube on its baseplate
    p.circ(5.2, 1.4, 2.0, M('#3a3b35', 0.3, { s: 0.2 })); p.ell(6.2, 1.4, 1.5, 0.75, 0, M('#2f3129', 0.85)); p.circ(7.1, 1.4, 0.5, M('#111', 0.95)); p.line([5.2, 1.4, 3.2, 3.2], 0.35, M('#333', 0.4)); p.line([5.2, 1.4, 3.2, -0.4], 0.35, M('#333', 0.4));
    p.rect(-4.2, -2.2, 2.4, 4.4, M(st.pack, 0.6), 0.8); for (const dy of [-1.2, 0.1]) p.rect(-6.4, dy, 2, 1.1, M('#5d5640', 0.4), 0.2);
    p.ell(-0.4, 0, 2.2, 3.4, 0, M('rgba(20,20,14,0.5)', 0.3)); p.ell(-0.4, 0, 2.0, 3.2, 0, uni); p.line([-0.4, 2.6, 4.6, 1.8], 1.1, uni); p.line([-0.4, -2.6, 4.4, 0.6], 1.1, uni);
    helmetTop(p, st, st.helm, false); if (fire) p.circ(7.6, 1.4, 1.2, M('#ffe6a0', 0.95, { e: 1 })); return;
  }
  // boots swing alternately while walking
  if (walk) { p.ell(1.5 * walk, -1.35, 1.75, 0.82, 0, M(st.boot, 0.28)); p.ell(-1.5 * walk, 1.35, 1.75, 0.82, 0, M(st.boot, 0.28)); }
  // backpack by role
  if (kit.medic) { p.rect(-5, -2.4, 3.4, 4.8, M('#e6e2d6', 0.64), 1); if (f === 'arb') p.spath(c => { c.arc(-3.3, 0, 1.2, 0.6, TAU - 0.6); }, 0.5, M('#c8302a', 0.66)); else { p.rect(-3.6, -1.3, 0.6, 2.6, M('#c8302a', 0.66)); p.rect(-4.6, -0.3, 2.6, 0.6, M('#c8302a', 0.66)); } }
  else if (kit.at && st.at !== 'jav') { p.rect(-4.6, -2.2, 2.8, 4.4, M(st.pack, 0.6), 0.9); for (const yy of [-1.1, 1.1]) { cyl(p, -6.4, -2.2, yy, 0.55, '#4b5240', 0.62, 0.8); } }
  else if (kit.snp) { p.rect(-6.2, -1.0, 4.2, 2.0, M(f === 'usa' ? '#6f6650' : st.pack, 0.6), 0.6); }
  else { p.rect(-4.5, -2.1, 2.7, 4.2, dark ? M('#1d1f1c', 0.6) : M(st.pack, 0.62), 0.9); p.line([-4.1, -1.3, -4.1, 1.3], 0.25, AL('rgba(0,0,0,0.28)')); if (role === 'rifle') { p.line([-3.6, -1.5, -5.2, -2.6], 0.12, M('#1d1d1a', 0.95)); } }
  // silhouette outline, torso, vest
  p.ell(-0.5, 0, 2.38, 3.78, 0, M('rgba(18,18,12,0.55)', 0.3));
  p.ell(-0.5, 0, 2.1, 3.5, 0, uni);
  if (st.rig && !dark) { p.rect(-0.2, -2.0, 1.5, 4.0, M(st.vest, 0.7), 0.4); for (const yy of [-1.3, -0.1, 1.1]) p.rect(0.35, yy - 0.42, 0.9, 0.84, M(st.pouch, 0.74), 0.15); p.line([-1.6, -2.8, 0.2, -1.8], 0.32, M(st.vest, 0.7)); p.line([-1.6, 2.8, 0.2, 1.8], 0.32, M(st.vest, 0.7)); }
  else { p.rect(-1.9, -2.25, 3.05, 4.5, dark ? M('#1b1d1b', 0.68) : M(st.vest, 0.68), 0.75); for (const yy of [-1.45, 0, 1.45]) p.rect(0.4, yy - 0.5, 0.85, 1.0, dark ? M('#141513', 0.72) : M(st.pouch, 0.72), 0.2); p.rect(-1.6, -0.35, 1.4, 0.7, AL('rgba(255,255,255,0.05)')); }
  if (st.scarf && !dark) p.ell(0.4, 0, 0.9, 2.1, 0, M(st.scarf, 0.74));
  // shoulder armbands carry the team colour (medics: white band with the red emblem)
  p.rect(-1.4, -3.55, 1.3, 0.85, M('#d0d0d0', 0.62, { t: 1 }), 0.2); p.rect(-1.4, 2.7, 1.3, 0.85, M(kit.medic ? '#f2f0ea' : '#d0d0d0', 0.62, { t: kit.medic ? 0 : 1 }), 0.2); if (kit.medic) p.rect(-1.0, 2.9, 0.5, 0.45, M('#c8302a', 0.64));
  // arms to the weapon
  const wx = 0.6 + rec, aimY = 0.55; const tube = kit.at || kit.aa;
  if (tube) { p.line([-0.6, 3.1, wx + 1.0, 1.9], 1.15, uni); p.line([-0.6, -3.1, wx + 2.2, 0.9], 1.15, uni); }
  else { p.line([-0.6, 3.1, wx + 1.4, aimY + 0.9], 1.15, uni); p.line([-0.6, -3.1, wx + (kit.short ? 2.6 : 3.6), aimY - 0.15], 1.15, uni); }
  // weapon
  if (kit.tow) atgmKit(p, role === 'el2' ? 'tow' : st.atgm || 'tow', rec, moving);
  else if (kit.at) launcherTop(p, st.at, wx - 0.6, 1.55);
  else if (kit.aa) aaTop(p, st.aa, wx - 0.6, 1.5);
  else if (kit.snp) sniperTop(p, st.snp, wx, aimY);
  else if (kit.short) { p.rect(wx - 0.6, aimY - 0.32, 2.6, 0.64, M('#1d1e1b', 0.9, { s: 0.3 })); p.line([wx + 2, aimY, wx + 3.2, aimY], 0.26, M('#151614', 0.9)); }
  else gunTop(p, dark && f === 'usa' ? 'm4' : st.gun, wx, aimY);
  if (tube) { p.circ(wx + 1.0, 1.9, 0.62, M(hand, 0.72)); p.circ(wx + 2.2, 0.9, 0.62, M(hand, 0.72)); }
  else { p.circ(wx + 1.4, aimY + 0.9, 0.62, M(hand, 0.72)); p.circ(wx + (kit.short ? 2.6 : 3.6), aimY - 0.15, 0.62, M(hand, 0.72)); }
  // head / helmet
  helmetTop(p, st, dark ? (st.dkHelm === 'balaclava' ? 'balaclava' : st.dkHelm === 'shemaghB' ? 'shemaghB' : 'ech') : st.helm, dark);
  if (kit.medic && fire) return;
  if (fire && !kit.tow && !kit.medic) { const fx = kit.at || kit.aa ? wx + 5.6 : kit.snp ? wx + 9 : wx + 7.1; p.circ(fx, kit.at || kit.aa ? 1.55 : aimY, kit.at ? 0.9 : 0.55, M('#ffe6a0', 0.9, { e: 1 })); if (kit.at) p.circ(wx - 5.4, 1.55, 1.1, M('#d9d2c0', 0.6, { e: 0.4 })); }
  if (fire && kit.tow && !moving) { const L = ATGM_KIT[role === 'el2' ? 'tow' : st.atgm || 'tow'].L; p.circ(L - 0.2, 1.85, 1.1, M('#ffe6a0', 0.95, { e: 1 })); p.circ(-2.6, 1.85, 1.2, M('#d9d2c0', 0.6, { e: 0.4 })); }
}
function infantryDead(p, f, role, vi) {
   const st = INF_STY[f] || INF_STY.usa; const uni = { c: camo(st.uni, 24), h: 0.4 };
  p.line([-5, 0, 3, 0], 4.2, uni); p.line([-5, -1, -9, -2.2], 1.6, uni); p.line([-5, 1, -9, 2.4], 1.6, uni); p.rect(-1.6, -1.8, 2.6, 3.6, M(st.vest, 0.45), 0.6);
  p.line([1, -2, 3.2, -5], 1.2, uni); p.line([1, 2, 4.4, 3.4], 1.2, uni); p.circ(4.6, 0, 1.9, M(st.helm === 'shemagh' ? '#d8d0bd' : st.hc, 0.6));
  p.line([-1, 4.2, 6, 5.5], 0.8, M('#1e1f1c', 0.3));
}

/* ---- Aircraft ---- */
const AART = {};
function A(id, def) { AART[id] = def; }
const greyCol = { usa: '#8d939a', rus: '#6f8a9a', chn: '#9aa1a8', eu: '#8a9196', arb: '#a7a08c' };
function jetPaint(f, h, ex) { return Object.assign({ c: greyCol[f], h, s: 0.25 }, ex || {}); }
function canopy(p, x, y, l, w) { p.ell(x, y, l, w, 0, M('#28404f', 1, { s: 1, hr: [x + l * 0.3, y - w * 0.3, l, 1, 0.82] })); p.ell(x + l * 0.35, y - w * 0.25, l * 0.4, w * 0.25, 0, AL('rgba(255,255,255,0.35)')); }
function roundel(p, x, y, r) { p.circ(x, y, r, M('#ddd', 0.42, { t: 1 })); }
A('usa_jet', { L: 40, W: 28, alt: 1, nozzles: [[-19, 0, 2]], draw(p, f) {
  p.poly([6, -2, -6, -13.5, -10, -13.5, -11, -4, -16, -4, -19, -9.5, -21, -9.5, -20.5, -2.5, -20.5, 2.5, -21, 9.5, -19, 9.5, -16, 4, -11, 4, -10, 13.5, -6, 13.5, 6, 2], jetPaint(f, 0.3));
  p.path(c => { c.moveTo(20, 0); c.quadraticCurveTo(14, -3.2, 4, -3.8); c.lineTo(-18, -3); c.lineTo(-18, 3); c.lineTo(4, 3.8); c.quadraticCurveTo(14, 3.2, 20, 0); c.closePath(); }, jetPaint(f, 0.72, { hg: [0, -3.8, 0.45, 0, 0, 0.75] }));
  p.path(c => { c.moveTo(4, 0); c.lineTo(-18, 0); c.lineTo(-18, 3); c.lineTo(4, 3.8); c.quadraticCurveTo(14, 3.2, 20, 0); c.closePath(); }, HO(0.75, { hg: [0, 0, 0.75, 0, 3.8, 0.45], s: 0.25 }));
  p.line([-11, -3.2, -16, -7.5], 0.8, jetPaint(f, 0.6)); p.line([-11, 3.2, -16, 7.5], 0.8, jetPaint(f, 0.6)); // canted tails
  canopy(p, 9.5, 0, 4.2, 1.6); p.rect(-20, -1.8, 2.4, 3.6, M('#2b2b2b', 0.6)); roundel(p, -6, -9, 1.3); roundel(p, -6, 9, 1.3); p.grain(0.1);
} });
A('rus_jet', { L: 46, W: 32, nozzles: [[-20, -3, 1.6], [-20, 3, 1.6]], draw(p, f) {
  p.poly([16, -3, 4, -7, -6, -15.5, -11, -15.5, -12, -6, -16, -6, -18, -12.5, -21, -12.5, -21, 12.5, -18, 12.5, -16, 6, -12, 6, -11, 15.5, -6, 15.5, 4, 7, 16, 3], jetPaint(f, 0.3));
  p.path(c => { c.moveTo(23, 0); c.quadraticCurveTo(16, -2.6, 8, -3.2); c.lineTo(-20, -5.5); c.lineTo(-20, 5.5); c.lineTo(8, 3.2); c.quadraticCurveTo(16, 2.6, 23, 0); c.closePath(); }, jetPaint(f, 0.6, { hr: [0, 0, 18, 0.72, 0.45] }));
  p.line([-12, -5, -16, -10], 0.8, jetPaint(f, 0.6)); p.line([-12, 5, -16, 10], 0.8, jetPaint(f, 0.6)); p.rect(-23, -0.6, 4, 1.2, jetPaint(f, 0.6));
  canopy(p, 12, 0, 4, 1.4); roundel(p, -7, -11, 1.3); roundel(p, -7, 11, 1.3); p.grain(0.1);
} });
A('chn_jet', { L: 48, W: 30, nozzles: [[-22, -2.6, 1.6], [-22, 2.6, 1.6]], draw(p, f) {
  p.poly([2, -3, -12, -14.5, -16, -14.5, -16, -4, -20, -4, -20, 4, -16, 4, -16, 14.5, -12, 14.5, 2, 3], jetPaint(f, 0.3));
  p.poly([12, -2.8, 8, -8.2, 6, -8.2, 7, -2.8], jetPaint(f, 0.4)); p.poly([12, 2.8, 8, 8.2, 6, 8.2, 7, 2.8], jetPaint(f, 0.4)); // canards
  p.path(c => { c.moveTo(25, 0); c.quadraticCurveTo(18, -2.6, 9, -3.4); c.lineTo(-22, -4.2); c.lineTo(-22, 4.2); c.lineTo(9, 3.4); c.quadraticCurveTo(18, 2.6, 25, 0); c.closePath(); }, jetPaint(f, 0.66, { hr: [2, 0, 16, 0.75, 0.45] }));
  p.line([-14, -3.5, -18, -8], 0.8, jetPaint(f, 0.6)); p.line([-14, 3.5, -18, 8], 0.8, jetPaint(f, 0.6));
  canopy(p, 15, 0, 4.6, 1.5); roundel(p, -9, -10, 1.3); roundel(p, -9, 10, 1.3); p.grain(0.1);
} });
A('eu_jet', { L: 40, W: 28, nozzles: [[-18, -1.6, 1.4], [-18, 1.6, 1.4]], draw(p, f) {
  p.poly([4, -3, -12, -13.5, -15, -13.5, -15, -3, -15, 3, -15, 13.5, -12, 13.5, 4, 3], jetPaint(f, 0.3));
  p.poly([13, -2.4, 10, -6.5, 8.6, -6.5, 9.6, -2.4], jetPaint(f, 0.4)); p.poly([13, 2.4, 10, 6.5, 8.6, 6.5, 9.6, 2.4], jetPaint(f, 0.4));
  p.path(c => { c.moveTo(21, 0); c.quadraticCurveTo(15, -2.4, 7, -3); c.lineTo(-18, -3.2); c.lineTo(-18, 3.2); c.lineTo(7, 3); c.quadraticCurveTo(15, 2.4, 21, 0); c.closePath(); }, jetPaint(f, 0.68, { hr: [0, 0, 14, 0.78, 0.45] }));
  p.line([-9, 0, -16, 0], 0.9, jetPaint(f, 0.95)); canopy(p, 12, 0, 3.8, 1.4); roundel(p, -8, -9, 1.2); roundel(p, -8, 9, 1.2); p.grain(0.1);
} });
A('arb_jet', { L: 48, W: 32, nozzles: [[-22, -2.4, 1.6], [-22, 2.4, 1.6]], draw(p, f) {
  p.poly([5, -4, -8, -15.5, -13, -15.5, -13, -4, 5, 4, -13, 4, -13, 15.5, -8, 15.5, 5, 4], jetPaint(f, 0.3));
  p.poly([-15, -4, -19, -11, -22, -11, -21, -4], jetPaint(f, 0.34)); p.poly([-15, 4, -19, 11, -22, 11, -21, 4], jetPaint(f, 0.34));
  p.path(c => { c.moveTo(24, 0); c.quadraticCurveTo(17, -2.8, 9, -3.4); c.lineTo(-21, -4.6); c.lineTo(-21, 4.6); c.lineTo(9, 3.4); c.quadraticCurveTo(17, 2.8, 24, 0); c.closePath(); }, jetPaint(f, 0.66, { hr: [0, 0, 18, 0.76, 0.45] }));
  p.line([-12, -4, -18, -5], 0.8, jetPaint(f, 0.9)); p.line([-12, 4, -18, 5], 0.8, jetPaint(f, 0.9)); canopy(p, 14, 0, 4.4, 1.5);
  for (const y of [-9, -6, 6, 9]) p.rect(-5, y - 0.6, 5, 1.2, M('#55574f', 0.45)); roundel(p, -8, -12, 1.3); roundel(p, -8, 12, 1.3); p.grain(0.1);
} });
// helicopters: body + rotor
A('usa_heli', { L: 44, W: 16, rotor: 18, rx: 2, tailR: [-19.5, -2.6, 3.4], blades: 4, draw(p, f) {
  p.rect(-20, -1.1, 22, 2.2, jetPaint(f, 0.5, { c: '#4d5444' }), 0.8); p.rect(-21, -4.4, 3, 8.8, M('#4d5444', 0.45), 0.4);
  p.path(c => { c.moveTo(15, 0); c.quadraticCurveTo(13, -2.6, 6, -2.8); c.lineTo(-3, -2.6); c.lineTo(-3, 2.6); c.lineTo(6, 2.8); c.quadraticCurveTo(13, 2.6, 15, 0); c.closePath(); }, M('#4d5444', 0.72, { hr: [2, 0, 9, 0.8, 0.55], s: 0.2 }));
  p.rect(-2, -7.5, 5, 15, M('#4a5142', 0.5), 0.5); for (const y of [-7, -5.4, 5.4, 7]) { p.rect(-1, y - 0.7, 4, 1.4, M('#2f322b', 0.6)); }
  p.rect(-4, -4.2, 6, 2, M('#444b3d', 0.74), 0.8); p.rect(-4, 2.2, 6, 2, M('#444b3d', 0.74), 0.8); // engines
  canopy(p, 10, 0, 3, 1.4); canopy(p, 5.5, 0, 2.6, 1.5); p.circ(16, 0, 1.4, M('#2f322b', 0.6)); roundel(p, -12, 0, 0.9); p.grain(0.12);
} });
A('rus_heli', { L: 42, W: 16, rotor: 17, rx: 1, coax: 1, blades: 3, draw(p, f) {
  p.rect(-19, -1.3, 20, 2.6, M('#4f5d4c', 0.5), 0.8); p.rect(-20.5, -4.8, 2, 2, M('#4f5d4c', 0.5)); p.rect(-20.5, 2.8, 2, 2, M('#4f5d4c', 0.5)); p.rect(-20, -4.4, 1, 8.8, M('#4f5d4c', 0.45));
  p.path(c => { c.moveTo(16, 0); c.quadraticCurveTo(14, -4, 6, -4); c.lineTo(-4, -3.2); c.lineTo(-4, 3.2); c.lineTo(6, 4); c.quadraticCurveTo(14, 4, 16, 0); c.closePath(); }, M('#4f5d4c', 0.72, { hr: [3, 0, 10, 0.8, 0.55], s: 0.2 }));
  p.rect(-1, -8, 5, 16, M('#4b5847', 0.5), 0.5); for (const y of [-7.5, -5.6, 5.6, 7.5]) p.rect(0, y - 0.7, 3.5, 1.4, M('#2f322b', 0.6));
  p.ell(9, 0, 4.2, 2.8, 0, M('#28404f', 1, { s: 1, hr: [10, -1, 4.2, 1, 0.82] })); roundel(p, -12, 0, 0.9); p.grain(0.12);
} });
A('chn_heli', { L: 42, W: 14, rotor: 17, rx: 1.5, tailR: [-19, -2.4, 3], blades: 5, draw(p, f) {
  p.rect(-19, -1, 21, 2, M('#5a6352', 0.5), 0.8); p.rect(-20.5, -4, 2.6, 8, M('#5a6352', 0.45), 0.4);
  p.path(c => { c.moveTo(15, 0); c.quadraticCurveTo(13, -2.4, 6, -2.5); c.lineTo(-3, -2.4); c.lineTo(-3, 2.4); c.lineTo(6, 2.5); c.quadraticCurveTo(13, 2.4, 15, 0); c.closePath(); }, M('#5a6352', 0.72, { hr: [2, 0, 9, 0.8, 0.55], s: 0.2 }));
  p.rect(-2, -6.8, 4.5, 13.6, M('#555e4d', 0.5), 0.5); for (const y of [-6.2, -4.8, 4.8, 6.2]) p.rect(-1, y - 0.6, 3.5, 1.2, M('#2f322b', 0.6));
  canopy(p, 10, 0, 2.8, 1.3); canopy(p, 5.5, 0, 2.6, 1.4); roundel(p, -12, 0, 0.9); p.grain(0.12);
} });
A('eu_heli', { L: 40, W: 15, rotor: 16, rx: 1.5, tailR: [-18, -2.4, 3], blades: 4, draw(p, f) {
  p.rect(-18, -1.1, 20, 2.2, M('#4f5a4a', 0.5), 0.8); p.rect(-19.5, -4.6, 2.4, 9.2, M('#4f5a4a', 0.45), 0.4);
  p.path(c => { c.moveTo(14, 0); c.quadraticCurveTo(12, -2.8, 5, -2.9); c.lineTo(-3, -2.7); c.lineTo(-3, 2.7); c.lineTo(5, 2.9); c.quadraticCurveTo(12, 2.8, 14, 0); c.closePath(); }, M('#4f5a4a', 0.72, { hr: [2, 0, 9, 0.8, 0.55], s: 0.2 }));
  p.rect(-2, -7, 4.5, 14, M('#4b5545', 0.5), 0.5); for (const y of [-6.4, -4.8, 4.8, 6.4]) p.rect(-1, y - 0.6, 3.5, 1.2, M('#2f322b', 0.6));
  canopy(p, 9, 0, 2.8, 1.4); canopy(p, 4.6, 0, 2.6, 1.5); roundel(p, -11, 0, 0.9); p.grain(0.12);
} });
A('arb_heli', { L: 40, W: 11, rotor: 16, rx: 1, tailR: [-18, -1.8, 2.6], blades: 2, draw(p, f) {
  p.rect(-18, -0.9, 20, 1.8, M('#9a8e6c', 0.5), 0.8); p.rect(-19, -3.4, 2, 6.8, M('#9a8e6c', 0.45), 0.4);
  p.path(c => { c.moveTo(15, 0); c.quadraticCurveTo(13, -1.9, 5, -2.1); c.lineTo(-3, -2); c.lineTo(-3, 2); c.lineTo(5, 2.1); c.quadraticCurveTo(13, 1.9, 15, 0); c.closePath(); }, M('#9a8e6c', 0.72, { hr: [2, 0, 9, 0.8, 0.55], s: 0.2 }));
  p.rect(-1, -5.6, 4, 11.2, M('#8d8264', 0.5), 0.5); for (const y of [-5, 5]) p.rect(-0.5, y - 0.8, 3.5, 1.6, M('#2f322b', 0.6));
  canopy(p, 10, 0, 2.6, 1.1); canopy(p, 5.6, 0, 2.4, 1.2); roundel(p, -11, 0, 0.8); p.grain(0.12);
} });
// drones
A('usa_drone', { L: 26, W: 46, prop: [-12, 0, 2.6], draw(p, f) {
  p.rect(-3, -23, 4, 46, jetPaint(f, 0.35), 1.6); p.path(c => { c.moveTo(13, 0); c.quadraticCurveTo(10, -2.2, 4, -2); c.lineTo(-11, -1.2); c.lineTo(-11, 1.2); c.lineTo(4, 2); c.quadraticCurveTo(10, 2.2, 13, 0); c.closePath(); }, jetPaint(f, 0.7, { hr: [4, 0, 9, 0.8, 0.5] }));
  p.line([-9, -1, -12.5, -5], 0.8, jetPaint(f, 0.5)); p.line([-9, 1, -12.5, 5], 0.8, jetPaint(f, 0.5)); p.circ(10, 0, 1.4, M('#222', 0.85, { s: 0.6 }));
  for (const y of [-8, 8]) p.rect(-2.5, y - 0.6, 4.5, 1.2, M('#4c4f47', 0.42)); roundel(p, -1, -16, 1); p.grain(0.1);
} });
A('rus_drone', { L: 18, W: 14, prop: [-8.5, 0, 1.8], draw(p, f) {
  p.rect(-8, -1.2, 16, 2.4, M('#5f6a56', 0.7), 1.2); p.rect(3, -6, 2, 12, M('#5f6a56', 0.4), 0.5); p.rect(-6, -7, 2, 14, M('#5f6a56', 0.4), 0.5);
  p.rect(-3, -1.6, 4, 3.2, HO(0.75)); p.circ(7.6, 0, 1, M('#222', 0.8, { s: 0.6 })); roundel(p, -2, 0, 0.6); p.grain(0.1);
} });
A('chn_drone', { L: 26, W: 42, prop: [-12, 0, 2.4], draw(p, f) {
  p.path(c => { c.moveTo(0, -21); c.lineTo(2, -20); c.lineTo(2.5, 20); c.lineTo(0, 21); c.lineTo(-2.5, 20); c.lineTo(-2.5, -20); c.closePath(); }, jetPaint(f, 0.35)); p.rect(-2.5, -21, 3, 1.4, jetPaint(f, 0.5)); p.rect(-2.5, 19.6, 3, 1.4, jetPaint(f, 0.5));
  p.path(c => { c.moveTo(13, 0); c.quadraticCurveTo(10, -2.4, 4, -2.2); c.lineTo(-11, -1.2); c.lineTo(-11, 1.2); c.lineTo(4, 2.2); c.quadraticCurveTo(10, 2.4, 13, 0); c.closePath(); }, jetPaint(f, 0.7, { hr: [4, 0, 9, 0.8, 0.5] }));
  p.line([-9, -1, -12.5, -5.5], 0.8, jetPaint(f, 0.5)); p.line([-9, 1, -12.5, 5.5], 0.8, jetPaint(f, 0.5)); for (const y of [-7, 7]) p.rect(-2, y - 0.6, 4.5, 1.2, M('#4c4f47', 0.42)); roundel(p, -1, -15, 1); p.grain(0.1);
} });
A('eu_drone', { L: 22, W: 40, prop: [-9.6, 0, 2.2], draw(p, f) {
  p.rect(-2, -20, 3.4, 40, jetPaint(f, 0.35), 1.4); p.path(c => { c.moveTo(11, 0); c.quadraticCurveTo(9, -2.4, 3, -2.4); c.lineTo(-6, -1.4); c.lineTo(-6, 1.4); c.lineTo(3, 2.4); c.quadraticCurveTo(9, 2.4, 11, 0); c.closePath(); }, jetPaint(f, 0.7, { hr: [3, 0, 8, 0.8, 0.5] }));
  p.rect(-11, -4.6, 9, 0.9, jetPaint(f, 0.45)); p.rect(-11, 3.7, 9, 0.9, jetPaint(f, 0.45)); p.rect(-11.4, -5, 1.4, 10, jetPaint(f, 0.5)); canopy(p, 6, 0, 2.4, 1.2); roundel(p, 0, -14, 1); p.grain(0.1);
} });
A('arb_drone', { L: 24, W: 36, prop: [-11, 0, 2.2], draw(p, f) {
  p.rect(-2, -18, 3.6, 36, jetPaint(f, 0.35), 1.4); p.path(c => { c.moveTo(12, 0); c.quadraticCurveTo(9, -2.2, 3, -2.2); c.lineTo(-9, -1.2); c.lineTo(-9, 1.2); c.lineTo(3, 2.2); c.quadraticCurveTo(9, 2.2, 12, 0); c.closePath(); }, jetPaint(f, 0.7, { hr: [3, 0, 8, 0.8, 0.5] }));
  p.rect(-12, -6.6, 10, 1, jetPaint(f, 0.45)); p.rect(-12, 5.6, 10, 1, jetPaint(f, 0.45)); p.line([-11.6, -6, -13, -2], 0.7, jetPaint(f, 0.5)); p.line([-11.6, 6, -13, 2], 0.7, jetPaint(f, 0.5));
  p.circ(9.6, 0, 1.2, M('#222', 0.85, { s: 0.6 })); roundel(p, 0, -12, 1); p.grain(0.1);
} });

/* ---- bake everything for a faction ---- */

function bakeVehicle(id) {
  const d = VART[id]; if (!d) return; const f = id.split('_')[0]; const L = d.L, W = d.W;
  bake(id + ':hull', L + 4, W + 4, L / 2 + 2, W / 2 + 2, S_VEH, p => d.hull(p, f), { Hmax: 3.5, dust: 0.42, seed: id.length, weather: 1 });
  bake(id + ':wreck', L + 4, W + 4, L / 2 + 2, W / 2 + 2, S_VEH * 0.7, p => d.hull(p, f), { Hmax: 3.5, burnt: 1 });
  if (d.tur) {
    bake(id + ':tur', 52, 30, 26, 15, S_VEH, p => d.tur(p, f), { Hmax: 3, dust: 0.25, weather: 0.8 });
    bake(id + ':wtur', 52, 30, 26, 15, S_VEH * 0.7, p => d.tur(p, f), { Hmax: 3, burnt: 1 });
  }
  if (d.turE) bake(id + ':turE', 52, 30, 26, 15, S_VEH, p => d.turE(p, f), { Hmax: 3.6, dust: 0.2, weather: 0.8 }); // launcher raised to fire
  if (d.gun) bake(id + ':gun', 32, 6, 3, 3, S_VEH, p => d.gun(p, f), { Hmax: 2, dust: 0.1, soft: 0.3 });
  if (d.dish) bake(id + ':dish', 6, 10, 3, 5, S_VEH, p => { const w = d.dish.w, h = d.dish.h; p.rect(-w / 2, -h / 2, w, h, M('#3d4037', 0.95), 0.3); for (let y = -h / 2 + 0.6; y < h / 2; y += 0.8) p.line([-w / 2 + 0.2, y, w / 2 - 0.2, y], 0.15, AL('rgba(0,0,0,0.35)')); p.rect(-0.4, -0.4, 0.8, 0.8, M('#222', 1)); }, { Hmax: 2 });
}
function bakeAircraft(id) {
  const d = AART[id]; if (!d) return; const f = id.split('_')[0];
  bake(id + ':body', d.L + 4, d.W + 4, d.L / 2 + 2, d.W / 2 + 2, S_AIR, p => d.draw(p, f), { Hmax: 3, dust: 0.06 });
  bake(id + ':wreck', d.L + 4, d.W + 4, d.L / 2 + 2, d.W / 2 + 2, S_AIR * 0.6, p => d.draw(p, f), { Hmax: 3, burnt: 1 });
  if (d.rotor) {
    const Rr = d.rotor, nb = d.blades;
    bake(id + ':rotor', Rr * 2 + 2, Rr * 2 + 2, Rr + 1, Rr + 1, S_AIR * 0.8, p => {
      p.circ(0, 0, Rr, AL('rgba(30,32,30,0.16)')); p.circ(0, 0, Rr * 0.97, HO(0.98));
      for (let i = 0; i < nb; i++) { const a = i * TAU / nb; const ca = Math.cos(a), sa = Math.sin(a); p.line([ca * 1.2, sa * 1.2, ca * Rr, sa * Rr], 1.1, AL('rgba(25,26,24,0.55)')); }
      p.circ(0, 0, 1.4, M('#2c2d2a', 1)); if (d.dome) dome(p, 0, 0, d.dome, '#4d5247', 0.9, 1);
    }, { Hmax: 1, dust: 0 });
    if (d.tailR) bake(id + ':trotor', 8, 8, 4, 4, S_AIR, p => { p.circ(0, 0, d.tailR[2], AL('rgba(30,30,30,0.3)')); p.circ(0, 0, d.tailR[2], HO(0.9)); }, { Hmax: 1, dust: 0 });
  }
  if (d.prop) bake(id + ':prop', 8, 8, 4, 4, S_AIR, p => { p.circ(0, 0, d.prop[2], AL('rgba(30,30,30,0.35)')); p.circ(0, 0, d.prop[2], HO(0.9)); }, { Hmax: 1, dust: 0 });
}
const INF_ROLES = ['rifle', 'at', 'jav', 'sniper', 'aainf', 'mortar', 'medic'];
function bakeInfantry(f) {
  const roles = INF_ROLES.filter(r => UNITS[f + '_' + r]); for (const id in UNITS) { const u = UNITS[id]; if (u.f === f && (u.elite || u.gold) && u.cls === 'inf') roles.push(u.role); }
  for (const role of roles) { const nv = 1; for (let v = 0; v < nv; v++) { const vk = v ? ':v' + v : '';
    const nf = INF_KIT[role] && (INF_KIT[role].mortar || INF_KIT[role].tow) ? 7 : 6; // crew weapons get a 7th frame: set up and waiting
    for (let fr = 0; fr < nf; fr++) bake(`${f}_${role}${vk}:f${fr}`, 16, 14, 7, 7, S_INF, p => infantryFrame(p, f, role, fr, v), { Hmax: 2.2, dust: 0.12, soft: 0.32, aoR: 1 });
    bake(`${f}_${role}${vk}:dead`, 22, 16, 11, 8, S_INF * 0.8, p => infantryDead(p, f, role, v), { Hmax: 1.5, dust: 0.3 });
  } }
}
function bakeFactionUnits(f) {
  bakeInfantry(f);
  for (const id in UNITS) { const u = UNITS[id]; if (u.f !== f || u.cls === 'inf' || u.fx) continue; if (u.cls === 'air') bakeAircraft(id); else bakeVehicle(id); }
  if (typeof bakeFxUnits === 'function') bakeFxUnits(f); // fantasy troops: only those this battle can show (js/art/units_fx.js)
}
