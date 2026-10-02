/**
 * **La palanca de los aerofrenos, y lo que hacen sola los frenos de tierra y
 * el autofreno.**
 *
 * Contado volando, con el avión recién posado y el botón desaparecido: «¿cómo
 * que solo se ve en el aire? ¿Pero no es que los aerofrenos sirven para tierra
 * al frenar?». Sirven, y es la mitad de su oficio. Aquí la palanca era un
 * interruptor de dos posiciones que solo existía en vuelo, y en tierra no
 * salía nada.
 *
 * ## Una palanca, tres posiciones
 *
 * Es la del pedestal de cualquier avión de línea, a la izquierda de los gases:
 *
 * - **Recogida.** Abajo: los paneles planos sobre el ala.
 * - **Armada.** Un punto hacia arriba, antes de aterrizar —está en la lista—, y
 *   para despegar en los que lo hacen así. No saca nada: deja dicho que, al
 *   tocar, salgan solos.
 * - **Fuera.** A mano. En el aire, los paneles de vuelo hasta su tope, que es
 *   a medias: para bajar o frenar sin flaps. En tierra, todos y del todo: los
 *   frenos de tierra.
 *
 * El botón y la tecla la mueven en ese orden, y de «fuera» vuelve abajo.
 *
 * ## Lo que hacen solos
 *
 * Con la palanca armada, **al tocar con el gas al ralentí** y todavía deprisa
 * —por encima de sesenta nudos, que es cuando las ruedas ya giran—, salen
 * todos los paneles hasta arriba y la palanca sube sola a «fuera». Lo mismo en
 * un despegue abortado: gas al ralentí con la palanca armada y corriendo. Y
 * aunque no esté armada, **al poner la reversa en tierra**, que es la otra
 * forma que tienen los de Boeing y Airbus de saber que se está parando.
 *
 * Y se recogen **al meter gas** en tierra —la palanca baja sola, como en un
 * 737—, que es lo que pasa en un aterrizaje rebotado que se convierte en
 * frustrada y lo que se hace para rodar después de frenar; o a mano.
 *
 * En el aire, con la palanca fuera y el gas por encima de la mitad, se
 * recogen solos: volar con gas y frenando a la vez es quemar combustible para
 * nada, y la familia de Embraer no deja.
 *
 * ## El autofreno
 *
 * Un selector aparte: OFF, LO, MED o MAX. Armado, **entra cuando salen los
 * frenos de tierra** —LO a los cuatro segundos, MED a los dos y MAX en el
 * acto, como en la familia de Airbus— y sostiene su deceleración hasta parar.
 * Sin frenos de tierra no entra: por eso se arman los dos. Se desarma pisando
 * el freno, que es como se le quita al avión, o al recogerse los frenos de
 * tierra, que es al meter gas.
 *
 * Todo esto es estado del avión y no de quien vuela: lo lleva este objeto, y
 * `Input` lo pasa a los mandos cada fotograma. Ver `flight/frenada.ts` para lo
 * que frena cada cosa.
 */

import {
  DECELERACION_DEL_AUTOFRENO,
  ESPERA_DEL_AUTOFRENO,
  MODOS_DE_AUTOFRENO,
  type ModoDeAutofreno,
} from "./frenada";

export type PosicionDeLaPalanca = "recogida" | "armada" | "fuera";

/** El orden en que la mueven el botón y la tecla. */
const SIGUIENTE: Readonly<Record<PosicionDeLaPalanca, PosicionDeLaPalanca>> = {
  recogida: "armada",
  armada: "fuera",
  fuera: "recogida",
};

/** Lo que tardan los aerofrenos de vuelo en abrirse del todo, s. */
export const TARDAN_LOS_AEROFRENOS = 2;

/**
 * Y los de tierra, s. Uno: salen de golpe, que es lo que se ve por la
 * ventanilla al tocar —la fila entera de paneles levantándose a la vez—.
 */
export const TARDAN_LOS_DE_TIERRA = 1;

/**
 * Por encima de este gas los aerofrenos de vuelo se cierran solos: la mitad
 * del recorrido, como los cincuenta grados de palanca de Embraer.
 */
export const GAS_QUE_CIERRA_LOS_AEROFRENOS = 0.5;

/**
 * **El ralentí**, a efectos de la palanca: por debajo de este gas, los
 * gases están atrás. Cinco centésimas, que es dónde se quedan las palancas
 * de un avión de verdad «al ralentí» con la mano encima.
 */
