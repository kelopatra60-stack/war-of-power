/* ============================================================
   War of Power — المتجر: الخرائط والدول والتمويهات والقوات، مصنّفة شائع · نادر · ذهبي · أسطوري
   الملف: js/ui/shop.js   ·   يُحمَّل بعد menus.js
   ============================================================ */
'use strict';
/* Side bar with the four sections; each section is filtered by rarity and grouped under rarity headers.
   Every card wears its rarity colour (common khaki · rare blue · gold · legendary purple with a moving shine).
   Prices: common/rare in coins, gold in medals, legendary in legendary shards (see js/ui/economy.js).
   Tapping a card opens its details: buy, equip a camouflage, pick a nation, play a map; bought troops join every nation's production.
   The wallet (coins · gems · medals · shards) is shown here and on the commander screen only. */
const Shop = (function () {
  const K = UI.kit; const { esc, fm, icon } = K;
  const SECT = [['map', 'الخرائط', Eco.KICO.map], ['nat', 'الدول', Eco.KICO.nat], ['camo', 'التمويهات', Eco.KICO.camo], ['troop', 'القوات', Eco.KICO.troop], ['ex', 'الصرافة', '<circle cx="12" cy="12" r="9"/><path d="M7.5 10h9l-2.6-2.6M16.5 14h-9l2.6 2.6"/>']];
  const leftT = ms => { const m = Math.max(1, Math.floor(ms / 60000)); const h = Math.floor(m / 60); return h ? h + ' س ' + (m % 60) + ' د' : (m % 60) + ' دقيقة'; };
  // «الصرافة»: trade one currency for another; each offer a few times a day
  function exBody() {
    const X = Eco.exchange(); const chips = rw => Object.keys(rw).map(k => `<span class="exv ${k}">${Eco.ico(k)}<b>${fm(rw[k])}</b><i>${CUR_N[k]}</i></span>`).join('');
    return `<div class="exhead"><b>الصرافة</b><span>يتجدد الحد اليومي خلال ${leftT(X.reset)}</span></div>
      <p class="shnote">بدّل عملاتك بسعر الصرافة. الأسعار تأخذ عمولة، ولكل عرض عدد مرات محدود في اليوم يتجدد بعد منتصف الليل.</p>
      <div class="exgrid">${X.list.map(o => `<div class="exc${o.can ? '' : ' no'}"><div class="exr"><span class="exa">${chips(o.from)}</span><svg class="exar" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5M10 6.5L4.5 12l5.5 5.5"/></svg><span class="exa to">${chips(o.to)}</span></div>
        <div class="exf"><span class="exl">متبقٍ اليوم <b><bdi dir="ltr">${o.left}/${o.max}</bdi></b></span><button class="btn ${o.can ? 'pri' : ''} sm" data-a="xs_${o.id}"${o.left ? '' : ' disabled'}>${o.left ? 'صرف' : 'نفد اليوم'}</button></div></div>`).join('')}</div>`;
  }
  const LOCK = '<svg viewBox="0 0 24 24" class="lk" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15.5" r="1.3"/></svg>';
  let sect = 'map', filt = 'all', backFn = null;
  const myF = () => Menus.pickGet().f;
  // pointed, gold-edged currency plates (the only place besides the commander screen where the balance shows)
  function wallet() { const b = Eco.bal(); return `<div class="wallet">${['c', 'g', 'm', 's'].map(k => `<button class="wchip ${k}" data-a="earn" aria-label="${CUR_N[k]}"><span class="wci">${Eco.ico(k)}<b>${fm(b[k])}</b></span></button>`).join('')}</div>`; }
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12h16M13.5 5.5l6.5 6.5-6.5 6.5"/></svg>';
  const head = t => `<div class="shead"><button class="btn ghost back" data-a="sback" aria-label="رجوع">${ARROW}</button><h2>${t}</h2>${wallet()}</div>`;
  const price = it => `<span class="spr ${it.cur}${Eco.afford(it) ? '' : ' no'}">${Eco.ico(it.cur)}<b>${fm(it.price)}</b></span>`;
  const troopUnit = id => myF() + '_' + id;
  // picture of an item: map = minimap · nation = flag + main tank · camouflage = swatch + your tank wearing it · troop = the unit in your nation's paint
  function prev(it) {
    if (it.kind === 'map') return `<span class="pv pmap" data-bgprev="${it.id}"></span>`;
    if (it.kind === 'nat') return `<span class="pv pnat" style="${K.tcv(TEAMCOL[FACTIONS[it.id].col])}"><span class="pflag">${EMBLEM[it.id]}</span><img data-u="${it.id}_mbt" alt=""></span>`;
    if (it.kind === 'troop') return `<span class="pv ptroop r-${it.r}"><img data-u="${troopUnit(it.id)}" alt=""></span>`;
    return `<span class="pv pcamo" style="background-image:url(${Menus.camoURL(it.id || FACTIONS[myF()].camo0)})"><img data-cm="${it.id || '-'}" alt=""></span>`;
  }
  function fill(root) {
    root.querySelectorAll('[data-bgprev]').forEach(e => { const d = MAPS.find(m => m.id === e.dataset.bgprev); if (d) Menus.preview(d, url => { if (url && e.isConnected) e.style.backgroundImage = `url(${url})`; }); });
    root.querySelectorAll('img[data-u]').forEach(im => { if (UNITS[im.dataset.u]) icon(im, 'u', im.dataset.u); });
    const f = myF(); root.querySelectorAll('img[data-cm]').forEach(im => Icons.camo(f + '_mbt', im.dataset.cm, url => { if (url && im.isConnected) { im.src = url; im.classList.add('ok'); } }));
  }
  function card(it) {
    const st = it.own ? (it.eq ? '<span class="sst eq">✓ مُجهّز</span>' : '<span class="sst">✓ مملوك</span>') : price(it);
    return `<button class="sitem r-${it.r}${it.own ? ' own' : ''}" data-a="it_${it.id || 'def'}">${prev(it)}<span class="srar">${RARITY[it.r].n}</span>${it.own ? '' : `<span class="slock">${LOCK}</span>`}<span class="snm"><b>${esc(it.n)}</b><em>${esc(it.sub)}</em></span>${st}</button>`;
  }
  // open from anywhere; `back` (optional) is where the back button returns (default: main menu)
  function open(s0, back) { backFn = back || null; filt = 'all'; screen(s0 || sect); }
  function screen(s0, f0) {
    if (s0) sect = s0; if (f0) filt = f0;
    if (sect === 'ex') { const s = K.showScreen(head('المتجر') + `<div class="ubox"><div class="umain">${exBody()}</div><nav class="uside">${SECT.map(([k, n, ic]) => `<button class="${k === sect ? 'on' : ''}" data-a="sc_${k}"><svg viewBox="0 0 24 24">${ic}</svg><span>${n}</span></button>`).join('')}</nav></div>`, 'setup shop', MODE_AC.home);
      const map = { sback: () => { const b = backFn; backFn = null; if (b) b(); else Menus.hub(); }, earn: () => earnInfo() }; for (const [k] of SECT) map['sc_' + k] = () => screen(k, 'all');
      for (const o of Eco.exchange().list) map['xs_' + o.id] = () => { const r = Eco.swap(o.id); if (r.err) { SND.ui('nomoney'); K.toast(r.err, 'warn'); return; } SND.ui('buy'); Rewards.pop(r.parts, 'تم الصرف'); screen(); };
      K.bind(s, map); return; }
    const list = Eco.items(sect), own = list.filter(x => x.own).length;
    const groups = RAR_ORDER.filter(r => filt === 'all' || filt === r).map(r => [r, list.filter(x => x.r === r)]).filter(g => g[1].length);
    const note = sect === 'troop' ? '<p class="shnote">قوات خاصة خيالية تعمل مع كل الدول: بعد شرائها تظهر في الثكنة أو المصنع أو المطار لأي دولة تلعب بها.</p>' : '';
    const body = `<div class="shbar"><div class="rchips">${['all'].concat(RAR_ORDER).map(r => `<button class="rchip r-${r}${filt === r ? ' sel' : ''}" data-a="rf_${r}">${r === 'all' ? 'الكل' : '<i></i>' + RARITY[r].n}</button>`).join('')}</div><span class="shown">${own}/${list.length} مملوك</span></div>${note}
      <div class="sgroups">${groups.map(([r, its]) => `<section class="rgrp r-${r}"><div class="rhd"><b>${RARITY[r].n}</b><i></i><span>${its.filter(x => x.own).length}/${its.length}</span></div><div class="sgrid k-${sect}">${its.map(card).join('')}</div></section>`).join('')}</div>`;
    const s = K.showScreen(head('المتجر') + `<div class="ubox"><div class="umain">${body}</div><nav class="uside">${SECT.map(([k, n, ic]) => `<button class="${k === sect ? 'on' : ''}" data-a="sc_${k}"><svg viewBox="0 0 24 24">${ic}</svg><span>${n}</span></button>`).join('')}</nav></div>`, 'setup shop', MODE_AC.home);
    fill(s);
    const map = { sback: () => { const b = backFn; backFn = null; if (b) b(); else Menus.hub(); }, earn: () => earnInfo() };
    for (const [k] of SECT) map['sc_' + k] = () => screen(k, 'all');
    for (const r of ['all'].concat(RAR_ORDER)) map['rf_' + r] = () => screen(null, r);
    for (const it of list) map['it_' + (it.id || 'def')] = () => detail(sect, it.id, () => screen());
    K.bind(s, map);
  }
  /* ---------- item details (also opened from the locked cards in battle setup) ---------- */
  function detail(k, id, after) {
    const it = Eco.item(k, id); if (!it) return; const b = Eco.bal();
    let info = '';
    if (k === 'map') { const M = MAPS.find(m => m.id === id); info = `<p>${esc(M.d)}</p><div class="dchips"><i>${esc(it.sub)}</i><i><bdi dir="ltr">${M.w}×${M.h}</bdi></i></div>`; }
    else if (k === 'nat') { const F = FACTIONS[id]; info = `<p><b>${esc(F.theme)}</b></p><p class="muted">${esc(F.perk)}</p><div class="dunits"><img data-u="${id}_mbt" alt=""><img data-u="${UNITS[id + '_jet'] ? id + '_jet' : id + '_heli'}" alt=""><img data-u="${id}_rifle" alt=""></div>`; }
    else if (k === 'troop') { const u = UNITS[troopUnit(id)] || {}; const P = { barracks: 'الثكنة', factory: 'مصنع المركبات', airfield: 'المطار' };
      info = `<p>${esc(u.d || '')}</p><div class="dchips"><i>التحمّل ${fm(Math.round((u.hp || 0) * UNIT_HP_K))}</i><i>السرعة ${u.speed || 0}</i><i>الكلفة في المعركة $${fm(u.cost || 0)}</i><i>تُنتج في ${P[u.build] || ''}${(u.req || []).includes('ops') ? ' (تحتاج غرفة العمليات)' : ''}</i></div><p class="muted">تعمل مع كل الدول وتُطلى بألوان دولتك.</p>`; }
    else info = `<p class="muted">${it.id ? 'يُطلى به كل مركبات دولتك في المعارك.' : 'كل دولة تقاتل بطلائها الأصلي.'}</p>`;
    const short = it.own ? 0 : it.price - b[it.cur];
    const html = `<div class="sdet r-${it.r}"><div class="sdhd"><span class="srar">${RARITY[it.r].n} · ${KIND_N[k]}</span><h3>${esc(it.n)}</h3></div><div class="sdpv">${prev(it)}</div>${info}
      ${short > 0 ? `<p class="dneed">ينقصك ${Eco.ico(it.cur)}<b>${fm(short)}</b> ${CUR_N[it.cur]}${it.cur === 's' ? ' — القصاصات الأسطورية تُجمع من الإنجازات الصعبة.' : ' — اجمعها من المعارك والمكافآت.'}</p>` : ''}</div>`;
    const acts = [];
    if (!it.own) acts.push(short > 0 ? { l: it.cur === 's' ? 'كيف أجمع القصاصات؟' : 'احصل على المزيد', cls: 'pri', fn: () => Rewards.open(it.cur === 's' ? 'shard' : null, after) } : { l: `شراء ${Eco.ico(it.cur)}${fm(it.price)}`, cls: 'pri', fn: () => buy(k, id, after) });
    else if (k === 'camo') acts.push(it.eq ? { l: '✓ مُجهّز', cls: 'pri' } : { l: 'تجهيز', cls: 'pri', fn: () => { use(k, id); SND.ui('buy'); K.toast('تم تجهيز ' + it.n, 'good'); if (after) after(); } });
    else if (k === 'nat') acts.push({ l: 'اختيار كدولتك', cls: 'pri', fn: () => { use(k, id); K.toast('دولتك الآن: ' + it.n, 'good'); if (after) after(); } });
    else if (k === 'map') acts.push({ l: 'العب عليها', cls: 'pri', fn: () => { use(k, id); Menus.battle(); } });
    acts.push({ l: 'إغلاق' });
    K.box(html, acts, { wide: true, bind: d => fill(d) });
  }
  // a bought or chosen item becomes the current choice (nation, map or worn camouflage)
  function use(k, id) { if (k === 'camo') { Eco.equip(id); Menus.pickSet('camo', id); } else if (k === 'nat' || k === 'map') Menus.pickSet(k === 'nat' ? 'f' : 'map', id); }
  function buy(k, id, after) {
    const it = Eco.item(k, id); if (!it || it.own) return;
    if (!Eco.buy(k, id)) { SND.ui('nomoney'); K.toast('رصيدك لا يكفي', 'warn'); return; }
    use(k, id); SND.ui('buy');
    Rewards.pop([{ item: [k, it.id] }], 'تم الشراء!', k === 'camo' ? 'تم تجهيزه لمعاركك القادمة.' : k === 'nat' ? 'أصبحت دولتك في المعارك.' : k === 'troop' ? 'ستجدها في قائمة الإنتاج مع أي دولة.' : 'جاهزة في قائمة ساحات المعركة.');
    if (after) after();
  }
  function earnInfo() {
    const row = (k, t) => `<div>${Eco.ico(k)}<b>${CUR_N[k]}</b><span>${t}</span></div>`;
    K.box(`<h3 style="margin-bottom:10px">كيف تجمع الأموال؟</h3><div class="earn">${row('c', 'من كل معركة، والمهام، ومكافآت التسجيل اليومية، وعجلة الحظ. تشتري بها العناصر الشائعة والنادرة.')}
      ${row('g', 'من التسجيل اليومي والمهام والإنجازات والانتصار على الصعب والوحشي. تنفقها داخل المعركة لترقية جنودك وإنهاء البناء فوراً.')}
      ${row('m', 'من الإنجازات ومكافآت الرتب والمهام الأسبوعية والتحدي اليومي. تشتري بها العناصر الذهبية.')}
      ${row('s', 'نادرة جداً: الفوز على الوحشي، والمهام الصعبة، و7 أيام تسجيل متتالية، و10 انتصارات متتالية على السهل أو 5 على المتوسط أو 3 على الصعب. بها تشتري كل العناصر الأسطورية.')}</div>`,
      [{ l: 'المكافآت', cls: 'pri', fn: () => Rewards.open() }, { l: 'إغلاق' }]);
  }
  return { open, screen, detail, offer: detail, prev, fill, LOCK, price, ARROW };
})();
