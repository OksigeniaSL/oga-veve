/**
 * Los ajustes: lo poco que se puede cambiar, y por qué es poco.
 *
 * Un panel de ajustes largo es una forma elegante de no decidir. Aquí hay
 * cuatro cosas, y las cuatro están porque **sin ellas alguien no puede jugar**,
 * no porque estuviera bien tenerlas:
 *
 * - **El movimiento**, para quien se marea. La preferencia del sistema ya se
 *   respetaba, pero un aula tiene una tablet y veinte niños: la que se marea
 *   no puede cambiar el ajuste del sistema de la tablet de todos.
 * - **El cabeceo**, porque quien ha volado con un mando o con un simulador lo
 *   tiene al revés en la cabeza, y es de las cosas que no se aprenden: se
 *   tienen. Media hora de frustración contra una casilla.
 * - **Las unidades**, para el adulto que vuela con nudos y pies. El peldaño
 *   sigue mandando de fábrica —esa decisión es pedagógica— y esto es una
 *   excepción consciente, no una preferencia.
 * - **El tamaño**, que en una tablet pequeña es la diferencia entre una barra
 *   de botones en una fila o en tres. Ver #150.
 *
 * Lo que no está y se pidió: el alto contraste. Toca la paleta entera y tiene
 * su propio banco de medida —`npm run acceso`—, así que se hace con eso
 * delante y no de camino.
 *
 * ## Todo pasa por el guardado con versión
 *
 * No hay claves sueltas: un ajuste es un ajuste del perfil, y va donde va todo
 * lo demás. Ver `datos/guardado.ts`.
 */

import { leerTexto, ponerTexto } from "../datos/guardado";

export const MOVIMIENTOS = ["sistema", "normal", "reducido"] as const;
export const CABECEOS = ["normal", "invertido"] as const;
export const UNIDADES = ["peldano", "metrico", "aeronautico"] as const;
export const TAMANOS = ["pequeno", "normal", "grande"] as const;

export type Movimiento = (typeof MOVIMIENTOS)[number];
export type Cabeceo = (typeof CABECEOS)[number];
export type Unidades = (typeof UNIDADES)[number];
export type Tamano = (typeof TAMANOS)[number];

export interface Ajustes {
  readonly movimiento: Movimiento;
  readonly cabeceo: Cabeceo;
  readonly unidades: Unidades;
  readonly tamano: Tamano;
}

/**
 * Los de fábrica, y los tres primeros dicen «lo que ya decidió otro».
 *
 * `sistema` respeta la preferencia del aparato, `peldano` deja mandar a la
 * decisión pedagógica. Un ajuste de fábrica que ya tiene opinión propia es un
 * ajuste que alguien va a tener que deshacer.
 */
export const POR_DEFECTO: Ajustes = {
  movimiento: "sistema",
  cabeceo: "normal",
  unidades: "peldano",
  tamano: "normal",
};

/** Cuánto se escala el HUD con cada tamaño. */
export const ESCALA: Record<Tamano, number> = {
  pequeno: 0.82,
  normal: 1,
  grande: 1.18,
};

const CLAVES = {
  movimiento: "ajuste.movimiento",
  cabeceo: "ajuste.cabeceo",
  unidades: "ajuste.unidades",
  tamano: "ajuste.tamano",
} as const;

/** Uno de la lista, o el de fábrica. Lo guardado puede ser cualquier cosa. */
function unoDe<T extends string>(
  valores: readonly T[],
  guardado: string | null,
  defecto: T,
): T {
  return valores.includes(guardado as T) ? (guardado as T) : defecto;
}

export function leerAjustes(): Ajustes {
  return {
    movimiento: unoDe(
      MOVIMIENTOS,
      leerTexto(CLAVES.movimiento),
      POR_DEFECTO.movimiento,
    ),
    cabeceo: unoDe(CABECEOS, leerTexto(CLAVES.cabeceo), POR_DEFECTO.cabeceo),
    unidades: unoDe(UNIDADES, leerTexto(CLAVES.unidades), POR_DEFECTO.unidades),
    tamano: unoDe(TAMANOS, leerTexto(CLAVES.tamano), POR_DEFECTO.tamano),
  };
}

export function guardarAjuste<K extends keyof Ajustes>(
  cual: K,
  valor: Ajustes[K],
): void {
  ponerTexto(CLAVES[cual], valor);
}

/**
 * ¿Hay que reducir el movimiento?
 *
 * `sistema` pregunta al aparato, que es lo que se hacía antes de que esto
 * existiera; los otros dos mandan sobre él. Un ajuste que solo pudiera
 * *añadir* movimiento reducido pero no quitarlo sería la mitad de un ajuste.
 */
export function conMovimientoReducido(
  a: Ajustes,
  loPideElSistema: boolean,
): boolean {
  if (a.movimiento === "reducido") return true;
  if (a.movimiento === "normal") return false;
  return loPideElSistema;
}

/** El signo del cabeceo: −1 si está invertido. */
export const signoDeCabeceo = (a: Ajustes): number =>
  a.cabeceo === "invertido" ? -1 : 1;

/**
 * Qué sistema de unidades toca, o `null` si manda el peldaño.
 *
 * De fábrica manda el peldaño, y eso es deliberado: en el tramo de arriba se
 * vuela con nudos y pies porque **es parte de lo que se enseña**, no porque
 * queden bien. Esto es la excepción para el adulto que ya los tiene en la
 * cabeza, no la regla.
 */
export function unidadesElegidas(a: Ajustes): "metric" | "aeronautical" | null {
  if (a.unidades === "metrico") return "metric";
  if (a.unidades === "aeronautico") return "aeronautical";
  return null;
}
