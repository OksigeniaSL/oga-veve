# Pendiente: los cantos de la carrera de aterrizaje

Grabado y horneado el 11 de octubre de 2026: las seis frases de la
instructora (armar los aerofrenos, los frenos de tierra que salen o no, la
reversa que ya no frena y el autofreno que se suelta) y los cantos de la
carrera. Lo que queda es comprobar las fuentes y lo que no se hizo.

## Los cantos son los de Boeing en el JAZ 120, y ninguno en el JAZ 90

Las llamadas que había eran las de Airbus —«spoilers», «reverse green»,
«decel», «seventy knots»— y en la flota no hay ningún Airbus: el JAZ 90 es de
la clase del E170 y el JAZ 120 de la del 747. Se quitaron sin grabarse.

Ahora el JAZ 120 canta las del procedimiento normal de Boeing, *Landing Roll*,
que dice quien vigila (PM) al tocar: «speedbrakes up» con los aerofrenos
arriba, «speedbrakes not up» si no han subido al segundo y medio y «sixty
knots» al pasar el anemómetro por sesenta. «Reversers normal» se cantó hasta
el 25 de octubre: no es del 747-400 (abajo). Ver `cantosDeLaCarrera` en `src/flight/aircraft.ts`,
`CANTOS_DE_LA_CARRERA` en `src/audio/cabina.ts` y `contarLaCarrera` en
`src/game.ts`.

El JAZ 90 cantó «sixty knots» del 17 al 25 de octubre, con la fuente de un
operador; el SOPM de Embraer no lo lleva, y ya no canta nada en la carrera
(abajo). No hay nada nuevo que grabar.

## Verificado el 25 de octubre de 2026 (punto 259)

- **Boeing, el 747-400.** FCOM D6-30151-400 (2009), NP.21.53 *Landing Roll
  Procedure*, lo que canta quien vigila: «SPEEDBRAKES UP», o «SPEEDBRAKES NOT
  UP» si la palanca no ha subido, y «60 KNOTS». **«Reversers normal» no está**
  (tampoco en la edición de 2000, D6-30151-425, NP.20.24, según un ayudante;
  esa no la leí yo). Así que el JAZ 120 deja de cantarla. La toma
  `cabina.reversersNormal` sigue grabada y en `CLAVE_DE_CABINA`, sin usarse.
- **Embraer, los E-Jets.** SOPM-1755, rev. 19, 3-40, «Landing rollout –
  actions and callouts»: acciones y ningún canto de quien vigila —comprobar los
  ground spoilers, vigilar la reversa y la velocidad; a 60 kt reversa al
  mínimo y a 30 al ralentí—. Las únicas frases entre comillas son el cambio de
  mandos y «AFTER LANDING SEQUENCE». El «60 kts» de Helvetic es suyo, del
  operador, igual que el OM-B del E190 de Jetairfly añade los de Boeing. Así
  que **el JAZ 90 no canta nada en la carrera**. La copia del SOPM es no
  oficial (pdfcoffee), y su texto extraído mezcla las columnas PF y PM: lo
  seguro es que no hay más cantos.

## Lo que no se hizo

- **«No reverser»** («no reverser engine number…» o «no reversers»), la
  reversa pedida que no se abre: aquí una reversa pedida se abre siempre
  —ver `src/flight/reversa.ts`—, así que no hay caso que cantar. Entra el día
  que el juego tenga reversas que fallen.
- **Oír la carrera en el peldaño de cabina con el JAZ 120**: los bancos de esta
  tanda no la volaron. Con la voz, al tocar tiene que oírse «speedbrakes up»,
  luego «reversers normal» si se mete la reversa y «sixty knots»; y con el
  JAZ 90, solo «sixty knots». Abajo sí se oyó: en Guyrami con el JAZ 90, «los
  armé yo» a 500 ft y, al tocar, la explicación de los paneles en lugar del
  canto.
- **Y los sesenta nudos del JAZ 90 se pidieron y no sonaron** (17-10-2026,
  vuelo entero en Tenerife Norte, Taguató Ruvicha): «speedbrakes up: este
  avión no lo canta» al tocar, que es lo que tiene que pasar, y «sixty
  knots→cabina.sixtyKnots» a 63 kt; pero la boca estaba diciendo
  `gafas.ganadas`, el canto esperó y caducó, y detrás entró
  `vuelo.abandonando`. Es la misma cola llena de la toma que ya se vio con los
  calzos: un canto de la tripulación va en `normal` y espera detrás de un
  elogio. Al JAZ 120 le pasaría igual. Queda por decidir quién cede; no se
  ha tocado. (Desde el 25-10 el JAZ 90 ya no lo canta; el JAZ 120 sí.)
- **La explicación de los sesenta nudos** en los peldaños de abajo: no hay,
  ni en el JAZ 120 ni en el JAZ 90, como antes. Sería una frase nueva —lo que
  hace quien vuela a esa velocidad, la reversa al mínimo— y lo de la reversa
  lo cuenta hoy `vuelo.quitaLaReversa`, más abajo, a unos 30 kt.
