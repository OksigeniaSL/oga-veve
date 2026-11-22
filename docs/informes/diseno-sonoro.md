# El paisaje sonoro, del pistón al arpa

*Óga Veve · Oksigenia SL · documento de diseño de sonido*

> Informe de diseño de agosto de 2026, uno de los ocho que recoge la [visión del proyecto](../vision.md) en su sección 10. Se conserva tal como se escribió; lo que el juego ha decidido después manda sobre lo que aquí se propone.

Tres principios gobiernan todo lo que sigue: el audio nunca es el único canal de nada; el silencio es un modo de primera clase, no un fallo; y el presupuesto crítico de bytes es ≈110 KB, con la música fuera del bundle.

three.js + TypeScript · Web Audio API, sin librerías · 60 fps · tablet media · 2026-08-31

## 01. Motor de pistón

**Receta híbrida: tres muestras cortas + síntesis de apoyo.** La síntesis pura suena a juguete; las muestras largas pesan. El punto medio:

- **Tres bucles mono de 2–3 s** a ralentí (~700 rpm), crucero (~2.200) y máxima (~2.700), en Opus mono 40 kbps → 75–100 KB en total. Un `AudioBufferSourceNode` con `loop=true` por capa, los tres arrancados a la vez con offsets distintos.
- **Crossfade equal-power por rpm** entre capas adyacentes: un `GainNode` por capa, curvas coseno precalculadas, `setTargetAtTime` con τ≈50 ms. Además `playbackRate = rpm/rpm_capa`, acotado a ±25% para que el tono siga al motor sin efecto ardilla.
- **Anti-sierra y anti-bucle:** jitter de ±0,4% en `playbackRate` (aleatorio lento, actualizado desde el rAF) y una capa de ruido de hélice — buffer de ruido generado en runtime (0 bytes) → `BiquadFilterNode` paso banda 150–400 Hz con ganancia ligada a rpm — que ensucia la periodicidad del bucle.
- **Gas ≠ rpm:** un lowpass en el bus del motor cuya frecuencia sigue la palanca. Gas cerrado = motor tapado: respuesta táctil inmediata aunque las rpm tarden en bajar.

**Coste:** ~10 nodos, \<1% de CPU en tablet media. Plan B sin assets: un `AudioWorklet` con tren de pulsos a `f = rpm/60 · ncil/2` y amplitud aleatoria por ciclo (~1–2% CPU, 0 bytes, timbre más pobre). Nunca `ScriptProcessorNode`.

## 02. Viento y aviso de pérdida

- Un único `AudioBuffer` de ruido blanco de 2 s generado al arrancar (0 bytes), en dos ramas: **cuerpo** (paso banda 300–900 Hz, ganancia ~(IAS/IAS_max)² con clamp) y **silbido** (`BiquadFilterNode` con Q≈8 cuya frecuencia sube de 600 a 2.500 Hz con la velocidad). La altura del silbido *es* el anemómetro: la velocidad se oye sin mirar.
- **La pérdida se oye antes que el HUD.** Al acercarse el ángulo de ataque al crítico, bataneo: un LFO de 9–12 Hz modula la ganancia del viento con profundidad proporcional a `(AoA−AoA_aviso)/(AoA_crit−AoA_aviso)`, y el silbido cae porque el flujo se desprende. Es física real convertida en aviso: el niño aprende «cuando el aire tiembla, baja el morro» sin leer nada.

## 03. Idioma sonoro para quien no lee

Un solo instrumento para toda la instrucción: **cinco notas de arpa paraguaya muestreadas** (~2 KB por nota en Opus; el resto por pitch-shift). Gramática fija: **subir = bien · bajar = corregir · repetir = mira · acelerar = más cerca**.

| Señal          | Motivo                                                        | Regla que aplica                              |
|----------------|---------------------------------------------------------------|-----------------------------------------------|
| Acierto        | Dos notas ascendentes (tónica–quinta)                         | subir                                         |
| Conseguido     | Arpegio ascendente de cinco notas                             | el éxito termina la frase del acierto         |
| Error          | Dos notas descendentes suaves, cuerda apagada                 | bajar — nunca un zumbido: hay niños de 4 años |
| Atención       | La misma nota, dos veces                                      | repetir                                       |
| Objetivo cerca | Nota repetida con tempo creciente                             | acelerar (lógica de variómetro)               |
| Peligro        | Pulso grave de 100 Hz que acelera (`OscillatorNode`, 0 bytes) | único sonido fuera del arpa: inconfundible    |

Como máximo 7 motivos, ninguno con cola \>600 ms, y validados con niños reales de la granja antes de dar el set por cerrado.

## 04. Música

**Sí, pero como acontecimiento, no como fondo.** En vuelo, el paisaje es motor + viento; la música continua cansa a los diez minutos y en el aula es ruido.

