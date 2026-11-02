/**
 * **La noche en el mapa**: lo que se ve mientras Ara duerme en el segundo capítulo del
 * vuelo largo (ADR 0023). Con la pantalla tapada, el mapa del asiento corre de El Hierro
 * al desayuno, y en la zona de tormentas del ecuador suena el *ding*, se para, Ara se
 * despierta a medias y lo sigue. Aquí solo están las cuentas: qué hora enseña el mapa y
 * qué toca ahora. Quien lo dice es `MotorDelPasaje`, y quien lo pinta, `game.ts`.
 *
 * ## El salto sigue siendo uno
 *
 * Lo que corre aquí es **la hora que enseña el mapa**, no la del vuelo. El avión de verdad
 * sigue a su paso debajo de la tapa y salta de una vez al acabar la noche, a la entrada del
 * tercer capítulo. Partir el salto en dos habría sido poner dos veces un mundo y un avión
 * que nadie ve, para enseñar lo mismo.
 *
 * ## A qué ritmo
 *
 * Mil doscientas veces la hora de verdad, con el reloj de pared: siete horas de mapa en
 * veintidós segundos, unos treinta y cinco píxeles de avión por segundo en el lienzo. Se ve
 * avanzar sin prisa y, con lo que dura el medio despertar, la noche entera cabe en menos de
 * un minuto. Con el de pared y no con el del juego, que es el que acelera el banco: la noche
 * tiene que durar lo mismo la juegue quien la juegue.
 *
 * ## Dónde se despierta
 *
 * En la zona de convergencia intertropical, que según la estación va del ecuador a los diez
 * grados norte en esta longitud, y **antes de cruzar el ecuador**: la tripulante dirá en el
 * capítulo 3 «mientras dormías cruzamos el ecuador», y tiene que ser verdad. Por lo recorrido
 * y no por la hora, como lo demás de este vuelo: la hora de pasar por un sitio cambia con el
 * horario del día, y el sitio no se mueve.
 *
 * ## Que nadie se quede dentro
 *
 * Nada de aquí espera a algo de fuera sin tope. Lo que corre es una cuenta; y lo que se dice
 * al despertar, si no acaba —una voz que no contesta—, se suelta a los `TOPE_DEL_DESPERTAR`.
 *
 * ## Y la pausa no cuenta
 *
 * El reloj de pared sigue con el juego en pausa, y la escena no da pasos mientras tanto. Un
 * paso que ve pasar más de `UN_PASO_MIDE_COMO_MUCHO` es una pausa o la pestaña en segundo
 * plano, y no un rato de noche: sin esto, al volver de una pausa el mapa daría un salto y lo
 * que se estuviera diciendo se cortaría por el tope.
 */

import { cruceDelEcuador, cuandoPasa, type PerfilDelVuelo } from "./ruta-larga";

/** **Lo que corre el mapa**, s de vuelo por segundo de pared. Ver la cabecera. */
export const EL_MAPA_CORRE = 1200;

/**
 * **Lo que se deja antes del ecuador para despertarse**, m por la ruta: unos 4,5° de latitud
 * por encima, que caen dentro de la zona de tormentas en cualquier estación. A la velocidad de
 * crucero son unos treinta y cinco minutos, y el mapa queda parado con el ecuador aún delante.
 */
export const SE_DESPIERTA_ANTES_DEL_ECUADOR = 500_000;

/**
 * **Lo que tarda en irse la lámina de delante**, s de pared: lo que la siesta tarda en tapar
 * por debajo, con un pelo de margen. Si se fundieran a la vez, el mundo asomaría en medio.
 */
export const SE_TAPA_POR_DEBAJO = 1;

/** **Lo que tarda en irse el mapa al acabar**, s de pared: el corte al capítulo que sigue cae ya a oscuras. */
export const SE_VA_EL_MAPA = 1.2;

/**
 * **Lo más que dura el medio despertar**, s de pared. Las cuatro frases son unos veinte; con
 * las voces que no contestan, se suelta aquí, y con esto la noche no pasa de un minuto.
 */
export const TOPE_DEL_DESPERTAR = 28;

/** **Lo más que puede valer un paso**, s de pared: el mismo tope de un fotograma en el juego. Ver la cabecera. */
const UN_PASO_MIDE_COMO_MUCHO = 1;

