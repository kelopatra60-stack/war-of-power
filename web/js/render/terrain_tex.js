/* ============================================================
   War of Power — نسيج تفاصيل التضاريس
   الملف: js/render/terrain_tex.js   ·   ترتيب التحميل: 7 من 43
   ============================================================ */
'use strict';
/* ===== Procedural terrain detail textures (tileable, RGB + height) ===== */

const TL = { GRASS: 0, STEPPE: 1, DIRT: 2, SAND: 3, ROCK: 4, SNOW: 5, FOREST: 6, PAVED: 7 };
// average colours (for minimap)
const TL_COL = [[92, 116, 58], [160, 146, 92], [116, 96, 70], [204, 182, 136], [128, 124, 118], [228, 233, 238], [66, 70, 42], [150, 150, 146]];

function genTerrainLayers(size) {
  const S = size || 512, out = [];
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const cx = cv.getContext('2d', { willReadFrequently: true });
  const hv = document.createElement('canvas'); hv.width = hv.height = S; const hx = hv.getContext('2d', { willReadFrequently: true });
  const k = S / 512;
  function wrap(x, y, r, fn) { for (const ox of [0, -S, S]) for (const oy of [0, -S, S]) { if (ox && (x + ox < -r || x + ox > S + r)) continue; if (oy && (y + oy < -r || y + oy > S + r)) continue; fn(x + ox, y + oy); } }
  function base(fn) { // per-pixel base color + height
    const id = cx.createImageData(S, S), hd = hx.createImageData(S, S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const o = (j * S + i) * 4; const r = fn(i, j); id.data[o] = r[0]; id.data[o + 1] = r[1]; id.data[o + 2] = r[2]; id.data[o + 3] = 255; hd.data[o] = hd.data[o + 1] = hd.data[o + 2] = clamp(r[3] * 255, 0, 255); hd.data[o + 3] = 255; }
    cx.putImageData(id, 0, 0); hx.putImageData(hd, 0, 0);
  }
  function collect(blur) {
    const c = cx.getImageData(0, 0, S, S).data, h = hx.getImageData(0, 0, S, S).data; const a = new Uint8Array(S * S * 4);
    // wrap-around box blur of the height channel: thin bright strokes otherwise turn into per-pixel lighting speckle
    const r = blur === undefined ? Math.max(1, Math.round(k)) : blur; let hv = new Float32Array(S * S); for (let i = 0; i < S * S; i++) hv[i] = h[i * 4];
    if (r > 0) { const tmp = new Float32Array(S * S), n = 2 * r + 1; for (let y = 0; y < S; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += hv[y * S + ((x + S) % S)]; for (let x = 0; x < S; x++) { tmp[y * S + x] = acc / n; acc += hv[y * S + ((x + r + 1) % S)] - hv[y * S + ((x - r + S) % S)]; } }
      for (let x = 0; x < S; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[((y + S) % S) * S + x]; for (let y = 0; y < S; y++) { hv[y * S + x] = acc / n; acc += tmp[((y + r + 1) % S) * S + x] - tmp[((y - r + S) % S) * S + x]; } } }
    for (let i = 0; i < S * S; i++) { a[i * 4] = c[i * 4]; a[i * 4 + 1] = c[i * 4 + 1]; a[i * 4 + 2] = c[i * 4 + 2]; a[i * 4 + 3] = hv[i]; }
    out.push(a);
  }
  const P = (n, x, y, s, o) => { const per = Math.max(1, Math.round(S / s)); return n.fbm(x * per / S, y * per / S, o || 4, per); };
  const CL = (n, x, y, s, jit) => { const per = Math.max(1, Math.round(S / s)); return n.cell(x * per / S, y * per / S, per, jit); };
  // 0 grass
  { const n = Noise(101), r = RNG(101);
    base((i, j) => { const a = P(n, i, j, 128 * k), b = P(n, i + 50, j + 90, 48 * k), c = P(n, i, j, 9 * k, 2);
      const g = mixc('#4f6630', '#6b7f3e', sat(a * 0.8 + 0.5)); const y = mixc(g, '#8a8550', sat(b * 1.2 - 0.1)); const v = c * 12;
      return [y[0] + v, y[1] + v, y[2] + v * 0.6, 0.35 + c * 0.2]; });
    for (let q = 0; q < 14000 * k * k; q++) { const x = r() * S, y = r() * S, L = (2 + r() * 5) * k, ang = r() * TAU, w = (0.6 + r() * 0.8) * k; const t = r();
      const col = t < 0.45 ? rgba('#3d5a22', 0.55) : t < 0.8 ? rgba('#7d9a45', 0.5) : rgba('#a8a65a', 0.45);
      wrap(x, y, L, (X, Y) => { cx.strokeStyle = col; cx.lineWidth = w; cx.beginPath(); cx.moveTo(X, Y); cx.lineTo(X + Math.cos(ang) * L, Y + Math.sin(ang) * L); cx.stroke();
        hx.strokeStyle = `rgba(255,255,255,${0.14 + r() * 0.16})`; hx.lineWidth = w; hx.beginPath(); hx.moveTo(X, Y); hx.lineTo(X + Math.cos(ang) * L, Y + Math.sin(ang) * L); hx.stroke(); }); }
    for (let q = 0; q < 220 * k * k; q++) { const x = r() * S, y = r() * S; const col = r() < 0.5 ? '#d9d27a' : '#e8e4d6'; wrap(x, y, 2, (X, Y) => { cx.fillStyle = col; cx.fillRect(X, Y, 1.4 * k, 1.4 * k); }); }
    collect(); }
  // 1 steppe / dry grass
  { const n = Noise(102), r = RNG(102);
    base((i, j) => { const a = P(n, i, j, 110 * k), b = P(n, i + 30, j + 70, 40 * k), c = P(n, i, j, 8 * k, 2);
      const g = mixc('#8e8250', '#b4a46c', sat(a * 0.8 + 0.5)); const y = mixc(g, '#7a6748', sat(b * 1.4 - 0.25)); const v = c * 14;
      return [y[0] + v, y[1] + v, y[2] + v * 0.7, 0.35 + c * 0.2]; });
    for (let q = 0; q < 10000 * k * k; q++) { const x = r() * S, y = r() * S, L = (2 + r() * 6) * k, ang = r() * TAU; const t = r();
      const col = t < 0.4 ? rgba('#6e6236', 0.5) : t < 0.85 ? rgba('#cdbb82', 0.5) : rgba('#7c8a48', 0.4);
      wrap(x, y, L, (X, Y) => { cx.strokeStyle = col; cx.lineWidth = 0.8 * k; cx.beginPath(); cx.moveTo(X, Y); cx.lineTo(X + Math.cos(ang) * L, Y + Math.sin(ang) * L); cx.stroke();
        hx.strokeStyle = 'rgba(255,255,255,0.16)'; hx.lineWidth = 0.8 * k; hx.beginPath(); hx.moveTo(X, Y); hx.lineTo(X + Math.cos(ang) * L, Y + Math.sin(ang) * L); hx.stroke(); }); }
    collect(); }
  // 2 dirt
  { const n = Noise(103), r = RNG(103);
    base((i, j) => { const a = P(n, i, j, 100 * k), c = P(n, i, j, 6 * k, 2), cl = CL(n, i, j, 40 * k);
      const g = mixc('#6a5640', '#806a50', sat(a * 0.8 + 0.5)); const crack = clamp((cl.d2 - cl.d) * 14, 0, 1); const v = c * 16 - (1 - crack) * 9;
      return [g[0] + v, g[1] + v, g[2] + v * 0.9, 0.42 + c * 0.22 - (1 - crack) * 0.08]; });
    for (let q = 0; q < 1500 * k * k; q++) { const x = r() * S, y = r() * S, rr = (0.5 + r() * r() * 1.8) * k; const t = 95 + r() * 55;
      wrap(x, y, rr * 2, (X, Y) => { const g = cx.createRadialGradient(X - rr * 0.3, Y - rr * 0.3, 0, X, Y, rr); g.addColorStop(0, `rgb(${t + 40},${t + 30},${t + 20})`); g.addColorStop(1, `rgb(${t - 30},${t - 36},${t - 40})`);
        cx.fillStyle = g; cx.beginPath(); cx.ellipse(X, Y, rr, rr * 0.8, r() * 3, 0, TAU); cx.fill();
        const h = hx.createRadialGradient(X, Y, 0, X, Y, rr); h.addColorStop(0, '#fff'); h.addColorStop(1, '#666'); hx.fillStyle = h; hx.beginPath(); hx.arc(X, Y, rr, 0, TAU); hx.fill(); }); }
    collect(); }
  // 3 sand
  { const n = Noise(104);
    base((i, j) => { const a = P(n, i, j, 140 * k), w = P(n, i, j, 60 * k, 3), c = (hash2(i, j, 4) - 0.5);
      const amp = sat(P(n, i + 11, j + 7, 128 * k, 2) * 1.7 + 0.45); const rip = Math.sin(TAU * (i * 24 + j * 16) / S + w * 11) * 0.5 + 0.5;
      const g = mixc('#c4a674', '#dcc391', sat(a * 0.8 + 0.5)); const v = c * 9 + (rip - 0.5) * 9 * amp;
      return [g[0] + v, g[1] + v, g[2] + v * 0.85, 0.4 + (rip - 0.5) * 0.3 * amp + a * 0.12 + c * 0.03]; });
    collect(); }
  // 4 rock
  { const n = Noise(105);
    base((i, j) => { const a = P(n, i, j, 90 * k), c = P(n, i, j, 7 * k, 3); const cl = CL(n, i, j, 55 * k, 0.9); const cl2 = CL(n, i + 37, j, 18 * k);
      const edge = clamp((cl.d2 - cl.d) * 5, 0, 1), e2 = clamp((cl2.d2 - cl2.d) * 4, 0, 1);
      const g = mixc('#6b6762', '#97928a', sat(a * 0.7 + 0.5 + (cl.id - 0.5) * 0.4)); const lich = sat(P(n, i + 99, j, 30 * k, 3) * 2 - 0.55);
      const gg = mixc(g, '#7e8a58', lich * 0.5); const v = c * 18 - (1 - edge) * 40 - (1 - e2) * 12;
      return [gg[0] + v, gg[1] + v, gg[2] + v, 0.55 + (cl.id - 0.5) * 0.3 + c * 0.2 - (1 - edge) * 0.45 - (1 - e2) * 0.1]; });
    collect(); }
  // 5 snow
  { const n = Noise(106), r = RNG(106);
    base((i, j) => { const a = P(n, i, j, 120 * k), w = P(n, i, j, 30 * k, 3), c = P(n, i, j, 5 * k, 2);
      const rip = Math.sin(TAU * (i * 12 - j * 30) / S + w * 6) * 0.5 + 0.5;
      const g = mixc('#c9d3dd', '#eef2f6', sat(a * 0.7 + 0.6)); const v = c * 8 + (rip - 0.5) * 6;
      return [g[0] + v, g[1] + v, g[2] + v, 0.5 + a * 0.2 + rip * 0.12]; });
    for (let q = 0; q < 900 * k * k; q++) { const x = r() * S, y = r() * S; wrap(x, y, 2, (X, Y) => { cx.fillStyle = 'rgba(255,255,255,0.9)'; cx.fillRect(X, Y, 1, 1); }); }
    collect(); }
  // 6 forest floor
  { const n = Noise(107), r = RNG(107);
    base((i, j) => { const a = P(n, i, j, 90 * k), m = P(n, i + 40, j, 45 * k), c = P(n, i, j, 6 * k, 2);
      const g = mixc('#3a3322', '#4f4a2e', sat(a * 0.8 + 0.5)); const y = mixc(g, '#4f6a2a', sat(m * 1.6 - 0.2)); const v = c * 14;
      return [y[0] + v, y[1] + v, y[2] + v * 0.8, 0.35 + c * 0.25]; });
    const lc = ['#6b4f2a', '#86622e', '#5a3f22', '#7a7a3a', '#4b3a24', '#9a7a3a'];
    for (let q = 0; q < 5200 * k * k; q++) { const x = r() * S, y = r() * S, L = (1.5 + r() * 2.8) * k, ang = r() * TAU; const col = lc[(r() * lc.length) | 0];
      wrap(x, y, L * 2, (X, Y) => { cx.fillStyle = col; cx.beginPath(); cx.ellipse(X, Y, L, L * 0.45, ang, 0, TAU); cx.fill(); hx.fillStyle = 'rgba(255,255,255,0.45)'; hx.beginPath(); hx.ellipse(X, Y, L, L * 0.45, ang, 0, TAU); hx.fill(); }); }
    for (let q = 0; q < 380 * k * k; q++) { const x = r() * S, y = r() * S, L = (4 + r() * 9) * k, ang = r() * TAU;
      wrap(x, y, L, (X, Y) => { cx.strokeStyle = 'rgba(52,38,24,0.8)'; cx.lineWidth = 1 * k; cx.beginPath(); cx.moveTo(X, Y); cx.lineTo(X + Math.cos(ang) * L, Y + Math.sin(ang) * L); cx.stroke(); hx.strokeStyle = 'rgba(255,255,255,0.6)'; hx.lineWidth = 1.2 * k; hx.beginPath(); hx.moveTo(X, Y); hx.lineTo(X + Math.cos(ang) * L, Y + Math.sin(ang) * L); hx.stroke(); }); }
    collect(); }
  // 7 paved concrete slabs (large weathered slabs, asphalt patches, stains, cracks)
  { const n = Noise(108), r = RNG(108); const slab = 128 * k;
    base((i, j) => { const sx = Math.floor(i / slab), sy = Math.floor(j / slab); const t = hash2(sx & 3, sy & 3, 8) - 0.5;
      const fx = (i % slab) / slab, fy = (j % slab) / slab; const joint = Math.min(fx, fy, 1 - fx, 1 - fy) * slab;
      const a = P(n, i, j, 90 * k), c = (hash2(i, j, 2) - 0.5) * 14 + P(n, i, j, 3 * k, 2) * 9; const st = sat(P(n, i + 77, j + 31, 30 * k, 3) * 2.2 - 0.55);
      const asph = sat(P(n, i + 13, j + 151, 64 * k, 3) * 2.6 - 0.9);
      let v = 146 + t * 9 + a * 12 + c - st * 26; const jd = joint < 1.3 * k; if (jd) v -= 30;
      let rr = v, gg = v * 0.995, bb = v * 0.97; if (asph > 0) { const av = 78 + c * 0.6 + a * 8; rr = lerp(rr, av, asph); gg = lerp(gg, av, asph); bb = lerp(bb, av * 1.02, asph); }
      return [rr, gg, bb, jd ? 0.3 : 0.58 + c / 255 - asph * 0.06]; });
    for (let q = 0; q < 26 * k * k; q++) { const x = r() * S, y = r() * S, rr = (6 + r() * 14) * k; wrap(x, y, rr, (X, Y) => { const g = cx.createRadialGradient(X, Y, 0, X, Y, rr); g.addColorStop(0, 'rgba(30,28,26,0.28)'); g.addColorStop(1, 'rgba(30,28,26,0)'); cx.fillStyle = g; cx.beginPath(); cx.ellipse(X, Y, rr, rr * 0.7, r() * 3, 0, TAU); cx.fill(); }); }
    for (let q = 0; q < 60 * k * k; q++) { const x = r() * S, y = r() * S; let px = x, py = y; cx.strokeStyle = 'rgba(60,58,55,0.45)'; cx.lineWidth = 0.7 * k; hx.strokeStyle = 'rgba(0,0,0,0.5)'; hx.lineWidth = 0.8 * k; cx.beginPath(); cx.moveTo(px, py); hx.beginPath(); hx.moveTo(px, py);
      for (let s2 = 0; s2 < 7; s2++) { px += (r() - 0.5) * 16 * k; py += (r() - 0.5) * 16 * k; cx.lineTo(px, py); hx.lineTo(px, py); } cx.stroke(); hx.stroke(); }
    collect(); }
  // 8 noise (water ripples / macro variation)
  { const n = Noise(109);
    base((i, j) => { const v = P(n, i, j, 64 * k, 5) * 0.5 + 0.5; const g = v * 255; return [g, g, g, v]; });
    collect(0); }
  return { size: S, layers: out };
}
