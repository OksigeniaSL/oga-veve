/**
 * **El despegue de pista corta**: la otra mitad (#91, H35a).
 *
 * La primera mitad ya estaba: frenos puestos, motor a tope con el avión quieto
 * y soltar, y el juego sabe cuánta pista necesita cada avión (`carrera.ts`,
 * `cabe.ts`, ADR 0019 y 0027). Lo que faltaba es lo que pasa **después de
 * irse del suelo**, que es donde se gana o se pierde el margen contra los
 * árboles del final: hay dos velocidades de subida, y no son la misma.
 *
 * - **La de mejor ángulo, Vx**: la que más altura gana **por metro
 *   recorrido**. Es la del obstáculo: lo que importa es estar alto cuando se
 *   llega a él, no llegar pronto.
 * - **La de mejor régimen, Vy**: la que más altura gana **por segundo**. Es
 *   más rápida, así que sube más deprisa pero más tendida: con ella el
 *   obstáculo llega antes que la altura.
 *
 * Elegir mal es lo que deja sin margen: quien sale a buscar la Vy recién
 * despegado tiene que acelerar primero —casi sin subir— de la de irse del
 * suelo a la de subir deprisa, y ese trozo se lo come la pista que no hay. Lo
 * mide la mesa de `pista-corta.test.ts` con el modelo de vuelo del juego, y el
 * banco `scripts/ver-la-pista-corta.mjs` volándolo.
 *
 * ## Solo donde la técnica existe
 *
 * Es la técnica del monomotor ligero en un campo de hierba con monte al final,
 * y su manual la trae escrita como procedimiento. Los reactores y los
 * turbohélices de transporte no la vuelan: despegan con la V2 de su peso y la
 * subida de la norma, y el obstáculo lo resuelve el cálculo de la pista, no
 * una velocidad elegida a mano. Y de los de hélice de la flota, **solo el JAZ
 * 20**, porque es el único cuyo modelo de vuelo pone las dos velocidades donde
 * las pone su manual: el bimotor da la Vx bien (80 nudos contra los 90 mph,
 * 78 nudos, del manual del PA-34) pero la Vy a 107 nudos, dieciséis por encima
 * de sus 105 mph, y eso no se enseña sin tocar antes el modelo, que es otra
 * decisión (ADR 0027, enmienda H35a).
 *
 * Este fichero no sabe de cámaras, ni de voces, ni de HUD: lee el avión y
 * devuelve sucesos. Quién dice y enseña cada cosa lo decide `game.ts`
 * (`practicarLaPistaCorta`).
 */

import type { Ejercicio } from "./ejercicios";

/** Un nudo, m/s. */
const KT = 0.514444;

/**
 * **Las velocidades de subida de su clase**, nudos indicados al nivel del mar
 * y a su peso máximo, como las da su manual.
 */
export interface VelocidadesDeSubida {
  /** La de mejor ángulo, limpio: Vx. */
  readonly vx: number;
  /** La de mejor régimen, limpio: Vy. */
  readonly vy: number;
  /**
   * **La de pasar el obstáculo** con los flaps del despegue corto: la que el
   * manual pide en su procedimiento «hasta librar los obstáculos». Es la Vx
   * con esos flaps, y por eso es algo más lenta que la limpia.
   */
  readonly sobreElObstaculo: number;
  /** Los flaps del despegue corto, grados. */
  readonly flaps: number;
  /** Desde qué velocidad se recogen, ya pasado el obstáculo, nudos. */
  readonly recogerDesde: number;
}

/**
 * **Las del Cessna 172S**, la clase del JAZ 20: «Best Angle of Climb, Sea
 * Level: 62 KIAS; Best Rate of Climb, Sea Level: 74 KIAS», y el despegue
 * corto, «Wing Flaps 10°… Brakes RELEASE… Climb Speed 56 KIAS (until all
 * obstacles are cleared)… Wing Flaps RETRACT slowly after reaching 60 KIAS»
 * (Cessna 172S *Information Manual*, sección 4, velocidades de operación
 * normal y lista de despegue de pista corta; la tabla de la sección 5 da los
 * mismos 56 nudos a los cincuenta pies, a 2.550 lb).
 *
 * El modelo de vuelo los da donde deben, volado y sin ayudas: limpio, la
 * pendiente máxima cae a 60 nudos (9,9 %) y el régimen máximo a 76 (3,5 m/s);
 * con los flaps a 10°, a 60 y a 70, con la curva casi plana entre 56 y 64
 * (`pista-corta.test.ts`).
 */
