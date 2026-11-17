import type { Scenario } from "./scenarios";

/**
 * Por qué cabecera se opera, sacada del rumbo que ya tiene el escenario.
 *
 * La elige el viento en `conViento`, pero lo que queda guardado es el rumbo, no
 * el nombre. Se recupera comparando: la que apunta a menos de noventa grados
 * del rumbo de salida es la de salida.
 */
export function cabeceraEnUso(escenario: Scenario): string | null {
  const pista = escenario.aerodrome?.runways[0];
  if (!pista) return null;
  for (const [nombre, u] of Object.entries(pista.thresholds)) {
    if (!u?.xy) continue;
    const otro = Object.values(pista.thresholds).find((v) => v?.xy && v !== u);
    if (!otro?.xy) continue;
    // El rumbo de salida desde este umbral es el que va hacia el otro.
    const rumbo =
      ((Math.atan2(otro.xy[0] - u.xy[0], -(-otro.xy[1] - -u.xy[1])) * 180) /
        Math.PI +
        360) %
      360;
    const diferencia = Math.abs(
      ((rumbo - escenario.runway.heading + 540) % 360) - 180,
    );
    if (diferencia < 90) return nombre;
  }
  return null;
}
