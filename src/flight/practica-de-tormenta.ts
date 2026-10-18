/**
 * **El ejercicio de la tormenta**: una tormenta de verdad delante, y la
 * decisión de no entrar en ella.
 *
 * No es una emergencia. Es la regla de las tres eses dicha con el cielo: a una
 * tormenta **no se entra, se rodea**, y con margen. Es de las primeras cosas
 * que aprende un piloto, y se aprende viéndola venir, que es lo mismo que
 * enseña la frustrada: decidir con tiempo. Por eso va en los cuatro peldaños
 * —a los cuatro años se puede aprender que a esa nube enorme no se le entra—
 * y por eso el cierre, si se rodea bien, es una fiesta.
 *
 * ## Lo que es verdad, y de dónde sale
 *
 * - **Se rodea, con margen.** «Do avoid by at least 20 miles any
 *   thunderstorm identified as severe or giving an intense radar echo. This
 *   is especially true under the anvil of a large cumulonimbus» (FAA, AIM
 *   7-1-27 a.14, y el *Aviation Weather Handbook* FAA-H-8083-28B, 22.8.2; es
 *   la regla del antiguo AC 00-24C, que la FAA retiró en 2022 al juntarlo
 *   todo en ese manual). La FAA no dice de qué millas; Airbus (*Safety First*
 *   n.º 22, 2016) y SKYbrary lo escriben en náuticas: «a minimum of 20 NM
 *   laterally». Veinte millas del eco intenso, que en el radar es **el rojo y
 *   el magenta**: ver `MARGEN_DE_RODEO`.
 * - **Y se empieza a rodear de lejos.** «Crews should consider a minimum
 *   distance of 40 NM from the convective cloud to initiate the avoidance
 *   maneuver» (Airbus, *Safety First* n.º 22): por eso el ejercicio empieza a
 *   unas cuarenta millas. Ver `colocacionDeLaTormenta`.
 * - **Por el lado del viento.** «When possible, it is advisable to try to
 *   avoid a storm by flying on the upwind side of a cumulonimbus. Usually,
 *   there is less turbulence and hail upwind» (Airbus, *Safety First* n.º 22,
 *   y su nota de operaciones de 2007 sobre el radar). Del otro lado se estira
 *   el yunque, y debajo de él puede caer granizo (AIM y FAA-H-8083-28B,
 *   14.4.5). Ver `LADO_DEL_VIENTO`.
 * - **Ni por debajo ni por encima.** «Don't attempt to fly under a
 *   thunderstorm even if you can see through to the other side» (AIM 7-1-27
 *   a.2); por encima no se pasa —la cima está a trece kilómetros, más alta
 *   que el techo de cualquier avión de la flota—. Ver `CIMA`.
 * - **Si se entra, no se da la vuelta dentro**: «tighten your safety belt»,
 *   y «don't turn back once you are in the thunderstorm. A straight course
 *   through the storm most likely will get the aircraft out of the hazards
 *   most quickly» (AIM 7-1-27 b.1 y c.4).
 * - **Y un rayo no tumba un avión.** Está hecho para eso: «The airplane must
 *   be protected against catastrophic effects from lightning» (14 CFR
 *   25.581(a), y lo mismo CS 25.581(a) de EASA). Casi toda la corriente va
 *   por la chapa de fuera —«aluminum skins keep most of the lightning
 *   currents in the skins», dice la FAA, que no «toda»: por eso no se dice
 *   aquí «jaula de Faraday»—. Y le pasa a menudo: «on average, each airplane
 *   is struck once or twice a year» (FAA, *Lessons Learned*, N709PA).
 *
 * Las fuentes, con su enlace y lo comprobado y lo que no, en
 * `PENDIENTE-VOCES-tormenta.md`.
 *
 * ## Si se entra, no hay castigo
 *
 * Se ve la consecuencia —lo que sacude, el agua, el granizo y el rayo que
 * toca el avión sin hacer nada—, se cuenta con calma y **se vuelve a
 * intentar**, como en un simulador. Lo que sacude y lo que suena no lo pone
 * este fichero: lo pone la célula, que es la misma que pinta el radar y la
 * misma que sacude, ver `flight/tormentas.ts`. Aquí solo se lleva la cuenta de
 * lo que pasa y se devuelven **sucesos**, como `practica.ts`: quién dice cada
 * cosa en cada peldaño lo decide el juego, y la escalera sigue viviendo en
 * `escalera.ts`.
 *
 * Sin three.js, sin audio y sin DOM: se prueba sola.
 */

