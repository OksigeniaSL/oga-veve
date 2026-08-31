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
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
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
import { letreroAtlasTexture, numberTexture } from './runway-markings';

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
  readonly taxiways: readonly {
    readonly ref?: string | null;
    readonly widthM: number | null;
    readonly path: readonly Punto[];
  }[];
  readonly aprons: readonly { readonly polygon: readonly Punto[] }[];
  readonly buildings: readonly { readonly heightM: number | null; readonly polygon: readonly Punto[] }[];
  readonly windsocks: readonly Punto[];
  /**
   * Dónde para un avión que rueda antes de pisar la pista.
   *
   * `source` dice si el dato está medido o calculado, y no es un detalle
   * administrativo: Tenerife Norte trae trece mapeados en OpenStreetMap y
   * Silvio Pettirossi ninguno —que no significa que no existan, significa que
   * nadie los ha dibujado—. Los que faltan se deducen de dónde cada calle de
   * rodaje llega a la pista, y se marcan, porque un dato calculado que se hace
   * pasar por medido es peor que no tenerlo.
   */
  readonly holdingPositions: readonly {
    readonly xy: Punto;
    readonly ref: string | null;
    readonly runway?: string | null;
    readonly source: 'osm' | 'derivado';
  }[];
  /** Los puestos de estacionamiento, numerados. De aquí sale y aquí vuelve. */
  readonly parkingPositions?: readonly { readonly ref: string | null; readonly xy: Punto }[];
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

/** Lado del cuadrado de un letrero de rodadura, m. Un rótulo de superficie de
 * verdad lleva la letra de unos cuatro metros de alto; aquí es algo mayor,
 * porque quien la lee tiene cuatro años y va mirando por una ventana. */
const LETRERO_LADO = 9;

/** Longitud mínima de una calle para que merezca rótulo, m. */
const LETRERO_MINIMO = 90;

/** Amarillo de rodadura. Es el color que dice «esto no es pista». */
const AMARILLO = 0xd8a521;

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

  if (principal) {
    grupo.add(marcas(principal, cota));
    grupo.add(luces(principal, cota));
  }
  grupo.add(rodadura(aero, cota));
  grupo.add(mangas(aero, cota));

  return grupo;
}

/**
 * Las marcas amarillas: eje de las calles de rodaje y puntos de espera.
 *
 * El amarillo no es decoración: **es el color que dice «esto no es pista»**.
 * Un piloto que rueda sigue el amarillo, y cuando llega a las dos rayas
 * continuas del punto de espera, para y pide permiso. Eso es lo que convierte
 * rodar en algo que se puede aprender, y no en conducir por una explanada.
 */
function rodadura(aero: Aerodrome, altura: (p: Punto) => number): Group {
  const grupo = new Group();
  grupo.name = 'rodadura';
  const piezas: BufferGeometry[] = [];

  // El amarillo **se corta al llegar a la pista**. Una calle de rodaje cruza
  // una pista en el mapa, pero su línea no se pinta encima del asfalto de la
  // pista: ahí manda el blanco, y el amarillo pintado a través confundía
  // justo donde menos conviene confundirse.
  const enLaPista = (p: Punto) => {
    for (const pista of aero.runways) {
      const media = (pista.widthM ?? 45) / 2 + 3;
      if (aLaPolilinea(p, pista.centerline) < media) return true;
    }
    return false;
  };

  for (const calle of aero.taxiways) {
    const eje = calle.path;
    for (let i = 0; i < eje.length - 1; i++) {
      const [ax, ay] = eje[i]!;
      const [bx, by] = eje[i + 1]!;
      const largo = Math.hypot(bx - ax, by - ay);
      if (largo < 1) continue;
      if (enLaPista([(ax + bx) / 2, (ay + by) / 2])) continue;
      const ux = (bx - ax) / largo;
      const uy = (by - ay) / largo;
      const px = -uy * 0.075;
      const py = ux * 0.075;
      const contorno: Punto[] = [
        [ax + px, ay + py],
        [bx + px, by + py],
        [bx - px, by - py],
        [ax - px, ay - py],
      ];
      const geo = desdePoligono(contorno, (q) => altura(q) + PINTURA_ALTURA);
      if (geo) piezas.push(geo);
    }
  }

  // Puntos de espera: dos barras gruesas cruzando la calle. Se orientan según
  // la rodadura más cercana, porque OSM da el punto pero no su dirección.
  for (const { xy: punto } of aero.holdingPositions) {
    const dir = direccionCercana(aero, punto);
    if (!dir) continue;
    const [ux, uy] = dir;
    for (const desfase of [-1.5, 1.5]) {
      const cx = punto[0] + ux * desfase;
      const cy = punto[1] + uy * desfase;
      const contorno: Punto[] = [
        [cx + ux * 0.3 - uy * 11, cy + uy * 0.3 + ux * 11],
        [cx + ux * 0.3 + uy * 11, cy + uy * 0.3 - ux * 11],
        [cx - ux * 0.3 + uy * 11, cy - uy * 0.3 - ux * 11],
        [cx - ux * 0.3 - uy * 11, cy - uy * 0.3 + ux * 11],
      ];
      const geo = desdePoligono(contorno, (q) => altura(q) + PINTURA_ALTURA);
      if (geo) piezas.push(geo);
    }
  }

  if (piezas.length) {
    const fusionadas = mergeGeometries(piezas, false);
    if (fusionadas) {
      const malla = new Mesh(fusionadas, new MeshLambertMaterial({ color: AMARILLO }));
      malla.name = 'amarillo';
      grupo.add(malla);
    }
  }

  const rotulos = letreros(aero, altura, enLaPista);
  if (rotulos) grupo.add(rotulos);

  return grupo;
}

