#!/usr/bin/env bash
#
# Pone las claves de ~/.config/claves/entorno en el arranque del shell.
#
#     bash scripts/claves-al-arranque.sh
#
# Hace falta porque los guiones de este proyecto ya leen ese fichero —ver
# scripts/claves.mjs— pero cualquier otra herramienta, y cualquier otro
# asistente, solo mira el entorno. Con esto lo ven todos.
#
# ## Por qué al principio del .bashrc y no al final
#
# El .bashrc de Debian y Ubuntu empieza con:
#
#     case $- in *i*) ;; *) return;; esac
#
# o sea: «si esto no es un terminal interactivo, no hagas nada más». Todo lo
# que se escriba por debajo lo ven los terminales y **no** lo ven los comandos
# sueltos, que es justo lo que hay que cubrir. Así que el bloque va arriba del
# todo.
#
# ## Qué hace y qué no
#
# - No toca la clave. La clave ya está en su fichero; esto solo hace que se
#   lea al arrancar.
# - Guarda una copia del .bashrc antes de tocarlo.
# - Se puede lanzar dos veces: si el bloque ya está, lo dice y no hace nada.

set -euo pipefail

CLAVES="$HOME/.config/claves/entorno"
BASHRC="$HOME/.bashrc"
MARCA="# ── Claves de API, para todo lo que corra como yo ──"

if [ ! -r "$CLAVES" ]; then
  echo "  No encuentro $CLAVES."
  echo "  Crealo primero, con una línea NOMBRE=valor y chmod 600."
  echo "  Ver docs/claves.md."
  exit 1
fi

# Y que no se le haya quedado abierto a todo el mundo.
permisos=$(stat -c '%a' "$CLAVES")
if [ "$permisos" != "600" ]; then
  echo "  Ojo: $CLAVES tiene permisos $permisos."
  echo "  Lo dejo en 600, que es lo que tiene que ser."
  chmod 600 "$CLAVES"
fi

if grep -qF "$MARCA" "$BASHRC" 2>/dev/null; then
  echo "  Ya estaba puesto en $BASHRC. No toco nada."
  exit 0
fi

copia="$BASHRC.antes-de-las-claves-$(date +%Y%m%d-%H%M%S)"
cp "$BASHRC" "$copia"

nuevo=$(mktemp)
cat > "$nuevo" <<'BLOQUE'
# ── Claves de API, para todo lo que corra como yo ──
# Un solo sitio, fuera de cualquier repositorio y solo legible por mí.
# Va antes del corte de «si no es interactiva, no hagas nada» a propósito: así
# la ven también los comandos sueltos y los asistentes, que es para lo que se
# puso. Ver docs/claves.md en oga-veve.
if [ -r "$HOME/.config/claves/entorno" ]; then
  set -a
  . "$HOME/.config/claves/entorno"
  set +a
fi

BLOQUE
cat "$BASHRC" >> "$nuevo"
mv "$nuevo" "$BASHRC"

echo "  Puesto al principio de $BASHRC."
echo "  Copia de lo que había: $copia"
echo
echo "  Para comprobarlo sin enseñar la clave, en un terminal nuevo:"
# **Solo `:+`, nunca `:-`.** `\${V:+puesta}` escribe «puesta» si la variable
# tiene algo; `\${V:-vacía}` escribe **el valor** cuando lo hay, que es
# exactamente enseñar la clave. Esa línea se escribió mal una vez y la clave
# acabó en una conversación: hubo que rotarla.
echo "    bash -ic 'echo \${ELEVENLABS_API_KEY:+puesta}'"
echo "  Si no escribe nada, no la ve."
