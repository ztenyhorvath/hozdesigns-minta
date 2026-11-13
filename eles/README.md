# Éles oldalak (ügyfél-domainek)

A szerver cronja (`/usr/local/bin/hz-sync.sh <mappa> <webgyökér>`, 5 percenként) a `<mappa>/files.txt`-ben
felsorolt fájlokat másolja a webgyökérbe. Csak ami a listán van; törlés nincs, az eredeti egyszer `.bak-orig`-ba mentődik.

- `csaklitkavehaz.hu/` → a Csáklit szerverén (Teoflora droplet, `ssh root@csaklitkavehaz.hu`); a webgyökeret a szkript az nginx-konfigból keresi ki. Telepítve: 2026-11-13 12:06, cron 5 percenként.
  - `mikulas/index.html`: a Mikulás-foglalás. **Rejtett aloldal** (2026-11-13, a felhasználó kérése: „menübe ne kerüljön csak létezzen az aloldal az éles oldalon”): semmi nem linkel rá, nincs a sitemapben, `noindex`.
  - Forrás: `minta/csaklit/mikulas/index.html` a felső bemutató sáv (`.pbar`) nélkül:
    `grep -v '^<div class="pbar">' minta/csaklit/mikulas/index.html > eles/csaklitkavehaz.hu/mikulas/index.html`

**Megjegyzés:** a hozdesigns.com szerverén is van egy `hz-sync.sh csaklitkavehaz.hu …` cron-sor (tévedésből, 2026-11-13). Ott nincs ilyen oldal, ezért minden futáskor hibával kilép, és nem csinál semmit. Kiszedhető: `crontab -l | grep -v hz-sync | crontab -`.

## Mikulás-foglalás: visszaigazolás és szabad helyek (2026-11-13)

- Táblázat: „Csáklit – Mikulás-foglalások” (zteny.horvath@gmail.com Drive-ja, id `1i52t5ojrrjluQ8H7sIcaet6vZAKnZKWwrC0uaWggGRc`). Lapok: Foglalások (személyes adatok, NEM nyilvános), Helyek (Létszám − visszaigazolt gyermek; csak ez a lap van közzétéve CSV-ként).
- Apps Script (a táblázathoz kötve): „Csáklit – Mikulás-visszaigazolás”, forrás: `csaklitkavehaz.hu/_apps-script/Code.gs` (ez a mappa nincs a files.txt-ben, nem kerül a szerverre). Webalkalmazás: a megnyitó felhasználóként fut, Google-fiókkal bárki megnyithatja, de csak az ALLOWED címekkel lehet visszaigazolni. URL a `mikulas/index.html` `CONF_URL` változójában.
- Folyamat: foglalás → Web3Forms-levél a kávéháznak „Visszaigazolás – …” linkkel → a kávéház a Teya-befizetés után megnyitja → „Visszaigazolás küldése” → a vendég levelet kap a kávéház Gmail-címéről, a foglalás bekerül a Foglalások lapra → a Helyek lap közzétett CSV-je (`SEATS_CSV`) frissíti az oldalon a szabad helyeket (~5 perc).
