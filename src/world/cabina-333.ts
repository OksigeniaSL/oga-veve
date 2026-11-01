/**
 * **La cabina de pasaje de un bimotor de fuselaje ancho**, por dentro: tres, tres
 * y tres con dos pasillos, la del JAZ 110 *Tijereta*.
 *
 * `pasillo-de-pasaje.ts` sabe de un pasillo y dos asientos a cada lado, los de un
 * regional. Aquí hay otra sección, y se hace aparte para no tocar lo que ya vuelan
 * los demás. Se cuelga del avión igual y se mira igual: solo existe mientras se
 * mira, y fuera de esos segundos no cuesta nada.
 *
 * ## Las medidas, y de dónde salen
 *
 * Del bloque de Gaudí (`cabina_333.py`, en el kit de arte de hq), que las sacó de
 * Boeing, *787 Airplane Characteristics for Airport Planning*, D6-58333 Rev Q,
 * fig. 2.5.1:
 *
 * - el bloque de tres asientos, 59,6 pulgadas (1,52 m), y el pasillo, 18 (0,46 m);
 * - medidas sobre la misma figura, al centímetro largo: la pared, un círculo de
 *   2,77 m de radio con el centro 0,45 m sobre el suelo; el hueco de la ventanilla,
 *   de 0,80 a 1,42 m de alto; los compartimentos de los lados, de 1,66 a 2,39 m y
 *   hasta 1,57 m del eje, con la puerta en la cara que mira al pasillo; y el techo,
 *   a 2,54 m entre los compartimentos.
 *
 * **Por verificar**, porque la figura no los trae: los compartimentos del centro,
 * las puertas por dentro, los aseos, los armarios y las cortinas.
 *
 * Y las ventanillas: de 27 × 47 cm, sin persiana, **cada veinticuatro pulgadas**,
 * que es el paso de las cuadernas de un fuselaje de esta clase. Por eso no caen
 * todas a la altura de una fila, como en cualquier avión de verdad. Ver
 * `PASO_DE_CUADERNAS`.
 *
 * ## Lo que Enrique le vio al primer bloque, y no vuelve a pasar
 *
 * «¿Ventanillas? ¿Qué son esas cosas azules? ¿Dónde están los portaequipajes
 * superiores? ¿Cómo se sale del avión si has puesto una tapia al fondo?» Y
 * «Justamente a Ara le has quitado la pantalla». Así que:
 *
 * - **Las ventanillas van en la pared**, siguiendo su curva: el bisel, el hueco en
 *   embudo y el cristal al fondo, por el que se ve fuera de verdad.
 * - **Portaequipajes** a los dos lados y en el centro, con sus puertas de dos filas
 *   de largo, su asa y su labio.
 * - **Al fondo no hay pared**: el pasillo transversal de las puertas 2, con una
 *   puerta a cada lado, sus señales de salida, los aseos en el centro, los asientos
 *   plegables de la tripulación, y los dos pasillos que siguen detrás de su cortina.
 * - **Y Ara tiene su pantalla**, de frente, en el respaldo de delante. Ver
 *   `pantalla-del-respaldo.ts` y el plano `respaldo`.
 *
 * ## Las señales de salida
 *
 * Verdes, con el hombre que corre hacia la puerta (ISO 7010, E001 y E002), como en
 * la lámina aprobada: es la que se entiende sin saber leer. Las normas la admiten en
 * vez de la palabra: CS 26.120 habla de «universal symbolic exit sign», y EASA tiene
 * aceptada una de esas contra CS 25.812. **Por verificar con fuente primaria**: que
 * sea la que lleva el 787, que solo sale de un foro de aviación. El JAZ 90 sigue con
 * su «EXIT» rojo: en los aviones de verdad hay de las dos.
 *
 * ## La luz
 *
 * Como el pasillo de un regional, pintada en cada vértice y sin luces de escena:
 * el material solo multiplica ese color por la luz de ahora, una fría —el azul de
 * las luces LED de noche, el blanco de día— y una cálida que sale de la zona de las
 * puertas y se apaga a lo largo de la cabina. Son dos colores por vértice y dos por
 * fotograma: nada que calcular. Ver `ponerLuz`.
 *
 * **Lo que cuesta**: unos veintidós mil triángulos en cuatro mallas y un sombreador
 * de una línea. Medido con `scripts/ver-cabina-333.mjs` en la tarjeta del portátil,
 * a 1280 × 720: 3,3 ms por cuadro mirando el pasillo y 3,8 mirando por la ventanilla
 * sin ella. Tapa casi todo el mundo y se pinta lo primero, así que lo que añade lo
 * devuelve; a 60 fps con la CPU a un cuarto en las dos.
 */

import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import type { AsientoDeAra } from "./asiento-de-ara";
import type { AsientoDePasaje, PuertaDePasaje } from "./asiento-de-pasaje";
import { COLORES_DE_LA_CABINA, PASO_DE_CUADERNAS_ANCHAS } from "./marco-de-ventanilla";
import { PantallaDelRespaldo } from "./pantalla-del-respaldo";
import type { PasilloDePasaje } from "./pasillo-de-pasaje";

// ── Las medidas ─────────────────────────────────────────────────────────

/** **La sección de la cabina**, m. Ver la cabecera, y lo que queda por verificar. */
export const SECCION = {
  asiento: 0.44,
  brazo: 0.05,
  /** Treinta y una pulgadas entre filas, la distancia de la clase turista de un largo radio. */
  entreFilas: 0.79,
  pasillo: 0.46,
  /** La pared: un círculo de este radio, con el centro a esta altura. */
  radio: 2.77,
  centro: 0.45,
  /** El centro del cristal, sobre el suelo. */
  alturaDeLaVentanilla: 1.11,
} as const;

/** Lo que mide un bloque de tres asientos con sus cuatro brazos: 1,52 m. */
export const BLOQUE = 3 * SECCION.asiento + 4 * SECCION.brazo;

/**
 * **Los asientos de una fila y los dos pasillos**, m desde el eje, positivo a la
 * derecha del avión: nueve asientos en tres bloques, de la ventanilla izquierda
 * —el asiento A, el de Ara— a la derecha.
 */
export function disposicion333(): {
  readonly asientos: readonly number[];
  readonly pasillos: readonly [number, number];
  readonly asientoA: number;
} {
  const paso = SECCION.asiento + SECCION.brazo;
  const entreBloques = BLOQUE + SECCION.pasillo;
  const asientos: number[] = [];
  for (const b of [-1, 0, 1]) for (const s of [-1, 0, 1]) asientos.push(b * entreBloques + s * paso);
  const p = (BLOQUE + SECCION.pasillo) / 2;
  return { asientos, pasillos: [-p, p], asientoA: asientos[0]! };
}

/**
 * **El paso de las ventanillas**, m: el de las cuadernas de esta clase, el mismo
 * que usa el marco de la ventanilla. El modelo de fuera las lleva más separadas
 * para que se lean de lejos; desde dentro se ve la cabina como es.
 */
