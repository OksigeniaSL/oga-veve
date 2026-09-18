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

import { Box3, Vector3, type Object3D } from "three";

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
  const piezas: Object3D[] = [];
  raiz.traverse((o) => {
    if (SE_LLAMAN.test(o.name)) piezas.push(o);
  });
  if (!piezas.length) return null;
  /*
   * **Lo que sube es el tren entero, y sube lo mismo.**
   *
   * Cada pieza subía **su propia altura**, y eso parecía razonable hasta que
   * se miró el modelo: la rueda no cuelga de la pata, es **su hermana**. Así
   * que la pata subía su metro veinte y la rueda su medio metro, y lo que se
   * veía era un tren descuartizado a medio camino y, al final del recorrido,
   * media rueda todavía al aire. Dicho jugando: «si pulsé la G para meter el
   * tren, ¿por qué sigo viéndolo?».
   *
   * Un tren de aterrizaje se recoge de una pieza. Se mide **el conjunto** —lo
   * más alto que hay entre todas— y todas suben eso, que además es lo único
   * que garantiza que la última en entrar entre del todo.
   */
  const alto = alturaDeTodas(piezas);
  const patas: Pata[] = piezas.map((pieza) => ({
    pieza,
    abajo: pieza.position.y,
    recorrido: alto * 1.15,
  }));
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

/**
 * Lo que mide de alto una pieza, **con lo que lleva colgando**.
 *
 * Se medía solo la geometría propia del nodo, y en estos modelos una pata
 * **no tiene geometría propia**: es un grupo con la caña y la rueda dentro.
 * Así que la cuenta se caía al valor por defecto —un metro— y todas las patas
 * de la flota subían lo mismo: uno con quince, fuera del 747 y de la avioneta.
 *
 * Lo que se veía es esto, dicho jugando: «si pulsé la G para meter el tren,
 * ¿por qué sigo viéndolo?». La pata del morro de un reactor mide dos metros y
 * medio y subía uno: se quedaba metro y medio al aire, a plena vista, con las
 * luces del panel diciendo que estaba entrando. Y no fallaba nada por ningún
 * sitio: el mando bajaba de 1 a 0, la pieza se movía, el indicador avisaba.
 * Solo que se movía **la mitad de poco**.
 *
 * `Box3.setFromObject` mira el nodo y todo lo que cuelga de él, que es lo que
 * «su propia altura» quería decir desde el principio.
 *
 * **Y se devuelve en las unidades del padre**, que son en las que vive
 * `position.y`. La caja sale en coordenadas del mundo y estos modelos van
 * escalados —cada avión se normaliza por su envergadura—, así que medir en uno
 * y mover en el otro es el mismo error otra vez, solo que con un factor en vez
 * de con un valor por defecto.
 */
function alturaDeTodas(piezas: readonly Object3D[]): number {
  const caja = new Box3();
  for (const o of piezas) {
    o.updateWorldMatrix(true, true);
    caja.union(new Box3().setFromObject(o));
  }
  const alto = caja.max.y - caja.min.y;
  if (!Number.isFinite(alto)) return 1;
  /*
   * Y en las unidades del padre, que son en las que vive `position.y`: la caja
   * sale en coordenadas del mundo y estos modelos van escalados. Medir en uno
   * y mover en el otro es el mismo error con otro disfraz.
   */
  const escala = piezas[0]?.parent
    ? Math.abs(piezas[0]!.parent!.getWorldScale(new Vector3()).y) || 1
    : 1;
  return Math.max(0.2, alto / escala);
}
