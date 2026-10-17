/**
 * **Dos aviones no se meten de frente en el mismo tramo de calle.**
 *
 * Volviendo al puesto en Los Rodeos con el JAZ 120, de noche y con el coche
 * del sígame delante, por la paralela venía de frente un turbohélice camino
 * de la pista, por la misma raya verde: «Ops», y unos segundos después el
 * otro asomando por dentro del avión, «Accidente». Lo que había era una regla
 * de cerca —quien rueda se para si avanzar le acerca a menos de la separación
 * de ala— y nada más: los dos se metían en la calle, se paraban mirándose a
 * sesenta metros y el coche, que va setenta por delante, se quedaba dentro del
 * otro. Medio minuto después el otro se esfumaba, que es la red de los
 * atascos y no un aeropuerto.
 *
 * En un aeropuerto de verdad eso no pasa porque no se deja que empiece. El
 * control de tierra separa a los que ruedan con órdenes —«hold short of…»,
 * «give way to…», «follow…»— o mandándolos por calles distintas, y no deja a
 * dos de frente en el mismo tramo (OACI, Doc 4444, cap. 7, el control del
 * movimiento en la superficie; la fraseología, en el cap. 12 —el párrafo
 * exacto, por verificar—). Y donde se guía con las luces de eje —el «follow
 * the greens» del SMGCS, Doc 9476 y Anexo 14, por verificar el apartado—, solo
 * se enciende por delante de cada avión el camino que está libre, y una barra
 * roja corta donde hay que esperar.
 *
 * Así que esto contesta una sola pregunta, entre dos caminos por delante:
 * **dónde se mete el primero en un tramo que el segundo va a recorrer en
 * sentido contrario**, y si ya está metido. Con eso, quien no ha entrado
 * espera fuera —a la separación de ala del otro camino— y quien ya está dentro
 * pasa. Quién tiene el tramo lo decide quien reparte, no esto: ver
 * `repartirLosTramos` en `trafico.ts` y `paradaPorElTramo` en
 * `plan-de-vuelo.ts`.
 *
 * Los cruces no son esto: dos calles que se cruzan se pasan de uno en uno en
 * unos segundos, y para eso está ceder el paso de cerca (`cedeA`). Lo que no
 * se arregla de cerca es el frente a frente, porque ninguno de los dos puede
 * dar marcha atrás.
 */

import type { EnElPlano } from "./suelo-del-trafico";

/**
 * **Cada cuánto se mira un camino por delante**, m: menos que media
 * envergadura del más pequeño del tráfico, así que entre dos muestras no cabe
 * un avión sin que una lo vea.
 */
export const PASO_DEL_TRAMO = 4;

/**
 * **A partir de qué ángulo entre los dos rumbos van de frente**: más de
 * ciento veinte grados. Por debajo es una calle que se abre o un cruce en
 * ángulo, y eso se pasa de uno en uno sin quedarse nadie encerrado.
 */
const DE_FRENTE = Math.cos((120 * Math.PI) / 180);

/**
 * **Uno que tiene una calle de tu raya**: quién es, si va a despegar y su
 * camino por delante. Ver `tramosQueTienen` en `trafico.ts`.
 */
export interface QuienTieneElTramo {
  readonly matricula: string;
  readonly sale: boolean;
  readonly porDelante: readonly EnElPlano[];
  /**
   * Si no pasa: está dentro de tu calle de frente contigo y **recula** para
   * dejártela —ver `recula` en `trafico.ts`—. Mientras tanto se le espera,
   * pero no se le «da paso»: cuando se aparta, pasas tú.
   */
  readonly recula?: boolean;
}

/** Dónde se mete un camino en un tramo de frente con otro. */
export interface TramoDeFrente {
  /**
   * Metros del camino, contados desde su primer punto, hasta el primero que
   * queda a menos de la separación del otro camino en el trozo que acaba
   * yendo de frente: ahí empieza el tramo, y antes de ahí se espera.
   */
  readonly entra: number;
  /** Si el primer punto —donde está ahora quien lo recorre— ya cae dentro. */
  readonly dentro: boolean;
}

/**
 * **Dónde se mete `camino` en un tramo que `otro` recorre de frente.**
 *
 * Los dos son caminos por delante, con el primer punto donde está ahora quien
 * los recorre. Se mira cada punto de `camino`: si pasa a menos de
 * `separacion` de algún tramo de `otro` está **cerca**, y si además ese tramo
 * va en sentido contrario está **de frente**. El tramo de frente empieza en el
 * primer punto cerca del trozo seguido de puntos cerca que llega al primer
 * punto de frente: entrar en esa calle ya es meterse, aunque el frente a
 * frente empiece cien metros después. `null` si en ningún punto van de
 * frente.
 */