/**
 * Las letras pintadas de las calles de rodaje.
 *
 * OSM no mapea la pintura —el tag `aeroway=marking` tiene ochocientos usos en
 * todo el planeta y ni siquiera esquema aprobado—, pero sí trae el `ref` de
 * cada calle, que es justo el dato que hace falta: la letra. El pintado se
 * genera, no se descarga.
 *
 * **Todas las letras van en una sola malla.** Cada rótulo necesita su propia
 * textura, y un aeródromo mediano tiene trece calles con nombre: trece mallas
 * serían trece llamadas de dibujo, más que todo el resto del aeródromo junto.
 * Así que las letras se hornean en un único atlas y cada cuadrado se queda con
 * su celda a base de UVs. Trece rótulos, una llamada.
 */
function letreros(
  aero: Aerodrome,
  altura: (p: Punto) => number,
  enLaPista: (p: Punto) => boolean,
): Mesh | null {
  const conNombre = aero.taxiways.filter(
    (c) => typeof c.ref === 'string' && c.ref.length > 0 && c.ref.length <= 3,
  );
  if (!conNombre.length) return null;

  const refs = [...new Set(conNombre.map((c) => c.ref as string))].sort();
  const lado = Math.ceil(Math.sqrt(refs.length));
  const atlas = letreroAtlasTexture(refs, lado);
  if (!atlas) return null;

  const piezas: BufferGeometry[] = [];
  for (const calle of conNombre) {
    const largo = longitudDe(calle.path);
    // Un tramo corto es un empalme, no una calle: rotularlo llena el asfalto
    // de letras repetidas justo donde se cruzan tres calles.
    if (largo < LETRERO_MINIMO) continue;
    const p = sobreElEje(calle.path, largo / 2);
    if (!p) continue;
    const [cx, cy] = p;
    if (enLaPista([cx, cy])) continue;

    // **El sentido de una calle en OSM es arbitrario.** El de una pista no —va
    // de un umbral al otro y el número se pinta para quien aterriza—, pero una
    // calle de rodaje se dibujó en el sentido en que le vino bien a quien la
    // mapeó, así que la mitad de las letras salían boca abajo.
    //
    // Se orientan hacia la pista, que es adonde va quien rueda: el niño sale
    // del estacionamiento y busca la cabecera. Leyendo en ese sentido, la
    // letra le dice por dónde va.
    const haciaPista = rumboALaPista(aero, [cx, cy]);
    const alReves = haciaPista ? p[2] * haciaPista[0] + p[3] * haciaPista[1] < 0 : false;
    const dx = alReves ? -p[2] : p[2];
    const dy = alReves ? -p[3] : p[3];

    const celda = refs.indexOf(calle.ref as string);
    const u = (celda % lado) / lado;
    const v = 1 - (Math.floor(celda / lado) + 1) / lado;

    const geo = new PlaneGeometry(LETRERO_LADO, LETRERO_LADO);
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, u + uv.getX(i) / lado, v + uv.getY(i) / lado);
    }
    geo.rotateX(-Math.PI / 2);
    geo.rotateY(Math.atan2(-dx, dy));
    geo.translate(cx, altura([cx, cy]) + PINTURA_ALTURA + 0.02, -cy);
    piezas.push(geo);
  }
  if (!piezas.length) return null;

  const fusionadas = mergeGeometries(piezas, false);
  if (!fusionadas) return null;
  const malla = new Mesh(
    fusionadas,
    new MeshLambertMaterial({ map: atlas, transparent: true, side: DoubleSide }),
  );
  malla.name = 'letreros';
  return malla;
}

