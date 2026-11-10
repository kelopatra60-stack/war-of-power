/* ============================================================
   War of Power — رسومات المدفعية والراجمات والدفاع الجوي
   الملف: js/art/artillery_ad.js   ·   ترتيب التحميل: 11 من 43
   ============================================================ */
'use strict';
/* ===== Artillery, rocket artillery & air defence: each nation's real systems, drawn top-down =====
   tur  = turret / launcher (rotates)   turE = launcher raised for firing (foreshortened, tube muzzles visible)
   mt   = several launchers on one chassis that traverse together (Jobaria)                                  */
const TUBE = '#141412';
// rocket pod / launcher box seen from above: raised lid, stiffening straps, tube grooves, lifting lugs
function podTop(p, x, y, L, W, f, o) {
  o = o || {}; const h = o.h || 0.92; const base = o.col ? M(o.col, h, { s: 0.22 }) : fpaint(f, h);
  p.rect(x, y, L, W, Object.assign({}, base, { h: h - 0.07 }), 0.3);
  p.rect(x + 0.35, y + 0.35, L - 0.7, W - 0.7, Object.assign({}, base, { c: null, h }), 0.25);
  if (o.tubes) for (let k = 1; k < o.tubes; k++) p.line([x + 0.7, y + k * W / o.tubes, x + L - 0.9, y + k * W / o.tubes], 0.13, AL('rgba(0,0,0,0.26)'));
  const n = o.straps || Math.max(2, Math.round(L / 3.4)); for (let i = 1; i < n; i++) { const xx = x + i * L / n; p.rect(xx - 0.2, y - 0.05, 0.4, W + 0.1, M(o.strap || '#34352e', h + 0.05, { s: 0.3 })); }
  p.rect(x + L - 0.75, y + 0.15, 0.75, W - 0.3, M(o.cap || '#2c2d28', h + 0.03)); p.rect(x, y + 0.15, 0.55, W - 0.3, M('#3a3b34', h - 0.02));
  for (const yy of [y + 0.55, y + W - 0.55]) for (const xx of [x + 1.1, x + L - 1.7]) p.circ(xx, yy, 0.24, M('#5b5c52', h + 0.08));
  if (o.mark) { p.rect(x + L * 0.38, y + W * 0.28, L * 0.2, W * 0.12, AL('rgba(236,232,214,0.42)')); p.rect(x + L * 0.38, y + W * 0.48, L * 0.13, W * 0.1, AL('rgba(236,232,214,0.32)')); }
}
// the muzzle end of a raised pod: tube mouths become visible from above (cols across the pod, rows up its height)
function podFace(p, x, y, D, W, cols, rows, o) {
  o = o || {}; const h = o.h || 0.99; p.rect(x, y, D, W, M(o.col || '#2b2c27', h, { s: 0.25 }), 0.2);
  const cw = W / cols, rh = D / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const cx = x + (j + 0.5) * rh, cy = y + (i + 0.5) * cw;
    p.ell(cx, cy, rh * 0.4, cw * 0.4, 0, M('#4a4b44', h + 0.01)); p.ell(cx, cy, rh * 0.3, cw * 0.31, 0, M(o.caps || TUBE, h - (o.caps ? 0.02 : 0.3), o.caps ? { s: 0.2 } : {})); }
}
// hydraulic elevation rams seen under a raised launcher
function rams(p, x0, x1, ys, w) { for (const y of ys) { p.line([x0, y, x1, y], w || 0.55, M('#3c3d37', 0.62, { s: 0.3 })); p.line([x0 + (x1 - x0) * 0.4, y, x1, y], (w || 0.55) * 0.55, M('#c9c8c0', 0.7, { s: 0.85 })); } }
function cupola(p, x, y, r, f, mgA, mgL) {
  p.circ(x, y, r, M('#2f302b', 0.9)); p.circ(x, y, r * 0.8, fpaint(f, 0.97));
  for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3; p.rect(x + Math.cos(a) * r * 0.74 - 0.17, y + Math.sin(a) * r * 0.74 - 0.17, 0.34, 0.34, M(GLASS, 0.99, { s: 0.9 })); }
  if (mgL) { const a = mgA || 0; p.rect(x - 0.4, y - 0.55, 1.6, 1.1, M('#3b3c35', 1.02), 0.2); p.line([x + 0.6, y, x + Math.cos(a) * (r + mgL), y + Math.sin(a) * (r + mgL)], 0.34, M(STEEL, 1.04, { s: 0.35 })); p.rect(x - 0.3, y + 0.6, 1.2, 0.8, M('#4a4b3e', 1.0)); }
}
function travelLock(p, x, y) { p.line([x - 1.6, y - 1.3, x, y, x - 1.6, y + 1.3], 0.38, M('#33342e', 0.62)); p.rect(x - 0.5, y - 0.75, 1.2, 1.5, M('#292a26', 0.68), 0.3); }
function spade(p, x, y, w) { p.rect(x - 1.8, y - w / 2, 1.8, w, M('#3b3c35', 0.36, { s: 0.25 }), 0.3); for (let k = 0; k < 3; k++) { const yy = y - w / 2 + 0.7 + k * (w - 1.4) / 2; p.line([x - 1.6, yy, x - 0.2, yy], 0.2, AL('rgba(0,0,0,0.35)')); } hazard(p, x - 1.7, y - w / 2 + 0.2, x - 1.7, y + w / 2 - 0.2, 0.32); }
function jack(p, x, y) { p.rect(x - 0.55, y - 0.55, 1.1, 1.1, M('#2f302a', 0.36)); p.circ(x, y, 0.8, M('#46473f', 0.3)); p.circ(x, y, 0.35, M('#22221f', 0.36)); }
function aesa(p, x, y, w, l, a, col) { p.push(x, y, a); p.rect(-w / 2, -l / 2, w, l, M('#2b2e30', 1.0, { s: 0.5 }), 0.15); p.rect(-w / 2 + 0.14, -l / 2 + 0.18, w - 0.28, l - 0.36, M(col || '#3f4b49', 1.03, { s: 0.85 })); for (let k = 1; k < 4; k++) p.line([-w / 2 + 0.2, -l / 2 + k * l / 4, w / 2 - 0.2, -l / 2 + k * l / 4], 0.07, AL('rgba(0,0,0,0.35)')); p.pop(); }
function canister(p, x, y, L, w, col, h, round) {
  h = h || 0.9; p.rect(x, y - w / 2, L, w, M(col, h, { s: 0.28 }), round ? w * 0.48 : 0.3);
  p.rect(x + 0.3, y - w / 2 + 0.25, L - 0.6, w * 0.32, M(shade(col, 0.12), h + 0.04, { s: 0.35 }), round ? w * 0.15 : 0.1);
  p.rect(x + L - 0.7, y - w / 2 + 0.15, 0.7, w - 0.3, M(shade(col, -0.3), h + 0.02), round ? w * 0.3 : 0.1);
  for (let k = 1; k < 3; k++) p.line([x + k * L / 3, y - w / 2, x + k * L / 3, y + w / 2], 0.14, AL('rgba(0,0,0,0.24)'));
}
// external cannon housing with barrel (Gepard / PGZ-09 / Pantsir style)
function gunPod(p, x, y, L, w, f, blen, bd, twin) {
  p.rect(x, y - w / 2, L, w, fpaint(f, 0.95), 0.5); p.rect(x + 0.6, y - w / 2 + 0.3, L - 1.6, w * 0.35, HO(1.0)); p.rect(x + L - 1.1, y - w / 2 + 0.25, 1.1, w - 0.5, M('#33342e', 1.0), 0.3);
  if (twin) { autoBarrel(p, x + L, y - bd * 0.62, blen, bd); autoBarrel(p, x + L, y + bd * 0.62, blen, bd); p.rect(x + L + blen * 0.35, y - bd * 1.3, 0.8, bd * 2.6, M('#2c2d29', 1.0)); }
  else { autoBarrel(p, x + L, y, blen, bd); p.rect(x + L + blen * 0.5, y - bd * 0.75, 1.0, bd * 1.5, M('#2b2c28', 1.0)); }
}
// military truck chassis from above: tyres just showing past the body, frame rails, mudguards, flat deck
function truck(p, f, o) {
  const L = o.L, W = o.W, hl = L / 2, ww = o.ww || 2.3, wl = o.wl || 3.5;
  for (const x of o.axles) { wheel(p, x, -W / 2 + ww / 2, wl, ww); wheel(p, x, W / 2 - ww / 2, wl, ww); }
  p.rect(-hl + 0.3, -W / 2 + ww * 0.7, L - 0.6, W - ww * 1.4, M('#2a2b26', 0.24));
  const d1 = o.deck === undefined ? hl : o.deck, d0 = o.deck0 === undefined ? -hl : o.deck0;
  if (o.deckH !== 0) { p.rect(d0, -W / 2 + 0.85, d1 - d0, W - 1.7, fpaint(f, o.deckH || 0.5), 0.3); for (let x = d0 + 2.2; x < d1 - 0.8; x += 2.6) p.line([x, -W / 2 + 0.95, x, W / 2 - 0.95], 0.15, AL('rgba(0,0,0,0.2)')); }
  for (const g of (o.guards || [])) { p.rect(g[0], -W / 2 + 0.05, g[1] - g[0], 1.05, fpaint(f, 0.55), 0.35); p.rect(g[0], W / 2 - 1.1, g[1] - g[0], 1.05, fpaint(f, 0.55), 0.35); }
  p.rect(-hl, -W / 2 + 0.9, 0.5, 1, M('#7a1a14', 0.56, { e: 0.25 })); p.rect(-hl, W / 2 - 1.9, 0.5, 1, M('#7a1a14', 0.56, { e: 0.25 }));
}
// truck cab: x = rear wall, len includes the bonnet when o.hood is set
function cab3(p, f, x, W, len, o) {
  o = o || {}; const pnt = (h, ex) => o.col ? M(o.col, h, Object.assign({ s: 0.3 }, ex || {})) : fpaint(f, h, ex); const hood = o.hood || 0, cl = len - hood;
  if (hood) { p.rect(x + cl - 0.3, -W / 2 + 1.0, hood + 0.3, W - 2.0, Object.assign(pnt(0.62), { hg: [x + cl, 0, 0.66, x + len, 0, 0.5] }), 0.9); grille(p, x + len - 0.75, -W / 2 + 1.7, 0.65, W - 3.4, 5, 'y'); }
  p.rect(x, -W / 2 + 0.35, cl, W - 0.7, pnt(0.8), o.armored ? 0.45 : 1.0);
  if (o.armored) {
    p.rect(x + 0.7, -W / 2 + 1.0, cl - 1.4, W - 2.0, Object.assign(pnt(0.87), { c: null }), 0.3);
    p.rect(x + cl - 1.25, -W / 2 + 1.2, 0.85, W / 2 - 1.5, M(GLASS, 0.84, { s: 0.95 }), 0.15); p.rect(x + cl - 1.25, 0.3, 0.85, W / 2 - 1.5, M(GLASS, 0.84, { s: 0.95 }), 0.15);
    p.circ(x + cl * 0.4, W * 0.14, 1.05, M('#2c2d28', 0.92)); p.circ(x + cl * 0.4, W * 0.14, 0.75, pnt(0.95)); p.rect(x + 0.4, -W / 2 + 0.6, 1.0, 1.4, M('#34352f', 0.86)); // hatch + antenna base
  } else { p.rect(x + cl - 1.8, -W / 2 + 0.95, 1.35, W - 1.9, M(GLASS, 0.78, { s: 0.95 }), 0.3); p.line([x + cl - 1.1, -W / 2 + 0.95, x + cl - 1.1, W / 2 - 0.95], 0.12, AL('rgba(0,0,0,0.4)')); p.circ(x + cl * 0.4, -W / 4, 0.65, M('#2d2d29', 0.88)); }
  p.rect(x + cl - 0.7, -W / 2 - 0.45, 0.55, 1.1, M('#262624', 0.72)); p.rect(x + cl - 0.7, W / 2 - 0.65, 0.55, 1.1, M('#262624', 0.72));
  lightBox(p, x + len - 0.45, -W / 2 + 1.5); lightBox(p, x + len - 0.45, W / 2 - 1.5);
}

