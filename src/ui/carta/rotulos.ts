/**
 * **Dónde va cada rótulo de la carta para no pisar a otro.**
 *
 * En el calco de la radio, en el nudo de Pettirossi, el rumbo y las millas de
 * las rutas caían encima de los nombres y de las frecuencias —«Pilar», «AFIS
 * 118.4»—, y en el teléfono se escribía todo encima de todo. La colocación de
 * antes contaba en los píxeles de una carta de tamaño fijo y luego el CSS la
 * estiraba o la encogía; pero la letra no se estira, así que en una carta
 * pequeña cada rótulo ocupaba el doble de lo calculado.
 *
 * Aquí se coloca **con las medidas de verdad**, cada vez que la carta cambia
 * de tamaño, como lo hace quien dibuja una carta:
 *
 * - primero lo que no se mueve: el símbolo de cada aeródromo y la rosa;
 * - después los rótulos por orden de importancia —casa, el destino elegido,
 *   los que tienen ruta, los demás—, cada uno en el primer sitio libre de los
 *   suyos, y si no cabe entero, en una forma más corta;
 * - el rumbo y las millas de una ruta, a lo largo de su raya y lejos del nudo;
 * - y lo que solo acompaña —una cota, el nombre de un río, la cifra de la
 *   retícula—, si no cabe, no se escribe. Todo eso sigue en la ficha de cada
 *   campo, que es lo que hace una carta de verdad: generalizar.
 *
 * Cruzar una raya de ruta no está prohibido —en el nudo de Asunción salen
 * ocho y no hay sitio sin ellas—, pero cuesta: entre dos sitios libres se
 * queda el que no tapa la ruta.
 *
 * No toca el DOM: recibe cajas y devuelve sitios, y se prueba sin navegador.
 * Lo mide y lo aplica `colocarLaCarta`, en `mapa-del-pais.ts`.
 */

/** Un rectángulo, quizá girado: su centro, sus medidas y su giro en radianes. */
export interface Caja {
  readonly cx: number;
  readonly cy: number;
  readonly w: number;
  readonly h: number;
  /** El giro, en radianes, en el sentido de las agujas con la Y hacia abajo. */
  readonly giro?: number;
}

/** Un tramo recto: una ruta de la carta. */
export interface Raya {
  readonly a: readonly [number, number];
  readonly b: readonly [number, number];
}

/** Un sitio donde puede ir un rótulo, con lo que cuesta ponerlo ahí. */
export interface Sitio {
  readonly caja: Caja;
  /** De cero —el sitio preferido— hacia arriba. */
  readonly coste: number;
  /** Lo que necesita quien lo aplica para dejarlo ahí: el lado, la alineación. */
  readonly lado?: string;
}

/** Un rótulo por colocar: sus formas, de la entera a la más corta, y los sitios de cada una. */
export interface PorColocar {
  readonly formas: readonly (readonly Sitio[])[];
  /** Su propia raya, que puede tocar sin coste: la ruta de la que habla. */
  readonly propia?: number;
}

/** Dónde quedó un rótulo: con qué forma y en qué sitio. */
export interface Colocado {
  readonly forma: number;
  readonly sitio: number;
  readonly caja: Caja;
}

/** Lo que cuesta tapar una ruta con letra, frente al coste de alejarse del sitio preferido. */
const CRUCE = 6;

const ejes = (c: Caja): [[number, number], [number, number]] => {
  const g = c.giro ?? 0;
  const cos = Math.cos(g);
  const sin = Math.sin(g);
  return [
    [cos, sin],
    [-sin, cos],
  ];
};

/** La media anchura de una caja vista sobre un eje. */
function radioSobre(c: Caja, [ex, ey]: readonly [number, number]): number {
  const [[ux, uy], [vx, vy]] = ejes(c);
  return (c.w / 2) * Math.abs(ux * ex + uy * ey) + (c.h / 2) * Math.abs(vx * ex + vy * ey);
}

/**
 * **Si dos cajas se pisan**, giradas o no: el teorema del eje separador, que
 * con dos rectángulos son cuatro ejes. `holgura` agranda las dos, para que dos
 * rótulos que se tocan también cuenten.
 */
