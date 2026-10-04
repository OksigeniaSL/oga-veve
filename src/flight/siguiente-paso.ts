/**
 * **El «¿y ahora qué?»: cada escalón del vuelo dice el siguiente paso.**
 *
 * Llegando a La Palma, Enrique alcanzó la altitud de la ventanilla —1.800
 * pies, a 197 nudos— y nadie dijo nada más: «ni sabía a qué velocidad
 * debería ir ahora». Y lo que pidió después es el principio de todo esto:
 * «se aprende mucho si se dice; yo me estoy enterando ahora de muchas cosas,
 * así que es muy útil ayudar al pequeño piloto y que haya señales (reales) en
 * el cuadro de mandos también».
 *
 * Lo real en cada escalón alcanzado es decir el siguiente paso **con su
 * acción y su objetivo**: subir hasta la altura que dio la torre a la
 * velocidad de subida, el gas de crucero al llegar arriba, bajar en el punto
 * de descenso, frenar a 250 antes de los diez mil pies, a la de maniobra en
 * el área terminal, los flaps por su orden y el tren según se frena, y la
 * senda en la final. Es el orden del manual de cualquier avión de línea
 * —Boeing, FCTM del 737, capítulos «Climb, Cruise, Descent» y «Approach»;
 * Airbus, FCTM «Normal operations»— y el de un avión de escuela con su plan.
 *
 * Había piezas sueltas que decían algo en algunos escalones —la autorización
 * de la torre al subir (`autorizacion-de-altitud.ts`), el aviso del punto de
 * descenso, la escalera de velocidades que mueve la marca sin decir nada
 * (`escalera-de-velocidades.ts`) y la instructora de la bajada, que corrige
 * (`consejo-de-la-bajada.ts`)— y ninguna sabía cuál era el escalón siguiente.
 * **Éste es el único sitio que dice qué toca ahora.** La instructora de la
 * bajada corrige lo que se sale; esto dice adónde se va. Y para que las dos
 * no se pisen, lo que dice esto se le anota a ella como dicho: ver
 * `ConsejoDeLaBajada.anotar`.
 *
 * ## Las reglas
 *
 * 1. **Cada escalón, una vez por tramo.** El que se alcanzó ya se dijo; vuelve
 *    a poder decirse cuando se empieza otro tramo —tocar tierra— o, los de la
 *    llegada, otra aproximación —irse al aire—. Nunca con un reloj: ver la
 *    memoria del proyecto «el reloj no rearma un aviso».
 * 2. **Un paso a la vez.** Si en el mismo instante se alcanzan dos escalones,
 *    se dice el que manda y el otro se da por dicho: es un solo suceso y
 *    lleva una sola voz. Y entre dos pasos seguidos queda un respiro, para
 *    que el primero se vea y se oiga antes de que llegue el segundo.
 * 3. **Lo que se configura, por su orden y una cosa cada vez**: el tren antes
 *    que los flaps que lo acompañan, y los flaps de muesca en muesca. Cada
 *    cosa hecha es un escalón alcanzado, y dice la siguiente.
 * 4. **Antes de los flaps, la velocidad que los aguanta.** Pedir una muesca
 *    por encima de su velocidad máxima es pedir que se rompan: primero se
 *    frena, y la muesca llega cuando cabe. «Flaps por su orden según se
 *    frena» es como lo dijo Enrique, y es como lo dice el manual.
 *
 * Este módulo no habla ni dibuja: decide. Lo que se dice con cada paso, con
 * qué dibujo y con qué frase grabada, lo pone `game.ts`.
 *
 * Solo con plan de vuelo a otro campo: una vuelta al campo la lleva el
 * circuito, que tiene sus propias voces en cada tramo. Ver
 * `flight/la-aproximacion.ts`.
 */

import type { Consejo } from "./consejo-de-la-bajada";
import type { PeldanoDeVelocidad } from "./escalera-de-velocidades";
import { TRAS_DESPEGAR } from "./autorizacion-de-altitud";

