/**
 * **La gente de la misión de Teno**, que espera junto al faro, sube al
 * helicóptero y baja en Garachico. Es quien cumple el contrato de
 * `missions/gente.ts`; los caminos y los relojes son de
 * `missions/caminos-de-la-gente.ts`, que se prueban sin navegador.
 *
 * Doce personas y un perro de excursión, como los que se quedaron en la punta
 * en julio de 2016 —123 personas y cinco perros, en varios viajes—, y el
 * tripulante que baja a ayudarles, con su casco y su mono.
 *
 * ## Que se lean desde el aire
 *
 * Lo mismo que el señalero (`world/senalero.ts`): de la realidad se conserva el
 * significado y no la escala. Las figuras van algo más grandes que de verdad
 * —`ESCALA`—, con colores de ropa de verano que no se confunden con la lava ni
 * con el asfalto, y se mueven: quien espera un helicóptero lo saluda con el
 * brazo, y el movimiento es lo primero que se ve desde una cabina. No más
 * grandes que eso, porque tienen que caber por una puerta que sí está a escala.
 *
 * ## Una sola llamada de dibujo
 *
 * Todas las figuras van en **una malla**, con el color en los vértices y un
 * material Lambert, que se apaga de noche con la luz de la escena como el resto
 * del mundo. Cada figura son cajas y una esfera que se colocan en la CPU cada
 * fotograma: unos diez mil vértices, que cuestan menos que una llamada más por
 * persona. Quien no se mueve no se reescribe.
 */

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DynamicDrawUsage,
  Euler,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Sphere,
  SphereGeometry,
  Vector3,
  type Material,
} from "three";
import type { DondeEsperan, EmpiezaLaGente, GenteDeLaMision } from "../missions/gente";
import {
  aLocal,
  enElCamino,
  largo,
  metrosA,
  planDeBajada,
  planDeSubida,
  pasilloDeLaPuerta,
  sitioDelTripulante,
  sitioParaApartarse,
  sitiosDeLaGente,
  type Horario,
  type Posado,
  type Punto,
} from "../missions/caminos-de-la-gente";

/**
 * Cuánto más grandes que de verdad, como el señalero pero menos: él está solo
 * en una plataforma y a estos hay que verlos entrar por una puerta de metro
 * setenta y cuatro, que va a escala.
 */
export const ESCALA = 1.25;

/**
 * **La puerta sin modelo**: con la silueta de cajas no hay corredera que
 * medir, y se usa la del Super Puma, en sus ejes: un poco por delante del
 * mástil y en la piel derecha. Ver `PUERTA` en `modelos/jaz-super-puma.py`.
 */
const PUERTA_SIN_MODELO = { adelante: 0.155, derecha: 1.13 };

/** A cuánto se dejan de dibujar, m: más lejos no son ni un píxel. */
const SE_VEN_HASTA = 4000;

/** A qué distancia del helicóptero en el aire se le saluda, m. */
const SE_SALUDA_A = 900;

// ── Cómo es cada uno ──────────────────────────────────────────────────────

interface Persona {
  readonly tipo: "persona";
  /** Cuánto mide de verdad, m. */
  readonly alto: number;
  readonly camiseta: number;
  readonly pantalon: number;
  readonly piel: number;
  readonly pelo: number;
  readonly peinado: "corto" | "largo" | "coleta";
  /** Pantalón corto: se ven las piernas. */
  readonly corto?: boolean;
  /** Manga larga: sudadera o camisa. */
  readonly mangaLarga?: boolean;
  readonly gorra?: number;
  readonly sombrero?: number;
  readonly mochila?: number;
  readonly zapatos?: number;
  /** Si saluda al helicóptero cuando se acerca o cuando se va. */
  readonly saluda?: boolean;
}

interface Perro {
  readonly tipo: "perro";
  readonly pelaje: number;
  readonly orejas: number;
}

interface Tripulante {
  readonly tipo: "tripulante";
}

type Figura = Persona | Perro | Tripulante;

const PIEL = { clara: 0xf1c7a5, media: 0xe0ac85, morena: 0xc68b5e, oscura: 0x8d5a3b, negra: 0x5c3a24 };
const PELO = { negro: 0x1e1a18, castano: 0x3b2a1e, marron: 0x6b4a2f, rubio: 0xc9a25e, canoso: 0xb9b6b0, blanco: 0xdcdad5 };

/**
 * **La gente**: doce personas de excursión, de un niño de seis años a un
 * señor de setenta, siete hombres y cinco mujeres, con ropa de verano de
 * colores distintos —nada de uniformes—, y un perro mediano que va con su
 * dueño. El orden es el de la fila: el perro detrás del suyo.
 */
