/**
 * **Escribir en el cuadro solo lo que cambia.**
 *
 * El cuadro de mandos es un SVG de setecientas piezas, y cada imagen se
 * escribía entero: cada aguja, cada cinta y cada cifra, dijeran o no algo
 * distinto de la imagen anterior. Escribir el mismo valor no es gratis — el
 * navegador da la pieza por cambiada, la vuelve a maquetar y a pintar—, y en
 * el cuadro abierto del teléfono, con la CPU de uno barato, eso eran varios
 * milisegundos por imagen en repetir lo que ya estaba puesto.
 *
 * Así que todo lo que el cuadro mueve pasa por aquí: se compara con lo que
 * hay y se escribe solo si es otra cosa. Y los números con una décima, que
 * es lo que hace que funcione: en crucero casi todo el cuadro dice lo mismo
 * que hace un momento, y así casi nada se repinta.
 */

/** Un atributo, solo si cambia. */
export function poner(
  el: Element | null | undefined,
  atributo: string,
  valor: string,
): void {
  if (el && el.getAttribute(atributo) !== valor)
    el.setAttribute(atributo, valor);
}

/** El texto de una pieza, solo si cambia. */
export function escribir(el: Element | null | undefined, valor: string): void {
  if (el && el.textContent !== valor) el.textContent = valor;
}

/**
 * Un número con una décima, para un atributo.
 *
 * En la caja de 1280 del cuadro una décima es menos de un píxel de teléfono,
 * y una décima de grado es una fracción de píxel en la punta de una aguja.
 * Redondeando ahí, lo que no se mueve de forma visible deja de escribirse:
 * una aguja casi quieta se repinta cada muchas imágenes y no en todas, y la
 * que se mueve lo sigue haciendo en cada una.
 */
export function decima(x: number): string {
  const r = Math.round(x * 10) / 10;
  // Sin el «-0», que no es igual a «0» como texto y se escribiría otra vez.
  return String(r === 0 ? 0 : r);
}