/* =========================== UNITED STATES =========================== */
// M109A7 Paladin: front-right engine, driver front-left, huge flat turret at the rear, M284 39-cal with bore evacuator + double-baffle brake
V('usa_arty', { L: 32, W: 15, tx: -5, gx: 6.5, gl: 23, gd: 1.45, hull(p, f) {
  trackedHull(p, f, { L: 32, W: 15, front: 5.5, rear: 2, skirt: false, tw: 3.3 });
  grille(p, 8.5, 1.2, 5, 4.6, 5, 'y'); p.rect(9, 5.5, 3.8, 0.8, M('#1d1d1b', 0.5, { e: 0.12 })); // engine deck + exhaust (right front)
  hatch(p, 12.4, -3.6, 1.25, f); p.rect(13.6, -4.6, 0.6, 2, M(GLASS, 0.72, { s: 0.9 })); travelLock(p, 15.2, 0);
  boxes(p, -15.6, -6, 2.6, 4.2, f, 1, 0.5); boxes(p, -15.6, 1.8, 2.6, 4.2, f, 1, 0.5);
  p.grain(0.16);
}, tur(p, f) {
  p.rect(-13.6, -6.2, 3.4, 12.4, M('#2e2f2a', 0.6), 0.4); for (let x = -13.2; x < -10.3; x += 1.1) p.line([x, -6.1, x, 6.1], 0.22, M('#4a4a40', 0.7)); // bustle rack
  p.rect(-13.2, -5.4, 2.6, 3.4, M('#6b6a4a', 0.76), 0.7); p.rect(-13.3, 0.8, 2.8, 4.2, M('#5f6142', 0.74), 0.8); // bags in rack
  facet(p, [7.2, -5.6, 5.4, -6.9, -10.4, -6.9, -10.6, -6.4, -10.6, 6.4, -10.4, 6.9, 5.4, 6.9, 7.2, 5.6], f, 0.9, 0.66, 1.6);
  p.rect(-6.5, -7.1, 7, 0.5, HO(0.75)); p.rect(-6.5, 6.6, 7, 0.5, HO(0.75)); // side ammo doors
  p.rect(5.6, -2.7, 2.6, 5.4, M('#3c3d36', 0.98), 0.4); p.rect(4.4, -4.6, 2.2, 1.6, M('#2f3335', 1.0, { s: 0.7 })); // gun shield + direct-fire sight
  cupola(p, -2.6, 3.7, 1.75, f, 0.25, 3.2); hatch(p, -2.8, -3.7, 1.35, f); // commander's .50 cal / loader
  for (const [x, y] of [[-7.4, -2.2], [-7.4, 2.2]]) { p.circ(x, y, 0.9, M('#34352f', 0.96)); p.circ(x, y, 0.55, M('#55564b', 1.0)); } // vent fans
  p.rect(1.2, -6.2, 2.4, 1.6, fpaint(f, 0.98)); p.circ(-9.4, -6, 0.32, M('#222', 1)); p.circ(-9.4, 6, 0.32, M('#222', 1)); // GPS + antenna bases
  teamFlag(p, -10.3, -1.8, 1.4, 3.6); p.grain(0.18);
}, gun(p) { barrelArt(p, 23, 1.45, { evac: 0.44, brake: 1 }); p.rect(-0.6, -1.25, 4.2, 2.5, M('#3b3c35', 0.94), 0.4); } });
// M142 HIMARS: FMTV 6x6 with armoured cab, one 6-round GMLRS pod in the launcher cage
V('usa_mlrs', { L: 28, W: 11, tx: -6.5, gx: 0, gl: 6, hull(p, f) {
  truck(p, f, { L: 28, W: 11, axles: [9.4, -5.6, -10.2], deck: 4, guards: [[-12.6, -3.2], [7.0, 11.8]] });
  p.rect(-13.8, -3.8, 2.2, 7.6, fpaint(f, 0.42), 0.3); for (const y of [-4.6, 4.6]) jack(p, -12.8, y); // rear stabilisers
  cab3(p, f, 3.6, 11, 10.2, { armored: 1, hood: 1.6 }); p.grain(0.15);
}, tur(p, f) {
  p.rect(-7.6, -4.6, 2.4, 9.2, M('#33342e', 0.7), 0.3); // turntable / hoist base
  p.rect(-7, -4.4, 14.6, 0.8, M('#3c3d36', 0.98), 0.2); p.rect(-7, 3.6, 14.6, 0.8, M('#3c3d36', 0.98), 0.2); // cage rails
  podTop(p, -6.4, -3.5, 13.6, 7, f, { tubes: 3, straps: 4, mark: 1, h: 0.94 });
  p.rect(-7.8, -0.9, 3.2, 1.8, M('#2d2e29', 1.0)); teamFlag(p, -6.1, -2.6, 1, 2); p.grain(0.15);
}, turE(p, f) {
  p.rect(-7.6, -4.6, 2.4, 9.2, M('#33342e', 0.6), 0.3); rams(p, -5.6, 0.5, [-3.9, 3.9]);
  podTop(p, -6.4, -3.5, 9.4, 7, f, { tubes: 3, straps: 3, h: 1.0 }); podFace(p, 3, -3.5, 2.4, 7, 3, 2, { caps: '#cfc7b0' });
  teamFlag(p, -6.1, -2.6, 1, 2);
} });
// Stryker M-SHORAD: 8x8 with four RADA radars on the hull, RIWP turret — XM914 30 mm, Stinger pod left, Hellfire rail right
V('usa_aa', { L: 29, W: 12.5, tx: -2.5, gx: 3.2, gl: 9, gd: 0.8, hull(p, f) {
  wheeledHull(p, f, { L: 29, W: 12.5, axles: 4, axleX: [9.4, 4.6, -4.4, -9.4], nose: 4.4, ww: 2.8, wl: 3.5 });
  hatch(p, 9.6, -3.2, 1.15, f); p.rect(10.6, -4.2, 0.5, 2, M(GLASS, 0.74, { s: 0.9 })); grille(p, 5.4, 0.9, 4.4, 3.8, 5); p.rect(6.1, 4.9, 3.2, 0.7, M('#1d1d1b', 0.5, { e: 0.1 }));
  for (const [x, y, a] of [[3.2, -5.1, -0.6], [3.2, 5.1, 0.6], [-9.6, -5.1, -2.5], [-9.6, 5.1, 2.5]]) aesa(p, x, y, 0.8, 2.8, a);
  p.rect(-14.4, -4.2, 1.8, 8.4, fpaint(f, 0.5), 0.3); boxes(p, -12, -5.9, 7, 1.3, f, 2); boxes(p, -12, 4.6, 7, 1.3, f, 2); p.grain(0.15);
}, tur(p, f) {
  facet(p, [4.2, -2.8, 2.6, -3.8, -3.6, -3.8, -4.4, -2.8, -4.4, 2.8, -3.6, 3.8, 2.6, 3.8, 4.2, 2.8], f, 0.9, 0.64, 1.4);
  p.rect(-3.2, -7.6, 6.4, 3.4, M('#4a4c40', 0.92), 0.4); for (const [x, y] of [[2.4, -6.8], [2.4, -5.0]]) for (const dx of [0, -0.0]) { p.circ(x + dx, y, 0.62, M('#141414', 0.96)); p.circ(x + dx, y, 0.4, M('#6f7a7f', 0.98, { s: 0.6 })); } // Stinger pod
  p.rect(-2.4, 4.4, 1.2, 3.0, M('#3c3d36', 0.9)); for (const y of [5.0, 6.8]) cyl(p, -2.6, 4.2, y, 0.48, '#5d6248', 0.88, 0.98); for (const y of [5.0, 6.8]) p.circ(4.3, y, 0.36, M('#3a4a52', 1, { s: 0.9 })); // Hellfire rail
  dome(p, -1.6, 1.6, 1.15, '#3a3d38', 0.95, 1.05); p.rect(-1.1, 1.1, 0.9, 1, M(GLASS, 1.08, { s: 0.95 })); // EO/IR ball
  teamFlag(p, -4.2, -1.2, 1.1, 2.4); p.grain(0.15);
}, gun(p) { autoBarrel(p, 0, 0, 9, 0.8); p.rect(-0.8, -1.0, 3.2, 2.0, M(STEEL, 0.98), 0.3); p.rect(5, -0.55, 1.4, 1.1, M('#2b2c28', 0.95)); } });

