/* ============================================================
   War of Power — نقطة البداية: التشغيل، دورة المعركة، النتائج، الحفظ
   الملف: js/main.js   ·   ترتيب التحميل: 43 من 43
   ============================================================ */
'use strict';
/* ===== Main: boot, device tiering, match lifecycle, loop, results, saves ===== */
const ENV = {
  day: { amb: [0.36, 0.38, 0.43], sun: [1.0, 0.95, 0.85], grade: [1.0, 0.9, 0.035, 0], shadowK: 0.6 },
  dusk: { amb: [0.27, 0.25, 0.31], sun: [1.08, 0.74, 0.5], grade: [0.97, 0.95, 0.08, 0], shadowK: 0.65 },
  night: { amb: [0.1, 0.12, 0.2], sun: [0.16, 0.2, 0.32], grade: [1.1, 0.8, -0.05, 0], shadowK: 0.35 },
  snow: { amb: [0.4, 0.42, 0.48], sun: [0.98, 0.97, 0.95], grade: [0.97, 0.85, -0.01, 0], shadowK: 0.55 },
};
const MODE_N = { skirmish: 'معركة', world: 'العالم', gov: 'الحاكم', survival: 'الصمود', tut: 'تدريب', net: 'جماعية' };
const Main = (function () {
  let G = null, layers = null, raf = 0, last = 0, acc = 0, running = false; let layersQ = 0;
  let perf = { t: 0, n: 0, sum: 0, scale: 1, lowT: 0, highT: 0 }; let glOK = false; let drawAcc = 0, lastDraw = 0;
  const $ = id => document.getElementById(id);
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function boot(hotData) {
    loadProfile(); if (Settings.qAuto === undefined) Settings.qAuto = true;
    UI.init(); Input.attach($('gl')); Draw.setOverlay($('ov'));
    glOK = R.init($('gl')); resize(); window.addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); }); window.addEventListener('orientationchange', () => setTimeout(resize, 200));
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G && !G.over && !G.net) saveGame(true); SND.suspend(true); if (G && !G.over && !UI.paused && G.mode !== 'tut' && !G.net) { UI.pause(); } } else SND.suspend(false); });
    R.onLost = () => { running = false; }; R.onRestored = () => { if (G) rebuildGPU(G).then(() => { running = true; }); };
    const unlock = () => SND.unlock(); window.addEventListener('pointerdown', unlock, { passive: true }); window.addEventListener('keydown', unlock);
    (async () => {
      const wp = null;
      Load.show({ prev: wp });
      if (!glOK) { Load.prog(1); Load.note('جهازك لا يدعم WebGL2 اللازم لتشغيل اللعبة — جرّب متصفح Chrome حديثاً أو حدّث نظام الجهاز.'); return; }
      // silent device profiling: CPU probe + GPU/memory read-out pick the graphics tier, nothing is shown
      await nextFrame(); let dv = null; try { dv = Device.detect(); } catch (e) { console.error(e); } Load.prog(0.25);
      if (dv && Settings.qAuto) { Settings.quality = dv.q; saveSettings(); resize(); } await sleep(120); Load.prog(0.4);
      await nextFrame(); ensureLayers(); Load.prog(0.85);
      await nextFrame(); Load.prog(1); await sleep(220); Load.hide();
      startLoop(); if (hotData && hotData.save) { try { loadSaved(hotData.save); return; } catch (e) { console.error(e); } }
      try { if (window.TWNet && TWNet.pendingJoin) { Menus.lobby(); return; } } catch (e) { }
      UI.title(); I18N.firstRun(); // first launch only: pick Arabic or English
    })();
  }
  function ensureLayers() { const q = Settings.quality < 0.7 ? 256 : 512; if (layers && layersQ === q) return; try { layers = genTerrainLayers(q); layersQ = q; } catch (e) { console.error(e); } }
  // weak / old devices: 30 fps, device-pixel ratio 1, no sprite shadows, fewer particles, lighter AI ceiling
  function lite() { return Settings.liteMode === 1 || (Settings.liteMode !== 0 && (Settings.quality <= 0.55 || !!(Device.info && Device.info.lite))); }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight; const dpr = lite() ? 1 : Math.min(window.devicePixelRatio || 1, Settings.quality >= 1 ? 2 : Settings.quality >= 0.8 ? 1.5 : 1.25);
    $('gl').style.width = w + 'px'; $('gl').style.height = h + 'px'; const ov = $('ov'); ov.width = Math.round(w * dpr); ov.height = Math.round(h * dpr); ov.style.width = w + 'px'; ov.style.height = h + 'px'; ov._dpr = dpr;
    if (glOK) R.resize(w, h, dpr, perf.scale);
    document.body.classList.toggle('portrait', h > w && Math.min(w, h) < 700);
    if (G) Input.clampCam();
  }
  function autoFull() {
    if (Settings.full === false || window.TWNative) return;
    try { const d = document.documentElement; const p = !document.fullscreenElement && d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : null; const lock = () => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }; if (p && p.then) p.then(lock).catch(() => { }); else lock(); } catch (e) { }
  }
  async function buildAtlas(g, prog) {
    { const st = g.cfg.setup, me = g.players[g.local]; applyCamo(me && me.f, st && st.c && st.c.camo); }
    ATLAS.reset(); QUALITY = lite() ? Math.min(Settings.quality, 0.5) : Settings.quality; FX.configure(lite() ? 0.4 : Settings.quality); R.lite = lite(); AI_POP_SOFT = lite() ? 150 : 260; if (lite() && perf.scale > 0.8) perf.scale = 0.8; const facs = [...new Set(g.players.map(p => p.f))];
    FX_NEED = fxNeedFor(g); bakeFX(); bakeFX2(); bakeFX3(); bakeFX4(); bakeTrees(); prog && prog(0.15); await nextFrame();
    let i = 0; for (const f of facs) { bakeFactionUnits(f); await nextFrame(); bakeBuildings(f); i++; prog && prog(0.15 + 0.7 * i / facs.length); await nextFrame(); }
    if (g.cityProps) { const st = [...new Set(g.cityProps.map(c => c.st))]; for (const s of st) bakeCivil(s, ['house', 'villa', 'apart', 'tower']); }
    for (const b of g.blds) if (b.def.neutral && !ATLAS.has('neu_' + b.type)) bakeBuildings(facs[0], [b.type]);
    prog && prog(0.92); await nextFrame();
    ATLAS.upload(); ATLAS.free();
  }
  async function rebuildGPU(g) { await buildAtlas(g); uploadTerrain(g); }
  function uploadTerrain(g) { ensureLayers(); const T = g.map.buildTerrainData(); T.det = layers.layers; T.detSize = layers.size; T.fog = g.fog.buf; R.uploadTerrain(T); g.fog.dirty = true; }
  function applyEnv(g, tod) { const th = g.map.theme; const e = ENV[tod || (th === 'snow' ? 'snow' : 'day')] || ENV.day; R.env.amb = e.amb.slice(); R.env.sun = e.sun.slice(); R.env.grade = e.grade.slice(); R.env.shadowK = e.shadowK; g.tod = tod || 'day'; }
  const TOD_N = { day: 'نهار', dusk: 'غروب', night: 'ليل' };
  async function start(makeGame, cfg) {
    endGame(); UI.hideScreens(); const info = cfg.info || {};
    Load.show({ mode: info.mode || 'معركة', map: info.map || '', ac: info.ac, players: [], _steps: ['توليد الخريطة', 'تشكيل التضاريس', 'رسم الوحدات والمباني', 'نشر القوات', 'تهيئة القادة'], txt: 'جارٍ توليد الخريطة…' });
    Load.step(0, 'run'); Load.prog(0.03); await nextFrame();
    let g; try { g = makeGame(); } catch (e) { console.error(e); Load.hide(); UI.toast('تعذر إنشاء المعركة', 'bad'); UI.mainMenu(); if (cfg.onFail) cfg.onFail(e); return null; }
    Load.step(0, 'ok'); try { Load.preview(Menus.mapToURL(g.map)); } catch (e) { }
    Load.players(g.players.filter(p => !p.waves || p.id === 1).map(p => ({ f: p.f, col: p.col, team: p.team, name: p.nick || (p.waves ? 'موجات العدو' : p.human && p.id === g.local ? Profile.name : p.name), sub: p.waves ? 'هجوم لا ينتهي' : p.human ? (p.id === g.local ? 'أنت' : 'لاعب') : (p.dropped ? 'الحاسوب' : AI_LEVELS[p.aiLevel || 0] ? 'ذكاء ' + AI_LEVELS[p.aiLevel || 0].n : FACTIONS[p.f].short) })));
    Load.step(1, 'run'); Load.prog(0.1); await nextFrame(); ensureLayers(); Load.step(1, 'ok');
    Load.step(2, 'run'); await buildAtlas(g, p => Load.prog(0.12 + p * 0.76)); Load.step(2, 'ok');
    Load.step(3, 'run'); Load.prog(0.9); await nextFrame(); uploadTerrain(g); applyEnv(g, cfg.tod);
    G = g; GAME = g; FX.clear(); Input.setGame(g);
    const me = g.me; R.cam.x = me.start.x; R.cam.y = me.start.y + 40; R.cam.z = window.innerWidth < 900 ? 1.15 : 1.0; Input.clampCam(); Load.step(3, 'ok');
    Load.step(4, 'run'); Load.prog(0.97); g.onSpecial = (pid, uid) => { if (pid !== g.local || g.spectate) return; unlockAch('special'); };
    await nextFrame(); Load.step(4, 'ok'); Load.prog(1); if (cfg.beforeEnter) await cfg.beforeEnter(g); await sleep(cfg.fast ? 60 : 420); Load.hide();
    UI.enterGame(g); SND.playMusic('battle'); acc = 0; last = performance.now();
    g.notify(g.local, g.mode === 'survival' ? 'حصّن قاعدتك — الموجة الأولى بعد دقيقة ونصف' : 'المعركة بدأت. ابنِ قاعدتك!', 'info');
    if (g.mode === 'tut') Tut.start(g);
    return g;
  }
  function humanCfg(f) { return {}; }
  function colorize(base, list) { const used = [base]; return list.map(o => { let col = FACTIONS[o.f].col; while (used.includes(col)) col = (col + 1) % 8; used.push(col); return col; }); }
  function startSkirmish(c) {
    const def = sizedDef(MAPS.find(m => m.id === c.map) || MAPS[1], c.size); const opp = (c.opp || []).slice(0, def.max - 1); const myCol = c.col >= 0 && c.col < TEAMCOL.length ? c.col : FACTIONS[c.f].col; const cols = colorize(myCol, opp);
    const players = [Object.assign({ f: c.f, col: myCol, team: 0, human: true, name: Profile.name }, humanCfg(c.f))].concat(opp.map((o, i) => ({ f: o.f, col: cols[i], team: o.team, ai: o.ai })));
    const ck = c.chal ? c.chal.k : c.daily ? 'd' : ''; const label = (ck ? CHAL_T[ck] + ': ' : 'معركة: ') + def.n; const ac = ck ? MODE_AC.daily : MODE_AC.skirm;
    return start(() => { const g = setupSkirmish({ mapId: def.id, players, money: c.money, seed: c.seed, size: c.size }); g.cfg.label = label; g.cfg.daily = c.daily || null; g.cfg.chal = c.chal || null; g.cfg.setup = { kind: 'skirm', c }; return g; },
      { tod: c.tod, info: { mode: ck ? CHAL_T[ck] : 'بدء لعبة', map: def.n + ' · ' + def.w + '×' + def.h, ac, chips: ['$' + fmN(c.money || 10000), TOD_N[c.tod] || 'نهار', players.length + ' لاعبين'] } });
  }
  function startSurvival(c) {
    const def = MAPS.find(m => m.id === c.map) || MAPS[1];
    return start(() => { const g = Survival.setup(Object.assign({}, c)); g.cfg.setup = { kind: 'surv', c }; return g; }, { tod: c.tod, info: { mode: 'طور الصمود', map: def.n, ac: MODE_AC.surv, chips: ['الشدة: ' + AI_LEVELS[c.diff || 0].n, 'أفضل: ' + (Profile.stats.waves || 0) + ' موجة'] } });
  }
  function startTutorial() { return start(() => { const g = Tut.setup(); g.cfg.setup = { kind: 'tut' }; return g; }, { info: { mode: 'التدريب', map: 'معسكر التدريب', ac: MODE_AC.tut } }); }
  // multiplayer: every peer builds the identical game from the host's setup (lockstep)
  function startNet(setup, net) {
    const def = MAPS.find(m => m.id === setup.mapId) || MAPS[1];
    return start(() => { const g = setupSkirmish({ mapId: def.id, players: setup.players.map(p => Object.assign({}, p)), money: setup.money, seed: setup.seed, lockstep: true, local: setup.local, noAiSpecials: false });
      g.cfg.label = 'معركة جماعية: ' + def.n; g.cfg.setup = { kind: 'net', c: { camo: Eco.camo() } }; g.net = net; g.players.forEach((p, i) => { p.nick = setup.players[i].name; }); return g; },
      { tod: setup.tod, fast: true, info: { mode: 'معركة جماعية — شبكة محلية', map: def.n, ac: MODE_AC.mp, chips: [setup.players.length + ' لاعبين', '$' + fmN(setup.money)] }, beforeEnter: net && net.ready ? g => net.ready(g) : null, onFail: net && net.fail });
  }
  function restart() { const s = G && G.cfg.setup; if (!s) { UI.mainMenu(); return; } if (s.kind === 'skirm') startSkirmish(s.c); else if (s.kind === 'surv') startSurvival(s.c);  else if (s.kind === 'tut') startTutorial(); else UI.mainMenu(); }
  function endGame() { if (G) { Tut.stop(); UI.exitGame(); Input.setGame(null); Path.clearQueue(); FX.clear(); R.freeTerrain(); } G = null; GAME = null; SND.frame(null); const gb = $('govbar'); if (gb) gb.classList.add('hid'); }
  /* --- results: score, career xp, achievements --- */
  function recordResult(win, quit) {
    const g = G; if (!g || g.recorded) return { xp: 0, score: 0 }; g.recorded = true; const me = g.me; const S = me.stats; const mode = g.mode;
    const diff = Math.max(0, ...g.players.filter(p => p.ai).map(p => p.aiLevel || 0)); const surv = mode === 'survival'; const waves = surv && g.surv ? Math.max(0, g.surv.wave - (g.surv.cleared ? 0 : 1)) : 0;
    let score = S.kills * 12 + S.bkills * 60 + (S.air || 0) * 30 + Math.floor(S.earned / 100);
    if (win) score = Math.round(score * 1.5 + 1500 * (1 + diff)); if (surv) score += waves * 1000; if (quit) score = Math.round(score * 0.5); if (mode === 'tut') score = 0;
    const xp = mode === 'tut' ? 100 : Math.round(score * 0.45 + (win ? 450 : 120)); const lv0 = plevel();
    Profile.xp += xp;
    const St = Profile.stats; St.played++; if (win) St.wins++; else St.losses++; St.kills += S.kills; St.bkills = (St.bkills || 0) + S.bkills; St.air = (St.air || 0) + (S.air || 0); St.icpt = (St.icpt || 0) + (S.icpt || 0); St.time = Math.round((St.time || 0) + g.t);
    if (win && mode !== 'tut') { St.facWins[me.f] = (St.facWins[me.f] || 0) + 1; if (g.net) St.mpWins = (St.mpWins || 0) + 1; } if (surv) St.waves = Math.max(St.waves || 0, waves);
    let daily = false, chal = null; // challenges (daily / weekly / monthly): a win completes one once per period
    if (win && !g.net && !quit) { const ch = g.cfg.chal || (g.cfg.daily ? { k: 'd', key: g.cfg.daily, i: 0 } : null); chal = ch ? chalWin(ch) : null;
      if (chal && chal.k === 'd' && !dailyDone()) { Profile.daily = { date: today(), done: true }; St.daily = (St.daily || 0) + 1; daily = true; } }
    const had = new Set(Object.keys(Profile.ach)); unlockAch.quiet = true;
    if (win && mode !== 'tut') { if (diff >= 2) unlockAch('hard_win'); if (diff >= 3) unlockAch('brutal_win'); if (g.t < 600) unlockAch('fast_win'); if (S.lost < 5) unlockAch('nolose'); }
    if ((S.supers || 0) > 0) unlockAch('super'); if ((S.built || 0) >= 30) unlockAch('builder'); if (Object.keys(me.upg).length >= techTree(me.f).length) unlockAch('tech_full'); 
    checkAchStats(); unlockAch.quiet = false; const ach = Object.keys(Profile.ach).filter(k => !had.has(k)).map(k => (ACH.find(a => a.id === k) || {}).n).filter(Boolean);
    let best = false; if (mode !== 'tut' && score > 0) { const idx = addScore({ score, mode: g.net ? MODE_N.net : MODE_N[mode] || mode, f: me.f, win: !!win, t: Math.round(g.t), waves: surv ? waves : 0 }); best = idx === 0 && Profile.scores.length > 1; }
    const eco = Eco.afterMatch({ win: !!win, quit: !!quit, mode, diff, kills: S.kills || 0, bkills: S.bkills || 0, air: S.air || 0, built: S.built || 0, units: S.units || 0, waves, net: !!g.net, daily, chal, t: g.t }); // coins, medals, mission progress
    saveProfile(); if (!quit && !g.net) LS.del('tw_save_v1'); // a finished battle cannot be continued
    return { xp, score, best, daily, chal, ach, eco, lvUp: plevel() > lv0 };
  }
  /* --- loop --- */
  function startLoop() { if (raf) return; running = true; last = performance.now(); const loop = ts => { raf = requestAnimationFrame(loop); try { frame(ts); } catch (e) { console.error(e); } }; raf = requestAnimationFrame(loop); }
  function frame(ts) {
    let dt = (ts - last) / 1000; last = ts; if (!(dt > 0)) dt = 0.016; dt = Math.min(dt, 0.1);
    const g = G; if (!g || !running || !R.ok) return;
    let paused = UI.paused || UI.blocking();
    if (g.net) { paused = false; g.net.step(g, dt); } // lockstep: the network decides when ticks run
    else if (!paused && !g.over) { acc += dt * g.speed; let n = 0; while (acc >= DT && n < 6) { gameTick(g, DT); acc -= DT; n++; } if (n >= 6) acc = 0; if (g.mode === 'tut') Tut.tick(); }
    else if (g.over && !UI.paused) { acc += dt; while (acc >= DT) { gameTick(g, DT); acc -= DT; } }
    if (!g.net && !g.over && g.mode !== 'tut' && g.t - (g._asT || 0) > 45) { g._asT = g.t; saveGame(true); } // autosave every 45 s → «متابعة اللعبة» on the main menu
    if (R.lite) { drawAcc += dt; if (ts - lastDraw < 31) return; dt = drawAcc; drawAcc = 0; lastDraw = ts; } // lite: simulation keeps its pace, the picture is drawn at ~30 fps
    const alpha = g.net ? g.net.alpha() : clamp(acc / DT, 0, 1);
    FX.update(paused && !g.net ? 0 : dt * (g.net ? 1 : g.speed)); Input.update(dt);
    if (g.fog.dirty) { R.updateFog(g.fog.buf); g.fog.dirty = false; }
    if (g.terrainDirty) { const [x, y, w, h] = g.terrainDirty; g.terrainDirty = null; const T = g.map.buildTerrainData(); const cx = clamp(x, 0, g.map.w - 1), cy = clamp(y, 0, g.map.h - 1); R.updateTerrainRegion(T, cx, cy, Math.min(w, g.map.w - cx), Math.min(h, g.map.h - cy)); }
    Draw.frame(g, alpha, dt); drawExtras(g, alpha); R.render(Draw.t); Draw.overlay(g); UI.frame(dt); SND.frame(g);
    perf.sum += dt; perf.n++; if (perf.n >= 45) { const avg = perf.sum / perf.n; perf.sum = 0; perf.n = 0; if (avg > (R.lite ? 0.04 : 0.026)) { perf.lowT++; perf.highT = 0; } else if (avg < (R.lite ? 0.03 : 0.0175)) { perf.highT++; perf.lowT = 0; } else { perf.lowT = 0; perf.highT = 0; }
      if (perf.lowT >= 2 && perf.scale > (R.lite ? 0.45 : 0.55)) { perf.scale = Math.max(R.lite ? 0.45 : 0.55, perf.scale - 0.12); perf.lowT = 0; resize(); } else if (perf.highT >= 6 && perf.scale < 1) { perf.scale = Math.min(1, perf.scale + 0.1); perf.highT = 0; resize(); } }
  }
  function drawExtras(g, a) {
    const [x0, y0, x1, y1] = R.viewRect(120);
    if (g.cityProps) for (const p of g.cityProps) { if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue; if (!g.visibleTo(g.local, p.x, p.y)) continue; const s = ATLAS.get(p.st + '_civ_' + p.t); if (!s) continue; const sh = ATLAS.get(p.st + '_civ_' + p.t + ':sh'); if (sh) R.shadow(sh, p.x, p.y, 0, 1, 0, 1); R.spr(s, p.x, p.y, 0, 1, 0xffffffff, 0, 1); }
  }
  /* --- save / load --- */
  function saveGame(silent) {
    const g = G; if (!g || g.mode === 'tut' || g.net) return false;
    try { const S = makeSave(g); const ok = LS.set('tw_save_v1', S); if (!ok && !silent) UI.toast('تعذّر الحفظ: مساحة التخزين ممتلئة', 'bad'); return ok; } catch (e) { console.error(e); return false; }
  }
  function snapshot() { const g = G; if (!g || g.mode === 'tut' || g.over || g.net) return {}; try { return { save: makeSave(g) }; } catch (e) { return {}; } }
  const rider = u => ({ id: u.id, type: u.type, hp: Math.round(u.hp), xp: +u.xp.toFixed(2), rank: u.rank });
  function makeSave(g) {
    const S = { v: 1, v2: 2, mapId: g.map.id && g.mode !== 'world' ? g.map.id : undefined, mode: g.mode, label: (g.cfg.label || '') + ' — ' + fmtTime(g.t), setup: g.cfg.setup, t: g.t, tod: g.tod, daily: g.cfg.daily || null, chal: g.cfg.chal || null,
      players: g.players.map(p => ({ f: p.f, team: p.team, col: p.col, human: p.human, aiLevel: p.aiLevel, money: p.money, iron: p.iron, parts: p.parts, xp: p.xp, rank: p.rank, upg: p.upg, stats: p.stats, superReady: p.superReady, popCap: p.popCap, start: p.start, research: p.research, name: p.name, waves: p.waves || 0, alive: p.alive, dropped: !!p.dropped,
        specials: p.specials || {}, specUsed: p.specUsed || {},
        pcd: Object.fromEntries(Object.entries(p.pcd).map(([k, v]) => [k, v - g.t])), ai: p.ai ? { wave: p.ai.wave, lastAttack: p.ai.lastAttack - g.t, first: p.ai.firstWaveT - g.t } : null })),
      nextId: g.nextId, blds: g.blds.map(b => ({ id: b.id, type: b.type, owner: b.owner, tx: b.tx, ty: b.ty, built: b.built, prog: b.prog, stage: b.stage, hp: Math.round(b.hp), q: b.q.map(q => ({ u: q.u, t: q.t, T: q.T, c: q.c })), rally: b.rally, charge: b.charge, res: b.res, style: b.style, paid: b.paid, lvl: b.lvl, aa: b.aa, upg: b.upg })),
      units: g.units.filter(u => !u.dead && !u.dying && !u.def.nosel).map(u => ({ id: u.id, type: u.type, owner: u.owner, x: Math.round(u.x), y: Math.round(u.y), a: +u.a.toFixed(2), hp: Math.round(u.hp), xp: +u.xp.toFixed(2), rank: u.rank, cargo: u.cargo, o: u.order.t === 'harvest' ? 'harvest' : u.goal ? 'move' : 'idle', gx: u.goal ? Math.round(u.goal[0]) : 0, gy: u.goal ? Math.round(u.goal[1]) : 0, z: u.z, st: u.state,
        special: u.special || 0, wave: u.wave || 0, sub: u.sub || 0, ammo: u.ammo, load: u.load && u.load.length ? u.load.map(rider) : null })),
      surv: g.surv || null, waveArmor: g.waveArmor || 1,
      trees: g.map.trees.map((t, i) => t.alive ? -1 : i).filter(i => i >= 0), cityProps: g.cityProps || null,
      exp: rle(g.fog.exp) };
    return S;
  }
  function rle(a) { const out = []; let v = a[0], n = 0; for (let i = 0; i < a.length; i++) { if (a[i] === v) n++; else { out.push(v, n); v = a[i]; n = 1; } } out.push(v, n); return out; }
  function unrle(r, dst) { let o = 0; for (let i = 0; i < r.length; i += 2) { dst.fill(r[i], o, o + r[i + 1]); o += r[i + 1]; } }
  // rebuild a whole battle from a save object (used by "continue", hot reload and network resync)
  function gameFromSave(S, o) {
    o = o || {}; const st = S.setup || {}; const mapId = S.mapId || (st.c && st.c.map);
    let map; { const def = sizedDef(MAPS.find(m => m.id === mapId) || MAPS[0], st.kind === 'skirm' && st.c ? st.c.size : 1); map = generateSkirmishMap(def, st.kind === 'surv' ? 2 : S.players.length); }
    const g = new Game({ mode: S.mode, money: 0, local: o.local !== undefined ? o.local : S.players.findIndex(p => p.human), label: (S.label || '').split(' — ')[0], setup: st, seed: o.seed, lockstep: !!o.lockstep }, map); g.cfg.daily = S.daily || null; g.cfg.chal = S.chal || null;
    for (const i of S.trees || []) map.removeTree(i);
    S.players.forEach(p => { const pl = g.addPlayer({ f: p.f, col: p.col, team: p.team, human: p.human, ai: p.aiLevel, popCap: p.popCap, start: p.start, name: p.name, noElite: !Object.keys(p.specials || {}).length }); Object.assign(pl, { money: p.money, iron: p.iron || 0, parts: p.parts || 0, xp: p.xp, rank: p.rank, upg: p.upg || {}, stats: p.stats, superReady: p.superReady, research: p.research, specUsed: p.specUsed || {}, genXp: p.genXp || {}, genHurt: p.genHurt || {}, alive: p.alive !== false }); if (p.waves) pl.waves = 1; if (p.dropped) pl.dropped = true; pl.pcd = {}; for (const k in p.pcd || {}) pl.pcd[k] = p.pcd[k]; pl.pmc = null; });
    g.t = S.t; if (S.tick !== undefined) g.tick = S.tick; for (const p of g.players) for (const k in p.pcd) p.pcd[k] += g.t;
    const useId = id => { if (id && !g.ents.has(id)) g.nextId = id; };
    for (const b of S.blds) { useId(b.id); const nb = g.placeBuilding(b.type, b.owner, b.tx, b.ty, b.built >= 1); if (!nb) continue; Object.assign(nb, { rally: b.rally, charge: b.charge || 0, res: b.res || nb.res, style: b.style, paid: b.paid }); if (b.lvl > 1 || b.aa) { nb.lvl = b.lvl || 1; nb.aa = b.aa || 0; Levels.apply(g, nb); } nb.upg = b.upg || null; nb.hp = Math.min(nb.maxHp, b.hp); nb.q = b.q || []; if (b.built < 1) { nb.prog = b.prog || {}; nb.stage = b.stage || 0; nb.built = b.built; } if (b.type === 'super' && b.owner >= 0) g.players[b.owner].superB = nb.id; }
    const restoreRider = (r, owner, t) => { useId(r.id); const nu = g.spawnUnit(r.type, owner, t.x, t.y, 0); if (!nu) return; nu.hp = Math.min(nu.maxHp, r.hp); nu.xp = r.xp || 0; nu.rank = r.rank || 0; Units.enter(g, nu, t); };
    for (const u of S.units) { useId(u.id); const nu = g.spawnUnit(u.type, u.owner, u.x, u.y, u.a); if (!nu) continue; nu.hp = Math.min(nu.maxHp, u.hp); nu.xp = u.xp; nu.rank = u.rank; nu.cargo = u.cargo || 0; if (u.z !== undefined) nu.z = u.z; if (u.special) { nu.special = 1; g.players[u.owner].pop -= nu.def.pop || 1; } if (u.wave) nu.wave = u.wave; if (nu.def.subm) nu.sub = u.sub ? 1 : 0; if (u.ammo !== undefined) nu.ammo = u.ammo;
      if (nu.def.fly === 'jet') { nu.state = 'fly'; nu.z = nu.def.alt; nu.gx = u.x; nu.gy = u.y; }
      if (u.load) for (const r of u.load) restoreRider(r, u.owner, nu);
      if (u.o === 'harvest') Units.order(g, nu, { t: 'harvest' }); else if (u.o === 'move' && u.gx) Units.order(g, nu, { t: 'move', x: u.gx, y: u.gy }); else Units.order(g, nu, { t: 'idle' }); }
    let mx = S.nextId || 1; for (const e of g.ents.keys()) if (e >= mx) mx = e + 1; g.nextId = mx;
    for (const p of g.players) g.recalcPower(p);
    S.players.forEach((p, i) => { if (p.ai && !p.human && !p.waves && g.players[i].alive) { const ai = new AIBrain(g, i, p.aiLevel === undefined ? 1 : p.aiLevel); ai.wave = p.ai.wave; ai.lastAttack = g.t + p.ai.lastAttack; ai.firstWaveT = g.t + p.ai.first; } });
    if (S.mode === 'survival' && S.surv) { g.surv = S.surv; g.surv.next = Math.max(g.t + 20, S.surv.next); g.waveArmor = S.waveArmor || 1; g.modeTick = Survival.tick; }
    if (S.exp) unrle(S.exp, g.fog.exp); g.updateFog(); return g;
  }
  function loadSaved(S0) {
    const S = S0 || LS.get('tw_save_v1', null); if (!S || S.v !== 1 || !S.setup || !['skirm', 'surv'].includes(S.setup.kind)) { UI.toast('لا توجد لعبة محفوظة صالحة', 'warn'); if (!S0) LS.del('tw_save_v1'); UI.mainMenu(); return; }
    return start(() => gameFromSave(S), { tod: S.tod, info: { mode: 'متابعة المعركة المحفوظة', map: S.label || '', ac: MODE_AC.home } });
  }
  // network resync: every peer rebuilds the same battle from the host's snapshot, keeping the GPU atlas
  function rebuildNet(S, seed, local) {
    const old = G; if (!old) return null; const g = gameFromSave(S, { seed, local, lockstep: true });
    g.cfg.label = old.cfg.label; g.cfg.setup = old.cfg.setup; g.players.forEach((p, i) => { const o = old.players[i]; if (o) { p.nick = o.nick; p.peer = o.peer; } }); g.onSpecial = old.onSpecial; g.spectate = old.spectate;
    Path.clearQueue(); FX.clear(); G = g; GAME = g; Input.setGame(g); uploadTerrain(g); applyEnv(g, old.tod); UI.enterGame(g); acc = 0; return g;
  }
  return { boot, startSkirmish, startSurvival, startTutorial, startNet, restart, endGame, recordResult, saveGame, loadSaved, snapshot, makeSave,  rebuildNet, autoFull, resize };
})();
// Android back button (MainActivity asks the page what to do): pause the battle or step back one screen
window.__twBack = () => { try { if (UI.modal) { const b = document.querySelector('.modal .btn:last-child'); if (b) b.click(); return 1; } if (GAME && !GAME.over) { UI.pause(); return 1; } const sc = document.getElementById('screens'); if (sc && !sc.classList.contains('hid')) { if (sc.querySelector('.hub') || sc.querySelector('.title')) return 0; const bk = sc.querySelector('.back'); if (bk) { bk.click(); return 1; } } } catch (e) { } return 0; };
window.addEventListener('DOMContentLoaded', () => {
  const hot = window.claude && window.claude.hot; // artifact viewer's live-update hook (absent elsewhere)
  try { if (hot && hot.snapshot) hot.snapshot(() => Main.snapshot()); } catch (e) { }
  const start = d => Main.boot(d || {});
  try { if (hot && hot.ready) { hot.ready(start); return; } } catch (e) { }
  start((hot && hot.data) || {});
});
