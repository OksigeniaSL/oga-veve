/**
 * La granja alrededor de la pista de casa.
 *
 * Yvytu Rape era una franja de hierba con tres prismas grises al lado —el
 * hangar, «la casa» y un galpón hechos del mismo hormigón que la terminal de
 * un aeropuerto— sobre la fotografía borrosa de satélite. Se aterrizaba en
 * una granja y no se veía ninguna. «Hay que mejorar el entorno, quiero que
 * sea bonito.»
 *
 * Lo que hay ahora es lo que tiene una granja de San Pedro, y en el sitio en
 * que lo tiene:
 *
 * - **La casa**, encalada, con tejas y su corredor delante; **el galpón**
 *   abierto con techo de zinc y el tractor dentro; el **hangar** de chapa con
 *   la boca a la plataforma; el **tanque** de agua subido a sus patas, y el
 *   **corral** de palos al lado del galpón.
 * - **Los potreros**, cerrados con **alambrado**: postes de madera y tres
 *   hilos. La pista está en uno de ellos, sin valla alrededor, como casi
 *   todas: por eso sale la vaca en la pista, y por eso antes de entrar se
 *   mira.
 * - **El camino de tierra colorada**, que es el color del suelo de San Pedro
 *   y lo primero que se reconoce desde el aire, con los lapachos a los dos
 *   lados; en septiembre, en flor.
 * - **Los árboles del sitio**: mangos a la sombra de la casa, naranjos en
 *   fila, pindós, karanday en los potreros y timbós, que son el árbol bajo el
 *   que se echa el ganado.
 * - **El tajamar**, donde bebe el ganado: en el bajo del potrero, que es donde
 *   se junta el agua y donde lo cavaría cualquiera.
 * - **Y el ganado**, pastando: blanco de raza nelore casi todo, algún pardo y
 *   algún negro, que es lo que hay en los potreros del país. Se mueve: pasta
 *   con la cabeza abajo, levanta la cabeza, camina un trecho y vuelve a
 *   pastar.
 *
 * ## Barato a propósito
 *
 * Todo lo que no se mueve va **en una sola malla** con el color en cada
 * vértice: la casa, el galpón, cada poste y cada árbol. Una llamada de
 * dibujo. Lo que no puede ir ahí va aparte y es poco: el agua, que brilla;
 * las sombras, que son transparentes; los hilos del alambrado, que son
 * líneas; y el ganado, dos mallas instanciadas que se recolocan cada
 * fotograma. Siete llamadas y unos quince mil triángulos para la granja
 * entera. Sin texturas, como el resto del juego.
 *
 * ## Dónde va cada cosa
 *
 * En los ejes de la pista: a lo largo de ella desde su centro, y de través
 * hacia la plataforma. La casa, el hangar y el galpón ya estaban en el
 * fichero del aeródromo con su planta; lo demás se coloca alrededor con las
 * reglas de una granja de verdad —el casco junto a las construcciones, los
 * potreros detrás, el camino saliendo del casco hacia fuera— y **nunca en la
 * franja ni bajo las superficies de aproximación**: un árbol que asoma por la
 * senda no se planta, como no lo plantaría quien cuida una pista.
 */

import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  OctahedronGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Aerodrome, Punto } from "./aerodrome";
import { mulberry32 } from "./noise";
import type { PinturaEncima } from "./grano";

/** Cota del terreno en coordenadas de mundo del campo. */
export type Cota = (x: number, z: number) => number;

/** Lo que el juego necesita de la granja. */
export interface Granja {
  readonly grupo: Group;
  /**
   * Un fotograma: el ganado pasta y camina. `ojo` es dónde está quien mira,
   * en las coordenadas del campo; lejos, no se mueve nada, que no lo ve nadie.
   */
  paso(dt: number, ojo: { readonly x: number; readonly z: number }): void;
  /**
   * Si en ese punto ya hay algo de la granja: el casco, el camino o el
   * tajamar. Para que el monte de alrededor no plante un árbol en la cocina.
   */
  ocupa(x: number, z: number): boolean;
  /**
   * Los potreros pintados, para ponerlos en el sombreador del terreno sobre
   * el que va la granja. `null` sin navegador. Ver `potrerosDe`.
   */
  readonly pintura: PinturaEncima | null;
  dispose(): void;
}

/* ── Los colores ──────────────────────────────────────────────────────────
 *
 * Mate y un punto cálidos, que es como se ve todo a media tarde. Ninguno es
 * saturado: la fotografía de alrededor no lo es, y un objeto chillón encima
 * de ella se lee como una pegatina.
 */
const CAL = 0xece5d3;
const ZOCALO = 0x9a5a3e;
const TEJA = 0xb0553b;
const TEJA_DEBAJO = 0x6d4a38;
const MADERA = 0x6b4a2e;
const MADERA_CLARA = 0x8a6a48;
const POSTIGO = 0x3e6a58;
const PUERTA = 0x55392a;
const LADRILLO = 0x9f5a40;
const CHAPA = 0xb9bfc1;
const CHAPA_TECHO = 0x9aa2a6;
const BOCA_DEL_HANGAR = 0x2b2e31;
const ZINC = 0xa3abae;
const TRACTOR = 0xb3332a;
const NEUMATICO = 0x232323;
const TANQUE = 0xdde0da;
const HIERRO = 0x4a4c4e;
/** La tierra colorada de San Pedro. */
const TIERRA = 0xa8603c;
const BARRO = 0x86573c;
const POSTE = 0x6e5236;
const HILO = 0x55544f;
const AGUA = 0x4d6a6b;

/* ── Los árboles ──────────────────────────────────────────────────────── */
const TRONCO = 0x5d4633;
const TRONCO_GRIS = 0x8b8474;
const HOJA_MANGO = 0x2e5b2b;
const HOJA_NARANJO = 0x325e2c;
const NARANJA = 0xef8a1d;
const HOJA_PINDO = 0x5f8b3b;
const HOJA_KARANDAY = 0x7c9b4d;
const HOJA_TIMBO = 0x537f3c;
const HOJA_LAPACHO = 0x4e7c3d;
/** El rosa del lapacho en flor: el de los que florecen en los caminos. */
const FLOR_LAPACHO = 0xdf7fb2;

/**
 * Si el lapacho está en flor: de julio a septiembre.
 *
 * Es el acontecimiento del año en el campo paraguayo y se ve desde el aire
 * —laderas y caminos enteros de rosa—, pero es **un mes del calendario**, no
 * un adorno. En noviembre un lapacho rosa sería una mentira bonita. Con la
 * fecha de quien juega, como la hora del cielo.
 */
export function lapachoEnFlor(fecha: Date): boolean {
  const mes = fecha.getMonth() + 1;
  return mes >= 7 && mes <= 9;
}

/* ── Los ejes de la pista ─────────────────────────────────────────────── */

interface Marco {
  /** Del marco al mundo: `a` a lo largo desde el centro, `c` de través. */
  mundo(a: number, c: number): [number, number];
  /** Y del mundo al marco. */
  marco(x: number, z: number): [number, number];
  /** Lo que se gira un objeto para que su X local vaya a lo largo de la pista. */
  readonly giro: number;
  readonly semilargo: number;
  readonly semiancho: number;
}

/**
 * Los ejes de la pista principal, con el través **hacia la plataforma**: así
 * «delante» y «detrás» del casco quieren decir lo mismo en cualquier campo.
 */
function marcoDe(aero: Aerodrome): Marco | null {
  const pista = aero.runways[0];
  const p0 = pista?.centerline[0];
  const p1 = pista?.centerline[pista.centerline.length - 1];
  if (!pista || !p0 || !p1) return null;
  // Del fichero al mundo: la Y del norte es la Z negativa.
  const ax = p0[0];
  const az = -p0[1];
  const bx = p1[0];
  const bz = -p1[1];
  const largo = Math.hypot(bx - ax, bz - az);
  if (largo < 1) return null;
  const ux = (bx - ax) / largo;
  const uz = (bz - az) / largo;
  const mx = (ax + bx) / 2;
  const mz = (az + bz) / 2;
  let nx = -uz;
  let nz = ux;
  const plataforma = aero.aprons[0]?.polygon;
  if (plataforma?.length) {
    const [cx, cz] = centroDelMundo(plataforma);
    if ((cx - mx) * nx + (cz - mz) * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
  }
  return {
    mundo: (a, c) => [mx + a * ux + c * nx, mz + a * uz + c * nz],
    marco: (x, z) => [
      (x - mx) * ux + (z - mz) * uz,
      (x - mx) * nx + (z - mz) * nz,
    ],
    giro: Math.atan2(-uz, ux),
    semilargo: largo / 2,
    semiancho: (pista.widthM ?? 18) / 2,
  };
}

/** El centro de una planta del fichero, ya en el mundo. */
function centroDelMundo(poligono: readonly Punto[]): [number, number] {
  // El último punto repite el primero: no cuenta dos veces.
  const n =
    poligono.length > 1 &&
    poligono[0]![0] === poligono[poligono.length - 1]![0] &&
    poligono[0]![1] === poligono[poligono.length - 1]![1]
      ? poligono.length - 1
      : poligono.length;
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    x += poligono[i]![0];
    y += poligono[i]![1];
  }
  return [x / n, -y / n];
}

/** El giro que lleva la X local de un objeto a la dirección `(dx, dz)`. */
function giroHacia(dx: number, dz: number): number {
  return Math.atan2(-dz, dx);
}

/* ── La obra: todo lo quieto, en una malla ────────────────────────────── */

const _q = new Quaternion();
const _v = new Vector3();
const _e = new Vector3();
const ARRIBA = new Vector3(0, 1, 0);

/**
 * Donde se van juntando las piezas quietas, cada una con su color.
 *
 * El color va **en el vértice** y no en el material, que es lo que permite
 * que la casa, los postes y los árboles sean una sola llamada de dibujo. Lo
 * usa también el servicio de fauna del aeropuerto: ver
 * `fauna-del-aeropuerto.ts`.
 */
export class Obra {
  private readonly piezas: BufferGeometry[] = [];

  /** Una pieza de un color, colocada con `m`. La geometría no se toca. */
  poner(geo: BufferGeometry, color: number, m: Matrix4): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (g.getAttribute("uv")) g.deleteAttribute("uv");
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    g.applyMatrix4(m);
    const n = g.getAttribute("position").count;
    const c = new Color(color);
    const colores = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      colores[i * 3] = c.r;
      colores[i * 3 + 1] = c.g;
      colores[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new Float32BufferAttribute(colores, 3));
    this.piezas.push(g);
  }

  /** Una caja de `ancho × alto × fondo` con su base en `(x, y, z)`, girada. */
  caja(
    ancho: number,
    alto: number,
    fondo: number,
    color: number,
    donde: Matrix4,
    x = 0,
    y = 0,
    z = 0,
  ): void {
    const g = new BoxGeometry(ancho, alto, fondo);
    g.translate(x, y + alto / 2, z);
    this.poner(g, color, donde);
    g.dispose();
  }

  /** Triángulos sueltos en coordenadas ya puestas, de un color. */
  triangulos(vertices: readonly number[], color: number, m?: Matrix4): void {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    this.poner(g, color, m ?? new Matrix4());
    g.dispose();
  }

  fundir(): BufferGeometry | null {
    if (!this.piezas.length) return null;
    const junta = mergeGeometries(this.piezas, false);
    for (const p of this.piezas) p.dispose();
    this.piezas.length = 0;
    return junta;
  }
}

