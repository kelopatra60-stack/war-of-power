/* ============================================================
   War of Power — اللعب الجماعي عبر الشبكة المحلية
   الملف: js/net/net.js   ·   ترتيب التحميل: 41 من 43
   ============================================================ */
'use strict';
/* ===== LAN multiplayer: transport (Android bridge or WebSocket), room protocol, deterministic lockstep ===== */
const NET_VER = 'TW2';
const Net = (function () {
  const DELAY = 3, ACK_EVERY = 10, HASH_EVERY = 60, STALL = 60, DROP_MS = 15000;
  let tr = null, st = 'off', myId = -1, hostId = -1, isHost = false, peers = [], lobby = null, welcome = null, nativeH = null, wantClose = false;
  const ui = { lobby: null, status: null, chat: null, hosts: null, closed: null };
  const hosts = new Map();
  // lockstep state
  let endShown = false, setupObj = null, slot = -1, bundles = new Map(), pending = [], acc = 0, maxB = -1, lastAck = new Map(), lastSeen = new Map(), dropped = new Set(), hostHash = new Map(), peerHash = new Map(), doneB = new Map(), needSync = false, ep = 0, loaded = new Set(), goRes = null, goTimer = 0, stallT = 0, lastSync = -1e9, pingMs = 0, pingT = 0, spect = false;
  const emit = (k, v) => { if (k === 'status' || k === 'closed') keep(); try { if (ui[k]) ui[k](v); } catch (e) { console.error(e); } };
  // inside the Android app: while a room is open a small notification keeps the game running in the background (sharing the code in WhatsApp, etc.)
  let kept = '';
  function keep() { const on = st !== 'off' && st !== 'connecting'; const txt = on ? TR(isHost ? 'غرفتك مفتوحة — يستطيع أصدقاؤك الانضمام' : 'أنت متصل بغرفة لعب جماعي') : '';
    if (txt === kept) return; kept = txt; try { if (native() && TWNative.keepAlive) TWNative.keepAlive(on, txt); } catch (e) { } }
  const clean = s => String(s || 'لاعب').replace(/[|\n\r]/g, ' ').trim().slice(0, 18) || 'لاعب';
  const native = () => !!(window.TWNative && typeof TWNative.connect === 'function');
  const servedByHost = () => location.protocol === 'http:' && location.port === '47700';
  const canHost = () => native() || servedByHost() || !!window.__twRelayTest;
  function chatEv(c) { emit('chat', c); if (GAME && GAME.net && UI.netChat) try { UI.netChat(c); } catch (e) { } }
  let roomCode = ''; // online room code (empty on LAN)
  /* ---------------- transport ---------------- */
  function raw(l) { if (tr) try { tr.send(l); } catch (e) { console.error(e); } }
  function send(to, payload) { raw(to + '|' + payload); }
  const toHost = p => send('h', p), toAll = p => send('*', p);
  function connect(addr, wantHost, name) {
    close(true); wantClose = false; st = 'connecting'; emit('status', 'connecting');
    return new Promise((res, rej) => {
      let done = false; const fail = e => { if (done) return; done = true; welcome = null; st = 'off'; try { if (tr) tr.close(); } catch (x) { } tr = null; rej(e); };
      welcome = { res: v => { if (!done) { done = true; res(v); } }, rej: fail };
      const hello = () => raw('#hello|' + clean(name) + '|' + (wantHost ? 1 : 0) + '|' + NET_VER);
      if (addr && addr.rtc) { // WebRTC data channel (online room, js/net/rtc.js) — also inside the Android app, so it comes before the LAN bridge
        const t = addr.rtc; const cid = ++connId; tr = { send: l => t.send(l), close: () => t.close() };
        t.on({ open: () => { if (cid === connId) hello(); }, line: l => { if (cid === connId) onLine(l); }, close: () => { if (cid !== connId) return; if (!done) fail('closed'); else onClose(); } });
        t.start();
      } else if (native()) { // hotspot game inside the Android app: NetBridge.java
        const [h, p] = String(addr || '127.0.0.1').split(':'); tr = { send: l => TWNative.send(l), close: () => TWNative.disconnect() };
        nativeH = { open: hello, line: onLine, close: () => { if (!done) fail('closed'); else onClose(); }, error: e => fail(e || 'error') };
        try { TWNative.connect(h, +(p || 47700)); } catch (e) { fail('native'); }
      } else {
        let url; if (!addr) url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'; else url = 'ws://' + (String(addr).includes(':') ? addr : addr + ':47700') + '/ws';
        let ws; try { ws = new WebSocket(url); } catch (e) { fail('ws'); return; }
        tr = { send: l => { if (ws.readyState === 1) ws.send(l); }, close: () => { try { ws.close(); } catch (e) { } } };
        const cid = ++connId; ws.onopen = () => { if (cid === connId) hello(); }; ws.onmessage = e => { if (cid === connId) onLine(String(e.data)); }; ws.onerror = () => { if (cid === connId) fail('error'); }; ws.onclose = () => { if (cid !== connId) return; if (!done) fail('closed'); else onClose(); };
      }
      setTimeout(() => fail('timeout'), 9000);
    });
  }
  let connId = 0;
  function close(silent) { roomCode = ''; wantClose = true; connId++; if (tr) { try { tr.close(); } catch (e) { } } tr = null; if (!silent) { st = 'off'; emit('status', 'off'); } else keep(); }
  // events from the Android bridge (NetBridge.java)
  window.TWNet = window.TWNet || {}; TWNet._ev = (type, data) => { if (type === 'host') { foundHost(String(data)); return; } const h = nativeH; if (!h) return; if (type === 'open') h.open(); else if (type === 'line') h.line(String(data)); else if (type === 'close') h.close(); else if (type === 'error') h.error(String(data)); };
  TWNet._evs = arr => { for (const l of arr) TWNet._ev('line', l); };
  function foundHost(s) { const f = s.split('|'); if (f.length < 7 || f[1] !== 'TWGAME') return; hosts.set(f[0], { ip: f[0], name: f[2], port: +f[3], n: +f[4], max: +f[5], state: f[6], t: Date.now() }); emit('hosts', list()); }
  function list() { const now = Date.now(); for (const [k, v] of hosts) if (now - v.t > 4500) hosts.delete(k); return [...hosts.values()]; }
  function scan(on) { if (!native()) return false; try { TWNative.scan(!!on); } catch (e) { return false; } if (!on) hosts.clear(); return true; }
  /* ---------------- incoming ---------------- */
  function onLine(l) {
    if (!l) return;
    if (l[0] === '#') { const f = l.split('|');
      switch (f[0]) {
        case '#welcome': myId = +f[1]; hostId = +f[2]; isHost = myId === hostId; try { peers = JSON.parse(f.slice(3).join('|')); } catch (e) { peers = []; } st = 'lobby'; if (isHost) initLobby(); if (welcome) welcome.res({ id: myId, host: isHost }); welcome = null; emit('status', 'lobby'); if (!isHost) sendInfo(); return;
        case '#join': peers.push({ id: +f[1], name: f[2] }); if (isHost) { lastSeen.set(+f[1], Date.now()); if (st === 'lobby') { addHuman(+f[1], f[2]); pushLobby(); } } chatEv({ sys: 1, m: f[2] + ' انضم إلى الغرفة' }); return;
        case '#leave': { const id = +f[1]; const pn = (peers.find(p => p.id === id) || {}).name || ''; peers = peers.filter(p => p.id !== id); if (isHost) { if (st === 'lobby') { lobby.slots = lobby.slots.filter(s => s.peer !== id); pushLobby(); } else dropPeer(id, 'غادر'); } chatEv({ sys: 1, m: pn + ' غادر' }); return; }
        case '#hostleft': if (st === 'game' || st === 'loading') goOffline('غادر المضيف المعركة — تستمر المعركة ضد الحاسوب'); else { emit('closed', 'أغلق المضيف الغرفة'); close(); } return;
        case '#full': if (welcome) welcome.rej('full'); return; case '#nohost': if (welcome) welcome.rej('nohost'); return; case '#busy': if (welcome) welcome.rej('busy'); return;
        case '#pong': pingMs = Math.round(performance.now() - pingT); return;
        default: return;
      } }
    const bar = l.indexOf('|'); if (bar < 0) return; const from = +l.slice(0, bar), p = l.slice(bar + 1); if (isHost) lastSeen.set(from, Date.now());
    const c0 = p[0];
    if (c0 === 'b') { const i = p.indexOf(':'); const k = +p.slice(1, i); let cmds; try { cmds = JSON.parse(p.slice(i + 1)); } catch (e) { cmds = []; } bundles.set(k, cmds); if (k > maxB) maxB = k; return; }
    if (c0 === 'c') { if (!isHost || st !== 'game') return; let c; try { c = JSON.parse(p.slice(1)); } catch (e) { return; } const s = slotOf(from); if (s < 0 || dropped.has(from)) return; c.p = s; pending.push(c); return; }
    if (c0 === 'k') { if (isHost) lastAck.set(from, +p.slice(1)); return; }
    if (c0 === 'h') { if (!isHost) return; const q = p.slice(1).split(':'); const k = +q[0], h = +q[1]; if ((+q[2] || 0) !== ep) return; // a hash computed before the last resync says nothing about the rebuilt match
      const mine = hostHash.get(k);
      if (mine !== undefined) { if (mine !== h) { console.warn('desync at tick', k, 'peer', from); needSync = true; } }
      else { let a = peerHash.get(k); if (!a) peerHash.set(k, a = []); a.push([from, h]); if (peerHash.size > 80) peerHash.delete(peerHash.keys().next().value); } // a client can run up to DELAY ticks ahead of the host: keep its hash until ours exists
      return; }
    let m; try { m = JSON.parse(p); } catch (e) { return; }
    switch (m.t) {
      case 'info': if (isHost && st === 'lobby') { const s = lobby.slots.find(x => x.peer === from); if (s) { if (FACTIONS[m.f]) s.f = m.f; s.ready = !!m.ready; s.name = clean(m.name || s.name); pushLobby(); } } return;
      case 'lobby': if (!isHost) { lobby = m.l; emit('lobby', lobby); } return;
      case 'chat': chatEv({ n: m.n, m: String(m.m || '').slice(0, 120) }); if (isHost && m.relay) toAll(JSON.stringify({ t: 'chat', n: m.n, m: m.m })); return;
      case 'start': if (!isHost) begin(m.s); return;
      case 'ld': if (isHost) { loaded.add(from); checkGo(); } return;
      case 'go': if (!isHost) startGo(); return;
      case 'sync': if (!isHost) applySync(m); return;
      case 'end': if (!isHost && (st === 'game' || st === 'loading')) { st = 'lobby'; if (GAME) { Main.endGame(); } UI.toast('أنهى المضيف المعركة', 'warn'); emit('status', 'lobby'); Lobby.open(); } return;
      case 'bye': if (isHost) { dropped.add(from); lastAck.delete(from); } return;
    }
  }
  function onClose() { if (wantClose || st === 'off') return; const was = st; tr = null; if (was === 'game' || was === 'loading') goOffline('انقطع الاتصال بالشبكة — تستمر المعركة ضد الحاسوب'); else { st = 'off'; emit('closed', 'انقطع الاتصال بالغرفة'); } }
  /* ---------------- room (host-authoritative) ---------------- */
  function initLobby() { const last = LS.get('tw_last_v1', null) || {}; lobby = { map: 'forest', money: 10000, tod: 'day', meta: 1, slots: [{ k: 'h', peer: myId, name: clean(Profile.name), f: last.f || 'usa', team: 1, ready: true }] }; for (const p of peers) if (p.id !== myId) addHuman(p.id, p.name); emit('lobby', lobby); }
  function addHuman(id, name) { if (lobby.slots.some(s => s.peer === id) || lobby.slots.length >= 6) return; const used = new Set(lobby.slots.map(s => s.f)); const f = FACTION_IDS.find(x => !used.has(x)) || 'rus'; const teams = new Set(lobby.slots.map(s => s.team)); let t = 1; while (teams.has(t)) t++; lobby.slots.push({ k: 'h', peer: id, name: clean(name), f, team: Math.min(t, 6), ready: false }); }
  function pushLobby() { if (!isHost) return; const def = MAPS.find(m => m.id === lobby.map); if (def && lobby.slots.length > def.max) { const big = MAPS.filter(m => m.max >= lobby.slots.length); if (big.length) lobby.map = big[0].id; } toAll(JSON.stringify({ t: 'lobby', l: lobby })); raw('#room|' + clean(Profile.name) + '|6'); emit('lobby', lobby); }
  function sendInfo(ready) { if (isHost) return; const me = lobby && lobby.slots.find(s => s.peer === myId); const last = LS.get('tw_last_v1', null) || {}; toHost(JSON.stringify({ t: 'info', name: clean(Profile.name), f: (sendInfo.f || (me && me.f) || last.f || 'usa'), ready: !!(ready !== undefined ? ready : sendInfo.ready) })); }
  const L = {
    setMap(id) { if (!isHost) return; const d = MAPS.find(m => m.id === id); if (!d || d.max < lobby.slots.length) { UI.toast('هذه الخريطة لا تتسع لكل اللاعبين', 'warn'); return; } lobby.map = id; pushLobby(); },
    set(k, v) { if (!isHost) return; if (k === 'money') lobby.money = clamp(+v, 2000, 100000); if (k === 'tod') lobby.tod = ['day', 'dusk', 'night'].includes(v) ? v : 'day'; if (k === 'meta') lobby.meta = +v ? 1 : 0; pushLobby(); },
    addAI() { if (!isHost || lobby.slots.length >= 6) return; const used = new Set(lobby.slots.map(s => s.f)); const f = FACTION_IDS.find(x => !used.has(x)) || 'rus'; const teams = new Set(lobby.slots.map(s => s.team)); let t = 1; while (teams.has(t)) t++; lobby.slots.push({ k: 'ai', f, ai: 1, team: Math.min(t, 6) }); pushLobby(); },
    remove(i) { if (!isHost) return; const s = lobby.slots[i]; if (!s || s.peer === myId) return; if (s.k === 'h') { UI.toast('لا يمكن إزالة لاعب متصل', 'warn'); return; } lobby.slots.splice(i, 1); pushLobby(); },
    slot(i, k, v) { const s = lobby && lobby.slots[i]; if (!s) return; if (isHost) { if (k === 'f' && FACTIONS[v]) s.f = v; if (k === 'team') s.team = clamp(+v, 1, 6); if (k === 'ai' && s.k === 'ai') s.ai = clamp(+v, 0, 3); pushLobby(); } else if (s.peer === myId && k === 'f') { sendInfo.f = v; s.f = v; sendInfo(); emit('lobby', lobby); } },
    ready(v) { sendInfo.ready = !!v; sendInfo(v); },
    chat(m) { m = String(m || '').trim().slice(0, 120); if (!m) return; const n = clean(Profile.name); chatEv({ n, m }); if (isHost) toAll(JSON.stringify({ t: 'chat', n, m })); else toHost(JSON.stringify({ t: 'chat', n, m, relay: 1 })); },
    start(force) {
      if (!isHost || st !== 'lobby') return false; const sl = lobby.slots; if (sl.length < 2) { UI.toast('أضف لاعباً أو خصماً آلياً أولاً', 'warn'); return false; }
      if (new Set(sl.map(s => s.team)).size < 2) { UI.toast('كل اللاعبين في فريق واحد — غيّر الفرق', 'warn'); return false; }
      if (!force && sl.some(s => s.k === 'h' && !s.ready)) { UI.toast('ليس كل اللاعبين جاهزين', 'warn'); return false; }
      const def = MAPS.find(m => m.id === lobby.map) || MAPS[1]; if (def.max < sl.length) { UI.toast('الخريطة صغيرة على هذا العدد', 'warn'); return false; }
      const cols = []; const players = sl.map(s => { let col = FACTIONS[s.f].col; while (cols.includes(col)) col = (col + 1) % 8; cols.push(col);
        if (s.k === 'h') return { f: s.f, col, team: s.team, human: true, name: s.name, peer: s.peer, noElite: !lobby.meta };
        return { f: s.f, col, team: s.team, ai: s.ai, name: FACTIONS[s.f].short + ' (حاسوب)' }; });
      const setup = { mapId: def.id, players, money: lobby.money, tod: lobby.tod, seed: ((Math.random() * 4294967295) >>> 0) || 7 };
      toAll(JSON.stringify({ t: 'start', s: setup })); raw('#state|ingame'); begin(setup); return true;
    },
  };
  /* ---------------- match lifecycle ---------------- */
  function slotOf(peer) { if (!setupObj) return -1; return setupObj.players.findIndex(p => p.peer === peer); }
  function begin(setup) {
    setupObj = setup; slot = setup.players.findIndex(p => p.peer === myId); if (slot < 0) { UI.toast('لم يُعثر على مقعدك في المعركة', 'bad'); return; }
    endShown = false; bundles = new Map(); pending = []; acc = 0; maxB = -1; lastAck = new Map(); dropped = new Set(); hostHash = new Map(); peerHash = new Map(); doneB = new Map(); needSync = false; ep = 0; loaded = new Set(); goRes = null; stallT = 0; lastSync = -1e9; spect = false;
    const now = Date.now(); for (const p of setup.players) if (p.peer !== undefined) lastSeen.set(p.peer, now);
    st = 'loading'; emit('status', 'loading');
    Main.startNet(Object.assign({}, setup, { local: slot }), adapter);
  }
  const adapter = {
    step: (g, dt) => step(g, dt), alpha: () => clamp(acc / DT, 0, 1),
    ready: g => { g.net = adapter; Cmd.sink = sink; return new Promise(r => { goRes = r; Load.prog(1); Load.note('بانتظار بقية اللاعبين…'); if (isHost) { loaded.add(myId); clearTimeout(goTimer); goTimer = setTimeout(() => checkGo(true), 45000); checkGo(); } else toHost(JSON.stringify({ t: 'ld' })); }); },
    fail: () => { UI.toast('تعذّر تجهيز المعركة الجماعية', 'bad'); },
  };
  function checkGo(timeout) {
    if (!isHost || st !== 'loading' || !goRes) return; const humans = setupObj.players.filter(p => p.human && p.peer !== undefined && !dropped.has(p.peer));
    const missing = humans.filter(p => !loaded.has(p.peer)); if (missing.length && !timeout) return;
    for (const p of missing) dropPeer(p.peer, 'تأخر في التحميل');
    toAll(JSON.stringify({ t: 'go' })); startGo();
  }
  function startGo() { st = 'game'; acc = 0; emit('status', 'game'); const r = goRes; goRes = null; if (r) r(); }
  function dropPeer(peer, why) {
    if (!isHost || dropped.has(peer)) return; dropped.add(peer); lastAck.delete(peer); const s = slotOf(peer); if (s < 0) return;
    pending.push({ c: 'ai', p: s, l: 1 }); const nm = setupObj.players[s].name || ''; if (GAME) GAME.notify(GAME.local, nm + ' ' + (why || 'انقطع') + ' — يتولى الحاسوب قيادته', 'warn');
  }
  function sink(c) { if (st !== 'game' || spect) return true; if (isHost) { c.p = slot; pending.push(c); } else toHost('c' + JSON.stringify(c)); return true; }
  /* ---------------- lockstep ---------------- */
  function hash(g) {
    let h = 2166136261 >>> 0; const mix = v => { h ^= (v | 0); h = Math.imul(h, 16777619) >>> 0; };
    mix(g.tick); for (const p of g.players) { mix(Math.round(p.money)); mix(p.alive ? 1 : 2); mix(p.pop); }
    for (const u of g.units) { if (u.dead) continue; mix(u.id); mix(Math.round(u.x * 4)); mix(Math.round(u.y * 4)); mix(Math.round(u.hp)); }
    for (const b of g.blds) { mix(b.id); mix(Math.round(b.hp)); } mix(g.proj.length); return h >>> 0;
  }
  function runTick(g) {
    const k = g.tick; const cmds = bundles.get(k); if (k >= DELAY && !cmds) return false;
    if (cmds) { for (const c of cmds) Cmd.exec(g, c); bundles.delete(k); doneB.set(k, cmds); if (doneB.size > 240) doneB.delete(doneB.keys().next().value); } // kept: a resync may rewind a peer that ran ahead
    gameTick(g, DT);
    if (g.tick % HASH_EVERY === 0) { const h = hash(g); if (window.__twHashLog) window.__twHashLog[g.tick] = h; if (isHost) { hostHash.set(g.tick, h); if (hostHash.size > 40) hostHash.delete(hostHash.keys().next().value); const early = peerHash.get(g.tick); if (early) { peerHash.delete(g.tick); for (const [pf, ph] of early) if (ph !== h) { console.warn('desync at tick', g.tick, 'peer', pf); needSync = true; } } } else toHost('h' + g.tick + ':' + h + ':' + ep); }
    if (!isHost && g.tick % ACK_EVERY === 0) toHost('k' + g.tick);
    return true;
  }
  function step(g, dt) {
    if (st !== 'game' || g !== GAME) return;
    if (isHost && needSync) { needSync = false; resync(); if (GAME !== g) return; } // rebuild between steps, never inside the tick loop
    if (isHost) {
      const now = Date.now(); let minAck = Infinity;
      for (const p of setupObj.players) { if (!p.human || p.peer === myId || p.peer === undefined || dropped.has(p.peer)) continue; if (now - (lastSeen.get(p.peer) || now) > DROP_MS) { dropPeer(p.peer, 'لا يستجيب'); continue; } minAck = Math.min(minAck, lastAck.has(p.peer) ? lastAck.get(p.peer) : 0); }
      if (minAck !== Infinity && g.tick - minAck > STALL) { stallT += dt; acc = 0; return; } stallT = 0;
      acc += dt; let n = 0;
      while (acc >= DT && n < 6) { acc -= DT; n++; const k = g.tick + DELAY; const cmds = pending; pending = []; bundles.set(k, cmds); toAll('b' + k + ':' + JSON.stringify(cmds)); runTick(g); }
      if (n >= 6) acc = 0;
    } else {
      acc += dt; const backlog = maxB - g.tick; let n = 0; const cap = backlog > 90 ? 12 : backlog > DELAY + 3 ? 3 : 1;
      while (acc >= DT && n < 6) { if (!runTick(g)) { acc = Math.min(acc, DT); break; } acc -= DT; n++; }
      while (n < cap + 1 && maxB - g.tick > DELAY + 1) { if (!runTick(g)) break; n++; }
    }
    if (performance.now() - pingT > 3000) { pingT = performance.now(); raw('#ping'); }
    if (!endShown && g.tick % 30 === 0 && new Set(g.players.filter(p => p.alive).map(p => p.team)).size <= 1) { endShown = true; if (g.over && (g.spectate || !g.me.alive) && UI.matchEnded) UI.matchEnded(); }
  }
  /* ---------------- recovery ---------------- */
  function resync() {
    if (!isHost || !GAME || performance.now() - lastSync < 20000) return; lastSync = performance.now();
    const g = GAME; let S; try { S = Main.makeSave(g); } catch (e) { console.error(e); return; } S.exp = null; S.tick = g.tick; S.mapId = setupObj.mapId; const seed = ((Math.random() * 4294967295) >>> 0) || 3;
    ep++; toAll(JSON.stringify({ t: 'sync', s: S, seed, ep })); applySync({ s: S, seed, ep });
  }
  function applySync(m) {
    try { const old = GAME; const g = Main.rebuildNet(m.s, m.seed, slot); if (!g) return; g.net = adapter; if (old && old.fog && g.fog.exp.length === old.fog.exp.length) { g.fog.exp.set(old.fog.exp); g.updateFog(); }
      ep = m.ep | 0; peerHash.clear(); for (const k of [...hostHash.keys()]) if (k >= g.tick) hostHash.delete(k);
      for (const [k, c] of doneB) if (k >= g.tick && !bundles.has(k)) bundles.set(k, c); doneB.clear(); for (const k of [...bundles.keys()]) if (k < g.tick) bundles.delete(k); acc = 0; g.notify(g.local, 'تمت مزامنة المعركة بين الأجهزة', 'info'); } catch (e) { console.error('sync', e); }
  }
  function goOffline(msg) {
    const g = GAME; st = 'off'; wantClose = true; Cmd.sink = null; try { if (tr) tr.close(); } catch (e) { } tr = null;
    if (g) { g.net = null; for (const p of g.players) if (p.human && p.id !== g.local && p.alive) { p.human = false; p.dropped = true; new AIBrain(g, p.id, 1); } g.notify(g.local, msg, 'warn'); }
    emit('status', 'off');
  }
  /* ---------------- leaving ---------------- */
  function leave() { if (st === 'game' && !isHost) toHost(JSON.stringify({ t: 'bye' })); Cmd.sink = null; if (GAME && GAME.net) GAME.net = null; setupObj = null; close(); }
  function backToLobby() { // after a finished match
    Cmd.sink = null; if (GAME && GAME.net) { if (!isHost) toHost(JSON.stringify({ t: 'bye' })); GAME.net = null; }
    if (isHost) { if (st === 'game' || st === 'loading') toAll(JSON.stringify({ t: 'end' })); st = 'lobby'; raw('#state|lobby'); for (const s of lobby.slots) if (s.k === 'h' && s.peer !== myId) s.ready = false; lobby.slots = lobby.slots.filter(s => s.k !== 'h' || s.peer === myId || peers.some(p => p.id === s.peer)); pushLobby(); }
    else if (st !== 'off') st = 'lobby';
  }
  function spectate() { spect = true; }
  function status() { const lag = isHost ? stallT > 0.5 : (maxB - (GAME ? GAME.tick : 0)) > 20; const n = setupObj ? setupObj.players.filter(p => p.human && !dropped.has(p.peer)).length : peers.length; return { lag, text: (st === 'game' ? (isHost ? 'مضيف' : 'متصل') : st) + ' · ' + n + ' لاعبين' + (pingMs ? ' · ' + pingMs + 'ms' : '') + (stallT > 0.5 ? ' · بانتظار لاعب' : '') }; }
  async function host(name) {
    if (native()) { let r = 'ok'; try { r = String(TWNative.hostStart(clean(name || Profile.name), 6)); } catch (e) { r = 'error'; } if (r !== 'ok') throw new Error(r); return connect('127.0.0.1:47700', true, name || Profile.name); }
    return connect('', true, name || Profile.name);
  }
  function join(addr, name) { return connect(addr, false, name || Profile.name); }
  // online over the internet: code empty → open a new room; otherwise join that room (WebRTC P2P)
  async function online(code, name) {
    if (!RTC.supported()) throw new Error('nortc');
    if (!code) { const r = await RTC.host(); try { await connect({ rtc: r.t }, true, name || Profile.name); } catch (e) { try { r.t.close(); } catch (x) { } throw e; } roomCode = r.code; return r.code; }
    const t = await RTC.join(code); try { await connect({ rtc: t }, false, name || Profile.name); } catch (e) { try { t.close(); } catch (x) { } throw e; } roomCode = String(code).toUpperCase(); return roomCode;
  }
  function ips() { try { if (native() && TWNative.ips) return String(TWNative.ips()).split(',').filter(Boolean); } catch (e) { } return servedByHost() ? [location.hostname] : []; }
  return { online, get roomCode() { return roomCode; }, host, join, leave, scan, hosts: list, ips, native, canHost, servedByHost, status, backToLobby, spectate, L, on: (k, f) => { ui[k] = f; },  get state() { return st; }, get isHost() { return isHost; }, get myId() { return myId; }, get lobby() { return lobby; },   get slot() { return slot; } };
})();
