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
 * **En el bimotor de pistón no hay V1**, y lo que manda es su manual: con las
 * ruedas en el suelo, o recién despegado con el tren todavía fuera, se para;
 * con el tren dentro y subiendo, se sigue. Ver `conV1` en `decide-con-v1.ts`.
 * Aquí «antes de V1» quiere decir eso: **donde su manual manda parar**.
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
 *
 * **Sin aire en la cabina**, los motores van bien y lo que se vuela es el
 * descenso de emergencia: aquí solo se dice cuándo se va el aire, y el
 * procedimiento —el aviso, las máscaras, la bajada, el MAYDAY— lo lleva el
 * juego con `despresurizacion.ts`. Lo demás es lo de cualquier emergencia
 * declarada: la torre aparta a todos, los bomberos esperan junto a la pista y
 * se vuelve a aterrizar.
 *
 * **La carga que se suelta** tampoco toca un motor: aquí solo se dice cuándo
 * se suelta, y lo que se corre lo cuenta `carga-suelta.ts`. Su procedimiento
 * es volar el avión y aterrizar en el campo más cercano, sin declarar: ni
 * llamada ni bomberos, que nada se ha roto. Ver el ADR 0033, enmienda H38g.
 *
 * **El tren de morro que no sale** tampoco: al sacar el tren para aterrizar,
 * la pata de morro se queda en su pozo. Lo primero es lo de su manual, la
 * extensión de emergencia, que la compañera prueba en cuanto se va por debajo
 * de la velocidad a la que se puede; no sale, y entonces se declara —PAN PAN:
 * algo va mal y hay tiempo— y se aterriza con la nariz arriba. Los bomberos,
 * esperando. Ver el ADR 0014, enmienda H70.
 *
 * **La radio que se calla** tampoco: aquí solo se dice cuándo, y qué enseña
 * la lámpara de la torre a cada paso —la lee el juego con la misma regla de
 * sus permisos, ver `fallo-de-radio.ts`—. Cada luz nueva es un paso, y tras
 * los destellos verdes se espera a que las alas contesten (de día; de noche
 * contesta la instructora con los faros). Sin declarar nada: ni llamada, que
 * no hay radio, ni bomberos, que nada se ha roto. Se acaba parado en la pista,
 * y se sabe si se tomó con la verde. Ver el ADR 0014, enmienda H71.
 */

import type { AircraftConfig } from "./aircraft";
import { conV1, type Averia, type Ejercicio, type Momento } from "./ejercicios";
import { motoresDeFuera } from "./motores";
import { AlasQueContestan, type LuzSinRadio } from "./fallo-de-radio";

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
  /**
   * **El tren**: `fuera` sin pedir que entre —o sin tren que meter—;
   * `entrando`, pedido dentro y de camino; `dentro`, del todo. Lo mira el
   * bimotor de pistón, que decide con él: ver `conV1`.
   */
  readonly tren: "fuera" | "entrando" | "dentro";
  /**
   * **Con la radio callada, lo que enseña la lámpara de la torre** a este
   * avión. Ver `luzParaQuienNoTieneRadio` en `fallo-de-radio.ts`.
   */
  readonly lampara?: LuzSinRadio;
  /** El alabeo, rad, positivo a la derecha: las alas que contestan. */
  readonly alabeo?: number;
  /** Si es de noche: entonces se contesta con los faros, no con las alas. */
  readonly deNoche?: boolean;
}

/** Las tres velocidades del despegue de hoy, indicadas. */
export interface Velocidades {
  readonly v1: number;
  readonly vr: number;
}

