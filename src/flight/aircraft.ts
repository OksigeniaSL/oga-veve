import { nombreEnteroDe } from "./flota";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import type { EquipoTcas } from "./tcas";
import type { FrenosDelTipo } from "./frenada";
import type { TardaElTren } from "./tren";
import type { PiesDeLaCuenta } from "./avisos-de-altura";
import type { FichaDeHelicoptero } from "./helicoptero";

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
  /**
   * Colores del casco, del capó y de los detalles.
   *
   * El capó es más que el capó: es el material `capo` del modelo, que en la
   * librea de la casa es lo terracota —la franja del costado, y además lo que
   * la ilustración de cada avión pinta de ese color: las alas y el anillo del
   * capó del fumigador, las góndolas del JAZ 90—. Y los detalles son la raya
   * fina que acompaña a la franja. Todos salen de `LIBREA`: ver allí.
   */
  body: number;
  accent: number;
  trim: number;
  /**
   * **El color de la deriva, si no es el del capó.**
   *
   * La cola de una compañía de verdad no va del color de su franja: franja
   * de un color y cola de otro, que en la casa son el terracota y el verde.
   * Sin esto, la deriva sale del color del capó.
   */
  cola?: number;
  /**
   * **El color de los remates**: las aletas de las puntas de ala, que es
   * donde una compañía pone su color —una aleta es una cola pequeña que se ve
   * de frente y desde la ventanilla—. Lo pinta el material `remate` del
   * modelo —ver `exterior.py`—, y sin esto sale del color del capó.
   */
  remate?: number;
  /** Cuántas palas lleva la hélice. */
  blades: number;
  /**
   * **El motivo de la casa en la cola**, en los que lo llevan. Ver
   * `world/librea.ts`.
   *
   * No lo lleva toda la flota, y no por pereza: los que llevan pasaje van
   * vestidos de compañía —el sol en la deriva y la firma junto a la puerta—,
   * y una avioneta de escuela o un fumigador no se visten así en ningún sitio
   * del mundo. El `.glb` dice en qué superficie va (su material `cola`); esto
   * dice qué lleva.
   */
  motivo?: MotivoDeCola;
}

/**
 * Qué lleva la deriva.
 *
 * - `sol`: el sol solo, naciendo en la raíz. Es el de toda la flota, porque
 *   la cola de la casa es verde y en ella las hojas no se verían: la deriva
 *   misma hace de hoja.
 * - `sol-y-hojas`: el sol del logotipo entre sus dos hojas, para una cola que
 *   no fuera verde. Hoy no lo lleva ninguno; si alguien lo pide sobre una
 *   cola verde, `motivoQueSeLee` pinta el sol solo.
 */
export type MotivoDeCola = "sol-y-hojas" | "sol";

/**
 * **Los colores de la compañía**, que son los del logotipo de Granja Óga.
 *
 * El logotipo tiene tres —el ocre del sol, el terracota del tejado y el verde
 * bosque de las hojas— y con el crema del casco esa es la paleta entera de la
 * flota. El JAZ 60 y el JAZ 120 iban de azul marino, de antes de que la flota
 * llevara la librea de la casa, y se notó en cuanto la llevaron: «Granja Óga
 * no tiene azul en su logo, el avión no parece de la granja». No lo parecía.
 *
 * Cómo se reparten por el avión lo dice `LIBREA`, y **el ocre no va en
 * ninguna pieza**: es el del sol del motivo y el del logotipo, y nada más.
 * Pintado en grande —un fumigador entero, una franja, la T de una cola— el
 * ocre se lee naranja, y «el color de la granja es terracota y no naranja».
 *
 * Son los mismos que `--ocre`, `--terracota` y `--verde-bosque` de la hoja de
 * estilos, y un pelo más cálidos que los del SVG (`#db913f`, `#bd5c37`,
 * `#2e5141`): la diferencia no se ve y así hay un solo juego de valores.
 */
export const CASA = {
  ocre: 0xdd923f,
  terracota: 0xbe5d38,
  verde: 0x2f5243,
} as const;

/**
 * **La librea de la compañía: una sola para toda la flota**, la misma que
 * llevan los aviones en sus ilustraciones.
 *
 * Casco crema, cola verde y franja terracota con la raya fina en verde; y las
 * aletas de las puntas, en terracota. Así viste una compañía aérea de verdad
 * a todos sus aviones, de la avioneta al cuatrimotor.
 *
 * Antes cada avión repartía los colores a su manera —uno con la cola
 * terracota, otro entero en ocre, otro con la franja verde y la raya ocre—
 * para no confundirse con el de al lado en la fila del hangar. Puestos junto a
 * sus ilustraciones, que llevan todas la misma, no casaban: «intenta que
 * queden homogéneos, el color de la granja es terracota y no naranja». Y lo
 * que distingue a un avión de otro no es la pintura sino **la silueta** —ala
 * alta o baja, una hélice o dos, cola en T, dos motores o cuatro—, que es lo
 * que cada uno enseña y lo que se reconoce el día que se ve uno de verdad.
 *
 * Dónde va cada color lo dice el modelo, con sus materiales —ver
 * `modelos/exterior.py`—, siguiendo la ilustración de cada avión: en el
 * fumigador el terracota son las alas y el anillo del capó, y en el JAZ 90,
 * además de la franja, las góndolas. Los colores son estos en todos, y
 * `librea.test.ts` lo comprueba.
 *
 * Y un solo crema: eran tres, uno por tamaño de avión, y en la fila se veían
 * tres blancos distintos.
 */
export const LIBREA = {
  body: 0xecece6,
  accent: CASA.terracota,
  trim: CASA.verde,
  cola: CASA.verde,
  remate: CASA.terracota,
} as const;

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
  /**
   * Palas del fan o de la hélice, para el tono de una turbina.
   *
   * **Un motor de turbina no tiene cilindros**, así que los tres de la flota
   * que la llevan tenían `cylinders: 0` — y la frecuencia de encendido es
   * `vueltas × cilindros / 2`, o sea **cero hercios**. Un oscilador a cero
   * hercios no suena: el turbohélice y los dos reactores volaban sin tono de
   * motor y nadie lo apuntó porque lo que sí sonaba era el resto de capas.
   *
   * Lo que canta en una turbina es el paso de las palas: las del fan en un
   * turbofán y las de la hélice en un turbohélice. Son un dato real del motor
   * —cuarenta y seis un JT9D, veintiocho un CF34, cuatro la hélice de un
   * PT6— y con él la cuenta es la misma que la de los cilindros, solo que con
   * el número que corresponde.
   */
  palasDeFan?: number;
  idleRpm: number;
  maxRpm: number;
  /**
   * Resonancia característica en reposo, en hercios, y cuánto sube a plena
   * potencia. Es la banda en la que el oído sitúa el motor, y la única que de
   * verdad reproduce el altavoz de una tablet.
   */
  growlHz: number;
  growlRise: number;
  /**
   * **Lo que suena además del motor**: el tren, los flaps, los limpias, la
   * APU, el aire de la cabina y lo que aísla el fuselaje.
   *
   * Va aquí por la misma razón que el motor: es de este avión y de ningún
   * otro, y con ello un avión nuevo suena entero rellenando datos. Ver
   * `audio/ruidos.ts`, que es quien los lee.
   */
  ruidos: RuidosDelAvion;
}

/**
 * Lo que suena de un avión que no es el motor, dato a dato.
 *
 * Cada campo es un hecho de su clase de avión y no una preferencia de mezcla:
 * un entrenador de ala alta no lleva limpiaparabrisas ni APU, y si sonaran
 * serían la clase de mentira que este juego no se permite —un aviso sonoro
 * solo se pone en el avión que lo llevaría, y un ruido igual—.
 */
export interface RuidosDelAvion {
  /**
   * Cuánto se oye el tren al soltarse, al trabarse y con las patas al aire,
   * de 0 a 1. Cero en el tren fijo: no se mueve, no suena.
   *
   * Lo que decide si un tren es ruidoso o discreto no es su tamaño, es
   * **dónde va metido respecto a quien escucha** y cuánto aísla lo que hay en
   * medio: el de un turbohélice de diecinueve plazas se mete en las góndolas,
   * a un metro del pasaje y sin forro; el de un cuatrimotor de fuselaje ancho
   * es enorme, pero va bajo un suelo grueso y una cabina hecha para no oírlo.
   */
  tren: number;
  /**
   * Con qué se mueven los flaps: un motor eléctrico —que zumba agudo— o la
   * hidráulica —que zumba más grave y más largo—. `null` si no los lleva.
   */
  flaps: "electricos" | "hidraulicos" | null;
  /** Si lleva limpiaparabrisas. Los aviones de transporte sí; las avionetas, no. */
  limpias: boolean;
  /**
   * Si lleva APU: la turbina pequeña de la cola que da luz y aire con los
   * motores parados. Los reactores sí; este turbohélice y las avionetas, no.
   */
  apu: boolean;
  /**
   * Con qué se ventila la cabina: `packs` es el aire sangrado de los motores
   * o de la APU, el soplido que se oye al embarcar; `ventilacion`, los
   * ventiladores de un turbohélice pequeño, que solo van con motor; `nada`,
   * las tomas de aire de una avioneta, que no suenan.
   */
  aire: "packs" | "ventilacion" | "nada";
  /**
   * Cuánto aísla el fuselaje de lo de fuera, de 0 a 1: la chapa desnuda de
   * un fumigador es casi cero, el forro y el suelo de un fuselaje ancho casi
   * uno. Decide cuánto se apaga y cuánto se oscurece desde dentro lo que
   * suena fuera —el viento, la lluvia, las patas—.
   */
  aislamiento: number;
}

/**
 * Si este avión empuja con un chorro o con una hélice.
 *
 * **La diferencia manda en el empuje disponible**, y no es un matiz: una
 * hélice que ya va deprisa muerde menos aire y pierde empuje rápido con la
 * velocidad; un turbofán casi no lo pierde, porque lo que acelera es el aire
 * que él mismo traga. Con la ley de la hélice aplicada a los dos reactores, el
 * JAZ 120 necesitaba 4.404 m para irse del suelo —más que la pista más larga
 * del juego, que son los 3.516 de Mariscal Estigarribia— y el JAZ 90, 3.057.
 * O sea: no despegaban en ningún sitio.
 *
 * Un turbohélice es una turbina que mueve una hélice, así que para esto cuenta
 * como hélice: lo que decide la ley no es qué quema el motor, es qué empuja el
 * aire. Por eso la pregunta es «de chorro» y no «de turbina».
 *
 * El dato vive en el bloque de sonido porque es de donde salió —el
 * sintetizador necesita los cuatro tipos para montar sus capas— y se deriva
 * aquí en vez de copiarse: el mismo número en dos sitios es el fallo clásico
 * de esta casa.
 */
export function esDeChorro(a: AircraftConfig): boolean {
  return a.sound.engine === "turbofan";
}

/**
 * **Qué mueve la palanca de este aparato**: el gas de una hélice, el de un
 * reactor o el colectivo de un rotor. Es lo que dibujan sus botones, su tecla
 * y la palanca de la pantalla: ver `dibujoDelMotor` en `ui/pictogramas.ts`.
 *
 * Era un sí o no —reactor o hélice— hasta que llegó el helicóptero, y con dos
 * respuestas el Super Puma salía con una hélice en el colectivo.
 */
export type Propulsion = "helice" | "chorro" | "rotor";

export function propulsionDe(a: AircraftConfig): Propulsion {
  if (a.helicoptero) return "rotor";
  return esDeChorro(a) ? "chorro" : "helice";
}

/**
 * **Las vueltas del motor con el gas puesto**, en las de su ficha.
 *
 * En un motor de pistón o de hélice, en línea recta entre el ralentí y el
 * tope: el gas abre la mariposa o el combustible y las vueltas siguen. **En
 * un turbofán, no.** El gas de este juego es la parte del empuje que puede dar
 * el motor a esa altura, y el empuje de un fan crece como el cuadrado o el
 * cubo de sus vueltas; así que las vueltas son la raíz del empuje: con la
 * mitad del empuje el fan va al 80 % largo, no al 60. Es lo que se ve en
 * cualquier cabina: ralentí por el 20 %, aproximación por el 60–70 % y
 * crucero por el 85–90 %, aunque el crucero pida bastante menos de la mitad
 * del empuje. Contado por Enrique, que lo sabía: «lo real a FL290, N1 del
 * 85–90 %»; el juego marcaba 69.
 *
 * Una sola cuenta para la aguja y para el sonido: ver `regimen` en
 * `ui/cuadro.ts` y la nota del motor en `audio/audio.ts`.
 */
export function vueltasDelMotor(
  s: Pick<AircraftSound, "engine" | "idleRpm" | "maxRpm">,
  gas: number,
): number {
  const g = Math.max(0, Math.min(1, gas));
  const parte = s.engine === "turbofan" ? Math.pow(g, EMPUJE_POR_VUELTAS) : g;
  return s.idleRpm + parte * (s.maxRpm - s.idleRpm);
}

/**
 * El exponente de la raíz: dos y medio, entre el cuadrado y el cubo con que
 * crece el empuje de un turbofán con las vueltas del fan.
 */
const EMPUJE_POR_VUELTAS = 1 / 2.5;

/**
 * ¿Tiene reversa este avión?
 *
 * Los turbofanes la tienen —las compuertas que desvían el chorro hacia
 * delante— y los turbohélices también, aunque la suyą es otra cosa: la hélice
 * cambia el paso y empuja al revés, y por eso en una cabina de ATR el mando de
 * potencia baja por debajo del ralentí en vez de tener un gatillo aparte.
 *
 * **Los de pistón no.** Una avioneta para con los frenos y con la pista que
 * tenga, y esa es justamente la lección de por qué necesita menos pista y por
 * qué un 747 no puede aterrizar donde ella.
 *
 * Se decide por el motor y no por una lista, que es la misma regla con la que
 * el cuadro decide si la aguja marca RPM, par o N1. Ver `ui/cuadro.ts`.
 *
 * **Y el helicóptero tampoco**, aunque suene a turbina: sus motores mueven un
 * rotor, no una hélice que cambie de paso hacia atrás.
 */
export function tieneReversa(a: AircraftConfig): boolean {
  if (a.helicoptero) return false;
  return a.sound.engine === "turbofan" || a.sound.engine === "turboprop";
}

/**
 * **Lo que da el motor con este aire**, como fracción de lo que da al nivel
 * del mar en un día estándar: la densidad a la 0,7, la ley de los libros de
 * proyecto para el empuje de una turbina y, en primera aproximación, para la
 * potencia de un motor de pistón. Ver el ADR 0011.
 *
 * **Y el de pistón con turbo, entero hasta su altitud crítica.** Hasta ahí el
 * turbo le da el aire de nivel del mar y el motor da lo mismo; por encima, lo
 * que da cae con la densidad que le queda respecto a la de esa altura, como en
 * las curvas de su fabricante: el TSIO-360-E de la clase del JAZ 40 pasa de
 * unos 215 hp a 12.000 pies a unos 133 a 25.000 (Continental, X30583, figura
 * 2), y esta cuenta le deja dos tercios de los 200 de nivel del mar. Ver
 * `alturaCritica`.
 *
 * **Y con el aire del día**, que es lo que faltaba: el motor no sabe a qué
 * altura está, solo cuánto aire le entra, y en una tarde de calor le entra
 * menos. Ver `atmosphere.ts`.
 *
 * Vive en un solo sitio porque la preguntan tres: el modelo de vuelo, el
 * combustible del modelo sencillo y la cuenta de la carrera de despegue. Si
 * cada uno llevara la suya, la carrera que se anuncia y la que se vuela
 * dirían cosas distintas.
 *
 * El de pistón sin compresor pierde, de verdad, algo más deprisa —la ley de
 * Gagg y Farrar, `σ − (1 − σ)/7,55`, le deja el 71 % a tres mil metros donde
 * esta le deja el 81 %—. No se usa aquí: el ADR 0012 lo dejó pendiente de
 * decidir qué motor lleva el JAZ 40, y ya está decidido —el de su clase, con
 * turbo—. La avioneta y el fumigador siguen con la de todos.
 *
 * Lo que no cuenta: el calor del día también le quita al de turbo —el uno por
 * ciento cada seis grados Fahrenheit sobre la estándar de su manual—, y aquí
 * solo se sabe la densidad, no qué parte de ella es temperatura.
 */
export function loQueDaElMotor(
  ac: Pick<AircraftConfig, "alturaCritica">,
  sigma: number,
): number {
  if (ac.alturaCritica !== null) {
    const enLaCritica = airDensity(ac.alturaCritica) / SEA_LEVEL_DENSITY;
    return sigma >= enLaCritica ? 1 : Math.max(0, sigma) / enLaCritica;
  }
  return Math.pow(Math.max(0, sigma), 0.7);
}

/**
 * **La velocidad a la que la recta del empuje de una hélice llega a cero**,
 * m/s: la de su ficha, o 2,4 veces su crucero. Vive aquí y no en cada sitio
 * que cuenta el empuje porque son tres —el motor en vuelo, la carrera de
 * despegue y el ascenso de la ficha— y con una cifra en cada uno el avión
 * corría en uno lo que no corría en otro. Ver `empujeLleno`.
 */
export function velocidadSinEmpuje(
  a: Pick<AircraftConfig, "cruiseSpeed" | "heliceSinEmpujeA">,
): number {
  return a.heliceSinEmpujeA ?? 2.4 * a.cruiseSpeed;
}

/**
 * **La velocidad de pérdida con todo fuera**, m/s: por encima, el ala lleva
 * el avión; por debajo, lo llevan las ruedas.
 *
 * No hace falta otro número en la ficha: la Vref **es** 1,3 veces esta —es
 * la definición, y es como están puestas las de la flota—, así que sale de
 * ella. Sirve para saber si un avión que toca el suelo estaba rodando o
 * volando: ver `percanceAlTocar` en `percance.ts`.
 */
export function velocidadDePerdida(a: {
  readonly approachSpeed: number;
}): number {
  return a.approachSpeed / 1.3;
}

/**
 * **La presurización de un tipo**: lo que aguanta su fuselaje y si lo avisa
 * con voz.
 *
 * La cabina no se lleva a presión de suelo: el fuselaje es un globo, y cuanta
 * más diferencia entre dentro y fuera, más pesa la estructura que la aguanta.
 * Cada tipo se diseña con **un diferencial máximo**, y con él y la regla de
 * los ocho mil pies sale todo lo demás. Ver `flight/cabina-presurizada.ts`.
 */
export interface Presurizacion {
  /**
   * La diferencia de presión máxima entre la cabina y fuera, Pa. Es el número
   * de la placa del tipo, en psi en los manuales: 1 psi son 6894,76 Pa.
   */
  readonly diferencialMaximo: number;
  /**
   * **Hasta dónde deja subir la cabina el programa**, m.
   *
   * Ocho mil pies es la regla de los aviones de transporte (CS 25.841 y 14 CFR
   * 25.841), y eso es un tope, no una obligación: un fuselaje de fibra de
   * carbono aguanta más diferencia y puede llevar la cabina más baja. Por eso
   * va en la ficha y no era verdad que fuera un número para todos. Ver
   * `OCHO_MIL_PIES`.
   */
  readonly topeDeCabina: number;
  /**
   * **Si el aviso de altitud de cabina habla**: la voz de una caja que dice
   * *cabin* cuando la cabina pasa de diez mil pies.
   *
   * No lo lleva todo avión con voz en sus avisos, y por eso va aparte de
   * `avisosHablados`: la familia de Embraer lo dice con voz —«CABIN» con la
   * cabina por encima de diez mil pies, en el AOM del EMB-145—, y Boeing, en
   * el 737 y en el 747, con una bocina intermitente. Un turbohélice de
   * diecinueve plazas lleva la luz roja y nada más. Donde no habla, lo dice
   * la instructora, que es quien lo diría sentada al lado. Ver `loDiceElAvion`
   * en `audio/cabina.ts`.
   */
  readonly avisoHablado: boolean;
}

