#!/bin/sh
# hozdesigns.com főoldal-szinkron (cron, 5 percenként): a hozdesigns-minta repó fooldal/ mappájából
# a files.txt-ben felsorolt fájlokat másolja a webgyökérbe. Felülírás előtt egyszer elmenti az eredetit (.bak-orig).
R=https://raw.githubusercontent.com/ztenyhorvath/hozdesigns-minta/main/fooldal
W=/var/www/hozdesigns.com
T=$(mktemp -d) || exit 1
trap 'rm -rf "$T"' EXIT
curl -fsS "$R/files.txt?t=$(date +%s)" -o "$T/list" || exit 0
grep -E '^[A-Za-z0-9_./-]+$' "$T/list" | grep -v '\.\.' | while read -r p; do
  curl -fsS "$R/$p?t=$(date +%s)" -o "$T/f" || continue
  [ -s "$T/f" ] || continue
  case "$p" in *.html) grep -qi '</html>' "$T/f" || continue ;; esac
  mkdir -p "$(dirname "$W/$p")"
  if [ -e "$W/$p" ]; then
    cmp -s "$T/f" "$W/$p" && continue
    [ -e "$W/$p.bak-orig" ] || cp -p "$W/$p" "$W/$p.bak-orig"
  fi
  cp "$T/f" "$W/$p" && chmod a+r "$W/$p"
done
