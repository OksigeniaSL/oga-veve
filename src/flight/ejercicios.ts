/**
 * **Los ejercicios de emergencia**: qué se puede practicar, dónde y con qué.
 *
 * El marco es el del #90, y lo primero que dice es que **esto son
 * procedimientos, no espectáculo**. Un piloto de línea pasa por aquí cada
 * seis meses en un simulador, y eso es exactamente lo que es este juego: quien
 * practica aquí un motor parado está haciendo lo que hace un profesional, y se
 * le puede decir tal cual. De ahí salen cuatro reglas, y este fichero es la
 * primera hecha código:
 *
 * 1. **Nunca por sorpresa en un vuelo tranquilo.** Una avería que llega sola a
 *    estropear el vuelo que un niño estaba disfrutando enseña una cosa: que el
 *    juego es traicionero. Aquí las averías **se eligen** —«hoy practicamos
 *    motor parado»— y la instructora las cuenta antes de empezar. Fuera de un
 *    ejercicio no se para ningún motor, salvo el que se queda sin combustible,
 *    que no es una avería sino una consecuencia y tiene su propio aviso.
 * 2. **Nadie muere. Nunca.** Ni se sugiere: si sale mal, sale mal el ejercicio
 *    y se repite, como en un simulador.
 * 3. **Sin morbo.** Ni humo, ni gritos, ni música: la calma es el contenido.
 * 4. **Cada avería enseña una cosa concreta**, y está escrito cuál al lado de
 *    cada una.
 *
 * ## Por peldaños
 *
 * - **Guyrami**: ninguna. A los cuatro años no se practica nada de esto.
 * - **Tukã**: solo el planeo, avisado, y como juego: llegar a la pista.
 * - **Taguato**: V1 —parar antes, seguir después— y un motor parado en vuelo.
 * - **Taguato Ruvicha**: todo lo anterior, y la sesión de simulador: se sabe
 *   que es un ejercicio y no se sabe qué va a fallar ni cuándo.
 *
 * ## Y cómo se suma una avería nueva
 *
 * Aves, el tren de morro… entran aquí como una entrada más de `EJERCICIOS`:
 * qué falla (`Averia`), cuándo (`Momento`), dónde y con qué. Quien la hace
 * pasar —la instructora antes, la máquina y la cabina durante, el cierre
 * después— es `practica.ts`, y no hay que tocarlo para eso salvo que la avería
 * traiga un gesto que todavía no existe.
 *
 * La despresurización entró así: su procedimiento —el aviso, las máscaras, el
 * descenso de emergencia— ya estaba escrito en `despresurizacion.ts`, con su
 * peldaño, sus aviones y cuándo se puede disparar en
 * `EJERCICIO_DE_DESPRESURIZACION`; aquí se le da su sitio en la lista, y de
 * esa ficha salen sus peldaños y sus aviones para que no haya dos versiones.
 */

import type { AircraftConfig } from "./aircraft";
import type { LeccionId } from "./lecciones";
import type { TierId } from "./tiers";
import { EJERCICIO_DE_DESPRESURIZACION } from "./despresurizacion";

export type EjercicioId =
  | "planeo"
  | "antes-de-v1"
  | "despues-de-v1"
  | "un-motor"
  | "simulador"
  | "despresurizacion";

/**
 * **Cuándo falla**, contado por lo que pasa y no por un reloj de fondo: un
 * fallo en la carrera tiene que llegar en la carrera, no a los treinta
 * segundos de haber arrancado, que puede pillar a alguien rodando.
 */
export type Momento =
  /**
   * En la carrera de despegue. `antesDeV1`: al ochenta por ciento de V1, con
   * pista de sobra para parar. Si no, a medio camino entre V1 y la rotación:
   * el «fallo de V1» del simulador de verdad, cuando ya no hay dónde parar.
   */
  | { readonly en: "carrera"; readonly antesDeV1: boolean }
  /** Subiendo, al pasar esta altura sobre el campo, m. */
  | { readonly en: "subida"; readonly metros: number }
  /** Ya en el aire desde el principio, a los segundos que se digan. */
  | { readonly en: "aire"; readonly segundos: number };

/** Qué falla. */
export interface Averia {
  /**
   * Un motor —el de fuera, de un lado o del otro—, todos, o el aire de la
   * cabina: la despresurización, que se vuela con los motores bien.
   */
  readonly que: "motor" | "motores" | "presion";
  readonly cuando: Momento;
}

/** Lo que hace falta saber de un avión para ofrecerle un ejercicio. */
export type AvionDelEjercicio = Pick<AircraftConfig, "motores" | "presurizacion">;

export interface Ejercicio {
  readonly id: EjercicioId;
  /** En qué peldaños se ofrece. */
  readonly peldanos: readonly TierId[];
  /** Con qué aviones: solo donde la avería existe de verdad. */
  valePara(a: AvionDelEjercicio): boolean;
  /**
   * La lección de la que parte: `vuelta` empieza alineado en la pista y con el
   * motor en marcha, y `aterrizaje`, ya volando. Ver `lecciones.ts`.
   */
  readonly leccion: Extract<LeccionId, "vuelta" | "aterrizaje">;
  /**
   * Dónde se coloca el avión si empieza en el aire: `planeo`, lejos y alto,
   * con la pista delante a distancia de planeo; `un-motor`, en una final
   * larga, a la altura de una senda de tres grados; `crucero`, a su altura de
   * crucero y muy lejos, en la prolongación de la pista: lo que se practica
   * allí arriba se practica donde pasa, y abajo queda pista de sobra para
   * bajar después a aterrizar.
   */
  readonly colocacion?: "planeo" | "un-motor" | "crucero";
  /**
   * Lo que puede fallar. Con una sola, es esa; con varias, se sortea al
   * empezar y **no se dice cuál**: la sesión de simulador.
   */
  readonly averias: readonly Averia[];
  /** Lo que enseña, en una línea: para quien lea esto, no para el juego. */
  readonly ensena: string;
}

