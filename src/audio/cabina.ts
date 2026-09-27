/**
 * Los cantos de cabina, y **qué grabación le toca a cada uno**.
 *
 * La cabina de un avión de línea no habla castellano ni guaraní: dice «V one»,
 * «rotate», «five hundred», «terrain, pull up». Es inglés aeronáutico, es igual
 * en Asunción que en Los Rodeos y es media lección de este juego — ver
 * `flight/escalera.ts`, que decide en qué peldaño empieza a oírse.
 *
 * ## Por qué hace falta esta tabla
 *
 * Esas frases se piden en el código **por su texto en inglés**, que es como se
 * escriben en la lista de llamadas de una cabina de verdad. Y el pack de voz
 * busca **por clave**. Sin nada que una las dos cosas, las veintiuna frases de
 * cabina que hay grabadas —bajadas a cada tablet con el resto del pack— no
 * sonaban nunca: las cantaba el sintetizador del navegador, que es justo lo que
 * se oyó jugando y lo que se preguntó con estas palabras: «¿y qué hay de esas
 * voces robóticas? "Minimals", "five hundred"… o "Terrain!"».
 *
 * La tabla va aquí y no dentro de `game.ts` para que una prueba pueda
 * comprobar lo único que importa: **que no sobre ninguna grabación**. Una
 * receta del manifiesto a la que no apunta nadie es una frase grabada,
 * horneada, publicada y tirada.
 */

/** De lo que dice la cabina a la clave con la que está grabado. */
export const CLAVE_DE_CABINA: Readonly<Record<string, string>> = {
  // La carrera de despegue.
  "V one": "cabina.v1",
  rotate: "cabina.vr",
  // La aproximación, en pies, que es como los canta un radioaltímetro.
  "five hundred": "cabina.fiveHundred",
  // Los tres de en medio, que faltaban: una cuenta a la que le saltan tres
  // números no es una cuenta. Ver `ESCALONES` en `flight/avisos-de-altura.ts`.
  "four hundred": "cabina.fourHundred",
  "three hundred": "cabina.threeHundred",
  "two hundred": "cabina.twoHundred",
  "one hundred": "cabina.oneHundred",
  fifty: "cabina.fifty",
  forty: "cabina.forty",
  thirty: "cabina.thirty",
  twenty: "cabina.twenty",
  ten: "cabina.ten",
  five: "cabina.five",
  // Los avisos que no se pueden desoír.
  "terrain, pull up": "cabina.terrainPullUp",
  "too low": "cabina.tooLow",
  "too low, climb": "cabina.tooLowClimb",
  "too high, come down": "cabina.tooHighComeDown",
  "obstacle ahead": "cabina.obstacleAhead",
  "we have a problem": "cabina.weHaveAProblem",
  // La velocidad, en el aire y en el suelo.
  airspeed: "cabina.airspeed",
  "slow down": "cabina.slowDown",
  "too fast": "cabina.tooFast",
  /*
   * **Y el final que no acaba en toma, con sus dos frases, que no son una.**
   *
   * «Go around» es la orden: la que se oye cuando el juego manda irse al
   * aire. «Going around. Good decision» es lo que se dice **después**, cuando
   * ya se ha ido, y es un elogio. La tabla tenía la orden apuntando a la toma
   * del elogio —`cabina.goAround` se grabó con el texto largo—, así que en el
   * peldaño de cabina, cuando el juego mandaba frustrar, sonaba «going around,
   * good decision» antes de que nadie hubiera hecho nada; y el elogio de
   * verdad, que no casaba con ninguna clave, salía por la voz del navegador.
   *
   * Ahora cada frase lleva su toma: el elogio la que ya estaba, y la orden
   * una nueva, dicha seca, como la dice quien vuela a tu lado.
   */
  "going around. good decision": "cabina.goAround",
  "go around": "cabina.goAroundOrder",
  "off the runway": "cabina.offTheRunway",
  /*
   * **«Airspeed low»**, que el juego ya pedía y no tenía toma: salía por la
   * voz del navegador. Es el aviso de velocidad baja de un avión de línea, en
   * esas dos palabras.
   */
  "airspeed low": "cabina.airspeedLow",
  /*
   * **Y los tres que el avión ya sabía y no decía.**
   *
   * Los estados están calculados desde hace tiempo y tienen su luz en el panel
   * —ver `flight/avisos-de-cabina.ts`—, y el canto de cabina no existía: quien
   * miraba la pantalla se enteraba y quien depende del sonido, no. Un canal
   * menos, y en los avisos que más importan.
   *
   * Fraseología real y sin traducir jamás, como IAS o HDG: el día que alguien
   * oiga «stall, stall» en una cabina de verdad tiene que reconocerlo.
   *
   * Entran aquí **con su toma**, no antes: esta tabla y el manifiesto cuadran
   * en las dos direcciones y lo exigen dos pruebas de `cabina.test.ts`. Una
   * clave sin grabación apunta a un audio que no existe; una grabación sin
   * clave se baja a cada tablet para no sonar nunca.
   *
   * `minimums` es el caso curioso: el juego lo decía desde hace tiempo y no
   * estaba en esta tabla, así que salía por la voz del navegador teniendo
   * grabación posible. Ahora suena como las demás.
   *
   * Y no está `overspeed`: de eso el juego dice «too fast», que ya estaba.
   */
  /*
   * El tren, que el juego pedía en voz alta desde hace tiempo **sin tener la
   * toma**: salían por el sintetizador del navegador en mitad de una cabina
   * que suena grabada. Tercera vez que pasa lo mismo; ver `minimums`.
   */
  "positive rate": "cabina.positiveRate",
  "gear up": "cabina.gearUp",
  "gear down": "cabina.gearDown",
  "sink rate": "cabina.sinkRate",
  "bank angle": "cabina.bankAngle",
  "stall, stall": "cabina.stall",
  // El aviso de tráfico del TCAS, que entra con su toma. Ver `flight/tcas.ts`.
  "traffic, traffic": "cabina.traffic",
  "autopilot disconnect": "cabina.autopilotDisconnect",
  minimums: "cabina.minimums",
};

