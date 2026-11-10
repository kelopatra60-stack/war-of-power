/* ============================================================
   War of Power — المؤثرات المرئية: جزيئات، انفجارات، إضاءة، اهتزاز
   الملف: js/fx/effects.js   ·   ترتيب التحميل: 26 من 43
   ============================================================ */
'use strict';
/* ===== Visual effects: particles, decals, lights, shake ===== */
const FX = (function () {
  const MAXP = 3200; let maxP = MAXP;
  const P = []; for (let i = 0; i < MAXP; i++) P.push({ on: false });
  let pn = 0; // number used (scan)
  const D = []; const MAXD = 2600; // decals
  const L = []; // lights
  const T = []; // floating texts
  const FB = []; // flybys
  const DEB = []; // big debris (turrets)
  let shakeA = 0; const wind = [7, -3];
  let enabled = true, reduce = false;
  function spawn(o) {
    if (!enabled) return null; let p = null;
    for (let k = 0; k < 8; k++) { const i = (pn + k) % maxP; if (!P[i].on) { p = P[i]; pn = (i + 1) % maxP; break; } }
    if (!p) { p = P[pn]; pn = (pn + 1) % maxP; }
    p.on = true; p.x = o.x; p.y = o.y; p.z = o.z || 0; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0; p.life = 0; p.max = o.max || 1;
    p.s0 = o.s0 || 1; p.s1 = o.s1 === undefined ? p.s0 : o.s1; p.r = o.r === undefined ? Math.random() * TAU : o.r; p.vr = o.vr || 0; p.spr = o.spr; p.c0 = o.c0 || [255, 255, 255, 255]; p.c1 = o.c1 || p.c0;
    p.add = !!o.add; p.lit = o.lit === undefined ? !o.add : o.lit; p.g = o.g || 0; p.drag = o.drag || 0; p.bounce = o.bounce || 0; p.layer = o.layer || 1; p.fade = o.fade || 0; p.wind = o.wind || 0; p.stretch = o.stretch || 0; p.land = o.land || null; p.rise = o.rise || 0; p.len = o.len || 0;
    return p;
  }
  function decal(spr, x, y, r, s, life, alpha) {
    if (!enabled) return; if (D.length >= MAXD) D.shift(); D.push({ spr, x, y, r: r === undefined ? Math.random() * TAU : r, s: s || 1, t: 0, life: life || 90, a: alpha === undefined ? 1 : alpha });
  }
  function light(x, y, rad, r, g, b, life, k) { if (L.length > 120) L.shift(); L.push({ x, y, rad, r, g, b, t: 0, life: life || 0.15, k: k === undefined ? 1 : k }); }
  function shake(a) { if (reduce) a *= 0.3; if (!Settings.shake) return; shakeA = Math.min(14, shakeA + a); }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const SM = () => 'smoke' + ((Math.random() * 5) | 0);
  function smoke(x, y, n, size, dark, life, z) { for (let i = 0; i < n; i++) { const g = dark ? rnd(40, 70) : rnd(150, 200); spawn({ x: x + rnd(-size, size) * 0.4, y: y + rnd(-size, size) * 0.4, z: z || 0, vx: rnd(-12, 12), vy: rnd(-12, 12), max: (life || 3) * rnd(0.7, 1.3), s0: size / 34 * rnd(0.5, 0.9), s1: size / 34 * rnd(1.6, 2.6), spr: SM(), c0: [g, g * 0.98, g * 0.95, dark ? 190 : 170], c1: [g + 25, g + 24, g + 22, 0], vr: rnd(-0.4, 0.4), wind: 1, drag: 0.6, layer: 2, rise: rnd(6, 14) }); } }
  // diesel exhaust: small, thin blue-grey wisps that rise and disperse quickly (no dark blobs trailing the vehicle)
  function exhaust(x, y, k) { k = k || 1; const g = rnd(96, 122); spawn({ x: x + rnd(-1, 1), y: y + rnd(-1, 1), z: 4, vx: rnd(-6, 6), vy: rnd(-6, 6), max: rnd(0.8, 1.2) * k, s0: 0.09, s1: rnd(0.26, 0.36) * k, spr: SM(), c0: [g, g + 2, g + 6, 92], c1: [g + 40, g + 40, g + 42, 0], vr: rnd(-0.5, 0.5), wind: 1.2, drag: 0.9, layer: 2, rise: rnd(10, 16) }); }
  function dust(x, y, n, size, col) { col = col || [170, 150, 118]; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = rnd(10, 50); spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, max: rnd(0.8, 1.8), s0: size / 34 * rnd(0.4, 0.7), s1: size / 34 * rnd(1.2, 2), spr: SM(), c0: [col[0], col[1], col[2], 170], c1: [col[0] + 15, col[1] + 15, col[2] + 15, 0], drag: 2.2, wind: 0.5, layer: 1 }); } }
  function fireball(x, y, n, size, life, z) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = rnd(4, 26) * size / 30; spawn({ x: x + rnd(-size, size) * 0.2, y: y + rnd(-size, size) * 0.25, z: z || 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, max: (life || 0.6) * rnd(0.7, 1.2), s0: size / 48 * rnd(0.35, 0.6), s1: size / 48 * rnd(0.85, 1.25), spr: 'fireball' + ((Math.random() * 3) | 0), c0: [255, 240, 215, 175], c1: [235, 110, 45, 0], add: true, drag: 2.4, vr: rnd(-1, 1), layer: 3 }); } }
  function sparks(x, y, n, sp, z) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = rnd(0.4, 1) * (sp || 220); spawn({ x, y, z: z || 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(20, 140), max: rnd(0.25, 0.7), s0: rnd(0.6, 1.1), s1: 0.3, spr: 'spark', c0: [255, 240, 200, 255], c1: [255, 120, 40, 0], add: true, g: 300, bounce: 0.3, stretch: 1, layer: 3 }); } }
  function debris(x, y, n, sp, kind, z) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = rnd(0.3, 1) * (sp || 120); spawn({ x, y, z: z || 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(60, 200), max: rnd(1.2, 2.4), s0: rnd(0.7, 1.4), s1: rnd(0.7, 1.4), spr: kind === 'clod' ? 'clod' + ((Math.random() * 3) | 0) : 'deb' + ((Math.random() * 4) | 0), c0: [255, 255, 255, 255], c1: [255, 255, 255, 255], fade: 0.85, g: 330, bounce: 0.35, vr: rnd(-12, 12), drag: 0.4, layer: 2, land: kind === 'clod' ? null : 'blast' }); } }
  function shock(x, y, size, a) { spawn({ x, y, max: 0.28, s0: size / 64 * 0.3, s1: size / 64 * 1.1, spr: 'shock', c0: [255, 245, 220, (a || 0.7) * 95], c1: [255, 220, 180, 0], add: true, layer: 3, r: 0 }); }
  function flashS(x, y, size, col) { spawn({ x, y, max: 0.08, s0: size / 32 * 0.7, s1: size / 32, spr: 'glow', c0: col || [255, 250, 230, 210], c1: [255, 200, 120, 0], add: true, layer: 3 }); }
  /* --- energy weapons of the fantasy troops (js/data/units_fx.js): bolts, beams, lightning, rail streaks --- */
  const EK = { laser: [255, 70, 55], pulse: [80, 190, 255], plasma: [110, 255, 130], zap: [160, 210, 255], beam: [255, 175, 70], rail: [170, 215, 255], ray: [200, 120, 255] };
  function hitGlow(x, y, c, k) {
    spawn({ x, y, max: 0.18, s0: 0.9 * k, s1: 1.7 * k, spr: 'glow', add: true, layer: 3, c0: [255, 255, 255, 230], c1: [c[0], c[1], c[2], 0] });
    for (let i = 0; i < 4 * k; i++) { const a = Math.random() * TAU, s = rnd(60, 180); spawn({ x, y, z: 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(20, 80), max: rnd(0.2, 0.45), s0: 0.8, s1: 0.2, spr: 'spark', c0: [255, 255, 255, 255], c1: [c[0], c[1], c[2], 0], add: true, g: 260, stretch: 1, layer: 3 }); }
    light(x, y, 60 * k, c[0] / 255, c[1] / 255, c[2] / 255, 0.12, 0.9);
  }
  function beamLine(x0, y0, x1, y1, c, wd, life) { const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return; const r = Math.atan2(y1 - y0, x1 - x0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    spawn({ x: mx, y: my, len: L, r, max: life, s0: wd * 2.6, s1: wd * 1.4, spr: 'beamfx', add: true, layer: 3, c0: [c[0], c[1], c[2], 170], c1: [c[0], c[1], c[2], 0] });
    spawn({ x: mx, y: my, len: L, r, max: life * 0.8, s0: wd, s1: wd * 0.4, spr: 'beamfx', add: true, layer: 3, c0: [255, 255, 255, 255], c1: [c[0], c[1], c[2], 0] }); }
  function energyShot(x0, y0, x1, y1, w) {
    const k = w.fxk, c = EK[k] || [255, 255, 255]; const L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return; const ang = Math.atan2(y1 - y0, x1 - x0);
    if (k === 'laser' || k === 'pulse') { const sp = k === 'laser' ? 2600 : 1900; const T = L / sp;
      spawn({ x: x0, y: y0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, max: T, s0: k === 'pulse' ? 1.9 : 1.6, spr: 'tracer', r: ang, add: true, layer: 3, c0: [255, 255, 255, 255], c1: [c[0], c[1], c[2], 230] });
      spawn({ x: x0, y: y0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, max: T, s0: k === 'pulse' ? 0.7 : 0.55, spr: 'glow', add: true, layer: 3, c0: [c[0], c[1], c[2], 170], c1: [c[0], c[1], c[2], 120] });
      setTimeoutFx(T, () => hitGlow(x1, y1, c, 0.6)); return; }
    if (k === 'zap') { const n = Math.max(3, Math.round(L / 14));
      for (let s = 0; s < 2; s++) { let px = x0, py = y0; for (let i = 1; i <= n; i++) { const f = i / n, j = i === n ? 0 : rnd(-7, 7); const nx = lerp(x0, x1, f) - Math.sin(ang) * j, ny = lerp(y0, y1, f) + Math.cos(ang) * j;
        beamLine(px, py, nx, ny, s ? [255, 255, 255] : c, s ? 0.55 : 1.05, 0.14); px = nx; py = ny; } }
      hitGlow(x1, y1, c, 1); light(x0, y0, 90, 0.6, 0.8, 1, 0.12, 1); return; }
    const life = k === 'rail' ? 0.34 : k === 'ray' ? 0.3 : 0.17, wd = k === 'rail' ? 1.6 : k === 'ray' ? 2.3 : 1.15;
    beamLine(x0, y0, x1, y1, c, wd, life); hitGlow(x1, y1, c, k === 'rail' ? 1.5 : 0.9); light(x0, y0, 70, c[0] / 255, c[1] / 255, c[2] / 255, life, 0.8);
    if (k === 'rail') { const n = Math.min(16, Math.round(L / 16)); for (let i = 0; i < n; i++) { const f = i / Math.max(1, n); spawn({ x: lerp(x0, x1, f), y: lerp(y0, y1, f), vx: rnd(-10, 10), vy: rnd(-10, 10), max: rnd(0.6, 1.1), s0: 0.22, s1: 0.75, spr: SM(), c0: [205, 222, 240, 120], c1: [220, 230, 245, 0], wind: 0.6, layer: 2 }); } shake(2.2); }
    if (k === 'ray') { decal('scorch' + ((Math.random() * 2) | 0), x1, y1, undefined, 0.35, 60, 0.5); }
  }
  function energyMuzzle(x, y, w) { const c = EK[w.fxk] || [255, 255, 255]; const big = w.fxk === 'rail' || w.fxk === 'plasma';
    spawn({ x, y, max: 0.09, s0: big ? 1.6 : 0.8, s1: big ? 2.1 : 1.1, spr: 'glow', add: true, layer: 3, c0: [255, 255, 255, 230], c1: [c[0], c[1], c[2], 0] }); light(x, y, big ? 140 : 60, c[0] / 255, c[1] / 255, c[2] / 255, 0.09, 0.9); if (w.fxk === 'rail') shake(1.4); }
  function plasmaBurst(x, y, s) { const c = EK.plasma;
    spawn({ x, y, max: 0.3, s0: s / 26, s1: s / 12, spr: 'glow', add: true, layer: 3, c0: [235, 255, 235, 255], c1: [c[0], c[1], c[2], 0] }); shock(x, y, s * 2.4, 0.6);
    for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, v = rnd(80, 260); spawn({ x, y, z: 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rnd(40, 160), max: rnd(0.3, 0.7), s0: 1, s1: 0.2, spr: 'spark', c0: [220, 255, 220, 255], c1: [c[0], c[1], c[2], 0], add: true, g: 280, stretch: 1, layer: 3 }); }
    smoke(x, y, 2, s * 0.6, true, 2.4); light(x, y, s * 3, 0.45, 1, 0.55, 0.3, 1.1); decal('scorch' + ((Math.random() * 2) | 0), x, y, undefined, s / 26, 120, 0.8); }
  /* --- API called by simulation --- */
  const api = {
    hoverWash(u) { const d = u.def; const g = d.legs ? [150, 135, 108] : [190, 205, 215]; if (d.legs) { decal('tire', u.x, u.y, u.a + PI / 2, d.r / 18, 18, 0.5); } if (Math.random() < 0.8) spawn({ x: u.x - Math.cos(u.a) * d.r * 0.7, y: u.y - Math.sin(u.a) * d.r * 0.7, vx: -Math.cos(u.a) * 18 + rnd(-10, 10), vy: -Math.sin(u.a) * 18 + rnd(-10, 10), max: rnd(0.6, 1.1), s0: 0.25 * d.r / 9, s1: 0.8 * d.r / 9, spr: SM(), c0: [g[0], g[1], g[2], 90], c1: [g[0], g[1], g[2], 0], drag: 1.6, wind: 0.6, layer: 1 }); },
    muzzle(e, w, x, y, ang) {
      const fx = w.fx; if (!fx) return; if (w.fxk) { energyMuzzle(x, y, w); return; }
      if (fx === 'rifle' || fx === 'mg' || fx === 'sniper') { spawn({ x, y, max: 0.05, s0: fx === 'mg' ? 1.3 : fx === 'sniper' ? 1.2 : 0.85, s1: 1.1, spr: 'mf_small', r: ang + rnd(-0.15, 0.15), add: true, layer: 3, c0: [255, 255, 255, 255], c1: [255, 200, 120, 0] }); light(x, y, fx === 'mg' ? 55 : 40, 1, 0.75, 0.4, 0.06, 0.6); if (fx === 'sniper') smoke(x, y, 1, 8, false, 0.8); }
      else if (fx === 'auto') { spawn({ x, y, max: 0.06, s0: 1.6, s1: 1.9, spr: 'mf_small', r: ang, add: true, layer: 3 }); light(x, y, 70, 1, 0.7, 0.35, 0.07, 0.8); spawn({ x, y, z: 4, vx: Math.cos(ang + 1.7) * 60, vy: Math.sin(ang + 1.7) * 60, vz: 60, max: 1.2, s0: 1.4, spr: 'casing', g: 320, bounce: 0.3, vr: 18, layer: 2, fade: 0.6 }); }
      else if (fx === 'cannon' || fx === 'cannonB') {
        spawn({ x, y, max: 0.1, s0: 0.9, s1: 1.25, spr: 'mf_cannon', r: ang, add: true, layer: 3 }); if (fx === 'cannonB') spawn({ x, y, max: 0.1, s0: 0.9, s1: 1.1, spr: 'mf_brake', r: ang, add: true, layer: 3 });
        flashS(x, y, 46); light(x, y, 190, 1, 0.75, 0.4, 0.14, 1.3); shake(w.shake ? w.shake * 6 : 1.5);
        // blast smoke & ground dust ring around the vehicle
        for (let i = 0; i < 4; i++) spawn({ x: x + Math.cos(ang) * rnd(2, 12), y: y + Math.sin(ang) * rnd(2, 12), vx: Math.cos(ang) * rnd(30, 90) + rnd(-15, 15), vy: Math.sin(ang) * rnd(30, 90) + rnd(-15, 15), max: rnd(1.4, 2.6), s0: 0.35, s1: rnd(1.1, 1.7), spr: SM(), c0: [205, 200, 190, 190], c1: [215, 210, 200, 0], drag: 1.6, wind: 1, layer: 2 });
        if (e.k === 'u') { const bx = e.x, by = e.y; for (let i = 0; i < 7; i++) { const a = ang + PI + rnd(-1.3, 1.3); spawn({ x: bx + Math.cos(a) * 12, y: by + Math.sin(a) * 12, vx: Math.cos(a) * rnd(40, 90), vy: Math.sin(a) * rnd(40, 90), max: rnd(0.8, 1.5), s0: 0.4, s1: 1.2, spr: SM(), c0: [180, 160, 128, 140], c1: [190, 170, 140, 0], drag: 2.4, layer: 1 }); } }
      }
      else if (fx === 'how') { spawn({ x, y, max: 0.13, s0: 1.2, s1: 1.6, spr: 'mf_cannon', r: ang, add: true, layer: 3 }); spawn({ x, y, max: 0.12, s0: 1.2, s1: 1.4, spr: 'mf_brake', r: ang, add: true, layer: 3 }); flashS(x, y, 60); light(x, y, 240, 1, 0.75, 0.4, 0.18, 1.4); smoke(x + Math.cos(ang) * 10, y + Math.sin(ang) * 10, 6, 26, false, 3.5); dust(e.x, e.y, 8, 30); shake(2.2); }
      else if (fx === 'rpg' || fx === 'launch') { spawn({ x, y, max: 0.08, s0: 0.9, spr: 'mf_small', r: ang, add: true, layer: 3 }); light(x, y, 70, 1, 0.7, 0.35, 0.1, 0.8); const bx = x - Math.cos(ang) * 10, by = y - Math.sin(ang) * 10; for (let i = 0; i < 4; i++) spawn({ x: bx, y: by, vx: -Math.cos(ang) * rnd(40, 110) + rnd(-20, 20), vy: -Math.sin(ang) * rnd(40, 110) + rnd(-20, 20), max: rnd(1, 2), s0: 0.3, s1: rnd(0.8, 1.3), spr: SM(), c0: [215, 212, 205, 200], c1: [220, 218, 212, 0], drag: 2, wind: 1, layer: 2 }); }
      else if (fx === 'vls') { light(x, y, 150, 1, 0.65, 0.3, 0.25, 1.2); flashS(x, y, 34, [255, 230, 180, 230]); for (let i = 0; i < 8; i++) { const a = Math.random() * TAU; spawn({ x, y, vx: Math.cos(a) * rnd(20, 70), vy: Math.sin(a) * rnd(20, 70), max: rnd(2.5, 4), s0: 0.5, s1: rnd(1.6, 2.6), spr: SM(), c0: [228, 226, 220, 210], c1: [232, 230, 226, 0], drag: 1.2, wind: 1.1, layer: 2, rise: rnd(8, 18) }); } }
      else if (fx === 'mortar') { spawn({ x, y, max: 0.07, s0: 0.8, s1: 1, spr: 'mf_small', r: ang, add: true, layer: 3 }); light(x, y, 70, 1, 0.7, 0.35, 0.08, 0.8); smoke(x, y, 2, 12, false, 2); }
      else if (fx === 'mlrs' || fx === 'sam') { light(x, y, 120, 1, 0.65, 0.3, 0.2, 1); for (let i = 0; i < 5; i++) spawn({ x: x - Math.cos(ang) * rnd(4, 20), y: y - Math.sin(ang) * rnd(4, 20), vx: -Math.cos(ang) * rnd(20, 90) + rnd(-25, 25), vy: -Math.sin(ang) * rnd(20, 90) + rnd(-25, 25), max: rnd(2, 3.5), s0: 0.4, s1: rnd(1.4, 2.2), spr: SM(), c0: [220, 216, 208, 210], c1: [225, 222, 216, 0], drag: 1.5, wind: 1.2, layer: 2 }); spawn({ x, y, max: 0.12, s0: 1.1, spr: 'mf_rocket', r: ang + PI, add: true, layer: 3 }); }
    },
    tracer(x0, y0, x1, y1, w, z) {
      if (w.fxk) { energyShot(x0, y0, x1, y1 - (z || 0) * 0.25, w); return; }
      const L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return; const ang = Math.atan2(y1 - y0, x1 - x0); const sp = 2400;
      if (Math.random() < (w.tracer || 0.3)) spawn({ x: x0, y: y0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, max: L / sp, s0: w.t === 'auto' || w.t === 'aagun' ? 1.4 : 1, spr: 'tracer', r: ang, add: true, layer: 3, c0: [255, 255, 255, 255], c1: [255, 230, 180, 220] });
    },
    // point defence: a stream of tracers walking onto the incoming round, then (on a kill) a small high airburst
    ciws(x0, y0, x1, y1, z, kill) { const yy = y1 - z * 0.25; const ang = Math.atan2(yy - y0, x1 - x0); const L = Math.hypot(x1 - x0, yy - y0); for (let k = 0; k < 4; k++) { const sp = 2600; spawn({ x: x0 + rnd(-2, 2), y: y0 + rnd(-2, 2), vx: Math.cos(ang + rnd(-0.04, 0.04)) * sp, vy: Math.sin(ang + rnd(-0.04, 0.04)) * sp, max: L / sp, s0: 1.3, spr: 'tracer', r: ang, add: true, layer: 3, c0: [255, 240, 200, 255], c1: [255, 200, 120, 200] }); }
      spawn({ x: x0, y: y0, max: 0.06, s0: 1.4, s1: 1.7, spr: 'mf_small', r: ang, add: true, layer: 3 }); light(x0, y0, 60, 1, 0.75, 0.4, 0.06, 0.8);
      if (kill) { fireball(x1, yy, 3, 16, 0.4, 0); sparks(x1, yy, 10, 220, z); smoke(x1, yy, 2, 14, true, 2.2); light(x1, y1, 110, 1, 0.65, 0.3, 0.15, 1); } },
    // SAM site interceptor: fast smoke streak up to the threat and a bright kill flash
    samKill(x0, y0, x1, y1, z, kill) { const yy = y1 - z * 0.25; const n = Math.max(4, Math.round(Math.hypot(x1 - x0, yy - y0) / 26)); for (let k = 1; k <= n; k++) { const f = k / n; spawn({ x: lerp(x0, x1, f) + rnd(-2, 2), y: lerp(y0, yy, f) + rnd(-2, 2), max: rnd(1.6, 2.4), s0: 0.22, s1: 0.8, spr: 'trail' + ((Math.random() * 2) | 0), c0: [226, 224, 220, 150], c1: [236, 234, 230, 0], drag: 0.8, wind: 1, layer: 3 }); }
      spawn({ x: x0, y: y0, max: 0.12, s0: 1.1, spr: 'mf_rocket', r: Math.atan2(yy - y0, x1 - x0) + PI, add: true, layer: 3 }); if (kill) { fireball(x1, yy, 5, 30, 0.6, 0); flashS(x1, yy, 40); sparks(x1, yy, 16, 300, z); smoke(x1, yy, 3, 24, true, 3); light(x1, y1, 200, 1, 0.65, 0.3, 0.3, 1.2); } },
    impact(x, y, w, hard) {
      if (w.fxk) { if (hard) hitGlow(x, y, EK[w.fxk] || [255, 255, 255], 0.7); return; }
      if (w.t === 'rifle' || w.t === 'mg' || w.t === 'sniper') { if (hard || Math.random() < 0.5) sparks(x, y, hard ? 3 : 1, 120); else dust(x + rnd(-3, 3), y + rnd(-3, 3), 1, 10); }
      else { fireball(x, y, 2, 16, 0.3); sparks(x, y, 6, 160); dust(x, y, 2, 14); }
    },
    trail(x, y, z, kind) {
      if (kind === 'jet') { if (z > 100) spawn({ x, y: y - z * 0.25, max: 1.8, s0: 0.22, s1: 0.65, spr: 'trail' + ((Math.random() * 2) | 0), c0: [238, 240, 242, 55], c1: [240, 242, 244, 0], layer: 4, wind: 0.6 }); return; }
      if (kind === 'burn') { fireball(x, y - z * 0.25, 1, 12, 0.3, 0); smoke(x, y - z * 0.25, 1, 14, true, 2.2); return; }
      const g = kind === 'mlrs' ? 205 : 222; spawn({ x: x + rnd(-1, 1), y: y - z * 0.25 + rnd(-1, 1), z: 0, max: (kind === 'aamis' ? 1.5 : 2.4) * rnd(0.85, 1.15), s0: 0.26, s1: kind === 'mlrs' ? 1.35 : 1.1, spr: 'trail' + ((Math.random() * 2) | 0), c0: [g, g, g - 4, 150], c1: [g + 12, g + 12, g + 10, 0], vr: rnd(-0.3, 0.3), drag: 0.8, wind: 1, layer: 3 });
      spawn({ x, y: y - z * 0.25, max: 0.05, s0: 0.6, spr: 'glow', add: true, layer: 3, c0: [255, 220, 150, 255], c1: [255, 150, 60, 0] }); if (Math.random() < 0.4) light(x, y, 50, 1, 0.65, 0.3, 0.06, 0.5);
    },
    explode(x, y, z, p, direct) {
      const dt = p.dt || 'he', s = p.splash || 10, dmg = p.dmg || 100; const yy = y - (z || 0) * 0.25;
      if (p.special === 'hyper' || p.special === 'ballistic') { mega(x, y, p.splash * 1.1); return; }
      if (p.w && p.w.fxk === 'plasma' && !p.water) { plasmaBurst(x, y, s); SND.at('expS', x, y); return; }
      if (p.water && typeof GAME !== 'undefined' && GAME && GAME.map && GAME.map.theme === 'lava') p.water = false; // shells land in lava: fire, not splashes
      if (p.water && !(dt === 'aa' || z > 15)) { splashFx(x, y, Math.max(14, s * 0.9 + dmg / 30), dmg >= 300); light(x, y, 60 + s, 0.9, 0.8, 0.6, 0.08, 0.6); SND.at(dmg >= 300 ? 'splashL' : 'splash', x, y); return; }
      if (dt === 'aa' || z > 15) { fireball(x, yy, 4, 22, 0.5); sparks(x, yy, 10, 200, z); smoke(x, yy, 3, 18, true, 2.5); light(x, y, 160, 1, 0.6, 0.3, 0.2, 1.2); SND.at('airburst', x, y); return; }
      if (dt === 'ap') { if (direct) { flashS(x, y, 30); sparks(x, y, 14, 260); smoke(x, y, 1, 14, true, 1.6); light(x, y, 110, 1, 0.8, 0.5, 0.1, 1); SND.at('hitArmor', x, y); } else { dust(x, y, 7, 28); debris(x, y, 4, 80, 'clod'); decal('crater0', x, y, undefined, 0.45, 70); SND.at('expS', x, y); } return; }
      if (dt === 'thermo') { fireball(x, y, 7, s * 0.9, 1.1); shock(x, y, s * 2.4, 0.6); smoke(x, y, 5, s * 0.8, true, 4); light(x, y, s * 3, 1, 0.55, 0.2, 0.5, 1.1); decal('scorch' + ((Math.random() * 2) | 0), x, y, undefined, s / 22, 150); shake(3); SND.at('expL', x, y); return; }
      const big = dmg >= 400 || s >= 60; const med = !big && (s >= 20 || dmg >= 150);
      if (big) { fireball(x, y, 7, s * 0.62, 0.8); flashS(x, y, s * 1.1); shock(x, y, s * 2.6, 0.7); smoke(x, y, 7, s * 0.7, true, 5); dust(x, y, 9, s * 0.7); debris(x, y, 10, 220, 'clod'); sparks(x, y, 16, 300); light(x, y, s * 3, 1, 0.6, 0.25, 0.4, 1.1); decal('crater' + ((Math.random() * 3) | 0), x, y, undefined, s / 28, 160); decal('scorch' + ((Math.random() * 2) | 0), x, y, undefined, s / 26, 160, 0.85); shake(dt === 'bomb' ? 5 : 3.2); SND.at(dt === 'bomb' ? 'expXL' : 'expL', x, y); }
      else if (med) { fireball(x, y, 4, s * 0.55 + 10, 0.55); flashS(x, y, s * 0.8 + 14); smoke(x, y, 3, s * 0.65 + 8, true, 3.4); dust(x, y, 4, s * 0.7 + 6); debris(x, y, 5, 150, Math.random() < 0.5 ? 'clod' : 'deb'); sparks(x, y, 8, 220); light(x, y, s * 2.4 + 45, 1, 0.62, 0.28, 0.28, 0.9); decal(direct ? 'scorch0' : 'crater' + ((Math.random() * 3) | 0), x, y, undefined, (s + 10) / 34, 110, 0.85); shake(1.2); SND.at('expM', x, y); }
      else { fireball(x, y, 2, 14, 0.3); sparks(x, y, 5, 150); dust(x, y, 2, 12); light(x, y, 70, 1, 0.65, 0.3, 0.1, 0.8); SND.at('expS', x, y); }
    },
    splash(x, y, s, big) { splashFx(x, y, s, big); },
    heal(u) { spawn({ x: u.x + rnd(-4, 4), y: u.y + rnd(-4, 4), vy: -14, max: 0.9, s0: 0.5, s1: 0.8, spr: 'plus', c0: [255, 120, 110, 230], c1: [255, 160, 150, 0], add: true, layer: 4, r: 0 }); },
    emerge(x, y, big) { dust(x, y, big ? 14 : 6, big ? 40 : 22, [150, 130, 100]); debris(x, y, big ? 8 : 3, 90, 'clod'); if (big) { flashS(x, y, 40, [255, 240, 200, 200]); shock(x, y, 90, 0.4); } SND.at(big ? 'reinforce' : 'dig', x, y); },
    aps(t, x, y) { flashS(x, y, 20); sparks(x, y, 12, 200); fireball(x, y, 2, 10, 0.25); smoke(x, y, 2, 10, false, 1.5); light(x, y, 90, 1, 0.7, 0.4, 0.1, 1); },
    death(u) {
      const d = u.def; const x = u.x, y = u.y;
      if (d.cls === 'inf') { dust(x, y, 2, 10); SND.at('infDie', x, y); return; }
      if (d.cls === 'air') {
        const z = u.z || 0, yy = y - z * 0.25;
        fireball(x, yy, 6, d.jet ? 30 : 24, 0.7); flashS(x, yy, 34); sparks(x, yy, 22, 300, z); smoke(x, yy, 4, 22, true, 3); light(x, y, 170, 1, 0.6, 0.28, 0.35, 1.2); SND.at('airburst', x, y);
        if (z > 12 && G_spr(u.type + ':wreck')) { const sp = (u.spd || 0) * 0.6 + 20; DEB.push({ spr: u.type + ':wreck', x, y, z, vx: Math.cos(u.a) * sp, vy: Math.sin(u.a) * sp, vz: 30, r: u.a, vr: rnd(-3, 3) * (d.jet ? 0.4 : 1), t: 0, life: 45, crash: d.jet ? 2 : 1, ft: 0 }); }
        else crashBoom(x, y, 1);
        return;
      }
      const heavy = d.armor >= ARM.MED;
      fireball(x, y, heavy ? 6 : 5, heavy ? 22 : 18, 0.8); flashS(x, y, 36); shock(x, y, 70, 0.45); smoke(x, y, heavy ? 6 : 4, 28, true, 4.5); sparks(x, y, 22, 320); debris(x, y, heavy ? 12 : 8, 200, 'deb');
      light(x, y, 190, 1, 0.6, 0.25, 0.55, 1.2); decal('scorch' + ((Math.random() * 2) | 0), x, y, undefined, 1.4, 180, 0.9); shake(3); SND.at(heavy ? 'vehDieH' : 'vehDie', x, y);
      // turret toss (catastrophic kill)
      const va = VART[u.type]; if (va && va.tur && heavy && Math.random() < 0.55) { const a = Math.random() * TAU; const tx = x + Math.cos(u.a) * (va.tx || 0), ty = y + Math.sin(u.a) * (va.tx || 0); DEB.push({ spr: u.type + ':wtur', x: tx, y: ty, z: 4, vx: Math.cos(a) * rnd(20, 60), vy: Math.sin(a) * rnd(20, 60), vz: rnd(160, 260), r: u.ta, vr: rnd(-6, 6), t: 0, life: 70, gun: u.type + ':gun' }); u.turretOff = true; }
      // secondary cook-off
      for (let i = 1; i <= 3; i++) setTimeoutFx(i * 0.35 + Math.random() * 0.3, () => { fireball(x + rnd(-8, 8), y + rnd(-8, 8), 2, 14, 0.45); sparks(x, y, 12, 260); SND.at('cookoff', x, y); light(x, y, 140, 1, 0.6, 0.25, 0.2, 1.2); });
    },
    airHit(u) { fireball(u.x, u.y - u.z * 0.25, 4, 20, 0.5); sparks(u.x, u.y - u.z * 0.25, 14, 220, u.z); SND.at('airburst', u.x, u.y); },
    bdeath(b) {
      const W = b.w * TILE, H = b.h * TILE; const n = Math.min(10, 3 + b.w * b.h / 2);
      for (let i = 0; i < n; i++) setTimeoutFx(i * 0.18 + Math.random() * 0.15, () => { const x = b.x + rnd(-W, W) * 0.4, y = b.y + rnd(-H, H) * 0.4; fireball(x, y, 6, 44, 0.9); smoke(x, y, 4, 40, true, 6); debris(x, y, 8, 200, 'deb'); sparks(x, y, 10, 260); light(x, y, 280, 1, 0.6, 0.25, 0.5, 1.6); shake(2.5); SND.at('expL', x, y); });
      smoke(b.x, b.y, 14, Math.max(W, H) * 0.5, false, 7); dust(b.x, b.y, 18, Math.max(W, H) * 0.45); shock(b.x, b.y, Math.max(W, H) * 2.4, 0.6); SND.at('collapse', b.x, b.y);
    },
    treeDown(tr, ang, burn) { DEB.push({ spr: tr.t, x: tr.x, y: tr.y, z: 0, vx: 0, vy: 0, vz: 0, r: tr.r, vr: 0, t: 0, life: burn ? 3 : 90, tree: 1, fallA: ang, s: tr.s, burn }); if (burn) { fireball(tr.x, tr.y, 2, 16, 0.5); smoke(tr.x, tr.y, 2, 16, true, 3); } else dust(tr.x, tr.y, 3, 16, [120, 120, 80]); },
    tracks(u) { const d = u.def; const m = GAME && GAME.map; let col = [170, 150, 118]; if (m) { const tx = Math.floor(u.x / TILE), ty = Math.floor(u.y / TILE); if (m.inb(tx, ty)) { const l = m.domLayer(tx, ty); col = l === TL.SNOW ? [235, 238, 242] : l === TL.SAND ? [214, 190, 150] : l === TL.GRASS || l === TL.FOREST ? [128, 120, 88] : [168, 148, 116]; } }
      const s = d.r / 9; decal(d.mob === 'wheel' ? 'tire' : 'track', u.x - Math.cos(u.a) * d.r * 0.6, u.y - Math.sin(u.a) * d.r * 0.6, u.a, s, 26, 0.9);
      if (u.spd > d.speed * 0.5 && Math.random() < 0.7) spawn({ x: u.x - Math.cos(u.a) * d.r, y: u.y - Math.sin(u.a) * d.r, vx: -Math.cos(u.a) * 10 + rnd(-8, 8), vy: -Math.sin(u.a) * 10 + rnd(-8, 8), max: rnd(0.8, 1.6), s0: 0.3 * s, s1: 0.9 * s, spr: SM(), c0: [col[0], col[1], col[2], 110], c1: [col[0], col[1], col[2], 0], drag: 1.5, wind: 0.6, layer: 1 });
    },
    money(x, y, v) { T.push({ x, y, txt: '+$' + v, t: 0, life: 1.6, col: '#9fe07a' }); },
    text(x, y, txt, col) { T.push({ x, y, txt, t: 0, life: 1.8, col: col || '#fff' }); },
    weld(t, by) { const x = t.x + rnd(-10, 10), y = t.y + rnd(-10, 10); sparks(x, y, 4, 90); light(x, y, 40, 0.6, 0.8, 1, 0.08, 0.8); if (Math.random() < 0.3) SND.at('weld', x, y); },
    work(b, u, stage) {
      const x = lerp(u.x, b.x, 0.45) + rnd(-12, 12), y = lerp(u.y, b.y, 0.45) + rnd(-12, 12);
      if (stage === 'dig') { dust(x, y, 2, 16, [140, 118, 86]); debris(x, y, 1, 40, 'clod'); SND.at('dig', x, y); }
      else if (stage === 'frame') { sparks(x, y, 3, 80, 20); light(x, y, 40, 0.6, 0.8, 1, 0.06, 0.7); SND.at(Math.random() < 0.5 ? 'hammer' : 'weld', x, y); }
      else if (stage === 'pour') { dust(x, y, 1, 12, [190, 188, 180]); SND.at('pour', x, y); }
      else if (stage === 'pave') { smoke(x, y, 1, 10, false, 1.5); SND.at('roller', x, y); }
      else { if (Math.random() < 0.5) sparks(x, y, 2, 60); SND.at('hammer', x, y); }
    },
    stage(b) { dust(b.x, b.y, 6, b.w * 10); },
    built(b) { if (GAME && GAME.tick > 1) { dust(b.x, b.y, 10, b.w * 12, [190, 186, 176]); } },
    bldBurn(b) { const x = b.x + rnd(-b.w, b.w) * 12, y = b.y + rnd(-b.h, b.h) * 12; fireball(x, y, 1, 14, 0.5); smoke(x, y, 1, 22, true, 4); light(x, y, 80, 1, 0.55, 0.2, 0.3, 0.8); },
    sell(b) { dust(b.x, b.y, 14, b.w * 14, [180, 176, 166]); },
    promote(u) { flashS(u.x, u.y, 30, [255, 230, 140, 255]); T.push({ x: u.x, y: u.y - 14, txt: '★ ' + RANKS[u.rank].n, t: 0, life: 1.6, col: '#f2d27a' }); },
    spawn(u, b) { if (u.def.cls === 'veh') dust(u.x, u.y, 3, 18); },
    para(u) { DEB.push({ spr: 'chute', x: u.x, y: u.y, z: 120, vx: rnd(-10, 10), vy: rnd(-10, 10), vz: -75, r: 0, vr: 0.4, t: 0, life: 1.7, chute: 1, uid: u.id }); },
    flyby(G, pid, kind, sx, sy, x, y, delay) {
      const pl = G.players[pid]; const a = Math.atan2(y - sy, x - sx); const sprite = kind === 'para' || kind === 'recon' ? pl.f + '_jet:body' : pl.f + '_jet:body';
      const speed = 520; const startD = 1200; const ox = x - Math.cos(a) * startD, oy = y - Math.sin(a) * startD; const n = kind === 'strike' ? 2 : 1;
      for (let i = 0; i < n; i++) FB.push({ spr: sprite, x: ox - Math.sin(a) * (i * 40 - 20 * (n - 1)), y: oy + Math.cos(a) * (i * 40 - 20 * (n - 1)), a, sp: speed, t: -(delay || 0), life: (startD * 2) / speed, z: kind === 'recon' ? 260 : 170, tp: pl.tp, big: kind === 'para' });
      setTimeoutFx(delay || 0, () => SND.at('jetPass', x, y, 1.2));
    },
  };
  // water column + spray ring + foam for anything hitting the sea
  function splashFx(x, y, s, big) {
    const n = big ? 14 : 7; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = rnd(20, big ? 110 : 60); spawn({ x, y, z: 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(60, big ? 260 : 150), max: rnd(0.7, 1.3), s0: s / 40 * rnd(0.3, 0.6), s1: s / 40 * rnd(0.6, 1), spr: 'drop', c0: [240, 246, 250, 230], c1: [225, 236, 242, 0], g: 360, layer: 3 }); }
    for (let i = 0; i < (big ? 6 : 3); i++) spawn({ x: x + rnd(-s, s) * 0.2, y: y + rnd(-s, s) * 0.2, max: rnd(1.2, 2.2), s0: s / 44 * 0.6, s1: s / 44 * rnd(1.6, 2.4), spr: 'foam' + ((Math.random() * 3) | 0), c0: [245, 248, 250, 200], c1: [230, 238, 242, 0], drag: 1.6, layer: 2, rise: rnd(10, 24) });
    spawn({ x, y, max: 1.1, s0: s / 64 * 0.4, s1: s / 64 * 2.2, spr: 'ringthin', c0: [235, 245, 250, 150], c1: [230, 240, 248, 0], layer: 1, r: 0 });
    spawn({ x, y, max: 3, s0: s / 44 * 0.8, s1: s / 44 * 2.4, spr: 'foam0', c0: [228, 238, 242, 120], c1: [220, 232, 238, 0], layer: 1 });
  }
  function G_spr(n) { return typeof ATLAS !== 'undefined' && ATLAS.get ? ATLAS.get(n) : true; }
  function crashBoom(x, y, k) {
    fireball(x, y, 5 + k * 2, 24 + k * 6, 0.8); flashS(x, y, 40); shock(x, y, 70 + k * 20, 0.45); smoke(x, y, 6 + k * 2, 28, true, 5); dust(x, y, 8, 26); debris(x, y, 10, 200, 'deb'); sparks(x, y, 20, 300);
    light(x, y, 180, 1, 0.6, 0.25, 0.5, 1.1); decal('scorch' + ((Math.random() * 2) | 0), x, y, undefined, 1.2 + k * 0.3, 160, 0.9); decal('crater' + ((Math.random() * 3) | 0), x, y, undefined, 0.7, 160, 0.8); shake(2.5); SND.at('vehDieH', x, y);
  }
  function mega(x, y, r) {
    fireball(x, y, 22, r * 1.6, 1.6); flashS(x, y, r * 4); shock(x, y, r * 6, 1); shock(x, y, r * 3.6, 0.7); smoke(x, y, 22, r * 1.2, true, 9); dust(x, y, 24, r * 1.1); debris(x, y, 24, 360, 'clod'); sparks(x, y, 40, 420);
    light(x, y, r * 8, 1, 0.6, 0.25, 1.4, 2.4); decal('crater' + ((Math.random() * 3) | 0), x, y, undefined, r / 16, 400); decal('scorch0', x, y, undefined, r / 11, 400, 0.95); shake(12); SND.at('mega', x, y, 2);
    for (let i = 1; i <= 4; i++) setTimeoutFx(i * 0.3, () => { fireball(x + rnd(-r, r) * 0.6, y + rnd(-r, r) * 0.6, 5, r * 0.8, 1); });
  }
  // fx timers (game-time based)
  const TM = []; let fxTime = 0;
  function setTimeoutFx(dt, fn) { TM.push({ at: fxTime + dt, fn }); }
  function update(dt) {
    fxTime += dt;
    for (let i = TM.length - 1; i >= 0; i--) if (TM[i].at <= fxTime) { const f = TM[i].fn; TM.splice(i, 1); try { f(); } catch (e) { } }
    for (let i = 0; i < maxP; i++) {
      const p = P[i]; if (!p.on) continue; p.life += dt; if (p.life >= p.max) { p.on = false; continue; }
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      if (p.wind) { p.x += wind[0] * p.wind * dt; p.y += wind[1] * p.wind * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.rise) p.z += p.rise * dt;
      if (p.g) { p.vz -= p.g * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; if (p.bounce && p.vz < -30) { p.vz = -p.vz * p.bounce; p.vx *= 0.6; p.vy *= 0.6; p.vr *= 0.5; } else { p.vz = 0; p.vx *= 0.8; p.vy *= 0.8; p.vr *= 0.8; if (p.land) { decal(p.land, p.x, p.y, undefined, 0.15, 30, 0.6); p.land = null; } } } }
    }
    for (let i = D.length - 1; i >= 0; i--) { const d = D[i]; d.t += dt; if (d.t > d.life) D.splice(i, 1); }
    for (let i = L.length - 1; i >= 0; i--) { const l = L[i]; l.t += dt; if (l.t > l.life) L.splice(i, 1); }
    for (let i = T.length - 1; i >= 0; i--) { const t = T[i]; t.t += dt; t.y -= 16 * dt; if (t.t > t.life) T.splice(i, 1); }
    for (let i = DEB.length - 1; i >= 0; i--) { const d = DEB[i]; d.t += dt;
      if (d.tree) { d.fall = Math.min(1, d.t / 0.9); if (d.t > d.life) DEB.splice(i, 1); continue; }
      if (d.chute) { d.z = Math.max(0, d.z + d.vz * dt); d.x += d.vx * dt; d.y += d.vy * dt; d.r += d.vr * dt; if (d.t > d.life) DEB.splice(i, 1); continue; }
      if (d.z > 0 || d.vz > 0) { d.vz -= 330 * dt; d.z += d.vz * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.r += d.vr * dt; if (d.z <= 0) { d.z = 0; if (d.crash) { crashBoom(d.x, d.y, d.crash); d.crash = 0; d.vz = 0; d.vx *= 0.15; d.vy *= 0.15; d.vr = 0; d.t = Math.max(d.t, 2); } else if (d.vz < -60) { d.vz = -d.vz * 0.25; d.vx *= 0.4; d.vy *= 0.4; dust(d.x, d.y, 4, 18); SND.at('clank', d.x, d.y); } else { d.vz = 0; d.vx = d.vy = d.vr = 0; } } }
      if ((d.ft = (d.ft || 0) - dt) <= 0 && d.t < 18) { if (d.crash) { d.ft = 0.05; fireball(d.x, d.y - d.z * 0.25, 1, 12, 0.3); smoke(d.x, d.y, 1, 16, true, 2.4, d.z); } else { d.ft = 0.3; smoke(d.x, d.y, 1, 14, true, 2.6); } }
      if (d.t > d.life) DEB.splice(i, 1); }
    for (let i = FB.length - 1; i >= 0; i--) { const f = FB[i]; f.t += dt; if (f.t < 0) continue; f.x += Math.cos(f.a) * f.sp * dt; f.y += Math.sin(f.a) * f.sp * dt; if (f.dz) f.z = Math.max(2, f.z - f.dz * dt); if (f.t > f.life) FB.splice(i, 1); }
    shakeA = Math.max(0, shakeA - dt * 18);
  }
  function clear() { for (const p of P) p.on = false; D.length = 0; L.length = 0; T.length = 0; FB.length = 0; DEB.length = 0; TM.length = 0; shakeA = 0; }
  function configure(q) { maxP = q >= 1 ? MAXP : q >= 0.75 ? 2000 : 1100; reduce = !!Settings.reduceMotion; }
  return Object.assign(api, { update, clear, configure, P, D, L, T, FB, DEB, wind, get shake() { return shakeA; }, setTimeoutFx, smoke, exhaust, dust, fireball, sparks, light, decal, mega, splashFx, spawn, get maxP() { return maxP; } });
})();
const Settings = { shake: true, reduceMotion: false, quality: 1, master: 0.9, sfx: 1, music: 0.55, amb: 0.7, bars: 'damaged', edge: true, speed: 1, fps: 60, hints: true, popups: true, achPop: true, rewardFx: true, mm: 2, upConfirm: true };
