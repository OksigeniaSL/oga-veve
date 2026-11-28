/**
 * **El niño que se pierde lejos o se mete mar adentro**, y cuándo se le dice.
 *
 * La guía de diseño por edades de la casa pide que cada lío en que se meta un
 * niño se arregle con un toque, y que el guía señale ese toque sin que nadie
 * lo pida. Éste es el lío de alejarse: volando a gusto, el campo se queda
 * atrás, el paisaje se acaba o debajo ya solo hay agua, y quien tiene cuatro
 * años no sabe volver. Lo decidió Enrique el 15-11-2026: «la flecha de casa
 * que ya late; un toque y el avión vira hacia el campo».
 *
 * Este módulo solo decide **cuándo** se ha perdido, cuándo deja de estarlo y
 * cuándo toca decirlo. No habla, no dibuja ni mueve el avión: el viraje lo da
 * el automático con su rumbo seleccionado (`HDG SEL`), que es lo que haría un
 * piloto de verdad en un avión que lo lleva —ver `volverAlCampo` en
 * `game.ts`—.
 *
 * ## Qué es perderse
 *
 * Tres cosas a la vez, y las tres hacen falta:
 *
 * - **Lejos de todo campo del vuelo**: a más de `LEJOS` del más cercano, o a
 *   más de `MAR_ADENTRO` si debajo hay mar. Sobre tierra hay pueblos, ríos y
 *   cerros que te devuelven; sobre el agua no hay nada que mirar ni donde
 *   posarse, y por eso allí se avisa antes. Son las de la avioneta: el avión
 *   de circuito más grande las lleva más lejos, ver abajo.
 * - **Alejándose de donde señala la aguja**: la flecha apunta hacia atrás,
 *   más de noventa grados a un lado. Con la aguja delante se vuelve, aunque
 *   se esté lejos; que es lo que hace quien cruza de una isla a otra.
 * - **Y sin ir hacia ningún otro campo.** Quien a medio camino se da la vuelta
 *   para volver al de salida no está perdido: está renunciando, y renunciar es
 *   ganar. La aguja todavía señala al destino, pero el morro apunta a un campo
 *   conocido.
 *
 * ## Cuándo deja de estarlo
 *
 * Al volver a tener la aguja delante —menos de cuarenta y cinco grados—, al
 * apuntar a un campo, al volver cerca de uno o al tocar tierra. Entre cuarenta
 * y cinco y noventa grados no cambia nada: así, virando, la flecha no se
 * enciende y se apaga a cada momento.
 *
 * ## Y cuándo se vuelve a decir: nunca por reloj
 *
 * Se dice al perderse, y no vuelve a decirse porque pase un rato. Vuelve
 * cuando **pasa algo**: que se haya vuelto de verdad hacia casa —más cerca de
 * los campos, por lo menos `VUELTA`, que lo más lejos a lo que llegó— y se
 * vuelva a perder; o que se haya vuelto hasta el campo, o se haya aterrizado.
 * Dar vueltas en círculo lejos de todo no acerca a nada, y así la instructora
 * no lo repite a cada vuelta.
 *
 * ## Y el circuito no es perderse (H111)
 *
 * Las distancias de aquí son las de la avioneta, cuyo circuito cabe entero en
 * `CERCA`. El de un reactor no cabe: un circuito se mide en tiempo, no en
 * metros, y el del JAZ 110 es más del doble de grande —ver
 * `escalaDelCircuitoDe`—. En La Palma su esquina de la base cae a seis
 * kilómetros del centro de la pista, sobre el mar, así que el banco oía «nos
 * alejamos mucho del campo» en la subida y al final del viento en cola de cada
 * vuelta, siete veces en un vuelo con tres idas al aire. Dar la vuelta al
 * campo, irse al aire y volver es justo lo que se enseña, no perderse.
 *
 * Así que **lo lejos se cuenta desde donde acaba el circuito de este avión**:
 * cerca es dentro de él y de su franja —`suCircuito`, ver
 * `alcanceDelCircuito`—, y lo que pasa de `CERCA` se suma también a
 * `MAR_ADENTRO` y a `LEJOS`. Con la avioneta casi no cambia nada; con el
 * reactor, perderse sigue siendo salirse de su circuito y alejarse de casa.
 */

/** A partir de cuánto se está lejos, sobre tierra, m: diez kilómetros. */
export const LEJOS = 10_000;

/**
 * Y sobre el mar, m: cinco kilómetros. Lo que se tarda en perder de vista la
 * costa volando bajo, y sin un sitio donde posarse en todo ese camino.
 */
export const MAR_ADENTRO = 5_000;

/**
 * **Cuánto hay que acercarse para que vuelva a contar**, m: tres kilómetros
 * más cerca que lo más lejos a lo que se llegó. Más que el ancho de un viraje
 * entero de una avioneta, para que dar vueltas en el sitio no lo rearme.
 */
export const VUELTA = 3_000;

/**
 * **Y cerca de un campo ya no hay nada perdido**, m: cuatro kilómetros, que es
 * donde está el circuito de la avioneta. Vale igual sobre tierra que sobre el
 * mar: si dependiera de lo que hay debajo, volar por la costa lo rearmaría a
 * cada entrante. El avión con un circuito más grande lo lleva más lejos: ver
 * `LoQueVeLaVuelta.suCircuito`.
 */
export const CERCA = 4_000;

/**
 * **Lo cerca de un campo para este avión**, m: `CERCA`, o hasta donde llega su
 * circuito si llega más lejos. Ver la cabecera.
 */
export function cercaDeUnCampo(suCircuito = 0): number {
  return Math.max(CERCA, suCircuito);
}

