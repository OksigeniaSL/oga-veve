/**
 * **Las cuatro lecciones del ala rotatoria** (#113): lo que un helicóptero
 * hace y un avión no, contado a quien todavía no lee.
 *
 * Salen del manual de helicópteros de la FAA, *Helicopter Flying Handbook*
 * (FAA-H-8083-21B, 2019, de dominio público), y las piezas ya estaban en el
 * modelo del Super Puma (`helicoptero.ts`, ADR 0026). Faltaba darles un
 * principio, un final y alguien que las cuente:
 *
 * 1. **`estacionario`, quedarse quieto.** «Hovering is the most challenging
 *    part of flying a helicopter» (capítulo 9, «Hovering»): el rotor mueve su
 *    propio aire, y ese aire empuja el helicóptero a todos lados. Por eso
 *    sostenerlo quieto diez segundos es un logro de verdad, y se celebra.
 * 2. **`par`, el par y el pedal.** Lo que el eje da al rotor lo devuelve el
 *    fuselaje girando al revés (capítulo 2, «Torque»): más colectivo, más par,
 *    y el morro se va; el pedal mueve el rotor de cola, y se queda.
 * 3. **`efecto-suelo`, cerca del suelo cuesta menos.** El aire que echa el
 *    rotor rebota en el suelo, y sostenerse ahí pide menos potencia
 *    (capítulo 2, «Ground Effect»). Se ve en la aguja de la fuerza, el FLI.
 * 4. **La autorrotación**, sin motor no me caigo, ya estaba hecha como
 *    ejercicio (`autorrotacion` en `ejercicios.ts`, #110): se enlaza, no se
 *    rehace. Por eso aquí hay tres.
 *
 * Entran por la misma puerta que los ejercicios —el hangar, `?ejercicio=`, la
 * presentación antes y el cierre que celebra—, como la tormenta: son entradas
 * de `EJERCICIOS` con `escena: "rotor"`, y en el hangar del JAZ 70 salen las
 * cuatro en su orden. Como `practica.ts` y `practica-de-tormenta.ts`, esto no
 * habla, no dibuja y no toca el helicóptero: lee cómo va el vuelo y devuelve
 * **sucesos**; quién dice cada cosa en cada peldaño lo decide el juego.
 *
 * ## La medida, que es la del juego
 *
 * Lo que se celebra se juzga con números, y los números no se enseñan: en los
 * peldaños de abajo se ve el dibujo, se oye a la instructora y se ve moverse
 * lo que de verdad se mueve —el helicóptero que no se mueve, el morro, la
 * aguja—. Cada umbral dice abajo de dónde sale.
 *
 * Sin three.js, sin audio y sin DOM: se prueba sola.
 */

import type { Ejercicio } from "./ejercicios";

export type LeccionDelRotorId = "estacionario" | "par" | "efecto-suelo";

/** Lo que una lección necesita mirar del vuelo. Todo en m, m/s y rad. */
export interface LecturaDelRotor {
  readonly enElSuelo: boolean;
  /** La altura de las ruedas sobre el suelo, m. */
  readonly ruedas: number;
  readonly x: number;
  readonly z: number;
  readonly vertical: number;
  /** La velocidad sobre el suelo, m/s. */
  readonly sobreElSuelo: number;
  /** El rumbo del morro, rad. */
  readonly rumbo: number;
  /** Lo deprisa que gira el morro, rad/s: positivo a la derecha. */
  readonly giro: number;
  /** Los pedales de quien vuela, de −1 a 1: positivo, el derecho. */
  readonly pedales: number;
  /**
   * Lo que piden los rotores, en tanto por uno de la potencia de despegue: lo
   * que marca la aguja del FLI dividido entre diez. Ver `flight/vms.ts`.
   */
  readonly potencia: number;
  /** Si el vuelo acaba de terminar en un percance. */
  readonly percance: boolean;
}

export type LadoDelMorro = "izquierda" | "derecha";

