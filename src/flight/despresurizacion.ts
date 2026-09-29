/**
 * La despresurización y el descenso de emergencia: **un procedimiento**, no un
 * susto.
 *
 * Se va el aire de la cabina a once mil metros. Lo que pasa después es de las
 * cosas mejor ensayadas de la aviación, y se ensaya exactamente así, en un
 * simulador, cada pocos meses:
 *
 * 1. **Suena el aviso de altitud de cabina** al pasar de diez mil pies, con la
 *    luz roja. En los aviones que lo llevan, con voz.
 * 2. **Caen las máscaras** del pasaje al pasar de catorce mil, solas.
 * 3. **Máscara primero la tuya.** Es la norma menos intuitiva del cartel de
 *    seguridad y la que mejor se entiende con un número: a altura de crucero,
 *    después de una despresurización rápida, quedan **entre quince y treinta
 *    segundos** de conciencia útil. Quien se desmaya ayudando no ayuda a nadie.
 * 4. **Y abajo, deprisa**: gas al ralentí, aerofrenos fuera, morro abajo y a
 *    la velocidad máxima, hasta diez mil pies o la mínima del sector si es más
 *    alta, declarando la emergencia. Es lo contrario de lo que parece prudente
 *    —el instinto dice bajar despacio— y es lo correcto: cada minuto arriba es
 *    un minuto sin aire.
 *
 * Son los puntos de memoria de verdad. Los del E-175 ante un CABIN ALT HI:
 * máscaras de la tripulación, comunicación, diez mil pies o la mínima si es
 * más alta, gas al ralentí, aerofrenos del todo, velocidad máxima, 7700 y
 * avisar al control.
 *
 * Sin drama y sin heridos: suena, se hace y se llega. Aquí están las cuentas y
 * el orden de lo que pasa, sin three.js y sin el juego, para poder
 * comprobarlas; lo que se dice y se ve lo pone el juego —ver
 * `Game.despresurizar`— con la calma de siempre.
 *
 * ## Y cómo se engancha a los ejercicios
 *
 * No llega nunca por sorpresa: es un ejercicio que se elige. Ver
 * `EJERCICIO_DE_DESPRESURIZACION` al final.
 */

import type { AircraftConfig } from "./aircraft";
import type { TierId } from "./tiers";
import { AIRE_ESTANDAR, type Aire, indicatedAirspeed, velocidadDelSonido } from "./atmosphere";
import { type Estado, mandosPara, memoriaNueva } from "./piloto-automatico";

const PIE = 0.3048;
const NUDO = 0.514444;

/**
 * Cuando salta el aviso de altitud de cabina, m: diez mil pies.
 *
 * Es el que pide la norma de los aviones de transporte (CS 25.841 y 14 CFR
 * 25.841) y el que llevan el 737 y la familia de Embraer —el E-170 lo enciende
 * a nueve mil setecientos, un pelo antes—.
 */
export const AVISO_DE_CABINA = 10000 * PIE;

/**
 * Cuando caen las máscaras del pasaje, m: catorce mil pies. Solas, sin que
 * nadie toque nada: lo dicen los manuales de la familia de Embraer y es lo
 * habitual en los de línea.
 */
export const CAEN_LAS_MASCARAS = 14000 * PIE;

/**
 * Hasta dónde se baja, m: diez mil pies, **o la mínima del sector si es más
 * alta**. Ahí el aire da para respirar sin máscara, y por eso es también la
 * altura del aviso.
 */
export const DONDE_SE_RESPIRA = 10000 * PIE;

/**
 * Cuánto antes de la altura segura se da por llegado, m: trescientos pies,
 * que es cuando se empieza a nivelar.
 */
export const LLEGANDO = 300 * PIE;

/**
 * Lo más bajo a lo que se ofrece el ejercicio, m: siete mil metros, unos
 * veintitrés mil pies. Más abajo la cabina apenas pasa del aviso y no hay
 * nada que ensayar.
 */
export const ALTURA_DEL_EJERCICIO = 7000;

/**
 * **El tiempo de conciencia útil** después de una despresurización rápida:
 * de la tabla de la FAA (AC 61-107B, figura 2-3), que es la que se enseña en
 * cualquier curso de fisiología de vuelo. En pies y en segundos.
 *
 * Es el rato en que alguien sin oxígeno todavía puede hacer algo con sentido,
 * no el que tarda en desmayarse. Y es la mitad del de una subida lenta: con
 * la despresurización rápida el aire se va de los pulmones de golpe.
 */
const CONCIENCIA: readonly (readonly [number, number, number])[] = [
  [18000, 600, 900],
  [22000, 300, 300],
  [25000, 90, 210],
  [28000, 75, 90],
  [30000, 30, 60],
  [35000, 15, 30],
  [40000, 7, 10],
  [43000, 5, 6],
  [50000, 5, 5],
];

/**
 * El tiempo de conciencia útil a esta altura, en segundos: el menos y el más
 * que da la tabla, entre filas en línea recta. Por debajo de la primera fila
 * hay más de diez minutos, y se dan como diez y quince.
 */
