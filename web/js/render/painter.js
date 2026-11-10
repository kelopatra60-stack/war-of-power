/* ============================================================
   War of Power — رسام الصور الإجرائي وحزم الأطلس
   الملف: js/render/painter.js   ·   ترتيب التحميل: 6 من 43
   ============================================================ */
'use strict';
/* ===== Procedural sprite painter + atlas packer ===== */
const ATLAS = (function () {
  const SIZE = 2048, PAD = 8;
  let pA = [], pM = [], sky = [], regions = {};
  function reset() { pA = []; pM = []; sky = []; regions = {}; }
  function newPage() {
    pA.push(new Uint8Array(SIZE * SIZE * 4));
    const m = new Uint8Array(SIZE * SIZE * 4); for (let i = 0; i < m.length; i += 4) { m[i] = 128; m[i + 1] = 128; }
    pM.push(m); sky.push([{ x: 0, y: 0, w: SIZE }]);
  }
  function fit(s, w, h) {
    let best = null;
    for (let i = 0; i < s.length; i++) {
      let x = s[i].x; if (x + w > SIZE) break;
      let y = 0, wl = w, j = i;
      while (wl > 0) { if (j >= s.length) { y = 1e9; break; } y = Math.max(y, s[j].y); if (y + h > SIZE) { y = 1e9; break; } wl -= s[j].w; j++; }
      if (y < 1e9 && (!best || y + h < best.y + best.h || (y + h === best.y + best.h && s[i].w < best.sw))) best = { i, x, y, h, sw: s[i].w };
    }
    return best;
  }
  function place(s, b, w, h) {
    const n = { x: b.x, y: b.y + h, w };
    s.splice(b.i, 0, n);
    for (let i = b.i + 1; i < s.length; i++) {
      const p = s[i - 1]; if (s[i].x < p.x + p.w) { const sh = p.x + p.w - s[i].x; s[i].x += sh; s[i].w -= sh; if (s[i].w <= 0) { s.splice(i, 1); i--; } else break; } else break;
    }
    for (let i = 0; i < s.length - 1; i++) if (s[i].y === s[i + 1].y) { s[i].w += s[i + 1].w; s.splice(i + 1, 1); i--; }
  }
  function alloc(w, h) {
    w += PAD * 2; h += PAD * 2;
    for (let l = 0; l < pA.length; l++) { const b = fit(sky[l], w, h); if (b) { place(sky[l], b, w, h); return { l, x: b.x + PAD, y: b.y + PAD }; } }
    newPage(); const b = fit(sky[pA.length - 1], w, h); if (!b) return null; place(sky[pA.length - 1], b, w, h); return { l: pA.length - 1, x: b.x + PAD, y: b.y + PAD };
  }
  // img: {pw, ph, alb(premult RGBA), mat RGBA, ax, ay (px), ww, wh (world)}
  function add(name, img) {
    const r = alloc(img.pw, img.ph); if (!r) { console.warn('atlas full', name); return null; }
    const A = pA[r.l], M = pM[r.l];
    for (let j = 0; j < img.ph; j++) {
      const o = ((r.y + j) * SIZE + r.x) * 4;
      A.set(img.alb.subarray(j * img.pw * 4, (j + 1) * img.pw * 4), o);
      M.set(img.mat.subarray(j * img.pw * 4, (j + 1) * img.pw * 4), o);
    }
    const reg = { u0: r.x / SIZE, v0: r.y / SIZE, u1: (r.x + img.pw) / SIZE, v1: (r.y + img.ph) / SIZE, l: r.l, w: img.ww, h: img.wh, ax: img.ax / img.pw, ay: img.ay / img.ph, name };
    regions[name] = reg; return reg;
  }
  function get(n) { return regions[n]; }
  function has(n) { return !!regions[n]; }
  function upload() { R.uploadAtlas(pA, pM, SIZE); }
  function free() { pA = []; pM = []; sky = []; }
  
  return { reset, add, get, has, upload, free };
})();

/* ---------- Painter ---------- */
const PaintCtx = { cvs: [], get(i, w, h) { let c = this.cvs[i]; if (!c) { c = this.cvs[i] = document.createElement('canvas'); } if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); } return c; } };
let GRAIN = null;
function grainCanvas() {
  if (GRAIN) return GRAIN; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const id = x.createImageData(128, 128); const n = Noise(77);
  for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) { const v = 128 + n.fbm(i / 9, j / 9, 3, 128 / 9) * 70 + (hash2(i, j, 5) - 0.5) * 60; const o = (j * 128 + i) * 4; id.data[o] = id.data[o + 1] = id.data[o + 2] = clamp(v, 0, 255); id.data[o + 3] = 255; }
  x.putImageData(id, 0, 0); GRAIN = c; return c;
}

