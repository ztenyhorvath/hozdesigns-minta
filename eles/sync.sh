#!/bin/sh
# Éles oldalak szinkronja GitHubról (cron, 5 percenként).
# Használat: hz-sync.sh <mappa a repó eles/ alatt> <webgyökér>
#   pl. hz-sync.sh csaklitkavehaz.hu /var/www/csaklitkavehaz.hu
# Csak a <mappa>/files.txt-ben felsorolt fájlokat másolja; felülírás előtt egyszer elmenti az eredetit (.bak-orig).
# Semmit nem töröl.
[ $# -eq 2 ] || { echo "használat: $0 <mappa> <webgyökér>"; exit 2; }
R=https://raw.githubusercontent.com/ztenyhorvath/hozdesigns-minta/main/eles/$1
W=$2
# Ha a megadott webgyökér nem létezik, az nginx-konfigból keresi ki (a mappa neve = a domain).
if [ ! -f "$W/index.html" ]; then
  C=$(grep -RlE "server_name[^;]*[ \t]$1([ \t;]|\$)" ${HZ_NGINX:-/etc/nginx} 2>/dev/null | grep -v "\.bak\|~$" | head -1)
  [ -n "$C" ] && W=$(awk '$1=="root"{gsub(";","",$2); print $2; exit}' "$C")
  [ -n "$W" ] && [ -f "$W/index.html" ] || { echo "nincs ilyen webgyökér: $2 (az nginx-konfigban sem találom: $1)"; echo "/var/www:"; ls /var/www; grep -RhoE "server_name[^;]*" /etc/nginx 2>/dev/null | sort -u; exit 1; }
fi
T=$(mktemp -d) || exit 1
trap 'rm -rf "$T"' EXIT
curl -fsS "$R/files.txt?t=$(date +%s)" -o "$T/list" || exit 0
grep -E '^[A-Za-z0-9_./-]+$' "$T/list" | grep -v '\.\.' | grep -v '^/' | while read -r p; do
  curl -fsS "$R/$p?t=$(date +%s)" -o "$T/f" || continue
  [ -s "$T/f" ] || continue
  case "$p" in *.html) grep -qi '</html>' "$T/f" || continue ;; esac
  mkdir -p "$(dirname "$W/$p")"
  if [ -e "$W/$p" ]; then
    cmp -s "$T/f" "$W/$p" && continue
    [ -e "$W/$p.bak-orig" ] || cp -p "$W/$p" "$W/$p.bak-orig"
  fi
  cp "$T/f" "$W/$p" && chmod a+r "$W/$p" && chmod a+rx "$(dirname "$W/$p")" && echo "frissítve: $W/$p"
done
