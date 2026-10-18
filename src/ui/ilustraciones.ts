/**
 * **Las ilustraciones del juego**: los dibujos de cuento de Jazlyn y su flota,
 * de Ara en su primer vuelo y de la cabina de pasaje.
 *
 * Pedido por Enrique (punto 278 de su lista), con la colección terminada: una
 * serie de dibujos del mismo estilo, coherentes entre sí, de Oksigenia SL y con
 * licencia de uso de su proveedor —ver `CREDITOS.md`—. Van en tres sitios, y
 * en cada uno por lo que cuenta:
 *
 * - **En la ventanita de la escena de pasaje**, con lo que se dice en ese
 *   instante: la cabina vacía del embarque, la cabina llena al pedir el
 *   cinturón, la tripulante al lado de Ara, Ara con la cara contra el cristal
 *   y la comandante en su cabina cuando habla por la megafonía. Ver
 *   `flight/inicio-pasaje.ts`.
 * - **En la tarjeta del avión, abierta desde el hangar**: cómo es por fuera y
 *   cómo es por dentro, con Jazlyn a los mandos. Ver `ilustracionesDelAvion`.
 * - **En la cara de quien habla**, la de Jazlyn. Ver `RETRATO_DE_JAZLYN`.
 *
 * ## Lo que se enseña es real, también en un dibujo
 *
 * Antes de entrar se miró cada una de cerca —las barras de las hombreras, los
 * asientos, lo que se ve por la ventanilla—, y lo que no era verdad se recortó
 * o no entró: una comandante lleva cuatro barras y quien va a su derecha,
 * tres; y una ilustración no sale cuando dice otra cosa que lo que está
 * pasando —un cielo de nubes por la ventanilla con el avión en tierra—. Lo
 * que se hizo con cada una, en `ilustraciones-recetas.ts`.
 *
 * ## Se bajan cuando hacen falta
 *
 * Como las fotos de las historias —ver `fotos-de-las-historias.ts`—: no van en
 * la precarga del trabajador de servicio, entran por `import.meta.glob` como
 * URL con la huella en el nombre, y se guardan la primera vez que se piden.
 * Son unos 345 KB entre las dieciocho, y en un vuelo se ven cinco como mucho.
 * Sin red y sin copia, la ventanita no sale y la cara se queda dibujada.
 */

import { hayTexto, t } from "../i18n";
import { RECETAS, TAMANO_DEL_HUECO, type HuecoDeLaIlustracion } from "./ilustraciones-recetas";

export { RECETAS, TAMANO_DEL_HUECO, type HuecoDeLaIlustracion };

/**
 * Las URL de los ficheros, por nombre: Vite las sirve en desarrollo y les pone
 * la huella al compilar. Sin `eager` serían módulos que importar uno a uno, y
 * aquí solo hace falta la cadena.
 */
const FICHEROS = import.meta.glob("../assets/ilustraciones/*.webp", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const urlDe = (clave: string): string | null =>
  RECETAS[clave] ? (FICHEROS[`../assets/ilustraciones/${clave}.webp`] ?? null) : null;

/** La clave del texto alternativo de cada ilustración. */
export const claveDelAlt = (clave: string): string => `ilustracion.${clave}`;

/** Lo que hace falta para enseñar una ilustración. */
export interface Ilustracion {
  readonly clave: string;
  readonly url: string;
  /** El `alt`: corto, y en el idioma de quien juega. */
  readonly alt: string;
}

/** La ilustración de esa clave, o `null` si no la hay. */
export function ilustracion(clave: string): Ilustracion | null {
  const url = urlDe(clave);
  if (!url) return null;
  const alt = claveDelAlt(clave);
  return { clave, url, alt: hayTexto(alt) ? t(alt) : "" };
}

/** Las claves que tienen fichero de verdad. Para las pruebas. */
export const CON_FICHERO: readonly string[] = Object.keys(RECETAS).filter((c) => urlDe(c));

// ── La escena de pasaje ──────────────────────────────────────────────────

/** Las de la ventanita de la escena de pasaje. */
export type IlustracionDelPasaje =
  | "pasaje-embarque"
  | "pasaje-lleno"
  | "pasaje-tripulante"
  | "pasaje-ara-ventanilla"
  | "pasaje-comandante";

/**
 * **Cómo la pide la escena**: como pide un dibujo o una foto, con un prefijo
 * delante —`ilustracion:`—, que es también el sitio que ocupa en la ventanita.
 * Ver `mirarLaVentanita` en `flight/inicio-pasaje.ts`.
 */
export const PREFIJO_DE_ILUSTRACION = "ilustracion:";

/** Lo que va en el `dibujo` de una frase para que salga esta ilustración. */
export const enLaVentanita = (clave: IlustracionDelPasaje): string => `${PREFIJO_DE_ILUSTRACION}${clave}`;

/** Si lo que pide una frase es una ilustración, cuál; si no, `null`. */
export function ilustracionPedida(dibujo: string): string | null {
  return dibujo.startsWith(PREFIJO_DE_ILUSTRACION) ? dibujo.slice(PREFIJO_DE_ILUSTRACION.length) : null;
}

// ── La tarjeta del avión ─────────────────────────────────────────────────

/**
 * **Cómo es por fuera y cómo es por dentro**, para la tarjeta del avión: los
 * dos dibujos de ese avión de la flota, o `null` si no los tiene. Por fuera,
 * volando sobre el sitio que le toca; por dentro, con Jazlyn a los mandos.
 */
export function ilustracionesDelAvion(
  id: string,
): { readonly fuera: Ilustracion; readonly cabina: Ilustracion } | null {
  const fuera = ilustracion(`fuera-${id}`);
  const cabina = ilustracion(`cabina-${id}`);
  return fuera && cabina ? { fuera, cabina } : null;
}

// ── La cara de Jazlyn ────────────────────────────────────────────────────

/**
 * **El retrato de Jazlyn**, en redondo y con el fondo transparente: la cara
 * de quien habla en el modo inicio, encima de la dibujada, que se queda debajo
 * por si la imagen no llega. Ver `caraDe` en `ui/inicio.ts`.
 */
export const RETRATO_DE_JAZLYN: string | null = urlDe("retrato-jazlyn");