import type { Ejercicio } from "./ejercicios";
import { MILLA } from "./ruta";
import { anillosDe, ecoEn, type Celda } from "./tormentas";

/**
 * **El margen con que se rodea**, m: veinte millas náuticas del eco intenso.
 *
 * Es la regla de la FAA (AIM 7-1-27 a.14, FAA-H-8083-28B 22.8.2): «avoid by
 * at least 20 miles any thunderstorm identified as severe or giving an
 * intense radar echo», en náuticas como la escriben Airbus y SKYbrary. La
 * tormenta del ejercicio es de las que dan eco intenso —tiene núcleo rojo y
 * magenta—, así que se le aplica entera: la FAA deja acortarla solo con los
 * ecos flojos.
 *
 * Se mide **desde el borde del rojo**, que es lo que el radar llama intenso, y
 * no desde el centro: lo que se rodea es lo que se ve en la pantalla. Es la
 * misma regla en los cuatro peldaños: en los de abajo no se dice el número,
 * pero se juzga con él, porque lo que se celebra tiene que ser lo que se
 * celebraría en un avión de verdad.
 */
export const MARGEN_DE_RODEO = 20 * MILLA;

/**
 * **Lo que se da por bueno al medir**, en fracción del margen: un cinco por
 * ciento. El rumbo se sostiene a mano y nadie pasa a veinte millas clavadas;
 * diecinueve y pico es haberlo hecho.
 */
export const TOLERANCIA = 0.95;

/**
 * **El eco de la tormenta del ejercicio**: radio en metros y fuerza en el
 * centro.
 *
 * Doce kilómetros de radio y fuerza uno: un cumulonimbo maduro, con núcleo
 * magenta —granizo— de unos setecientos metros, el rojo hasta unos dos
 * kilómetros y el verde hasta siete. El dibujo de la nube va a la misma
 * escala, para que lo que se ve por el parabrisas y lo que pinta el radar sean
 * la misma tormenta. Ver `world/cumulonimbo.ts`.
 */
export const RADIO_DEL_ECO = 12000;
export const FUERZA_DEL_ECO = 1;

/**
 * **La base y la cima del cumulonimbo**, m sobre el suelo y sobre el mar.
 *
 * La base, a mil doscientos metros: la de una tormenta de tarde de verano, que
 * nace del aire caliente y húmedo de abajo (por verificar con un sondeo de
 * Asunción en verano: es el orden de magnitud, no un dato medido). La cima, a trece kilómetros: en
 * los trópicos y en Paraguay en verano pasan de doce y llegan a quince, y en
 * cualquier caso **por encima del techo de cualquier avión de la flota**. Por
 * encima no se pasa, que es parte de la lección.
 */
export const BASE = 1200;
export const CIMA = 13000;

/**
 * **El lado por el que se rodea**: el del viento de arriba, del que viene, y
 * no el del yunque —«on the upwind side», Airbus, ver la cabecera—. En la
 * escena el viento de altura sopla desde la derecha del camino y el yunque se
 * estira hacia la izquierda; ver `escenaDeLaTormenta`.
 */
export const LADO_DEL_VIENTO: Lado = "derecha";

export type Lado = "derecha" | "izquierda";

/**
 * **A qué altura se vuela el ejercicio**, m sobre la pista.
 *
 * A la del crucero del avión, como mucho a seis mil metros: es la llegada a
 * casa, y una tormenta de tarde se rodea igual a cualquier altura —su cima
 * queda muy por encima— pero así queda bajada por delante para aterrizar.
 */
export function alturaDelEjercicio(alturaDeCrucero: number): number {
  return Math.min(alturaDeCrucero, 6000);
}

/**
 * **El radio del rojo**, m: hasta dónde llega el eco intenso de una célula.
 * Sale de los mismos anillos que pinta el radar, no de una copia del número.
 */
export function radioDelRojo(c: Pick<Celda, "radio" | "fuerza">): number {
  const rojo = anillosDe(c.fuerza).find((a) => a.color === "rojo");
  return rojo ? rojo.parte * c.radio : 0;
}

