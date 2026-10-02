/**
 * La capa de nubes como cosa del mundo: dónde empieza, dónde acaba y qué hay
 * dentro.
 *
 * Hasta aquí la capa era un dibujo —cinco láminas a setenta metros, ver
 * `world/sky.ts`— y nada más la miraba. Así que pasaban tres cosas que no
 * pasan:
 *
 * - **Llovía por encima de las nubes.** «No tiene sentido que llueva encima de
 *   las nubes. Es cierto que llueve, estoy ahora mismo en la furgo a 50
 *   metros de la cabecera 30 de TFN, pero me atrevo a afirmar que sobre las
 *   nubes no llueve.» La lluvia cae de la nube hacia abajo; por encima del
 *   techo de la capa no hay agua cayendo, salvo dentro de un cumulonimbo, que
 *   es una torre y no una capa. Ver `lluviaALaAltura`.
 * - **Atravesarla no se notaba.** Se pasaba entre cinco hojas de papel con el
 *   mismo cielo azul de fondo. Ver `densidadEnLaCapa`, que dice cuánta nube
 *   hay en cada punto con el mismo dibujo que se pinta, y lo que hace con eso
 *   el cielo.
 * - **La ventanilla anunciaba lo tapado.** «No tiene sentido que Jazlyn diga
 *   que miren por la ventanilla para ver las dunas de Maspalomas si hay nubes
 *   debajo: no se vería nada.» Ver `laCapaTapa` en `world/hitos.ts`.
 *
 * Todo esto es aritmética y va aparte del cielo para poder probarlo sin
 * tarjeta gráfica.
 */

import { mulberry32 } from "./noise";
import type { Lluvia } from "./meteo";

/** La capa que hace techo, en altitudes del mundo, m. */
export interface CapaDeNubes {
  /** La base: la del parte, sobre el campo que lo dio. */
  readonly base: number;
  /** El techo de la capa, que el parte no da. Ver `grosorDeLaCapa`. */
  readonly techo: number;
  /** Cuánto cielo tapa, de 0 a 1, como lo dice el parte. Ver `Meteo`. */
  readonly tapadura: number;
}

/**
 * **Cuánto mide la capa de alto**, m.
 *
 * El METAR da la base y no el techo: el techo lo cuentan los pilotos que la
 * atraviesan, y no sale en ningún parte de aeródromo. Así que se pone el de
 * la nube que es.
 *
 * - **Sin lluvia, cuatrocientos cincuenta.** Es un estratocúmulo: el mar de
 *   nubes del alisio, con la base a mil metros y el techo donde lo corta la
 *   inversión, entre trescientos y seiscientos metros más arriba. Es lo que
 *   se ve desde el Teide y lo que se atraviesa saliendo de Los Rodeos.
 * - **Con lluvia, ochocientos.** Una nube que llueve es más gorda: el agua
 *   tiene que crecer en gotas que pesen, y eso necesita recorrido dentro. Se
 *   queda corto para un nimboestrato de los de varios kilómetros, y es a
 *   propósito: lo que llueve en Canarias es casi siempre este mismo
 *   estratocúmulo engordado, y por encima se sale al sol.
 */
export function grosorDeLaCapa(lluvia: Lluvia): number {
  return lluvia === "nada" || lluvia === "llovizna" ? 450 : 800;
}

/** La capa entera, a partir de lo que dice el parte. */
export function capaDelParte(
  base: number | null,
  tapadura: number,
  lluvia: Lluvia,
): CapaDeNubes | null {
  if (base === null) return null;
  return { base, techo: base + grosorDeLaCapa(lluvia), tapadura };
}

/**
 * **Cuánta lluvia cae a una altitud**, de 0 a 1.
 *
 * Debajo de la base, toda la del parte: es lo que mide la estación. Dentro de
 * la capa va menguando hasta el techo —arriba las gotas son de nube, todavía
 * no pesan—, y por encima no cae nada. Sin capa no se sabe de dónde cae, y se
 * deja caer a cualquier altura, como antes.
 *
 * **Y dentro de un cumulonimbo, a todas.** Una tormenta no es una capa: es una
 * torre que sube a diez o doce kilómetros, y dentro llueve de arriba abajo.
 */
export function lluviaALaAltura(
  y: number,
  capa: CapaDeNubes | null,
  enCumulonimbo = false,
): number {
  if (enCumulonimbo || !capa) return 1;
  if (y <= capa.base) return 1;
  if (y >= capa.techo) return 0;
  const t = (y - capa.base) / (capa.techo - capa.base);
  return 1 - t * t * (3 - 2 * t);
}

