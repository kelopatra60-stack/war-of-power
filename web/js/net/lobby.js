/* ============================================================
   War of Power — شاشات غرفة اللعب الجماعي
   الملف: js/net/lobby.js   ·   ترتيب التحميل: 42 من 43
   ============================================================ */
'use strict';
/* ===== LAN lobby screens: find / host a room, slots, settings, chat ===== */
const Lobby = (function () {
  const K = UI.kit; const { esc, fm } = K; const chat = []; let autoTried = false;
  const ERR = { full: 'الغرفة ممتلئة (6 لاعبين)', nohost: 'لا توجد معركة منشأة على هذا الجهاز بعد', busy: 'المعركة بدأت بالفعل — انتظر حتى تنتهي', timeout: 'تعذّر الوصول إلى المضيف — تأكد أنكم على نفس الشبكة', error: 'تعذّر الاتصال بالمضيف', closed: 'أُغلق الاتصال', native: 'تعذّر تشغيل الشبكة' };
  Object.assign(ERR, { noroom: 'لا توجد غرفة بهذا الرمز', code: 'رمز الغرفة 5 أحرف', nosignal: 'تعذّر الوصول إلى خادم الربط — تحقّق من الإنترنت', taken: 'حاول مرة أخرى', timeout: 'انتهت مهلة الاتصال — تأكد من الرمز والإنترنت', rtc: 'تعذّر إنشاء الاتصال المباشر', nortc: 'جهازك لا يدعم الاتصال المباشر', ver: 'نسخة اللعبة عند المضيف مختلفة', closed: 'انقطع الاتصال' });
  const errMsg = e => { const k = typeof e === 'string' ? e : String(e && e.message || ''); return ERR[k] || (k && !/^\[object/.test(k) ? 'تعذّر الاتصال: ' + k : 'تعذّر الاتصال — حاول مرة أخرى'); };
  function open() { if (Net.state === 'lobby') room(); else choose(); }
  const MP_ICO = { hot: '<path d="M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1.3"/><path d="M2 9.5a15 15 0 0 1 20 0"/>', web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>' };
  function choose() { // two ways to play together
    const s = K.showScreen(K.top('اللعب الجماعي') + `<div class="mpch">
      <button class="mpc" data-a="hot"><svg viewBox="0 0 24 24">${MP_ICO.hot}</svg><b>عبر هوسبوت</b><span>بدون إنترنت — أجهزة على نفس الشبكة</span></button>
      <button class="mpc web" data-a="web"><svg viewBox="0 0 24 24">${MP_ICO.web}</svg><b>أونلاين</b><span>من أي مكان — اتصال مباشر بين الأجهزة</span></button></div>`, 'setup mp', MODE_AC.mp);
    K.bind(s, { hot: () => home(), web: () => online() });
  }
  function online() {
    const s = K.showScreen(K.top('أونلاين', 'mpc') + `<div class="setbox two">
      <div class="card"><h3>إنشاء غرفة</h3><div class="frow"><label>اسمك</label><input class="inp" id="mpn" maxlength="18" value="${esc(Profile.name)}"></div>
        <p class="muted">تحصل على رمز من 5 أحرف تشاركه مع أصدقائك.</p><button class="btn acc big" data-a="mk">إنشاء غرفة</button></div>
      <div class="card"><h3>الانضمام إلى غرفة</h3><input class="inp code big" id="mpc" maxlength="5" placeholder="K7M3Q" dir="ltr" autocomplete="off" autocapitalize="characters">
        <button class="btn pri big" data-a="jn">انضمام</button>${typeof Friends !== 'undefined' ? '<button class="btn" data-a="fr">الأصدقاء والدعوات</button>' : ''}</div></div>`, 'setup mp', MODE_AC.mp);
    const ci = s.querySelector('#mpc'); ci.addEventListener('input', () => { ci.value = ci.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); });
    ci.addEventListener('keydown', e => { if (e.key === 'Enter') joinCode(ci.value, s); });
    K.bind(s, { mpc: () => choose(), fr: () => Friends.screen(), jn: () => joinCode(ci.value, s),
      mk: () => { nameIn(s); K.toast('جارٍ إنشاء الغرفة…', 'info'); Net.online(null).then(() => { SND.ui('buy'); room(); }).catch(e => { SND.ui('nomoney'); K.toast(errMsg(e), 'warn'); }); } });
  }
  function joinCode(code, s) {
    if (s) nameIn(s); code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length !== 5) { K.toast(ERR.code, 'warn'); return; }
    if (Net.state !== 'off') { if (Net.roomCode === code) { room(); return; } Net.leave(); }
    K.toast('جارٍ الاتصال بالغرفة ' + code + '…', 'info'); Net.online(code).then(() => { SND.ui('buy'); room(); }).catch(e => { SND.ui('nomoney'); K.toast(errMsg(e), 'warn'); });
  }
  function nameIn(s) { const v = (s.querySelector('#mpn') && s.querySelector('#mpn').value || '').trim().slice(0, 18); if (v && v !== Profile.name) { Profile.name = v; saveProfile(); } }
  function home() {
    const nat = Net.native(), srv = Net.servedByHost(); const ips = Net.ips();
    const s = K.showScreen(K.top('عبر هوسبوت', 'mpc') + `<div class="setbox two">
      <div class="card"><h3>المعركة الجماعية — حتى 6 لاعبين</h3><div class="frow"><label>اسمك في المعركة</label><input class="inp" id="mpn" maxlength="18" value="${esc(Profile.name)}"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${Net.canHost() ? '<button class="btn acc big" data-a="host">إنشاء معركة (مضيف)</button>' : ''}${srv ? '<button class="btn big" data-a="joinhere">انضمام لمعركة هذا الجهاز</button>' : ''}</div>
        <h3 style="margin-top:14px">الانضمام بعنوان المضيف</h3><div class="codebox"><input class="inp" id="mpip" inputmode="decimal" placeholder="مثال: 192.168.43.1" value="${esc(LS.get('tw_lastip', '') || '')}"><button class="btn" data-a="join">انضمام</button></div>
        ${!nat && !srv ? '<p class="muted" style="margin-top:10px">في المتصفح لا يمكن إنشاء خادم. ثبّت تطبيق أندرويد لإنشاء المعارك والبحث التلقائي، أو افتح عنوان صديقك المضيف مباشرة: <b dir="ltr" style="unicode-bidi:isolate">http://IP:47700</b></p>' : ''}
        ${ips.length ? `<p class="netinfo" style="margin-top:10px">عنوان جهازك على الشبكة: <b>${ips.map(esc).join(' · ')}</b></p>` : ''}</div>
      <div class="card"><h3>معارك قريبة على الشبكة</h3><div class="hosts" id="hosts">${nat ? '<span class="muted">جارٍ البحث عن معارك…</span>' : '<span class="muted">البحث التلقائي متاح في تطبيق أندرويد — استخدم العنوان بدلاً منه.</span>'}</div>
        <h3 style="margin-top:14px">كيف ألعب مع أصدقائي؟</h3><div class="netinfo">1. شغّلوا «نقطة الاتصال» من هاتف أحدكم واتصلوا بها جميعاً، أو اتصلوا بنفس الراوتر.<br>2. أحدكم يضغط «إنشاء معركة» فيصبح المضيف — اللعبة نفسها هي الخادم.<br>3. البقية يجدون المعركة في هذه القائمة أو يكتبون عنوان المضيف.<br>4. صديق بلا تطبيق؟ يفتح المتصفح على <b dir="ltr" style="unicode-bidi:isolate">http://IP:47700</b><br>5. أكملوا المقاعد الفارغة بخصوم آليين، واختاروا الفرق، ثم «ابدأ».</div></div></div>`, 'setup', MODE_AC.mp);
    const doJoin = addr => { nameIn(s); K.toast('جارٍ الاتصال…', 'info'); Net.join(addr).then(() => { SND.ui('buy'); room(); }).catch(e => { SND.ui('nomoney'); K.toast(errMsg(e), 'warn'); }); };
    K.bind(s, { mpc: () => choose(), host: () => { nameIn(s); Net.host().then(() => { SND.ui('buy'); room(); }).catch(e => { SND.ui('nomoney'); K.toast(errMsg(e), 'warn'); }); },
      joinhere: () => doJoin(''), join: () => { const ip = (s.querySelector('#mpip').value || '').trim(); if (!ip) { K.toast('اكتب عنوان المضيف أولاً', 'warn'); return; } LS.set('tw_lastip', ip); doJoin(ip); }, menu: () => { Net.scan(false); Menus.hub(); } });
    if (nat) { Net.on('hosts', list => { const box = s.querySelector('#hosts'); if (!box || !box.isConnected) return; box.innerHTML = list.length ? list.map(h => `<button class="host" data-ip="${esc(h.ip)}:${h.port}"><b>${esc(h.name)}</b><span>${h.n}/${h.max} لاعبين · ${h.state === 'lobby' ? 'في الانتظار' : 'المعركة جارية'}</span><span>${esc(h.ip)}</span></button>`).join('') : '<span class="muted">لا توجد معارك بعد — تأكد من الاتصال بنفس الشبكة</span>'; box.querySelectorAll('[data-ip]').forEach(b => b.onclick = () => doJoin(b.dataset.ip)); }); Net.scan(true); }
    if (srv && !autoTried && !Net.canHost()) { autoTried = true; doJoin(''); }
  }
  /* ---------------- room ---------------- */
  let rs = null;
  function room() {
    Net.scan(false); const host = Net.isHost; const rc = Net.roomCode;
    rs = K.showScreen(K.top('غرفة المعركة', 'leave') + (rc ? `<div class="rcode"><span>رمز الغرفة</span><b dir="ltr">${rc}</b><button class="btn sm" data-a="rshare">مشاركة</button>${host && typeof Friends !== 'undefined' && Friends.list().length ? '<button class="btn sm acc" data-a="rinv">دعوة صديق</button>' : ''}</div>` : '') + `<div class="lob"><div class="card"><h3>اللاعبون <span id="lcount"></span></h3><div id="lslots"></div>${host ? '<div style="margin-top:6px"><button class="btn sm" data-a="addai">+ خصم آلي</button></div>' : ''}</div>
      <div style="display:flex;flex-direction:column;gap:10px"><div class="card"><h3>الخريطة والإعدادات</h3><div id="lset"></div></div>
      <div class="card"><h3>الدردشة</h3><div id="lchat" style="max-height:110px;overflow-y:auto;font-size:12px;line-height:1.7;margin-bottom:6px;touch-action:pan-y"></div><div class="codebox"><input class="inp" id="chatin" maxlength="120" placeholder="اكتب رسالة…"><button class="btn sm" data-a="say">إرسال</button></div></div></div></div>
      <div class="sfoot">${host ? '<button class="btn acc big" data-a="start">ابدأ المعركة ⚔</button>' : '<button class="btn acc big" data-a="ready" id="rdy">جاهز ✓</button>'}<button class="btn big" data-a="leave">مغادرة الغرفة</button></div>`, 'setup', MODE_AC.mp);
    K.bind(rs, { addai: () => Net.L.addAI(), start: () => { if (!Net.L.start(false)) { const sl = Net.lobby.slots; if (sl.some(x => x.k === 'h' && !x.ready)) K.confirmBox('بعض اللاعبين غير جاهزين. البدء على أي حال؟', () => Net.L.start(true)); } },
      ready: b => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.textContent = on ? 'جاهز ✓ (اضغط للإلغاء)' : 'جاهز ✓'; Net.L.ready(on); },
      say: () => { const i = rs.querySelector('#chatin'); Net.L.chat(i.value); i.value = ''; }, leave: () => { const wasOnline = !!Net.roomCode; Net.leave(); if (wasOnline) online(); else home(); },
      rshare: () => { const t = '⚔ War of Power — رمز الغرفة: ' + rc; if (navigator.share) navigator.share({ text: t }).catch(() => { }); else Friends.copy(t); },
      rinv: () => { const fl = Friends.list(); K.box(`<h3 style="margin-bottom:8px">دعوة صديق إلى الغرفة</h3>${fl.map(f => `<div class="frow"><label>${esc(f.n)}</label><button class="btn sm acc" data-inv="${f.c}">دعوة</button></div>`).join('')}`, [{ l: 'إغلاق' }]); document.querySelectorAll('[data-inv]').forEach(b => b.onclick = () => { const f = fl.find(x => x.c === b.dataset.inv); if (f) { Friends.invite(f); b.disabled = true; b.textContent = 'أُرسلت ✓'; } }); } });
    rs.querySelector('#chatin').addEventListener('keydown', e => { if (e.key === 'Enter') { Net.L.chat(e.target.value); e.target.value = ''; } });
    Net.on('lobby', l => render(l)); Net.on('chat', c => addChat(c)); Net.on('closed', m => { K.toast(m, 'warn'); if (!GAME && rs && rs.isConnected) choose(); });
    render(Net.lobby); drawChat();
  }
  function addChat(c) { chat.push(c); while (chat.length > 40) chat.shift(); drawChat(); if (!c.sys) SND.ui('tick'); }
  function drawChat() { const b = rs && rs.querySelector('#lchat'); if (!b || !b.isConnected) return; b.innerHTML = chat.map(c => c.sys ? `<div class="muted">• ${esc(c.m)}</div>` : `<div><b style="color:var(--acl)">${esc(c.n)}:</b> ${esc(c.m)}</div>`).join(''); b.scrollTop = b.scrollHeight; }
  function render(l) {
    if (!rs || !rs.isConnected || !l) return; const host = Net.isHost, me = Net.myId;
    rs.querySelector('#lcount').textContent = '(' + l.slots.length + '/6)';
    rs.querySelector('#lslots').innerHTML = l.slots.map((s, i) => { const mine = s.peer === me; const canF = host || mine; const F = FACTIONS[s.f];
      return `<div class="slot" style="${K.tcv(TEAMCOL[F.col])}"><span class="si"></span>${EMBLEM[s.f]}<b>${esc(s.k === 'ai' ? F.short + ' (حاسوب)' : s.name)}</b>${s.k === 'h' ? (s.peer === (l.slots[0] || {}).peer ? '<em>مضيف</em>' : '') + (mine ? '<em>أنت</em>' : '') + (s.ready ? '<em>جاهز</em>' : '<em style="background:rgba(233,173,60,.18);color:#f5d695">ينتظر</em>') : ''}
        ${canF ? `<select class="inp" data-i="${i}" data-k="f">${FACTION_IDS.filter(f => !mine || f === s.f || Eco.owns('nat', f)).map(f => `<option value="${f}" ${f === s.f ? 'selected' : ''}>${FACTIONS[f].short}</option>`).join('')}</select>` : `<span class="muted">${esc(F.short)}</span>`}
        ${host ? `<select class="inp" data-i="${i}" data-k="team">${[1, 2, 3, 4, 5, 6].map(t => `<option value="${t}" ${t === s.team ? 'selected' : ''}>فريق ${t}</option>`).join('')}</select>` : `<span class="muted">فريق ${s.team}</span>`}
        ${s.k === 'ai' ? (host ? `<select class="inp" data-i="${i}" data-k="ai">${AI_LEVELS.map((L, j) => `<option value="${j}" ${j === s.ai ? 'selected' : ''}>${L.n}</option>`).join('')}</select><button class="btn ghost sm" data-del="${i}">✕</button>` : `<span class="muted">${AI_LEVELS[s.ai].n}</span>`) : ''}</div>`; }).join('');
    rs.querySelectorAll('#lslots select').forEach(sel => sel.onchange = () => { SND.ui('click'); Net.L.slot(+sel.dataset.i, sel.dataset.k, sel.dataset.k === 'f' ? sel.value : +sel.value); });
    rs.querySelectorAll('#lslots [data-del]').forEach(b => b.onclick = () => Net.L.remove(+b.dataset.del));
    rs.querySelectorAll('#lslots svg').forEach(e => e.style.cssText = 'width:26px;height:26px;flex:0 0 26px');
    const maps = MAPS.filter(m => m.max >= Math.max(2, l.slots.length) && (!host || m.id === l.map || Eco.owns('map', m.id))); // the host plays on maps they own
    rs.querySelector('#lset').innerHTML = `<div class="maps">${maps.map(m => `<button class="mapc ${m.id === l.map ? 'on' : ''}" data-m="${m.id}" ${host ? '' : 'disabled style="pointer-events:none"'}><canvas width="140" height="56" data-prev="${m.id}"></canvas><b>${m.n}</b><span>حتى ${m.max} لاعبين</span></button>`).join('')}</div>
      <div class="frow" style="margin-top:8px"><label>المال</label>${host ? K.seg('money', [[5000, '5k'], [10000, '10k'], [20000, '20k'], [50000, '50k']], l.money) : '<span class="muted">$' + fm(l.money) + '</span>'}</div>
      <div class="frow" style="margin-top:6px"><label>الوقت</label>${host ? K.seg('tod', [['day', 'نهار'], ['dusk', 'غروب'], ['night', 'ليل']], l.tod) : '<span class="muted">' + ({ day: 'نهار', dusk: 'غروب', night: 'ليل' }[l.tod] || '') + '</span>'}</div>
      <div class="frow" style="margin-top:6px"><label>وحدات النخبة</label>${host ? K.seg('meta', [[1, 'مسموحة'], [0, 'ممنوعة']], l.meta) : '<span class="muted">' + (l.meta ? 'مسموحة' : 'ممنوعة') + '</span>'}</div>`;
    rs.querySelectorAll('#lset [data-m]').forEach(b => b.onclick = () => { SND.ui('click'); Net.L.setMap(b.dataset.m); });
    K.segBind(rs.querySelector('#lset'), (k, v) => Net.L.set(k, v));
    rs.querySelectorAll('#lset canvas[data-prev]').forEach(c => { const def = MAPS.find(m => m.id === c.dataset.prev); Menus.preview(def, url => { if (!url || !c.isConnected) return; const im = new Image(); im.onload = () => { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, c.width, c.height); }; im.src = url; }); });
  }
  return { open, home, choose, online, room, joinCode, errMsg };
})();
