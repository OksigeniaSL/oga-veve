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
 * - A los lados de la rosa, abajo, como en la pantalla de navegación de un
 *   reactor: a la izquierda la NAV —la estación, su frecuencia y el DME— y a
 *   la derecha el ADF. Las esquinas de más abajo ya son del TCAS, las millas
 *   y el rango.
 * - **El curso, en la visera**, en una ventanilla CRS con su rueda, que es
 *   donde lo pone el panel del automático de un Boeing: la COURSE de cada
 *   lado del MCP. Ver `crsEnLaViseraSvg`.
 *
 * ## Desde qué peldaño
 *
 * Desde el que tiene **la radio** en la carta (`calcosDe(...).radio`), que es
 * el de cabina: es el mismo calco que pinta las frecuencias y las radioayudas,
 * así que la radio aparece en la cabina el mismo día que en la carta.
 *
 * ## Se tocan
 *
 * Son el mando de la cabina con el dedo: tocar la NAV o el ADF pasa a la
 * estación siguiente más cercana, y la ventanilla CRS tiene dos mitades,
 * menos y más, como la rueda de la ventanilla ALT. Cada diana mide ochenta
 * del cuadro, que en la tablet son los cuarenta y cuatro píxeles del dedo.
 * Ver `Hud`.
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
    /** Lo corto, para las esquinas del direccional: el curso en cifras y los dos identificadores. */
    readonly crsCifra: string;
    readonly navIdent: string;
    readonly adfIdent: string;
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
      crsCifra: nav ? tres(nav.curso) : "",
      navIdent: navE ? navE.estacion.id : nav ? "NAV" : "",
      adfIdent: adfE ? adfE.estacion.id : "",
    },
  };
}

/**
 * **El marcado**, dentro de la pantalla de navegación de `ancho` × `alto`
 * con la rosa en `cx`, `cy` y de radio `r`. Todo nace escondido: lo enciende
 * `Tablero` si el avión lleva la caja.
 */
export function radioEnLaRosaSvg(cx: number, cy: number, r: number, ancho: number): string {
  const punto = r * 0.17;
  const largo = r * 0.42;
  const puntos = [-2, -1, 1, 2]
    .map((i) => `<circle cx="${i * punto}" cy="0" r="3.2" class="cr__radio-punto" />`)
    .join("");
  /*
   * Las letras, a los lados de la rosa por encima de las esquinas de abajo,
   * que son del TCAS, las millas y el rango: donde el aro ya deja sitio.
   */
  const y0 = cy + r * 0.56;
  const dedo = 80;
  return `
    <g data-desde="${RADIO_DESDE}" data-radio-caja class="cr__radio" visibility="hidden">
      <g transform="translate(${cx} ${cy})">
        <g data-radio-rosa data-punto="${punto}">
          <g data-radio="curso" visibility="hidden">
            <path class="cr__radio-curso" d="M0 ${-r + 12} L0 ${-largo - 6} M-7 ${-r + 26} L0 ${-r + 12} L7 ${-r + 26}" />
            <path class="cr__radio-curso" d="M0 ${largo + 6} L0 ${r - 12}" />
            ${puntos}
            <line data-radio="barra" class="cr__radio-barra" x1="0" y1="${-largo}" x2="0" y2="${largo}" />
            <!--
              El TO/FROM, más largo que ancho: casi equilátero, en cuanto el
              curso giraba unos grados parecía apuntar de lado.
            -->
            <path data-radio="tofrom" class="cr__radio-tofrom" d="M0 ${-largo * 0.7} l-6 17 l12 0 Z" visibility="hidden" />
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
      <g data-radio="esquina-nav" transform="translate(6 ${y0})">
        <text data-radio="nav-id" y="0" class="cr__radio-estacion"></text>
        <text data-radio="nav-mhz" y="16" class="cr__radio-estacion"></text>
        <text data-radio="nav-dme" y="32" class="cr__radio-estacion"></text>
      </g>
      <g data-radio="esquina-adf" transform="translate(${ancho - 6} ${y0 + 16})">
        <text data-radio="adf-id" y="0" text-anchor="end" class="cr__radio-adf-letra"></text>
        <text data-radio="adf-khz" y="16" text-anchor="end" class="cr__radio-adf-letra"></text>
      </g>
      <!--
        Las dianas del dedo, transparentes y encima: la NAV a la izquierda y
        el ADF a la derecha, cada una de ochenta. Ver Hud y data-radio-mando.
      -->
      <rect data-radio-mando="nav" class="cr__radio-dedo" x="0" y="${y0 - 26}" width="${dedo}" height="${dedo}" />
      <rect data-radio-mando="adf" class="cr__radio-dedo" x="${ancho - dedo}" y="${y0 - 26}" width="${dedo}" height="${dedo}" />
    </g>`;
}

