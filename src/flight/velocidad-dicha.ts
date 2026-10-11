/**
 * **La velocidad de la marca, dicha con su número**, en el peldaño de las
 * cifras (punto 115).
 *
 * En Taguató la tarjeta de cada paso de velocidad lleva el número de la marca
 * rosa —«Ahora vamos más despacio: menos gas, hasta la marca rosa. (390
 * km/h)»— y la voz decía la frase sin él. Para decirlo hace falta grabarlo, y
 * se monta como la torre monta sus alturas: la frase del paso, que ya está
 * grabada, y detrás una pieza con la cifra, en la voz de la instructora y en
 * las unidades del peldaño. Ver `decirElPaso` en `game.ts`.
 *
 * ## Qué cifras
 *
 * **Las que el juego puede pedir, y ninguna más**: grabar de sesenta a
 * trescientos nudos de cinco en cinco sería pagar por cifras que no suena
 * nunca. La marca de un paso de velocidad sale de la escalera de cada avión
 * —ver `flight/escalera-de-velocidades.ts`—, y la lista de abajo es la de sus
 * seis aviones con el aire de cualquier día, a la decena. La recalcula
 * `velocidad-dicha.test.ts` desde la escalera: si cambia un avión o un
 * peldaño, la prueba lo dice, y lo que falte se graba.
 *
 * **Y en kilómetros por hora**, porque el único peldaño que dice cifras y
 * todavía explica es Taguató, y Taguató vuela en el sistema métrico. En el de
 * cabina, que vuela en nudos, la instructora ya no explica. Si algún día un
 * peldaño de cifras vuela en nudos, la misma prueba lo dice.
 *
 * Si la marca cae en una cifra sin pieza —un día más frío de lo que mira la
 * prueba—, la frase se dice entera sin el número, que sigue en la tarjeta.
 */

import { NUDO } from "./escalera-de-velocidades";

/**
 * Cada cuánto se dice la velocidad en kilómetros por hora: de diez en diez,
 * como las alturas de la tarjeta. Es la misma cifra en la tarjeta y en la voz:
 * si no, el cartel diría una cosa y la instructora otra.
 */
export const KMH_CADA = 10;

/**
 * **Las cifras que se graban**, km/h. Las lee también
 * `scripts/frases-para-grabar.mjs`, que escribe una frase por cifra.
 *
 * No van seguidas, y es a propósito: los de hélice piden velocidades que
 * cambian con la altura y los reactores, las de su ficha —la Vref y sus
 * márgenes, los 250 nudos, la de subida, la placa de los flaps—, y entre las
 * dos familias hay huecos que no pide nadie.
 */
export const KMH_QUE_SE_DICEN = [
  110, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 310,
  340, 350, 360, 390, 410, 420, 440, 460, 480, 520, 540,
] as const;

/** Las unidades de un peldaño. Ver `Tier.units`. */
export type Unidades = "metric" | "aeronautical";

/**
 * **La velocidad que se escribe y se dice**, en las unidades del peldaño: en
 * kilómetros por hora a la decena, y en nudos la de la marca tal cual, que ya
 * es entera.
 */
export function velocidadDicha(kt: number, unidades: Unidades): number {
  if (unidades === "aeronautical") return Math.round(kt);
  return Math.round((kt * NUDO * 3.6) / KMH_CADA) * KMH_CADA;
}

/**
 * **La pieza grabada de esta velocidad**, o `null` si no hay: en nudos no se
 * graba ninguna, y en km/h solo las de la lista.
 */
export function piezaDeVelocidad(kt: number, unidades: Unidades): string | null {
  if (unidades !== "metric") return null;
  const kmh = velocidadDicha(kt, unidades);
  return (KMH_QUE_SE_DICEN as readonly number[]).includes(kmh)
    ? `vuelo.paso.velocidad.${kmh}`
    : null;
}
