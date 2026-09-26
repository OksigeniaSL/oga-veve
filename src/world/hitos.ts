/**
 * Lo que se ve por la ventanilla.
 *
 * En un vuelo largo la comandante señala lo que se pasa por debajo —«a la
 * izquierda, el Teide»— y no es un adorno: es lo que hace que un trayecto de
 * cuarenta minutos no sea una recta. Aquí resuelve tres cosas de golpe. La
 * pega contada («durante los vuelos largos pueden pasar cosas, entretener a la
 * niña que vuela mucho rato»), la geografía —que se aprende mirando, no
 * leyendo—, y una razón para mirar por la ventana en vez de a los relojes.
 *
 * ## Los nombres son datos, no literatura
 *
 * Salen de OpenStreetMap con `scripts/osm-a-hitos.mjs`, con su cota y sus
 * coordenadas, y se versionan como el aeródromo. Quien aprenda aquí que ese
 * volcán es el Teide tiene que acertar el día que lo vea de verdad.
 *
 * ## Y aquí solo está la geometría
 *
 * Qué se ve desde dónde, y por qué lado. Cuándo se dice —en crucero, no dos
 * veces, no encima de nadie— es una regla de vuelo y vive en
 * `flight/lo-que-se-ve.ts`. Separarlas es lo que permite comprobar las dos
 * sin volar.
 */

/**
 * Las clases que se reconocen desde el aire. Cada una tiene su dibujo.
 *
 * Las tres primeras son sitios y salen de OpenStreetMap. Las dos últimas **se
 * mueven** —un barco entre islas, otro avión— y no vienen de ningún fichero:
 * las pone el juego mientras están a la vista. Ver `barcos.ts` y
 * `trafico-de-las-islas.ts`.
 */
export type ClaseDeHito = "montana" | "isla" | "ciudad" | "barco" | "avion";

export interface Hito {
  readonly nombre: string;
  readonly clase: ClaseDeHito;
  /** En metros del marco local del escenario, con la Z hacia el sur. */
  readonly x: number;
  readonly z: number;
  /** Su cota, si OpenStreetMap la trae. Las ciudades casi nunca. */
  readonly ele: number | null;
  /**
   * Hasta dónde se señala, si no es el alcance de siempre, m.
   *
   * Un volcán se ve a treinta kilómetros; un barco, a una docena, y otro
   * avión a unos pocos. Señalar lo que no se distingue es mandar a mirar a la
   * nada.
   */
  readonly alcance?: number;
}

/** Lo que el extractor deja escrito al lado de cada lista. */
export interface FichaDeHitos {
  readonly id: string;
  readonly fuente: string;
  readonly licencia: string;
  readonly hitos: readonly Hito[];
}

/** Un hito visto desde el avión: cuál, por qué lado y a cuánto. */
export interface Mirada {
  readonly hito: Hito;
  readonly lado: "izquierda" | "derecha";
  /** En metros, en planta. */
  readonly distancia: number;
  /** Ángulo respecto al morro, en grados, de 0 a 180. */
  readonly desdeElMorro: number;
}

/**
 * Hasta dónde se señala algo, m.
 *
 * Treinta kilómetros. Es lo que se ve de verdad en un día normal desde altura
 * de crucero, y es también lo que evita que la comandante nombre el Teide
 * desde El Hierro: está, se ve en días claros, y señalarlo a ciento
 * cincuenta kilómetros no enseña dónde está uno, enseña lo contrario.
 */
export const ALCANCE = 30_000;

/**
 * Y nada que quede **detrás del ala**.
 *
 * Cien grados a cada lado. Lo que pasa de ahí ya no se ve por la ventanilla
 * sin girar el cuello, y una comandante no señala lo que ya se pasó. Es algo
 * más que el través —noventa— a propósito: el margen es el rato que se tarda
 * en mirar.
 */
export const HASTA_DONDE_SE_MIRA = 100;

