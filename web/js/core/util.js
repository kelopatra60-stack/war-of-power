/* ============================================================
   War of Power — أدوات عامة: رياضيات، أرقام عشوائية، ضوضاء، ألوان، تخزين محلي
   الملف: js/core/util.js   ·   ترتيب التحميل: 1 من 43
   ============================================================ */
'use strict';
/* ===== Utilities: math, RNG, noise, colors, heap ===== */
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sat = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = t => t * t * (3 - 2 * t);
const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
const angNorm = a => { a %= TAU; if (a > PI) a -= TAU; else if (a < -PI) a += TAU; return a; };
const angDiff = (a, b) => angNorm(b - a);
const angTo = (a, b, step) => { const d = angDiff(a, b); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; };

// Seeded RNG (mulberry32)
function RNG(seed) {
  let s = (seed >>> 0) || 1;
  const f = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.range = (a, b) => a + (b - a) * f();
  f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  f.gauss = () => { let u = 0, v = 0; while (u === 0) u = f(); v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  f.state = () => s; f.setState = v => { s = v; };
  return f;
}
// simulation RNG: every random decision that changes game state draws from here so that all
// machines in a network match stay in lock-step (visual effects keep using Math.random)
let SIMR = RNG(0x5eed);
const rnd = () => SIMR();
const rndGauss = () => { let u = 0; while (u === 0) u = SIMR(); const v = SIMR(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
const hash2 = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s | 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

// Value noise + fbm (seedable, tileable optional)
function Noise(seed) {
  const P = new Uint8Array(512); const r = RNG(seed || 1); const p = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const G = new Float32Array(512); for (let i = 0; i < 512; i++) G[i] = (hash2(i, 7, seed) * 2 - 1);
  const grad = (h, x, y) => { switch (h & 7) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } };
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  // Perlin gradient noise in [-1,1], optional period for tiling
  function n2(x, y, per) {
    let X = Math.floor(x), Y = Math.floor(y); const xf = x - X, yf = y - Y;
    let X1 = X + 1, Y1 = Y + 1;
    if (per) { X = ((X % per) + per) % per; Y = ((Y % per) + per) % per; X1 = (X + 1) % per; Y1 = (Y + 1) % per; }
    X &= 255; Y &= 255; X1 &= 255; Y1 &= 255;
    const u = fade(xf), v = fade(yf);
    const a = grad(P[P[X] + Y], xf, yf), b = grad(P[P[X1] + Y], xf - 1, yf);
    const c = grad(P[P[X] + Y1], xf, yf - 1), d = grad(P[P[X1] + Y1], xf - 1, yf - 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 0.707;
  }
  function fbm(x, y, oct, per, lac, gain) {
    oct = oct || 4; lac = lac || 2; gain = gain || 0.5; let a = 1, f = 1, s = 0, n = 0;
    for (let i = 0; i < oct; i++) { s += a * n2(x * f, y * f, per ? per * f : 0); n += a; a *= gain; f *= lac; }
    return s / n;
  }
  function ridge(x, y, oct, per) {
    let a = 1, f = 1, s = 0, n = 0;
    for (let i = 0; i < (oct || 4); i++) { const v = 1 - Math.abs(n2(x * f, y * f, per ? per * f : 0)); s += a * v * v; n += a; a *= 0.5; f *= 2; }
    return s / n;
  }
  // cellular (worley) F1 distance, tileable
  function cell(x, y, per, jit) {
    jit = jit === undefined ? 1 : jit; const X = Math.floor(x), Y = Math.floor(y); let best = 9, best2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      let cx = X + i, cy = Y + j; let hx = cx, hy = cy;
      if (per) { hx = ((cx % per) + per) % per; hy = ((cy % per) + per) % per; }
      const px = cx + 0.5 + (hash2(hx, hy, seed) - 0.5) * jit, py = cy + 0.5 + (hash2(hy, hx, seed + 9) - 0.5) * jit;
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < best) { best2 = best; best = d; id = hash2(hx, hy, seed + 3); } else if (d < best2) best2 = d;
    }
    return { d: Math.sqrt(best), d2: Math.sqrt(best2), id };
  }
  return {  fbm, ridge, cell };
}

// Colors
function hex2rgb(h) { if (Array.isArray(h)) return h; h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgb2hex(c) { return '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
function mixc(a, b, t) { a = hex2rgb(a); b = hex2rgb(b); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function shade(c, f) { c = hex2rgb(c); return rgb2hex(f >= 0 ? [c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f] : [c[0] * (1 + f), c[1] * (1 + f), c[2] * (1 + f)]); }
function rgba(c, a) { c = hex2rgb(c); return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }

// Binary min-heap on Float32 priorities (for A*)
class Heap {
  constructor(cap) { this.k = new Int32Array(cap); this.p = new Float32Array(cap); this.n = 0; }
  clear() { this.n = 0; }
  push(key, pri) {
    if (this.n >= this.k.length) { const k = new Int32Array(this.k.length * 2), p = new Float32Array(this.k.length * 2); k.set(this.k); p.set(this.p); this.k = k; this.p = p; }
    let i = this.n++; const K = this.k, P = this.p;
    while (i > 0) { const pa = (i - 1) >> 1; if (P[pa] <= pri) break; K[i] = K[pa]; P[i] = P[pa]; i = pa; }
    K[i] = key; P[i] = pri;
  }
  pop() {
    const K = this.k, P = this.p; const top = K[0]; const n = --this.n; if (n <= 0) return top;
    const key = K[n], pri = P[n]; let i = 0;
    for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && P[c + 1] < P[c]) c++; if (P[c] >= pri) break; K[i] = K[c]; P[i] = P[c]; i = c; }
    K[i] = key; P[i] = pri; return top;
  }
}

const fmtTime = s => { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };

function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor((r ? r() : Math.random()) * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function safeJSON(s, d) { try { const v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : safeJSON(v, d); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } }
};
const fmN = v => Math.floor(v || 0).toLocaleString('en-US');
