/**
 * Sin motor: **otro vuelo**, con sus propias reglas.
 *
 * Se acabó el combustible en el aire, el motor se paró y el juego seguía
 * volando como si nada: la instructora pedía gas —«venís lento: metéle gas»—
 * a un avión que no tiene motor, la torre podía mandarlo al aire y el sorteo
 * de frustradas seguía tirando. Contado jugando, tras llegar planeando a Gando
 * con el de fuselaje ancho: «estuvo divertido, pero ¿cómo es que la
 * instructora me dice que acelere, que voy despacito?». Y la idea buena venía
 * detrás: «si estoy sin combustible estoy en otro modo de vuelo».
 *
 * Lo es. Un avión sin motor hace tres cosas, y las tres son las de un manual
 * de verdad para un fallo de motor:
 *
 * 1. **Vuela a la velocidad de mejor planeo.** Es la que más lejos lleva por
 *    cada metro que se baja. Más despacio no se estira el planeo: se acorta,
 *    y por debajo está la pérdida. La velocidad no sale del gas, sale de la
 *    nariz.
 * 2. **Va a la pista más cercana a la que se llega planeando**, no a la del
 *    plan. El destino se decidió con motor; sin él, manda la altura.
 * 3. **Aterriza.** Sin motor no hay frustrada: nadie manda al aire a un avión
 *    que no puede subir, y la torre le da prioridad y la pista que pida.
 *
 * Aquí están las cuentas de las dos primeras, sin three.js y sin el juego,
 * para poder comprobarlas. Lo que se dice y se ve por peldaño lo pone el
 * juego —ver `Game.quedarseSinMotor`—, con la misma calma de siempre: ni
 * pantalla roja, ni música de miedo. No es una alarma, es una maniobra.
 */

import { masaDe, type AircraftConfig } from "./aircraft";
import { SEA_LEVEL_DENSITY } from "./atmosphere";
import type { CampoDelVuelo } from "./alterno";
import type { BandaDeVelocidad } from "./velocidad-de-aproximacion";

const G = 9.81;

/** El planeo de un avión: a qué velocidad y cuánto avanza. */
export interface Planeo {
  /**
   * La velocidad de mejor planeo, **indicada**, m/s.
   *
   * Indicada y no verdadera porque es la que sale de la aerodinámica —depende
   * de la presión dinámica, no de la densidad a secas— y por eso es la misma a
   * cualquier altura en el anemómetro. Es la que viene escrita en una ficha y
   * la que se mira en cabina.
   */
  readonly velocidad: number;
  /**
   * La fineza máxima: cuántos metros se avanza por cada metro que se baja.
   *
   * Es la sustentación dividida por la resistencia en su mejor punto, y el
   * número que dice de un avión cómo planea. Un velero pasa de cuarenta; una
   * avioneta de escuela anda por diez; uno de línea, por diecisiete.
   */
  readonly fineza: number;
}

/**
 * El planeo de este avión, **sacado de su propia polar**.
 *
 * La resistencia de la ficha es la de siempre, `cd0 + cl²/(π·A·e)`: una
 * parte que no depende de la sustentación y otra que crece con su cuadrado.
 * La mejor fineza está donde las dos valen lo mismo —ahí la suma es mínima
 * para lo que se sostiene—, y de ahí salen las dos cifras sin inventar
 * ninguna: la sustentación de mejor planeo es `√(cd0·π·A·e)`, la velocidad es
 * la que da esa sustentación con el peso del avión, y la fineza es
 * `½·√(π·A·e / cd0)`.
 *
 * Contrastado con los aviones de verdad de cada clase: el JAZ 20 sale a 74
 * nudos y fineza 12 —una avioneta de escuela planea a unos 65-70 y fineza 9—;
 * el JAZ 90, a 193 y fineza 17, que es el «punto verde» de un birreactor de
 * pasillo único; y el JAZ 120 a 236 y 16, lo de un cuatrimotor grande.
 */
