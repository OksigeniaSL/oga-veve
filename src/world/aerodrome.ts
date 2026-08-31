/**
 * De `.aero.json` a geometría: un aeródromo real, dibujado.
 *
 * Lo que sale del extractor es una lista de polilíneas y polígonos en metros
 * sobre plano local. Aquí se convierte en algo que se puede sobrevolar.
 *
 * ## Por qué se fusiona todo
 *
 * Silvio Pettirossi tiene **54 calles de rodaje y 21 plataformas**. Dibujadas
 * una a una son setenta y cinco mallas, setenta y cinco llamadas de dibujo, y
 * una tablet de gama media no lo aguanta. Se fusiona por tipo de superficie:
 * el aeropuerto entero cabe en dos o tres llamadas.
 *
 * El presupuesto es **≤50.000 triángulos y ≤12 llamadas de dibujo** por
 * aeródromo, y hay una prueba que lo comprueba con el aeropuerto real.
 *
 * ## La pendiente
 *
 * La pista no es plana. La de Asunción cae trece metros de un umbral al otro
 * —un 0,39 %— y la de Tenerife dieciséis. Eso se nota al aterrizar, así que
 * el pavimento se construye interpolando entre las elevaciones reales de los
 * dos umbrales en vez de tumbarlo todo a una cota.
 */

import {
  BufferGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  Shape,
  ShapeGeometry,
  Vector2,
  type ColorRepresentation,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Un punto en metros sobre el plano local del aeródromo. */
export type Punto = readonly [number, number];

export interface Umbral {
  readonly xy: Punto | null;
  readonly elevM: number | null;
  readonly headingTrue: number | null;
  readonly displacedM: number;
}

export interface Pista {
  readonly ref: string;
  readonly widthM: number | null;
  readonly surface: string | null;
  readonly lit: boolean;
  readonly centerline: readonly Punto[];
  readonly thresholds: Record<string, Umbral | null>;
  readonly magneticVariation: number | null;
}

export interface Aerodrome {
  readonly id: string;
  readonly name: string;
  readonly origin: { readonly lat: number; readonly lon: number };
  readonly elevationM: number | null;
  readonly runways: readonly Pista[];
  readonly taxiways: readonly { readonly widthM: number | null; readonly path: readonly Punto[] }[];
  readonly aprons: readonly { readonly polygon: readonly Punto[] }[];
  readonly buildings: readonly { readonly heightM: number | null; readonly polygon: readonly Punto[] }[];
  readonly windsocks: readonly Punto[];
  readonly holdingPositions: readonly Punto[];
}

/** Anchura por defecto de una calle de rodaje, m. OSM casi nunca la trae. */
const ANCHO_RODADURA = 23;

/** Colores del pavimento. Mate, como el asfalto de verdad. */
const COLORES: Record<string, ColorRepresentation> = {
  asphalt: 0x3d3a37,
  concrete: 0x565350,
  gravel: 0x4a443c,
  grass: 0x4d6136,
};

const color = (superficie: string | null): ColorRepresentation =>
  COLORES[superficie ?? 'asphalt'] ?? COLORES.asphalt!;

/**
 * Una cinta de pavimento a partir de un eje y una anchura.
 *
 * Los bordes se sacan desplazando cada punto perpendicularmente al tramo, y
 * en los vértices interiores se usa la bisectriz para que la junta no se abra
 * ni se monte. No hace falta más: una calle de rodaje no tiene curvas
 * cerradas y, cuando las tiene, OSM ya las trae partidas en tramos.
 */
function cinta(eje: readonly Punto[], ancho: number, altura: (p: Punto) => number): BufferGeometry | null {
  if (eje.length < 2) return null;
  const medio = ancho / 2;
  const izq: Punto[] = [];
  const der: Punto[] = [];

  for (let i = 0; i < eje.length; i++) {
    const previo = eje[Math.max(0, i - 1)]!;
    const siguiente = eje[Math.min(eje.length - 1, i + 1)]!;
    let dx = siguiente[0] - previo[0];
    let dy = siguiente[1] - previo[1];
    const largo = Math.hypot(dx, dy) || 1;
    dx /= largo;
    dy /= largo;
    // Normal a la izquierda del avance.
    const nx = -dy * medio;
    const ny = dx * medio;
    const p = eje[i]!;
    izq.push([p[0] + nx, p[1] + ny]);
    der.push([p[0] - nx, p[1] - ny]);
  }

  // Se cierra el contorno: por un borde y de vuelta por el otro.
  const contorno = [...izq, ...der.slice().reverse()];
  return desdePoligono(contorno, altura);
}

/**
 * Un polígono tumbado, triangulado y colocado a su altura.
 *
 * La triangulación la hace three con `ShapeGeometry`, que ya lleva un
 * *earcut* dentro. No hacía falta escribir uno.
 */
function desdePoligono(contorno: readonly Punto[], altura: (p: Punto) => number): BufferGeometry | null {
  if (contorno.length < 3) return null;
  const forma = new Shape(contorno.map(([x, y]) => new Vector2(x, y)));
  const geo = new ShapeGeometry(forma);

  // ShapeGeometry vive en el plano XY. Se tumba a XZ y cada vértice sube a la
  // cota que le toca, que es lo que da la pendiente de la pista.
  const pos = geo.attributes.position!;
  const arr = pos.array as Float32Array;
  for (let i = 0; i < pos.count; i++) {
    const x = arr[i * 3]!;
    const y = arr[i * 3 + 1]!;
    arr[i * 3 + 1] = altura([x, y]);
    arr[i * 3 + 2] = y;
  }
  geo.computeVertexNormals();
  return geo;
}

/** Altura constante. Para lo que no tiene pendiente conocida. */
const plano = (h: number) => () => h;

/**
 * Altura interpolada entre los dos umbrales de una pista.
 *
 * Se proyecta el punto sobre el eje que une los umbrales y se interpola. Es
 * lo que hace que la pista de Asunción caiga sus trece metros de verdad en
 * lugar de quedarse tumbada a una cota media.
 */
function perfil(pista: Pista, base: number): (p: Punto) => number {
  const umbrales = Object.values(pista.thresholds).filter(
    (u): u is Umbral => u !== null && u.xy !== null && u.elevM !== null,
  );
  if (umbrales.length < 2) return plano(base);

  const [a, b] = umbrales as [Umbral, Umbral];
  const ax = a.xy![0];
  const ay = a.xy![1];
  const dx = b.xy![0] - ax;
  const dy = b.xy![1] - ay;
  const largo2 = dx * dx + dy * dy || 1;

  return ([x, y]) => {
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / largo2));
    return a.elevM! + (b.elevM! - a.elevM!) * t;
  };
}

