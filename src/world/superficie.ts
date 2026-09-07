/**
 * De qué está hecho el suelo que hay debajo del avión.
 *
 * Hasta hoy el juego sabía «suelo» y «no suelo», y eso deja fuera media
 * lección: **el avión se pasa la pista y sigue, y sigue. Es un todoterreno y
 * no se estrella nunca.** Un campo de hierba, la tierra del interior y el
 * asfalto de un aeropuerto no se ruedan igual, no suenan igual y no perdonan
 * igual, y con Yvytu Rape —que es de hierba entera— eso dejó de ser teórico.
 *
 * ## Tres, y no más
 *
 * - `asfalto`: la pista, las calles y las plataformas pavimentadas.
 * - `hierba`: lo preparado pero blando — una pista de hierba segada, la
 *   plataforma de tierra de un campo particular. Se rueda, cuesta más y
 *   traquetea.
 * - `campo`: lo de fuera. Ni está segado ni está allanado.
 *
 * Podrían ser diez, y no valdría de nada: lo que cambia el vuelo es rodar por
 * algo firme o por algo blando, y el tercer escalón es «esto no es sitio para
 * un avión».
 *
 * ## Los números son los de verdad
 *
 * El coeficiente de rodadura de un neumático de avión sobre asfalto está en
 * dos centésimas; sobre hierba corta, entre cuatro y seis; sobre tierra y
 * hierba alta, cerca de una décima. De ahí sale que una pista de hierba pida
 * más carrera de despegue que una de asfalto, que es exactamente lo que pasa
 * en la vida real y lo que hace que un piloto mire de qué es la pista antes de
 * ir.
 */

import type { Aerodrome, Pista } from "./aerodrome";
import type { Pavimento } from "./vegetation";
import { enEjesDePista } from "./rumbo";
import type { Scenario } from "./scenarios";

export type Superficie = "asfalto" | "hierba" | "campo";

/**
 * Coeficiente de rodadura de cada superficie.
 *
 * Es lo que frena a un avión que rueda sin frenos puestos, y lo que le cuesta
 * acelerar. Ver la cabecera.
 */
export const ROZAMIENTO: Record<Superficie, number> = {
  asfalto: 0.02,
  hierba: 0.05,
  campo: 0.09,
};

/**
 * Cuánto traquetea cada una, como múltiplo del asfalto.
 *
 * La vibración de la carrera ya existe y sube con la velocidad; esto la
 * multiplica. Rodar por un campo tiene que **notarse** antes de que nadie lo
 * explique: es la manera de decir «esto no es una pista» sin una palabra.
 */
export const TRAQUETEO: Record<Superficie, number> = {
  asfalto: 1,
  hierba: 1.8,
  campo: 3,
};

/** ¿Está pavimentada esta superficie, según lo que dice el fichero? */
function esDura(surface: string | null | undefined): boolean {
  if (!surface) return true;
  const s = surface.toLowerCase();
  return !(
    s.includes("grass") ||
    s.includes("dirt") ||
    s.includes("gravel") ||
    s.includes("earth") ||
    s.includes("sand") ||
    s.includes("ground")
  );
}

/** ¿El punto cae dentro del rectángulo de esta pista? */
function enLaPista(pista: Pista, x: number, z: number): boolean {
  const a = pista.centerline[0];
  const b = pista.centerline[pista.centerline.length - 1];
  if (!a || !b) return false;
  // Del fichero al mundo: la Y del norte es la Z negativa.
  const ax = a[0];
  const az = -a[1];
  const bx = b[0];
  const bz = -b[1];
  const largo = Math.hypot(bx - ax, bz - az);
  if (largo < 1) return false;
  const rumbo = (Math.atan2(bx - ax, -(bz - az)) * 180) / Math.PI;
  const { along, across } = enEjesDePista(
    x,
    z,
    (ax + bx) / 2,
    (az + bz) / 2,
    rumbo,
  );
  return (
    Math.abs(along) <= largo / 2 && Math.abs(across) <= (pista.widthM ?? 45) / 2
  );
}

/**
 * De qué está hecho el suelo en un punto del mundo.
 *
 * `pavimento` es el mapa de calles y plataformas, que es la parte cara y se
 * construye una vez; puede no haberlo —un escenario sin aeródromo real—, y
 * entonces solo cuentan la pista y el campo.
 */
export function superficieEn(
  escenario: Scenario,
  pavimento: Pavimento | null,
  x: number,
  z: number,
): Superficie {
  const aero: Aerodrome | undefined = escenario.aerodrome;
  if (!aero) {
    // Una pista inventada es de asfalto, y su rectángulo es el de siempre.
    const r = escenario.runway;
    const { along, across } = enEjesDePista(x, z, r.x, r.z, r.heading);
    return Math.abs(along) <= r.length / 2 && Math.abs(across) <= r.width / 2
      ? "asfalto"
      : "campo";
  }

  for (const pista of aero.runways) {
    if (!enLaPista(pista, x, z)) continue;
    return esDura(pista.surface) ? "asfalto" : "hierba";
  }

  if (pavimento?.hay(x, z)) {
    /*
     * Las calles y las plataformas van todas juntas: el mapa dice que hay
     * pavimento pero no de cuál, porque se pinta como un solo dibujo. Así que
     * manda lo que diga la primera plataforma del fichero y, si no lo dice
     * —OpenStreetMap muchas veces no lo dice—, lo que diga la pista: un campo
     * de hierba lo es entero, y uno de asfalto también.
     */
    const dicho = aero.aprons[0]?.surface;
    return esDura(dicho ?? aero.runways[0]?.surface) ? "asfalto" : "hierba";
  }

  return "campo";
}
