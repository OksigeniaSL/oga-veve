/**
 * **El país, visto desde arriba, con las rutas que se pueden volar.**
 *
 * Contado jugando: «no me deja elegir otro aeropuerto y quiero viajar por todo
 * Paraguay». El paso de «¿a dónde vas?» enseñaba fichas —el plano de cada
 * aeródromo, su distancia, su combustible—, y una lista de fichas no dice lo
 * que dice un mapa: **dónde está cada sitio**. Que Ciudad del Este queda en la
 * otra punta del país, que al Chaco se va cruzando el río, que de Asunción
 * salen rutas en abanico y de Pedro Juan una sola.
 *
 * Y se dice sin leer, que es la regla 2: la silueta del país se reconoce como
 * la bandera, la raya sale del punto de salida y llega al de destino, y la
 * raya de un avión que no llega va a trazos y apagada. Los indicativos van al
 * lado de cada punto para quien lee, en OACI y sin traducir, que es como los
 * va a encontrar en una carta.
 *
 * ## Lo que no es
 *
 * No es el mando: los mandos son las fichas de abajo, con su porqué y su
 * propuesta, y son los que recorre el teclado y leen los lectores. Los puntos
 * del mapa se pueden tocar —con el dedo es lo natural— y hacen lo mismo que su
 * ficha, pero el mapa entero va oculto a los lectores para no decirlo todo
 * dos veces.
 *
 * ## De dónde sale cada cosa
 *
 * La silueta, de Natural Earth (dominio público, ver `siluetas.ts`). Los
 * puntos, del origen de cada aeródromo extraído —el mismo con el que se monta
 * el mundo—, así que un punto mal puesto aquí sería un aeropuerto mal puesto
 * en el juego, y lo vigila `mapa-del-pais.test.ts`.
 */

import type { Scenario } from "../world/scenarios";
import { SILUETAS, type Anillo } from "./siluetas";

/** Una ruta desde el sitio de salida, tal como la ve este avión. */
export interface RutaEnElMapa {
  readonly destino: Scenario;
  /** Si este avión llega a ese campo. */
  readonly cabe: boolean;
  /**
   * El avión que sí llegaría, si este no: tocar el punto acepta la propuesta,
   * como tocar su ficha. `null` si no hay ninguno.
   */
  readonly con: string | null;
}

/** Longitud y latitud de un escenario, si es un aeródromo de verdad. */
const dondeEsta = (e: Scenario): readonly [number, number] | null =>
  e.aerodrome ? [e.aerodrome.origin.lon, e.aerodrome.origin.lat] : null;

/**
 * La proyección del mapa: equirrectangular al coseno de la latitud media.
 *
 * Es la misma que usa el juego para colocar un aeródromo visto desde otro
 * —ver `entre-aerodromos.ts`—, así que las distancias que se ven aquí guardan
 * la proporción de las que se vuelan.
 */
function proyeccion(anillos: readonly Anillo[], puntos: readonly (readonly [number, number])[]) {
  let oeste = Infinity;
  let este = -Infinity;
  let sur = Infinity;
  let norte = -Infinity;
  const mirar = ([lon, lat]: readonly [number, number]) => {
    oeste = Math.min(oeste, lon);
    este = Math.max(este, lon);
    sur = Math.min(sur, lat);
    norte = Math.max(norte, lat);
  };
  for (const a of anillos) for (const p of a) mirar(p);
  for (const p of puntos) mirar(p);
  const k = Math.cos((((sur + norte) / 2) * Math.PI) / 180);
  // Un margen del cinco por ciento, para que ningún punto muera en el filo.
  const margen = Math.max(este - oeste, norte - sur) * 0.05;
  const x0 = (oeste - margen) * k;
  const y0 = -(norte + margen);
  const ancho = (este - oeste + 2 * margen) * k;
  const alto = norte - sur + 2 * margen;
  return {
    ancho,
    alto,
    xy: ([lon, lat]: readonly [number, number]): [number, number] => [
      lon * k - x0,
      -lat - y0,
    ],
  };
}

const r3 = (n: number): string => (Math.round(n * 1000) / 1000).toString();

/**
 * El mapa del país del sitio de salida, en HTML: la silueta y las rayas en
 * SVG, y los campos como botones puestos encima en porcentaje.
 *
 * `campos` son todos los aeródromos de verdad de ese país —con ruta o sin
 * ella—, porque también enseña algo ver que un campo existe y todavía no se
 * puede ir a él desde aquí. `elegido` es el destino de ahora; el propio sitio
 * es la vuelta al campo.
 *
 * Vacío si el sitio no es de un país con silueta: los escenarios inventados
 * no están en ningún mapa.
 */
