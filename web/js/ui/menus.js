/* ============================================================
   War of Power — القوائم: الشاشة الرئيسية، إعداد المعركة، الصمود، التحدي اليومي، السجل، الإعدادات
   الملف: js/ui/menus.js   ·   ترتيب التحميل: 36 من 43
   ============================================================ */
'use strict';
/* ===== Menus: command hub, battle setup, survival, daily challenge, records, settings ===== */
const MODE_AC = { skirm: '#c8603e', surv: '#d4873a', daily: '#b9945a', mp: '#62a67c', tut: '#c4b47c', rec: '#97a47c', set: '#8f9a7c', home: '#d6b05a' };
const Menus = (function () {
  const K = UI.kit; const { esc, fm, icon } = K;
  const MSVG = {
    skirm: '<path d="M4 20L15 9M15 9l1-5 4-1-1 4-5 1zM20 20L9 9M9 9L8 4 4 3l1 4 5 1"/>',
    surv: '<path d="M12 3c3 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-7z"/>',
    daily: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 13l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z"/>', mp: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1.2"/>',
    tut: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M6 10v10h12V10"/>',
    rec: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/>',
    set: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1L5.3 5.3"/>',
  };
  function gearPath(cx, cy, ro, ri, n) { // n teeth, outer radius ro, root radius ri
    const pts = []; const st = Math.PI * 2 / n;
    for (let i = 0; i < n; i++) { const a = i * st - Math.PI / 2; for (const [k, r] of [[-0.5, ri], [-0.3, ro], [0.3, ro], [0.5, ri]]) { const b = a + k * st * 0.5 * 1.05; pts.push((cx + Math.cos(b) * r).toFixed(2) + ' ' + (cy + Math.sin(b) * r).toFixed(2)); } }
    return 'M' + pts.join('L') + 'Z';
  }
  const svg = (k, cls) => `<svg viewBox="0 0 24 24"${cls ? ' class="' + cls + '"' : ''}>${MSVG[k]}</svg>`;
  
  let last = LS.get('tw_last_v1', null) || { f: 'usa', map: 'forest', opp: [{ f: 'rus', ai: 1, team: 1 }], money: 10000, tod: 'day' };
  const pick = { f: last.f || 'usa', diff: 1, ally: '', raids: 1, money: last.money || 10000, map: last.map || 'forest', opp: (last.opp || [{ f: 'rus', ai: 1, team: 1 }]).map(o => Object.assign({}, o)), tod: last.tod || 'day', camo: last.camo || '', col: last.col >= 0 ? last.col : -1, size: last.size || 1, ffa: last.ffa || 0, survMap: 'forest', survDiff: 1 };
  // the player's choices must be things they own (nations / maps / camouflages are bought in the shop)
  function fixPick() {
    if (!Eco.owns('nat', pick.f)) pick.f = Eco.owns('nat', last.f) ? last.f : Eco.firstOwned('nat');
    if (pick.map !== '__rnd' && !Eco.owns('map', pick.map)) pick.map = Eco.firstOwned('map');
    if (!Eco.owns('map', pick.survMap)) pick.survMap = Eco.firstOwned('map');
    pick.camo = Eco.camo();
  }
  function pickSet(k, v) { pick[k] = v; if (k === 'f' || k === 'map' || k === 'camo') { last[k] = v; LS.set('tw_last_v1', last); } }
  // price / lock badge on a card that is not owned yet
  const lockTag = (k, id) => { const it = Eco.item(k, id); return `<span class="lockb r-${it.r}">${Shop.LOCK}${Shop.price(it)}</span>`; };
  function saveLast(c) { last = { f: c.f, map: c.map, opp: c.opp.map(o => ({ f: o.f, ai: o.ai, team: o.team })), money: c.money, tod: c.tod, camo: c.camo || '', col: c.col, size: c.size || 1, ffa: pick.ffa }; LS.set('tw_last_v1', last); }
  /* ---------------- map previews (generated lazily, cached for the session) ---------------- */
  const PREV = {}; const pq = []; let pumping = false;
  function preview(def, cb) { if (PREV[def.id] !== undefined) { cb(PREV[def.id]); return; } pq.push([def, cb]); if (!pumping) { pumping = true; setTimeout(pump, 40); } }
  function pump() { const job = pq.shift(); if (!job) { pumping = false; return; } const [def, cb] = job; if (PREV[def.id] === undefined) { try { const m = generateSkirmishMap(def, def.max); PREV[def.id] = mapToURL(m); } catch (e) { console.error(e); PREV[def.id] = ''; } } try { cb(PREV[def.id]); } catch (e) { } setTimeout(pump, 20); }
  function mapToURL(m) { const img = minimapImage(m); const c = document.createElement('canvas'); c.width = m.w; c.height = m.h; const x = c.getContext('2d'); x.putImageData(new ImageData(img, m.w, m.h), 0, 0); x.fillStyle = '#fff'; for (const s of m.starts || []) { x.beginPath(); x.arc(s.tx, s.ty, Math.max(2, m.w / 60), 0, TAU); x.fill(); } return c.toDataURL(); }
  function fillPreviews(root) { root.querySelectorAll('[data-prev]').forEach(c => { const def = MAPS.find(m => m.id === c.dataset.prev); if (!def) return; preview(def, url => { if (!url || !c.isConnected) return; const im = new Image(); im.onload = () => { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, c.width, c.height); }; im.src = url; }); }); }
  /* ---------------- title ---------------- */
  /* ---------------- title ---------------- */
  function title() {
    hub();
    const go = () => { window.removeEventListener('pointerup', go, true); window.removeEventListener('keydown', go, true); SND.unlock(); SND.playMusic('menu'); Main.autoFull(); };
    window.addEventListener('pointerup', go, true); window.addEventListener('keydown', go, true);
  }
  /* ---------------- hub ---------------- */
  /* commander picture (or rank badge) inside a circular career-progress ring */
  function xpProgress() { const l = plevel(); const a = PLV[l], b = PLV[l + 1] || PLV[l] + 1; return { l, p: l >= PLV.length - 1 ? 1 : clamp((Profile.xp - a) / (b - a), 0, 1) }; }
  function avatarRing(size, plus) {
    const { l, p } = xpProgress(); const C = 2 * Math.PI * 21;
    const pic = Profile.avatar ? `<img class="aimg" src="${Profile.avatar}" alt="">` : `<span class="aimg none">${rankBadge(l, Math.round(size * 0.62))}</span>`;
    return `<span class="aring" style="--rs:${size}px"><svg class="rg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" class="trk"/><circle cx="24" cy="24" r="21" class="val" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - p)).toFixed(2)}"/></svg>${pic}${Profile.avatar ? `<span class="abadge">${rankBadge(l, Math.round(Math.min(34, size * 0.34)))}</span>` : ''}${plus && !Profile.avatar ? '<span class="aplus">+</span>' : ''}</span>`;
  }
  function profChip() { const { l } = xpProgress(); return `<button class="prof" data-a="name" aria-label="ملف القائد">${avatarRing(52)}<div class="pn"><b>${esc(Profile.name)}</b><span>${PLV_N[l]} · المستوى ${l + 1}</span></div></button>`; }
  function sideScreen(title, back, tabs, cur, pre, body, foot, cls, ac) { // content + section bar on the left (RTL end)
    return K.showScreen(K.top(title, back) + `<div class="ubox"><div class="umain">${body}</div><nav class="uside">${tabs.map(([k, n, ic]) => `<button class="${k === cur ? 'on' : ''}" data-a="${pre}${k}"><svg viewBox="0 0 24 24">${ic}</svg><span>${n}</span></button>`).join('')}</nav></div>${foot || ''}`, cls, ac);
  }
  function tile(k, n, d, x) {
    x = x || {}; const art = (x.bg ? '<div class="mbg"></div>' : '') + (x.img ? `<img data-u="${x.img}" alt="">` : x.bg ? '' : svg(k, 'ms'));
    return `<button class="mt ${x.wide ? 'wide' : ''}" data-a="${k}" style="${K.acv(MODE_AC[k])}"><div class="ma">${art}</div>${x.tag ? `<span class="tag">${x.tag}</span>` : ''}${x.dot ? '<i class="dot"></i>' : ''}<div class="mx"><b>${n}</b><span>${d}</span></div></button>`;
  }
  const GEAR = `<svg class="gear" viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="gearM" cx="38%" cy="32%" r="78%"><stop offset="0" stop-color="#fbf3d6"/><stop offset=".38" stop-color="#d6b86a"/><stop offset=".78" stop-color="#8d6a26"/><stop offset="1" stop-color="#5a4214"/></radialGradient><linearGradient id="gearE" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4c8"/><stop offset="1" stop-color="#5e4616"/></linearGradient><radialGradient id="gearH" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="#2c2410"/><stop offset="1" stop-color="#6e5420"/></radialGradient></defs><g filter="url(#gearS)"><path fill="url(#gearM)" stroke="url(#gearE)" stroke-width="1.2" d="${gearPath(32, 32, 29, 22, 10)}"/><circle cx="32" cy="32" r="15.5" fill="none" stroke="rgba(60,44,12,.55)" stroke-width="1.4"/><circle cx="32" cy="32" r="12.5" fill="url(#gearM)" stroke="rgba(255,244,200,.55)" stroke-width=".8"/><circle cx="32" cy="32" r="7" fill="url(#gearH)" stroke="#3a2c0e" stroke-width="1"/><path d="M14 22a21 21 0 0 1 14-10" fill="none" stroke="rgba(255,250,225,.6)" stroke-width="1.6" stroke-linecap="round"/></g><filter id="gearS" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#1a1608" flood-opacity=".55"/></filter></svg>`;
  const HICO = {
    skirm: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/><path d="M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
    mp: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    surv: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    daily: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3v3H8z"/>',
    tut: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    friends: '<circle cx="8.5" cy="8" r="3.2"/><circle cx="16.5" cy="9" r="2.6"/><path d="M2.5 20c0-3.6 2.7-6 6-6s6 2.4 6 6M14.5 14.6c3.4-.6 7 1.3 7 5.4"/>',
    support: '<path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10z"/>',
    sword: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/>',
  };
  // shop bag and gift box in the same gold metal as the gear (gradients #gGold/#gGoldE/#gSh defined once in index.html)
  const SHOPI = `<svg class="hic" viewBox="0 0 64 64" aria-hidden="true"><g filter="url(#gSh)"><path d="M22.5 25v-6a9.5 9.5 0 0 1 19 0v6" fill="none" stroke="#5a4214" stroke-width="5.2" stroke-linecap="round"/><path d="M22.5 25v-6a9.5 9.5 0 0 1 19 0v6" fill="none" stroke="url(#gGold)" stroke-width="3" stroke-linecap="round"/>
    <path d="M12.6 22.5h38.8l3.1 33.6a3.2 3.2 0 0 1-3.2 3.5H12.7a3.2 3.2 0 0 1-3.2-3.5z" fill="url(#gGold)" stroke="url(#gGoldE)" stroke-width="1.4"/><path d="M14.4 26h35.2" stroke="rgba(255,250,225,.7)" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M32 31.6l2.95 5.98 6.6.96-4.78 4.65 1.13 6.57L32 46.66l-5.9 3.1 1.13-6.57-4.78-4.65 6.6-.96z" fill="#6a4e16" stroke="rgba(255,244,200,.55)" stroke-width=".8"/><circle cx="22.5" cy="26.5" r="2.3" fill="#3a2c0e"/><circle cx="41.5" cy="26.5" r="2.3" fill="#3a2c0e"/></g></svg>`;
  const GIFTI = `<svg class="hic" viewBox="0 0 64 64" aria-hidden="true"><g filter="url(#gSh)"><rect x="11.5" y="28" width="41" height="30.5" rx="3.2" fill="url(#gGold)" stroke="url(#gGoldE)" stroke-width="1.4"/><rect x="8" y="20" width="48" height="11" rx="3" fill="url(#gGold)" stroke="url(#gGoldE)" stroke-width="1.4"/>
    <path d="M28.6 20h6.8v38.5h-6.8z" fill="#cf3a2a" stroke="#7a1a10" stroke-width="1"/><path d="M10.5 23.2h43" stroke="rgba(255,250,225,.7)" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M32 20c-3.5-8.5-14-11.5-15.2-5.5-1 5.4 8.6 6.4 15.2 5.5zM32 20c3.5-8.5 14-11.5 15.2-5.5 1 5.4-8.6 6.4-15.2 5.5z" fill="#e0483a" stroke="#7a1a10" stroke-width="1.3"/><circle cx="32" cy="20" r="3.4" fill="#b52a1d" stroke="#7a1a10" stroke-width="1.2"/></g></svg>`;
  HICO.cont = '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/><path d="M10 9l5 3-5 3z"/>';
  HICO.chev = '<path d="M15 6l-6 6 6 6"/>';
  // mode card: icon badge · title + one short line · chevron, with a folded corner and a large watermark icon
  const mc = (k, n, sub, x = {}) => `<button class="mc ${x.cls || ''}" data-a="${k}">${x.img ? `<img class="mcart" data-u="${x.img}" alt="">` : ''}<svg viewBox="0 0 24 24" class="wm">${HICO[k]}</svg><span class="mi"><svg viewBox="0 0 24 24">${HICO[k]}</svg></span><span class="mt2"><b>${n}</b><em>${sub}</em></span>${x.tag ? `<span class="tag">${x.tag}</span>` : ''}${x.dot ? '<i class="dot"></i>' : ''}<svg viewBox="0 0 24 24" class="chev">${HICO.chev}</svg></button>`;
  function hub() {
    fixPick(); const save = LS.get('tw_save_v1', null); const okSave = save && save.setup && ['skirm', 'surv'].includes(save.setup.kind); const f = last.f || 'usa'; const fr = typeof Friends !== 'undefined' ? Friends.unread() : 0; const rp = Eco.pending().total;
    const sv = okSave ? String(save.label || '').split(' — ') : null;
    const s = K.showScreen(`<div class="hub hub3"><div class="hhead">${profChip()}<div class="sp"></div>
        <button class="hbtn frb" data-a="friends" aria-label="الأصدقاء"><svg viewBox="0 0 24 24">${HICO.friends}</svg><span>الأصدقاء</span>${fr ? `<u class="bdg">${fr > 9 ? '9+' : fr}</u>` : ''}</button>
        <button class="hbtn sup" data-a="support" aria-label="ادعمنا"><svg viewBox="0 0 24 24">${HICO.support}</svg><span>ادعمنا</span></button>
        <button class="ibtn hico gift${rp ? ' pend' : ''}" data-a="rewards" aria-label="المكافآت">${GIFTI}${rp ? `<u class="bdg">${rp > 9 ? '9+' : rp}</u>` : ''}</button>
        <button class="ibtn hico shopb" data-a="shop" aria-label="المتجر">${SHOPI}</button>
        <button class="ibtn gearb" data-a="settings" aria-label="الإعدادات">${GEAR}</button></div>
      <div class="hmain3"><div class="hero3"><div class="htopo"></div><div class="hflag">${EMBLEM[f]}<b>${esc(FACTIONS[f].name)}</b></div><div class="hart"><img class="h1" alt=""><img class="h2" alt=""></div>
        ${okSave ? mc('cont', 'متابعة اللعبة', esc(sv[0] || '') + (sv[1] ? ' · ' + esc(sv[1]) : ''), { cls: 'cta' }) : mc('skirm', 'بدء لعبة', 'لا توجد لعبة محفوظة — ابدأ معركة جديدة', { cls: 'cta' })}</div>
        <div class="hmodes">${mc('skirm', 'بدء لعبة', 'اختر الساحة والخصوم والصعوبة', { cls: 'big', img: f + '_mbt' })}${mc('mp', 'اللعب الجماعي', 'هوسبوت أو أونلاين')}${mc('surv', 'طور الصمود', 'موجات لا تنتهي')}${(() => { const n = chalOpen('d') + chalOpen('w') + chalOpen('m'); return mc('daily', 'التحديات', n ? 'يومية · أسبوعية · شهرية — ' + n + ' بانتظارك' : 'أنجزت كل التحديات ✓', { tag: chalOpen('d') ? 'اليوم' : '✓', dot: n > 0 }); })()}${mc('tut', 'التدريب', 'تعلّم القيادة')}</div></div></div>`, 'menuS', MODE_AC.home);
    if (save && !okSave) LS.del('tw_save_v1');
    icon(s.querySelector('.hero3 .h1'), 'u', f + '_mbt'); icon(s.querySelector('.hero3 .h2'), 'u', UNITS[f + '_jet'] ? f + '_jet' : f + '_heli');
    s.querySelectorAll('img[data-u]').forEach(img => { if (!img.classList.contains('h1') && !img.classList.contains('h2')) icon(img, 'u', img.dataset.u); });
    K.bind(s, { name: () => userScreen('me'), settings: () => settings(), support: () => support(), friends: () => Friends.screen(), cont: () => Main.loadSaved(), shop: () => Shop.open(), rewards: () => Rewards.open(),
      skirm: () => battleSetup(), surv: () => survivalSetup(), daily: () => dailyScreen(), mp: () => lobby(), tut: () => Main.startTutorial() });
  }
  /* ---------------- support us ---------------- */
  const SUPPORT = { donate: 'https://app.binance.com/uni-qr/request-to-pay?billOrderId=464554537802719232&billType=request_a_payment' }; // donation link (Binance Pay)
  function support() {
    const s = K.showScreen(K.top('ادعمنا') + `<div class="supbox"><div class="card sdon"><svg viewBox="0 0 24 24" class="sic">${HICO.support}</svg><h3>ادعم تطوير اللعبة</h3><p class="muted">تبرعك يساعدنا على إضافة خرائط ووحدات وأطوار جديدة.</p><button class="btn pri big" data-a="donate">تبرّع عبر Binance Pay</button></div>
      <div class="card sdon"><svg viewBox="0 0 24 24" class="sic">${HICO.friends}</svg><h3>شارك اللعبة</h3><p class="muted">ادعُ أصدقاءك ليلعبوا معك أونلاين.</p><button class="btn big" data-a="share">مشاركة</button></div></div>`, 'setup sup', MODE_AC.home);
    K.bind(s, { donate: () => { let w = null; try { w = window.open(SUPPORT.donate, '_blank', 'noopener'); } catch (e) { } if (!w) Friends.copy(SUPPORT.donate); },
      share: () => { const t = '⚔ العب معي «War of Power» — رمز صداقتي: ' + (typeof Friends !== 'undefined' ? Friends.myCode() : ''); if (navigator.share) navigator.share({ text: t }).catch(() => { }); else Friends.copy(t); } });
  }
  function lobby() { if (typeof Lobby !== 'undefined') Lobby.open(); else K.toast('اللعب الجماعي غير متاح في هذه النسخة', 'warn'); }
  /* ---------------- nation cards ---------------- */
  function nationCards(sel, small) { return FACTION_IDS.map(f => { const F = FACTIONS[f]; const own = Eco.owns('nat', f); return `<button class="ncard ${sel === f ? 'on' : ''}${own ? '' : ' locked r-' + Eco.item('nat', f).r}" data-a="n_${f}" style="${K.tcv(TEAMCOL[F.col])}">${own ? '' : `<i class="nlk">${Shop.LOCK}</i>`}<div class="nemb">${EMBLEM[f]}</div><b>${F.name}</b>${own ? `<span>${F.theme}</span>` : Shop.price(Eco.item('nat', f))}${small ? '' : `<em>${F.perk}</em><div class="nunits"><img data-u="${f}_mbt"><img data-u="${f}_jet" ${UNITS[f + '_jet'] ? '' : 'data-alt="' + f + '_heli"'}><img data-u="${f}_${f === 'frj' ? 'scout' : 'heli'}"></div>`}</button>`; }).join(''); }
  
  const mapCard = (m, on) => `<button class="mapc ${on ? 'on' : ''}${Eco.owns('map', m.id) ? '' : ' locked'}" data-a="m_${m.id}">${Eco.owns('map', m.id) ? '' : lockTag('map', m.id)}<canvas width="${Math.round(m.w * 0.9)}" height="${Math.round(m.h * 0.45)}" data-prev="${m.id}"></canvas><b>${m.n}</b><span>${m.w}×${m.h} · حتى ${m.max} لاعبين</span><em>${m.d}</em></button>`;
  /* ---------------- custom battle: 1) map pictures only  2) setup in sections ---------------- */
  const BICO = { army: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>', sides: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/><path d="M5 14l4 4M7 17l-3 3M3 19l2 2"/>', map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>' };
  const CMU = {};
  function camoURL(k) { if (CMU[k]) return CMU[k]; try { const src = camoPattern(k); const c = document.createElement('canvas'); c.width = 96; c.height = 60; c.getContext('2d').drawImage(src, 0, 0, 160, 100, 0, 0, 96, 60); return (CMU[k] = c.toDataURL()); } catch (e) { return ''; } }
  const myCol = () => pick.col >= 0 ? pick.col : FACTIONS[pick.f].col;
  let cfgTab = 'army';
  const THEME_N = { desert: 'صحراء', snow: 'ثلوج', temperate: 'غابات', mountain: 'جبال', steppe: 'سهوب', mixed: 'متنوعة', lava: 'براكين' };
  const THEME_I = { all: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    desert: '<path d="M3 19c3-3 6-3 9 0s6 3 9 0"/><path d="M10 15V7a1.6 1.6 0 0 1 3.2 0v8M13.2 10.5h1.6a1.6 1.6 0 0 0 1.6-1.6V8M10 12.5H8.4a1.6 1.6 0 0 1-1.6-1.6V10"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>',
    temperate: '<path d="M8 3l-4 7h8zM8 9l-5 7h10zM8 16v5M17 6l-3.5 6h7zM17 11l-4 6h8zM17 17v4"/>',
    mountain: '<path d="M2 20l7-12 4 6 3-4 6 10z"/><path d="M7.4 10.8L9 12l1.4-1.6"/>',
    steppe: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    mixed: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>' };
  const tsvg = t => `<svg viewBox="0 0 24 24">${THEME_I[t] || THEME_I.mixed}</svg>`;
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.4l-5.7 3 1.1-6.4-4.6-4.5 6.4-.9z"/></svg>';
  let bpTheme = 'all';
  const sizeN = m => m.w >= 288 ? 'ضخمة جداً' : m.w >= 192 ? 'كبيرة' : m.w >= 160 ? 'متوسطة' : 'صغيرة';
  function battleSetup() {
    fixPick(); const fv = LS.get('tw_favmaps', []) || []; const themes = ['all', ...new Set(MAPS.map(m => m.theme))];
    const own = m => Eco.owns('map', m.id);
    const list = MAPS.filter(m => bpTheme === 'all' || m.theme === bpTheme).sort((a, b) => own(b) - own(a) || fv.includes(b.id) - fv.includes(a.id));
    const card = m => `<button class="mcard ${pick.map === m.id ? 'on' : ''}${own(m) ? '' : ' locked'}" data-a="g_${m.id}"><span class="mimg" data-bgprev="${m.id}"></span>${own(m) ? '' : lockTag('map', m.id)}${m.nu ? '<span class="mnew">جديدة</span>' : ''}<span class="mth">${tsvg(m.theme)}</span><span class="mst ${fv.includes(m.id) ? 'on' : ''}" data-fav="${m.id}" role="button" aria-label="مفضلة">${STAR}</span><span class="mn"><b>${esc(m.n)}</b><span>${THEME_N[m.theme] || ''} · ${sizeN(m)}</span></span></button>`;
    const foes = pick.opp.filter(o => o.team !== 0); const def = MAPS.find(m => m.id === pick.map); const lv = AI_LEVELS[(foes[0] || {}).ai | 0];
    const s = K.showScreen(`<div class="bpick"><div class="bphead"><button class="bpback back" data-a="menu" aria-label="رجوع"><svg viewBox="0 0 24 24"><path d="M3.5 12h16M13.5 5.5l6.5 6.5-6.5 6.5"/></svg></button><h2>اختر ساحة المعركة</h2>
      <div class="bpchips">${themes.map(t => `<button class="chip ${t === bpTheme ? 'on' : ''}" data-a="th_${t}">${tsvg(t)}<span>${t === 'all' ? 'الكل' : THEME_N[t] || t}</span></button>`).join('')}</div></div>
      <div class="bpgrid"><button class="mcard rnd ${pick.map === '__rnd' ? 'on' : ''}" data-a="g___rnd"><svg viewBox="0 0 24 24" class="dice"><rect x="3" y="3" width="18" height="18" rx="4.5"/><circle cx="8" cy="8" r="1.7" fill="#4a4a2b" stroke="none"/><circle cx="16" cy="8" r="1.7" fill="#4a4a2b" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="#4a4a2b" stroke="none"/><circle cx="8" cy="16" r="1.7" fill="#4a4a2b" stroke="none"/><circle cx="16" cy="16" r="1.7" fill="#4a4a2b" stroke="none"/></svg><b>خريطة عشوائية</b></button>${list.map(card).join('')}</div>
      <div class="bpbar"><div class="bpsum"><i>ضد</i>${foes.slice(0, 4).map(o => EMBLEM[o.f]).join('')}<span>${def ? esc(def.n) : 'خريطة عشوائية'}${lv ? ' · ' + lv.n : ''}</span></div><span class="sp"></span>
        <button class="btn big" data-a="cfg"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>إعدادات المعركة</button>
        <button class="btn pri big" data-a="start"><svg viewBox="0 0 24 24"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/></svg>ابدأ المعركة</button></div></div>`, 'setup bp', MODE_AC.skirm);
    s.querySelectorAll('[data-bgprev]').forEach(e => { const d = MAPS.find(m => m.id === e.dataset.bgprev); preview(d, url => { if (url && e.isConnected) e.style.backgroundImage = `url(${url})`; }); });
    s.querySelectorAll('[data-fav]').forEach(e => e.addEventListener('click', ev => { ev.stopPropagation(); const id = e.dataset.fav; const f2 = LS.get('tw_favmaps', []) || []; const i = f2.indexOf(id); if (i >= 0) f2.splice(i, 1); else f2.push(id); LS.set('tw_favmaps', f2); SND.ui('tab'); battleSetup(); }));
    const map = { cfg: () => battleConfig('army'), start: () => launch() };
    for (const t of themes) map['th_' + t] = () => { bpTheme = t; battleSetup(); };
    map['g___rnd'] = () => { pick.map = '__rnd'; battleSetup(); };
    for (const m of MAPS) map['g_' + m.id] = () => { if (!own(m)) { Shop.offer('map', m.id, () => battleSetup()); return; } if (pick.map === m.id) { battleConfig('map'); return; } pick.map = m.id; battleSetup(); };
    K.bind(s, map);
  }
  // start with the current choices (a random map is drawn among those big enough for everyone)
  function launch() {
    fixPick(); let id = pick.map; if (id === '__rnd' || !MAPS.some(m => m.id === id)) { const mine = MAPS.filter(m => Eco.owns('map', m.id)); const ok = mine.filter(m => m.max >= pick.opp.length + 1); id = (ok.length ? ok : mine)[Math.floor(Math.random() * (ok.length || mine.length))].id; }
    const def = MAPS.find(m => m.id === id); let n = 0;
    const c = { f: pick.f, map: def.id, opp: pick.opp.slice(0, def.max - 1).map(o => ({ f: o.f, ai: o.ai | 0, team: o.team === 0 ? 0 : (pick.ffa ? ++n : 1) })), money: pick.money, tod: pick.tod, camo: pick.camo, col: pick.col, size: pick.size };
    if (!c.opp.some(o => o.team !== 0)) c.opp.push({ f: FACTION_IDS.find(x => x !== pick.f), ai: 1, team: 1 });
    saveLast(c); Main.startSkirmish(c);
  }
  function battleConfig(tab) {
    if (tab) cfgTab = tab; fixPick(); const rnd = pick.map === '__rnd'; const def = rnd ? MAPS.filter(m => Eco.owns('map', m.id)).reduce((a, m) => m.max > a.max ? m : a, MAPS[0]) : (MAPS.find(m => m.id === pick.map) || MAPS[0]); if (!rnd) pick.map = def.id; const room = def.max - 1;
    pick.opp = pick.opp.slice(0, room);
    if (!pick.opp.some(o => o.team !== 0)) { if (pick.opp.length >= room) pick.opp.pop(); pick.opp.push({ f: FACTION_IDS.find(x => x !== pick.f), ai: 1, team: 1 }); }
    applyCamo(pick.f, pick.camo);
    const ix = pick.opp.map((o, i) => [o, i]); const allies = ix.filter(([o]) => o.team === 0), foes = ix.filter(([o]) => o.team !== 0); const full = pick.opp.length >= room;
    const row = ([o, i], del) => `<div class="opp"><span class="oflag">${EMBLEM[o.f]}</span><select data-o="${i}" data-k="f" aria-label="الدولة">${FACTION_IDS.map(f => `<option value="${f}" ${o.f === f ? 'selected' : ''}>${FACTIONS[f].name}</option>`).join('')}</select><select data-o="${i}" data-k="ai" aria-label="الصعوبة">${AI_LEVELS.map((L, j) => `<option value="${j}" ${(o.ai | 0) === j ? 'selected' : ''}>${L.n}</option>`).join('')}</select>${del ? `<button class="btn ghost sm" data-a="del${i}" aria-label="حذف">✕</button>` : ''}</div>`;
    let body;
    if (cfgTab === 'army') body = `<div class="card"><h3>دولتك</h3><div class="ngrid small">${nationCards(pick.f, true)}</div></div>
      <div class="card"><h3>تمويه الوحدات</h3><div class="cmrow"><img class="cpv" data-u="${pick.f}_mbt" alt=""><div class="cmgrid">${CAMO_OPTS.filter(([k]) => Eco.owns('camo', k)).map(([k, n]) => `<button class="cmo ${(pick.camo || '') === k ? 'on' : ''}" data-a="cm_${k || 'def'}"><i style="background-image:url(${camoURL(k || FACTIONS[pick.f].camo0)})"></i><span>${n}</span></button>`).join('')}<button class="cmo more" data-a="cmshop"><i>+</i><span>المزيد في المتجر</span></button></div></div></div>
      <div class="card"><h3>لونك على الخريطة المصغرة</h3><div class="clrow">${TEAMCOL.map((c, i) => `<button class="clo ${myCol() === i ? 'on' : ''}" data-a="cl_${i}" style="--c:${c}" aria-label="لون ${i + 1}"></button>`).join('')}</div></div>`;
    else if (cfgTab === 'sides') body = `<div class="card"><h3>الحلفاء</h3>${allies.length ? allies.map(a => row(a, true)).join('') : '<p class="muted">لا يوجد حلفاء — ستقاتل وحدك.</p>'}${full ? '' : '<button class="btn sm" data-a="addA">+ إضافة حليف</button>'}</div>
      <div class="card"><h3>الأعداء</h3>${foes.map(a => row(a, foes.length > 1)).join('')}${full ? '' : '<button class="btn sm" data-a="addE">+ إضافة عدو</button>'}${foes.length > 1 ? `<div class="frow" style="margin-top:8px"><label>الأعداء</label>${K.seg('ffa', [[0, 'متحالفون ضدك'], [1, 'كلٌّ لنفسه']], pick.ffa ? 1 : 0)}</div>` : ''}</div>
      <p class="muted">الحاسوب يبدأ مثلك تماماً بلا أي امتياز، والصعوبة تغيّر مهارته فقط. هذه الخريطة تتسع لـ ${def.max} لاعبين.</p>`;
    else body = `<div class="card mapcfg">${rnd ? '' : '<canvas width="160" height="160" data-prev="' + def.id + '"></canvas>'}<div><b>${rnd ? 'خريطة عشوائية' : esc(def.n)}</b><span class="muted">${rnd ? 'تُختار خريطة مناسبة لعدد اللاعبين عند البدء.' : esc(def.d)}</span><button class="btn sm" data-a="chmap">تغيير الخريطة</button></div></div>
      <div class="card"><h3>إعدادات الخريطة</h3><div class="frow"><label>الحجم</label>${K.seg('size', [[0.75, 'صغيرة'], [1, 'متوسطة'], [1.5, 'كبيرة'], [2, 'ضخمة'], [2.6, 'ضخمة جداً']], pick.size)}</div>
      <div class="frow"><label>المال البدائي</label>${K.seg('money', [[5000, '5,000'], [10000, '10,000'], [20000, '20,000'], [50000, '50,000']], pick.money)}</div>
      <div class="frow"><label>الوقت</label>${K.seg('tod', [['day', 'نهار'], ['dusk', 'غروب'], ['night', 'ليل']], pick.tod)}</div></div>`;
    const tabs = [['army', 'قواتك', BICO.army], ['sides', 'الحلفاء والأعداء', BICO.sides], ['map', 'الخريطة', BICO.map]];
    const s = sideScreen('إعداد المعركة', 'gal', tabs, cfgTab, 'bt_', body, cfgTab === 'map' ? '' : '<div class="sfoot"><button class="btn acc big" data-a="start">ابدأ المعركة ⚔</button></div>', 'setup', MODE_AC.skirm); // no start button on the map-settings tab
    fillPreviews(s); s.querySelectorAll('img[data-u]').forEach(im => icon(im, 'u', im.dataset.u));
    const addP = team => { const used = new Set([pick.f, ...pick.opp.map(o => o.f)]); const f = FACTION_IDS.find(x => !used.has(x)) || FACTION_IDS.find(x => x !== pick.f); pick.opp.push({ f, ai: 1, team }); battleConfig(); };
    const map = { gal: () => battleSetup(), chmap: () => battleSetup(), addA: () => addP(0), addE: () => addP(1), cmshop: () => Shop.open('camo', () => battleConfig()),
      start: () => launch() };
    for (const [k] of tabs) map['bt_' + k] = () => battleConfig(k);
    for (const f of FACTION_IDS) map['n_' + f] = () => { if (!Eco.owns('nat', f)) { Shop.offer('nat', f, () => battleConfig()); return; } pickSet('f', f); battleConfig(); };
    for (const [k] of CAMO_OPTS) map['cm_' + (k || 'def')] = () => { Eco.equip(k); pickSet('camo', k); battleConfig(); };
    TEAMCOL.forEach((c, i) => { map['cl_' + i] = () => { pick.col = i; battleConfig(); }; });
    pick.opp.forEach((o, i) => { map['del' + i] = () => { pick.opp.splice(i, 1); battleConfig(); }; });
    K.bind(s, map); K.segBind(s, (k, v) => { if (k === 'money') pick.money = +v; if (k === 'tod') pick.tod = v; if (k === 'size') pick.size = +v; if (k === 'ffa') pick.ffa = +v; });
    s.querySelectorAll('select').forEach(sl => sl.addEventListener('change', () => { const o = pick.opp[+sl.dataset.o]; const k = sl.dataset.k; o[k] = k === 'f' ? sl.value : +sl.value; if (k === 'f') battleConfig(); }));
  }
  /* ---------------- survival ---------------- */
  function survivalSetup() {
    const maps = MAPS.filter(m => m.max >= 2); fixPick();
    const render = () => {
      const s = K.showScreen(K.top('طور الصمود') + `<div class="setbox two"><div style="display:flex;flex-direction:column;gap:10px"><div class="card"><h3>دولتك</h3><div class="ngrid small">${nationCards(pick.f, true)}</div></div>
        <div class="card"><h3>الشدة</h3>${K.seg('sd', AI_LEVELS.filter(L => !L.adapt).map((L, i) => [i, L.n]), pick.survDiff)}<p class="muted">تهجم موجات العدو من أطراف الخريطة وتزداد قوة مع كل موجة، وكل خامس موجة يقودها زعيم بوحدات نخبة. اصمد أطول ما تستطيع — كل موجة تمنحك مالاً إضافياً.</p><div class="muted">أفضل نتيجة لك: <b style="color:var(--acl)">${Profile.stats.waves || 0} موجة</b></div></div></div>
        <div class="card"><h3>ساحة الصمود</h3><div class="maps">${maps.map(m => mapCard(m, m.id === pick.survMap)).join('')}</div></div></div>
        <div class="sfoot"><button class="btn acc big" data-a="start">ابدأ الصمود 🔥</button></div>`, 'setup', MODE_AC.surv);
      fillPreviews(s); const map = { start: () => Main.startSurvival({ f: pick.f, map: pick.survMap, diff: pick.survDiff, camo: pick.camo }) };
      for (const f of FACTION_IDS) map['n_' + f] = () => { if (!Eco.owns('nat', f)) { Shop.offer('nat', f, render); return; } pickSet('f', f); render(); };
      for (const m of maps) map['m_' + m.id] = () => { if (!Eco.owns('map', m.id)) { Shop.offer('map', m.id, render); return; } pick.survMap = m.id; render(); };
      K.bind(s, map); K.segBind(s, (k, v) => { if (k === 'sd') pick.survDiff = +v; });
    };
    render();
  }
  /* ---------------- challenges: daily · weekly · monthly sections ---------------- */
  let chalTab = 'd';
  const CHAL_SEC = { d: 'تحديات يومية', w: 'تحديات أسبوعية', m: 'تحديات شهرية' };
  const CHAL_IC = { d: MSVG.daily, w: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M6.5 14h11M6.5 17.5h7"/>', m: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 12.3l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z"/>' };
  function leftTxt(ms) { const m = Math.max(1, Math.floor(ms / 60000)); const d = Math.floor(m / 1440); if (d >= 1) return d === 1 ? 'يوم' : d === 2 ? 'يومين' : d + ' أيام'; const hh = Math.floor(m / 60); return hh >= 1 ? hh + ' س ' + (m % 60) + ' د' : (m % 60) + ' دقيقة'; }
  function dailyScreen(tab) {
    if (tab) chalTab = tab; if (!CHAL_N[chalTab]) chalTab = 'd'; const list = chalList(chalTab);
    const card = c => { const def = MAPS.find(m => m.id === c.map) || MAPS[0]; const trial = !Eco.owns('nat', c.f) || !Eco.owns('map', c.map); const ai = c.opp[0].ai | 0;
      return `<div class="card dchal${c.done ? ' done' : ''} t${chalTab}"><canvas width="200" height="120" data-prev="${c.map}"></canvas>
        <div class="dcx"><div class="dct"><b>${esc(c.mod.n)}</b><i class="dlv d${ai}">${AI_LEVELS[ai].n}</i></div><span class="muted">${esc(c.mod.d)}</span>
        <div class="dm">${trial ? '<i class="trial">تجربة مجانية</i>' : ''}<i>دولتك: ${esc(FACTIONS[c.f].name)}</i><i>الخريطة: ${esc(def.n)}</i><i>الخصوم: ${c.opp.map(o => esc(FACTIONS[o.f].short)).join('، ')}${c.opp.length > 1 ? (c.opp[0].team === c.opp[1].team ? ' (متحالفون)' : ' (كلٌّ لنفسه)') : ''}</i><i>${({ day: 'نهار', dusk: 'غروب', night: 'ليل' })[c.tod] || 'نهار'}</i>${c.money !== 10000 ? `<i>المال: ${fm(c.money)}</i>` : ''}${c.size > 1 ? '<i>خريطة ' + (c.size >= 2 ? 'ضخمة' : 'كبيرة') + '</i>' : ''}</div>
        <div class="drw"><span>الجائزة</span>${Eco.rwHTML(c.rw)}</div></div>
        <div class="dgo">${c.done ? '<span class="ddone">✓ أنجزته</span>' : `<button class="btn acc" data-a="cg_${c.i}"><svg viewBox="0 0 24 24"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/></svg>ابدأ</button>`}</div></div>`; };
    const body = `<div class="dhead"><b>${CHAL_SEC[chalTab]}</b><span>تتجدد خلال ${leftTxt(chalLeft(chalTab))}</span></div>${list.map(card).join('')}
      <p class="muted">نفس التحديات لكل اللاعبين. الفوز يُنجز التحدي مرة واحدة في فترته، وتُضاف جائزته إلى مكافأة المعركة. ${chalTab === 'd' ? 'أكملت التحدي اليومي ' + (Profile.stats.daily || 0) + ' مرة.' : ''}</p>`;
    const tabs = ['d', 'w', 'm'].map(k => { const n = chalOpen(k); return [k, CHAL_SEC[k] + (n ? `<u class="bdg">${n}</u>` : ''), CHAL_IC[k]]; });
    const s = sideScreen('التحديات', 'menu', tabs, chalTab, 'ch_', body, '', 'setup chal', MODE_AC.daily);
    fillPreviews(s); const map = {}; for (const k of ['d', 'w', 'm']) map['ch_' + k] = () => dailyScreen(k);
    for (const c of list) map['cg_' + c.i] = () => Main.startSkirmish({ f: c.f, map: c.map, opp: c.opp, money: c.money, tod: c.tod, size: c.size, daily: c.k === 'd' ? c.key : null, chal: { k: c.k, key: c.key, i: c.i }, seed: c.seed, camo: Eco.camo() });
    K.bind(s, map);
  }
  /* ---------------- records ---------------- */
  /* ---------------- commander screen: picture, name, record, achievements (side bar on the left) ---------------- */
  let userTab = 'me';
  function pickAvatar(done) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none'; document.body.appendChild(inp);
    inp.addEventListener('cancel', () => inp.remove());
    inp.addEventListener('change', () => {
      const file = inp.files && inp.files[0]; inp.remove(); if (!file) return;
      const rd = new FileReader();
      rd.onload = () => { const im = new Image(); im.onload = () => {
        const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); const m = Math.min(im.width, im.height);
        x.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, S, S); // centred square crop
        const old = Profile.avatar; Profile.avatar = c.toDataURL('image/jpeg', 0.85);
        if (!LS.set('tw_profile_v1', Profile)) { Profile.avatar = old; K.toast('تعذّر حفظ الصورة على الجهاز', 'warn'); return; }
        SND.ui('click'); done();
      }; im.onerror = () => K.toast('تعذّر فتح الصورة', 'warn'); im.src = rd.result; };
      rd.readAsDataURL(file);
    });
    inp.click();
  }
  function userScreen(tabk) {
    if (tabk) userTab = tabk; if (userTab !== 'rec') userTab = 'me'; const St = Profile.stats; const got = ACH.filter(a => Profile.ach[a.id]).length; const { l, p } = xpProgress(); let body = '';
    if (userTab === 'me') body = `<div class="card ume"><button class="apick" data-a="pic" aria-label="${Profile.avatar ? 'تغيير الصورة' : 'إضافة صورة'}">${avatarRing(150, true)}</button>
        <div class="uinfo"><label class="ulab" for="uname">اسم القائد</label><input class="inp" id="uname" maxlength="18" value="${esc(Profile.name)}" autocomplete="off">
        <div class="urank">${PLV_N[l]} · المستوى ${l + 1}</div><div class="muted">خبرة ${fm(Profile.xp)}${l < PLV.length - 1 ? ' / ' + fm(PLV[l + 1]) + ' للترقية' : ' — أعلى رتبة'} (${Math.round(p * 100)}%)</div>
        <div class="muted">${Profile.avatar ? 'المس الصورة لتغييرها.' : 'المس + لإضافة صورة من معرض الصور.'}</div></div></div>
      <div class="card uwal"><h3>أموالك</h3><div class="uwr">${[['c', 'عملات'], ['g', 'جواهر'], ['m', 'أوسمة'], ['s', 'قصاصات']].map(([k, n]) => `<div class="uw ${k}">${Eco.ico(k)}<b>${fm(Eco.bal()[k])}</b><span>${n}</span></div>`).join('')}
        <div class="uwb"><button class="btn sm pri" data-a="ushop">المتجر</button><button class="btn sm" data-a="urew">المكافآت</button></div></div>
        <div class="muted">الإنجازات: ${got}/${ACH.length} — تجدها مع مكافآتها في «المكافآت».</div></div>`;
    else if (userTab === 'rec') body = `<div class="card"><h3>المسيرة العسكرية</h3><div class="stgrid">${[[St.played, 'معارك'], [St.wins, 'انتصارات'], [St.losses, 'هزائم'], [St.played ? Math.round(St.wins / St.played * 100) + '%' : '—', 'نسبة الفوز'], [fm(St.kills), 'إصابات'], [fm(St.bkills || 0), 'مبانٍ مدمرة'], [fm(St.air || 0), 'طائرات مُسقطة'], [fmtTime(St.time || 0), 'زمن القتال'], [St.waves || 0, 'أفضل صمود'], [St.daily || 0, 'تحديات يومية'], [St.mpWins || 0, 'انتصارات جماعية']].map(([v, n]) => `<div><b>${v}</b><span>${n}</span></div>`).join('')}</div>
      <h3 style="margin-top:12px">الانتصارات حسب الدولة</h3><div class="stgrid">${FACTION_IDS.map(f => `<div style="${K.tcv(TEAMCOL[FACTIONS[f].col])}border-color:var(--tc)">${EMBLEM[f]}<b>${(St.facWins || {})[f] || 0}</b><span>${esc(FACTIONS[f].short)}</span></div>`).join('')}</div></div>
      <div class="card"><h3>أعلى النقاط</h3>${Profile.scores.length ? `<table class="sctab"><tr><th>#</th><th>النقاط</th><th>الطور</th><th>الدولة</th><th>النتيجة</th><th>المدة</th><th>التاريخ</th></tr>${Profile.scores.slice(0, 15).map((e, i) => `<tr><td>${i + 1}</td><td><b>${fm(e.score)}</b></td><td>${esc(e.mode || '')}</td><td>${esc((FACTIONS[e.f] || {}).short || '')}</td><td class="${e.win ? 'w' : 'l'}">${e.win ? 'نصر' : e.waves ? e.waves + ' موجة' : 'هزيمة'}</td><td>${fmtTime(e.t || 0)}</td><td>${esc(e.date || '')}</td></tr>`).join('')}</table>` : '<p class="muted">لا توجد نتائج بعد — خض معركتك الأولى!</p>'}</div>`;
    const tabs = [['me', 'القائد', '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'], ['rec', 'السجل', MSVG.rec]];
    const s = sideScreen('ملف القائد', 'menu', tabs, userTab, 'ut_', body, '', 'store user', MODE_AC.rec);
    const map = { pic: () => pickAvatar(() => userScreen('me')), ushop: () => Shop.open(null, () => userScreen('me')), urew: () => Rewards.open(null, () => userScreen('me')) }; for (const [k] of tabs) map['ut_' + k] = () => userScreen(k);
    K.bind(s, map);
    const nm = s.querySelector('#uname');
    if (nm) { const save = () => { const v = (nm.value || '').trim().slice(0, 18); if (v && v !== Profile.name) { Profile.name = v; saveProfile(); } };
      nm.addEventListener('change', save); nm.addEventListener('blur', save); nm.addEventListener('keydown', e => { if (e.key === 'Enter') { save(); nm.blur(); K.toast('تم حفظ الاسم', 'good'); } }); }
  }
  /* ---------------- settings ---------------- */
  let setTab = 'gfx', guideSec = 'basics';
  function settings(fromGame, tab) {
    if (tab) setTab = tab;
    const sl = (k, l) => `<div class="frow"><label>${l}</label><input type="range" min="0" max="1" step="0.05" value="${Settings[k]}" data-s="${k}"><b class="sv">${Math.round(Settings[k] * 100)}%</b></div>`;
    const dv = Device.info || {};
    const B = {
      gfx: `<div class="card"><h3>الرسوميات</h3><div class="frow"><label>الجودة</label>${K.seg('quality', [['auto', 'تلقائي'], [0.5, 'منخفضة جداً'], [0.62, 'منخفضة'], [0.8, 'متوسطة'], [1, 'عالية']], Settings.qAuto ? 'auto' : Settings.quality)}</div>${dv.tierN ? '<div class="muted">الضبط التلقائي المقترح لجهازك: ' + esc(dv.tierN) + '</div>' : ''}
        <div class="frow"><label>وضع الأجهزة الضعيفة</label>${K.seg('lite', [['auto', 'تلقائي'], [1, 'مفعّل'], [0, 'معطّل']], Settings.liteMode === undefined || Settings.liteMode === 'auto' ? 'auto' : Settings.liteMode)}</div><div class="muted">يخفّض الدقة إلى 30 إطاراً ويخفف الظلال والمؤثرات لتعمل اللعبة بسلاسة على الهواتف القديمة.</div>
        <div class="frow"><label>اهتزاز الشاشة</label>${K.seg('shake', [[1, 'مفعّل'], [0, 'معطّل']], Settings.shake ? 1 : 0)}</div><div class="frow"><label>تقليل الحركة</label>${K.seg('rm', [[0, 'لا'], [1, 'نعم']], Settings.reduceMotion ? 1 : 0)}</div>
        <div class="frow"><label>ملء الشاشة</label>${K.seg('full', [[1, 'تلقائي'], [0, 'معطّل']], Settings.full === false ? 0 : 1)}</div></div>`,
      snd: `<div class="card"><h3>الصوت</h3>${sl('master', 'الصوت العام')}${sl('sfx', 'المؤثرات')}${sl('music', 'الموسيقى')}${sl('amb', 'الأجواء')}</div>`,
      ctl: `<div class="card"><h3>التحكم والواجهة</h3><div class="frow"><label>أشرطة التحمّل</label>${K.seg('bars', [['selected', 'المحدد فقط'], ['damaged', 'المصاب'], ['always', 'دائماً']], Settings.bars)}</div>
        <div class="frow"><label>تحريك بالحواف</label>${K.seg('edge', [[1, 'مفعّل'], [0, 'معطّل']], Settings.edge ? 1 : 0)}</div><div class="frow"><label>تلميحات</label>${K.seg('hints', [[1, 'مفعّلة'], [0, 'معطّلة']], Settings.hints ? 1 : 0)}</div><div class="frow"><label>الإشعارات المنبثقة</label>${K.seg('pops', [[1, 'تظهر'], [0, 'مكتومة']], Settings.popups === false ? 0 : 1)}</div>
        <div class="frow"><label>تأكيد ترقية المباني</label>${K.seg('upc', [[1, 'نافذة تأكيد'], [0, 'ترقية فورية']], Settings.upConfirm === false ? 0 : 1)}</div><div class="muted">عند اختيار «ترقية فورية» تُرقّى المباني ويُركَّب الدفاع الجوي بلمسة واحدة على الأيقونة.</div>
        <div class="frow"><label>إشعارات الإنجازات</label>${K.seg('achp', [[1, 'تظهر'], [0, 'مكتومة']], Settings.achPop === false ? 0 : 1)}</div>
        <div class="frow"><label>حركة المكافآت</label>${K.seg('rfx', [[1, 'مفعّلة'], [0, 'معطّلة']], Settings.rewardFx === false ? 0 : 1)}</div><div class="muted">عدّاد يدور ثم يتوقف على الرقم مع فرقعة وقصاصات احتفال عند ربح العملات والجواهر والأوسمة والقصاصات.</div>
        <div class="frow"><label>الخريطة المصغرة</label>${K.seg('mm', [[3, 'كبيرة'], [2, 'متوسطة'], [1, 'صغيرة'], [0, 'مخفية']], Settings.mm === undefined ? 2 : Settings.mm)}</div><div class="muted">يمكنك أيضاً تغيير حجمها أثناء اللعب من الزر الصغير في زاويتها.</div></div>
        <div class="keys"><b>لوحة المفاتيح:</b> الأسهم: تحريك الكاميرا · العجلة: تكبير · نقر يسار: تحديد/أمر · سحب: تحديد جماعي · نقر يمين: أمر · A: هجوم وتحرك · S: توقف · H: ثبات · Ctrl+رقم: حفظ كتيبة · رقم: استدعاؤها (أو زر ＋ الكتائب) · مسافة: آخر تنبيه · Q: كل الجيش · P/Esc: إيقاف</div>`,
      acc: `<div class="card"><h3>الحساب</h3><div class="frow"><label>اسم القائد</label><input class="inp" id="nm" maxlength="18" value="${esc(Profile.name)}"><button class="btn sm" data-a="nm">حفظ</button></div><div class="frow"><label>التقدّم</label><button class="btn danger sm" data-a="reset">مسح كل التقدّم</button></div></div>`,
      lang: `<div class="card"><h3>اللغة</h3><div class="langopts" translate="no"><button class="lopt${I18N.lang === 'ar' ? ' on' : ''}" data-a="lg_ar"><b>العربية</b><span>Arabic</span></button><button class="lopt${I18N.lang === 'en' ? ' on' : ''}" data-a="lg_en"><b>English</b><span>الإنكليزية</span></button></div>
        <div class="muted">${fromGame ? 'غيّر اللغة من القائمة الرئيسية — العودة إلى العربية تعيد تحميل اللعبة.' : 'العودة إلى العربية تعيد تحميل اللعبة لحظياً.'}</div></div>
        <div class="card langsup"><h3>لغات جديدة</h3><p class="muted">نعمل على إضافة لغات أخرى — دعمك يسرّع ذلك.</p><button class="btn pri big" data-a="lsup"><svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10z"/></svg>ادعمونا لنضيف لغات جديدة</button></div>`,
      guide: (() => { const L = I18N.lang === 'en' ? 1 : 0; const sec = GUIDE.find(g => g.id === guideSec) || GUIDE[0];
        return `<div class="guide" translate="no" dir="${L ? 'ltr' : 'rtl'}"><div class="gchips">${GUIDE.map(g => `<button class="gchip${g.id === sec.id ? ' on' : ''}" data-g="${g.id}"><svg viewBox="0 0 24 24">${g.ic}</svg><span>${g.t[L]}</span></button>`).join('')}</div>
          ${GUIDE.map(g => `<section class="gsec${g.id === sec.id ? '' : ' hid'}" data-gs="${g.id}"><h3>${g.t[L]}</h3>${g.e.map(x => `<div class="gent"><h4>${x.t[L]}</h4><p>${x.d[L]}</p></div>`).join('')}</section>`).join('')}</div>`; })(),
      about: `<div class="card credits"><h3>الموسيقى والأصوات</h3>${(typeof MUSIC_CREDITS !== 'undefined' ? MUSIC_CREDITS : []).map(c => `<div><b>«${esc(c.t)}»</b> — ${esc(c.a)} (${esc(c.l)})</div>`).join('')}<div>المؤثرات الصوتية: تسجيلات حقيقية بترخيص CC0 من مكتبات OpenGameArt وKenney — التفاصيل في ملف audio/CREDITS.md.</div><div>الأعلام: مكتبة flag-icons بترخيص MIT.</div></div>`,
    };
    const tabs = [['gfx', 'الرسوميات', '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'], ['snd', 'الصوت', '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>'], ['ctl', 'التحكم', '<rect x="2" y="7" width="20" height="10" rx="5"/><path d="M7 10v4M5 12h4"/><circle cx="16" cy="11" r=".8"/><circle cx="18.5" cy="13" r=".8"/>'], ['acc', 'الحساب', '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'], ['lang', 'اللغة', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18"/>'], ['guide', 'الدليل', '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11.5h5"/>'], ['about', 'حول اللعبة', '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>']];
    if (!B[setTab]) setTab = 'gfx';
    const s = sideScreen('الإعدادات', fromGame ? 'resume' : 'menu', tabs, setTab, 'st_', B[setTab], '', 'setup sets', MODE_AC.set);
    s.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', () => { Settings[r.dataset.s] = +r.value; r.nextElementSibling.textContent = Math.round(r.value * 100) + '%'; SND.applyVolumes(); saveSettings(); }));
    K.segBind(s, (k, v) => { if (k === 'quality') { if (v === 'auto') { Settings.qAuto = true; Settings.quality = Device.info ? Device.info.q : Settings.quality; } else { Settings.qAuto = false; Settings.quality = +v; } K.toast('تُطبق الجودة الجديدة في المعركة التالية', 'info'); } if (k === 'shake') Settings.shake = v === '1'; if (k === 'rm') Settings.reduceMotion = v === '1'; if (k === 'bars') Settings.bars = v; if (k === 'edge') Settings.edge = v === '1'; if (k === 'hints') Settings.hints = v === '1'; if (k === 'full') Settings.full = v === '1'; if (k === 'pops') Settings.popups = v === '1'; if (k === 'achp') Settings.achPop = v === '1'; if (k === 'upc') Settings.upConfirm = v === '1'; if (k === 'rfx') Settings.rewardFx = v === '1'; if (k === 'mm') { Settings.mm = +v; UI.sizeMini && UI.sizeMini(); } if (k === 'lite') { Settings.liteMode = v === 'auto' ? 'auto' : +v; K.toast('يُطبّق في المعركة التالية', 'info'); } saveSettings(); });
    const map = { resume: () => UI.pauseMenu(), nm: () => { const v = (s.querySelector('#nm').value || '').trim().slice(0, 18); if (v) { Profile.name = v; saveProfile(); K.toast('تم الحفظ', 'good'); } },
      reset: () => K.confirmBox('مسح كل التقدّم والإحصاءات والإنجازات؟', () => { LS.del('tw_profile_v1'); LS.del('tw_save_v1'); const fresh = JSON.parse(JSON.stringify(PROFILE_DEF)); for (const k in Profile) delete Profile[k]; Object.assign(Profile, fresh); saveProfile(); Icons.clear(); settings(fromGame); }) };
    for (const [k] of tabs) map['st_' + k] = () => settings(fromGame, k);
    map.lg_ar = () => { if (I18N.lang === 'ar') return; if (fromGame) { K.toast('غيّر اللغة من القائمة الرئيسية', 'warn'); return; } I18N.set('ar'); };
    map.lg_en = () => { if (I18N.lang === 'en') return; I18N.set('en'); settings(fromGame, 'lang'); };
    map.lsup = () => support();
    K.bind(s, map);
    s.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { guideSec = b.dataset.g; SND.ui('tab'); s.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === b)); s.querySelectorAll('[data-gs]').forEach(x => x.classList.toggle('hid', x.dataset.gs !== guideSec)); const um = s.querySelector('.umain'); if (um) um.scrollTop = 0; });
  }
  return { title, hub, settings, lobby, preview, mapToURL, camoURL, side: sideScreen, pickGet: () => pick, pickSet, battle: () => battleSetup() };
})();
