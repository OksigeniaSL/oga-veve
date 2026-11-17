/**
 * **«Aterrizar con las agujas»**: el quinto ejercicio de la radio de
 * navegación, el del ILS (#51, peldaño 6; ADR 0030, enmienda H26i).
 *
 * Los cuatro de antes enseñan a saber dónde se está. Éste enseña lo que se
 * hace con eso al final de un vuelo por instrumentos: **bajar hasta una pista
 * que no se ve**, con dos agujas. La del localizador dice a qué lado queda el
 * eje de la pista; la de la senda, si se va por encima o por debajo de la
 * rampa que baja hasta ella. Con las dos en el centro, en cruz, el avión va
 * por la línea que acaba en la zona de toma.
 *
 * Los pasos, como en una escuela de vuelo:
 *
 * 1. **El localizador, cortándolo a treinta grados**, que es el ángulo de
 *    interceptación de los procedimientos (PANS-OPS, Doc 8168, vol. I: no más
 *    de treinta para el localizador). La aguja sale a tope; cuando se
 *    despega, hay que virar ya: **el localizador es cuatro veces más fino que
 *    un VOR** —a tope a dos grados y medio y no a diez— y se cruza enseguida.
 * 2. **Establecido en el localizador**, la aguja a menos de medio punto un
 *    rato. La senda todavía está arriba: **se captura desde abajo**, nivelado,
 *    esperando a que su aguja baje al centro. Es como se hace en todo ILS de
 *    verdad: entrar por encima de la senda y perseguirla hacia abajo es como
 *    se acaba en la falsa, a tres veces el ángulo.
 * 3. **La senda capturada**: se baja con las dos agujas en el centro.
 * 4. **Los mínimos**, a doscientos pies sobre el umbral (`ALTURA_DE_DECISION`):
 *    con las dos agujas a menos de un punto se mira afuera, se ve la pista y
 *    se aterriza; si una se ha ido, **frustrada, y se felicita igual**
 *    («Renunciar es ganar»). La frustrada la celebra el juego como cualquier
 *    otra (`flight/frustrada.ts`): este ejercicio no pone una segunda voz.
 *
 * ## Lo que es de verdad, y de dónde sale
 *
 * - **Las dos agujas** son las de `radio-de-navegacion.ts` (`leerNav` y su
 *   `senda`): el localizador y la senda de cada pista, con la posición de sus
 *   antenas, su frecuencia emparejada y el ángulo que publica su AIP. Este
 *   fichero no calcula ninguna: mira lo que marca el instrumento.
 * - **La escala**: dos puntos a cada lado; el localizador a tope a 2,5° y la
 *   senda a 0,24 veces su ángulo (0,72° con tres grados). Un punto es venir
 *   «un poco» fuera; dos, venir mal.
 * - **La regla de los mínimos** es la de una aproximación de precisión de
 *   categoría I: doscientos pies, y lo que se mira ahí. Lo de antes —la puerta
 *   de los quinientos pies, la velocidad y el ritmo— ya lo mira el juego en
 *   cualquier final (`flight/minimos.ts`), y aquí no se repite.
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de prueba con la
 * radio de verdad (`ils-con-agujas.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import { ALTURA_DE_DECISION } from "./minimos";
import {
  anguloDeLaSenda,
  EMISORAS,
  emisorasEn,
  ESCALA_LOC,
  MILLA,
  puntosDelLocalizador,
  type Emisora,
  type LecturaSenda,
} from "./radio-de-navegacion";
import type { PuntoDelMundo } from "./seguir-la-aguja";

const GRADO = Math.PI / 180;
const PIE = 0.3048;

// ── Qué ILS, y dónde ─────────────────────────────────────────────────────

/**
 * **El ILS de una cabecera** con el que se puede hacer el ejercicio: un
 * localizador con su senda, la frecuencia de la senda emparejada y el ángulo
 * de la senda en la tabla de su AIP. Sin ángulo no hay senda que marcar, y
 * el ejercicio no se ofrece ahí.
 */
export function ilsDeLaCabecera(
  oaci: string | null | undefined,
  cabecera: string | null | undefined,
  todas: readonly Emisora[] = EMISORAS,
): Emisora | null {
  if (!oaci || !cabecera) return null;
  return todas.find((e) => e.estacion.oaci === oaci && e.estacion.pista === cabecera && conSenda(e)) ?? null;
}

