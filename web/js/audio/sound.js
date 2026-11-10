/* ============================================================
   War of Power — محرك الصوت: تشغيل الأصوات والموسيقى
   الملف: js/audio/sound.js   ·   ترتيب التحميل: 30 من 43
   ============================================================ */
'use strict';
/* ===== Audio engine: recorded samples (17a) + streamed music (17b) + synth fallback (17) =====
   Mix: master -> limiter
          sfx bus  (weapons, explosions, engines)  + short outdoor reverb send
          ui bus   (mechanical clicks, radio)
          music    (HTMLAudio playlist, ducked under heavy combat, quieter in battle)
          ambience (one bed per map + sea, only inside a match)                      */
const SND = (function () {
  let ctx = null, master, sfxBus, uiBus, musBus, musDuck, ambBus, ambDuck, comp, verb, verbSend;
  let ready = false, unlocked = false, started = false;
  const BUF = {}; const LOOPM = {}; const voices = {}; let active = 0; const loops = {};
  const HAS = typeof SAMPLES !== 'undefined' ? SAMPLES : {}; const META = typeof SAMPLE_META !== 'undefined' ? SAMPLE_META : {};
  const LIMIT = { rifle: 7, mg: 6, hmg: 5, auto: 5, aagun: 5, chain: 4, sniper: 3, cannon: 4, cannonM: 3, how: 3, expS: 5, expM: 4, expL: 3, expXL: 3, mega: 2, mlrs: 3, rpg: 3, atgm: 3, rkt: 3, sam: 3, vls: 2, hitArmor: 4, hammer: 2, weld: 1, dig: 2, pour: 1, roller: 1, drill: 1, ratchet: 1, tools: 1, crush: 2, cookoff: 2, infDie: 2, clank: 2, ciws: 2, mortar: 3, splash: 4, splashL: 2, board: 2, unload: 2, catapult: 2, reinforce: 2, bomb: 3, tick: 3, tab: 2, click: 3, servo: 2, radio: 1, radioOff: 1, vehDie: 3, vehDieH: 2, collapse: 2, airburst: 3, aps: 2, gmg: 3, beep: 2 };
  // recorded clips are pre-levelled by tools/audio_make.py, so their gains are near 1; synth fallbacks keep their own table
  const GAIN = { rifle: 0.8, mg: 0.8, hmg: 0.85, sniper: 0.85, auto: 0.85, aagun: 0.8, chain: 0.8, gmg: 0.8, cannon: 1, cannonM: 0.95, how: 1, rpg: 0.9, atgm: 0.9, rkt: 0.85, mlrs: 0.9, sam: 0.95, vls: 0.95, ciws: 0.8, mortar: 0.9, expS: 0.9, expM: 1, expL: 1, expXL: 1, mega: 1.1, airburst: 0.85, hitArmor: 0.8, cookoff: 0.8, vehDie: 1, vehDieH: 1, collapse: 0.95, infDie: 0.55, clank: 0.6, crush: 0.7, aps: 0.85, beep: 0.5, dig: 0.6, hammer: 0.55, weld: 0.45, pour: 0.5, roller: 0.55, drill: 0.45, ratchet: 0.5, tools: 0.5, splash: 0.85, splashL: 1, board: 0.8, unload: 0.8, servo: 0.5, bomb: 0.5, catapult: 0.8, reinforce: 0.9, jetPass: 0.9 };
  const SYN_GAIN = { bomb: 0.5, catapult: 0.8, reinforce: 0.9, jetPass: 0.9 };
  const HEAVY = { cannon: 1, cannonM: 0.6, how: 1.2, expM: 0.7, expL: 1, expXL: 1.4, mega: 3, vehDie: 0.8, vehDieH: 1.1, collapse: 1, mlrs: 0.5, sam: 0.6, vls: 0.7, airburst: 0.5, splashL: 0.7 };
  function init() {
    if (ctx) return true; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { return false; } }
    master = ctx.createGain(); comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.25;
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); uiBus = ctx.createGain(); musBus = ctx.createGain(); musDuck = ctx.createGain(); ambBus = ctx.createGain(); ambDuck = ctx.createGain();
    sfxBus.connect(master); uiBus.connect(master); musDuck.connect(musBus); musBus.connect(master); ambDuck.connect(ambBus); ambBus.connect(master);
    try { verb = ctx.createConvolver(); verb.buffer = makeIR(1.6); verbSend = ctx.createGain(); verbSend.gain.value = 0.16; verbSend.connect(verb); verb.connect(sfxBus); } catch (e) { verb = null; verbSend = null; }
    applyVolumes(); return true;
  }
  function makeIR(sec) { const n = Math.floor(ctx.sampleRate * sec); const b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const t = i / n; lp = lp * 0.55 + (Math.random() * 2 - 1) * 0.45; d[i] = lp * Math.pow(1 - t, 3) * (i < 400 ? i / 400 : 1); } } return b; }
  function applyVolumes() { if (!ctx) return; master.gain.value = Settings.master; sfxBus.gain.value = Settings.sfx; uiBus.gain.value = Math.min(1, Settings.sfx * 0.85 + 0.15); musBus.gain.value = Settings.music * 0.62; ambBus.gain.value = Settings.amb * 0.55; }
  function unlock() {
    if (!init()) return; if (ctx.state === 'suspended') ctx.resume().then(() => Music.kick()).catch(() => { });
    if (!unlocked) { unlocked = true; try { const b = ctx.createBuffer(1, 1, ctx.sampleRate); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) { } }
    if (!started) { started = true; loadSamples(); startSynth(); Music.prime(); }
    Music.kick();
  }
  // ---------------------------------------------------------------- recorded samples
  function b64buf(s) { const bin = atob(s); const n = bin.length; const u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function decode(ab) { return new Promise((res, rej) => { let done = false; try { const p = ctx.decodeAudioData(ab, b => { done = true; res(b); }, e => { if (!done) rej(e); }); if (p && p.then) p.then(b => { if (!done) { done = true; res(b); } }, e => { if (!done) rej(e); }); } catch (e) { rej(e); } }); }
  const FIRST = ['click', 'tab', 'tick', 'radio', 'radioOff', 'place', 'built', 'ready', 'nomoney', 'buy', 'rifle', 'mg', 'cannon', 'expS', 'expM', 'expL', 'hitArmor', 'rpg', 'atgm', 'engT', 'engW'];
  function loadSamples() {
    const keys = FIRST.filter(k => HAS[k]).concat(Object.keys(HAS).filter(k => !FIRST.includes(k)));
    let i = 0;
    const next = () => {
      if (i >= keys.length) { ready = true; return; }
      const k = keys[i++]; const list = HAS[k];
      Promise.all(list.map(s => decode(b64buf(s)).catch(() => null))).then(bs => { bs = bs.filter(Boolean); if (bs.length) { BUF[k] = bs; if (META[k]) LOOPM[k] = META[k]; } if (i >= 3) ready = true; setTimeout(next, 0); });
    };
    for (let c = 0; c < 3; c++) next();
  }
  // ---------------------------------------------------------------- synth fallback (only keys without a recording)
  function startSynth() {
    const sr = ctx.sampleRate; const W = SYNTH_WORKER; const want = W().keys.filter(k => !HAS[k] && !['battleLoop', 'siteLoop', 'windLoop'].includes(k));
    if (!want.length) return;
    const accept = out => { for (const k in out) { const v = out[k]; if (!v || BUF[k]) continue; BUF[k] = v.map(a => { const b = ctx.createBuffer(1, a.length, sr); b.copyToChannel ? b.copyToChannel(a, 0) : b.getChannelData(0).set(a); return b; }); } };
    try {
      const src = 'const W=(' + W.toString() + ')();self.onmessage=e=>{const o=W.generate(e.data.sr,e.data.list);const tr=[];for(const k in o){const v=o[k];if(!v)continue;for(const a of v)tr.push(a.buffer);}self.postMessage(o,tr);};';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' })); const w = new Worker(url); w.onmessage = e => accept(e.data); w.onerror = () => { try { accept(W().generate(sr, want)); } catch (e) { } };
      w.postMessage({ sr, list: want });
    } catch (e) { setTimeout(() => { try { accept(W().generate(sr, want)); } catch (e2) { } }, 50); }
  }
  // ---------------------------------------------------------------- one-shots
  let heat = 0;
  function play(key, opts) {
    if (!ctx || ctx.state !== 'running') return; const arr = BUF[key]; if (!arr || !arr.length) return;
    const lim = LIMIT[key] || 4; voices[key] = voices[key] || 0; if (voices[key] >= lim || active > 40) return;
    const b = arr[(Math.random() * arr.length) | 0]; const s = ctx.createBufferSource(); s.buffer = b;
    const rec = !!HAS[key]; s.playbackRate.value = (opts.rate || 1) * (rec ? 0.965 + Math.random() * 0.07 : 0.94 + Math.random() * 0.12);
    const g = ctx.createGain(); g.gain.value = (opts.vol === undefined ? 1 : opts.vol) * (rec ? (GAIN[key] || 0.8) : (SYN_GAIN[key] || GAIN[key] || 0.5)); let node = g; s.connect(g);
    if (opts.pan !== undefined && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(opts.pan, -1, 1); g.connect(p); node = p; }
    if (opts.lp && opts.lp < 16000) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.lp; f.Q.value = 0.5; node.connect(f); node = f; }
    node.connect(opts.bus || sfxBus); if (verbSend && opts.verb) { const vs = ctx.createGain(); vs.gain.value = opts.verb; node.connect(vs); vs.connect(verbSend); }
    voices[key]++; active++; s.onended = () => { voices[key]--; active--; try { s.disconnect(); g.disconnect(); } catch (e) { } };
    try { s.start(0); } catch (e) { voices[key]--; active--; }
  }
  // world sounds: distance attenuation, pan, air absorption (low-pass) and a little more reverb when far
  function spatial(key, x, y, k) {
    if (!ctx || typeof R === 'undefined' || !R.cam) return; const cam = R.cam; const hw = R.cssW / 2 / cam.z, hh = R.cssH / 2 / cam.z;
    const dx = (x - cam.x) / Math.max(200, hw), dy = (y - cam.y) / Math.max(200, hh); const d = Math.hypot(dx, dy);
    const big = HEAVY[key] || 0; if (d > (big ? 5 : 3.6)) return;
    let vol = 1 / (1 + Math.max(0, d - 0.55) * (big ? 1.0 : 1.5)); vol *= clamp(0.55 + 0.45 * cam.z, 0.5, 1.12) * (k || 1);
    const lp = d > 1.1 ? 15000 / (1 + (d - 1.1) * 3.2) : 18000;
    if (big && vol > 0.25) heat += big * vol;
    play(key, { vol, pan: clamp(dx * 0.65, -0.85, 0.85), lp, verb: 0.25 + Math.min(0.55, d * 0.22) });
  }
  function shot(key, x, y) { if (key) spatial(key, x, y); }
  function at(key, x, y, k) { spatial(key, x, y, k); }
  const UIVOL = { click: 0.7, tab: 0.6, tick: 0.5, radio: 0.55, radioOff: 0.5 };
  let lastUi = {};
  function ui(key) { if (!ctx) return; const k = BUF[key] ? key : 'click'; const now = ctx.currentTime; if (lastUi[k] && now - lastUi[k] < 0.045) return; lastUi[k] = now; play(k, { vol: UIVOL[k] || 0.85, bus: uiBus }); }
  // ---------------------------------------------------------------- loops (engines / ambience)
  function loop(key, bus) {
    if (!ctx || !BUF[key]) return null; if (loops[key]) return loops[key];
    const s = ctx.createBufferSource(); s.buffer = BUF[key][0]; s.loop = true; const m = LOOPM[key];
    if (m) { s.loopStart = m.pad; s.loopEnd = m.pad + m.loop; }
    const g = ctx.createGain(); g.gain.value = 0; s.connect(g); g.connect(bus || sfxBus);
    try { s.start(0, m ? m.pad + Math.random() * m.loop * 0.9 : 0); } catch (e) { return null; }
    loops[key] = { s, g, v: 0, bus }; return loops[key];
  }
  function setLoop(key, vol, rate, bus) { if (!ctx) return; if (!loops[key] && vol < 0.002) return; const l = loop(key, bus); if (!l) return; const t = ctx.currentTime; if (Math.abs(l.v - vol) > 0.002) l.g.gain.setTargetAtTime(vol, t, 0.3); if (rate) l.s.playbackRate.setTargetAtTime(rate, t, 0.4); l.v = vol; }
  // ---------------------------------------------------------------- music (streamed from embedded MP3s through <audio>)
  const Music = (function () {
    const DATA = typeof MUSIC_DATA !== 'undefined' ? MUSIC_DATA : {}; const urls = {}; const tracks = {};
    let kind = '', want = '', cur = null, list = [], idx = 0, level = 1, primed = false;
    function url(k) { if (urls[k]) return urls[k]; if (!DATA[k]) return null; try { urls[k] = URL.createObjectURL(new Blob([b64buf(DATA[k])], { type: 'audio/mpeg' })); } catch (e) { urls[k] = null; } return urls[k]; }
    function track(k) {
      if (tracks[k]) return tracks[k]; const u = url(k); if (!u) return null;
      const a = new Audio(); a.preload = 'auto'; a.src = u; a.loop = k === 'menu'; let g = null;
      try { if (ctx && ctx.createMediaElementSource) { const src = ctx.createMediaElementSource(a); g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(musDuck); } } catch (e) { g = null; }
      const t = { k, a, g, vol: 0 }; a.addEventListener('ended', () => { if (cur === t && kind === 'battle') nextBattle(); });
      a.addEventListener('timeupdate', () => { if (cur === t && kind === 'battle' && a.duration && a.duration - a.currentTime < 2.5) nextBattle(); });
      tracks[k] = t; return t;
    }
    function fade(t, v, sec) { if (!t) return; t.vol = v; if (t.g && ctx) { t.g.gain.cancelScheduledValues(ctx.currentTime); t.g.gain.setTargetAtTime(v, ctx.currentTime, Math.max(0.05, sec / 3)); } else { const a = t.a, from = a.volume, t0 = performance.now(); const st = () => { const f = Math.min(1, (performance.now() - t0) / (sec * 1000)); a.volume = clamp(from + (v * (Settings.music || 0) * 0.62 - from) * f, 0, 1); if (f < 1) requestAnimationFrame(st); }; st(); } }
    function start(t, v) { if (!t) return; cur = t; try { const p = t.a.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { } fade(t, v, 1.6); }
    function stopT(t, sec) { if (!t) return; fade(t, 0, sec); setTimeout(() => { if (cur !== t) { try { t.a.pause(); } catch (e) { } } }, sec * 1000 + 300); }
    function nextBattle() { if (!list.length) return; const old = cur; idx = (idx + 1) % list.length; const t = track(list[idx]); if (!t || t === old) return; try { t.a.currentTime = 0; } catch (e) { } stopT(old, 3); start(t, level); }
    function play(k) {
      want = k; if (!ctx || ctx.state !== 'running') return; if (kind === k && cur) return;
      const old = cur; kind = k;
      if (k === 'menu') { level = 1; const t = track('menu'); if (old && old !== t) stopT(old, 1.4); if (t) { if (old !== t) { try { t.a.currentTime = 0; } catch (e) { } } start(t, level); } }
      else if (k === 'battle') { level = 0.55; list = ['b1', 'b2', 'b3'].filter(x => DATA[x]); for (let i = list.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [list[i], list[j]] = [list[j], list[i]]; } idx = 0; const t = track(list[0]); if (old && old !== t) stopT(old, 1.8); if (t) { try { t.a.currentTime = 0; } catch (e) { } start(t, level); } }
      else { if (old) stopT(old, 1.2); cur = null; }
    }
    function stop(sec) { const old = cur; kind = ''; want = ''; cur = null; if (old) stopT(old, sec || 1.2); }
    function prime() { if (primed) return; primed = true; for (const k of ['menu']) track(k); }
    function kick() { if (want && (kind !== want || !cur)) { kind = ''; play(want); } else if (cur && cur.a.paused && ctx && ctx.state === 'running') { try { const p = cur.a.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { } } }
    function pause(on) { for (const k in tracks) { const t = tracks[k]; if (on) { try { t.a.pause(); } catch (e) { } } } if (!on && cur) { try { const p = cur.a.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { } } }
    
    return { play, stop, prime, kick, pause,  get kind() { return kind; }, get has() { return Object.keys(DATA).length > 0; }, get cur() { return cur && cur.k; } };
  })();
  function playMusic(k) { if (!ctx) { Music.play(k); return; } Music.play(k); if (k !== 'battle') ambient(null); }
  
  // ---------------------------------------------------------------- ambience: one bed per map (only in a match)
  let bedKey = null;
  function ambient(theme) {
    const want = theme == null ? null : (theme === 'desert' || theme === 'steppe') ? 'bedWind' : (theme === 'snow' || theme === 'mountain') ? 'bedSnow' : 'bedForest';
    for (const k of ['bedWind', 'bedForest', 'bedSnow']) if (k !== want && loops[k]) setLoop(k, 0, 0, ambDuck);
    bedKey = want;
  }
  // ---------------------------------------------------------------- per-frame mix
  let duck = 1, lastF = 0;
  function frame(G) {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime; const dt = Math.min(0.1, Math.max(0, now - (lastF || now))); lastF = now;
    if (!G) { for (const k in loops) setLoop(k, 0); heat = 0; bedKey = null; return; }
    if (!bedKey && G.map) ambient(G.map.theme || 'temperate');
    const [x0, y0, x1, y1] = R.viewRect(200); let tr = 0, wh = 0, he = 0, dr = 0, inf = 0;
    for (const u of G.units) {
      if (u.dead || u.x < x0 || u.x > x1 || u.y < y0 || u.y > y1) continue; if (!G.visibleTo(G.local, u.x, u.y)) continue; const mv = Math.min(1, u.spd / Math.max(1, u.def.speed)); const d = u.def;
      if (d.fly === 'heli') he += 1; else if (d.fly === 'drone') dr += 0.6; else if (d.fly) { } else if (d.cls === 'veh') { if (d.mob === 'wheel') wh += 0.15 + mv * 0.85; else tr += 0.2 + mv * 0.8; } else if (d.cls === 'inf' && mv > 0.2) inf += 1;
    }
    const z = clamp(R.cam.z, 0.4, 1.5); const k = 0.5 + 0.5 * z;
    setLoop('engT', Math.min(0.55, tr * 0.1) * k, 0.92 + Math.min(0.2, tr * 0.015)); setLoop('engW', Math.min(0.42, wh * 0.08) * k, 0.95 + Math.min(0.15, wh * 0.02)); setLoop('heli', Math.min(0.62, he * 0.26) * k); setLoop('drone', Math.min(0.28, dr * 0.18) * k);
    setLoop('march', Math.min(0.3, inf * 0.03) * k);
    { const m = G.map; let wn = 0; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) * 0.35, hh = (y1 - y0) * 0.35; for (let a = -1; a <= 1; a++) for (let b2 = -1; b2 <= 1; b2++) { const tx = Math.floor((cx + a * hw) / TILE), ty = Math.floor((cy + b2 * hh) / TILE); if (m.inb(tx, ty) && (m.pass[ty * m.w + tx] & PASS.WATER)) wn++; } setLoop('seaLoop', wn / 9 * 0.5, 0, ambDuck); }
    if (bedKey) setLoop(bedKey, 0.5, 0, ambDuck);
    // duck music + ambience under heavy fire so explosions stay clear and nothing piles up
    heat = Math.max(0, heat - dt * (0.9 + heat * 0.35)); const target = 1 - Math.min(0.55, heat * 0.12);
    if (Math.abs(target - duck) > 0.02) { duck = target; musDuck.gain.setTargetAtTime(duck, now, duck < 0.9 ? 0.12 : 1.2); ambDuck.gain.setTargetAtTime(0.6 + duck * 0.4, now, 0.6); }
  }
  function suspend(on) { if (!ctx) return; if (on) { Music.pause(true); ctx.suspend().catch(() => { }); } else if (unlocked) { ctx.resume().then(() => Music.pause(false)).catch(() => { }); } }
  function stinger(win) { Music.stop(0.6); setTimeout(() => ui(win ? 'victory' : 'defeat'), 350); }
  return { unlock, play, shot, at, ui, frame, playMusic,  stinger,  applyVolumes, suspend,  get ready() { return ready; }, get ctx() { return ctx; } };
})();
