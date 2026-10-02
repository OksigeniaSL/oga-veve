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
 * ## Qué se cuenta: lo destacado, y solo si se ve
 *
 * La primera versión sacaba de OpenStreetMap los pueblos, cumbres e islas de
 * cada cuadro y los metía en una plantilla —«Ahí abajo, a la izquierda,
 * Candelaria»—. Volando de Los Rodeos a La Palma se oyó así, y se oyó mal dos
 * veces: sonaba a máquina, y Candelaria **no se ve** desde allí, porque la
 * Dorsal está en medio. «Se ve mejor Anaga a tu derecha, el Teide a la
 * izquierda.»
 *
 * Así que ahora son dos filtros, y los dos salen de cómo mira una comandante
 * de verdad:
 *
 * - **La lista es corta y está elegida**: `data/hitos/destacados.json`, con el
 *   Teide, Anaga, la Caldera de Taburiente, el río Paraguay, Yacyretá… Lo que
 *   merece contarse, cada cosa con su frase escrita a mano. Las coordenadas y
 *   las cotas siguen saliendo de OpenStreetMap —y los ríos, de la misma línea
 *   de Natural Earth que dibuja el plano—: lo que se elige a mano es qué se
 *   cuenta, no dónde está. Ver `world/lo-destacado.ts` y el ADR 0013.
 * - **Y se tiene que ver**: línea de vista desde el avión contra el relieve
 *   que el juego ya tiene, con la curvatura de la Tierra. Ver `seVe`.
 *
 * ## Y aquí solo está la geometría
 *
 * Qué se ve desde dónde, y por qué lado. Cuándo se dice —en crucero, no dos
 * veces, no encima de nadie, no en las fases de trabajo— es una regla de vuelo
 * y vive en `flight/lo-que-se-ve.ts`. Separarlas es lo que permite comprobar
 * las dos sin volar.
 */

/**
 * Las clases que se reconocen desde el aire. Cada una tiene su dibujo.
 *
 * Las cinco primeras son sitios. Las dos últimas **se mueven** —un barco entre
 * islas, otro avión— y no vienen de ningún fichero: las pone el juego mientras
 * están a la vista. Ver `barcos.ts` y `trafico-de-las-islas.ts`.
 */
export type ClaseDeHito =
  | "montana"
  | "isla"
  | "ciudad"
  | "agua"
  | "bosque"
  | "barco"
  | "avion";

/** Un sitio desde el que se ve un hito, en el marco local del escenario. */
export interface PuntoDeHito {
  readonly x: number;
  readonly z: number;
  /** Su cota, m; `null` si es el suelo mismo —un río, un lago, un pueblo—. */
  readonly ele: number | null;
}

export interface Hito {
  /** Lo que se escribe en la tarjeta y en el plano. */
  readonly nombre: string;
  readonly clase: ClaseDeHito;
  /** En metros del marco local del escenario, con la Z hacia el sur. */
  readonly x: number;
  readonly z: number;
  /** Su cota, si la tiene. Es a donde apunta la línea de vista. */
  readonly ele: number | null;
  /**
   * Hasta dónde se señala, si no es el alcance de siempre, m.
   *
   * El Teide se ve a cien kilómetros; un barco, a una docena, y otro avión a
   * unos pocos. Señalar lo que no se distingue es mandar a mirar a la nada.
   */
  readonly alcance?: number;
  /**
   * Quién es, si se mueve: el mismo nombre con el que lo sigue el TCAS. Es lo
   * que evita que otro avión se señale por la ventanilla y se cuente otra vez
   * por radio. Ver `informacion-de-trafico.ts`.
   */
  readonly id?: string;
  /**
   * Con qué frase se cuenta: `ventanilla.<clave>` en el diccionario. Los
   * destacados la llevan todos, y los que se mueven usan la de su clase.
   */
  readonly clave?: string;
  /**
   * Cuánto merece contarse, de 1 a 3. El Teide es un 3; la ciudad de abajo,
   * un 2; un barco que pasa, un 1. Ver `VALE_UN_PESO`.
   */
  readonly peso?: number;
  /**
   * **Los otros sitios desde los que se ve lo mismo.** Un río es una línea y
   * una sierra es larga: el río Paraguay se ve a la derecha durante media
   * hora, y con un solo punto se vería solo al pasar por ese punto.
   */
  readonly otros?: readonly PuntoDeHito[];
}