/* =========================== RUSSIA =========================== */
// 2S19M2 Msta-SM2: T-80 based hull with self-entrenching blade, slab-sided turret, 2A64 152 mm 47-cal (evacuator near the muzzle)
V('rus_arty', { L: 33, W: 16, tx: -4.5, gx: 7.6, gl: 24, gd: 1.5, hull(p, f) {
  trackedHull(p, f, { L: 33, W: 16, front: 6.5, skirtF: 3, panel: 3.2, tw: 3.5 });
  p.rect(16.2, -5.6, 1.1, 11.2, M('#3a3b34', 0.36, { s: 0.3 }), 0.3); for (let y = -5; y < 5.5; y += 1.4) p.line([16.4, y, 17.1, y + 0.6], 0.14, AL('rgba(0,0,0,0.35)')); // dozer blade
  hatch(p, 13.2, 0, 1.15, f); for (const y of [-1.4, 1.4]) p.rect(14.4, y - 0.4, 0.5, 0.8, M(GLASS, 0.7, { s: 0.9 }));
  grille(p, -16, -4.6, 5.6, 9.2, 7, 'y'); p.rect(-16.4, -6.9, 3.6, 1.4, M('#3a3a34', 0.6)); p.rect(-16.4, 5.5, 3.6, 1.4, M('#3a3a34', 0.6)); boxes(p, 2, -7.5, 9, 1.3, f, 3); boxes(p, 2, 6.2, 9, 1.3, f, 3); p.grain(0.18);
}, tur(p, f) {
  p.rect(-13.6, -5.6, 2.6, 11.2, fpaint(f, 0.78), 0.4); p.rect(-13.8, -3, 1.2, 6, M('#2e2f2a', 0.82)); // rear ammo conveyor door
  facet(p, [8.6, -5.2, 7.6, -7.3, -11.2, -7.6, -12, -6.8, -12, 6.8, -11.2, 7.6, 7.6, 7.3, 8.6, 5.2], f, 0.92, 0.66, 1.6);
  p.rect(-10, -7.9, 13, 0.7, fpaint(f, 0.8)); p.rect(-10, 7.2, 13, 0.7, fpaint(f, 0.8)); for (let x = -9; x < 3; x += 3) { p.line([x, -7.9, x, -7.2], 0.16, AL('rgba(0,0,0,0.4)')); p.line([x, 7.2, x, 7.9], 0.16, AL('rgba(0,0,0,0.4)')); } // side stowage bins
  p.rect(6.5, -3, 2.6, 6, M('#3c3d36', 0.98), 0.4); p.rect(4.6, -6.6, 3.4, 2.4, fpaint(f, 1.0)); p.rect(7.2, -6.2, 0.9, 1.6, M(GLASS, 1.06, { s: 0.9 })); // mantlet + gunner's sight
  cupola(p, -1.6, -3.9, 1.9, f, 0, 0); p.rect(-2.8, -4.6, 2.6, 1.4, M('#3b3c35', 1.04), 0.3); p.line([-0.4, -3.9, 3.6, -4.4], 0.4, M(STEEL, 1.06)); // remote Kord
  hatch(p, -2.4, 3.6, 1.35, f); hatch(p, -7.4, 4.2, 1.1, f); for (const [x, y] of [[-7.6, -2.4], [-5.2, 0.4]]) dome(p, x, y, 0.95, fcol(f), 0.92, 1.0);
  smokeLaunchers(p, 5.6, -7.4, 3, -0.2); smokeLaunchers(p, 5.6, 7.4, 3, 0.2); teamFlag(p, -11.8, -2, 1.5, 4); p.grain(0.2);
}, gun(p) { barrelArt(p, 24, 1.5, { evac: 0.74, brake: 1, sleeve: 5 }); p.rect(-0.6, -1.3, 4.6, 2.6, M('#3b3c35', 0.94), 0.4); } });
// TOS-1A Solntsepyok: T-72 hull, 24-tube armoured launcher box with heavy ribbing
V('rus_mlrs', { L: 33, W: 16, tx: -4.5, gx: 0, gl: 13, hull(p, f) {
  trackedHull(p, f, { L: 33, W: 16, front: 6.5, skirtF: 3, panel: 2.9, tw: 3.5 });
  p.poly([16.4, -5.2, 13.8, 0, 16.4, 5.2, 15.6, 5.2, 13.2, 0, 15.6, -5.2], fpaint(f, 0.5)); // splash board
  hatch(p, 13.6, 0, 1.1, f); grille(p, -16, -4.8, 6, 9.6, 7, 'y'); for (const y of [-4.6, 4.6]) cylY(p, -15.4, y - 1.6, y + 1.6, 1.25, '#4b5536', 0.4, 0.82);
  boxes(p, -8, -7.6, 12, 1.4, f, 4); boxes(p, -8, 6.2, 12, 1.4, f, 4); p.grain(0.18);
}, tur(p, f) {
  p.circ(0, 0, 4.6, M('#30312b', 0.5)); // turntable
  facet(p, [17.4, -5.1, 17.4, 5.1, -10.6, 5.4, -10.6, -5.4], f, 0.95, 0.74, 1.2);
  for (let x = -8.4; x < 16.5; x += 2.25) p.rect(x, -5.5, 0.55, 11, Object.assign(fpaint(f, 0.99), { s: 0.18 })); // armour ribs across the box
  p.rect(-10.4, -5.6, 1.6, 11.2, M('#34352f', 0.9)); p.rect(16.6, -5.2, 0.9, 10.4, M('#2b2c27', 0.98)); // hinge block / muzzle cover
  p.rect(-6, 5.4, 18, 0.7, M('#2f302a', 0.9)); teamFlag(p, -9.8, -2.2, 1.4, 4.4); p.grain(0.2);
}, turE(p, f) {
  p.circ(0, 0, 4.6, M('#30312b', 0.5)); rams(p, -6, 3.6, [-5.6, 5.6], 0.8);
  facet(p, [11.8, -5.1, 11.8, 5.1, -10.6, 5.4, -10.6, -5.4], f, 1.0, 0.8, 1.1);
  for (let x = -8.6; x < 11; x += 1.75) p.rect(x, -5.5, 0.45, 11, Object.assign(fpaint(f, 1.03), { s: 0.18 }));
  p.rect(-10.4, -5.6, 1.6, 11.2, M('#34352f', 0.92)); podFace(p, 11.8, -5.1, 3.2, 10.2, 6, 4, { h: 1.06 }); teamFlag(p, -9.8, -2.2, 1.4, 4.4);
} });
// Pantsir-S1: KAMAZ-6560 8x8, armoured cab, combat module with 12 missiles in two packs, twin 2A38M 30 mm guns outboard, rotating search radar
V('rus_aa', { L: 34, W: 12.5, tx: -8, gx: 0, gl: 11, hull(p, f) {
  truck(p, f, { L: 34, W: 12.5, axles: [13.2, 8.6, -6.6, -11.6], deck: 6.4, guards: [[-14, -4.4], [6.4, 15.6]], ww: 2.5, wl: 3.7 });
  p.rect(-1.6, -5.2, 7.6, 10.4, fpaint(f, 0.74), 0.5); grille(p, 0.4, -4, 3.2, 3.4, 4); p.rect(0.2, 0.9, 4.8, 3.2, M('#3b3c36', 0.82), 0.4); // power unit / equipment module
  for (const y of [-5.4, 5.4]) jack(p, -15.6, y); cab3(p, f, 6.6, 12.5, 10.2, { armored: 1 }); p.grain(0.15);
}, tur(p, f) {
  p.rect(-6.4, -3.4, 12.8, 6.8, fpaint(f, 0.9), 0.6); p.rect(-5.8, -2.6, 11.6, 5.2, Object.assign(fpaint(f, 0.96), { c: null })); // fire-control module
  p.rect(5.4, -2.6, 1.6, 5.2, M('#2c3133', 1.0, { s: 0.6 }), 0.5); p.rect(6.0, -2.2, 0.7, 4.4, M('#4a5658', 1.04, { s: 0.85 })); // 1RS2 tracking radar face
  p.rect(2.2, -1.2, 2.4, 2.4, M('#313437', 1.04), 0.3); p.circ(3.4, 0, 0.6, M(GLASS, 1.08, { s: 0.95 })); // EO tracker
  for (const s of [-1, 1]) { for (let i = 0; i < 3; i++) canister(p, -5.2, s * (4.1 + i * 1.05), 11.6, 0.95, '#475038', 0.9 + i * 0.01, true); // 57E6 missile tubes
    gunPod(p, -4.4, s * 7.7, 6, 1.5, f, 6.4, 0.55, true); }
  teamFlag(p, -6.2, -1.4, 1.2, 2.8); p.grain(0.15);
}, dish: { w: 1.4, h: 5.8, x: -4.2 } });

