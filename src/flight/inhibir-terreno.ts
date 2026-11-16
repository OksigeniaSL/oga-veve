/**
 * *TERR INHIBIT*: **apagar la mirada de delante del avisador de terreno** al
 * llegar a un campo que no está en su base de datos.
 *
 * ## Por qué existe
 *
 * Virando a final en la 15 de Yvytu Rape, el TAWS del Tujuju da «caution
 * terrain»: el umbral está en una hondonada y el suelo bajo la final sube por
 * encima de él. Es lo que daría uno de verdad, y se queda (ADR 0027, enmienda
 * H13d2). Pero una tripulación de verdad no aterriza en una pista que su
 * equipo no conoce con esa mirada encendida: **la apaga antes de llegar**, con
 * un botón que lo dice en la cabina. Es lo que pide el fabricante:
 *
 * > «TAD/TCF functions should be manually inhibited within 15 nm on approach
 * > to an airport that is not in the airport database to avoid unwanted
 * > alerts.» (Honeywell, *MK V & MK VII EGPWS Pilot Guide*, 060-4241-000,
 * > rev. D, 2000, p. 46)
 *
 * ## Qué apaga y qué no
 *
 * Solo **lo que mira por delante con la base de datos**: la precaución y el
 * aviso de delante (`terreno-delante.ts`, la FLTA de la norma) y el relieve de
 * la pantalla de navegación. «Pressing the Terrain Inhibit switch inhibits TAD
 * and TCF alerting and display» (060-4241-000, p. 55), y «neither loss nor
 * inhibiting TAD/TCF effects the basic GPWS functions» (p. 37). La lista
 * mínima del -400 dice lo mismo con sus nombres: los modos de la base son
 * «TCF, RFCF, TAD … also known as TAWS Forward Looking Terrain Avoidance
 * (FLTA) and Premature Descent Alert (PDA)», y los básicos, los modos 1 a 6
 * (Transport Canada, MMEL del DHC-6 Series 400, rev. 5, 34-44-1).
 *
 * Así que el aviso de lo que hay debajo (`aviso-de-terreno.ts`), que mira la
 * altura sobre el suelo y lo que se baja como los modos básicos, **sigue
 * avisando**: quien se mete bajo en la final de la granja oye «too low» o
 * «terrain, pull up» igual que siempre. Y la cuenta del radioaltímetro,
 * también.
 *
 * ## Quién lo hace
 *
 * Lo decide la escalera con «quién lleva qué»: en los tres peldaños de abajo,
 * quien va sentado al lado, como los aerofrenos de la lista de aterrizaje; en
 * el de cabina, quien vuela. Ver `loHaceQuienVaAlLado` en `escalera.ts`. Este
 * módulo no habla ni dibuja: dice qué toca.
 *
 * ## Lo que se simplifica
 *
 * El avisador del juego conoce todas las pistas del vuelo, también la de la
 * granja (`pistasConocidas` en `Game`), y por eso junto a ella acorta su
 * mirada como junto a cualquier otra. Uno de verdad no la conocería y daría
 * más avisos todavía, que es justo por lo que se apaga. Lo que se enseña —en
 * esta pista se apaga, y por qué— es el mismo.
 */

import type { Aerodrome } from "../world/aerodrome";

/** Una milla náutica, m. */
const MILLA = 1852;
/** Un pie, m. */
const PIE = 0.3048;

/**
 * **El botón TERR INHIBIT de una ficha**: el avisador lo lleva y su base de
 * pistas tiene un mínimo. Ver `terrInhibit` en `flight/aircraft.ts`.
 */
export interface TerrInhibit {
  /** El equipo, como lo nombra su fuente. Para la ficha y las pruebas. */
  readonly equipo: string;
  /**
   * **Lo más corta que es una pista de su base**, m. Por debajo de eso el
   * equipo no la conoce aunque esté publicada.
   */
  readonly pistaMasCortaDeLaBase: number;
}

