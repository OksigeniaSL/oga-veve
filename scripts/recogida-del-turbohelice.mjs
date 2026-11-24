/**
 * **La recogida de un bimotor de turbina libre**, la del piloto del vuelo
 * entero (`recoger` en `verificar-vuelo-entero.mjs`), en lo que tiene de suyo
 * (H72). Vive aparte, como el gas del bimotor y la palanca del reactor, para
 * poder probarlo: el banco lo mete en la página tal cual, como texto, y
 * `recogida-del-turbohelice.test.mjs` lo vuela contra el modelo del juego.
 *
 * El JAZ 50 tocaba a 2,37, 3,34 y 2,47 m/s en tres vuelos enteros de tres, con
 * la comprobación pidiendo de uno a dos. La recogida del bimotor (H34d, H45,
 * H45b) se afinó con el empuje llegando en el mismo paso, y desde H64 el PT6A
 * tarda cuatro segundos (ADR 0034). Con esa mano y ese motor, en la mesa de la
 * recogida, uno de cada tres toca a más de 2 m/s; con el motor al instante,
 * uno de cada nueve. Lo que pasa, en la traza de las peores: la racha hunde el
 * avión y el gas se va a fondo; el empuje llega segundo y medio después,
 * cuando la palanca ya la había parado, y el avión sube; eso es flotar, y el
 * gas se quita del todo; el empuje se va mientras flota a seis metros y pierde
 * quince nudos, y cuando se hunde ya no hay ni empuje ni ala: cuatro metros
 * por segundo.
 *
 * Un empuje que llega tarde no vale para parar una racha de un segundo, y el de
 * una turbina libre llega tarde: «power output lags for several seconds»
 * (FAA-H-8083-3C, 15-11). Lo que cambia en la mano son tres cosas:
 *
 * - **La racha se para con la palanca**, en cuanto se nota en el asiento, y no
 *   con el gas. Ver `porLoQueAceleraElTurbohelice`.
 * - **El gas sostiene la velocidad**, sin cazar la racha ni irse a cero
 *   porque el avión flote. Ver `gasDelTurboheliceEnLaRecogida`.
 * - **Y si flota, se sostiene la actitud**, no la palanca de ese instante. Ver
 *   `palancaDeLaActitudDelTurbohelice`.
 *
 * El de pistón sigue con lo suyo: su empuje llega en el mismo paso y su
 * recogida ya iba bien.
 */

/**
 * **Lo que nota en el asiento**, en palanca: la carga contra la aceleración
 * que pide el perfil, en ángulo de ataque y pasada a palanca con el cabeceo del
 * avión. Es el término del reactor (H46, `porLoQueAceleraElReactor`) con tres
 * centésimas de radián por m/s² y no cuatro: en la mesa, doscientas finales,
 * con dos se quedan 12 tomas de más de 2 m/s del JAZ 50 y 13 del JAZ 60, y con
 * tres, 9 y 8, con el mismo gas.
 *
 * @param {{ porAngulo: number, acelera: number, carga: number }} p
 *   `porAngulo`, la palanca que da un radián de ángulo de ataque; `acelera`,
 *   los m/s² hacia arriba que pide el perfil; `carga`, el factor de carga, g.
 */
export function porLoQueAceleraElTurbohelice(p) {
  return p.porAngulo * 0.03 * (p.acelera - (p.carga - 1) * 9.81);
}

/**
 * **La palanca que sostiene la actitud** mientras el avión baja menos de lo que
 * pide el perfil. «The pitch attitude is held constant until the airplane
 * decelerates enough to again start descending» (FAA-H-8083-3C, p. 9-31).
 *
 * El banco sostenía la palanca, y en el reactor el morro no bajaba de la que
 * llevaba (H64). Con la palanca notando la racha en el asiento, la del instante
 * en que empieza a flotar es la de una corrección a medias. En la mesa, el JAZ
 * 50 sostuvo −0,25 y en segundo y medio bajó el morro de 0 a −6°: 2,77 m/s; y
 * el JAZ 60, +0,10, y lo subió de 3 a 10°: un globo de dieciséis metros y 6,65
 * m/s. Así que se sostiene de los dos lados, frenando lo que gira.
 *
 * @param {{
 *   base: number,           // la palanca al empezar a sostener, con lo que pica el suelo de más
 *   porAngulo: number,      // la palanca que da un radián de ángulo de ataque
 *   alSostener: number,     // el cabeceo al empezar a sostener, rad
 *   cabeceo: number,        // y el de ahora, rad
 *   ritmoDeCabeceo: number, // lo que gira, rad/s
 * }} p
 */