/** Todos menos Guyrami: los peldaños que ya practican algo. */
const DESDE_TUKA: readonly TierId[] = ["tuka", "taguato", "taguato-ruvicha"];
const DESDE_TAGUATO: readonly TierId[] = ["taguato", "taguato-ruvicha"];
const multimotor = (a: AvionDelEjercicio): boolean => a.motores > 1;

export const EJERCICIOS: readonly Ejercicio[] = [
  {
    id: "planeo",
    peldanos: DESDE_TUKA,
    /*
     * En cualquier avión: sin motor, un monomotor y un reactor hacen lo mismo,
     * que es planear. Es la lección de Lilienthal desde el otro lado —un
     * avión sin motor sigue siendo un ala— y la del Hudson, que acabó bien.
     */
    valePara: () => true,
    leccion: "aterrizaje",
    colocacion: "planeo",
    /*
     * A los catorce segundos: lo que tarda la instructora en contarlo. Primero
     * se sabe qué va a pasar, y después pasa.
     */
    averias: [{ que: "motores", cuando: { en: "aire", segundos: 14 } }],
    ensena:
      "sin motor el avión no se cae: planea, a la velocidad de mejor planeo, hasta la pista",
  },
  {
    id: "antes-de-v1",
    peldanos: DESDE_TAGUATO,
    valePara: multimotor,
    leccion: "vuelta",
    averias: [{ que: "motor", cuando: { en: "carrera", antesDeV1: true } }],
    ensena:
      "antes de V1 queda pista para parar: gas atrás y frenos, y parar es ganar",
  },
  {
    id: "despues-de-v1",
    peldanos: DESDE_TAGUATO,
    valePara: multimotor,
    leccion: "vuelta",
    averias: [{ que: "motor", cuando: { en: "carrera", antesDeV1: false } }],
    ensena:
      "pasada V1 ya no hay pista para parar: se vuela con un motor, con el pie del lado del bueno",
  },
  {
    id: "un-motor",
    peldanos: DESDE_TAGUATO,
    valePara: multimotor,
    leccion: "aterrizaje",
    colocacion: "un-motor",
    averias: [{ que: "motor", cuando: { en: "aire", segundos: 14 } }],
    ensena:
      "un bimotor vuela perfectamente con uno: tira de lado, y para eso están los pedales",
  },
  {
    id: "simulador",
    peldanos: ["taguato-ruvicha"],
    valePara: multimotor,
    leccion: "vuelta",
    averias: [
      { que: "motor", cuando: { en: "carrera", antesDeV1: true } },
      { que: "motor", cuando: { en: "carrera", antesDeV1: false } },
      { que: "motor", cuando: { en: "subida", metros: 300 } },
    ],
    ensena:
      "se sabe que es un ejercicio y no qué va a fallar: se vuela el avión y se hace el procedimiento",
  },
  {
    id: "despresurizacion",
    /*
     * Los peldaños y los aviones, los de su ficha: Taguató y Taguató Ruvichá,
     * y solo los presurizados, que en uno sin presurizar no hay aire que
     * perder. Ver `EJERCICIO_DE_DESPRESURIZACION`.
     */
    peldanos: EJERCICIO_DE_DESPRESURIZACION.peldanos,
    valePara: (a) => EJERCICIO_DE_DESPRESURIZACION.sirveEn(a),
    leccion: "aterrizaje",
    colocacion: "crucero",
    /*
     * A los dieciocho segundos de empezar, que es lo que tarda la instructora
     * en contarlo: primero se sabe qué va a pasar, y después pasa. Y a la
     * altura de crucero, que siempre está por encima de la del ejercicio —ver
     * `ALTURA_DEL_EJERCICIO`—: si no, no se dispara.
     */
    averias: [{ que: "presion", cuando: { en: "aire", segundos: 18 } }],
    ensena:
      "sin aire en la cabina, máscara primero y abajo rápido hasta donde se respira: es un procedimiento, y se practica",
  },
];

export function ejercicioPorId(id: string | null | undefined): Ejercicio | null {
  return EJERCICIOS.find((e) => e.id === id) ?? null;
}

/** Si este ejercicio se puede elegir con este peldaño y este avión. */
export function seOfrece(
  e: Ejercicio,
  peldano: TierId,
  avion: AvionDelEjercicio,
): boolean {
  return e.peldanos.includes(peldano) && e.valePara(avion);
}

/** Los que se ofrecen con este peldaño y este avión, en su orden. */
export function ejerciciosPara(
  peldano: TierId,
  avion: AvionDelEjercicio,
): readonly Ejercicio[] {
  return EJERCICIOS.filter((e) => seOfrece(e, peldano, avion));
}

/** Si el ejercicio dice antes de empezar qué va a fallar. */
export function esAvisado(e: Ejercicio): boolean {
  return e.averias.length === 1;
}