/* =========================== CHINA =========================== */
// PLZ-05: driver front-left / engine front-right, long turret with stepped front, 155 mm L54 with multi-slot brake
V('chn_arty', { L: 33, W: 15.5, tx: -4.5, gx: 7.2, gl: 25, gd: 1.5, hull(p, f) {
  trackedHull(p, f, { L: 33, W: 15.5, front: 6, skirtF: 3, panel: 3.4, tw: 3.4 });
  hatch(p, 13.4, -3.4, 1.15, f); grille(p, 8.4, 1, 5.2, 4.6, 5, 'y'); p.rect(9, 5.6, 3.6, 0.7, M('#1d1d1b', 0.5, { e: 0.1 })); travelLock(p, 15.8, 0);
  boxes(p, -15.8, -5.6, 2.4, 3.8, f, 1, 0.52); boxes(p, -15.8, 1.8, 2.4, 3.8, f, 1, 0.52); p.grain(0.18);
}, tur(p, f) {
  facet(p, [9, -4.6, 7.4, -7.2, -12, -7.2, -13, -6.2, -13, 6.2, -12, 7.2, 7.4, 7.2, 9, 4.6], f, 0.92, 0.66, 1.7);
  p.poly([9, -4.6, 7.4, -7.2, 5.2, -7.2, 6.8, -4.4], HO(0.8)); p.poly([9, 4.6, 7.4, 7.2, 5.2, 7.2, 6.8, 4.4], HO(0.8)); // stepped cheeks
  p.rect(7.2, -2.6, 2.4, 5.2, M('#3c3d36', 0.98), 0.4); cupola(p, -3.6, -4, 1.8, f, 0.15, 3.4); hatch(p, -3.8, 3.8, 1.3, f);
  p.rect(-12.6, -5, 2.4, 10, fpaint(f, 0.82), 0.3); p.rect(-12.9, -2, 1.1, 4, M('#2e2f2a', 0.86)); // rear ammo door
  for (const [x, y] of [[-8, -2], [-8, 2]]) dome(p, x, y, 0.9, fcol(f), 0.92, 1.0);
  smokeLaunchers(p, 6.2, -7.5, 4, -0.15); smokeLaunchers(p, 6.2, 7.5, 4, 0.15); p.rect(1.2, 4.8, 3, 1.8, fpaint(f, 0.98)); teamFlag(p, -12.8, -1.8, 1.4, 3.6); p.grain(0.2);
}, gun(p) { barrelArt(p, 25, 1.5, { evac: 0.48, pepper: 1 }); p.rect(-0.6, -1.3, 4.4, 2.6, M('#3b3c35', 0.94), 0.4); } });
// PHL-16 (PCH-191): 8x8 heavy truck, two interchangeable pods (2x2 370 mm / 2x5 300 mm), rear stabiliser jacks
V('chn_mlrs', { L: 38, W: 12.5, tx: -6.5, gx: 0, gl: 10, hull(p, f) {
  truck(p, f, { L: 38, W: 12.5, axles: [15.4, 10.6, -9.6, -14.6], deck: 8.2, guards: [[-17, -7.2], [8.6, 17.6]], ww: 2.5, wl: 3.8 });
  for (const [x, y] of [[-18, -5.6], [-18, 5.6], [-2.6, -5.8], [-2.6, 5.8]]) jack(p, x, y); p.rect(3.4, -5, 4.6, 10, fpaint(f, 0.66), 0.4); grille(p, 4.2, -3.8, 2.8, 2.8, 3);
  cab3(p, f, 8.4, 12.5, 10.6, {}); p.grain(0.15);
}, tur(p, f) {
  p.rect(-9.6, -5.6, 3, 11.2, M('#32332d', 0.72), 0.3); rams(p, -8.6, -4, [-3, 3], 0.7);
  for (const s of [-1, 1]) podTop(p, -9, s > 0 ? 0.3 : -5.8, 17.4, 5.5, f, { tubes: 2, straps: 5, mark: s < 0, h: 0.94 });
  teamFlag(p, -8.8, -1.4, 1.2, 2.8); p.grain(0.15);
}, turE(p, f) {
  p.rect(-9.6, -5.6, 3, 11.2, M('#32332d', 0.62), 0.3); rams(p, -8, 2, [-2.8, 2.8], 0.8);
  for (const s of [-1, 1]) { const y = s > 0 ? 0.3 : -5.8; podTop(p, -9, y, 12.2, 5.5, f, { tubes: 2, straps: 4, h: 1.0 }); podFace(p, 3.2, y, 3.2, 5.5, 2, 2, { h: 1.04 }); }
  teamFlag(p, -8.8, -1.4, 1.2, 2.8);
} });
// PGZ-09: tracked, big turret, twin 35 mm guns in external housings, tracking radar front, folding search radar rear
V('chn_aa', { L: 32, W: 15.5, tx: -2.5, gx: 0, gl: 16, hull(p, f) {
  trackedHull(p, f, { L: 32, W: 15.5, front: 6, skirtF: 3, panel: 3, tw: 3.4 }); hatch(p, 12.8, -3.2, 1.1, f); grille(p, -15, -4.4, 5.5, 8.8, 7, 'y'); grille(p, 8, 1.4, 4.6, 4, 4);
  boxes(p, -9, -7.4, 6, 1.3, f, 2); boxes(p, -9, 6.1, 6, 1.3, f, 2); p.grain(0.18);
}, tur(p, f) {
  facet(p, [6.4, -4.6, 4.8, -5.8, -7.6, -5.8, -8.6, -4.6, -8.6, 4.6, -7.6, 5.8, 4.8, 5.8, 6.4, 4.6], f, 0.92, 0.66, 1.5);
  p.rect(4.6, -2.2, 2.6, 4.4, M('#2c3133', 1.0, { s: 0.6 }), 0.8); dome(p, 6.4, 0, 1.6, '#4a5658', 1.0, 1.08); // tracking radar
  hatch(p, -1.6, -3.2, 1.2, f); hatch(p, -1.6, 3.2, 1.2, f); p.rect(-8.2, -3.2, 2.2, 6.4, fpaint(f, 0.82), 0.4);
  for (const s of [-1, 1]) gunPod(p, -5.6, s * 7.4, 9.6, 2.3, f, 11.5, 0.75, false);
  teamFlag(p, -8.4, -1.4, 1.2, 2.8); p.grain(0.15);
}, dish: { w: 1.5, h: 6.2, x: -5.2 } });