/** Un hito visto desde el avión: cuál, por qué lado y a cuánto. */
export interface Mirada {
  readonly hito: Hito;
  readonly lado: "izquierda" | "derecha";
  /** En metros, en planta, hasta el punto por el que se ve. */
  readonly distancia: number;
  /** Ángulo respecto al morro, en grados, de 0 a 180. */
  readonly desdeElMorro: number;
  /**
   * **Por dónde se mira**, en el marco del escenario: el punto del hito por
   * el que pasa la línea de vista, con la altura a la que se apunta.
   *
   * Lo pide la cámara que se gira hacia lo que se señala: un río es una
   * línea, y girarse hacia su primer punto del fichero —que puede estar a
   * cien kilómetros— sería mirar a otro sitio que el que la comandante dice.
   * Ver `cameras/mirada.ts`.
   */
  readonly punto?: { readonly x: number; readonly y: number; readonly z: number };
}

/**
 * Hasta dónde se señala algo que no dice el suyo, m.
 *
 * Treinta kilómetros: lo que se distingue de verdad en un día normal. Lo que
 * se ve más lejos —el Teide, una isla entera— lleva su propio alcance.
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
 * **Ni lo que va justo delante del morro.**
 *
 * Diez grados. Por una ventanilla del pasaje no se ve lo que va de frente, y
 * decirle a la fila de la izquierda que mire un volcán que está a tres grados
 * del morro es mandarla a mirar el ala. Pero tampoco más: llegando a La Palma
 * la isla entera va a diez o quince grados del morro hasta que se empieza a
 * bajar, y con veinte no se contaba nunca — se veía por todas las ventanillas
 * de un lado y la comandante callada.
 */
export const DESDE_EL_MORRO = 10;

/**
 * **Cuánto vale un punto de peso, en metros.**
 *
 * Treinta kilómetros. Entre dos cosas a la vista se cuenta la que más merece,
 * pero no a cualquier distancia: el Teide a noventa kilómetros no le quita el
 * turno a Anaga pasando a quince por el ala, que se va a quedar atrás en un
 * minuto. Cada punto de peso adelanta a lo que está treinta kilómetros más
 * cerca, que es lo que haría cualquiera que conozca el paisaje.
 */
export const VALE_UN_PESO = 30_000;

/**
 * El radio de la Tierra a efectos de mirar, m.
 *
 * El de verdad por siete sextos: la atmósfera dobla un poco la luz hacia
 * abajo y se ve algo más allá del horizonte geométrico. Es el factor de
 * refracción estándar que usa cualquier cálculo de alcance visual.
 */
export const RADIO_PARA_MIRAR = (6_371_000 * 7) / 6;

/**
 * Cuánto por encima del suelo se apunta a un sitio sin cota, m.
 *
 * Treinta: un río o un pueblo no son un punto en el suelo, tienen su orilla,
 * sus casas y su brillo. Y el mapa de alturas lejano va a trescientos metros
 * por muestra: apuntar al suelo mismo lo daría por tapado con cualquier loma
 * que el mapa redondee.
 */
const POR_ENCIMA = 30;

/**
 * **Si desde un sitio se ve otro**, con el relieve y la curvatura por medio.
 *
 * Se recorre la recta entre los dos y se mira si el suelo asoma por encima.
 * La curvatura se suma al suelo —el «abombamiento» `s·(D−s)/2R` de toda la
 * vida—, que es lo que hace que un barco a sesenta kilómetros se esconda
 * detrás del mar aunque no haya nada en medio.
 *
 * Los últimos metros no se miran: el sitio está **sobre** su propio suelo, y
 * con el mapa lejano a trescientos metros por muestra la ladera del mismo
 * volcán lo taparía siempre.
 *
 * `suelo` contesta la cota del terreno, o `null` donde nadie la sabe, que se
 * toma como mar.
 */
export function seVe(
  desde: { readonly x: number; readonly y: number; readonly z: number },
  hasta: { readonly x: number; readonly y: number; readonly z: number },
  suelo: (x: number, z: number) => number | null,
): boolean {
  const dx = hasta.x - desde.x;
  const dz = hasta.z - desde.z;
  const d = Math.hypot(dx, dz);
  if (d < 1) return true;
  // Unas ciento cincuenta muestras como mucho, y nunca más cerca de doscientos
  // metros: es un mapa de trescientos metros por muestra y más no aporta.
  const paso = Math.max(200, d / 150);
  const sinMirar = Math.min(800, d * 0.08);
  for (let s = paso; s < d - sinMirar; s += paso) {
    const t = s / d;
    const cota = suelo(desde.x + dx * t, desde.z + dz * t) ?? 0;
    const abombado = (s * (d - s)) / (2 * RADIO_PARA_MIRAR);
    const recta = desde.y + (hasta.y - desde.y) * t;
    if (Math.max(0, cota) + abombado > recta) return false;
  }
  return true;
}

