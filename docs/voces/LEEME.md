# Las voces del juego

Cuatro voces, ciento dieciséis frases y dos mil doscientos caracteres. Esto
dice **qué se graba, con qué voz, cómo vuelve y qué se le hace después**.

La lista la genera el propio juego, así que nunca se queda vieja:

```bash
node scripts/frases-para-grabar.mjs
```

Escribe en esta carpeta:

| fichero | para qué |
|---|---|
| `frases.tsv` | la tabla entera: voz, fichero, idioma, texto y dónde suena |
| `frases.json` | lo mismo, para que lo lea el juego |
| `guion-<voz>.txt` | **solo el texto**, una frase por línea: es lo que se pega en el estudio |
| `guion-<voz>.tsv` | el mismo guion numerado, para casar los audios que vuelven |

## Las cuatro voces

| voz | idioma | frases | cómo suena | por qué |
|---|---|---|---|---|
| **instructor** | castellano paraguayo | 83 | cercana, tranquila, **hablándole a un chico** | Es la voz que sustituye al texto en el peldaño que empieza a los cuatro años y no lee. Es la que más se oye y la que más importa. |
| **cabina** | inglés aeronáutico | 21 | seca, plana, **sin emoción** | Son los cantos del avión: *terrain, pull up*, *one hundred*, *V1*. En un avión de verdad los dice una máquina, y por eso una voz con intención suena mal aquí. |
| **torre** | inglés aeronáutico y castellano | 7 | neutra, profesional, con prisa | Va con efecto de radio, y por eso se graba **limpia**: el filtro se pone después. |
| **otro** | castellano paraguayo | 5 | otra persona, otro timbre | Otro avión en la frecuencia. No hay tráfico todavía (#118), pero con esto la radio deja de estar muerta. |

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

## El tratamiento, con ffmpeg

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

Nada del motor: `Instructor` es una interfaz desde el primer día precisamente
para esto —el resto del juego pide «decí esto» sin saber quién contesta—, así
que cuando existan los ficheros se escribe una implementación que los
reproduce y se cambia una línea. Lo que hay hoy es la voz del navegador, que
suena a robot y que **en muchos sistemas no existe**: en Linux, sin
`speech-dispatcher` instalado, `speechSynthesis.getVoices()` devuelve una lista
vacía y el instructor se queda mudo sin decir por qué. El juego ya avisa de eso
una vez al arrancar; con las frases grabadas, deja de depender del sistema.
