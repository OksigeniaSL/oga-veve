/**
 * **El agua de tierra adentro, a su cota.**
 *
 * El agua de cada mundo es una lámina a una cota —el mar a dos metros, el
 * río Paraguay en Asunción a cincuenta y seis, el Paraná en Ciudad del Este a
 * ciento cinco— y eso deja fuera lo que está a otra: el lago Ypacaraí está a
 * sesenta y tres, siete por encima de la lámina de Asunción, y salía como foto
 * en llano; el embalse de Itaipú, a doscientos veinte, igual. Un niño que ha
 * ido a San Bernardino sabe que eso es agua.
 *
 * Así que cada lago es **su propia lámina**, a su cota, con su contorno de
 * OpenStreetMap, y el mismo material que el mar del juego: el reflejo del
 * cielo, la bruma y la curva de la Tierra. Lo saca `scripts/relieve-fino.mjs
 * --lagos` a `data/terrain/lagos.json`.
 *
 * ## Por qué no se pelea con el suelo
 *
 * El relieve mide la lámina del lago como suelo: debajo del agua hay tierra
 * **a la misma cota**, y dos superficies a la misma cota se turnan fila a
 * fila según el fondo de profundidad. Así que lo que cae dentro del contorno
 * se hunde `HUNDIDO_LAGO` metros al dibujarlo —como el mar del horizonte, ver
 * `buildFarMesh`—, y el agua no tiene con quién pelearse. La física no se
 * entera: pisa la cota de verdad, que es la del agua.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshLambertMaterial,
  ShaderMaterial,
  ShapeUtils,
  Vector2,
  type Material,
} from "three";
import type { AMetros } from "./parches-de-relieve";

/** Un lago, tal cual lo escribe el extractor. */
export interface Lago {
  readonly id: string;
  readonly nombre: string;
  /** La cota de su lámina, m. */
  readonly cota: number;
  /** De dónde sale el contorno: `osm relation/…`. */
  readonly de: string;
  /** Los contornos del agua, `[lat, lon]`, cerrados. */
  readonly exteriores: readonly (readonly (readonly [number, number])[])[];
  /** Las islas. */
  readonly interiores: readonly (readonly (readonly [number, number])[])[];
}

/** Cuánto se hunde el suelo bajo un lago al dibujarlo, m. */
export const HUNDIDO_LAGO = 15;

/**
 * El lado más largo de un triángulo del agua, m.
 *
 * La curva de la Tierra se dibuja doblando cada nudo —ver `curvatura.ts`—, y
 * un triángulo de cincuenta kilómetros de los que salen al triangular el
 * embalse de Itaipú sería una tabla recta que a media longitud se queda
 * cincuenta metros por encima del suelo curvado. A tres kilómetros, quince
 * centímetros.
 */
const LADO_MAXIMO = 3000;

/** El recuadro de un lago, en grados. */
export function cajaDelLago(l: Lago): { sur: number; norte: number; oeste: number; este: number } {
  let sur = Infinity;
  let norte = -Infinity;
  let oeste = Infinity;
  let este = -Infinity;
  for (const anillo of l.exteriores)
    for (const [la, lo] of anillo) {
      if (la < sur) sur = la;
      if (la > norte) norte = la;
      if (lo < oeste) oeste = lo;
      if (lo > este) este = lo;
    }
  return { sur, norte, oeste, este };
}

/**
 * **Si un punto cae en el agua de algún lago**, y a qué cota.
 *
 * Se pregunta por cada nudo del horizonte y de los parches —un millón y pico
 * de veces al cargar—, y el embalse de Itaipú tiene miles de puntos, así que
 * no se recorre el contorno cada vez: por cada latitud se calculan una vez
 * las longitudes en las que la raya cruza algún contorno, y estar dentro es
 * haber cruzado un número impar de veces. Las islas son contornos más y
 * salen solas. Los nudos de una fila comparten latitud, así que se calcula
 * una vez por fila.
 */
export class AguaDeLosLagos {
  private readonly lagos: readonly {
    readonly lago: Lago;
    readonly caja: ReturnType<typeof cajaDelLago>;
    readonly lados: Float64Array;
  }[];
  private ultimaLat = Number.NaN;
  private ultimosCruces: { cota: number; cruces: Float64Array }[] = [];

