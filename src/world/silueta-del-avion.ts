/**
 * **Por dónde cae el avión en la pantalla**, para no taparlo.
 *
 * En la escena de pasaje lo que se explica sale en grande —ver
 * `dondeCabeLaLamina` en `ui/ventana-de-historia.ts`—, y en las tomas de
 * fuera lo que se está enseñando es el avión: el ala con sus flaps, el tren
 * bajando, el giro. Una lámina encima del ala mientras se cuenta cómo se
 * sostiene el ala enseña lo contrario de lo que se cuenta.
 *
 * ## Cajitas, no la caja entera
 *
 * La caja del avión entero no sirve: con el ala en flecha, su caja lleva un
 * triángulo vacío delante de la punta y otro detrás de la raíz, y desde la
 * toma del ala esos dos triángulos son media pantalla de nubes. Así que cada
 * pieza del modelo se corta en **rodajas** a lo largo de su lado más largo
 * —el ala, de la raíz a la punta; el fuselaje, del morro a la cola— y cada
 * rodaja lleva su caja: juntas siguen la flecha del ala y el afinarse del
 * morro, y proyectadas son unos polígonos que tapan lo que tapa el avión y
 * poco más. Las piezas que cruzan de un lado a otro —el ala de una pieza, la
 * malla de los dos motores— se parten antes por la mitad.
 *
 * Se mide una vez por modelo, con los vértices de verdad, y lo que cuesta
 * después es proyectar ocho esquinas por cajita: unas doscientas cajitas,
 * menos de lo que cuesta pintar un fotograma.
 *
 * Todo en los ejes del grupo del avión —`x` a la derecha, `y` arriba, `z`
 * hacia la cola—, que son los de `asiento-de-pasaje.ts`.
 */

import { Matrix4, Vector3, Vector4, type Camera, type Object3D } from "three";
import { ES_ALA, ES_MOTOR } from "./asiento-de-ara";

/** Qué es una cajita: lo que se mira desde la ventanilla son el motor y el ala. */
export type ParteDelAvion = "motor" | "ala" | "resto";

/** Una rodaja de una pieza del avión, en sus ejes, m. */
export interface Cajita {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
  readonly parte: ParteDelAvion;
  /** De qué lado del avión: desde la ventanilla de Ara, el ala de enfrente no se ve. */
  readonly lado: "izquierda" | "derecha";
}

/** Lo que mide una rodaja como mucho a lo largo de su pieza, m. */
const RODAJA = 2;
/** Las piezas más pequeñas que esto, m, no cuentan: tornillos, luces, rótulos. */
const PIEZA_MINIMA = 0.4;

/**
 * **Las cajitas del avión**: cada pieza de fuera, partida por la mitad si
 * cruza de un lado a otro y en rodajas de `RODAJA` a lo largo de su lado más
 * largo. Una rodaja sin vértices —el ala de pocas costillas tiene vértices en
 * la raíz y en la punta y nada entre medias— toma lo que hay entre sus
 * vecinas, en línea recta, que es como va un borde de ataque en flecha.
 */
export function cajitasDelAvion(mallas: readonly Object3D[], grupo: Object3D): Cajita[] {
  grupo.updateWorldMatrix(true, true);
  const aGrupo = new Matrix4().copy(grupo.matrixWorld).invert();
  const m = new Matrix4();
  const v = new Vector3();
  const salida: Cajita[] = [];
  for (const malla of mallas) {
    const posiciones = (malla as { geometry?: { attributes?: { position?: { count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number } } } }).geometry?.attributes?.position;
    if (!posiciones || posiciones.count < 3) continue;
    m.multiplyMatrices(aGrupo, malla.matrixWorld);
    const parte: ParteDelAvion = ES_MOTOR.test(malla.name) ? "motor" : ES_ALA.test(malla.name) ? "ala" : "resto";
    const lados: number[][] = [[], []];
    for (let i = 0; i < posiciones.count; i++) {
      v.set(posiciones.getX(i), posiciones.getY(i), posiciones.getZ(i)).applyMatrix4(m);
      lados[v.x < 0 ? 0 : 1]!.push(v.x, v.y, v.z);
    }
    lados.forEach((puntos, i) => {
      if (puntos.length >= 9) salida.push(...enRodajas(puntos, parte, i === 0 ? "izquierda" : "derecha"));
    });
  }
  return salida;
}