/** Un psi, en pascales: los manuales de presurización van en psi. */
export const PSI = 6894.757;

/**
 * La regla de los aviones de transporte para la cabina, m. Estaba en dos mil
 * cuatrocientos redondos; son 2438,4.
 */
export const OCHO_MIL_PIES = 8000 * 0.3048;

/**
 * **Lo que pesa este avión ahora**, kg: el de la copia con su combustible, o
 * el de la ficha si es la ficha. Es la masa que acelera, la que sostiene el
 * ala y la que frenan las ruedas. Ver `masaDeAhora`.
 */
export function masaDe(a: {
  readonly mass: number;
  readonly masaDeAhora?: number;
}): number {
  return a.masaDeAhora ?? a.mass;
}

/**
 * **Este avión con esta masa**: la misma ficha, que pesa `masa` kilos.
 *
 * Es una copia y no la ficha, así que no sirve para comparar por identidad
 * —`elQueQuepa` y la tarjeta lo hacen con las de la flota—: es para las
 * cuentas de física, que leen la masa con `masaDe`. Con la masa de la ficha
 * devuelve la ficha misma.
 */
export function conMasa(a: AircraftConfig, masa: number): AircraftConfig {
  const deLaFicha = !(masa > 0) || Math.abs(masa - a.mass) < 0.5;
  if (deLaFicha && a.masaDeAhora === undefined) return a;
  return { ...a, masaDeAhora: deLaFicha ? a.mass : masa };
}

/**
 * **Lo que frena un motor que se ha parado**, según lo que le quede delante.
 *
 * Un motor parado no es un motor que no está: sigue metido en la corriente y
 * frena. Cuánto depende de qué hace con el aire:
 *
 * - **En molinete**, la hélice o el fan giran movidos por el viento. Una
 *   hélice así, con las palas en paso fino, es un disco que se come el aire:
 *   el manual de vuelo de la FAA para bimotores (*Airplane Flying Handbook*,
 *   FAA-H-8083-3, capítulo de bimotores) cuenta que una hélice en molinete le
 *   quita a un bimotor ligero del orden de doscientos pies por minuto de
 *   subida con un motor, que es a menudo casi toda la que tiene. El fan de un
 *   turbofán en molinete frena bastante menos: la cuenta de Torenbeek
 *   (*Synthesis of Subsonic Airplane Design*, 1982, apéndice G), con la toma
 *   y la tobera de su motor.
 * - **En bandera**, las palas giradas de canto al viento y la hélice quieta:
 *   casi nada. Por eso poner en bandera es de lo primero que se hace con un
 *   motor parado en un bimotor de hélice, y por eso los turbohélices de línea
 *   lo hacen solos.
 *
 * Una hélice de paso fijo —la de una avioneta de escuela, la de un
 * fumigador— no se puede poner en bandera, y un fan tampoco: `bandera` es
 * `null`.
 */
export interface MotorParado {
  /** En molinete, m² por motor. */
  readonly molinete: number;
  /** En bandera, m² por motor, o `null` si ese motor no se puede poner. */
  readonly bandera: number | null;
  /**
   * Si la hélice se pone en bandera sola al pararse el motor: la *autofeather*
   * de los turbohélices de línea, armada para despegar. Ver `AUTOBANDERA` en
   * `flight/motores.ts`.
   */
  readonly autoBandera: boolean;
}

export interface AircraftConfig {
  id: string;
  /** Nombre visible. No se traduce: es un nombre propio. */
  name: string;
  /** Descripción corta, clave de i18n. */
  descriptionKey: string;

