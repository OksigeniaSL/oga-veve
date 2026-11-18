/**
 * **El pitot que se hiela en nube fría**, y «El pitot se hiela»: el
 * ejercicio del tubo pitot de #51 (ADR 0031, enmienda H26s).
 *
 * «Tubo pitot que se hiela en nube fría, con la velocidad congelada mientras
 * el avión claramente acelera.» El velocímetro no mide la velocidad: mide la
 * diferencia entre la presión que entra por la boca del pitot y la estática
 * del costado. Si el hielo cierra el tubo, el instrumento no se entera y no
 * avisa: sigue marcando lo que dice el aire encerrado. Que la aguja mienta es
 * la lección, y lo que se mira entonces son la actitud y el gas.
 *
 * ## Qué fallo es, y de dónde sale
 *
 * El *Pilot's Handbook of Aeronautical Knowledge* de la FAA (FAA-H-8083-25C,
 * capítulo 8, *Blocked Pitot System*) cuenta los dos:
 *
 * - **La boca tapada y el drenaje abierto**: el aire de dentro se escapa por
 *   el agujerito de atrás, la presión del tubo baja a la estática y **la
 *   aguja cae a cero**. Es el de la funda olvidada, que tapa la boca y deja
 *   el drenaje libre: `anemometro-tapado.ts`.
 * - **La boca y el drenaje tapados a la vez**: la presión queda encerrada en
 *   el tubo y **la aguja no se mueve aunque la velocidad suba o baje**; con
 *   la estática libre, marca de más al subir y de menos al bajar, **como un
 *   altímetro**.
 *
 * **En la nube fría es el segundo**, y por eso es el de aquí. La funda tapa
 * solo la boca; el hielo de una nube de gotas subfundidas crece sobre todo
 * el tubo y cierra también el agujerito del drenaje, que es más pequeño que
 * la boca. Es lo que pasó en el vuelo 6231 de Northwest (NTSB AAR-75-13,
 * 1974): subiendo en nube con la calefacción de las sondas apagada, el hielo
 * tapó las bocas y los drenajes, y los velocímetros marcaron cada vez más al
 * subir, como altímetros. Y es justo la frase del issue: con el avión en
 * nivel y más gas, acelera de verdad y la aguja se queda quieta.
 *
 * **Cuándo se hiela**: con humedad visible —dentro de la nube— y el aire de
 * fuera entre cero y unos veinte bajo cero, que es donde las gotas de una
 * nube siguen siendo agua y se congelan al tocar (FAA, AC 91-74B, *Pilot
 * Guide: Flight in Icing Conditions*). La temperatura es la del juego, la de
 * `temperaturaExterior` con el aire del día; la nube, la capa del cielo.
 *
 * ## El remedio
 *
 * **La calefacción del pitot**: una resistencia en el tubo que lo mantiene
 * caliente. Se prende antes de entrar en nube; si ya se heló, derrite el
 * hielo en un rato y la aguja vuelve. El manual la da como el remedio, y la
 * norma la pide en todo avión que vuele por instrumentos (14 CFR 23.1323(e),
 * en la redacción de antes de 2017: un pitot calentado o algo equivalente
 * contra el hielo). Sin ella, se sale de la nube a aire de más de cero y se
 * vuela con la actitud y el gas hasta que se derrita.
 *
 * Los tiempos no salen de ningún manual: dependen del hielo y de la
 * resistencia. `SE_TAPA` y `SE_DESTAPA` son los de un ejercicio que se ve
 * entero en un par de minutos, y van escritos como lo que son.
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de cinemática
 * (`pitot-helado.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import { SEA_LEVEL_DENSITY } from "./atmosphere";

// ── El instrumento ───────────────────────────────────────────────────────

/** Por encima de esto, °C, la gota no se congela al tocar. */
export const HIELA_POR_DEBAJO_DE = 0;
/** Por debajo de esto, °C, la nube es casi toda de cristales, que rebotan y no se pegan. */
export const HIELA_POR_ENCIMA_DE = -20;
/** **Dentro de la nube**: lo que dice `cuantoDentro`, de 0 a 1, a partir de lo cual hay humedad visible. */
export const EN_LA_NUBE = 0.3;
/** Lo que tarda el hielo en cerrar el tubo, s, en nube fría y sin calefacción. Ver la cabecera. */
export const SE_TAPA = 20;
/** Lo que tarda la calefacción en derretirlo, s. */
export const SE_DESTAPA = 25;
/** Lo que tarda en derretirse solo, s, fuera de la nube y con el aire de más de cero. */
export const SE_DERRITE = 60;

