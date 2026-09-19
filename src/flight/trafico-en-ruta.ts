/**
 * Los otros aviones de la ruta: quién hay ahí fuera entre dos aeropuertos.
 *
 * El tráfico que ya había vive en el circuito del aeródromo —ver
 * `world/trafico.ts`— y hace muy bien su trabajo: enseña que la pista es de
 * todos. Pero en cuanto se puede ir de una isla a otra aparecen cuarenta
 * minutos de recta con el cielo vacío, y un cielo vacío enseña que volar es
 * estar solo. No lo es: el corredor entre dos islas de Canarias es de los más
 * transitados de España.
 *
 * ## Vuelan en su nivel, y ahí está la lección
 *
 * Cada uno va al nivel que le toca por su rumbo —ver `nivel-de-crucero.ts`—,
 * así que **los que vienen de frente van siempre a otra altura**. Quien vuele
 * hacia el este los verá pasar por encima o por debajo, siempre del mismo
 * lado, y el día que alguien le cuente la regla semicircular ya la sabía.
 *
 * Eso es lo contrario de poner aviones al azar: al azar no enseñan nada y
 * además asustan.
 *
 * ## No se les puede chocar
 *
 * Como el del circuito: son ambiente. Un juego donde a los cuatro años te mata
 * algo que no controlás no es este juego. Lo que enseñan es **que hay más
 * gente**, y para eso basta con verlos y oírlos.
 *
 * ## Y son los mismos en cada vuelo
 *
 * Todo sale de una semilla y del reloj, sin memoria y sin azar suelto: el
 * mismo vuelo pone los mismos aviones en los mismos sitios. Es lo que permite
 * medirlo en un banco, y es lo que evita que un tráfico aparezca de la nada
 * delante del morro.
 */

import { nivelPara } from "./nivel-de-crucero";

/** Un punto del mundo, en metros. */
export interface Punto {
  readonly x: number;
  readonly z: number;
}

/** Uno de los que andan por la ruta. */
export interface EnRuta {
  readonly id: string;
  readonly x: number;
  /** Altitud en metros, ya convertida desde su nivel. */
  readonly y: number;
  readonly z: number;
  /** Rumbo verdadero, en grados. */
  readonly rumbo: number;
  /** Su nivel, en pies, por si hay que decirlo. */
  readonly pies: number;
}

const PIE = 0.3048;

/**
 * Cuántos aviones andan por la ruta a la vez.
 *
 * Cuatro. Bastantes para que el cielo no esté vacío y pocos para que siga
 * siendo un cielo: una ruta entre islas mueve un avión cada pocos minutos, no
 * una autopista.
 */
export const CUANTOS_EN_RUTA = 4;

/** A cuánto van, en metros por segundo. Unos 250 nudos. */
const VAN_A = 128;

/**
 * Cuánto se apartan del eje de la ruta, en metros.
 *
 * No vuelan todos por la misma línea: un corredor real tiene anchura, y verlos
 * pasar exactamente por encima sería más raro que verlos pasar al lado.
 */
const ANCHO_DEL_CORREDOR = 2600;

/** Un número entre 0 y 1 a partir de dos enteros. Sin estado y repetible. */
function sorteo(semilla: number, i: number): number {
  const x = Math.sin(semilla * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Quiénes andan por la ruta en este instante.
 *
 * `desde` y `hasta` son los dos aeropuertos en coordenadas del mundo; `ahora`
 * es el reloj del vuelo en segundos. Se devuelven todos, y quien llame decide
 * a cuáles hace caso: la carta los pinta si caben y el mundo los dibuja si
 * están cerca.
 */
export function traficoEnRuta(
  desde: Punto,
  hasta: Punto,
  ahora: number,
  semilla = 1,
): EnRuta[] {
  const dx = hasta.x - desde.x;
  const dz = hasta.z - desde.z;
  const largo = Math.hypot(dx, dz);
  if (largo < 1) return [];
  const ux = dx / largo;
  const uz = dz / largo;
  // La perpendicular, para apartarlos del eje.
  const px = -uz;
  const pz = ux;

  /*
   * El rumbo de ida, en grados de compás. La misma conversión que usa el resto
   * del mundo: cero al norte y noventa al este, que no es la de `atan2`.
   */
  const rumboIda = ((Math.atan2(ux, -uz) * 180) / Math.PI + 360) % 360;

  const salida: EnRuta[] = [];
  for (let i = 0; i < CUANTOS_EN_RUTA; i++) {
    // La mitad van en un sentido y la mitad en el otro.
    const alReves = i % 2 === 1;
    const rumbo = alReves ? (rumboIda + 180) % 360 : rumboIda;
    /*
     * El nivel se lo da su rumbo, no el sorteo: es lo único de aquí que no se
     * puede sortear, porque es la regla. Lo que sí se sortea es cuál de los
     * niveles legales le toca, entre el primero y el tercero de su sentido.
     */
    const pedido = 7000 + Math.floor(sorteo(semilla, i * 7) * 3) * 2000;
    const pies = nivelPara(rumbo, pedido);

    /*
     * Dónde está: recorre la ruta de punta a punta y vuelve a empezar, con un
     * desfase propio para que no vayan en fila. El recorrido se alarga un
     * treinta por ciento por cada lado para que aparezcan y desaparezcan
     * **fuera** de la ruta y no delante de nadie.
     */
    const margen = largo * 0.3;
    const recorrido = largo + margen * 2;
    const cuanto = recorrido / VAN_A;
    const desfase = sorteo(semilla, i * 13 + 1) * cuanto;
    const t = ((ahora + desfase) % cuanto) / cuanto;
    const avance = alReves ? 1 - t : t;
    const s = -margen + avance * recorrido;

    const lado = (sorteo(semilla, i * 19 + 2) - 0.5) * ANCHO_DEL_CORREDOR;
    salida.push({
      id: `ruta-${i}`,
      x: desde.x + ux * s + px * lado,
      z: desde.z + uz * s + pz * lado,
      y: pies * PIE,
      rumbo,
      pies,
    });
  }
  return salida;
}
