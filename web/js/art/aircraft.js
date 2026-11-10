/* ============================================================
   War of Power — رسومات الطائرات الدقيقة
   الملف: js/art/aircraft.js   ·   ترتيب التحميل: 9 من 43
   ============================================================ */
'use strict';
/* ===== Aircraft art v2: accurate top-down planforms per airframe (nose = +x) ===== */
const STEALTH = { usa: '#596067', chn: '#5c636a', rus: '#6a7783' }; // F-35 'have glass' grey, J-20 dark grey, Su-57 blue-grey

const mirY = pts => pts.map((v, i) => i % 2 ? -v : v);
function sym(p, pts, mat) { p.poly(pts, mat); p.poly(mirY(pts), mat); }
function wingSym(p, pts, col, h0, h1, ex) { // planform half (+y) with thickness falling off towards the tip
  const ys = pts.filter((v, i) => i % 2), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const m = Object.assign({ c: col, h: h0, hg: [0, y0, h0, 0, y1, h1], s: 0.28 }, ex || {}); p.poly(pts, m); p.poly(mirY(pts), Object.assign({}, m, { hg: [0, -y0, h0, 0, -y1, h1] }));
}
// fuselage from a half-outline (+y side, nose first): albedo + rounded cross-section height
function fus(p, half, col, hTop, hEdge, ex) {
  const full = half.slice(); for (let i = half.length - 2; i >= 0; i -= 2) full.push(half[i], -half[i + 1]);
  let ymax = 0.1; for (let i = 1; i < half.length; i += 2) ymax = Math.max(ymax, half[i]);
  p.poly(full, Object.assign({ c: col, h: hEdge, s: 0.28 }, ex || {}));
  const up = [half[0], 0]; for (let i = 0; i < half.length; i += 2) up.push(half[i], half[i + 1]); up.push(half[half.length - 2], 0);
  p.poly(up, { c: null, h: hTop, hg: [0, ymax, hEdge, 0, 0, hTop], s: (ex && ex.s) || 0.28 });
  p.poly(mirY(up), { c: null, h: hTop, hg: [0, -ymax, hEdge, 0, 0, hTop], s: (ex && ex.s) || 0.28 });
}
function pline(p, pts, a) { p.line(pts, 0.16, AL(`rgba(0,0,0,${a || 0.22})`)); }
function psym(p, pts, a) { pline(p, pts, a); pline(p, mirY(pts), a); }
function finSym(p, pts, col, h) { sym(p, pts, M(col, h || 0.96, { s: 0.3 })); }
function nozzle(p, x, y, r, tvc) { p.circ(x, y, r * 1.12, M('#3c3d3c', 0.55, { s: 0.5 })); p.circ(x, y, r * 0.86, M('#27282a', 0.42, { s: 0.4 })); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; p.line([x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05], 0.12, AL('rgba(255,255,255,0.12)')); } p.circ(x, y, r * 0.4, M('#141414', 0.3)); if (tvc) p.rect(x - r * 0.2, y - r * 1.1, r * 0.4, r * 2.2, M('#333', 0.5)); }
function canopyF(p, x, y, l, w, gold) { p.ell(x, y, l, w, 0, M(gold ? '#7a6a3c' : '#22374a', 0.98, { s: 1, hr: [x + l * 0.25, y - w * 0.3, l, 1, 0.84] })); p.ell(x + l * 0.3, y - w * 0.28, l * 0.42, w * 0.22, 0, AL('rgba(255,255,255,0.38)')); p.ell(x, y, l, w, 0, { c: null, h: 0.98, t: -1 }); }
function aam(p, x, y, L) { cyl(p, x - L / 2, x + L / 2, y, 0.38, '#e3e2da', 0.62, 0.78); p.poly([x + L / 2, y - 0.38, x + L / 2 + 0.9, y, x + L / 2, y + 0.38], M('#cfcdc4', 0.75)); for (const s of [-1, 1]) p.poly([x - L / 2, y, x - L / 2 + 1.2, y, x - L / 2 + 0.2, y + s * 1.1], M('#bdbbb2', 0.66)); }
function bombP(p, x, y, L, w) { p.ell(x, y, L / 2, w / 2, 0, M('#5f6450', 0.58, { s: 0.25, hr: [x, y - w * 0.15, L / 2, 0.68, 0.5] })); p.rect(x - L / 2 - 0.6, y - w * 0.7, 0.9, w * 1.4, M('#4b4f40', 0.5)); }
function pod(p, x, y, L, r) { cyl(p, x - L / 2, x + L / 2, y, r, '#4e5248', 0.5, 0.72); p.circ(x + L / 2, y, r * 0.8, M('#2c2d29', 0.66)); for (let k = -1; k <= 1; k++) p.circ(x + L / 2, y + k * r * 0.45, r * 0.2, M('#111', 0.6)); }
function insignia(p, f, x, y, r) {
  if (f === 'usa') { p.circ(x, y, r, M('#e8e6e0', 0.36, { t: 0.55 })); star5(p, x, y, r * 0.8, -PI / 2 * 0, M('#f2f0ea', 0.38)); p.rect(x - r * 0.25, y - r * 1.9, r * 0.5, r * 0.8, M('#e8e6e0', 0.36, { t: 0.5 })); p.rect(x - r * 0.25, y + r * 1.1, r * 0.5, r * 0.8, M('#e8e6e0', 0.36, { t: 0.5 })); }
  else if (f === 'rus' || f === 'chn') { star5(p, x, y, r * 1.1, 0, M(f === 'rus' ? '#f0eee6' : '#e3c34a', 0.36)); star5(p, x, y, r * 0.88, 0, M('#b8312a', 0.37, { t: 0.35 })); }
  else if (f === 'eu') { p.circ(x, y, r, M('#24427f', 0.36)); p.circ(x, y, r * 0.66, M('#f0eee8', 0.37)); p.circ(x, y, r * 0.34, M('#b8312a', 0.38, { t: 0.4 })); }
  else if (f === 'arb') { p.circ(x, y, r, M('#2b6b47', 0.36, { t: 0.35 })); p.circ(x, y, r * 0.6, M('#f0eee8', 0.37)); p.line([x, y + r * 0.45, x, y - r * 0.45], r * 0.18, M('#2b6b47', 0.38)); }
  else { p.rect(x - r, y - r * 0.7, r * 2, r * 0.47, M('#2f7a3e', 0.36)); p.rect(x - r, y - r * 0.23, r * 2, r * 0.47, M('#f0eee8', 0.36)); p.rect(x - r, y + r * 0.24, r * 2, r * 0.47, M('#1a1a1a', 0.36)); for (const k of [-1, 0, 1]) star5(p, x + k * r * 0.6, y, r * 0.2, 0, M('#c8302a', 0.38)); }
}
/* ---------- fighters ---------- */
A('usa_jet', { L: 42, W: 30, nozzles: [[-20, 0, 2.1]], draw(p, f) { // F-35A Lightning II
  const c = STEALTH.usa;
  wingSym(p, [3, 4.4, -7.4, 13.8, -10.2, 13.8, -12.2, 4.8], c, 0.36, 0.24); wingSym(p, [-13, 3.4, -16.6, 9.8, -18.8, 9.8, -19.6, 3.0], c, 0.34, 0.24);
  fus(p, [21, 0, 17, 1.7, 12, 3.0, 7, 4.2, 3, 4.9, -6, 5.1, -14, 4.1, -18.8, 2.4, -19.6, 1.6], c, 0.78, 0.42);
  sym(p, [6.4, 4.0, 2.2, 5.6, -1.6, 5.4, 1, 4.2], M(shade(c, 0.06), 0.62)); // DSI intake bumps
  finSym(p, [-11.2, 3.2, -13, 3.0, -18.4, 6.8, -16.4, 6.9], shade(c, -0.05));
  canopyF(p, 10, 0, 4.6, 1.55, true); nozzle(p, -20, 0, 1.9);
  psym(p, [15, 1.2, 4, 3.8, -6, 4.2, -15, 3.4]); psym(p, [1, 4.6, -6.6, 12.6]); psym(p, [-3, 5, -9, 11.2], 0.14); pline(p, [9, 0, -16, 0], 0.12);
  for (const y of [-3.2, 3.2]) p.rect(-4.5, y - 0.7, 6, 1.4, M(shade(c, -0.08), 0.6)); // weapon bay doors
  insignia(p, f, -7.5, 9.6, 1.25); insignia(p, f, -7.5, -9.6, 1.25); p.grain(0.08);
} });
A('rus_jet', { L: 50, W: 36, nozzles: [[-23, -5.2, 1.7], [-23, 5.2, 1.7]], draw(p, f) { // Su-57 Felon
  const c = STEALTH.rus;
  wingSym(p, [5, 6.6, -11, 17.4, -14.6, 17.4, -13.2, 7.6], c, 0.34, 0.22); sym(p, [11, 2.8, 6.4, 7.6, 4.2, 7.0, 7.4, 3.2], M(shade(c, 0.05), 0.4)); // LEVCONs
  wingSym(p, [-15.2, 6.6, -20.4, 12.8, -23.2, 12.8, -22.6, 6.4], c, 0.34, 0.22);
  fus(p, [25, 0, 20, 1.6, 14, 2.8, 9, 3.4, 4, 3.6, -8, 3.4, -18, 2.4, -21, 1.6], c, 0.82, 0.5); // centre body
  for (const s of [-1, 1]) { const ny = s * 5.2; p.poly([5, ny - 1.6 * s, 2, ny - 2.2 * s, -21, ny - 1.8 * s, -22.4, ny - 1.2 * s, -22.4, ny + 1.2 * s, -21, ny + 1.8 * s, 2, ny + 2.2 * s, 5, ny + 1.6 * s], M(shade(c, -0.03), 0.66, { hg: [0, ny - 2.2 * s, 0.5, 0, ny, 0.72], s: 0.28 })); }
  p.poly([-19.5, -1.4, -25.5, 0, -19.5, 1.4], M(shade(c, -0.06), 0.62)); // tail stinger
  finSym(p, [-12.6, 5.6, -14.4, 5.4, -19.4, 8.2, -17.8, 8.4], shade(c, -0.06));
  canopyF(p, 14.5, 0, 4.4, 1.5); nozzle(p, -23, -5.2, 1.6); nozzle(p, -23, 5.2, 1.6);
  psym(p, [20, 1.4, 8, 3.2, -6, 3.4]); psym(p, [2, 7.2, -11, 16.4]); pline(p, [12, 0, -17, 0], 0.12);
  insignia(p, f, -9, 12, 1.3); insignia(p, f, -9, -12, 1.3); p.grain(0.08);
} });
A('chn_jet', { L: 52, W: 32, nozzles: [[-23.5, -2.0, 1.55], [-23.5, 2.0, 1.55]], draw(p, f) { // J-20 Mighty Dragon
  const c = STEALTH.chn;
  wingSym(p, [3, 4.6, -13.6, 15.2, -16.2, 15.2, -16.8, 4.2], c, 0.34, 0.22); // delta
  wingSym(p, [10.4, 3.6, 5.2, 9.6, 3, 9.6, 4.4, 4.2], c, 0.38, 0.3); // canards
  fus(p, [27, 0, 22, 1.5, 15, 2.9, 9, 4.0, 4, 4.7, -6, 4.4, -16, 4.0, -22, 3.3, -23.4, 2.6], c, 0.8, 0.44);
  sym(p, [9.6, 3.8, 6.4, 5.4, 1, 5.0, 4.2, 4.0], M(shade(c, 0.06), 0.6)); // DSI intakes
  finSym(p, [-13, 3.6, -15, 3.6, -21, 6.6, -19, 6.8], shade(c, -0.05));
  sym(p, [-17.5, 2.2, -21.5, 3.0, -20, 3.4], M(shade(c, -0.1), 0.3)); // ventral fins
  canopyF(p, 15.5, 0, 5, 1.6, true); nozzle(p, -23.4, -2.0, 1.5); nozzle(p, -23.4, 2.0, 1.5);
  psym(p, [21, 1.3, 8, 3.8, -8, 4.2, -18, 3.6]); psym(p, [1.4, 5, -13, 14.2]); pline(p, [13, 0, -20, 0], 0.12);
  insignia(p, f, -9, 10.5, 1.25); insignia(p, f, -9, -10.5, 1.25); p.grain(0.08);
} });
A('eu_jet', { L: 42, W: 29, nozzles: [[-19.5, -1.5, 1.3], [-19.5, 1.5, 1.3]], draw(p, f) { // Eurofighter Typhoon
  const c = '#7d848b';
  wingSym(p, [6.5, 3.4, -12.6, 13.6, -14.8, 13.6, -14.8, 3.4], c, 0.32, 0.22); // 53deg delta
  wingSym(p, [12, 2.5, 8.2, 7.4, 6.6, 7.4, 7.2, 2.7], c, 0.36, 0.28); // canards
  fus(p, [21, 0, 17, 1.2, 12, 2.3, 6, 3.3, -4, 3.6, -14, 3.2, -18.5, 2.6, -19.6, 2.2], c, 0.78, 0.46);
  p.line([-6.5, 0, -17.8, 0], 1.05, M(shade(c, -0.08), 0.98, { s: 0.3 })); // fin (top view)
  canopyF(p, 11.5, 0, 4.2, 1.35); nozzle(p, -19.5, -1.5, 1.25); nozzle(p, -19.5, 1.5, 1.25);
  for (const y of [-9.4, 9.4]) { aam(p, -6, y, 6); p.rect(-6.5, y - 0.3, 3, 0.6, M('#555', 0.45)); } for (const y of [-6, 6]) bombP(p, -5, y, 5.4, 1.5);
  psym(p, [15, 1.0, 4, 3.1, -12, 3.2]); psym(p, [4.6, 3.6, -12, 12.6]); pline(p, [10, 0, -6, 0], 0.12);
  insignia(p, f, -9.5, 11.4, 1.15); insignia(p, f, -9.5, -11.4, 1.15); p.grain(0.08);
} });
A('arb_jet', { L: 48, W: 33, nozzles: [[-22, -2.5, 1.7], [-22, 2.5, 1.7]], draw(p, f) { // F-15SA Strike Eagle
  const c = '#8b9297';
  wingSym(p, [4, 6.2, -7.8, 15.8, -11.6, 15.8, -11, 5.6], c, 0.34, 0.24); // cropped delta wing
  wingSym(p, [-14, 4.8, -18.2, 11.2, -21.2, 11.2, -21.4, 4.4], c, 0.32, 0.24); sym(p, [-18.2, 11.2, -17.4, 9.6, -18.8, 9.6], M(c, 0.3));
  fus(p, [24, 0, 20, 1.3, 15, 2.3, 10, 2.9, 5, 3.1, -6, 3.4, -18, 3.2, -21, 2.8], c, 0.8, 0.5);
  for (const s of [-1, 1]) p.poly([11, s * 3.0, 11, s * 6.6, -2, s * 6.8, -19.8, s * 5.0, -20.6, s * 3.0], M(shade(c, -0.02), 0.62, { hg: [0, s * 6.8, 0.48, 0, s * 3, 0.66], s: 0.28 })); // intakes + conformal tanks
  for (const s of [-1, 1]) { p.rect(9.4, s * 3.1 - (s < 0 ? 3.5 : 0), 2, 3.5, M('#2b2c2b', 0.66)); }
  sym(p, [-11, 4.4, -12.6, 4.4, -20.4, 5.2, -19, 5.6], M(shade(c, -0.08), 0.98, { s: 0.3 })); // twin fins
  canopyF(p, 14.5, 0, 4.6, 1.5); nozzle(p, -21.8, -2.5, 1.65); nozzle(p, -21.8, 2.5, 1.65);
  for (const y of [-11.5, -8.8, 8.8, 11.5]) bombP(p, -4.5, y, 6, 1.6); for (const y of [-6.2, 6.2]) aam(p, -2, y, 6.4); for (const y of [-14.6, 14.6]) aam(p, -7, y, 5.6);
  psym(p, [17, 1.4, 6, 3.0, -12, 3.2]); psym(p, [2, 6, -8, 14.8]); pline(p, [12, 0, -19, 0], 0.12);
  insignia(p, f, -9, 13.4, 1.3); insignia(p, f, -9, -13.4, 1.3); p.grain(0.08);
} });
/* ---------- elite aircraft ---------- */
A('usa_el2', { L: 48, W: 35, nozzles: [[-21.5, -1.9, 1.3], [-21.5, 1.9, 1.3]], draw(p, f) { // F-22 Raptor
  const c = '#6d737a';
  wingSym(p, [6, 5.2, -8.6, 16.6, -11.4, 16.6, -13.2, 6], c, 0.34, 0.22);
  wingSym(p, [-13.6, 4.6, -18.6, 11.6, -21.2, 11.4, -22.2, 4.0], c, 0.32, 0.22);
  fus(p, [24, 0, 18.5, 1.9, 12, 3.2, 7, 4.6, 3, 5.6, -6, 5.8, -16, 4.6, -20.4, 3.4, -21.4, 3.0], c, 0.8, 0.44);
  sym(p, [8, 3.6, 7, 5.8, 3, 6.1, 4, 4.4], M(shade(c, 0.05), 0.62)); // caret intakes
  finSym(p, [-11, 4.4, -13, 4.4, -18.6, 7.8, -16.8, 7.9], shade(c, -0.05));
  for (const s of [-1, 1]) p.rect(-22.6, s * 1.9 - 1.15, 2.4, 2.3, M('#2a2b2c', 0.45, { s: 0.4 })); // 2-D vectoring nozzles
  canopyF(p, 12, 0, 5, 1.6, true);
  psym(p, [18, 1.6, 8, 4.4, -6, 5.2, -16, 4.2]); psym(p, [4.4, 5.6, -8.6, 15.6]); pline(p, [10, 0, -20, 0], 0.12);
  insignia(p, f, -8, 12, 1.25); insignia(p, f, -8, -12, 1.25); p.grain(0.08);
} });
A('rus_el2', { L: 52, W: 36, nozzles: [[-22.6, -5.2, 1.7], [-22.6, 5.2, 1.7]], draw(p, f) { // Su-35S Flanker-E
  const c = '#7a8b99';
  wingSym(p, [2, 7.4, -10.6, 17.6, -13.6, 17.6, -12.2, 7.2], c, 0.32, 0.22);
  wingSym(p, [-15.4, 6.8, -20.6, 13.2, -23.4, 13.0, -23, 6.4], c, 0.32, 0.22);
  p.path(cx => { cx.moveTo(12, 2.4); cx.quadraticCurveTo(6, 3.6, 2, 7.6); cx.lineTo(-2, 7.6); cx.lineTo(-2, -7.6); cx.lineTo(2, -7.6); cx.quadraticCurveTo(6, -3.6, 12, -2.4); cx.closePath(); }, M(c, 0.5)); // LERX
  fus(p, [26, 0, 21, 1.4, 15, 2.4, 9, 2.8, 0, 3.0, -12, 2.4, -20, 1.6], c, 0.82, 0.52);
  for (const s of [-1, 1]) { const ny = s * 5.1; p.poly([0, ny - 2 * s, -21, ny - 1.8 * s, -22.4, ny - 1.3 * s, -22.4, ny + 1.3 * s, -21, ny + 1.9 * s, 0, ny + 2.2 * s], M(shade(c, -0.03), 0.66, { hg: [0, ny - 2 * s, 0.5, 0, ny, 0.72], s: 0.28 })); }
  p.poly([-20, -1.4, -27, 0, -20, 1.4], M(shade(c, -0.05), 0.6));
  sym(p, [-12, 5.4, -13.8, 5.4, -20.4, 6.2, -19.2, 6.6], M(shade(c, -0.08), 0.98, { s: 0.3 }));
  canopyF(p, 16.5, 0, 4.4, 1.4); nozzle(p, -22.6, -5.2, 1.6, 1); nozzle(p, -22.6, 5.2, 1.6, 1);
  for (const y of [-17.8, 17.8]) aam(p, -11, y, 6); for (const y of [-12, -9.4, 9.4, 12]) aam(p, -6, y, 6.6); for (const y of [-1.5, 1.5]) bombP(p, -6, y, 6, 1.4);
  psym(p, [20, 1.2, 8, 2.7, -12, 2.4]); pline(p, [14, 0, -18, 0], 0.12);
  insignia(p, f, -9, 13, 1.3); insignia(p, f, -9, -13, 1.3); p.grain(0.08);
} });
A('chn_el2', { L: 44, W: 30, nozzles: [[-20.5, -2.0, 1.4], [-20.5, 2.0, 1.4]], draw(p, f) { // J-35A
  const c = '#6c7379';
  wingSym(p, [3, 4.6, -7.6, 14.4, -10.4, 14.4, -12.6, 5], c, 0.36, 0.24); wingSym(p, [-13.4, 3.6, -17.2, 10, -19.4, 10, -20, 3.2], c, 0.34, 0.24);
  fus(p, [22, 0, 18, 1.7, 12.5, 3.0, 7, 4.3, 3, 5.0, -6, 5.2, -14, 4.4, -19.4, 3.4, -20.4, 3.0], c, 0.78, 0.42);
  sym(p, [6.4, 4.1, 2.2, 5.7, -1.6, 5.5, 1, 4.3], M(shade(c, 0.06), 0.62));
  finSym(p, [-11.4, 3.4, -13.2, 3.2, -18.4, 7.0, -16.6, 7.1], shade(c, -0.05));
  canopyF(p, 10.5, 0, 4.8, 1.55, true); nozzle(p, -20.5, -2.0, 1.35); nozzle(p, -20.5, 2.0, 1.35);
  psym(p, [15, 1.2, 4, 3.9, -6, 4.4, -15, 3.6]); psym(p, [1, 4.8, -6.8, 13.2]); pline(p, [9, 0, -17, 0], 0.12);
  insignia(p, f, -7.6, 10, 1.25); insignia(p, f, -7.6, -10, 1.25); p.grain(0.08);
} });
function rafale(p, f, c, naval) { // Dassault Rafale (B/C/M/F4/EM share the planform)
  wingSym(p, [2.2, 4.3, -11.6, 13.4, -13.8, 13.4, -15, 4.0], c, 0.32, 0.22);
  wingSym(p, [5.2, 4.1, 1.6, 8.4, 0, 8.4, 0.6, 4.2], c, 0.38, 0.3);
  fus(p, [20, 0, 16, 1.2, 11, 2.3, 6, 3.0, 4, 4.3, -4, 4.1, -14, 3.3, -17.6, 2.4], c, 0.78, 0.46);
  sym(p, [6.5, 3.0, 4, 4.4, -1, 4.3, 0.5, 3.1], M('#2d2f30', 0.6)); // side intakes
  p.line([-5, 0, -16.2, 0], 1, M(shade(c, -0.08), 0.98, { s: 0.3 }));
  canopyF(p, 10.5, 0, 4.2, 1.3); nozzle(p, -18, -1.5, 1.2); nozzle(p, -18, 1.5, 1.2);
  for (const y of [-13.4, 13.4]) aam(p, -8.6, y, 5.6); for (const y of [-9.6, 9.6]) { cyl(p, -11, -3, y, 0.9, '#d8d6cc', 0.5, 0.7); p.poly([-3, y - 0.9, -1, y, -3, y + 0.9], M('#ccc', 0.7)); } // SCALP / Meteor
  if (naval) { p.rect(-16.4, -0.6, 3, 1.2, M('#555', 0.5)); pline(p, [12, 0.4, 16, 0.4], 0.3); }
  psym(p, [14, 1.0, 4, 3.0, -12, 3.2]); psym(p, [1, 4.4, -11.6, 12.4]);
  insignia(p, f, -9.4, 10.8, 1.15); insignia(p, f, -9.4, -10.8, 1.15); p.grain(0.08);
}
A('eu_el2', { L: 40, W: 29, nozzles: [[-18, -1.5, 1.2], [-18, 1.5, 1.2]], draw(p, f) { rafale(p, f, '#7f878d'); } });
A('arb_el2', { L: 40, W: 29, nozzles: [[-18, -1.5, 1.2], [-18, 1.5, 1.2]], draw(p, f) { rafale(p, f, '#a7a493'); } });
/* ---------- helicopters (rotor sprites drawn separately) ---------- */
function stubWing(p, x, y0, y1, chord, col) { p.rect(x - chord / 2, Math.min(y0, y1), chord, Math.abs(y1 - y0), M(col, 0.5, { s: 0.2 }), 0.3); }
function hellfire4(p, x, y) { p.rect(x - 2.2, y - 1.2, 4.4, 2.4, M('#3b3e36', 0.46), 0.2); for (const dy of [-0.6, 0.6]) for (const dx of [-0.2, 0]) cyl(p, x - 2.4 + dx, x + 2.6, y + dy, 0.28, '#5d6151', 0.5, 0.62); }

