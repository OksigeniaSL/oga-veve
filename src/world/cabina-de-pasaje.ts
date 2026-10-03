/**
 * **La cabina de pasaje alrededor de la ventanilla**: las persianas —o el
 * cristal que se oscurece—, las ventanillas de al lado y las luces.
 *
 * Pedido así: «los modernos tienen un oscurecedor que se activa sin que el
 * pasajero interfiera, para que todas las ventanillas estén claras en las
 * maniobras de despegue y aterrizaje, y eso tiene una razón de ser. Estaría
 * bien que se hiciera así». Y de la pared: «normalmente en los aviones la
 * ventanilla de delante y la de detrás se ven un poquito, a no ser que tengas
 * una columna».
 *
 * ## Lo que pasa de verdad, y aquí se ve pasar
 *
 * - **Para despegar y aterrizar, las ventanillas claras.** Con persiana, se
 *   sube: la de uno y la de los de al lado, cada cual a su ritmo. Con cristal
 *   que se oscurece —ver `ventanillas` en `flight/aircraft.ts`—, la
 *   tripulación las aclara todas a la vez desde su panel, y mientras tanto el
 *   botón de la ventanilla no hace nada.
 * - **De noche, la cabina se apaga** para despegar y aterrizar, y en crucero
 *   se queda con las luces bajas; embarcando, encendida.
 * - **En crucero, cada uno hace lo que quiere**: se puede bajar la persiana u
 *   oscurecer el cristal, y los de al lado también lo hacen a veces.
 *
 * El porqué —ver fuera si pasa algo, un motor o fuego, y tener los ojos ya
 * hechos a la luz de fuera si hay que salir— **no se cuenta en cada vuelo**:
 * «a los pasajeros no se les da explicaciones, tampoco vamos a ser tan pesados
 * de decirlo en todos los vuelos». Se ve pasar, y ya.
 *
 * Aquí está solo el estado y su reloj: qué toca, hacia dónde va cada cosa y a
 * qué ritmo. Lo pinta `marco-de-ventanilla.ts`.
 */

import type { Fase } from "../flight/vuelo";

/** Cómo se oscurece una ventanilla. Ver `ventanillas` en `aircraft.ts`. */
export type TipoDeVentanilla = "persiana" | "electrocromica";

/**
 * Las fases en las que la cabina va preparada pase lo que pase: desde que se
 * empieza a rodar hasta que se sale de la pista al llegar. En la puerta, al
 * embarcar y al desembarcar, no: ahí cada uno tiene la ventanilla como quiere
 * y la cabina encendida.
 */
const PREPARADA_EN_TIERRA: ReadonlySet<Fase> = new Set<Fase>([
  "rodando",
  "esperando",
  "autorizado",
  "back-taxi",
  "alineando",
  "despegando",
  "comprometido",
  "final",
  "aterrizado",
]);

/** Las de la puerta: se embarca y se desembarca con la cabina encendida. */
const EN_LA_PUERTA: ReadonlySet<Fase> = new Set<Fase>([
  "estacionado",
  "arrancando",
  "en-puesto",
  "apagado",
]);

/**
 * **Si la cabina va preparada para despegar o aterrizar**: ventanillas claras
 * y, de noche, luces bajadas.
 *
 * En el aire, lo mismo que el cartel del cinturón cuenta de otra manera: desde
 * el despegue hasta que la comandante dice que ya se pueden soltar, y desde
 * que anuncia el descenso hasta tierra. Es cuando la tripulación prepara la
 * cabina en un vuelo de verdad. Ver `pasajeSuelto` en `flight/cinturon.ts`.
 */
export function cabinaPreparada(fase: Fase, pasajeSuelto: boolean): boolean {
  if (PREPARADA_EN_TIERRA.has(fase)) return true;
  if (fase === "en-vuelo") return !pasajeSuelto;
  return false;
}

/**
 * **Las luces de la cabina de noche**, de 0 a 1: lo que alumbran por dentro
 * cuando fuera no hay luz.
 *
 * - Embarcando, encendidas: se busca el asiento y se guarda la maleta.
 * - En crucero, bajas y cálidas: se lee, se duerme.
 * - Para despegar y aterrizar, casi apagadas: queda la luz del suelo que
 *   lleva a las salidas y poco más.
 */
export const LUZ_DE_NOCHE = { embarcando: 0.85, crucero: 0.3, preparada: 0.07 } as const;

/** Cuánto tardan las luces en bajar o subir, s: la tripulación las baja por pasos. */
const TARDAN_LAS_LUCES = 2.5;

/**
 * Lo que tarda cada cosa en ir de un extremo al otro, s.
 *
 * - **La persiana**, menos de un segundo: se sube con la mano, de un tirón.
 * - **El cristal que se oscurece**, cuatro. Uno de verdad tarda más de un
 *   minuto en pasar del todo, pero aquí tiene que verse pasar mientras se
 *   mira, y cuatro segundos ya se leen como «se está aclarando solo».
 */