/**
 * **Lo que se le pide a quien vuela** en cada paso:
 *
 * - `subir`: hasta la altura de la raya —la ventanilla, o el crucero del
 *   plan—, a la velocidad de la marca.
 * - `acelerar`, `frenar` y `mantener`: la marca cambió de peldaño, y la
 *   velocidad tiene que ir a ella —o ya va—.
 * - `crucero`: arriba, el gas de crucero, hasta la marca del gas.
 * - `bajar`: en el punto de descenso, empezar a bajar por la senda.
 * - `nivelar`: llegando bajando a la altura de la ventanilla, quedarse ahí y
 *   esperar la senda.
 * - `flaps`: una muesca más.
 * - `tren`: el tren abajo.
 * - `recogerAerofrenos`: ya en la marca, los aerofrenos adentro.
 * - `senda`: en la final y configurado, llevar la senda a la marca.
 * - `cota`: empezada la bajada, a qué altura del mar está la pista a la que
 *   se va: lo que queda por bajar es lo que marca el altímetro menos eso.
 */
export type QueHacer =
  | "subir"
  | "acelerar"
  | "frenar"
  | "mantener"
  | "crucero"
  | "bajar"
  | "nivelar"
  | "flaps"
  | "tren"
  | "recogerAerofrenos"
  | "senda"
  | "cota";

/** El objetivo de un paso: lo que se ve en la cabina y a lo que se apunta. */
export interface ObjetivoDelPaso {
  /** La marca de la velocidad, nudos: la de la escalera, siempre. */
  readonly kt: number;
  /** La altitud a la que se va, pies, si el paso va a alguna. */
  readonly pies: number | null;
  /** La muesca de flaps que toca, de 1 a 3, en el paso de los flaps. */
  readonly muesca: number | null;
}

/** Un paso: el escalón alcanzado, lo que hay que hacer y hasta dónde. */
export interface Paso {
  /** El escalón, como clave: «subida», «crucero», «flaps:2», «velocidad:terminal:llegada»… */
  readonly escalon: string;
  readonly que: QueHacer;
  readonly objetivo: ObjetivoDelPaso;
}

/** Lo que la cadena necesita ver del vuelo en cada fotograma. */
export interface LecturaDelPaso {
  readonly enTierra: boolean;
  /** Si hay plan de vuelo a otro campo. Sin plan no hay cadena. */
  readonly conPlan: boolean;
  /** La altura sobre el suelo, pies. */
  readonly sobreElSuelo: number;
  /** La altitud del altímetro, pies. */
  readonly pies: number;
  /** La velocidad vertical, pies por minuto. */
  readonly vertical: number;
  /** La indicada, nudos. */
  readonly kt: number;
  /** La marca de la velocidad, nudos, y su peldaño. Ver `velocidadQueToca`. */
  readonly marca: number;
  readonly peldano: PeldanoDeVelocidad;
  /**
   * **La altura de la raya**, pies: la ventanilla ALT, o el crucero del plan
   * en el avión que no la lleva. `null` si ninguna.
   */
  readonly hasta: number | null;
  /** El crucero del plan, pies. */
  readonly crucero: number | null;
  /** Si el plan ya baja: pasado el punto de descenso. */
  readonly bajando: boolean;
  /** Si se va por la final del plan. */
  readonly enLaFinal: boolean;
  /** La muesca de flaps pedida, de 0 a 3. */
  readonly flaps: number;
  /** La que pide el peldaño. Ver `flapsQuePide`. */
  readonly flapsQuePide: number;
  /** Lo más rápido que aguanta cada muesca sacada, nudos. Ver `vfePorMuesca`. */
  readonly vfe: readonly number[];
  /** El tren: `true` fuera, `false` dentro, `null` en el avión que no lo mete. */
  readonly tren: boolean | null;
  /** Si el peldaño lo pide. Ver `trenQuePide`. */
  readonly trenQuePide: boolean;
  /** Si los aerofrenos están fuera. */
  readonly aerofrenos?: boolean;
  /**
   * **La cota de la pista a la que se va**, pies, o `null` si no se sabe. Ver
   * el paso `cota`.
   */
  readonly cotaDeLaPista?: number | null;
  /** El paso, s. */
  readonly dt: number;
}

/**
 * **Lo que se aparta la velocidad para que haga falta moverla**, nudos.
 *
 * Cinco nudos, que es lo que se ve moverse la aguja de la cinta sin buscarla
 * y lo que se le deja a una velocidad sostenida a mano. Menos que eso es ya ir
 * a la marca: el paso es seguir así.
 */
export const MARGEN_KT = 5;

