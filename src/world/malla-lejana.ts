/**
 * La malla del relieve lejano, con los triángulos donde hay relieve.
 *
 * ## Por qué
 *
 * El horizonte se mallaba cuadro a cuadro: dos triángulos por cada cuadro de
 * tierra del mapa lejano, fuera llano o fuera la Caldera de Taburiente. Con
 * los mapas a unos trescientos metros por muestra —lo que quitó lo «a
 * bloques» de La Palma, la captura de Enrique del punto 166: «verde plano y a
 * bloques, como estar jugando en Minecraft»— eso deja mundos de doscientos
 * sesenta mil triángulos de horizonte. Fuerteventura se quedó en ochocientos
 * metros por eso: su mundo lleva tres islas, y afinarlo pasaba de 41.000
 * triángulos a 264.000. Y Fuerteventura es la isla más vieja y la más
 * gastada: llanos de kilómetros donde doscientos triángulos dibujan lo mismo
 * que cuatro. Era tirar vértices.
 *
 * ## Cómo
 *
 * Un árbol de cuadrados sobre la rejilla. Un bloque de cuadros se dibuja como
 * una sola pieza —un abanico de triángulos desde su nudo central— cuando
 * **ninguna muestra suya se aparta de esa pieza más de `tolerancia` metros**;
 * si no, se parte en cuatro y se mira cada parte. Donde el relieve sube y
 * baja, se llega al cuadro de siempre con sus dos triángulos, y ahí la malla
 * es exactamente la de antes: la montaña no pierde nada. Lo que se junta es
 * lo que ya era plano —un llano, una ladera lisa—, y su forma se queda a
 * menos de la tolerancia de la que tenía, que es mucho menos de lo que yerra
 * la propia muestra de trescientos metros.
 *
 * **Sin grietas.** Un bloque grande al lado de cuadros pequeños tiene, en su
 * borde, nudos que son esquina de sus vecinos. Si el bloque no pasara por
 * ellos, su borde sería una recta y el de los vecinos una quebrada, y entre
 * las dos se vería el cielo. Así que el abanico de cada bloque recorre su
 * borde por **todos** los nudos que son esquina de alguien: los dos lados de
 * cada arista tienen los mismos nudos y casan.
 *
 * **Y a todo detalle donde hace falta**, que no lo dice la tolerancia sino
 * otra cosa:
 *
 * - **La costa**: un cuadro con alguna esquina en el agua va siempre en sus
 *   dos triángulos. Ahí el agua pregunta al mapa dónde hay tierra —ver
 *   `GLSL_DE_LAS_ORILLAS` en `world/sky.ts`— con la cuenta de esos dos
 *   triángulos, y tienen que ser los que se dibujan.
 * - **Junto a lo que no se malla**: el mapa fino de casa, el de cada vecino y
 *   la raya entre las dos mallas del anillo partido. Al otro lado hay otra
 *   malla que no sabe de bloques; con cuadros sueltos en el borde, las dos
 *   casan nudo a nudo como antes.
 */

/**
 * Los índices de la malla, en nudos de la rejilla (`fila * lado + col`).
 *
 * @param lado nudos por lado de la rejilla.
 * @param cota la cota que se dibuja en un nudo, m.
 * @param va si el cuadro de esquina superior izquierda (fila, col) se malla.
 * @param costa si ese cuadro tiene que ir a todo detalle.
 * @param tolerancia cuánto puede apartarse un bloque de sus muestras, m.
 * @param bloque el lado del bloque más grande, en cuadros: una potencia de dos.
 */
