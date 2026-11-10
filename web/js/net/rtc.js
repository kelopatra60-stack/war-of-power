/* ============================================================
   War of Power — اللعب الجماعي أونلاين: اتصال مباشر بين الأجهزة (WebRTC P2P)
   الملف: js/net/rtc.js   ·   يُحمَّل بعد net.js وقبل lobby.js
   ============================================================ */
'use strict';
/* How an online room works
   · The host's phone IS the room: every guest opens one direct WebRTC data channel to it (star topology).
   · A public signalling server (PeerJS protocol) only introduces the phones: short room code → offer / answer / ICE.
     Game traffic never passes through it, and a self-hosted PeerServer can replace it here.
   · Inside the host, a tiny relay speaks exactly the same line protocol as the LAN relay (#hello/#welcome/#join…),
     so the lobby and the deterministic lockstep in net.js work unchanged over WebRTC.
   · When a direct link cannot open (most mobile networks), the same room is also reachable through a relay: js/net/relay.js.
     A guest tries the direct link first and the relay 2 s later; whichever opens first is kept. */
const NET_SIGNAL = { host: '0.peerjs.com', port: 443, path: '/', key: 'peerjs', secure: true };
// STUN finds each phone's public address. When the networks still block a direct link (carrier NAT), js/net/relay.js carries the game instead.
const NET_ICE = [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:global.stun.twilio.com:3478' }];
const RTC = (function () {
  const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L: codes are easy to read aloud and type
  const PFX = () => 'alharb-' + NET_VER.toLowerCase() + '-';
  const code5 = () => { const r = crypto.getRandomValues(new Uint8Array(5)); let s = ''; for (const v of r) s += ABC[v % ABC.length]; return s; };
  const sigCfg = () => Object.assign({}, NET_SIGNAL, window.__twSignal || {});
  const iceCfg = () => ({ iceServers: window.__twIce || NET_ICE });
  const CH = 48000; // data channels cap one message at ~256 KB: big lines (resync saves) travel in chunks
  /* ---------- signalling socket (PeerJS server protocol) ---------- */
  function signal(id, h) {
    const c = sigCfg(); const tok = Math.random().toString(36).slice(2, 12); let ws, hb = 0, open = false, fin = false;
    const done = e => { if (fin) return; fin = true; clearInterval(hb); try { ws.close(); } catch (x) { } if (e) h.error(e); else if (h.lost) h.lost(); };
    try { ws = new WebSocket((c.secure ? 'wss://' : 'ws://') + c.host + ':' + c.port + c.path + 'peerjs?key=' + c.key + '&id=' + encodeURIComponent(id) + '&token=' + tok + '&version=1.5.4'); }
    catch (e) { setTimeout(() => h.error('nosignal'), 0); return { send() { }, close() { } }; }
    ws.onopen = () => { hb = setInterval(() => { if (ws.readyState === 1) ws.send('{"type":"HEARTBEAT"}'); }, 5000); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.type === 'OPEN') { open = true; h.open(); } else if (m.type === 'ID-TAKEN') done('taken'); else if (m.type === 'ERROR' || m.type === 'INVALID-KEY') done('nosignal');
      else if (m.type === 'OFFER' || m.type === 'ANSWER' || m.type === 'CANDIDATE') h.msg(m.type, m.src, m.payload || {}); else if ((m.type === 'EXPIRE' || m.type === 'LEAVE') && h.gone) h.gone(m.src); };
    ws.onerror = () => { if (!open) done('nosignal'); };
    ws.onclose = () => done(open ? null : 'nosignal');
    return { send: (type, dst, payload) => { if (ws.readyState === 1) ws.send(JSON.stringify({ type, dst, payload })); }, close: () => { fin = true; clearInterval(hb); try { ws.close(); } catch (e) { } } };
  }
  /* ---------- one data channel as a line transport (Net.connect: on/start/send/close) ---------- */
  function wrapDC(dc, pc) {
    const q = []; const parts = new Map(); let closed = false;
    const t = { h: {}, on(h) { t.h = h; while (q.length && t.h.line) t.h.line(q.shift()); }, start() { if (dc.readyState === 'open') queueMicrotask(() => t.h.open && t.h.open()); else dc.addEventListener('open', () => t.h.open && t.h.open()); },
      send(l) { if (dc.readyState !== 'open') return; if (l.length <= CH) { dc.send(l); return; } const id = Math.random().toString(36).slice(2, 8), n = Math.ceil(l.length / CH); for (let i = 0; i < n; i++) dc.send('\u0001' + id + ':' + i + ':' + n + ':' + l.slice(i * CH, (i + 1) * CH)); },
      close() { closed = true; try { dc.close(); } catch (e) { } try { pc.close(); } catch (e) { } } };
    dc.onmessage = e => { let l = String(e.data);
      if (l[0] === '\u0001') { const a = l.indexOf(':'), b = l.indexOf(':', a + 1), c = l.indexOf(':', b + 1); const id = l.slice(1, a), i = +l.slice(a + 1, b), n = +l.slice(b + 1, c); let p = parts.get(id); if (!p) parts.set(id, p = { n: 0, a: [] }); if (p.a[i] === undefined) p.n++; p.a[i] = l.slice(c + 1); if (p.n < n) return; parts.delete(id); l = p.a.join(''); }
      if (t.h.line) t.h.line(l); else q.push(l); };
    const fin = () => { if (closed) return; closed = true; if (t.h.close) t.h.close(); };
    dc.onclose = fin; pc.addEventListener('connectionstatechange', () => { const s = pc.connectionState; if (s === 'failed' || s === 'closed') fin(); else if (s === 'disconnected') setTimeout(() => { if (pc.connectionState === 'disconnected') fin(); }, 8000); });
    return t;
  }
  /* ---------- the host's in-browser relay: same rules as the LAN relay ---------- */
  function Hub(max) {
    const cl = new Map(); let next = 1, hostId = 0, state = 'lobby';
    const tx = (c, l) => { try { c.send(l); } catch (e) { } };
    const live = () => [...cl.values()].filter(c => c.ok);
    function recv(id, l) {
      const c = cl.get(id); if (!c || !l) return;
      if (l[0] === '#') { const f = l.split('|');
        if (f[0] === '#hello') { const wantHost = f[2] === '1';
          if (live().length >= max) { tx(c, '#full'); return; } if (!wantHost && !hostId) { tx(c, '#nohost'); return; } if (!wantHost && state === 'ingame') { tx(c, '#busy'); return; }
          if (wantHost) hostId = id; c.ok = true; c.name = (f[1] || 'لاعب').slice(0, 18);
          tx(c, '#welcome|' + id + '|' + hostId + '|' + JSON.stringify(live().map(x => ({ id: x.id, name: x.name }))));
          for (const o of live()) if (o !== c) tx(o, '#join|' + id + '|' + c.name); return; }
        if (f[0] === '#state') state = f[1] === 'ingame' ? 'ingame' : 'lobby'; else if (f[0] === '#ping') tx(c, '#pong');
        return; }
      if (!c.ok) return; const bar = l.indexOf('|'); if (bar < 0) return; const to = l.slice(0, bar), out = id + '|' + l.slice(bar + 1);
      if (to === 'h') { const hc = cl.get(hostId); if (hc && hc !== c) tx(hc, out); }
      else if (to === '*') { const gs = new Set(); for (const o of live()) if (o !== c) { if (o.grp) gs.add(o.grp); else tx(o, out); } for (const g of gs) g.bcast(out, c.grp === g ? c.id : 0); }
      else { const o = cl.get(+to); if (o && o.ok) tx(o, out); }
    }
    function drop(id) { const c = cl.get(id); if (!c) return; cl.delete(id); if (!c.ok) return; if (id === hostId) { hostId = 0; for (const o of live()) tx(o, '#hostleft'); } else for (const o of live()) tx(o, '#leave|' + id); }
    function attach(send, close, grp) { const id = next++; cl.set(id, { id, send, close, ok: false, name: '', grp: grp || null }); return id; } // grp: relay guests sharing one broker (js/net/relay.js)
    return { attach, recv, drop, closeAll() { for (const c of cl.values()) try { c.close && c.close(); } catch (e) { } cl.clear(); }, get n() { return live().length; }, get state() { return state; } };
  }
  /* ---------- hosting: the room is reachable directly (PeerJS signalling) and through the relay at the same time ---------- */
  let room = null; // { code, sig, rel, hub, peers: Map(src → {pc, pend, ready}) }
  const hasRelay = () => typeof Relay !== 'undefined' && Relay.supported();
  function host() {
    return new Promise((res, rej) => {
      let tries = 0, settled = false; const hub = Hub(6);
      const attempt = () => {
        const code = code5(); const r = { code, sig: null, rel: null, hub, peers: new Map() }; let sigDown = false, relDown = !hasRelay();
        const ready = () => { if (settled) return; settled = true; room = r; res({ code, t: loopback(hub) }); };
        const down = () => { if (settled || !sigDown || !relDown) return; settled = true; if (r.rel) r.rel.close(); rej(new Error('nosignal')); };
        r.sig = signal(PFX() + code, {
          open: ready,
          error: e => {
            if (e === 'taken' && !settled && ++tries < 6) { if (r.rel) r.rel.close(); attempt(); return; } // code already used: pick another
            sigDown = true; if (settled) keepSignal(r); else down();
          },
          msg: (type, src, p) => { if (room === r) onHostSignal(type, src, p); },
          lost: () => { if (room === r) keepSignal(r); }, // players already inside stay connected
        });
        if (hasRelay()) r.rel = Relay.host(code, hub, { open: ready, error: () => { relDown = true; down(); } });
      };
      attempt();
    });
  }
  // the signalling socket dropped (network change, screen off): register the same code again so new players can still find the room
  function keepSignal(r) {
    if (r.reT || room !== r) return; const n = r.reN = (r.reN || 0) + 1;
    r.reT = setTimeout(() => { r.reT = 0; if (room !== r) return;
      const sig = signal(PFX() + r.code, { open: () => { r.reN = 0; }, error: () => keepSignal(r), msg: (type, src, p) => { if (room === r && r.sig === sig) onHostSignal(type, src, p); }, lost: () => keepSignal(r) });
      r.sig = sig; }, Math.min(20000, 1500 * Math.pow(2, n - 1)));
  }
  function onHostSignal(type, src, p) {
    const r = room;
    if (type === 'OFFER') {
      if (!window.RTCPeerConnection) { r.sig.send('ANSWER', src, { err: 'nortc' }); return; } // the guest falls back to the relay
      if (p.v !== NET_VER) { r.sig.send('ANSWER', src, { err: 'ver' }); return; }
      if (r.hub.state === 'ingame') { r.sig.send('ANSWER', src, { err: 'busy' }); return; } if (r.hub.n >= 6) { r.sig.send('ANSWER', src, { err: 'full' }); return; }
      const pc = new RTCPeerConnection(iceCfg()); const q = { pc, pend: [], ready: false }; r.peers.set(src, q);
      pc.onicecandidate = e => { if (e.candidate) r.sig.send('CANDIDATE', src, { c: e.candidate.toJSON() }); };
      pc.ondatachannel = e => { const dc = e.channel; const t = wrapDC(dc, pc); const go = () => { const id = r.hub.attach(l => t.send(l), () => t.close()); t.on({ line: l => r.hub.recv(id, l), close: () => { r.hub.drop(id); r.peers.delete(src); } }); }; if (dc.readyState === 'open') go(); else dc.addEventListener('open', go); };
      pc.setRemoteDescription(p.sdp).then(() => pc.createAnswer()).then(a => pc.setLocalDescription(a)).then(() => { r.sig.send('ANSWER', src, { sdp: pc.localDescription.toJSON() }); q.ready = true; for (const c of q.pend) pc.addIceCandidate(c).catch(() => { }); q.pend.length = 0; }).catch(e => console.warn('rtc', e));
    } else if (type === 'CANDIDATE') { const q = r.peers.get(src); if (!q || !p.c) return; if (q.ready) q.pc.addIceCandidate(p.c).catch(() => { }); else q.pend.push(p.c); }
  }
  // the host's own Net connection talks to its relay directly
  function loopback(hub) {
    let id = 0; const t = { h: {}, on(h) { t.h = h; },
      start() { id = hub.attach(l => queueMicrotask(() => t.h.line && t.h.line(l)), () => { }); queueMicrotask(() => t.h.open && t.h.open()); },
      send(l) { queueMicrotask(() => hub.recv(id, l)); },
      close() { hub.drop(id); const r = room; room = null; if (r) { clearTimeout(r.reT); setTimeout(() => { try { r.sig.close(); } catch (e) { } for (const q of r.peers.values()) try { q.pc.close(); } catch (e) { } r.hub.closeAll(); setTimeout(() => { try { r.rel && r.rel.close(); } catch (e) { } }, 150); }, 400); } } };
    return t;
  }
  /* ---------- joining: direct link first, the relay 2 s later (or at once if the direct path fails); the first to open wins ---------- */
  const HARD = { ver: 1, busy: 1, full: 1 }; // the host itself refused: no point trying another path
  function join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return new Promise((res, rej) => {
      if (code.length !== 5) { rej(new Error('code')); return; }
      let done = false, relT = 0, rel = null; const tries = [], errs = [];
      const pick = () => errs.indexOf('noroom') >= 0 ? 'noroom' : errs.length && errs.every(e => e === 'nosignal') ? 'nosignal' : 'timeout';
      const end = e => { if (done) return; done = true; clearTimeout(tm); clearTimeout(relT); for (const x of tries) x.cancel(); rej(new Error(e)); };
      const win = t => { if (done) { try { t.close(); } catch (e) { } return; } done = true; clearTimeout(tm); clearTimeout(relT); for (const x of tries) x.cancel(t); res(t); };
      const lose = e => { if (done) return; errs.push(e); if (HARD[e]) { end(e); return; } if (!rel && hasRelay()) startRelay(); else if (tries.every(x => x.dead)) end(pick()); };
      const startRelay = () => { if (rel || done) return; clearTimeout(relT); rel = Relay.join(code, { open: win, error: e => { rel.dead = true; lose(e); } }); tries.push(rel); };
      const tm = setTimeout(() => end(pick()), 16000);
      const p2p = window.RTCPeerConnection ? direct(code, { open: win, error: e => { p2p.dead = true; lose(e); } }) : null;
      if (p2p) tries.push(p2p); if (hasRelay()) { if (p2p) relT = setTimeout(startRelay, 2000); else startRelay(); } else if (!p2p) end('nortc');
    });
  }
  function direct(code, h) { // the WebRTC data channel to the host · returns { t, dead, cancel(winner) }
    const hostId = PFX() + code, me = hostId + '-' + Math.random().toString(36).slice(2, 8); let pc = null, sig = null, fin = false, ready = false; const pend = [];
    const a = { t: null, dead: false, cancel(w) { if (w && w === a.t) return; if (fin) return; fin = true; try { sig && sig.close(); } catch (x) { } try { pc && pc.close(); } catch (x) { } } };
    const fail = e => { if (fin) return; fin = true; try { sig && sig.close(); } catch (x) { } try { pc && pc.close(); } catch (x) { } h.error(e); };
    sig = signal(me, {
      open: () => {
        pc = new RTCPeerConnection(iceCfg()); const dc = pc.createDataChannel('tw', { ordered: true });
        pc.onicecandidate = e => { if (e.candidate) sig.send('CANDIDATE', hostId, { c: e.candidate.toJSON() }); };
        pc.addEventListener('connectionstatechange', () => { if (pc.connectionState === 'failed') fail('rtc'); });
        dc.addEventListener('open', () => { if (fin) return; fin = true; setTimeout(() => sig.close(), 4000); a.t = wrapDC(dc, pc); h.open(a.t); });
        pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => sig.send('OFFER', hostId, { sdp: pc.localDescription.toJSON(), v: NET_VER })).catch(() => fail('rtc'));
      },
      error: e => fail(e),
      msg: (type, src, p) => { if (src !== hostId || fin) return;
        if (type === 'ANSWER') { if (p.err) { fail(p.err); return; } pc.setRemoteDescription(p.sdp).then(() => { ready = true; for (const c of pend) pc.addIceCandidate(c).catch(() => { }); pend.length = 0; }).catch(() => fail('rtc')); }
        else if (type === 'CANDIDATE' && p.c) { if (ready) pc.addIceCandidate(p.c).catch(() => { }); else pend.push(p.c); } },
      gone: src => { if (src === hostId) fail('noroom'); },
    });
    return a;
  }
  return { host, join, get code() { return room && room.code; }, supported: () => !!((window.RTCPeerConnection || hasRelay()) && window.WebSocket) };
})();
