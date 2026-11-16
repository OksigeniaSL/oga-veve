/**
 * **El guion de las fases del plan**: qué tarjeta sale en cada una, cuánto se
 * queda, qué tecla lleva y si lleva la letra de la calle.
 *
 * Vivía dentro del anuncio de fase de `game.ts`, escrito como una cadena de
 * `vista.fase === "…" || …` repetida en cada pregunta, y así no se podía
 * probar sin montar el juego entero: un hueco en una de esas listas solo se
 * veía volando. Aquí va junto al `GUION` y a `SE_QUEDAN`, por lo mismo que
 * ellos: **lo que dice una fase y cuánto dura es parte de la lección**, no de
 * la pintura. El juego sigue decidiendo lo que no es de la fase —el tractor
 * enganchado, si hay voz, si se lee—. Repaso del 12-09 de #30, corte 10.
 */

import { GUION, SE_QUEDAN, guionAfis, guionSinTorre, type Fase } from "./vuelo";

/** Quién contesta en el campo: una torre, un AFIS o nadie. Ver `world/aerodrome.ts`. */
export type QuienContesta = "torre" | "afis" | "nadie";

/** Lo que la tarjeta de una fase necesita saber del vuelo, aparte de la fase. */
export interface DondeSeAnuncia {
  readonly contesta: QuienContesta;
  /** Si hoy sale la bici a buscarte: solo en la pista particular. Ver `guionSinTorre`. */
  readonly conBici: boolean;
  /** Si el campo sin torre es el de casa, o uno público como Ayolas. */
  readonly enCasa: boolean;
  /** Si se juega la lección de aterrizar. */
  readonly aterrizando: boolean;
  /** Si el vuelo va a otro aeropuerto. Ver `haciaOtroCampo` en `game.ts`. */
  readonly haciaOtroCampo: boolean;
  /** Si el back-taxi remonta solo un trecho, y no hasta el fondo. */
  readonly remontaUnTrecho: boolean;
}

/** La tecla que pide una fase, como la nombra `Input.preferredKey`. */
export type TeclaDeLaFase = "engine" | "brakes";

/** La tarjeta de una fase, sin pintar. */
export interface TarjetaDeLaFase {
  readonly clave: string;
  readonly icono: string;
  /** Lo que se queda en pantalla, s: `Infinity` si espera a que alguien haga algo. */
  readonly segundos: number;
  /** La tecla dibujada en la tarjeta. */
  readonly tecla: TeclaDeLaFase | null;
  /** La tecla que acompaña al rótulo grande, que no siempre es la de la tarjeta. */
  readonly teclaDelRotulo: TeclaDeLaFase | null;
  /** Si tocar la tarjeta es girar la llave: arrancar en el puesto, apagar al llegar. */
  readonly tocarEsLaLlave: boolean;
  /** Si lleva la letra de la calle por la que se va. */
  readonly conLetra: boolean;
}

/**
 * **Las fases que esperan la llave**: en el puesto, antes de arrancar y
 * después de llegar. La tarjeta no se va sola, lleva la tecla del contacto
 * y **hace** lo que dice al tocarla: en una tablet no había ninguna forma de
 * arrancar el motor, porque los mandos táctiles son palanca, timón, gas y
 * freno, y el contacto no estaba por ningún lado.
 */
const ESPERAN_LA_LLAVE: ReadonlySet<Fase> = new Set<Fase>(["estacionado", "en-puesto"]);

/**
 * **La letra de la calle solo cuando la calle importa.**
 *
 * Se pegaba a todos los mensajes: parado en el puesto con el motor apagado
 * salía «arrancá el motor · R», y en el punto de espera «frená · R». La R es
 * un dato de por dónde se rueda, y quien está parado no rueda por ninguna
 * parte — ahí es una letra suelta que no significa nada, y ya costó una vez
 * enterarse de qué era.
 *
 * Se enseña en las fases en las que uno va por una calle y le sirve saber
 * cuál: yendo a la pista, saliendo de ella y volviendo a casa.
 */
const POR_UNA_CALLE: ReadonlySet<Fase> = new Set<Fase>(["rodando", "abandonando", "a-plataforma"]);

/**
 * **Las fases en que manda el plan, y el tutor calla.** El tutor se escribió
 * para enseñar a despegar desde la cabecera, y con el vuelo completo hay otro
 * narrador, el plan, que dice «seguí la raya verde» y «pará en la doble
 * raya»: dos voces dando instrucciones a la vez a alguien de cuatro años es
 * peor que ninguna. Vuelve al alinearse, que es cuando toca despegar y el
 * tutor sí sabe de eso. Ver `Tutor.silenciar` en `ui/tutor.ts`.
 *
 * **Y el back-taxi es rodar**, aunque sea por la pista: se va hasta el fondo
 * y se da la vuelta antes de alinearse. Faltaba en esta lista, una de las
 * que se escribían a mano fase por fase en `game.ts`, y el tutor pedía gas
 * para despegar a mitad del trecho mientras el plan decía «andá hasta el
 * fondo y date la vuelta».
 */