/**
 * **Por debajo de cuánto de su placa se pide una muesca**, nudos.
 *
 * Cinco por debajo de la VFE: sacarlos justo en el límite es sacarlos en
 * cuanto un bache lo pase. Con la placa de la cinta a la vista, se ve.
 */
export const MARGEN_VFE = 5;

/**
 * **Por debajo de cuánto está una pista «casi a nivel del mar»**, m:
 * cincuenta. Gando, Fuerteventura, Lanzarote, La Palma y El Hierro, sí;
 * Tenerife Sur, a 64, ya hay que restarla, y Los Rodeos, a 632, mucho.
 */
export const CASI_EL_MAR = 50;
const PIE = 0.3048;

/** Nivelado es subir o bajar menos que esto, pies por minuto. */
export const NIVELADO_FPM = 300;

/** Cerca del crucero o de la raya es a menos de esto, pies. */
export const CERCA_DEL_CRUCERO = 300;
export const CERCA_DE_LA_RAYA = 200;

/**
 * **Cuánto tiene que durar nivelado para que sea estar nivelado**, s.
 *
 * Llegar a una altura no es quedarse en ella: se pasa por ella subiendo, y
 * en la captura se cruza a trescientos pies por minuto. Cinco segundos
 * sosteniéndola es estar. No rearma nada: es cuánto tiene que durar una cosa
 * para ser verdad, como el `SOSTENER` de la instructora de la bajada.
 */
export const SOSTENER_NIVELADO = 5;

/**
 * **El respiro entre dos pasos seguidos**, s.
 *
 * El punto de descenso de un reactor que cruza a once mil pies y el tope de
 * los 250 nudos llegan con segundos de diferencia: son dos escalones de
 * verdad y los dos se dicen, pero no uno encima del otro. Cuatro segundos es
 * lo que tarda en decirse una frase de la instructora y en leerse su tarjeta.
 * No es un reloj que vuelva a decir nada: el segundo paso espera su turno, y
 * cada uno se dice una sola vez.
 */
export const ENTRE_PASOS = 4;

/**
 * **Los peldaños de velocidad que son un escalón**: los que cambian por una
 * regla —el tope de los diez mil pies, el área terminal, la aproximación, la
 * final—. La subida, el crucero y el descenso no se dicen como velocidad: los
 * dicen sus propios pasos —`subir`, `crucero`, `bajar`—, que llevan la marca
 * en su objetivo.
 */
const PELDANOS_QUE_SE_DICEN: ReadonlySet<PeldanoDeVelocidad> = new Set<PeldanoDeVelocidad>([
  "bajo-el-100",
  "subida",
  "terminal",
  "primeros-flaps",
  "segundos-flaps",
  "final",
]);

/** Los peldaños de la aproximación: de los primeros flaps a la final. */
const DE_LA_APROXIMACION: ReadonlySet<PeldanoDeVelocidad> = new Set<PeldanoDeVelocidad>([
  "primeros-flaps",
  "segundos-flaps",
  "final",
]);

/**
 * Qué se le pide a la velocidad, mirando la de ahora frente a la marca. Ver
 * `MARGEN_KT`.
 */
export function haciaLaMarca(kt: number, marca: number): "acelerar" | "frenar" | "mantener" {
  if (kt > marca + MARGEN_KT) return "frenar";
  if (kt < marca - MARGEN_KT) return "acelerar";
  return "mantener";
}

/**
 * **La clave del peldaño de velocidad de ahora**, con el lado del vuelo: el
 * tope de los 250 nudos es un escalón subiendo y otro bajando.
 */
function claveDeVelocidad(l: LecturaDelPaso): string {
  return `velocidad:${l.peldano}:${ladoDe(l)}`;
}

/**
 * **De qué lado del vuelo se está**: la salida o la llegada. Los peldaños del
 * área terminal y de la aproximación son de la llegada siempre —la escalera
 * los pone por la distancia a la pista—, aunque no se haya pasado el punto de
 * descenso: quien empezó a bajar antes no lo pasa nunca.
 */
function ladoDe(l: LecturaDelPaso): "salida" | "llegada" {
  return l.bajando || l.enLaFinal || l.peldano === "terminal" || DE_LA_APROXIMACION.has(l.peldano)
    ? "llegada"
    : "salida";
}