/**
 * El del Honeywell MK VI: «Terrain map with runways >= 2000 feet in length»
 * (*MK VI MK VIII EGPWS Installation Design Guide*, 060-4314-150, hoja 15).
 * El de tres mil quinientos es opción del MK VIII, no del VI.
 */
export const MK_VI: TerrInhibit = {
  equipo: "Honeywell MK VI EGPWS",
  pistaMasCortaDeLaBase: 2000 * PIE,
};

/**
 * **Hasta dónde se apaga**: quince millas del campo, las del procedimiento.
 * Dentro, en la aproximación, se apaga; fuera, se vuelve a encender, que «Terrain
 * Inhibit requires manual deactivation» (060-4241-000, p. 55) y alguien tiene
 * que hacerlo.
 */
export const RADIO_DEL_PROCEDIMIENTO = 15 * MILLA;

/**
 * **Por encima de cuánto se apaga, m sobre el suelo**: quinientos pies.
 *
 * Que el campo esté a menos de quince millas no basta en una vuelta al campo:
 * se está dentro desde que se suelta el freno, y apagarlo rodando o en la
 * carrera de despegue es meter una cosa más en el momento con más voces. Se
 * hace con el avión ya subiendo tranquilo, lejos del suelo, que es cuando una
 * tripulación hace lo que le queda de la lista.
 */
export const DESDE_LA_ALTURA = 500 * PIE;

/** Lo largo de una pista del fichero del aeródromo, m: de punta a punta de su eje. */
function largoDe(p: Aerodrome["runways"][number]): number {
  const a = p.centerline[0];
  const b = p.centerline[p.centerline.length - 1];
  if (!a || !b) return 0;
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/**
 * **Si el campo se sabe fuera de la base del equipo**: un campo privado, que
 * no está publicado en ninguna parte —y una base de pistas se hace con lo
 * publicado—, o uno sin ninguna pista tan larga como la más corta de la base.
 *
 * Sin el fichero del aeródromo no se sabe, y lo que no se sabe no se enseña:
 * `false`.
 */
export function fueraDeLaBase(
  aero: Pick<Aerodrome, "privado" | "runways"> | null | undefined,
  equipo: TerrInhibit,
): boolean {
  if (!aero) return false;
  if (aero.privado === true) return true;
  return !aero.runways.some((p) => largoDe(p) >= equipo.pistaMasCortaDeLaBase);
}

/** Lo que hace falta saber para decidir. */
export interface LecturaDelInhibidor {
  /** Si el botón está pulsado. */
  readonly inhibido: boolean;
  /** Si el avión vuela. */
  readonly enVuelo: boolean;
  /** Lo que hay entre el avión y el suelo, m. */
  readonly sobreElSuelo: number;
  /**
   * **El campo al que se va**, si está fuera de la base, y a cuánto queda, m;
   * `null` si se va a uno que el equipo conoce.
   */
  readonly llegadaFueraDeLaBase: number | null;
  /**
   * A cuánto queda el campo por el que se apagó, m, o `null` si no está
   * apagado.
   */
  readonly delCampoApagado: number | null;
}

/** Lo que toca: apagarlo, volver a encenderlo o nada. */
export type QueToca = "inhibir" | "restablecer" | null;

/**
 * **Qué toca ahora con el botón.**
 *
 * - **Apagarlo** volando, por encima de quinientos pies y a menos de quince
 *   millas del campo al que se va, si ese campo no está en la base.
 * - **Volver a encenderlo** pasadas las quince millas del campo por el que se
 *   apagó: saliendo de allí hacia otro, ya no hace falta, y con él apagado no
 *   se ve el monte que venga.
 */
export function queToca(l: LecturaDelInhibidor): QueToca {
  if (l.inhibido)
    return l.delCampoApagado !== null && l.delCampoApagado > RADIO_DEL_PROCEDIMIENTO
      ? "restablecer"
      : null;
  if (!l.enVuelo || l.sobreElSuelo < DESDE_LA_ALTURA) return null;
  return l.llegadaFueraDeLaBase !== null && l.llegadaFueraDeLaBase <= RADIO_DEL_PROCEDIMIENTO
    ? "inhibir"
    : null;
}
