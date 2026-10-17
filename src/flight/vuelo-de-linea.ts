/**
 * **El vuelo de línea, llevado por su tripulación**: la comandante Jazlyn y
 * su primer oficial, del puesto de salida al de llegada.
 *
 * Es la mitad de la tercera escena del modo inicio —ver `inicio-pasaje.ts`—:
 * Ara va de pasaje, mirando por la ventanilla, y no toca nada. Así que el
 * avión lo lleva quien lo lleva en un vuelo de verdad, desde la cabina de
 * mando, y lo lleva **como se lleva uno de verdad**: es lo único que va a ver
 * por la ventanilla quien juega, y lo va a reconocer el día que se suba a uno
 * (AGENTS.md, regla 4).
 *
 * ## Lo que hace, en el orden de siempre
 *
 * 1. **En la puerta**, parado, con los motores apagados, hasta que la escena
 *    dice que ya se cerraron las puertas y se armaron los toboganes. Sin
 *    remolque, que este juego no lo tiene: los puestos son de salir de frente.
 * 2. **Arranca** y deja que los motores se asienten antes de moverse.
 * 3. **Rueda por la raya del plan**, la verde que pinta el juego: despacio en
 *    las curvas y frenando con tiempo para parar en la doble raya.
 * 4. **Espera en la doble raya** el permiso de la torre —el de la máquina de
 *    fases, que es el mismo que recibe quien juega— y que la escena haya
 *    dicho «sentados para el despegue». No entra en pista sin las dos cosas.
 * 5. **Entra, se alinea y despega**: gas de despegue, el eje con los pedales,
 *    y a la Vr de su ficha, la rotación.
 * 6. **Sube** por la ruta del plan —la salida publicada, ver `ruta.ts`— con
 *    el tren dentro en cuanto sube y los flaps recogidos a mil pies, a
 *    doscientos cincuenta nudos por debajo de diez mil pies y luego más.
 * 7. **Crucero** a la altura del plan, y **baja** por la senda del plan desde
 *    su punto de descenso, la misma que sigue el automático (`VNAV PTH`).
 * 8. **La final**: por el localizador y la senda de la pista, con los flaps
 *    saliendo por escalones, el tren fuera a unos doce kilómetros, los
 *    aerofrenos armados y el autofreno puesto, y a su velocidad de
 *    aproximación.
 * 9. **La recogida** a la altura de su manual —ver `recogida.ts`—, el gas
 *    fuera, y tocar suave.
 * 10. **La carrera**: los frenos de tierra salen solos, la reversa hasta
 *     sesenta y tantos nudos y el autofreno; luego, a paso de rodaje, por la
 *     raya hasta el puesto, y allí, motores fuera.
 *
 * ## Por qué así y no de otra manera
 *
 * - **Con los mandos, no moviendo el avión.** La mano pide un ritmo de subida
 *   y una inclinación, y el modelo de vuelo dice qué palanca da cada cosa
 *   —`mandoParaSubir` y `mandoParaInclinar`, los mismos que usa la mano de
 *   Jazlyn en la segunda escena—. Así el avión hace lo que hace con esos
 *   mandos, suena como suena y la cabina presurizada, el cartel del
 *   cinturón y la máquina de fases se enteran de todo sin trucos.
 * - **Con la ruta y la raya del juego, no con unas suyas.** Lo que se vuela
 *   es el plan que se pinta en la pantalla de navegación y la raya que se
 *   pinta en el suelo: si un día el plan cambia, el vuelo cambia con él.
 * - **Sin prisa y sin sustos.** Lo que se nota desde un asiento de pasaje es
 *   la inclinación, lo que aprieta el asiento y los frenazos: veinticinco
 *   grados de alabeo como mucho y menos cerca del suelo, subidas y bajadas de
 *   las de un avión de línea, y frenadas que se ven venir.
 *
 * Esto es solo la lógica: no toca el DOM, ni el modelo de vuelo, ni el audio.
 * Lo engancha `game.ts`, y `vuelo-de-linea.test.ts` lo vuela con el modelo de
 * Guyrami y el JAZ 90 de verdad sobre una pista y una ruta de mentira.
 */

import type { LoSacado } from "./model";
import type { Fase } from "./vuelo";

const GRADO = Math.PI / 180;
const NUDO = 1852 / 3600;
const PIE = 0.3048;

/** Un punto del suelo del mundo, m: `x` al este y `z` al sur. */
export interface PuntoXZ {
  readonly x: number;
  readonly z: number;
}

/** Lo que va haciendo la tripulación, en el orden en que se hace. */
export type TramoDeLinea =
  | "puerta"
  | "arrancando"
  | "rodando"
  | "esperando"
  | "entrando"
  | "carrera"
  | "subida"
  | "crucero"
  | "bajada"
  | "final"
  | "recogida"
  | "frenando"
  | "al-puesto"
  | "aparcado"
  | "apagado";

/**
 * **Lo que deja hacer la escena**: las tres cosas que en un avión de verdad
 * esperan a la cabina de pasaje. Arrancar, con las puertas cerradas y los
 * toboganes armados; rodar, con los motores asentados; y entrar en pista, con
 * la tripulación de cabina sentada.
 */
