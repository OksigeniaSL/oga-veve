/**
 * **El cuaderno de viaje**: los sellos de lo que se vio por la ventanilla en
 * el vuelo de pasaje, guardados de un vuelo al siguiente.
 *
 * Decisión de Enrique del 19-10-2026, con la ventanilla viva: **un sello por
 * cada cosa vista**, tocada en la ventanilla o nombrada por la escena cuando
 * se veía. Cuáles son y cómo se ve cada uno lo dicen `flight/lo-que-se-toca.ts`
 * y `VueloDePasaje.estado.vistos`; esto los guarda.
 *
 * Se enseñan al llegar, en el puesto con los motores parados: la página con
 * los ganados y **los huecos de los que faltan**, para que apetezca repetir.
 * Es una colección, como el álbum de los sellos con nombre —ver `ui/album.ts`,
 * que explica por qué ahí sí hay huecos y en los sellos de campo no—, así que
 * lo ganado se queda para siempre y nada de aquí sabe quitarlo.
 *
 * Se guarda en el progreso del perfil, como el resto del cuaderno, y es solo
 * **qué sellos se ganaron**: ni cuándo, ni cuántas veces, ni nada de nadie.
 * La regla 7.
 */

import { leerProgreso, ponerProgreso } from "../datos/guardado";
import { esSelloDelViaje, SELLOS_DEL_VIAJE, type SelloDelViaje } from "./lo-que-se-toca";

export { SELLOS_DEL_VIAJE, type SelloDelViaje };

const GANADOS = "viaje.sellos";

/**
 * Los sellos del cuaderno de viaje ganados, en el orden de la página. Aguanta
 * lo que sea, como el resto del cuaderno: lo que no se reconoce no sale.
 */
export function leerSellosDelViaje(): readonly SelloDelViaje[] {
  const d = leerProgreso(GANADOS);
  const ganados = new Set(Array.isArray(d) ? d.filter(esSelloDelViaje) : []);
  return SELLOS_DEL_VIAJE.filter((s) => ganados.has(s));
}

/**
 * **Apuntar lo visto en un vuelo.** Devuelve los que son nuevos: los que se
 * estampan al enseñar la página. Lo de antes se queda como estaba.
 */
export function ganarSellosDelViaje(vistos: readonly SelloDelViaje[]): readonly SelloDelViaje[] {
  const ya = leerSellosDelViaje();
  const nuevos = SELLOS_DEL_VIAJE.filter((s) => vistos.includes(s) && !ya.includes(s));
  if (nuevos.length) ponerProgreso(GANADOS, SELLOS_DEL_VIAJE.filter((s) => ya.includes(s) || nuevos.includes(s)));
  return nuevos;
}
