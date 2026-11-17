/**
 * *Terrain, pull up*: el aviso de que el suelo viene a buscarte.
 *
 * Es el aviso que salva más vidas de toda la aviación, y hasta hoy este juego
 * no lo tenía. Se hicieron maniobras malas a propósito para ver si decía algo
 * —volar bajísimo sobre un pueblo, pasar rozando un edificio— y la pantalla se
 * quedó callada: «hice maniobras mal hechas a ver si me avisaba, y nada».
 *
 * El propio código lo tenía escrito como advertencia y sin cumplir: «un panel
 * bonito que esconde un *terrain, pull up* es peor que no tener panel».
 *
 * ## Cuándo avisa, y cuándo se calla
 *
 * Volar bajo no es malo: se vuela bajo para aterrizar, y se vuela bajo para
 * seguir un río, que es una de las lecciones de este juego. Lo malo es volar
 * bajo **donde no toca** o **bajando cuando ya no queda sitio**.
 *
 * Así que hay dos avisos y no uno, como en un avión de verdad:
 *
 * - **`bajo`** — vas cerca del suelo fuera de una aproximación. Es un aviso de
 *   atención: mira dónde estás.
 * - **`sube`** — además estás bajando. Ese es el que no admite discusión, y es
 *   el que dice *pull up*.
 *
 * Y se calla en tres sitios, porque si no sería ruido: en el suelo, en la
 * aproximación final —ahí estar bajo y bajando es exactamente lo que toca— y
 * subiendo, porque quien sube ya está resolviendo el problema.
 */

import { MARGENES } from "./minimos";

/** Por debajo de esta altura sobre el suelo hay que mirar dónde se está, m. */
const ATENCION = 120;

/** Y por debajo de esta, bajando, ya no hay conversación posible, m. */
const URGENTE = 60;

/** Bajando de verdad, m/s. Un descenso suave no dispara nada. */
const BAJANDO = -1.5;

/**
 * Por debajo de esto no se avisa de nada, m.
 *
 * **Porque a esa altura ya no hay aviso que dar.** El primer intento se
 * callaba solo con `enElSuelo`, y en la carrera de aterrizaje el contacto
 * parpadea —las ruedas botan, el suelo se pierde por veinte centímetros— así
 * que el avión salía «en el aire» a un metro del asfalto y bajando: «en pista,
 * ya aterrizado, me advierte que voy a chocar».
 *
 * Un radioaltímetro de verdad inhibe estos avisos por debajo de treinta pies
 * por el mismo motivo. Quince metros aquí.
 */
const YA_ES_TARDE = 15;

/**
 * Cuánto de la altura de la senda hay que llevar para que «final» valga.
 *
 * **Porque «final» es una deducción geométrica, no una promesa.** La máquina
 * de fases dice «final» con estar alineado, por delante del umbral y bajando;
 * no mira la altura. Así que quien viene a dos kilómetros y a diez metros del
 * suelo —o sea, metiéndose en el pueblo— también está «en final», y con eso el
 * aviso de terreno se callaba justo cuando era el único que quedaba.
 *
 * Se grabó volando: aproximación larga sobre la ciudad, el avión bajando entre
 * los edificios y la pantalla muda hasta que se posó en un descampado.
 *
 * La mitad de la senda. No es un listón fino a propósito: por debajo de la
 * mitad ya no se está bajo por la senda, se está bajo a secas.
 */
const MITAD_DE_LA_SENDA = 0.5;

/**
 * Y a partir de qué distancia del umbral se juzga, m.
 *
 * Cerca del umbral hay que estar bajo —esa es la idea— y en los últimos
 * metros se enderezan las ruedas: medir ahí sería avisar del aterrizaje.
 */
const DESDE = 400;

/**
 * ¿Va tan por debajo de la senda que «final» ya no explica lo que hace?
 *
 * `pendiente` es la tangente de la senda de planeo, `distancia` lo que falta
 * hasta el umbral y `altura` lo que se lleva sobre la cota de la pista.
 */
export function fueraDeLaSenda(
  distancia: number,
  altura: number,
  pendiente: number,
): boolean {
  if (!Number.isFinite(distancia) || distancia < DESDE) return false;
  return altura < distancia * pendiente * MITAD_DE_LA_SENDA;
}

export type AvisoDeTerreno = "bajo" | "sube" | null;

