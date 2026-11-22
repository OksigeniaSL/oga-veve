/**
 * **El centrado: dónde va el peso, no cuánto.**
 *
 * La hoja de carga (`hoja-de-carga.ts`) decide cuánto se lleva; esta, dónde
 * va. Y no es lo mismo: dos personas en un 172 pesan lo mismo delante que
 * detrás, pero el avión no vuela igual. Con el centro de gravedad atrás, el
 * morro se va arriba solo y el avión es menos estable; con el centro delante,
 * pesa el morro y hace falta más timón para levantarlo. Y la escala cambia la
 * lección: en la avioneta, que alguien se cambie de asiento se nota; en el
 * avión grande, no. Es el brazo de palanca, y se ve en los números de
 * `docs/adr/0033-el-centro-de-gravedad.md`.
 *
 * ## De qué sale
 *
 * De la hoja de peso y centrado del manual de cada tipo: el brazo del avión
 * vacío, el de cada fila de asientos, el de las bodegas y el del combustible,
 * y la envolvente —los límites delantero y trasero según el peso—. **Solo de
 * los que tienen esa hoja leída en su manual**; el que no la tiene vuela como
 * siempre, con el centrado de su modelo. Es la misma regla que la hoja de
 * carga aplica a la masa en vacío: antes no dejar elegir que hacerlo con una
 * cifra inventada.
 *
 * ## Cómo entra en el vuelo
 *
 * Los coeficientes de cabeceo de cada ficha están ajustados para un centro de
 * gravedad que nadie escribió, y que es por fuerza el de la carga con la que se
 * ajustaron: **la de su ficha**. Ese es el cero. Lo que sale de aquí es cuánto
 * se ha ido el centro de hoy de ese cero, en metros y hacia la cola
 * (`desplazamientoDelCentrado`), y el modelo de vuelo lo usa en tres sitios:
 *
 * - el par de la fuerza del aire alrededor del centro nuevo, `ΔCm = CL·Δx/c̄`,
 *   en `step` (`fdm.ts`);
 * - y con él la estabilidad, que cae en `CLα·Δx/c̄` hasta perderse en el punto
 *   neutro (`puntoNeutro`);
 * - el brazo con el que el peso carga las ruedas principales al rotar
 *   (`brazoDelTren` en `apoyo.ts`): con el morro pesado, más brazo, y más timón
 *   para levantarlo.
 *
 * Y lo que lee el modelo lo leen también sus cuentas: la marca del compensador
 * de despegue sale del timón que sostiene el avión (`timonQueSostiene`), así
 * que sigue al centrado sola.
 *
 * **Con la carga de siempre, el desplazamiento es cero exacto** y el vuelo es
 * el mismo bit a bit: la referencia se cuenta con el mismo combustible que
 * lleva el avión, así que lo que quema no mueve nada. El combustible también
 * mueve el centro —en el 172 va a 48 pulgadas, un poco por detrás—, pero eso
 * ya estaba dentro del modelo ajustado; lo que se cuenta aquí es la carga que
 * se elige.
 *
 * Funciones puras: no hablan ni dibujan. La pantalla que lo enseña es otro
 * encargo.
 */

import type { AircraftConfig } from "./aircraft";
import { ADULTO, pasajerosDeSuFicha } from "./hoja-de-carga";

const PULGADA = 0.0254;
const LIBRA = 0.45359237;

/** Un punto de la envolvente: la masa, kg, y el brazo, m por detrás del datum. */
export type PuntoDeLaEnvolvente = readonly [masa: number, brazo: number];

