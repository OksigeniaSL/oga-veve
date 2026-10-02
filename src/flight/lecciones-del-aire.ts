/**
 * **Lo que el aire enseña por el camino**: el frío, el aire fino del crucero
 * y la cabina que sube y baja.
 *
 * El modelo ya lo sabía todo —la temperatura baja con la altura, la indicada
 * no es la verdadera, arriba se gasta menos, la cabina de un presurizado sube
 * despacio— y nadie lo contaba. Es el #89, y su trato es el del proyecto
 * entero: si alguien sube y ve bajar el termómetro, **eso no es un texto, es
 * el simulador diciendo la verdad**. Lo que falta es que alguien lo diga en
 * el momento en que se ve, corto y una vez.
 *
 * Cuatro momentos, y cada uno es el de verdad:
 *
 * - **`frio`**: subiendo, al pasar por cero grados fuera. Seis grados y medio
 *   menos cada mil metros, dos cada mil pies, y cincuenta bajo cero a la
 *   altura de los reactores.
 * - **`crucero`**: al llegar arriba y quedarse. El aire es fino: la aguja
 *   marca menos de lo que se va, se frena menos y se gasta menos. Por eso se
 *   vuela alto. Solo si el crucero está a tres mil metros o más, que es donde
 *   la verdadera ya le saca a la indicada un sexto largo.
 * - **`bolsa`**: en un presurizado, cuando la cabina pasa de mil quinientos
 *   metros subiendo. La cabina también sube, y por eso se hincha una bolsa de
 *   papitas cerrada abajo.
 * - **`oidos`**: en un presurizado, cuando la cabina lleva un rato bajando. Los
 *   oídos, la saliva y la botella aplastada.
 *
 * Cada lección, **una vez por sesión**: la segunda vez que se sube ya se sabe,
 * y repetirla en cada vuelo es un sermón. Quién la dice y en qué peldaño lo
 * decide el juego: la instructora, en los tres de abajo —ver
 * `laInstructoraLoExplica` en `escalera.ts`—.
 */

/** Las cuatro lecciones. */
export type LeccionDelAire = "frio" | "crucero" | "bolsa" | "oidos";

/** Lo que hace falta saber del vuelo en cada paso. */
export interface LecturaDelAire {
  readonly dt: number;
  readonly enTierra: boolean;
  /** La altura del avión, m. */
  readonly altura: number;
  /** Su velocidad vertical, m/s. */
  readonly vertical: number;
  /** La temperatura de fuera, °C. */
  readonly oat: number;
  /** La altitud de cabina, m. Ver `cabina-presurizada.ts`. */
  readonly cabina: number;
  /** Lo deprisa que se mueve la cabina, m/s. */
  readonly ritmoDeCabina: number;
  /** Si el avión va presurizado y con su aire. */
  readonly presurizada: boolean;
  /** A qué altura cruza el plan, m, o `null` si no hay plan. */
  readonly crucero: number | null;
  /** Si el plan ya va bajando. */
  readonly bajando: boolean;
}

/** Desde qué altura de crucero se cuenta lo del aire fino, m. */
export const CRUCERO_QUE_SE_CUENTA = 3000;
/** Cuánto por debajo del crucero ya se está en él, m. */
const CERCA_DEL_CRUCERO = 150;
/** Nivelado es subir o bajar menos que esto, m/s. */
const NIVELADO = 1.5;
/** Y tanto rato así, s: llegar arriba no es pasar por arriba. */
const RATO_NIVELADO = 20;
/** La cabina a la que se cuenta lo de la bolsa, m. */
export const CABINA_DE_LA_BOLSA = 1500;
/** Lo alto que tiene que haber estado la cabina para contar lo de bajar, m. */
const CABINA_QUE_BAJA = 1200;
/** Bajando es a más de esto, m/s: unos ciento sesenta pies por minuto. */
const BAJA = 0.8;
/** Y tanto rato, s: un bache no es empezar a bajar. */
const RATO_BAJANDO = 15;

