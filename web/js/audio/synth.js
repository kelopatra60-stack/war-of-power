/* ============================================================
   War of Power — الصوت: التوليد الإجرائي والمازج
   الملف: js/audio/synth.js   ·   ترتيب التحميل: 27 من 43
   ============================================================ */
'use strict';
/* ===== Audio: procedural synthesis (worker) + mixer ===== */
function SYNTH_WORKER() {
  // runs inside a Web Worker (or main thread fallback). Generates Float32 sample buffers.
  let SR = 44100;
  const rnd = (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
  const N = sec => Math.max(1, Math.floor(sec * SR));
  function biq(type, f, q) { // returns process(x) closure (RBJ cookbook)
    const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * (q || 0.707));
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; }
    else { b0 = a; b1 = 0; b2 = -a; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; }
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0; let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    return x => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  }
  function filt(buf, type, f, q, passes) { for (let p = 0; p < (passes || 1); p++) { const fl = biq(type, f, q); for (let i = 0; i < buf.length; i++) buf[i] = fl(buf[i]); } return buf; }
  function noise(n) { const b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = rnd() * 2 - 1; return b; }
  function brown(n) { const b = new Float32Array(n); let v = 0; for (let i = 0; i < n; i++) { v = (v + (rnd() * 2 - 1) * 0.08) * 0.996; b[i] = v * 3; } return filt(b, 'hp', 22, 0.707); } // DC-blocked
  function env(buf, a, d, shape) { const n = buf.length, na = N(a); for (let i = 0; i < n; i++) { const t = i / SR; const e = i < na ? i / na : Math.exp(-(t - a) / d); buf[i] *= shape ? Math.pow(e, shape) : e; } return buf; }
  function add(dst, src, g, off) { off = N(off || 0); for (let i = 0; i < src.length && i + off < dst.length; i++) dst[i + off] += src[i] * g; return dst; }
  function sweep(n, f0, f1, k, wave) { const b = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / n; const f = f1 + (f0 - f1) * Math.exp(-t * (k || 5)); ph += 2 * Math.PI * f / SR; b[i] = wave === 'saw' ? ((ph / Math.PI) % 2) - 1 : wave === 'tri' ? Math.asin(Math.sin(ph)) * 0.63 : Math.sin(ph); } return b; }
  function drive(buf, k) { for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * k) / Math.tanh(k); return buf; }
  function norm(buf, pk) { let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); if (m > 0) { const k = (pk || 0.9) / m; for (let i = 0; i < buf.length; i++) buf[i] *= k; } return buf; }
  function fade(buf, t) { const n = Math.min(buf.length, N(t)); for (let i = 0; i < n; i++) buf[buf.length - 1 - i] *= i / n; return buf; }
  function echo(buf, dl, g, n) { const d = N(dl); for (let k = 1; k <= (n || 2); k++) { const gg = Math.pow(g, k); for (let i = buf.length - 1; i >= d * k; i--) buf[i] += buf[i - d * k] * gg; } return buf; }
  function len(sec) { return new Float32Array(N(sec)); }
  // ---- building blocks ----
  function crack(sec, hp, dec) { return env(filt(noise(N(sec)), 'hp', hp, 0.8), 0.0004, dec); }
  function body(sec, lp, dec) { return env(filt(noise(N(sec)), 'lp', lp, 0.9, 2), 0.001, dec); }
  function thump(sec, f0, f1, dec, k) { return env(sweep(N(sec), f0, f1, k || 8), 0.001, dec); }
  function tail(sec, lo, hi, dec) { const b = filt(filt(noise(N(sec)), 'hp', lo, 0.7), 'lp', hi, 0.7); return env(b, 0.004, dec); }
  function pres(sec, f, q, dec, lp) { return env(filt(filt(noise(N(sec)), 'bp', f, q || 0.6), 'lp', lp || 4200, 0.7), 0.001, dec); } // mid 'presence' layer (audible on phone speakers)
  function ring(sec, fs, dec) { const b = len(sec); for (const f of fs) { const s = sweep(b.length, f * 1.02, f, 3); add(b, env(s, 0.0005, dec * (0.6 + rnd() * 0.8)), 0.35); } return b; }
  const S = {};
  S.rifle = v => { const b = len(0.6); add(b, crack(0.06, 2400 + v * 400, 0.006), 1.3); add(b, body(0.14, 2600, 0.026), 1.0); add(b, body(0.1, 700, 0.03), 0.45); add(b, thump(0.08, 170, 90, 0.02), 0.25); add(b, tail(0.6, 500, 3800, 0.13), 0.26, 0.012); echo(b, 0.085 + v * 0.02, 0.18, 2); return norm(fade(b, 0.05)); };
  S.mg = v => { const b = len(0.5); add(b, crack(0.05, 1900, 0.005), 1.15); add(b, body(0.13, 2100, 0.03), 0.95); add(b, body(0.12, 650, 0.032), 0.5); add(b, thump(0.1, 150, 80, 0.03), 0.32); add(b, tail(0.5, 400, 3000, 0.1), 0.24, 0.01); echo(b, 0.07, 0.16, 2); return norm(fade(b, 0.05)); };
  S.hmg = v => { const b = len(0.8); add(b, crack(0.06, 1600, 0.007), 1.1); add(b, body(0.2, 1700, 0.045), 1); add(b, body(0.2, 500, 0.05), 0.5); add(b, drive(thump(0.2, 130, 55, 0.05), 2), 0.33); add(b, tail(0.8, 300, 2600, 0.18), 0.3, 0.015); echo(b, 0.11, 0.2, 2); return norm(fade(b, 0.08)); };
  S.sniper = v => { const b = len(1.6); add(b, crack(0.07, 2800, 0.008), 1.4); add(b, body(0.25, 2300, 0.05), 0.9); add(b, body(0.25, 600, 0.06), 0.5); add(b, thump(0.25, 150, 50, 0.06), 0.45); add(b, tail(1.6, 250, 2800, 0.35), 0.32, 0.02); echo(b, 0.32, 0.3, 3); return norm(fade(b, 0.2)); };
  S.auto = v => { const b = len(0.9); add(b, crack(0.06, 1700, 0.008), 1.1); add(b, drive(thump(0.25, 130, 60, 0.05, 10), 2.5), 0.42); add(b, body(0.25, 1500, 0.05), 0.9); add(b, body(0.25, 450, 0.06), 0.5); add(b, ring(0.4, [1450, 2300], 0.06), 0.25); add(b, tail(0.9, 200, 1500, 0.2), 0.3, 0.02); echo(b, 0.12, 0.2, 2); return norm(fade(b, 0.1)); };
  S.aagun = v => { const b = len(0.7); add(b, crack(0.05, 1500, 0.008), 1.05); add(b, drive(thump(0.2, 110, 55, 0.045), 2.5), 0.42); add(b, body(0.2, 1400, 0.045), 0.85); add(b, body(0.2, 480, 0.05), 0.45); add(b, tail(0.7, 220, 1400, 0.16), 0.3, 0.015); return norm(fade(b, 0.08)); };
  S.chain = v => { const b = len(0.5); add(b, crack(0.05, 1600, 0.007), 1.05); add(b, drive(thump(0.15, 120, 60, 0.035), 2), 0.4); add(b, body(0.15, 1500, 0.035), 0.85); add(b, body(0.15, 500, 0.04), 0.45); add(b, tail(0.5, 300, 1500, 0.1), 0.25, 0.01); return norm(fade(b, 0.06)); };
  S.gmg = v => { const b = len(0.5); add(b, crack(0.04, 1500, 0.006), 0.9); add(b, pres(0.2, 900, 0.6, 0.04), 1); add(b, drive(thump(0.25, 90, 45, 0.07), 1.8), 0.7); add(b, body(0.2, 400, 0.04), 0.7); add(b, tail(0.5, 200, 900, 0.1), 0.2); return norm(fade(b, 0.06)); };
  S.cannon = v => { const b = len(3.2); add(b, crack(0.07, 1300, 0.01), 1.15); add(b, drive(thump(1.0, 95 - v * 8, 32, 0.35, 6), 3), 1.1); add(b, body(1.6, 260, 0.45), 1.0); add(b, body(0.5, 1800, 0.07), 0.8); add(b, pres(0.6, 950, 0.5, 0.11), 1.6); add(b, pres(0.3, 2600, 0.8, 0.035), 0.8); add(b, tail(3.2, 40, 320, 0.9), 0.55, 0.05); add(b, tail(3.2, 350, 1900, 0.55), 0.5, 0.07); echo(b, 0.38 + v * 0.05, 0.22, 3); return norm(fade(b, 0.5)); };
  S.cannonM = v => { const b = len(2.2); add(b, crack(0.06, 1300, 0.009), 1.05); add(b, drive(thump(0.7, 110, 40, 0.22, 7), 2.5), 1); add(b, body(1.0, 350, 0.3), 0.9); add(b, body(0.4, 1700, 0.06), 0.7); add(b, pres(0.5, 1000, 0.5, 0.09), 1.5); add(b, pres(0.25, 2700, 0.8, 0.03), 0.7); add(b, tail(2.2, 50, 450, 0.6), 0.45, 0.04); add(b, tail(2.2, 380, 2000, 0.4), 0.45, 0.06); echo(b, 0.3, 0.2, 2); return norm(fade(b, 0.4)); };
  S.how = v => { const b = len(4.2); add(b, crack(0.07, 900, 0.008), 0.8); add(b, pres(0.7, 800, 0.5, 0.14), 1.7); add(b, pres(0.3, 2400, 0.8, 0.04), 0.7); add(b, tail(4.2, 300, 1600, 0.8), 0.5, 0.08); add(b, drive(thump(1.4, 80, 26, 0.5, 5), 3.5), 1.2); add(b, body(2.2, 200, 0.6), 1.0); add(b, tail(4.2, 30, 260, 1.3), 0.6, 0.06); echo(b, 0.55, 0.3, 4); return norm(fade(b, 0.7)); };
  S.rpg = v => { const b = len(1.1); add(b, drive(thump(0.2, 140, 60, 0.05), 2), 0.9); add(b, crack(0.05, 1500, 0.006), 0.6); const w = filt(noise(N(1.0)), 'bp', 1600 + v * 300, 1.2); for (let i = 0; i < w.length; i++) { const t = i / w.length; w[i] *= Math.sin(Math.PI * Math.min(1, t * 6)) * Math.exp(-t * 3.5); } add(b, w, 0.7, 0.02); return norm(fade(b, 0.15)); };
  S.atgm = v => { const b = len(1.6); add(b, thump(0.15, 160, 80, 0.04), 0.7); add(b, crack(0.04, 1800, 0.005), 0.5); const w = filt(filt(noise(N(1.5)), 'hp', 1200, 0.7), 'lp', 6000, 0.7); for (let i = 0; i < w.length; i++) { const t = i / w.length; w[i] *= Math.min(1, t * 12) * Math.exp(-t * 2.2); } add(b, w, 0.75, 0.03); return norm(fade(b, 0.2)); };
  S.rkt = v => { const b = len(0.8); add(b, thump(0.12, 150, 70, 0.04), 0.6); const w = filt(noise(N(0.7)), 'bp', 2200, 0.9); for (let i = 0; i < w.length; i++) { const t = i / w.length; w[i] *= Math.min(1, t * 10) * Math.exp(-t * 4); } add(b, w, 0.8, 0.01); return norm(fade(b, 0.1)); };
  S.mlrs = v => { const b = len(2.0); add(b, drive(thump(0.4, 90, 40, 0.12), 2), 0.8); const r = filt(noise(N(1.9)), 'lp', 900, 0.7); const h = filt(noise(N(1.9)), 'hp', 2500, 0.7); for (let i = 0; i < r.length; i++) { const t = i / r.length; const e = Math.min(1, t * 8) * Math.exp(-t * 2); r[i] *= e; h[i] *= e * 0.6; } add(b, r, 0.9, 0.02); add(b, h, 0.5, 0.02); echo(b, 0.25, 0.18, 2); return norm(fade(b, 0.3)); };
  S.sam = v => { const b = len(2.4); add(b, drive(thump(0.4, 80, 35, 0.15), 2), 0.8); const r = filt(noise(N(2.3)), 'lp', 1500, 0.7); for (let i = 0; i < r.length; i++) { const t = i / r.length; r[i] *= Math.min(1, t * 6) * Math.exp(-t * 1.6); } add(b, r, 1, 0.02); echo(b, 0.3, 0.2, 2); return norm(fade(b, 0.4)); };
  function boom(sec, f0, lp, dec, tl) { const b = len(sec); add(b, crack(0.08, 900, 0.012), 0.8); add(b, drive(thump(sec * 0.5, f0, 24, dec * 0.6, 5), 3), 1.0); add(b, body(sec * 0.7, lp, dec), 0.9);
    add(b, pres(sec * 0.6, 650, 0.5, dec * 0.45, 2600), 2.0); // mid-band blast: keeps explosions audible on phone speakers
    add(b, pres(sec * 0.5, 1800, 0.8, dec * 0.18), 0.8); add(b, tail(sec, 30, lp * 1.2, tl), 0.6, 0.05); add(b, tail(sec, 300, 1500, tl * 0.6), 0.45, 0.08); return b; }
  function debrisRattle(sec, n) { const b = len(sec); for (let k = 0; k < n; k++) { const t = 0.15 + rnd() * (sec - 0.3); const c = env(filt(noise(N(0.05)), 'bp', 1500 + rnd() * 2500, 2), 0.0005, 0.008 + rnd() * 0.012); add(b, c, 0.15 + rnd() * 0.25, t); } return b; }
  S.expS = v => { const b = boom(1.2, 110, 600, 0.12, 0.3); add(b, debrisRattle(1.2, 6), 0.6); echo(b, 0.22, 0.18, 2); return norm(fade(b, 0.2)); };
  S.expM = v => { const b = boom(2.2, 90, 420, 0.3, 0.6); add(b, debrisRattle(2.0, 14), 0.7); echo(b, 0.34, 0.22, 3); return norm(fade(b, 0.4)); };
  S.expL = v => { const b = boom(3.4, 75, 320, 0.55, 1.0); add(b, debrisRattle(3.0, 26), 0.8); echo(b, 0.45, 0.25, 3); return norm(fade(b, 0.6)); };
  S.expXL = v => { const b = boom(4.6, 60, 260, 0.9, 1.5); add(b, debrisRattle(4.0, 40), 0.8); echo(b, 0.6, 0.28, 4); return norm(fade(b, 0.8)); };
  S.mega = v => { const b = boom(7.0, 45, 180, 1.8, 2.8); add(b, brown(N(7)).map((x, i) => x * Math.exp(-i / SR / 2.5) * Math.min(1, i / SR * 3)), 0.6); add(b, debrisRattle(6.5, 70), 0.7); echo(b, 0.8, 0.3, 4); return norm(fade(b, 1.2)); };
  S.airburst = v => { const b = boom(1.8, 120, 700, 0.18, 0.5); echo(b, 0.5, 0.3, 3); return norm(fade(b, 0.3)); };
  S.hitArmor = v => { const b = len(1.0); add(b, crack(0.04, 2500, 0.004), 0.8); add(b, ring(1.0, [620 + v * 40, 1180, 1870, 2650], 0.22), 1); add(b, body(0.3, 900, 0.05), 0.5); add(b, debrisRattle(0.8, 5), 0.6); return norm(fade(b, 0.2)); };
  S.cookoff = v => { const b = len(1.2); for (let k = 0; k < 9; k++) { const t = rnd() * 1.0; add(b, env(filt(noise(N(0.08)), 'bp', 600 + rnd() * 1800, 1.2), 0.0005, 0.012 + rnd() * 0.02), 0.4 + rnd() * 0.6, t); } add(b, boom(1.2, 100, 500, 0.15, 0.3), 0.4); return norm(fade(b, 0.2)); };
  S.vehDie = v => { const b = boom(3.2, 80, 380, 0.5, 0.9); add(b, ring(1.4, [380, 760, 1210], 0.35), 0.4, 0.05); add(b, debrisRattle(2.8, 30), 0.9); echo(b, 0.4, 0.24, 3); return norm(fade(b, 0.5)); };
  S.vehDieH = v => { const b = boom(4.0, 70, 300, 0.7, 1.2); add(b, ring(1.8, [300, 610, 980, 1430], 0.45), 0.45, 0.05); add(b, debrisRattle(3.5, 40), 0.9); echo(b, 0.5, 0.26, 3); return norm(fade(b, 0.6)); };
  S.collapse = v => { const b = len(4.0); add(b, brown(N(4)).map((x, i) => { const t = i / SR; return x * Math.min(1, t * 2) * Math.exp(-t * 0.8); }), 1); add(b, debrisRattle(3.8, 90), 0.8); filt(b, 'lp', 2200, 0.7); return norm(fade(b, 0.6)); };
  S.infDie = v => { const b = len(0.4); add(b, body(0.3, 300, 0.05), 1); add(b, tail(0.4, 200, 900, 0.06), 0.4, 0.02); return norm(fade(b, 0.05), 0.5); };
  S.clank = v => { const b = len(0.7); add(b, ring(0.7, [420, 880, 1390], 0.14), 1); add(b, body(0.2, 600, 0.04), 0.6); return norm(fade(b, 0.1), 0.7); };
  S.crush = v => { const b = len(1.0); for (let k = 0; k < 14; k++) add(b, env(filt(noise(N(0.04)), 'bp', 800 + rnd() * 2400, 1.5), 0.0005, 0.006 + rnd() * 0.01), 0.5 + rnd() * 0.5, rnd() * 0.5); add(b, body(0.6, 400, 0.12), 0.6, 0.15); return norm(fade(b, 0.2), 0.7); };
  S.aps = v => { const b = len(0.9); add(b, crack(0.05, 2000, 0.008), 1.3); add(b, pres(0.2, 1200, 0.6, 0.03), 1); add(b, thump(0.3, 140, 60, 0.06), 0.8); add(b, tail(0.9, 300, 2500, 0.18), 0.4, 0.01); echo(b, 0.15, 0.2, 2); return norm(fade(b, 0.1)); };
  S.beep = v => { const b = env(sweep(N(0.09), 1900, 1900, 1), 0.002, 0.04); return norm(b, 0.4); };
  S.dig = v => { const b = len(0.9); const n = filt(filt(noise(N(0.8)), 'bp', 900, 0.8), 'lp', 3000); for (let i = 0; i < n.length; i++) { const t = i / n.length; n[i] *= Math.sin(Math.PI * t) * (0.6 + 0.4 * Math.sin(t * 60)); } add(b, n, 1); add(b, brown(N(0.9)).map((x, i) => x * 0.3 * Math.sin(Math.PI * i / N(0.9))), 0.6); return norm(fade(b, 0.1), 0.6); };
  S.hammer = v => { const b = len(0.5); add(b, ring(0.4, [1300 + v * 200, 2900, 4100], 0.05), 1); add(b, crack(0.02, 2500, 0.003), 0.6); return norm(fade(b, 0.05), 0.5); };
  S.weld = v => { const b = len(0.8); const n = filt(noise(N(0.8)), 'hp', 3500, 0.7); for (let i = 0; i < n.length; i++) {  n[i] *= (rnd() < 0.08 ? 1.6 : 0.5) * Math.sin(Math.PI * i / n.length); } add(b, n, 1); return norm(fade(b, 0.1), 0.45); };
  S.pour = v => { const b = len(1.2); const n = filt(filt(noise(N(1.2)), 'lp', 700, 0.8), 'hp', 80); for (let i = 0; i < n.length; i++) { const t = i / n.length; n[i] *= Math.sin(Math.PI * t) * (0.7 + 0.3 * Math.sin(t * 40 + Math.sin(t * 7) * 3)); } add(b, n, 1); return norm(fade(b, 0.2), 0.55); };
  S.roller = v => { const b = len(1.2); const s = sweep(N(1.2), 42, 42, 1); for (let i = 0; i < s.length; i++) s[i] *= 0.5 + 0.5 * Math.sin(i / SR * 2 * Math.PI * 9); add(b, s, 1); add(b, filt(noise(N(1.2)), 'lp', 300), 0.3); { const dz = filt(noise(N(1.2)), 'bp', 600, 0.8); for (let i = 0; i < dz.length; i++) dz[i] *= 0.5 + 0.5 * Math.pow(Math.abs(Math.sin(i / SR * Math.PI * 27)), 4); add(b, dz, 0.9); } for (let i = 0; i < b.length; i++) b[i] *= Math.sin(Math.PI * i / b.length); return norm(b, 0.5); };
  S.jetPass = v => { const b = len(4.5); const n = noise(N(4.5)); let lp = biq('lp', 800, 0.7); for (let i = 0; i < n.length; i++) { const t = i / n.length; if (i % 256 === 0) lp = ((f) => biq('lp', f, 0.7))(600 + 5000 * Math.exp(-Math.pow((t - 0.42) * 4.2, 2))); n[i] = lp(n[i]) * Math.exp(-Math.pow((t - 0.45) * 3.2, 2)); } add(b, n, 1); const w = sweep(N(4.5), 3200, 1400, 1.2); for (let i = 0; i < w.length; i++) { const t = i / w.length; w[i] *= 0.05 * Math.exp(-Math.pow((t - 0.42) * 4, 2)); } add(b, w, 1); return norm(b, 0.85); };
  // ---- loops ----
  function loopify(b, xf) { const n = N(xf); const out = new Float32Array(b.length - n); for (let i = 0; i < out.length; i++) out[i] = b[i]; for (let i = 0; i < n; i++) { const t = i / n; out[i] = b[i] * t + b[b.length - n + i] * (1 - t); } return out; }
  S.engT = v => { const sec = 3.2; const n = N(sec); const b = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; const f = 31 + Math.sin(t * 1.3) * 2; ph += 2 * Math.PI * f / SR; b[i] = Math.sin(ph) * 0.5 + Math.sin(ph * 2) * 0.3 + Math.sin(ph * 0.5) * 0.25; } drive(b, 2); const r = filt(brown(n), 'lp', 220); for (let i = 0; i < n; i++) b[i] = b[i] * 0.6 + r[i] * 0.5;
    // track clatter
    for (let t = 0; t < sec; t += 1 / 13) add(b, env(filt(noise(N(0.03)), 'bp', 1100 + rnd() * 900, 2), 0.0005, 0.006), 0.18 + rnd() * 0.1, t);
    { let ph2 = 0; const dz = filt(noise(n), 'bp', 520, 0.9); for (let i = 0; i < n; i++) { const t = i / SR; ph2 += 2 * Math.PI * (31 + Math.sin(t * 1.3) * 2) * 3 / SR; const pulse = Math.pow(Math.abs(Math.sin(ph2)), 6); b[i] += dz[i] * (0.3 + pulse * 1.0) + (Math.sin(ph2 * 2) * 0.08 + Math.sin(ph2 * 3.01) * 0.05) * (0.6 + pulse * 0.4); } }
    add(b, env(sweep(n, 2400, 2400, 1), 0.01, 99), 0.012); return norm(loopify(b, 0.3), 0.8); };
  S.engW = v => { const sec = 3; const n = N(sec); const b = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; const f = 46 + Math.sin(t * 2.1) * 3; ph += 2 * Math.PI * f / SR; b[i] = Math.sin(ph) * 0.5 + Math.sin(ph * 2) * 0.35 + Math.sin(ph * 3) * 0.15; } drive(b, 2.4); const r = filt(brown(n), 'lp', 300); for (let i = 0; i < n; i++) b[i] = b[i] * 0.6 + r[i] * 0.45;
    { let ph2 = 0; const dz = filt(noise(n), 'bp', 700, 0.9); for (let i = 0; i < n; i++) { const t = i / SR; ph2 += 2 * Math.PI * (46 + Math.sin(t * 2.1) * 3) * 2 / SR; const pulse = Math.pow(Math.abs(Math.sin(ph2)), 5); b[i] += dz[i] * (0.28 + pulse * 0.9) + Math.sin(ph2 * 3) * 0.08; } }
    return norm(loopify(b, 0.3), 0.8); };
  S.heli = v => { const sec = 2.0; const n = N(sec); const b = new Float32Array(n); const bpf = 6.4; const nz = filt(noise(n), 'lp', 1400); for (let i = 0; i < n; i++) { const t = i / SR; const ph = (t * bpf) % 1; const p = Math.exp(-ph * 9); b[i] = nz[i] * (0.25 + p * 1.3) + Math.sin(2 * Math.PI * 38 * t) * p * 0.6; } add(b, env(sweep(n, 1800, 1800, 1), 0.01, 99), 0.03); return norm(loopify(b, 0.25), 0.8); };
  S.drone = v => { const sec = 2; const n = N(sec); const b = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; b[i] = Math.sin(2 * Math.PI * 118 * t) * 0.4 + Math.sin(2 * Math.PI * 236 * t + Math.sin(t * 3)) * 0.3 + ((t * 59) % 1 < 0.5 ? 0.15 : -0.15); } filt(b, 'lp', 1400); return norm(loopify(b, 0.25), 0.6); };
  S.windLoop = v => { const sec = 8; const n = N(sec); const b = filt(filt(noise(n), 'lp', 520, 0.6), 'hp', 60); let lfo = 0; for (let i = 0; i < n; i++) { lfo = 0.55 + 0.45 * Math.sin(i / SR * 0.7) * Math.sin(i / SR * 0.23 + 1); b[i] *= lfo; } return norm(loopify(b, 1.0), 0.7); };
  S.battleLoop = v => { const sec = 10; const n = N(sec); const b = filt(brown(n), 'lp', 160); for (let k = 0; k < 18; k++) add(b, boom(1.6, 70, 200, 0.4, 0.6), 0.25 + rnd() * 0.3, rnd() * (sec - 1.6)); filt(b, 'lp', 1400);
    for (let k = 0; k < 60; k++) { const t0 = rnd() * (sec - 0.6); const burst = rnd() < 0.5 ? 1 : 3 + ((rnd() * 5) | 0); for (let j = 0; j < burst; j++) add(b, env(filt(noise(N(0.06)), 'bp', 700 + rnd() * 900, 1.1), 0.0005, 0.012 + rnd() * 0.01), 0.18 + rnd() * 0.18, t0 + j * (0.07 + rnd() * 0.03)); } /* distant small-arms */ return norm(loopify(b, 1.2), 0.6); };
  S.siteLoop = v => { const sec = 4; const n = N(sec); const b = filt(brown(n), 'lp', 260); for (let i = 0; i < n; i++) b[i] *= 0.6; { const dz = filt(noise(n), 'bp', 550, 0.8); for (let i = 0; i < n; i++) dz[i] *= 0.35 + 0.25 * Math.sin(i / SR * 2 * Math.PI * 1.3); add(b, dz, 0.6); } for (let t = 0.2; t < sec - 0.3; t += 0.45 + rnd() * 0.5) add(b, ring(0.3, [1200 + rnd() * 400, 2800], 0.04), 0.2 + rnd() * 0.15, t); return norm(loopify(b, 0.4), 0.6); };
  // ---- UI ----
  function tone(sec, fs, dec, wave) { const b = len(sec); for (const f of fs) add(b, env(sweep(b.length, f, f, 1, wave), 0.004, dec), 0.5 / fs.length); return b; }
  S.click = v => norm(env(filt(noise(N(0.03)), 'bp', 2600, 2), 0.0005, 0.006), 0.5);
  S.place = v => { const b = len(0.4); add(b, thump(0.3, 180, 90, 0.04), 0.7); add(b, pres(0.15, 900, 0.7, 0.025), 1.1); add(b, ring(0.25, [740, 1110], 0.05), 0.35); return norm(b, 0.6); };
  S.built = v => { const b = len(1.2); add(b, tone(1.2, [523.25, 659.25], 0.35, 'tri'), 1); add(b, tone(1.0, [783.99, 1046.5], 0.4, 'tri'), 0.8, 0.12); return norm(fade(b, 0.2), 0.5); };
  S.ready = v => { const b = len(0.5); add(b, env(filt(noise(N(0.06)), 'bp', 2400, 1), 0.001, 0.02), 0.3); add(b, tone(0.12, [1320], 0.05, 'sine'), 1, 0.06); add(b, tone(0.12, [1760], 0.05, 'sine'), 1, 0.2); return norm(b, 0.45); };
  S.nomoney = v => norm(tone(0.35, [180, 186], 0.12, 'saw').map(x => Math.tanh(x * 3)), 0.35);
  S.alarm = v => { const b = len(1.4); for (let k = 0; k < 2; k++) add(b, sweep(N(0.5), 900, 620, 2, 'saw').map((x, i) => x * Math.sin(Math.PI * i / N(0.5))), 0.5, k * 0.6); filt(b, 'lp', 2500); return norm(b, 0.5); };
  S.promote = v => { const b = len(1.6); [[392, 0], [523.25, 0.14], [659.25, 0.28], [783.99, 0.42]].forEach(([f, t]) => add(b, tone(1.1, [f, f * 2], 0.4, 'saw').map(x => x * 0.5), 0.7, t)); filt(b, 'lp', 3000); return norm(fade(b, 0.3), 0.5); };
  S.rankup = v => norm(tone(0.6, [880, 1318.5], 0.2, 'tri'), 0.4);
  S.capture = v => { const b = len(0.8); add(b, tone(0.5, [587.33], 0.2, 'tri'), 1); add(b, tone(0.5, [880], 0.25, 'tri'), 1, 0.12); return norm(b, 0.45); };
  S.research = v => { const b = len(1.0); add(b, tone(0.8, [660, 990], 0.3, 'tri'), 1); add(b, tone(0.7, [1320], 0.25, 'sine'), 0.7, 0.15); return norm(b, 0.45); };
  S.power = v => { const b = len(0.9); add(b, env(filt(noise(N(0.2)), 'bp', 1800, 1), 0.002, 0.06), 0.4); add(b, tone(0.6, [440, 660], 0.2, 'saw').map(x => x * 0.4), 1, 0.08); filt(b, 'lp', 2800); return norm(b, 0.45); };
  S.superReady = v => { const b = len(2.2); for (let k = 0; k < 3; k++) add(b, sweep(N(0.6), 520, 820, 3, 'tri').map((x, i) => x * Math.sin(Math.PI * i / N(0.6))), 0.6, k * 0.7); return norm(b, 0.5); };
  // energy weapons of the fantasy troops
  S.laser = v => { const b = len(0.22); add(b, env(sweep(N(0.2), 2400 + v * 300, 380, 7, 'saw'), 0.001, 0.07), 0.6); add(b, env(filt(noise(N(0.08)), 'hp', 3000, 0.8), 0.0005, 0.015), 0.25); filt(b, 'lp', 7000); return norm(b, 0.7); };
  S.pulse = v => { const b = len(0.26); add(b, env(sweep(N(0.24), 900, 160, 6, 'tri'), 0.001, 0.08), 0.8); add(b, env(sweep(N(0.12), 3000, 1200, 8), 0.001, 0.03), 0.3); return norm(b, 0.7); };
  S.plasma = v => { const b = len(0.9); add(b, env(sweep(N(0.8), 260, 60, 3, 'saw'), 0.004, 0.25), 0.7); add(b, env(filt(noise(N(0.6)), 'bp', 900, 0.8), 0.003, 0.18), 0.5); add(b, env(sweep(N(0.3), 1600, 300, 5), 0.001, 0.08), 0.35); filt(b, 'lp', 4000); return norm(fade(b, 0.2), 0.8); };
  S.zap = v => { const b = len(0.7); for (let k = 0; k < 6; k++) add(b, env(filt(noise(N(0.06)), 'bp', 1800 + rnd() * 2600, 1.5), 0.0005, 0.02), 0.6, k * 0.035 + rnd() * 0.02); add(b, env(filt(noise(N(0.6)), 'hp', 2500, 0.7), 0.002, 0.2), 0.35); add(b, drive(env(sweep(N(0.5), 120, 50, 2), 0.002, 0.2), 3), 0.4); return norm(fade(b, 0.1), 0.8); };
  S.beam = v => { const b = len(0.5); add(b, env(tone(0.5, [520, 523, 1040], 0.4, 'saw'), 0.01, 0.2), 0.5); filt(b, 'bp', 1400, 0.7); add(b, env(filt(noise(N(0.5)), 'hp', 4000, 0.7), 0.01, 0.15), 0.2); return norm(fade(b, 0.12), 0.6); };
  S.rail = v => { const b = len(1.6); add(b, env(sweep(N(0.35), 300, 4200, 4, 'saw'), 0.15, 0.05), 0.25); add(b, crack(0.1, 1200, 0.02), 1.0, 0.33); add(b, drive(thump(0.8, 90, 30, 0.25, 6), 3), 0.9, 0.33); add(b, tail(1.2, 200, 3000, 0.45), 0.5, 0.36); return norm(fade(b, 0.3), 0.9); };
  S.ray = v => { const b = len(0.6); add(b, env(tone(0.6, [180, 181.5, 362], 0.5, 'saw'), 0.02, 0.3), 0.6); filt(b, 'lp', 2200); for (let i = 0; i < b.length; i++) b[i] *= 0.7 + 0.3 * Math.sin(i / SR * Math.PI * 48); return norm(fade(b, 0.15), 0.6); };
  S.launch = v => { const b = len(3); add(b, sweep(N(1.4), 700, 1100, 1.5, 'tri').map((x, i) => x * Math.sin(Math.PI * i / N(1.4))), 0.4); add(b, S.sam(0), 0.8, 0.6); return norm(b, 0.6); };
  S.sell = v => { const b = len(0.7); add(b, tone(0.3, [1318.5], 0.1, 'sine'), 1); add(b, tone(0.4, [1760], 0.12, 'sine'), 1, 0.08); add(b, env(filt(noise(N(0.3)), 'hp', 4000), 0.001, 0.05), 0.3, 0.1); return norm(b, 0.4); };
  // ---- new weapons ----
  S.vls = v => { const b = len(3.2); add(b, drive(thump(0.5, 70, 30, 0.2), 2.5), 0.9); add(b, crack(0.05, 1200, 0.01), 0.6); const r = filt(noise(N(3.0)), 'lp', 1800, 0.7); const h = filt(noise(N(3.0)), 'hp', 2200, 0.7); for (let i = 0; i < r.length; i++) { const t = i / r.length; const e = Math.min(1, t * 14) * Math.exp(-t * 1.4); r[i] *= e; h[i] *= e * 0.5 * (1 - t); } add(b, r, 1.0, 0.03); add(b, h, 0.6, 0.03); echo(b, 0.45, 0.25, 3); return norm(fade(b, 0.5)); };
  S.ciws = v => { const sec = 1.4; const b = len(sec); const n = N(sec - 0.3); const bz = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; const ph = (t * 75) % 1; bz[i] = (ph < 0.2 ? 1 : 0) * (rnd() * 2 - 1) * 0.9 + Math.sin(2 * Math.PI * 75 * t) * 0.35 + Math.sin(2 * Math.PI * 150 * t) * 0.12; } filt(bz, 'lp', 3200, 0.7); for (let i = 0; i < n; i++) { const t = i / n; bz[i] *= Math.min(1, t * 30) * Math.min(1, (1 - t) * 12); } add(b, drive(bz, 2), 1); add(b, tail(sec, 200, 1500, 0.35), 0.4, 0.05); return norm(fade(b, 0.2)); };
  S.mortar = v => { const b = len(1.4); add(b, drive(thump(0.35, 160, 70, 0.08, 8), 2.2), 1); add(b, pres(0.2, 700, 0.6, 0.04), 1.2); add(b, ring(0.5, [520, 1240], 0.07), 0.3); add(b, crack(0.03, 1600, 0.005), 0.5); add(b, tail(1.4, 200, 1200, 0.3), 0.3, 0.03); echo(b, 0.28, 0.2, 2); return norm(fade(b, 0.2)); };
  S.bomb = v => { const b = len(1.6); const w = sweep(N(1.4), 1800, 700, 1.2, 'sine'); for (let i = 0; i < w.length; i++) { const t = i / w.length; w[i] *= Math.min(1, t * 5) * (1 - t) * 0.5; } add(b, w, 0.7); add(b, ring(0.2, [600, 1200], 0.04), 0.4); return norm(fade(b, 0.2), 0.5); };
  S.splash = v => { const b = len(1.4); add(b, thump(0.2, 120, 60, 0.05), 0.5); const w = filt(filt(noise(N(1.2)), 'hp', 500, 0.7), 'lp', 5000, 0.7); for (let i = 0; i < w.length; i++) { const t = i / w.length; w[i] *= Math.min(1, t * 40) * Math.exp(-t * 3.2); } add(b, w, 1, 0.01); for (let k = 0; k < 10; k++) add(b, env(sweep(N(0.05), 600 + rnd() * 900, 1500 + rnd() * 1200, 3, 'sine'), 0.002, 0.018), 0.12, 0.15 + rnd() * 0.8); return norm(fade(b, 0.25)); };
  S.splashL = v => { const b = len(3.2); add(b, drive(thump(0.8, 70, 28, 0.28), 2.5), 1); add(b, body(1.0, 320, 0.25), 0.8); const w = filt(filt(noise(N(3.0)), 'hp', 300, 0.7), 'lp', 4500, 0.7); for (let i = 0; i < w.length; i++) { const t = i / w.length; w[i] *= Math.min(1, t * 10) * Math.exp(-t * 1.6); } add(b, w, 1.1, 0.08); add(b, debrisRattle(2.6, 20), 0.35, 0.4); echo(b, 0.4, 0.22, 3); return norm(fade(b, 0.5)); };
  S.board = v => { const b = len(0.9); add(b, ring(0.4, [380, 760, 1150], 0.08), 0.8); add(b, body(0.12, 900, 0.03), 0.7); for (let k = 0; k < 4; k++) add(b, env(filt(noise(N(0.05)), 'bp', 500 + rnd() * 300, 1.5), 0.001, 0.02), 0.5, 0.18 + k * 0.13); add(b, ring(0.3, [300, 640], 0.06), 0.6, 0.65); return norm(fade(b, 0.1), 0.6); };
  S.unload = v => { const b = len(1.3); add(b, sweep(N(0.5), 200, 120, 2, 'saw').map((x, i) => x * 0.2 * Math.sin(Math.PI * i / N(0.5))), 0.6); add(b, ring(0.5, [260, 520, 900], 0.12), 0.8, 0.45); add(b, body(0.25, 600, 0.06), 0.9, 0.45); for (let k = 0; k < 6; k++) add(b, env(filt(noise(N(0.05)), 'bp', 450 + rnd() * 350, 1.5), 0.001, 0.02), 0.45, 0.6 + k * 0.11); return norm(fade(b, 0.15), 0.6); };
  S.catapult = v => { const b = len(2.6); const st = filt(noise(N(1.0)), 'hp', 1500, 0.7); for (let i = 0; i < st.length; i++) { const t = i / st.length; st[i] *= Math.min(1, t * 30) * Math.exp(-t * 3); } add(b, st, 0.8); add(b, thump(0.4, 120, 50, 0.1), 0.6, 0.6); add(b, S.jetPass(0).subarray(N(1.2)), 0.7, 0.4); return norm(fade(b, 0.4)); };
  S.reinforce = v => { const b = len(2.2); add(b, env(filt(noise(N(0.25)), 'bp', 1800, 1.5), 0.002, 0.08), 0.4); add(b, tone(0.15, [1200], 0.05, 'sine'), 0.5, 0.05); add(b, boom(1.8, 90, 500, 0.3, 0.5), 0.8, 0.25); add(b, S.heli(0).subarray(0, N(1.6)).map((x, i) => x * Math.min(1, i / N(0.5))), 0.35, 0.5); return norm(fade(b, 0.4)); };
  S.seaLoop = v => { const sec = 9; const n = N(sec); const b = filt(filt(noise(n), 'lp', 1400, 0.6), 'hp', 90); for (let i = 0; i < n; i++) { const t = i / SR; const sw = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.85 + Math.sin(t * 0.31) * 2), 2.2); b[i] *= sw; } for (let k = 0; k < 6; k++) add(b, env(filt(noise(N(0.8)), 'bp', 2200 + rnd() * 1500, 0.8), 0.15, 0.3), 0.12, rnd() * (sec - 1)); return norm(loopify(b, 1.2), 0.65); };
  S.march = v => { const sec = 2.4; const n = N(sec); const b = new Float32Array(n); for (let t = 0; t < sec - 0.1; t += 0.3 + (rnd() - 0.5) * 0.04) { add(b, env(filt(noise(N(0.07)), 'bp', 380 + rnd() * 200, 1.2), 0.002, 0.025), 0.6 + rnd() * 0.3, t); add(b, env(filt(noise(N(0.04)), 'hp', 2500, 0.8), 0.001, 0.01), 0.2, t + 0.01); } for (let t = 0.15; t < sec - 0.1; t += 0.3 + (rnd() - 0.5) * 0.05) add(b, env(filt(noise(N(0.07)), 'bp', 330 + rnd() * 200, 1.2), 0.002, 0.025), 0.5 + rnd() * 0.3, t); filt(b, 'lp', 4000); return norm(loopify(b, 0.15), 0.55); };
  // ---- menu & reward UI ----
  S.tab = v => norm(env(filt(noise(N(0.04)), 'bp', 3400, 2.5), 0.0005, 0.008), 0.45);
  S.tick = v => { const b = env(filt(noise(N(0.03)), 'bp', 4200, 3), 0.0003, 0.004); add(b, tone(0.03, [2600], 0.008, 'sine'), 0.6); return norm(b, 0.5); };
  S.buy = v => { const b = len(0.9); add(b, ring(0.6, [2093, 3136, 4186], 0.12), 0.8); add(b, ring(0.6, [2637, 3951], 0.14), 0.7, 0.09); add(b, env(filt(noise(N(0.1)), 'hp', 5000), 0.001, 0.02), 0.3); return norm(fade(b, 0.2), 0.5); };
  S.achieve = v => { const b = len(2.0); add(b, ring(1.2, [1568, 2349, 3136], 0.5), 0.5); [783.99, 1046.5, 1318.5, 1568].forEach((f, i) => add(b, tone(0.8, [f, f * 1.5], 0.3, 'tri'), 0.5, i * 0.09)); add(b, tone(1.4, [523.25, 783.99, 1046.5], 0.7, 'saw').map(x => x * 0.3), 0.5, 0.36); filt(b, 'lp', 5200); return norm(fade(b, 0.4), 0.5); };
  S.victory = v => { const b = len(4.2); const ch = [[392, 493.88, 587.33], [440, 554.37, 659.25], [523.25, 659.25, 783.99]]; ch.forEach((c, i) => add(b, tone(1.4, c.concat(c.map(f => f / 2)), 0.6, 'saw').map(x => x * 0.4), 0.8, i * 0.42)); add(b, tone(2.4, [523.25, 659.25, 783.99, 1046.5, 261.63], 1.4, 'saw').map(x => x * 0.4), 0.9, 1.3); filt(b, 'lp', 3400); add(b, boom(1.5, 80, 300, 0.4, 0.5), 0.35, 1.3); echo(b, 0.3, 0.25, 3); return norm(fade(b, 0.8), 0.6); };
  S.defeat = v => { const b = len(4.0); const ch = [[349.23, 415.3, 523.25], [311.13, 392, 466.16], [261.63, 311.13, 392]]; ch.forEach((c, i) => add(b, tone(1.6, c.concat(c.map(f => f / 2)), 0.9, 'saw').map(x => x * 0.35), 0.8, i * 0.8)); filt(b, 'lp', 1600); add(b, boom(2, 60, 200, 0.6, 0.8), 0.3, 0.1); echo(b, 0.4, 0.3, 3); return norm(fade(b, 0.8), 0.55); };
  // ---- music (stereo) ----
  function music(kind) {
    const bpm = kind === 'menu' ? 72 : 96, beat = 60 / bpm, bars = kind === 'menu' ? 8 : 8, sec = bars * 4 * beat; const n = N(sec); const L = new Float32Array(n), Rr = new Float32Array(n);
    const root = kind === 'menu' ? 55 : 49; // A1 / G1
    const prog = kind === 'menu' ? [0, -4, -2, -5] : [0, 0, -2, -4];
    const mix = (src, g, off, pan) => { const o = N(off); const pl = Math.cos((pan + 1) * Math.PI / 4), pr = Math.sin((pan + 1) * Math.PI / 4); for (let i = 0; i < src.length && i + o < n; i++) { L[i + o] += src[i] * g * pl; Rr[i + o] += src[i] * g * pr; } };
    // string pad (detuned saws, filtered)
    for (let bar = 0; bar < bars; bar++) {
      const st = bar * 4 * beat, d = 4 * beat + 0.3; const ch = [0, 3, 7, 12].map(x => root * 2 * Math.pow(2, (prog[bar % 4] + x) / 12)); if (kind !== 'menu' && bar % 2) ch[1] = root * 2 * Math.pow(2, (prog[bar % 4] + 5) / 12);
      for (const f of ch) for (const det of [-0.12, 0.1]) { const s = sweep(N(d), f * Math.pow(2, det / 12), f * Math.pow(2, det / 12), 1, 'saw'); filt(s, 'lp', kind === 'menu' ? 900 : 1300, 0.6); for (let i = 0; i < s.length; i++) { const t = i / s.length; s[i] *= Math.min(1, t * 4) * Math.min(1, (1 - t) * 5); } mix(s, 0.1, st, det < 0 ? -0.5 : 0.5); }
      // low brass swell
      const bs = sweep(N(d), root * Math.pow(2, prog[bar % 4] / 12), root * Math.pow(2, prog[bar % 4] / 12), 1, 'saw'); filt(bs, 'lp', 420, 0.8); for (let i = 0; i < bs.length; i++) { const t = i / bs.length; bs[i] *= Math.sin(Math.PI * t) * 0.9; } mix(bs, 0.12, st, 0);
    }
    // war drums
    for (let b2 = 0; b2 < bars * 4; b2++) {
      const t = b2 * beat; const dr = filt(drive(env(sweep(N(0.9), 130, 52, 9), 0.002, 0.2), 1.9), 'hp', 45, 0.7); const nzz = env(filt(noise(N(0.4)), 'lp', 900), 0.001, 0.05);
      const strong = b2 % 4 === 0, mid = b2 % 4 === 2;
      if (kind === 'menu') { if (strong || mid) { mix(dr, strong ? 0.42 : 0.27, t, -0.1); mix(nzz, 0.12, t, 0.1); } }
      else { mix(dr, strong ? 0.44 : 0.24, t, -0.1); mix(nzz, 0.1, t, 0.15); if (b2 % 2 === 1) { mix(env(filt(noise(N(0.15)), 'bp', 1800, 1.2), 0.001, 0.025), 0.12, t + beat * 0.5, 0.5); mix(env(filt(noise(N(0.15)), 'bp', 1800, 1.2), 0.001, 0.025), 0.08, t + beat * 0.75, -0.5); } }
    }
    // lead horn / high strings melody (mid-range so it carries on phone speakers)
    { const mel = kind === 'menu' ? [7, 5, 3, 2, 3, 5, 7, 10, 12, 10, 7, 5, 3, 2, 0, -2] : [0, 3, 5, 7, 5, 3, 7, 10, 8, 7, 5, 3, 5, 3, 2, 0]; const nd = kind === 'menu' ? 2 * beat : beat;
      for (let k = 0; k * nd < sec - nd; k++) { const bar = Math.floor(k * nd / (4 * beat)); const f = root * 8 * Math.pow(2, (prog[bar % 4] + mel[k % mel.length]) / 12); const d = nd * 1.05; const s = sweep(N(d), f, f, 1, kind === 'menu' ? 'tri' : 'saw'); filt(s, 'lp', kind === 'menu' ? 2200 : 2600, 0.7); for (let i = 0; i < s.length; i++) { const t = i / s.length; s[i] *= Math.min(1, t * 10) * Math.pow(1 - t, 0.6) * (1 + 0.04 * Math.sin(i / SR * 2 * Math.PI * 5.5)); } mix(s, kind === 'menu' ? 0.1 : 0.085, k * nd, 0.15); } }
    // ostinato (battle)
    if (kind !== 'menu') for (let k = 0; k < bars * 8; k++) { const bar = Math.floor(k / 8); const f = root * 4 * Math.pow(2, (prog[bar % 4] + [0, 0, 7, 0, 3, 0, 7, 5][k % 8]) / 12); const s = env(sweep(N(0.3), f, f, 1, 'saw'), 0.004, 0.08); filt(s, 'lp', 1900, 0.7); mix(s, 0.095, k * beat / 2, (k % 2 ? 0.35 : -0.35)); }
    // simple stereo reverb
    for (const ch of [L, Rr]) { echo(ch, 0.29 + (ch === L ? 0 : 0.03), 0.28, 3); }
    norm(L, 0.7); norm(Rr, 0.7);
    // loop crossfade
    const xf = N(0.4); for (let i = 0; i < xf; i++) { const t = i / xf; L[i] = L[i] * t + L[n - xf + i] * (1 - t) * 0.5; Rr[i] = Rr[i] * t + Rr[n - xf + i] * (1 - t) * 0.5; }
    return [L.subarray(0, n - xf), Rr.subarray(0, n - xf)];
  }
  const VAR = { rifle: 3, mg: 2, hmg: 2, auto: 2, cannon: 3, cannonM: 2, how: 2, expS: 3, expM: 3, expL: 2, hitArmor: 3, hammer: 2 };
  function generate(sr, list) {
    SR = sr; const out = {};
    for (const k of list) {
      try {
        if (k === 'music_menu' || k === 'music_battle') { out[k] = music(k.split('_')[1]); continue; }
        const nv = VAR[k] || 1; out[k] = []; for (let v = 0; v < nv; v++) out[k].push(S[k](v));
      } catch (e) { out[k] = null; }
    }
    return out;
  }
  return { generate, keys: Object.keys(S) };
}
