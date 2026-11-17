/**
 * **Hacia dónde va la calle de rodaje más cercana a un punto**: lo que orienta
 * las dos barras de cada punto de espera, porque OpenStreetMap da el punto y
 * no su dirección. Ver «Puntos de espera» en `createAerodrome`.
 *
 * La regla es la de siempre y no cambia: de todos los tramos de todas las
 * calles, el que tiene el punto medio más cerca —medido con `Math.hypot`—, y
 * entre dos a la misma distancia, **el primero** de la lista. Lo que cambia es
 * cómo se busca. Antes se recorrían todos los tramos por cada punto de espera:
 * en Barajas, los 3.386 tramos de sus 756 calles por cada uno de sus 293
 * puntos, 35 ms de mesa en cada montaje (enmienda H23c del ADR 0028). Ahora
 * los puntos medios se reparten una vez en una rejilla y se mira por anillos
 * desde la celda del punto, hasta que lo que queda sin mirar está más lejos
 * que lo mejor encontrado.
 *
 * **Exacto por construcción**, no aproximado:
 *
 * - La distancia de cada tramo es la misma cuenta sobre los mismos `double`:
 *   el punto medio `(a + b) / 2` se guarda en un `Float64Array`, que no
 *   redondea, y se le resta el punto con `Math.hypot` como antes.
 * - Lo que no se mira no puede ganar: tras los anillos hasta `r`, todo lo de
 *   fuera queda a más de `r` celdas de lado, y solo se para cuando lo mejor
 *   está por debajo de eso con un milímetro de holgura —que cubre de sobra el
 *   redondeo de repartir en celdas—. Si no, se sigue hasta mirar la rejilla
 *   entera.
 * - El empate se deshace igual: a la misma distancia gana el índice menor,
 *   que es el que la vuelta de antes encontraba primero.
 * - Con coordenadas que no son números finitos, o enormes, se hace la vuelta
 *   de antes tal cual, que es la que define qué sale entonces.
 *
 * Lo comprueba `calle-mas-cercana.test.ts`, contra la cuenta de antes, en los
 * puntos de espera de todos los campos y en puntos sueltos alrededor.
 */

type Punto = readonly [number, number];

/** El lado de una celda, m. Con dos o tres calles por celda, el primer anillo ya decide. */
const LADO = 64;
/** Que un fichero con un punto perdido muy lejos no pida una rejilla de millones de celdas. */
const CELDAS_POR_LADO = 512;
/** Lo que el redondeo de repartir en celdas puede mover un punto medio, de sobra. */
const HOLGURA = 1e-3;
/** Hasta dónde se fía uno de la rejilla: diez mil kilómetros del origen del campo. */
const LEJISIMOS = 1e7;

export class TramosCercanos {
  private readonly n: number;
  private readonly mx: Float64Array;
  private readonly my: Float64Array;
  private readonly ux: Float64Array;
  private readonly uy: Float64Array;
  /** Si se puede buscar en la rejilla: todo finito y a menos de `LEJISIMOS`. */
  private readonly enRejilla: boolean;
  private readonly x0: number = 0;
  private readonly y0: number = 0;
  private readonly lado: number = LADO;
  private readonly columnas: number = 0;
  private readonly filas: number = 0;
  /** Dónde empieza cada celda en `tramos`, y la última, dónde acaba todo. */
  private readonly inicio: Int32Array = new Int32Array(1);
  /** Los tramos de cada celda, seguidos y en su orden de la lista. */
  private readonly tramos: Int32Array = new Int32Array(0);

