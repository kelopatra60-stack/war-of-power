/* ============================================================
   War of Power — طبقة الأوامر: كل فعل يغيّر المعركة يمر من هنا
   الملف: js/game/commands.js   ·   ترتيب التحميل: 21 من 43
   ============================================================ */
'use strict';
/* ===== Command layer: every player action that changes the battle goes through here ===== */
// Single player executes immediately; network matches hand the command to the lock-step scheduler,
// which runs it on every machine at the same simulation tick.
const Cmd = (function () {
  let sink = null; // set by Net while a network match runs: sink(cmd) -> true when it took the command
  function ids(G, p, list) { const out = []; for (const id of list || []) { const u = G.get(id); if (u && u.k === 'u' && u.owner === p && !u.dead && !u.inT && !u.def.nosel) out.push(u); } return out; }
  function own(G, p, id) { const b = G.get(id); return b && b.k === 'b' && b.owner === p && !b.dead ? b : null; }
  const T = {
    q(G, c) { Build.queue(G, c.p, c.u, c.n || 1, c.b | 0); },
    lv(G, c) { const b = own(G, c.p, c.b); if (b) Levels.start(G, c.p, b); },
    baa(G, c) { const b = own(G, c.p, c.b); if (b) Levels.buyAA(G, c.p, b); },
    cq(G, c) { if (c.b) { const b = own(G, c.p, c.b); if (!b) return; let i = c.i === undefined ? -1 : c.i | 0; if (i < 0 || !b.q[i] || (c.u && b.q[i].u !== c.u)) { i = -1; for (let j = b.q.length - 1; j >= 0; j--) if (!c.u || b.q[j].u === c.u) { i = j; break; } } if (i < 0) return; const it = b.q.splice(i, 1)[0]; G.players[c.p].money += it.c !== undefined ? it.c : UNITS[it.u].cost; G.players[c.p].parts += it.pc || 0; return; } Build.cancelUnit(G, c.p, c.u); },
    pl(G, c) { Build.place(G, c.p, c.b, c.x | 0, c.y | 0, c.m && c.m.length ? c.m : null); },
    o(G, c) {
      const us = ids(G, c.p, c.ids); if (!us.length || !c.o) return; const o = c.o;
      if ((o.t === 'move' || o.t === 'amove') && us.length > 1) { Units.issue(G, us, { t: o.t, x: +o.x, y: +o.y }); return; }
      for (const u of us) { Units.order(G, u, Object.assign({}, o)); if (o.t === 'harvest') { if (o.dep) { u.hdep = o.dep; u.hstate = 'find'; } if (o.cen) u.hcen = o.cen; } }
    },
    pw(G, c) { Build.usePower(G, c.p, c.id, +c.x, +c.y); },
    su(G, c) { Build.launchSuper(G, c.p, +c.x, +c.y); },
    rs(G, c) { Build.research(G, c.p, c.id); },
    ra(G, c) { const b = own(G, c.p, c.b); if (b) b.rally = [+c.x, +c.y]; },
    rp(G, c) { const b = own(G, c.p, c.b); if (b) b.repairing = !b.repairing; },
    sl(G, c) { const b = own(G, c.p, c.b); if (b) Build.sell(G, b); },
    cx(G, c) { const b = own(G, c.p, c.b); if (b && b.q.length) { const it = b.q.pop(); G.players[c.p].money += it.c !== undefined ? it.c : UNITS[it.u].cost; G.players[c.p].parts += it.pc || 0; } },
    aa(G, c) { for (const u of ids(G, c.p, c.ids)) if (u.def.work) Build.autoAssign(G, u); },
    ul(G, c) { for (const u of ids(G, c.p, c.ids)) { if (!u.load || !u.load.length) continue; Units.order(G, u, c.x !== undefined ? { t: 'unload', x: +c.x, y: +c.y } : { t: 'unload' }); } },
    sp(G, c) { Build.deploySpecial(G, c.p, c.id); },
    // gems (paid on the issuing player's device): promote soldiers one rank · finish a construction or an upgrade now
    gp(G, c) { for (const u of ids(G, c.p, c.ids)) if (u.rank < RANKS.length - 1 && !u.def.work) { u.rank++; u.xp = Math.max(u.xp, RANKS[u.rank].xp); FX.promote && FX.promote(u); } },
    gr(G, c) { const b = own(G, c.p, c.b); if (!b) return; if (b.built < 1) { for (const k of b.stages) b.prog[k] = b.works[k]; b.stage = b.stages.length; b.hp = b.maxHp; G.onBuilt(b); } else if (b.upg) b.upg.t = b.upg.T; },
    surr(G, c) { Build.surrender(G, c.p); },
    ai(G, c) { const pl = G.players[c.p]; if (pl && !pl.ai && pl.alive) { const lv = clamp(c.l === undefined ? 1 : c.l | 0, 0, 3); pl.human = false; pl.dropped = true; pl.aiLevel = lv; new AIBrain(G, c.p, lv); if (c.p === G.local) G.spectate = true; G.notify(G.local, (pl.nick || pl.name) + ': يتولى الحاسوب القيادة', 'warn'); } },
  };
  function exec(G, c) { const f = T[c.c]; if (!f || !G || !G.players[c.p]) return; try { f(G, c); } catch (e) { console.error('cmd', c.c, e); } }
  function send(c) { const G = GAME; if (!G || G.over && c.c !== 'surr') return; if (G.spectate) return; c.p = G.local; if (sink && sink(c)) return; exec(G, c); if (G.rec) G.rec.push([G.tick, c]); }
  // helpers used by UI and input
  const order = (units, o) => { const l = units.filter(u => u.k === 'u' && u.owner === GAME.local); if (l.length) send({ c: 'o', ids: l.map(u => u.id), o }); };
  return { send, exec, order, set sink(f) { sink = f; }, get sink() { return sink; } };
})();
