/**
 * **La radio en la rosa** de la pantalla de navegación: la aguja del ADF y el
 * CDI del VOR, como los pinta la pantalla de navegación de un avión de línea
 * o el HSI de un cristal. No es una cabina nueva: son dos agujas sobre la
 * rosa que ya está (#51). El modelo es `flight/radio-de-navegacion.ts`.
 *
 * ## Qué hay y de qué color
 *
 * - **La aguja del ADF**, en cian, el color del dato auxiliar —el viento, la
 *   GS—, que es el de las agujas del ADF en las pantallas de Boeing. Apunta a
 *   la estación: su ángulo contra la línea de fe es la marcación relativa.
 *   Sin señal no se pinta, que es lo que hace esa pantalla.
 * - **El curso del OBS y su barra**, en magenta: es lo que se quiere, como la
 *   ruta. La flecha va sobre la rosa en el curso elegido; la barra del centro
 *   se aparta hacia el lado donde queda el radial, dos puntos a cada lado
 *   —cinco grados el punto en un VOR, uno y cuarto en un localizador—. Y el
 *   triángulo del TO/FROM, hacia la punta si el curso lleva a la estación y
 *   hacia la cola si se aleja.
 * - **La bandera NAV**, roja con la palabra en tinta oscura, como las luces de
 *   aviso del cuadro: sin señal, encima de la estación o de través, la barra
 *   no vale y la bandera tapa el centro. Es la de un HSI de verdad.
 * - En las esquinas de abajo, como en la pantalla de navegación de un
 *   reactor: a la izquierda la NAV —la estación, su frecuencia, el curso y el
 *   DME— y a la derecha el ADF.
 *
 * ## Desde qué peldaño
 *
 * Desde el que tiene **la radio** en la carta (`calcosDe(...).radio`), que es
 * el de cabina: es el mismo calco que pinta las frecuencias y las radioayudas,
 * así que la radio aparece en la cabina el mismo día que en la carta.
 *
 * ## Las esquinas se tocan
 *
 * Son el mando de la cabina con el dedo: tocar la NAV o el ADF pasa a la
 * estación siguiente más cercana, y la franja del curso tiene dos mitades,
 * menos y más, como la rueda de la ventanilla ALT. Ver `Hud`.
 */

import { calcosDe, PELDANOS } from "../flight/escalera";
import {
  ESCALA_LOC,
  ESCALA_VOR,
  vuelta,
  type LecturaDeLaRadio,
} from "../flight/radio-de-navegacion";

/** Desde qué peldaño, de uno a cuatro, sale la radio en el cuadro: el primero con el calco de la radio. */
export const RADIO_DESDE = (PELDANOS.findIndex((p) => calcosDe(p).radio) + 1) as 1 | 2 | 3 | 4;

/** Lo que el juego le da al cuadro: cada caja, si el avión la lleva. */
export type RadioEnElCuadro = LecturaDeLaRadio;

/** Lo que hay que poner en cada pieza, ya decidido. Sin DOM: lo prueba la prueba. */
export interface LaRadioPintada {
  /** El ángulo de la aguja del ADF **sobre la rosa**, magnético; `null` sin aguja. */
  readonly adf: number | null;
  /** El del curso sobre la rosa, `null` si no hay NAV. */
  readonly curso: number | null;
  /** Cuánto se aparta la barra, de -1 a 1 (a tope, dos puntos). */
  readonly barra: number;
  readonly toFrom: "TO" | "FROM" | null;
  readonly bandera: boolean;
  readonly textos: {
    readonly navId: string;
    readonly navMhz: string;
    readonly crs: string;
    readonly dme: string;
    readonly adfId: string;
    readonly adfKhz: string;
  };
}

const tres = (g: number): string => String(Math.round(vuelta(g)) % 360 || 360).padStart(3, "0");

/**
 * **Lo que marca la rosa con esta radio.** La rosa va en magnéticos con la
 * declinación del campo (`declinacion`, lo que se suma al verdadero), así que
 * la aguja del ADF va en el verdadero hacia la estación más esa declinación:
 * contra la línea de fe sale la marcación relativa.
 */
export function pintarLaRadio(r: RadioEnElCuadro | null, declinacion: number): LaRadioPintada {
  const nav = r?.nav ?? null;
  const adf = r?.adf ?? null;
  const l = nav?.lectura ?? null;
  const escala = l?.localizador ? ESCALA_LOC : ESCALA_VOR;
  const barra = l && l.desviacion !== null ? Math.max(-1, Math.min(1, l.desviacion / escala)) : 0;
  const navE = l?.emisora ?? null;
  const adfE = adf?.lectura.emisora ?? null;
  return {
    adf: adf && adf.lectura.verdadera !== null ? vuelta(adf.lectura.verdadera + declinacion) : null,
    curso: nav ? nav.curso : null,
    barra,
    toFrom: l?.toFrom ?? null,
    bandera: nav ? (l?.bandera ?? true) : false,
    textos: {
      navId: nav ? (navE ? `${navE.estacion.clase === "ILS" ? "LOC" : "VOR"} ${navE.estacion.id}` : "NAV") : "",
      navMhz: nav && nav.mhz !== null ? nav.mhz.toFixed(2) : "",
      crs: nav ? `CRS ${tres(nav.curso)}` : "",
      dme: l?.distanciaNm != null ? `DME ${l.distanciaNm.toFixed(1)}` : "",
      adfId: adf ? (adfE ? `ADF ${adfE.estacion.id}` : "ADF") : "",
      adfKhz: adf && adf.mhz !== null ? String(Math.round(adf.mhz * 1000)) : "",
    },
  };
}

