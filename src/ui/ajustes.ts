/**
 * Los ajustes: lo poco que se puede cambiar, y por qué es poco.
 *
 * Un panel de ajustes largo es una forma elegante de no decidir. Aquí hay
 * seis cosas, y las seis están porque **sin ellas alguien no puede jugar**,
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
 * - **El sonido**, que estaba pero **solo en el HUD**: un glifo en una esquina
 *   que hay que descubrir pulsándolo. Quien busca el volumen lo busca en los
 *   ajustes, y ahí no estaba. Es el mismo estado, no otro — ver `audio.ts`.
 * - **El contraste**, que es el que faltaba de #36.
 *
 * ## Por qué el sonido son tres pasos y no un deslizador
 *
 * Porque ya se decidió, y está escrito en `audio.ts`: un deslizador exige
 * precisión con el dedo y no dice de un vistazo dónde está. Tres estados
 * —normal, bajo, mudo— se recorren pulsando y se leen en el icono. El aula
 * necesita el paso «bajo» tanto como el mudo: veinte tablets a medio volumen
 * son un aula; a volumen normal, un aviario. Traer un deslizador aquí sería
 * deshacer esa decisión en la pantalla de al lado.
 *
 * **Y de la música no hay deslizador porque no hay música.** El bus existe en
 * la mezcla y no suena nada por él. Un mando que no manda sobre nada es peor
 * que no tenerlo: enseña que el ajuste está roto. Cuando haya música, la fila.
 *
 * ## Todo pasa por el guardado con versión
 *
 * No hay claves sueltas: un ajuste es un ajuste del perfil, y va donde va todo
 * lo demás. Ver `datos/guardado.ts`.
 */

import { leerTexto, ponerTexto } from "../datos/guardado";

export const MOVIMIENTOS = ["sistema", "normal", "reducido"] as const;
export const VOLUMENES = ["normal", "bajo", "mudo"] as const;
export const CONTRASTES = ["normal", "alto"] as const;
export const CABECEOS = ["normal", "invertido"] as const;
export const UNIDADES = ["peldano", "metrico", "aeronautico"] as const;
export const TAMANOS = ["pequeno", "normal", "grande"] as const;

export type Movimiento = (typeof MOVIMIENTOS)[number];
export type Volumen = (typeof VOLUMENES)[number];
export type Contraste = (typeof CONTRASTES)[number];
export type Cabeceo = (typeof CABECEOS)[number];
export type Unidades = (typeof UNIDADES)[number];
export type Tamano = (typeof TAMANOS)[number];

export interface Ajustes {
  readonly movimiento: Movimiento;
  readonly cabeceo: Cabeceo;
  readonly unidades: Unidades;
  readonly tamano: Tamano;
  readonly volumen: Volumen;
  readonly contraste: Contraste;
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
  volumen: "normal",
  contraste: "normal",
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
  /*
   * **Y el volumen se guarda donde ya se guardaba.**
   *
   * `volumen`, a secas, sin el prefijo de los demás: es la clave que lleva
   * usando `audio.ts` desde que existe el botón del HUD. Cambiarla por
   * coherencia de nombres le habría borrado el ajuste a todo el que ya tenía
   * el juego puesto en «bajo» — que es justo la gente a la que le importa.
   */
  volumen: "volumen",
  contraste: "ajuste.contraste",
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
    volumen: unoDe(VOLUMENES, leerTexto(CLAVES.volumen), POR_DEFECTO.volumen),
    contraste: unoDe(
      CONTRASTES,
      leerTexto(CLAVES.contraste),
      POR_DEFECTO.contraste,
    ),
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
