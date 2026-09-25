/**
 * El otro aeropuerto: un escenario entero puesto a su distancia.
 *
 * Para poder aterrizar en otro sitio no basta con dibujarlo. Hace falta suelo
 * que se pise —el modelo de vuelo pregunta la cota doscientas cuarenta veces
 * por segundo—, la pista con sus marcas y su número, las calles de rodaje, la
 * plataforma y los edificios. O sea: hace falta **todo lo que ya tiene un
 * escenario**.
 *
 * Y ahí está el hallazgo de este módulo, que es por qué es corto: **Tenerife
 * Sur ya es un escenario**. Tiene su mapa de alturas medido, su aeródromo
 * extraído con los umbrales a su cota, su ortofoto y su viento. No hay que
 * generar ni un dato nuevo ni escribir ni una regla nueva de construcción de
 * mundo: hay que **instanciarlo otra vez y desplazarlo** hasta donde cae visto
 * desde el de salida.
 *
 * ## Lo que no trae
 *
 * El horizonte. El anillo del mapa lejano se dibuja una vez, el del escenario
 * en el que se está volando, y abarca ciento veintiséis kilómetros: el vecino
 * cae dentro de él. Dos anillos serían dos horizontes solapados, y el de
 * detrás asomando por el de delante. Ver `sinHorizonte`.
 *
 * ## Y por qué el suelo se pregunta y no se copia
 *
 * El terreno de salida ya sabe preguntarle a otro qué hay fuera de su mapa
 * —ver `ponerSueloLejano`—, porque eso hacía falta desde que se puede volar
 * setenta kilómetros y ver la isla de enfrente. Aquí se usa ese mismo gancho,
 * encadenado: primero el vecino, que sabe de su isla con un metro de detalle, y
 * si la pregunta no cae en su mapa, lo que hubiera antes.
 */

import { Group, type Texture } from "three";
import { Terrain } from "./terrain";
import type { Scenario } from "./scenarios";
import { dondeCae } from "./entre-aerodromos";

/** Lo que devuelve la proyección de una ortofoto para un punto del mundo. */
interface Punto2 {
  u: number;
  v: number;
}

/**
 * El mismo escenario, sin el relieve del horizonte.
 *
 * Se exporta porque la razón de quitarlo no es obvia y hay que poder
 * comprobarla: un segundo anillo de ciento veintiséis kilómetros centrado a
 * cincuenta y cuatro del primero es un horizonte de más.
 */
export function sinHorizonte(escenario: Scenario): Scenario {
  const { relieveLejano: _fuera, ...resto } = escenario;
  return resto;
}

export class MundoVecino {
  /** El terreno del vecino, con su aeródromo y su agua dentro. */
  readonly terreno: Terrain;

  /** Y su sitio en el mundo de salida, para colgarlo de la escena. */
  readonly grupo = new Group();

  /** Dónde cae su centro, en coordenadas del mundo de salida. */
  readonly desplazamiento: { readonly x: number; readonly z: number };

  /** Hasta dónde llega su mapa fino, medido desde su centro. */
  private readonly medioLado: number;

  constructor(
    salida: Scenario,
    vecino: Scenario,
    /**
     * Su fotografía, si la tiene.
     *
     * **Sin ella el vecino sale de polígonos**, y eso se ve a la primera: se
     * cruza el canal con la isla de enfrente hecha de ladera lisa mientras la
     * de casa lleva la foto puesta. Contado jugando: «el paisaje era el de
     * fantasía, no el de las capas, no es realista».
     *
     * Es la misma del escenario cuando se juega solo en él: no hay fichero
     * nuevo que generar ni que bajar dos veces.
     */
    foto?: { textura: Texture; uv(x: number, z: number): Punto2 } | undefined,
  ) {
    const aquí = salida.aerodrome?.origin;
    const allí = vecino.aerodrome?.origin;
    if (!aquí || !allí)
      throw new Error(
        `${salida.id} → ${vecino.id}: los dos extremos necesitan aeródromo extraído`,
      );
    this.desplazamiento = dondeCae(aquí, allí);
    this.medioLado = vecino.size / 2;
    this.terreno = new Terrain(sinHorizonte(vecino));
    if (foto) this.terreno.ponerOrtofoto(foto);
    this.grupo.add(this.terreno.group);
    this.grupo.position.set(this.desplazamiento.x, 0, this.desplazamiento.z);
  }

  /**
   * Su fotografía, cuando llegue. Se pide **después** de arrancar: no hace
   * falta para despegar, y en un teléfono con 3G eran dos megas más de espera
   * antes de poder jugar. Ver la carga en `main.ts`.
   */
  ponerFoto(foto: { textura: Texture; uv(x: number, z: number): Punto2 }): void {
    this.terreno.ponerOrtofoto(foto);
  }

  /**
   * La cota del vecino en coordenadas del **mundo de salida**, o `null` si la
   * pregunta no cae en su mapa.
   *
   * Devolver `null` fuera es lo que permite encadenar: quien pregunta se queda
   * con la primera respuesta que no sea nula. Si esto devolviera el borde
   * repetido —que es lo que hace un mapa de alturas por su cuenta— el vecino
   * contestaría a todo el mundo y taparía al de salida.
   */
  cota(x: number, z: number): number | null {
    const dx = x - this.desplazamiento.x;
    const dz = z - this.desplazamiento.z;
    if (Math.abs(dx) > this.medioLado || Math.abs(dz) > this.medioLado)
      return null;
    return this.terreno.sampleHeight(dx, dz);
  }

  /** Si un punto del mundo de salida cae dentro de la isla del vecino. */
  dentro(x: number, z: number): boolean {
    return this.cota(x, z) !== null;
  }
}
