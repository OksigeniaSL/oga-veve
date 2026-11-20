/**
 * **La ley de la subida de un avión de línea**: a qué ritmo sube y cómo llega
 * a su nivel. La vuela la tripulación de línea —ver `vuelo-de-linea.ts`— y con
 * ella cuenta el plan dónde se nivela y a qué nivel cabe un crucero —ver
 * `subidaDelPlan` en `nivel-que-ahorra.ts`—. Vive aparte para que las dos
 * cuentas lean los mismos números: el plan contaba dos millas por cada mil
 * pies, la tripulación volaba esto, y en un salto corto el punto de descenso
 * llegaba antes que el nivel (enmienda H38h del ADR 0019).
 */

const PIE = 0.3048;

/**
 * **El ritmo de un reactor regional**, m/s, abajo y arriba de diez mil pies:
 * unos dos mil setecientos pies por minuto y unos dos mil trescientos. Con
 * menos, en un salto entre islas no se llegaba nunca al nivel del plan: el
 * punto de descenso llegaba antes, y no había crucero.
 */
export const SUBE_ABAJO = 14;
export const SUBE_ARRIBA = 12;

/** Diez mil pies, m: debajo, doscientos cincuenta nudos y el ritmo de abajo. */
export const DIEZ_MIL = 10000 * PIE;

/**
 * **La captura de la altura**, s: llegando a la del plan se sube lo que
 * falta partido por esto, como un automático, y se llega frenando. Y a
 * cuántos metros de ella se da por nivelado, que es cuando empieza el crucero.
 */
export const CAPTURA = 25;
export const NIVELADO = 30;

/** El ritmo de línea a esta altitud, m/s, sin mirar lo que da el avión. */
export function ritmoDeLinea(altitud: number): number {
  return altitud < DIEZ_MIL ? SUBE_ABAJO : SUBE_ARRIBA;
}
