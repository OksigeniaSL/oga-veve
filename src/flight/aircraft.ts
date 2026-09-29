import { FLOTA, nombreEntero } from "./flota";
import type { EquipoTcas } from "./tcas";

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
   * **Lo que frena un motor parado**, como área equivalente: `D = q·A`, m².
   * Ver `MotorParado`.
   */
  motorParado: MotorParado;
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
   * Si la cabina va soplada a presión.
   *
   * No es un detalle de ficha: **es lo que decide a qué altura puede ir la
   * gente de dentro**. Un avión sin presurizar no sube por encima de unos
   * tres mil metros porque allí el aire ya no da, y uno presurizado cruza a
   * diez mil con la cabina a dos mil cuatrocientos. Es la misma razón por la
   * que sus `alturaDeCrucero` son las que son.
   *
   * Ver `flight/cabina-presurizada.ts`, que es donde se convierte en un
   * número que se puede leer en el cuadro.
   */
  presurizada: boolean;
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
  motoresA: [0],
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
  presurizada: false,
  tcas: null,
  avisosHablados: false,
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
  motores: 1,
  motoresA: [0],
  // La hélice grande del radial, de paso fijo: más disco y ninguna bandera.
  motorParado: { molinete: 0.5, bandera: null, autoBandera: false },
  cruiseSpeed: 55,
  // Dos mil quinientos: el trabajo de un avión así se hace mucho más abajo, y
  // lo que sube es para ir de un campo a otro.
  alturaDeCrucero: 2500,
  reglasDeVuelo: "visual",
  presurizada: false,
  tcas: null,
  avisosHablados: false,
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
  motores: 2,
  // A dos metros cuarenta y cinco del eje, que es `MOTOR` en su modelo.
  motoresA: [-2.45, 2.45],
  /*
   * **La hélice que se pone en bandera a mano**, que es la lección entera de
   * un motor parado en un bimotor de pistón. Treinta y cinco decímetros
   * cuadrados en molinete son los doscientos pies por minuto que cuenta el
   * manual de la FAA a su velocidad de mejor subida con un motor —y a este
   * avión, con uno, le sobran unos ciento setenta—; en bandera, una décima
   * parte. O sea: en molinete no sube, en bandera sí.
   */
  motorParado: { molinete: 0.35, bandera: 0.03, autoBandera: false },
  cruiseSpeed: 80,
  // Cinco mil quinientos: un bimotor de pistón sin presurizar vuela sus etapas
  // ahí arriba, con oxígeno a bordo.
  alturaDeCrucero: 5500,
  reglasDeVuelo: "instrumentos",
  presurizada: false,
  tcas: null,
  avisosHablados: false,
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
  motores: 2,
  // A tres metros diez, que es `MOTOR` en su modelo.
  motoresA: [-3.1, 3.1],
  /*
   * La hélice de dos metros sesenta y cuatro: el doble de disco que la del
   * bimotor de pistón, y el doble de freno en molinete. Por eso un turbohélice
   * de línea la pone en bandera **solo**: la *autofeather* va armada en cada
   * despegue.
   */
  motorParado: { molinete: 0.72, bandera: 0.06, autoBandera: true },
  cruiseSpeed: 90,
  // Siete mil seiscientos: veinticinco mil pies, el techo de servicio típico de
  // un turbohélice regional presurizado.
  alturaDeCrucero: 7600,
  reglasDeVuelo: "instrumentos",
  presurizada: true,
  // Diecinueve plazas y 5 600 kg: debajo de la raya del ACAS II. Ver `tcas`.
  tcas: "TCAS I",
  avisosHablados: true,
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
  // Colgados en el quiebro del ala, a cuatro metros cuarenta: `QUIEBRO` en su
  // modelo.
  motoresA: [-4.4, 4.4],
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
  presurizada: true,
  tcas: "TCAS II",
  avisosHablados: true,
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
  name: nombreEntero(FLOTA[5]!),
  descriptionKey: "aircraft.yvaga.description",
  mass: 255826,
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
  // Los de dentro a diez sesenta y los de fuera a veinte cuarenta: `MOTORES`
  // en su modelo.
  motoresA: [-20.4, -10.6, 10.6, 20.4],
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
  presurizada: true,
  tcas: "TCAS II",
  avisosHablados: true,
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
