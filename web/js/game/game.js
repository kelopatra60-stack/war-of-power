/* ============================================================
   War of Power — حالة المعركة: اللاعبون، الكيانات، الضباب
   الملف: js/game/game.js   ·   ترتيب التحميل: 20 من 43
   ============================================================ */
'use strict';
/* ===== Game state: players, entities, spatial hash, fog ===== */
let GAME = null;
const DT = 1 / 30;
const POP_CAP = Infinity; // no limit on the number of units
class SpatialHash {
  constructor(w, h, cs) { this.cs = cs; this.cw = Math.ceil(w / cs) + 1; this.ch = Math.ceil(h / cs) + 1; this.cells = Array.from({ length: this.cw * this.ch }, () => []); this.used = []; }
  clear() { for (const c of this.used) this.cells[c].length = 0; this.used.length = 0; }
  add(e) { const cx = clamp(Math.floor(e.x / this.cs), 0, this.cw - 1), cy = clamp(Math.floor(e.y / this.cs), 0, this.ch - 1); const c = cy * this.cw + cx; const a = this.cells[c]; if (a.length === 0) this.used.push(c); a.push(e); }
  query(x, y, r, out) {
    out.length = 0; const cs = this.cs; const x0 = clamp(Math.floor((x - r) / cs), 0, this.cw - 1), x1 = clamp(Math.floor((x + r) / cs), 0, this.cw - 1), y0 = clamp(Math.floor((y - r) / cs), 0, this.ch - 1), y1 = clamp(Math.floor((y + r) / cs), 0, this.ch - 1);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const a = this.cells[cy * this.cw + cx]; for (let i = 0; i < a.length; i++) out.push(a[i]); }
    return out;
  }
}
const _q = [];
class Game {
  constructor(cfg, map) {
    this.cfg = cfg; this.mode = cfg.mode || 'skirmish'; this.map = map; this.t = 0; this.tick = 0; this.nextId = 1;
    this.ents = new Map(); this.units = []; this.blds = []; this.proj = []; this.players = []; this.local = cfg.local || 0;
    this.uhash = new SpatialHash(map.w * TILE, map.h * TILE, 128); this.bhash = new SpatialHash(map.w * TILE, map.h * TILE, 256);
    this.over = false; this.winner = -1; this.msgs = []; this.diff = cfg.diff || 1; this.speed = 1; this.wrecks = [];
    this.fog = { vis: new Uint8Array(map.w * map.h), exp: new Uint8Array(map.w * map.h), buf: new Uint8Array(map.w * map.h * 4), dirty: true, all: !!cfg.reveal };
    this.reveals = []; // temporary reveal circles {x,y,r,t,owner}
    this.markers = []; this.strikes = [];
    this.seed = (cfg.seed >>> 0) || ((Math.random() * 4294967295) >>> 0) || 1; this.rng = RNG(this.seed); SIMR = this.rng; this.lockstep = !!cfg.lockstep;
    Path.init(map);
  }
  id() { return this.nextId++; }
  get me() { return this.players[this.local]; }
  addPlayer(pc) {
    const i = this.players.length; const col = hex2rgb(TEAMCOL[pc.col]);
    const p = { id: i, f: pc.f, team: pc.team === undefined ? i : pc.team, col: pc.col, rgb: col, tp: R.pack(col[0], col[1], col[2], 0), name: pc.name || FACTIONS[pc.f].name,
      human: !!pc.human, aiLevel: pc.ai, ai: null, money: this.cfg.money || 10000, iron: this.mode === 'tut' ? 99999 : Math.round((this.cfg.money || 10000) * 0.08), parts: this.mode === 'tut' ? 99999 : Math.round((this.cfg.money || 10000) * 0.05), pprod: 0, puse: 0, xp: 0, rank: 1, pcd: {}, upg: {}, research: null, specials: pc.noElite ? {} : allSpecials(pc.f), peer: pc.peer,
      pop: 0, popCap: pc.popCap || POP_CAP, alive: true, start: pc.start, stats: { built: 0, units: 0, kills: 0, lost: 0, spent: 0, earned: 0, bkills: 0 }, superT: 0, superReady: false, superB: null, inc: 0, lastAttackT: -99 };
    this.players.push(p); return p;
  }
  // player modifiers from researched technologies (cached; reset when research completes)
  pm(pid) { const p = this.players[pid]; if (!p) return PM0; if (p.pmc) return p.pmc; const o = Object.assign({}, PM0); for (const t of techTree(p.f)) if (p.upg[t.id] && t.fx) for (const k in t.fx) { if (PM_ADD[k]) o[k] += t.fx[k]; else o[k] *= t.fx[k]; } p.pmc = o; return o; }
  enemies(a, b) { if (a === b) return false; if (a < 0 || b < 0) return false; return this.players[a].team !== this.players[b].team; }
  allies(a, b) { return a === b || (a >= 0 && b >= 0 && this.players[a].team === this.players[b].team); }
  get(id) { return this.ents.get(id); }
  notify(pid, text, kind, x, y) { if (pid !== this.local) return; this.msgs.push({ text, kind: kind || 'info', x, y, t: this.t }); if (this.msgs.length > 30) this.msgs.shift(); UI.toast && UI.toast(text, kind, x, y); }
  /* --- units --- */
  spawnUnit(defId, owner, x, y, a) {
    const def = UNITS[defId]; if (!def) return null; const pl = this.players[owner];
    const u = { id: this.id(), k: 'u', def, type: defId, owner, x, y, z: def.cls === 'air' ? 0 : 0, a: a || 0, ta: a || 0, px: x, py: y, pa: a || 0, pta: a || 0,
      hp: 0, maxHp: 0, vx: 0, vy: 0, spd: 0, order: { t: 'idle' }, path: null, pi: 0, tid: 0, w: [], xp: 0, rank: 0, sel: false, grp: 0,
      recoil: 0, anim: 0, flash: 0, scan: rnd() * 0.4, stuck: 0, lastPos: [x, y], gx: x, gy: y, cargo: 0, work: 0, dead: false, hit: 0, smoke: 0, fx: 0, aps: def.aps || 0, born: this.t };
    const pm = this.pm(owner); let hp = def.hp * this.hpK(pm, def); u.hp = u.maxHp = Math.round(hp);
    const extraAmmo = def.fly === 'jet' ? pm.jetAmmo : 0;
    for (const wk of def.w) { const w = WPN[wk]; if (!w) continue; u.w.push({ k: wk, d: w, cd: rnd() * 0.5, burst: 0, bcd: 0, ammo: w.ammo ? w.ammo + extraAmmo : 0, tid: 0, sal: 0, scd: 0 }); }
    if (def.cls === 'air') { u.z = def.fly === 'heli' ? 0 : def.alt; u.alt = def.alt; u.home = 0; u.circ = rnd() * TAU; }
    if (def.cls === 'inf' && pm.train) u.rank = 1, u.xp = RANKS[1].xp;
    if (def.cargo) u.load = [];
    this.ents.set(u.id, u); this.units.push(u); pl.pop += def.pop || 1; pl.stats.units++;
    return u;
  }
  hpK(pm, def) { let k = UNIT_HP_K; if (def.cls === 'veh') k *= pm.vehHp; else if (def.cls === 'inf') k *= pm.infHp; else if (def.cls === 'air') { k *= pm.airHp; if (def.fly === 'jet') k *= pm.jetHp; } return k; }
  removeUnit(u) { if (u.removed) return; u.removed = true; this.ents.delete(u.id); const i = this.units.indexOf(u); if (i >= 0) this.units.splice(i, 1); const pl = this.players[u.owner]; if (pl && !u.special) pl.pop -= u.def.pop || 1; }
  /* --- buildings --- */
  bdef(type) { return BLD[type] || null; }
  canPlace(type, tx, ty, owner, ignoreFog) {
    const d = BLD[type]; if (!d) return false; const m = this.map;
    if (d.ore && !this.oreSpot(tx, ty)) return false; // mines sit exactly on a free iron vein
    for (let y = ty; y < ty + d.h; y++) for (let x = tx; x < tx + d.w; x++) {
      if (!m.inb(x, y)) return false; const i = y * m.w + x; const p = m.pass[i];
      if (p & (PASS.VEH | PASS.WATER | PASS.BLD)) return false; if (m.road[i] && type !== 'road') return false;
      if (!ignoreFog && !this.lockstep && owner === this.local && !this.fog.exp[i] && !this.fog.all) return false;
    }
    // no enemy units on footprint
    const cx = (tx + d.w / 2) * TILE, cy = (ty + d.h / 2) * TILE; const hw = d.w * TILE / 2, hh = d.h * TILE / 2;
    for (const u of this.uhash.query(cx, cy, Math.max(hw, hh) + 20, _q)) if (u.def.cls !== 'air' && !u.dead && Math.abs(u.x - cx) < hw + u.def.r * 0.5 && Math.abs(u.y - cy) < hh + u.def.r * 0.5 && this.enemies(owner, u.owner)) return false;
    return true;
  }
  placeBuilding(type, owner, tx, ty, done) {
    const d = this.bdef(type); if (!d) return null; const m = this.map;
    const b = { id: this.id(), k: 'b', type, def: d, owner, tx, ty, w: d.w, h: d.h, x: (tx + d.w / 2) * TILE, y: (ty + d.h / 2) * TILE, hp: 1, maxHp: d.hp || 1500,
      built: done ? 1 : 0, works: null, prog: {}, q: [], rally: null, ta: -PI / 2, wp: [], dead: false, cap: 0, capBy: -1, inc: 0, sel: false, burn: 0, res: 0, research: null, charge: 0, anim: rnd() * 10, hit: 0, born: this.t, sold: false };
    const pl = owner >= 0 ? this.players[owner] : null;
    if (pl && FACTIONS[pl.f].mod.bldHp) b.maxHp = Math.round(b.maxHp * FACTIONS[pl.f].mod.bldHp);
    if (pl) b.maxHp = Math.round(b.maxHp * this.pm(owner).bldHp);
    b.works = Object.assign({}, d.works || { finish: 4 }); b.total = Object.values(b.works).reduce((a, v) => a + v, 0) || 1;
    b.stages = ['dig', 'frame', 'pour', 'pave', 'finish'].filter(k => b.works[k] > 0); b.stage = 0;
    b.hp = done ? b.maxHp : Math.max(1, b.maxHp * 0.08);
    const wl = (d.wf && pl && d.wf[pl.f]) || d.w_; if (wl) for (const wk of wl) b.wp.push({ k: wk, d: WPN[wk], cd: 0, burst: 0, bcd: 0, tid: 0, sal: 0, scd: 0, ammo: 0 });
    if (type === 'depot') b.res = 40000;
    for (let y = ty; y < ty + d.h; y++) for (let x = tx; x < tx + d.w; x++) { if (!m.inb(x, y)) continue; const i = y * m.w + x; if (type !== 'wall' || true) m.pass[i] |= PASS.BLD; m.bldAt[i] = b.id; const tr = m.treeAt[i]; if (tr >= 0) m.removeTree(tr); }
    this.ents.set(b.id, b); this.blds.push(b); this.bhash.add(b);
    if (done) this.onBuilt(b, true);
    if (Path.init && this.tick > 0) { }
    return b;
  }
  onBuilt(b, silent) {
    b.built = 1; b.hp = Math.max(b.hp, b.maxHp * (silent ? 1 : 0.999)); const pl = this.players[b.owner];
    if (pl) { this.recalcPower(pl); pl.stats.built++; if (!silent) { this.notify(b.owner, 'اكتمل بناء ' + this.bname(b), 'good', b.x, b.y); SND.ui('built'); } }
    if (b.type === 'supply' && pl && !silent) { const u = this.spawnUnit(pl.f + '_supply', b.owner, b.x, b.y + b.h * TILE / 2 + 16, PI / 2); if (u) { u.order = { t: 'harvest' }; } }
    if (b.type === 'super' && pl) { b.charge = 0; pl.superB = b.id; if (!silent) this.players.forEach((p2, j) => { if (j !== b.owner) this.notify(j, 'تحذير: العدو بنى سلاحاً استراتيجياً!', 'bad', b.x, b.y); }); }
    if (b.type === 'airfield') b.pads = [0, 0, 0, 0];
    FX.built && FX.built(b);
  }
  bname(b) { const pl = this.players[b.owner]; return pl ? bldName(pl.f, b.type) : b.def.n; }
  removeBuilding(b) {
    if (b.removed) return; b.removed = true; const m = this.map;
    for (let y = b.ty; y < b.ty + b.h; y++) for (let x = b.tx; x < b.tx + b.w; x++) { if (!m.inb(x, y)) continue; const i = y * m.w + x; if (m.bldAt[i] === b.id) { m.bldAt[i] = 0; m.pass[i] &= ~PASS.BLD; } }
    this.ents.delete(b.id); const i = this.blds.indexOf(b); if (i >= 0) this.blds.splice(i, 1);
    this.bhash = new SpatialHash(m.w * TILE, m.h * TILE, 256); for (const bb of this.blds) this.bhash.add(bb);
    const pl = this.players[b.owner]; if (pl) this.recalcPower(pl);
  }
  recalcPower(pl) {
    let pr = 0, us = 0; for (const b of this.blds) { if (b.owner !== pl.id || b.built < 1 || b.dead) continue; const pw = b.def.power || 0; if (pw > 0) pr += pw; else us -= pw; }
    pl.pprod = Math.round(pr * this.pm(pl.id).power); pl.puse = us;
  }
  lowPower(pid) { const p = this.players[pid]; return p && p.puse > p.pprod; }
  has(pid, type) { for (const b of this.blds) if (b.owner === pid && b.type === type && b.built >= 1 && !b.dead) return true; return false; }
  count(pid, type) { let n = 0; for (const b of this.blds) if (b.owner === pid && b.type === type && !b.dead) n++; return n; }
  reqMet(pid, req) { if (!req || !req.length) return true; for (const r of req) if (!this.has(pid, r)) return false; return true; }
  /* --- fog of war (local player) --- */
  updateFog() {
    const f = this.fog, m = this.map, W = m.w, H = m.h; f.vis.fill(0);
    const stamp = (x, y, r) => { const tx = x / TILE, ty = y / TILE, rt = r / TILE; const x0 = Math.max(0, Math.floor(tx - rt)), x1 = Math.min(W - 1, Math.ceil(tx + rt)), y0 = Math.max(0, Math.floor(ty - rt)), y1 = Math.min(H - 1, Math.ceil(ty + rt)); const r2 = rt * rt;
      for (let yy = y0; yy <= y1; yy++) { const dy = yy + 0.5 - ty; for (let xx = x0; xx <= x1; xx++) { const dx = xx + 0.5 - tx; if (dx * dx + dy * dy <= r2) { const i = yy * W + xx; f.vis[i] = 1; f.exp[i] = 1; } } } };
    const me = this.local;
    for (const u of this.units) if (!u.dead && this.allies(u.owner, me)) { if (u.def.nosel) continue; let v = u.def.vision * this.pm(u.owner).vision; if (u.ab && u.ab.t > this.t) v *= u.ab.vis; stamp(u.x, u.y, v); }
    for (const b of this.blds) if (!b.dead && this.allies(b.owner, me)) stamp(b.x, b.y, (b.def.vision || 200) + Math.max(b.w, b.h) * 10);
    for (const r of this.reveals) if (this.allies(r.owner, me)) stamp(r.x, r.y, r.r);
    if (f.all) { f.vis.fill(1); f.exp.fill(1); }
    const buf = f.buf; for (let i = 0; i < W * H; i++) { buf[i * 4] = f.vis[i] ? 255 : 0; buf[i * 4 + 1] = f.vis[i] ? 255 : 0; } // total fog of war: anything not seen right now stays black
    f.dirty = true;
  }
  oreSpot(tx, ty) { for (const o of this.map.ore) if (o.tx === tx && o.ty === ty) return this.blds.some(b => !b.dead && b.type === 'mine' && b.tx === tx && b.ty === ty) ? null : o; return null; }
  visibleTo(pid, x, y) { if (pid !== this.local) return true; if (this.fog.all) return true; if (this.players[pid] && this.players[pid].spyT > this.t) return true; const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); if (!this.map.inb(tx, ty)) return false; return this.fog.vis[ty * this.map.w + tx] === 1; }
  exploredTo(x, y) { if (this.fog.all) return true; const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); if (!this.map.inb(tx, ty)) return false; return this.fog.exp[ty * this.map.w + tx] === 1; }
  /* --- xp / ranks --- */
  giveXP(killerOwner, victim) {
    if (killerOwner < 0) return; const p = this.players[killerOwner]; if (!p) return; const val = victim.k === 'u' ? victim.def.cost : (victim.def.cost || 800);
    p.xp += val * 0.5; let r = 1; for (let i = 1; i < CMD_RANKS.length; i++) if (p.xp >= CMD_RANKS[i]) r = i; if (r > p.rank) { p.rank = r; this.notify(p.id, 'ترقية القائد: رتبة ' + CMD_RANK_N[r] + ' — صلاحيات جديدة', 'good'); SND.ui('promote'); }
  }
  unitXP(u, victim) {
    if (!u || u.dead || u.k !== 'u') return; const val = victim.k === 'u' ? victim.def.cost : (victim.def.cost || 600);
    u.xp += val / Math.max(200, u.def.cost || 1500) * 0.55; let r = 0; for (let i = 1; i < RANKS.length; i++) if (u.xp >= RANKS[i].xp) r = i;
    if (r > u.rank) { u.rank = r; FX.promote && FX.promote(u); if (u.owner === this.local) SND.ui('rankup'); }
  }
  /* --- victory --- */
  checkVictory() {
    for (const p of this.players) {
      if (!p.alive || p.waves) continue; let has = false;
      for (const b of this.blds) if (b.owner === p.id && !b.dead && b.type !== 'wall') { has = true; break; }
      if (!has) for (const u of this.units) if (u.owner === p.id && !u.dead && !u.def.harvest && !u.def.nosel) { has = true; break; }
      if (!has) { p.alive = false; this.notify(this.local, (p.id === this.local ? 'لقد هُزمت' : 'تم القضاء على ' + p.name), p.id === this.local ? 'bad' : 'good'); }
    }
    if (this.spectate) return; // spectate = test/observer runs
    const me = this.me; if (!me.alive && !this.over) { this.over = true; this.winner = -1; UI.gameOver && UI.gameOver(false); return; }
    const teams = new Set(); for (const p of this.players) if (p.alive) teams.add(p.team);
    if (teams.size <= 1 && !this.over) { this.over = true; this.winner = me.team; UI.gameOver && UI.gameOver(me.alive); }
  }
}
