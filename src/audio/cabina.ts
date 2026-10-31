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

import type { Orden } from "../flight/tcas";

/** De lo que dice la cabina a la clave con la que está grabado. */
export const CLAVE_DE_CABINA: Readonly<Record<string, string>> = {
  // La carrera de despegue.
  "V one": "cabina.v1",
  rotate: "cabina.vr",
  /*
   * La cuenta del radioaltímetro, en pies, que es como la canta. Los dos de
   * arriba del todo entraron cuando la cuenta pasó a ser de la caja: antes se
   * recortaba por no tener toma. Ver `LA_CUENTA` en `flight/avisos-de-altura.ts`.
   */
  "twenty five hundred": "cabina.twentyFiveHundred",
  "one thousand": "cabina.oneThousand",
  "five hundred": "cabina.fiveHundred",
  // Los tres de en medio, que faltaban: una cuenta a la que le saltan tres
  // números no es una cuenta.
  "four hundred": "cabina.fourHundred",
  "three hundred": "cabina.threeHundred",
  "two hundred": "cabina.twoHundred",
  "one hundred": "cabina.oneHundred",
  fifty: "cabina.fifty",
  forty: "cabina.forty",
  thirty: "cabina.thirty",
  twenty: "cabina.twenty",
  ten: "cabina.ten",
  // Los avisos que no se pueden desoír.
  "terrain, pull up": "cabina.terrainPullUp",
  /*
   * Y los del avisador que mira delante (FLTA), que no son el de debajo: la
   * precaución, en ámbar, con la ladera a cuarenta o sesenta segundos, y el
   * aviso, con ella a veinte o treinta. Ver `flight/terreno-delante.ts`.
   */
  "caution terrain": "cabina.cautionTerrain",
  "terrain ahead, pull up": "cabina.terrainAheadPullUp",
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
   * clave se baja a cada tablet para no sonar nunca. La única excepción va
   * escrita en `ESPERAN_SU_TOMA`, y solo se pide con su grabación.
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
  /*
   * **Y el aviso de altitud de cabina**, en el avión que lo dice con voz: la
   * familia de Embraer dice «cabin» con la cabina por encima de diez mil pies.
   * Ver `Presurizacion.avisoHablado` en `flight/aircraft.ts` y
   * `flight/despresurizacion.ts`.
   */
  cabin: "cabina.cabin",
  /*
   * **Y los dos de un motor que falla en el despegue**: *engine failure*, que
   * lo canta quien lo ve, y antes de V1 *stop*, que manda parar. Ver
   * `cantarDelEjercicio` en `game.ts` y el ADR 0014.
   */
  "engine failure": "cabina.engineFailure",
  stop: "cabina.stop",
  /*
   * **Y la carrera de aterrizaje**: lo que canta quien vigila (PM) al tocar,
   * en el procedimiento normal de Boeing, *Landing Roll* —los aerofrenos
   * arriba o no, las reversas en verde y los sesenta nudos—. Son de la
   * tripulación, así que suben por la escalera: en inglés en el peldaño de
   * cabina y, en los de abajo, la instructora lo cuenta en casa. Y solo en el
   * avión de esa familia: ver `DE_LA_CARRERA` y `cantosDeLaCarrera` en
   * `flight/aircraft.ts`.
   *
   * Aquí estaban los de Airbus —«spoilers», «reverse green», «decel»,
   * «seventy knots»—, y en la flota no hay ningún Airbus: el JAZ 90 es de la
   * clase del E170 y el JAZ 120 de la del 747. Se quitaron sin grabarse.
   *
   * Fuente: el FCOM del 747-400, NP.21.53 *Landing Roll Procedure*, leído el
   * 25-10-2026: «speedbrakes up» o «speedbrakes not up» y «sixty knots».
   * «Reversers normal» no está en él —el informe del NTSB DCA11IA047 dice lo
   * mismo del FCOM del 737—, así que su toma se queda sin usar. «No reverser»
   * —la reversa pedida que no se abre— tampoco, porque el juego no tiene
   * reversas que fallen. Ver `contarLaCarrera` en `game.ts`.
   *
   * Y el JAZ 90, de la clase del E170, no canta ninguno: el SOPM de Embraer
   * no los lleva. Ver `CANTOS_DE_LA_CARRERA` más abajo.
   */
  "speedbrakes up": "cabina.speedbrakesUp",
  "speedbrakes not up": "cabina.speedbrakesNotUp",
  "reversers normal": "cabina.reversersNormal",
  "sixty knots": "cabina.sixtyKnots",
};

/**
 * **Los cantos de la tabla que todavía no tienen toma.**
 *
 * La tabla y el manifiesto cuadran en las dos direcciones —lo exigen dos
 * pruebas de `cabina.test.ts`—, y estos son la excepción escrita: el juego ya
 * sabe cuándo decirlos y los pide solo si están en el pack. Cuando se graben,
 * salen de aquí; la prueba lo recuerda. Hoy no espera ninguno: los de la
 * carrera de aterrizaje ya tienen la suya.
 */
