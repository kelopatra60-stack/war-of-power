/* ============================================================
   War of Power — طور الصمود (الموجات)
   الملف: js/modes/survival.js   ·   ترتيب التحميل: 40 من 43
   ============================================================ */
'use strict';
/* ===== Survival mode: endless escalating waves from the map edges, a boss every fifth wave ===== */
const Survival = (function () {
  const POOL = [ // [role, first wave, weight, count range]
    ['rifle', 1, 6, [3, 6]], ['at', 1, 4, [2, 4]], ['scout', 1, 3, [1, 2]], ['sniper', 3, 1, [1, 2]], ['mortar', 3, 2, [1, 2]], ['ifv', 2, 4, [1, 3]], ['mbt', 3, 5, [1, 3]], ['aa', 5, 1, [1, 1]],
    ['tank2', 6, 3, [1, 2]], ['arty', 5, 2, [1, 2]], ['mlrs', 7, 2, [1, 2]], ['heli', 4, 3, [1, 2]], ['drone', 3, 2, [1, 2]], ['fpv', 6, 2, [2, 4]], ['medic', 4, 1, [1, 1]],
  ];
  function setup(cfg) {
    const def = MAPS.find(m => m.id === cfg.map) || MAPS.find(m => m.id === 'forest');
    const map = generateSkirmishMap(def, 2); const seed = (cfg.seed >>> 0) || ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    const G = new Game({ mode: 'survival', money: 14000, local: 0, locked: cfg.locked, seed, label: 'طور الصمود — ' + def.n }, map);
    const cx = map.w / 2, cy = map.h / 2; const st = map.starts.slice().sort((a, b) => Math.hypot(a.tx - cx, a.ty - cy) - Math.hypot(b.tx - cx, b.ty - cy))[0];
    const at = s => ({ x: (s.tx + 0.5) * TILE, y: (s.ty + 0.5) * TILE, tx: s.tx, ty: s.ty });
    G.addPlayer({ f: cfg.f, col: FACTIONS[cfg.f].col, team: 0, human: true, specials: cfg.specials, start: at(st) });
    const foes = FACTION_IDS.filter(f => f !== cfg.f); const a = foes[seed % foes.length], b = foes[(seed >>> 4) % foes.length] === a ? foes[(foes.indexOf(a) + 2) % foes.length] : foes[(seed >>> 4) % foes.length];
    for (const f of [a, b]) { let col = FACTIONS[f].col; const used = G.players.map(p => p.col); while (used.includes(col)) col = (col + 1) % 8; const p = G.addPlayer({ f, col, team: 1, human: false, popCap: 9999, start: at(map.starts.find(s => s !== st) || st) }); p.waves = 1; p.name = 'موجات ' + FACTIONS[f].short; }
    placeNeutrals(G); placeVillages(G);
    startBase(G, 0, G.players[0].start, { dozers: 2, army: [['rifle', 4], ['at', 2], ['scout', 1]] });
    G.surv = { wave: 0, next: 100, alive: 0, boss: false, diff: clamp(cfg.diff | 0, 0, 3), foes: [1, 2], lastOrder: 0, cleared: true };
    G.waveArmor = 1; G.modeTick = tick; G.updateFog(); return G;
  }
  function edgePoint(G, side) {
    const m = G.map; for (let k = 0; k < 40; k++) { let tx, ty; const t = rnd();
      if (side === 0) { tx = Math.floor(t * m.w); ty = 2; } else if (side === 1) { tx = m.w - 3; ty = Math.floor(t * m.h); } else if (side === 2) { tx = Math.floor(t * m.w); ty = m.h - 3; } else { tx = 2; ty = Math.floor(t * m.h); }
      const f = Path.nearestFree(tx, ty, 1, 10); if (f) return [(f[0] + 0.5) * TILE, (f[1] + 0.5) * TILE]; }
    return null;
  }
  function target(G) { const me = G.players[G.local]; const hq = G.blds.find(b => b.owner === me.id && b.type === 'hq' && !b.dead) || G.blds.find(b => b.owner === me.id && !b.dead); return hq ? [hq.x, hq.y] : [me.start.x, me.start.y]; }
  function spawnWave(G) {
    const S = G.surv; S.wave++; const w = S.wave; S.boss = w % 5 === 0; G.waveArmor = 1 + w * 0.035 * (0.7 + S.diff * 0.25);
    const pid = S.foes[w % S.foes.length]; const pl = G.players[pid]; const f = pl.f;
    let budget = (1800 + w * 1050 + w * w * 38) * (0.75 + S.diff * 0.28); const side = (w + (rnd() * 2 | 0)) % 4; const p0 = edgePoint(G, side); if (!p0) return;
    const list = []; const avail = POOL.filter(([r, fw]) => w >= fw && UNITS[f + '_' + r]); let tot = 0; for (const p of avail) tot += p[2];
    let guard = 0; while (budget > 250 && guard++ < 60) { let x = rnd() * tot, e = avail[0]; for (const p of avail) { x -= p[2]; if (x <= 0) { e = p; break; } } const d = UNITS[f + '_' + e[0]]; const n = e[3][0] + ((rnd() * (e[3][1] - e[3][0] + 1)) | 0); for (let i = 0; i < n && budget > 0; i++) { list.push(d.id); budget -= d.cost; } }
    if (S.boss) for (const el of eliteList(f)) if (el.cls !== 'air' || UNITS[el.id].fly === 'heli') { list.unshift(el.id); if (w < 15) break; }
    const [tx, ty] = target(G); let i = 0;
    for (const id of list) { const d = UNITS[id]; const ox = ((i % 6) - 2.5) * 30, oy = Math.floor(i / 6) * 30; i++;
      let x = p0[0] + ox, y = p0[1] + oy; if (d.cls !== 'air') { const fr = Path.nearestFree(Math.floor(x / TILE), Math.floor(y / TILE), mcOfDef(d), 6); if (!fr) continue; x = (fr[0] + 0.5) * TILE; y = (fr[1] + 0.5) * TILE; }
      const u = G.spawnUnit(id, pid, x, y, Math.atan2(ty - y, tx - x)); if (!u) continue; u.wave = w; if (d.elite) { u.special = 1; u.rank = 3; }
      if (d.cls === 'air') { u.state = 'fly'; u.z = d.alt || 70; }
      Units.order(G, u, { t: 'amove', x: tx + (rnd() - 0.5) * 160, y: ty + (rnd() - 0.5) * 160 }); }
    S.cleared = false; G.notify(G.local, (S.boss ? '☠ موجة الزعيم ' : 'الموجة ') + w + ': ' + list.length + ' وحدة معادية تقترب', S.boss ? 'bad' : 'warn', p0[0], p0[1]); SND.ui('alarm');
  }
  function tick(G, dt) {
    const S = G.surv; if (!S || G.over) return;
    if ((G.tick % 15) === 0) { let n = 0; for (const u of G.units) if (!u.dead && G.players[u.owner] && G.players[u.owner].waves) n++; S.alive = n;
      if (n === 0 && !S.cleared && S.wave > 0) { S.cleared = true; const me = G.players[G.local]; const bonus = 1000 + S.wave * 300; me.money += bonus; me.stats.earned += bonus; G.notify(G.local, 'صُدّت الموجة ' + S.wave + '! مكافأة $' + fmN(bonus), 'good'); SND.ui('rankup'); S.next = Math.min(S.next, G.t + 22); } }
    if (G.t >= S.next) { spawnWave(G); S.next = G.t + Math.max(38, 82 - S.wave * 2.2); }
    if (G.t - S.lastOrder > 12) { S.lastOrder = G.t; const [tx, ty] = target(G); for (const u of G.units) if (!u.dead && u.wave && (u.order.t === 'idle' || u.order.t === 'hold')) Units.order(G, u, { t: 'amove', x: tx + (rnd() - 0.5) * 200, y: ty + (rnd() - 0.5) * 200 }); }
  }
  return { setup, tick };
})();