export function concienciaUtil(altura: number): { readonly min: number; readonly max: number } {
  const pies = altura / PIE;
  const primera = CONCIENCIA[0]!;
  if (pies <= primera[0]) return { min: primera[1], max: primera[2] };
  for (let i = 1; i < CONCIENCIA.length; i++) {
    const [p1, a1, b1] = CONCIENCIA[i]!;
    if (pies > p1) continue;
    const [p0, a0, b0] = CONCIENCIA[i - 1]!;
    const f = (pies - p0) / (p1 - p0);
    return { min: a0 + (a1 - a0) * f, max: b0 + (b1 - b0) * f };
  }
  const ultima = CONCIENCIA.at(-1)!;
  return { min: ultima[1], max: ultima[2] };
}

/**
 * **Cómo se cuenta ese tiempo en voz**, que no lee una tabla: tres frases, y
 * cada una verdad en su franja.
 *
 * - `segundos`: medio minuto o menos, de treinta y dos mil quinientos pies
 *   para arriba —el crucero de los dos reactores—.
 * - `minuto`: más o menos un minuto, entre veintiséis mil quinientos y
 *   treinta y dos mil quinientos.
 * - `minutos`: unos pocos minutos, por debajo: el crucero del turbohélice.
 */
export function comoSeDiceLaConciencia(altura: number): "segundos" | "minuto" | "minutos" {
  const pies = altura / PIE;
  if (pies >= 32500) return "segundos";
  if (pies >= 26500) return "minuto";
  return "minutos";
}

/**
 * **Hasta dónde bajar**, m: diez mil pies o la mínima del sector si es más
 * alta, redondeado a los cien pies de arriba, que es como se pone en la
 * ventanilla.
 *
 * `minima` es la altitud mínima en ruta de lo que se tiene delante —ver
 * `minimaEnRuta` en `ruta.ts`—, o `null` si no se sabe nada del suelo. Entre
 * las islas del oeste, con el Teide, sale por encima de trece mil pies: allí
 * no se baja a diez mil, porque diez mil pies en Tenerife es dentro del monte.
 */
export function alturaSegura(minima: number | null): number {
  const alto = Math.max(DONDE_SE_RESPIRA, minima ?? 0);
  return Math.ceil(alto / PIE / 100 - 1e-9) * 100 * PIE;
}

/** Lo que hace falta de un avión para saber a qué velocidad baja. */
export type AvionQueBaja = Pick<
  AircraftConfig,
  "vmoKt" | "mmo" | "aerofrenos" | "vleKt" | "trenRetractil"
>;

/** El margen por debajo de los topes al que se baja, en nudos y en Mach. */
const MARGEN_KT = 10;
const MARGEN_MACH = 0.02;

/**
 * **A qué velocidad se baja**, indicada, m/s: la máxima, con un margen.
 *
 * Es «la velocidad máxima o la apropiada» de los puntos de memoria: la Vmo
 * abajo y el Mmo arriba, lo que llegue antes, con diez nudos y dos centésimas
 * de margen para no rozar el aviso. Cuanto más deprisa se va, más aire pasa y
 * más se baja por cada metro que se avanza.
 *
 * **Y el que no lleva aerofrenos baja con el tren fuera**, que es lo que
 * frena en su lugar: entonces manda el tope del tren. Es el descenso de
 * emergencia de un turbohélice de esa clase.
 */
export function velocidadDelDescenso(
  avion: AvionQueBaja,
  altura: number,
  aire: Aire = AIRE_ESTANDAR,
): number {
  const porVmo = (avion.vmoKt - MARGEN_KT) * NUDO;
  const porMmo = indicatedAirspeed(
    (avion.mmo - MARGEN_MACH) * velocidadDelSonido(altura, aire),
    altura,
    aire,
  );
  const conTren =
    avion.aerofrenos === null && avion.trenRetractil
      ? (avion.vleKt - MARGEN_KT) * NUDO
      : Infinity;
  return Math.min(porVmo, porMmo, conTren);
}

/**
 * **Cómo vuela el descenso una tripulación**, para los bancos y las pruebas:
 * el gas al ralentí y los aerofrenos los pone quien lo usa; esto lleva el
 * morro.
 *
 * Es lo que hace un automático de verdad en un cambio de nivel: **la
 * velocidad con el morro**. Si se va lento, más empinado; si rápido, menos.
 * El morro lo mueve el piloto automático del juego, con sus topes de carga —
 * ver `piloto-automatico.ts`—, al que se le pide un ritmo de bajada en vez de
 * una altura. No lo usa el juego: quien vuela el ejercicio es quien juega.
 */
export class PilotoDelDescenso {
  private readonly memoria = memoriaNueva();
  private integral = 0;

  constructor(private readonly avion: AvionQueBaja) {}

  /** El timón y el alerón de este paso, sosteniendo el rumbo `rumbo`. */
  mandos(
    e: Estado,
    rumbo: number,
    dt: number,
    aire: Aire = AIRE_ESTANDAR,
  ): { readonly elevator: number; readonly aileron: number } {
    const falta = velocidadDelDescenso(this.avion, e.altitud, aire) - e.velocidad;
    this.integral = Math.max(-400, Math.min(400, this.integral + falta * dt));
    const ritmo = Math.max(-80, Math.min(0, -(2 * falta + 0.06 * this.integral)));
    const r = mandosPara(
      e,
      { rumbo, altitud: e.altitud, velocidad: null, ritmo },
      dt,
      this.memoria,
    );
    return { elevator: r.elevator, aileron: r.aileron };
  }
}