export const SUBIDA_DEL_JAZ_20: VelocidadesDeSubida = Object.freeze({
  vx: 62,
  vy: 74,
  sobreElObstaculo: 56,
  flaps: 10,
  recogerDesde: 60,
});

/** Los aviones que la ofrecen. Ver la cabecera: solo donde la técnica existe y el modelo la vuela. */
const SUBIDA_DE_SU_CLASE: Readonly<Record<string, VelocidadesDeSubida>> = Object.freeze({
  "jaz-20": SUBIDA_DEL_JAZ_20,
});

/** Las velocidades de subida de este avión, o `null` si no vuela esta técnica. */
export function subidaDe(a: { readonly id: string }): VelocidadesDeSubida | null {
  return SUBIDA_DE_SU_CLASE[a.id] ?? null;
}

/**
 * **El monte del final de la pista**: dónde está y cuánto mide.
 *
 * El obstáculo de toda tabla de despegue mide cincuenta pies —quince metros—,
 * y no por capricho: es la altura de una fila de árboles. En una pista de
 * hierba de una granja de San Pedro es exactamente lo que hay al final, el
 * monte: lapachos y lo que crece con ellos, que de adultos pasan de los
 * quince.
 */
export interface MonteDelFinal {
  /** Lo que hay entre el final de la pista y los árboles, m. */
  readonly pasadaLaPista: number;
  /** Lo que miden los árboles, m. */
  readonly alto: number;
}

/**
 * **Los campos donde se practica**: hoy, la granja, Yvytu Rape (SGOG).
 *
 * Por qué ese: es la única pista corta de verdad que tiene el juego —
 * novecientos metros de hierba, a 258 m de cota y con veintiocho grados de
 * día, que es justo lo que alarga una carrera—, y es el campo de donde sale
 * una avioneta en una granja paraguaya: sin torre, sin luces y con el monte
 * al final. Los demás campos de la flota son aeropuertos de un kilómetro y
 * medio para arriba, con las superficies de obstáculos limpias: ahí un 172
 * pasa los cincuenta pies con media pista por delante.
 *
 * **El monte, a ciento veinte metros del final.** Es el sitio donde la
 * técnica decide: con la del obstáculo se pasa a cuarenta metros sobre las
 * copas, y saliendo a buscar la Vy recién despegado, a cinco (la mesa, en
 * `pista-corta.test.ts`, con el modelo sin ayudas, la hierba y los
 * veintiocho grados de la granja). Una pista de granja no es un aeropuerto con su
 * franja despejada a la norma: el monte del vecino llega hasta donde llega, y
 * por eso esta técnica existe.
 */
const MONTE_DE_CADA_CAMPO: Readonly<Record<string, MonteDelFinal>> = Object.freeze({
  SGOG: Object.freeze({ pasadaLaPista: 120, alto: 15 }),
});

/** El monte del final de la pista de este campo, o `null` si no se practica aquí. */
export function monteDelCampo(oaci: string | null): MonteDelFinal | null {
  return oaci ? (MONTE_DE_CADA_CAMPO[oaci] ?? null) : null;
}

/**
 * **Lo que se le pide a la velocidad para darla por buena**, nudos a cada
 * lado: cinco, que es lo que pide la FAA en el examen práctico de piloto
 * privado en el despegue corto: la del obstáculo o la Vx «+10/-5 knots» hasta
 * librar el obstáculo o los cincuenta pies (FAA-S-ACS-6, *Private Pilot
 * Airplane ACS*, área IV, «Short-Field Takeoff and Maximum Performance
 * Climb»). Se toma el lado estrecho.
 */
export const VELOCIDAD_A_CINCO = 5;
/** Lo que tiene que sostenerse una velocidad para contarla, s. */
export const SOSTENIDA = 3;
/**
 * **Por debajo de cuánto margen sobre las copas se pasa «justo»**, m: diez.
 * Por encima, con margen. Es un tercio largo de la altura de los árboles: lo
 * que separa un despegue que se repetiría tranquilo de uno que no.
 */
export const MARGEN_HOLGADO = 10;
/**
 * **A partir de cuántos nudos de más se pide más morro**, antes del monte: diez
 * por encima de la del obstáculo, el borde de arriba del examen práctico.
 */