/**
 * **Desde qué tapadura la capa tapa lo de debajo**: BKN, de cinco a siete
 * octavos. Con menos se ve el suelo entre nube y nube; con eso, lo que se ve
 * es la nube.
 */
export const TAPA_LA_VISTA = 0.75;

// ── El dibujo de la nube ─────────────────────────────────────────────────

/** El lado del dibujo de cada lámina, en píxeles. */
export const LADO_DEL_DIBUJO = 256;

/**
 * El ruido de una lámina: un número de 0 a 1 por píxel, que se repite sin
 * costura. Lo usan el lienzo que se pinta —ver `texturaDeNube` en
 * `world/sky.ts`— y la cuenta de cuánta nube hay en un punto, **los dos con
 * el mismo**: si no, el avión se metería en niebla donde se ve un hueco.
 *
 * Ruido de valor sumado en cuatro octavas, con una rejilla por octava que se
 * envuelve por los bordes.
 */
export function ruidoDeNube(
  semilla: number,
  lado = LADO_DEL_DIBUJO,
): Float32Array {
  const sorteo = mulberry32(semilla);
  const octavas = [4, 8, 16, 32].map((n) => {
    const v = new Float32Array(n * n);
    for (let i = 0; i < v.length; i++) v[i] = sorteo();
    return { n, v };
  });
  const suave = (t: number): number => t * t * (3 - 2 * t);
  const valor = (
    o: { n: number; v: Float32Array },
    x: number,
    y: number,
  ): number => {
    const fx = x * o.n;
    const fy = y * o.n;
    const x0 = Math.floor(fx) % o.n;
    const y0 = Math.floor(fy) % o.n;
    const x1 = (x0 + 1) % o.n;
    const y1 = (y0 + 1) % o.n;
    const tx = suave(fx - Math.floor(fx));
    const ty = suave(fy - Math.floor(fy));
    const a = o.v[y0 * o.n + x0]! * (1 - tx) + o.v[y0 * o.n + x1]! * tx;
    const b = o.v[y1 * o.n + x0]! * (1 - tx) + o.v[y1 * o.n + x1]! * tx;
    return a * (1 - ty) + b * ty;
  };
  const ruido = new Float32Array(lado * lado);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let n = 0;
      let peso = 0;
      let amplitud = 1;
      for (const o of octavas) {
        n += valor(o, x / lado, y / lado) * amplitud;
        peso += amplitud;
        amplitud *= 0.5;
      }
      ruido[y * lado + x] = n / peso;
    }
  }
  return ruido;
}

/**
 * **Desde qué valor del ruido hay nube**, según cuánto tape la capa.
 *
 * Era un recorte fijo, 0,52, para todas: una capa cubierta —OVC, ocho octavos—
 * se pintaba con el mismo dibujo agujereado que unas nubes sueltas, solo que
 * más opaca, y desde arriba se veía el mar por los huecos de una capa que no
 * tiene huecos. Ahora el recorte deja cubierta la parte del cielo que dice el
 * parte. Medido sobre las cinco láminas, con el recorte en 0,52 es nube el
 * 43 % de los píxeles; en 0,36, el 80 %, y en 0,22, el 97 %.
 *
 * Dos tramos rectos que pasan por ahí: la tapadura de siempre del mar de
 * nubes —0,45— se queda **exactamente** donde estaba, BKN —0,75— cubre cuatro
 * quintos, que cae dentro de sus cinco a siete octavos, y OVC lo cubre todo.
 */
export function umbralDeLaNube(tapadura: number): number {
  const t = Math.max(0, Math.min(1, tapadura));
  return t <= 0.45 ? 0.66 - (0.14 * t) / 0.45 : 0.52 - (0.3 * (t - 0.45)) / 0.55;
}

/**
 * Lo que sube el ruido desde el recorte hasta la nube entera. Es el de
 * siempre —(1 − 0,52) / 1,5—, que es lo que da el borde deshilachado.
 */
export const RAMPA_DE_LA_NUBE = 0.32;

/** Cuánta nube hay en un píxel del dibujo, de 0 a 1. */
export function alfaDeNube(ruido: number, umbral: number): number {
  return Math.max(0, Math.min(1, (ruido - umbral) / RAMPA_DE_LA_NUBE));
}

/**
 * La capa como se dibuja: dónde está cada lámina y con qué dibujo. Lo que
 * necesita `densidadEnLaCapa` para decir lo mismo que se ve.
 */
