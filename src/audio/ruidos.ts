/**
 * **Los ruidos de un vuelo**: qué suena, cuánto, y desde dónde se oye.
 *
 * Pedido volando con lluvia en Tenerife Norte:
 *
 * > «Se escucha llover; pero dentro de un avión, ¿cómo se escucha la lluvia?
 * > ¿Y el granizo? […] No es lo mismo cómo suena en rodadura, que hasta los
 * > baches de la pista se oyen […]. Y el tren de aterrizaje, que en algunos se
 * > escucha como si les hiciera falta 3 en 1 y en otros ni te enteras.»
 *
 * Y aprobada la lista entera: la lluvia según dónde se esté, el granizo, la
 * rodadura con sus juntas, el tren, el chirrido al tocar, el viento con la
 * velocidad, las reversas y los aerofrenos, los flaps, el *ding* del cartel y
 * la APU con el aire de la cabina.
 *
 * ## Tres cosas deciden cada ruido
 *
 * - **Dónde está quien escucha.** Fuera se oye el avión entero; en la cabina
 *   de mando, el parabrisas, la rueda de morro y poco más de lo de fuera; en
 *   el pasaje, el ala, el tren principal y un fuselaje que se come los
 *   agudos. Ver `Oido`.
 * - **Qué avión es.** Lo dice su ficha —`RuidosDelAvion`— y cada dato es un
 *   hecho de su clase: un entrenador no lleva limpias ni APU, y si sonaran
 *   serían mentira.
 * - **Qué está pasando**: la velocidad, el suelo, el tiempo, los mandos.
 *
 * ## Por qué esto es aparte de `audio.ts`
 *
 * Aquí está todo lo que se decide y nada de lo que suena: números de 0 a 1,
 * sin un solo nodo de Web Audio. Es lo único del sonido que se puede probar
 * sin un navegador, y es justo lo que hay que probar: que en la cabina se oiga
 * el parabrisas y en el pasaje no, que el tren fijo no suene a tren, que el
 * granizo pegue más que la lluvia. Los nodos están en `ruidos-en-el-aire.ts`.
 *
 * ## Las tres reglas de siempre
 *
 * - **Ningún ruido es el único canal.** Todo lo que suena aquí acompaña algo
 *   que se ve: la lluvia en el parabrisas, las luces del tren, la aguja de
 *   flaps, el cartel del cinturón, la mancha magenta del radar.
 * - **Nada asusta sin necesidad.** El granizo impresiona porque es así, pero
 *   va a su fuerza de verdad, no a más.
 * - **Los ruidos no pisan una voz.** Van todos por el bus de ambiente, que se
 *   agacha diez decibelios cuando habla alguien. Ver `audio/mezcla.ts`.
 */

import {
  tieneReversa,
  type AircraftConfig,
  type AircraftSound,
  type RuidosDelAvion,
} from "../flight/aircraft";
import type { CameraMode } from "../cameras";
import type { Lluvia } from "../world/meteo";
import { FIRME_LISO, type Firme } from "../world/firme";

/** Desde dónde se escucha. */
export type Oido = "fuera" | "cabina" | "pasaje";

/**
 * De la vista que se está mirando a desde dónde se oye.
 *
 * La de pájaro es la cabina **sin avión** —«como si tú fueras el pájaro»—, y
 * un pájaro no oye el parabrisas desde dentro: va por fuera.
 */
export function oidoDe(vista: CameraMode): Oido {
  if (vista === "cockpit") return "cabina";
  if (vista === "pasaje-izquierda" || vista === "pasaje-derecha") return "pasaje";
  return "fuera";
}

/** Lo que el oído necesita saber de un avión, sacado de su ficha. */
export interface AvionQueSuena {
  readonly ruidos: RuidosDelAvion;
  readonly motor: AircraftSound["engine"];
  /** kg. Decide el timbre de lo que golpea: rueda pequeña, golpe agudo. */
  readonly masa: number;
  /** Del tren de morro al principal, m: lo que separa el «tro» del «cotó». */
  readonly batalla: number;
  readonly reversa: boolean;
  readonly aerofrenos: boolean;
  readonly trenRetractil: boolean;
}