/** La matriz de un objeto en `(x, y, z)`, girado `giro` y a escala `e`. */
export function aqui(x: number, y: number, z: number, giro = 0, e = 1): Matrix4 {
  _q.setFromAxisAngle(ARRIBA, giro);
  return new Matrix4().compose(_v.set(x, y, z), _q, _e.set(e, e, e));
}

/* ── Las construcciones ───────────────────────────────────────────────── */

/**
 * Una planta rectangular del fichero, leída como caja: centro, largo, ancho,
 * giro, y **qué lado mira a la plataforma**, que es el de delante.
 */
interface Planta {
  readonly x: number;
  readonly z: number;
  readonly largo: number;
  readonly ancho: number;
  /** El giro con el que el frente —la Z local positiva— mira a la plataforma. */
  readonly giro: number;
}

function plantaDe(
  poligono: readonly Punto[],
  haciaLaPlataforma: [number, number],
): Planta | null {
  if (poligono.length < 4) return null;
  const [p0, p1, p2] = poligono.map((p) => [p[0], -p[1]] as const);
  if (!p0 || !p1 || !p2) return null;
  const e1 = [p1[0] - p0[0], p1[1] - p0[1]] as const;
  const e2 = [p2[0] - p1[0], p2[1] - p1[1]] as const;
  const l1 = Math.hypot(e1[0], e1[1]);
  const l2 = Math.hypot(e2[0], e2[1]);
  const [largo, ancho, eje] = l1 >= l2 ? [l1, l2, e1] : [l2, l1, e2];
  const x = (p0[0] + p2[0]) / 2;
  const z = (p0[1] + p2[1]) / 2;
  let giro = giroHacia(eje[0], eje[1]);
  // La Z local, girada: (sen g, cos g). Si no mira a la plataforma, media vuelta.
  const [hx, hz] = haciaLaPlataforma;
  if ((hx - x) * Math.sin(giro) + (hz - z) * Math.cos(giro) < 0) giro += Math.PI;
  return { x, z, largo, ancho, giro };
}

/** La cota de apoyo de una planta: la del punto más bajo, como un edificio. */
function apoyo(p: Planta, cota: Cota): number {
  const c = Math.cos(p.giro);
  const s = Math.sin(p.giro);
  let y = Infinity;
  for (const [a, b] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [0, 0],
  ] as const) {
    const lx = (a * p.largo) / 2;
    const lz = (b * p.ancho) / 2;
    y = Math.min(y, cota(p.x + lx * c + lz * s, p.z - lx * s + lz * c));
  }
  return y;
}

/**
 * Un tejado a dos aguas sobre `largo × ancho`, con la cumbrera a lo largo, y
 * su cara de abajo, que es lo que se ve desde el corredor.
 */
function tejado(
  obra: Obra,
  m: Matrix4,
  largo: number,
  ancho: number,
  aleros: number,
  alero: number,
  cumbre: number,
  color: number,
  debajo: number,
): void {
  const x = largo / 2 + aleros;
  const z = ancho / 2 + aleros;
  const lado = (s: number): number[] => [
    -x, alero, s * z, x, alero, s * z, x, cumbre, 0,
    -x, alero, s * z, x, cumbre, 0, -x, cumbre, 0,
  ];
  const arriba = [...lado(1), ...invertir(lado(-1))];
  obra.triangulos(arriba, color, m);
  obra.triangulos(invertir(arriba), debajo, m);
}

/** Da la vuelta a cada triángulo, para ver la cara de detrás. */
function invertir(v: readonly number[]): number[] {
  const r: number[] = [];
  for (let i = 0; i < v.length; i += 9)
    r.push(...v.slice(i, i + 3), ...v.slice(i + 6, i + 9), ...v.slice(i + 3, i + 6));
  return r;
}

/** El hastial: el triángulo de pared bajo cada punta del tejado. */
function hastiales(
  obra: Obra,
  m: Matrix4,
  largo: number,
  ancho: number,
  desde: number,
  hasta: number,
  color: number,
): void {
  const x = largo / 2;
  const z = ancho / 2;
  // Por las dos caras: así no hay que acertar hacia dónde mira cada uno.
  const t = [x, desde, z, x, desde, -z, x, hasta, 0, -x, desde, -z, -x, desde, z, -x, hasta, 0];
  obra.triangulos([...t, ...invertir(t)], color, m);
}

/**
 * La casa: encalada, con zócalo, tejas y **corredor delante**.
 *
 * El corredor es lo que hace paraguaya a una casa de campo: el tejado baja
 * por delante sobre unos postes de madera y debajo se vive. Y va del lado de
 * la plataforma, que es por donde se llega y desde donde se ve aterrizar.
 */
function casa(obra: Obra, p: Planta, y: number): void {
  const m = aqui(p.x, y, p.z, p.giro);
  const pared = 3;
  const corredor = Math.min(3, p.ancho * 0.3);
  const fondo = p.ancho - corredor;
  const zc = -corredor / 2;
  obra.caja(p.largo, pared, fondo, CAL, m, 0, 0, zc);
  obra.caja(p.largo + 0.06, 0.5, fondo + 0.06, ZOCALO, m, 0, 0, zc);
  // El suelo del corredor, de ladrillo.
  obra.caja(p.largo, 0.22, corredor, LADRILLO, m, 0, 0, p.ancho / 2 - corredor / 2);
  const cumbre = pared + Math.max(1.8, p.ancho * 0.16);
  const aleros = 0.5;
  const alero = pared - 0.25;
  tejado(obra, m, p.largo, p.ancho, aleros, alero, cumbre, TEJA, TEJA_DEBAJO);
  /*
   * El hastial va sobre el cuerpo de la casa, no sobre el corredor: la
   * cumbrera está en medio del tejado entero y el cuerpo va corrido hacia
   * atrás, así que el triángulo no es simétrico. Debajo del tejado del
   * corredor, aire.
   */
  const bajoElTejado = (z: number): number =>
    cumbre - ((cumbre - alero) * Math.abs(z)) / (p.ancho / 2 + aleros) - 0.08;
  const atras = -p.ancho / 2;
  const delante = p.ancho / 2 - corredor;
  for (const x of [-p.largo / 2, p.largo / 2]) {
    const t = [
      x, pared, atras, x, pared, delante, x, bajoElTejado(delante), delante,
      x, pared, atras, x, bajoElTejado(delante), delante, x, bajoElTejado(0), 0,
      x, pared, atras, x, bajoElTejado(0), 0, x, bajoElTejado(atras), atras,
    ];
    obra.triangulos([...t, ...invertir(t)], CAL, m);
  }
  // Los postes del corredor, cada tres metros.
  const postes = Math.max(2, Math.round(p.largo / 3) + 1);
  for (let i = 0; i < postes; i++) {
    const x = -p.largo / 2 + 0.3 + (i * (p.largo - 0.6)) / (postes - 1);
    obra.caja(0.18, pared - 0.25, 0.18, MADERA, m, x, 0.2, p.ancho / 2 - 0.3);
  }
  // Puerta y ventanas con sus postigos verdes, delante y detrás.
  const frente = zc + fondo / 2 + 0.04;
  const espalda = zc - fondo / 2 - 0.04;
  obra.caja(1.1, 2.2, 0.1, PUERTA, m, 0, 0.2, frente);
  for (const x of [-p.largo / 4, p.largo / 4]) {
    obra.caja(1.2, 1.2, 0.1, POSTIGO, m, x, 1.05, frente);
    obra.caja(1.2, 1.2, 0.1, POSTIGO, m, x, 1.05, espalda);
  }
  for (const x of [-p.largo / 2 - 0.04, p.largo / 2 + 0.04])
    obra.caja(0.1, 1.1, 1.1, POSTIGO, m, x, 1.1, zc);
}

/**
 * El hangar: chapa, techo a dos aguas y **la boca abierta a la plataforma**.
 * Oscura por dentro, que es lo que dice «aquí se guarda el avión».
 */
function hangar(obra: Obra, p: Planta, y: number, alto: number): void {
  const m = aqui(p.x, y, p.z, p.giro);
  const pared = alto * 0.68;
  obra.caja(p.largo, pared, p.ancho, CHAPA, m);
  tejado(obra, m, p.largo, p.ancho, 0.4, pared - 0.1, alto, CHAPA_TECHO, HIERRO);
  hastiales(obra, m, p.largo, p.ancho, pared, alto - 0.05, CHAPA);
  obra.caja(p.largo * 0.78, pared * 0.86, 0.1, BOCA_DEL_HANGAR, m, 0, 0, p.ancho / 2 + 0.05);
}

/**
 * El galpón: abierto, postes y techo de zinc, con la pared de ladrillo del
 * fondo y el tractor a la sombra.
 */
function galpon(obra: Obra, p: Planta, y: number, alto: number): void {
  const m = aqui(p.x, y, p.z, p.giro);
  const pared = Math.max(2.8, alto - 1.2);
  for (const x of [-p.largo / 2 + 0.2, 0, p.largo / 2 - 0.2])
    for (const z of [-p.ancho / 2 + 0.2, p.ancho / 2 - 0.2])
      obra.caja(0.22, pared, 0.22, MADERA_CLARA, m, x, 0, z);
  obra.caja(p.largo, pared * 0.55, 0.25, LADRILLO, m, 0, 0, -p.ancho / 2 + 0.15);
  tejado(obra, m, p.largo, p.ancho, 0.5, pared - 0.2, alto, ZINC, HIERRO);
  // El tractor, rojo, mirando a la salida.
  const t = aqui(p.x, y, p.z, p.giro).multiply(aqui(p.largo * 0.12, 0, 0.6));
  obra.caja(2.2, 1.0, 1.0, TRACTOR, t, 0.1, 0.7, 0);
  obra.caja(1.0, 0.9, 1.0, TRACTOR, t, -0.6, 1.7, 0);
  const rueda = (r: number, ancho: number, x: number, z: number): void => {
    const g = new CylinderGeometry(r, r, ancho, 10);
    g.rotateX(Math.PI / 2);
    g.translate(x, r, z);
    obra.poner(g, NEUMATICO, t);
    g.dispose();
  };
  rueda(0.75, 0.45, -0.75, 0.75);
  rueda(0.75, 0.45, -0.75, -0.75);
  rueda(0.42, 0.3, 1.0, 0.62);
  rueda(0.42, 0.3, 1.0, -0.62);
  obra.caja(0.08, 0.9, 0.08, HIERRO, t, 0.8, 1.6, 0.3);
}

