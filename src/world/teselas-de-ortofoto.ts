/**
 * La ortofoto por teselas: la isla entera, con el detalle según la distancia.
 *
 * ## Por qué
 *
 * Enrique, volando la costa este de La Palma (punto 166 de la lista):
 * Santa Cruz y su volcán, con la foto fina, «preciosos»; el resto de la isla,
 * «verde plano y a bloques, como estar jugando en Minecraft». Las fotos de una
 * pieza —`world/ortofoto.ts`— cubren dieciocho kilómetros a ocho metros por
 * píxel, cincuenta y cuatro a diecisiete, y el resto del mundo a ciento
 * treinta y cuatro. Una isla de cuarenta y siete kilómetros cae casi entera
 * en la peor; y la isla de enfrente, entera salvo el aeropuerto.
 *
 * Hacer más grandes esas fotos no tiene arreglo: el detalle que hace falta a
 * mil pies sobre la costa, extendido a la isla entera, son cientos de megas.
 * Lo que sí lo tiene es lo que hace cualquier mapa de internet: **teselas
 * pequeñas a varios niveles, y bajarse solo las que se miran, con el nivel
 * que pide su distancia**. Cerca, dos metros por píxel; a quince kilómetros,
 * treinta y cuatro; lo que no se mira, nada.
 *
 * ## Cómo se pinta: una página por fragmento
 *
 * Las teselas puestas viven en **una sola textura de capas** —una capa por
 * tesela, `sampler2DArray`— y un **índice**: una textura pequeña con una
 * celda por cada tesela del nivel más fino que cabe en el mundo, que dice qué
 * capa y qué nivel hay que leer ahí. El sombreador del terreno pasa cada
 * punto a coordenadas del mosaico, mira el índice y lee la capa. Es lo que se
 * llama textura virtual, en pequeño.
 *
 * Se hace así y no con una malla por tesela porque el suelo ya está hecho de
 * cuatro mallas distintas —el mapa fino, las dos del horizonte y la isla de
 * cada vecino, que además baja de detalle con la distancia— y una calcomanía
 * por tesela tendría que seguir a la que tuviera debajo al milímetro. Aquí no
 * hay que seguir nada: el mismo trozo de sombreador va en las cuatro y cada
 * fragmento sabe dónde está.
 *
 * ## Lo que cuesta
 *
 * Una lectura del índice y otra de la capa por fragmento de suelo, y una
 * textura de capas de tamaño fijo en la tarjeta (`CAPAS`). Las teselas se
 * bajan de una en una, se decodifican fuera del hilo principal
 * (`createImageBitmap`) y se suben a su capa sin pasar por la CPU. Medido en
 * `scripts/verificar-rendimiento.mjs`: ver el informe del punto 166.
 *
 * ## Lo que no hace
 *
 * Quitar las fotos de una pieza. Siguen siendo la base: lo que se ve mientras
 * llegan las teselas, y sin red. Donde hay tesela, manda la tesela.
 */

import {
  DataArrayTexture,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  type Material,
  type MeshLambertMaterial,
  type WebGLRenderer,
} from "three";
import {
  LADO_DE_TESELA,
  aGrados,
  enElIndice,
  enTeselas,
  type IndiceDeTeselas,
  type Isla,
  type Tesela,
} from "./cobertura-de-teselas";
import { conPlazo, PLAZO_DE_DATO } from "../datos/con-plazo";

/** Radio de la proyección local de los extractores, m. Ver `entre-aerodromos.ts`. */
const R = 6371008;
const RAD = Math.PI / 180;

/**
 * Cuántas teselas caben a la vez en la tarjeta.
 *
 * Ciento noventa y dos capas de 256 × 256, con su cadena de mipmaps, son
 * unos sesenta y siete megas en la tarjeta. Con las teselas ya no se baja la
 * foto de en medio —3.584 × 3.328, cuarenta y siete megas—, así que la
 * cuenta sale a unos veinte de más. Y alcanza: con la regla de la distancia,
 * mirando hacia delante, se quieren entre cien y doscientas; si se quieren
 * más, se quedan fuera las menos urgentes, que son las finas de más lejos, y
 * ahí se ve su madre. Ver `elegirTeselas` y las pruebas.
 */
export const CAPAS = 192;

/**
 * La calidad: cuántos píxeles de pantalla cubre, como mucho, un píxel de
 * tesela antes de pedir la del nivel siguiente.
 *
 * Uno y tres cuartos en la frontera, que de media son un píxel y pico: la
 * tesela que se ve a la mitad de esa distancia ya va a menos de uno. Con uno
 * se piden tres veces más teselas para una diferencia que no se ve con el
 * avión en movimiento —y no caben en la tarjeta—; con dos, la costa de cerca
 * ya se nota blanda.
 */
export const CALIDAD = 1.75;

/** Hasta qué ángulo de la mirada se parte con detalle: ochenta grados. */
const COS_DEL_CUADRO = Math.cos((80 * Math.PI) / 180);

/** El alto de pantalla más grande que se tiene en cuenta, px. Ver `elegir`. */
const ALTO_MAXIMO = 1080;

/** Cada cuánto se rehace la lista de lo que se quiere, ms. */
const CADA = 250;

/** Cuántas se piden a la vez. */
const A_LA_VEZ = 6;