export const ESPERAN_SU_TOMA: ReadonlySet<string> = new Set<string>([]);

/**
 * **Los cantos de la carrera de aterrizaje de cada familia**: no los dice
 * cualquier tripulación, cada fabricante tiene los suyos. Los dice quien vuela
 * un avión cuyo procedimiento los lleva —ver `cantosDeLaCarrera` en
 * `flight/aircraft.ts`—, y en los demás no suena ninguno. Leídos en el manual
 * de cada uno el 25-10-2026 (punto 259):
 *
 * - **Boeing**, el 747-400: *Landing Roll Procedure*, FCOM D6-30151-400,
 *   NP.21.53 (2009), lo que canta quien vigila: «SPEEDBRAKES UP», o
 *   «SPEEDBRAKES NOT UP» si la palanca no ha subido, y «60 KNOTS». Las
 *   reversas las mira sin cantarlas: «reversers normal», que se cantaba aquí
 *   de memoria, no está en el del 747-400. Su toma sigue en
 *   `CLAVE_DE_CABINA`, sin usarse.
 * - **Embraer**, los E-Jets: **ninguno**. El SOPM (SOPM-1755, rev. 19, 3-40,
 *   «Landing rollout – actions and callouts») pone acciones y no cantos:
 *   comprobar que salen los ground spoilers, vigilar la reversa y la
 *   velocidad, y a 60 kt la reversa al mínimo y a 30 al ralentí. Las únicas
 *   frases entre comillas son el cambio de mandos y «AFTER LANDING
 *   SEQUENCE». El «60 kts» que se cantaba aquí era de un operador (el
 *   resumen de formación del E190 de Helvetic, Regli, 2025), igual que otros
 *   añaden los de Boeing (Jetairfly, OM-B del E190, 2.2.21): no es del
 *   fabricante, así que el JAZ 90 no canta nada en la carrera.
 */
export const CANTOS_DE_LA_CARRERA: Readonly<Record<"boeing" | "embraer", ReadonlySet<string>>> = {
  boeing: new Set(["cabina.speedbrakesUp", "cabina.speedbrakesNotUp", "cabina.sixtyKnots"]),
  embraer: new Set<string>(),
};

/**
 * **Todos los de la carrera**, los cante o no alguna familia de la flota:
 * ninguno es de cualquier tripulación, y uno que no está en la lista de su
 * avión no lo dice nadie. Ver `loDiceElAvion`.
 */
export const DE_LA_CARRERA: ReadonlySet<string> = new Set([
  "cabina.speedbrakesUp",
  "cabina.speedbrakesNotUp",
  "cabina.reversersNormal",
  "cabina.sixtyKnots",
]);

/**
 * **La cuenta del radioaltímetro**, número a número: lo único de la cabina
 * que es una cuenta y no un suceso. La usa la voz de la máquina para saber que
 * un número se pisa con el siguiente y no espera a nadie. Ver
 * `audio/maquina.ts`.
 *
 * Aquí estaba también «five», el cinco de la cuenta en metros. Esa cuenta ya
 * no existe —ningún radioaltímetro canta metros— y su toma se quitó del pack.
 */
export const DE_LA_CUENTA: ReadonlySet<string> = new Set([
  "cabina.twentyFiveHundred",
  "cabina.oneThousand",
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
]);

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
 * Así que estos cantos, en inglés y con la voz de la máquina, solo suenan en
 * el avión que tiene con qué decirlos —y en ése, en los cuatro peldaños—. En
 * los demás los avisos los dice la instructora, en casa, que es lo que pasa en
 * una avioneta; y la cuenta de la toma no la dice nadie, porque ahí no hay
 * radioaltímetro que la cante. Ver `Game.cantar` y `avisosHablados` en
 * `flight/aircraft.ts`.
 *
 * El TCAS va aparte porque tiene su propio equipo —ver `tcas` en la ficha—, y
 * su maniobra, más aparte todavía: solo la da el TCAS II. Ver `VOZ_DEL_RA`.
 */
export const DE_LOS_AVISADORES: ReadonlySet<string> = new Set([
  // El radioaltímetro, en la toma: su cuenta y la altura de decisión.
  ...DE_LA_CUENTA,
  "cabina.minimums",
  // El avisador de terreno, con sus cuatro modos que el juego calcula.
  "cabina.terrainPullUp",
  // Y lo que ve por delante: su precaución y su aviso.
  "cabina.cautionTerrain",
  "cabina.terrainAheadPullUp",
  "cabina.tooLow",
  "cabina.sinkRate",
  "cabina.bankAngle",
  // Y los tres avisos de a bordo que son de un avión de línea.
  "cabina.stall",
  "cabina.airspeedLow",
  "cabina.autopilotDisconnect",
]);