A('usa_heli', { L: 46, W: 18, rotor: 18, rx: 1.5, tailR: [-21.2, -1.7, 3.2], blades: 4, dome: 2.0, draw(p, f) { // AH-64E Apache Guardian
  const c = '#4c5243';
  p.rect(-22, -1.0, 23, 2.0, M(c, 0.5, { s: 0.2 }), 0.8); p.rect(-21, -4.2, 2.6, 8.4, M(shade(c, -0.05), 0.46), 0.5); // boom + stabilator
  stubWing(p, -0.5, 2.3, 7.8, 3.2, shade(c, -0.03)); stubWing(p, -0.5, -2.3, -7.8, 3.2, shade(c, -0.03));
  hellfire4(p, -0.3, 6.6); hellfire4(p, -0.3, -6.6); pod(p, 0.2, 4.2, 4.6, 0.9); pod(p, 0.2, -4.2, 4.6, 0.9);
  fus(p, [16, 0, 14, 1.2, 10, 1.8, 4, 2.3, -2, 2.3, -7, 1.6], c, 0.72, 0.5);
  for (const s of [-1, 1]) p.ell(-3.6, s * 3.3, 4.2, 1.6, 0, M(shade(c, -0.04), 0.78, { hr: [-3, s * 3, 4, 0.86, 0.62] })); // engine nacelles
  for (const s of [-1, 1]) p.rect(-7.8, s * 3.3 - 0.7, 1.4, 1.4, M('#2a2b27', 0.7)); // exhaust suppressors
  canopyF(p, 11.4, 0, 2.6, 1.2); canopyF(p, 7.2, 0, 2.6, 1.4); p.circ(16.2, 0, 1.2, M('#2f322b', 0.6)); p.line([13, 0, 17.5, 0], 0.5, M('#2b2b28', 0.5)); // TADS + gun
  insignia(p, f, -14, 0, 0.85); p.grain(0.12);
} });
A('rus_heli', { L: 44, W: 20, rotor: 17, rx: 1, coax: 1, blades: 3, draw(p, f) { // Ka-52 Alligator
  const c = '#4e5c4b';
  p.rect(-20, -1.2, 20, 2.4, M(c, 0.5), 0.8); p.rect(-20.4, -6.2, 2.4, 12.4, M(shade(c, -0.05), 0.46), 0.4); p.rect(-21, -6.6, 3.4, 1.0, M(c, 0.9)); p.rect(-21, 5.6, 3.4, 1.0, M(c, 0.9)); // twin fins
  stubWing(p, -1.6, 3.2, 9, 3.4, shade(c, -0.03)); stubWing(p, -1.6, -3.2, -9, 3.4, shade(c, -0.03));
  for (const y of [-8, -5.4, 5.4, 8]) pod(p, -1.2, y, 4.8, 0.85); for (const y of [-3.9, 3.9]) cyl(p, -3.6, 1.6, y, 0.45, '#6a6e5c', 0.5, 0.62);
  fus(p, [16.5, 0, 14.5, 2.0, 10, 3.0, 2, 3.5, -4, 3.2, -8, 1.8], c, 0.74, 0.5);
  for (const s of [-1, 1]) p.ell(-3.4, s * 3.9, 4.2, 1.5, 0, M(shade(c, -0.04), 0.8, { hr: [-3, s * 3.6, 4, 0.86, 0.62] }));
  p.ell(10.5, 0, 4.0, 2.6, 0, M('#22374a', 1, { s: 1, hr: [11, -1, 4, 1, 0.84] })); p.ell(11.6, -1, 1.6, 0.8, 0, AL('rgba(255,255,255,0.35)')); // side-by-side cockpit
  p.circ(16.6, 0, 1.3, M('#30332c', 0.6)); insignia(p, f, -13, 0, 0.9); p.grain(0.12);
} });
A('chn_heli', { L: 44, W: 16, rotor: 17, rx: 1.5, tailR: [-20.4, 1.8, 3.0], blades: 5, draw(p, f) { // Z-10 Thunderbolt
  const c = '#5a6352';
  p.rect(-21, -1.0, 22, 2.0, M(c, 0.5), 0.6); p.poly([-19, -4.4, -21.6, -4.4, -21.6, 4.4, -19, 4.4], M(shade(c, -0.05), 0.46));
  stubWing(p, -0.8, 2.2, 7.2, 3, shade(c, -0.04)); stubWing(p, -0.8, -2.2, -7.2, 3, shade(c, -0.04)); hellfire4(p, -0.6, 6.2); hellfire4(p, -0.6, -6.2); pod(p, -0.2, 3.9, 4.4, 0.85); pod(p, -0.2, -3.9, 4.4, 0.85);
  fus(p, [15.5, 0, 13.4, 1.0, 9, 1.7, 3, 2.2, -2.5, 2.2, -7, 1.5], c, 0.72, 0.5, {}); // faceted body
  for (const s of [-1, 1]) p.poly([0, s * 2.2, -6.6, s * 2.2, -6.2, s * 3.8, -1, s * 3.8], M(shade(c, -0.04), 0.78)); pline(p, [12, 0, -6, 0], 0.15);
  canopyF(p, 10.6, 0, 2.6, 1.1); canopyF(p, 6.6, 0, 2.6, 1.3); p.circ(15.6, 0, 1.0, M('#2f322b', 0.6)); insignia(p, f, -13, 0, 0.85); p.grain(0.12);
} });
A('eu_heli', { L: 42, W: 16, rotor: 16, rx: 1.5, tailR: [-19.5, -1.8, 2.8], blades: 4, draw(p, f) { // Tiger HAD
  const c = '#4f5a4a';
  p.rect(-19.5, -1.1, 20, 2.2, M(c, 0.5), 0.8); p.rect(-19.8, -4.6, 2.2, 9.2, M(shade(c, -0.05), 0.46), 0.4); p.rect(-20.4, -5, 3, 1, M(c, 0.85)); p.rect(-20.4, 4, 3, 1, M(c, 0.85));
  stubWing(p, -0.5, 2.4, 7.4, 3, shade(c, -0.03)); stubWing(p, -0.5, -2.4, -7.4, 3, shade(c, -0.03)); hellfire4(p, -0.3, 6.4); hellfire4(p, -0.3, -6.4); aam(p, 0, 4, 4); aam(p, 0, -4, 4);
  fus(p, [15, 0, 13, 1.3, 9, 2.0, 3, 2.6, -3, 2.6, -7.5, 1.6], c, 0.74, 0.5);
  for (const s of [-1, 1]) p.ell(-3.4, s * 3.1, 3.6, 1.3, 0, M(shade(c, -0.04), 0.8, { hr: [-3, s * 3, 3.6, 0.86, 0.62] }));
  canopyF(p, 9.8, 0, 2.6, 1.3); canopyF(p, 5.6, 0, 2.6, 1.5); p.circ(15, 0, 1.0, M('#2f322b', 0.6)); insignia(p, f, -12, 0, 0.85); p.grain(0.12);
} });
A('arb_heli', { L: 42, W: 12, rotor: 16.5, rx: 1, tailR: [-19, -1.4, 2.6], blades: 2, draw(p, f) { // AH-1F Cobra
  const c = '#9a8e6c';
  p.rect(-19, -0.85, 20, 1.7, M(c, 0.5), 0.8); p.rect(-12, -3.4, 2.2, 6.8, M(shade(c, -0.05), 0.46), 0.3);
  stubWing(p, -0.5, 1.6, 5.6, 2.6, shade(c, -0.04)); stubWing(p, -0.5, -1.6, -5.6, 2.6, shade(c, -0.04)); pod(p, -0.2, 4.6, 4.6, 0.85); pod(p, -0.2, -4.6, 4.6, 0.85); for (const y of [-3, 3]) cyl(p, -2.6, 1.8, y, 0.5, '#5f6151', 0.5, 0.62);
  fus(p, [15, 0, 13, 0.9, 9, 1.35, 2, 1.7, -3.6, 1.7, -7, 1.1], c, 0.72, 0.5);
  p.ell(-3, 0, 4.4, 1.8, 0, M(shade(c, -0.05), 0.82));
  canopyF(p, 9.8, 0, 2.4, 1.0); canopyF(p, 5.8, 0, 2.4, 1.1); p.line([14, 0, 17.4, 0], 0.6, M('#2b2b28', 0.5)); insignia(p, f, -12, 0, 0.75); p.grain(0.12);
} });
function blackhawk(p, f, c, blades) { // UH-60 / Z-20 family
  p.rect(-21, -1.15, 20, 2.3, M(c, 0.5), 0.8); p.rect(-21.6, -4.6, 2.6, 9.2, M(shade(c, -0.05), 0.46), 0.4);
  fus(p, [14, 0, 12.4, 2.0, 8, 3.2, 1, 3.6, -5, 3.4, -9, 2.0], c, 0.74, 0.48);
  p.rect(-1.2, -4.6, 4.4, 9.2, M(shade(c, -0.06), 0.82), 0.8); // engine/transmission deck
  for (const s of [-1, 1]) { p.rect(-5.5, s * 3.4 - (s < 0 ? 0.5 : 0), 7, 0.5, AL('rgba(0,0,0,0.35)')); p.rect(4, s * 2.6 - 0.4, 2.2, 0.8, M('#222', 0.55)); } // sliding doors, door guns
  canopyF(p, 10.2, -1.1, 2.2, 1.1); canopyF(p, 10.2, 1.1, 2.2, 1.1); p.rect(-9.5, -0.6, 2, 1.2, M('#333', 0.6)); insignia(p, f, -6, 0, 1.1); p.grain(0.12);
}
A('usa_heli2', { L: 44, W: 16, rotor: 19, rx: 1, tailR: [-20.5, -2.2, 3.4], blades: 4, draw(p, f) { blackhawk(p, f, '#3f4639'); } });
A('arb_heli2', { L: 44, W: 16, rotor: 19, rx: 1, tailR: [-20.5, -2.2, 3.4], blades: 4, draw(p, f) { blackhawk(p, f, '#9b9070'); } });
A('chn_heli2', { L: 44, W: 16, rotor: 19, rx: 1, tailR: [-20.5, -2.2, 3.4], blades: 5, draw(p, f) { blackhawk(p, f, '#58614f'); } });
A('eu_heli2', { L: 44, W: 17, rotor: 19, rx: 0.5, tailR: [-20.4, 2.2, 3.4], blades: 4, draw(p, f) { // NH90
  const c = '#4c5547';
  p.rect(-20.6, -1.2, 19, 2.4, M(c, 0.5), 0.9); p.rect(-21, -4.2, 2.4, 8.4, M(shade(c, -0.05), 0.46), 0.4);
  fus(p, [14, 0, 12, 2.6, 7, 3.8, 0, 4.1, -5, 3.9, -9, 2.2], c, 0.76, 0.5); p.rect(-2, -3.4, 6, 6.8, M(shade(c, -0.06), 0.84), 1.2);
  for (const s of [-1, 1]) p.ell(-1, s * 4.6, 3.4, 1.1, 0, M(shade(c, -0.03), 0.5)); canopyF(p, 10.4, 0, 2.6, 2.2); insignia(p, f, -6, 0, 1.1); p.grain(0.12);
} });
function hip(p, f, c, armed) { // Mi-8 / Mi-17 family
  p.rect(-23, -1.25, 23, 2.5, M(c, 0.5), 0.8); p.rect(-22, -3.4, 2.2, 6.8, M(shade(c, -0.05), 0.46), 0.3);
  fus(p, [15, 0, 13.4, 2.4, 9, 3.6, 0, 3.9, -8, 3.7, -11, 2.4], c, 0.74, 0.48);
  p.rect(-3, -2.8, 9, 5.6, M(shade(c, -0.07), 0.84), 1); for (const s of [-1, 1]) { p.rect(3.2, s * 2.9 - 0.7, 2.6, 1.4, M('#232421', 0.86)); } // engines + intakes
  for (const s of [-1, 1]) cyl(p, -6, 1, s * 4.6, 0.9, shade(c, -0.03), 0.42, 0.6); // external fuel tanks
  if (armed) for (const s of [-1, 1]) { p.rect(-4.5, s * 4.2 - (s < 0 ? 3.4 : 0), 1.6, 3.4, M(shade(c, -0.08), 0.52)); pod(p, -3.4, s * 6.4, 4.6, 0.95); pod(p, -3.4, s * 8.0, 4.6, 0.95); }
  canopyF(p, 11.6, 0, 2.8, 2.4); p.rect(-11.4, -2, 0.8, 4, AL('rgba(0,0,0,0.35)')); insignia(p, f, -8, 0, 1.2); p.grain(0.13);
}
A('rus_heli2', { L: 48, W: 18, rotor: 21, rx: -0.5, tailR: [-22.6, 2.2, 3.6], blades: 5, draw(p, f) { hip(p, f, '#596451', 1); } });
/* ---------- drones ---------- */
A('usa_drone', { L: 24, W: 46, prop: [-11.6, 0, 2.6], draw(p, f) { // MQ-9 Reaper
  const c = '#9097a0';
  wingSym(p, [1.4, 1.2, -0.6, 22.6, -2.6, 22.6, -3.2, 1.2], c, 0.32, 0.24);
  fus(p, [12, 0, 10.6, 1.7, 7, 2.2, 0, 1.9, -8, 1.3, -11, 0.8], c, 0.74, 0.5);
  sym(p, [-7.6, 0.8, -11.6, 5.4, -12.6, 5.4, -10.6, 0.6], M(shade(c, -0.05), 0.62)); // V-tail
  p.line([-8.6, 0, -11.4, 0], 0.5, M(shade(c, -0.08), 0.3)); p.circ(11.4, 0, 1.0, M('#2a2a2a', 0.86, { s: 0.6 })); p.circ(8.6, 0, 0.9, M('#1d1d1d', 0.4)); // satcom bulge + sensor ball
  for (const y of [-12, -7, 7, 12]) { cyl(p, -2.8, 2.2, y, 0.35, '#c9c7bd', 0.4, 0.55); } insignia(p, f, -1, 17, 0.9); p.grain(0.08);
} });
A('rus_drone', { L: 16, W: 13, draw(p, f) { // ZALA Lancet: tandem cruciform wings
  const c = '#5e6a55';
  fus(p, [8, 0, 6.8, 0.9, 0, 1.1, -6.8, 0.9, -7.6, 0.4], c, 0.74, 0.5);
  sym(p, [4.6, 0.9, 3.4, 5.4, 2.2, 5.4, 2.6, 0.9], M(c, 0.4)); sym(p, [-3.6, 0.9, -5.4, 6.2, -6.6, 6.2, -6.4, 0.9], M(c, 0.4));
  p.circ(7.6, 0, 0.6, M('#191919', 0.9, { s: 0.7 })); p.rect(-7.8, -0.25, 1.6, 0.5, M('#333', 0.6)); insignia(p, f, -1, 0, 0.45); p.grain(0.08);
}, prop: [-7.8, 0, 1.6] });
A('chn_drone', { L: 24, W: 42, prop: [-11.4, 0, 2.4], draw(p, f) { // Wing Loong II
  const c = '#a1a6ab';
  wingSym(p, [1.4, 1.2, -0.4, 20.4, -2.2, 20.4, -3.0, 1.2], c, 0.32, 0.24); sym(p, [-0.4, 20.4, -0.9, 21.6, -2.2, 21.6, -2.2, 20.4], M(c, 0.5));
  fus(p, [12, 0, 10.4, 1.7, 6, 2.1, -2, 1.8, -9, 1.2, -11.2, 0.7], c, 0.74, 0.5);
  sym(p, [-7.2, 0.7, -11.2, 5.6, -12.2, 5.6, -10.4, 0.5], M(shade(c, -0.05), 0.62));
  p.circ(10.9, 0, 1.0, M('#2a2a2a', 0.86, { s: 0.6 })); for (const y of [-11, -6, 6, 11]) cyl(p, -2.6, 2.0, y, 0.33, '#c9c7bd', 0.4, 0.55); insignia(p, f, -1, 15.5, 0.85); p.grain(0.08);
} });
A('eu_drone', { L: 22, W: 40, prop: [10.6, 0, 2.2], draw(p, f) { // Patroller (motor glider)
  const c = '#9aa0a4';
  wingSym(p, [1.6, 0.9, 0.4, 19.6, -0.8, 19.6, -1.6, 0.9], c, 0.32, 0.24);
  fus(p, [10.4, 0, 9, 1.4, 4, 1.7, -4, 1.0, -10, 0.6], c, 0.74, 0.5); sym(p, [-8, 0.5, -9.4, 4.6, -10.6, 4.6, -10.2, 0.5], M(c, 0.5)); p.line([-7, 0, -10.6, 0], 0.5, M(shade(c, -0.08), 0.85));
  canopyF(p, 5, 0, 2.2, 1.1); p.circ(3.6, 0, 0.8, M('#1d1d1d', 0.4)); insignia(p, f, 0, 13.5, 0.85); p.grain(0.08);
} });
A('arb_drone', { L: 24, W: 36, prop: [-11.2, 0, 2.2], draw(p, f) { // Saqr-1
  const c = '#b0aa98';
  wingSym(p, [1.6, 1.1, 0.2, 17.6, -1.8, 17.6, -2.6, 1.1], c, 0.32, 0.24);
  fus(p, [12, 0, 10.4, 1.6, 6, 2.0, -2, 1.7, -9, 1.1, -11, 0.7], c, 0.74, 0.5); sym(p, [-7, 0.7, -10.8, 5, -11.8, 5, -10, 0.5], M(shade(c, -0.05), 0.62));
  p.circ(10.9, 0, 0.95, M('#2a2a2a', 0.86, { s: 0.6 })); for (const y of [-9, 9]) cyl(p, -2.2, 2.2, y, 0.33, '#c9c7bd', 0.4, 0.55); insignia(p, f, -1, 13, 0.85); p.grain(0.08);
} });

