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
import { ramasDeLlegada, salidasDe, type Publicado } from "./procedimientos";
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
 * En tierra sale de la mitad de la pista con su salida publicada; en el aire,
 * desde donde está el avión directo a la aproximación, que es lo que hace un
 * ordenador de vuelo cuando se decide un desvío. Ver `trazar`.
 */
export function rutaDelTramo(
  salida: CampoEnElMundo,
  llegada: CampoEnElMundo,
  juego: DelJuego,
): Ruta {
  const cabSalida = cabeceraEnUso(salida.escenario);
  const cabLlegada = cabeceraEnUso(llegada.escenario);
  /*
   * **Cada punto publicado, puesto desde su propio campo.**
   *
   * Se ponían todos desde el origen del mundo, y el aeródromo de llegada no:
   * ése llega con su geometría medida desde **su** origen —la proyección del
   * extractor, con el coseno de su latitud— y corrido entero hasta donde cae.
   * Son dos proyecciones distintas, y a cien kilómetros la diferencia ya
   * tuerce la final: medido en todos los tramos del juego, el punto de final
   * caía hasta 137 m a un lado del eje y el último tramo iba hasta 0,84° de la
   * pista —de Pedro Juan Caballero a Asunción—, y de Fuerteventura a Gando 55
   * m y 0,28°. Enrique lo voló así: «las líneas nunca me estabilizan con la
   * pista; suele salirse el avión y tengo que llevarlo yo a ojo».
   *
   * Un punto de la carta de un campo se pone con la proyección de ese campo,
   * igual que su pista: entonces la final cae sobre el eje, que es lo que
   * dice la carta. Ver `final-por-el-eje.test.ts`.
   */
  const ponerDesde = (campo: CampoEnElMundo) => {
    const suyo = campo.escenario.aerodrome?.origin ?? null;
    return (p: Publicado): Fijo => {
      const d = suyo
        ? (() => {
            const c = dondeCae(suyo, p);
            return { x: campo.desplazamiento.x + c.x, z: campo.desplazamiento.z + c.z };
          })()
        : dondeCae(juego.origen, p);
      return {
        ...d,
        nombre: p.nombre,
        papel: p.papel,
        minima: p.minimaPies === null ? null : p.minimaPies * PIE,
      };
    };
  };
  const aMundo = ponerDesde(llegada);
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
  if (juego.enElAire === null) {
    const [x, z] = enLaPistaDe(salida, salida.pista.length / 2);
    desde = { x, z, nombre: `RW${cabSalida ?? ""}`, papel: "despegue", minima: null };
    cotaDeSalida = juego.cotaDePista(salida, x, z);
  } else {
    const { x, z, altitud } = juego.enElAire;
    desde = { x, z, nombre: "PPOS", papel: "aqui", minima: null };
    cotaDeSalida = altitud;
  }
  // Y las de la salida, desde el campo de salida, por lo mismo.
  const salidas =
    juego.enElAire === null
      ? salidasDe(oaciDe(salida.escenario), cabSalida).map((r) => r.map(ponerDesde(salida)))
      : [];
  return trazar({
    desde,
    salidas,
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
