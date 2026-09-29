/**
 * **Un ejercicio de emergencia en marcha**: cuándo falla, qué toca después y
 * cómo acaba.
 *
 * `ejercicios.ts` dice **qué** se puede practicar; esto lo hace pasar, paso a
 * paso y en el orden de una tripulación de verdad. No habla, no dibuja y no
 * toca el avión: lee cómo va el vuelo y devuelve **sucesos** —«falla ahora el
 * motor izquierdo», «asegurá el motor», «declará»—, y el juego decide quién
 * dice cada cosa en cada peldaño. Así se puede probar sin three.js y sin
 * audio, y la escalera sigue viviendo en un solo sitio, `escalera.ts`.
 *
 * ## El orden, que es lo que se enseña
 *
 * **Antes de V1**, en la carrera: se para. Gas atrás, frenos —y reversa donde
 * la hay—, y se acabó el ejercicio cuando el avión está quieto. Parar a tiempo
 * **es** hacerlo bien, y cuenta como una frustrada: renunciar es ganar.
 *
 * **Pasada V1**, o ya en el aire: se vuela. Primero el avión —el pie del lado
 * del motor bueno, la nariz a la velocidad de un motor, el tren dentro—, y
 * **nada más hasta tener altura**: en un avión de línea no se toca ningún
 * mando de motor por debajo de cuatrocientos pies. Allí la compañera asegura
 * el motor parado. Después se declara la emergencia, y la torre aparta a todos
 * y pone a los bomberos junto a la pista. Y se vuelve a aterrizar.
 *
 * **Si sale mal**, sale mal el ejercicio: se dice con calma y se repite. Nadie
 * se hace daño en un simulador, y eso se puede decir tal cual.
 */

import type { AircraftConfig } from "./aircraft";
import type { Averia, Ejercicio, Momento } from "./ejercicios";
import { motoresDeFuera } from "./motores";

/** Cómo va el vuelo, lo que la práctica necesita mirar. Todo en m y m/s. */
export interface Lectura {
  readonly enElSuelo: boolean;
  /** En la carrera de despegue, según la fase del vuelo. */
  readonly corriendo: boolean;
  /** Las ruedas en la pista. */
  readonly enPista: boolean;
  /** La velocidad indicada. */
  readonly indicada: number;
  /** La altura sobre el campo. */
  readonly sobreElCampo: number;
  readonly vertical: number;
  /** Quieto en el suelo. */
  readonly parado: boolean;
  /** Si el vuelo acaba de terminar en un percance. */
  readonly percance: boolean;
  /** Alineado con una cabecera y cerca: la pista delante. */
  readonly enFinal: boolean;
}

/** Las tres velocidades del despegue de hoy, indicadas. */
export interface Velocidades {
  readonly v1: number;
  readonly vr: number;
}

/** Cómo terminó. Ninguno es un reproche: ver `ejercicio.*` en el diccionario. */
export type Cierre =
  /** Falló antes de V1 y se paró en la pista: lo que se practicaba. */
  | "parado"
  /** Falló pasada V1 y se paró igual, y cupo: bien, y se cuenta qué se hace. */
  | "paradoTrasV1"
  /** Se voló con el fallo y se aterrizó: lo que se practicaba. */
  | "vuelta"
  /** Falló antes de V1 y se siguió, y se volvió bien: y se cuenta qué se hace. */
  | "seguidoAntesDeV1"
  /** Algo salió mal: se repite, como en el simulador. */
  | "otraVez";

export type Suceso =
  /** Contar el ejercicio antes de empezar. */
  | { readonly que: "presentar" }
  /**
   * El fallo. `motor` es cuál, de izquierda a derecha, o `null` si son todos.
   * `antesDeV1` y `enElSuelo` dicen qué toca hacer.
   */
  | {
      readonly que: "fallo";
      readonly motor: number | null;
      readonly antesDeV1: boolean;
      readonly enElSuelo: boolean;
    }
  /** Ya en el aire y subiendo: sostener la velocidad de un motor. */
  | { readonly que: "velocidad" }
  /** La compañera asegura el motor parado: la hélice en bandera, si la tiene. */
  | { readonly que: "asegurar"; readonly motor: number }
  /**
   * Declarar la emergencia. MAYDAY cuando queda un motor o ninguno: peligro
   * grave e inminente, que es la definición de socorro. PAN PAN en el
   * cuatrimotor que pierde uno: algo va mal y hay tiempo, que es la urgencia.
   */
  | { readonly que: "declarar"; readonly socorro: "mayday" | "panpan" }
  /**
   * Los bomberos: esperando junto a la pista a quien vuelve, o junto al avión
   * parado a mirarle los frenos.
   */
  | { readonly que: "bomberos"; readonly donde: "pista" | "avion" }
  | { readonly que: "cerrar"; readonly como: Cierre };

