/* ============================================================
   War of Power — رسومات المباني العسكرية المفصّلة
   الملف: js/art/buildings_v2.js   ·   ترتيب التحميل: 13 من 43
   ============================================================ */
'use strict';
/* ===== Detailed military building art (v2): faction architecture, rooftop kit, perimeter dressing ===== */
// --- shared dressing helpers (world units; centre-origin; sun from upper-left so shadows fall +x/+y) ---
function star5(p, x, y, r, rot, m, inner) { inner = inner || 0.382; p.path(c => { for (let i = 0; i < 10; i++) { const a = (rot || 0) - PI / 2 + i * PI / 5, rr = i % 2 ? r * inner : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); }, m); }
function roofEmblem(p, f, x, y, r) {
  if (f === 'usa') { p.circ(x, y, r, AL('rgba(236,234,224,0.92)')); p.circ(x, y, r * 0.86, AL('#2b3b5e')); star5(p, x, y, r * 0.78, 0, AL('rgba(242,240,232,0.96)')); }
  else if (f === 'rus') { star5(p, x, y, r * 1.08, 0, AL('rgba(236,232,220,0.9)')); star5(p, x, y, r * 0.92, 0, AL('#b2302a')); star5(p, x, y, r * 0.45, 0, AL('rgba(255,255,255,0.12)')); }
  else if (f === 'chn') { star5(p, x, y, r * 1.08, 0, AL('#d9b23c')); star5(p, x, y, r * 0.9, 0, AL('#b52b22')); }
  else if (f === 'eu') { p.circ(x, y, r, AL('#24427f')); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - PI / 2; star5(p, x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66, r * 0.13, 0, AL('#ecc84a')); } }
  else { // arab coalition: palm over crossed sabres on green
    p.circ(x, y, r, AL('#2b6b47')); const k = r / 10, cr = AL('#eee4c6');
    p.line([x, y + 4.5 * k, x, y - 2 * k], 1.1 * k, cr);
    for (const [dx, dy] of [[-5, -1.6], [5, -1.6], [-4, -4.6], [4, -4.6], [0, -6]]) p.spath(c => { c.moveTo(x, y - 2.2 * k); c.quadraticCurveTo(x + dx * k * 0.45, y + (dy - 2.4) * k, x + dx * k, y + dy * k); }, 1.1 * k, cr);
    for (const s of [-1, 1]) p.spath(c => { c.moveTo(x - 6.4 * k * s, y + 6 * k); c.quadraticCurveTo(x - 1 * k * s, y + 4.4 * k, x + 6.4 * k * s, y + 1.4 * k); }, 0.75 * k, AL('#d9b23c'));
  }
}
function fenceLine(p, pts, hgt) { hgt = hgt || 0.16; p.line(pts, 0.3, M('#8c8f8a', hgt, { s: 0.35 })); for (let i = 0; i + 3 < pts.length; i += 2) { const x0 = pts[i], y0 = pts[i + 1], x1 = pts[i + 2], y1 = pts[i + 3]; const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6.5)); for (let k = 0; k <= n; k++) p.circ(lerp(x0, x1, k / n), lerp(y0, y1, k / n), 0.5, M('#6d706b', hgt + 0.06, { s: 0.3 })); } }
function guardTower(p, x, y, st, hgt) { hgt = hgt || 0.62; p.rect(x - 3.6, y - 3.6, 7.2, 7.2, M(shade(st.wall, -0.18), hgt * 0.7), 0.4); p.rect(x - 4.4, y - 4.4, 8.8, 8.8, M(st.roof2, hgt, { s: 0.12 }), 0.8); p.rect(x - 3, y - 3, 6, 6, M(shade(st.roof2, -0.12), hgt - 0.03)); p.circ(x + 2.8, y - 2.8, 0.75, M('#fff0c0', hgt + 0.04, { e: 0.55 })); sandbags(p, [x - 6, y + 5.6, x - 2.6, y + 6.2, x + 1, y + 6.2, x + 4.6, y + 5.6], 0.2); }
function lamp(p, x, y) { p.circ(x, y, 0.7, M('#4a4b47', 0.5)); p.line([x, y, x + 1.8, y - 0.4], 0.35, M('#555', 0.52)); p.circ(x + 1.9, y - 0.4, 0.65, M('#fff2c4', 0.55, { e: 0.75 })); }
function jersey(p, x, y, n, vert) { for (let i = 0; i < n; i++) { const X = vert ? x : x + i * 5, Y = vert ? y + i * 5 : y; if (vert) p.rect(X - 0.9, Y, 1.8, 4.2, M('#b3b0a6', 0.16, { s: 0.05 }), 0.5); else p.rect(X, Y - 0.9, 4.2, 1.8, M('#b3b0a6', 0.16, { s: 0.05 }), 0.5); } }
function rpoly(p, x, y, ang, pts, m) { const c = Math.cos(ang), s = Math.sin(ang); const out = []; for (let i = 0; i < pts.length; i += 2) out.push(x + pts[i] * c - pts[i + 1] * s, y + pts[i] * s + pts[i + 1] * c); p.poly(out, m); }
function rbox(p, x, y, ang, u0, v0, u1, v1, m) { rpoly(p, x, y, ang, [u0, v0, u1, v0, u1, v1, u0, v1], m); }
function truckP(p, x, y, ang, f, kind) { // parked logistics vehicle in faction paint
  rbox(p, x, y, ang, -6.6, -2.5, 6.2, 2.5, M('#20211d', 0.08));
  if (kind === 'fuel') { rbox(p, x, y, ang, -6, -2.1, 2.4, 2.1, M('#bdbbb0', 0.44, { s: 0.45 })); rbox(p, x, y, ang, -5.4, -0.25, 1.8, 0.25, AL('rgba(0,0,0,0.18)')); }
  else if (kind === 'jeep') { rbox(p, x, y, ang, -3.6, -2.1, 3.8, 2.1, fpaint(f, 0.4)); rbox(p, x, y, ang, -0.6, -1.8, 1.6, 1.8, M(GLASS, 0.46, { s: 0.9 })); rbox(p, x, y, ang, -3, -1.2, -1.4, 1.2, M('#3a3b36', 0.44)); return; }
  else { rbox(p, x, y, ang, -6, -2.2, 2.4, 2.2, fpaint(f, 0.38)); for (let k = -5; k < 2; k += 1.8) rbox(p, x, y, ang, k, -2.2, k + 0.25, 2.2, AL('rgba(0,0,0,0.16)')); }
  rbox(p, x, y, ang, 2.9, -2.1, 6, 2.1, fpaint(f, 0.46)); rbox(p, x, y, ang, 4.7, -1.75, 5.7, 1.75, M(GLASS, 0.5, { s: 0.9 })); rbox(p, x, y, ang, 3.2, -0.7, 4.2, 0.7, M('#ddd', 0.48, { t: 1 }));
}
function heliParked(p, x, y, ang, f) { // utility helicopter silhouette on a pad
  rpoly(p, x, y, ang, [-2, -2.6, 6, -2.2, 8, 0, 6, 2.2, -2, 2.6, -4, 0], fpaint(f, 0.42)); rbox(p, x, y, ang, -15, -0.7, -3, 0.7, fpaint(f, 0.4)); rbox(p, x, y, ang, -15.6, -2.6, -14.4, 2.6, fpaint(f, 0.42));
  rbox(p, x, y, ang, 4.8, -1.6, 7.2, 1.6, M(GLASS, 0.46, { s: 0.9 })); rbox(p, x, y, ang, -1, -0.6, 1, 0.6, M('#ddd', 0.45, { t: 1 }));
  for (let i = 0; i < 4; i++) { const a = ang + PI / 4 + i * PI / 2; p.line([x, y, x + Math.cos(a) * 13, y + Math.sin(a) * 13], 0.7, M('#262724', 0.52)); } p.circ(x, y, 1, M('#33342f', 0.54));
}
function satDish(p, x, y, r, ang, hgt) { p.circ(x + 1, y + 1, r * 0.35, M('#5d5f5a', hgt * 0.5)); const cx = x + Math.cos(ang) * r * 0.15, cy = y + Math.sin(ang) * r * 0.15; p.ell(cx, cy, r, r * 0.92, ang, { c: '#e6e5df', h: hgt, hr: [cx + Math.cos(ang) * r * 0.3, cy + Math.sin(ang) * r * 0.3, r, hgt * 0.55, hgt], s: 0.35 }); for (let i = 1; i < 4; i++) p.ell(cx, cy, r * i / 4, r * i / 4 * 0.92, ang, AL('rgba(0,0,0,0.07)'));
  const fx = cx + Math.cos(ang) * r * 0.55, fy = cy + Math.sin(ang) * r * 0.55; for (const s of [-1, 1]) p.line([cx + Math.cos(ang + s * 1.9) * r * 0.85, cy + Math.sin(ang + s * 1.9) * r * 0.85, fx, fy], 0.3, M('#8a8b86', hgt + 0.08)); p.circ(fx, fy, 0.9, M('#53554f', hgt + 0.12)); }
