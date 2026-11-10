/* ============================================================
   War of Power — الاقتصاد: العملات والجواهر والأوسمة والقصاصات، كتالوج المتجر وندرته، الملكية، المكافآت والمهام
   الملف: js/ui/economy.js   ·   يُحمَّل بعد profile.js (وقبل menus.js)
   ============================================================ */
'use strict';
/* Four currencies, earned only by playing (no real-money purchases):
   · عملات (coins)   c — battles, missions, daily login, the wheel → common and rare items
   · أوسمة (medals)  m — achievements, rank rewards, weekly missions, the wheel → gold items, extra wheel spins
   · جواهر (gems)    g — login, missions, achievements, hard victories → spent inside a battle: promote soldiers, finish construction
   · قصاصات (shards) s — only from hard feats → legendary items
     (a win on «وحشي», hard missions, 7 login days in a row, 10 wins in a row on easy / 5 on medium / 3 on hard)
   The balance is shown only in the shop and on the commander screen; a battle shows gems on its gem buttons only.
   Everything lives in Profile.eco (saved with the profile, wiped by «مسح كل التقدّم»). */
const RARITY = {
  c: { n: 'شائع', col: '#b5c08f' },
  r: { n: 'نادر', col: '#4ea3ff' },
  g: { n: 'ذهبي', col: '#ffc531' },
  l: { n: 'أسطوري', col: '#c46bff' },
};
const RAR_ORDER = ['c', 'r', 'g', 'l'];
const CUR_N = { c: 'عملات', m: 'أوسمة', g: 'جواهر', s: 'قصاصات' };
/* shop catalogue — r: rarity · p: price in coins · m: price in medals · s: price in legendary shards
   an item with no price is owned from the start (deliberately expensive: buying everything takes a long time)
   map → MAPS (js/map/map.js) · nat → FACTIONS · camo → CAMO_OPTS / CAMO (painter.js) · troop → fantasy roles (js/data/units_fx.js) */
const SHOP_CAT = {
  map: { forest: { r: 'c' }, dunes: { r: 'c' }, winter: { r: 'c', p: 1500 },
    oasis: { r: 'r', p: 5000 }, pass: { r: 'r', p: 6000 }, steppe: { r: 'r', p: 7000 }, tundra: { r: 'r', p: 8000 },
    wide: { r: 'g', m: 90 }, canyon: { r: 'g', m: 110 }, frontier: { r: 'g', m: 130 },
    giant: { r: 'l', s: 15 }, vast: { r: 'l', s: 20 }, lava: { r: 'l', s: 18 } },
  nat: { usa: { r: 'c' }, arb: { r: 'c' }, rus: { r: 'r', p: 8000 }, eu: { r: 'g', m: 150 }, chn: { r: 'l', s: 25 } },
  camo: { '': { r: 'c' }, od: { r: 'c', p: 1200 }, usa: { r: 'c', p: 1500 }, arb: { r: 'c', p: 1500 }, rus: { r: 'c', p: 1800 }, eu: { r: 'c', p: 2000 },
    chn: { r: 'r', p: 4500 }, urban: { r: 'r', p: 5000 }, winter: { r: 'r', p: 5500 }, fleck: { r: 'r', p: 6000 }, split: { r: 'r', p: 6500 }, navy: { r: 'r', p: 7000 }, jtiger: { r: 'r', p: 7500 },
    carbon: { r: 'g', m: 70 }, bronze: { r: 'g', m: 80 }, silver: { r: 'g', m: 100 }, gold: { r: 'g', m: 120 },
    tiger: { r: 'l', s: 10 }, dragon: { r: 'l', s: 14 }, lava: { r: 'l', s: 18 }, galaxy: { r: 'l', s: 22 } },
  troop: { fxbike: { r: 'c', p: 5000 }, fxexo: { r: 'c', p: 6000 }, fxhover: { r: 'r', p: 12000 }, fxtesla: { r: 'g', m: 140 }, fxspider: { r: 'g', m: 160 }, fxtitan: { r: 'l', s: 30 }, fxufo: { r: 'l', s: 35 } },
};
const KIND_N = { map: 'خريطة', nat: 'دولة', camo: 'تمويه', troop: 'قوات' };
const START_WALLET = { c: 1000, m: 10, g: 10, s: 0 }; // welcome gift (also for players who had a profile before the shop existed)
/* ---------- missions: 3 daily + 3 weekly, drawn the same for everyone from the date ----------
   k = what counts after a battle: win · play · kills · bkills (buildings) · air · built · units · waves · hardwin · brutalwin · fastwin · daily
   «hard» missions (k hardwin / brutalwin) pay legendary shards */
