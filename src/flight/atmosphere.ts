/**
 * Atmósfera estándar internacional (ISA), troposfera.
 *
 * Solo necesitamos densidad: es lo que escala la presión dinámica y, con
 * ella, todas las fuerzas aerodinámicas y el empuje de la hélice. Por eso
 * un avión despega más largo en un día caluroso y en altura.
 *
 * Válida hasta 11 000 m, de sobra para este juego.
 */

export const SEA_LEVEL_DENSITY = 1.225; // kg/m³
export const GRAVITY = 9.80665; // m/s²

export function airDensity(altitudeMetres: number): number {
  const h = Math.max(0, Math.min(altitudeMetres, 11000));
  return SEA_LEVEL_DENSITY * Math.pow(1 - 2.25577e-5 * h, 4.25588);
}

/**
 * Velocidad indicada: lo que marcaría el anemómetro, que mide presión
 * dinámica y no velocidad real. Es la que importa para volar —la pérdida
 * ocurre siempre a la misma indicada— y por eso es la que va en el HUD.
 */
export function indicatedAirspeed(
  trueAirspeed: number,
  altitudeMetres: number,
): number {
  return (
    trueAirspeed * Math.sqrt(airDensity(altitudeMetres) / SEA_LEVEL_DENSITY)
  );
}

/**
 * La velocidad del sonido a esa altura, en metros por segundo.
 *
 * Hace falta por una sola cosa, y merece la pena: el número de Mach del EICAS
 * de los reactores. Es **el único decimal de todo el juego**, y lo es a
 * propósito — es el instrumento favorito de cualquier niño que se suba a un
 * reactor de verdad, y no significa nada si no está bien calculado.
 *
 * Baja con la temperatura, no con la presión: por eso a once mil metros un
 * avión cruza a la misma indicada y sin embargo va mucho más cerca de Mach 1.
 * Por encima de la tropopausa la temperatura se queda quieta, y la velocidad
 * del sonido con ella.
 */
export function velocidadDelSonido(altitudeMetres: number): number {
  const T = Math.max(216.65, 288.15 - 0.0065 * Math.max(0, altitudeMetres));
  return 20.0468 * Math.sqrt(T);
}
