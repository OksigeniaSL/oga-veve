/**
 * **El modo pizarra**: lo que toca un niño, al tercio de abajo de la pantalla.
 *
 * El juego se usa también en las pizarras digitales del aula, y ahí el
 * problema no es de píxeles sino de brazos. Una pizarra mide unos 190 × 107 cm
 * y se cuelga con el borde de abajo a unos 90 cm del suelo; un niño de
 * Infantil, de pie, llega con la mano a 120 o 130 cm: al tercio de abajo y
 * poco más. La pausa, el ⏩, la cámara y los botones de la fila de arriba le
 * quedaban fuera de alcance, y para cambiar de vista tenía que venir el
 * profesor. Con esto encendido, eso baja; lo que es del adulto —el sonido de
 * la sala, la pantalla completa, los créditos, la puerta del hangar— se queda
 * arriba, que es donde llega él.
 *
 * ## Por qué es una opción y no se adivina
 *
 * Desde la hoja de estilos una pizarra no se distingue de una tablet
 * apaisada: las dos dan unos 1280 × 720 con el dedo, sin `hover`, y el tamaño
 * físico de la pantalla no lo dice ningún navegador. Adivinarlo habría
 * bajado los botones en la tablet que se tiene en las manos, donde arriba se
 * llega con el pulgar. Así que se elige: con `?pizarra=1` en la dirección
 * —el enlace que se deja puesto en el aula— o con su botón en los ajustes del
 * hangar, que es donde vive lo que se decide una vez.
 *
 * ## Se recuerda en el aparato, no en el perfil
 *
 * Como el volumen: es de la sala y no de quien juega. Guardado en el perfil,
 * cada niño que eligiera su piloto en la pizarra volvía a tener los botones
 * arriba. Una clave del aparato y nada más —encendido o apagado—, sin un solo
 * dato de nadie. Ver `audio/volumen.ts`.
 *
 * La hoja de estilos lo lee como una clase en la raíz (`:root.pizarra`), que
 * es lo que hacen el contraste y el movimiento: ningún componente se entera.
 */

/**
 * **El dibujo del botón**: la pizarra en la pared, sus botones en la franja de
 * abajo y un niño de pie que llega a ellos con la mano. Lo que se elige se
 * entiende sin leer: no es «una pantalla», es «la pantalla grande del aula,
 * con lo que se toca a la altura de un niño».
 */
export const PIZARRA = `
  <svg viewBox="0 0 34 28" aria-hidden="true">
    <rect x="9" y="1.5" width="23.5" height="18" rx="1.6" fill="none"
          stroke="currentColor" stroke-width="1.8" />
    <path d="M9 13.2 H32.5" stroke="currentColor" stroke-width="1"
          stroke-dasharray="1.6 1.6" opacity=".55" />
    <circle cx="17.5" cy="16.4" r="1.7" fill="currentColor" />
    <circle cx="22.5" cy="16.4" r="1.7" fill="currentColor" />
    <circle cx="27.5" cy="16.4" r="1.7" fill="currentColor" />
    <circle cx="4.6" cy="14.6" r="2.4" fill="currentColor" />
    <path d="M4.6 17.4 V23 M4.6 23 L2.6 27 M4.6 23 L6.6 27 M4.6 18.6 L12.6 16.4
             M4.6 18.6 L1.6 21.6"
          fill="none" stroke="currentColor" stroke-width="1.9"
          stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;

/** La clave del aparato. */
export const CLAVE_DEL_APARATO = "oga-veve:pizarra";

/** La clase de la raíz que mira la hoja. */
export const CLASE = "pizarra";

const almacen = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/**
 * Lo que pide la dirección: `true` con `?pizarra=1`, `false` con
 * `?pizarra=0` y `null` si no dice nada.
 *
 * Que el cero apague, y no solo que el uno encienda, es para el enlace del
 * aula: quien se lleva la dirección a la tablet de casa la puede corregir sin
 * buscar el botón.
 */
export function pizarraPedida(busqueda: string): boolean | null {
  const valor = new URLSearchParams(busqueda).get("pizarra");
  if (valor === null) return null;
  return !["0", "no", "false"].includes(valor.trim().toLowerCase());
}

/** Si este aparato tiene el modo puesto. Sin almacén, apagado. */
export function leerPizarra(): boolean {
  const s = almacen();
  if (!s) return false;
  try {
    return s.getItem(CLAVE_DEL_APARATO) === "1";
  } catch {
    return false;
  }
}

/** Guardarlo en el aparato. No poder recordarlo no rompe nada: vale para esta partida. */
export function guardarPizarra(puesta: boolean): void {
  const s = almacen();
  if (!s) return;
  try {
    s.setItem(CLAVE_DEL_APARATO, puesta ? "1" : "0");
  } catch {
    // Ventana privada o almacén lleno: se juega igual.
  }
}

/** Si está puesto ahora, mirando la raíz, que es lo que mira la hoja. */
export function hayPizarra(raiz: Element = document.documentElement): boolean {
  return raiz.classList.contains(CLASE);
}

/** Ponerlo o quitarlo: en la raíz, que lo aplica al momento, y en el aparato. */
export function ponerPizarra(
  puesta: boolean,
  raiz: Element = document.documentElement,
): void {
  raiz.classList.toggle(CLASE, puesta);
  guardarPizarra(puesta);
}

/**
 * Al arrancar, antes de pintar nada: lo que diga la dirección, y si no dice
 * nada, lo que recuerde el aparato. Lo pedido en la dirección se guarda, para
 * que el siguiente vuelo, que ya no lleva el parámetro, siga igual.
 */
export function arrancarPizarra(
  busqueda: string = globalThis.location?.search ?? "",
  raiz: Element = document.documentElement,
): boolean {
  const pedida = pizarraPedida(busqueda);
  if (pedida !== null) guardarPizarra(pedida);
  const puesta = pedida ?? leerPizarra();
  raiz.classList.toggle(CLASE, puesta);
  return puesta;
}