/** El radio del verde: hasta dónde pinta algo el radar, m. */
export function radioDelEco(c: Pick<Celda, "radio" | "fuerza">): number {
  const verde = anillosDe(c.fuerza).find((a) => a.color === "verde");
  return verde ? verde.parte * c.radio : 0;
}

/** Del eco en un punto a si es rojo o más: lo que el radar llama intenso. */
const ROJO = 0.68;
/** Y a si el radar pinta algo. */
const VERDE = 0.18;

/**
 * **Dónde se pone todo**, en metros contados por la prolongación de la pista
 * desde el umbral hacia fuera.
 *
 * El avión empieza en la prolongación de la pista mirándola, con la tormenta
 * **en medio del camino**: el que siga derecho entra en ella. Lo que hay entre
 * el avión y la tormenta es lo que se necesita para oír qué es, decidir y
 * girar unos treinta y cinco grados —un viraje de verdad, no un volantazo— y
 * dejarla a su margen: unas cuarenta millas, que es desde donde Airbus pide
 * empezar a rodear. Lo que hay entre la tormenta y la pista, lo que se necesita para
 * volver al rumbo y bajar a aterrizar sin la tormenta encima.
 */
export interface Colocacion {
  /** Del avión al umbral, m. */
  readonly lejos: number;
  /** Del centro de la tormenta al umbral, m. */
  readonly tormenta: number;
  /** Altura sobre la pista, m. */
  readonly alto: number;
}

/** Lo que se tarda en contar qué es y por qué no se entra, s. */
export const LO_QUE_SE_CUENTA = 35;

/**
 * **El desvío con que se cuenta**, rad: treinta y cinco grados, un viraje de
 * verdad y no un volantazo. Quien gire más, pasa más lejos.
 */
export const DESVIO_DE_REFERENCIA = (35 * Math.PI) / 180;

/**
 * Lo que queda entre la tormenta y la pista, m: setenta kilómetros. Una bajada
 * de tres grados desde seis mil metros son unos ciento quince; con lo que se
 * baja rodeando y una bajada algo más empinada, cabe. Y una tormenta a esa
 * distancia del campo no le cae encima a nadie que aterrice.
 */
export const DE_LA_TORMENTA_A_LA_PISTA = 70000;

export function colocacionDeLaTormenta(avion: {
  readonly cruiseSpeed: number;
  readonly alturaDeCrucero: number;
}): Colocacion {
  const rojo = radioDelRojo({ radio: RADIO_DEL_ECO, fuerza: FUERZA_DEL_ECO });
  const lado = MARGEN_DE_RODEO + rojo;
  /*
   * Con el desvío de referencia: lo más cerca que se pasa de un punto, yendo
   * recto con ese ángulo, es la distancia por su seno. Más lo que se vuela
   * mientras se cuenta. Sale entre treinta y ocho y cuarenta y una millas: la
   * distancia desde la que Airbus pide empezar a rodear, y la tormenta ya en
   * el borde del radar, que en el cuadro llega a cuarenta.
   */
  const antes = avion.cruiseSpeed * LO_QUE_SE_CUENTA + lado / Math.sin(DESVIO_DE_REFERENCIA);
  return {
    lejos: DE_LA_TORMENTA_A_LA_PISTA + antes,
    tormenta: DE_LA_TORMENTA_A_LA_PISTA,
    alto: alturaDelEjercicio(avion.alturaDeCrucero),
  };
}

/**
 * **La escena**: la célula del radar y hacia dónde se estira el yunque, en el
 * mundo.
 *
 * `centro` es el centro de la tormenta y `rumbo`, el de la pista, que es el
 * del camino del avión. El yunque se estira con el viento de arriba, que
 * viene de la derecha y un poco de cara: hacia la izquierda y hacia atrás,
 * que es hacia donde no hay que ir. Ver `LADO_DEL_VIENTO`.
 */
export interface Escena {
  readonly celda: Celda;
  /** Hacia dónde se estira el yunque, vector unitario en x, z. */
  readonly yunque: { readonly x: number; readonly z: number };
  /** El rumbo del camino que la tormenta corta, rad. */
  readonly rumbo: number;
}

export function escenaDeLaTormenta(
  centro: { readonly x: number; readonly z: number },
  rumbo: number,
): Escena {
  // El viento de arriba viene de sesenta grados a la derecha del camino.
  const de = rumbo + (60 * Math.PI) / 180;
  // Y empuja hacia el lado contrario: de donde viene a donde va.
  return {
    celda: { x: centro.x, z: centro.z, radio: RADIO_DEL_ECO, fuerza: FUERZA_DEL_ECO },
    yunque: { x: -Math.sin(de), z: Math.cos(de) },
    rumbo,
  };
}

