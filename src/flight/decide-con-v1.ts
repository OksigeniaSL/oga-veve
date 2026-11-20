/**
 * **Quién decide el despegue con V1, y qué cambia en la carrera por eso.**
 *
 * Es el criterio de un solo sitio que leen el HUD —el freno y el aviso de
 * fin de pista—, la máquina de fases —«comprometido»—, los ejercicios y lo
 * que se dice al despegar. Estaba en `ejercicios.ts`, que arrastra media
 * flota de módulos detrás; aquí no depende de nada, y lo pueden leer el HUD y
 * el plan de vuelo sin cargarse los ejercicios.
 *
 * El destello de V1 sale en todos los aviones, que así se pidió: marca un
 * momento, como el de un aro (ver `hud.ts`). Lo que cambia con el tipo es lo
 * que el juego **hace** detrás del destello. Ver el ADR 0014, enmienda H44a.
 */

import type { AircraftConfig } from "./aircraft";

type ElTipo = Pick<AircraftConfig, "motores" | "sound">;

/**
 * **Si su manual decide el despegue con V1**: los multimotores de turbina.
 *
 * El turbohélice y el reactor llevan V1 en su manual —el Twin Otter -400,
 * igual a la Vr (PSM 1-64-1A, figura 4-1); el 1900D y los reactores, la de
 * su categoría de transporte—: antes se para, después se sigue. El bimotor
 * de pistón **no la lleva**. Su manual decide con la velocidad y con el
 * tren: «If engine failure occurs during takeoff and 85 KIAS has not been
 * attained: Throttles — CLOSE both immediately. Stop straight ahead», y si
 * no queda pista, se para igual, esquivando lo que haya delante; y por
 * encima de 85 nudos con el tren todavía fuera, se para si queda pista
 * (Piper, PA-34-220T Seneca III, VB-1110, sección 3; el del Seneca I, lo
 * mismo con 100 mph). La FAA lo dice con el tren: «if the landing gear has
 * not been selected up, the takeoff should be rejected, even if airborne»
 * (*Airplane Flying Handbook*, FAA-H-8083-3C, p. 13-12). El JAZ 40 rota a
 * 72 nudos, así que en su despegue **todo fallo con el tren fuera se para**,
 * y solo se sigue con el tren dentro y subiendo. Con un motor en molinete y
 * el tren fuera no sube a ninguna velocidad (ADR 0027, enmienda H37b).
 *
 * Y el monomotor tampoco: no hay otro motor con el que seguir. Si el suyo
 * falla rodando se cierra el gas y se frena, y recién despegado se aterriza
 * por delante (Cessna 172S, manual de vuelo, sección 3: *Engine Failure
 * During Takeoff Roll* y *Engine Failure Immediately After Takeoff*).
 *
 * El destello de V1 en pantalla sale igual en todos —ver `hud.ts`—: lo que
 * cambia es lo que se practica, lo que se hace y lo que se dice. Ver el ADR
 * 0027, enmienda H37e, y el ADR 0014, enmiendas H37i y H44a.
 */
export const conV1 = (a: ElTipo): boolean =>
  a.motores > 1 && a.sound.engine !== "piston" && a.sound.engine !== "radial";

/**
 * **El gas con el que una carrera es un despegue**, de 0 a 1: el que empieza
 * la carrera en el HUD y el que dice, en los que no deciden con V1, que el
 * despegue sigue. Ver `pasadaLaV1`.
 */
export const GAS_DE_DESPEGUE = 0.55;

/** Cómo va la carrera, lo que mira el HUD. Velocidades indicadas, m/s. */
export interface LaCarreraDelHud {
  /** Si esto es una carrera de despegue empezada. Ver `enLaCarrera` en `hud.ts`. */
  readonly enLaCarrera: boolean;
  /** Con la funda del pitot puesta la aguja marca cero: no hay V1. */
  readonly pitotTapado: boolean;
  readonly indicada: number;
  /** La V1 de hoy, indicada. */
  readonly v1: number;
  /** El gas, de 0 a 1. */
  readonly gas: number;
}

/** Lo que pasa en la carrera de despegue al pasar la aguja por V1. */
export interface PasadaLaV1 {
  /** La aguja pasó V1 en la carrera: el destello y la nota, en **todos**. */
  readonly destello: boolean;
  /**
   * Ya no se frena: el botón del freno se despide. Solo en los que deciden
   * con V1, donde frenar pasada ya no es una opción.
   */
  readonly seVaElFreno: boolean;
  /** El aviso de «se acaba la pista, frená» calla, porque se está volando. */
  readonly callaElFinDePista: boolean;
}

/**
 * **Qué hace el juego al pasar la aguja por V1, según el tipo.**
 *
 * - **Con V1**, el turbohélice y el reactor: pasada, el despegue está
 *   comprometido. El freno se va —es la forma de enseñar qué es V1 a quien
 *   no lee— y el aviso de fin de pista calla, que no puede pedir frenar
 *   justo cuando el juego enseña que ya no se frena.
 * - **Sin V1**, la avioneta, el fumigador y el bimotor de pistón: frenar
 *   sigue siendo lo que toca mientras quede pista —y en el Seneca, aunque no
 *   quede—, así que **el freno se queda**. Y el aviso de fin de pista calla
 *   solo mientras se siga con gas, que es seguir con un despegue que va
 *   bien: quien corta el gas está parando, y a ése sí hay que decirle que la
 *   pista se acaba. Ver la cabecera de `conV1`.
 */
export function pasadaLaV1(a: ElTipo, c: LaCarreraDelHud): PasadaLaV1 {
  const destello = c.enLaCarrera && !c.pitotTapado && c.indicada > c.v1;
  const decide = conV1(a);
  return {
    destello,
    seVaElFreno: destello && decide,
    callaElFinDePista: destello && (decide || c.gas > GAS_DE_DESPEGUE),
  };
}