export type SucesoDelRotor =
  /** Contar la lección antes de nada: qué se va a hacer. */
  | { readonly que: "presentar" }
  /** `estacionario`: se empieza a sostener quieto. Una vez por intento. */
  | { readonly que: "quieto" }
  /** `par`: ya en estacionario, los pedales pasan a quien vuela. */
  | { readonly que: "pedales" }
  /** `par`: el morro se fue hacia `lado`; el pedal que lo para es el otro. */
  | { readonly que: "seVa"; readonly lado: LadoDelMorro }
  /**
   * `efecto-suelo`: quieto en una de las dos alturas, con lo que pide ahí. Lo
   * que toca después es ir a la otra.
   */
  | { readonly que: "abajo"; readonly potencia: number }
  | { readonly que: "arriba"; readonly potencia: number }
  /**
   * **Lo logró**, en el aire, que es donde pasa: se celebra ahí mismo. El panel
   * del final espera a que se pose, como el de la tormenta: taparle la pantalla
   * a quien está colgado a tres metros del suelo sería dejarlo sin ver.
   */
  | { readonly que: "logrado" }
  | { readonly que: "cerrar"; readonly como: CierreDelRotor };

/** Cómo terminó. Ninguno es un reproche. */
export type CierreDelRotor = "bien" | "otraVez";

export type FaseDelRotor = "empezando" | "en-marcha" | "lograda" | "cerrada";

/**
 * **Lo que dura quieto el logro**, s: diez segundos. Es la cifra del #113, y
 * es mucho: el manual dice que el estacionario es lo más difícil de volar un
 * helicóptero, y diez segundos sin moverse del sitio es lo que un alumno no
 * consigue las primeras horas.
 */
export const QUIETO_LO_QUE_DURA = 10;

/**
 * **Lo que es quieto**: no apartarse más de esto del sitio donde se paró, m
 * de lado y m de alto, ni girar el morro más de esto, rad.
 *
 * Dos metros a cualquier lado es menos que lo que asoma la rueda de morro por
 * delante del rotor, y se ve contra el suelo sin mirar ningún instrumento; un
 * metro de alto es lo que se nota en la rueda que se acerca o se aleja de la
 * hache; diez grados de morro, lo que se ve girar el horizonte. Supuestos del
 * juego: la norma de cualidades de vuelo de rotorcraft (ADS-33E-PRF, la
 * maniobra «Hover») pone las suyas, del mismo orden, y no se han copiado aquí
 * sin haberlas comprobado.
 */
export const QUIETO_DE_LADO = 2;
export const QUIETO_DE_ALTO = 1;
export const QUIETO_DE_MORRO = (10 * Math.PI) / 180;

/**
 * **A qué altura es estacionario**, m de ruedas: en el aire y por debajo de
 * quince metros, un diámetro del rotor (15,60 m): el estacionario dentro del
 * efecto suelo, que es el que se aprende, cerca del suelo para ver el sitio
 * contra algo. Más arriba ya es subir. Con seis metros, y después con diez, la
 * ayuda de Guyrami se pasaba: al soltar la X sigue subiendo lo que tarda en
 * frenar, y un toque de dos segundos lo dejaba quieto a diez metros y sin
 * contar. Medio segundo de más con el dedo no puede ser no haberlo hecho.
 */
export const ESTACIONARIO_MIN = 0.3;
export const ESTACIONARIO_MAX = 15;

/**
 * **Parado**: subiendo o bajando menos que esto, m/s, y moviéndose sobre el
 * suelo menos que esto otro: un palmo por segundo, que en diez segundos ya no
 * cabe en el sitio. Lo de lado se juzga contra el sitio. Para el efecto suelo
 * basta con no ir a ningún lado, que lo que se mira es la aguja.
 */
const SIN_SUBIR = 0.4;
const SIN_MOVERSE = 0.3;
const SIN_IR_A_NINGUN_LADO = 1;

