/* ============================================================
   War of Power — ملف اللاعب: المستوى، الإنجازات، التحدي اليومي، السجل
   الملف: js/ui/profile.js   ·   ترتيب التحميل: 33 من 43
   ============================================================ */
'use strict';
/* ===== Meta progression: profile, player level, achievements, daily challenge, records ===== */
const Profile = { v: 3, name: 'القائد', xp: 0, stats: { wins: 0, losses: 0, played: 0, kills: 0, air: 0, bkills: 0, time: 0, daily: 0, waves: 0, facWins: {}, mpWins: 0 }, seenTut: false,
  avatar: '', ach: {}, daily: { date: '', done: false }, chal: {}, scores: [], eco: null }; // eco: wallet, owned items and rewards (js/ui/economy.js)
const PROFILE_DEF = JSON.parse(JSON.stringify(Profile));
function scrubRemoved() { // saved data from older versions may name removed factions, maps or modes
  try {
    const l = LS.get('tw_last_v1', null);
    if (l && typeof l === 'object') { let ch = 0;
      if (l.f && !FACTIONS[l.f]) { l.f = 'usa'; ch = 1; }
      if (Array.isArray(l.opp)) { const o = l.opp.filter(x => x && FACTIONS[x.f]); if (o.length !== l.opp.length) { l.opp = o.length ? o : [{ f: 'rus', ai: 1, team: 1 }]; ch = 1; } }
      if (l.map && !MAPS.some(m => m.id === l.map)) { l.map = 'forest'; ch = 1; }
      if (ch) LS.set('tw_last_v1', l); }
    const s = localStorage.getItem('tw_save_v1');
    if (s && /"frj|frj_|"islands6?"|"coast"|_carrier|_destroyer|_boat"|_sub"|_lcac|_(dozer|excav|crane|mixer|roller|dumper)"|"type":"(oilwell|derrick|depot2|repair|hospital)"|"mode":"(world|gov)"/.test(s)) LS.del('tw_save_v1');
  } catch (e) { }
}
scrubRemoved();
function loadProfile() {
  const p = LS.get('tw_profile_v1', null);
  if (p && typeof p === 'object') { const fresh = JSON.parse(JSON.stringify(PROFILE_DEF)); for (const k in fresh) if (p[k] !== undefined) fresh[k] = p[k]; Object.assign(Profile, fresh);
    Profile.stats = Object.assign({}, PROFILE_DEF.stats, p.stats || {}); Profile.stats.facWins = Object.assign({}, (p.stats || {}).facWins || {}); Profile.ach = Object.assign({}, p.ach || {});
    if (!Array.isArray(Profile.scores)) Profile.scores = []; }
  const s = LS.get('tw_settings_v1', null); if (s && typeof s === 'object') Object.assign(Settings, s);
}
function saveProfile() { LS.set('tw_profile_v1', Profile); }
function saveSettings() { LS.set('tw_settings_v1', Settings); }
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
/* ---------- national flags (real flags from assets/flags.js) ----------
   EMBLEM[f] returns the flag as an inline <svg>; ids inside are made unique on every use so
   several copies of the same flag can sit on one screen. */
