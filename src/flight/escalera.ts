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
 *   inglés aeronáutico: *V1, rotate*, *minimums*, *terrain, pull up*.
 *
 * ## Y lo que dice el avión no sube por la escalera
 *
 * Una cabina oye dos clases de voces. Unas son de la tripulación —*V one*,
 * *rotate*, *gear up*— y ésas sí suben: abajo las dice la instructora en casa,
 * arriba se cantan en inglés. Las otras las dice **una caja del avión**: el
 * radioaltímetro con su cuenta, el avisador de proximidad al terreno con su
 * *terrain* y su *sink rate*, el de pérdida, el TCAS con su *traffic,
 * traffic*. Esas no se traducen ni se retiran: **en el avión que las lleva
 * suenan con su voz de máquina en los cuatro peldaños**, porque es lo que
 * suena en ese avión, y es lo que se va a oír tal cual el día que se suba a
 * uno de verdad.
 *
 * Se decidió en dos veces, oyéndolo jugar. Primero con la cuenta: «va
 * marcando la distancia hasta one hundred y luego va de 10 en 10», y «me lo
 * tiene que decir una voz de robot», no la instructora. Después con los
 * avisos: «es que ni el "traffic" ni el "terrain" ni nada de eso, y yo sé que
 * la cabina habla».
 *
 * **Lo que crece con el peldaño es la explicación, no el sonido.** En los tres
 * de abajo, justo detrás de la máquina —detrás, no a la vez: un suceso, una
 * voz—, la instructora cuenta con calma qué es eso y qué se hace: «mirá a tu
 * derecha: hay otro avión cerca», «el suelo está cerca: subí». En el de
 * cabina ya no hace falta. Así se enseña la calma con el sonido de verdad: la
 * primera vez que alguien oiga una alarma de avión tiene que oír, justo
 * detrás, a alguien que no se asusta.
 *
 * En la avioneta, que no lleva ninguna de esas cajas, no suena ninguna: lo
 * dice la instructora, que es quien lo diría sentada al lado. Ver
 * `loDiceElAvion` en `audio/cabina.ts` y `Game.cantar`.
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
 * cuatro tablas y tres funciones puras.
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
 * **Desde qué peldaño, de uno a cuatro, lleva su número lo que se avisa con un
 * número**: el tercero, el de `cifra`.
 *
 * Lo usa la GS de rodar, que en tierra crece y se pinta verde o ámbar según lo
 * que viene: la barra que se llena es el dibujo y está en los cuatro; la cifra
 * con su «GS», desde aquí. Sale de la tabla y no de un tres escrito a mano en
 * el cuadro plano, en la cabina y en el teléfono. Ver `rodajeEnTierra` en
 * `ui/cristal.ts`.
 */
export const CIFRAS_DE_AVISO_DESDE: 1 | 2 | 3 | 4 = (PELDANOS.findIndex(
  (p) => CANALES[p].cifra,
) + 1) as 1 | 2 | 3 | 4;

/**
 * De quién es un canto de cabina: de **la tripulación** o de **una caja** del
 * avión —el radioaltímetro, el avisador de terreno, el de pérdida, el TCAS—.
 *
 * Son dos clases y no suben igual por la escalera. Ver la cabecera de este
 * fichero; qué clave es de qué clase lo dice `esDeUnaCaja` en
 * `audio/cabina.ts`.
 */
export type Canto = "tripulacion" | "maquina";

/**
 * Si el canto suena en inglés, con la voz de cabina, en este peldaño.
 *
 * Los de la tripulación, solo en el de cabina; los de una caja, en los cuatro.
 * **Si el avión lleva esa caja** es otra pregunta, y no es de este fichero: la
 * contesta `loDiceElAvion` en `audio/cabina.ts`.
 */
export function cantaLaCabina(peldano: Peldano, canto: Canto): boolean {
  return canto === "maquina" || CANALES[peldano].cabina;
}

/**
 * Si detrás de la máquina la instructora explica lo que acaba de sonar.
 *
 * En los tres peldaños de abajo, sí: la caja dice *sink rate* y ella cuenta
 * qué quiere decir y qué se hace. En el de cabina, no: ahí ya se vuela con la
 * cabina de verdad, y lo que crece con el peldaño es justo esto — la
 * explicación, no el sonido.
 */
export function laInstructoraLoExplica(peldano: Peldano): boolean {
  return !CANALES[peldano].cabina;
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
 * es del radioaltímetro, va en pies y tiene su propio ritmo; ver
 * `avisos-de-altura.ts`. Esto es lo otro: un número grande,
 * tres veces, para empezar a leer una altura en vez de mirar un dibujo.
 *
 * `dice` lleva la propia cifra porque estos escalones no se cantan: se
 * enseñan. Comparten el tipo para poder reusar `AvisosDeAltura`, que es quien
 * sabe cruzar un escalón hacia abajo una sola vez; y por eso, igual que la
 * cuenta, salen con lo que marca el radioaltímetro, en el instante del cruce.
 */
export const EN_GRANDE: readonly Escalon[] = [
  { metros: 150, dice: "150" },
  { metros: 100, dice: "100" },
  { metros: 50, dice: "50" },
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
  { metros: 152.4, dice: "500" },
  { metros: 30.48, dice: "100" },
  { metros: 15.24, dice: "50" },
];