function radome(p, x, y, r, hgt) { p.circ(x, y, r + 1.2, M('#8f8e88', hgt * 0.3)); dome(p, x, y, r, '#e9e8e2', hgt * 0.45, hgt, { s: 0.3 }); for (let i = 0; i < 6; i++) { const a = i / 6 * PI; p.line([x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, x - Math.cos(a) * r * 0.95, y - Math.sin(a) * r * 0.95], 0.18, AL('rgba(0,0,0,0.08)')); } p.spath(c => c.arc(x, y, r * 0.55, 0, TAU), 0.18, AL('rgba(0,0,0,0.08)')); }
function mast(p, x, y, hgt, L) { // lattice antenna mast (tall thin: long shadow)
  p.circ(x, y, 1.3, M('#77786f', hgt * 0.5)); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.3; p.line([x + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4, x + Math.cos(a) * (L || 7), y + Math.sin(a) * (L || 7)], 0.12, AL('rgba(40,40,38,0.35)')); p.circ(x + Math.cos(a) * (L || 7), y + Math.sin(a) * (L || 7), 0.35, M('#666', 0.1)); }
  p.circ(x, y, 0.8, M('#c9c9c2', hgt, { s: 0.4 })); p.circ(x, y, 0.42, M('#d8261e', hgt + 0.02, { e: 0.6 })); }
