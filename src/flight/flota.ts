/**
 * Cómo se llama la flota: **JAZ**, y los pájaros en guaraní.
 *
 * Un avión se nombra en dos piezas —fabricante y modelo—: Boeing 747, Douglas
 * DC-9, Cessna 172. Esa estructura es en sí misma algo que se aprende, y da la
 * vuelta al problema de bautizar: si **JAZ es el fabricante**, cada avión
 * nuevo hereda la identidad sin discutirla otra vez. Un número libre y un
 * pájaro sin usar, y ya está bautizado.
 *
 * El número crece con el tamaño, como en la aviación de verdad, y no repite
 * los de nadie. El nombre en guaraní es como se le llama en realidad: un niño
 * paraguayo vuela un *Pykasu*, no un «avión de escuela n.º 1». El guaraní está
 * en la flota, no solo en la decoración.
 *
 * ## Lo que esto sustituye, y por qué no era un detalle
 *
 * El entrenador se llamaba **«Óga 172»**, y ciento setenta y dos es el número
 * de una avioneta de escuela que existe y cuyo fabricante protege su nombre y
 * su silueta como marca. Un número no es una marca, pero puesto detrás de una
 * palabra y delante de un ala alta de cuatro plazas **cita** a una: es
 * exactamente la asociación que este proyecto había decidido evitar, escrita
 * en la ficha. Ver #69 y `CREDITOS.md`.
 *
 * Y «Óga» es la marca de la granja, que es otra capa: Óga Veve es el juego y
 * Óga la granja, como Microsoft Flight Simulator y Boeing. El fabricante de
 * dentro del mundo del juego es JAZ.
 *
 * ## Lo que falta
 *
 * Los cinco están decididos; **dos están construidos**. Los otros tres están
 * aquí con su número y su nombre reservados, que es el sitio donde tienen que
 * estar para que nadie los bautice dos veces. Ver `ESTA_HECHO`.
 *
 * Y los nombres salen a producción sin esperar a nadie. Si alguno resulta
 * tener un sentido coloquial desafortunado en guaraní, se cambia la palabra y
 * ya está: es una fila de esta tabla y una clave de traducción. Retener un
 * juego por eso cuesta más que arreglarlo.
 */

/** El fabricante, dentro del mundo del juego. */
export const FABRICANTE = "JAZ";

/**
 * Las siluetas, que son lo que de verdad distingue un avión de otro.
 *
 * Seis siluetas y no seis pinturas: ala alta, biplano, bimotor de ala baja,
 * cola en T, reactor en flecha y cuatrimotor de fuselaje ancho. Es exactamente
 * la destreza que enseña el álbum de postales —reconocer un avión por su
 * forma—, así que la flota tiene que darle seis respuestas distintas o el
 * álbum no tiene nada que enseñar.
 */
export type Silueta =
  | "ala-alta"
  | "biplano"
  | "bimotor-ala-baja"
  | "cola-en-t"
  | "reactor"
  /**
   * Y el cuatrimotor de fuselaje ancho, que es otra silueta y no un reactor
   * grande: **cuatro motores bajo el ala** se cuentan desde el suelo y desde
   * la ventanilla, y contarlos es exactamente la destreza que el álbum enseña.
   */
  | "cuatrimotor";

export interface Modelo {
  /** El número: crece con el tamaño y no se repite. */
  readonly numero: number;
  /** El pájaro, en guaraní. Es como se le llama de verdad. */
  readonly nombre: string;
  /** Qué es ese pájaro, para quien no habla guaraní. */
  readonly pajaro: string;
  /** Qué clase de avión es. */
  readonly silueta: Silueta;
  /** El identificador en el código, si ya está construido. */
  readonly id: string;
  /**
   * Por qué este nombre todavía no se puede usar, si hay un motivo.
   *
   * No es una nota al margen: la regla de la casa es que **un nombre no puede
   * estar dos veces en el mundo de Granja Óga**, y ya se coló una colisión
   * —el primer tramo se llamó Mainumby durante unas horas, que es también el
   * fumigador—. Un nombre en disputa se queda reservado y no vuela: lo impide
   * una prueba. Ver `flota.test.ts`.
   */
  readonly enDisputa?: string;
}

/**
 * Los cinco, por número.
 *
 * El orden es el del número, y el número es el del tamaño: quien recorra la
 * lista en el hangar la recorre de pequeño a grande sin que nadie se lo
 * explique.
 */
export const FLOTA: readonly Modelo[] = [
  {
    numero: 20,
    nombre: "Pykasu",
    pajaro: "paloma",
    silueta: "ala-alta",
    id: "jaz-20",
  },
  {
    numero: 25,
    nombre: "Mainumby",
    pajaro: "colibrí",
    silueta: "biplano",
    id: "jaz-25",
  },
  {
    numero: 40,
    nombre: "Panambi",
    pajaro: "mariposa",
    silueta: "bimotor-ala-baja",
    id: "jaz-40",
  },
  {
    numero: 60,
    nombre: "Arasunu",
    pajaro: "trueno",
    silueta: "cola-en-t",
    id: "jaz-60",
  },
  {
    numero: 90,
    nombre: "Arai",
    pajaro: "nube",
    silueta: "reactor",
    id: "jaz-90",
    /*
     * **Se llamó Kuarahy y duró lo que tardó en verse la colisión.**
     *
     * *Kuarahy-memby* es la ardilla de Granja Óga, y esa raíz ya es suya: es
     * exactamente el motivo por el que el biplano dejó de llamarse Kuarahy y
     * pasó a Mainumby —«dos personajes con el mismo nombre se confunden en
     * vídeo»—. El reactor se topó con lo mismo y se quedó reservado hasta que
     * alguien lo bautizara.
     *
     * *Arai* es nube, y nombra lo que hace: es el único de la flota que va por
     * encima de ellas. Decidido por quien bautiza, que es quien decide esto.
     */
  },
  {
    numero: 120,
    nombre: "Yvága",
    pajaro: "cielo",
    silueta: "cuatrimotor",
    id: "jaz-120",
    /*
     * **El grande, y vuela los números de un 747 de verdad.**
     *
     * La masa, las inercias, la superficie alar, la envergadura y la cuerda
     * salen de la NASA CR-2144 —*Aircraft Handling Qualities Data*, Heffley y
     * Jewell, 1972—, que publica el juego entero del B-747 en dominio público.
     * Ver `aircraft.ts`.
     *
     * Lo que no se copia es el rótulo ni la joroba: un cuatrimotor de fuselaje
     * ancho sin joroba es una clase entera —el DC-8, el 707, el A340— y no una
     * marca. Volar cómo vuela un avión de verdad es lo que este juego promete;
     * llamarlo como se llama, no.
     */
  },
];

/** Cuáles están construidos de verdad. Los demás son número y nombre reservados. */
export const ESTA_HECHO: readonly string[] = [
  "jaz-20",
  "jaz-25",
  "jaz-40",
  "jaz-60",
  "jaz-90",
  "jaz-120",
];

/**
 * El nombre entero: «JAZ 20 Pykasu».
 *
 * Las dos piezas juntas, que es como se nombra un avión. En pantalla puede
 * salir solo el pájaro —es lo que se recuerda— pero en la ficha van las dos,
 * porque la ficha es donde se aprende que un avión tiene fabricante y modelo.
 */
export function nombreEntero(m: Modelo): string {
  return `${FABRICANTE} ${m.numero} ${m.nombre}`;
}

/** El modelo con ese identificador, o `null` si no es de la flota. */
export function modeloPorId(id: string): Modelo | null {
  return FLOTA.find((m) => m.id === id) ?? null;
}
