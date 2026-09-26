/**
 * Dónde empieza a verse el suelo por delante del avión.
 *
 * Todo avión tiene un ángulo muerto delante del morro: un trozo de calle que
 * desde la cabina no se ve, porque lo tapan la visera y el propio morro. En
 * una avioneta son unos pocos metros; en un reactor de fuselaje ancho, con los
 * ojos a seis metros del suelo, es media plataforma. Por eso el coche del
 * «sígame» de verdad **no va a una distancia fija**: va donde el piloto de
 * *ese* avión lo ve por encima del morro, y el conductor lo sabe según qué
 * avión le toque guiar.
 *
 * Aquí se mide eso, y se mide **en la malla que se dibuja**, no en una tabla:
 * el ángulo por encima del morro sale de la cabina que se ve desde el asiento,
 * y el lomo del avión —lo que tapa desde la cámara de detrás— sale del casco.
 * Si mañana cambia un modelo, cambia la medida sola.
 *
 * Y aquí se pasan las dos medidas a metros de calle; qué hacer con ellos lo
 * decide el coche, en `adelantoDelSigueme`, y la cámara de detrás usa **ese
 * mismo número** para saber hasta dónde mirar rodando. Si cada uno se hiciera
 * su cuenta acabarían en números distintos, y el coche quedaría fuera de donde
 * mira la cámara. Ver `world/sigueme.ts` y `cameras/fuera.ts`.
 */

import {
  BackSide,
  Box3,
  DoubleSide,
  Matrix4,
  Vector3,
  type BufferGeometry,
  type Material,
  type Mesh,
  type Object3D,
} from "three";

/**
 * Lo más alto del avión en su plano de simetría, a lo largo.
 *
 * Una altura cada `paso` metros, empezando en la z `desde`. `-Infinity` donde
 * ese plano no corta al avión. En coordenadas de la aeronave: el origen es el
 * del modelo de vuelo, la y arriba y el morro hacia la z negativa.
 */
export interface Lomo {
  readonly desde: number;
  readonly paso: number;
  readonly alto: readonly number[];
}

/** Lo que se sabe de lo que se ve por delante de un avión. */
export interface VistaAlFrente {
  /**
   * Cuánto cae bajo la horizontal la mirada más baja que libra el avión,
   * mirando al frente desde el ojo del piloto, rad.
   *
   * `Infinity` si no hay nada delante del ojo: las cajas de respaldo, que
   * ponen la cámara por delante del morro.
   */
  readonly porEncimaDelMorro: number;
  /** El perfil de arriba del avión, para quien lo mira desde detrás. */
  readonly lomo: Lomo;
}

/** Cada cuánto se anota el lomo, m. Medio metro es menos que un parabrisas. */
const PASO_DEL_LOMO = 0.5;

/**
 * Lo más cerca del ojo que cuenta, m.
 *
 * Lo que está a menos de dos centímetros por delante de los ojos es la propia
 * cabeza cortando el plano; nada que tape el mundo.
 */
const DELANTE_MINIMO = 0.02;

/**
 * Lo que no tapa aunque esté: una hélice girando se ve como un disco
 * translúcido, y a través de ella se mira. Ver `discoDeHelice`.
 */
const NO_TAPA = /pala|blade|disco-de-helice/i;

/**
 * Mide lo que se ve por delante de un avión ya montado.
 *
 * `grupo` es la aeronave entera en sus coordenadas —el origen del modelo de
 * vuelo, el suelo a menos la altura del tren— y `ojo`, dónde tiene los ojos el
 * piloto en esas mismas coordenadas.
 *
 * **Desde el ojo cuenta lo que se dibuja, no lo que hay.** Los modelos llevan
 * el casco y el cristal con la cara de atrás quitada —desde dentro desaparecen,
 * que es lo que deja mirar por el parabrisas— y aquí se hace la misma cuenta
 * que la tarjeta: una cara tapa si el material la pinta vista desde donde está
 * el ojo. Así lo que se mide es lo que ve quien juega, que es la visera y el
 * panel por abajo y el mundo por encima.
 *
 * Una sola pasada por los triángulos, cortándolos con dos planos verticales:
 * el que pasa por los ojos, para la cabina, y el de simetría, para el lomo. El
 * ángulo bajo el que se ve un segmento cambia siempre en el mismo sentido a lo
 * largo de él, así que sus dos puntas bastan: no hace falta lanzar rayos.
 */
