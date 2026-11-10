/* ============================================================
   War of Power — رسومات المباني (طراز كل دولة) والمباني المدنية في القرى
   الملف: js/art/buildings.js   ·   ترتيب التحميل: 12 من 43
   ============================================================ */
'use strict';
/* ===== Building art (top-down, faction styles) ===== */
const S_BLD = 2.0;
const BSTYLE = {
  usa: { wall: '#b8b2a2', roof: '#8c908b', roof2: '#6f7570', acc: '#c2a878', trim: '#5f5a50', pad: '#a5a39b', tile: 0, dome: 0 },
  rus: { wall: '#a8a69a', roof: '#6b7561', roof2: '#57614f', acc: '#9a3d2f', trim: '#4a4a42', pad: '#9c9b91', tile: 0, dome: 0 },
  chn: { wall: '#b3afa4', roof: '#5f7682', roof2: '#4b606b', acc: '#ad3b2f', trim: '#4d4b45', pad: '#a29f97', tile: 0, dome: 0 },
  eu: { wall: '#cbc6ba', roof: '#9a5a44', roof2: '#62676b', acc: '#3d5a8a', trim: '#55524b', pad: '#aca89f', tile: 1, dome: 0 },
  arb: { wall: '#d6c39d', roof: '#dccdaa', roof2: '#bea880', acc: '#2f7a52', trim: '#7a6a4e', pad: '#c7b692', tile: 0, dome: 1 },
  neu: { wall: '#bdb6a6', roof: '#8e8a82', roof2: '#77736b', acc: '#7a6a4e', trim: '#5a564e', pad: '#a8a59d', tile: 0, dome: 0 },
};
function pad(p, w, h, st, o) {
  o = o || {};
  p.rect(-w / 2, -h / 2, w, h, M(st.pad, 0.05, { s: 0.04 }), 1);
  p.rect(-w / 2, -h / 2, w, 2.2, AL('rgba(70,62,50,0.35)')); p.rect(-w / 2, h / 2 - 2.2, w, 2.2, AL('rgba(70,62,50,0.35)')); p.rect(-w / 2, -h / 2, 2.2, h, AL('rgba(70,62,50,0.35)')); p.rect(w / 2 - 2.2, -h / 2, 2.2, h, AL('rgba(70,62,50,0.35)'));
  const g = o.grid || 16; for (let x = -w / 2 + g; x < w / 2 - 1; x += g) p.line([x, -h / 2 + 1, x, h / 2 - 1], 0.35, AL('rgba(0,0,0,0.12)'));
  for (let y = -h / 2 + g; y < h / 2 - 1; y += g) p.line([-w / 2 + 1, y, w / 2 - 1, y], 0.35, AL('rgba(0,0,0,0.12)'));
  if (o.stripe) { p.rect(-w / 2 + 2, -h / 2 + 2, w - 4, 1.2, AL('rgba(214,180,60,0.6)')); p.rect(-w / 2 + 2, h / 2 - 3.2, w - 4, 1.2, AL('rgba(214,180,60,0.6)')); }
  const r = RNG(Math.round(w * 13 + h)); for (let i = 0; i < w * h / 500; i++) p.ell(r.range(-w / 2 + 4, w / 2 - 4), r.range(-h / 2 + 4, h / 2 - 4), r.range(2, 6), r.range(1, 3), r(), AL(`rgba(30,26,20,${r.range(0.05, 0.16)})`));
}
function roofTex(p, x, y, w, h, type, col, hgt, o) {
  o = o || {};
  if (type === 'metal') { p.rect(x, y, w, h, M(col, hgt, { s: 0.25 }), 0.4); const vertical = o.vert; const step = 1.6;
    if (vertical) for (let i = x + step; i < x + w; i += step) p.line([i, y + 0.4, i, y + h - 0.4], 0.35, M(shade(col, -0.18), hgt + 0.015, { s: 0.3 }));
    else for (let j = y + step; j < y + h; j += step) p.line([x + 0.4, j, x + w - 0.4, j], 0.35, M(shade(col, -0.18), hgt + 0.015, { s: 0.3 })); }
  else if (type === 'tile') { p.rect(x, y, w, h, M(col, hgt, { s: 0.05 }), 0.4); for (let j = y + 1.2; j < y + h; j += 1.2) p.line([x + 0.3, j, x + w - 0.3, j], 0.3, M(shade(col, -0.22), hgt - 0.01));
    // ridge
    if (w > h) p.line([x + 0.5, y + h / 2, x + w - 0.5, y + h / 2], 0.8, M(shade(col, -0.1), hgt + 0.08)); else p.line([x + w / 2, y + 0.5, x + w / 2, y + h - 0.5], 0.8, M(shade(col, -0.1), hgt + 0.08));
    if (w > h) { p.rect(x, y, w, h / 2, HO(hgt, { hg: [0, y, hgt - 0.08, 0, y + h / 2, hgt + 0.07] })); p.rect(x, y + h / 2, w, h / 2, HO(hgt, { hg: [0, y + h / 2, hgt + 0.07, 0, y + h, hgt - 0.08] })); }
    else { p.rect(x, y, w / 2, h, HO(hgt, { hg: [x, 0, hgt - 0.08, x + w / 2, 0, hgt + 0.07] })); p.rect(x + w / 2, y, w / 2, h, HO(hgt, { hg: [x + w / 2, 0, hgt + 0.07, x + w, 0, hgt - 0.08] })); } }
  else { // flat concrete roof with parapet
    p.rect(x, y, w, h, M(shade(col, -0.05), hgt + 0.03, { s: 0.05 }), 0.3); p.rect(x + 1, y + 1, w - 2, h - 2, M(col, hgt, { s: 0.05 }));
    const r = RNG((x * 7 + y * 13 + w) | 0); for (let i = 0; i < w * h / 70; i++) p.circ(x + 1.5 + r() * (w - 3), y + 1.5 + r() * (h - 3), r.range(0.3, 1.2), AL(`rgba(0,0,0,${r.range(0.03, 0.08)})`));
  }
}
function block(p, x, y, w, h, st, hgt, type, col) { roofTex(p, x, y, w, h, type || (st.tile ? 'tile' : 'flat'), col || st.roof, hgt); }
function acUnit(p, x, y, hgt) { p.rect(x - 1.4, y - 1.1, 2.8, 2.2, M('#9da0a0', hgt + 0.06, { s: 0.3 }), 0.3); p.circ(x - 0.3, y, 0.8, M('#3c3e3e', hgt + 0.05)); p.circ(x - 0.3, y, 0.25, M('#888', hgt + 0.07)); }
function vent(p, x, y, r, hgt) { p.circ(x, y, r, M('#7d8080', hgt + 0.05, { s: 0.3 })); p.circ(x, y, r * 0.6, M('#2f3131', hgt + 0.02)); }
function tankC(p, x, y, r, col, hgt) { dome(p, x, y, r, col, hgt * 0.6, hgt); p.circ(x, y, r * 0.18, M('#555', hgt)); p.line([x - r, y, x + r, y], 0.25, AL('rgba(0,0,0,0.15)')); }
function helipad(p, x, y, r, hgt) { p.circ(x, y, r, M('#4a4d4a', hgt, { s: 0.05 })); p.circ(x, y, r * 0.86, AL('rgba(230,230,220,0.65)')); p.circ(x, y, r * 0.8, AL('#4a4d4a'));
  const k = r * 0.4; p.line([x - k * 0.6, y - k, x - k * 0.6, y + k], k * 0.35, AL('#e8e6dc')); p.line([x + k * 0.6, y - k, x + k * 0.6, y + k], k * 0.35, AL('#e8e6dc')); p.line([x - k * 0.6, y, x + k * 0.6, y], k * 0.35, AL('#e8e6dc')); }