/**
 * Qué hito se ve ahora mismo, de los que todavía no se han dicho.
 *
 * Se queda con **el más cerca**, que es el que más se ve, y no con el más
 * alto ni el más famoso: lo que enseña dónde está uno es lo que se tiene
 * debajo.
 *
 * `rumbo` en grados verdaderos, como en todo el juego.
 */
export function queSeVe(
  hitos: readonly Hito[],
  desde: { readonly x: number; readonly z: number; readonly rumbo: number },
  yaDichos: ReadonlySet<string> = new Set(),
  alcance = ALCANCE,
): Mirada | null {
  let mejor: Mirada | null = null;
  for (const hito of hitos) {
    if (yaDichos.has(hito.nombre)) continue;
    const dx = hito.x - desde.x;
    const dz = hito.z - desde.z;
    const distancia = Math.hypot(dx, dz);
    if (distancia > (hito.alcance ?? alcance) || distancia < 1) continue;
    const relativo = anguloRelativo(desde.rumbo, rumboHacia(dx, dz));
    if (Math.abs(relativo) > HASTA_DONDE_SE_MIRA) continue;
    if (mejor && distancia >= mejor.distancia) continue;
    mejor = {
      hito,
      lado: relativo < 0 ? "izquierda" : "derecha",
      distancia,
      desdeElMorro: Math.abs(relativo),
    };
  }
  return mejor;
}

/**
 * El rumbo verdadero hacia un desplazamiento, en grados.
 *
 * La Z apunta al sur, así que el norte es `-dz`. Es la misma conversión que
 * hay en `rumbo.ts` y se repite aquí porque equivocarla pone las cosas en el
 * lado contrario, que es el único error que quien juega nota siempre.
 */
function rumboHacia(dx: number, dz: number): number {
  return (Math.atan2(dx, -dz) * 180) / Math.PI;
}

/** De −180 a 180: negativo a babor, positivo a estribor. */
function anguloRelativo(rumbo: number, hacia: number): number {
  return ((((hacia - rumbo) % 360) + 540) % 360) - 180;
}

/*
 * **Los ficheros, con `import.meta.glob`.**
 *
 * Como el relieve, las ciudades y las ortofotos: así Vite los emite al
 * empaquetar y les pone su huella. Son unos pocos kilobytes por escenario, así
 * que van todos dentro y no hay nada que bajar en tiempo de juego.
 */
const LISTAS = import.meta.glob("../../data/hitos/*.hitos.json", {
  eager: true,
  import: "default",
}) as Record<string, FichaDeHitos>;

/**
 * Los hitos de un escenario, o una lista vacía si todavía no se han extraído.
 *
 * Vacía y no un error: un escenario sin hitos es uno al que no se le ha
 * pasado `scripts/osm-a-hitos.mjs` todavía, y eso no puede impedir volar allí.
 * Lo que pasa es que la comandante no señala nada, que es exactamente lo que
 * pasaba antes de que esto existiera.
 */
export function hitosDe(id: string): readonly Hito[] {
  for (const [ruta, ficha] of Object.entries(LISTAS)) {
    if (ruta.endsWith(`/${id}.hitos.json`)) return ficha.hitos;
  }
  return [];
}

/**
 * La misma lista sin nombres repetidos, quedándose con el primero.
 *
 * Hace falta al juntar los hitos de los dos extremos de una ruta: Tenerife Sur
 * y Los Rodeos están en la misma isla, así que los dos traen el Teide. Medido
 * con las dos listas puestas en el mundo, las dos copias caen a **dos metros**
 * la una de la otra —que es lo que confirma que las dos proyecciones casan— y
 * aun así son dos entradas donde hay una montaña.
 */
export function sinRepetidos(hitos: readonly Hito[]): Hito[] {
  const vistos = new Set<string>();
  const salida: Hito[] = [];
  for (const h of hitos) {
    if (vistos.has(h.nombre)) continue;
    vistos.add(h.nombre);
    salida.push(h);
  }
  return salida;
}