export function medirVistaAlFrente(
  grupo: Object3D,
  ojo: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly encuadre?: { readonly visera: number };
  },
): VistaAlFrente {
  grupo.updateWorldMatrix(true, true);
  const caja = new Box3().setFromObject(grupo);
  const desde = Number.isFinite(caja.min.z) ? caja.min.z : 0;
  const hasta = Number.isFinite(caja.max.z) ? caja.max.z : 0;
  const alto: number[] = new Array(
    Math.max(1, Math.ceil((hasta - desde) / PASO_DEL_LOMO) + 1),
  ).fill(-Infinity);

  const aGrupo = new Matrix4().copy(grupo.matrixWorld).invert();
  const matriz = new Matrix4();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const lado1 = new Vector3();
  const lado2 = new Vector3();
  const normal = new Vector3();
  const alOjo = new Vector3();
  const ojoV = new Vector3(ojo.x, ojo.y, ojo.z);
  const cortes: Vector3[] = [new Vector3(), new Vector3(), new Vector3()];

  /** Los tramos de ángulo bajo la horizontal que tapa cada cara, de dos en dos. */
  const tapado: number[] = [];

  grupo.traverse((o) => {
    const malla = o as Mesh;
    if (!malla.isMesh || !seVe(malla, grupo)) return;
    const geometria = malla.geometry as BufferGeometry | undefined;
    const pos = geometria?.getAttribute("position");
    if (!geometria || !pos) return;
    const tapa = !NO_TAPA.test(malla.name);
    matriz.multiplyMatrices(aGrupo, malla.matrixWorld);
    const indice = geometria.getIndex();
    const cuantos = indice ? indice.count : pos.count;

    for (let t = 0; t + 2 < cuantos; t += 3) {
      const ia = indice ? indice.getX(t) : t;
      const ib = indice ? indice.getX(t + 1) : t + 1;
      const ic = indice ? indice.getX(t + 2) : t + 2;
      a.fromBufferAttribute(pos, ia).applyMatrix4(matriz);
      b.fromBufferAttribute(pos, ib).applyMatrix4(matriz);
      c.fromBufferAttribute(pos, ic).applyMatrix4(matriz);

      // El lomo: todo lo que tiene el avión, se pinte por donde se pinte.
      // Desde fuera un avión es macizo.
      const n0 = cortarConPlano(a, b, c, 0, cortes);
      for (let i = 0; i < n0; i++) anotarLomo(cortes[i]!, alto, desde);
      if (n0 === 2) anotarTramo(cortes[0]!, cortes[1]!, alto, desde);

      // La cabina: solo lo que se ve desde el ojo.
      if (!tapa) continue;
      const n1 = cortarConPlano(a, b, c, ojo.x, cortes);
      if (n1 === 0) continue;
      const material = materialDe(malla, t, geometria);
      if (!material || material.visible === false) continue;
      if (material.side !== DoubleSide) {
        normal.crossVectors(lado1.subVectors(b, a), lado2.subVectors(c, a));
        const deFrente = normal.dot(alOjo.subVectors(ojoV, a)) > 0;
        if (deFrente === (material.side === BackSide)) continue;
      }
      let menor = Infinity;
      let mayor = -Infinity;
      for (let i = 0; i < n1; i++) {
        const p = cortes[i]!;
        const delante = ojo.z - p.z;
        if (delante < DELANTE_MINIMO) continue;
        const cae = Math.atan2(ojo.y - p.y, delante);
        menor = Math.min(menor, cae);
        mayor = Math.max(mayor, cae);
      }
      // Todo por encima de los ojos —el techo, el marco de arriba— no tapa
      // nada de lo que hay en el suelo.
      if (mayor < 0) continue;
      tapado.push(Math.max(0, menor), mayor);
    }
  });

  return {
    porEncimaDelMorro: bordeDelAnguloMuerto(tapado, ojo.encuadre?.visera),
    lomo: { desde, paso: PASO_DEL_LOMO, alto },
  };
}

