/**
 * **Las fotos de las historias de la ventanilla**: cuál va con cada historia,
 * de quién es y bajo qué licencia.
 *
 * Pedido por Enrique (punto 252 de su lista): que mientras Jazlyn cuenta la
 * historia de lo que se ve por la ventanilla —el Garoé que bebía de la
 * niebla, las canoas cargadas para rodear el Iguazú— salga una imagen de eso
 * mismo, «con licencia verificable (Wikimedia Commons, dominio público o CC)».
 *
 * ## Una por historia, y solo si la hay de verdad
 *
 * Cada foto sale de Wikimedia Commons con su licencia escrita en la ficha:
 * dominio público, CC0, CC BY o CC BY-SA. La que no se pudo encontrar así no
 * se sustituye por otra parecida ni se dibuja una de mentira: esa historia va
 * sin foto, y la voz la cuenta igual. Es la regla cuarta de AGENTS.md —lo que
 * se enseña es real— aplicada a una imagen: el tapir es un tapir, el hito
 * paraguayo es el hito paraguayo, y la cueva es una cueva de Risco Caído.
 *
 * Todas están anotadas en `CREDITOS.md` con su autor, su licencia, su página
 * de Commons y lo que se les hizo —recortarlas a 3:2 y dejarlas en 480 × 320,
 * que es el doble de lo que miden en pantalla—, y `fotos-de-las-historias.test.ts`
 * no deja entrar una que no lo esté.
 *
 * ## Y el crédito, a la vista
 *
 * CC BY y CC BY-SA piden que se nombre a quien hizo la foto **donde se usa**,
 * no solo en un fichero del repositorio; así que la ventana lleva su firma en
 * pequeño —«Mike Peel (www.mikepeel.net) · CC BY-SA 4.0»— mientras se ve. Las
 * de dominio público y CC0 no la piden y no la llevan. Ver `firmaDe`.
 *
 * ## Se bajan cuando hacen falta
 *
 * No van en la precarga del trabajador de servicio —son 740 KB entre las
 * veinticinco y la mayoría no se ve en un vuelo—: entran por
 * `import.meta.glob` como URL, así que Vite les pone la huella en el nombre y
 * el trabajador de servicio las guarda la primera vez que se piden, como las
 * teselas. Ver `scripts/plantilla-sw.js`.
 */

import { hayTexto, t } from "../i18n";

/** Las licencias que hay, como se escriben en la firma. */
export type LicenciaDeLaFoto =
  | "dominio público"
  | "CC0"
  | "CC BY 2.0"
  | "CC BY 3.0"
  | "CC BY 4.0"
  | "CC BY-SA 2.0"
  | "CC BY-SA 3.0"
  | "CC BY-SA 4.0";

/** La ficha de una foto, como está en Commons. */
export interface FichaDeLaFoto {
  /** Quién la hizo, como pide que se le nombre. */
  readonly autor: string;
  readonly licencia: LicenciaDeLaFoto;
  /** Su página en Wikimedia Commons, que es donde se comprueba todo lo de arriba. */
  readonly pagina: string;
}

/**
 * **La foto de cada historia**, por la clave del sitio: la misma de
 * `ventanilla.historia.<clave>`.
 *
 * El porqué de cada una —qué se buscó y por qué esa y no otra— está en
 * `CREDITOS.md`, junto a su ficha.
 */