/** Lo que pasa en el ejercicio, en el orden en que pasa. */
export type SucesoDelDescenso = "aviso" | "mascaras" | "abajo";

/** Lo que el ejercicio necesita saber en cada paso. */
export interface LecturaDelDescenso {
  /** El reloj del juego, s. */
  readonly t: number;
  /** La altitud de cabina, m. Ver `cabina-presurizada.ts`. */
  readonly cabina: number;
  /** La altura del avión, m. */
  readonly altura: number;
}

/**
 * **El ejercicio, de la despresurización a la altura segura.**
 *
 * Dice qué acaba de pasar —una vez cada cosa, y en su orden— y guarda cuándo,
 * que es lo que se enseña al final: cuánto se tardó en llegar a donde se
 * respira. El reloj no rearma nada: un suceso vuelve porque vuelve a pasar,
 * no porque pase un rato.
 */
export class DescensoDeEmergencia {
  /** Cuando se fue el aire, s. */
  readonly desde: number;
  /** A qué altura estaba el avión entonces, m. */
  readonly alturaAlEmpezar: number;
  /** Hasta dónde hay que bajar, m. Ver `alturaSegura`. */
  readonly objetivo: number;
  /** Cuando sonó el aviso, cayeron las máscaras y se llegó, s. */
  avisoEn: number | null = null;
  mascarasEn: number | null = null;
  abajoEn: number | null = null;

  constructor(o: { readonly t: number; readonly altura: number; readonly objetivo: number }) {
    this.desde = o.t;
    this.alturaAlEmpezar = o.altura;
    this.objetivo = o.objetivo;
  }

  /** Si ya se llegó a la altura segura. */
  get terminado(): boolean {
    return this.abajoEn !== null;
  }

  /** Lo que se tardó desde que se fue el aire hasta llegar abajo, s. */
  get segundos(): number | null {
    return this.abajoEn === null ? null : this.abajoEn - this.desde;
  }

  /** Lo que pasó en este paso, si pasó algo. Uno por paso, en su orden. */
  paso(l: LecturaDelDescenso): SucesoDelDescenso | null {
    if (this.avisoEn === null) {
      if (l.cabina <= AVISO_DE_CABINA) return null;
      this.avisoEn = l.t;
      return "aviso";
    }
    if (this.mascarasEn === null && l.cabina > CAEN_LAS_MASCARAS) {
      this.mascarasEn = l.t;
      return "mascaras";
    }
    if (this.abajoEn === null && l.altura <= this.objetivo + LLEGANDO) {
      this.abajoEn = l.t;
      return "abajo";
    }
    return null;
  }
}

/**
 * **El ejercicio, listo para el marco de ejercicios de emergencia.**
 *
 * Todo lo que un selector necesita saber para ofrecerlo, sin saber nada de
 * cómo se juega:
 *
 * - **En qué peldaños**: Taguató y Taguató Ruvichá, los dos de arriba, que es
 *   donde el #90 pone las emergencias y donde el #89 pone esta. En Taguató
 *   con la instructora contándolo todo —qué ha sonado, por qué la máscara
 *   primero, qué se hace—; en Taguató Ruvichá, como en un chequeo de verdad:
 *   la luz, la voz de la caja si el avión la lleva, la megafonía y la
 *   tarjeta. En Guyrami y en Tukã, no: el #90 no pone ninguna emergencia en
 *   el primero, y en el segundo solo el motor parado.
 * - **En qué aviones**: los presurizados. En uno sin presurizar no hay aire
 *   que perder.
 * - **Cuándo**: en vuelo y por encima de siete mil metros. El selector lo
 *   ofrece antes de despegar y el juego lo dispara al llegar arriba, o se
 *   dispara ya si se elige volando.
 * - **Cómo**: `Game.despresurizar()`, que devuelve si pudo. Lo que pasa
 *   después lo lleva el juego solo, y cómo fue lo dice
 *   `Game.descensoDeEmergencia`: `segundos` hasta llegar, `terminado`.
 */
export const EJERCICIO_DE_DESPRESURIZACION = {
  id: "despresurizacion",
  /** El nombre, para el selector. Clave de i18n. */
  clave: "ejercicio.despresurizacion",
  /** El dibujo, para quien no lee. Ver `DIBUJOS` en `ui/senal.ts`. */
  dibujo: "mascara",
  peldanos: ["taguato", "taguato-ruvicha"] as const satisfies readonly TierId[],
  sirveEn: (avion: Pick<AircraftConfig, "presurizacion">): boolean =>
    avion.presurizacion !== null,
  sePuedeDisparar: (e: { readonly enTierra: boolean; readonly altura: number }): boolean =>
    !e.enTierra && e.altura >= ALTURA_DEL_EJERCICIO,
} as const;
