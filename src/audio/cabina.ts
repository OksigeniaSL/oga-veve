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
  // Y el final que no acaba en toma.
  "go around": "cabina.goAround",
  "off the runway": "cabina.offTheRunway",
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
  "sink rate": "cabina.sinkRate",
  "bank angle": "cabina.bankAngle",
  "stall, stall": "cabina.stall",
  "autopilot disconnect": "cabina.autopilotDisconnect",
  minimums: "cabina.minimums",
};

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