/**
 * **El marcado**, dentro de la pantalla de navegación de `ancho` × `alto`
 * con la rosa en `cx`, `cy` y de radio `r`. Todo nace escondido: lo enciende
 * `Tablero` si el avión lleva la caja.
 */
export function radioEnLaRosaSvg(cx: number, cy: number, r: number, ancho: number, alto: number): string {
  const punto = r * 0.17;
  const largo = r * 0.42;
  const puntos = [-2, -1, 1, 2]
    .map((i) => `<circle cx="${i * punto}" cy="0" r="3.2" class="cr__radio-punto" />`)
    .join("");
  // Las esquinas: dónde caen las letras y las dianas del dedo, fuera del aro.
  const zona = { ancho: Math.min(150, ancho * 0.36), alto: 74 };
  return `
    <g data-desde="${RADIO_DESDE}" data-radio-caja class="cr__radio" visibility="hidden">
      <g transform="translate(${cx} ${cy})">
        <g data-radio-rosa>
          <g data-radio="curso" visibility="hidden">
            <path class="cr__radio-curso" d="M0 ${-r + 12} L0 ${-largo - 6} M-7 ${-r + 26} L0 ${-r + 12} L7 ${-r + 26}" />
            <path class="cr__radio-curso" d="M0 ${largo + 6} L0 ${r - 12}" />
            ${puntos}
            <line data-radio="barra" class="cr__radio-barra" x1="0" y1="${-largo}" x2="0" y2="${largo}" />
            <path data-radio="tofrom" class="cr__radio-tofrom" d="M0 ${-largo * 0.62} l-8 12 l16 0 Z" visibility="hidden" />
          </g>
          <g data-radio="adf" visibility="hidden">
            <path class="cr__radio-adf" d="M0 ${-r + 4} L0 ${r - 4} M-8 ${-r + 20} L0 ${-r + 4} L8 ${-r + 20} M-6 ${r - 4} L0 ${r - 14} L6 ${r - 4}" />
          </g>
        </g>
        <g data-radio="bandera" visibility="hidden" transform="translate(${-punto * 2 - 34} ${-largo * 0.3})">
          <rect width="30" height="16" rx="2" class="cr__radio-bandera" />
          <text x="15" y="12.5" text-anchor="middle" class="cr__radio-bandera-letra">NAV</text>
        </g>
      </g>
      <!--
        La esquina de la NAV: arriba el curso con su rueda, y debajo la
        estación, su frecuencia y el DME. La del ADF, a la derecha.
      -->
      <g data-radio="esquina-nav" transform="translate(0 ${alto - zona.alto * 2})">
        <path class="cr__radio-rueda" d="M8 ${zona.alto / 2} l9 -8 l0 16 Z M${zona.ancho - 8} ${zona.alto / 2} l-9 -8 l0 16 Z" />
        <text data-radio="nav-crs" x="${zona.ancho / 2}" y="${zona.alto / 2 + 6}" text-anchor="middle" class="cr__radio-crs"></text>
        <text data-radio="nav-id" x="10" y="${zona.alto + 18}" class="cr__radio-estacion"></text>
        <text data-radio="nav-mhz" x="10" y="${zona.alto + 36}" class="cr__radio-estacion"></text>
        <text data-radio="nav-dme" x="10" y="${zona.alto + 54}" class="cr__radio-estacion"></text>
      </g>
      <g data-radio="esquina-adf" transform="translate(${ancho - 10} ${alto - zona.alto})">
        <text data-radio="adf-id" y="${zona.alto - 36}" text-anchor="end" class="cr__radio-adf-letra"></text>
        <text data-radio="adf-khz" y="${zona.alto - 18}" text-anchor="end" class="cr__radio-adf-letra"></text>
      </g>
      <!--
        Las dianas del dedo, encima de todo y transparentes: la rueda del
        curso en dos mitades, menos y más; debajo, la estación de la NAV; y el
        ADF a la derecha. De setenta y cuatro de lado, que con el cuadro de
        la tablet a seis décimas son los cuarenta y cuatro píxeles del dedo.
        Ver Hud y data-radio-mando.
      -->
      <rect data-radio-mando="obs" data-paso="-1" class="cr__radio-dedo" x="0" y="${alto - zona.alto * 2}" width="${zona.ancho / 2}" height="${zona.alto}" />
      <rect data-radio-mando="obs" data-paso="1" class="cr__radio-dedo" x="${zona.ancho / 2}" y="${alto - zona.alto * 2}" width="${zona.ancho / 2}" height="${zona.alto}" />
      <rect data-radio-mando="nav" class="cr__radio-dedo" x="0" y="${alto - zona.alto}" width="${zona.ancho}" height="${zona.alto}" />
      <rect data-radio-mando="adf" class="cr__radio-dedo" x="${ancho - zona.ancho}" y="${alto - zona.alto}" width="${zona.ancho}" height="${zona.alto}" />
    </g>`;
}

/** El paso de un punto del CDI en el dibujo, para mover la barra. */
export const puntoDelCdi = (r: number): number => r * 0.17;