const TARDA = { persiana: 0.8, electrocromica: 4 } as const;

/** Los pasos del cristal que se oscurece: claro y cuatro tonos, como el del 787. */
export const PASOS_DEL_CRISTAL = [0, 0.25, 0.5, 0.75, 1] as const;

/** Y los de la persiana, a cada toque: media, entera y arriba otra vez. */
export const PASOS_DE_LA_PERSIANA = [0, 0.5, 1] as const;

/**
 * **Cuánto dura el respingo** de la persiana que no se deja bajar, s: baja un
 * dedo y vuelve. Es la manera de decir «ahora no» sin una palabra y sin un
 * pitido: no es un error de nadie.
 */
const DURA_EL_RESPINGO = 0.5;

/**
 * Las ventanillas de al lado: si hay ventanilla delante y detrás de la de uno,
 * o una columna de pared.
 */
export interface Vecinas {
  readonly delante: boolean;
  readonly detras: boolean;
}

/**
 * **Cada cuánto toca una columna**, de 0 a 1: las ventanillas van a medio
 * metro y los asientos a ochenta centímetros, y no siempre caen juntos. En
 * algunas filas la ventanilla de delante o la de detrás no está y hay pared.
 * Uno de cada cuatro vuelos, según el asiento que toque.
 */
const COLUMNA = 0.25;

/** Un número entre 0 y 1. Se le pasa `Math.random` o uno fijo en las pruebas. */
export type Azar = () => number;

/** Lo que va a hacer cada ventanilla de al lado en crucero. */
interface Vecino {
  /** Hasta dónde la baja —u oscurece— su pasajero, de 0 a 1. */
  readonly quiere: number;
  /** Y cuántos segundos de crucero tarda en hacerlo. */
  readonly tarda: number;
  /** Lo que tarda en subirla cuando lo piden, s: cada uno a su ritmo. */
  readonly reacciona: number;
}

export class CabinaDePasaje {
  private tipo: TipoDeVentanilla;
  private vecindad: Vecinas = { delante: true, detras: true };
  private vecinos: [Vecino, Vecino] = [
    { quiere: 0, tarda: 0, reacciona: 0 },
    { quiere: 0, tarda: 0, reacciona: 0 },
  ];
  /** Dónde está cada una ahora: la de uno, la de delante y la de detrás. */
  private ahora: [number, number, number] = [0, 0, 0];
  /** Y a dónde va la de uno, que es la única que se toca. */
  private propia = 0;
  private enCrucero = 0;
  private preparadaDesde = 0;
  private yaPreparada = false;
  private luzAhora: number = LUZ_DE_NOCHE.embarcando;
  private respingo = 0;

  constructor(tipo: TipoDeVentanilla = "persiana", azar: Azar = Math.random) {
    this.tipo = tipo;
    this.reiniciar(tipo, azar);
  }

  /**
   * **Vuelo nuevo**: otro asiento, otros vecinos. Todo empieza subido y con
   * la cabina encendida, como se embarca.
   */
  reiniciar(tipo: TipoDeVentanilla, azar: Azar = Math.random): void {
    this.tipo = tipo;
    // Una columna en un lado como mucho: dos seguidas no las hay.
    const columna = azar() < COLUMNA ? (azar() < 0.5 ? "delante" : "detras") : null;
    this.vecindad = { delante: columna !== "delante", detras: columna !== "detras" };
    const pasos = tipo === "persiana" ? PASOS_DE_LA_PERSIANA : PASOS_DEL_CRISTAL;
    const vecino = (): Vecino => ({
      // La mitad de las veces la deja como está; la otra, la baja algo.
      quiere: azar() < 0.5 ? 0 : (pasos[1 + Math.floor(azar() * (pasos.length - 1))] ?? 0),
      tarda: 20 + azar() * 70,
      reacciona: 0.4 + azar() * 2.6,
    });
    this.vecinos = [vecino(), vecino()];
    this.ahora = [0, 0, 0];
    this.propia = 0;
    this.enCrucero = 0;
    this.preparadaDesde = 0;
    this.yaPreparada = false;
    this.luzAhora = LUZ_DE_NOCHE.embarcando;
    this.respingo = 0;
  }

  get tipoDeVentanilla(): TipoDeVentanilla {
    return this.tipo;
  }

  /** Qué ventanillas hay al lado. Ver `Vecinas`. */
  get vecinas(): Vecinas {
    return this.vecindad;
  }