export interface DibujoDeLaCapa {
  /** Altitud de la primera lámina —la base—, m. */
  readonly base: number;
  /** De lámina a lámina, m. */
  readonly separacion: number;
  /** El ruido de cada lámina, de abajo arriba. */
  readonly ruidos: readonly Float32Array[];
  /** Su desplazamiento de textura, en fracción de baldosa. */
  readonly desfases: readonly (readonly [number, number])[];
  /** Cada cuántos metros se repite el dibujo. */
  readonly paso: number;
  /** El recorte de ahora. Ver `umbralDeLaNube`. */
  readonly umbral: number;
}

/** Cuánto se deshilacha la nube por debajo de la base y encima del techo, m. */
export const BORDE_DE_LA_CAPA = 25;

/**
 * **Cuánta nube hay en un punto**, de 0 a 1, con el mismo dibujo que se pinta.
 *
 * Cada lámina es la nube a su altura; entre dos láminas se mezclan las dos, y
 * por fuera se deshilacha en `BORDE_DE_LA_CAPA`. Así un hueco que se ve desde
 * abajo **es** un hueco al subir por él, y una capa cubierta no deja ninguno.
 *
 * El punto de la textura se saca como lo saca la tarjeta: la lámina va con
 * `repeat` y `offset` sobre un plano de `paso · repeat` metros que se mueve a
 * saltos de `paso` —ver `dondeVaElBanco`—, así que la cuenta solo depende del
 * punto del mundo. La `v` va al revés que la Z porque el plano se tumba girando
 * la X, y la fila del lienzo al revés que la `v` porque three le da la vuelta
 * al subirlo (`flipY`).
 */
export function densidadEnLaCapa(
  dibujo: DibujoDeLaCapa,
  x: number,
  y: number,
  z: number,
): number {
  const n = dibujo.ruidos.length;
  if (n === 0 || !(dibujo.paso > 0)) return 0;
  const alto = (y - dibujo.base) / dibujo.separacion;
  const ultima = n - 1;
  const borde = BORDE_DE_LA_CAPA / dibujo.separacion;
  if (alto < -borde || alto > ultima + borde) return 0;
  const enLamina = (i: number): number => {
    const ruido = dibujo.ruidos[i]!;
    const [du, dv] = dibujo.desfases[i]!;
    return alfaDeNube(muestra(ruido, x / dibujo.paso + du, -z / dibujo.paso + dv), dibujo.umbral);
  };
  if (alto <= 0) return enLamina(0) * (1 + alto / borde);
  if (alto >= ultima) return enLamina(ultima) * (1 - (alto - ultima) / borde);
  const i = Math.floor(alto);
  const f = alto - i;
  return enLamina(i) * (1 - f) + enLamina(i + 1) * f;
}

/**
 * Lo que da la tarjeta al leer el lienzo en (u, v): interpolado entre los
 * cuatro píxeles de alrededor y repitiéndose por los bordes.
 */
function muestra(ruido: Float32Array, u: number, v: number): number {
  const lado = Math.round(Math.sqrt(ruido.length));
  const fu = u - Math.floor(u);
  const fv = v - Math.floor(v);
  // Del centro del texel, como `texture2D` con filtro lineal. La fila cuenta
  // desde arriba del lienzo y la `v` desde abajo: `flipY`.
  const px = fu * lado - 0.5;
  const py = (1 - fv) * lado - 0.5;
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const tx = px - x0;
  const ty = py - y0;
  const en = (cx: number, cy: number): number =>
    ruido[(((cy % lado) + lado) % lado) * lado + (((cx % lado) + lado) % lado)]!;
  const a = en(x0, y0) * (1 - tx) + en(x0 + 1, y0) * tx;
  const b = en(x0, y0 + 1) * (1 - tx) + en(x0 + 1, y0 + 1) * tx;
  return a * (1 - ty) + b * ty;
}

/**
 * **Cuánto se está dentro de la nube**, de 0 a 1, a partir de su densidad.
 *
 * La densidad es lo que tiene el dibujo; esto es lo que se ve. Con un poco de
 * nube ya se pierde el fondo —se entra en un jirón—, y antes de que la
 * densidad llegue arriba ya está todo gris.
 */
export function cuantoDentro(densidad: number): number {
  const t = Math.max(0, Math.min(1, (densidad - 0.06) / 0.5));
  return t * t * (3 - 2 * t);
}

/**
 * **Hasta dónde se ve dentro de la nube**, m.
 *
 * Dentro de un estratocúmulo se ve de treinta a cien metros, y eso desde la
 * persecución es perder el avión, que va a setenta u ochenta metros de la
 * cámara en los grandes. Doscientos son la presentación simplificada: el
 * avión se queda medio velado, la punta del ala se ve desde la cabina, y más
 * allá no hay nada.
 */
export const SE_VE_DENTRO = 200;
