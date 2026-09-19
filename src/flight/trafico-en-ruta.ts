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
import type { Silueta } from "./flota";

/** Un punto del mundo, en metros. */
export interface Punto {
  readonly x: number;
  readonly z: number;
}

/** Uno de los que andan por la ruta. */
export interface EnRuta {
  readonly id: string;
  /** Qué forma tiene. Es lo que se reconoce desde lejos. Ver `EN_EL_CORREDOR`. */
  readonly silueta: Silueta;
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

/**
 * Quién anda por un corredor entre islas, y a cuánto va.
 *
 * Cuatro siluetas y cuatro velocidades, y las dos cosas son el mismo dato:
 * **un avión se reconoce por su forma y se delata por su paso**. Un
 * turbohélice regional cruza a doscientos setenta nudos y un reactor de línea
 * a cuatrocientos cincuenta, y verlos ir todos igual de rápido es exactamente
 * lo que enseña que un avión es un avión y ya está.
 *
 * Pedido así: «otros aviones —jets privados, aviones veloces sin entrar en
 * aviones de combate, de investigación—». Esto es el primer paso y el barato:
 * los que **pasan**, con las siluetas que ya sabe fabricar la flota. Un jet
 * privado es una cola en T pequeña y rápida, y eso ya se puede ver.
 *
 * Nada de ala alta ni de biplano: a nivel cien no hay avionetas, y poner una
 * ahí sería enseñar algo falso en el sitio donde más se mira.
 */
const EN_EL_CORREDOR = [
  /** El turbohélice regional, que es el que más vuela entre islas. */
  { silueta: "bimotor-ala-baja", kt: 270 },
  /** El reactor de línea. */
  { silueta: "reactor", kt: 450 },
  /** El jet privado: cola en T, pequeño y con prisa. */
  { silueta: "cola-en-t", kt: 420 },
  /** Y el de fuselaje ancho, que pasa alto y de largo. */
  { silueta: "cuatrimotor", kt: 480 },
] as const satisfies readonly { silueta: Silueta; kt: number }[];

/** De nudos a metros por segundo. */
const NUDO = 0.514444;

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
    /*
     * Qué avión es. Se sortea con la semilla del vuelo, así que el cielo de
     * una ruta es siempre el mismo cielo —que es lo que permite aprendérselo—
     * y el de otra no.
     */
    const cual =
      EN_EL_CORREDOR[
        Math.floor(sorteo(semilla, i * 29 + 3) * EN_EL_CORREDOR.length) %
          EN_EL_CORREDOR.length
      ]!;
    const vaA = cual.kt * NUDO;
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
    const cuanto = recorrido / vaA;
    const desfase = sorteo(semilla, i * 13 + 1) * cuanto;
    const t = ((ahora + desfase) % cuanto) / cuanto;
    const avance = alReves ? 1 - t : t;
    const s = -margen + avance * recorrido;

    const lado = (sorteo(semilla, i * 19 + 2) - 0.5) * ANCHO_DEL_CORREDOR;
    salida.push({
      id: `ruta-${i}`,
      silueta: cual.silueta,
      x: desde.x + ux * s + px * lado,
      z: desde.z + uz * s + pz * lado,
      y: pies * PIE,
      rumbo,
      pies,
    });
  }
  return salida;
}
