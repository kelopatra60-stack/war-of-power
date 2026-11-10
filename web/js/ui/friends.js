/* ============================================================
   War of Power — الأصدقاء: رمز صداقة، قائمة، رسائل نصية، دعوات للمعارك، إشعارات
   الملف: js/ui/friends.js   ·   آخر ملف يُحمَّل
   ============================================================ */
'use strict';
/* Messages travel through ntfy.sh — a free open-source push service with an HTTP API:
   · every player has a short friend code; their inbox is the topic FRIEND_SVC.prefix + code
   · while the game is open, messages arrive instantly (server-sent events) and show inside the game
   · outside the game: subscribe to your topic in the free «ntfy» Android app and Android shows each message as a notification
   · if the friend is offline, ntfy keeps the message for some hours and the game collects it on its next start */
const FRIEND_SVC = { url: 'https://ntfy.sh', prefix: 'alharb_' };
const Friends = (function () {
  const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const K = () => UI.kit; const esc = s => UI.kit.esc(s);
  let D = LS.get('tw_friends_v1', null) || {}; D.list = D.list || []; D.seen = D.seen || [];
  const save = () => LS.set('tw_friends_v1', D);
  const norm = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const topic = c => FRIEND_SVC.prefix + c;
  function myCode() { if (!Profile.fid || Profile.fid.length !== 6) { const r = crypto.getRandomValues(new Uint8Array(6)); Profile.fid = [...r].map(v => ABC[v % ABC.length]).join(''); saveProfile(); } return Profile.fid; }
  const find = c => D.list.find(f => f.c === c);
  function add(c, n) { c = norm(c); if (c.length !== 6 || c === myCode()) return null; let f = find(c); if (!f) { f = { c, n: (n || '').trim().slice(0, 18) || 'صديق ' + c, m: [], u: 0 }; D.list.unshift(f); save(); } return f; }
  const unread = () => D.list.reduce((s, f) => s + (f.u || 0), 0);
  const hue = c => [...c].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
  /* ---------- sending ---------- */
  function post(c, text, kind) {
    const body = { topic: topic(c), title: (Profile.name || 'لاعب').slice(0, 18), message: text, tags: ['crossed_swords', 'f_' + myCode()].concat(kind ? ['k_' + kind] : []) };
    return fetch(FRIEND_SVC.url, { method: 'POST', body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error('http ' + r.status); });
  }
  function sendMsg(f, text, kind) {
    text = String(text || '').trim().slice(0, 240); if (!text) return; const m = { t: Date.now(), x: text, me: 1, k: kind || '' }; f.m.push(m); trim(f); save(); if (cur === f.c) renderThread();
    post(f.c, text, kind).then(() => { m.ok = 1; save(); if (cur === f.c) renderThread(); }).catch(() => { m.e = 1; save(); if (cur === f.c) renderThread(); K().toast('تعذّر إرسال الرسالة — تحقّق من الإنترنت', 'warn'); });
  }
  const trim = f => { if (f.m.length > 80) f.m.splice(0, f.m.length - 80); };
  /* ---------- receiving ---------- */
  let es = null, poll = 0, fails = 0;
  function start() {
    myCode(); if (es || poll || !window.fetch) return; const url = FRIEND_SVC.url + '/' + topic(myCode());
    const since = () => D.since || '12h';
    const pollNow = () => fetch(url + '/json?poll=1&since=' + encodeURIComponent(since())).then(r => r.text()).then(t => { for (const l of t.split('\n')) if (l.trim()) try { handle(JSON.parse(l)); } catch (e) { } }).catch(() => { });
    if (window.EventSource) {
      es = new EventSource(url + '/sse?since=' + encodeURIComponent(since()));
      es.onmessage = e => { fails = 0; try { handle(JSON.parse(e.data)); } catch (x) { } };
      es.onerror = () => { if (++fails > 6 && es) { es.close(); es = null; poll = setInterval(pollNow, 30000); pollNow(); } };
    } else { poll = setInterval(pollNow, 30000); pollNow(); }
  }
  function handle(m) {
    if (!m || m.event !== 'message' || !m.id || D.seen.includes(m.id)) return; D.seen.push(m.id); if (D.seen.length > 300) D.seen.splice(0, 100); D.since = m.id;
    const tags = m.tags || []; const ft = tags.find(t => t.startsWith('f_')); const from = ft ? norm(ft.slice(2)) : ''; if (!from || from === myCode()) { save(); return; }
    const f = add(from, m.title); if (!f) { save(); return; } if (m.title) f.n = String(m.title).slice(0, 18);
    const kt = tags.find(t => t.startsWith('k_')); const kind = kt ? kt.slice(2) : ''; const text = String(m.message || '').slice(0, 300);
    f.m.push({ t: (m.time || 0) * 1000 || Date.now(), x: text, k: kind }); trim(f); const seeing = cur === f.c && scr && scr.isConnected; if (!seeing) f.u = (f.u || 0) + 1; save();
    if (seeing) renderThread(); else if (scr && scr.isConnected) drawList(); badges(); alertUser(f, text, kind);
  }
  function alertUser(f, text, kind) {
    const inv = kind.startsWith('inv_') ? kind.slice(4) : '';
    if (document.hidden) { // the game is in the background: a system notification where the platform allows it
      try { if (window.TWNative && TWNative.notify) TWNative.notify(f.n, text); else if (window.Notification && Notification.permission === 'granted') new Notification(f.n, { body: text, tag: 'alharb-' + f.c }); } catch (e) { }
    }
    SND.ui('tick');
    if (inv && !GAME && typeof Lobby !== 'undefined' && !(typeof Net !== 'undefined' && Net.state !== 'off')) { K().confirmBox(f.n + ' يدعوك إلى معركة أونلاين — هل تنضم؟', () => Lobby.joinCode(inv)); return; }
    UI.toast((inv ? '⚔ ' : '💬 ') + f.n + ': ' + text, 'info');
  }
  function badges() { const n = unread(); document.querySelectorAll('.frb').forEach(b => { let u = b.querySelector('.bdg'); if (!n) { if (u) u.remove(); return; } if (!u) { u = document.createElement('u'); u.className = 'bdg'; b.appendChild(u); } u.textContent = n > 9 ? '9+' : n; }); }
  /* ---------- screen ---------- */
  let scr = null, cur = '';
  function screen(sel) {
    myCode(); if (sel !== undefined) cur = sel; const f = cur && find(cur); if (f) { f.u = 0; save(); }
    scr = K().showScreen(K().top('الأصدقاء') + `<div class="frbox"><div class="frside"><div class="frme"><span>رمز صداقتك</span><b dir="ltr">${myCode()}</b><button class="btn sm" data-a="share">مشاركة</button></div>
      <button class="btn acc" data-a="addv">+ إضافة صديق</button><div class="frlist"></div></div><div class="frmain"></div></div>`, 'setup friends', MODE_AC.rec);
    drawList(); if (f) renderThread(); else addPanel();
    K().bind(scr, { share: () => shareCode(), addv: () => { cur = ''; drawList(); addPanel(); } });
  }
  function drawList() {
    const box = scr && scr.querySelector('.frlist'); if (!box) return;
    box.innerHTML = D.list.length ? D.list.map(x => `<button class="fr ${x.c === cur ? 'on' : ''}" data-c="${x.c}"><i class="fav" style="--h:${hue(x.c)}">${esc(x.n.slice(0, 1))}</i><span><b>${esc(x.n)}</b><em dir="ltr">${x.c}</em></span>${x.u ? `<u>${x.u > 9 ? '9+' : x.u}</u>` : ''}</button>`).join('') : '<p class="muted">لا يوجد أصدقاء بعد.</p>';
    box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { SND.ui('tab'); cur = b.dataset.c; const f = find(cur); if (f) { f.u = 0; save(); } drawList(); renderThread(); badges(); });
  }
  function addPanel() {
    const box = scr && scr.querySelector('.frmain'); if (!box) return; const tp = topic(myCode());
    box.innerHTML = `<div class="card"><h3>إضافة صديق</h3><div class="frow"><label>رمز الصديق</label><input class="inp code" id="frc" maxlength="6" placeholder="Q7K2MX" dir="ltr" autocomplete="off"></div>
      <div class="frow"><label>اسمه (اختياري)</label><input class="inp" id="frn" maxlength="18"></div><button class="btn pri" data-k="add">إضافة</button></div>
      <div class="card"><h3>الإشعارات خارج اللعبة</h3><p class="muted">ثبّت تطبيق ntfy المجاني واشترك في قناتك، فتصلك رسائل أصدقائك ودعواتهم كإشعار حتى واللعبة مغلقة.</p>
      <div class="frtp"><b dir="ltr">${tp}</b><button class="btn sm" data-k="cp">نسخ</button><button class="btn sm" data-k="ntfy">فتح ntfy</button></div>
      ${window.Notification && Notification.permission !== 'granted' && !window.TWNative ? '<button class="btn sm" data-k="perm">إشعارات المتصفح أثناء تصغير اللعبة</button>' : ''}</div>`;
    const inp = box.querySelector('#frc'); inp.addEventListener('input', () => { inp.value = norm(inp.value); });
    box.querySelector('[data-k="add"]').onclick = () => { const c = norm(inp.value); if (c.length !== 6) { K().toast('رمز الصداقة 6 أحرف', 'warn'); return; } if (c === myCode()) { K().toast('هذا رمزك أنت', 'warn'); return; } const f = add(c, box.querySelector('#frn').value); if (!f) return; SND.ui('buy'); K().toast('تمت إضافة ' + f.n, 'good'); cur = f.c; drawList(); renderThread(); };
    box.querySelector('[data-k="cp"]').onclick = () => copy(tp);
    box.querySelector('[data-k="ntfy"]').onclick = () => openLink(FRIEND_SVC.url + '/' + tp);
    const pb = box.querySelector('[data-k="perm"]'); if (pb) pb.onclick = () => Notification.requestPermission().then(r => { K().toast(r === 'granted' ? 'تم تفعيل إشعارات المتصفح' : 'لم يُسمح بالإشعارات', r === 'granted' ? 'good' : 'warn'); addPanel(); });
  }
  function renderThread() {
    const box = scr && scr.querySelector('.frmain'); const f = find(cur); if (!box || !f) return;
    const day = t => new Date(t).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    box.innerHTML = `<div class="frhead"><i class="fav" style="--h:${hue(f.c)}">${esc(f.n.slice(0, 1))}</i><div><b>${esc(f.n)}</b><em dir="ltr">${f.c}</em></div><span class="sp"></span><button class="btn sm acc" data-k="inv">⚔ دعوة لمعركة</button><button class="btn sm ghost" data-k="del" aria-label="حذف">✕</button></div>
      <div class="frmsgs">${f.m.length ? f.m.map(m => `<div class="msg ${m.me ? 'me' : ''} ${m.k && m.k.startsWith('inv_') ? 'inv' : ''}"><p>${esc(m.x)}</p><i>${day(m.t)}${m.me ? (m.e ? ' · لم تُرسل' : m.ok ? ' ✓' : ' …') : ''}</i>${!m.me && m.k && m.k.startsWith('inv_') ? `<button class="btn sm pri" data-j="${esc(m.k.slice(4))}">انضمام</button>` : ''}</div>`).join('') : '<p class="muted">ابدأ المحادثة — تصل رسالتك فوراً إن كان صديقك متصلاً، أو لاحقاً عند عودته.</p>'}</div>
      <div class="frin"><input class="inp" id="frm" maxlength="240" placeholder="اكتب رسالة…"><button class="btn pri" data-k="send">إرسال</button></div>`;
    const ms = box.querySelector('.frmsgs'); ms.scrollTop = ms.scrollHeight; const inp = box.querySelector('#frm');
    const go = () => { sendMsg(f, inp.value); inp.value = ''; inp.focus(); };
    box.querySelector('[data-k="send"]').onclick = go; inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    box.querySelector('[data-k="inv"]').onclick = () => invite(f);
    box.querySelector('[data-k="del"]').onclick = () => K().confirmBox('حذف ' + f.n + ' من أصدقائك؟', () => { D.list = D.list.filter(x => x !== f); save(); cur = ''; drawList(); addPanel(); });
    box.querySelectorAll('[data-j]').forEach(b => b.onclick = () => Lobby.joinCode(b.dataset.j));
  }
  // invite: send the room code of the online room we host (opening one first when needed)
  function invite(f) {
    const go = code => sendMsg(f, 'يدعوك إلى معركة أونلاين — رمز الغرفة ' + code, 'inv_' + code);
    if (typeof Net !== 'undefined' && Net.state === 'lobby' && Net.isHost && Net.roomCode) { go(Net.roomCode); K().toast('أُرسلت الدعوة إلى ' + f.n, 'good'); return; }
    if (typeof Net !== 'undefined' && Net.state !== 'off') { K().toast('غادر الغرفة الحالية أولاً', 'warn'); return; }
    K().toast('جارٍ إنشاء غرفة أونلاين…', 'info');
    Net.online(null).then(code => { go(code); Lobby.room(); K().toast('أُرسلت الدعوة إلى ' + f.n, 'good'); }).catch(e => K().toast(Lobby.errMsg(e), 'warn'));
  }
  /* ---------- helpers ---------- */
  function copy(t) { try { navigator.clipboard.writeText(t).then(() => K().toast('تم النسخ', 'good'), () => K().toast(t, 'info')); } catch (e) { K().toast(t, 'info'); } }
  function openLink(u) { let w = null; try { w = window.open(u, '_blank', 'noopener'); } catch (e) { } if (!w) copy(u); }
  function shareCode() { const t = '⚔ War of Power — رمز صداقتي: ' + myCode(); if (navigator.share) navigator.share({ text: t }).catch(() => { }); else copy(t); }
  setTimeout(() => { try { start(); } catch (e) { console.warn('friends', e); } }, 1500);
  return { screen, start, unread, badges, myCode, copy, openLink, list: () => D.list, invite };
})();
