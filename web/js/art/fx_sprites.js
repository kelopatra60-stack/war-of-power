/* ============================================================
   War of Power — صور المؤثرات والأشجار والزخارف
   الملف: js/art/fx_sprites.js   ·   ترتيب التحميل: 15 من 43
   ============================================================ */
'use strict';
/* ===== Effects, props, trees, decals, UI-in-world sprites ===== */
function blobPath(c, r, n, rr, seed) { const R0 = RNG(seed); const k = n || 9; c.moveTo(r, 0); for (let i = 1; i <= k * 3; i++) { const a = i / (k * 3) * TAU; const v = r * (1 + (R0() - 0.5) * (rr || 0.35)); c.lineTo(Math.cos(a) * v, Math.sin(a) * v); } c.closePath(); }
function bakeFX() {
  bake('px', 4, 4, 2, 2, 2, p => p.rect(-2, -2, 4, 4, M('#ffffff', 0.5)), { Hmax: 0.01, dust: 0, soft: 0.1 });
  bake('ring', 34, 34, 17, 17, 3, p => { p.spath(c => c.arc(0, 0, 15, 0, TAU), 1.6, M('#ffffff', 0.5)); }, { Hmax: 0.01, dust: 0 });
  bake('ringthin', 66, 66, 33, 33, 2, p => { p.spath(c => c.arc(0, 0, 31.5, 0, TAU), 1.0, M('#ffffff', 0.5)); }, { Hmax: 0.01, dust: 0 });
  bake('disc', 34, 34, 17, 17, 2, p => { p.circ(0, 0, 16, M('#ffffff', 0.5)); }, { Hmax: 0.01, dust: 0 });
  bake('light', 64, 64, 32, 32, 1, p => { p.circ(0, 0, 31, { c: (ctx) => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 31); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); return g; }, h: 0.01 }); }, { Hmax: 0.01, dust: 0 });
  bake('glow', 32, 32, 16, 16, 2, p => { p.circ(0, 0, 15.5, { c: (ctx) => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 15.5); g.addColorStop(0, 'rgba(255,250,235,1)'); g.addColorStop(0.25, 'rgba(255,220,150,0.7)'); g.addColorStop(1, 'rgba(255,120,30,0)'); return g; }, h: 0.01 }); }, { Hmax: 0.01, dust: 0 });
  // smoke puffs (lit, volumetric via normal map)
  // soft-edged billows: a feathered core plus lumps whose alpha fades out, so overlapping puffs read as one cloud (no hard rims)
  for (let i = 0; i < 5; i++) bake('smoke' + i, 34, 34, 17, 17, 1.6, p => {
    const R0 = RNG(100 + i); const soft = (x, y, r, a0) => (ctx) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(216,214,209,${a0})`); g.addColorStop(0.6, `rgba(212,210,205,${a0 * 0.55})`); g.addColorStop(1, 'rgba(208,206,201,0)'); return g; };
    p.circ(0, 0, 15.5, { c: soft(0, 0, 15.5, 0.8), h: 0.45, hr: [-3, -3, 15.5, 0.8, 0.05] });
    for (let k = 0; k < 7; k++) { const a = R0() * TAU, d = 2 + R0() * 6, r = 4 + R0() * 5; const x = Math.cos(a) * d, y = Math.sin(a) * d; p.circ(x, y, r, { c: soft(x, y, r, 0.38 + R0() * 0.2), h: 0.7, ha: 0.3, hr: [x - r * 0.3, y - r * 0.3, r, 0.95, 0.35] }); }
    p.grain(0.28, 0.6);
  }, { Hmax: 6, dust: 0, soft: 1.8, ao: 0.9, aoR: 3 });
  // soft trail puff (rocket / missile / contrail): low-contrast lighting so overlapping puffs read as one continuous plume
  for (let i = 0; i < 2; i++) bake('trail' + i, 28, 28, 14, 14, 1.4, p => { const R0 = RNG(150 + i); p.circ(0, 0, 12.5, { c: (ctx) => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 12.5); g.addColorStop(0, 'rgba(236,234,230,0.9)'); g.addColorStop(0.55, 'rgba(226,224,220,0.55)'); g.addColorStop(1, 'rgba(220,218,214,0)'); return g; }, h: 0.5, hr: [-2, -2, 12.5, 0.75, 0.1] });
    for (let k = 0; k < 4; k++) { const a = R0() * TAU, d = R0() * 4, r = 4 + R0() * 4; p.circ(Math.cos(a) * d, Math.sin(a) * d, r, { c: rgba('#e2e0dc', 0.18), h: 0.6, ha: 0.5 }); } }, { Hmax: 3, dust: 0, soft: 1.6, ao: 0.6, aoR: 3 });
  // flames (additive)
  for (let i = 0; i < 4; i++) bake('fire' + i, 24, 24, 12, 12, 2, p => {
    const R0 = RNG(200 + i);
    for (let k = 0; k < 6; k++) { const x = (R0() - 0.5) * 8, y = (R0() - 0.5) * 8, r = 3 + R0() * 6; p.circ(x, y, r, { c: (ctx) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(0.4, 'rgba(255,150,40,0.6)'); g.addColorStop(1, 'rgba(200,40,0,0)'); return g; }, h: 0.3 }); }
  }, { Hmax: 0.1, dust: 0 });
  for (let i = 0; i < 3; i++) bake('fireball' + i, 48, 48, 24, 24, 1.6, p => {
    p.path(c => blobPath(c, 21, 10, 0.4, 300 + i), { c: (ctx) => { const g = ctx.createRadialGradient(-3, -3, 0, 0, 0, 23); g.addColorStop(0, 'rgba(255,252,225,1)'); g.addColorStop(0.3, 'rgba(255,200,90,0.95)'); g.addColorStop(0.65, 'rgba(240,100,25,0.7)'); g.addColorStop(1, 'rgba(120,30,5,0)'); return g; }, h: 0.3 });
    p.grain(0.45, 0.5);
  }, { Hmax: 0.1, dust: 0 });
  // muzzle flashes (pointing +x)
  bake('mf_small', 16, 10, 2, 5, 3, p => { p.path(c => { c.moveTo(0, -1.2); c.lineTo(9, -0.3); c.lineTo(13, 0); c.lineTo(9, 0.3); c.lineTo(0, 1.2); c.closePath(); }, { c: (ctx) => { const g = ctx.createLinearGradient(0, 0, 13, 0); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.5, 'rgba(255,200,90,0.9)'); g.addColorStop(1, 'rgba(255,120,30,0)'); return g; }, h: 0.1 }); p.path(c => { c.moveTo(1, 0); c.lineTo(5, -3); c.lineTo(3, 0); c.lineTo(5, 3); c.closePath(); }, AL('rgba(255,220,140,0.7)')); p.circ(0.5, 0, 1.6, AL('rgba(255,255,240,1)')); }, { Hmax: 0.1, dust: 0 });
  bake('mf_cannon', 40, 30, 4, 15, 2.2, p => {
    p.path(c => { c.moveTo(0, -3); c.quadraticCurveTo(14, -8, 32, 0); c.quadraticCurveTo(14, 8, 0, 3); c.closePath(); }, { c: (ctx) => { const g = ctx.createLinearGradient(0, 0, 32, 0); g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(0.35, 'rgba(255,210,110,0.95)'); g.addColorStop(1, 'rgba(255,110,20,0)'); return g; }, h: 0.1 });
    for (const s of [-1, 1]) p.path(c => { c.moveTo(1, s * 1); c.quadraticCurveTo(6, s * 8, 3, s * 14); c.quadraticCurveTo(1, s * 6, 0, s * 2); c.closePath(); }, AL('rgba(255,190,90,0.75)'));
    p.circ(1, 0, 4, AL('rgba(255,255,240,1)'));
  }, { Hmax: 0.1, dust: 0 });
  bake('mf_brake', 30, 34, 4, 17, 2.2, p => { for (const s of [-1, 1]) p.path(c => { c.moveTo(0, s * 1.2); c.quadraticCurveTo(3, s * 10, 9, s * 16); c.quadraticCurveTo(5, s * 6, 4, s * 1); c.closePath(); }, { c: (ctx) => { const g = ctx.createLinearGradient(0, 0, 0, s * 16); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.5, 'rgba(255,180,70,0.85)'); g.addColorStop(1, 'rgba(255,100,20,0)'); return g; }, h: 0.1 }); p.path(c => { c.moveTo(2, -2); c.lineTo(22, 0); c.lineTo(2, 2); c.closePath(); }, AL('rgba(255,230,160,0.9)')); }, { Hmax: 0.1, dust: 0 });
  bake('mf_rocket', 20, 14, 18, 7, 2.5, p => { p.path(c => { c.moveTo(0, -1.5); c.lineTo(-16, -4.5); c.lineTo(-12, 0); c.lineTo(-16, 4.5); c.lineTo(0, 1.5); c.closePath(); }, { c: (ctx) => { const g = ctx.createLinearGradient(0, 0, -16, 0); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.4, 'rgba(255,170,60,0.8)'); g.addColorStop(1, 'rgba(255,90,10,0)'); return g; }, h: 0.1 }); }, { Hmax: 0.1, dust: 0 });
  bake('exhaust', 12, 6, 11, 3, 3, p => { p.path(c => { c.moveTo(0, -1.4); c.lineTo(-10, 0); c.lineTo(0, 1.4); c.closePath(); }, { c: (ctx) => { const g = ctx.createLinearGradient(0, 0, -10, 0); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.3, 'rgba(255,190,90,0.85)'); g.addColorStop(1, 'rgba(255,80,10,0)'); return g; }, h: 0.1 }); }, { Hmax: 0.1, dust: 0 });
  bake('tracer', 24, 3, 12, 1.5, 3, p => { p.rect(-12, -0.6, 24, 1.2, { c: (ctx) => { const g = ctx.createLinearGradient(-12, 0, 12, 0); g.addColorStop(0, 'rgba(255,170,60,0)'); g.addColorStop(0.7, 'rgba(255,220,140,0.8)'); g.addColorStop(1, 'rgba(255,255,230,1)'); return g; }, h: 0.1 }, 0.6); }, { Hmax: 0.1, dust: 0 });
  bake('spark', 10, 2, 5, 1, 3, p => { p.rect(-5, -0.4, 10, 0.8, { c: (ctx) => { const g = ctx.createLinearGradient(-5, 0, 5, 0); g.addColorStop(0, 'rgba(255,140,40,0)'); g.addColorStop(1, 'rgba(255,240,190,1)'); return g; }, h: 0.1 }, 0.4); }, { Hmax: 0.1, dust: 0 });
  bake('shock', 64, 64, 32, 32, 1.4, p => { p.spath(c => c.arc(0, 0, 29, 0, TAU), 3, { c: (ctx) => { const g = ctx.createRadialGradient(0, 0, 26, 0, 0, 31); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); return g; }, h: 0.1 }); }, { Hmax: 0.1, dust: 0 });
  // debris
  for (let i = 0; i < 4; i++) bake('deb' + i, 8, 8, 4, 4, 3, p => { const R0 = RNG(400 + i); const pts = []; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + R0() * 0.8, r = 1.2 + R0() * 2.4; pts.push(Math.cos(a) * r, Math.sin(a) * r); } p.poly(pts, M(['#55534c', '#3c3b36', '#6a675d', '#4c4a3e'][i], 0.6, { s: 0.4 })); }, { Hmax: 2, dust: 0.2 });
  for (let i = 0; i < 3; i++) bake('clod' + i, 6, 6, 3, 3, 3, p => { p.path(c => blobPath(c, 2.2, 6, 0.6, 450 + i), M(['#6b5840', '#5a4a36', '#7a6a4e'][i], 0.6)); }, { Hmax: 2, dust: 0 });
  bake('casing', 2, 1, 1, 0.5, 6, p => p.rect(-1, -0.4, 2, 0.8, M('#c9a24a', 0.6, { s: 0.9 }), 0.3), { Hmax: 0.5, dust: 0 });
  // decals
  for (let i = 0; i < 3; i++) bake('crater' + i, 40, 40, 20, 20, 1.6, p => {
    const R0 = RNG(500 + i);
    for (let k = 0; k < 14; k++) { const a = R0() * TAU, d = 12 + R0() * 6; p.circ(Math.cos(a) * d, Math.sin(a) * d, 2 + R0() * 3, { c: rgba('#4a3c2c', 0.5), h: 0.7 }); }
    p.circ(0, 0, 13, { c: (ctx) => { const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 14); g.addColorStop(0, 'rgba(25,20,15,0.95)'); g.addColorStop(0.7, 'rgba(60,48,34,0.8)'); g.addColorStop(1, 'rgba(80,66,48,0.0)'); return g; }, h: 0.5, hr: [0, 0, 13, 0.05, 0.62] });
  }, { Hmax: 6, dust: 0, soft: 1 });
  for (let i = 0; i < 2; i++) bake('scorch' + i, 48, 48, 24, 24, 1.2, p => { p.path(c => blobPath(c, 20, 12, 0.6, 520 + i), { c: (ctx) => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22); g.addColorStop(0, 'rgba(15,13,11,0.85)'); g.addColorStop(0.6, 'rgba(25,22,18,0.55)'); g.addColorStop(1, 'rgba(30,26,20,0)'); return g; }, h: 0.02 }); }, { Hmax: 0.5, dust: 0 });
  bake('track', 4, 18, 2, 9, 2, p => { for (const y of [-7.2, 5.2]) { p.rect(-2, y, 4, 2.2, AL('rgba(40,32,24,0.32)')); for (let x = -1.6; x < 2; x += 1.1) p.rect(x, y, 0.5, 2.2, AL('rgba(20,16,12,0.28)')); } }, { Hmax: 0.1, dust: 0 });
  bake('tire', 4, 14, 2, 7, 2, p => { for (const y of [-5.5, 4.3]) p.rect(-2, y, 4, 1.4, AL('rgba(40,32,24,0.26)')); }, { Hmax: 0.1, dust: 0 });
  bake('blast', 30, 30, 15, 15, 1.5, p => { p.path(c => blobPath(c, 12, 10, 0.5, 530), { c: (ctx) => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 13); g.addColorStop(0, 'rgba(20,16,12,0.6)'); g.addColorStop(1, 'rgba(30,26,20,0)'); return g; }, h: 0.02 }); }, { Hmax: 0.5, dust: 0 });
  bake('rubble', 40, 40, 20, 20, 1.4, p => { const R0 = RNG(540); for (let k = 0; k < 40; k++) { const x = (R0() - 0.5) * 34, y = (R0() - 0.5) * 34; p.rect(x, y, 1.5 + R0() * 4, 1.5 + R0() * 3, M(rgb2hex(mixc('#6a665c', '#9a958a', R0())), 0.2 + R0() * 0.5)); } }, { Hmax: 3, dust: 0.2 });
  // projectiles
  bake('msl', 10, 3, 5, 1.5, 4, p => { cyl(p, -4, 3, 0, 0.65, '#d8d6cc', 0.5, 1); p.path(c => { c.moveTo(3, -0.65); c.quadraticCurveTo(4.6, 0, 3, 0.65); c.closePath(); }, M('#555', 0.8)); p.rect(-4, -1.4, 1.2, 2.8, M('#9a9890', 0.6)); }, { Hmax: 1.5, dust: 0 });
  bake('rocket', 8, 2, 4, 1, 4, p => { cyl(p, -3.5, 2.8, 0, 0.5, '#7b7e70', 0.5, 1); p.rect(2.6, -0.4, 0.8, 0.8, M('#444', 1)); }, { Hmax: 1.5, dust: 0 });
  bake('cruise', 22, 12, 11, 6, 3, p => { cyl(p, -10, 8, 0, 1.3, '#d8d6cc', 0.5, 1); p.path(c => { c.moveTo(8, -1.3); c.quadraticCurveTo(11, 0, 8, 1.3); c.closePath(); }, M('#bbb', 0.9)); p.rect(-2, -5, 2, 10, M('#c9c7bd', 0.5)); p.rect(-10, -2.4, 2, 4.8, M('#aaa', 0.5)); }, { Hmax: 2, dust: 0 });
  bake('ballistic', 30, 8, 15, 4, 3, p => { cyl(p, -14, 9, 0, 2.2, '#e0ded4', 0.5, 1); p.path(c => { c.moveTo(9, -2.2); c.quadraticCurveTo(15, 0, 9, 2.2); c.closePath(); }, M('#9a9890', 1)); for (const s of [-1, 1]) p.rect(-14, s * 2.2 - (s > 0 ? 0 : 1.6), 3, 1.6, M('#666', 0.6)); }, { Hmax: 2, dust: 0 });
  bake('bomb', 9, 4, 4.5, 2, 4, p => { cyl(p, -3.5, 3, 0, 1, '#6f7366', 0.5, 1); p.path(c => { c.moveTo(3, -1); c.quadraticCurveTo(4.6, 0, 3, 1); c.closePath(); }, M('#5c5f55', 1)); p.rect(-4.4, -1.6, 1.2, 3.2, M('#555', 0.6)); }, { Hmax: 1.5, dust: 0 });
  bake('shell', 4, 2, 2, 1, 5, p => { cyl(p, -1.6, 1.2, 0, 0.42, '#b9a46a', 0.5, 1); p.circ(1.3, 0, 0.42, M('#c9b07a', 1)); }, { Hmax: 1, dust: 0 });
  bake('chute', 22, 22, 11, 11, 2, p => { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; p.path(c => { c.moveTo(0, 0); c.arc(0, 0, 10, a, a + TAU / 8); c.closePath(); }, M(i % 2 ? '#e8e2d0' : '#c9bfa0', 0.7, { hr: [0, 0, 10, 1, 0.5] })); } p.circ(0, 0, 1.5, M('#555', 1)); }, { Hmax: 3, dust: 0 });
  // UI markers
  for (let r = 1; r <= 3; r++) bake('chev' + r, 8, 8, 4, 4, 4, p => { for (let k = 0; k < r; k++) p.line([-2.6, -1.2 + k * 1.6, 0, 0.6 + k * 1.6, 2.6, -1.2 + k * 1.6], 0.75, M('#f2d27a', 0.6)); }, { Hmax: 0.1, dust: 0 });
  bake('arrow', 12, 12, 6, 6, 3, p => { p.poly([5, 0, -3, -4, -1.2, 0, -3, 4], M('#ffffff', 0.6)); }, { Hmax: 0.1, dust: 0 });
  bake('flagm', 12, 14, 2, 12, 3, p => { p.line([0, 0, 0, -11], 0.6, M('#ddd', 0.5)); p.poly([0, -11, 8, -8.5, 0, -6], M('#ffffff', 0.5)); }, { Hmax: 0.1, dust: 0 });
  bake('xmark', 12, 12, 6, 6, 3, p => { p.line([-4, -4, 4, 4], 1.2, M('#fff', 0.5)); p.line([-4, 4, 4, -4], 1.2, M('#fff', 0.5)); }, { Hmax: 0.1, dust: 0 });
}
/* ---- Trees & props ---- */
function bakeTrees() {
  for (let i = 0; i < 4; i++) bake('oak' + i, 34, 34, 17, 17, 2.2, p => {
    const R0 = RNG(600 + i); const base = ['#3d5622', '#47612a', '#3a5230', '#52692c'][i]; const RR = 12 + i;
    p.circ(0, 0, RR * 0.9, { c: shade(base, -0.35), h: 0.5, hr: [-2, -2, RR, 0.85, 0.35] });
    for (let k = 0; k < 90; k++) { const a = R0() * TAU, d = Math.sqrt(R0()) * RR * 0.92, r = 1.4 + R0() * 2.6; const x = Math.cos(a) * d, y = Math.sin(a) * d; const hh = 0.55 + (1 - d / RR) * 0.4;
      p.circ(x, y, r, { c: rgb2hex(mixc(base, R0() < 0.3 ? '#8a9a48' : '#2c401c', R0() * 0.5)), h: hh, hr: [x - r * 0.35, y - r * 0.35, r, hh + 0.12, hh - 0.18] }); }
    p.grain(0.45, 0.3);
  }, { Hmax: 9, dust: 0, soft: 0.25, ao: 3.2, aoR: 1.6 });
  for (let i = 0; i < 4; i++) bake('pine' + i, 26, 26, 13, 13, 2, p => {
    const R0 = RNG(620 + i); const n = 9 + i;
    for (let ring = 0; ring < 3; ring++) { const rr = 11 - ring * 3.2; for (let k = 0; k < n; k++) { const a = k / n * TAU + ring * 0.3 + R0() * 0.2; p.path(c => { c.moveTo(0, 0); c.lineTo(Math.cos(a - 0.22) * rr * 0.6, Math.sin(a - 0.22) * rr * 0.6); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); c.lineTo(Math.cos(a + 0.22) * rr * 0.6, Math.sin(a + 0.22) * rr * 0.6); c.closePath(); }, { c: rgb2hex(mixc('#2a4026', '#3f5a32', R0() * 0.6 + ring * 0.15)), h: 0.4 + ring * 0.25 }); } }
    p.grain(0.4, 0.3);
  }, { Hmax: 8, dust: 0, soft: 0.4, ao: 2.4, aoR: 2 });
  for (let i = 0; i < 3; i++) bake('palm' + i, 30, 30, 15, 15, 2, p => {
    const R0 = RNG(640 + i); const n = 8 + i;
    for (let k = 0; k < n; k++) { const a = k / n * TAU + R0() * 0.3, L = 10 + R0() * 4; const cx = Math.cos(a), cy = Math.sin(a);
      p.path(c => { c.moveTo(0, 0); c.quadraticCurveTo(cx * L * 0.5 - cy * 2.4, cy * L * 0.5 + cx * 2.4, cx * L, cy * L); c.quadraticCurveTo(cx * L * 0.5 + cy * 2.4, cy * L * 0.5 - cx * 2.4, 0, 0); c.closePath(); }, { c: rgb2hex(mixc('#4c6e2a', '#7a9440', R0() * 0.5)), h: 0.6, hg: [0, 0, 1, cx * L, cy * L, 0.3] });
      for (let s = 0.2; s < 1; s += 0.12) p.line([cx * L * s, cy * L * s, cx * L * s - cy * 1.6, cy * L * s + cx * 1.6], 0.3, AL('rgba(30,45,20,0.6)')); }
    p.circ(0, 0, 1.6, M('#6b5a3a', 1));
  }, { Hmax: 6, dust: 0, soft: 0.4, ao: 2, aoR: 2 });
  for (let i = 0; i < 3; i++) bake('bush' + i, 16, 16, 8, 8, 2, p => { const R0 = RNG(660 + i); for (let k = 0; k < 8; k++) { const a = R0() * TAU, d = R0() * 3, r = 2 + R0() * 2.4; const x = Math.cos(a) * d, y = Math.sin(a) * d; p.circ(x, y, r, { c: rgb2hex(mixc(['#4f6a2e', '#6b6a3a', '#3d5530'][i], '#8a9a50', R0() * 0.3)), h: 0.6, hr: [x - r * 0.3, y - r * 0.3, r, 1, 0.4] }); } p.grain(0.4, 0.3); }, { Hmax: 4, dust: 0, soft: 0.4 });
  for (let i = 0; i < 2; i++) bake('snowpine' + i, 26, 26, 13, 13, 2, p => { const R0 = RNG(680 + i); const n = 10; for (let ring = 0; ring < 3; ring++) { const rr = 11 - ring * 3.2; for (let k = 0; k < n; k++) { const a = k / n * TAU + ring * 0.3; p.path(c => { c.moveTo(0, 0); c.lineTo(Math.cos(a - 0.22) * rr * 0.6, Math.sin(a - 0.22) * rr * 0.6); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); c.lineTo(Math.cos(a + 0.22) * rr * 0.6, Math.sin(a + 0.22) * rr * 0.6); c.closePath(); }, { c: R0() < 0.55 ? '#e8edf0' : '#2e4430', h: 0.4 + ring * 0.25 }); } } }, { Hmax: 8, dust: 0, soft: 0.4, ao: 2.4 });
  bake('stump', 8, 8, 4, 4, 2, p => { p.circ(0, 0, 2.4, M('#6a5236', 0.6)); p.circ(0, 0, 1.6, M('#a08460', 0.62)); }, { Hmax: 2, dust: 0 });
  bake('logs', 26, 8, 13, 4, 2, p => { cyl(p, -12, 12, 0, 2, '#5a4630', 0.3, 0.8); for (let k = 0; k < 8; k++) p.line([-10 + k * 3, -1.6, -9 + k * 3, 1.6], 0.3, AL('rgba(0,0,0,0.2)')); p.circ(-6, -3, 2.2, M('#3f5a24', 0.5)); p.circ(5, 3, 2, M('#3f5a24', 0.5)); }, { Hmax: 3, dust: 0 });
  for (let i = 0; i < 3; i++) bake('rock' + i, 22, 22, 11, 11, 2, p => { const R0 = RNG(700 + i); p.path(c => blobPath(c, 8, 7, 0.5, 700 + i), { c: rgb2hex(mixc('#7d7870', '#a39d92', R0())), h: 0.7, hr: [-2, -2, 9, 1, 0.3] }); for (let k = 0; k < 3; k++) p.line([R0() * 8 - 4, R0() * 8 - 4, R0() * 8 - 4, R0() * 8 - 4], 0.3, AL('rgba(0,0,0,0.25)')); p.grain(0.4, 0.4); }, { Hmax: 6, dust: 0.1, soft: 0.6 });
}