export const FOTOS: Readonly<Record<string, FichaDeLaFoto>> = {
  // Canarias.
  teide: {
    autor: "Greenx",
    licencia: "dominio público",
    pagina: "https://commons.wikimedia.org/wiki/File:Teide_from_east.jpg",
  },
  canadas: {
    autor: "Dorian Cols",
    licencia: "CC BY 2.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Echium_Wildpretii_at_The_Teide.jpg",
  },
  anaga: {
    autor: "FrDr",
    licencia: "CC BY 4.0",
    pagina:
      "https://commons.wikimedia.org/wiki/File:Parque_Rural_de_Anaga_-_Reserva_de_la_Biosfera_Macizo_de_Anaga_06.jpg",
  },
  orotava: {
    autor: "Joseph Karl Stieler",
    licencia: "dominio público",
    pagina:
      "https://commons.wikimedia.org/wiki/File:Stieler,_Joseph_Karl_-_Alexander_von_Humboldt_-_1843.jpg",
  },
  gigantes: {
    autor: "Gustavo A. Pérez",
    licencia: "CC BY-SA 4.0",
    pagina:
      "https://commons.wikimedia.org/wiki/File:Caladeron_Tropical_-_Globicephala_macrorhynchus.jpg",
  },
  garajonay: {
    autor: "Akalvin",
    licencia: "CC BY-SA 3.0",
    pagina: "https://commons.wikimedia.org/wiki/File:El_Silbo.jpg",
  },
  taburiente: {
    autor: "Whyistheskyblue1",
    licencia: "CC BY-SA 4.0",
    pagina:
      "https://commons.wikimedia.org/wiki/File:William_Herschel_Telescope_and_Comet_Tsuchinshan–ATLAS.jpg",
  },
  tajogaite: {
    autor: "Mike Peel (www.mikepeel.net)",
    licencia: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:At_La_Palma_2021_0839.jpg",
  },
  hierro: {
    autor: "Josefir Instantes",
    licencia: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Árbol_Garoé_desde_el_suelo.jpg",
  },
  nieves: {
    autor: "Sino Yu",
    licencia: "CC0",
    pagina: "https://commons.wikimedia.org/wiki/File:Risco_Caído_20191231_134919.jpg",
  },
  "las-palmas": {
    autor: "Zarateman",
    licencia: "CC0",
    pagina:
      "https://commons.wikimedia.org/wiki/File:Baiona_-_Museo-Réplica_de_la_Carabela_Pinta_1.JPG",
  },
  timanfaya: {
    autor: "Andreas Tusche",
    licencia: "dominio público",
    pagina: "https://commons.wikimedia.org/wiki/File:Lanzarote_Timanfaya_Geysir.jpg",
  },
  // Paraguay.
  "rio-paraguay": {
    autor: "Coordenação-Geral de Observação da Terra/INPE",
    licencia: "CC BY-SA 2.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Around_Puerto_Antequera.jpg",
  },
  asuncion: {
    autor: "Geossegawa",
    licencia: "CC BY 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Uprooted_cassava_01.jpg",
  },
  ypacarai: {
    autor: "Leandro Neumann Ciuffo",
    licencia: "CC BY 2.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Lago_Ypacarai.jpg",
  },
  ypoa: {
    autor: "Paolo Mendoza",
    licencia: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Rivera_Del_Lago_Ypoa.jpg",
  },
  yacyreta: {
    autor: "german ramirez",
    licencia: "CC0",
    pagina: "https://commons.wikimedia.org/wiki/File:Luna_en_yacyreta.jpg",
  },
  itaipu: {
    autor: "queulat00",
    licencia: "CC BY 2.0",
    pagina: "https://commons.wikimedia.org/wiki/File:249_turbinas_itaipu_(6975012271).jpg",
  },
  iguazu: {
    autor: "Martin St-Amant",
    licencia: "CC BY 3.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Iguazu_Décembre_2007_-_Panorama_8.jpg",
  },
  "triple-frontera": {
    autor: "SamirNosteb, Diego HC",
    licencia: "CC BY-SA 3.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Hito_de_las_Tres_Fronteras_PARAGUAY.jpg",
  },
  "cerro-cora": {
    autor: "Mark Bolnik",
    licencia: "CC BY 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Tapirus_terrestris_136722113.jpg",
  },
  chaco: {
    autor: "Xemenendura",
    licencia: "CC BY-SA 3.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Ceiba_chodatii_Marbella.JPG",
  },
  encarnacion: {
    autor: "Horacio Cambeiro",
    licencia: "CC BY 4.0",
    pagina:
      "https://commons.wikimedia.org/wiki/File:Puente_Internacional_San_Roque_Gonzalez_de_Santa_Cruz.jpg",
  },
  trinidad: {
    autor: "Falk2",
    licencia: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:J37_761_Engelfries.jpg",
  },
  "cruz-del-sur": {
    autor: "Yulanlu97",
    licencia: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:The_Crux_from_Southeastern_Queensland.jpg",
  },
};

/**
 * **Las historias que van sin foto, y por qué.** Hoy ninguna: las veinticinco
 * tienen la suya. La que entre y no la encuentre con licencia verificable se
 * apunta aquí con el motivo, y se cuenta sin ventana.
 */
export const SIN_FOTO: Readonly<Record<string, string>> = {};

/** El tamaño al que están hechas: el doble del hueco en el que se ven. */
export const TAMANO_DE_FOTO = { ancho: 480, alto: 320 } as const;

/**
 * Las URL de los ficheros, por nombre: Vite las sirve en desarrollo y les pone
 * la huella al compilar. Sin `eager` serían módulos que importar uno a uno, y
 * aquí solo hace falta la cadena.
 */
const FICHEROS = import.meta.glob("../assets/historias/*.webp", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const urlDe = (clave: string): string | null =>
  FICHEROS[`../assets/historias/${clave}.webp`] ?? null;

/** Las claves de las historias que tienen foto, con su fichero de verdad. */
export const CON_FOTO: readonly string[] = Object.keys(FOTOS).filter((c) => urlDe(c));

/** Si esta licencia pide que se nombre a quien hizo la foto. */
export const pideFirma = (l: LicenciaDeLaFoto): boolean => l.startsWith("CC BY");

/**
 * **La firma que va en pequeño sobre la foto**, o `null` si la licencia no
 * la pide. Nombre y licencia y nada más: no hay que leerla para entender la
 * foto, es lo que se le debe a quien la hizo.
 */
export function firmaDe(clave: string): string | null {
  const f = FOTOS[clave];
  return f && pideFirma(f.licencia) ? `${f.autor} · ${f.licencia}` : null;
}

/** Lo que hace falta para enseñar la foto de una historia. */
export interface FotoDeLaHistoria {
  readonly clave: string;
  readonly url: string;
  /** El `alt`: corto, y en el idioma de quien juega. */
  readonly alt: string;
  readonly firma: string | null;
}

/** La clave del texto alternativo de cada foto. */
export const claveDelAlt = (clave: string): string => `historia.foto.${clave}`;

/** La foto de la historia de este sitio, o `null` si no tiene. */
export function fotoDeLaHistoria(clave: string): FotoDeLaHistoria | null {
  const url = FOTOS[clave] ? urlDe(clave) : null;
  if (!url) return null;
  const alt = claveDelAlt(clave);
  return {
    clave,
    url,
    alt: hayTexto(alt) ? t(alt) : "",
    firma: firmaDe(clave),
  };
}

/**
 * **Y que esté bajada antes de que haga falta.**
 *
 * La historia va detrás de la frase del sitio, que dura sus diez segundos: si
 * la foto se pide cuando empieza la frase, cuando empieza la historia ya está
 * —en la caché del navegador y, desde ahí, en la del trabajador de servicio—.
 * Sin red no pasa nada: la ventana no sale y la historia se oye igual.
 */
const pedidas = new Set<string>();
export function precargarLaFoto(clave: string): void {
  const foto = fotoDeLaHistoria(clave);
  if (!foto || pedidas.has(clave) || typeof Image === "undefined") return;
  pedidas.add(clave);
  const img = new Image();
  img.decoding = "async";
  img.src = foto.url;
}
