/**
 * **El fijo de dos radiales en el plano del final** (ADR 0030, enmienda H26h).
 *
 * «Dos radiales que se cortan» se mira en el plano en vuelo: las dos rayas de
 * lápiz, cada una con su número, la cruz donde se cortan y la flecha encima o
 * apartada. El panel del final dibujaba solo la traza —`plano()` no sabía de
 * rayas—, así que lo que se acababa de ver no estaba en su resumen. Ahora sí,
 * y con el encuadre del fijo y no el del aeródromo: con las dos radios, o con
 * la pista a diez millas, la milla y pico de una cruz tarde son cuatro
 * píxeles. Lo que se mira al cerrar es **dónde se cortan las rayas y dónde
 * estaba el avión**, y eso tiene que verse sin leer.
 *
 * Todo en las coordenadas del fichero (x al este, y al norte), como la traza;
 * el SVG va en metros con la Y hacia abajo, y lo que tiene medida de pantalla
 * —el aro, el avión, la letra— se pasa a metros con lo que mide el plano del
 * final en la tablet (`ANCHO_DEL_PLANO`).
 */

import { colocar, sitiosEnElRadial, type Caja, type Raya } from "./carta/rotulos";
import { AVION_EN_PLANTA } from "./carta/simbolos";
import { LETRAS } from "./carta/estilo";

type Punto = readonly [number, number];

/** Las rayas, la cruz y el avión del fijo, en coordenadas del fichero. */
export interface FijoEnElPlano {
  readonly rayas: readonly {
    readonly desde: Punto;
    readonly hasta: Punto;
    /** «R-102 FTV», y «R-102» si no cabe. */
    readonly rotulo: string;
    readonly corto: string;
  }[];
  /** Donde se cortan; `null` si no se cortan por delante de sus radios. */
  readonly cruz: Punto | null;
  /** Dónde estaba el avión al leer la segunda: con lo que se compara la cruz. */
  readonly avion: Punto;
  /** Lo que se puede apartar la cruz por el VOR, m (`loQueDaElVor`). */
  readonly tolerancia: number;
}

/**
 * Lo que mide de ancho el plano del final en la tablet, px: `min(320px, 70vw)`
 * menos su relleno. En el teléfono es menos y todo encoge con el dibujo, como
 * los números de las explicaciones (DESIGN.md, «Letra que es parte de un
 * dibujo»).
 */
export const ANCHO_DEL_PLANO = 292;

/** El cuerpo de la letra de los números, px del plano en la tablet. */
const CUERPO = 16;

/** Lo menos que enseña el encuadre del fijo, m: dos millas, que el aro y el avión no se coman el papel. */
const LADO_MINIMO_DEL_FIJO = 2 * 1852;

/**
 * **El encuadre del fijo**: la traza, la cruz y el avión, y no el aeródromo
 * ni las radios. Las rayas entran por el borde, cada una desde su radio, con
 * su número diciendo de cuál. Y como poco seis veces lo que da el VOR, como
 * la lupa del plano en vuelo (`lupaDelFijo`): así una cruz buena cae con el
 * avión dentro de su aro, y una tarde, apartada a la vista.
 */
export function encajeDelFijo(
  fijo: FijoEnElPlano,
  traza: readonly Punto[] | undefined,
): { cx: number; cy: number; lado: number } {
  const puntos: Punto[] = [...(traza ?? []), fijo.avion, ...(fijo.cruz ? [fijo.cruz] : [])];
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [x, y] of puntos) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return {
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    lado: Math.max(LADO_MINIMO_DEL_FIJO, 6 * fijo.tolerancia, x1 - x0, y1 - y0),
  };
}

/**
 * **Lo que mide de ancho un número**, px, sin lienzo a mano: la letra de las
 * cifras es estrecha —media eme por signo, de sobra— más el halo.
 */
const anchoDe = (texto: string): number => Math.ceil(texto.length * 0.56 * CUERPO + LETRAS.halo);

/** El rumbo de la traza junto a un punto, rad desde el norte en el sentido de las agujas. */
function rumboJunto(traza: readonly Punto[] | undefined, p: Punto): number {
  if (!traza || traza.length < 2) return 0;
  let i = 0;
  let cerca = Infinity;
  traza.forEach(([x, y], k) => {
    const d = Math.hypot(x - p[0], y - p[1]);
    if (d < cerca) {
      cerca = d;
      i = k;
    }
  });
  const a = traza[Math.max(0, i - 1)]!;
  const b = traza[Math.min(traza.length - 1, i + 1)]!;
  return Math.atan2(b[0] - a[0], b[1] - a[1]);
}