export interface PermisosDeLaEscena {
  readonly arrancar: boolean;
  readonly rodar: boolean;
  readonly entrar: boolean;
}

/** Lo que la tripulación lee del avión, del plan y de la pista en cada paso. Todo en SI. */
export interface LecturaDeLinea {
  readonly enTierra: boolean;
  readonly enPista: boolean;
  readonly x: number;
  readonly z: number;
  /** Rad, cero al norte y positivo hacia el este. */
  readonly rumbo: number;
  /** La velocidad respecto al aire, m/s. */
  readonly velocidad: number;
  /** Y sobre el suelo, m/s. */
  readonly porElSuelo: number;
  readonly altitud: number;
  /** De las ruedas al suelo, m. */
  readonly altura: number;
  readonly vertical: number;
  readonly motor: boolean;
  /** Dónde están los flaps, 0 a 1, y el tren, 0 dentro y 1 fuera. */
  readonly flaps: number;
  readonly tren: number;
  /** La máquina de fases del juego. Ver `flight/vuelo.ts`. */
  readonly fase: Fase;
  /** Si la torre dio el permiso para entrar en pista. */
  readonly autorizado: boolean;
  /** **La raya del suelo** entera: la que pinta el plan. Vacía, no hay. */
  readonly raya: readonly PuntoXZ[];
  /** La pista en uso: el eje, lo que se va de él y lo que queda por delante. */
  readonly pista: {
    /** Rumbo del eje en el sentido en que se usa, rad. */
    readonly rumbo: number;
    /** Lo que se va del eje, m, positivo a la derecha. */
    readonly lado: number;
    /** Lo que queda de asfalto por delante, m. */
    readonly queda: number;
  };
  /** **El tramo de la ruta que se vuela**, o `null` si no hay plan. */
  readonly tramo: { readonly desde: PuntoXZ; readonly hasta: PuntoXZ; readonly recta: boolean } | null;
  /** La altitud que pide el plan, m: la de crucero o la de su senda bajando. */
  readonly alturaPedida: number;
  /** Y el ritmo de su senda, m/s, cero nivelado. */
  readonly ritmoPedido: number;
  /** Lo que falta por la ruta hasta el umbral de llegada, m. */
  readonly faltaParaTocar: number;
  /** Si ya se vuela el tramo final, en el eje de la pista de llegada. */
  readonly enLaFinal: boolean;
  /** El rumbo que pide el localizador, rad, o `null` si todavía no lo capta. */
  readonly localizador: number | null;
  /** La senda de la final: la altitud que toca aquí y lo que baja, m y m/s. */
  readonly senda: { readonly altitud: number; readonly ritmo: number } | null;
  /** La cota del campo donde se está o del de llegada, m. */
  readonly cotaDelCampo: number;
}

/** Lo que la tripulación sabe de su avión: la ficha y lo que contesta el modelo. */
export interface FichaDeLinea {
  /** Velocidad de rotación, m/s. */
  readonly vr: number;
  /** Velocidad de aproximación, m/s. */
  readonly vref: number;
  /** A qué altura se levanta la nariz, m. Ver `recogida.ts`. */
  readonly alturaDeLaRecogida: number;
  /** Si lleva reversa. */
  readonly reversa: boolean;
  /** Si mete el tren. */
  readonly trenQueSeMete: boolean;
}

/**
 * **Lo que llevan las manos en este paso.** En el aire, un ritmo de subida y
 * una inclinación, que el modelo pone en palancas —ver `enLosMandos`—; en el
 * suelo, el volante de la rueda de morro y los pedales. Lo demás son
 * palancas que se dejan en su sitio: los flaps en su muesca, el tren, los
 * aerofrenos armados, el selector del autofreno y la reversa.
 */
export interface ManosDeLinea {
  readonly motor: boolean;
  /** El gas, 0 a 1. Ver `velocidadPedida`: lo pone `game.ts` con el modelo. */
  readonly velocidad: number;
  /** Y si el gas va a fondo, como en la carrera, o al ralentí, como al tocar. */
  readonly gas: "despegue" | "velocidad" | "ralenti" | "rodaje";
  /**
   * **La parte del gas que se deja**, 0 a 1: en la recogida sale con la
   * altura, y al tocar está al ralentí. Sin poner, entero.
   */
  readonly fraccion?: number;
  readonly subida: number | null;
  readonly alabeo: number | null;
  readonly volante: number | null;
  readonly pedal: number | null;
  readonly freno: number;
  /** La palanca de flaps: 0, 1/3, 2/3 o 1. */
  readonly flaps: number;
  /** El tren, pedido fuera. */
  readonly tren: boolean;
  /** Los aerofrenos armados para que salgan solos al tocar. */
  readonly armados: boolean;
  /** El autofreno: 0 apagado, 1 LO, 2 MED. Ver `PalancaDeAerofrenos`. */
  readonly autofreno: 0 | 1 | 2;
  readonly reversa: number;
}

// ── Los números ──────────────────────────────────────────────────────────