/** La hoja de peso y centrado de un tipo, de su manual, en kg y en metros por detrás de su datum. */
export interface CentradoDeSuTipo {
  /** Dónde está el cero de los brazos, como lo dice su manual. */
  readonly datum: string;
  /** La cuerda media aerodinámica: dónde empieza (LEMAC) y cuánto mide, m. */
  readonly cuerda: { readonly borde: number; readonly media: number };
  /** El avión vacío: su masa, la misma de la hoja de carga, y su brazo. */
  readonly vacio: { readonly masa: number; readonly brazo: number };
  /** Quien va a los mandos, que viaja siempre: cuántos y en qué brazo. */
  readonly tripulacion: { readonly personas: number; readonly brazo: number };
  /** Los asientos de pasaje, de delante a atrás: cuántos por fila y su brazo. */
  readonly filas: readonly { readonly asientos: number; readonly brazo: number }[];
  /** Las bodegas, de delante a atrás: su brazo y lo que admite cada una, kg. */
  readonly bodegas: readonly { readonly brazo: number; readonly maximo: number }[];
  /** Lo que admiten todas las bodegas juntas, kg. */
  readonly bodegaMaxima: number;
  /** El brazo del combustible utilizable. */
  readonly combustible: number;
  /** Los límites del centro de gravedad, de menos a más masa. */
  readonly envolvente: {
    readonly delante: readonly PuntoDeLaEnvolvente[];
    readonly detras: readonly PuntoDeLaEnvolvente[];
  };
}

/**
 * Por avión, con su fuente. Solo los que tienen la hoja de peso y centrado
 * leída en su manual.
 */
export const CENTRADO_DE_SU_TIPO: Readonly<Record<string, CentradoDeSuTipo>> = {
  /*
   * El 172R, de su manual de vuelo (Cessna, *Pilot's Operating Handbook*
   * 172R, 1996, rev. 7):
   *
   * - el datum, «Lower portion of front face of firewall», p. 2-7;
   * - la cuerda media, 58,80 pulgadas desde la estación 25,90: la fórmula del
   *   porcentaje de la MAC de la hoja de pesada, figura 6-1, p. 6-5;
   * - el avión vacío, 1.639 lb con 64,4 millares de lb·in de momento —brazo
   *   39,29—: el «Sample Airplane» de la figura 6-5, p. 6-12, el mismo peso en
   *   vacío que usa la hoja de carga;
   * - los asientos delanteros en la estación 37 —de 34 a 46 según se corra el
   *   asiento—, los traseros en la 73, la bodega 1 en la 95 y la 2 en la 123,
   *   y el combustible en la 48,0: «Loading Arrangements», figura 6-3, p. 6-9;
   * - las bodegas, 120 lb la 1 y 50 la 2, y no más de 120 entre las dos, p. 2-7;
   * - la envolvente de categoría normal, p. 2-7: el límite delantero en la
   *   35,0 hasta 1.950 lb y en recta hasta la 40,0 a 2.450; el trasero, en la
   *   47,3 con cualquier peso.
   *
   * La fila de delante tiene un asiento de pasaje, el de al lado de quien
   * pilota; la de atrás, dos.
   */
  "jaz-20": {
    datum: "la cara delantera del cortafuegos, abajo",
    cuerda: { borde: 25.9 * PULGADA, media: 58.8 * PULGADA },
    vacio: { masa: Math.round(1639 * LIBRA), brazo: (64.4e3 / 1639) * PULGADA },
    tripulacion: { personas: 1, brazo: 37 * PULGADA },
    filas: [
      { asientos: 1, brazo: 37 * PULGADA },
      { asientos: 2, brazo: 73 * PULGADA },
    ],
    bodegas: [
      { brazo: 95 * PULGADA, maximo: 120 * LIBRA },
      { brazo: 123 * PULGADA, maximo: 50 * LIBRA },
    ],
    bodegaMaxima: 120 * LIBRA,
    combustible: 48 * PULGADA,
    envolvente: {
      delante: [
        [1950 * LIBRA, 35 * PULGADA],
        [2450 * LIBRA, 40 * PULGADA],
      ],
      detras: [
        [1950 * LIBRA, 47.3 * PULGADA],
        [2450 * LIBRA, 47.3 * PULGADA],
      ],
    },
  },
};

/** La hoja de centrado de este avión, o `null` si no se ha leído en su manual. */
export function centradoDeSuTipo(a: Pick<AircraftConfig, "id">): CentradoDeSuTipo | null {
  return CENTRADO_DE_SU_TIPO[a.id] ?? null;
}