/* =========================== EUROPE =========================== */
// PzH 2000: Leopard-type hull (powerpack front-left, driver front-right), rear turret with long cradle, 155 mm L52, pepperpot brake
V('eu_arty', { L: 36, W: 16, tx: -6, gx: 8.6, gl: 26, gd: 1.5, hull(p, f) {
  trackedHull(p, f, { L: 36, W: 16, front: 6, skirtF: 3, panel: 3.6, tw: 3.5 });
  grille(p, 8.2, -6, 6.4, 4.6, 6, 'y'); grille(p, 8.2, -1, 3.2, 2, 3); hatch(p, 14.2, 3.4, 1.2, f); p.rect(15.4, 2.4, 0.5, 2, M(GLASS, 0.72, { s: 0.9 })); travelLock(p, 17.4, 0);
  boxes(p, -2, 5.9, 8, 1.4, f, 2); boxes(p, -2, -7.3, 8, 1.4, f, 2); p.grain(0.18);
}, tur(p, f) {
  facet(p, [9.8, -5.4, 8.2, -7.3, -11.4, -7.3, -12.6, -6.2, -12.6, 6.2, -11.4, 7.3, 8.2, 7.3, 9.8, 5.4], f, 0.92, 0.66, 1.7);
  for (let x = -9; x < 7; x += 4) { p.line([x, -7.2, x, -4.6], 0.14, AL('rgba(0,0,0,0.3)')); p.line([x, 4.6, x, 7.2], 0.14, AL('rgba(0,0,0,0.3)')); } // add-on armour modules
  p.rect(-12.2, -4.8, 2.4, 9.6, fpaint(f, 0.82), 0.3); p.rect(-12.5, -2.4, 1.1, 4.8, M('#2e2f2a', 0.86)); // rear ammo flap
  p.rect(8.2, -2.6, 3, 5.2, M('#3c3d36', 0.98), 0.4); // cradle root
  p.rect(-3.6, -6, 3, 2.6, fpaint(f, 1.0)); p.circ(-2.1, -4.7, 1.0, M('#28343c', 1.06, { s: 0.9 })); // PERI sight
  hatch(p, -3.6, 4, 1.35, f); p.line([-2.6, 4.3, 1.8, 5.4], 0.32, M(STEEL, 1.0)); hatch(p, -8.4, -2.6, 1.1, f);
  smokeLaunchers(p, 4, -7.6, 4, 0); smokeLaunchers(p, 4, 7.6, 4, 0); teamFlag(p, -12.4, -1.8, 1.4, 3.6); p.grain(0.18);
}, gun(p) { barrelArt(p, 26, 1.5, { pepper: 1, evac: 0.46 }); p.rect(0, -1.9, 7.4, 3.8, M('#3c3d36', 0.92), 0.5); for (let x = 1.2; x < 7; x += 1.6) p.line([x, -1.9, x, 1.9], 0.14, AL('rgba(0,0,0,0.3)')); } });
// MARS II (M270 chassis): armoured cab across the front, launcher-loader module with two 6-round pods
V('eu_mlrs', { L: 32, W: 15, tx: -5.5, gx: 0, gl: 9, hull(p, f) {
  trackedHull(p, f, { L: 32, W: 15, front: 3.5, skirt: false, tw: 3.3 });
  p.rect(8.2, -6.4, 7.8, 12.8, fpaint(f, 0.82), 0.6); p.rect(8.8, -5.8, 6.6, 11.6, Object.assign(fpaint(f, 0.88), { c: null })); // cab
  for (const y of [-4.6, -1.4, 1.8]) { p.rect(15.2, y, 0.8, 2.6, M(GLASS, 0.82, { s: 0.95 })); for (let k = 0; k < 3; k++) p.line([15.2, y + 0.4 + k * 0.9, 16, y + 0.4 + k * 0.9], 0.12, M('#2a2b27', 0.9)); } // louvred windows
  hatch(p, 11.2, -3.2, 1.0, f); hatch(p, 11.2, 3.2, 1.0, f); grille(p, 4.4, -5.4, 3.2, 4, 4); p.grain(0.16);
}, tur(p, f) {
  p.rect(-10.4, -6.8, 18.6, 13.6, M('#34352f', 0.66), 0.4); p.rect(-10, -6.4, 2.2, 12.8, fpaint(f, 0.84));
  for (const s of [-1, 1]) podTop(p, -7.6, s > 0 ? 0.3 : -6.3, 15.4, 6, f, { tubes: 3, straps: 4, mark: s > 0, h: 0.94 });
  p.rect(-9.6, -0.8, 6, 1.6, M('#2c2d28', 1.0)); teamFlag(p, -9.8, -2.2, 1.2, 4.4); p.grain(0.15);
}, turE(p, f) {
  p.rect(-10.4, -6.8, 18.6, 13.6, M('#34352f', 0.56), 0.4); rams(p, -8, -1, [-6.8, 6.8], 0.7); p.rect(-10, -6.4, 2.2, 12.8, fpaint(f, 0.88));
  for (const s of [-1, 1]) { const y = s > 0 ? 0.3 : -6.3; podTop(p, -7.6, y, 10.8, 6, f, { tubes: 3, straps: 3, h: 1.0 }); podFace(p, 3.2, y, 2.4, 6, 3, 2, { h: 1.04, caps: '#bdb59e' }); }
  teamFlag(p, -9.8, -2.2, 1.2, 4.4);
} });
// Skyranger 30 on Boxer: drive module (powerpack front-left, driver front-right) + mission module, faceted turret with 4 AESA panels, 30 mm KCE, missile pod
V('eu_aa', { L: 33, W: 13.5, tx: -3, gx: 4.2, gl: 11, gd: 0.85, hull(p, f) {
  wheeledHull(p, f, { L: 33, W: 13.5, axles: 4, axleX: [11.2, 6.2, -6.4, -11.4], nose: 6, ww: 2.9, wl: 3.7 });
  p.rect(-16, -5.6, 19.4, 11.2, fpaint(f, 0.66), 0.8); p.rect(-15.4, -5, 18.2, 10, Object.assign(fpaint(f, 0.7), { c: null })); // mission module
  grille(p, 7.4, -5.4, 5, 4.4, 5, 'y'); hatch(p, 12.4, 3.2, 1.1, f); for (const y of [2.2, 3.2, 4.2]) p.rect(13.6, y - 0.3, 0.5, 0.6, M(GLASS, 0.72, { s: 0.9 }));
  boxes(p, -14, -7.0, 9, 1.3, f, 3); boxes(p, -14, 5.7, 9, 1.3, f, 3); p.grain(0.15);
}, tur(p, f) {
  facet(p, [5.4, -3.6, 3.6, -5.6, -5.4, -5.6, -7, -4, -7, 4, -5.4, 5.6, 3.6, 5.6, 5.4, 3.6], f, 0.92, 0.66, 1.5);
  for (const [x, y, a] of [[3.6, -5.2, -0.78], [3.6, 5.2, 0.78], [-6, -4.8, -2.36], [-6, 4.8, 2.36]]) aesa(p, x, y, 0.7, 3.0, a, '#46524f');
  p.rect(-4.6, 5.8, 7.4, 2.6, M('#3f4138', 0.92), 0.4); for (const [x, y] of [[2.2, 6.5], [2.2, 7.7]]) { p.circ(x, y, 0.55, M('#151515', 0.98)); p.circ(x, y, 0.34, M('#b8b29c', 1.0)); } // missile pod
  dome(p, -2, -2.4, 1.2, '#3a3d38', 0.96, 1.06); p.rect(-1.5, -2.9, 0.9, 1, M(GLASS, 1.1, { s: 0.95 })); teamFlag(p, -6.8, -1.4, 1.2, 2.8); p.grain(0.15);
}, gun(p) { autoBarrel(p, 0, 0, 11, 0.9); p.rect(-1, -1.3, 3.4, 2.6, M(STEEL, 0.98), 0.3); p.rect(8.6, -0.7, 1.6, 1.4, M('#2b2c28', 0.96)); } });

