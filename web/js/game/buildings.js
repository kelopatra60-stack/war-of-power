/* ============================================================
   War of Power — المباني: الإنتاج، الدفاعات، الاقتصاد، القدرات، السلاح الاستراتيجي، وحدات النخبة
   الملف: js/game/buildings.js   ·   ترتيب التحميل: 24 من 43
   ============================================================ */
'use strict';
/* ===== Buildings: production, defenses, economy, powers, superweapons, tick ===== */
const Build = (function () {
  const nb = [];
  function producers(G, pid, kind) { return G.blds.filter(b => b.owner === pid && b.built >= 1 && !b.dead && b.type === kind); }
  function unitAvailable(G, pid, uid) {
    const d = UNITS[uid]; if (!d) return { ok: false, why: 'غير متاح' };
    const pl = G.players[pid]; if (d.f !== pl.f) return { ok: false, why: 'غير متاح لهذه الدولة' }; if (d.elite || d.build === 'special' || d.build === 'none') return { ok: false, why: 'وحدة خاصة — تُستدعى من قائمة التعزيزات' };
    if (!producers(G, pid, d.build).length) return { ok: false, why: 'يتطلب ' + bldName(pl.f, d.build) };
    { const need = ROLE_LVL[d.role] || 1; if (need > 1 && Levels.prodLevel(G, pid, d.build) < need) return { ok: false, why: 'يتطلب ترقية ' + bldName(pl.f, d.build) + ' للمستوى ' + need, lvl: need }; }
    if (d.max1 && (G.units.some(u => u.owner === pid && u.type === uid && !u.dead) || G.blds.some(b => b.owner === pid && b.q.some(q => q.u === uid)))) return { ok: false, why: 'مسموح بواحدة فقط' };
    for (const r of d.req || []) if (!G.has(pid, r)) return { ok: false, why: 'يتطلب ' + bldName(pl.f, r) };
    if (pl.human && G.cfg.locked && G.cfg.locked[uid]) return { ok: false, why: 'مقفل — افتحه من المتجر', locked: true };
    return { ok: true };
  }
  const ucost = (G, pid, d) => Math.round(d.cost * G.pm(pid).cost / 25) * 25;
  // second resources: iron (mines) pays for buildings, parts (resource depots) for units — always together with money
  const bIron = type => { const d = BLD[type]; return d.iron !== undefined ? d.iron : Math.round((d.cost || 0) * 0.3 / 10) * 10; };
  const uParts = d => d.parts !== undefined ? d.parts : Math.round(d.cost * 0.2 / 5) * 5;
  function queue(G, pid, uid, n, bid) {
    n = n || 1; const d = UNITS[uid]; const pl = G.players[pid]; let done = 0; if (!d) return 0; const cost = ucost(G, pid, d);
    for (let k = 0; k < n; k++) {
      const av = unitAvailable(G, pid, uid); if (!av.ok) { if (pid === G.local && !done) G.notify(pid, av.why, 'warn'); break; }
      if (isFinite(pl.popCap) && pl.pop + (d.pop || 1) + queuedPop(G, pid) > pl.popCap) { if (pid === G.local) G.notify(pid, 'بلغت الحد الأقصى للوحدات', 'warn'); break; }
      if (pl.money < cost) { if (pid === G.local) { G.notify(pid, 'لا يوجد مال كافٍ', 'warn'); SND.ui('nomoney'); } break; }
      const pc = uParts(d); if ((pl.parts || 0) < pc) { if (pid === G.local) { G.notify(pid, 'لا توجد قطع كافية — ابنِ مستودع موارد', 'warn'); SND.ui('nomoney'); } break; }
      const ps = producers(G, pid, d.build); ps.sort((a, b) => a.q.length - b.q.length || a.id - b.id); const pref = bid ? ps.find(x => x.id === bid) : null; const b = pref || ps[0]; if (b.q.length >= 9) { if (pid === G.local) G.notify(pid, 'قائمة الإنتاج ممتلئة', 'warn'); break; }
      pl.money -= cost; pl.parts -= pc; pl.stats.spent += cost; b.q.push({ u: uid, t: 0, T: d.time * G.pm(pid).unitTime, c: cost, pc }); done++;
    }
    if (done && pid === G.local) SND.ui('tick');
    return done;
  }
  function queuedPop(G, pid) { let s = 0; for (const b of G.blds) if (b.owner === pid) for (const q of b.q) s += UNITS[q.u].pop || 1; return s; }
  function cancelUnit(G, pid, uid) { // cancel last queued of this type
    for (let i = G.blds.length - 1; i >= 0; i--) { const b = G.blds[i]; if (b.owner !== pid) continue; for (let j = b.q.length - 1; j >= 0; j--) if (b.q[j].u === uid) { G.players[pid].money += b.q[j].c !== undefined ? b.q[j].c : UNITS[uid].cost; G.players[pid].parts += b.q[j].pc || 0; b.q.splice(j, 1); return true; } }
    return false;
  }
  function queueCount(G, pid, uid, bid) { let n = 0, prog = 0, first = null; for (const b of G.blds) if (b.owner === pid && (!bid || b.id === bid)) b.q.forEach((q, i) => { if (q.u === uid) { n++; if (i === 0 && (!first || q.t / q.T > prog)) { prog = q.t / q.T; first = q; } } }); return { n, prog }; }
  function exitPoint(G, b) { return [b.x, b.y + b.h * TILE / 2 + 14]; }
  function spawnFrom(G, b, uid) {
    const d = UNITS[uid];  let [x, y] = exitPoint(G, b); let a0 = PI / 2;
    if (d.cls === 'air') { x = b.x + (rnd() - 0.5) * 40; y = b.y; }
    else { const f = Path.nearestFree(Math.floor(x / TILE), Math.floor(y / TILE), mcOfDef(d), 6); if (f) { x = (f[0] + 0.5) * TILE + (rnd() - 0.5) * 10; y = (f[1] + 0.5) * TILE + (rnd() - 0.5) * 10; } }
    const u = G.spawnUnit(uid, b.owner, x, y, a0); if (!u) return null;
    if ((b.lvl || 1) > 1 && !d.work && !d.harvest) { const r = Math.min(RANKS.length - 1, b.lvl - 1); if (u.rank < r) { u.rank = r; u.xp = Math.max(u.xp, RANKS[r].xp); } u.tier = b.lvl; }
    if (d.fly === 'jet') { const pi = Units.claimPad(G, u, b); if (pi >= 0) { const [px, py] = Units.padPos(b, pi); u.x = u.px = px; u.y = u.py = py; u.state = 'park'; u.a = -PI / 2; u.z = 0; for (const ws of u.w) if (ws.d.ammo) ws.ammo = ws.d.ammo; } else { u.state = 'fly'; u.z = d.alt; u.gx = b.x; u.gy = b.y; } }
    if (d.harvest) Units.order(G, u, { t: 'harvest' });
    else if (d.work) { Units.order(G, u, { t: 'idle' }); autoAssign(G, u); if (u.order.t === 'idle' && !b.rally) Units.order(G, u, { t: 'move', x: x + (rnd() - 0.5) * 60, y: y + 30 + rnd() * 40 }); }
    else if (b.rally && d.fly !== 'jet') Units.order(G, u, { t: d.cls === 'air' ? 'move' : 'amove', x: b.rally[0] + (rnd() - 0.5) * 50, y: b.rally[1] + (rnd() - 0.5) * 50 });
    else if (d.cls !== 'air') Units.order(G, u, { t: 'move', x: x + (rnd() - 0.5) * 70, y: y + 24 + rnd() * 50 });
    else { u.gx = x; u.gy = y - 60; Units.order(G, u, { t: 'idle' }); }
    if (b.owner === G.local) { SND.ui('ready'); UI.unitReady && UI.unitReady(u); }
    FX.spawn && FX.spawn(u, b);
    return u;
  }
  // assign idle machine to nearest unfinished site of its owner
  function autoAssign(G, u) {
    if (!u.def.work) return false; let best = null, bd = 1e18;
    for (const b of G.blds) { if (b.owner !== u.owner || b.built >= 1 || b.dead) continue; const st = b.stages[b.stage]; if (Units.machineRate(G, u, b, st) <= 0) continue; const workers = G.units.filter(v => v.order.t === 'build' && v.order.bid === b.id).length; if (workers >= 4) continue; const d = dist2(u.x, u.y, b.x, b.y) * (1 + workers * 0.6); if (d < bd) { bd = d; best = b; } }
    if (best) { Units.order(G, u, { t: 'build', bid: best.id }); return true; } return false;
  }
  function dispatch(G, b, preferIds) { // send machines to a new site
    const pid = b.owner; const ms = G.units.filter(u => u.owner === pid && u.def.work && !u.dead);
    let sent = 0; const pref = preferIds ? ms.filter(u => preferIds.includes(u.id)) : [];
    for (const u of pref) { Units.order(G, u, { t: 'build', bid: b.id }); sent++; }
    if (!sent) { const idle = ms.filter(u => u.order.t === 'idle' || u.order.t === 'move' && !u.goal); idle.sort((a, c) => dist2(a.x, a.y, b.x, b.y) - dist2(c.x, c.y, b.x, b.y));
      const need = new Set(b.stages); for (const u of idle) { if (sent >= 3) break; let useful = false; for (const s of need) if (Units.machineRate(G, u, b, s) > 0) useful = true; if (!useful) continue; Units.order(G, u, { t: 'build', bid: b.id }); sent++; } }
    if (!sent) { const any = ms.filter(u => u.order.t !== 'build').sort((a, c) => dist2(a.x, a.y, b.x, b.y) - dist2(c.x, c.y, b.x, b.y)); if (any[0]) { Units.order(G, any[0], { t: 'build', bid: b.id }); sent++; } }
    if (!sent && pid === G.local) G.notify(pid, ms.length ? 'كل آلات البناء مشغولة — سيبدأ البناء عند توفر آلة' : 'لا توجد آلات بناء! أنتج عربة هندسية من مقر القيادة', 'warn');
    return sent;
  }
  function bcost(G, pid, type) { const d = BLD[type]; let c = d.cost || 0; const pl = G.players[pid]; const m = FACTIONS[pl.f].mod; if (m.bldCost) c = Math.round(c * m.bldCost); else if (m.cost) c = Math.round(c * 0.92); return c; }
  function buildAvailable(G, pid, type) {
    const d = BLD[type]; const pl = G.players[pid]; if (!d) return { ok: false };
    if (d.neutral) return { ok: false }; if (d.only && d.only !== pl.f) return { ok: false, why: 'خاص بـ' + FACTIONS[d.only].name };
    for (const r of d.req || []) if (!G.has(pid, r)) return { ok: false, why: 'يتطلب ' + bldName(pl.f, r) };
    if (d.max1 && G.count(pid, type) >= 1) return { ok: false, why: 'مسموح بواحد فقط' };
    if (type === 'hq' && G.count(pid, 'hq') >= 2) return { ok: false, why: 'الحد الأقصى للمقرات' };
    return { ok: true };
  }
  function place(G, pid, type, tx, ty, machines) {
    const av = buildAvailable(G, pid, type); const pl = G.players[pid]; if (!av.ok) { if (pid === G.local) G.notify(pid, av.why || 'غير متاح', 'warn'); return null; }
    if (!G.canPlace(type, tx, ty, pid)) { if (pid === G.local) G.notify(pid, 'لا يمكن البناء هنا', 'warn'); return null; }
    const c = bcost(G, pid, type); if (pl.money < c) { if (pid === G.local) { G.notify(pid, 'لا يوجد مال كافٍ', 'warn'); SND.ui('nomoney'); } return null; }
    const ic = bIron(type); if ((pl.iron || 0) < ic) { if (pid === G.local) { G.notify(pid, 'لا يوجد حديد كافٍ — ابنِ منجم حديد', 'warn'); SND.ui('nomoney'); } return null; }
    pl.money -= c; pl.iron -= ic; pl.stats.spent += c; const b = G.placeBuilding(type, pid, tx, ty, false); b.paid = c; b.paidI = ic; if (pid === G.local) SND.ui('place');
    G.map.paintLayer(b.tx + b.w / 2, b.ty + b.h / 2, Math.max(b.w, b.h) * 0.7, TL.DIRT, 0.5); G.terrainDirty = [b.tx - 2, b.ty - 2, b.w + 4, b.h + 4];
    dispatch(G, b, machines); return b;
  }
  function sell(G, b) {
    if (!b || b.dead || b.owner < 0 || !G.players[b.owner]) return; const pl = G.players[b.owner];
    pl.iron += Math.round((b.paidI || 0) * (b.built >= 1 ? 0.5 : 0.75));
    const refund = Math.round((b.paid || bcost(G, b.owner, b.type)) * (b.built >= 1 ? 0.5 : 0.75) * (b.hp / b.maxHp * 0.5 + 0.5));
    pl.money += refund; FX.money(b.x, b.y, refund); FX.sell(b); b.dead = true; G.removeBuilding(b); G.wrecks.push({ x: b.x, y: b.y, a: 0, type: b.type, bld: 1, owner: b.owner, t: 0, life: 30, fire: 0, w: b.w, h: b.h, sold: 1 });
    for (const u of G.units) if (u.order.t === 'build' && u.order.bid === b.id) { Units.order(G, u, { t: 'idle' }); autoAssign(G, u); }
    if (b.owner === G.local) SND.ui('sell');
  }
  /* --- research --- */
  function techState(G, pid, id) { const pl = G.players[pid]; const up = techById(pl.f, id); if (!up) return { ok: false, why: 'غير متاح' }; if (pl.upg[id]) return { ok: false, done: true, why: 'مكتمل' };
    for (const a of up.after || []) if (!pl.upg[a]) return { ok: false, why: 'يتطلب: ' + (techById(pl.f, a) || {}).n, lock: true };
    if (!G.has(pid, up.req)) return { ok: false, why: 'يتطلب ' + bldName(pl.f, up.req), lock: true }; return { ok: true }; }
  function research(G, pid, id) {
    const pl = G.players[pid]; const up = techById(pl.f, id); if (!up || pl.upg[id] || pl.research) return false;
    const st = techState(G, pid, id); if (!st.ok) { if (pid === G.local) G.notify(pid, st.why, 'warn'); return false; }
    if (pl.money < up.cost) { if (pid === G.local) { G.notify(pid, 'لا يوجد مال كافٍ', 'warn'); SND.ui('nomoney'); } return false; }
    pl.money -= up.cost; pl.research = { id, t: 0, T: up.time }; if (pid === G.local) SND.ui('click'); return true;
  }
  function finishResearch(G, pl, id) {
    const old = G.pm(pl.id); pl.upg[id] = true; pl.research = null; pl.pmc = null; const nw = G.pm(pl.id);
    for (const u of G.units) if (u.owner === pl.id) { const k = G.hpK(nw, u.def) / G.hpK(old, u.def); if (k !== 1) { u.maxHp = Math.round(u.maxHp * k); u.hp *= k; } }
    if (nw.bldHp !== old.bldHp) for (const b of G.blds) if (b.owner === pl.id) { const k = nw.bldHp / old.bldHp; b.maxHp = Math.round(b.maxHp * k); b.hp *= k; }
    G.recalcPower(pl); const t = techById(pl.f, id); G.notify(pl.id, 'اكتمل البحث: ' + (t ? t.n : id), 'good'); if (pl.id === G.local) SND.ui('research');
  }
  /* --- building update --- */
  function update(G, b, dt) {
    if (b.dead) return; b.anim += dt; if (b.hit > 0) b.hit -= dt; if (b.flash > 0) b.flash -= dt;
    const pl = b.owner >= 0 ? G.players[b.owner] : null;
    if (b.built < 1) return;
    if (b.upg) Levels.tick(G, b, dt);
    const low = pl && G.lowPower(b.owner);
    // production
    if (b.q.length) { const it = b.q[0]; it.t += dt * (low ? 0.5 : 1) * (G.mode === 'tut' ? 2 : 1); if (it.t >= it.T) { if (pl.pop + (UNITS[it.u].pop || 1) <= pl.popCap + 4) { const r = spawnFrom(G, b, it.u); b.q.shift(); if (r === null && UNITS[it.u].cls === 'sea') { /* refunded in spawnFrom */ } } else it.t = it.T; } }
    // defenses
    if (b.wp.length) {
      b.scan = (b.scan || 0) - dt; let tgt = G.get(b.tid);
      if (b.scan <= 0 || !Combat.alive(tgt)) { b.scan = 0.4; let R = 0; for (const ws of b.wp) R = Math.max(R, ws.d.range); tgt = Combat.acquire(G, b, R); b.tid = tgt ? tgt.id : 0; }
      if (b.icT !== undefined && G.t - b.icT < 0.6) b.ta = angTo(b.ta, b.icA, 9 * dt); else if (tgt && Combat.alive(tgt)) b.ta = angTo(b.ta, Math.atan2(tgt.y - b.y, tgt.x - b.x), 3.2 * dt); else b.ta += dt * 0.25;
      Units.weapons(G, b, dt, Combat.alive(tgt) ? tgt : null, true, b.ta);
    }
    // repair (manual)
    if (b.repairing && pl && b.hp < b.maxHp) { const amt = b.maxHp * 0.035 * dt; const c = amt / b.maxHp * (b.paid || 1000) * 0.3; if (pl.money >= c) { pl.money -= c; b.hp = Math.min(b.maxHp, b.hp + amt); b.rfx = (b.rfx || 0) - dt; if (b.rfx <= 0) { b.rfx = 0.6; FX.weld(b, null); } } else b.repairing = false; }
    else if (b.repairing && b.hp >= b.maxHp) b.repairing = false;
    // AI auto repair
    if (pl && pl.ai && b.hp < b.maxHp * 0.7 && G.t - (b.lastHitT || -99) > 6) b.repairing = true;
    // income structures
    if (b.def.income && b.owner >= 0) { b.inc += dt; if (b.inc >= b.def.incomeT) { b.inc = 0; const pm = G.pm(b.owner); const k = (FACTIONS[pl.f].mod.income || 1) * pm.income * (b.type === 'city' ? LVL_INC[Levels.lv(b) - 1] : 1); const v = Math.round(b.def.income * k * (pl.incK || 1)); pl.money += v; pl.stats.earned += v; if (b.owner === G.local && G.visibleTo(G.local, b.x, b.y)) FX.money(b.x, b.y - 20, v); } }
    if ((b.def.ironInc || b.def.partsInc) && b.owner >= 0) { b.rinc = (b.rinc || 0) + dt; if (b.rinc >= (b.def.incomeT || 5)) { b.rinc = 0; const k = pl.incK || 1; if (b.def.ironInc) pl.iron = (pl.iron || 0) + Math.round(b.def.ironInc * k); if (b.def.partsInc) pl.parts = (pl.parts || 0) + Math.round(b.def.partsInc * k); if (b.owner === G.local && b.type !== 'hq' && G.visibleTo(G.local, b.x, b.y)) FX.text(b.x, b.y - 22, b.def.ironInc ? '+' + Math.round(b.def.ironInc * k) + ' حديد' : '+' + Math.round(b.def.partsInc * k) + ' قطع', b.def.ironInc ? '#e0a27a' : '#9fd0ff'); } }
    // radar station: early warning when enemy aircraft enter its coverage
    if (b.def.warn && pl && !low) { b.wt = (b.wt || 0) - dt; if (b.wt <= 0) { b.wt = 1.5; for (const u of G.uhash.query(b.x, b.y, b.def.warn, nb)) { if (u.dead || u.def.cls !== 'air' || u.z < 10 || !G.enemies(b.owner, u.owner)) continue; if (Math.hypot(u.x - b.x, u.y - b.y) > b.def.warn) continue; if (G.t - (pl._airW || -99) > 25) { pl._airW = G.t; G.notify(b.owner, 'الرادار: طائرات معادية تقترب!', 'bad', u.x, u.y); if (b.owner === G.local) SND.ui('warn'); } break; } } }
    // healing auras
    if (b.def.heal || b.def.healInf) { b.ht = (b.ht || 0) - dt; if (b.ht <= 0) { b.ht = 0.5; const R = 150; for (const u of G.uhash.query(b.x, b.y, R, nb)) { if (u.owner !== b.owner || u.dead) continue; if (b.def.heal && u.def.cls === 'veh' && u.hp < u.maxHp && Math.hypot(u.x - b.x, u.y - b.y) < R) { u.hp = Math.min(u.maxHp, u.hp + b.def.heal * 0.5); if (rnd() < 0.3) FX.weld(u, null); } if (b.def.healInf && u.def.cls === 'inf' && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + b.def.healInf * 0.5); } } }
    // superweapon charge
    if (b.type === 'super' && pl) { if (!low) b.charge = Math.min(b.def.charge, b.charge + dt * G.pm(b.owner).superK); const T = b.def.charge; if (b.charge >= T && !pl.superReady) { pl.superReady = true; G.notify(b.owner, 'السلاح الاستراتيجي جاهز للإطلاق!', 'good'); G.players.forEach((p2, j) => { if (j !== b.owner && j === G.local) G.notify(j, 'تحذير: سلاح العدو الاستراتيجي جاهز!', 'bad'); }); SND.ui('superReady'); } }
    // burning when damaged
    if (b.hp < b.maxHp * 0.45) { b.burn -= dt; if (b.burn <= 0) { b.burn = 0.25 + rnd() * 0.3; FX.bldBurn(b); } }
  }
  /* --- air-defence can shoot down recon planes, bombers and transports flying over it --- */
  function interceptFlight(G, pid, sx, sy, x, y) {
    let surv = 1, best = 0, hx = x, hy = y; const vx = x - sx, vy = y - sy, L = vx * vx + vy * vy || 1;
    const consider = (e, wl) => { const t = clamp(((e.x - sx) * vx + (e.y - sy) * vy) / L, 0, 1); const dd = Math.hypot(e.x - (sx + vx * t), e.y - (sy + vy * t)); let miss = 1; for (const ws of wl) { const d = ws.d; if (!d || !d.air || (d.t !== 'aa' && d.t !== 'aagun') || dd > d.range) continue; miss *= d.t === 'aa' ? 0.58 : 0.8; } if (miss < 1) { surv *= miss; if (1 - miss >= best) { best = 1 - miss; hx = sx + vx * t; hy = sy + vy * t; } } };
    for (const b of G.blds) if (!b.dead && b.built >= 1 && G.enemies(pid, b.owner) && b.wp && b.wp.length) consider(b, b.wp);
    for (const u of G.units) if (!u.dead && !u.inT && G.enemies(pid, u.owner) && u.def.cls !== 'air' && u.w && u.w.length) consider(u, u.w);
    if (surv >= 1 || rnd() < surv) return null;
    setTimeout(() => { try { FX.explode(hx, hy, 60, { dt: 'aa', splash: 22, dmg: 320 }, false); } catch (e) { FX.fireball(hx, hy, 8, 30, 0.8); } }, 1400);
    return { x: hx, y: hy };
  }
  function shotDown(G, pid, name, hit) { G.players.forEach((p2, j) => { if (j !== G.local) return; if (j === pid) G.notify(j, 'أُسقطت طائراتنا! فشلت العملية: ' + name, 'bad', hit.x, hit.y); else if (G.enemies(j, pid)) G.notify(j, 'دفاعنا الجوي أسقط طائرات العدو (' + name + ')', 'good', hit.x, hit.y); }); }
  /* --- commander powers & superweapons --- */
  function powerReady(G, pid, id) { const pl = G.players[pid]; const P = POWERS.find(p => p.id === id); if (!P) return false; return pl.rank >= P.rank && G.has(pid, 'ops') && (pl.pcd[id] || 0) <= G.t; }
  function usePower(G, pid, id, x, y) {
    const pl = G.players[pid]; const P = POWERS.find(p => p.id === id); if (!powerReady(G, pid, id)) return false;
    pl.pcd[id] = G.t + P.cd; const f = pl.f; const name = (FPOW_NAMES[f] && FPOW_NAMES[f][id]) || P.n;
    const sx = pl.start ? pl.start.x : x, sy = pl.start ? pl.start.y : y;
    const flies = id === 'recon' || id === 'strike' || id === 'para'; const hit = flies ? interceptFlight(G, pid, sx, sy, x, y) : null;
    if (hit) { FX.flyby(G, pid, id, sx, sy, x, y); shotDown(G, pid, name, hit); SND.ui('power'); return true; }
    if (id === 'recon') { G.reveals.push({ x, y, r: P.r, t: 30, owner: pid }); FX.flyby(G, pid, 'recon', sx, sy, x, y); }
    else if (id === 'strike') { FX.flyby(G, pid, 'strike', sx, sy, x, y); const a = Math.atan2(y - sy, x - sx); for (let i = 0; i < 6; i++) G.strikes.push({ t: G.t + 2.2 + i * 0.16, kind: 'bomb', x: x + Math.cos(a) * (i - 2.5) * 34 + (rnd() - 0.5) * 20, y: y + Math.sin(a) * (i - 2.5) * 34 + (rnd() - 0.5) * 20, owner: pid, dmg: 380, r: 60 }); }
    else if (id === 'para') { const roles = ['rifle', 'rifle', 'rifle', 'rifle', 'at', 'at', 'at', 'rifle']; FX.flyby(G, pid, 'para', sx, sy, x, y); roles.forEach((r, i) => G.strikes.push({ t: G.t + 2.4 + i * 0.12, kind: 'para', x: x + (rnd() - 0.5) * 70, y: y + (rnd() - 0.5) * 70, owner: pid, uid: f + '_' + r })); }
    else if (id === 'infil') { for (const r of ['sniper', 'at', 'at', 'rifle', 'rifle', 'rifle']) { const uid = f + '_' + r; if (!UNITS[uid]) continue; let px = x + (rnd() - 0.5) * 60, py = y + (rnd() - 0.5) * 60; const fr = Path.nearestFree(Math.floor(px / TILE), Math.floor(py / TILE), mcOfDef(UNITS[uid]), 6); if (fr) { px = (fr[0] + 0.5) * TILE; py = (fr[1] + 0.5) * TILE; } const u = G.spawnUnit(uid, pid, px, py, 0); if (u) { u.rank = Math.max(u.rank, 2); u.xp = Math.max(u.xp, RANKS[2].xp); Units.order(G, u, { t: 'hold' }); } } FX.dust(x, y, 4, 50, [150, 150, 140]); }
    else if (id === 'drones') { const uid = UNITS[f + '_drone'] ? f + '_drone' : f + '_fpv'; if (UNITS[uid]) for (let i = 0; i < 4; i++) { const u = G.spawnUnit(uid, pid, sx + (rnd() - 0.5) * 80, sy + (rnd() - 0.5) * 80, 0); if (u) Units.order(G, u, { t: 'amove', x: x + (rnd() - 0.5) * 60, y: y + (rnd() - 0.5) * 60 }); } }
    else if (id === 'spy') { pl.spyT = G.t + 25; }
    else if (id === 'nuke') { G.strikes.push({ t: G.t + 3, kind: 'ballistic', sx, sy, x, y, owner: pid, dmg: 2600, r: P.r }); G.players.forEach((p2, j) => { if (j !== pid && j === G.local) G.notify(j, 'تحذير! إطلاق نووي معادٍ', 'bad', x, y); }); }
    else if (id === 'barrage') { for (let i = 0; i < 36; i++) G.strikes.push({ t: G.t + 1 + i * 0.22 + rnd() * 0.2, kind: 'shell', x: x + (rnd() - 0.5) * P.r * 1.6, y: y + (rnd() - 0.5) * P.r * 1.6, owner: pid, dmg: 200, r: 50, sx, sy }); }
    else if (id === 'repair') { for (const u of G.units) if (u.owner === pid && Math.hypot(u.x - x, u.y - y) < P.r) { u.hp = u.maxHp; FX.weld(u, null); } for (const b of G.blds) if (b.owner === pid && Math.hypot(b.x - x, b.y - y) < P.r + 60) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.5); }
    if (pid === G.local) G.notify(pid, 'تم تنفيذ: ' + name, 'good'); else if (id !== 'recon') G.notify(G.local, 'العدو يستخدم: ' + name, 'bad', x, y);
    SND.ui('power'); return true;
  }
  function launchSuper(G, pid, x, y) {
    const pl = G.players[pid]; if (!pl.superReady) return false; const b = G.get(pl.superB); if (!b || b.dead) return false;
    pl.superReady = false; b.charge = 0; pl.stats.supers = (pl.stats.supers || 0) + 1; const S = SUPER[pl.f]; const ox = b.x, oy = b.y;
    G.players.forEach((p2, j) => { if (j === G.local) G.notify(j, (j === pid ? 'إطلاق: ' : 'تحذير! إطلاق معادٍ: ') + S.n, j === pid ? 'good' : 'bad', x, y); });
    SND.ui('launch');
    if (S.kind === 'cruise') for (let i = 0; i < S.count; i++) G.strikes.push({ t: G.t + 0.4 + i * 0.35, kind: 'cruise', sx: ox, sy: oy, x: x + (rnd() - 0.5) * S.area, y: y + (rnd() - 0.5) * S.area, owner: pid, dmg: S.dmg, r: S.r });
    else if (S.kind === 'ballistic') for (let i = 0; i < S.count; i++) G.strikes.push({ t: G.t + 0.5 + i * 1.2, kind: 'ballistic', sx: ox, sy: oy, x: x + (i ? (rnd() - 0.5) * S.area : 0), y: y + (i ? (rnd() - 0.5) * S.area : 0), owner: pid, dmg: S.dmg, r: S.r });
    else if (S.kind === 'hyper') G.strikes.push({ t: G.t + 0.4, kind: 'hyper', sx: ox, sy: oy, x, y, owner: pid, dmg: S.dmg, r: S.r });
    else if (S.kind === 'smart') { const targets = G.blds.filter(bb => G.enemies(pid, bb.owner) && Math.hypot(bb.x - x, bb.y - y) < S.area).sort((a, c) => (c.def.cost || 0) - (a.def.cost || 0)); for (let i = 0; i < S.count; i++) { const t = targets[i % Math.max(1, targets.length)]; G.strikes.push({ t: G.t + 0.5 + i * 0.4, kind: 'cruise', sx: ox, sy: oy, x: t ? t.x : x + (rnd() - 0.5) * 120, y: t ? t.y : y + (rnd() - 0.5) * 120, owner: pid, dmg: S.dmg, r: S.r }); } }
    else if (S.kind === 'carpet') { const a = Math.atan2(y - oy, x - ox); for (let j = 0; j < S.count; j++) { const off = (j - (S.count - 1) / 2) * 50; { const hit = interceptFlight(G, pid, ox - Math.sin(a) * off, oy + Math.cos(a) * off, x - Math.sin(a) * off, y + Math.cos(a) * off); if (hit) { FX.flyby(G, pid, 'carpet', ox - Math.sin(a) * off, oy + Math.cos(a) * off, x - Math.sin(a) * off, y + Math.cos(a) * off); shotDown(G, pid, S.n, hit); continue; } } FX.flyby(G, pid, 'carpet', ox - Math.sin(a) * off, oy + Math.cos(a) * off, x - Math.sin(a) * off, y + Math.cos(a) * off, j * 0.3); for (let i = 0; i < 9; i++) { const k = (i - 4) * S.area / 9; G.strikes.push({ t: G.t + 2.6 + j * 0.3 + i * 0.09, kind: 'bomb', x: x + Math.cos(a) * k - Math.sin(a) * off, y: y + Math.sin(a) * k + Math.cos(a) * off, owner: pid, dmg: S.dmg, r: S.r }); } } }
    return true;
  }
  function strikes(G) {
    for (let i = G.strikes.length - 1; i >= 0; i--) {
      const s = G.strikes[i]; if (G.t < s.t) continue; G.strikes.splice(i, 1);
      if (s.kind === 'bomb') G.proj.push({ t: 'bomb', x: s.x - 30, y: s.y - 20, z: 150, z0: 150, vx: 30 / 1.2, vy: 20 / 1.2, T: 1.2, life: 0, tx: s.x, ty: s.y, owner: s.owner, sid: 0, tid: 0, dmg: s.dmg, dt: 'bomb', splash: s.r, w: WPN.jet_bomb });
      else if (s.kind === 'shell') { const a = Math.atan2(s.y - s.sy, s.x - s.sx); const sx = s.x - Math.cos(a) * 900, sy = s.y - Math.sin(a) * 900; G.proj.push({ t: 'arty', x: sx, y: sy, sx, sy, tx: s.x, ty: s.y, z: 300, T: 2.2, apex: 600, life: 0, owner: s.owner, sid: 0, tid: 0, dmg: s.dmg, dt: 'he', splash: s.r, w: WPN.how155, ang: a }); }
      else if (s.kind === 'cruise' || s.kind === 'ballistic' || s.kind === 'hyper') { const L = Math.hypot(s.x - s.sx, s.y - s.sy); const sp = s.kind === 'cruise' ? 520 : s.kind === 'ballistic' ? 700 : 2600; const T = s.kind === 'hyper' ? 1.4 : Math.max(2, L / sp); G.proj.push({ t: 'arty', x: s.sx, y: s.sy, sx: s.sx, sy: s.sy, tx: s.x, ty: s.y, z: 10, T, apex: s.kind === 'cruise' ? 60 : s.kind === 'ballistic' ? Math.min(2600, L * 0.5 + 600) : 3000, life: 0, owner: s.owner, sid: 0, tid: 0, dmg: s.dmg, dt: 'bomb', splash: s.r, w: { proj: 'arty', t: 'bomb' }, special: s.kind, ang: Math.atan2(s.y - s.sy, s.x - s.sx) }); }
      else if (s.kind === 'para') { const u = G.spawnUnit(s.uid, s.owner, s.x, s.y, rnd() * TAU); if (u) { u.para = 1.6; if (s.sp) { u.special = 1; G.players[s.owner].pop -= u.def.pop || 1; } Units.order(G, u, { t: 'idle' }); FX.para(u); } }
      else if (s.kind === 'kamik') { Combat.splash(G, s.x, s.y, s.r, s.dmg, 'heat', s.owner, null); FX.explode(s.x, s.y, 0, { dmg: s.dmg, dt: 'heat', w: WPN.fpvk, splash: s.r, owner: s.owner }, true); }
    }
  }
  // elite units: free for every player, each one can be called in again after ELITE_CD seconds
  function deploySpecial(G, pid, uid) {
    const pl = G.players[pid]; const d = UNITS[uid]; if (!pl || !d || !d.elite || d.f !== pl.f) return false; pl.specUsed = pl.specUsed || {};
    const readyAt = pl.specUsed[uid] || 0; if (G.t < readyAt) { if (pid === G.local) G.notify(pid, 'وحدة النخبة جاهزة بعد ' + Math.ceil(readyAt - G.t) + ' ث', 'warn'); return false; }
    const hq = G.blds.find(b => b.owner === pid && b.type === 'hq' && !b.dead && b.built >= 1) || G.blds.find(b => b.owner === pid && !b.dead && b.built >= 1); if (!hq) return false;
    pl.specUsed[uid] = G.t + ELITE_CD;
    let x = hq.x, y = hq.y + hq.h * TILE / 2 + 30; if (d.cls !== 'air') { const f = Path.nearestFree(Math.floor(x / TILE), Math.floor(y / TILE), mcOfDef(d), 8); if (f) { x = (f[0] + 0.5) * TILE; y = (f[1] + 0.5) * TILE; } }
    const u = G.spawnUnit(uid, pid, x, y, PI / 2); if (!u) return false; pl.pop -= d.pop || 1; u.special = 1; // elites do not count against the unit cap
    if (d.cls === 'air') { u.state = 'fly'; u.z = d.alt; u.gx = hq.x; u.gy = hq.y - 80; }
    Units.order(G, u, { t: 'idle' }); FX.emerge(x, y, true); if (G.onSpecial) G.onSpecial(pid, uid); if (pid === G.local) { G.notify(pid, 'وصلت التعزيزات الخاصة: ' + d.n, 'good', x, y); SND.ui('superReady'); } else G.notify(G.local, 'العدو استدعى وحدة نخبة: ' + d.n, 'warn', x, y);
    return true;
  }
  function surrender(G, pid) {
    const pl = G.players[pid]; if (!pl || !pl.alive) return; for (const u of G.units.slice()) if (u.owner === pid && !u.dead) Combat.kill(G, u, -1, null); for (const b of G.blds.slice()) if (b.owner === pid && !b.dead) Combat.kill(G, b, -1, null); if (pl.tunnel) pl.tunnel.length = 0; G.dirtyVictory = true;
  }
  function playerUpdate(G, pl, dt) {
    if (!pl.alive) return;
    if (pl.research) { pl.research.t += dt * (G.lowPower(pl.id) ? 0.5 : 1); if (pl.research.t >= pl.research.T) finishResearch(G, pl, pl.research.id); }
  }
  return { bIron, uParts, queue, cancelUnit, queueCount, unitAvailable, buildAvailable, place, sell, research, techState, update, usePower, powerReady, launchSuper, strikes, playerUpdate, autoAssign,  bcost, producers,  deploySpecial, surrender, ucost };
})();

