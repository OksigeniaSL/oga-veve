/**
 * **La hoja de la instructora**: lo que se gana en cada vuelo, dibujado como
 * se gana de verdad.
 *
 * ## Por qué ya no son barras
 *
 * La manga del HUD dibujaba hasta seis barras por vuelo —una por cada galón
 * de `flight/galones.ts`— y el cuaderno, al lado, enseñaba las barras del
 * grado con sus cifras reales. Seis barras en una manga no las lleva ningún
 * uniforme del mundo, así que el juego enseñaba a contar barras que no
 * significaban nada, justo lo contrario de «lo que se enseña es real». Enrique
 * lo zanjó así: «Claro, que sea real, y si hay varios modos, pues el más usado
 * en LATAM–UE».
 *
 * Lo real tiene dos piezas, y cada una va a su sitio:
 *
 * - **Las barras son el grado**, y solo el grado: una el cadete, dos el
 *   segundo oficial, tres el primer oficial y cuatro la comandante, que es el
 *   esquema de las líneas de Latinoamérica y de Europa. Ver `barrasDe` en
 *   `flight/cuaderno.ts`. La manga las lleva en el HUD, en el final del vuelo,
 *   en el ascenso y en el cuaderno, y nunca más de cuatro.
 * - **Lo de cada vuelo es la hoja de evaluación**, que es lo que rellena una
 *   instructora de verdad al bajar del avión en una escuela: una fila por
 *   ejercicio y una marca en cada uno hecho como se pide. Es la ficha de
 *   evaluación por competencias de OACI —el Doc 9995, *Manual of
 *   Evidence-based Training*, y los PANS-TRG del Doc 9868— y de EASA, que en
 *   una organización de formación aprobada (ATO) se llama *grading sheet* y va
 *   con cada lección. Aquí las filas son las partes del vuelo que ya medía el
 *   juego: la aproximación estabilizada, la frustrada cuando tocaba, la toma,
 *   los aros, la velocidad y el rodaje.
 *
 * ## Sin tachar y sin huecos
 *
 * La simplificación es de presentación, no de contenido: una hoja de verdad
 * lista todos los ejercicios, y esta solo enseña los que ya llevan su visto.
 * Es la misma regla de los galones —ver la cabecera de `flight/galones.ts`,
 * «se ganan, no se pierden» y «no puede castigar»—: una fila vacía o tachada
 * es un reproche, y una fila que aparece con su visto es un premio. Lo ganado
 * no se quita, y lo que no se ha ganado todavía no está.
 *
 * ## Y sin una palabra en el peldaño que no lee
 *
 * Cada fila es el dibujo de la parte, el mismo de su tarjeta de señal —la
 * senda, la toma, la frustrada, la velocidad, la raya de rodar—, con un visto
 * verde. Así se lee en Guyrami. El nombre de la parte va al lado desde el
 * peldaño de la palabra, en el final del vuelo, que es donde hay sitio para
 * leer. Ver `flight/escalera.ts`.
 *
 * Esto solo dibuja: qué se ganó lo dice `Galones`, y cuándo se enseña, quien
 * lo llama.
 */

import { GALONES, type Galon } from "../flight/galones";
import type { Vuelo } from "../flight/bitacora";
import { t, type TranslationKey } from "../i18n";
import { DIBUJOS } from "./senal";

