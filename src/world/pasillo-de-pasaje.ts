/**
 * **El pasillo de la cabina de pasaje**, por dentro: lo que ve Ara cuando se
 * asoma al pasillo para buscar su salida.
 *
 * Enrique (punto 312): cuando la demostración habla de las salidas, «que la
 * cámara se mueva para que Ara vea un letrero EXIT». La demostración dice
 * «busquen la más cercana», y Ara hace lo que se pide: se asoma al pasillo y
 * mira hacia delante, que es donde está la suya —en su fila, las puertas de
 * delante quedan a ocho metros y las de detrás a trece—. Lo que se ve es lo
 * que vería de verdad:
 *
 * - **El letrero «EXIT» encendido** encima de cada puerta de delante y otro
 *   colgado del techo sobre el pasillo, con sus flechas hacia las dos puertas.
 *   Letras rojas sobre blanco iluminado, como el de la salida del marco de la
 *   ventanilla —ver `marco-de-ventanilla.ts`—, que es lo que pide la norma de
 *   certificación (CS 25.812). Alumbra solo: no depende de la luz de fuera.
 * - **Las tiras del suelo**, a los dos lados del pasillo, que llevan hasta las
 *   puertas y acaban en rojo junto a ellas. Son las fotoluminiscentes, que se
 *   cargan con la luz de la cabina y brillan solas si falta todo lo demás: se
 *   ven siempre, pálidas, y no hace falta encender nada para enseñarlas. Las
 *   eléctricas solo se encienden en una emergencia, y encenderlas aquí sería
 *   enseñar lo que no pasa.
 * - **Las filas de delante**, de dos en dos a cada lado, a ochenta centímetros
 *   —la distancia entre filas de un regional—, con su gente: la cabina va
 *   llena, que es lo que dice la escena. Los compartimentos de arriba, el
 *   techo con su luz y las ventanillas a los lados, por las que se ve fuera.
 * - **Y las puertas**, en las paredes, donde las tiene el modelo.
 *
 * Los modelos no traen cabina por dentro —ver `asiento-de-pasaje.ts`—, así
 * que esto se monta aquí con cajas, en coordenadas del avión, a partir de lo
 * que el modelo sí mide: las ventanillas, las puertas y el asiento de Ara. Y
 * solo existe mientras se mira: el juego lo cuelga del avión al poner el
 * plano del pasillo y lo descuelga al quitarlo, así que fuera de esos
 * segundos no cuesta nada ni estorba a nada que mida el avión.
 *
 * **Lo que cuesta**: once mil triángulos en cuatro mallas de un material sin
 * luz —la de la cabina va pintada en los colores de cada cara—, unos pocos
 * cientos de microsegundos en la tarjeta del portátil. La pared de la
 * ventanilla, la de siempre, se apaga mientras tanto.
 */

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { AsientoDeAra } from "./asiento-de-ara";
import type { AsientoDePasaje, PuertaDePasaje, VentanillaDePasaje } from "./asiento-de-pasaje";
import { COLORES_DE_LA_CABINA } from "./marco-de-ventanilla";

type Punto = { readonly x: number; readonly y: number; readonly z: number };

/**
 * **Las medidas de la cabina**, m: las de un regional de pasillo único de dos
 * y dos, como el ERJ 170. Treinta y una pulgadas entre filas, asientos de
 * dieciocho, un pasillo de diecinueve y medio, dos metros de techo.
 */
export const CABINA = {
  entreFilas: 0.79,
  pasillo: 0.5,
  asiento: 0.44,
  brazo: 0.05,
  techo: 2.0,
  /** Lo alto del respaldo sobre el suelo, y del cojín. */
  respaldo: 1.1,
  cojin: 0.46,
  /** Lo que se aparta la pared de dentro de la piel, a la altura de la ventanilla. */
  forro: 0.16,
} as const;