/**
 * **Dónde va cada uno**: cuántos pasajeros en cada fila, de delante a atrás, y
 * los kilos de cada bodega. La tripulación no entra: va siempre en su sitio.
 */
export interface Reparto {
  readonly filas: readonly number[];
  readonly bodegas?: readonly number[];
}

/**
 * **El reparto de siempre**: la gente llenando las filas de delante a atrás,
 * que es como se sienta quien sube a un avión pequeño, y las bodegas vacías.
 */
export function repartoDeLaHoja(t: CentradoDeSuTipo, pasajeros: number): Reparto {
  let quedan = Math.max(0, Math.round(pasajeros));
  const filas = t.filas.map((f) => {
    const aqui = Math.min(f.asientos, quedan);
    quedan -= aqui;
    return aqui;
  });
  return { filas };
}

/**
 * **El reparto que vale**: el pedido, con cada fila hasta sus asientos, o el
 * de siempre si no se pidió ninguno.
 *
 * Las bodegas **no** se recortan a lo que admiten: pasarse del rótulo de la
 * bodega es justo como se saca un avión pequeño de su envolvente por detrás,
 * y la física no lee rótulos. Decir que no cabe es cosa de la hoja que lo
 * enseñe, no del modelo.
 */
export function repartoQueVale(
  t: CentradoDeSuTipo,
  pasajeros: number,
  pedido?: Reparto,
): Reparto {
  if (!pedido) return repartoDeLaHoja(t, pasajeros);
  const filas = t.filas.map((f, i) =>
    Math.max(0, Math.min(f.asientos, Math.round(pedido.filas[i] ?? 0))),
  );
  const bodegas = t.bodegas.map((_, i) => Math.max(0, pedido.bodegas?.[i] ?? 0));
  return { filas, bodegas };
}

/**
 * **El reparto puesto en la dirección**, `?filas=0,2&bodegas=0,20`, o nada si
 * no hay `filas`. Para los bancos: la pantalla que lo elige es otro encargo.
 */
export function repartoDeLaDireccion(params: URLSearchParams): { readonly reparto?: Reparto } {
  const filas = params.get("filas");
  if (!filas) return {};
  const numeros = (texto: string | null): number[] =>
    (texto ?? "")
      .split(",")
      .filter((x) => x.trim() !== "")
      .map((x) => Math.max(0, Number(x) || 0));
  const bodegas = numeros(params.get("bodegas"));
  return { reparto: { filas: numeros(filas), ...(bodegas.length ? { bodegas } : {}) } };
}

/** Cuántos pasajeros lleva un reparto. */
export function pasajerosDelReparto(r: Reparto): number {
  return r.filas.reduce((s, n) => s + n, 0);
}

/** El centro de gravedad: lo que pesa el avión, kg, y dónde está, m por detrás del datum. */
export interface CentroDeGravedad {
  readonly masa: number;
  readonly brazo: number;
}

/**
 * **El centro de gravedad con esta carga**: la suma de los momentos —cada masa
 * por su brazo— partida por la suma de las masas. Es la cuenta de la figura
 * 6-5 del manual del 172R, renglón por renglón. Cada persona, con la masa
 * estándar de la hoja de carga.
 */
export function centroDeGravedad(
  t: CentradoDeSuTipo,
  reparto: Reparto,
  combustible: number,
): CentroDeGravedad {
  let masa = t.vacio.masa + t.tripulacion.personas * ADULTO;
  let momento = t.vacio.masa * t.vacio.brazo + t.tripulacion.personas * ADULTO * t.tripulacion.brazo;
  t.filas.forEach((f, i) => {
    const kg = (reparto.filas[i] ?? 0) * ADULTO;
    masa += kg;
    momento += kg * f.brazo;
  });
  t.bodegas.forEach((b, i) => {
    const kg = reparto.bodegas?.[i] ?? 0;
    masa += kg;
    momento += kg * b.brazo;
  });
  const kg = Math.max(0, combustible);
  masa += kg;
  momento += kg * t.combustible;
  return { masa, brazo: momento / masa };
}