export const PASO_DE_CUADERNAS = PASO_DE_CUADERNAS_ANCHAS;

/** El cristal, 27 × 47 cm, y el hueco y el bisel alrededor. Se dobla con la pared. */
export const CRISTAL = { ancho: 0.27, alto: 0.47, esquina: 0.1 } as const;
const BOCA = { ancho: 0.4, alto: 0.6, esquina: 0.15 } as const;
const BISEL = { ancho: 0.5, alto: 0.7, esquina: 0.15 } as const;

/** Lo que entra el cristal desde la pared hacia fuera, m: el embudo. */
const HONDO = 0.075;

/**
 * **La pantalla del respaldo**, m: doce pulgadas de 16:10, su centro sobre el suelo
 * y lo que ocupa con el marco. De la clase de lo que llevan los largos radios de
 * esta generación; la medida exacta depende de la aerolínea, y no sale en el
 * documento de Boeing.
 */
export const PANTALLA = { ancho: 0.258, alto: 0.161, altura: 0.97, marco: 0.012 } as const;

/** Lo que se aparta el respaldo de la fila de delante del borde de delante de su cojín, m. */
const POPA_DEL_ASIENTO = 0.57;

/** Dónde queda el borde de delante del cojín de Ara, por delante de sus ojos sentada, m. */
const COJIN_BAJO_LOS_OJOS = 0.3;

/**
 * **De los ojos de Ara a la pantalla**, m: los de un niño sentado, con la espalda en
 * el respaldo, en treinta y una pulgadas entre filas.
 */
export const OJOS_A_LA_PANTALLA = 0.5;

/**
 * **El plano cercano de la cámara mientras se mira esta cabina**, m. El del juego
 * son sesenta centímetros, y aquí dentro los compartimentos quedan a un palmo y la
 * pantalla a medio metro: se cortaban y se veía el compartimento por dentro. Se
 * acerca solo mientras se mira la cabina, cuando lo lejano solo asoma por las
 * ventanillas y un poco menos de precisión allí no se nota. Ver `ponerLaCabina` en
 * `game.ts`.
 */
export const CERCANO_EN_LA_CABINA = 0.12;

/**
 * **El ángulo de la vista para que la pantalla quepa**, grados, y no solo en
 * apaisado: en un teléfono de pie el ancho es lo que manda. Ocupa como mucho
 * `llena` de la vista, y el resto es el respaldo que la rodea.
 */
export function fovParaLaPantalla(aspecto: number, llena = 0.86): number {
  const t = Math.max(PANTALLA.alto / 2, PANTALLA.ancho / 2 / Math.max(aspecto, 0.1)) / (OJOS_A_LA_PANTALLA * llena);
  return (2 * Math.atan(t) * 180) / Math.PI;
}

/**
 * **Las filas de la cabina**, el borde de delante del cojín de cada una: desde la
 * que deja libre el pasillo transversal de las puertas hasta una por detrás de la
 * de Ara. Van **contadas desde Ara** y no desde la puerta: es su asiento el que
 * tiene que caer delante de su ventanilla. Lo que falta o sobra de la cuenta se lo
 * queda el pasillo transversal.
 */
export function filasDeLaCabina(cojinDeAra: number, puerta: number, pasoLibre = 0.9): {
  readonly filas: readonly number[];
  readonly deAra: number;
} {
  const filas: number[] = [];
  for (let y = cojinDeAra + SECCION.entreFilas; y >= puerta + pasoLibre; y -= SECCION.entreFilas) filas.unshift(y);
  return { filas, deAra: filas.length - 2 };
}

/** **Las ventanillas de la pared**, contadas desde la de Ara a su paso, sin caer en la puerta. */
export function ventanillasDeLaPared(deAra: number, finDeLaPuerta: number, hasta: number): readonly number[] {
  const zs: number[] = [];
  const primera = finDeLaPuerta + 0.4;
  const atras = Math.ceil((primera - deAra) / PASO_DE_CUADERNAS);
  for (let z = deAra + atras * PASO_DE_CUADERNAS; z < hasta - 0.05; z += PASO_DE_CUADERNAS) zs.push(z);
  return zs;
}

// ── Los perfiles de la sección, de `cabina_333.py` ──────────────────────

type Perfil = readonly (readonly [number, number])[];

/** El compartimento de un lado, trazado sobre la fig. 2.5.1: x desde el eje y altura. */
const COMPARTIMENTO: Perfil = [
  [2.07, 1.655], [2.17, 1.69], [2.23, 1.74], [2.26, 1.8], [2.28, 1.85], [2.285, 1.92], [2.25, 2.0],
  [2.22, 2.05], [2.17, 2.1], [2.12, 2.15], [2.07, 2.2], [2.03, 2.26], [1.97, 2.31], [1.93, 2.36], [1.88, 2.39],
  [1.82, 2.36], [1.74, 2.31], [1.68, 2.26], [1.64, 2.2], [1.61, 2.15], [1.57, 2.1], [1.57, 2.05], [1.61, 2.0],
  [1.65, 1.95], [1.69, 1.9], [1.74, 1.85], [1.8, 1.8], [1.87, 1.74], [1.96, 1.69],
];
/** Su puerta: la cara del borde de dentro hasta abajo, la que mira al pasillo. */
const PUERTA_DEL_COMPARTIMENTO: Perfil = [...COMPARTIMENTO.slice(20), COMPARTIMENTO[0]!];

/** Media sección del compartimento del centro (por verificar). */
const CENTRO: Perfil = [
  [0, 1.86], [0.58, 1.86], [0.64, 1.875], [0.68, 1.91], [0.7, 1.96], [0.715, 2.2], [0.7, 2.27], [0.66, 2.3], [0, 2.3],
];
const PUERTA_DEL_CENTRO: Perfil = CENTRO.slice(2, 6);

/** El techo, sobre cada pasillo y bajo en el centro. */
const TECHO: Perfil = [
  [1.99, 2.4], [1.8, 2.46], [1.6, 2.5], [1.4, 2.53], [1.2, 2.54], [1, 2.53], [0.8, 2.5], [0.66, 2.4], [0.62, 2.32], [0, 2.32],
];

/** Lo que mide cada puerta de compartimento: dos filas. */
const MODULO = 2 * SECCION.entreFilas;

/** Cuánto valen las luces de `CabinaDePasaje` en cada momento: ver `LUZ_DE_NOCHE`. */
const LUZ_DE_REFERENCIA = { preparada: 0.07, crucero: 0.3, embarcando: 0.85 } as const;

/**
 * **Desde dónde se mira el pasillo**: en el pasillo de su lado y de pie, a la
 * altura de la fila de Ara, algo vuelta hacia el centro. **Más alto que los ojos de
 * Ara** a propósito: a un metro y pico, los respaldos de la fila de al lado tapan
 * el otro pasillo y el tres-tres-tres no se lee; es un plano para enseñar la
 * cabina, y sale con el fundido de los planos, no con la cabeza de Ara.
 */