/** Los escalones de la llegada: los que vuelven a vivirse tras irse al aire. */
function esDeLaLlegada(escalon: string): boolean {
  return (
    escalon === "tren" ||
    escalon === "nivelar" ||
    escalon === "final" ||
    escalon.startsWith("flaps:") ||
    escalon.startsWith("aerofrenos:") ||
    escalon.endsWith(":llegada")
  );
}

/**
 * **La cadena del vuelo.** Un `paso` por fotograma: devuelve el paso que toca
 * decir **ahora**, o `null`. Ver la cabecera.
 */
export class CadenaDelVuelo {
  /** Los escalones ya alcanzados en este tramo. */
  private readonly dichos = new Set<string>();
  /** Cuánto lleva nivelado, s. */
  private nivelado = 0;
  /** Desde cuándo no se dice ningún paso, s. Empieza abierto. */
  private desdeElUltimo = Infinity;
  /** Lo dicho en este tramo, en orden. Para el banco y las pruebas. */
  private readonly lista: Paso[] = [];

  /** Los pasos dichos en este tramo, en orden. */
  get pasos(): readonly Paso[] {
    return this.lista;
  }

  /** Si ese escalón ya se alcanzó en este tramo. */
  yaDicho(escalon: string): boolean {
    return this.dichos.has(escalon);
  }

  /** Tramo nuevo: todo se vuelve a vivir. */
  reiniciar(): void {
    this.dichos.clear();
    this.lista.length = 0;
    this.nivelado = 0;
    this.desdeElUltimo = Infinity;
  }

  /**
   * **Otra aproximación**, tras irse al aire: la llegada se vuelve a vivir
   * —los flaps, el tren, la final— y lo de antes no. Es lo que pasa en una
   * cabina de verdad: tras la frustrada se recoge, y la siguiente
   * aproximación se configura otra vez paso a paso.
   */
  otraAproximacion(): void {
    for (const e of [...this.dichos]) if (esDeLaLlegada(e)) this.dichos.delete(e);
  }

  paso(l: LecturaDelPaso): Paso | null {
    this.desdeElUltimo += l.dt;
    /*
     * **En tierra, el tramo acaba.** Lo alcanzado se olvida al tocar, y el
     * siguiente despegue empieza de cero. Un rebote en la toma también es
     * tocar: la frustrada de después vuelve a configurarse desde el principio.
     */
    if (l.enTierra) {
      if (this.dichos.size || this.lista.length) this.reiniciar();
      return null;
    }
    if (!l.conPlan) return null;
    this.nivelado = Math.abs(l.vertical) < NIVELADO_FPM ? this.nivelado + l.dt : 0;
    const candidatos = this.candidatos(l);
    if (!candidatos.length) return null;
    if (this.desdeElUltimo < ENTRE_PASOS) return null;
    const elegido = candidatos[0]!;
    /*
     * **Un suceso, una voz**: lo que se alcanzó a la vez que el elegido se da
     * por dicho con él. Menos lo que se configura, que sigue haciendo falta y
     * llega en cuanto se haga lo de antes —regla 3—.
     */
    for (const c of candidatos)
      if (c.que !== "tren" && c.que !== "flaps") this.dichos.add(c.escalon);
    this.dichos.add(elegido.escalon);
    /*
     * Y **todo paso lleva la marca en su objetivo**, así que el peldaño de
     * velocidad de ahora queda dicho con él: el de despegar con la subida, el
     * de la aproximación con sus primeros flaps, el de la final con la senda.
     */
    this.dichos.add(claveDeVelocidad(l));
    this.lista.push(elegido);
    this.desdeElUltimo = 0;
    return elegido;
  }