export function avionQueSuena(ac: AircraftConfig): AvionQueSuena {
  return {
    ruidos: ac.sound.ruidos,
    motor: ac.sound.engine,
    masa: ac.mass,
    batalla: ac.batalla,
    reversa: tieneReversa(ac),
    aerofrenos: ac.aerofrenos !== null,
    trenRetractil: ac.trenRetractil,
  };
}

/** Lo que pasa en este fotograma, en unidades del sistema. */
export interface LoQuePasa {
  readonly oido: Oido;
  /** Velocidad respecto al aire, m/s: la que hace el viento y la lluvia. */
  readonly ias: number;
  /** Respecto al suelo, m/s: la que pisa las juntas. */
  readonly gs: number;
  readonly enElSuelo: boolean;
  /** Velocidad vertical, m/s, positiva hacia arriba. */
  readonly vs: number;
  /** Ángulo de derrape, rad: volar de lado hace más viento. */
  readonly derrape: number;
  readonly motor: boolean;
  readonly gas: number;
  /** Dónde está el tren: 0 dentro, 1 fuera y trabado. */
  readonly tren: number;
  /** Y los flaps: 0 recogidos, 1 abajo del todo. */
  readonly flaps: number;
  readonly reversa: number;
  /** Los paneles de arriba del ala, los de vuelo o los de tierra: el que más. */
  readonly aerofrenos: number;
  readonly lluvia: {
    readonly clase: Lluvia;
    readonly fuerza: number;
    /** Cuánta cae donde está el avión, de 0 a 1. */
    readonly aqui: number;
  };
  /** Cuánto graniza donde está el avión, de 0 a 1. */
  readonly granizo: number;
  readonly firme: Firme;
  /** El traqueteo de la superficie: asfalto 1, hierba 1,8, campo 3. */
  readonly traqueteo: number;
}

/**
 * Cuánto tiene que sonar cada capa ahora mismo.
 *
 * Los niveles van de cero a uno —alguno pasa de uno, y es a propósito: el
 * granizo pega más que la lluvia más fuerte— y quien los convierte en
 * ganancia es el grafo, con su calibración. Así lo que se compara aquí es lo
 * que se quiere oír, no lo que hace falta para oírlo.
 */
export interface Niveles {
  /**
   * Hasta dónde deja pasar los agudos de fuera el fuselaje, Hz. Fuera, todo;
   * dentro, cada vez menos cuanto más aísla el avión.
   */
  readonly pared: number;
  readonly lluvia: {
    /** El siseo y el cuerpo de la lluvia de fuera, como sonaba siempre. */
    readonly siseo: number;
    readonly cuerpo: number;
    readonly cuerpoHz: number;
    /** Las gotas que pegan donde está quien escucha: el parabrisas, el techo. */
    readonly gotas: number;
    /** Cuántas por segundo. */
    readonly ritmo: number;
    /** Y a qué suenan: cristal agudo o chapa forrada. */
    readonly tono: number;
    /** Cuánto de tambor, de 0 a 1: el golpe grave del agua contra el morro. */
    readonly tambor: number;
  };
  readonly limpias: { readonly nivel: number; readonly barridas: number };
  readonly granizo: { readonly nivel: number; readonly ritmo: number };
  readonly rodadura: {
    /** El rodar continuo, que ya existía. */
    readonly rumor: number;
    /** Las juntas, con su compás: cada cuánto, en segundos. */
    readonly juntas: number;
    readonly cada: number;
    /** Lo que pega la rueda de morro y lo que pegan las principales. */
    readonly morro: number;
    readonly principal: number;
    /** Y cuánto tarda la principal en pisar la junta que pisó el morro, s. */
    readonly retardo: number;
    readonly irregular: number;
    /** Los golpes sueltos, y cada cuánto de media, s. */
    readonly baches: number;
    readonly cadaBache: number;
    /** El tono del golpe, Hz: rueda pequeña, golpe agudo. */
    readonly tono: number;
  };
  readonly viento: {
    readonly nivel: number;
    /** Cuánto silba, en decibelios del filtro: fuera mucho, dentro poco. */
    readonly silbido: number;
    readonly silbidoHz: number;
    readonly cuerpoHz: number;
  };
  readonly tren: {
    /** El aire en las patas fuera. */
    readonly patas: number;
    /** El motor o la bomba que lo mueve, mientras se mueve. */
    readonly motor: number;
    readonly tono: number;
  };
  readonly reversa: number;
  /** Las vueltas que hay que oír en el motor: con la reversa, suben. */
  readonly gasDelMotor: number;
  readonly aerofrenos: number;
  readonly flaps: { readonly nivel: number; readonly tono: number };
  /** La APU, y lo girada que está: su silbido sube al arrancar. */
  readonly apu: { readonly nivel: number; readonly giro: number };
  /** El aire de la cabina: los packs o los ventiladores. */
  readonly aire: number;
}