export const MIRANDO_EL_PASILLO = {
  ojosSobreElSuelo: 1.55,
  haciaElCentro: (11 * Math.PI) / 180,
  cabeceo: (-3 * Math.PI) / 180,
  fov: 58,
} as const;

// ── Los colores ─────────────────────────────────────────────────────────

const COLOR = {
  pared: COLORES_DE_LA_CABINA.pared,
  bisel: COLORES_DE_LA_CABINA.bisel,
  embudo: "#c4bfb4",
  // El verde de la casa, más vivo que el de la ventanilla: aquí lo baña la luz de noche.
  asiento: "#2f7262",
  funda: COLORES_DE_LA_CABINA.funda,
  brazo: "#a9a8a4",
  bandeja: "#b3b2ae",
  marco: "#0e0e11",
  asa: "#212226",
  // La moqueta: un azul grisáceo, que de día se ve moqueta y de noche casi desaparece.
  suelo: "#54577f",
  techo: "#efece6",
  compartimento: "#dcd9d1",
  puertaDeCompartimento: "#efece6",
  labio: "#7d7c82",
  panel: "#bcbcbc",
  monumento: "#e0ddd4",
  puertaDeAseo: "#c9c6bd",
  puerta: "#d3cdc0",
  junta: "#3d3d44",
  bulto: "#a4a4a8",
  cortina: "#364988",
  // Las pantallas de los demás: sin mapa, que a esa distancia no se lee. Azul de cielo.
  pantalla: "#7fb9f5",
  apagada: "#101420",
  lectura: "#ffc98a",
  luzApagada: "#8f8f8f",
  focoDePuerta: "#fff1d8",
  tira: "#eef5b8",
  rojo: COLORES_DE_LA_CABINA.rojo,
  libre: "#35e070",
  salida: "#0a9e50",
  pelo: ["#2a1e17", "#3b2a1f", "#151515", "#5a4030", "#7a6a5a", "#b8a27a", "#1f1a17"],
} as const;

// ── El cosido: todas las piezas en unas pocas mallas ────────────────────

type V = readonly [number, number, number];

const linealDe = new Map<string, Color>();
const lineal = (hex: string): Color => {
  let c = linealDe.get(hex);
  if (!c) linealDe.set(hex, (c = new Color(hex)));
  return c;
};

function suave(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** **Una malla por juntar**, en triángulos sueltos y con la luz ya pintada en cada vértice. */
class Cosido {
  readonly posiciones: number[] = [];
  readonly colores: number[] = [];
  readonly calidas: number[] = [];

  constructor(
    private readonly suelo: number,
    private readonly calidaEn: (z: number) => number,
    /** Sin sombra: lo que alumbra por sí mismo. */
    private readonly plano = false,
  ) {}

  private vertice(p: V, n: V, c: Color, brillo: number): void {
    const h = p[1] - this.suelo;
    let k = brillo;
    if (!this.plano) {
      // Desde arriba y algo desde detrás, y más oscuro abajo, entre los asientos.
      k *= 0.56 + 0.44 * Math.max(0, n[1]) + 0.18 * Math.max(0, n[2]);
      k *= 0.68 + 0.32 * suave(0, 1, h);
    }
    this.posiciones.push(p[0], p[1], p[2]);
    this.colores.push(c.r * k, c.g * k, c.b * k);
    this.calidas.push(this.calidaEn(p[2]));
  }

  /** Un cuadrilátero. `hacia`: un punto del lado al que mira, para saber su sombra. */
  cuad(a: V, b: V, c: V, d: V, color: string, hacia: V | null = null, brillo = 1): void {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = d[0] - a[0];
    const vy = d[1] - a[1];
    const vz = d[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    if (hacia && nx * (hacia[0] - a[0]) + ny * (hacia[1] - a[1]) + nz * (hacia[2] - a[2]) < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const n: V = [nx, ny, nz];
    const col = lineal(color);
    for (const p of [a, b, c, a, c, d]) this.vertice(p, n, col, brillo);
  }

  /** Un triángulo sin sombra: el cristal. */
  tri(a: V, b: V, c: V, color: string): void {
    const col = lineal(color);
    const n: V = [0, 1, 0];
    for (const p of [a, b, c]) this.vertice(p, n, col, 1);
  }

  /** Una caja a escuadra, por su centro. */
  caja(x: number, y: number, z: number, ax: number, ay: number, az: number, color: string, brillo = 1): void {
    const [x0, x1, y0, y1, z0, z1] = [x - ax / 2, x + ax / 2, y - ay / 2, y + ay / 2, z - az / 2, z + az / 2];
    const lejos = 10;
    this.cuad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], color, [x1 + lejos, y, z], brillo);
    this.cuad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], color, [x0 - lejos, y, z], brillo);
    this.cuad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], color, [x, y1 + lejos, z], brillo);
    this.cuad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], color, [x, y0 - lejos, z], brillo);
    this.cuad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color, [x, y, z1 + lejos], brillo);
    this.cuad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], color, [x, y, z0 - lejos], brillo);
  }

  /** Una cara que mira hacia la cola, que es la que se ve desde detrás. */
  carita(x: number, y: number, z: number, ax: number, ay: number, color: string, brillo = 1): void {
    const [x0, x1, y0, y1] = [x - ax / 2, x + ax / 2, y - ay / 2, y + ay / 2];
    this.cuad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], color, [x, y, z + 10], brillo);
  }

  /**
   * **Un perfil de la sección, llevado a lo largo**. `hacia` es el punto de la
   * sección al que miran sus caras, y si `alReves`, se apartan de él: la pared
   * mira al eje, y un compartimento se aparta de su centro.
   */
  tira(perfil: readonly V[], z0: number, z1: number, color: string, hacia: readonly [number, number], alReves = false, brillo = 1, trozos = 1): void {
    const g = alReves ? 100 : 1;
    for (let t = 0; t < trozos; t++) {
      const a = z0 + ((z1 - z0) * t) / trozos;
      const b = z0 + ((z1 - z0) * (t + 1)) / trozos;
      for (let i = 0; i + 1 < perfil.length; i++) {
        const p = perfil[i]!;
        const q = perfil[i + 1]!;
        const mx = (p[0] + q[0]) / 2;
        const my = (p[1] + q[1]) / 2;
        // Hacia el punto dado o, con `alReves`, en dirección contraria, bien lejos.
        const ref: V = [mx + g * (alReves ? mx - hacia[0] : hacia[0] - mx), my + g * (alReves ? my - hacia[1] : hacia[1] - my), a];
        this.cuad([p[0], p[1], a], [q[0], q[1], a], [q[0], q[1], b], [p[0], p[1], b], color, ref, brillo);
      }
    }
  }

  /** Una geometría ya hecha, trasladada: las cabezas. */
  bola(g: BufferGeometry, x: number, y: number, z: number, color: string): void {
    const pos = g.getAttribute("position");
    const col = lineal(color);
    const n: [number, number, number] = [0, 1, 0];
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      const l = Math.hypot(px, py, pz) || 1;
      n[0] = px / l;
      n[1] = py / l;
      n[2] = pz / l;
      this.vertice([x + px, y + py, z + pz], n, col, 1);
    }
  }

  geometria(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(this.posiciones), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(this.colores), 3));
    g.setAttribute("calida", new BufferAttribute(new Float32Array(this.calidas), 1));
    return g;
  }
}

