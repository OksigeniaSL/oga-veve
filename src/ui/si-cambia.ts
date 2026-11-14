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

/**
 * El texto de una pieza, solo si cambia, **y en el mismo nodo de texto**.
 *
 * `textContent =` no cambia el texto: quita el nodo y pone otro. Para el
 * navegador eso es un hijo que entra en el árbol, y un hijo que entra debajo
 * de `.hud` o de `body` le obliga a repreguntar todos sus `:has()`, que en
 * Chrome arrastra a cada pieza que nombre cualquier regla con `:has()` (#189).
 * Con el JAZ 60 y el cuadro abierto en el teléfono eran cien piezas
 * restiladas por imagen —veinte de ellas SVG— por la distancia de la flecha
 * de casa, que cambia en cada una. Cambiando el dato del nodo que ya está, el
 * árbol no cambia y nada de eso se repregunta: cinco piezas, y de 2,1 a 0,2 ms
 * de estilo por imagen (CPU del hilo, sin apretar).
 *
 * Vaciar sí quita el nodo, como siempre: es lo que hace que `:empty` valga
 * igual en un navegador viejo, y vaciar no pasa en cada imagen.
 */
export function escribir(el: Element | null | undefined, valor: string): void {
  if (!el) return;
  const nodo = el.firstChild;
  // Tres es `Node.TEXT_NODE`, que fuera del navegador (en las pruebas) no existe.
  if (valor !== "" && nodo && nodo === el.lastChild && nodo.nodeType === 3) {
    const texto = nodo as Text;
    if (texto.data !== valor) texto.data = valor;
  } else if (el.textContent !== valor) el.textContent = valor;
}

/**
 * Esconder o enseñar una pieza, solo si cambia.
 *
 * `hidden = true` sobre lo que ya está escondido vuelve a poner el atributo,
 * y el navegador da la pieza por cambiada y la vuelve a estilar: el trim, la
 * reversa, los frenos, los mandos de pulgar, el tutor, la torre y el trayecto
 * lo hacían en cada imagen sin que cambiara nada.
 */
export function esconder(el: HTMLElement | null | undefined, oculto: boolean): void {
  if (el && el.hidden !== oculto) el.hidden = oculto;
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