/** La aguja detrás: más de noventa grados a un lado, rad. */
export const DETRAS = Math.PI / 2;

/** Y otra vez delante: menos de cuarenta y cinco grados, rad. */
export const DELANTE = Math.PI / 4;

/**
 * Cuánto puede desviarse el morro de un campo para que cuente como ir hacia
 * él, rad: treinta grados.
 */
export const HACIA_UN_CAMPO = Math.PI / 6;

/** Lo que mira la regla en cada paso. */
export interface LoQueVeLaVuelta {
  /** En el aire. En tierra no hay nada que avisar, y se olvida lo dicho. */
  readonly enElAire: boolean;
  /**
   * Si este vuelo atiende el lío: no en una misión, un ejercicio, la escena de
   * pasaje ni el vuelo largo, que llevan su propio guion.
   */
  readonly atiende: boolean;
  /** A cuánto queda el campo del vuelo más cercano, m: el centro de su pista. */
  readonly alCampoMasCercano: number;
  /**
   * **Hasta dónde llega en ese campo el circuito de este avión**, m desde el
   * centro de su pista, con su franja: ver `alcanceDelCircuito` en
   * `world/circuito.ts`. Sin él, o en el que no vuela circuito, el de la
   * avioneta, que cabe en `CERCA`.
   */
  readonly suCircuito?: number;
  /** Hacia dónde señala la aguja respecto al morro, rad: 0 de frente. */
  readonly relativo: number;
  /** Si el morro apunta a algún campo del vuelo. Ver `apuntaAUnCampo`. */
  readonly haciaUnCampo: boolean;
  /** Si debajo hay mar. */
  readonly sobreElMar: boolean;
}

/** Lo que sale de cada paso. */
export interface EstadoDeLaVuelta {
  /** Si se ha perdido ahora: mientras dure, la flecha late. */
  readonly perdido: boolean;
  /** Si acaba de perderse y toca decirlo, en este paso y solo en éste. */
  readonly decirlo: boolean;
}

/**
 * **Si el morro apunta a alguno de esos campos**, con `HACIA_UN_CAMPO` de
 * margen.
 *
 * @param rumbo el del avión, rad, con el convenio de `rumboHacia`
 */
export function apuntaAUnCampo(
  avion: { readonly x: number; readonly z: number; readonly rumbo: number },
  campos: readonly { readonly x: number; readonly z: number }[],
): boolean {
  for (const c of campos) {
    const hacia = Math.atan2(c.x - avion.x, -(c.z - avion.z));
    let d = hacia - avion.rumbo;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) <= HACIA_UN_CAMPO) return true;
  }
  return false;
}

/**
 * **El rumbo que se pone en la ventanilla HDG para volver**, rad: el que
 * lleva del avión al sitio que señala la aguja, con el convenio de
 * `rumboHacia`. Se pone una vez, al tocar, como se gira la rueda del rumbo en
 * un panel de verdad; y el automático vira por el lado corto. Ver
 * `porElLadoCorto` en `piloto-automatico.ts`.
 */
export function rumboDeVuelta(
  avion: { readonly x: number; readonly z: number },
  aguja: { readonly x: number; readonly z: number },
): number {
  return Math.atan2(aguja.x - avion.x, -(aguja.z - avion.z));
}

export class Perdido {
  private perdidoAhora = false;
  /** Si al perderse toca decirlo. Se gasta al decirlo; ver la cabecera. */
  private armado = true;
  /** Lo más lejos de los campos a lo que se llegó desde que se dijo, m. */
  private masLejos = 0;

  /** Si se ha perdido ahora. */
  get perdido(): boolean {
    return this.perdidoAhora;
  }

  /** Un paso: si está perdido y si toca decirlo ahora. */
  paso(v: LoQueVeLaVuelta): EstadoDeLaVuelta {
    if (!v.enElAire) {
      // Aterrizar es empezar de nuevo: lo dicho se olvida.
      this.olvidar();
      return { perdido: false, decirlo: false };
    }
    if (!v.atiende) {
      this.perdidoAhora = false;
      return { perdido: false, decirlo: false };
    }
    const lejos = v.alCampoMasCercano;
    // Su circuito, entero: lo que pasa de `CERCA` empuja también lo de más allá.
    const cerca = cercaDeUnCampo(v.suCircuito);
    if (lejos < cerca) {
      this.olvidar();
      return { perdido: false, decirlo: false };
    }
    if (!this.armado) {
      this.masLejos = Math.max(this.masLejos, lejos);
      /*
       * **Se ha vuelto de verdad hacia casa**: más cerca de los campos que lo
       * más lejos a lo que llegó, por más de lo que acerca una vuelta en
       * círculo. Si se vuelve a perder, se vuelve a decir.
       */
      if (lejos < this.masLejos - VUELTA) this.armado = true;
    }
    const giro = Math.abs(v.relativo);
    if (this.perdidoAhora) {
      if (giro < DELANTE || v.haciaUnCampo) this.perdidoAhora = false;
      return { perdido: this.perdidoAhora, decirlo: false };
    }
    const umbral = (v.sobreElMar ? MAR_ADENTRO : LEJOS) + cerca - CERCA;
    if (lejos <= umbral || giro <= DETRAS || v.haciaUnCampo)
      return { perdido: false, decirlo: false };
    this.perdidoAhora = true;
    const decirlo = this.armado;
    if (decirlo) {
      this.armado = false;
      this.masLejos = lejos;
    }
    return { perdido: true, decirlo };
  }

  /** Al reiniciar el vuelo, o al volver cerca de un campo. */
  olvidar(): void {
    this.perdidoAhora = false;
    this.armado = true;
    this.masLejos = 0;
  }
}