/** Delante y a la derecha de un rumbo, en el marco del juego (el morro a −Z). */
function ejes(rumbo: number): { fx: number; fz: number; dx: number; dz: number } {
  return {
    fx: Math.sin(rumbo),
    fz: -Math.cos(rumbo),
    dx: Math.cos(rumbo),
    dz: Math.sin(rumbo),
  };
}

/**
 * **A cuánto se pasa del borde del rojo siguiendo derecho por este rumbo**,
 * m, y por qué lado queda la tormenta.
 *
 * Es lo que hace un piloto mirando el radar: la línea del rumbo y el borde del
 * rojo, y lo que queda entre los dos. Si la tormenta ya quedó detrás, lo que
 * hay ahora. Negativo es que la línea entra en el rojo.
 */
export function pasoPorEsteRumbo(
  x: number,
  z: number,
  rumbo: number,
  c: Celda,
): { readonly margen: number; readonly queda: Lado | null } {
  const { fx, fz, dx, dz } = ejes(rumbo);
  const ax = c.x - x;
  const az = c.z - z;
  const delante = ax * fx + az * fz;
  const aLaDerecha = ax * dx + az * dz;
  const rojo = radioDelRojo(c);
  const cerca = delante > 0 ? Math.abs(aLaDerecha) : Math.hypot(ax, az);
  /*
   * La tormenta queda a la derecha de quien pasa por su izquierda. Clavada en
   * el morro no queda a ningún lado: ahí todavía no se ha elegido.
   */
  const queda: Lado | null =
    Math.abs(aLaDerecha) < 1 ? null : aLaDerecha > 0 ? "derecha" : "izquierda";
  return { margen: cerca - rojo, queda };
}

/** Lo que el ejercicio necesita mirar del vuelo. Todo en m y rad. */
export interface LecturaDeTormenta {
  readonly x: number;
  readonly z: number;
  /** Hacia dónde va de verdad: el rumbo de la trayectoria, no el del morro. */
  readonly rumbo: number;
  readonly enElSuelo: boolean;
  /** Quieto en el suelo. */
  readonly parado: boolean;
  /** Si el vuelo acaba de terminar en un percance. */
  readonly percance: boolean;
}

/** Cómo terminó. Ninguno es un reproche. */
export type CierreDeTormenta =
  /** Rodeada con su margen: lo que se practicaba. */
  | "rodeada"
  /** Rodeada sin entrar, pero más cerca de lo que se rodea: bien, y más lejos. */
  | "rodeadaCerca"
  /** Algo salió mal: se repite, como en el simulador. */
  | "otraVez";

export type SucesoDeTormenta =
  /** Contar qué es antes de nada: nunca por sorpresa. */
  | { readonly que: "presentar" }
  /** Por qué no se entra y por dónde se rodea. */
  | { readonly que: "explicar"; readonly lado: Lado }
  /** Avisar a quien corresponde: al control, y al pasaje con el cartel. */
  | { readonly que: "avisar"; readonly lado: Lado }
  /** Con este rumbo todavía se pasa cerca: un poco más hacia un lado. */
  | { readonly que: "girar"; readonly lado: Lado }
  /** Con este rumbo se pasa con margen. `margen` en m, del borde del rojo. */
  | { readonly que: "asiVa"; readonly margen: number }
  /** Un rayo en la tormenta, visto de lejos. `distancia` en m, del centro. */
  | { readonly que: "rayoLejos"; readonly distancia: number }
  /** Se entró en el rojo: la consecuencia, con calma. */
  | { readonly que: "entra" }
  /** Un rayo toca el avión, y no pasa nada. */
  | { readonly que: "rayoEnElAvion" }
  /** Se salió del eco después de haber entrado: y otra vez. */
  | { readonly que: "sale" }
  /** Quedó detrás sin entrar. `margen`, lo más cerca que se pasó del rojo. */
  | { readonly que: "rodeada"; readonly margen: number; readonly conMargen: boolean }
  | { readonly que: "cerrar"; readonly como: CierreDeTormenta };

export type FaseDeTormenta = "delante" | "dentro" | "fuera" | "rodeada" | "cerrada";