/** **Si se hiela aquí**: humedad visible y el aire entre cero y veinte bajo cero. */
export function hayHielo(enNube: number, oat: number): boolean {
  return enNube >= EN_LA_NUBE && oat <= HIELA_POR_DEBAJO_DE && oat >= HIELA_POR_ENCIMA_DE;
}

/** Lo que el pitot mira del aire en cada paso. */
export interface AireDelPitot {
  /** Cuánta nube hay donde está, de 0 a 1. Ver `cuantoDentro` en `world/capa-de-nubes.ts`. */
  readonly enNube: number;
  /** El aire de fuera, °C. */
  readonly oat: number;
  /** Si la calefacción del pitot está prendida. */
  readonly calefaccion: boolean;
  /** **La indicada de verdad**, m/s: la que marcaría un pitot limpio. */
  readonly indicada: number;
  /** La presión estática donde está, Pa. */
  readonly estatica: number;
}

export type SucesoDelPitot = "seTapo" | "seDestapo";

/**
 * **El pitot con su hielo**: cuánto hielo lleva, de 0 a 1, y la presión que
 * quedó encerrada al cerrarse. Con el tubo cerrado, lo que marca sale de esa
 * presión contra la estática de ahora: quieta en nivel, de más al subir y de
 * menos al bajar.
 */
export class PitotHelado {
  private hielo = 0;
  private encerrada: number | null = null;

  /** Si el hielo tiene el tubo cerrado. */
  get tapado(): boolean {
    return this.encerrada !== null;
  }

  /** Cuánto hielo lleva, de 0 a 1. */
  get cuanto(): number {
    return this.hielo;
  }

  reiniciar(): void {
    this.hielo = 0;
    this.encerrada = null;
  }

  paso(a: AireDelPitot, dt: number): SucesoDelPitot | null {
    if (a.calefaccion) this.hielo -= dt / SE_DESTAPA;
    else if (hayHielo(a.enNube, a.oat)) this.hielo += dt / SE_TAPA;
    else if (a.oat > HIELA_POR_DEBAJO_DE) this.hielo -= dt / SE_DERRITE;
    // Fuera de la nube y bajo cero, el hielo que hay se queda: no hay con qué derretirlo.
    this.hielo = Math.min(1, Math.max(0, this.hielo));
    if (this.encerrada === null && this.hielo >= 1) {
      // La presión total de ese momento: la estática más la de impacto de la indicada.
      this.encerrada = a.estatica + 0.5 * SEA_LEVEL_DENSITY * a.indicada * a.indicada;
      return "seTapo";
    }
    if (this.encerrada !== null && this.hielo <= 0) {
      this.encerrada = null;
      return "seDestapo";
    }
    return null;
  }

  /** **Lo que marca la aguja**, m/s: la de verdad con el tubo limpio; la del aire encerrado, cerrado. */
  marca(indicada: number, estatica: number): number {
    if (this.encerrada === null) return indicada;
    return Math.sqrt((2 * Math.max(0, this.encerrada - estatica)) / SEA_LEVEL_DENSITY);
  }
}

// ── Dónde empieza ────────────────────────────────────────────────────────

/**
 * **El frío de la nube del ejercicio**, °C: cinco bajo cero, en medio de lo
 * que hiela y lejos de los dos bordes, para que lo que baje o suba el avión
 * al dar gas no lo saque del hielo.
 */