/**
 * **El par: cuándo se dan los pedales**, s quieto en estacionario. Primero se
 * sube y se para con la ayuda entera, y después el pie es de quien vuela: es
 * como se enseña el estacionario, un mando cada vez, y así la lección empieza
 * con el pie del estacionario puesto y no con el del suelo, que con el
 * colectivo de despegar dejaba girar el morro a sesenta grados por segundo.
 */
const PEDALES_TRAS = 2;
/**
 * **Cuánto se tiene que ir el morro** para contarlo, rad: quince grados, que
 * se ven. Con el colectivo de subir a cuatro metros por segundo y el pie del
 * estacionario, en el modelo pasa en unos tres segundos.
 */
export const SE_VA = (15 * Math.PI) / 180;
/**
 * **Y lo que es que se quede**: subiendo, con el pie del otro lado, y el
 * morro girando menos que esto, rad/s, tanto rato, s. Tres grados por segundo
 * es lo que deja sin pedal el par que cambia solo con el estacionario; dos
 * segundos ya no son casualidad.
 */
export const SE_QUEDA = (3 * Math.PI) / 180;
export const SE_QUEDA_DURANTE = 2;
/** Subiendo es a más de esto, m/s: el colectivo de verdad arriba. */
const SUBIENDO = 0.5;
/** Pisando es a más de esto, de −1 a 1. */
const PISANDO = 0.05;

/**
 * **El efecto suelo: las dos alturas**, m de ruedas. Abajo, por debajo de tres
 * metros: el buje del Super Puma queda a unos siete, menos que el radio del
 * rotor, que es donde el suelo se nota de verdad. Arriba, por encima de veinte,
 * más de un diámetro del rotor (15,60 m), que es donde ya no se nota: con la
 * fórmula de Cheeseman y Bennett del modelo, a veinte metros falta menos de un
 * uno por ciento para lo de lejos del suelo, y abajo se ahorra un ocho.
 */
export const SUELO_ABAJO = 3;
export const SUELO_ARRIBA = 20;
/** Lo que se está quieto a cada altura para que la aguja se asiente, s. */
export const SUELO_QUIETO = 3;

/**
 * **Una de las tres lecciones en marcha.** Se le da el vuelo en cada paso y
 * devuelve lo que toca contar. Se repite tantas veces como se quiera: un vuelo
 * nuevo la reinicia.
 */
export class LeccionDelRotor {
  private faseActual: FaseDelRotor = "empezando";
  private comoCerro: CierreDelRotor | null = null;
  // Quedarse quieto.
  private sitio: { x: number; z: number; alto: number; rumbo: number } | null = null;
  private quietoDesde = 0;
  private quietoDicho = false;
  // El par.
  private piesDados = false;
  private rumboAlDarlos = 0;
  private seFue = false;
  private seQuedaDesde = 0;
  // El efecto suelo.
  private paradoAqui = 0;
  private bandaAntes: "abajo" | "arriba" | null = null;
  private visto: { abajo: number | null; arriba: number | null } = { abajo: null, arriba: null };
  private ultima: "abajo" | "arriba" | null = null;

  /**
   * @param sentido hacia dónde gira el rotor, visto desde arriba: 1 en horario,
   *   como el del Super Puma. Dice hacia dónde se va el morro con más
   *   colectivo —al revés que el rotor: a la izquierda— y qué pie lo para —el
   *   derecho—. Ver `FichaDeHelicoptero.rotor.sentido`.
   */
  constructor(
    readonly ejercicio: Ejercicio,
    private readonly sentido: 1 | -1 = 1,
  ) {}

  /** Hacia dónde se va el morro al subir el colectivo. */
  get seVaHacia(): LadoDelMorro {
    return this.sentido > 0 ? "izquierda" : "derecha";
  }

  /** Cuál de las tres, que es el id de su ejercicio. */
  get id(): LeccionDelRotorId {
    return this.ejercicio.id as LeccionDelRotorId;
  }

  get fase(): FaseDelRotor {
    return this.faseActual;
  }

  get cierre(): CierreDelRotor | null {
    return this.comoCerro;
  }

