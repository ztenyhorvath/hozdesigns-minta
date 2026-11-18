#!/bin/sh
# hozdesigns.com főoldal-szinkron telepítése / frissítése (egyszer kell futtatni a szerveren):
#   ssh root@hozdesigns.com "curl -fsS https://raw.githubusercontent.com/ztenyhorvath/hozdesigns-minta/main/fooldal/_install.sh | sh"
# A repó fooldal/_sync.sh szkriptjét /usr/local/bin/hz-fooldal-sync.sh néven telepíti, 5 percenkénti cronnal,
# és egyszer azonnal lefuttatja. A meglévő crontab-sorokhoz nem nyúl, csak hozzáadja a sajátját, ha még nincs.
set -e
R=https://raw.githubusercontent.com/ztenyhorvath/hozdesigns-minta/main/fooldal
S=/usr/local/bin/hz-fooldal-sync.sh
echo "== jelenlegi crontab =="
crontab -l 2>/dev/null || echo "(üres)"
curl -fsS "$R/_sync.sh?t=$(date +%s)" -o "$S.new"
grep -q 'hozdesigns-minta/main/fooldal' "$S.new"
mv "$S.new" "$S"
chmod 755 "$S"
if ! crontab -l 2>/dev/null | grep -q "$S"; then
  (crontab -l 2>/dev/null; echo "*/5 * * * * $S >/dev/null 2>&1") | crontab -
  echo "== cron-sor hozzáadva =="
else
  echo "== cron-sor már megvolt =="
fi
sh "$S"
echo "== eredmény =="
ls -la /var/www/hozdesigns.com/fr /var/www/hozdesigns.com/helyi 2>&1
echo "KÉSZ"