function flag(p, x, y, hgt) { p.circ(x, y, 0.6, M('#888', hgt + 0.2)); p.rect(x + 0.3, y - 0.9, 5, 3, M('#ddd', hgt + 0.1, { t: 1 }), 0.3); }
function sandbags(p, pts, hgt) { for (let i = 0; i < pts.length; i += 2) p.ell(pts[i], pts[i + 1], 1.5, 0.9, Math.atan2(pts[i + 3] - pts[i + 1], pts[i + 2] - pts[i]) || 0, M('#9b8a62', hgt, { s: 0.02 })); }
function sandbagRing(p, x, y, r, hgt) { const n = Math.round(TAU * r / 2.4); const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r); } for (let i = 0; i < pts.length; i += 2) { const a = Math.atan2(pts[i + 1] - y, pts[i] - x) + PI / 2; p.ell(pts[i], pts[i + 1], 1.5, 0.95, a, M('#9b8a62', hgt, { s: 0.02 })); } }
function crates(p, x, y, n, m, col, hgt) { for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { p.rect(x + i * 3.2, y + j * 3.2, 2.9, 2.9, M(col, hgt, { s: 0.05 }), 0.2); p.line([x + i * 3.2 + 0.3, y + j * 3.2 + 0.3, x + i * 3.2 + 2.6, y + j * 3.2 + 2.6], 0.2, AL('rgba(0,0,0,0.25)')); } }
function parked(p, x, y, ang, col, len) { len = len || 9; p.rect(x - len / 2, y - 2, len, 4, M(col, 0.2, { s: 0.3 }), 1); p.rect(x - len * 0.05, y - 1.6, len * 0.3, 3.2, M('#2a3640', 0.24, { s: 0.8 }), 0.5); }
function windows(p, x, y, w, h, n, vert) { for (let i = 0; i < n; i++) { if (vert) p.rect(x, y + (i + 0.2) * h / n, w, h / n * 0.6, M('#33495a', 0.5, { s: 0.85 })); else p.rect(x + (i + 0.2) * w / n, y, w / n * 0.6, h, M('#33495a', 0.5, { s: 0.85 })); } }
function domeRoof(p, x, y, r, col, hgt) { dome(p, x, y, r, col, hgt * 0.6, hgt); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; p.line([x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95], 0.2, AL('rgba(0,0,0,0.12)')); } }
function antenna(p, x, y, hgt) { p.circ(x, y, 0.7, M('#555', hgt)); p.line([x - 2, y, x + 2, y], 0.25, M('#666', hgt)); p.line([x, y - 2, x, y + 2], 0.25, M('#666', hgt)); }
function trees(p, x, y, n, r, seed) { const rr = RNG(seed || 5); for (let i = 0; i < n; i++) { const tx = x + rr.range(-r, r), ty = y + rr.range(-r, r), s = rr.range(1.6, 3); p.circ(tx, ty, s, M(rgb2hex(mixc('#3d5a26', '#5c7a34', rr())), 0.45, { hr: [tx - s * 0.3, ty - s * 0.3, s, 0.6, 0.3] })); } }