/**
 * **Los cantos que dice el avión, y no quien va sentado en él.**
 *
 * Una cabina oye dos clases de voces y no se parecen. Unas son de la
 * tripulación —«V one», «rotate», «positive rate», «gear up»—, y las dice
 * quien vuela a tu lado en cualquier avión que lleve dos. Las otras las dice
 * **una caja**: el radioaltímetro que canta la altura en la toma, el avisador
 * de proximidad al terreno (GPWS, TAWS) con su «terrain» y su «sink rate», el
 * avisador de pérdida con voz, el del piloto automático. Esas no las lleva
 * cualquiera: las lleva el avión de transporte, porque la norma se lo pide
 * —el TAWS de clase A es obligatorio en los de turbina con seis asientos de
 * pasaje o más (14 CFR 135.154; en Europa, CS-25 y la parte CAT)—, y una
 * avioneta de escuela no lleva ninguna.
 *
 * Así que estos cantos, en inglés y con la voz de cabina, solo suenan en el
 * avión que tiene con qué decirlos. En los demás los dice la instructora, en
 * casa, que es lo que pasa en una avioneta: quien canta la altura en la toma
 * es la persona de al lado. Ver `Game.cantar` y `avisosHablados` en
 * `flight/aircraft.ts`.
 *
 * El TCAS va aparte porque tiene su propio equipo —ver `tcas` en la ficha—.
 */
/**
 * **La cuenta del radioaltímetro**, número a número: lo único de la cabina
 * que es una cuenta y no un suceso. Ver `MISMA_CUENTA` en `audio/boca.ts` y la
 * excepción de `flight/escalera.ts`.
 */
export const DE_LA_CUENTA: ReadonlySet<string> = new Set([
  "cabina.fiveHundred",
  "cabina.fourHundred",
  "cabina.threeHundred",
  "cabina.twoHundred",
  "cabina.oneHundred",
  "cabina.fifty",
  "cabina.forty",
  "cabina.thirty",
  "cabina.twenty",
  "cabina.ten",
  "cabina.five",
]);

export const DE_LOS_AVISADORES: ReadonlySet<string> = new Set([
  // El radioaltímetro, en la toma: su cuenta y la altura de decisión.
  ...DE_LA_CUENTA,
  "cabina.minimums",
  // El avisador de terreno, con sus cuatro modos que el juego calcula.
  "cabina.terrainPullUp",
  "cabina.tooLow",
  "cabina.sinkRate",
  "cabina.bankAngle",
  // Y los tres avisos de a bordo que son de un avión de línea.
  "cabina.stall",
  "cabina.airspeedLow",
  "cabina.autopilotDisconnect",
]);

/** Lo que hace falta saber de un avión para saber qué cantos lleva. */
export interface EquipoDeCabina {
  readonly avisosHablados: boolean;
  readonly tcas: string | null;
}

/**
 * Si **este avión** tiene con qué decir este canto.
 *
 * Los de la tripulación, siempre. Los de las cajas, solo si las lleva. Ver
 * `DE_LOS_AVISADORES`.
 */
export function loDiceElAvion(clave: string, avion: EquipoDeCabina): boolean {
  if (clave === "cabina.traffic") return avion.tcas !== null;
  if (DE_LOS_AVISADORES.has(clave)) return avion.avisosHablados;
  return true;
}

/**
 * La clave de este canto, si está grabado.
 *
 * Se mira también **el principio de la frase**: algunas llamadas del juego
 * llevan cola —«going around. good decision», «go around, runway occupied»— y
 * la grabación es la de la orden, que es lo que hay que oír.
 */
export function claveDeCabina(ingles: string): string | null {
  const limpio = ingles.trim().toLowerCase();
  for (const [dice, clave] of Object.entries(CLAVE_DE_CABINA)) {
    const suyo = dice.toLowerCase();
    if (limpio === suyo) return clave;
  }
  for (const [dice, clave] of Object.entries(CLAVE_DE_CABINA)) {
    const suyo = dice.toLowerCase();
    // Y por el principio, pero solo cuando lo que sigue es una coma o un
    // punto: «too low» no puede quedarse con «too low, climb».
    if (limpio.startsWith(`${suyo},`) || limpio.startsWith(`${suyo}.`))
      return clave;
  }
  return null;
}