/** Una nube de puntos —x, y, z seguidos— en rodajas a lo largo de su lado más largo. */
export function enRodajas(
  puntos: readonly number[],
  parte: ParteDelAvion,
  lado: "izquierda" | "derecha" = "izquierda",
): Cajita[] {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < puntos.length; i += 3)
    for (let k = 0; k < 3; k++) {
      const c = puntos[i + k]!;
      if (c < min[k]!) min[k] = c;
      if (c > max[k]!) max[k] = c;
    }
  const largo = [0, 1, 2].map((k) => max[k]! - min[k]!);
  if (Math.max(...largo) < PIEZA_MINIMA) return [];
  const eje = largo.indexOf(Math.max(...largo));
  const n = Math.max(1, Math.min(16, Math.ceil(largo[eje]! / RODAJA)));
  const paso = largo[eje]! / n;
  const rodajas: ({ min: number[]; max: number[] } | null)[] = Array.from({ length: n }, () => null);
  for (let i = 0; i < puntos.length; i += 3) {
    const j = Math.min(n - 1, Math.floor((puntos[i + eje]! - min[eje]!) / paso));
    const r = (rodajas[j] ??= { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
    for (let k = 0; k < 3; k++) {
      const c = puntos[i + k]!;
      if (c < r.min[k]!) r.min[k] = c;
      if (c > r.max[k]!) r.max[k] = c;
    }
  }
  // Las rodajas vacías, entre sus vecinas llenas, en línea recta.
  const llenas = rodajas.map((r, j) => (r ? j : -1)).filter((j) => j >= 0);
  const salida: Cajita[] = [];
  for (let j = 0; j < n; j++) {
    let r = rodajas[j];
    if (!r) {
      const antes = llenas.filter((k) => k < j).pop();
      const despues = llenas.find((k) => k > j);
      const a = rodajas[antes ?? despues!]!;
      const b = rodajas[despues ?? antes!]!;
      const f = antes !== undefined && despues !== undefined ? (j - antes) / (despues - antes) : 0;
      r = {
        min: a.min.map((c, k) => c + (b.min[k]! - c) * f),
        max: a.max.map((c, k) => c + (b.max[k]! - c) * f),
      };
    }
    // A lo largo, la rodaja entera: que no queden rendijas entre una y otra.
    const lo = [...r.min];
    const hi = [...r.max];
    lo[eje] = min[eje]! + j * paso;
    hi[eje] = min[eje]! + (j + 1) * paso;
    salida.push({ min: [lo[0]!, lo[1]!, lo[2]!], max: [hi[0]!, hi[1]!, hi[2]!], parte, lado });
  }
  return salida;
}

/** Las doce aristas de una caja, por los índices de sus esquinas. */
const ARISTAS = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
] as const;

/** Lo poco que tiene que quedar delante de la cámara para proyectarse, en `w` del recorte. */
const DELANTE = 0.05;

/**
 * **Las cajitas en la pantalla**: un polígono convexo por cajita, en píxeles
 * de pantalla —x0, y0, x1, y1…—. Lo que queda detrás de la cámara se recorta
 * contra un plano justo delante de ella, arista por arista: con la cámara
 * encima del fuselaje, la cola queda a la espalda y el morro delante, y una
 * esquina de detrás proyectada sin recortar caería en cualquier sitio.
 */
export function siluetaEnPantalla(
  cajitas: readonly Cajita[],
  delAvion: Matrix4,
  camara: Camera,
  pantalla: { readonly ancho: number; readonly alto: number },
  cuales: (c: Cajita) => boolean = () => true,
): number[][] {
  camara.updateMatrixWorld();
  const total = new Matrix4().multiplyMatrices(camara.projectionMatrix, camara.matrixWorldInverse).multiply(delAvion);
  const esquinas = Array.from({ length: 8 }, () => new Vector4());
  const poligonos: number[][] = [];
  const W = pantalla.ancho;
  const H = pantalla.alto;
  for (const c of cajitas) {
    if (!cuales(c)) continue;
    for (let i = 0; i < 8; i++)
      esquinas[i]!.set(i & 1 ? c.max[0] : c.min[0], i & 2 ? c.max[1] : c.min[1], i & 4 ? c.max[2] : c.min[2], 1).applyMatrix4(total);
    const enPantalla: number[] = [];
    const poner = (x: number, y: number, w: number): void => {
      enPantalla.push(((x / w + 1) / 2) * W, ((1 - y / w) / 2) * H);
    };
    for (const e of esquinas) if (e.w > DELANTE) poner(e.x, e.y, e.w);
    if (enPantalla.length === 0) continue;
    if (enPantalla.length < 16)
      for (const [a, b] of ARISTAS) {
        const p = esquinas[a]!;
        const q = esquinas[b]!;
        if (p.w > DELANTE === q.w > DELANTE) continue;
        const f = (DELANTE - p.w) / (q.w - p.w);
        poner(p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f, DELANTE);
      }
    poligonos.push(envolvente(enPantalla));
  }
  return poligonos;
}

/** La envolvente convexa de unos puntos —x0, y0, x1, y1…—, en el mismo formato. */
export function envolvente(p: readonly number[]): number[] {
  const puntos: [number, number][] = [];
  for (let i = 0; i < p.length; i += 2) puntos.push([p[i]!, p[i + 1]!]);
  puntos.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (puntos.length < 3) return puntos.flat();
  const giro = (o: [number, number], a: [number, number], b: [number, number]): number =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const abajo: [number, number][] = [];
  for (const q of puntos) {
    while (abajo.length >= 2 && giro(abajo[abajo.length - 2]!, abajo[abajo.length - 1]!, q) <= 0) abajo.pop();
    abajo.push(q);
  }
  const arriba: [number, number][] = [];
  for (let i = puntos.length - 1; i >= 0; i--) {
    const q = puntos[i]!;
    while (arriba.length >= 2 && giro(arriba[arriba.length - 2]!, arriba[arriba.length - 1]!, q) <= 0) arriba.pop();
    arriba.push(q);
  }
  abajo.pop();
  arriba.pop();
  return [...abajo, ...arriba].flat();
}
