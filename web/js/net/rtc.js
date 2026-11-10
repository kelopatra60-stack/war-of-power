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
     so the lobby and the deterministic lockstep in net.js work unchanged over WebRTC. */
const NET_SIGNAL = { host: '0.peerjs.com', port: 443, path: '/', key: 'peerjs', secure: true };
// STUN finds each phone's public address. Some strict mobile networks also need a TURN relay — add it here if you have one.
const NET_ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }];
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
      else if (to === '*') { for (const o of live()) if (o !== c) tx(o, out); }
      else { const o = cl.get(+to); if (o && o.ok) tx(o, out); }
    }
    function drop(id) { const c = cl.get(id); if (!c) return; cl.delete(id); if (!c.ok) return; if (id === hostId) { hostId = 0; for (const o of live()) tx(o, '#hostleft'); } else for (const o of live()) tx(o, '#leave|' + id); }
    function attach(send, close) { const id = next++; cl.set(id, { id, send, close, ok: false, name: '' }); return id; }
    return { attach, recv, drop, closeAll() { for (const c of cl.values()) try { c.close && c.close(); } catch (e) { } cl.clear(); }, get n() { return live().length; }, get state() { return state; } };
  }
  /* ---------- hosting ---------- */
  let room = null; // { code, sig, hub, peers: Map(src → {pc, pend, ready}) }
  function host() {
    return new Promise((res, rej) => {
      let tries = 0; const hub = Hub(6);
      const attempt = () => { const code = code5(); let ok = false;
        const sig = signal(PFX() + code, {
          open: () => { ok = true; room = { code, sig, hub, peers: new Map() }; res({ code, t: loopback(hub) }); },
          error: e => { if (e === 'taken' && ++tries < 6) { attempt(); return; } if (!ok) rej(new Error(e)); },
          msg: (type, src, p) => { if (room && room.sig === sig) onHostSignal(type, src, p); },
          lost: () => { if (room && room.sig === sig) room.sigLost = true; }, // players already inside stay connected
        }); };
      attempt();
    });
  }
  function onHostSignal(type, src, p) {
    const r = room;
    if (type === 'OFFER') {
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
      close() { hub.drop(id); const r = room; room = null; if (r) setTimeout(() => { try { r.sig.close(); } catch (e) { } for (const q of r.peers.values()) try { q.pc.close(); } catch (e) { } r.hub.closeAll(); }, 400); } };
    return t;
  }
  /* ---------- joining ---------- */
  function join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return new Promise((res, rej) => {
      if (code.length !== 5) { rej(new Error('code')); return; }
      const hostId = PFX() + code, me = hostId + '-' + Math.random().toString(36).slice(2, 8); let pc = null, sig = null, done = false, ready = false; const pend = [];
      const fail = e => { if (done) return; done = true; clearTimeout(tm); try { sig && sig.close(); } catch (x) { } try { pc && pc.close(); } catch (x) { } rej(new Error(e)); };
      const tm = setTimeout(() => fail('timeout'), 20000);
      sig = signal(me, {
        open: () => {
          pc = new RTCPeerConnection(iceCfg()); const dc = pc.createDataChannel('tw', { ordered: true });
          pc.onicecandidate = e => { if (e.candidate) sig.send('CANDIDATE', hostId, { c: e.candidate.toJSON() }); };
          dc.addEventListener('open', () => { if (done) return; done = true; clearTimeout(tm); setTimeout(() => sig.close(), 4000); res(wrapDC(dc, pc)); });
          pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => sig.send('OFFER', hostId, { sdp: pc.localDescription.toJSON(), v: NET_VER })).catch(() => fail('rtc'));
        },
        error: e => fail(e),
        msg: (type, src, p) => { if (src !== hostId || done) return;
          if (type === 'ANSWER') { if (p.err) { fail(p.err); return; } pc.setRemoteDescription(p.sdp).then(() => { ready = true; for (const c of pend) pc.addIceCandidate(c).catch(() => { }); pend.length = 0; }).catch(() => fail('rtc')); }
          else if (type === 'CANDIDATE' && p.c) { if (ready) pc.addIceCandidate(p.c).catch(() => { }); else pend.push(p.c); } },
        gone: src => { if (src === hostId) fail('noroom'); },
      });
    });
  }
  return { host, join, get code() { return room && room.code; }, supported: () => !!(window.RTCPeerConnection && window.WebSocket) };
})();