/** Un ruido de un golpe, que no dura: se toca y se acaba. */
export type Suceso =
  | {
      readonly que: "toque";
      /** El chirrido de las ruedas al ponerse a girar de golpe. */
      readonly chirrido: number;
      /** Y el golpe del tren al comerse el descenso. */
      readonly golpe: number;
      /** A qué velocidad se toca la muestra: rueda grande, más grave. */
      readonly tono: number;
    }
  | {
      readonly que: "tren";
      readonly como: "suelta" | "fuera" | "dentro";
      readonly fuerza: number;
    }
  | { readonly que: "reversa"; readonly fuerza: number };

// ── Cuentas sueltas, con su porqué ─────────────────────────────────────────

const entre0y1 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * La velocidad a la que el viento sonaba a tope, m/s. Ciento cuarenta y cinco
 * nudos: el crucero de una avioneta y la final de un reactor.
 */
export const VIENTO_DE_REFERENCIA = 75;

/**
 * **El viento crece con la velocidad, y no se para en los ciento cuarenta y
 * cinco nudos.**
 *
 * Subía con el cuadrado de la velocidad y se plantaba en setenta y cinco
 * metros por segundo: un reactor sonaba igual a ciento cincuenta nudos que a
 * trescientos, y es justo al revés —el ruido del aire contra el fuselaje
 * crece con la quinta o la sexta potencia de la velocidad, y a trescientos
 * nudos es lo que más se oye en una cabina de mando—.
 *
 * Hasta setenta y cinco, lo mismo de siempre, que era lo que sonaba bien en
 * las avionetas. Por encima sigue subiendo, más despacio: un altavoz de
 * tablet no tiene los cuarenta decibelios que separan de verdad las dos
 * velocidades, y lo que hay que oír es que **sigue creciendo**.
 */
export function curvaDelViento(ias: number): number {
  const v = Math.max(0, ias) / VIENTO_DE_REFERENCIA;
  if (v <= 1) return v * v;
  return 1 + 0.6 * Math.log2(v);
}

/**
 * Hasta qué frecuencia deja pasar el fuselaje lo de fuera, Hz.
 *
 * Una pared no baja el volumen por igual: se come los agudos y deja los
 * graves. Por eso dentro de un avión la lluvia es un siseo apagado y el
 * viento un rumor. Cuanto más aísla el avión, más abajo corta.
 */
export function corteDeLaPared(oido: Oido, aislamiento: number): number {
  const a = entre0y1(aislamiento);
  if (oido === "fuera") return 18000;
  if (oido === "cabina") return 4200 - 2400 * a;
  return 2400 - 1300 * a;
}

/** Y cuánto de lo de fuera pasa dentro, en amplitud. */
export function loQuePasaDentro(oido: Oido, aislamiento: number): number {
  if (oido === "fuera") return 1;
  const base = oido === "cabina" ? 0.85 : 0.7;
  return base * (1 - 0.45 * entre0y1(aislamiento));
}

/** Cuánta lluvia, de 0 a 1: la clase, la fuerza y lo que cae aquí. */
export function cuantaLluvia(clase: Lluvia, fuerza: number, aqui: number): number {
  const cae = (clase === "nada" ? 0 : clase === "llovizna" ? 0.35 : 1) * entre0y1(aqui);
  return cae * (0.35 + 0.65 * entre0y1(fuerza));
}

