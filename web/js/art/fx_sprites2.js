/* ============================================================
   War of Power — صور مؤثرات إضافية
   الملف: js/art/fx_sprites2.js   ·   ترتيب التحميل: 16 من 43
   ============================================================ */
'use strict';
/* ===== Extra effect sprites: sea foam, spray, bubbles, oil slick, medic cross, cloud shadow, gulls ===== */
function bakeFX2() {
  for (let i = 0; i < 3; i++) bake('foam' + i, 34, 34, 17, 17, 1.6, p => { const R0 = RNG(900 + i);
    for (let k = 0; k < 9; k++) { const a = R0() * TAU, d = R0() * 7, r = 3 + R0() * 6; const x = Math.cos(a) * d, y = Math.sin(a) * d; p.circ(x, y, r, { c: rgba('#f4f8fa', 0.28 + R0() * 0.3), h: 0.25, hr: [x, y, r, 0.5, 0.05] }); }
    for (let k = 0; k < 6; k++) { const a = R0() * TAU, r = 6 + R0() * 7; p.spath(c => c.arc(0, 0, r, a, a + 0.8 + R0()), 0.5 + R0() * 0.6, { c: rgba('#ffffff', 0.35), h: 0.3 }); }
    p.grain(0.3, 0.5); }, { Hmax: 2, dust: 0, soft: 1, ao: 0.4, aoR: 2 });
  bake('drop', 6, 6, 3, 3, 3, p => { p.circ(0, 0, 2.4, { c: (ctx) => { const g = ctx.createRadialGradient(-0.6, -0.6, 0, 0, 0, 2.4); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(225,238,245,0.8)'); g.addColorStop(1, 'rgba(210,228,238,0)'); return g; }, h: 0.6 }); }, { Hmax: 1, dust: 0 });
  bake('bubble', 8, 8, 4, 4, 3, p => { p.spath(c => c.arc(0, 0, 2.6, 0, TAU), 0.5, { c: 'rgba(235,245,250,0.9)', h: 0.4 }); p.circ(-0.8, -0.8, 0.6, M('#ffffff', 0.5)); }, { Hmax: 0.5, dust: 0 });
  bake('oil', 48, 30, 24, 15, 1.2, p => { p.path(c => blobPath(c, 18, 10, 0.5, 950), { c: (ctx) => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22); g.addColorStop(0, 'rgba(18,16,14,0.85)'); g.addColorStop(0.7, 'rgba(30,28,30,0.55)'); g.addColorStop(1, 'rgba(60,50,70,0)'); return g; }, h: 0.02, s: 0.9 }); for (let k = 0; k < 5; k++) p.spath(c => c.ellipse(0, 0, 6 + k * 3.4, 3 + k * 2, 0.2, 0, TAU), 0.35, AL(`rgba(${120 + k * 20},${80 + k * 25},${150 - k * 10},0.18)`)); }, { Hmax: 0.2, dust: 0 });
  bake('plus', 10, 10, 5, 5, 3, p => { p.rect(-1.1, -3.8, 2.2, 7.6, M('#ffffff', 0.5), 0.4); p.rect(-3.8, -1.1, 7.6, 2.2, M('#ffffff', 0.5), 0.4); }, { Hmax: 0.1, dust: 0 });
  bake('cloud', 160, 110, 80, 55, 0.6, p => { const R0 = RNG(970); for (let k = 0; k < 16; k++) { const x = (R0() - 0.5) * 100, y = (R0() - 0.5) * 60, r = 18 + R0() * 26; p.circ(x, y, r, { c: (ctx) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); return g; }, h: 0.01 }); } }, { Hmax: 0.01, dust: 0 });
  for (let i = 0; i < 2; i++) bake('gull' + i, 12, 8, 6, 4, 3, p => { const k = i ? 0.45 : 1; p.spath(c => { c.moveTo(-5, -3.2 * k); c.quadraticCurveTo(-2, -0.4, 0, 0); c.quadraticCurveTo(2, -0.4, 5, -3.2 * k); }, 0.8, M('#f2f2ee', 0.6)); p.circ(0, 0.2, 0.7, M('#e8e8e2', 0.7)); }, { Hmax: 0.5, dust: 0 });
  bake('ember', 4, 4, 2, 2, 3, p => { p.circ(0, 0, 1.6, { c: (ctx) => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.6); g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(0.5, 'rgba(255,150,50,0.8)'); g.addColorStop(1, 'rgba(255,80,0,0)'); return g; }, h: 0.01 }); }, { Hmax: 0.01, dust: 0 });
  bake('pier', 64, 14, 0, 7, 2, p => { p.rect(0, -6, 64, 12, M('#6e6455', 0.35, { s: 0.05 }), 0.5); for (let x = 2; x < 64; x += 3.2) p.line([x, -6, x, 6], 0.25, AL('rgba(0,0,0,0.3)')); for (let x = 6; x < 64; x += 12) { p.circ(x, -6.4, 1, M('#3d3833', 0.5)); p.circ(x, 6.4, 1, M('#3d3833', 0.5)); } p.rect(60, -7, 4, 14, M('#8a8070', 0.4)); }, { Hmax: 2, dust: 0.1 });
}
function bakeFX3() { bake('gstar', 10, 10, 5, 5, 3, p => { star5(p, 0, 0, 4.4, 0, M('#3a2a08', 0.5)); star5(p, 0, 0, 3.6, 0, M('#f2cf6a', 0.6, { s: 0.8 })); }, { Hmax: 0.5, dust: 0 }); }
