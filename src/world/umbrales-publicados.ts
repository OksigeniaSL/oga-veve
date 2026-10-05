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
 *   apartados 2.12 y 2.13, y AD 3 para Ayolas. La edición en vigor (AMDT NR
 *   02/2026) se distribuye en un archivo de dinac.gov.py que el 5 de octubre
 *   de 2026 no contestaba, y no está guardado en ningún archivo público; la
 *   más reciente que se pudo bajar es la **AMDT AIRAC 01/2025**, de la copia
 *   del Internet Archive del 2 de octubre de 2025. En ella ninguna pista
 *   paraguaya tiene el umbral desplazado: en todas, la LDA es la TORA.
 * - **Yvytu Rape** es la pista de Granja Óga: no sale en ningún AIP.
 */

/** Lo que publica el AIP de una cabecera sobre dónde se aterriza. */
export interface UmbralPublicado {
  /** Metros de asfalto antes del umbral de aterrizaje. */
  readonly desplazado: number;
  /** La distancia de aterrizaje disponible (LDA) que publica, m. */
  readonly lda: number;
  /**
   * Si la pista para aterrizar acaba en el umbral de la otra cabecera y no en
   * la punta del asfalto: lo que hay detrás no es pista para esta cabecera.
   */
  readonly hastaElOtroUmbral?: boolean;
}

/** Por indicativo OACI y por cabecera. */
export const UMBRALES: Readonly<Record<string, Readonly<Record<string, UmbralPublicado>>>> = {
  GCXO: { "12": { desplazado: 0, lda: 3171 }, "30": { desplazado: 0, lda: 3171 } },
  GCTS: { "07": { desplazado: 0, lda: 3200 }, "25": { desplazado: 0, lda: 3200 } },
  GCLP: {
    "03L": { desplazado: 0, lda: 3100 },
    "21R": { desplazado: 0, lda: 3100 },
    "03R": { desplazado: 0, lda: 3099 },
    "21L": { desplazado: 0, lda: 3099 },
  },
  /*
   * «(1) THR RWY 01 displaced 1000 m» y «(2) THR RWY 19 displaced 466 m».
   * OurAirports traía 1001,3 y 460,2, que son sus pies pasados a metros.
   */
  GCFV: { "01": { desplazado: 1000, lda: 2406 }, "19": { desplazado: 466, lda: 2940 } },
  /*
   * «(1) THR RWY 03 displaced 90 m» y «(3) The last 90 m of RWY 21 are not
   * usable for take-off and landing»: la 21 acaba en el umbral 03.
   */
  GCRR: {
    "03": { desplazado: 90, lda: 2310 },
    "21": { desplazado: 0, lda: 2310, hastaElOtroUmbral: true },
  },
  /*
   * «(1) THR 18 displaced 52 m» y «(3) THR 36 displaced 142 m», y cada una
   * acaba en el umbral de la otra: «(2) The last 142 m of RWY 18 are not
   * usable for take-off and landing, belong to CWY» y «(4) The last 52 m of
   * RWY 36…». LDA de 2.058 m en las dos.
   */
  GCLA: {
    "18": { desplazado: 52, lda: 2058, hastaElOtroUmbral: true },
    "36": { desplazado: 142, lda: 2058, hastaElOtroUmbral: true },
  },
  GCHI: { "16": { desplazado: 0, lda: 1250 }, "34": { desplazado: 0, lda: 1250 } },
  GCGM: { "09": { desplazado: 0, lda: 1500 }, "27": { desplazado: 0, lda: 1500 } },
  LECU: { "09": { desplazado: 0, lda: 1500 }, "27": { desplazado: 0, lda: 1500 } },
  SGAS: { "02": { desplazado: 0, lda: 3352 }, "20": { desplazado: 0, lda: 3352 } },
  SGES: { "05": { desplazado: 0, lda: 3389 }, "23": { desplazado: 0, lda: 3389 } },
  SGME: { "01": { desplazado: 0, lda: 3503 }, "19": { desplazado: 0, lda: 3503 } },
  SGPJ: { "03": { desplazado: 0, lda: 1800 }, "21": { desplazado: 0, lda: 1800 } },
  SGEN: { "02": { desplazado: 0, lda: 2000 }, "20": { desplazado: 0, lda: 2000 } },
  SGCO: { "03": { desplazado: 0, lda: 1850 }, "21": { desplazado: 0, lda: 1850 } },
  SGPI: { "02": { desplazado: 0, lda: 1200 }, "20": { desplazado: 0, lda: 1200 } },
  /*
   * Ayolas sale en AD 3, la lista de aeródromos de cabotaje: 1850 × 45 m de
   * asfalto, sin distancias declaradas y sin nada desplazado. La LDA que se
   * pone es el largo de la pista.
   */
  SGAY: { "02": { desplazado: 0, lda: 1850 }, "20": { desplazado: 0, lda: 1850 } },
};

/** Lo publicado para esa cabecera, o `null` si el campo no sale en ningún AIP. */
export function umbralPublicado(
  oaci: string | null | undefined,
  cabecera: string | null | undefined,
): UmbralPublicado | null {
  if (!oaci || !cabecera) return null;
  return UMBRALES[oaci]?.[cabecera] ?? null;
}
