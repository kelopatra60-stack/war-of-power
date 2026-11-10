/* ============================================================
   War of Power — رسم المعركة على الشاشة من حالة اللعبة
   الملف: js/ui/draw.js   ·   ترتيب التحميل: 31 من 43
   ============================================================ */
'use strict';
/* ===== World rendering from game state ===== */
const Draw = (function () {
  const G_ = n => ATLAS.get(n);
  const WHITE = 0xffffffff; let t = 0;
  const pk = (r, g, b, a) => R.pack(r, g, b, a);
  const FOGT = pk(150, 152, 160, 255);
  let ov = null, octx = null; // 2D overlay canvas
  function setOverlay(c) { ov = c; octx = c.getContext('2d'); }
  function lerpA(a, b, k) { return a + angNorm(b - a) * k; }
  function bldKey(G, b) { const pl = G.players[b.owner]; if (b.def.neutral) return 'neu_' + b.type; return (pl ? pl.f : (b.style || 'usa')) + '_' + b.type; }
  function drawBuilding(G, b, vis) {
    let key = bldKey(G, b); if (b.type === 'city' && (b.lvl || 1) > 1 && G_(key + ':L' + b.lvl)) key += ':L' + b.lvl; const s = G_(key); if (!s) return; const pl = G.players[b.owner]; const team = pl ? pl.tp : pk(200, 200, 200, 0);
    const tint = !vis ? FOGT : b.hit > 0 ? pk(255, 205, 195, 255) : WHITE;
    const fl = pl ? 5 : 1;
    if (b.built < 1) { // construction: excavation → steel frame rising → concrete layers stacked from the base up → final finish layer by layer
      const st = b.stages[b.stage], stg = b.stages, si = b.stage; const cs = 'cons:' + b.w + 'x' + b.h; const pr = b.works[st] ? clamp((b.prog[st] || 0) / b.works[st], 0, 1) : 0;
      R.spr(G_(cs + ':pit'), b.x, b.y, 0, 1, tint, 0, 1);
      const iF = stg.indexOf('frame'), iP = Math.max(stg.indexOf('pour'), stg.indexOf('pave')), iE = stg.indexOf('finish');
      const fr = iF < 0 ? (si > 0 ? 1 : 0) : si > iF ? 1 : si === iF ? pr : 0, po = iP < 0 ? fr : si > iP ? 1 : si === iP ? pr : 0, fi = iE < 0 ? 0 : si > iE ? 1 : si === iE ? pr : 0;
      const n = clamp(Math.round((b.def.height || 12) / 3.2), 3, 8); const raw = G_(key + ':raw') || s, frm = G_(cs + ':frame');
      const tc = vis ? (b.hit > 0 ? [255, 205, 195] : [255, 255, 255]) : [150, 152, 160]; const ta = (k, al) => pk(Math.min(255, tc[0] * k), Math.min(255, tc[1] * k), Math.min(255, tc[2] * k * 0.98), clamp(al, 0, 1) * 255);
      if (fr > 0 && frm && fi < 1) { const L = fr * n; for (let k = 0; k < n && k < L; k++) R.sub(frm, b.x, b.y, 0, 0, 1 - (k + 1) / n, 1, 1 - k / n, ta(1, clamp(L - k, 0, 1) * (1 - fi)), 0, 1); }
      if (po > 0) { const L = po * n; const top = Math.min(n - 1, Math.floor(L));
        for (let k = 0; k <= top; k++) { const al = clamp(L - k, 0, 1); if (al <= 0.02) break; const fresh = k === top && po < 1; R.sub(raw, b.x, b.y - (fresh ? (1 - al) * 6 : 0), 0, 0, 1 - (k + 1) / n, 1, 1 - k / n, ta(fresh ? 1.05 : 0.92 - k * 0.015, Math.min(1, al * 1.5)), 0, 1); }
        const sh = G_(key + ':sh'); if (sh) R.shadow(sh, b.x, b.y, 0, 1, 0, 0.6 * po); }
      if (fi > 0) { const L = fi * n; for (let k = 0; k < n; k++) { const al = clamp(L - k, 0, 1); if (al <= 0.02) break; R.sub(s, b.x, b.y, 0, 0, 1 - (k + 1) / n, 1, 1 - k / n, ta(1, al), team, fl); } }
      if (fr > 0 || po > 0) R.spr(G_(cs + ':scaf'), b.x, b.y, 0, 1, pk(255, 255, 255, (1 - fi) * 255), 0, 1);
      const lay = Math.floor(po * n * 0.999) + Math.floor(fi * n * 0.999); // each finished layer: dust puff + a heavy thud
      if (vis && b._lay !== undefined && lay > b._lay && G.allies(b.owner, G.local)) { const yy = b.y + b.h * 16 - ((lay % n) + 1) / n * b.h * 32; FX.dust(b.x, yy, 3, Math.min(60, b.w * 10), [176, 170, 156]); SND.at('place', b.x, b.y, 0.5); }
      b._lay = lay; return;
    }
    const lsc = LVL_SCALE[(b.lvl || 1) - 1] || 1; // upgraded buildings grow
    const sh = G_(key + ':sh'); if (sh) R.shadow(sh, b.x, b.y, 0, lsc, 0, 1);
    R.spr(s, b.x, b.y, 0, lsc, tint, team, fl);
    if (pl && ((b.lvl || 1) > 1 || b.aa)) { // rooftop guns: HQ defences by level, bought air-defence tiers
      const fk = pl.f, hw = b.w * 16 * lsc - 12, hh = b.h * 16 * lsc - 12, T = [];
      if (b.type === 'hq') { if (b.lvl >= 2) T.push([fk + '_mg:tur', -hw, hh, 1]); if (b.lvl >= 3) T.push([fk + '_atg:tur', hw, -hh, 1]); }
      else if (b.lvl >= 2) { T.push(['sandbag', -hw, hh, 0.9]); if (b.lvl >= 3) T.push(['sandbag', hw, -hh, 0.9]); }
      if (b.aa >= 1) T.push([fk + '_shorad:tur', hw, hh, 1]); if (b.aa >= 2) T.push([fk + '_shorad:tur', -hw, -hh, 1]); if (b.aa >= 3) T.push([fk + '_sam:tur', 0, -hh + 6, 0.75]);
      for (const [k, dx, dy, s2] of T) { const ts = G_(k); if (!ts) continue; const ang = k === 'sandbag' ? 0 : b.ta; R.shadow(ts, b.x + dx, b.y + dy, ang, s2, 6, 0.8); R.spr(ts, b.x + dx, b.y + dy, ang, s2, tint, k === 'sandbag' ? 0 : team, k === 'sandbag' ? 1 : 5); } }
    if (vis && (G.tod === 'night' || G.tod === 'dusk') && b.type !== 'wall' && pl) { // base floodlights after dark
      const Lg = G_('light'), hw = b.w * 16, hh = b.h * 16, k = G.tod === 'night' ? 0.34 : 0.14, rad = 44 + b.w * 7;
      R.light(Lg, b.x - hw + 7, b.y + hh - 7, rad, 1, 0.8, 0.52, k); R.light(Lg, b.x + hw - 7, b.y - hh + 7, rad, 1, 0.8, 0.52, k);
      if (b.w >= 4) { R.light(Lg, b.x + hw - 7, b.y + hh - 7, rad, 0.95, 0.85, 0.62, k * 0.8); R.light(Lg, b.x - hw + 7, b.y - hh + 7, rad * 0.8, 0.95, 0.85, 0.62, k * 0.7); } }
    if (!pl && b.def.neutral) { // neutral: owner marker when captured handled by pl
    }
    const f = pl ? pl.f : null;
    // animated parts
    if (b.type === 'ops' && f) R.spr(G_(f + '_ops:dish'), b.x - 10, b.y - 10, t * 0.9 + b.id, 1, tint, team, 1);
    else if ((b.type === 'mg' || b.type === 'atg') && f) { const ts = G_(f + '_' + b.type + ':tur'); R.shadow(ts, b.x, b.y, b.ta, 1, 6, 0.8); R.spr(ts, b.x, b.y, b.ta, 1, tint, team, 5); }
    else if (b.type === 'sam' && f) { const ts = G_(f + '_sam:tur'); const ra = SAM_VLS[f] ? -0.35 : b.ta; R.shadow(ts, b.x, b.y, ra, 1.15, SAM_VLS[f] ? 12 : 7, 0.8); R.spr(ts, b.x, b.y, ra, 1.15, tint, team, 5); const ds = G_(f + '_sam:dish'); R.spr(ds, b.x - 26, b.y - 26, t * 1.6 + b.id, 1, tint, team, 1); }
    else if (b.type === 'shorad' && f) { const ts = G_(f + '_shorad:tur'); R.shadow(ts, b.x, b.y, b.ta, 1.35, 6, 0.8); R.spr(ts, b.x, b.y, b.ta, 1.35, tint, team, 5); }
    else if (b.type === 'radar') { const as = G_('radar:ant'); R.shadow(as, b.x + 28, b.y - 28, t * 1.9 + b.id, 1, 5, 0.6); R.spr(as, b.x + 28, b.y - 28, t * 1.9 + b.id, 1, tint, 0, 1); }
    else if (b.type === 'power' && f === 'eu') { const bl = G_('eu_power:blade'); for (const [dx, dy] of [[20, -18], [20, 20]]) { R.shadow(bl, b.x + dx, b.y + dy, t * 2.5 + dx, 1, 30, 0.5); R.spr(bl, b.x + dx, b.y + dy, t * 2.5 + dx + dy, 1, tint, 0, 1); } }
    else if (b.type === 'super' && f) { const ls = G_(f + '_super:launcher'); const ready = pl.superReady; const ang = -PI / 2 + (ready ? 0 : 0.0); R.shadow(ls, b.x, b.y + 4, ang, 1, 8, 0.8); R.spr(ls, b.x, b.y + 4, ang, 1, tint, team, 5); if (ready) { R.spr(G_('glow'), b.x, b.y - 30, 0, 1.2 + Math.sin(t * 6) * 0.2, pk(255, 80, 60, 200), 0, 0, 1); R.light(G_('light'), b.x, b.y, 120, 1, 0.2, 0.15, 0.8); } }
    // smoke stacks
    if (vis && b.type === 'power' && f !== 'eu' && Math.random() < 0.08) FX.smoke(b.x - 23, b.y + 22, 1, 14, false, 3.5, 30);
    if (vis && b.type === 'fact' && Math.random() < 0.08) FX.smoke(b.x + 38, b.y - 40, 1, 16, true, 4, 30);
    // capture bar for neutrals
    if (b.cap > 0 && b.capBy >= 0) BARS.push({ x: b.x, y: b.y - b.h * 16, bw: 64, f: b.cap, k: 'p', rgb: G.players[b.capBy].rgb });
  }
  
  function hiddenFromMe(G, u) { return false; }
  function drawUnitGround(G, u, a, x, y, sel) {
    const d = u.def, team = G.players[u.owner].tp; const tint = u.hit > 0.1 ? pk(255, 210, 200, 255) : WHITE;
    if (d.cls === 'inf') {
      let fr = 0; const moving = u.spd > 2; const crew = INF_KIT[d.role] && (INF_KIT[d.role].mortar || INF_KIT[d.role].tow); if (u.flash > 0) fr = 4; else if (moving) fr = Math.floor(u.anim) % 4; else fr = u.tid ? 5 : crew ? 6 : 0;
      const s = G_(u.type + ':f' + fr); const ang = lerpA(u.pa, u.a, a);
      R.shadow(s, x, y, ang, 1.15, 2.4, 0.7); R.spr(s, x, y, ang, 1.15, tint, team, 5); return; // drawn a touch larger than life so kit and silhouettes read on phones
    }
    const va = VART[u.type]; let hull = G_(u.type + ':hull'); if (!hull) return;
    if (va.legs && u.spd > 2) hull = G_(u.type + ':walk' + (1 + (Math.floor(u.anim || 0) & 1))) || hull; // walkers: alternate the two stride frames
    let ang = lerpA(u.pa, u.a, a); let hx = x, hy = y; const ta = lerpA(u.pta, u.ta, a);
    if (va.hover) { hy += Math.sin(t * 3.1 + u.id) * 0.7; const hc = d.role === 'fxbike' ? [1, 0.4, 0.3] : [0.35, 1, 0.55]; R.light(G_('light'), x, y, 34 + d.r * 1.6, hc[0], hc[1], hc[2], 0.45); } // hover craft float on light
    const rec = u.recoil > 0 ? u.recoil : 0; if (rec && va.gl > 14) { hx -= Math.cos(ta) * rec * 0.6; hy -= Math.sin(ta) * rec * 0.6; }
    if (u.work && d.role === 'eng') { const k = Math.sin(t * 2.4 + u.id) * 3; hx += Math.cos(ang) * k; hy += Math.sin(ang) * k; }
    R.shadow(hull, hx, hy, ang, 1, va.hover ? 11 : 4, va.hover ? 0.7 : 0.9); R.spr(hull, hx, hy, ang, 1, tint, team, 5);
    if (va.ex && d.work && (u.work || u.spd > 4) && t - (u._exT || 0) > 0.42) { u._exT = t; const c = Math.cos(ang), sn = Math.sin(ang); FX.exhaust(hx + c * va.ex[0] - sn * va.ex[1], hy + sn * va.ex[0] + c * va.ex[1], u.work ? 1.15 : 0.9); }
    const tx = hx + Math.cos(ang) * (va.tx || 0), ty = hy + Math.sin(ang) * (va.tx || 0);
    const tur = G_(u.type + ':tur'), gun = G_(u.type + ':gun');
    let tang = ta;
    // artillery and rocket launchers elevate before firing: seen from above the raised barrel / launcher pod foreshortens
    if (va.fixT) tang = ang; // vertical-launch canisters are erected in line with the truck
    const art = d.role === 'arty' || d.role === 'mlrs' || d.role === 'tos' || d.role === 'sam2'; if (art) { const want = (u.tid || u.forceGround || (u.w && u.w.some(ws => ws.tid))) && u.spd < 4 ? 1 : 0; u._elev = (u._elev || 0) + (want - (u._elev || 0)) * 0.05; }
    const el = art ? u._elev : 0; const gsx = 1 - el * 0.34, tsx = d.role === 'mlrs' || d.role === 'tos' || d.role === 'sam2' ? 1 - el * 0.3 : 1;
    if (gun) { const gl = ((va.gx || 0) - (rec * (WPN[d.w[0]] && WPN[d.w[0]].recoil || 2))) * (art ? 1 - el * 0.3 : 1); const gx = tx + Math.cos(tang) * gl, gy = ty + Math.sin(tang) * gl; R.shadow(gun, gx, gy, tang, 1, 6 + el * 10, 0.9); R.spr2(gun, gx, gy, tang, gsx, 1, tint, team, 5); }
    if (tur) { const te = el > 0.55 && G_(u.type + ':turE'); const ts = te || tur, sx = te ? 1 : tsx; // raised launchers swap to the sprite that shows the tube mouths
      const pos = va.mt ? va.mt.map(o => [hx + Math.cos(ang) * o, hy + Math.sin(ang) * o]) : [[tx, ty]];
      for (const [px, py] of pos) { R.shadow(ts, px, py, tang, 1, 6 + el * 7, 0.9); R.spr2(ts, px + 1.3, py + 1.7, tang, sx, 1, pk(0, 0, 0, 80), 0, 8); R.spr2(ts, px, py, tang, sx, 1, tint, team, 5); } }
    if (va.arm) { const boom = G_(u.type + ':boom'), bk = G_(u.type + ':bucket'); const ph = u.work ? Math.sin(t * 1.6 + u.id) : 0.6; const bx = tx + Math.cos(tang) * 4, by = ty + Math.sin(tang) * 4; const L = 15 + ph * 5; R.spr(boom, bx, by, tang, (L + 5) / 20, tint, 0, 5); const ex = bx + Math.cos(tang) * L, ey = by + Math.sin(tang) * L; R.spr(bk, ex, ey, tang + ph * 0.4, 1, tint, 0, 5); }
    if (va.dish) { const ds = G_(u.type + ':dish'); const dx = tx + Math.cos(tang) * (va.dish.x || 0), dy = ty + Math.sin(tang) * (va.dish.x || 0); R.spr(ds, dx, dy, t * 3 + u.id, 1, tint, team, 1); }
  }
  function drawAir(G, u, a, x, y) {
    const d = u.def, team = G.players[u.owner].tp; const ang = lerpA(u.pa, u.a, a); const z = lerp(u.pz === undefined ? u.z : u.pz, u.z, a);
    const body = G_(u.type + ':body'); if (!body) return; const tint = u.hit > 0.1 ? pk(255, 210, 200, 255) : u.dying ? pk(150, 130, 120, 255) : WHITE;
    const sc = 1 + z / 900; R.shadow(body, x, y, ang, sc * 0.95, z * 0.55, Math.max(0.35, 0.8 - z / 600));
    R.spr(body, x, y, ang, sc, tint, team, 5);
    const A = AART[u.type]; if (!A) return;
    if (A.rotor) { const ro = G_(u.type + ':rotor'); const rx = x + Math.cos(ang) * (A.rx || 0) * sc, ry = y + Math.sin(ang) * (A.rx || 0) * sc; const spin = A.ufo ? t * 2.4 : (u.z > 2 || u.state !== 'park') ? t * 38 : t * 4;
      if (A.ufo) R.light(G_('light'), x, y, 90, 0.75, 0.45, 1, 0.5);
      R.shadow(ro, rx, ry, spin, sc, z * 0.55, 0.25); R.spr(ro, rx, ry, spin, sc, WHITE, 0, 0); if (A.coax) R.spr(ro, rx, ry, -spin * 1.03, sc * 0.97, WHITE, 0, 0);
      if (A.tailR) { const tr = G_(u.type + ':trotor'); const c = Math.cos(ang), s = Math.sin(ang); R.spr(tr, x + (c * A.tailR[0] - s * A.tailR[1]) * sc, y + (s * A.tailR[0] + c * A.tailR[1]) * sc, t * 60, sc, WHITE, 0, 0); } }
    if (A.prop) { const pp = G_(u.type + ':prop'); const c = Math.cos(ang), s = Math.sin(ang); R.spr(pp, x + c * A.prop[0] * sc, y + s * A.prop[0] * sc, t * 50, sc, WHITE, 0, 0); }
    if (u.load && u.load.length && u.z < 6) R.over(G_('ringthin'), x, y, 0, d.r * 1.3 / 33, d.r * 1.3 / 33, pk(240, 220, 120, 120 + 80 * Math.sin(t * 5)), 8);
    if (A.nozzles && u.z > 20 && u.state !== 'park') { const c = Math.cos(ang), s = Math.sin(ang); for (const [nx, ny, r] of A.nozzles) { const gx = x + (c * nx - s * ny) * sc, gy = y + (s * nx + c * ny) * sc; R.spr(G_('exhaust'), gx, gy, ang, 0.9 + Math.random() * 0.3, pk(255, 210, 160, 220), 0, 0, 1); } R.light(G_('light'), x - c * 20, y - s * 20, 60, 1, 0.6, 0.3, 0.5); }
  }
  function drawProj(G, p, a) {
    if (p.t === 'c4') { if (Math.floor(p.life * 4) % 2) R.spr(G_('glow'), p.x, p.y, 0, 0.35, pk(255, 40, 30, 255), 0, 0, 1); return; }
    const x = lerp(p.px === undefined ? p.x : p.px, p.x, a), y = lerp(p.py === undefined ? p.y : p.py, p.y, a), z = lerp(p.pz === undefined ? p.z : p.pz, p.z, a);
    const yy = y - z * 0.25; 
    if (p.t === 'shell' && p.w && p.w.fxk === 'plasma') { const gl = G_('glow'); R.spr(gl, x, yy, 0, 0.95, pk(110, 255, 130, 255), 0, 0, 1); R.spr(gl, x, yy, 0, 0.42, pk(235, 255, 235, 255), 0, 0, 1); R.light(G_('light'), x, y, 70, 0.4, 1, 0.5, 0.7); if (Math.random() < 0.6) FX.spawn({ x, y: yy, max: 0.35, s0: 0.5, s1: 0.1, spr: 'glow', add: true, layer: 3, c0: [140, 255, 150, 200], c1: [60, 200, 90, 0] }); return; }
    if (p.t === 'shell') { const sp = G_('tracer'); R.spr2(sp, x, yy, p.ang, p.dt === 'ap' ? 1.4 : 0.9, p.dt === 'ap' ? 1.2 : 1.6, pk(255, 230, 190, 255), 0, 0, 1); return; }
    if (p.t === 'rocket') { R.spr(G_('rocket'), x, yy, p.ang, 1, WHITE, 0, 1); R.spr(G_('exhaust'), x - Math.cos(p.ang) * 3, yy - Math.sin(p.ang) * 3, p.ang, 0.8, WHITE, 0, 0, 1); return; }
    if (p.t === 'missile' || p.t === 'aamis') { const s = G_('msl'); R.shadow(s, x, y, p.ang, 1, Math.max(2, z * 0.4), 0.5); R.spr(s, x, yy, p.ang, 1, WHITE, 0, 1); R.spr(G_('exhaust'), x - Math.cos(p.ang) * 5, yy - Math.sin(p.ang) * 5, p.ang, 1, WHITE, 0, 0, 1); return; }
    if (p.t === 'arty' || p.t === 'mlrs') {
      const sk = p.special === 'cruise' ? 'cruise' : p.special ? 'ballistic' : p.t === 'mlrs' ? 'rocket' : 'shell'; const s = G_(sk); const sc = (p.special ? 1 : 1) * (1 + z / 500);
      // direction of travel on screen including arc
      const f = Math.min(1, p.life / p.T); const da = p.ang; const pitch = (p.special || p.t === 'mlrs') ? Math.atan2(-(4 * p.apex * (1 - 2 * f)) * 0.25 / Math.max(1, p.T), 1) : 0;
      R.shadow(s, x, y, da, sc * 0.8, 0, 0.35); R.spr(s, x, yy, da + pitch * Math.sign(Math.cos(da)) * 0.3, sc, WHITE, 0, 1);
      if (p.special || p.t === 'mlrs') { R.spr(G_('exhaust'), x - Math.cos(da) * 6 * sc, yy - Math.sin(da) * 6 * sc, da, 1.2 * sc, WHITE, 0, 0, 1); if (p.special) { R.light(G_('light'), x, y, 80, 1, 0.6, 0.3, 0.6); if (Math.random() < 0.6) FX.smoke(x, yy, 1, 12, false, 2.5); } }
      return;
    }
    if (p.t === 'bomb') { const s = G_('bomb'); R.shadow(s, x, y, p.ang, 1, 0, 0.4); R.spr(s, x, yy, p.ang, 1 + z / 400, WHITE, 0, 1); return; }
  }
  function particles(layer) {
    const P = FX.P; const n = FX.maxP;
    for (let i = 0; i < n; i++) {
      const p = P[i]; if (!p.on || p.layer !== layer) continue; const s = G_(p.spr); if (!s) continue;
      const k = p.life / p.max; const c0 = p.c0, c1 = p.c1; let al = lerp(c0[3], c1[3], k); if (p.fade && k > p.fade) al *= (1 - k) / (1 - p.fade);
      const col = pk(lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k), clamp(al, 0, 255));
      const sz = lerp(p.s0, p.s1, k); const y = p.y - p.z * 0.25;
      if (p.len) { R.spr2(s, p.x, y, p.r, p.len / (s.w || 16), sz, col, 0, 0, 1); continue; } // a beam laid along its whole length
      if (p.stretch) { const sp = Math.hypot(p.vx, p.vy); const ang = Math.atan2(p.vy, p.vx); R.spr2(s, p.x, y, ang, sz * (0.6 + sp / 300), sz, col, 0, 0, 1); }
      else if (p.add) R.spr(s, p.x, y, p.r, sz, col, 0, 0, 1);
      else R.spr(s, p.x, y, p.r, sz, col, 0, p.lit ? 1 : 0, 0);
    }
  }
  function frame(G, a, dt) {
    t += dt; const cam = R.cam; const [x0, y0, x1, y1] = R.viewRect(90); const inV = (x, y, m) => x > x0 - (m || 0) && x < x1 + (m || 0) && y > y0 - (m || 0) && y < y1 + (m || 0);
    const me = G.local; const sh = FX.shake; const sx = sh ? (Math.random() - 0.5) * sh : 0, sy = sh ? (Math.random() - 0.5) * sh : 0; cam.x += sx; cam.y += sy; BARS.length = 0; SHK[0] = sx; SHK[1] = sy;
    // roads
    const m = G.map;
    // iron veins: rusty rock where a mine can be sunk
    for (const o of m.ore) { const ox = (o.tx + 1) * TILE, oy = (o.ty + 1) * TILE; if (!inV(ox, oy, 60) || !G.visibleTo(me, ox, oy)) continue; R.spr(G_('orefld'), ox, oy, (o.tx * 7 + o.ty) % 6, 1, WHITE, 0, 1); }
    // decals
    for (const d of FX.D) { if (!inV(d.x, d.y, 40)) continue; const k = d.t / d.life; const al = (k > 0.75 ? (1 - k) / 0.25 : 1) * d.a; R.spr(G_(d.spr), d.x, d.y, d.r, d.s, pk(255, 255, 255, al * 255), 0, 1); }
    // building ruins & wrecks (ground)
    for (const w of G.wrecks) {
      if (!inV(w.x, w.y, 120)) continue; if (!G.visibleTo(me, w.x, w.y)) continue;
      if (w.bld) { const pl = G.players[w.owner]; const key = (pl ? pl.f : 'neu') + '_' + w.type + ':ruin'; const s = G_(key); if (s && !w.sold) R.spr(s, w.x, w.y, 0, 1, WHITE, 0, 1); else if (w.sold) R.spr(G_('rubble'), w.x, w.y, 0, w.w * 0.6, pk(255, 255, 255, 255 * (1 - w.t / w.life)), 0, 1);
        if (w.t < w.fire && (w.ft = (w.ft || 0) - (dt || 0.016)) <= 0) { w.ft = 0.07 + Math.random() * 0.05; const fx = w.x + (Math.random() - 0.5) * w.w * 24, fy = w.y + (Math.random() - 0.5) * w.h * 24; FX.fireball(fx, fy, 1, 18, 0.6); if (Math.random() < 0.45) FX.smoke(fx, fy, 1, 26, true, 5); } if (w.t < w.fire) R.light(G_('light'), w.x, w.y, w.w * 30, 1, 0.5, 0.2, 0.5 + Math.random() * 0.2); continue; }
      if (w.inf) { const s = (w.vk && G_(w.type + w.vk + ':dead')) || G_(w.type + ':dead'); const al = w.t > w.life - 3 ? (w.life - w.t) / 3 : 1; R.spr(s, w.x, w.y, w.a, 1, pk(255, 255, 255, al * 255), G.players[0] ? 0 : 0, 1); continue; }
      const s = G_(w.type + (w.air ? ':wreck' : ':wreck')); const al = w.t > w.life - 6 ? (w.life - w.t) / 6 : 1; const col = pk(255, 255, 255, al * 255);
      if (s) { R.shadow(s, w.x, w.y, w.a, 1, 2, al * 0.7); R.spr(s, w.x, w.y, w.a, 1, col, 0, 1); }
      const va = VART[w.type]; if (va && va.tur && !w.turretOff) { const ts = G_(w.type + ':wtur'); const tx = w.x + Math.cos(w.a) * (va.tx || 0), ty = w.y + Math.sin(w.a) * (va.tx || 0); R.spr(ts, tx, ty, w.ta, 1, col, 0, 1); }
      if (w.t < w.fire && (w.ft = (w.ft || 0) - (dt || 0.016)) <= 0) { const k = w.t / w.fire; w.ft = 0.06 + k * 0.12; if (k < 0.7) FX.fireball(w.x + (Math.random() - 0.5) * 10, w.y + (Math.random() - 0.5) * 10, 1, 14 * (1 - k * 0.5), 0.5); if (Math.random() < 0.55) FX.smoke(w.x, w.y, 1, 18, true, 4.5); }
      else if (w.t >= w.fire && w.t < w.fire + 20 && (w.ft = (w.ft || 0) - (dt || 0.016)) <= 0) { w.ft = 0.35; FX.smoke(w.x, w.y, 1, 14, false, 3.5); }
      if (w.t < w.fire) R.light(G_('light'), w.x, w.y, 70 * (1 - w.t / w.fire * 0.5), 1, 0.5, 0.2, (0.5 + Math.random() * 0.25) * (1 - w.t / w.fire * 0.6));
    }
    particles(1);
    // buildings
    for (const b of G.blds) {
      if (!inV(b.x, b.y, b.w * 18)) continue; const ally = G.allies(b.owner, me);
      if (!ally && !G.visibleTo(me, b.x, b.y)) continue; const vis = true;
      drawBuilding(G, b, vis);
      if (b.sel) { R.spr(G_('ringthin'), b.x, b.y, 0, Math.max(b.w, b.h) * 32 * 0.75 / 33, pk(120, 240, 120, 230), 0, 8); }
    }
    // trees
    const tw = Math.sin(t * 0.9) * 0.015;
    for (const tr of m.trees) { if (!tr.alive) continue; if (tr.x < x0 - 30 || tr.x > x1 + 30 || tr.y < y0 - 30 || tr.y > y1 + 30) continue; if (!G.visibleTo(me, tr.x, tr.y)) continue; const s = G_(tr.t); if (!s) continue; R.shadow(s, tr.x, tr.y, tr.r, tr.s, 10 * tr.s, 0.85); R.spr(s, tr.x, tr.y, tr.r + tw * (tr.x % 3), tr.s, WHITE, 0, 1); }
    for (const pr of m.props) { if (!inV(pr.x, pr.y, 20)) continue; const s = G_(pr.t); if (!s) continue; R.shadow(s, pr.x, pr.y, pr.r, pr.s, 3, 0.6); R.spr(s, pr.x, pr.y, pr.r, pr.s, WHITE, 0, 1); }
    // debris objects (falling trees, tossed turrets, parachutes)
    for (const d of FX.DEB) {
      if (!inV(d.x, d.y, 60)) continue; const s = G_(d.spr); if (!s) continue;
      if (d.tree) { const f = d.fall || 0; const al = d.t > d.life - 2 ? (d.life - d.t) / 2 : 1; const c = d.burn ? pk(90, 70, 55, al * 255) : pk(255, 255, 255, al * 255); R.spr2(s, d.x + Math.cos(d.fallA) * f * 10, d.y + Math.sin(d.fallA) * f * 10, d.r, d.s * (1 - f * 0.25), d.s * (1 + f * 0.35), c, 0, 1); continue; }
      if (d.chute) continue;
      R.shadow(s, d.x, d.y, d.r, 1, Math.max(1, d.z * 0.6), 0.7); R.spr(s, d.x, d.y - d.z * 0.25, d.r, 1 + d.z / 300, WHITE, 0, 1);
    }
    // ground units
    const sel = []; const air = [];
    for (const u of G.units) {
      if (u.dead) continue; const x = lerp(u.px, u.x, a), y = lerp(u.py, u.y, a); if (!inV(x, y, 50)) continue;
      const ally = G.allies(u.owner, me); if (!ally && !G.visibleTo(me, x, y)) continue;
      if (!ally && !G.fog.all && hiddenFromMe(G, u)) continue;
      if (u.def.cls === 'air' || u.para > 0) { air.push([u, x, y]); continue; }
      if (u.sel) R.spr(G_('ringthin'), x, y, 0, u.def.r * 1.5 / 33, u.owner === me ? pk(120, 240, 120, 230) : pk(240, 90, 80, 230), 0, 8);
      drawUnitGround(G, u, a, x, y);
      if (G.tod === 'night' && u.def.cls === 'veh') { const ang = u.a, rr = u.def.r; R.light(G_('light'), x + Math.cos(ang) * rr * 2.1, y + Math.sin(ang) * rr * 2.1, 30 + rr * 1.5, 1, 0.94, 0.78, 0.2); } // headlights
      if (u.sel || (Settings.bars === 'always') || (Settings.bars === 'damaged' && u.hp < u.maxHp * 0.999 && G.t - (u.lastHitT || -99) < 8)) sel.push([u, x, y]);
    }
    for (const p of G.proj) { if (!inV(p.x, p.y, 40)) continue; if (p.owner !== me && !G.visibleTo(me, p.x, p.y) && p.t !== 'arty' && p.t !== 'mlrs') continue; drawProj(G, p, a); }
    particles(2); particles(3);
    // air units
    for (const [u, x, y] of air) {
      if (u.para > 0) { const z = u.para * 70; const ch = G_('chute'); const s = G_(u.type + ':f0'); R.shadow(ch, x, y, 0, 1, z * 0.5, 0.4); R.spr(s, x, y - z * 0.25, u.a, 1, WHITE, G.players[u.owner].tp, 5); R.spr(ch, x, y - z * 0.25 - 4, Math.sin(t + u.id) * 0.2, 1 + z / 300, WHITE, 0, 1); continue; }
      if (u.sel) R.spr(G_('ringthin'), x, y, 0, u.def.r * 1.6 / 33, u.owner === me ? pk(120, 240, 120, 200) : pk(240, 90, 80, 200), 0, 8);
      drawAir(G, u, a, x, y); if (u.sel || (Settings.bars !== 'selected' && u.hp < u.maxHp && G.t - (u.lastHitT || -99) < 8)) sel.push([u, x, y]);
    }
    for (const f of FX.FB) { if (f.t < 0) continue; const s = G_(f.spr); if (!s) continue; const k = f.sc || 1.05; R.shadow(s, f.x, f.y, f.a, k, f.z * 0.55, 0.45); R.spr(s, f.x, f.y - (f.dz ? f.z * 0.25 : 0), f.a, k + (f.big ? 0.3 : 0), WHITE, f.tp, 5); }
    particles(4);
    // lights from fx
    for (const l of FX.L) { const k = 1 - l.t / l.life; R.light(G_('light'), l.x, l.y, l.rad, l.r, l.g, l.b, k * k * l.k * 0.6); }
    // health bars / veterancy (overlay batch)
    for (const [u, x, y] of sel) { const f = clamp(u.hp / u.maxHp, 0, 1); BARS.push({ x, y: y - u.def.r - (u.def.cls === 'air' ? u.z * 0.25 : 0), r: u.def.r, f, k: u.def.cls === 'inf' ? 'i' : u.def.cls === 'air' ? 'a' : 'v', rank: u.rank || 0, cargo: u.cargo > 0, load: u.load ? u.load.length : 0, sel: !!u.sel, own: u.owner === me }); }
    for (const b of G.blds) { if (!inV(b.x, b.y, 60)) continue; const ally = G.allies(b.owner, me); const top = b.y - b.h * 16;
      if (b.built < 1 && ally) { BARS.push({ x: b.x, y: top, bw: b.w * 32, f: b.built, k: 'c' }); continue; } if (b.owner < 0) continue;
      if ((b.sel || (Settings.bars === 'always' && ally) || (b.hp < b.maxHp * 0.999 && G.t - (b.lastHitT || -99) < 10)) && (ally || G.visibleTo(me, b.x, b.y))) BARS.push({ x: b.x, y: top, bw: b.w * 32, f: clamp(b.hp / b.maxHp, 0, 1), k: 'b', rank: Math.max(0, (b.lvl || 1) - 1), prod: ally && b.q.length && b.sel ? b.q[0].t / b.q[0].T : -1 });
      if (ally && b.upg) BARS.push({ x: b.x, y: top - 8, bw: b.w * 32, f: b.upg.t / b.upg.T, k: 'c' });
      if (b.repairing && ally) R.over(G_('xmark'), b.x, b.y, PI / 4, 0.8, 0.8, pk(120, 220, 255, 220 * (0.6 + 0.4 * Math.sin(t * 6))), 8); }
    Input.drawWorld && Input.drawWorld(G, t);
    cam.x -= sx; cam.y -= sy;
  }
  /* ---- health / progress bars: screen space, constant size at every zoom, segmented, rank chevrons ---- */
  const BARS = []; const SHK = [0, 0];
  function hpRGB(f) { return f > 0.6 ? ['#b5ec86', '#5fae3e'] : f > 0.3 ? ['#ffd96b', '#d4952a'] : ['#ff8a68', '#c43c25']; }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
  function chev(c, x, y, n) { c.save(); c.strokeStyle = '#f6d77e'; c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round'; c.shadowColor = 'rgba(20,20,10,.8)'; c.shadowBlur = 2; for (let i = 0; i < n; i++) { const yy = y + 2.5 - i * 3; c.beginPath(); c.moveTo(x - 3.2, yy - 1.6); c.lineTo(x, yy + 1.2); c.lineTo(x + 3.2, yy - 1.6); c.stroke(); } c.restore(); }
  function drawBars(c) {
    if (!BARS.length) return; const z = R.cam.z; c.save();
    for (const b of BARS) {
      const [sx, sy] = R.w2s(b.x - SHK[0], b.y - SHK[1]); let w, h, gap;
      if (b.k === 'i') { w = 16; h = 3; gap = 5; } else if (b.k === 'v' || b.k === 'a') { w = clamp(b.r * 2.4 * Math.sqrt(z), 22, 40); h = 4; gap = 6; } else { w = clamp(b.bw * z * 0.55, 40, 110); h = 5; gap = 6; }
      const x = Math.round(sx - w / 2) + 0.5, y = Math.round(sy - gap - h) + 0.5;
      if (y < -10 || x < -w - 10 || y > c.canvas.height || x > c.canvas.width) continue;
      // frame
      c.fillStyle = 'rgba(24,26,16,.82)'; rrect(c, x - 1, y - 1, w + 2, h + 2, 2); c.fill();
      let col; if (b.k === 'c') col = ['#a9d8ff', '#4f8fd0']; else if (b.k === 'p') col = ['rgb(' + b.rgb.join(',') + ')', 'rgb(' + b.rgb.map(v => v * 0.7 | 0).join(',') + ')']; else col = hpRGB(b.f);
      const fw = Math.max(b.f > 0 ? 1.5 : 0, (w) * clamp(b.f, 0, 1));
      if (fw > 0) { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); c.fillStyle = g; rrect(c, x, y, fw, h, 1.5); c.fill(); }
      // segment ticks (every 25% for units, every 10% for buildings)
      const seg = b.k === 'i' ? 0 : b.k === 'b' ? 10 : 4; if (seg) { c.fillStyle = 'rgba(24,26,16,.55)'; for (let i = 1; i < seg; i++) c.fillRect(Math.round(x + w * i / seg), y, 1, h); }
      if (b.sel && b.own) { c.strokeStyle = 'rgba(245,239,220,.55)'; c.lineWidth = 1; rrect(c, x - 1.5, y - 1.5, w + 3, h + 3, 2.5); c.stroke(); }
      if (b.prod >= 0) { const py = y + h + 3; c.fillStyle = 'rgba(24,26,16,.8)'; c.fillRect(x - 1, py - 1, w + 2, 4); c.fillStyle = '#f1d78f'; c.fillRect(x, py, w * clamp(b.prod, 0, 1), 2); }
      if (b.rank) chev(c, x - 6, y + h / 2, Math.min(3, b.rank));
      if (b.cargo) { c.fillStyle = '#f2c94c'; c.fillRect(x + w + 3, y, 3, h); }
      if (b.load) { c.fillStyle = '#f4dc8a'; for (let k = 0; k < Math.min(10, b.load); k++) c.fillRect(x + 1 + k * 3.2, y + h + 2.5, 2, 2); }
    }
    c.restore();
  }
  // 2D overlay: floating texts, selection box
  function overlay(G) {
    if (!octx) return; const W = ov.width, H = ov.height, dpr = ov._dpr || 1; octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H); octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBars(octx);
    octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.font = '700 13px "Noto Kufi Arabic", "Noto Sans Arabic", Tahoma, system-ui, sans-serif';
    for (const tx of FX.T) { const [x, y] = R.w2s(tx.x, tx.y); const al = 1 - tx.t / tx.life; octx.globalAlpha = clamp(al * 1.4, 0, 1); octx.lineWidth = 3; octx.strokeStyle = 'rgba(0,0,0,0.65)'; const s = TR(tx.txt); octx.strokeText(s, x, y); octx.fillStyle = tx.col; octx.fillText(s, x, y); }
    octx.globalAlpha = 1;
    const box = Input.box; if (box) { const x = Math.min(box[0], box[2]), y = Math.min(box[1], box[3]), w = Math.abs(box[2] - box[0]), h = Math.abs(box[3] - box[1]); octx.fillStyle = 'rgba(120,230,120,0.12)'; octx.strokeStyle = 'rgba(150,240,150,0.9)'; octx.lineWidth = 1.2; octx.fillRect(x, y, w, h); octx.strokeRect(x + 0.5, y + 0.5, w, h); }
  }
  return { frame, overlay, setOverlay,  get t() { return t; } };
})();
