# Las voces del juego

Cuatro voces, ciento dieciséis frases y dos mil doscientos setenta y un
caracteres. Esto dice **qué se graba, con qué voz, cómo vuelve y qué se le
hace después**.

La lista la genera el propio juego, así que nunca se queda vieja:

```bash
node scripts/frases-para-grabar.mjs
```

Escribe en esta carpeta:

| fichero           | para qué                                                                |
| ----------------- | ----------------------------------------------------------------------- |
| `frases.tsv`      | la tabla entera: voz, fichero, idioma, texto y dónde suena              |
| `frases.json`     | lo mismo, para que lo lea el juego                                      |
| `guion-<voz>.txt` | **solo el texto**, una frase por línea: es lo que se pega en el estudio |
| `guion-<voz>.tsv` | el mismo guion numerado, para casar los audios que vuelven              |

## Las cuatro voces

| voz            | idioma                          | frases | cómo suena                                    | por qué                                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------------- | ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **instructor** | castellano paraguayo            | 83     | cercana, tranquila, **hablándole a un chico** | Es la voz que sustituye al texto en el peldaño que empieza a los cuatro años y no lee. Es la que más se oye y la que más importa.                                                                                                                                                                      |
| **cabina**     | inglés aeronáutico              | 21     | seca, plana, **sin emoción**                  | Son los cantos del avión: _terrain, pull up_, _one hundred_, _V1_. En un avión de verdad los dice una máquina, y por eso una voz con intención suena mal aquí.                                                                                                                                         |
| **torre**      | inglés aeronáutico y castellano | 7      | neutra, profesional, con prisa                | Va con efecto de radio, y por eso se graba **limpia**: el filtro se pone después.                                                                                                                                                                                                                      |
| **otro**       | castellano paraguayo            | 5      | otra persona, otro timbre                     | Otro avión en la frecuencia. **Ya suenan en el juego** con la voz del sistema: ver `src/flight/radio.ts`, que las dice en orden —saluda, rueda, viento en cola, final, pista libre— y se calla en cuanto habla el instructor. No hay tráfico dibujado todavía (#118), pero la radio ya no está muerta. |

Tres cosas que no cambian:

- **El inglés se graba una vez** y vale para los tres idiomas del juego. Los
  cantos de cabina no se traducen jamás, igual que IAS o HDG: reconocerlos es
  parte de lo que se aprende aquí.
- **El guaraní no entra.** No hay voz de guaraní en ningún sintetizador y una
  voz castellana leyendo guaraní escrito suena a burla. Esa capa espera a una
  persona que lo hable (#6).
- **La torre y el otro avión pueden ser la misma persona** con distinto tono si
  hiciera falta, pero el instructor no: es la única que se oye todo el rato y
  tiene que ser reconocible.

## Cómo vuelven los ficheros

Uno por frase, **con el nombre que dice la tabla**, en esta estructura:

```
data/voces/
  instructor/vuelo.rodando.ogg
  instructor/vuelo.esperando.ogg
  cabina/cabina.oneHundred.ogg
  torre/torre.goAround.ogg
  otro/otro.enCola.ogg
```

Si el estudio los devuelve numerados —`001.mp3`, `002.mp3`…— sirve igual:
`guion-<voz>.tsv` lleva el mismo orden y el número delante, así que renombrar
es una línea de shell.

Formato de entrega: lo que salga del estudio, en la calidad más alta que dé.
La conversión a lo que usa el juego se hace aquí.

## Las tomas, con ElevenLabs

Ciento veintiuna frases y dos mil cuatrocientos caracteres pegados a mano en
una web es la clase de trabajo que se hace una vez y se hace mal la segunda.
Hay un guion:

```bash
export ELEVENLABS_API_KEY=...          # del entorno, nunca de un fichero
node scripts/voces-elevenlabs.mjs --voces    # lista las de la cuenta
node scripts/voces-elevenlabs.mjs --cuanto   # qué se va a gastar, sin gastarlo
node scripts/voces-elevenlabs.mjs instructor # y a grabar
```

Escribe un fichero por frase en `crudo/<voz>/`, con el nombre que dice la
tabla, y **salta lo que ya está**: una tanda que se corta —la red, un límite de
la cuenta, un Ctrl-C— se reanuda sin pagar dos veces lo mismo.

Antes hace falta decir qué voz de la cuenta hace de cuál, en
`docs/voces/voces.json`. Es configuración, no un secreto: un identificador de
voz no abre nada.

```json
{ "instructor": "…", "cabina": "…", "torre": "…", "otro": "…" }
```

**La clave sale del entorno y no se escribe en ningún sitio.** Sin `VITE_`
delante: cualquier variable con ese prefijo la mete Vite dentro del paquete que
se publica, o sea dentro del navegador de quien juegue.

Y una nota sobre el modelo: `eleven_multilingual_v2` es el que aguanta el
voseo —«arrancá», «seguí», «andá»—, que es la mitad de lo que hace que el
instructor suene de Paraguay y no de un doblaje.

## El horneado: un comando, y ya

```bash
node scripts/hacer-pack-de-voz.mjs crudo/instructor instructor
```

Coge las tomas, aplica la cadena de abajo, escribe los **dos** formatos y el
manifiesto en `data/voces/instructor/`. Y va aquí y no en el estudio por una
razón concreta: para que **la frase veintisiete suene igual dentro de un año**.
Si el tratamiento vive en la cabeza de quien mezcló la primera tanda, la segunda
no pega con la primera y se nota en cuanto suenan seguidas — es el fallo clásico
de los packs de voz.

### Las recetas: montar como los GPS

Un GPS no graba «gire a la derecha en doscientos metros hacia la calle Mayor».
Graba **piezas** y las monta. Aquí igual, y por eso al lado de las tomas puede
ir un `recetas.json` que diga qué piezas monta cada frase del diccionario:

```json
{
  "vuelo.rodando": ["segui", "la-raya-verde"],
  "vuelo.calle": ["segui", "la-calle", "{letra}"]
}
```

`{letra}` es un hueco: lo rellena el juego con la pieza de la calle que toque.
Veintiséis piezas de una sílaba cubren así todas las calles de rodaje de todos
los aeropuertos del juego. Ver #126 y `src/audio/banco-de-voz.ts`.

Sin `recetas.json`, cada fichero es su propia frase de una pieza. Es lo que vale
para la cabina y la torre: `cabina.oneHundred` es un canto entero y no se monta
con nada.

Y una regla que el guion comprueba y no perdona: **una receta no puede nombrar
una pieza que no se grabó**. Media frase es peor que ninguna, así que el juego
descarta la receta entera y la dice con la voz del navegador — mejor enterarse
al hornear que al volar.

### Dos formatos, y no es por gusto

Opus a 24 kbps y **gemelo en AAC**, porque Safari no decodifica Opus de forma
fiable. Los dos se hornean desde la misma toma y con el mismo filtro, nunca uno
desde el otro: encadenar dos códecs con pérdida sobre una voz suena a teléfono
roto, y el gemelo existe justo para que a quien le toque Safari no le toque una
versión peor. El juego elige según lo que diga `canPlayType`.

### Y no entra en la precarga

El pack se baja **después del primer gesto** —que es cuando el navegador deja
sonar algo— y se guarda en su propia caché, `oga-veve-voz-v1`. Así las veinte
tablets de un aula lo bajan una vez y todas las sesiones siguientes van sin red,
y la primera carga del juego sigue pesando lo que pesaba. El service worker lo
deja pasar a propósito para no guardar una segunda copia de lo mismo: ver
`scripts/plantilla-sw.js`.

## El tratamiento, con ffmpeg

Esto es lo que hace el guion de arriba. Está escrito aquí para poder repetirlo a
mano, no para tener que hacerlo.

### 1. Todas las voces: limpiar, igualar y comprimir

Quita el silencio de los extremos, iguala el volumen entre frases —que es lo
que hace que unas no peguen un salto sobre otras— y deja un OGG Opus mono
pequeño:

```bash
ffmpeg -i entrada.mp3 -af "
  silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,
  areverse,
  silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,
  areverse,
  loudnorm=I=-16:TP=-1.5:LRA=11
" -ac 1 -ar 48000 -c:a libopus -b:a 48k salida.ogg
```

A 48 kbps mono, las ciento dieciséis frases pesan menos de un mega y medio en
total: menos que una sola de las ortofotos que ya carga el juego.

### 2. La torre y el otro avión: la radio

Lo que hace creíble una radio **no es la voz, es el filtro**. Banda estrecha
—una radio de aviación va de 300 a 3.400 Hz y no da más—, un poco de
saturación blanda y compresión fuerte, que es lo que hace que todo llegue al
mismo volumen:

```bash
ffmpeg -i limpia.ogg -af "
  highpass=f=300,
  lowpass=f=3400,
  acompressor=threshold=-18dB:ratio=8:attack=5:release=60,
  aeval='tanh(1.6*val(0))/1.6':c=same,
  volume=2dB
" -ac 1 -ar 48000 -c:a libopus -b:a 48k radio.ogg
```

### 3. Y el clic del final, que es la mitad del efecto

Una transmisión de radio **empieza y acaba con un chasquido**: el del pulsador
al soltarse. Se graba —o se sintetiza— una vez y se pega al final de cada
frase de torre:

```bash
# Un clic corto de ruido rosa, 60 ms, una sola vez
ffmpeg -f lavfi -i "anoisesrc=d=0.06:c=pink:a=0.3" \
  -af "highpass=f=800,lowpass=f=3000,afade=t=out:st=0.03:d=0.03" clic.ogg

# Y pegado detrás de cada frase
ffmpeg -i radio.ogg -i clic.ogg -filter_complex "[0][1]concat=n=2:v=0:a=1" con-clic.ogg
```

No hace falta que sea perfecto: a los cuatro años, ese clic es lo que dice
«esto viene de otro sitio».

## Qué falta en el juego, y qué no

**Nada del motor: ya está puesto.** `Instructor` era una interfaz desde el
primer día precisamente para esto, y la implementación que toca ficheros existe
—`src/audio/instructor-grabado.ts`—, está enganchada y baja el pack tras el
primer gesto. Lo que falta son las grabaciones.

Y no hace falta tenerlas todas para empezar a oírlas: **el pack se puede subir
por partes**. Una frase sin receta no calla el juego, la dice la voz del
navegador como hasta ahora. Así se puede grabar de diez en diez y oír el
resultado el mismo día, en vez de esperar a las ciento dieciséis.

Lo que hay mientras tanto es la voz del navegador, que suena a robot y que **en
muchos sistemas no existe**: en Linux, sin `speech-dispatcher` instalado,
`speechSynthesis.getVoices()` devuelve una lista vacía y el instructor se queda
mudo sin decir por qué. El juego ya avisa de eso una vez al arrancar; con las
frases grabadas, deja de depender del sistema.
