/**
 * **Los umbrales desplazados de cada pista, como los publica su AIP**: cuánto
 * asfalto hay antes del umbral de aterrizaje y hasta dónde se puede aterrizar
 * (punto 214 de la lista).
 *
 * El dato de los ficheros de aeródromo sale de OurAirports
 * (`displaced_threshold_ft`), que casi siempre acierta y no tiene a nadie
 * detrás que responda de cada cifra: en La Palma traía cero en las dos
 * cabeceras, y el AIP en vigor publica cincuenta y dos metros en la 18 y
 * ciento cuarenta y dos en la 36. Así que la cifra buena se escribe aquí con
 * su fuente, y `umbrales-publicados.test.ts` comprueba que el fichero de cada
 * aeródromo dice lo mismo. Si una extracción nueva la deshace, la prueba lo
 * dice.
 *
 * ## Hasta dónde se aterriza
 *
 * No en todas las pistas se aterriza hasta el final del asfalto. En La Palma
 * la 18 **acaba en el umbral 36** —«the last 142 m of RWY 18 are not usable
 * for take-off and landing, belong to CWY»— y la 36 en el umbral 18; en
 * Lanzarote, la 21 acaba en el umbral 03. En Fuerteventura, en cambio, se
 * aterriza por la 01 hasta la punta norte, pasando por encima de las flechas
 * de la 19. Eso es `hastaElOtroUmbral`, y con él la distancia de aterrizaje
 * (LDA) del juego sale de la geometría igual que la del AIP: ver `paraAterrizarDe` en
 * `umbral-desplazado.ts`.
 *
 * ## Y desde dónde se despega
 *
 * La TORA, de la misma tabla 2.13: la pista que se puede correr despegando.
 * La regla de qué avión cabe en qué campo se decide con ella y con la LDA, y
 * no con el largo del asfalto.
 *
 * ## De dónde sale
 *
 * - **Canarias y Cuatro Vientos**, del AIP de España que publica ENAIRE,
 *   ficha AD 2 de cada aeródromo, apartados 2.12 (características físicas:
 *   el desplazamiento y su nota) y 2.13 (distancias declaradas: la LDA).
 *   Leído el 5 de octubre de 2026: GCXO, GCTS, GCLP y GCLA de la enmienda
 *   AIRAC 09/26 (en vigor desde el 1 de octubre de 2026); GCRR, de la AIRAC
 *   08/26; GCHI, de la AIRAC 05/26; GCFV y GCGM, de la enmienda 408/26 (9 de
 *   julio de 2026); LECU, de la AIRAC 07/26.
 * - **Paraguay**, del AIP de la DINAC, ficha AD 2 de cada aeródromo,
 *   apartados 2.12 y 2.13, y AD 3 para Ayolas: la **AMDT AIRAC 02/2026**, en
 *   vigor desde el 1 de octubre de 2026, leída el 24 de octubre de 2026 en el
 *   archivo `AMDT_AIRAC_02_2026` de dinac.gov.py (el 5 de octubre no
 *   contestaba y se usó la AMDT AIRAC 01/2025 del Internet Archive). Todo
 *   sigue igual salvo **Pilar**, que pasó de 1.200 a 1.500 m con el umbral
 *   de la 02 desplazado 60: ver su fila. En las demás, nada desplazado y la
 *   LDA es la TORA.
 * - **Yvytu Rape** es la pista de Granja Óga: no sale en ningún AIP.
 */

/** Lo que publica el AIP de una cabecera sobre dónde se aterriza y se despega. */
export interface UmbralPublicado {
  /** Metros de asfalto antes del umbral de aterrizaje. */
  readonly desplazado: number;
  /** La distancia de aterrizaje disponible (LDA) que publica, m. */
  readonly lda: number;
  /**
   * **El recorrido de despegue disponible (TORA)** que publica, m: la pista que
   * se puede correr despegando desde esta cabecera. No siempre es el asfalto:
   * en Fuerteventura, la 19 tiene 3.406 m de asfalto y 2.406 de TORA —«the
   * last 1000 m are not usable for take-off»—, y en La Palma la 18 pierde los
   * 142 m del final, que son zona libre de obstáculos. Con esto y con la LDA
   * se decide qué avión cabe en el campo: ver `cabeEn`.
   */
  readonly tora: number;
  /**
   * Si la pista para aterrizar acaba en el umbral de la otra cabecera y no en
   * la punta del asfalto: lo que hay detrás no es pista para esta cabecera.
   */
  readonly hastaElOtroUmbral?: boolean;
}

