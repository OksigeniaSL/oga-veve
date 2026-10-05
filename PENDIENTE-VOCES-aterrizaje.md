# Pendiente: grabar las voces del aterrizaje (aerofrenos, autofreno y reversa)

La tanda del aterrizaje (palanca de aerofrenos de tres posiciones, frenos de
tierra, autofreno, frenada calibrada y el tren tras despegar) se hizo el 2 de
octubre de 2026, con ElevenLabs sin saldo hasta el 6 de octubre. Ninguna de
estas frases está metida en el juego como voz —ni la clave en `src/i18n/`
como `vuelo.*`—: el juego funciona con lo que ya hay grabado y con tarjetas,
y esto dice qué grabar y qué tocar después para que suenen.

Lo que ya suena sin grabar nada: el tren tras despegar usa las frases que
había («Metélo, el tren te frena», `vuelo.meteElTren`, y «positive rate»,
«gear up» en la cabina), ahora con margen en Guyrami y una segunda vez al
cruzar los mil pies o acercarse a la VLE.

## La instructora

Voz `instructor` (castellano paraguayo con voseo, la de `docs/voces/voces.json`).
Unos 560 caracteres.

| Clave | es-PY | en | Cuándo |
|---|---|---|---|
| `vuelo.armaLosAerofrenos` | Antes de aterrizar, armá los aerofrenos y el autofreno: al tocar salen solos y frenamos bien | Before landing, arm the speed brakes and autobrake: they come out by themselves when we touch down | al entrar en final con el tren abajo y sin armar; hoy sale la tarjeta `hud.armaAerofrenos` sola (`atenderALaListaDeAterrizaje` en `game.ts`) |
| `vuelo.losArmeYo` | Los aerofrenos y el autofreno los armé yo, para frenar bien al tocar | I armed the speed brakes and autobrake, so we brake well when we touch down | en los tres peldaños de abajo, a 500 ft si seguían sin armar; hoy, tarjeta `hud.aerofrenosArmados` |
| `vuelo.salenLosFrenosDeTierra` | ¿Viste? Al tocar se levantaron los paneles del ala: el ala deja de sostener el avión y las ruedas frenan | See that? The panels on the wing came up when we touched down: the wing stops holding the plane up and the wheels can brake | al salir los frenos de tierra, en los tres peldaños de abajo y detrás de la llamada de cabina (un suceso, una voz) |
| `vuelo.sinFrenosDeTierra` | No salieron los aerofrenos porque no estaban armados: frená con calma, que al principio las ruedas casi no cargan | The speed brakes didn't come out because they weren't armed: brake gently, the wheels carry almost no weight at first | al tocar un reactor con la palanca recogida |
| `vuelo.quitaLaReversa` | Ya vamos despacio: quitá la reversa | We're slow now: stow the reversers | con la reversa puesta por debajo de 30 kt (`REVERSA_HASTA`), donde ya no frena |
| `vuelo.autofrenoSuelto` | Pisaste el freno: el autofreno se soltó y ahora frenás vos | You pressed the brakes: the autobrake let go, now you're braking | al desarmarse el autofreno con el pie mientras frenaba |

## Las llamadas de cabina

Las del piloto que no vuela en la carrera de aterrizaje de la familia de
Airbus, que es la del autofreno LO/MED/MAX. Van en `CABINA` de
`scripts/frases-para-grabar.mjs` (no se traducen) y, con su toma, en
`CLAVE_DE_CABINA` de `src/audio/cabina.ts`. Suenan en los cuatro peldaños en
los dos reactores —es lo que se oye en ese avión—, y en los de abajo la
instructora explica detrás.

| Clave | Texto | Cuándo |
|---|---|---|
| `cabina.spoilers` | spoilers | al salir los frenos de tierra |
| `cabina.reverseGreen` | reverse green | al abrirse las reversas en tierra |
| `cabina.decel` | decel | al notarse la deceleración del autofreno (cuando entra) |
| `cabina.seventyKnots` | seventy knots | a 70 kt en la carrera, para pasar las reversas a ralentí |

## Después de grabar

1. Añadir las claves `vuelo.*` a `src/i18n/es-PY.ts` y `src/i18n/en.ts`, junto
   a `vuelo.meteElTren`, y las de cabina a `CABINA` en
   `scripts/frases-para-grabar.mjs`.
2. Como siempre:

   ```bash
   node scripts/frases-para-grabar.mjs
   node scripts/voces-elevenlabs.mjs --cuanto instructor
   node scripts/voces-elevenlabs.mjs instructor
   ```

   Receta en `crudo/instructor/recetas.json`, una toma por frase, hornear,
   restaurar lo re-codificado que no sea nuevo y `node scripts/verificar-voces.mjs`.
3. Engancharlas en `game.ts`:
   - `atenderALaListaDeAterrizaje`: `this.instructor.decir(...)` con
     `vuelo.armaLosAerofrenos` al mostrar la tarjeta y `vuelo.losArmeYo` al
     armarlos ella.
   - Los frenos de tierra al tocar: mirar `input.palancaDeAerofrenos.frenosDeTierraFuera`
     al pasar de `false` a `true` en tierra → `cantar("spoilers", t("vuelo.salenLosFrenosDeTierra"), ...)`;
     y tocar con la palanca recogida en un reactor → `vuelo.sinFrenosDeTierra`.
   - La reversa: «reverse green» al abrirse; `vuelo.quitaLaReversa` por debajo
     de `REVERSA_HASTA` con la tecla todavía apretada (una vez por carrera).
   - El autofreno: «decel» cuando `frenando` pasa a `true`; `vuelo.autofrenoSuelto`
     cuando se desarma con el pie.

## La lista de después del aterrizaje, punto por punto

Tanda del cuadro y la cabina (punto 248b), 5 de octubre de 2026. Aquí las
claves **sí están en `src/i18n/`** —en `es-PY.ts` y en `en.ts`— y el juego ya
las usa: sin grabación se ven en su tarjeta, con su dibujo y su tecla, y la voz
calla, que una frase sin grabar es muda en Brave para Linux. En cuanto tengan
su pieza, suenan solas: `decirElPuntoDeLaLista` en `game.ts` mira
`instructor.vozDe`.

Voz `instructor`. Unos 200 caracteres.

| Clave | es-PY | en | Cuándo |
|---|---|---|---|
| `vuelo.despues.aerofrenos` | Los aerofrenos, adentro: bajá la palanca. | Speed brakes in: lever down. | fuera de la pista, en los reactores, si la palanca sigue fuera (primer punto de la lista) |
| `vuelo.despues.luces` | Las luces las hago yo: apago las de aterrizaje y dejo la de rodaje. | I'll do the lights: landing lights off, taxi light on. | después de los flaps, hechos o esperados veinte segundos |
| `vuelo.despues.transpondedor` | Y el transpondedor: pongo el TCAS en espera. | And the transponder: TCAS to standby. | después de las luces, con su respiro |

Los flaps usan la que ya está grabada, `vuelo.flapsArribaAlSalir`, y en el
peldaño de cabina, al leer el primer punto, `vuelo.despuesDelAterrizaje`. Ver
`ListaDeDespuesDeAterrizar` en `src/flight/despues-de-aterrizar.ts`.
