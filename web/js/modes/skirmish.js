/* ============================================================
   War of Power — إعداد المعركة المخصصة وبدء القواعد
   الملف: js/modes/skirmish.js   ·   ترتيب التحميل: 38 من 43
   ============================================================ */
'use strict';
/* ===== Game modes: setup for skirmish / tutorial ===== */

function placeNeutrals(G) {
  const m = G.map;
  for (const o of m.res) { if (G.canPlace('depot', o.tx, o.ty, -1, true)) { const b = G.placeBuilding('depot', -1, o.tx, o.ty, true); b.res = o.amt || 40000; } }
  for (const v of m.villages || []) if (v.city && G.canPlace('city', v.city.tx, v.city.ty, -1, true)) G.placeBuilding('city', -1, v.city.tx, v.city.ty, true);
}
function startBase(G, pid, s, opts) {
  opts = opts || {}; const pl = G.players[pid]; const f = pl.f;
  const hq = G.placeBuilding('hq', pid, s.tx - 2, s.ty - 2, true);
  const nd = opts.dozers || 1;
  for (let i = 0; i < nd; i++) { const u = G.spawnUnit(f + '_eng', pid, hq.x - 30 + i * 34, hq.y + 110, PI / 2); Units.order(G, u, { t: 'idle' }); }
  if (opts.extra) for (const [t, dx, dy] of opts.extra) { const b = G.placeBuilding(t, pid, s.tx + dx, s.ty + dy, true); if (t === 'supply') { const u = G.spawnUnit(f + '_supply', pid, b.x, b.y + b.h * 16 + 20, PI / 2); Units.order(G, u, { t: 'harvest' }); } }
  if (opts.army) for (const [r, n] of opts.army) for (let i = 0; i < n; i++) { const u = G.spawnUnit(f + '_' + r, pid, hq.x + 120 + (i % 4) * 28, hq.y - 40 + Math.floor(i / 4) * 28 + r.length * 3, 0); Units.order(G, u, { t: 'idle' }); }
  G.recalcPower(pl);
  return hq;
}
function setupSkirmish(cfg) {
  // cfg: { mapId, players:[{f, col, team, ai(level)|null, human, peer}], money, diff, reveal, seed, lockstep, local }
  const def = sizedDef(MAPS.find(m => m.id === cfg.mapId) || MAPS[0], cfg.size);
  const map = generateSkirmishMap(def, cfg.players.length);
  const seed = (cfg.seed >>> 0) || ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  const local = cfg.local !== undefined ? cfg.local : cfg.players.findIndex(p => p.human);
  const G = new Game({ mode: cfg.mode || 'skirmish', money: cfg.money || 10000, local: local < 0 ? 0 : local, reveal: cfg.reveal, locked: cfg.locked, seed, lockstep: cfg.lockstep }, map);
  const order = shuffle(map.starts.slice(), RNG(seed & 0xffff || 1));
  cfg.players.forEach((pc, i) => { const s = order[i % order.length]; G.addPlayer(Object.assign({}, pc, { start: { x: (s.tx + 0.5) * TILE, y: (s.ty + 0.5) * TILE, tx: s.tx, ty: s.ty } })); });
  placeNeutrals(G); placeVillages(G);
  G.players.forEach((p, i) => { startBase(G, i, p.start, { dozers: 1 }); }); // everyone — human or AI — starts from the same single engineering vehicle
  G.players.forEach((p, i) => { if (p.aiLevel !== undefined && p.aiLevel !== null && !p.human) new AIBrain(G, i, p.aiLevel); });
  G.updateFog();
  return G;
}