/**
 * **Si una lección que ya tocaba sigue siendo verdad**, para contarla un rato
 * después.
 *
 * Las lecciones esperan su hueco —ver `Huecos` en `audio/turnos.ts`—: se
 * contaban en el instante en que tocaban, y ese instante era a menudo el de
 * otra voz. La del frío caía encima de Jazlyn contando el Teide; la de los
 * oídos, encima del azafato anunciando la bajada. Esperando, hay que saber si
 * lo que dicen sigue siendo verdad cuando por fin hay sitio: «afuera ya hace
 * cero grados» con el avión bajando ya no lo es.
 */
export function sigueValiendo(l: LeccionDelAire, x: LecturaDelAire): boolean {
  if (x.enTierra) return false;
  switch (l) {
    case "frio":
      // «Cada mil metros que subimos»: bajo cero, y sin bajar.
      return x.oat <= 0 && x.vertical > -NIVELADO;
    case "crucero":
      return (
        x.crucero !== null && !x.bajando && x.altura >= x.crucero - CERCA_DEL_CRUCERO
      );
    case "bolsa":
      return x.presurizada && x.cabina >= CABINA_DE_LA_BOLSA - 100;
    case "oidos":
      // «Empezamos a bajar, y la cabina también baja».
      return x.presurizada && x.ritmoDeCabina < 0;
  }
}

/**
 * Y cuánto se espera como mucho a que haya hueco para una, s: tres minutos.
 * Más que eso ya no es contarlo cuando se ve.
 */
export const ESPERA_SU_HUECO = 180;

/**
 * **Cuándo toca cada lección.** Pura: se le da el vuelo en cada paso y dice
 * qué lección toca ahora, si toca alguna. Una por paso.
 */
export class LeccionesDelAire {
  private readonly dichas = new Set<LeccionDelAire>();
  private oatAntes: number | null = null;
  private cabinaAntes: number | null = null;
  private nivelado = 0;
  private bajando = 0;
  private cabinaMasAlta = 0;

  /** Si esta lección ya se contó en esta sesión. */
  yaDicha(l: LeccionDelAire): boolean {
    return this.dichas.has(l);
  }

  /**
   * **Una lección que tocaba y no llegó a contarse**: se le pasó el momento
   * esperando su hueco. Vuelve a poder tocar, la próxima vez que pase.
   */
  noSeConto(l: LeccionDelAire): void {
    this.dichas.delete(l);
  }

  /**
   * Vuelo nuevo: se olvida lo que se estaba mirando, no lo que ya se contó.
   */
  olvidarElVuelo(): void {
    this.oatAntes = null;
    this.cabinaAntes = null;
    this.nivelado = 0;
    this.bajando = 0;
    this.cabinaMasAlta = 0;
  }

  paso(l: LecturaDelAire): LeccionDelAire | null {
    const oatAntes = this.oatAntes;
    const cabinaAntes = this.cabinaAntes;
    this.oatAntes = l.oat;
    this.cabinaAntes = l.cabina;
    this.cabinaMasAlta = Math.max(this.cabinaMasAlta, l.cabina);
    const nivelado = Math.abs(l.vertical) < NIVELADO;
    this.nivelado = nivelado && !l.enTierra ? this.nivelado + l.dt : 0;
    this.bajando =
      l.presurizada && !l.enTierra && l.ritmoDeCabina < -BAJA ? this.bajando + l.dt : 0;
    if (l.enTierra) return null;

    if (
      oatAntes !== null &&
      oatAntes > 0 &&
      l.oat <= 0 &&
      l.vertical > NIVELADO
    )
      return this.decir("frio");

    if (
      l.crucero !== null &&
      !l.bajando &&
      l.crucero >= CRUCERO_QUE_SE_CUENTA &&
      l.altura >= l.crucero - CERCA_DEL_CRUCERO &&
      this.nivelado >= RATO_NIVELADO
    )
      return this.decir("crucero");

    if (
      l.presurizada &&
      cabinaAntes !== null &&
      cabinaAntes < CABINA_DE_LA_BOLSA &&
      l.cabina >= CABINA_DE_LA_BOLSA
    )
      return this.decir("bolsa");

    if (l.presurizada && this.cabinaMasAlta >= CABINA_QUE_BAJA && this.bajando >= RATO_BAJANDO)
      return this.decir("oidos");

    return null;
  }

  private decir(l: LeccionDelAire): LeccionDelAire | null {
    if (this.dichas.has(l)) return null;
    this.dichas.add(l);
    return l;
  }
}
