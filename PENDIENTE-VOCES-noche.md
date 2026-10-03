# Pendiente: voces de la noche (tanda 8, punto 126)

El 03-10-2026 ElevenLabs no tiene saldo hasta el 6 de octubre. Esta rama
**no mete en el código ninguna frase hablada nueva**: lo que hace la noche se
ve entero sin voz —la tarjeta con su dibujo en los cuatro peldaños, el nombre
desde el segundo y la frase escrita desde el tercero— y ninguna de las claves
de aquí existe todavía en `src/i18n/` ni en las recetas. En Brave para Linux
no hay voces del navegador: una frase sin grabar sería silencio, y por eso no
se ha puesto ninguna.

Cuando se graben: pedirlas en `scripts/frases-para-grabar.mjs`, grabar con
`node scripts/voces-elevenlabs.mjs <voz>`, añadir la receta **después** de
grabar (una receta que nombra una pieza que no existe rompe el horneado),
hornear, restaurar lo re-codificado y pasar `node scripts/verificar-voces.mjs`.
Y solo entonces el texto en `es-PY.ts` y `en.ts`, que es lo que enciende la voz.

## 1. La Cruz del Sur y la Polar por la ventanilla

Ya se señalan: de noche, con el cielo despejado desde el avión, en crucero y
con hueco, sale la tarjeta con su dibujo —la cruz de cuatro estrellas, o la
Polar con las dos de la Osa Mayor que apuntan a ella— y la flecha hacia el
lado; tocarla gira la cabeza hacia la estrella. Ver `estrellasQueSeSenalan`
en `src/world/hitos-del-cielo.ts`. Solo cuando está entre diez y sesenta
grados sobre el horizonte: más abajo se la come la bruma y más arriba no se
ve por una ventanilla.

Lo que falta es la voz. Entra sola por `loQueSeDice` en
`src/audio/ventanilla.ts` en cuanto la clave tenga texto: la receta es la de
siempre —el lado delante, la frase del sitio detrás, y el saludo la primera
vez—, con la clave del hito, que es la de abajo.

La Cruz solo se señala en Paraguay —desde Canarias, como mucho, asoma unos
grados en primavera— y la Polar solo en Canarias: desde Paraguay está bajo el
horizonte toda la noche. Por eso las de la comandante van cada una en el
registro de su sitio: la Cruz en paraguayo, la Polar sin voseo ni
paraguayismos, como las de Canarias. La comandante le habla al pasaje de
usted; la instructora, de vos, en los dos sitios.

| voz | clave | es-PY | en |
|---|---|---|---|
| comandante (Jazlyn) | `ventanilla.cruz-del-sur` | «Y ahora, miren el cielo: esas cuatro estrellas en cruz son la Cruz del Sur. Si alargan el palo largo unas cuatro veces y media, llegan justo al sur. ¡Así se orientaban los navegantes, mucho antes del GPS!» | «Now look at the sky: those four stars in a cross are the Southern Cross. Stretch the long bar about four and a half times and you reach due south. That's how sailors found their way, long before GPS!» |
| comandante (Jazlyn) | `ventanilla.polar` | «Miren hacia el norte: esa estrella sola, ni muy alta ni muy baja, es la Estrella Polar. No es la más brillante, pero es la más útil: casi no se mueve en toda la noche y marca el norte. Y está tan alta como lejos estamos del ecuador: aquí, unos veintiocho grados.» | «Look north: that lonely star, not too high and not too low, is the Pole Star. It isn't the brightest, but it's the most useful: it hardly moves all night and it marks north. And it sits as high as we are far from the equator: here, about twenty-eight degrees.» |
| instructora | `ventanilla.vos.cruz-del-sur` | «Mirá esas cuatro estrellas en cruz: es la Cruz del Sur. Si alargás el palo largo cuatro veces y media, apuntás al sur.» | «Look at those four stars in a cross: that's the Southern Cross. Stretch the long bar four and a half times and you're pointing south.» |
| instructora | `ventanilla.vos.polar` | «¿Ves esa estrella sola, hacia el norte? Es la Polar. Casi no se mueve: toda la noche marca el norte.» | «See that lonely star to the north? That's the Pole Star. It hardly moves: all night long it marks north.» |

