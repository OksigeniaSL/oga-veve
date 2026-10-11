# Pendiente: oír las voces del radar y de la radio

Grabado, horneado y enganchado el 11 de octubre de 2026: las cinco de la caja
del RA, las ocho de la instructora (las cinco del RA, en calma, las dos del
relevo y `explica.tcas.ra`) y las cuatro piezas del relevo en las dos torres,
con sus recetas. `explica.tcas.texto`, la que decía «acá el TCAS está en TA
ONLY», se retiró del diccionario, de la lista, de las recetas, de `crudo/` y
del pack. `node scripts/verificar-voces.mjs` comprueba ya `torre.contactDeparture`
y `torre.canario.contactDeparture`, y `node scripts/verificar-radar.mjs` pasa
entero (19 de 19).

## Lo que falta: oírlo

`verificar-radar.mjs` mira el RA entero —orden, cuadrado, franja y tarjeta—
pero no escucha. Con la voz, en un reactor y con uno de frente: en los tres
peldaños de abajo tiene que oírse la caja —«climb, climb» o «descend,
descend»— y detrás, nunca a la vez, la instructora; «level off» al aflojar y
«clear of conflict» al alejarse. En el de cabina, la caja sola. Y el relevo:
«contact departure» al salir de la zona de la torre en los peldaños con
cifras, y la instructora en los de abajo.

Lo que el RA no hace —reforzar, invertir, «crossing», coordinarse— y lo que
está de memoria y por verificar está escrito en la cabecera de
`src/flight/tcas.ts`.
