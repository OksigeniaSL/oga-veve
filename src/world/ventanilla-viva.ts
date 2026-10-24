/**
 * **La ventanilla viva, la mitad que mide**: qué cae debajo del dedo cuando
 * se toca la vista de Ara, sin recorrer el terreno en cada fotograma.
 *
 * Qué se dice de lo tocado y quién lo dice está en `flight/lo-que-se-toca.ts`;
 * si se ve de verdad por el cristal, en `world/se-ve-desde-el-pasaje.ts`, que
 * es la misma cuenta con la que la escena nombra. Aquí, solo la puntería: los
 * sitios del paisaje se **proyectan al tocar** —su punto y su tamaño, con la
 * yema del dedo de margen— y se elige el que más cerca queda del toque. Lo del
 * avión —el ala, el motor— lo mira el juego con un rayo contra el modelo, y
 * lo de debajo —el mar, el mar de nubes— con un rayo contra el mapa de
 * alturas: un solo rayo por toque, no por fotograma.
 */

import type { Vector3 } from "three";
import type { Tocable } from "../flight/lo-que-se-toca";

/**
 * **Lo que mide cada cosa del paisaje**, m de radio: lo que ocupa vista desde
 * lejos, que es lo que se puede tocar. El Teide, el cono que asoma por encima
 * del mar de nubes; las islas, su media anchura —La Gomera tiene unos
 * veinticinco kilómetros de lado a lado, La Palma algo más de veinte de ancho
 * y casi cincuenta de largo—; Mazo, el casco y sus fincas. Lo que no está
 * aquí, `RADIO_POR_DEFECTO`.
 */
export const RADIO_DE_LO_TOCABLE: Readonly<Partial<Record<Tocable, number>>> = {
  "hito:teide": 5000,
  "hito:garajonay": 11_000,
  "hito:taburiente": 9000,
  "isla-de-llegada": 9000,
  "hito:hierro": 10_000,
  "hito:anaga": 7000,
  "hito:orotava": 5000,
  "hito:canadas": 4000,
  "hito:gigantes": 3000,
  "hito:tajogaite": 2500,
  "ladera-de-mazo": 1400,
};

export const RADIO_POR_DEFECTO = 3000;

/**
 * **La yema de un dedo**, px de pantalla: lo que se puede fallar sin fallar.
 * Cuarenta y cuatro, lo que mide lo que se toca en todo el juego —ver
 * `pequenos` en `scripts/verificar-carteles.mjs`—. Un niño de cuatro años no
 * apunta mejor que eso.
 */
export const YEMA = 44;

/**
 * **Cuánto se aparta un toque de un sitio**, en veces su tamaño en la
 * pantalla con la yema de margen: de cero —el toque cae en su centro— a uno
 * —en su borde—; más de uno, fuera. `dir` es la del toque, unitaria, desde
 * los ojos; `radPorPixel`, lo que mide un píxel de la pantalla en radianes.
 * Detrás de los ojos, nunca.
 */
export function cuantoSeAparta(
  ojo: Vector3,
  dir: Vector3,
  punto: { readonly x: number; readonly y: number; readonly z: number },
  radio: number,
  radPorPixel: number,
): number {
  const vx = punto.x - ojo.x;
  const vy = punto.y - ojo.y;
  const vz = punto.z - ojo.z;
  const d = Math.hypot(vx, vy, vz);
  if (d < 1) return 0;
  const coseno = (vx * dir.x + vy * dir.y + vz * dir.z) / d;
  if (coseno <= 0) return Infinity;
  const angulo = Math.acos(Math.min(1, coseno));
  const tamano = Math.atan2(radio, d) + YEMA * radPorPixel;
  return angulo / tamano;
}

/**
 * **Los que caen debajo del dedo**, del más centrado al menos: los que se
 * apartan menos de uno. El juego mira después si se ven, por ese orden, y se
 * queda con el primero que sí.
 */
export function debajoDelDedo<T extends { readonly aparta: number }>(candidatos: readonly T[]): T[] {
  return candidatos.filter((c) => c.aparta <= 1).sort((a, b) => a.aparta - b.aparta);
}