const MISSIONS = {
  d: [
    { id: 'win1', n: 'انتصر في معركة', t: 1, k: 'win', rw: { c: 200 } },
    { id: 'play3', n: 'خض 3 معارك', t: 3, k: 'play', rw: { c: 150, g: 2 } },
    { id: 'kill60', n: 'دمّر 60 وحدة معادية', t: 60, k: 'kills', rw: { c: 200 } },
    { id: 'bld5', n: 'دمّر 5 مبانٍ معادية', t: 5, k: 'bkills', rw: { c: 200, g: 1 } },
    { id: 'air5', n: 'أسقط 5 طائرات معادية', t: 5, k: 'air', rw: { c: 250 } },
    { id: 'build15', n: 'ابنِ 15 مبنى', t: 15, k: 'built', rw: { c: 150, g: 2 } },
    { id: 'units40', n: 'جهّز 40 وحدة', t: 40, k: 'units', rw: { c: 150, g: 2 } },
    { id: 'wave5', n: 'اصمد 5 موجات في طور الصمود', t: 5, k: 'waves', rw: { c: 250 } },
    { id: 'hard1', n: 'مهمة صعبة: انتصر على ذكاء صعب أو أعلى', t: 1, k: 'hardwin', rw: { c: 300, m: 2, s: 1 } },
    { id: 'fast1', n: 'انتصر في أقل من 15 دقيقة', t: 1, k: 'fastwin', rw: { c: 250, g: 2 } },
    { id: 'daily1', n: 'أنجز التحدي اليومي', t: 1, k: 'daily', rw: { c: 250, m: 2 } },
  ],
  w: [
    { id: 'wwin8', n: 'انتصر في 8 معارك', t: 8, k: 'win', rw: { c: 1200, m: 8, g: 5 } },
    { id: 'wplay12', n: 'خض 12 معركة', t: 12, k: 'play', rw: { c: 800, m: 5, g: 4 } },
    { id: 'wkill400', n: 'دمّر 400 وحدة معادية', t: 400, k: 'kills', rw: { c: 1000, m: 6 } },
    { id: 'wbld30', n: 'دمّر 30 مبنى معادياً', t: 30, k: 'bkills', rw: { c: 1000, m: 6 } },
    { id: 'wair30', n: 'أسقط 30 طائرة معادية', t: 30, k: 'air', rw: { c: 1100, m: 6 } },
    { id: 'wwave20', n: 'اصمد 20 موجة في المجموع', t: 20, k: 'waves', rw: { c: 1000, m: 6, g: 4 } },
    { id: 'whard3', n: 'مهمة صعبة: انتصر 3 مرات على ذكاء صعب أو أعلى', t: 3, k: 'hardwin', rw: { c: 1500, m: 10, s: 3 } },
    { id: 'wbrutal1', n: 'مهمة صعبة: انتصر على الذكاء الوحشي', t: 1, k: 'brutalwin', rw: { c: 2000, m: 12, s: 3 } },
  ],
};
// daily login: a 7-day cycle (a missed day never loses the cycle) + LOGIN_STREAK_S shards for every 7 days in a row
const LOGIN_RW = [{ c: 150 }, { g: 3 }, { c: 250 }, { m: 5 }, { c: 400 }, { g: 5 }, { c: 600, m: 10, g: 5 }];
const LOGIN_STREAK_S = 3;
// win streaks against the computer (a loss resets them): difficulty → [wins in a row, shards]; every win on «وحشي» pays 1 shard
const STREAK_GOAL = { 0: [10, 2], 1: [5, 2], 2: [3, 3] };
const DIFF_N = ['سهل', 'متوسط', 'صعب', 'وحشي'];
// wheel of fortune: one free spin a day, extra spins for WHEEL_COST medals; w = weight (chance)
const WHEEL = [
  { rw: { c: 100 }, w: 22, col: '#7d8c4e' }, { rw: { g: 3 }, w: 14, col: '#1f8a5c' }, { rw: { c: 250 }, w: 20, col: '#a07a34' }, { rw: { camo: 1 }, w: 6, col: '#3f6fb8' },
  { rw: { c: 500 }, w: 12, col: '#6a8a38' }, { rw: { m: 10 }, w: 10, col: '#34589e' }, { rw: { g: 8 }, w: 10, col: '#14704a' }, { rw: { s: 2 }, w: 6, col: '#8b33cc', big: 1 },
];
const WHEEL_COST = 15;
// rewards for every achievement (claimed in «المكافآت ← الإنجازات»)
const ACH_RW = { first_win: { c: 250, g: 3 }, wins10: { c: 600, m: 8, g: 5 }, wins50: { c: 2500, m: 25, s: 3 }, kills100: { c: 300, g: 2 }, kills1000: { c: 1500, m: 15, g: 8 },
  hard_win: { c: 500, m: 8, g: 4 }, brutal_win: { c: 1000, m: 15, s: 2 }, air25: { c: 500, m: 6 }, fast_win: { c: 400, g: 4 }, nolose: { c: 600, m: 8 }, super: { c: 300, g: 3 },
  all_factions: { c: 2000, m: 25, s: 3 }, special: { c: 250, g: 3 }, daily5: { c: 800, m: 8, g: 5 }, survive10: { c: 500, m: 6 }, survive25: { c: 1500, m: 15, s: 1 }, mp_win: { c: 600, m: 8, g: 4 },
  tech_full: { c: 800, m: 8 }, builder: { c: 400, g: 4 }, icpt25: { c: 500, m: 6 },
  shop1: { c: 200, g: 3 }, collector: { c: 1500, m: 15 }, legend: { m: 25, g: 10 }, wheel10: { c: 400, m: 8 }, login7: { c: 600, m: 8, g: 5 }, missions20: { c: 1200, m: 12, s: 1 } };