/* ---- Military building painters: fn(p, st, f) ; each sized w*32 x h*32 ---- */
const BART = {};
BART.hq = (p, st, f) => {
  pad(p, 156, 156, st, { stripe: 1 });
  // main building H-shape
  if (st.dome) { block(p, -46, -46, 92, 92, st, 0.62, 'flat'); domeRoof(p, 0, 0, 22, '#ece6d6', 0.98); for (const [x, y] of [[-36, -36], [36, -36], [-36, 36], [36, 36]]) domeRoof(p, x, y, 7, st.acc, 0.8); windows(p, -40, -46.5, 80, 1.2, 14); }
  else {
    block(p, -50, -40, 34, 80, st, 0.6); block(p, 16, -40, 34, 80, st, 0.6); block(p, -16, -18, 32, 36, st, 0.72, st.tile ? 'flat' : 'flat', st.roof2);
    if (f === 'eu') { p.rect(-14, -16, 28, 32, M('#5d7d93', 0.73, { s: 0.95 }), 0.5); for (let x = -12; x < 14; x += 4) p.line([x, -16, x, 16], 0.3, M('#9aa6ad', 0.75)); }
    if (f === 'chn') { p.rect(-16, -18, 32, 36, M(st.acc, 0.72), 1); p.rect(-12, -14, 24, 28, M('#4a6270', 0.8), 0.6); p.line([-12, 0, 12, 0], 1, M('#3c505c', 0.86)); }
    for (const [x, y] of [[-42, -30], [-42, 0], [-42, 28], [26, -30], [26, 0], [26, 28]]) acUnit(p, x, y, 0.6);
    vent(p, -24, -30, 1.6, 0.6); vent(p, 40, 32, 1.6, 0.6);
  }
  helipad(p, 58, -58, 13, 0.08); flag(p, -62, 62, 0.4); flag(p, -55, 62, 0.4);
  // satellite dishes & antennas
  dome(p, 30, -55, 6, '#e0e0da', 0.3, 0.5); dome(p, -30, 56, 5, '#e0e0da', 0.3, 0.5); antenna(p, 0, -30, 0.95); antenna(p, -8, 30, 0.95);
  for (let i = 0; i < 6; i++) parked(p, 30 + (i % 3) * 11, 54 + Math.floor(i / 3) * 7, 0, ['#5a5f52', '#7a7466', '#3f453a'][i % 3]);
  p.rect(-78, -78, 156, 2, M('#55534d', 0.12)); p.rect(-78, 76, 156, 2, M('#55534d', 0.12)); p.rect(-78, -78, 2, 156, M('#55534d', 0.12)); p.rect(76, -78, 2, 156, M('#55534d', 0.12));
  p.grain(0.12);
};
BART.power = (p, st, f) => {
  pad(p, 92, 92, st, { grid: 12 });
  if (f === 'eu') { // solar + wind
    for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) { const x = -40 + i * 16, y = -40 + j * 12; p.rect(x, y, 14, 9, M('#1f3550', 0.22, { s: 0.95 }), 0.3); for (let k = 1; k < 4; k++) p.line([x + k * 3.5, y, x + k * 3.5, y + 9], 0.2, AL('rgba(200,220,240,0.3)')); }
    p.circ(20, -18, 3, M('#d8dad8', 0.9)); p.circ(20, 20, 3, M('#d8dad8', 0.9)); block(p, 10, 34, 30, 8, st, 0.4, 'flat', st.roof2); for (let i = 0; i < 4; i++) p.rect(-38 + i * 9, 34, 6, 8, M('#5e6260', 0.35, { s: 0.4 }));
  } else {
    block(p, -40, -30, 46, 40, st, 0.62, 'metal', st.roof2);
    if (f === 'rus' || f === 'chn') { p.circ(26, -16, 17, M('#b9b6ac', 0.86, { hr: [26, -16, 17, 0.7, 1] })); p.circ(26, -16, 12, M('#5a5a54', 0.55)); p.circ(26, -16, 10.5, M('#8d9aa1', 0.5, { s: 0.6 })); }
    else { tankC(p, 24, -24, 9, '#d6d4cc', 0.6); tankC(p, 24, -2, 9, '#d6d4cc', 0.6); }
    for (const [x, y] of [[-30, 22], [-16, 22]]) { p.circ(x, y, 4.2, M('#7b7b74', 0.98, { s: 0.2 })); p.circ(x, y, 3, M('#1d1d1b', 0.9)); } // stacks
    for (let i = 0; i < 4; i++) { p.rect(0 + i * 10, 22, 7, 14, M('#6d706c', 0.32, { s: 0.4 }), 0.6); for (let k = 0; k < 3; k++) p.rect(1 + i * 10, 24 + k * 4, 5, 1.2, M('#4a4c48', 0.4)); }
    p.line([-44, 40, 44, 40], 0.6, M('#555', 0.5)); p.line([-44, 36, 44, 36], 0.4, M('#555', 0.5));
  }
  flag(p, -42, 42, 0.4); p.grain(0.12);
};
BART.barracks = (p, st, f) => {
  pad(p, 92, 92, st, { grid: 12 });
  if (st.dome) { block(p, -40, -38, 50, 26, st, 0.55); block(p, -40, -6, 50, 26, st, 0.55); for (let i = 0; i < 4; i++) { p.path(c => { c.arc(-34 + i * 12, -12.8, 3, PI, 0); c.closePath(); }, M('#c8b58e', 0.56)); } }
  else { block(p, -40, -38, 54, 22, st, 0.55); block(p, -40, -8, 54, 22, st, 0.55); }
  for (let i = 0; i < 4; i++) acUnit(p, -32 + i * 13, -27, 0.55);
  // training yard
  p.rect(20, -38, 22, 56, M('#a59275', 0.1), 1); for (let y = -32; y < 14; y += 9) p.rect(24, y, 14, 1, M('#6b5d45', 0.2)); sandbags(p, [22, 22, 26, 23, 30, 23, 34, 22, 38, 22], 0.2);
  p.rect(-40, 22, 54, 18, M('#9a8d74', 0.08), 1); for (let i = 0; i < 5; i++) p.circ(-34 + i * 11, 31, 1, M('#ddd', 0.12)); flag(p, 36, 36, 0.4); flag(p, 42, 36, 0.4);
  p.grain(0.12);
};
BART.supply = (p, st, f) => {
  pad(p, 124, 92, st, { stripe: 1, grid: 14 });
  block(p, -56, -40, 60, 44, st, 0.6, 'metal', st.roof2); p.rect(-56, 4, 60, 4, M(st.acc, 0.35), 0.3); for (let i = 0; i < 5; i++) p.rect(-52 + i * 12, 4, 8, 6, M('#3c3c38', 0.18));
  crates(p, 10, -38, 6, 3, '#7c6a45', 0.24); crates(p, 10, -22, 6, 2, '#5f6b45', 0.24); crates(p, -54, 20, 4, 3, '#7c6a45', 0.24); crates(p, -36, 20, 3, 3, '#6a5a3a', 0.24);
  p.rect(14, 8, 44, 30, M('#8a8a82', 0.07), 1); for (let i = 0; i < 4; i++) p.rect(16 + i * 10.5, 10, 0.5, 26, AL('rgba(230,210,90,0.7)'));
  parked(p, -14, 30, 0, '#bfa24a', 6); flag(p, 54, -40, 0.4); p.grain(0.12);
};
BART.factory = (p, st, f) => {
  pad(p, 124, 124, st, { stripe: 1, grid: 16 });
  // sawtooth roof hall
  p.rect(-56, -54, 92, 76, M(st.roof2, 0.66, { s: 0.2 }), 0.5);
  for (let i = 0; i < 7; i++) { const x = -54 + i * 13; p.rect(x, -52, 9.5, 72, M(st.roof, 0.64, { s: 0.25, hg: [x, 0, 0.6, x + 9.5, 0, 0.72] })); p.rect(x + 9.5, -52, 2.6, 72, M('#465a66', 0.72, { s: 0.95 })); }
  block(p, 40, -54, 16, 30, st, 0.5); for (const y of [-46, -38]) acUnit(p, 48, y, 0.5);
  p.rect(-50, 22, 30, 4, M('#3d3e3a', 0.2)); p.rect(-12, 22, 30, 4, M('#3d3e3a', 0.2)); // doors
  p.rect(-56, 30, 112, 26, M('#8b8b84', 0.06), 1); p.line([-56, 43, 56, 43], 0.6, AL('rgba(230,210,90,0.6)'));
  for (const x of [-56, 54]) p.line([x, -56, x, 56], 0.8, M('#6a6a62', 0.18)); flag(p, 48, 50, 0.4); p.grain(0.12);
};
BART.ops = (p, st, f) => {
  pad(p, 92, 92, st, { grid: 12 });
  block(p, -40, -40, 50, 50, st, 0.66, 'flat', st.roof2); windows(p, -40, -40.6, 50, 1, 8);
  for (const [x, y] of [[-30, -30], [-30, 0], [0, -30]]) acUnit(p, x, y, 0.66);
  p.circ(26, 22, 14, M('#9da09c', 0.25)); antenna(p, -30, 28, 0.9); antenna(p, 30, -30, 0.9); p.line([20, -36, 40, -36], 0.4, M('#666', 0.6));
  dome(p, -10, -10, 12, '#e7e5dd', 0.68, 0.98); flag(p, -42, 42, 0.4); p.grain(0.12);
};
BART.airfield = (p, st, f) => {
  pad(p, 188, 124, st, { grid: 20 });
  p.rect(-92, 20, 184, 22, M('#3e403d', 0.07, { s: 0.1 }), 1); for (let x = -84; x < 84; x += 14) p.rect(x, 30.4, 8, 1.2, AL('#e6e3d8'));
  p.rect(-90, 21.5, 180, 0.8, AL('#e6e3d8')); p.rect(-90, 39.5, 180, 0.8, AL('#e6e3d8')); for (let i = 0; i < 6; i++) { p.rect(-88, 23 + i * 2.8, 6, 1.4, AL('#e6e3d8')); p.rect(82, 23 + i * 2.8, 6, 1.4, AL('#e6e3d8')); }
  for (let i = 0; i < 4; i++) { const x = -66 + i * 34; p.rect(x - 13, -52, 26, 30, M('#4f514e', 0.07), 1); p.rect(x - 11, -50, 22, 1, AL('rgba(230,210,90,0.8)')); p.circ(x, -37, 9, AL('rgba(230,210,90,0.4)')); p.circ(x, -37, 8.4, AL('#4f514e')); }
  block(p, 74, -58, 16, 26, st, 0.7, 'flat', st.roof2); p.circ(82, -45, 5, M('#3b5566', 0.95, { s: 0.95 })); antenna(p, 82, -54, 1);
  p.rect(-92, -14, 184, 4, M('#6b6c66', 0.05)); flag(p, 86, 50, 0.4); p.grain(0.1);
};
BART.mg = (p, st, f) => { pad(p, 60, 60, st, { grid: 30 }); sandbagRing(p, 0, 0, 20, 0.3); p.rect(-14, -14, 28, 28, M('#8f8c84', 0.5, { s: 0.05 }), 4); p.rect(-12, -12, 24, 24, HO(0.52)); p.circ(0, 0, 8, M('#6c6a64', 0.56)); p.grain(0.12); };
BART.atg = (p, st, f) => { pad(p, 60, 60, st, { grid: 30 }); p.rect(-20, -20, 40, 40, M('#8c897f', 0.35, { s: 0.05 }), 6); p.rect(-16, -16, 32, 32, HO(0.38)); sandbags(p, [-22, -22, -18, -24, -14, -24, -10, -24, 10, 24, 14, 24, 18, 24, 22, 22], 0.36); p.circ(0, 0, 10, M('#6c6a64', 0.42)); p.grain(0.12); };
BART.sam = (p, st, f) => { pad(p, 92, 92, st, { grid: 15 }); p.circ(0, 0, 30, M('#857f6f', 0.2)); p.circ(0, 0, 26, M('#9b9888', 0.12)); block(p, 22, 22, 18, 16, st, 0.42, 'flat', st.roof2); antenna(p, -30, 30, 0.6); flag(p, 38, -40, 0.4); p.grain(0.12); };
BART.wall = (p, st, f) => { for (let i = 0; i < 4; i++) { const y = -14 + i * 7.4; p.rect(-14, y, 28, 6, M('#a3a097', 0.7, { s: 0.05, hg: [0, y, 0.55, 0, y + 3, 0.78] }), 0.8); p.line([-13, y + 3, 13, y + 3], 0.2, AL('rgba(0,0,0,0.2)')); } };
BART.super = (p, st, f) => {
  pad(p, 124, 124, st, { stripe: 1, grid: 20 });
  p.circ(0, 0, 44, M('#6d6c66', 0.05)); p.circ(0, 0, 40, AL('rgba(230,210,90,0.35)')); p.circ(0, 0, 38, AL('#6d6c66'));
  block(p, 34, -58, 24, 22, st, 0.55, 'flat', st.roof2); for (let i = 0; i < 4; i++) p.rect(-56 + i * 10, -58, 7, 16, M('#5f625e', 0.3, { s: 0.4 }), 0.5);
  sandbags(p, [-50, 40, -46, 44, -42, 47, -38, 49, 38, 49, 42, 47, 46, 44, 50, 40], 0.3); flag(p, 52, 52, 0.4); p.grain(0.12);
};
// neutral
BART.depot = (p, st) => { p.circ(0, 0, 44, AL('rgba(140,120,90,0.25)')); crates(p, -30, -30, 6, 6, '#7c6a45', 0.34); crates(p, -8, -14, 4, 3, '#5f6b45', 0.42); p.rect(-30, -30, 19, 19, M('#6b6a4c', 0.4, { s: 0.05 }), 1); p.grain(0.15); };
/* ---- Civilian buildings (village houses, decor only) ---- */
const CART = {};
CART.house = (p, st) => { pad(p, 60, 60, st, { grid: 30 }); p.rect(-28, -28, 56, 56, M('#7a8a4e', 0.04), 2); block(p, -22, -22, 26, 20, st, 0.55); block(p, 8, 2, 18, 18, st, 0.5); p.rect(-24, 6, 26, 14, M('#9e968a', 0.06)); trees(p, 18, -16, 3, 5, 7); parked(p, -12, 14, 0, '#8a3c32', 8); p.grain(0.1); };
CART.villa = (p, st) => { pad(p, 92, 92, st, { grid: 46 }); p.rect(-44, -44, 88, 88, M('#6e8a44', 0.04), 2); block(p, -34, -34, 40, 30, st, 0.6); p.rect(10, -30, 26, 16, M('#3d9fc4', 0.06, { s: 0.95 }), 2); p.rect(12, -28, 22, 12, AL('rgba(255,255,255,0.12)')); trees(p, -20, 28, 8, 12, 9); trees(p, 30, 24, 4, 8, 3); p.grain(0.1); };
CART.apart = (p, st) => { pad(p, 92, 92, st, { grid: 15 }); block(p, -38, -38, 76, 52, st, 0.82, 'flat', st.roof2); for (let i = 0; i < 6; i++) acUnit(p, -30 + i * 12, -24, 0.82); vent(p, 26, 4, 2, 0.82); p.rect(-38, 18, 76, 20, M('#8c8a84', 0.06), 1); for (let i = 0; i < 6; i++) parked(p, -30 + i * 12, 28, 0, ['#6a6e72', '#a33', '#ddd', '#334'][i % 4], 7); p.grain(0.1); };
CART.tower = (p, st) => { pad(p, 92, 92, st, { grid: 23 }); block(p, -30, -30, 60, 60, st, 0.98, 'flat', '#8f9599'); p.rect(-28, -28, 56, 56, HO(1)); helipad(p, 0, 0, 14, 1); for (const [x, y] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) acUnit(p, x, y, 0.99); p.rect(-30, -31, 60, 1.5, M('#5f87a0', 0.97, { s: 0.95 })); p.grain(0.1); };

