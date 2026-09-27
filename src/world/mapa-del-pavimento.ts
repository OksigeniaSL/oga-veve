/**
 * El pavimento dibujado de un aeródromo, pasado a una rejilla de dos metros
 * para que el modelo de vuelo pueda apoyar las ruedas **en él**.
 *
 * ## Por qué hace falta
 *
 * El asfalto que se ve y el suelo que pisa el avión eran dos superficies. El
 * terreno del aeródromo se aplana `RESALTE` por debajo del pavimento —ver
 * `flattenAerodrome` en `terrain.ts`— para que el relieve no asome entre los
 * triángulos del asfalto, y el modelo de vuelo apoyaba las ruedas en el
 * terreno: **todos los aviones, en todos los campos, con el tren treinta y
 * cinco centímetros dentro de la pista**. Se vio en Guaraní con el JAZ 40, el
 * 60, el 90 y el 120, y medido pasaba igual en Asunción y en Los Rodeos.
 *
 * Y no bastaba con sumarle el resalte al terreno. El pavimento se dibuja con
 * triángulos de cincuenta metros —y una plataforma, con los que salgan de su
 * polígono—, y el mapa de alturas se interpola de otra manera entre sus
 * nudos: donde el terreno no es un plano las dos cuentas se separan. Medido,
 * diez centímetros en la pista de Los Rodeos, donde la rasante deja de caer
 * pasado el umbral, y sesenta en una plataforma de Cuatro Vientos.
 *
 * Así que se le pregunta **al dibujo**: cada celda guarda a cuánto está el
 * asfalto dibujado sobre el mapa de alturas, sacado de los mismos triángulos
 * que se pintan. Una superficie, no dos, sea cual sea la forma en que se
 * construya el pavimento mañana.
 *
 * ## Por qué se interpola
 *
 * Contestar «asfalto sí, asfalto no» pondría un escalón de treinta y cinco
 * centímetros en el filo, y el modelo de vuelo da por volando al avión que
 * se separa del suelo más de un palmo: salirse de la calle sería un despegue
 * y volver a ella, un aterrizaje. Interpolando entre centros de celda, con la
 * hierba a cero, el escalón es una rampa de dos metros que a velocidad de
 * rodaje se sigue sin despegar y que no se ve.
 *
 * ## Lo que cuesta
 *
 * Un byte por celda, en centímetros: el aeródromo más grande, Gran Canaria,
 * es millón y medio de celdas. Se hace la primera vez que se pisa ese campo,
 * no al cargar, así que de los vecinos solo se hace el del sitio al que se
 * vuela.
 */
import type { BufferGeometry, Mesh } from "three";

/** Lado de la celda, m. Ver «Por qué se interpola». */
export const CELDA_DEL_PAVIMENTO = 2;

/** Lo que vale una celda sin pavimento. */
const NADA = -128;

export interface MapaDelPavimento {
  /**
   * Cuánto está el pavimento dibujado por encima del mapa de alturas en un
   * punto, m, en las coordenadas del terreno que lo dibuja. Cero en la
   * hierba, y una rampa de una celda en el filo.
   */
  alzadoEn(x: number, z: number): number;
}

const VACIO: MapaDelPavimento = { alzadoEn: () => 0 };

