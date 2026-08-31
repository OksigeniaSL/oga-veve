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
  DoubleSide,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  Vector2,
  type ColorRepresentation,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { numberTexture } from './runway-markings';

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
  // Gris de verdad, no tierra. El primer tono era cálido y bajo el sol de
  // mediodía leía como tierra roja: muy paraguayo y muy poco aeropuerto
  // internacional. El asfalto de una pista está gastado y es casi neutro.
  asphalt: 0x393a3c,
  concrete: 0x55575a,
  gravel: 0x4a443c,
  grass: 0x4d6136,
};

/** Cuánto se levanta la pintura sobre el asfalto, m. Ver la nota de `losa`. */
const PINTURA_ALTURA = 0.2;

/** Blanco de pintura de pista. Gastado, no papel. */
const PINTURA = 0xd8d6cd;

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

  // ShapeGeometry vive en el plano XY. Se tumba a XZ, cada vértice sube a la
  // cota que le toca —eso es la pendiente de la pista— y **la Z se invierte**.
  //
  // Lo último no es un capricho: en el fichero el eje Y apunta al norte, y en
  // el mundo del juego el norte es la Z negativa. Sin invertir, el aeropuerto
  // sale espejado de norte a sur y el avión aparece en el punto simétrico, con
  // el asfalto a un lado y él en la hierba.
  //
  // Y de paso arregla otra cosa: invertir un eje devuelve el sentido de giro
  // de los triángulos al que tenía, así que ya no hace falta darles la vuelta
  // a mano para que las caras no miren al suelo.
  const pos = geo.attributes.position!;
  const arr = pos.array as Float32Array;
  for (let i = 0; i < pos.count; i++) {
    const x = arr[i * 3]!;
    const y = arr[i * 3 + 1]!;
    arr[i * 3 + 1] = altura([x, y]);
    arr[i * 3 + 2] = -y;
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

  // **Todo el aeródromo sigue el perfil de la pista principal**, y esto no es
  // un adorno: el terreno se aplana con ese mismo perfil, así que cualquier
  // cosa que se dibuje a una cota fija se queda flotando por un extremo y
  // enterrada por el otro. Con los trece metros de caída de Asunción, las
  // plataformas quedaban siete metros en el aire.
  //
  // El perfil real de cada calle de rodaje no está en ninguna fuente abierta.
  // Tumbarlas todas al del eje de la pista es una aproximación, pero es una
  // aproximación coherente: un aeródromo se construye sobre una explanada, y
  // la explanada acompaña a la pista.
  const principal = aero.runways[0];
  const cota = principal ? perfil(principal, suelo) : plano(suelo);

  for (const pista of aero.runways) {
    anotar(pista.surface, cinta(pista.centerline, pista.widthM ?? 45, perfil(pista, suelo)));
  }
  for (const calle of aero.taxiways) {
    anotar('asphalt', cinta(calle.path, calle.widthM ?? ANCHO_RODADURA, cota));
  }
  for (const plataforma of aero.aprons) {
    anotar('concrete', desdePoligono(plataforma.polygon, cota));
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

  if (principal) grupo.add(marcas(principal, cota));

  return grupo;
}

/**
 * Las pinturas de la pista: eje, teclas de piano y designador.
 *
 * Los rectángulos se construyen con la **misma función que el pavimento**, en
 * coordenadas del fichero. Se probó a meterlos en un grupo girado al rumbo,
 * que es como se hacen las marcas del escenario sintético, y ahí desaparecían:
 * si el resto del aeródromo se dibuja en coordenadas del mundo, las pinturas
 * también.
 *
 * Los números **salen del fichero**, que es donde está el designador de
 * verdad. Calcularlos del rumbo daría 01 donde pone 02: el número de una
 * pista es su rumbo magnético, y el geométrico no lo es.
 */
function marcas(pista: Pista, altura: (p: Punto) => number): Group {
  const grupo = new Group();
  grupo.name = 'marcas';

  const umbrales = Object.entries(pista.thresholds).filter(
    (e): e is [string, Umbral] => e[1] !== null && e[1].xy !== null,
  );
  if (umbrales.length < 2) return grupo;

  const ancho = pista.widthM ?? 45;
  const [[nombreA, a], [nombreB, b]] = umbrales as [[string, Umbral], [string, Umbral]];
  const ax = a.xy![0];
  const ay = a.xy![1];
  const largo = Math.hypot(b.xy![0] - ax, b.xy![1] - ay);
  // Unitario a lo largo del eje, y su perpendicular.
  const ux = (b.xy![0] - ax) / largo;
  const uy = (b.xy![1] - ay) / largo;
  const px = -uy;
  const py = ux;

  const piezas: BufferGeometry[] = [];
  /** Un rectángulo de pintura centrado a `d` metros del umbral A. */
  const raya = (d: number, lado: number, largoM: number, anchoM: number) => {
    const cx = ax + ux * d + px * lado;
    const cy = ay + uy * d + py * lado;
    const contorno: Punto[] = [
      [cx + (ux * largoM + px * anchoM) / 2, cy + (uy * largoM + py * anchoM) / 2],
      [cx + (ux * largoM - px * anchoM) / 2, cy + (uy * largoM - py * anchoM) / 2],
      [cx - (ux * largoM + px * anchoM) / 2, cy - (uy * largoM + py * anchoM) / 2],
      [cx - (ux * largoM - px * anchoM) / 2, cy - (uy * largoM - py * anchoM) / 2],
    ];
    const geo = desdePoligono(contorno, (p) => altura(p) + PINTURA_ALTURA);
    if (geo) piezas.push(geo);
  };

  // Eje discontinuo: trazos de 30 m cada 60, con los extremos libres para las
  // teclas de piano.
  for (let d = 180; d < largo - 180; d += 60) raya(d, 0, 30, 0.9);

  // Teclas de piano en las dos cabeceras.
  for (const d of [30, largo - 30]) {
    for (let i = 0; i < 8; i++) raya(d, (i - 3.5) * (ancho * 0.105), 28, ancho * 0.055);
  }

  if (piezas.length) {
    const fusionadas = mergeGeometries(piezas, false);
    if (fusionadas) {
      const malla = new Mesh(fusionadas, new MeshLambertMaterial({ color: PINTURA }));
      malla.name = 'pintura';
      grupo.add(malla);
    }
  }

  // Y el designador de cada cabecera. Cada una lee al revés que la otra: es el
  // mismo asfalto visto desde los dos lados, y por eso una es la 02 y la otra
  // la 20.
  //
  // La orientación va **horneada en la geometría** y no en la malla, por lo
  // mismo que las rayas: aquí se trabaja en coordenadas del mundo.
  for (const [nombre, d] of [
    [nombreA, 100],
    [nombreB, largo - 100],
  ] as const) {
    const textura = numberTexture(nombre);
    const geo = new PlaneGeometry(ancho * 0.5, ancho * 0.62);
    geo.rotateX(-Math.PI / 2);
    // El giro se calcula **en coordenadas del mundo**, que es donde acaba la
    // geometría: la dirección de la pista allí es `(ux, −uy)`, porque la Y del
    // fichero apunta al norte y el norte es la Z negativa. Girarlo con el
    // ángulo del fichero y colocarlo en el mundo es lo que salía espejado —el
    // «20» se leía al revés—, y es el mismo desajuste de marco que ya había
    // aparecido tres veces con los rumbos.
    geo.rotateY(Math.atan2(-ux, uy) + (d > largo / 2 ? Math.PI : 0));
    const cx = ax + ux * d;
    const cy = ay + uy * d;
    geo.translate(cx, altura([cx, cy]) + PINTURA_ALTURA + 0.02, -cy);
    grupo.add(
      new Mesh(
        geo,
        new MeshLambertMaterial({
          map: textura,
          color: textura ? 0xffffff : PINTURA,
          transparent: true,
          side: DoubleSide,
        }),
      ),
    );
  }

  return grupo;
}