/** **Rodando**: en recta y en curva, m/s. Unos dieciocho nudos y unos nueve. */
export const RODAJE_EN_RECTA = 9;
export const RODAJE_EN_CURVA = 4.5;
/** Y lo que frena rodando, m/s²: el que se ve venir desde el asiento. */
const FRENA_RODANDO = 0.6;
/** Lo que mira por delante en la raya, m, más lo que recorre en este rato, s. */
const MIRA_RODANDO = 14;
const MIRA_RODANDO_S = 1.6;
/** Por debajo de esto el avión está parado, m/s. */
const PARADO = 0.4;
/**
 * **Lo que puede quedar de raya para alinearse ya con el eje**, m: la raya
 * acaba en el eje mirando a la pista, y lo último lo hace el morro.
 */
const RAYA_QUE_SOBRA = 25;
/** Lo que se dejan los motores asentarse antes de rodar, s. */
export const ASIENTAN_LOS_MOTORES = 12;
/** Y lo que se queda parado en el puesto antes de apagar, s. */
const ANTES_DE_APAGAR = 6;

/**
 * **La subida**: el ritmo de un reactor regional, m/s, abajo y arriba de diez
 * mil pies: unos dos mil setecientos pies por minuto y unos dos mil
 * trescientos. Con menos, en un salto entre islas no se llegaba nunca al nivel
 * del plan: el punto de descenso llegaba antes, y no había crucero.
 */
export const SUBE_ABAJO = 14;
export const SUBE_ARRIBA = 12;
/** Y bajando, como mucho, m/s: unos dos mil pies por minuto. */
const BAJA_COMO_MUCHO = 11;
/** Diez mil pies, m: debajo, doscientos cincuenta nudos. */
const DIEZ_MIL = 10000 * PIE;
/** Lo que sube recto antes de virar, m sobre el campo. Ver `trazar` en `ruta.ts`. */
const SUBE_RECTO = 120;
/** A qué altura sobre el campo recoge los flaps de despegue, m: mil pies. */
const RECOGE_LOS_FLAPS = 1000 * PIE;
/**
 * **Lo que cambia el ritmo de subida pedido por segundo**, m/s²: una décima de
 * g, la de un automático. En la rotación, algo más —se tira de la palanca—, y
 * en la recogida, lo que hace falta para pasar de la senda a casi nada en los
 * metros que hay.
 */
const CAMBIA_LA_SUBIDA = 1;
const CAMBIA_EN_LA_ROTACION = 2.5;
const CAMBIA_EN_LA_RECOGIDA = 1.6;

/** **Las velocidades**, m/s. */
const V_250 = 250 * NUDO;
const V_ARRIBA = 280 * NUDO;
const V_BAJANDO_CERCA = 210 * NUDO;

/**
 * **Dónde se configura para aterrizar**, m por la ruta hasta el umbral: a
 * doscientos diez nudos a unas diecisiete millas, los flaps del primer punto a
 * catorce, los del segundo a diez, el tren a siete y los de aterrizar a cinco,
 * para ir estabilizado a su velocidad desde unas tres millas y media —mil pies
 * sobre el campo—, que es lo que pide cualquier operador.
 */
export const CONFIGURA = {
  frena: 32000,
  flaps1: 26000,
  flaps2: 18000,
  tren: 13000,
  flapsTodos: 9500,
  estabilizado: 6500,
};

/** **El alabeo**: veinticinco grados como mucho, y menos cerca del suelo. */
const ALABEO_MAXIMO = 25 * GRADO;
const ALABEO_EN_FINAL = 15 * GRADO;
const ALABEO_CERCA_DEL_SUELO = 8 * GRADO;
/** Lo que inclina por cada radián que le falta de rumbo. */
const INCLINA_POR_RUMBO = 2;
/** El corte con que vuelve a un tramo: por cada metro de lado, a esta distancia. */
const CORTA_A = 2500;
const CORTE_MAXIMO = 30 * GRADO;

/** **En la pista**: el volante y el pedal por radián que falta, y el corte al eje. */
const GIRA_EN_PISTA = 3;
const VUELVE_AL_EJE = 60;
const CORTE_EN_PISTA = 8 * GRADO;

/**
 * **Desde qué parte de la altura de la recogida empieza a salir el gas**: el
 * «retard» de los reactores, que llega a unos veinte pies, por debajo de los
 * treinta de levantar la nariz. Ver `recogida.ts`.
 */
const GAS_FUERA = 0.65;

/** La reversa, hasta estos m/s: unos sesenta y cinco nudos. */
const REVERSA_HASTA = 65 * NUDO;
/** Y a qué velocidad deja el autofreno y frena a mano para salir, m/s. */
const SALE_DE_LA_PISTA = 14;

// ── La raya del suelo ────────────────────────────────────────────────────

/**
 * **Seguir una raya** como la sigue quien rueda: un punto un poco por
 * delante, sobre ella, y el morro hacia allí. Lleva por dónde va —el avance
 * no vuelve atrás, que una raya que da la vuelta sobre sí misma, como la del
 * back-taxi, engañaría al punto más cercano— y se empieza de cero cuando el
 * plan pinta otra.
 */