export const MANDA_EL_PLAN: ReadonlySet<Fase> = new Set<Fase>([
  "estacionado",
  "arrancando",
  "rodando",
  "esperando",
  "autorizado",
  "back-taxi",
  "abandonando",
  "a-plataforma",
  "en-puesto",
  "apagado",
]);

/** Lo que dura la tarjeta de una fase de paso, s. */
const DE_PASO = 6;
/** Y la de apagar, que es el final y se lee con calma. */
const AL_APAGAR = 9;

/**
 * **La tarjeta de una fase**, con el guion del campo donde se está.
 *
 * **Tres caminos para lo mismo, y el dibujo es el que nunca falta.** La voz
 * no la oye quien juega en silencio ni quien no oye; el texto no lo lee quien
 * tiene cuatro años. El dibujo lo entiende todo el mundo.
 *
 * Y hay fases que **esperan a que alguien haga algo** —arrancar el motor,
 * apagarlo, esperar la luz—. Esas no pueden desaparecer solas: la primera
 * persona que lo jugó se quedó mirando un avión parado en Silvio Pettirossi
 * porque la llave salió, se apagó a los seis segundos, y ya no había forma de
 * enterarse de qué hacía falta. Ver `SE_QUEDAN`.
 */
export function tarjetaDeLaFase(fase: Fase, donde: DondeSeAnuncia): TarjetaDeLaFase {
  /*
   * **En una pista sin torre, su guion**: sin lámpara que esperar y sin nadie
   * detrás que meta prisa. Ver `guionSinTorre`. Con la bici, si hoy sale: es
   * la misma condición que la saca a ella, y solo en la pista particular,
   * que es donde hay quien pedalee. En Ayolas no es casa.
   */
  const guion =
    donde.contesta === "nadie"
      ? guionSinTorre(fase, donde.conBici, donde.enCasa)
      : donde.contesta === "afis"
        ? guionAfis(fase)
        : GUION[fase];
  /*
   * **En la lección de aterrizar, volar no es el premio: es el camino.**
   *
   * La fase «en vuelo» dice «andá a dar una vuelta», que es lo que toca
   * cuando se acaba de despegar y el mundo es tuyo. Pero quien eligió
   * aprender a aterrizar aparece ya volando y a tres kilómetros de la
   * cabecera: decirle que se dé una vuelta es mandarlo al sitio contrario.
   *
   * **Y yendo a otro aeropuerto, tampoco se da una vuelta**: se sigue la
   * flecha hasta allí.
   *
   * Y remontando un trozo, la tarjeta no dice «hasta el fondo», que la vuelta
   * no está en el fondo: está donde la dibuja la raya. Ver
   * `remontaHastaLaCabecera` en `flight/carrera.ts`.
   */
  const clave =
    donde.aterrizando && fase === "en-vuelo"
      ? "vuelo.enVueloAterrizando"
      : fase === "en-vuelo" && donde.haciaOtroCampo
        ? "vuelo.enVueloDestino"
        : fase === "back-taxi" && donde.remontaUnTrecho
          ? "vuelo.backTaxiUnTrecho"
          : guion.clave;
  const llave = ESPERAN_LA_LLAVE.has(fase);
  /*
   * **La carrera de aterrizaje también espera a que alguien haga algo.**
   *
   * «Frená» y «Salí de la pista» duraban seis segundos y luego la pantalla se
   * quedaba vacía hasta que cambiara la fase. Pero esas dos fases duran lo que
   * tarde quien juega en frenar y en encontrar la salida —que puede ser un
   * minuto largo—, así que el aviso desaparecía justo cuando hacía falta: «en
   * pista, ya aterrizado, nadie me indica por dónde abandonar la pista para ir
   * al hangar». Lo que está pendiente de que alguien haga algo **no puede
   * apagarse solo**, haya o no tecla que pulsar.
   */
  const segundos =
    llave || fase === "esperando" || SE_QUEDAN.has(fase)
      ? Infinity
      : fase === "apagado"
        ? AL_APAGAR
        : DE_PASO;
  return {
    clave,
    icono: guion.icono,
    segundos,
    // La tecla, dibujada. Sin esto, en el peldaño sin palabras no había
    // ninguna manera de saber que el contacto es la I.
    tecla: llave ? "engine" : fase === "esperando" ? "brakes" : null,
    // Al lado del rótulo va **la tecla**, cuando la fase pide una. «Arrancá
    // el motor» no le sirve de nada a quien no sabe cuál es el motor.
    teclaDelRotulo: llave
      ? "engine"
      : fase === "esperando" || fase === "aterrizado"
        ? "brakes"
        : null,
    tocarEsLaLlave: llave,
    conLetra: POR_UNA_CALLE.has(fase),
  };
}