  /**
   * **Si los pedales son de quien vuela**: en la del par, desde que se dan
   * hasta que acaba. Lo pide el juego al modelo en cada paso, así que sobrevive
   * a un cambio de peldaño o a un modelo nuevo. Ver `piesDeQuienVuela` en
   * `helicoptero.ts`.
   */
  get piesDeQuienVuela(): boolean {
    return this.id === "par" && this.piesDados && this.faseActual === "en-marcha";
  }

  /** Si ya lo logró, en este intento. */
  get lograda(): boolean {
    return this.faseActual === "lograda" || this.comoCerro === "bien";
  }

  /** Lo que lleva quieto en este intento, s: para el banco. */
  get quietoLleva(): number {
    return this.quietoDesde;
  }

  /** Lo que pedía quieto en cada altura, en tanto por uno: para el banco. */
  get potencias(): { readonly abajo: number | null; readonly arriba: number | null } {
    return this.visto;
  }

  /** Otra vez desde el principio. */
  reiniciar(): void {
    this.faseActual = "empezando";
    this.comoCerro = null;
    this.sitio = null;
    this.quietoDesde = 0;
    this.quietoDicho = false;
    this.piesDados = false;
    this.rumboAlDarlos = 0;
    this.seFue = false;
    this.seQuedaDesde = 0;
    this.paradoAqui = 0;
    this.bandaAntes = null;
    this.visto = { abajo: null, arriba: null };
    this.ultima = null;
  }

  paso(l: LecturaDelRotor, dt: number): SucesoDelRotor[] {
    const sucesos: SucesoDelRotor[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    if (this.faseActual === "empezando") {
      this.faseActual = "en-marcha";
      sucesos.push({ que: "presentar" });
    }
    if (l.percance) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }
    if (this.faseActual === "lograda") {
      if (l.enElSuelo && l.sobreElSuelo < SIN_IR_A_NINGUN_LADO) this.cerrar("bien", sucesos);
      return sucesos;
    }
    if (this.id === "estacionario") this.quieto(l, dt, sucesos);
    else if (this.id === "par") this.par(l, dt, sucesos);
    else this.suelo(l, dt, sucesos);
    return sucesos;
  }

  /**
   * **Quieto**: se cuenta desde que se para en estacionario, y vale mientras no
   * se aparte del sitio donde se paró. Si se aparta, vuelve a contar desde
   * donde se vuelva a parar: no hay que volver a la hache, que el logro es
   * quedarse, no llegar.
   */
  private quieto(l: LecturaDelRotor, dt: number, sucesos: SucesoDelRotor[]): void {
    const enBanda = !l.enElSuelo && l.ruedas >= ESTACIONARIO_MIN && l.ruedas <= ESTACIONARIO_MAX;
    const parado = Math.abs(l.vertical) < SIN_SUBIR && l.sobreElSuelo < SIN_MOVERSE;
    if (!enBanda) {
      this.sitio = null;
      this.quietoDesde = 0;
      return;
    }
    if (this.sitio === null) {
      if (!parado) return;
      this.sitio = { x: l.x, z: l.z, alto: l.ruedas, rumbo: l.rumbo };
      this.quietoDesde = 0;
      if (!this.quietoDicho) {
        this.quietoDicho = true;
        sucesos.push({ que: "quieto" });
      }
      return;
    }
    const s = this.sitio;
    const fuera =
      Math.hypot(l.x - s.x, l.z - s.z) > QUIETO_DE_LADO ||
      Math.abs(l.ruedas - s.alto) > QUIETO_DE_ALTO ||
      Math.abs(diferencia(l.rumbo, s.rumbo)) > QUIETO_DE_MORRO;
    if (fuera) {
      this.sitio = null;
      this.quietoDesde = 0;
      return;
    }
    this.quietoDesde += dt;
    if (this.quietoDesde >= QUIETO_LO_QUE_DURA) this.lograr(sucesos);
  }

