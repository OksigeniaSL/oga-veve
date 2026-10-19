/**
 * **La canción del juego**: un trozo de «Luz verde», la canción de Granja Óga,
 * que suena cuando aterrizan todos los avioncitos del juego de la torre.
 *
 * Pedido por Enrique (19-10-2026): que la canción suene en el juego. Es la
 * del simulador, y su estribillo es el juego entero —«¡Luz verde! La pista es
 * tuya»—, así que suena donde se acaba de ganar: el puente y el primer
 * estribillo, medio minuto. Ver `scripts/hacer-musica.mjs`, que corta el
 * trozo, y `KitDeViaje.cancion` en `flight/kit-de-viaje.ts`, que decide cuándo.
 *
 * ## Cómo suena
 *
 * **Por encima del vuelo y por debajo de las voces**, en su bus: el de la
 * canción, entre la radio y el motor. Es la música del juego que se tiene en
 * las manos, no la del avión: no va por el altavoz del techo como el hilo
 * musical, que va dieciocho decibelios por debajo de todo porque acompaña;
 * esta se escucha. Y se agacha diez decibelios con cualquier voz o aviso,
 * como todo lo que no habla: nunca tapa a nadie, y menos un aviso de
 * seguridad. Ver `audio/mezcla.ts`.
 *
 * Esto es lo que hay y dónde está: lo toca `Audio.ponerCancion`.
 */

import TROZOS from "../assets/musica/trozos.json";
import { EXTENSIONES, type Formato } from "./banco-de-voz";

/** Las canciones que hay: una. */
export type Cancion = "luz-verde";

/** Lo que dura el trozo, s. */
export interface Trozo {
  readonly dura: number;
}

export function trozoDe(c: Cancion): Trozo {
  const t = (TROZOS as Record<string, Trozo | undefined>)[c];
  if (!t) throw new Error(`Sin trozo para ${c}`);
  return { dura: t.dura };
}

/**
 * **Los ficheros**, con su huella: entran por `import` y no van en la precarga
 * del trabajador de servicio, como el hilo musical. Ver `audio/hilo-musical.ts`.
 */
const FICHEROS = import.meta.glob("../assets/musica/luz-verde.{ogg,m4a}", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** El fichero de una canción en el formato de este navegador, o `null`. */
export function ficheroDeLaCancion(c: Cancion, formato: Formato): string | null {
  return FICHEROS[`../assets/musica/${c}.${EXTENSIONES[formato]}`] ?? null;
}

/**
 * **Lo que pide el juego en cada fotograma**: qué canción, de qué vez —cada
 * juego ganado es una, y una vez sonada no vuelve a sonar— y si tiene que
 * sonar ya o solo tenerla a mano, bajada antes de que haga falta.
 */
export interface PedidoDeCancion {
  readonly cual: Cancion;
  readonly vez: number;
  readonly suena: boolean;
}