export function palancaDeLaActitudDelTurbohelice(p) {
  return Math.max(
    -0.6,
    Math.min(
      0.8,
      p.base + p.porAngulo * (p.alSostener - p.cabeceo) - 0.4 * p.porAngulo * p.ritmoDeCabeceo,
    ),
  );
}

/**
 * **El gas de ahora**, de 0 a 1. Sin nada de fuera: el banco lo copia a la
 * página como texto.
 *
 * - **El de la senda, por la altura que queda**, como el de pistón en H34d:
 *   se va quitando y llega al ralentí al tocar.
 * - **Y lo que haga falta para no quedarse sin velocidad.** Lo del manual de
 *   la FAA para el que recoge alto o se le va el avión hacia arriba: «the pitch
 *   attitude is held constant until the airplane decelerates enough to again
 *   start descending […] It may be necessary to add a slight amount of power
 *   to keep the airspeed from decreasing excessively and to avoid losing lift
 *   too rapidly»; y «by adding power, thrust is increased to keep the airspeed
 *   from decelerating too rapidly and the wings from suddenly losing lift»
 *   (FAA-H-8083-3C, cap. 9, «High Round Out», p. 9-31, y «Ballooning During
 *   Round Out», p. 9-33). La que se sostiene es la de empezar a recoger, menos una décima
 *   repartida en la altura: al tocar, la que deja la recogida normal. Y se
 *   mira la que va a llevar cuando el empuje llegue, no la de ahora: con la de
 *   ahora, en la mesa, no servía de nada.
 * - **Pero no para siempre.** Al acabarse el tiempo del perfil
 *   (`duracionDelPerfil`) se va quitando, y al doble está al ralentí: «since
 *   prolonged floating utilizes considerable runway length, it should be
 *   avoided» (ibíd., «Floating During Round Out», p. 9-32).
 *
 * @param {{
 *   gas: number,          // el de la senda, al empezar a recoger
 *   quedaMasBaja: number, // la parte más baja de la altura de la recogida que se ha visto, 0–1
 *   ruedas: number,       // las de ahora, m
 *   segundos: number,     // desde que empezó la recogida, s
 *   altura: number,       // las ruedas al empezar, m
 *   caida: number,        // lo que bajaba al empezar, m/s
 *   alTocar: number,      // lo que se busca bajar al tocar, m/s
 *   verdadera: number,    // la velocidad de ahora, m/s
 *   alEmpezar: number,    // y la de empezar a recoger, m/s
 *   tendencia: number,    // lo que cambia ahora, m/s²
 *   tarda: number,        // lo que tarda el motor en dar lo que se le pide, s (`respuestaDelMotor`)
 * }} p
 */
export function gasDelTurboheliceEnLaRecogida(p) {
  // La cuenta de `duracionDelPerfil`, repetida aquí porque esto viaja como texto.
  const a = Math.max(0.3, p.alTocar);
  let dura = p.altura / a;
  if (!(p.altura > 0)) dura = 0;
  else if (p.caida > a * 1.01) dura = (p.altura / (p.caida - a)) * Math.log(p.caida / a);
  const queda = dura > 0 ? Math.max(0, Math.min(1, 2 - p.segundos / dura)) : 0;
  const altura = p.altura > 0 ? Math.max(0, Math.min(1, p.ruedas / p.altura)) : 0;
  const sostiene = p.alEmpezar * (1 - 0.1 * (1 - altura));
  // Cuatro décimas de lo que tarda: lo que las dos etapas del motor tardan en dar la mitad.
  const llevara = p.verdadera + p.tendencia * 0.4 * p.tarda;
  const deLaVelocidad = 0.2 * Math.max(0, sostiene - llevara);
  return Math.max(
    0,
    Math.min(1, queda * (p.gas * Math.max(0, Math.min(1, p.quedaMasBaja)) + deLaVelocidad)),
  );
}