/* =========================== ARAB COALITION =========================== */
// CAESAR 6x6: armoured cab, gun on the rear deck firing over the stern, big hydraulic spade
V('arb_arty', { L: 34, W: 11.5, tx: -9.5, gx: 1.4, gl: 27, gd: 1.4, hull(p, f) {
  truck(p, f, { L: 34, W: 11.5, axles: [11.6, -5.6, -10.6], deck: 7.6, guards: [[-13.2, -3], [9.2, 14.2]] });
  for (const s of [-1, 1]) { p.rect(-6.4, s > 0 ? 2.6 : -5.2, 12, 2.6, fpaint(f, 0.62), 0.3); for (let x = -5.6; x < 5.4; x += 2.2) p.line([x, s > 0 ? 2.8 : -5, x, s > 0 ? 5 : -2.8], 0.14, AL('rgba(0,0,0,0.3)')); } // ammo lockers
  spade(p, -16.2, 0, 8.2); cab3(p, f, 7.6, 11.5, 9.6, { armored: 1, hood: 2 }); p.grain(0.15);
}, tur(p, f) {
  p.rect(-6.2, -3.4, 9.4, 6.8, M('#34352f', 0.56), 0.5); for (const s of [-1, 1]) { p.rect(-3.6, s * 2.9 - 0.45, 5.2, 0.9, M('#3e3f38', 0.74), 0.3); p.circ(-0.6, s * 2.9, 0.75, M('#2c2d28', 0.8)); } // trunnion brackets
  p.rect(-5.6, -1.8, 4.6, 3.6, M('#2f302a', 0.84), 0.4); p.rect(-6.6, -1.3, 1.4, 2.6, M('#55564b', 0.9)); // breech + loading tray
  cyl(p, -1, 7, -1.5, 0.55, '#4a4b42', 0.86, 0.96); cyl(p, -1, 7, 1.5, 0.55, '#4a4b42', 0.86, 0.96); // recuperators
  p.rect(-4, -4.6, 3, 1.2, fpaint(f, 0.6)); teamFlag(p, -3.6, 3.4, 1, 1.4); p.grain(0.15);
}, gun(p) { barrelArt(p, 27, 1.4, { brake: 1, evac: 0.5 }); p.rect(-0.6, -1.25, 7, 2.5, M('#3c3d36', 0.92), 0.4); } });
// Jobaria MCL: Oshkosh tractor + semi-trailer, four 60-round launchers traversing together
V('arb_mlrs', { L: 50, W: 13, tx: -4, gx: 0, gl: 7, mt: [-20.6, -12.3, -4, 4.3], hull(p, f) {
  truck(p, f, { L: 50, W: 13, axles: [21.6, 17.2, 12.8, -14.6, -19, -23.4], deck: 10, guards: [[-25, -13], [11.2, 23]], ww: 2.5, wl: 3.6 });
  for (const [x, y] of [[-24.6, -5.8], [-24.6, 5.8], [7.2, -5.9], [7.2, 5.9]]) jack(p, x, y); p.rect(9.2, -4, 2.4, 8, M('#2d2d29', 0.6)); // fifth wheel
  p.rect(-25, -5.8, 35, 11.6, AL('rgba(0,0,0,0.08)')); cab3(p, f, 15.4, 13, 9.6, { hood: 2.6 }); p.grain(0.15);
}, tur(p, f) {
  p.rect(-4.2, -5.4, 1.4, 10.8, M('#33342e', 0.66)); for (const s of [-1, 1]) podTop(p, -3.7, s > 0 ? 0.25 : -5.35, 7.6, 5.1, f, { tubes: 5, straps: 2, h: 0.92 });
  teamFlag(p, -3.6, -1, 0.9, 2);
}, turE(p, f) {
  p.rect(-4.2, -5.4, 1.4, 10.8, M('#33342e', 0.6)); rams(p, -3.4, 0, [-5, 5], 0.5);
  for (const s of [-1, 1]) { const y = s > 0 ? 0.25 : -5.35; podTop(p, -3.7, y, 5, 5.1, f, { tubes: 5, straps: 2, h: 0.98 }); podFace(p, 1.3, y, 2.8, 5.1, 6, 5, { h: 1.02 }); }
} });
// Shahine (Crotale on AMX-30): six missile canisters, tracking radar dish front, rotating surveillance radar
V('arb_aa', { L: 31, W: 15.5, tx: -2, gx: 0, gl: 8, hull(p, f) {
  trackedHull(p, f, { L: 31, W: 15.5, front: 6.5, skirt: false, tw: 3.4 }); hatch(p, 12.4, -3, 1.1, f); grille(p, -14.6, -4.6, 6, 9.2, 7, 'y');
  boxes(p, -6, -7.2, 9, 1.3, f, 3); boxes(p, -6, 5.9, 9, 1.3, f, 3); p.grain(0.18);
}, tur(p, f) {
  p.circ(0, 0, 5.2, M('#33342e', 0.6)); facet(p, [4.6, -3.2, 3.4, -4.4, -5.4, -4.4, -6.4, -3.2, -6.4, 3.2, -5.4, 4.4, 3.4, 4.4, 4.6, 3.2], f, 0.92, 0.68, 1.4);
  p.rect(3.6, -1.8, 2.2, 3.6, M('#2c3133', 1.0, { s: 0.6 }), 0.6); p.circ(5.6, 0, 1.5, M('#c7c2b0', 1.06, { s: 0.6 })); p.circ(5.6, 0, 0.5, M('#33363a', 1.08)); // tracking radar dish
  for (const s of [-1, 1]) { p.rect(-3, s * 4.4 - 0.4, 3.6, 0.8, M('#3c3d36', 0.9)); for (let i = 0; i < 3; i++) canister(p, -5, s * (4.95 + i * 1.42), 10.6, 1.3, '#b3ab92', 0.9 + i * 0.015); }
  teamFlag(p, -6.2, -1.4, 1.2, 2.8); p.grain(0.15);
}, dish: { w: 1.5, h: 5.6, x: -3.6 } });