/**
 * Hacia dónde queda la pista desde un punto, normalizado. Se apunta al umbral
 * más cercano y no al eje: un piloto que rueda no va «a la pista», va a una
 * cabecera concreta.
 */
function rumboALaPista(aero: Aerodrome, p: Punto): readonly [number, number] | null {
  let mejor: Punto | null = null;
  let mejorD = Infinity;
  for (const pista of aero.runways) {
    for (const u of Object.values(pista.thresholds)) {
      if (!u?.xy) continue;
      const d = Math.hypot(u.xy[0] - p[0], u.xy[1] - p[1]);
      if (d < mejorD) {
        mejorD = d;
        mejor = u.xy;
      }
    }
  }
  if (!mejor || mejorD < 1) return null;
  return [(mejor[0] - p[0]) / mejorD, (mejor[1] - p[1]) / mejorD];
}

/** Distancia de un punto a una polilínea. */
export function aLaPolilinea(p: Punto, eje: readonly Punto[]): number {
  let mejor = Infinity;
  for (let i = 0; i < eje.length - 1; i++) {
    const [ax, ay] = eje[i]!;
    const [bx, by] = eje[i + 1]!;
    const dx = bx - ax;
    const dy = by - ay;
    const l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l));
    mejor = Math.min(mejor, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
  }
  return mejor;
}

/**
 * Dónde arranca el avión: en la cabecera, **sobre el eje del pavimento**.
 *
 * El umbral que da OurAirports está en la pista pero no exactamente sobre el
 * eje que dibuja OpenStreetMap — se diferencian en unos metros, como todo lo
 * demás—, así que el avión aparecía descentrado. Se proyecta el umbral sobre
 * el eje y se avanza `dentro` metros pista adentro.
 *
 * @returns `[x, z]` en coordenadas del mundo, o `null` si no se puede.
 */
export function arranqueEnPista(
  pista: Pista,
  headingTrue: number,
  dentro = 60,
): readonly [number, number] | null {
  const umbral = Object.values(pista.thresholds).find(
    (u) => u?.xy != null && Math.abs(((((u.headingTrue ?? 0) - headingTrue + 540) % 360) - 180)) < 20,
  );
  if (!umbral?.xy) return null;

  // Distancia recorrida por el eje hasta el punto más cercano al umbral.
  const eje = pista.centerline;
  let recorrido = 0;
  let mejor = Infinity;
  let dUmbral = 0;
  for (let i = 0; i < eje.length - 1; i++) {
    const [ax, ay] = eje[i]!;
    const [bx, by] = eje[i + 1]!;
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const l = Math.sqrt(l2);
    const t = Math.max(0, Math.min(1, ((umbral.xy[0] - ax) * dx + (umbral.xy[1] - ay) * dy) / l2));
    const d = Math.hypot(umbral.xy[0] - (ax + t * dx), umbral.xy[1] - (ay + t * dy));
    if (d < mejor) {
      mejor = d;
      dUmbral = recorrido + t * l;
    }
    recorrido += l;
  }

  // Y se entra pista adentro, hacia el otro extremo.
  const total = longitudDe(eje);
  const haciaDentro = dUmbral < total / 2 ? 1 : -1;
  const p = sobreElEje(eje, dUmbral + haciaDentro * dentro);
  return p ? [p[0], -p[1]] : null;
}

