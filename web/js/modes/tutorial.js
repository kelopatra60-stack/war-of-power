/* ============================================================
   War of Power — التدريب
   الملف: js/modes/tutorial.js   ·   ترتيب التحميل: 39 من 43
   ============================================================ */
'use strict';
/* ===== Tutorial ===== */
const Tut = (function () {
  let step = 0, G = null, el = null, t0 = 0, cam0 = null, done = false;
  const STEPS = [
    { txt: 'أهلاً بك أيها القائد! اسحب بإصبع واحد لتحريك الكاميرا، وباعد إصبعين للتكبير (أو استخدم الفأرة والعجلة).', chk: () => cam0 && Math.hypot(R.cam.x - cam0[0], R.cam.y - cam0[1]) > 120 || Math.abs(R.cam.z - cam0[2]) > 0.15 },
    { txt: 'هذه العربة الهندسية المدرعة، آلة البناء الوحيدة. المسها لتحديدها.', hl: null, chk: () => Input.sel.some(u => u.k === 'u' && u.def.role === 'eng'), look: () => { const d = G.units.find(u => u.owner === 0 && u.def.role === 'eng'); if (d) Input.lookAt(d.x, d.y); } },
    { txt: 'ظهرت لوحة البناء على اليمين. اختر «محطة كهرباء»، ثم حرّكها قرب المقر واضغط ✓ للتأكيد.', hl: '#ctx', chk: () => G.blds.some(b => b.owner === 0 && b.type === 'power') },
    { txt: 'العربة الهندسية تبني الآن على مراحل: حفر ثم هيكل ثم صبّ ثم تشطيب. كل عربة إضافية تسرّع البناء. انتظر اكتمال المحطة.', chk: () => G.has(0, 'power') },
    { txt: 'رائع! الآن ابنِ «ثكنة» لتدريب المشاة: المس العربة الهندسية ثم اختر الثكنة.', hl: null, chk: () => G.blds.some(b => b.owner === 0 && b.type === 'barracks') },
    { txt: 'بعد اكتمال الثكنة المسها لتظهر لوحتها، ودرّب 3 جنود (المس الأيقونة 3 مرات، أو اضغط مطولاً لطلب 5). أغلق اللوحة بزر ✕.', hl: '#ctx', chk: () => G.units.filter(u => u.owner === 0 && u.def.role === 'rifle').length >= 3 },
    { txt: 'حدد جنودك: المسهم واحداً واحداً، أو اضغط مطولاً واسحب لرسم مربع تحديد حولهم.', hl: null, chk: () => Input.sel.filter(u => u.k === 'u' && u.def.role === 'rifle').length >= 2 },
    { txt: 'المس الأرض لتحريك الوحدات. المس عدواً للهجوم عليه. المس بئر النفط المحايد بجندي للاستيلاء عليه ويمنحك دخلاً.', chk: () => G.units.some(u => u.owner === 0 && u.def.role === 'rifle' && (u.goal || u.order.t === 'capture')) },
    { txt: 'ابنِ «مركز الإمداد» من لوحة البناء: يأتي مع شاحنة تنقل المال من مستودعات الإمداد تلقائياً.', hl: null, chk: () => G.has(0, 'supply') },
    { txt: 'هناك موقع معادٍ في الشرق (العلامة الحمراء على الخريطة المصغرة). أرسل قواتك ودمّر مبانيه. يمكنك بناء مصنع المركبات لإنتاج الدبابات.', look: () => { const b = G.blds.find(b => b.owner === 1); if (b) Input.lookAt(b.x, b.y); }, chk: () => !G.blds.some(b => b.owner === 1 && !b.dead) },
  ];
  function start(g) {
    G = g; step = 0; done = false; el = UI.$('tut'); el.classList.remove('hid'); cam0 = [R.cam.x, R.cam.y, R.cam.z]; show();
    el.querySelector('[data-skip]').onclick = () => { finish(true); };
  }
  function show() { const s = STEPS[step]; el.querySelector('.tt').textContent = s.txt; el.querySelector('.tn').textContent = (step + 1) + ' / ' + STEPS.length; document.querySelectorAll('.hl').forEach(e => e.classList.remove('hl')); if (s.hl) { const h = document.querySelector(s.hl); if (h) h.classList.add('hl'); } if (s.look) s.look(); t0 = performance.now(); }
  function tick() {
    if (!G || done || G !== GAME) return; const s = STEPS[step]; if (performance.now() - t0 < 900) return;
    let ok = false; try { ok = s.chk(); } catch (e) { }
    if (ok) { SND.ui('rankup'); step++; if (step >= STEPS.length) finish(false); else show(); }
  }
  function finish(skipped) { done = true; document.querySelectorAll('.hl').forEach(e => e.classList.remove('hl')); if (el) el.classList.add('hid'); if (!skipped) { Profile.seenTut = true; saveProfile(); UI.toast('أكملت التدريب!', 'good'); } }
  function stop() { done = true; if (el) el.classList.add('hid'); document.querySelectorAll('.hl').forEach(e => e.classList.remove('hl')); }
  function setup() {
    const def = MAPS[0]; const map = generateSkirmishMap(def, 2);
    const G2 = new Game({ mode: 'tut', money: 12000, local: 0, label: 'التدريب' }, map);
    const [s0, s1] = map.starts; G2.addPlayer({ f: 'usa', col: 0, team: 0, human: true, start: { x: (s0.tx + 0.5) * TILE, y: (s0.ty + 0.5) * TILE, tx: s0.tx, ty: s0.ty } });
    G2.addPlayer({ f: 'rus', col: 1, team: 1, start: { x: (s1.tx + 0.5) * TILE, y: (s1.ty + 0.5) * TILE, tx: s1.tx, ty: s1.ty } });
    placeNeutrals(G2); startBase(G2, 0, s0, { dozers: 1 });
    G2.placeBuilding('mg', 1, s1.tx - 1, s1.ty - 1, true); G2.placeBuilding('barracks', 1, s1.tx + 2, s1.ty - 1, true); G2.placeBuilding('power', 1, s1.tx - 4, s1.ty + 2, true); G2.recalcPower(G2.players[1]);
    for (let i = 0; i < 3; i++) { const u = G2.spawnUnit('rus_rifle', 1, (s1.tx - 3 + i) * TILE, (s1.ty + 4) * TILE, PI); Units.order(G2, u, { t: 'hold' }); }
    G2.aiBuildK = 3; G2.tutorial = true; G2.updateFog(); return G2;
  }
  return { start, tick, stop, setup };
})();
