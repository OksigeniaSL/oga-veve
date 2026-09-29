/**
 * **Otro nivel por los baches**: lo que hace una comandante cuando el aire se
 * mueve en crucero.
 *
 * Primero no se asusta a nadie —el cartel, el *ding* y su anuncio: ver
 * `hablarDeLosBaches` en `game.ts`—. Y si los baches siguen, se pregunta al
 * control por otro nivel, que es lo que se hace de verdad: en crucero casi
 * todo lo que sacude a un avión de pasaje es una capa —el borde de una nube,
 * la térmica de la tarde en los niveles bajos— y dos mil pies más arriba el
 * aire suele ir quieto. **Siempre con permiso del control**: la comandante no
 * cambia de nivel sola, lo pide, y el nivel lo da quien tiene a todos los
 * demás en su pantalla.
 *
 * Y a veces no hay dónde: dentro de una tormenta sacude a todas las alturas.
 * Entonces se dice eso, que también es verdad y también tranquiliza —es
 * normal, cinturón puesto—.
 *
 * Aquí solo está la cuenta: qué nivel probar. Lo que sacude a cada altura lo
 * sabe `turbulencia.ts`, y se le pregunta con la misma cuenta que mueve el
 * avión, así que lo que se promete es lo que se siente.
 */

import { YA_NO_SACUDE } from "./cinturon";

/**
 * Cuánto tiene que durar el movimiento en crucero antes de pedir otro nivel,
 * s: cuarenta y cinco segundos.
 *
 * No es un reloj que rearme nada: es cuánto se espera a ver si pasa, que es lo
 * que hace una tripulación antes de llamar. Un bache suelto no se pide.
 */
export const ESPERA_CON_BACHES = 45;

/**
 * Los niveles que se prueban, en pies por encima del de ahora: el siguiente de
 * su sentido y el otro. Con la regla semicircular, en el mismo sentido se sube
 * de dos mil en dos mil. Ver `nivel-de-crucero.ts`.
 *
 * Solo hacia arriba: lo que sacude en este juego —el roce del suelo, la
 * térmica, el borde de la nube— se queda abajo o en su capa, y bajar además
 * acerca al relieve. Arriba es donde el aire va más quieto.
 */
export const PRUEBA = [2000, 4000] as const;

/**
 * **El nivel más tranquilo al que subir**, pies, o `null` si ninguno lo es.
 *
 * `sacudeA` dice cuánto se mueve el aire a esa altura —la σ de
 * `cuantoSeMueve`—. Vale el primero que quede por debajo de lo que apaga el
 * cartel del cinturón, sin pasar del techo del avión.
 */
export function nivelMasTranquilo(o: {
  readonly nivel: number;
  readonly techo: number;
  readonly sacudeA: (pies: number) => number;
}): number | null {
  for (const mas of PRUEBA) {
    const pies = o.nivel + mas;
    if (pies > o.techo) break;
    if (o.sacudeA(pies) < YA_NO_SACUDE) return pies;
  }
  return null;
}
