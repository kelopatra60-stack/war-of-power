#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
بناء نسخة الملف الواحد من اللعبة.

يقرأ index.html ويضع كل ملفات css و js داخله بالترتيب نفسه،
فينتج ملفاً واحداً جاهزاً: dist/war-of-power.html

الاستخدام (من مجلد المشروع):
    python3 tools/build.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'index.html')
OUT_DIR = os.path.join(ROOT, 'dist')
OUT = os.path.join(OUT_DIR, 'war-of-power.html')


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def main():
    html = read('index.html')
    files = []

    def css(m):
        files.append(m.group(1))
        return '<style>\n' + read(m.group(1)) + '</style>'

    html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', css, html)

    scripts = re.findall(r'<script src="([^"]+)"></script>', html)
    if not scripts:
        sys.exit('لم أجد ملفات js في index.html')
    toc = '\n'.join('   %2d. %s' % (i, p) for i, p in enumerate(scripts, 1))
    body = ['/* ==== War of Power — نسخة الملف الواحد (مبنية تلقائياً بـ tools/build.py) ====\n'
            '   لا تعدّل هذا الملف مباشرة: عدّل الملفات الأصلية ثم أعد البناء.\n'
            '   محتوى الملف بالترتيب:\n' + toc + '\n   ==== */']
    for p in scripts:
        files.append(p)
        body.append('/* ---- %s ---- */\n' % p + read(p))
    block = '<script>\n' + '\n'.join(body) + '\n</script>'
    # replace the run of <script src> tags (and the comment line before them) with one inline block
    html = re.sub(r'(<!--[^\n]*-->\n)?(<script src="[^"]+"></script>\n?)+', lambda m: block + '\n', html, count=1)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(html)
    print('تم البناء: %s  (%d ملفاً، %.1f ميغابايت)' % (os.path.relpath(OUT, ROOT), len(files), os.path.getsize(OUT) / 1e6))


if __name__ == '__main__':
    main()