export type FaseDePractica = "armada" | "fallo" | "cerrada";

/**
 * **La altura a la que se empieza a tocar el motor parado**, m sobre el campo.
 *
 * Cuatrocientos pies, ciento veintidós metros: por debajo, en un avión de
 * línea se vuela y nada más. Es la regla de Airbus y de Boeing, y el motivo es
 * el de siempre: tocar el motor equivocado cerca del suelo es peor que no
 * tocar ninguno.
 */
export const ALTURA_PARA_ASEGURAR = 122;

/**
 * **Lo que tarda la compañera** en asegurar el motor de un bimotor de pistón,
 * s: identificar —el pie que no pisa es el motor que no va—, comprobar con el
 * gas de ese motor y poner la hélice en bandera. Ahí no se espera a los
 * cuatrocientos pies: con la hélice en molinete ese avión no sube.
 */
export const IDENTIFICAR_Y_BANDERA = 4;

/** Y lo que se tarda en declarar después de asegurar, s. */
export const Y_DECLARAR = 4;

/** Por encima de esto se está volando de verdad, no botando, m. */
const EN_EL_AIRE = 15;

export class Practica {
  private faseActual: FaseDePractica = "armada";
  private presentada = false;
  private elegida: Averia;
  private cual: number | null = null;
  private fueAntesDeV1 = false;
  private falloEnElSuelo = false;
  private volo = false;
  private dichaLaVelocidad = false;
  private asegurada = false;
  private declarada = false;
  private bomberos = false;
  private segundos = 0;
  private desdeElFallo = 0;
  private desdeQueAsegura = 0;
  private yaCorrio = false;
  private comoCerro: Cierre | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    private readonly avion: Pick<
      AircraftConfig,
      "motores" | "motoresA" | "sound" | "motorParado"
    >,
    private velocidades: Velocidades,
    private readonly azar: () => number = Math.random,
  ) {
    this.elegida = this.sortear();
  }

  get fase(): FaseDePractica {
    return this.faseActual;
  }

  /** Lo que se eligió que fallara hoy. Ver `Ejercicio.averias`. */
  get averia(): Averia {
    return this.elegida;
  }

  /** El motor que se paró, o `null` si todavía nada o si fueron todos. */
  get motorParado(): number | null {
    return this.cual;
  }

  /** Si el fallo llegó antes de V1. Solo tiene sentido después del fallo. */
  get antesDeV1(): boolean {
    return this.fueAntesDeV1;
  }

  /** Si ya se aseguró el motor parado. */
  get aseguradoYa(): boolean {
    return this.asegurada;
  }

  /** Si ya se declaró la emergencia. Desde ahí, la torre da prioridad. */
  get declaradaYa(): boolean {
    return this.declarada;
  }

  /** Cómo acabó, si acabó. */
  get cierre(): Cierre | null {
    return this.comoCerro;
  }

  /** Las velocidades de hoy, si cambian: otra pista, otro aire. */
  ponerVelocidades(v: Velocidades): void {
    this.velocidades = v;
  }

  /**
   * **Un vuelo nuevo**: todo otra vez, y con otro sorteo si hay varias
   * averías posibles. Se repite, como en el simulador.
   */
  reiniciar(): void {
    this.faseActual = "armada";
    this.presentada = false;
    this.cual = null;
    this.fueAntesDeV1 = false;
    this.falloEnElSuelo = false;
    this.volo = false;
    this.dichaLaVelocidad = false;
    this.asegurada = false;
    this.declarada = false;
    this.bomberos = false;
    this.segundos = 0;
    this.desdeElFallo = 0;
    this.desdeQueAsegura = 0;
    this.yaCorrio = false;
    this.comoCerro = null;
    this.elegida = this.sortear();
  }

  /** Un paso: lo que toca hacer ahora, si toca algo. */
  paso(l: Lectura, dt: number): Suceso[] {
    const sucesos: Suceso[] = [];
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
    if (l.corriendo) this.yaCorrio = true;

    if (this.faseActual === "armada") {
      if (this.tocaFallar(this.elegida.cuando, l)) {
        this.faseActual = "fallo";
        this.cual = this.elegida.que === "motores" ? null : this.cualSePara();
        this.fueAntesDeV1 =
          l.enElSuelo && l.indicada < this.velocidades.v1;
        this.falloEnElSuelo = l.enElSuelo;
        sucesos.push({
          que: "fallo",
          motor: this.cual,
          antesDeV1: this.fueAntesDeV1,
          enElSuelo: l.enElSuelo,
        });
      }
      return sucesos;
    }

    // ── Después del fallo ────────────────────────────────────────────────
    this.desdeElFallo += dt;
    if (!l.enElSuelo && l.sobreElCampo > EN_EL_AIRE) this.volo = true;

    /*
     * **En el suelo sin haber volado**: una parada. Se acaba al quedarse
     * quieto, y está bien hecha si queda en la pista —ya lo diría el
     * percance si no—.
     */
    if (!this.volo) {
      if (l.enElSuelo && l.parado && this.desdeElFallo > 1) {
        if (!this.bomberos) {
          // Tras una parada rápida los frenos queman: van a mirarlos.
          this.bomberos = true;
          sucesos.push({ que: "bomberos", donde: "avion" });
        }
        this.cerrar(this.fueAntesDeV1 ? "parado" : "paradoTrasV1", sucesos);
      }
      return sucesos;
    }

    // ── En el aire: el procedimiento ──────────────────────────────────────
    const todos = this.cual === null;
    /*
     * La velocidad de un motor —la V2, o la línea azul— es la de **subir**
     * después de un fallo en el despegue. Al que ya volaba en su final no se
     * le pide subir: se le pide la aproximación de siempre, y eso ya lo dice
     * el juego.
     */
    const despegando = this.elegida.cuando.en !== "aire";
    if (!this.dichaLaVelocidad && !todos && !l.enElSuelo && despegando) {
      const subiendo = l.vertical > 0.5 || !this.falloEnElSuelo;
      if (subiendo && this.desdeElFallo > 2) {
        this.dichaLaVelocidad = true;
        sucesos.push({ que: "velocidad" });
      }
    }
    if (!this.asegurada && !todos && this.cual !== null && !l.enElSuelo) {
      if (this.tocaAsegurar(l)) {
        this.asegurada = true;
        this.desdeQueAsegura = 0;
        sucesos.push({ que: "asegurar", motor: this.cual });
      }
    }
    if (this.asegurada) this.desdeQueAsegura += dt;
    if (!this.declarada && !todos && this.asegurada) {
      if (this.desdeQueAsegura >= Y_DECLARAR) {
        this.declarada = true;
        sucesos.push({
          que: "declarar",
          socorro: this.avion.motores > 2 ? "panpan" : "mayday",
        });
      }
    }
    // Todos parados: la llamada ya la hace el vuelo sin motor. Ver `sin-motor.ts`.
    if (todos) this.declarada = true;
    if (!this.bomberos && this.declarada && (l.enFinal || l.enElSuelo)) {
      this.bomberos = true;
      sucesos.push({ que: "bomberos", donde: "pista" });
    }
    if (l.enElSuelo && l.parado) {
      this.cerrar(
        this.fueAntesDeV1 && this.falloEnElSuelo ? "seguidoAntesDeV1" : "vuelta",
        sucesos,
      );
    }
    return sucesos;
  }

  private cerrar(como: Cierre, sucesos: Suceso[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }

  private tocaFallar(m: Momento, l: Lectura): boolean {
    const { v1, vr } = this.velocidades;
    if (m.en === "carrera") {
      if (m.antesDeV1)
        return l.corriendo && l.enElSuelo && l.indicada >= v1 * 0.8;
      /*
       * A medio camino entre V1 y la rotación, que es el «fallo de V1» de un
       * simulador de verdad. Y si alguien rota antes de llegar ahí —en un
       * avión ligero no hace falta mucho—, en cuanto las ruedas dejan el
       * suelo: sigue siendo después de V1.
       */
      if (l.corriendo && l.enElSuelo) return l.indicada >= v1 + (vr - v1) * 0.5;
      return this.yaCorrio && !l.enElSuelo && l.sobreElCampo > 3;
    }
    if (m.en === "subida")
      return (
        this.yaCorrio &&
        !l.enElSuelo &&
        l.sobreElCampo >= m.metros &&
        l.vertical > 0
      );
    return !l.enElSuelo && this.segundos >= m.segundos;
  }

  /**
   * **Cuándo se asegura**: en los de turbina, a cuatrocientos pies; en el
   * bimotor de pistón, en cuanto se ha identificado, porque con la hélice en
   * molinete no sube. Y si el fallo llegó ya en el aire y alto, a los pocos
   * segundos: identificar, comprobar y asegurar.
   */
  private tocaAsegurar(l: Lectura): boolean {
    if (!this.falloEnElSuelo) return this.desdeElFallo >= IDENTIFICAR_Y_BANDERA + 1;
    if (this.avion.sound.engine === "piston")
      return this.desdeElFallo >= IDENTIFICAR_Y_BANDERA;
    return l.sobreElCampo >= ALTURA_PARA_ASEGURAR && this.desdeElFallo >= 3;
  }

  /** El de fuera, a un lado o al otro: se practican los dos pies. */
  private cualSePara(): number {
    const fuera = motoresDeFuera(this.avion);
    if (!fuera) return 0;
    return this.azar() < 0.5 ? fuera[0] : fuera[1];
  }

  private sortear(): Averia {
    const todas = this.ejercicio.averias;
    return todas[Math.min(todas.length - 1, Math.floor(this.azar() * todas.length))]!;
  }
}