export const DEMASIADO_RAPIDO = 10;
/** Por debajo de esta velocidad se cuenta que el avión está quieto, m/s. */
const QUIETO = 0.5;
/** El gas que cuenta como «a tope». */
const A_TOPE = 0.95;

/** Lo que el ejercicio lee del avión en cada paso. */
export interface LecturaDeLaPistaCorta {
  /** Lo recorrido desde el final de la pista, a lo largo del eje, m: negativo antes de él. */
  readonly pasadoElFinal: number;
  /** Lo que van las ruedas por encima de las copas del monte, m. */
  readonly sobreLasCopas: number;
  /** La indicada, nudos. */
  readonly indicada: number;
  /** La velocidad sobre el suelo, m/s. */
  readonly sobreElSuelo: number;
  readonly enElSuelo: boolean;
  /** El gas, de 0 a 1. */
  readonly gas: number;
  readonly percance: boolean;
}

/** Cómo se pasó el monte. */
export type ComoSePaso = "conMargen" | "justo" | "porDebajo";
export type CierreDeLaPistaCorta = ComoSePaso | "parado" | "otraVez";

export type SucesoDeLaPistaCorta =
  | { readonly que: "presentar" }
  /** Motor a tope con el avión quieto: ahora se sueltan los frenos. */
  | { readonly que: "solta" }
  /** Sostenida la del obstáculo, en el aire y antes del monte. */
  | { readonly que: "alAngulo"; readonly kt: number }
  /** Demasiado rápido antes del monte: más morro. Una vez. */
  | { readonly que: "masDespacio"; readonly kt: number }
  /** Pasado el monte: cómo, y ahora a la Vy. */
  | { readonly que: "pasaste"; readonly como: ComoSePaso; readonly margen: number }
  /** Sostenida la Vy, pasado el monte. */
  | { readonly que: "enVy"; readonly kt: number }
  | { readonly que: "cerrar"; readonly como: CierreDeLaPistaCorta };

export type FaseDeLaPistaCorta = "frenos" | "carrera" | "subida" | "pasado" | "cerrada";

/**
 * **Un despegue de pista corta**, de los frenos a la Vy.
 *
 * Cuenta lo que pasa, no lo que tarda: el cierre llega con la Vy sostenida
 * pasado el monte, o al pararse en la pista —renunciar es ganar—, o con un
 * percance, que pide otra vez.
 */
export class PistaCorta {
  private faseActual: FaseDeLaPistaCorta = "frenos";
  private presentada = false;
  private soltaDicho = false;
  private angulo = false;
  private pedidoMasDespacio = false;
  private sostenida = 0;
  private sumada = 0;
  private comoCerro: CierreDeLaPistaCorta | null = null;
  private comoPaso: ComoSePaso | null = null;
  private margenMedido: number | null = null;
  private minimoSobreLasCopas = Infinity;
  private maxRodando = 0;

  constructor(
    readonly ejercicio: Ejercicio,
    readonly velocidades: VelocidadesDeSubida,
    readonly monte: MonteDelFinal,
  ) {}

  get fase(): FaseDeLaPistaCorta {
    return this.faseActual;
  }
  get cierre(): CierreDeLaPistaCorta | null {
    return this.comoCerro;
  }
  /** Cómo se pasó el monte, cuando ya se pasó. */
  get paso(): ComoSePaso | null {
    return this.comoPaso;
  }
  /** Lo que iban las ruedas sobre las copas al pasar el monte, m. */
  get margen(): number | null {
    return this.margenMedido;
  }