  /**
   * **Lo que está por decir**, del que más manda al que menos. Ver `paso`.
   *
   * El orden es el de lo que más importa en ese instante: lo que se configura
   * —sin tren no se aterriza—, el punto de descenso, la velocidad nueva, la
   * altura alcanzada y, al final de todo, la senda.
   */
  private candidatos(l: LecturaDelPaso): Paso[] {
    const fuera: Paso[] = [];
    const objetivo = (pies: number | null = null, muesca: number | null = null) => ({
      kt: l.marca,
      pies,
      muesca,
    });
    const nuevo = (escalon: string, que: QueHacer, o: ObjetivoDelPaso): void => {
      if (!this.dichos.has(escalon)) fuera.push({ escalon, que, objetivo: o });
    };
    const deVelocidad = claveDeVelocidad(l);

    // ── Lo que se configura, por su orden ──────────────────────────────
    /*
     * **Los aerofrenos, adentro en cuanto han hecho su trabajo**: con la
     * velocidad ya en la marca, o antes de los segundos flaps, que con ellos
     * fuera no se vuela una final —el manual de Boeing los quiere recogidos
     * antes de configurar para aterrizar—. Es el escalón que sigue a «un poco
     * de aerofrenos, hasta la marca»: llegar a ella.
     */
    if (l.aerofrenos && (l.kt <= l.marca + MARGEN_KT || l.flapsQuePide >= 2))
      nuevo(`aerofrenos:${l.peldano}`, "recogerAerofrenos", objetivo());
    if (l.trenQuePide && l.tren === false) {
      nuevo("tren", "tren", objetivo());
    } else if (l.flaps < l.flapsQuePide) {
      const muesca = Math.min(3, l.flaps + 1);
      const vfe = l.vfe[muesca - 1] ?? Infinity;
      if (l.kt > vfe - MARGEN_VFE) nuevo(deVelocidad, "frenar", objetivo());
      else nuevo(`flaps:${muesca}`, "flaps", objetivo(null, muesca));
    }

    // ── El punto de descenso ───────────────────────────────────────────
    if (l.bajando && !l.enLaFinal) nuevo("descenso", "bajar", objetivo(l.hasta));

    // ── La velocidad nueva ─────────────────────────────────────────────
    /*
     * El primer peldaño del tramo —el de despegar— no se dice como
     * velocidad: lo lleva el paso de subir, con la marca en su objetivo. Ni
     * el de la final, que lo lleva el paso de la senda. Y con flaps por sacar,
     * la velocidad la dice lo que se configura, arriba. Ver
     * `PELDANOS_QUE_SE_DICEN`.
     */
    if (
      PELDANOS_QUE_SE_DICEN.has(l.peldano) &&
      l.peldano !== "final" &&
      l.flapsQuePide <= l.flaps &&
      // Los de la salida, pasado el de subir; los de la llegada, siempre.
      (this.dichos.has("subida") || ladoDe(l) === "llegada")
    )
      nuevo(deVelocidad, haciaLaMarca(l.kt, l.marca), objetivo());

    // ── La altura alcanzada ────────────────────────────────────────────
    if (
      l.bajando &&
      !l.enLaFinal &&
      l.hasta !== null &&
      l.crucero !== null &&
      l.hasta < l.crucero - 1000 &&
      Math.abs(l.pies - l.hasta) < CERCA_DE_LA_RAYA &&
      this.nivelado >= SOSTENER_NIVELADO
    )
      nuevo("nivelar", "nivelar", objetivo(l.hasta));
    if (
      !l.bajando &&
      l.crucero !== null &&
      Math.abs(l.pies - l.crucero) < CERCA_DEL_CRUCERO &&
      this.nivelado >= SOSTENER_NIVELADO
    )
      nuevo("crucero", "crucero", objetivo(l.crucero));
    /*
     * Y subir es de la salida: ya en la aproximación del otro campo no se
     * dice, aunque sea la primera vez que se pasa de mil quinientos pies.
     */
    if (
      !l.bajando &&
      !l.enLaFinal &&
      !DE_LA_APROXIMACION.has(l.peldano) &&
      l.sobreElSuelo >= TRAS_DESPEGAR
    )
      nuevo("subida", "subir", objetivo(l.hasta ?? l.crucero));

    // ── Y la senda, configurado ────────────────────────────────────────
    if (
      l.peldano === "final" &&
      l.flaps >= l.flapsQuePide &&
      !(l.trenQuePide && l.tren === false)
    )
      nuevo("final", "senda", objetivo());

    // ── Y la cota de la pista, cuando no hay nada más que decir ────────
    /*
     * **A qué altura del mar está la pista.** Enrique, en Guyrami: «sigo sin
     * saber la altitud de la pista… ¿cuánto tengo que bajar? ¿Eso no lo sabe
     * el piloto?». Lo sabe, y es lo que mira al empezar a bajar: la cota de la
     * pista, que es lo que se resta del altímetro. Va después del punto de
     * descenso, nunca con él, y la última de la fila: es un dato, no un mando,
     * y no puede llevarse por delante un paso que pide algo.
     */
    if (l.bajando && !l.enLaFinal && l.cotaDeLaPista != null && this.dichos.has("descenso"))
      nuevo("cota", "cota", objetivo(l.cotaDeLaPista));
    return fuera;
  }
}

