/* ============================================================
   War of Power — أيقونات الوحدات والمباني
   الملف: js/ui/icons.js   ·   ترتيب التحميل: 34 من 43
   ============================================================ */
'use strict';
/* ===== Icons: lit renders of the real unit/building sprites ===== */
const Icons = (function () {
  const cache = new Map(); const pending = []; let busy = false;
  const L = [-0.5, -0.62, 0.62]; { const l = Math.hypot(...L); L[0] /= l; L[1] /= l; L[2] /= l; }
  function lit(img, theta, teamRGB) {
    const c = document.createElement('canvas'); c.width = img.pw; c.height = img.ph; const x = c.getContext('2d'); const id = x.createImageData(img.pw, img.ph); const d = id.data;
    const ct = Math.cos(theta), st = Math.sin(theta); const A = img.alb, Mt = img.mat; const tr = teamRGB || [200, 200, 200];
    for (let i = 0; i < img.pw * img.ph; i++) {
      const a = A[i * 4 + 3] / 255; if (a < 0.01) continue;
      let r = A[i * 4] / a, g = A[i * 4 + 1] / a, b = A[i * 4 + 2] / a;
      const nx = Mt[i * 4] / 127.5 - 1, ny = Mt[i * 4 + 1] / 127.5 - 1; const rx = nx * ct - ny * st, ry = nx * st + ny * ct; const nz = Math.sqrt(Math.max(0, 1 - rx * rx - ry * ry));
      const tm = Mt[i * 4 + 2] / 255; if (tm > 0) { const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255; r = lerp(r, tr[0] * (0.28 + lum * 1.25), tm); g = lerp(g, tr[1] * (0.28 + lum * 1.25), tm); b = lerp(b, tr[2] * (0.28 + lum * 1.25), tm); }
      const ndl = Math.max(0, rx * L[0] + ry * L[1] + nz * L[2]); const ex = Mt[i * 4 + 3] / 255; const spec = ex < 0.5 ? ex * 2 : 0, emi = ex >= 0.5 ? (ex - 0.5) * 2 : 0;
      const hx = L[0], hy = L[1], hz = L[2] + 1; const hl = Math.hypot(hx, hy, hz); const sp = Math.pow(Math.max(0, (rx * hx + ry * hy + nz * hz) / hl), 28) * spec * 1.4 * 255;
      const k = 0.42 + 1.0 * ndl + emi * 2;
      d[i * 4] = clamp(r * k * 1.02 + sp, 0, 255); d[i * 4 + 1] = clamp(g * k * 0.98 + sp, 0, 255); d[i * 4 + 2] = clamp(b * k * 0.9 + sp, 0, 255); d[i * 4 + 3] = a * 255;
    }
    x.putImageData(id, 0, 0); return c;
  }
  const S = 3.2;
  function partImg(fn, ww, wh, ax, ay, opt) { return bakeImg(ww, wh, ax, ay, S, fn, opt); }
  function renderUnit(id, team) {
    const def = UNITS[id]; const f = def.f; const th = -0.62; const tc = team || hex2rgb(TEAMCOL[FACTIONS[f].col]);
    const out = document.createElement('canvas'); const W = 200, H = 150; out.width = W; out.height = H; const o = out.getContext('2d');
    o.translate(W / 2, H / 2 + 6);
    let scale = 1;
    if (def.cls === 'inf') { // fire-team portrait: 2–3 soldiers in a wedge, rendered at high resolution
      const SI = 9; const img = bakeImg(17, 14, 7, 7, SI, p => infantryFrame(p, f, def.role, -1), { Hmax: 2.2, dust: 0.08, soft: 0.35, aoR: 1 }); const c = lit(img, th, tc);
      const solo = def.role === 'sniper' || def.role === 'engineer'; const team = solo ? [[4, -3.4], [-5, 5.6]] : [[5.5, 0], [-4, -7.2], [-4, 7.2]];
      const k = solo ? 7.4 : 6.6; o.rotate(th);
      for (const [dx, dy] of team) { o.save(); o.translate(dx * k, dy * k); o.scale(k / SI, k / SI); o.shadowColor = 'rgba(0,0,0,0.5)'; o.shadowBlur = 8; o.shadowOffsetX = 5; o.shadowOffsetY = 7; o.drawImage(c, -img.ax, -img.ay); o.restore(); }
      return out;
    }
    if (def.cls === 'air') {
      const A = AART[id]; const img = partImg(p => A.draw(p, f), A.L + 4, A.W + 4, A.L / 2 + 2, A.W / 2 + 2, { Hmax: 3, dust: 0.04 }); const c = lit(img, th, tc); scale = Math.min(170 / (A.L + 4), 120 / (A.W + 4)) * 1.0;
      o.save(); o.rotate(th); o.scale(scale / S, scale / S); o.shadowColor = 'rgba(0,0,0,0.45)'; o.shadowBlur = 16; o.shadowOffsetX = 18; o.shadowOffsetY = 24; o.drawImage(c, -img.ax, -img.ay); o.restore();
      if (A.rotor) { o.save(); o.rotate(th); o.scale(scale, scale); o.translate(A.rx || 0, 0); o.strokeStyle = 'rgba(20,22,20,0.55)'; o.lineWidth = 1.1; const nb = A.blades; for (let i = 0; i < nb; i++) { const a = i * TAU / nb + 0.3; o.beginPath(); o.moveTo(0, 0); o.lineTo(Math.cos(a) * A.rotor, Math.sin(a) * A.rotor); o.stroke(); } o.fillStyle = 'rgba(30,32,30,0.12)'; o.beginPath(); o.arc(0, 0, A.rotor, 0, TAU); o.fill(); o.restore(); }
      return out;
    }
    const va = VART[id]; const L = va.L + 4, Wd = va.W + 4;
    const hull = partImg(p => va.hull(p, f), L, Wd, L / 2, Wd / 2, { Hmax: 3.5, dust: 0.35 }); scale = Math.min(170 / (L + 10 + (va.gl ? va.gl * 0.5 : 0)), 110 / Wd);
    const parts = [[lit(hull, th, tc), hull, 0, 0, 0]];
    if (va.gun) { const g = partImg(p => va.gun(p, f), 32, 6, 3, 3, { Hmax: 2, dust: 0.1, soft: 0.3 }); parts.push([lit(g, th, tc), g, (va.tx || 0) + (va.gx || 0), 0, 0]); }
    if (va.tur) { const t2 = partImg(p => va.tur(p, f), 52, 30, 26, 15, { Hmax: 3, dust: 0.2 }); const tl = lit(t2, th, tc); for (const o of (va.mt || [va.tx || 0])) parts.push([tl, t2, o, 0, 1]); }
    o.save(); o.rotate(th); o.scale(scale / S, scale / S);
    const sx = (va.gl ? -va.gl * 0.25 : 0) * S; o.translate(sx, 0);
    for (const [c, img, dx, dy, tur] of parts) { o.save(); o.shadowColor = 'rgba(0,0,0,0.5)'; o.shadowBlur = tur ? 6 : 12; o.shadowOffsetX = tur ? 5 : 10; o.shadowOffsetY = tur ? 7 : 14; o.drawImage(c, dx * S - img.ax, dy * S - img.ay); o.restore(); }
    o.restore(); return out;
  }
  function renderBld(f, type, civ) {
    const b = civ ? CIV[type] : BLD[type]; const st = BSTYLE[b.neutral ? 'neu' : f]; const W = b.w * 32, H = b.h * 32; const s = Math.min(150 / W, 120 / H, 1.2);
    const img = bakeImg(W, H, W / 2, H / 2, Math.max(0.8, s * 1.6), p => (civ ? CART : BART)[type](p, st, f), { Hmax: 10, dust: 0.1, soft: 0.5, aoR: 2.4, ao: 2.6, castH: b.height || (civ ? 14 : 12) });
    const c = lit(img, 0, hex2rgb(TEAMCOL[FACTIONS[f] ? FACTIONS[f].col : 0]));
    const out = document.createElement('canvas'); out.width = 200; out.height = 150; const o = out.getContext('2d'); const k = Math.min(180 / img.pw, 130 / img.ph);
    o.translate(100, 75); o.scale(k, k); o.shadowColor = 'rgba(0,0,0,0.45)'; o.shadowBlur = 10; o.shadowOffsetX = 6; o.shadowOffsetY = 8; o.drawImage(c, -img.pw / 2, -img.ph / 2); return out;
  }
  function key(kind, a, b) { return kind + ':' + a + ':' + (b || ''); }
  // async request: cb(dataURL)
  function get(kind, a, b, cb) {
    const k = key(kind, a, b); if (cache.has(k)) { cb && cb(cache.get(k)); return cache.get(k); }
    pending.push({ k, kind, a, b, cb }); pump(); return null;
  }
  function pump() {
    if (busy) return; busy = true;
    const step = () => {
      const t0 = performance.now();
      while (pending.length && performance.now() - t0 < 24) {
        const j = pending.shift(); if (cache.has(j.k)) { j.cb && j.cb(cache.get(j.k)); continue; }
        let url = ''; try { const c = j.kind === 'u' ? renderUnit(j.a) : j.kind === 'cm' ? withCamo(j.a, j.b) : renderBld(j.a, j.b, j.kind === 'c'); url = c.toDataURL('image/png'); } catch (e) { console.warn('icon', j.a, e); }
        cache.set(j.k, url); j.cb && j.cb(url); for (let i = pending.length - 1; i >= 0; i--) if (pending[i].k === j.k) { const o = pending.splice(i, 1)[0]; o.cb && o.cb(url); }
      }
      if (pending.length) setTimeout(step, 8); else busy = false;
    };
    setTimeout(step, 0);
  }
  // a unit painted in a chosen camouflage (shop previews): the paint is swapped only while this one icon is drawn
  function withCamo(id, key) { const f = UNITS[id].f, old = FACTIONS[f].camo; FACTIONS[f].camo = key && key !== '-' ? key : FACTIONS[f].camo0; try { return renderUnit(id); } finally { FACTIONS[f].camo = old; } }
  function camo(id, key, cb) { return get('cm', id, key || '-', cb); }
  function clear() { for (const k of [...cache.keys()]) if (k.slice(0, 3) !== 'cm:') cache.delete(k); } // camouflage previews do not depend on the equipped paint
  return { get, camo, clear,   lit };
})();