/** Un rectángulo de esquinas redondas, como puntos (u, v). */
function redondeado(ancho: number, alto: number, r: number, n = 3): readonly (readonly [number, number])[] {
  const pts: [number, number][] = [];
  const esquinas: readonly (readonly [number, number, number])[] = [
    [ancho / 2 - r, alto / 2 - r, 0],
    [-ancho / 2 + r, alto / 2 - r, 90],
    [-ancho / 2 + r, -alto / 2 + r, 180],
    [ancho / 2 - r, -alto / 2 + r, 270],
  ];
  for (const [cx, cy, a0] of esquinas)
    for (let k = 0; k <= n; k++) {
      const a = ((a0 + (90 * k) / n) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  return pts;
}

/** El punto de la pared a esa altura, en la sección: x desde el eje y altura. `w` hacia fuera. */
function enLaPared(h: number, w = 0, doblar = 0): readonly [number, number] {
  const fi = Math.acos(Math.max(-1, Math.min(1, (h - SECCION.centro) / SECCION.radio))) - doblar / SECCION.radio;
  return [(SECCION.radio + w) * Math.sin(fi), SECCION.centro + (SECCION.radio + w) * Math.cos(fi)];
}

/**
 * **La señal de salida**: el hombre que corre hacia su puerta, blanco sobre verde.
 * `hacia` es hacia dónde corre, según se mira: −1 a la izquierda. En sRGB, como todo
 * lienzo de color.
 */
function texturaDeSalida(hacia: -1 | 1): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const lienzo = document.createElement("canvas");
  lienzo.width = 256;
  lienzo.height = 108;
  const c = lienzo.getContext("2d");
  if (!c) return null;
  c.fillStyle = COLOR.salida;
  c.fillRect(0, 0, 256, 108);
  if (hacia < 0) {
    c.translate(256, 0);
    c.scale(-1, 1);
  }
  c.strokeStyle = "#ffffff";
  c.fillStyle = "#ffffff";
  c.lineCap = "round";
  c.lineJoin = "round";
  c.lineWidth = 9;
  c.strokeRect(182, 14, 52, 80);
  c.beginPath();
  c.arc(122, 24, 11, 0, 2 * Math.PI);
  c.fill();
  const trazo = (...p: readonly number[]): void => {
    c.beginPath();
    c.moveTo(p[0]!, p[1]!);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i]!, p[i + 1]!);
    c.stroke();
  };
  c.lineWidth = 11;
  trazo(114, 42, 102, 68);
  c.lineWidth = 9;
  trazo(112, 44, 134, 52, 150, 44);
  trazo(112, 44, 90, 48, 76, 62);
  trazo(102, 68, 126, 76, 128, 98);
  trazo(102, 68, 88, 86, 62, 90);
  const t = new CanvasTexture(lienzo);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ── El material ─────────────────────────────────────────────────────────

const VERTICES = /* glsl */ `
attribute float calida;
varying vec3 vColor;
varying float vCalida;
void main() {
  vColor = color;
  vCalida = calida;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENTOS = /* glsl */ `