/**
 * **Desde dónde mira Ara asomada al pasillo**, respecto a sus ojos sentada: la
 * cabeza por encima del brazo del asiento de al lado, a la altura de los ojos
 * de quien tiene pocos años, sin despegarse del respaldo. Y el ángulo de la vista,
 * más cerrado que el de la ventanilla: es mirar algo concreto a ocho metros,
 * y con el de siempre el letrero sería un sello de cuarenta píxeles. Mirando
 * un poco hacia arriba, lo justo para que los letreros caigan por debajo de la
 * tarjeta de quien habla también en un teléfono apaisado, y que por abajo
 * entre el suelo del pasillo desde unos tres metros, con sus tiras.
 */
export const ASOMADA_AL_PASILLO = { x: 0.2, ojosSobreElSuelo: 1.08, adelante: 0, fov: 40, cabeceo: 0.04 } as const;

/** Lo que mide un letrero de salida, m: el de encima de las puertas y el del techo. */
const LETRERO = { ancho: 0.34, alto: 0.12, fondo: 0.04 } as const;

/** Los colores de la cabina por dentro: los del marco de la ventanilla, y lo demás. */
const COLOR = {
  pared: COLORES_DE_LA_CABINA.pared,
  asiento: COLORES_DE_LA_CABINA.asiento,
  funda: COLORES_DE_LA_CABINA.funda,
  rojo: COLORES_DE_LA_CABINA.rojo,
  letrero: COLORES_DE_LA_CABINA.letrero,
  bolsillo: "#26362e",
  suelo: "#3d424a",
  techo: "#ebe6dc",
  maletero: "#e3ddd1",
  luz: "#fff3d6",
  puerta: "#d9d5cc",
  junta: "#6d6a63",
  cabina: "#8d9093",
  pata: "#4a4d50",
  // Las tiras del suelo, que brillan solas: el amarillo verdoso pálido de las fotoluminiscentes.
  tira: "#eef5b8",
  pelo: ["#2a1e17", "#3b2a1f", "#151515", "#5a4030", "#7a6a5a", "#b8a27a", "#1f1a17"],
} as const;

/** La luz pintada de la cabina: de arriba y algo de detrás, que es de donde viene la del techo. */
const LUZ = new Vector3(0.15, 1, 0.45).normalize();

/** El pasillo montado: lo que se cuelga del avión, desde dónde se mira y lo que mide el banco. */
export interface PasilloDePasaje {
  readonly grupo: Group;
  /** Ara asomada al pasillo, como un asiento: ver `ASOMADA_AL_PASILLO`. */
  readonly pose: AsientoDePasaje;
  /**
   * **Los letreros de salida**, el centro de su cara, en coordenadas del
   * avión: primero el de encima de la puerta más cercana del lado de Ara,
   * después el de la otra puerta y el del techo.
   */
  readonly letreros: readonly Punto[];
  /** Lo que mide cada letrero, m: para saber cuánto ocupa en la pantalla. */
  readonly tamanoDelLetrero: { readonly ancho: number; readonly alto: number };
  /** **Las tiras del suelo**, puntos a lo largo de las dos, de Ara a las puertas. */
  readonly tiras: readonly Punto[];
  /** Las mallas que tapan lo que hay detrás: para mirar con rayos si el letrero se ve. */
  readonly mallas: readonly Mesh[];
  /** De dónde a dónde va la cabina montada, a lo largo, y el suelo. */
  readonly desde: number;
  readonly hasta: number;
  readonly suelo: number;
}

/** Una caja con los colores de sus caras ya alumbrados, para juntarla con las demás. */
function caja(
  centro: Punto,
  ancho: number,
  alto: number,
  fondo: number,
  color: string,
  brillo = 1,
): BufferGeometry {
  const g = new BoxGeometry(ancho, alto, fondo);
  g.translate(centro.x, centro.y, centro.z);
  return pintada(g, color, brillo);
}

/** Pinta una geometría con su color y la luz de la cabina en cada cara. */
function pintada(g: BufferGeometry, color: string, brillo = 1): BufferGeometry {
  const c = new Color(color);
  const n = g.getAttribute("normal");
  const colores = new Float32Array(n.count * 3);
  const v = new Vector3();
  for (let i = 0; i < n.count; i++) {
    v.fromBufferAttribute(n, i);
    const k = brillo * (0.6 + 0.4 * Math.max(0, v.dot(LUZ)));
    colores[i * 3] = c.r * k;
    colores[i * 3 + 1] = c.g * k;
    colores[i * 3 + 2] = c.b * k;
  }
  g.setAttribute("color", new BufferAttribute(colores, 3));
  // Todas con lo mismo, que es lo que pide `mergeGeometries`.
  g.deleteAttribute("uv");
  return g.index ? g.toNonIndexed() : g;
}