/* ---- construction overlay sprites ---- */
function bakeConstruction(w, h) {
  const W = w * 32, H = h * 32, key = 'cons:' + w + 'x' + h;
  bake(key + ':pit', W, H, W / 2, H / 2, S_BLD * 0.8, p => { p.rect(-W / 2 + 2, -H / 2 + 2, W - 4, H - 4, M('#6e5a40', 0.02), 2); p.rect(-W / 2 + 6, -H / 2 + 6, W - 12, H - 12, M('#55442f', 0.0)); for (let i = 0; i < W * H / 260; i++) { const r = RNG(i + w * 7); p.circ(r.range(-W / 2 + 4, W / 2 - 4), r.range(-H / 2 + 4, H / 2 - 4), r.range(1, 3.2), M('#7c6748', 0.1)); } }, { Hmax: 3, dust: 0.2 });
  bake(key + ':frame', W, H, W / 2, H / 2, S_BLD * 0.8, p => { const g = 10; p.rect(-W / 2 + 6, -H / 2 + 6, W - 12, H - 12, M('#8d8c86', 0.12), 1);
    for (let x = -W / 2 + 6; x <= W / 2 - 6; x += g) p.line([x, -H / 2 + 6, x, H / 2 - 6], 1, M('#6e6a60', 0.7, { s: 0.4 }));
    for (let y = -H / 2 + 6; y <= H / 2 - 6; y += g) p.line([-W / 2 + 6, y, W / 2 - 6, y], 1, M('#7d7869', 0.68, { s: 0.4 }));
    for (let x = -W / 2 + 6; x <= W / 2 - 6; x += g) for (let y = -H / 2 + 6; y <= H / 2 - 6; y += g) p.rect(x - 1.2, y - 1.2, 2.4, 2.4, M('#5d5a52', 0.85, { s: 0.4 })); }, { Hmax: 3, dust: 0.05 });
  bake(key + ':scaf', W, H, W / 2, H / 2, S_BLD * 0.8, p => { for (let x = -W / 2 + 3; x <= W / 2 - 3; x += 5) { p.line([x, -H / 2 + 3, x, -H / 2 + 6], 0.5, M('#c9a24a', 0.9)); p.line([x, H / 2 - 6, x, H / 2 - 3], 0.5, M('#c9a24a', 0.9)); }
    p.rect(-W / 2 + 3, -H / 2 + 3, W - 6, 3, AL('rgba(201,162,74,0.85)')); p.rect(-W / 2 + 3, H / 2 - 6, W - 6, 3, AL('rgba(201,162,74,0.85)')); p.rect(-W / 2 + 3, -H / 2 + 3, 3, H - 6, AL('rgba(201,162,74,0.85)')); p.rect(W / 2 - 6, -H / 2 + 3, 3, H - 6, AL('rgba(201,162,74,0.85)'));
    p.rect(-W / 2 + 3, -H / 2 + 3, W - 6, H - 6, HO(0.9, { ha: 0 })); }, { Hmax: 2, dust: 0 });
}
/* ---- Turret / animated parts of buildings ---- */
function bakeBuildingParts(f) {
  
  bake(f + '_mg:tur', 20, 16, 8, 8, S_VEH, p => { p.circ(0, 0, 5.2, M('#6e6c64', 0.72)); p.rect(-4, -3.6, 7.5, 7.2, fpaint(f, 0.85), 1); autoBarrel(p, 2, -0.9, 9, 0.8); autoBarrel(p, 2, 0.9, 9, 0.8); p.rect(-3.4, -1.8, 2.8, 3.6, M(GLASS, 0.95, { s: 0.9 })); teamFlag(p, -3.6, -3.2, 1, 1.6); }, { Hmax: 3 });
  bake(f + '_atg:tur', 22, 18, 9, 9, S_VEH, p => { p.circ(0, 0, 6, M('#666', 0.6)); p.rect(-5, -5, 10, 10, fpaint(f, 0.8), 1); for (const y of [-3.4, 3.4]) { cyl(p, -6, 10, y, 1.4, '#4c4f45', 0.7, 1); p.circ(10, y, 1, M('#1a1a17', 0.9)); } p.rect(-1, -1.4, 3, 2.8, M(GLASS, 1, { s: 0.9 })); teamFlag(p, -4.6, -1.2, 1, 2.4); }, { Hmax: 3 });
  bake(f + '_sam:tur', 44, 30, 22, 15, S_VEH, p => samLauncherArt(p, f), { Hmax: 3.4, weather: 0.6 }); // real launchers (06d_art_new.js)
  bake(f + '_sam:dish', 12, 16, 6, 8, S_VEH, p => { p.rect(-1.5, -6.5, 3, 13, M('#4a4e46', 0.95), 0.5); for (let y = -6; y < 6.5; y += 1) p.line([-1.3, y, 1.3, y], 0.15, AL('rgba(0,0,0,0.3)')); p.rect(1.5, -1, 3, 2, M('#333', 0.7)); }, { Hmax: 2 });
  bake(f + '_ops:dish', 24, 24, 12, 12, S_BLD * 1.2, p => { p.rect(-2, -10, 4, 20, M('#d9d9d2', 0.95, { s: 0.3 }), 0.8); for (let y = -9; y < 10; y += 1.5) p.line([-1.8, y, 1.8, y], 0.2, AL('rgba(0,0,0,0.25)')); p.rect(2, -1.5, 6, 3, M('#888', 0.8)); }, { Hmax: 2 });
  // superweapon launcher sprite (missile on TEL / launcher)
  bake(f + '_super:launcher', 70, 30, 35, 15, S_BLD * 1.3, p => {
    p.rect(-30, -9, 56, 18, fpaint(f, 0.6), 1.5); p.rect(18, -8, 10, 16, fpaint(f, 0.8), 1); p.rect(24, -6, 2, 12, M(GLASS, 0.85, { s: 0.9 }));
    for (const x of [-24, -16, 6, 14]) { p.rect(x - 2, -10.5, 4, 2, M('#222', 0.4)); p.rect(x - 2, 8.5, 4, 2, M('#222', 0.4)); }
    if (f === 'usa' || f === 'eu') { for (let j = 0; j < 2; j++) p.rect(-28, -7 + j * 7.2, 42, 6.4, M('#d8d6cc', 0.9, { s: 0.2 }), 0.6); }
    else { cyl(p, -30, 14, 0, 4, '#c9c8bc', 0.6, 1); p.path(c => { c.moveTo(14, -4); c.quadraticCurveTo(22, -3, 24, 0); c.quadraticCurveTo(22, 3, 14, 4); c.closePath(); }, M('#e2e0d6', 0.95, { s: 0.3 })); }
    teamFlag(p, -28, -1.5, 2, 3); p.grain(0.1);
  }, { Hmax: 3 });
  if (f === 'eu') bake('eu_power:blade', 36, 36, 18, 18, S_BLD * 1.2, p => { for (let i = 0; i < 3; i++) { const a = i * TAU / 3; p.line([0, 0, Math.cos(a) * 16, Math.sin(a) * 16], 1.2, M('#eceeec', 1, { s: 0.3 })); } p.circ(0, 0, 1.6, M('#cfd1cf', 1)); }, { Hmax: 2 });
}
/* an exposed iron vein: iron-stained ground that fades into the terrain, dark bedrock slabs, rust and hematite
   chunks with metallic glints, rusty streaks and scattered pebbles (the mine is built on top of it) */
