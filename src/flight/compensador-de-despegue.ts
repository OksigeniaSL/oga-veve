/**
 * **El compensador del despegue: en su marca antes de correr.**
 *
 * Lo midió el banco del despegue (H20a): el compensador salía en cero, que en
 * el modelo de coeficientes es el timón de equilibrio de una velocidad muy por
 * encima de la de despegar. Soltando los mandos recién despegado, el JAZ 20
 * bajaba el morro a buscarla y volvía a la pista en cuatro segundos, en
 * Taguato y en Tukã; con el compensador en dos décimas y la primera muesca de
 * flaps subía a casi tres metros por segundo. No era el avión: era la lista.
 *
 * Lo real: el compensador se pone para despegar en la lista de antes de
 * despegar —«Elevator Trim — SET for takeoff» en la del 172S, «Trim … set» en
 * la del Seneca III, el *stabilizer trim* de su tarjeta en un avión de línea—,
 * en la marca de despegue de su indicador. Ver el ADR 0027, enmienda H21a.
 *
 * **La marca sale del modelo, no de un número escrito a mano.** En un avión de
 * verdad depende sobre todo del centro de gravedad: con el morro pesado hace
 * falta más morro arriba, y por eso el de un reactor se calcula para cada
 * despegue y el indicador lleva una franja, no una raya. Este modelo no tiene
 * centro de gravedad —el par de cabeceo es `cm0 + cmα·α + cmδ·δ`, igual con
 * cualquier carga—, así que la marca es el timón que sostiene el avión, con
 * sus flaps de despegue y el peso de hoy, a la velocidad de la subida
 * inicial (`timonQueSostiene` en `fdm.ts`). Con esa velocidad atada a la
 * pérdida el peso se va de la cuenta: el ala vuela al mismo ángulo pese lo que
 * pese. Si el modelo gana un día su centro de gravedad, la marca lo seguirá
 * sola.
 *
 * Funciones puras: no hablan ni dibujan. La lista que lo pide es
 * `ListaDeAntesDeDespegar`, en `flaps-de-despegue.ts`.
 */

import type { AircraftConfig } from "./aircraft";
import { timonQueSostiene } from "./fdm";
import { flapsDeDespegue } from "./flaps";
import { perdidaCon } from "./velocidades-de-despegue";

/**
 * **La velocidad de la subida inicial, en veces la pérdida con los flaps de
 * despegue**: 1,3, y nunca menos que la Vr.
 *
 * Es la de la subida inicial con todos los motores: «If the airplane has been
 * properly trimmed for takeoff, some back-elevator pressure may be required to
 * hold this attitude until the proper climb speed is established»
 * (FAA-H-8083-3C, 2021, p. 6-5). La marca no es la de despegar, es la de
 * subir. En los tres reactores cae entre la V2 más trece y la V2 más veinte
 * nudos, por encima de la V2 que se vuela con uno parado; en la avioneta,
 * sesenta y un nudos, junto a su Vx de 62 (172S *Information Manual*, p. 4-5).
 * Medido con el banco de mesa (ADR 0027, enmienda H21a): de 1,2 a 1,3 ninguno
 * baja soltando los mandos después de rotar, en los tres peldaños; con 1,35 el
 * Seneca, en el peldaño sin ayudas, ya baja antes de subir.
 */
export const SUBE_SOBRE_LA_PERDIDA = 1.3;

/**
 * **La franja de despegue**, en las mismas veces: lo que sostiene entre 1,2 y
 * 1,4 veces la pérdida. Es la franja verde del indicador de un reactor, que
 * cubre los centros de gravedad con los que se puede despegar; aquí, el margen
 * alrededor de la marca que se acierta a mano con las teclas, y lo que da por
 * puesto la lista. Ancha a propósito, para que se vea en el indicador; y por
 * eso la tarjeta y la instructora la ponen en la marca y no en el borde: en el
 * de morro abajo, soltando los mandos recién despegado, el 747 vuelve a tocar
 * en el peldaño sin ayudas y el Seneca baja a metro y medio de la pista.
 */
export const FRANJA_SOBRE_LA_PERDIDA = { lenta: 1.2, rapida: 1.4 } as const;

/** **Dónde va el compensador para despegar**: la marca y su franja, de −1 a 1. */
export interface CompensadorDeDespegue {
  /** Donde lo pone la tarjeta al tocarla, o la instructora. */
  readonly marca: number;
  /** El lado de morro abajo de la franja: la de 1,4 veces la pérdida. */
  readonly desde: number;
  /** El de morro arriba: la de 1,2. */
  readonly hasta: number;
}

/**
 * **La marca de despegue de este avión, con su franja.** `a` con el peso de
 * hoy (`avionConPeso` en `game.ts`): la pérdida, y con ella la marca, salen
 * de él.
 */
export function compensadorDeDespegue(a: AircraftConfig): CompensadorDeDespegue {
  const flaps = a.llevaFlaps ? flapsDeDespegue(a) : 0;
  const perdida = perdidaCon(a, flaps);
  const timon = (veces: number): number =>
    timonQueSostiene(a, Math.max(a.rotationSpeed, perdida * veces), flaps);
  const lento = timon(FRANJA_SOBRE_LA_PERDIDA.lenta);
  const rapido = timon(FRANJA_SOBRE_LA_PERDIDA.rapida);
  const desde = Math.min(lento, rapido);
  const hasta = Math.max(lento, rapido);
  const marca = Math.min(hasta, Math.max(desde, timon(SUBE_SOBRE_LA_PERDIDA)));
  return { marca, desde, hasta };
}

/**
 * **Si el compensador está en la franja de despegue**, con el polvo de la coma
 * flotante: es lo que mira la lista, y lo que miraría el aviso de
 * configuración del avión que lo lleva.
 */
export function enLaFranja(c: CompensadorDeDespegue, trim: number): boolean {
  return trim >= c.desde - 0.005 && trim <= c.hasta + 0.005;
}

/**
 * **El rótulo de la lista en el peldaño de cabina**: «TRIM — SET», la línea
 * tal cual la dicen las listas: «Trim … set» en la del Seneca III (VB-1110,
 * p. 4-9), «Trim-SET» en la del Ag Cat (Grumman, 1977, p. 33), «Elevator Trim
 * — SET for takeoff» en la del 172S. Sin cifra, como ellas: la cifra de un
 * reactor es la de su hoja de carga de ese día, y este juego no la tiene. No
 * se traduce: es el de la cabina (regla 3 de `AGENTS.md`).
 */
export const ROTULO_DE_CABINA = "TRIM — SET";
