/* ============================================================
   War of Power — الذكاء الاصطناعي للخصوم
   الملف: js/game/ai.js   ·   ترتيب التحميل: 25 من 43
   ============================================================ */
'use strict';
/* ===== AI opponents: economy, land army and air assaults ===== */
// Difficulty never changes the rules: every AI starts exactly like the player (one engineering vehicle, the same money, no bonus income,
// no faster building or training, no extra elite units). Levels differ only in how well the AI plays:
// how fast it decides, how efficient its economy is, whether it counters your army, when and how hard it attacks.
let AI_POP_SOFT = 260; // lowered to 150 in the weak-device mode
const AI_LEVELS = [
  { n: 'سهل', d: 'بطيء جداً، اقتصاد ضعيف، لا دفاعات ولا أبحاث، ويهاجم متأخراً بموجات صغيرة.', period: 4.0, wave: 0.45, first: 720, gap: 240, maxDefs: 0, powers: false, trucks: 1, dozers: 1, research: 0, counter: 0, queue: 1, reserve: 2500, retreat: 0, defendR: 14, harass: 0, incK: 0.75, upg: 0, aa: 0 },
  { n: 'متوسط', d: 'اقتصاد متوازن وهجمات منتظمة، يرقّي مقره مرة ويستخدم العمليات والأبحاث.', period: 1.8, wave: 0.8, first: 360, gap: 110, maxDefs: 3, powers: true, trucks: 2, dozers: 2, research: 1, counter: 0.5, queue: 2, reserve: 900, retreat: 0, defendR: 24, harass: 0, incK: 1, upg: 1, aa: 0 },
  { n: 'صعب', d: 'سريع القرار، يختار الوحدات المضادة لجيشك، يرقّي مصانعه ويركّب دفاعاً جوياً.', period: 0.9, wave: 1.05, first: 220, gap: 60, maxDefs: 5, powers: true, trucks: 3, dozers: 3, research: 2, counter: 1.0, queue: 3, reserve: 350, retreat: 1, defendR: 30, harass: 0, incK: 1.1, upg: 2, aa: 1 },
  { n: 'وحشي', d: 'أقصى سرعة واقتصاد مضاعف، ضغط مبكر متواصل، ترقيات كاملة وغارات على شاحناتك.', period: 0.45, wave: 1.3, first: 150, gap: 34, maxDefs: 8, powers: true, trucks: 3, dozers: 4, research: 3, counter: 1.35, queue: 5, reserve: 100, retreat: 1, defendR: 36, harass: 1, incK: 1.3, upg: 2, aa: 2 },
  { n: 'متكيف', d: 'يقيس قوتك كل نصف دقيقة ويرفع مستواه أو يخفضه ليبقى القتال متكافئاً.', adapt: 1, period: 1.8, wave: 0.8, first: 300, gap: 110, maxDefs: 3, powers: true, trucks: 2, dozers: 2, research: 1, counter: 0.5, queue: 2, reserve: 900, retreat: 0, defendR: 24, harass: 0, incK: 1, upg: 1, aa: 0 },
];
const BUILD_ORDER = ['power', 'mine', 'barracks', 'partsdep', 'supply', 'factory', 'mine', 'mg', 'supply', 'partsdep', 'ops', 'radar', 'airfield', 'atg', 'sam', 'shorad', 'factory', 'mg', 'atg', 'super', 'barracks', 'sam', 'atg', 'airfield'];
const AI_DEFS = ['mg', 'atg', 'sam', 'shorad'];
const RICH_ORDER = ['factory', 'mg', 'atg', 'sam', 'shorad', 'barracks', 'factory', 'atg', 'sam', 'mg', 'airfield', 'atg', 'shorad', 'sam']; // spent only with a large surplus
function findPlacement(G, pid, type, cx, cy, maxR, spacing) {
  const d = BLD[type]; const m = G.map; const tx0 = Math.floor(cx / TILE - d.w / 2), ty0 = Math.floor(cy / TILE - d.h / 2); spacing = spacing === undefined ? 1 : spacing;
  const ok = (tx, ty) => {
    if (!G.canPlace(type, tx, ty, pid, true)) return false;
    for (let y = ty - spacing; y < ty + d.h + spacing; y++) for (let x = tx - spacing; x < tx + d.w + spacing; x++) { if (!m.inb(x, y)) return false; if (m.bldAt[y * m.w + x]) return false; }
    return true;
  };
  for (let r = 0; r <= (maxR || 24); r++) {
    const cand = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; cand.push([tx0 + dx, ty0 + dy]); }
    shuffle(cand, rnd); for (const [tx, ty] of cand) if (ok(tx, ty)) return [tx, ty];
  }
  return null;
}
class AIBrain {
  constructor(G, pid, lv) {
    this.pid = pid; this.L = AI_LEVELS[clamp(lv, 0, AI_LEVELS.length - 1)]; this.lv = this.L.adapt ? 1 : lv; this.adapt = !!this.L.adapt; this.alv = 1; this.adT = 60; this.t = rnd() * 2; this.next = 0; this.step = 0; this.wave = 0;
    this.attack = null; this.lastAttack = -60 - rnd() * 40; this.defending = 0; this.expT = 0; this.jetT = 0; this.powT = 10; this.capT = 5; this.navT = 20; this.invT = 90; this.heliT = 120; this.specT = 300;
    const pl = G.players[pid]; pl.incK = this.L.incK || 1; pl.ai = this; // easy earns less, hard/brutal earn more
    this.firstWaveT = this.L.first * (0.9 + rnd() * 0.2);
    this.inv = null;
  }
  get base() { return this._base; }
  update(G, dt) {
    this.t += dt; if (this.t < this.next) return; this.next = this.t + this.L.period;
    const pl = G.players[this.pid]; if (!pl.alive) return;
    const hq = G.blds.find(b => b.owner === this.pid && b.type === 'hq' && !b.dead) || G.blds.find(b => b.owner === this.pid && !b.dead && b.type !== 'wall' && b.type !== 'derrick');
    this._base = hq ? [hq.x, hq.y] : (pl.start ? [pl.start.x, pl.start.y] : null); if (!this._base) return;
    if (this.adapt) this.adjust(G, pl, dt);
    try { this.economy(G, pl, hq); this.military(G, pl); if (this.L.powers) this.powers(G, pl); this.research(G, pl); this.specials(G, pl); } catch (e) { console.error('AI', e); }
  }
  // adaptive: compare strength every 30 s and slide between easy … brutal
  adjust(G, pl) {
    this.adT -= this.L.period; if (this.adT > 0) return; this.adT = 30;
    const power = pid => { let s = G.players[pid].money * 0.25; for (const u of G.units) if (u.owner === pid && !u.dead) s += u.def.cost || 0; for (const b of G.blds) if (b.owner === pid && !b.dead && b.built >= 1) s += 300 * Levels.lv(b); return s; };
    let foe = 0, n = 0; for (const p of G.players) if (p.alive && G.enemies(this.pid, p.id)) { foe += power(p.id); n++; } if (!n) return;
    const r = (foe / n) / Math.max(1, power(this.pid));
    this.alv = clamp(this.alv + (r > 1.35 ? 0.5 : r < 0.75 ? -0.5 : 0), 0, 3); const k = Math.round(this.alv);
    const base = AI_LEVELS[k]; this.L = Object.assign({}, base, { adapt: 1, n: AI_LEVELS[4].n }); this.lv = k; pl.incK = base.incK || 1;
  }
  mine(G, f) { return G.units.filter(u => u.owner === this.pid && !u.dead && !u.dying && !u.def.nosel && (!f || f(u))); }
  // can our ground forces walk to the enemy?
  landLinked(G, en) { const m = G.map, c = m.comp; if (!c || !en) return true; const a = c[clamp(Math.floor(this._base[1] / TILE) + 3, 0, m.h - 1) * m.w + Math.floor(this._base[0] / TILE)], b = c[clamp(Math.floor(en[1] / TILE) + 3, 0, m.h - 1) * m.w + Math.floor(en[0] / TILE)]; return a < 0 || b < 0 || a === b; }
  economy(G, pl, hq) {
    const pid = this.pid;
    const machines = this.mine(G, u => u.def.work); const dozers = machines.filter(u => u.def.role === 'eng');
    const hqQ = G.blds.filter(b => b.owner === pid && b.type === 'hq' && b.built >= 1).reduce((s, b) => s + b.q.length, 0);
    const wantDoz = this.L.dozers + (G.t > 240 && pl.money > 9000 ? 1 : 0);
    if (hq && hq.built >= 1 && dozers.length + hqQ < wantDoz && pl.money > 1000) Build.queue(G, pid, pl.f + '_eng');
    // building upgrades and self air-defence
    if (this.L.upg && G.t > 200) { this.lvT = (this.lvT || 10) - this.L.period; if (this.lvT <= 0) { this.lvT = 18;
      const cand = G.blds.filter(b => b.owner === pid && !b.dead && b.built >= 1 && Levels.upgradable(b) && !b.upg && Levels.lv(b) <= this.L.upg).sort((a, b) => Levels.lv(a) - Levels.lv(b) || (b.type === 'hq') - (a.type === 'hq'));
      const b = cand[0]; if (b && pl.money > Levels.upCost(b) + 2500) Levels.start(G, pid, b); } }
    if (this.L.aa && G.t > 240) { this.aaT = (this.aaT || 15) - this.L.period; if (this.aaT <= 0) { this.aaT = 25;
      const air = G.units.some(u => !u.dead && G.enemies(pid, u.owner) && u.def.cls === 'air');
      if (air || this.L.aa > 1) { const b = G.blds.filter(x => x.owner === pid && Levels.canAA(G, pid, x).ok).sort((a, c) => (c.type === 'hq') - (a.type === 'hq'))[0]; if (b && pl.money > Levels.aaCost(b) + 2000) Levels.buyAA(G, pid, b); } } }
    // idle machines -> unfinished sites
    for (const u of machines) if (u.order.t === 'idle' && !u.goal) Build.autoAssign(G, u);
    const sites = G.blds.filter(b => b.owner === pid && b.built < 1 && !b.dead);
    if (sites.length >= (this.lv >= 2 ? 2 : 1) + (pl.money > 9000 ? 1 : 0) + (pl.money > 16000 ? 1 : 0) || !dozers.length) return;
    // choose next structure
    const en = this.nearestEnemyBase(G);
    let want = null;
    if (pl.puse + 3 > pl.pprod && G.count(pid, 'power') < 14 && !G.blds.some(b => b.owner === pid && b.type === 'power' && b.built < 1)) want = 'power';
    if (!want) {
      const base = BUILD_ORDER; const order = pl.money > 9000 && this.lv >= 1 ? base.concat(RICH_ORDER) : base;
      const defs = AI_DEFS.reduce((n, t) => n + G.count(pid, t), 0), defCap = this.L.maxDefs + (G.t > 600 ? 2 : 0) + (pl.money > 12000 ? 2 : 0);
      const counts = {}; for (let i = 0; i < order.length; i++) { const t = order[i]; counts[t] = (counts[t] || 0) + 1; if (G.count(pid, t) < counts[t]) {
        if (AI_DEFS.includes(t) && defs >= defCap) continue;
        if ((t === 'radar' || t === 'shorad') && this.lv < 1) continue;
        if (t === 'mine' && !this.oreSpot(G)) continue;
        const av = Build.buildAvailable(G, pid, t); if (av.ok) { want = t; break; } else continue; } }
    }
    // expansion: supply center near untouched depots
    if (!want || want === 'super') {
      const centers = G.blds.filter(b => b.owner === pid && b.type === 'supply'); const deps = G.blds.filter(b => b.type === 'depot' && b.res > 3000);
      const near = d => centers.some(c => Math.hypot(c.x - d.x, c.y - d.y) < 14 * TILE);
      const cp = G.map.comp, myC = cp ? cp[clamp(Math.floor(this._base[1] / TILE) + 3, 0, G.map.h - 1) * G.map.w + Math.floor(this._base[0] / TILE)] : -1;
      const reach = d => { if (!cp || myC < 0) return true; const c = cp[clamp(Math.floor(d.y / TILE) + 2, 0, G.map.h - 1) * G.map.w + Math.floor(d.x / TILE)]; return c < 0 || c === myC; };
      const free = deps.filter(d => !near(d) && reach(d)).sort((a, b) => dist2(a.x, a.y, this._base[0], this._base[1]) - dist2(b.x, b.y, this._base[0], this._base[1]))[0];
      const baseDeps = deps.filter(d => near(d)).reduce((s, d) => s + d.res, 0);
      if (free && (baseDeps < 15000 || centers.length < 2) && Math.hypot(free.x - this._base[0], free.y - this._base[1]) < 60 * TILE && pl.money > 1800) {
        const spot = findPlacement(G, pid, 'supply', free.x + Math.sign(this._base[0] - free.x) * 4 * TILE, free.y + Math.sign(this._base[1] - free.y) * 3 * TILE, 8);
        if (spot) { Build.place(G, pid, 'supply', spot[0], spot[1]); return; }
      }
    }
    if (!want) return;
    const c = Build.bcost(G, pid, want); if (pl.money < c + (want === 'super' ? 500 : 100)) return;
    let cx = this._base[0], cy = this._base[1];
    if (want === 'mine') { const o = this.oreSpot(G); if (o) Build.place(G, pid, 'mine', o.tx, o.ty); return; }
    if ((want === 'mg' || want === 'atg' || want === 'sam') && en) { const a = Math.atan2(en[1] - cy, en[0] - cx); const dd = (want === 'sam' ? 6 : 10) * TILE; cx += Math.cos(a) * dd + (rnd() - 0.5) * 6 * TILE; cy += Math.sin(a) * dd + (rnd() - 0.5) * 6 * TILE; }
    if (want === 'supply') { const dep = G.blds.filter(b => b.type === 'depot' && b.res > 2000).sort((a, b) => dist2(a.x, a.y, cx, cy) - dist2(b.x, b.y, cx, cy))[0]; if (dep) { cx = lerp(cx, dep.x, 0.6); cy = lerp(cy, dep.y, 0.6); } }
    if (want === 'shorad' && en) { const a = Math.atan2(en[1] - cy, en[0] - cx); cx += Math.cos(a) * 5 * TILE; cy += Math.sin(a) * 5 * TILE; }
    const spot = findPlacement(G, pid, want, cx, cy, 26, want === 'mg' || want === 'atg' ? 0 : 1);
    if (spot) Build.place(G, pid, want, spot[0], spot[1]);
  }
  oreSpot(G) { let best = null, bd = 1e18; const [bx, by] = this._base; for (const o of G.map.ore) { if (!G.oreSpot(o.tx, o.ty)) continue; const x = (o.tx + 1) * TILE, y = (o.ty + 1) * TILE; const d = (x - bx) ** 2 + (y - by) ** 2; if (d > (50 * TILE) ** 2 || !this.landLinked(G, [x, y])) continue; if (G.units.some(u => !u.dead && G.enemies(this.pid, u.owner) && u.def.w && u.def.w.length && Math.hypot(u.x - x, u.y - y) < 260)) continue; if (d < bd) { bd = d; best = o; } } return best; }
  nearestEnemyBase(G) {
    let best = null, bd = 1e18;
    for (const b of G.blds) { if (b.dead || b.owner < 0 || !G.enemies(this.pid, b.owner) || b.type === 'wall') continue; const pr = b.type === 'hq' ? 0.7 : b.type === 'derrick' ? 1.4 : 1; const d = dist2(b.x, b.y, this._base[0], this._base[1]) * pr; if (d < bd) { bd = d; best = b; } }
    return best ? [best.x, best.y, best] : null;
  }
  enemyMix(G) { let inf = 0, veh = 0, air = 0; for (const u of G.units) { if (!G.enemies(this.pid, u.owner) || u.dead) continue; const c = u.def.cost; if (u.def.cls === 'inf') inf += c; else if (u.def.cls === 'air') air += c; else if (!u.def.work && u.def.role !== 'supply') veh += c; } return { inf, veh, air }; }
  military(G, pl) {
    const pid = this.pid, f = pl.f;
    // trucks
    const centers = G.blds.filter(b => b.owner === pid && b.type === 'supply' && b.built >= 1);
    const trucks = this.mine(G, u => u.def.harvest); const tq = G.blds.filter(b => b.owner === pid && b.type === 'supply').reduce((s, b) => s + b.q.length, 0);
    if (centers.length && trucks.length + tq < centers.length * this.L.trucks && pl.money > 700) Build.queue(G, pid, f + '_supply');
    // production
    const en = this.nearestEnemyBase(G);
    const mix = this.enemyMix(G); const tot = mix.inf + mix.veh + mix.air + mix.sea + 1;
    const army = this.mine(G, u => !u.def.work && !u.def.harvest && u.order.t !== 'capture' && u.order.t !== 'board');
    const reserve = this.L.reserve; const C = this.L.counter; // C: how strongly production answers what the enemy fields
    const vk = mix.veh / tot, ik = mix.inf / tot, ak = mix.air / tot;
    const weights = { rifle: 1.2 + C * ik, at: 0.8 + C * 2.2 * vk, sniper: 0.3 + C * ik, spec: 0.18 + C * 0.3 * ik, scout: 0.5, ifv: 1.2, mbt: 2.0 + C * vk, tank2: 1.2, arty: 0.6, mlrs: 0.5, aa: 0.25 + C * 3 * ak, heli: 0.8, jet: 0.5, drone: 0.4, aainf: 0.15 + C * 2 * ak, mortar: 0.35, medic: 0.25, heli2: 0.05, fpv: 0.6 + C * vk,
      sam2: this.lv >= 1 ? 0.1 + C * 2.2 * ak : 0, jav: 0.25 + C * 1.6 * vk };
    for (const kind of ['barracks', 'factory', 'airfield']) {
      for (const b of Build.producers(G, pid, kind)) { if (pl.pop >= AI_POP_SOFT) break; // the player has no limit; the computer stops at a soft ceiling for smoothness
        if (b.q.length >= this.L.queue + (pl.money > 12000 ? 1 : 0)) continue; if (pl.money < reserve) continue;
        const opts = COMBAT_ROLES.filter(r => UNITS[f + '_' + r] && UNITS[f + '_' + r].build === kind && Build.unitAvailable(G, pid, f + '_' + r).ok && UNITS[f + '_' + r].cost <= pl.money - reserve * 0.5);
        if (!opts.length) continue; let sum = 0; for (const r of opts) sum += weights[r] === undefined ? 0.5 : weights[r]; if (sum <= 0) continue; let x = rnd() * sum, pick = opts[0]; for (const r of opts) { x -= weights[r] === undefined ? 0.5 : weights[r]; if (x <= 0) { pick = r; break; } }
        Build.queue(G, pid, f + '_' + pick);
      }
    }
    // capture cities with infantry
    this.capT = (this.capT || 6) - this.L.period;
    if (this.capT <= 0 && this.lv >= 0) { this.capT = 10; const busy = new Set(G.units.filter(u => u.owner === pid && u.order.t === 'capture').map(u => u.order.tid));
      const cities = G.blds.filter(b => b.type === 'city' && !b.dead && b.owner !== pid && (b.owner < 0 || G.enemies(pid, b.owner)) && !busy.has(b.id) && Math.hypot(b.x - this._base[0], b.y - this._base[1]) < 60 * TILE && this.landLinked(G, [b.x, b.y])).sort((a, b) => dist2(a.x, a.y, this._base[0], this._base[1]) - dist2(b.x, b.y, this._base[0], this._base[1]));
      const inf = this.mine(G, u => u.def.cls === 'inf' && u.order.t !== 'capture' && u.order.t !== 'board' && !(this.attack && this.attack.ids.has(u.id)));
      for (const c of cities.slice(0, 1 + (this.lv >= 2 ? 1 : 0))) { const grp = inf.splice(0, 2); if (!grp.length) break; for (const u of grp) Units.order(G, u, { t: 'capture', tid: c.id }); } }
    // army control
    if (!en) return;
    const stage = [lerp(this._base[0], en[0], 0.16), lerp(this._base[1], en[1], 0.16)];
    const value = army.reduce((s, u) => s + u.def.cost * (u.hp / u.maxHp), 0);
    // defense
    if (G.t - pl.lastAttackT < 6 && pl.lastAttackX !== undefined && Math.hypot(pl.lastAttackX - this._base[0], pl.lastAttackY - this._base[1]) < 22 * TILE) {
      if (!this.defending || G.t - this.defending > 5) { this.defending = G.t; const R = this.L.defendR * TILE; const def = army.filter(u => (!this.attack || !this.attack.ids.has(u.id) || Math.hypot(u.x - this._base[0], u.y - this._base[1]) < 30 * TILE) && Math.hypot(u.x - this._base[0], u.y - this._base[1]) < R); Units.issue(G, def, { t: 'amove', x: pl.lastAttackX, y: pl.lastAttackY }); }
      return;
    }
    // hard / brutal: pull badly damaged vehicles out of the fight to the repair shop
    if (this.L.retreat) { const rep = G.blds.find(b => b.owner === pid && b.type === 'repair' && b.built >= 1 && !b.dead); for (const u of army) if (u.def.cls === 'veh' && u.hp < u.maxHp * 0.3 && u.order.t !== 'move' && Math.hypot(u.x - this._base[0], u.y - this._base[1]) > 16 * TILE) { const tx = rep ? rep.x + 40 : this._base[0], ty = rep ? rep.y + 50 : this._base[1] + 60; Units.order(G, u, { t: 'move', x: tx + (rnd() - 0.5) * 60, y: ty + (rnd() - 0.5) * 60 }); if (this.attack) this.attack.ids.delete(u.id); } }
    // brutal: fast raids on supply trucks and oil wells
    if (this.L.harass && G.t > this.firstWaveT * 0.8) { this.harT = (this.harT || 60) - this.L.period; if (this.harT <= 0) { this.harT = 75 + rnd() * 40; const raiders = army.filter(u => (u.def.role === 'scout' || u.def.role === 'tank2' && u.def.mob === 'wheel' || u.def.role === 'heli') && u.order.t === 'idle' && !(this.attack && this.attack.ids.has(u.id))).slice(0, 4);
      let tg = null, bd = 1e18; for (const v of G.units) { if (v.dead || !G.enemies(pid, v.owner) || !v.def.harvest || Combat.hidden(G, v, pid)) continue; const d = dist2(v.x, v.y, this._base[0], this._base[1]); if (d < bd) { bd = d; tg = v; } }
      if (tg && raiders.length >= 2) Units.issue(G, raiders, { t: 'amove', x: tg.x, y: tg.y }); } }
    if (this.attack) {
      const A = this.attack; const live = army.filter(u => A.ids.has(u.id)); const lv = live.reduce((s, u) => s + u.def.cost * (u.hp / u.maxHp), 0);
      const tgt = G.get(A.tid);
      if (!Combat.alive(tgt) || tgt.owner < 0 || !G.enemies(pid, tgt.owner)) { const n = this.nearestEnemyBase(G); if (n) { A.tid = n[2].id; A.x = n[0]; A.y = n[1]; Units.issue(G, live, { t: 'amove', x: A.x, y: A.y }); } else this.attack = null; }
      else if (lv < A.v0 * 0.28 && this.lv < 3) { Units.issue(G, live, { t: 'move', x: stage[0], y: stage[1] }); this.attack = null; this.lastAttack = G.t; }
      else {
        // reinforce & re-issue to idle members
        const fresh = army.filter(u => !A.ids.has(u.id) && Math.hypot(u.x - stage[0], u.y - stage[1]) < 14 * TILE); if (fresh.length >= 3) { for (const u of fresh) A.ids.add(u.id); Units.issue(G, fresh, { t: 'amove', x: A.x, y: A.y }); }
        for (const u of live) if (u.order.t === 'idle' && !u.goal && !u.tid && u.def.fly !== 'jet') Units.order(G, u, { t: 'amove', x: A.x + (rnd() - 0.5) * 120, y: A.y + (rnd() - 0.5) * 120 });
      }
    } else {
      // gather at staging point
      for (const u of army) if ((u.order.t === 'idle') && !u.goal && !u.tid && u.def.fly !== 'jet' && Math.hypot(u.x - stage[0], u.y - stage[1]) > 8 * TILE) Units.order(G, u, { t: 'move', x: stage[0] + (rnd() - 0.5) * 6 * TILE, y: stage[1] + (rnd() - 0.5) * 6 * TILE });
      const need = (2600 + this.wave * 1300) * this.L.wave;
      if (G.t > this.firstWaveT && (value >= need || (G.t - this.lastAttack > 300 && value > need * 0.5)) && G.t - this.lastAttack > this.L.gap) {
        const grp = army.filter(u => u.def.fly !== 'jet' && Math.hypot(u.x - this._base[0], u.y - this._base[1]) < 40 * TILE);
        if (grp.length >= 4) { this.wave++; this.lastAttack = G.t; this.attack = { tid: en[2].id, x: en[0], y: en[1], ids: new Set(grp.map(u => u.id)), v0: value }; Units.issue(G, grp, { t: 'amove', x: en[0], y: en[1] }); }
      }
    }
    // jets: strike high value targets
    this.jetT -= this.L.period;
    if (this.jetT <= 0) { this.jetT = 14; const jets = this.mine(G, u => u.def.fly === 'jet' && (u.state === 'park' || u.order.t === 'idle')); if (jets.length) { const tg = this.pickStrikeTarget(G); if (tg) for (const j of jets) Units.order(G, j, { t: 'attack', tid: tg.id }); } }
    // helicopter assault: transport helicopters ferry riflemen behind the lines
    this.heliT -= this.L.period;
    if (this.heliT <= 0 && this.lv >= 1) { this.heliT = 80; const hs = this.mine(G, u => u.def.role === 'heli2' && u.order.t === 'idle' && !u.goal); for (const h of hs) { if (h.load.length >= 4) { const t = this.pickLanding(G, en); if (t) Units.order(G, h, { t: 'unload', x: t[0], y: t[1] }); } else { const inf = army.filter(u => u.def.cls === 'inf' && u.order.t === 'idle' && Math.hypot(u.x - h.x, u.y - h.y) < 30 * TILE).slice(0, 8 - h.load.length); for (const u of inf) Units.order(G, u, { t: 'board', tid: h.id }); } } }
  }
  pickLanding(G, en) { // shore tile on the enemy coast facing us, a little away from their defences
    if (!en) return null; const m = G.map; const ex = Math.floor(en[0] / TILE), ey = Math.floor(en[1] / TILE); const a = Math.atan2(this._base[1] - en[1], this._base[0] - en[0]); let best = null, bs = -1e9;
    for (let r = 8; r < 46; r += 2) for (let k = -6; k <= 6; k++) { const aa = a + k * 0.16; const x = Math.round(ex + Math.cos(aa) * r), y = Math.round(ey + Math.sin(aa) * r); if (!m.inb(x, y)) continue; const i = y * m.w + x; if (m.pass[i] & (PASS.VEH | PASS.BLD)) continue; let shore = false; for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (m.inb(x + dx, y + dy) && (m.pass[(y + dy) * m.w + x + dx] & PASS.WATER)) shore = true; if (!shore) continue; const s = -Math.abs(r - 18) - Math.abs(k) * 1.5; if (s > bs) { bs = s; best = [(x + 0.5) * TILE, (y + 0.5) * TILE]; } }
    return best;
  }
  pickStrikeTarget(G) {
    let best = null, bs = 0;
    for (const u of G.units) { if (u.dead || !G.enemies(this.pid, u.owner) || u.def.cls === 'air' || Combat.hidden(G, u, this.pid)) continue; const s = (u.def.role === 'arty' || u.def.role === 'mlrs' ? 3 : u.def.role === 'supply' ? 2.2 : u.def.role === 'mbt' || u.def.role === 'tank2' ? 1.6 : u.def.cls === 'sea' ? 1.8 : 0.6) * u.def.cost; if (s > bs) { bs = s; best = u; } }
    if (!best) for (const b of G.blds) { if (b.dead || b.owner < 0 || !G.enemies(this.pid, b.owner)) continue; const s = b.type === 'power' ? 3 : b.type === 'factory' ? 2.5 : 1; if (s > bs) { bs = s; best = b; } }
    return best;
  }
  enemyCluster(G, r) { let best = null, bs = 0; const list = G.units.filter(u => !u.dead && G.enemies(this.pid, u.owner) && u.def.cls !== 'air' && !Combat.hidden(G, u, this.pid)); for (let i = 0; i < list.length; i += Math.max(1, Math.floor(list.length / 40))) { const c = list[i]; let s = 0; for (const v of list) if (Math.abs(v.x - c.x) < r && Math.abs(v.y - c.y) < r) s += v.def.cost; if (s > bs) { bs = s; best = c; } } return best ? { x: best.x, y: best.y, v: bs } : null; }
  powers(G, pl) {
    this.powT -= this.L.period; if (this.powT > 0) return; this.powT = 6;
    const pid = this.pid;
    if (pl.superReady) { const en = this.nearestEnemyBase(G); const cl = this.enemyCluster(G, 200); const tgt = en ? { x: en[0], y: en[1] } : cl; if (tgt) Build.launchSuper(G, pid, tgt.x, tgt.y); }
    for (const P of POWERS) {
      if (!Build.powerReady(G, pid, P.id)) continue;
      if (P.id === 'strike' || P.id === 'barrage') { const cl = this.enemyCluster(G, 140); if (cl && cl.v > 2500) { Build.usePower(G, pid, P.id, cl.x, cl.y); return; } }
      else if (P.id === 'recon') { const en = this.nearestEnemyBase(G); if (en) { Build.usePower(G, pid, P.id, en[0], en[1]); return; } }
      else if (P.id === 'nuke' || P.id === 'drones') { const en = this.nearestEnemyBase(G); const cl = this.enemyCluster(G, 200); const tgt = P.id === 'nuke' && en ? { x: en[0], y: en[1] } : cl || (en && { x: en[0], y: en[1] }); if (tgt) { Build.usePower(G, pid, P.id, tgt.x, tgt.y); return; } }
      else if (P.id === 'spy' && this.attack) { Build.usePower(G, pid, P.id, 0, 0); return; }
      else if ((P.id === 'para' || P.id === 'infil') && this.attack) { Build.usePower(G, pid, P.id, this.attack.x + 80, this.attack.y + 80); return; }
      else if (P.id === 'repair') { const hurt = this.mine(G, u => u.hp < u.maxHp * 0.5 && u.def.cls === 'veh'); if (hurt.length >= 4) { Build.usePower(G, pid, P.id, hurt[0].x, hurt[0].y); return; } }
    }
  }
  research(G, pl) {
    const R = this.L.research; if (pl.research || !R || pl.money < [0, 6000, 4500, 3200][R]) return;
    const tree = techTree(pl.f).slice().sort((a, b) => a.tier - b.tier || a.cost - b.cost);
    for (const t of tree) { if (pl.upg[t.id] || (R === 1 && t.tier > 2)) continue; if (Build.techState(G, this.pid, t.id).ok && pl.money > t.cost + [0, 3000, 2200, 1500][R]) { if (Build.research(G, this.pid, t.id)) return; } }
  }
  specials(G, pl) { // tougher AIs call in their elite cards once the battle is underway
    if (!pl.specials || this.lv < 2) return; this.specT -= this.L.period; if (this.specT > 0) return; this.specT = 140;
    for (const id in pl.specials) if (G.t >= ((pl.specUsed && pl.specUsed[id]) || 0)) { Build.deploySpecial(G, this.pid, id); return; }
  }
}
