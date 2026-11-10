/* ============================================================
   War of Power — إيجاد المسار (A*)
   الملف: js/map/path.js   ·   ترتيب التحميل: 19 من 43
   ============================================================ */
'use strict';
/* ===== Pathfinding: weighted A* on tile grid with budget + smoothing ===== */
const Path = (function () {
  let W = 0, H = 0, N = 0, map = null;
  let g, par, stamp, closed, cur = 1; const heap = new Heap(4096);
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1], DC = [1, 1, 1, 1, 1.4142, 1.4142, 1.4142, 1.4142];
  function init(m) { map = m; W = m.w; H = m.h; N = W * H; g = new Float32Array(N); par = new Int32Array(N); stamp = new Uint32Array(N); closed = new Uint32Array(N); cur = 1; }
  // movement class: 0 infantry, 1 tracked, 2 wheeled
  function blocked(i, mc) { const p = map.pass[i];
    if (mc === 0) return (p & (PASS.INF | PASS.BLD)) !== 0; if (mc <= 2) return (p & (PASS.VEH | PASS.BLD)) !== 0;
    if (p & PASS.BLD) return true; return (p & PASS.VEH) !== 0 && !(p & PASS.WATER); }
  function cost(i, mc) { const p = map.pass[i]; let c = 1;
    if (p & PASS.FOREST) c = mc === 2 ? 2.6 : mc === 1 ? 1.25 : 1.4; if ((p & PASS.ROAD) && mc === 2) c = 0.75; return c; }
  function los(x0, y0, x1, y1, mc) { // tile line of sight (supercover-ish)
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, x = x0, y = y0; let n = 0;
    while (true) { if (x < 0 || y < 0 || x >= W || y >= H || blocked(y * W + x, mc)) return false; if (mc === 2 && (map.pass[y * W + x] & PASS.FOREST)) return false; if (x === x1 && y === y1) return true;
      const e2 = 2 * err; if (e2 > -dy && e2 < dx) { // diagonal: check corners
        if (blocked(y * W + x + sx, mc) || blocked((y + sy) * W + x, mc)) return false; }
      if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } if (++n > 4000) return false; }
  }
  function nearestFree(tx, ty, mc, maxR) {
    tx = clamp(tx, 0, W - 1); ty = clamp(ty, 0, H - 1); if (!blocked(ty * W + tx, mc)) return [tx, ty];
    for (let r = 1; r <= (maxR || 12); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; if (!blocked(y * W + x, mc)) return [x, y]; }
    return null;
  }
  // returns array of world points or null
  const ST = { calls: 0, exp: 0, ms: 0, max: 0 };
  function find(sx, sy, ex, ey, mc, budget) { const t0 = performance.now(); const r = find0(sx, sy, ex, ey, mc, budget); const d = performance.now() - t0; ST.calls++; ST.ms += d; if (d > ST.max) ST.max = d; return r; }
  function find0(sx, sy, ex, ey, mc, budget) {
    let s0 = [Math.floor(sx / TILE), Math.floor(sy / TILE)], e0 = [Math.floor(ex / TILE), Math.floor(ey / TILE)];
    const s = nearestFree(s0[0], s0[1], mc, 6), e = nearestFree(e0[0], e0[1], mc, 16); if (!s || !e) return null;
    const si = s[1] * W + s[0], ei = e[1] * W + e[0];
    if (si === ei) return [[ex, ey]];
    const cp = map.compFor ? map.compFor(mc) : map.comp; if (cp && cp[si] !== cp[ei] && cp[si] >= 0) budget = Math.min(budget || 30000, mc === 0 ? 5000 : 9000); // unreachable: partial path toward target
    if (los(s[0], s[1], e[0], e[1], mc)) return (e[0] === e0[0] && e[1] === e0[1]) ? [[ex, ey]] : [[(e[0] + 0.5) * TILE, (e[1] + 0.5) * TILE]];
    cur++; if (cur > 4e9) { stamp.fill(0); closed.fill(0); cur = 1; }
    heap.clear(); g[si] = 0; par[si] = -1; stamp[si] = cur; heap.push(si, 0);
    const D0 = Math.max(Math.abs(s[0] - e[0]), Math.abs(s[1] - e[1])); const wgt = D0 > 220 ? 2.1 : D0 > 90 ? 1.7 : D0 > 40 ? 1.4 : 1.25; let best = si, bestH = 1e9, n = 0; budget = budget || 30000;
    while (heap.n > 0) {
      const c = heap.pop(); if (closed[c] === cur) continue; closed[c] = cur;
      if (c === ei) { best = c; break; }
      const cx = c % W, cy = (c / W) | 0;
      const hx = Math.abs(cx - e[0]), hy = Math.abs(cy - e[1]); const hh = hx > hy ? hx + 0.4142 * hy : hy + 0.4142 * hx; if (hh < bestH) { bestH = hh; best = c; }
      if (++n > budget) break; ST.exp++;
      for (let k = 0; k < 8; k++) {
        const nx = cx + DX[k], ny = cy + DY[k]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const ni = ny * W + nx;
        if (closed[ni] === cur || blocked(ni, mc)) continue;
        if (k >= 4 && (blocked(cy * W + nx, mc) || blocked(ny * W + cx, mc))) continue;
        const ng = g[c] + DC[k] * cost(ni, mc);
        if (stamp[ni] !== cur || ng < g[ni]) { stamp[ni] = cur; g[ni] = ng; par[ni] = c; const ddx = Math.abs(nx - e[0]), ddy = Math.abs(ny - e[1]); heap.push(ni, ng + wgt * (Math.max(ddx, ddy) + 0.4142 * Math.min(ddx, ddy))); }
      }
    }
    // reconstruct
    const tiles = []; let c = best; let guard = 0; while (c !== -1 && guard++ < 100000) { tiles.push(c); if (c === si) break; c = par[c]; }
    tiles.reverse();
    // string pulling
    const pts = []; let a = 0;
    while (a < tiles.length - 1) {
      let b = Math.min(tiles.length - 1, a + 56); const ax = tiles[a] % W, ay = (tiles[a] / W) | 0;
      while (b > a + 1) { const bx = tiles[b] % W, by = (tiles[b] / W) | 0; if (los(ax, ay, bx, by, mc)) break; b--; }
      const bx = tiles[b] % W, by = (tiles[b] / W) | 0; pts.push([(bx + 0.5) * TILE, (by + 0.5) * TILE]); a = b;
    }
    if (best === ei && e[0] === e0[0] && e[1] === e0[1]) { if (pts.length) pts[pts.length - 1] = [ex, ey]; else pts.push([ex, ey]); }
    return pts.length ? pts : null;
  }
  // request queue (time-sliced)
  const q = []; let perTick = 6;
  // recent-result cache: group orders produce many near-identical long searches (same start area -> same goal area)
  const cache = []; let cacheT = 0;
  function fromCache(u, x, y, mc) {
    const tx = Math.floor(u.x / TILE), ty = Math.floor(u.y / TILE), gx = Math.floor(x / TILE), gy = Math.floor(y / TILE);
    for (let i = cache.length - 1; i >= 0; i--) { const c = cache[i]; if (c.mc !== mc || cacheT - c.t > 90) continue;
      if (Math.abs(c.sx - tx) > 4 || Math.abs(c.sy - ty) > 4 || Math.abs(c.gx - gx) > 6 || Math.abs(c.gy - gy) > 6) continue;
      const D = Math.max(Math.abs(gx - tx), Math.abs(gy - ty)); if (D < 24) return null; // short hops: plan individually
      const pts = c.pts; let k = 0; // first cached waypoint we can see directly
      while (k < pts.length - 1 && k < 3) { if (los(tx, ty, Math.floor(pts[k][0] / TILE), Math.floor(pts[k][1] / TILE), mc)) break; k++; }
      if (!los(tx, ty, Math.floor(pts[k][0] / TILE), Math.floor(pts[k][1] / TILE), mc)) return null;
      const last = pts[pts.length - 1]; if (!los(Math.floor(last[0] / TILE), Math.floor(last[1] / TILE), gx, gy, mc)) return null;
      const out = pts.slice(k); out[out.length - 1] = [x, y]; return out; }
    return null;
  }
  function request(u, x, y) { u.pathReq = { x, y }; if (!u.inQ) { u.inQ = true; q.push(u); } }
  function process(game) {
    cacheT++; let n = 0; const big = game.map.w * game.map.h > 60000; const budget = big ? 90000 : 40000; const t0 = performance.now(); const tb = big ? 5 : 4;
    const det = !!game.lockstep; // network matches: fixed work per tick so every machine plans the same paths on the same tick
    while (q.length && n < perTick && (det || n === 0 || performance.now() - t0 < tb)) {
      const u = q.shift(); u.inQ = false; if (u.dead || !u.pathReq) continue;
      const r = u.pathReq; u.pathReq = null; const mc = mcOfDef(u.def);
      const hit = fromCache(u, r.x, r.y, mc); if (hit) { u.path = hit; u.pi = 0; u.pathFail = false; ST.hits = (ST.hits || 0) + 1; continue; }
      u.path = find(u.x, u.y, r.x, r.y, mc, budget); u.pi = 0; u.pathFail = !u.path; n++;
      if (u.path && u.path.length > 1) { cache.push({ mc, t: cacheT, sx: Math.floor(u.x / TILE), sy: Math.floor(u.y / TILE), gx: Math.floor(r.x / TILE), gy: Math.floor(r.y / TILE), pts: u.path }); if (cache.length > 32) cache.shift(); }
    }
  }
  function clearQueue() { q.length = 0; cache.length = 0; }
  return { init, find,  request, process, clearQueue, nearestFree, blocked };
})();