/* =========================== MOBILE MEDIUM-RANGE SAMs (sam2) =========================== */
// raised vertical-launch canisters seen from straight above: the canister ends
function vlsTops(p, x, y, cols, rows, cw, ch, col, cap, round) { for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const cx = x + i * cw, cy = y + j * ch; p.rect(cx, cy, cw - 0.3, ch - 0.3, M(col, 1.06, { s: 0.25 }), round ? Math.min(cw, ch) * 0.45 : 0.3); p.circ(cx + (cw - 0.3) / 2, cy + (ch - 0.3) / 2, Math.min(cw, ch) * 0.32, M(cap, 1.1, { s: 0.3 })); } }
// NASAMS 3 on an FMTV: six AMRAAM canisters in a trainable launcher that elevates to ~30°
V('usa_sam2', { L: 28, W: 10.6, tx: -6, gx: 0, gl: 7, hull(p, f) {
  truck(p, f, { L: 28, W: 10.6, axles: [9.4, -5.6, -10.2], deck: 4, guards: [[-12.6, -3.2], [7.0, 11.8]] }); for (const y of [-4.5, 4.5]) jack(p, -12.6, y);
  cab3(p, f, 3.6, 10.6, 10.2, { hood: 1.6 }); p.rect(-1.6, -4.4, 4.4, 2.6, fpaint(f, 0.6), 0.3); p.grain(0.15);
}, tur(p, f) {
  p.rect(-7.6, -4.4, 2.6, 8.8, M('#33342e', 0.7), 0.3); for (const y of [-4.3, 3.5]) p.rect(-7, y, 15, 0.8, M('#3c3d36', 0.98), 0.2);
  podTop(p, -6.6, -3.4, 14, 6.8, f, { tubes: 3, straps: 4, h: 0.94, col: '#b9b5a3', mark: 1 }); teamFlag(p, -6.3, -2.4, 1, 2); p.grain(0.15);
}, turE(p, f) {
  p.rect(-7.6, -4.4, 2.6, 8.8, M('#33342e', 0.6), 0.3); rams(p, -5.6, 0.5, [-3.9, 3.9]);
  podTop(p, -6.6, -3.4, 10.6, 6.8, f, { tubes: 3, straps: 3, h: 1.0, col: '#b9b5a3' }); podFace(p, 4, -3.4, 2.6, 6.8, 3, 2, { caps: '#e2ddca' }); teamFlag(p, -6.3, -2.4, 1, 2);
} });
// Buk-M3 9A317M TELAR: tracked, fire-control radar on the turret front, six missiles in transport-launch containers
V('rus_sam2', { L: 33, W: 15, tx: -3, gx: 0, gl: 8, hull(p, f) {
  trackedHull(p, f, { L: 33, W: 15, front: 6, skirt: false, tw: 3.3 }); hatch(p, 13, -3, 1.1, f); hatch(p, 13, 3, 1.1, f); grille(p, -16, -4.6, 5.4, 9.2, 7, 'y');
  boxes(p, 6, -7.2, 7, 1.3, f, 2); boxes(p, 6, 5.9, 7, 1.3, f, 2); p.grain(0.18);
}, tur(p, f) {
  p.circ(0, 0, 5, M('#33342e', 0.6)); facet(p, [6.4, -4.6, 5.2, -5.6, -5.6, -5.6, -6.6, -4.6, -6.6, 4.6, -5.6, 5.6, 5.2, 5.6, 6.4, 4.6], f, 0.86, 0.62, 1.4);
  p.rect(5.4, -4.4, 2.2, 8.8, M('#2c3133', 1.02, { s: 0.6 }), 0.6); p.rect(6.2, -3.8, 0.9, 7.6, M('#47524f', 1.06, { s: 0.85 })); // radar antenna
  for (let i = 0; i < 3; i++) canister(p, -10, -2.9 + i * 2.9, 15, 2.5, '#5c6447', 0.98 + i * 0.005); // TPK containers
  teamFlag(p, -6.4, -1.4, 1.2, 2.8); p.grain(0.15);
}, turE(p, f) {
  p.circ(0, 0, 5, M('#33342e', 0.6)); facet(p, [6.4, -4.6, 5.2, -5.6, -5.6, -5.6, -6.6, -4.6, -6.6, 4.6, -5.6, 5.6, 5.2, 5.6, 6.4, 4.6], f, 0.86, 0.62, 1.4);
  p.rect(5.4, -4.4, 2.2, 8.8, M('#2c3133', 1.02, { s: 0.6 }), 0.6); rams(p, -8, -2, [-4.6, 4.6], 0.6);
  for (let i = 0; i < 3; i++) canister(p, -10, -2.9 + i * 2.9, 10.4, 2.5, '#5c6447', 1.02); podFace(p, 0.4, -4.2, 2.8, 8.7, 3, 2, { col: '#3f4532', caps: '#cbc6b2', h: 1.06 }); teamFlag(p, -6.4, -1.4, 1.2, 2.8);
} });
// HQ-16FE: 6x6 truck, six canisters that are erected vertically for launch
V('chn_sam2', { L: 32, W: 11.5, tx: -5, gx: 0, gl: 0, fixT: 1, hull(p, f) {
  truck(p, f, { L: 32, W: 11.5, axles: [11.6, -5.4, -10.4], deck: 6.4, guards: [[-13, -3], [9.2, 14]] }); for (const [x, y] of [[-15, -5], [-15, 5], [2.4, -5.2], [2.4, 5.2]]) jack(p, x, y);
  cab3(p, f, 6.4, 11.5, 9.6, { armored: 1 }); p.grain(0.15);
}, tur(p, f) {
  p.rect(-11, -4.8, 18.4, 9.6, M('#33342e', 0.6), 0.4); for (let i = 0; i < 3; i++) canister(p, -10.4, -3.2 + i * 3.2, 17.4, 2.8, '#6a7258', 0.92); teamFlag(p, -10.6, -1.2, 1, 2.4); p.grain(0.15);
}, turE(p, f) {
  p.rect(-11, -4.8, 18.4, 9.6, M('#33342e', 0.6), 0.4); rams(p, -6, 4, [-4.6, 4.6], 0.7); p.rect(-11.8, -4.8, 3, 9.6, M('#3d3e37', 0.9)); vlsTops(p, -11.6, -4.6, 2, 3, 3.1, 3.1, '#6a7258', '#d7d2c0', true);
} });
// IRIS-T SLM: 8x8 truck, eight canisters erected vertically (360° coverage)
V('eu_sam2', { L: 33, W: 12, tx: -5, gx: 0, gl: 0, fixT: 1, hull(p, f) {
  truck(p, f, { L: 33, W: 12, axles: [12.4, 8.2, -6.6, -11.2], deck: 6.4, guards: [[-13.6, -4.2], [6.4, 14.6]] }); for (const [x, y] of [[-15.6, -5.4], [-15.6, 5.4], [3, -5.6], [3, 5.6]]) jack(p, x, y);
  cab3(p, f, 6.4, 12, 10, {}); p.grain(0.15);
}, tur(p, f) {
  p.rect(-11, -5, 19, 10, M('#33342e', 0.6), 0.4); for (let i = 0; i < 4; i++) canister(p, -10.4, -3.75 + i * 2.5, 18, 2.2, '#5d6448', 0.92); teamFlag(p, -10.6, -1.2, 1, 2.4); p.grain(0.15);
}, turE(p, f) {
  p.rect(-11, -5, 19, 10, M('#33342e', 0.6), 0.4); rams(p, -6, 4, [-4.8, 4.8], 0.7); p.rect(-11.8, -5, 2.8, 10, M('#3d3e37', 0.9)); vlsTops(p, -11.8, -4.9, 2, 4, 2.9, 2.5, '#5d6448', '#d9d5c4', false);
} });
// Cheongung KM-SAM II: 8x8 truck, eight round canisters launched vertically
V('arb_sam2', { L: 34, W: 12, tx: -5.5, gx: 0, gl: 0, fixT: 1, hull(p, f) {
  truck(p, f, { L: 34, W: 12, axles: [12.8, 8.6, -6.8, -11.6], deck: 6.6, guards: [[-14, -4.4], [6.6, 15]] }); for (const [x, y] of [[-16, -5.4], [-16, 5.4], [3.2, -5.6], [3.2, 5.6]]) jack(p, x, y);
  cab3(p, f, 6.6, 12, 10.4, { armored: 1 }); p.grain(0.15);
}, tur(p, f) {
  p.rect(-11.4, -5, 19.6, 10, M('#3a382f', 0.6), 0.4); for (let i = 0; i < 4; i++) canister(p, -10.8, -3.75 + i * 2.5, 18.6, 2.2, '#b5ab8e', 0.92, true); teamFlag(p, -11, -1.2, 1, 2.4); p.grain(0.15);
}, turE(p, f) {
  p.rect(-11.4, -5, 19.6, 10, M('#3a382f', 0.6), 0.4); rams(p, -6, 4, [-4.8, 4.8], 0.7); p.rect(-12.2, -5, 2.8, 10, M('#45423a', 0.9)); vlsTops(p, -12.2, -4.9, 2, 4, 2.9, 2.5, '#b5ab8e', '#e6e0cc', true);
} });
// 2K12 Kub (captured): 2P25 launcher on a tracked chassis carrying three big 3M9 missiles
