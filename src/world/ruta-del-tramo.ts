/**
 * **El plan de un tramo, con lo publicado de los dos campos puesto en este
 * mundo**, y el crucero al que se vuela.
 *
 * Vivía dentro de `game.ts`, y por eso las pruebas lo copiaban: una copia con
 * otra pista, otro umbral u otro relieve prueba otra cosa. Aquí está sin
 * escena y sin avión, para que el juego y las pruebas tracen **el mismo**
 * plan. Lo que depende del juego —la cota del asfalto, el relieve que conoce—
 * se le pasa.
 *
 * Los puntos se colocan con la misma proyección que los aeródromos vecinos
 * —`dondeCae` desde el origen del mundo—: un BUNIX corrido respecto a la
 * pista de Los Rodeos dejaría el tramo final torcido. El umbral no es el de
 * la carta sino el del aeródromo del juego, que es donde se toca.
 */

import type { AircraftConfig } from "../flight/aircraft";
import {
  PIE,
  cruceroDelPlan,
  minimaEnCrucero,
  trazar,
  type Fijo,
  type Ruta,
  type Terreno,
} from "../flight/ruta";
import {
  enLaPistaDe,
  umbralEnUso,
  type CampoEnElMundo,
} from "./campo-del-vuelo";
import { dondeCae, type Sitio } from "./entre-aerodromos";
import {
  ramasDeLlegada,
  salidasEnElMundo,
  subidaSinCarta,
  type PistaDeSalida,
  type Publicado,
} from "./procedimientos";
import { oaciDe } from "./scenarios";
import { cabeceraEnUso } from "./terrain";

/** Lo que el plan necesita saber del juego. */
export interface DelJuego {
  /** El origen del mundo en el que se vuela: el del campo de casa. */
  readonly origen: Sitio;
  /**
   * El avión, si el plan se rehace volando —un desvío, otra pista en uso a
   * mitad de camino—: entonces sale de aquí y no de la cabecera. `null` en
   * tierra.
   */
  readonly enElAire: { readonly x: number; readonly z: number; readonly altitud: number } | null;
  /** La cota del asfalto de un campo en un punto del mundo, m. */
  readonly cotaDePista: (campo: CampoEnElMundo, x: number, z: number) => number;
  /** El relieve que conoce el juego, o `null` para no mirarlo. */
  readonly cota: Terreno["cota"] | null;
  /** Lo más alto que sube el avión, m. */
  readonly techo: number;
  /**
   * Si el avión vuela con reglas visuales: la avioneta de escuela y el
   * fumigador. Ver `reglasDeVuelo` en `flight/aircraft.ts`.
   */
  readonly visual?: boolean;
  /**
   * La ficha del avión, para que el crucero sea **el nivel que ahorra**. Ver
   * `nivelQueAhorra` en `flight/nivel-que-ahorra.ts`.
   */
  readonly ficha?: AircraftConfig;
}

/**
 * El plan de `salida` a `llegada` por las cabeceras en uso de cada uno.
 *
 * En tierra sale **del final de la pista**, subiendo recto, con su salida
 * publicada; en el aire, desde donde está el avión directo a la aproximación,
 * que es lo que hace un ordenador de vuelo cuando se decide un desvío. Ver
 * `trazar`.
 *
 * Salía de la cabecera de despegue, donde empieza la carrera, y de ahí
 * directo al primer punto de la salida. Despegando por la 30 de Los Rodeos
 * ese punto es el VOR, a espaldas del avión, y la raya nacía en la cabecera
 * y salía hacia el nordeste: «debería nacer en la salida, no en la 30, sino
 * en la 12 en este caso en que despego hacia el oeste». Lo de verdad —y lo
 * que pinta cualquier ordenador de vuelo— empieza en el final de la pista y
 * sube con su rumbo hasta donde la carta deja virar. Ver `salidasEnElMundo`.
 */
