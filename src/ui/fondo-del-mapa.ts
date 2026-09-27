/**
 * Lo que hay debajo del plano donde no llega el relieve: la costa y los ríos.
 *
 * El plano pintaba el relieve cargado y, fuera de él, una franja gris a rayas
 * —«aquí no hay datos»—, que es honesto y a la vez deja el mapa cortado justo
 * donde se está volando: saliendo de La Palma hacia Los Rodeos, media isla de
 * Tenerife se quedaba detrás de las rayas. Un mapa de verdad no se acaba donde
 * se acaba lo que uno lleva cargado.
 *
 * Lo que va aquí es **la costa de Natural Earth**, la misma de las siluetas
 * del hangar, y en el Paraguay además **sus ríos**: fuera del relieve, en
 * Canarias lo que no es isla es mar, y en el Paraguay todo es tierra y lo que
 * orienta son el río Paraguay y el Paraná. No hay cotas —para eso está el
 * relieve—: es el dibujo plano de una carta, y encima va el relieve donde lo
 * hay.
 *
 * Solo donde las siluetas cubren el sitio. Cuatro Vientos está en España y
 * sus siluetas son las de Canarias: ahí se siguen pintando las rayas.
 */

import { dondeCae, type Sitio } from "../world/entre-aerodromos";
import { SILUETAS, type Anillo } from "./siluetas";
import { RIOS } from "./rios";

/** Un punto del mundo, en metros. */
export interface Punto {
  readonly x: number;
  readonly z: number;
}

/** El fondo de un sitio, ya en las coordenadas de su mundo. */
export interface FondoDelMapa {
  /** Qué hay fuera de las siluetas: el mar en las islas, tierra en el país. */
  readonly fuera: "mar" | "tierra";
  /** Las tierras: las islas, o el país. */
  readonly tierras: readonly (readonly Punto[])[];
  /**
   * Si el contorno es una **frontera** y se dibuja como tal. En el Paraguay
   * sí: fuera también es tierra, y lo que separa es una raya. En las islas
   * el contorno es la costa y ya se ve por el color.
   */
  readonly frontera: boolean;
  /** Los ríos, como trazos. */
  readonly rios: readonly (readonly Punto[])[];
}

/** El rectángulo que cubren unas siluetas, con su orla, en grados. */
function caja(anillos: readonly Anillo[], orla: number) {
  let oeste = Infinity;
  let este = -Infinity;
  let sur = Infinity;
  let norte = -Infinity;
  for (const a of anillos)
    for (const [lon, lat] of a) {
      oeste = Math.min(oeste, lon);
      este = Math.max(este, lon);
      sur = Math.min(sur, lat);
      norte = Math.max(norte, lat);
    }
  return { oeste: oeste - orla, este: este + orla, sur: sur - orla, norte: norte + orla };
}

const cubre = (c: ReturnType<typeof caja>, s: Sitio): boolean =>
  s.lon >= c.oeste && s.lon <= c.este && s.lat >= c.sur && s.lat <= c.norte;

const hechos = new Map<string, FondoDelMapa | null>();

/**
 * El fondo del plano para un mundo con este origen, o `null` si las siluetas
 * no llegan hasta allí.
 *
 * Con la misma proyección que el resto del mundo —`dondeCae`—: una costa
 * corrida respecto al relieve que pinta encima enseñaría dos islas.
 */
export function fondoPara(pais: string, origen: Sitio): FondoDelMapa | null {
  const clave = `${pais}:${origen.lat}:${origen.lon}`;
  if (hechos.has(clave)) return hechos.get(clave) ?? null;
  const aMundo = (anillo: readonly (readonly [number, number])[]): Punto[] =>
    anillo.map(([lon, lat]) => dondeCae(origen, { lat, lon }));
  let fondo: FondoDelMapa | null = null;
  if (pais === "es" && cubre(caja(SILUETAS.es, 3), origen)) {
    fondo = {
      fuera: "mar",
      tierras: SILUETAS.es.map(aMundo),
      frontera: false,
      rios: [],
    };
  } else if (pais === "py" && cubre(caja(SILUETAS.py, 3), origen)) {
    fondo = {
      fuera: "tierra",
      tierras: SILUETAS.py.map(aMundo),
      frontera: true,
      rios: RIOS.py.map(aMundo),
    };
  }
  hechos.set(clave, fondo);
  return fondo;
}