  constructor(lagos: readonly Lago[]) {
    this.lagos = lagos.map((lago) => {
      const lados: number[] = [];
      for (const anillo of [...lago.exteriores, ...lago.interiores])
        for (let i = 0; i < anillo.length - 1; i++) {
          const a = anillo[i]!;
          const b = anillo[i + 1]!;
          lados.push(a[0], a[1], b[0], b[1]);
        }
      return { lago, caja: cajaDelLago(lago), lados: Float64Array.from(lados) };
    });
  }

  get vacio(): boolean {
    return this.lagos.length === 0;
  }

  /**
   * Lo mismo, para la física: con la latitud redondeada a medio
   * milisegundo de grado —cincuenta y cinco metros—, que el avión cambia de
   * fila en cada pregunta y las doscientas cuarenta preguntas por segundo
   * recorrerían los ocho mil lados del embalse de Itaipú cada vez. Cincuenta
   * metros de orilla no se notan al pisar el agua.
   */
  cotaParaPisar(lat: number, lon: number): number | null {
    for (const { caja } of this.lagos)
      if (lat >= caja.sur && lat <= caja.norte && lon >= caja.oeste && lon <= caja.este)
        return this.cotaEn(Math.round(lat / 5e-4) * 5e-4, lon);
    return null;
  }

  /** La cota del lago en el que cae el punto, o `null` si no cae en ninguno. */
  cotaEn(lat: number, lon: number): number | null {
    if (lat !== this.ultimaLat) {
      this.ultimaLat = lat;
      this.ultimosCruces = [];
      for (const { lago, caja, lados } of this.lagos) {
        if (lat < caja.sur || lat > caja.norte) continue;
        const cruces: number[] = [];
        for (let i = 0; i < lados.length; i += 4) {
          const ya = lados[i]!;
          const yb = lados[i + 2]!;
          if (ya > lat === yb > lat) continue;
          const xa = lados[i + 1]!;
          const xb = lados[i + 3]!;
          cruces.push(xa + ((lat - ya) * (xb - xa)) / (yb - ya));
        }
        if (cruces.length) this.ultimosCruces.push({ cota: lago.cota, cruces: Float64Array.from(cruces).sort() });
      }
    }
    for (const { cota, cruces } of this.ultimosCruces) {
      // Cuántos cruces quedan a la izquierda: impar, dentro.
      let a = 0;
      let b = cruces.length;
      while (a < b) {
        const m = (a + b) >> 1;
        if (cruces[m]! < lon) a = m + 1;
        else b = m;
      }
      if (a % 2 === 1) return cota;
    }
    return null;
  }
}

/**
 * La lámina de un lago: su contorno triangulado, en metros del mundo, con
 * los triángulos largos partidos para que la curva de la Tierra la doble
 * como al suelo de alrededor.
 */
export function laminaDelLago(lago: Lago, aMetros: AMetros): BufferGeometry {
  const enMetros = (anillo: readonly (readonly [number, number])[]): Vector2[] => {
    const v = anillo.map(([la, lo]) => {
      const { x, z } = aMetros(la, lo);
      return new Vector2(x, z);
    });
    // Cerrado en el fichero; para triangular, sin el punto repetido.
    if (v.length > 1 && v[0]!.equals(v[v.length - 1]!)) v.pop();
    return v;
  };
  const exteriores = lago.exteriores.map(enMetros);
  const interiores = lago.interiores.map(enMetros);
  const posiciones: number[] = [];
  for (const contorno of exteriores) {
    // Las islas de este contorno: las que tienen su primer punto dentro.
    const islas = interiores.filter((isla) => isla[0] && dentroDe(contorno, isla[0]));
    const todos = [contorno, ...islas].flat();
    const caras = ShapeUtils.triangulateShape(contorno, islas);
    for (const [a, b, c] of caras) partir(todos[a!]!, todos[b!]!, todos[c!]!, posiciones);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(Float32Array.from(posiciones), 3));
  // Todas hacia arriba: el triangulador no promete el sentido.
  const p = geo.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < p.count; i += 3) {
    const ax = p.getX(i);
    const az = p.getZ(i);
    const cruz = (p.getX(i + 1) - ax) * (p.getZ(i + 2) - az) - (p.getZ(i + 1) - az) * (p.getX(i + 2) - ax);
    if (cruz > 0) {
      const x = p.getX(i + 1);
      const z = p.getZ(i + 1);
      p.setXYZ(i + 1, p.getX(i + 2), 0, p.getZ(i + 2));
      p.setXYZ(i + 2, x, 0, z);
    }
  }
  const normales = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) normales[i * 3 + 1] = 1;
  geo.setAttribute("normal", new BufferAttribute(normales, 3));
  geo.computeBoundingSphere();
  return geo;
}