/** Lo que mide una polilínea. */
function longitudDe(eje: readonly Punto[]): number {
  let total = 0;
  for (let i = 0; i < eje.length - 1; i++) {
    total += Math.hypot(eje[i + 1]![0] - eje[i]![0], eje[i + 1]![1] - eje[i]![1]);
  }
  return total;
}

/**
 * Un punto a `d` metros del principio de una polilínea, con su dirección.
 *
 * Existe para que las luces y las líneas de borde se sitúen sobre **el mismo
 * eje con el que se dibuja el asfalto**. Las dos veces que se midieron desde
 * la recta que une los umbrales acabaron en la hierba: son dos rectas
 * parecidas y no la misma.
 *
 * @returns `[x, y, dx, dy]` o `null` si la polilínea es más corta que `d`.
 */
function sobreElEje(
  eje: readonly Punto[],
  d: number,
): readonly [number, number, number, number] | null {
  let recorrido = 0;
  for (let i = 0; i < eje.length - 1; i++) {
    const [ax, ay] = eje[i]!;
    const [bx, by] = eje[i + 1]!;
    const l = Math.hypot(bx - ax, by - ay);
    if (l < 0.001) continue;
    if (recorrido + l >= d) {
      const t = (d - recorrido) / l;
      return [ax + (bx - ax) * t, ay + (by - ay) * t, (bx - ax) / l, (by - ay) / l];
    }
    recorrido += l;
  }
  return null;
}

/** Hacia dónde va la calle de rodaje más cercana a un punto. */
function direccionCercana(aero: Aerodrome, punto: Punto): readonly [number, number] | null {
  let mejor = Infinity;
  let dir: readonly [number, number] | null = null;
  for (const calle of aero.taxiways) {
    for (let i = 0; i < calle.path.length - 1; i++) {
      const [ax, ay] = calle.path[i]!;
      const [bx, by] = calle.path[i + 1]!;
      const d = Math.hypot((ax + bx) / 2 - punto[0], (ay + by) / 2 - punto[1]);
      if (d >= mejor) continue;
      const largo = Math.hypot(bx - ax, by - ay) || 1;
      mejor = d;
      dir = [(bx - ax) / largo, (by - ay) / largo];
    }
  }
  return dir;
}

/**
 * Luces de borde de pista y PAPI.
 *
 * Todas las luces de borde en **una sola instancia**: son doscientas y pico y
 * sueltas serían doscientas llamadas de dibujo.
 *
 * El PAPI son cuatro luces al costado del umbral que dicen si se viene alto o
 * bajo en la senda: blancas si vas alto, rojas si vas bajo, y la mezcla que
 * buscas es dos y dos. Aquí van de momento como cuatro puntos fijos —el
 * color por ángulo llega con el bloque de aproximación—, pero puestas donde
 * están y en el lado que les toca.
 */