- **Encargo a un arpista paraguayo** (sesión remota, contrato de cesión total por escrito, orientativo 300–800 €): una **guarania** lenta (menú, vuelo libre a altura) y una **polca** (celebración), en stems. Arpa sola o arpa + guitarra: la sobriedad es lo que evita la postal turística, y como el arpa ya es el instrumento del interfaz, la identidad es coherente y no decorativa.
- **Adaptativo barato, sin middleware:** 2–3 stems por pieza en bucles sincronizados, un `GainNode` por stem con fundidos de 2–4 s según estado (altura, tutor activo, celebración). Unas 40 líneas de TypeScript.
- **Cuándo suena:** frase de 15–20 s al completar despegue u objetivo; guarania continua solo en vuelo libre y desactivable. En misión, silencio por defecto.
- **Bytes:** 2 piezas × 60–90 s × 2–3 stems en Opus 48 kbps mono ≈ 1,1–1,6 MB. Nunca en el bundle: `fetch` perezoso tras el primer gesto, con caché HTTP.

## 05. Diseño para el silencio

**Regla:** el audio nunca es el único canal de nada. Los avisos visuales de pérdida y de suelo se quedan; el tutor sigue siendo gestual.

Lo que el sonido **añade**: anticipación (el bataneo llega antes que el aviso visual), feedback continuo (la velocidad se oye sin mirar el anemómetro), recompensa emocional y dirección de la atención sin texto. Lo que **no puede depender de él**: ninguna instrucción, ningún estado de peligro, ningún objetivo. Test de aceptación: el juego entero, jugado en mute por alguien que no lee, sin pérdida de información.

## 06. El aula: veinte tablets a la vez

- **Modo aula** (icono, no texto; persistido en `localStorage`): master a −12 dB, música apagada, motivos de UI intactos, motor con −6 dB extra.
- `DynamicsCompressorNode` **siempre en el bus master** (threshold −18 dB, ratio 4:1, knee 12): altavoces de tablet más veinte fuentes son picos garantizados.
- **Sonidos cortos y en la misma escala:** veinte tablets desincronizadas suenan a aviario, no a caos, si nada dura más de un segundo y los solapes forman acordes.
- Botón de silencio grande y visual en la pantalla de inicio, pensado para la profesora.

## 07. Producción y presupuesto

- **Se sintetiza** (0 bytes): viento, peligro, ruido de hélice.
- **Se licencia:** el motor, de los Sonniss GDC Bundles (regalías cero, uso comercial y redistribución en juego permitidos) o de freesound.org filtrando estrictamente CC0 — nunca CC-BY-NC. BBC Sound Effects queda fuera: la licencia RemArc no es comercial. Cada fichero, con URL, autor y licencia en `CREDITS`.
- **Se graba:** las cinco notas de arpa y las dos piezas, con el arpista encargado. Es lo único que compra identidad.

| Partida                                  | Bytes       | Trabajo                         |
|------------------------------------------|-------------|---------------------------------|
| Motor (3 bucles Opus) + viento + buses   | ≈90 KB      | 3–4 días de dev                 |
| Motivos de arpa (5 muestras + lógica)    | ≈12 KB      | 1 día + iteración con niños     |
| Código de audio (gzip)                   | ≈8 KB       | —                               |
| Música en stems (carga diferida)         | ≤1,6 MB     | 2 días de integración + encargo |
| **Crítico total (en bundle o precarga)** | **≈110 KB** |                                 |

## 08. Autoplay sin botón feo

Chrome y Safari solo permiten audio tras un gesto. Nada de pantalla de «activar sonido»: el `AudioContext` se crea al cargar (nace `suspended`) y se llama `ctx.resume()` en el primer `pointerdown`/`keydown`/`touchend` que ya existe — el juego empieza con un toque de todos modos (tutor, gas). Listener global con `{once:true}`; en iOS, el resume dentro de `touchend`. El paisaje entra con un fundido de 1,5 s para que despertar tarde parezca diseño. Gestionar también `visibilitychange` (suspender al ocultar la pestaña: batería, y silencia la tablet olvidada) y el `resume()` rechazado, reintentando en el siguiente gesto.

## → Cinco issues listas para abrir

1.  audio-01 · **Núcleo AudioEngine:** `AudioContext` suspendido + desbloqueo en primer gesto + buses motor/viento/UI/música con `DynamicsCompressorNode` en master y modo aula persistido.
2.  audio-02 · **Motor híbrido:** 3 bucles Opus (~90 KB) con crossfade equal-power por rpm, jitter anti-bucle y lowpass ligado al gas; plan B `AudioWorklet` sin assets.
3.  audio-03 · **Viento y bataneo de pérdida:** ruido sintetizado (0 bytes), silbido proporcional a la IAS y modulación de 9–12 Hz ligada al AoA antes del aviso del HUD.
4.  audio-04 · **Idioma de motivos de arpa:** 5 muestras (~12 KB), 7 motivos con la gramática subir/bajar/repetir/acelerar, validados con niños que no leen.
5.  audio-05 · **Encargo de guarania y polca en stems:** arpista paraguayo con cesión por escrito, 2–3 stems por pieza, carga perezosa ≤1,6 MB y mezcla adaptativa por `GainNode`.

Óga Veve · Granja Óga / Oksigenia SL · gratis a perpetuidad para la educación paraguaya
