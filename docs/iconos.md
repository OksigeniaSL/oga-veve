# Los iconos del juego

Inventario revisado con dos preguntas por dibujo: **¿lo entiende sin leer alguien
de cuatro años?** y **¿es verdad en este avión?** (reglas 2 y 4 del `AGENTS.md`).
Mirado en los cuatro peldaños, con el JAZ 20 (pistón) y el JAZ 120 (reactor), en
tablet 1280×800 y teléfono 915×412 táctil.

Regla que sale de la revisión: **un significado, un dibujo**. Casi todos los
fallos eran la misma acción dibujada de dos maneras según dónde se mirara.

## Motor

| Icono | Qué dice | Dónde | Veredicto | Qué se hizo |
|---|---|---|---|---|
| Hélice que gira | el motor y cuánto gas | pictograma del rincón (Guyrami, Tukã) | falso en JAZ 90 y JAZ 120: no llevan hélice | en reactores, **el fan dentro de su góndola** (`fan` en `ui/pictogramas.ts`); gira igual, el aro no |
| Hélice + flecha (`HELICE_MAS/MENOS`) | más / menos gas | botones del gas del HUD, teclado dibujado | igual | `motorMas/motorMenos(chorro)`: hélice o fan según el avión |
| Dos hélices, grande y pequeña | la palanca táctil del gas | `#tactil` en `index.html` | igual | la pinta `game.ts` (`ponerElDibujoDelMotor`) con el motor del avión |
| Hélice (tarjeta «arrancando») | el motor arranca | señal del rincón | igual | `Senal.chorro`: sale `reactor` en vez de `helice` |
| Llave | arrancar / apagar | tarjeta, tecla, mando de cabina | pasa; un reactor no tiene llave, pero es el dibujo de «arrancar» en todo el juego | sin cambio, anotado |

## Barra de arriba y esquina

| Icono | Qué dice | Dónde | Veredicto | Qué se hizo |
|---|---|---|---|---|
| (todos los rellenos) | — | botones redondos `.sonido` | **fallo de color**: sin regla, el SVG pintaba en negro sobre fondo negro (pausa, esquema del ala, cuaderno, bandera de misión) | `.sonido svg { fill: currentcolor }` |
| Cámara de fotos | cambiar de vista | esquina | una cámara dice «sacá una foto»; el teclado dibujado ya usaba el ojo | **el ojo**, el mismo que la tecla (`OJO` en `ui/teclas.ts`) |
| Pausa ‖ | parar | esquina | pasa (era invisible por el color) | color |
| Persona sentada de perfil | cinturón (cartel y mando) | esquina y barra | a 24 px se leía como un grifo; antes, como un tenedor | **de frente**, con la banda que sobresale y la hebilla con su hueco |
| Gafas | premio ganado | esquina | dos dibujos casi iguales para lo mismo | el botón usa `DIBUJOS.gafas` |
| Avión sobre una raya | piloto automático | barra (Taguato +) | pasa, justo; se entiende al ver que se enciende | sin cambio |
| 🔊 🔉 🔇 | nivel de sonido | barra | emoji: cada sistema los pinta a su modo, y era el único de otro estilo | altavoz SVG con dos, una o ninguna onda y aspa |
| Teclado | pantalla de mandos | barra | pasa | — |
| Mapa plegado | plano | barra | pasa | — |
| Nube | el tiempo | barra | pasa | — |
| Perfil + dos rayas | esquema del ala | barra | se leía como tres latigazos negros | perfil entero, una línea de corriente y **la flecha de la sustentación** |
| i | créditos | barra | pasa | — |
| Rectángulo con rayas | cuaderno de vuelo | barra | se tomaba por un bocadillo de chat / mensajes | **un cuaderno con un avión en la tapa** |
| Arco fino / casita | volver al hangar | barra / pantalla final | dos dibujos para la misma puerta; la casa dice «a casa» | uno solo, **la nave de techo curvo con el portón** (`HANGAR`), con `aria-label` también en el final |
| Bandera | misión | barra | pasa (era negra) | color |
| Flecha ➤ | a dónde está el destino | tarjeta del destino | pasa | — |
| Plano del aeródromo en miniatura | a cuál se va | tarjeta del destino (Guyrami) | a ese tamaño una pista es una raya y todas son iguales | **el indicativo OACI en su placa**, grande, igual que la ficha del destino del hangar (`.casa__oaci--placa`) |

## Mandos de la derecha y cabina

| Icono | Qué dice | Dónde | Veredicto | Qué se hizo |
|---|---|---|---|---|
| Avión + barra | frenar | botón rojo, tarjeta | pasa | — |
| Mano | frenar | teclado dibujado, tutor táctil | la mano es «alto» y el botón de frenar ya se había cambiado por eso | el teclado y el tutor usan `DIBUJOS.freno` |
| Rueda con su pata | tren | botón, tarjeta, cabina | pasa | — |
| Rueda con su pata sobre la raya del suelo | el tren no se mete con el avión apoyado | tarjeta (`tren-en-el-suelo`) | nuevo: el mismo dibujo del tren, con el porqué debajo | el botón del HUD da un meneo en ámbar y suenan las dos notas que bajan |
| Perfil con flap caído | flaps | botón, tarjeta, cabina | pasa | — |

## Tutor (tarjeta de «qué hacer ahora» del despegue y la toma)

Eran caracteres —⇡ ⇣ ⏱ ✦ ✋ ⤳—, dos de ellos emoji, y ninguno era un dibujo del
juego. Ahora son los mismos que se buscan en pantalla: el motor con su flecha
(hélice o fan), `motor` (el avión saliendo), `tirar`, `ala`, `freno` y `salida`.
La tarjeta se repinta solo cuando cambia, no en cada fotograma.

## Tarjetas de señal (`DIBUJOS`, `ui/senal.ts`)

Todas pasan las dos preguntas, con la excepción ya tratada de la hélice en los
reactores. `acasa` (dos rayas y la raya de rodaje entrando) es la más floja de
leer; se deja, porque su hermana `amarillo` le da el contexto.

## Hangar

Pasos de la barra de abajo (sitio, destino, misión/tramo, piloto, avión,
ajustes), banderas, mundos foto/dibujado, surtidor y botón de despegar: pasan.
La placa OACI de la ficha del destino sube de tamaño para ser la misma que se ve
volando.
