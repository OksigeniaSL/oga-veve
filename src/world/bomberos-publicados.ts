/**
 * **Los bomberos de cada aeródromo, como los publica su AIP**: su categoría de
 * salvamento y extinción de incendios (SEI; RFFS en inglés), la del apartado
 * AD 2.6 de su ficha.
 *
 * Enrique, al ver la tabla de qué avión cabe dónde: «pues aplica la regla de
 * los bomberos». Un aeropuerto tiene bomberos preparados para el avión más
 * grande que recibe —más agua, más espuma, más camiones cuanto más largo y
 * más ancho es—, y un avión de pasaje no va adonde no podrían atenderlo. La
 * categoría del avión y la regla de uso están en `flight/bomberos.ts`.
 *
 * ## De dónde sale
 *
 * - **Canarias y Cuatro Vientos**, del AIP de España que publica ENAIRE, ficha
 *   AD 2 de cada aeródromo, apartado 2.6, leído el 5 de octubre de 2026 en las
 *   mismas enmiendas que `umbrales-publicados.ts`: GCXO, GCTS, GCLP y GCLA de
 *   la AIRAC 09/26; GCRR, de la AIRAC 08/26; GCHI, de la AIRAC 05/26; GCFV y
 *   GCGM, de la enmienda 408/26; LECU, de la AIRAC 07/26. Donde el AIP da una
 *   categoría civil y otra militar, la civil.
 * - **Paraguay**, del AIP de la DINAC, ficha AD 2 de cada aeródromo, apartado
 *   AD 2.x-6, de la misma copia que `umbrales-publicados.ts` (AMDT AIRAC
 *   01/2025, con páginas de hasta el 7 de agosto de 2025). Ojo: la versión
 *   en HTML del mismo AIP que guarda el Internet Archive, más antigua, da
 *   otras cifras en dos campos —Encarnación 2 y Pedro Juan Caballero 6—; se
 *   toma la de la enmienda en PDF, que es la más reciente que se pudo bajar.
 * - **Sin servicio**: Concepción y Pilar publican «NIL», Mariscal Estigarribia
 *   «no se dispone»; Ayolas sale solo en el AD 3, la lista de aeródromos de
 *   cabotaje, sin bomberos y con la pista reservada a los aviones de la
 *   Entidad Binacional Yacyretá; y Yvytu Rape es la pista de Granja Óga, que no
 *   sale en ningún AIP. Los cinco van con categoría 0: ninguna.
 *
 * Los escenarios inventados —el valle y el Chaco— no tienen aeródromo ni AIP,
 * y en ellos esta regla no se mira.
 */

/** Lo que publica el AIP de un aeródromo sobre sus bomberos. */
export interface BomberosPublicados {
  /** La categoría SEI que publica, de 1 a 10; 0 si no tiene servicio. */
  readonly categoria: number;
  /**
   * La que da **a petición**, si la publica: La Palma tiene la 7 y da la 8
   * pidiéndola con antelación —«8 on request», AD 2.6 y su punto 20—, que es
   * lo que haría una compañía con un vuelo regular de un avión de la 8.
   */
  readonly aPeticion?: number;
}

/** Por indicativo OACI. */
export const BOMBEROS: Readonly<Record<string, BomberosPublicados>> = {
  GCXO: { categoria: 9 },
  GCTS: { categoria: 9 },
  // «CIV: 9. MIL: 7.»
  GCLP: { categoria: 9 },
  /*
   * «9», con una nota: la categoría puede bajar a 7 o a 5 «during periods of
   * slumps in traffic […] as a result of a public health alert», y eso se
   * activa por suplemento o NOTAM. Se toma la publicada.
   */
  GCFV: { categoria: 9 },
  // «CIV: 9. MIL: 5.»
  GCRR: { categoria: 9 },
  // «7. (1) 8 on request».
  GCLA: { categoria: 7, aPeticion: 8 },
  GCHI: { categoria: 5 },
  GCGM: { categoria: 5 },
  // «CIV: 4», y en la nota: «category increase requests are not accepted».
  LECU: { categoria: 4 },
  // «CAT 8».
  SGAS: { categoria: 8 },
  // «Categoría VII».
  SGES: { categoria: 7 },
  // «No se dispone».
  SGME: { categoria: 0 },
  // «CAT 5».
  SGPJ: { categoria: 5 },
  // «CAT 7».
  SGEN: { categoria: 7 },
  // «NIL».
  SGCO: { categoria: 0 },
  // «NIL».
  SGPI: { categoria: 0 },
  // Solo en el AD 3, sin bomberos y reservada a los aviones de Yacyretá.
  SGAY: { categoria: 0 },
  // La pista de la granja: no sale en ningún AIP.
  SGOG: { categoria: 0 },
};

/**
 * **La categoría con la que se puede contar** en ese aeródromo para un vuelo
 * planeado: la publicada, o la que da a petición si es mayor. `null` si el
 * aeródromo no está en la tabla.
 */
export function bomberosDe(oaci: string | null | undefined): number | null {
  if (!oaci) return null;
  const b = BOMBEROS[oaci];
  if (!b) return null;
  return Math.max(b.categoria, b.aPeticion ?? 0);
}
