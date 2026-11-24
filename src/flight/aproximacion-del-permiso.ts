/**
 * **La aproximación del permiso**: para cuál se dio tu «autorizado para
 * aterrizar», y cuándo se dejó (H73).
 *
 * El permiso de aterrizar es de una aproximación: si se deja, no vale, y la
 * siguiente lleva el suyo. La torre te ve en final por dos caminos —la fase
 * «final» del plan y su propia final, ver `faseQueVeLaTorre`—, y el permiso
 * solo lo retiraba uno: salir de la final de la torre, y ni siquiera por
 * cualquier lado. Con eso quedaban vivos hasta la toma siguiente —y con la
 * radio callada, la verde fija—:
 *
 * - el que se daba con una «final» que solo era la del plan;
 * - el de quien se salía del cono y luego se daba la vuelta, que para la
 *   final de la torre era haberse salido «fuera»;
 * - el de quien pasaba la pista de largo sin subir, por lo mismo;
 * - y el que todavía estaba sonando al irse, que al acabar de sonar se daba
 *   por oído.
 *
 * Aquí no se mira **por dónde** te veía la torre, sino **lo que hace el
 * avión** desde que se dio. Se ha dejado esa aproximación si:
 *
 * - se va al aire de verdad (`seVaDeVerdad`, la misma regla de la final de la
 *   torre y de la fase), medido desde lo más bajo desde que se dio;
 * - se da la vuelta (`TORCIDO_PARA_SALIR`);
 * - se sale del cono por un lado, hacia fuera y de través
 *   (`TORCIDO_AL_ENTRAR`): quien coge la final pasándose del eje se sale
 *   también, pero volviendo;
 * - pasa la pista entera sin tocar;
 * - se aleja más allá de donde llega la final de la torre;
 * - toca el suelo, que es usarlo;
 * - o la pista ya es otra: otro campo, u otra cabecera en uso.
 *
 * Y **no se deja por un bache**, que es lo que el permiso tenía bien resuelto
 * y no se toca: subir unos metros corrigiendo la senda, salirse un momento
 * del cono al coger la final, o que la fase del plan parpadee, sigue siendo
 * la misma aproximación.
 *
 * Sin three.js ni DOM: el juego le da lo que ve y esto dice si se dejó.
 */

import {
  FINAL_DE_LA_TORRE,
  seVaDeVerdad,
  TORCIDO_AL_ENTRAR,
  TORCIDO_PARA_SALIR,
} from "./final-de-la-torre";
import { MILLA } from "./ruta";

/**
 * **Por qué se dejó**: yéndose al aire, dándose la vuelta, saliéndose de
 * través, pasando la pista de largo, alejándose, tocando, o porque la pista
 * ya es otra.
 */
export type PorQueSeDejo =
  | "seVa"
  | "vuelta"
  | "deTraves"
  | "pasada"
  | "lejos"
  | "tierra"
  | "otraPista";

/** Lo que se ve de tu avión en cada paso, en los ejes de la pista del permiso. */
export interface LoQueSeVeDelPermiso {
  readonly enElAire: boolean;
  /** La pista que la torre tiene en uso para ti: el campo y su cabecera. */
  readonly pista: string;
  /**
   * Metros por el eje hasta el umbral de aterrizar, **sin recortar**: negativo
   * pasado el umbral. Ver `ejesDeLaAproximacion` en `world/runway-guide.ts`.
   */
  readonly alUmbral: number;
  /** Metros a un lado del eje, positivo a la derecha de quien llega. */
  readonly deLado: number;
  /** Metros de pista que quedan por delante; negativo pasada la otra punta. */
  readonly pistaPorDelante: number;
  /** Si se está dentro del cono de la aproximación. */
  readonly enElCono: boolean;
  /** Si se está en el tramo final del plan de vuelo, del campo al que se va. */
  readonly enLaFinalDelPlan: boolean;
  /** Grados entre el rumbo del avión y el de la pista, de −180 a 180. */
  readonly torcido: number;
  /** Altura sobre la pista, m. */
  readonly sobreLaPista: number;
  /** Velocidad vertical, m/s, positiva subiendo. */
  readonly vertical: number;
  /** El gas, de cero a uno. Ver `seVaDeVerdad`. */
  readonly gas?: number;
  /** Si hay puesta una orden de irse al aire. Ver `seVaDeVerdad`. */
  readonly ordenDeIrse?: boolean;
  /**
   * **Sin motor**: no hay otra aproximación, se planea a la pista que se
   * tenga y se llega como se pueda. El permiso solo se gasta tocando, o con
   * otro campo. Ver `autorizarSinMotor` en `game.ts`.
   */
  readonly sinMotor?: boolean;
}

export class AproximacionDelPermiso {
  /** Si se está siguiendo una: desde que se da el permiso hasta que se deja. */
  private seguida = false;
  private pista = "";
  /** Lo más bajo desde que se dio, m sobre la pista. */
  private loMasBajo = Infinity;
  /** A cuánto estaba el umbral al darse, m. Ver `lejos`. */
  private deLejos = 0;

  /** Si hay una aproximación con permiso en marcha. */
  get enMarcha(): boolean {
    return this.seguida;
  }

  /** Se da el permiso: empieza la suya, con lo que se ve al darlo. */
  empieza(v: LoQueSeVeDelPermiso): void {
    this.seguida = true;
    this.pista = v.pista;
    this.loMasBajo = v.sobreLaPista;
    this.deLejos = Math.hypot(v.alUmbral, v.deLado);
  }

  /** Un paso: por qué se ha dejado, o `null` si se sigue en ella. Lo dice una vez. */
  paso(v: LoQueSeVeDelPermiso): PorQueSeDejo | null {
    if (!this.seguida) return null;
    this.loMasBajo = Math.min(this.loMasBajo, v.sobreLaPista);
    const porque = this.porQue(v);
    if (porque) this.olvidar();
    return porque;
  }

  /** Ya no hay permiso que seguir: otro vuelo, o se retiró por otro lado. */
  olvidar(): void {
    this.seguida = false;
    this.pista = "";
    this.loMasBajo = Infinity;
    this.deLejos = 0;
  }

  private porQue(v: LoQueSeVeDelPermiso): PorQueSeDejo | null {
    if (!v.enElAire) return "tierra";
    if (v.pista !== this.pista) return "otraPista";
    if (v.sinMotor) return null;
    if (seVaDeVerdad(v, v.sobreLaPista - this.loMasBajo)) return "seVa";
    if (Math.abs(v.torcido) > TORCIDO_PARA_SALIR) return "vuelta";
    /*
     * Pasada la punta de la pista, y no el umbral ni el centro: hasta ahí
     * todavía se puede tocar, y quien flota en la recogida de una pista larga
     * sigue con su permiso.
     */
    if (v.pistaPorDelante < 0) return "pasada";
    // Con una aproximación publicada se llega a la final de lado y de lejos.
    if (v.enLaFinalDelPlan) return null;
    const haciaFuera = v.deLado * v.torcido > 0;
    if (!v.enElCono && haciaFuera && Math.abs(v.torcido) > TORCIDO_AL_ENTRAR) return "deTraves";
    /*
     * Alejándose de donde se dio, y no solo estando lejos: con una
     * aproximación publicada el permiso se puede dar a más de cinco millas, y
     * ahí se está viniendo.
     */
    if (Math.hypot(v.alUmbral, v.deLado) > Math.max(FINAL_DE_LA_TORRE, this.deLejos) + MILLA)
      return "lejos";
    return null;
  }
}
