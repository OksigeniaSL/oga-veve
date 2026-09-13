import { FLOTA, nombreEntero } from "./flota";

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
 *
 * ## Y originales no quiere decir inventados
 *
 * Durante mucho tiempo estos números estaban «en el orden de magnitud de una
 * avioneta ligera real» y en ningún sitio decía **cuál** ni **cuáles**. Ahora
 * sí: `referencia.ts` trae el juego completo de derivadas del Navion, de la
 * NASA CR-96008, que es dominio público, y `referencia.test.ts` mide cada
 * ficha contra él.
 *
 * Lo que se compara es lo que la física manda que se parezca —el margen
 * estático, los amortiguamientos, la autoridad de los mandos por grado de
 * deflexión—; lo que la configuración manda que no se parezca, como que un ala
 * alta tenga más efecto diedro que un ala baja, queda dicho con su motivo.
 * Ver #54.
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
   *
   * **Y esos sesenta a ochenta ya no son una opinión.** El Navion de la NASA
   * CR-96008, con los recorridos de alerón de su propio certificado de tipo
   * —veinticinco arriba y diecisiete abajo, o sea veintiún grados de media—,
   * sale a **72 °/s** por esta misma fórmula. Está en el medio de la banda, y
   * la banda tiene ahora un avión de verdad detrás. Ver `referencia.ts`.
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
  /*
   * **La silueta no está aquí**, y no es un olvido: la dice la tabla de la
   * flota, `flota.ts`, junto al número y al pájaro. Estaba en los dos sitios y
   * eran dos listas que podían discrepar — un avión que en su ficha era ala
   * alta y en la flota bimotor. Una silueta, un sitio.
   */
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
  engine: "piston" | "radial" | "turboprop" | "turbofan";
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
   * Velocidad de aproximación, m/s. **Vref.**
   *
   * A la que hay que cruzar el umbral. Es el número que más veces estropea un
   * aterrizaje y el que menos se dice: rápido, el avión no quiere posarse y se
   * come la pista; lento, se cae los últimos metros.
   *
   * Va por aeronave porque **es** de la aeronave: sale de su velocidad de
   * pérdida, y una avioneta y un avión grande no se parecen en nada aquí. Un
   * número por avión es todo lo que este simulador puede sostener
   * honestamente — el de verdad depende además del peso de ese día.
   */
  approachSpeed: number;
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
  /**
   * Velocidad de rotación, m/s. **Vr.**
   *
   * La velocidad a la que se tira de los mandos para levantar el morro. Es, de
   * todas las uves, la única que un piloto de avioneta usa cada vez que vuela
   * —V1 es de aviones grandes—, y es además la que se puede enseñar sin
   * palabras: llega el momento, se marca en la pantalla, y lo que hay que
   * hacer es tirar.
   *
   * Cincuenta y cinco nudos en un 172 de verdad, que son veintiocho metros por
   * segundo. Va un par por encima de la de decisión, como en el avión real: se
   * pasa el punto de no retorno y enseguida se rota.
   */
  rotationSpeed: number;
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
 * JAZ 20 *Pykasu* — avioneta de escuela, ala alta, cuatro plazas.
 *
 * Es la aeronave de partida: estable, indulgente, entra en pérdida avisando.
 * Los números están en el orden de magnitud de una avioneta ligera real:
 * pérdida sobre 25 m/s (~49 kt) y crucero sobre 60 m/s (~117 kt).
 *
 * **Se llamaba «Óga 172»**, y eso era un problema, no un detalle: ciento
 * setenta y dos es el número de una avioneta de escuela que existe, y puesto
 * delante de un ala alta de cuatro plazas **cita** a una — exactamente la
 * asociación que este proyecto había decidido evitar, escrita en la ficha.
 * *Pykasu* es la paloma. Ver `flota.ts` y #69.
 */
