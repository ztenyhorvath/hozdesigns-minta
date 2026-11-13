# Éles oldalak (ügyfél-domainek)

A szerver cronja (`/usr/local/bin/hz-sync.sh <mappa> <webgyökér>`, 5 percenként) a `<mappa>/files.txt`-ben
felsorolt fájlokat másolja a webgyökérbe. Csak ami a listán van; törlés nincs, az eredeti egyszer `.bak-orig`-ba mentődik.

- `csaklitkavehaz.hu/` → `/var/www/csaklitkavehaz.hu`
  - `mikulas/index.html`: a Mikulás-foglalás. **Rejtett aloldal** (2026-11-13, a felhasználó kérése: „menübe ne kerüljön csak létezzen az aloldal az éles oldalon”): semmi nem linkel rá, nincs a sitemapben, `noindex`.
  - Forrás: `minta/csaklit/mikulas/index.html` a felső bemutató sáv (`.pbar`) nélkül:
    `grep -v '^<div class="pbar">' minta/csaklit/mikulas/index.html > eles/csaklitkavehaz.hu/mikulas/index.html`
