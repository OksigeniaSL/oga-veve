/**
 * Las luces azules de las calles de rodaje, y las verdes del eje.
 *
 * Un aeropuerto de noche no se reconoce por sus edificios: se reconoce por
 * **el dibujo de sus luces**. Los bordes blancos hacen el rectángulo de la
 * pista y las hileras azules cuentan por dónde se va y por dónde no, mucho
 * antes de que se lea un cartel. Es la misma lección que ya cuenta la raya
 * verde del suelo, dicha con lo que hay de verdad en el sitio.
 *
 * ## De dónde salen
 *
 * De la geometría de las calles de rodaje, no de un dato de OpenStreetMap.
 * Los valores `txe` —borde— y `txc` —eje— de `aeroway=navigationaid` existen
 * y son unos cien mil nodos en el mundo, pero **ninguno de los cuatro
 * aeródromos que volamos los trae**: La Palma solo trae PAPI, Tenerife Norte
 * trae dieciséis nodos sin valor ninguno y Asunción no trae nada. Así que se
 * calculan, y cuando el fichero sí los traiga se usan los suyos, que es
 * exactamente lo mismo que hace el PAPI. Ver `world/aproximacion.ts`.
 *
 * ## Azul el borde, verde el eje, y no al revés
 *
 * El azul es el borde de la calle de rodaje en todos los aeropuertos del
 * mundo, y el verde su eje. No es una convención decorativa: **el verde te
 * dice por dónde ir y el azul por dónde no salirte**, y confundirlos es
 * enseñar lo contrario de lo que hay ahí fuera.
 *
 * El eje verde solo se pone donde el fichero dice que existe. La mayoría de
 * las calles de rodaje del mundo no tienen luces de eje —son de los
 * aeropuertos grandes y de las calles de salida rápida—, y ponerlas en todas
 * dibujaría una autopista iluminada donde hay una calle de asfalto con
 * bombillas azules a los lados. Además pelearía con la raya verde que el
 * juego pinta para guiar: dos guías verdes a la vez son ninguna.
 *
 * ## Y solo se ven cuando se ven
 *
 * De día una luz de balizamiento no se distingue: hay demasiada luz. Se
 * encienden con el sol bajo y se apagan con el sol alto, que es lo que hace
 * que encontrarse el aeropuerto encendido al atardecer sea un momento.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  SphereGeometry,
} from "three";
import type { Aerodrome, Punto } from "./aerodrome";

/** Cada cuántos metros va una luz de borde. Es la separación de verdad. */
export const SEPARACION_BORDE = 30;
/** Y las de eje, que van más juntas porque son las que se siguen. */
export const SEPARACION_EJE = 15;

/** Azul de borde de calle de rodaje, y verde de eje. */
export const AZUL = 0x2f6fd0;
export const VERDE = 0x2fd36b;

/** Anchura por defecto de una calle de rodaje, m. OSM casi nunca la trae. */
const ANCHO_POR_DEFECTO = 23;

/**
 * Reparte puntos cada `paso` metros a lo largo de una polilínea.
 *
 * Devuelve también hacia dónde va la línea en cada punto, que es lo que hace
 * falta para separarse a un costado. El reparto es **por longitud recorrida y
 * no por vértice**: una calle de rodaje de OpenStreetMap tiene los vértices
 * donde le hizo falta a quien la dibujó —muy juntos en las curvas, a
 * doscientos metros en las rectas— y poner una luz por vértice daría
 * exactamente el dibujo equivocado.
 */
export function jalonar(
  linea: readonly Punto[],
  paso: number,
): { x: number; y: number; ex: number; ey: number }[] {
  const salida: { x: number; y: number; ex: number; ey: number }[] = [];
  if (linea.length < 2 || paso <= 0) return salida;
  let sobra = 0;
  for (let i = 0; i < linea.length - 1; i++) {
    const a = linea[i]!;
    const b = linea[i + 1]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const largo = Math.hypot(dx, dy);
    if (largo < 1e-6) continue;
    const ex = dx / largo;
    const ey = dy / largo;
    for (let d = sobra; d < largo; d += paso) {
      salida.push({ x: a[0] + ex * d, y: a[1] + ey * d, ex, ey });
    }
    // Lo que sobra de este tramo se descuenta del siguiente: así la
    // separación se mantiene al cruzar un vértice en vez de reiniciarse y
    // amontonar dos luces en cada esquina.
    sobra = (paso - ((largo - sobra) % paso)) % paso;
  }
  return salida;
}

/** Las dos hileras de borde de una calle de rodaje. */
export function bordesDe(
  linea: readonly Punto[],
  ancho: number,
  paso = SEPARACION_BORDE,
): Punto[] {
  const lado = ancho / 2 + 1.5;
  const salida: Punto[] = [];
  for (const p of jalonar(linea, paso)) {
    salida.push([p.x - p.ey * lado, p.y + p.ex * lado]);
    salida.push([p.x + p.ey * lado, p.y - p.ex * lado]);
  }
  return salida;
}