export const GAS_AL_RALENTI = 0.05;

/**
 * **Y el gas que se considera «meter gas» en tierra**, que recoge los frenos
 * de tierra y desarma el autofreno: algo más que el ralentí, para que el
 * temblor de la mano no lo haga, y menos de lo que pide rodar.
 */
export const GAS_QUE_RECOGE = 0.12;

/**
 * Desde qué velocidad sobre el suelo salen solos, m/s: sesenta nudos, que es
 * cuando las ruedas ya giran de verdad y el avión sabe que está en tierra
 * corriendo y no rodando por la plataforma.
 */
export const SALEN_DESDE = 31;

/** Lo que ve la palanca del avión cada fotograma. */
export interface LoQueVeLaPalanca {
  /** El interruptor de tierra y aire: peso en las ruedas. */
  readonly enElSuelo: boolean;
  /** Velocidad sobre el suelo, m/s. */
  readonly velocidadSuelo: number;
  /** El gas, de 0 a 1. */
  readonly gas: number;
  /** La reversa, de 0 a 1. */
  readonly reversa: number;
  /** El pie en el freno, de 0 a 1. */
  readonly pie: number;
}

/** Lo que manda a los mandos. */
export interface LoQueSale {
  /** Los paneles de vuelo, de 0 a 1 (el tope de vuelo). */
  readonly aerofrenos: number;
  /** Todos los paneles, de 0 a 1. */
  readonly frenosDeTierra: number;
  /** La deceleración que pide el autofreno, m/s², o 0. */
  readonly autofreno: number;
}

/** Qué lleva el avión de todo esto. Va en su ficha. */
export interface LoQueLleva {
  readonly aerofrenos: boolean;
  readonly frenosDeTierra: boolean;
  readonly autofreno: boolean;
}

const NADA: LoQueLleva = {
  aerofrenos: false,
  frenosDeTierra: false,
  autofreno: false,
};

function hacia(desde: number, meta: number, paso: number): number {
  return Math.abs(meta - desde) <= paso ? meta : desde + Math.sign(meta - desde) * paso;
}

export class PalancaDeAerofrenos {
  private lleva: LoQueLleva = NADA;
  private _palanca: PosicionDeLaPalanca = "recogida";
  private _modo: ModoDeAutofreno = "off";
  /** Si los frenos de tierra han salido en esta carrera. */
  private deTierra = false;
  /** Segundos desde que salieron, para la espera del autofreno. */
  private desdeQueSalieron = 0;
  /** Si el autofreno está frenando ahora. */
  private _frenando = false;
  private enVuelo = 0;
  private enTierra = 0;

  /** Qué avión se vuela. Lo recoge todo, como un vuelo nuevo. */
  ponerAeronave(lleva: LoQueLleva): void {
    this.lleva = lleva;
    this.recoger();
  }

  /** Abajo y desarmado, de golpe: un vuelo nuevo u otro avión. */
  recoger(): void {
    this._palanca = "recogida";
    this._modo = "off";
    this.deTierra = false;
    this.desdeQueSalieron = 0;
    this._frenando = false;
    this.enVuelo = 0;
    this.enTierra = 0;
  }

  /** Si este avión tiene la palanca. */
  get hayPalanca(): boolean {
    return this.lleva.aerofrenos || this.lleva.frenosDeTierra;
  }

  /** Si tiene autofreno. */
  get hayAutofreno(): boolean {
    return this.lleva.autofreno;
  }

  get palanca(): PosicionDeLaPalanca {
    return this._palanca;
  }

  get modo(): ModoDeAutofreno {
    return this._modo;
  }

  /** Si el autofreno está frenando ahora mismo, y no solo armado. */
  get frenando(): boolean {
    return this._frenando;
  }

  /** Si los frenos de tierra están fuera. */
  get frenosDeTierraFuera(): boolean {
    return this.deTierra;
  }

  /** Dónde están los paneles de vuelo y todos, de 0 a 1. */
  get paneles(): { readonly enVuelo: number; readonly enTierra: number } {
    return { enVuelo: this.enVuelo, enTierra: this.enTierra };
  }

  /**
   * Un punto más de palanca: recogida, armada, fuera, y vuelta abajo.
   * Devuelve si había palanca que mover.
   */
  alternar(): boolean {
    if (!this.hayPalanca) return false;
    this.ponerPalanca(SIGUIENTE[this._palanca]);
    return true;
  }