uniform vec3 uFria;
uniform vec3 uCalida;
varying vec3 vColor;
varying float vCalida;
void main() {
  gl_FragColor = vec4(vColor * (uFria + uCalida * vCalida), 1.0);
  #include <colorspace_fragment>
}
`;

const mezclar = (a: readonly number[], b: readonly number[], k: number): [number, number, number] => [
  a[0]! + (b[0]! - a[0]!) * k,
  a[1]! + (b[1]! - a[1]!) * k,
  a[2]! + (b[2]! - a[2]!) * k,
];

/**
 * **La luz de la cabina**, en lineal: fría y cálida, en crucero de noche, embarcando
 * de noche, preparada para despegar o aterrizar de noche, y de día. El azul es el de
 * las luces LED que la tripulación pone para dormir (Boeing, *787 Dreamliner by
 * design*); el resto, a ojo sobre las capturas, con `cabina-noche.png` delante.
 */
const LUZ = {
  preparada: { fria: [0.05, 0.07, 0.16], calida: [0.1, 0.06, 0.03], cove: [0.16, 0.22, 0.42] },
  crucero: { fria: [0.05, 0.09, 0.3], calida: [0.5, 0.28, 0.1], cove: [0.42, 0.6, 1.0] },
  embarcando: { fria: [0.82, 0.8, 0.74], calida: [0.2, 0.12, 0.06], cove: [1.0, 0.94, 0.84] },
  dia: { fria: [1.0, 1.0, 0.98], calida: [0.06, 0.04, 0.02], cove: [0.92, 0.94, 0.95] },
} as const;

interface LuzDeUnMomento {
  readonly fria: readonly number[];
  readonly calida: readonly number[];
  readonly cove: readonly number[];
}

function mezclar3(a: LuzDeUnMomento, b: LuzDeUnMomento, k: number): LuzDeUnMomento {
  const t = Math.max(0, Math.min(1, k));
  return { fria: mezclar(a.fria, b.fria, t), calida: mezclar(a.calida, b.calida, t), cove: mezclar(a.cove, b.cove, t) };
}

// ── Montarla ────────────────────────────────────────────────────────────

/** Un número entre 0 y 1 que siempre es el mismo para la misma semilla. */
function azar(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * **Monta la cabina** alrededor del asiento de Ara, o `null` si el modelo no da con
 * qué: sin puertas delante de Ara no hay salida que mirar.
 *
 * La puerta que importa es **la más cercana por delante**, no la primera del avión:
 * en un fuselaje de este largo la primera queda a veinte filas y hay otra a nueve.
 */
export function montarLaCabina333(
  ara: AsientoDeAra,
  lado: "izquierda" | "derecha",
  puertas: readonly PuertaDePasaje[],
  franja: number,
): PasilloDePasaje | null {
  const sentada = ara.poses.sentada.ojo;
  const delante = [...puertas].filter((p) => p.zMax < sentada.z).pop();
  if (!delante) return null;
  const s = lado === "izquierda" ? -1 : 1;
  const ventana = ara.ventanilla.centro;
  // El suelo sale del cristal: la ventanilla por dentro tiene que caer donde la mide el modelo.
  const suelo = ventana.y - SECCION.alturaDeLaVentanilla;
  const H = (h: number): number => suelo + h;
  const zPuerta = (delante.zMin + delante.zMax) / 2;
  const cojinDeAra = sentada.z - COJIN_BAJO_LOS_OJOS;
  const { filas, deAra } = filasDeLaCabina(cojinDeAra, zPuerta);
  const hasta = filas[filas.length - 1]! + 1.1;
  // Los compartimentos empiezan pasadas las puertas, como en la lámina.
  const binsDesde = zPuerta + 0.7;
  const monumentos = zPuerta - 0.7;
  const pared = zPuerta - 4.1;
  const finDeLaPuerta = delante.zMax + 0.08;

  /*
   * La luz cálida sale de la zona de las puertas, y se apaga hacia atrás. A la
   * altura de Ara ya solo queda la azul: es lo que dibuja la lámina.
   */
  const calidaEn = (z: number): number => 1 - suave(binsDesde - 0.4, binsDesde + 2.4, z);
  const cuerpo = new Cosido(suelo, calidaEn);
  const luces = new Cosido(suelo, () => 0, true);
  const coves = new Cosido(suelo, () => 0, true);
  const cristales = new Cosido(suelo, () => 0, true);

  const eje: readonly [number, number] = [0, H(1.2)];
  const de = (lados: number, p: Perfil): V[] => p.map(([x, h]) => [lados * x, H(h), 0] as V);

  // ── El suelo y el techo ────────────────────────────────────────────────
  const X = 2.73;
  cuerpo.tira([[-X, H(0), 0], [X, H(0), 0]], pared, hasta, COLOR.suelo, [0, H(1)], false, 1, 8);
  const techo: V[] = [...de(-1, TECHO), ...de(1, TECHO).reverse().slice(1)];
  cuerpo.tira(techo, pared, hasta, COLOR.techo, [0, H(0)], false, 1.25, 8);

  // ── Las paredes, las ventanillas y las puertas ─────────────────────────
  const ventanillas = ventanillasDeLaPared(ventana.z, finDeLaPuerta, hasta);
  const arco = (k: number, h0: number, h1: number, n: number, w = 0): V[] => {
    const v: V[] = [];
    for (let i = 0; i <= n; i++) {
      const [x, h] = enLaPared(h0 + ((h1 - h0) * i) / n, w);
      v.push([k * x, H(h), 0]);
    }
    return v;
  };
  const enLaCurva = (k: number, zc: number, hc: number, puntos: Perfil, w: number): V[] =>
    puntos.map(([u, v]) => {
      const [x, h] = enLaPared(hc, w, v);
      return [k * x, H(h), zc + u] as V;
    });
  const anillo = (m: Cosido, a: readonly V[], b: readonly V[], color: string, hacia: V, brillo = 1): void => {
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      m.cuad(a[i]!, a[j]!, b[j]!, b[i]!, color, hacia, brillo);
    }
  };
  const vIn = SECCION.alturaDeLaVentanilla;
  const [bajo, alto] = [vIn - BOCA.alto / 2, vIn + BOCA.alto / 2];
  for (const k of [-1, 1]) {
    // Delante de la última puerta, y hasta el techo: ahí no hay compartimentos.
    cuerpo.tira(arco(k, 0, 2.42, 10), pared, finDeLaPuerta, COLOR.pared, eje);
    // Debajo y encima de la fila de ventanillas, seguido.
    cuerpo.tira(arco(k, 0, bajo, 4), finDeLaPuerta, hasta, COLOR.pared, eje, false, 1, 8);
    cuerpo.tira(arco(k, alto, 2.42, 6), finDeLaPuerta, hasta, COLOR.pared, eje, false, 1, 8);
    // Y entre ventanilla y ventanilla, la pared; en cada una, su hueco, por el que se ve fuera.
    let z = finDeLaPuerta;
    for (const zv of [...ventanillas, hasta + BOCA.ancho / 2]) {
      const a = zv - BOCA.ancho / 2;
      if (a > z + 0.005) cuerpo.tira(arco(k, bajo, alto, 4), z, a, COLOR.pared, eje);
      z = zv + BOCA.ancho / 2;
    }
    const ojoDentro: V = [0, H(1.2), 0];
    for (const zv of ventanillas) {
      const boca = enLaCurva(k, zv, vIn, redondeado(BOCA.ancho, BOCA.alto, BOCA.esquina), -0.008);
      const bisel = enLaCurva(k, zv, vIn, redondeado(BISEL.ancho, BISEL.alto, BISEL.esquina), -0.008);
      const hueco = enLaCurva(k, zv, vIn, redondeado(CRISTAL.ancho, CRISTAL.alto, CRISTAL.esquina), HONDO);
      const hacia: V = [ojoDentro[0], ojoDentro[1], zv];
      anillo(cuerpo, boca, bisel, COLOR.bisel, hacia, 1.05);
      anillo(cuerpo, boca, hueco, COLOR.embudo, hacia);
      // El cristal, que se tiñe: ver `ponerLuz`. Sin persiana.
      for (let i = 1; i + 1 < hueco.length; i++) cristales.tri(hueco[0]!, hueco[i]!, hueco[i + 1]!, COLOR.apagada);
    }
    // ── La puerta de las 2, con todo lo que tiene una puerta de verdad ─────
    const losa = (z0: number, z1: number, h0: number, h1: number, w: number, color: string, n = 8, brillo = 1): void =>
      cuerpo.tira(arco(k, h0, h1, n, w), z0, z1, color, eje, false, brillo);
    const [pz0, pz1] = [delante.zMin, delante.zMax];
    const altoPuerta = 1.93;
    losa(pz0 - 0.08, pz0, 0, altoPuerta + 0.08, -0.022, COLOR.junta);
    losa(pz1, pz1 + 0.08, 0, altoPuerta + 0.08, -0.022, COLOR.junta);
    losa(pz0, pz1, altoPuerta, altoPuerta + 0.08, -0.022, COLOR.junta, 1);
    losa(pz0 + 0.01, pz1 - 0.01, 0.02, altoPuerta - 0.01, -0.04, COLOR.puerta);
    // El bulto del tobogán, abajo, y el asa larga, a media puerta.
    losa(pz0 + 0.05, pz1 - 0.05, 0.05, 0.47, -0.15, COLOR.bulto, 2);
    losa(zPuerta - 0.3, zPuerta + 0.26, 1.1, 1.16, -0.1, COLOR.asa, 1);
    losa(pz1 + 0.03, pz1 + 0.06, 0.9, 1.6, -0.09, COLOR.asa, 2);
    // La ventanita de la puerta, en su bisel.
    const ventanita = enLaCurva(k, zPuerta, 1.47, redondeado(0.17, 0.25, 0.07), -0.05);
    const biselito = enLaCurva(k, zPuerta, 1.47, redondeado(0.24, 0.32, 0.09), -0.05);
    anillo(cuerpo, ventanita, biselito, COLOR.bisel, [0, H(1.2), zPuerta]);
    for (let i = 1; i + 1 < ventanita.length; i++) cristales.tri(ventanita[0]!, ventanita[i]!, ventanita[i + 1]!, COLOR.apagada);
    // La luz cálida encima de la puerta.
    luces.caja(k * 1.75, H(2.44), zPuerta - 0.26, 0.16, 0.012, 0.16, COLOR.focoDePuerta);
    luces.caja(k * 1.75, H(2.44), zPuerta + 0.26, 0.16, 0.012, 0.16, COLOR.focoDePuerta);
  }

  // ── Los compartimentos ─────────────────────────────────────────────────
  const modulos: (readonly [number, number])[] = [];
  for (let z = binsDesde; z < hasta - 0.05; z += MODULO) modulos.push([z, Math.min(z + MODULO, hasta)]);
  const mueve = (p: Perfil, d: number, c: readonly [number, number]): Perfil =>
    p.map(([x, h]) => {
      const l = Math.hypot(x - c[0], h - c[1]) || 1;
      return [x + ((x - c[0]) / l) * d, h + ((h - c[1]) / l) * d] as const;
    });
  const centroDelLado: readonly [number, number] = [1.92, 2.02];
  for (const k of [-1, 1]) {
    cuerpo.tira([...de(k, COMPARTIMENTO), de(k, COMPARTIMENTO)[0]!], binsDesde, hasta, COLOR.compartimento, [k * centroDelLado[0], H(centroDelLado[1])], true, 0.85, 6);
    for (const [a, b] of modulos) {
      const puerta = de(k, mueve(PUERTA_DEL_COMPARTIMENTO, 0.012, centroDelLado));
      cuerpo.tira(puerta, a + 0.012, b - 0.012, COLOR.puertaDeCompartimento, [k * centroDelLado[0], H(centroDelLado[1])], true);
      const labio = de(k, mueve(PUERTA_DEL_COMPARTIMENTO.slice(-3), 0.022, centroDelLado));
      cuerpo.tira(labio, a + 0.012, b - 0.012, COLOR.labio, [k * centroDelLado[0], H(centroDelLado[1])], true);
      cuerpo.caja(k * 1.545, H(2.07), (a + b) / 2, 0.03, 0.035, 0.3, COLOR.asa);
    }
    // La luz del techo, escondida encima del compartimento, a lo largo.
    const bandaLateral = (x: number, h: number, ax: number, ah: number): void =>
      coves.cuad(
        [k * (x - ax), H(h - ah), binsDesde],
        [k * (x + ax), H(h + ah), binsDesde],
        [k * (x + ax), H(h + ah), hasta],
        [k * (x - ax), H(h - ah), hasta],
        "#ffffff",
      );
    bandaLateral(1.735, 2.325, 0.022, 0.016);
    bandaLateral(0.695, 2.305, 0.022, -0.016);
    // El panel de debajo: la luz de lectura y el aire de cada fila.
    cuerpo.caja(k * 2.27, H(1.645), (binsDesde + hasta) / 2, 0.42, 0.03, hasta - binsDesde, COLOR.panel);
  }
  const mitadCentro = CENTRO.map(([x, h]) => [x, h] as const);
  const cierreCentro: Perfil = [...mitadCentro, ...mitadCentro.slice(0, -1).reverse().map(([x, h]) => [-x, h] as const)];
  const centroCentro: readonly [number, number] = [0, 2.05];
  cuerpo.tira(de(1, cierreCentro), binsDesde, hasta, COLOR.compartimento, [0, H(centroCentro[1])], true, 0.85, 6);
  for (const [a, b] of modulos)
    for (const k of [-1, 1]) {
      cuerpo.tira(de(k, mueve(PUERTA_DEL_CENTRO, 0.012, centroCentro)), a + 0.012, b - 0.012, COLOR.puertaDeCompartimento, [0, H(centroCentro[1])], true);
      cuerpo.caja(k * 0.665, H(1.88), (a + b) / 2, 0.05, 0.022, b - a - 0.024, COLOR.labio);
      cuerpo.caja(k * 0.728, H(2.17), (a + b) / 2, 0.02, 0.035, 0.3, COLOR.asa);
    }
  cuerpo.caja(0, H(1.845), (binsDesde + hasta) / 2, 1.0, 0.03, hasta - binsDesde, COLOR.panel);

  // ── Las filas, con su gente ────────────────────────────────────────────
  const { asientos, pasillos } = disposicion333();
  const paso = SECCION.asiento + SECCION.brazo;
  const cabezaCerca = new IcosahedronGeometry(0.095, 1);
  cabezaCerca.scale(1, 1.12, 1.05);
  const cabezaLejos = new IcosahedronGeometry(0.095, 0);
  cabezaLejos.scale(1, 1.12, 1.05);
  const franjaDeLaFunda = `#${new Color(franja).getHexString()}`;
  const deAraX = s * Math.abs(asientos[0]!);
  const alLadoDeAra = (x: number): boolean => Math.sign(x) === s && Math.abs(x) > paso * 1.5;
  filas.forEach((y, f) => {
    const dePopa = y + POPA_DEL_ASIENTO;
    const enFilaDeAra = f === deAra;
    const delanteDeAra = f === deAra - 1;
    for (const [funda, x] of asientos.entries()) {
      cuerpo.caja(x, H(0.42), y + 0.25, SECCION.asiento, 0.12, 0.48, COLOR.asiento);
      cuerpo.caja(x, H(0.8), y + 0.52, SECCION.asiento, 0.8, 0.1, COLOR.asiento);
      cuerpo.caja(x, H(1.14), y + 0.515, SECCION.asiento * 0.9, 0.14, 0.12, COLOR.funda, 1.05);
      // Por detrás, lo que tiene delante el de detrás: la franja, la pantalla, la mesa y su cierre.
      const z = dePopa + 0.004;
      cuerpo.carita(x, H(1.075), z + 0.002, SECCION.asiento * 0.9, 0.014, franjaDeLaFunda);
      cuerpo.carita(x, H(PANTALLA.altura), z + 0.002, PANTALLA.ancho + 2 * PANTALLA.marco, PANTALLA.alto + 2 * PANTALLA.marco, COLOR.marco);
      const laDeAra = delanteDeAra && Math.abs(x - deAraX) < 0.01;
      const apagada = (delanteDeAra && alLadoDeAra(x) && !laDeAra) || azar(f * 13 + funda * 1.7) < 0.22;
      if (!laDeAra)
        luces.carita(x, H(PANTALLA.altura), z + 0.004, PANTALLA.ancho, PANTALLA.alto, apagada ? COLOR.apagada : COLOR.pantalla, apagada ? 1 : 0.55 + 0.45 * azar(f * 3.3 + funda));
      cuerpo.carita(x, H(0.66), z + 0.002, 0.34, 0.27, COLOR.bandeja);
      cuerpo.carita(x, H(0.815), z + 0.004, 0.06, 0.03, COLOR.asa);
      // La gente: casi todos. Al lado de Ara, los dos asientos vacíos de la lámina.
      // Y a la fila de delante, las de los dos bloques del pasillo de Ara: quedan a un palmo de la vista.
      const pegada = delanteDeAra && Math.abs(x - s * pasillos[1]) < BLOQUE;
      if (!(enFilaDeAra && alLadoDeAra(x)) && !pegada && azar(f * 7 + funda * 3) < 0.84) {
        const cerca = f >= deAra - 4;
        cuerpo.bola(cerca ? cabezaCerca : cabezaLejos, x + (azar(f + funda * 0.5) - 0.5) * 0.05, H(1.22 + azar(f * 2 + funda) * 0.05), y + 0.34, COLOR.pelo[Math.floor(azar(f * 5 + funda * 0.3) * COLOR.pelo.length)]!);
      }
    }
    // Los cuatro brazos de cada bloque y las patas.
    for (const c of [-1, 0, 1]) {
      const cx = c * (BLOQUE + SECCION.pasillo);
      for (let b = 0; b < 4; b++) {
        const xb = cx - BLOQUE / 2 + SECCION.brazo / 2 + b * paso;
        cuerpo.caja(xb, H(0.62), y + 0.3, SECCION.brazo, 0.05, 0.5, COLOR.brazo);
      }
      for (const lado2 of [-0.55, 0.55]) cuerpo.caja(cx + lado2, H(0.18), y + 0.3, 0.05, 0.36, 0.42, COLOR.junta);
    }
  });

  // ── La pantalla de Ara ─────────────────────────────────────────────────
  const filaDeDelante = filas[deAra - 1] ?? cojinDeAra - SECCION.entreFilas;
  const zPantalla = filaDeDelante + POPA_DEL_ASIENTO + 0.009;
  const pantalla = new PantallaDelRespaldo();

  // ── Las luces de lectura: unas pocas encendidas ────────────────────────
  for (let f = 0; f < filas.length; f++) {
    const z = filas[f]! + 0.22;
    for (const xl of [-2.27, -2.15, -0.1, 0.1, 2.15, 2.27]) {
      const h = Math.abs(xl) < 1 ? 1.828 : 1.628;
      const encendida = azar(f * 11 + xl * 7) < 0.14;
      luces.cuad([xl - 0.022, H(h), z - 0.022], [xl + 0.022, H(h), z - 0.022], [xl + 0.022, H(h), z + 0.022], [xl - 0.022, H(h), z + 0.022], encendida ? COLOR.lectura : COLOR.luzApagada);
    }
  }

  // ── Los aseos, los armarios y las cortinas, al fondo ───────────────────
  const fondo = 1.05;
  const yc = monumentos - fondo / 2;
  cuerpo.caja(0, H(1.225), yc, 1.48, 2.45, fondo, COLOR.monumento);
  for (const k of [-1, 1]) {
    const lx = k * 0.37;
    cuerpo.carita(lx, H(0.95), monumentos + 0.006, 0.58, 1.86, COLOR.puertaDeAseo);
    cuerpo.carita(lx - k * 0.21, H(1.05), monumentos + 0.012, 0.04, 0.1, COLOR.asa);
    luces.carita(lx - k * 0.21, H(1.2), monumentos + 0.012, 0.05, 0.022, COLOR.libre);
    // El armario, por fuera, con el asiento plegado de la tripulación junto a la puerta.
    cuerpo.caja(k * 1.98, H(1.3), yc, 1.48, 2.6, fondo, COLOR.monumento);
    cuerpo.carita(k * 1.62, H(1.0), monumentos + 0.006, 0.62, 1.8, COLOR.puertaDeAseo);
    cuerpo.carita(k * 1.36, H(1.05), monumentos + 0.012, 0.03, 0.12, COLOR.asa);
    cuerpo.caja(k * 2.22, H(0.95), monumentos + 0.05, 0.42, 0.6, 0.08, COLOR.asiento);
    cuerpo.caja(k * 2.22, H(1.36), monumentos + 0.05, 0.34, 0.18, 0.08, COLOR.funda);
    cuerpo.caja(k * 2.22, H(0.62), monumentos + 0.12, 0.42, 0.06, 0.38, COLOR.asiento);
    // El pasillo sigue por delante, detrás de su cortina, entreabierta del lado de fuera.
    cuerpo.caja(k * 0.99, H(2.33), monumentos - 0.03, 0.5, 0.56, 0.06, COLOR.monumento);
    const [xa, xb] = [0.74, 1.1];
    const n = 12;
    const puntos: V[] = [];
    for (let i = 0; i <= n; i++) puntos.push([k * (xa + ((xb - xa) * i) / n), H(0.03), monumentos - 0.07 + (i % 2 ? 0.025 : -0.025)]);
    for (let i = 0; i < n; i++) {
      const p = puntos[i]!;
      const q = puntos[i + 1]!;
      cuerpo.cuad(p, q, [q[0], H(2.03), q[2]], [p[0], H(2.03), p[2]], COLOR.cortina, [p[0], H(1), monumentos + 2], 1);
    }
    luces.caja(k * 0.99, H(2.52), zPuerta, 0.16, 0.012, 0.16, COLOR.focoDePuerta);
  }
  // La pared de más allá de las cortinas, y detrás de Ara, que nadie vea el cielo por ahí.
  cuerpo.caja(0, H(1.3), pared, 5.4, 2.6, 0.05, COLOR.monumento);
  cuerpo.caja(0, H(1.3), hasta, 5.4, 2.6, 0.05, COLOR.monumento);

  // ── Las tiras del suelo, y el rojo donde acaban ────────────────────────
  const tiras: { x: number; y: number; z: number }[] = [];
  const finDeLasTiras = zPuerta + 0.15;
  for (const px of pasillos) {
    for (const lx of [px - SECCION.pasillo / 2 + 0.02, px + SECCION.pasillo / 2 - 0.02]) {
      luces.caja(lx, H(0.004), (finDeLasTiras + hasta) / 2, 0.028, 0.008, hasta - finDeLasTiras, COLOR.tira);
      for (let z = hasta - 0.5; z >= finDeLasTiras; z -= 0.5) tiras.push({ x: lx, y: H(0.008), z });
      luces.caja(lx, H(0.004), finDeLasTiras - 0.04, 0.05, 0.009, 0.08, COLOR.rojo);
    }
    const k = Math.sign(px);
    const desde = Math.abs(px) + SECCION.pasillo / 2;
    luces.caja(k * ((desde + X - 0.1) / 2), H(0.004), zPuerta, X - 0.1 - desde, 0.008, 0.06, COLOR.rojo);
  }

  // ── Los soportes de las señales de salida ──────────────────────────────
  const LETRERO = { ancho: 0.36, alto: 0.15 };
  for (const k of [-1, 1]) {
    cuerpo.caja(k * pasillos[1], H(2.2), binsDesde + 0.06, LETRERO.ancho + 0.03, LETRERO.alto + 0.03, 0.03, COLOR.junta);
    cuerpo.caja(k * pasillos[1], H(2.4), binsDesde + 0.06, 0.03, 0.27, 0.03, COLOR.junta);
    cuerpo.caja(k * 1.75, H(2.2), zPuerta, LETRERO.ancho + 0.03, LETRERO.alto + 0.03, 0.03, COLOR.junta);
  }

  // ── Se junta ───────────────────────────────────────────────────────────
  const grupo = new Group();
  grupo.name = "cabina-333";
  const material = new ShaderMaterial({
    vertexShader: VERTICES,
    fragmentShader: FRAGMENTOS,
    vertexColors: true,
    side: DoubleSide,
    uniforms: { uFria: { value: new Color(1, 1, 1) }, uCalida: { value: new Color(0, 0, 0) } },
    fog: false,
  });
  const malla = new Mesh(cuerpo.geometria(), material);
  malla.name = "cabina-333-cuerpo";
  const delasLuces = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide });
  const mallaLuces = new Mesh(luces.geometria(), delasLuces);
  const delosCoves = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide });
  const mallaCoves = new Mesh(coves.geometria(), delosCoves);
  const delCristal = new MeshBasicMaterial({
    color: new Color(0.01, 0.02, 0.07),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
    blending: NormalBlending,
    toneMapped: false,
  });
  const mallaCristales = new Mesh(cristales.geometria(), delCristal);
  /*
   * **Lo primero de todo**, como el marco de la ventanilla: lo que queda detrás de
   * esta pared ya no se calcula. Y el tinte, lo último: encima de las nubes que se
   * vean por el cristal.
   */
  for (const m of [malla, mallaLuces, mallaCoves]) {
    m.renderOrder = Number.MIN_SAFE_INTEGER + 1;
    m.frustumCulled = false;
    grupo.add(m);
  }
  mallaCristales.renderOrder = Number.MAX_SAFE_INTEGER - 1;
  mallaCristales.frustumCulled = false;
  grupo.add(mallaCristales);

  // La pantalla de Ara, sobre el respaldo de delante.
  const caraDeLaPantalla = new Mesh(
    new PlaneGeometry(PANTALLA.ancho, PANTALLA.alto),
    new MeshBasicMaterial({ color: pantalla.textura ? 0xffffff : COLOR.pantalla, map: pantalla.textura, toneMapped: false }),
  );
  caraDeLaPantalla.name = "pantalla-del-respaldo";
  caraDeLaPantalla.position.set(deAraX, H(PANTALLA.altura), zPantalla);
  caraDeLaPantalla.renderOrder = Number.MIN_SAFE_INTEGER + 1;
  caraDeLaPantalla.frustumCulled = false;
  grupo.add(caraDeLaPantalla);

  // ── Las señales de salida ──────────────────────────────────────────────
  const letreros: { x: number; y: number; z: number }[] = [];
  const texturas = { "-1": texturaDeSalida(-1), "1": texturaDeSalida(1) } as const;
  const colgarLaSenal = (x: number, h: number, z: number, hacia: -1 | 1): void => {
    const cara = new Mesh(
      new PlaneGeometry(LETRERO.ancho, LETRERO.alto),
      new MeshBasicMaterial({ color: texturas[hacia] ? 0xffffff : COLOR.salida, map: texturas[hacia], toneMapped: false }),
    );
    cara.position.set(x, H(h), z + 0.017);
    cara.renderOrder = Number.MIN_SAFE_INTEGER + 1;
    cara.frustumCulled = false;
    grupo.add(cara);
    letreros.push({ x, y: H(h), z: z + 0.017 });
  };
  // Primero la del pasillo de Ara, que corre hacia su puerta: es la más cercana.
  for (const k of [s, -s] as const) colgarLaSenal(k * pasillos[1], 2.2, binsDesde + 0.06, k as -1 | 1);
  // Y encima de cada puerta.
  for (const k of [s, -s] as const) colgarLaSenal(k * 1.75, 2.2, zPuerta, k as -1 | 1);

  // ── Desde dónde se mira ────────────────────────────────────────────────
  const ojo = { x: s * pasillos[1], y: H(MIRANDO_EL_PASILLO.ojosSobreElSuelo), z: sentada.z + 0.15 };
  const pose: AsientoDePasaje = {
    ojo,
    // Hacia el centro, un poco: se ven los dos pasillos y las dos puertas.
    guinada: s * MIRANDO_EL_PASILLO.haciaElCentro,
    cabeceo: MIRANDO_EL_PASILLO.cabeceo,
    ventanilla: ara.ventanilla,
    sentado: null,
    fov: MIRANDO_EL_PASILLO.fov,
  };
  const ojosEnLaPantalla = PANTALLA.altura + 0.03;
  const poseDelRespaldo = (aspecto: number): AsientoDePasaje => ({
    ojo: { x: deAraX, y: H(ojosEnLaPantalla), z: zPantalla + OJOS_A_LA_PANTALLA },
    guinada: 0,
    cabeceo: -Math.atan2(ojosEnLaPantalla - PANTALLA.altura, OJOS_A_LA_PANTALLA),
    ventanilla: ara.ventanilla,
    sentado: null,
    fov: fovParaLaPantalla(aspecto),
  });

  const fria = material.uniforms.uFria!.value as Color;
  const calida = material.uniforms.uCalida!.value as Color;
  return {
    grupo,
    pose,
    letreros,
    tamanoDelLetrero: LETRERO,
    tiras,
    mallas: [malla],
    desde: pared,
    hasta,
    suelo,
    pantalla,
    poseDelRespaldo,
    centroDeLaPantalla: new Vector3(deAraX, H(PANTALLA.altura), zPantalla),
    ponerLuz: (dia: number, luz: number, tapa: number) => {
      const noche =
        luz < LUZ_DE_REFERENCIA.crucero
          ? mezclar3(LUZ.preparada, LUZ.crucero, (luz - LUZ_DE_REFERENCIA.preparada) / (LUZ_DE_REFERENCIA.crucero - LUZ_DE_REFERENCIA.preparada))
          : mezclar3(LUZ.crucero, LUZ.embarcando, (luz - LUZ_DE_REFERENCIA.crucero) / (LUZ_DE_REFERENCIA.embarcando - LUZ_DE_REFERENCIA.crucero));
      const f = mezclar(noche.fria, LUZ.dia.fria, dia);
      const c = mezclar(noche.calida, LUZ.dia.calida, dia);
      const v = mezclar(noche.cove, LUZ.dia.cove, dia);
      fria.setRGB(f[0], f[1], f[2]);
      calida.setRGB(c[0], c[1], c[2]);
      delosCoves.color.setRGB(v[0], v[1], v[2]);
      delCristal.opacity = Math.max(0, Math.min(1, tapa)) * 0.94;
      mallaCristales.visible = delCristal.opacity > 0.003;
    },
  };
}
