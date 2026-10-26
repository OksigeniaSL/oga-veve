/**
 * **La piel de la carta**: el papel, las tintas, la rampa del relieve, la
 * cubierta del suelo, el sombreado, los trazos y las letras, en un solo sitio.
 *
 * La identidad del juego es la carta aeronáutica, y su hoja de estilo es la de
 * Gaudí (26-10-2026, «La carta aeronáutica de Óga Veve»). Se basa en la carta
 * de verdad que vuela quien sale de Canarias: la **1:500 000 de ENAIRE, hoja
 * GC Canarias, edición 2025**. De ahí salen los peldaños del relieve en pies,
 * el azul de los datos aeronáuticos, el negro del aeródromo y la rosa. Los
 * valores de abajo son los suyos; lo que no viene de la hoja lo dice al lado.
 *
 * ## Por qué un fichero sin importaciones
 *
 * Porque lo leen dos: el juego, que dibuja encima de la carta, y el horno
 * (`scripts/carta-hornear.mjs`), que pinta fuera del juego el relieve, el
 * sombreado y la cubierta del suelo de cada región. Node lo lee tal cual,
 * quitándole los tipos, y eso solo funciona si no tira de nada más. Con dos
 * copias de la rampa, una en el horno y otra en el juego, el día que se
 * cambiara una la leyenda diría una cosa y la carta otra.
 *
 * Lo que se hornea —la rampa, la cubierta, el mar y el sombreado— pide volver
 * a hornear al cambiarlo: `npm run carta`. Lo que se dibuja encima —trazos,
 * símbolos, letras— cambia al recargar. Y las variables `--carta-*` de la hoja
 * de estilo salen también de aquí: ver `variablesDeLaCarta`.
 */

/** Un color, como lo escriben las hojas de estilo: `#rrggbb`. */
export type Color = string;

/** Un pie, en metros. Los peldaños de la carta van en pies, como en aviación. */
const PIE = 0.3048;

/** El papel, la retícula y los pliegues. */
export const PAPEL = {
  /** Crema de carta, un punto más claro que la hoja de la instructora. */
  fondo: "#f3efe3",
  /** La retícula, cada 30′ como en la carta real. */
  reticula: "rgba(46, 83, 122, .35)",
  /** Los dos pliegues de una carta doblada en cuatro. */
  pliegue: "rgba(90, 70, 40, .10)",
} as const;

/**
 * Las tintas de lo que se lee y se traza encima. Cada una con su contraste
 * sobre el papel, que es sobre lo que va siempre: toda etiqueta lleva su
 * halo de papel debajo.
 */
export const TINTAS = {
  /** Nombres de sitios, islas y aeródromos. 12,0:1. */
  tinta: "#22302a",
  /** Datos aeronáuticos: frecuencias, la rosa. El azul de ENAIRE. 6,9:1. */
  aero: "#2e537a",
  /** Costa, ríos y nombres del agua. 6,0:1. */
  agua: "#255f86",
  /** Cotas y elevaciones. 8,6:1. */
  cota: "#5a3d22",
  /**
   * La ruta: el magenta del juego, un punto más oscuro para el papel. 4,5:1,
   * y por eso va siempre sobre su orla de papel.
   */
  ruta: "#c4239f",
  /** Lo que se escribe en la ruta: rumbo y distancia. 6,8:1. */
  rutaTexto: "#95187a",
  /** El azul de los sellos de Canarias, para marcar lo visitado. 5,6:1. */
  sello: "#1d5fa6",
  /** El aeródromo civil: el negro de ENAIRE. 14,2:1. */
  aerodromo: "#231f20",
  /**
   * El acento de lo elegido. **No viene de la hoja de la carta**: es el ocre
   * del resto del juego, el de «esto es lo tuyo» en el hangar.
   */
  elegido: "#dd923f",
} as const;

/**
 * **La rampa hipsométrica**: los peldaños de la hoja GC de ENAIRE, en pies
 * —0, 1000, 2500, 4000, 6500 y 9000—, más el de 500 que añade la hoja de
 * Gaudí para que el Paraguay, casi todo por debajo de trescientos metros,
 * tenga más de un tinte.
 *
 * En peldaños y sin degradado, y **sin líneas de nivel**, como en la carta
 * real. Un punto más vivos que los de ENAIRE, que son muy pálidos porque
 * encima va toda la información aeronáutica: aquí quien tiene cuatro años lee
 * la isla solo por el relieve.
 */
