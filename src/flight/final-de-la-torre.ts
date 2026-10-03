/**
 * **La final de la torre**: desde dónde te ve la torre en final, y por tanto
 * desde dónde te da la pista.
 *
 * ## Por qué no es la fase «final» del plan
 *
 * La fase «final» del plan de vuelo empieza a trescientos metros **sobre el
 * suelo de debajo**, alineado a menos de treinta grados y a menos de
 * cuatrocientos metros del eje —ver `deducir` en `flight/vuelo.ts`—. Es la
 * que pinta los aros y cuenta «estás en final», y para eso está bien. Para la
 * torre no: tu «cleared to land» se pedía al entrar en ella, o sea a unos mil
 * pies como muy pronto, y más tarde todavía en cuanto la final no era de
 * manual:
 *
 * - quien se alinea tarde —una aproximación a la vista que entra en el eje a
 *   dos millas y media, como la de la 19 de La Palma, o alguien de seis años
 *   que corrige la final hasta el último momento— entraba en «final» a
 *   cuarenta metros, y la torre le autorizaba **ahí**: Enrique lo oyó en La
 *   Palma con el avión en la cabecera y la máquina contando «one hundred»;
 * - y cada vez que la fase se salía un instante —un bache, la última
 *   corrección— y volvía, se pedía otro permiso, con su lámpara y su voz, a
 *   la altura que fuera.
 *
 * Lo de verdad (OACI, Doc 4444, capítulo 7, el control de aeródromo) es que
 * la torre te autoriza a aterrizar **en final, a varias millas**, en cuanto
 * sabe que la pista va a estar libre cuando llegues; y si no lo sabe,
 * «continúe la aproximación» y la autorización llega después. Como tarde, a
 * los quinientos pies o a los mínimos: en un aeródromo controlado no se
 * aterriza sin ella, así que quien llega a los mínimos sin permiso se va al
 * aire. Ver `paso` en `flight/turno-de-pista.ts`.
 *
 * ## Qué es estar en ella
 *
 * Venir hacia la pista por su lado de aproximación —dentro del cono de treinta
 * grados a cada lado del eje prolongado, el mismo de la cuenta del
 * radioaltímetro—, a menos de `FINAL_DE_LA_TORRE` del umbral, sin subir, por
 * debajo de `TECHO_DE_LA_FINAL` y con el morro a menos de `TORCIDO_AL_ENTRAR`
 * de la pista: una final que se está cogiendo, no una base de través. O el
 * tramo final del plan de vuelo, que con una aproximación publicada empieza en
 * su punto de final aunque llegue de lado. Y, por supuesto, la fase «final»
 * del plan, que es lo mismo visto más de cerca.
 *
 * Y **no se sale por un instante**: se sale yéndose al aire de verdad —ver
 * `seVaDeVerdad`—, dándose la vuelta, alejándose o pasando de largo la pista.
 * Es lo que hace que una final sea una y su permiso uno.
 *
 * Sin three.js ni DOM: el juego le da lo que ve y esto dice si se está.
 */

import { MILLA, PIE } from "./ruta";

/**
 * Hasta dónde llega la final de la torre, m del umbral: **cinco millas**.
 *
 * Es donde una llegada de verdad está ya establecida y en la frecuencia de la
 * torre —el punto de final de una aproximación publicada cae entre cuatro y
 * siete millas— y deja a la autorización, que con su fraseología y el viento
 * son quince segundos de voz, tiempo de sobra para oírse antes de los
 * quinientos pies aunque la boca esté ocupada. Más lejos no se autoriza: la
 * pista tiene que estar libre **cuando llegues**, y a diez millas nadie lo
 * sabe. Dentro de la zona de la torre, que acaba en diez: ver
 * `ZONA_DE_LA_TORRE` en `flight/dependencia.ts`.
 */
export const FINAL_DE_LA_TORRE = 5 * MILLA;

/**
 * Por encima de esto, sobre la pista, todavía no se está en final, m:
 * **tres mil pies**. A cinco millas la senda de tres grados va a mil
 * seiscientos; el doble de margen deja entrar a quien viene alto, que es lo
 * que más se ve, y deja fuera a quien pasa por encima del campo sin bajar.
 */
export const TECHO_DE_LA_FINAL = 3000 * PIE;