/**
 * Hasta qué velocidad van los limpias, m/s: unos doscientos treinta nudos.
 *
 * Por encima el aire limpia solo el parabrisas y el brazo no aguanta el
 * empuje: los fabricantes ponen el tope del orden de los doscientos y pico
 * nudos, y se usan en tierra, en el despegue y en la aproximación.
 */
export const LIMPIAS_HASTA = 118;

/**
 * El tono del golpe de una rueda, Hz: cuanto más grande el avión, más grave.
 *
 * Doscientos cincuenta en una avioneta, que tiene ruedas de carretilla y
 * patas de ballesta; setenta y pico en el cuatrimotor, que pisa con dieciocho
 * ruedas de metro y pico. La cuenta es una potencia de la masa porque el
 * tamaño de la rueda crece con ella mucho más despacio que el peso.
 */
export function tonoDelGolpe(masa: number): number {
  return 260 / Math.pow(Math.max(500, masa) / 1000, 0.22);
}

/** Y la velocidad a la que se toca el chirrido grabado en memoria: lo mismo. */
export function tonoDelChirrido(masa: number): number {
  return 1.35 * Math.pow(Math.max(500, masa) / 1000, -0.11);
}

/**
 * **Lo que pega el *ding* del cartel del cinturón** según dónde se esté.
 *
 * Suena en el techo del pasaje: ahí es donde está y ahí es a tope. En la
 * cabina de mando se oye por la puerta, y desde fuera menos todavía. No se
 * apaga del todo en ninguna vista porque el cartel ya va en pantalla y el
 * timbre lo acompaña, y quitarlo fuera sería quitar un canal sin ganar nada.
 */
export function fuerzaDelCinturon(oido: Oido): number {
  return oido === "pasaje" ? 1 : oido === "cabina" ? 0.7 : 0.45;
}

/** Por vista, en el orden fuera, cabina, pasaje. */
const porVista = (oido: Oido, fuera: number, cabina: number, pasaje: number): number =>
  oido === "fuera" ? fuera : oido === "cabina" ? cabina : pasaje;

/**
 * **El oído del vuelo**: lo que tiene memoria.
 *
 * Casi todo sale del fotograma, pero no todo. El tren suena al **cambiar**, el
 * chirrido depende de lo que giraban las ruedas **antes** de tocar, y la APU
 * se queda apagada desde que se rueda hasta que se paran los motores. Eso es
 * lo que guarda esta clase, y nada más.
 */
export class OidoDelVuelo {
  private avion: AvionQueSuena;
  private antes: {
    tren: number;
    flaps: number;
    enElSuelo: boolean;
    reversa: boolean;
    vs: number;
  } | null = null;
  /**
   * Lo que giran las ruedas, en m/s de su borde.
   *
   * En el suelo, lo que corre el avión. En el aire se van frenando solas —o
   * de golpe, en el tren que se mete: se frenan antes de entrar al pozo—. Al
   * tocar, la diferencia entre esto y la velocidad es lo que chirría: por eso
   * un rebote chirría menos que el primer toque.
   */
  private giro = 0;
  /** Si la APU está pedida, y lo girada que está de 0 a 1. */
  private apuPedida = false;
  private apuGiro = 0;
  /**
   * Si ya se rodó con los motores en marcha: desde ahí la APU se queda
   * apagada hasta que se paran. Ver `pedirLaApu`.
   */
  private yaSeRodo = false;

  constructor(avion: AvionQueSuena) {
    this.avion = avion;
  }

  /** Otro avión: se empieza de cero. */
  ponerAvion(avion: AvionQueSuena): void {
    this.avion = avion;
    this.antes = null;
    this.giro = 0;
    this.apuPedida = false;
    this.apuGiro = 0;
    this.yaSeRodo = false;
  }

  /** Lo girada que está la APU ahora, para el banco y las pruebas. */
  get giroDeLaApu(): number {
    return this.apuGiro;
  }