class Painter {
  // ww, wh: world size; ax, ay: anchor (world units from top-left); S: px per world unit
  constructor(ww, wh, ax, ay, S, opt) {
    this.S = S; this.m = 3; this.ww = ww; this.wh = wh; this.ax = ax; this.ay = ay; this.opt = opt || {};
    this.pw = Math.ceil(ww * S) + this.m * 2; this.ph = Math.ceil(wh * S) + this.m * 2;
    this.ca = PaintCtx.get(0, this.pw, this.ph); this.ch = PaintCtx.get(1, this.pw, this.ph); this.ct = PaintCtx.get(2, this.pw, this.ph);
    this.a = this.ca.getContext('2d', { willReadFrequently: true }); this.h = this.ch.getContext('2d', { willReadFrequently: true }); this.t = this.ct.getContext('2d', { willReadFrequently: true });
    for (const c of [this.a, this.h, this.t]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, this.pw + 2, this.ph + 2); c.setTransform(S, 0, 0, S, ax * S + this.m, ay * S + this.m); c.lineJoin = 'round'; c.lineCap = 'round'; }
    this.Hmax = this.opt.Hmax || 4; this.dust = this.opt.dust === undefined ? 0.35 : this.opt.dust; this.dustCol = this.opt.dustCol || [150, 132, 100];
  }
  _apply(build, m, stroke, width) {
    const draw = (ctx, style) => { ctx.beginPath(); build(ctx); if (stroke) { ctx.lineWidth = width; ctx.strokeStyle = style; ctx.stroke(); } else { ctx.fillStyle = style; ctx.fill(m.rule || 'nonzero'); } };
    const ga = m.a === undefined ? 1 : m.a;
    if (m.c !== null && m.c !== undefined) { this.a.globalAlpha = ga; draw(this.a, typeof m.c === 'function' ? m.c(this.a, this) : m.c); this.a.globalAlpha = 1; }
    if (m.h !== undefined) {
      let st;
      if (m.hg) { const g = this.h.createLinearGradient(m.hg[0], m.hg[1], m.hg[3], m.hg[4]); g.addColorStop(0, this._hc(m.hg[2], m)); g.addColorStop(1, this._hc(m.hg[5], m)); st = g; }
      else if (m.hr) { const g = this.h.createRadialGradient(m.hr[0], m.hr[1], 0, m.hr[0], m.hr[1], m.hr[2]); g.addColorStop(0, this._hc(m.hr[3], m)); g.addColorStop(1, this._hc(m.hr[4], m)); st = g; }
      else st = this._hc(m.h, m);
      this.h.globalAlpha = m.ha === undefined ? 1 : m.ha; draw(this.h, st); this.h.globalAlpha = 1;
      if (m.t !== -1) draw(this.t, m.t ? `rgba(255,255,255,${m.t})` : '#000');
    } else if (m.t) draw(this.t, `rgba(255,255,255,${m.t})`);
    return this;
  }
  _hc(h, m) { return `rgb(${clamp(h * 255, 0, 255) | 0},${clamp((m.s || 0) * 255, 0, 255) | 0},${clamp((m.e || 0) * 255, 0, 255) | 0})`; }
  poly(p, m) { return this._apply(c => { c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); }, m); }
  rect(x, y, w, h, m, r) { return this._apply(c => { if (r) this._rr(c, x, y, w, h, r); else c.rect(x, y, w, h); }, m); }
  circ(x, y, r, m) { return this._apply(c => c.arc(x, y, r, 0, TAU), m); }
  ell(x, y, rx, ry, rot, m) { return this._apply(c => c.ellipse(x, y, rx, ry, rot || 0, 0, TAU), m); }
  line(p, w, m) { return this._apply(c => { c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); }, m, true, w); }
  path(fn, m) { return this._apply(fn, m); }
  spath(fn, w, m) { return this._apply(fn, m, true, w); }
  // local transform for composite props (vehicles parked inside building art, etc.)
  push(x, y, a) { for (const c of [this.a, this.h, this.t]) { c.save(); c.translate(x, y); if (a) c.rotate(a); } return this; }
  pop() { for (const c of [this.a, this.h, this.t]) c.restore(); return this; }
  _rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  // overlay grain/noise on albedo (within existing alpha)
  grain(alpha, scale) {
    const a = this.a; const tmp = PaintCtx.get(3, this.pw, this.ph); const tx = tmp.getContext('2d'); tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'copy'; tx.drawImage(this.ca, 0, 0); tx.globalCompositeOperation = 'source-over';
    a.save(); a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'overlay'; a.globalAlpha = alpha || 0.25;
    const pat = a.createPattern(grainCanvas(), 'repeat'); if (scale && pat.setTransform) pat.setTransform(new DOMMatrix().scale(scale)); a.fillStyle = pat; a.fillRect(0, 0, this.pw, this.ph);
    a.globalCompositeOperation = 'destination-in'; a.globalAlpha = 1; a.drawImage(tmp, 0, 0); a.restore(); return this;
  }
  // coating / camouflage modulation: grey pattern blended with 'overlay' inside the existing alpha
  tone(key, upt, alpha) {
    const a = this.a; const tmp = PaintCtx.get(3, this.pw, this.ph); const tx = tmp.getContext('2d'); tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'copy'; tx.drawImage(this.ca, 0, 0); tx.globalCompositeOperation = 'source-over';
    a.save(); a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'overlay'; a.globalAlpha = alpha === undefined ? 0.6 : alpha;
    const pat = a.createPattern(camoPattern(key), 'repeat'); const sc = (upt || 80) / 256 * this.S; if (pat.setTransform) pat.setTransform(new DOMMatrix().translate(this.m, this.m).scale(sc)); a.fillStyle = pat; a.fillRect(0, 0, this.pw, this.ph);
    a.globalCompositeOperation = 'destination-in'; a.globalAlpha = 1; a.drawImage(tmp, 0, 0); a.restore(); return this;
  }
  // build final image: normals, AO, edges, dust
  finish(o) {
    o = o || {};
    const pw = this.pw, ph = this.ph, N = pw * ph;
    const A = this.a.getImageData(0, 0, pw, ph).data, Hd = this.h.getImageData(0, 0, pw, ph).data, T = this.t.getImageData(0, 0, pw, ph).data;
    const h = new Float32Array(N), cov = new Float32Array(N);
    for (let i = 0; i < N; i++) { const a = Hd[i * 4 + 3] / 255; h[i] = Hd[i * 4] / 255 * a; cov[i] = A[i * 4 + 3] / 255; }
    const S = this.S;
    const hb = boxBlur(h, pw, ph, Math.max(1, Math.round(S * (o.soft || 0.3))), 2);
    const hb2 = boxBlur(h, pw, ph, Math.max(2, Math.round(S * (o.aoR || 1.8))), 2);
    const k = this.Hmax * S * 0.5 * (o.nk || 1);
    const alb = new Uint8Array(N * 4), mat = new Uint8Array(N * 4);
    const dn = o.dust === undefined ? this.dust : o.dust, dc = this.dustCol;
    const nz = Noise(o.seed || 11);
    const burnt = o.burnt; const wth = o.weather || 0;
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const i = y * pw + x, i4 = i * 4; const c = cov[i];
      if (c <= 0.002) { mat[i4] = 128; mat[i4 + 1] = 128; continue; }
      const xl = x > 0 ? i - 1 : i, xr = x < pw - 1 ? i + 1 : i, yu = y > 0 ? i - pw : i, yd = y < ph - 1 ? i + pw : i;
      let nx = -(hb[xr] - hb[xl]) * k, ny = -(hb[yd] - hb[yu]) * k;
      const nl = Math.hypot(nx, ny, 1); nx /= nl; ny /= nl;
      let r = A[i4], g = A[i4 + 1], b = A[i4 + 2];
      const ao = clamp((hb2[i] - h[i]) * (o.ao || 2.2), 0, 1);
      const curv = h[i] - hb[i];
      let f = 1 - ao * 0.6 + clamp(curv * 2.4, -0.3, 0.14);
      r *= f; g *= f; b *= f;
      if (dn > 0) {
        const nv = nz.fbm(x / (S * 6), y / (S * 6), 3) * 0.5 + 0.5;
        const d = clamp((1 - h[i] * 1.8) * nv * dn * 1.2 - 0.1, 0, 0.6);
        r = lerp(r, dc[0], d); g = lerp(g, dc[1], d); b = lerp(b, dc[2], d);
      }
      if (wth > 0 && !o.burnt) {
        const fade = nz.fbm(x / (S * 15), y / (S * 15), 2) * 0.07 * wth; r *= 1 + fade; g *= 1 + fade; b *= 1 + fade * 0.8;
        if (curv > 0.035 && h[i] > 0.25) { const e = clamp((curv - 0.035) * 6, 0, 0.35) * wth; const l = (r + g + b) / 3; r = lerp(r, l + 26, e); g = lerp(g, l + 24, e); b = lerp(b, l + 20, e); }
        const gv = nz.fbm(x / (S * 3.2) + 7, y / (S * 3.2) + 3, 3) * 0.5 + 0.5; const grime = clamp((0.62 - h[i]) * gv * 0.7 - 0.06, 0, 0.32) * wth; r = lerp(r, 58, grime); g = lerp(g, 51, grime); b = lerp(b, 40, grime);
        if (hash2(x, y, 31) > 0.988 && h[i] > 0.3) { r *= 0.68; g *= 0.68; b *= 0.66; }
      }
      let spec = Hd[i4 + 1] / 255, emi = Hd[i4 + 2] / 255, team = T[i4] / 255;
      if (burnt) {
        const nv = nz.fbm(x / (S * 3), y / (S * 3), 3) * 0.5 + 0.5; const l = (r + g + b) / 3;
        const ch = 0.16 + nv * 0.12; r = lerp(r, l * ch * 1.1, 0.88); g = lerp(g, l * ch, 0.9); b = lerp(b, l * ch * 0.9, 0.9);
        if (nv > 0.78 && h[i] > 0.2) { r += 60; g += 20; }
        spec = 0; team = 0; emi = 0;
      }
      alb[i4] = clamp(r * c, 0, 255); alb[i4 + 1] = clamp(g * c, 0, 255); alb[i4 + 2] = clamp(b * c, 0, 255); alb[i4 + 3] = A[i4 + 3];
      mat[i4] = clamp(nx * 127.5 + 127.5, 0, 255); mat[i4 + 1] = clamp(ny * 127.5 + 127.5, 0, 255); mat[i4 + 2] = clamp(team * 255, 0, 255);
      mat[i4 + 3] = emi > 0.02 ? 128 + clamp(emi * 127, 0, 127) : clamp(spec * 127, 0, 127);
    }
    const res = { pw, ph, alb, mat, ax: this.ax * S + this.m, ay: this.ay * S + this.m, ww: pw / S, wh: ph / S };
    if (o.castH) { // bake self-shadow into albedo + build external shadow sprite (static objects only)
      const K = o.castH * S * 1.255; const ul = Math.hypot(R.SHD[0], R.SHD[1]); const ux = R.SHD[0] / ul, uy = R.SHD[1] / ul;
      const mx = Math.ceil(ux * K) + 2, my = Math.ceil(uy * K) + 2; const sw = pw + mx, shh = ph + my; const sh = new Float32Array(sw * shh);
      const hs = boxBlur(h, pw, ph, 1, 1);
      const hAt = (x, y) => { const xi = x | 0, yi = y | 0; if (xi < 0 || yi < 0 || xi >= pw || yi >= ph) return 0; return hs[yi * pw + xi]; };
      for (let y = 0; y < shh; y++) for (let x = 0; x < sw; x++) {
        const inside = x < pw && y < ph; const h0 = inside ? hs[y * pw + x] : 0; let occ = 0;
        for (let st = 1.5; st < K; st += 1.5) { const hq = hAt(x - ux * st, y - uy * st); if ((hq - h0) * K >= st && hq > 0.04) { occ = 1; break; } }
        sh[y * sw + x] = occ;
      }
      const sb = boxBlur(sh, sw, shh, Math.max(1, Math.round(S * 0.6)), 1);
      for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const i = y * pw + x, k = 1 - (o.shK || 0.4) * sb[y * sw + x]; alb[i * 4] *= k; alb[i * 4 + 1] *= k; alb[i * 4 + 2] *= k; }
      const salb = new Uint8Array(sw * shh * 4), smat = new Uint8Array(sw * shh * 4);
      for (let i = 0; i < sw * shh; i++) { const a = clamp(sb[i] * 255, 0, 255); salb[i * 4 + 3] = a; smat[i * 4] = smat[i * 4 + 1] = 128; }
      res.shadow = { pw: sw, ph: shh, alb: salb, mat: smat, ax: res.ax, ay: res.ay, ww: sw / S, wh: shh / S };
    }
    return res;
  }
}
function boxBlur(src, w, h, r, passes) {
  let a = Float32Array.from(src), b = new Float32Array(src.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) { let acc = 0; const o = y * w; const n = 2 * r + 1; for (let x = -r; x <= r; x++) acc += a[o + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { b[o + x] = acc / n; acc += a[o + Math.min(x + r + 1, w - 1)] - a[o + Math.max(x - r, 0)]; } }
    for (let x = 0; x < w; x++) { let acc = 0; const n = 2 * r + 1; for (let y = -r; y <= r; y++) acc += b[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { a[y * w + x] = acc / n; acc += b[Math.min(y + r + 1, h - 1) * w + x] - b[Math.max(y - r, 0) * w + x]; } }
  }
  return a;
}
// Bake a sprite into the atlas: fn(p) draws; returns region
let QUALITY = 1;
function bake(name, ww, wh, ax, ay, S, fn, opt) {
  if (ATLAS.has(name)) return ATLAS.get(name);
  const p = new Painter(ww, wh, ax, ay, S * QUALITY, opt);
  fn(p);
  const img = p.finish(opt);
  if (opt && opt.wc4) wc4Style(img, opt.wc4);
  if (img.shadow) ATLAS.add(name + ':sh', img.shadow);
  if (opt && opt.raw) ATLAS.add(name + ':raw', rawVariant(img));
  return ATLAS.add(name, img);
}
// World-Conqueror-4 look for buildings, towns and villages: richer, brighter colours and a bold dark outline
function wc4Style(img, px) {
  const W = img.pw, H = img.ph, A = img.alb, MT = img.mat;
  for (let i = 0, n = W * H; i < n; i++) { const i4 = i * 4; if (!A[i4 + 3]) continue; const r = A[i4], g = A[i4 + 1], b = A[i4 + 2], l = r * 0.3 + g * 0.59 + b * 0.11;
    const f = v => clamp(((l + (v - l) * 1.42) - 118) * 1.12 + 132, 0, 255); A[i4] = f(r); A[i4 + 1] = f(g); A[i4 + 2] = f(b); }
  for (let pass = 0; pass < (px || 1); pass++) { const src = A.slice(); const thr = pass ? 200 : 110;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, i4 = i * 4; if (src[i4 + 3] >= thr) continue; let hit = false;
      for (let k = 0; k < 4 && !hit; k++) { const xx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), yy = y + (k === 2 ? 1 : k === 3 ? -1 : 0); if (xx >= 0 && yy >= 0 && xx < W && yy < H && src[(yy * W + xx) * 4 + 3] >= thr) hit = true; }
      if (!hit) continue; A[i4] = 30; A[i4 + 1] = 26; A[i4 + 2] = 20; A[i4 + 3] = pass ? 150 : 235; MT[i4] = 128; MT[i4 + 1] = 128; MT[i4 + 2] = 0; MT[i4 + 3] = 6; } }
}
// bare-structure version of a building (grey concrete, same relief/normals, no team colour, no lights):
// the construction site stacks it layer by layer before the final paint goes on
function rawVariant(img) {
  const n = img.pw * img.ph, A = img.alb, alb = new Uint8Array(A.length), mat = new Uint8Array(img.mat);
  for (let i = 0; i < n; i++) { const a = A[i * 4 + 3]; if (!a) continue; const k = a / 255; const l = A[i * 4] * 0.3 + A[i * 4 + 1] * 0.59 + A[i * 4 + 2] * 0.11;
    const v = clamp(l * 0.5 + 74 * k, 0, 255); alb[i * 4] = clamp(v * 1.02, 0, 255); alb[i * 4 + 1] = v; alb[i * 4 + 2] = v * 0.93; alb[i * 4 + 3] = a;
    mat[i * 4 + 2] = 0; const m3 = mat[i * 4 + 3]; mat[i * 4 + 3] = m3 >= 128 ? 12 : Math.min(m3, 22); }
  return { pw: img.pw, ph: img.ph, alb, mat, ax: img.ax, ay: img.ay, ww: img.ww, wh: img.wh };
}
function bakeImg(ww, wh, ax, ay, S, fn, opt) { const p = new Painter(ww, wh, ax, ay, S, opt); fn(p); return p.finish(opt); }