/** Cuántas se suben a la tarjeta por fotograma, como mucho. */
const SUBIDAS_POR_CUADRO = 4;

export interface ManifiestoDeTeselas {
  readonly fuente: string;
  readonly licencia: string;
  readonly lado: number;
  readonly nivelMin: number;
  readonly nivelMax: number;
  readonly islas: readonly (Isla & { readonly bytes?: number })[];
  readonly teselas: number;
  readonly bytes: number;
  readonly indice: IndiceDeTeselas;
}

/** Dónde viven las teselas, relativo a la página. Ver `vite.config.ts`. */
export const BASE_DE_TESELAS = "data/teselas";

/**
 * El juego de teselas que toca a una foto, por su procedencia.
 *
 * Por la ficha de la foto y no por el escenario: la ficha ya dice de dónde
 * sale la foto de ese sitio, y las teselas tienen que ser de lo mismo.
 */
export function juegoDeTeselas(fuente: string | undefined): string | null {
  if (!fuente) return null;
  if (/PNOA/i.test(fuente)) return "pnoa";
  // Paraguay: Sentinel-2 cloudless de EOX, el mismo mosaico que sus fotos.
  if (/Sentinel-2/i.test(fuente)) return "s2";
  return null;
}

/**
 * Carga el índice de un juego de teselas, o `undefined` si no lo hay.
 *
 * Que no esté no puede dejar a nadie sin volar: sin él se vuela con las fotos
 * de una pieza, que es lo que había.
 */
export async function cargarManifiesto(
  juego: string,
  base = BASE_DE_TESELAS,
): Promise<ManifiestoDeTeselas | undefined> {
  try {
    const res = await conPlazo(
      fetch(`${base}/${juego}/manifiesto.json`),
      PLAZO_DE_DATO,
      `el índice de teselas ${juego}`,
    );
    if (!res?.ok) return undefined;
    const m = (await res.json()) as ManifiestoDeTeselas;
    return m?.indice ? m : undefined;
  } catch {
    return undefined;
  }
}

// ── La geometría: del marco local al mosaico ──────────────────────────────

/**
 * Lo que necesita el sombreador para pasar un punto de una malla al mosaico.
 *
 * Cada malla está en el marco de su escenario —la de casa en el de casa, la
 * del vecino en el suyo— y ese marco es una proyección plana sobre su origen:
 * `x` al este, `z` al sur, en metros, con el coseno de **su** latitud. Así
 * están extraídos su relieve y su foto, y así hay que deshacerlo para que la
 * tesela caiga en su costa.
 *
 * La X del mosaico es lineal en la longitud, y la longitud lo es en `x`: una
 * multiplicación. La Y no: el mosaico estira la latitud (`ln tan`), y a
 * ciento cincuenta kilómetros una recta se equivoca en kilómetro y medio. Así
 * que va como un polinomio de cuarto grado en `z`, con los coeficientes del
 * desarrollo de Taylor sacados aquí con doble precisión: a doscientos
 * kilómetros se aparta del valor exacto en menos de un metro (ver las
 * pruebas), y en el sombreador son cuatro multiplicaciones.
 */
export interface MarcoDeTeselas {
  /** Dónde cae el origen del marco, en píxeles del nivel del índice desde su esquina. */
  readonly origen: { readonly x: number; readonly y: number };
  /** Píxeles por metro hacia el este. */
  readonly escalaX: number;
  /** ΔY = a1·z + a2·z² + a3·z³ + a4·z⁴, píxeles, con `z` en metros hacia el sur. */
  readonly mercator: readonly [number, number, number, number];
}

export function marcoDeTeselas(
  origen: { readonly lat: number; readonly lon: number },
  nivel: number,
  esquina: { readonly x: number; readonly y: number },
): MarcoDeTeselas {
  const n = LADO_DE_TESELA * 2 ** nivel;
  const p = enTeselas(origen.lat, origen.lon, nivel);
  const f = origen.lat * RAD;
  const sec = 1 / Math.cos(f);
  const tan = Math.tan(f);
  const k = n / (2 * Math.PI);
  /*
   * Y = n/2 − k·ψ(φ), ψ = ln tan(π/4 + φ/2), φ = φ0 − z/R. Las derivadas de ψ
   * son sec, sec·tan, sec·(1 + 2 tan²) y sec·tan·(5 + 6 tan²).
   */
  const d1 = sec;
  const d2 = sec * tan;
  const d3 = sec * (1 + 2 * tan * tan);
  const d4 = sec * tan * (5 + 6 * tan * tan);
  return {
    origen: {
      x: p.x * LADO_DE_TESELA - esquina.x * LADO_DE_TESELA,
      y: p.y * LADO_DE_TESELA - esquina.y * LADO_DE_TESELA,
    },
    escalaX: n / (2 * Math.PI * R * Math.cos(f)),
    mercator: [
      (k * d1) / R,
      (-k * d2) / (2 * R * R),
      (k * d3) / (6 * R * R * R),
      (-k * d4) / (24 * R * R * R * R),
    ],
  };
}

/** Lo mismo que hace el sombreador, para poder comprobarlo sin tarjeta. */
export function aPixelesDelIndice(m: MarcoDeTeselas, x: number, z: number): { x: number; y: number } {
  const [a1, a2, a3, a4] = m.mercator;
  return {
    x: m.origen.x + x * m.escalaX,
    y: m.origen.y + z * (a1 + z * (a2 + z * (a3 + z * a4))),
  };
}