const GENTE: readonly Figura[] = [
  { tipo: "persona", alto: 1.78, camiseta: 0xc8382e, pantalon: 0xc8b48a, corto: true, piel: PIEL.media, pelo: PELO.castano, peinado: "corto", gorra: 0x2c5aa0, mochila: 0x4a4f57, saluda: true },
  { tipo: "persona", alto: 1.65, camiseta: 0x2aa6a0, pantalon: 0x3d5a80, piel: PIEL.clara, pelo: PELO.marron, peinado: "coleta" },
  { tipo: "persona", alto: 1.3, camiseta: 0xf2c230, pantalon: 0x2f4f8f, corto: true, piel: PIEL.media, pelo: PELO.negro, peinado: "corto", zapatos: 0xe8e8e8, saluda: true },
  { tipo: "persona", alto: 1.72, camiseta: 0xe8e6df, pantalon: 0x6e6e6a, mangaLarga: true, piel: PIEL.clara, pelo: PELO.canoso, peinado: "corto", sombrero: 0xd8c9a0 },
  { tipo: "persona", alto: 1.6, camiseta: 0x9c7bb8, pantalon: 0x2b3550, piel: PIEL.morena, pelo: PELO.blanco, peinado: "corto" },
  { tipo: "persona", alto: 1.82, camiseta: 0x3c8d4a, pantalon: 0x26272b, corto: true, piel: PIEL.oscura, pelo: PELO.negro, peinado: "corto", mochila: 0xe0702a },
  { tipo: "perro", pelaje: 0xa8703a, orejas: 0x5e3b1f },
  { tipo: "persona", alto: 1.68, camiseta: 0xf2f2ee, pantalon: 0x5b7bb0, corto: true, piel: PIEL.media, pelo: PELO.rubio, peinado: "largo", gorra: 0xc8382e, saluda: true },
  { tipo: "persona", alto: 1.18, camiseta: 0xe86f9a, pantalon: 0x6a4c93, piel: PIEL.morena, pelo: PELO.negro, peinado: "coleta", zapatos: 0xe8e8e8 },
  { tipo: "persona", alto: 1.75, camiseta: 0x24345c, pantalon: 0xb8a47a, piel: PIEL.morena, pelo: PELO.castano, peinado: "corto" },
  { tipo: "persona", alto: 1.7, camiseta: 0xe58a2e, pantalon: 0x26272b, piel: PIEL.negra, pelo: PELO.negro, peinado: "largo", mochila: 0x2c5aa0 },
  { tipo: "persona", alto: 1.62, camiseta: 0x8a8f96, pantalon: 0x3d5a80, mangaLarga: true, piel: PIEL.clara, pelo: PELO.marron, peinado: "corto" },
  { tipo: "persona", alto: 1.74, camiseta: 0x6fb2e0, pantalon: 0x6b6b3c, corto: true, piel: PIEL.media, pelo: PELO.canoso, peinado: "corto", sombrero: 0xd9c27a },
];

const TRIPULANTE: Tripulante = { tipo: "tripulante" };

/** Cuántos suben: las personas y el perro. */
export const CUANTOS = GENTE.length;

// ── Las piezas ────────────────────────────────────────────────────────────

/** De qué articulación cuelga cada pieza. */
type Junta = "cuerpo" | "piernaI" | "piernaD" | "brazoI" | "brazoD" | "patasA" | "patasB" | "cola";

interface Pieza {
  readonly pos: Float32Array;
  readonly nor: Float32Array;
  readonly color: number;
  readonly junta: Junta;
}

/** Una geometría de three a triángulos sueltos, movida a su sitio. */
function pieza(g: BufferGeometry, x: number, y: number, z: number, color: number, junta: Junta): Pieza {
  g.translate(x, y, z);
  const suelta = g.index ? g.toNonIndexed() : g;
  const pos = suelta.getAttribute("position").array as Float32Array;
  const nor = suelta.getAttribute("normal").array as Float32Array;
  return { pos: Float32Array.from(pos), nor: Float32Array.from(nor), color, junta };
}

const caja = (ax: number, ay: number, az: number, x: number, y0: number, z: number, color: number, junta: Junta) =>
  pieza(new BoxGeometry(ax, ay, az), x, y0 + ay / 2, z, color, junta);

/** Las alturas de una persona de metro setenta y cinco, antes de escalarla. */
const CADERA = 0.88;
const HOMBRO = 1.4;