export const FRIO_DE_LA_NUBE = -5;
/** Lo que queda la base de la nube por debajo del avión al empezar, m: se empieza dentro. */
export const DENTRO_DE_LA_NUBE = 150;

/**
 * **A qué altitud hace ese frío hoy**, m sobre el mar, con la temperatura del
 * día: se busca en `temperatura`, que baja al subir. Sin pasar de `tope`, el
 * techo de quien vuela; si ahí arriba todavía no hiela, se queda en el tope y
 * el ejercicio lo dice (`calido`).
 */
export function alturaDelFrio(temperatura: (altitud: number) => number, tope: number, frio = FRIO_DE_LA_NUBE): number {
  if (temperatura(tope) > frio) return tope;
  let bajo = 0;
  let alto = tope;
  for (let i = 0; i < 40; i++) {
    const medio = (bajo + alto) / 2;
    if (temperatura(medio) > frio) bajo = medio;
    else alto = medio;
  }
  return alto;
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/** Lo que el ejercicio mira del vuelo en cada paso. */
export interface LecturaDelPitot {
  /** La indicada de verdad, m/s. */
  readonly indicada: number;
  /** **Lo que marca la aguja**, m/s. */
  readonly marca: number;
  readonly tapado: boolean;
  readonly calefaccion: boolean;
  /** El aire de fuera, °C. */
  readonly oat: number;
  /** Cuánta nube hay donde está, de 0 a 1. */
  readonly enNube: number;
  readonly enElSuelo: boolean;
  readonly parado: boolean;
  readonly percance: boolean;
}

/**
 * Cómo acaba: `hecho`, con la aguja de vuelta o con la calefacción prendida
 * antes del hielo; `calido`, si hoy no hace frío arriba para que se hiele;
 * `otraVez`, en el suelo o con percance.
 */
export type CierreDelPitot = "hecho" | "calido" | "otraVez";

export type SucesoDelPitotHelado =
  /** Dentro de la nube, con el frío de fuera, °C. */
  | { readonly que: "presentar"; readonly oat: number }
  /** Se cerró el tubo: se pide todo el gas, en nivel. */
  | { readonly que: "gas" }
  /** **Acelera y la aguja no**: lo de verdad y lo que marca, m/s. */
  | { readonly que: "acelera"; readonly deVerdad: number; readonly marca: number }
  /** Se pide la calefacción del pitot. */
  | { readonly que: "calefaccion" }
  /** El hielo se derritió: la aguja vuelve a lo de verdad, m/s. */
  | { readonly que: "volvio"; readonly marca: number }
  /** La calefacción se prendió antes del hielo: no se hiela. */
  | { readonly que: "prevenido" }
  /** Hoy no hace frío arriba: el aire de fuera, °C. */
  | { readonly que: "calido"; readonly oat: number }
  | { readonly que: "cerrar"; readonly como: CierreDelPitot };

export type FaseDelPitot = "enLaNube" | "tapado" | "calentando" | "cerrada";

/** Lo que se espera a que el tubo se cierre antes de decir que hoy no hiela, s. */
export const ESPERA_AL_HIELO = SE_TAPA + 15;
/** Lo que se deja entre el tubo cerrado y pedir el gas, s: que se vea la aguja quieta. */
export const ANTES_DEL_GAS = 4;
/**
 * **Acelera y la aguja no**: diez nudos de diferencia, m/s. Una raya larga
 * de la esfera, que se ve sin leer, y lo que gana con todo el gas en unos
 * segundos el bimotor que vuela este ejercicio.
 */
export const SE_NOTA = 10 * 0.514444;
/** Lo que se deja decir «acelera» antes de pedir la calefacción, s: un suceso, una voz. */
export const ANTES_DE_PEDIR = 7;
/** Si no acelera en este rato después de pedir el gas, s, se pide igual la calefacción. */
export const ESPERA_AL_GAS = 30;

export class ElPitotHelado {
  private faseActual: FaseDelPitot = "enLaNube";
  private presentada = false;
  private comoCerro: CierreDelPitot | null = null;
  private reloj = 0;
  private desdeQueSeTapo = 0;
  private pedidoElGas = false;
  private dijoAcelera = false;
  private desdeQueAcelera = 0;
  private pedidaLaCalefaccion = false;
  private volvioA: number | null = null;

  constructor(readonly ejercicio: Ejercicio) {}

  get fase(): FaseDelPitot {
    return this.faseActual;
  }

  get cierre(): CierreDelPitot | null {
    return this.comoCerro;
  }

  /** Si ya se pidió la calefacción: la tarjeta lleva entonces el interruptor. */
  get pideLaCalefaccion(): boolean {
    return this.pedidaLaCalefaccion && this.faseActual === "tapado";
  }

  /** Lo que marcó la aguja al volver, m/s. */
  get volvio(): number | null {
    return this.volvioA;
  }

  reiniciar(): void {
    this.faseActual = "enLaNube";
    this.presentada = false;
    this.comoCerro = null;
    this.reloj = 0;
    this.desdeQueSeTapo = 0;
    this.pedidoElGas = false;
    this.dijoAcelera = false;
    this.desdeQueAcelera = 0;
    this.pedidaLaCalefaccion = false;
    this.volvioA = null;
  }

  paso(l: LecturaDelPitot, dt: number): SucesoDelPitotHelado[] {
    const sucesos: SucesoDelPitotHelado[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar", oat: l.oat });
    }
    if (l.percance || (l.enElSuelo && l.parado)) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }
    this.reloj += dt;

    if (this.faseActual === "enLaNube") {
      if (l.tapado) {
        this.faseActual = "tapado";
        this.desdeQueSeTapo = 0;
        return sucesos;
      }
      // **Prevenido**: prenderla antes de que se hiele es lo que se hace de verdad, y se felicita.
      if (l.calefaccion) {
        sucesos.push({ que: "prevenido" });
        this.cerrar("hecho", sucesos);
        return sucesos;
      }
      if (this.reloj >= ESPERA_AL_HIELO) {
        sucesos.push({ que: "calido", oat: l.oat });
        this.cerrar("calido", sucesos);
      }
      return sucesos;
    }

    if (this.faseActual === "tapado") {
      this.desdeQueSeTapo += dt;
      if (l.calefaccion) {
        this.faseActual = "calentando";
        return sucesos;
      }
      if (!this.pedidoElGas) {
        if (this.desdeQueSeTapo < ANTES_DEL_GAS) return sucesos;
        this.pedidoElGas = true;
        sucesos.push({ que: "gas" });
        return sucesos;
      }
      if (!this.dijoAcelera) {
        if (l.indicada - l.marca >= SE_NOTA) {
          this.dijoAcelera = true;
          this.desdeQueAcelera = 0;
          sucesos.push({ que: "acelera", deVerdad: l.indicada, marca: l.marca });
        } else if (this.desdeQueSeTapo >= ANTES_DEL_GAS + ESPERA_AL_GAS) {
          // Sin gas no se ve acelerar, pero la aguja sigue quieta: se sigue.
          this.dijoAcelera = true;
          this.desdeQueAcelera = ANTES_DE_PEDIR;
        }
        return sucesos;
      }
      this.desdeQueAcelera += dt;
      if (!this.pedidaLaCalefaccion && this.desdeQueAcelera >= ANTES_DE_PEDIR) {
        this.pedidaLaCalefaccion = true;
        sucesos.push({ que: "calefaccion" });
      }
      return sucesos;
    }

    // ── Calentando: hasta que el hielo se derrite y la aguja vuelve ──
    if (!l.tapado) {
      this.volvioA = l.marca;
      sucesos.push({ que: "volvio", marca: l.marca });
      this.cerrar("hecho", sucesos);
    } else if (!l.calefaccion) {
      // La apagó otra vez: el hielo vuelve a crecer, y se vuelve a esperar a que la prenda.
      this.faseActual = "tapado";
    }
    return sucesos;
  }

  private cerrar(como: CierreDelPitot, sucesos: SucesoDelPitotHelado[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}