ACH.push({ id: 'shop1', n: 'أول صفقة', d: 'اشترِ أول عنصر من المتجر.' }, { id: 'collector', n: 'جامع التمويهات', d: 'امتلك 10 تمويهات.' }, { id: 'legend', n: 'أسطورة حيّة', d: 'امتلك عنصراً أسطورياً.' },
  { id: 'wheel10', n: 'ضربة حظ', d: 'أدر عجلة الحظ 10 مرات.' }, { id: 'login7', n: 'جندي منضبط', d: 'سجّل دخولك 7 أيام متتالية.' }, { id: 'missions20', n: 'منفّذ المهام', d: 'أكمل 20 مهمة.' });
// rank rewards: index = PLV level (0 = recruit, nothing to claim) · item = [kind, id] (an item you already own pays its price instead)
const LV_RW = [null, { c: 400 }, { g: 5 }, { item: ['camo', 'od'] }, { c: 1200 }, { item: ['map', 'winter'] }, { m: 20 }, { g: 10 },
  { c: 2500 }, { item: ['nat', 'rus'] }, { m: 40, s: 2 }, { item: ['camo', 'gold'] }, { c: 5000, g: 20 }, { item: ['troop', 'fxhover'] }, { m: 60, s: 5 }];
// shop «الصرافة»: swaps at a loss, each offer only a few times a day (resets at local midnight)
const EXCHANGE = [
  { id: 'c2g', from: { c: 1000 }, to: { g: 5 }, n: 4 }, { id: 'c2m', from: { c: 1500 }, to: { m: 10 }, n: 3 },
  { id: 'm2c', from: { m: 10 }, to: { c: 800 }, n: 5 }, { id: 'm2g', from: { m: 20 }, to: { g: 6 }, n: 3 },
  { id: 'g2c', from: { g: 10 }, to: { c: 1200 }, n: 5 }, { id: 'g2m', from: { g: 15 }, to: { m: 12 }, n: 3 },
  { id: 'g2s', from: { g: 45 }, to: { s: 1 }, n: 1 }, { id: 's2c', from: { s: 1 }, to: { c: 2500 }, n: 2 },
];
// rewards «الإنزال الجوي»: crates bought with a currency (daily limit); amounts [min, max, chance]; item = [rarities, chance] (an item you don't own yet)
const CRATES = [
  { id: 'sup', n: 'صندوق إمداد', d: 'عملات وفرصة لجواهر وأوسمة.', cur: 'c', cost: 600, day: 5, free: 8, rw: { c: [300, 900], g: [1, 3, 0.4], m: [2, 5, 0.3] } },
  { id: 'mil', n: 'صندوق عسكري', d: 'غنيمة أكبر وفرصة لعنصر شائع أو نادر.', cur: 'm', cost: 25, day: 3, rw: { c: [800, 2000], g: [3, 8, 0.7], m: [5, 15, 0.6] }, item: ['cr', 0.18] },
  { id: 'eli', n: 'صندوق النخبة', d: 'جواهر وأوسمة وفرصة لقصاصات وعنصر ذهبي.', cur: 'g', cost: 40, day: 2, rw: { c: [2000, 4500], g: [8, 20, 0.8], m: [15, 30, 0.7], s: [1, 2, 0.3] }, item: ['g', 0.12] },
  { id: 'leg', n: 'صندوق أسطوري', d: 'قصاصات أسطورية مضمونة وفرصة نادرة لعنصر أسطوري.', cur: 'g', cost: 90, day: 1, rw: { c: [3000, 6000], s: [1, 4] }, item: ['l', 0.1] },
];
// in-battle gem prices
const GEM_PROMO = { inf: 1, veh: 2, air: 3 };          // per unit, per rank
const gemRush = (rem, cost) => clamp(Math.ceil(rem * (cost || 800) / 260), 2, 30); // finish a construction now (rem = 0..1 left)
const Eco = (function () {
  const MAP_THEME_N = { desert: 'صحراء', snow: 'ثلوج', temperate: 'غابات', mountain: 'جبال', steppe: 'سهوب', mixed: 'متنوعة', lava: 'براكين' };
  const CAMO_TYPE_N = { blotch: 'بقع', digital: 'رقمي', flecks: 'نقاط', splinter: 'شظايا', tiger: 'خطوط', scales: 'حراشف', carbon: 'منسوج', metal: 'معدني لامع', lava: 'متوهّج', galaxy: 'كوني' };
  const def = () => ({ v: 2, c: START_WALLET.c, m: START_WALLET.m, g: START_WALLET.g, s: START_WALLET.s, own: { map: [], nat: [], camo: [], troop: [] }, eq: '', login: { n: 0, last: '', streak: 0 }, wheel: { last: '', n: 0 }, mis: {}, misDone: 0, ach: {}, lv: {}, earned: { c: 0, m: 0, g: 0, s: 0 }, tut: 0, streak: { 0: 0, 1: 0, 2: 0 } });
  let normFor = null;
  // the economy state, completed with defaults (older saves, new catalogue items owned from the start)
  function st() {
    let E = Profile.eco; if (E && E === normFor) return E;
    if (!E || typeof E !== 'object') E = Profile.eco = def();
    const d = def(); for (const k in d) if (E[k] === undefined || E[k] === null || typeof E[k] !== typeof d[k]) E[k] = d[k];
    if (E.v < 2) { E.v = 2; E.g = Math.max(E.g || 0, START_WALLET.g); } // the gems and shards update
    for (const k in d.earned) if (typeof E.earned[k] !== 'number') E.earned[k] = 0;
    for (const k in d.streak) if (typeof E.streak[k] !== 'number') E.streak[k] = 0;
    if (typeof E.login.streak !== 'number') E.login.streak = 0;
    for (const k in SHOP_CAT) { if (!Array.isArray(E.own[k])) E.own[k] = []; E.own[k] = E.own[k].filter(id => SHOP_CAT[k][id]); for (const id in SHOP_CAT[k]) if (!SHOP_CAT[k][id].p && !SHOP_CAT[k][id].m && !SHOP_CAT[k][id].s && E.own[k].indexOf(id) < 0) E.own[k].push(id); }
    for (const k of ['c', 'm', 'g', 's']) E[k] = Math.max(0, Math.floor(+E[k] || 0));
    normFor = E; return E;
  }
  const save = () => saveProfile();
  const bal = () => { const E = st(); return { c: E.c, m: E.m, g: E.g, s: E.s }; };
  const owns = (k, id) => (st().own[k] || []).indexOf(id || '') >= 0 || (k === 'camo' && !id);
  const firstOwned = k => st().own[k][0];
  function name(k, id) {
    if (k === 'map') { const m = MAPS.find(x => x.id === id); return m ? m.n : id; }
    if (k === 'nat') return FACTIONS[id] ? FACTIONS[id].name : id;
    if (k === 'troop') return typeof FX_INFO !== 'undefined' && FX_INFO[id] ? FX_INFO[id].n : id;
    const o = CAMO_OPTS.find(x => x[0] === id); return o ? (id ? o[1] : 'لون دولتك الأصلي') : id;
  }
  function sub(k, id) {
    if (k === 'map') { const m = MAPS.find(x => x.id === id); if (!m) return ''; return (MAP_THEME_N[m.theme] || '') + ' · حتى ' + m.max + ' لاعبين'; }
    if (k === 'nat') return FACTIONS[id] ? FACTIONS[id].theme : '';
    if (k === 'troop') return typeof FX_INFO !== 'undefined' && FX_INFO[id] ? FX_INFO[id].sub : '';
    return id ? 'تمويه ' + (CAMO_TYPE_N[(CAMO[id] || {}).type] || '') : 'الطلاء الافتراضي لكل دولة';
  }
  function item(k, id) {
    const c = SHOP_CAT[k] && SHOP_CAT[k][id || '']; if (!c) return null; const cur = c.s ? 's' : c.m ? 'm' : 'c', price = c.s || c.m || c.p || 0;
    return { kind: k, id: id || '', r: c.r, cur, price, free: !price, own: owns(k, id), eq: k === 'camo' && camo() === (id || ''), n: name(k, id), sub: sub(k, id) };
  }
  const CUR_ORD = { c: 0, m: 1, s: 2 };
  function items(k) { const out = []; for (const id in SHOP_CAT[k]) out.push(item(k, id)); return out.sort((a, b) => RAR_ORDER.indexOf(a.r) - RAR_ORDER.indexOf(b.r) || (a.free ? -1 : 0) - (b.free ? -1 : 0) || CUR_ORD[a.cur] - CUR_ORD[b.cur] || a.price - b.price); }
  const afford = it => st()[it.cur] >= it.price;
  const value = it => ({ [it.cur]: it.price });
  function buy(k, id) {
    const it = item(k, id); if (!it || it.own || !afford(it)) return false; const E = st();
    E[it.cur] -= it.price; E.own[k].push(it.id); save(); checkAch(); return true;
  }
  // equipped camouflage (used in every battle; custom battle can still pick another owned one)
  function camo() { const E = st(); return E.eq && owns('camo', E.eq) ? E.eq : ''; }
  function equip(id) { if (!owns('camo', id)) return false; st().eq = id || ''; save(); return true; }
  // gems are spent inside a battle (the order itself goes through the command layer)
  function spendGems(n) { const E = st(); n = Math.ceil(n); if (n <= 0 || E.g < n) return false; E.g -= n; save(); return true; }
  /* ---------- giving rewards ----------
     rw: { c, m, g, s, item: [kind, id], camo: 1 (a random camouflage you do not own yet) } → list of parts for the reward pop-up */
  function give(rw) {
    const E = st(); const out = []; rw = Object.assign({}, rw);
    if (rw.camo) { const pool = items('camo').filter(it => !it.own && (it.r === 'c' || it.r === 'r')); if (pool.length) { const w = pool.map(it => it.r === 'r' ? 1 : 2.5); let x = Math.random() * w.reduce((a, b) => a + b, 0), i = 0; while (x > w[i] && i < pool.length - 1) { x -= w[i]; i++; } rw.item = ['camo', pool[i].id]; } else rw.c = (rw.c || 0) + 2500; }
    let tail = [];
    if (rw.item) { const [k, id] = rw.item; const it = item(k, id); if (it && !it.own) { E.own[k].push(it.id); tail.push({ item: [k, it.id] }); } else if (it) { rw[it.cur] = (rw[it.cur] || 0) + it.price; tail.push({ dup: [k, it.id] }); } }
    for (const k of ['c', 'g', 'm', 's']) if (rw[k]) { E[k] += rw[k]; E.earned[k] += rw[k]; out.push({ [k]: rw[k] }); }
    save(); checkAch(); return out.concat(tail);
  }
  /* ---------- after every battle: coins (+ gems / shards on hard wins), win streaks, mission progress ---------- */
  function payout(r) {
    if (r.mode === 'tut') { if (r.quit || st().tut) return { c: 0 }; st().tut = 1; return { c: 300, g: 5 }; } // first finished tutorial only
    if (r.quit) return { c: 0 };
    let c = (r.win ? 100 : 25) + Math.min(r.kills * 0.5, 120) + r.bkills * 4 + r.waves * 15;
    if (r.win) c *= 1 + 0.25 * (r.diff || 0); if (r.net && r.win) c *= 1.5;
    const out = { c: Math.round(c / 5) * 5 };
    if (r.chal && r.chal.rw) for (const k of ['c', 'g', 'm', 's']) if (r.chal.rw[k]) out[k] = (out[k] || 0) + r.chal.rw[k]; // a completed daily / weekly / monthly challenge
    if (r.win && !r.net) { if (r.diff >= 3) { out.g = 2; out.s = 1; } else if (r.diff === 2) out.g = 1; }
    return out;
  }
  function afterMatch(r) {
    const pay = payout(r); const E = st(); const notes = [];
    // win streaks against the computer
    if (!r.net && r.mode === 'skirmish') {
      if (r.win) { const d = r.diff | 0; if (STREAK_GOAL[d]) { E.streak[d]++; const [need, sh] = STREAK_GOAL[d]; if (E.streak[d] >= need) { E.streak[d] = 0; pay.s = (pay.s || 0) + sh; notes.push(need + ' انتصارات متتالية على «' + DIFF_N[d] + '»: +' + sh + ' قصاصات أسطورية'); } } }
      else for (const d in E.streak) E.streak[d] = 0;
    }
    if (pay.s && r.diff >= 3 && r.win) notes.unshift('انتصار على الذكاء الوحشي: +1 قصاصة أسطورية');
    for (const k of ['c', 'm', 'g', 's']) if (pay[k]) { E[k] += pay[k]; E.earned[k] += pay[k]; }
    const done = []; if (r.mode !== 'tut' && !r.quit) { const M = missions(); for (const sc of ['d', 'w']) for (const x of M[sc]) { if (x.p >= x.t) continue; const inc = misInc(x.k, r); if (inc > 0) { x.p = Math.min(x.t, x.p + inc); if (x.p >= x.t) done.push(x.n); } } }
    save(); return { c: pay.c || 0, m: pay.m || 0, g: pay.g || 0, s: pay.s || 0, done, notes };
  }
  function misInc(k, r) {
    switch (k) { case 'win': return r.win ? 1 : 0; case 'play': return 1; case 'kills': return r.kills; case 'bkills': return r.bkills; case 'air': return r.air; case 'built': return r.built; case 'units': return r.units;
      case 'waves': return r.waves; case 'hardwin': return r.win && r.diff >= 2 ? 1 : 0; case 'brutalwin': return r.win && r.diff >= 3 ? 1 : 0; case 'fastwin': return r.win && r.t < 900 ? 1 : 0; case 'daily': return r.chal && r.chal.k === 'd' ? 1 : 0; }
    return 0;
  }
  /* ---------- missions ---------- */
  const pad = v => String(v).padStart(2, '0');
  const dkey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  function weekStart(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; } // Monday 00:00
  function seedOf(s) { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h || 1; }
  function draw(pool, key, n) { const r = RNG(seedOf(key)); const a = pool.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a.slice(0, n); }
  function missions() {
    const E = st(); const now = new Date(); const keys = { d: dkey(now), w: 'W' + dkey(weekStart(now)) };
    for (const sc of ['d', 'w']) { const cur = E.mis[sc]; if (!cur || cur.k !== keys[sc] || !Array.isArray(cur.l)) E.mis[sc] = { k: keys[sc], l: draw(MISSIONS[sc], keys[sc], 3).map(x => ({ id: x.id, p: 0, cl: 0 })) }; }
    const view = sc => E.mis[sc].l.map((s, i) => { const x = MISSIONS[sc].find(y => y.id === s.id) || MISSIONS[sc][0]; return { sc, i, id: x.id, n: x.n, t: x.t, k: x.k, rw: x.rw, hard: !!x.rw.s, get p() { return s.p; }, set p(v) { s.p = v; }, cl: s.cl }; });
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); const nextMon = weekStart(now); nextMon.setDate(nextMon.getDate() + 7);
    return { d: view('d'), w: view('w'), dLeft: midnight - now, wLeft: nextMon - now };
  }
  function claimMission(sc, i) {
    const E = st(); missions(); const s = E.mis[sc] && E.mis[sc].l[i]; if (!s || s.cl) return null; const x = MISSIONS[sc].find(y => y.id === s.id); if (!x || s.p < x.t) return null;
    s.cl = 1; E.misDone++; return give(x.rw);
  }
  /* ---------- daily login (7-day cycle + consecutive-day streak) ---------- */
  function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return dkey(d); }
  function login() {
    const E = st(), L = E.login, td = today(); const can = L.last !== td;
    const shown = !can && L.n > 0 && L.n % 7 === 0 ? 7 : L.n % 7; // days already taken in this cycle
    const streak = can && L.last !== yesterday() ? 0 : L.streak; // a missed day breaks the streak (not the cycle)
    const next = can ? streak + 1 : streak + 1; // the streak value after the next claim
    return { can, day: L.n % 7, shown, total: L.n, rw: LOGIN_RW, streak, toBonus: (7 - next % 7) % 7 }; // toBonus 0 = the next claim pays the 7-day shards
  }
  function claimLogin() {
    const E = st(); const s = login(); if (!s.can) return null; const rw = Object.assign({}, LOGIN_RW[s.day]);
    E.login.streak = E.login.last === yesterday() ? E.login.streak + 1 : 1; E.login.n++; E.login.last = today();
    if (E.login.streak % 7 === 0) rw.s = (rw.s || 0) + LOGIN_STREAK_S;
    return give(rw);
  }
  /* ---------- wheel of fortune ---------- */
  const wheelFree = () => st().wheel.last !== today();
  function spin() {
    const E = st(); const free = wheelFree(); if (!free && E.m < WHEEL_COST) return null;
    if (free) E.wheel.last = today(); else E.m -= WHEEL_COST; E.wheel.n++;
    let x = Math.random() * WHEEL.reduce((a, s) => a + s.w, 0), i = 0; while (x > WHEEL[i].w && i < WHEEL.length - 1) { x -= WHEEL[i].w; i++; }
    return { i, parts: give(WHEEL[i].rw), free };
  }
  /* ---------- bonus codes («كود بونص» in the rewards screen) ----------
     stored as hashes of the normalised text so they are not readable in the game files.
     gift code: a valuable bundle, once every CODE_DAYS days · master code: unlocks every shop item */
  const CODES = { 3593851967: { kind: 'gift', every: 10, rw: { c: 5000, g: 40, m: 50, s: 5 } }, 864992798: { kind: 'all' } };
  const normCode = t => String(t || '').normalize('NFKC').replace(/[\u064B-\u0652\u0640]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim().toLowerCase();
  const hashCode = t => { let h = 2166136261; for (const ch of t) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
  function redeem(text) {
    const E = st(); const key = hashCode(normCode(text)); const C = CODES[key]; if (!C) return { err: 'الكود غير صحيح' };
    E.codes = E.codes || {}; const used = E.codes[key] || 0, now = Date.now();
    if (C.kind === 'gift') { const wait = used + C.every * 86400000 - now; if (used && wait > 0) return { err: 'استخدمت هذا الكود مؤخراً — يمكنك استخدامه مجدداً بعد ' + Math.ceil(wait / 86400000) + ' يوم' };
      E.codes[key] = now; return { parts: give(C.rw), title: 'كود بونص: هدية القائد!' }; }
    // master code: every map, nation, camouflage and troop in the shop
    let n = 0; for (const k in SHOP_CAT) for (const id in SHOP_CAT[k]) if (E.own[k].indexOf(id) < 0) { E.own[k].push(id); n++; }
    E.codes[key] = now; save(); checkAch(); return { all: true, n, title: n ? 'فُتح كل شيء في اللعبة!' : 'كل شيء مفتوح لديك مسبقاً' };
  }
  /* ---------- legendary shards: where they come from + current streaks ---------- */
  function shardInfo() { const E = st(), L = login(); return { s: E.s, streak: Object.assign({}, E.streak), goal: STREAK_GOAL, login: L.streak, earned: E.earned.s }; }
  /* ---------- achievements ---------- */
  function achProg(id) { // [current, goal] for the ones that can be measured
    const S = Profile.stats, E = st();
    switch (id) { case 'first_win': return [S.wins, 1]; case 'wins10': return [S.wins, 10]; case 'wins50': return [S.wins, 50]; case 'kills100': return [S.kills, 100]; case 'kills1000': return [S.kills, 1000];
      case 'air25': return [S.air || 0, 25]; case 'icpt25': return [S.icpt || 0, 25]; case 'daily5': return [S.daily || 0, 5]; case 'survive10': return [S.waves || 0, 10]; case 'survive25': return [S.waves || 0, 25];
      case 'all_factions': return [FACTION_IDS.filter(f => (S.facWins || {})[f] > 0).length, FACTION_IDS.length]; case 'mp_win': return [S.mpWins || 0, 1];
      case 'collector': return [E.own.camo.filter(k => k).length, 10]; case 'wheel10': return [E.wheel.n, 10]; case 'login7': return [login().streak, 7]; case 'missions20': return [E.misDone, 20]; }
    return null;
  }
  function startCount() { let n = 0; for (const k in SHOP_CAT) for (const id in SHOP_CAT[k]) { const c = SHOP_CAT[k][id]; if (!c.p && !c.m && !c.s) n++; } return n; }
  function checkAch() { const E = st(); let own = 0; for (const k in E.own) own += E.own[k].length; if (own > startCount()) unlockAch('shop1'); if (E.own.camo.filter(k => k).length >= 10) unlockAch('collector');
    if (Object.keys(SHOP_CAT).some(k => E.own[k].some(id => SHOP_CAT[k][id] && SHOP_CAT[k][id].r === 'l'))) unlockAch('legend'); if (E.wheel.n >= 10) unlockAch('wheel10'); if (E.login.streak >= 7) unlockAch('login7'); if (E.misDone >= 20) unlockAch('missions20'); }
  function achList() { const E = st(); return ACH.map(a => ({ a, got: !!Profile.ach[a.id], cl: !!E.ach[a.id], rw: ACH_RW[a.id] || { c: 300 }, prog: achProg(a.id) })); }
  function claimAch(id) { const E = st(); if (!Profile.ach[id] || E.ach[id]) return null; E.ach[id] = Date.now(); return give(ACH_RW[id] || { c: 300 }); }
  /* ---------- rank (level) rewards ---------- */
  function levels() { const E = st(), l = plevel(); return LV_RW.map((rw, i) => rw ? { l: i, rw, reached: l >= i, cl: !!E.lv[i] } : null).filter(Boolean); }
  function claimLv(i) { const E = st(); const rw = LV_RW[i]; if (!rw || plevel() < i || E.lv[i]) return null; E.lv[i] = Date.now(); return give(rw); }
  /* ---------- what can be collected now (red badge on the rewards icon) ---------- */
  function pending() {
    const E = st(); const M = missions(); const wheel = wheelFree() ? 1 : 0, lg = login().can ? 1 : 0, drop = dropFree() ? 1 : 0;
    const mis = M.d.concat(M.w).filter(x => x.p >= x.t && !x.cl).length, ach = ACH.filter(a => Profile.ach[a.id] && !E.ach[a.id]).length, lv = levels().filter(x => x.reached && !x.cl).length;
    return { wheel, login: lg, mis, ach, lv, drop, shard: 0, total: wheel + lg + mis + ach + lv + drop };
  }
  /* ---------- exchange (shop «الصرافة») ---------- */
  function exState() { const E = st(); const d = dkey(new Date()); if (!E.ex || E.ex.day !== d) E.ex = { day: d, n: {} }; return E.ex; }
  function exchange() {
    const X = exState(), E = st(); const now = new Date(); const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { list: EXCHANGE.map(o => { const used = X.n[o.id] || 0; const left = Math.max(0, o.n - used); return { id: o.id, from: o.from, to: o.to, max: o.n, left, rich: Object.keys(o.from).every(k => E[k] >= o.from[k]), can: left > 0 && Object.keys(o.from).every(k => E[k] >= o.from[k]) }; }), reset: midnight - now };
  }
  function swap(id) {
    const o = EXCHANGE.find(x => x.id === id); if (!o) return { err: 'عرض غير معروف' }; const X = exState(), E = st();
    if ((X.n[id] || 0) >= o.n) return { err: 'استنفدت حد هذا العرض اليوم — يتجدد بعد منتصف الليل' };
    for (const k in o.from) if (E[k] < o.from[k]) return { err: 'لا تملك ما يكفي من ' + CUR_N[k] };
    for (const k in o.from) E[k] -= o.from[k]; X.n[id] = (X.n[id] || 0) + 1; const parts = []; for (const k in o.to) { E[k] += o.to[k]; parts.push({ [k]: o.to[k] }); }
    save(); return { parts };
  }
  /* ---------- airdrop crates (rewards «الإنزال الجوي») ---------- */
  function dropState() { const E = st(); const d = dkey(new Date()); if (!E.drop || E.drop.day !== d) E.drop = { day: d, n: {}, freeT: E.drop ? E.drop.freeT || 0 : 0, opened: E.drop ? E.drop.opened || 0 : 0 }; return E.drop; }
  const FREE_MS = h => h * 3600000;
  function dropFree() { const D = dropState(); const c = CRATES.find(x => x.free); return !!c && Date.now() - (D.freeT || 0) >= FREE_MS(c.free); }
  function crates() {
    const D = dropState(), E = st(); return CRATES.map(c => { const used = D.n[c.id] || 0; const free = !!c.free && Date.now() - (D.freeT || 0) >= FREE_MS(c.free);
      return { id: c.id, n: c.n, d: c.d, cur: c.cur, cost: c.cost, rw: c.rw, item: c.item, max: c.day, left: Math.max(0, c.day - used), free, freeIn: c.free ? Math.max(0, FREE_MS(c.free) - (Date.now() - (D.freeT || 0))) : 0, rich: E[c.cur] >= c.cost }; });
  }
  function openCrate(id) {
    const c = CRATES.find(x => x.id === id); if (!c) return { err: 'صندوق غير معروف' }; const D = dropState(), E = st();
    const free = !!c.free && Date.now() - (D.freeT || 0) >= FREE_MS(c.free);
    if (!free) { if ((D.n[id] || 0) >= c.day) return { err: 'وصلت إلى حد هذا الصندوق اليوم' }; if (E[c.cur] < c.cost) return { err: 'لا تملك ما يكفي من ' + CUR_N[c.cur] }; E[c.cur] -= c.cost; D.n[id] = (D.n[id] || 0) + 1; }
    else D.freeT = Date.now();
    const rw = {}; const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    for (const k in c.rw) { const [a, b, ch] = c.rw[k]; if (ch === undefined || Math.random() < ch) rw[k] = k === 'c' ? Math.round(R(a, b) / 10) * 10 : R(a, b); }
    if (c.item && Math.random() < c.item[1]) { const rs = c.item[0].split(''); const pool = []; for (const k in SHOP_CAT) for (const iid in SHOP_CAT[k]) { const x = SHOP_CAT[k][iid]; if (rs.includes(x.r) && !E.own[k].includes(iid) && (x.p || x.m || x.s)) pool.push([k, iid]); } if (pool.length) rw.item = pool[Math.floor(Math.random() * pool.length)]; }
    D.opened = (D.opened || 0) + 1; return { parts: give(rw), crate: c.id, free };
  }
  /* ---------- small display helpers (icons use the gradients defined once in index.html) ---------- */
  const ICO = {
    c: '<svg class="cur cc" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.4" fill="url(#gCoin)" stroke="url(#gCoinE)" stroke-width="1.4"/><circle cx="12" cy="12" r="7.3" fill="none" stroke="#b46c00" stroke-width="1" opacity=".75"/><path d="M12 7.3l1.45 2.95 3.25.47-2.35 2.3.55 3.24L12 14.74l-2.9 1.52.55-3.24-2.35-2.3 3.25-.47z" fill="#fff4b8" stroke="#a65f00" stroke-width=".6"/></svg>',
    m: '<svg class="cur cm" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 1h4.1l2.3 7.4H8.9z" fill="#c8372a"/><path d="M13.3 1h4.1l-2.3 7.4H11z" fill="#2f6dd0"/><path d="M10.7 1h2.6l.4 7.4h-3.4z" fill="#f4f1e0"/><circle cx="12" cy="15.4" r="7.3" fill="url(#gMed)" stroke="#3a4f7a" stroke-width="1.2"/><path d="M12 10.9l1.35 2.75 3.03.44-2.19 2.14.52 3.02L12 17.83l-2.71 1.42.52-3.02-2.19-2.14 3.03-.44z" fill="url(#gCoin)" stroke="#8a5200" stroke-width=".5"/></svg>',
    g: '<svg class="cur cg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 3.4h11.2l4.2 5.4L12 21.2 2.2 8.8z" fill="url(#gGem)" stroke="#0a5235" stroke-width="1.1" stroke-linejoin="round"/><path d="M2.2 8.8h19.6M9.2 3.4L7.7 8.8 12 21.2l4.3-12.4-1.5-5.4" fill="none" stroke="rgba(255,255,255,.6)" stroke-width=".8" stroke-linejoin="round"/><path d="M6.4 3.4l1.3 5.4M17.6 3.4l-1.3 5.4" stroke="rgba(255,255,255,.35)" stroke-width=".7"/></svg>',
    s: '<svg class="cur cs" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.8 1.6l5.8 7.6-3.5 13.2-8.1-4.8-3.1-9.4z" fill="url(#gShard)" stroke="#3a1268" stroke-width="1.1" stroke-linejoin="round"/><path d="M13.8 1.6l-2.1 8.2 4.4 12.6M11.7 9.8l-6.8-1.6M11.7 9.8l7.9-.6" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".8" stroke-linejoin="round"/><path d="M19.6 2.4l1 1.8M21.4 6l-1.6.4" stroke="#f2d9ff" stroke-width="1" stroke-linecap="round"/></svg>',
  };
  const KICO = { map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>', nat: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>', camo: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 11c3-2 5 1 8-1s5-3 10-1M3 15.5c2.5-1 4.5 1 7.5 0s5.5-2 10.5-1"/>',
    troop: '<path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3L12 14.1l-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z"/><path d="M5 21h14"/>' };
  const ico = k => ICO[k] || '';
  // reward chips: «🪙 500» «💎 5» «🎖 10» «◆ 2» «تمويه النمر»
  function rwHTML(rw, cls) {
    const out = []; if (!rw) return '';
    for (const k of ['c', 'g', 'm', 's']) if (rw[k]) out.push(`<span class="rwc ${k}">${ICO[k]}<b>${fmN(rw[k])}</b></span>`);
    if (rw.item) { const it = item(rw.item[0], rw.item[1]); if (it) out.push(`<span class="rwc itm r-${it.r}"><svg viewBox="0 0 24 24">${KICO[it.kind]}</svg><b>${UI.kit.esc(it.n)}</b></span>`); }
    if (rw.camo) out.push(`<span class="rwc itm r-r"><svg viewBox="0 0 24 24">${KICO.camo}</svg><b>تمويه عشوائي</b></span>`);
    return `<span class="rws ${cls || ''}">${out.join('')}</span>`;
  }
  return { exchange, swap, crates, openCrate, dropFree, st, bal, owns, firstOwned, item, items, afford, buy, camo, equip, spendGems, give, redeem, afterMatch, missions, claimMission, login, claimLogin, wheelFree, spin, shardInfo, achList, claimAch, levels, claimLv, pending, ico, rwHTML, name, KICO };
})();
