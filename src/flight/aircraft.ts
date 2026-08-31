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
  /**
   * Autoridad de alerones. Positivo.
   *
   * Como `cmElevator`, está expresado **por unidad de mando normalizado**, no
   * por radián de deflexión. Los valores tabulados en la literatura son por
   * radián y hay que multiplicarlos por el recorrido máximo del mando —unos
   * 0,35 rad para un alerón— antes de usarlos aquí. Copiarlos tal cual
   * triplica la autoridad: el avión rodaba a 250 grados por segundo, ritmo
   * de caza, y bastaba rozar una flecha para perderlo.
   *
   * Regla de calibración: el ritmo estabilizado es clAileron/|clP| · 2V/b.
   * Para una ligera de escuela debe salir entre 60 y 80 grados por segundo.
   */
  clAileron: number;

  /** Estabilidad direccional (efecto veleta). Positivo. */
  cnBeta: number;
  /** Amortiguamiento de guiñada. Negativo. */
  cnR: number;
  /** Autoridad del timón, por unidad de mando. Ver `clAileron`. */
  cnRudder: number;
  /** Guiñada adversa: los alerones guiñan al contrario. Negativo y pequeño. */
  cnAileron: number;
}

/**
 * Cómo se ve una aeronave.
 *
 * Está aquí, junto a los coeficientes, porque la forma y la aerodinámica
 * describen el mismo avión: un biplano tiene dos alas y más resistencia, y
 * las dos cosas tienen que contarse a la vez o acaban divergiendo. Cuando
 * entren los modelos en glTF, esto se queda como referencia de silueta y de
 * paleta.
 */
export interface AircraftAppearance {
  /** Disposición del ala. Es lo que distingue una silueta de otra. */
  layout: 'high-wing' | 'biplane';
  /** Colores del fuselaje, del capó y de los detalles. */
  body: number;
  accent: number;
  trim: number;
  /** Cuántas palas lleva la hélice. */
  blades: number;
}

/**
 * Cómo suena una aeronave.
 *
 * Va en su ficha por el mismo motivo que la silueta: un motor de pistón y una
 * turbina no se parecen en nada, y describir el mismo avión en tres sitios
 * distintos —aerodinámica, forma y sonido— solo funciona si los tres viven
 * juntos. Con esto, añadir un motor nuevo es rellenar datos, no escribir
 * código de audio.
 */
export interface AircraftSound {
  /** Qué clase de motor. Decide qué capas construye el sintetizador. */
  engine: 'piston' | 'radial' | 'turboprop' | 'turbofan';
  /**
   * Cilindros. La frecuencia de encendido de un cuatro tiempos son las
   * revoluciones por minuto entre sesenta, por cilindros, entre dos: es lo
   * que hace que un radial de siete cilindros suene grave y golpeado donde
   * un cuatro cilindros suena a moto.
   */
  cylinders: number;
  idleRpm: number;
  maxRpm: number;
  /**
   * Resonancia característica en reposo, en hercios, y cuánto sube a plena
   * potencia. Es la banda en la que el oído sitúa el motor, y la única que de
   * verdad reproduce el altavoz de una tablet.
   */
  growlHz: number;
  growlRise: number;
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
  /**
   * Velocidad de decisión, m/s. **V1.**
   *
   * El último instante de la carrera en que todavía queda pista para
   * detenerse. Pasada, el despegue está comprometido: se vuela, aunque algo
   * vaya mal, porque ya no hay dónde parar.
   *
   * Por eso el freno deja de ofrecerse justo aquí, y no cuando las ruedas se
   * despegan del suelo. La desaparición del botón **es** la explicación de
   * qué significa V1, y llega antes de que haga falta entenderla.
   *
   * En un avión de línea es un número calculado para cada despegue —peso,
   * pista, temperatura—. Aquí es uno por aeronave, que es todo lo que este
   * simulador puede sostener honestamente.
   */
  decisionSpeed: number;
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

  appearance: AircraftAppearance;
  sound: AircraftSound;
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
  decisionSpeed: 26,
  gearHeight: 1.4,
  maxGroundPitch: 0.21, // 12°
  flapsLift: 0.55,
  flapsDrag: 0.06,
  appearance: {
    layout: 'high-wing',
    body: 0xe4e2da,
    accent: 0xbe5d38,
    trim: 0x2f5243,
    blades: 2,
  },
  sound: {
    engine: 'piston',
    cylinders: 4,
    idleRpm: 700,
    maxRpm: 2700,
    growlHz: 300,
    growlRise: 320,
  },
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
    clAileron: 0.075, // ~73°/s a fondo: lo que rueda una avioneta de escuela
    cnBeta: 0.075,
    cnR: -0.10,
    cnRudder: 0.028,
    cnAileron: -0.004,
  },
};

/**
 * Mainumby — biplano fumigador.
 *
 * Más potencia, más resistencia y mucho más ágil en alabeo. Vuela despacio
 * sin caerse, que es lo que hace falta para pasar rasante sobre un cultivo.
 *
 * *Mainumby* es el colibrí: trabaja bajo, entre las plantas, y se queda
 * quieto en el aire. Para un fumigador no hay mejor nombre. Antes se llamaba
 * Kuarahy, pero esa raíz está tomada por Kuarahy-memby, la ardilla de Granja
 * Óga, y dos personajes con el mismo nombre se confunden en vídeo.
 */
export const MAINUMBY: AircraftConfig = {
  id: 'mainumby',
  name: 'Mainumby',
  descriptionKey: 'aircraft.mainumby.description',
  mass: 1500,
  wingArea: 24.0,
  wingSpan: 12.5,
  chord: 1.7,
  inertia: { xx: 1600, yy: 2400, zz: 3600 },
  maxThrust: 5200,
  cruiseSpeed: 55,
  decisionSpeed: 24,
  gearHeight: 1.8,
  maxGroundPitch: 0.26, // 15°: es un patín de cola, se apoya de morro arriba
  flapsLift: 0.35,
  flapsDrag: 0.05,
  appearance: {
    // Biplano de trabajo: dos alas, ocre y verde, hélice de tres palas.
    layout: 'biplane',
    body: 0xdd923f,
    accent: 0x2f5243,
    trim: 0x8a5a34,
    blades: 3,
  },
  sound: {
    // Radial de fumigador: más cilindros, más lento y mucho más grave. Es el
    // golpeteo que uno reconoce sin verlo pasar.
    engine: 'radial',
    cylinders: 7,
    idleRpm: 550,
    maxRpm: 2100,
    growlHz: 190,
    growlRise: 210,
  },
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
    clAileron: 0.13, // alerones en las cuatro semialas: más ágil, no el doble
    cnBeta: 0.082,
    cnR: -0.12,
    cnRudder: 0.036,
    cnAileron: -0.007,
  },
};

export const AIRCRAFT: readonly AircraftConfig[] = [OGA_172, MAINUMBY];

export function aircraftById(id: string): AircraftConfig {
  const found = AIRCRAFT.find((a) => a.id === id);
  if (!found) throw new Error(`Aeronave desconocida: ${id}`);
  return found;
}
