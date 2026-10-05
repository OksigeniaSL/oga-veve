# Pendiente: las voces de la final (la ventanilla y la pista ocupada)

Encargo del 2 de octubre de 2026, con dos fallos vistos por Enrique en la
versión publicada (Gran Canaria, JAZ 120, Guyrami, de noche): la ventanilla
ALT que subía de 2.100 a 3.000 en la final, y un avión en la pista sin que
nadie mandara frustrar. ElevenLabs está sin saldo hasta el 6 de octubre, así
que **esta rama no mete en el código ninguna clave nueva**: lo de abajo se
graba primero, se le pone su receta y **entonces** se engancha en el sitio que
se dice. Engancharlo antes sería meter una frase muda: en el Brave de Enrique
(Linux) no hay voces del sistema y una clave sin grabar es silencio.

## 1. La ventanilla en la final

Ya no cambia en Guyrami ni en Tukã, y de Taguato para arriba solo cambia con
el automático bajando por la senda —el `G/S` escrito en el FMA—. Ver
`ventanillaEnLaFinal` en `src/flight/altitud-seleccionada.ts`.

Así que la frase que estaba pedida en `PENDIENTE-VOCES-automatico.md`
(`vuelo.ventanillaFrustrada`, «en los tres peldaños de abajo») **se queda en
un solo peldaño, Taguato**, que es el único donde la ventanilla cambia y la
instructora todavía explica; y el texto dice quién baja, que es el automático.
Sustituye a la fila de aquel fichero.

| voz | clave | es-PY | en | dónde se engancha |
|---|---|---|---|---|
| instructor | `vuelo.ventanillaFrustrada` | El automático ya baja por la senda. En la ventanilla ponemos la altura de irse al aire, por si hay que subir: bajar, lo manda la senda. | The autopilot is on the glide path now. In the window we set the go-around altitude, in case we have to climb: the path does the descending. | `game.ts`, `ponerLaFrustradaEnLaVentanilla`, al cambiar la ventanilla, solo si `laInstructoraLoExplica` (en la práctica, Taguato). |

## 2. La pista ocupada después del permiso

La orden ya existe y está grabada: la lámpara roja del aire, la torre con su
voz («ida al aire» en casa, «motor y al aire» en Canarias), «go around, runway
occupied» de Taguato para arriba y, en los de abajo, la instructora con
`vuelo.mandanFrustrar` («Pista ocupada. Subí y volvé por el circuito»). Eso es
lo que suena ahora cuando alguien entra en la pista después de tu permiso y
sigue ahí a la altura de decisión. No hace falta nada nuevo para que funcione.

Lo que sí falta es el **porqué** de que se retire un permiso ya dado, que a
los cuatro años es lo raro: «¿no me había dejado?». Opcional, detrás de la
orden de la torre y en lugar de `vuelo.mandanFrustrar` cuando había permiso:

| voz | clave | es-PY | en | dónde se engancha |
|---|---|---|---|---|
| instructor | `vuelo.permisoAnulado` | La torre nos había dejado aterrizar, pero entró un avión en la pista. Con la pista ocupada no se aterriza: subimos y volvemos por el circuito. | The tower had cleared us to land, but a plane got onto the runway. With the runway occupied we don't land: we climb and come back round the circuit. | `game.ts`, `mandaronIrseAlAire` con `porque === "pistaOcupada"`, si `permisoDeAterrizar` era `oido`; en los tres peldaños de abajo. |

**La pista de al lado.** En Gando hay dos paralelas (03L/21R y 03R/21L), y el
tráfico dibujado usa **solo la pista en uso**, la misma que la tuya (ver
`ponerTrafico` en `game.ts`): nunca hay nadie en la de al lado. El avión de la
captura estaba en la tuya. Si algún día se dibuja tráfico en la paralela, hará
falta una frase que lo cuente («ese avión está en la otra pista: la nuestra
está libre»), y no antes.

## 3. La toma larga y aterrizar contra la orden (tanda 13, puntos 206 y 237)

Encargo del 5 de octubre de 2026. Las claves y sus textos **ya están** en
`src/i18n/es-PY.ts` y `en.ts` (el guaraní, quieto: cae al castellano), y el
código ya las pide **solo con su grabación** (`this.instructor.vozDe(clave)`):
mientras tanto lo cuenta la tarjeta de la frustrada, con su dibujo, su texto
en los peldaños que leen y el tono de atención. Unos 260 caracteres.

| voz | clave | es-PY | en | dónde se engancha |
|---|---|---|---|---|
| instructor | `vuelo.tomaLarga` | Así no: nos vamos al aire y lo volvemos a intentar | Not like this: we go around and try again | `game.ts`, `mirarLaTomaLarga`: flotando o tocando pasada la zona de toma, una vez por toma, en los tres peldaños de abajo. Ver `src/flight/toma-larga.ts`. |
| instructor | `vuelo.tomaLargaSinPista` | No nos da la pista para parar: nos vamos al aire y lo volvemos a intentar | Not enough runway to stop: we go around and try again | Lo mismo, rodando sin pista para parar mientras todavía se puede subir. |
| instructor | `vuelo.aterrizasteContraLaOrden` | La torre nos había mandado al aire. Cuando la torre manda irse, uno se va: ella ve lo que nosotros desde acá no vemos | The tower had sent us around. When the tower says go around, you go: it sees what we can't see from here | `game.ts`, `aterrizoContraLaOrden`: después de aterrizar con la orden de la pista ocupada puesta, detrás de la torre (seis segundos), una vez; no en el peldaño de cabina. |

## 4. Grabar

```bash
# Primero las claves y los textos en src/i18n/es-PY.ts y en.ts (el guaraní,
# quieto: cae al castellano).
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor
node scripts/voces-elevenlabs.mjs instructor
```

Después de grabar, nunca antes, la receta de cada clave en
`crudo/instructor/recetas.json` (`d[clave] = [clave]`), hornear, restaurar lo
re-codificado y pasar `node scripts/verificar-voces.mjs`. Y solo entonces el
código.
