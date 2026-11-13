#!/bin/sh
# Éles oldalak szinkronja GitHubról (cron, 5 percenként).
# Használat: hz-sync.sh <mappa a repó eles/ alatt> <webgyökér>
#   pl. hz-sync.sh csaklitkavehaz.hu /var/www/csaklitkavehaz.hu
# Csak a <mappa>/files.txt-ben felsorolt fájlokat másolja; felülírás előtt egyszer elmenti az eredetit (.bak-orig).
# Semmit nem töröl.
[ $# -eq 2 ] || { echo "használat: $0 <mappa> <webgyökér>"; exit 2; }
R=https://raw.githubusercontent.com/ztenyhorvath/hozdesigns-minta/main/eles/$1
W=$2
[ -f "$W/index.html" ] || { echo "nincs ilyen webgyökér: $W"; exit 1; }
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
  cp "$T/f" "$W/$p" && chmod a+r "$W/$p" && chmod a+rx "$(dirname "$W/$p")"
done