/**
 * **La ventanilla CRS en la visera**, con su rueda: el curso del OBS donde lo
 * pone el panel del automático de un Boeing, la ventanilla COURSE de la
 * punta del MCP, en magenta como las otras. `x` es donde empieza, y mide
 * `ANCHO_DEL_CRS`: la ventanilla en medio, y a cada lado la mitad que gira,
 * menos a la izquierda y más a la derecha, del alto entero de la visera
 * —ochenta y ocho—, que es lo que pide el dedo. Escondida en el avión que no
 * lleva NAV. Ver `Tablero.laRadio`.
 */
export function crsEnLaViseraSvg(x: number, alto: number): string {
  const medio = x + ANCHO_DEL_CRS / 2;
  return `
    <g data-desde="${RADIO_DESDE}" data-radio-mcp visibility="hidden">
      <g class="tablero__mcp">
        <rect x="${medio - 42}" y="12" width="84" height="40" rx="3" />
        <text x="${medio}" y="24" class="cr__rotulo" text-anchor="middle">CRS</text>
        <text data-radio="mcp-crs" x="${medio}" y="45" class="cr__objetivo" text-anchor="middle">---</text>
      </g>
      <path class="cr__radio-rueda" d="M${x + 24} 32 l11 -9 l0 18 Z M${x + ANCHO_DEL_CRS - 24} 32 l-11 -9 l0 18 Z" />
      <rect data-radio-mando="obs" data-paso="-1" class="cr__radio-dedo" x="${x}" y="0" width="${ANCHO_DEL_CRS / 2}" height="${alto}" />
      <rect data-radio-mando="obs" data-paso="1" class="cr__radio-dedo" x="${medio}" y="0" width="${ANCHO_DEL_CRS / 2}" height="${alto}" />
    </g>`;
}

/** Lo que mide la ventanilla CRS con su rueda, en unidades del cuadro. */
export const ANCHO_DEL_CRS = 224;

/**
 * **El direccional hecho HSI**, en las de pistón: la misma aguja y el mismo
 * CDI sobre la rosa del direccional, en las unidades de su esfera —un
 * cuadrado de cien con la cara de 43—. Es lo que lleva hoy en el sitio del
 * giróscopo la avioneta de escuela que lo ha cambiado por uno electrónico: el
 * curso, la barra y la aguja de marcación en la misma esfera, en vez de un
 * VOR y un ADF sueltos que en el cuadro de seis no caben. En las esquinas,
 * fuera de la esfera, el curso en magenta arriba a la izquierda y los dos
 * identificadores abajo, el de la NAV en blanco y el del ADF en cian.
 *
 * Con el dedo, la mitad de abajo de la esfera es la rueda del curso: menos a
 * la izquierda, más a la derecha. La de arriba sigue explicando el
 * direccional. La estación se pone tocándola en la carta o con el 7 y el 8.
 */
export function radioEnElDireccionalSvg(): string {
  const r = 43;
  const punto = r * 0.17;
  const largo = r * 0.42;
  const puntos = [-2, -1, 1, 2].map((i) => `<circle cx="${i * punto}" cy="0" r="1.5" class="cr__radio-punto" />`).join("");
  return `
    <g data-desde="${RADIO_DESDE}" data-radio-caja class="cr__radio cr__radio--esfera" visibility="hidden">
      <g transform="translate(50 50)">
        <g data-radio-rosa data-punto="${punto}">
          <g data-radio="curso" visibility="hidden">
            <path class="cr__radio-curso" d="M0 ${-r + 4} L0 ${-largo - 3} M-3.5 ${-r + 11} L0 ${-r + 4} L3.5 ${-r + 11}" />
            <path class="cr__radio-curso" d="M0 ${largo + 3} L0 ${r - 4}" />
            ${puntos}
            <line data-radio="barra" class="cr__radio-barra" x1="0" y1="${-largo}" x2="0" y2="${largo}" />
            <path data-radio="tofrom" class="cr__radio-tofrom" d="M0 ${-largo * 0.7} l-3 8.5 l6 0 Z" visibility="hidden" />
          </g>
          <g data-radio="adf" visibility="hidden">
            <path class="cr__radio-adf" d="M0 ${-r + 2} L0 ${r - 2} M-4 ${-r + 10} L0 ${-r + 2} L4 ${-r + 10} M-3 ${r - 2} L0 ${r - 7} L3 ${r - 2}" />
          </g>
        </g>
        <g data-radio="bandera" visibility="hidden" transform="translate(${-punto * 2 - 17} ${-largo * 0.3})">
          <rect width="15" height="8" rx="1" class="cr__radio-bandera" />
          <text x="7.5" y="6.3" text-anchor="middle" class="cr__radio-bandera-letra">NAV</text>
        </g>
      </g>
      <text data-radio="nav-crs-cifra" x="1" y="9" class="cr__radio-crs"></text>
      <text data-radio="nav-ident" x="1" y="99" class="cr__radio-estacion"></text>
      <text data-radio="adf-ident" x="99" y="99" text-anchor="end" class="cr__radio-adf-letra"></text>
      <rect data-radio-mando="obs" data-paso="-1" class="cr__radio-dedo" x="0" y="52" width="50" height="48" />
      <rect data-radio-mando="obs" data-paso="1" class="cr__radio-dedo" x="50" y="52" width="50" height="48" />
    </g>`;
}