  avanzar(l: LecturaDeLaPistaCorta, dt: number): SucesoDeLaPistaCorta[] {
    const sucesos: SucesoDeLaPistaCorta[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }
    const v = this.velocidades;

    if (this.faseActual === "frenos" || this.faseActual === "carrera") {
      if (l.enElSuelo) {
        const quieto = l.sobreElSuelo < QUIETO;
        if (this.faseActual === "frenos" && quieto && l.gas >= A_TOPE && !this.soltaDicho) {
          this.soltaDicho = true;
          sucesos.push({ que: "solta" });
        }
        if (this.faseActual === "frenos" && !quieto && l.gas >= A_TOPE) this.faseActual = "carrera";
        this.maxRodando = Math.max(this.maxRodando, l.sobreElSuelo);
        /*
         * **Y pararse en la pista también es ganar**: rodando de verdad, gas
         * atrás y quieto antes del final. Quien ve que no llega y no lo
         * intenta ha hecho lo que hace un piloto.
         */
        if (this.faseActual === "carrera" && this.maxRodando > 10 * KT && quieto && l.gas < 0.2) {
          this.cerrar("parado", sucesos);
        }
        return sucesos;
      }
      this.faseActual = "subida";
      this.empezarElRato();
    }

    if (this.faseActual === "subida") {
      this.minimoSobreLasCopas = Math.min(this.minimoSobreLasCopas, l.sobreLasCopas);
      if (l.pasadoElFinal >= this.monte.pasadaLaPista) {
        /*
         * **El margen, al cruzar la fila**: lo que iban las ruedas sobre las
         * copas justo encima de ellas.
         */
        const margen = l.sobreLasCopas;
        const como: ComoSePaso = margen < 0 ? "porDebajo" : margen < MARGEN_HOLGADO ? "justo" : "conMargen";
        this.comoPaso = como;
        this.margenMedido = margen;
        this.faseActual = "pasado";
        this.empezarElRato();
        sucesos.push({ que: "pasaste", como, margen });
        return sucesos;
      }
      if (!this.angulo && Math.abs(l.indicada - v.sobreElObstaculo) <= VELOCIDAD_A_CINCO) {
        this.sostener(l.indicada, dt);
        if (this.sostenida >= SOSTENIDA) {
          this.angulo = true;
          sucesos.push({ que: "alAngulo", kt: this.media });
        }
      } else if (!this.angulo) this.empezarElRato();
      if (!this.angulo && !this.pedidoMasDespacio && l.indicada > v.sobreElObstaculo + DEMASIADO_RAPIDO) {
        this.pedidoMasDespacio = true;
        sucesos.push({ que: "masDespacio", kt: l.indicada });
      }
      return sucesos;
    }

    // Pasado el monte: a la Vy, y sostenida, se cierra.
    if (Math.abs(l.indicada - v.vy) <= VELOCIDAD_A_CINCO && !l.enElSuelo) {
      this.sostener(l.indicada, dt);
      if (this.sostenida >= SOSTENIDA) {
        sucesos.push({ que: "enVy", kt: this.media });
        this.cerrar(this.comoPaso ?? "conMargen", sucesos);
      }
    } else this.empezarElRato();
    return sucesos;
  }

  /** Otra vez desde los frenos, en el mismo campo. */
  reiniciar(): void {
    this.faseActual = "frenos";
    this.presentada = false;
    this.soltaDicho = false;
    this.angulo = false;
    this.pedidoMasDespacio = false;
    this.comoCerro = null;
    this.comoPaso = null;
    this.margenMedido = null;
    this.minimoSobreLasCopas = Infinity;
    this.maxRodando = 0;
    this.empezarElRato();
  }

  private get media(): number {
    return this.sostenida > 0 ? this.sumada / this.sostenida : 0;
  }
  private sostener(kt: number, dt: number): void {
    this.sostenida += dt;
    this.sumada += kt * dt;
  }
  private empezarElRato(): void {
    this.sostenida = 0;
    this.sumada = 0;
  }
  private cerrar(como: CierreDeLaPistaCorta, sucesos: SucesoDeLaPistaCorta[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

/**
 * **Dónde está el final de la pista y hacia dónde se despega**, en el mundo:
 * de la pista del escenario y del morro del avión puesto en ella, que dice
 * por qué cabecera sale. El rumbo, en grados verdaderos; el eje, en el
 * mundo (x al este, z al sur).
 */
export function dondeAcabaLaPista(
  pista: { readonly x: number; readonly z: number; readonly heading: number; readonly length: number },
  rumboDelAvion: number,
): { readonly x: number; readonly z: number; readonly dx: number; readonly dz: number; readonly rumbo: number } {
  const diferencia = ((((rumboDelAvion - pista.heading) % 360) + 540) % 360) - 180;
  const rumbo = Math.abs(diferencia) <= 90 ? pista.heading : (pista.heading + 180) % 360;
  const r = (rumbo * Math.PI) / 180;
  const dx = Math.sin(r);
  const dz = -Math.cos(r);
  return { x: pista.x + (dx * pista.length) / 2, z: pista.z + (dz * pista.length) / 2, dx, dz, rumbo };
}
