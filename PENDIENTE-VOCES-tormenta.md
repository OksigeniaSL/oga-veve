# Pendiente: grabar el ejercicio de la tormenta

El ejercicio de la tormenta (`src/flight/practica-de-tormenta.ts`,
`src/world/cumulonimbo.ts`; `?ejercicio=tormenta`) tiene **diecisiete tomas
sin grabar** (2.184 caracteres):

- **Trece de la instructora** (1.954 caracteres), `ejercicio.tormenta.*`: la
  presentación, por qué no se entra y por dónde se rodea —sin números y con el
  radar—, el aviso al control y el cartel, el «girá más» por cada lado, el
  «así», el rayo de lejos, lo de dentro, el rayo que toca el avión, la salida
  y los dos finales.
- **Cuatro de las torres** (230 caracteres): la respuesta del control al
  desvío, por la derecha y por la izquierda, en la torre paraguaya y en la
  canaria.

Mientras no se graben, **no suenan**: la instructora de un ejercicio solo
habla con su frase grabada —ver `decirDelEjercicio` en `src/game.ts`—, y lo
que dice se lee en la tarjeta en los peldaños que leen; el dibujo de la
tarjeta va en los cuatro. La respuesta del control se lee en la tira de la
radio. Ninguna pasa a la voz del navegador.

Están en `scripts/frases-para-grabar.mjs` **al final de la lista**, detrás de
los sellos —ver `DE_LA_TORMENTA` y `DESVIO_POR_LA_TORMENTA`—, para no
renumerar nada ya grabado: en el guion de la instructora de la 599 a la 611,
en el de la torre la 167 y la 168, y en el de la torre canaria la 169 y la
170. El grupo `ejercicio` las aparta para que no entren en medio.

## Qué se graba, y cómo

**La instructora, entera en calma**, como todo `ejercicio.*` (el bucle de los
ejercicios de emergencia ya les pone `AJUSTES_EN_CALMA` y el punto final). Las
que cuentan el rayo y lo que sacude —`rayoLejos`, `adentro`,
`rayoEnElAvion`, `salimos`— están además en `EN_CALMA_COMO_SE_ESCRIBE`, para
que se encuentren. Para muchos será **el primer rayo y la primera turbulencia
que oigan contar**: firme y tranquila, nunca alarmada. Lo que se enseña es
justo eso, que la calma es la forma que tiene la seguridad de funcionar.

- «Magenta» se dice *magenta*, como el color del radar.
- «Veinte millas, unos treinta y siete kilómetros»: millas náuticas; no hace
  falta decir «náuticas».

**Las torres**: la misma pieza en las dos voces, con el filtro de radio de
siempre, detrás de la matrícula:

| Clave | Texto |
|---|---|
| `torre.solo.desvioDerecha` | deviation right of route approved, advise clear of weather |
| `torre.solo.desvioIzquierda` | deviation left of route approved, advise clear of weather |
| `torre.canario.solo.desvioDerecha` | (lo mismo, voz canaria) |
| `torre.canario.solo.desvioIzquierda` | (lo mismo, voz canaria) |

Y sus recetas, como la del PAN PAN, en `crudo/torre/recetas.json`:

```json
"torre.solo.desvioDerecha": ["torre.solo.desvioDerecha"],
"torre.desvioDerecha": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.desvioDerecha"],
"torre.solo.desvioIzquierda": ["torre.solo.desvioIzquierda"],
"torre.desvioIzquierda": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.desvioIzquierda"],
```

