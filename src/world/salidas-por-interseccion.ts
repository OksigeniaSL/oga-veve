/**
 * **Desde qué calles deja su AIP despegar por intersección, y con cuánta
 * pista por delante.**
 *
 * La regla la escribe cada aeródromo en su AIP —AD 2.20 dice desde qué
 * calles, AD 2.13 cuánta pista queda desde cada una— y la tienen que cumplir
 * igual quien juega y el tráfico dibujado. Vivía solo en el plan de tierra
 * de quien juega, y el tráfico no la miraba: en Los Rodeos, que solo deja
 * salir desde la E-2 y la E-4, el reactor del tráfico salía por la E3 con
 * mil quinientos setenta metros por delante cuando pide dos mil doscientos.
 * Aquí está una vez, para los dos. Ver `Aerodrome.salidasPorInterseccion`.
 */

import type { Aerodrome } from "./aerodrome";
import type { Grafo } from "./rodaje";

/**
 * El nombre de una calle sin guiones ni espacios: el AIP de Los Rodeos
 * escribe «E-2» y OpenStreetMap «E2», y son la misma calle.
 */
export function nombreDeCalle(ref: string | null | undefined): string {
  return (ref ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * **La calle de una boca de la pista**: la primera con nombre que se
 * encuentra saliendo de ese nudo por las calles, sin irse lejos. En La Gomera
 * los dos ramales que llegan a la pista no lo llevan, y la A empieza unos
 * metros más allá. Cadena vacía si no hay ninguna con nombre cerca.
 */
export function calleDeLaBoca(grafo: Grafo, nudo: number): string {
  const vistos = new Set([nudo]);
  let frente = [nudo];
  for (let paso = 0; paso < 4 && frente.length; paso++) {
    const siguiente: number[] = [];
    for (const n of frente)
      for (const k of grafo.desde[n] ?? []) {
        const t = grafo.tramos[k]!;
        if (t.pista) continue;
        const nombre = nombreDeCalle(t.ref);
        if (nombre) return nombre;
        const otro = t.a === n ? t.b : t.a;
        if (!vistos.has(otro)) {
          vistos.add(otro);
          siguiente.push(otro);
        }
      }
    frente = siguiente;
  }
  return "";
}

/** Lo que dice el AIP de despegar desde una intersección concreta. */
export interface DesdeLaInterseccion {
  /** Si se puede despegar desde ahí. */
  readonly permitida: boolean;
  /**
   * La TORA que publica desde ahí, m, si la publica (AD 2.13). Sin ella, la
   * que dé la geometría.
   */
  readonly tora: number | null;
}

/**
 * **Si se puede despegar por `cabecera` desde la intersección de `calle`**, y
 * con cuánta pista según su AIP.
 *
 * - Sin dato, se puede: es lo que dicen casi todos los AIP callando.
 * - Con `permitidas: false`, nunca: en Lanzarote, «take-offs from runway
 *   intersections are not permitted».
 * - Con distancias publicadas por cabecera (`tora`), solo desde las que la
 *   tienen para esa cabecera, y con esa cifra. En Los Rodeos la E-2 vale
 *   para la 12 y la E-4 para la 30, que son las dos filas de su AD 2.13; la
 *   E-2 por la 30 dejaría seiscientos metros y no sale en ninguna tabla.
 * - Con solo la lista de calles (`soloDesde`), desde ésas, por las dos.
 */
export function desdeLaInterseccion(
  aero: Aerodrome,
  cabecera: string | null,
  calle: string,
): DesdeLaInterseccion {
  const regla = aero.salidasPorInterseccion;
  if (!regla) return { permitida: true, tora: null };
  if (!regla.permitidas) return { permitida: false, tora: null };
  const nombre = nombreDeCalle(calle);
  if (regla.tora) {
    const deLaCabecera = cabecera ? regla.tora[cabecera] : undefined;
    const fila = Object.entries(deLaCabecera ?? {}).find(([c]) => nombreDeCalle(c) === nombre);
    return fila ? { permitida: true, tora: fila[1] } : { permitida: false, tora: null };
  }
  if (regla.soloDesde?.length)
    return { permitida: regla.soloDesde.some((c) => nombreDeCalle(c) === nombre), tora: null };
  return { permitida: true, tora: null };
}

/**
 * **La cabecera desde la que se despega con este rumbo**, por su nombre: la
 * del umbral desde el que se va hacia el otro. `null` si la pista no tiene
 * los dos umbrales en sus datos. Es la cuenta de `cabeceraEnUso`, para quien
 * tiene el rumbo y no el escenario.
 */
export function cabeceraPorRumbo(aero: Aerodrome, rumbo: number): string | null {
  const pista = aero.runways[0];
  if (!pista) return null;
  const umbrales = Object.entries(pista.thresholds).filter(([, u]) => !!u?.xy);
  for (const [nombre, u] of umbrales) {
    const otro = umbrales.find(([n]) => n !== nombre)?.[1];
    if (!u?.xy || !otro?.xy) continue;
    // El fichero lleva la y al norte; el rumbo se cuenta desde el norte.
    const haciaElOtro =
      ((Math.atan2(otro.xy[0] - u.xy[0], otro.xy[1] - u.xy[1]) * 180) / Math.PI + 360) % 360;
    if (Math.abs(((haciaElOtro - rumbo + 540) % 360) - 180) < 90) return nombre;
  }
  return null;
}
