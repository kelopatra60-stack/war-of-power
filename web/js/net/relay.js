/* ============================================================
   War of Power — اللعب أونلاين عبر وسيط (عندما يتعذّر الاتصال المباشر بين الجهازين)
   الملف: js/net/relay.js   ·   يُحمَّل بعد js/net/rtc.js وقبل js/net/lobby.js
   ============================================================ */
'use strict';
/* Why a relay: two phones on mobile data (most Syrian networks too) usually sit behind carrier-grade NAT, where a direct
   WebRTC link cannot open. Then the game talks through free public MQTT brokers over WebSocket instead — no account,
   no server of our own. The host listens on every broker at once; a guest asks on all of them and keeps the first broker
   where the host answers. The same lines as the direct link travel here (#hello/#welcome/…, lockstep bundles), so
   js/net/net.js does not see the difference.
   Topics (room code = the 5-letter code):   thank7you/wop/<CODE>/h        guests → host
                                             thank7you/wop/<CODE>/a        host → all guests on this broker (one stream)
                                             thank7you/wop/<CODE>/g/<gid>  host → one guest: accept / refuse / kick
                                             thank7you/wop/<CODE>/b        host gone (broker «will»)
   Messages:  guest → host  J|gid|ver (join) · M|gid|data · X|gid (leave)
              host → guest  O|hubId (accepted) · E|reason · X  on …/g/<gid>,   D|data on …/a
   The host sends everything for the guests of one broker as ONE ordered stream: a line for everybody is published once, not once
   per guest (6 players = 5× less upload for the host), and every item carries its address: =id (that guest) or *id (all but id).
   data = items joined by \u0002, batched every 40 ms; anything bigger than CH travels as \u0001id:i:n:part chunks.
   Public brokers are shared by everyone, so this is for friendly games: do not send anything private through the chat.
   A self-hosted broker can be listed first in NET_RELAY (or window.__twRelay for tests). */