  /** La palanca a una posición, a mano. */
  ponerPalanca(p: PosicionDeLaPalanca): void {
    if (!this.hayPalanca) return;
    this._palanca = p;
    // Bajarla a mano recoge lo que haya fuera, también los de tierra.
    if (p !== "fuera") this.quitarLosDeTierra();
  }

  /** Un punto más del selector del autofreno. Devuelve si lo hay. */
  alternarAutofreno(): boolean {
    if (!this.lleva.autofreno) return false;
    const i = MODOS_DE_AUTOFRENO.indexOf(this._modo);
    this.ponerAutofreno(MODOS_DE_AUTOFRENO[(i + 1) % MODOS_DE_AUTOFRENO.length]!);
    return true;
  }

  ponerAutofreno(m: ModoDeAutofreno): void {
    if (!this.lleva.autofreno) return;
    this._modo = m;
    if (m === "off") this._frenando = false;
  }

  private quitarLosDeTierra(): void {
    this.deTierra = false;
    this.desdeQueSalieron = 0;
    // Sin frenos de tierra el autofreno se desarma: es lo que lo activa.
    if (this._frenando) {
      this._frenando = false;
      this._modo = "off";
    }
  }

  /** Un fotograma: decide qué sale y lo mueve a su paso. */
  paso(dt: number, e: LoQueVeLaPalanca): LoQueSale {
    if (!this.hayPalanca) {
      this.enVuelo = 0;
      this.enTierra = 0;
      return { aerofrenos: 0, frenosDeTierra: 0, autofreno: 0 };
    }

    /*
     * **Meter gas los recoge**, y con ellos el autofreno: el aterrizaje
     * rebotado que pasa a frustrada —ya en el aire—, o rodar después de
     * parar. La palanca baja sola, como en un 737. Armada no se toca: armada
     * no saca nada.
     */
    if (
      e.gas > GAS_QUE_RECOGE &&
      (this.deTierra || (e.enElSuelo && this._palanca === "fuera"))
    ) {
      this.quitarLosDeTierra();
      this._palanca = "recogida";
    }
    if (e.enElSuelo) {
      const alRalenti = e.gas <= GAS_AL_RALENTI;
      const sale =
        !this.deTierra &&
        this.lleva.frenosDeTierra &&
        // A mano, en tierra: todos arriba.
        (this._palanca === "fuera" ||
          // Armada, al tocar o abortando, con el gas atrás y corriendo.
          (this._palanca === "armada" &&
            alRalenti &&
            e.velocidadSuelo > SALEN_DESDE) ||
          // Y con la reversa, esté como esté la palanca.
          e.reversa > 0);
      if (sale) {
        this.deTierra = true;
        this.desdeQueSalieron = 0;
        this._palanca = "fuera";
      }
    } else if (
      this._palanca === "fuera" &&
      !this.deTierra &&
      e.gas > GAS_QUE_CIERRA_LOS_AEROFRENOS
    ) {
      // En el aire, con gas, se cierran solos. Ver la cabecera.
      this._palanca = "recogida";
    }

    /*
     * **El autofreno**: armado, entra cuando salen los frenos de tierra y pasa
     * su espera; el pie lo desarma.
     */
    if (this.deTierra) this.desdeQueSalieron += dt;
    if (this._modo !== "off") {
      // Solo frenando: pisar el freno rodando hacia la pista con MAX armado
      // para despegar no lo quita, como en la familia de Airbus.
      if (e.pie > 0.5 && this._frenando) {
        this._frenando = false;
        this._modo = "off";
      } else if (
        this.deTierra &&
        this.desdeQueSalieron >= ESPERA_DEL_AUTOFRENO[this._modo]
      ) {
        this._frenando = true;
      }
    }

    const metaVuelo = this._palanca === "fuera" && !this.deTierra ? 1 : 0;
    const metaTierra = this.deTierra ? 1 : 0;
    this.enVuelo = this.lleva.aerofrenos
      ? hacia(this.enVuelo, metaVuelo, dt / TARDAN_LOS_AEROFRENOS)
      : 0;
    this.enTierra = hacia(this.enTierra, metaTierra, dt / TARDAN_LOS_DE_TIERRA);

    const autofreno =
      this._frenando && this._modo !== "off"
        ? DECELERACION_DEL_AUTOFRENO[this._modo]
        : 0;
    return {
      aerofrenos: this.enVuelo,
      frenosDeTierra: this.enTierra,
      autofreno,
    };
  }
}
