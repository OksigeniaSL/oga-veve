/**
 * **Elegir sin repetir lo de la última vez**: la regla de todo lo que la
 * megafonía dice de más de una manera.
 *
 * El servicio a bordo ya lo hacía con el producto —ver `elegirProducto` en
 * `servicio-a-bordo.ts`— y la comandante lo necesita igual para la
 * bienvenida, la curiosidad del crucero o el saludo a los chicos: lo que se
 * oye dos vuelos seguidos con las mismas palabras delata la grabación, y a la
 * tercera vez deja de oírse. Lo último se recuerda en el navegador, por
 * piloto y sin ningún dato de nadie —ver `datos/guardado.ts`—, y aquí solo se
 * elige.
 *
 * Sin three.js ni audio, para poder comprobarlo sin navegador.
 */

/**
 * Una de las opciones **menos la de la última vez**.
 *
 * `ultima` es lo que se dijo la vez anterior, o `null` si es la primera; si ya
 * no está entre las opciones —una forma que ahora no cabe, una frase que se
 * retiró—, no quita nada. Con una sola opción se dice esa, aunque repita: mejor
 * repetir que callar lo que toca decir. Sin opciones, `null`.
 */
export function elegirSinRepetir<T>(
  opciones: readonly T[],
  ultima: T | null,
  azar: () => number = Math.random,
): T | null {
  if (opciones.length === 0) return null;
  const otras = opciones.filter((o) => o !== ultima);
  const hay = otras.length > 0 ? otras : opciones;
  const i = Math.min(hay.length - 1, Math.max(0, Math.floor(azar() * hay.length)));
  return hay[i] ?? null;
}
