# Pendiente: los cantos de la carrera de aterrizaje, por verificar

Grabado y horneado el 11 de octubre de 2026: las seis frases de la
instructora (armar los aerofrenos, los frenos de tierra que salen o no, la
reversa que ya no frena y el autofreno que se suelta) y los cantos de la
carrera. Lo que queda es comprobar las fuentes y lo que no se hizo.

## Los cantos son los de Boeing en el JAZ 120, y los de Embraer en el JAZ 90

Las llamadas que había eran las de Airbus —«spoilers», «reverse green»,
«decel», «seventy knots»— y en la flota no hay ningún Airbus: el JAZ 90 es de
la clase del E170 y el JAZ 120 de la del 747. Se quitaron sin grabarse.

Ahora el JAZ 120 canta las del procedimiento normal de Boeing, *Landing Roll*,
que dice quien vigila (PM) al tocar: «speedbrakes up» con los aerofrenos
arriba, «speedbrakes not up» si no han subido al segundo y medio, «reversers
normal» con las reversas abiertas del todo y «sixty knots» al pasar el
anemómetro por sesenta. Ver `cantosDeLaCarrera` en `src/flight/aircraft.ts`,
`CANTOS_DE_LA_CARRERA` en `src/audio/cabina.ts` y `contarLaCarrera` en
`src/game.ts`.

Y el JAZ 90 (17 de octubre de 2026) canta lo de los E-Jets, que es solo
«sixty knots»: al tocar, quien vigila mira los aerofrenos y las reversas sin
cantarlos, y a los sesenta nudos canta «60 kts», que es cuando quien vuela
lleva la reversa al mínimo. La toma es la misma `cabina.sixtyKnots`: no hay
nada nuevo que grabar.

## Por verificar

- **El texto exacto de Boeing.** Fuente: el FCOM del 747-400, NP *Landing Roll
  Procedure*, que no se ha podido leer. Lo único comprobado es lo de los
  aerofrenos: el informe del NTSB DCA11IA047 (Southwest en Chicago Midway,
  2011) cita el FCOM de Boeing —del 737— con «SPEED BRAKES UP» y «SPEED
  BRAKES NOT UP», y dice que ese FCOM **no** pedía cantar las reversas.
  «Reversers normal» y «sixty knots» siguen de memoria para el 747. Si cambia
  alguna, se cambia en `CABINA` de `scripts/frases-para-grabar.mjs` y en
  `CLAVE_DE_CABINA`, y se regraba.
- **El SOPM de Embraer.** La fuente del JAZ 90 es el resumen de formación del
  E190 de Christoph Regli (Helvetic Airways, 16-09-2025, flite.ch), leído:
  «Touchdown — PF: Open REV — PM: Check spoilers, REV» y «60kts — PF: MIN REV
  — PM: "60kts"». Es un resumen privado de un operador que remite al SOPM, no
  el SOPM. La copia del SOPM que hay en la red (pdfcoffee) no se dejó leer;
  su extracto dice reversa al mínimo a 60 kt y cerrada a 30, que cuadra.

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
- **La explicación de los sesenta nudos** en los peldaños de abajo: no hay,
  ni en el JAZ 120 ni en el JAZ 90, como antes. Sería una frase nueva —lo que
  hace quien vuela a esa velocidad, la reversa al mínimo— y lo de la reversa
  lo cuenta hoy `vuelo.quitaLaReversa`, más abajo, a unos 30 kt.