export interface Cerca {
  /** Metros sobre el terreno, no sobre el mar. */
  readonly sobreElSuelo: number;
  readonly vertical: number;
  readonly enElSuelo: boolean;
  /**
   * Si esto es una aproximación en regla a la pista.
   *
   * Lo dice la máquina de fases, que es quien sabe: alineado, por delante del
   * umbral y bajando. Ahí estar bajo **es** el objetivo y avisar sería
   * enseñar lo contrario.
   */
  readonly enFinal: boolean;
  /**
   * Si el avión está sobre la pista o encima de su cabecera.
   *
   * **Ahí no hay aviso que dar, y darlo es mentir.** «Eso de que me avise que
   * voy a *terrain* cuando ya estoy sobre la cabecera de la pista.» Y tenía
   * razón: sobre el asfalto, ir bajo no es un peligro, es el plan. Los
   * sistemas de verdad hacen lo mismo —el aviso se inhibe cuando la pista está
   * debajo—, y por el mismo motivo: un aviso que salta cuando todo va bien
   * enseña a ignorar los avisos.
   *
   * Es distinto de `enFinal`, que mira la senda de planeo: se puede estar
   * sobre la cabecera habiéndose salido de la senda hace rato.
   */
  readonly sobreLaPista: boolean;
  /**
   * Si el avión viene **puesto para aterrizar**: tren fuera, flaps fuera y
   * bajando a un ritmo de aproximación.
   *
   * **Y esto manda sobre la fase.** El aviso ya se callaba «en final», pero
   * eso lo decide una máquina de estados con seis condiciones a la vez
   * —alineado, antes del centro de la pista, por debajo de trescientos metros,
   * bajando, con menos de treinta grados de desalineación y a menos de
   * cuatrocientos del eje— y basta con que una parpadee para que el aviso
   * vuelva. Medido en una aproximación clavada a Vref: la fase se salía de
   * «final» a ciento treinta y ocho metros y ya no volvía, así que el juego
   * soltaba «terrain, pull up» a sesenta y tres metros de la pista.
   *
   * Contado jugando: «tres veces que voy muy bajo y la señal de que me voy a
   * dar contra el suelo, pero si estoy aterrizando qué esperan».
   *
   * Un avión con el tren fuera, los flaps fuera y bajando a tres metros por
   * segundo **está aterrizando**, lo diga la fase o no. Los sistemas de verdad
   * hacen exactamente esto —inhiben el aviso en configuración de aterrizaje—
   * y por el mismo motivo: si no, sonaría en cada toma de cada vuelo, y un
   * aviso que suena siempre deja de avisar.
   *
   * Lo que **no** inhibe es bajar rápido: caer a plomo con el tren fuera sigue
   * siendo caer a plomo, y eso lo sigue cazando `BAJANDO`.
   */
  readonly puestoParaAterrizar: boolean;
}

/** Qué hay que decir, o `null` si no hay nada que decir. */
export function avisoDeTerreno(s: Cerca): AvisoDeTerreno {
  if (s.enElSuelo || s.enFinal || s.sobreLaPista) return null;
  // Y puesto para aterrizar, que es lo que la fase no siempre acierta a decir.
  // Ver `puestoParaAterrizar`.
  if (s.puestoParaAterrizar) return null;
  if (s.sobreElSuelo > ATENCION || s.sobreElSuelo < YA_ES_TARDE) return null;
  // Subiendo no se avisa: quien sube ya está haciendo lo que había que hacer.
  if (s.vertical >= 0) return null;
  if (s.sobreElSuelo < URGENTE && s.vertical < BAJANDO) return "sube";
  return s.vertical < BAJANDO ? "sube" : "bajo";
}

/** «La de aproximación y poco más»: hasta un veinte por ciento por encima. */
export const DESPACIO_SOBRE_LA_DE_APROXIMACION = 1.2;

/**
 * **Si viene puesto para aterrizar**: ver `Cerca.puestoParaAterrizar`. Tren,
 * flaps y ritmo de bajada, los tres a la vez, porque cada uno solo miente.
 *
 * - **En el avión que no lleva flaps**, lo que ellos decían —«vas lento»— lo
 *   dice la velocidad: la de aproximación y poco más. Sin esto, en el
 *   fumigador no había forma de estar puesto para aterrizar.
 * - **El helicóptero, despacio, está maniobrando para posarse**, y se posa en
 *   cualquier sitio: bajo y por debajo de su velocidad de aproximación con un
 *   poco de margen, sin caer a plomo. El tren no cuenta —tiene su propio
 *   aviso—. Deprisa y bajo, en cambio, sí se avisa.
 *
 * **La velocidad es la indicada**, porque la de aproximación de la ficha lo
 * es: es la del anemómetro. Se comparaba la verdadera, y en un campo alto o
 * con calor la misma indicada es más verdadera —en Los Rodeos, un cuatro y
 * medio por ciento en la pista con 21 °C—, así que se dejaba de estar
 * «puesto» unos puntos antes de donde tocaba. Es la misma mezcla que la
 * enmienda H25d del ADR 0027 quitó de la banda de la aproximación.
 *
 * El ritmo, con el mismo número con el que los mínimos dicen que una
 * aproximación se ha ido de las manos (`MARGENES.cayendo`): caer más que eso
 * no es aterrizar, con la configuración que sea.
 */
export function vienePuestoParaAterrizar(
  a: { readonly helicoptero?: unknown; readonly llevaFlaps: boolean; readonly approachSpeed: number },
  ahora: {
    /** El tren, de 0 a 1, y los flaps, de 0 a 1: lo pedido en la palanca. */
    readonly tren: number;
    readonly flaps: number;
    /** La indicada, m/s. */
    readonly indicada: number;
    /** El ritmo vertical, m/s, positivo subiendo. */
    readonly vertical: number;
  },
): boolean {
  const despacio = ahora.indicada < a.approachSpeed * DESPACIO_SOBRE_LA_DE_APROXIMACION;
  const sinCaer = ahora.vertical > MARGENES.cayendo;
  if (a.helicoptero) return despacio && sinCaer;
  return ahora.tren > 0.9 && (a.llevaFlaps ? ahora.flaps > 0.3 : despacio) && sinCaer;
}
