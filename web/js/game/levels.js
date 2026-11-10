/* ============================================================
   War of Power — مستويات المباني (المقر والمصانع) والدفاع الجوي الذاتي
   الملف: js/game/levels.js   ·   يُحمَّل بعد buildings.js
   ============================================================ */
'use strict';
/* Every HQ and factory can be upgraded twice (levels 1 → 2 → 3):
   · the building grows, its look changes (corner turrets / armour) and its health rises
   · the HQ gains its own ground guns at level 2 and anti-air missiles at level 3
   · factories unlock stronger unit types and send out veterans (rank = level − 1)
   Any own building can also buy self air-defence; each building level unlocks one more AA tier. */
const LVL_COST = { hq: [3000, 6000], barracks: [900, 1800], factory: [1600, 3200], airfield: [1600, 3200], city: [1500, 3000] };
const LVL_INC = [1, 1.8, 2.8]; // city income by level // price of level 2, level 3
const LVL_TIME = [0, 25, 40];
const LVL_HP = [1, 1.6, 2.4];
const LVL_SCALE = [1, 1.08, 1.16];
const HQ_GUNS = [[], ['def_mg'], ['def_mg', 'def_atgm']];
const AA_TIERS = [
  { n: 'مدفع مضاد للطائرات', w: 'aagun', cost: 600 },
  { n: 'منظومة اعتراض قريب', w: 'cram', cost: 1100 },
  { n: 'صواريخ أرض-جو', w: 'samL', cost: 1800 },
];
// unit roles that need a higher factory level (everything else is available at level 1)
const ROLE_LVL = { spec: 2, sniper: 2, jav: 2, aainf: 2, medic: 2, mortar: 3, mbt: 2, aa: 2, sam2: 3, arty: 3, mlrs: 3, heli2: 2, fpv: 2, jet: 3 };
// what the soldiers and tanks are called at each factory level, per nation
const TIER_N = {
  usa: { rifle: ['جندي مشاة', 'رينجرز', 'قوات دلتا'], mbt: ['', 'M1A2 SEPv3 أبرامز', 'M1E3 أبرامز'] },
  rus: { rifle: ['جندي مشاة', 'مظليون VDV', 'سبيتسناز'], mbt: ['', 'T-90M بروريف', 'T-14 أرماتا'] },
  chn: { rifle: ['جندي مشاة', 'مشاة النخبة', 'قوات التنين'], mbt: ['', 'Type 99A', 'Type 99A2'] },
  eu: { rifle: ['جندي مشاة', 'الفيلق الأجنبي', 'قوات KSK'], mbt: ['', 'ليوبارد 2A7', 'KF51 بانثر'] },
  arb: { rifle: ['جندي مشاة', 'الحرس الوطني', 'قوات الصاعقة'], mbt: ['', 'M1A2S أبرامز', 'M1A2S المطوّرة'] },
};
const Levels = (function () {
  const lv = b => b.lvl || 1;
  const upgradable = b => !!LVL_COST[b.type];
  const aaMax = b => (b.def.cat === 'def' || b.type === 'wall' || b.def.neutral) ? 0 : upgradable(b) ? lv(b) : 1;
  function upCost(b) { const c = LVL_COST[b.type]; return c ? c[lv(b) - 1] : 0; }
  function canUp(G, pid, b) {
    if (!b || b.dead || b.owner !== pid || b.built < 1) return { ok: false, why: '' };
    if (!upgradable(b)) return { ok: false, why: 'لا يمكن ترقية هذا المبنى' };
    if (lv(b) >= 3) return { ok: false, why: 'المستوى الأقصى' };
    if (b.upg) return { ok: false, why: 'الترقية جارية' };
    if (G.players[pid].money < upCost(b)) return { ok: false, why: 'لا يوجد مال كافٍ' };
    return { ok: true };
  }
  function start(G, pid, b) {
    const ok = canUp(G, pid, b); if (!ok.ok) return false;
    G.players[pid].money -= upCost(b); b.upg = { t: 0, T: LVL_TIME[lv(b)] * (G.mode === 'tut' ? 0.5 : 1) };
    return true;
  }
  function tick(G, b, dt) {
    if (!b.upg) return; b.upg.t += dt; if (b.upg.t < b.upg.T) return;
    b.upg = null; b.lvl = lv(b) + 1; apply(G, b);
    FX.dust(b.x, b.y, 6, b.w * 18, [190, 180, 160]);
    if (b.owner === G.local) { G.notify(b.owner, 'اكتملت الترقية: ' + G.bname(b) + ' — المستوى ' + b.lvl, 'good', b.x, b.y); SND.ui('power'); }
  }
  // recompute health and weapons from the level and the bought air-defence tiers
  function apply(G, b) {
    if (!b.baseHp) b.baseHp = b.maxHp;
    const ratio = b.maxHp ? b.hp / b.maxHp : 1; b.maxHp = Math.round(b.baseHp * LVL_HP[lv(b) - 1]); b.hp = Math.max(1, b.maxHp * ratio);
    const pl = G.players[b.owner]; const d = b.def;
    const keys = ((d.wf && pl && d.wf[pl.f]) || d.w_ || []).slice();
    if (b.type === 'hq') keys.push(...HQ_GUNS[lv(b) - 1]);
    for (let i = 0; i < (b.aa || 0); i++) keys.push(AA_TIERS[i].w);
    b.wp = keys.filter(k => WPN[k]).map(k => ({ k, d: WPN[k], cd: 0, burst: 0, bcd: 0, tid: 0, sal: 0, scd: 0, ammo: 0 }));
  }
  function aaCost(b) { const t = AA_TIERS[b.aa || 0]; return t ? t.cost : 0; }
  function canAA(G, pid, b) {
    if (!b || b.dead || b.owner !== pid || b.built < 1) return { ok: false, why: '' };
    const n = b.aa || 0, mx = aaMax(b);
    if (!mx) return { ok: false, why: '' };
    if (n >= AA_TIERS.length) return { ok: false, why: 'أقوى دفاع جوي مركّب' };
    if (n >= mx) return { ok: false, why: 'رقِّ المبنى لفتح المستوى التالي' };
    if (G.players[pid].money < aaCost(b)) return { ok: false, why: 'لا يوجد مال كافٍ' };
    return { ok: true };
  }
  function buyAA(G, pid, b) {
    const ok = canAA(G, pid, b); if (!ok.ok) return false;
    G.players[pid].money -= aaCost(b); b.aa = (b.aa || 0) + 1; apply(G, b);
    if (pid === G.local) G.notify(pid, 'تم تركيب ' + AA_TIERS[b.aa - 1].n + ' على ' + G.bname(b), 'good', b.x, b.y);
    return true;
  }
  // best level among the player's producers of this kind (for unit unlocks)
  function prodLevel(G, pid, kind) { let m = 0; for (const b of G.blds) if (b.owner === pid && b.type === kind && !b.dead && b.built >= 1) m = Math.max(m, lv(b)); return m; }
  function tierName(f, role, L) { const t = TIER_N[f] && TIER_N[f][role]; return t && t[L - 1] ? t[L - 1] : ''; }
  return { lv, upgradable, aaMax, upCost, canUp, start, tick, apply, aaCost, canAA, buyAA, prodLevel, tierName };
})();
