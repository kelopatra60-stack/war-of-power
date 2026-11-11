#!/usr/bin/env node
/* ============================================================
   War of Power — حزمة المالك المشفّرة: قفل وفتح المصدر المقروء بكلمة سر المالك، والتحقق من المالك
   © 2026 محمد فادي سيف — سوريا · جميع الحقوق محفوظة للمالك فقط
   ============================================================
   The readable source, the build tools and the owner's signing key travel ONLY inside an encrypted package:
   key = PBKDF2-HMAC-SHA256(password, random 16-byte salt, 600 000 rounds) → AES-256-GCM (random 12-byte IV).
   GCM authenticates: a wrong password or a changed file is detected — nothing is ever half-opened.

     node owner.js verify <package.enc.txt>                 → asks for the password, says whether it is the owner's
     node owner.js unlock <package.enc.txt> <folder>        → writes the readable files into <folder>
     node owner.js lock   <folder> <package.enc.txt>        → packs <folder> again (after editing) with the password
   The password can also be given in the environment variable OWNER_PASS (never put it in a file). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const ITER = 600000, HEAD = 'WAR-OF-POWER OWNER PACKAGE v1';

function ask(q) { // read a password from the terminal without echoing it
  if (process.env.OWNER_PASS) return Promise.resolve(process.env.OWNER_PASS);
  return new Promise(res => { const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (/\n|\r/.test(s) || s === q) process.stdout.write(s); }; rl.question(q, a => { rl.close(); process.stdout.write('\n'); res(a.trim()); }); });
}
function walk(d, base = d, out = []) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p, base, out); else out.push(path.relative(base, p).split(path.sep).join('/')); } return out; }
const keyOf = (pass, salt) => crypto.pbkdf2Sync(Buffer.from(pass.normalize('NFC'), 'utf8'), salt, ITER, 32, 'sha256');

function lock(dir, outFile, pass) {
  const files = {}; for (const f of walk(dir)) files[f] = fs.readFileSync(path.join(dir, f)).toString('base64');
  const plain = zlib.gzipSync(Buffer.from(JSON.stringify({ v: 1, game: 'War of Power', owner: 'محمد فادي سيف', country: 'سوريا', packed: new Date().toISOString(), files }), 'utf8'), { level: 9 });
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', keyOf(pass, salt), iv);
  const ct = Buffer.concat([c.update(plain), c.final()]), tag = c.getAuthTag();
  const b64 = Buffer.concat([ct, tag]).toString('base64').replace(/.{1,100}/g, '$&\n');
  fs.writeFileSync(outFile, [HEAD, '© 2026 محمد فادي سيف — سوريا · جميع الحقوق محفوظة للمالك فقط', 'kdf: PBKDF2-HMAC-SHA256', 'rounds: ' + ITER, 'salt: ' + salt.toString('base64'), 'iv: ' + iv.toString('base64'), 'cipher: AES-256-GCM (last 16 bytes = tag)', 'files: ' + Object.keys(files).length, '', b64].join('\n'));
  return Object.keys(files).length;
}
function open(file, pass) {
  const t = fs.readFileSync(file, 'utf8'); if (!t.startsWith(HEAD)) throw new Error('not an owner package');
  const h = k => (t.match(new RegExp('^' + k + ': (.*)$', 'm')) || [])[1];
  const salt = Buffer.from(h('salt'), 'base64'), iv = Buffer.from(h('iv'), 'base64'), rounds = +h('rounds');
  const raw = Buffer.from(t.slice(t.indexOf('\n\n') + 2).replace(/\s+/g, ''), 'base64'), ct = raw.subarray(0, raw.length - 16), tag = raw.subarray(raw.length - 16);
  const d = crypto.createDecipheriv('aes-256-gcm', crypto.pbkdf2Sync(Buffer.from(pass.normalize('NFC'), 'utf8'), salt, rounds, 32, 'sha256'), iv); d.setAuthTag(tag);
  let plain; try { plain = Buffer.concat([d.update(ct), d.final()]); } catch (e) { return null; } // wrong password (or a changed package)
  return JSON.parse(zlib.gunzipSync(plain).toString('utf8'));
}

(async () => {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'lock' && a && b) { const p1 = await ask('كلمة سر المالك / owner password: '); if (!process.env.OWNER_PASS) { const p2 = await ask('أعد كتابتها / again: '); if (p1 !== p2) { console.log('✗ لا تتطابق / does not match'); process.exit(1); } }
    if (p1.length < 16) { console.log('✗ كلمة السر قصيرة جداً / password too short'); process.exit(1); }
    console.log('✓ packed', lock(a, b, p1), 'files →', b); return; }
  if ((cmd === 'verify' || cmd === 'unlock') && a) { const pkg = open(a, await ask('كلمة سر المالك / owner password: '));
    if (!pkg) { console.log('✗ كلمة السر غير صحيحة — ليس المالك / wrong password — not the owner'); process.exit(2); }
    console.log('✓ تم التحقق: هذا هو مالك اللعبة (' + pkg.owner + ' — ' + pkg.country + ') / OWNER VERIFIED');
    if (cmd === 'unlock') { const dir = b || 'war-of-power-source'; for (const [f, d] of Object.entries(pkg.files)) { const p = path.join(dir, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.from(d, 'base64')); } console.log('✓ wrote', Object.keys(pkg.files).length, 'files →', dir); }
    return; }
  console.log('usage: node owner.js verify <pkg> | unlock <pkg> <folder> | lock <folder> <pkg>');
})();