/**
 * **Las voces del RA del TCAS II**: la maniobra que pide la caja y el «clear
 * of conflict» del final. Ver `Orden` en `flight/tcas.ts`.
 *
 * Van aparte de `CLAVE_DE_CABINA`, y por dos motivos. Aquella tabla tiene que
 * cuadrar con el manifiesto en las dos direcciones —una clave sin grabación
 * apunta a un audio que no existe—, y éstas se escribieron **antes** de
 * grabarse. Y el juego no las pide por su texto en inglés sino por la orden
 * que da el TCAS, así que no hay texto que traducir a clave.
 *
 * Mientras no estén en el pack no suenan, y no las dice nadie en su lugar: el
 * cuadrado rojo, la franja del variómetro y la tarjeta están siempre. Ver
 * `Game.ordenDelTcas` y `PENDIENTE-VOCES-radar.md`.
 *
 * **Y las del RA completo** —cruzar, mantener, reforzar e invertir— entraron
 * igual, antes que su toma: la tabla 4 del folleto de la FAA, versión 7.1. Lo
 * que falta para oírlas, en `PENDIENTE-VOCES-cabina-2.md`. «Maintain vertical
 * speed, maintain» es la misma en los dos sentidos.
 */
export const VOZ_DEL_RA: Readonly<Record<Orden | "libre", string>> = {
  climb: "cabina.climbClimb",
  descend: "cabina.descendDescend",
  crossingClimb: "cabina.climbCrossingClimb",
  crossingDescend: "cabina.descendCrossingDescend",
  maintain: "cabina.maintainVerticalSpeed",
  crossingMaintain: "cabina.maintainCrossingMaintain",
  increaseClimb: "cabina.increaseClimb",
  increaseDescent: "cabina.increaseDescent",
  climbNow: "cabina.climbClimbNow",
  descendNow: "cabina.descendDescendNow",
  levelOff: "cabina.levelOff",
  monitor: "cabina.monitorVerticalSpeed",
  libre: "cabina.clearOfConflict",
};

const DEL_RA: ReadonlySet<string> = new Set(Object.values(VOZ_DEL_RA));

/**
 * **El aviso de altitud de cabina**, que va aparte de los demás avisadores:
 * no lo lleva todo avión con voz en sus avisos. Boeing lo da con una bocina y
 * Embraer con voz, así que lo decide la presurización de cada tipo. Ver
 * `Presurizacion.avisoHablado`.
 */
export const DE_LA_PRESURIZACION: ReadonlySet<string> = new Set(["cabina.cabin"]);

/** Lo que hace falta saber de un avión para saber qué cantos lleva. */
export interface EquipoDeCabina {
  readonly avisosHablados: boolean;
  /** Si su avisador dice *minimums*. Ver `cantaLosMinimos` en la ficha. */
  readonly cantaLosMinimos?: boolean;
  readonly tcas: string | null;
  readonly presurizacion?: { readonly avisoHablado: boolean } | null;
  readonly cantosDeLaCarrera?: "boeing" | "embraer" | null;
}

/**
 * Si este canto lo dice **una caja del avión** y no quien va sentado en él: los
 * avisadores y el TCAS. Es lo que decide que suene con la voz de la máquina en
 * los cuatro peldaños, en vez de subir por la escalera. Ver `Canto` en
 * `flight/escalera.ts`.
 */
export function esDeUnaCaja(clave: string): boolean {
  return (
    DE_LOS_AVISADORES.has(clave) ||
    DE_LA_PRESURIZACION.has(clave) ||
    clave === "cabina.traffic" ||
    DEL_RA.has(clave)
  );
}

/**
 * Si **este avión** tiene con qué decir este canto.
 *
 * Los de la tripulación, siempre, menos los de la carrera de aterrizaje, que
 * son de un procedimiento y no de todos: ver `DE_LA_CARRERA`. Los de las cajas,
 * solo si las lleva. Ver `DE_LOS_AVISADORES`.
 */
export function loDiceElAvion(clave: string, avion: EquipoDeCabina): boolean {
  if (DE_LA_CARRERA.has(clave))
    return !!avion.cantosDeLaCarrera && CANTOS_DE_LA_CARRERA[avion.cantosDeLaCarrera].has(clave);
  if (clave === "cabina.traffic") return avion.tcas !== null;
  // La maniobra, solo el TCAS II: el TCAS I solo avisa. Ver `daLaManiobra`.
  if (DEL_RA.has(clave)) return avion.tcas === "TCAS II";
  if (DE_LA_PRESURIZACION.has(clave)) return avion.presurizacion?.avisoHablado === true;
  // *Minimums*, solo en la caja que lo lleva en su menú: ver `cantaLosMinimos`.
  if (clave === "cabina.minimums") return avion.avisosHablados && avion.cantaLosMinimos === true;
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