/** Desde dónde se mira: dónde va el avión, a qué altura y hacia dónde. */
export interface DesdeDonde {
  readonly x: number;
  readonly z: number;
  /** Rumbo verdadero, en grados. */
  readonly rumbo: number;
  /** Altitud, m sobre el mar. Sin ella no se mira el relieve. */
  readonly y?: number;
}

/**
 * Qué hito se ve ahora mismo, de los que todavía no se han dicho.
 *
 * Tres cosas por orden, y ninguna sobra:
 *
 * 1. **Que esté a su alcance y a un lado**: ni detrás del ala ni delante del
 *    morro. Ver `HASTA_DONDE_SE_MIRA` y `DESDE_EL_MORRO`.
 * 2. **Lo que más merece**: el peso de cada uno, con la distancia en contra.
 *    Ver `VALE_UN_PESO`.
 * 3. **Que se vea**: la línea de vista contra el relieve, si se da el suelo
 *    y la altitud. Se mira por orden de mérito y se para en el primero que se
 *    ve, que así casi nunca hacen falta más de dos.
 *
 * `rumbo` en grados verdaderos, como en todo el juego.
 */
export function queSeVe(
  hitos: readonly Hito[],
  desde: DesdeDonde,
  yaDichos: ReadonlySet<string> = new Set(),
  suelo: ((x: number, z: number) => number | null) | null = null,
): Mirada | null {
  interface Candidato {
    readonly mirada: Mirada;
    readonly merito: number;
    readonly puntos: readonly (PuntoDeHito & { readonly d: number })[];
  }
  const candidatos: Candidato[] = [];
  for (const hito of hitos) {
    if (yaDichos.has(hito.nombre)) continue;
    const alcance = hito.alcance ?? ALCANCE;
    // De sus puntos, los que se ven por una ventanilla, del más cerca al más
    // lejos: es por el más cerca por donde se mira.
    const puntos: (PuntoDeHito & { d: number; rel: number })[] = [];
    for (const p of [hito as PuntoDeHito, ...(hito.otros ?? [])]) {
      const dx = p.x - desde.x;
      const dz = p.z - desde.z;
      const d = Math.hypot(dx, dz);
      if (d > alcance || d < 1) continue;
      const rel = anguloRelativo(desde.rumbo, rumboHacia(dx, dz));
      const abs = Math.abs(rel);
      if (abs > HASTA_DONDE_SE_MIRA || abs < DESDE_EL_MORRO) continue;
      puntos.push({ x: p.x, z: p.z, ele: p.ele, d, rel });
    }
    if (puntos.length === 0) continue;
    puntos.sort((a, b) => a.d - b.d);
    const cerca = puntos[0]!;
    candidatos.push({
      mirada: {
        hito,
        lado: cerca.rel < 0 ? "izquierda" : "derecha",
        distancia: cerca.d,
        desdeElMorro: Math.abs(cerca.rel),
        // Sin relieve no se sabe la cota del suelo: el sitio a su cota, o un
        // poco por encima del mar.
        punto: { x: cerca.x, y: cerca.ele ?? POR_ENCIMA, z: cerca.z },
      },
      merito: (hito.peso ?? 1) * VALE_UN_PESO - cerca.d,
      puntos,
    });
  }
  candidatos.sort((a, b) => b.merito - a.merito);
  for (const c of candidatos) {
    if (!suelo || desde.y === undefined) return c.mirada;
    const ojo = { x: desde.x, y: desde.y, z: desde.z };
    // Con tres puntos basta: si ninguno de los tres más cerca se ve, el río
    // está detrás de una loma, y el cuarto no lo va a arreglar.
    for (const p of c.puntos.slice(0, 3)) {
      const y = p.ele ?? (suelo(p.x, p.z) ?? 0) + POR_ENCIMA;
      if (!seVe(ojo, { x: p.x, y, z: p.z }, suelo)) continue;
      const rel = anguloRelativo(desde.rumbo, rumboHacia(p.x - desde.x, p.z - desde.z));
      return {
        hito: c.mirada.hito,
        lado: rel < 0 ? "izquierda" : "derecha",
        distancia: p.d,
        desdeElMorro: Math.abs(rel),
        punto: { x: p.x, y, z: p.z },
      };
    }
  }
  return null;
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