// ── Lo que se dice con cada paso ──────────────────────────────────────

/**
 * **El mando que pide un paso**, si pide uno: el que se dibuja en la tarjeta
 * y el que se le anota a la instructora de la bajada como dicho.
 */
export type MandoDelPaso =
  | "masGas"
  | "menosGas"
  | "aerofrenos"
  | "narizArriba"
  | "narizAbajo"
  | "flaps"
  | "tren";

/** Cómo va el avión al decir el paso: quién lleva qué, y con qué se frena. */
export interface ComoVa {
  /**
   * **Si la velocidad la lleva otro**: los gases automáticos, o la ayuda del
   * peldaño en la final de Guyrami. Entonces no se le pide el gas a quien
   * vuela: tocarlo lo suelta. Ver `flight/gases-automaticos.ts`.
   */
  readonly gasDelAutomatico: boolean;
  /** Si la altura la lleva el automático. */
  readonly alturaDelAutomatico: boolean;
  /**
   * **Si la velocidad la lleva el morro**: subiendo con el gas de subida en
   * el modelo completo, que es como se sube en cualquier avión —el empuje
   * fijo y la velocidad con el cabeceo, el `FLCH SPD` de Boeing—. Entonces
   * acelerar es bajar un poco la nariz, no meter un gas que ya está puesto.
   */
  readonly velocidadConElMorro: boolean;
  /** Si queda gas que quitar. */
  readonly quedaGas: boolean;
  /** Si lleva aerofrenos y están recogidos. */
  readonly aerofrenos: boolean;
  /**
   * **Si la subida la cuenta la torre**: con control, la autorización de
   * altura ya lleva su voz y la de la instructora detrás —ver
   * `autorizarAltura` en `game.ts`—, y el paso de subir se ve sin decirse.
   */
  readonly conTorre: boolean;
  /**
   * **Hacia dónde está el gas de la marca del motor**, en el crucero: `mas`
   * si hay que subirlo, `menos` si bajarlo y `null` si ya está o no se sabe.
   */
  readonly gasHacia: "mas" | "menos" | null;
  /** Quién lleva el gas en la final, en el peldaño de abajo. Ver la ayuda. */
  readonly gasDeLaFinal: "gases" | "ayuda" | null;
  /**
   * **Si se baja por una senda**: entonces ni el gas al ralentí frena un
   * reactor, y lo que frena son los aerofrenos, lleve el gas quien lo lleve.
   * Es el «DRAG REQUIRED» que escribe el ordenador de un Boeing bajando por
   * su senda con la velocidad por encima de la que toca.
   */
  readonly porLaSenda?: boolean;
  /**
   * **Si al llegar arriba se ofrece el automático**: en los peldaños de abajo,
   * en el avión que lo lleva y no lo tiene puesto. Es lo que haría quien va
   * sentado al lado —«en crucero nadie pilota a mano»—, y el botón late a la
   * vez. Ver `proponerPilotoAutomatico` en `ui/hud.ts`.
   */
  readonly ofreceAutomatico?: boolean;
}

/** Lo que se dice y se dibuja con un paso. */
export interface FraseDelPaso {
  /**
   * **La frase nueva**, que nombra la acción y el objetivo. Sin grabar
   * todavía: ver `PENDIENTE-VOCES-escalones.md`. Se dice en cuanto tenga su
   * grabación; hasta entonces, `grabada`.
   */
  readonly nueva: string;
  /**
   * **La grabada que sirve**, porque pide lo mismo: «Bajá el motor», «Bajá
   * los flaps para frenar», «Sacá el tren», «Empezamos a bajar». `null` si
   * ninguna: entonces el paso se ve —la tarjeta con su dibujo y la señal de la
   * cabina— y la voz calla, que una frase sin grabar es muda en el navegador
   * de quien más juega.
   */
  readonly grabada: string | null;
  /** La palabra corta, para el peldaño que lee una palabra. */
  readonly corta: string;
  /** El dibujo de la tarjeta. Ver `DIBUJOS` en `ui/senal.ts`. */
  readonly dibujo: string;
  /** El mando que se pide, o `null` si el paso no pide ninguno. */
  readonly mando: MandoDelPaso | null;
  /** Si la voz la pone otro y aquí solo se ve. Ver `ComoVa.conTorre`. */
  readonly calla: boolean;
}

