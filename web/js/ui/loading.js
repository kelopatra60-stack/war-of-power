/* ============================================================
   War of Power — شاشة التحميل وتحديد مستوى الرسوميات تلقائياً
   الملف: js/ui/loading.js   ·   ترتيب التحميل: 37 من 43
   ============================================================ */
'use strict';
/* ===== Device profiling (automatic graphics tier, silent) + clean loading briefing ===== */
const Device = (function () {
  let info = null;
  function bench() { // short CPU probe: float math over a typed array (≈30 ms)
    const a = new Float32Array(4096); let x = 0, n = 0; const t0 = performance.now(); let t = t0;
    while (t - t0 < 30) { for (let i = 0; i < 4096; i++) { a[i] = Math.sin(i * 0.01 + x) * Math.sqrt(i + 1); x += a[i] * 1e-7; } n++; t = performance.now(); }
    return Math.round(n / Math.max(1, t - t0) * 1000) + (x > 1e9 ? 1 : 0);
  }
  function gpuTier(s) {
    s = String(s || '').toLowerCase(); if (!s) return { t: 1, n: 'غير معروف' };
    if (/swiftshader|llvmpipe|software|mesa offscreen/.test(s)) return { t: 0, n: 'رسوميات برمجية' };
    let m = s.match(/adreno[^0-9]*(\d{3})/); if (m) { const v = +m[1]; return { t: v >= 640 ? 3 : v >= 610 ? 2 : v >= 505 ? 1 : 0, n: 'Adreno ' + v }; }
    m = s.match(/mali-?g(\d{2,3})/); if (m) { const v = +m[1]; return { t: v >= 76 && v < 100 || v >= 610 ? 3 : v >= 57 ? 2 : 1, n: 'Mali-G' + v }; }
    if (/immortalis|xclipse/.test(s)) return { t: 3, n: s.includes('xclipse') ? 'Xclipse' : 'Immortalis' };
    if (/mali-?t|mali-?4/.test(s)) return { t: 0, n: 'Mali (قديم)' };
    if (/powervr|ge8|img/.test(s)) return { t: 1, n: 'PowerVR' };
    if (/apple/.test(s)) return { t: 3, n: 'Apple GPU' };
    if (/nvidia|geforce|rtx|gtx|quadro/.test(s)) return { t: 3, n: 'NVIDIA' };
    if (/radeon|amd/.test(s)) return { t: 3, n: 'AMD Radeon' };
    if (/iris|arc/.test(s)) return { t: 2, n: 'Intel Iris' };
    if (/intel/.test(s)) return { t: 1, n: 'Intel HD' };
    return { t: 1, n: String(s).slice(0, 22) };
  }
  function detect() {
    const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 0; const cpu = bench();
    let rs = ''; try { rs = (R.info() || {}).renderer || ''; } catch (e) { }
    const g = gpuTier(rs); const px = (screen.width || innerWidth) * (screen.height || innerHeight) * Math.pow(window.devicePixelRatio || 1, 2);
    let pts = 0; pts += cpu >= 26000 ? 2 : cpu >= 9000 ? 1 : cpu >= 4500 ? 0.3 : -0.5; pts += cores >= 8 ? 1 : cores >= 6 ? 0.5 : cores <= 2 ? -0.5 : 0;
    pts += mem ? (mem >= 6 ? 1 : mem >= 4 ? 0.5 : mem <= 2 ? -1 : 0) : 0.4; pts += [-1.5, 0.5, 1.2, 2][g.t]; if (px > 3.6e6 && g.t < 3) pts -= 0.5;
    const q = pts >= 4.2 ? 1 : pts >= 2.2 ? 0.8 : pts >= 0.9 ? 0.62 : 0.5; const lite = pts < 0.9 || (mem && mem <= 2) || g.t === 0 && cores <= 4; const tierN = q >= 1 ? 'عالية' : q >= 0.8 ? 'متوسطة' : q >= 0.6 ? 'منخفضة' : 'منخفضة جداً (وضع الأجهزة الضعيفة)';
    info = { cores, mem, cpu, gpu: g.n, gpuT: g.t, q, lite, tierN, pts: +pts.toFixed(1), line: cores + ' أنوية · ' + (mem ? 'ذاكرة ' + mem + 'GB · ' : '') + g.n + ' · أداء المعالج ' + Math.round(cpu / 100) };
    return info;
  }
  return { detect, get info() { return info; } };
})();
const Load = (function () {
  // cinematic briefing: the battle map behind a dark grade, the sides as flag plates around a VS shield,
  // one short status line and a thick progress bar. At start-up (no battle yet) a radar sweep replaces the plates.
  const $ = id => document.getElementById(id); let steps = [];
  function show(o) {
    o = o || {}; const L = $('loading'); if (!L) return; L.classList.remove('hid'); try { L.style.cssText = UI.kit.acv(o.ac || '#d6b05a'); } catch (e) { }
    $('lmode').textContent = o.mode || ''; $('lmap').textContent = (o.map || '').split(' · ')[0]; preview(o.prev || null); steps = o._steps || [];
    players(o.players || []); L.classList.toggle('boot', !o.mode); { const t = $('ltip'); if (t) { t.className = ''; t.textContent = o.mode ? (o.txt || '') : 'جارٍ التحميل'; } } prog(0);
  }
  function preview(url) { const bg = document.querySelector('#loading .ldbg'); if (bg) { bg.style.backgroundImage = url ? `url(${url})` : ''; bg.classList.toggle('on', !!url); } }
  function players(list) {
    const vs = $('lvs'); if (!vs) return; if (!list.length) { vs.innerHTML = ''; return; }
    const teams = []; const byT = {}; for (const p of list) { const k = p.team === undefined ? Math.random() : p.team; if (!byT[k]) { byT[k] = []; teams.push(byT[k]); } byT[k].push(p); }
    const esc = UI.kit.esc; let delay = 0.05;
    const plate = p => `<div class="ldp" style="animation-delay:${(delay += 0.08).toFixed(2)}s;--tc:${TEAMCOL[p.col % TEAMCOL.length]}"><div class="ldf">${EMBLEM[p.f] || ''}</div><b>${esc(p.name || FACTIONS[p.f].short)}</b>${(() => { const fs = FACTIONS[p.f].short; const c = [(p.name || fs) !== fs ? fs : '', p.sub || ''].filter(Boolean).join(' · '); return c ? '<span>' + esc(c) + '</span>' : ''; })()}</div>`;
    vs.innerHTML = teams.map(t => `<div class="ldt">${t.map(plate).join('')}</div>`).join(`<div class="ldx" style="animation-delay:${(delay += 0.05).toFixed(2)}s"><svg viewBox="0 0 60 66" aria-hidden="true"><path d="M30 2l26 8v20c0 17-11 28-26 34C15 58 4 47 4 30V10z"/><path class="in" d="M30 8l20 6v16c0 13-8 22-20 27-12-5-20-14-20-27V14z"/></svg><b>VS</b></div>`);
  }
  function step(i, s) { if (s === 'run' && steps[i]) { const t = $('ltip'); if (t && !t.classList.contains('note')) t.textContent = steps[i] + '…'; } }
  function prog(p) { const v = Math.round(clamp(p, 0, 1) * 100); const b = $('lbar'); if (b) b.style.width = v + '%'; const pc = $('lpct'); if (pc) pc.textContent = v + '%'; }
  function note(txt) { const t = $('ltip'); if (!t) return; t.classList.add('note'); t.textContent = txt; }
  function hide() { const L = $('loading'); if (L) L.classList.add('hid'); }
  return { show, step, prog, note, hide, preview, players };
})();