// ── Qué se quiere: la regla de la distancia ───────────────────────────────

/**
 * La constante de la regla: una tesela se parte en sus cuatro hijas cuando
 * se mira desde menos de `K` veces su lado.
 *
 * Sale de pedir que un píxel de tesela no cubra más de `calidad` píxeles de
 * pantalla: a distancia `d` un píxel de pantalla abarca `d·2·tan(fov/2)/alto`
 * metros, y uno de tesela, `lado/256`.
 */
export function constanteDeDetalle(altoPx: number, fovGrados: number, calidad = CALIDAD): number {
  const porPixel = (2 * Math.tan((fovGrados * RAD) / 2)) / Math.max(1, altoPx);
  return 1 / (LADO_DE_TESELA * calidad * porPixel);
}

/**
 * **El nivel que pide una distancia**, para una tesela de ese sitio: el más
 * grueso cuyo píxel ya no se ve más grande que lo que pide la calidad.
 *
 * Es la regla de `elegirTeselas` escrita para un punto, que es como se
 * entiende: a mil pies sobre la costa, z16; desde crucero, z13 o z14 debajo
 * del avión y z11 en el horizonte.
 */
export function nivelParaDistancia(
  distancia: number,
  latitud: number,
  k: number,
  nivelMin: number,
  nivelMax: number,
): number {
  const ladoZ0 = 2 * Math.PI * 6378137 * Math.cos(latitud * RAD);
  // Se parte mientras d < k·lado(z), o sea mientras lado(z) > d/k.
  let z = nivelMin;
  while (z < nivelMax && distancia < k * (ladoZ0 / 2 ** z)) z++;
  return z;
}

/** Una tesela querida, con su urgencia: cuanto más pequeña, antes. */
export interface Querida {
  readonly t: Tesela;
  readonly llave: number;
  readonly urgencia: number;
}

/** La llave numérica de una tesela: sin cadenas en el bucle de cada cuarto de segundo. */
export function llaveNumerica(t: Tesela): number {
  return (t.z * 131072 + t.x) * 131072 + t.y;
}

