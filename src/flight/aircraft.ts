import { FLOTA, nombreEntero } from "./flota";
import type { EquipoTcas } from "./tcas";
import type { FrenosDelTipo } from "./frenada";
import type { TardaElTren } from "./tren";

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
   * Colores del fuselaje, del capó y de los detalles.
   *
   * El capó es más que el capó: es la franja del costado, las góndolas de
   * los motores y el estabilizador de una cola en T. Y los detalles son la
   * raya fina que acompaña a la franja. Todos salen de `CASA`: ver allí.
   */
  body: number;
  accent: number;
  trim: number;
  /**
   * **El color de la deriva, si no es el del capó.**
   *
   * Hasta ahora la cola iba siempre del color de la franja, y con tres
   * colores de marca eso deja muy pocas maneras de que dos aviones vecinos de
   * la fila no sean el mismo avión: en una cola solo se leen el terracota y
   * el verde —el sol es ocre—, así que franja y cola juntas daban dos
   * aviones. Con la cola aparte sale la librea de una compañía de verdad
   * —franja de un color, cola de otro— sin salir de la paleta.
   */
  cola?: number;
  /**
   * **El tercer color de la casa, si el avión lleva sitio para él**: las
   * aletas de las puntas de ala y el filete que va con la franja. Lo pinta
   * el material `remate` del modelo —ver `exterior.py`—, y sin esto sale del
   * color del capó.
   *
   * Existe por el JAZ 120, que iba de verde con raya ocre y era el único de
   * la casa sin terracota en ninguna parte: «se echa de menos el terracota: el
   * logo de Granja Óga lo lleva y es un color fundamental». Con franja, raya y
   * cola ya repartidas, el tercero no tenía dónde ir.
   */
  remate?: number;
  /** Cuántas palas lleva la hélice. */
  blades: number;
  /**
   * **El motivo de la casa en la cola**, en los que lo llevan. Ver
   * `world/librea.ts`.
   *
   * No lo lleva toda la flota, y no por pereza: los que llevan pasaje van
   * vestidos de compañía —el sol entre las hojas en la deriva y la firma
   * junto a la puerta—, y una avioneta de escuela o un fumigador no se
   * visten así en ningún sitio del mundo. El `.glb` dice en qué superficie
   * va (su material `cola`); esto dice qué lleva.
   */
  motivo?: MotivoDeCola;
}

/**
 * Qué lleva la deriva.
 *
 * - `sol-y-hojas`: el sol del logotipo entre sus dos hojas, sobre la cola del
 *   color del avión. El de los aviones de línea.
 * - `sol`: el sol solo, naciendo en la raíz. Para una cola que ya es verde,
 *   donde las hojas no se verían: la deriva misma hace de hoja.
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
 * Así que la variedad no sale de añadir colores sino de **repartir los
 * mismos**: qué va en la cola, qué en la franja y qué en la raya. Cada avión
 * es distinto del de al lado en la fila del hangar y todos son de la misma
 * casa. Una prueba —`librea.test.ts`— comprueba que ningún avión se sale.
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
 */
export function tieneReversa(a: AircraftConfig): boolean {
  return a.sound.engine === "turbofan" || a.sound.engine === "turboprop";
}

/**
 * **Lo que da el motor con este aire**, como fracción de lo que da al nivel
 * del mar en un día estándar: la densidad a la 0,7, la ley de los libros de
 * proyecto para el empuje de una turbina y, en primera aproximación, para la
 * potencia de un motor de pistón. Ver el ADR 0011.
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
 * esta le deja el 81 %—. No se usa aquí porque el JAZ 40 tiene su crucero a
 * 5.500 m, que es el de un bimotor con turbocompresor, y con la ley del
 * atmosférico casi no llegaría: primero hay que decidir qué motor lleva. Ver
 * el ADR 0012.
 */
