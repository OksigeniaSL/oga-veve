/**
 * **Cuándo se juega en un teléfono apaisado**, dicho en un solo sitio.
 *
 * El teléfono en horizontal es la pantalla principal de este juego, no la
 * tablet: en Paraguay hay más teléfonos que dientes, y lo que llega a un niño
 * es el móvil de su madre. Se diseñó todo para la tablet del aula y el
 * teléfono heredó el mismo reparto dibujado al sesenta por ciento: la barra de
 * botones en dos pisos, la tarjeta de la orden tapando el avión y un cuadro
 * de mandos de doscientos píxeles que no se leía.
 *
 * La consulta vive aquí para el código y **repetida tal cual** en la hoja de
 * estilos, que no puede importarla: `telefono.test.ts` comprueba que las dos
 * sigan diciendo lo mismo.
 *
 * - `pointer: coarse`: se juega con el dedo. Un portátil con la ventana baja
 *   no es un teléfono, y ahí no hay pulgares a los que dejar sitio.
 * - `max-height: 500px`: el teléfono más alto que hay apaisado anda por 480;
 *   la tablet más baja del aula, por 600. En medio no hay nada.
 */
export const TELEFONO_APAISADO =
  "(pointer: coarse) and (orientation: landscape) and (max-height: 500px)";

/**
 * Y el mismo aparato **en cualquier postura**: un teléfono que arranca de pie
 * sigue siendo un teléfono, y lo que se decide al arrancar —el cuadro
 * recogido— tiene que valer también cuando se gira después.
 */
export const TELEFONO =
  "(pointer: coarse) and (max-height: 500px), (pointer: coarse) and (max-width: 500px)";

function cumple(consulta: string): boolean {
  return typeof matchMedia === "function" && matchMedia(consulta).matches;
}

export const esTelefonoApaisado = (): boolean => cumple(TELEFONO_APAISADO);
export const esTelefono = (): boolean => cumple(TELEFONO);

/**
 * La misma pregunta para hacerla en cada fotograma: la consulta se crea una
 * vez y el navegador la mantiene al día al girar la pantalla, así que leerla
 * es leer una propiedad y no volver a evaluar CSS.
 */
let consulta: MediaQueryList | null = null;
export function ahoraEsTelefonoApaisado(): boolean {
  if (typeof matchMedia !== "function") return false;
  consulta ??= matchMedia(TELEFONO_APAISADO);
  return consulta.matches;
}