export function planeoDe(
  avion: Pick<AircraftConfig, "mass" | "masaDeAhora" | "wingArea" | "wingSpan"> & {
    readonly aero: Pick<AircraftConfig["aero"], "cd0" | "oswald">;
  },
): Planeo {
  const alargamiento = (avion.wingSpan * avion.wingSpan) / avion.wingArea;
  // El factor de la resistencia inducida: `cdi = k·cl²`.
  const k = 1 / (Math.PI * alargamiento * avion.aero.oswald);
  const sustentacion = Math.sqrt(avion.aero.cd0 / k);
  return {
    velocidad: Math.sqrt(
      // Con lo que pesa ahora: la de mejor planeo va con la raíz del peso, y
      // con los depósitos casi vacíos es algo más lenta.
      (2 * masaDe(avion) * G) /
        (SEA_LEVEL_DENSITY * avion.wingArea * sustentacion),
    ),
    fineza: 1 / (2 * Math.sqrt(avion.aero.cd0 * k)),
  };
}

/**
 * Con qué altura sobre el campo hay que llegar a él, m.
 *
 * Trescientos metros, mil pies: lo que se pide para empezar un circuito sin
 * motor. Llegar a la vertical de la pista a ras de suelo no es llegar: hace
 * falta altura para dar la vuelta y ponerse en final.
 */
export const ALTURA_PARA_ENTRAR = 300;

/**
 * Qué parte de la fineza se cuenta, para no apostar lo que no se tiene.
 *
 * Dos tercios. La fineza de la ficha es la de aire en calma y en línea recta,
 * con el avión limpio y la velocidad clavada; virar, el viento de cara y la
 * nariz que baila se comen el resto. Es el margen con el que se enseña a
 * elegir campo en un fallo de motor: si con dos tercios no llega, no llega.
 */
export const MARGEN_DEL_PLANEO = 2 / 3;

/** Hasta dónde se llega planeando con esta altura sobre el campo, m. */
export function alcanceDelPlaneo(planeo: Planeo, alto: number): number {
  return Math.max(0, alto - ALTURA_PARA_ENTRAR) * planeo.fineza * MARGEN_DEL_PLANEO;
}

/** Un campo del vuelo con la cota de su pista, m. */
export interface CampoConCota extends CampoDelVuelo {
  readonly cota: number;
}

/**
 * **A qué pista se va sin motor**: la más cercana a la que se llega.
 *
 * No la más cercana a secas, que es la cuenta de la reserva —ver
 * `aDondeConLaReserva`—: sin motor la distancia no basta, cuenta la altura.
 * Un campo más cerca pero en una meseta a seiscientos metros —Los Rodeos—
 * puede quedar fuera de alcance, y uno más lejos a nivel del mar, dentro.
 *
 * Si no se llega a ninguno, el que menos falta, y `llega` lo dice. No se
 * cambia lo que se dice por eso: la instructora sigue señalando esa pista con
 * calma, porque es la mejor apuesta que hay y dudar es peor que apostar.
 */
export function pistaDelPlaneo<C extends CampoConCota>(
  x: number,
  z: number,
  altura: number,
  campos: readonly C[],
  planeo: Planeo,
): { readonly campo: C; readonly llega: boolean } | null {
  let cerca: C | null = null;
  let masCerca = Infinity;
  let menosFalta: C | null = null;
  let loQueFalta = Infinity;
  let elMasCercano: C | null = null;
  let loMasCerca = Infinity;
  for (const c of campos) {
    const d = Math.hypot(c.x - x, c.z - z);
    const alcance = alcanceDelPlaneo(planeo, altura - c.cota);
    if (d <= alcance && d < masCerca) {
      masCerca = d;
      cerca = c;
    }
    // Cuántas veces el alcance hay que recorrer: por debajo de uno, se llega.
    const veces = alcance > 0 ? d / alcance : Infinity;
    if (veces < loQueFalta) {
      loQueFalta = veces;
      menosFalta = c;
    }
    if (d < loMasCerca) {
      loMasCerca = d;
      elMasCercano = c;
    }
  }
  if (cerca) return { campo: cerca, llega: true };
  // Y sin altura para ninguno, el que está más cerca: ahí ya no hay cuenta.
  const mejor = menosFalta ?? elMasCercano;
  return mejor ? { campo: mejor, llega: false } : null;
}

