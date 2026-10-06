# Pendiente: las otras formas de «sentados para el despegue»

Tanda del cuadro y la cabina (puntos 215, 216, 221, 248b y 249), del 5 de
octubre de 2026, con ElevenLabs sin saldo hasta el 6. Lo que está metido en el
código funciona **sin grabar nada**: el sorteo entre las formas del anuncio
está preparado y deja fuera las que no tienen pieza (`conPieza` en
`unaForma`, `src/audio/variantes.ts`), así que hasta grabarlas suena solo la
de siempre, «Tripulación, sentados para el despegue», que es la grabada.

## La comandante (Jazlyn)

Voz `comandante`. Son formas de `comandante.despegue` y se graban como sus
variantes, con el número detrás: el guion de frases las saca solo de
`VARIANTES` en `src/audio/variantes.ts`.

| Clave | Texto | Cuándo |
|---|---|---|
| `comandante.despegue~2` | Tripulación, despegue inmediato. | autorizados a despegar o ya alineados (la de siempre, `comandante.despegue`) |
| `comandante.despegue~3` | Cabin crew, seats for take-off. | lo mismo |
| `comandante.despegue~4` | Cabin crew, prepare for take-off. | lo mismo |

Las dos en inglés son reales y se oyen en aerolíneas de habla castellana; se
dicen con la voz de Jazlyn, en inglés de cabina, sin acento forzado. La de
«despegue inmediato» es la que le gusta a Enrique.

Las tres llevan delante la llamada de la tripulación (aguda y grave), que
suena sola y no hay que grabar: es un tono sintetizado. Ver
`src/audio/tonos-de-cabina.ts`.

