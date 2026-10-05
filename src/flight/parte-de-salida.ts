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
import { cruzadoDemostrado } from "./viento-cruzado";
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
  /** Visibilidad mínima, m. */
  readonly visibilidadM: number;
  /** Techo mínimo sobre el campo, m. */
  readonly techoM: number;
}

export function limitesDe(a: AircraftConfig): Limites {
  const m = MINIMOS[a.reglasDeVuelo];
  return {
    cruzadoKt: cruzadoDemostrado(a).kt,
    visibilidadM: m.visibilidad,
    techoM: m.techo,
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
}

/** Por qué no conviene salir. */
export type Motivo = "cruzado" | "tormenta" | "visibilidad" | "techo";

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
