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
export function indicatedAirspeed(trueAirspeed: number, altitudeMetres: number): number {
  return trueAirspeed * Math.sqrt(airDensity(altitudeMetres) / SEA_LEVEL_DENSITY);
}