## Después de grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto comandante
node scripts/voces-elevenlabs.mjs comandante
```

Receta en `crudo/comandante/recetas.json`, una toma por frase, hornear,
restaurar lo re-codificado que no sea nuevo y `node scripts/verificar-voces.mjs`.
No hay que tocar el código: en cuanto el manifiesto trae la pieza, la forma
entra en el sorteo.

# Pendiente: lo que dice la tripulación al dejar la pista

Punto 256, del 6 de octubre de 2026, con el saldo de ElevenLabs todavía sin
llegar. Ya fuera de la pista y rodando a la terminal, la tripulación de cabina
da la bienvenida al campo y pide seguir sentados con el cinturón hasta que el
avión pare y se apague la señal; ya se puede usar el teléfono, y cuidado con
los compartimentos. Solo en los aviones con auxiliares (JAZ 90 y JAZ 120).
Fuentes y porqués en `src/audio/anuncio-tras-la-toma.ts`.

Lo metido en el código funciona **sin grabar nada**: mientras no esté, el
anuncio sale en la tira de la megafonía —desde el peldaño que lee— detrás de
su llamada aguda y grave, y la voz no suena. En cuanto el manifiesto trae las
piezas, suena; y cada forma del resto entra en el sorteo el día que tiene la
suya (`conPieza` en `unaForma`).

Son dos frases enteras: **la bienvenida**, una por campo, y **el resto**, que
es igual en todos y tiene tres formas. La receta que las monta ya está en
`crudo/tripulacion/recetas.json` y `crudo/tripulacion-canarias/recetas.json`:

```json
"tripulacion.llegada": ["{bienvenidos}", "{resto}"]
"tripulacion.canario.llegada": ["{bienvenidos}", "{resto}"]
```

Al grabar, a cada toma nueva se le pone su receta de una pieza
(`"tripulacion.trasLaToma": ["tripulacion.trasLaToma"]`, y así), como las
demás.

## La tripulación de Paraguay (Derlis)

Voz `tripulacion`. Solo los campos de Paraguay donde cabe un avión con
auxiliares.

| Clave | Texto |
|---|---|
| `tripulacion.bienvenidos.pettirossi` | Señoras y señores, bienvenidos a Asunción. |
| `tripulacion.bienvenidos.guarani` | Señoras y señores, bienvenidos a Ciudad del Este. |
| `tripulacion.bienvenidos.encarnacion` | Señoras y señores, bienvenidos a Encarnación. |
| `tripulacion.bienvenidos.pedro-juan` | Señoras y señores, bienvenidos a Pedro Juan Caballero. |
| `tripulacion.trasLaToma` | Les pedimos que sigan sentados, con el cinturón abrochado, hasta que el avión se detenga por completo y se apague la señal de cinturones. Ya pueden usar sus celulares. Tengan cuidado al abrir los compartimientos de arriba, porque el equipaje se pudo mover durante el vuelo. Muchas gracias. |
| `tripulacion.trasLaToma~2` | Por su seguridad, sigan sentados y con el cinturón puesto hasta que el avión se pare del todo y se apague la señal. A partir de ahora pueden encender sus celulares. Abran los compartimientos despacito, que en el vuelo las valijas también viajan. Y antes de bajar, revisen el bolsillo del asiento para no olvidarse nada. |
| `tripulacion.trasLaToma~3` | Quédense sentados con el cinturón abrochado, por favor, hasta que el avión se detenga y se apague la señal de cinturones. Ya pueden usar el celular. Cuidado al abrir los compartimientos de arriba, que algo se pudo correr con el vuelo. Y fíjense que no quede nada en el asiento. ¡Gracias, y que les vaya muy bien! |

## La tripulación de Canarias (Idaira)

Voz `tripulacion-canarias`. Los campos canarios donde cabe un avión con
auxiliares (El Hierro no: ver `flight/cabe.ts`).

| Clave | Texto |
|---|---|
| `tripulacion.canario.bienvenidos.tenerife-norte` | Señoras y señores, bienvenidos a Tenerife Norte. |
| `tripulacion.canario.bienvenidos.tenerife-sur` | Señoras y señores, bienvenidos a Tenerife Sur. |
| `tripulacion.canario.bienvenidos.gran-canaria` | Señoras y señores, bienvenidos a Gran Canaria. |
| `tripulacion.canario.bienvenidos.lanzarote` | Señoras y señores, bienvenidos a Lanzarote. |
| `tripulacion.canario.bienvenidos.fuerteventura` | Señoras y señores, bienvenidos a Fuerteventura. |
| `tripulacion.canario.bienvenidos.la-palma` | Señoras y señores, bienvenidos a La Palma. |
| `tripulacion.canario.bienvenidos.la-gomera` | Señoras y señores, bienvenidos a La Gomera. |
| `tripulacion.canario.trasLaToma` | Por favor, permanezcan sentados y con el cinturón abrochado hasta que el avión se detenga por completo y se apague la señal de cinturones. Ya pueden utilizar sus teléfonos móviles. Tengan cuidado al abrir los compartimentos superiores, porque el equipaje puede haberse movido durante el vuelo. Muchas gracias. |
| `tripulacion.canario.trasLaToma~2` | Les rogamos que sigan sentados, con el cinturón abrochado, hasta que el avión se pare del todo y se apague la señal. Desde ahora pueden encender el móvil. Abran los compartimentos con cuidado, que en el vuelo las maletas también viajan. Y antes de salir, miren en el bolsillo del asiento por si se dejan algo. |
| `tripulacion.canario.trasLaToma~3` | Por su seguridad, permanezcan sentados con el cinturón puesto hasta que el avión se detenga y se apague la señal de cinturones. Ya pueden usar el teléfono. Cuidado al abrir los compartimentos de arriba, y no olviden sus pertenencias. Muchas gracias y hasta pronto. |

Las de reserva, `tripulacion.bienvenidos` y `tripulacion.canario.bienvenidos`,
llevan el hueco del nombre y **no se graban**: son para un campo nuevo que
todavía no tenga la suya.

En el mismo tono que el servicio y los cinturones: amable y tranquilo, de
megafonía, sin prisa. La llamada de delante es un tono sintetizado y no se
graba.

## Después de grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto tripulacion
node scripts/voces-elevenlabs.mjs tripulacion
node scripts/voces-elevenlabs.mjs tripulacion-canarias
```

Recetas de una pieza en los dos `recetas.json`, hornear las dos voces y
`node scripts/verificar-voces.mjs`. No hay que tocar el código.
