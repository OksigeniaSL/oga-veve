/**
 * **Los flaps, arriba al dejar la pista. No antes.**
 *
 * Visto en vídeos de aterrizajes: «los pilotos suben los flaps al acabar». Es
 * verdad, y el cuándo es la mitad de la lección. Se suben **al dejar la
 * pista**, como primera cosa de la lista de después del aterrizaje —flaps
 * arriba, aerofrenos recogidos, luces de aterrizaje apagadas y las de rodaje
 * encendidas, transpondedor—, y no en la carrera: con el avión corriendo, la
 * palanca de flaps está al lado de otras, y la que se toca sin querer puede
 * ser la del tren. Es de las pocas cosas de una cabina que se enseñan con un
 * accidente detrás.
 *
 * Tres momentos, y en ninguno se castiga nada:
 *
 * - **En la carrera**, si se suben: se dice por qué ahí no, una vez.
 * - **Al salir de la pista**, si siguen fuera: se recuerda. En los peldaños
 *   de abajo, «ahora sí, subí los flaps»; en el de cabina, la lista de
 *   después del aterrizaje, que es como se hace en un avión de dos pilotos.
 * - **Al llegar al puesto**, si todavía siguen fuera: se nota, con calma —la
 *   próxima, al dejar la pista—. Rodar con los flaps fuera no rompe nada, pero
 *   las piedras y el barro de las calles van a dar justo ahí, y en un
 *   aeropuerto de verdad el de tierra lo ve desde lejos.
 *
 * Función pura: recibe la fase de antes y la de ahora, la palanca de antes y
 * la de ahora, y lo que ya se dijo en esta toma. `Game` pone la voz.
 */

import type { Fase } from "./vuelo";

/** Lo que ya se dijo en esta toma, para no repetirlo. */
export interface LoDicho {
  readonly enLaCarrera: boolean;
  readonly alSalir: boolean;
  readonly alPuesto: boolean;
}

/** Nada dicho: una toma nueva. */
export const NADA_DICHO: LoDicho = {
  enLaCarrera: false,
  alSalir: false,
  alPuesto: false,
};

/** Qué toca decir ahora, si algo. */
export type LoQueToca = "enLaCarrera" | "alSalir" | "alPuesto" | null;

/** Las fases de la carrera: el avión en la pista, después de tocar. */
const EN_LA_CARRERA: ReadonlySet<Fase | ""> = new Set(["aterrizado", "abandonando"]);

/** Y las de después, ya fuera de ella. */
const FUERA_DE_LA_PISTA: ReadonlySet<Fase | ""> = new Set([
  "a-plataforma",
  "en-puesto",
]);

export function flapsTrasLaToma(
  antes: { readonly fase: Fase | ""; readonly palanca: number },
  ahora: { readonly fase: Fase; readonly palanca: number },
  dicho: LoDicho,
): { readonly toca: LoQueToca; readonly dicho: LoDicho } {
  // Una toma nueva empieza de cero: lo dicho en la anterior ya no cuenta.
  const nueva = ahora.fase === "aterrizado" && !EN_LA_CARRERA.has(antes.fase);
  const ya = nueva ? NADA_DICHO : dicho;

  if (
    EN_LA_CARRERA.has(ahora.fase) &&
    !nueva &&
    ahora.palanca < antes.palanca &&
    !ya.enLaCarrera
  )
    return { toca: "enLaCarrera", dicho: { ...ya, enLaCarrera: true } };

  const fuera = ahora.palanca > 0;
  if (
    antes.fase === "abandonando" &&
    FUERA_DE_LA_PISTA.has(ahora.fase) &&
    fuera &&
    !ya.alSalir
  )
    return { toca: "alSalir", dicho: { ...ya, alSalir: true } };

  // Al puesto viniendo de rodar hacia él: si se llega directo desde la pista,
  // el recordatorio de salir acaba de sonar y dos seguidos sobran.
  if (
    antes.fase === "a-plataforma" &&
    ahora.fase === "en-puesto" &&
    fuera &&
    ya.alSalir &&
    !ya.alPuesto
  )
    return { toca: "alPuesto", dicho: { ...ya, alPuesto: true } };

  return { toca: null, dicho: ya };
}