/** El rectángulo de una tesela en el marco de casa, m. */
export interface Rectangulo {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

export function rectanguloEnElMarco(
  t: Tesela,
  origen: { readonly lat: number; readonly lon: number },
): Rectangulo {
  const no = aGrados(t.x, t.y, t.z);
  const se = aGrados(t.x + 1, t.y + 1, t.z);
  const k = Math.cos(origen.lat * RAD);
  return {
    x0: (no.lon - origen.lon) * RAD * R * k,
    x1: (se.lon - origen.lon) * RAD * R * k,
    z0: -(no.lat - origen.lat) * RAD * R,
    z1: -(se.lat - origen.lat) * RAD * R,
  };
}

/** Dónde mira la cámara: posición en el marco de casa y la altura sobre el suelo. */
export interface Ojo {
  readonly x: number;
  readonly z: number;
  /** Metros sobre el suelo que tiene debajo. */
  readonly altura: number;
  /** Hacia dónde mira, en horizontal y sin normalizar. Opcional. */
  readonly mira?: { readonly x: number; readonly z: number };
}

/**
 * **Lo que se quiere tener puesto**, de más urgente a menos.
 *
 * Se recorre el árbol desde las teselas más gruesas: una tesela se parte en
 * sus hijas cuando se mira desde menos de `k` veces su lado, y se queda
 * entera si no. Se quieren **todas las recorridas**, las partidas también:
 * son las que se ven mientras llegan sus hijas y las que tapan donde una hija
 * no existe —el mar, o fuera de un pasillo de z16—.
 *
 * La urgencia es la distancia partida por el lado, que es lo grande que se ve
 * la tesela: así las gruesas van antes que sus hijas, y entre dos del mismo
 * nivel, la de más cerca. Lo que queda **detrás** de la cámara cuenta el
 * doble de lejos: se tiene igual para cuando se gire, pero después.
 */
export function elegirTeselas(
  ojo: Ojo,
  raices: readonly Tesela[],
  indice: IndiceDeTeselas,
  nivelMax: number,
  k: number,
  rect: (t: Tesela) => Rectangulo,
  limite = Infinity,
): Querida[] {
  const out: Querida[] = [];
  const pila: Tesela[] = [...raices];
  const mira = ojo.mira ? Math.hypot(ojo.mira.x, ojo.mira.z) : 0;
  const nivelMin = raices[0]?.z ?? 0;
  while (pila.length > 0) {
    const t = pila.pop()!;
    const r = rect(t);
    // El punto de la tesela más cercano al ojo, en horizontal.
    const nx = Math.min(r.x1, Math.max(r.x0, ojo.x)) - ojo.x;
    const nz = Math.min(r.z1, Math.max(r.z0, ojo.z)) - ojo.z;
    const h = Math.hypot(nx, nz);
    const d = Math.hypot(h, Math.max(0, ojo.altura));
    const lado = Math.max(r.x1 - r.x0, r.z1 - r.z0);
    /*
     * **Las más gruesas, solo si hacen falta.** Más allá de donde se
     * partiría una tesela un nivel más gruesa que ellas, lo que se ve es lo
     * que ya pinta la foto del horizonte, a ciento treinta y cuatro metros
     * por píxel: una tesela ahí ocuparía una capa para no cambiar nada.
     */
    if (t.z === nivelMin && d >= 2 * k * lado) continue;
    /*
     * **Y lo que cae fuera del cuadro, sin partir.** Lo que queda a los lados
     * y a la espalda de la cámara —más de ochenta grados a un lado de hacia
     * donde mira— se tiene, para cuando se gire, pero con su tesela gruesa y
     * después de lo de delante. Medido en Los Rodeos con el índice de
     * verdad: partirlo todo alrededor eran el doble de teselas para pintar
     * lo que no se ve.
     */
    const fuera =
      mira > 0 && h > lado && nx * ojo.mira!.x + nz * ojo.mira!.z < COS_DEL_CUADRO * h * mira;
    const urgencia = (d / lado) * (fuera ? 2 : 1);
    out.push({ t, llave: llaveNumerica(t), urgencia });
    if (t.z >= nivelMax || d >= k * lado || fuera) continue;
    for (let dy = 0; dy < 2; dy++)
      for (let dxx = 0; dxx < 2; dxx++) {
        const h = { z: t.z + 1, x: t.x * 2 + dxx, y: t.y * 2 + dy };
        if (enElIndice(indice, h)) pila.push(h);
      }
  }
  out.sort((a, b) => a.urgencia - b.urgencia);
  return out.length > limite ? out.slice(0, limite) : out;
}

// ── El índice que lee el sombreador ───────────────────────────────────────

/**
 * La rejilla del índice: una celda por tesela del nivel más fino, sobre el
 * mundo de casa, con la esquina en un borde de tesela del nivel más grueso
 * —así `fract` vale para cualquier nivel—.
 */
export interface Rejilla {
  /** La esquina, en teselas del nivel más fino. */
  readonly esquina: { readonly x: number; readonly y: number };
  readonly ancho: number;
  readonly alto: number;
  readonly nivel: number;
  readonly nivelMin: number;
}

export function rejillaDelMundo(
  origen: { readonly lat: number; readonly lon: number },
  ladoDelMundo: number,
  nivelMin: number,
  nivelMax: number,
): Rejilla {
  const k = Math.cos(origen.lat * RAD);
  const mitad = ladoDelMundo / 2;
  const norte = origen.lat + (mitad / R) / RAD;
  const sur = origen.lat - (mitad / R) / RAD;
  const oeste = origen.lon - (mitad / (R * k)) / RAD;
  const este = origen.lon + (mitad / (R * k)) / RAD;
  const a = enTeselas(norte, oeste, nivelMin);
  const b = enTeselas(sur, este, nivelMin);
  const x0 = Math.floor(a.x);
  const y0 = Math.floor(a.y);
  const f = 2 ** (nivelMax - nivelMin);
  return {
    esquina: { x: x0 * f, y: y0 * f },
    ancho: (Math.floor(b.x) - x0 + 1) * f,
    alto: (Math.floor(b.y) - y0 + 1) * f,
    nivel: nivelMax,
    nivelMin,
  };
}

/**
 * **Qué capa se lee en cada celda**: la tesela más fina de las puestas que
 * la cubre. Sin tarjeta, para poder probarlo; `Teselas` copia `datos` al
 * índice de verdad.
 *
 * Cuatro bytes por celda: la capa en dos —hasta 65.536—, el nivel, y si hay
 * algo.
 */
export class IndiceDeCapas {
  readonly datos: Uint8Array;
  /** Qué capa lleva cada tesela puesta. */
  private readonly puestas = new Map<number, number>();
  /** Las filas tocadas desde la última vez, para subir solo esas. */
  readonly filasTocadas = new Set<number>();

  constructor(readonly rejilla: Rejilla) {
    this.datos = new Uint8Array(rejilla.ancho * rejilla.alto * 4);
  }

  poner(t: Tesela, capa: number): void {
    this.puestas.set(llaveNumerica(t), capa);
    this.rehacer(t);
  }

  quitar(t: Tesela): void {
    if (this.puestas.delete(llaveNumerica(t))) this.rehacer(t);
  }

  tiene(t: Tesela): boolean {
    return this.puestas.has(llaveNumerica(t));
  }

  /** Lo que dice una celda: nivel y capa, o `null`. */
  celda(cx: number, cy: number): { nivel: number; capa: number } | null {
    const i = (cy * this.rejilla.ancho + cx) * 4;
    if (!this.datos[i + 3]) return null;
    return { nivel: this.datos[i + 2]!, capa: this.datos[i]! + 256 * this.datos[i + 1]! };
  }

