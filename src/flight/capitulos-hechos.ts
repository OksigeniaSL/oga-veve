/**
 * **Los capítulos del viaje largo que ya se han acabado**, para seguir otro día (ADR 0023,
 * decisión 6: «tres capítulos que se guardan»).
 *
 * Se guarda por perfil, como el cuaderno, y solo esto: qué capítulos se llevaron hasta su
 * final. Ni cuándo, ni cuánto se tardó, ni nada de quien juega (regla 7). Lo lee el hangar
 * para poner la marca de hecho en la ficha de cada uno; no abre nada por su cuenta ni hay
 * un «continuar»: se sigue eligiendo la ficha que se quiera.
 *
 * Sin almacenamiento —navegación privada, un navegador que lo bloquea— no se recuerda y
 * se juega igual: todo va envuelto, y leer devuelve que no hay nada hecho.
 */

import { escribirYa, leerProgreso, ponerProgreso } from "../datos/guardado";

/** Los tres capítulos: Madrid, la noche sobre el mar y la llegada. */
export type CapituloDelLargo = 1 | 2 | 3;

/** El trozo del progreso del perfil. */
const LLAVE = "capitulosDelLargo";

const esCapitulo = (v: unknown): v is CapituloDelLargo => v === 1 || v === 2 || v === 3;

/** Los capítulos acabados por el perfil de ahora. */
export function capitulosHechos(): ReadonlySet<CapituloDelLargo> {
  try {
    const d = leerProgreso(LLAVE);
    return new Set(Array.isArray(d) ? d.filter(esCapitulo) : []);
  } catch {
    return new Set();
  }
}

/**
 * Apunta uno como acabado. Se escribe en el acto y no con el freno de siempre: el final
 * del primero recarga la página enseguida, y el del segundo puede recargarla también.
 */
export function apuntarCapituloHecho(c: CapituloDelLargo): void {
  try {
    const ya = capitulosHechos();
    if (ya.has(c)) return;
    ponerProgreso(LLAVE, [...ya, c].sort());
    escribirYa();
  } catch {
    // Sin dónde guardarlo se ha jugado igual.
  }
}
