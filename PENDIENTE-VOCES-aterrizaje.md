# Pendiente: los cantos de la carrera de aterrizaje, por verificar

Grabado y horneado el 11 de octubre de 2026: las seis frases de la
instructora (armar los aerofrenos, los frenos de tierra que salen o no, la
reversa que ya no frena y el autofreno que se suelta) y los cantos de la
carrera. Lo que queda es comprobar las fuentes y lo que no se hizo.

## Los cantos son los de Boeing, y solo en el JAZ 120

Las llamadas que había eran las de Airbus —«spoilers», «reverse green»,
«decel», «seventy knots»— y en la flota no hay ningún Airbus: el JAZ 90 es de
la clase del E170 y el JAZ 120 de la del 747. Se quitaron sin grabarse.

Ahora el JAZ 120 canta las del procedimiento normal de Boeing, *Landing Roll*,
que dice quien vigila (PM) al tocar: «speedbrakes up» con los aerofrenos
arriba, «speedbrakes not up» si no han subido al segundo y medio, «reversers
normal» con las reversas abiertas del todo y «sixty knots» al pasar el
anemómetro por sesenta. Ver `cantosDeLaCarrera` en `src/flight/aircraft.ts`,
`DE_LA_CARRERA` en `src/audio/cabina.ts` y `contarLaCarrera` en `src/game.ts`.

## Por verificar

- **El texto exacto de Boeing.** Fuente: el FCOM del 747-400, NP *Landing Roll
  Procedure*; las cuatro frases están puestas de memoria y marcadas así en el
  código. Si cambia alguna, se cambia en `CABINA` de
  `scripts/frases-para-grabar.mjs` y en `CLAVE_DE_CABINA`, y se regraba.
- **El procedimiento de Embraer para el JAZ 90.** Hasta comprobarlo no canta
  nada en la carrera (`cantosDeLaCarrera: null`). Si lleva cantos, entran
  como otro valor de `cantosDeLaCarrera`, con sus tomas.

## Lo que no se hizo

- **«No reverser»** («no reverser engine number…» o «no reversers»), la
  reversa pedida que no se abre: aquí una reversa pedida se abre siempre
  —ver `src/flight/reversa.ts`—, así que no hay caso que cantar. Entra el día
  que el juego tenga reversas que fallen.
- **Oír la carrera en el peldaño de cabina con el JAZ 120**: los bancos de esta
  tanda no la volaron. Con la voz, al tocar tiene que oírse «speedbrakes up»,
  luego «reversers normal» si se mete la reversa y «sixty knots»; y con el
  JAZ 90, nada. Abajo sí se oyó: en Guyrami con el JAZ 90, «los armé yo» a
  500 ft y, al tocar, la explicación de los paneles en lugar del canto.
