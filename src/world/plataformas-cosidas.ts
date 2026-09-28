/**
 * **Las plataformas que el dibujo deja sueltas, cosidas a su calle.**
 *
 * En Tenerife Sur, OpenStreetMap dibuja los puestos de estacionamiento en
 * islas: trece plataformas pequeñas, cada una con su fila de puestos, y entre
 * cada isla y la calle que la rodea de veintiocho a cuarenta y seis metros de
 * nada. En la foto aérea que el juego pone debajo, esa nada es **hormigón**:
 * la plataforma de verdad es una sola y las islas son solo lo que alguien
 * llegó a dibujar. Y lo que no está dibujado, para el juego, es campo.
 *
 * Mientras la raya verde se enganchaba en recta desde el puesto hasta el nudo
 * más cercano, eso no se notaba: la recta cruzaba lo que hubiera. En cuanto la
 * raya dejó de cruzar lo que no es pavimento —ver `enganches` en `rodaje.ts`—,
 * esos noventa y un puestos se quedaron sin salida: el avión no podía salir
 * del sitio donde el juego lo pone.
 *
 * No es cosa de la raya, es cosa del mapa, así que se arregla en el mapa: a
 * cada plataforma con puestos que no toca ninguna calle se le añade la franja
 * que la une con las calles que tiene al lado. Se dibuja, se rueda y se mide
 * igual que el resto de la plataforma, porque **es** plataforma. Hoy solo le
 * pasa a Tenerife Sur; la regla es de todos los campos, y en los demás no
 * cambia nada porque sus plataformas ya tocan su calle.
 */

import type { Aerodrome, Punto } from "./aerodrome";
import { ANCHO_RODADURA } from "./ancho-de-rodadura";

/**
 * Lo más que puede haber entre una plataforma y el borde de su calle para
 * darlo por la misma plataforma sin dibujar, m.
 *
 * Cincuenta: las rendijas de Tenerife Sur van de veintiocho a cuarenta y
 * seis. Más allá ya no es una franja sin dibujar sino otra cosa —en Silvio
 * Pettirossi hay una plataforma sin puestos a ciento veintiún metros de toda
 * calle, y no es para rodar hasta ella—.
 */
const HASTA_SU_CALLE = 50;

export function conPlataformasCosidas(aero: Aerodrome): Aerodrome {
  const cosidas: { polygon: Punto[]; surface: string | null }[] = [];
  const puestos = (aero.parkingPositions ?? []).map((p) => p.xy);
  for (const plataforma of aero.aprons) {
    const poligono = plataforma.polygon;
    if (poligono.length < 3) continue;
    // Solo las que tienen dónde aparcar: una plataforma vacía no hace falta
    // cruzarla para salir de ningún sitio.
    if (!puestos.some((p) => dentro(p, poligono))) continue;
    const cerca: { path: readonly Punto[]; media: number; hueco: number }[] = [];
    let tocaUna = false;
    for (const calle of aero.taxiways) {
      const media = (calle.widthM ?? ANCHO_RODADURA) / 2;
      let hueco = Infinity;
      for (const v of poligono) hueco = Math.min(hueco, aLaLinea(v, calle.path) - media);
      for (const q of calle.path) if (dentro(q, poligono)) hueco = -Infinity;
      if (hueco <= 0) {
        tocaUna = true;
        break;
      }
      if (hueco <= HASTA_SU_CALLE) cerca.push({ path: calle.path, media, hueco });
    }
    if (tocaUna || !cerca.length) continue;
    /*
     * La franja es la envolvente de la plataforma y de lo que cada una de sus
     * esquinas cae sobre el eje de las calles de al lado: el hueco que queda
     * entre la isla y la calle, y nada más allá del eje.
     */
    const puntos: Punto[] = [...poligono];
    for (const v of poligono)
      for (const c of cerca) {
        const q = proyeccion(v, c.path);
        if (Math.hypot(q[0] - v[0], q[1] - v[1]) <= HASTA_SU_CALLE + c.media)
          puntos.push(q);
      }
    cosidas.push({ polygon: envolvente(puntos), surface: plataforma.surface ?? null });
  }
  return cosidas.length ? { ...aero, aprons: [...aero.aprons, ...cosidas] } : aero;
}

/** Lo que dista un punto de una polilínea, m. */
function aLaLinea(p: Punto, linea: readonly Punto[]): number {
  const q = proyeccion(p, linea);
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

/** El punto de una polilínea más cercano a `p`. */
function proyeccion(p: Punto, linea: readonly Punto[]): Punto {
  let mejor: Punto = linea[0] ?? p;
  let d = Infinity;
  for (let i = 0; i < linea.length - 1; i++) {
    const a = linea[i]!;
    const b = linea[i + 1]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    const q: Punto = [a[0] + dx * t, a[1] + dy * t];
    const e = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (e < d) {
      d = e;
      mejor = q;
    }
  }
  return mejor;
}

/** Punto dentro de un polígono, por el número de cruces. */
function dentro(p: Punto, poligono: readonly Punto[]): boolean {
  let d = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i]!;
    const b = poligono[j]!;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      d = !d;
  }
  return d;
}

/** La envolvente convexa, por la cadena monótona de Andrew. */
function envolvente(puntos: readonly Punto[]): Punto[] {
  const p = [...puntos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const giro = (o: Punto, a: Punto, b: Punto) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const abajo: Punto[] = [];
  for (const q of p) {
    while (abajo.length >= 2 && giro(abajo[abajo.length - 2]!, abajo[abajo.length - 1]!, q) <= 0)
      abajo.pop();
    abajo.push(q);
  }
  const arriba: Punto[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]!;
    while (arriba.length >= 2 && giro(arriba[arriba.length - 2]!, arriba[arriba.length - 1]!, q) <= 0)
      arriba.pop();
    arriba.push(q);
  }
  return [...abajo.slice(0, -1), ...arriba.slice(0, -1)];
}
