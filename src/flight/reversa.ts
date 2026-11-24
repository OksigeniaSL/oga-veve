/**
 * **La reversa que se abre**: lo que tarda y cuándo empuja (punto 254, y H78).
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
 * con ellas abiertas del todo se le puede pedir empuje. En los aviones de
 * verdad es un cerrojo mecánico entre la palanca y la reversa: en el A340, «the
 * reverse thrust levers […] are interlocked and cannot be moved beyond the idle
 * reverse detent unless the thrust reversers […] are fully deployed» (TSB,
 * A05H0002, §1.6.20, p. 22).
 *
 * **Y entonces el motor tarda lo que tarda** (H78). Estaba a fondo en el instante
 * en que se abría la pieza, y lo que hay detrás es el mismo motor que acelera con
 * la palanca hacia delante: desde el ralentí, sus cinco segundos en el JAZ 90.
 * Es lo que la FAA manda contar en una distancia de parada, las dos cosas:
 * «thrust reverser interlocks that prevent the pilot from applying reverse thrust
 * until the reverser is deployed» y «the effects of transient response
 * characteristics, such as reverse thrust engine spin-up» (AC 25-32, 10.1.4; AC
 * 25-7D, 4.3.7.10.4). El motor es `respuesta-del-motor.ts`, el mismo de siempre, y
 * arranca de las vueltas que lleve. **Al soltarla** el motor se va como se va
 * cualquier gas, con la pieza cerrándose: no se corta en el acto.
 *
 * Contra los registradores: el A340 de Toronto tuvo los cuatro N1 quietos en la
 * reversa a fondo unos cinco segundos después de pedirla (TSB, A05H0002, p. 43), y
 * el 737 de Midway, unos doce (NTSB, AAR-07/06, p. 17). Aquí, del toque de la
 * palanca al 95 %, siete el JAZ 90 y el JAZ 110 y ocho el JAZ 120.
 *
 * ## Lo que tarda la pieza
 *
 * **Dos segundos el manguito de un turbofán**, en abrirse y en cerrarse. Entre lo
 * que se ha leído: un segundo en el manual del A340-313 (TSB, A05H0002, §1.6.5,
 * p. 14); y en el registrador de un 737-700, unos tres del primer movimiento al
 * despliegue entero, con otros cuatro 737 de esa noche desplegada a los cuatro
 * segundos del toque (NTSB, AAR-07/06, p. 17). Es el medio de uno y tres; del
 * CF34, del GEnx y del JT9D no se ha encontrado cifra.
 *
 * **Uno las palas de un turbohélice.** Del PT6 y su hélice tampoco hay cifra
 * leída: es menos recorrido que el del único ensayo que se ha leído, el del fan
 * de paso variable QCSEE de la NASA, que gira sus palas a más de cien grados por
 * segundo y tiene la reversa establecida en 1,5 s (TM-81558, p. 13), y con una
 * hidráulica más lenta que la suya.
 *
 * Función de estado sin pantalla: `Game` le da la palanca cada paso, y con lo
 * que devuelve mueve el modelo y empuja el modelo de vuelo.
 */

import { tieneReversa, type AircraftConfig } from "./aircraft";
import { avanzarGiro, gasQueDa, giroAsentado, type GiroDelMotor } from "./respuesta-del-motor";

/** Segundos en abrirse del todo, y en cerrarse, por motor. */
export const TIEMPO_DE_REVERSA = {
  turbofan: 2,
  turboprop: 1,
} as const;

/**
 * **El gas que llevan los motores con la reversa a fondo**, de 0 a 1: tres
 * cuartos del empuje de despegue. En un turbofán son unas nueve décimas de sus
 * vueltas —el N1 del 737-700 con la reversa a fondo llegó al 80 % (NTSB,
 * AAR-07/06, p. 17)—, y lo que sale hacia delante es `REVERSA_DA` del empuje.
 * Es lo que se oye, lo que marca la aguja y lo que tarda en llegar.
 */
export const GAS_DE_REVERSA = 0.75;