  paso(dt: number, p: LoQuePasa): { niveles: Niveles; sucesos: Suceso[] } {
    const a = this.avion;
    const r = a.ruidos;
    const sucesos: Suceso[] = [];
    const antes = this.antes;
    // Un paso de tiempo raro —el primero, una pausa larga— no mueve nada.
    const t = dt > 0 && dt < 1 ? dt : 0;

    // ── El toque ───────────────────────────────────────────────────────
    const giroAntes = this.giro;
    if (p.enElSuelo) this.giro = p.gs;
    else if (a.trenRetractil && p.tren < 0.5) this.giro = 0;
    else this.giro *= Math.exp(-t / 20);
    if (antes && !antes.enElSuelo && p.enElSuelo) {
      /*
       * Lo que chirría es la rueda pasando de su giro al de la pista en una
       * fracción de segundo: la goma patina hasta que se pone a la par.
       * Más diferencia, más chirrido; y más peso encima, más agarre y más
       * humo. El descenso es el del paso anterior: en el del toque el modelo
       * ya lo ha dejado en cero.
       */
      const diferencia = Math.max(0, p.gs - giroAntes);
      const hundimiento = Math.max(0, -antes.vs);
      const chirrido =
        entre0y1(diferencia / 40) *
        (0.65 + 0.35 * entre0y1(hundimiento / 2)) *
        porVista(p.oido, 1, 0.35, 0.55);
      const golpe = entre0y1(hundimiento / 3) * porVista(p.oido, 0.4, 0.7, 1);
      if (chirrido > 0.02 || golpe > 0.02)
        sucesos.push({ que: "toque", chirrido, golpe, tono: tonoDelChirrido(a.masa) });
    }

    // ── El tren ────────────────────────────────────────────────────────
    let trenMoviendose = false;
    if (antes && r.tren > 0) {
      const d = p.tren - antes.tren;
      /*
       * Solo lo que se **mueve**: un salto grande de un fotograma a otro es
       * que se ha recolocado el avión, no que el tren haya bajado en un
       * instante, y eso no suena a nada.
       */
      if (d !== 0 && Math.abs(d) < 0.3) {
        trenMoviendose = p.tren > 0 && p.tren < 1;
        const fuerza = r.tren * porVista(p.oido, 0.55, 1, 0.9);
        if (antes.tren <= 0 && p.tren > 0)
          sucesos.push({ que: "tren", como: "suelta", fuerza: fuerza * 0.35 });
        else if (antes.tren >= 1 && p.tren < 1)
          sucesos.push({ que: "tren", como: "suelta", fuerza: fuerza * 0.35 });
        if (antes.tren < 1 && p.tren >= 1)
          sucesos.push({ que: "tren", como: "fuera", fuerza });
        else if (antes.tren > 0 && p.tren <= 0)
          sucesos.push({ que: "tren", como: "dentro", fuerza: fuerza * 0.7 });
      }
    }

    // ── La reversa ─────────────────────────────────────────────────────
    const reversaPuesta =
      a.reversa && p.motor && p.enElSuelo && p.reversa > 0 && p.gs > 12;
    /*
     * El golpe de las compuertas al abrirse es de reactor: un turbohélice no
     * tiene compuertas, gira las palas de su hélice y eso no da golpe.
     */
    if (antes && reversaPuesta && !antes.reversa && a.motor === "turbofan")
      sucesos.push({ que: "reversa", fuerza: porVista(p.oido, 0.4, 0.3, 0.5) });

    // ── Los flaps ──────────────────────────────────────────────────────
    const flapsMoviendose = !!antes && Math.abs(p.flaps - antes.flaps) > 1e-5;

    // ── La APU ─────────────────────────────────────────────────────────
    this.pedirLaApu(p);
    const objetivo = this.apuPedida ? 1 : 0;
    // Arranca en unos segundos y se apaga más despacio, que es lo que tarda
    // una turbina pequeña en perder vueltas.
    const tau = objetivo > this.apuGiro ? 2.5 : 4;
    this.apuGiro += (objetivo - this.apuGiro) * (1 - Math.exp(-t / tau));

    this.antes = {
      tren: p.tren,
      flaps: p.flaps,
      enElSuelo: p.enElSuelo,
      reversa: reversaPuesta,
      vs: p.vs,
    };

    return {
      niveles: this.niveles(p, trenMoviendose, flapsMoviendose, reversaPuesta),
      sucesos,
    };
  }

