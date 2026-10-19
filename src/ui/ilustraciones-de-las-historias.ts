/**
 * **Las ilustraciones de las historias de la ventanilla**: cuál va con cada
 * historia, y dónde mirar cuando no cabe entera.
 *
 * Pedido por Enrique (punto 252 de su lista): que mientras Jazlyn cuenta la
 * historia de lo que se ve por la ventanilla —el Garoé que bebía de la
 * niebla, las canoas cargadas para rodear el Iguazú— salga una imagen de eso
 * mismo. Primero fueron fotos de Wikimedia Commons, y parecían «sacadas de
 * enciclopedias empolvadas» (punto 306): ahora son dibujos de cuento de la
 * misma colección que los demás del juego, de Oksigenia SL y con licencia de
 * uso de su proveedor —ver `CREDITOS.md`—.
 *
 * ## Dibujan lo que cuenta la historia
 *
 * No el sitio, sino lo que se cuenta de él: el Teide en corte con la parte
 * que queda debajo del mar, Humboldt dibujando los pisos de la montaña, el
 * silbo cruzando el barranco, las canoas a hombros alrededor de las
 * cataratas. Es la regla cuarta de AGENTS.md aplicada a un dibujo: lo que se
 * dibuja es como es —el tapir es un tapir y el hito paraguayo lleva sus
 * colores—, y un dibujo puede enseñar lo que una foto no puede, que es lo que
 * no se ve.
 *
 * Todas están anotadas en `CREDITOS.md`, y
 * `ilustraciones-de-las-historias.test.ts` no deja entrar una que no lo esté.
 * Cómo se hacen —enteras, en 4:3, a 1280 × 960— y dónde mirar en cada una,
 * en `ilustraciones-recetas.ts`; las hace `scripts/hacer-ilustraciones.mjs`.
 *
 * ## Enteras en grande, y con su foco en pequeño
 *
 * En la lámina grande del pasaje salen enteras: la lámina toma la proporción
 * de la imagen. En la ventanita de los vuelos de siempre, que es de 3:2, y en
 * la placa de las avionetas, de 5:3, sobra alto y se quita: centrado si no se
 * dice otra cosa, y si centrado se pierde lo que cuenta la historia —el
 * agujero por donde entra el sol en Risco Caído—, por donde dice su foco.
 * Nunca se deforma. Ver `foco` en la receta.
 *
 * ## Se bajan cuando hacen falta
 *
 * No van en la precarga del trabajador de servicio —son unos tres megas entre
 * las veinticinco y en un vuelo se ven dos o tres—: entran por
 * `import.meta.glob` como URL, así que Vite les pone la huella en el nombre y
 * el trabajador de servicio las guarda la primera vez que se piden, como las
 * teselas. Ver `scripts/plantilla-sw.js`.
 */

import { hayTexto, t } from "../i18n";
import { RECETAS_DE_LAS_HISTORIAS, TAMANO_DEL_HUECO } from "./ilustraciones-recetas";

export { RECETAS_DE_LAS_HISTORIAS };

/**
 * **Las historias que van sin ilustración, y por qué.** Hoy ninguna: las
 * veinticinco tienen la suya. La que entre sin dibujo se apunta aquí con el
 * motivo, y se cuenta sin ventana.
 */
export const SIN_ILUSTRACION: Readonly<Record<string, string>> = {};

/** El tamaño al que están hechas: ver `TAMANO_DEL_HUECO`. */
export const TAMANO_DE_LA_HISTORIA = TAMANO_DEL_HUECO.historia;

/** Dónde mirar si no se dice otra cosa: en medio. */
export const FOCO_CENTRADO = 0.5;

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
  RECETAS_DE_LAS_HISTORIAS[clave] ? (FICHEROS[`../assets/historias/${clave}.webp`] ?? null) : null;

/** Las claves de las historias que tienen ilustración, con su fichero de verdad. */
export const CON_ILUSTRACION: readonly string[] = Object.keys(RECETAS_DE_LAS_HISTORIAS).filter((c) =>
  urlDe(c),
);

/** Lo que hace falta para enseñar la ilustración de una historia. */
export interface IlustracionDeLaHistoria {
  readonly clave: string;
  readonly url: string;
  /** El `alt`: corto, y en el idioma de quien juega. */
  readonly alt: string;
  /** La altura que se queda a la vista si no cabe entera, de 0 a 1. Ver `FocoDeLaHistoria`. */
  readonly foco: number;
}

/**
 * La clave del texto alternativo de cada una. Dice «foto» porque las primeras
 * lo eran, y la clave se queda: la llevan también las traducciones.
 */
export const claveDelAlt = (clave: string): string => `historia.foto.${clave}`;

/** La ilustración de la historia de este sitio, o `null` si no tiene. */
export function ilustracionDeLaHistoria(clave: string): IlustracionDeLaHistoria | null {
  const url = urlDe(clave);
  if (!url) return null;
  const alt = claveDelAlt(clave);
  return {
    clave,
    url,
    alt: hayTexto(alt) ? t(alt) : "",
    foco: RECETAS_DE_LAS_HISTORIAS[clave]?.foco?.y ?? FOCO_CENTRADO,
  };
}

/**
 * **Y que esté bajada antes de que haga falta.**
 *
 * La historia va detrás de la frase del sitio, que dura sus diez segundos: si
 * la ilustración se pide cuando empieza la frase, cuando empieza la historia
 * ya está —en la caché del navegador y, desde ahí, en la del trabajador de
 * servicio—. Sin red no pasa nada: la ventana no sale y la historia se oye
 * igual.
 */
const pedidas = new Set<string>();
export function precargarLaIlustracion(clave: string): void {
  const ilustracion = ilustracionDeLaHistoria(clave);
  if (!ilustracion || pedidas.has(clave) || typeof Image === "undefined") return;
  pedidas.add(clave);
  const img = new Image();
  img.decoding = "async";
  img.src = ilustracion.url;
}
