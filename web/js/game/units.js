/* ============================================================
   War of Power — سلوك الوحدات: الأوامر، الحركة، الأسلحة، الطائرات، النقل
   الملف: js/game/units.js   ·   ترتيب التحميل: 22 من 43
   ============================================================ */
'use strict';
/* ===== Unit behaviour: orders, movement, weapons, aircraft, transports ===== */
function mcOfDef(d) { if (d.cls === 'inf') return 0; return d.mob === 'wheel' ? 2 : 1; }
const domainOf = d => d.cls === 'air' ? 2 : 0;
const Units = (function () {
  const nb = [], nb2 = [];
  const mcOf = u => mcOfDef(u.def);
  function blockedAt(G, u, x, y) { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); if (!G.map.inb(tx, ty)) return true; return Path.blocked(ty * G.map.w + tx, mcOf(u)); }
  function setGoal(G, u, x, y) {
    const m = G.map; x = clamp(x, 8, m.w * TILE - 8); y = clamp(y, 8, m.h * TILE - 8);
    u.goal = [x, y]; u.path = null; u.pi = 0; u.stuck = 0; u.stuckT = 0; u.lastPos = [u.x, u.y];
    if (u.def.cls === 'air') return; Path.request(u, x, y);
  }
  function stopMove(u) { u.goal = null; u.path = null; u.pathReq = null; }
  // throttled re-approach for interaction orders: avoids repath storms when the exact contact spot is unreachable
  function canSeek(G, u) { return !u.goal && !u.inQ && G.t >= (u.seekT || 0); }
  function seek(G, u, x, y, maxN) { u.seekN = (u.seekN || 0) + 1; if (u.seekN > (maxN || 6)) return false; u.seekT = G.t + Math.min(4, 0.5 + u.seekN * 0.6); setGoal(G, u, x, y); return true; }
  function order(G, u, o) {
    if (u.dead || u.dying || u.inT) return; u.order = o; u.amove = o.t === 'amove'; u.fspd = 0; u.hold = o.t === 'hold'; u.forceGround = null; u.seekN = 0; u.seekT = 0;
    if (o.t !== 'attack') u.tid = 0;
    u.hstate = o.t === 'harvest' ? (u.hstate || 'find') : null;
    if (u.def.fly === 'jet' && u.state === 'park' && o.t !== 'hold' && o.t !== 'stop') u.state = 'takeoff';
    switch (o.t) {
      case 'move': case 'amove': setGoal(G, u, o.x, o.y); u.gx = o.x; u.gy = o.y; break;
      case 'attack': u.tid = o.tid; stopMove(u); u.chaseT = 0; break;
      case 'force': u.forceGround = [o.x, o.y]; stopMove(u); break;
      case 'stop': case 'hold': stopMove(u); u.gx = u.x; u.gy = u.y; u.order = { t: o.t === 'hold' ? 'hold' : 'idle' }; break;
      case 'build': case 'repair': case 'capture': case 'c4': case 'board': stopMove(u); u.workT = 0; break;
      case 'unload': if (o.x !== undefined) { setGoal(G, u, o.x, o.y); u.gx = o.x; u.gy = o.y; } else stopMove(u); u.ulT = 0; break;
      case 'idle': stopMove(u); u.gx = u.x; u.gy = u.y; break;
    }
  }
  // formation group orders (land, sea and air groups get their own slot grids)
  function issue(G, list, o) {
    list = list.filter(u => !u.dead && !u.dying && !u.inT); if (!list.length) return;
    if ((o.t === 'move' || o.t === 'amove') && list.length > 1) {
      const slots = (arr, x, y) => {
        arr.sort((a, b) => b.def.r - a.def.r || a.id - b.id); const sp = Math.max(...arr.map(u => u.def.r)) * 2.3 + 6; const n = arr.length; const cols = Math.ceil(Math.sqrt(n * 1.4));
        const cx = arr.reduce((s, u) => s + u.x, 0) / n, cy = arr.reduce((s, u) => s + u.y, 0) / n; const fa = Math.atan2(y - cy, x - cx); const ca = Math.cos(fa), sa = Math.sin(fa);
        const pts = []; for (let i = 0; i < n; i++) { const r = Math.floor(i / cols), c = i % cols; const lx = -r * sp, ly = (c - (Math.min(cols, n - r * cols) - 1) / 2) * sp; pts.push([x + lx * ca - ly * sa, y + lx * sa + ly * ca]); }
        const mc = mcOf(arr[0]);
        if (arr[0].def.cls !== 'air') for (const p of pts) { const tx = Math.floor(p[0] / TILE), ty = Math.floor(p[1] / TILE); if (G.map.inb(tx, ty) && Path.blocked(ty * G.map.w + tx, mc)) { const f = Path.nearestFree(tx, ty, mc, 6); if (f) { p[0] = (f[0] + 0.5) * TILE; p[1] = (f[1] + 0.5) * TILE; } } }
        const used = new Array(n).fill(false);
        for (const u of arr) { let bi = 0, bd = 1e12; for (let i = 0; i < n; i++) { if (used[i]) continue; const d = dist2(u.x, u.y, pts[i][0], pts[i][1]); if (d < bd) { bd = d; bi = i; } } used[bi] = true; order(G, u, { t: o.t, x: pts[bi][0], y: pts[bi][1] }); }
      };
      const land = list.filter(u => domainOf(u.def) === 0), air = list.filter(u => domainOf(u.def) === 2);
      if (o.t === 'amove' && land.length >= 3) tactical(G, land, o.x, o.y); else if (land.length) slots(land, o.x, o.y);
      if (air.length) slots(air, o.x, o.y);
      return;
    }
    for (const u of list) order(G, u, Object.assign({}, o));
  }
  /* tactical formation for an attack order: armour in the front line, infantry behind it, air defence and support in
     the middle, artillery at the rear; every line is spread across the advance and the group marches at the pace of its
     slowest unit (u.fspd) until it makes contact, then each unit fights at full speed */
  function tactical(G, list, x, y) {
    const n = list.length; const cx = list.reduce((s, u) => s + u.x, 0) / n, cy = list.reduce((s, u) => s + u.y, 0) / n;
    const fa = Math.atan2(y - cy, x - cx), ca = Math.cos(fa), sa = Math.sin(fa);
    const rowOf = u => { const d = u.def, r = d.role; if (r === 'arty' || r === 'mlrs' || r === 'tos' || r === 'mortar' || (d.w[0] && WPN[d.w[0]] && WPN[d.w[0]].min)) return 3; if (r === 'aa' || r === 'sam2' || r === 'aainf' || d.healer || d.harvest || d.work) return 2; if (d.cls === 'inf') return 1; return 0; };
    const rows = [[], [], [], []]; for (const u of list) rows[rowOf(u)].push(u);
    const used = rows.filter(r => r.length); const maxR = Math.max.apply(null, list.map(u => u.def.r)); const gapR = maxR * 2.4 + 12;
    const pace = Math.min.apply(null, list.map(u => u.def.speed * speedK(G, u))); const mc = mcOf(list[0]);
    let depth = 0;
    used.forEach(row => {
      const sp = Math.max.apply(null, row.map(u => u.def.r)) * 2.3 + 8; const lat = u => -(u.x - cx) * sa + (u.y - cy) * ca; row.sort((a, b) => lat(a) - lat(b) || a.id - b.id);
      const cols = Math.max(1, Math.min(row.length, Math.ceil(Math.sqrt(n) * 1.6))); const lines = Math.ceil(row.length / cols);
      row.forEach((u, i) => { const li = Math.floor(i / cols), ci = i % cols; const inLine = Math.min(cols, row.length - li * cols); const lx = -(depth + li * sp * 0.9), ly = (ci - (inLine - 1) / 2) * sp;
        let px = x + lx * ca - ly * sa, py = y + lx * sa + ly * ca; const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
        if (G.map.inb(tx, ty) && Path.blocked(ty * G.map.w + tx, mcOf(u))) { const f = Path.nearestFree(tx, ty, mcOf(u), 6); if (f) { px = (f[0] + 0.5) * TILE; py = (f[1] + 0.5) * TILE; } }
        order(G, u, { t: 'amove', x: px, y: py }); u.fspd = pace; });
      depth += (lines - 1) * sp * 0.9 + gapR; // the next row starts behind every line of this one
    });
  }
  /* ---------- weapons ---------- */
  function needsAlign(e, ws) { const w = ws.d; if (w.proj === 'aamis' || w.fx === 'vls' || w.k === 'hmg' && e.k === 'u' && e.def.role === 'mbt') return false; return true; }
  function weapons(G, e, dt, primary, canFire, aimRef) {
    const isB = e.k === 'b'; const low = isB && G.lowPower(e.owner) && (e.def.power || 0) < 0; const WS = isB ? e.wp : e.w;
    for (const ws of WS) { if (ws.cd > 0) ws.cd -= dt; if (ws.bcd > 0) ws.bcd -= dt; }
    if (!canFire || low) return;
    for (const ws of WS) {
      const w = ws.d; if (w.proj === 'kami' || w.proj === 'c4') continue; if (w.ammo && ws.ammo <= 0) continue;
      let t = null;
      if (e.forceGround && w.ground !== 0 && (w.proj === 'arty' || w.proj === 'mlrs')) t = null;
      else if (primary && Combat.eff(w, primary) > 0.08 && !Combat.hidden(G, primary, e.owner)) t = primary;
      else { const s = G.get(ws.tid); if (Combat.alive(s) && Combat.eff(w, s) > 0.08 && !Combat.hidden(G, s, e.owner)) t = s; else ws.tid = 0; }
      if (!t && !primary && !e.forceGround && w.t !== (WS[0] && WS[0].d.t)) { // secondary weapons pick their own targets
        if ((G.tick + e.id + ws.k.length) % 12 === 0) { const s = Combat.acquire(G, e, Combat.rangeOf(G, e.owner, w, e), [ws]); ws.tid = s ? s.id : 0; t = s; }
      }
      const fg = e.forceGround && (w.proj === 'arty' || w.proj === 'mlrs') ? e.forceGround : null;
      if (!t && !fg) continue;
      const tx = t ? t.x : fg[0], ty = t ? t.y : fg[1]; const d = t ? Combat.distTo(e.x, e.y, t) : Math.hypot(tx - e.x, ty - e.y);
      const rng = Combat.rangeOf(G, e.owner, w, e); if (d > rng || (w.min && d < w.min)) continue;
      if (t && Combat.isAir(t) && t.def.stealth && d > rng * 0.6) continue;
      if (aimRef !== undefined && aimRef !== null && needsAlign(e, ws)) { const want = Math.atan2(ty - e.y, tx - e.x); const tol = w.proj === 'shell' && w.t === 'ap' ? 0.07 : w.proj === 'arty' || w.proj === 'mlrs' ? 0.12 : 0.3; if (Math.abs(angDiff(aimRef, want)) > tol) continue; }
      if (ws.burst <= 0) { if (ws.cd > 0) continue; ws.burst = w.burst || w.salvo || 1; ws.bcd = 0; }
      if (ws.bcd > 0) continue;
      Combat.fire(G, e, ws, t, tx, ty);
      if (w.ammo) ws.ammo--;
      ws.burst--; if (ws.burst > 0) ws.bcd = w.bgap || w.sgap || 0.1; else { let rof = w.rof; if (e.k === 'u' && e.rank >= 3) rof *= 0.85; ws.cd = rof; }
      if (w.coax) break;
    }
  }
  function maxRange(G, e) { let r = 0; for (const ws of e.w) if (!(ws.d.ammo && ws.ammo <= 0) && ws.d.proj !== 'kami' && ws.d.proj !== 'wing') r = Math.max(r, Combat.rangeOf(G, e.owner, ws.d, e)); return r; }
  /* ---------- ground & sea unit update ---------- */
  function update(G, u, dt) {
    u.px = u.x; u.py = u.y; u.pa = u.a; u.pta = u.ta; u.pz = u.z;
    if (u.hit > 0) u.hit -= dt; if (u.recoil > 0) u.recoil = Math.max(0, u.recoil - dt * 6); if (u.flash > 0) u.flash -= dt;
    const d = u.def;
    if (u.rank >= 2 && u.hp < u.maxHp && G.t - (u.lastHitT || -9) > 6) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.012 * dt);
    if (u.ab && u.ab.heal && u.ab.t > G.t && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.ab.heal * dt);
    if (d.cls === 'air') return air(G, u, dt);
    const o = u.order;
    // ---- target logic ----
    u.scan -= dt; let primary = null;
    if (o.t === 'attack') { primary = G.get(u.tid); if (!Combat.alive(primary) || (primary.k === 'b' && primary.owner < 0 && !G.enemies(u.owner, primary.owner)) || Combat.hidden(G, primary, u.owner)) { primary = null; order(G, u, { t: 'idle' }); } }
    const guard = !!(d.work || d.harvest); // builders and supply trucks only shoot back from where they stand (even while working)
    const canAuto = d.w.length && o.t !== 'attack' && ((o.t !== 'build' && o.t !== 'harvest' && o.t !== 'repair') || guard) && o.t !== 'capture' && o.t !== 'c4' && o.t !== 'board' && o.t !== 'unload' && !(o.t === 'move' && d.cls === 'inf');
    if (!primary && canAuto) {
      if (u.scan <= 0) { u.scan = 0.4 + rnd() * 0.2; const R = guard || o.t === 'hold' || o.t === 'move' ? maxRange(G, u) : Math.max(maxRange(G, u), d.vision * 0.95); const t = Combat.acquire(G, u, R); u.tid = t ? t.id : 0; if (!t && u.revenge) { const rv = G.get(u.revenge); if (Combat.alive(rv) && Math.hypot(rv.x - u.x, rv.y - u.y) < d.vision * 1.4) u.tid = rv.id; u.revenge = 0; } }
      primary = u.tid ? G.get(u.tid) : null; if (!Combat.alive(primary) || Combat.hidden(G, primary, u.owner) || (guard && Combat.distTo(u.x, u.y, primary) > maxRange(G, u) * 1.05)) { primary = null; u.tid = 0; }
    }
    // ---- movement intent ----
    const rng = maxRange(G, u);
    if (o.t === 'attack' && primary) {
      const dd = Combat.distTo(u.x, u.y, primary); const inR = dd <= rng * 0.92 && !(u.w[0] && u.w[0].d.min && dd < u.w[0].d.min);
      if (inR) stopMove(u); else { u.chaseT -= dt; if (!u.goal || u.chaseT <= 0 || (u.goal && Math.hypot(u.goal[0] - primary.x, u.goal[1] - primary.y) > 60)) { u.chaseT = 1.6; setGoal(G, u, primary.x, primary.y); } }
    } else if (canAuto && primary && !guard && o.t !== 'hold' && o.t !== 'move') {
      const dd = Combat.distTo(u.x, u.y, primary); const leash = o.t === 'amove' ? 1e9 : (d.vision * 1.3);
      if (dd > rng * 0.95 && Math.hypot(primary.x - u.gx, primary.y - u.gy) < leash) { u.chaseT = (u.chaseT || 0) - dt; if (!u.goal || u.chaseT <= 0) { u.chaseT = 1.5; setGoal(G, u, primary.x, primary.y); u.chasing = true; } }
      else if (dd <= rng * 0.95) { if (u.chasing || o.t === 'amove') stopMove(u); u.chasing = false; }
      else { u.tid = 0; primary = null; }
    } else if (o.t === 'idle' && !primary && u.chasing) { u.chasing = false; if (Math.hypot(u.x - u.gx, u.y - u.gy) > 40) setGoal(G, u, u.gx, u.gy); }
    if (o.t === 'amove' && !primary && !u.goal && !u.inQ) { if (Math.hypot(u.x - o.x, u.y - o.y) > 40) setGoal(G, u, o.x, o.y); else order(G, u, { t: 'idle' }); }
    // special orders
    if (o.t === 'build') builderWork(G, u, dt);
    else if (o.t === 'harvest') harvest(G, u, dt);
    else if (o.t === 'capture') capture(G, u, dt);
    else if (o.t === 'c4') plantC4(G, u, dt);
    else if (o.t === 'repair') repairWork(G, u, dt);
    else if (o.t === 'board') boardWork(G, u, dt);
    else if (o.t === 'unload') unloadWork(G, u, dt);
    if (d.healer) medic(G, u, dt);
    // ---- aim & fire ----
    const va = VART[u.type]; const hasTur = d.cls === 'veh' && va && va.tur && d.tur;
    let aimT = primary || (u.forceGround ? { x: u.forceGround[0], y: u.forceGround[1] } : null);
    if (!aimT) for (const ws of u.w) { const s = G.get(ws.tid); if (Combat.alive(s)) { aimT = s; break; } }
    const stationaryOnly = d.role === 'arty' || d.role === 'mlrs' || d.role === 'mortar';
    if (hasTur) {
      const want = aimT ? Math.atan2(aimT.y - u.y, aimT.x - u.x) : u.a; const tdif = Math.abs(angNorm(want - u.ta)); u.ta = angTo(u.ta, want, (d.tturn || 2) * dt);
      if (tdif > 0.6 && d.cls === 'veh' && G.t - (u._srvT || -9) > 3 && G.visibleTo(G.local, u.x, u.y)) { u._srvT = G.t; SND.at('servo', u.x, u.y, 0.8); } // turret traverse motor
      weapons(G, u, dt, primary, !stationaryOnly || u.spd < 4, u.ta);
    } else if (d.cls === 'inf') {
      const moving = !!u.goal && !!u.path; if (aimT && !moving) u.a = angTo(u.a, Math.atan2(aimT.y - u.y, aimT.x - u.x), 8 * dt);
      weapons(G, u, dt, primary, !moving, aimT && !moving ? u.a : null);
      if (!moving) u.ta = u.a;
    } else { weapons(G, u, dt, primary, !stationaryOnly || u.spd < 4, null); u.ta = u.a; }
    // horde (China): nearby friends
    if ((G.tick + u.id) % 30 === 0 && FACTIONS[G.players[u.owner].f].mod.horde) { let n = 0; for (const v of G.uhash.query(u.x, u.y, 120, nb)) if (v.owner === u.owner && v !== u && !v.dead) n++; u.horde = n >= 4; }
    move(G, u, dt);
  }
  function speedK(G, u) {
    const d = u.def, pm = G.pm(u.owner); let k = 1;
    if (d.cls === 'veh') k *= pm.vehSpd; if (d.cls !== 'air') k *= pm.gndSpd; if (d.cls === 'air') k *= pm.airSpd;
    if (u.ab && u.ab.t > G.t) k *= u.ab.spd; return k;
  }
  function terrainK(G, u) {
    const m = G.map; const tx = Math.floor(u.x / TILE), ty = Math.floor(u.y / TILE); if (!m.inb(tx, ty)) return 1; const p = m.pass[ty * m.w + tx]; let k = 1;
    if (p & PASS.FOREST) k = u.def.cls === 'inf' ? 0.85 : u.def.mob === 'wheel' ? 0.55 : 0.85; if ((p & PASS.ROAD) && u.def.mob === 'wheel') k = 1.25; return k;
  }
  // local avoidance: steer around a slower unit directly ahead instead of shoving through it
  function avoid(G, u, ang) {
    const d = u.def; const dom = domainOf(d); const ca = Math.cos(ang), sa = Math.sin(ang); const look = d.r * 2 + 14 + u.spd * 0.35; let best = 0, bestD = 1e9;
    G.uhash.query(u.x + ca * look * 0.5, u.y + sa * look * 0.5, look, nb2);
    for (const v of nb2) {
      if (v === u || v.dead || v.inT || domainOf(v.def) !== dom) continue; const dx = v.x - u.x, dy = v.y - u.y; const fwd = dx * ca + dy * sa; if (fwd <= 0 || fwd > look) continue;
      const lat = -dx * sa + dy * ca; const rr = (d.r + v.def.r) * (d.cls === 'inf' && v.def.cls === 'inf' ? 0.8 : 0.95); if (Math.abs(lat) > rr) continue;
      const vs = v.spd || 0; if (vs > u.spd * 0.85 && Math.abs(angDiff(v.a, ang)) < 0.6) continue; // same direction and not slower: just follow
      if (d.cls === 'veh' && v.def.cls === 'inf') continue; // vehicles push infantry aside (separation handles it)
      if (fwd < bestD) { bestD = fwd; best = (lat > 0 ? -1 : 1) * (1 - fwd / look) * (rr - Math.abs(lat) + 4) / rr; if (lat === 0) best = (u.id & 1) ? 1 : -1; }
    }
    return best ? ang + clamp(best, -1, 1) * 0.9 : ang;
  }
  function move(G, u, dt) {
    const d = u.def; let want = false, tx = 0, ty = 0, last = false;
    if (u.path && u.pi < u.path.length) {
      tx = u.path[u.pi][0]; ty = u.path[u.pi][1]; last = u.pi === u.path.length - 1; const dd = Math.hypot(tx - u.x, ty - u.y);
      const acc = last ? 5 : 16;
      if (dd < acc) { u.pi++; if (u.pi >= u.path.length) { u.path = null; u.goal = null; if (u.order.t === 'move') order(G, u, { t: 'idle' }); } else { tx = u.path[u.pi][0]; ty = u.path[u.pi][1]; last = u.pi === u.path.length - 1; } }
      want = !!u.path;
    } else if (u.goal && !u.inQ && u.pathFail) { // no path: give up gently
      u.goal = null; u.pathFail = false; if (u.order.t === 'move' || u.order.t === 'amove') order(G, u, { t: 'idle' });
    }
    let maxS = d.speed * terrainK(G, u) * speedK(G, u);
    if (u.fspd && !u.tid) maxS = Math.min(maxS, u.fspd); // marching in formation: keep the pace of the slowest unit until contact
    if (u.work && u.workSlow) maxS *= 0.5;
    if (want) {
      let ang = Math.atan2(ty - u.y, tx - u.x); const remain = Math.hypot(tx - u.x, ty - u.y);
      if (!(last && remain < 30)) ang = avoid(G, u, ang);
      if (d.cls === 'inf') { u.a = angTo(u.a, ang, 9 * dt); u.spd = maxS; }
      else {
        const diff = Math.abs(angDiff(u.a, ang)); u.a = angTo(u.a, ang, (d.turn || 2) * dt);
        let k = diff > 1.2 ? (d.mob === 'wheel' ? 0.3 : 0.05) : diff > 0.45 ? 0.55 : 1; if (last && remain < 40) k *= clamp(remain / 40, 0.35, 1);
        const tgt = maxS * k; u.spd = u.spd < tgt ? Math.min(tgt, u.spd + maxS * 1.3 * dt) : Math.max(tgt, u.spd - maxS * 2.6 * dt);
      }
    } else { u.spd = Math.max(0, u.spd - Math.max(40, d.speed * 3) * dt); }
    u.vx = Math.cos(u.a) * u.spd; u.vy = Math.sin(u.a) * u.spd;
    if (u.spd > 0.1) {
      let nx = u.x + u.vx * dt, ny = u.y + u.vy * dt;
      if (blockedAt(G, u, nx, ny)) { if (!blockedAt(G, u, nx, u.y)) ny = u.y; else if (!blockedAt(G, u, u.x, ny)) nx = u.x; else { nx = u.x; ny = u.y; u.spd *= 0.5; } }
      u.x = nx; u.y = ny;
      // crush trees
      if (d.mob === 'track' || (d.cls === 'veh' && d.hp > 900)) { const m = G.map; const ttx = Math.floor(u.x / TILE), tty = Math.floor(u.y / TILE); if (m.inb(ttx, tty)) { const ti = m.treeAt[tty * m.w + ttx]; if (ti >= 0) { const tr = m.trees[ti]; if (Math.hypot(tr.x - u.x, tr.y - u.y) < d.r + 6) { m.removeTree(ti); FX.treeDown(tr, u.a, false); SND.at('crush', tr.x, tr.y); } } } }
      if (d.cls === 'veh') { u.fx -= dt * u.spd; if (u.fx <= 0) { u.fx = 9; if (d.hover || d.legs) FX.hoverWash(u); else FX.tracks(u); } if (d.legs) u.anim = (u.anim || 0) + dt * u.spd * (d.legs > 2 ? 0.11 : 0.07); }
      else if (d.cls === 'inf') u.anim += dt * u.spd * 0.22;
    }
    // stuck detection
    if (want) { u.stuckT += dt; if (u.stuckT > 1.2) { const mv = Math.hypot(u.x - u.lastPos[0], u.y - u.lastPos[1]); u.lastPos = [u.x, u.y]; u.stuckT = 0; if (mv < 8) { u.stuck++; if (u.stuck === 2 || u.stuck === 4) { if (u.goal) Path.request(u, u.goal[0], u.goal[1]); } else if (u.stuck >= 6) { stopMove(u); if (u.order.t === 'move') order(G, u, { t: 'idle' }); } } else u.stuck = 0; } }
  }
  // hard separation: overlapping units of the same domain are pushed fully apart, heavier ones move less
  function separate(G) {
    for (let it = 0; it < 2; it++) for (const u of G.units) {
      if (u.dead || u.def.cls === 'air') continue; const r1 = u.def.r; const dom = domainOf(u.def);
      G.uhash.query(u.x, u.y, r1 + 24, nb);
      for (const v of nb) {
        if (v === u || v.dead || v.inT || v.def.cls === 'air' || v.id < u.id || domainOf(v.def) !== dom) continue;
        const infPair = u.def.cls === 'inf' && v.def.cls === 'inf'; const r = (r1 + v.def.r) * (infPair ? 0.8 : u.def.cls === 'inf' || v.def.cls === 'inf' ? 0.85 : 0.9);
        let dx = v.x - u.x, dy = v.y - u.y; let dd = dx * dx + dy * dy; if (dd >= r * r) continue;
        if (dd < 1e-6) { const a = ((u.id * 7919 + v.id * 104729) % 6283) / 1000; dx = Math.cos(a) * 0.01; dy = Math.sin(a) * 0.01; dd = 1e-4; }
        const dl = Math.sqrt(dd), push = (r - dl) * (it ? 0.5 : 0.55); const nx = dx / dl, ny = dy / dl;
        const mass = e => (e.def.cls === 'inf' ? 1 : e.def.r * e.def.r / 25) * (e.spd > 2 ? 0.8 : e.order && e.order.t === 'hold' ? 4 : 1.6) * (e.work ? 3 : 1);
        const mu = mass(u), mv = mass(v); const ku = mv / (mu + mv), kv = mu / (mu + mv);
        const ux = u.x - nx * push * ku * 2, uy = u.y - ny * push * ku * 2; if (!blockedAt(G, u, ux, uy)) { u.x = ux; u.y = uy; } else if (!blockedAt(G, u, ux, u.y)) u.x = ux; else if (!blockedAt(G, u, u.x, uy)) u.y = uy;
        const vx = v.x + nx * push * kv * 2, vy = v.y + ny * push * kv * 2; if (!blockedAt(G, v, vx, vy)) { v.x = vx; v.y = vy; } else if (!blockedAt(G, v, vx, v.y)) v.x = vx; else if (!blockedAt(G, v, v.x, vy)) v.y = vy;
      }
      // escape blocked tiles (e.g. building placed on top)
      if (it === 1 && blockedAt(G, u, u.x, u.y)) { const f = Path.nearestFree(Math.floor(u.x / TILE), Math.floor(u.y / TILE), mcOf(u), 8); if (f) { u.x = lerp(u.x, (f[0] + 0.5) * TILE, 0.25); u.y = lerp(u.y, (f[1] + 0.5) * TILE, 0.25); } }
    }
  }
  /* ---------- builders ---------- */
  function approach(G, u, b, gap) {
    const hw = b.w * TILE / 2, hh = b.h * TILE / 2; let x = clamp(u.x, b.x - hw + 4, b.x + hw - 4), y = clamp(u.y, b.y - hh + 4, b.y + hh - 4);
    const dx = u.x - b.x, dy = u.y - b.y;
    if (Math.abs(dx) / hw > Math.abs(dy) / hh) x = b.x + Math.sign(dx || 1) * (hw + gap); else y = b.y + Math.sign(dy || 1) * (hh + gap);
    // if blocked, rotate around the building to find a free spot
    const free = (px, py) => { const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE); return G.map.inb(tx, ty) && !Path.blocked(ty * G.map.w + tx, mcOf(u)); };
    if (!free(x, y)) { for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; const px = b.x + Math.cos(a) * (hw + gap), py = b.y + Math.sin(a) * (hh + gap); if (free(px, py)) return [px, py]; } }
    return [x, y];
  }
  function machineRate(G, u, b, stage) {
    const d = u.def; let e = (d.work && d.work[stage]) || 0;
    return e;
  }
  function builderWork(G, u, dt) {
    const b = G.get(u.order.bid); u.work = 0;
    if (!b || b.dead || b.removed || (b.built >= 1 && b.hp >= b.maxHp)) { u.order = { t: 'idle' }; u.gx = u.x; u.gy = u.y; Build.autoAssign(G, u); return; }
    const dd = Combat.distTo(u.x, u.y, b); const gap = 10 + u.def.r;
    if (dd > gap + 12) { if (canSeek(G, u)) { const [x, y] = approach(G, u, b, gap); if (!seek(G, u, x, y, 10)) { u.order = { t: 'idle' }; u.gx = u.x; u.gy = u.y; } } return; }
    stopMove(u); u.work = 1; u.ta = Math.atan2(b.y - u.y, b.x - u.x); u.a = angTo(u.a, u.ta, 1.5 * dt);
    if (b.built >= 1) { // repair
      const rate = 26; if (b.hp < b.maxHp) { b.hp = Math.min(b.maxHp, b.hp + rate * dt); u.workFx = (u.workFx || 0) - dt; if (u.workFx <= 0) { u.workFx = 0.5; FX.weld(b, u); } } return;
    }
    const stage = b.stages[b.stage]; let e = machineRate(G, u, b, stage); u.work = e > 0 ? 2 : 1;
    if (e > 0) {
      let aura = 1; for (const v of G.uhash.query(b.x, b.y, Math.max(b.w, b.h) * TILE, nb)) if (v.def.aura && v.order.t === 'build' && v.order.bid === b.id && v !== u && v.work) { aura = 1 + v.def.aura; break; }
      const pl = G.players[u.owner]; const k = (G.mode === 'tut' ? 3 : 1) * aura * (FACTIONS[pl.f].mod.build || 1) * (u.ab && u.ab.t > G.t && u.ab.bld ? u.ab.bld : 1); // AI builds at exactly the player's speed; engineer generals speed machines up
      b.prog[stage] = (b.prog[stage] || 0) + e * k * dt; let done = 0; for (const s of b.stages) done += Math.min(b.prog[s] || 0, b.works[s]);
      b.built = Math.min(0.999, done / b.total); b.hp = Math.min(b.maxHp, Math.max(b.hp, b.maxHp * (0.08 + 0.92 * b.built)));
      if ((b.prog[stage] || 0) >= b.works[stage]) { b.stage++; FX.stage && FX.stage(b); if (b.stage >= b.stages.length) G.onBuilt(b); }
      u.workFx = (u.workFx || 0) - dt; if (u.workFx <= 0) { u.workFx = 0.35 + rnd() * 0.3; FX.work(b, u, stage); }
    }
  }
  function repairWork(G, u, dt) {
    const t = G.get(u.order.tid); if (!Combat.alive(t) || t.hp >= t.maxHp || !G.allies(u.owner, t.owner)) { order(G, u, { t: 'idle' }); return; }
    const dd = Combat.distTo(u.x, u.y, t); if (dd > 30) { if (canSeek(G, u) && !seek(G, u, t.x, t.y, 10)) order(G, u, { t: 'idle' }); return; }
    stopMove(u); u.work = 1; t.hp = Math.min(t.maxHp, t.hp + (u.def.repair || 20) * dt); u.workFx = (u.workFx || 0) - dt; if (u.workFx <= 0) { u.workFx = 0.4; FX.weld(t, u); }
  }
  /* ---------- medics ---------- */
  function medic(G, u, dt) {
    const d = u.def; u.work = 0;
    if ((G.tick + u.id) % 15 === 0) { let n = 0; for (const v of G.uhash.query(u.x, u.y, 80, nb)) { if (n >= 3) break; if (v === u || v.dead || v.inT || !G.allies(v.owner, u.owner) || v.def.cls !== 'inf' || v.hp >= v.maxHp) continue; v.hp = Math.min(v.maxHp, v.hp + d.healer * 0.5); n++; FX.heal(v); } u.healing = n; }
    if (u.healing) u.work = 1;
    if (u.order.t === 'idle' && !u.goal && !u.inQ && (G.tick + u.id) % 60 === 0) { let best = null, bd = 260 * 260; for (const v of G.uhash.query(u.x, u.y, 260, nb)) { if (v === u || v.dead || v.inT || v.owner !== u.owner || v.def.cls !== 'inf' || v.hp > v.maxHp * 0.8) continue; const dd = dist2(u.x, u.y, v.x, v.y); if (dd < bd && dd > 50 * 50) { bd = dd; best = v; } } if (best) { setGoal(G, u, best.x, best.y); u.gx = best.x; u.gy = best.y; } }
  }
  /* ---------- transports ---------- */
  function cargoSize(u) { return u.def.cls === 'inf' ? 1 : Math.max(2, u.def.pop || 2); }
  function capOf(G, t) { return t.def.cargo || 0; }
  function loadList(G, t) { return t.load || (t.load = []); }
  function loadOf(G, t) { let s = 0; for (const u of loadList(G, t)) s += cargoSize(u); return s; }
  function canBoard(G, u, t) {
    if (!t || t.k !== 'u' || t.dead || t.removed || !Combat.alive(t) || t === u || t.owner !== u.owner || u.def.cls === 'air') return false;
    if (!t.def.cargo) return false; return t.def.carries === 'all' || u.def.cls === 'inf';
  }
  function enter(G, u, t) {
    const cap = capOf(G, t), used = loadOf(G, t), sz = cargoSize(u);
    if (used + sz > cap) { G.notify(u.owner, t.k === 'b' ? 'الأنفاق ممتلئة' : 'الناقلة ممتلئة', 'warn', t.x, t.y); order(G, u, { t: 'idle' }); return false; }
    const i = G.units.indexOf(u); if (i >= 0) G.units.splice(i, 1);
    stopMove(u); u.inT = t.id; u.sel = false; u.tid = 0; u.order = { t: 'idle' }; u.spd = 0; loadList(G, t).push(u);
    if (u.owner === G.local) SND.at('board', t.x, t.y); return true;
  }
  function boardWork(G, u, dt) {
    const t = G.get(u.order.tid); if (!canBoard(G, u, t)) { order(G, u, { t: 'idle' }); return; }
    if (t.k === 'u' && t.def.cls === 'air') t.boardReq = G.t;
    const dd = t.k === 'b' ? Combat.distTo(u.x, u.y, t) : Math.hypot(t.x - u.x, t.y - u.y); const reach = t.k === 'b' ? 14 : t.def.r + u.def.r + 16;
    if (dd <= reach && !(t.k === 'u' && t.def.cls === 'air' && t.z > 14)) { enter(G, u, t); return; }
    if (dd > reach && canSeek(G, u)) { const [x, y] = t.k === 'b' ? approach(G, u, t, 6) : [t.x, t.y]; if (!seek(G, u, x, y, 14)) order(G, u, { t: 'idle' }); }
  }
  // place carried units on free ground around (x, y); returns the units that got out
  function dropCargo(G, list, x, y, owner) {
    const out = []; const keep = [];
    for (const u of list) {
      const mc = mcOf(u); const f = Path.nearestFree(Math.floor(x / TILE), Math.floor(y / TILE), mc, 4); if (!f) { keep.push(u); continue; }
      let px = (f[0] + 0.5) * TILE, py = (f[1] + 0.5) * TILE; const k = out.length; const a = k * 2.39996, rr = 6 + Math.sqrt(k) * 11; const qx = px + Math.cos(a) * rr, qy = py + Math.sin(a) * rr; if (!blockedAt(G, u, qx, qy)) { px = qx; py = qy; }
      u.x = u.px = px; u.y = u.py = py; u.inT = 0; u.order = { t: 'idle' }; u.goal = null; u.path = null; u.gx = px; u.gy = py; u.spd = 0; u.lastPos = [px, py]; G.units.push(u); out.push(u);
    }
    list.length = 0; for (const u of keep) list.push(u);
    if (out.length && owner === G.local) SND.at('unload', x, y);
    return out;
  }
  function unloadNow(G, t, x, y) {
    const list = loadList(G, t); if (!list.length) return 0; const n0 = list.length;
    const out = dropCargo(G, list, x === undefined ? t.x : x, y === undefined ? t.y : y, t.owner);
    if (!out.length) G.notify(t.owner, t.k === 'b' ? 'لا يوجد مكان للخروج' : 'لا يمكن الإنزال هنا — اقترب من الشاطئ', 'warn', t.x, t.y);
    else if (out.length < n0) G.notify(t.owner, 'تم إنزال جزء من الحمولة فقط', 'info', t.x, t.y);
    return out.length;
  }
  function unloadWork(G, u, dt) {
     if (!u.load || !u.load.length) { order(G, u, { t: 'idle' }); return; }
    if (u.goal || u.inQ) return; // still travelling
    u.ulT = (u.ulT || 0) + dt; if (u.ulT < 0.4) return;
    unloadNow(G, u); order(G, u, { t: 'idle' });
  }
  function killCargo(G, t, owner, src) { // transport destroyed: everyone aboard is lost
    const list = t.k === 'b' ? null : t.load; if (!list || !list.length) return;
    for (const u of list.slice()) { u.inT = 0; u.dead = true; G.giveXP(owner, u); if (G.players[owner]) G.players[owner].stats.kills++; if (G.players[u.owner]) G.players[u.owner].stats.lost++; G.removeUnit(u); }
    list.length = 0;
  }
  /* ---------- harvesting ---------- */
  function nearestBld(G, u, pred) { let best = null, bd = 1e18; for (const b of G.blds) { if (b.dead || !pred(b)) continue; const d = dist2(u.x, u.y, b.x, b.y); if (d < bd) { bd = d; best = b; } } return best; }
  function harvest(G, u, dt) {
    const pl = G.players[u.owner];
    switch (u.hstate) {
      case 'find': {
        const center = nearestBld(G, u, b => b.owner === u.owner && b.type === 'supply' && b.built >= 1); if (!center) { u.hwait = (u.hwait || 0) + dt; return; }
        let dep = G.get(u.hdep); if (!dep || dep.res <= 0 || dep.dead) { dep = null; let bd = 1e18; const cp = G.map.compFor(mcOf(u)); const ci = cp ? cp[Math.floor(center.y / TILE + center.h / 2 + 1) * G.map.w + Math.floor(center.x / TILE)] : -1; for (const b of G.blds) { if (b.type !== 'depot' || b.res <= 0) continue; if (cp && ci >= 0) { const bi = cp[Math.floor(b.y / TILE + b.h / 2 + 1) * G.map.w + Math.floor(b.x / TILE)]; if (bi >= 0 && bi !== ci) continue; } const d = dist2(center.x, center.y, b.x, b.y); if (d < bd && d < (2600 * 2600)) { bd = d; dep = b; } } }
        if (!dep) { if (!u.noDepMsg) { u.noDepMsg = 1; G.notify(u.owner, 'نفدت مستودعات الإمداد القريبة', 'warn', u.x, u.y); } return; }
        u.hdep = dep.id; const [x, y] = approach(G, u, dep, 10 + u.def.r); setGoal(G, u, x, y); u.hstate = 'go'; break;
      }
      case 'go': { const dep = G.get(u.hdep); if (!dep || dep.res <= 0) { u.hstate = 'find'; return; } if (Combat.distTo(u.x, u.y, dep) < 22 + u.def.r) { stopMove(u); u.hstate = 'load'; u.ht = 0; u.seekN = 0; } else if (canSeek(G, u)) { const [x, y] = approach(G, u, dep, 10 + u.def.r); seek(G, u, x, y, 1e9); } break; }
      case 'load': { u.ht += dt; u.work = 1; if (u.ht >= 3) { const dep = G.get(u.hdep); const amt = dep ? Math.min(u.def.harvest || 300, dep.res) : 0; if (dep) dep.res -= amt; u.cargo = amt; u.work = 0; u.hstate = 'ret'; const c = nearestBld(G, u, b => b.owner === u.owner && b.type === 'supply' && b.built >= 1); if (c) { u.hcen = c.id; const [x, y] = approach(G, u, c, 10 + u.def.r); setGoal(G, u, x, y); } else u.hstate = 'find'; } break; }
      case 'ret': { const c = G.get(u.hcen); if (!c || c.dead) { u.hstate = 'find'; return; } if (Combat.distTo(u.x, u.y, c) < 22 + u.def.r) { stopMove(u); u.hstate = 'unload'; u.ht = 0; u.seekN = 0; } else if (canSeek(G, u)) { const [x, y] = approach(G, u, c, 10 + u.def.r); seek(G, u, x, y, 1e9); } break; }
      case 'unload': { u.ht += dt; if (u.ht >= 1.4) { const k = (FACTIONS[pl.f].mod.income || 1) * G.pm(u.owner).income * (pl.incK || 1); const v = Math.round(u.cargo * k * (pl.incK || 1)); pl.money += v; pl.stats.earned += v; if (u.owner === G.local) FX.money(u.x, u.y - 10, v); u.cargo = 0; u.hstate = 'find'; } break; }
      default: u.hstate = 'find';
    }
  }
  /* ---------- capture ---------- */
  // special forces: walk up to an enemy building, plant a C4 charge (6 s fuse), then pull back
  function plantC4(G, u, dt) {
    const b = G.get(u.order.tid); if (!Combat.alive(b) || !G.enemies(u.owner, b.owner)) { order(G, u, { t: 'idle' }); return; }
    if ((u.c4cd || 0) > G.t) { order(G, u, { t: 'idle' }); return; }
    const dd = Combat.distTo(u.x, u.y, b); if (dd > 14) { if (canSeek(G, u)) { const [x, y] = approach(G, u, b, 6); if (!seek(G, u, x, y, 7)) order(G, u, { t: 'idle' }); } return; }
    stopMove(u); u.workT = (u.workT || 0) + dt; u.work = 1;
    if (u.workT > 1.8) { Combat.fire(G, u, { d: WPN.c4, k: 'c4' }, b, b.x, b.y); u.c4cd = G.t + 20; G.notify(u.owner, 'تم زرع العبوة: 6 ثوانٍ', 'info', b.x, b.y); const a = Math.atan2(u.y - b.y, u.x - b.x); order(G, u, { t: 'move', x: u.x + Math.cos(a) * 160, y: u.y + Math.sin(a) * 160 }); }
  }
  function capture(G, u, dt) {
    const b = G.get(u.order.tid); if (!b || b.dead || b.owner === u.owner || (b.owner >= 0 && G.allies(u.owner, b.owner))) { order(G, u, { t: 'idle' }); return; }
    const dd = Combat.distTo(u.x, u.y, b); if (dd > 16) { if (canSeek(G, u)) { const [x, y] = approach(G, u, b, 8); if (!seek(G, u, x, y, 7)) order(G, u, { t: 'idle' }); } return; }
    stopMove(u); u.work = 1; const T = (b.type === 'city' ? 10 : 12) / (u.ab && u.ab.cap && u.ab.t > G.t ? u.ab.cap : 1);
    if (b.capBy !== u.owner) { b.capBy = u.owner; b.cap = 0; } b.cap += dt / T;
    if (b.cap >= 1) { const prev = b.owner; b.owner = u.owner; b.cap = 0; b.capBy = -1; b.inc = 0; G.notify(u.owner, 'تم الاستيلاء على ' + G.bname(b), 'good', b.x, b.y); if (prev >= 0) { G.notify(prev, 'خسرنا السيطرة على ' + G.bname(b), 'bad', b.x, b.y); G.recalcPower(G.players[prev]); } G.recalcPower(G.players[u.owner]); if (u.owner === G.local) SND.ui('capture'); G.onCapture && G.onCapture(b, u.owner); order(G, u, { t: 'idle' }); }
  }
  /* ---------- aircraft ---------- */
  function homeAirfield(G, u) { let best = null, bd = 1e18; for (const b of G.blds) { if (b.type !== 'airfield' || b.owner !== u.owner || b.built < 1 || b.dead) continue; const d = dist2(u.x, u.y, b.x, b.y); if (d < bd) { bd = d; best = b; } } return best; }
  function padPos(b, i) { return [b.x - 66 + i * 34, b.y - 37]; }
  function claimPad(G, u, b) { if (!b.pads) b.pads = [0, 0, 0, 0]; for (let i = 0; i < 4; i++) { const o = G.get(b.pads[i]); if (!o || o.dead || o.padB !== b.id) b.pads[i] = 0; } let i = b.pads.indexOf(u.id); if (i < 0) i = b.pads.indexOf(0); if (i < 0) return -1; b.pads[i] = u.id; u.padB = b.id; u.padI = i; return i; }
  function air(G, u, dt) {
    const d = u.def;
    if (u.dying) { u.fallT += dt; u.z = Math.max(0, u.z - (d.fly === 'jet' ? 160 : 55) * dt - u.fallT * 30 * dt); u.a += (d.fly === 'heli' ? 7 : 0.6) * dt; if (d.fly !== 'heli') { u.x += Math.cos(u.a) * d.speed * 0.6 * dt; u.y += Math.sin(u.a) * d.speed * 0.6 * dt; } if ((u.fx -= dt) <= 0) { u.fx = 0.05; FX.trail(u.x, u.y, u.z, 'burn'); } if (u.z <= 0) { u.dying = false; u.dead = false; Combat.kill(G, u, u.killer, null); } return; }
    const o = u.order; let primary = null;
    if (o.t === 'attack') { primary = G.get(u.tid); if (!Combat.alive(primary) || Combat.hidden(G, primary, u.owner)) { primary = null; order(G, u, { t: 'idle' }); if (d.fly === 'jet') { u.state = 'rtb'; } } }
    const armed = u.w.some(ws => !ws.d.ammo || ws.ammo > 0);
    if (!primary && o.t !== 'move' && o.t !== 'unload' && armed && u.state !== 'park' && u.state !== 'rtb') { u.scan -= dt; if (u.scan <= 0) { u.scan = 0.45; const t = Combat.acquire(G, u, Math.max(maxRange(G, u), d.vision)); u.tid = t ? t.id : 0; } primary = u.tid ? G.get(u.tid) : null; if (!Combat.alive(primary)) { primary = null; u.tid = 0; } }
    if (d.fly === 'jet') return jet(G, u, dt, primary);
    // heli / drone
    const landing = d.cargo && ((u.boardReq || -9) > G.t - 0.6 && !u.goal || o.t === 'unload' && !u.goal);
    const wantZ = landing ? 0 : d.alt; u.z += clamp(wantZ - u.z, -50 * dt, 50 * dt);
    if (o.t === 'unload' && !u.goal && u.z < 4) { if (u.load && u.load.length) unloadNow(G, u); order(G, u, { t: 'idle' }); }
    let gx = u.goal ? u.goal[0] : u.x, gy = u.goal ? u.goal[1] : u.y; let hover = !u.goal;
    if (primary && o.t !== 'unload') {
      const rng = maxRange(G, u); const dd = Math.hypot(primary.x - u.x, primary.y - u.y);
      if (d.kami) { gx = primary.x; gy = primary.y; hover = false; if (dd < 26 && u.z < 40) { const kw = u.w[0] ? u.w[0].d : WPN.lancet; Combat.splash(G, primary.x, primary.y, kw.splash || 20, kw.dmg * 0.3, 'heat', u.owner, u); Combat.damage(G, primary, kw.dmg, 'heat', u.owner, u); FX.explode(u.x, u.y, 0, { dmg: kw.dmg * 0.65, dt: 'heat', w: kw, splash: kw.splash || 20 }, true); u.dead = true; G.removeUnit(u); return; } }
      else if (dd > rng * 0.85) { gx = primary.x; gy = primary.y; hover = false; } else { hover = true; gx = u.x; gy = u.y; }
    } else if (d.fly === 'drone' && !u.goal) { u.circ += dt * 0.5; gx = u.gx + Math.cos(u.circ) * 70; gy = u.gy + Math.sin(u.circ) * 70; hover = false; }
    const dx = gx - u.x, dy = gy - u.y, dd = Math.hypot(dx, dy);
    const spd = d.speed * speedK(G, u);
    let ds = hover ? 0 : Math.min(spd, dd * 1.4); if (d.kami && primary) { ds = spd; u.z = Math.max(18, u.z - 30 * dt * (dd < 120 ? 3 : 0)); }
    const tvx = dd > 0.1 ? dx / dd * ds : 0, tvy = dd > 0.1 ? dy / dd * ds : 0; const acc = Math.min(1, dt * 2.2);
    u.vx += (tvx - u.vx) * acc; u.vy += (tvy - u.vy) * acc; u.x += u.vx * dt; u.y += u.vy * dt; u.spd = Math.hypot(u.vx, u.vy);
    if (u.goal && dd < 12 && (o.t === 'move' || o.t === 'unload')) { u.goal = null; if (o.t === 'move') { order(G, u, { t: 'idle' }); } u.gx = u.x; u.gy = u.y; }
    const face = primary ? Math.atan2(primary.y - u.y, primary.x - u.x) : u.spd > 15 ? Math.atan2(u.vy, u.vx) : u.a; u.a = angTo(u.a, face, (d.turn || 2) * dt); u.ta = u.a;
    // separation among aircraft
    for (const v of G.uhash.query(u.x, u.y, 40, nb)) { if (v === u || v.def.cls !== 'air' || v.dead) continue; const ex = u.x - v.x, ey = u.y - v.y, e2 = ex * ex + ey * ey; if (e2 < 900 && e2 > 0.01) { const e = Math.sqrt(e2); u.x += ex / e * (30 - e) * 0.05; u.y += ey / e * (30 - e) * 0.05; } }
    if (!d.kami) weapons(G, u, dt, primary, u.z > d.alt * 0.6, u.a);
    const m = G.map; u.x = clamp(u.x, 10, m.w * TILE - 10); u.y = clamp(u.y, 10, m.h * TILE - 10);
  }
  function jet(G, u, dt, primary) {
    const d = u.def; const o = u.order;
    if (!u.state) u.state = 'fly';
    if (d.selfReload && u.state !== 'park') { u.srl = (u.srl || 0) + dt; if (u.srl >= d.selfReload) { u.srl = 0; for (const ws of u.w) if (ws.d.ammo && ws.ammo < ws.d.ammo) { ws.ammo++; break; } } } // Su-57M: rearms slowly in the air
    if (u.state === 'park') { u.spd = 0; u.z = 0; const b = G.get(u.padB); if (!b || b.dead) { u.state = 'takeoff'; return; } const [px, py] = padPos(b, u.padI); u.x = px; u.y = py; u.a = -PI / 2 + 0.0; u.reload = (u.reload || 0) + dt; if (u.reload > 5) { for (const ws of u.w) if (ws.d.ammo) ws.ammo = ws.d.ammo + (G.pm(u.owner).jetAmmo || 0); } return; }
    if (u.state === 'takeoff') { u.z = Math.min(d.alt, u.z + 70 * dt); u.spd = Math.min(d.speed, u.spd + d.speed * 0.6 * dt); u.x += Math.cos(u.a) * u.spd * dt; u.y += Math.sin(u.a) * u.spd * dt; if (u.z >= d.alt * 0.7) u.state = 'fly'; return; }
    u.z += clamp(d.alt - u.z, -60 * dt, 60 * dt);
    const groundAmmo = u.w.some(ws => ws.d.ground !== 0 && ws.d.ammo && ws.ammo > 0);
    let aimX, aimY; let attacking = false;
    if (u.state === 'rtb' || (!groundAmmo && (o.t === 'attack' || (primary && !Combat.isAir(primary))))) {
      const b = homeAirfield(G, u);
      if (b) { const pi = claimPad(G, u, b); if (pi >= 0) { const [px, py] = padPos(b, pi); aimX = px; aimY = py; const dd = Math.hypot(px - u.x, py - u.y); u.state = 'rtb'; if (dd < 50) { u.state = 'park'; u.reload = 0; u.x = px; u.y = py; u.z = 0; order(G, u, { t: 'idle' }); u.state = 'park'; return; } } else { aimX = b.x; aimY = b.y; } }
      else { aimX = u.gx; aimY = u.gy; u.state = 'fly'; }
      primary = null;
    } else if (primary) { aimX = primary.x; aimY = primary.y; attacking = true; }
    else if (u.goal) { aimX = u.goal[0]; aimY = u.goal[1]; if (Math.hypot(aimX - u.x, aimY - u.y) < 90) { u.gx = aimX; u.gy = aimY; u.goal = null; if (o.t === 'move') { u.order = { t: 'idle' }; } } }
    else { u.circ += dt * 0.9; aimX = u.gx + Math.cos(u.circ) * 160; aimY = u.gy + Math.sin(u.circ) * 160; u.idleT = (u.idleT || 0) + dt; if (u.idleT > 25) { u.idleT = 0; u.state = 'rtb'; } }
    if (u.passT > 0) { u.passT -= dt; aimX = u.x + Math.cos(u.a) * 400; aimY = u.y + Math.sin(u.a) * 400; }
    const want = Math.atan2(aimY - u.y, aimX - u.x); const diff = angDiff(u.a, want); u.a = angTo(u.a, want, d.turn * dt); u.bank = clamp(diff * 1.2, -0.6, 0.6);
    u.spd = d.speed * speedK(G, u) * (Math.abs(diff) > 1 ? 0.8 : 1); u.vx = Math.cos(u.a) * u.spd; u.vy = Math.sin(u.a) * u.spd; u.x += u.vx * dt; u.y += u.vy * dt; u.ta = u.a;
    if ((u.fx -= dt) <= 0) { u.fx = 0.06; FX.trail(u.x - Math.cos(u.a) * 18, u.y - Math.sin(u.a) * 18, u.z, 'jet'); }
    // weapons
    if (attacking && primary && !u.passT) {
      const dd = Math.hypot(primary.x - u.x, primary.y - u.y); const ad = Math.abs(diff);
      for (const ws of u.w) {
        if (ws.d.ammo && ws.ammo <= 0) continue; if (!Combat.canHit(ws.d, primary)) continue; if (ws.cd > 0) continue;
        const w = ws.d; const ok = w.proj === 'bomb' ? (dd < 130 && ad < 0.3) : (dd < Combat.rangeOf(G, u.owner, w, u) && ad < 0.45);
        if (ok) { const n = w.proj === 'bomb' ? Math.min(ws.ammo, w.ammo >= 3 ? 2 : 1) : 1; for (let k = 0; k < n; k++) { Combat.fire(G, u, ws, primary, primary.x + (k ? Math.cos(u.a) * 30 : 0), primary.y + (k ? Math.sin(u.a) * 30 : 0)); ws.ammo--; } ws.cd = w.rof; u.passT = 1.3; break; }
      }
    }
    for (const ws of u.w) if (ws.cd > 0) ws.cd -= dt;
    const m = G.map; if (u.x < 0 || u.y < 0 || u.x > m.w * TILE || u.y > m.h * TILE) { u.a = angTo(u.a, Math.atan2(m.h * TILE / 2 - u.y, m.w * TILE / 2 - u.x), 2 * dt); }
  }
  return { update, order, issue, separate,    weapons, claimPad, padPos,   machineRate, canBoard, enter,   killCargo, loadOf, capOf,  cargoSize };
})();