/** El tanque de agua, subido a sus cuatro patas: el que da presión a la casa. */
function tanque(obra: Obra, x: number, y: number, z: number, giro: number): void {
  const m = aqui(x, y, z, giro);
  const alto = 7;
  for (const a of [-0.9, 0.9])
    for (const b of [-0.9, 0.9]) obra.caja(0.2, alto, 0.2, HIERRO, m, a, 0, b);
  obra.caja(2.4, 0.2, 2.4, HIERRO, m, 0, alto, 0);
  const cuerpo = new CylinderGeometry(1.25, 1.25, 2.3, 10);
  cuerpo.translate(0, alto + 0.2 + 1.15, 0);
  obra.poner(cuerpo, TANQUE, m);
  cuerpo.dispose();
  const tapa = new ConeGeometry(1.35, 0.6, 10);
  tapa.translate(0, alto + 0.2 + 2.3 + 0.3, 0);
  obra.poner(tapa, TANQUE, m);
  tapa.dispose();
}

/** El corral de palos: postes cada tres metros y tres travesaños. */
function corral(
  obra: Obra,
  x: number,
  z: number,
  giro: number,
  largo: number,
  ancho: number,
  cota: Cota,
): void {
  const c = Math.cos(giro);
  const s = Math.sin(giro);
  const enMundo = (lx: number, lz: number): [number, number] => [
    x + lx * c + lz * s,
    z - lx * s + lz * c,
  ];
  const esquinas: [number, number][] = [
    [-largo / 2, -ancho / 2],
    [largo / 2, -ancho / 2],
    [largo / 2, ancho / 2],
    [-largo / 2, ancho / 2],
  ];
  for (let i = 0; i < 4; i++) {
    const a = esquinas[i]!;
    const b = esquinas[(i + 1) % 4]!;
    const [ax, az] = enMundo(a[0], a[1]);
    const [bx, bz] = enMundo(b[0], b[1]);
    const lado = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(lado / 3));
    for (let k = 0; k < n; k++) {
      const px = ax + ((bx - ax) * k) / n;
      const pz = az + ((bz - az) * k) / n;
      obra.caja(0.2, 1.7, 0.2, MADERA, aqui(px, cota(px, pz) - 0.1, pz, giro));
    }
    const y = Math.min(cota(ax, az), cota(bx, bz));
    const g = giroHacia(bx - ax, bz - az);
    for (const h of [0.5, 0.95, 1.4])
      obra.caja(lado, 0.12, 0.08, MADERA_CLARA, aqui((ax + bx) / 2, y, (az + bz) / 2, g), 0, h, 0);
  }
}

/* ── Los árboles ──────────────────────────────────────────────────────── */

type Especie = "mango" | "naranjo" | "pindo" | "karanday" | "lapacho" | "timbo";

/** Cuánto alto llega cada especie, a escala uno: lo que mira la senda. */
const ALTO: Record<Especie, number> = {
  mango: 10,
  naranjo: 4,
  pindo: 13,
  karanday: 11,
  lapacho: 10,
  timbo: 15,
};

/** El radio de la sombra de cada una, a escala uno. */
const SOMBRA: Record<Especie, number> = {
  mango: 6,
  naranjo: 2.2,
  pindo: 2.6,
  karanday: 2.4,
  lapacho: 4.6,
  timbo: 11,
};

/**
 * Un árbol, en piezas de colores. Pocos triángulos y con la silueta de su
 * especie, que es lo que se reconoce: el mango, un bulto oscuro y redondo; el
 * timbó, un paraguas enorme; el pindó, un penacho; el lapacho, una nube rosa.
 */
function arbol(
  obra: Obra,
  especie: Especie,
  x: number,
  y: number,
  z: number,
  escala: number,
  giro: number,
  enFlor: boolean,
  azar: () => number,
): void {
  const m = aqui(x, y, z, giro, escala);
  const pieza = (g: BufferGeometry, color: number): void => {
    obra.poner(g, color, m);
    g.dispose();
  };
  const tronco = (r0: number, r1: number, alto: number, color = TRONCO): void => {
    const g = new CylinderGeometry(r1, r0, alto, 5, 1, true);
    g.translate(0, alto / 2, 0);
    pieza(g, color);
  };
  const bola = (
    rx: number,
    ry: number,
    rz: number,
    cx: number,
    cy: number,
    cz: number,
    color: number,
  ): void => {
    const g = new IcosahedronGeometry(1, 0);
    g.scale(rx, ry, rz);
    g.translate(cx, cy, cz);
    pieza(g, color);
  };
  switch (especie) {
    case "mango":
      tronco(0.55, 0.35, 3.4);
      bola(5.4, 4, 5.4, 0, 6, 0, HOJA_MANGO);
      bola(3.4, 2.8, 3.4, 1.8, 7.4, -1.2, HOJA_MANGO);
      break;
    case "naranjo": {
      tronco(0.17, 0.12, 1.1);
      bola(1.9, 1.7, 1.9, 0, 2.3, 0, HOJA_NARANJO);
      // Unas naranjas por fuera de la copa: de cerca es lo que dice qué árbol es.
      for (let i = 0; i < 5; i++) {
        const a = azar() * Math.PI * 2;
        const h = 1.7 + azar() * 1.1;
        const g = new OctahedronGeometry(0.17, 0);
        g.translate(Math.cos(a) * 1.75, h, Math.sin(a) * 1.75);
        pieza(g, NARANJA);
      }
      break;
    }
    case "pindo":
    case "karanday": {
      const alto = especie === "pindo" ? 11 : 9.5;
      tronco(0.24, 0.18, alto, TRONCO_GRIS);
      if (especie === "karanday") {
        // Hojas en abanico: una copa redonda y gris verdosa.
        bola(2.3, 1.7, 2.3, 0, alto + 0.6, 0, HOJA_KARANDAY);
        break;
      }
      // El pindó, en penacho: siete hojas que se arquean y caen.
      const hojas: number[] = [];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + azar() * 0.4;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const base = [0, alto, 0];
        const punta = [c * 3.3, alto - 1.7, s * 3.3];
        const medio = (lado: number): number[] => [
          c * 1.6 - s * 0.5 * lado,
          alto + 0.45,
          s * 1.6 + c * 0.5 * lado,
        ];
        const t = [...base, ...medio(1), ...punta, ...base, ...punta, ...medio(-1)];
        hojas.push(...t, ...invertir(t));
      }
      obra.triangulos(hojas, HOJA_PINDO, m);
      break;
    }
    case "lapacho": {
      tronco(0.42, 0.28, 5.2);
      const copa = enFlor ? FLOR_LAPACHO : HOJA_LAPACHO;
      bola(4.2, 2.6, 4.2, 0, 7, 0, copa);
      bola(2.8, 2, 2.8, 1.8, 8.2, 1.2, copa);
      bola(2.6, 1.8, 2.6, -1.9, 7.8, -1.1, copa);
      break;
    }
    case "timbo": {
      tronco(1.2, 0.85, 4.2);
      // Tres ramas gruesas que se abren: es lo que sostiene el paraguas.
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const g = new CylinderGeometry(0.35, 0.6, 6.5, 5, 1, true);
        g.translate(0, 3.25, 0);
        g.rotateZ(-0.6);
        g.rotateY(a);
        g.translate(0, 3.6, 0);
        pieza(g, TRONCO);
      }
      bola(11.5, 3.4, 11.5, 0, 10.5, 0, HOJA_TIMBO);
      bola(5.5, 2.4, 5.5, 5.5, 11.2, 3, HOJA_TIMBO);
      bola(5, 2.2, 5, -5, 11, -3.5, HOJA_TIMBO);
      break;
    }
  }
}

/* ── Las sombras ──────────────────────────────────────────────────────── */

/**
 * Las sombras de los árboles, como manchas suaves en el suelo.
 *
 * En este juego no hay sombras proyectadas —cuestan fotogramas en una
 * tablet—, y sin nada debajo un árbol parece posado encima de la foto. Una
 * mancha oscura que se desvanece hacia el borde es lo que hace que esté
 * **plantado**: es la sombra de copa de mediodía, que es la que tiene todo
 * árbol a cualquier hora, más o menos.
 */
class Sombras {
  private readonly v: number[] = [];
  private readonly c: number[] = [];

  poner(x: number, z: number, r: number, fuerza: number, cota: Cota): void {
    const lados = 10;
    const y0 = cota(x, z) + ALZADO;
    const borde: [number, number, number][] = [];
    for (let i = 0; i < lados; i++) {
      const a = (i / lados) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      borde.push([px, cota(px, pz) + ALZADO, pz]);
    }
    for (let i = 0; i < lados; i++) {
      const a = borde[i]!;
      const b = borde[(i + 1) % lados]!;
      // Hacia arriba: el centro, el siguiente y el de antes.
      this.v.push(x, y0, z, ...b, ...a);
      this.c.push(0, 0, 0, fuerza, 0, 0, 0, 0, 0, 0, 0, 0);
    }
  }

  malla(): Mesh | null {
    if (!this.v.length) return null;
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.v, 3));
    g.setAttribute("color", new Float32BufferAttribute(this.c, 4));
    const malla = new Mesh(
      g,
      new MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
      }),
    );
    malla.name = "granja:sombras";
    malla.renderOrder = 1;
    return malla;
  }
}

/**
 * Cuánto se levanta del suelo lo que va pegado a él, m.
 *
 * Lo mismo que el pavimento del aeródromo, y por lo mismo: el suelo que se ve
 * es una malla de triángulos de treinta metros y la cota que se pregunta es
 * una interpolación, y entre las dos hay unos centímetros que se comen una
 * cinta pegada a ras.
 */
const ALZADO = 0.3;

/**
 * El material de los hilos del alambrado, **que se apagan con la distancia**.
 *
 * Una línea mide un píxel a cualquier distancia, y un alambre de verdad no:
 * a doscientos metros no se ve. Pintados sin más, los potreros salían
 * cuadriculados con rayas claras, como un plano de catastro encima de la
 * foto. Así se ven de cerca —rodando, al lado del alambrado— y desde el aire
 * no, que es lo que pasa: desde arriba un potrero se reconoce por el color de
 * la hierba, no por el alambre.
 */
function hilosQueSeApagan(): LineBasicMaterial {
  const m = new LineBasicMaterial({
    color: HILO,
    transparent: true,
    depthWrite: false,
  });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vLejos;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvLejos = -mvPosition.z;",
      );
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vLejos;")
      .replace(
        "#include <dithering_fragment>",
        "#include <dithering_fragment>\ngl_FragColor.a *= 1.0 - smoothstep(50.0, 160.0, vLejos);",
      );
  };
  return m;
}

/* ── El suelo: el camino y la orilla del tajamar ──────────────────────── */