export function loQueDaElMotor(_ac: AircraftConfig, sigma: number): number {
  return Math.pow(Math.max(0, sigma), 0.7);
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
  /** Velocidad de crucero de referencia, m/s. Modula la caída de empuje. */
  cruiseSpeed: number;
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
   * **Qué TCAS lleva, si lleva alguno.** `null` si ninguno.
   *
   * El TCAS es el aparato que escucha los transpondedores de los aviones de
   * alrededor, los pinta en la pantalla de navegación y avisa —*traffic,
   * traffic*— cuando uno se acerca de verdad. Y no lo lleva todo el mundo: lo
   * lleva quien la norma obliga a llevarlo, que es justo lo que hay que poder
   * reconocer el día que se suba uno a una cabina.
   *
   * - **TCAS II** en los dos reactores. La OACI obliga a llevar ACAS II a todo
   *   avión de turbina de más de 5 700 kg o con más de diecinueve pasajeros
   *   (Anexo 6, parte I; en Europa, Reglamento 1332/2011). Da el aviso de
   *   tráfico y además la maniobra para apartarse, el RA.
   * - **TCAS I** en el turbohélice de diecinueve plazas. Con 5 600 kg y
   *   diecinueve asientos se queda justo debajo de la raya de la OACI, y lo
   *   que lleva un avión así es lo que exige la norma de EE. UU. para los de
   *   turbina de pasaje de diez a treinta plazas (14 CFR 135.180): el TCAS I,
   *   que **solo avisa** —el tráfico, dónde y a qué altura— y no da maniobra.
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
  tcas: null,
  avisosHablados: false,
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
  trenRetractil: false,
  // Tren fijo: un entrenador de escuela lleva las patas al aire a propósito.
  meteElTrenA: null,
  tardaElTren: null,
  maxGroundPitch: 0.21, // 12°
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
    body: 0xe4e2da,
    accent: CASA.terracota,
    trim: CASA.verde,
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
  name: nombreEntero(FLOTA[1]!),
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
  tcas: null,
  avisosHablados: false,
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
  batalla: 5.4,
  gearHeight: 1.8,
  trenRetractil: false,
  // Tren fijo: un fumigador trabaja bajo y no le compensa el peso ni la avería.
  meteElTrenA: null,
  tardaElTren: null,
  maxGroundPitch: 0.26, // 15°: es un patín de cola, se apoya de morro arriba
  // Patín de cola: se apoya de morro arriba, y bajarlo
  // clava la hélice. Poco juego a propósito.
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
    // Biplano de trabajo: dos alas, ocre y verde, hélice de tres palas. Y la
    // raya en terracota, que era un marrón de fuera de la paleta: así lleva
    // los tres colores del logotipo, que para el avión de la granja es lo
    // suyo.
    body: CASA.ocre,
    accent: CASA.verde,
    trim: CASA.terracota,
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
  name: nombreEntero(FLOTA[2]!),
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
  cruiseSpeed: 80,
  // Cinco mil quinientos: un bimotor de pistón sin presurizar vuela sus etapas
  // ahí arriba, con oxígeno a bordo.
  alturaDeCrucero: 5500,
  reglasDeVuelo: "instrumentos",
  // Sin presurizar, como los bimotores de pistón de su clase: por encima de
  // los tres mil ochocientos metros se vuela con la máscara de oxígeno puesta.
  presurizacion: null,
  aerofrenos: null,
  // Frenos de bimotor ligero, sin antideslizante: como la avioneta.
  frenos: { enSeco: 0.35, psi: 55, antideslizante: 0.5 },
  frenosDeTierra: null,
  autofreno: false,
  tcas: null,
  avisosHablados: false,
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
  batalla: 2.8,
  gearHeight: 1.6,
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
  maxGroundPitch: 0.19, // 11°
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
    // Blanco de compañía con la franja de la casa: es un avión de trabajo que
    // lleva gente, y se pinta como se pintan ésos.
    body: 0xecece6,
    accent: CASA.verde,
    trim: CASA.terracota,
    blades: 3,
    // La cola ya es verde: lleva el sol solo, naciendo en la raíz.
    motivo: "sol",
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
  /*
   * La carga con la que el vuelo más largo que tiene en el juego —de
   * Pettirossi a Estigarribia, 784 kg de combustible— despega justo con las
   * 12.500 lb del Twin Otter, que es su peso. Su vuelo típico sale a 5,3 t.
   */
  masaSinCombustible: 4886,
  wingArea: 39.0,
  wingSpan: 19.8,
  chord: 2.0,
  // Escaladas por masa y envergadura con la proporción que comparten el Navion
  // y los tres de la flota: `Ixx ≈ 0,012·m·b²`.
  inertia: { xx: 26000, yy: 32000, zz: 52000 },
  maxThrust: 14000,
  motores: 2,
  // Cables, como el Beech 1900D y el Twin Otter de su clase: ninguno de los
  // dos lleva mandos eléctricos. Ver `mandos`.
  mandos: "convencionales",
  cruiseSpeed: 90,
  // Siete mil seiscientos: veinticinco mil pies, el techo de servicio típico de
  // un turbohélice regional presurizado.
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
  presurizacion: { diferencialMaximo: 5.0 * PSI, avisoHablado: false },
  aerofrenos: null,
  /*
   * **Los frenos de un turbohélice de cercanías**: algo más que una avioneta,
   * con el antideslizante que el 1900D lleva como opción. Lo que le quita la
   * pista de verdad es la hélice en reversa —ver `tieneReversa`—; ni frenos de
   * tierra ni autofreno, que no los lleva ningún avión de su clase.
   */
  frenos: { enSeco: 0.38, psi: 100, antideslizante: 0.5 },
  frenosDeTierra: null,
  autofreno: false,
  // Diecinueve plazas y 5 600 kg: debajo de la raya del ACAS II. Ver `tcas`.
  tcas: "TCAS I",
  avisosHablados: true,
  // Persiana de plástico, como cualquier turbohélice regional.
  ventanillas: "persiana",
  // Turbohélice de línea corta: rápido abajo y con techo de treinta mil.
  vmoKt: 250,
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
  mmo: 0.55,
  approachSpeed: 48,
  // 120 nudos: Vref más veintisiete, con los flaps de aproximación; su
  // categoría, la B, deja hasta 135.
  velocidadDeCircuito: 120 * 0.514444,
  decisionSpeed: 38,
  rotationSpeed: 41,
  batalla: 7.21,
  gearHeight: 2.2,
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
  maxGroundPitch: 0.17, // 10°: la cola en T no perdona rotar de más.
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
    body: 0xecece6,
    // La franja, las góndolas y la T de la cola en ocre, y la deriva en
    // terracota con el sol entre las hojas: entre el verde del JAZ 40 y el
    // terracota del JAZ 90, que así no se confunde con ninguno de los dos.
    // Se probó con la franja verde, y la T de la cola desaparecía contra el
    // fondo oscuro del hangar.
    accent: CASA.ocre,
    trim: CASA.verde,
    cola: CASA.terracota,
    blades: 4,
    motivo: "sol-y-hojas",
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
  name: nombreEntero(FLOTA[4]!),
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
  presurizacion: { diferencialMaximo: 8.4 * PSI, avisoHablado: true },
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
  tcas: "TCAS II",
  avisosHablados: true,
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
  decisionSpeed: 72,
  rotationSpeed: 78,
  batalla: 11.5,
  // 3,35: la panza a metro setenta del asfalto y las góndolas a medio metro,
  // que es como va un reactor de esta clase. Con 2,8 la panza quedaba a metro
  // escaso y el tren apenas asomaba bajo el motor: «ruedas enterradas». Tiene
  // que decir lo mismo que `TREN` en `modelos/jaz-90-arai.py`.
  gearHeight: 3.35,
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
  maxGroundPitch: 0.16, // 9°: con un fuselaje largo, la cola llega antes.
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
    body: 0xf2f1ec,
    accent: CASA.terracota,
    trim: CASA.verde,
    blades: 0,
    motivo: "sol-y-hojas",
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
    cnRudder: 0.035,
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
  name: nombreEntero(FLOTA[5]!),
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
  presurizacion: { diferencialMaximo: 8.9 * PSI, avisoHablado: false },
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
  tcas: "TCAS II",
  avisosHablados: true,
  /*
   * **Electrocrómicas**, como las de los largos radios de esta generación —el
   * 787 y el 777X—, que son los que llevan ventanillas tan grandes como estas
   * (36 × 52 cm en el modelo). Los cuatrimotores de antes, el 747 o el A340,
   * llevan persiana: si este se quisiera de aquella generación, es esta línea.
   */
  ventanillas: "electrocromica",
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
  decisionSpeed: 80,
  rotationSpeed: 86,
  batalla: 25.6,
  // 5,9: la panza a dos metros y medio largos y los motores de dentro a casi
  // un metro del suelo, como en un avión de esta clase. Con 5,2 las ruedas
  // quedaban tapadas por los motores y se leía «ruedas enterradas». Tiene que
  // decir lo mismo que `TREN` en `modelos/jaz-120-yvaga.py`.
  gearHeight: 5.9,
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
  maxGroundPitch: 0.15, // 8,6°: un fuselaje de setenta metros toca antes.
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
    body: 0xf2f1ec,
    // El de la flota que más se ve, en el verde de las hojas: motores,
    // franja y cola, con la raya ocre. Al lado del JAZ 90, que va de
    // terracota, no se confunden ni de lejos. Y en la cola verde, el sol solo
    // naciendo en la raíz: las hojas verdes sobre verde no se verían.
    accent: CASA.verde,
    trim: CASA.ocre,
    // Y el terracota, que es el que faltaba: en las aletas partidas de las
    // puntas, que es donde una compañía pone su color, y en un filete entre
    // la franja y la raya —los tres colores del logotipo en fila—.
    remate: CASA.terracota,
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

export const AIRCRAFT: readonly AircraftConfig[] = [
  PYKASU,
  MAINUMBY,
  PANAMBI,
  ARASUNU,
  ARAI,
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