/** Cuándo se explica, s desde que empieza: detrás de la presentación. */
export const EXPLICA_A = 14;
/** Y cuándo se avisa al control y se enciende el cartel, s. */
export const AVISA_A = 26;
/**
 * Lo que se espera desde el aviso antes de pedir girar más, s: lo que tarda
 * quien juega en empezar a girar después de oírlo. Pedírselo encima del aviso
 * sería meter prisa.
 */
export const DEJA_GIRAR = 12;
/** Lo que pasa desde que se entra hasta que el rayo toca el avión, s. */
export const RAYO_TRAS_ENTRAR = 4;
/**
 * A qué distancia del borde del rojo, de más del margen, se ve el rayo de
 * lejos, m. Si se pasa más lejos, se ve al tenerla al costado.
 */
export const SE_VE_EL_RAYO = 15000;

export class PracticaDeTormenta {
  private faseActual: FaseDeTormenta = "delante";
  private segundos = 0;
  private presentada = false;
  private explicada = false;
  private avisada = false;
  /**
   * Si con el rumbo de ahora se pasa con margen. El «girá más» y el «así va»
   * se rearman **cuando esto cambia**, no con un reloj: un aviso vuelve cuando
   * cambia algo que pasa, no cuando pasa un rato.
   */
  private conMargenAhora: boolean | null = null;
  private girarDicho = false;
  private rayoVisto = false;
  private entro = false;
  private desdeQueEntro = 0;
  private rayoEnElAvion = false;
  private masCerca = Number.POSITIVE_INFINITY;
  private comoCerro: CierreDeTormenta | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    readonly escena: Escena,
  ) {}

  get fase(): FaseDeTormenta {
    return this.faseActual;
  }

  /** Si en este intento se entró en el rojo. */
  get entroYa(): boolean {
    return this.entro;
  }

  /** Lo más cerca que se pasó del borde del rojo en este intento, m. */
  get loMasCerca(): number {
    return this.masCerca;
  }

  get cierre(): CierreDeTormenta | null {
    return this.comoCerro;
  }

  /** Otra vez desde el principio: se repite, como en el simulador. */
  reiniciar(): void {
    this.faseActual = "delante";
    this.segundos = 0;
    this.presentada = false;
    this.explicada = false;
    this.avisada = false;
    this.conMargenAhora = null;
    this.girarDicho = false;
    this.rayoVisto = false;
    this.entro = false;
    this.desdeQueEntro = 0;
    this.rayoEnElAvion = false;
    this.masCerca = Number.POSITIVE_INFINITY;
    this.comoCerro = null;
  }

  paso(l: LecturaDeTormenta, dt: number): SucesoDeTormenta[] {
    const sucesos: SucesoDeTormenta[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    this.segundos += dt;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }
    const c = this.escena.celda;
    const rojo = radioDelRojo(c);
    const distancia = Math.hypot(l.x - c.x, l.z - c.z);
    const eco = ecoEn([c], l.x, l.z);
    const ahora = pasoPorEsteRumbo(l.x, l.z, l.rumbo, c);

    // ── Ya rodeada: lo que queda es volver a casa y aterrizar ─────────────
    if (this.faseActual === "rodeada") {
      if (l.enElSuelo && l.parado)
        this.cerrar(
          this.masCerca >= MARGEN_DE_RODEO * TOLERANCIA ? "rodeada" : "rodeadaCerca",
          sucesos,
        );
      return sucesos;
    }

    if (!this.explicada && this.segundos >= EXPLICA_A) {
      this.explicada = true;
      sucesos.push({ que: "explicar", lado: LADO_DEL_VIENTO });
    }
    if (!this.avisada && this.segundos >= AVISA_A) {
      this.avisada = true;
      sucesos.push({ que: "avisar", lado: LADO_DEL_VIENTO });
    }

    // ── Dentro: la consecuencia, y salir ──────────────────────────────────
    if (!this.entro && eco >= ROJO && !l.enElSuelo) {
      this.entro = true;
      this.desdeQueEntro = 0;
      this.faseActual = "dentro";
      sucesos.push({ que: "entra" });
    }
    if (this.entro) {
      this.desdeQueEntro += dt;
      if (!this.rayoEnElAvion && this.desdeQueEntro >= RAYO_TRAS_ENTRAR && eco >= VERDE) {
        this.rayoEnElAvion = true;
        sucesos.push({ que: "rayoEnElAvion" });
      }
      if (this.faseActual === "dentro" && eco < VERDE) {
        this.faseActual = "fuera";
        sucesos.push({ que: "sale" });
      }
      return sucesos;
    }

    // ── Delante: cuánto se pasa, y el rayo que se ve ──────────────────────
    this.masCerca = Math.min(this.masCerca, distancia - rojo);
    /*
     * El rayo de lejos, una vez: al acercarse a menos del margen y algo, o al
     * tenerla al costado si se pasa más lejos. Es el mismo rayo para quien la
     * rodea y para quien va derecho a ella; a éste le llega antes.
     */
    const { fx, fz } = ejes(l.rumbo);
    const delante = (c.x - l.x) * fx + (c.z - l.z) * fz;
    const alCostado = delante < distancia * Math.cos((50 * Math.PI) / 180);
    if (
      !this.rayoVisto &&
      this.explicada &&
      (distancia - rojo <= MARGEN_DE_RODEO + SE_VE_EL_RAYO || alCostado)
    ) {
      this.rayoVisto = true;
      sucesos.push({ que: "rayoLejos", distancia });
    }
    /*
     * El rumbo de ahora, juzgado como lo juzga un piloto con el radar: si la
     * línea del rumbo pasa a su margen del rojo. Se dice al cambiar, y el
     * «girá más» solo una vez que ya se haya avisado y dado tiempo a girar.
     */
    if (this.avisada && delante > 0) {
      const conMargen = ahora.margen >= MARGEN_DE_RODEO * TOLERANCIA;
      if (conMargen && this.conMargenAhora !== true) {
        sucesos.push({ que: "asiVa", margen: ahora.margen });
      } else if (
        !conMargen &&
        this.conMargenAhora !== false &&
        this.segundos >= AVISA_A + DEJA_GIRAR &&
        (this.conMargenAhora === true || !this.girarDicho)
      ) {
        this.girarDicho = true;
        /*
         * Hacia el lado por el que ya se va, si ya se eligió uno: a quien
         * rodea por la izquierda, aunque sea corto, no se le hace cambiar de
         * lado. Si la línea del rumbo todavía entra en el rojo no se ha
         * elegido ninguno —a doscientos metros del centro, a un lado o al otro,
         * es lo que empuje el viento—: por el del viento.
         */
        const lado: Lado =
          ahora.queda === null || ahora.margen < 0
            ? LADO_DEL_VIENTO
            : ahora.queda === "derecha"
              ? "izquierda"
              : "derecha";
        sucesos.push({ que: "girar", lado });
      }
      if (conMargen || this.segundos >= AVISA_A + DEJA_GIRAR)
        this.conMargenAhora = conMargen;
    }
    /*
     * **Rodeada**: ya detrás, y al costado o pasada. Lo de detrás no basta
     * —quien da media vuelta también la deja detrás, y eso es otra decisión—:
     * hay que seguir yendo hacia casa, y la tormenta tiene que haber quedado
     * a más de setenta grados del camino que se traía, o sea al costado.
     */
    const r = this.escena.rumbo;
    const haciaCasa = Math.cos(l.rumbo - r) > 0.2;
    const enElCamino = ((c.x - l.x) * Math.sin(r) + (c.z - l.z) * -Math.cos(r)) / distancia;
    const alLado = enElCamino < Math.cos((70 * Math.PI) / 180);
    if (alLado && haciaCasa && delante < 0 && !l.enElSuelo) {
      this.faseActual = "rodeada";
      sucesos.push({
        que: "rodeada",
        margen: this.masCerca,
        conMargen: this.masCerca >= MARGEN_DE_RODEO * TOLERANCIA,
      });
    }
    return sucesos;
  }

  private cerrar(como: CierreDeTormenta, sucesos: SucesoDeTormenta[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

/** Lo que mide el margen en las unidades del peldaño: km, o millas náuticas. */
export function margenEnUnidades(
  metros: number,
  unidades: "metric" | "aeronautical",
): { readonly n: number; readonly unidad: "km" | "NM" } {
  return unidades === "aeronautical"
    ? { n: Math.round(Math.max(0, metros) / MILLA), unidad: "NM" }
    : { n: Math.round(Math.max(0, metros) / 1000), unidad: "km" };
}