function luces(pista: Pista, altura: (p: Punto) => number): Group {
  const grupo = new Group();
  grupo.name = 'luces';
  if (!pista.lit) return grupo;

  const umbrales = Object.values(pista.thresholds).filter(
    (u): u is Umbral => u !== null && u.xy !== null,
  );
  if (umbrales.length < 2) return grupo;

  const ancho = pista.widthM ?? 45;
  const [a, b] = umbrales as [Umbral, Umbral];
  const ax = a.xy![0];
  const ay = a.xy![1];
  const largo = Math.hypot(b.xy![0] - ax, b.xy![1] - ay);
  const ux = (b.xy![0] - ax) / largo;
  const uy = (b.xy![1] - ay) / largo;

  // ── Los colores de las luces, que no son todos iguales ────────────────
  //
  // Las de borde son blancas, **salvo los últimos seiscientos metros**, que
  // van en ámbar: es el aviso de que la pista se acaba, y se ve desde la
  // cabina mientras se rueda. Y las cabeceras llevan las suyas — verdes
  // vistas desde la aproximación, rojas vistas desde dentro de la pista.
  //
  // Nada de esto es adorno: un piloto lee el estado de una pista por el color
  // de sus luces antes de leer ningún instrumento.
  const separacion = 60;
  const AMBAR_DESDE = Math.max(largo - 600, largo / 2);

  const blancas: [number, number, number][] = [];
  const ambares: [number, number, number][] = [];

  // **Sobre el eje del pavimento, no sobre la recta de los umbrales.**
  //
  // Mismo desajuste que ya se llevó por delante las líneas de borde: son dos
  // rectas parecidas y distintas, y con las luces a metro y medio del filo la
  // diferencia las mandaba a la hierba. Las de verdad van pegadas al borde
  // —a tres metros como mucho—, no en el campo de al lado.
  for (let d = separacion / 2; d < largo; d += separacion) {
    const p = sobreElEje(pista.centerline, d);
    if (!p) continue;
    const [px, py, ex, ey] = p;
    for (const lado of [-1, 1]) {
      const cx = px - ey * lado * (ancho / 2 + 1.5);
      const cy = py + ex * lado * (ancho / 2 + 1.5);
      const punto: [number, number, number] = [cx, altura([cx, cy]) + 0.5, -cy];
      (d >= AMBAR_DESDE ? ambares : blancas).push(punto);
    }
  }

  // Cabeceras: una fila cruzando cada extremo.
  const verdes: [number, number, number][] = [];
  const rojas: [number, number, number][] = [];
  for (const [extremo, destino] of [
    [2, verdes],
    [largo - 2, rojas],
  ] as const) {
    const p = sobreElEje(pista.centerline, extremo);
    if (!p) continue;
    const [px, py, ex, ey] = p;
    for (let k = -5; k <= 5; k++) {
      const lado = k * (ancho / 11);
      const cx = px - ey * lado;
      const cy = py + ex * lado;
      destino.push([cx, altura([cx, cy]) + 0.5, -cy]);
    }
  }

  // **Todas las luces en una sola instancia, con su color por luz.**
  //
  // Una malla por color serían cuatro llamadas de dibujo solo en luces, y el
  // aeródromo entero tiene un presupuesto de doce. `InstancedMesh` admite un
  // color por instancia, así que el color —que es justo la información que
  // hay que transmitir— sale gratis.
  const todas: [[number, number, number], number][] = [
    ...blancas.map((p) => [p, 0xfff0cc] as [[number, number, number], number]),
    ...ambares.map((p) => [p, 0xffb03a] as [[number, number, number], number]),
    ...verdes.map((p) => [p, 0x4ade6a] as [[number, number, number], number]),
    ...rojas.map((p) => [p, 0xe8402c] as [[number, number, number], number]),
  ];

  const m = new Matrix4();
  const tono = new Color();
  const malla = new InstancedMesh(
    new SphereGeometry(0.58, 6, 4),
    new MeshBasicMaterial(),
    todas.length,
  );
  malla.name = 'luces-pista';
  todas.forEach(([p, color], k) => {
    m.makeTranslation(p[0], p[1], p[2]);
    malla.setMatrixAt(k, m);
    malla.setColorAt(k, tono.setHex(color));
  });
  grupo.add(malla);

  // PAPI: cuatro luces al costado, que dicen si se viene alto o bajo.
  const papi = new InstancedMesh(
    new SphereGeometry(0.8, 6, 4),
    new MeshBasicMaterial({ color: 0xff5a3c }),
    4,
  );
  papi.name = 'papi';
  for (let k = 0; k < 4; k++) {
    const d = 320;
    const lado = ancho / 2 + 15 + k * 9;
    const cx = ax + ux * d - uy * lado;
    const cy = ay + uy * d + ux * lado;
    m.makeTranslation(cx, altura([cx, cy]) + 0.9, -cy);
    papi.setMatrixAt(k, m);
  }
  grupo.add(papi);

  return grupo;
}

/**
 * Las mangas de viento, donde están de verdad.
 *
 * OpenStreetMap las trae mapeadas —Tenerife Norte tiene dos— y son el
 * instrumento más honesto de un aeródromo: se lee mirándola, sin números y sin
 * saber leer. Un niño que aprende a mirar la manga sabe de dónde viene el
 * viento antes que muchos adultos.
 */