export const PYKASU: AircraftConfig = {
  id: "jaz-20",
  name: nombreEntero(FLOTA[0]!),
  descriptionKey: "aircraft.pykasu.description",
  mass: 1100,
  wingArea: 16.2,
  wingSpan: 11.0,
  chord: 1.5,
  inertia: { xx: 1290, yy: 1830, zz: 2900 },
  /*
   * Empuje estático, N.
   *
   * Se probó a bajarlo a dos mil doscientos, que es la relación empuje-peso
   * de una Cessna 172 de verdad —0,19 contra el 0,24 de aquí— y **empeoró lo
   * que estaba bien**: con dos mil seiscientos la rodadura de despegue mide
   * doscientos setenta y nueve metros contra los doscientos noventa y tres
   * reales, y bajándolo el avión tardaba veinticinco segundos y medio en
   * rotar en vez de los diecinueve de verdad. Lo que está pasado no es el
   * empuje: es el ascenso justo después de rotar, y eso se arregla en cómo
   * cae el empuje con la velocidad, no aquí.
   */
  maxThrust: 2600,
  cruiseSpeed: 60,
  // 33 m/s son 119 km/h, que es la corta final de un 172 de verdad.
  approachSpeed: 33,
  decisionSpeed: 26,
  // 28 m/s son 55 nudos: la velocidad de rotación de un 172 de verdad.
  rotationSpeed: 28,
  gearHeight: 1.4,
  maxGroundPitch: 0.21, // 12°
  flapsLift: 0.55,
  flapsDrag: 0.06,
  appearance: {
    body: 0xe4e2da,
    accent: 0xbe5d38,
    trim: 0x2f5243,
    blades: 2,
  },
  sound: {
    engine: "piston",
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
    cnR: -0.1,
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
  id: "jaz-25",
  name: nombreEntero(FLOTA[1]!),
  descriptionKey: "aircraft.mainumby.description",
  mass: 1500,
  wingArea: 24.0,
  wingSpan: 12.5,
  chord: 1.7,
  inertia: { xx: 1600, yy: 2400, zz: 3600 },
  maxThrust: 5200,
  cruiseSpeed: 55,
  approachSpeed: 29,
  decisionSpeed: 24,
  rotationSpeed: 26,
  gearHeight: 1.8,
  maxGroundPitch: 0.26, // 15°: es un patín de cola, se apoya de morro arriba
  flapsLift: 0.35,
  flapsDrag: 0.05,
  appearance: {
    // Biplano de trabajo: dos alas, ocre y verde, hélice de tres palas.
    body: 0xdd923f,
    accent: 0x2f5243,
    trim: 0x8a5a34,
    blades: 3,
  },
  sound: {
    // Radial de fumigador: más cilindros, más lento y mucho más grave. Es el
    // golpeteo que uno reconoce sin verlo pasar.
    engine: "radial",
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
    oswald: 0.7,
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

/**
 * JAZ 40 *Panambi* — bimotor ligero de ala baja, seis plazas.
 *
 * El tercer peldaño de la flota y el primero con **dos motores**, que es lo
 * que enseña: una silueta con dos góndolas en el ala se reconoce a un
 * kilómetro y es de las primeras cosas que aprende a mirar quien mira aviones.
 * *Panambi* es la mariposa — dos alas grandes y vuelo tranquilo.
 *
 * ## De dónde sale cada número
 *
 * Y ésta es la diferencia con los dos primeros, que se escribieron a ojo y se
 * comprobaron después: **este avión nació con el banco delante**. Cada
 * coeficiente sale de una cuenta o de una banda medida, y las diecisiete
 * comprobaciones de `prestaciones.test.ts` lo miden entero — pérdida, crucero,
 * planeo, ascenso, carrera de despegue y los cinco modos propios.
 *
 * - **`clAlpha`** de la línea sustentadora con su propio alargamiento, 7,45:
 *   `2π/(1+2/(AR·e))` da 4,67. La cuenta está validada contra el Navion, que
 *   predice 4,38 donde el informe mide 4,44. Ver `referencia.ts`.
 * - **`cmAlpha`** de un margen estático del 16 % de la cuerda: `−0,16·clAlpha`.
 *   El Navion vuela al 15,4 % y una ligera de escuela anda entre el 10 y el 20.
 * - **`clP`** de la proporción que comparten los dos aviones de referencia:
 *   el Navion sale a `clAlpha/10,8` y el JAZ 20 a `clAlpha/10,6`. Aquí, 10,7.
 * - **`clAileron`** de la regla de la casa: `clAileron/|clP| · 2V/b` entre 60 y
 *   80 grados por segundo, que es lo que rueda una ligera — y lo que rueda el
 *   Navion con sus recorridos certificados, 72.
 * - **`cd0`** más bajo que el del JAZ 20 porque este avión mete las patas:
 *   veintiséis milésimas contra treinta y una.
 * - Los laterales, dentro de la banda de los dos de referencia. Ver la
 *   comparación de `referencia.test.ts`.
 *
 * El empuje se eligió **midiendo**: con cinco mil ochocientos newtons subía a
 * seis metros y medio por segundo, que es régimen de avión de transporte
 * ligero y no de bimotor de seis plazas. Con cinco mil, cinco.
 */
export const PANAMBI: AircraftConfig = {
  id: "jaz-40",
  name: nombreEntero(FLOTA[2]!),
  descriptionKey: "aircraft.panambi.description",
  mass: 2000,
  wingArea: 19.0,
  wingSpan: 11.9,
  chord: 1.6,
  /*
   * Las inercias, escaladas del JAZ 20 por masa y por tamaño: crecen con el
   * peso y con el cuadrado de la distancia a la que está repartido, y en un
   * bimotor parte de ese peso son dos motores **colgados del ala**, que es lo
   * que dispara la de alabeo frente a la de un monomotor del mismo peso.
   */
  inertia: { xx: 3400, yy: 4200, zz: 6800 },
  maxThrust: 5000,
  cruiseSpeed: 80,
  // 44 m/s son 1,3 veces la pérdida, que es como se cruza el umbral.
  approachSpeed: 44,
  decisionSpeed: 34,
  rotationSpeed: 37,
  gearHeight: 1.6,
  maxGroundPitch: 0.19, // 11°
  flapsLift: 0.5,
  flapsDrag: 0.07,
  appearance: {
    // Blanco de compañía con la franja de la casa: es un avión de trabajo que
    // lleva gente, y se pinta como se pintan ésos.
    body: 0xecece6,
    accent: 0x2f5243,
    trim: 0xbe5d38,
    blades: 3,
  },
  sound: {
    // Dos cuatro cilindros. Suena a avioneta pero doble, que es exactamente
    // lo que es, y el batido de los dos motores casi acompasados es la firma
    // sonora de un bimotor de pistón.
    engine: "piston",
    cylinders: 8,
    idleRpm: 700,
    maxRpm: 2600,
    growlHz: 250,
    growlRise: 300,
  },
  aero: {
    cl0: 0.25,
    clAlpha: 4.67,
    alphaStall: 0.26, // ~15°
    cd0: 0.026,
    oswald: 0.78,
    cyBeta: -0.45,
    cm0: 0.04,
    cmAlpha: -0.75,
    cmQ: -13.5,
    cmElevator: 0.46,
    clBeta: -0.075, // Ala baja: menos diedro efectivo que el JAZ 20.
    clP: -0.44,
    clAileron: 0.043, // ~70 °/s a fondo, que es lo que rueda una ligera.
    cnBeta: 0.08,
    cnR: -0.13,
    cnRudder: 0.03,
    cnAileron: -0.0025,
  },
};

/**
 * JAZ 60 *Arasunu* — turbohélice regional de cola en T, diecinueve plazas.
 *
 * El primero que no es una avioneta: pesa cinco veces lo que el bimotor y se
 * vuela con el peldaño de arriba. *Arasunu* es el trueno.
 *
 * La silueta es lo que enseña, como siempre: **la cola en T**. Un
 * estabilizador subido a lo alto de la deriva se reconoce sin saber nada de
 * aviones, y está ahí por un motivo que se puede contar — mantener la cola
 * fuera de la estela del ala y de las hélices.
 *
 * La referencia de tamaño es el **DHC-6 Twin Otter**, que #54 señala como «la
 * base defendible para el turbohélice regional» porque tiene derivadas
 * identificadas en vuelo y publicadas. No es ese avión: es de su clase, y de
 * ahí salen el peso, la envergadura y la superficie.
 *
 * Los coeficientes, por el mismo camino que el Panambi: `clAlpha` de la línea
 * sustentadora con su alargamiento —diez, que es de ala larga y por eso planea
 * tan bien—, `cmAlpha` de un margen del 17 %, `clP` de la proporción de
 * siempre, y `clAileron` de la regla de la casa. **Sesenta grados por segundo
 * y no setenta**: un avión grande rueda más despacio, y eso también se aprende.
 */
export const ARASUNU: AircraftConfig = {
  id: "jaz-60",
  name: nombreEntero(FLOTA[3]!),
  descriptionKey: "aircraft.arasunu.description",
  mass: 5600,
  wingArea: 39.0,
  wingSpan: 19.8,
  chord: 2.0,
  // Escaladas por masa y envergadura con la proporción que comparten el Navion
  // y los tres de la flota: `Ixx ≈ 0,012·m·b²`.
  inertia: { xx: 26000, yy: 32000, zz: 52000 },
  maxThrust: 14000,
  cruiseSpeed: 90,
  approachSpeed: 48,
  decisionSpeed: 38,
  rotationSpeed: 41,
  gearHeight: 2.2,
  maxGroundPitch: 0.17, // 10°: la cola en T no perdona rotar de más.
  // Flaps grandes: es lo que le permite entrar en pistas cortas, que es para
  // lo que existe un turbohélice regional.
  flapsLift: 0.65,
  flapsDrag: 0.09,
  appearance: {
    body: 0xecece6,
    accent: 0x1f4f76,
    trim: 0xdd923f,
    blades: 4,
  },
  sound: {
    engine: "turboprop",
    cylinders: 0,
    idleRpm: 900,
    maxRpm: 2000,
    growlHz: 420,
    growlRise: 260,
  },
  aero: {
    cl0: 0.3,
    clAlpha: 5.03,
    alphaStall: 0.27, // ~15°
    cd0: 0.028,
    oswald: 0.8,
    cyBeta: -0.55,
    cm0: 0.045,
    cmAlpha: -0.855,
    cmQ: -16,
    cmElevator: 0.5,
    clBeta: -0.095,
    clP: -0.47,
    clAileron: 0.054, // ~60 °/s: un avión grande rueda más despacio.
    cnBeta: 0.09,
    cnR: -0.16,
    cnRudder: 0.035,
    cnAileron: -0.003,
  },
};

/**
 * JAZ 90 *Kuarahy* — reactor de ala en flecha.
 *
 * El último peldaño de la flota y el único con turbinas. *Kuarahy* es el sol.
 *
 * Lo que enseña su silueta son dos cosas a la vez: **el ala en flecha** y los
 * motores colgados por debajo. Las dos van juntas y las dos tienen su porqué
 * —la flecha retrasa la compresibilidad, los motores bajo el ala descargan la
 * estructura y se cambian sin desmontar nada—, y las dos se reconocen de un
 * vistazo, que es la destreza del álbum.
 *
 * Y trae consigo lo que un reactor cambia de verdad, que no es la velocidad:
 * **es que todo tarda más**. El fugoide de este avión dura noventa segundos y
 * el del entrenador treinta y tres, y eso no es un número, es la sensación de
 * pilotar algo grande. El banco lo mide contra la cuenta de Lanchester, que
 * dice que el período crece con la velocidad — ver `prestaciones.test.ts`.
 *
 * ## Y todavía no vuela, porque le falta el nombre
 *
 * **No está en `AIRCRAFT`**, y no es un olvido: *Kuarahy* está en disputa. La
 * raíz ya es de *Kuarahy-memby*, la ardilla de Granja Óga, y la regla de la
 * casa —«un nombre no puede estar dos veces en el mundo de Granja Óga»— dice
 * que un nombre en disputa se queda reservado y no vuela. Es la misma
 * colisión que hizo que el biplano dejara de llamarse Kuarahy. Ver `flota.ts`
 * y #69.
 *
 * Así que el avión está entero y medido —el banco de prestaciones lo vuela
 * igual, que para eso está— y entra en la flota el día que tenga nombre. Esa
 * decisión no la toma este fichero.
 */
export const KUARAHY: AircraftConfig = {
  id: "jaz-90",
  name: nombreEntero(FLOTA[4]!),
  descriptionKey: "aircraft.kuarahy.description",
  mass: 30000,
  wingArea: 72.0,
  wingSpan: 26.0,
  chord: 3.0,
  inertia: { xx: 243000, yy: 300000, zz: 487000 },
  maxThrust: 58000,
  cruiseSpeed: 180,
  approachSpeed: 90,
  decisionSpeed: 72,
  rotationSpeed: 78,
  gearHeight: 2.8,
  maxGroundPitch: 0.16, // 9°: con un fuselaje largo, la cola llega antes.
  flapsLift: 0.7,
  flapsDrag: 0.1,
  appearance: {
    body: 0xf2f1ec,
    accent: 0xbe5d38,
    trim: 0x2f5243,
    blades: 0,
  },
  sound: {
    engine: "turbofan",
    cylinders: 0,
    idleRpm: 2000,
    maxRpm: 9000,
    growlHz: 520,
    growlRise: 700,
  },
  aero: {
    cl0: 0.18,
    // Menos que lo que daría su alargamiento: la flecha baja la pendiente de
    // sustentación, y ése es el precio que se paga por ella.
    clAlpha: 4.6,
    alphaStall: 0.26, // ~15°
    cd0: 0.02,
    oswald: 0.78,
    cyBeta: -0.6,
    cm0: 0.04,
    cmAlpha: -0.69,
    cmQ: -19,
    cmElevator: 0.45,
    clBeta: -0.07,
    clP: -0.43,
    clAileron: 0.022, // ~40 °/s, que es lo que rueda un avión de línea.
    cnBeta: 0.1,
    cnR: -0.2,
    cnRudder: 0.035,
    cnAileron: -0.002,
  },
};

export const AIRCRAFT: readonly AircraftConfig[] = [
  PYKASU,
  MAINUMBY,
  PANAMBI,
  ARASUNU,
];

/**
 * Y los que están hechos pero no vuelan, que hoy es uno.
 *
 * El banco de prestaciones los mide igual —`prestaciones.test.ts` los junta
 * con los de arriba—, porque un avión terminado tiene que estar comprobado
 * aunque le falte el rótulo. Lo que no hace es aparecer en el hangar.
 */
export const RESERVADOS: readonly AircraftConfig[] = [KUARAHY];

export function aircraftById(id: string): AircraftConfig {
  const found = AIRCRAFT.find((a) => a.id === id);
  if (!found) throw new Error(`Aeronave desconocida: ${id}`);
  return found;
}