/** Los ILS del campo con los que se puede hacer el ejercicio. */
export function ilsDelCampo(oaci: string | null | undefined, todas: readonly Emisora[] = EMISORAS): Emisora[] {
  if (!oaci) return [];
  return todas.filter((e) => e.estacion.oaci === oaci && conSenda(e));
}

const conSenda = (e: Emisora): boolean =>
  e.caja === "nav" &&
  e.estacion.clase === "ILS" &&
  e.estacion.senda !== null &&
  e.estacion.mhzSenda !== null &&
  e.estacion.rumboVerdadero !== null &&
  anguloDeLaSenda(e.estacion) !== null;

/**
 * **El de este vuelo**: el de la cabecera en uso, si lo tiene; si no, el
 * primero del campo. Con el viento del sitio, en los campos del juego es casi
 * siempre el de la cabecera en uso; si no, se vuela el otro, con el viento
 * que toque.
 */
export function ilsDelVuelo(oaci: string | null | undefined, cabecera: string | null | undefined): Emisora | null {
  return ilsDeLaCabecera(oaci, cabecera) ?? ilsDelCampo(oaci)[0] ?? null;
}

/** **El ángulo de interceptación del localizador**, grados: treinta (PANS-OPS). */
export const CORTADA_LOC = 30;
/**
 * **A cuánto de la antena de la senda se empieza**, m: doce millas, fuera de
 * las diez de su alcance. Así la bandera de la senda se ve al empezar y se
 * va sola en cuanto se entra en su sector, con el localizador ya cogido.
 */
export const LEJOS = 12 * MILLA;
/**
 * **Lo apartado del eje**, grados vistos desde el localizador: cinco, dentro
 * de los diez de su sector de veinticinco millas (Anexo 10, vol. I, 3.1.3.3)
 * y el doble de su tope. A treinta grados de cortada la aguja queda a tope
 * medio minuto largo, lo que hace falta para oír qué se pide.
 */
export const APARTADO_LOC = 5;
/**
 * **Dónde cruza la senda la altura de la salida**, m de la antena: a siete
 * millas. Se empieza nivelado y por debajo, y la senda baja hasta el avión
 * con el localizador ya establecido, como en un procedimiento publicado (el
 * punto de aproximación final suele estar entre cinco y diez millas).
 */
export const CAPTURA = 7 * MILLA;
/** Lo que se deja como poco por encima del suelo del camino, m: quinientos pies. */
const POR_ENCIMA_DEL_CAMINO = 500 * PIE;

export interface ColocacionDelIls {
  readonly x: number;
  readonly z: number;
  /** Altura sobre la pista, m. */
  readonly alto: number;
  /** Rumbo del morro, rad: cero al norte, positivo hacia el este. */
  readonly rumbo: number;
  /** De qué lado del eje se empieza, mirando a la pista: 1, a la derecha. */
  readonly lado: 1 | -1;
}

/**
 * **Dónde empieza**: a doce millas de la antena de la senda, cinco grados
 * apartado del eje visto desde el localizador **del lado del que viene el
 * viento**, con el morro cortándolo a treinta grados hacia la pista. Del lado
 * del viento porque así empuja hacia el eje, y quien no vira a tiempo lo
 * cruza, que es la lección del localizador fino. En calma, a la derecha.
 *
 * A la altura de la senda a siete millas, y nunca a menos de quinientos pies
 * del suelo del camino: nivelado y por debajo de la senda.
 *
 * `rumboFinal` es el verdadero de la final, grados (`Estacion.rumboVerdadero`);
 * `viento`, hacia dónde va el aire, m/s, como lo usa el modelo de vuelo.
 */
