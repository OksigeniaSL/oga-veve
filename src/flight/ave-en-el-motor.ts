/**
 * **Un ave en el motor y su petardeo**: lo que hace ese motor, y la palanca
 * que lo calla (#90, ADR 0014, enmienda H77).
 *
 * El petardeo —*surge*, o *compressor stall*— es el aire del compresor que se
 * da la vuelta: las palas entran en pérdida como entra un ala, el aire
 * comprimido de atrás se escapa hacia delante y sale por la toma con un
 * estallido y, a veces, con llama por delante y por detrás. Un ave es una
 * causa corriente. Lo que se sabe de él sale de la guía de la FAA para
 * tripulaciones, *Airplane Turbofan Engine Operation and Malfunctions: Basic
 * Familiarization for Flight Crews*, capítulo 4 (pp. 18 a 24):
 *
 * - **Con cada estallido baja y vuelve.** «With each bang being separated by a
 *   couple of seconds», uno dura unos dos segundos y después el motor vuelve
 *   «to 98% of the pre-surge power for a few seconds» (p. 20). El ejemplo de
 *   un motor que no se calla solo: el EPR entre 1,6 y 1,3, y el N1 entre el
 *   103 y el 95 %, «with no change in thrust lever position» (p. 20).
 * - **Se calla al llevar esa palanca atrás**: «the fluctuations and bangs will
 *   continue until the flight crew retards the thrust lever to idle» (p. 20).
 * - **Y al volver a avanzarla, aguanta o no**: «SLOWLY re-advance» (p. 19), y si
 *   vuelve a estallar, «the engine may be left at idle, or left at some
 *   intermediate power, or shutdown» (p. 20).
 *
 * Aquí está la cuenta, sin three.js ni el resto del avión: lo que le queda de
 * empuje y de vueltas a ese motor en cada instante (`Petardeo`) y la palanca
 * que mueve la compañera (`PalancaDelAve`). Quien lo vuela es `fdm.ts`
 * (`ponerMotorTocado`), y quien dice cuándo, `practica.ts`.
 */

/** A los cuántos segundos del golpe llega el primer estallido. Sin fuente: lo que tarda en oírse que son dos cosas. */
export const PRIMER_ESTALLIDO = 0.8;

/**
 * **Cada cuánto estalla**, s: los dos que dura y otros dos de vuelta. La guía
 * dice «a couple of seconds» de uno al siguiente y «a few seconds» recuperado
 * (p. 20): cuatro entre los dos, que es lo menos que cabe en esas dos frases.
 */
export const ENTRE_ESTALLIDOS = 4;

/** Lo que dura uno hasta recuperarse, s: «for two seconds» (p. 20). */
export const DURA_UN_ESTALLIDO = 2;

/** Lo que tarda en caer el empuje, s: el EPR «can drop […] in 0.2 seconds» (p. 20). */
export const CAE_EN = 0.2;

/**
 * **El empuje que le queda en el estallido**, de 0 a 1: la mitad. Es lo que da
 * el ejemplo de la guía, el EPR de 1,6 a 1,3 (p. 20), contando el empuje por
 * lo que el EPR pasa de uno.
 */
export const EMPUJE_EN_EL_ESTALLIDO = (1.3 - 1) / (1.6 - 1);

/** Y las vueltas: «N1 may fluctuate between 103% and 95%» (p. 20). */
export const VUELTAS_EN_EL_ESTALLIDO = 95 / 103;

/** Lo que tarda el N1 en caer, s: los dos y los tres que suma el otro ejemplo de la p. 20. */
export const VUELTAS_CAEN_EN = 0.5;

/** Y lo que recupera entre uno y otro: «98% of the pre-surge power» (p. 20). */
export const ENTRE_UNO_Y_OTRO = 0.98;

/**
 * **Por encima de qué empuje estalla** con el ave recién entrada, de 0 a 1: en
 * cuanto da algo más que el ralentí, que es hasta donde la guía manda llevar la
 * palanca (p. 20).
 */
export const UMBRAL_RECIEN = 0.3;

/**
 * **Hasta dónde aguanta después, si se recupera**: las tres cuartas partes. Es
 * lo que su ensayo le pide conservar: no más de «a sustained 25-percent power
 * or thrust loss» (14 CFR 33.76 (c)(6)(i)).
 */
export const UMBRAL_RECUPERADO = 0.75;

/**
 * **Y dónde se deja**, de 0 a 1 del empuje de despegue: seis décimas, el
 * régimen al que su ensayo lo tiene seis minutos seguidos (33.76 (c)(7)(iv)).
 * Por debajo del umbral, que es lo que pide el manual del A320: «Reduce thrust
 * and operate below the stall threshold» (AAIB, *Bulletin* 11/2004, G-EUUI,
 * p. 4).
 */
export const REGIMEN_QUE_AGUANTA = 0.6;

/** Lo que tarda la palanca en ir al ralentí, s. Sin fuente: lo que tarda una mano sin prisa. */
export const PALANCA_ATRAS = 3;

/**
 * Lo que se espera al ralentí antes de volver a probar, s: lo que la guía da
 * para que los instrumentos vuelvan a su sitio, «after 10 seconds» (p. 20).
 */
export const SE_ESPERA = 10;

/** Y lo que tarda en ir del ralentí a donde se deja, s: «SLOWLY re-advance» (p. 19). */
export const PALANCA_ADELANTE = 10;

/**
 * Lo que un motor da de menos mientras estalla: de 0 a 1 del empuje y de las
 * vueltas que daría con esa palanca.
 */
