/**
 * Las luces de un pueblo de noche, vistas desde el aire.
 *
 * Preguntado jugando, llegando a Gran Canaria al anochecer: «Gran Canaria sin
 * luces». Y no era de Gran Canaria: **de noche se apagaba el mundo entero**
 * salvo el aeropuerto. Una isla a oscuras no es una isla de noche, es un
 * agujero — y volar de noche era volar sobre nada.
 *
 * ## Por qué esto enseña algo
 *
 * Porque de noche **el único mapa que hay es el de las luces**, y se lee: la
 * mancha compacta es el pueblo, el hilo que sale de ella es la carretera, el
 * borde recto y negro es el mar. Un piloto que vuela de noche sobre tierra
 * conocida se sitúa así antes que con ningún instrumento, y eso se aprende
 * mirando, sin que nadie lo explique.
 *
 * Y es lo que hace que el vuelo de noche deje de ser un vuelo a ciegas con
 * una pista iluminada al final.
 *
 * ## De dónde salen
 *
 * De la misma rejilla que levanta las casas —clase de suelo y densidad, ya
 * extraída de OpenStreetMap— y del viario. No hay dato nuevo que bajar: lo
 * que había se usa dos veces, de día para construir y de noche para alumbrar.
 *
 * Dos poblaciones distintas, y a propósito:
 *
 * - **Las de las calles**, en fila a lo largo del viario. Son las que dibujan
 *   la forma del pueblo y las que se reconocen: una carretera de noche es una
 *   línea de puntos, y eso no lo da una nube al azar.
 * - **Las de las casas**, repartidas por la celda según su densidad. Son el
 *   relleno, y las que hacen que el centro brille más que las afueras.
 *
 * ## El color
 *
 * Ámbar. El alumbrado de sodio de toda la vida es naranja, y aunque medio
 * mundo esté cambiando a led, lo que se ve desde un avión de noche sobre un
 * pueblo canario o paraguayo sigue siendo sobre todo cálido: sodio ámbar,
 * led cálido amarillento y, cada tanto, un blanco frío de polígono o de
 * gasolinera.
 *
 * ## Y de lejos, puntos y no manchones
 *
 * Eran tres píxeles fijos a cualquier distancia, sumándose. De cerca, bien;
 * desde el mar a quince kilómetros, cada calle eran cien farolas en el mismo
 * puñado de píxeles, la suma se salía de la escala y el pueblo entero era
 * **una mancha blanca**. Lo que se ve de verdad es otra cosa: puntos
 * pequeños y cálidos, más apagados cuanto más lejos y cuanta más bruma hay
 * delante. Ver `materialDeLuces`.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
} from "three";
import { materialDeLuces } from "./material-de-luces";
import type { Ciudad } from "./ciudad";
import { encendidoSegunElSol } from "./luces-de-rodadura";

/*
 * El ámbar del sodio, el amarillo de un led cálido y el blanco frío de los
 * polígonos. **Y no a tope**: las luces se suman —ver `materialDeLuces`— y
 * con el color entero dos farolas juntas ya daban blanco. A media fuerza,
 * una calle se queda ámbar aunque sus farolas se toquen en pantalla.
 */
const SODIO = 0xff9a36;
const CALIDA = 0xffd08a;
const FRIA = 0xe4eeff;
const FUERZA = 0.62;
/**
 * Cada cuántos metros hay una farola en una calle.
 *
 * Treinta. Es la separación de verdad en una travesía, y a la distancia desde
 * la que esto se mira —kilómetros— lo que importa no es acertar la farola: es
 * que la línea se lea como una línea y no como una fila de faros de coche.
 */
const CADA_FAROLA = 30;

/**
 * Cuántas luces sueltas caben en una celda a densidad máxima.
 *
 * Seis. Con la rejilla de noventa y seis y un escenario de dieciocho
 * kilómetros, una celda mide ciento ochenta y siete metros: seis luces ahí
 * son una manzana iluminada, no una farola por casa. Poner una por casa sería
 * medio millón de puntos y no se vería distinto desde un avión.
 */
const POR_CELDA = 6;

/**
 * Lo que mide una luz en pantalla de cerca, en píxeles. De lejos baja —ver
 * `materialDeLuces`—, porque lo que llega de una luz lejana es su brillo y
 * no su tamaño.
 */
const TAMANO = 3;

