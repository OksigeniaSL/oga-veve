/**
 * **La reversa que se abre**: lo que tarda y cuándo empuja (punto 254).
 *
 * Estaba solo en la física, y de golpe: se apretaba la tecla y el chorro se
 * daba la vuelta en el mismo fotograma, sin que en el avión se moviera nada.
 * Una reversa de verdad es una pieza que se mueve, y se ve:
 *
 * - **En un turbofán** como los del JAZ 90 y el JAZ 120 —el CF34 de su clase,
 *   el JT9D del 747 clásico—, la parte de atrás de la cubierta, el manguito,
 *   se desliza hacia la cola y deja a la vista la cascada: una corona de
 *   rejillas por la que sale hacia delante el aire del fan. Unas compuertas
 *   por dentro tapan el conducto para que salga por ahí. Es lo que se ve
 *   desde la ventanilla de encima del ala al tocar.
 * - **En un turbohélice**, las palas cambian de paso hasta empujar al revés
 *   (el «beta»). Eso no se distingue con la hélice girando, que es como se
 *   usa: lo que se ve es la hélice embalándose con la palanca atrás. Ver
 *   `giroDeHelice` en `game.ts`.
 *
 *   **Se miró si se podía enseñar en el disco, y no** (punto 254). Una
 *   hélice que gira se ve como un velo, y lo tupido del velo es lo que tapa
 *   cada pala vista de frente: su cuerda por el coseno de su paso. Al tocar
 *   la palanca está en paso fino, unos diez a veinte grados a tres cuartos de
 *   la pala, y en reversa unos diez a quince **del otro lado** del plano: el
 *   coseno pasa de 0,94–0,98 a 0,97–0,98. De lado, el grueso del disco es la
 *   cuerda por el seno: de 0,17–0,34 a 0,17–0,26 cuerdas, un par de
 *   centímetros. Y despacio, que es cuando se verían las palas girar sobre
 *   sí mismas, no se usa nunca: la reversa embala la hélice. Así que no se
 *   dibuja: un cambio que el ojo no ve en el avión de verdad no se inventa
 *   aquí.
 *
 * Y **el empuje al revés espera a que esté abierta**: con las compuertas a
 * medio camino el motor se queda al ralentí de reversa, que no frena, y solo
 * con ellas abiertas del todo da lo que pide la palanca. En los aviones de
 * verdad es un cerrojo mecánico entre la palanca y la reversa, y es lo que
 * hace que la reversa llegue un par de segundos después de pedirla. Al
 * soltarla, el empuje se va enseguida y la pieza tarda lo mismo en volver.
 *
 * ## Lo que tarda
 *
 * **Dos segundos el manguito de un turbofán**, en abrirse y en cerrarse; **uno
 * las palas de un turbohélice**. No hay una cifra única publicada para la
 * clase: es el orden de lo que se ve en cualquier aterrizaje, el que usan los
 * estudios de simulación de reversas de cascada (1,5 s), y holgadamente
 * dentro del tope de diez segundos que el manual de mantenimiento del 737
 * NG da para recogerlas antes de encender el aviso REVERSER. Un cambio de
 * paso es más rápido que mover tres actuadores hidráulicos.
 *
 * Función de estado sin pantalla: `Game` le da la palanca cada paso, y con lo
 * que devuelve mueve el modelo y empuja el modelo de vuelo.
 */

import { tieneReversa, type AircraftConfig } from "./aircraft";

/** Segundos en abrirse del todo, y en cerrarse, por motor. */
export const TIEMPO_DE_REVERSA = {
  turbofan: 2,
  turboprop: 1,
} as const;

/** Lo que tarda en abrirse la reversa de este avión, s; `null` si no la lleva. */
export function tiempoDeReversa(a: AircraftConfig): number | null {
  if (!tieneReversa(a)) return null;
  return a.sound.engine === "turbofan" ? TIEMPO_DE_REVERSA.turbofan : TIEMPO_DE_REVERSA.turboprop;
}

export class Reversa {
  /** Cuánto está abierta, de 0 —recogida— a 1 —abierta del todo—. */
  abierta = 0;
  private empujando = 0;

  constructor(
    /** Segundos en abrirse del todo; `null` en un avión sin reversa. */
    private tiempo: number | null,
  ) {}

  /**
   * Un paso. `palanca` es lo que se pide, de 0 a 1. Devuelve **lo que empuja
   * al revés**, también de 0 a 1: nada hasta que está abierta del todo.
   */
  paso(dt: number, palanca: number): number {
    const t = this.tiempo;
    if (t === null || !(t > 0)) {
      this.abierta = 0;
      this.empujando = 0;
      return 0;
    }
    const pide = Number.isFinite(palanca) ? Math.max(0, Math.min(1, palanca)) : 0;
    const paso = Math.max(0, dt) / t;
    this.abierta =
      pide > 0 ? Math.min(1, this.abierta + paso) : Math.max(0, this.abierta - paso);
    this.empujando = pide > 0 && this.abierta >= 1 ? pide : 0;
    return this.empujando;
  }

  /** Lo que empuja ahora, de 0 a 1. */
  get empuje(): number {
    return this.empujando;
  }

  /** Otro avión, u otro vuelo: recogida, y con su tiempo. */
  reiniciar(tiempo: number | null = this.tiempo): void {
    this.tiempo = tiempo;
    this.abierta = 0;
    this.empujando = 0;
  }
}