  /**
   * **El par**: quieto en estacionario, los pedales pasan a quien vuela; con el
   * colectivo el morro se va, y con el pedal del otro lado se queda. El logro
   * es lo segundo, subiendo: quien ya pisa antes de que el morro se vaya
   * también lo sabe, y vale.
   */
  private par(l: LecturaDelRotor, dt: number, sucesos: SucesoDelRotor[]): void {
    const enBanda = !l.enElSuelo && l.ruedas >= ESTACIONARIO_MIN;
    if (!this.piesDados) {
      const parado = enBanda && Math.abs(l.vertical) < SIN_SUBIR && l.sobreElSuelo < SIN_MOVERSE;
      this.paradoAqui = parado ? this.paradoAqui + dt : 0;
      if (this.paradoAqui >= PEDALES_TRAS) {
        this.piesDados = true;
        this.rumboAlDarlos = l.rumbo;
        this.paradoAqui = 0;
        sucesos.push({ que: "pedales" });
      }
      return;
    }
    /*
     * **Posado, la ayuda se vuelve a quedar los pies**, y los da otra vez en el
     * próximo estacionario: posado aprende el pie del suelo, y con ese pie el
     * colectivo de despegar giraba el morro a sesenta grados por segundo.
     */
    if (l.enElSuelo) {
      this.piesDados = false;
      this.seQuedaDesde = 0;
      return;
    }
    /*
     * Lo que se cuenta es que se va **hacia donde lo lleva el par**: a la
     * izquierda en el Super Puma. Si se va al otro lado —pisando de más, o
     * bajando el colectivo— no se dice nada: no es la lección, y no se riñe.
     */
    const girado = diferencia(l.rumbo, this.rumboAlDarlos);
    if (!this.seFue && -this.sentido * girado >= SE_VA) {
      this.seFue = true;
      sucesos.push({ que: "seVa", lado: this.seVaHacia });
    }
    // Y se queda con el pedal del otro lado, subiendo: el derecho en el Super Puma.
    const pisaContra = this.sentido * l.pedales > PISANDO;
    const seQueda = l.vertical > SUBIENDO && pisaContra && Math.abs(l.giro) < SE_QUEDA;
    this.seQuedaDesde = seQueda ? this.seQuedaDesde + dt : 0;
    if (this.seQuedaDesde >= SE_QUEDA_DURANTE) this.lograr(sucesos);
  }

  /**
   * **El efecto suelo**: quieto abajo y quieto arriba, en cualquier orden, y se
   * acaba abajo, que es donde se ve que cuesta menos. Lo que pide cada altura
   * se toma quieto y asentado: subiendo o bajando, la aguja marca la subida.
   */
  private suelo(l: LecturaDelRotor, dt: number, sucesos: SucesoDelRotor[]): void {
    const banda =
      l.enElSuelo || l.ruedas < ESTACIONARIO_MIN
        ? null
        : l.ruedas <= SUELO_ABAJO
          ? ("abajo" as const)
          : l.ruedas >= SUELO_ARRIBA
            ? ("arriba" as const)
            : null;
    const parado = Math.abs(l.vertical) < SIN_SUBIR && l.sobreElSuelo < SIN_IR_A_NINGUN_LADO;
    if (banda === null || !parado || banda !== this.bandaAntes) this.paradoAqui = 0;
    else this.paradoAqui += dt;
    this.bandaAntes = banda;
    if (banda === null || this.paradoAqui < SUELO_QUIETO || banda === this.ultima) return;
    this.ultima = banda;
    this.visto = { ...this.visto, [banda]: l.potencia };
    if (banda === "abajo" && this.visto.arriba !== null) {
      this.lograr(sucesos);
      return;
    }
    sucesos.push(banda === "abajo" ? { que: "abajo", potencia: l.potencia } : { que: "arriba", potencia: l.potencia });
  }

  private lograr(sucesos: SucesoDelRotor[]): void {
    this.faseActual = "lograda";
    sucesos.push({ que: "logrado" });
  }

  private cerrar(como: CierreDelRotor, sucesos: SucesoDelRotor[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

/** a − b, en (−π, π]. */
function diferencia(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}
