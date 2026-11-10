/* ============================================================
   War of Power — رسومات القوات الخاصة الخيالية
   الملف: js/art/units_fx.js   ·   يُحمَّل بعد js/art/units_ext.js
   ============================================================ */
'use strict';
/* Seven fantasy machines drawn with the same painter as the real vehicles: gunmetal frames, the nation's camouflage
   on the armour plates (so each nation's copy still looks like its army), and glowing energy parts (emissive `e`).
   Hover craft float on light (no wheels / tracks), walkers get two extra hull frames (`:walk1`, `:walk2`) that
   js/ui/draw.js alternates while they move. Only the troops a player can field are baked (FX_NEED, set in js/main.js). */
let FX_NEED = null; // { faction: { role: 1 } } — filled before the atlas is built
const FXC = { gun: '#2c3038', gun2: '#3a3f48', gun3: '#4b525c', red: '#ff5040', blue: '#59c8ff', green: '#6dff8a', amber: '#ffb347', ice: '#9fd8ff', violet: '#c27bff' };
const fxGlow = (c, h, e) => M(c, h, { e: e === undefined ? 0.9 : e });
/* ---------- exosuit trooper (infantry frames: 0-3 walk · 4 fire · 5 aim · -1 portrait) ---------- */
function exoFrame(p, f, frame) {
  const walk = frame >= 0 && frame < 4 ? [0, 1, 0, -1][frame] : 0; const fire = frame === 4 || frame === 5; const rec = frame === 5 ? -0.5 : 0;
  const plate = fpaint(f, 0.62), dark = M(FXC.gun, 0.5, { s: 0.4 });
  if (walk) { p.ell(1.8 * walk, -1.75, 2.0, 1.0, 0, M('#23262b', 0.3)); p.ell(-1.8 * walk, 1.75, 2.0, 1.0, 0, M('#23262b', 0.3)); }
  p.rect(-5.5, -2.6, 3.1, 5.2, dark, 0.8); p.rect(-5.1, -1.9, 0.9, 3.8, fxGlow(FXC.blue, 0.7)); p.rect(-3.8, -1.9, 0.9, 3.8, fxGlow(FXC.blue, 0.7)); // power pack
  p.ell(-0.6, 0, 2.95, 4.45, 0, M('rgba(14,16,20,0.6)', 0.3)); p.ell(-0.6, 0, 2.65, 4.15, 0, M(FXC.gun2, 0.6, { s: 0.5 }));
  p.rect(-2.2, -2.4, 3.6, 4.8, plate, 1.0); p.circ(0.2, 0, 0.75, fxGlow('#7fd8ff', 0.8, 1));
  for (const s of [-1, 1]) { p.ell(-0.8, s * 3.45, 1.95, 1.5, 0, Object.assign(fpaint(f, 0.72), { hr: [-1.2, s * 3.1, 1.9, 0.82, 0.6] })); p.rect(-1.8, s * 3.45 - 0.35, 1.8, 0.7, M('#d0d0d0', 0.75, { t: 1 }), 0.2); }
  const wx = 0.8 + rec;
  p.line([-0.8, 3.2, wx + 1.6, 1.4], 1.5, M('#30343b', 0.62)); p.line([-0.8, -3.2, wx + 3.4, 0.5], 1.5, M('#30343b', 0.62));
  p.rect(wx - 0.8, 0.0, 6.4, 1.5, M('#25282e', 0.85, { s: 0.5 }), 0.4); for (let k = 0; k < 3; k++) p.rect(wx + 1.6 + k * 1.1, 0.15, 0.5, 1.2, fxGlow(FXC.blue, 0.9, 0.8));
  p.rect(wx + 5.4, 0.3, 1.4, 0.9, M('#1b1d21', 0.9), 0.3); p.circ(wx + 1.6, 1.4, 0.7, M('#30343b', 0.75)); p.circ(wx + 3.4, 0.5, 0.7, M('#30343b', 0.75));
  dome(p, 0.4, 0, 1.75, '#3c424b', 0.85, 1.0, { s: 0.6 });
  p.path(c => { c.moveTo(2.0, -1.0); c.quadraticCurveTo(2.55, 0, 2.0, 1.0); c.lineTo(1.3, 0.8); c.quadraticCurveTo(1.6, 0, 1.3, -0.8); c.closePath(); }, fxGlow('#7fe0ff', 1.0, 1));
  if (fire) { p.circ(wx + 7.3, 0.75, 1.0, fxGlow('#a8e8ff', 0.95, 1)); p.circ(wx + 7.3, 0.75, 0.5, fxGlow('#ffffff', 1, 1)); }
}
function exoDead(p, f) {
  p.line([-5, 0, 3, 0], 4.6, M(FXC.gun2, 0.42)); p.rect(-2.2, -2.2, 3.6, 4.4, fpaint(f, 0.46), 0.8); p.line([-5, -1.2, -9, -2.6], 1.8, M('#2a2e34', 0.36)); p.line([-5, 1.2, -9, 2.8], 1.8, M('#2a2e34', 0.36));
  p.line([1, -2.2, 3.4, -5.2], 1.5, M('#30343b', 0.4)); p.line([1, 2.2, 4.6, 3.6], 1.5, M('#30343b', 0.4)); p.circ(4.6, 0, 2.0, M('#3c424b', 0.55)); p.rect(5.6, -0.8, 0.7, 1.6, M('#3a5560', 0.6));
}
{ // route the trooper through the shared infantry painters (portraits in js/ui/icons.js use them too)
  const inf0 = infantryFrame, dead0 = infantryDead;
  infantryFrame = function (p, f, role, frame, vi) { if (role === 'fxexo') return exoFrame(p, f, frame); return inf0(p, f, role, frame, vi); };
  infantryDead = function (p, f, role, vi) { if (role === 'fxexo') return exoDead(p, f); return dead0(p, f, role, vi); };
}
/* ---------- walkers: legs drawn into the hull, phase 0 standing · 1 / 2 the two halves of the stride ---------- */
function spiderLegs(p, ph) {
  const L = [[7, 1], [0.5, -1], [-6, 1]];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x0 = L[i][0], grp = L[i][1] * s; const sh = ph ? (ph === 1 ? grp : -grp) * 2.4 : 0;
    const hx = x0 * 0.7, hy = s * 4.2, kx = x0 * 1.1 + sh * 0.6, ky = s * 10.4, fx = x0 * 1.3 + sh, fy = s * 13.2;
    p.line([hx, hy, kx, ky], 1.7, M(FXC.gun, 0.6, { s: 0.6 })); p.line([hx, hy, kx, ky], 0.65, M(FXC.gun3, 0.68, { s: 0.7 }));
    p.line([kx, ky, fx, fy], 1.15, M('#2a2e34', 0.42, { s: 0.5 }));
    p.circ(kx, ky, 1.2, M('#3b4149', 0.76, { s: 0.6 })); p.circ(kx, ky, 0.5, fxGlow(FXC.amber, 0.84));
    p.circ(fx, fy, 0.85, M('#22252a', 0.3));
  }
}
function titanLegs(p, f, ph) {
  const st = ph === 1 ? 1 : ph === 2 ? -1 : 0;
  for (const s of [-1, 1]) {
    const fx = s * st * 4.2, fy = s * 9.4;
    p.line([0, s * 6.2, fx * 0.5, fy], 3.6, M(FXC.gun, 0.55, { s: 0.6 }));
    p.poly([fx + 11.2, fy - 3, fx + 12.6, fy, fx + 11.2, fy + 3, fx - 4.6, fy + 2.6, fx - 5.8, fy, fx - 4.6, fy - 2.6], fpaint(f, 0.4));
    p.poly([fx + 11.2, fy - 3, fx + 12.6, fy, fx + 11.2, fy + 3, fx + 9.4, fy + 2.8, fx + 9.4, fy - 2.8], HO(0.44));
    for (const ty of [-1.7, 0, 1.7]) p.rect(fx + 9.6, fy + ty - 0.45, 2.7, 0.9, M('#2a2e34', 0.46), 0.3);
    p.rect(fx - 3, fy - 0.35, 11, 0.7, fxGlow('#8fd0ff', 0.45, 0.55));
    p.circ(fx, fy, 2.1, M('#3a4048', 0.62, { s: 0.6 })); p.circ(fx, fy, 0.85, fxGlow('#8fd0ff', 0.7, 0.8));
  }
}
/* ---------- vehicles ---------- */
const FXV = {
  fxbike: { L: 22, W: 10, tx: 3, gx: 0, gl: 7, gd: 0.5, hover: 1, hull(p, f) {
    for (const s of [-1, 1]) { p.ell(-2, s * 3.7, 7.5, 1.95, 0, M('#2a2e35', 0.45, { s: 0.5 })); p.ell(-2, s * 3.7, 6.4, 1.2, 0, fxGlow('#ff5a46', 0.3, 0.9)); p.ell(-2, s * 3.7, 5.4, 0.62, 0, fxGlow('#ffd2c8', 0.32, 1)); }
    p.path(c => { c.moveTo(11, 0); c.quadraticCurveTo(8, -3, 0, -3.2); c.lineTo(-9, -2.4); c.quadraticCurveTo(-11.5, 0, -9, 2.4); c.lineTo(0, 3.2); c.quadraticCurveTo(8, 3, 11, 0); c.closePath(); }, Object.assign(fpaint(f, 0.6), { hr: [3, 0, 10, 0.76, 0.46] }));
    p.path(c => { c.moveTo(11, 0); c.quadraticCurveTo(9, -1.6, 6.5, -1.7); c.lineTo(6.5, 1.7); c.quadraticCurveTo(9, 1.6, 11, 0); c.closePath(); }, M('#30343b', 0.7, { s: 0.6 }));
    p.ell(4.6, 0, 1.6, 1.5, 0, M('#3d6f8a', 0.86, { s: 1 })); p.ell(4.2, -0.5, 0.7, 0.4, 0, AL('rgba(255,255,255,0.35)'));
    p.ell(-0.6, 0, 2.1, 2.5, 0, M('#2b2f35', 0.86)); dome(p, 0, 0, 1.25, '#3b4048', 0.9, 1.0); p.rect(0.6, -0.5, 0.7, 1.0, fxGlow('#ff6a50', 0.98));
    p.rect(-11, -1.4, 2, 2.8, M('#22252b', 0.5), 0.6); p.ell(-11.2, 0, 0.6, 1.2, 0, fxGlow('#ffb08a', 0.5, 1));
    teamFlag(p, -7, -0.8, 1.6, 1.6); p.grain(0.12);
  }, tur(p) {
    p.rect(-2, -2.3, 4, 4.6, M('#33373f', 0.74, { s: 0.5 }), 0.8);
    for (const s of [-1, 1]) { cyl(p, 0, 6.5, s * 1.25, 0.55, '#2c3036', 0.74, 0.94); p.circ(6.6, s * 1.25, 0.5, fxGlow(FXC.red, 0.95, 1)); }
    p.circ(-0.6, 0, 0.9, fxGlow('#ff6a50', 0.9, 0.7));
  } },
  fxhover: { L: 30, W: 17, tx: -1, gx: 7, gl: 16, gd: 1.6, hover: 1, hull(p, f) {
    for (const [x, y] of [[9.5, -6], [9.5, 6], [-9.5, -6], [-9.5, 6]]) { p.circ(x, y, 3.4, M('#23262c', 0.35)); p.circ(x, y, 2.8, fxGlow(FXC.green, 0.25, 0.85)); p.circ(x, y, 1.9, M('#1d2024', 0.3)); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; p.line([x, y, x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6], 0.35, M('#3a3f46', 0.4)); } p.circ(x, y, 0.7, M('#555b63', 0.45)); }
    facet(p, [15, -3.5, 12, -7.6, -12, -7.6, -15, -4.5, -15, 4.5, -12, 7.6, 12, 7.6, 15, 3.5], f, 0.62, 0.42, 2.2);
    for (const s of [-1, 1]) p.rect(-11, s * 7.95 - 0.35, 22, 0.7, fxGlow('#7dff9a', 0.5, 0.9));
    p.rect(12.4, -2.2, 1.8, 4.4, M('#28303a', 0.7, { s: 0.9 }), 0.4); p.rect(12.8, -1.6, 0.9, 3.2, fxGlow(FXC.green, 0.75, 0.8));
    grille(p, -14.4, -3.4, 3.2, 6.8, 5, 'y'); hatch(p, 8.5, -3.6, 1.1, f); teamFlag(p, -13, -6.6, 2.2, 1.4); p.grain(0.14);
  }, tur(p, f) {
    facet(p, [8.5, -3.2, 5.5, -6.6, -6.5, -6.8, -8.8, -4, -8.8, 4, -6.5, 6.8, 5.5, 6.6, 8.5, 3.2], f, 0.86, 0.58, 2.0);
    p.rect(6.4, -2.6, 2.8, 5.2, M('#2c3037', 0.9, { s: 0.6 }), 0.5);
    for (const s of [-1, 1]) { p.rect(-5.5, s * 5.2 - 0.6, 9, 1.2, fxGlow(FXC.green, 0.92, 0.7)); }
    p.circ(-3.4, 0, 1.9, M('#2a2e34', 0.92)); p.circ(-3.4, 0, 1.2, fxGlow('#b6ffc2', 0.95, 1));
    hatch(p, 1, -3, 1.1, f); teamFlag(p, -8.4, -1.2, 1.2, 2.4); p.grain(0.12);
  }, gun(p) {
    cyl(p, 0, 15.6, 0, 1.25, '#2d3137', 0.6, 0.95);
    for (let x = 2.2; x < 13.5; x += 2.2) p.rect(x, -1.6, 0.9, 3.2, M('#4a525c', 0.96, { s: 0.7 }), 0.3);
    p.rect(1.2, -0.3, 13.6, 0.6, fxGlow(FXC.green, 0.98, 0.8)); p.circ(15.8, 0, 1.15, fxGlow('#c8ffd2', 1, 1));
  } },
  fxtesla: { L: 30, W: 16, tx: -1.5, gx: 0, gl: 3.5, gd: 0, hull(p, f) {
    trackedHull(p, f, { L: 30, W: 16, front: 6, skirtF: 3, panel: 3.4 });
    p.rect(-14.4, -4.6, 4.2, 9.2, M('#2b2f36', 0.6, { s: 0.5 }), 0.6); for (let k = 0; k < 4; k++) p.rect(-14, -3.8 + k * 2.1, 3.4, 0.9, fxGlow('#7fd0ff', 0.58, 0.85), 0.3);
    for (const s of [-1, 1]) p.spath(c => { c.moveTo(-10.4, s * 3.6); c.quadraticCurveTo(-7, s * 5.2, -4.4, s * 3.4); }, 0.6, M('#1e2125', 0.66));
    hatch(p, 11.6, -2.4, 1.1, f); teamFlag(p, 8, 3.2, 2, 1.4); p.grain(0.14);
  }, tur(p, f) {
    p.circ(0, 0, 7.4, M('#2c3037', 0.72, { s: 0.5 }));
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + 0.39; p.rect(Math.cos(a) * 5.8 - 0.9, Math.sin(a) * 5.8 - 0.9, 1.8, 1.8, M('#4a515a', 0.82, { s: 0.6 }), 0.4); p.circ(Math.cos(a) * 5.8, Math.sin(a) * 5.8, 0.45, fxGlow('#9fe0ff', 0.9)); }
    let i = 0; for (let r = 5; r > 2.4; r -= 0.65, i++) p.spath(c => c.arc(0, 0, r, 0, TAU), 0.42, M(i % 2 ? '#b8743a' : '#d9944f', 0.86 + i * 0.025, { s: 0.85 }));
    p.circ(0, 0, 2.5, M('#cfd6de', 1.0, { s: 1, hr: [-0.8, -0.8, 2.5, 1, 0.82] })); p.circ(0, 0, 1.15, fxGlow('#bfeaff', 1.0, 1));
    facet(p, [8.8, -2.6, 8.8, 2.6, 6.6, 3.8, 6.6, -3.8], f, 0.8, 0.6, 1.0); teamFlag(p, -7.8, -1, 1.2, 2); p.grain(0.1);
  } },
  fxspider: { L: 30, W: 28, tx: 2.5, gx: 2.5, gl: 8.6, gd: 1, legs: 1, hull(p, f, ph) {
    spiderLegs(p, ph || 0);
    p.ell(-6.5, 0, 6.2, 5.0, 0, Object.assign(fpaint(f, 0.66), { hr: [-7.5, -1.2, 6, 0.86, 0.5] }));
    for (const s of [-1, 1]) p.spath(c => { c.ellipse(-6.5, 0, 4.4, 3.2, 0, s > 0 ? 0.35 : PI + 0.35, s > 0 ? PI - 0.35 : TAU - 0.35); }, 0.45, fxGlow(FXC.amber, 0.72, 0.8));
    facet(p, [9.5, -2.6, 7, -5.2, -1.5, -5.2, -2.5, -3, -2.5, 3, -1.5, 5.2, 7, 5.2, 9.5, 2.6], f, 0.78, 0.5, 1.6);
    for (const [x, y, r] of [[9.2, -1.1, 0.55], [9.2, 1.1, 0.55], [8.4, -2.2, 0.4], [8.4, 2.2, 0.4], [9.8, 0, 0.45]]) p.circ(x, y, r, fxGlow('#ffcc66', 0.92, 1));
    teamFlag(p, -9.6, -0.9, 2, 1.8); p.grain(0.14);
  }, tur(p, f) {
    dome(p, 0, 0, 3.8, '#3a4048', 0.8, 1.0, { s: 0.7 });
    for (const s of [-1, 1]) { p.rect(-3, s * 4.4 - 1.4, 5, 2.8, fpaint(f, 0.86), 0.5); for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) p.circ(-2.1 + a * 1.4, s * 4.4 - 0.65 + b * 1.3, 0.42, M('#15171a', 0.92)); }
    p.circ(1.2, 0, 1.3, fxGlow(FXC.amber, 0.95)); p.grain(0.1);
  }, gun(p) {
    cyl(p, 0, 8.5, 0, 0.95, '#2d3137', 0.6, 0.95); for (let x = 1.5; x < 7; x += 1.6) p.rect(x, -1.15, 0.5, 2.3, M('#4a525c', 0.9, { s: 0.7 }));
    p.circ(8.6, 0, 0.78, fxGlow('#ffd27a', 1, 1));
  } },
  fxtitan: { L: 32, W: 34, tx: 0, gx: 3, gl: 22, gd: 2.4, legs: 1, hull(p, f, ph) {
    titanLegs(p, f, ph || 0);
    facet(p, [4.5, -6.5, 4.5, 6.5, -4.5, 7, -6, 0, -4.5, -7], f, 0.66, 0.45, 1.4);
    for (const s of [-1, 1]) p.circ(0, s * 6.2, 2.2, M('#3a4048', 0.7, { s: 0.6 }));
    p.grain(0.12);
  }, tur(p, f) {
    for (const s of [-1, 1]) { p.rect(-4, s * 12.1 - 2.4, 13, 4.8, M(FXC.gun, 0.6, { s: 0.6 }), 1.4); p.rect(6.5, s * 12.1 - 1.6, 4.4, 3.2, M('#25292f', 0.66), 0.8); p.rect(-2, s * 12.1 - 0.4, 7, 0.8, fxGlow('#8fd0ff', 0.64, 0.6)); }
    for (const s of [-1, 1]) { facet(p, [5, s * 8, 5, s * 14.6, -6, s * 14.6, -7, s * 8], f, 0.95, 0.7, 1.4); for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) p.circ(-3.6 + a * 2.6, s * (9.8 + b * 2.6), 0.75, M('#15171a', 1.0)); }
    facet(p, [7.5, -5, 7.5, 5, -6.5, 7, -8.5, 0, -6.5, -7], f, 0.9, 0.65, 1.8);
    p.rect(5.2, -2.6, 2.2, 5.2, M('#1e2a33', 0.95, { s: 1 }), 0.6); p.rect(6.6, -2.2, 0.6, 4.4, fxGlow('#9fd8ff', 1, 1));
    p.circ(-5.4, 0, 2.0, M('#2a2e34', 0.9)); p.circ(-5.4, 0, 1.3, fxGlow('#8fd0ff', 0.95, 1));
    teamFlag(p, -2, -6.4, 2.4, 1.4); p.grain(0.1);
  }, gun(p) {
    p.rect(0, -1.7, 22, 3.4, M('#2a2e34', 0.85, { s: 0.6 }), 0.6);
    p.rect(0, -1.35, 22, 0.8, M('#4a525c', 0.95, { s: 0.8 })); p.rect(0, 0.55, 22, 0.8, M('#4a525c', 0.95, { s: 0.8 }));
    p.rect(1, -0.35, 21, 0.7, fxGlow('#8fd0ff', 0.9));
    for (let x = 2; x < 19; x += 3.2) p.rect(x, -2.1, 1.1, 4.2, M('#b97a3e', 0.98, { s: 0.8 }), 0.3);
    p.circ(22.2, 0, 1.1, fxGlow('#cfeeff', 1, 1));
  } },
};
const FXA = {
  fxufo: { L: 40, W: 40, rotor: 18.5, blades: 0, ufo: 1, draw(p, f) {
    p.circ(0, 0, 19, M('#59606a', 0.4, { s: 0.8, hr: [-4, -4, 19, 0.7, 0.3] }));
    p.spath(c => c.arc(0, 0, 18.4, 0, TAU), 0.5, M('#2b2f36', 0.45));
    p.circ(0, 0, 14, Object.assign(fpaint(f, 0.6), { hr: [-3, -3, 14, 0.76, 0.5] }));
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; p.line([Math.cos(a) * 9, Math.sin(a) * 9, Math.cos(a) * 18.6, Math.sin(a) * 18.6], 0.25, AL('rgba(0,0,0,0.35)')); }
    p.spath(c => c.arc(0, 0, 11, 0, TAU), 0.6, fxGlow(FXC.violet, 0.7, 0.8));
    p.circ(0, 0, 7, M('#2a1f3d', 0.85, { s: 1, hr: [-2, -2, 7, 1, 0.75] })); p.ell(-2, -2.4, 3.2, 2, -0.6, AL('rgba(255,255,255,0.28)'));
    p.circ(0, 0, 2.6, fxGlow('#d9a8ff', 0.95));
    for (const a of [0.8, 0.8 + PI]) p.rect(Math.cos(a) * 15.5 - 1.4, Math.sin(a) * 15.5 - 1.4, 2.8, 2.8, M('#d0d0d0', 0.6, { t: 1 }), 0.6);
    p.grain(0.08);
  } },
};
for (const f of FACTION_IDS) { for (const r in FXV) VART[f + '_' + r] = FXV[r]; for (const r in FXA) AART[f + '_' + r] = FXA[r]; }
/* ---------- baking: only what can appear in this battle ---------- */
function bakeFxUnits(f) {
  const need = FX_NEED && FX_NEED[f]; if (!need) return;
  for (const role in need) {
    const id = f + '_' + role; const u = UNITS[id]; if (!u) continue;
    if (u.cls === 'inf') { for (let fr = 0; fr < 6; fr++) bake(id + ':f' + fr, 16, 14, 7, 7, S_INF, p => exoFrame(p, f, fr), { Hmax: 2.2, dust: 0.1, soft: 0.32, aoR: 1 }); bake(id + ':dead', 22, 16, 11, 8, S_INF * 0.8, p => exoDead(p, f), { Hmax: 1.5, dust: 0.3 }); continue; }
    if (u.cls === 'air') { const A = AART[id]; bake(id + ':rotor', 42, 42, 21, 21, S_AIR * 0.8, p => { p.spath(c => c.arc(0, 0, 17.2, 0, TAU), 0.3, fxGlow('#8a55c8', 0.5, 0.4)); for (let k = 0; k < 16; k++) { const a = k * TAU / 16; p.circ(Math.cos(a) * 17.2, Math.sin(a) * 17.2, 0.9, fxGlow(k % 2 ? '#f0dcff' : '#b26bff', 0.6, 1)); } }, { Hmax: 1, dust: 0 }); if (A) bakeAircraft(id); continue; }
    const va = VART[id]; if (!va) continue; bakeVehicle(id);
    if (va.legs) for (const ph of [1, 2]) bake(id + ':walk' + ph, va.L + 4, va.W + 4, va.L / 2 + 2, va.W / 2 + 2, S_VEH, p => va.hull(p, f, ph), { Hmax: 3.5, dust: 0.3, seed: id.length + ph, weather: 1 });
  }
}
// soft white strokes for energy beams (tinted per weapon in js/fx/effects.js)
function bakeFX4() {
  bake('beamfx', 16, 4, 8, 2, 3, p => { p.rect(-8, -2, 16, 4, { c: ctx => { const g = ctx.createLinearGradient(0, -2, 0, 2); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); return g; } }); }, { Hmax: 1, dust: 0 });
}
// which fantasy troops this battle can show: the local player's purchases, or (online) everything a human could bring
function fxNeedFor(g) {
  const out = {};
  g.players.forEach((pl, i) => { if (!pl.human) return; const set = out[pl.f] = out[pl.f] || {};
    for (const r of FX_ROLES) if (i !== g.local || (typeof Eco !== 'undefined' && Eco.owns('troop', r))) set[r] = 1; }); // other humans (online) may bring any of them
  for (const u of g.units || []) if (u.def && u.def.fx) (out[u.def.f] = out[u.def.f] || {})[u.def.role] = 1; // a loaded save
  return out;
}
