/* ============================================================
   War of Power — المكافآت: عجلة الحظ، التسجيل اليومي، المهام، الإنجازات، مكافآت المستوى، القصاصات، كود البونص
   الملف: js/ui/rewards.js   ·   يُحمَّل بعد shop.js
   ============================================================ */
'use strict';
/* Sections in a side bar; each tab shows a red count when something is ready to collect.
   The balance itself is not shown here (only in the shop and on the commander screen): every claim opens
   a reward pop-up — a rolling counter that lands on the amount, a pop and confetti (off in settings: «حركة المكافآت»).
   Rules and amounts: js/ui/economy.js. */
const Rewards = (function () {
  const K = UI.kit; const { esc, fm } = K;
  const TABS = [
    ['wheel', 'عجلة الحظ', '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/><circle cx="12" cy="12" r="2.2"/>'],
    ['drop', 'الإنزال الجوي', '<path d="M3 10a9 7 0 0 1 18 0"/><path d="M3 10l7.5 7M21 10l-7.5 7M12 10v7"/><rect x="9" y="16.5" width="6" height="5" rx="1"/>'],
    ['login', 'المكافآت اليومية', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8.5 15l2.3 2.3 4.7-4.6"/>'],
    ['mis', 'المهام', '<path d="M9 5h11M9 12h11M9 19h11"/><path d="M3.5 5.2l1.3 1.3 2.2-2.4M3.5 12.2l1.3 1.3 2.2-2.4M3.5 19.2l1.3 1.3 2.2-2.4"/>'],
    ['ach', 'الإنجازات', '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>'],
    ['lv', 'مكافآت المستوى', '<path d="M12 2l3 6 6.5 1-4.7 4.6 1.1 6.4L12 17l-5.8 3 1.1-6.4L2.5 9 9 8z"/>'],
    ['shard', 'القصاصات الأسطورية', '<path d="M13.8 2l5.6 7.4-3.4 12.6-7.9-4.6-3-9.2z"/><path d="M13.8 2l-2 8 4.2 12M11.8 10l-6.7-1.8M11.8 10l7.6-.6"/>'],
    ['code', 'كود بونص', '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 11h18M8 7V5.5a2 2 0 0 1 4 0V7M12 7V5.5a2 2 0 0 1 4 0V7"/><path d="M7 15h3M13 15h4"/>'],
  ];
  const PKEY = { wheel: 'wheel', drop: 'drop', login: 'login', mis: 'mis', ach: 'ach', lv: 'lv' };
  const MIC = { win: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/>', play: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/>',
    kills: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/>', bkills: '<path d="M3 21h18M5 21V9l5-3v15M14 21V4l5 3v14"/><path d="M8 3l2 2M16 1l1 2"/>',
    air: '<path d="M21 15.5l-8-3.3V5a1.5 1.5 0 0 0-3 0v7.2L2 15.5V18l8-2v3.5L7.5 21v1.5L11.5 21l4 1.5V21L13 19.5V16l8 2z"/>', built: '<path d="M3 21h18M5 21v-8l7-5 7 5v8"/><path d="M10 21v-5h4v5"/>',
    units: '<rect x="3" y="11" width="18" height="7" rx="2"/><path d="M7 11V8h7l2 3M14 9.5h7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>', waves: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    hardwin: '<path d="M12 2l3 6 6.5 1-4.7 4.6 1.1 6.4L12 17l-5.8 3 1.1-6.4L2.5 9 9 8z"/>', brutalwin: '<path d="M12 2c4 3 6 6 6 10a6 6 0 0 1-12 0c0-2 1-4 2-5 0 2 1 3 2 3 0-3 1-6 2-8z"/>', fastwin: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>', daily: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>' };
  const MEDAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 1.5h4l2 6.5H9z" fill="#c8372a"/><path d="M13 1.5h4l-2 6.5h-4z" fill="#2f6dd0"/><circle cx="12" cy="15" r="7" fill="url(#gCoin)" stroke="#8a5200" stroke-width="1.2"/><path d="M12 10.6l1.3 2.65 2.9.42-2.1 2.05.5 2.9L12 17.25l-2.6 1.37.5-2.9-2.1-2.05 2.9-.42z" fill="#fff6c8" stroke="#a06000" stroke-width=".5"/></svg>';
  const LOCKI = '<svg viewBox="0 0 24 24" aria-hidden="true" class="lk"><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';
  let tab = 'wheel', backFn = null, rot = 0, spinning = false;
  const hm = ms => { const t = Math.max(0, Math.floor(ms / 60000)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
  function left(ms) { const d = Math.floor(ms / 86400000); return d >= 1 ? (d === 1 ? 'يوم' : d === 2 ? 'يومين' : d + ' أيام') : hm(ms); }
  const toMidnight = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n; };
  function open(t, back) { backFn = back || null; screen(t || firstReady() || tab); }
  function firstReady() { const P = Eco.pending(); const t = TABS.find(([k]) => P[PKEY[k]] > 0); return t ? t[0] : null; }
  function screen(t) {
    if (t) tab = t; const P = Eco.pending();
    const tabs = TABS.map(([k, n, ic]) => [k, n + (P[PKEY[k]] ? `<u class="bdg">${P[PKEY[k]]}</u>` : ''), ic]);
    const body = tab === 'wheel' ? wheelBody() : tab === 'drop' ? dropBody() : tab === 'login' ? loginBody() : tab === 'mis' ? misBody() : tab === 'ach' ? achBody() : tab === 'lv' ? lvBody() : tab === 'shard' ? shardBody() : codeBody();
    const s = Menus.side('المكافآت', 'rback', tabs, tab, 'rt_', body, '', 'setup rew', MODE_AC.daily);
    const map = { rback: () => { if (spinning) return; const b = backFn; backFn = null; if (b) b(); else Menus.hub(); }, spin: () => doSpin(s), lclaim: () => claim(Eco.claimLogin(), 'مكافأة اليوم'), toshop: () => Shop.open(null, () => screen()), redeem: () => redeem(s) };
    for (const [k] of TABS) map['rt_' + k] = () => { if (!spinning) screen(k); };
    if (tab === 'drop') for (const c of Eco.crates()) map['cr_' + c.id] = () => buyCrate(c.id);
    if (tab === 'mis') { const M = Eco.missions(); for (const x of M.d.concat(M.w)) map['mc_' + x.sc + '_' + x.i] = () => claim(Eco.claimMission(x.sc, x.i), 'أنجزت المهمة!'); }
    if (tab === 'ach') for (const a of ACH) map['ac_' + a.id] = () => claim(Eco.claimAch(a.id), 'مكافأة إنجاز: ' + a.n);
    if (tab === 'lv') for (const x of Eco.levels()) map['lv_' + x.l] = () => claim(Eco.claimLv(x.l), 'مكافأة الرتبة: ' + PLV_N[x.l]);
    K.bind(s, map);
    if (tab === 'wheel') { const g = s.querySelector('.wrot'); if (g) g.setAttribute('transform', 'rotate(' + (rot % 360).toFixed(2) + ')'); }
    if (tab === 'code') { const inp = s.querySelector('#bcode'); if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') redeem(s); }); }
    return s;
  }
  function claim(parts, title) { if (!parts) return; pop(parts, title); screen(); }
  /* ---------- celebration: rolling counters, pop and confetti ---------- */
  const fxOn = () => Settings.rewardFx !== false;
  function count(el, to, ms, done) { // rolls a number from 0 up to `to`, ticking, then stops on it
    const t0 = performance.now(); let lastTick = 0;
    const step = now => { const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3); el.textContent = '+' + fm(Math.round(to * e));
      if (now - lastTick > 70 && t < 1) { lastTick = now; SND.ui('tick'); }
      if (t < 1 && el.isConnected) requestAnimationFrame(step); else { el.textContent = '+' + fm(to); if (done) done(); } };
    requestAnimationFrame(step);
  }
  let cvs = null, parts = [], raf = 0;
  function confetti(x, y, n, power) { // full-screen burst of paper confetti and ribbons from (x, y)
    if (!fxOn() || Settings.reduceMotion) return;
    if (!cvs) { cvs = document.createElement('canvas'); cvs.id = 'confetti'; document.body.appendChild(cvs); }
    const dpr = Math.min(2, window.devicePixelRatio || 1); cvs.width = innerWidth * dpr; cvs.height = innerHeight * dpr; cvs.style.display = 'block';
    const COLS = ['#ffd23f', '#ffe9a0', '#2fd38a', '#4ea3ff', '#c46bff', '#ff5a4a', '#ffffff', '#f5a00e'];
    for (let i = 0; i < (n || 90); i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3, s = (380 + Math.random() * 520) * (power || 1);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 14, w: 5 + Math.random() * 7, h: 3 + Math.random() * 5, c: COLS[i % COLS.length], life: 0, max: 1.8 + Math.random() * 1.2, k: Math.random() < 0.25 ? 1 : 0, sw: Math.random() * TAU }); }
    if (!raf) { let last = performance.now(); const x2 = cvs.getContext('2d');
      const step = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; x2.setTransform(dpr, 0, 0, dpr, 0, 0); x2.clearRect(0, 0, innerWidth, innerHeight);
        parts = parts.filter(p => (p.life += dt) < p.max); for (const p of parts) { p.vy += 900 * dt; p.vx *= 1 - 1.6 * dt; p.vy *= 1 - 1.1 * dt; p.x += p.vx * dt + Math.sin(p.life * 7 + p.sw) * 0.6; p.y += p.vy * dt; p.r += p.vr * dt;
          x2.save(); x2.globalAlpha = Math.min(1, (p.max - p.life) * 2); x2.translate(p.x, p.y); x2.rotate(p.r); x2.fillStyle = p.c;
          if (p.k) { x2.beginPath(); x2.arc(0, 0, p.w * 0.45, 0, TAU); x2.fill(); } else { x2.scale(1, Math.abs(Math.cos(p.life * 9 + p.sw))); x2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); } x2.restore(); }
        if (parts.length) raf = requestAnimationFrame(step); else { raf = 0; cvs.style.display = 'none'; } };
      raf = requestAnimationFrame(step); }
  }
  // animate the currency tiles inside a container one after another (used by the reward pop-up and the battle summary)
  function celebrate(root) {
    const tiles = [...root.querySelectorAll('[data-cnt]')]; if (!tiles.length) return;
    if (!fxOn()) { tiles.forEach(t => { t.querySelector('b').textContent = '+' + fm(+t.dataset.cnt); }); return; }
    let i = 0; const next = () => { const t = tiles[i++]; if (!t || !t.isConnected) return; t.classList.add('roll');
      count(t.querySelector('b'), +t.dataset.cnt, 900, () => { t.classList.remove('roll'); t.classList.add('popd'); SND.ui('buy'); const r = t.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, 46, 0.8); setTimeout(next, 220); }); };
    setTimeout(next, 260);
  }
  /* ---------- airdrop: crates on parachutes (bought with a currency, daily limit; the supply crate is free every 8 hours) ---------- */
  const PLANE = '<svg viewBox="0 0 140 46" aria-hidden="true"><path d="M6 27c0-5 8-8 20-8h70l15-14h9l-6 15h10c5 0 8 2.6 8 5.5S129 31 124 31H26C14 31 6 30 6 27z" fill="#46502f"/><path d="M44 21h46l-8-8H54z" fill="#363e24"/><path d="M50 20h34" stroke="#2a301b" stroke-width="2"/><rect x="58" y="12" width="7" height="5" rx="2" fill="#2d331f"/><rect x="72" y="12" width="7" height="5" rx="2" fill="#2d331f"/><path d="M12 25h14" stroke="#9fb6c8" stroke-width="2.4" stroke-linecap="round"/><path d="M100 31l12 7h6l-6-7" fill="#3a4227"/></svg>';
  const CHUTE = '<svg viewBox="0 0 100 74" aria-hidden="true"><defs><linearGradient id="chG" x1="0" x2="1"><stop offset="0" stop-color="#d9493a"/><stop offset=".2" stop-color="#d9493a"/><stop offset=".2" stop-color="#f3eee2"/><stop offset=".4" stop-color="#f3eee2"/><stop offset=".4" stop-color="#d9493a"/><stop offset=".6" stop-color="#d9493a"/><stop offset=".6" stop-color="#f3eee2"/><stop offset=".8" stop-color="#f3eee2"/><stop offset=".8" stop-color="#d9493a"/></linearGradient></defs><path d="M4 38C4 14 25 2 50 2s46 12 46 36c-6-4-12-4-18 0-6-4-13-4-19 0-6-4-12-4-18 0-6-4-12-4-18 0-6-4-12-4-19 0z" fill="url(#chG)" stroke="#7a2a20" stroke-width="1.2"/><path d="M6 37L50 72M27 37L50 72M50 36V72M73 37L50 72M94 37L50 72" stroke="#5a4a30" stroke-width="1.1" fill="none"/></svg>';
  const CRATE = '<svg viewBox="0 0 84 74" class="crt" aria-hidden="true"><rect x="6" y="22" width="72" height="48" rx="3" fill="var(--k1)" stroke="var(--k4)" stroke-width="2"/><path d="M6 38h72M6 54h72" stroke="rgba(0,0,0,.28)" stroke-width="1.6"/><path d="M8 24l68 44M76 24L8 68" stroke="rgba(0,0,0,.18)" stroke-width="3"/><path d="M42 33l3.4 6.9 7.6 1.1-5.5 5.4 1.3 7.6-6.8-3.6-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1z" fill="var(--k3)"/><rect x="4" y="20" width="12" height="12" rx="2" fill="var(--k4)"/><rect x="68" y="20" width="12" height="12" rx="2" fill="var(--k4)"/><rect x="4" y="60" width="12" height="12" rx="2" fill="var(--k4)"/><rect x="68" y="60" width="12" height="12" rx="2" fill="var(--k4)"/><g class="lid"><rect x="3" y="9" width="78" height="15" rx="3" fill="var(--k2)" stroke="var(--k4)" stroke-width="2"/><path d="M14 16.5h56" stroke="rgba(0,0,0,.25)" stroke-width="2"/></g></svg>';
  function dropBody() {
    const C = Eco.crates(); const rng = c => Object.keys(c.rw).map(k => { const [a, b, ch] = c.rw[k]; return `<span class="rwc ${k}">${Eco.ico(k)}<b><bdi dir="ltr">${fm(a)}–${fm(b)}</bdi></b>${ch !== undefined && ch < 1 ? `<i>${Math.round(ch * 100)}%</i>` : ''}</span>`; }).join('') + (c.item ? `<span class="rwc itm r-${c.item[0].slice(-1)}"><svg viewBox="0 0 24 24">${Eco.KICO.troop}</svg><b>عنصر ${c.item[0] === 'l' ? 'أسطوري' : c.item[0] === 'g' ? 'ذهبي' : 'نادر'}</b><i>${Math.round(c.item[1] * 100)}%</i></span>` : '');
    return `<div class="card drops"><h3>الإنزال الجوي</h3><p class="muted">اشترِ صناديق تُلقيها طائرة الشحن بالمظلات — محتواها عشوائي ضمن ما هو مكتوب عليها، ولكل صندوق حد يومي يتجدد بعد منتصف الليل.</p>
      <div class="dropg">${C.map(c => `<div class="dropc t-${c.id}"><div class="dcart">${CRATE}</div><b>${esc(c.n)}</b><em>${esc(c.d)}</em><div class="dcon">${rng(c)}</div>
        <div class="dbuy">${c.free ? `<button class="btn acc" data-a="cr_${c.id}">افتح مجاناً</button>` : `<button class="btn pri" data-a="cr_${c.id}"${c.left ? '' : ' disabled'}>${Eco.ico(c.cur)}<b>${fm(c.cost)}</b></button>`}<span class="dleft">${c.free ? 'هدية مجانية كل 8 ساعات' : (c.left ? 'متبقٍ اليوم ' : 'نفد اليوم ') + '<bdi dir="ltr">' + c.left + '/' + c.max + '</bdi>'}${!c.free && c.freeIn ? ' · المجاني بعد ' + hm(c.freeIn) : ''}</span></div></div>`).join('')}</div></div>`;
  }
  function buyCrate(id) {
    const r = Eco.openCrate(id); if (r.err) { SND.ui('nomoney'); K.toast(r.err, 'warn'); return; }
    const c = Eco.crates().find(x => x.id === id) || { n: 'صندوق' }; const anim = fxOn() && !Settings.reduceMotion;
    const scene = anim ? `<div class="dscene t-${id}"><div class="dsky"><i class="dcl c1"></i><i class="dcl c2"></i><i class="dcl c3"></i></div><div class="dgnd"></div><div class="drays"></div><div class="dplane">${PLANE}</div><div class="dfall"><div class="dsway"><div class="dchute">${CHUTE}</div><div class="dbox">${CRATE}</div></div></div><div class="dpuff"></div></div>` : '';
    K.box(`<div class="rwpop drop">${scene}<h3>${esc(c.n)}${r.free ? ' — هدية مجانية' : ''}</h3><div class="rwis${anim ? ' later' : ''}">${r.parts.map(rwTile).join('')}</div></div>`, [{ l: 'رائع!', cls: 'pri' }],
      { wide: true, bind: d => { Shop.fill(d); if (!anim) { celebrate(d); return; } const row = d.querySelector('.row'); row.style.visibility = 'hidden';
        SND.ui('launch'); setTimeout(() => SND.ui('place'), 2150); setTimeout(() => { const sc = d.querySelector('.dscene'); if (sc) sc.classList.add('open'); SND.ui('achieve'); const b = d.querySelector('.dbox'); if (b) { const q = b.getBoundingClientRect(); confetti(q.left + q.width / 2, q.top + q.height / 3, 70, 0.9); } }, 2450);
        setTimeout(() => { const w = d.querySelector('.rwis'); if (w) w.classList.remove('later'); row.style.visibility = ''; celebrate(d); }, 2850); } });
    screen();
  }
  function rwTile(p) {
    for (const k of ['c', 'g', 'm', 's']) if (p[k]) return `<div class="rwi ${k}" data-cnt="${p[k]}">${Eco.ico(k)}<b>${fxOn() ? '+0' : '+' + fm(p[k])}</b><span>${CUR_N[k]}</span></div>`;
    const ref = p.item || p.dup; const it = ref && Eco.item(ref[0], ref[1]); if (!it) return '';
    return `<div class="rwi itm r-${it.r}">${Shop.prev(it)}<b>${esc(it.n)}</b><span>${p.dup ? 'تملكه مسبقاً — حُوِّل إلى قيمته' : RARITY[it.r].n + ' · ' + KIND_N[it.kind]}</span></div>`;
  }
  /* ---------- reward pop-up (also used by the shop after a purchase) ---------- */
  function pop(prt, title, note) {
    if (!prt || !prt.length) return;
    const tile = p => {
      for (const k of ['c', 'g', 'm', 's']) if (p[k]) return `<div class="rwi ${k}" data-cnt="${p[k]}">${Eco.ico(k)}<b>${fxOn() ? '+0' : '+' + fm(p[k])}</b><span>${CUR_N[k]}</span></div>`;
      const ref = p.item || p.dup; const it = Eco.item(ref[0], ref[1]); if (!it) return '';
      return `<div class="rwi itm r-${it.r}">${Shop.prev(it)}<b>${esc(it.n)}</b><span>${p.dup ? 'تملكه مسبقاً — حُوِّل إلى قيمته' : RARITY[it.r].n + ' · ' + KIND_N[it.kind]}</span></div>`;
    };
    K.box(`<div class="rwpop"><div class="rays"></div><h3>${esc(title || 'حصلت على')}</h3><div class="rwis">${prt.map(tile).join('')}</div>${note ? `<p class="muted">${esc(note)}</p>` : ''}</div>`, [{ l: 'رائع!', cls: 'pri' }],
      { bind: d => { Shop.fill(d); celebrate(d); if (fxOn() && !d.querySelector('[data-cnt]')) { const r = d.querySelector('.rwis').getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, 80); } } });
    SND.ui('achieve');
  }
  /* ---------- wheel of fortune ---------- */
  function segIcon(rw) {
    const sz = (s, k) => s.replace(/<svg class="cur c[cmgs]" viewBox="0 0 24 24" aria-hidden="true">/, `<svg x="${-k / 2}" y="${-k / 2}" width="${k}" height="${k}" viewBox="0 0 24 24">`);
    for (const k of ['c', 'g', 'm', 's']) if (rw[k]) return sz(Eco.ico(k), k === 's' ? 30 : 25);
    return `<g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(-12 -12)"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 12h18M12 7v14M12 7c-2-4-7-5-7-2s5 2 7 2zM12 7c2-4 7-5 7-2s-5 2-7 2z"/></g>`;
  }
  const segLabel = rw => rw.camo ? 'تمويه' : rw.s ? 'الجائزة الكبرى' : fm(rw.c || rw.g || rw.m);
  function wheelSVG() {
    const n = WHEEL.length, a = 360 / n, R = 100; let g = '';
    WHEEL.forEach((s, i) => {
      const a0 = (i * a - a / 2 - 90) * PI / 180, a1 = (i * a + a / 2 - 90) * PI / 180; const d = `M0 0L${(Math.cos(a0) * R).toFixed(2)} ${(Math.sin(a0) * R).toFixed(2)}A${R} ${R} 0 0 1 ${(Math.cos(a1) * R).toFixed(2)} ${(Math.sin(a1) * R).toFixed(2)}Z`;
      g += `<path d="${d}" fill="${s.col}" stroke="#2c2d19" stroke-width="1.6"/><path d="${d}" fill="url(#gWseg)"/>`;
      g += `<g transform="rotate(${i * a})"><g transform="translate(0 -70)">${segIcon(s.rw)}</g><text y="-42" text-anchor="middle" class="wtx${s.big ? ' big' : ''}">${segLabel(s.rw)}</text></g>`;
    });
    let bulbs = ''; for (let i = 0; i < 16; i++) { const t = i / 16 * TAU; bulbs += `<circle cx="${(Math.cos(t) * 104).toFixed(1)}" cy="${(Math.sin(t) * 104).toFixed(1)}" r="2.6" class="bulb b${i % 2}"/>`; }
    return `<svg class="wheel" viewBox="-114 -118 228 232" aria-hidden="true"><circle r="110" fill="#34351f"/><circle r="106" fill="none" stroke="url(#gCoinE)" stroke-width="5"/><g class="wrot">${g}</g>${bulbs}
      <circle r="21" fill="url(#gCoin)" stroke="#8a5200" stroke-width="2.4"/><path d="M0-12l3.5 7.1 7.8 1.1-5.65 5.5 1.33 7.8L0 5.8l-6.98 3.7 1.33-7.8L-11.3-3.8l7.8-1.1z" fill="#fff4b8" stroke="#a65f00" stroke-width="1"/>
      <path d="M0-92L-11-117h22z" fill="#ff4a3a" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
  }
  function wheelBody() {
    const free = Eco.wheelFree(); const m = Eco.bal().m;
    return `<div class="card whl"><div class="wwrap">${wheelSVG()}</div><div class="winfo"><h3>عجلة الحظ</h3><p class="muted">لفّة مجانية كل يوم، واللفّة الإضافية بـ ${WHEEL_COST} وساماً. قد تربح عملات أو جواهر أو أوسمة أو تمويهاً، والجائزة الكبرى قصاصتان أسطوريتان.</p>
      ${free ? '<button class="btn pri big" data-a="spin">لُفّ مجاناً</button>' : `<button class="btn pri big" data-a="spin"${m < WHEEL_COST ? ' disabled' : ''}>لفّة إضافية ${Eco.ico('m')}${WHEEL_COST}</button><span class="muted">اللفّة المجانية التالية بعد ${hm(toMidnight())}</span>`}
      <div class="wlegend">${WHEEL.map(s => `<span style="--c:${s.col}">${Eco.rwHTML(s.rw)}</span>`).join('')}</div></div></div>`;
  }
  function doSpin(s) {
    if (spinning) return; const res = Eco.spin(); if (!res) { SND.ui('nomoney'); K.toast('تحتاج ' + WHEEL_COST + ' وساماً للفّة الإضافية', 'warn'); return; }
    spinning = true; s.classList.add('spinning'); s.querySelectorAll('[data-a="spin"]').forEach(b => { b.disabled = true; });
    const g = s.querySelector('.wrot'); const a = 360 / WHEEL.length; const jit = (Math.random() - 0.5) * a * 0.7;
    const cur = ((rot % 360) + 360) % 360; const delta = ((-res.i * a - cur) % 360 + 360) % 360; const from = rot, to = rot + 360 * 5 + delta + jit;
    const dur = Settings.reduceMotion ? 1200 : 4600; const t0 = performance.now(); let seg = Math.floor((from + a / 2) / a);
    const step = now => {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3.2), th = from + (to - from) * e; rot = th;
      if (g && g.isConnected) g.setAttribute('transform', 'rotate(' + (th % 360).toFixed(2) + ')');
      const sg = Math.floor((th + a / 2) / a); if (sg !== seg) { seg = sg; SND.ui('tick'); }
      if (t < 1 && g && g.isConnected) { requestAnimationFrame(step); return; }
      rot = to; spinning = false; const big = WHEEL[res.i].big;
      pop(res.parts, big ? 'الجائزة الكبرى!' : 'ربحت من عجلة الحظ'); if (s.isConnected && tab === 'wheel') screen('wheel');
    };
    requestAnimationFrame(step);
  }
  /* ---------- daily login ---------- */
  const bigRw = rw => ['c', 'g', 'm', 's'].filter(k => rw[k]).map(k => `<span class="lgb ${k}">${Eco.ico(k)}<b>${fm(rw[k])}</b></span>`).join('');
  function loginBody() {
    const L = Eco.login();
    const day = (rw, i) => { const st = i < L.shown ? 'got' : L.can && i === L.day ? 'now' : ''; return `<div class="lday ${st}${i === 6 ? ' big' : ''}"><span class="ldn">اليوم ${i + 1}</span><div class="ldr">${bigRw(rw)}</div>${st === 'got' ? '<i class="ldk">✓</i>' : ''}</div>`; };
    const sk = `<div class="lstreak"><span>${Eco.ico('s')}</span><div><b>الدخول المتتالي: ${L.streak} ${L.streak === 1 ? 'يوم' : 'أيام'}</b><em>${L.toBonus === 0 ? (L.can ? 'استلم اليوم لتحصل على ' + LOGIN_STREAK_S + ' قصاصات أسطورية!' : 'حصلت على قصاصات هذا الأسبوع ✓') : 'بعد ' + L.toBonus + ' ' + (L.toBonus === 1 ? 'يوم' : 'أيام') + ' متتالية تحصل على ' + LOGIN_STREAK_S + ' قصاصات أسطورية — يوم واحد فائت يعيد العدّ.'}</em></div></div>`;
    return `<div class="card logn"><h3>مكافآت التسجيل اليومية</h3><p class="muted">ادخل كل يوم واستلم مكافأتك — اليوم السابع هو الأكبر، ودورة الأيام السبعة لا تضيع إن فاتك يوم.</p><div class="lgrid">${L.rw.map(day).join('')}</div>${sk}
      <div class="lfoot">${L.can ? `<button class="btn pri big" data-a="lclaim">استلم مكافأة اليوم ${L.day + 1}</button>` : `<span class="muted">✓ استلمت مكافأة اليوم — المكافأة التالية بعد ${hm(toMidnight())}</span>`}<span class="muted">مجموع أيامك: ${L.total}</span></div></div>`;
  }
  /* ---------- missions ---------- */
  function misBody() {
    const M = Eco.missions();
    const row = x => { const done = x.p >= x.t, pct = Math.round(Math.min(1, x.p / x.t) * 100);
      return `<div class="misr${done ? ' done' : ''}${x.cl ? ' cl' : ''}${x.hard ? ' hard' : ''}"><span class="mico"><svg viewBox="0 0 24 24">${MIC[x.k] || MIC.win}</svg></span><div class="mtx"><b>${esc(x.n)}</b><div class="pbar"><i style="width:${pct}%"></i><span><bdi dir="ltr">${fm(Math.min(x.p, x.t))} / ${fm(x.t)}</bdi></span></div></div>
        <div class="mend">${Eco.rwHTML(x.rw)}${x.cl ? '<span class="mok">✓ مستلمة</span>' : done ? `<button class="btn pri sm" data-a="mc_${x.sc}_${x.i}">استلام</button>` : ''}</div></div>`; };
    return `<div class="card mis"><h3>المهام اليومية <span class="rst">تتجدد بعد ${left(M.dLeft)}</span></h3>${M.d.map(row).join('')}</div>
      <div class="card mis"><h3>المهام الأسبوعية <span class="rst">تتجدد بعد ${left(M.wLeft)}</span></h3>${M.w.map(row).join('')}</div><p class="muted">يُحسب تقدّم المهام تلقائياً في نهاية كل معركة (المعارك المنسحب منها لا تُحسب). المهام الصعبة بإطار بنفسجي وتمنح قصاصات أسطورية.</p>`;
  }
  /* ---------- achievements ---------- */
  function achBody() {
    const L = Eco.achList(), got = L.filter(x => x.got).length; const ord = x => x.got && !x.cl ? 0 : !x.got ? 1 : 2;
    const list = L.slice().sort((a, b) => ord(a) - ord(b));
    const row = x => { const pr = x.prog, pct = pr ? Math.round(Math.min(1, pr[0] / pr[1]) * 100) : 0;
      return `<div class="achr${x.got ? ' got' : ''}${x.cl ? ' cl' : ''}"><span class="aico">${x.got ? MEDAL : LOCKI}</span><div class="atx"><b>${esc(x.a.n)}</b><em>${esc(x.a.d)}</em>${!x.got && pr ? `<div class="pbar sm"><i style="width:${pct}%"></i><span><bdi dir="ltr">${fm(Math.min(pr[0], pr[1]))} / ${fm(pr[1])}</bdi></span></div>` : ''}</div>
        <div class="mend">${Eco.rwHTML(x.rw)}${x.cl ? '<span class="mok">✓ مستلمة</span>' : x.got ? `<button class="btn pri sm" data-a="ac_${x.a.id}">استلام</button>` : ''}</div></div>`; };
    return `<div class="card"><h3>الإنجازات ${got}/${L.length}</h3><div class="achl">${list.map(row).join('')}</div></div>`;
  }
  /* ---------- rank rewards ---------- */
  function lvBody() {
    const l = plevel(), a = PLV[l], b = PLV[l + 1]; const p = b ? clamp((Profile.xp - a) / (b - a), 0, 1) : 1;
    const rows = Eco.levels().map(x => `<div class="lvr${x.reached ? ' on' : ''}${x.cl ? ' cl' : ''}${x.l === l + 1 ? ' next' : ''}"><span class="lvb">${rankBadge(x.l, 40)}</span><div class="lvn"><b>المستوى ${x.l + 1} · ${PLV_N[x.l]}</b><em>${fm(PLV[x.l])} خبرة</em></div>
      <div class="mend">${Eco.rwHTML(x.rw)}${x.cl ? '<span class="mok">✓ مستلمة</span>' : x.reached ? `<button class="btn pri sm" data-a="lv_${x.l}">استلام</button>` : `<span class="lvlock">${LOCKI}</span>`}</div></div>`).join('');
    return `<div class="card lvh">${rankBadge(l, 64)}<div class="lvhx"><b>${PLV_N[l]} · المستوى ${l + 1}</b><div class="pbar"><i style="width:${Math.round(p * 100)}%"></i><span>${b ? '<bdi dir="ltr">' + fm(Profile.xp) + ' / ' + fm(b) + '</bdi> خبرة' : 'أعلى رتبة'}</span></div><em>تكسب الخبرة من كل معركة، وكل رتبة جديدة تفتح مكافأة.</em></div></div>
      <div class="card"><h3>مكافآت الرتب</h3><div class="lvl">${rows}</div></div>`;
  }
  /* ---------- legendary shards: how to earn them + streak progress ---------- */
  function shardBody() {
    const I = Eco.shardInfo(); const L = Eco.login();
    const track = (ic, n, d, cur, goal, rw) => `<div class="shr"><span class="shi">${ic}</span><div class="mtx"><b>${n}</b><em>${d}</em>${goal ? `<div class="pbar"><i style="width:${Math.round(Math.min(1, cur / goal) * 100)}%"></i><span><bdi dir="ltr">${cur} / ${goal}</bdi></span></div>` : ''}</div><span class="rwc s">${Eco.ico('s')}<b>+${rw}</b></span></div>`;
    const sw = '<svg viewBox="0 0 24 24"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/></svg>';
    return `<div class="card shard"><h3>القصاصات الأسطورية</h3><p class="muted">كل العناصر الأسطورية في المتجر (خرائط ودول وتمويهات وقوات) تُشترى بالقصاصات فقط، وهي صعبة الجمع عمداً.</p>
      ${track(sw, 'الفوز على الذكاء الوحشي', 'كل انتصار على «وحشي» يمنحك قصاصة.', 0, 0, 1)}
      ${track(sw, 'سلسلة انتصارات على «سهل»', 'انتصر ' + STREAK_GOAL[0][0] + ' مرات متتالية دون خسارة.', I.streak[0], STREAK_GOAL[0][0], STREAK_GOAL[0][1])}
      ${track(sw, 'سلسلة انتصارات على «متوسط»', 'انتصر ' + STREAK_GOAL[1][0] + ' مرات متتالية دون خسارة.', I.streak[1], STREAK_GOAL[1][0], STREAK_GOAL[1][1])}
      ${track(sw, 'سلسلة انتصارات على «صعب»', 'انتصر ' + STREAK_GOAL[2][0] + ' مرات متتالية دون خسارة.', I.streak[2], STREAK_GOAL[2][0], STREAK_GOAL[2][1])}
      ${track(MIC.daily.replace(/^/, '<svg viewBox="0 0 24 24">') + '</svg>', 'تسجيل دخول 7 أيام متتالية', 'استلم مكافأة الدخول كل يوم دون انقطاع.', L.streak % 7, 7, LOGIN_STREAK_S)}
      ${track('<svg viewBox="0 0 24 24">' + MIC.hardwin + '</svg>', 'المهام الصعبة', 'مهام بإطار بنفسجي في تبويب المهام (يومية وأسبوعية).', 0, 0, '1–3')}
      <p class="muted">أي خسارة أمام الحاسوب تعيد سلاسل الانتصارات إلى الصفر. معارك الشبكة لا تُحسب في السلاسل.</p>
      <button class="btn pri" data-a="toshop">العناصر الأسطورية في المتجر</button></div>`;
  }
  /* ---------- bonus code ---------- */
  function codeBody() {
    return `<div class="card codeb"><h3>كود بونص</h3><p class="muted">اكتب كود البونص واضغط استخدام لتحصل على جائزته. بعض الأكواد تُستخدم مرة كل فترة.</p>
      <div class="codef"><input id="bcode" class="inp" maxlength="40" placeholder="اكتب الكود هنا" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn pri" data-a="redeem">استخدام</button></div></div>`;
  }
  function redeem(s) {
    const inp = s.querySelector('#bcode'); const v = inp ? inp.value : ''; if (!v.trim()) { K.toast('اكتب الكود أولاً', 'warn'); return; }
    const r = Eco.redeem(v);
    if (r.err) { SND.ui('nomoney'); K.toast(r.err, 'warn'); if (inp) { inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); } return; }
    if (inp) inp.value = '';
    if (r.parts) pop(r.parts, r.title);
    else { SND.ui('achieve'); K.box(`<div class="rwpop"><div class="rays"></div><h3>${esc(r.title)}</h3><p>${r.n ? 'أصبحت كل الخرائط والدول والتمويهات والقوات ملكك (' + r.n + ' عنصراً).' : 'لا يوجد ما يُفتح.'}</p></div>`, [{ l: 'رائع!', cls: 'pri' }], { bind: d => { const b = d.querySelector('.rwpop').getBoundingClientRect(); confetti(b.left + b.width / 2, b.top + b.height / 2, 140, 1.2); } }); }
  }
  return { open, screen, pop, celebrate, confetti };
})();