function mangas(aero: Aerodrome, altura: (p: Punto) => number): Group {
  const grupo = new Group();
  grupo.name = 'mangas';
  if (!aero.windsocks.length) return grupo;

  // Cada manga son un poste y cinco tramos de cono; sueltas, dos mangas ya eran
  // doce llamadas de dibujo y se comían el presupuesto del aeródromo entero.
  //
  // Y no van en dos mallas, una por color, sino **en una sola con el color en
  // los vértices**. Es una llamada menos, que suena a poco, pero es que
  // Tenerife Norte iba por once de doce y todavía faltan las luces de
  // aproximación y el PAPI.
  const piezas: BufferGeometry[] = [];
  const CLARO: readonly [number, number, number] = [0.949, 0.945, 0.925];
  const NARANJA: readonly [number, number, number] = [0.851, 0.31, 0.184];

  const tiñe = (geo: BufferGeometry, [r, g, b]: readonly [number, number, number]) => {
    const n = geo.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = r;
      col[i * 3 + 1] = g;
      col[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new BufferAttribute(col, 3));
    piezas.push(geo);
  };

  for (const [x, y] of aero.windsocks) {
    const base = altura([x, y]);

    const poste = new CylinderGeometry(0.12, 0.16, 6, 6);
    poste.translate(x, base + 3, -y);
    tiñe(poste, CLARO);

    // El cono, a rayas. Cinco tramos, como las de verdad.
    for (let k = 0; k < 5; k++) {
      const tramo = new CylinderGeometry(0.55 - k * 0.07, 0.62 - k * 0.07, 0.7, 8, 1, true);
      tramo.rotateZ(Math.PI / 2);
      tramo.translate(x + 0.6 + k * 0.72, base + 6, -y);
      tiñe(tramo, k % 2 === 0 ? NARANJA : CLARO);
    }
  }

  const fusionada = mergeGeometries(piezas, false);
  if (fusionada) {
    const malla = new Mesh(
      fusionada,
      new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }),
    );
    malla.name = 'mangas';
    grupo.add(malla);
  }

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

  const piezas: BufferGeometry[] = [];

  // **Todo se sitúa sobre el eje del pavimento**, no sobre la recta que une
  // los umbrales. Son dos rectas parecidas y no la misma —una viene de
  // OurAirports y la otra de OpenStreetMap—, y medir desde la que no toca
  // desplaza toda la pintura hacia un lado: el eje discontinuo, el punto de
  // toma y las teclas de piano salían descentrados respecto al asfalto.
  //
  // El eje del fichero puede recorrerse en cualquiera de los dos sentidos, así
  // que primero se mira por cuál de los dos umbrales empieza.
  const alRevés =
    Math.hypot(pista.centerline[0]![0] - ax, pista.centerline[0]![1] - ay) >
    Math.hypot(pista.centerline[0]![0] - b.xy![0], pista.centerline[0]![1] - b.xy![1]);
  const largoEje = longitudDe(pista.centerline);

  /** Un rectángulo de pintura centrado a `d` metros del umbral A. */
  const raya = (d: number, lado: number, largoM: number, anchoM: number) => {
    const p = sobreElEje(pista.centerline, alRevés ? largoEje - d : d);
    if (!p) return;
    const [ejeX, ejeY, dirX, dirY] = p;
    const sentido = alRevés ? -1 : 1;
    const ux = dirX * sentido;
    const uy = dirY * sentido;
    const px = -uy;
    const py = ux;
    const cx = ejeX + px * lado;
    const cy = ejeY + py * lado;
    const contorno: Punto[] = [
      [cx + (ux * largoM + px * anchoM) / 2, cy + (uy * largoM + py * anchoM) / 2],
      [cx + (ux * largoM - px * anchoM) / 2, cy + (uy * largoM - py * anchoM) / 2],
      [cx - (ux * largoM + px * anchoM) / 2, cy - (uy * largoM + py * anchoM) / 2],
      [cx - (ux * largoM - px * anchoM) / 2, cy - (uy * largoM - py * anchoM) / 2],
    ];
    const geo = desdePoligono(contorno, (p) => altura(p) + PINTURA_ALTURA);
    if (geo) piezas.push(geo);
  };

  // ── Las marcas de una pista, que no son las de una carretera ──────────
  //
  // Con solo el eje discontinuo esto parecía una comarcal. Lo que hace que se
  // lea como pista son **las líneas de borde**: dos trazos continuos de punta
  // a punta que encierran el asfalto. Y luego las marcas que dicen dónde
  // posarse, que son las gordas.

  // Líneas de borde, continuas y **sobre el eje que usa el pavimento**.
  //
  // Iban medidas desde la recta que une los umbrales, que no es exactamente
  // la misma que el eje de OpenStreetMap con el que se dibuja el asfalto. Con
  // unos metros de diferencia y la línea casi en el filo, acababan pintadas
  // sobre la hierba: los chicos se salieron por fuera.
  for (let i = 0; i < pista.centerline.length - 1; i++) {
    const [cax, cay] = pista.centerline[i]!;
    const [cbx, cby] = pista.centerline[i + 1]!;
    const l = Math.hypot(cbx - cax, cby - cay);
    if (l < 1) continue;
    const ex = (cbx - cax) / l;
    const ey = (cby - cay) / l;
    for (const lado of [-1, 1]) {
      const off = lado * (ancho / 2 - 1.5);
      const contorno: Punto[] = [
        [cax - ey * off - ex * 0.45, cay + ex * off - ey * 0.45],
        [cbx - ey * off + ex * 0.45, cby + ex * off + ey * 0.45],
        [cbx - ey * off + ex * 0.45 + ey * 0.9, cby + ex * off + ey * 0.45 - ex * 0.9],
        [cax - ey * off - ex * 0.45 + ey * 0.9, cay + ex * off - ey * 0.45 - ex * 0.9],
      ];
      const geo = desdePoligono(contorno, (q) => altura(q) + PINTURA_ALTURA);
      if (geo) piezas.push(geo);
    }
  }

  // Eje discontinuo: trazo de 30 m y hueco de 20, que es la proporción real.
  // Con hueco de 30 parecía la línea de una carretera.
  for (let d = 190; d < largo - 190; d += 50) raya(d, 0, 30, 0.9);

  // Teclas de piano, y **el número de barras no es decorativo**: dice el
  // ancho de la pista de un vistazo. Son pares, con anchura y separación
  // fijas de metro ochenta, y salen doce en una pista de 45 metros, dieciséis
  // en una de 60. Iban ocho a ojo, con la anchura escalada con la pista, que
  // es justo lo que hace que dejen de significar nada.
  const BARRA = 1.8;
  const PASO = BARRA * 2;      // barra y hueco, los dos de metro ochenta
  const HUECO_CENTRAL = 3.6;   // el eje se deja libre
  // Doce barras en una pista de 45 m, dieciséis en una de 60, ocho en una de
  // 30. Es lo que sale de repartir con paso fijo, y por eso contarlas dice el
  // ancho.
  const barras = Math.max(4, 2 * Math.round(ancho / (2 * PASO * 1.04)));
  for (const d of [BARRA * 9, largo - BARRA * 9]) {
    for (let k = 0; k < barras / 2; k++) {
      const lado = HUECO_CENTRAL / 2 + BARRA / 2 + k * PASO;
      raya(d, -lado, 30, BARRA);
      raya(d, lado, 30, BARRA);
    }
  }

  // Punto de toma: los dos rectángulos gordos a cuatrocientos metros del
  // umbral. Son la referencia visual de dónde apuntar en la aproximación, y
  // en un aeropuerto grande se ven desde muy lejos.
  for (const desde of [0, largo]) {
    const sentido = desde === 0 ? 1 : -1;
    for (const lado of [-1, 1]) {
      raya(desde + sentido * 400, lado * (ancho * 0.24), 50, 7);
    }
  }

  // Zona de toma: parejas de barras cada ciento cincuenta metros a partir de
  // los ciento cincuenta. Dicen cuánta pista queda gastada mientras se rueda.
  for (const desde of [0, largo]) {
    const sentido = desde === 0 ? 1 : -1;
    for (const d of [150, 550, 700]) {
      for (const lado of [-1, 1]) {
        raya(desde + sentido * d, lado * (ancho * 0.24), 22.5, 3);
      }
    }
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
    const p = sobreElEje(pista.centerline, alRevés ? largoEje - d : d);
    if (!p) continue;
    const sentido = alRevés ? -1 : 1;
    const dirX = p[2] * sentido;
    const dirY = p[3] * sentido;
    geo.rotateY(Math.atan2(-dirX, dirY) + (d > largo / 2 ? Math.PI : 0));
    const cx = p[0];
    const cy = p[1];
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
