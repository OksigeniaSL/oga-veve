/**
 * **La regla de los bomberos**: un avión de pasaje solo va a un aeródromo
 * cuyos bomberos pueden atenderlo.
 *
 * Enrique, al ver la tabla de qué avión cabe dónde: «pues aplica la regla de
 * los bomberos». Y después: «y se explica de algún modo, eso se tiene que
 * saber, yo no tenía ni idea». Ver `cabeEn`, que la mira como un motivo más, y
 * la explicación `bomberos` en `ui/explicaciones-de-serie.ts`.
 *
 * ## La categoría de un avión
 *
 * Sale de lo largo que es y de lo ancho de su fuselaje, con la tabla 9-1 del
 * Anexo 14 de la OACI, volumen I —la misma, palabra por palabra, que EASA
 * pone como tabla 1 de AMC2 ADR.OPS.B.010(a)(2), ED Decision 2016/009/R—: de
 * la 1, menos de nueve metros, a la 10, de setenta y seis a noventa. Si el
 * fuselaje es más ancho que el tope de la categoría que le da su largo, sube
 * una. Cuanto más grande el avión, más agua y más espuma hacen falta para
 * abrirle paso a la gente que sale, y más camiones para llevarlas a tiempo.
 *
 * ## La de un aeródromo
 *
 * La publica su AIP. Ver `world/bomberos-publicados.ts`.
 *
 * ## Cuándo vale un aeródromo, y la rebaja que se admite
 *
 * La norma del operador es el Anexo 6 de la OACI, parte I (12.ª edición,
 * 2022), 4.1.5: la compañía evalúa los bomberos de cada aeródromo de su plan
 * de vuelo. Y su adjunto F, tabla F-1, dice qué se acepta en la salida y el
 * destino: **en principio, una categoría igual o mejor que la del avión**; y
 * con una evaluación de riesgo, **una por debajo** —dos solo en una rebaja
 * temporal de 72 horas o menos—, **pero nunca por debajo de la 4 en un avión
 * de más de 27.000 kg** de peso máximo al despegue, ni de la 1 en los demás.
 * EASA no pone otra cifra: AMC1 CAT.OP.MPA.107 (ED Decision 2019/019/R) pide
 * esa misma evaluación dentro del sistema de gestión de la compañía.
 *
 * Esa categoría de menos es la misma que admite el lado del aeródromo: el
 * Anexo 14 (9.2, y EASA en AMC2 ADR.OPS.B.010(a)(2) a 3) deja que un
 * aeródromo dé un nivel de protección **una categoría por debajo** de la de
 * su avión más grande cuando ese avión hace menos de 700 movimientos de pasaje
 * en sus tres meses de más tráfico (OACI, Doc 9137, parte 1, 2.1.3 y 2.1.4).
 * Un vuelo regular a una isla o a una ciudad pequeña no llega ni de lejos a
 * esos 700, y es como vuela de verdad: el 787-9 de Air Europa, que es de la 9,
 * va cada día a Asunción, que es de la 8.
 *
 * Así que la regla para un vuelo regular de pasaje es esa: **la categoría del
 * avión, o una menos, y nunca menos de la 4 si pesa más de 27 toneladas**.
 *
 * ## A quién se le aplica
 *
 * A los de línea, que son los que llevan pasaje de pago: el turbohélice de
 * diecinueve plazas y los dos reactores. Es la parte I del Anexo 6, la del
 * transporte aéreo comercial. Una avioneta de escuela, un fumigador o un
 * bimotor privado no tienen esta regla —la parte II, la de la aviación
 * general, no la pide—, y por eso aterrizan en un campo de tierra sin
 * bomberos. Tampoco es de los aviones del Estado, que el Anexo 6 no cubre: el
 * servicio de pasaje de la Fuerza Aérea Paraguaya, el SETAM, va a Concepción
 * —que no tiene bomberos— con un CASA 212 (Aviacionline, 2026). Ni de los
 * cargueros, que tienen su propia tabla rebajada: un avión de la 9 que solo
 * lleva carga pide un nivel de protección 7 (EASA, AMC2 ADR.OPS.B.010(a)(2) c,
 * tabla 2). Por eso a Guaraní, que es de la 7, han ido 747 de carga, y ningún
 * 747 de pasaje.
 */

import type { AircraftConfig } from "./aircraft";
import { DE_SU_CLASE } from "./ficha-tecnica";
import { esDeLinea } from "./velocidades-en-tierra";

/** Una fila de la tabla 9-1: hasta qué largo, sin incluirlo, y qué ancho. */
interface FilaDeLaTabla {
  readonly categoria: number;
  /** El largo total hasta el que llega, m, sin incluirlo. */
  readonly hasta: number;
  /** El ancho máximo de fuselaje, m. */
  readonly ancho: number;
}