export class Petardeo {
  /** Desde el último estallido, s; `null` si no ha habido ninguno. */
  private desde: number | null = null;
  /** Lo que falta para que pueda haber uno, s. */
  private falta = PRIMER_ESTALLIDO;
  /** Si ahora da más de lo que aguanta: entre estallidos se queda en el 98 %. */
  private pasado = false;
  /** Cuántos van. */
  estallidos = 0;

  /** Un paso: `da`, lo que da el motor, de 0 a 1; `umbral`, desde dónde estalla. */
  paso(dt: number, da: number, umbral: number): void {
    if (this.desde !== null) this.desde += dt;
    this.falta = Math.max(0, this.falta - dt);
    this.pasado = da > umbral;
    if (!this.pasado || this.falta > 0) return;
    this.desde = 0;
    this.falta = ENTRE_ESTALLIDOS;
    this.estallidos++;
  }

  /** Lo que le queda de empuje. */
  get empuje(): number {
    const t = this.desde;
    if (t === null) return 1;
    const E = EMPUJE_EN_EL_ESTALLIDO;
    if (t < CAE_EN) return 1 - (1 - E) * (t / CAE_EN);
    if (t < CAE_EN + 0.6) {
      // Tres vaivenes pequeños, «at 0.2-second intervals two or three times» (p. 20).
      return E + 0.05 * (0.5 - 0.5 * Math.cos((2 * Math.PI * (t - CAE_EN)) / 0.2));
    }
    return this.vuelve(E, CAE_EN + 0.6, t);
  }

  /** Lo que le queda de vueltas: lo que marca su aguja de N1. */
  get vueltas(): number {
    const t = this.desde;
    if (t === null) return 1;
    const V = VUELTAS_EN_EL_ESTALLIDO;
    if (t < VUELTAS_CAEN_EN) return 1 - (1 - V) * (t / VUELTAS_CAEN_EN);
    return this.vuelve(V, VUELTAS_CAEN_EN, t);
  }

  /** De vuelta: hasta el 98 % si sigue dando más de lo que aguanta, y hasta lo suyo si no. */
  private vuelve(abajo: number, desde: number, t: number): number {
    const arriba = this.pasado ? ENTRE_UNO_Y_OTRO : 1;
    const q = Math.max(0, Math.min(1, (t - desde) / (DURA_UN_ESTALLIDO - desde)));
    return abajo + (arriba - abajo) * q;
  }
}

/** Por dónde va la palanca de ese motor. */
export type PasoDeLaPalanca = "petardea" | "atras" | "quieto" | "adelante" | "aguanta" | "noAguanta" | "parado";

/**
 * **La palanca de ese motor**, que la mueve la compañera: atrás hasta el
 * ralentí, se espera, y adelante despacio. Si vuelve a estallar, atrás otra vez
 * y se para. Aquí solo se mueve; cuándo se empieza lo dice quien manda
 * (`empezar`), que primero es volar el avión.
 */
export class PalancaDelAve {
  private cual: PasoDeLaPalanca = "petardea";
  private hasta = 1;
  private segundos = 0;
  private callados = 0;

  constructor(
    /** Si este motor, al volver a avanzarla, aguanta. */
    readonly seRecupera: boolean,
  ) {}

  get paso(): PasoDeLaPalanca {
    return this.cual;
  }

  /** Hasta dónde la deja ir, de 0 a 1: el gas de ese motor no pasa de aquí. */
  get tope(): number {
    return this.hasta;
  }

  /** Por encima de qué empuje estalla ahora. Ver `UMBRAL_RECIEN`. */
  get umbral(): number {
    return this.seRecupera && this.cual !== "petardea" && this.cual !== "atras" ? UMBRAL_RECUPERADO : UMBRAL_RECIEN;
  }

  /** La compañera empieza a llevarla atrás. */
  empezar(): void {
    if (this.cual === "petardea") this.cual = "atras";
  }

  /**
   * Un paso. Devuelve el paso al que se acaba de llegar, o `null`:
   * `estallidos` es cuántos lleva ese motor.
   */
  avanzar(dt: number, estallidos: number): PasoDeLaPalanca | null {
    const antes = this.cual;
    this.segundos += dt;
    switch (this.cual) {
      case "petardea":
      case "parado":
        break;
      case "atras":
        this.hasta = Math.max(0, this.hasta - dt / PALANCA_ATRAS);
        if (this.hasta === 0) this.irA("quieto");
        break;
      case "quieto":
        this.callados = estallidos;
        if (this.segundos >= SE_ESPERA) this.irA("adelante");
        break;
      case "adelante":
        this.hasta = Math.min(REGIMEN_QUE_AGUANTA, this.hasta + (dt * REGIMEN_QUE_AGUANTA) / PALANCA_ADELANTE);
        if (estallidos > this.callados) this.irA("noAguanta");
        // Arriba del todo, y lo que tardaría en volver a estallar: aguanta.
        else if (this.segundos >= PALANCA_ADELANTE + ENTRE_ESTALLIDOS) this.irA("aguanta");
        break;
      case "aguanta":
        // Si más tarde estalla, también se para: al irse al aire, con más gas.
        if (estallidos > this.callados) this.irA("noAguanta");
        break;
      case "noAguanta":
        this.hasta = Math.max(0, this.hasta - dt / PALANCA_ATRAS);
        if (this.hasta === 0 && this.segundos >= PALANCA_ATRAS) this.irA("parado");
        break;
    }
    return this.cual === antes ? null : this.cual;
  }

  private irA(p: PasoDeLaPalanca): void {
    this.cual = p;
    this.segundos = 0;
  }
}