export class SeguirLaRaya {
  private puntos: readonly PuntoXZ[] = [];
  private tramo = 1;

  /** Mira la raya de ahora; si es otra, se empieza por el tramo más cercano. */
  poner(raya: readonly PuntoXZ[], x: number, z: number): void {
    if (raya === this.puntos) return;
    this.puntos = raya;
    this.tramo = 1;
    let mejor = Infinity;
    for (let i = 1; i < raya.length; i++) {
      const d = aLaRaya(raya[i - 1]!, raya[i]!, x, z);
      if (d < mejor - 0.5) {
        mejor = d;
        this.tramo = i;
      }
    }
  }

  /**
   * Un paso: avanza por la raya y dice a dónde apuntar, lo que queda hasta
   * su final y cuánto gira lo que viene por delante.
   */
  paso(x: number, z: number, mira: number): { objetivo: PuntoXZ; queda: number; giro: number } | null {
    const r = this.puntos;
    if (r.length < 2) return null;
    while (this.tramo < r.length - 1) {
      const a = r[this.tramo - 1]!;
      const b = r[this.tramo]!;
      const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const t = ((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) / l;
      if (t >= l - 0.5) this.tramo++;
      else break;
    }
    const a = r[this.tramo - 1]!;
    const b = r[this.tramo]!;
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const t = Math.max(0, Math.min(l, ((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) / l));
    // Lo que queda: de la proyección al final del tramo, y los tramos de después.
    let queda = l - t;
    for (let i = this.tramo + 1; i < r.length; i++)
      queda += Math.hypot(r[i]!.x - r[i - 1]!.x, r[i]!.z - r[i - 1]!.z);
    // El punto de mirar, `mira` metros por delante sobre la raya.
    let falta = mira;
    let i = this.tramo;
    let desde = { x: a.x + ((b.x - a.x) * t) / l, z: a.z + ((b.z - a.z) * t) / l };
    let objetivo = desde;
    for (;;) {
      const hasta = r[i]!;
      const d = Math.hypot(hasta.x - desde.x, hasta.z - desde.z);
      if (d >= falta || i >= r.length - 1) {
        const k = d > 0 ? Math.min(1, falta / d) : 0;
        objetivo = { x: desde.x + (hasta.x - desde.x) * k, z: desde.z + (hasta.z - desde.z) * k };
        break;
      }
      falta -= d;
      desde = hasta;
      i++;
    }
    // Y lo que gira la raya en los próximos metros: para llegar despacio a la curva.
    let giro = 0;
    let recorrido = l - t;
    for (let j = this.tramo; j < r.length - 1 && recorrido < 45; j++) {
      const p = r[j - 1]!;
      const q = r[j]!;
      const s = r[j + 1]!;
      giro = Math.max(giro, Math.abs(diferencia(rumboEntre(p, q), rumboEntre(q, s))));
      recorrido += Math.hypot(s.x - q.x, s.z - q.z);
    }
    return { objetivo, queda, giro };
  }
}

// ── La tripulación ───────────────────────────────────────────────────────

/** Lo que la tripulación deja ver: para la escena, el banco y las pruebas. */
export interface EstadoDeLinea {
  readonly tramo: TramoDeLinea;
  /** Segundos en el tramo de ahora. */
  readonly enTramo: number;
  /** Si ya se tocó la pista de llegada. */
  readonly tocado: boolean;
  /** Cómo se tocó: lo que bajaba, m/s. */
  readonly caidaAlTocar: number | null;
}

export class VueloDeLinea {
  private tramo: TramoDeLinea = "puerta";
  private enTramo = 0;
  private readonly raya = new SeguirLaRaya();
  private vioElAire = false;
  private tocado = false;
  private caidaAlTocar: number | null = null;
  private ultimaVertical = 0;
  /** El ritmo de subida que se pide, para no darlo de golpe. */
  private subidaPedida = 0;
  /** Lo que lleva el avión fuera del puesto, m: para no apagar antes de salir. */
  private rodado = 0;

  constructor(private readonly ficha: FichaDeLinea) {}

  get estado(): EstadoDeLinea {
    return {
      tramo: this.tramo,
      enTramo: this.enTramo,
      tocado: this.tocado,
      caidaAlTocar: this.caidaAlTocar,
    };
  }

  private pasarA(t: TramoDeLinea): void {
    if (this.tramo === t) return;
    this.tramo = t;
    this.enTramo = 0;
  }

  /** Un paso: lo que se lee, lo que deja la escena y lo que hacen las manos. */
  paso(dt: number, l: LecturaDeLinea, permisos: PermisosDeLaEscena): ManosDeLinea {
    this.enTramo += dt;
    if (!l.enTierra) this.vioElAire = true;
    if (l.enTierra && this.vioElAire && !this.tocado) {
      this.tocado = true;
      this.caidaAlTocar = Math.max(0, -this.ultimaVertical);
      this.pasarA("frenando");
    }
    this.ultimaVertical = l.vertical;
    if (l.enTierra) this.rodado += l.porElSuelo * dt;
    this.decidir(l, permisos);
    return this.manos(dt, l);
  }

  /** Qué toca ahora: los tramos solo van hacia delante. */
  private decidir(l: LecturaDeLinea, p: PermisosDeLaEscena): void {
    switch (this.tramo) {
      case "puerta":
        if (p.arrancar) this.pasarA("arrancando");
        return;
      case "arrancando":
        if (l.motor && this.enTramo >= ASIENTAN_LOS_MOTORES && p.rodar) this.pasarA("rodando");
        return;
      case "rodando":
        // La doble raya: la raya se acaba ahí y la fase lo dice.
        if (
          (l.fase === "esperando" || l.fase === "autorizado") &&
          l.porElSuelo < PARADO &&
          !l.enPista
        )
          this.pasarA("esperando");
        else if (l.enPista && (l.fase === "alineando" || l.fase === "despegando" || l.fase === "back-taxi"))
          this.pasarA("entrando");
        return;
      case "esperando":
        if (l.autorizado && p.entrar) this.pasarA("entrando");
        return;
      case "entrando":
        // En la pista, alineado y con lo que la raya pedía rodado: a correr.
        if (
          l.enPista &&
          l.fase !== "back-taxi" &&
          Math.abs(diferencia(l.rumbo, l.pista.rumbo)) < 4 * GRADO &&
          Math.abs(l.pista.lado) < 4 &&
          this.quedaDeRaya(l) <= RAYA_QUE_SOBRA
        )
          this.pasarA("carrera");
        return;
      case "carrera":
        if (!l.enTierra && l.altura > 15) this.pasarA("subida");
        return;
      case "subida":
        if (l.altitud >= l.alturaPedida - 30 && l.ritmoPedido >= 0) this.pasarA("crucero");
        if (l.ritmoPedido < 0) this.pasarA("bajada");
        if (l.enLaFinal) this.pasarA("final");
        return;
      case "crucero":
        if (l.ritmoPedido < 0 || l.alturaPedida < l.altitud - 60) this.pasarA("bajada");
        if (l.enLaFinal) this.pasarA("final");
        return;
      case "bajada":
        if (l.enLaFinal) this.pasarA("final");
        return;
      case "final":
        if (l.altura <= this.ficha.alturaDeLaRecogida) this.pasarA("recogida");
        return;
      case "recogida":
        return;
      case "frenando":
        if (l.porElSuelo <= SALE_DE_LA_PISTA && (l.fase === "abandonando" || l.fase === "a-plataforma" || l.raya.length > 1))
          this.pasarA("al-puesto");
        return;
      case "al-puesto": {
        const r = this.raya.paso(l.x, l.z, MIRA_RODANDO);
        const llegado = (r ? r.queda < 3 : false) || l.fase === "en-puesto";
        if (llegado && l.porElSuelo < PARADO) this.pasarA("aparcado");
        return;
      }
      case "aparcado":
        if (this.enTramo >= ANTES_DE_APAGAR) this.pasarA("apagado");
        return;
      case "apagado":
        return;
    }
  }

  /** Lo que hacen las manos en el tramo de ahora. */
  private manos(dt: number, l: LecturaDeLinea): ManosDeLinea {
    const quieto: ManosDeLinea = {
      motor: false,
      velocidad: 0,
      gas: "ralenti",
      subida: null,
      alabeo: null,
      volante: 0,
      pedal: 0,
      freno: 1,
      flaps: 0,
      tren: true,
      armados: false,
      autofreno: 0,
      reversa: 0,
    };
    switch (this.tramo) {
      case "puerta":
        return quieto;
      case "arrancando":
      case "aparcado":
        return { ...quieto, motor: true };
      case "apagado":
        return quieto;
      case "rodando":
      case "al-puesto":
        return this.rodar(l, this.tramo === "al-puesto" ? 0 : 1 / 3);
      case "esperando":
        // Parado en la doble raya, con los flaps de despegue ya puestos.
        return { ...quieto, motor: true, flaps: 1 / 3 };
      case "entrando":
        return this.entrar(l);
      case "carrera":
        return this.correr(dt, l);
      case "frenando":
        return this.frenar(l);
      default:
        return this.volar(dt, l);
    }
  }

  /** **Rodar por la raya**: despacio en las curvas, y parar donde se acaba. */
  private rodar(l: LecturaDeLinea, flaps: number): ManosDeLinea {
    this.raya.poner(l.raya, l.x, l.z);
    const r = this.raya.paso(l.x, l.z, MIRA_RODANDO + MIRA_RODANDO_S * l.porElSuelo);
    if (!r) {
      // Sin raya no se rueda: se espera parado a que el plan pinte una.
      return { ...this.parado(), flaps };
    }
    const quiero = rumboEntre({ x: l.x, z: l.z }, r.objetivo);
    const falta = diferencia(l.rumbo, quiero);
    const enCurva = Math.min(1, r.giro / (60 * GRADO));
    const crucero = RODAJE_EN_RECTA - (RODAJE_EN_RECTA - RODAJE_EN_CURVA) * enCurva;
    // Y para parar al final de la raya sin frenazo: v² = 2·a·d.
    const paraParar = Math.sqrt(2 * FRENA_RODANDO * Math.max(0, r.queda - 2));
    // Mientras gira mucho, despacio: con el morro lejos de la raya no se acelera.
    const torcido = Math.abs(falta) > 35 * GRADO ? RODAJE_EN_CURVA : Infinity;
    const v = Math.min(crucero, paraParar, torcido);
    const sobra = l.porElSuelo - v;
    return {
      motor: true,
      velocidad: v,
      gas: "rodaje",
      subida: null,
      alabeo: null,
      volante: acotar(falta * 2.5, 1),
      pedal: acotar(falta * 1.5, 1),
      freno: r.queda < 1.5 || v < 0.3 ? 1 : sobra > 1 ? Math.min(1, sobra * 0.4) : 0,
      flaps,
      tren: true,
      armados: false,
      autofreno: 0,
      reversa: 0,
    };
  }

  /** Lo que queda de la raya de ahora, m: cero si no hay. */
  private quedaDeRaya(l: LecturaDeLinea): number {
    this.raya.poner(l.raya, l.x, l.z);
    return this.raya.paso(l.x, l.z, MIRA_RODANDO)?.queda ?? 0;
  }

  /** Parado con el motor en marcha. */
  private parado(): ManosDeLinea {
    return {
      motor: true,
      velocidad: 0,
      gas: "ralenti",
      subida: null,
      alabeo: null,
      volante: 0,
      pedal: 0,
      freno: 1,
      flaps: 0,
      tren: true,
      armados: false,
      autofreno: 0,
      reversa: 0,
    };
  }

  /**
   * **Entrar y alinearse**: por la raya mientras la haya; en la pista, al eje.
   * Despacio, que es girar un avión grande sobre el asfalto.
   */
  private entrar(l: LecturaDeLinea): ManosDeLinea {
    /*
     * La raya manda mientras le quede camino: si la entrada es por el medio y
     * hay que remontar la pista hasta la cabecera —el back-taxi—, la raya va
     * por la pista en el sentido contrario al de despegar y da la vuelta al
     * final. Alinearse en cuanto se pisa la pista sería despegar con la mitad.
     */
    if (this.quedaDeRaya(l) > RAYA_QUE_SOBRA || l.fase === "back-taxi" || !l.enPista)
      return this.rodar(l, 1 / 3);
    const quiero = l.pista.rumbo - acotar(Math.atan(l.pista.lado / 25), 40 * GRADO);
    const falta = diferencia(l.rumbo, quiero);
    const v = Math.abs(falta) > 10 * GRADO ? 2.5 : 4;
    return {
      motor: true,
      velocidad: v,
      gas: "rodaje",
      subida: null,
      alabeo: null,
      volante: acotar(falta * 2.5, 1),
      pedal: acotar(falta * 1.5, 1),
      freno: l.porElSuelo > v + 1 ? 0.3 : 0,
      flaps: 1 / 3,
      tren: true,
      armados: false,
      autofreno: 0,
      reversa: 0,
    };
  }

  /** **La carrera de despegue**: gas de despegue, el eje con los pies, y rotar en la Vr. */
  private correr(dt: number, l: LecturaDeLinea): ManosDeLinea {
    const eje = this.alEje(l);
    const rota = l.velocidad >= this.ficha.vr || !l.enTierra;
    if (rota) this.subidaPedida = Math.min(SUBE_ABAJO, this.subidaPedida + CAMBIA_EN_LA_ROTACION * dt);
    return {
      motor: true,
      velocidad: Infinity,
      gas: "despegue",
      subida: rota ? Math.max(2, this.subidaPedida) : null,
      alabeo: rota && !l.enTierra ? 0 : null,
      volante: l.enTierra ? eje : null,
      pedal: l.enTierra ? eje : null,
      freno: 0,
      flaps: 1 / 3,
      tren: true,
      armados: false,
      autofreno: 0,
      reversa: 0,
    };
  }

  /** El volante y el pedal que llevan al eje de la pista. */
  private alEje(l: LecturaDeLinea): number {
    const quiero = l.pista.rumbo - acotar(Math.atan(l.pista.lado / VUELVE_AL_EJE), CORTE_EN_PISTA);
    return acotar(GIRA_EN_PISTA * diferencia(l.rumbo, quiero), 1);
  }

  /**
   * **En el aire**: subir, cruzar y bajar por el plan, y la final por el
   * localizador y la senda. Un ritmo de subida y una inclinación; la
   * velocidad, con el gas.
   */
  private volar(dt: number, l: LecturaDeLinea): ManosDeLinea {
    const sobreElCampo = l.altitud - l.cotaDelCampo;
    // ── La vertical ──
    let subida: number;
    let cambia = CAMBIA_LA_SUBIDA;
    if (this.tramo === "recogida") {
      /*
       * **La recogida**: de lo que baja la senda a casi nada al tocar, con el
       * gas fuera a la vez. Es la misma ley que la de la mano de Jazlyn en la
       * segunda escena, que es la de cualquier manual: nariz arriba poco a poco
       * y el gas al ralentí al tocar.
       */
      subida = Math.max(l.senda ? l.senda.ritmo : -3.5, -(0.45 + 0.3 * Math.max(0, l.altura)));
      cambia = CAMBIA_EN_LA_RECOGIDA;
    } else if ((this.tramo === "final" || l.enLaFinal) && l.senda) {
      subida = l.senda.ritmo + acotar(0.15 * (l.senda.altitud - l.altitud), 1.5);
      // Nunca hacia arriba en la final: viniendo por debajo, se sostiene hasta la senda.
      subida = Math.min(subida, Math.max(0, l.senda.ritmo + 0.5));
    } else {
      const falta = l.alturaPedida - l.altitud;
      const tope = l.altitud < DIEZ_MIL ? SUBE_ABAJO : SUBE_ARRIBA;
      // Captura de la altura: llega frenando, como un automático.
      subida = Math.max(-BAJA_COMO_MUCHO, acotar(l.ritmoPedido + falta / 25, tope));
    }
    /*
     * **Y lo que se pide cambia a ritmo de automático**: una décima de g para
     * pasar de subir a nivelar o de nivelar a bajar. Es lo que no se nota desde
     * el asiento, y lo que se nota es justo lo contrario. Ver `CARGA_QUE_PIDE`
     * en `piloto-automatico.ts`.
     */
    this.subidaPedida += acotar(subida - this.subidaPedida, cambia * dt);

    // ── La lateral ──
    let quiero = l.rumbo;
    if (l.localizador !== null && (this.tramo === "final" || this.tramo === "recogida" || l.enLaFinal))
      quiero = l.localizador;
    else if (l.tramo) {
      const { desde, hasta } = l.tramo;
      const curso = rumboEntre(desde, hasta);
      const lado = deLado(desde, hasta, l.x, l.z);
      quiero = curso - acotar(Math.atan(lado / CORTA_A), CORTE_MAXIMO);
    }
    const tope =
      sobreElCampo < SUBE_RECTO && this.tramo === "subida"
        ? 0
        : l.altura < 150
          ? ALABEO_CERCA_DEL_SUELO
          : this.tramo === "final"
            ? ALABEO_EN_FINAL
            : ALABEO_MAXIMO;
    const alabeo =
      this.tramo === "recogida" ? 0 : acotar(INCLINA_POR_RUMBO * diferencia(l.rumbo, quiero), tope);

    // ── La velocidad y la configuración ──
    const falta = l.faltaParaTocar;
    const bajando = this.tramo === "bajada" || this.tramo === "final" || this.tramo === "recogida";
    let v: number;
    let flaps = 0;
    let tren = false;
    if (this.tramo === "subida") {
      const conFlaps = sobreElCampo < RECOGE_LOS_FLAPS;
      v = conFlaps ? this.ficha.vr + 10 : l.altitud < DIEZ_MIL ? V_250 : V_ARRIBA;
      flaps = conFlaps ? 1 / 3 : 0;
      // El tren dentro en cuanto sube de verdad: unos diez metros.
      tren = l.altura < 10;
    } else if (!bajando) {
      v = l.altitud < DIEZ_MIL ? V_250 : V_ARRIBA;
    } else {
      v = l.altitud < DIEZ_MIL ? V_250 : V_ARRIBA;
      if (falta < CONFIGURA.frena) v = Math.min(v, V_BAJANDO_CERCA);
      if (falta < CONFIGURA.flaps1) {
        flaps = 1 / 3;
        v = Math.min(v, Math.max(this.ficha.vref + 30, 175 * NUDO));
      }
      if (falta < CONFIGURA.flaps2) {
        flaps = 2 / 3;
        v = Math.min(v, this.ficha.vref + 15);
      }
      if (falta < CONFIGURA.tren || l.enLaFinal) tren = true;
      if (falta < CONFIGURA.flapsTodos) flaps = 1;
      if (falta < CONFIGURA.estabilizado) v = this.ficha.vref;
    }
    const recogiendo = this.tramo === "recogida";
    return {
      motor: true,
      velocidad: v,
      gas: "velocidad",
      /*
       * El gas, en la recogida, **sale con la altura**: al ralentí al tocar,
       * no de golpe arriba. Es lo que dice el manual —«thrust levers to idle
       * during the flare»— y lo que deja al avión la velocidad que se gasta en
       * posarse. Sacado de golpe, el JAZ 90 tocaba a cien nudos, treinta por
       * debajo de su aproximación.
       */
      ...(recogiendo
        ? { fraccion: Math.max(0, Math.min(1, l.altura / Math.max(0.5, GAS_FUERA * this.ficha.alturaDeLaRecogida))) }
        : {}),
      subida: this.subidaPedida,
      alabeo,
      volante: null,
      pedal: null,
      freno: 0,
      flaps,
      tren: this.ficha.trenQueSeMete ? tren || recogiendo : true,
      armados: falta < CONFIGURA.tren || recogiendo,
      autofreno: falta < CONFIGURA.tren || recogiendo ? 2 : 0,
      reversa: 0,
    };
  }

  /**
   * **La carrera de la toma**: los frenos de tierra salen solos —armados—,
   * la reversa hasta sus sesenta y cinco nudos, el autofreno, y por el eje.
   */
  private frenar(l: LecturaDeLinea): ManosDeLinea {
    const eje = this.alEje(l);
    const reversa = this.ficha.reversa && l.porElSuelo > REVERSA_HASTA ? 1 : 0;
    const despacio = l.porElSuelo < SALE_DE_LA_PISTA + 4;
    return {
      motor: true,
      velocidad: 0,
      gas: "ralenti",
      subida: null,
      alabeo: null,
      volante: eje,
      pedal: eje,
      // El autofreno lleva la frenada; ya despacio, a mano hasta paso de rodaje.
      freno: despacio && l.porElSuelo > SALE_DE_LA_PISTA ? 0.3 : 0,
      flaps: 1,
      tren: true,
      armados: true,
      autofreno: despacio ? 0 : 2,
      reversa,
    };
  }
}

// ── En los mandos ────────────────────────────────────────────────────────

/** Lo que el modelo de vuelo sabe contestar: qué palanca da qué. Ver `arcade.ts`. */
export interface ModeloDeLinea {
  mandoParaSubir?(ritmo: number): number;
  mandoParaInclinar?(alabeo: number): number;
  gasPara(velocidad: number, sacado?: LoSacado): number;
  gasParaRodar(velocidad: number, desde?: number): number;
}

/**
 * **Las manos de la tripulación puestas en los mandos**: el gas, la
 * profundidad, el alerón —que en el suelo es el volante de la rueda de
 * morro—, el pedal, los frenos y la reversa. Lo que pide se traduce con el
 * modelo de vuelo, que es quien sabe qué palanca da cada cosa. Lo usan
 * `game.ts` y la prueba, para que la mano que se prueba sea la que vuela.
 *
 * Las palancas que se dejan en su sitio —flaps, tren, aerofrenos, autofreno—
 * no van aquí: las pone el juego con los mismos mandos que quien juega.
 */
export function enLosMandosDeLinea(
  m: ManosDeLinea,
  modelo: ModeloDeLinea,
  ahora: { readonly porElSuelo: number; readonly sacado: LoSacado },
): {
  readonly throttle: number;
  readonly elevator: number | null;
  readonly aileron: number | null;
  readonly rudder: number | null;
  readonly brakes: number;
  readonly reversa: number;
} {
  const gas =
    m.gas === "despegue"
      ? 1
      : m.gas === "ralenti"
        ? 0
        : m.gas === "rodaje"
          ? modelo.gasParaRodar(m.velocidad, ahora.porElSuelo)
          : modelo.gasPara(m.velocidad, ahora.sacado) * (m.fraccion ?? 1);
  const elevator =
    m.subida !== null && modelo.mandoParaSubir ? acotar(modelo.mandoParaSubir(m.subida), 1) : null;
  let aileron: number | null = null;
  if (m.volante !== null) aileron = acotar(m.volante, 1);
  else if (m.alabeo !== null && modelo.mandoParaInclinar) {
    const pide = modelo.mandoParaInclinar(m.alabeo);
    aileron = Number.isFinite(pide) ? acotar(pide, 1) : 0;
  }
  return {
    throttle: Math.max(0, Math.min(1, Number.isFinite(gas) ? gas : 1)),
    elevator,
    aileron,
    rudder: m.pedal !== null ? acotar(m.pedal, 1) : null,
    brakes: Math.max(0, Math.min(1, m.freno)),
    reversa: m.reversa,
  };
}

// ── Lo que queda ─────────────────────────────────────────────────────────

/** El rumbo de `a` a `b`, rad, cero al norte. Ver `rumbo` en `ruta.ts`. */
export function rumboEntre(a: PuntoXZ, b: PuntoXZ): number {
  return Math.atan2(b.x - a.x, -(b.z - a.z));
}

/** Lo que hay que girar de `desde` a `hasta`, rad, entre −π y π. */
export function diferencia(desde: number, hasta: number): number {
  let d = (hasta - desde) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Lo que se va el punto de la recta `a`→`b`, m, positivo a la derecha. */
function deLado(a: PuntoXZ, b: PuntoXZ, x: number, z: number): number {
  const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  // Con `x` al este y `z` al sur, la derecha del rumbo (dx, dz) es (−dz, dx).
  return ((x - a.x) * -(b.z - a.z) + (z - a.z) * (b.x - a.x)) / l;
}

function aLaRaya(a: PuntoXZ, b: PuntoXZ, x: number, z: number): number {
  const l = Math.hypot(b.x - a.x, b.z - a.z);
  if (l < 0.01) return Math.hypot(x - a.x, z - a.z);
  const t = Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) / (l * l)));
  return Math.hypot(a.x + (b.x - a.x) * t - x, a.z + (b.z - a.z) * t - z);
}

function acotar(v: number, tope: number): number {
  return Math.max(-tope, Math.min(tope, v));
}