/** Una cinta sobre el terreno a lo largo de `puntos`, de `ancho` metros. */
function cinta(
  obra: Obra,
  puntos: readonly [number, number][],
  ancho: number,
  color: number,
  cota: Cota,
): void {
  const tramo = 6;
  const finos: [number, number][] = [];
  for (let i = 1; i < puntos.length; i++) {
    const [ax, az] = puntos[i - 1]!;
    const [bx, bz] = puntos[i]!;
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / tramo));
    for (let k = 0; k < n; k++)
      finos.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  finos.push(puntos[puntos.length - 1]!);
  const v: number[] = [];
  let antes: [number, number, number, number, number, number] | null = null;
  for (let i = 0; i < finos.length; i++) {
    const p = finos[i]!;
    const q = finos[Math.min(i + 1, finos.length - 1)]!;
    const o = finos[Math.max(i - 1, 0)]!;
    const dx = q[0] - o[0];
    const dz = q[1] - o[1];
    const l = Math.hypot(dx, dz) || 1;
    const nx = (-dz / l) * (ancho / 2);
    const nz = (dx / l) * (ancho / 2);
    const iz: [number, number] = [p[0] + nx, p[1] + nz];
    const de: [number, number] = [p[0] - nx, p[1] - nz];
    const ahora: [number, number, number, number, number, number] = [
      iz[0],
      cota(iz[0], iz[1]) + ALZADO,
      iz[1],
      de[0],
      cota(de[0], de[1]) + ALZADO,
      de[1],
    ];
    if (antes) {
      const [ax, ay, az, bx, by, bz] = antes;
      const [cx, cy, cz, dx2, dy, dz2] = ahora;
      v.push(ax, ay, az, bx, by, bz, cx, cy, cz, bx, by, bz, dx2, dy, dz2, cx, cy, cz);
    }
    antes = ahora;
  }
  // Hacia arriba, sea cual sea el sentido en que se dibujó.
  for (let i = 0; i < v.length; i += 9) {
    const ux = v[i + 3]! - v[i]!;
    const uz = v[i + 5]! - v[i + 2]!;
    const wx = v[i + 6]! - v[i]!;
    const wz = v[i + 8]! - v[i + 2]!;
    if (uz * wx - ux * wz < 0) {
      for (let k = 0; k < 3; k++) {
        const t = v[i + 3 + k]!;
        v[i + 3 + k] = v[i + 6 + k]!;
        v[i + 6 + k] = t;
      }
    }
  }
  obra.triangulos(v, color);
}

/* ── El ganado ────────────────────────────────────────────────────────── */

/** Más grande que una vaca de verdad, un poco: tiene que verse desde el aire. */
const TAMANO_VACA = 1.35;

/**
 * El cuerpo de una vaca nelore, mirando a la X: el lomo, la giba, las patas
 * y la cola. Con el color en el vértice —las patas más oscuras— y en blanco,
 * que el pelaje de cada una lo pone su instancia.
 */
function cuerpoDeVaca(): BufferGeometry {
  const obra = new Obra();
  const nada = new Matrix4();
  obra.caja(2.0, 0.95, 0.78, 0xffffff, nada, 0, 0.62, 0);
  // La giba del cebú, que es lo que distingue a una nelore desde lejos.
  obra.caja(0.5, 0.36, 0.5, 0xffffff, nada, 0.62, 1.5, 0);
  for (const x of [-0.72, 0.68])
    for (const z of [-0.24, 0.24]) obra.caja(0.18, 0.66, 0.18, 0x7a7670, nada, x, 0, z);
  obra.caja(0.1, 0.8, 0.08, 0x9a958e, nada, -1.02, 0.7, 0);
  const g = obra.fundir()!;
  g.scale(TAMANO_VACA, TAMANO_VACA, TAMANO_VACA);
  return g;
}

/** Dónde se articula la cabeza: la cruz, por delante de la giba. */
const CRUZ = new Vector3(0.95, 1.3, 0).multiplyScalar(TAMANO_VACA);

/** El cuello y la cabeza, con su origen en la cruz: se agachan para pastar. */
function cabezaDeVaca(): BufferGeometry {
  const obra = new Obra();
  const nada = new Matrix4();
  obra.caja(0.6, 0.42, 0.4, 0xffffff, nada, 0.25, -0.26, 0);
  obra.caja(0.55, 0.36, 0.32, 0xffffff, nada, 0.72, -0.32, 0);
  // El hocico, oscuro, y las orejas caídas del cebú.
  obra.caja(0.14, 0.24, 0.26, 0x55504a, nada, 1.02, -0.3, 0);
  obra.caja(0.12, 0.22, 0.1, 0xcfc9c0, nada, 0.55, -0.12, 0.24);
  obra.caja(0.12, 0.22, 0.1, 0xcfc9c0, nada, 0.55, -0.12, -0.24);
  const g = obra.fundir()!;
  g.scale(TAMANO_VACA, TAMANO_VACA, TAMANO_VACA);
  return g;
}

/**
 * Los pelajes, y en qué proporción: casi todo nelore blanco, que es lo que se
 * ve en los potreros del país, con algún gris, algún pardo y algún negro.
 */
const PELAJES: readonly [number, number][] = [
  [0xe8e4dc, 0.55],
  [0xc4c0b8, 0.2],
  [0x8a5a3c, 0.15],
  [0x3b3431, 0.1],
];

/** Lo que dura cada cosa que hace una vaca, s. */
const PASTA = [8, 22] as const;
const MIRA = [2, 5] as const;
/** Al paso, m/s: una vaca que camina sin prisa. */
const AL_PASO = 0.7;
/** Cuánto baja la cabeza al pastar, rad. */
const AGACHADA = -1.25;
const ERGUIDA = 0.12;

interface Vaca {
  x: number;
  z: number;
  giro: number;
  cabeza: number;
  estado: "pasta" | "mira" | "camina";
  queda: number;
  destino: [number, number];
  paso: number;
  readonly rebano: number;
}

interface Rebano {
  /** Dónde puede estar, en ejes de pista: `[a0, a1, c0, c1]`. */
  readonly zona: readonly [number, number, number, number];
  /** Y por dónde anda hoy, que se va moviendo despacio. */
  centro: [number, number];
  readonly cuantas: number;
}

/**
 * El ganado: pasta, levanta la cabeza, camina un trecho y vuelve a pastar.
 *
 * Cada rebaño anda por su potrero y **junto**: las vacas no se reparten por
 * el campo como piedras, van en grupo detrás de la mejor hierba. Así que cada
 * rebaño tiene un centro que se desplaza despacio, y cada vaca elige a dónde
 * ir cerca de él.
 */
class Ganado {
  readonly cuerpos: InstancedMesh;
  readonly cabezas: InstancedMesh;
  readonly sombras: InstancedMesh;
  private readonly vacas: Vaca[] = [];

  constructor(
    private readonly rebanos: Rebano[],
    private readonly marco: Marco,
    private readonly cota: Cota,
    private readonly libre: (x: number, z: number) => boolean,
    private readonly azar: () => number,
  ) {
    const total = rebanos.reduce((n, r) => n + r.cuantas, 0);
    const lambert = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.cuerpos = new InstancedMesh(cuerpoDeVaca(), lambert, total);
    this.cabezas = new InstancedMesh(cabezaDeVaca(), lambert, total);
    const disco = new CylinderGeometry(1.5 * TAMANO_VACA, 1.5 * TAMANO_VACA, 0.01, 8);
    disco.scale(1, 1, 0.6);
    this.sombras = new InstancedMesh(
      disco,
      new MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
      total,
    );
    for (const m of [this.cuerpos, this.cabezas, this.sombras]) {
      m.instanceMatrix.setUsage(DynamicDrawUsage);
      // Se mueven: la esfera que calcularía three.js al principio se queda
      // vieja en cuanto echan a andar, y con ella se apagarían de golpe.
      m.frustumCulled = false;
    }
    this.cuerpos.name = "granja:ganado";
    this.cabezas.name = "granja:cabezas";
    this.sombras.name = "granja:sombras-del-ganado";
    this.sombras.renderOrder = 1;

    const pelo = new Color();
    for (const [i, r] of rebanos.entries()) {
      for (let k = 0; k < r.cuantas; k++) {
        const [x, z] = this.cercaDelCentro(r);
        const n = this.vacas.length;
        let t = this.azar();
        let color = PELAJES[0]![0];
        for (const [c, p] of PELAJES) {
          if (t < p) {
            color = c;
            break;
          }
          t -= p;
        }
        pelo.set(color);
        this.cuerpos.setColorAt(n, pelo);
        this.cabezas.setColorAt(n, pelo);
        this.vacas.push({
          x,
          z,
          giro: this.azar() * Math.PI * 2,
          cabeza: AGACHADA,
          estado: "pasta",
          queda: PASTA[0] + this.azar() * (PASTA[1] - PASTA[0]),
          destino: [x, z],
          paso: this.azar() * 10,
          rebano: i,
        });
      }
    }
    if (this.cuerpos.instanceColor) this.cuerpos.instanceColor.needsUpdate = true;
    if (this.cabezas.instanceColor) this.cabezas.instanceColor.needsUpdate = true;
    this.colocar();
  }

  /** Un sitio libre cerca del centro del rebaño y dentro de su potrero. */
  private cercaDelCentro(r: Rebano): [number, number] {
    const [a0, a1, c0, c1] = r.zona;
    for (let intento = 0; intento < 12; intento++) {
      const a = Math.max(a0, Math.min(a1, r.centro[0] + (this.azar() - 0.5) * 70));
      const c = Math.max(c0, Math.min(c1, r.centro[1] + (this.azar() - 0.5) * 50));
      const [x, z] = this.marco.mundo(a, c);
      if (this.libre(x, z)) return [x, z];
    }
    return this.marco.mundo(r.centro[0], r.centro[1]);
  }