/** Cuánto mide un aeródromo, para saber qué trozo de terreno ocupa. */
export function extension(aero: Aerodrome): { radio: number } {
  let radio = 0;
  const mirar = (puntos: readonly Punto[]) => {
    for (const [x, y] of puntos) radio = Math.max(radio, Math.hypot(x, y));
  };
  for (const r of aero.runways) mirar(r.centerline);
  for (const t of aero.taxiways) mirar(t.path);
  for (const a of aero.aprons) mirar(a.polygon);
  return { radio };
}

/**
 * El aeródromo entero, en dos o tres mallas.
 *
 * @param aero lo que salió del extractor
 * @param baseY cota del terreno donde se planta, m
 */
export function createAerodrome(aero: Aerodrome, baseY = 0): Group {
  const grupo = new Group();
  grupo.name = `aerodromo:${aero.id}`;

  // La cota de referencia: la del aeródromo si la sabemos.
  const suelo = aero.elevationM ?? baseY;

  /** Geometrías agrupadas por superficie, para fusionar cada grupo. */
  const porSuperficie = new Map<string, BufferGeometry[]>();
  const anotar = (superficie: string | null, geo: BufferGeometry | null) => {
    if (!geo) return;
    const clave = superficie ?? 'asphalt';
    const lista = porSuperficie.get(clave) ?? [];
    lista.push(geo);
    porSuperficie.set(clave, lista);
  };

  for (const pista of aero.runways) {
    const ancho = pista.widthM ?? 45;
    anotar(pista.surface, cinta(pista.centerline, ancho, perfil(pista, suelo)));
  }

  // Las rodaduras van todas a la cota del aeródromo: su perfil real no está
  // en ninguna fuente abierta, y fingirlo sería peor que dejarlas planas.
  for (const calle of aero.taxiways) {
    anotar('asphalt', cinta(calle.path, calle.widthM ?? ANCHO_RODADURA, plano(suelo)));
  }
  for (const plataforma of aero.aprons) {
    anotar('concrete', desdePoligono(plataforma.polygon, plano(suelo)));
  }

  for (const [superficie, geos] of porSuperficie) {
    const fusionada = geos.length === 1 ? geos[0]! : mergeGeometries(geos, false);
    if (!fusionada) continue;
    const malla = new Mesh(fusionada, new MeshLambertMaterial({ color: color(superficie) }));
    malla.name = `pavimento:${superficie}`;
    // El pavimento no proyecta sombra sobre sí mismo y no la recibe de nada
    // que importe: apagarlo es rendimiento gratis.
    malla.castShadow = false;
    grupo.add(malla);
  }

  return grupo;
}