export function colocacionDelIls(o: {
  readonly localizador: PuntoDelMundo;
  readonly senda: PuntoDelMundo;
  readonly rumboFinal: number;
  readonly angulo: number;
  readonly viento: PuntoDelMundo;
  /** El suelo, m sobre el mar, en un punto del mundo; el agua, cero. */
  readonly suelo: (x: number, z: number) => number;
  readonly cotaDeLaPista: number;
}): ColocacionDelIls {
  const rf = o.rumboFinal * GRADO;
  // Hacia la pista, y hacia fuera de ella por la prolongación del eje.
  const hacia = { x: Math.sin(rf), z: -Math.cos(rf) };
  const derecha = { x: -hacia.z, z: hacia.x };
  // De la antena del localizador a la de la senda, a lo largo del eje.
  const entreAntenas = (o.localizador.x - o.senda.x) * hacia.x + (o.localizador.z - o.senda.z) * hacia.z;
  const desdeElLoc = LEJOS + entreAntenas;
  // El viento hacia la izquierda, mirando a la pista, viene de la derecha.
  const haciaLaDerecha = o.viento.x * derecha.x + o.viento.z * derecha.z;
  const lado: 1 | -1 = Math.hypot(o.viento.x, o.viento.z) > 0.1 && haciaLaDerecha < 0 ? 1 : -1;
  const aparte = desdeElLoc * Math.tan(APARTADO_LOC * GRADO) * lado;
  const x = o.localizador.x - hacia.x * desdeElLoc + derecha.x * aparte;
  const z = o.localizador.z - hacia.z * desdeElLoc + derecha.z * aparte;
  // Cortando hacia el eje: desde la derecha, el morro treinta grados a la izquierda de la final.
  const rumbo = rf - lado * CORTADA_LOC * GRADO;
  let alto = Math.tan(o.angulo * GRADO) * CAPTURA;
  // El camino: de la salida al eje y por él hasta la captura.
  const hastaLaCaptura = LEJOS - CAPTURA;
  for (let i = 0; i <= 16; i++) {
    const f = i / 16;
    const px = x - derecha.x * aparte * f + hacia.x * hastaLaCaptura * f;
    const pz = z - derecha.z * aparte * f + hacia.z * hastaLaCaptura * f;
    alto = Math.max(alto, o.suelo(px, pz) + POR_ENCIMA_DEL_CAMINO - o.cotaDeLaPista);
  }
  return { x, z, alto, rumbo, lado };
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/** Lo que el ejercicio necesita mirar del vuelo en cada paso. */
export interface LecturaDelIls {
  readonly enElSuelo: boolean;
  /** Quieto en el suelo. */
  readonly parado: boolean;
  /** Si el vuelo acaba de terminar en un percance. */
  readonly percance: boolean;
  /** Si la NAV tiene puesto el localizador del ejercicio y se oye. */
  readonly sintonizada: boolean;
  /** Lo que marca el localizador, grados con su signo (`leerNav`); `null` sin señal. */
  readonly localizador: number | null;
  /** Lo que marca la senda (`LecturaNav.senda`). */
  readonly senda: LecturaSenda | null;
  /** La altura sobre la pista, m. */
  readonly altura: number;
}

export type CierreDelIls =
  /** Se llegó a los mínimos con las agujas dentro y se aterrizó. */
  | "pista"
  /** Se fue al aire: se felicita igual. */
  | "frustrada"
  /** Algo salió mal: se repite, como en el simulador. */
  | "otraVez";

export type SucesoDelIls =
  /** Qué se va a hacer, y el localizador en la tarjeta. */
  | { readonly que: "presentar" }
  /** Se quitó el ILS de la NAV: volver a ponerlo. */
  | { readonly que: "sintonizar" }
  /** La aguja del localizador a tope: el eje queda de ese lado. */
  | { readonly que: "aTope"; readonly lado: 1 | -1 }
  /** Se despega: virar ya, que es fino. */
  | { readonly que: "seMueve"; readonly lado: 1 | -1 }
  /** Establecido en el localizador: ahora la senda, desde abajo. */
  | { readonly que: "enElLocalizador" }
  /** La aguja de la senda llega al centro: a bajar con las dos. `desdeAbajo`, si venía por debajo. */
  | { readonly que: "capturada"; readonly desdeAbajo: boolean }
  /**
   * **Los mínimos**: con las dos agujas a menos de un punto, la pista a la
   * vista; si no, frustrada. `puntos`, lo que marcaban las dos ahí.
   */
  | { readonly que: "minimos"; readonly dentro: boolean; readonly loc: number; readonly senda: number }
  | { readonly que: "cerrar"; readonly como: CierreDelIls };

export type FaseDelIls = "localizador" | "senda" | "bajando" | "pista" | "frustrando" | "cerrada";

/**
 * **Lo que dura la presentación**, s de juego: lo que tarda la instructora en
 * contarla. Antes no se dice «a tope», que empieza a tope: dicho en el mismo
 * paso, su tarjeta tapaba la de la presentación —con el ILS escrito— en el
 * mismo fotograma (lo vio el banco). Si la aguja se despega antes, no se dice.
 */
export const PRESENTACION = 14;
/** **Establecido en el localizador**: la aguja a menos de medio punto este rato, s. */
export const LOC_ESTABLECIDO = 10;
/** Medio punto, la mitad del primero: lo que en la cabina ya es «en el centro». */
export const MEDIO_PUNTO = 0.5;
/** **Dentro**, en los mínimos: a menos de un punto en las dos agujas. */
export const DENTRO = 1;
/**
 * **Lo que hay que subir para que sea una frustrada**, m: cuarenta, los de
 * `flight/frustrada.ts`, que es quien la celebra. Lo de aquí solo cierra el
 * ejercicio cuando ya se ha celebrado.
 */
export const SUBIDA_QUE_CUENTA = 40;
/** Por debajo de esto la aproximación va en serio y una subida es una frustrada, m: mil pies. */
export const MIL_PIES = 1000 * PIE;
/** Lo que se espera en el suelo antes de cerrar, s: que pare o que ruede un rato. */
export const EN_EL_SUELO = 8;

export class IlsConAgujas {
  private faseActual: FaseDelIls = "localizador";
  private presentada = false;
  /** Lo que lleva presentado, s. */
  private desdeLaPresentacion = 0;
  private estabaSintonizada = false;
  private dijoATope = false;
  private dijoSeMueve = false;
  private enElCentro = 0;
  /** Si la aguja de la senda ha estado más de un punto por debajo desde que se recibe. */
  private vinoDeAbajo = false;
  private masBajo = Infinity;
  private enTierra = 0;
  private comoCerro: CierreDelIls | null = null;
  /** Lo que marcaban las dos agujas en los mínimos, puntos: lo mira el banco y el panel. */
  private enLosMinimosMedido: { readonly loc: number; readonly senda: number } | null = null;
  /** Lo más que se fue cada aguja desde mil pies, puntos. */
  private peorDesdeMil = { loc: 0, senda: 0 };

  constructor(
    readonly ejercicio: Ejercicio,
    /** El localizador del ejercicio, con su senda. */
    readonly ils: Emisora,
  ) {}

  get fase(): FaseDelIls {
    return this.faseActual;
  }

  get cierre(): CierreDelIls | null {
    return this.comoCerro;
  }

  get enLosMinimos(): { readonly loc: number; readonly senda: number } | null {
    return this.enLosMinimosMedido;
  }

  get peorDesdeMilPies(): { readonly loc: number; readonly senda: number } {
    return this.peorDesdeMil;
  }

  /** Si esta frecuencia es la del localizador del ejercicio. */
  esElLocalizador(mhz: number | null): boolean {
    return mhz !== null && emisorasEn("nav", mhz, [this.ils]).length > 0;
  }

  /** Otra vez desde el principio, como en el simulador. */
  reiniciar(): void {
    this.faseActual = "localizador";
    this.presentada = false;
    this.desdeLaPresentacion = 0;
    this.estabaSintonizada = false;
    this.dijoATope = false;
    this.dijoSeMueve = false;
    this.enElCentro = 0;
    this.vinoDeAbajo = false;
    this.masBajo = Infinity;
    this.enTierra = 0;
    this.comoCerro = null;
    this.enLosMinimosMedido = null;
    this.peorDesdeMil = { loc: 0, senda: 0 };
  }

  paso(l: LecturaDelIls, dt: number): SucesoDelIls[] {
    const sucesos: SucesoDelIls[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    } else this.desdeLaPresentacion += dt;
    if (l.percance) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }

    /*
     * **En el suelo**: pasados los mínimos con las agujas dentro, es el
     * aterrizaje que se buscaba; y si se pidió la frustrada y se aterrizó
     * igual, también se acaba ahí, sin reñir: se ve la consecuencia. Antes de
     * los mínimos, aterrizar —en otra parte— es un vuelo que no salió.
     */
    if (l.enElSuelo) {
      this.enTierra += dt;
      if (l.parado || this.enTierra >= EN_EL_SUELO)
        this.cerrar(this.faseActual === "pista" || this.faseActual === "frustrando" ? "pista" : "otraVez", sucesos);
      return sucesos;
    }
    this.enTierra = 0;

    /*
     * **La frustrada**: subir de verdad desde lo más bajo de una aproximación
     * en serio, la pidiera o no el ejercicio. La celebra `Frustrada` en el
     * juego; aquí solo se cierra, con el mismo listón para no adelantarse.
     */
    const enSerio = this.faseActual === "bajando" || this.faseActual === "pista" || this.faseActual === "frustrando";
    if (enSerio && l.altura < MIL_PIES) {
      this.masBajo = Math.min(this.masBajo, l.altura);
      if (l.altura - this.masBajo >= SUBIDA_QUE_CUENTA) {
        this.cerrar("frustrada", sucesos);
        return sucesos;
      }
    }

    /*
     * **El ILS empieza puesto**, como lo deja quien prepara una aproximación:
     * identificarlo ya lo enseñaron los de antes. Si se quita, se pide una
     * vez; un aviso vuelve cuando cambia algo que pasa.
     */
    const quitada = this.estabaSintonizada && !l.sintonizada;
    this.estabaSintonizada = l.sintonizada;
    if (quitada) sucesos.push({ que: "sintonizar" });
    if (!l.sintonizada || l.localizador === null) {
      this.enElCentro = 0;
      return sucesos;
    }

    const loc = puntosDelLocalizador(l.localizador);
    const lado: 1 | -1 = l.localizador >= 0 ? 1 : -1;
    const senda = l.senda && !l.senda.bandera && l.senda.puntos !== null ? l.senda.puntos : null;
    if (senda !== null && senda < -DENTRO) this.vinoDeAbajo = true;

    if (this.faseActual === "localizador") {
      if (Math.abs(l.localizador) >= ESCALA_LOC) {
        if (!this.dijoATope && this.desdeLaPresentacion >= PRESENTACION) {
          this.dijoATope = true;
          sucesos.push({ que: "aTope", lado });
        }
      } else if (!this.dijoSeMueve) {
        // Despegada antes de acabar la presentación: «a tope» ya no es verdad.
        this.dijoATope = true;
        this.dijoSeMueve = true;
        sucesos.push({ que: "seMueve", lado });
      }
      this.enElCentro = Math.abs(loc) < MEDIO_PUNTO ? this.enElCentro + dt : 0;
      if (this.enElCentro >= LOC_ESTABLECIDO) {
        this.faseActual = "senda";
        sucesos.push({ que: "enElLocalizador" });
      } else if (senda === null || Math.abs(senda) >= MEDIO_PUNTO) return sucesos;
    }

    /*
     * **La captura**: la aguja de la senda en el centro. Si llega antes de
     * que el localizador quede establecido —quien vira tarde—, vale igual:
     * se baja con las dos, y la del localizador se sigue corrigiendo.
     */
    if (this.faseActual === "senda" || this.faseActual === "localizador") {
      if (senda !== null && Math.abs(senda) < MEDIO_PUNTO) {
        this.faseActual = "bajando";
        sucesos.push({ que: "capturada", desdeAbajo: this.vinoDeAbajo });
      }
      return sucesos;
    }

    if (l.altura < MIL_PIES) {
      this.peorDesdeMil = {
        loc: Math.max(this.peorDesdeMil.loc, Math.abs(loc)),
        senda: Math.max(this.peorDesdeMil.senda, Math.abs(senda ?? 0)),
      };
    }

    /*
     * **Los mínimos**: al cruzarlos bajando, una vez. Las dos agujas a menos
     * de un punto: la pista. Si no —o si la senda ya no se recibe, que con la
     * antena al lado de la pista no pasa en la final—, frustrada.
     */
    if (this.faseActual === "bajando" && l.altura <= ALTURA_DE_DECISION) {
      const s = senda ?? Infinity;
      const dentro = Math.abs(loc) <= DENTRO && Math.abs(s) <= DENTRO;
      this.enLosMinimosMedido = { loc, senda: s };
      this.faseActual = dentro ? "pista" : "frustrando";
      sucesos.push({ que: "minimos", dentro, loc, senda: s });
    }
    return sucesos;
  }

  private cerrar(como: CierreDelIls, sucesos: SucesoDelIls[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

/** Lo que se escribe en la tarjeta, como en una carta de aproximación: «ILS 01 · IFV 109.50 · 005». */
export function rotuloDelIls(e: Emisora): string {
  const s = e.estacion;
  const curso = s.curso ? /(\d{3})/.exec(s.curso)?.[1] : null;
  return [`ILS ${s.pista ?? ""}`.trim(), `${s.id} ${e.mhz.toFixed(2)}`, curso].filter(Boolean).join(" · ");
}
