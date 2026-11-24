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
import type { MotorTocado } from "./model";
import { enMarcha, type EstadoDelMotor } from "./motores";
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

function estadoDe(abierta: number): EstadoDeReversa {
  if (abierta <= 0) return "recogida";
  return abierta >= 1 ? "fuera" : "moviendose";
}

/**
 * **Qué parte de la reversa dan los motores**, de 0 a 1, que es lo que se oye: la
 * de los que van, y la del ave, lo que le deja su palanca. Con todos, 1. Es el
 * reparto de `reversaDeLosMotores` en `fdm.ts`, que es lo que frena; `empuje`, lo
 * que empuja la reversa, de 0 a 1.
 */
export function parteDeLaReversa(
  motores: readonly EstadoDelMotor[] | undefined,
  tocado: Pick<MotorTocado, "motor" | "enReversa" | "empuje"> | null,
  empuje: number,
): number {
  if (!motores || motores.length === 0) return 1;
  const gas = empuje * GAS_DE_REVERSA;
  let parte = 0;
  for (let i = 0; i < motores.length; i++) {
    if (motores[i] !== "marcha") continue;
    parte +=
      tocado !== null && i === tocado.motor && gas > 0
        ? Math.min(1, tocado.enReversa / gas) * tocado.empuje
        : 1;
  }
  return parte / motores.length;
}

/** **Y qué parte de las piezas se abre**: la del parado, no. Con todas, 1. */
export function parteDeLasPiezas(motores: readonly EstadoDelMotor[] | undefined): number {
  return motores && motores.length > 0 ? enMarcha(motores) / motores.length : 1;
}

/** Por debajo de esto, el motor de la reversa ya es el de siempre al ralentí. */
const YA_NO_DA = 1e-4;

export class Reversa {
  /** Cuánto está abierta, de 0 —recogida— a 1 —abierta del todo—: la de los motores que van. */
  abierta = 0;
  /**
   * **Y la pieza de cada motor**, en el orden de `motoresA`: la del parado no se
   * abre (H82). Es lo que se ve —el manguito, la marca REV— y lo que golpea; lo
   * que empuja lo reparte el modelo de vuelo, motor a motor. Con todos en marcha
   * son todas `abierta`. Siempre las dos mismas listas: se miran en cada imagen.
   */
  readonly piezas: number[];
  /** Y lo que dice la marca de cada una. */
  readonly estados: EstadoDeReversa[];
  private empujando = 0;
  /** Los motores, desde que se abre hasta que vuelven al ralentí; `null`, los de siempre. */
  private giro: GiroDelMotor | null = null;
  /** Segundos en abrirse del todo; `null` en un avión sin reversa. */
  private readonly tiempo: number | null;

  constructor(private readonly avion: AircraftConfig) {
    this.tiempo = tiempoDeReversa(avion);
    const n = Math.max(1, avion.motoresA.length);
    this.piezas = Array.from({ length: n }, () => 0);
    this.estados = Array.from({ length: n }, () => "recogida" as const);
  }

  /**
   * Un paso. `palanca` es lo que se pide, de 0 a 1; `enTierra`, si las ruedas
   * están en el suelo —en el aire no se abre, «even if commanded by the
   * flightcrew» (AC 25.933-1, 4.2.9.2.2), y lo que ya está abierto al botar se
   * queda—; y `daElMotor`, lo que da el motor ahora hacia
   * delante, de 0 a 1, que es de donde arranca al abrirse. `motores`, cómo va
   * cada uno; sin ellos, van todos. Devuelve **lo que empuja al revés**, también
   * de 0 a 1: nada hasta que está abierta del todo.
   */
  paso(
    dt: number,
    palanca: number,
    enTierra = true,
    daElMotor = 0,
    motores?: readonly EstadoDelMotor[],
  ): number {
    const t = this.tiempo;
    if (t === null || !(t > 0)) {
      this.abierta = 0;
      this.empujando = 0;
      this.recogerLasPiezas();
      return 0;
    }
    const tramo = Math.max(0, dt);
    const pedida = Number.isFinite(palanca) ? Math.max(0, Math.min(1, palanca)) : 0;
    const pide = enTierra || this.abierta > 0 ? pedida : 0;
    const paso = tramo / t;
    this.abierta =
      pide > 0 ? Math.min(1, this.abierta + paso) : Math.max(0, this.abierta - paso);
    this.moverLasPiezas(pide > 0, paso, motores);
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

  /**
   * **La pieza de cada motor**, con la palanca de todos. La del que va hace lo que
   * `abierta`; la del parado no se abre, y si se paró con ella fuera se queda
   * donde está hasta que la palanca la recoge. Esto último no tiene fuente leída.
   */
  private moverLasPiezas(
    abriendo: boolean,
    paso: number,
    motores: readonly EstadoDelMotor[] | undefined,
  ): void {
    for (let i = 0; i < this.piezas.length; i++) {
      const va = motores?.[i] === undefined || motores[i] === "marcha";
      let p = this.piezas[i]!;
      if (!abriendo) p = Math.max(0, p - paso);
      else if (va) p = Math.min(1, p + paso);
      this.piezas[i] = p;
      this.estados[i] = estadoDe(p);
    }
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

  /** **La pieza que más abierta está**: lo que se oye moverse y lo que dice el avión entero. */
  get laMasAbierta(): number {
    let m = 0;
    for (const p of this.piezas) if (p > m) m = p;
    return m;
  }

  /** Si están fuera las de todos los motores. */
  get todasFuera(): boolean {
    for (const p of this.piezas) if (p < 0.99) return false;
    return true;
  }

  /** Lo que dice la marca del avión entero, que es la de la palanca: una para todos. */
  get estado(): EstadoDeReversa {
    return estadoDe(this.laMasAbierta);
  }

  /** Otro vuelo: recogida, y los motores los de siempre. */
  reiniciar(): void {
    this.abierta = 0;
    this.empujando = 0;
    this.giro = null;
    this.recogerLasPiezas();
  }

  private recogerLasPiezas(): void {
    this.piezas.fill(0);
    this.estados.fill("recogida");
  }
}