export function mapaDelPavimento(
  mallas: readonly Mesh[],
  /** La cota del mapa de alturas, que es contra lo que se guarda el alzado. */
  suelo: (x: number, z: number) => number,
  celda = CELDA_DEL_PAVIMENTO,
): MapaDelPavimento {
  // Los triángulos en llano, como tres vértices seguidos de x, y, z.
  const tris: number[] = [];
  for (const malla of mallas) triangulos(malla.geometry, tris);
  if (!tris.length) return VACIO;

  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < tris.length; i += 3) {
    x0 = Math.min(x0, tris[i]!);
    x1 = Math.max(x1, tris[i]!);
    z0 = Math.min(z0, tris[i + 2]!);
    z1 = Math.max(z1, tris[i + 2]!);
  }
  // Una celda de margen, para que la rampa del filo caiga dentro.
  x0 -= celda;
  z0 -= celda;
  const nx = Math.ceil((x1 - x0) / celda) + 2;
  const nz = Math.ceil((z1 - z0) / celda) + 2;
  const alzado = new Int8Array(nx * nz).fill(NADA);

  for (let t = 0; t < tris.length; t += 9) {
    const ax = tris[t]!;
    const ay = tris[t + 1]!;
    const az = tris[t + 2]!;
    const bx = tris[t + 3]!;
    const by = tris[t + 4]!;
    const bz = tris[t + 5]!;
    const cx = tris[t + 6]!;
    const cy = tris[t + 7]!;
    const cz = tris[t + 8]!;
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(det) < 1e-9) continue;
    const i0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - x0) / celda - 0.5));
    const i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - x0) / celda - 0.5));
    const j0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - z0) / celda - 0.5));
    const j1 = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) - z0) / celda - 0.5));
    for (let j = j0; j <= j1; j++) {
      const pz = z0 + (j + 0.5) * celda;
      for (let i = i0; i <= i1; i++) {
        const px = x0 + (i + 0.5) * celda;
        const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det;
        const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det;
        const l3 = 1 - l1 - l2;
        if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
        const y = l1 * ay + l2 * by + l3 * cy;
        // En centímetros, y **el más alto** donde dos pavimentos se pisan:
        // el que se ve es el de encima.
        const cm = Math.max(
          -127,
          Math.min(127, Math.round((y - suelo(px, pz)) * 100)),
        );
        const k = j * nx + i;
        if (cm > alzado[k]!) alzado[k] = cm;
      }
    }
  }

  /*
   * **Y las rendijas se tapan.** Donde se juntan dos cintas queda a veces un
   * poro o una rendija de menos de un metro entre sus triángulos —medidos en
   * Lanzarote y en Cuatro Vientos, en mitad de una calle—, que no se ve y que
   * las ruedas sí notarían: un bache de treinta y cinco centímetros al pasar
   * por encima. Una celda sin pavimento con pavimento a los dos lados, de
   * izquierda a derecha o de arriba abajo, es eso, y se rellena con la media
   * de esos dos. Solo esa: una cuña de hierba de verdad es más ancha que una
   * celda y se queda.
   *
   * Se decide sobre una copia, que si no una rendija se va cerrando en
   * cadena y se come la hierba de al lado.
   */
  const antes = alzado.slice();
  for (let j = 1; j < nz - 1; j++) {
    for (let i = 1; i < nx - 1; i++) {
      const k = j * nx + i;
      if (antes[k] !== NADA) continue;
      const a = antes[k - 1]!;
      const b = antes[k + 1]!;
      const c = antes[k - nx]!;
      const d = antes[k + nx]!;
      if (a !== NADA && b !== NADA) alzado[k] = Math.round((a + b) / 2);
      else if (c !== NADA && d !== NADA) alzado[k] = Math.round((c + d) / 2);
    }
  }

  const en = (i: number, j: number): number => {
    if (i < 0 || j < 0 || i >= nx || j >= nz) return 0;
    const v = alzado[j * nx + i]!;
    return v === NADA ? 0 : v / 100;
  };

  return {
    alzadoEn(x: number, z: number): number {
      const gx = (x - x0) / celda - 0.5;
      const gz = (z - z0) / celda - 0.5;
      if (gx < -1 || gz < -1 || gx > nx || gz > nz) return 0;
      const i = Math.floor(gx);
      const j = Math.floor(gz);
      const tx = gx - i;
      const tz = gz - j;
      const cerca = en(i, j) * (1 - tx) + en(i + 1, j) * tx;
      const lejos = en(i, j + 1) * (1 - tx) + en(i + 1, j + 1) * tx;
      return cerca * (1 - tz) + lejos * tz;
    },
  };
}

/** Los triángulos de una geometría, con o sin índice, a la lista. */
function triangulos(geo: BufferGeometry, tris: number[]): void {
  const pos = geo.getAttribute("position");
  if (!pos) return;
  const indice = geo.getIndex();
  const n = indice ? indice.count : pos.count;
  for (let k = 0; k + 2 < n; k += 3) {
    for (let v = 0; v < 3; v++) {
      const i = indice ? indice.getX(k + v) : k + v;
      tris.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
  }
}
