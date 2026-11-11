/**
 * **El interruptor de la baliza** (ADR 0025): la luz roja que destella encima y debajo
 * del avión, o en lo alto de la deriva, y que dice «esto está vivo, no te acerques».
 *
 * En un avión de verdad se enciende a mano antes de arrancar o de que te saquen
 * empujado, y se apaga a mano con los motores ya parados, que es la señal para que la
 * gente de tierra se acerque. Aquí la mueven dos:
 *
 * - **Quien juega**, con su botón, su tecla o la tarjeta que la pide.
 * - **El motor**, en sus dos cambios: al arrancar la enciende si no lo estaba y al
 *   parar la apaga. Antes la llevaba solo el motor, y así sigue para quien no la toca:
 *   nadie se queda volando con ella apagada por no saber que existe.
 *
 * Entre esos dos cambios manda quien la mueve. Y donde manda de verdad es en el puesto
 * de contacto: **el tractor no empuja un avión con la baliza apagada**, como en
 * cualquier aeropuerto. Ver `Game.pedirElRemolque`.
 */
export class InterruptorDeBaliza {
  private puesta = false;
  /** El motor en el paso anterior; `null` al empezar un vuelo, que lo coge del primero. */
  private motorAntes: boolean | null = null;

  /** Si está encendida. */
  get encendida(): boolean {
    return this.puesta;
  }

  /** A mano: el botón, la tecla o la tarjeta. Devuelve cómo queda. */
  mover(): boolean {
    this.puesta = !this.puesta;
    return this.puesta;
  }

  /** Encendida, la pida quien la pida: la tripulación del vuelo de línea, en el pasaje. */
  encender(): void {
    this.puesta = true;
  }

  /**
   * Un paso, con el motor. Solo cuenta el cambio: al arrancar, encendida; al parar,
   * apagada. Con el motor quieto en un estado, la deja como esté.
   */
  paso(motor: boolean): void {
    if (this.motorAntes === null || motor !== this.motorAntes) this.puesta = motor;
    this.motorAntes = motor;
  }

  /** Vuelo nuevo: en el primer paso se pone como esté el motor. */
  reiniciar(): void {
    this.motorAntes = null;
  }
}