/** Un número entre 0 y 1 que siempre es el mismo para la misma semilla. */
function azar(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * **El letrero de salida**, dibujado: «EXIT» en rojo sobre blanco, y en el del
 * techo, las flechas hacia las dos puertas. La única palabra de la escena,
 * en inglés como en cualquier avión. En sRGB, como todo lienzo de color.
 */
function texturaDelLetrero(conFlechas: boolean): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const lienzo = document.createElement("canvas");
  lienzo.width = 384;
  lienzo.height = 136;
  const c = lienzo.getContext("2d");
  if (!c) return null;
  c.fillStyle = COLOR.letrero;
  c.fillRect(0, 0, lienzo.width, lienzo.height);
  c.strokeStyle = COLOR.rojo;
  c.lineWidth = 8;
  c.strokeRect(6, 6, lienzo.width - 12, lienzo.height - 12);
  c.fillStyle = COLOR.rojo;
  c.font = "800 92px system-ui, sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("EXIT", lienzo.width / 2, lienzo.height / 2 + 4);
  if (conFlechas) {
    const flecha = (x: number, hacia: number): void => {
      c.beginPath();
      c.moveTo(x + hacia * 26, lienzo.height / 2);
      c.lineTo(x - hacia * 10, lienzo.height / 2 - 28);
      c.lineTo(x - hacia * 10, lienzo.height / 2 + 28);
      c.closePath();
      c.fill();
    };
    flecha(34, -1);
    flecha(lienzo.width - 34, 1);
  }
  const t = new CanvasTexture(lienzo);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * **Monta el pasillo** delante del asiento de Ara, o `null` si el modelo no
 * da con qué: sin puertas delante de Ara no hay salida que mirar.
 */
export function montarElPasillo(
  ara: AsientoDeAra,
  lado: "izquierda" | "derecha",
  filas: Readonly<Record<"izquierda" | "derecha", readonly VentanillaDePasaje[]>>,
  puertas: readonly PuertaDePasaje[],
  franja: number,
): PasilloDePasaje | null {
  const sentada = ara.poses.sentada.ojo;
  const delante = puertas.find((p) => p.zMax < sentada.z);
  if (!delante) return null;
  const s = lado === "izquierda" ? -1 : 1;
  const suelo = delante.yMin + 0.04;
  const techo = suelo + CABINA.techo;
  const yVentana = ara.ventanilla.centro.y;
  const xPared = Math.abs(ara.ventanilla.centro.x) - CABINA.forro;
  // La cara de atrás del respaldo de Ara, y de ahí las filas de delante.
  const respaldoDeAra = sentada.z + 0.27;
  const frente = delante.zMin - 0.25;
  const desde = frente;
  const hasta = respaldoDeAra + 0.6;
  const largo = hasta - desde;
  const medio = (desde + hasta) / 2;

  const fijo: BufferGeometry[] = [];
  const brillan: BufferGeometry[] = [];

  // ── El suelo, el techo con su luz y los compartimentos ─────────────────
  const zp0 = delante.zMin;
  const zp1 = delante.zMax;
  // Los compartimentos y la luz, desde la puerta hacia atrás: en el hueco de la puerta no hay.
  const conMaletero = { desde: zp1 + 0.1, hasta };
  const largoDelMaletero = conMaletero.hasta - conMaletero.desde;
  const medioDelMaletero = (conMaletero.desde + conMaletero.hasta) / 2;
  fijo.push(caja({ x: 0, y: suelo - 0.01, z: medio }, 2 * xPared, 0.02, largo, COLOR.suelo));
  fijo.push(caja({ x: 0, y: techo + 0.01, z: medio }, 2 * xPared, 0.02, largo, COLOR.techo));
  const bajoElMaletero = yVentana + 0.4;
  const maleteroSale = 0.52;
  for (const k of [-1, 1]) {
    const xm = k * (xPared - maleteroSale / 2);
    fijo.push(caja({ x: xm, y: (bajoElMaletero + techo) / 2, z: medioDelMaletero }, maleteroSale, techo - bajoElMaletero, largoDelMaletero, COLOR.maletero));
    // El labio de abajo, más oscuro: las luces de lectura y las rejillas del aire.
    fijo.push(caja({ x: k * (xPared - maleteroSale + 0.08), y: bajoElMaletero - 0.015, z: medioDelMaletero }, 0.16, 0.03, largoDelMaletero, COLOR.junta));
    // Y la luz del techo, a lo largo, junto al compartimento.
    brillan.push(caja({ x: k * (xPared - maleteroSale - 0.04), y: techo - 0.02, z: medioDelMaletero }, 0.05, 0.02, largoDelMaletero, COLOR.luz));
  }

  // ── Las paredes: la puerta, y detrás las ventanillas con su hueco ──────
  const bajoLaVentana = yVentana - 0.24;
  const sobreLaVentana = yVentana + 0.24;
  for (const k of [-1, 1]) {
    const cual = k < 0 ? "izquierda" : "derecha";
    const x = k * xPared;
    // Delante de la puerta, pared entera; la puerta, con su marco y su asa; y encima, pared.
    if (zp0 - desde > 0.01) fijo.push(caja({ x, y: (suelo + techo) / 2, z: (desde + zp0) / 2 }, 0.03, techo - suelo, zp0 - desde, COLOR.pared));
    fijo.push(caja({ x: x - k * 0.02, y: (suelo + delante.yMax) / 2, z: (zp0 + zp1) / 2 }, 0.04, delante.yMax - suelo, zp1 - zp0, COLOR.puerta, 1.05));
    for (const z of [zp0, zp1]) fijo.push(caja({ x: x - k * 0.035, y: (suelo + delante.yMax) / 2, z }, 0.03, delante.yMax - suelo, 0.04, COLOR.junta));
    fijo.push(caja({ x: x - k * 0.035, y: delante.yMax, z: (zp0 + zp1) / 2 }, 0.03, 0.04, zp1 - zp0, COLOR.junta));
    fijo.push(caja({ x: x - k * 0.06, y: suelo + 1.0, z: zp0 + 0.18 }, 0.04, 0.05, 0.22, COLOR.junta));
    fijo.push(caja({ x, y: (delante.yMax + techo) / 2, z: (zp0 + zp1) / 2 }, 0.03, techo - delante.yMax, zp1 - zp0, COLOR.pared));
    // Detrás de la puerta: debajo y encima de la fila de ventanillas.
    fijo.push(caja({ x, y: (suelo + bajoLaVentana) / 2, z: (zp1 + hasta) / 2 }, 0.03, bajoLaVentana - suelo, hasta - zp1, COLOR.pared));
    fijo.push(caja({ x, y: (sobreLaVentana + bajoElMaletero) / 2, z: (zp1 + hasta) / 2 }, 0.03, bajoElMaletero - sobreLaVentana, hasta - zp1, COLOR.pared));
    // Y entre ventanilla y ventanilla, la pared; en cada una, su hueco, por el que se ve fuera.
    const huecos = filas[cual]
      .filter((v) => v.centro.z > zp1 && v.centro.z < hasta)
      .map((v) => [v.centro.z - v.ancho / 2 - 0.03, v.centro.z + v.ancho / 2 + 0.03] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    let z = zp1;
    for (const [a, b] of [...huecos, [hasta, hasta] as [number, number]]) {
      if (a > z + 0.01) fijo.push(caja({ x, y: yVentana, z: (z + a) / 2 }, 0.03, sobreLaVentana - bajoLaVentana, a - z, COLOR.pared));
      z = Math.max(z, b);
    }
  }
  // La pared de delante, con la puerta de la cabina de mando.
  fijo.push(caja({ x: 0, y: (suelo + techo) / 2, z: frente - 0.02 }, 2 * xPared, techo - suelo, 0.04, COLOR.pared));
  fijo.push(caja({ x: 0, y: suelo + 0.95, z: frente + 0.01 }, 0.78, 1.9, 0.04, COLOR.cabina));

  // ── Las filas, con su gente ────────────────────────────────────────────
  const xAsientos = [
    -(CABINA.pasillo / 2 + CABINA.brazo + CABINA.asiento / 2),
    -(CABINA.pasillo / 2 + 2 * CABINA.brazo + (3 * CABINA.asiento) / 2),
  ];
  const cabezas: BufferGeometry[] = [];
  const franjaDeLaFunda = `#${new Color(franja).getHexString()}`;
  let fila = 0;
  for (let zr = respaldoDeAra - CABINA.entreFilas; zr - 0.55 > delante.zMax + 0.3; zr -= CABINA.entreFilas) {
    fila++;
    for (const k of [-1, 1]) {
      for (const [i, xa] of xAsientos.entries()) {
        const x = -k * xa;
        const arriba = suelo + CABINA.respaldo;
        fijo.push(caja({ x, y: suelo + CABINA.cojin - 0.06, z: zr - 0.3 }, CABINA.asiento, 0.12, 0.46, COLOR.asiento));
        fijo.push(caja({ x, y: (suelo + CABINA.cojin + arriba) / 2 - 0.04, z: zr - 0.05 }, CABINA.asiento, arriba - suelo - CABINA.cojin + 0.08, 0.1, COLOR.asiento));
        // Por detrás: la funda del cabezal, con su franja, y el bolsillo.
        fijo.push(caja({ x, y: arriba - 0.08, z: zr + 0.006 }, 0.36, 0.14, 0.012, COLOR.funda, 1.05));
        fijo.push(caja({ x, y: arriba - 0.17, z: zr + 0.008 }, 0.36, 0.025, 0.012, franjaDeLaFunda));
        fijo.push(caja({ x, y: suelo + 0.68, z: zr + 0.006 }, 0.34, 0.26, 0.012, COLOR.bolsillo));
        /*
         * Y la gente: casi todos los asientos, cada fila a su manera. Menos la
         * fila de delante de Ara, de su lado: esa cabeza quedaría a un palmo
         * de la cámara y taparía media pantalla.
         */
        const semilla = fila * 7 + i * 3 + (k + 1);
        if (azar(semilla) < 0.85 && !(fila === 1 && k === s)) {
          const cabeza = new IcosahedronGeometry(0.095, 1);
          cabeza.scale(1, 1.12, 1.05);
          cabeza.translate(x + (azar(semilla + 0.5) - 0.5) * 0.06, arriba + 0.05 + azar(semilla + 0.7) * 0.06, zr - 0.2);
          cabezas.push(pintada(cabeza, COLOR.pelo[Math.floor(azar(semilla + 0.3) * COLOR.pelo.length)]!));
        }
      }
      // Los brazos —el del pasillo, el del medio y el de la pared— y las patas.
      for (const xb of [CABINA.pasillo / 2 + CABINA.brazo / 2, CABINA.pasillo / 2 + 1.5 * CABINA.brazo + CABINA.asiento, CABINA.pasillo / 2 + 2.5 * CABINA.brazo + 2 * CABINA.asiento])
        fijo.push(caja({ x: k * xb, y: suelo + 0.64, z: zr - 0.3 }, CABINA.brazo, 0.05, 0.44, COLOR.pata));
      for (const xb of [CABINA.pasillo / 2 + 0.12, CABINA.pasillo / 2 + 2 * CABINA.asiento - 0.05])
        fijo.push(caja({ x: k * xb, y: suelo + 0.2, z: zr - 0.3 }, 0.04, 0.4, 0.04, COLOR.pata));
    }
  }

  // ── Las tiras del suelo, hasta las puertas, y el rojo de la salida ─────
  const tiras: Punto[] = [];
  const finDeLasTiras = delante.zMax + 0.15;
  for (const k of [-1, 1]) {
    const x = k * (CABINA.pasillo / 2 - 0.02);
    const z0 = finDeLasTiras;
    const z1 = respaldoDeAra;
    brillan.push(caja({ x, y: suelo + 0.004, z: (z0 + z1) / 2 }, 0.028, 0.008, z1 - z0, COLOR.tira));
    for (let z = z1; z >= z0; z -= 0.5) tiras.push({ x, y: suelo + 0.008, z });
    // Y donde acaban, el rojo de la puerta: de la tira a la puerta de su lado.
    const zPuerta = (delante.zMin + delante.zMax) / 2;
    brillan.push(caja({ x: k * (CABINA.pasillo / 2 + (xPared - CABINA.pasillo / 2) / 2), y: suelo + 0.004, z: zPuerta }, xPared - CABINA.pasillo / 2 - 0.1, 0.008, 0.06, COLOR.rojo));
    brillan.push(caja({ x, y: suelo + 0.004, z: finDeLasTiras - 0.04 }, 0.05, 0.009, 0.08, COLOR.rojo));
  }

  // ── Los letreros ───────────────────────────────────────────────────────
  const grupo = new Group();
  grupo.name = "pasillo-de-pasaje";
  const mallas: Mesh[] = [];
  const sinLuz = new MeshBasicMaterial({ vertexColors: true });
  const quietas = new Mesh(mergeGeometries(fijo, false)!, sinLuz);
  const gente = new Mesh(mergeGeometries(cabezas, false)!, sinLuz);
  const luces = new Mesh(mergeGeometries(brillan, false)!, new MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  for (const m of [quietas, gente, luces]) {
    m.frustumCulled = false;
    grupo.add(m);
    mallas.push(m);
  }
  const letreros: Punto[] = [];
  const conLetrero = (x: number, y: number, z: number, conFlechas: boolean): void => {
    const marco = new Mesh(pintada(new BoxGeometry(LETRERO.ancho + 0.03, LETRERO.alto + 0.03, LETRERO.fondo), COLOR.techo), sinLuz);
    marco.position.set(x, y, z);
    const textura = texturaDelLetrero(conFlechas);
    const cara = new Mesh(
      new PlaneGeometry(LETRERO.ancho, LETRERO.alto),
      new MeshBasicMaterial({ color: textura ? 0xffffff : COLOR.letrero, map: textura, toneMapped: false }),
    );
    cara.position.set(x, y, z + LETRERO.fondo / 2 + 0.002);
    grupo.add(marco, cara);
    mallas.push(marco);
    letreros.push({ x, y, z: z + LETRERO.fondo / 2 + 0.002 });
  };
  const yLetrero = techo - LETRERO.alto / 2 - 0.06;
  const zLetrero = (delante.zMin + delante.zMax) / 2;
  // En el techo de la puerta, por dentro de la línea de los compartimentos: si no, desde el pasillo lo taparían.
  const xLetrero = xPared - maleteroSale - 0.12;
  // Primero el de la puerta del lado de Ara: es la más cercana.
  conLetrero(s * xLetrero, yLetrero, zLetrero, false);
  conLetrero(-s * xLetrero, yLetrero, zLetrero, false);
  conLetrero(0, techo - LETRERO.alto / 2 - 0.03, delante.zMax + 0.25, true);

  const ojo = {
    x: s * ASOMADA_AL_PASILLO.x,
    y: suelo + ASOMADA_AL_PASILLO.ojosSobreElSuelo,
    z: sentada.z - ASOMADA_AL_PASILLO.adelante,
  };
  // Hacia el letrero del techo, por el pasillo.
  const objetivo = letreros[2]!;
  const guinada = Math.atan2(-(objetivo.x - ojo.x), -(objetivo.z - ojo.z));
  const pose: AsientoDePasaje = {
    ojo,
    guinada,
    // Algo hacia arriba: los letreros, por debajo de la tarjeta de quien habla también en un teléfono apaisado.
    cabeceo: ASOMADA_AL_PASILLO.cabeceo,
    ventanilla: ara.ventanilla,
    sentado: null,
    fov: ASOMADA_AL_PASILLO.fov,
  };
  return {
    grupo,
    pose,
    letreros,
    tamanoDelLetrero: { ancho: LETRERO.ancho, alto: LETRERO.alto },
    tiras,
    mallas,
    desde,
    hasta,
    suelo,
  };
}
