/**
 * **El tiempo de antes de salir, y la decisión de si hoy se sale.**
 *
 * El punto 129 de la lista de Enrique: «mirar el tiempo antes con dibujos y a
 * veces decidir que hoy no. Renunciar es ganar, antes de arrancar». Y dijo de
 * él lo mismo que de la vuelta al avión: «son genialidades, apuntá todo eso».
 *
 * Es la otra mitad de la frustrada. La frustrada enseña a irse cuando la
 * aproximación no sale; esto enseña la decisión que va antes de todas, la de
 * no despegar. En aviación tiene nombre —la decisión de salir, *go / no go*—
 * y se toma en tierra, con el parte de la salida y el de la llegada delante,
 * comparando lo que dice el cielo con lo que ese avión aguanta.
 *
 * ## Lo que se mira
 *
 * Lo mismo que mira quien vuela, con los números de verdad de cada clase:
 *
 * - **El viento cruzado**, con las rachas dentro, contra el demostrado de ese
 *   avión. Ver `flight/viento-cruzado.ts`.
 * - **La tormenta encima del campo**: el `TS` del METAR, no el `VCTS` de las
 *   cercanías. A una tormenta no se entra, y menos despegando debajo de ella.
 * - **La visibilidad y el techo de nubes**, contra los mínimos de su clase:
 *   los del vuelo visual para las avionetas, los de una aproximación de
 *   precisión para los que vuelan por instrumentos. Ver `MINIMOS`.
 *
 * Y en **los dos campos**, el de salida y el de llegada: salir con buen tiempo
 * hacia un campo cerrado es salir a dar la vuelta.
 *
 * ## Y lo que no hace
 *
 * No prohíbe nada. Propone. Quien quiera salir, sale, y ve lo que hay: es la
 * regla de la casa, «las normas se muestran, no se imponen». Esto es lógica
 * pura: no dibuja, no habla y no sabe del juego.
 */

import type { AircraftConfig } from "./aircraft";
import { margenDeSuClase } from "./carrera";
import { CRUZADO_DEMOSTRADO, cruzadoDemostrado } from "./viento-cruzado";
import type { Lluvia, Meteo } from "../world/meteo";

/** Un pie, en metros. */
const PIE = 0.3048;

/**
 * **Los mínimos de cada clase de vuelo**, en metros.
 *
 * - **Visual**: no se despega ni se aterriza en un aeródromo con zona de
 *   control si el techo está por debajo de 450 m (1.500 ft) o la visibilidad
 *   en tierra por debajo de 5 km. Es la regla del vuelo visual de la OACI,
 *   Anexo 2, 4.2, y la misma en Europa (SERA.5005). Las avionetas del juego
 *   vuelan así: ver `reglasDeVuelo` en `aircraft.ts`.
 * - **Instrumentos**: los de una aproximación de precisión de categoría I,
 *   doscientos pies de altura de decisión y 550 m de alcance visual en pista
 *   (OACI, Anexo 6 y Doc 9365). Son los de llegada, y se miran también en la
 *   salida: si al despegar pasa algo hay que poder volver a aterrizar ahí, y
 *   el que no puede necesita un alternativo de despegue que este juego no
 *   tiene. Los doscientos pies son la `ALTURA_DE_DECISION` de `minimos.ts`.
 */
export const MINIMOS: Readonly<
  Record<AircraftConfig["reglasDeVuelo"], { readonly visibilidad: number; readonly techo: number }>
> = {
  visual: { visibilidad: 5000, techo: 1500 * PIE },
  instrumentos: { visibilidad: 550, techo: 200 * PIE },
};

/** Lo que este avión aguanta, junto: lo que se compara con el parte. */
export interface Limites {
  /** Viento cruzado demostrado, nudos. */
  readonly cruzadoKt: number;
  /**
   * **De dónde sale ese viento cruzado**: `demostrado`, el que su manual dice
   * que se probó en su certificación; `norma`, el mínimo que la norma le exige
   * haber probado, cuando el manual no se ha podido leer. Ver
   * `cruzadoDemostrado`.
   */
  readonly cruzadoDe: "demostrado" | "norma";
  /** Visibilidad mínima, m. */
  readonly visibilidadM: number;
  /** Techo mínimo sobre el campo, m. */
  readonly techoM: number;
  /** Con qué reglas vuela, que es de donde salen sus mínimos. Ver `MINIMOS`. */
  readonly reglas: AircraftConfig["reglasDeVuelo"];
  /** El margen de su clase sobre la distancia de despegue. Ver `margenDeSuClase`. */
  readonly margen: "escuela" | "certificacion";
}

export function limitesDe(a: AircraftConfig): Limites {
  const m = MINIMOS[a.reglasDeVuelo];
  const cruzado = cruzadoDemostrado(a);
  return {
    cruzadoKt: cruzado.kt,
    cruzadoDe: CRUZADO_DEMOSTRADO[a.id] ? "demostrado" : "norma",
    visibilidadM: m.visibilidad,
    techoM: m.techo,
    reglas: a.reglasDeVuelo,
    margen: margenDeSuClase(a).fuente,
  };
}