export function tramoDeFrente(
  camino: readonly EnElPlano[],
  otro: readonly EnElPlano[],
  separacion: number,
): TramoDeFrente | null {
  if (camino.length < 2 || otro.length < 2 || !(separacion > 0)) return null;
  const rejilla = enRejilla(otro, separacion);
  const s2 = separacion * separacion;
  let recorrido = 0;
  /** Dónde empieza el trozo de puntos cerca en el que se está, m; o `null`. */
  let desde: number | null = null;
  let desdeElPrimero = false;
  for (let k = 0; k < camino.length; k++) {
    if (k > 0) recorrido += distancia(camino[k - 1]!, camino[k]!);
    const p = camino[k]!;
    // Hacia dónde va aquí: al siguiente, o desde el anterior en el último.
    const a = k + 1 < camino.length ? p : camino[k - 1]!;
    const b = k + 1 < camino.length ? camino[k + 1]! : p;
    const l = distancia(a, b);
    const ux = l > 1e-6 ? (b.x - a.x) / l : 0;
    const uz = l > 1e-6 ? (b.z - a.z) / l : 0;
    let cerca = false;
    let deFrente = false;
    for (const j of rejilla.tramosCerca(p)) {
      const q0 = otro[j]!;
      const q1 = otro[j + 1]!;
      if (distancia2AlTramo(p, q0, q1) >= s2) continue;
      cerca = true;
      const lq = distancia(q0, q1);
      if (lq < 1e-6 || l < 1e-6) continue;
      const coseno = (ux * (q1.x - q0.x) + uz * (q1.z - q0.z)) / lq;
      if (coseno < DE_FRENTE) {
        deFrente = true;
        break;
      }
    }
    if (!cerca) {
      desde = null;
      continue;
    }
    if (desde === null) {
      desde = recorrido;
      desdeElPrimero = k === 0;
    }
    if (deFrente) return { entra: desde, dentro: desdeElPrimero };
  }
  return null;
}

/**
 * **Un camino por delante, en puntos cada `paso`**, de los `desde` metros de
 * `camino` a los `hasta`: el primero es donde está quien lo recorre. Es la
 * forma en que `tramoDeFrente` quiere los caminos.
 */
export function porDelanteDe(
  camino: readonly EnElPlano[],
  desde: number,
  hasta: number,
  paso = PASO_DEL_TRAMO,
): EnElPlano[] {
  const puntos: EnElPlano[] = [];
  if (camino.length === 0) return puntos;
  let total = 0;
  for (let i = 1; i < camino.length; i++) total += distancia(camino[i - 1]!, camino[i]!);
  const ini = Math.max(0, Math.min(desde, total));
  const fin = Math.max(ini, Math.min(hasta, total));
  let i = 1;
  let antes = 0;
  const en = (m: number): EnElPlano => {
    while (i < camino.length) {
      const a = camino[i - 1]!;
      const b = camino[i]!;
      const d = distancia(a, b);
      if (antes + d >= m || i === camino.length - 1) {
        const t = d > 0 ? Math.max(0, Math.min(1, (m - antes) / d)) : 0;
        return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      }
      antes += d;
      i++;
    }
    return camino[camino.length - 1]!;
  };
  for (let m = ini; m < fin; m += paso) puntos.push(en(m));
  // Y el final, que es donde se para.
  puntos.push(en(fin));
  return puntos;
}

/**
 * Los tramos de un camino repartidos en una rejilla de celdas del tamaño de la
 * separación: para un punto solo se miran las nueve celdas de alrededor, y no
 * el camino entero. Un camino de rodaje entero son cientos de tramos, y esto
 * se pregunta por cada avión que rueda.
 */
function enRejilla(
  linea: readonly EnElPlano[],
  celda: number,
): { tramosCerca(p: EnElPlano): Iterable<number> } {
  const celdas = new Map<string, number[]>();
  const clave = (cx: number, cz: number) => `${cx},${cz}`;
  for (let j = 0; j < linea.length - 1; j++) {
    const a = linea[j]!;
    const b = linea[j + 1]!;
    const x0 = Math.floor(Math.min(a.x, b.x) / celda);
    const x1 = Math.floor(Math.max(a.x, b.x) / celda);
    const z0 = Math.floor(Math.min(a.z, b.z) / celda);
    const z1 = Math.floor(Math.max(a.z, b.z) / celda);
    for (let cx = x0; cx <= x1; cx++)
      for (let cz = z0; cz <= z1; cz++) {
        const k = clave(cx, cz);
        const lista = celdas.get(k);
        if (lista) lista.push(j);
        else celdas.set(k, [j]);
      }
  }
  return {
    *tramosCerca(p: EnElPlano) {
      const cx = Math.floor(p.x / celda);
      const cz = Math.floor(p.z / celda);
      const vistos = new Set<number>();
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
          for (const j of celdas.get(clave(cx + dx, cz + dz)) ?? [])
            if (!vistos.has(j)) {
              vistos.add(j);
              yield j;
            }
    },
  };
}

function distancia(a: EnElPlano, b: EnElPlano): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

/** La distancia al cuadrado de un punto a un tramo. */
function distancia2AlTramo(p: EnElPlano, a: EnElPlano, b: EnElPlano): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2)) : 0;
  const x = a.x + dx * t - p.x;
  const z = a.z + dz * t - p.z;
  return x * x + z * z;
}