function stairBox(p, x, y, w, h, st, hgt) { p.rect(x, y, w, h, M(shade(st.roof2, -0.08), hgt, { s: 0.08 }), 0.4); p.rect(x + w * 0.15, y + h - 1, w * 0.7, 1, M('#3b3c39', hgt - 0.04)); }
function skylight(p, x, y, w, h, hgt) { p.rect(x, y, w, h, M('#566a76', hgt + 0.03, { s: 0.95 }), 0.4); const n = Math.max(2, Math.round(w / 4)); for (let i = 1; i < n; i++) p.line([x + w * i / n, y + 0.3, x + w * i / n, y + h - 0.3], 0.3, M('#9aa5aa', hgt + 0.05, { s: 0.5 })); p.line([x + 0.3, y + h / 2, x + w - 0.3, y + h / 2], 0.3, M('#9aa5aa', hgt + 0.05, { s: 0.5 })); p.rect(x + 0.6, y + 0.6, w * 0.4, h * 0.3, AL('rgba(255,255,255,0.12)')); }
function parapetBlock(p, x, y, w, h, col, hgt, o) { // flat roof with raised parapet & inner gravel
  o = o || {}; p.rect(x, y, w, h, M(shade(col, -0.1), hgt + 0.05, { s: 0.06 }), 0.5); p.rect(x + 1.3, y + 1.3, w - 2.6, h - 2.6, M(col, hgt, { s: 0.04 }));
  const r = RNG((x * 31 + y * 17 + w * 7) | 0); for (let i = 0; i < w * h / 26; i++) p.circ(x + 2 + r() * (w - 4), y + 2 + r() * (h - 4), r.range(0.25, 0.8), AL(`rgba(0,0,0,${r.range(0.03, 0.07)})`));
  if (o.seams) for (let sx = x + 12; sx < x + w - 4; sx += 12) p.line([sx, y + 1.4, sx, y + h - 1.4], 0.25, AL('rgba(0,0,0,0.08)'));
}
function roofKit(p, x0, y0, x1, y1, hgt, seed, n) { const r = RNG(seed || 9); for (let i = 0; i < (n || 5); i++) { const x = r.range(x0, x1), y = r.range(y0, y1); if (r() < 0.6) acUnit(p, x, y, hgt); else vent(p, x, y, r.range(1, 1.6), hgt); } }
function pipeRun(p, pts, d, hgt, col) { p.line(pts, d, M(col || '#8d8f88', hgt, { s: 0.45 })); p.line(pts, d * 0.35, AL('rgba(255,255,255,0.18)')); }
function bigTank(p, x, y, r, col, hgt) { p.circ(x + 0.6, y + 0.6, r + 0.8, M('#5c5d58', hgt * 0.3)); dome(p, x, y, r, col, hgt * 0.75, hgt, { s: 0.3 }); p.circ(x, y, r * 0.2, M('#6a6b66', hgt + 0.02)); p.line([x - r * 0.85, y, x + r * 0.85, y], 0.25, AL('rgba(0,0,0,0.12)')); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; p.circ(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92, 0.25, AL('rgba(0,0,0,0.2)')); } }
function camoNet(p, x, y, w, h, f, seed) { const r = RNG(seed || 4); p.path(c => { const n = 14; for (let i = 0; i < n; i++) { const a = i / n * TAU, rx = w / 2 * r.range(0.82, 1.05), ry = h / 2 * r.range(0.82, 1.05); const px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); }, fpaint(f, 0.3, { s: 0.02 })); p.path(c => { for (let i = 0; i < 6; i++) { c.moveTo(x - w / 2 + r() * w, y - h / 2 + r() * h); c.arc(x - w / 2 + r() * w, y - h / 2 + r() * h, r.range(1, 2.2), 0, TAU); } }, AL('rgba(0,0,0,0.15)')); }
function road(p, x, y, w, h, dash) { p.rect(x, y, w, h, M('#46474a', 0.03, { s: 0.08 }), 0.5); if (dash) { const vert = h > w; if (vert) for (let yy = y + 3; yy < y + h - 3; yy += 7) p.rect(x + w / 2 - 0.35, yy, 0.7, 3.6, AL('rgba(235,226,180,0.75)')); else for (let xx = x + 3; xx < x + w - 3; xx += 7) p.rect(xx, y + h / 2 - 0.35, 3.6, 0.7, AL('rgba(235,226,180,0.75)')); } }
function flagRow(p, x, y, n) { for (let i = 0; i < n; i++) { p.circ(x + i * 4.6, y, 0.55, M('#9a9a94', 0.9)); p.rect(x + i * 4.6 + 0.3, y - 0.9, 4.2, 2.6, M('#ddd', 0.6, { t: 1 }), 0.3); } }
function treesRow(p, x, y, n, dx, dy, seed) { const r = RNG(seed || 3); for (let i = 0; i < n; i++) { const tx = x + i * dx + r.range(-1, 1), ty = y + i * dy + r.range(-1, 1), s = r.range(2.2, 3.2); p.circ(tx, ty, s, M(rgb2hex(mixc('#3d5a26', '#5c7a34', r())), 0.42, { hr: [tx - s * 0.3, ty - s * 0.3, s, 0.6, 0.3] })); } }
function palm(p, x, y, s) { s = s || 1; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.4; p.spath(c => { c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * 3 * s, y + Math.sin(a) * 3 * s - 0.6, x + Math.cos(a) * 5.4 * s, y + Math.sin(a) * 5.4 * s); }, 1.2 * s, M('#5f7a32', 0.55 - i * 0.01)); } p.circ(x, y, 0.9 * s, M('#6b5a3a', 0.6)); }