export interface LucesDeCiudad {
  readonly grupo: Group;
  /** Enciende o apaga según dónde esté el sol. `seno` es `sunDirection.y`. */
  ponerSol(seno: number): void;
  /** Cuántas hay, para el banco. */
  readonly cuantas: number;
  dispose(): void;
}

/**
 * Un azar repetible.
 *
 * El mismo pueblo tiene que tener las mismas luces cada partida: si cambian,
 * no se puede aprender a reconocerlo, que es justamente para lo que sirven.
 */
function dado(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function crearLucesDeCiudad(
  ciudad: Ciudad,
  cota: (x: number, z: number) => number,
  /**
   * Si un punto cae en el aeropuerto, para no sembrar farolas en la pista.
   *
   * El aeródromo ya trae su balizamiento, y una farola en la zona de toma no
   * es un descuido: es una luz que dice «aquí hay calle» donde hay pista.
   */
  enElAeropuerto: (x: number, z: number) => boolean,
  nivelDelAgua = -Infinity,
): LucesDeCiudad {
  const grupo = new Group();
  grupo.name = "luces-de-ciudad";

  const azar = dado(0x1a2b3c4d);
  const sitios: number[] = [];
  const colores: number[] = [];
  const tinte = new Color();

  /** De qué color es una luz: sobre todo sodio, algo de led cálido y poco frío. */
  const colorDe = (suerte: number): number =>
    suerte < 0.06 ? FRIA : suerte < 0.24 ? CALIDA : SODIO;
  const poner = (x: number, z: number, suerte: number, brillo: number): void => {
    if (enElAeropuerto(x, z)) return;
    const y = cota(x, z);
    if (y <= nivelDelAgua) return;
    // Cinco metros: la altura de una farola, y lo justo para que la luz no se
    // hunda en el pliegue del terreno cuando el relieve es grueso.
    sitios.push(x, y + 5, -0 + z);
    tinte.set(colorDe(suerte)).multiplyScalar(brillo * FUERZA);
    colores.push(tinte.r, tinte.g, tinte.b);
  };

  // ── Las de las calles: la forma del pueblo ──────────────────────────────
  for (const via of ciudad.vias) {
    for (let i = 0; i < via.puntos.length - 1; i++) {
      const [ax, ay] = via.puntos[i]!;
      const [bx, by] = via.puntos[i + 1]!;
      // El fichero tiene la Y al norte; el mundo, el norte en la Z negativa.
      const az = -ay;
      const bz = -by;
      const largo = Math.hypot(bx - ax, bz - az);
      if (largo < 1) continue;
      const cuantas = Math.max(1, Math.round(largo / CADA_FAROLA));
      for (let k = 0; k < cuantas; k++) {
        const t = (k + 0.5) / cuantas;
        poner(
          ax + (bx - ax) * t,
          az + (bz - az) * t,
          azar(),
          0.7 + azar() * 0.3,
        );
      }
    }
  }

  // ── Y las de las casas: el relleno, según la densidad ───────────────────
  const { lado, clase, densidad } = ciudad.rejilla;
  const paso = ciudad.tamanoM / lado;
  const mitad = ciudad.tamanoM / 2;
  for (let fila = 0; fila < lado; fila++) {
    for (let col = 0; col < lado; col++) {
      const i = fila * lado + col;
      const c = clase[i] ?? 0;
      if (!c) continue;
      const d = (densidad[i] ?? 0) / 255;
      const cuantas = Math.round(d * POR_CELDA);
      for (let k = 0; k < cuantas; k++) {
        const x = -mitad + (col + azar()) * paso;
        // Del fichero al mundo: la fila crece al norte y la Z al sur.
        const z = mitad - (fila + azar()) * paso;
        poner(x, z, azar(), 0.55 + d * 0.45);
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(sitios), 3));
  geo.setAttribute("color", new BufferAttribute(new Float32Array(colores), 3));
  const material = materialDeLuces(TAMANO);
  const puntos = new Points(geo, material);
  puntos.name = "luces-de-ciudad-puntos";
  grupo.add(puntos);

  const ponerSol = (seno: number): void => {
    const luce = encendidoSegunElSol(seno);
    grupo.visible = luce > 0.01;
    material.opacity = luce;
  };
  ponerSol(-1);

  return {
    grupo,
    ponerSol,
    cuantas: sitios.length / 3,
    dispose() {
      geo.dispose();
      material.dispose();
    },
  };
}