/**
 * A cuánto por delante del avión se ve entera una cosa apoyada en la calle.
 *
 * Son distancias **por delante del origen del avión** —el punto por el que lo
 * sigue el plan de rodaje— a las que algo de `medio` metros de medio largo se
 * ve entero y con `margen` radianes de aire entre él y lo que lo tapaba:
 *
 * - `cabina`: desde el ojo del piloto, por encima del morro. Es el ángulo
 *   muerto de ese avión, el de verdad.
 * - `desdeLosOjos`: lo mismo contado desde los ojos, que es lo que dice si
 *   está a una distancia a la que un coche todavía se distingue.
 * - `cola`: desde la cámara de detrás, por encima del lomo. Es la de este
 *   juego, que se juega sobre todo desde ahí: un coche que el piloto vería
 *   pero que el fuselaje le tapa a quien juega es, para quien juega, un coche
 *   que no está.
 *
 * Cero donde no hay nada que tape —las cajas de respaldo ponen el ojo delante
 * del morro—, e `Infinity` donde el avión tapa hasta el horizonte.
 *
 * `tren` es a cuánto del suelo está el origen del avión, y `cola`, dónde va la
 * cámara de detrás en coordenadas del avión; ver `sitioDeLaCola`.
 */
export function distanciaALaVista(
  a: {
    readonly ojo: { readonly y: number; readonly z: number } | null | undefined;
    readonly vista: VistaAlFrente | null | undefined;
    readonly tren: number;
    readonly cola: { readonly y: number; readonly z: number };
  },
  medio: number,
  margen: number,
): { cabina: number; desdeLosOjos: number; cola: number } {
  const fuera = { cabina: 0, desdeLosOjos: 0, cola: 0 };
  const vista = a.vista;
  if (!vista) return fuera;

  // Desde la cabina: el suelo aparece a `h / tan(ángulo)` de los ojos.
  const ojo = a.ojo;
  if (ojo && Number.isFinite(vista.porEncimaDelMorro)) {
    const bajo = vista.porEncimaDelMorro - margen;
    fuera.desdeLosOjos =
      bajo > 0 ? (ojo.y + a.tren) / Math.tan(bajo) + medio : Infinity;
    fuera.cabina = fuera.desdeLosOjos - ojo.z;
  }

  // Desde detrás: la mirada más baja que pasa por encima del lomo.
  const { desde, paso, alto } = vista.lomo;
  let pendiente = Infinity;
  for (let i = 0; i < alto.length; i++) {
    const y = alto[i]!;
    if (!Number.isFinite(y)) continue;
    const z = desde + i * paso;
    const atras = a.cola.z - z;
    if (atras <= 0) continue;
    pendiente = Math.min(pendiente, (a.cola.y - y) / atras);
  }
  if (Number.isFinite(pendiente)) {
    const bajo = Math.atan(pendiente) - margen;
    fuera.cola =
      bajo > 0 ? (a.cola.y + a.tren) / Math.tan(bajo) - a.cola.z + medio : Infinity;
  }
  return fuera;
}

/**
 * Dónde acaba el ángulo muerto, rad bajo la horizontal.
 *
 * **No es lo primero que tapa, es donde acaba lo que tapa sin huecos.** Lo
 * primero que se escribió aquí era el ángulo más alto de todo lo que tapaba, y
 * en el biplano eso era un canto del buje de la hélice: una raya de nada a la
 * altura de los ojos, con el suelo asomando por debajo entre el buje y la
 * visera. El `Raycaster` lo vio: por debajo de esa raya, los rayos llegaban
 * al suelo. Un borde suelto no es un ángulo muerto; es una raya en el cristal.
 *
 * El ángulo muerto es **la visera y lo que se le pega por encima**: la visera
 * es la raya que separa el mundo del panel —la misma con la que encuadra la
 * cámara de cabina—, y desde ella se va subiendo mientras los tramos se
 * toquen, que es lo que hace un capó alto. Donde aparece el primer hueco,
 * ahí empieza a verse el suelo.
 *
 * Sin visera —un modelo de fuera, las cajas—, se parte de lo que tapa más
 * abajo, que es el suelo de la cabina o el panel.
 */