  /**
   * **Cuándo va la APU**: en el suelo con los motores parados, y mientras se
   * arranca y se empuja; no rodando.
   *
   * En un avión de verdad se arranca antes que los motores —es la que da el
   * aire para arrancarlos— y se apaga al poco de empezar a rodar. Al llegar
   * se arranca para parar los motores. Aquí: con los motores parados en el
   * suelo, va; y en cuanto se rueda con motores, se apaga y no vuelve hasta
   * que se paren. Así no se enciende sola en el punto de espera.
   */
  private pedirLaApu(p: LoQuePasa): void {
    if (!this.avion.ruidos.apu || !p.enElSuelo) {
      this.apuPedida = false;
      if (!p.enElSuelo) this.yaSeRodo = true;
      return;
    }
    if (!p.motor) {
      this.apuPedida = true;
      this.yaSeRodo = false;
      return;
    }
    if (p.gs > 3) this.yaSeRodo = true;
    if (this.yaSeRodo) this.apuPedida = false;
  }

  private niveles(
    p: LoQuePasa,
    trenMoviendose: boolean,
    flapsMoviendose: boolean,
    reversaPuesta: boolean,
  ): Niveles {
    const a = this.avion;
    const r = a.ruidos;
    const o = p.oido;
    const dentro = loQuePasaDentro(o, r.aislamiento);
    const suelo = p.enElSuelo;

    // ── La lluvia ──────────────────────────────────────────────────────
    const cuanta = cuantaLluvia(p.lluvia.clase, p.lluvia.fuerza, p.lluvia.aqui);
    const v60 = Math.min(1, Math.max(0, p.ias) / 60);
    /*
     * Fuera, la de siempre: siseo y cuerpo, y más cuanto más se corre. Dentro,
     * eso mismo entra por la pared —apagado, sin agudos— y encima suena lo que
     * pega donde está quien escucha.
     */
    const siseoDeFuera = cuanta * (0.35 + 0.65 * v60) * 0.5;
    const cuerpo =
      p.lluvia.clase === "llovizna" ? 0.05 : 0.35 + 0.3 * entre0y1(p.lluvia.fuerza);
    const cuerpoHz = 360 + 220 * v60;
    /*
     * **En el pasaje la lluvia apenas se oye en vuelo**: un siseo y algún
     * golpeteo por encima de los motores y del aire. En tierra y despacio sí,
     * que es cuando el agua cae sobre el techo y no la barre el viento.
     */
    const quieto = suelo ? 1 - Math.min(1, p.gs / 45) : 0;
    /*
     * **En la cabina de mando, contra el parabrisas, es un tamborileo fuerte y
     * continuo**, que crece con la velocidad: a doscientos por hora el agua
     * pega contra el cristal como grava.
     */
    const rapido = Math.min(1, Math.max(0, p.ias) / 70);
    const lluvia =
      o === "fuera"
        ? { siseo: siseoDeFuera, cuerpo, cuerpoHz, gotas: 0, ritmo: 0, tono: 2400, tambor: 0 }
        : o === "cabina"
          ? {
              siseo: cuanta * 0.5 * (0.25 + 0.35 * rapido) * dentro,
              cuerpo,
              cuerpoHz,
              gotas: cuanta * (0.25 + 0.75 * rapido),
              ritmo: 20 + 380 * cuanta * (0.25 + 0.75 * rapido),
              tono: 2600,
              tambor: 0.3 + 0.5 * rapido,
            }
          : {
              /*
               * Y en el pasaje, poco también en tierra. Enrique: «dentro de
               * un avión, oír llover, lo que se dice oír llover, pues no
               * tanto». Un siseo y alguna gota que se adivinan, la mitad que
               * antes con el avión quieto.
               */
              siseo: cuanta * 0.5 * (0.08 + 0.25 * quieto) * dentro,
              cuerpo,
              cuerpoHz,
              gotas: cuanta * (0.08 + 0.2 * quieto),
              ritmo: 3 + 25 * cuanta * (0.3 + 0.7 * quieto),
              tono: 1400,
              tambor: 0.5,
            };

    // ── Los limpias ────────────────────────────────────────────────────
    /*
     * Solo si el avión los lleva, si llueve encima, con corriente y por
     * debajo de su velocidad. Y solo se oyen desde la cabina: el motor está
     * debajo del parabrisas, y desde el pasaje o desde fuera no llega.
     */
    const limpiando =
      r.limpias && cuanta > 0 && p.motor && p.ias < LIMPIAS_HASTA;
    const limpias = {
      nivel: limpiando && o === "cabina" ? 1 : 0,
      // Lento con poca agua y rápido con mucha: los dos topes del mando.
      barridas: p.lluvia.clase === "llovizna" || p.lluvia.fuerza < 0.5 ? 0.7 : 1.15,
    };

    // ── El granizo ─────────────────────────────────────────────────────
    /*
     * **Mucho más fuerte que la lluvia**, y en todas las vistas: es piedra
     * contra chapa, y la chapa del fuselaje suena entera aunque se esté
     * dentro. Pero a su fuerza: el nivel más alto de la lluvia en la cabina
     * es uno, y el del granizo uno y medio. Lo que impresiona es el ruido,
     * no que se haya subido a propósito.
     */
    const g = entre0y1(p.granizo);
    const golpeo = g * (0.55 + 0.45 * v60);
    const granizo = {
      nivel: 1.5 * golpeo * porVista(o, 0.65, 1, 0.8),
      ritmo: 15 + 160 * g * (0.5 + 0.5 * v60),
    };

    // ── La rodadura ────────────────────────────────────────────────────
    const f = p.firme;
    const gs = Math.max(0, p.gs);
    // Lo de siempre, pero con la velocidad del suelo: parado con viento de
    // cara la rueda no gira, y no suena.
    const rodando = suelo ? Math.min(1, gs / 32) : 0;
    const rumor =
      Math.min(0.34, rodando * rodando * 0.2 * p.traqueteo) * porVista(o, 0.8, 1, 0.85);
    const pisando = suelo && gs > 0.5;
    const rodadura = {
      rumor,
      /*
       * Y suaves rodando: se notan de verdad en la carrera, que es cuando la
       * rueda las pisa deprisa. A 22 kt, un golpe flojo cada segundo y pico;
       * a partir de unos 90 kt, enteros.
       */
      juntas: pisando
        ? f.juntas * Math.pow(Math.min(1, gs / 45), 1.5) * porVista(o, 0.45, 0.9, 0.8)
        : 0,
      cada: pisando && f.juntas > 0 ? f.separacion / gs : 0,
      /*
       * La rueda de morro va debajo de la cabina de mando, y el tren principal
       * debajo del pasaje: cada uno oye más la suya.
       */
      morro: porVista(o, 0.6, 1, 0.35),
      principal: porVista(o, 0.8, 0.45, 1),
      retardo: pisando ? Math.min(2.4, a.batalla / gs) : 0,
      irregular: f.irregular,
      baches: pisando
        ? f.baches * Math.pow(Math.min(1, gs / 8), 0.8) * porVista(o, 0.5, 0.9, 0.8)
        : 0,
      cadaBache: pisando ? f.cadaBache / gs : 0,
      tono: tonoDelGolpe(a.masa),
    };

    // ── El viento ──────────────────────────────────────────────────────
    const deLado = Math.min(1, Math.abs(p.derrape) * 5);
    const v75 = Math.min(1, Math.max(0, p.ias) / VIENTO_DE_REFERENCIA);
    const viento = {
      nivel: curvaDelViento(p.ias) * 0.34 * (1 + deLado * 0.5) * dentro,
      silbido: porVista(o, 14, 8, 3),
      silbidoHz: 600 + v75 * 1900,
      cuerpoHz: 420 + deLado * 340,
    };

    // ── El tren ────────────────────────────────────────────────────────
    const q80 = Math.min(1.5, Math.pow(Math.max(0, p.ias) / 80, 2));
    const tren = {
      patas: r.tren > 0 ? entre0y1(p.tren) * q80 * r.tren * porVista(o, 0.6, 0.45, 0.6) : 0,
      motor: trenMoviendose ? r.tren * porVista(o, 0.15, 0.5, 0.6) : 0,
      // Un motor eléctrico de bimotor gira más deprisa que una bomba
      // hidráulica de avión grande, y su zumbido es más agudo.
      tono: a.masa < 10000 ? 210 : 120,
    };

    // ── La reversa y los aerofrenos ────────────────────────────────────
    const reversa = reversaPuesta
      ? (a.motor === "turboprop" ? 0.85 : 1) * Math.min(1, gs / 25) * porVista(o, 1, 0.45, 0.7)
      : 0;
    // La reversa no es un gas negativo: se deja el gas al ralentí y los
    // motores suben de vueltas para empujar al revés. Eso es lo que ruge.
    const gasDelMotor = Math.max(p.motor ? p.gas : 0, reversaPuesta ? 0.75 : 0);
    const q90 = Math.min(1.5, Math.pow(Math.max(0, p.ias) / 90, 2));
    const aerofrenos = a.aerofrenos
      ? entre0y1(p.aerofrenos) * q90 * porVista(o, 0.3, 0.6, 0.85)
      : 0;

    // ── Los flaps ──────────────────────────────────────────────────────
    /*
     * En una avioneta el motor de los flaps va detrás del asiento y la cabina
     * es todo el avión: se oye. En uno de pasaje, desde la cabina de mando
     * casi no; desde el pasaje, sobre el ala, sí.
     */
    const pequeno = a.masa < 5000;
    const flaps = {
      nivel:
        flapsMoviendose && r.flaps
          ? porVista(o, 0.05, pequeno ? 0.35 : 0.08, 0.3)
          : 0,
      tono: r.flaps === "hidraulicos" ? 190 : 400,
    };

    // ── La APU y el aire ───────────────────────────────────────────────
    const apu = {
      nivel: this.apuGiro * porVista(o, 1, 0.15, 0.22),
      giro: this.apuGiro,
    };
    const conPacks = r.aire === "packs" && (this.apuGiro > 0.6 || p.motor);
    const conVentilacion = r.aire === "ventilacion" && p.motor;
    /*
     * Desde fuera, nada: el soplido de los packs es de dentro, y la toma de
     * aire de la panza no se oye desde la cola del avión.
     */
    /*
     * **Y bajo, que es un soplido de fondo y no una ducha.** Estaba a −32 dB en
     * el pasaje, por encima de todo lo demás en el puesto, y se oía como lluvia
     * con el cielo despejado. Enrique: «¿el aire acondicionado? A esa potencia,
     * la pulmonía va a ser de las buenas». Doce decibelios menos: se nota si
     * se escucha, y no se confunde con nada.
     */
    const aire = conPacks
      ? porVista(o, 0, 0.08, 0.12)
      : conVentilacion
        ? porVista(o, 0, 0.06, 0.09)
        : 0;

    return {
      pared: corteDeLaPared(o, r.aislamiento),
      lluvia,
      limpias,
      granizo,
      rodadura,
      viento,
      tren,
      reversa,
      gasDelMotor,
      aerofrenos,
      flaps,
      apu,
      aire,
    };
  }
}

/** Lo que pasa cuando no pasa nada: parado, sin lluvia, fuera. Para empezar. */
export const NADA_PASA: LoQuePasa = {
  oido: "fuera",
  ias: 0,
  gs: 0,
  enElSuelo: true,
  vs: 0,
  derrape: 0,
  motor: false,
  gas: 0,
  tren: 1,
  flaps: 0,
  reversa: 0,
  aerofrenos: 0,
  lluvia: { clase: "nada", fuerza: 0, aqui: 1 },
  granizo: 0,
  firme: FIRME_LISO,
  traqueteo: 1,
};