/**
 * Por debajo de qué parte de la de mejor planeo se va lento.
 *
 * La fineza a una fracción `u` de la velocidad de mejor planeo es
 * `2 / (u² + 1/u²)` de la máxima. Al ochenta y cinco por ciento se pierde un
 * cinco por ciento del alcance, y por debajo la curva cae deprisa y se acerca
 * la pérdida: ahí ya no es afinar, es ir mal.
 */
export const LENTO_EN_PLANEO = 0.85;

/**
 * Y por encima de cuál, rápido. Al ciento veinte por ciento se pierde un seis:
 * la curva es más plana por arriba, y por eso el margen es más ancho.
 */
export const RAPIDO_EN_PLANEO = 1.2;

/** En qué banda va la velocidad de planeo. `indicada` en m/s. */
export function bandaDePlaneo(
  indicada: number,
  planeo: Planeo,
): "lento" | "bien" | "rapido" {
  if (indicada < planeo.velocidad * LENTO_EN_PLANEO) return "lento";
  if (indicada > planeo.velocidad * RAPIDO_EN_PLANEO) return "rapido";
  return "bien";
}

/** Qué banda manda sin motor, y de cuál de las dos cuentas sale. */
export interface BandaSinMotor {
  readonly banda: BandaDeVelocidad;
  /**
   * `planeo`, lejos de la pista: la de mejor planeo. `aproximacion`, ya en
   * final o en el suelo: la de siempre, que es la de tomar tierra.
   */
  readonly de: "planeo" | "aproximacion";
}

/**
 * **La velocidad que se pide sin motor**, y hasta dónde.
 *
 * Hasta estar en final, la de mejor planeo: es la que lleva más lejos, y
 * volar más despacio que ella para «ahorrar» es la trampa clásica de un fallo
 * de motor —se estira la nariz, se pierde velocidad y el avión cae antes—.
 * Ya en final, con la pista hecha, la de aproximación de siempre, que es la
 * de posarse. En el suelo, la de rodar.
 *
 * La banda de aproximación mira solo la altura y si se baja, y sin motor se
 * baja siempre: por debajo de cuatrocientos metros juzgaba a doscientos
 * treinta nudos un planeo a diez kilómetros de la pista y decía «rápido». Por
 * eso aquí manda estar en final, no estar bajo.
 */
export function bandaSinMotor(s: {
  readonly enElSuelo: boolean;
  /** Si viene alineado por el embudo de final de alguna de las dos cabeceras. */
  readonly enFinal: boolean;
  /** La banda de siempre, la de `bandaDeAhora`. */
  readonly deSiempre: BandaDeVelocidad;
  /** La indicada, m/s. */
  readonly indicada: number;
  readonly planeo: Planeo;
}): BandaSinMotor {
  if (s.enElSuelo || s.enFinal)
    return { banda: s.deSiempre, de: "aproximacion" };
  return { banda: bandaDePlaneo(s.indicada, s.planeo), de: "planeo" };
}

/**
 * Qué dice la instructora de la velocidad sin motor, o `null` si lo de
 * siempre ya vale.
 *
 * **Lento es bajar la nariz, nunca meter gas.** No hay gas que meter: la
 * velocidad sin motor sale de cambiar altura por velocidad. Y rápido lejos de
 * la pista es levantarla un poco, que así se llega más lejos; rápido en final
 * es lo de siempre —los flaps, la resistencia—, y eso ya lo dice el juego.
 */
export function queSeDiceSinMotor(
  b: BandaSinMotor,
  enElSuelo: boolean,
): "vuelo.planeoLento" | "vuelo.planeoRapido" | null {
  if (enElSuelo) return null;
  if (b.banda === "lento") return "vuelo.planeoLento";
  if (b.banda === "rapido" && b.de === "planeo") return "vuelo.planeoRapido";
  return null;
}