/**
 * **El centrado para el que está ajustado el modelo**: el de la carga de su
 * ficha —la gente que cabe en su masa sin combustible, sentada como siempre—
 * con el combustible que lleve ahora. El cero de `desplazamientoDelCentrado`.
 */
export function centradoDeReferencia(
  a: AircraftConfig,
  t: CentradoDeSuTipo,
  combustible: number,
): CentroDeGravedad {
  return centroDeGravedad(t, repartoDeLaHoja(t, pasajerosDeSuFicha(a)), combustible);
}

/**
 * **Cuánto se ha ido el centro de gravedad del de su modelo**, m, positivo
 * hacia la cola: lo que el juego le pone al modelo de vuelo con
 * `ponerCentrado`. Cero con la carga de su ficha y en el avión sin hoja de
 * centrado.
 */
export function desplazamientoDelCentrado(
  a: AircraftConfig,
  pasajeros: number,
  combustible: number,
  reparto?: Reparto,
): number {
  const t = centradoDeSuTipo(a);
  if (!t) return 0;
  const hoy = centroDeGravedad(t, repartoQueVale(t, pasajeros, reparto), combustible);
  return hoy.brazo - centradoDeReferencia(a, t, combustible).brazo;
}

/** Los límites de la envolvente con esta masa, m por detrás del datum. */
export function limitesDelCentrado(
  t: CentradoDeSuTipo,
  masa: number,
): { readonly delante: number; readonly detras: number } {
  return {
    delante: enLaRecta(t.envolvente.delante, masa),
    detras: enLaRecta(t.envolvente.detras, masa),
  };
}

/**
 * **Dónde cae este centro de gravedad**: dentro de la envolvente, delante de
 * ella —el morro pesado— o detrás —la cola pesada—.
 */
export function dondeCae(
  t: CentradoDeSuTipo,
  cg: CentroDeGravedad,
): "dentro" | "delante" | "detras" {
  const l = limitesDelCentrado(t, cg.masa);
  if (cg.brazo < l.delante - 1e-6) return "delante";
  if (cg.brazo > l.detras + 1e-6) return "detras";
  return "dentro";
}

/** El brazo en fracción de la cuerda media: lo que en la cabina se llama «% MAC». */
export function enLaCuerda(t: CentradoDeSuTipo, brazo: number): number {
  return (brazo - t.cuerda.borde) / t.cuerda.media;
}

/**
 * **El punto neutro del modelo**, m por detrás del centrado de referencia: el
 * centro de gravedad con el que la estabilidad de cabeceo es cero, `−Cmα/CLα`
 * cuerdas. Detrás de él el avión no vuelve solo: un morro que sube sigue
 * subiendo. Sale del modelo de cada ficha, no del manual, porque es el modelo
 * el que vuela.
 */
export function puntoNeutro(a: AircraftConfig): number {
  return (-a.aero.cmAlpha / a.aero.clAlpha) * a.chord;
}

/**
 * **Lo que se mueve el centro de gravedad al llevar `kg` de un brazo a otro**,
 * m, positivo hacia la cola: `kg·(hasta − desde)/masa`. Vale para cualquier
 * avión, tenga o no hoja de centrado, porque es solo la palanca.
 *
 * Es la pieza que necesita **la carga que se suelta y se va hacia la cola**
 * (#90), que no está todavía: esa emergencia sumará esto, poco a poco, al
 * centrado de hoy con `ponerCentrado` del modelo de vuelo, que ya acepta
 * cambiarlo en pleno vuelo.
 */
export function moverCarga(masa: number, kg: number, desde: number, hasta: number): number {
  return (kg * (hasta - desde)) / Math.max(1, masa);
}

function enLaRecta(puntos: readonly PuntoDeLaEnvolvente[], masa: number): number {
  const primero = puntos[0]!;
  if (masa <= primero[0]) return primero[1];
  for (let i = 1; i < puntos.length; i++) {
    const [m1, b1] = puntos[i]!;
    const [m0, b0] = puntos[i - 1]!;
    if (masa <= m1) return b0 + ((b1 - b0) * (masa - m0)) / (m1 - m0);
  }
  return puntos[puntos.length - 1]![1];
}