/* ---------------- Command HQ (5×5) ---------------- */
BART.hq = (p, st, f) => {
  pad(p, 156, 156, st, { stripe: 1, grid: 20 });
  // access road from south gate to the main entrance + parking apron
  road(p, -7, 22, 14, 56, 1); p.rect(-64, 34, 50, 34, M(shade(st.pad, -0.12), 0.03, { s: 0.04 }), 1); for (let x = -60; x < -16; x += 7) p.rect(x, 34.5, 0.5, 12, AL('rgba(235,226,180,0.55)'));
  // perimeter fence with gate + corner towers
  fenceLine(p, [-12, 75, -75, 75, -75, -75, 75, -75, 75, 75, 12, 75]); jersey(p, -11, 76.2, 2); jersey(p, 3, 76.2, 2);
  guardTower(p, -69, -69, st); guardTower(p, 69, 69, st); guardTower(p, -69, 69, st); guardTower(p, 16, 70, st, 0.5);
  // main building — faction architecture
  if (f === 'usa') {
    parapetBlock(p, -62, -62, 96, 80, st.roof, 0.64, { seams: 1 }); parapetBlock(p, -14, -52, 38, 34, st.roof2, 0.74); skylight(p, -8, -46, 26, 22, 0.74);
    roofEmblem(p, f, -40, -26, 13); roofKit(p, -58, -58, -20, -46, 0.66, 3, 6); for (let i = 0; i < 5; i++) acUnit(p, -8 + i * 6, -12, 0.66); stairBox(p, 22, 2, 8, 10, st, 0.72); mast(p, 28, -56, 1, 8);
    windows(p, -60, 17.2, 92, 1.1, 18); p.rect(-12, 18, 24, 4, M('#6e6c64', 0.3), 0.5); // entrance canopy
  } else if (f === 'rus') {
    parapetBlock(p, -64, -60, 74, 46, st.roof, 0.62); block(p, -64, -14, 36, 32, st, 0.58, 'metal', st.roof2); parapetBlock(p, 14, -60, 22, 60, shade(st.roof, -0.08), 0.56);
    roofEmblem(p, f, -30, -38, 13); for (let i = 0; i < 4; i++) vent(p, -58 + i * 8, -54, 1.5, 0.64); mast(p, 24, -50, 1, 7); mast(p, 24, -10, 0.95, 7); stairBox(p, -6, -24, 9, 8, st, 0.7);
    windows(p, -62, -14.6, 70, 1.1, 12);
  } else if (f === 'chn') {
    parapetBlock(p, -62, -60, 94, 78, st.roof2, 0.6); parapetBlock(p, -44, -48, 58, 52, st.roof, 0.72); p.rect(-44, -48, 58, 3, M(st.acc, 0.76), 0.5); p.rect(-44, 1, 58, 3, M(st.acc, 0.76), 0.5);
    skylight(p, -38, -42, 46, 10, 0.72); roofEmblem(p, f, -15, -16, 13); for (let i = 0; i < 6; i++) acUnit(p, -56, -54 + i * 10, 0.62); mast(p, 24, -52, 1, 8); stairBox(p, 18, -2, 8, 10, st, 0.7);
    p.rect(-62, 18.6, 94, 1.2, M('#3f5a66', 0.6, { s: 0.9 }));
  } else if (f === 'eu') {
    block(p, -62, -60, 36, 78, st, 0.62, 'tile'); block(p, 2, -60, 32, 78, st, 0.62, 'tile'); parapetBlock(p, -26, -50, 28, 58, st.roof2, 0.68); skylight(p, -22, -46, 20, 50, 0.68);
    p.rect(-60, -10, 32, 18, M('#22344c', 0.66, { s: 0.95 }), 0.3); for (let k = -58; k < -28; k += 4) p.line([k, -10, k, 8], 0.2, AL('rgba(210,225,240,0.3)'));
    roofEmblem(p, f, -12, 20, 9); mast(p, 26, -54, 1, 7);
  } else { // arab coalition: palace-style HQ with domes & courtyard
    parapetBlock(p, -64, -62, 98, 82, st.roof, 0.6); p.rect(-52, -50, 52, 54, M('#cdbb92', 0.6, { s: 0.04 }), 1); // courtyard
    p.circ(-26, -23, 7, M('#b7a780', 0.62)); p.circ(-26, -23, 5, M('#4f97b8', 0.6, { s: 0.95 })); roofEmblem(p, f, -26, -23, 3.8); for (const [x, y] of [[-44, -42], [-8, -42], [-44, -4], [-8, -4]]) palm(p, x, y, 1.1);
    p.spath(c => c.arc(17, -24, 12.6, 0, TAU), 1, M(st.acc, 0.66)); domeRoof(p, 17, -24, 12, '#f0e8d4', 0.95); domeRoof(p, 17, -24, 3, '#d9b23c', 1);
    for (const [x, y] of [[-58, -56], [28, -56], [-58, 14], [28, 14]]) { p.circ(x, y, 4.2, M('#e6dcc2', 0.75)); p.circ(x, y, 2.6, M(st.acc, 0.98)); }
    windows(p, -62, 19, 94, 1.1, 18);
  }
  // north-east: comms & radar compound
  p.rect(38, -70, 34, 44, M(shade(st.pad, -0.06), 0.04, { s: 0.04 }), 1); satDish(p, 50, -56, 9, 2.4, 0.62); radome(p, 63, -36, 7, 0.7); mast(p, 66, -62, 1, 6); bigTank(p, 46, -34, 4.2, '#d8d6ce', 0.42);
  // helipad with parked helicopter
  helipad(p, 48, 42, 15, 0.06); heliParked(p, 49, 42, -0.5, f);
  // motor pool
  for (let i = 0; i < 3; i++) truckP(p, -56 + i * 12, 52, -PI / 2, f, i === 1 ? 'fuel' : 'cargo'); truckP(p, -20, 42, 0, f, 'jeep'); truckP(p, -20, 60, 0, f, 'jeep'); if (f === 'rus') camoNet(p, -44, 52, 34, 28, f, 7);
  flagRow(p, 10, 28, 3); for (const y of [30, 46, 62]) { lamp(p, -10, y); lamp(p, 10, y); } sandbags(p, [-18, 70, -15, 71, -12, 71.5], 0.2);
  crates(p, 56, 60, 3, 2, '#6b5a3a', 0.22); treesRow(p, 30, 62, 3, 0, -6, 5);
  p.grain(0.1);
};
/* ---------------- Power plant (3×3) ---------------- */
BART.power = (p, st, f) => {
  pad(p, 92, 92, st, { grid: 12 }); fenceLine(p, [-45, -45, 45, -45, 45, 45, -45, 45, -45, -45]);
  if (f === 'eu') { // solar field + two wind turbines (blades animated) + substation
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) { const x = -40 + i * 15, y = -40 + j * 11; p.rect(x, y, 13, 8.4, M('#1e3452', 0.2, { s: 0.95, hg: [0, y, 0.14, 0, y + 8.4, 0.28] }), 0.3); for (let k = 1; k < 4; k++) p.line([x + k * 3.25, y, x + k * 3.25, y + 8.4], 0.18, AL('rgba(200,220,240,0.28)')); p.line([x, y + 4.2, x + 13, y + 4.2], 0.18, AL('rgba(200,220,240,0.2)')); }
    for (const [x, y] of [[20, -18], [20, 20]]) { p.circ(x, y, 4, M('#cfd0cc', 0.4)); p.circ(x, y, 2.8, M('#ecedea', 0.95, { s: 0.4 })); }
    p.rect(6, 34, 34, 9, M('#7a7d78', 0.06), 0.5); for (let i = 0; i < 4; i++) { p.rect(8 + i * 8, 35, 5, 7, M('#5d605b', 0.32, { s: 0.4 }), 0.4); p.circ(10.5 + i * 8, 36.5, 0.6, M('#c9b26a', 0.4)); } pipeRun(p, [-6, 40, -40, 40], 0.6, 0.2, '#6a6c67');
  } else if (f === 'rus' || f === 'chn') { // thermal plant with hyperbolic cooling tower + twin stacks
    block(p, -42, -40, 40, 40, st, 0.6, 'metal', st.roof2); for (let i = 0; i < 4; i++) vent(p, -36 + i * 10, -34, 1.6, 0.62); skylight(p, -38, -16, 32, 6, 0.6);
    p.circ(22, -14, 19, M('#a9a69c', 0.9, { hr: [20, -16, 19, 0.98, 0.7] })); p.circ(22, -14, 13.5, M('#4d4c47', 0.62)); p.circ(22, -14, 12, M('#8d9aa1', 0.48, { s: 0.6 }));
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; p.line([22 + Math.cos(a) * 14, -14 + Math.sin(a) * 14, 22 + Math.cos(a) * 18.6, -14 + Math.sin(a) * 18.6], 0.2, AL('rgba(0,0,0,0.08)')); }
    for (const [x, y] of [[-30, 22], [-16, 22]]) { p.circ(x, y, 4.4, M(f === 'chn' ? '#c9c6bc' : '#8a857c', 1, { s: 0.2 })); p.spath(c => c.arc(x, y, 3.6, 0, TAU), 0.9, AL(f === 'chn' ? '#b52b22' : '#b2302a')); p.circ(x, y, 3, M('#1b1b19', 0.92)); }
    for (let i = 0; i < 3; i++) { p.rect(-2 + i * 12, 24, 9, 16, M('#666963', 0.32, { s: 0.45 }), 0.6); for (let k = 0; k < 3; k++) p.rect(-1 + i * 12, 26 + k * 4.4, 7, 1.3, M('#474945', 0.4)); p.circ(2.5 + i * 12, 24.5, 0.7, M('#c9b26a', 0.42)); }
    pipeRun(p, [-2, 10, 14, 10, 14, 4], 1.1, 0.3); p.rect(28, 30, 14, 12, M('#2b2925', 0.12), 1.5); // coal / fuel bunker
  } else if (f === 'arb') { // oil-fired plant: fuel farm + turbine hall + stacks
    parapetBlock(p, -42, -40, 42, 36, st.roof, 0.6); p.rect(-42, -6, 42, 3, M(st.acc, 0.62), 0.4); roofKit(p, -38, -36, -6, -12, 0.62, 21, 6);
    for (const [x, y] of [[18, -28], [34, -28], [18, -10], [34, -10]]) bigTank(p, x, y, 6.6, '#e3dccb', 0.56); pipeRun(p, [10, -38, 10, 2, -4, 2], 0.9, 0.24, '#9a8f78');
    for (const [x, y] of [[-30, 22], [-16, 22]]) { p.circ(x, y, 4.2, M('#d8cdb2', 1, { s: 0.2 })); p.spath(c => c.arc(x, y, 3.5, 0, TAU), 0.8, AL(st.acc)); p.circ(x, y, 3, M('#1d1c19', 0.92)); }
    for (let i = 0; i < 3; i++) { p.rect(-2 + i * 12, 24, 9, 16, M('#6d6a62', 0.32, { s: 0.4 }), 0.6); for (let k = 0; k < 3; k++) p.rect(-1 + i * 12, 26 + k * 4.4, 7, 1.3, M('#4c4a44', 0.4)); }
  } else { // usa: combined-cycle gas turbine hall + transformer yard
    block(p, -42, -40, 46, 40, st, 0.62, 'metal', st.roof2); skylight(p, -38, -34, 38, 6, 0.62); roofKit(p, -38, -24, -4, -6, 0.62, 13, 5);
    for (const y of [-30, -8]) { p.rect(12, y - 7, 28, 14, M('#9da09c', 0.5, { s: 0.35 }), 1.5); p.circ(34, y, 5.2, M('#7a7c78', 0.72)); p.circ(34, y, 4.2, M('#262725', 0.66)); for (let k = 0; k < 5; k++) p.line([14 + k * 3.5, y - 6, 14 + k * 3.5, y + 6], 0.25, AL('rgba(0,0,0,0.12)')); }
    for (const [x, y] of [[-30, 22], [-16, 22]]) { p.circ(x, y, 4.2, M('#8b8c86', 1, { s: 0.25 })); p.circ(x, y, 3, M('#1d1d1b', 0.92)); }
    for (let i = 0; i < 3; i++) { p.rect(-2 + i * 12, 24, 9, 16, M('#6d706c', 0.32, { s: 0.4 }), 0.6); for (let k = 0; k < 3; k++) p.rect(-1 + i * 12, 26 + k * 4.4, 7, 1.3, M('#4a4c48', 0.4)); p.circ(2.5 + i * 12, 24.5, 0.7, M('#c9b26a', 0.42)); }
  }
  // HV lines out of the yard
  if (f !== 'eu') { p.line([-44, 41, 44, 41], 0.4, M('#555', 0.46)); p.line([-44, 37.5, 44, 37.5], 0.4, M('#555', 0.46)); for (const x of [-40, 40]) p.rect(x - 1.6, 36, 3.2, 7, M('#8a8b86', 0.6), 0.3); }
  flag(p, -42, -42, 0.4); p.grain(0.11);
};
/* ---------------- Barracks (3×3) ---------------- */
BART.barracks = (p, st, f) => {
  pad(p, 92, 92, st, { grid: 12 });
  if (st.dome) { parapetBlock(p, -42, -40, 54, 24, st.roof, 0.56); parapetBlock(p, -42, -12, 54, 24, st.roof, 0.56); for (let i = 0; i < 4; i++) { p.path(c => { c.arc(-34 + i * 12, -15.2, 3, PI, 0); c.closePath(); }, M('#c8b58e', 0.58)); } p.rect(-42, -17, 54, 1.6, M(st.acc, 0.58)); }
  else if (st.tile) { block(p, -42, -40, 54, 24, st, 0.56, 'tile'); block(p, -42, -12, 54, 24, st, 0.56, 'tile'); }
  else { block(p, -42, -40, 54, 24, st, 0.56, f === 'rus' ? 'metal' : 'flat'); block(p, -42, -12, 54, 24, st, 0.56, f === 'rus' ? 'metal' : 'flat'); }
  for (let i = 0; i < 3; i++) acUnit(p, -36 + i * 10, -30, 0.58); for (let i = 0; i < 4; i++) vent(p, -34 + i * 13, -2, 1.2, 0.58);
  roofEmblem(p, f, 2, -28, 6);
  // drill square + obstacle course
  p.rect(18, -40, 24, 60, M('#a08e70', 0.06, { s: 0.02 }), 1.5); for (let y = -34; y < 16; y += 8) { p.rect(22, y, 16, 1.2, M('#6b5d45', 0.22)); p.circ(22, y + 0.6, 0.6, M('#4f4636', 0.3)); p.circ(38, y + 0.6, 0.6, M('#4f4636', 0.3)); }
  p.rect(24, 4, 12, 6, M('#7b6a4e', 0.3), 0.5); for (let i = 0; i < 4; i++) p.line([25 + i * 3, 4, 25 + i * 3, 10], 0.25, AL('rgba(0,0,0,0.3)'));
  // firing range with targets
  p.rect(-42, 18, 54, 22, M('#958a72', 0.05), 1); for (let i = 0; i < 5; i++) { p.circ(-36 + i * 11, 34, 1.4, M('#e5e1d6', 0.14)); p.circ(-36 + i * 11, 34, 0.7, AL('#b2302a')); p.rect(-37 + i * 11, 21, 2, 1, M('#5a5040', 0.14)); } sandbags(p, [-42, 24, -38, 24.5, -34, 24.5, -30, 24.5, -26, 24.5, -22, 24.5, -18, 24.5, -14, 24.5, -10, 24.5, -6, 24.5, -2, 24.5, 2, 24.5, 6, 24.5, 10, 24], 0.18);
  flagRow(p, 26, 30, 3); lamp(p, 16, 22); p.grain(0.11);
};
/* ---------------- Supply centre (4×3) ---------------- */
BART.supply = (p, st, f) => {
  pad(p, 124, 92, st, { stripe: 1, grid: 14 });
  block(p, -58, -42, 62, 46, st, 0.6, 'metal', st.roof2); skylight(p, -52, -36, 50, 5, 0.6); p.rect(-58, 4, 62, 4, M(st.acc, 0.36), 0.3); for (let i = 0; i < 5; i++) { p.rect(-54 + i * 12, 4.5, 8, 5.5, M('#3a3a36', 0.2)); p.rect(-54 + i * 12, 4.5, 8, 0.8, AL('rgba(230,210,90,0.8)')); }
  roofEmblem(p, f, -10, -20, 7); roofKit(p, -54, -28, -26, -10, 0.62, 31, 4);
  // container stacks & pallets
  const cc = ['#7a3d2a', '#3d5a7a', '#6b6a4c', '#8a6a3a', '#4f6b45']; for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) { const x = 10 + i * 16, y = -40 + j * 10; p.rect(x, y, 14, 7.6, M(cc[(i + j * 2) % 5], 0.3 + (i === 1 && j === 0 ? 0.14 : 0), { s: 0.25 }), 0.3); for (let k = 1; k < 7; k++) p.line([x + k * 2, y + 0.3, x + k * 2, y + 7.3], 0.2, AL('rgba(0,0,0,0.18)')); }
  crates(p, 10, -18, 6, 2, '#7c6a45', 0.24); crates(p, -56, 20, 4, 3, '#7c6a45', 0.24); crates(p, -40, 20, 3, 3, '#6a5a3a', 0.24);
  // loading bay with trucks
  p.rect(14, 6, 46, 34, M('#87877f', 0.06), 1); for (let i = 0; i < 4; i++) p.rect(16 + i * 11, 8, 0.5, 30, AL('rgba(230,210,90,0.7)')); truckP(p, 22, 24, PI / 2, f, 'cargo'); truckP(p, 44, 24, PI / 2, f, 'cargo');
  p.circ(-14, 30, 6, M('#3b3a35', 0.08)); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; p.circ(-14 + Math.cos(a) * 3.6, 30 + Math.sin(a) * 3.6, 1.1, M('#5a5a50', 0.26)); } // fuel drums
  flag(p, 56, -42, 0.4); lamp(p, 8, 4); p.grain(0.11);
};
/* ---------------- War factory (4×4) ---------------- */
BART.factory = (p, st, f) => {
  pad(p, 124, 124, st, { stripe: 1, grid: 16 });
  // assembly hall: sawtooth north-light roof
  p.rect(-58, -56, 94, 78, M(st.roof2, 0.66, { s: 0.2 }), 0.5);
  for (let i = 0; i < 7; i++) { const x = -56 + i * 13; p.rect(x, -54, 9.5, 74, M(st.roof, 0.64, { s: 0.25, hg: [x, 0, 0.6, x + 9.5, 0, 0.74] })); p.rect(x + 9.5, -54, 2.6, 74, M('#4a5e6a', 0.74, { s: 0.95 })); p.line([x + 10.8, -54, x + 10.8, 20], 0.2, AL('rgba(255,255,255,0.18)')); }
  // gantry crane rails across the roof & annex
  p.rect(-58, -18, 94, 1.4, M('#c79b2e', 0.8, { s: 0.3 })); p.rect(38, -56, 18, 34, M(shade(st.roof2, 0.05), 0.5, { s: 0.06 }), 0.5); for (const y of [-48, -40, -32]) acUnit(p, 47, y, 0.52); mast(p, 47, -26, 0.85, 5);
  roofEmblem(p, f, 47, 6, 6);
  // roller doors and test track
  for (const x of [-50, -24, 2]) { p.rect(x, 21, 22, 4, M('#3a3b37', 0.24), 0.4); for (let k = 0; k < 5; k++) p.line([x + 1, 21.8 + k * 0.7, x + 21, 21.8 + k * 0.7], 0.15, AL('rgba(255,255,255,0.12)')); }
  p.rect(-58, 30, 116, 26, M('#83837c', 0.05), 1); p.line([-58, 43, 58, 43], 0.6, AL('rgba(230,210,90,0.6)')); for (let x = -54; x < 56; x += 9) p.rect(x, 31, 0.5, 24, AL('rgba(0,0,0,0.12)'));
  for (let i = 0; i < 4; i++) { const x = -48 + i * 12; p.rect(x, 33, 8, 9, M('#555852', 0.1), 0.4); } // tyre tracks bays
  truckP(p, 34, 50, 0, f, 'cargo'); crates(p, 40, 32, 4, 2, '#5f6b45', 0.22);
  for (const x of [-58, 56]) p.line([x, -58, x, 58], 0.8, M('#6a6a62', 0.18)); flag(p, 50, 52, 0.4); lamp(p, -56, 28); lamp(p, 56, 28); p.grain(0.11);
};
/* ---------------- Operations / intel centre (3×3): dish drawn at (-10,-10) ---------------- */
BART.ops = (p, st, f) => {
  pad(p, 92, 92, st, { grid: 12 }); fenceLine(p, [-45, -45, 45, -45, 45, 45, -45, 45, -45, -45]);
  parapetBlock(p, -42, -42, 56, 56, st.roof2, 0.66); p.circ(-10, -10, 13, M('#8f8e88', 0.68)); p.circ(-10, -10, 11, M('#5a5b56', 0.72)); // dish turntable
  windows(p, -42, -42.6, 56, 1, 10); for (const [x, y] of [[-36, 6], [-24, 6], [6, -36], [6, -24]]) acUnit(p, x, y, 0.66); stairBox(p, 4, 4, 8, 8, st, 0.74);
  radome(p, 28, -26, 9, 0.75); radome(p, 30, 26, 6.4, 0.6); mast(p, -34, 32, 1, 7); mast(p, 34, -42, 0.9, 5); satDish(p, 8, 34, 5.6, -2.4, 0.5);
  p.rect(-42, 20, 30, 20, M(shade(st.pad, -0.1), 0.04), 1); truckP(p, -28, 30, 0, f, 'jeep'); roofEmblem(p, f, -30, -30, 5.5);
  flag(p, -42, 42, 0.4); p.grain(0.11);
};
/* ---------------- Airfield (6×4) ---------------- */
BART.airfield = (p, st, f) => {
  pad(p, 188, 124, st, { grid: 20 });
  // runway
  p.rect(-92, 18, 184, 26, M('#3c3e3b', 0.06, { s: 0.12 }), 1); for (let x = -82; x < 84; x += 14) p.rect(x, 30.4, 8, 1.2, AL('#e6e3d8'));
  p.rect(-90, 19.5, 180, 0.8, AL('#e6e3d8')); p.rect(-90, 41.7, 180, 0.8, AL('#e6e3d8')); for (let i = 0; i < 7; i++) { p.rect(-88, 21.5 + i * 2.8, 7, 1.4, AL('#e6e3d8')); p.rect(81, 21.5 + i * 2.8, 7, 1.4, AL('#e6e3d8')); }
  for (let x = -90; x <= 90; x += 10) { p.circ(x, 17.6, 0.5, M('#ffe2a0', 0.1, { e: 0.6 })); p.circ(x, 44.4, 0.5, M('#ffe2a0', 0.1, { e: 0.6 })); }
  for (let i = 0; i < 20; i++) { const r = RNG(i * 7 + 1); p.ell(r.range(-80, 80), r.range(24, 38), r.range(3, 8), r.range(0.4, 0.9), 0, AL('rgba(20,20,18,0.16)')); } // tyre marks
  // hardened aircraft shelters (dome-roofed) — 4 bays
  for (let i = 0; i < 4; i++) { const x = -66 + i * 34; p.rect(x - 14, -58, 28, 40, M(shade(st.pad, -0.14), 0.04), 1); // open blast-wall revetment (jets park inside)
    p.rect(x - 15, -58, 3.2, 38, M('#9a978e', 0.5, { s: 0.05 }), 0.6); p.rect(x + 11.8, -58, 3.2, 38, M('#9a978e', 0.5, { s: 0.05 }), 0.6); p.rect(x - 15, -60, 30, 3.4, M('#a3a097', 0.54, { s: 0.05 }), 0.6);
    p.circ(x, -37, 9, AL('rgba(230,210,90,0.45)')); p.circ(x, -37, 8.4, AL(shade(st.pad, -0.14))); p.rect(x - 0.6, -52, 1.2, 30, AL('rgba(230,210,90,0.6)')); }
  // control tower + apron
  block(p, 72, -58, 18, 28, st, 0.6, 'flat', st.roof2); p.circ(81, -44, 6, M('#3b5566', 0.98, { s: 0.95 })); mast(p, 81, -56, 1.05, 4); radome(p, 84, -20, 4.6, 0.5);
  p.rect(-92, -14, 184, 6, M('#6b6c66', 0.05)); for (let x = -88; x < 90; x += 12) p.rect(x, -11.4, 6, 0.8, AL('rgba(230,210,90,0.6)'));
  truckP(p, 70, 2, 0, f, 'fuel'); truckP(p, 54, 2, 0, f, 'jeep'); roofEmblem(p, f, 0, 4, 7); flag(p, 88, 52, 0.4); flagRow(p, 70, 52, 2); p.grain(0.1);
};
/* ---------------- Repair depot (3×3) ---------------- */
/* ---------------- Strategic weapon silo (4×4): launcher drawn at (0,+4) ---------------- */
BART.super = (p, st, f) => {
  pad(p, 124, 124, st, { stripe: 1, grid: 20 }); fenceLine(p, [-61, -61, 61, -61, 61, 61, -61, 61, -61, -61]);
  p.circ(0, 4, 46, M('#6a6963', 0.05)); p.circ(0, 4, 42, AL('rgba(230,210,90,0.4)')); p.circ(0, 4, 40, AL('#6a6963'));
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; p.rect(Math.cos(a) * 41 - 1.4, 4 + Math.sin(a) * 41 - 1.4, 2.8, 2.8, AL(i % 2 ? 'rgba(20,20,20,0.6)' : 'rgba(230,210,90,0.7)')); }
  for (const s of [-1, 1]) { p.rect(s * 30 - 7, -30, 14, 68, M(shade(st.roof2, -0.1), 0.2, { s: 0.2 }), 1); p.rect(s * 30 - 6, -28, 12, 64, M('#4c4e4a', 0.24, { s: 0.3 })); for (let y = -24; y < 34; y += 8) p.line([s * 30 - 6, y, s * 30 + 6, y], 0.3, AL('rgba(0,0,0,0.25)')); } // blast doors (open)
  block(p, 34, -58, 24, 22, st, 0.55, 'flat', st.roof2); radome(p, 46, -47, 5, 0.66); for (let i = 0; i < 4; i++) p.rect(-56 + i * 10, -58, 7, 16, M('#5d605c', 0.3, { s: 0.4 }), 0.5);
  bigTank(p, -48, 48, 6, '#d6d3c8', 0.5); bigTank(p, -34, 50, 4.6, '#d6d3c8', 0.44); guardTower(p, 54, 54, st); roofEmblem(p, f, 46, 24, 6);
  sandbags(p, [-50, 36, -46, 40, -42, 43, 38, 43, 42, 40, 46, 36], 0.3); flag(p, 52, -40, 0.4); p.grain(0.11);
};
/* ---------------- Defences ---------------- */
BART.mg = (p, st, f) => { pad(p, 60, 60, st, { grid: 30 }); sandbagRing(p, 0, 0, 22, 0.3); sandbagRing(p, 0, 0, 19.6, 0.34); p.rect(-14, -14, 28, 28, M('#8f8c84', 0.5, { s: 0.05 }), 4); p.rect(-12, -12, 24, 24, HO(0.52)); p.circ(0, 0, 8, M('#6c6a64', 0.56)); for (const [x, y] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) p.circ(x, y, 1.4, M('#7b6a4a', 0.2)); crates(p, 14, 18, 2, 1, '#5f6b45', 0.22); p.grain(0.12); };
BART.atg = (p, st, f) => { pad(p, 60, 60, st, { grid: 30 }); p.rect(-21, -21, 42, 42, M('#8c897f', 0.36, { s: 0.05 }), 6); p.rect(-17, -17, 34, 34, HO(0.4)); for (let i = 0; i < 4; i++) { const a = i * PI / 2; p.rect(Math.cos(a) * 19 - 3, Math.sin(a) * 19 - 3, 6, 6, M('#77746b', 0.46), 1); } sandbags(p, [-24, -24, -20, -26, -16, -26, -12, -26, 12, 26, 16, 26, 20, 26, 24, 24], 0.36); p.circ(0, 0, 10, M('#6c6a64', 0.44)); crates(p, -26, 18, 2, 1, '#6b5a3a', 0.2); p.grain(0.12); };
BART.sam = (p, st, f) => { pad(p, 92, 92, st, { grid: 15 }); p.circ(0, 0, 31, M('#847e6e', 0.22)); p.circ(0, 0, 27, M('#9b9888', 0.12)); sandbagRing(p, 0, 0, 33, 0.3); p.circ(-26, -26, 7.5, M('#6f6d66', 0.3)); block(p, 22, 22, 20, 18, st, 0.42, 'flat', st.roof2); acUnit(p, 30, 28, 0.44); truckP(p, -30, 30, -PI / 2, f, 'cargo'); mast(p, 38, -36, 0.9, 5); flag(p, 38, -42, 0.4); p.grain(0.12); };
