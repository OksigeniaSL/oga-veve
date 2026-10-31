/**
 * **El ángulo de la senda de cada pista**, el que publica su AIP: el del PAPI
 * y el de la senda de planeo del ILS, o el de la aproximación RNP con guía
 * vertical si no hay ILS.
 *
 * Era tres grados en todo el juego, y casi siempre es verdad: tres grados es
 * la senda que pide la OACI cuando el terreno deja. Pero no siempre:
 *
 * - **La 21 de Lanzarote, 3,7°.** Hay una loma a una milla del umbral, y por
 *   tres grados se pasa a treinta y cinco metros de ella: el avisador de
 *   terreno lo cantaba con razón. Su PAPI está más alto por eso mismo, y no
 *   tiene ILS: se llega por la RNP y se acaba a la vista (VPT).
 * - **La 19 de Fuerteventura, 3,45°**, el PAPI y el ILS.
 * - **La 09 de Cuatro Vientos, 2,8°**, el PAPI.
 *
 * Con la senda de tres grados en esas pistas el juego enseñaba a entrar más
 * bajo que el PAPI de verdad: cuatro rojas en la 21 de Lanzarote volando lo
 * que el juego llamaba «en la senda». Lo que se enseña es real, y quien
 * aprenda a entrar allí tiene que ver dos blancas y dos rojas el día que lo
 * vuele.
 *
 * ## De dónde sale
 *
 * - **Canarias y Cuatro Vientos**, del AIP de España que publica ENAIRE,
 *   ficha AD 2 de cada aeródromo, apartados 2.14 (luces de aproximación y de
 *   pista: el PAPI y su ángulo) y 2.19 (radioayudas: la senda del ILS), y las
 *   cartas de aproximación RNP para el ángulo de las que no tienen ILS.
 *   Leído el 5 de octubre de 2026: GCXO, GCTS, GCLP y GCLA de la enmienda
 *   AIRAC 09/26 (en vigor desde el 1 de octubre de 2026); GCRR, de la AIRAC
 *   08/26 (3 de septiembre de 2026); GCHI, de la AIRAC 05/26 (11 de junio de
 *   2026); GCFV y GCGM, de la enmienda 408/26 (9 de julio de 2026); LECU, de
 *   la AIRAC 07/26 (6 de agosto de 2026).
 * - **Paraguay**, del AIP de la DINAC, ficha AD 2 de cada aeródromo, en su
 *   edición electrónica del 24 de febrero de 2022, que es la última que se
 *   pudo leer: la de ahora se distribuye en un archivo que no se pudo bajar.
 *   Ahí los PAPI de Asunción, Guaraní y Encarnación están a tres grados, y
 *   la senda del ILS de la 23 de Guaraní también. Pilar y Ayolas no salen en
 *   esa edición; Concepción y Mariscal Estigarribia no publican PAPI. Lo que
 *   no se sabe va a tres grados, que es la de la OACI, y se dice aquí.
 */

/** Lo que publica el AIP de una cabecera. */
export interface SendaPublicada {
  /** El ángulo del PAPI, grados, o `null` si no tiene o no se sabe. */
  readonly papi: number | null;
  /**
   * El de la senda de planeo del ILS, o si no hay ILS el de la aproximación
   * RNP con guía vertical, grados; `null` si no tiene ninguna.
   */
  readonly senda: number | null;
  /**
   * **Si la cabecera tiene ILS**: su localizador y su senda de planeo en el
   * apartado 2.19 de su AIP, o su carta de aproximación ILS. No sale de
   * `senda`, que también es la de una RNP —y en Asunción, al revés: la 20
   * tiene ILS y su ángulo no se pudo leer—. Para el dibujo da igual; para la
   * caja que canta *five hundred* solo en las de no precisión, no. Ver
   * `tieneIls`.
   */
  readonly ils?: true;
}

/** La senda de la OACI cuando el terreno deja, grados. */
export const SENDA_DE_SIEMPRE = 3;

/** Por indicativo OACI y por cabecera. */
export const SENDAS: Readonly<Record<string, Readonly<Record<string, SendaPublicada>>>> = {
  GCXO: { "12": { papi: 3, senda: 3, ils: true }, "30": { papi: 3, senda: 3, ils: true } },
  GCTS: { "07": { papi: 3, senda: 3, ils: true }, "25": { papi: 3, senda: 3, ils: true } },
  GCLP: {
    "03L": { papi: 3, senda: 3, ils: true },
    "21R": { papi: 3, senda: 3, ils: true },
    // Sin ILS: la RNP, a 3,00° (LPV) y a 3,05° (LNAV/VNAV).
    "03R": { papi: 3, senda: 3 },
    "21L": { papi: 3, senda: 3.05 },
  },
  GCFV: { "01": { papi: 3, senda: 3, ils: true }, "19": { papi: 3.45, senda: 3.45, ils: true } },
  GCRR: { "03": { papi: 3, senda: 3, ils: true }, "21": { papi: 3.7, senda: null } },
  // Sin ILS en su 2.19: la senda de la 36 es la de su RNP.
  GCLA: { "18": { papi: 3, senda: null }, "36": { papi: 3, senda: 3 } },
  GCHI: { "16": { papi: 3, senda: null }, "34": { papi: 3, senda: null } },
  GCGM: { "09": { papi: 3, senda: null }, "27": { papi: 3, senda: null } },
  LECU: { "09": { papi: 2.8, senda: null }, "27": { papi: 3, senda: null } },
  // La 20 tiene ILS —«ILS or LOC Z RWY 20» entre sus cartas—, y el ángulo de
  // su senda no se pudo leer en esa edición: va el del PAPI.
  SGAS: { "02": { papi: 3, senda: null }, "20": { papi: 3, senda: null, ils: true } },
  SGES: { "05": { papi: 3, senda: null }, "23": { papi: 3, senda: 3, ils: true } },
  SGEN: { "02": { papi: 3, senda: null }, "20": { papi: 3, senda: null } },
  SGCO: { "03": { papi: null, senda: null }, "21": { papi: null, senda: null } },
  SGME: { "01": { papi: null, senda: null }, "19": { papi: null, senda: null } },
};

/**
 * **El ángulo de la senda de esa cabecera**, grados: el del PAPI, que es lo
 * que se ve desde la cabina, o si no tiene, el de su senda de planeo; y si no
 * se sabe, tres. En las de Canarias que tienen las dos, son el mismo.
 */
export function sendaDeLaCabecera(
  oaci: string | null | undefined,
  cabecera: string | null | undefined,
): number {
  const s = oaci && cabecera ? SENDAS[oaci]?.[cabecera] : undefined;
  return s?.papi ?? s?.senda ?? SENDA_DE_SIEMPRE;
}

/**
 * **Si esa cabecera tiene ILS**, el de su AIP. Lo que no está en la tabla no
 * lo tiene, que es lo que pasa en los campos sin AIP: ahí no hay ILS que
 * valga. Ver `SendaPublicada.ils`.
 */
export function tieneIls(
  oaci: string | null | undefined,
  cabecera: string | null | undefined,
): boolean {
  const s = oaci && cabecera ? SENDAS[oaci]?.[cabecera] : undefined;
  return s?.ils === true;
}
