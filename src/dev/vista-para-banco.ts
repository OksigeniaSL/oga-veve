/**
 * **Lo que llena la vista de la cámara alrededor de lo mirado**, para el banco
 * de la tercera escena: ver `scripts/verificar-inicio-3.mjs` y
 * `paisajeParaBanco` en `game.ts`.
 *
 * Lo de debajo se medía por un punto: el sitio adonde llegan los ojos, que con
 * la cara contra el cristal mirando abajo cae en la góndola del motor. En el
 * banco, a los 1.607 s, el mar llenaba la mitad de arriba de la ventanilla y
 * el rayo hasta el punto daba en `motor_4` a 3,9 m (H59). Un mar o una tierra
 * de debajo no son un punto, son lo que se ve al mirar abajo, y es la lección
 * que ya dio el mar de nubes (H38m): se tiran veinticinco rectas desde la
 * cámara, en un cuadro de 0,8 de pantalla alrededor de lo mirado, y se cuenta
 * lo que ve cada una (H59b).
 *
 * Aparte de `game.ts` para poder probarlo en Node con la malla del avión de
 * verdad: ver `vista-para-banco.test.ts`.
 */
import { Vector3, type Camera } from "three";

/** Un punto del mundo, m. */
export interface PuntoDeLaVista {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * **Las rectas de la vista**: cinco por cinco, cada 0,2 de pantalla alrededor
 * de lo mirado —un cuadro de 0,8—, sin las que caen fuera de la imagen. Desde
 * la cámara, unitarias, en el mundo.
 */
export function rectasDeLaVista(camara: Camera, cx: number, cy: number): Vector3[] {
  camara.updateMatrixWorld();
  const ojo = new Vector3().setFromMatrixPosition(camara.matrixWorld);
  const rectas: Vector3[] = [];
  for (let i = -2; i <= 2; i++)
    for (let k = -2; k <= 2; k++) {
      const nx = cx + i * 0.2;
      const ny = cy + k * 0.2;
      if (Math.abs(nx) > 0.98 || Math.abs(ny) > 0.98) continue;
      rectas.push(new Vector3(nx, ny, 0.5).unproject(camara).sub(ojo).normalize());
    }
  return rectas;
}

/**
 * **Cuánta nube densa deja pasar una recta y aún se ve lo de detrás**, m: la
 * misma regla que la de lo nombrado por un punto, `nubeEnMedio` por debajo de
 * 150 m en el banco.
 */
export const NUBE_QUE_DEJA_VER = 150;

/** Lo que hace falta del mundo para mirar lo de debajo con la cámara. */
export interface ElMundoDelBanco {
  /** Adonde llega una recta, hasta el mar o el terreno, o `null` si no llega: cielo. */
  readonly llega: (ojo: Vector3, dir: Vector3) => PuntoDeLaVista | null;
  /** Si la recta pasa por el cristal; lo que no, es la pared, y no es de la vista. */
  readonly porElCristal: (ojo: Vector3, dir: Vector3, fin: PuntoDeLaVista | null) => boolean;
  /** Si la tapa el propio avión antes de llegar. */
  readonly tapaElAvion: (ojo: Vector3, dir: Vector3, lejos: number) => boolean;
  /** Si lo que hay donde llega es lo que se dice: el mar para el mar, la tierra para la tierra. */
  readonly esLoDicho: (q: PuntoDeLaVista) => boolean;
  /** Los metros de nube densa que cruza la recta, con lo que se pinta. */
  readonly nubeDensa: (ojo: Vector3, dir: Vector3, lejos: number) => number;
}

/**
 * **Cuánto de la vista por el cristal es lo de debajo que se dice**, de 0 a 1,
 * o `null` si ninguna recta pasa por el cristal. Cada recta cuenta si llega a
 * lo que se dice —el mar o la tierra— sin dar en el avión y sin nube densa por
 * medio; la que va al cielo o da en la góndola, como mirada que no lo ve; y la
 * que no pasa por el cristal no es de la vista, que es la pared.
 */
export function loDeDebajoEnLaVista(camara: Camera, cx: number, cy: number, mundo: ElMundoDelBanco): number | null {
  const ojo = new Vector3().setFromMatrixPosition(camara.matrixWorld);
  let vistas = 0;
  let rectas = 0;
  for (const dir of rectasDeLaVista(camara, cx, cy)) {
    const fin = mundo.llega(ojo, dir);
    if (!mundo.porElCristal(ojo, dir, fin)) continue;
    rectas++;
    if (!fin) continue;
    const lejos = Math.hypot(fin.x - ojo.x, fin.y - ojo.y, fin.z - ojo.z);
    if (mundo.tapaElAvion(ojo, dir, lejos)) continue;
    if (!mundo.esLoDicho(fin)) continue;
    if (mundo.nubeDensa(ojo, dir, lejos) >= NUBE_QUE_DEJA_VER) continue;
    vistas++;
  }
  return rectas ? vistas / rectas : null;
}