/** Lo que tarda en abrirse la reversa de este avión, s; `null` si no la lleva. */
export function tiempoDeReversa(a: AircraftConfig): number | null {
  if (!tieneReversa(a)) return null;
  return a.sound.engine === "turbofan" ? TIEMPO_DE_REVERSA.turbofan : TIEMPO_DE_REVERSA.turboprop;
}

/**
 * **Cómo está la reversa**, que es lo que dice su marca del cuadro: recogida,
 * moviéndose —abriéndose o cerrándose— o fuera del todo.
 */
export type EstadoDeReversa = "recogida" | "moviendose" | "fuera";

/** Por debajo de esto, el motor de la reversa ya es el de siempre al ralentí. */
const YA_NO_DA = 1e-4;

export class Reversa {
  /** Cuánto está abierta, de 0 —recogida— a 1 —abierta del todo—. */
  abierta = 0;
  private empujando = 0;
  /** Los motores, desde que se abre hasta que vuelven al ralentí; `null`, los de siempre. */
  private giro: GiroDelMotor | null = null;
  /** Segundos en abrirse del todo; `null` en un avión sin reversa. */
  private readonly tiempo: number | null;

  constructor(private readonly avion: AircraftConfig) {
    this.tiempo = tiempoDeReversa(avion);
  }

  /**
   * Un paso. `palanca` es lo que se pide, de 0 a 1; `enTierra`, si las ruedas
   * están en el suelo —en el aire no se abre, «even if commanded by the
   * flightcrew» (AC 25.933-1, 4.2.9.2.2), y lo que ya está abierto al botar se
   * queda—; y `daElMotor`, lo que da el motor ahora hacia
   * delante, de 0 a 1, que es de donde arranca al abrirse. Devuelve **lo que
   * empuja al revés**, también de 0 a 1: nada hasta que está abierta del todo.
   */
  paso(dt: number, palanca: number, enTierra = true, daElMotor = 0): number {
    const t = this.tiempo;
    if (t === null || !(t > 0)) {
      this.abierta = 0;
      this.empujando = 0;
      return 0;
    }
    const tramo = Math.max(0, dt);
    const pedida = Number.isFinite(palanca) ? Math.max(0, Math.min(1, palanca)) : 0;
    const pide = enTierra || this.abierta > 0 ? pedida : 0;
    const paso = tramo / t;
    this.abierta =
      pide > 0 ? Math.min(1, this.abierta + paso) : Math.max(0, this.abierta - paso);
    if (this.abierta >= 1 && this.giro === null) this.giro = giroAsentado(this.avion, daElMotor);
    if (this.giro !== null) {
      // Con la pieza a medias, la palanca está en su cerrojo: ralentí de reversa.
      const gas = this.abierta >= 1 ? pide * GAS_DE_REVERSA : 0;
      avanzarGiro(this.giro, this.avion, gas, tramo);
      if (this.abierta <= 0 && gasQueDa(this.giro, this.avion) < YA_NO_DA) this.giro = null;
    }
    /*
     * Y lo que empuja al revés es lo que da el motor, por lo que le deja pasar la
     * pieza: entero abierta del todo, y menos mientras se cierra.
     */
    this.empujando = Math.min(1, this.gasDelMotor / GAS_DE_REVERSA) * this.abierta;
    return this.empujando;
  }

  /** Lo que empuja ahora, de 0 a 1. */
  get empuje(): number {
    return this.empujando;
  }

  /**
   * **Lo que dan los motores por la reversa**, como gas, de 0 a 1: lo que se oye
   * y lo que marca la aguja. Cero si no la están moviendo.
   */
  get gasDelMotor(): number {
    return this.giro === null ? 0 : gasQueDa(this.giro, this.avion);
  }

  /** Lo que dice su marca del cuadro. */
  get estado(): EstadoDeReversa {
    if (this.abierta <= 0) return "recogida";
    return this.abierta >= 1 ? "fuera" : "moviendose";
  }

  /** Otro vuelo: recogida, y los motores los de siempre. */
  reiniciar(): void {
    this.abierta = 0;
    this.empujando = 0;
    this.giro = null;
  }
}