/**
 * Lo más torcido respecto a la pista con lo que se entra, grados. Sesenta: se
 * entra **cogiendo** la final —el viraje de base a final ya a medias—, no
 * volando la base de través, que va a noventa.
 */
export const TORCIDO_AL_ENTRAR = 60;

/**
 * Y lo torcido que hay que ir para salirse, grados: ciento veinte, darse la
 * vuelta. El mismo número que `DE_VUELTA` en `world/runway-guide.ts`, que
 * separa una aproximación de un viento en cola.
 */
export const TORCIDO_PARA_SALIR = 120;

/**
 * **Cuánto hay que subir desde lo más bajo de esta final para haberse ido al
 * aire sin más señal que la subida**, m: cien, unos trescientos pies.
 *
 * Eran veinte, los mismos que sacan de la fase «final» del plan —ver
 * `SUBIDA_QUE_SACA_DE_FINAL` en `flight/vuelo.ts`—, y veinte metros no es
 * irse: es corregir. El JAZ 120 con flaps sube y baja solo unos cinco metros
 * por segundo con un periodo de veinte a cincuenta —lo midió la tanda que
 * arregló el alabeo—, y quien vuela la final con el teclado va «o bajo o
 * subo»: un punto de la senda a dos millas son veinte metros. Con eso se
 * salía de la final, el permiso se caía, se pedía otro al volver a bajar —«la
 * torre me da permiso para aterrizar dos veces; eso no lo veo normal»— y si
 * el segundo no llegaba a oírse antes de los mínimos, la torre te mandaba al
 * aire por su propio retraso. Enrique, con el JAZ 120 en Tenerife Sur: «tener
 * que hacer frustradas todos los vuelos es una basura».
 *
 * Cien metros no los hace ningún bamboleo: el de ese avión, nivelado
 * esperando la senda, es de ochenta de cresta a valle en el peor caso —cinco
 * metros por segundo con cincuenta de periodo—, y bajando por la senda, de
 * diez. Y la frustrada de verdad no espera a esto: lleva el gas de despegue o
 * la orden de irse, que sacan antes. Ver `seVaDeVerdad`.
 */
export const SUBIDA_QUE_SACA = 100;

/**
 * **Y con el gas de despegue, bastante menos**, m: quince. El gas a fondo y
 * el avión subiendo es la frustrada de manual —«TOGA», potencia de despegue,
 * y el morro arriba—, y ahí no hace falta esperar a los cien metros para
 * saber que uno se va.
 */
export const SUBIDA_CON_GAS = 15;

/** El gas de despegue, de cero a uno. Ver `SUBIDA_CON_GAS`. */
export const GAS_DE_DESPEGUE = 0.95;

/** Lo que se sube sin estar subiendo, m/s: un bache, no una subida. */
const SIN_SUBIR = 1;

/** Lo que ve la torre de tu avión en este momento. */
export interface LoQueVeLaTorre {
  /** En el aire: en tierra no hay final que valga. */
  readonly enElAire: boolean;
  /** La fase del plan de vuelo. «final» cuenta siempre. */
  readonly faseDelPlan: string;
  /**
   * Si se está en el tramo final del plan, **del campo al que se va**: desde
   * su punto de final. Ver `enLaFinal` en `flight/ruta.ts`.
   */
  readonly enLaFinalDelPlan: boolean;
  /**
   * Metros por el eje hasta el umbral de aterrizar, si se está dentro del cono
   * de la aproximación de esa pista; `null` fuera de él, o pasado el umbral.
   * Ver `alUmbralEnLaAproximacion` en `world/runway-guide.ts`.
   */
  readonly alUmbral: number | null;
  /** Grados entre el rumbo del avión y el de la pista, de −180 a 180. */
  readonly torcido: number;
  /** Altura sobre la pista, m. */
  readonly sobreLaPista: number;
  /** Velocidad vertical, m/s, positiva subiendo. */
  readonly vertical: number;
  /**
   * El gas, de cero a uno. A fondo y subiendo es irse al aire: ver
   * `SUBIDA_CON_GAS`. Sin esto, solo cuenta la subida.
   */
  readonly gas?: number;
  /**
   * **Si hay puesta una orden de irse al aire**, sea de quien sea: quien la
   * obedece y sube, se va. Ver `seVaDeVerdad`.
   */
  readonly ordenDeIrse?: boolean;
}

