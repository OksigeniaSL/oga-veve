/**
 * Las patas que se meten, en el modelo.
 *
 * Es la mitad visible del tren: la otra es la resistencia que quita meterlo
 * —ver `flight/tren.ts`— y esa se siente pero no se ve. Ésta se ve, y hace
 * falta por lo mismo que se ve el humo del motor o giran las hélices: un mando
 * que no cambia nada en la pantalla no parece un mando, parece un ajuste.
 *
 * ## Se suben, no se apagan
 *
 * Esconderlas de golpe sería barato y quedaría mal: un tren tarda diez segundos
 * en entrar y lo que cuenta la escena es justo ese rato. Así que suben a su
 * hueco y se apagan **al final del camino**, cuando ya están dentro y nadie las
 * echa de menos — que es, además, cuando el avión empieza a correr más.
 *
 * ## Y no hace falta un hueco modelado
 *
 * No hay pozo de tren en estos aviones, y no se nota: la pata sube por dentro
 * del fuselaje, que es opaco. Modelar el pozo sería trabajo para una cosa que
 * solo se ve desde debajo del avión y con el tren a medias.
 */

import type { Object3D } from "three";

/**
 * Cómo se llaman las piezas del tren en los modelos.
 *
 * Las hace `comun.py` y las nombra siempre igual: `pata-…` lo que aguanta y
 * `rueda-…` lo que rueda. Está aquí y no repartido porque es un contrato entre
 * dos lenguajes y esos son los que se rompen sin avisar.
 */
export const SE_LLAMAN = /^(pata|rueda)/;

/** Una pata guardada: dónde estaba y cuánto tiene que subir. */
interface Pata {
  readonly pieza: Object3D;
  readonly abajo: number;
  readonly recorrido: number;
}

export interface Patas {
  /** Cuántas piezas se mueven. Cero si este modelo no trae tren con nombre. */
  readonly cuantas: number;
  /** Las pone donde toca. `donde` es 0 dentro y 1 fuera. Ver `tren.ts`. */
  poner(donde: number): void;
}

/**
 * Prepara las patas de un modelo para poder meterlas.
 *
 * Devuelve `null` si el modelo no trae ninguna con ese nombre, que es lo que
 * pasa con el respaldo de cajas: un avión sin patas nombradas vuela igual, solo
 * que con el tren siempre puesto. La regla de la casa — que falte un recurso no
 * deje a nadie sin volar.
 */
export function prepararPatas(raiz: Object3D): Patas | null {
  const patas: Pata[] = [];
  raiz.traverse((o) => {
    if (!SE_LLAMAN.test(o.name)) return;
    /*
     * Lo que sube cada pieza es **su propia altura más un poco**, medida del
     * modelo y no escrita a mano: una pata de morro de un 747 mide dos metros
     * y medio y la de una avioneta medio metro, y un número fijo dejaría a una
     * colgando fuera y a la otra atravesando el techo de la cabina.
     */
    const alto = alturaDe(o);
    patas.push({
      pieza: o,
      abajo: o.position.y,
      recorrido: alto * 1.15,
    });
  });
  if (!patas.length) return null;
  return {
    cuantas: patas.length,
    poner(donde: number) {
      const fuera = Math.max(0, Math.min(1, donde));
      for (const p of patas) {
        p.pieza.position.y = p.abajo + (1 - fuera) * p.recorrido;
        // Dentro del todo no se dibuja: ya está en el pozo y solo costaría
        // triángulos. Y en cuanto asoma, vuelve.
        p.pieza.visible = fuera > 0;
      }
    },
  };
}

/** Lo que mide de alto una pieza, en su propio sistema. */
function alturaDe(o: Object3D): number {
  const g = (
    o as {
      geometry?: {
        boundingBox?: unknown;
        computeBoundingBox?: () => void;
        attributes?: {
          position?: { getY: (i: number) => number; count: number };
        };
      };
    }
  ).geometry;
  const pos = g?.attributes?.position;
  if (!pos) return 1;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < min) min = y;
    if (y > max) max = y;
  }
  return Number.isFinite(max - min) ? Math.max(0.2, max - min) : 1;
}