  paso(dt: number): void {
    // El rebaño se va corriendo despacio por su potrero, detrás de la hierba.
    for (const r of this.rebanos) {
      const [a0, a1, c0, c1] = r.zona;
      r.centro[0] = Math.max(a0, Math.min(a1, r.centro[0] + (this.azar() - 0.5) * dt * 1.2));
      r.centro[1] = Math.max(c0, Math.min(c1, r.centro[1] + (this.azar() - 0.5) * dt * 1.2));
    }
    for (const v of this.vacas) {
      v.queda -= dt;
      if (v.estado === "camina") {
        const dx = v.destino[0] - v.x;
        const dz = v.destino[1] - v.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.5 || v.queda <= 0) {
          v.estado = "pasta";
          v.queda = PASTA[0] + this.azar() * (PASTA[1] - PASTA[0]);
        } else {
          // Gira hacia donde va, sin volantazos, y **anda hacia donde mira**:
          // una vaca que se desliza de lado hasta encararse es un mueble.
          const quiere = giroHacia(dx, dz);
          let giro = quiere - v.giro;
          giro = Math.atan2(Math.sin(giro), Math.cos(giro));
          v.giro += giro * Math.min(1, dt * 1.5);
          const avance = Math.min(d, AL_PASO * dt * Math.max(0, Math.cos(giro)));
          v.x += Math.cos(v.giro) * avance;
          v.z -= Math.sin(v.giro) * avance;
          v.paso += dt * 5;
        }
      } else if (v.queda <= 0) {
        if (v.estado === "pasta") {
          v.estado = "mira";
          v.queda = MIRA[0] + this.azar() * (MIRA[1] - MIRA[0]);
        } else {
          v.estado = "camina";
          v.destino = this.cercaDelCentro(this.rebanos[v.rebano]!);
          v.queda = 40;
        }
      }
      // La cabeza, abajo pastando y arriba mirando o caminando, sin saltos.
      const cabeza = v.estado === "pasta" ? AGACHADA : ERGUIDA;
      v.cabeza += (cabeza - v.cabeza) * Math.min(1, dt * 1.8);
    }
    this.colocar();
  }

  /** Sin crear nada por fotograma: se recoloca el rebaño sesenta veces por segundo. */
  private readonly m = {
    cuerpo: new Matrix4(),
    cabeza: new Matrix4(),
    giro: new Matrix4(),
    cruz: new Matrix4().makeTranslation(CRUZ.x, CRUZ.y, CRUZ.z),
    q: new Quaternion(),
    e: new Vector3(1, 1, 1),
    p: new Vector3(),
  };

  private colocar(): void {
    const { cuerpo, cabeza, giro, cruz, q, e, p } = this.m;
    for (const [i, v] of this.vacas.entries()) {
      const y = this.cota(v.x, v.z);
      // Al paso, el lomo sube y baja un poco: es lo que se ve de lejos.
      const vaiven = v.estado === "camina" ? Math.abs(Math.sin(v.paso)) * 0.06 : 0;
      q.setFromAxisAngle(ARRIBA, v.giro);
      cuerpo.compose(p.set(v.x, y + vaiven, v.z), q, e);
      this.cuerpos.setMatrixAt(i, cuerpo);
      giro.makeRotationZ(v.cabeza);
      cabeza.copy(cuerpo).multiply(cruz).multiply(giro);
      this.cabezas.setMatrixAt(i, cabeza);
      cuerpo.compose(p.set(v.x, y + 0.08, v.z), q, e);
      this.sombras.setMatrixAt(i, cuerpo);
    }
    this.cuerpos.instanceMatrix.needsUpdate = true;
    this.cabezas.instanceMatrix.needsUpdate = true;
    this.sombras.instanceMatrix.needsUpdate = true;
  }
}

/* ── El plano de la granja ────────────────────────────────────────────── */

/**
 * Lo que va en cada sitio, en ejes de pista: `a` a lo largo desde su centro,
 * `c` de través hacia la plataforma.
 *
 * La pista está en su potrero, sin valla alrededor y con el ganado pastando
 * lejos de la franja. El casco —casa, hangar, galpón— al lado de la
 * plataforma, que es donde ya los ponía el fichero; los potreros detrás de él
 * y al otro lado de la pista, cada uno con su alambrado; y el camino sale del
 * casco hacia fuera por un callejón entre dos alambrados, que es como se sale
 * de una granja de verdad sin dejar escapar el ganado.
 */
const PLANO = {
  /** El potrero de la pista, de alambrado a alambrado. */
  potreroDeLaPista: { a: [-700, 700], c: [-140, 300] },
  /** Los potreros de detrás del casco. */
  norte: { c: [300, 650], divisorias: [-270] },
  /** Y los del otro lado de la pista, donde está el bajo con el tajamar. */
  sur: { c: [-520, -140], divisorias: [0] },
  /** El callejón del camino, entre sus dos alambrados. */
  callejon: [156, 174],
  /** El camino, desde detrás de la casa hasta perderse. */
  camino: [
    [165, 150],
    [165, 300],
    [165, 650],
    [210, 900],
    [300, 1300],
  ] as [number, number][],
  /** El casco: desde el hangar hasta el naranjal. */
  casco: { a: [40, 290], c: [118, 300] },
} as const;

/** La separación entre postes del alambrado, m. */
const ENTRE_POSTES = 12;

/**
 * Lo alto que puede llegar algo en `(a, c)` sin asomar por las superficies
 * de una pista **chica**, sobre la cota de la pista, m.
 *
 * Son las del Anexo 14 para una pista sin instrumentos de entre ochocientos
 * y mil doscientos metros, que es lo que es esta: franja de
 * cuarenta metros a cada lado del eje, aproximación que empieza sesenta
 * metros antes del umbral y sube uno de cada veinticinco abriéndose un diez
 * por ciento, y transición de uno de cada cinco desde el borde de las dos.
 *
 * Las del juego —`techoSobreLaPista`— son las de un aeropuerto con
 * instrumentos, con su franja de ciento cincuenta metros, y con esas no cabía
 * en el casco ni un naranjo: la casa y el hangar, que están en el fichero,
 * ya las pasaban. Una granja no se planta con las reglas de Pettirossi.
 */
function techoDeUnaPistaChica(a: number, c: number, semilargo: number): number {
  const FRANJA = 40;
  const fuera = Math.abs(a) - semilargo - 60;
  const lado = Math.abs(c);
  if (fuera > 0) {
    const semiancho = FRANJA + 0.1 * fuera;
    const cono = 0.04 * fuera;
    return lado > semiancho ? cono + 0.2 * (lado - semiancho) : cono;
  }
  return lado > FRANJA ? 0.2 * (lado - FRANJA) : 0;
}

/**
 * Monta la granja alrededor de un aeródromo que la tiene. Nada de lo que se
 * plante asoma por las superficies de su pista: ver `techoDeUnaPistaChica`.
 */
