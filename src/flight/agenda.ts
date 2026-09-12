/**
 * Lo que hay que hacer dentro de un rato, contado con el reloj del juego.
 *
 * Había tres `window.setTimeout` sueltos en el bucle —apagar la lámpara de la
 * torre, sacar la pantalla del percance, enseñar el grado nuevo— y los tres
 * tienen el mismo fallo, que no es de estilo:
 *
 * **Un temporizador del navegador no sabe que el juego está parado.** Con un
 * percance pendiente y el menú de pausa abierto, la pantalla salía igual: el
 * avión congelado y encima un cartel contando algo que, para quien mira, no
 * ha terminado de pasar. Lo mismo con la lámpara, que se apagaba sola durante
 * una pausa larga.
 *
 * Y **tampoco sabe que el juego puede ir más deprisa**. Los bancos aceleran el
 * reloj para volar un vuelo entero en un minuto en vez de en ocho; con
 * temporizadores de pared, la mitad de las cosas llegaban tarde y en desorden.
 *
 * Así que el rato se cuenta en segundos **de juego**: el mismo reloj que mueve
 * el avión. Si el avión no se mueve, esto tampoco corre.
 */

interface Pendiente {
  queda: number;
  readonly hacer: () => void;
}

export class Agenda {
  private pendientes: Pendiente[] = [];

  /** Cuántas cosas hay esperando. Para mirarla desde fuera. */
  get cuantas(): number {
    return this.pendientes.length;
  }

  /** Dentro de tantos segundos de juego, esto. */
  luego(segundos: number, hacer: () => void): void {
    this.pendientes.push({ queda: segundos, hacer });
  }

  /**
   * Pasa el tiempo y dispara lo que venza.
   *
   * Lo que vence se saca de la lista **antes** de ejecutarlo, y se recorre una
   * copia: una de estas puede apuntar otra —la pantalla del percance apunta el
   * cartel que viene después— y si se recorriera la lista viva, la nueva
   * entraría en la misma vuelta y las dos pasarían en el mismo fotograma.
   */
  paso(dt: number): void {
    if (this.pendientes.length === 0) return;
    const vencidas: Pendiente[] = [];
    const siguen: Pendiente[] = [];
    for (const p of this.pendientes) {
      p.queda -= dt;
      (p.queda <= 0 ? vencidas : siguen).push(p);
    }
    this.pendientes = siguen;
    for (const p of vencidas) p.hacer();
  }

  /**
   * Se olvida de todo.
   *
   * Al reiniciar el vuelo, lo que quedaba pendiente era de la partida
   * anterior: una pantalla de percance del vuelo que ya no existe saliendo
   * encima del que acaba de empezar.
   */
  vaciar(): void {
    this.pendientes = [];
  }
}