  /**
   * **La masa de la ficha**, kg: con la que se midieron sus prestaciones y la
   * de despegue de un vuelo típico del juego. Es la que decide en qué campo
   * cabe —ver `cabeEn`— y la que dimensiona lo que no cambia en vuelo: el
   * tren, los depósitos, si lleva pasaje.
   *
   * **La del avión que vuela es otra**: la de sin combustible más lo que lleve
   * en los depósitos, que baja al quemarlo. Ver `masaSinCombustible` y
   * `masaDe`.
   */
  mass: number;
  /**
   * **La masa sin combustible**, kg: el avión en orden de operaciones —con su
   * tripulación— y su carga, que es el pasaje con su equipaje, la bodega o lo
   * que lleve la tolva. Lo que pesa el avión que vuela es esto más lo que haya
   * en los depósitos. Ver `masaConCombustible` en `combustible.ts`.
   *
   * Pedido por Enrique, sobre cuánta pista hace falta: «como se hace en el
   * mundo real, según tipo de avión, peso, viento, etc., en cada momento».
   * La masa era la de la ficha y no bajaba al quemar (#91).
   *
   * **Cómo se ha elegido la carga**: la que deja el vuelo típico del juego
   * —la mediana de lo que se carga en todas sus rutas— con la masa de la
   * ficha, que es con la que se midió todo lo demás; o menos, si con esa
   * **algún vuelo pasaría del peso máximo al despegue de su clase** o la masa
   * sin combustible de la máxima de su clase donde se ha podido leer. Así
   * salen el JAZ 20, el JAZ 40 y el JAZ 60, entre un 5 y un 7 % por debajo de
   * su ficha en su vuelo típico. Cada ficha dice qué carga es. Lo comprueba
   * `peso.test.ts`.
   */
  masaSinCombustible: number;
  /**
   * **Lo que pesa ahora**, kg, si no es lo de la ficha. Solo lo llevan las
   * copias que hace `conMasa` —las del modelo de vuelo y las cuentas del día—;
   * las fichas de la flota, nunca. Se lee con `masaDe`.
   *
   * Va aparte y no encima de `mass` porque hay cosas que no adelgazan al
   * quemar: el tren se dimensiona con el peso de la ficha —ver
   * `resistenciaDelTren`— y los depósitos también.
   */
  readonly masaDeAhora?: number;
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
  /**
   * **Lo que cabe en los depósitos**, kg, si se ha leído de su hoja de tipo. Sin
   * decir, la proporción de su clase: ver `loQueCabe` en `combustible.ts`.
   */
  combustibleUtilizable?: number;
  /**
   * Cuántos motores lleva.
   *
   * Está en el modelo de vuelo como empuje total —lo que empuja es la suma— y
   * hace falta aparte para **la cabina**: un cuadro de mandos tiene una aguja
   * por motor, y cuatro agujas es la mitad de lo que hace que un avión grande
   * parezca un avión grande.
   */
  motores: number;
  /**
   * **Cómo llega la palanca a la profundidad**: por cables y varillas, o por
   * un ordenador. Decide qué sostiene el avión cuando quien vuela suelta la
   * palanca, y por eso qué hace la mano del teclado. Ver `flight/mano.ts`.
   *
   * - `convencionales`: la palanca mueve la profundidad y el compensador la
   *   descarga. Suelto y compensado, el avión **vuelve a la velocidad a la
   *   que se compensó**: es la estabilidad de velocidad que la norma exige a
   *   todo avión certificado —14 CFR 23.173 y 25.173: soltando poco a poco el
   *   mando, la velocidad vuelve a menos de un 10 % de la de compensación en
   *   subida, aproximación y aterrizaje—. Quitar gas lo baja a esa velocidad;
   *   ponerlo lo sube. «El gas, para subir o bajar; el morro, para la
   *   velocidad» (FAA, *Airplane Flying Handbook*, FAA-H-8083-3C).
   * - `electricos`: la palanca le pide al ordenador un cambio de trayectoria y,
   *   suelta, **el avión sostiene la trayectoria** y se compensa solo, sin
   *   estabilidad de velocidad: la ley normal de Airbus desde el A320 (FCOM,
   *   *Flight Controls — Normal Law — Pitch*) y la de los Embraer E2.
   */
  mandos: "convencionales" | "electricos";
  /**
   * **Dónde va cada motor**: su distancia al plano de simetría, en metros,
   * de izquierda a derecha y negativa a la izquierda. `[0]` en un monomotor.
   *
   * Mientras todos empujan igual da lo mismo, porque se anulan. **Con uno
   * parado es el número que manda**: el que queda empuja por un lado, el
   * parado frena por el otro, y el avión guiña hacia el parado con un par que
   * es ese empuje por esta distancia. Es lo que tiene que sujetar el timón, y
   * de ahí sale la Vmc. Ver `flight/motores.ts`.
   *
   * No es un número libre: tiene que decir lo mismo que el modelo que se
   * dibuja —`MOTOR`, `QUIEBRO` o `MOTORES` en `modelos/*.py`—, y lo comprueba
   * `motores.test.ts` leyendo el guion de cada uno.
   */
  motoresA: readonly number[];
  /**
   * **Hasta qué altura sostiene el turbo la potencia**, m, o `null` en el
   * motor que no lo lleva.
   *
   * Un motor de pistón atmosférico pierde potencia en cuanto sube, porque le
   * entra menos aire; con turbocompresor, el turbo aprieta el aire de la
   * admisión hasta la presión de nivel del mar y la potencia se queda donde
   * estaba hasta su **altitud crítica**. Por encima, el turbo ya va a fondo y
   * el motor pierde como uno atmosférico. Ver `loQueDaElMotor`.
   */
  alturaCritica: number | null;
  /**
   * **Si las hélices giran una contra otra.** Lo normal es que todas giren
   * igual, a la derecha vistas desde el asiento —«conventional, clockwise
   * rotation as viewed from the pilot's seat» (FAA, *Airplane Flying
   * Handbook*, FAA-H-8083-3C, p. 13-23)—; con `true`, las de la derecha giran
   * al revés, y el bimotor se queda **sin motor crítico**: «no engine is more
   * critical than the other» (p. 13-24). Ver `signoDelGiro` en
   * `world/giro-de-las-helices.ts`.
   */
  helicesContrarrotativas: boolean;
  /**
   * **Lo que frena un motor parado**, como área equivalente: `D = q·A`, m².
   * Ver `MotorParado`.
   */
  motorParado: MotorParado;
  /**
   * Velocidad de crucero de referencia, m/s. Sin `heliceSinEmpujeA`, modula
   * también la caída de empuje: ver `velocidadSinEmpuje`.
   */
  cruiseSpeed: number;
  /**
   * **A qué velocidad dejaría de empujar la hélice**, m/s: dónde llega a cero
   * la recta con la que `empujeLleno` hace caer el empuje de una hélice. Sin
   * decir, 2,4 veces el crucero.
   *
   * Hace falta cuando el crucero de la ficha es el de verdad y la recta, con
   * él, deja ir el avión a fondo más deprisa que el de verdad: el crucero y
   * el tope son dos números del mismo avión, y una sola cifra no puede dar
   * los dos. Ver el JAZ 40.
   */
  heliceSinEmpujeA?: number;
  /**
   * A qué altura se hace ese crucero, m.
   *
   * **La cifra de crucero de un avión es verdad arriba y no abajo**, y sin esta
   * segunda mitad la primera engaña: el peldaño de Guyrami enseñaba un avión de
   * fuselaje ancho que no pasaba de quinientos por hora, «cuando ese pájaro pasa
   * de los 800». Los dos números son del mismo avión —quinientos a ras de suelo,
   * ochocientos a once kilómetros— y lo que faltaba era la altura a la que se
   * cumple el segundo. Ver `punta` en `arcade.ts`.
   */
  alturaDeCrucero: number;
  /**
   * **Con qué reglas vuela**: mirando por la ventana o por instrumentos.
   *
   * No es una preferencia, es lo que el avión puede hacer. La avioneta de
   * escuela y el fumigador vuelan con reglas visuales —ni llevan con qué
   * volar dentro de una nube ni una licencia de escuela ni una de
   * fumigación lo piden—, y su techo queda por debajo de lo que la regla de
   * los vuelos por instrumentos pide entre las islas del oeste: el Teide más
   * seiscientos metros. Lo que hacen de verdad es ir por la costa, a la
   * altura que se pueda. El bimotor, el turbohélice y los reactores vuelan
   * por instrumentos, que es como vuela todo el que lleva pasaje.
   *
   * Cambia el plan: el margen sobre el relieve y el medio nivel del crucero.
   * Ver `MARGEN_VISUAL` en `ruta.ts` y `MEDIO_NIVEL` en `nivel-de-crucero.ts`.
   */
  reglasDeVuelo: "visual" | "instrumentos";
  /**
   * **Cómo va soplada la cabina**, o `null` si no va.
   *
   * No es un detalle de ficha: **es lo que decide a qué altura puede ir la
   * gente de dentro**. Por encima de unos tres mil metros el aire ya no da
   * para ir mucho rato sin oxígeno, y un avión sin presurizar que sube más
   * lo lleva en botellas; uno presurizado cruza a once mil con la cabina por
   * debajo de dos mil quinientos. Es la misma razón por la que sus
   * `alturaDeCrucero` son las que son.
   *
   * Ver `flight/cabina-presurizada.ts`, que es donde se convierte en la
   * altitud de cabina que se lee en el cuadro, y `Presurizacion`.
   */
  presurizacion: Presurizacion | null;
  /**
   * **Lo que frenan los aerofrenos abiertos del todo**: lo que suman al
   * coeficiente de resistencia. `null` en el que no los lleva.
   *
   * Son los paneles que se levantan encima del ala para frenar en el aire, y
   * los llevan los reactores: un ala limpia de avión de línea planea
   * diecisiete a uno, y sin algo que frene no hay forma de bajar deprisa sin
   * pasarse de velocidad. Es la mitad de la maniobra del descenso de
   * emergencia —ver `flight/despresurizacion.ts`— y la otra mitad es el gas al
   * ralentí.
   *
   * Los de hélice de esta flota no los llevan, y es verdad de su clase: ni un
   * turbohélice de diecinueve plazas ni una avioneta. Ellos frenan con la
   * hélice al ralentí, que ya frena mucho, y con el tren.
   *
   * **En el aire levantan resistencia y nada más.** En el avión de verdad
   * también quitan algo de sustentación, y el ala la recupera con un poco más
   * de ángulo; eso en vuelo aquí no está, y lo que se nota —cuánto más deprisa
   * se baja— sale igual. **En tierra es al revés**: lo que importa es la
   * sustentación que matan. Ver `frenosDeTierra`.
   */
  aerofrenos: number | null;
  /**
   * **Los frenos de tierra**: los mismos paneles, todos y del todo, al tocar.
   * `null` en el que no los lleva.
   *
   * En vuelo, la palanca saca solo los paneles de fuera y a medias —el tope de
   * vuelo—; en tierra se levantan todos hasta arriba, y para lo que sirven no
   * es tanto para frenar con el aire como para **matar la sustentación**: un
   * reactor que toca a su Vref con los flaps de aterrizaje todavía lleva en el
   * ala las tres cuartas partes de su peso, y una rueda que no carga no frena.
   * Con los paneles arriba el peso pasa a las ruedas y los frenos muerden. Por
   * eso se arman antes de aterrizar y salen solos al tocar.
   *
   * - `resistencia`: lo que suman al coeficiente de resistencia, del todo
   *   arriba. Un panel de un 15 % de cuerda en la mitad de la envergadura,
   *   levantado a cincuenta o sesenta grados, es una placa contra el aire: del
   *   orden de siete centésimas sobre el ala entera, unas tres veces lo que
   *   frenan en el tope de vuelo.
   * - `sustentacion`: la parte de la sustentación del ala que se pierde, del
   *   todo arriba. Rompen la corriente encima de los flaps, que es donde está
   *   casi toda la sustentación de más; se quedan las raíces y las puntas.
   *
   * Ver `flight/frenada.ts` y `flight/palanca-de-aerofrenos.ts`.
   */
  frenosDeTierra: { resistencia: number; sustentacion: number } | null;
  /**
   * **Cómo frenan sus ruedas.** Ver `FrenosDelTipo` en `flight/frenada.ts`.
   *
   * No es el mismo número para los seis, y no lo era: un freno de avioneta
   * sin antideslizante, uno de carbono con antideslizante modulado y las
   * dieciséis ruedas de un cuatrimotor frenan distinto, y frenan distinto en
   * mojado sobre todo.
   */
  frenos: FrenosDelTipo;
  /**
   * **Si lleva autofreno**: el selector LO, MED y MAX que se arma antes de
   * aterrizar. Los dos reactores, como cualquier avión de línea; ni el
   * turbohélice de diecinueve plazas ni las avionetas lo llevan.
   */
  autofreno: boolean;
  /**
   * **Qué cantos de la carrera de aterrizaje dice quien no vuela**, o `null`
   * si ninguno.
   *
   * Los dice quien vigila (PM) al tocar, y cada fabricante tiene los suyos:
   * no son de una caja, son del procedimiento de la tripulación, y suben por
   * la escalera como «V one» o «gear up». Ver `contarLaCarrera` en `game.ts` y
   * `DE_LA_CARRERA` en `audio/cabina.ts`.
   *
   * - `boeing`: los del procedimiento normal de Boeing, *Landing Roll* —
   *   «speedbrakes up» o «speedbrakes not up» y «sixty knots»—. Los canta el
   *   JAZ 120, de la clase del 747. Fuente: el FCOM del 747-400, NP.21.53.
   * - `embraer`: los de los E-Jets, que en la carrera no cantan nada: el SOPM
   *   de Embraer (3-40) pone acciones —mirar los ground spoilers, la reversa
   *   y la velocidad— y ningún canto. Es el JAZ 90, de la clase del E170. Ver
   *   `CANTOS_DE_LA_CARRERA` en `audio/cabina.ts`.
   * - `null` en los demás. En los de hélice no hay nada que cantar de esto:
   *   unas llamadas de memoria, o las de otro fabricante, serían enseñar algo
   *   que luego habría que desaprender.
   */
  cantosDeLaCarrera: "boeing" | "embraer" | null;
  /**
   * **Qué TCAS lleva, si lleva alguno.** `null` si ninguno.
   *
   * El TCAS es el aparato que escucha los transpondedores de los aviones de
   * alrededor, los pinta en la pantalla de navegación y avisa —*traffic,
   * traffic*— cuando uno se acerca de verdad. Y no lo lleva todo el mundo: lo
   * lleva quien la norma obliga a llevarlo, que es justo lo que hay que poder
   * reconocer el día que se suba uno a una cabina.
   *
   * - **TCAS II** en los reactores y en el turbohélice. La OACI obliga a
   *   llevar ACAS II a todo avión de turbina de más de 5 700 kg o con más de
   *   diecinueve pasajeros (Anexo 6, parte I; en Europa, Reglamento
   *   1332/2011). Da el aviso de tráfico y además la maniobra para apartarse,
   *   el RA. El JAZ 60 pasa la raya por el peso: es un Beech 1900D de 7.766
   *   kg. Con los 5.600 del Twin Otter se quedaba debajo, y llevaba el TCAS I.
   * - **TCAS I**, ninguno ahora. Es el que exige la norma de EE. UU. para los
   *   de turbina de pasaje de diez a treinta plazas por debajo de esa raya
   *   (14 CFR 135.180), y **solo avisa** —el tráfico, dónde y a qué altura—
   *   sin dar maniobra.
   * - **Ninguno** en la avioneta de escuela, el fumigador y el bimotor de
   *   pistón. Ninguna norma se lo pide y ninguno lo lleva de serie: en ellos
   *   el tráfico se busca por la ventanilla y se oye por la radio.
   *
   * Fuente de los dos primeros: *Introduction to TCAS II Version 7.1*, FAA,
   * 2011, y la guía ACAS II de EUROCONTROL. Ver `flight/tcas.ts`.
   */
  tcas: EquipoTcas | null;
  /**
   * **Si lleva avisos que hablan**: el radioaltímetro que canta la altura en
   * la toma, el avisador de terreno (GPWS o TAWS) y el de pérdida con voz.
   *
   * Es lo que decide si en el peldaño de cabina se oye «five hundred… fifty…
   * ten», «terrain, pull up» o «stall, stall», y la regla es la de la casa:
   * un aviso sonoro solo se pone en un avión que lo llevaría. Ver
   * `DE_LOS_AVISADORES` en `audio/cabina.ts`.
   *
   * - **Sí**, el turbohélice de diecinueve plazas y los dos reactores. El TAWS
   *   de clase A es obligatorio en todo avión de turbina con seis asientos de
   *   pasaje o más (14 CFR 135.154), y el de un avión de línea lleva además
   *   la cuenta de altura del radioaltímetro.
   * - **No**, la avioneta de escuela, el fumigador y el bimotor de pistón.
   *   Ninguna norma se lo pide y no lo llevan: en ellos la altura se mira en
   *   el altímetro, la pérdida la avisa una bocina y quien canta la toma es
   *   la persona sentada al lado. En el juego, la instructora.
   */
  avisosHablados: boolean;
  /**
   * **Los números que canta su radioaltímetro en la toma**, en pies, o `null`
   * en el avión sin caja que los cante.
   *
   * No hay una cuenta para todos: los números son un menú del avisador de
   * terreno, y cada tipo —y cada operador— lleva la suya. Aquí va la de su
   * clase, con la fuente al lado de cada avión, y solo lo que la fuente dice:
   * un número que su clase no canta no se canta. Ver `laCuentaDe` en
   * `flight/avisos-de-altura.ts`.
   */
  cuentaDeLaToma: readonly PiesDeLaCuenta[] | null;
  /**
   * **Si esa cuenta se canta solo sin ILS delante**, en las aproximaciones de
   * no precisión.
   *
   * Es la del avión cuya cuenta no sale de su manual sino de la norma del
   * TAWS, que la pide así: «Descent of the airplane to 500 feet above the
   * terrain or nearest runway elevation (voice callout "Five Hundred") during
   * a non-precision approach» (FAA, AC 23-18, 2000, §3.d, sobre el
   * TSO-C151a). Con un ILS delante esa norma no pide nada, y cantarlo ahí es
   * enseñar una llamada que ese avión no tiene por qué dar. Ver `soloSinIls`
   * en `flight/avisos-de-altura.ts` y `tieneIls` en
   * `world/sendas-publicadas.ts`.
   */
  cuentaSoloSinIls: boolean;
  /**
   * **Si su avisador canta *minimums*** al llegar a la altura de decisión.
   *
   * No es de las llamadas que pide la norma del TAWS sino de las que elige
   * quien lo instala —«Altitude Call Outs "Approaching Minimums," or other
   * features not required by TSO-C151a» (FAA, AC 23-18, 2000, §7.o.(8))—,
   * así que va con la fuente de su clase o no va. Sin ella, a la altura de
   * decisión lo dice quien va sentado al lado, que es la instructora. Ver
   * `loDiceElAvion` en `audio/cabina.ts`.
   */
  cantaLosMinimos: boolean;
  /**
   * **Cómo se oscurecen las ventanillas del pasaje**, o `null` sin pasaje.
   *
   * - `persiana`: la de siempre, de plástico, que sube y baja cada uno con la
   *   mano. Para despegar y aterrizar se sube —se la pide la tripulación—, y
   *   en crucero se baja quien quiera.
   * - `electrocromica`: sin persiana; el cristal se oscurece con un botón, en
   *   cinco pasos. Es la del 787 y la del 777X, los de largo radio de esta
   *   generación. Para despegar y aterrizar **la tripulación las aclara todas
   *   a la vez** desde su panel, y el pasajero no puede cambiarlas.
   *
   * El porqué de las dos cosas es el mismo: que se vea fuera si pasa algo —un
   * motor, fuego— y que los ojos estén hechos a la luz de fuera si hay que
   * salir. No se explica en cada vuelo; se ve pasar. Ver
   * `world/cabina-de-pasaje.ts`.
   */
  ventanillas: "persiana" | "electrocromica" | null;
  /**
   * **Cómo va el pasaje por dentro, si no es de un pasillo.** Solo lo dice el que
   * tiene su cabina hecha: el JAZ 110, tres, tres y tres con dos pasillos y una
   * pantalla en cada respaldo. El JAZ 120 también tiene dos pasillos de verdad,
   * pero su cabina no está dibujada, y por no decirlo se queda como estaba. Ver
   * `world/cabina-333.ts`.
   */
  disposicionDelPasaje?: "3-3-3";
  /**
   * **El ala que se dobla**, en el avión cuya ala se ve doblarse desde la
   * ventanilla; sin poner, en los demás.
   *
   * Pedido por Enrique, que ha volado mucho de pasajero: «en los grandes y
   * modernos, el ala que se dobla vista desde la ventanilla mientras dentro
   * casi no se nota». En vuelo las puntas suben con la carga y en tierra
   * caen; con las ráfagas se doblan de más y oscilan.
   *
   * - `porG`: cuánto sube la punta por cada g de carga, m, desde como está en
   *   tierra parado, que es como la dibuja el modelo.
   * - `hz`: la frecuencia de su primer modo de flexión, con la que oscila.
   *
   * La cifra que hay publicada es la del 787: en el ensayo de carga última de
   * 2010 sus puntas subieron **unos 7,6 m (25 pies) al 150 % de la carga
   * máxima** (Boeing, 28-3-2010); con la carga límite de un avión de
   * transporte, 2,5 g (14 CFR 25.337), eso es 7,6 / 3,75 = **2,03 m por g**,
   * un 6,7 % de su semienvergadura de 30,06 m. Es del mismo orden que la que
   * dan la NASA y Boeing para un ala así en crucero, alrededor del 10 % de la
   * semienvergadura (Nguyen et al., AIAA Aviation 2014), que no dice desde qué
   * forma la mide; se toma la del ensayo, que sí lo dice.
   *
   * Para el A320 y el 747 no hay cifra publicada que se pueda citar, así que
   * se escala desde esa con la cuenta de una viga: con la misma deformación en
   * la raíz y el mismo espesor relativo, la flexión partida por la
   * semienvergadura va con el alargamiento (`δ/L ∝ L/h ∝ b²/S`). El del 787,
   * alrededor de diez. Ver `flexionEscalada` en `world/ala-que-se-dobla.ts`,
   * que es donde se comprueba la cuenta.
   *
   * Las frecuencias, en la horquilla que da Airbus para el primer modo de
   * flexión del ala de un avión de línea, «generalmente entre 1,1 y 1,5 Hz»
   * (patente US 8.649.919 B2, 2014): el ala corta, en el extremo rígido; la
   * larga, en el blando.
   */
  alaQueSeDobla?: { readonly porG: number; readonly hz: number };
  /**
   * **Vmo**: velocidad indicada máxima, en nudos.
   *
   * Es un límite de **estructura**: lo que aguanta un fuselaje es presión
   * dinámica, y eso es justo lo que mide el anemómetro. Manda abajo, donde el
   * aire es denso. Ver `flight/limites.ts`.
   */
  vmoKt: number;
  /**
   * Lo más rápido que se puede ir **con el tren fuera**, en nudos indicados.
   *
   * Es un límite distinto del de la estructura entera y mucho más bajo: unas
   * compuertas y unas patas metidas en la corriente aguantan bastante menos
   * que el fuselaje. En un avión de línea son unos doscientos setenta nudos
   * contra los trescientos sesenta y cinco del avión limpio.
   *
   * Existe porque el juego ya enseña la mitad de esta lección —el tren frena—
   * y le faltaba la otra mitad: **el tren también se rompe**. Ir a trescientos
   * con las patas fuera no es solo ineficiente, es pasarse de lo que aguantan.
   *
   * En los que no lo meten no hay límite que dar: sus patas están calculadas
   * para todo su rango. Ver `trenRetractil`.
   */
  vleKt: number;
  /**
   * **La VFE de cada muesca de flaps**, en nudos indicados: lo más rápido que
   * se puede ir con los flaps en esa posición.
   *
   * Una cifra por muesca **sacada**, en el orden de `muescasDeFlaps` sin su
   * cero —recogidos no hay tope de flaps—; vacía en el que no los lleva. La
   * última es la de aterrizaje y es siempre la más baja.
   *
   * **Era un solo número, y un solo número mentía.** Con el JAZ 90 a ciento
   * setenta y tres nudos y la primera muesca, la instructora pedía
   * recogerlos: su único tope era el de los flaps de aterrizaje. En un avión
   * de verdad los topes van en una placa de la cabina, uno por posición, y la
   * primera de un reactor de ese tamaño aguanta doscientos cincuenta: es un
   * flap que apenas baja y casi todo sale hacia atrás. Solo la de aterrizaje
   * obliga a ir despacio.
   *
   * Cada ficha lleva la placa del tipo real cuyas muescas copia, y la fuente
   * al lado. Donde el avión de verdad no tiene una muesca intermedia, la placa
   * se lee **por grados**, que es como están escritas: «de diez a treinta,
   * ochenta y cinco» vale para la de veinte. Ver `vfeEn` en `limites.ts`.
   */
  vfePorMuesca: readonly number[];
  /**
   * **Si sube los flaps solo cuando se pasa de su tope**: el alivio de carga
   * de los flaps, *flap load relief*.
   *
   * Lo llevan los reactores de línea. En el 737, con los flaps de aterrizaje
   * y la velocidad un nudo por encima de su placa, los flaps suben a la muesca
   * anterior **sin que la palanca se mueva**, y vuelven a bajar solos en
   * cuanto la velocidad cae por debajo; el 747-400 hace lo mismo con sus dos
   * últimas posiciones. Es el avión protegiéndose de quien se pasa, que es
   * justo la consecuencia que hay que enseñar: no se rompe nada, pero el
   * avión deja de hacer lo que se le pidió hasta que se le pide bien.
   *
   * Una avioneta no lo lleva: sus flaps los mueve un motor eléctrico y nadie
   * vigila la velocidad por ella. Ahí la consecuencia es otra —ver
   * `flight/carga-de-flaps.ts`—.
   */
  alivioDeFlaps: boolean;
  /**
   * **Mmo**: el Mach máximo.
   *
   * Es un límite **aerodinámico** —por encima, el aire se comprime sobre el ala
   * y el avión hace cosas feas— y manda arriba, donde el frío baja la velocidad
   * del sonido. En una avioneta de hélice no se alcanza jamás y va puesto de
   * todas formas: la ficha dice lo que es el avión, no lo que le va a pasar.
   */
  mmo: number;
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
   * **A qué se vuela el circuito de tráfico**, m/s.
   *
   * No es la de crucero ni la de aproximación: es la de ir despacio y
   * configurado alrededor de una pista, con los flaps del viento en cola
   * fuera. Faltaba, y sin ella nadie decía a qué se vuela la vuelta: el
   * piloto del banco subía con el gas a tope y hacía el viento en cola de
   * Los Rodeos con el JAZ 90 a doscientos treinta nudos, que viran con tres
   * kilómetros de radio, y se metía en las estribaciones de Anaga. Ningún
   * circuito dibujado aguanta eso, y ningún piloto de verdad lo vuela así.
   *
   * Las dos cotas son de verdad:
   *
   * - **Por arriba, el tope de su categoría** en PANS-OPS (OACI, Doc 8168):
   *   la categoría sale de la velocidad a la que se cruza el umbral —A por
   *   debajo de 91 nudos, B hasta 120, C hasta 140, D hasta 165— y el
   *   circuito visual no pasa de 100, 135, 180 y 205 nudos respectivamente.
   *   Y nunca por encima de la VFE de los flaps de aterrizaje —la última de
   *   `vfePorMuesca`—, que el circuito se vuela con flaps.
   * - **En la práctica, bastante menos**: el viento en cola de un avión de
   *   línea se vuela a la de maniobra de sus flaps intermedios, que en los
   *   manuales de los fabricantes queda treinta o cuarenta nudos por encima
   *   de Vref; el de una avioneta de escuela, a los ochenta y pico nudos de
   *   siempre.
   *
   * Un número por avión, como la Vref, y con el mismo motivo: el de verdad
   * depende del peso de ese día. Lo sujeta `velocidad-de-circuito.test.ts`.
   */
  velocidadDeCircuito: number;
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
  /**
   * **De la rodadura a la distancia de despegue**, la de su manual, si lo
   * publica con las dos cifras al lado. Sin ella, la de su clase: ver
   * `deRodarADespegar` en `carrera.ts`.
   */
  readonly deRodarADespegar?: number;
  /**
   * La batalla: del tren de morro al principal, en metros.
   *
   * **Es lo que decide cómo gira en el suelo**, y no estaba. El radio de un
   * avión rodando sale de la misma geometría que el de un coche —`R = batalla /
   * tan δ`—, así que con la misma cuenta para los seis, un 747 giraba igual que
   * una avioneta: medido, los seis daban 45°/s con un tercio de palanca y
   * radios de 5,6 a 8,5 metros, el de fuselaje ancho incluido, y a fondo
   * pivotaban a 72°/s clavándose en el sitio.
   *
   * Con la batalla de cada uno, el radio y el ritmo salen correctos solos y no
   * hace falta ningún tope escrito a mano. Los números son los publicados de su
   * clase: 1,65 m un 172, 7,21 un Beech 1900D, 11,5 un E-170, 25,6 un 747. El
   * biplano es de rueda atrás y su batalla se mide del principal a la de cola,
   * que es lo que gobierna su giro.
   *
   * Ver `esteGiro` en `fdm.ts`.
   */
  batalla: number;
  /** Distancia del centro de gravedad al tren, m. */
  gearHeight: number;
  /**
   * **Por dónde apoya el avión al levantar el morro en el suelo**: cuánto va
   * por detrás del centro de gravedad el eje de la rueda principal de más
   * atrás, m.
   *
   * Un avión que rota gira sobre esas ruedas, que se quedan en el asfalto, y
   * su centro de gravedad **sube**. El modelo de vuelo lo giraba sobre el
   * centro de gravedad a `gearHeight` del suelo, así que al levantar el morro
   * las ruedas de atrás se hundían en la pista: el 787 a sus 9,7°, 0,38 m,
   * medido en el juego; el 747 a sus 12,5°, 0,77 sobre su dibujo colocado
   * como lo coloca el juego, porque apoya en el bogie de la panza, cuatro
   * metros por detrás. Ver `alturaSobreLasRuedas` en `flight/apoyo.ts`.
   *
   * **Es la del dibujo**, `modelos/*.py`, que pone el tren donde lo tiene su
   * tipo, y `apoyo.test.ts` la compara con el `.glb`. No sale de `batalla` por
   * `CARGA_EN_EL_MORRO`, que da el brazo con el que el peso carga las ruedas
   * principales —ver `momentoDelTren` en `fdm.ts`— y no dónde apoyan: en un
   * bogie, el eje de atrás va medio bogie por detrás de su centro, y el 747
   * apoya en el de la panza, no en el centro de los cuatro.
   *
   * **Negativo en el de rueda de cola**: sus principales van por delante del
   * centro, que es lo que lo sienta en la de cola. Ver `actitudEnTresPuntos`.
   */
  mainWheelsAft: number;
  /**
   * **Lo que va por detrás del centro de gravedad el centro del tren
   * principal**, m: el brazo con el que su peso carga esas ruedas, que es el
   * par que el timón tiene que vencer para levantar el morro. Ver
   * `brazoDelTren` en `flight/apoyo.ts`.
   *
   * Sin decir, `mainWheelsAft`: con un eje por pata, el apoyo y el centro son
   * el mismo punto. Hace falta en un bogie, que apoya en su eje de atrás y
   * carga en su centro, y en el 747, cuyas cuatro patas reparten el peso entre
   * las del ala y las de la panza. Sale del dibujo, como `mainWheelsAft`; y
   * con ella la carga de la rueda de morro, que es este brazo partido por la
   * batalla.
   */
  mainGearAft?: number;
  /**
   * **La actitud en tres puntos**, rad: el cabeceo con las principales y la
   * rueda de cola en el suelo y el avión parado. Solo la lleva el de rueda de
   * cola, y con ella el modelo de vuelo lo sienta en la de cola —ver
   * `momentoDelTren` en `fdm.ts`— y lo coloca así al ponerlo en el suelo.
   *
   * Es también su `maxGroundPitch`: más allá, la cola no baja.
   */
  actitudEnTresPuntos?: number;
  /**
   * Si el tren se mete.
   *
   * No lo lleva todo el mundo, y esa es media lección: meter las patas cuesta
   * peso, piezas y averías, y por debajo de cierta velocidad no compensa. Un
   * entrenador de escuela y un fumigador las llevan al aire a propósito.
   * Ver `flight/tren.ts`.
   */
  trenRetractil: boolean;
  /**
   * A cuánto sobre el suelo se mete el tren, m. `null` si no se mete.
   *
   * **Y esto es por tipo, no un número para todos**, que es como estaba: una
   * constante de trescientos metros en `game.ts` con la explicación de que es
   * «la altura a la que un despegue deja de poder volver a la pista». El
   * razonamiento es bonito y mezcla dos cosas distintas — la altura del viraje
   * imposible y el momento de meter el tren— y no es lo que se hace en ningún
   * avión.
   *
   * Lo que se hace, y es lo que hay que poder reconocer el día que se vea de
   * verdad:
   *
   * - **Transporte** —turbohélice y reactores—: «positive rate, gear up». El
   *   tren entra a los pocos segundos de despegar, en cuanto el variómetro
   *   dice que se sube. Un avión de línea no vuela trescientos metros con las
   *   patas fuera: sobrepasaría su propia velocidad de tren.
   * - **Avioneta retráctil**: cuando ya no queda pista donde posarse delante.
   *   Es la regla que se enseña en escuela, y son decenas de metros, no
   *   cientos: mientras haya asfalto por delante el tren es un seguro, y en
   *   cuanto no lo hay pasa a ser un lastre.
   *
   * Y por eso no es el mismo número: un JAZ 40 sale de una pista corta y
   * pasa un buen rato con pista debajo; un reactor se va de la suya en
   * segundos.
   */
  meteElTrenA: number | null;
  /**
   * **Lo que tarda el tren en salir y en entrar**, s; `null` en el de tren
   * fijo.
   *
   * Eran diez segundos para todos y en los dos sentidos, puestos largos a
   * propósito «para que se note que tarda». Y eso enseñaba un avión que no
   * existe: el bimotor de pistón tardaba lo de un avión de línea, y quien lo
   * vuela lo notó —«tarda mucho en ponerse y quitarse; creo que en los
   * aviones tarda poco»—. Lo que hay que aprender, que el tren se pide antes
   * de necesitarlo, ya lo enseña el estado de en medio del cuadro mientras se
   * mueve; no hace falta alargarlo.
   *
   * Dos números y no uno porque son dos maniobras: al salir ayudan el peso y
   * el aire, y al entrar los dos están en contra. Donde el manual de la clase
   * da una sola cifra para las dos, se pone la misma en las dos. Cada ficha
   * dice de dónde sale la suya. Ver `mueveElTren` en `flight/tren.ts`.
   */
  tardaElTren: TardaElTren | null;
  /**
   * Cabeceo máximo con las ruedas en el suelo, rad. Lo impone la geometría
   * del tren: más allá, la cola toca. Sin este límite el avión rota hasta
   * ponerse de pie en la pista y se queda en pérdida sin llegar a despegar.
   */
  maxGroundPitch: number;
  /**
   * Y cuánto puede bajar el morro con las ruedas en el suelo, rad. Negativo.
   *
   * **También por avión, que era un número para todos.** Había un `-0.035`
   * suelto en el modelo de vuelo —dos grados— mientras el tope de morro arriba
   * sí salía de la ficha. Dos grados en una avioneta de ocho metros son diez
   * centímetros de pata; en un reactor de treinta y uno, **treinta y siete**, y
   * eso no es una pata comprimiéndose: es la rueda de morro dentro del
   * asfalto. Medido con el avión parado en Tenerife Sur: el JAZ 90 hundido
   * 0,37 m y el JAZ 120, 0,20.
   *
   * Con las tres ruedas apoyadas, la actitud de un avión de tren triciclo la
   * fija su geometría y no se puede elegir. Lo único que da algo de juego es
   * **la pata de morro comprimiéndose al frenar**, y eso es un palmo largo de
   * recorrido, no dos grados.
   *
   * Así que el número sale de una cuenta y no de un gusto: el recorrido que se
   * le admite a la pata, partido por lo que la rueda de morro está adelantada
   * respecto al centro. Cuanto más largo el avión, menos grados — que es justo
   * lo contrario de tratarlos a todos igual.
   */
  minGroundPitch: number;
  /**
   * **Si lleva flaps.**
   *
   * Casi todos, y no todos: un biplano fumigador de esta clase lleva alerones
   * en sus dos alas y nada más. Donde no los hay no hay palanca, ni botón, ni
   * reloj, ni regla en el cuadro, ni el tutor los pide —igual que el tren
   * fijo no lleva palanca de tren, ver `trenRetractil`—: un mando que se
   * pulsa y no mueve nada en el ala enseña que los mandos son decoración, y
   * un reloj que marca diez grados con el ala quieta enseña que los relojes
   * mienten.
   */
  llevaFlaps: boolean;
  /**
   * Sustentación y resistencia extra con flaps a tope. Cero en el que no los
   * lleva: no hay nada que las dé.
   */
  flapsLift: number;
  flapsDrag: number;
  /**
   * **Los grados de los flaps en cada muesca de la palanca**, empezando por el
   * cero de recogidos. Una cifra por muesca —ver `DETENTES`—, o ninguna en el
   * que no los lleva.
   *
   * No son los mismos en toda la flota, y por eso están aquí: el primer tope
   * de un reactor son cinco grados casi sin ángulo —el flap sale hacia atrás
   * por sus carriles— y el de una avioneta son diez. La regla de flaps del
   * cuadro los rotulaba 0, 10, 20 y 30 para los seis, y eso en un avión de
   * línea era enseñar un tope que no tiene.
   *
   * Tienen que decir lo mismo que las `muescas` del modelo —ver
   * `flaps_moviles` en `modelos/exterior.py`—, y lo comprueba
   * `world/flaps-del-modelo.test.ts` leyendo el `.glb`.
   */
  muescasDeFlaps: readonly number[];
  /**
   * **Lo que tardan los flaps de arriba abajo**, en segundos.
   *
   * La palanca va de un golpe; los flaps, no. Los de una avioneta los mueve un
   * motor eléctrico pequeño y tardan unos segundos por muesca; los de un avión
   * de línea son hidráulicos, más grandes y con carriles más largos, y tardan
   * bastante más. Es la lección del tren otra vez: **se piden antes de
   * necesitarlos**. Ver `flight/flaps.ts`.
   */
  tardanLosFlaps: number;

