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
 * Y queda una comprobación que no la hace un programa: que ninguno de los
 * cinco tenga un sentido coloquial desafortunado para quien habla guaraní.
 * *Kuarahy* y *Mainumby* son seguros; los otros tres conviene verificarlos
 * antes de que salgan a producción.
 */

/** El fabricante, dentro del mundo del juego. */
export const FABRICANTE = "JAZ";

/**
 * Las siluetas, que son lo que de verdad distingue un avión de otro.
 *
 * Cinco siluetas y no cinco pinturas: ala alta, biplano, bimotor de ala baja,
 * cola en T y reactor en flecha. Es exactamente la destreza que enseña el
 * álbum de postales —reconocer un avión por su forma—, así que la flota tiene
 * que darle cinco respuestas distintas o el álbum no tiene nada que enseñar.
 */
export type Silueta =
  "ala-alta" | "biplano" | "bimotor-ala-baja" | "cola-en-t" | "reactor";

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
    nombre: "Kuarahy",
    pajaro: "sol",
    silueta: "reactor",
    id: "jaz-90",
    /*
     * **Y esta raíz ya está tomada**, en el mismo sitio donde se descartó una
     * vez: *Kuarahy-memby* es la ardilla de Granja Óga, y por eso el biplano
     * dejó de llamarse Kuarahy y pasó a Mainumby —«dos personajes con el mismo
     * nombre se confunden en vídeo»—. El reactor se topa con lo mismo.
     *
     * Se queda apuntado tal como lo decidió #69 y **no vuela hasta que se
     * resuelva**, que es la única forma de que no se olvide. Si hace falta
     * otro: el reactor es el que va por encima de las nubes, así que *Arai*
     * —nube— nombra lo que hace y no choca con nada del mundo de la granja.
     * Pero eso lo decide quien bautiza, no esta tabla.
     */
    enDisputa:
      "la raíz Kuarahy ya es de Kuarahy-memby, la ardilla de Granja Óga",
  },
];

/** Cuáles están construidos de verdad. Los demás son número y nombre reservados. */
export const ESTA_HECHO: readonly string[] = ["jaz-20", "jaz-25"];

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
