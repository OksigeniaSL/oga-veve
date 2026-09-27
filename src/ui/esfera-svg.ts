/**
 * Cómo se dibuja **una escala** en el cuadro plano.
 *
 * La escala no se decide aquí: viene hecha de `cuadro.ts` —marcas, cifras,
 * arcos, raya roja y barrido— y esto solo la pasa a SVG. La cabina en tres
 * dimensiones hace lo mismo con pincel, leyendo la misma escala y con las
 * mismas medidas en proporción —ver `world/relojes-cabina.ts`—, y por eso las
 * dos vistas del mismo avión dicen lo mismo: no hay una segunda cuenta que se
 * pueda separar.
 *
 * Todo se dibuja en un cuadrado de cien con la cara de radio `CARA`, y quien
 * lo coloca lo escala entero. Así las medidas de dentro son siempre las
 * mismas, sea una esfera del six-pack o un tacómetro de la columna de motor.
 */

import {
  MEDIDAS,
  anguloEn,
  puntoEn,
  type Escala,
} from "./cuadro";
import { marca, MARCA_CIFRA, MARCA_ROTULO } from "./familia";

/** El radio de la cara en el cuadrado de cien. */
export const CARA = 43;
/** Y el centro. */
const C = 50;

const r = (f: number) => f * CARA;
const en = (e: Escala, f: number, radio: number) => {
  const p = puntoEn(e.barrido, f, radio);
  return { x: C + p.x, y: C + p.y };
};

/** Un arco de la escala, entre dos fracciones de su recorrido. */
function arco(e: Escala, desde: number, hasta: number, radio: number): string {
  const a = en(e, desde, radio);
  const b = en(e, hasta, radio);
  const grande = (hasta - desde) * e.barrido.recorrido > 180 ? 1 : 0;
  return `M${a.x} ${a.y} A${radio} ${radio} 0 ${grande} 1 ${b.x} ${b.y}`;
}

/**
 * La escala entera: arcos de color, raya roja, marcas y cifras.
 *
 * Con `radial`, las cifras giran con su marca —como las de la rosa de un
 * direccional, que se leen desde fuera—; sin él van de pie.
 */
export function escalaSvg(e: Escala, opciones: { radial?: boolean } = {}): string {
  let out = "";
  for (const a of e.arcos) {
    if (a.hasta <= a.desde) continue;
    const radio = r(a.color === "blanco" ? MEDIDAS.arcoBlanco : MEDIDAS.arco);
    out += `<path class="esfera__arco esfera__arco--${a.color}" d="${arco(e, a.desde, a.hasta, radio)}" />`;
  }
  for (const m of e.marcas) {
    const p1 = en(e, m.en, r(m.larga ? MEDIDAS.marcaLarga : MEDIDAS.marcaCorta));
    const p2 = en(e, m.en, r(MEDIDAS.marcaFuera));
    out += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" class="esfera__marca${m.larga ? " esfera__marca--larga" : ""}" />`;
    if (m.cifra === null) continue;
    const p = en(e, m.en, r(MEDIDAS.cifra));
    const giro = opciones.radial
      ? ` transform="rotate(${anguloEn(e.barrido, m.en)} ${p.x} ${p.y})"`
      : "";
    // La cifra de la escala es la medida y entra en el primer peldaño; una
    // letra —la E del depósito, la N de la rosa— espera a las letras. Lo
    // decide el texto. Ver `desdePara`.
    out += `<text x="${p.x}" y="${p.y + 3.2}"${giro} ${marca(m.cifra)} class="esfera__cifra">${m.cifra}</text>`;
  }
  if (e.raya !== null) {
    const p1 = en(e, e.raya, r(MEDIDAS.marcaLarga - 0.04));
    const p2 = en(e, e.raya, r(MEDIDAS.marcaFuera + 0.02));
    out += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" class="esfera__raya" />`;
  }
  return out;
}

/** La unidad, debajo del eje: la glosa que se lee sin haber volado nunca. */
export function unidadSvg(e: Escala): string {
  if (!e.unidad) return "";
  return `<text x="${C}" y="${C + r(MEDIDAS.unidad) + 2.4}" ${marca(e.unidad)} class="esfera__unidad">${e.unidad}</text>`;
}

/** Dónde va el rótulo de esta escala, en la y del cuadrado de cien. */
export function yDelRotulo(e: Escala | null): number {
  return C + r(e?.rotuloDentro ? MEDIDAS.rotuloDentro : MEDIDAS.rotulo) + 2.8;
}

