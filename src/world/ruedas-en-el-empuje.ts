/**
 * **Por dónde pisan las ruedas de un avión que sale empujado** (H81, ADR 0025).
 *
 * El tractor deja el avión en la calle, y entre el puesto y la calle hay plataforma. En
 * Barajas el dibujo la tenía a tiras y el JAZ 90 que salía del 532 acababa el empuje
 * pisando hierba: nadie lo miraba, que el empuje se juzga por la raya y por las paredes.
 * Un empuje que saca una rueda del pavimento no es bueno, lleve donde lleve, y esto lo
 * dice: lo usan el plan (`saleBienDeEspaldas` y `parDeSalida`), el barrido de
 * `empuje-hasta-la-calle.test.ts` y `empuje-sobre-pavimento.test.ts`.
 *
 * Coordenadas del mundo, como en `remolque.ts`: `x` al este y `z` al sur, m; rumbos en
 * radianes. El pavimento se pregunta en las de la ficha, con la `y` al norte.
 */
import type { AircraftConfig } from "../flight/aircraft";
import type { Punto } from "./aerodrome";
import { mediaViaDe, morroDe } from "./rueda-de-morro";

/** Dónde está y hacia dónde mira un avión: lo que tiene cada pose de un empuje. */
export interface EnElSuelo {
  readonly x: number;
  readonly z: number;
  readonly rumbo: number;
}

type ConRuedas = Pick<
  AircraftConfig,
  "id" | "batalla" | "mainWheelsAft" | "mainGearAft" | "actitudEnTresPuntos" | "ruedasPrincipales"
>;

/** **Las tres ruedas que se miran**: la de morro y las dos principales, la de cada lado. */
export function ruedasEn(avion: ConRuedas, q: EnElSuelo): { readonly x: number; readonly z: number }[] {
  const n = { x: Math.sin(q.rumbo), z: -Math.cos(q.rumbo) };
  const lado = { x: -n.z, z: n.x };
  const delante = morroDe(avion).rueda;
  const atras = delante - avion.batalla;
  const via = mediaViaDe(avion);
  return [
    { x: q.x + n.x * delante, z: q.z + n.z * delante },
    { x: q.x + n.x * atras + lado.x * via, z: q.z + n.z * atras + lado.z * via },
    { x: q.x + n.x * atras - lado.x * via, z: q.z + n.z * atras - lado.z * via },
  ];
}

/**
 * Lo que puede quedar una rueda al otro lado del borde dibujado y darse por dentro, m: el
 * borde es una línea de OpenStreetMap, simplificada a medio metro.
 */
export const AL_BORDE_DEL_PAVIMENTO = 0.5;

/** Si una rueda en `p` pisa pavimento: ahí mismo, o a menos de `AL_BORDE_DEL_PAVIMENTO`. */
function pisa(pavimento: (p: Punto) => boolean, p: { readonly x: number; readonly z: number }): boolean {
  if (pavimento([p.x, -p.z])) return true;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    if (pavimento([p.x + Math.cos(a) * AL_BORDE_DEL_PAVIMENTO, -p.z + Math.sin(a) * AL_BORDE_DEL_PAVIMENTO])) return true;
  }
  return false;
}

/** **Cuántas ruedas pisan fuera del pavimento** con el avión ahí. */
export function ruedasFuera(avion: ConRuedas, q: EnElSuelo, pavimento: (p: Punto) => boolean): number {
  let fuera = 0;
  for (const r of ruedasEn(avion, q)) if (!pisa(pavimento, r)) fuera++;
  return fuera;
}

/**
 * **Cuánto del empuje va con alguna rueda fuera del pavimento**, m, y cuántas ruedas quedan
 * fuera al acabar. `pavimento` es el de `enElPavimentoDe`: el dibujado, sin holgura.
 *
 * El puesto en sí no cuenta: se mira desde que el avión se mueve. Un puesto fuera del
 * asfalto no es de los que se usan (`puestosEnElPavimento`).
 */
export function fueraDelPavimento(
  avion: ConRuedas,
  poses: readonly EnElSuelo[],
  pavimento: (p: Punto) => boolean,
): { readonly metros: number; readonly alAcabar: number } {
  let metros = 0;
  for (let i = 1; i < poses.length; i++) {
    const a = poses[i - 1]!;
    const b = poses[i]!;
    if (ruedasFuera(avion, b, pavimento) > 0) metros += Math.hypot(b.x - a.x, b.z - a.z);
  }
  const fin = poses.at(-1);
  return { metros, alAcabar: fin ? ruedasFuera(avion, fin, pavimento) : 0 };
}

/** **Si el empuje va entero sobre pavimento**, hasta el final y al acabar. Ver `fueraDelPavimento`. */
export function empujaSobrePavimento(
  avion: ConRuedas,
  poses: readonly EnElSuelo[],
  pavimento: (p: Punto) => boolean,
): boolean {
  const { metros, alAcabar } = fueraDelPavimento(avion, poses, pavimento);
  return metros === 0 && alAcabar === 0;
}