y las gemelas `torre.canario.*` en `crudo/torre-canarias/recetas.json`. Al
grabarlas, `torre.desvioDerecha` y `torre.desvioIzquierda` **salen de
`ESPERAN_SU_TOMA`** en `src/audio/torre.ts`: lo recuerda
`src/audio/torre.test.ts`.

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs instructor
node scripts/voces-elevenlabs.mjs torre
node scripts/voces-elevenlabs.mjs torre-canarias
```

Y el horneado de siempre, devolviendo lo re-codificado que no es nuevo.

## Y comprobarlo

- `node scripts/verificar-tormenta.mjs rodear` y `… entrar` (Pettirossi, JAZ
  90, Taguató): con las tomas, `vocesDeCadaBoca` tiene que traer las nuevas y
  `cantados` ya no las apunta como «sin grabar».
- `node scripts/verificar-voces.mjs`, con una de las nuevas en `REPARTO`.

## Las fuentes de lo que se dice

Comprobadas leyendo el documento, salvo donde se dice.

- **Veinte millas del eco intenso, y bajo el yunque.** FAA, *Aeronautical
  Information Manual*, 7-1-27 a.14 (edición del 20-2-2025 con los cambios
  hasta el 9-7-2026): «Do avoid by at least 20 miles any thunderstorm
  identified as severe or giving an intense radar echo. This is especially
  true under the anvil of a large cumulonimbus». Lo mismo en el *Aviation
  Weather Handbook* FAA-H-8083-28B, 22.8.2, ítem 14, y en el antiguo AC
  00-24C, 10.a.(14), que la FAA canceló el 22-12-2022 al juntar sus circulares
  de meteorología en ese manual.
- **Que son náuticas.** La FAA no lo dice en esa frase (la definición de
  «miles» como náuticas es de la orden de los controladores, JO 7110.65BB,
  1-2-1.k). Lo escriben en náuticas Airbus, *Safety First* n.º 22 (2016),
  «Optimum use of weather radar»: «should be cleared by a minimum of 20 NM
  laterally», y SKYbrary, «Weather Radar: Storm Avoidance».
- **Empezar a rodear de lejos.** Airbus, *Safety First* n.º 22: «crews should
  consider a minimum distance of 40 NM from the convective cloud to initiate
  the avoidance maneuver». El ejercicio empieza a 38–41 millas del centro,
  con la tormenta en el borde del radar del cuadro, que llega a cuarenta.
- **Por el lado del viento.** Airbus, *Safety First* n.º 22: «When possible,
  it is advisable to try to avoid a storm by flying on the upwind side of a
  cumulonimbus. Usually, there is less turbulence and hail upwind», y su nota
  de operaciones de 2007 (FLT_OPS–ADV_WX–SEQ 07). La FAA no lo dice.
- **El granizo bajo el yunque.** AC 00-24C, 7.d.(2), y FAA-H-8083-28B,
  14.4.5: «Pilots should anticipate possible hail with any thunderstorm,
  especially beneath the anvil of a large cumulonimbus».
- **Ni por debajo.** AIM 7-1-27 a.2: «Don't attempt to fly under a
  thunderstorm even if you can see through to the other side».
- **Dentro: el cinturón y seguir derecho.** AIM 7-1-27 b.1: «Tighten your
  safety belt…»; c.4: «Don't turn back once you are in the thunderstorm. A
  straight course through the storm most likely will get the aircraft out of
  the hazards most quickly».
- **El cinturón con turbulencia.** FAA, «Turbulence: Staying Safe»
  (20-3-2026): «Keeping their seat belt buckled at all times»; y el AC
  120-88A, 6.b: de 1980 a 2003, solo cuatro heridos graves sentados y con el
  cinturón abrochado.
- **El avión está hecho para el rayo.** 14 CFR 25.581(a) y EASA CS 25.581(a):
  «The airplane must be protected against catastrophic effects from
  lightning».
- **Casi toda la corriente, por fuera.** FAA, *Lessons Learned*, N709PA:
  «Aluminum skins keep most of the lightning currents in the skins». *Casi*
  toda, no toda: por eso la frase dice «casi toda» y no se dice «jaula de
  Faraday», que no aparece en ninguna página oficial de la FAA ni de EASA.
- **Una o dos veces al año.** FAA, *Lessons Learned*, N709PA: «on average,
  each airplane is struck once or twice a year».
- **El desvío por radio.** FAA JO 7110.65BB, 2-6-4 i.5: «DEVIATION
  (restrictions if necessary) APPROVED, ADVISE CLEAR OF WEATHER». La OACI lo
  tiene por enlace de datos —Doc 4444, apéndice 5: «REQUEST WEATHER
  DEVIATION UP TO (lateral deviation) OF ROUTE», «CLEARED TO DEVIATE…»,
  «CLEAR OF WEATHER»— y de viva voz solo «WEATHER DEVIATION REQUIRED», en el
  capítulo 15. La petición que se lee en la tira es la de la OACI dicha de
  viva voz, y la respuesta, la de la FAA.
- **El trueno de lejos no llega.** Met Office: «thunder is rarely heard more
  than 20 km away». Por eso el rayo de lejos no suena.

**Por verificar**: la base de la nube a mil doscientos metros (es el orden de
magnitud de una tormenta de tarde de verano en Paraguay, no un sondeo
medido) y la cima a trece kilómetros (lo normal en los trópicos es de doce a
quince).
