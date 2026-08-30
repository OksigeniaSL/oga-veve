/**
 * Fichas técnicas de las aeronaves.
 *
 * Los coeficientes son adimensionales y siguen la convención aeronáutica
 * estándar (ejes cuerpo: x adelante, y derecha, z abajo). Los signos no son
 * decorativos: `cmAlpha` negativo es lo que hace que el avión sea
 * estable en cabeceo, y `clP` negativo lo que amortigua el alabeo. Si
 * alguno cambia de signo, el avión deja de volar.
 *
 * Las aeronaves son diseños genéricos originales con nombres del universo
 * de Granja Óga. No reproducimos modelos reales: los fabricantes protegen
 * sus nombres y sus siluetas como marca registrada, y esto se vende.
 * Ver CREDITOS.md.
 */

export interface AeroCoefficients {
  /** Sustentación a ángulo de ataque nulo. */
  cl0: number;
  /** Pendiente de la curva de sustentación, por radián. */
  clAlpha: number;
  /** Ángulo de ataque de entrada en pérdida, rad. */
  alphaStall: number;
  /** Resistencia parásita. */
  cd0: number;
  /** Factor de eficiencia de Oswald, para la resistencia inducida. */
  oswald: number;
  /** Fuerza lateral por derrape. Negativo: se opone al derrape. */
  cyBeta: number;

  /** Momento de cabeceo a ángulo de ataque nulo (trimado). */
  cm0: number;
  /** Estabilidad estática longitudinal. Debe ser negativo. */
  cmAlpha: number;
  /** Amortiguamiento de cabeceo. Negativo. */
  cmQ: number;
  /**
   * Autoridad del elevador. Positivo: tirar levanta el morro.
   *
   * El valor está calibrado contra `cmAlpha`: el ángulo de ataque de
   * equilibrio es (cm0 + cmElevator·mando) / -cmAlpha. La regla de diseño es
   * que a fondo se pueda entrar en pérdida —hace falta para el aterrizaje y
   * para aprender lo que es una pérdida— pero que a medio recorrido no.
   */
  cmElevator: number;

  /** Efecto diedro: alabeo por derrape. Negativo. */
  clBeta: number;
  /** Amortiguamiento de alabeo. Negativo. */
  clP: number;
  /** Autoridad de alerones. Positivo. */
  clAileron: number;

  /** Estabilidad direccional (efecto veleta). Positivo. */
  cnBeta: number;
  /** Amortiguamiento de guiñada. Negativo. */
  cnR: number;
  /** Autoridad del timón. Positivo. */
  cnRudder: number;
  /** Guiñada adversa: los alerones guiñan al contrario. Negativo y pequeño. */
  cnAileron: number;
}

export interface AircraftConfig {
  id: string;
  /** Nombre visible. No se traduce: es un nombre propio. */
  name: string;
  /** Descripción corta, clave de i18n. */
  descriptionKey: string;

  /** Masa total, kg. */
  mass: number;
  /** Superficie alar, m². */
  wingArea: number;
  /** Envergadura, m. */
  wingSpan: number;
  /** Cuerda media aerodinámica, m. */
  chord: number;
  /** Momentos de inercia en ejes cuerpo, kg·m². */
  inertia: { xx: number; yy: number; zz: number };
  /** Empuje estático a nivel del mar, N. */
  maxThrust: number;
  /** Velocidad de crucero de referencia, m/s. Modula la caída de empuje. */
  cruiseSpeed: number;
  /** Distancia del centro de gravedad al tren, m. */
  gearHeight: number;
  /**
   * Cabeceo máximo con las ruedas en el suelo, rad. Lo impone la geometría
   * del tren: más allá, la cola toca. Sin este límite el avión rota hasta
   * ponerse de pie en la pista y se queda en pérdida sin llegar a despegar.
   */
  maxGroundPitch: number;
  /** Sustentación y resistencia extra con flaps a tope. */
  flapsLift: number;
  flapsDrag: number;

  aero: AeroCoefficients;
}

/**
 * Óga 172 — avioneta de escuela, ala alta, cuatro plazas.
 *
 * Es la aeronave de partida: estable, indulgente, entra en pérdida avisando.
 * Los números están en el orden de magnitud de una avioneta ligera real:
 * pérdida sobre 25 m/s (~49 kt) y crucero sobre 60 m/s (~117 kt).
 */
export const OGA_172: AircraftConfig = {
  id: 'oga-172',
  name: 'Óga 172',
  descriptionKey: 'aircraft.oga172.description',
  mass: 1100,
  wingArea: 16.2,
  wingSpan: 11.0,
  chord: 1.5,
  inertia: { xx: 1290, yy: 1830, zz: 2900 },
  maxThrust: 2600,
  cruiseSpeed: 60,
  gearHeight: 1.4,
  maxGroundPitch: 0.21, // 12°
  flapsLift: 0.55,
  flapsDrag: 0.06,
  aero: {
    cl0: 0.28,
    clAlpha: 5.1,
    alphaStall: 0.28, // ~16°
    cd0: 0.031,
    oswald: 0.76,
    cyBeta: -0.31,
    cm0: 0.04,
    cmAlpha: -0.9,
    cmQ: -12.4,
    cmElevator: 0.42,
    clBeta: -0.09,
    clP: -0.48,
    clAileron: 0.23,
    cnBeta: 0.075,
    cnR: -0.10,
    cnRudder: 0.075,
    cnAileron: -0.012,
  },
};

/**
 * Kuarahy — biplano fumigador.
 *
 * Más potencia, más resistencia y mucho más ágil en alabeo. Vuela despacio
 * sin caerse, que es lo que hace falta para pasar rasante sobre un cultivo.
 */
export const KUARAHY: AircraftConfig = {
  id: 'kuarahy',
  name: 'Kuarahy',
  descriptionKey: 'aircraft.kuarahy.description',
  mass: 1500,
  wingArea: 24.0,
  wingSpan: 12.5,
  chord: 1.7,
  inertia: { xx: 1600, yy: 2400, zz: 3600 },
  maxThrust: 5200,
  cruiseSpeed: 55,
  gearHeight: 1.8,
  maxGroundPitch: 0.26, // 15°: es un patín de cola, se apoya de morro arriba
  flapsLift: 0.35,
  flapsDrag: 0.05,
  aero: {
    cl0: 0.35,
    clAlpha: 5.4,
    alphaStall: 0.31, // ~18°, el biplano aguanta más
    cd0: 0.055, // dos alas y muchos tirantes: paga en resistencia
    oswald: 0.70,
    cyBeta: -0.36,
    cm0: 0.05,
    cmAlpha: -1.05,
    cmQ: -14.0,
    cmElevator: 0.52,
    clBeta: -0.07,
    clP: -0.55,
    clAileron: 0.34, // alerones en las cuatro semialas
    cnBeta: 0.082,
    cnR: -0.12,
    cnRudder: 0.095,
    cnAileron: -0.018,
  },
};

export const AIRCRAFT: readonly AircraftConfig[] = [OGA_172, KUARAHY];

export function aircraftById(id: string): AircraftConfig {
  const found = AIRCRAFT.find((a) => a.id === id);
  if (!found) throw new Error(`Aeronave desconocida: ${id}`);
  return found;
}