/* ---------- Camouflage & material patterns ---------- */
const PAT = {};
function camoPattern(key) {
  if (PAT[key]) return PAT[key];
  const C = CAMO[key] || CAMO.usa; const size = 256; const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const id = x.createImageData(size, size); const n = Noise(C.seed || 3); const cols = C.cols.map(hex2rgb);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  if (C.type === 'lava' && !C._seeds) { const r = RNG(C.seed || 9); C._seeds = Array.from({ length: C.cells || 30 }, () => [r() * size, r() * size]); }
  const grain = C.grain === undefined ? 1 : C.grain;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let ci = 0, rgb = null;
    if (C.type === 'digital') {
      const q = C.px || 6; const qi = Math.floor(i / q) * q, qj = Math.floor(j / q) * q;
      const v1 = n.fbm(qi / 64, qj / 64, 3, 4), v2 = n.fbm(qi / 40 + 9, qj / 40 + 4, 3, size / 40);
      ci = v1 > 0.18 ? 1 : v2 > 0.22 ? 2 : v1 < -0.28 ? 3 : 0;
    } else if (C.type === 'blotch') {
      const v1 = n.fbm(i / 70, j / 70, 4, size / 70), v2 = n.fbm(i / 55 + 17, j / 55 + 3, 4, size / 55), v3 = n.fbm(i / 45 + 5, j / 45 + 21, 3, size / 45);
      ci = v1 > 0.12 ? 1 : v2 > 0.2 ? 2 : (cols.length > 3 && v3 > 0.3) ? 3 : 0;
    } else if (C.type === 'flecks') { // Flecktarn-style: clustered small dots over a light base
      const cl = n.fbm(i / 32, j / 32, 2, size / 32), d1 = n.fbm(i / 8 + 3, j / 8 + 7, 2, size / 8), d2 = n.fbm(i / 6.4 + 11, j / 6.4 + 2, 2, size / 6.4), d3 = n.fbm(i / 5.12 + 21, j / 5.12 + 5, 2, size / 5.12);
      ci = (d3 > 0.4 && cl > 0.05) ? 3 : (d1 > 0.26 && cl > -0.25) ? 1 : (d2 > 0.3 && cl < 0.3) ? 2 : 0;
    } else if (C.type === 'splinter') { // angular cells (Voronoi, tiling): digital-splinter aircraft schemes and urban splinter
      if (!C._seeds) { const r = RNG(C.seed || 9); C._seeds = Array.from({ length: 46 }, () => [r() * size, r() * size, r() < 0.5 ? 0 : r() < 0.6 ? 1 : 2]); }
      let bd = 1e9, bc = 0; for (const [sx, sy, sc] of C._seeds) { let dx = Math.abs(i - sx), dy = Math.abs(j - sy); if (dx > size / 2) dx = size - dx; if (dy > size / 2) dy = size - dy; const d = dx * dx * 0.8 + dy * dy + dx * dy * 0.6; if (d < bd) { bd = d; bc = sc; } }
      ci = bc;
    } else if (C.type === 'tiger') { // organic stripes: whole sine cycles across the tile (seamless), bent by tiling noise
      const w = n.fbm(i / 64, j / 64, 3, 4) * 1.6 + n.fbm(i / 16 + 5, j / 16 + 9, 2, 16) * 0.5;
      const u = C.horiz ? j : i, v = C.horiz ? i : j; const s = Math.sin((u * (C.k || 9) + v * (C.kj || 1)) / size * TAU + w * 3.2);
      const thin = n.fbm(i / 32 + 11, j / 32 + 3, 2, 8) * 0.35; // stripes swell and taper along their length
      ci = s > 0.62 - thin ? 1 : (cols.length > 2 && n.fbm(i / 64 + 21, j / 64 + 7, 3, 4) > 0.26) ? 2 : 0;
    } else if (C.type === 'scales') { // overlapping scales hanging like roof tiles (upper rows lie on top)
      const q = C.px || 16, R = q * 0.8; let best = null;
      for (let rr = Math.floor(j / q) - 1; rr <= Math.floor(j / q) + 1 && !best; rr++) {
        const cy = rr * q, off = (((rr % 2) + 2) % 2) * q / 2, k0 = Math.round((i - off) / q);
        for (let kk = k0 - 1; kk <= k0 + 1; kk++) { const d = Math.hypot(i - (kk * q + off), j - cy); if (d < R && (!best || d < best.d)) best = { d, kk, rr }; }
      }
      if (!best) rgb = cols[1];
      else { const t = best.d / R; const tint = 1 + (hash2(best.kk & 255, best.rr & 255, C.seed || 1) - 0.5) * 0.18;
        rgb = t > 0.86 ? cols[1] : mix(cols[0], cols[2], Math.pow(t / 0.86, 1.5)).map(v => v * tint); }
    } else if (C.type === 'carbon') { // 2×2 twill weave: each cell is a thread running across or along
      const q = C.px || 8, a = Math.floor(i / q), b = Math.floor(j / q), dir = ((a + b) >> 1) & 1; const t = ((dir ? j : i) % q + 0.5) / q;
      rgb = mix(cols[1], cols[0], (dir ? 0.9 : 0.55) * (0.3 + 0.7 * Math.sin(t * PI)));
    } else if (C.type === 'metal') { // brushed metal: fine streaks along one axis + a broad soft sheen
      const st = n.fbm(0.5, j / 2, 2, 128) * 0.7 + (hash2(i >> 3, j, C.seed || 1) - 0.5) * 0.22;
      const sh = Math.sin((i + j) / size * TAU) * 0.55 + Math.sin((i - 2 * j) / size * TAU) * 0.3, lv = n.fbm(i / 64, j / 64, 2, 4) * 0.35;
      const v = clamp(0.52 + sh * 0.3 + st * 0.3 + lv, 0, 1); rgb = v < 0.5 ? mix(cols[1], cols[2], v * 2) : mix(cols[2], cols[0], (v - 0.5) * 2);
    } else if (C.type === 'lava') { // dark basalt plates split by glowing cracks (edges of a tiling Voronoi)
      let d1 = 1e9, d2 = 1e9; for (const [sx, sy] of C._seeds) { let dx = Math.abs(i - sx), dy = Math.abs(j - sy); if (dx > size / 2) dx = size - dx; if (dy > size / 2) dy = size - dy; const d = Math.sqrt(dx * dx + dy * dy); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      const w = d2 - d1 + n.fbm(i / 16, j / 16, 2, 16) * 2.4;
      rgb = w < 1.6 ? mix(cols[2], cols[1], clamp(w / 1.6, 0, 1)) : w < 5.5 ? mix(cols[1], cols[0], Math.sqrt(clamp((w - 1.6) / 3.9, 0, 1))) : mix(cols[0], cols[3], n.fbm(i / 32, j / 32, 3, 8) * 0.5 + 0.5);
    } else if (C.type === 'galaxy') { // deep-space nebula and stars
      const a = n.fbm(i / 64, j / 64, 4, 4) * 0.5 + 0.5, b = n.fbm(i / 32 + 7, j / 32 + 3, 3, 8) * 0.5 + 0.5;
      let c = mix(cols[0], cols[1], clamp(a * 1.7 - 0.4, 0, 1)); c = mix(c, cols[2], clamp(b * 2.2 - 1.15, 0, 1)); c = mix(c, cols[3], clamp(a + b - 1.2, 0, 1) * 0.9);
      const sp = hash2(i, j, 77); rgb = sp > 0.9965 ? [255, 255, 255] : sp > 0.991 ? mix(c, [215, 225, 255], 0.65) : c;
    } else { const v = n.fbm(i / 90, j / 90, 3, size / 90); ci = v > 0.3 ? 1 : 0; }
    const cc = rgb || cols[Math.min(ci, cols.length - 1)]; const g = ((hash2(i, j, 9) - 0.5) * 10 + n.fbm(i / 7, j / 7, 2, size / 7) * 8) * grain;
    const o = (j * size + i) * 4; id.data[o] = clamp(cc[0] + g, 0, 255); id.data[o + 1] = clamp(cc[1] + g, 0, 255); id.data[o + 2] = clamp(cc[2] + g, 0, 255); id.data[o + 3] = 255;
  }
  x.putImageData(id, 0, 0); PAT[key] = c; return c;
}
// returns a fill-style function for painters: camo(key, unitsPerTile)
function camo(key, upt) {
  return (ctx, p) => { const pat = ctx.createPattern(camoPattern(key), 'repeat'); const s = (upt || 70) / 256; if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(s)); return pat; };
}
const CAMO = {
  usa: { type: 'blotch', cols: ['#b3a07a', '#a3906c', '#bfae88'], seed: 4 },                 // CARC tan 686A
  rus: { type: 'blotch', cols: ['#545e40', '#2e302a', '#8a8566'], seed: 5 },                 // protective green, black, sand
  chn: { type: 'digital', cols: ['#636d4b', '#465034', '#868260', '#33372a'], seed: 6, px: 5 }, // PLA digital woodland
  eu: { type: 'blotch', cols: ['#4b5435', '#584833', '#24251f', '#4b5435'], seed: 7 },       // NATO three-tone
  arb: { type: 'blotch', cols: ['#c0a980', '#a68e67', '#cbb994'], seed: 8 },                 // desert sand
  // uniforms
  u_usa: { type: 'blotch', cols: ['#a29775', '#7a6e51', '#5c5541', '#c3b893'], seed: 14 },
  u_rus: { type: 'digital', cols: ['#6b7051', '#4c5139', '#8a8a6a', '#30322a'], seed: 15, px: 4 },
  u_chn: { type: 'digital', cols: ['#5e6b46', '#3f4a2e', '#86875f', '#2c3023'], seed: 16, px: 4 },
  u_eu: { type: 'blotch', cols: ['#5d6448', '#3c4530', '#7a7350', '#1f241c'], seed: 17 },
  u_arb: { type: 'digital', cols: ['#c4b08a', '#a58e68', '#8a7455', '#dccca8'], seed: 18, px: 4 },
};
CAMO.urban = { type: 'digital', cols: ['#6f7378', '#55595e', '#8b8f93', '#3e4145'], seed: 9, px: 5 };  // urban grey
CAMO.winter = { type: 'blotch', cols: ['#d9ddde', '#aab0b2', '#7f878a'], seed: 10 };              // winter white
CAMO.t_split = { type: 'splinter', cols: ['#8a8a8a', '#a4a4a4', '#606060'], seed: 51 };   // Su-57 / Su-35 digital splinter
CAMO.t_two = { type: 'blotch', cols: ['#8c8c8c', '#707070', '#9c9c9c'], seed: 52 };        // two-tone counter-shading
CAMO.t_mottle = { type: 'blotch', cols: ['#828282', '#777777', '#8e8e8e'], seed: 53 };     // radar-absorbent coating mottle
CAMO.t_dez = { type: 'blotch', cols: ['#8a8a8a', '#5e5e5e', '#a8a8a8', '#747474'], seed: 54 }; // desert / woodland helicopter camo
/* shop camouflages (rarity and price live in js/ui/economy.js · names in CAMO_OPTS, js/data/units.js)
   s = paint gloss (metal and carbon shine), grain = how much speckle noise is added */