function piezasDePersona(p: Persona): Pieza[] {
  const ps: Pieza[] = [];
  const zapato = p.zapatos ?? 0x2b2b2e;
  for (const [lado, junta] of [[1, "piernaI"], [-1, "piernaD"]] as const) {
    const x = lado * 0.095;
    if (p.corto) {
      ps.push(caja(0.155, 0.36, 0.175, x, CADERA - 0.36, 0, p.pantalon, junta));
      ps.push(caja(0.12, 0.44, 0.13, x, 0.08, 0, p.piel, junta));
    } else {
      ps.push(caja(0.15, 0.8, 0.17, x, 0.08, 0, p.pantalon, junta));
    }
    ps.push(caja(0.13, 0.08, 0.25, x, 0, 0.04, zapato, junta));
  }
  ps.push(caja(0.4, 0.56, 0.23, 0, CADERA - 0.02, 0, p.camiseta, "cuerpo"));
  // Los niños tienen la cabeza más grande para lo que miden.
  const cabeza = p.alto < 1.4 ? 1.25 : 1;
  const yc = 1.58;
  ps.push(pieza(new SphereGeometry(0.115 * cabeza, 8, 6), 0, yc, 0.01, p.piel, "cuerpo"));
  ps.push(pieza(new SphereGeometry(0.122 * cabeza, 8, 3, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, yc + 0.005, -0.012, p.pelo, "cuerpo"));
  if (p.peinado === "largo") ps.push(caja(0.22 * cabeza, 0.3, 0.06, 0, yc - 0.24, -0.1 * cabeza, p.pelo, "cuerpo"));
  if (p.peinado === "coleta") ps.push(caja(0.07, 0.2, 0.07, 0, yc - 0.18, -0.15 * cabeza, p.pelo, "cuerpo"));
  if (p.gorra !== undefined) {
    ps.push(pieza(new SphereGeometry(0.127 * cabeza, 8, 3, 0, Math.PI * 2, 0, Math.PI * 0.45), 0, yc + 0.012, -0.01, p.gorra, "cuerpo"));
    ps.push(caja(0.17, 0.02, 0.12, 0, yc + 0.05, 0.14 * cabeza, p.gorra, "cuerpo"));
  }
  if (p.sombrero !== undefined) {
    ps.push(pieza(new CylinderGeometry(0.21 * cabeza, 0.21 * cabeza, 0.02, 10), 0, yc + 0.07, 0, p.sombrero, "cuerpo"));
    ps.push(pieza(new CylinderGeometry(0.1 * cabeza, 0.12 * cabeza, 0.1, 10), 0, yc + 0.12, 0, p.sombrero, "cuerpo"));
  }
  if (p.mochila !== undefined) ps.push(caja(0.3, 0.36, 0.14, 0, CADERA + 0.12, -0.18, p.mochila, "cuerpo"));
  for (const [lado, junta] of [[1, "brazoI"], [-1, "brazoD"]] as const) {
    const x = lado * 0.255;
    const manga = p.mangaLarga ? 0.5 : 0.2;
    ps.push(caja(0.11, manga, 0.12, x, HOMBRO - manga, 0, p.camiseta, junta));
    ps.push(caja(0.09, 0.6 - manga, 0.1, x, HOMBRO - 0.6, 0, p.piel, junta));
  }
  return ps;
}

function piezasDeTripulante(): Pieza[] {
  const mono = 0xe8641e;
  const negro = 0x1c1c1f;
  const ps: Pieza[] = [];
  for (const [lado, junta] of [[1, "piernaI"], [-1, "piernaD"]] as const) {
    ps.push(caja(0.16, 0.74, 0.18, lado * 0.095, 0.14, 0, mono, junta));
    ps.push(caja(0.14, 0.16, 0.26, lado * 0.095, 0, 0.03, negro, junta));
  }
  ps.push(caja(0.42, 0.58, 0.25, 0, CADERA - 0.04, 0, mono, "cuerpo"));
  // Las bandas reflectantes del mono.
  ps.push(caja(0.43, 0.05, 0.26, 0, 1.22, 0, 0xd8d8d0, "cuerpo"));
  ps.push(pieza(new SphereGeometry(0.155, 10, 7), 0, 1.6, 0, 0xf0f0ec, "cuerpo"));
  ps.push(caja(0.2, 0.08, 0.06, 0, 1.56, 0.13, 0x22252b, "cuerpo"));
  for (const [lado, junta] of [[1, "brazoI"], [-1, "brazoD"]] as const) {
    ps.push(caja(0.12, 0.5, 0.13, lado * 0.265, HOMBRO - 0.5, 0, mono, junta));
    ps.push(caja(0.1, 0.11, 0.11, lado * 0.265, HOMBRO - 0.61, 0, negro, junta));
  }
  return ps;
}

function piezasDePerro(p: Perro): Pieza[] {
  const ps: Pieza[] = [];
  ps.push(caja(0.24, 0.24, 0.62, 0, 0.3, 0, p.pelaje, "cuerpo"));
  ps.push(caja(0.19, 0.19, 0.22, 0, 0.5, 0.36, p.pelaje, "cuerpo"));
  ps.push(caja(0.11, 0.09, 0.13, 0, 0.5, 0.52, p.orejas, "cuerpo"));
  ps.push(caja(0.05, 0.1, 0.05, 0.07, 0.67, 0.33, p.orejas, "cuerpo"));
  ps.push(caja(0.05, 0.1, 0.05, -0.07, 0.67, 0.33, p.orejas, "cuerpo"));
  ps.push(caja(0.05, 0.05, 0.24, 0, 0.5, -0.4, p.pelaje, "cola"));
  for (const [x, z, junta] of [[0.08, 0.22, "patasA"], [-0.08, -0.22, "patasA"], [-0.08, 0.22, "patasB"], [0.08, -0.22, "patasB"]] as const)
    ps.push(caja(0.07, 0.33, 0.07, x, 0, z, p.pelaje, junta));
  return ps;
}

function piezasDe(f: Figura): Pieza[] {
  return f.tipo === "persona" ? piezasDePersona(f) : f.tipo === "perro" ? piezasDePerro(f) : piezasDeTripulante();
}

/** Dónde gira cada junta, en la figura sin escalar. */
function giroDe(f: Figura, junta: Junta): [number, number, number] {
  if (f.tipo === "perro")
    return junta === "cola" ? [0, 0.52, -0.3] : junta === "cuerpo" ? [0, 0.3, 0] : [0, 0.33, 0];
  switch (junta) {
    case "piernaI":
    case "piernaD":
    case "cuerpo":
      return [0, CADERA, 0];
    case "brazoI":
      return [0.255, HOMBRO, 0];
    case "brazoD":
      return [-0.255, HOMBRO, 0];
    default:
      return [0, 0, 0];
  }
}

// ── Lo que hace cada uno ──────────────────────────────────────────────────

interface Andante {
  readonly figura: Figura;
  /** Dónde empieza su trozo de la malla, en vértices, y cuántos tiene. */
  readonly desde: number;
  readonly cuantos: number;
  readonly piezas: readonly Pieza[];
  /** Cuánto se escala la figura entera. */
  readonly escala: number;
  /**
   * `fuera` de pie en algún sitio; `andando` por un camino con su reloj;
   * `dentro` del helicóptero; `nadie` sin misión.
   */
  estado: "fuera" | "andando" | "dentro" | "nadie";
  x: number;
  z: number;
  y: number;
  rumbo: number;
  /** Hacia dónde mira quieto, si no hay helicóptero que mirar. */
  mira: number;
  camino: readonly Punto[];
  horario: Horario;
  /** En qué acaba el camino. */
  alAcabar: "dentro" | "fuera";
  /** El paso: fase de las piernas, y cuánto se mueven (0 quieto, 1 andando). */
  fase: number;
  anda: number;
  /** Agachado bajo el disco, de 0 a 1. */
  agachado: number;
  /** Saludando con el brazo, de 0 a 1. */
  saludo: number;
  /** Si hay que reescribirlo. */
  sucio: boolean;
  visible: boolean;
}

/** El estado del tripulante, que va por su cuenta: sale, espera junto a la puerta y entra. */
type Tripu = "dentro" | "saliendo" | "fuera" | "entrando";

/** Lo que el juego necesita saber para que se muevan, cada fotograma. */
export interface ElHelicoptero {
  readonly x: number;
  readonly z: number;
  readonly enElSuelo: boolean;
}

export class GenteDeLaMisionDibujada implements GenteDeLaMision {
  readonly malla: Mesh;
  private readonly geometria = new BufferGeometry();
  private readonly posiciones: BufferAttribute;
  private readonly normales: BufferAttribute;
  private readonly andantes: Andante[] = [];
  private readonly tripulante: Andante;
  private tripu: Tripu = "dentro";
  /** Segundos desde el último `empieza`. */
  private t = 0;
  private posado: Posado | null = null;
  private puertaY = 0;
  private entraElTripulante = Infinity;
  private puerta = 0;
  /** Si la espera de ahora es de subir o de bajar. */
  private que: "suben" | "bajan" | null = null;
  /** Dónde esperan antes de subir, y hacia dónde miran. */
  private espera: DondeEsperan | null = null;
  private readonly m = new Matrix4();
  private readonly mJ = new Matrix4();
  private readonly mT = new Matrix4();

  /**
   * `suelo` es la cota que pisa la gente; `pisable`, si en ese punto se puede
   * estar de pie: seco, sin edificio y sin escalón con el helicóptero.
   */
  constructor(
    private readonly suelo: (x: number, z: number) => number,
    private readonly pisable: (q: Punto, posado: Posado) => boolean,
    material?: Material,
  ) {
    const todas = [...GENTE, TRIPULANTE];
    let vertices = 0;
    const listas = todas.map((f) => {
      const piezas = piezasDe(f);
      const n = piezas.reduce((s, p) => s + p.pos.length / 3, 0);
      const desde = vertices;
      vertices += n;
      return { f, piezas, desde, n };
    });
    this.posiciones = new BufferAttribute(new Float32Array(vertices * 3), 3);
    this.normales = new BufferAttribute(new Float32Array(vertices * 3), 3);
    this.posiciones.setUsage(DynamicDrawUsage);
    this.normales.setUsage(DynamicDrawUsage);
    const colores = new Float32Array(vertices * 3);
    const c = new Vector3();
    for (const l of listas) {
      let v = l.desde;
      for (const p of l.piezas) {
        // El color en sRGB, como cualquier otro del mundo: three lo pasa a lineal.
        c.set(((p.color >> 16) & 255) / 255, ((p.color >> 8) & 255) / 255, (p.color & 255) / 255);
        const lin = (k: number) => (k <= 0.04045 ? k / 12.92 : ((k + 0.055) / 1.055) ** 2.4);
        for (let i = 0; i < p.pos.length / 3; i++, v++) {
          colores[v * 3] = lin(c.x);
          colores[v * 3 + 1] = lin(c.y);
          colores[v * 3 + 2] = lin(c.z);
        }
      }
      const escala = ESCALA * (l.f.tipo === "persona" ? l.f.alto / 1.75 : l.f.tipo === "perro" ? 1.1 : 1.8 / 1.75);
      const a: Andante = {
        figura: l.f,
        desde: l.desde,
        cuantos: l.n,
        piezas: l.piezas,
        escala,
        estado: "nadie",
        x: 0,
        z: 0,
        y: 0,
        rumbo: 0,
        mira: 0,
        camino: [],
        horario: [],
        alAcabar: "fuera",
        fase: Math.random() * 6,
        anda: 0,
        agachado: 0,
        saludo: 0,
        sucio: true,
        visible: false,
      };
      if (l.f.tipo === "tripulante") this.tripulante = a;
      else this.andantes.push(a);
    }
    // Siempre lo hay, que va el último en `todas`; esto es para el compilador.
    this.tripulante ??= this.andantes[0] as Andante;
    this.geometria.setAttribute("position", this.posiciones);
    this.geometria.setAttribute("normal", this.normales);
    this.geometria.setAttribute("color", new BufferAttribute(colores, 3));
    this.geometria.boundingSphere = new Sphere(new Vector3(), 1);
    this.malla = new Mesh(this.geometria, material ?? new MeshLambertMaterial({ vertexColors: true }));
    this.malla.name = "gente-de-la-mision";
    this.malla.visible = false;
    this.malla.matrixAutoUpdate = false;
  }

  // ── El contrato ────────────────────────────────────────────────────────

  /**
   * **Dónde espera la gente** al empezar la misión, mirando al llano por donde
   * llegará el helicóptero; `null` sin misión, y no hay nadie.
   */
  esperan(e: DondeEsperan | null): void {
    this.espera = e;
    this.posado = null;
    this.que = null;
    this.tripu = "dentro";
    this.tripulante.estado = "dentro";
    this.puerta = 0;
    this.entraElTripulante = Infinity;
    if (!e) {
      for (const a of this.andantes) a.estado = "nadie";
      this.tripulante.estado = "nadie";
      this.malla.visible = false;
      return;
    }
    const sitios = sitiosDeLaGente(e.en, e.mirando, this.andantes.length);
    this.andantes.forEach((a, i) => {
      const s = sitios[i] as Punto;
      this.ponerDePie(a, s, Math.atan2(e.mirando.x - s.x, -(e.mirando.z - s.z)));
    });
  }

  empieza(e: EmpiezaLaGente): void {
    const p: Posado = {
      x: e.donde.x,
      z: e.donde.z,
      rumbo: e.rumbo,
      rotor: e.rotor.radio,
      cola: e.rotor.cola,
      puerta: PUERTA_SIN_MODELO,
    };
    const puerta = e.puerta ? aLocal(p, e.puerta) : PUERTA_SIN_MODELO;
    const posado: Posado = {
      ...p,
      puerta: { adelante: "f" in puerta ? puerta.f : puerta.adelante, derecha: "r" in puerta ? puerta.r : puerta.derecha },
    };
    this.posado = posado;
    this.que = e.que;
    // El piso de la cabina, a ras del borde de abajo del hueco: un poco por
    // debajo del centro de la puerta, que es lo que trae el contrato.
    this.puertaY = e.puerta ? e.puerta.y - 0.85 : this.suelo(p.x, p.z) + 0.64;
    this.t = 0;
    this.tripu = "saliendo";
    this.tripulante.estado = "andando";
    const dentro = pasilloDeLaPuerta(posado)[3] as Punto;
    this.tripulante.camino = [dentro, sitioDelTripulante(posado)];
    this.tripulante.horario = [
      [0.4, 0],
      [1.2, largo(this.tripulante.camino)],
    ];
    this.tripulante.alAcabar = "fuera";
    const entrada = pasilloDeLaPuerta(posado)[0] as Punto;
    const sitio = sitioDelTripulante(posado);
    this.tripulante.mira = Math.atan2(entrada.x - sitio.x, -(entrada.z - sitio.z));
    this.colocarEnSuCamino(this.tripulante);

    if (e.que === "suben") {
      // Los que están fuera; el orden de la fila lo pone lo que le queda a cada uno.
      const fuera = this.andantes.filter((a) => a.estado !== "dentro" && a.estado !== "nadie");
      const plan = planDeSubida(posado, fuera.map((a) => ({ x: a.x, z: a.z })), e.quedan);
      fuera.forEach((a, k) => {
        a.camino = plan.caminos[k] as Punto[];
        a.horario = plan.horarios[k] as Horario;
        a.alAcabar = "dentro";
        a.estado = "andando";
        a.sucio = true;
      });
      this.entraElTripulante = plan.entraElTripulante;
    } else {
      const dentroAun = this.andantes.filter((a) => a.estado === "dentro");
      const centro = sitioParaApartarse(posado, (q) => this.pisable(q, posado));
      const hasta = sitiosDeLaGente(centro, posado, this.andantes.length);
      const plan = planDeBajada(
        posado,
        dentroAun.map((a) => hasta[this.andantes.indexOf(a)] as Punto),
        e.quedan,
      );
      dentroAun.forEach((a, k) => {
        a.camino = plan.caminos[k] as Punto[];
        a.horario = plan.horarios[k] as Horario;
        a.alAcabar = "fuera";
        a.estado = "andando";
        a.mira = Math.atan2(posado.x - centro.x, -(posado.z - centro.z));
        this.colocarEnSuCamino(a);
      });
      this.entraElTripulante = plan.entraElTripulante;
    }
  }

  /**
   * **Despegó antes de tiempo.** Quien iba hacia la puerta se da la vuelta y
   * vuelve a su sitio, andando y sin prisa; quien bajaba sigue apartándose,
   * que es lo seguro; quien está dentro se queda dentro. Y el tripulante sube.
   */
  para(): void {
    for (const a of this.andantes) {
      if (a.estado !== "andando") continue;
      if (a.alAcabar === "dentro") {
        // Hacia atrás por donde vino, que es un camino que ya se sabe seguro.
        const vuelta = trozo(a.camino, metrosA(a.horario, this.t)).reverse();
        a.camino = vuelta;
        a.horario = [
          [this.t, 0],
          [this.t + largo(vuelta) / 1.4, largo(vuelta)],
        ];
        a.alAcabar = "fuera";
        const fin = vuelta[vuelta.length - 1] as Punto;
        a.mira = this.espera ? Math.atan2(this.espera.mirando.x - fin.x, -(this.espera.mirando.z - fin.z)) : a.rumbo;
      } else if (this.t < (a.horario[0]?.[0] ?? 0)) {
        // Bajaba, y aún no había salido: se queda dentro hasta la próxima.
        a.estado = "dentro";
        a.sucio = true;
      }
    }
    this.entrarElTripulante();
  }

  acaba(): void {
    for (const a of this.andantes) {
      if (this.que === "suben" && a.estado === "fuera") {
        a.estado = "dentro";
        a.sucio = true;
      }
      if (a.estado !== "andando") continue;
      if (a.alAcabar === "dentro") {
        a.estado = "dentro";
        a.sucio = true;
      } else if (this.t < (a.horario[0]?.[0] ?? 0)) {
        // No le dio tiempo a salir: se le pone ya en su sitio, fuera.
        const final = a.camino[a.camino.length - 1] as Punto;
        this.ponerDePie(a, final, a.mira);
      }
    }
    this.entrarElTripulante();
    this.que = null;
  }

  /**
   * **Si han terminado**: subiendo, todos dentro, el tripulante también y la
   * corredera cerrada; bajando, todos fuera y lejos del disco, y lo mismo con
   * el tripulante y la puerta. Sin espera en marcha, que sí.
   */
  get lista(): boolean {
    if (!this.que) return true;
    const cerrado = this.tripu === "dentro" && this.puerta === 0;
    if (this.que === "suben") return cerrado && this.andantes.every((a) => a.estado === "dentro" || a.estado === "nadie");
    const p = this.posado;
    return (
      cerrado &&
      this.andantes.every((a) => {
        if (a.estado === "dentro") return false;
        if (!p) return true;
        const l = aLocal(p, a);
        return Math.hypot(l.f, l.r) > p.rotor + 0.5;
      })
    );
  }

  // ── Para el juego ──────────────────────────────────────────────────────

  /** Cuánto está abierta la corredera, de 0 a 1. */
  get puertaAbierta(): number {
    return this.puerta;
  }

  /** Cómo van, para los bancos: cuántos esperan, andan, están dentro y dónde. */
  get paraBanco(): {
    fuera: number;
    andando: number;
    dentro: number;
    tripulante: Tripu;
    puerta: number;
    sitios: { x: number; z: number; estado: string }[];
    visible: boolean;
    msPorPaso: number;
  } {
    const cuenta = (e: Andante["estado"]) => this.andantes.filter((a) => a.estado === e).length;
    return {
      fuera: cuenta("fuera"),
      andando: cuenta("andando"),
      dentro: cuenta("dentro"),
      tripulante: this.tripu,
      puerta: Math.round(this.puerta * 100) / 100,
      sitios: this.andantes.map((a) => ({ x: Math.round(a.x * 10) / 10, z: Math.round(a.z * 10) / 10, estado: a.estado })),
      visible: this.malla.visible,
      msPorPaso: Math.round(this.msPorPaso * 1000) / 1000,
    };
  }

  /** Lo que tarda `paso`, de media, ms: lo que la gente le cuesta a la CPU. */
  private msPorPaso = 0;

  /**
   * Sin dibujar, haciendo lo mismo: solo para medir lo que cuesta dibujarla.
   * Ver `genteApagada` en `dev/sondas.ts`.
   */
  apagada = false;

  /** Un fotograma: andar, saludar, abrir la puerta y reescribir lo que se ha movido. */
  paso(dt: number, heli: ElHelicoptero): void {
    if (!this.espera) return;
    const empieza = performance.now();
    this.pasoSinMedir(dt, heli);
    this.msPorPaso += (performance.now() - empieza - this.msPorPaso) * 0.05;
  }

  private pasoSinMedir(dt: number, heli: ElHelicoptero): void {
    this.t += dt;
    const p = this.posado;

    for (const a of this.andantes) this.mover(a, dt, heli);
    if (this.tripu !== "dentro") this.mover(this.tripulante, dt, heli);
    if (this.tripu === "saliendo" && this.tripulante.estado === "fuera") this.tripu = "fuera";
    if (this.tripu === "entrando" && this.tripulante.estado === "dentro") this.tripu = "dentro";
    if (this.tripu === "fuera" && this.t >= this.entraElTripulante) this.entrarElTripulante();

    // La corredera: abierta mientras el tripulante está fuera o entrando.
    const quiere = this.tripu === "dentro" ? 0 : 1;
    if (quiere > this.puerta) this.puerta = Math.min(1, this.puerta + dt / 0.8);
    else if (quiere < this.puerta) this.puerta = Math.max(0, this.puerta - dt / 0.8);

    // Lejos, ni se dibujan.
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let n = 0;
    for (const a of [...this.andantes, this.tripulante])
      if (a.visible) {
        cx += a.x;
        cy += a.y;
        cz += a.z;
        n++;
      }
    if (!n) {
      this.malla.visible = false;
      return;
    }
    cx /= n;
    cy /= n;
    cz /= n;
    const lejos = Math.hypot(heli.x - cx, heli.z - cz) > SE_VEN_HASTA;
    this.malla.visible = !lejos && !this.apagada;
    if (lejos) return;

    let radio = 0;
    let cambio = false;
    for (const a of [...this.andantes, this.tripulante]) {
      radio = Math.max(radio, Math.hypot(a.x - cx, a.z - cz));
      if (a.sucio) {
        this.escribir(a, p);
        a.sucio = false;
        cambio = true;
      }
    }
    if (cambio) {
      this.posiciones.needsUpdate = true;
      this.normales.needsUpdate = true;
      const s = this.geometria.boundingSphere as Sphere;
      s.center.set(cx, cy, cz);
      s.radius = radio + 6;
    }
  }

  // ── Por dentro ─────────────────────────────────────────────────────────

  private ponerDePie(a: Andante, s: Punto, mira: number): void {
    a.estado = "fuera";
    a.x = s.x;
    a.z = s.z;
    a.y = this.suelo(s.x, s.z);
    a.rumbo = mira;
    a.mira = mira;
    a.anda = 0;
    a.agachado = 0;
    a.sucio = true;
    a.visible = true;
  }

  private colocarEnSuCamino(a: Andante): void {
    const q = enElCamino(a.camino, metrosA(a.horario, this.t));
    a.x = q.x;
    a.z = q.z;
    a.y = this.suelo(q.x, q.z);
    a.sucio = true;
  }

  private entrarElTripulante(): void {
    if (this.tripu === "dentro" || this.tripu === "entrando") return;
    const p = this.posado;
    const t = this.tripulante;
    if (!p) {
      this.tripu = "dentro";
      t.estado = "dentro";
      return;
    }
    const dentro = pasilloDeLaPuerta(p)[3] as Punto;
    t.camino = [{ x: t.x, z: t.z }, dentro];
    t.horario = [
      [this.t, 0],
      [this.t + 0.6, largo(t.camino)],
    ];
    t.alAcabar = "dentro";
    t.estado = "andando";
    this.tripu = "entrando";
  }

  private mover(a: Andante, dt: number, heli: ElHelicoptero): void {
    const p = this.posado;
    const antes = { x: a.x, y: a.y, z: a.z, rumbo: a.rumbo, anda: a.anda, agachado: a.agachado, visible: a.visible };
    if (a.estado === "andando") {
      const s = metrosA(a.horario, this.t);
      const q = enElCamino(a.camino, s);
      const paso = Math.hypot(q.x - a.x, q.z - a.z);
      a.x = q.x;
      a.z = q.z;
      a.y = this.suelo(q.x, q.z);
      if (paso > 1e-4) {
        a.rumbo = giraHacia(a.rumbo, Math.atan2(q.dx, -q.dz), dt * 8);
        // Un paso de persona son unos setenta centímetros; de perro, menos.
        a.fase += paso / (0.36 * a.escala) * Math.PI * (a.figura.tipo === "perro" ? 1.6 : 1);
      }
      a.anda = paso > 1e-4 ? Math.min(1, a.anda + dt * 6) : Math.max(0, a.anda - dt * 6);
      const fin = largo(a.camino);
      const empezo = this.t >= (a.horario[0]?.[0] ?? 0);
      a.visible = empezo || a.alAcabar === "dentro";
      if (s >= fin - 1e-3 && this.t >= (a.horario[a.horario.length - 1]?.[0] ?? 0)) {
        if (a.alAcabar === "dentro") {
          a.estado = "dentro";
          a.visible = false;
        } else {
          a.estado = "fuera";
          a.rumbo = a.mira;
        }
      }
    } else if (a.estado === "fuera") {
      a.anda = Math.max(0, a.anda - dt * 4);
      a.visible = true;
      // Quieto, mira al helicóptero si está cerca, y si no, a donde miraba. El
      // tripulante no: él mira a la gente que viene.
      const d = Math.hypot(heli.x - a.x, heli.z - a.z);
      const mira =
        a !== this.tripulante && d < SE_SALUDA_A * 1.5 && d > 2 ? Math.atan2(heli.x - a.x, -(heli.z - a.z)) : a.mira;
      a.rumbo = giraHacia(a.rumbo, mira, dt * 2);
    } else {
      a.visible = false;
    }

    // Agachados bajo el disco, que es como se pasa por debajo de un rotor que gira.
    let bajo = false;
    if (p && heli.enElSuelo && a.figura.tipo === "persona") {
      const l = aLocal(p, a);
      bajo = Math.hypot(l.f, l.r) < p.rotor + 1;
    }
    a.agachado = bajo ? Math.min(1, a.agachado + dt * 3) : Math.max(0, a.agachado - dt * 3);

    // Al pie de la puerta se sube al piso de la cabina, y ya dentro no se ve.
    if (p && (a.estado === "andando" || a === this.tripulante)) {
      const l = aLocal(p, a);
      if (Math.abs(l.f - p.puerta.adelante) < 1.2 && l.r < p.puerta.derecha + 0.45) {
        const k = Math.max(0, Math.min(1, (p.puerta.derecha + 0.45 - l.r) / 0.5));
        a.y = a.y + (this.puertaY - a.y) * k;
        if (l.r < p.puerta.derecha - 0.25) a.visible = false;
      }
    }

    // Saludan al helicóptero que llega o que se va: en el aire y cerca.
    const persona = a.figura.tipo === "persona" ? a.figura : null;
    const saluda =
      !!persona?.saluda && a.estado === "fuera" && !heli.enElSuelo && Math.hypot(heli.x - a.x, heli.z - a.z) < SE_SALUDA_A;
    a.saludo = saluda ? Math.min(1, a.saludo + dt * 3) : Math.max(0, a.saludo - dt * 3);

    const cambia =
      a.estado === "andando" ||
      a.saludo > 0 ||
      a.figura.tipo === "perro" ||
      (a === this.tripulante && this.tripu === "fuera") ||
      antes.x !== a.x ||
      antes.y !== a.y ||
      antes.z !== a.z ||
      antes.rumbo !== a.rumbo ||
      antes.anda !== a.anda ||
      antes.agachado !== a.agachado ||
      antes.visible !== a.visible;
    if (cambia) a.sucio = true;
  }

  /** Reescribe los vértices de una figura donde está y como está. */
  private escribir(a: Andante, p: Posado | null): void {
    const pos = this.posiciones.array as Float32Array;
    const nor = this.normales.array as Float32Array;
    const escala = a.visible && a.estado !== "nadie" ? a.escala : 0;
    const raiz = this.m.makeRotationY(Math.PI - a.rumbo);
    raiz.scale(new Vector3(escala, escala, escala));
    raiz.setPosition(a.x, a.y, a.z);
    const f = a.figura;
    const t = this.t;
    const onda = Math.sin(a.fase);
    const anda = a.anda;
    const inclina = a.agachado * 0.45;
    // El tripulante, fuera, llama con el brazo a la gente que viene.
    const llama = a === this.tripulante && this.tripu === "fuera" && p !== null;
    let v = a.desde;
    for (const pieza of a.piezas) {
      const [gx, gy, gz] = giroDe(f, pieza.junta);
      this.mJ.identity();
      let rx = 0;
      let rz = 0;
      let ry = 0;
      if (f.tipo === "perro") {
        if (pieza.junta === "patasA") rx = onda * 0.6 * anda;
        else if (pieza.junta === "patasB") rx = -onda * 0.6 * anda;
        else if (pieza.junta === "cola") ry = Math.sin(t * 9) * 0.5;
      } else {
        if (pieza.junta === "piernaI") rx = onda * 0.5 * anda;
        else if (pieza.junta === "piernaD") rx = -onda * 0.5 * anda;
        else if (pieza.junta === "brazoI") rx = -onda * 0.4 * anda;
        else if (pieza.junta === "brazoD") {
          rx = onda * 0.4 * anda;
          if (a.saludo > 0) {
            // El brazo arriba, abierto, y de lado a lado: «¡aquí estamos!».
            rz = -a.saludo * (2.6 + Math.sin(t * 7 + a.fase) * 0.35);
            rx *= 1 - a.saludo;
          }
          if (llama) {
            rx = -1.4 - Math.max(0, Math.sin(t * 4)) * 0.9;
          }
        }
      }
      if (rx || ry || rz) {
        this.mT.makeTranslation(gx, gy, gz);
        this.mJ.multiply(this.mT);
        this.mT.makeRotationFromEuler(eulerXYZ(rx, ry, rz));
        this.mJ.multiply(this.mT);
        this.mT.makeTranslation(-gx, -gy, -gz);
        this.mJ.multiply(this.mT);
      }
      // Lo de arriba de la cadera se inclina hacia delante al agacharse.
      if (inclina && pieza.junta !== "piernaI" && pieza.junta !== "piernaD" && f.tipo !== "perro") {
        this.mT.makeTranslation(0, CADERA, 0).multiply(new Matrix4().makeRotationX(inclina)).multiply(new Matrix4().makeTranslation(0, -CADERA, 0));
        this.mJ.premultiply(this.mT);
      }
      this.mJ.premultiply(raiz);
      const e = this.mJ.elements;
      const n = pieza.pos.length / 3;
      for (let i = 0; i < n; i++, v++) {
        const x = pieza.pos[i * 3] as number;
        const y = pieza.pos[i * 3 + 1] as number;
        const z = pieza.pos[i * 3 + 2] as number;
        pos[v * 3] = (e[0] as number) * x + (e[4] as number) * y + (e[8] as number) * z + (e[12] as number);
        pos[v * 3 + 1] = (e[1] as number) * x + (e[5] as number) * y + (e[9] as number) * z + (e[13] as number);
        pos[v * 3 + 2] = (e[2] as number) * x + (e[6] as number) * y + (e[10] as number) * z + (e[14] as number);
        const nx = pieza.nor[i * 3] as number;
        const ny = pieza.nor[i * 3 + 1] as number;
        const nz = pieza.nor[i * 3 + 2] as number;
        nor[v * 3] = (e[0] as number) * nx + (e[4] as number) * ny + (e[8] as number) * nz;
        nor[v * 3 + 1] = (e[1] as number) * nx + (e[5] as number) * ny + (e[9] as number) * nz;
        nor[v * 3 + 2] = (e[2] as number) * nx + (e[6] as number) * ny + (e[10] as number) * nz;
      }
    }
  }
}

const E = new Euler();
function eulerXYZ(x: number, y: number, z: number): Euler {
  return E.set(x, y, z, "XYZ");
}

/** Un camino hasta los `s` metros: los puntos que ya se han pasado y donde se está. */
function trozo(camino: readonly Punto[], s: number): Punto[] {
  const fuera: Punto[] = [camino[0] as Punto];
  let andado = 0;
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1] as Punto;
    const b = camino[i] as Punto;
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    if (andado + l >= s) break;
    andado += l;
    fuera.push(b);
  }
  const aqui = enElCamino(camino, s);
  fuera.push({ x: aqui.x, z: aqui.z });
  return fuera;
}

/** Gira un ángulo hacia otro por el lado corto, como mucho `paso` radianes. */
function giraHacia(de: number, a: number, paso: number): number {
  let d = a - de;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return de + Math.max(-paso, Math.min(paso, d));
}
