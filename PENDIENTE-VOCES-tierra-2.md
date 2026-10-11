# Pendiente: la radio de la salida desde la intersección, por grabar y por oír

## 1. Grabar las piezas de la torre (14 piezas, 188 caracteres)

Ya está en el juego, sin grabar: de Taguató para arriba, la oferta de la torre
—«{matrícula}, advise able to depart from runway {pista}, intersection
{calle}»— y la pista que queda —«{matrícula}, TORA runway {pista}, from
intersection {calle}, {metros} metres»— se dicen con su voz en cuanto sus
piezas están en el pack. Hasta entonces se leen en la tira, como ahora; lo de
quien vuela («affirm», «negative, request backtrack») va solo en la tira, como
todo lo que se dice desde esta cabina. Ver `contarPorDondeSeSale` en
`src/game.ts` y `calleEnPiezas` y `metrosEnPiezas` en `src/flight/matricula.ts`.

En las dos torres, `torre` y `torre-canarias` (en la de Canarias, con
`torre.canario.solo.*`), 7 piezas y 94 caracteres cada una:

| pieza | texto | caracteres |
|---|---|---|
| `torre.solo.adviseAbleToDepart` | advise able to depart from runway | 33 |
| `torre.solo.intersection` | intersection | 12 |
| `torre.solo.toraRunway` | TORA runway (se le da a leer «Tora runway»: por radio es una palabra) | 11 |
| `torre.solo.fromIntersection` | from intersection | 17 |
| `torre.solo.metres` | metres | 6 |
| `metros.thousand` | thousand | 8 |
| `metros.hundred` | hundred | 7 |

`metros.*` se llama igual en las dos torres porque va en un hueco, como el
viento. Las recetas —`torre.ofreceInterseccion` y `torre.tora`, con `.L`, `.R`
y `.C`, y sus `torre.canario.*`— ya están en `crudo/torre/recetas.json` y
`crudo/torre-canarias/recetas.json`, y las filas en `docs/voces/frases.json`.
Así que: `node scripts/voces-elevenlabs.mjs torre` y `… torre-canarias`,
hornear, restaurar lo re-codificado y `node scripts/verificar-voces.mjs`.

## 2. Y oírlo en el banco, que no se ha hecho

Lo de tierra grabado el 11 de octubre se comprobó con `verificar-voces` y las
pruebas, pero no con el banco del vuelo entero en el navegador:

- parar el avión en la pista después de «salí de la pista»: la torre mete
  prisa una vez, y no otra si se vuelve a parar;
- salir de Encarnación con viento del norte (la 12 se remonta, y hay torre) y
  de Pilar (AFIS: solo la instructora);
- salir de Mariscal Estigarribia con viento del sur (la 01: la avioneta
  remonta un trozo; el JAZ 90, la pista entera) y del norte (la 19: la
  avioneta y el JAZ 90 salen desde la calle; el JAZ 120 pide la pista entera),
  y con las piezas de arriba grabadas, que la oferta y la TORA suenan con la
  voz de la torre, en su orden y detrás de nada;
- Tenerife Sur con `OGA_FILA_DE_SALIDA=1`: el número en la fila y la estela.