function oreFieldArt(p) {
  const r = RNG(77);
  p.circ(0, 0, 34, { c: ctx => { const g = ctx.createRadialGradient(0, 0, 3, 0, 0, 34); g.addColorStop(0, 'rgba(104,54,32,0.95)'); g.addColorStop(0.5, 'rgba(122,68,40,0.75)'); g.addColorStop(0.8, 'rgba(128,80,52,0.32)'); g.addColorStop(1, 'rgba(128,80,52,0)'); return g; }, h: 0.02 });
  for (let i = 0; i < 11; i++) { const a = r.range(0, TAU), d0 = r.range(3, 13), d1 = d0 + r.range(8, 17), b2 = a + r.range(-0.35, 0.35); p.line([Math.cos(a) * d0, Math.sin(a) * d0, Math.cos(b2) * d1, Math.sin(b2) * d1], r.range(1.2, 2.8), M(['#9a4a26', '#b8622e', '#7a3a22'][i % 3], 0.03, { a: 0.5 })); }
  for (let i = 0; i < 7; i++) { const cx = r.range(-16, 16), cy = r.range(-16, 16), R0 = r.range(5, 9.5); const n = 5 + (i % 3); const pts = [];
    for (let k = 0; k < n; k++) { const a = k / n * TAU + r.range(-0.25, 0.25), rr = R0 * r.range(0.72, 1.15); pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.86); }
    facet(p, pts, ['#4a3d36', '#57443a', '#3f3530'][i % 3], r.range(0.42, 0.64), 0.22, R0 * 0.3); }
  for (let i = 0; i < 28; i++) { const a = r.range(0, TAU), d = r.range(0, 22), x = Math.cos(a) * d, y = Math.sin(a) * d, s = r.range(1.4, 3.8); const pts = [];
    for (let k = 0; k < 5; k++) { const q = k / 5 * TAU + r.range(-0.3, 0.3); pts.push(x + Math.cos(q) * s * r.range(0.7, 1.1), y + Math.sin(q) * s * r.range(0.7, 1.1)); }
    p.poly(pts, M(['#a8532c', '#c06a34', '#6e3a2c', '#8c4a30', '#5b4a48'][i % 5], r.range(0.52, 0.82), { s: i % 5 === 4 ? 0.9 : 0.35, hr: [x - s * 0.3, y - s * 0.3, s, r.range(0.72, 0.9), 0.42] })); }
  for (let i = 0; i < 16; i++) p.circ(r.range(-20, 20), r.range(-20, 20), r.range(0.35, 0.75), M('#e2ddd4', 0.86, { s: 1 }));
  for (let i = 0; i < 34; i++) { const a = r.range(0, TAU), d = r.range(14, 31); p.circ(Math.cos(a) * d, Math.sin(a) * d, r.range(0.5, 1.4), M(['#6b4a3a', '#8a5a3e', '#4f413a'][i % 3], 0.18)); }
  p.grain(0.22);
}
function bakeBuildings(f, list) {
  const st = BSTYLE[f]; list = list || Object.keys(BART);
  if (!ATLAS.has('orefld')) bake('orefld', 72, 72, 36, 36, S_BLD * 0.8, oreFieldArt, { Hmax: 4, dust: 0.12, soft: 0.45, ao: 2.6 });
  if (!list.length || !ATLAS.has('sandbag')) bake('sandbag', 32, 32, 16, 16, S_BLD, p => { p.circ(0, 0, 9, M('#5a5446', 0.25)); sandbagRing(p, 0, 0, 10.5, 2.6); p.rect(-1, -7, 2, 9, M('#2e2f2a', 0.9)); }, { Hmax: 3 });
  for (const t of list) {
    const b = BLD[t]; if (!b || !BART[t]) continue; if (b.only && b.only !== f) continue; const key = (b.neutral ? 'neu' : f) + '_' + t; if (ATLAS.has(key)) continue;
    const W = b.w * 32, H = b.h * 32;
    bake(key, W, H, W / 2, H / 2, S_BLD, p => BART[t](p, b.neutral ? BSTYLE.neu : st, f), { Hmax: 10, dust: 0.06, soft: 0.5, aoR: 2.4, ao: 2.2, castH: b.height, shK: 0.45, raw: !b.neutral, wc4: 2 });
    if (t === 'city') for (const L of [2, 3]) bake(key + ':L' + L, W, H, W / 2, H / 2, S_BLD, p => cityArt(p, L), { Hmax: 10, dust: 0.04, soft: 0.5, aoR: 2.4, ao: 2.2, castH: b.height + L * 4, shK: 0.45, wc4: 2 });
    if (!b.neutral && t !== 'wall') bake(key + ':ruin', W, H, W / 2, H / 2, S_BLD * 0.55, p => BART[t](p, st, f), { Hmax: 6, burnt: 1 });
    bakeConstruction(b.w, b.h);
  }
  bakeBuildingParts(f); bakeNewParts(f);
}
/* Iron mine (2×2): terraced open pit (excavator on the floor, loaded haul truck on the ramp), steel headframe over the shaft
   with its winding house, an ore bin feeding a conveyor up to a rust-red stockpile, site office, light towers.
   Heights: pit < yard < trucks/office < winding house < conveyor < headframe deck (casts the long tower shadow). */