  constructor(calles: readonly { readonly path: readonly Punto[] }[]) {
    let n = 0;
    for (const calle of calles) n += Math.max(0, calle.path.length - 1);
    this.n = n;
    this.mx = new Float64Array(n);
    this.my = new Float64Array(n);
    this.ux = new Float64Array(n);
    this.uy = new Float64Array(n);
    let k = 0;
    let finito = true;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const calle of calles) {
      for (let i = 0; i < calle.path.length - 1; i++) {
        const [ax, ay] = calle.path[i]!;
        const [bx, by] = calle.path[i + 1]!;
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const largo = Math.hypot(bx - ax, by - ay) || 1;
        this.mx[k] = mx;
        this.my[k] = my;
        this.ux[k] = (bx - ax) / largo;
        this.uy[k] = (by - ay) / largo;
        k++;
        if (!(Math.abs(mx) < LEJISIMOS && Math.abs(my) < LEJISIMOS)) finito = false;
        if (mx < x0) x0 = mx;
        if (mx > x1) x1 = mx;
        if (my < y0) y0 = my;
        if (my > y1) y1 = my;
      }
    }
    this.enRejilla = finito && n > 0;
    if (!this.enRejilla) return;
    this.x0 = x0;
    this.y0 = y0;
    this.lado = Math.max(LADO, (x1 - x0) / CELDAS_POR_LADO, (y1 - y0) / CELDAS_POR_LADO);
    this.columnas = Math.floor((x1 - x0) / this.lado) + 1;
    this.filas = Math.floor((y1 - y0) / this.lado) + 1;
    const celdas = this.columnas * this.filas;
    const celda = new Int32Array(n);
    const inicio = new Int32Array(celdas + 1);
    for (let t = 0; t < n; t++) {
      const i = Math.min(this.columnas - 1, Math.floor((this.mx[t]! - x0) / this.lado));
      const j = Math.min(this.filas - 1, Math.floor((this.my[t]! - y0) / this.lado));
      celda[t] = i * this.filas + j;
      inicio[celda[t]! + 1]!++;
    }
    for (let c = 0; c < celdas; c++) inicio[c + 1]! += inicio[c]!;
    const puesto = inicio.slice(0, celdas);
    const tramos = new Int32Array(n);
    // En orden de la lista, así que dentro de cada celda van de menor a mayor.
    for (let t = 0; t < n; t++) tramos[puesto[celda[t]!]!++] = t;
    this.inicio = inicio;
    this.tramos = tramos;
  }

  /** La dirección del tramo más cercano a `punto`, o nada si no hay calles. */
  direccion(punto: Punto): readonly [number, number] | null {
    const [px, py] = punto;
    if (this.n === 0) return null;
    if (!this.enRejilla || !(Math.abs(px) < LEJISIMOS && Math.abs(py) < LEJISIMOS))
      return this.unoAUno(px, py);
    const { columnas, filas, lado } = this;
    const ci = Math.floor((px - this.x0) / lado);
    const cj = Math.floor((py - this.y0) / lado);
    let mejor = Infinity;
    let cual = -1;
    const mirar = (i: number, j: number): void => {
      const c = i * filas + j;
      for (let q = this.inicio[c]!, fin = this.inicio[c + 1]!; q < fin; q++) {
        const t = this.tramos[q]!;
        const d = Math.hypot(this.mx[t]! - px, this.my[t]! - py);
        if (d < mejor || (d === mejor && t < cual)) {
          mejor = d;
          cual = t;
        }
      }
    };
    // Los anillos que no tocan la rejilla están vacíos: se empieza en el primero que la toca.
    for (let r = Math.max(0, -ci, ci - (columnas - 1), -cj, cj - (filas - 1)); ; r++) {
      const i0 = ci - r;
      const i1 = ci + r;
      const j0 = cj - r;
      const j1 = cj + r;
      for (let i = Math.max(0, i0); i <= Math.min(columnas - 1, i1); i++) {
        if (i === i0 || i === i1) {
          for (let j = Math.max(0, j0); j <= Math.min(filas - 1, j1); j++) mirar(i, j);
        } else {
          if (j0 >= 0 && j0 < filas) mirar(i, j0);
          if (j1 !== j0 && j1 >= 0 && j1 < filas) mirar(i, j1);
        }
      }
      // Lo que queda sin mirar está a más de `r` celdas.
      if (mejor < r * lado - HOLGURA) break;
      if (i0 <= 0 && i1 >= columnas - 1 && j0 <= 0 && j1 >= filas - 1) break;
    }
    return [this.ux[cual]!, this.uy[cual]!];
  }

  /** La vuelta de antes, tramo a tramo y en orden: la que manda fuera de la rejilla. */
  private unoAUno(px: number, py: number): readonly [number, number] | null {
    let mejor = Infinity;
    let cual = -1;
    for (let t = 0; t < this.n; t++) {
      const d = Math.hypot(this.mx[t]! - px, this.my[t]! - py);
      if (d >= mejor) continue;
      mejor = d;
      cual = t;
    }
    return cual < 0 ? null : [this.ux[cual]!, this.uy[cual]!];
  }
}