// tolerate drones without a pusher prop (bake fallback)

/* realistic coatings: grey/camouflage modulation over each airframe (keeps markings readable) */
(function () {
  const COAT = { usa_jet: ['t_mottle', 90, 0.4], usa_el2: ['t_two', 110, 0.55], rus_jet: ['t_split', 70, 0.95], rus_el2: ['t_split', 80, 0.8], chn_jet: ['t_mottle', 90, 0.35], chn_el2: ['t_two', 110, 0.35], eu_jet: ['t_two', 120, 0.35], arb_jet: ['t_two', 120, 0.45],
    usa_heli: ['t_mottle', 70, 0.3], rus_heli: ['t_dez', 70, 0.6], chn_heli: ['t_mottle', 70, 0.35], eu_heli: ['t_dez', 70, 0.55], arb_heli: ['t_dez', 70, 0.6], eu_heli2: ['t_mottle', 70, 0.3], usa_heli2: ['t_mottle', 70, 0.3], rus_heli2: ['t_dez', 70, 0.55], chn_heli2: ['t_mottle', 70, 0.3], arb_heli2: ['t_dez', 70, 0.5] };
  for (const id in COAT) { const A = AART[id]; if (!A || A._coat) continue; const d = A.draw, c = COAT[id]; A._coat = 1; A.draw = function (p, f) { d.call(this, p, f); p.tone(c[0], c[1], c[2]); }; }
})();