BART.mine = (p, st, f) => {
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const grad = (x0, y0, x1, y1, c0, c1) => ctx => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
  // smooth closed outline through points (quadratic curves through the mid-points)
  const smooth = pts => c => { const n = pts.length / 2, X = i => pts[(i % n) * 2], Y = i => pts[(i % n) * 2 + 1];
    c.moveTo((X(n - 1) + X(0)) / 2, (Y(n - 1) + Y(0)) / 2); for (let i = 0; i < n; i++) c.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2); c.closePath(); };
  // wobbly ellipse; rings drawn with the same seed stay parallel (pit terraces)
  const ring = (seed, amp) => { const r = RNG(seed), ph = [r() * TAU, r() * TAU, r() * TAU];
    const k = a => 1 + amp * (Math.sin(a * 2 + ph[0]) * 0.5 + Math.sin(a * 3 + ph[1]) * 0.32 + Math.sin(a * 5 + ph[2]) * 0.18);
    return { pt: (cx, cy, rx, ry, a0, a) => { const [x, y] = rot(Math.cos(a) * rx * k(a), Math.sin(a) * ry * k(a), a0); return [cx + x, cy + y]; },
      pts(cx, cy, rx, ry, a0, n) { const out = []; n = n || 32; for (let i = 0; i < n; i++) out.push(...this.pt(cx, cy, rx, ry, a0, i / n * TAU)); return out; } };
  };
  /* ---- 1. yard: rounded, slightly irregular plot of dusty ground stained red by ore ---- */
  const yard = []; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, ca = Math.cos(a), sa = Math.sin(a);
    const r = 31.4 / Math.pow(Math.pow(Math.abs(ca), 6) + Math.pow(Math.abs(sa), 6), 1 / 6) * (1 - 0.025 * (1 + Math.sin(a * 6 + 1.1) * 0.6 + Math.sin(a * 11 + 0.3) * 0.4)); yard.push(clamp(ca * r, -31.4, 31.4), clamp(sa * r, -31.4, 31.4)); }
  p.path(smooth(yard), M('#84715d', 0.02, { s: 0.03 }));
  { const r = RNG(12); for (let i = 0; i < 60; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 27, x = Math.cos(a) * d, y = Math.sin(a) * d, q = r();
    p.ell(x, y, r.range(2, 6.5), r.range(1.2, 3.4), r() * PI, AL(q < 0.45 ? `rgba(150,64,34,${r.range(0.08, 0.22)})` : q < 0.75 ? `rgba(40,30,22,${r.range(0.06, 0.13)})` : `rgba(226,196,152,${r.range(0.06, 0.13)})`)); } }
  /* ---- 2. open pit: spoil berm, five benches stepping down, muddy floor ---- */
  const PX = -9, PY = 7.5, PA = -0.38, RY = 0.86, R = ring(7, 0.08);
  const rim = R.pts(PX, PY, 19.6, 19.6 * RY, PA);
  for (const [w, h, col] of [[5.8, 0.05, '#7a634c'], [3.7, 0.085, '#857058'], [1.8, 0.12, '#937b60']]) p.spath(smooth(rim), w, M(col, h, { s: 0.02 })); // spoil berm ridge
  // wide sloping faces (shadowed on the north-west wall, sunlit on the south-east wall) between narrow bright benches
  const RX = [18.9, 14.9, 10.9, 6.9], HT = [0.08, 0.057, 0.035, 0.016], FW = 2.9, C = k => [PX + k * 0.75, PY + k * 0.5]; // ring centres drift: the deepest part is off-centre
  const FACE = [['#3a1b0e', '#c98351'], ['#341809', '#bd7648'], ['#2e1508', '#ad6940'], ['#281207', '#9b5b39']];
  const BENCH = [['#80603f', '#dcb385'], ['#77583a', '#d1a77b'], ['#6c4f35', '#c39a70'], ['#614731', '#b48d66']];
  for (let k = 0; k < RX.length; k++) { const [cx, cy] = C(k);
    p.path(smooth(R.pts(cx, cy, RX[k], RX[k] * RY, PA)), { c: grad(cx - 14, cy - 12, cx + 14, cy + 12, FACE[k][0], FACE[k][1]), h: HT[k] });
    const bx = cx + 0.4, by = cy + 0.28, br = RX[k] - FW; // bench: a flat ledge at the foot of the face
    p.path(smooth(R.pts(bx, by, br, br * RY, PA)), { c: grad(bx - 12, by - 10, bx + 12, by + 10, BENCH[k][0], BENCH[k][1]), h: HT[k] - 0.008 });
    const r = RNG(40 + k); for (let i = 0; i < 14; i++) { const rr = br - r() * 0.9; const [x, y] = R.pt(bx, by, rr, rr * RY, PA, r() * TAU); p.circ(x, y, r.range(0.22, 0.55), AL(r() < 0.5 ? 'rgba(60,28,16,0.4)' : 'rgba(240,200,150,0.3)')); } // loose rock on the ledge
  }
  { const [cx, cy] = C(4); p.path(smooth(R.pts(cx, cy, 4.6, 4.6 * RY, PA)), { c: grad(cx - 5, cy - 4, cx + 5, cy + 4, '#2a140b', '#8a4e33'), h: 0.005 });
    p.path(smooth(R.pts(cx + 0.3, cy + 0.3, 3.3, 3.3 * RY, PA)), M('#6d3e29', 0.0)); p.ell(cx - 1, cy + 1.2, 1.8, 1, 0.3, M('#3d4c55', 0.0, { s: 0.85 })); } // muddy floor + rain puddle
  for (let i = 0; i < 9; i++) { const [cx, cy] = C(1); const [x, y] = R.pt(cx + 0.4, cy + 0.28, RX[1] - FW - 0.5, (RX[1] - FW - 0.5) * RY, PA, -2.55 + i * 0.12); p.circ(x, y, 0.28, AL('rgba(25,14,8,0.85)')); } // blast-hole pattern on a bench
  /* ---- 3. haul ramp spiralling up from the floor to the east rim, then on toward the stockpile ---- */
  const ramp = []; for (let i = 0; i <= 14; i++) { const t = i / 14, a = -0.2 + t * 1.65, rr = 4.2 + t * 15.8, [cx, cy] = C(3.6 * (1 - t)); ramp.push(...R.pt(cx, cy, rr, rr * RY, PA, a)); }
  const exit = ramp.slice(-2); ramp.push(exit[0] + 5, exit[1] - 1.5, 13.5, 11.5);
  const rampPath = c => { c.moveTo(ramp[0], ramp[1]); for (let i = 2; i < ramp.length; i += 2) c.lineTo(ramp[i], ramp[i + 1]); };
  p.spath(rampPath, 4.4, AL('rgba(52,30,18,0.55)')); p.spath(rampPath, 3.3, AL('#b07b53'));
  for (const o of [-0.8, 0.8]) p.spath(c => { for (let i = 0; i < ramp.length; i += 2) { const j = Math.min(i, ramp.length - 4); const dx = ramp[j + 2] - ramp[j], dy = ramp[j + 3] - ramp[j + 1], L = Math.hypot(dx, dy) || 1; const x = ramp[i] - dy / L * o, y = ramp[i + 1] + dx / L * o; if (i) c.lineTo(x, y); else c.moveTo(x, y); } }, 0.4, AL('rgba(70,42,26,0.45)'));
  /* ---- 4. machines: excavator digging the north-west face, loaded haul truck climbing the ramp ---- */
  const YEL = '#e2a51e', YEL2 = '#c88d14', GLS = '#2b3a44';
  { const [ex, ey] = C(4); p.push(ex - 1.4, ey - 0.9, -0.5); // excavator
    for (const y of [-3, 1.5]) { p.rect(-3.4, y, 6.8, 1.5, M('#2a2926', 0.13), 0.55); for (let i = -3.1; i < 3.3; i += 0.85) p.rect(i, y + 0.15, 0.32, 1.2, HO(0.17)); }
    p.push(0, 0, PI + 0.35); p.rect(-2.5, -2.2, 5, 4.4, M(YEL, 0.3, { s: 0.35 }), 0.9); p.rect(-2.5, -2.2, 1.5, 4.4, M(YEL2, 0.33, { s: 0.3 }), 0.6);
    p.rect(0.5, -2, 1.7, 1.6, M(GLS, 0.37, { s: 0.9 }), 0.3); p.line([1.2, 0.9, 6.6, 0.9], 1.15, M('#d89a18', 0.42, { s: 0.3 })); p.line([6.6, 0.9, 8.7, 0.9], 0.85, M(YEL2, 0.36));
    p.rect(8.3, -0.5, 1.8, 2.7, M('#4b4844', 0.3, { s: 0.4 }), 0.45); p.pop(); p.pop(); }
  { const i = 18, x = ramp[i], y = ramp[i + 1], a = Math.atan2(ramp[i + 3] - ramp[i - 1], ramp[i + 2] - ramp[i - 2]); p.push(x, y, a); // haul truck
    for (const [wx, wy] of [[-3.5, -2.45], [-3.5, 2.45], [-1.5, -2.45], [-1.5, 2.45], [3.3, -2.45], [3.3, 2.45]]) p.rect(wx - 0.85, wy - 0.55, 1.7, 1.1, M('#1d1c1a', 0.14), 0.4);
    p.rect(-4.7, -2.35, 6.9, 4.7, M(YEL, 0.31, { s: 0.35 }), 0.7); p.rect(-4.15, -1.85, 5.8, 3.7, M('#7e3b24', 0.35), 0.8);
    { const r = RNG(9); for (let k = 0; k < 15; k++) p.circ(r.range(-3.9, 1.3), r.range(-1.5, 1.5), r.range(0.35, 0.7), M(r() < 0.5 ? '#a54d2c' : '#5e2a18', 0.38 + r() * 0.06)); }
    p.rect(2.5, -2.25, 2.7, 4.5, M('#e8ad27', 0.3, { s: 0.3 }), 0.6); p.rect(3.6, -1.95, 1.3, 1.8, M(GLS, 0.35, { s: 0.9 }), 0.25); p.pop(); }
  /* ---- 5. shaft collar + ore bin ---- */
  const HX = 16, HY = -17;
  p.rect(HX - 7, HY - 6.8, 14, 13.6, M('#8f897b', 0.06, { s: 0.05 }), 1.2); p.rect(HX - 6.2, HY - 6, 12.4, 12, AL('rgba(0,0,0,0.08)'), 1);
  p.rect(HX - 3.6, HY - 3.4, 7.2, 6.8, M('#15120f', 0.0)); for (let k = -2.6; k < 3; k += 1.3) p.line([HX - 3.4, HY + k, HX + 3.4, HY + k], 0.22, M('#5d5f61', 0.03, { s: 0.6 })); // shaft + grating
  p.rect(HX - 3, HY + 7.4, 6, 5.4, M('#6f7378', 0.44, { s: 0.45 }), 0.5); p.rect(HX - 2.2, HY + 8.2, 4.4, 3.8, M('#2a1a12', 0.36)); // ore bin
  { const r = RNG(14); for (let k = 0; k < 9; k++) p.circ(HX + r.range(-1.8, 1.8), HY + 8.5 + r.range(0, 3.2), r.range(0.3, 0.6), M(r() < 0.5 ? '#a54d2c' : '#6a3019', 0.4)); }
  /* ---- 6. ore stockpile (cone) fed by a conveyor on a trestle ---- */
  const SX = 19.5, SY = 18.6, SR = 8.6;
  p.path(smooth(ring(23, 0.06).pts(SX - 0.4, SY + 0.5, SR + 1.4, (SR + 1.4) * 0.9, 0.4)), M('#74402a', 0.02)); // spill apron
  p.circ(SX, SY, SR, { c: grad(SX - SR * 0.8, SY - SR * 0.8, SX + SR * 0.8, SY + SR * 0.8, '#d78c58', '#55271a'), h: 0.5, hr: [SX, SY, SR, 0.52, 0.02] });
  { const r = RNG(27); for (let i = 0; i < 110; i++) { const a = r() * TAU, d = Math.sqrt(r()) * SR * 0.96, x = SX + Math.cos(a) * d, y = SY + Math.sin(a) * d;
      const lit = clamp(0.5 - ((x - SX) + (y - SY)) / (SR * 2.2), 0, 1), c = rgb2hex(mixc('#4e2214', '#e09a62', clamp(lit * 0.85 + r.range(-0.18, 0.18), 0, 1)));
      p.circ(x, y, r.range(0.35, 0.95), M(c, 0.52 * (1 - d / SR) + 0.02 + r() * 0.02)); } }
  const cv = (x0, y0, x1, y1, h0, h1) => { const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
    for (let s = 2.5; s < L - 1; s += 4.6) { const x = x0 + ux * s, y = y0 + uy * s, h = lerp(h0, h1, s / L); p.line([x - nx * 2.3, y - ny * 2.3, x + nx * 2.3, y + ny * 2.3], 0.75, M('#5b5f64', h - 0.04, { s: 0.4 })); } // trestle bents
    p.line([x0, y0, x1, y1], 3.2, { c: '#5d6166', h: h1, hg: [x0, y0, h0, x1, y1, h1], s: 0.45 });
    p.line([x0, y0, x1, y1], 1.9, { c: '#1e1e1d', h: h1, hg: [x0, y0, h0 + 0.012, x1, y1, h1 + 0.012] });
    const r = RNG(31); for (let s = 1.4; s < L - 0.8; s += 1.05) { const x = x0 + ux * s + nx * r.range(-0.45, 0.45), y = y0 + uy * s + ny * r.range(-0.45, 0.45); p.circ(x, y, r.range(0.28, 0.5), M(r() < 0.5 ? '#ad5530' : '#6e321d', lerp(h0, h1, s / L) + 0.03)); }
    p.line([x0 + nx * 1.5, y0 + ny * 1.5, x1 + nx * 1.5, y1 + ny * 1.5], 0.22, { c: '#d4ae3c', h: h1, hg: [x0, y0, h0 + 0.03, x1, y1, h1 + 0.03], s: 0.4 }); // walkway handrail
  };
  cv(HX + 0.4, HY + 12.2, SX - 0.6, SY - 2.2, 0.44, 0.6);
  p.rect(SX - 1.8, SY - 3.4, 3.6, 2.4, M('#55595e', 0.6, { s: 0.4 }), 0.4); // head pulley housing over the pile
  /* ---- 7. winding house (hoist) with its ropes running up to the headframe ---- */
  const WX = -14, WY = -29.6, WW = 15, WH = 10.5;
  p.rect(WX - 0.6, WY - 0.2, WW + 1.2, WH + 0.8, M(shade(st.wall, -0.25), 0.36), 0.4);
  p.rect(WX, WY, WW, WH / 2, { c: st.roof2, h: 0.56, hg: [0, WY, 0.44, 0, WY + WH / 2, 0.58], s: 0.25 }); p.rect(WX, WY + WH / 2, WW, WH / 2, { c: shade(st.roof2, -0.12), h: 0.56, hg: [0, WY + WH / 2, 0.58, 0, WY + WH, 0.44], s: 0.25 });
  for (let x = WX + 1; x < WX + WW; x += 1.5) p.line([x, WY + 0.3, x, WY + WH - 0.3], 0.3, AL('rgba(0,0,0,0.16)'));
  p.line([WX + 0.3, WY + WH / 2, WX + WW - 0.3, WY + WH / 2], 0.6, M(shade(st.roof2, 0.12), 0.6, { s: 0.3 })); // ridge
  p.rect(WX + 2, WY + 1, 4.5, 1.6, M('#3f5866', 0.5, { s: 0.9 }), 0.2); p.rect(WX + 8.5, WY + 1, 4.5, 1.6, M('#3f5866', 0.5, { s: 0.9 }), 0.2); // skylights
  vent(p, WX + 3.5, WY + 7.8, 1.2, 0.5); vent(p, WX + 7.5, WY + 7.8, 1.2, 0.5); teamFlag(p, WX + 11, WY + 6.4, 2.6, 1.6);
  p.rect(WX + WW - 0.4, WY + 3.2, 1.6, 4.2, M('#2b2b29', 0.3), 0.3); // rope doors toward the headframe
  /* ---- 8. headframe: inclined back legs toward the hoist, sheave deck high over the shaft ---- */
  const legs = [[HX - 4, HY - 2.8, WX + WW + 4.2, WY + 3.5], [HX - 4, HY + 2.8, WX + WW + 5.2, WY + 9.5]];
  for (const [x0, y0, x1, y1] of legs) { p.line([x0, y0, x1, y1], 1.5, { c: '#4d5156', h: 1, hg: [x0, y0, 0.98, x1, y1, 0.1], s: 0.5 }); p.line([x0, y0, x1, y1], 0.5, { c: '#9a9ea3', h: 1, hg: [x0, y0, 1.0, x1, y1, 0.12], s: 0.7 }); p.rect(x1 - 1, y1 - 1, 2, 2, M('#7d786c', 0.08), 0.3); }
  for (let t = 0.25; t < 0.9; t += 0.25) { const ax = lerp(legs[0][0], legs[0][2], t), ay = lerp(legs[0][1], legs[0][3], t), bx = lerp(legs[1][0], legs[1][2], t), by = lerp(legs[1][1], legs[1][3], t); p.line([ax, ay, bx, by], 0.4, { c: '#6a6e73', h: 1, hg: [ax, ay, lerp(0.98, 0.1, t), bx, by, lerp(0.98, 0.1, t)], s: 0.5 }); } // braces
  for (const [x, y] of [[HX - 4, HY - 3.6], [HX + 4, HY - 3.6], [HX - 4, HY + 3.6], [HX + 4, HY + 3.6]]) p.rect(x - 1, y - 1, 2, 2, M('#77736a', 0.1), 0.3); // leg footings
  for (const s of [-1, 1]) p.line([HX - 3, HY + s * 1.6, WX + WW + 0.4, WY + 5.3 + s * 0.8], 0.28, { c: '#1a1b1c', h: 1, hg: [HX - 3, 0, 1.02, WX + WW, 0, 0.36] }); // hoist ropes
  p.rect(HX - 4.6, HY - 4, 9.2, 8, M('#5a5e63', 1.0, { s: 0.55 }), 0.4); p.rect(HX - 3.9, HY - 3.3, 7.8, 6.6, M('#3e4246', 0.97, { s: 0.45 }), 0.3);
  p.line([HX - 4.2, HY - 3.6, HX + 4.2, HY + 3.6], 0.38, M('#8f9398', 1.02, { s: 0.7 })); p.line([HX + 4.2, HY - 3.6, HX - 4.2, HY + 3.6], 0.38, M('#8f9398', 1.02, { s: 0.7 }));
  p.rect(HX - 4.6, HY - 4, 9.2, 0.5, M('#d4ae3c', 1.03, { s: 0.4 })); p.rect(HX - 4.6, HY + 3.5, 9.2, 0.5, M('#d4ae3c', 1.03, { s: 0.4 })); // handrails
  for (const dy of [-1.6, 1.6]) { const x = HX + 0.3, y = HY + dy; // sheave wheels
    p.ell(x, y, 3.5, 1.25, 0, M('#1f2022', 1.08)); p.ell(x, y, 2.85, 0.85, 0, M('#b8312a', 1.1, { s: 0.6 })); p.ell(x, y, 2.2, 0.5, 0, M('#2a2b2d', 1.11));
    for (let k = 0; k < 6; k++) { const a = k / 6 * PI; p.line([x - Math.cos(a) * 2.2, y - Math.sin(a) * 0.5, x + Math.cos(a) * 2.2, y + Math.sin(a) * 0.5], 0.22, M('#9a9ea3', 1.12, { s: 0.6 })); }
    p.circ(x, y, 0.45, M('#d6d8da', 1.13, { s: 0.8 })); }
  /* ---- 9. site office, fuel tank, pickup, barrels, light towers ---- */
  p.rect(-27, -19, 10.5, 7.5, M(shade(st.wall, -0.2), 0.3), 0.4); block(p, -26.4, -18.4, 9.3, 6.3, st, 0.34, 'flat', st.roof); acUnit(p, -23.6, -16.4, 0.36); p.rect(-20.6, -17.6, 2.6, 1.6, M('#3f5866', 0.38, { s: 0.9 }), 0.2);
  p.rect(-27, -11.1, 10.5, 1.1, M(st.trim || '#d8b23a', 0.32), 0.3); // awning stripe
  { p.push(-6.5, -15.2, 0.1); p.rect(-3.7, -2, 7.4, 4, M('#1b1b19', 0.1), 1.1); p.rect(-3.5, -1.8, 7, 3.6, fpaint(f, 0.34), 0.9); p.rect(0, -1.55, 1.6, 3.1, M(GLS, 0.4, { s: 0.9 }), 0.3); p.rect(-3.1, -1.35, 2.6, 2.7, M('#3a3b36', 0.36), 0.3); p.pop(); } // site pickup
  for (let i = 0; i < 5; i++) { const x = -15.2 + (i % 3) * 1.5, y = -11.3 + Math.floor(i / 3) * 1.5; p.circ(x, y, 0.68, M(i % 2 ? '#4a5a63' : '#5b5e4d', 0.15, { s: 0.3 })); p.circ(x, y, 0.28, HO(0.17)); } // oil drums
  const tower = (x, y, a) => { p.push(x, y, a); p.rect(-1.5, -1.5, 3, 3, M('#77736a', 0.05), 0.4); // light mast: only the lamp head is seen from above, the mast shows in its shadow
    p.rect(-0.9, -1.6, 1.8, 3.2, M('#3a3c3e', 0.9, { s: 0.4 }), 0.3); for (const [u, v] of [[-0.35, -0.8], [-0.35, 0.8], [-0.35, 0], [0.4, -0.4], [0.4, 0.4]]) p.circ(u, v, 0.32, M('#ffeab0', 0.92, { e: 0.85 })); p.pop(); };
  tower(-26.4, 4, 0.25); tower(27.6, 5.5, 3.0);
  p.grain(0.12);
};
BART.partsdep = (p, st, f) => { // warehouse hall + yard of crates and pallets
  pad(p, 92, 92, st, { grid: 23 }); block(p, -40, -40, 52, 46, st, 0.7, 'flat', st.roof2); for (let i = 0; i < 5; i++) p.rect(-36 + i * 10, -36, 6, 38, M('#00000000', 0.72, { s: 0.2 }));
  for (let y = 14; y < 40; y += 9) for (let x = -38; x < 38; x += 10) p.rect(x, y, 7, 6, M((x + y) % 3 ? '#8a6a3e' : '#5d6b4a', 0.3 + ((x * 7 + y) % 5) * 0.03), 0.5);
  p.rect(18, -38, 20, 30, M('#d8b23a', 0.25), 1); for (let y = -34; y < -10; y += 6) p.line([20, y, 36, y], 0.4, AL('rgba(0,0,0,0.3)')); p.grain(0.1);
};
function cityArt(p, L) { // World-Conqueror-4-style town: terracotta roofs, white walls, plaza, landmark; grows with its level
  const st = Object.assign({}, BSTYLE.neu, { pad: '#cfc8b4', wall: '#ece6d6', roof: '#b9553b', roof2: '#a4472f' }); const r = RNG(31 + L);
  pad(p, 124, 124, st, { grid: 0 }); p.rect(-62, -3, 124, 6, M('#7d7a72', 0.02)); p.rect(-3, -62, 6, 124, M('#7d7a72', 0.02));
  if (L >= 2) { for (const [x, y, w, h] of [[-62, -62, 124, 3], [-62, 59, 124, 3], [-62, -62, 3, 124], [59, -62, 3, 124]]) p.rect(x, y, w, h, M('#b5aa90', 0.32)); for (const [x, y] of [[-60, -60], [60, -60], [-60, 60], [60, 60]]) p.circ(x, y, 5, M('#c2b79c', 0.45)); }
  const roofs = ['#b9553b', '#c4683f', '#a4472f', '#5f7486', '#c9774a'];
  const slots = []; for (let gy = -52; gy <= 34; gy += 18) for (let gx = -52; gx <= 34; gx += 18) { if (Math.abs(gx + 9) < 14 && Math.abs(gy + 9) < 14) continue; slots.push([gx, gy]); }
  const n = [10, 16, 22][L - 1]; for (let i = 0; i < n && slots.length; i++) { const [x, y] = slots.splice(r.int(0, slots.length - 1), 1)[0]; const w = r.int(11, 15), h = r.int(10, 14); block(p, x + 2, y + 2, w, h, Object.assign({}, st, { tile: 1 }), 0.32 + r() * 0.15, 'tile', roofs[r.int(0, roofs.length - 1)]); }
  p.circ(0, 0, 13, M('#d9d2bf', 0.05)); p.circ(0, 0, 4, M('#3d9fc4', 0.1)); // plaza + fountain
  if (L === 1) block(p, 10, -24, 12, 16, st, 0.6, 'tile', '#8a3f2c');
  if (L >= 2) { p.circ(-22, -22, 8, M('#c9c3b4', 0.7)); p.circ(-22, -22, 5.5, M('#6aa7b8', 0.85, { s: 0.6 })); }
  if (L >= 3) { block(p, 16, 14, 18, 18, st, 0.95, 'flat', '#8f9599'); block(p, -38, 16, 14, 20, st, 0.85, 'flat', '#7d8a96'); p.circ(25, 23, 3, M('#c9a24a', 1)); }
  p.grain(0.08);
}
BART.city = (p, st, f) => cityArt(p, 1);
const WC4_ROOF = [{ wall: '#ece6d6', roof: '#b9553b', roof2: '#a4472f', pad: '#c9c2ae' }, { wall: '#efe9da', roof: '#c4683f', roof2: '#b05834', pad: '#cfc8b4' }, { wall: '#e6e1d2', roof: '#5f7486', roof2: '#4f6272', pad: '#c4bfae' }];
const CIV = {
  house: { n: 'منازل سكنية', w: 2, h: 2, cost: 400, pop: 24, power: -1, water: -1, lvl: 0, works: { dig: 3, frame: 3, pour: 3, finish: 3 }, cat: 'res', d: 'مساكن عائلية صغيرة.' },
  villa: { n: 'فلل فاخرة', w: 3, h: 3, cost: 1100, pop: 30, power: -2, water: -2, lvl: 1, happy: 2, works: { dig: 4, frame: 4, pour: 5, finish: 6 }, cat: 'res', d: 'تجذب الأثرياء وترفع الرضا قليلاً.' },
  apart: { n: 'عمارة سكنية', w: 3, h: 3, cost: 1600, pop: 120, power: -3, water: -3, lvl: 1, works: { dig: 6, frame: 10, pour: 8, finish: 6 }, cat: 'res', d: 'تسكن 120 نسمة.' },
  tower: { n: 'برج سكني', w: 3, h: 3, cost: 4200, pop: 380, power: -6, water: -5, lvl: 2, works: { dig: 10, frame: 22, pour: 16, finish: 10 }, tall: 1, cat: 'res', d: 'ناطحة سحاب تسكن 380 نسمة.' },
};

function bakeCivil(f, list) {
  const st = BSTYLE[f]; list = list || Object.keys(CIV);
  for (const t of list) {
    const b = CIV[t], key = f + '_civ_' + t; if (ATLAS.has(key)) continue; const W = b.w * 32, H = b.h * 32;
    const cst = t === 'house' || t === 'villa' ? Object.assign({}, st, WC4_ROOF[(t.length + f.length) % WC4_ROOF.length]) : Object.assign({}, st, { wall: '#e2ddd0', roof2: '#7d8a96' }); // WC4-style towns: white walls, terracotta / slate roofs
    bake(key, W, H, W / 2, H / 2, S_BLD * (b.w >= 6 ? 0.85 : 1), p => CART[t](p, cst, f), { Hmax: b.tall ? 16 : 10, dust: 0.04, soft: 0.5, aoR: 2.4, ao: 2.2, castH: b.tall ? 60 : b.w >= 4 ? 18 : 12, shK: 0.45, wc4: 2 });
    bake(key + ':ruin', W, H, W / 2, H / 2, S_BLD * 0.5, p => CART[t](p, st, f), { Hmax: 6, burnt: 1 });
    bakeConstruction(b.w, b.h);
  }
}