const EMBLEM = {};
{ let flagSeq = 0;
  for (const f in FLAG_SVG) Object.defineProperty(EMBLEM, f, { enumerable: true, get() { const n = 'f' + (++flagSeq) + '_'; return FLAG_SVG[f].replace(/id="([^"]+)"/g, (m, id) => `id="${n}${id}"`).replace(/#([A-Za-z][\w-]*)/g, (m, id) => /^[0-9a-f]{3,8}$/i.test(id) ? m : '#' + n + id); } }); }
/* ---------- player level (career) ---------- */
const PLV = [0, 1500, 4000, 8000, 14000, 22000, 34000, 50000, 72000, 100000, 140000, 200000, 280000, 380000, 500000];
const PLV_N = ['مجنّد', 'جندي أول', 'عريف', 'رقيب', 'ملازم', 'ملازم أول', 'نقيب', 'رائد', 'مقدم', 'عقيد', 'عميد', 'لواء', 'فريق', 'فريق أول', 'مشير'];
function plevel() { let l = 0; for (let i = 0; i < PLV.length; i++) if (Profile.xp >= PLV[i]) l = i; return l; }
function rankBadge(l, size) { size = size || 30; const stars = Math.min(5, Math.floor(l / 3) + 1), bars = l % 3; return `<svg class="rbadge" viewBox="0 0 40 40" width="${size}" height="${size}"><path d="M20 2l16 6v12c0 9-7 15-16 18C11 35 4 29 4 20V8z" fill="#20303a" stroke="#c9a24a" stroke-width="1.6"/>${Array.from({ length: stars }, (_, i) => { const x = 20 + (i - (stars - 1) / 2) * 6; return `<path transform="translate(${x.toFixed(1)} 15) scale(.32)" d="M0-8l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L0 4.4-5 7.2l1.2-5.6-4.2-3.8 5.6-.6z" fill="#f2cf6a"/>`; }).join('')}${Array.from({ length: bars }, (_, i) => `<rect x="11" y="${24 + i * 4}" width="18" height="2.2" rx="1" fill="#e7cb83"/>`).join('')}</svg>`; }
/* ---------- elite units: free for every player ---------- */
const ELITE_CD = 90; // seconds between two call-ins of the same elite unit
function allSpecials(f) { const o = {}; for (const u of eliteList(f)) o[u.id] = 1; return o; }/* ---------- achievements ---------- */
const ACH = [
  { id: 'first_win', n: 'النصر الأول', d: 'اربح أول معركة.' }, { id: 'wins10', n: 'قائد منتصر', d: 'اربح 10 معارك.' }, { id: 'wins50', n: 'أسطورة الحرب', d: 'اربح 50 معركة.' },
  { id: 'kills100', n: 'مئة إصابة', d: 'دمّر 100 وحدة معادية.' }, { id: 'kills1000', n: 'آلة الحرب', d: 'دمّر 1000 وحدة معادية.' },
  { id: 'hard_win', n: 'خصم صعب', d: 'اهزم ذكاءً اصطناعياً صعباً.' }, { id: 'brutal_win', n: 'قاهر الوحوش', d: 'اهزم ذكاءً اصطناعياً وحشياً.' },
  
  { id: 'air25', n: 'درع السماء', d: 'أسقط 25 طائرة معادية.' },
  { id: 'fast_win', n: 'حرب خاطفة', d: 'انتصر في أقل من 10 دقائق.' }, { id: 'nolose', n: 'بلا خسائر تُذكر', d: 'انتصر وخسائرك أقل من 5 وحدات.' },
  { id: 'super', n: 'الضربة القاضية', d: 'أطلق السلاح الاستراتيجي.' }, { id: 'all_factions', n: 'قائد عالمي', d: 'انتصر بكل الدول الخمس.' }, 
  { id: 'special', n: 'التعزيزات', d: 'استدعِ وحدة نخبة إلى المعركة.' },
  { id: 'daily5', n: 'المثابر', d: 'أكمل 5 تحديات يومية.' },
  { id: 'survive10', n: 'الصمود', d: 'اصمد 10 موجات في طور النجاة.' }, { id: 'survive25', n: 'القلعة', d: 'اصمد 25 موجة في طور النجاة.' },
  { id: 'mp_win', n: 'بطل الشبكة', d: 'انتصر في معركة جماعية.' }, 
  { id: 'tech_full', n: 'عبقري التطوير', d: 'أكمل شجرة التطوير كاملة في معركة واحدة.' }, { id: 'builder', n: 'مهندس القواعد', d: 'ابنِ 30 مبنى في معركة واحدة.' }, { id: 'icpt25', n: 'المظلة الحديدية', d: 'اعترض 25 قذيفة أو صاروخاً بالدفاع الجوي.' }, ];
function unlockAch(id) {
  if (Profile.ach[id]) return false; const a = ACH.find(x => x.id === id); if (!a) return false; Profile.ach[id] = Date.now(); saveProfile();
  if (!unlockAch.quiet) try { UI.achToast(a); } catch (e) { } return true;
}
function checkAchStats() { const S = Profile.stats; if (S.wins >= 1) unlockAch('first_win'); if (S.wins >= 10) unlockAch('wins10'); if (S.wins >= 50) unlockAch('wins50'); if (S.kills >= 100) unlockAch('kills100'); if (S.kills >= 1000) unlockAch('kills1000');
  if (S.air >= 25) unlockAch('air25'); if ((S.icpt || 0) >= 25) unlockAch('icpt25'); if (S.daily >= 5) unlockAch('daily5'); if (S.waves >= 10) unlockAch('survive10'); if (S.waves >= 25) unlockAch('survive25');
  if (FACTION_IDS.every(f => (S.facWins[f] || 0) > 0)) unlockAch('all_factions'); if (S.mpWins > 0) unlockAch('mp_win'); }
/* ---------- daily challenge (same for every player on a date) ---------- */
const DAILY_MODS = [
  { id: 'rich', n: 'خزائن ممتلئة', d: 'تبدأ بـ 30,000 لكن العدو صعب.', money: 30000, ai: 2 }, { id: 'poor', n: 'شحّ الموارد', d: 'تبدأ بـ 4,000 فقط.', money: 4000, ai: 1 },
  { id: 'night', n: 'هجوم ليلي', d: 'المعركة كلها في الظلام.', tod: 'night', ai: 1 }, { id: 'horde', n: 'الحشود', d: 'ثلاثة أعداء متحالفين ضدك.', opp: 3, ai: 0 },
  { id: 'brutal', n: 'المواجهة الوحشية', d: 'خصم وحشي واحد ومال وفير.', money: 20000, ai: 3 },
  { id: 'duel', n: 'المبارزة', d: 'مواجهة مباشرة على خريطة صغيرة.', map: 'dunes', ai: 2 },
];
function dailyDef(ds) {
  ds = ds || today(); let h = 0; for (const ch of ds) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const r = RNG(h || 1);
  const mod = DAILY_MODS[r.int(0, DAILY_MODS.length - 1)]; const maps = MAPS.filter(m => !m.gen && m.max >= 2); const map = mod.map || maps[r.int(0, maps.length - 1)].id;
  const f = FACTION_IDS[r.int(0, FACTION_IDS.length - 1)]; const pool = FACTION_IDS.filter(x => x !== f); const n = Math.min(mod.opp || 1, (MAPS.find(m => m.id === map) || {}).max - 1 || 1);
  const opp = []; for (let i = 0; i < n; i++) opp.push({ f: pool[(r.int(0, 99) + i) % pool.length], ai: mod.ai, team: mod.id === 'horde' ? 1 : i + 1 });
  return { date: ds, seed: h, mod, map, f, opp, money: mod.money || 10000, tod: mod.tod || (r() < 0.25 ? 'dusk' : 'day') };
}
const dailyDone = () => Profile.daily.date === today() && Profile.daily.done;
/* ---------- challenges: daily · weekly · monthly sections (the same for every player in a period) ----------
   Daily challenge #1 is the classic daily above (missions, «تحديات يومية» stats and the daily5 achievement count it).
   Weekly challenges renew on Monday 00:00 (like the weekly missions), monthly ones on the 1st. A win completes a challenge once. */
const CHAL_MODS = {
  d: [ // daily #2: a harder twist on top of the classic daily
    { id: 'd_hard', n: 'المواجهة الصعبة', d: 'خصم صعب على خريطة متوسطة ومال عادي.', ai: 2 },
    { id: 'd_dusk', n: 'معركة الغروب', d: 'خصمان متوسطان يقاتل كلٌّ منهما لنفسه عند الغروب.', opp: 2, ai: 1, tod: 'dusk' },
    { id: 'd_lean', n: 'ميزانية ضيقة', d: 'تبدأ بـ 6,000 أمام خصم متوسط.', money: 6000, ai: 1 },
    { id: 'd_pair', n: 'الجبهتان', d: 'عدوّان سهلان متحالفان ضدك.', opp: 2, ai: 0, ally: 1 },
  ],
  w: [
    { id: 'w_siege', n: 'الحصار', d: 'عدوّان صعبان متحالفان ضدك.', opp: 2, ai: 2, ally: 1 },
    { id: 'w_blitz', n: 'الحرب الخاطفة', d: 'مال وفير لكن الخصم وحشي.', money: 25000, ai: 3 },
    { id: 'w_night', n: 'ليلة طويلة', d: 'ليل كامل وخصمان صعبان يقاتل كلٌّ منهما لنفسه.', opp: 2, ai: 2, tod: 'night' },
    { id: 'w_scarce', n: 'اقتصاد الحرب', d: 'تبدأ بـ 5,000 فقط أمام خصم صعب.', money: 5000, ai: 2 },
    { id: 'w_front', n: 'الجبهة الواسعة', d: 'خريطة كبيرة وثلاثة خصوم متوسطين.', opp: 3, ai: 1, size: 1.5 },
    { id: 'w_alone', n: 'وحيداً ضد الجميع', d: 'ثلاثة أعداء متوسطين متحالفين ضدك.', opp: 3, ai: 1, ally: 1 },
  ],
  m: [
    { id: 'm_arma', n: 'هرمجدون', d: 'ثلاثة خصوم وحشيين متحالفين ضدك ومال وفير.', opp: 3, ai: 3, ally: 1, money: 30000 },
    { id: 'm_last', n: 'الصمود الأخير', d: 'تبدأ بـ 6,000 أمام خصمين وحشيين متحالفين.', opp: 2, ai: 3, ally: 1, money: 6000 },
    { id: 'm_dark', n: 'حرب الظلام', d: 'ليل دامس وثلاثة خصوم صعبين يقاتل كلٌّ منهم لنفسه.', opp: 3, ai: 2, tod: 'night' },
    { id: 'm_titan', n: 'صراع الجبابرة', d: 'خريطة ضخمة وخصمان وحشيان.', opp: 2, ai: 3, size: 2, money: 20000 },
    { id: 'm_storm', n: 'العاصفة', d: 'خصمان وحشيان متحالفان على خريطة كبيرة ليلاً.', opp: 2, ai: 3, ally: 1, size: 1.5, tod: 'night' },
  ],
};
const CHAL_N = { d: 2, w: 3, m: 3 };                // how many challenges each section holds
const CHAL_RW = { d: [{ c: 300, m: 3 }, { c: 450, g: 3 }], w: [{ c: 1200, m: 8, g: 4 }], m: [{ c: 3500, m: 20, g: 10, s: 2 }] };
const CHAL_T = { d: 'التحدي اليومي', w: 'التحدي الأسبوعي', m: 'التحدي الشهري' };
const chalPad = v => String(v).padStart(2, '0');
function chalKey(k, now) {
  now = now || new Date(); if (k === 'd') return today();
  if (k === 'm') return 'M' + now.getFullYear() + '-' + chalPad(now.getMonth() + 1);
  const x = new Date(now.getFullYear(), now.getMonth(), now.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return 'W' + x.getFullYear() + '-' + chalPad(x.getMonth() + 1) + '-' + chalPad(x.getDate()); // Monday
}
function chalLeft(k) { const n = new Date(); let e;
  if (k === 'd') e = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  else if (k === 'm') e = new Date(n.getFullYear(), n.getMonth() + 1, 1);
  else { e = new Date(n.getFullYear(), n.getMonth(), n.getDate()); e.setDate(e.getDate() - ((e.getDay() + 6) % 7) + 7); }
  return e - n; }
function chalState() { const C = Profile.chal = Profile.chal && typeof Profile.chal === 'object' ? Profile.chal : {}; for (const k of ['d', 'w', 'm']) { const key = chalKey(k); if (!C[k] || C[k].key !== key) C[k] = { key, done: [] }; } if (dailyDone() && C.d.done.indexOf(0) < 0) C.d.done.push(0); return C; }
function chalList(k) {
  const key = chalKey(k); let h = 0; for (const ch of k + key + 'chal') h = (h * 31 + ch.charCodeAt(0)) >>> 0; const r = RNG(h || 1); const C = chalState();
  const pool = CHAL_MODS[k].slice(); for (let i = pool.length - 1; i > 0; i--) { const j = r.int(0, i); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  const out = []; const rwOf = i => { const L = CHAL_RW[k]; return L[Math.min(i, L.length - 1)]; };
  for (let i = 0; i < CHAL_N[k]; i++) {
    if (k === 'd' && i === 0) { const d = dailyDef(); out.push({ k, key, i, mod: d.mod, map: d.map, f: d.f, opp: d.opp, money: d.money, tod: d.tod, size: 1, seed: d.seed, rw: rwOf(0), done: C.d.done.indexOf(0) >= 0 }); continue; }
    const mod = pool[(i - (k === 'd' ? 1 : 0)) % pool.length]; const want = (mod.opp || 1) + 1;
    const maps = MAPS.filter(m => !m.gen && m.max >= Math.min(want, 4)); const def = mod.map ? MAPS.find(m => m.id === mod.map) : maps[r.int(0, maps.length - 1)];
    const f = FACTION_IDS[r.int(0, FACTION_IDS.length - 1)]; const others = FACTION_IDS.filter(x => x !== f); const n = Math.max(1, Math.min(mod.opp || 1, def.max - 1)); const o0 = r.int(0, 99);
    const opp = []; for (let j = 0; j < n; j++) opp.push({ f: others[(o0 + j) % others.length], ai: mod.ai, team: mod.ally ? 1 : j + 1 });
    out.push({ k, key, i, mod, map: def.id, f, opp, money: mod.money || 10000, tod: mod.tod || (r() < 0.3 ? 'dusk' : 'day'), size: mod.size || 1, seed: (h + i * 7919) >>> 0, rw: rwOf(i), done: C[k].done.indexOf(i) >= 0 });
  }
  return out;
}
const chalOpen = k => chalList(k).filter(c => !c.done).length;
// a won challenge battle: returns { k, i, n, rw } the first time (and only while its period is still running)
function chalWin(ch) {
  if (!ch || !CHAL_N[ch.k] || ch.key !== chalKey(ch.k)) return null; const C = chalState(); if (C[ch.k].done.indexOf(ch.i) >= 0) return null;
  const c = chalList(ch.k)[ch.i]; if (!c) return null; C[ch.k].done.push(ch.i); return { k: ch.k, i: ch.i, n: c.mod.n, rw: c.rw };
}
/* ---------- records ---------- */
function addScore(e) { e.date = today(); e.name = Profile.name; Profile.scores.push(e); Profile.scores.sort((a, b) => b.score - a.score); Profile.scores = Profile.scores.slice(0, 25); saveProfile(); return Profile.scores.indexOf(e); }