export function sePisan(a: Caja, b: Caja, holgura = 0): boolean {
  for (const eje of [...ejes(a), ...ejes(b)]) {
    const d = Math.abs((a.cx - b.cx) * eje[0] + (a.cy - b.cy) * eje[1]);
    if (d >= radioSobre(a, eje) + radioSobre(b, eje) + holgura) return false;
  }
  return true;
}

/** La caja derecha que envuelve una caja girada. */
export function envolvente(c: Caja): { x0: number; y0: number; x1: number; y1: number } {
  const rx = radioSobre(c, [1, 0]);
  const ry = radioSobre(c, [0, 1]);
  return { x0: c.cx - rx, y0: c.cy - ry, x1: c.cx + rx, y1: c.cy + ry };
}

/** Si una raya atraviesa una caja: se lleva la raya a los ejes de la caja y se recorta, como Liang y Barsky. */
export function cruza(c: Caja, r: Raya): boolean {
  const g = c.giro ?? 0;
  const cos = Math.cos(-g);
  const sin = Math.sin(-g);
  const local = ([x, y]: readonly [number, number]): [number, number] => {
    const dx = x - c.cx;
    const dy = y - c.cy;
    return [dx * cos - dy * sin, dx * sin + dy * cos];
  };
  const [ax, ay] = local(r.a);
  const [bx, by] = local(r.b);
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [
    [-dx, ax + c.w / 2],
    [dx, c.w / 2 - ax],
    [-dy, ay + c.h / 2],
    [dy, c.h / 2 - ay],
  ] as const) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

/**
 * **Coloca los rótulos**, en el orden en que llegan: cada uno en el sitio más
 * barato de su primera forma que no pise lo ya puesto ni se salga de la
 * carta; si ninguno, prueba la forma siguiente; y si tampoco, se queda sin
 * escribir (`null`).
 *
 * `fijos` son los símbolos y la rosa, que no se mueven y no se pisan.
 * `holgura` es el aire mínimo entre dos rótulos, en píxeles.
 *
 * `porForma`, si se da, cambia el orden de las formas por un precio: cada
 * forma más corta cuesta eso más, y gana el sitio más barato de todas. En el
 * plano en vuelo, que en un teléfono mide ciento setenta píxeles, el rótulo
 * entero de casa acababa en el tercer anillo, lejos de su punto, cuando sin
 * la radio cabía pegado a él; y un rótulo lejos de su punto ya no dice de
 * quién es.
 */
export function colocar(
  ancho: number,
  alto: number,
  fijos: readonly Caja[],
  rayas: readonly Raya[],
  rotulos: readonly PorColocar[],
  holgura = 2,
  porForma?: number,
): (Colocado | null)[] {
  /*
   * Con su caja envolvente al lado, que descarta de una vez casi todos los
   * pares: el eje separador, con sus senos y cosenos, solo hace falta cuando
   * las envolventes se tocan y alguna de las dos va girada. En la tablet de
   * la escuela, con la CPU a un cuarto, la cuenta entera pasaba de veinte
   * milisegundos por esto.
   */
  const puestas = fijos.map((caja) => ({ caja, e: envolvente(caja) }));
  const pisaAlguna = (caja: Caja, e: ReturnType<typeof envolvente>): boolean =>
    puestas.some(
      (p) =>
        e.x0 < p.e.x1 + holgura &&
        p.e.x0 < e.x1 + holgura &&
        e.y0 < p.e.y1 + holgura &&
        p.e.y0 < e.y1 + holgura &&
        (!(caja.giro || p.caja.giro) || sePisan(caja, p.caja, holgura)),
    );
  return rotulos.map((r) => {
    let mejorForma = -1;
    let mejor = -1;
    let menos = Infinity;
    let suya: ReturnType<typeof envolvente> | null = null;
    for (let f = 0; f < r.formas.length; f++) {
      // Sin precio, la primera forma que cabe; con él, la más barata de todas.
      if (porForma === undefined) menos = Infinity;
      const extra = (porForma ?? 0) * f;
      r.formas[f]!.forEach((s, i) => {
        if (s.coste + extra >= menos) return;
        const e = envolvente(s.caja);
        if (e.x0 < 0 || e.y0 < 0 || e.x1 > ancho || e.y1 > alto) return;
        if (pisaAlguna(s.caja, e)) return;
        let coste = s.coste + extra;
        for (let k = 0; k < rayas.length && coste < menos; k++)
          if (k !== r.propia && cruza(s.caja, rayas[k]!)) coste += CRUCE;
        if (coste < menos) {
          menos = coste;
          mejor = i;
          mejorForma = f;
          suya = e;
        }
      });
      if (porForma === undefined && mejor >= 0) break;
    }
    if (mejor >= 0 && suya) {
      const caja = r.formas[mejorForma]![mejor]!.caja;
      puestas.push({ caja, e: suya });
      return { forma: mejorForma, sitio: mejor, caja };
    }
    return null;
  });
}