function bordeDelAnguloMuerto(
  tapado: readonly number[],
  visera: number | undefined,
): number {
  const tramos: [number, number][] = [];
  for (let i = 0; i + 1 < tapado.length; i += 2)
    tramos.push([tapado[i]!, tapado[i + 1]!]);
  if (!tramos.length) return visera ?? Infinity;
  // De lo más empinado hacia la horizontal.
  tramos.sort((p, q) => q[1] - p[1]);
  let borde = visera ?? tramos[0]![0];
  for (const [bajo, alto] of tramos) {
    if (alto < borde - SE_TOCAN) break;
    borde = Math.min(borde, bajo);
  }
  return borde;
}

/**
 * Cuánto hueco entre dos tramos se da por cerrado, rad: una centésima de
 * grado. Dos caras que comparten un canto lo comparten con el error de coma
 * flotante de su matriz, y ese hueco no deja ver nada.
 */
const SE_TOCAN = (0.01 * Math.PI) / 180;

/** Si la malla se dibuja: ella y todos sus padres hasta el avión. */
function seVe(o: Object3D, hasta: Object3D): boolean {
  for (let p: Object3D | null = o; p && p !== hasta; p = p.parent)
    if (!p.visible) return false;
  return true;
}

/** El material del triángulo `t`, que en una malla con grupos depende de él. */
function materialDe(
  malla: Mesh,
  t: number,
  geometria: BufferGeometry,
): Material | undefined {
  const m = malla.material;
  if (!Array.isArray(m)) return m;
  for (const g of geometria.groups)
    if (t >= g.start && t < g.start + g.count) return m[g.materialIndex ?? 0];
  return m[0];
}

/**
 * Los puntos en los que el triángulo corta el plano vertical `x = x0`.
 *
 * Devuelve cuántos ha escrito en `fuera`: cero si no lo toca, dos si lo cruza
 * y hasta tres si el triángulo está entero en el plano, que en un casco
 * simétrico pasa con las caras del lomo.
 */
function cortarConPlano(
  a: Vector3,
  b: Vector3,
  c: Vector3,
  x0: number,
  fuera: Vector3[],
): number {
  let n = 0;
  const lados: [Vector3, Vector3][] = [
    [a, b],
    [b, c],
    [c, a],
  ];
  for (const [u, v] of lados) {
    const du = u.x - x0;
    const dv = v.x - x0;
    if (du === 0) {
      if (n < 3) fuera[n++]!.copy(u);
    } else if (du * dv < 0) {
      if (n < 3) fuera[n++]!.lerpVectors(u, v, du / (du - dv));
    }
  }
  return n;
}

function anotarLomo(p: Vector3, alto: number[], desde: number): void {
  const i = Math.round((p.z - desde) / PASO_DEL_LOMO);
  if (i < 0 || i >= alto.length) return;
  if (p.y > alto[i]!) alto[i] = p.y;
}

/**
 * Y lo de en medio del segmento, que en un casco de pocas caras puede medir
 * metros: con solo las puntas, el lomo tendría huecos justo donde es más
 * liso.
 */
function anotarTramo(
  p: Vector3,
  q: Vector3,
  alto: number[],
  desde: number,
): void {
  const dz = q.z - p.z;
  if (Math.abs(dz) < PASO_DEL_LOMO) return;
  const i0 = Math.ceil((Math.min(p.z, q.z) - desde) / PASO_DEL_LOMO);
  const i1 = Math.floor((Math.max(p.z, q.z) - desde) / PASO_DEL_LOMO);
  for (let i = Math.max(0, i0); i <= Math.min(alto.length - 1, i1); i++) {
    const z = desde + i * PASO_DEL_LOMO;
    const y = p.y + ((q.y - p.y) * (z - p.z)) / dz;
    if (y > alto[i]!) alto[i] = y;
  }
}