Todo comprobado: el palo de Gácrux a Ácrux prolongado cuatro veces y media
cae a menos de tres grados del polo sur del cielo, y la altura de la Polar es
la latitud con menos de un grado de diferencia. Ver
`src/world/cielo-de-noche.test.ts`, que lo mide contra PyEphem.

## 2. Las luces de otro avión, de noche

Ya se ve: la primera vez en el vuelo que, de noche y en vuelo tranquilo,
otro avión queda por delante —a cuarenta y cinco grados del morro, entre
cuatrocientos metros y ocho kilómetros—, sale una tarjeta con **lo que se ve
de él**: la verde a la izquierda y la roja a la derecha si viene de frente,
la blanca sola si se va, la roja o la verde sola si cruza, con la flecha
hacia donde va. «¡Mirá!» en el segundo peldaño y la frase escrita desde el
tercero (`luces.deFrente`, `luces.seAleja`, `luces.cruzaIzquierda`,
`luces.cruzaDerecha`, que no se dicen). Es una lección, así que va como
`explicarElTrafico`: en los tres peldaños de abajo, con hueco y con la
esquina libre de tarjetas que importan más. Ver `queLucesSeLeVen` en
`src/world/luces-del-trafico.ts` y `Game.contarLasLucesDeNoche`.

Falta la instructora, con calma, en ese mismo momento. Va detrás de la
información de tráfico si la hay —un suceso, una voz—: la tarjeta ya espera
hueco con `huecos`. La clave sale de `queLucesSeLeVen`:

| voz | clave | es-PY | en |
|---|---|---|---|
| instructora | `vuelo.lucesDeNoche.deFrente` | «Mirá ese avión: la luz verde a tu izquierda y la roja a tu derecha. Eso quiere decir que viene hacia nosotros. Para eso llevan luces los aviones: para verse a tiempo.» | «Look at that plane: green light on your left, red on your right. That means it's coming towards us. That's what a plane's lights are for: to be seen in time.» |
| instructora | `vuelo.lucesDeNoche.seAleja` | «¿Ves esa luz blanca sola? Es la cola de otro avión: se está alejando de nosotros.» | «See that single white light? It's another plane's tail: it's moving away from us.» |
| instructora | `vuelo.lucesDeNoche.cruzaIzquierda` | «Ese avión nos enseña su luz roja: lo vemos por su lado izquierdo, y va pasando hacia tu izquierda.» | «That plane is showing us its red light: we're seeing its left side, and it's passing towards your left.» |
| instructora | `vuelo.lucesDeNoche.cruzaDerecha` | «Ese avión nos enseña su luz verde: lo vemos por su lado derecho, y va pasando hacia tu derecha.» | «That plane is showing us its green light: we're seeing its right side, and it's passing towards your right.» |

La regla, por si se quiere una frase que la cuente entera la primera vez de
la partida, antes de las de arriba y sin pisarlas:

| voz | clave | es-PY | en |
|---|---|---|---|
| instructora | `vuelo.lucesDeNoche.regla` | «De noche, todos los aviones llevan las mismas luces: roja en la punta del ala izquierda, verde en la derecha y blanca atrás. Mirándolas se sabe hacia dónde va cada uno.» | «At night every plane carries the same lights: red on the left wingtip, green on the right and white at the back. Looking at them tells you where each one is going.» |

Dónde engancharlas: en `Game.contarLasLucesDeNoche`, que ya elige la clave y
sale una vez por vuelo; con el texto puesto, `this.instructor.decir(t(clave),
clave)` detrás de `this.huecos.usar()`, como `explicarElTrafico`.
