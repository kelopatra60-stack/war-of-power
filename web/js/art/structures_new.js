/* ============================================================
   War of Power — رسومات المنشآت الإضافية (بئر نفط، رادار، وقود، دفاع جوي)
   الملف: js/art/structures_new.js   ·   ترتيب التحميل: 14 من 43
   ============================================================ */
'use strict';
/* ===== New structures: oil-well pump jack, domed radar station, fuel farm, point-defence sites, real SAM launchers ===== */
function octagon(r, rot) { const pts = []; for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU + (rot || 0); pts.push(Math.cos(a) * r, Math.sin(a) * r); } return pts; }
function hesco(p, x, y, r, hgt) { const n = Math.max(8, Math.round(TAU * r / 3.2)); for (let i = 0; i < n; i++) { const a = i / n * TAU; const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r; p.push(cx, cy, a); p.rect(-1.5, -1.45, 3, 2.9, M('#a8946c', hgt || 0.34, { s: 0.02 }), 0.25); p.rect(-1.5, -1.45, 3, 0.25, AL('rgba(60,55,40,0.35)')); p.pop(); } }
// --- oil well: pump jack on a gravel pad, wellhead, flowline, round stock tank ---
// --- radar station: geodesic radome on a ring wall, rotating surveillance antenna, shelters, generator ---
BART.radar = (p, st, f) => {
  { p.poly(octagon(47), M(st.pad, 0.04, { s: 0.04 })); p.poly(octagon(44), M(shade(st.pad, -0.05), 0.05)); for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU; p.line([Math.cos(a) * 44, Math.sin(a) * 44, Math.cos(a) * 31, Math.sin(a) * 31], 0.3, AL('rgba(0,0,0,0.1)')); } }
  const rx = -7, ry = -5, R0 = 25;
  p.circ(rx, ry, R0 + 2.4, M('#8f8e88', 0.3, { s: 0.1 })); p.circ(rx, ry, R0 + 1.2, M('#a3a29b', 0.34));
  dome(p, rx, ry, R0, '#f0efe9', 0.42, 1.0, { s: 0.38 });
  for (let k = 1; k < 4; k++) p.spath(c => c.arc(rx, ry, R0 * k / 4, 0, TAU), 0.16, AL('rgba(0,0,0,0.07)')); // geodesic panelling
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; p.line([rx + Math.cos(a) * R0 * 0.25, ry + Math.sin(a) * R0 * 0.25, rx + Math.cos(a) * R0 * 0.98, ry + Math.sin(a) * R0 * 0.98], 0.14, AL('rgba(0,0,0,0.07)')); }
  for (let i = 0; i < 10; i++) { const a = (i + 0.5) / 10 * TAU; p.line([rx + Math.cos(a) * R0 * 0.5, ry + Math.sin(a) * R0 * 0.5, rx + Math.cos(a + 0.31) * R0 * 0.75, ry + Math.sin(a + 0.31) * R0 * 0.75], 0.12, AL('rgba(0,0,0,0.06)')); }
  p.circ(rx, ry - R0 * 0.02, 1.4, M('#d8261e', 1.02, { e: 0.6 })); // aircraft warning light
  p.circ(28, -28, 5.2, M('#7d7c75', 0.42)); p.circ(28, -28, 3.6, M('#5f5e58', 0.5)); // antenna pedestal
  { block(p, 16, 14, 24, 16, st, 0.44, 'flat', st.roof2); for (let i = 0; i < 3; i++) acUnit(p, 20 + i * 7, 18, 0.46); p.rect(16, 27, 24, 1.4, M('#ddd', 0.46, { t: 1 })); // operations shelter
    p.rect(-38, 24, 14, 9, M('#5d6058', 0.36, { s: 0.3 }), 0.6); grille(p, -36.6, 25.4, 4, 6.2, 4); p.circ(-28, 26.6, 1, M('#2a2a28', 0.4)); // generator
    pipeRun(p, [-24, 28, -10, 28, -10, 20], 0.7, 0.1, '#3e3f3a'); pipeRun(p, [16, 22, 6, 22, 6, 18], 0.7, 0.1, '#3e3f3a'); mast(p, 38, 38, 0.9, 6); lamp(p, -40, -40); flag(p, -40, 34, 0.4); }
  p.grain(0.1);
};
// --- fuel depot: two big cylindrical tanks inside an earth containment bund, pump house, truck loading rack ---
// --- point-defence site base: HESCO ring, mount pad and the system's own sensor / power ---
BART.shorad = (p, st, f) => {
  p.path(c => blobPath(c, 30, 12, 0.06, 91), M(st.pad, 0.03, { s: 0.03 })); hesco(p, 0, 0, 23, 0.36);
  p.circ(0, 0, 12, M('#8c8a82', 0.12)); p.circ(0, 0, 10, M('#7b7970', 0.14));
  if (f === 'usa') { p.rect(-12, -3, 24, 6, M('#3b3c37', 0.16), 0.5); for (const x of [-9, 9]) p.rect(x - 1.5, -5.5, 3, 11, M('#2c2d29', 0.18), 0.5); p.rect(14, 12, 10, 7, M('#5d6058', 0.3, { s: 0.3 }), 0.5); } // Centurion trailer + generator
  else if (f === 'eu' || f === 'arb') { p.rect(12, -24, 12, 10, fpaint(f, 0.4), 0.6); p.circ(18, -19, 3.6, M('#c9c6bb', 0.5, { s: 0.4 })); p.circ(18, -19, 1.2, M('#3d4037', 0.54)); } // fire-control radar unit
  else { p.rect(12, 14, 13, 9, fpaint(f, 0.34), 0.5); grille(p, 13.4, 15.4, 4, 6, 4); }
  p.rect(-25, -25, 8, 2, M('#ddd', 0.3, { t: 1 })); p.grain(0.12);
};
// --- long-range SAM site base: revetted pad, radar / command vehicles, cable runs (launcher drawn as the turret) ---
BART.sam = (p, st, f) => {
  pad(p, 94, 94, st, { grid: 47 }); p.circ(0, 0, 28, M('#8a8475', 0.1)); p.circ(0, 0, 24, M('#9b9888', 0.06));
  for (const [a0, a1] of [[0.4, 1.2], [2.0, 2.8], [3.6, 4.4]]) p.spath(c => c.arc(0, 0, 33, a0, a1), 4, M('#8f8166', 0.32, { s: 0.02 })); // earth revetments
  // engagement radar vehicle (phased array facing out) + command shelter + generator
  if (f === 'usa' || f === 'arb') { p.rect(20, 18, 22, 11, fpaint(f, 0.4), 0.8); p.rect(38, 15, 3.4, 17, M('#2e3335', 0.62, { s: 0.6 }), 0.4); p.rect(38.6, 16, 2, 15, M('#46524f', 0.66, { s: 0.85 })); }
  else { p.rect(20, 20, 20, 10, fpaint(f, 0.4), 0.8); p.rect(30, 14, 12, 6, M('#2e3335', 0.6, { s: 0.6 }), 0.4); }
  block(p, -42, 22, 16, 18, st, 0.36, 'flat', st.roof2); p.rect(-42, 40, 16, 1.4, M('#ddd', 0.38, { t: 1 })); p.rect(26, -42, 14, 9, M('#5d6058', 0.32, { s: 0.3 }), 0.6); grille(p, 27.4, -40.6, 4, 6, 4);
  pipeRun(p, [-26, 30, -12, 30, -6, 20], 0.7, 0.08, '#3e3f3a'); pipeRun(p, [20, 24, 10, 18], 0.7, 0.08, '#3e3f3a'); antenna(p, -32, 30, 0.6); p.grain(0.12);
};
// real launchers on the SAM site (vertical-launch systems stand still: SAM_VLS)
const SAM_VLS = { rus: 1, chn: 1, eu: 1 };
function samLauncherArt(p, f) {
  if (f === 'usa' || f === 'arb') { // Patriot launching station: trailer, generator, 4 canisters raised at 38° (muzzles visible); PAC-2 single round / PAC-3 four-pack
    p.rect(-17, -6.4, 30, 12.8, M('#2f302b', 0.3), 0.6); for (const [x, y] of [[-15, -8], [-15, 8], [11, -8], [11, 8]]) jack(p, x, y); p.rect(8, -5.6, 7, 11.2, fpaint(f, 0.56), 0.6); grille(p, 9, -4, 4, 8, 4); // trailer + EPP generator
    rams(p, -11, -4, [-5.6, 5.6], 0.7);
    for (const y of [-5.4, 0.2]) { podTop(p, -15, y, 12.6, 5.2, f, { tubes: f === 'usa' ? 2 : 1, straps: 3, h: 0.98, col: f === 'arb' ? '#b8ad8e' : null }); podFace(p, -2.4, y, 3.4, 5.2, f === 'usa' ? 2 : 1, 2, { h: 1.04, caps: f === 'usa' ? '#d8d2bf' : '#cfc8b2' }); }
    teamFlag(p, -15.6, -1.3, 1.2, 2.6);
  } else if (f === 'rus' || f === 'chn') { // S-400 5P85TE2 / HQ-9 TEL: four transport-launch tubes erected vertical behind the tractor
    p.rect(-17, -5.6, 32, 11.2, fpaint(f, 0.42), 0.8); p.rect(9, -5.4, 7, 10.8, fpaint(f, 0.6), 0.8); p.rect(14.6, -4.4, 1.2, 8.8, M(GLASS, 0.66, { s: 0.9 })); // chassis + cab
    for (const [x, y] of [[-14, -7.4], [-14, 7.4], [4, -7.4], [4, 7.4]]) jack(p, x, y); p.rect(-12, -1.2, 18, 2.4, M('#3a3b35', 0.6)); // erector
    for (const [x, y] of [[-11.6, -3.1], [-11.6, 3.1], [-5.4, -3.1], [-5.4, 3.1]]) { p.circ(x, y, 3.0, M(f === 'rus' ? '#55603f' : '#5c6447', 1.0, { s: 0.2 })); p.circ(x, y, 2.4, M('#c8c3b0', 1.04, { s: 0.3 })); p.circ(x, y, 0.7, M('#3a3a34', 1.06)); } // tube tops with caps
    teamFlag(p, -16, -1.3, 1.2, 2.6);
  } else if (f === 'eu') { // SAMP/T Mamba: eight Aster canisters standing up on the launcher truck
    p.rect(-17, -5.4, 32, 10.8, fpaint(f, 0.42), 0.8); p.rect(9, -5.2, 7, 10.4, fpaint(f, 0.6), 0.8); p.rect(14.6, -4.2, 1.2, 8.4, M(GLASS, 0.66, { s: 0.9 }));
    for (const [x, y] of [[-14, -7.2], [-14, 7.2], [4, -7.2], [4, 7.2]]) jack(p, x, y);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) { const x = -13.4 + i * 3.4, y = -3.6 + j * 4; p.rect(x, y, 3, 3.4, M('#7c8068', 1.0, { s: 0.25 }), 0.3); p.circ(x + 1.5, y + 1.7, 1.05, M('#dcd8c8', 1.05, { s: 0.3 })); }
    teamFlag(p, -16, -1.3, 1.2, 2.6);
  } else { // S-125 Pechora (captured): four two-stage missiles on the rotating launcher beam
    p.circ(0, 0, 5.4, M('#3d3f36', 0.5)); p.rect(-4, -6.6, 8, 13.2, M('#4a4c40', 0.72), 0.6);
    for (const y of [-5.4, -1.8, 1.8, 5.4]) { cyl(p, -12, 8, y, 0.85, '#d4d0c2', 0.86, 1.0); cyl(p, -15, -11.4, y, 1.15, '#7e8270', 0.86, 0.98); p.path(c => { c.moveTo(8, y - 0.85); c.lineTo(10.6, y); c.lineTo(8, y + 0.85); c.closePath(); }, M('#cfcbbd', 1.0)); for (const s of [-1, 1]) p.line([-14.6, y + s * 1.1, -15.8, y + s * 1.9], 0.3, M('#6f7262', 0.96)); }
    teamFlag(p, -2.6, -1, 1, 2);
  }
  p.grain(0.12);
}
// point-defence mounts (rotate): Phalanx / Pantsir / Type 1130 / Skyshield / Oerlikon twin 35 / ZU-23
function shoradArt(p, f) {
  if (f === 'usa') { p.circ(0, 0, 4.8, M('#8d8f88', 0.6)); p.rect(-3.4, -3.2, 6.4, 6.4, M('#c9c9c2', 0.8, { s: 0.4 }), 1.2); dome(p, -1.6, 0, 3.6, '#eeede8', 0.86, 1.08, { s: 0.45 }); p.rect(-2.4, -0.7, 1.8, 1.4, M('#2f3133', 1.1, { s: 0.6 })); // radome + search antenna
    cyl(p, 1.6, 11.4, 0, 1.0, '#45463f', 0.86, 0.98); p.rect(9.2, -1.15, 1.6, 2.3, M('#2b2c28', 0.98)); for (const dy of [-0.5, 0, 0.5]) p.line([10.8, dy, 12.2, dy], 0.22, M('#1d1d1b', 0.96)); p.rect(0.6, 2.6, 2.6, 1.8, M('#33373a', 0.9, { s: 0.6 })); } // 6-barrel 20 mm + FLIR
  else if (f === 'chn') { p.circ(0, 0, 5, M('#7d8078', 0.6)); p.poly([4, -3.4, 2.6, -4.4, -4, -4.4, -4.8, -3, -4.8, 3, -4, 4.4, 2.6, 4.4, 4, 3.4], M('#9a9d96', 0.84, { s: 0.3 })); p.rect(-4.2, -2.4, 3, 4.8, M('#c6c8c2', 0.92, { s: 0.4 }), 0.6); cyl(p, 3, 12.6, 0, 1.3, '#43443e', 0.86, 0.98); p.rect(10.4, -1.4, 1.8, 2.8, M('#2b2c28', 0.98)); p.rect(-1, 4.4, 3, 1.8, M('#2c3133', 0.9, { s: 0.6 })); } // 11-barrel 30 mm
  else if (f === 'rus') { p.rect(-4.2, -2.6, 8.4, 5.2, fpaint(f, 0.9), 0.6); p.rect(3.6, -2, 1.2, 4, M('#2c3133', 1.0, { s: 0.6 })); for (const s of [-1, 1]) { for (let i = 0; i < 2; i++) canister(p, -3.6, s * (3.2 + i * 1.0), 8.2, 0.9, '#475038', 0.9, true); gunPod(p, -3.2, s * 5.6, 4.4, 1.2, f, 5, 0.45, true); } }
  else if (f === 'eu') { p.circ(0, 0, 4.6, M('#6f7266', 0.6)); facet(p, [3.6, -2.6, 2.4, -3.8, -3.6, -3.8, -4.4, -2.6, -4.4, 2.6, -3.6, 3.8, 2.4, 3.8, 3.6, 2.6], f, 0.86, 0.64, 1.2); autoBarrel(p, 3.4, 0, 9, 0.9); p.rect(11.2, -0.8, 1.2, 1.6, M('#2b2c28', 0.96)); p.rect(-2, -1.4, 2.8, 2.8, M('#3c3d37', 0.94)); }
  else if (f === 'arb') { p.circ(0, 0, 4.6, M('#6f6c60', 0.6)); p.rect(-3.6, -2.4, 6, 4.8, fpaint(f, 0.82), 0.6); for (const s of [-1, 1]) { p.rect(-2.6, s * 3.6 - 0.9, 5.6, 1.8, fpaint(f, 0.9), 0.4); autoBarrel(p, 3, s * 3.6, 9.4, 0.8); p.rect(11.6, s * 3.6 - 0.55, 1.1, 1.1, M('#2b2c28', 0.96)); } }
  else { p.circ(0, 0, 3.2, M('#45473b', 0.6)); p.rect(-1.6, -2.4, 3.4, 4.8, M('#5d604f', 0.84), 0.5); for (const s of [-1, 1]) { p.rect(-0.6, s * 2.8 - 0.8, 2.4, 1.6, M('#4d5a3a', 0.9), 0.3); autoBarrel(p, 1.8, s * 0.8, 9, 0.55); p.rect(10, s * 0.8 - 0.4, 1.3, 0.8, M('#2b2b28', 0.82)); } p.rect(-3.4, -1.6, 1.6, 3.2, M('#2e2a20', 0.82), 0.5); }
  teamFlag(p, -3.8, -0.9, 0.9, 1.8); p.grain(0.12);
}
function bakeNewParts(f) {
  bake(f + '_shorad:tur', 30, 24, 13, 12, S_VEH, p => shoradArt(p, f), { Hmax: 3, weather: 0.6 });
  bake('radar:ant', 10, 34, 5, 17, S_VEH, p => { p.rect(-1.2, -15.5, 2.4, 31, M('#4b4e48', 0.95, { s: 0.3 }), 0.5); p.rect(-0.8, -15, 1.6, 30, M('#5f645d', 1.0, { s: 0.5 })); for (let y = -14; y < 15; y += 1.6) p.line([-0.8, y, 0.8, y], 0.12, AL('rgba(0,0,0,0.35)')); p.line([0, 0, 3.6, 0], 0.7, M('#3a3b36', 0.9)); p.rect(3.2, -1, 1.6, 2, M('#2c2d29', 0.95)); }, { Hmax: 2 });
}
// oil-field ground stain (drawn under everything that stands on the field)