/**
 * Cuánto lucen las luces con el sol a esta altura.
 *
 * `seno` es el seno de la altura del sol, que es lo que ya tiene calculado el
 * cielo: uno con el sol en la vertical, cero en el horizonte, negativo de
 * noche. Encendidas del todo desde que el sol se pone, apagándose mientras
 * sube y fuera del todo por encima de seis grados, que es cuando ya no se
 * distinguirían de verdad.
 */
export function encendidoSegunElSol(seno: number): number {
  const APAGA = Math.sin((6 * Math.PI) / 180);
  if (seno <= 0) return 1;
  if (seno >= APAGA) return 0;
  return 1 - seno / APAGA;
}

export interface LucesDeRodadura {
  readonly grupo: Group;
  /** Enciende o apaga según dónde esté el sol. `seno` es `sunDirection.y`. */
  ponerSol(seno: number): void;
  /** Cuántas luces hay, para el banco. */
  readonly cuantas: number;
  dispose(): void;
}

/**
 * Monta las luces de todas las calles de rodaje de un aeródromo.
 *
 * `altura` tiene que ser el suelo de verdad —el de la fotografía si la hay—,
 * igual que en las de aproximación: se construye después de moldear el
 * terreno o las luces quedan enterradas.
 */
export function crearLucesDeRodadura(
  aero: Aerodrome,
  altura: (p: Punto) => number,
): LucesDeRodadura | null {
  /*
   * Sin pista iluminada no hay balizamiento ninguno.
   *
   * Detrás de una pista con luces está toda la instalación —balizamiento,
   * PAPI, luces de aproximación— y detrás de un campo de hierba no hay nada
   * de eso. Es la misma regla que ya usa el resto del aeródromo.
   */
  if (!aero.runways.some((p) => p.lit)) return null;

  const puestas: [Punto, number][] = [];
  for (const calle of aero.taxiways) {
    if (calle.path.length < 2) continue;
    for (const p of bordesDe(calle.path, calle.widthM ?? ANCHO_POR_DEFECTO)) {
      puestas.push([p, AZUL]);
    }
  }

  /*
   * Y el eje verde **solo donde el fichero dice que lo hay**. Ver la cabecera:
   * hoy no lo dice en ninguno de los nuestros, y ponerlo en todas las calles
   * sería inventarse un aeropuerto que no es este.
   */
  const ejes = (aero.visualAids ?? []).filter((a) => a.tipo === "txc");
  for (const a of ejes) puestas.push([a.xy, VERDE]);
  // Y si trae los de borde medidos, mandan ellos sobre los calculados.
  const bordes = (aero.visualAids ?? []).filter((a) => a.tipo === "txe");
  if (bordes.length) {
    puestas.length = 0;
    for (const a of bordes) puestas.push([a.xy, AZUL]);
    for (const a of ejes) puestas.push([a.xy, VERDE]);
  }

  if (!puestas.length) return null;

  const grupo = new Group();
  grupo.name = "luces-de-rodadura";
  const tono = new Color();
  const m = new Matrix4();

  /*
   * Dos capas, igual que las de pista y por lo mismo: la esfera manda de
   * cerca y tiene volumen, y una capa de puntos sin atenuación mantiene unos
   * píxeles pase lo que pase. Una luz de verdad no encoge con la distancia,
   * porque lo que llega de ella es su brillo y no su tamaño.
   */
  const malla = new InstancedMesh(
    new SphereGeometry(0.42, 5, 3),
    new MeshBasicMaterial({ transparent: true }),
    puestas.length,
  );
  malla.name = "rodadura-esferas";

  const sitios = new Float32Array(puestas.length * 3);
  const colores = new Float32Array(puestas.length * 3);
  puestas.forEach(([p, color], k) => {
    const y = altura(p) + 0.35;
    m.makeTranslation(p[0], y, -p[1]);
    malla.setMatrixAt(k, m);
    malla.setColorAt(k, tono.setHex(color));
    sitios[k * 3] = p[0];
    sitios[k * 3 + 1] = y;
    sitios[k * 3 + 2] = -p[1];
    colores[k * 3] = tono.r;
    colores[k * 3 + 1] = tono.g;
    colores[k * 3 + 2] = tono.b;
  });
  grupo.add(malla);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(sitios, 3));
  geo.setAttribute("color", new BufferAttribute(colores, 3));
  const puntos = new Points(
    geo,
    new PointsMaterial({
      size: 5,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    }),
  );
  puntos.name = "rodadura-puntos";
  grupo.add(puntos);

  const ponerSol = (seno: number): void => {
    const luce = encendidoSegunElSol(seno);
    grupo.visible = luce > 0.01;
    (malla.material as MeshBasicMaterial).opacity = luce;
    (puntos.material as PointsMaterial).opacity = luce;
  };
  ponerSol(-1);

  return {
    grupo,
    ponerSol,
    cuantas: puestas.length,
    dispose() {
      malla.geometry.dispose();
      (malla.material as MeshBasicMaterial).dispose();
      geo.dispose();
      (puntos.material as PointsMaterial).dispose();
    },
  };
}