  /**
   * Rehace las celdas que caen bajo una tesela, buscando para cada una la
   * más fina de las puestas: de la celda hacia arriba, nivel a nivel.
   */
  private rehacer(t: Tesela): void {
    const { esquina, ancho, alto, nivel, nivelMin } = this.rejilla;
    const f = 2 ** (nivel - t.z);
    const cx0 = Math.max(0, t.x * f - esquina.x);
    const cy0 = Math.max(0, t.y * f - esquina.y);
    const cx1 = Math.min(ancho, (t.x + 1) * f - esquina.x);
    const cy1 = Math.min(alto, (t.y + 1) * f - esquina.y);
    for (let cy = cy0; cy < cy1; cy++) {
      this.filasTocadas.add(cy);
      for (let cx = cx0; cx < cx1; cx++) {
        const gx = cx + esquina.x;
        const gy = cy + esquina.y;
        const i = (cy * ancho + cx) * 4;
        this.datos[i + 3] = 0;
        for (let z = nivel; z >= nivelMin; z--) {
          const s = nivel - z;
          const capa = this.puestas.get(
            (z * 131072 + Math.floor(gx / 2 ** s)) * 131072 + Math.floor(gy / 2 ** s),
          );
          if (capa === undefined) continue;
          this.datos[i] = capa & 255;
          this.datos[i + 1] = capa >> 8;
          this.datos[i + 2] = z;
          this.datos[i + 3] = 255;
          break;
        }
      }
    }
  }
}

// ── El sombreador ─────────────────────────────────────────────────────────

/**
 * El trozo de sombreador. Aparte, para poder mirarlo en una prueba.
 *
 * Va **justo después de leer la foto de una pieza** y antes del grano y de lo
 * pintado encima: la tesela sustituye a la foto, y el grano y los potreros
 * caen sobre la tesela igual que caían sobre la foto. Ver `vestirConTeselas`.
 */
export const GLSL_DE_LAS_TESELAS = {
  cabeceraDelVertice: /* glsl */ `
uniform vec2 teselasOrigen;
uniform float teselasEscalaX;
uniform vec4 teselasMercator;
varying vec2 vTesela;
`,
  vertice: /* glsl */ `
  {
    // En el marco de la malla: el de su escenario. Ver «MarcoDeTeselas».
    float zt = position.z;
    vTesela = teselasOrigen + vec2(
      position.x * teselasEscalaX,
      zt * (teselasMercator.x + zt * (teselasMercator.y + zt * (teselasMercator.z + zt * teselasMercator.w)))
    );
  }
`,
  cabecera: /* glsl */ `
uniform highp sampler2DArray teselasCapas;
uniform highp sampler2D teselasIndice;
uniform vec2 teselasCeldas;
uniform float teselasNivel;
uniform float teselasPuestas;
varying vec2 vTesela;
`,
  cuerpo: /* glsl */ `
  if (teselasPuestas > 0.5) {
    /*
     * **Las derivadas, aquí arriba y del nivel más fino**, y no de la
     * coordenada dentro de la tesela.
     *
     * Se sacaban de «enLaTesela», que se divide por el lado de **su** nivel.
     * Donde se tocan teselas de dos niveles, los cuatro píxeles que la
     * tarjeta compara para derivar caen a los dos lados: uno mide en teselas
     * de z14 y su vecino en z16, la derivada sale cuatro veces más grande de
     * lo que es y el mipmap salta al último, el de un píxel —el color medio
     * de la tesela entera—. Y en la costa ese color medio es casi negro,
     * porque media tesela es mar: eran las rayas discontinuas a lo largo de
     * los bordes de las teselas cerca de la costa, que se vieron en las
     * capturas del relieve lejano de La Palma y de Jandía. Y además se
     * derivaba dentro de dos «if» que no toman todos los píxeles el mismo
     * camino, que en GLSL deja la derivada sin definir.
     *
     * «vTesela» es la misma para todos los niveles y no tiene saltos: su
     * derivada, escalada al nivel de cada píxel, es la buena a los dos lados.
     */
    vec2 dxT = dFdx(vTesela);
    vec2 dyT = dFdy(vTesela);
    vec2 celdaT = floor(vTesela / 256.0);
    if (celdaT.x >= 0.0 && celdaT.y >= 0.0 && celdaT.x < teselasCeldas.x && celdaT.y < teselasCeldas.y) {
      vec4 enIndice = texelFetch(teselasIndice, ivec2(celdaT), 0);
      if (enIndice.a > 0.5) {
        float capaT = floor(enIndice.r * 255.0 + 0.5) + 256.0 * floor(enIndice.g * 255.0 + 0.5);
        float nivelT = floor(enIndice.b * 255.0 + 0.5);
        // La tesela del nivel que diga el índice, y dentro de ella.
        float escalaT = 1.0 / (256.0 * exp2(teselasNivel - nivelT));
        vec2 enLaTesela = vTesela * escalaT;
        // Y sin cortar: con las derivadas de «fract» salta el mipmap en cada
        // borde de tesela y se dibuja una raya.
        vec4 fotoT = textureGrad(teselasCapas, vec3(fract(enLaTesela), capaT), dxT * escalaT, dyT * escalaT);
        diffuseColor.rgb = fotoT.rgb;
      }
    }
  }
`,
} as const;

/** Lo que el sombreador tiene que encontrar para colgarse detrás. */
const TRAS_LA_FOTO = "#include <map_fragment>";

/**
 * La marca que dejan quienes sustituyen la lectura de la foto entera —el
 * fundido del vecino—: aquí acaba la foto. Ver `GLSL_DEL_FUNDIDO`.
 */
export const FIN_DE_LA_FOTO = "// fin de la foto";

/**
 * Pone las teselas en un material de terreno, encima de lo que ya llevara.
 *
 * Se cuelga **por fuera** de lo que hubiera en `onBeforeCompile` —el grano,
 * el fundido—: deja que hagan lo suyo y después mete lo suyo justo detrás de
 * la lectura de la foto. Así el orden sale bien sin que ninguno sepa del
 * otro: la foto, la tesela encima, y el grano y lo pintado sobre las dos.
 */
export function vestirConTeselas(
  material: Material,
  comunes: Record<string, { value: unknown }>,
  propios: Record<string, { value: unknown }>,
): void {
  const m = material as MeshLambertMaterial & {
    userData: { teselasEnvoltorio?: unknown; teselasDebajo?: unknown };
  };
  const previo =
    m.onBeforeCompile === m.userData.teselasEnvoltorio
      ? (m.userData.teselasDebajo as MeshLambertMaterial["onBeforeCompile"])
      : m.onBeforeCompile;
  const llavePrevia = m.customProgramCacheKey;
  const envoltorio: MeshLambertMaterial["onBeforeCompile"] = (shader, pintor) => {
    previo.call(m, shader, pintor);
    Object.assign(shader.uniforms, comunes, propios);
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", GLSL_DE_LAS_TESELAS.cabeceraDelVertice + "\nvoid main() {")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n" + GLSL_DE_LAS_TESELAS.vertice);
    const ancla = shader.fragmentShader.includes(TRAS_LA_FOTO) ? TRAS_LA_FOTO : FIN_DE_LA_FOTO;
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", GLSL_DE_LAS_TESELAS.cabecera + "\nvoid main() {")
      .replace(ancla, ancla + "\n" + GLSL_DE_LAS_TESELAS.cuerpo);
    m.userData.teselasPuestas = true;
  };
  m.userData.teselasEnvoltorio = envoltorio;
  m.userData.teselasDebajo = previo;
  m.onBeforeCompile = envoltorio;
  /*
   * Y la llave de la caché de programas, por lo de siempre: `onBeforeCompile`
   * no entra en ella, y sin cambiarla este material usaría el programa de
   * otro igual pero sin teselas. Ver `ponerGrano`.
   */
  const base = llavePrevia === (m.userData as { teselasLlave?: unknown }).teselasLlave
    ? ((m.userData as { teselasLlaveDebajo?: () => string }).teselasLlaveDebajo ?? (() => ""))
    : llavePrevia;
  const llave = () => base.call(m) + "+teselas";
  (m.userData as Record<string, unknown>).teselasLlave = llave;
  (m.userData as Record<string, unknown>).teselasLlaveDebajo = base;
  m.customProgramCacheKey = llave;
  m.needsUpdate = true;
}

/** Si el material lleva puestas las teselas tal y como está ahora. */
export function llevaTeselas(material: Material): boolean {
  const ud = material.userData as { teselasEnvoltorio?: unknown };
  return !!ud.teselasEnvoltorio && material.onBeforeCompile === ud.teselasEnvoltorio;
}

// ── Las teselas en marcha ─────────────────────────────────────────────────

interface Puesta {
  readonly t: Tesela;
  readonly capa: number;
  /** La última vez que se quiso, en vueltas de `elegir`. */
  vuelta: number;
}

/** Una malla de suelo a la que hay que ponerle teselas, y en qué marco está. */
export interface SueloConTeselas {
  /** El material de ahora: las mallas se rehacen, así que se pregunta cada vez. */
  readonly material: () => Material | null;
  /** El origen del marco de esa malla. */
  readonly origen: { readonly lat: number; readonly lon: number };
}

export class TeselasDeOrtofoto {
  readonly capas: DataArrayTexture;
  readonly indice: DataTexture;
  private readonly celdas: IndiceDeCapas;
  readonly rejilla: Rejilla;
  private readonly comunes: Record<string, { value: unknown }>;
  private readonly suelos: { suelo: SueloConTeselas; propios: Record<string, { value: unknown }> }[] = [];
  private readonly raices: Tesela[] = [];
  private readonly rectangulos = new Map<number, Rectangulo>();
  private readonly puestas = new Map<number, Puesta>();
  private readonly libres: number[] = [];
  private readonly bajando = new Set<number>();
  private readonly fallidas = new Map<number, number>();
  private readonly listas: { t: Tesela; mips: ImageBitmap[] }[] = [];
  private queridas: Querida[] = [];
  private vuelta = 0;
  private ultima = -Infinity;
  private reservada = false;
  /** Lo que se ha bajado, para el banco y el informe. */
  readonly cuentas = { bajadas: 0, bytes: 0, fallos: 0, subidas: 0 };

  constructor(
    readonly manifiesto: ManifiestoDeTeselas,
    private readonly juego: string,
    private readonly casa: { readonly lat: number; readonly lon: number },
    ladoDelMundo: number,
    private readonly base = BASE_DE_TESELAS,
  ) {
    this.rejilla = rejillaDelMundo(casa, ladoDelMundo, manifiesto.nivelMin, manifiesto.nivelMax);
    this.celdas = new IndiceDeCapas(this.rejilla);

    /*
     * La textura de capas, **sin datos**: se reserva en la tarjeta y cada
     * tesela se sube a su capa cuando llega. `dataReady = false` es lo que
     * le dice a three que reserve sin subir nada.
     */
    this.capas = new DataArrayTexture(null, LADO_DE_TESELA, LADO_DE_TESELA, CAPAS);
    this.capas.format = RGBAFormat;
    this.capas.type = UnsignedByteType;
    this.capas.colorSpace = SRGBColorSpace;
    this.capas.minFilter = LinearMipmapLinearFilter;
    this.capas.magFilter = LinearFilter;
    this.capas.generateMipmaps = true;
    this.capas.source.dataReady = false;
    this.capas.needsUpdate = true;
    for (let i = CAPAS - 1; i >= 0; i--) this.libres.push(i);

    this.indice = new DataTexture(
      this.celdas.datos,
      this.rejilla.ancho,
      this.rejilla.alto,
      RGBAFormat,
      UnsignedByteType,
    );
    this.indice.minFilter = NearestFilter;
    this.indice.magFilter = NearestFilter;
    this.indice.generateMipmaps = false;
    this.indice.needsUpdate = true;

    this.comunes = {
      teselasCapas: { value: this.capas },
      teselasIndice: { value: this.indice },
      teselasCeldas: { value: new Vector2(this.rejilla.ancho, this.rejilla.alto) },
      teselasNivel: { value: this.rejilla.nivel },
      teselasPuestas: { value: 1 },
    };

    // Las raíces: las del nivel más grueso que caen en el mundo.
    const z = manifiesto.nivelMin;
    const f = 2 ** (this.rejilla.nivel - z);
    const x0 = this.rejilla.esquina.x / f;
    const y0 = this.rejilla.esquina.y / f;
    for (let y = y0; y < y0 + this.rejilla.alto / f; y++)
      for (let x = x0; x < x0 + this.rejilla.ancho / f; x++)
        if (enElIndice(manifiesto.indice, { z, x, y })) this.raices.push({ z, x, y });
  }

  /** Si este juego de teselas tiene algo en el mundo de casa. */
  get hayAlgo(): boolean {
    return this.raices.length > 0;
  }

  /** Apunta una malla de suelo. Se le ponen las teselas en cuanto tenga foto. */
  apuntar(suelo: SueloConTeselas): void {
    const m = marcoDeTeselas(suelo.origen, this.rejilla.nivel, this.rejilla.esquina);
    this.suelos.push({
      suelo,
      propios: {
        teselasOrigen: { value: new Vector2(m.origen.x, m.origen.y) },
        teselasEscalaX: { value: m.escalaX },
        teselasMercator: { value: new Vector4(...m.mercator) },
      },
    });
  }

  /** Enciende o apaga las teselas sin tocar nada más. Para comparar. */
  set encendidas(si: boolean) {
    this.comunes.teselasPuestas!.value = si ? 1 : 0;
  }

  get encendidas(): boolean {
    return this.comunes.teselasPuestas!.value === 1;
  }

  /**
   * Un paso: vestir lo que haga falta, elegir, pedir y subir.
   *
   * Barato casi siempre: elegir va cada cuarto de segundo y subir son cuatro
   * teselas por fotograma como mucho.
   */
  alPaso(ojo: Ojo, pintor: WebGLRenderer, altoPx: number, fovGrados: number): void {
    const ahora = performance.now();
    if (ahora - this.ultima >= CADA) {
      this.ultima = ahora;
      // Vestir busca las mallas por su nombre, y eso recorre el aeródromo
      // entero: cada cuarto de segundo basta, no en cada fotograma.
      this.vestir();
      this.elegir(ojo, altoPx, fovGrados);
      this.pedir();
    }
    this.subir(pintor);
  }

  /** Lo que hay, para la sonda del banco. */
  estado() {
    return {
      capas: CAPAS,
      puestas: this.puestas.size,
      queridas: this.queridas.length,
      bajando: this.bajando.size,
      ...this.cuentas,
      celdas: `${this.rejilla.ancho}×${this.rejilla.alto}`,
      porNivel: [...this.puestas.values()].reduce<Record<number, number>>((a, p) => {
        a[p.t.z] = (a[p.t.z] ?? 0) + 1;
        return a;
      }, {}),
    };
  }

  /**
   * **Que cada suelo lleve las teselas.** Se mira cada vez porque las mallas
   * se rehacen —partir el horizonte, recortarlo sobre un vecino— y porque
   * poner una foto vuelve a escribir el `onBeforeCompile` del material.
   *
   * Solo cuando ya tiene foto: el sombreador sustituye la lectura de la foto,
   * y sin foto el terreno se pinta con colores por vértice que la teñirían.
   */
  private vestir(): void {
    for (const { suelo, propios } of this.suelos) {
      const mat = suelo.material();
      if (!mat || !(mat as MeshLambertMaterial).map || llevaTeselas(mat)) continue;
      vestirConTeselas(mat, this.comunes, propios);
      // Para que el banco de rendimiento cuente esta textura en la memoria.
      mat.userData.teselasCapas = this.capas;
      mat.userData.teselasIndice = this.indice;
    }
  }

  private rectangulo(t: Tesela): Rectangulo {
    const k = llaveNumerica(t);
    let r = this.rectangulos.get(k);
    if (!r) this.rectangulos.set(k, (r = rectanguloEnElMarco(t, this.casa)));
    return r;
  }

  private elegir(ojo: Ojo, altoPx: number, fovGrados: number): void {
    /*
     * Con la pantalla como mucho de 1.080 de alto: en una tableta con el
     * doble de píxeles por punto, pedir el detalle de cada píxel físico
     * cuadruplica las teselas para una diferencia que a esa densidad no se
     * ve.
     */
    const k = constanteDeDetalle(Math.min(altoPx, ALTO_MAXIMO), fovGrados);
    this.queridas = elegirTeselas(
      ojo,
      this.raices,
      this.manifiesto.indice,
      this.manifiesto.nivelMax,
      k,
      (t) => this.rectangulo(t),
      CAPAS,
    );
    this.vuelta++;
    for (const q of this.queridas) {
      const p = this.puestas.get(q.llave);
      if (p) p.vuelta = this.vuelta;
    }
    /*
     * **Y lo que ya no se quiere, fuera del índice** aunque siga en su capa:
     * una tesela de z16 vista desde quince kilómetros es ruido que hierve. La
     * capa se queda ocupada hasta que haga falta: si se vuelve, no hay que
     * bajarla otra vez.
     */
    for (const p of this.puestas.values()) {
      const quiere = p.vuelta === this.vuelta;
      if (quiere && !this.celdas.tiene(p.t)) this.celdas.poner(p.t, p.capa);
      else if (!quiere && this.celdas.tiene(p.t)) this.celdas.quitar(p.t);
    }
    this.subirIndice();
  }

  private url(t: Tesela): string {
    return `${this.base}/${this.juego}/${t.z}/${t.x}/${t.y}.jpg`;
  }

  private pedir(): void {
    const ahora = performance.now();
    for (const q of this.queridas) {
      if (this.bajando.size >= A_LA_VEZ) break;
      if (this.puestas.has(q.llave) || this.bajando.has(q.llave)) continue;
      const otraVez = this.fallidas.get(q.llave);
      if (otraVez !== undefined && ahora < otraVez) continue;
      this.bajando.add(q.llave);
      void this.bajar(q);
    }
  }

  private async bajar(q: Querida): Promise<void> {
    try {
      const res = await fetch(this.url(q.t));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      this.cuentas.bytes += blob.size;
      /*
       * **Decodificada fuera del hilo principal**, y con su cadena de
       * mipmaps hecha aquí y no en la tarjeta: `generateMipmap` sobre una
       * textura de capas rehace las ciento sesenta capas cada vez, y eso es
       * un tirón por tesela que llega.
       */
      const opciones = { colorSpaceConversion: "none", premultiplyAlpha: "none" } as const;
      const mips: ImageBitmap[] = [await createImageBitmap(blob, opciones)];
      for (let lado = LADO_DE_TESELA / 2; lado >= 1; lado /= 2)
        mips.push(
          await createImageBitmap(mips[mips.length - 1]!, {
            ...opciones,
            resizeWidth: lado,
            resizeHeight: lado,
            resizeQuality: "medium",
          }),
        );
      this.listas.push({ t: q.t, mips });
      this.cuentas.bajadas++;
    } catch {
      // Sin red, o sin esa tesela: se vuelve a probar dentro de un minuto.
      this.cuentas.fallos++;
      this.fallidas.set(q.llave, performance.now() + 60000);
    } finally {
      this.bajando.delete(q.llave);
    }
  }

  /** Una capa libre, o la de la puesta que hace más que no se quiere. */
  private capaLibre(): number | null {
    const libre = this.libres.pop();
    if (libre !== undefined) return libre;
    let vieja: Puesta | null = null;
    for (const p of this.puestas.values())
      if (p.vuelta < this.vuelta && (!vieja || p.vuelta < vieja.vuelta)) vieja = p;
    if (!vieja) return null;
    this.puestas.delete(llaveNumerica(vieja.t));
    this.celdas.quitar(vieja.t);
    return vieja.capa;
  }

  private subir(pintor: WebGLRenderer): void {
    if (!this.listas.length) return;
    if (!this.reservada) {
      // La primera vez, reservar la textura entera en la tarjeta.
      pintor.initTexture(this.capas);
      this.reservada = true;
    }
    for (let n = 0; n < SUBIDAS_POR_CUADRO && this.listas.length; n++) {
      const lista = this.listas.shift()!;
      const llave = llaveNumerica(lista.t);
      const capa = this.puestas.has(llave) ? null : this.capaLibre();
      if (capa !== null) {
        lista.mips.forEach((bmp, nivel) => {
          const src = new Texture(bmp);
          pintor.copyTextureToTexture(src, this.capas, null, new Vector3(0, 0, capa), 0, nivel);
          src.dispose();
        });
        this.puestas.set(llave, { t: lista.t, capa, vuelta: this.vuelta });
        this.celdas.poner(lista.t, capa);
        this.cuentas.subidas++;
      }
      for (const b of lista.mips) b.close();
    }
    this.subirIndice();
  }

  /** Sube al índice de la tarjeta solo las filas que han cambiado. */
  private subirIndice(): void {
    const filas = this.celdas.filasTocadas;
    if (!filas.size) return;
    const ancho = this.rejilla.ancho * 4;
    for (const f of filas) this.indice.addUpdateRange(f * ancho, ancho);
    filas.clear();
    this.indice.needsUpdate = true;
  }

  dispose(): void {
    this.capas.dispose();
    this.indice.dispose();
    for (const l of this.listas) for (const b of l.mips) b.close();
    this.listas.length = 0;
  }
}