  /**
   * **Cuánto tapa cada una**, de 0 —clara, la persiana arriba— a 1 —bajada
   * del todo, o el cristal en su tono más oscuro—: la de uno, la de delante
   * y la de detrás. La de uno lleva el respingo encima.
   */
  get tapan(): readonly [number, number, number] {
    const r = Math.sin(Math.PI * Math.min(1, this.respingo / DURA_EL_RESPINGO));
    const propia =
      this.tipo === "persiana" ? Math.min(1, this.ahora[0] + 0.12 * r) : this.ahora[0];
    return [propia, this.ahora[1], this.ahora[2]];
  }

  /** El respingo de ahora, de 0 a 1: para que el botón del cristal parpadee. */
  get parpadeo(): number {
    return this.respingo > 0 ? Math.sin(Math.PI * (this.respingo / DURA_EL_RESPINGO)) : 0;
  }

  /** Las luces de la cabina de noche, de 0 a 1. Ver `LUZ_DE_NOCHE`. */
  get luz(): number {
    return this.luzAhora;
  }

  /** Si ahora la ventanilla no se deja tocar: la cabina va preparada. */
  get bloqueada(): boolean {
    return this.yaPreparada;
  }

  /**
   * **Un toque en la ventanilla**: la persiana baja un paso, o el cristal se
   * oscurece un tono, y al final vuelve a estar clara.
   *
   * Con la cabina preparada no se puede: la persiana da un respingo y vuelve
   * arriba, o el botón del cristal parpadea y no pasa nada. Devuelve si
   * cambió algo.
   */
  tocar(): boolean {
    if (this.yaPreparada) {
      this.respingo = DURA_EL_RESPINGO;
      return false;
    }
    const pasos: readonly number[] =
      this.tipo === "persiana" ? PASOS_DE_LA_PERSIANA : PASOS_DEL_CRISTAL;
    const i = pasos.findIndex((p) => p > this.propia + 1e-3);
    this.propia = i < 0 ? 0 : pasos[i]!;
    return true;
  }

  /**
   * **Abrir la de uno para mirar algo**: la comandante señala y se toca la
   * tarjeta, y lo primero que hace cualquiera es subir la persiana. Si no se
   * puede tocar es que ya está clara.
   */
  abrir(): void {
    if (!this.yaPreparada) this.propia = 0;
  }

  /**
   * Un paso del reloj.
   *
   * `preparada` es lo de `cabinaPreparada`; `enLaPuerta`, si se está
   * embarcando o desembarcando, que es cuando la cabina va encendida.
   */
  paso(dt: number, preparada: boolean, enLaPuerta: boolean): void {
    if (!(dt > 0)) return;
    if (preparada && !this.yaPreparada) {
      // Se prepara la cabina: lo de uno arriba, y se olvida lo que se quería.
      this.preparadaDesde = 0;
      this.propia = 0;
    }
    this.yaPreparada = preparada;
    this.respingo = Math.max(0, this.respingo - dt);
    if (preparada) {
      this.preparadaDesde += dt;
      this.enCrucero = 0;
    } else if (!enLaPuerta) {
      this.enCrucero += dt;
    }

    const tarda = TARDA[this.tipo];
    const metas: [number, number, number] = [this.propia, 0, 0];
    for (let i = 0; i < 2; i++) {
      const v = this.vecinos[i]!;
      if (preparada) {
        /*
         * Con persiana, cada vecino la sube a su ritmo cuando se lo piden;
         * con cristal, la tripulación las aclara todas a la vez y ahí no
         * espera nadie.
         */
        const espera = this.tipo === "persiana" ? v.reacciona : 0;
        metas[i + 1] = this.preparadaDesde < espera ? this.ahora[i + 1]! : 0;
      } else {
        metas[i + 1] = this.enCrucero >= v.tarda ? v.quiere : this.ahora[i + 1]!;
      }
    }
    // Con persiana, la de uno también se sube con un momento de retraso: la
    // sube quien va sentado, no un motor.
    if (preparada && this.tipo === "persiana" && this.preparadaDesde < 0.6)
      metas[0] = this.ahora[0];
    for (let i = 0; i < 3; i++) {
      const d = metas[i]! - this.ahora[i]!;
      const paso = dt / tarda;
      this.ahora[i] = Math.abs(d) <= paso ? metas[i]! : this.ahora[i]! + Math.sign(d) * paso;
    }

    const luz = preparada
      ? LUZ_DE_NOCHE.preparada
      : enLaPuerta
        ? LUZ_DE_NOCHE.embarcando
        : LUZ_DE_NOCHE.crucero;
    const k = 1 - Math.exp(-dt * (3 / TARDAN_LAS_LUCES));
    this.luzAhora += (luz - this.luzAhora) * k;
  }
}

/** Si una fase es de la puerta: embarcando o desembarcando. */
export function enLaPuerta(fase: Fase): boolean {
  return EN_LA_PUERTA.has(fase);
}