/** El Anexo 14 de la OACI, volumen I, tabla 9-1. */
export const TABLA_9_1: readonly FilaDeLaTabla[] = [
  { categoria: 1, hasta: 9, ancho: 2 },
  { categoria: 2, hasta: 12, ancho: 2 },
  { categoria: 3, hasta: 18, ancho: 3 },
  { categoria: 4, hasta: 24, ancho: 4 },
  { categoria: 5, hasta: 28, ancho: 4 },
  { categoria: 6, hasta: 39, ancho: 5 },
  { categoria: 7, hasta: 49, ancho: 5 },
  { categoria: 8, hasta: 61, ancho: 7 },
  { categoria: 9, hasta: 76, ancho: 7 },
  { categoria: 10, hasta: 90, ancho: 8 },
];

/**
 * **La categoría de bomberos de un avión** por su largo total y su ancho de
 * fuselaje: la de su largo, y una más si el fuselaje no cabe en el ancho de
 * esa. Ver la cabecera.
 */
export function categoriaPorMedidas(largo: number, ancho: number): number {
  const fila = TABLA_9_1.find((f) => largo < f.hasta) ?? TABLA_9_1[TABLA_9_1.length - 1]!;
  return ancho > fila.ancho ? Math.min(10, fila.categoria + 1) : fila.categoria;
}

/**
 * **Las medidas con que se clasifica cada avión de la flota**: las de su tipo
 * de referencia, con su fuente.
 *
 * De la OACI, Doc 9137, *Airport Services Manual*, parte 1 (4.ª edición,
 * 2014), apéndice 2, «Aeroplane classification by airport category», que da
 * el largo total y el ancho de fuselaje de cada tipo. Donde el tipo de
 * referencia no sale ahí, el de su misma clase que sí sale, y se dice.
 */
export const MEDIDAS_DEL_TIPO: Readonly<
  Record<string, { readonly largo: number; readonly ancho: number; readonly tipo: string }>
> = {
  // Cessna 172 Skyhawk: 8,3 × 1,1.
  "jaz-20": { largo: 8.3, ancho: 1.1, tipo: "Cessna 172" },
  /*
   * El Ag Cat no sale en el Doc 9137: su largo, 7,42 m, es el de su ficha
   * —ver `DE_SU_CLASE` en `ficha-tecnica.ts`—, y su fuselaje es el de un
   * monoplaza, muy por debajo de los dos metros de la categoría 1.
   */
  "jaz-25": { largo: 7.42, ancho: 1.1, tipo: "Grumman G-164A Ag Cat" },
  /*
   * El Seneca II tampoco sale; sí el bimotor de seis plazas de su clase que
   * el doc pone, el Beechcraft Baron 55: 8,8 × 1,1.
   */
  "jaz-40": { largo: 8.8, ancho: 1.1, tipo: "Beechcraft Baron 55 (clase del Seneca II)" },
  // Beechcraft 1900D: 17,6 × 1,5. El Twin Otter, 15,8 × 1,6: la misma.
  "jaz-60": { largo: 17.6, ancho: 1.5, tipo: "Beechcraft 1900D" },
  // Embraer 170: 29,9 × 3,0.
  "jaz-90": { largo: 29.9, ancho: 3.0, tipo: "Embraer 170" },
  // Boeing 747-100, -200 y -300: 70,4 × 6,5.
  "jaz-120": { largo: 70.4, ancho: 6.5, tipo: "Boeing 747-100" },
};

/** La categoría de bomberos de este avión, de 1 a 10. */
export function categoriaDelAvion(a: Pick<AircraftConfig, "id">): number {
  const m = MEDIDAS_DEL_TIPO[a.id];
  return m ? categoriaPorMedidas(m.largo, m.ancho) : 1;
}

/** El peso máximo al despegue por encima del cual el suelo es la 4: 27.000 kg. */
const PESADO = 27000;

/**
 * **La categoría más baja que acepta este avión** en la salida y el destino
 * de un vuelo regular, o `null` si a este avión no se le aplica la regla. Ver
 * la cabecera: la suya o una menos, y nunca menos de la 4 si pesa más de
 * 27.000 kg.
 */
export function categoriaQueAcepta(a: AircraftConfig): number | null {
  if (!esDeLinea(a)) return null;
  const mtow = DE_SU_CLASE[a.id]?.mtow ?? a.mass;
  return Math.max(categoriaDelAvion(a) - 1, mtow > PESADO ? 4 : 1);
}