/** Por indicativo OACI y por cabecera. */
export const UMBRALES: Readonly<Record<string, Readonly<Record<string, UmbralPublicado>>>> = {
  GCXO: { "12": { desplazado: 0, lda: 3171, tora: 3171 }, "30": { desplazado: 0, lda: 3171, tora: 3171 } },
  GCTS: { "07": { desplazado: 0, lda: 3200, tora: 3200 }, "25": { desplazado: 0, lda: 3200, tora: 3200 } },
  GCLP: {
    "03L": { desplazado: 0, lda: 3100, tora: 3100 },
    "21R": { desplazado: 0, lda: 3100, tora: 3100 },
    "03R": { desplazado: 0, lda: 3099, tora: 3099 },
    "21L": { desplazado: 0, lda: 3099, tora: 3099 },
  },
  /*
   * «(1) THR RWY 01 displaced 1000 m» y «(2) THR RWY 19 displaced 466 m».
   * OurAirports traía 1001,3 y 460,2, que son sus pies pasados a metros. Y
   * despegando por la 19 se pierden los mil del final: TORA 2.406 m,
   * «because the last 1000 m are not usable for take-off».
   */
  GCFV: { "01": { desplazado: 1000, lda: 2406, tora: 3406 }, "19": { desplazado: 466, lda: 2940, tora: 2406 } },
  /*
   * «(1) THR RWY 03 displaced 90 m» y «(3) The last 90 m of RWY 21 are not
   * usable for take-off and landing»: la 21 acaba en el umbral 03.
   */
  GCRR: {
    "03": { desplazado: 90, lda: 2310, tora: 2400 },
    "21": { desplazado: 0, lda: 2310, tora: 2310, hastaElOtroUmbral: true },
  },
  /*
   * «(1) THR 18 displaced 52 m» y «(3) THR 36 displaced 142 m», y cada una
   * acaba en el umbral de la otra: «(2) The last 142 m of RWY 18 are not
   * usable for take-off and landing, belong to CWY» y «(4) The last 52 m of
   * RWY 36…». LDA de 2.058 m en las dos; TORA de 2.110 m por la 18, que
   * pierde el final, y de 2.200 por la 36.
   */
  GCLA: {
    "18": { desplazado: 52, lda: 2058, tora: 2110, hastaElOtroUmbral: true },
    "36": { desplazado: 142, lda: 2058, tora: 2200, hastaElOtroUmbral: true },
  },
  GCHI: { "16": { desplazado: 0, lda: 1250, tora: 1250 }, "34": { desplazado: 0, lda: 1250, tora: 1250 } },
  GCGM: { "09": { desplazado: 0, lda: 1500, tora: 1500 }, "27": { desplazado: 0, lda: 1500, tora: 1500 } },
  LECU: { "09": { desplazado: 0, lda: 1500, tora: 1500 }, "27": { desplazado: 0, lda: 1500, tora: 1500 } },
  SGAS: { "02": { desplazado: 0, lda: 3352, tora: 3352 }, "20": { desplazado: 0, lda: 3352, tora: 3352 } },
  SGES: { "05": { desplazado: 0, lda: 3389, tora: 3389 }, "23": { desplazado: 0, lda: 3389, tora: 3389 } },
  SGME: { "01": { desplazado: 0, lda: 3503, tora: 3503 }, "19": { desplazado: 0, lda: 3503, tora: 3503 } },
  SGPJ: { "03": { desplazado: 0, lda: 1800, tora: 1800 }, "21": { desplazado: 0, lda: 1800, tora: 1800 } },
  SGEN: { "02": { desplazado: 0, lda: 2000, tora: 2000 }, "20": { desplazado: 0, lda: 2000, tora: 2000 } },
  SGCO: { "03": { desplazado: 0, lda: 1850, tora: 1850 }, "21": { desplazado: 0, lda: 1850, tora: 1850 } },
  /*
   * La AMDT AIRAC 02/2026 alargó Pilar por el sur: «Desplazamiento permanente
   * del umbral de la Pista 02 en 60 metros» (AD 2.8-2), 1.500 × 18 m (2.12) y
   * TORA 1.500 y LDA 1.440 por las dos cabeceras (2.13). Por la 02 se aterriza
   * desde el umbral desplazado hasta la punta norte; por la 20, desde la
   * punta norte hasta el umbral 02, que son los mismos 1.440: los sesenta del
   * sur se corren despegando y no se usan para parar.
   */
  SGPI: {
    "02": { desplazado: 60, lda: 1440, tora: 1500 },
    "20": { desplazado: 0, lda: 1440, tora: 1500, hastaElOtroUmbral: true },
  },
  /*
   * Ayolas sale en AD 3, la lista de aeródromos de cabotaje: 1850 × 45 m de
   * asfalto, sin distancias declaradas y sin nada desplazado. La LDA que se
   * pone es el largo de la pista.
   */
  SGAY: { "02": { desplazado: 0, lda: 1850, tora: 1850 }, "20": { desplazado: 0, lda: 1850, tora: 1850 } },
  /*
   * Barajas, de la ficha AD 2-LEMD leída el 9 de noviembre de 2026 (en vigor
   * desde el 29 de octubre). 2.12: «THR RWY 18R displaced 814 m», «32L
   * displaced 928 m», «18L displaced 500 m» y «32R displaced 500 m». 2.13,
   * las distancias declaradas.
   *
   * **Y aquí hay NU, que no había en ningún otro campo**: Barajas separa las
   * pistas de salida de las de llegada, y la 36L, la 36R, la 14L y la 14R no
   * publican LDA —no se aterriza por ellas—, igual que la 18L, la 18R, la 32L y
   * la 32R no publican TORA. Donde pone NU va **el asfalto que el juego corre
   * por esa cabecera**, para que la cuenta de qué avión cabe no se invente
   * una cifra; no es un número publicado y no se enseña como tal. Las que sí
   * publica, tal cual: TORA de 4.179 m por la 36L y LDA de 3.365 por la 18R,
   * que son 4.179 menos los 814 del umbral desplazado.
   *
   * El fichero de OpenStreetMap traía la 18R/36L con 180 m de más al norte y
   * la 14R/32L con 113 m de más al sureste, y los desplazados de OurAirports
   * —985 y 1.050 m— contados desde esas puntas. Las cuatro pistas se pusieron
   * a mano con los umbrales del AIP (2.12) y van marcadas `manual`.
   */
  LEMD: {
    "36L": { desplazado: 0, lda: 4179, tora: 4179 },
    "18R": { desplazado: 814, lda: 3365, tora: 4179 },
    "36R": { desplazado: 0, lda: 3500, tora: 3500 },
    "18L": { desplazado: 500, lda: 3000, tora: 3500 },
    "14R": { desplazado: 0, lda: 3988, tora: 3988 },
    "32L": { desplazado: 928, lda: 3060, tora: 3988 },
    "14L": { desplazado: 0, lda: 3500, tora: 3500 },
    "32R": { desplazado: 500, lda: 3000, tora: 3500 },
  },
};

/** Lo publicado para esa cabecera, o `null` si el campo no sale en ningún AIP. */
export function umbralPublicado(
  oaci: string | null | undefined,
  cabecera: string | null | undefined,
): UmbralPublicado | null {
  if (!oaci || !cabecera) return null;
  return UMBRALES[oaci]?.[cabecera] ?? null;
}