/**
 * Una línea del EICAS: el mensaje de precaución, lo que ya se hizo o lo que
 * falta por hacer.
 */
export interface MensajeDeMotor {
  readonly texto: string;
  readonly clase: "precaucion" | "hecho" | "pendiente";
}

/**
 * **Lo que dice la pantalla de motores de un motor parado**, como lo escribe
 * una cabina de pantallas: el mensaje de precaución arriba —«ENG 1 FAIL»— y
 * debajo, en cuanto se asegura, lo que se hizo, cada cosa con su nombre y su
 * posición. En inglés de cabina, como todos los rótulos de instrumento.
 *
 * Según el motor, porque no se hace lo mismo:
 *
 * - **Turbohélice**: la hélice ya se puso en bandera sola (*autofeather*), y
 *   se corta el combustible con la palanca de condición.
 * - **Reactor**: el gas de ese motor al mínimo y su combustible cortado. El
 *   fan sigue girando con el aire; no hay bandera que poner.
 *
 * El bimotor de pistón no tiene pantallas ni mensajes: se reconoce en las
 * agujas y en los pies, y lo cuenta la instructora. `[]` para él.
 */
export function listaDelMotor(
  a: Pick<AircraftConfig, "sound">,
  motor: number,
  asegurado: boolean,
): readonly MensajeDeMotor[] {
  if (a.sound.engine === "piston" || a.sound.engine === "radial") return [];
  const n = motor + 1;
  const falla: MensajeDeMotor = { texto: `ENG ${n} FAIL`, clase: "precaucion" };
  const clase = asegurado ? "hecho" : "pendiente";
  if (a.sound.engine === "turboprop")
    return [
      falla,
      { texto: `AUTOFEATHER ${n} · FEATHERED`, clase },
      { texto: `COND LEVER ${n} · FUEL OFF`, clase },
    ];
  return [
    falla,
    { texto: `THR LEVER ${n} · IDLE`, clase },
    { texto: `FUEL CONTROL ${n} · CUTOFF`, clase },
  ];
}

/**
 * De qué lado se paró el motor, que es lo que dice qué pie hay que pisar: el
 * **contrario**. «Pie muerto, motor muerto», dicen los manuales en inglés: el
 * pie que no hace nada está del lado del motor que no va.
 */
export function ladoDelMotor(
  a: Pick<AircraftConfig, "motoresA">,
  i: number,
): "izquierdo" | "derecho" {
  return (a.motoresA[i] ?? 0) < 0 ? "izquierdo" : "derecho";
}