function dentroDe(contorno: readonly Vector2[], p: Vector2): boolean {
  let si = false;
  for (let i = 0, j = contorno.length - 1; i < contorno.length; j = i++) {
    const a = contorno[i]!;
    const b = contorno[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) si = !si;
  }
  return si;
}

/** Parte un triángulo por su lado más largo hasta que ninguno pase del máximo. */
function partir(a: Vector2, b: Vector2, c: Vector2, salida: number[]): void {
  const ab = a.distanceTo(b);
  const bc = b.distanceTo(c);
  const ca = c.distanceTo(a);
  const mayor = Math.max(ab, bc, ca);
  if (mayor <= LADO_MAXIMO) {
    salida.push(a.x, 0, a.y, b.x, 0, b.y, c.x, 0, c.y);
    return;
  }
  if (mayor === ab) {
    const m = a.clone().lerp(b, 0.5);
    partir(a, m, c, salida);
    partir(m, b, c, salida);
  } else if (mayor === bc) {
    const m = b.clone().lerp(c, 0.5);
    partir(a, b, m, salida);
    partir(a, m, c, salida);
  } else {
    const m = c.clone().lerp(a, 0.5);
    partir(a, b, m, salida);
    partir(m, b, c, salida);
  }
}

/** La malla de un lago, con un material provisional hasta que llegue el del cielo. */
export function crearLago(lago: Lago, aMetros: AMetros, color: number): Mesh {
  const malla = new Mesh(
    laminaDelLago(lago, aMetros),
    new MeshLambertMaterial({ color, transparent: true, opacity: 0.86 }),
  );
  malla.name = `lago:${lago.id}`;
  malla.position.y = lago.cota;
  // En el turno del agua de casa: ver `buildWater` en `terrain.ts`.
  malla.renderOrder = -0.5;
  malla.matrixAutoUpdate = false;
  malla.updateMatrix();
  return malla;
}

/**
 * **El material del mar, para un lago.**
 *
 * El mismo programa y los mismos uniformes —el sol, la bruma, la curva—,
 * que se comparten y se mueven solos con los del mar. Todos menos uno: el
 * agua del mar pregunta a los mapas de orillas de su mundo si donde cae hay
 * tierra, y con la lámina del mar a cien metros por debajo la respuesta
 * sobre un lago siempre es «sí». El lago ya tiene su orilla, que es su
 * contorno.
 */
export function materialDelLago(delMar: Material): Material {
  if (!(delMar instanceof ShaderMaterial)) return delMar;
  const m = new ShaderMaterial({
    uniforms: { ...delMar.uniforms, conOrillas: { value: 0 } },
    vertexShader: delMar.vertexShader,
    fragmentShader: delMar.fragmentShader,
    transparent: delMar.transparent,
    fog: delMar.fog,
  });
  return m;
}

// ── Lo que hay, y cómo se carga ───────────────────────────────────────────

const RUTA = import.meta.glob("../../data/terrain/lagos.json", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * Los lagos que caen en un recuadro, o ninguno si falla: sin lagos se vuela
 * como antes, con la foto encima.
 */
export async function cargarLagos(
  dentro: (caja: ReturnType<typeof cajaDelLago>) => boolean,
): Promise<Lago[]> {
  const url = Object.values(RUTA)[0];
  if (!url) return [];
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const todo = (await res.json()) as { lagos: Lago[] };
    return todo.lagos.filter((l) => dentro(cajaDelLago(l)));
  } catch {
    return [];
  }
}
