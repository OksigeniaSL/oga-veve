/**
 * **El capítulo del viaje largo que se pide al recargar**, de una vez y por la pestaña.
 *
 * Al acabar el primer capítulo, su tarjeta lleva al segundo, y entrar en un capítulo es
 * recargar la página en su mundo. La dirección no sirve para decirlo fuera de
 * desarrollo —`?capitulo=` es de los bancos, y un enlace no puede abrir un capítulo que
 * no se ha jugado—, así que se deja el recado en la pestaña, como el cambio de avión
 * (`cambio-de-avion.ts`), y `main.ts` lo lee una vez al arrancar y lo borra.
 *
 * Es también por donde irá el viaje seguido, los tres enganchados: ver el ADR 0023.
 */

/** La clave de la pestaña. */
const CLAVE = "oga-capitulo-pedido";

/** Los capítulos que se pueden pedir así: los que no son el de siempre de `?inicio=4`. */
export type CapituloPedido = 1 | 2;

/** Deja el recado. Devuelve si se pudo, que sin almacenamiento no se puede. */
export function pedirElCapitulo(almacen: Pick<Storage, "setItem"> | null, capitulo: CapituloPedido): boolean {
  try {
    almacen?.setItem(CLAVE, String(capitulo));
    return !!almacen;
  } catch {
    return false;
  }
}

/** Lee el recado, si lo hay, y lo borra: vale para una carga y nada más. */
export function leerElCapituloPedido(almacen: Pick<Storage, "getItem" | "removeItem"> | null): CapituloPedido | null {
  try {
    const crudo = almacen?.getItem(CLAVE) ?? null;
    if (crudo === null) return null;
    almacen?.removeItem(CLAVE);
    return crudo === "1" ? 1 : crudo === "2" ? 2 : null;
  } catch {
    return null;
  }
}