/** Un campo, como lo necesita el parte. */
export interface CampoDelParte {
  /** El indicativo OACI, que es como se pide su METAR. */
  readonly oaci: string;
  /** El número de la cabecera en uso, si se sabe. */
  readonly pista: string | null;
  /** El rumbo verdadero de la cabecera en uso, grados. */
  readonly rumbo: number;
  /** El tiempo de hoy en ese campo. */
  readonly meteo: Meteo;
  /**
   * **La pista de hoy**, solo en el de salida: la que hay entera y la que este
   * avión necesita hoy para despegar con su margen. Ver `pistaNecesariaHoy`.
   */
  readonly pistaDeHoy?: { readonly hay: number; readonly necesita: number };
}

/**
 * Por qué no conviene salir. `pista`: hoy este avión no despega con margen
 * ni con la pista entera —calor, cota o viento de cola—.
 */
export type Motivo = "cruzado" | "tormenta" | "visibilidad" | "techo" | "pista";

/** El parte de un campo, ya leído contra un avión. */
export interface ParteDeUnCampo {
  readonly papel: "salida" | "llegada";
  readonly campo: CampoDelParte;
  /**
   * De dónde viene el viento **respecto a la pista**, grados: cero de frente,
   * noventa por la derecha, menos noventa por la izquierda, ciento ochenta de
   * cola. `null` en calma o variable. Es lo que dibuja la flecha de la
   * tarjeta, que va pintada sobre la pista y no sobre el norte.
   */
  readonly relativo: number | null;
  /** El viento de costado, nudos, con las rachas dentro. Siempre positivo. */
  readonly cruzadoKt: number;
  /** El de frente, nudos; negativo es de cola. */
  readonly deFrenteKt: number;
  /** La fuerza que se compara: la racha si la hay, si no el viento medio. */
  readonly fuerzaKt: number;
  readonly lluvia: Lluvia;
  readonly tormentaEncima: boolean;
  /** Lo que pasa del límite de este avión, en el orden en que se diría. */
  readonly pasa: readonly Motivo[];
}

/** Grados entre −180 y 180. */
const aLaMitad = (g: number): number => ((((g + 180) % 360) + 360) % 360) - 180;

/**
 * El parte de un campo leído contra lo que aguanta un avión.
 *
 * **El orden de los motivos es el de lo que más pesa**: la tormenta primero,
 * que no se discute; después lo que no se ve —visibilidad y techo—, y el
 * viento al final, que es el único que se puede esperar a que amaine en un
 * rato.
 */
export function parteDe(
  campo: CampoDelParte,
  papel: "salida" | "llegada",
  limites: Limites,
): ParteDeUnCampo {
  const m = campo.meteo;
  const fuerzaKt = Math.max(m.vientoKt, m.rachaKt ?? 0);
  const relativo =
    m.vientoDe === null || m.vientoKt <= 0 ? null : aLaMitad(m.vientoDe - campo.rumbo);
  const rad = ((relativo ?? 0) * Math.PI) / 180;
  const cruzadoKt = relativo === null ? 0 : Math.abs(Math.sin(rad)) * fuerzaKt;
  const deFrenteKt = relativo === null ? 0 : Math.cos(rad) * m.vientoKt;
  const tormentaEncima = m.tormentaEncima === true;
  const pasa: Motivo[] = [];
  if (tormentaEncima) pasa.push("tormenta");
  if (m.visibilidadM < limites.visibilidadM) pasa.push("visibilidad");
  if (m.techoM !== null && m.techoM < limites.techoM) pasa.push("techo");
  /*
   * **Y si hoy no le da ni la pista entera**, otra negativa argumentada: la
   * misma cuenta que decide si se sale desde la intersección
   * —`pistaNecesariaHoy`— contra la pista de punta a punta. Delante del
   * viento: tampoco se discute, pero con el fresco de la mañana o con el
   * viento que cambia, se puede esperar.
   */
  const pistaDeHoy = papel === "salida" ? campo.pistaDeHoy : undefined;
  if (pistaDeHoy && pistaDeHoy.necesita > pistaDeHoy.hay) pasa.push("pista");
  // Medio nudo de gracia: el parte da enteros y la cuenta del seno no.
  if (cruzadoKt > limites.cruzadoKt + 0.5) pasa.push("cruzado");
  return {
    papel,
    campo,
    relativo,
    cruzadoKt,
    deFrenteKt,
    fuerzaKt,
    lluvia: m.lluvia,
    tormentaEncima,
    pasa,
  };
}

/** La decisión, con sus porqués. */
export interface Decision {
  /** Si se propone salir. `false` es «hoy no, o esperá». */
  readonly salir: boolean;
  /** Lo que pasa del límite, campo por campo. Vacío si se sale. */
  readonly motivos: readonly { readonly papel: "salida" | "llegada"; readonly motivo: Motivo }[];
}

