/**
 * **Lo que se señala del cielo**: la Cruz del Sur y la Polar, cuando se ven.
 *
 * Son las dos estrellas con las que se orienta quien no tiene brújula, y las
 * dos que este juego quiere enseñar: la Cruz en Paraguay, la Polar en
 * Canarias. Entran en la ventanilla como un sitio más —ver `world/hitos.ts`—,
 * con su tarjeta, su lado y la cabeza que se gira al tocarla, y con las
 * mismas reglas que el Teide: en crucero, de una en una, una vez por vuelo y
 * **solo si se ve**.
 *
 * ## Cuándo se ve una estrella desde una ventanilla
 *
 * - **De noche y con el cielo abierto desde donde se está**: lo que dice el
 *   cielo —ver `seVenLasEstrellas` en `sky.ts`—, que ya cuenta la hora y la
 *   capa de nubes, por debajo o por encima. Debajo de un cielo cubierto no
 *   hay Cruz del Sur que señalar.
 * - **Ni pegada al horizonte ni encima de la cabeza**: entre diez y sesenta
 *   grados. Más abajo la bruma se la come y el ala la tapa; más arriba no
 *   cabe en una ventanilla, que mira de lado y un poco hacia abajo.
 *
 * Y la línea de vista contra el relieve y contra la capa, la de siempre: la
 * estrella se pone como un sitio muy lejano en su dirección —a cincuenta
 * kilómetros y a la altura que le da su ángulo—, y así `seVe` y `laCapaTapa`
 * la miran sin saber que es una estrella. Una cumbre delante la tapa igual
 * que tapa un pueblo.
 */

import {
  aplicar,
  CENTRO_DE_LA_CRUZ,
  type CieloDeAhora,
  GRADO,
  POLAR,
  unitario,
  type Vec3,
} from "./cielo-de-noche";
import type { Hito } from "./hitos";

/** Entre qué alturas sobre el horizonte se señala, en grados. */
export const ALTURA_PARA_SENALAR = { desde: 10, hasta: 60 } as const;

/**
 * Desde cuánto se ven las estrellas para señalarlas, de 0 a 1: la noche ya
 * hecha, no el crepúsculo, donde solo asoman las más brillantes.
 */
export const SE_VEN_PARA_SENALAR = 0.5;

/** A cuánto se pone el sitio que representa a la estrella, m. */
const LEJOS = 50_000;

/** Lo que se le pide al juego: los nombres, que son texto de quien juega. */
export interface NombresDelCielo {
  readonly cruzDelSur: string;
  readonly polar: string;
}

/**
 * Las que se pueden señalar ahora desde `ojo`, o ninguna.
 *
 * `seVen` es lo que dice el cielo de cuánto se ven las estrellas desde el
 * ojo. Ver la cabecera.
 */
export function estrellasQueSeSenalan(
  cielo: CieloDeAhora | null,
  seVen: number,
  ojo: { readonly x: number; readonly y: number; readonly z: number },
  nombres: NombresDelCielo,
): Hito[] {
  if (!cielo || seVen < SE_VEN_PARA_SENALAR) return [];
  const salida: Hito[] = [];
  const poner = (
    j2000: Vec3,
    nombre: string,
    clase: "cruz-del-sur" | "polar",
  ): void => {
    const d = aplicar(cielo.mundoDesdeJ2000, j2000);
    const altura = Math.asin(Math.max(-1, Math.min(1, d[1]))) / GRADO;
    if (altura < ALTURA_PARA_SENALAR.desde || altura > ALTURA_PARA_SENALAR.hasta)
      return;
    const llano = Math.hypot(d[0], d[2]);
    salida.push({
      nombre,
      clase,
      clave: clase,
      x: ojo.x + (d[0] / llano) * LEJOS,
      z: ojo.z + (d[2] / llano) * LEJOS,
      ele: ojo.y + LEJOS * Math.tan(altura * GRADO),
      alcance: LEJOS * 1.2,
      altura,
      // Lo mismo que el Teide: lo que más merece contarse de esa noche.
      peso: 3,
    });
  };
  poner(CENTRO_DE_LA_CRUZ, nombres.cruzDelSur, "cruz-del-sur");
  poner(unitario(POLAR.ra, POLAR.dec), nombres.polar, "polar");
  return salida;
}