export const RAMPA: readonly { readonly desde: number; readonly color: Color }[] = [
  { desde: 0, color: "#dfe9c8" },
  { desde: 500 * PIE, color: "#e8edc7" },
  { desde: 1000 * PIE, color: "#f0e9c4" },
  { desde: 2500 * PIE, color: "#ead6ac" },
  { desde: 4000 * PIE, color: "#dfc196" },
  { desde: 6500 * PIE, color: "#d2ab8b" },
  // Hasta los 12 200 ft: el Teide.
  { desde: 9000 * PIE, color: "#ece4dc" },
];

/**
 * **El mar, con sus veriles**: más hondo es más azul, como en un mapa
 * topográfico —las cartas náuticas lo hacen al revés, pero esta es una carta
 * de aire—. El escalón de los doscientos es el fin de la plataforma: en
 * Canarias está pegado a la costa, porque las islas son volcanes que salen de
 * tres mil metros de fondo, y verlo es entender por qué.
 */
export const MAR: readonly { readonly desde: number; readonly color: Color }[] = [
  { desde: 0, color: "#e6f3f8" },
  { desde: 200, color: "#d5eaf3" },
  { desde: 1000, color: "#c3dfec" },
  { desde: 2000, color: "#b3d3e5" },
];

/**
 * La raya de los veriles de 200, 1000 y 2000 m. La hoja la pide de 0,6 px a
 * tamaño real; en la imagen horneada va de un píxel, porque la carta se ve
 * reducida a la mitad más o menos y a 0,6 se perdería.
 */
export const VERILES = { color: "#8dbbd3", grosor: 1 } as const;

/** El agua de tierra adentro: ríos anchos, lagos y embalses. */
export const AGUA_DULCE: Color = "#cfe6f1";

/**
 * **La cubierta del suelo**, que matiza la rampa y no la tapa: el tinte se
 * multiplica sobre ella a su fuerza, `mix(rampa, rampa × tinte, fuerza)`.
 */
export const CUBIERTA = {
  /** El norte húmedo de las islas: laurisilva y pinar. */
  humedo: { color: "#5f8f4e", fuerza: 0.22 },
  /** El sur seco de las islas. */
  seco: { color: "#c9a565", fuerza: 0.16 },
  /** Los malpaíses y las lavas recientes, con su punteado. */
  volcan: { color: "#4d423d", fuerza: 0.28 },
  /** Lanzarote y Fuerteventura, y todo suelo desnudo de la carta. */
  ocre: { color: "#d4a564", fuerza: 0.24 },
  /** El Chaco seco. */
  chaco: { color: "#bfa774", fuerza: 0.18 },
  /** La región oriental del Paraguay, verde. */
  oriental: { color: "#5c9450", fuerza: 0.24 },
  /** Los esteros, con su símbolo de juncos. */
  estero: { color: "#6f9f9a", fuerza: 0.18 },
  /**
   * La ciudad. **No viene de la hoja de Gaudí**: la de ENAIRE pinta los
   * núcleos urbanos en amarillo, y sin esto Asunción no se distinguía del
   * monte. Para que él lo revise.
   */
  ciudad: { color: "#f2cf5b", fuerza: 0.45 },
} as const;

/** El punteado del volcán: puntos de 0,7 px al 55 %. */
export const PUNTEADO = { paso: 4, radio: 0.7, opacidad: 0.55 } as const;

/** Los juncos de los esteros: cada cuántos píxeles de la imagen va uno. */
export const JUNCOS = { paso: 14, opacidad: 0.6 } as const;

/**
 * **El sombreado**, con la luz del noroeste a 45°, que es la convención de la
 * cartografía: la ladera de sombra se oscurece con una sombra fría y no
 * negra, para que el papel siga cálido. Solo en tierra.
 *
 * Más fuerte para quien tiene de cuatro a seis años, que lee la isla solo por
 * su forma: por eso el horno saca dos imágenes por región.
 */
export const SOMBRA = {
  azimut: 315,
  altura: 45,
  color: "#3d3a46",
  fuerza: 0.38,
  fuerzaPequenos: 0.46,
} as const;

/** Cuánto se apaga hacia el papel lo que queda fuera del país dibujado. */
export const FUERA_DEL_PAIS = 0.45;

/** Los grosores, en píxeles CSS a tamaño real. */
export const LINEAS = {
  costa: 1.3,
  rio: 1.6,
  rioMenor: 1,
  reticula: 0.6,
  ruta: 3.2,
  /** La ruta en el calco de cuatro a seis años. */
  rutaPequenos: 4,
  /** La orla de papel a cada lado de la ruta. */
  rutaOrla: 1.5,
} as const;

/** Los tamaños de los símbolos, en píxeles CSS. */
export const SIMBOLOS = {
  aerodromo: 18,
  aerodromoPequenos: 24,
  avion: 28,
  punto: 12,
} as const;