/**
 * **Hoy se sale o no.** Se propone no salir **solo** cuando algo pasa del
 * límite de ese avión, en la salida o en la llegada: un día gris con buena
 * visibilidad y viento flojo es un día de volar, y una tarjeta que dijera
 * «mejor no» cada vez que hay una nube enseñaría a no hacerle caso.
 */
export function decidir(partes: readonly ParteDeUnCampo[]): Decision {
  const motivos = partes.flatMap((p) =>
    p.pasa.map((motivo) => ({ papel: p.papel, motivo })),
  );
  return { salir: motivos.length === 0, motivos };
}

/** El techo en pies sobre el campo, redondeado a la centena como lo da el parte. */
export function techoEnPies(m: Meteo): number | null {
  return m.techoM === null ? null : Math.round(m.techoM / PIE / 100) * 100;
}

/**
 * **Lo de hoy contra el límite**, para enseñarlo: la negativa argumentada.
 *
 * Enrique, al ver que el JAZ 25 se quedaba en tierra en Tenerife Norte por el
 * viento de costado: «me parece correcto, que se vea que hay avionetas que
 * tienen su limitación. Eso sí, que se explique con datos al piloto, que sepa
 * que es una negativa argumentada». Así que cada motivo trae su número de hoy,
 * el del límite y de dónde sale el límite, y la tarjeta los dibuja en un reloj
 * con la marca del límite y la aguja de hoy pasándola.
 */
export interface Comparacion {
  /** Lo que hay hoy, en `unidad`. */
  readonly hoy: number;
  /** Lo que aguanta el avión, en la misma unidad. */
  readonly limite: number;
  /** `kt`, `m`, `ft`; `null` en la tormenta, que no se mide: hay o no hay. */
  readonly unidad: "kt" | "m" | "ft" | null;
  /** Si lo malo es pasarse por arriba —viento, pista— o quedarse corto —visibilidad, techo—. */
  readonly malSiMas: boolean;
  /**
   * De dónde sale el límite: `demostrado` en su certificación, `norma` (el
   * mínimo que exige, o los mínimos de vuelo de la OACI y SERA), `manual` (su
   * distancia de despegue con el margen de su clase) o `tormenta` (a una
   * tormenta no se entra).
   */
  readonly origen: "demostrado" | "norma" | "manual" | "tormenta";
}

/**
 * Lo de hoy contra el límite de un motivo, o `null` si en ese campo no hay
 * nada que comparar.
 *
 * Las fuentes de cada límite, en una línea: el viento cruzado del manual de
 * su avión de referencia, o el 0,2 de la pérdida de la 14 CFR 23.233 —ver
 * `flight/viento-cruzado.ts`—; la visibilidad y el techo, los del vuelo
 * visual (OACI, Anexo 2, 4.2; SERA.5005) o los de una aproximación de
 * precisión de categoría I —ver `MINIMOS`—; la pista, `pistaNecesariaHoy`; y
 * la tormenta, que no se despega ni se aterriza ante una (FAA, AC 00-24C,
 * «Thunderstorms»: «don't land or takeoff in the face of an approaching
 * thunderstorm»).
 */
export function comparar(
  p: ParteDeUnCampo,
  motivo: Motivo,
  limites: Limites,
): Comparacion | null {
  const m = p.campo.meteo;
  switch (motivo) {
    case "cruzado":
      return {
        hoy: p.cruzadoKt,
        limite: limites.cruzadoKt,
        unidad: "kt",
        malSiMas: true,
        origen: limites.cruzadoDe,
      };
    case "visibilidad":
      return {
        hoy: m.visibilidadM,
        limite: limites.visibilidadM,
        unidad: "m",
        malSiMas: false,
        origen: "norma",
      };
    case "techo":
      return m.techoM === null
        ? null
        : {
            hoy: m.techoM / PIE,
            limite: limites.techoM / PIE,
            unidad: "ft",
            malSiMas: false,
            origen: "norma",
          };
    case "pista":
      return p.campo.pistaDeHoy
        ? {
            hoy: p.campo.pistaDeHoy.necesita,
            limite: p.campo.pistaDeHoy.hay,
            unidad: "m",
            malSiMas: true,
            origen: "manual",
          }
        : null;
    case "tormenta":
      return {
        hoy: p.tormentaEncima ? 1 : 0,
        limite: 0,
        unidad: null,
        malSiMas: true,
        origen: "tormenta",
      };
  }
}

/**
 * **Cómo quedó el parte al volver a mirarlo** después de esperar un rato:
 * `mejor` si ahora se sale, `igual` si sigue pasando lo mismo o menos, y
 * `null` si apareció algo nuevo —entonces la tarjeta se enseña como la
 * primera vez, con su propuesta—. Ver `Game.volverAMirarElParte`.
 */
export function alReleer(antes: Decision | null, ahora: Decision): "mejor" | "igual" | null {
  if (ahora.salir) return "mejor";
  const habia = new Set((antes?.motivos ?? []).map((m) => `${m.papel}:${m.motivo}`));
  return ahora.motivos.every((m) => habia.has(`${m.papel}:${m.motivo}`)) ? "igual" : null;
}
