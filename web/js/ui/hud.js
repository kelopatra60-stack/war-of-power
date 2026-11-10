/* ============================================================
   War of Power — واجهة المعركة: اللوحات، شريط التحديد، الخريطة المصغرة، شجرة التطوير، النتائج
   الملف: js/ui/hud.js   ·   ترتيب التحميل: 35 من 43
   ============================================================ */
'use strict';
/* ===== DOM UI core: kit, HUD (context panel, selection bar), minimap, tech tree, results ===== */
const UI = (function () {
  const $ = id => document.getElementById(id);
  let G = null; let hudT = 0; let toastId = 0; let screens = null; let modal = false; let paused = false; let techBox = null;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fm = v => fmN(v);
  /* accent colour variables (no color-mix: older WebViews must render the same) */
  function hexRgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mixc(a, b, t) { return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')'; }
  function acv(hex, pre) { pre = pre || 'ac'; const c = hexRgb(hex), w = [255, 255, 255], k = [0, 0, 0], d = [74, 79, 52], dd = [58, 62, 41]; const rg = c.join(',');
    return `--${pre}:${hex};--${pre}l:${mixc(c, w, 0.3)};--${pre}m:${mixc(c, k, 0.32)};--${pre}d:${mixc(d, c, 0.36)};--${pre}dd:${mixc(dd, c, 0.12)};--${pre}1:rgba(${rg},.14);--${pre}2:rgba(${rg},.26);--${pre}3:rgba(${rg},.5);`; }
  function tcv(hex) { const c = hexRgb(hex); return `--tc:${hex};--tcd:${mixc([86, 89, 60], c, 0.26)};--tca:rgba(${c.join(',')},.32);`; }
  function gcv(hex) { const c = hexRgb(hex); return `--gc:${hex};--gcd:${mixc([80, 84, 56], c, 0.3)};--gca:rgba(${c.join(',')},.5);--gcs:rgba(${c.join(',')},.22);--gcl:${mixc(c, [255, 255, 255], 0.35)};`; }
  function blocking() { return modal || (paused && !frozen) || !!techBox || (screens && !screens.classList.contains('hid')); }
  function icon(img, kind, a, b) { Icons.get(kind, a, b, url => { if (url) { img.src = url; img.classList.add('ok'); } }); }
  /* ---------------- screens kit ---------------- */
  const SCROLLERS = '.umain,.frmain,.frlist,.frmsgs,.bpgrid,.bpchips,.lob,.setbox,.ngrid,.cmgrid,#lslots,#lchat';
  function showScreen(html, cls, ac) { // re-rendering the same screen (same title + section) keeps every scroll position: choosing something never jumps to the top
    const key = (cls || '') + '|' + ((/<h2>([^<]*)<\/h2>/.exec(html) || [])[1] || '') + '|' + ((/<button class="on" data-a="([^"]+)"/.exec(html) || [])[1] || '');
    const keep = !screens.classList.contains('hid') && screens.dataset.key === key ? [screens.scrollTop, [...screens.querySelectorAll(SCROLLERS)].map(e => [e.scrollTop, e.scrollLeft])] : null;
    screens.className = 'scr ' + (cls || ''); screens.style.cssText = ac ? acv(ac) : ''; screens.innerHTML = html; screens.classList.remove('hid'); screens.dataset.key = key;
    if (keep) { screens.scrollTop = keep[0]; screens.querySelectorAll(SCROLLERS).forEach((e, i) => { const k = keep[1][i]; if (k) { e.scrollTop = k[0]; e.scrollLeft = k[1]; } }); } else screens.scrollTop = 0;
    return screens;
  }
  function hideScreens() { screens.classList.add('hid'); screens.innerHTML = ''; }
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12h16M13.5 5.5l6.5 6.5-6.5 6.5"/></svg>'; // every back button: a full arrow (points right in Arabic)
  function top(title, back) { return `<div class="shead"><button class="btn ghost back" data-a="${back || 'menu'}" aria-label="رجوع">${ARROW}</button><h2>${title}</h2></div>`; }
  function bind(root, map) { root.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); SND.unlock(); SND.ui('click'); const a = b.dataset.a; if (map && map[a]) map[a](b); else if (a === 'menu' || a === 'back') Menus.hub(); })); }
  function seg(name, opts, cur) { return `<div class="seg" data-seg="${name}">${opts.map(([v, l]) => `<button class="${String(v) === String(cur) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`; }
  function segBind(root, fn) { root.querySelectorAll('.seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { SND.ui('click'); sg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); fn(sg.dataset.seg, b.dataset.v); }))); }
  function box(html, actions, opts) {
    opts = opts || {}; modal = true; const d = el('div', 'modal', `<div class="mbox${opts.cls ? ' ' + opts.cls : ''}" style="${opts.ac ? acv(opts.ac) : ''}${opts.wide ? 'max-width:640px' : ''}">${html}<div class="row">${(actions || []).map((a, i) => `<button class="btn ${a.cls || ''}" data-i="${i}">${a.l}</button>`).join('')}</div></div>`);
    document.body.appendChild(d); const close = () => { d.remove(); modal = document.querySelectorAll('.modal').length > 0; };
    d.querySelectorAll('[data-i]').forEach(b => b.onclick = ev => { ev.stopPropagation(); SND.ui('click'); const a = actions[+b.dataset.i]; if (a.keep) { a.fn && a.fn(d); return; } close(); a.fn && a.fn(d); });
    if (opts.bind) opts.bind(d, close); return {  close };
  }
  function confirmBox(text, yes, no) { box(`<p>${esc(text)}</p>`, [{ l: 'نعم', cls: 'danger', fn: yes }, { l: 'إلغاء', fn: no }]); }
  /* ---------------- toasts ---------------- */
  function toast(text, kind, x, y) {
    const bx = $('alerts'); if (!bx) return;
    if (G && Settings.popups === false) { if (kind === 'bad') { const m = $('bMute'); if (m) { m.classList.remove('ping'); void m.offsetWidth; m.classList.add('ping'); } } return; } // pop-ups muted during play
    const t = el('div', 'toast ' + (kind || 'info'), esc(text)); t.dataset.id = ++toastId;
    if (x !== undefined && G) { t.classList.add('loc'); t.onclick = () => Input.lookAt(x, y); }
    if (!G) { // outside battle: float above the screens
      let fb = $('mtoasts'); if (!fb) { fb = el('div', ''); fb.id = 'mtoasts'; fb.style.cssText = 'position:fixed;bottom:calc(14px + var(--sb));left:50%;transform:translateX(-50%);z-index:140;display:flex;flex-direction:column;gap:4px;align-items:center;pointer-events:none'; document.body.appendChild(fb); }
      fb.prepend(t); while (fb.children.length > 3) fb.lastChild.remove(); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 500); }, 2600); return;
    }
    bx.prepend(t); while (bx.children.length > 3) bx.lastChild.remove(); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 500); }, kind === 'bad' ? 4200 : 3000);
  }
  function achToast(a) {
    const bx = $('achbox'); if (!bx) return; if (Settings.achPop === false || (G && Settings.popups === false)) return; const t = el('div', 'atoast', `<div class="am">🏅</div><div><b>إنجاز: ${esc(a.n)}</b><span>${esc(a.d)}</span></div>`);
    bx.appendChild(t); SND.ui('achieve'); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 600); }, 4200);
  }
  /* ---------------- HUD ----------------
     · context panel (#ctx) slides in from the right when a producer building, the HQ or a construction machine is tapped
     · selection bar (#selbar) sits top-left: icon, name, health and orders; "?" expands the details in place
     · minimap bottom-left, quick actions bottom-right */
  let mmCanvas, mmCtx, mmBase = null, mmScale = 1, mmW = 0, mmH = 0, mmT = 0;
  function enterGame(g) {
    G = g; hideScreens(); closeTech(); $('hud').classList.remove('hid'); paused = false; modal = false;
    try { if (window.matchMedia && matchMedia('(pointer: coarse)').matches) { history.pushState({ tw: 1 }, ''); if (!enterGame.bound) { enterGame.bound = true; window.addEventListener('popstate', () => { if (G && !G.over) { if (!paused) pause(); try { history.pushState({ tw: 1 }, ''); } catch (e) { } } }); } } } catch (e) { }
    closeCtx(true); onSelect([]);
    mmCanvas = $('mm'); mmCtx = mmCanvas.getContext('2d'); const m = G.map; batMeta = {}; frozen = false; $('frzbar').classList.add('hid'); $('bFreeze').classList.remove('on'); $('bFreeze').classList.toggle('hid', !!G.net); $('gembar').classList.add('hid');
    const img = minimapImage(m); const base = document.createElement('canvas'); base.width = m.w; base.height = m.h; base.getContext('2d').putImageData(new ImageData(img, m.w, m.h), 0, 0); mmBase = base; sizeMini();
    $('bSpeed').textContent = '×' + G.speed; $('bSpeed').classList.toggle('hid', !!G.net); $('bChat').classList.toggle('hid', !G.net); $('bMute').classList.toggle('muted', Settings.popups === false); chatHist.length = 0; chatUnread = 0; chatBadge(); chatShow(false); $('netst').classList.toggle('hid', !G.net);
    $('wavebar').classList.toggle('hid', G.mode !== 'survival'); $('hud').classList.toggle('wave', G.mode === 'survival');
    hudUpdate(true); fitTopbar(true); requestAnimationFrame(() => fitTopbar(true));
  }
  function exitGame() { closeTech(); closeCtx(true); G = null; $('hud').classList.add('hid'); }
  const TI = {
    bld: '<path d="M3 21V10l6-4v4l6-4v4l6-4v15z"/><path d="M7 21v-4h3v4M14 21v-4h3v4"/>', def: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    inf: '<circle cx="12" cy="6" r="3"/><path d="M6 21v-5c0-3 2.7-5 6-5s6 2 6 5v5"/>', veh: '<rect x="3" y="12" width="18" height="6" rx="3"/><rect x="7" y="8" width="8" height="4" rx="1"/><path d="M15 10h6"/>',
    air: '<path d="M12 2l1.6 7 7.4 4v2l-7.2-2-.8 5 3 2v1l-4-1-4 1v-1l3-2-.8-5L3 15v-2l7.4-4z"/>',
    mach: '<path d="M4 20h16M6 20V8l8-4v4h4"/><path d="M14 8v6"/><circle cx="14" cy="16" r="1.5"/>', cmd: '<path d="M12 2l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 15.6 6.6 18.5l1.2-6L3.3 8.3l6.1-.7z"/>',
    sup: '<rect x="2" y="9" width="12" height="8" rx="1"/><path d="M14 12h4l3 3v2h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
  };
  const TABS = { bld: 'مبانٍ', def: 'دفاع', inf: 'مشاة', veh: 'مركبات', air: 'جو', mach: 'آلات', cmd: 'القيادة', sup: 'إمداد' };
  const PWI = { recon: '<circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>', strike: '<path d="M12 2l1.6 7 7.4 4v2l-7.2-2-.8 5 3 2v1l-4-1-4 1v-1l3-2-.8-5L3 15v-2l7.4-4z"/>', para: '<path d="M3 11a9 7 0 0 1 18 0z"/><path d="M3 11l9 9 9-9M12 11v9"/>', infil: '<path d="M4 20l4-9 3 3 3-6 6 12"/><circle cx="15" cy="5" r="2"/>', drones: '<rect x="9" y="10" width="6" height="4" rx="1"/><path d="M9 11L5 7M15 11l4-4M9 13l-4 4M15 13l4 4"/><circle cx="5" cy="7" r="2"/><circle cx="19" cy="7" r="2"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="17" r="2"/>', spy: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/><path d="M3 3l18 18"/>', nuke: '<circle cx="12" cy="12" r="2"/><path d="M12 10V3a9 9 0 0 1 7.8 4.5L13.7 11M10.3 11L4.2 7.5A9 9 0 0 1 12 3M13.7 13l6.1 3.5A9 9 0 0 1 12 21v-7M10.3 13l-6.1 3.5"/>', barrage: '<path d="M6 3v9M12 5v11M18 3v9"/><path d="M4 21h16"/><circle cx="6" cy="15" r="1.5"/><circle cx="12" cy="19" r="1.5"/><circle cx="18" cy="15" r="1.5"/>', repair: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>', super: '<path d="M12 2c3 3 4 7 4 11h-8c0-4 1-8 4-11z"/><path d="M8 13l-3 4h3M16 13l3 4h-3M10 17v4M14 17v4"/>', tech: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2v4.3M12 11.5L6.3 17M12 11.5l5.7 5.5"/>' };
  const svgI = (p, cls) => `<svg viewBox="0 0 24 24"${cls ? ' class="' + cls + '"' : ''}>${p}</svg>`;
  const bOK = (t, f) => { const d = BLD[t]; return d && !(d.only && d.only !== f); };
  // unit lists per category (order of appearance in the panel)
  const CAT_ROLES = { inf: ['rifle', 'at', 'jav', 'sniper', 'aainf', 'mortar', 'medic'], veh: ['scout', 'ifv', 'mbt', 'tank2', 'arty', 'mlrs', 'aa', 'sam2'], air: ['heli', 'heli2', 'jet', 'drone', 'fpv'], sup: ['supply', 'supply2'] };
  // resource glyphs used in prices: iron ingot and parts crate
  const IRON_I = '<svg viewBox="0 0 24 24" class="pi ri"><path d="M7.2 6.5h9.6l2.4 4.2H4.8z"/><path d="M4.8 10.7h14.4l2.3 6.8H2.5z"/></svg>', PARTS_I = '<svg viewBox="0 0 24 24" class="pi rp"><path d="M3.5 7.8L12 3.6l8.5 4.2v8.6L12 20.6l-8.5-4.2z"/><path d="M3.5 7.8L12 12l8.5-4.2M12 12v8.6"/></svg>';
  const SUBCAT = { // sub-menus inside the barracks and the vehicle factory
    veh: [['tank', 'دبابات ومدرعات', ['scout', 'ifv', 'mbt', 'tank2']], ['arty', 'مدفعية وراجمات', ['arty', 'mlrs', 'tos']], ['aa', 'دفاع جوي', ['aa', 'sam2']], ['fx', 'قوات خيالية', ['fxbike', 'fxhover', 'fxtesla', 'fxspider', 'fxtitan']]],
    inf: [['rifle', 'مشاة', ['rifle', 'medic']], ['at', 'مضاد للدروع', ['at', 'jav']], ['sup', 'دعم ودفاع جوي', ['mortar', 'aainf']], ['spec', 'قوات خاصة وقناصة', ['spec', 'sniper']], ['fx', 'قوات خيالية', ['fxexo']]],
  };
  const PROD_CAT = { mach: 'mach', inf: 'inf', veh: 'veh', air: 'air', supply: 'sup' };
  /* ---------------- context panel ---------------- */
  let cx = null; // { kind: 'build'|'prod'|'cmd', id, tabs, tab }
  function ctxFor(sel) {
    const e = sel && sel[0]; if (!e || e.owner !== G.local || e.dead) return null;
    if (e.k === 'u' && e.def.work && sel.every(u => u.k === 'u' && u.def.work)) return { kind: 'build', id: e.id, tabs: ['bld', 'def'] };
    if (e.k === 'b' && sel.length === 1 && e.built >= 1) {
      const cats = (e.def.prod || []).map(c => PROD_CAT[c]).filter(Boolean);
      if (cats.length) return { kind: 'prod', id: e.id, tabs: cats };
      return { kind: 'info', id: e.id, tabs: [] };
    }
    return null;
  }
  function ctxEnt() { return cx && cx.id ? G.get(cx.id) : null; }
  function openCtx(c, tab) {
    const same = cx && cx.kind === c.kind && cx.id === c.id; const prevTab = cx && cx.tab; const prevSub = same ? cx.sub : null; cx = c; cx.sub = prevSub; if (!same || tab) cx.tab = tab && c.tabs.includes(tab) ? tab : c.tabs[0]; else cx.tab = cx.tab || (c.tabs.includes(prevTab) ? prevTab : c.tabs[0]);
    const p = $('ctx'); const was = p.classList.contains('closed'); p.classList.remove('closed'); $('hud').classList.add('ctxopen');
    if (was) SND.ui('tab'); renderCtx(); }
  function closeCtx(silent) { const p = $('ctx'); if (p) p.classList.add('closed'); $('hud').classList.remove('ctxopen'); if (cx && !silent) SND.ui('tab'); cx = null; tip(null); }
  function renderCtx() {
    if (!cx || !G) return; const e = ctxEnt(); const f = G.me.f; const img = $('ctxi'); img.classList.remove('ok'); img.removeAttribute('src');
    let n = '', sub = '';
    if (cx.kind === 'ops') { n = 'غرفة العمليات'; sub = 'العمليات الخاصة · السلاح الاستراتيجي · النخبة'; img.style.visibility = 'hidden'; }
    else if (cx.kind === 'army') { n = 'كل الوحدات'; sub = 'المس نوعاً لتحديد كل وحداته'; img.style.visibility = 'hidden'; }
    else if (cx.kind === 'bat') { n = 'الكتائب والوحدات'; sub = 'جمّع قواتك في كتائب ووحدات واخترها بلمسة'; img.style.visibility = 'hidden'; }
    else if (e) { img.style.visibility = ''; if (e.k === 'u') { n = e.def.n; sub = cx.kind === 'build' ? 'اختر مبنى ثم حدد مكانه' : e.def.sub || ''; icon(img, 'u', e.type); } else { n = G.bname(e); sub = cx.kind === 'info' ? (Levels.upgradable(e) ? 'المستوى ' + Levels.lv(e) + ' من 3' : (e.def.d || '').slice(0, 60)) : 'المستوى ' + Levels.lv(e) + ' · اختر ما تريد إنتاجه'; icon(img, 'b', f, e.type); } }
    $('ctxn').textContent = n; $('ctxs').textContent = sub; $('ctxa').dataset.sig = ''; renderActs(); buildTabs(); buildGrid();
  }
  function buildTabs() { const t = $('tabs'); t.innerHTML = ''; if (!cx || cx.tabs.length < 2) return; for (const k of cx.tabs) { const b = el('button', 'tab' + (k === cx.tab ? ' on' : ''), `${svgI(TI[k])}<span>${TABS[k]}</span><i class="badge"></i>`); b.dataset.t = k; b.onclick = () => { SND.ui('tab'); cx.tab = k; cx.sub = null; buildTabs(); buildGrid(); }; t.appendChild(b); } }
  function unitsFor(cat, producer) {
    const f = G.me.f; let roles = cat === 'mach' ? MACHINE_ROLES : CAT_ROLES[cat] || [];
    const extra = Object.keys(UNITS).filter(id => { const d = UNITS[id]; return d.f === f && !d.elite && d.build === producer && !roles.includes(d.role); }).map(id => UNITS[id].role);
    roles = roles.concat(extra);
    return roles.map(r => f + '_' + r).filter(id => UNITS[id] && !UNITS[id].elite && (!producer || UNITS[id].build === producer) && (!UNITS[id].fx || Eco.owns('troop', UNITS[id].role))).map(id => ({ k: 'u', id })); // fantasy troops: only once bought in the shop
  }
  function items() {
    if (!cx) return []; const pl = G.me, f = pl.f, tab = cx.tab; const e = ctxEnt();
    if (cx.kind === 'info') return [{ k: 'hint', n: e ? (e.def.d || '') : '' }];
    if (cx.kind === 'bat') { const L = bats(); return [{ k: 'batnew' }].concat(L.map(B => ({ k: 'bat', B })), L.length ? [] : [{ k: 'hint', n: 'حدد وحدات على الأرض ثم اضغط «كتيبة جديدة» أو «وحدة جديدة». المس الكتيبة لتحديد كل جنودها، و＋ لضم الوحدات المحددة إليها.' }]); }
    if (cx.kind === 'army') { const g = {}; for (const u of army()) (g[u.type] = g[u.type] || []).push(u); const out = [{ k: 'grp', t: '*', n: army().length }]; for (const t of Object.keys(g).sort((a, b) => g[b].length - g[a].length)) out.push({ k: 'grp', t, n: g[t].length }); return out; }
    if (cx.kind === 'prod' && SUBCAT[tab]) {
      const all = unitsFor(tab, e && e.k === 'b' ? e.type : null); const S = SUBCAT[tab];
      const groupOf = id => { const r = UNITS[id].role; const i = S.findIndex(s => s[2].includes(r)); return i < 0 ? 0 : i; };
      if (!cx.sub) return S.map((s, i) => ({ k: 'cat', i, n: s[1], ic: (all.find(it => groupOf(it.id) === i) || {}).id, cnt: all.filter(it => groupOf(it.id) === i).length })).filter(c => c.cnt > 0);
      const si = S.findIndex(s => s[0] === cx.sub); return [{ k: 'back', n: S[si][1] }].concat(all.filter(it => groupOf(it.id) === si));
    }
    if (tab === 'bld') return [{ k: 'hint', n: 'اختر المبنى ثم حرّكه إلى مكانه واضغط ✓ — تتولى الآلة المحددة بناءه.' }].concat(['power', 'mine', 'partsdep', 'barracks', 'supply', 'factory', 'ops', 'airfield', 'radar'].concat(['super']).filter(t => bOK(t, f)).map(t => ({ k: 'b', t })));
    if (tab === 'def') return ['mg', 'atg', 'shorad', 'sam', 'wall'].filter(t => bOK(t, f)).map(t => ({ k: 'b', t }));
    if (tab === 'cmd') {
      const out = [{ k: 'sep', n: 'العمليات الخاصة' }].concat(POWERS.map(p => ({ k: 'p', p })), [{ k: 'sep', n: 'السلاح الاستراتيجي' }, { k: 's' }]);
      const el2 = eliteList(f); if (el2.length) { out.push({ k: 'sep', n: 'وحدات النخبة' }); for (const u of el2) out.push({ k: 'sp', id: u.id }); }
      return out;
    }
    return unitsFor(tab, e && e.k === 'b' ? e.type : null);
  }
  const powName = (f, P) => (FPOW_NAMES[f] && FPOW_NAMES[f][P.id]) || P.n;
  function machinesSel() { return Input.sel.filter(u => u.k === 'u' && u.owner === G.local && u.def.work && !u.dead).map(u => u.id); }
  function buildGrid() {
    const grid = $('grid'); const gk = cx ? cx.kind + '|' + cx.id + '|' + cx.tab + '|' + (cx.sub || '') : ''; const keepY = grid.dataset.k === gk ? grid.scrollTop : 0; grid.innerHTML = ''; if (!cx || !G) { $('qstrip').innerHTML = ''; grid.dataset.k = ''; return; } const pl = G.me, f = pl.f; const prodB = cx.kind === 'prod' ? cx.id : 0;
    for (const it of items()) {
      if (it.k === 'sep') { grid.appendChild(el('div', 'gsep', esc(it.n))); continue; }
      if (it.k === 'hint') { grid.appendChild(el('div', 'ghint', esc(it.n))); continue; }
      if (it.k === 'cat') { const c = el('button', 'it wide gcat', `<img alt=""><div class="wtx"><b>${esc(it.n)}</b><span class="pr">${it.cnt} وحدات</span></div><svg viewBox="0 0 24 24" class="chev"><path d="M15 6l-6 6 6 6"/></svg>`); if (it.ic) icon(c.querySelector('img'), 'u', it.ic); c.onclick = () => { SND.ui('tab'); cx.sub = SUBCAT[cx.tab][it.i][0]; buildGrid(); }; grid.appendChild(c); continue; }
      if (it.k === 'batnew') { const n = selArmy().length; const c = el('div', 'batnew', `<button class="ca go" data-t="bat"${n ? '' : ' disabled'}><svg viewBox="0 0 24 24"><path d="M12 4.5v15M4.5 12h15"/></svg>كتيبة جديدة${n ? ' (' + n + ')' : ''}</button><button class="ca go" data-t="sq"${n ? '' : ' disabled'}><svg viewBox="0 0 24 24"><path d="M12 4.5v15M4.5 12h15"/></svg>وحدة جديدة${n ? ' (' + n + ')' : ''}</button>`); c.querySelectorAll('button').forEach(b => b.onclick = ev => { ev.stopPropagation(); SND.ui('click'); newBat(b.dataset.t); }); grid.appendChild(c); continue; }
      if (it.k === 'bat') { const B = it.B; const c = el('div', 'it wide batc' + (B.t === 'sq' ? ' sq' : '') + (B.on ? ' on' : ''), `<img alt=""><div class="wtx"><b>${esc(B.name)}</b><span class="pr">${B.units.length} ${B.units.length > 10 ? 'جندياً ومركبة' : 'وحدات'} · ${B.t === 'sq' ? 'وحدة' : 'كتيبة'}</span></div><button class="bta" data-x="add" aria-label="ضم المحدد">＋</button><button class="bta del" data-x="del" aria-label="حلّ">✕</button>`); icon(c.querySelector('img'), 'u', B.main);
        c.onclick = () => { SND.ui('click'); selectBat(B.id); }; c.querySelectorAll('.bta').forEach(b => b.onclick = ev => { ev.stopPropagation(); SND.ui('click'); if (b.dataset.x === 'add') addToBat(B.id); else { delete Input.groups[B.id]; delete batMeta[B.id]; buildGrid(); } }); grid.appendChild(c); continue; }
      if (it.k === 'back') { const c = el('button', 'gback', `${ARROW}<span>${esc(it.n)}</span>`); c.onclick = () => { SND.ui('tab'); cx.sub = null; buildGrid(); }; grid.appendChild(c); continue; }
      if (it.k === 'grp') { const c = el('button', 'it', it.t === '*' ? `<div class="powi pw_all">${svgI('<circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M2.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6M14 14.5c3.5-.6 7 1.4 7 5.5"/>')}</div><b>الكل</b><i class="cnt">${it.n}</i>` : `<img alt=""><b>${esc(UNITS[it.t].n)}</b><i class="cnt">${it.n}</i>`); if (it.t !== '*') icon(c.querySelector('img'), 'u', it.t); const on = Input.sel.length && Input.sel.every(u => it.t === '*' || u.type === it.t) && (it.t !== '*' || Input.sel.length === it.n); if (on) c.classList.add('on'); c.onclick = () => { SND.ui('click'); const us = army().filter(u => it.t === '*' || u.type === it.t); Input.setSel(us); ack(us, 's'); buildGrid(); }; grid.appendChild(c); continue; }
      const b = el('button', 'it'); let cost = 0;
      if (it.k === 'b') { cost = Build.bcost(G, G.local, it.t); b.innerHTML = `<img alt=""><b>${esc(bldName(f, it.t))}</b><span class="pr">$${fm(cost)}${Build.bIron(it.t) ? ' · ' + IRON_I + fm(Build.bIron(it.t)) : ''}</span>`; icon(b.querySelector('img'), 'b', f, it.t); b.onclick = () => { const av = Build.buildAvailable(G, G.local, it.t); if (!av.ok) { toast(av.why || 'غير متاح', 'warn'); SND.ui('nomoney'); return; } if (pl.money < Build.bcost(G, G.local, it.t)) { toast('لا يوجد مال كافٍ', 'warn'); SND.ui('nomoney'); return; } SND.ui('click'); const ms = machinesSel(); Input.startPlace(it.t, ms.length ? ms : undefined); }; }
      else if (it.k === 'u') { const d = UNITS[it.id]; const av0 = Build.unitAvailable(G, G.local, it.id); const tn = Levels.tierName(f, d.role, Levels.prodLevel(G, G.local, d.build)); b.innerHTML = `${av0.lvl ? '<i class="need">م' + av0.lvl + '</i>' : ''}<img alt=""><b>${esc(tn || d.n)}</b><span class="pr">$${fm(Build.ucost(G, G.local, d))} · ${PARTS_I}${fm(Build.uParts(d))}</span><i class="q"></i><i class="prog"></i>`; icon(b.querySelector('img'), 'u', it.id);
        b.onclick = () => { const av = Build.unitAvailable(G, G.local, it.id); if (!av.ok) { toast(av.why || 'غير متاح', 'warn'); SND.ui('nomoney'); return; } Cmd.send(prodB ? { c: 'q', u: it.id, n: 1, b: prodB } : { c: 'q', u: it.id, n: 1 }); hudUpdate(true); };
        b.oncontextmenu = e => { e.preventDefault(); Cmd.send(prodB ? { c: 'cq', u: it.id, b: prodB } : { c: 'cq', u: it.id }); hudUpdate(true); };
        let lp = null; b.addEventListener('pointerdown', () => { lp = setTimeout(() => { lp = 'done'; Cmd.send(prodB ? { c: 'q', u: it.id, n: 5, b: prodB } : { c: 'q', u: it.id, n: 5 }); hudUpdate(true); }, 550); }); b.addEventListener('pointerup', e => { if (lp === 'done') { e.preventDefault(); e.stopPropagation(); b.blockClick = true; setTimeout(() => b.blockClick = false, 50); } clearTimeout(lp); lp = null; }); b.addEventListener('pointerleave', () => { clearTimeout(lp); }); b.addEventListener('click', e => { if (b.blockClick) e.stopImmediatePropagation(); }, true); }
      else if (it.k === 'p') { const P = it.p; const nm = powName(f, P); b.innerHTML = `<div class="powi pw_${P.id}">${svgI(PWI[P.id] || PWI.recon)}</div><b>${esc(nm)}</b><span class="pr">رتبة ${CMD_RANK_N[P.rank]}</span><i class="prog"></i>`; b.onclick = () => { if (!Build.powerReady(G, G.local, P.id)) { const why = pl.rank < P.rank ? 'يتطلب رتبة ' + CMD_RANK_N[P.rank] : !G.has(G.local, 'ops') ? 'يتطلب ' + bldName(f, 'ops') : 'قيد إعادة الشحن'; toast(why, 'warn'); return; } SND.ui('click'); Input.startTarget('power', (x, y) => Cmd.send({ c: 'pw', id: P.id, x: Math.round(x), y: Math.round(y) }), P.r, 'حدد موقع: ' + nm); }; }
      else if (it.k === 's') { const S = SUPER[f]; b.innerHTML = `<div class="powi pw_super">${svgI(PWI.super)}</div><b>${esc(S.n)}</b><span class="pr">السلاح الاستراتيجي</span><i class="prog"></i>`; b.classList.add('super'); b.onclick = () => { if (!pl.superReady) { toast(pl.superB ? 'السلاح قيد الشحن' : 'ابنِ ' + bldName(f, 'super') + ' أولاً', 'warn'); return; } SND.ui('click'); Input.startTarget('super', (x, y) => Cmd.send({ c: 'su', x: Math.round(x), y: Math.round(y) }), S.r + (S.area || 0) * 0.4, 'حدد هدف: ' + S.n); }; }
      else if (it.k === 'tech') { b.className = 'it wide'; b.innerHTML = `<div class="powi pw_tech">${svgI(PWI.tech)}</div><div class="wtx"><b>شجرة التطوير</b><span class="pr tst"></span><div class="bar"><i></i></div></div>`; b.onclick = () => { SND.ui('click'); openTech(); }; }
      else if (it.k === 'sp') { const d = UNITS[it.id]; b.classList.add('elite'); b.innerHTML = `<img alt=""><b>${esc(d.n)}</b><span class="pr">نخبة · مجاناً</span><i class="cnt"></i>`; icon(b.querySelector('img'), 'u', it.id); b.onclick = () => { const left = (pl.specials[it.id] || 0) - ((pl.specUsed || {})[it.id] || 0); if (left <= 0) { toast('استُخدمت كل البطاقات من هذه الوحدة', 'warn'); return; } box(`<h3>${esc(d.n)}</h3><p>${esc(d.d || '')}<br><span class="muted">ستصل الوحدة إلى مقرك فوراً وتستهلك بطاقة واحدة.</span></p>`, [{ l: 'استدعاء الآن', cls: 'pri', fn: () => { Cmd.send({ c: 'sp', id: it.id }); hudUpdate(true); } }, { l: 'إلغاء' }]); }; }
      b._it = it; b.addEventListener('pointerenter', ev => { if (ev.pointerType === 'mouse') tip(b, it); }); b.addEventListener('pointerleave', () => tip(null));
      let tipT = null; b.addEventListener('touchstart', () => { tipT = setTimeout(() => tip(b, it, true), 420); }, { passive: true }); b.addEventListener('touchend', () => { clearTimeout(tipT); setTimeout(() => tip(null), 1600); }, { passive: true });
      grid.appendChild(b);
    }
    grid.dataset.k = gk; grid.scrollTop = keepY; qstrip(true); hudUpdate(true);
  }
  /* ---------- battalions («+» next to the operations room): named groups stored in Input.groups (keyboard Ctrl+1..9 shares them) ---------- */
  let batMeta = {};
  const selArmy = () => Input.sel.filter(u => u.k === 'u' && u.owner === G.local && !u.dead && !u.def.work && !u.def.harvest);
  function bats() {
    const out = []; const sel = new Set(Input.sel);
    for (let n = 1; n <= 9; n++) { const ids = Input.groups[n]; if (!ids || !ids.length) continue; const units = ids.map(id => G.get(id)).filter(u => u && !u.dead); if (!units.length) continue;
      const cnt = {}; for (const u of units) cnt[u.type] = (cnt[u.type] || 0) + 1; const main = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0]; const m = batMeta[n] || { t: 'bat', name: 'الكتيبة ' + n };
      out.push({ id: n, t: m.t, name: m.name, units, main, on: units.every(u => sel.has(u)) }); }
    return out;
  }
  function newBat(t) {
    const us = selArmy(); if (!us.length) { toast('حدد وحدات قتالية أولاً', 'warn'); return; }
    let n = 1; for (; n <= 9; n++) { const ids = Input.groups[n]; if (!ids || !ids.some(id => { const u = G.get(id); return u && !u.dead; })) break; } if (n > 9) { toast('لديك 9 كتائب — احذف واحدة أولاً', 'warn'); return; }
    const k = Object.values(batMeta).filter(m => m.t === t).length + 1; Input.groups[n] = us.map(u => u.id); batMeta[n] = { t, name: (t === 'sq' ? 'الوحدة ' : 'الكتيبة ') + ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة'][Math.min(8, k - 1)] };
    toast('تم تشكيل ' + batMeta[n].name + ' من ' + us.length + ' وحدات', 'good'); ack(us, 'o'); buildGrid();
  }
  function addToBat(n) { const us = selArmy(); if (!us.length) { toast('حدد الوحدات التي تريد ضمها', 'warn'); return; } const set = new Set(Input.groups[n] || []); for (const u of us) set.add(u.id); Input.groups[n] = [...set]; toast('انضمت ' + us.length + ' وحدات إلى ' + (batMeta[n] || { name: 'الكتيبة' }).name, 'good'); buildGrid(); }
  function selectBat(n) { const list = (Input.groups[n] || []).map(id => G.get(id)).filter(u => u && !u.dead); if (!list.length) return; Input.setSel(list); let x = 0, y = 0; for (const u of list) { x += u.x; y += u.y; } Input.lookAt(x / list.length, y / list.length); ack(list, 's'); buildGrid(); }
  /* ---------- gems in battle: promote the selected soldiers / finish a construction or upgrade now ---------- */
  function buildProg(b) { let s = 0; for (const k in b.works) s += Math.min(b.prog[k] || 0, b.works[k]); return s / (b.total || 1); }
  function gemBar() {
    const bar = $('gembar'); if (!bar || !G || G.over) { if (bar) bar.classList.add('hid'); return; } const sel = Input.sel; let act = null;
    const us = sel.filter(u => u.k === 'u' && u.owner === G.local && !u.dead && !u.def.work && !u.def.harvest && u.rank < RANKS.length - 1);
    if (us.length) act = { k: 'promo', cost: us.reduce((a, u) => a + (GEM_PROMO[u.def.cls] || 2), 0), label: us.length > 1 ? 'ترقية ' + us.length + ' وحدات رتبة' : 'ترقية الوحدة رتبة', ids: us.map(u => u.id) };
    else if (sel.length === 1 && sel[0].k === 'b' && sel[0].owner === G.local && !sel[0].dead) { const b = sel[0];
      if (b.built < 1) act = { k: 'rush', cost: gemRush(1 - buildProg(b), b.def.cost), label: 'إنهاء البناء فوراً', b: b.id };
      else if (b.upg) act = { k: 'rush', cost: gemRush(1 - b.upg.t / b.upg.T, Levels.upCost(b) || 1200), label: 'إنهاء الترقية فوراً', b: b.id }; }
    if (!act) { bar.classList.add('hid'); bar._act = null; return; }
    const g = Eco.bal().g; bar._act = act; bar.classList.remove('hid'); const sig = act.k + act.cost + act.label + g;
    if (bar.dataset.sig !== sig) { bar.dataset.sig = sig; const b = $('gemAct'); b.innerHTML = `${Eco.ico('g')}<span>${act.label}</span><b>${act.cost}</b><em>لديك ${g}</em>`; b.classList.toggle('no', g < act.cost); }
  }
  function useGems() {
    const a = $('gembar')._act; if (!a || !G) return;
    if (!Eco.spendGems(a.cost)) { SND.ui('nomoney'); toast('لا تملك جواهر كافية — اجمعها من المكافآت', 'warn'); return; }
    if (a.k === 'promo') { Cmd.send({ c: 'gp', ids: a.ids }); SND.ui('promote'); toast(a.ids.length > 1 ? 'تمت ترقية ' + a.ids.length + ' وحدات' : 'تمت ترقية الوحدة', 'good'); }
    else { Cmd.send({ c: 'gr', b: a.b }); SND.ui('built'); }
    $('gembar').dataset.sig = ''; setTimeout(gemBar, 30);
  }
  /* ---------- minimap size: large · medium · small · hidden (button on the map + settings) ---------- */
  const MMK = [0, 0.7, 1, 1.45];
  const mmSize = () => (Settings.mm === undefined ? 2 : clamp(+Settings.mm | 0, 0, 3));
  function sizeMini() {
    if (!G || !mmCanvas) return; const s = mmSize(), hud = $('hud'); for (let i = 0; i < 4; i++) hud.classList.toggle('mm' + i, s === i);
    const bx = $('mini'); bx.style.width = ''; bx.style.height = ''; if (!s) return; const m = G.map;
    const maxW = (bx.clientWidth || 150) * MMK[s], maxH = (bx.clientHeight || 150) * MMK[s]; const k = Math.min(maxW / m.w, maxH / m.h); mmW = Math.max(40, Math.round(m.w * k)); mmH = Math.max(30, Math.round(m.h * k)); mmScale = k;
    mmCanvas.width = mmW * 2; mmCanvas.height = mmH * 2; mmCanvas.style.width = mmW + 'px'; mmCanvas.style.height = mmH + 'px'; bx.style.width = mmW + 'px'; bx.style.height = mmH + 'px'; minimap();
  }
  /* ---------- pause toggle (next to the speed button) and quick settings (gear next to the menu) ---------- */
  let frozen = false;
  function freeze(on) { if (!G || G.over || G.net) return; frozen = on === undefined ? !frozen : !!on; paused = frozen; $('frzbar').classList.toggle('hid', !frozen); $('bFreeze').classList.toggle('on', frozen); SND.ui('click'); }
  function quickSettings() {
    if (!G) return; const row = (l, k, opts, cur) => `<div class="frow"><label>${l}</label>${seg(k, opts, cur)}</div>`;
    box(`<h3 style="margin-bottom:8px">الإعدادات السريعة</h3><div class="qset">
      ${row('الصوت', 'qs_snd', [[1, 'تشغيل'], [0, 'كتم']], Settings.master > 0.01 ? 1 : 0)}${row('الموسيقى', 'qs_mus', [[1, 'تشغيل'], [0, 'إيقاف']], Settings.music > 0.01 ? 1 : 0)}
      ${row('الإشعارات المنبثقة', 'qs_pop', [[1, 'تظهر'], [0, 'مكتومة']], Settings.popups === false ? 0 : 1)}${row('إشعارات الإنجازات', 'qs_ach', [[1, 'تظهر'], [0, 'مكتومة']], Settings.achPop === false ? 0 : 1)}
      ${row('الخريطة المصغرة', 'qs_mm', [[3, 'كبيرة'], [2, 'متوسطة'], [1, 'صغيرة'], [0, 'مخفية']], mmSize())}${row('أشرطة التحمّل', 'qs_bars', [['selected', 'المحدد'], ['damaged', 'المصاب'], ['always', 'دائماً']], Settings.bars)}
      ${row('تأكيد الترقية', 'qs_up', [[1, 'نافذة تأكيد'], [0, 'ترقية فورية']], Settings.upConfirm === false ? 0 : 1)}${row('اهتزاز الشاشة', 'qs_shake', [[1, 'مفعّل'], [0, 'معطّل']], Settings.shake ? 1 : 0)}</div>`,
      [{ l: 'كل الإعدادات', fn: () => { frozen = false; $('frzbar').classList.add('hid'); paused = true; Menus.settings(true); } }, { l: 'إغلاق', cls: 'pri' }],
      { wide: true, bind: d => segBind(d, (k, v) => {
        if (k === 'qs_snd') { if (+v) Settings.master = Settings._mvol || 0.9; else { Settings._mvol = Settings.master || 0.9; Settings.master = 0; } SND.applyVolumes(); }
        else if (k === 'qs_mus') { if (+v) Settings.music = Settings._muvol || 0.55; else { Settings._muvol = Settings.music || 0.55; Settings.music = 0; } SND.applyVolumes(); }
        else if (k === 'qs_pop') { Settings.popups = v === '1'; $('bMute').classList.toggle('muted', !Settings.popups); }
        else if (k === 'qs_ach') Settings.achPop = v === '1';
        else if (k === 'qs_mm') { Settings.mm = +v; sizeMini(); }
        else if (k === 'qs_bars') Settings.bars = v;
        else if (k === 'qs_shake') Settings.shake = v === '1';
        else if (k === 'qs_up') Settings.upConfirm = v === '1';
        saveSettings(); }) });
  }
  function qstrip(force) {
    const q = $('qstrip'); const e = cx && cx.kind === 'prod' ? ctxEnt() : null; if (!e || e.k !== 'b') { if (q.innerHTML) q.innerHTML = ''; return; }
    const sig = e.q.map(x => x.u).join(','); if (force || q.dataset.sig !== sig) { q.dataset.sig = sig; q.innerHTML = e.q.map((x, i) => `<button class="qs" data-i="${i}"><img alt=""><i></i></button>`).join(''); q.querySelectorAll('.qs').forEach((b, i) => { icon(b.querySelector('img'), 'u', e.q[i].u); b.onclick = () => { SND.ui('click'); Cmd.send({ c: 'cq', b: e.id, i: +b.dataset.i, u: e.q[+b.dataset.i] ? e.q[+b.dataset.i].u : '' }); hudUpdate(true); }; }); }
    const first = q.querySelector('.qs i'); if (first && e.q[0]) first.style.width = Math.round(e.q[0].t / e.q[0].T * 100) + '%';
  }
  function tip(btn, it, touch) {
    const t = $('tip'); if (!btn || !G) { t.classList.add('hid'); return; } const pl = G.me, f = pl.f; let h = '';
    if (it.k === 'u' || it.k === 'sp') { const d = UNITS[it.id]; h = `<b>${esc(d.n)}</b><span>${esc(d.sub)}</span><p>${esc(d.d)}</p><div class="tstats">التحمّل ${Math.round(d.hp * UNIT_HP_K)} · السرعة ${d.speed} · الكلفة $${fm(d.cost)}${d.cargo ? ' · يحمل ' + d.cargo : ''}${d.work ? '<br>' + Object.entries(d.work).filter(([k, v]) => v > 0).map(([k, v]) => WORK_NAMES[k] + ' ×' + v).join(' · ') : ''}</div>`; if (it.k === 'u') { const av = Build.unitAvailable(G, G.local, it.id); if (!av.ok) h += `<em>${esc(av.why)}</em>`; } }
    else if (it.k === 'b') { const d = BLD[it.t]; h = `<b>${esc(bldName(f, it.t))}</b><p>${esc(d.d || '')}</p><div class="tstats">${d.power ? 'الكهرباء ' + (d.power > 0 ? '+' : '') + d.power + ' · ' : ''}الحجم ${d.w}×${d.h}${d.coastal ? ' · على الساحل' : ''}${d.oil ? ' · على حقل نفط فقط' : ''}<br>مراحل البناء: ${Object.keys(d.works || {}).map(k => WORK_NAMES[k]).join('، ')}</div>`; const av = Build.buildAvailable(G, G.local, it.t); if (!av.ok) h += `<em>${esc(av.why || '')}</em>`; }
    else if (it.k === 'p') h = `<b>${esc(powName(f, it.p))}</b><p>${esc(it.p.d)}</p><div class="tstats">إعادة الشحن ${it.p.cd} ثانية · يتطلب رتبة ${CMD_RANK_N[it.p.rank]} و${bldName(f, 'ops')}</div>`;
    else if (it.k === 's') { const S = SUPER[f]; h = `<b>${esc(S.n)}</b><p>${esc(S.d)}</p>`; }
    t.innerHTML = h; t.classList.remove('hid');
  }
  /* top bar: the right-hand buttons (menu, settings, pause, speed…) must always stay on screen. When the bar is wider than
     the screen it compacts step by step (css/hud.css → #topbar.tf1…tf5): rank/time → tighter chips → icon-only buttons → no power bar → scrollable resources. */
  const TB_FIT = ['tf1', 'tf2', 'tf3', 'tf4', 'tf5']; let tbW = -1, tbT = 0;
  function fitTopbar(force) {
    const tb = $('topbar'); if (!tb || !tb.offsetWidth) return;
    if (force || tb.clientWidth !== tbW) { tbW = tb.clientWidth; for (const c of TB_FIT) tb.classList.remove(c); }
    for (const c of TB_FIT) { if (!tbOver(tb)) break; tb.classList.add(c); }
  }
  function tbOver(tb) { // too wide, or the button group has slid into the bar's own padding (it sits at the end: right in English, left in Arabic)
    if (tb.scrollWidth > tb.clientWidth + 1) return true;
    const t = tb.querySelector('.tbtns'); if (!t) return false; const r = tb.getBoundingClientRect(), b = t.getBoundingClientRect(), cs = getComputedStyle(tb);
    return cs.direction === 'rtl' ? b.left < r.left + parseFloat(cs.paddingLeft) - 1 : b.right > r.right - parseFloat(cs.paddingRight) + 1;
  }
  function hudUpdate(force) {
    if (!G) return; const pl = G.me;
    { const now = Date.now(); if (force || now - tbT > 1000) { tbT = now; fitTopbar(); } }
    $('money').textContent = '$' + fm(pl.money); $('iron').textContent = fm(pl.iron || 0); $('parts').textContent = fm(pl.parts || 0);
    const pp = pl.pprod, pu = pl.puse; const pf = $('pfill'); pf.style.width = Math.min(100, pp ? pu / pp * 100 : 100) + '%'; pf.className = pu > pp ? 'low' : pu > pp * 0.85 ? 'mid' : ''; $('ptext').textContent = pu + '/' + pp;
    $('pop').textContent = isFinite(pl.popCap) ? pl.pop + '/' + pl.popCap : String(pl.pop); $('rank').textContent = CMD_RANK_N[pl.rank] || ''; $('gtime').textContent = fmtTime(G.t);
    if (G.mode === 'survival' && G.surv) { const S = G.surv; $('wavebar').innerHTML = `الموجة ${S.wave}${S.next > G.t ? ' · التالية بعد ' + fmtTime(S.next - G.t) : ' · ' + S.alive + ' معادٍ'}${S.boss ? ' · ☠ زعيم' : ''} · أفضل ${Profile.stats.waves || 0}`; }
    if (G.net) { const ns = $('netst'); const st = Net.status(); ns.classList.toggle('lag', st.lag); ns.lastElementChild.textContent = st.text; }
    let cmdHot = pl.superReady || POWERS.some(P => Build.powerReady(G, G.local, P.id));
    if (cx) { const e = ctxEnt(); if (cx.id && (!e || e.dead || e.owner !== G.local || e.inT)) closeCtx(true); }
    if (cx) {
      const grid = $('grid'); for (const b of grid.children) { const it = b._it; if (!it) continue; let dis = false, prog = 0, q = 0, lock = false;
        if (it.k === 'b') { const av = Build.buildAvailable(G, G.local, it.t); dis = !av.ok || pl.money < Build.bcost(G, G.local, it.t); lock = !av.ok; }
        else if (it.k === 'u') { const av = Build.unitAvailable(G, G.local, it.id); lock = !av.ok; dis = lock || pl.money < Build.ucost(G, G.local, UNITS[it.id]); const qc = cx.kind === 'prod' && cx.id ? Build.queueCount(G, G.local, it.id, cx.id) : Build.queueCount(G, G.local, it.id); q = qc.n; prog = qc.prog; }
        else if (it.k === 'p') { const P = it.p; const ready = Build.powerReady(G, G.local, P.id); lock = pl.rank < P.rank || !G.has(G.local, 'ops'); dis = !ready; const cd = (pl.pcd[P.id] || 0) - G.t; prog = cd > 0 ? 1 - cd / P.cd : 0; b.classList.toggle('ready', ready); }
        else if (it.k === 's') { const sb = G.get(pl.superB); lock = !sb; dis = !pl.superReady; prog = sb ? sb.charge / (sb.def.charge) : 0; b.classList.toggle('ready', pl.superReady); }
        else if (it.k === 'tech') { const r = pl.research; const st = b.querySelector('.tst'); const done = Object.keys(pl.upg).length, tot = techTree(pl.f).length; if (st) st.textContent = r ? 'جارٍ: ' + ((techById(pl.f, r.id) || {}).n || '') : done + '/' + tot + ' مكتمل'; const bi = b.querySelector('.bar i'); if (bi) bi.style.width = (r ? r.t / r.T * 100 : done / tot * 100) + '%'; }
        else if (it.k === 'sp') { const wait = Math.ceil(((pl.specUsed || {})[it.id] || 0) - G.t); const c = b.querySelector('.cnt'); if (c) c.textContent = wait > 0 ? wait + 'ث' : ''; dis = wait > 0; lock = dis; }
        b.classList.toggle('dis', dis); b.classList.toggle('lk', lock);
        const qi = b.querySelector('.q'); if (qi) qi.textContent = q ? q : ''; const pi = b.querySelector('.prog'); if (pi) pi.style.setProperty('--p', prog); }
      const ct = document.querySelector('#tabs .tab[data-t="cmd"]'); if (ct) ct.classList.toggle('hot', cmdHot && cx.tab !== 'cmd');
      qstrip(false);
    }
    if (cx && cx.id) renderActs(); if (cx && cx.kind === 'army') { const n = army().length; if (n !== cx.n) { cx.n = n; buildGrid(); } }
    gemBar(); if (cx && cx.kind === 'bat') { const sig = selArmy().length + ':' + bats().map(B => B.units.length + (B.on ? '*' : '')).join(','); if (sig !== cx.bsig) { cx.bsig = sig; buildGrid(); } }
    if (techBox) refreshTech();
  }
  function minimap() {
    if (!G || !mmCtx) return; const c = mmCtx, m = G.map, k = 2 * mmScale; c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(mmBase, 0, 0, mmCanvas.width, mmCanvas.height);
    const f = G.fog; if (!f.all) { if (!minimap.fogC) { minimap.fogC = document.createElement('canvas'); } const fc = minimap.fogC; if (fc.width !== m.w || fc.height !== m.h) { fc.width = m.w; fc.height = m.h; minimap.fogI = fc.getContext('2d').createImageData(m.w, m.h); } const d = minimap.fogI.data; for (let i = 0; i < m.w * m.h; i++) { d[i * 4] = 46; d[i * 4 + 1] = 50; d[i * 4 + 2] = 32; d[i * 4 + 3] = f.vis[i] ? 0 : f.exp[i] ? 110 : 225; } fc.getContext('2d').putImageData(minimap.fogI, 0, 0); c.drawImage(fc, 0, 0, mmCanvas.width, mmCanvas.height); }
    const radar = G.has(G.local, 'ops') || G.has(G.local, 'radar') || G.mode === 'tut' || G.fog.all;
    for (const b of G.blds) { if (b.owner < 0 && b.type !== 'derrick') continue; if (!G.allies(b.owner, G.local) && !G.visibleTo(G.local, b.x, b.y)) continue; const col = b.owner < 0 ? '#d8d0b0' : TEAMCOL[G.players[b.owner].col]; c.fillStyle = col; c.fillRect(b.tx * k, b.ty * k, Math.max(3, b.w * k), Math.max(3, b.h * k)); }
    for (const u of G.units) { if (u.dead || u.def.nosel) continue; const ally = G.allies(u.owner, G.local); if (!ally && (!radar || !G.visibleTo(G.local, u.x, u.y) || Combat.hidden(G, u, G.local))) continue; c.fillStyle = TEAMCOL[G.players[u.owner].col]; const s = u.def.cls === 'inf' ? 2 : u.def.cls === 'sea' ? 4 : 3; c.fillRect(u.x / TILE * k - s / 2, u.y / TILE * k - s / 2, s, s); }
    const [x0, y0, x1, y1] = R.viewRect(0); c.strokeStyle = 'rgba(255,250,230,0.9)'; c.lineWidth = 1.5; c.strokeRect(x0 / TILE * k, y0 / TILE * k, (x1 - x0) / TILE * k, (y1 - y0) / TILE * k);
    const now = G.t; for (const ms of G.msgs) if (ms.x !== undefined && now - ms.t < 3 && ms.kind === 'bad') { const r = 4 + (now - ms.t) * 6; c.strokeStyle = `rgba(255,90,60,${1 - (now - ms.t) / 3})`; c.beginPath(); c.arc(ms.x / TILE * k, ms.y / TILE * k, r, 0, TAU); c.stroke(); }
  }
  function miniInput() {
    const mm = $('mm'); let drag = false;
    const go = e => { if (!G) return; const r = mm.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * G.map.w * TILE, y = (e.clientY - r.top) / r.height * G.map.h * TILE; return [x, y]; };
    mm.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); drag = true; try { mm.setPointerCapture(e.pointerId); } catch (er) { } const p = go(e); if (!p) return; if (e.button === 2) { const us = Input.sel.filter(u => u.k === 'u' && u.owner === G.local); if (us.length) { Cmd.order(us, { t: 'move', x: Math.round(p[0]), y: Math.round(p[1]) }); return; } } Input.lookAt(p[0], p[1]); });
    mm.addEventListener('pointermove', e => { if (!drag) return; const p = go(e); if (p) Input.lookAt(p[0], p[1]); });
    mm.addEventListener('pointerup', () => drag = false); mm.addEventListener('contextmenu', e => e.preventDefault());
  }
  /* ---------------- selection (the old top-left bar is gone: building actions live in the side panel) ---------------- */
  let selPanelEnt = null;
  function onSelect(sel) { selPanelEnt = sel.length ? sel : null; if (G && sel.length) { const c = ctxFor(sel); if (c) openCtx(c); } }
  function refreshSel() { renderActs(); }
  /* building actions: upgrade and air-defence are icon buttons (transparent) that open a confirmation pop-up — or act at once when the player turned the pop-up off in settings */
  const UP_I = '<svg viewBox="0 0 24 24" class="aic"><path d="M5.5 12.8L12 6.3l6.5 6.5"/><path d="M5.5 18.6L12 12.1l6.5 6.5"/></svg>';
  const AA_I = '<svg viewBox="0 0 24 24" class="aic"><path d="M3.8 8.2V3.8h4.4M15.8 3.8h4.4v4.4M20.2 15.8v4.4h-4.4M8.2 20.2H3.8v-4.4"/><path class="f" d="M12 6.2l1.25 3.7 4.25 2.05v1.25l-4.3-.95-.3 2.95 1.55 1.15v1l-2.45-.6-2.45.6v-1l1.55-1.15-.3-2.95-4.3.95v-1.25l4.25-2.05z"/></svg>';
  const RING = p => `<svg viewBox="0 0 36 36" class="ring"><circle cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="${Math.max(0, Math.min(100, p)).toFixed(1)} 100"/></svg>`;
  function renderActs() {
    const a = $('ctxa'); if (!a) return; const e = G && cx && cx.id ? ctxEnt() : null;
    if (!e || e.k !== 'b' || e.owner !== G.local || e.built < 1 || e.dead) { if (a.innerHTML) { a.innerHTML = ''; a.dataset.sig = ''; } return; }
    const pl = G.me; const L = Levels.lv(e); const bt = []; const ic = [];
    if (Levels.upgradable(e)) { if (e.upg) ic.push(['', 'run', 'جارٍ الترقية', UP_I, Math.round(e.upg.t / e.upg.T * 100)]); else if (L < 3) ic.push(['lv', pl.money >= Levels.upCost(e) ? 'go' : 'no', 'ترقية للمستوى ' + (L + 1), UP_I]); else ic.push(['', 'max', 'المستوى الأقصى', UP_I]); }
    const mx = Levels.aaMax(e), n = e.aa || 0;
    if (mx) { if (n >= AA_TIERS.length) ic.push(['', 'max', 'دفاع جوي كامل', AA_I]); else if (n < mx) ic.push(['baa', pl.money >= AA_TIERS[n].cost ? 'go' : 'no', 'دفاع جوي: ' + AA_TIERS[n].n, AA_I]); else ic.push(['baa', 'lock', AA_TIERS[n].n + ': رقِّ المبنى أولاً', AA_I]); }
    if (e.def.prod) bt.push(['rally', 'نقطة التجمّع', '']);
    if (e.hp < e.maxHp) bt.push(['repair', e.repairing ? 'إيقاف الإصلاح' : 'إصلاح', '']);
    if (e.type !== 'hq' && !e.def.neutral) bt.push(['sell', 'بيع', 'dang']);
    const icons = ic.map(([k, c, t, svg, p]) => `<button class="cai ${c}" ${k ? 'data-c="' + k + '"' : 'disabled'} aria-label="${t}" title="${t}">${svg}${c === 'run' ? RING(p) : ''}${c === 'lock' ? '<i class="lk"></i>' : ''}</button>`).join('');
    const head = `<div class="cah"><span class="lvb">${Levels.upgradable(e) ? '★'.repeat(L) + '<i>' + '★'.repeat(3 - L) + '</i>' : ''}</span><span class="hpb"><i style="width:${Math.round(e.hp / e.maxHp * 100)}%"></i></span><b>${Math.round(e.hp)}/${e.maxHp}</b>${icons ? '<span class="cais">' + icons + '</span>' : ''}</div>`;
    const sig = head + bt.map(x => x.join(':')).join('|'); if (a.dataset.sig === sig) return; a.dataset.sig = sig;
    if (Levels.upgradable(e)) $('ctxs').textContent = 'المستوى ' + L + ' من 3' + (e.def.prod ? ' · اختر ما تريد إنتاجه' : '');
    a.innerHTML = head + (bt.length ? '<div class="cab">' + bt.map(([k, l, c]) => `<button class="ca ${c}" ${k ? 'data-c="' + k + '"' : 'disabled'}>${l}</button>`).join('') + '</div>' : '');
    a.querySelectorAll('[data-c]').forEach(btn => btn.onclick = ev => { ev.stopPropagation(); SND.ui('click'); const k = btn.dataset.c;
      if (k === 'lv' || k === 'baa') { upAsk(e, k); return; }
      cmd(k, [e]); setTimeout(() => { a.dataset.sig = ''; renderActs(); }, 40); });
  }
  function upDo(e, k) {
    const ok = k === 'lv' ? Levels.canUp(G, G.local, e) : Levels.canAA(G, G.local, e); if (!ok.ok) { toast(ok.why || 'غير متاح الآن', 'warn'); SND.ui('nomoney'); return false; }
    Cmd.send({ c: k, b: e.id }); SND.ui(k === 'lv' ? 'research' : 'buy'); setTimeout(() => { const a = $('ctxa'); if (a) { a.dataset.sig = ''; renderActs(); } }, 40); return true;
  }
  const AA_D = { aagun: 'مدفع سريع الطلقات بقذائف متشظية يُسقط المسيّرات والمروحيات القريبة.', cram: 'منظومة اعتراض قريب بمدفع دوّار تمزّق الطائرات المهاجمة من مسافة قصيرة.', samL: 'صواريخ أرض-جو بعيدة المدى تُسقط الطائرات النفاثة قبل أن تصل.' };
  function upAsk(e, k) {
    if (!G || !e || e.dead) return; const pl = G.me; const L = Levels.lv(e); const n = e.aa || 0;
    if (k === 'baa' && n >= Levels.aaMax(e) && n < AA_TIERS.length) { toast('رقِّ ' + G.bname(e) + ' أولاً لتفتح ' + AA_TIERS[n].n, 'warn'); SND.ui('nomoney'); return; }
    if (Settings.upConfirm === false) { upDo(e, k); return; }
    const cost = k === 'lv' ? Levels.upCost(e) : (AA_TIERS[n] || {}).cost || 0; const can = pl.money >= cost; const rows = [];
    let title, sub, ico;
    if (k === 'lv') {
      title = 'ترقية ' + G.bname(e); ico = UP_I; sub = `<span class="ustars">${'★'.repeat(L)}<i>${'★'.repeat(3 - L)}</i></span><b class="uarr">←</b><span class="ustars">${'★'.repeat(L + 1)}<i>${'★'.repeat(2 - L)}</i></span>`;
      rows.push(['hp', 'التحمّل', fm(e.maxHp) + ' ← ' + fm(Math.round((e.baseHp || e.maxHp) * LVL_HP[L]))]);
      if (e.type === 'hq') rows.push(['gun', 'سلاح دفاعي', L === 1 ? 'رشاش ثقيل يحمي المقر' : 'صواريخ موجّهة مضادة للدروع']);
      if (e.type === 'city') rows.push(['inc', 'الدخل', '×' + LVL_INC[L - 1] + ' ← ×' + LVL_INC[L]]);
      if (e.def.prod) { const f = pl.f; const opened = Object.keys(ROLE_LVL).filter(r => ROLE_LVL[r] === L + 1 && UNITS[f + '_' + r] && UNITS[f + '_' + r].build === e.type).map(r => UNITS[f + '_' + r].n);
        if (opened.length) rows.push(['unl', 'يفتح', opened.join('، ')]); rows.push(['rank', 'الوحدات الجديدة', 'تخرج برتبة ' + RANKS[Math.min(RANKS.length - 1, L)].n]); }
      if (AA_TIERS[L] && Levels.aaMax(e)) rows.push(['aa', 'دفاع جوي', 'يتيح تركيب ' + AA_TIERS[L].n]);
      rows.push(['time', 'المدة', LVL_TIME[L] + ' ثانية']);
    } else {
      const t = AA_TIERS[n]; const w = WPN[t.w] || {}; title = 'تركيب ' + t.n; ico = AA_I; sub = `<span class="muted">على ${esc(G.bname(e))} · المستوى ${n + 1} من ${AA_TIERS.length}</span>`;
      rows.push(['aa', 'السلاح', AA_D[t.w] || t.n]); if (w.range) rows.push(['rng', 'المدى', fm(Math.round(w.range / TILE)) + ' مربعاً']);
    }
    box(`<div class="upask"><div class="uph"><span class="upi">${ico}</span><div><h3>${esc(title)}</h3><div class="ups">${sub}</div></div></div>
      <div class="uprows">${rows.map(([c, l, v]) => `<div class="upr ${c}"><span>${l}</span><b>${esc(String(v))}</b></div>`).join('')}</div>
      <div class="upcost ${can ? '' : 'no'}"><span>التكلفة</span><b>$${fm(cost)}</b><em>${can ? 'لديك $' + fm(pl.money) : 'ينقصك $' + fm(cost - pl.money)}</em></div>
      <label class="upno"><input type="checkbox" id="upNo"><span>نفّذ الترقيات فوراً دون هذه النافذة (يمكن إعادتها من الإعدادات)</span></label></div>`,
      [{ l: k === 'lv' ? 'ترقية' : 'تركيب', cls: 'pri', fn: d => { const no = d.querySelector('#upNo'); if (no && no.checked) { Settings.upConfirm = false; saveSettings(); } upDo(e, k); } }, { l: 'إلغاء' }],
      { wide: true, bind: d => { if (!can) { const b = d.querySelector('.row .btn.pri'); if (b) b.disabled = true; } } });
  }
  /* army: every own combat unit (top-bar buttons) */
  function army() { return G ? G.units.filter(u => u.owner === G.local && !u.dead && !u.inT && !u.def.nosel && !u.def.work && !u.def.harvest && u.def.fly !== 'jet') : []; }
  function armyOrder(kind) {
    if (!G) return; const us = army(); if (!us.length) { toast('لا توجد وحدات قتالية', 'warn'); return; }
    const hq = G.blds.find(b => b.owner === G.local && b.type === 'hq' && !b.dead) || G.blds.find(b => b.owner === G.local && !b.dead);
    let tx, ty;
    if (kind === 'atk') { const ox = hq ? hq.x : us[0].x, oy = hq ? hq.y : us[0].y; let best = null, bd = 1e18; for (const b of G.blds) { if (b.dead || b.owner < 0 || !G.enemies(G.local, b.owner)) continue; const d = (b.x - ox) ** 2 + (b.y - oy) ** 2 + (b.type === 'hq' ? 0 : 1e5); if (d < bd) { bd = d; best = b; } } if (!best) { toast('لا يوجد هدف معروف', 'warn'); return; } tx = best.x; ty = best.y; toast('هجوم شامل!', 'bad'); }
    else { if (!hq) return; tx = hq.x; ty = hq.y + hq.h * 16 + 60; toast('كل القوات تعود للدفاع عن القاعدة', 'info'); }
    Cmd.order(us, { t: 'amove', x: Math.round(tx), y: Math.round(ty) }); Input.marker(tx, ty, 'attack'); ack(us, 'o');
  }
  function allUnits() { const us = army(); if (!us.length) { toast('لا توجد وحدات قتالية', 'warn'); return; } Input.setSel(us); openCtx({ kind: 'army', id: 0, tabs: [] }); }
  function opsRoom() { if (!G) return; openCtx({ kind: 'ops', id: 0, tabs: ['cmd'] }); }
  function cmd(c, sel) {
    const us = sel.filter(u => u.k === 'u' && u.owner === G.local); const ids = us.map(u => u.id);
    if (c === 'amove') { Input.amove = true; Input.startTarget('amove', (x, y) => { Cmd.order(us, { t: 'amove', x: Math.round(x), y: Math.round(y) }); Input.marker(x, y, 'attack'); ack(us, 'o'); }, 0, 'حدد هدف الهجوم والتحرك'); }
    else if (c === 'stop') { Input.stop(); ack(us, 'o'); } else if (c === 'hold') { Input.hold(); ack(us, 'o'); }
    else if (c === 'force') { const art = us.filter(u => ['arty', 'mlrs', 'mortar', 'tos'].includes(u.def.role)); Input.startTarget('force', (x, y) => { Cmd.order(art, { t: 'force', x: Math.round(x), y: Math.round(y) }); Input.marker(x, y, 'attack'); ack(art, 'o'); }, 80, 'حدد منطقة القصف'); }
    else if (c === 'autob') Cmd.send({ c: 'aa', ids });
    else if (c === 'loadhint') toast('حدد الجنود أو المركبات ثم المس الناقلة لتحميلهم', 'info');
    else if (c === 'unload') { Cmd.send({ c: 'ul', ids }); SND.ui('unload'); }
    else if (c === 'unloadAt') Input.startTarget('unload', (x, y) => { Cmd.send({ c: 'ul', ids, x: Math.round(x), y: Math.round(y) }); Input.marker(x, y, 'move'); }, 50, 'حدد نقطة الإنزال على الشاطئ أو الأرض');
    else if (c === 'panel') { const cc = ctxFor(sel); if (cc) openCtx(cc); }
    else if (c === 'rally') { const b = sel[0]; Input.startTarget('rally', (x, y) => { Cmd.send({ c: 'ra', b: b.id, x: Math.round(x), y: Math.round(y) }); Input.marker(x, y, 'rally'); }, 0, 'حدد نقطة التجمع'); }
    else if (c === 'repair') { Cmd.send({ c: 'rp', b: sel[0].id }); setTimeout(() => refreshSel(true), 30); }
    else if (c === 'sell') { const b = sel[0]; confirmBox(b.built >= 1 ? 'بيع ' + G.bname(b) + '؟' : 'إلغاء البناء واسترجاع 75%؟', () => { Cmd.send({ c: 'sl', b: b.id }); Input.setSel([]); }); }
    else if (c === 'cancelq') { Cmd.send({ c: 'cx', b: sel[0].id }); setTimeout(() => refreshSel(true), 30); }
  }
  /* quick "build" button: use the selected machine, else the nearest one to the camera */
  /* ---------------- technology tree ---------------- */
  // tech tree: one round icon per upgrade; tap = research, long-press (or hover) = details
  const TICO = {
    hp: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', dmg: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.5"/>',
    range: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    spd: '<path d="M4 7h10M2 12h12M4 17h10"/><path d="M15 6l6 6-6 6"/>', coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9c-.4-1.1-1.5-1.6-2.8-1.6-1.6 0-2.7.8-2.7 1.9 0 2.7 5.7 1.5 5.7 4.3 0 1.2-1.2 2-3 2-1.5 0-2.6-.6-3-1.7M12 6v1.4M12 16.6V18"/>',
    bolt: '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>', gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z"/>', jet: '<path d="M12 2l1.6 7 7.4 4v2l-7.2-2-.8 5 3 2v1l-4-1-4 1v-1l3-2-.8-5L3 15v-2l7.4-4z"/>',
  };
  function techIcon(t) { const k = Object.keys(t.fx || {})[0] || ''; return /Hp$/.test(k) ? TICO.hp : /Dmg|dmg|acc|superK|hordeK/.test(k) ? TICO.dmg : /ange/.test(k) ? TICO.range : /vision|ewar/.test(k) ? TICO.eye : /Spd/.test(k) ? TICO.spd : /income|cost/.test(k) ? TICO.coin : /power/.test(k) ? TICO.bolt : /Time|train/.test(k) ? TICO.gear : /jet|air/i.test(k) ? TICO.jet : TICO.star; }
  let tinfoId = null, techSec = 0;
  const SEC_ICO = ['<rect x="3" y="12" width="18" height="6" rx="3"/><rect x="7" y="8" width="8" height="4" rx="1"/><path d="M15 10h6"/>', '<circle cx="12" cy="6" r="3"/><path d="M6 21v-5c0-3 2.7-5 6-5s6 2 6 5v5"/>', '<path d="M4 20h16M7 20l2-6h6l2 6"/><path d="M12 14V8M12 8l6-5M12 8L6 3"/>', '<path d="M12 2l1.6 7 7.4 4v2l-7.2-2-.8 5 3 2v1l-4-1-4 1v-1l3-2-.8-5L3 15v-2l7.4-4z"/>', '<path d="M3 21V10l6-4v4l6-4v4l6-4v15z"/>'];
  const SEC_COL = ['#7cc46a', '#e9ad3c', '#ff7b6b', '#4f9fe8', '#c9a3ff'];
  function openTech(sec) {
    if (!G) return; const sameSec = sec === undefined || sec === techSec; const keepY = techBox && sameSec ? techBox.querySelector('.tscroll').scrollTop : 0; if (sec !== undefined) techSec = sec; if (techBox) techBox.remove(); const pl = G.me, f = pl.f; const tree = techTree(f).filter(t => t.sec === techSec);
    const tiers = [...new Set(tree.map(t => t.tier))].sort((a, b) => a - b); const RH = 92, pos = {};
    tiers.forEach((tr, r) => { const row = tree.filter(t => t.tier === tr); row.forEach((t, i) => { pos[t.id] = [(i + 1) / (row.length + 1) * 100, r * RH + 40]; }); });
    const H = tiers.length * RH + 10; let lines = '';
    for (const t of tree) for (const a of t.after || []) if (pos[a]) lines += `<line x1="${pos[a][0]}" y1="${pos[a][1]}" x2="${pos[t.id][0]}" y2="${pos[t.id][1]}" data-a="${a}" data-b="${t.id}"/>`;
    const nodes = tree.map(t => `<button class="tnode${t.id.startsWith('u_') ? ' uq' : ''}" data-id="${t.id}" style="left:${pos[t.id][0]}%;top:${pos[t.id][1]}px" aria-label="${esc(t.n)}">${svgI(techIcon(t), 'tic')}<i class="tr">${['I', 'II', 'III', 'IV', 'V'][t.tier - 1] || t.tier}</i><svg class="tring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18.5"/></svg></button>`).join('');
    const tabs = TECH_SEC.map((n, i) => `<button class="tsec${i === techSec ? ' on' : ''}" data-s="${i}" style="--bc:${SEC_COL[i]}">${svgI(SEC_ICO[i])}<span>${n}</span></button>`).join('');
    techBox = el('div', 'tmod', `<div class="tbox" style="--bc:${SEC_COL[techSec]};--bca:${SEC_COL[techSec]}55"><div class="thead">${EMBLEM[f]}<b>شجرة التطوير</b><span class="tm"></span><button class="btn sm" data-x>✕</button></div><div class="tsecs">${tabs}</div><div class="tscroll"><div class="ttree" style="height:${H}px"><svg class="tlinks" viewBox="0 0 100 ${H}" preserveAspectRatio="none">${lines}</svg>${nodes}</div></div><div class="tinfo"><span class="muted">المس رمزاً للبحث — اضغط مطولاً لعرض معلوماته</span></div></div>`);
    techBox.querySelector('.thead svg').style.cssText = 'width:30px;height:30px';
    document.body.appendChild(techBox); techBox.querySelector('.tscroll').scrollTop = keepY; if (!tree.some(t => t.id === tinfoId)) tinfoId = null;
    techBox.addEventListener('click', ev => { if (ev.target === techBox) closeTech(); });
    techBox.querySelector('[data-x]').onclick = () => { SND.ui('click'); closeTech(); };
    techBox.querySelectorAll('.tsec').forEach(b => b.onclick = () => { SND.ui('tab'); openTech(+b.dataset.s); });
    techBox.querySelectorAll('.tnode').forEach(n => { const id = n.dataset.id; let lp = null;
      n.addEventListener('pointerdown', () => { lp = setTimeout(() => { lp = 'done'; tinfoId = id; SND.ui('tab'); refreshTech(); }, 420); });
      n.addEventListener('pointerup', () => { if (lp !== 'done') clearTimeout(lp); }); n.addEventListener('pointerleave', () => { if (lp !== 'done') clearTimeout(lp); });
      n.addEventListener('pointerenter', ev => { if (ev.pointerType === 'mouse') { tinfoId = id; refreshTech(); } });
      n.oncontextmenu = ev => ev.preventDefault();
      n.onclick = () => { if (lp === 'done') { lp = null; return; } tinfoId = id; const st = Build.techState(G, G.local, id); const t = techById(f, id);
        if (st.done) { refreshTech(); return; } if (pl.research) { toast(pl.research.id === id ? 'قيد البحث' : 'بحث آخر قيد التنفيذ', 'warn'); refreshTech(); return; } if (!st.ok) { toast(st.why, 'warn'); SND.ui('nomoney'); refreshTech(); return; } if (pl.money < t.cost) { toast('لا يوجد مال كافٍ', 'warn'); SND.ui('nomoney'); refreshTech(); return; }
        Cmd.send({ c: 'rs', id }); SND.ui('click'); setTimeout(refreshTech, 40); }; });
    refreshTech();
  }
  function refreshTech() {
    if (!techBox || !G) return; const pl = G.me; techBox.querySelector('.tm').textContent = '$' + fm(pl.money) + (pl.research ? ' · جارٍ: ' + ((techById(pl.f, pl.research.id) || {}).n || '') : '');
    techBox.querySelectorAll('.tnode').forEach(n => { const id = n.dataset.id; const st = Build.techState(G, G.local, id); const run = pl.research && pl.research.id === id;
      n.classList.toggle('done', !!st.done); n.classList.toggle('run', !!run); n.classList.toggle('ok', !!st.ok && !run); n.classList.toggle('lock', !st.ok && !st.done && !run); n.classList.toggle('on', id === tinfoId);
      n.style.setProperty('--p', run ? (pl.research.t / pl.research.T).toFixed(3) : st.done ? 1 : 0); });
    techBox.querySelectorAll('.tlinks line').forEach(l => l.classList.toggle('done', !!pl.upg[l.dataset.a]));
    const box = techBox.querySelector('.tinfo'); const t = tinfoId && techById(pl.f, tinfoId);
    if (t) { const st = Build.techState(G, G.local, t.id); const run = pl.research && pl.research.id === t.id;
      const s = st.done ? '✓ مكتمل' : run ? 'قيد البحث ' + Math.round(pl.research.t / pl.research.T * 100) + '%' : '$' + fm(t.cost) + ' · ' + t.time + ' ثانية' + (st.ok ? '' : ' · ' + (st.why || 'مقفل'));
      const html = `${svgI(techIcon(t), 'tic')}<div><b>${esc(t.n)}${t.id.startsWith('u_') ? ' <em>خاص بدولتك</em>' : ''}</b><span>${esc(t.d)}</span><i class="${st.done ? 'g' : run ? 'r' : st.ok ? 'o' : 'l'}">${esc(s)}</i></div>`; if (box.dataset.h !== html) { box.dataset.h = html; box.innerHTML = html; } }
  }
  function closeTech() { if (techBox) { techBox.remove(); techBox = null; } }
  let ackT = 0;
  function ack(units, kind) { const now = performance.now(); if (now - ackT < 650 || !units || !units.length) return; ackT = now; SND.ui(kind ? 'radioOff' : 'radio'); }
  function unitReady(u) { }
  function placeMode(on, type) { $('placebar').classList.toggle('hid', !on); $('hud').classList.toggle('placing', !!on || !$('targetbar').classList.contains('hid')); if (on) $('placebar').querySelector('b').textContent = bldName(G.me.f, type) + ' — حرّك ثم أكّد'; }
  function targetMode(on, label) { $('targetbar').classList.toggle('hid', !on); $('hud').classList.toggle('placing', !!on || !$('placebar').classList.contains('hid')); if (on) $('targetbar').querySelector('b').textContent = label || ''; }
  /* ---------------- pause / game over ---------------- */
  function pause() { if (!G || G.over) return; if (paused && !frozen) { resume(); return; } frozen = false; $('frzbar').classList.add('hid'); $('bFreeze').classList.remove('on'); paused = true; pauseMenu(); }
  function pauseMenu() {
    paused = true; closeTech(); const net = !!G.net; const canSave = !net && (G.mode === 'skirmish' || G.mode === 'survival');
    const s = showScreen(`<div class="pbox"><h2>${net ? 'قائمة المعركة' : 'إيقاف مؤقت'}</h2><div class="pst">${esc(G.cfg.label || '')} · ${fmtTime(G.t)}${net ? '<br>المعركة الجماعية مستمرة أثناء فتح القائمة' : ''}</div>
      <button class="btn pri big" data-a="resume">متابعة</button>${canSave ? '<button class="btn big" data-a="save">حفظ والخروج</button>' : ''}<button class="btn big" data-a="settings">الإعدادات</button>${net ? '' : '<button class="btn big" data-a="restart">إعادة المعركة</button>'}<button class="btn danger big" data-a="quit">${net ? 'الاستسلام والمغادرة' : 'الانسحاب للقائمة'}</button></div>`, 'pause');
    bind(s, { resume: () => resume(), settings: () => Menus.settings(true), save: () => { Main.saveGame(); toast('تم الحفظ', 'good'); quitToMenu(); }, restart: () => { paused = false; Main.restart(); }, quit: () => confirmBox(net ? 'الاستسلام ومغادرة المعركة الجماعية؟' : 'الانسحاب من المعركة؟ ستحتسب خسارة.', () => { if (net) { Cmd.send({ c: 'surr' }); Main.recordResult(false, true); Net.leave(); quitToMenu(); return; } Main.recordResult(false, true); quitToMenu(); }) });
  }
  function resume() { paused = false; frozen = false; $('frzbar').classList.add('hid'); $('bFreeze').classList.remove('on'); hideScreens(); }
  function quitToMenu() { paused = false; Main.endGame(); Menus.hub(); SND.playMusic('menu'); }
  function gameOver(win) {
    if (!G) return; const g = G; const pl = g.me; const r = Main.recordResult(win);
    setTimeout(() => {
      if (G !== g) return; paused = true; closeTech(); const S = pl.stats; const ongoing = !!g.net && new Set(g.players.filter(p => p.alive).map(p => p.team)).size > 1;
      const sub = g.mode === 'survival' ? 'صمدت ' + ((g.surv && g.surv.wave) || 0) + ' موجات' : win ? (g.net ? 'انتصرت على قادة الشبكة!' : 'قواتك سيطرت على ساحة المعركة') : 'سقطت قاعدتك... أعد تنظيم صفوفك';
      const s = showScreen(`<div class="pbox over ${win ? 'win' : 'lose'}"><div style="display:flex;justify-content:center">${EMBLEM[pl.f].replace('<svg', '<svg width="54" height="54"')}</div><h2>${win ? 'النصر!' : g.mode === 'survival' ? 'انتهى الصمود' : 'الهزيمة'}</h2><div class="pst">${sub}</div>
        <div class="ostats"><div><b>${fmtTime(g.t)}</b><span>المدة</span></div><div><b>${S.units}</b><span>وحدات منتجة</span></div><div><b>${S.kills}</b><span>إصابات</span></div><div><b>${S.lost}</b><span>خسائر</span></div><div><b>${S.bkills}</b><span>مبانٍ مدمرة</span></div><div><b>${S.ships || 0}</b><span>سفن مُغرقة</span></div><div><b>${S.air || 0}</b><span>طائرات مُسقطة</span></div>${S.icpt ? `<div><b>${S.icpt}</b><span>اعتراضات</span></div>` : ''}<div><b>$${fm(S.earned)}</b><span>الدخل</span></div></div>
        <div class="score">النقاط <b>${fm(r.score || 0)}</b>${r.best ? '<span class="rec">رقم قياسي جديد!</span>' : ''}</div>
        <div class="reward"><span style="color:#8fd0ff">+${fm(r.xp || 0)} خبرة</span>${r.eco ? ['c', 'g', 'm', 's'].filter(k => r.eco[k]).map(k => `<span class="rwc ${k}" data-cnt="${r.eco[k]}">${Eco.ico(k)}<b>+${Settings.rewardFx === false ? fm(r.eco[k]) : 0}</b></span>`).join('') : ''}${r.lvUp ? `<span style="color:var(--gold2)">ترقية: ${esc(PLV_N[plevel()])}! مكافأتها في «المكافآت»</span>` : ''}</div>
        ${r.chal ? `<div class="pst chalok">✓ أنجزت ${CHAL_T[r.chal.k]} «${esc(r.chal.n)}» — جائزته مضافة أعلاه</div>` : ''}
        ${r.eco && r.eco.notes && r.eco.notes.length ? `<div class="newach shards">${r.eco.notes.map(n => `<i>${Eco.ico('s')} ${esc(n)}</i>`).join('')}</div>` : ''}
        ${r.eco && r.eco.done && r.eco.done.length ? `<div class="newach mdone">${r.eco.done.map(n => `<i>✓ مهمة مكتملة: ${esc(n)}</i>`).join('')}</div>` : ''}
        ${r.ach && r.ach.length ? `<div class="newach">${r.ach.map(a => `<i>🏅 ${esc(a)}</i>`).join('')}</div>` : ''}
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:4px">${g.net ? (ongoing ? '<button class="btn pri big" data-a="watch">مشاهدة المعركة</button>' : '<button class="btn pri big" data-a="lobby">العودة للردهة</button>') : '<button class="btn pri big" data-a="again">معركة جديدة</button>'}<button class="btn big" data-a="menu2">${g.net ? 'مغادرة الغرفة' : 'القائمة الرئيسية'}</button></div></div>`, 'pause');
      bind(s, { again: () => { paused = false; Main.restart(); }, watch: () => { paused = false; g.spectate = true; Net.spectate(); hideScreens(); toast('وضع المشاهدة — المعركة مستمرة بين بقية اللاعبين', 'info'); }, menu2: () => { if (g.net) { if (Net.isHost && ongoing) { confirmBox('أنت المضيف: مغادرتك ستنهي المعركة على الأجهزة الأخرى (يتولى الحاسوب مكانك عندهم). المغادرة؟', () => { Net.leave(); quitToMenu(); }); return; } Net.leave(); } quitToMenu(); }, lobby: () => { paused = false; Net.backToLobby(); Main.endGame(); Lobby.open(); } });
      SND.stinger(win); setTimeout(() => { const rw = s.querySelector('.reward'); if (rw && rw.isConnected) Rewards.celebrate(rw); }, 700);
    }, 2200);
  }
  function matchEnded() { if (!G || !G.net) return; box('<h3>انتهت المعركة الجماعية</h3><p>حُسمت المعركة بين بقية اللاعبين.</p>', [{ l: 'العودة للردهة', cls: 'pri', fn: () => { paused = false; Net.backToLobby(); Main.endGame(); Lobby.open(); } }, { l: 'متابعة المشاهدة' }]); }
  function init() {
    window.addEventListener('resize', () => { clearTimeout(fitTopbar.t); fitTopbar.t = setTimeout(() => fitTopbar(true), 150); });
    screens = $('screens'); miniInput(); 
    $('bPause').onclick = () => { SND.ui('click'); pause(); };
    $('bFreeze').onclick = ev => { ev.stopPropagation(); freeze(); }; $('frzGo').onclick = ev => { ev.stopPropagation(); freeze(false); };
    $('bQS').onclick = ev => { ev.stopPropagation(); SND.ui('click'); quickSettings(); };
    $('bBat').onclick = ev => { ev.stopPropagation(); SND.ui('click'); if (cx && cx.kind === 'bat') closeCtx(); else openCtx({ kind: 'bat', id: 0, tabs: [] }); };
    $('bMM').onclick = ev => { ev.stopPropagation(); SND.ui('click'); const s = mmSize(); Settings.mm = s === 0 ? 3 : s - 1; saveSettings(); sizeMini(); };
    $('gemAct').onclick = ev => { ev.stopPropagation(); useGems(); };
    $('bMute').onclick = ev => { ev.stopPropagation(); Settings.popups = Settings.popups === false; saveSettings(); $('bMute').classList.toggle('muted', !Settings.popups); if (!Settings.popups) $('alerts').innerHTML = ''; SND.ui('click'); const t = el('div', 'toast info', Settings.popups ? 'الإشعارات المنبثقة تظهر' : 'الإشعارات المنبثقة مكتومة'); $('alerts').prepend(t); setTimeout(() => t.remove(), 1600); };
    $('bChat').onclick = ev => { ev.stopPropagation(); SND.ui('click'); chatShow(!chatOpen()); };
    const say = m => { m = String(m || '').trim(); if (m && typeof Net !== 'undefined') Net.L.chat(m); };
    const typed = () => { const i = $('chatin2'); say(i.value); i.value = ''; chatShow(false); };
    $('chatgo').onclick = ev => { ev.stopPropagation(); typed(); }; $('chatin2').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') typed(); if (e.key === 'Escape') chatShow(false); });
    $('chatqk').innerHTML = CHAT_QK.map((q, i) => `<button data-q="${i}">${esc(q)}</button>`).join('');
    $('chatqk').onclick = ev => { const b = ev.target.closest('[data-q]'); if (!b) return; ev.stopPropagation(); SND.ui('click'); say(CHAT_QK[+b.dataset.q]); chatShow(false); };
    $('bSpeed').onclick = () => { if (!G || G.net) return; SND.ui('click'); const sp = [1, 1.5, 2, 3]; G.speed = sp[(sp.indexOf(G.speed) + 1) % sp.length]; $('bSpeed').textContent = '×' + G.speed; };
    $('bHome').onclick = ev => { ev.stopPropagation(); Input.jumpHome(); SND.ui('click'); };
    $('ctxx').onclick = ev => { ev.stopPropagation(); closeCtx(); };
    $('bAtk').onclick = ev => { ev.stopPropagation(); SND.ui('click'); armyOrder('atk'); }; $('bDef').onclick = ev => { ev.stopPropagation(); SND.ui('click'); armyOrder('def'); }; $('bAll').onclick = ev => { ev.stopPropagation(); SND.ui('click'); allUnits(); };
    $('bTech').onclick = ev => { ev.stopPropagation(); SND.ui('click'); openTech(); }; $('bOps').onclick = ev => { ev.stopPropagation(); SND.ui('click'); if (cx && cx.kind === 'ops') closeCtx(); else opsRoom(); };
    $('pOk').onclick = () => Input.confirmPlace(); $('pNo').onclick = () => Input.cancelMode(); $('tNo').onclick = () => Input.cancelMode();
  }
  function frame(dt) { if (!G) return; hudT -= dt; if (hudT <= 0) { hudT = 0.12; hudUpdate(); } mmT -= dt; if (mmT <= 0) { mmT = 0.25; minimap(); } }
  // multiplayer chat lines over the battlefield (fade after a few seconds)
  /* ---------- in-game chat (network games): messages on the left above the minimap; the button opens a panel with the
     recent messages, quick phrases (one tap, no typing in the middle of a fight) and a text box; unread count on the button ---------- */
  const CHAT_QK = ['هجوم! ⚔', 'دافعوا عن القاعدة!', 'ساعدوني!', 'انتظروا', 'تراجعوا', 'أحسنتم 👍', 'GG'];
  const chatHist = []; let chatUnread = 0;
  const chatOpen = () => !$('chatbar').classList.contains('hid');
  function chatLine(c, keep) { // quick phrases are translated for the reader; names and typed text stay exactly as written
    const qk = CHAT_QK.indexOf(c.m) >= 0;
    const line = el('div', c.sys ? 'cl sys' : 'cl' + (c.me ? ' me' : ''), c.sys ? (c.n ? '<b class="notr">' + esc(c.n) + '</b> ' : '') + '<span>' + esc(c.m) + '</span>' : `<b class="notr">${esc(c.n || '')}:</b> <span${qk ? '' : ' class="notr"'}>${esc(c.m)}</span>`);
    if (!keep) setTimeout(() => { line.classList.add('out'); setTimeout(() => line.remove(), 600); }, 9000);
    return line;
  }
  function chatBadge() { const n = $('chatn'); if (!n) return; n.textContent = chatUnread > 9 ? '9+' : String(chatUnread); n.classList.toggle('hid', !chatUnread); }
  function chatShow(open) {
    const bar = $('chatbar'), box = $('chatlog'); if (!bar || !box) return; bar.classList.toggle('hid', !open); box.classList.toggle('open', open); box.innerHTML = '';
    if (!open) return;
    for (const c of chatHist) box.appendChild(chatLine(c, true));
    document.documentElement.style.setProperty('--cbh', (bar.offsetHeight + 8) + 'px'); box.scrollTop = box.scrollHeight;
    chatUnread = 0; chatBadge();
    if (!(window.matchMedia && matchMedia('(pointer: coarse)').matches)) setTimeout(() => $('chatin2').focus(), 30); // on a phone the keyboard would cover the battle: tap the box to type
  }
  function netChat(c) {
    const box = $('chatlog'); if (!box || !G) return; chatHist.push(c); if (chatHist.length > 40) chatHist.shift();
    if (chatOpen()) { box.appendChild(chatLine(c, true)); box.scrollTop = box.scrollHeight; }
    else { box.appendChild(chatLine(c, false)); while (box.children.length > 6) box.firstChild.remove(); if (!c.sys && !c.me) { chatUnread++; chatBadge(); } }
    if (!c.sys && !c.me) SND.ui('tick');
  }
  const kit = { $, el, esc, fm, acv, tcv, gcv, hexRgb, icon, showScreen, hideScreens, top, bind, seg, segBind, box, confirmBox, toast, svgI };
  return { sizeMini, fitTopbar, netChat, init, matchEnded, title: () => Menus.title(), mainMenu: () => Menus.hub(), pauseMenu, enterGame, exitGame, toast, achToast, blocking, onSelect, ack, unitReady, placeMode, targetMode, pause, gameOver, frame,  showScreen, hideScreens,      get ctx() { return cx; },  get paused() { return paused; }, set paused(v) { paused = v; }, get modal() { return modal; }, $, kit };
})();
