# Las claves de API

Un solo sitio, fuera de cualquier repositorio:

```
~/.config/claves/entorno        chmod 600
```

Una por línea, `NOMBRE=valor`, sin comillas y sin `export`:

```
ELEVENLABS_API_KEY=sk_…
```

Los guiones de `scripts/` la buscan **primero en el entorno** y, si no está,
ahí. Ver `scripts/claves.mjs`.

## Por qué hay un fichero y no solo el entorno

Porque la alternativa real no era «el entorno», era **buscar la clave otra
vez**. Exportarla a mano en cada terminal significa ir al panel del proveedor,
rotarla —porque la mayoría solo se enseñan al crearlas—, pegarla, y repetirlo
dentro de dos días. Eso no es más seguro: acaba en un pegado apresurado en el
sitio que no era.

Un fichero que solo puede leer su dueño, fuera del repositorio y fuera de todo
lo que se publica, es la misma seguridad con menos ocasiones de equivocarse.

## Para que la vea todo lo que corre en la máquina

Lo de arriba vale para los guiones de este proyecto. Si querés que la vean
también los terminales y cualquier otra herramienta, la línea va **al principio
de `~/.bashrc`**, antes del corte de «si no es interactiva, no hagas nada»:

```bash
if [ -r "$HOME/.config/claves/entorno" ]; then
  set -a
  . "$HOME/.config/claves/entorno"
  set +a
fi
```

Va al principio a propósito. El `.bashrc` de Debian y Ubuntu empieza con un
`case $- in *i*) ;; *) return;; esac`, así que todo lo que se escriba por debajo
de ahí lo ven los terminales pero **no** los comandos sueltos.

## Lo que no se hace nunca

- **En el repositorio, no.** Ni en un `.env` del proyecto, ni en un fichero de
  configuración, ni en un comentario. El `.gitignore` ya tapa `.env*`, pero la
  regla es no escribirla ahí — no confiar en la red.
- **Con `VITE_` delante, jamás.** Vite mete en el paquete que se baja el
  navegador todo lo que empieza así: sería publicarla.
- **En una conversación, tampoco.** Lo que pasa por un chat queda escrito en
  algún sitio, y una clave que ha estado escrita en algún sitio es una clave
  quemada. Si hace falta llevarla del portapapeles al entorno sin que aparezca
  como texto:

  ```bash
  export ELEVENLABS_API_KEY=$(xclip -selection clipboard -o)
  ```

## Qué claves hay hoy

| nombre               | para qué              | dónde se pide                  |
| -------------------- | --------------------- | ------------------------------ |
| `ELEVENLABS_API_KEY` | grabar el pack de voz | `scripts/voces-elevenlabs.mjs` |

Las de teselas del mundo real van por otro camino —`?teselas=` en la dirección,
que es una clave de cliente y se ve igualmente en el navegador— y por eso no
están aquí.