/**
 * **El fijo, en SVG**, para la ventana `vb` del plano —en metros, la Y hacia
 * abajo—: las rayas de lápiz, la cruz con su aro, el avión donde estaba al
 * leer la segunda y los números de las rayas, colocados como en el plano en
 * vuelo (`sitiosEnElRadial`): a un lado de su raya, sin pisarse entre ellos,
 * ni la cruz, ni el avión, y sin cruzar la otra raya ni la traza si hay sitio.
 */
export function dibujarElFijo(
  fijo: FijoEnElPlano,
  traza: readonly Punto[] | undefined,
  vb: { readonly x: number; readonly y: number; readonly ancho: number; readonly alto: number },
): string {
  // Metros por píxel del plano del final, y de vuelta.
  const k = vb.ancho / ANCHO_DEL_PLANO;
  const altoPx = vb.alto / k;
  const enPx = ([x, y]: Punto): [number, number] => [(x - vb.x) / k, (-y - vb.y) / k];
  const n = (v: number): string => v.toFixed(1);

  const rayas = fijo.rayas
    .map(
      (r) =>
        `<line class="plano__radial" x1="${n(r.desde[0])}" y1="${n(-r.desde[1])}" x2="${n(r.hasta[0])}" y2="${n(-r.hasta[1])}" />`,
    )
    .join("");

  const aro = 9;
  const cruz = fijo.cruz
    ? `<circle class="plano__cruz" cx="${n(fijo.cruz[0])}" cy="${n(-fijo.cruz[1])}" r="${n(aro * k)}" />` +
      `<circle class="plano__cruz-punto" cx="${n(fijo.cruz[0])}" cy="${n(-fijo.cruz[1])}" r="${n(2 * k)}" />`
    : "";

  // El avión de la flecha del plano en vuelo, el mismo dibujo, con el morro por donde iba la traza.
  const tamano = 22;
  const [, , anchoDelAvion] = AVION_EN_PLANTA.caja;
  const escala = (tamano * k) / (anchoDelAvion ?? 34);
  const rumbo = (rumboJunto(traza, fijo.avion) * 180) / Math.PI;
  const avion = AVION_EN_PLANTA.cuerpo
    ? `<path class="plano__avion" d="${AVION_EN_PLANTA.cuerpo.d}" ` +
      `transform="translate(${n(fijo.avion[0])} ${n(-fijo.avion[1])}) rotate(${rumbo.toFixed(1)}) scale(${escala.toFixed(3)})" />`
    : "";

  /*
   * **Los números**, con lo que no se pisa: el aro de la cruz y el avión.
   * Las rayas cuestan cruzarlas —la otra raya y la traza—, la suya no.
   */
  const fijos: Caja[] = [];
  if (fijo.cruz) {
    const [x, y] = enPx(fijo.cruz);
    fijos.push({ cx: x, cy: y, w: 2 * aro + 6, h: 2 * aro + 6 });
  }
  {
    const [x, y] = enPx(fijo.avion);
    fijos.push({ cx: x, cy: y, w: tamano + 4, h: tamano + 4 });
  }
  const lineas: Raya[] = fijo.rayas.map((r) => ({ a: enPx(r.desde), b: enPx(r.hasta) }));
  const pasos = traza ?? [];
  for (let i = 1; i < pasos.length; i++) lineas.push({ a: enPx(pasos[i - 1]!), b: enPx(pasos[i]!) });
  const alto = Math.ceil(CUERPO * 1.18);
  const formas = fijo.rayas.map((r) => [r.rotulo, r.corto]);
  const puestos = colocar(
    ANCHO_DEL_PLANO,
    altoPx,
    fijos,
    lineas,
    fijo.rayas.map((r, i) => ({
      formas: formas[i]!.map((texto) => sitiosEnElRadial(enPx(r.desde), enPx(r.hasta), [anchoDe(texto), alto], 3, ANCHO_DEL_PLANO, altoPx)),
      propia: i,
    })),
    2,
    3,
  );
  const numeros = puestos
    .map((p, i) => {
      if (!p) return "";
      const texto = formas[i]![p.forma]!;
      const x = vb.x + p.caja.cx * k;
      const y = vb.y + p.caja.cy * k;
      const giro = ((p.caja.giro ?? 0) * 180) / Math.PI;
      return (
        `<text class="plano__radial-rotulo" font-family="${LETRAS.cifras.replace(/"/g, "'")}" font-size="${n(CUERPO * k)}" stroke-width="${n(LETRAS.halo * k)}" ` +
        `text-anchor="middle" dominant-baseline="central" transform="translate(${n(x)} ${n(y)}) rotate(${giro.toFixed(1)})">${texto}</text>`
      );
    })
    .join("");

  return `<g class="plano__fijo">${rayas}${cruz}${avion}${numeros}</g>`;
}