export function crearGranja(
  aero: Aerodrome,
  cota: Cota,
  fecha: Date,
  semilla: number,
): Granja | null {
  if (!aero.granja) return null;
  const marco = marcoDe(aero);
  if (!marco) return null;
  const azar = mulberry32(semilla ^ 0x6a2a);
  const obra = new Obra();
  const sombras = new Sombras();
  const enFlor = lapachoEnFlor(fecha);
  const cotaDePista = cota(...marco.mundo(0, 0));
  const plataforma = aero.aprons[0]?.polygon;
  const haciaLaPlataforma = plataforma?.length
    ? centroDelMundo(plataforma)
    : marco.mundo(0, 100);

  /*
   * **Dónde no se pone nada**: la pista y su franja, las superficies de
   * aproximación, las calles, la plataforma y las construcciones. Se pregunta
   * con la misma cuenta que usa el monte de alrededor.
   */
  const enLaFranja = (x: number, z: number): boolean => {
    const [a, c] = marco.marco(x, z);
    return Math.abs(a) < marco.semilargo + 60 && Math.abs(c) < 40;
  };
  const cercaDeLoPavimentado = (x: number, z: number, margen: number): boolean => {
    const [a, c] = marco.marco(x, z);
    for (const calle of aero.taxiways)
      for (const p of calle.path) {
        const [pa, pc] = marco.marco(p[0], -p[1]);
        if (Math.hypot(pa - a, pc - c) < margen + (calle.widthM ?? 12)) return true;
      }
    for (const pl of aero.aprons) if (dentro(pl.polygon, x, z, margen)) return true;
    for (const e of aero.buildings) if (dentro(e.polygon, x, z, margen)) return true;
    return false;
  };
  const asomaPorLaSenda = (x: number, z: number, alto: number): boolean => {
    const [a, c] = marco.marco(x, z);
    const techo = techoDeUnaPistaChica(a, c, marco.semilargo);
    return cota(x, z) + alto > cotaDePista + techo;
  };

  /* ── Las construcciones, donde las pone el fichero ── */
  let casaEn: Planta | null = null;
  for (const e of aero.buildings) {
    if (!laDibujaLaGranja(e)) continue;
    const p = plantaDe(e.polygon, haciaLaPlataforma);
    if (!p) continue;
    const y = apoyo(p, cota);
    if (e.kind === "farm") {
      casa(obra, p, y);
      casaEn = p;
    } else if (e.kind === "shed") galpon(obra, p, y, e.heightM ?? 4.5);
    else hangar(obra, p, y, e.heightM ?? 7.5);
  }
  const [casaA, casaC] = casaEn ? marco.marco(casaEn.x, casaEn.z) : [150, 140];

  /* ── El tanque y el corral, junto a la casa ── */
  {
    const [x, z] = marco.mundo(casaA - 4, casaC + 20);
    tanque(obra, x, cota(x, z), z, marco.giro);
  }
  {
    const [x, z] = marco.mundo(casaA + 45, casaC + 18);
    corral(obra, x, z, marco.giro, 18, 12, cota);
  }

  /* ── El camino de tierra colorada ── */
  const camino = PLANO.camino.map(([a, c]) => marco.mundo(a, c));
  cinta(obra, camino, 4.5, TIERRA, cota);
  const alCamino = (x: number, z: number): number => {
    let menor = Infinity;
    for (let i = 1; i < camino.length; i++)
      menor = Math.min(menor, alSegmento(x, z, camino[i - 1]!, camino[i]!));
    return menor;
  };

  /* ── El tajamar, en el bajo del potrero ── */
  const tajamar = buscarElBajo(marco, cota, PLANO.sur.c);
  const agua = tajamar ? charco(obra, tajamar, cota) : null;

  /* ── El alambrado ── */
  const postes: [number, number][] = [];
  const hilos: number[] = [];
  /** De poste a poste, para pintar la raya del alambrado en el suelo. */
  const tramosDeAlambrado: [number, number, number, number][] = [];
  const cruzaElCamino = (x: number, z: number): boolean => alCamino(x, z) < 6;
  const alambrado = (desde: [number, number], hasta: [number, number]): void => {
    const [x0, z0] = marco.mundo(desde[0], desde[1]);
    const [x1, z1] = marco.mundo(hasta[0], hasta[1]);
    const largo = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(largo / ENTRE_POSTES));
    let antes: [number, number, number] | null = null;
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n;
      const z = z0 + ((z1 - z0) * k) / n;
      // Donde pasa el camino hay tranquera, y donde hay pista o calle, nada.
      if (cruzaElCamino(x, z) || enLaFranja(x, z) || cercaDeLoPavimentado(x, z, 4)) {
        antes = null;
        continue;
      }
      const y = cota(x, z);
      postes.push([x, z]);
      if (antes) {
        for (const h of [0.55, 0.9, 1.25])
          hilos.push(antes[0], antes[1] + h, antes[2], x, y + h, z);
        tramosDeAlambrado.push([antes[0], antes[2], x, z]);
      }
      antes = [x, y, z];
    }
  };
  const [pa0, pa1] = PLANO.potreroDeLaPista.a;
  const [pc0, pc1] = PLANO.potreroDeLaPista.c;
  const [nc0, nc1] = PLANO.norte.c;
  const [sc0, sc1] = PLANO.sur.c;
  // El potrero de la pista, y los de fuera a los dos lados.
  alambrado([pa0, pc0], [pa1, pc0]);
  alambrado([pa0, pc1], [pa1, pc1]);
  alambrado([pa0, sc0], [pa1, sc0]);
  alambrado([pa0, nc1], [pa1, nc1]);
  alambrado([pa0, sc0], [pa0, nc1]);
  alambrado([pa1, sc0], [pa1, nc1]);
  for (const a of PLANO.norte.divisorias) alambrado([a, nc0], [a, nc1]);
  for (const a of PLANO.sur.divisorias) alambrado([a, sc0], [a, sc1]);
  // El callejón del camino, con un alambrado a cada lado.
  for (const a of PLANO.callejon) alambrado([a, nc0], [a, nc1]);
  // Y el casco, cerrado por detrás y por los lados.
  const [ka0, ka1] = PLANO.casco.a;
  const [kc0, kc1] = PLANO.casco.c;
  alambrado([ka0, kc0], [ka0, kc1]);
  alambrado([ka1, kc0], [ka1, kc1]);
  for (const [x, z] of postes)
    obra.caja(0.16, 1.45, 0.16, POSTE, aqui(x, cota(x, z) - 0.1, z, marco.giro));

  /* ── Los árboles ── */
  const ocupado = (x: number, z: number): boolean =>
    (tajamar !== null && Math.hypot(x - tajamar.x, z - tajamar.z) < tajamar.r + 10) ||
    alCamino(x, z) < 4;
  const plantar = (
    especie: Especie,
    a: number,
    c: number,
    escala = 0.85 + azar() * 0.35,
  ): void => {
    const [x, z] = marco.mundo(a, c);
    if (enLaFranja(x, z) || cercaDeLoPavimentado(x, z, 6) || ocupado(x, z)) return;
    if (asomaPorLaSenda(x, z, ALTO[especie] * escala)) return;
    const y = cota(x, z);
    arbol(obra, especie, x, y, z, escala, azar() * Math.PI * 2, enFlor, azar);
    sombras.poner(x, z, SOMBRA[especie] * escala, 0.3, cota);
  };
  // A la sombra de la casa, los mangos.
  plantar("mango", casaA - 22, casaC + 30, 1.05);
  plantar("mango", casaA + 2, casaC + 40, 1.1);
  plantar("mango", casaA - 50, casaC + 36, 0.95);
  // El naranjal, en filas, detrás del corral.
  for (let i = 0; i < 5; i++)
    for (let k = 0; k < 4; k++)
      plantar("naranjo", casaA + 40 + i * 7, casaC + 48 + k * 7, 0.9 + azar() * 0.2);
  /*
   * **Y la arboleda del fondo del casco.** Desde el aire una casa de campo
   * se encuentra por ella antes que por el tejado: la mancha oscura de
   * árboles que se plantan detrás para la sombra y contra el viento norte.
   */
  for (let a = ka0 + 12; a < ka1 - 8; a += 16) {
    if (Math.abs(a - 165) < 14) continue;
    plantar(azar() < 0.6 ? "mango" : "timbo", a + (azar() - 0.5) * 6, kc1 - 16 - azar() * 14, 0.75 + azar() * 0.3);
  }
  plantar("lapacho", casaA - 8, casaC + 52, 1);
  plantar("lapacho", casaA + 26, casaC + 60, 0.95);
  // Unos pindós junto a la casa y en las esquinas del casco.
  plantar("pindo", casaA + 10, casaC + 14);
  plantar("pindo", casaA + 28, casaC + 26);
  plantar("pindo", ka1 - 8, kc1 - 10);
  plantar("pindo", ka0 + 10, kc1 - 12);
  // El camino, con lapachos a los dos lados, por fuera del callejón.
  for (let c = 330; c < 1250; c += 28) {
    const [ca, cc] = sobreElCamino(PLANO.camino, c);
    plantar("lapacho", ca - 13, cc, 0.8 + azar() * 0.3);
    plantar("lapacho", ca + 13, cc + 14, 0.8 + azar() * 0.3);
  }
  // Los timbós de los potreros, donde se echa el ganado a la sombra.
  for (const [a, c] of [
    [-520, 450],
    [-80, 560],
    [420, 420],
    [-420, -330],
    [250, -420],
    [560, -260],
  ] as const)
    plantar("timbo", a + (azar() - 0.5) * 40, c + (azar() - 0.5) * 40, 0.9 + azar() * 0.3);
  // Y los karanday, en manchones: en el potrero de abajo, que es más húmedo.
  for (const [a, c] of [
    [-300, -230],
    [120, -300],
    [480, -470],
    [-600, 380],
  ] as const) {
    const cuantos = 4 + Math.floor(azar() * 4);
    for (let k = 0; k < cuantos; k++)
      plantar("karanday", a + (azar() - 0.5) * 60, c + (azar() - 0.5) * 50);
  }

  /*
   * **Las isletas de monte.** En los potreros del país no se tala todo: se
   * dejan manchas de monte donde el ganado se echa a la sombra, y desde el
   * aire son lo que dice «potrero» antes que el alambrado, que no se ve.
   */
  for (const [a, c, radio] of [
    [-460, -270, 40],
    [360, -340, 34],
    [-160, 480, 42],
    [540, 560, 30],
    [-640, 170, 28],
  ] as const) {
    const cuantos = 10 + Math.floor(azar() * 6);
    for (let k = 0; k < cuantos; k++) {
      const ang = azar() * Math.PI * 2;
      const r = Math.sqrt(azar()) * radio;
      const t = azar();
      const especie: Especie =
        t < 0.4 ? "mango" : t < 0.6 ? "timbo" : t < 0.85 ? "lapacho" : "karanday";
      const escala = especie === "timbo" ? 0.55 + azar() * 0.25 : 0.75 + azar() * 0.35;
      plantar(especie, a + Math.cos(ang) * r, c + Math.sin(ang) * r, escala);
    }
  }
  // Y algún árbol suelto junto al alambrado, que es donde no llega el arado.
  for (let a = pa0 + 40; a < pa1; a += 70 + azar() * 60)
    plantar(azar() < 0.5 ? "pindo" : "timbo", a, pc0 - 6, 0.7 + azar() * 0.3);

  /* ── Los potreros, con su color, para el sombreador del terreno ── */
  const pintura = pinturaDeLosPotreros(aero, semilla, tramosDeAlambrado);

  /* ── Lo que hay en el suelo: agua, sombras e hilos ── */
  const grupo = new Group();
  grupo.name = "granja";
  const quieto = obra.fundir();
  if (quieto) {
    const malla = new Mesh(
      quieto,
      new MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    );
    malla.name = "granja:construcciones";
    grupo.add(malla);
  }
  if (agua) grupo.add(agua);
  const manchas = sombras.malla();
  if (manchas) grupo.add(manchas);
  if (hilos.length) {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(hilos, 3));
    const lineas = new LineSegments(g, hilosQueSeApagan());
    lineas.name = "granja:alambrado";
    lineas.renderOrder = 1;
    grupo.add(lineas);
  }

  /* ── El ganado ── */
  const libreParaLaVaca = (x: number, z: number): boolean =>
    !enLaFranja(x, z) &&
    !cercaDeLoPavimentado(x, z, 10) &&
    !(tajamar && Math.hypot(x - tajamar.x, z - tajamar.z) < tajamar.r + 1);
  const rebanos: Rebano[] = [
    // En el potrero de la pista, del lado de fuera de la franja: se ven desde
    // la final, que es exactamente cuando hay que mirarlas.
    { zona: [-380, 300, pc0 + 12, -58], centro: [-120, -95], cuantas: 7 },
    { zona: [260, 640, nc0 + 15, nc1 - 15], centro: [430, 470], cuantas: 6 },
  ];
  if (tajamar) {
    const [ta, tc] = marco.marco(tajamar.x, tajamar.z);
    const lado = ta < 0 ? [pa0 + 15, -15] : [15, pa1 - 15];
    rebanos.push({
      zona: [lado[0]!, lado[1]!, sc0 + 15, sc1 - 15],
      centro: [ta + 45, tc + 20],
      cuantas: 9,
    });
  }
  const ganado = new Ganado(rebanos, marco, cota, libreParaLaVaca, azar);
  grupo.add(ganado.cuerpos, ganado.cabezas, ganado.sombras);

  /** Dónde está el casco, para que el monte de fuera no se meta. */
  const enElCasco = (x: number, z: number): boolean => {
    const [a, c] = marco.marco(x, z);
    return a > ka0 - 20 && a < ka1 + 20 && c > kc0 - 30 && c < kc1 + 20;
  };

  return {
    grupo,
    paso(dt, ojo) {
      // Lejos no se mueve nada: a tres kilómetros una vaca no es ni un píxel.
      const [a, c] = marco.marco(ojo.x, ojo.z);
      if (Math.hypot(a, c) > 3500) return;
      ganado.paso(dt);
    },
    ocupa: (x, z) => enElCasco(x, z) || ocupado(x, z),
    pintura,
    dispose() {
      pintura?.textura.dispose();
      grupo.traverse((o) => {
        if (o instanceof Mesh || o instanceof LineSegments || o instanceof InstancedMesh) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
    },
  };
}

/**
 * Si el fichero trae este edificio para que lo dibuje la granja: la casa, el
 * galpón y el hangar. Los demás siguen siendo los prismas del aeródromo.
 */
export function laDibujaLaGranja(e: { readonly kind?: string | null }): boolean {
  return e.kind === "farm" || e.kind === "shed" || e.kind === "hangar";
}

/** El punto del camino a `c` metros de través, siguiendo sus tramos. */
function sobreElCamino(
  camino: readonly (readonly [number, number])[],
  c: number,
): [number, number] {
  for (let i = 1; i < camino.length; i++) {
    const [a0, c0] = camino[i - 1]!;
    const [a1, c1] = camino[i]!;
    if (c >= c0 && c <= c1) {
      const t = (c - c0) / (c1 - c0 || 1);
      return [a0 + (a1 - a0) * t, c];
    }
  }
  const [a, cc] = camino[camino.length - 1]!;
  return [a, cc];
}

function alSegmento(
  x: number,
  z: number,
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
  return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
}

/** Si el punto del mundo cae en la planta, o a menos de `margen` de ella. */
function dentro(poligono: readonly Punto[], x: number, z: number, margen: number): boolean {
  const y = -z;
  let si = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i]!;
    const b = poligono[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
      si = !si;
  }
  if (si || margen <= 0) return si;
  for (let i = 1; i < poligono.length; i++) {
    const a = poligono[i - 1]!;
    const b = poligono[i]!;
    if (alSegmento(x, z, [a[0], -a[1]], [b[0], -b[1]]) < margen) return true;
  }
  return false;
}

/* ── El tajamar ───────────────────────────────────────────────────────── */

interface Tajamar {
  readonly x: number;
  readonly z: number;
  readonly r: number;
  readonly nivel: number;
}

/** El radio del tajamar, m: uno mediano, de los que se cavan con una pala. */
const RADIO_DEL_TAJAMAR = 24;

/**
 * El bajo del potrero, que es donde va el tajamar.
 *
 * No se elige a ojo: **se busca en el relieve medido**, porque un tajamar se
 * cava donde se junta el agua de lluvia, y eso lo decide el terreno. Se barre
 * el potrero del otro lado de la pista y se queda el punto más bajo.
 */
