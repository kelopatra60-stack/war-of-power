/* ============================================================
   War of Power — رسومات دبابات النخبة والأدوار الجديدة
   الملف: js/art/units_ext.js   ·   ترتيب التحميل: 10 من 43
   ============================================================ */
'use strict';
/* ===== Extended vehicle art: elite tanks and new roles ===== */

// Toyota-style double-cab pickup (top-down): cab forward, open bed aft

/* ---------- elite armour ---------- */
const clone = (id, ex) => Object.assign({}, VART[id], ex);
V('usa_el1', clone('usa_mbt', { tx: -2, gx: 9.5, gl: 22, gd: 1.45, tur(p, f) { // AbramsX: low unmanned turret, RWS, APS
  facet(p, [9, -5.4, 9, 5.4, -1, 6.6, -9, 6, -9, -6, -1, -6.6], f, 0.86, 0.6, 2.0); for (const s of [-1, 1]) { p.rect(1, s * 6.2 - 0.9, 3, 1.8, M('#3c3d36', 0.9), 0.3); p.circ(-5, s * 5.2, 0.8, M('#2a2b28', 0.92)); }
  rws(p, -3.4, -1.8, f, 0); p.rect(3.4, 2.6, 2.4, 1.8, M('#232d33', 0.96, { s: 0.85 })); teamFlag(p, -8.4, -1.4, 1.2, 2.8); p.grain(0.12);
}, gun(p) { barrelArt(p, 22, 1.4, { evac: 0.45 }); } }));
V('rus_el1', clone('rus_mbt', { gx: 0, gl: 0, tur(p, f) { // BMPT Terminator weapon module
  facet(p, [6, -4.8, 6, 4.8, -6, 5.6, -7.5, 4, -7.5, -4, -6, -5.6], f, 0.82, 0.58, 1.6); for (const s of [-1, 1]) { autoBarrel(p, 4, s * 2.6, 12, 0.7); autoBarrel(p, 4, s * 1.6, 12, 0.7); p.rect(-6, s * 6.4 - 1.3, 9, 2.6, fpaint(f, 0.9), 0.4); for (const k of [0, 1]) p.circ(3.2, s * 6.4 + (k - 0.5) * 1.1, 0.48, M('#1d1e1b', 0.96)); }
  rws(p, -3, 0, f, 0); teamFlag(p, -7, -1.2, 1.2, 2.4); p.grain(0.12);
} }));
VART.rus_el1.gun = null;
V('chn_el1', clone('chn_tank2', { tx: 0, gx: 9.5, gl: 21, gd: 1.5, tur(p, f) { // VT-4: boxy turret with ERA wedge modules
  facet(p, [8.4, -4.4, 8.4, 4.4, 4, 7, -8, 6.6, -9, 0, -8, -6.6, 4, -7], f, 0.86, 0.6, 1.6); era(p, 4.4, -6.6, 2, 2, 1.6, 1.5, f, 0.92); era(p, 4.4, 3.4, 2, 2, 1.6, 1.5, f, 0.92);
  hatch(p, -2.4, -2.4, 1.2, f); hatch(p, -2, 2.6, 1.2, f); for (const s of [-1, 1]) p.rect(-3, s * 6.4 - 0.7, 2, 1.4, M('#30312c', 0.95)); teamFlag(p, -8.4, -1.2, 1.2, 2.4); p.grain(0.12);
}, gun(p) { barrelArt(p, 21, 1.45, { sleeve: 4, evac: 0.48 }); } }));
V('eu_el1', clone('eu_mbt', { tur(p, f) { VART.eu_mbt.tur(p, f); for (const s of [-1, 1]) { p.rect(-3, s * 7.2 - 1.2, 3.4, 2.4, M('#3a3c35', 0.95), 0.4); p.rect(-2.6, s * 7.2 - 0.8, 2.6, 1.6, M('#4e5a55', 0.97, { s: 0.6 })); } } })); // Leopard 2A8 + Trophy
V('arb_el1', clone('usa_mbt', { hull(p, f) { VART.usa_mbt.hull(p, f); for (const s of [-1, 1]) era(p, -10, s * 7.4 - (s < 0 ? 0 : 1.6), 8, 1, 2.2, 1.6, f, 0.5, 0.2); }, tur(p, f) { VART.usa_mbt.tur(p, f); era(p, 2, -7.4, 3, 1, 1.8, 1.2, f, 0.9); era(p, 2, 6.2, 3, 1, 1.8, 1.2, f, 0.9); } }));