  appearance: AircraftAppearance;
  sound: AircraftSound;
  aero: AeroCoefficients;
  /**
   * **Y si es un helicóptero, la ficha de su rotor.** Con ella el juego vuela
   * el modelo del helicóptero y no el de los aviones, y dibuja su silueta; lo
   * de ala de esta ficha queda solo para lo que el juego pregunta por debajo
   * —la escala de la cámara, el depósito— y va puesto para que no estorbe. Ver
   * `flight/helicoptero-en-el-juego.ts` y el ADR 0026.
   */
  helicoptero?: FichaDeHelicoptero;
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
  name: nombreEnteroDe("jaz-20"),
  descriptionKey: "aircraft.pykasu.description",
  mass: 1100,
  /*
   * **743 kg de avión y 221 de gente**: el peso en vacío estándar del 172R
   * —1.639 lb en su manual de vuelo— con la instructora, quien vuela y una
   * criatura detrás. Con más, el vuelo más largo que tiene en el juego
   * —Estigarribia a Pettirossi, 147 kg de combustible— pasaría de las 2.450 lb
   * de su peso máximo, que es lo que le pasa a un 172 de verdad: con cuatro
   * adultos no se llenan los depósitos.
   */
  masaSinCombustible: 964,
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
  motores: 1,
  // Cables y varillas, como toda avioneta de escuela: compensada, vuelve a su
  // velocidad. Ver `mandos`.
  mandos: "convencionales",
  motoresA: [0],
  alturaCritica: null,
  helicesContrarrotativas: false,
  /*
   * La hélice de paso fijo de una avioneta de escuela, de un metro noventa: un
   * disco que en molinete frena como el del bimotor, y que no se puede poner
   * en bandera. Solo cuenta si algún día se para en el aire: ver `sin-motor.ts`.
   */
  motorParado: { molinete: 0.3, bandera: null, autoBandera: false },
  cruiseSpeed: 60,
  /*
   * Tres mil metros: un monomotor de escuela sin presurizar cruza entre dos mil
   * quinientos y tres mil quinientos, y por encima el motor atmosférico se
   * queda sin aire.
   */
  alturaDeCrucero: 3000,
  reglasDeVuelo: "visual",
  presurizacion: null,
  aerofrenos: null,
  /*
   * **Frenos de disco de avioneta, sin antideslizante.** Tres décimas y media
   * en seco con el pie a fondo, que con el ala todavía sosteniendo el avión al
   * tocar deja una media de dos décimas de g: lo del manual de un 172 (575 ft
   * de rodadura a 2.550 lb). Y en mojado lo que un pie con cuidado le saca a
   * la rueda sin bloquearla: el escalón casi modulado de la 25.109.
   */
  frenos: { enSeco: 0.35, psi: 50, antideslizante: 0.5 },
  frenosDeTierra: null,
  autofreno: false,
  cantosDeLaCarrera: null,
  tcas: null,
  avisosHablados: false,
  cuentaDeLaToma: null,
  cuentaSoloSinIls: false,
  cantaLosMinimos: false,
  ventanillas: null,
  // 163 nudos: la Vne de un entrenador ligero. El Mach no lo ve en su vida.
  vmoKt: 163,
  vleKt: 85,
  /*
   * Diez, veinte y treinta: la placa de un entrenador de ala alta de esta
   * clase, la del Cessna 172S —manual de vuelo, sección 2, límites de
   * velocidad—: 110 nudos con diez grados y 85 de diez a treinta. En la
   * esfera, el arco blanco acaba en 85.
   */
  vfePorMuesca: [110, 85, 85],
  alivioDeFlaps: false,
  mmo: 0.3,
  // 33 m/s son 119 km/h, que es la corta final de un 172 de verdad.
  approachSpeed: 33,
  // 80 nudos: el viento en cola de un 172 de escuela, justo por debajo de su
  // tope de flaps.
  velocidadDeCircuito: 80 * 0.514444,
  decisionSpeed: 26,
  // 28 m/s son 55 nudos: la velocidad de rotación de un 172 de verdad.
  rotationSpeed: 28,
  batalla: 1.65,
  gearHeight: 1.4,
  // Apoyo al rotar: el eje de las principales, 0,36 m por detrás del centro de
  // gravedad: `MAINS_Z` y `centro_de_gravedad` en `modelos/jaz-20-pykasu.py`.
  mainWheelsAft: 0.36,
  trenRetractil: false,
  // Tren fijo: un entrenador de escuela lleva las patas al aire a propósito.
  meteElTrenA: null,
  tardaElTren: null,
  /*
   * **16,1°, medidos en su dibujo y no del fabricante**: Cessna no publica a
   * qué actitud toca la cola de un 172. Es la actitud a la que, girando sobre
   * las principales, lo más bajo de la cola de `modelos/jaz-20-pykasu.py` llega
   * al suelo (`apoyo.test.ts`). Eran 12° sin fuente, cuatro por debajo de su
   * propia cola. Ver la enmienda H10b del ADR 0027.
   */
  maxGroundPitch: 16.1 * (Math.PI / 180),
  // 3,3 m de morro y diez centímetros de pata: 1,7°.
  minGroundPitch: -0.030,
  llevaFlaps: true,
  flapsLift: 0.55,
  flapsDrag: 0.06,
  // Diez, veinte y treinta: los tres topes del flap ranurado de una avioneta
  // de escuela de ala alta. Los mueve un motor eléctrico, tres segundos por
  // muesca.
  muescasDeFlaps: [0, 10, 20, 30],
  tardanLosFlaps: 9,
  appearance: {
    // La librea de la casa sin el sol en la cola: una avioneta de escuela
    // lleva el logotipo, como la de un aeroclub, pero no se viste de
    // compañía aérea.
    ...LIBREA,
    blades: 2,
  },
  sound: {
    engine: "piston",
    cylinders: 4,
    idleRpm: 700,
    maxRpm: 2700,
    growlHz: 300,
    growlRise: 320,
    // Tren fijo y flaps de motor eléctrico, que en un ala alta de escuela se
    // oye zumbar detrás del asiento. Sin limpias, sin APU y sin más aire que
    // el de las tomas.
    ruidos: {
      tren: 0,
      flaps: "electricos",
      limpias: false,
      apu: false,
      aire: "nada",
      aislamiento: 0.15,
    },
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
  name: nombreEnteroDe("jaz-25"),
  descriptionKey: "aircraft.mainumby.description",
  mass: 1500,
  /*
   * El biplano con su piloto y la tolva. Su peso en vacío no se ha podido
   * leer en una fuente, así que no se reparte: es la carga con la que su vuelo
   * típico sale con la masa de la ficha, muy por debajo de las 4.500 lb del
   * Ag Cat. Lo que lleva la tolva no se suelta en este juego.
   */
  masaSinCombustible: 1315,
  wingArea: 24.0,
  wingSpan: 12.5,
  chord: 1.7,
  inertia: { xx: 1600, yy: 2400, zz: 3600 },
  maxThrust: 5200,
  motores: 1,
  mandos: "convencionales",
  motoresA: [0],
  alturaCritica: null,
  helicesContrarrotativas: false,
  // La hélice grande del radial, de paso fijo: más disco y ninguna bandera.
  motorParado: { molinete: 0.5, bandera: null, autoBandera: false },
  cruiseSpeed: 55,
  // Dos mil quinientos: el trabajo de un avión así se hace mucho más abajo, y
  // lo que sube es para ir de un campo a otro.
  alturaDeCrucero: 2500,
  reglasDeVuelo: "visual",
  presurizacion: null,
  aerofrenos: null,
  /*
   * **Y frena menos, porque es de rueda de cola.** Frenando fuerte, un avión
   * con la rueda detrás se va de morro o se cruza: se frena con cuidado y la
   * rodadura la pone la poca velocidad a la que toca.
   */
  frenos: { enSeco: 0.3, psi: 50, antideslizante: 0.5 },
  frenosDeTierra: null,
  autofreno: false,
  cantosDeLaCarrera: null,
  tcas: null,
  avisosHablados: false,
  cuentaDeLaToma: null,
  cuentaSoloSinIls: false,
  cantaLosMinimos: false,
  ventanillas: null,
  // Un biplano lento: 130 nudos y se queda muy lejos del Mach.
  vmoKt: 130,
  vleKt: 80,
  // Sin flaps no hay placa: ver `llevaFlaps`.
  vfePorMuesca: [],
  alivioDeFlaps: false,
  mmo: 0.28,
  approachSpeed: 29,
  // 70 nudos: un cuarto por encima de su Vref, como la avioneta de escuela.
  // No lleva flaps, así que el único tope es el de su categoría.
  velocidadDeCircuito: 70 * 0.514444,
  decisionSpeed: 24,
  rotationSpeed: 26,
  /*
   * **De la carrera a los cincuenta pies, la de su tipo**: el G-164A de 450 hp
   * a 4.500 lb, a nivel del mar y en día estándar, rueda 615 ft y pasa los
   * cincuenta pies a 1.170 (*Ag-Cat Pilot's Handbook*, Grumman American, 1977,
   * «G-164A 450 HP Takeoff Data»). Llevaba la de su clase, 1,8.
   */
  deRodarADespegar: 1170 / 615,
  batalla: 5.4,
  gearHeight: 1.8,
  /*
   * **Las principales, 0,20 m por delante del centro de gravedad**, que es lo
   * que lo sienta en su rueda de cola: el peso queda detrás de ellas. Estaban
   * 0,18 por detrás, como en un triciclo, y parado descansaba a nivel con la de
   * cola casi un metro en el aire (#187). Es la cifra de su dibujo
   * (`modelos/jaz-25-mainumby.py`): el manual del Ag Cat da su margen de
   * centrado, de 122,0 a 125,4 pulgadas de su datum, pero no dónde van las
   * ruedas.
   */
  mainWheelsAft: -0.2,
  /*
   * **12°, sin fuente del fabricante: medidos en su dibujo.** Es la actitud a
   * la que apoya la rueda de cola girando sobre las principales —4,84 m por
   * detrás de ellas y 1,03 más alta—. No se ha encontrado la del Ag Cat ni en
   * su manual de 1977 ni en lo que se cita de su hoja de tipo FAA 1A16.
   */
  actitudEnTresPuntos: Math.atan(1.03 / 4.84),
  trenRetractil: false,
  // Tren fijo: un fumigador trabaja bajo y no le compensa el peso ni la avería.
  meteElTrenA: null,
  tardaElTren: null,
  /*
   * **Su actitud en tres puntos**: más allá, la cola no baja. Eran 15° sin
   * fuente, y con el avión apoyado en las principales la rueda de cola se
   * metía 0,23 m en el suelo.
   */
  maxGroundPitch: Math.atan(1.03 / 4.84),
  // Con la cola levantada rueda a nivel sobre las principales, y bajar el
  // morro de ahí clava la hélice. Poco juego a propósito.
  minGroundPitch: -0.020,
  /*
   * **No lleva flaps**: las dos alas tienen alerones y nada más, que es lo que
   * tiene un biplano fumigador de esta clase —y su modelo, que no los tiene—.
   * Tenía palanca, botón, reloj y un cuarto de sustentación de más, y con los
   * flaps de los otros cinco bajando en el ala, en éste se veía la aguja en
   * diez grados con el ala quieta.
   *
   * Quitárselos al modelo de vuelo no le cambia la toma: su `approachSpeed`
   * ya era 1,3 veces la pérdida **limpia** —29 contra 22,2 m/s—, que es la
   * regla con la que cruza el umbral un avión sin flaps. Lo comprueba
   * `prestaciones.test.ts`.
   */
  llevaFlaps: false,
  flapsLift: 0,
  flapsDrag: 0,
  muescasDeFlaps: [],
  tardanLosFlaps: 0,
  appearance: {
    // Biplano de trabajo, hélice de tres palas, y vestido como en su
    // ilustración: fuselaje crema, alas, anillo del capó y rayas en
    // terracota, y la cola verde. Sin el sol ni la firma: un fumigador no se
    // viste de compañía. Iba entero en ocre, y un avión entero en ocre se lee
    // naranja.
    ...LIBREA,
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
    // Ni tren que se mueva ni flaps: lo que suena es el radial, el aire en
    // los tirantes y una cabina de chapa que no aísla de nada.
    ruidos: {
      tren: 0,
      flaps: null,
      limpias: false,
      apu: false,
      aire: "nada",
      aislamiento: 0.05,
    },
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
  name: nombreEnteroDe("jaz-40"),
  descriptionKey: "aircraft.panambi.description",
  mass: 2000,
  /*
   * **Las 4.000 lb de masa máxima sin combustible del Seneca II**, la cabina
   * llena: su ficha de tipo, la FAA A7SO, lo dice al revés —«all weight in
   * excess of 4000 lb must be fuel»—. Con el vuelo más largo del juego queda
   * en 2.042 kg, debajo de sus 4.570 lb al despegue.
   */
  masaSinCombustible: 1814,
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
  motores: 2,
  mandos: "convencionales",
  // A dos metros cuarenta y cinco del eje, que es `MOTOR` en su modelo.
  motoresA: [-2.45, 2.45],
  /*
   * **Dos Continental TSIO-360-E de seis cilindros, con turbo**, el de la
   * derecha un LTSIO-360-E que gira al revés: los del Seneca II (FAA, ficha de
   * tipo A7SO; Continental, *TSIO-360 Series Engine Operator's Manual*,
   * X30583, 2011, sección II: seis cilindros, 200 hp a 2575 rpm, «TSIO –
   * clockwise, LTSIO – counterclockwise»). Su figura 2, «Altitude Performance
   * Curves L/TSIO-360-E, EB», da los 200 hp de nivel del mar sostenidos a 40
   * pulgadas de admisión **hasta los 12.000 pies**, y por encima, a fondo,
   * caen como los de un atmosférico.
   */
  alturaCritica: 12000 * 0.3048,
  helicesContrarrotativas: true,
  /*
   * **La hélice que se pone en bandera a mano**, que es la lección entera de
   * un motor parado en un bimotor de pistón. Treinta y cinco decímetros
   * cuadrados en molinete son los doscientos pies por minuto que cuenta el
   * manual de la FAA a su velocidad de mejor subida con un motor —y a este
   * avión, con uno, le sobran unos ciento setenta—; en bandera, una décima
   * parte. O sea: en molinete no sube, en bandera sí.
   */
  motorParado: { molinete: 0.35, bandera: 0.03, autoBandera: false },
  /*
   * **Los 189 nudos verdaderos del Seneca II al 75 %**: «215 hp at 12,000
   * feet, which allows for a 75-percent cruise speed of 218 mph» (*Plane &
   * Pilot*, «Piper Seneca II, III, IV, V»), que son 189 nudos. Estaba en 80
   * m/s, 155 nudos. La cifra es verdad arriba, con el turbo dando su potencia
   * de nivel del mar: ver `alturaCritica` y `alturaDeCrucero`.
   */
  cruiseSpeed: 189 * 0.514444,
  /*
   * **Y su tope, que es otro número: 196 nudos** («Top mph 226», *Plane &
   * Pilot*, el mismo artículo). Con la recta de empuje de siempre —2,4 veces
   * el crucero— los 189 de arriba lo llevaban a fondo a 211 nudos a 12.000
   * pies: quince más que el de verdad.
   *
   * Con la recta acabando en 375 nudos va a fondo a 196 **a 12.000 pies**, su
   * altitud crítica, que es donde un motor con turbo corre más —ahí tiene aún
   * sus 200 hp y el aire ya frena menos—, y a 175 a nivel del mar. Y el
   * crucero sigue saliendo: con el 75 % de su potencia —que a su altura de
   * crucero es el 91 % de la palanca, porque arriba el turbo ya no da los 200
   * hp— va a 185 nudos, y a 20.000 pies a 188. Lo prueba `turbo.test.ts`.
   */
  heliceSinEmpujeA: 375 * 0.514444,
  // Cinco mil quinientos: un bimotor de pistón sin presurizar vuela sus etapas
  // ahí arriba, con oxígeno a bordo.
  alturaDeCrucero: 5500,
  reglasDeVuelo: "instrumentos",
  // Sin presurizar, como los bimotores de pistón de su clase: por encima de
  // los tres mil ochocientos metros se vuela con la máscara de oxígeno puesta.
  presurizacion: null,
  aerofrenos: null,
  /*
   * Frenos de bimotor ligero, sin antideslizante, **con la frenada de su
   * manual**: 0,23, que le hace rodar 404 m a la masa de la ficha. El Seneca II
   * rueda 1.380 ft, 421 m, a sus 4.570 lb, que son 406 a 2.000 kg (tabla
   * comparativa de la Grumman Owners and Pilots Association, aya.org). Llevaba
   * el 0,35 de la avioneta, con el que rodaba 309 (H7, 13-11-2026).
   */
  frenos: { enSeco: 0.23, psi: 55, antideslizante: 0.5 },
  frenosDeTierra: null,
  autofreno: false,
  cantosDeLaCarrera: null,
  tcas: null,
  avisosHablados: false,
  cuentaDeLaToma: null,
  cuentaSoloSinIls: false,
  cantaLosMinimos: false,
  ventanillas: null,
  // Y los límites, tomados de un bimotor ligero de esta clase.
  vmoKt: 230,
  vleKt: 152,
  /*
   * Diez, veinticinco y cuarenta, con la placa del bimotor de seis plazas
   * cuyas muescas son: el Piper PA-34 Seneca II, 138, 121 y 107 nudos.
   */
  vfePorMuesca: [138, 121, 107],
  alivioDeFlaps: false,
  mmo: 0.48,
  // 44 m/s son 1,3 veces la pérdida, que es como se cruza el umbral.
  approachSpeed: 44,
  // 100 nudos: cruza el umbral a 86, así que es categoría A, y cien es su
  // tope de circuito.
  velocidadDeCircuito: 100 * 0.514444,
  decisionSpeed: 34,
  rotationSpeed: 37,
  /*
   * **La de su manual**: el Seneca II rueda 870 ft y pasa los cincuenta pies a
   * los 1.240, a sus 4.570 lb (tabla comparativa de la Grumman Owners and
   * Pilots Association, aya.org). Llevaba el 1,8 de su clase porque con su
   * frenada corta y el 1,43 cabía en la hierba de la granja; con la frenada de
   * su manual ya no cabe, y no cabe por la toma, como el de verdad (H7).
   */
  deRodarADespegar: 1240 / 870,
  batalla: 2.8,
  gearHeight: 1.6,
  // Apoyo al rotar: el eje de las principales, 0,35 m por detrás del centro de
  // gravedad: `PRINCIPAL_Z` en `modelos/jaz-40-panambi.py`.
  mainWheelsAft: 0.35,
  trenRetractil: true,
  // Sesenta metros: cuando ya no queda pista donde posarse delante, que es la
  // regla de escuela. Sale de una pista corta, así que tarda en quedarse sin.
  meteElTrenA: 60,
  /*
   * **Siete segundos, a salir y a entrar**: el manual del bimotor cuya placa de
   * flaps lleva, el Piper PA-34 Seneca II —sección 7, «Landing Gear»—, dice
   * «gear extension or retraction normally takes six to seven seconds». Una
   * sola cifra para los dos sentidos, que lo mueve la misma bomba eléctrica
   * reversible; se toma la de arriba.
   */
  tardaElTren: { sale: 7, entra: 7 },
  /*
   * **19,7°, medidos en su dibujo y no del fabricante**: Piper no publica a
   * qué actitud toca la cola de un Seneca II. Es la actitud a la que, girando
   * sobre las principales, la cola de `modelos/jaz-40-panambi.py` llega al
   * suelo (`apoyo.test.ts`). Eran 11° sin fuente. Ver la enmienda H10b del
   * ADR 0027.
   */
  maxGroundPitch: 19.7 * (Math.PI / 180),
  // 3,6 m de morro y diez centímetros: 1,6°.
  minGroundPitch: -0.028,
  llevaFlaps: true,
  flapsLift: 0.5,
  flapsDrag: 0.07,
  // Diez, veinticinco y cuarenta: los de un bimotor de pistón de seis plazas,
  // con su flap ranurado. Eléctricos, como los de la avioneta.
  muescasDeFlaps: [0, 10, 25, 40],
  tardanLosFlaps: 9,
  appearance: {
    // La librea de la casa con el sol en la cola: es un avión de trabajo que
    // lleva gente, y se pinta como se pintan ésos.
    ...LIBREA,
    // Bipala, la de serie del Seneca II: ver `helice` en su modelo.
    blades: 2,
    motivo: "sol",
  },
  sound: {
    /*
     * **Seis cilindros, a 2575 vueltas**: los del TSIO-360-E, con su ralentí
     * de 700 (Continental, X30583, «Tabulated Data and Limits»). Estaba como
     * dos de cuatro, con ocho cilindros para sonar «doble»; pero dos motores
     * a las mismas vueltas no suben la nota, la repiten: cada uno enciende
     * tres veces por vuelta, y esa es la nota de los dos.
     */
    engine: "piston",
    cylinders: 6,
    idleRpm: 700,
    maxRpm: 2575,
    growlHz: 250,
    growlRise: 300,
    /*
     * El tren de un bimotor ligero lo mueve un motor eléctrico con su
     * reductora, a dos palmos de los pies y sin forro en medio: se oye
     * entero, de la primera vuelta al golpe del final.
     */
    ruidos: {
      tren: 0.7,
      flaps: "electricos",
      limpias: false,
      apu: false,
      aire: "nada",
      aislamiento: 0.25,
    },
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
    /*
     * **El timón de un bimotor es el que sujeta un motor parado**, y de ahí
     * sale su tamaño. Estaba en 0,03, lo de una avioneta de un motor, y con
     * eso la Vmc salía a 72 nudos: por encima de su V1 y en su propia Vr, un
     * avión que no se podría certificar. Los bimotores de seis plazas tienen
     * la Vmc en los sesenta y pico —el Seneca II, 66— y el timón que la da es
     * éste: 62 nudos. Ver `vmc` en `velocidades-de-despegue.ts`.
     */
    cnRudder: 0.04,
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
 * **Es un Beech 1900D**, por fuera y por dentro (13-11-2026, ADR 0027). Era
 * una mezcla: la silueta, la cabina, los frenos y los flaps del 1900D, y el
 * ala, el peso y la velocidad del DHC-6 Twin Otter, que el #54 había señalado
 * como «la base defendible para el turbohélice regional» porque tiene
 * derivadas identificadas en vuelo. Con el ala de uno y el freno del otro
 * rodaba 459 m donde el Twin Otter rueda 244 y no se parecía a ninguno de los
 * dos, así que su despegue y su toma no se podían comparar con ningún manual.
 * Enrique: «hacemos el 1900D». El Twin Otter será otro avión.
 *
 * Las fuentes, de las que salen los números de abajo:
 *
 * - **CAA de Nueva Zelanda, *Type Acceptance Report* 98/07**, rev. 1 (2022):
 *   la aceptación de la hoja de tipo FAA A24CE, con el peso máximo, el motor,
 *   la hélice, la base de certificación —14 CFR 23 hasta la enmienda 34,
 *   categoría de cercanías— y, en su apéndice 2, la vista en tres planos del
 *   1900D con sus cotas.
 * - **Flight Safety Foundation, *Accident Prevention***, julio de 1998 y mayo
 *   de 2004, la ficha del avión que acompaña a cada informe: motores, pesos,
 *   crucero y pérdida.
 * - **TSB de Canadá, informe A97C0229**, con las velocidades de despegue de
 *   su manual de vuelo a 16.000 lb.
 *
 * Los coeficientes, por el mismo camino que el Panambi y con el ala del 1900D:
 * `clAlpha` de la línea sustentadora con su alargamiento —once, de ala
 * larga—, `cmAlpha` de un margen del 17 %, `clP` de la proporción de siempre,
 * y `clAileron` de la regla de la casa.
 */
/**
 * **Lo que pesa el JAZ 60 en su vuelo típico**, kg: su masa sin combustible
 * más la mediana de lo que carga en sus rutas, 724 kg (ADR 0019). Lo
 * comprueba `peso.test.ts`.
 */
const MASA_DEL_ARASUNU = 6572 + 724;

/**
 * **Las velocidades del 1900D a la masa de su ficha**, m/s indicados, sacadas
 * de su ala con las reglas de su categoría, la de cercanías, que son las de
 * los aviones de transporte:
 *
 * - **Vr, 1,1 veces la pérdida con los flaps de despegue** (14 CFR 23.51 c 2
 *   iii). Con esa regla y este ala, a 16.000 lb sale 101 nudos, y su manual
 *   da 102 (TSB, A97C0229).
 * - **V1, en la proporción de su manual**: 100 nudos por 102 de Vr a 16.000 lb
 *   (el mismo informe). Y por encima de su Vmc, que la norma no la deja bajar.
 * - **Vref, 1,3 veces la pérdida con los flaps de aterrizaje** (14 CFR 23.73).
 *
 * Eran 80, 74 y 93 nudos, con el ala y el peso del Twin Otter.
 */
const VELOCIDADES_DEL_ARASUNU = {
  vr: 101.5 * 0.514444,
  v1: 99.5 * 0.514444,
  vref: 107.7 * 0.514444,
} as const;

export const ARASUNU: AircraftConfig = {
  id: "jaz-60",
  name: nombreEnteroDe("jaz-60"),
  descriptionKey: "aircraft.arasunu.description",
  /*
   * **Su vuelo típico**, 7.296 kg: un 6 % por debajo de su peso máximo, que
   * es como sale un 1900D en un salto corto. Eran 5.600 kg, el peso del Twin
   * Otter. Ver `masaSinCombustible` y `peso.test.ts`.
   */
  mass: MASA_DEL_ARASUNU,
  /*
   * **Lo que le deja su peso máximo para el vuelo más largo que tiene en el
   * juego**: de Pettirossi a Pedro Juan Caballero, con el alternativo y la
   * reserva, 1.194 kg de combustible, que con las 17.120 lb del 1900D (7.766
   * kg, FSF 2004 y TAR 98/07) dejan 6.572 kg para el avión y la gente.
   *
   * Es menos que el pasaje lleno, y es lo de verdad: el 1900D vacío pesa
   * 4.932 kg (10.874 lb, hoja de especificaciones de Raytheon) y con dos de
   * cabina y diecinueve de pasaje con su maleta, a las masas estándar de la
   * norma europea para diez a diecinueve plazas (CAT.POL.MAB.100, tablas 1 a
   * 3), son 6.926: con todos sentados no cabe ese combustible, y salen tres
   * o cuatro menos. Un 1900D lleno hace unas 380 millas; más lejos, deja
   * gente en tierra.
   *
   * Eran 4.886, la carga que dejaba el peso del Twin Otter.
   */
  masaSinCombustible: 6572,
  /*
   * **El ala del 1900D**: 17,66 m de envergadura —57 ft 11,17 in hasta la
   * punta de los winglets, en la vista en tres planos del TAR 98/07— y
   * 28,8 m², la que da su operador Chalair. Eran 19,8 m y 39 m², las del Twin
   * Otter. La cuerda media, la superficie entre la envergadura.
   */
  wingArea: 28.8,
  wingSpan: 17.66,
  chord: 1.63,
  // Escaladas por masa y envergadura con la proporción que comparten el Navion
  // y los tres de la flota: `Ixx ≈ 0,012·m·b²`; las otras dos, en la misma
  // proporción que tenían con ella.
  inertia: { xx: 27000, yy: 40000, zz: 62000 },
  /*
   * **El empuje de dos PT6A-67D**, de 1.279 shp cada uno (954 kW, FSF 2004;
   * el motor, también en el TAR 98/07), con la hélice Hartzell de cuatro palas
   * de 2,79 m. La recta de empuje de un avión de hélice tiene dos números, el
   * de parado y la velocidad a la que llega a cero, y salen de dos cifras del
   * 1900D:
   *
   * - **Sube 2.615 ft/min** a su peso máximo al nivel del mar (hoja de
   *   especificaciones de Raytheon). A unos 140 nudos, con la resistencia de
   *   este ala, eso pide 19,2 kN.
   * - **Cruza a 274 nudos a 25.000 ft** con 15.000 lb (FSF): allí arriba la
   *   recta tiene que dar, como poco, lo que frena el avión, unos 5,8 kN.
   *
   * Una recta que acaba en 230 m/s y sale de 28 kN pasa por las dos. Es menos
   * de lo que daría la teoría del disco a esa potencia —unos 36 kN con una
   * figura de mérito de 0,65— porque la recta es recta y la hélice de verdad
   * no: lo que se pide es que suba y corra como el avión. Eran 14.000 N, los
   * del Twin Otter.
   */
  maxThrust: 28000,
  heliceSinEmpujeA: 230,
  /*
   * **665 galones US de queroseno**, 4.456 lb a 6,7 lb el galón (*Plane &
   * Pilot*, «Beechcraft 1900»; 4.458 en la hoja de Raytheon). Sin él, la
   * cuenta de su clase le dejaba 1.075 kg, un catorce por ciento de lo que
   * pesa, y los vuelos largos salían con el depósito «lleno» a media carga.
   */
  combustibleUtilizable: 2021,
  motores: 2,
  // Cables, como el Beech 1900D: no lleva mandos eléctricos. Ver `mandos`.
  mandos: "convencionales",
  // A 2,62 m del eje, la mitad de la vía del tren, que se mete en la góndola:
  // 8 ft 7 in en la vista en tres planos del TAR 98/07. Eran 3,10, las del ala
  // del Twin Otter. Es `MOTOR` en su modelo.
  motoresA: [-2.62, 2.62],
  alturaCritica: null,
  helicesContrarrotativas: false,
  /*
   * La hélice de 2,79 m del 1900D: más del doble de disco que la del bimotor
   * de pistón, y más del doble de freno en molinete. Por eso un turbohélice de
   * línea la pone en bandera **solo**: la *autofeather* va armada en cada
   * despegue. Eran 0,72 con una de 2,64: en molinete frena el disco, un 12 %
   * más grande. En bandera se queda en 0,06: lo que frena ahí es el canto de
   * cuatro palas, que casi no cambia.
   */
  motorParado: { molinete: 0.81, bandera: 0.06, autoBandera: true },
  /*
   * **274 nudos**, su crucero máximo a 25.000 ft y 15.000 lb (FSF, 1998 y
   * 2004). Eran 90 m/s, 175 nudos, el crucero del Twin Otter: el 1900D va
   * más de la mitad más rápido, y se nota en todos los tiempos de vuelo.
   */
  cruiseSpeed: 274 * 0.514444,
  // Siete mil seiscientos: veinticinco mil pies, la altitud máxima de
  // operación del 1900D (TAR 98/07, que cita la sección 2 de su manual).
  alturaDeCrucero: 7600,
  reglasDeVuelo: "instrumentos",
  /*
   * **Cinco psi, los del Beech 1900D**, cuya placa de flaps lleva: un
   * turbohélice de diecinueve plazas se certifica como avión de cercanías y no
   * como avión de transporte, y su regla no le pide los ocho mil pies a su
   * techo. A veinticinco mil pies lleva la cabina a unos nueve mil, y por eso
   * su aviso no es el de los reactores. Sin aerofrenos: frena con las hélices
   * al ralentí y con el tren.
   */
  presurizacion: { diferencialMaximo: 5.0 * PSI, topeDeCabina: OCHO_MIL_PIES, avisoHablado: false },
  aerofrenos: null,
  /*
   * **Los frenos de un turbohélice de cercanías**: algo más que una avioneta,
   * con el antideslizante que el 1900D lleva como opción. Lo que le quita la
   * pista de verdad es la hélice en reversa —ver `tieneReversa`—; ni frenos de
   * tierra ni autofreno, que no los lleva ningún avión de su clase.
   *
   * **0,30, el que para en su manual con su Vref.** Su toma es de 2.790 ft
   * desde los cincuenta pies (*Plane & Pilot*, «Beechcraft 1900»), que a su
   * peso máximo al aterrizar, 16.765 lb (FSF, 2004), son los 4.667 ft de
   * pista que se le publican partidos por 0,6. El 0,38 se calibró con el peso
   * y la Vref del Twin Otter, 93 nudos; con el peso y la Vref del 1900D se
   * quedaba un 10 % corto de su manual (ADR 0027).
   */
  frenos: { enSeco: 0.3, psi: 100, antideslizante: 0.5 },
  frenosDeTierra: null,
  autofreno: false,
  cantosDeLaCarrera: null,
  // 7.766 kg, por encima de los 5.700 de la raya del ACAS II: lo lleva por
  // norma (TAR 98/07, sobre la regla 125.381 de Nueva Zelanda). Con el peso
  // del Twin Otter se quedaba debajo, con el TCAS I. Ver `tcas`.
  tcas: "TCAS II",
  avisosHablados: true,
  /*
   * **Solo *five hundred*, y solo sin ILS delante**: lo único que se puede
   * asegurar de su clase. Un turbohélice de diecinueve plazas vuela con un
   * TAWS de clase A (14 CFR 135.154), y la clase A lleva, entre las funciones
   * del GPWS, «descent of the airplane to 500 feet above the terrain or
   * nearest runway elevation (voice callout "Five Hundred") during a
   * non-precision approach» (FAA, AC 23-18, 2000, §3.d, sobre el TSO-C151a).
   * Se cantaba en todas las tomas, también con la senda de un ILS delante.
   *
   * Y no se ha encontrado más fuente que esa. El TAWS de un 1900D no es uno
   * de serie con su cuenta en el manual del avión: es el que le pone cada
   * operador, cada uno con su menú —un Sandel ST3400 con el STC de Maxcraft
   * (Transport Canada, SA12-78), o el T2CAS de ACSS que Raytheon ofrecía
   * como opción desde 2007—, y sin el de su clase el resto de la cuenta no
   * se canta. Ver `cuentaSoloSinIls`.
   */
  cuentaDeLaToma: [500],
  cuentaSoloSinIls: true,
  /*
   * **Y sin *minimums***: no lo pide la norma del TAWS y no se ha encontrado
   * en ningún documento del 1900D. Lo dice la instructora, como lo diría
   * quien va a la derecha. Ver `cantaLosMinimos`.
   */
  cantaLosMinimos: false,
  // Persiana de plástico, como cualquier turbohélice regional.
  ventanillas: "persiana",
  /*
   * **248 nudos indicados hasta 13.200 ft, y Mach 0,48 por encima.** Las dos
   * cifras de su placa se sostienen una a otra: 248 indicados a 13.200 ft son
   * Mach 0,47, que es donde una toma el relevo de la otra. Eran 250 sin
   * fuente. La hoja de tipo A24CE no se ha podido leer entera: se dejan las
   * de la placa que circulan con el avión.
   */
  vmoKt: 248,
  vleKt: 184,
  /*
   * La placa de un turbohélice de diecinueve plazas y cola en T, el Beech
   * 1900D: 188 nudos con los de aproximación, diecisiete grados, y 154 con
   * los de aterrizaje, treinta y cinco. Leída por grados, que es como está
   * escrita: la de diez cae dentro de la de aproximación, y la de veinte ya
   * pasó de ella.
   */
  vfePorMuesca: [188, 154, 154],
  alivioDeFlaps: false,
  mmo: 0.48,
  /*
   * **Vref, 1,3 veces la pérdida con los flaps de aterrizaje** a la masa de la
   * ficha (14 CFR 23.73). Eran 93 nudos, con el ala del Twin Otter. Ver
   * `VELOCIDADES_DEL_ARASUNU`.
   */
  approachSpeed: VELOCIDADES_DEL_ARASUNU.vref,
  // 130 nudos: Vref más veintitantos con los flaps de aproximación, por
  // debajo de los 135 de su categoría, la B (OACI, Doc 8168, vol. I, tabla
  // I-4-1-2). Eran 120, con la Vref del Twin Otter.
  velocidadDeCircuito: 130 * 0.514444,
  decisionSpeed: VELOCIDADES_DEL_ARASUNU.v1,
  rotationSpeed: VELOCIDADES_DEL_ARASUNU.vr,
  // 23 ft 9,35 in, en la vista en tres planos del TAR 98/07.
  batalla: 7.25,
  // Del eje del fuselaje al suelo, como en su modelo: la punta de la pala a
  // 35 cm del suelo (13,82 in en la vista en tres planos).
  gearHeight: 2.1,
  /*
   * Apoyo al rotar: el eje de las principales, 0,66 m por detrás del centro
   * de gravedad: `PRINCIPAL_Z` y `centro_de_gravedad` en
   * `modelos/jaz-60-arasunu.py`. Eran 0,58 con el ala del Twin Otter, de más
   * cuerda.
   */
  mainWheelsAft: 0.66,
  trenRetractil: true,
  // Veinticinco: «positive rate, gear up». Un turbohélice regional mete el tren
  // a los pocos segundos de despegar, no a trescientos metros.
  meteElTrenA: 25,
  /*
   * **Seis segundos, a salir y a entrar.** El tren de un turbohélice de
   * cercanías lo mueve una bomba hidráulica propia en el ala, como el del
   * 1900D, y los seis segundos de su subida son la cifra que circula en el
   * material de instrucción de ese avión; el manual de vuelo que la daría no
   * es público, así que es la estimación de su clase y no una cita. Por
   * debajo de la del bimotor de pistón porque sus patas son cortas para su
   * peso y la bomba es de avión de línea.
   */
  tardaElTren: { sale: 6, entra: 6 },
  /*
   * **15,4°, medidos en su dibujo y no del fabricante**: no se ha encontrado
   * publicada la actitud a la que toca la cola de un 1900D. Es la actitud a
   * la que, girando sobre las principales, la panza de
   * `modelos/jaz-60-arasunu.py` llega al suelo (`apoyo.test.ts`); si el dibujo
   * cambia, esa prueba lo dice. Eran 10° sin fuente. Ver la enmienda H10b del
   * ADR 0027.
   */
  maxGroundPitch: 15.4 * (Math.PI / 180),
  // 5,5 m de morro y doce centímetros: 1,3°.
  minGroundPitch: -0.022,
  // Flaps grandes: es lo que le permite entrar en pistas cortas, que es para
  // lo que existe un turbohélice regional.
  llevaFlaps: true,
  flapsLift: 0.65,
  flapsDrag: 0.09,
  // Diez, veinte y treinta y cinco: los de un turbohélice de diecinueve
  // plazas. Hidráulicos y más grandes: cuatro segundos por muesca.
  muescasDeFlaps: [0, 10, 20, 35],
  tardanLosFlaps: 12,
  appearance: {
    // La librea de la casa, con la T de la cola del color del casco encima
    // de la deriva verde, como en su ilustración: lo que se lee de lejos es
    // la forma de la T. Iba con la franja, las góndolas y la T en ocre, que
    // en el hangar se veían naranjas.
    ...LIBREA,
    blades: 4,
    motivo: "sol",
  },
  sound: {
    engine: "turboprop",
    cylinders: 0,
    // Las cuatro palas de su hélice, que es lo que canta en un turbohélice.
    palasDeFan: 4,
    idleRpm: 900,
    maxRpm: 2000,
    growlHz: 420,
    growlRise: 260,
    /*
     * **El tren más ruidoso de la flota**, y no por grande: el principal se
     * mete en las góndolas de los motores, pegado al pasaje y sin el suelo
     * grueso de un avión de línea en medio. Limpias como todo avión de
     * transporte de su clase; sin APU, que este tamaño no la lleva, y con
     * ventiladores que solo van con los motores en marcha.
     */
    ruidos: {
      tren: 0.85,
      flaps: "hidraulicos",
      limpias: true,
      apu: false,
      aire: "ventilacion",
      aislamiento: 0.45,
    },
  },
  aero: {
    cl0: 0.3,
    // `2π/(1+2/(AR·e))` con su alargamiento, 10,83. Era 5,03 con el 10,05 del
    // Twin Otter.
    clAlpha: 5.1,
    /*
     * **~14,4°: el que da su pérdida limpia**, 101 nudos a 16.950 lb y su peso
     * máximo de entonces (FSF, 1998), un `CL` máximo de 1,58. Eran 0,27, ~15°,
     * sin cifra con la que medirlo.
     */
    alphaStall: 0.2515,
    /*
     * **Treinta milésimas, el que deja ir a fondo a su crucero.** Con sus 36 kN
     * y la recta que acaba en 210 m/s, a 1.500 m a fondo va a unos 145 m/s, y
     * a 25.000 ft sostiene sus 274 nudos. Eran 28, las del Twin Otter: el
     * 1900D lleva más apéndices —winglets, aletas bajo la cola y estabilones—
     * y un fuselaje más alto.
     */
    cd0: 0.03,
    oswald: 0.8,
    cyBeta: -0.55,
    cm0: 0.045,
    // Un margen del 17 % de la cuerda: `−0,17·clAlpha`.
    cmAlpha: -0.867,
    /*
     * **El amortiguamiento de cabeceo lo pone la cola**, y va referido al ala:
     * `cmQ ∝ S_t·l_t²/(S·c²)`. Con el plano de cola del 1900D, 5,63 m de punta
     * a punta donde el modelo llevaba 6,9, sobre un ala de 28,8 m² y 1,63 de
     * cuerda donde eran 39 y 2,0, la cuenta da unos −27: con los −16 de antes
     * el ala nueva le quitaba la mitad. Se queda en −24, al borde de lo que
     * amortigua un avión de verdad —el Navion por 2,5, `referencia.test.ts`—.
     */
    cmQ: -24,
    cmElevator: 0.5,
    clBeta: -0.095,
    // `clAlpha/10,7`, la proporción de siempre.
    clP: -0.48,
    // ~55 °/s a 175 nudos: con menos envergadura, el mismo alerón rueda más
    // deprisa, y se baja en proporción. Era 0,054, 60 °/s con el ala del Twin
    // Otter.
    clAileron: 0.047,
    cnBeta: 0.09,
    cnR: -0.16,
    /*
     * **El timón que da su Vmc por debajo de lo que su manual permite.** La
     * Vmc del 1900D no se ha encontrado publicada, pero sus velocidades de
     * despegue la acotan: la Vr no puede bajar de 1,05 veces la Vmc (14 CFR
     * 23.51 c 2 ii), y su manual rota a 102 nudos a 16.000 lb (TSB,
     * A97C0229). La Vmc del 1900D va así por debajo de 97 nudos; con este
     * timón, la del modelo sale en 85. Era 0,035, que con el empuje y el ala
     * del 1900D la subía por encima de su V1.
     */
    cnRudder: 0.05,
    cnAileron: -0.003,
  },
};

/**
 * JAZ 90 *Arai* — reactor de ala en flecha.
 *
 * El último peldaño de la flota y el único con turbinas. *Arai* es nube, y
 * nombra lo que hace: es el único que va por encima de ellas.
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
 * ## Se llamó Kuarahy durante un rato
 *
 * Y no voló con ese nombre ni un día: la raíz ya es de *Kuarahy-memby*, la
 * ardilla de Granja Óga, que es la misma colisión por la que el biplano dejó
 * de llamarse Kuarahy. Estuvo hecho y reservado —medido por el banco, fuera
 * del hangar— hasta que se bautizó. Ver `flota.ts` y #69.
 */
export const ARAI: AircraftConfig = {
  id: "jaz-90",
  name: nombreEnteroDe("jaz-90"),
  descriptionKey: "aircraft.arai.description",
  mass: 30000,
  /*
   * **20.700 kg de avión en orden de operaciones y 5.400 de pasaje**: el BOW
   * del manual de aeropuertos del Embraer 170 (APM-170, tabla 2.1) y unas
   * cincuenta y siete personas con su maleta: la masa estándar de un adulto
   * en Europa, 84 kg (Reglamento (UE) 965/2012, CAT.POL.MAB.100), y unos
   * once de bodega cada una. Por debajo de sus 30.140 kg de masa máxima sin
   * combustible.
   */
  masaSinCombustible: 26100,
  wingArea: 72.0,
  wingSpan: 26.0,
  chord: 3.0,
  inertia: { xx: 243000, yy: 300000, zz: 487000 },
  /*
   * **Dos turbofanes de sesenta kilonewtons, que es lo que lleva su clase.**
   *
   * Estaba en 58.000 N para las dos, o sea la mitad: relación empuje/peso
   * 0,197 cuando un regional de treinta toneladas con dos CF34 va por 0,33
   * (E-170: 2 × 63,2 kN, ficha de tipo EASA A.135). Con el empuje de antes
   * necesitaba 3.057 m para irse del suelo; con éste, 1.111, que es lo que
   * dice el manual de aeropuertos para un avión de esta clase.
   */
  maxThrust: 126000,
  /*
   * **Doscientos veinte metros por segundo, que son Mach 0,75 arriba.**
   *
   * Estaba en 180 —350 nudos— y eso es velocidad de subida, no de crucero: un
   * regional de esta clase cruza a M 0,78 en el nivel 350, o sea unos 230 m/s
   * de verdadera. Con 180, el avión sostenía su «crucero» con un tercio de
   * gas, que es lo que delataba que el número no era el suyo.
   */
  motores: 2,
  /*
   * **Mandos eléctricos, los de un regional de hoy**: la palanca pide
   * trayectoria y, suelta, el avión la sostiene y se compensa solo, como la ley
   * normal de Airbus y la de los Embraer E2. Es el único de la flota. Ver
   * `mandos` y `flight/mano.ts`.
   */
  mandos: "electricos",
  // Colgados en el quiebro del ala, a cuatro metros cuarenta: `QUIEBRO` en su
  // modelo.
  motoresA: [-4.4, 4.4],
  alturaCritica: null,
  helicesContrarrotativas: false,
  /*
   * Un fan en molinete, que no tiene bandera: la cuenta de Torenbeek con la
   * toma y la tobera de un motor de esta clase —de metro y pico de diámetro—
   * da una cuarta de metro cuadrado. Frena poco al lado de una hélice.
   */
  motorParado: { molinete: 0.25, bandera: null, autoBandera: false },
  cruiseSpeed: 220,
  // Once mil: treinta y seis mil pies, donde cruza un reactor regional.
  alturaDeCrucero: 11000,
  reglasDeVuelo: "instrumentos",
  /*
   * **Ocho coma cuatro psi, los de la familia de Embraer**: es el tope del
   * control de presión del ERJ (resumen del AOM del EMB-145, C. Regli), y con
   * él la cabina queda en ocho mil pies a cuarenta y un mil, el techo del
   * E-170. Y su aviso habla: la caja dice *cabin* con la cabina por encima
   * de diez mil pies, que es la voz de ese aviso en la familia de Embraer.
   *
   * Los aerofrenos, calibrados con lo que hace su clase en un descenso de
   * emergencia: gas al ralentí, aerofrenos fuera y a su velocidad máxima, un
   * birreactor de pasillo único baja de 35 000 a 10 000 pies a una media de
   * seis o siete mil pies por minuto, unos cuatro minutos. Ver
   * `despresurizacion.test.ts`.
   */
  presurizacion: { diferencialMaximo: 8.4 * PSI, topeDeCabina: OCHO_MIL_PIES, avisoHablado: true },
  aerofrenos: 0.025,
  /*
   * **Frenos de carbono con antideslizante modulado, frenos de tierra y
   * autofreno**, como cualquier reactor de su clase. Cuatro décimas y media
   * en seco: con los frenos de tierra arriba, la rodadura del E-170 a su peso
   * máximo de aterrizaje (1.228 m de pista de aterrizaje en su manual de
   * aeropuertos, de los que unos 300 son el aire) sale a cuatro décimas y
   * media de g de media. Neumáticos a unas 170 psi.
   */
  frenos: { enSeco: 0.45, psi: 170, antideslizante: 0.8 },
  frenosDeTierra: { resistencia: 0.07, sustentacion: 0.7 },
  autofreno: true,
  // Los de los E-Jets, que en la carrera no cantan nada. Ver `cantosDeLaCarrera`.
  cantosDeLaCarrera: "embraer",
  tcas: "TCAS II",
  avisosHablados: true,
  /*
   * **La de los E-Jets, sin cuatrocientos ni trescientos**: «RA calls: 2500,
   * 1000, 500, 200, 100, 50, 40, 30, 20, 10, MIN» (C. Regli, *Embraer EMB190 –
   * Summary*, 2025, p. 1-57, modo 6 del EGPWS:
   * <http://www.flite.ch/Emb/Summary_E190.pdf>). El *minimums* va aparte,
   * a la altura de decisión: ver `cabina.minimums`.
   */
  cuentaDeLaToma: [2500, 1000, 500, 200, 100, 50, 40, 30, 20, 10],
  cuentaSoloSinIls: false,
  // Y el «MIN» de esa misma lista, a la altura de decisión (Regli, p. 1-57).
  cantaLosMinimos: true,
  // Persiana de plástico, como cualquier reactor de pasillo único.
  ventanillas: "persiana",
  /*
   * **Ochenta centímetros por g**: trece metros de semiala con alargamiento
   * 9,4, escalados desde el 787 —ver `alaQueSeDobla` en la ficha—. En crucero,
   * casi un metro más arriba que en el puesto. Y a 1,5 Hz, el extremo rígido
   * de la horquilla, que es un ala corta.
   */
  alaQueSeDobla: { porG: 0.82, hz: 1.5 },
  // Reactor regional.
  vmoKt: 320,
  /*
   * **El del tren sale de su propia Vref, no de un avión real que no es.**
   *
   * Los primeros números vinieron del arquetipo —un regional de verdad— y su
   * tope de flaps quedaba en ciento cincuenta contra una Vref de ciento
   * treinta y dos: trece por ciento de margen, que no da ni para una
   * corrección en final. O sea que aterrizar de manual rompía los flaps.
   *
   * Lo cazó la prueba que dice que un límite que se pasa volando la
   * aproximación de manual no es un límite, es una trampa. Los flaps ya no
   * van por ahí: llevan la placa de verdad, abajo.
   */
  vleKt: 205,
  /*
   * **Y la placa de flaps, una por muesca.** Cinco, quince y treinta son
   * muescas del 737, y ésta es la suya —la del 737-800: 250, 200 y 175—.
   * Un regional de la misma clase dice lo mismo en su orden: el E-170 va de
   * 230 con la primera a 165 con la de aterrizaje.
   *
   * La de aterrizaje queda con el margen que pide la prueba de siempre: se
   * cruza el umbral a 132, y un límite que se pasa volando la aproximación de
   * manual no es un límite, es una trampa.
   */
  vfePorMuesca: [250, 200, 175],
  // Como el 737: los de aterrizaje suben solos a la muesca anterior.
  alivioDeFlaps: true,
  mmo: 0.82,
  /*
   * **Ciento treinta y dos nudos, que es como entra un regional.**
   *
   * Estaba en 90 m/s —175 nudos—, y eso no era una velocidad de aproximación:
   * era 1,3 veces la pérdida **limpia**. La regla de verdad son 1,3 veces la
   * pérdida con los flaps de aterrizaje puestos, que en este avión son 52,4
   * m/s. Un E-170 entra a 125-130 nudos.
   */
  approachSpeed: 68,
  /*
   * **Ciento setenta nudos**: Vref más treinta y ocho, la de maniobra con los
   * flaps del viento en cola, y por debajo de su tope de flaps. Cruza el
   * umbral a 132, así que es categoría C, que deja hasta 180.
   *
   * Vira con kilómetro y medio de radio, que es lo que mide el pasillo de su
   * circuito contra el terreno. Ver `pasilloDelCircuito`.
   */
  velocidadDeCircuito: 170 * 0.514444,
  /*
   * **Ciento treinta y tres nudos, la Vr de su peso**: 1,1 veces su pérdida con
   * los flaps de despegue, 121. Ver `VR_SOBRE_LA_PERDIDA`.
   *
   * Eran 152, sin fuente, y por encima de su propia V2: con ellos rodaba 901 m
   * hasta rotar y el hangar le pedía 1.439 de pista, donde Embraer da 1.151 con
   * el pasaje lleno en un vuelo de quinientas millas, más pesado que el de la
   * ficha (hoja de especificaciones del E170). Con 133 pide 1.124, la de abortar
   * desde su V1 (`acelerarYPararDeSuNorma`). La V1 baja en la misma proporción,
   * de 140 a 123 (H7, 13-11-2026).
   */
  decisionSpeed: 123 * 0.514444,
  rotationSpeed: 133 * 0.514444,
  batalla: 11.5,
  // 3,35: la panza a metro setenta del asfalto y las góndolas a medio metro,
  // que es como va un reactor de esta clase. Con 2,8 la panza quedaba a metro
  // escaso y el tren apenas asomaba bajo el motor: «ruedas enterradas». Tiene
  // que decir lo mismo que `TREN` en `modelos/jaz-90-arai.py`.
  gearHeight: 3.35,
  // Apoyo al rotar: el eje de las principales, 1,38 m por detrás del centro de
  // gravedad: `PRINCIPAL_Z` en `modelos/jaz-90-arai.py`.
  mainWheelsAft: 1.38,
  trenRetractil: true,
  // Veinte: el tren entra en cuanto el variómetro dice que sube. Con las patas
  // fuera a más de doscientos cinco nudos se pasaría de su propio límite.
  meteElTrenA: 20,
  /*
   * **Ocho segundos, a salir y a entrar.** Estimación de su clase, y dicha
   * como tal: los manuales de tripulación de los reactores de línea no
   * publican lo que tarda el tren en recorrer —dicen qué luces se ven y en
   * qué orden, no cuánto tardan— y el de mantenimiento, que sí lo da, no es
   * público. Si un día se tiene la cifra de su manual, va aquí.
   */
  tardaElTren: { sale: 8, entra: 8 },
  /*
   * **14,2°, medidos en su dibujo y no del fabricante**: la cifra de Embraer
   * para el E170 no se ha encontrado —su manual de planificación de
   * aeropuertos no está en línea—. Es la actitud a la que, girando sobre las
   * principales, la panza de `modelos/jaz-90-arai.py` llega al suelo
   * (`apoyo.test.ts`). Eran 9° sin fuente, y con ellos despegaba volando un
   * 18 % más largo que la cuenta del hangar, esperando a una velocidad a la
   * que su cola le dejara sostenerse. Ver la enmienda H10b del ADR 0027.
   */
  maxGroundPitch: 14.2 * (Math.PI / 180),
  // 11,5 m de morro y quince centímetros: 0,75°.
  minGroundPitch: -0.013,
  /*
   * **Y los flaps de un reactor, que no son los de una avioneta.**
   *
   * La resistencia estaba en 0,1 y la sustentación en 0,7. Con eso, en
   * configuración de aterrizaje la fineza salía en 5,4 cuando un reactor sucio
   * anda por 7,5: el avión se hundía a veinte metros por segundo con el gas al
   * ralentí, se ponía de morro y entraba en pérdida **veinticuatro metros por
   * segundo por encima** de la pérdida que dicen sus propios coeficientes. Y
   * despegando no se iba del suelo ni en doce kilómetros de pista.
   *
   * Un reactor de línea con los flaps de aterrizaje añade del orden de seis
   * centésimas de resistencia y llega a un CL máximo cerca de 2,5. Esos son
   * los números.
   */
  llevaFlaps: true,
  flapsLift: 1.05,
  flapsDrag: 0.055,
  /*
   * Cinco, quince y treinta: los topes de un bimotor de pasillo único. El
   * primero es casi todo carril —el Fowler sale hacia atrás y apenas baja—,
   * para despegar sin frenar; los otros dos, ángulo. Seis segundos por muesca.
   */
  muescasDeFlaps: [0, 5, 15, 30],
  tardanLosFlaps: 18,
  appearance: {
    // La librea de la casa, con las góndolas y las aletas en terracota, como
    // en su ilustración. La cola era terracota con el sol entre las hojas;
    // verde, como la de toda la flota, lleva el sol solo.
    ...LIBREA,
    blades: 0,
    motivo: "sol",
  },
  sound: {
    engine: "turbofan",
    cylinders: 0,
    // Las veintiocho palas del fan de un CF34, que es su motor.
    palasDeFan: 28,
    /*
     * Y las vueltas del fan, que son las de verdad y no un número de adorno.
     *
     * Un CF34 gira su fan entre unas mil doscientas al ralentí y siete mil
     * cuatrocientas al despegue. Con veintiocho palas eso son de 560 a 3.450
     * hercios, que es exactamente la banda en la que se oye el silbido de un
     * regional. Estaban en 2.000 y 9.000, que no son de ningún motor, y con
     * ellas el tono se iba por encima de los cuatro mil.
     */
    idleRpm: 1200,
    maxRpm: 7400,
    growlHz: 520,
    growlRise: 700,
    /*
     * Un reactor regional: tren hidráulico bajo el suelo del pasaje, que se
     * oye golpear sin ser un estruendo; flaps de motor eléctrico, que en su
     * clase es como se mueven; limpias, APU en la cola y packs.
     */
    ruidos: {
      tren: 0.55,
      flaps: "electricos",
      limpias: true,
      apu: true,
      aire: "packs",
      aislamiento: 0.7,
    },
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
    /*
     * **Y el timón de un birreactor de línea**, que no es el de una avioneta.
     * En 0,035 la Vmc salía a 154 nudos, por encima de su Vr: con un motor
     * parado en la carrera no habría habido velocidad a la que seguir recto, y
     * ese avión no se certifica. Un reactor de esta clase tiene la Vmc por los
     * ciento diez nudos —la de un 737 anda por ahí con el doble de empuje por
     * motor—, y el timón que la da es el doble: el que se mide en ellos,
     * seis o siete centésimas a fondo. Ver `vmc` en `velocidades-de-despegue.ts`.
     */
    cnRudder: 0.07,
    cnAileron: -0.002,
  },
};

/**
 * JAZ 120 *Yvága* — cuatrimotor de fuselaje ancho.
 *
 * El grande. *Yvága* es cielo.
 *
 * ## Vuela los números de un 747 de verdad
 *
 * Y no «parecidos»: la superficie alar, la envergadura, la cuerda media, la
 * masa y las tres inercias salen de la **NASA CR-2144** —*Aircraft Handling
 * Qualities Data*, Heffley y Jewell, 1972—, que publica el juego completo del
 * B-747 en dominio público, con su trirradial acotado y sus condiciones de
 * vuelo. <https://ntrs.nasa.gov/citations/19730003312>
 *
 *     S = 5.500 ft²   →  511,0 m²
 *     b = 195,68 ft   →   59,64 m
 *     c̄ = 27,31 ft   →    8,32 m
 *     W = 564.000 lb  →  255.826 kg   (configuración de aproximación)
 *     Ix = 13,7·10⁶ slug-ft²  →  18,57·10⁶ kg·m²
 *     Iy = 30,5·10⁶           →  41,35·10⁶
 *     Iz = 43,1·10⁶           →  58,44·10⁶
 *
 * Se toma **el peso de aproximación y no el nominal** —255 toneladas en vez de
 * 289— porque es la condición en la que este juego pasa el rato: un avión de
 * línea con el depósito lleno es un avión que no aterriza.
 *
 * Es lo mismo que se hizo con el entrenador y el Navion: los datos de vuelo de
 * un avión real son hechos publicados, y volarlos es lo que este juego promete
 * cuando dice que lo que se enseña es real. **Lo que no se copia es el rótulo
 * ni la joroba**, que es lo único reconociblemente suyo — un cuatrimotor de
 * fuselaje ancho sin joroba es el DC-8, el 707 o el A340, o sea una clase
 * entera y no una marca. Ver `CREDITOS.md`.
 *
 * ## Y lo que sí se ha elegido
 *
 * Las derivadas que el informe da en gráficas contra Mach se leen en el
 * extremo de baja velocidad, que es donde vuela esto: `clAlpha` a nivel del
 * mar y Mach bajo sale sobre 4,8, y `cdAlfa` alrededor de 0,5. El resto —los
 * amortiguamientos, la veleta, el efecto diedro— se escala desde el JAZ 90 con
 * el tamaño, y el banco de prestaciones comprueba que los cinco modos salen
 * donde tienen que salir.
 */
export const YVAGA: AircraftConfig = {
  id: "jaz-120",
  name: nombreEnteroDe("jaz-120"),
  descriptionKey: "aircraft.yvaga.description",
  mass: 255826,
  /*
   * **El 747 de un chárter lleno.** Con esto su vuelo típico sale con el peso
   * de la ficha, que es el de aproximación de la CR-2144 —564.000 lb, el
   * máximo al aterrizaje del 747-100—, y aterriza por debajo de él; la
   * diferencia con su avión vacío de clase son unas setenta toneladas de
   * pasaje y bodega. El vuelo más largo que tiene en el juego despega a 272 t,
   * lejos de sus 735.000 lb.
   */
  masaSinCombustible: 231600,
  wingArea: 511,
  wingSpan: 59.64,
  chord: 8.32,
  inertia: { xx: 18570000, yy: 41350000, zz: 58440000 },
  /*
   * Cuatro motores. El empuje de un 747 clásico son cuatro por 220 kN, o sea
   * 880 en total; aquí se pone lo que el modelo necesita para que el crucero
   * y el ascenso salgan donde tienen que salir, que con la caída de empuje de
   * `fdm.ts` es bastante menos. Lo eligió el banco, no una tabla.
   */
  /*
   * **Cuatro turbofanes de doscientos kilonewtons.**
   *
   * Son los del avión de la CR-2144, que monta JT9D-7: 205 kN cada uno al
   * despegue, 820 kN en total, relación empuje/peso 0,33. Estaba en 430.000 N
   * —0,171— y con eso el avión rodaba 3.185 m hasta la rotación y se iba del
   * suelo a los 4.404, más que la pista más larga del juego. No despegaba en
   * ningún escenario.
   */
  maxThrust: 820000,
  motores: 4,
  /*
   * **Convencionales, los del 747 clásico** del que salen sus números (NASA
   * CR-2144): de la cabina a los actuadores hidráulicos por cables, sin
   * ordenador en medio, con su compensador y su estabilidad de velocidad. El
   * primer Boeing con mandos eléctricos fue el 777, veinticinco años después,
   * y aun ése imita la estabilidad de velocidad. Ver `mandos` y
   * `flight/mano.ts`.
   */
  mandos: "convencionales",
  // Los de dentro a diez sesenta y los de fuera a veinte cuarenta: `MOTORES`
  // en su modelo.
  motoresA: [-20.4, -10.6, 10.6, 20.4],
  alturaCritica: null,
  helicesContrarrotativas: false,
  // La misma cuenta que el JAZ 90 con un fan de más de dos metros.
  motorParado: { molinete: 0.85, bandera: null, autoBandera: false },
  cruiseSpeed: 230,
  /*
   * Diez mil setecientos: treinta y cinco mil pies, que es donde la CR-2144
   * da los doscientos treinta metros por segundo de arriba. El techo de
   * servicio está más alto —trece mil setecientos— pero ahí ya no se cruza.
   */
  alturaDeCrucero: 10700,
  reglasDeVuelo: "instrumentos",
  /*
   * **Ocho coma nueve psi, los del 747**: con ellos la cabina queda por
   * debajo de ocho mil pies hasta su techo de cuarenta y cinco mil. Su aviso
   * de altitud de cabina **no habla**: en el 747 es una bocina intermitente,
   * como en el 737, y en un cuatrimotor de Airbus, un timbre. La luz roja sí,
   * y lo cuenta la instructora. Los aerofrenos de vuelo, con la misma
   * calibración que el JAZ 90: ver `despresurizacion.test.ts`.
   */
  presurizacion: { diferencialMaximo: 8.9 * PSI, topeDeCabina: OCHO_MIL_PIES, avisoHablado: false },
  aerofrenos: 0.02,
  /*
   * **Dieciséis ruedas con frenos, antideslizante y frenos de tierra**, y un
   * peso que no se para como el de un regional: un 747-400 a su peso máximo
   * de aterrizaje pide 1.900 m de pista, que son unos 1.140 de distancia de
   * verdad y, quitando el aire, una media de unas 0,36 g en la rodadura. Su
   * autofreno más fuerte para el avión a once pies por segundo al cuadrado,
   * 0,34 g, que es lo que dan sus frenos. Neumáticos a 200 psi.
   */
  frenos: { enSeco: 0.34, psi: 200, antideslizante: 0.8 },
  frenosDeTierra: { resistencia: 0.06, sustentacion: 0.7 },
  autofreno: true,
  // Los del Landing Roll de Boeing, como un 747. Ver `cantosDeLaCarrera`.
  cantosDeLaCarrera: "boeing",
  tcas: "TCAS II",
  avisosHablados: true,
  /*
   * **La de un 747-400 de verdad**, oída en su cabina: la transcripción del
   * registrador de voz del F-GITA, un 747-428 de Air France, en su toma de
   * Tahití —«(SV): One thousand… Five hundred… Four hundred… Three hundred…
   * Two hundred… One hundred… Fifty… Forty… Thirty… Twenty… Ten»— (BEA,
   * *Report on the accident to the Air France Boeing 747-428 B registered
   * F-GITA on September 13 1993*, anexo 4, pp. 72-73). Sin *twenty five
   * hundred*, que esa transcripción no recoge.
   */
  cuentaDeLaToma: [1000, 500, 400, 300, 200, 100, 50, 40, 30, 20, 10],
  cuentaSoloSinIls: false,
  // Como estaba: no se ha leído aquí una fuente del 747-400 que lo diga, y
  // queda por comprobar.
  cantaLosMinimos: true,
  /*
   * **Persiana, la de los cuatrimotores de verdad**, el 747 o el A340. Llevó las
   * electrocrómicas mientras no había otro avión que las llevara; con el JAZ 110,
   * que son suyas, vuelve a las de su generación: «así tendremos de los dos
   * tipos» (Enrique, 31-10-2026).
   */
  ventanillas: "persiana",
  /*
   * **Un metro y cuarenta por g**: treinta metros de semiala, pero con el
   * alargamiento de un 747, siete, que es un ala más corta y gruesa que la del
   * 787 —ver `alaQueSeDobla` en la ficha—. En crucero, la punta metro y medio
   * por encima de donde está en tierra. Y a 1,1 Hz, el extremo blando de la
   * horquilla, que es la más larga de la flota.
   */
  alaQueSeDobla: { porG: 1.4, hz: 1.1 },
  /*
   * Los del de fuselaje ancho, que son los del avión del que sale: 365 nudos y
   * Mach 0,92. Y es el único de la flota donde el cruce cae a una altura a la
   * que se vuela de verdad, que es lo que hace visible la lección.
   */
  vmoKt: 365,
  vleKt: 270,
  /*
   * La placa del 747-400 en sus muescas: 260 con cinco, 230 con veinte y 180
   * con treinta. Y su alivio de carga, que sube los de aterrizaje.
   */
  vfePorMuesca: [260, 230, 180],
  alivioDeFlaps: true,
  mmo: 0.92,
  // 1,3 veces la pérdida, como manda: con CLmax 1,4 pierde a 76 m/s.
  // Ciento cuarenta y seis nudos: 1,3 veces su pérdida con flaps, y lo que
  // dice el manual de vuelo de un 747 a este peso —145 a 150—. Estaba en 98
  // m/s, 191 nudos, que es 1,3 veces la pérdida **limpia**. Ver el Arai.
  approachSpeed: 75,
  /*
   * **Ciento ochenta nudos**: el viento en cola de un 747 se vuela con los
   * flaps a diez y a su velocidad de maniobra, Vref más veinte a cuarenta.
   * Cruza el umbral a 146 —categoría D, hasta 205— y no se pasa de la placa
   * de sus flaps de aterrizaje, que es la más baja.
   */
  velocidadDeCircuito: 180 * 0.514444,
  /*
   * **Ciento cuarenta y cinco nudos, la Vr de su peso**: 1,1 veces su pérdida
   * con los flaps de despegue, 132. Ver `VR_SOBRE_LA_PERDIDA`.
   *
   * Eran 167, la Vr de un 747-100 **a su peso máximo al despegar** puesta en una
   * ficha que pesa su máximo al aterrizar: por encima de la V2 que tiene a este
   * peso. Jenkinson, Simpkin y Rhodes, *Civil Jet Aircraft Design* (1999),
   * fichero de datos A, dan al 747-100 una V2 de 169 nudos a sus 340.195 kg; las
   * velocidades de despegue van con la raíz del peso, así que a las 255.826 de la
   * ficha son 147, y la Vr va por debajo. Con 145, la cuenta de todos los
   * motores por 1,15 da 1.715 m de pista, donde Boeing da unos 1.710 a este peso
   * (D6-58326, 3.3.1, 564.000 lb, nivel del mar y día estándar): dos fuentes
   * que no se conocen y dicen lo mismo. El hangar le pide 1.869, la de abortar
   * desde su V1, que es más larga: ver `acelerarYPararDeSuNorma`. La V1 baja de 155 a 140, y no más: su Vmc es de 139,5, y la V1 no
   * puede ir por debajo (CS 25.107 a; ver `vmc`) (H7, 13-11-2026).
   */
  decisionSpeed: 140 * 0.514444,
  rotationSpeed: 145 * 0.514444,
  batalla: 25.6,
  // 5,9: la panza a dos metros y medio largos y los motores de dentro a casi
  // un metro del suelo, como en un avión de esta clase. Con 5,2 las ruedas
  // quedaban tapadas por los motores y se leía «ruedas enterradas». Tiene que
  // decir lo mismo que `TREN` en `modelos/jaz-120-yvaga.py`.
  gearHeight: 5.9,
  // Apoyo al rotar: el eje de atrás del bogie de la panza, que es el que se
  // queda en la pista cuando el de las alas ya se levanta: 0,72 m por detrás de
  // su pata, que va 3,42 por detrás del centro de gravedad (`PATAS_PANZA` en
  // `modelos/jaz-120-yvaga.py`).
  mainWheelsAft: 4.14,
  // Y el peso, en las cuatro patas: el punto medio de las del ala, 0,32 m por
  // detrás del centro, y las de la panza, 3,42. Da un 7,3 % del peso en la de
  // morro sobre los 25,6 m de batalla. Era la décima de la batalla para todos,
  // 2,56 m.
  mainGearAft: 1.87,
  trenRetractil: true,
  // Veinte: igual que el de pasillo único. Un avión de línea no vuela con el
  // tren fuera más que los segundos de después del despegue.
  meteElTrenA: 20,
  /*
   * **Diez segundos, a salir y a entrar**: cinco patas, cuatro de ellas
   * principales de cuatro ruedas, con sus compuertas y su secuencia, tardan
   * algo más que las tres de un pasillo único. Estimación de su clase, por lo
   * mismo que en el JAZ 90: el tiempo de recorrido está en el manual de
   * mantenimiento, que no es público.
   */
  tardaElTren: { sale: 10, entra: 10 },
  /*
   * **Doce grados y medio, los que da Boeing para la cola de un 747**: «Tail
   * Strike Pitch Attitude 12.5» con los flaps a diez y a veinte, y una actitud de
   * diez grados al irse del suelo, 10,1 y 10,0 (D. Carbaugh, «Tail Strikes:
   * Prevention», *AERO* QTR_01 2007, figura 1). La tabla es del 747-400, que
   * tiene el mismo fuselaje de setenta metros y el mismo tren que el -100: el
   * -400 alargó la cubierta de arriba, no el avión.
   *
   * Eran 8,6°, sin fuente: con ellos la cola tocaba antes de la actitud a la que
   * se va del suelo, el avión volado no se separaba hasta 1,12 veces su Vr y
   * despegaba un 7 % más largo que la cuenta del hangar (H7b, 13-11-2026).
   */
  maxGroundPitch: 12.5 * (Math.PI / 180),
  // 25 m de morro y quince centímetros: 0,34°.
  minGroundPitch: -0.006,
  // Triple ranura y Krueger: un ala de línea saca mucho más CL que una
  // avioneta, y es lo que le permite entrar a 98 y no a 140.
  // Lo mismo que el Arai, y por lo mismo. Ver su ficha.
  llevaFlaps: true,
  flapsLift: 1.0,
  flapsDrag: 0.065,
  // Cinco, veinte y treinta: los de un cuatrirreactor de fuselaje ancho, con
  // el recorrido más largo de la flota. Ocho segundos por muesca.
  muescasDeFlaps: [0, 5, 20, 30],
  tardanLosFlaps: 24,
  appearance: {
    // La librea de la casa, con los motores del color del casco y las aletas
    // partidas en terracota, como en su ilustración. Iba de verde, con la
    // raya y los motores en ocre, para no confundirse con el JAZ 90 en la
    // fila; lo que los separa son los cuatro motores y la aleta partida.
    ...LIBREA,
    blades: 0,
    motivo: "sol",
  },
  sound: {
    engine: "turbofan",
    cylinders: 0,
    // Las cuarenta y seis palas del fan de un JT9D, que son sus motores.
    palasDeFan: 46,
    /*
     * Un JT9D gira su fan entre unas mil al ralentí y tres mil seiscientas al
     * despegue. Con cuarenta y seis palas, de 767 a 2.760 hercios: el silbido
     * grave y lleno de un cuatrimotor grande. Con las 9.500 que había puestas,
     * el tono llegaba a 7.283 y eso no es un avión, es un chillido.
     */
    idleRpm: 1000,
    maxRpm: 3600,
    growlHz: 360,
    growlRise: 620,
    /*
     * El cuatrimotor: tren enorme, pero bajo un suelo grueso y un forro hecho
     * para no oírlo, así que se nota más que se oye. Flaps hidráulicos, que
     * es como se mueven los de su tamaño, limpias, APU y packs.
     */
    ruidos: {
      tren: 0.5,
      flaps: "hidraulicos",
      limpias: true,
      apu: true,
      aire: "packs",
      aislamiento: 0.8,
    },
  },
  aero: {
    cl0: 0.2,
    // Leído de la gráfica del informe en el extremo de Mach bajo, nivel del
    // mar: la curva arranca en 4,7-4,8 y cae al acercarse a Mach 0,8.
    clAlpha: 4.8,
    alphaStall: 0.25, // ~14°
    cd0: 0.017,
    oswald: 0.8,
    cyBeta: -0.9,
    cm0: 0.04,
    cmAlpha: -0.75,
    cmQ: -22,
    cmElevator: 0.42,
    clBeta: -0.09,
    clP: -0.45,
    clAileron: 0.035, // ~25 °/s, que es lo que rueda un avión de este tamaño.
    cnBeta: 0.13,
    cnR: -0.26,
    cnRudder: 0.04,
    cnAileron: -0.002,
  },
};

/**
 * JAZ 110 *Tijereta* — bimotor de fuselaje ancho.
 *
 * El del vuelo largo. La tijereta es el ave que se va del Paraguay en invierno y
 * vuelve en primavera.
 *
 * ## Vuela los números de un 787-9 de verdad
 *
 * Con la fuente al lado de cada uno, y lo que no tiene fuente dice «por
 * verificar». Las dos que mandan:
 *
 * - **EASA, TCDS IM.A.115**, edición 30 (17-12-2025), sección 2: masas,
 *   combustible, VMO/MMO, techo, motores, salidas y la cuerda media.
 * - **Boeing, D6-58333 rev. Q** (octubre de 2025), *787 Airplane Characteristics
 *   for Airport Planning*: lo que se mide con una cinta y las pistas que pide.
 *
 * Y la cabina a seis mil pies, de la página del propio fabricante, *787
 * Dreamliner by design*.
 *
 * **Lo que no se copia es el rótulo ni la cara**, igual que con el grande: un
 * bimotor de fuselaje ancho es una clase entera. Ver `flota.ts` y
 * `modelos/jaz-110-tijereta.py`.
 */
export const TIJERETA: AircraftConfig = {
  id: "jaz-110",
  name: nombreEnteroDe("jaz-110"),
  descriptionKey: "aircraft.tijereta.description",
  /*
   * **192.776 kg, el máximo al aterrizaje de la hoja de tipo** (425.000 lb), como
   * el grande, que lleva el de su clase. Es con la que Boeing da las pistas de
   * abajo, y con la que la FAA da su Vref.
   */
  mass: 192776,
  /*
   * **Por debajo de sus 181.436 kg de máximo sin combustible** (TCDS, 13): 290
   * personas (D6-58333, 2.1.2) a los 84 kg de un adulto en Europa más once de
   * bodega, y la carga de la bodega de un vuelo así. Cuánto pesa vacío no lo da
   * ni la hoja de tipo ni el D6-58333: **por verificar**. Con ellos, las 4.962
   * millas de Madrid a Asunción salen, a ojo en la gráfica de alcance de Boeing
   * (3.2.2), con unas 245 t al soltar frenos, por debajo de su máximo.
   */
  masaSinCombustible: 175000,
  /*
   * **Los 101.085 kg utilizables de la hoja de tipo** (TCDS, 9: 126.356 l). Boeing
   * da 73 l más; manda la hoja de tipo. Es lo que cabe y no lo que se carga: ver
   * `loQueCabe`.
   */
  combustibleUtilizable: 101085,
  /*
   * **377 m²: por verificar.** No sale ni en la hoja de tipo ni en el D6-58333, y
   * es la cifra que circula para el ala «bruta». Dos cosas la sostienen: la
   * envergadura por la cuerda media de la hoja de tipo da justo eso, y las cuerdas
   * medidas en el dibujo de Boeing, contando lo que cruza el fuselaje, 381.
   */
  wingArea: 377,
  // 60,12 m: 197 ft 3 in, en la hoja de tipo y en el D6-58333, 2.2.2.
  wingSpan: 60.12,
  /*
   * **8,37 m, la cuerda media del ala de esos 377 m²**, medida sobre el dibujo en
   * planta de Boeing (2.2.2): el ala con su raíz entera. La de la hoja de tipo,
   * 6,27 m (TCDS, 16), es la de su ala de referencia, otra más pequeña, y con ella y
   * esta superficie el avión tenía un tercio menos de brazo para todo lo que mueve
   * el morro: no rotaba hasta cinco segundos después de tirar.
   */
  chord: 8.37,
  /*
   * **Escaladas desde la NASA CR-2144**, con la masa y el tamaño: el balanceo con
   * la envergadura al cuadrado, el cabeceo con el largo al cuadrado y la guiñada
   * con la suma de los dos. Son las del JAZ 120 —su masa, 59,64 m de ala y 70,66 de
   * largo— llevadas a estos.
   */
  inertia: { xx: 14220000, yy: 24620000, zz: 38940000 },
  /*
   * **Dos de 321,6 kN**: GEnx-1B70 en la hoja de tipo, y un Trent de la misma
   * horquilla, de 307,8 a 347,5 kN. Es lo que Boeing llama empuje típico en sus
   * gráficas de pista —cuál es, no lo dice: **por verificar**—. Con él, a este peso
   * el juego pide 1.950 m de pista, donde su gráfica da unos 1.800 (3.3.9); y a su
   * máximo al despegue, 2.640 donde da unos 3.030.
   */
  maxThrust: 643200,
  motores: 2,
  /*
   * **Convencionales para quien vuela**, aunque vayan por cable: el Boeing de
   * mandos eléctricos imita la estabilidad de velocidad, que es lo que este juego
   * llama convencionales. Suelto, el avión vuelve a la velocidad compensada. Ver
   * `mandos` y `flight/mano.ts`. Por verificar en su manual; lo del 777, en el
   * JAZ 120.
   */
  mandos: "convencionales",
  // A 9,91 m del eje (D6-58333, 2.2.2): `MOTOR` en su modelo.
  motoresA: [-9.91, 9.91],
  alturaCritica: null,
  helicesContrarrotativas: false,
  // La misma cuenta de Torenbeek que los demás, con un fan de casi tres metros.
  motorParado: { molinete: 1.1, bandera: null, autoBandera: false },
  /*
   * **Mach 0,85**, el de la gráfica de alcance de Boeing (D6-58333, 3.2.2): 251 m/s
   * de verdadera arriba. A treinta y nueve mil pies, en la mitad de los niveles
   * pares de ese vuelo.
   */
  cruiseSpeed: 251,
  alturaDeCrucero: 11887,
  reglasDeVuelo: "instrumentos",
  /*
   * **La cabina a seis mil pies**: «maintain pressurization at an altitude of
   * 6,000-feet (2,000 feet lower than conventional jets)» (Boeing, *787 Dreamliner
   * by design*). Y el diferencial sale de ahí: seis mil pies a los 43.100 de su
   * techo son 9,44 psi. **Por verificar** contra su manual.
   *
   * El aviso, sin voz: no se ha leído fuente de que hable, y lo cuenta la
   * instructora. Por verificar. Los aerofrenos, con la misma calibración que sus
   * hermanos: ver `despresurizacion.test.ts`.
   */
  presurizacion: { diferencialMaximo: 9.45 * PSI, topeDeCabina: 6000 * 0.3048, avisoHablado: false },
  aerofrenos: 0.02,
  /*
   * **Ocho ruedas con frenos de carbono**, antideslizante y frenos de tierra, y
   * 229 psi en los neumáticos (D6-58333, 7.2). Calibrados con su pista: 1.800 m de
   * pista de aterrizaje en seco a su peso máximo con los flaps a 30 (3.4.3), que
   * son 1.080 de distancia de verdad y, quitando el aire, unos 730 de rodadura;
   * aquí rueda 664. Por debajo de eso sería más freno que el autofreno.
   */
  frenos: { enSeco: 0.35, psi: 229, antideslizante: 0.8 },
  frenosDeTierra: { resistencia: 0.06, sustentacion: 0.7 },
  autofreno: true,
  // Los del Landing Roll de Boeing. Ver `cantosDeLaCarrera`.
  cantosDeLaCarrera: "boeing",
  tcas: "TCAS II",
  avisosHablados: true,
  /*
   * **Por verificar.** La cuenta es un menú que elige cada operador y no se ha
   * leído la de esta clase; es la de los Boeing de ahora, con su *twenty five
   * hundred*.
   */
  cuentaDeLaToma: [2500, 1000, 500, 100, 50, 40, 30, 20, 10],
  cuentaSoloSinIls: false,
  cantaLosMinimos: true,
  /*
   * **Las que se oscurecen solas**: «electronically dimmable windows» (Boeing, *787
   * Dreamliner by design*), en cinco pasos y con mando de la tripulación (PPG y
   * Gentex, sus fabricantes, 2005 y 2007). Y de 27 × 47 cm en su modelo.
   */
  ventanillas: "electrocromica",
  disposicionDelPasaje: "3-3-3",
  /*
   * **La cifra del ensayo, sin escalar**, porque es la suya: unos 7,6 m de punta a
   * 3,75 g, ver `alaQueSeDobla` arriba. Y a 1,1 Hz, el extremo blando de la
   * horquilla de Airbus, que es un ala larga y flexible.
   */
  alaQueSeDobla: { porG: 2.03, hz: 1.1 },
  // 350 KEAS y Mach 0,90 (TCDS, 10). A nivel del mar, los KEAS son indicados.
  vmoKt: 350,
  /*
   * **Por verificar**, las dos: la hoja de tipo las deja al manual de vuelo, que no
   * es público, y no se ha encontrado otra fuente. Son una estimación de su clase, a
   * la altura de sus hermanos y con la de aterrizaje con margen sobre la Vref.
   */
  vleKt: 270,
  vfePorMuesca: [235, 195, 170],
  alivioDeFlaps: true,
  mmo: 0.9,
  /*
   * **Ciento cuarenta y cuatro nudos, categoría D**: la fila B789 de la *Aircraft
   * Characteristics Database* de la FAA (2025). El D6-58333 no la da.
   */
  approachSpeed: 144 * 0.514444,
  /*
   * **Ciento sesenta y cinco nudos**: Vref más veintiuno, la de maniobra con los
   * flaps del viento en cola, en categoría D y por debajo de la placa de sus flaps
   * de aterrizaje, que es la que manda.
   */
  velocidadDeCircuito: 165 * 0.514444,
  /*
   * **Ciento cincuenta nudos, la Vr de su tipo a su peso**: la AAIB da al
   * VH-ZND, un 787-9 con los flaps a cinco y 253.400 kg, «VR was 172 kt»
   * (*Bulletin* 11/2020); con la raíz de la masa, a los 192.776 kg de la ficha
   * son 150. La V1 sube en la misma proporción, de 129 a 140.
   *
   * Eran 138, la regla de 1,1 veces su pérdida con los flaps de despegue (ver
   * `VR_SOBRE_LA_PERDIDA`), y con ella el avión no podía irse del suelo a su
   * Vr: le pedía 11,6° y su cola le deja 9,7. Despegaba volando un 10,7 % más
   * largo que la cuenta del hangar; con la de su tipo, un 1,7 %, y se va del
   * suelo a 7,7°, donde el boletín dice «between 6° and 7.5°». El hangar pide
   * 1.826 m, la de abortar desde su V1, donde la gráfica de Boeing da 1.800
   * (D6-58333, 3.3.9). Ver la enmienda H10b del ADR 0027.
   */
  decisionSpeed: 140 * 0.514444,
  rotationSpeed: 150 * 0.514444,
  // 84 ft 9 in (D6-58333, 2.2.2).
  batalla: 25.83,
  // Con ella la panza queda a 1,86 m del suelo y el lomo a 7,80, los de 2.3.2. Tiene
  // que decir lo mismo que `TREN` en `modelos/jaz-110-tijereta.py`.
  gearHeight: 4.8,
  // Apoyo al rotar: el eje de atrás del bogie, 0,76 m por detrás de la pata,
  // que va 1,80 por detrás del centro de gravedad (`PATA_Z` en
  // `modelos/jaz-110-tijereta.py`).
  mainWheelsAft: 2.56,
  // Y el peso, en el centro del bogie: la pata. Un 7 % en la de morro sobre su
  // batalla; era la décima de ella para todos, 2,58 m.
  mainGearAft: 1.8,
  trenRetractil: true,
  meteElTrenA: 20,
  // Tres patas grandes: entre sus dos hermanos. Estimación de su clase, por lo
  // mismo que en ellos: el tiempo está en el manual de mantenimiento.
  tardaElTren: { sale: 9, entra: 9 },
  /*
   * **Nueve grados y siete décimas, lo que da Boeing para su cola**: «The pitch
   * attitude for tail contact is 9.7° with wheels on the runway and landing gear
   * struts extended», en un 787-9 con los flaps a cinco, y se va del suelo
   * normalmente entre 6° y 7,5° (AAIB, *Bulletin* 11/2020, VH-ZND, citando al
   * fabricante y su manual de entrenamiento).
   *
   * Eran 8,5°, medidos en el dibujo de 2.2.2 del D6-58333 y por verificar: la
   * panza empieza a subir a dieciséis metros por detrás de la pata, y en el
   * dibujo no se ve dónde la para el asfalto (H7b, 13-11-2026).
   */
  maxGroundPitch: 9.7 * (Math.PI / 180),
  // 25,8 m de morro y quince centímetros: 0,33°.
  minGroundPitch: -0.006,
  llevaFlaps: true,
  /*
   * **Lo que da 144 nudos con este ala y este peso**: un CL máximo de 2,5, lo de un
   * reactor de línea con todo fuera. Ver el Arai.
   */
  flapsLift: 0.82,
  flapsDrag: 0.065,
  /*
   * Cinco, veinte y treinta: tres de los de su palanca. Los de aterrizaje de la
   * gráfica de Boeing son 25 y 30 (3.4). Ocho segundos por muesca, por verificar.
   */
  muescasDeFlaps: [0, 5, 20, 30],
  tardanLosFlaps: 24,
  appearance: {
    // La librea de la casa, con las góndolas del color de la franja y la panza
    // verde: la del retrato aprobado. Ver su modelo.
    ...LIBREA,
    blades: 0,
    motivo: "sol",
  },
  sound: {
    engine: "turbofan",
    cylinders: 0,
    /*
     * **Dos turbofanes grandes de mucho flujo secundario, más graves y más callados
     * por dentro que los cuatro del grande.** Veinte palas y unas dos mil setecientas
     * vueltas de fan a fondo, las de un Trent 1000: **por verificar**. De 200 a 900
     * hercios: un fan enorme que gira despacio, donde el JT9D del grande va de 767 a
     * 2.760.
     */
    palasDeFan: 20,
    idleRpm: 600,
    maxRpm: 2700,
    growlHz: 300,
    growlRise: 520,
    /*
     * Tren grande bajo un suelo grueso, flaps hidráulicos, limpias, APU y aire de
     * compresores eléctricos, que por dentro suenan a packs: **sin aire sangrado**,
     * la hoja de tipo dice «no bleed-air APU». Y el forro del tubo más silencioso de
     * la flota.
     */
    ruidos: {
      tren: 0.5,
      flaps: "hidraulicos",
      limpias: true,
      apu: true,
      aire: "packs",
      aislamiento: 0.88,
    },
  },
  aero: {
    /*
     * Más que el grande: mucho más alargamiento y algo menos de flecha, con su
     * pérdida limpia por los 140 nudos a este peso y un crucero a tres grados de
     * ángulo de ataque. **Del orden de su clase**, como los de sus hermanos: los
     * coeficientes de un avión de este siglo no se publican.
     */
    cl0: 0.3,
    clAlpha: 5.2,
    alphaStall: 0.27, // ~15,5°
    /*
     * Fineza máxima en torno a dieciocho, con su alargamiento de 9,6. En crucero de
     * verdad anda algo más alto; con más, el fugoide casi no se amortigua y el avión
     * no se queda donde se le deja.
     */
    cd0: 0.018,
    oswald: 0.8,
    cyBeta: -0.9,
    /*
     * **El cabeceo, el de un fuselaje ancho medido**: el 747 de la NASA CR-2144 en
     * aproximación (tabla IX-2: nivel del mar, 165 nudos), que es el de su clase
     * con las derivadas publicadas. Los de este siglo no las publican, así que el
     * suyo sigue **por verificar**; lo que se copia es el orden de magnitud de un
     * avión de verdad de este tamaño, y no el de uno que no es de su tamaño.
     *
     * - `cmAlpha`, −1,26, tal cual.
     * - `cmElevator`, −1,34 por radián con unos veintitrés grados de elevador a
     *   fondo —el recorrido, **por verificar**—: 0,54.
     * - `cm0`, el que deja con la palanca en el centro el mismo ángulo de antes,
     *   tres grados: no es del avión, es de dónde se le compensa.
     *
     * Estaban en −0,75 y 0,40, escalados desde el JAZ 90. Con eso su morro
     * respondía más despacio de lo que responde uno de su tamaño —el corto período
     * a la Vref en 0,77 rad/s, donde con estos va a 0,90 y el JAZ 90 a 1,35—, y el
     * automático lo columpiaba: un golpe de aire en la senda seguía yendo y
     * viniendo a ±3,8 m/s un minuto después, y este avión no aterrizaba en el
     * banco. Lo de frenar no era: nivelado, al ralentí, con tren y todos los
     * flaps, va de 200 a 144 nudos en 23 segundos. Ver también
     * `AUTORIDAD_SUFICIENTE` en `piloto-automatico.ts`, que es la otra mitad.
     */
    cm0: 0.0672,
    cmAlpha: -1.26,
    cmQ: -22,
    cmElevator: 0.54,
    clBeta: -0.09,
    clP: -0.45,
    clAileron: 0.035, // ~25 °/s, lo del grande.
    cnBeta: 0.13,
    cnR: -0.26,
    /*
     * Con el doble de timón que su hermano mayor: un motor grande muy lejos del eje,
     * y uno solo al otro lado. Ver `vmc`.
     */
    cnRudder: 0.07,
    cnAileron: -0.002,
  },
};

export const AIRCRAFT: readonly AircraftConfig[] = [
  PYKASU,
  MAINUMBY,
  PANAMBI,
  ARASUNU,
  ARAI,
  TIJERETA,
  YVAGA,
];

/**
 * Y los que están hechos pero todavía no vuelan. Hoy, ninguno.
 *
 * La lista se queda porque el caso se va a repetir: un avión puede estar
 * terminado y medido y aun así no salir —un nombre por decidir, una silueta
 * que todavía no convence—, y el banco de prestaciones lo mide igual. Un avión
 * terminado tiene que estar comprobado aunque le falte el rótulo. Ver
 * `prestaciones.test.ts`.
 */
export const RESERVADOS: readonly AircraftConfig[] = [];

export function aircraftById(id: string): AircraftConfig {
  const found = AIRCRAFT.find((a) => a.id === id);
  if (!found) throw new Error(`Aeronave desconocida: ${id}`);
  return found;
}