function buscarElBajo(
  marco: Marco,
  cota: Cota,
  entre: readonly [number, number],
): Tajamar | null {
  let mejor: { x: number; z: number; y: number } | null = null;
  for (let a = -620; a <= 620; a += 25)
    for (let c = entre[0] + 60; c <= entre[1] - 60; c += 25) {
      const [x, z] = marco.mundo(a, c);
      const y = cota(x, z);
      if (!mejor || y < mejor.y) mejor = { x, z, y };
    }
  if (!mejor) return null;
  /*
   * El agua, al nivel de lo más alto de dentro del charco y un poco más: el
   * suelo de alrededor es una malla de treinta metros y, si el agua quedara
   * por debajo de algún punto, asomaría una isla de hierba en medio.
   */
  let nivel = -Infinity;
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    for (const f of [0, 0.5, 1]) {
      const x = mejor.x + Math.cos(ang) * RADIO_DEL_TAJAMAR * f;
      const z = mejor.z + Math.sin(ang) * RADIO_DEL_TAJAMAR * f;
      nivel = Math.max(nivel, cota(x, z));
    }
  }
  return { x: mejor.x, z: mejor.z, r: RADIO_DEL_TAJAMAR, nivel: nivel + 0.15 };
}

/**
 * El agua y su orilla: la lámina, y alrededor el terraplén de tierra que
 * sale de cavarlo, pisoteado por el ganado que baja a beber.
 */
function charco(obra: Obra, t: Tajamar, cota: Cota): Mesh {
  const lados = 18;
  const borde: [number, number][] = [];
  for (let i = 0; i < lados; i++) {
    const a = (i / lados) * Math.PI * 2;
    // Irregular, que un tajamar no es un círculo de compás.
    const r = t.r * (0.86 + 0.14 * Math.sin(a * 3 + 1.3) + 0.06 * Math.cos(a * 5));
    borde.push([t.x + Math.cos(a) * r, t.z + Math.sin(a) * r]);
  }
  const lamina: number[] = [];
  for (let i = 0; i < lados; i++) {
    const a = borde[i]!;
    const b = borde[(i + 1) % lados]!;
    lamina.push(t.x, t.nivel, t.z, b[0], t.nivel, b[1], a[0], t.nivel, a[1]);
  }
  // La orilla: del borde del agua, un poco por encima, hasta el suelo de fuera.
  const orilla: number[] = [];
  const ancho = 7;
  const fuera = borde.map(([x, z]): [number, number, number] => {
    const dx = x - t.x;
    const dz = z - t.z;
    const l = Math.hypot(dx, dz) || 1;
    const px = x + (dx / l) * ancho;
    const pz = z + (dz / l) * ancho;
    return [px, cota(px, pz) + ALZADO, pz];
  });
  for (let i = 0; i < lados; i++) {
    const j = (i + 1) % lados;
    const a: [number, number, number] = [borde[i]![0], t.nivel + 0.25, borde[i]![1]];
    const b: [number, number, number] = [borde[j]![0], t.nivel + 0.25, borde[j]![1]];
    const c = fuera[j]!;
    const d = fuera[i]!;
    orilla.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  obra.triangulos(orilla, BARRO);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(lamina, 3));
  g.computeVertexNormals();
  const malla = new Mesh(
    g,
    // Con brillo: desde el aire, el agua se encuentra por el reflejo del sol.
    new MeshPhongMaterial({ color: AGUA, specular: 0x566466, shininess: 60 }),
  );
  malla.name = "granja:tajamar";
  return malla;
}

/* ── Los potreros, pintados en el suelo ───────────────────────────────── */

/**
 * **Los potreros, con su color: lo que dice «granja» desde el aire.**
 *
 * Desde arriba no se veía granja ninguna. La foto de satélite de San Pedro es
 * la de Sentinel-2, que en la granja llega a diecisiete metros por píxel —la
 * capa fina no cubre Paraguay—, y a esa escala un casco con su hangar y su
 * galpón es una mancha oscura y borrosa sobre la que se apoyan cuatro
 * prismas. Los potreros estaban —con su alambrado, sus timbós y
 * su ganado— y no se veían, porque el alambrado se apaga con la distancia a
 * propósito y **desde el aire un potrero se reconoce por el color de la
 * hierba**, que era el de la foto. La foto tapaba los potreros dibujados.
 *
 * Ahora cada potrero del plano lleva su color —el del bajo, más verde; los de
 * arriba, más secos al final del invierno—, con manchas de pastoreo, y el
 * casco su patio de tierra colorada. Se pinta **en el propio sombreador del
 * terreno**, encima de la foto, y no como una malla aparte: una lámina de
 * kilómetro y medio a treinta centímetros del suelo parpadea contra él en
 * cuanto se mira de lejos —a dos kilómetros la profundidad ya no distingue
 * treinta centímetros—, y el camino, el tajamar y las sombras, que van
 * encima, parpadearían contra ella. Ver `GLSL_DE_LA_PINTURA` en `grano.ts`.
 *
 * Y se funde con la foto hacia fuera: el último alambrado no es un borde de
 * pegatina, es donde empieza el campo del vecino.
 */
export interface PinturaDelSuelo {
  /** Lo que cubre, en coordenadas del campo: de `x0,z0` a `x1,z1`. */
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  /** Los potreros y el casco, en coordenadas del campo, con su color. */
  readonly piezas: readonly {
    readonly nombre: string;
    readonly poligono: readonly (readonly [number, number])[];
    readonly color: number;
  }[];
  /** El contorno de fuera, que es donde se funde con la foto. */
  readonly contorno: readonly (readonly [number, number])[];
  /** El patio de tierra de la casa: centro y radio, m. */
  readonly patio: {
    readonly x: number;
    readonly z: number;
    readonly r: number;
  } | null;
  /**
   * **La franja de la pista, segada**: el rectángulo alrededor de la pista
   * donde no se pinta potrero. Ver `HIERBA.franja`.
   */
  readonly franja: readonly (readonly [number, number])[];
  /**
   * Y lo pisado: la plataforma y las calles, que son hierba gastada por las
   * ruedas y no losas. Con sus puestos, que es donde más se gasta.
   */
  readonly pisado: {
    readonly plataformas: readonly (readonly (readonly [number, number])[])[];
    readonly calles: readonly {
      readonly camino: readonly (readonly [number, number])[];
      readonly ancho: number;
    }[];
    readonly puestos: readonly (readonly [number, number])[];
  };
}

/**
 * Los colores de la hierba, **sacados de la propia foto**: los de los potreros
 * que Sentinel-2 ve alrededor de la granja, en los diez kilómetros que la
 * rodean. La mediana de lo verde es (51, 64, 29); el percentil setenta,
 * (64, 75, 38); el noventa y cinco, (89, 96, 57); y los rozados de tierra
 * colorada, (103, 72, 37). Los potreros van de lo más claro de lo verde a lo
 * seco —campo abierto, no monte—, y así casan con los del vecino: la granja
 * no se lee como una pegatina más clara que el resto del país, sino como
 * potreros entre potreros.
 *
 * El casco cae justo en una mancha oscura de la foto, que es monte, y por eso
 * no se veía: lo que lo hace visible es que ahora está en campo abierto, como
 * está de verdad, y no más brillo. Distintos entre sí lo justo para que el
 * alambrado se lea por el cambio de tono; y todos más apagados que la franja
 * de la pista, que va segada y se ve como una cinta.
 */
const HIERBA = {
  /** El de la pista: pastado corto. */
  pista: 0x5a6334,
  /** El bajo, con el tajamar: más húmedo, más verde. */
  bajo: 0x44582a,
  /** El del otro lado del bajo. */
  bajoEste: 0x58602f,
  /** Los de detrás del casco: uno recién pastado, seco, y dos más enteros. */
  seco: 0x6e6a42,
  seco2: 0x4f5c2e,
  seco3: 0x646a3a,
  /** El callejón del camino, pisado. */
  callejon: 0x6f6444,
  /** El casco, pisado y a la sombra de los árboles. */
  casco: 0x5d6a36,
  /**
   * **La franja de la pista, segada**: más clara que cualquier potrero y más
   * oscura que la pista, que se siega más a menudo y más corto. Así, desde la
   * final, se ve una banda clara en medio del campo y dentro de ella la pista,
   * que es como se encuentra una pista de estancia. Ver `grass` en
   * `aerodrome.ts`.
   */
  franja: 0x70773f,
} as const;

/**
 * La hierba pisada de la plataforma y de las calles: más gastada, más amarilla
 * y con la tierra asomando. Una plataforma de hierba **no es una losa**: es
 * el trozo del potrero por el que más se rueda.
 */
const PISADO = 0x6f6c41;

/** Y la tierra que asoma donde más se gira: la colorada de San Pedro. */
const TIERRA_PISADA = 0x87593a;

/**
 * La raya del alambrado, vista desde arriba: no el alambre, que no se ve,
 * sino la maleza que crece debajo, donde no llega el ganado. Es lo que dibuja
 * los potreros en cualquier foto aérea del campo, y va exactamente donde van
 * los postes: ver `tramosDeAlambrado`.
 */
const ORILLA_DEL_ALAMBRADO = 0x2f3a1c;

/** Lo ancha que se ve esa orilla, m. */
const ANCHO_DE_LA_ORILLA = 3;

/** El patio de tierra colorada, alrededor de la casa: el de los rozados de la foto. */
const PATIO = 0x8a5a36;

/** Cuánto se funde hacia fuera el último alambrado, m. */
const FUNDIDO = 70;

/** Lo ancha que es la franja segada a cada lado del eje, m. Ver `potrerosDe`. */
const FRANJA_DE_LADO = 40;

/** Y cuánto sigue más allá de cada cabecera, m. */
const FRANJA_MAS_ALLA = 60;

/**
 * Dónde van los potreros y de qué color, sin pintar nada: lo que se puede
 * comprobar sin navegador. `null` si el campo no tiene granja.
 */
