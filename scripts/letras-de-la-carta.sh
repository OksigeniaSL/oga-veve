#!/bin/sh
# Las letras de la carta: Barlow Semi Condensed y Barlow Condensed, de Jeremy
# Tribby, con licencia SIL Open Font License 1.1, de Google Fonts.
#
# Van dentro del paquete y no pedidas a Google al jugar: el juego no hace
# peticiones a terceros. Y recortadas a lo que se escribe en la carta —latín,
# los acentos del castellano y del guaraní (ã ẽ ĩ õ ũ ỹ, la tilde combinable
# de la g̃, el puso ’), los grados y minutos de la retícula—, que es lo que
# deja cada una en unos veinte kilobytes en vez de cien.
#
# Uso: sh scripts/letras-de-la-carta.sh <carpeta con los .ttf de Google Fonts>
# Hace falta fontTools con brotli (python3 -m fontTools.subset).
set -e
ORIGEN="$1"
DESTINO="src/assets/letras"
mkdir -p "$DESTINO"
UNICODES="U+0020-007E,U+00A0-00FF,U+0100-017F,U+0300-0304,U+0308,U+1EBD,U+1EF9,U+2013-2014,U+2018-201E,U+2026,U+2032-2033,U+2212"
for f in BarlowSemiCondensed-Medium BarlowSemiCondensed-SemiBold BarlowSemiCondensed-MediumItalic BarlowCondensed-SemiBold; do
  python3 -m fontTools.subset "$ORIGEN/$f.ttf" --unicodes="$UNICODES" \
    --layout-features='kern,liga,tnum,lnum,mark,mkmk,ccmp,locl' \
    --flavor=woff2 --output-file="$DESTINO/$f.woff2"
done
ls -la "$DESTINO"