export function rutaDelTramo(
  salida: CampoEnElMundo,
  llegada: CampoEnElMundo,
  juego: DelJuego,
): Ruta {
  const cabSalida = cabeceraEnUso(salida.escenario);
  const cabLlegada = cabeceraEnUso(llegada.escenario);
  const aMundo = (p: Publicado): Fijo => ({
    ...dondeCae(juego.origen, p),
    nombre: p.nombre,
    papel: p.papel,
    minima: p.minimaPies === null ? null : p.minimaPies * PIE,
  });
  const [ux, uz] = umbralEnUso(llegada);
  const umbral: Fijo = {
    x: ux,
    z: uz,
    nombre: `RW${cabLlegada ?? ""}`,
    papel: "umbral",
    minima: null,
  };
  const ramas = ramasDeLlegada(
    oaciDe(llegada.escenario),
    cabLlegada,
    umbral,
    llegada.pista.heading,
    aMundo,
  );
  let desde: Fijo;
  let cotaDeSalida: number;
  let pista: PistaDeSalida | null = null;
  if (juego.enElAire === null) {
    const [x, z] = finalDeLaPista(salida);
    desde = {
      x,
      z,
      nombre: `RW${cabSalida ?? ""}`,
      papel: "despegue",
      minima: null,
      carrera: salida.pista.length,
    };
    cotaDeSalida = juego.cotaDePista(salida, x, z);
    pista = { x, z, rumbo: salida.pista.heading, cota: cotaDeSalida };
  } else {
    const { x, z, altitud } = juego.enElAire;
    desde = { x, z, nombre: "PPOS", papel: "aqui", minima: null };
    cotaDeSalida = altitud;
  }
  const salidas = pista
    ? salidasEnElMundo(oaciDe(salida.escenario), cabSalida, pista, aMundo)
    : [];
  return trazar({
    desde,
    salidas,
    ...(pista ? { subida: subidaSinCarta(pista) } : {}),
    ramas,
    umbral,
    cotaDelUmbral: juego.cotaDePista(llegada, ux, uz),
    /*
     * Con el relieve del mundo entero —el fino, el de los destinos y el del
     * horizonte—: la ruta más corta de Los Rodeos a La Gomera pasa a una
     * milla del Teide. Ver `libra` en `flight/ruta.ts`.
     */
    ...(juego.cota
      ? {
          terreno: {
            cota: juego.cota,
            techo: juego.techo,
            cotaDeSalida,
            visual: juego.visual === true,
          },
        }
      : {}),
  });
}

/**
 * **El final de la pista de salida**, en el mundo: donde acaba el asfalto por
 * delante del que despega (el DER de la OACI). Es el otro extremo del de la
 * cabecera en uso: `enLaPistaDe` cuenta desde el centro hacia atrás, y la
 * cabecera está a media pista por detrás.
 */
export function finalDeLaPista(salida: CampoEnElMundo): readonly [number, number] {
  return enLaPistaDe(salida, -salida.pista.length / 2);
}

/**
 * **El crucero de este plan**, m: el que usa el plan para el punto de descenso
 * y el que anuncia la comandante, que es el mismo. Ver `cruceroDelPlan` en
 * `flight/ruta.ts`, con la mínima en ruta del relieve que conoce el juego.
 */
export function cruceroDelTramo(
  ruta: Ruta,
  salida: CampoEnElMundo,
  juego: Pick<DelJuego, "cotaDePista" | "cota" | "techo" | "visual" | "ficha">,
): number {
  const a = ruta.fijos[0];
  if (!a) return 0;
  return cruceroDelPlan(
    ruta,
    {
      techo: juego.techo,
      cotaDeSalida: juego.cotaDePista(salida, a.x, a.z),
      declinacion: salida.escenario.magneticVariation ?? 0,
      visual: juego.visual === true,
      ...(juego.ficha ? { ficha: juego.ficha } : {}),
    },
    juego.cota ? minimaEnCrucero(ruta, juego.cota, juego.visual === true) : null,
  );
}
