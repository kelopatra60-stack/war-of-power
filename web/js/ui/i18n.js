/* ============================================================
   War of Power — اللغة: العربية (الأصل) أو الإنكليزية
   الملف: js/ui/i18n.js   ·   يُحمَّل بعد js/ui/i18n_en.js مباشرة (قبل أي واجهة)
   ============================================================ */
'use strict';
/* The game is written in Arabic. English is applied to the interface as it is drawn: a MutationObserver rewrites
   Arabic text nodes and labels through I18N_EN — the whole phrase when it is known, otherwise the longest known
   phrases inside the sentence (numbers, names and symbols stay as they are). Elements marked translate="no"
   (or .notr) are left alone, e.g. the bilingual guide and players' own names. Going back to Arabic reloads the page
   so the original text returns. The first launch asks for the language; Settings → «اللغة» changes it later. */
const I18N = (function () {
  const KEY = 'tw_lang';
  let lang = null; try { lang = localStorage.getItem(KEY); } catch (e) { }
  if (lang !== 'ar' && lang !== 'en') lang = null;
  const D = typeof I18N_EN !== 'undefined' ? I18N_EN : {};
  const AR = /[؀-ۿ]/;
  const RUN = /[ء-ْٰ-ۓ]+(?:[  ]+[ء-ْٰ-ۓ]+)*/g;
  const PUNCT = { '،': ',', '؛': ';', '؟': '?', '«': '“', '»': '”', '٪': '%' };
  const cache = new Map();
  function phrase(run) { // longest known phrases first, then single words (a leading «و» = «and»)
    const w = run.split(/[  ]+/); const out = []; let i = 0;
    while (i < w.length) {
      let hit = false;
      for (let j = Math.min(w.length, i + 16); j > i; j--) { const t = D[w.slice(i, j).join(' ')]; if (t !== undefined) { out.push(t); i = j; hit = true; break; } }
      if (hit) continue;
      const x = w[i]; let t;
      if (x.length > 2 && x[0] === 'و' && (t = D[x.slice(1)]) !== undefined) out.push('and ' + t);
      else if (x.length > 3 && (x[0] === 'ب' || x[0] === 'ل') && (t = D[x.slice(1)]) !== undefined) out.push((x[0] === 'ب' ? 'with ' : 'for ') + t);
      else out.push(x);
      i++;
    }
    return out.join(' ');
  }
  function tr(s) {
    if (lang !== 'en' || !s || typeof s !== 'string' || !AR.test(s)) return s;
    const c = cache.get(s); if (c !== undefined) return c;
    const lead = /^\s*/.exec(s)[0], tail = /\s*$/.exec(s)[0]; const n = s.replace(/\s+/g, ' ').trim();
    let r = D[n];
    if (r === undefined) r = n.replace(/(\d[\d,.]*)\s*من\s*(\d[\d,.]*)/g, '$1 of $2').replace(RUN, m => { const t = D[m]; return t !== undefined ? t : phrase(m); }); // «3 من 5» = «3 of 5»
    r = lead + r.replace(/[،؛؟«»٪]/g, ch => PUNCT[ch]) + tail;
    if (cache.size > 6000) cache.clear(); cache.set(s, r); return r;
  }
  /* ---------- live translation of the page ---------- */
  const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
  const skip = e => !!(e && e.closest && e.closest('[translate="no"],.notr'));
  function textNode(n) { const v = n.nodeValue; if (!v || !AR.test(v)) return; const p = n.parentNode; if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || skip(p))) return; const t = tr(v); if (t !== v) n.nodeValue = t; }
  function attrs(e) { for (const a of ATTRS) { const v = e.getAttribute(a); if (v && AR.test(v)) { const t = tr(v); if (t !== v) e.setAttribute(a, t); } } }
  function tree(root) {
    if (!root) return; if (root.nodeType === 3) { textNode(root); return; } if (root.nodeType !== 1 || skip(root)) return;
    attrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeType === 1 && (n.getAttribute('translate') === 'no' || n.classList.contains('notr')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) textNode(n); else attrs(n); }
  }
  let obs = null;
  function start() {
    if (lang !== 'en' || obs || !document.body || typeof MutationObserver === 'undefined') return;
    tree(document.body); document.title = tr(document.title);
    obs = new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') textNode(m.target); else if (m.type === 'attributes') { if (m.target.nodeType === 1 && !skip(m.target)) attrs(m.target); } else for (const x of m.addedNodes) tree(x); } });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function applyDir() { const en = lang === 'en', h = document.documentElement; h.lang = en ? 'en' : 'ar'; h.dir = en ? 'ltr' : 'rtl'; h.classList.toggle('en', en); }
  applyDir();
  function set(l) {
    if (l !== 'ar' && l !== 'en') return; const prev = lang; lang = l; try { localStorage.setItem(KEY, l); } catch (e) { }
    if (prev === 'en' && l === 'ar') { try { if (typeof GAME !== 'undefined' && GAME && !GAME.over && !GAME.net) Main.saveGame(true); } catch (e) { } location.reload(); return; }
    applyDir(); if (l === 'en') start();
  }
  // first launch only: choose the language (afterwards: Settings → «اللغة»)
  function firstRun(done) {
    if (lang) { if (done) done(); return; }
    const d = document.createElement('div'); d.className = 'langpick'; d.setAttribute('translate', 'no');
    d.innerHTML = `<div class="lpbox"><div class="lpglobe"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18"/></svg></div>
      <h2>اختر اللغة<small>Choose your language</small></h2>
      <div class="lpopts"><button class="lopt" data-l="ar"><b>العربية</b><span>Arabic</span></button><button class="lopt" data-l="en"><b>English</b><span>الإنكليزية</span></button></div>
      <p>يمكنك تغييرها لاحقاً من الإعدادات<br>You can change it later in Settings</p></div>`;
    document.body.appendChild(d);
    d.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { try { SND.ui('click'); } catch (e) { } d.classList.add('out'); setTimeout(() => d.remove(), 260); set(b.dataset.l); if (done) done(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  return { tr, set, firstRun, start, get lang() { return lang || 'ar'; }, get chosen() { return !!lang; } };
})();
const TR = s => I18N.tr(s);