/** Cómo terminó. Ninguno es un reproche: ver `ejercicio.*` en el diccionario. */
export type Cierre =
  /*
   * «Antes de V1» es donde su manual manda parar; en el bimotor de pistón,
   * con el tren fuera. Ver la cabecera.
   */
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
   * El fallo. `motor` es cuál, de izquierda a derecha, o `null` si son todos
   * o si lo que falla no es un motor —ver `averia`—. `parar` dice qué toca
   * hacer, según su manual: antes de V1 en los de turbina, con el tren fuera
   * en el bimotor de pistón. Y `enElSuelo`, dónde.
   */
  | {
      readonly que: "fallo";
      readonly averia: Averia["que"];
      readonly motor: number | null;
      readonly parar: boolean;
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
  /** La compañera prueba la extensión de emergencia del tren: el pomo. */
  | { readonly que: "extension" }
  /** Y la rueda de morro tampoco sale así: se aterriza con la nariz arriba. */
  | { readonly que: "tampoco" }
  /** Con la radio callada, la lámpara de la torre enciende otra luz. */
  | { readonly que: "senal"; readonly luz: Exclude<LuzSinRadio, null>; readonly deNoche: boolean }
  /** Y se le contesta a sus destellos: con las alas, de día, o con los faros, de noche. */
  | { readonly que: "acuse"; readonly como: "alas" | "faros" }
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
 * cuatrocientos pies ni a nada: con la hélice en molinete ese avión no sube,
 * y la cuenta empieza en el fallo.
 */
export const IDENTIFICAR_Y_BANDERA = 4;

/** Y lo que se tarda en declarar después de asegurar, s. */
export const Y_DECLARAR = 4;

/**
 * **Lo que se espera desde que la rueda de morro no sale hasta probar la de
 * emergencia**, s: lo que tarda la instructora en contarlo —las dos luces y
 * el espejo de la góndola, que es donde se ve la rueda (POH del Seneca III,
 * VB-1110, p. 7-10a)— antes de que la compañera haga nada. Un paso no se
 * pisa con el siguiente: ver `valeHastaElPasoSiguiente` en `audio/boca.ts`.
 */
export const ANTES_DE_LA_EMERGENCIA = 10;

/**
 * **Y lo que se espera a que salga por la de emergencia**, s: lo que tarda en
 * salir su tren de siempre, los siete segundos de su manual. Pasado eso, no
 * ha salido.
 */
export const LO_QUE_SE_ESPERA_AL_TREN = 7;

/** Por encima de esto se está volando de verdad, no botando, m. */
const EN_EL_AIRE = 15;

export class Practica {
  private faseActual: FaseDePractica = "armada";
  private presentada = false;
  private elegida: Averia;
  private cual: number | null = null;
  /** Si su manual manda parar donde falló. Ver `seParaAqui`. */
  private tocaParar = false;
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
  private conElTrenFuera = false;
  private comoCerro: Cierre | null = null;
  /** Si el tren llegó a pedirse dentro: sin eso, no hay pata de morro que no salga. */
  private trenMetido = false;
  /** Si la compañera ya probó la extensión de emergencia, y desde cuándo. */
  private extendida = false;
  private desdeLaExtension = 0;
  /** Con la radio callada: la última luz encendida, y si a sus destellos ya se contestó. */
  private ultimaLuz: LuzSinRadio = null;
  private alas: AlasQueContestan | null = null;
  private contestadas = 0;
  /** Si al tocar la pista la lámpara estaba en verde fija. */
  private conLaVerde: boolean | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    private readonly avion: Pick<
      AircraftConfig,
      "motores" | "motoresA" | "sound" | "motorParado"
    > &
      Partial<Pick<AircraftConfig, "extensionDeEmergenciaHasta">>,
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

  /**
   * Si donde falló su manual manda parar: antes de V1, o con el tren fuera en
   * el bimotor de pistón. Solo tiene sentido después del fallo.
   */
  get parar(): boolean {
    return this.tocaParar;
  }

  /**
   * Si falló subiendo **con el tren todavía fuera**: el de «Motor con el tren
   * arriba» cuando nadie lo mete. Ver `sinTrenA` en `Momento`.
   */
  get trenFueraAlFallar(): boolean {
    return this.conElTrenFuera;
  }

  /** Si ya se aseguró el motor parado. */
  get aseguradoYa(): boolean {
    return this.asegurada;
  }

  /** Si la compañera ya probó la extensión de emergencia del tren. */
  get extensionProbada(): boolean {
    return this.extendida;
  }

  /** Cuántas veces se contestó a los destellos verdes de la lámpara. */
  get contestaciones(): number {
    return this.contestadas;
  }

  /** Si al tocar la pista la lámpara estaba en verde fija; `null` sin haber tocado. */
  get tomoConLaVerde(): boolean | null {
    return this.conLaVerde;
  }

  /** Si ya se declaró la emergencia. Desde ahí, la torre da prioridad. */
  get declaradaYa(): boolean {
    return this.declarada;
  }

  /**
   * **Los segundos desde el fallo**, en el reloj del juego: lo que lleva
   * corrida la carga que se suelta. Cero antes del fallo.
   */
  get segundosDesdeElFallo(): number {
    return this.desdeElFallo;
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
    this.tocaParar = false;
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
    this.conElTrenFuera = false;
    this.comoCerro = null;
    this.trenMetido = false;
    this.extendida = false;
    this.desdeLaExtension = 0;
    this.ultimaLuz = null;
    this.alas = null;
    this.contestadas = 0;
    this.conLaVerde = null;
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
    if (this.yaCorrio && l.tren === "dentro") this.trenMetido = true;

    if (this.faseActual === "armada") {
      if (this.tocaFallar(this.elegida.cuando, l)) {
        this.faseActual = "fallo";
        this.cual = this.elegida.que === "motor" ? this.cualSePara() : null;
        this.tocaParar = this.seParaAqui(l);
        this.falloEnElSuelo = l.enElSuelo;
        this.conElTrenFuera =
          this.elegida.cuando.en === "subida" && !!this.elegida.cuando.sinTrenA && l.tren === "fuera";
        sucesos.push({
          que: "fallo",
          averia: this.elegida.que,
          motor: this.cual,
          parar: this.tocaParar,
          enElSuelo: l.enElSuelo,
        });
      }
      return sucesos;
    }

    // ── Después del fallo ────────────────────────────────────────────────
    this.desdeElFallo += dt;
    if (!l.enElSuelo && l.sobreElCampo > EN_EL_AIRE) this.volo = true;
    if (this.elegida.que === "morro") {
      this.pasoDelMorro(l, dt, sucesos);
      return sucesos;
    }
    if (this.elegida.que === "radio") {
      this.pasoSinRadio(l, dt, sucesos);
      return sucesos;
    }
    /*
     * **Y el bimotor de pistón que sigue vuela desde el fallo.** Si su manual
     * le deja seguir —el tren ya pedido dentro—, la compañera no espera a los
     * quince metros para la bandera: con la hélice en molinete ese avión no
     * sube, y la bandera va en cuanto se ha identificado el motor.
     */
    if (!this.tocaParar && !l.enElSuelo && !conV1(this.avion)) this.volo = true;

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
        this.cerrar(this.tocaParar ? "parado" : "paradoTrasV1", sucesos);
      }
      return sucesos;
    }

    // ── En el aire: el procedimiento ──────────────────────────────────────
    // Sin un motor concreto que asegurar: todos parados, o la cabina sin aire.
    const todos = this.cual === null;
    /*
     * La velocidad de un motor —la V2, o la línea azul— es la de **subir**
     * después de un fallo en el despegue. Al que ya volaba en su final no se
     * le pide subir: se le pide la aproximación de siempre, y eso ya lo dice
     * el juego.
     */
    const despegando = this.elegida.cuando.en !== "aire";
    /*
     * Y si falló con el tren fuera, no hasta que entre: «con un motor se sube
     * despacio, pero se sube» no es verdad con las patas colgando.
     */
    const limpio = !this.conElTrenFuera || l.tren !== "fuera";
    if (!this.dichaLaVelocidad && !todos && !l.enElSuelo && despegando && limpio) {
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
    /*
     * Todos parados: la llamada ya la hace el vuelo sin motor. Ver
     * `sin-motor.ts`. Y sin aire en la cabina, el descenso de emergencia: ver
     * `avisarDeLaCabina` en `game.ts`. La carga suelta no se declara: ver la
     * cabecera.
     */
    if (todos && this.elegida.que !== "carga") this.declarada = true;
    if (!this.bomberos && this.declarada && (l.enFinal || l.enElSuelo)) {
      this.bomberos = true;
      sucesos.push({ que: "bomberos", donde: "pista" });
    }
    if (l.enElSuelo && l.parado) {
      this.cerrar(this.tocaParar ? "seguidoAntesDeV1" : "vuelta", sucesos);
    }
    return sucesos;
  }

  /**
   * **El tren de morro que no sale, en el orden de su manual**: primero la
   * extensión de emergencia, que la compañera prueba en cuanto la velocidad lo
   * deja; esperado lo que tarda un tren, no ha salido, y se declara. Y se
   * acaba como cualquier vuelta: parado en la pista.
   */
  private pasoDelMorro(l: Lectura, dt: number, sucesos: Suceso[]): void {
    const hasta = this.avion.extensionDeEmergenciaHasta ?? Infinity;
    if (!this.extendida) {
      if (!l.enElSuelo && this.desdeElFallo >= ANTES_DE_LA_EMERGENCIA && l.indicada <= hasta) {
        this.extendida = true;
        this.desdeLaExtension = 0;
        sucesos.push({ que: "extension" });
      }
    } else if (!this.declarada) {
      this.desdeLaExtension += dt;
      if (this.desdeLaExtension >= LO_QUE_SE_ESPERA_AL_TREN && !l.enElSuelo) {
        this.declarada = true;
        sucesos.push({ que: "tampoco" });
        sucesos.push({ que: "declarar", socorro: "panpan" });
      }
    }
    if (!this.bomberos && this.declarada && (l.enFinal || l.enElSuelo)) {
      this.bomberos = true;
      sucesos.push({ que: "bomberos", donde: "pista" });
    }
    if (l.enElSuelo && l.parado) this.cerrar("vuelta", sucesos);
  }

  /**
   * **Sin radio, lo que enseña la lámpara**: cada luz nueva es un paso, y
   * tras los destellos verdes se espera la contestación —de día, las alas;
   * de noche, los faros, que los pone la instructora—. Se acaba como una
   * vuelta, parado en la pista, apuntando si se tocó con la verde fija.
   */
  private pasoSinRadio(l: Lectura, dt: number, sucesos: Suceso[]): void {
    const luz = l.enElSuelo ? null : (l.lampara ?? null);
    if (luz !== null && luz !== this.ultimaLuz) {
      this.ultimaLuz = luz;
      const deNoche = l.deNoche ?? false;
      sucesos.push({ que: "senal", luz, deNoche });
      this.alas = null;
      if (luz === "destellos") {
        if (deNoche) {
          this.contestadas++;
          sucesos.push({ que: "acuse", como: "faros" });
        } else this.alas = new AlasQueContestan();
      }
    }
    if (this.alas && !l.enElSuelo && this.alas.paso(l.alabeo ?? 0, dt)) {
      this.alas = null;
      this.contestadas++;
      sucesos.push({ que: "acuse", como: "alas" });
    }
    if (l.enElSuelo && this.conLaVerde === null && this.volo) this.conLaVerde = this.ultimaLuz === "verde";
    if (l.enElSuelo && l.parado && this.volo) this.cerrar("vuelta", sucesos);
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
        l.vertical > 0 &&
        (!m.trenDentro ||
          l.tren === "dentro" ||
          // Y si no entra, a su altura falla igual: ver `sinTrenA`.
          (m.sinTrenA !== undefined && l.tren === "fuera" && l.sobreElCampo >= m.sinTrenA))
      );
    if (m.en === "tren") return this.trenMetido && !l.enElSuelo && l.tren === "fuera";
    return !l.enElSuelo && this.segundos >= m.segundos;
  }

  /**
   * **Si su manual manda parar donde ha fallado.**
   *
   * En los de turbina, V1: en el suelo y sin llegar a ella. En el bimotor de
   * pistón, el tren: en el suelo siempre —rota a 72 nudos, y su manual para
   * por debajo de 85—, y en el aire mientras el tren siga fuera y quede la
   * pista debajo, que es mientras no vuela de verdad. Ver `conV1`.
   *
   * Lo que no es un motor —todos, la cabina sin aire— nunca llega en la
   * carrera, y sigue la regla de siempre.
   */
  private seParaAqui(l: Lectura): boolean {
    if (this.elegida.que === "motor" && !conV1(this.avion))
      return l.enElSuelo || (l.tren === "fuera" && l.sobreElCampo <= EN_EL_AIRE);
    return l.enElSuelo && l.indicada < this.velocidades.v1;
  }

  /**
   * **Cuándo se asegura**: en los de turbina, a cuatrocientos pies; en el
   * bimotor de pistón, en cuanto se ha identificado, porque con la hélice en
   * molinete no sube. Y si el fallo llegó ya en el aire y alto, a los pocos
   * segundos: identificar, comprobar y asegurar.
   */
  private tocaAsegurar(l: Lectura): boolean {
    if (!conV1(this.avion)) return this.desdeElFallo >= IDENTIFICAR_Y_BANDERA;
    if (!this.falloEnElSuelo) return this.desdeElFallo >= IDENTIFICAR_Y_BANDERA + 1;
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
