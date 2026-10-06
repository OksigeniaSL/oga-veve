# Pendiente: grabar las voces de los ejercicios de emergencia

Las 29 frases nuevas de los ejercicios de emergencia (ADR 0014) están pedidas
en `scripts/frases-para-grabar.mjs` y ya salen en `docs/voces/`, pero no están
grabadas: el 29-09-2026 ElevenLabs estaba sin saldo, y al juntar la rama con
main, el 06-10-2026, seguía sin él.

**Mientras no se graben, no suenan.** El ejercicio solo dice con voz lo que
tiene grabado —ver `decirDelEjercicio` y `cantarDelEjercicio` en
`src/game.ts`—, y lo demás se queda en el dibujo y en el texto de la tarjeta:
nunca pasa a la voz del navegador, que en Brave para Linux es muda y en el
resto es un robot. Lo que sí suena ya es lo que estaba grabado antes: la
campanada de precaución, el MAYDAY de la torre, el «vuelo.sinMotor» del planeo
y todo el descenso de emergencia de la despresurización. En cuanto una clave
tenga receta en el pack, suena sola, sin tocar código; los bancos apuntan
cada una que se calla como «sin grabar, se calla» en `cantados`.

Son 25 de la instructora (`ejercicio.*`, unos 2.780 caracteres) —las 22 de la
rama más la presentación de la despresurización
(`ejercicio.despresurizacion.antes`), su felicitación
(`ejercicio.bienDespresurizacion`) y los bomberos de un solo camión
(`ejercicio.bomberosUno`)—, los dos cantos de cabina (`cabina.engineFailure`
«engine failure», `cabina.stop` «stop») y la respuesta a un PAN PAN de las dos
torres (`torre.solo.rogerPanPan` y `torre.canario.solo.rogerPanPan`, «roger,
Pan Pan»). Unos 2.830 caracteres en total. Las de la instructora van con los
ajustes de las tomas en calma y «V1» leído «ve uno», y eso ya lo pone la propia
lista.

## 1. Grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor cabina torre torre-canarias
node scripts/voces-elevenlabs.mjs instructor cabina torre torre-canarias
```

La clave la lee el guion de `~/.config/claves/entorno`; no se imprime. Salta lo
que ya está grabado, así que solo pide estas 26. Comprobar que han salido:

```bash
node -e 'const f=require("./docs/voces/frases.json");const fs=require("fs");
console.log(f.filter(x=>!fs.existsSync(`crudo/${x.voz}/${x.id}.mp3`)).map(x=>x.id))'
```

Tiene que imprimir `[]`.

## 2. Recetas

Las recetas se añaden **después** de grabar, no antes: una receta que nombra
una pieza que no existe hace fallar el horneado de esa voz a quien la hornee.

```bash
python3 - <<'EOF'
import json
from collections import OrderedDict
def carga(r): return json.load(open(r), object_pairs_hook=OrderedDict)
def guarda(r, d): open(r, "w").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
f = json.load(open("docs/voces/frases.json"))
r = "crudo/instructor/recetas.json"; d = carga(r)
for x in f:
    if x["voz"] == "instructor" and x["id"].startswith("ejercicio."):
        d[x["id"]] = [x["id"]]
guarda(r, d)
for r, pre in [("crudo/torre/recetas.json", "torre"),
               ("crudo/torre-canarias/recetas.json", "torre.canario")]:
    d = carga(r)
    solo = f"{pre}.solo.rogerPanPan"
    d[solo] = [solo]
    d[f"{pre}.panpan"] = ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", solo]
    guarda(r, d)
EOF
```

La cabina no lleva `recetas.json`: cada toma es su propia frase.

## 3. Devolver las tres claves a sus tablas

Solo con las tomas hechas, que es la regla de esas tablas: no apuntan a
grabaciones que no existen, y las pruebas lo vigilan.

- `src/audio/cabina.ts`, en `CLAVE_DE_CABINA`, en el sitio del comentario de
  «los dos de un motor que falla en el despegue»:

  ```ts
  "engine failure": "cabina.engineFailure",
  stop: "cabina.stop",
  ```

- `src/audio/cabina.test.ts`: quitar el conjunto `ESPERAN_TOMA` y su uso en
  «cada canto que pide el juego tiene toma de cabina».
- `src/flight/sin-instructora.ts`, en `CANTOS_QUE_SIGUEN`: `"cabina.engineFailure"`
  y `"cabina.stop"`. Son cantos de una emergencia y siguen sonando sin
  instructora; no se pueden poner antes porque `sin-instructora.test.ts` exige
  que cada uno esté en la tabla de cabina.
- `src/audio/torre.ts`, en `CLAVE_DE_TORRE`, en el sitio del comentario de la
  urgencia:

  ```ts
  "roger PAN PAN": "torre.panpan",
  ```

  Con eso `declararPanPan` (en `game.ts`) monta la respuesta con la voz de
  cada torre; hasta entonces solo se lee en la tira de la radio.

Las de la instructora no hay que devolverlas a ningún sitio: están en el
diccionario y suenan en cuanto tienen receta.

## 4. Hornear, y restaurar lo que no es nuevo

```bash
node scripts/hacer-pack-de-voz.mjs crudo/instructor instructor
node scripts/hacer-pack-de-voz.mjs crudo/cabina cabina
node scripts/hacer-pack-de-voz.mjs crudo/torre torre
node scripts/hacer-pack-de-voz.mjs crudo/torre-canarias torre-canarias
```

Antes de hornear `torre-canarias`, mirar en el commit 388394e cómo se horneó la
última vez: el filtro de radio va por `POR_RADIO` en `hacer-pack-de-voz.mjs`, y
`torre-canarias` no está en ese conjunto. La salida buena es la que deja
idénticas a lo publicado las tomas que ya existían.

El horneado vuelve a codificar todo el pack. Del diff se quedan **solo** los
ficheros nuevos y `manifiesto.json`; lo demás se restaura:

```bash
git status --short data/voces
git checkout -- $(git diff --name-only data/voces | grep -v manifiesto.json)
```

En `manifiesto.json` tienen que aparecer solo las entradas nuevas.

## 5. Comprobar y publicar

```bash
node scripts/verificar-voces.mjs
npx tsc --noEmit && npx vitest run src/audio
node scripts/frases-para-grabar.mjs   # y voces-elevenlabs no debe grabar nada más
```

Y un ejercicio en el navegador, para oír que ya suenan: `node
scripts/verificar-emergencias.mjs despues` deja de apuntar «sin grabar, se
calla» en `cantados`.

Después, un commit con las tomas, las recetas, los packs y las tres claves, y
este fichero borrado.