/** Aguja apuntando hacia arriba desde el centro, de ese largo en fracción. */
export function agujaSvg(largo: number): string {
  const l = r(largo);
  return `<path class="esfera__aguja" d="M50 50 L47.6 ${50 - l * 0.75} L50 ${50 - l} L52.4 ${50 - l * 0.75} Z" />`;
}

/** Lo que gira la aguja para marcar ese valor, en grados desde las doce. */
export function giroDe(e: Escala, fraccion: number): number {
  return anguloEn(e.barrido, fraccion);
}

/**
 * Un reloj de los que no son de vuelo —motor, depósito, flaps—, **igual que
 * el de la cabina**: la escala, el rótulo y la unidad encima del eje, y debajo
 * la cifra de lo que marca. Ver `deMotor` en `world/relojes-cabina.ts`.
 *
 * La aguja va metida en un grupo con el eje en el origen, para que quien la
 * mueva solo tenga que escribir `rotate(grados)`: así se mueven las agujas de
 * motor de las pantallas, y así se mueve esta.
 */
export function relojSvg(
  id: string,
  e: Escala,
  nombre: string,
  aguja: string,
  cifra: string,
  donde: { x: number; y: number; radio: number },
): string {
  const unidad =
    e.unidad && e.unidad !== "°"
      ? `<text x="${C}" y="${C - r(0.14) + 2.4}" ${marca(e.unidad)} class="esfera__unidad">${e.unidad}</text>`
      : "";
  const encima = `
    <g transform="translate(50 50)"><g ${aguja}><g transform="translate(-50 -50)">${agujaSvg(MEDIDAS.aguja)}</g></g></g>
    <text ${cifra} x="${C}" y="${C + r(MEDIDAS.lectura) + 3.8}" ${MARCA_CIFRA} class="esfera__lectura"></text>`;
  return esferaSvg(
    id,
    nombre,
    escalaSvg(e) + unidad,
    encima,
    donde,
    C - r(0.34) + 2.8,
  );
}

/**
 * El anillo mecanizado, los tornillos y el filo de luz.
 *
 * Es lo que convierte una esfera dibujada en una esfera **empotrada**. Un
 * instrumento de verdad va metido en un agujero del salpicadero con un aro
 * alrededor y cuatro tornillos, y cuando eso falta el panel entero parece una
 * pegatina sobre una losa negra — que es justo lo que se dijo de este.
 */
function empotrada(): string {
  const tornillos = [
    [50, 6],
    [94, 50],
    [50, 94],
    [6, 50],
  ]
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="1.5" class="esfera__tornillo" />`,
    )
    .join("");
  return `
    <circle data-fondo="esfera" cx="50" cy="50" r="49" class="esfera__caja" />
    <circle cx="50" cy="50" r="45" class="esfera__filo" />
    <circle cx="50" cy="50" r="${CARA}" class="esfera__fondo" />
    ${tornillos}
  `;
}

/**
 * El reflejo del cristal. **Fijo, siempre el mismo.**
 *
 * Un brillo que se mueve sin que se mueva el sol delata el truco al instante;
 * uno quieto, arriba a la izquierda, es lo que hace que se vea que hay un
 * cristal delante. Es de las pocas cosas del cuadro que no cambian nunca, y
 * esa es la gracia.
 */
function reflejo(): string {
  return `<path class="esfera__reflejo"
    d="M14 36 A43 43 0 0 1 64 9 A54 54 0 0 0 14 36 Z" />`;
}

/**
 * Una esfera entera, colocada: caja, cara, lo que se mueve, buje, cristal y
 * rótulo. `data-dial` dice qué instrumento es, y por eso se puede contar desde
 * fuera cuáles lleva el cuadro.
 */
export function esferaSvg(
  id: string,
  rotulo: string,
  cara: string,
  encima: string,
  donde: { x: number; y: number; radio: number },
  /** La y del rótulo, si no va abajo. Ver `yDelRotulo`. */
  yRotulo = yDelRotulo(null),
): string {
  /*
   * El dibujo vive en un cuadrado de cien y se escala a lo que mida la esfera.
   * Así las medidas de dentro siguen siendo las de siempre y no hay que
   * retocar ni una aguja al cambiar el reparto.
   */
  const escala = donde.radio / 50;
  return `
    <g class="esfera" data-dial="${id}"
       transform="translate(${donde.x - donde.radio} ${donde.y - donde.radio}) scale(${escala})">
      ${empotrada()}
      ${cara}
      ${encima}
      <circle cx="50" cy="50" r="3.4" class="esfera__buje" />
      ${reflejo()}
      <text x="50" y="${yRotulo}" ${MARCA_ROTULO} class="esfera__rotulo">${rotulo}</text>
    </g>
  `;
}