export function mallarConDetalle(
  lado: number,
  cota: (fila: number, col: number) => number,
  va: (fila: number, col: number) => boolean,
  costa: (fila: number, col: number) => boolean,
  tolerancia: number,
  bloque: number,
): number[] {
  const n = lado - 1;
  const indices: number[] = [];
  if (n < 1) return indices;

  /*
   * Dos tablas de sumas —cuántos cuadros van y cuántos se pueden juntar en
   * cada rectángulo— para que preguntar por un bloque cueste lo mismo sea
   * grande o pequeño.
   */
  const ancho = n + 1;
  const van = new Int32Array(ancho * ancho);
  const juntables = new Int32Array(ancho * ancho);
  const deVan = new Uint8Array(n * n);
  for (let f = 0; f < n; f++)
    for (let c = 0; c < n; c++) deVan[f * n + c] = va(f, c) ? 1 : 0;
  /*
   * Fuera de la rejilla no hay otra malla con la que casar: ahí se acaba el
   * mundo. Y el mar abierto que no se malla no hace falta mirarlo: el cuadro
   * de al lado comparte con él una esquina por lo menos, o sea que es costa.
   */
  const vaEn = (f: number, c: number): boolean =>
    f < 0 || c < 0 || f >= n || c >= n || deVan[f * n + c] === 1;
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < n; c++) {
      const v = deVan[f * n + c]!;
      let j = 0;
      if (v && !costa(f, c)) {
        j = 1;
        // Y con sus ocho vecinos dentro: ver «junto a lo que no se malla».
        for (let df = -1; df <= 1 && j; df++)
          for (let dc = -1; dc <= 1; dc++)
            if (!vaEn(f + df, c + dc)) {
              j = 0;
              break;
            }
      }
      const k = (f + 1) * ancho + c + 1;
      van[k] = v + van[k - ancho]! + van[k - 1]! - van[k - ancho - 1]!;
      juntables[k] = j + juntables[k - ancho]! + juntables[k - 1]! - juntables[k - ancho - 1]!;
    }
  }
  const suma = (t: Int32Array, f0: number, c0: number, fs: number, cs: number): number =>
    t[(f0 + fs) * ancho + c0 + cs]! -
    t[f0 * ancho + c0 + cs]! -
    t[(f0 + fs) * ancho + c0]! +
    t[f0 * ancho + c0]!;

  /*
   * Lo que se aparta un bloque de sus muestras: el abanico de cuatro
   * triángulos entre sus esquinas y su nudo central. Con nudos de más en el
   * borde —los de los vecinos pequeños— la pieza cambia, pero esos nudos son
   * muestras exactas y el error, como mucho, se dobla.
   */
  const aparta = (f0: number, c0: number, s: number): number => {
    const h00 = cota(f0, c0);
    const h01 = cota(f0, c0 + s);
    const h10 = cota(f0 + s, c0);
    const h11 = cota(f0 + s, c0 + s);
    const hc = cota(f0 + s / 2, c0 + s / 2);
    let peor = 0;
    for (let f = f0; f <= f0 + s; f++) {
      const v = (f - f0) / s;
      for (let c = c0; c <= c0 + s; c++) {
        const u = (c - c0) / s;
        let p: number;
        if (v <= u && v <= 1 - u) p = h00 + (h01 - h00) * u + (hc - (h00 + h01) / 2) * 2 * v;
        else if (u >= v && u >= 1 - v) p = h01 + (h11 - h01) * v + (hc - (h01 + h11) / 2) * 2 * (1 - u);
        else if (v >= u && v >= 1 - u) p = h10 + (h11 - h10) * u + (hc - (h10 + h11) / 2) * 2 * (1 - v);
        else p = h00 + (h10 - h00) * v + (hc - (h00 + h10) / 2) * 2 * u;
        const d = Math.abs(cota(f, c) - p);
        if (d > peor) {
          peor = d;
          if (peor > tolerancia) return peor;
        }
      }
    }
    return peor;
  };

  const esquina = new Uint8Array(lado * lado);
  const marcar = (f0: number, c0: number, s: number): void => {
    esquina[f0 * lado + c0] = 1;
    esquina[f0 * lado + c0 + s] = 1;
    esquina[(f0 + s) * lado + c0] = 1;
    esquina[(f0 + s) * lado + c0 + s] = 1;
  };

  const hojas: number[] = [];
  const pila: number[] = [];
  for (let f0 = 0; f0 < n; f0 += bloque)
    for (let c0 = 0; c0 < n; c0 += bloque) pila.push(f0, c0, bloque);
  while (pila.length) {
    const s = pila.pop()!;
    const c0 = pila.pop()!;
    const f0 = pila.pop()!;
    const fs = Math.min(s, n - f0);
    const cs = Math.min(s, n - c0);
    if (fs <= 0 || cs <= 0 || suma(van, f0, c0, fs, cs) === 0) continue;
    if (s === 1) {
      // El cuadro de siempre, con la diagonal de siempre: la que sigue el agua.
      const a = f0 * lado + c0;
      indices.push(a, a + lado, a + 1, a + 1, a + lado, a + lado + 1);
      marcar(f0, c0, 1);
      continue;
    }
    if (fs === s && cs === s && suma(juntables, f0, c0, s, s) === s * s && aparta(f0, c0, s) <= tolerancia) {
      hojas.push(f0, c0, s);
      marcar(f0, c0, s);
      continue;
    }
    const m = s / 2;
    pila.push(f0, c0, m, f0, c0 + m, m, f0 + m, c0, m, f0 + m, c0 + m, m);
  }

  /*
   * Y cada bloque, en abanico desde su centro por todos los nudos de su
   * borde que son esquina de alguien. En el sentido de los cuadros —bajando
   * por el oeste, el sur hacia el este, subiendo por el este y el norte hacia
   * el oeste—, que es el que deja la cara hacia arriba.
   */
  const borde: number[] = [];
  for (let h = 0; h < hojas.length; h += 3) {
    const f0 = hojas[h]!;
    const c0 = hojas[h + 1]!;
    const s = hojas[h + 2]!;
    borde.length = 0;
    for (let f = f0; f < f0 + s; f++) if (esquina[f * lado + c0]) borde.push(f * lado + c0);
    for (let c = c0; c < c0 + s; c++) if (esquina[(f0 + s) * lado + c]) borde.push((f0 + s) * lado + c);
    for (let f = f0 + s; f > f0; f--) if (esquina[f * lado + c0 + s]) borde.push(f * lado + c0 + s);
    for (let c = c0 + s; c > c0; c--) if (esquina[f0 * lado + c]) borde.push(f0 * lado + c);
    const centro = (f0 + s / 2) * lado + c0 + s / 2;
    for (let i = 0; i < borde.length; i++)
      indices.push(centro, borde[i]!, borde[(i + 1) % borde.length]!);
  }
  return indices;
}