/**
 * Las letras: Barlow Semi Condensed para los nombres y Barlow Condensed para
 * las cifras, las dos de la SIL Open Font License y **dentro del paquete**: el
 * juego no pide nada a terceros mientras se juega. Ver `CREDITOS.md`.
 */
export const LETRAS = {
  nombres: "'Barlow Semi Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif",
  cifras: "'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif",
  isla: 17,
  sitio: 14,
  agua: 15,
  cifra: 13,
  radio: 12,
  /** El halo de papel debajo de cada etiqueta. */
  halo: 3,
} as const;

/**
 * **Las regiones de la carta**: los tres trozos de mundo que tienen campos
 * de verdad. Cada una se hornea en una imagen.
 *
 * - `porGrado`: píxeles por grado de latitud. Canarias más fina porque las
 *   islas son pequeñas —Tenerife cabe en ochenta kilómetros—; el Paraguay
 *   menos, porque mide mil.
 * - `exageracion`: la del sombreado, y es presentación: el Paraguay es tan
 *   llano que sin exagerarlo la cordillera de Amambay no se vería.
 * - `lluvia`: entre qué lluvias del año, en milímetros, va un sitio de seco a
 *   húmedo. Cada región con las suyas, porque «húmedo» en Lanzarote y en
 *   Itapúa no es lo mismo: el norte de Tenerife recoge unos 600 mm y es el
 *   sitio más verde de la isla; en el Paraguay, el Chaco del noroeste anda
 *   por los 500 y la región oriental pasa de los 1.500.
 * - `tintes`: qué pareja de la cubierta es lo húmedo y lo seco de la región.
 *
 * La proyección es la de todo el juego para los mapas: equirrectangular al
 * coseno de la latitud media. Ver `mapa-del-pais.ts`.
 */
export interface Region {
  readonly oeste: number;
  readonly este: number;
  readonly sur: number;
  readonly norte: number;
  readonly porGrado: number;
  readonly exageracion: number;
  readonly lluvia: { readonly seco: number; readonly humedo: number };
  readonly tintes: { readonly humedo: keyof typeof CUBIERTA; readonly seco: keyof typeof CUBIERTA };
  /** El país cuyo contorno se resalta, si la región tiene otros alrededor. */
  readonly pais?: "py";
  /** Si lo de fuera de la costa es mar. */
  readonly conMar: boolean;
}

export type IdRegion = "canarias" | "paraguay" | "madrid";

export const REGIONES: Readonly<Record<IdRegion, Region>> = {
  canarias: {
    oeste: -18.45,
    este: -13.15,
    sur: 27.45,
    norte: 29.55,
    porGrado: 300,
    exageracion: 1.3,
    lluvia: { seco: 180, humedo: 600 },
    tintes: { humedo: "humedo", seco: "seco" },
    conMar: true,
  },
  paraguay: {
    oeste: -63.2,
    este: -53.6,
    sur: -28.2,
    norte: -18.9,
    porGrado: 150,
    exageracion: 6,
    lluvia: { seco: 700, humedo: 1450 },
    tintes: { humedo: "oriental", seco: "chaco" },
    pais: "py",
    conMar: false,
  },
  /*
   * Madrid, por Cuatro Vientos: la sierra de Guadarrama al norte, que es lo
   * que se ve al despegar, y el valle del Tajo al sur.
   */
  madrid: {
    oeste: -4.95,
    este: -2.6,
    sur: 39.75,
    norte: 41.25,
    porGrado: 300,
    exageracion: 1.6,
    lluvia: { seco: 380, humedo: 900 },
    tintes: { humedo: "humedo", seco: "seco" },
    conMar: false,
  },
};

/**
 * Las variables `--carta-*` de la hoja, para ponerlas en el elemento de la
 * carta: el CSS las usa y el valor sale de aquí, que es el único sitio.
 */
export function variablesDeLaCarta(): string {
  return [
    `--carta-papel: ${PAPEL.fondo}`,
    `--carta-reticula: ${PAPEL.reticula}`,
    `--carta-pliegue: ${PAPEL.pliegue}`,
    `--carta-tinta: ${TINTAS.tinta}`,
    `--carta-tinta-aero: ${TINTAS.aero}`,
    `--carta-tinta-agua: ${TINTAS.agua}`,
    `--carta-tinta-cota: ${TINTAS.cota}`,
    `--carta-ruta: ${TINTAS.ruta}`,
    `--carta-ruta-texto: ${TINTAS.rutaTexto}`,
    `--carta-aerodromo: ${TINTAS.aerodromo}`,
    `--carta-elegido: ${TINTAS.elegido}`,
    `--carta-letra-nombres: ${LETRAS.nombres}`,
    `--carta-letra-cifras: ${LETRAS.cifras}`,
    `--carta-halo: ${LETRAS.halo}px`,
  ].join("; ");
}