const NET_RELAY = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081'];
const Relay = (function () {
  const TE = new TextEncoder(), TD = new TextDecoder();
  const SEP = '\u0002', TAG = '\u0003', CH = 12000, BATCH = 40, KEEP = 60, PING = 25000;
  const urls = () => window.__twRelay || NET_RELAY;
  const TOP = code => 'thank7you/wop/' + code; // no version here: the host answers a different version with E|ver
  const rid = n => { const r = crypto.getRandomValues(new Uint8Array(n)); let s = ''; for (const v of r) s += 'abcdefghijkmnpqrstuvwxyz23456789'[v % 32]; return s; };
  /* ---------- a tiny MQTT 3.1.1 client over WebSocket (QoS 0, clean session, optional last will) ---------- */
  function mqtt(url, o) { // o: { will: {t, p}, open(), msg(topic, text), close(wasOpen) }
    let ws = null, buf = new Uint8Array(0), up = false, dead = false, ka = 0, pid = 1; const acks = new Map();
    const str = s => { const b = TE.encode(s); const r = new Uint8Array(b.length + 2); r[0] = b.length >> 8; r[1] = b.length & 255; r.set(b, 2); return r; };
    const vlen = n => { const r = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; r.push(d); } while (n > 0); return r; };
    const pkt = (h, parts) => { let n = 0; for (const p of parts) n += p.length; const L = vlen(n); const r = new Uint8Array(1 + L.length + n); r[0] = h; r.set(L, 1); let i = 1 + L.length; for (const p of parts) { r.set(p, i); i += p.length; } return r; };
    const tx = b => { if (ws && ws.readyState === 1) try { ws.send(b); } catch (e) { } };
    const fin = () => { if (dead) return; dead = true; clearInterval(ka); try { ws && ws.close(); } catch (e) { } if (o.close) o.close(up); };
    try { ws = new WebSocket(url, ['mqtt']); } catch (e) { setTimeout(fin, 0); return { sub() { }, pub() { }, close() { } }; }
    ws.binaryType = 'arraybuffer';
    const tmo = setTimeout(() => { if (!up) fin(); }, 8000); // a broker that does not answer in time is skipped
    ws.onopen = () => {
      const parts = [str('MQTT'), new Uint8Array([4, 0x02 | (o.will ? 0x04 : 0), KEEP >> 8, KEEP & 255]), str('wop' + rid(10))];
      if (o.will) { parts.push(str(o.will.t)); parts.push(str(o.will.p)); }
      tx(pkt(0x10, parts));
    };
    ws.onmessage = e => { const d = new Uint8Array(e.data); const nb = new Uint8Array(buf.length + d.length); nb.set(buf); nb.set(d, buf.length); buf = nb; parse(); };
    ws.onerror = fin; ws.onclose = fin;
    function parse() {
      while (buf.length >= 2 && !dead) {
        let mul = 1, n = 0, i = 1, b;
        do { if (i >= buf.length) return; b = buf[i++]; n += (b & 127) * mul; mul *= 128; } while (b & 128);
        if (buf.length < i + n) return;
        const h = buf[0], body = buf.subarray(i, i + n); buf = buf.slice(i + n); const type = h >> 4;
        if (type === 2) { if (body[1] !== 0) { fin(); return; } up = true; clearTimeout(tmo); ka = setInterval(() => tx(new Uint8Array([0xC0, 0])), PING); if (o.open) o.open(); }
        else if (type === 3) { const tl = (body[0] << 8) | body[1]; let p = 2 + tl; if ((h >> 1) & 3) p += 2; if (o.msg) o.msg(TD.decode(body.subarray(2, 2 + tl)), TD.decode(body.subarray(p))); }
        else if (type === 9) { const id = (body[0] << 8) | body[1]; const cb = acks.get(id); acks.delete(id); if (cb) cb(); }
      }
    }
    return {
      sub(topic, cb) { const id = (pid++ & 0xffff) || 1; if (cb) acks.set(id, cb); tx(pkt(0x82, [new Uint8Array([id >> 8, id & 255]), str(topic), new Uint8Array([0])])); },
      pub(topic, s) { tx(pkt(0x30, [str(topic), TE.encode(s)])); },
      close() { tx(new Uint8Array([0xE0, 0])); setTimeout(fin, 60); }, // a clean DISCONNECT: the broker drops our will
    };
  }
  /* ---------- lines ⇄ messages: batching and chunking ---------- */
  function pipe(pub) {
    let q = [], n = 0, t = 0;
    const flush = () => { clearTimeout(t); t = 0; if (!q.length) return; const s = q.join(SEP); q = []; n = 0;
      if (s.length <= CH) { pub(s); return; } const id = rid(6), k = Math.ceil(s.length / CH); for (let i = 0; i < k; i++) pub('\u0001' + id + ':' + i + ':' + k + ':' + s.slice(i * CH, (i + 1) * CH)); };
    return { push(l) { l = String(l).split(SEP).join(' '); q.push(l); n += l.length; if (n >= CH) flush(); else if (!t) t = setTimeout(flush, BATCH); }, flush };
  }
  const clean = l => String(l).split(TAG).join(' ');
  function unpipe() {
    const parts = new Map();
    return s => {
      if (s[0] === '\u0001') { const a = s.indexOf(':'), b = s.indexOf(':', a + 1), c = s.indexOf(':', b + 1); const id = s.slice(1, a), i = +s.slice(a + 1, b), n = +s.slice(b + 1, c);
        let p = parts.get(id); if (!p) parts.set(id, p = { n: 0, a: [] }); if (p.a[i] === undefined) p.n++; p.a[i] = s.slice(c + 1); if (p.n < n) return []; parts.delete(id); s = p.a.join(''); }
      return s ? s.split(SEP) : [];
    };
  }
  /* ---------- host: listen for guests on every broker and plug them into the room's hub (js/net/rtc.js → Hub) ---------- */
  function host(code, hub, h) { // h: { open(), error(e) } — open when the first broker is listening
    const T = TOP(code); const guests = new Map(); const links = []; let any = false, fails = 0, closed = false;
    function onMsg(ln, s) {
      const k = s[0], a = s.indexOf('|', 2), gid = a < 0 ? s.slice(2) : s.slice(2, a), link = ln.link;
      if (!gid) return;
      if (k === 'J') {
        if (guests.has(gid)) return; const to = T + '/g/' + gid, ver = s.slice(a + 1);
        if (ver !== NET_VER) { link.pub(to, 'E|ver'); return; } if (hub.state === 'ingame') { link.pub(to, 'E|busy'); return; } if (hub.n >= 6) { link.pub(to, 'E|full'); return; }
        const g = { ln, rx: unpipe(), id: 0 };
        g.id = hub.attach(l => ln.out.push('=' + g.id + TAG + clean(l)), () => { ln.out.flush(); link.pub(to, 'X'); }, ln.grp);
        guests.set(gid, g); link.pub(to, 'O|' + g.id); return;
      }
      const g = guests.get(gid); if (!g || g.ln !== ln) return;
      if (k === 'M') { for (const l of g.rx(s.slice(a + 1))) hub.recv(g.id, l); }
      else if (k === 'X') { guests.delete(gid); hub.drop(g.id); }
    }
    function conn(i, url, back) {
      let ok = false; const ln = { link: null, out: null, grp: null };
      ln.out = pipe(x => ln.link.pub(T + '/a', 'D|' + x));
      ln.grp = { bcast: (l, except) => ln.out.push('*' + except + TAG + clean(l)) }; // one copy for every guest on this broker
      ln.link = mqtt(url, { will: { t: T + '/b', p: 'H' },
        open: () => ln.link.sub(T + '/h', () => { ok = true; back = 0; if (!any) { any = true; h.open(); } }),
        msg: (topic, s) => { if (topic === T + '/h') onMsg(ln, s); },
        close: () => {
          for (const [gid, g] of guests) if (g.ln === ln) { guests.delete(gid); hub.drop(g.id); }
          if (closed) return;
          if (!any && !ok && ++fails >= urls().length) { h.error('nosignal'); return; }
          if (ok || any) setTimeout(() => { if (!closed) links[i] = conn(i, url, Math.min(back + 1, 4)); }, 2000 * Math.pow(2, back)); // reconnect: 2 s, 4 s … 32 s
        } });
      return ln;
    }
    urls().forEach((u, i) => links.push(conn(i, u, 0)));
    return { close() { closed = true; for (const ln of links) try { ln.out.flush(); } catch (e) { } guests.clear(); for (const ln of links) try { ln.link.close(); } catch (e) { } } };
  }
  /* ---------- guest: ask the host on all brokers, keep the first that answers ---------- */
  function join(code, h) { // h: { open(transport), error(e) } · returns { t, dead, cancel(winner) }
    const T = TOP(code), gid = rid(8); const links = []; let won = null, fails = 0, quit = false, noT = 0;
    const a = { t: null, dead: false, cancel(w) { if (w && w === a.t) return; quit = true; clearTimeout(noT); for (const l of links) l.close(); } };
    const lose = e => { if (a.dead || won || quit) return; a.dead = true; clearTimeout(noT); for (const l of links) l.close(); h.error(e); };
    function transport(link, me) { // me: our id in the host's hub — items for "=me" and "*x" (x ≠ me, once we are welcomed) are ours
      const out = pipe(x => link.pub(T + '/h', 'M|' + gid + '|' + x)), rx = unpipe(), q = []; let shut = false, inRoom = false; const mine = '=' + me;
      const t = { h: {}, relay: true, // js/net/net.js starts a relayed guest with a larger smoothing buffer
        on(x) { t.h = x; while (q.length && t.h.line) t.h.line(q.shift()); },
        start() { queueMicrotask(() => { if (!shut && t.h.open) t.h.open(); }); },
        send(l) { if (!shut) out.push(l); },
        close() { if (shut) return; shut = true; out.flush(); link.pub(T + '/h', 'X|' + gid); link.close(); },
        rx(s) { for (const it of rx(s)) { const c = it.indexOf(TAG); if (c < 0) continue; const to = it.slice(0, c), l = it.slice(c + 1);
          if (to === mine) { if (l.indexOf('#welcome') === 0) inRoom = true; } else if (to[0] !== '*' || !inRoom || to === '*' + me) continue;
          if (t.h.line) t.h.line(l); else q.push(l); } },
        remote() { if (shut) return; shut = true; link.close(); if (t.h.close) t.h.close(); } };
      return t;
    }
    urls().forEach(url => {
      const link = mqtt(url, { will: { t: T + '/h', p: 'X|' + gid },
        open: () => link.sub(T + '/g/' + gid, () => link.sub(T + '/a', () => { link.sub(T + '/b'); link.pub(T + '/h', 'J|' + gid + '|' + NET_VER); if (!noT) noT = setTimeout(() => lose('noroom'), 6000); })),
        msg: (topic, s) => {
          if (topic === T + '/b') { if (s === 'H' && won === link && a.t) a.t.remote(); return; }
          if (won && won !== link) return;
          if (topic === T + '/a') { if (a.t && s.slice(0, 2) === 'D|') a.t.rx(s.slice(2)); return; }
          if (s.slice(0, 2) === 'O|') { if (won || a.dead || quit) return; won = link; clearTimeout(noT); for (const l of links) if (l !== link) l.close(); a.t = transport(link, +s.slice(2)); h.open(a.t); }
          else if (s.slice(0, 2) === 'E|') lose(s.slice(2));
          else if (s === 'X') { if (a.t) a.t.remote(); }
        },
        close: () => { if (won === link) { if (a.t) a.t.remote(); } else if (!won && !quit && ++fails >= urls().length) lose('nosignal'); } });
      links.push(link);
    });
    return a;
  }
  return { host, join, supported: () => typeof WebSocket !== 'undefined' && typeof TextEncoder !== 'undefined' };
})();
