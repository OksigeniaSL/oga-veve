/**
 * La escalera de comunicación: del aro que brilla a la voz de cabina.
 *
 * La escalera de tramos dice cuánta física se le confía al jugador. Esta dice
 * **cómo se le cuenta lo que pasa**, y sube igual de peldaño en peldaño:
 *
 * - **Guyrami (4-6): solo el dibujo.** Ni una palabra escrita. El aro que toca
 *   brilla, cruzarlo suelta partículas y una nota que sube, el suelo avisa con
 *   color. Forma, color, movimiento y sonido — que es todo lo que hay cuando
 *   todavía no se lee.
 * - **Tukã (7-9): el dibujo y una palabra.** «¡Bien!», «Bajá», «Más motor».
 *   **Una sola palabra corta**, nunca una frase: a los siete años se lee una
 *   palabra de un vistazo y una frase no se lee en absoluto mientras se vuela.
 * - **Taguato (10-13): entran los números.** La frase entera, la altura sobre
 *   la pista en grande al cruzar 150, 100 y 50 metros, y la desviación de la
 *   senda como cifra. Se empieza a leer un instrumento en vez de un dibujo.
 * - **Taguato Ruvicha (14+): la voz de cabina.** Los cantos de verdad, en
 *   inglés aeronáutico: *five hundred, one hundred, fifty…* y *V1, rotate*.
 *
 * ## Dos reglas que no se rompen
 *
 * **El dibujo está en los cuatro peldaños.** No es el canal de los pequeños
 * que se retira al crecer: es el canal que siempre está, y los de arriba se
 * suman a él. Media aula juega en silencio y hay quien no oye.
 *
 * **La voz del instructor no es parte de esta escalera.** Sube en el peldaño
 * de abajo, no baja: quien no lee necesita que alguien le diga las cosas, y
 * por eso Guyrami —que no tiene ni una palabra escrita— sí tiene voz. Lo que
 * esta escalera reparte es **lo que se escribe en pantalla y en qué idioma se
 * canta**, no si se habla. Ver `Game.cantar` y `audio/instructor.ts`.
 *
 * Este módulo no dibuja, no habla y no sabe qué tramo se está jugando: son
 * cuatro tablas y dos funciones puras.
 */

import type { Escalon } from "./avisos-de-altura";

/** Los cuatro peldaños de la escalera, en orden. */
export type Peldano = "dibujo" | "palabra" | "cifra" | "cabina";

export const PELDANOS: readonly Peldano[] = [
  "dibujo",
  "palabra",
  "cifra",
  "cabina",
];

/** Qué canales tiene abiertos un peldaño para contar lo que pasa. */
export interface Canales {
  /** El pictograma, el color y el tono. Abierto en los cuatro, siempre. */
  readonly dibujo: boolean;
  /** Si la tarjeta lleva texto además del dibujo. */
  readonly texto: boolean;
  /** Y si ese texto es **una sola palabra** en vez de la frase entera. */
  readonly corto: boolean;
  /** El número en grande: la altura sobre la pista, la desviación de la senda. */
  readonly cifra: boolean;
  /** El canto en inglés aeronáutico, dicho por la voz de cabina. */
  readonly cabina: boolean;
}

const CANALES: Readonly<Record<Peldano, Canales>> = {
  dibujo: {
    dibujo: true,
    texto: false,
    corto: false,
    cifra: false,
    cabina: false,
  },
  palabra: {
    dibujo: true,
    texto: true,
    corto: true,
    cifra: false,
    cabina: false,
  },
  cifra: {
    dibujo: true,
    texto: true,
    corto: false,
    cifra: true,
    cabina: false,
  },
  cabina: {
    dibujo: true,
    texto: true,
    corto: false,
    cifra: true,
    cabina: true,
  },
};

export function canalesDe(peldano: Peldano): Canales {
  return CANALES[peldano];
}

/**
 * Qué clave de texto va en la tarjeta de un aviso, o `null` si ninguna.
 *
 * Las dos claves llegan del sitio donde se da el aviso —la larga y la corta—
 * en vez de estar en una tabla aquí, y eso es a propósito: quien escribe un
 * aviso nuevo ve las dos formas juntas y no puede olvidarse de la corta. Una
 * tabla lejos de los avisos se queda vieja el primer día.
 */
export function claveDelAviso(
  peldano: Peldano,
  larga: string,
  corta: string,
): string | null {
  const canales = CANALES[peldano];
  if (!canales.texto) return null;
  return canales.corto ? corta : larga;
}

/**
 * Las alturas que salen **en grande** cuando entran los números.
 *
 * Ciento cincuenta, cien y cincuenta metros sobre la pista: las tres que
 * importan en una aproximación, y no la cuenta atrás entera. La cuenta atrás
 * —cien, cincuenta, treinta, veinte, diez— es el canal de la voz y tiene su
 * propio ritmo; ver `avisos-de-altura.ts`. Esto es lo otro: un número grande,
 * tres veces, para empezar a leer una altura en vez de mirar un dibujo.
 *
 * `dice` y `encasa` llevan la propia cifra porque estos escalones no se
 * cantan: se enseñan. Comparten el tipo para poder reusar `AvisosDeAltura`,
 * que es quien sabe cruzar un escalón hacia abajo una sola vez.
 */
export const EN_GRANDE: readonly Escalon[] = [
  { metros: 150, dice: "150", encasa: "150" },
  { metros: 100, dice: "100", encasa: "100" },
  { metros: 50, dice: "50", encasa: "50" },
];

/**
 * Y las mismas en pies, para el peldaño que vuela en pies.
 *
 * Quinientos, cien y cincuenta **pies**, que son los tres números de una
 * aproximación de verdad. Igual que con la cuenta atrás: el número que se
 * enseña es el que marca el instrumento, y en Taguato Ruvicha el instrumento
 * marca pies.
 */
export const EN_GRANDE_EN_PIES: readonly Escalon[] = [
  { metros: 152.4, dice: "500", encasa: "500" },
  { metros: 30.48, dice: "100", encasa: "100" },
  { metros: 15.24, dice: "50", encasa: "50" },
];