export function mapaDelPais(
  sitio: Scenario,
  campos: readonly Scenario[],
  rutas: readonly RutaEnElMapa[],
  elegido: string,
): string {
  if (sitio.pais === "inventado") return "";
  const anillos = SILUETAS[sitio.pais];
  const aqui = dondeEsta(sitio);
  if (!aqui) return "";
  /*
   * Y solo los que caen en el dibujo, con un grado de margen: la silueta de
   * España aquí es Canarias, y Cuatro Vientos —que es de España y está en
   * Madrid— estiraría el mapa dos mil kilómetros para enseñar un punto sin
   * rutas.
   */
  const dentro = ([lon, lat]: readonly [number, number]): boolean =>
    anillos.some((a) => {
      const lons = a.map((p) => p[0]);
      const lats = a.map((p) => p[1]);
      return (
        lon > Math.min(...lons) - 1 &&
        lon < Math.max(...lons) + 1 &&
        lat > Math.min(...lats) - 1 &&
        lat < Math.max(...lats) + 1
      );
    });
  const conSitio = campos.flatMap((e) => {
    const p = dondeEsta(e);
    return p && dentro(p) ? [{ e, p }] : [];
  });
  const { ancho, alto, xy } = proyeccion(
    anillos,
    conSitio.map((c) => c.p),
  );
  const tierra = anillos
    .map(
      (a) =>
        "M" +
        a
          .map((p) => {
            const [x, y] = xy(p);
            return `${r3(x)} ${r3(y)}`;
          })
          .join("L") +
        "Z",
    )
    .join("");

  const [sx, sy] = xy(aqui);
  const rayas = rutas
    .map(({ destino, cabe }) => {
      const p = dondeEsta(destino);
      if (!p) return "";
      const [dx, dy] = xy(p);
      const clase = [
        "pais__ruta",
        cabe ? "pais__ruta--cabe" : "pais__ruta--no",
        destino.id === elegido ? "pais__ruta--elegida" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<line class="${clase}" x1="${r3(sx)}" y1="${r3(sy)}" x2="${r3(dx)}" y2="${r3(dy)}" />`;
    })
    .join("");

  const enPorcentaje = (p: readonly [number, number]): string => {
    const [x, y] = xy(p);
    return `left: ${((x / ancho) * 100).toFixed(2)}%; top: ${((y / alto) * 100).toFixed(2)}%`;
  };
  const puntos = conSitio
    .map(({ e, p }) => {
      const oaci = e.aerodrome?.id ?? "";
      const ruta = rutas.find((r) => r.destino.id === e.id);
      const esSalida = e.id === sitio.id;
      const clases = [
        "pais__campo",
        esSalida ? "pais__campo--salida" : "",
        esSalida
          ? ""
          : ruta
            ? ruta.cabe
              ? "pais__campo--cabe"
              : "pais__campo--no"
            : "pais__campo--sin-ruta",
        e.id === elegido ? "pais__campo--elegido" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const rotulo = `<span class="pais__oaci">${oaci}</span>`;
      /*
       * El de salida es la vuelta al campo; uno con ruta, ese destino; uno al
       * que este avión no llega, la propuesta del que sí —como su ficha—; y
       * uno sin ruta desde aquí no se toca: se ve, y ya.
       */
      if (esSalida || ruta?.cabe)
        return `<button class="${clases}" type="button" tabindex="-1"
          data-destino="${e.id}" style="${enPorcentaje(p)}">${rotulo}</button>`;
      if (ruta && ruta.con)
        return `<button class="${clases}" type="button" tabindex="-1"
          data-destino-lejos="${e.id}" data-con="${ruta.con}" style="${enPorcentaje(p)}">${rotulo}</button>`;
      return `<span class="${clases}" style="${enPorcentaje(p)}">${rotulo}</span>`;
    })
    .join("");

  return `
    <div class="pais${ancho / alto > 1.6 ? " pais--apaisado" : ""}" aria-hidden="true"
         style="--proporcion: ${r3(ancho / alto)}">
      <div class="pais__lienzo">
        <svg class="pais__dibujo" viewBox="0 0 ${r3(ancho)} ${r3(alto)}"
             preserveAspectRatio="none" focusable="false">
          <path class="pais__tierra" d="${tierra}" />
          ${rayas}
        </svg>
        ${puntos}
      </div>
    </div>`;
}