/**
 * **Qué se dice y qué se dibuja con cada paso.** Un solo mando por paso, como
 * los consejos de la bajada, y el objetivo que se ve: la marca rosa de la
 * velocidad, la raya de la altura, la marca del motor, la muesca de flaps.
 */
export function comoSeDice(p: Paso, c: ComoVa): FraseDelPaso {
  const sin = { grabada: null, calla: false } as const;
  const velocidad = (hacia: "acelerar" | "frenar" | "mantener"): FraseDelPaso => {
    if (hacia === "mantener")
      return { ...sin, nueva: "vuelo.paso.mantener", corta: "palabra.asi", dibujo: "velocidad", mando: null };
    /*
     * **Bajando por una senda, lo que frena son los aerofrenos**: con el gas
     * al ralentí un reactor no pierde velocidad por una senda de tres grados,
     * lo lleve quien lo lleve. Medido volando el plan entero con el
     * automático: llegaba a la final a doscientos treinta nudos con los gases
     * puestos y nadie que pidiera nada. Ver `scripts/verificar-escalones.mjs`.
     * A mano y con gas que quitar, primero el gas, que es lo que sobra.
     */
    if (hacia === "frenar" && c.porLaSenda && c.aerofrenos && (c.gasDelAutomatico || !c.quedaGas))
      return { ...sin, nueva: "vuelo.paso.frenarAerofrenos", corta: "palabra.aerofrenos", dibujo: "aerofrenos", mando: "aerofrenos" };
    // Con los gases puestos, la marca nueva la siguen ellos: se cuenta y se mira.
    if (c.gasDelAutomatico)
      return {
        ...sin,
        nueva: "vuelo.paso.marcaDelAutomatico",
        corta: "palabra.asi",
        dibujo: "velocidad",
        mando: null,
      };
    if (hacia === "acelerar")
      return c.velocidadConElMorro
        ? { ...sin, nueva: "vuelo.paso.acelerarNariz", corta: "palabra.narizAbajo", dibujo: "nariz-abajo", mando: "narizAbajo" }
        : { ...sin, nueva: "vuelo.paso.acelerarGas", corta: "palabra.masGas", dibujo: "gas-mas", mando: "masGas" };
    if (c.quedaGas)
      return {
        ...sin,
        nueva: "vuelo.paso.frenarGas",
        grabada: "tutor.slow",
        corta: "palabra.menosGas",
        dibujo: "gas-menos",
        mando: "menosGas",
      };
    return c.aerofrenos
      ? { ...sin, nueva: "vuelo.paso.frenarAerofrenos", corta: "palabra.aerofrenos", dibujo: "aerofrenos", mando: "aerofrenos" }
      : { ...sin, nueva: "vuelo.paso.frenarNariz", corta: "palabra.narizArriba", dibujo: "nariz-arriba", mando: "narizArriba" };
  };
  switch (p.que) {
    case "subir":
      return { ...sin, nueva: "vuelo.paso.subir", corta: "palabra.subi", dibujo: "subida", mando: null, calla: c.conTorre };
    case "acelerar":
    case "frenar":
    case "mantener":
      return velocidad(p.que);
    case "crucero": {
      if (c.gasDelAutomatico)
        return { ...sin, nueva: "vuelo.paso.cruceroConGases", corta: "palabra.crucero", dibujo: "crucero", mando: null };
      /*
       * **El gas de crucero, hasta la marca del motor.** Con lo que se sube se
       * suele llegar con gas de más —el de subida—, y «Bajá el motor» es la
       * grabada que pide eso mismo. Si falta, ninguna grabada lo pide sin
       * decir «venís lento», que no es verdad: se ve y se calla.
       */
      const nueva = c.ofreceAutomatico ? "vuelo.paso.cruceroConAutomatico" : "vuelo.paso.crucero";
      return c.gasHacia === "menos"
        ? { ...sin, nueva, grabada: "tutor.slow", corta: "palabra.crucero", dibujo: "gas-menos", mando: "menosGas" }
        : c.gasHacia === "mas"
          ? { ...sin, nueva, corta: "palabra.crucero", dibujo: "gas-mas", mando: "masGas" }
          : { ...sin, nueva, corta: "palabra.crucero", dibujo: "crucero", mando: null };
    }
    case "bajar":
      return c.alturaDelAutomatico
        ? {
            ...sin,
            nueva: "vuelo.paso.bajarConAutomatico",
            grabada: "vuelo.empezamosABajar",
            corta: "palabra.aBajar",
            dibujo: "descenso",
            mando: null,
          }
        : {
            ...sin,
            nueva: "vuelo.paso.bajar",
            grabada: "vuelo.empezamosABajar",
            corta: "palabra.aBajar",
            dibujo: "descenso",
            // Con los gases puestos el gas es suyo, y bajar es la nariz.
            mando: c.gasDelAutomatico ? "narizAbajo" : "menosGas",
          };
    case "nivelar":
      return { ...sin, nueva: "vuelo.paso.nivelar", corta: "palabra.nivela", dibujo: "nivelar", mando: null };
    case "flaps":
      return {
        ...sin,
        nueva: `vuelo.paso.flaps${p.objetivo.muesca ?? 1}`,
        grabada: "vuelo.pediFlaps",
        corta: "palabra.flaps",
        dibujo: "flaps",
        mando: "flaps",
      };
    case "tren":
      return { ...sin, nueva: "vuelo.paso.tren", grabada: "vuelo.sacaElTren", corta: "palabra.tren", dibujo: "tren", mando: "tren" };
    case "recogerAerofrenos":
      return {
        ...sin,
        nueva: "vuelo.paso.recogerAerofrenos",
        corta: "palabra.aerofrenosAdentro",
        dibujo: "aerofrenos-recogidos",
        mando: "aerofrenos",
      };
    /*
     * **La cota de la pista**: «casi a nivel del mar» por debajo de cincuenta
     * metros, que es lo que se ve en el altímetro; y si no, que se reste. El
     * número va en la tarjeta y debajo de la cinta, y la frase no lo lleva,
     * para que valga en cualquier campo.
     */
    case "cota":
      return {
        ...sin,
        nueva:
          (p.objetivo.pies ?? 0) < CASI_EL_MAR / PIE ? "vuelo.paso.cotaAlMar" : "vuelo.paso.cotaEnAlto",
        corta: "palabra.pista",
        dibujo: "cota",
        mando: null,
      };
    case "senda":
      return {
        ...sin,
        nueva:
          c.gasDeLaFinal === "gases"
            ? "vuelo.paso.sendaConGases"
            : c.gasDeLaFinal === "ayuda"
              ? "vuelo.paso.sendaConAyuda"
              : "vuelo.paso.senda",
        corta: "palabra.laSenda",
        dibujo: "senda",
        mando: null,
      };
  }
}

/**
 * **Lo que un paso le deja dicho a la instructora de la bajada**, para que
 * ella no lo repita como consejo: «frená a la marca» es el mismo suceso que
 * el «menos gas, hasta la marca» que diría tres segundos después al ver la
 * velocidad lejos de la marca nueva. Un suceso, una voz. Ver
 * `ConsejoDeLaBajada.anotar`.
 *
 * Bajar en el punto de descenso es empezar a buscar la senda desde arriba:
 * se le anota como «nariz abajo, por ir alto», que es lo que ella diría.
 */
export function consejoDelPaso(p: Paso, mando: MandoDelPaso | null): Consejo | null {
  if (p.que === "bajar") return { accion: "narizAbajo", motivo: "alto" };
  // Recogerlos no frena: es lo contrario, y no es un consejo de velocidad.
  if (p.que === "recogerAerofrenos") return null;
  switch (mando) {
    case "masGas":
      return { accion: "masGas", motivo: "lento" };
    case "menosGas":
      return { accion: "menosGas", motivo: "rapido" };
    case "aerofrenos":
    case "flaps":
      return { accion: "frenar", motivo: "rapido" };
    case "narizArriba":
      return { accion: "narizArriba", motivo: "rapido" };
    default:
      return null;
  }
}