/** **Las tres horas de la noche**, s desde el despegue. */
export interface PlanDeLaNoche {
  /** Desde dónde corre el mapa: donde va el avión al dormirse. */
  readonly desde: number;
  /** Dónde se para para el medio despertar. Si ya se ha pasado, no hay. */
  readonly seDespiertaEn: number;
  /** Dónde acaba: la hora que enseña el mapa del capítulo siguiente al abrirse. */
  readonly hasta: number;
}

/** **Las horas de esta noche**, con el horario del día. `hasta` lo dice el guion que sigue. */
export function planDeLaNoche(p: PerfilDelVuelo, ahora: number, hasta: number): PlanDeLaNoche {
  const ecuador = cruceDelEcuador(p.ruta);
  // Sin ecuador por en medio no hay zona de tormentas que contar: el mapa corre de una vez.
  const seDespiertaEn = ecuador ? cuandoPasa(p, ecuador.recorrido - SE_DESPIERTA_ANTES_DEL_ECUADOR) : Infinity;
  return { desde: ahora, seDespiertaEn, hasta };
}

/** En qué va la noche. */
export type FaseDeLaNoche = "tapando" | "corre" | "despierta" | "acaba" | "acabada";

/** Lo que acaba de pasar y alguien tiene que atender: una vez cada cosa. */
export type SucesoDeLaNoche = "se-destapa" | "ding" | "se-vuelve-a-dormir";

export class NocheEnElMapa {
  private fase_: FaseDeLaNoche = "tapando";
  private hora_: number;
  /** Lo que lleva en esta fase, s de pared. */
  private lleva = 0;
  private antes: number;
  /** Si ya hubo medio despertar, o no toca: es una vez por noche, y no lo rearma ningún reloj. */
  private yaSeDesperto: boolean;
  private porElTope = false;

  constructor(
    readonly plan: PlanDeLaNoche,
    pared: number,
  ) {
    this.hora_ = plan.desde;
    this.antes = pared;
    this.yaSeDesperto = plan.seDespiertaEn <= plan.desde || plan.seDespiertaEn >= plan.hasta;
  }

  get fase(): FaseDeLaNoche {
    return this.fase_;
  }

  /** **La hora que enseña el mapa**, s desde el despegue. */
  get hora(): number {
    return this.hora_;
  }

  /** **Si el salto tiene que esperar**: hasta que el mapa se haya ido, y ni un fotograma antes. */
  get retieneElSalto(): boolean {
    return this.fase_ !== "acabada";
  }

  /** **Si el mapa se está yendo**, para fundirlo a la noche antes del corte. */
  get seVaElMapa(): boolean {
    return this.fase_ === "acaba" || this.fase_ === "acabada";
  }

  /** Si el medio despertar se soltó por su tope. */
  get soltadoPorElTope(): boolean {
    return this.porElTope;
  }

  /**
   * **Un paso**, con el reloj de pared y si la escena está callada. Devuelve lo que acaba de
   * pasar, si pasó algo: es quien llama quien dice lo que se dice y pone lo que se ve.
   */
  paso(pared: number, callados: boolean): SucesoDeLaNoche | null {
    const real = Math.min(UN_PASO_MIDE_COMO_MUCHO, Math.max(0, pared - this.antes));
    this.antes = pared;
    this.lleva += real;
    switch (this.fase_) {
      case "tapando":
        if (this.lleva < SE_TAPA_POR_DEBAJO) return null;
        this.a("corre");
        return "se-destapa";
      case "corre": {
        const { seDespiertaEn, hasta } = this.plan;
        const meta = this.yaSeDesperto ? hasta : seDespiertaEn;
        this.hora_ = Math.min(meta, this.hora_ + real * EL_MAPA_CORRE);
        if (this.hora_ < meta) return null;
        if (this.yaSeDesperto) {
          this.a("acaba");
          return null;
        }
        this.yaSeDesperto = true;
        this.a("despierta");
        return "ding";
      }
      case "despierta":
        if (this.lleva >= TOPE_DEL_DESPERTAR) this.porElTope = true;
        else if (!callados) return null;
        this.a("corre");
        return "se-vuelve-a-dormir";
      case "acaba":
        if (this.lleva >= SE_VA_EL_MAPA) this.a("acabada");
        return null;
      case "acabada":
        return null;
    }
  }

  private a(fase: FaseDeLaNoche): void {
    this.fase_ = fase;
    this.lleva = 0;
  }
}
