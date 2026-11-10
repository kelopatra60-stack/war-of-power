/* ============================================================
   War of Power — الإدخال: اللمس والفأرة ولوحة المفاتيح
   الملف: js/ui/input.js   ·   ترتيب التحميل: 32 من 43
   ============================================================ */
'use strict';
/* ===== Input: touch / mouse / keyboard → camera, selection, commands ===== */
const Input = (function () {
  let cv = null, G = null; const ptr = new Map(); let mode = 'normal', place = null, target = null; let box = null;
  let sel = []; const groups = {}; let lastTap = { t: 0, x: 0, y: 0, id: 0 }; let pinch = null; let longTimer = null; let boxMode = false;
  const markers = []; let vel = [0, 0], lastMove = 0; const keys = new Set(); let mouse = { x: -1, y: -1, in: false, type: 'mouse' }; 
  let amoveArmed = false;
  function attach(canvas) {
    cv = canvas;
    cv.addEventListener('pointerdown', down, { passive: false }); window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up, { passive: false }); window.addEventListener('pointercancel', cancelPtr, { passive: false });
    cv.addEventListener('wheel', wheel, { passive: false }); cv.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', e => keys.delete(e.code)); window.addEventListener('blur', () => { keys.clear(); ptr.clear(); pinch = null; box = null; });
    cv.addEventListener('pointerleave', () => { mouse.in = false; });
  }
  function setGame(g) { G = g; sel = []; mode = 'normal'; place = null; target = null; box = null; markers.length = 0; for (const k in groups) delete groups[k]; }
  const world = (sx, sy) => R.s2w(sx, sy);
  function clampCam() { if (!G) return; const m = G.map; const W = m.w * TILE, H = m.h * TILE; const minZ = Math.max(0.12, Math.min(R.cssW / (W * 1.05), R.cssH / (H * 1.05))); R.cam.z = clamp(R.cam.z, Math.min(minZ, 0.6), 2.4); const hw = R.cssW / 2 / R.cam.z, hh = R.cssH / 2 / R.cam.z; R.cam.x = clamp(R.cam.x, Math.min(hw * 0.5, W / 2), Math.max(W - hw * 0.5, W / 2)); R.cam.y = clamp(R.cam.y, Math.min(hh * 0.5, H / 2), Math.max(H - hh * 0.5, H / 2)); }
  function zoomAt(sx, sy, f) { const [wx, wy] = world(sx, sy); R.cam.z *= f; clampCam(); const [wx2, wy2] = world(sx, sy); R.cam.x += wx - wx2; R.cam.y += wy - wy2; clampCam(); }
  function local(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function down(e) {
    if (!G || UI.blocking()) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) { }
    SND.unlock(); const [x, y] = local(e); ptr.set(e.pointerId, { x, y, sx: x, sy: y, t: performance.now(), btn: e.button, type: e.pointerType, moved: false });
    mouse.type = e.pointerType; vel = [0, 0];
    if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, z: R.cam.z }; box = null; clearTimeout(longTimer); return; }
    if (e.pointerType !== 'mouse') {
      // drag placement ghost
      if (mode === 'place' && place) { const [wx, wy] = world(x, y); const d = BLD[place.type]; if (place.tx !== undefined && Math.abs(wx - (place.tx + d.w / 2) * TILE) < d.w * TILE * 0.7 + 20 && Math.abs(wy - (place.ty + d.h / 2) * TILE) < d.h * TILE * 0.7 + 20) ptr.get(e.pointerId).ghost = true; }
      clearTimeout(longTimer); longTimer = setTimeout(() => { const p = ptr.get(e.pointerId); if (p && !p.moved && ptr.size === 1 && mode === 'normal') { box = [p.sx, p.sy, p.x, p.y]; p.box = true; if (navigator.vibrate) try { navigator.vibrate(12); } catch (er) { } } }, 380);
      if (boxMode && mode === 'normal') { ptr.get(e.pointerId).box = true; box = [x, y, x, y]; }
    } else if (e.button === 0 && mode === 'normal') { ptr.get(e.pointerId).box = true; }
  }
  function move(e) {
    const [x, y] = cv ? local(e) : [0, 0]; mouse.x = x; mouse.y = y; mouse.in = true; mouse.type = e.pointerType;
    const p = ptr.get(e.pointerId);
    if (mode === 'place' && place && e.pointerType === 'mouse') updateGhost(x, y);
    if (!p) return; e.preventDefault();
    const dx = x - p.x, dy = y - p.y; p.x = x; p.y = y; if (Math.hypot(x - p.sx, y - p.sy) > (p.type === 'mouse' ? 4 : 10)) p.moved = true;
    if (pinch && ptr.size >= 2) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2; const f = d / Math.max(10, pinch.d); const [wx, wy] = world(cx, cy); R.cam.z = clamp(pinch.z * f, 0.1, 2.4); clampCam(); const [wx2, wy2] = world(cx, cy); R.cam.x += wx - wx2; R.cam.y += wy - wy2; R.cam.x -= (cx - pinch.cx) / R.cam.z; R.cam.y -= (cy - pinch.cy) / R.cam.z; pinch.cx = cx; pinch.cy = cy; clampCam(); return; }
    if (p.ghost) { updateGhost(x, y); return; }
    if (p.box) { if (p.moved || box) { box = [p.sx, p.sy, x, y]; } return; }
    if (p.moved && (p.type !== 'mouse' || p.btn === 1 || p.btn === 2)) { R.cam.x -= dx / R.cam.z; R.cam.y -= dy / R.cam.z; clampCam(); const now = performance.now(); const dtm = Math.max(1, now - lastMove); lastMove = now; vel = [-dx / R.cam.z / dtm * 16, -dy / R.cam.z / dtm * 16]; clearTimeout(longTimer); }
  }
  function up(e) {
    const p = ptr.get(e.pointerId); if (!p) return; e.preventDefault(); ptr.delete(e.pointerId); clearTimeout(longTimer);
    if (pinch) { if (ptr.size < 2) pinch = null; return; }
    const [x, y] = local(e);
    if (p.ghost) { updateGhost(x, y); return; }
    if (p.box && box && (p.moved || p.type !== 'mouse')) { const b = box; box = null; if (Math.abs(b[2] - b[0]) > 8 || Math.abs(b[3] - b[1]) > 8) { boxSelect(b, e.shiftKey); return; } }
    box = null;
    if (!p.moved) {
      if (p.type === 'mouse' && p.btn === 2) { if (mode !== 'normal') { cancelMode(); return; } command(x, y, e.shiftKey); return; }
      tap(x, y, e.shiftKey, p.type);
    } else if (p.type !== 'mouse' && !p.box) { /* inertia */ }
    else vel = [0, 0];
  }
  function cancelPtr(e) { ptr.delete(e.pointerId); pinch = null; box = null; clearTimeout(longTimer); }
  function wheel(e) { if (!G) return; e.preventDefault(); const [x, y] = local(e); zoomAt(x, y, Math.exp(-e.deltaY * 0.0015)); }
  /* --- picking --- */
  function pick(wx, wy, allowEnemyHidden) {
    let best = null, bd = 1e9; const rz = 12 / R.cam.z;
    for (const u of G.units) { if (u.dead || u.dying || u.def.nosel) continue; if (!G.allies(u.owner, G.local) && (!G.visibleTo(G.local, u.x, u.y) || Combat.hidden(G, u, G.local))) continue; const d = Math.hypot(u.x - wx, u.y - wy) - Math.max(u.def.r * 1.25, rz); if (d < 0 && d < bd) { bd = d; best = u; } }
    if (best) return best;
    for (const b of G.blds) { if (!G.allies(b.owner, G.local) && !G.exploredTo(b.x, b.y)) continue; if (Math.abs(wx - b.x) <= b.w * TILE / 2 && Math.abs(wy - b.y) <= b.h * TILE / 2) return b; }
    return null;
  }
  function setSel(list) { for (const e of sel) e.sel = false; sel = list.filter(e => e && !e.dead); for (const e of sel) e.sel = true; UI.onSelect && UI.onSelect(sel); }
  function own(e) { return e && e.owner === G.local; }
  function boxSelect(b, add) {
    const [ax, ay] = world(Math.min(b[0], b[2]), Math.min(b[1], b[3])), [bx, by] = world(Math.max(b[0], b[2]), Math.max(b[1], b[3]));
    let list = G.units.filter(u => own(u) && !u.dead && !u.def.nosel && u.x >= ax && u.x <= bx && u.y >= ay && u.y <= by);
    const combat = list.filter(u => !u.def.work && !u.def.harvest); if (combat.length) list = combat;
    if (add) list = sel.filter(e => e.k === 'u').concat(list.filter(u => !sel.includes(u)));
    setSel(list); if (list.length) { UI.ack && UI.ack(list); }
  }
  function tap(sx, sy, shift, ptype) {
    const [wx, wy] = world(sx, sy);
    if (mode === 'place') { if (ptype === 'mouse') { updateGhost(sx, sy); confirmPlace(); } else {  updateGhost(sx, sy); } return; }
    if (mode === 'target') { const tg = target; cancelMode(); if (tg.fn) tg.fn(wx, wy); return; }
    const e = pick(wx, wy);
    const now = performance.now();
    if (e && e.k === 'u' && own(e) && now - lastTap.t < 330 && lastTap.id === e.id) { // double tap: select same type on screen
      const [x0, y0, x1, y1] = R.viewRect(0); setSel(G.units.filter(u => own(u) && u.type === e.type && u.x > x0 && u.x < x1 && u.y > y0 && u.y < y1)); lastTap = { t: 0 }; UI.ack && UI.ack(sel); return;
    }
    lastTap = { t: now, x: sx, y: sy, id: e ? e.id : 0 };
    const myUnits = sel.filter(u => u.k === 'u' && own(u));
    if (e && own(e)) {
      // board a transport with the selected units
      if (myUnits.length && !sel.includes(e) && e.k === 'u' && e.def.cargo) { const riders = myUnits.filter(u => Units.canBoard(G, u, e)); if (riders.length) { Cmd.order(riders, { t: 'board', tid: e.id }); marker(e.x, e.y, 'build'); UI.ack && UI.ack(riders, 'order'); return; } }
      if (e.k === 'b' && myUnits.length) {
        const mach = myUnits.filter(u => u.def.work);
        if (mach.length && (e.built < 1 || e.hp < e.maxHp)) { Cmd.order(mach, { t: 'build', bid: e.id }); marker(e.x, e.y, 'build'); UI.ack && UI.ack(mach, 'order'); return; }
        const trucks = myUnits.filter(u => u.def.harvest); if (trucks.length && e.type === 'supply') { Cmd.order(trucks, { t: 'harvest', cen: e.id }); return; }
      }
      if (e.k === 'u' && myUnits.some(u => u.def.role === 'eng') && e.hp < e.maxHp && !sel.includes(e)) { Cmd.order(myUnits.filter(v => v.def.role === 'eng'), { t: 'repair', tid: e.id }); marker(e.x, e.y, 'build'); return; }
      if (shift && e.k === 'u') { if (sel.includes(e)) setSel(sel.filter(x => x !== e)); else setSel(sel.filter(x => x.k === 'u').concat([e])); return; }
      setSel([e]); if (e.k === 'u') { UI.ack && UI.ack([e]); } else SND.ui('tab'); return;
    }
    if (e && myUnits.length) {
      if (e.k === 'b' && e.def.capt && e.owner !== G.local && !G.allies(e.owner, G.local)) { const inf = myUnits.filter(u => u.def.cls === 'inf'); if (inf.length) { Cmd.order(inf, { t: 'capture', tid: e.id }); marker(e.x, e.y, 'cap'); UI.ack && UI.ack(inf, 'order'); return; } }
      if (e.k === 'b' && e.owner < 0) {
        const inf = myUnits.filter(u => u.def.cls === 'inf' && u.def.role === 'rifle'); if (e.type === 'derrick' && inf.length) { const cap = inf.sort((a, b) => dist2(a.x, a.y, e.x, e.y) - dist2(b.x, b.y, e.x, e.y))[0]; Cmd.order([cap], { t: 'capture', tid: e.id }); marker(e.x, e.y, 'cap'); UI.ack && UI.ack([cap], 'order'); const rest = myUnits.filter(u => u !== cap); if (rest.length) Cmd.order(rest, { t: 'move', x: e.x, y: e.y + e.h * 20 }); return; }
        const trucks = myUnits.filter(u => u.def.harvest); if (e.type === 'depot' && trucks.length) { Cmd.order(trucks, { t: 'harvest', dep: e.id }); marker(e.x, e.y, 'move'); return; }
        Cmd.order(myUnits, { t: 'move', x: wx, y: wy }); marker(wx, wy, 'move'); return;
      }
      if (G.enemies(G.local, e.owner)) {
        { const spec = myUnits.filter(u => u.def.abil === 'c4'); if (e.k === 'b' && spec.length && !myUnits.some(u => u.def.abil !== 'c4')) { Cmd.order(spec, { t: 'c4', tid: e.id }); marker(e.x, e.y, 'attack'); return; } }
        const armed = myUnits.filter(u => u.w.length); if (armed.length) { Cmd.order(armed, { t: 'attack', tid: e.id }); marker(e.x, e.y, 'attack'); UI.ack && UI.ack(armed, 'attack'); return; } }
    }
    if (!e && myUnits.length) { const t = amoveArmed ? 'amove' : 'move'; Cmd.order(myUnits, { t, x: wx, y: wy }); marker(wx, wy, t === 'amove' ? 'attack' : 'move'); amoveArmed = false; UI.ack && UI.ack(myUnits, t); return; }
    if (e) { setSel([e]); return; }
    setSel([]);
  }
  function command(sx, sy, shift) { // right click
    const [wx, wy] = world(sx, sy); const myUnits = sel.filter(u => u.k === 'u' && own(u));
    if (!myUnits.length) { const b = sel.find(x => x.k === 'b' && own(x)); if (b && b.def.prod) { Cmd.send({ c: 'ra', b: b.id, x: wx, y: wy }); marker(wx, wy, 'rally'); } return; }
    const e = pick(wx, wy); if (e && !own(e)) { tap(sx, sy, false, 'mouse'); return; }
    if (e && own(e) && e.k === 'b') { tap(sx, sy, false, 'mouse'); return; }
    Cmd.order(myUnits, { t: amoveArmed ? 'amove' : 'move', x: wx, y: wy }); marker(wx, wy, amoveArmed ? 'attack' : 'move'); amoveArmed = false; UI.ack && UI.ack(myUnits, 'move');
  }
  function marker(x, y, kind) { markers.push({ x, y, kind, t: 0 }); if (markers.length > 12) markers.shift(); }
  /* --- placement --- */
  function startPlace(type, machines) { mode = 'place'; const d = BLD[type]; place = { type, machines, ok: false }; const [wx, wy] = [R.cam.x, R.cam.y]; place.tx = Math.round(wx / TILE - d.w / 2); place.ty = Math.round(wy / TILE - d.h / 2);
    if (d.ore) { const hq = G.blds.find(b => b.owner === G.local && b.type === 'hq' && !b.dead); const o = nearestOre(hq ? hq.x : R.cam.x, hq ? hq.y : R.cam.y); if (o) { place.tx = o.tx; place.ty = o.ty; R.cam.x = (o.tx + 1) * TILE; R.cam.y = (o.ty + 1) * TILE; } else G.notify(G.local, 'لا يوجد عرق حديد مكتشف وحر — استكشف الخريطة', 'warn'); }
    place.ok = G.canPlace(type, place.tx, place.ty, G.local); R.grid = 1; UI.placeMode && UI.placeMode(true, type); }
  function nearestOre(wx, wy) { let best = null, bd = 1e18; for (const o of G.map.ore) { const x = (o.tx + 1) * TILE, y = (o.ty + 1) * TILE; if (!G.exploredTo(x, y) || !G.oreSpot(o.tx, o.ty)) continue; const d = (x - wx) ** 2 + (y - wy) ** 2; if (d < bd) { bd = d; best = o; } } return best; }
  function updateGhost(sx, sy) { if (!place) return; if (BLD[place.type] && BLD[place.type].ore) { const [wx, wy] = world(sx, sy); const o = nearestOre(wx, wy); if (o) { place.tx = o.tx; place.ty = o.ty; place.ok = G.canPlace(place.type, o.tx, o.ty, G.local); } return; } const d = BLD[place.type]; const [wx, wy] = world(sx, sy); place.tx = Math.round(wx / TILE - d.w / 2); place.ty = Math.round(wy / TILE - d.h / 2); place.ok = G.canPlace(place.type, place.tx, place.ty, G.local); }
  function confirmPlace() {
    if (!place) return false; if (!place.ok) { SND.ui('nomoney'); const bd = BLD[place.type]; G.notify(G.local, bd && bd.ore ? 'ابنِ المنجم فوق عرق حديد مكشوف وحر' : bd && bd.oil ? 'ابنِ البئر داخل حقل نفط (الحلقات الذهبية) — يتسع الحقل لثلاثة آبار' : 'لا يمكن البناء هنا', 'warn'); return false; }
    const machines = sel.filter(u => u.k === 'u' && own(u) && u.def.work).map(u => u.id); let b;
    { const av = Build.buildAvailable(G, G.local, place.type); if (!av.ok) { G.notify(G.local, av.why || 'غير متاح', 'warn'); return false; } if (G.me.money < Build.bcost(G, G.local, place.type)) { G.notify(G.local, 'لا يوجد مال كافٍ', 'warn'); SND.ui('nomoney'); return false; }
      Cmd.send({ c: 'pl', b: place.type, x: place.tx, y: place.ty, m: machines }); b = true; if (G.lockstep) SND.ui('place'); }
    if (b && !(BLD[place.type] && BLD[place.type].line)) cancelMode(); else if (b) { place.ok = G.canPlace(place.type, place.tx, place.ty, G.local); }
    return !!b;
  }
  function startTarget(kind, fn, radius, label) { mode = 'target'; target = { kind, fn, radius: radius || 0, label }; UI.targetMode && UI.targetMode(true, label); }
  function cancelMode() { mode = 'normal'; place = null; target = null; R.grid = 0; UI.placeMode && UI.placeMode(false); UI.targetMode && UI.targetMode(false); }
  /* --- keyboard --- */
  function keydown(e) {
    if (G && UI.paused && !G.over && (e.code === 'Escape' || e.code === 'KeyP') && document.querySelector('#screens .pbox')) { UI.pause(); e.preventDefault(); return; } // Esc/P resumes from the pause menu
    if (!G || UI.blocking(true)) return; if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    keys.add(e.code); const k = e.code;
    if (k === 'Escape') { if (mode !== 'normal') cancelMode(); else if (sel.length) setSel([]); else UI.pause && UI.pause(); e.preventDefault(); return; }
    if (/^Digit[1-9]$/.test(k)) { const n = +k.slice(5); if (e.ctrlKey || e.metaKey) { groups[n] = sel.filter(u => u.k === 'u').map(u => u.id); for (const u of G.units) if (u.grp === n) u.grp = 0; for (const id of groups[n]) { const u = G.get(id); if (u) u.grp = n; } G.notify(G.local, 'تم حفظ المجموعة ' + n, 'info'); e.preventDefault(); } else selectGroup(n); return; }
    if (k === 'KeyA') { if (sel.some(u => u.k === 'u')) { amoveArmed = true; startTarget('amove', (x, y) => { const us = sel.filter(u => u.k === 'u' && own(u)); Cmd.order(us, { t: 'amove', x, y }); marker(x, y, 'attack'); }, 0, 'حدد هدف الهجوم والتحرك'); } }
    if (k === 'KeyS' && !e.ctrlKey) { stop(); }
    if (k === 'KeyH') { hold(); }
    if (k === 'Space') { jumpAlert(); e.preventDefault(); }
    if (k === 'KeyQ') selectArmy();
    if (k === 'KeyB' || k === 'Home') jumpHome();
    if (k === 'Delete') { const b = sel.find(x => x.k === 'b' && own(x)); if (b) Cmd.send({ c: 'sl', b: b.id }); }
    if (k === 'KeyP') UI.pause && UI.pause();
    if (k === 'Equal' || k === 'NumpadAdd') zoomAt(R.cssW / 2, R.cssH / 2, 1.15); if (k === 'Minus' || k === 'NumpadSubtract') zoomAt(R.cssW / 2, R.cssH / 2, 1 / 1.15);
  }
  function selectGroup(n) { const ids = groups[n] || []; const list = ids.map(id => G.get(id)).filter(u => u && !u.dead); if (!list.length) return; const now = performance.now(); if (sel.length && sel.every(u => list.includes(u)) && now - (selectGroup.t || 0) < 400) { const cx = list.reduce((s, u) => s + u.x, 0) / list.length, cy = list.reduce((s, u) => s + u.y, 0) / list.length; R.cam.x = cx; R.cam.y = cy; clampCam(); } selectGroup.t = now; setSel(list); }
  function saveGroup(n) { groups[n] = sel.filter(u => u.k === 'u').map(u => u.id); }
  function stop() { Cmd.order(sel.filter(u => u.k === 'u' && own(u)), { t: 'stop' }); }
  function hold() { Cmd.order(sel.filter(u => u.k === 'u' && own(u)), { t: 'hold' }); }
  function selectArmy() { setSel(G.units.filter(u => own(u) && !u.dead && !u.def.work && !u.def.harvest && !u.def.nosel)); }
  function selectScreen() { const [x0, y0, x1, y1] = R.viewRect(0); setSel(G.units.filter(u => own(u) && !u.dead && !u.def.work && !u.def.harvest && !u.def.nosel && u.x > x0 && u.x < x1 && u.y > y0 && u.y < y1)); }
  function jumpAlert() { const m = G.msgs.slice().reverse().find(m => m.x !== undefined); if (m) { R.cam.x = m.x; R.cam.y = m.y; clampCam(); } }
  function lookAt(x, y) { R.cam.x = x; R.cam.y = y; clampCam(); }
  let homeI = 0;
  function jumpHome() { const bs = G.blds.filter(b => b.owner === G.local && !b.dead && b.built >= 1); const hqs = bs.filter(b => b.type === 'hq'); const list = hqs.length ? hqs : bs; if (!list.length) { const u = G.units.find(u => own(u) && !u.dead); if (u) lookAt(u.x, u.y); return; } const b = list[homeI++ % list.length]; lookAt(b.x, b.y); }
  /* --- per-frame --- */
  function update(dt) {
    if (!G) return;
    let px = 0, py = 0; const sp = 900 / R.cam.z * dt;
    if (keys.has('ArrowLeft') || keys.has('KeyJ')) px -= sp; if (keys.has('ArrowRight') || keys.has('KeyL')) px += sp; if (keys.has('ArrowUp') || keys.has('KeyI')) py -= sp; if (keys.has('ArrowDown') || keys.has('KeyK')) py += sp;
    if (Settings.edge && mouse.in && mouse.type === 'mouse' && !ptr.size && document.hasFocus()) { const m = 14; if (mouse.x < m) px -= sp; if (mouse.x > R.cssW - m) px += sp; if (mouse.y < m) py -= sp; if (mouse.y > R.cssH - m) py += sp; }
    if (px || py) { R.cam.x += px; R.cam.y += py; clampCam(); }
    if (!ptr.size && (Math.abs(vel[0]) > 0.05 || Math.abs(vel[1]) > 0.05)) { R.cam.x += vel[0] * dt * 60; R.cam.y += vel[1] * dt * 60; vel[0] *= Math.pow(0.04, dt); vel[1] *= Math.pow(0.04, dt); clampCam(); }
    for (let i = markers.length - 1; i >= 0; i--) { markers[i].t += dt; if (markers[i].t > 0.9) markers.splice(i, 1); }
    if (sel.length) { const live = sel.filter(e => !e.dead && !e.removed && (e.k !== 'u' || !e.dying && !e.inT)); if (live.length !== sel.length) setSel(live); }
  }
  function drawWorld(G, t) {
    const pk = R.pack; const px = ATLAS.get('px');
    for (const m of markers) { const k = m.t / 0.9; const col = m.kind === 'attack' ? pk(240, 80, 60, 255 * (1 - k)) : m.kind === 'build' ? pk(240, 200, 80, 255 * (1 - k)) : pk(120, 240, 120, 255 * (1 - k)); R.over(ATLAS.get('ringthin'), m.x, m.y, 0, (0.6 - k * 0.3) * 0.8, (0.6 - k * 0.3) * 0.8, col, 8); R.over(ATLAS.get('ringthin'), m.x, m.y, 0, (0.3 + k * 0.4) * 0.8, (0.3 + k * 0.4) * 0.8, col, 8); }
    // rally line for selected building
    const b = sel.length === 1 && sel[0].k === 'b' ? sel[0] : null; if (b && b.rally && own(b)) { const [rx, ry] = b.rally; const L = Math.hypot(rx - b.x, ry - b.y), a = Math.atan2(ry - b.y, rx - b.x); for (let d = 10; d < L; d += 16) R.over(px, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, a, 2, 0.4, pk(240, 220, 120, 170), 8); R.over(ATLAS.get('flagm'), rx, ry, 0, 1, 1, pk(240, 220, 120, 255), 8); }
    if (b && own(b) && b.wp && b.wp.length) { const r = b.wp[0].d.range; R.over(ATLAS.get('ringthin'), b.x, b.y, 0, r / 32, r / 32, pk(255, 255, 255, 50), 8); }
    for (const u of sel) if (u.k === 'u' && u.goal && own(u) && sel.length <= 30) { const [gx, gy] = u.goal; R.over(px, gx, gy, PI / 4, 0.7, 0.7, pk(120, 240, 120, 140), 8); }
    if (mode === 'place' && place && place.tx !== undefined) {
      const d = BLD[place.type]; const ok = place.ok; const col = ok ? pk(90, 230, 110, 95) : pk(240, 70, 60, 110);
      for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) R.over(px, (place.tx + x + 0.5) * TILE, (place.ty + y + 0.5) * TILE, 0, (TILE - 2) / px.w, (TILE - 2) / px.h, col, 8);
      const key = G.players[G.local].f + '_' + place.type; const s = ATLAS.get(key); if (s) R.over(s, (place.tx + d.w / 2) * TILE, (place.ty + d.h / 2) * TILE, 0, 1, 1, pk(255, 255, 255, 150), 0);
    }
    if (mode === 'target' && target && target.radius && mouse.in && mouse.type === 'mouse') { const [wx, wy] = world(mouse.x, mouse.y); R.over(ATLAS.get('ringthin'), wx, wy, 0, target.radius / 32, target.radius / 32, pk(255, 120, 80, 180), 8); }
  }
  return { attach, setGame, update, drawWorld, startPlace, confirmPlace, startTarget, cancelMode, setSel, selectGroup, saveGroup, stop, hold, selectArmy, selectScreen, jumpAlert, jumpHome, lookAt, clampCam,  marker, pick,
    get sel() { return sel; }, get mode() { return mode; }, get place() { return place; }, get box() { return box; }, get groups() { return groups; },
    set boxMode(v) { boxMode = v; }, get boxMode() { return boxMode; }, set amove(v) { amoveArmed = v; }, get amove() { return amoveArmed; } };
})();