/** Un dibujo en el lienzo de veinticuatro de la tarjeta de señal. */
const icono = (cuerpo: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${cuerpo}</svg>`;

/**
 * **El aro**, de frente y con el avión cruzándolo.
 *
 * La tarjeta de señal no tiene uno así: sus dos aros llevan la flecha de
 * subir o bajar hacia él, que es una orden. Aquí lo que se marca es haberlos
 * cruzado, así que va el aro con el avión dentro.
 */
const ARO = icono(`
  <ellipse cx="12" cy="12" rx="8.6" ry="10" fill="none" stroke="currentColor" stroke-width="2.4" />
  <path d="M12 7.6 l1 3.2 3.8 1.3 v1.1 l-3.8-.7 -.3 2.4 1.2.9 v.9 l-1.9-.5 -1.9.5 v-.9
           l1.2-.9 -.3-2.4 -3.8.7 v-1.1 l3.8-1.3 Z" />
`);

/** El dibujo de cada fila. Los que ya existen, de la tarjeta de señal. */
const DIBUJO_DE: Readonly<Record<Galon, string>> = {
  aproximacion: DIBUJOS.senda,
  frustrada: DIBUJOS.frustrada,
  toma: DIBUJOS.toma,
  aros: ARO,
  velocidad: DIBUJOS.velocidad,
  // La raya de rodar, la misma que pide seguirla.
  rodaje: DIBUJOS.amarillo,
};

/**
 * **El visto**: un círculo verde con su marca. Es el único dibujo que dice
 * «bien hecho» en la hoja, y va igual en las tres hojas del juego.
 */
const VISTO = `<svg class="hoja__visto" viewBox="0 0 12 12" aria-hidden="true">
  <circle cx="6" cy="6" r="6" />
  <path d="M3.1 6.3 l2 2 l3.9-4.2" />
</svg>`;

/* ── Lo de antes de volar ─────────────────────────────────────────────── */

/**
 * **Dar la vuelta al avión**: el avión visto desde arriba y la flecha que lo
 * rodea, que es lo que se hace a pie antes de cada vuelo. Es el mismo dibujo
 * que el botón que la abre en el HUD: un dibujo, un significado.
 */
export const VUELTA_AL_AVION = icono(`
  <path d="M12 6.5 v11 M7 11.5 h10 M10 16.5 h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <path d="M4.2 8 A9 9 0 1 1 6 18.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="2.4 2.2"/>
  <path d="M2.4 6.2 L4.4 9.4 L7.2 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
`);

/**
 * **Y la vuelta a medias**: el mismo avión con la flecha que lo rodea hasta
 * la mitad. Es lo que pasó, ni más ni menos, y por eso no lleva visto ni
 * tachón: se ve hasta dónde se llegó.
 */
const VUELTA_A_MEDIAS = icono(`
  <path d="M12 6.5 v11 M7 11.5 h10 M10 16.5 h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <path d="M4.2 8 A9 9 0 0 1 19.8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="2.4 2.2"/>
  <path d="M2.4 6.2 L4.4 9.4 L7.2 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
`);

/**
 * **Hoy me quedo**: el avión quieto en su puesto, bajo techo. Es el dibujo del
 * botón de quedarse de la tarjeta del tiempo (`ui/tarjeta-del-tiempo.ts`), que
 * es donde se aprende.
 */
const EN_TIERRA = icono(`
  <path d="M3 10 L12 4 L21 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M12 9 v8 M6 14 h12 M9.5 19 h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
`);

/* ── La hoja ─────────────────────────────────────────────────────────── */

/** Dónde se pinta la hoja: cambia el tamaño, no lo que dice. */
export type DondeVaLaHoja = "hud" | "fin" | "cuaderno";

/** Si la hoja lleva el nombre de cada parte, y cuál. */
export type NombresDeLaHoja = "corto" | "entero" | false;

/**
 * **Los nombres que lleva la hoja en cada peldaño**, por la escalera de
 * comunicación: ninguno en el del dibujo, la palabra sola en el de la palabra
 * y el nombre entero desde el de las cifras. Ver `flight/escalera.ts`.
 */
export function nombresDelPeldano(canales: {
  readonly texto: boolean;
  readonly corto: boolean;
}): NombresDeLaHoja {
  return canales.texto ? (canales.corto ? "corto" : "entero") : false;
}

export interface ComoVaLaHoja {
  readonly donde: DondeVaLaHoja;
  /**
   * Con el nombre de cada parte al lado, y solo donde hay sitio para leer: el
   * final del vuelo. `"corto"` es la palabra sola del peldaño de la palabra
   * —«Toma», «Senda»—, y `"entero"` el nombre del ejercicio desde el de las
   * cifras —«Aproximación estabilizada»—. Ver `nombresDelPeldano`.
   */
  readonly conNombres?: NombresDeLaHoja;
  /**
   * Las que ya estaban pintadas, para que entren con su animación **solo las
   * nuevas**. Va por nombre y no por cuántas: la frustrada entra en medio de
   * la hoja, delante de la toma, y contar por posición marcaba como nueva la
   * que no lo era.
   */
  readonly yaEstaban?: readonly string[];
}

/**
 * **Las partes que se marcan, en el orden de la hoja**: el de un vuelo.
 *
 * Y solo las que existen: la bitácora es del aparato y guarda nombres como
 * texto, así que un perfil viejo, uno editado a mano o uno de una versión que
 * tuviera otra parte no puede pintar una fila sin dibujo.
 */
export function partesDeLaHoja(lista: readonly string[]): Galon[] {
  return GALONES.filter((g) => lista.includes(g));
}

/** Una fila: el dibujo, su visto y, si toca, el nombre. */
function fila(
  dibujo: string,
  parte: string,
  nombre: string | null,
  nueva: boolean,
  visto = true,
): string {
  return `<li class="hoja__parte${nueva ? "" : " hoja__parte--ya"}${visto ? "" : " hoja__parte--sin-visto"}" data-parte="${parte}">
      <span class="hoja__dibujo">${dibujo}${visto ? VISTO : ""}</span>${
        nombre ? `<span class="hoja__nombre">${nombre}</span>` : ""
      }</li>`;
}

/** El nombre de una parte, que también es lo que dice el lector de pantalla. */
const nombreDe = (g: Galon): string => t(`galon.${g}` as TranslationKey);
/** Y la palabra sola, para el peldaño de la palabra. */
const palabraDe = (g: Galon): string => t(`galon.${g}.corta` as TranslationKey);

/**
 * **La hoja de un vuelo**, en HTML. Vacía si no hay nada marcado: una hoja en
 * blanco sería el hueco que este juego no dibuja.
 *
 * El nombre de cada parte va siempre en la etiqueta, que es lo que lee un
 * lector de pantalla: no pasa por la escalera.
 */
export function hoja(lista: readonly string[], como: ComoVaLaHoja): string {
  const partes = partesDeLaHoja(lista);
  if (!partes.length) return "";
  const ya = new Set(como.yaEstaban ?? partes);
  const filas = partes
    .map((g) =>
      fila(
        DIBUJO_DE[g],
        g,
        como.conNombres === "entero"
          ? nombreDe(g)
          : como.conNombres === "corto"
            ? palabraDe(g)
            : null,
        !ya.has(g),
      ),
    )
    .join("");
  return envolver(filas, como.donde, partes.map(nombreDe));
}

/** La tablilla con su pinza, y la etiqueta entera para quien no la ve. */
function envolver(filas: string, donde: DondeVaLaHoja, nombres: readonly string[]): string {
  return `<div class="hoja hoja--${donde}" role="img" aria-label="${t("galon.manga")}: ${nombres.join(", ")}">
    <span class="hoja__pinza" aria-hidden="true"></span>
    <ul class="hoja__lista">${filas}</ul>
  </div>`;
}

/**
 * **La hoja de un vuelo de la bitácora**, para su línea del cuaderno: lo de
 * antes de volar delante —la vuelta al avión, quedarse en tierra, el despegue
 * abortado— y después las partes del vuelo. En una hoja de escuela de verdad
 * también va primero la inspección prevuelo y la decisión de salir o no: es
 * el primer ejercicio de cada lección.
 *
 * **Quedarse en tierra cuenta como un día bien decidido**, y el despegue
 * abortado por la funda del pitot, como una frustrada: llevan su visto igual
 * que una toma. Renunciar es ganar (AGENTS.md).
 */
export function hojaDelVuelo(v: Pick<Vuelo, "galones" | "antes">): string {
  const antes = v.antes ?? {};
  const filas: string[] = [];
  const nombres: string[] = [];
  if (antes.vuelta === "entera") {
    filas.push(fila(VUELTA_AL_AVION, "vuelta", null, false));
    nombres.push(t("hoja.vuelta"));
  } else if (antes.vuelta === "a-medias") {
    filas.push(fila(VUELTA_A_MEDIAS, "vuelta-a-medias", null, false, false));
    nombres.push(t("hoja.vueltaAMedias"));
  }
  if (antes.decision === "en-tierra") {
    filas.push(fila(EN_TIERRA, "en-tierra", null, false));
    nombres.push(t("hoja.enTierra"));
  } else if (antes.decision === "abortado") {
    filas.push(fila(DIBUJOS["pitot-tapado"], "abortado", null, false));
    nombres.push(t("hoja.abortado"));
  }
  const partes = partesDeLaHoja(v.galones);
  for (const g of partes) {
    filas.push(fila(DIBUJO_DE[g], g, null, false));
    nombres.push(nombreDe(g));
  }
  if (!filas.length) return "";
  return envolver(filas.join(""), "cuaderno", nombres);
}
