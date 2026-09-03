/**
 * Los avisos de altura de la toma: *one hundred… fifty, thirty, twenty, ten*.
 *
 * Es lo mejor que tiene la aviación para este juego. **Dicen la altura sin
 * mirar ningún instrumento y sin saber leer**, y enseñan solos el ritmo de la
 * recogida: la cuenta se acelera según te acercas, y cuando los números se
 * pegan unos a otros es que hay que tirar. Un niño de cuatro años los repite a
 * la tercera vez.
 *
 * ## En metros, y eso es una decisión
 *
 * Los de verdad van en pies, porque el radioaltímetro va en pies. Aquí van en
 * **metros**, porque toda la cabina de este juego va en metros —ALT en metros,
 * IAS en km/h— y mezclar unidades es peor que apartarse de la costumbre: quien
 * oye «fifty» y ve 50 en el altímetro está aprendiendo dos cosas a la vez;
 * quien oye «fifty» y ve 15 no está aprendiendo ninguna.
 *
 * Las palabras sí son las de verdad, en inglés aeronáutico, igual que IAS y
 * HDG. No se traducen jamás: reconocerlas es parte de lo que se aprende aquí.
 *
 * ## Solo bajando
 *
 * Un aviso se da al **cruzar hacia abajo**, nunca al subir. Sin esto, quien
 * rebota en la toma o quien hace una pasada baja se lleva la cuenta atrás dos
 * veces y del revés, que es exactamente lo contrario de lo que enseña.
 */

/**
 * Los escalones, de más alto a más bajo.
 *
 * Son los de la cadencia real: espaciados arriba y apretados abajo. Esa
 * aceleración **es** la lección — no es una lista de números, es un ritmo que
 * dice «ya, ya, ya».
 */
export const ESCALONES: readonly {
  readonly metros: number;
  readonly dice: string;
}[] = [
  { metros: 100, dice: "one hundred" },
  { metros: 50, dice: "fifty" },
  { metros: 30, dice: "thirty" },
  { metros: 20, dice: "twenty" },
  { metros: 10, dice: "ten" },
  { metros: 5, dice: "five" },
];

/**
 * Cuánto hay que subir por encima de un escalón para volver a armarlo.
 *
 * Sin esta holgura, volar rozando justo un escalón lo dispara en cada
 * fotograma. Con ella hay que subir de verdad para que vuelva a contar.
 */
const REARME = 8;

export interface Aviso {
  readonly metros: number;
  readonly dice: string;
}

/**
 * La cuenta atrás de la toma.
 *
 * Se le da la altura sobre el suelo en cada fotograma y devuelve el aviso que
 * toca, o `null`. No sabe hablar ni dibujar: eso es de quien lo use.
 */
export class AvisosDeAltura {
  /** Escalones ya dados, hasta que se suba lo bastante para rearmarlos. */
  private dados = new Set<number>();

  /**
   * Un fotograma.
   *
   * `sobreElSuelo` en metros; `enElAire` para no cantar mientras se rueda —al
   * rodar se está a un metro del suelo todo el rato y no hay toma que anunciar.
   */
  paso(sobreElSuelo: number, enElAire: boolean): Aviso | null {
    if (!enElAire) {
      // En tierra se olvida todo: la próxima toma empieza de cero.
      this.dados.clear();
      return null;
    }

    // Rearme: lo que ha quedado bien por encima vuelve a estar disponible.
    for (const e of ESCALONES) {
      if (this.dados.has(e.metros) && sobreElSuelo > e.metros + REARME) {
        this.dados.delete(e.metros);
      }
    }

    // Y el aviso: el más alto de los que se acaban de cruzar hacia abajo. Se
    // da uno solo por fotograma —caer diez metros de golpe no puede soltar
    // cuatro palabras a la vez— y se dan por dados los de debajo, que ya no
    // toca cantarlos.
    for (const e of ESCALONES) {
      if (this.dados.has(e.metros) || sobreElSuelo > e.metros) continue;
      this.dados.add(e.metros);
      return { metros: e.metros, dice: e.dice };
    }
    return null;
  }

  /** Vuelta a empezar. La llama el juego al reiniciar el vuelo. */
  reiniciar(): void {
    this.dados.clear();
  }
}
