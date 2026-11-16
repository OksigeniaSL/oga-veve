/**
 * **La libreta del vuelo**: cuánto dura, por dónde se va y cuántos segundos
 * en el aire quedan sin pasar al cuaderno.
 *
 * Eran cuatro campos sueltos de `game.ts` —la traza, la duración y dos
 * contadores— que se escribían en el bucle, en el salto del vuelo largo y en
 * los reinicios, cada uno con su cuenta a mano. El cuaderno, que es lo que se
 * guarda, sigue en el juego: aquí solo se dice **cuándo** toca escribir en él
 * y cuánto. Repaso del 12-09 de #30, corte 3. Ver `flight/cuaderno.ts` y
 * `flight/bitacora.ts`.
 */

import type { Paso } from "./bitacora";

/** Cada cuántos segundos de vuelo se apunta la hora en el cuaderno. */
export const CADA_CUANTO_SE_APUNTA = 30;

/**
 * Cada cuántos segundos se cata por dónde va el avión, para la traza.
 *
 * Dos. Un vuelo de diez minutos son trescientas catas, que la bitácora
 * adelgaza a ciento veinte al guardarlas: más resolución de la que se ve en
 * una raya sobre un plano de doce kilómetros, y suficiente para que una curva
 * de circuito siga pareciendo una curva. Ver `flight/bitacora.ts`.
 */
export const CADA_CUANTO_SE_CATA = 2;

export class Libreta {
  /**
   * Por dónde ha ido este vuelo, en coordenadas del fichero del aeródromo.
   *
   * Se cata cada pocos segundos y se guarda con el vuelo: a los cuatro años
   * «lo que acabo de hacer» no es una lista de números, es un dibujo.
   */
  traza: Paso[] = [];
  /** Cuánto ha durado este vuelo, s. Cuenta desde que se arrancó. */
  duracion = 0;
  /** Lo que se lleva sin catar la traza, s. */
  private sinCatar = 0;
  /** Segundos volando desde el último apunte, para no escribir cada fotograma. */
  private sinApuntar = 0;

  /**
   * **Las horas de vuelo, que es de lo que va un cuaderno.**
   *
   * Se cuentan con las ruedas en el aire y se guardan cada medio minuto: no
   * hace falta más precisión —nadie mira los segundos— y escribir en el
   * almacenamiento sesenta veces por segundo sería absurdo.
   *
   * Devuelve los segundos que toca sumar ya al cuaderno, o cero si todavía
   * no toca.
   */
  contarElAire(dt: number, enElAire: boolean): number {
    if (!enElAire) return 0;
    this.sinApuntar += dt;
    if (this.sinApuntar <= CADA_CUANTO_SE_APUNTA) return 0;
    return this.volcar();
  }

  /**
   * **Y por dónde se va pasando**, que es lo que después se dibuja.
   *
   * Se cata cada pocos segundos, en el suelo y en el aire: la vuelta del
   * puesto a la pista es parte del vuelo y en el plano se reconoce igual que
   * el circuito. `x` y `z` son del mundo; la traza va en coordenadas del
   * fichero —la Y del norte es la Z negativa del mundo—, que es el sistema en
   * el que ya está dibujado el plano.
   */
  catar(dt: number, x: number, z: number): void {
    this.duracion += dt;
    this.sinCatar += dt;
    if (this.sinCatar < CADA_CUANTO_SE_CATA) return;
    this.sinCatar = 0;
    this.traza.push([Math.round(x), Math.round(-z)]);
  }

  /**
   * Los segundos en el aire que quedan sin apuntar, y a cero. **Se vuelcan en
   * vez de tirarse**: son tiempo volado de verdad, y tirarlos al reiniciar era
   * regalarle hasta medio minuto al cuaderno cada vez.
   */
  volcar(): number {
    const s = this.sinApuntar;
    this.sinApuntar = 0;
    return s;
  }

  /**
   * Otro vuelo, otra traza: la raya del anterior ya está guardada. Lo que
   * quedaba sin apuntar no se toca: sigue sumando hasta su apunte, que es
   * tiempo del cuaderno y no de este vuelo.
   */
  empezarOtro(): void {
    this.traza = [];
    this.sinCatar = 0;
    this.duracion = 0;
  }

  /**
   * **Un salto del vuelo largo**: las horas que se saltan son horas que duró
   * de verdad este vuelo, aunque no sean del cuaderno. Y en otro mundo debajo,
   * la raya de antes era de otro plano: el dibujo la uniría con una recta de
   * mil kilómetros.
   */
  saltar(segundos: number, otroMundo: boolean): void {
    this.duracion += segundos;
    if (otroMundo) this.traza = [];
  }
}
