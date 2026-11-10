/* ============================================================
   War of Power — القتال: الاستهداف، الإطلاق، المقذوفات، الضرر
   الملف: js/game/combat.js   ·   ترتيب التحميل: 23 من 43
   ============================================================ */
'use strict';
/* ===== Combat: targeting, firing, projectiles, damage ===== */
const Combat = (function () {
  const tmp = [], tmp2 = [];
  function isAir(t) { return t.k === 'u' && t.def.cls === 'air' && t.z > 12; }
  function armorOf(t) { return t.k === 'b' ? (t.def.w_ ? ARM.DEF : ARM.BLD) : t.def.armor; }
  function canHit(w, t) { if (isAir(t)) return !!w.air; return w.ground !== 0; }
  function eff(w, t) { if (!canHit(w, t)) return 0; return (DMG[w.t] || DMG.he)[armorOf(t)] || 0; }
  function rangeOf(G, owner, w, e) {
    let r = w.range; const pm = G.pm(owner);
    if (w.proj === 'missile') r *= pm.msRange; if (w.t === 'aa' || w.t === 'aagun') r *= pm.aaRange; if (w.proj === 'arty' || w.proj === 'mlrs') r *= pm.artyRange;
    if (e && e.k === 'u') { const c = e.def.cls; if (c !== 'air' && w.proj !== 'arty' && w.proj !== 'mlrs') r *= pm.range; if (e.ab && e.ab.t > G.t) r *= e.ab.rng; }
    return r;
  }
  // units riding inside a transport are hidden
  function hidden(G, t, viewer) { if (!t || t.k !== 'u') return false; if (t.inT) return true; if (viewer < 0) return false; return !G.players[viewer]; }
  // distance from point to target edge
  function distTo(x, y, t) {
    if (t.k === 'b') { const hw = t.w * TILE / 2, hh = t.h * TILE / 2; const dx = Math.max(Math.abs(x - t.x) - hw, 0), dy = Math.max(Math.abs(y - t.y) - hh, 0); return Math.hypot(dx, dy); }
    return Math.max(0, Math.hypot(t.x - x, t.y - y) - (t.def.r || 8) * 0.6);
  }
  function alive(t) { return t && !t.dead && !t.removed && !(t.k === 'u' && (t.dying || t.inT)); }
  // choose best target for an entity (unit/defense building); `only` limits the weapons considered
  function acquire(G, e, R, only) {
    let best = null, bs = 0; const ws = only || (e.k === 'b' ? e.wp : e.w); if (!ws || !ws.length) return null;
    
    G.uhash.query(e.x, e.y, R + 40, tmp);
    for (const t of tmp) {
      if (!alive(t) || !G.enemies(e.owner, t.owner)) continue;
      const d = distTo(e.x, e.y, t); if (d > R) continue;
      let m = 0; for (const w of ws) { if (w.ammo === 0 && w.d.ammo) continue; const ef = eff(w.d, t); if (ef > m) m = ef; }
      if (m < 0.08) continue;
      if (isAir(t) && t.def.stealth) { let ok = false; for (const w of ws) if (w.d.air && d < rangeOf(G, e.owner, w.d, e) * 0.6) ok = true; if (!ok) continue; }
      let s = m * (1.15 - d / R * 0.5);
      if (t.def.w && t.def.w.length) s *= 1.25; if (t.def.harvest || t.def.work) s *= 0.9; if (t.def.cargo && t.load && t.load.length) s *= 1.3;
      if (t.id === e.tid) s *= 1.3;
      if (s > bs) { bs = s; best = t; }
    }
    if (!best || bs < 0.35) { // buildings
      G.bhash.query(e.x, e.y, R + 120, tmp2);
      for (const b of tmp2) {
        if (!alive(b) || b.owner < 0 || !G.enemies(e.owner, b.owner) || b.type === 'depot') continue;
        const d = distTo(e.x, e.y, b); if (d > R) continue; let m = 0; for (const w of ws) { const ef = eff(w.d, b); if (ef > m) m = ef; }
        if (m < 0.08) continue; let s = m * (1.1 - d / R * 0.5) * (b.def.w_ ? 1.1 : 0.55); if (b.id === e.tid) s *= 1.3; if (s > bs) { bs = s; best = b; }
      }
    }
    return best;
  }
  /* --- firing --- */
  function muzzle(e, w, ang) { // muzzle world position
    if (e.k === 'b') return [e.x + Math.cos(ang) * 14, e.y + Math.sin(ang) * 14];
    const d = e.def; const va = VART[e.type]; let x = e.x, y = e.y;
    if (va && va.tx !== undefined) { x += Math.cos(e.a) * va.tx; y += Math.sin(e.a) * va.tx; }
    if (w.fx === 'vls') return [e.x + Math.cos(e.a) * (d.r * 0.2), e.y + Math.sin(e.a) * (d.r * 0.2)];
    const L = va ? (va.gx || 0) + (va.gl || 6) : d.cls === 'inf' ? 8 : 10;
    return [x + Math.cos(ang) * L, y + Math.sin(ang) * L];
  }
  function dmgMul(G, e, w) {
    const pl = G.players[e.owner]; const pm = G.pm(e.owner); let k = 1;
    if (w.t === 'ap' || w.t === 'auto') k *= pm.dmgAP; if (w.proj === 'arty' || w.proj === 'mlrs') k *= pm.artyDmg; if (w.t === 'aa' || w.t === 'aagun') k *= pm.aaDmg;
    if (e.k === 'b') { if (e.def.w_) k *= pm.defDmg; return k; }
    k *= 1 + 0.12 * e.rank; if (e.def.cls === 'air') k *= pm.airDmg;
    if (FACTIONS[pl.f].mod.horde && e.horde) k *= 1 + 0.15 * pm.hordeK;
    if (e.ab && e.ab.t > G.t) k *= e.ab.dmg;
    return k;
  }
  // electronic warfare / ECM: chance that a guided missile loses its lock on this target
  function jamChance(G, t) { if (!t || t.k !== 'u') return 0; let p = t.def.ecm || 0; const pm = G.pm(t.owner); if (pm.ewar) p = Math.max(p, pm.ewar); return p; }
  // tesla bolt: from the struck unit to the nearest enemies (each jump weaker), deterministic order (lockstep-safe)
  function chainZap(G, e, t0, dmg, w) {
    const seen = new Set([t0.id]); let cur = t0, d = dmg;
    for (let k = 0; k < w.chain; k++) { let best = null, bd = 120 * 120;
      for (const u of G.units) { if (u.dead || u.owner < 0 || seen.has(u.id) || G.allies(u.owner, e.owner) || (isAir(u) && !w.air)) continue; const dx = u.x - cur.x, dy = u.y - cur.y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = u; } }
      if (!best) break; d *= 0.65; seen.add(best.id); FX.tracer(cur.x, cur.y, best.x, best.y, w, 0); damage(G, best, d, w.t, e.owner, e); cur = best; }
  }
  function fire(G, e, ws, t, ax, ay) {
    const w = ws.d;
    const dmg = w.dmg * dmgMul(G, e, w);
    const tx = t ? t.x : ax, ty = t ? t.y : ay; const ang = e.k === 'u' && e.def.cls !== 'inf' && e.def.cls !== 'air' && e.def.tur !== false && VART[e.type] && VART[e.type].tur && w.fx !== 'vls' ? e.ta : Math.atan2(ty - e.y, tx - e.x);
    const [mx, my] = muzzle(e, w, ang); const dist = Math.hypot(tx - mx, ty - my);
    const proj = w.proj;
    if (e.k === 'u') { e.recoil = 1; e.flash = 0.08; e.firedT = G.t; }
    if (e.k === 'b') e.flash = 0.08;
    FX.muzzle(e, w, mx, my, ang); SND.shot(w.snd, mx, my, w);
    if (proj === 'hit') {
      let p = 0.9; if (t && t.k === 'u') { if (t.spd > 20) p -= 0.15; if (t.def.cls === 'inf') p -= 0.08; if (isAir(t)) p -= 0.25; }
      if (e.k === 'u' && e.spd > 15) p -= 0.15; const hit = !!t && rnd() < p;
      let ex = tx, ey = ty; if (!hit) { const a = rnd() * TAU, r = 8 + rnd() * 18; ex += Math.cos(a) * r; ey += Math.sin(a) * r; }
      FX.tracer(mx, my, ex, ey, w, hit && t && isAir(t) ? t.z : 0);
      if (hit) damage(G, t, dmg, w.t, e.owner, e); else FX.impact(ex, ey, w, false);
      if (hit && w.chain && t.k === 'u') chainZap(G, e, t, dmg, w);
      if (hit && t.k === 'b') FX.impact(ex, ey, w, true);
      return;
    }
    const P = { t: proj, x: mx, y: my, z: e.k === 'u' ? (e.z || 0) + 3 : 8, sx: mx, sy: my, owner: e.owner, sid: e.id, tid: t ? t.id : 0, dmg, dt: w.t, splash: w.splash || 0, w, life: 0, dead: false, ang, trail: 0, thermo: w.thermo };
    const accK = e.k === 'u' && e.def.cls === 'veh' ? G.pm(e.owner).acc : 1;
    if (proj === 'shell' || proj === 'rocket') {
      let lx = tx, ly = ty; if (t && t.k === 'u') { const tt = dist / w.speed; lx += (t.vx || 0) * tt; ly += (t.vy || 0) * tt; }
      let acc = (w.acc || (proj === 'rocket' ? 0.04 : 0.012)) * accK; if (e.k === 'u' && e.spd > 15) acc *= 2.2;
      const aa = Math.atan2(ly - my, lx - mx) + (rnd() - 0.5) * 2 * acc; const L = Math.hypot(lx - mx, ly - my) + (rnd() - 0.5) * 12;
      P.tx = mx + Math.cos(aa) * L; P.ty = my + Math.sin(aa) * L; P.spd = w.speed; P.ang = aa; P.T = L / w.speed; P.arc = w.arc ? L * w.arc : 0; P.tz = t && isAir(t) ? t.z : 0;
    } else if (proj === 'missile' || proj === 'aamis') {
      P.spd = w.speed * (proj === 'aamis' ? 0.55 : 0.7); P.max = w.speed; P.turn = proj === 'aamis' ? 5.5 : 3.6; P.top = !!w.top; P.tx = tx; P.ty = ty; P.lifeMax = 6 + dist / w.speed * 2; P.ang = ang + (rnd() - 0.5) * 0.3;
      if (w.fx === 'vls') { P.z = 20; P.vls = 0.35; P.ang = ang; }
      if (proj === 'aamis') P.z = Math.max(P.z, 10);
      const jam = jamChance(G, t); if (jam && rnd() < jam) { P.tid = 0; const a = rnd() * TAU, r = 60 + rnd() * 80; P.tx = tx + Math.cos(a) * r; P.ty = ty + Math.sin(a) * r; P.jammed = 1; }
    } else if (proj === 'arty' || proj === 'mlrs') {
      let lx = tx, ly = ty; const pl2 = FACTIONS[G.players[e.owner].f].mod; let acc = (w.acc || 40) * (dist / w.range) * (pl2.artyAcc && proj === 'arty' ? pl2.artyAcc : 1);
      if (t && t.k === 'u') { const tt = dist / w.speed; lx += (t.vx || 0) * tt * 0.7; ly += (t.vy || 0) * tt * 0.7; }
      const g = rndGauss; lx += g() * acc * 0.6; ly += g() * acc * 0.6;
      P.tx = lx; P.ty = ly; const L = Math.hypot(lx - mx, ly - my); P.T = Math.max(0.6, L / w.speed); P.apex = Math.min(420, L * 0.38) + 30; P.ang = Math.atan2(ly - my, lx - mx);
    } else if (proj === 'c4') { P.tx = tx; P.ty = ty; P.T = 6; P.x = e.x; P.y = e.y;
    } else if (proj === 'bomb') {
      P.tx = tx + (rnd() - 0.5) * 16; P.ty = ty + (rnd() - 0.5) * 16; P.z = e.z || 150; P.T = 0.9 + P.z / 400; P.ang = e.a; P.vx = (P.tx - mx) / P.T; P.vy = (P.ty - my) / P.T;
    }
    G.proj.push(P);
  }
  /* --- projectile update --- */
  function step(G, dt) {
    const P = G.proj; 
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life += dt; p.px = p.x; p.py = p.y; p.pz = p.z;
      if (p.t === 'shell' || p.t === 'rocket') {
        const f = Math.min(1, p.life / p.T); p.x = lerp(p.sx, p.tx, f); p.y = lerp(p.sy, p.ty, f); p.z = (p.tz || 0) * f + 3 * (1 - f) + (p.arc ? 4 * p.arc * f * (1 - f) : 0);
        if (p.t === 'rocket' && (p.trail -= dt) <= 0) { p.trail = 0.018; FX.trail(p.x, p.y, p.z, 'rocket'); }
        if (f >= 1) { impact(G, p); P.splice(i, 1); }
      } else if (p.t === 'missile' || p.t === 'aamis') {
        const t = G.get(p.tid); if (alive(t) && !hidden(G, t, p.owner)) { p.tx = t.x; p.ty = t.y; p.tzz = isAir(t) ? t.z : 0; }
        if (p.vls > 0) { p.vls -= dt; p.z += 160 * dt; p.spd = Math.min(p.max * 0.5, p.spd + p.max * dt); if ((p.trail -= dt) <= 0) { p.trail = 0.016; FX.trail(p.x, p.y, p.z, p.t); } continue; } // vertical launch cell: climb, then turn onto the target
        const want = Math.atan2(p.ty - p.y, p.tx - p.x); const turn = p.turn * (p.life < 0.25 ? 0.3 : 1); p.ang = angTo(p.ang, want, turn * dt);
        p.spd = Math.min(p.max, p.spd + p.max * 1.4 * dt); p.x += Math.cos(p.ang) * p.spd * dt; p.y += Math.sin(p.ang) * p.spd * dt;
        const d = Math.hypot(p.tx - p.x, p.ty - p.y);
        if (p.top) { const tot = Math.hypot(p.tx - p.sx, p.ty - p.sy) + 1; const f = 1 - d / tot; p.z = 8 + Math.sin(clamp(f, 0, 1) * PI) * Math.min(90, tot * 0.35); }
        else p.z = lerp(p.z, p.tzz || 4, Math.min(1, dt * 3));
        if ((p.trail -= dt) <= 0) { p.trail = p.t === 'aamis' ? 0.016 : 0.02; FX.trail(p.x, p.y, p.z, p.t); }
        // active protection (T-14, Abrams X, Leopard 2A8 ...)
        if (alive(t) && t.aps && d < 45 && !p.apsChecked) { p.apsChecked = true; if (rnd() < t.aps) { FX.aps(t, p.x, p.y); SND.at('aps', p.x, p.y); P.splice(i, 1); continue; } }
        if (d < 9 + (p.spd * dt)) { impact(G, p); P.splice(i, 1); continue; }
        if (p.life > p.lifeMax) { impact(G, p, true); P.splice(i, 1); }
      } else if (p.t === 'arty' || p.t === 'mlrs') {
        const f = Math.min(1, p.life / p.T); p.x = lerp(p.sx, p.tx, f); p.y = lerp(p.sy, p.ty, f); p.z = 4 * p.apex * f * (1 - f) + 6 * (1 - f);
        if (p.t === 'mlrs' && (p.trail -= dt) <= 0 && f < 0.6) { p.trail = 0.024; FX.trail(p.x, p.y, p.z, 'mlrs'); }
        if (f >= 1) { impact(G, p); P.splice(i, 1); }
      } else if (p.t === 'c4') { // timed charge: beeps, then blows
        if (p.life >= p.T) { impact(G, p); P.splice(i, 1); } else if (Math.floor(p.life * 2) !== Math.floor((p.life - dt) * 2)) SND.at('beep', p.x, p.y);
      } else if (p.t === 'bomb') {
        const f = Math.min(1, p.life / p.T); p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, (1 - f * f) * (p.z0 || (p.z0 = p.z)));
        if (f >= 1) { impact(G, p); P.splice(i, 1); }
      } else P.splice(i, 1);
    }
  }
  function impact(G, p, air) {
    const t = G.get(p.tid);
    let direct = null;
    if (alive(t)) { const d = t.k === 'b' ? distTo(p.x, p.y, t) : Math.hypot(t.x - p.x, t.y - p.y); const hitR = t.k === 'b' ? 4 : (t.def.r || 8) + 5; if (d <= hitR || p.t === 'missile' || p.t === 'aamis') direct = t; }
    if (p.jammed) direct = null;
    if (direct && (p.t !== 'arty' && p.t !== 'mlrs' && p.t !== 'bomb')) damage(G, direct, p.dmg, p.dt, p.owner, G.get(p.sid));
    const onAir = direct && isAir(direct);
    if (p.splash > 0 && !onAir) splash(G, p.x, p.y, p.splash, p.dmg * (direct && p.t !== 'arty' && p.t !== 'mlrs' && p.t !== 'bomb' ? 0.35 : 1), p.dt, p.owner, G.get(p.sid), direct && p.t !== 'arty' && p.t !== 'mlrs' && p.t !== 'bomb' ? direct.id : 0);
    const m = G.map; const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE); p.water = m.inb(tx, ty) && (m.pass[ty * m.w + tx] & PASS.WATER) !== 0 && !(direct && direct.def && direct.def.cls === 'sea');
    FX.explode(p.x, p.y, onAir ? direct.z : 0, p, !!direct);
  }
  function splash(G, x, y, r, dmg, dtype, owner, src, skip) {
    G.uhash.query(x, y, r + 20, tmp);
    for (const t of tmp) { if (!alive(t) || t.id === skip || isAir(t)) continue; if (owner >= 0 && G.allies(owner, t.owner) && dtype !== 'bomb' && dtype !== 'thermo') continue; const d = Math.hypot(t.x - x, t.y - y) - (t.def.r || 6) * 0.5; if (d > r) continue; damage(G, t, dmg * (1 - 0.7 * clamp(d / r, 0, 1)), dtype, owner, src, true); }
    G.bhash.query(x, y, r + 120, tmp2);
    for (const b of tmp2) { if (!alive(b) || b.id === skip || b.type === 'depot') continue; if (owner >= 0 && G.allies(owner, b.owner)) continue; const d = distTo(x, y, b); if (d > r) continue; damage(G, b, dmg * (1 - 0.6 * clamp(d / r, 0, 1)), dtype, owner, src, true); }
    // trees
    const m = G.map; const rt = Math.ceil(r / TILE * 0.7); const tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE);
    if (dmg > 60) for (let yy = ty0 - rt; yy <= ty0 + rt; yy++) for (let xx = tx0 - rt; xx <= tx0 + rt; xx++) { if (!m.inb(xx, yy)) continue; const ti = m.treeAt[yy * m.w + xx]; if (ti >= 0 && rnd() < 0.6) { const tr = m.trees[ti]; if (Math.hypot(tr.x - x, tr.y - y) < r * 0.75) { m.removeTree(ti); FX.treeDown(tr, Math.atan2(tr.y - y, tr.x - x), true); } } }
  }
  function damage(G, t, amt, dtype, owner, src, isSplash) {
    if (!alive(t)) return;
    let mult = (DMG[dtype] || DMG.he)[armorOf(t)] || 0;
    if (t.k === 'u' && t.rank) mult *= 1 - 0.07 * t.rank;
    if (t.k === 'u' && t.def.slat && dtype === 'heat') mult *= 1 - t.def.slat;
    if (t.k === 'b' && !t.built) mult *= 1.2;
    amt *= mult; if (amt <= 0.01) return;
    if (G.mode === 'tut' && t.owner === G.local) amt *= 0.4;
    if (G.mode === 'survival' && G.players[t.owner] && G.players[t.owner].waves) amt /= G.waveArmor || 1;
    t.hp -= amt; t.hit = 0.18; t.lastHitT = G.t; t.lastHitBy = owner;
    if (src && src.k === 'u' && t.k === 'u' && t.order && t.order.t === 'idle' && !t.tid && G.enemies(t.owner, src.owner)) t.revenge = src.id;
    const pl = G.players[t.owner];
    if (pl && owner !== t.owner && owner >= 0) {
      pl.lastAttackT = G.t; pl.lastAttackX = t.x; pl.lastAttackY = t.y;
      if (t.owner === G.local) { const key = t.k === 'b' ? 'ab' : 'au'; if (!G['_' + key] || G.t - G['_' + key] > (t.k === 'b' ? 10 : 16)) { G['_' + key] = G.t; G.notify(t.owner, t.k === 'b' ? 'قاعدتنا تتعرض للهجوم!' : 'قواتنا تتعرض للهجوم!', 'bad', t.x, t.y); if (t.k === 'b') { if (!G._siren || G.t - G._siren > 32) { G._siren = G.t; SND.ui('alarm'); } else SND.ui('warn'); } else SND.ui('warn'); } }
    }
    if (t.hp <= 0) kill(G, t, owner, src);
  }
  function kill(G, t, owner, src) {
    if (t.dead) return;
    if (t.k === 'u' && t.def.cls === 'air' && t.z > 8 && !t.dying) { t.dying = true; t.hp = 0; t.fallT = 0; t.killer = owner; FX.airHit(t); G.giveXP(owner, t); if (src) G.unitXP(src, t); creditKill(G, t, owner); Units.killCargo(G, t, owner, src); return; }
    t.dead = true; t.hp = 0;
    if (t.k === 'u') {
      if (!t.dying) { G.giveXP(owner, t); if (src) G.unitXP(src, t); creditKill(G, t, owner); }
      Units.killCargo(G, t, owner, src);
      FX.death(t); G.removeUnit(t);
      if (t.def.cls !== 'inf' && t.def.cls !== 'air') G.wrecks.push({ x: t.x, y: t.y, a: t.a, ta: t.ta, type: t.type, t: 0, life: 70, fire: 8 + rnd() * 10, turretOff: t.turretOff || null });
      else if (t.def.cls === 'inf') G.wrecks.push({ x: t.x, y: t.y, a: t.a + (rnd() - 0.5), type: t.type, t: 0, life: 14, inf: 1 });
      else { const m = G.map; const tx = Math.floor(t.x / TILE), ty = Math.floor(t.y / TILE); if (m.inb(tx, ty) && (m.pass[ty * m.w + tx] & PASS.WATER)) FX.splash(t.x, t.y, 30, true); else G.wrecks.push({ x: t.x, y: t.y, a: t.a, type: t.type, t: 0, life: 45, fire: 10, air: 1 }); }
    } else {
      G.giveXP(owner, t); creditKill(G, t, owner, true);
      FX.bdeath(t); G.wrecks.push({ x: t.x, y: t.y, a: 0, type: t.type, bld: 1, owner: t.owner, t: 0, life: 9999, fire: 25, w: t.w, h: t.h });
      const pl = G.players[t.owner]; if (pl && t.owner === G.local) G.notify(t.owner, 'خسرنا ' + G.bname(t), 'bad', t.x, t.y);
      if (pl && t.type === 'super') pl.superB = null;
      G.removeBuilding(t);
    }
    G.dirtyVictory = true;
  }
  /* --- point defence & missile defence ---
     C-RAM / CIWS sites (def.intercept) engage incoming shells, rockets, bombs and cruise missiles that will land near them;
     long-range SAM sites (def.abm) engage cruise and ballistic missiles. Hypersonic glide vehicles cannot be stopped. */
  const icSites = [];
  function intercept(G, dt) {
    icSites.length = 0;
    for (const b of G.blds) if ((b.def.intercept || b.def.abm) && b.built >= 1 && !b.dead && b.owner >= 0) { b.icd = (b.icd || 0) - dt; if (!G.lowPower(b.owner)) icSites.push(b); }
    if (!icSites.length) return; const P = G.proj;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; if (p.owner < 0) continue; const sp = p.special; let kind = null;
      if (p.t === 'arty' || p.t === 'mlrs') { if (sp === 'hyper') continue; kind = sp === 'ballistic' ? 'bm' : sp ? 'cm' : 'shell'; if (!sp && Math.min(1, p.life / p.T) < 0.42) continue; } // rounds are taken on the way down
      else if (p.t === 'bomb') kind = 'shell'; else continue;
      for (const b of icSites) {
        if (b.icd > 0 || !G.enemies(b.owner, p.owner)) continue; const pl = G.players[b.owner];
        if (b.def.intercept && kind !== 'bm') { const I = b.def.intercept; if (Math.hypot(p.x - b.x, p.y - b.y) > I.r || Math.hypot(p.tx - b.x, p.ty - b.y) > I.r + 70) continue;
          b.icd = I.rof; b.icA = Math.atan2(p.y - b.y, p.x - b.x); b.icT = G.t; const pk = ((b.def.ip && b.def.ip[pl.f]) || I.p) * (kind === 'cm' ? 0.55 : 1); const kill = rnd() < pk;
          FX.ciws(b.x + Math.cos(b.icA) * 12, b.y + Math.sin(b.icA) * 12, p.x, p.y, p.z || 0, kill); SND.at(b.wp[0] ? b.wp[0].d.snd : 'ciws', b.x, b.y);
          if (kill) { P.splice(i, 1); pl.stats.icpt = (pl.stats.icpt || 0) + 1; if (b.owner === G.local && G.t - (G._icN || -99) > 12) { G._icN = G.t; G.notify(b.owner, 'الدفاع الجوي اعترض قذائف معادية', 'good', b.x, b.y); } }
          break; }
        if (b.def.abm && (kind === 'cm' || kind === 'bm')) { const A = b.def.abm; const R = (b.wp[0] ? rangeOf(G, b.owner, b.wp[0].d, b) : 800); if (Math.hypot(p.x - b.x, p.y - b.y) > R || Math.hypot(p.tx - b.x, p.ty - b.y) > R + 120) continue;
          b.icd = A.rof; b.icA = Math.atan2(p.y - b.y, p.x - b.x); b.icT = G.t; const kill = rnd() < A.p * (kind === 'cm' ? 1.4 : 1);
          FX.samKill(b.x, b.y, p.x, p.y, p.z || 0, kill); SND.at('sam', b.x, b.y);
          if (kill) { P.splice(i, 1); pl.stats.icpt = (pl.stats.icpt || 0) + 1; G.notify(b.owner, 'تم اعتراض صاروخ معادٍ!', 'good', b.x, b.y); }
          break; }
      }
    }
  }
  function creditKill(G, t, owner, bld) { const v = G.players[owner], l = G.players[t.owner]; if (v && owner !== t.owner) { v.stats.kills++; if (bld) v.stats.bkills++; if (t.k === 'u' && t.def.cls === 'sea') v.stats.ships = (v.stats.ships || 0) + 1; if (t.k === 'u' && t.def.cls === 'air') v.stats.air = (v.stats.air || 0) + 1; } if (l) l.stats.lost++; }
  return { acquire, fire, step, intercept, damage, splash, eff, canHit, distTo, alive, isAir, rangeOf,  kill, hidden };
})();
