#!/bin/sh
# La letra del HUD: Varela Round, de Joe Prince y el proyecto Varela Round
# (github.com/alefalefalef/Varela-Round-Hebrew), con licencia SIL Open Font
# License 1.1, de Google Fonts. Un solo grueso, el normal: los 600 y 700 de la
# hoja los engruesa el navegador, igual que hacía con la instalada.
#
# Va dentro del paquete por lo mismo que la de la carta: el juego no pide nada
# a terceros mientras se juega, y sin ella cada aparato caía en la letra de su
# sistema y el HUD se veía distinto en cada uno. Recortada a lo que se escribe
# —latín, los acentos del castellano y los del guaraní (ã ẽ ĩ õ ũ ỹ y sus
# mayúsculas, la tilde combinable de la g̃, el puso ’ y su forma ʼ), comillas,
# rayas, puntos suspensivos, primas y el menos—, con las cifras tabulares, que
# es lo que la deja en unos veinticinco kilobytes en vez de ciento treinta.
#
# **Y con otro nombre: «Oga Redonda».** Su OFL reserva los nombres «Varela» y
# «Varela Round», y la licencia cuenta un recorte como versión modificada, que
# no puede llevar un nombre reservado. Barlow no reserva ninguno y por eso la
# de la carta conserva el suyo. El dibujo es el de Varela Round, letra a letra;
# el crédito, en CREDITOS.md, y la licencia, en `OFL-VarelaRound.txt`.
#
# Uso: sh scripts/letra-del-hud.sh <carpeta con VarelaRound-Regular.ttf>
# Hace falta fontTools con brotli (python3 -m fontTools.subset).
set -e
ORIGEN="$1"
DESTINO="src/assets/letras"
mkdir -p "$DESTINO"
UNICODES="U+0020-007E,U+00A0-00FF,U+0100-017F,U+02BC,U+0300-0304,U+0308,U+1EBC-1EBD,U+1EF8-1EF9,U+2009,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2032-2033,U+2039-203A,U+2212"
python3 -m fontTools.subset "$ORIGEN/VarelaRound-Regular.ttf" --unicodes="$UNICODES" \
  --layout-features='kern,liga,tnum,lnum,mark,mkmk,ccmp,locl,case' \
  --flavor=woff2 --output-file="$DESTINO/OgaRedonda-Regular.woff2"
python3 - "$DESTINO/OgaRedonda-Regular.woff2" <<'PY'
import sys
from fontTools.ttLib import TTFont
ruta = sys.argv[1]
f = TTFont(ruta)
nombres = {1: "Oga Redonda", 3: "Oga Redonda Regular", 4: "Oga Redonda", 6: "OgaRedonda-Regular", 16: "Oga Redonda"}
for n in f["name"].names:
    if n.nameID in nombres:
        n.string = nombres[n.nameID]
f.save(ruta)
PY
ls -la "$DESTINO/OgaRedonda-Regular.woff2"