CAMO.od = { type: 'blotch', cols: ['#5b5f3a', '#51552f', '#666a43'], seed: 21 };                       // olive drab
CAMO.fleck = { type: 'flecks', cols: ['#7d7a55', '#3d4a2b', '#5c4129', '#1e2017'], seed: 22 };          // Flecktarn
CAMO.split = { type: 'splinter', cols: ['#8d8a66', '#5b5f3e', '#3a3c2b'], seed: 23 };                   // splinter
CAMO.navy = { type: 'digital', cols: ['#34445c', '#202c3e', '#51657f', '#141b27'], seed: 24, px: 5 };   // navy digital
CAMO.jtiger = { type: 'tiger', horiz: 1, k: 10, kj: 2, cols: ['#717048', '#23231a', '#5a4a30'], seed: 25 }; // jungle tigerstripe
CAMO.carbon = { type: 'carbon', cols: ['#5a5e64', '#121316'], px: 8, s: 0.38, grain: 0.3 };            // carbon fibre
CAMO.bronze = { type: 'metal', cols: ['#f3bd80', '#6a3815', '#b8733d'], seed: 26, s: 0.5, grain: 0.25 };
CAMO.silver = { type: 'metal', cols: ['#f8fafc', '#737a83', '#c2c8cf'], seed: 27, s: 0.62, grain: 0.25 };
CAMO.gold = { type: 'metal', cols: ['#fde69c', '#986812', '#dcae48'], seed: 28, s: 0.62, grain: 0.25 };
CAMO.tiger = { type: 'tiger', k: 9, kj: 1, cols: ['#de7c24', '#17110c', '#f0e2c4'], seed: 29 };           // tiger
CAMO.dragon = { type: 'scales', px: 16, cols: ['#ef5a40', '#1a0806', '#6a120e'], seed: 30, s: 0.3, grain: 0.35 }; // red dragon scales
CAMO.lava = { type: 'lava', cells: 30, cols: ['#2a211d', '#ff6a14', '#ffe27a', '#3e312a'], seed: 31, grain: 0.4 }; // glowing lava cracks
CAMO.galaxy = { type: 'galaxy', cols: ['#0b0e2c', '#3a1d70', '#9a2f95', '#2f74c0'], seed: 32, s: 0.2, grain: 0.3 }; // nebula and stars