/**
 * **Si con esto uno se está yendo al aire de verdad**, y no corrigiendo la
 * senda: subir cien metros sobre lo más bajo de la final, subir con el gas de
 * despegue, o subir con una orden de irse al aire puesta. Ver
 * `SUBIDA_QUE_SACA`.
 *
 * @param subido lo que se ha subido sobre lo más bajo de esta final, m
 */
export function seVaDeVerdad(v: LoQueVeLaTorre, subido: number): boolean {
  if (subido > SUBIDA_QUE_SACA) return true;
  if (v.vertical <= SIN_SUBIR) return false;
  if ((v.gas ?? 0) >= GAS_DE_DESPEGUE && subido > SUBIDA_CON_GAS) return true;
  return !!v.ordenDeIrse && subido > SUBIDA_CON_GAS;
}

/**
 * **Por qué se salió de la final de la torre**, la última vez:
 *
 * - `seVa`: yéndose al aire de verdad. Ver `seVaDeVerdad`.
 * - `vuelta`: dándose la vuelta.
 * - `fuera`: fuera del cono, pasada la pista o lejos.
 * - `tierra`: tocando tierra.
 *
 * Lo mira quien da el permiso: saliéndose del cono al coger la final y
 * volviendo a entrar no se empieza otra aproximación, y el permiso que se oyó
 * sigue valiendo. Ver `pedirAterrizaje` en `game.ts`.
 */
export type SalidaDeLaFinal = "seVa" | "vuelta" | "fuera" | "tierra";

export class FinalDeLaTorre {
  private dentro = false;
  /** Lo más bajo de esta final, m sobre la pista. Ver `SUBIDA_QUE_SACA`. */
  private loMasBajo = Infinity;
  /** Por qué se salió la última vez. Ver `SalidaDeLaFinal`. */
  private salida: SalidaDeLaFinal | null = null;

  /** Si ahora se está en la final de la torre. */
  get enFinal(): boolean {
    return this.dentro;
  }

  /** Por qué se salió de ella la última vez, o `null` si no se ha salido. */
  get ultimaSalida(): SalidaDeLaFinal | null {
    return this.salida;
  }

  /** Un paso: dice si se está en la final de la torre. */
  paso(v: LoQueVeLaTorre): boolean {
    if (!v.enElAire) return this.salir(this.dentro ? "tierra" : this.salida);
    if (!this.dentro) {
      if (v.faseDelPlan === "final" || entra(v)) {
        this.dentro = true;
        this.loMasBajo = v.sobreLaPista;
      }
      return this.dentro;
    }
    this.loMasBajo = Math.min(this.loMasBajo, v.sobreLaPista);
    /*
     * **Irse al aire saca, aunque el plan siga en «final» un momento.** Se
     * sube de verdad desde lo más bajo de esta final, y lo que venga después
     * es otra final con su permiso. Subir y bajar unos metros corrigiendo no
     * es irse: ver `seVaDeVerdad`.
     */
    if (seVaDeVerdad(v, v.sobreLaPista - this.loMasBajo)) return this.salir("seVa");
    // La fase del plan es esta misma final vista más de cerca.
    if (v.faseDelPlan === "final") return true;
    if (Math.abs(v.torcido) > TORCIDO_PARA_SALIR) return this.salir("vuelta");
    // Fuera del cono, pasada la pista o lejos: ya no se viene a ella.
    if (!v.enLaFinalDelPlan && (v.alUmbral === null || v.alUmbral > FINAL_DE_LA_TORRE + MILLA))
      return this.salir("fuera");
    return true;
  }

  /** Otro vuelo, o se puso el avión en otro sitio: ninguna final. */
  reiniciar(): void {
    this.salir(null);
  }

  private salir(porque: SalidaDeLaFinal | null): false {
    this.dentro = false;
    this.loMasBajo = Infinity;
    this.salida = porque;
    return false;
  }
}

/** Si con esto se entra en la final de la torre. Ver la cabecera. */
function entra(v: LoQueVeLaTorre): boolean {
  if (v.vertical > SIN_SUBIR) return false;
  if (v.sobreLaPista > TECHO_DE_LA_FINAL) return false;
  if (Math.abs(v.torcido) > TORCIDO_AL_ENTRAR) return false;
  return (
    v.enLaFinalDelPlan || (v.alUmbral !== null && v.alUmbral <= FINAL_DE_LA_TORRE)
  );
}