/* ===== Main simulation tick ===== */
function gameTick(G, dt) {
  G.t += dt; G.tick++;
  G.uhash.clear(); for (const u of G.units) if (!u.dead) G.uhash.add(u);
  Path.process(G);
  const us = G.units.slice(); for (const u of us) if (!u.dead && !u.removed) { if (u.para > 0) { u.para -= dt; u.px = u.x; u.py = u.y; continue; } Units.update(G, u, dt); }
  Units.separate(G);
  const bs = G.blds.slice(); for (const b of bs) if (!b.dead) Build.update(G, b, dt);
  Combat.step(G, dt); Combat.intercept(G, dt); Build.strikes(G);
  for (const p of G.players) { Build.playerUpdate(G, p, dt); if (p.ai && p.alive) p.ai.update(G, dt); }
  for (let i = G.wrecks.length - 1; i >= 0; i--) { const w = G.wrecks[i]; w.t += dt; if (w.t > w.life) G.wrecks.splice(i, 1); }
  for (let i = G.reveals.length - 1; i >= 0; i--) { G.reveals[i].t -= dt; if (G.reveals[i].t <= 0) G.reveals.splice(i, 1); }
  if (G.tick % 6 === 0) G.updateFog();
  if (G.tick % 20 === 0 || G.dirtyVictory) { G.dirtyVictory = false; G.checkVictory(); }
  if (G.modeTick) G.modeTick(G, dt);
}