// ── Los sitios de cada clase de rótulo ─────────────────────────────────────

/** Las medidas de un rótulo en cada una de sus formas, en píxeles. */
export type Medidas = readonly (readonly [number, number])[];

/**
 * **Alrededor de un punto**: el rótulo de un aeródromo. A la derecha primero
 * —es como se lee—, luego a la izquierda, luego en las cuatro esquinas y
 * después encima o debajo; y si el nudo está lleno, un poco más lejos.
 * `radio` es el del símbolo.
 */
export function sitiosAlrededor(x: number, y: number, radio: number, [w, h]: readonly [number, number]): Sitio[] {
  const sitios: Sitio[] = [];
  [
    { m: radio + 5, extra: 0 },
    { m: radio + 16, extra: 2.5 },
    { m: radio + 30, extra: 5 },
  ].forEach(({ m, extra }) => {
    const d = m * 0.72;
    const lados: [string, number, number, number][] = [
      ["derecha", x + m + w / 2, y, 0],
      ["izquierda", x - m - w / 2, y, 0.4],
      ["derecha", x + d + w / 2, y - d - h / 2 + 4, 0.8],
      ["derecha", x + d + w / 2, y + d + h / 2 - 4, 0.9],
      ["izquierda", x - d - w / 2, y - d - h / 2 + 4, 1.1],
      ["izquierda", x - d - w / 2, y + d + h / 2 - 4, 1.2],
      ["centro", x, y + m + h / 2, 1.5],
      ["centro", x, y - m - h / 2, 1.6],
    ];
    for (const [lado, cx, cy, coste] of lados) sitios.push({ caja: { cx, cy, w, h }, coste: coste + extra, lado });
  });
  return sitios;
}

/**
 * **A lo largo de una raya**: el rumbo y las millas de una ruta, girados con
 * ella como en una carta y a un lado, no encima. Mejor de la mitad hacia el
 * destino que cerca del nudo, donde se juntan todas; la letra nunca boca
 * abajo.
 */
export function sitiosEnLaRaya(
  a: readonly [number, number],
  b: readonly [number, number],
  [w, h]: readonly [number, number],
  aparte: number,
): Sitio[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const largo = Math.hypot(dx, dy) || 1;
  let giro = Math.atan2(dy, dx);
  if (giro > Math.PI / 2) giro -= Math.PI;
  if (giro <= -Math.PI / 2) giro += Math.PI;
  // La normal de la raya, a un lado y al otro.
  const nx = -dy / largo;
  const ny = dx / largo;
  const sitios: Sitio[] = [];
  for (const [f, coste] of [
    [0.6, 0],
    [0.68, 0.2],
    [0.52, 0.3],
    [0.76, 0.5],
    [0.45, 0.8],
    [0.84, 1],
    [0.38, 1.6],
  ] as const)
    for (const lado of [1, -1]) {
      const d = h / 2 + aparte;
      sitios.push({
        caja: { cx: a[0] + dx * f + nx * d * lado, cy: a[1] + dy * f + ny * d * lado, w, h, giro },
        coste: coste + (lado < 0 ? 0.1 : 0),
      });
    }
  return sitios;
}

/** **En uno de varios sitios a elegir**: el nombre de un río o de un país, el primero que quepa. */
export function sitiosEntre(puntos: readonly (readonly [number, number])[], [w, h]: readonly [number, number]): Sitio[] {
  return puntos.map(([cx, cy], i) => ({ caja: { cx, cy, w, h }, coste: i }));
}
