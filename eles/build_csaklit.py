#!/usr/bin/env python3
"""Csáklit éles fájlok építése a mintából (minta/csaklit → eles/csaklitkavehaz.hu).
HTML: a felső bemutató sáv (.pbar) és a noindex meta törlése; minden más egyezik a mintával.
Utána a files.txt-ben felsorolt fájlokat a szerver cronja (hz-sync.sh) 5 percen belül kiteszi."""
import os, re, shutil
SRC = 'minta/csaklit'; DST = 'eles/csaklitkavehaz.hu'
PAGES = ['index.html', 'etlap/index.html', 'heti-menu/index.html', 'cukraszda/index.html', 'rendezvenyek/index.html',
         'rolunk/index.html', 'galeria/index.html', 'kapcsolat/index.html', 'asztalfoglalas/index.html',
         'adatkezeles/index.html', 'mikulas/index.html']
COPY = ['assets/site.css', 'sitemap.xml', 'mikulas/plakat.jpg', 'mikulas/plakat-900.jpg']
out = []
for p in PAGES:
    s = open(os.path.join(SRC, p), encoding='utf-8').read()
    s = '\n'.join(l for l in s.split('\n') if not l.startswith('<div class="pbar">'))
    s = re.sub(r'<meta name="robots" content="noindex, nofollow">\n?', '', s)
    assert 'pbar' not in s.split('</head>')[1][:400] and 'noindex' not in s, p
    os.makedirs(os.path.dirname(os.path.join(DST, p)) or DST, exist_ok=True)
    open(os.path.join(DST, p), 'w', encoding='utf-8').write(s); out.append(p)
for p in COPY:
    os.makedirs(os.path.dirname(os.path.join(DST, p)) or DST, exist_ok=True)
    shutil.copyfile(os.path.join(SRC, p), os.path.join(DST, p)); out.append(p)
open(os.path.join(DST, 'files.txt'), 'w').write('\n'.join(out) + '\n')
print('\n'.join(out))