export function potrerosDe(aero: Aerodrome): PinturaDelSuelo | null {
  if (!aero.granja) return null;
  const marco = marcoDe(aero);
  if (!marco) return null;
  const rect = (a0: number, a1: number, c0: number, c1: number) =>
    [
      marco.mundo(a0, c0),
      marco.mundo(a1, c0),
      marco.mundo(a1, c1),
      marco.mundo(a0, c1),
    ] as [number, number][];
  const [pa0, pa1] = PLANO.potreroDeLaPista.a;
  const [pc0, pc1] = PLANO.potreroDeLaPista.c;
  const [nc0, nc1] = PLANO.norte.c;
  const [sc0, sc1] = PLANO.sur.c;
  const [ka0, ka1] = PLANO.casco.a;
  const [kc0, kc1] = PLANO.casco.c;
  const div = PLANO.norte.divisorias[0];
  const divSur = PLANO.sur.divisorias[0];
  const [ca0, ca1] = PLANO.callejon;
  const piezas = [
    { nombre: "pista", poligono: rect(pa0, pa1, pc0, pc1), color: HIERBA.pista },
    { nombre: "norte-oeste", poligono: rect(pa0, div, nc0, nc1), color: HIERBA.seco },
    { nombre: "norte-medio", poligono: rect(div, ca0, nc0, nc1), color: HIERBA.seco3 },
    { nombre: "callejon", poligono: rect(ca0, ca1, nc0, nc1), color: HIERBA.callejon },
    { nombre: "norte-este", poligono: rect(ca1, pa1, nc0, nc1), color: HIERBA.seco2 },
    { nombre: "sur-oeste", poligono: rect(pa0, divSur, sc0, sc1), color: HIERBA.bajo },
    { nombre: "sur-este", poligono: rect(divSur, pa1, sc0, sc1), color: HIERBA.bajoEste },
    // El casco va el último: está dentro del potrero de la pista.
    { nombre: "casco", poligono: rect(ka0, ka1, kc0, kc1), color: HIERBA.casco },
  ];
  const contorno = rect(pa0, pa1, sc0, nc1);
  /*
   * La franja: la pista y su margen, cuarenta metros a cada lado del eje y
   * sesenta más allá de cada cabecera, que es la franja de una pista chica y
   * donde ya no se planta ni un árbol ni un poste. Ver `techoDeUnaPistaChica`.
   */
  const franja = rect(
    -marco.semilargo - FRANJA_MAS_ALLA,
    marco.semilargo + FRANJA_MAS_ALLA,
    -FRANJA_DE_LADO,
    FRANJA_DE_LADO,
  );
  const deLaFicha = (p: readonly [number, number]): [number, number] => [
    p[0],
    -p[1],
  ];
  const pisado: PinturaDelSuelo["pisado"] = {
    plataformas: aero.aprons.map((pl) => pl.polygon.map(deLaFicha)),
    calles: aero.taxiways.map((c) => ({
      camino: c.path.map(deLaFicha),
      ancho: c.widthM ?? 12,
    })),
    puestos: (aero.parkingPositions ?? []).map((p) => deLaFicha(p.xy)),
  };
  let patio: PinturaDelSuelo["patio"] = null;
  for (const e of aero.buildings)
    if (e.kind === "farm") {
      const [x, z] = centroDelMundo(e.polygon);
      patio = { x, z, r: 45 };
    }
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const [x, z] of contorno) {
    x0 = Math.min(x0, x - FUNDIDO * 1.5);
    z0 = Math.min(z0, z - FUNDIDO * 1.5);
    x1 = Math.max(x1, x + FUNDIDO * 1.5);
    z1 = Math.max(z1, z + FUNDIDO * 1.5);
  }
  return { x0, z0, x1, z1, piezas, contorno, patio, franja, pisado };
}

/**
 * Los potreros ya pintados, como textura para el terreno. `null` si el campo
 * no tiene granja o si no hay navegador donde pintar.
 *
 * En sRGB, como todo lienzo de color de esta casa: sin decírselo, three lo
 * toma por lineal y los verdes salen lavados. Con mipmaps, que desde el
 * circuito un alambrado de un píxel sin ellos centellea.
 */
function pinturaDeLosPotreros(
  aero: Aerodrome,
  semilla: number,
  alambrados: readonly (readonly [number, number, number, number])[],
): PinturaEncima | null {
  if (typeof document === "undefined") return null;
  const potreros = potrerosDe(aero);
  if (!potreros) return null;
  const textura = new CanvasTexture(
    lienzoDeLosPotreros(
      potreros,
      () => document.createElement("canvas"),
      semilla,
      alambrados,
    ),
  );
  textura.colorSpace = SRGBColorSpace;
  textura.wrapS = ClampToEdgeWrapping;
  textura.wrapT = ClampToEdgeWrapping;
  textura.anisotropy = 4;
  // Sin darle la vuelta: la fila de arriba del lienzo es la `z0` del campo,
  // igual que la `v` cero del sombreador.
  textura.flipY = false;
  textura.needsUpdate = true;
  return {
    textura,
    x0: potreros.x0,
    z0: potreros.z0,
    x1: potreros.x1,
    z1: potreros.z1,
  };
}

/** Un color de tres bytes en `rgba(…)`, con la luz cambiada en `k`. */
function css(color: number, k = 1, alfa = 1): string {
  const c = new Color(color);
  // `Color` guarda en lineal; el lienzo pinta en sRGB, que es lo que lleva
  // la textura. Ver `lienzos-en-srgb`.
  const s = c.getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  const r = Math.round(Math.min(1, s.r * k) * 255);
  const g = Math.round(Math.min(1, s.g * k) * 255);
  const b = Math.round(Math.min(1, s.b * k) * 255);
  return `rgba(${r},${g},${b},${alfa})`;
}

/**
 * Pinta los potreros en un lienzo de `lado` píxeles que cubre el rectángulo
 * de `potrerosDe`. El alfa es la cobertura: uno dentro del último alambrado,
 * cero lejos de él.
 *
 * Mil veinticuatro de lado sobre kilómetro y ochocientos son un metro y tres
 * cuartos por píxel: diez veces más fino que la foto y de sobra para un
 * alambrado visto desde el circuito.
 */
export function lienzoDeLosPotreros(
  pintura: PinturaDelSuelo,
  hacerLienzo: () => HTMLCanvasElement,
  semilla: number,
  /** De poste a poste, en coordenadas del campo: `[x0, z0, x1, z1]`. */
  alambrados: readonly (readonly [number, number, number, number])[] = [],
  lado = 1024,
): HTMLCanvasElement {
  const lienzo = hacerLienzo();
  lienzo.width = lado;
  lienzo.height = lado;
  const ctx = lienzo.getContext("2d");
  if (!ctx) return lienzo;
  const azar = mulberry32(semilla ^ 0x9071);
  const ex = lado / (pintura.x1 - pintura.x0);
  const ez = lado / (pintura.z1 - pintura.z0);
  const px = (x: number) => (x - pintura.x0) * ex;
  const pz = (z: number) => (z - pintura.z0) * ez;
  const trazar = (poligono: readonly (readonly [number, number])[]) => {
    ctx.beginPath();
    poligono.forEach(([x, z], i) =>
      i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z)),
    );
    ctx.closePath();
  };

  // El fundido de fuera: el contorno, emborronado, en el tono de la pista.
  ctx.save();
  ctx.filter = `blur(${Math.round((FUNDIDO / 2.2) * ex)}px)`;
  ctx.fillStyle = css(HIERBA.pista, 0.97);
  trazar(pintura.contorno);
  ctx.fill();
  ctx.restore();

  for (const pieza of pintura.piezas) {
    ctx.save();
    trazar(pieza.poligono);
    ctx.fillStyle = css(pieza.color);
    ctx.fill();
    ctx.clip();
    /*
     * Y las manchas del pastoreo: donde el ganado come más y donde menos, que
     * es lo que hace que un potrero de verdad no sea un color plano. Grandes y
     * suaves —de veinticinco a ochenta metros—, porque lo fino ya lo pone el grano.
     */
    const n = pieza.poligono.length;
    let cx = 0;
    let cz = 0;
    for (const [x, z] of pieza.poligono) {
      cx += x / n;
      cz += z / n;
    }
    let radio = 0;
    for (const [x, z] of pieza.poligono)
      radio = Math.max(radio, Math.hypot(x - cx, z - cz));
    const manchas = Math.round(radio / 12);
    for (let i = 0; i < manchas; i++) {
      const ang = azar() * Math.PI * 2;
      const d = Math.sqrt(azar()) * radio;
      const x = px(cx + Math.cos(ang) * d);
      const z = pz(cz + Math.sin(ang) * d);
      const r = (25 + azar() * 60) * ex;
      const k = azar() < 0.5 ? 0.8 + azar() * 0.08 : 1.1 + azar() * 0.1;
      const mancha = ctx.createRadialGradient(x, z, 0, x, z, r);
      mancha.addColorStop(0, css(pieza.color, k, 0.7));
      mancha.addColorStop(1, css(pieza.color, k, 0));
      ctx.fillStyle = mancha;
      ctx.fillRect(x - r, z - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  /*
   * **La franja segada, encima de los potreros**: la pista está en el suyo,
   * pero lo que la rodea no se pinta de potrero. Con el borde un poco suave,
   * que la segadora no corta a regla.
   */
  ctx.save();
  ctx.filter = `blur(${Math.max(1, Math.round(3 * ex))}px)`;
  trazar(pintura.franja);
  ctx.fillStyle = css(HIERBA.franja);
  ctx.fill();
  ctx.restore();

  // Las orillas del alambrado, por encima de los potreros y por debajo del
  // patio, que es tierra barrida hasta el poste.
  ctx.save();
  ctx.strokeStyle = css(ORILLA_DEL_ALAMBRADO, 1, 0.75);
  ctx.lineWidth = Math.max(1, ANCHO_DE_LA_ORILLA * ex);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const [ax, az, bx, bz] of alambrados) {
    ctx.moveTo(px(ax), pz(az));
    ctx.lineTo(px(bx), pz(bz));
  }
  ctx.stroke();
  ctx.restore();

  /*
   * **Y lo pisado: la plataforma y las calles.** Hierba gastada, con el borde
   * suave —nadie rueda justo hasta la raya de un polígono—, la huella de las
   * ruedas por el medio de cada calle y la tierra asomando en los puestos,
   * donde se gira. Es lo que va debajo de las mallas de la plataforma y de las
   * calles, que se pintan con esto mismo: ver `pintarEncima` en `terrain.ts`.
   */
  const pisado = pintura.pisado;
  ctx.save();
  ctx.filter = `blur(${Math.max(1, Math.round(2.5 * ex))}px)`;
  ctx.fillStyle = css(PISADO);
  ctx.strokeStyle = css(PISADO);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const pl of pisado.plataformas) {
    trazar(pl);
    ctx.fill();
  }
  for (const c of pisado.calles) {
    ctx.lineWidth = c.ancho * ex;
    ctx.beginPath();
    c.camino.forEach(([x, z], i) =>
      i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z)),
    );
    ctx.stroke();
  }
  // La huella de las ruedas, por el medio de la calle.
  ctx.strokeStyle = css(TIERRA_PISADA, 1, 0.35);
  for (const c of pisado.calles) {
    ctx.lineWidth = Math.max(1, (c.ancho / 3) * ex);
    ctx.beginPath();
    c.camino.forEach(([x, z], i) =>
      i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z)),
    );
    ctx.stroke();
  }
  ctx.restore();
  // Y la tierra en los puestos, donde se gira, y alguna calva suelta.
  for (const [x, z] of pisado.puestos) {
    const r = 14 * ex;
    const calva = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r);
    calva.addColorStop(0, css(TIERRA_PISADA, 1, 0.6));
    calva.addColorStop(1, css(TIERRA_PISADA, 1, 0));
    ctx.fillStyle = calva;
    ctx.fillRect(px(x) - r, pz(z) - r, r * 2, r * 2);
  }

  // El patio de la casa: tierra colorada, barrida, que se va en hierba.
  if (pintura.patio) {
    const { x, z, r } = pintura.patio;
    const patio = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r * ex);
    patio.addColorStop(0, css(PATIO, 1, 0.9));
    patio.addColorStop(0.6, css(PATIO, 1, 0.55));
    patio.addColorStop(1, css(PATIO, 1, 0));
    ctx.fillStyle = patio;
    ctx.fillRect(px(x) - r * ex, pz(z) - r * ex, r * ex * 2, r * ex * 2);
  }
  return lienzo;
}
