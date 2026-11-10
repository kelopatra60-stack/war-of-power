#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
يحوّل صور الأعلام في assets/flags/*.svg إلى الملف assets/flags.js الذي تقرأه اللعبة.
اسم الملف = رمز الدولة في اللعبة (usa, rus, chn, eu, arb).
لتغيير علم: ضع ملف svg جديداً بالاسم نفسه ثم شغّل:
    python3 tools/flags.py
ثم (اختياري) python3 tools/build.py
"""
import os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'assets', 'flags')
OUT = os.path.join(ROOT, 'assets', 'flags.js')

flags = {}
for name in sorted(os.listdir(DIR)):
    if not name.endswith('.svg'):
        continue
    svg = open(os.path.join(DIR, name), encoding='utf-8').read()
    svg = re.sub(r'<\?xml[^>]*>|<!--.*?-->', '', svg, flags=re.S)
    svg = re.sub(r'>\s+<', '><', svg).strip()
    svg = re.sub(r'\s+', ' ', svg)
    svg = re.sub(r'<svg([^>]*?) id="[^"]*"', r'<svg\1', svg, count=1)
    svg = svg.replace('<svg', '<svg class="flag" preserveAspectRatio="xMidYMid slice"', 1)
    flags[name[:-4]] = svg

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('/* ============================================================\n'
            '   War of Power — أعلام الدول (مولّد تلقائياً بـ tools/flags.py من assets/flags/*.svg)\n'
            '   المصدر: https://github.com/lipis/flag-icons (MIT) — راجع assets/flags/LICENSE.txt\n'
            '   ============================================================ */\n'
            "'use strict';\n"
            'const FLAG_SVG = ' + json.dumps(flags, ensure_ascii=False, indent=1) + ';\n')
print('flags:', ', '.join(flags), '->', os.path.relpath(OUT, ROOT), os.path.getsize(OUT), 'bytes')
