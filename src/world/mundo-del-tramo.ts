/**
 * **Lo que hay que tener antes de poner otro mundo**: su relieve, su ciudad y
 * sus fotos, los mismos ficheros que se bajan al arrancar en ese sitio. Lo pide
 * el salto bajo tapa del vuelo largo (ADR 0023) y lo espera con su red: ver
 * `EsperaDelSalto`.
 *
 * Sin tocar el juego: esto solo baja. Se pone después, de una vez y con la
 * pantalla opaca, en `ponerElMundo` de `game.ts`.
 */

import type { Ciudad } from "./ciudad";
import { cargarCiudad } from "./ciudades";
import { cargarOrtofoto, type Ortofoto } from "./ortofoto";
import { conRelieve } from "./relieve";
import type { Scenario } from "./scenarios";

/**
 * **Por debajo de estos metros por píxel, la foto ya enseña la ciudad** y no se
 * sortean casas encima. Ver el porqué en `main.ts`, que es quien lo decide al
 * arrancar.
 */
export const FINA_DE_VERDAD = 4;

/** Si esa foto ya enseña la ciudad. */
export function laFotoEnsenaLaCiudad(foto: Ortofoto | undefined): boolean {
  return foto !== undefined && (foto.ficha.metrosPorPixel ?? Infinity) <= FINA_DE_VERDAD;
}

/** Un mundo con todo lo suyo, listo para ponerlo. */
export interface MundoCargado {
  readonly escenario: Scenario;
  /** Su rejilla de ciudad, para las luces de noche aunque la foto ya la enseñe. */
  readonly ciudad: Ciudad | undefined;
  readonly lejos: Ortofoto | undefined;
  readonly cerca: Ortofoto | undefined;
  readonly medio: Ortofoto | undefined;
  readonly horizonte: Ortofoto | undefined;
}

/**
 * **Baja un mundo**, o `null` si no se puede poner. Un mundo sin su relieve
 * medido no se pone: `conRelieve` lo devolvería tal cual y el terreno se
 * inventaría uno, que es lo último que tiene que aparecer debajo de un avión al
 * destapar. Las fotos pueden no estar: entonces el suelo se dibuja, como al
 * arrancar sin ellas.
 */
export async function cargarElMundo(base: Scenario, conFotos: boolean): Promise<MundoCargado | null> {
  const nada = Promise.resolve(undefined);
  /*
   * **Y los anillos también, y no después**: al arrancar llegan con el juego ya
   * en marcha y se ve cómo se ponen; aquí no se destapa hasta que están, que es
   * lo que quiere decir que el mundo no se vea a medio montar.
   */
  const [conMapa, ciudad, lejos, cerca, medio, horizonte] = await Promise.all([
    conRelieve(base, true),
    cargarCiudad(base.id),
    conFotos ? cargarOrtofoto(base.id, "lejos") : nada,
    conFotos ? cargarOrtofoto(base.id, "cerca") : nada,
    conFotos ? cargarOrtofoto(base.id, "medio") : nada,
    conFotos ? cargarOrtofoto(base.id, "horizonte") : nada,
  ]);
  if (!conMapa.relieve) return null;
  return {
    escenario: ciudad && !laFotoEnsenaLaCiudad(cerca ?? lejos) ? { ...conMapa, ciudad } : conMapa,
    ciudad,
    lejos,
    cerca,
    medio,
    horizonte,
  };
}
