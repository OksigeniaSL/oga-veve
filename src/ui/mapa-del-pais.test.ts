/**
 * El mapa del país del hangar: que cada aeropuerto caiga en su país, y que
 * el mapa diga lo mismo que las fichas.
 *
 * Lo primero es la regla 4 aplicada a un dibujo: un punto fuera de la silueta
 * enseñaría un aeropuerto donde no está, y quien lo aprenda aquí lo
 * aprendería mal. Además caza el error de siempre en este repositorio —los
 * ejes cambiados, la latitud por la longitud—, que en un mapa de un país
 * pequeño saca el punto al océano.
 */

import { describe, expect, it } from "vitest";
import { SCENARIOS, scenarioById, destinosDe } from "../world/scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { SILUETAS, type Anillo } from "./siluetas";
import { anchoDeNumeroDePista, CAJA_DEL_NORTE, mapaDelPais, numerosDePista } from "./mapa-del-pais";
import { rutasDelMapa, destinosPosibles, destinosQueNoCaben } from "./hangar";

/** Si un punto cae dentro de un anillo: el rayo de toda la vida. */
function dentro(lon: number, lat: number, anillo: Anillo): boolean {
  let si = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]!;
    const [xj, yj] = anillo[j]!;
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      si = !si;
  }
  return si;
}

/** Los metros de un punto al borde más cercano de un anillo, a ojo de mapa. */
function alBorde(lon: number, lat: number, anillo: Anillo): number {
  const k = Math.cos((lat * Math.PI) / 180);
  let corto = Infinity;
  for (const [x, y] of anillo)
    corto = Math.min(corto, Math.hypot((x - lon) * k, y - lat) * 111195);
  return corto;
}

describe("el mapa del país", () => {
  it("cada aeródromo paraguayo cae dentro del Paraguay", () => {
    const py = SCENARIOS.filter((e) => e.pais === "py" && e.aerodrome);
    expect(py.length).toBeGreaterThan(4);
    for (const e of py) {
      const { lon, lat } = e.aerodrome!.origin;
      expect(
        SILUETAS.py.some((a) => dentro(lon, lat, a)),
        `${e.id} (${lat}, ${lon})`,
      ).toBe(true);
    }
  });

  it("y cada canario en su isla, o a un paso de la orilla", () => {
    /*
     * La silueta de las islas está simplificada a doscientos metros, y varios
     * aeropuertos canarios tienen la pista pegada al mar —El Hierro, La
     * Gomera, Lanzarote—, así que se perdona un kilómetro de orilla. Lo que
     * esto caza es una isla cambiada, que son decenas.
     */
    const canarios = SCENARIOS.filter(
      (e) => e.pais === "es" && e.aerodrome && e.aerodrome.origin.lat < 30,
    );
    expect(canarios.length).toBeGreaterThan(5);
    for (const e of canarios) {
      const { lon, lat } = e.aerodrome!.origin;
      const enTierra = SILUETAS.es.some((a) => dentro(lon, lat, a));
      const cerca = Math.min(...SILUETAS.es.map((a) => alBorde(lon, lat, a)));
      expect(enTierra || cerca < 1000, `${e.id} a ${Math.round(cerca)} m`).toBe(true);
    }
  });

  it("una raya por ruta, y a trazos las que este avión no hace", () => {
    const sitio = scenarioById("pettirossi");
    for (const avion of AIRCRAFT) {
      const rutas = rutasDelMapa(sitio, avion);
      // Las mismas que las fichas, ni una más ni una menos.
      expect(rutas.length).toBe(destinosDe(sitio).length);
      const html = mapaDelPais(sitio, SCENARIOS, rutas, sitio.id);
      const cabe = destinosPosibles(sitio, avion).length;
      const no = destinosQueNoCaben(sitio, avion).length;
      expect(html.match(/pais__ruta--cabe/g)?.length ?? 0, avion.id).toBe(cabe);
      expect(html.match(/pais__ruta--no/g)?.length ?? 0, avion.id).toBe(no);
      // Y cada destino al que llega se puede tocar en el mapa.
      for (const d of destinosPosibles(sitio, avion))
        expect(html, `${avion.id} → ${d.id}`).toContain(`data-destino="${d.id}"`);
    }
  });

  it("y el sitio de salida es la vuelta al campo", () => {
    const sitio = scenarioById("guarani");
    const html = mapaDelPais(sitio, SCENARIOS, rutasDelMapa(sitio, AIRCRAFT[0]!), sitio.id);
    expect(html).toContain(`pais__campo--salida`);
    expect(html).toContain(`data-destino="guarani"`);
  });

  it("Canarias no se estira hasta Madrid", () => {
    // Cuatro Vientos es de España, pero no cabe en el dibujo de las islas.
    const sitio = scenarioById("gran-canaria");
    const html = mapaDelPais(sitio, SCENARIOS, rutasDelMapa(sitio, AIRCRAFT[0]!), sitio.id);
    expect(html).not.toContain("LECU");
    expect(html).toContain("GCXO");
  });

  it("un sitio inventado no está en ningún mapa", () => {
    const sitio = SCENARIOS.find((e) => e.pais === "inventado")!;
    expect(mapaDelPais(sitio, SCENARIOS, [], sitio.id)).toBe("");
  });

  it("y Cuatro Vientos tiene la suya, la de Madrid", () => {
    const sitio = scenarioById("cuatro-vientos");
    const html = mapaDelPais(sitio, SCENARIOS, [], sitio.id);
    expect(html).toContain('data-region="madrid"');
    expect(html).toContain("LECU");
    expect(html).not.toContain("GCXO");
  });
});

/**
 * Los calcos: se suman y nunca se retiran. Lo que se busca son marcas que solo
 * pone un calco —el nombre del campo, la cota, la frecuencia—, no el texto
 * entero, que cambia con el idioma.
 */
describe("los calcos de la carta", () => {
  const sitio = scenarioById("tenerife-norte");
  const carta = (peldano: "dibujo" | "palabra" | "cifra" | "cabina") =>
    mapaDelPais(sitio, SCENARIOS, rutasDelMapa(sitio, AIRCRAFT[0]!), sitio.id, peldano);

  it("en el del dibujo no hay ni nombres, ni cifras, ni radio; el indicativo sí", () => {
    const html = carta("dibujo");
    expect(html).not.toContain("pais__rotulo-nombre");
    expect(html).not.toContain("pais__elev");
    expect(html).not.toContain("pais__radio");
    expect(html).not.toContain("pais__cifra-ruta");
    // El indicativo ya se veía en el mapa del país antes de ser carta.
    expect(html).toContain("GCXO");
  });

  it("los nombres llegan con Tukã, las cifras con Taguato y la radio con Ruvicha", () => {
    expect(carta("palabra")).toContain("pais__rotulo-nombre");
    expect(carta("palabra")).not.toContain("pais__elev");
    const cifra = carta("cifra");
    expect(cifra).toContain("pais__rotulo-nombre");
    expect(cifra).toContain("pais__elev");
    expect(cifra).toContain(" NM</span>");
    expect(cifra).not.toContain("pais__radio");
    const cabina = carta("cabina");
    expect(cabina).toContain("pais__elev");
    expect(cabina).toContain("pais__radio");
    expect(cabina).toContain("VAR ");
  });

  it("y la frecuencia se escribe como la imprime el AIP, con su punto", () => {
    // AD 2-GCXO-9: «118.700 MHz»; AD 2.1-7 de la DINAC: «118.1 MHZ».
    expect(carta("cabina")).toContain("TWR 118.700");
    const asuncion = scenarioById("pettirossi");
    const html = mapaDelPais(asuncion, SCENARIOS, rutasDelMapa(asuncion, AIRCRAFT[0]!), asuncion.id, "cabina");
    expect(html).toContain("TWR 118.1");
    expect(html).toContain("118.1 MHZ");
  });
});

/**
 * Los números de pista del dibujo de la ficha: en Gran Canaria, el 03L y el
 * 03R caían uno encima del otro en medio de las dos paralelas, porque iban
 * cada uno al lado del otro.
 */
describe("los números de pista de la ficha", () => {
  it("no se pisan y caen dentro del dibujo, en todos los campos", () => {
    for (const e of SCENARIOS.filter((s) => s.aerodrome)) {
      const n = numerosDePista(e);
      const cajas = n.map((u) => {
        const w = anchoDeNumeroDePista(u.nombre);
        return { u, x0: u.x - w / 2, x1: u.x + w / 2, y0: u.y - 5.5, y1: u.y + 5.5 };
      });
      for (const c of cajas) {
        const n = CAJA_DEL_NORTE;
        expect(c.x0 < n.x1 && n.x0 < c.x1 && c.y0 < n.y1 && n.y0 < c.y1, `${e.id} ${c.u.nombre} pisa el norte`).toBe(false);
        expect(c.x0 >= 0 && c.x1 <= 100 && c.y0 >= 0 && c.y1 <= 100, `${e.id} ${c.u.nombre}`).toBe(true);
        for (const o of cajas)
          if (o !== c)
            expect(
              c.x0 < o.x1 && o.x0 < c.x1 && c.y0 < o.y1 && o.y0 < c.y1,
              `${e.id}: ${c.u.nombre} pisa ${o.u.nombre}`,
            ).toBe(false);
      }
    }
  });

  it("y el de la izquierda va a la izquierda de quien aterriza por él", () => {
    // En Gran Canaria la 03L es la del oeste: su número, a poniente del 03R.
    const n = numerosDePista(scenarioById("gran-canaria"));
    const x = (nombre: string): number => n.find((u) => u.nombre === nombre)!.x;
    expect(x("03L")).toBeLessThan(x("03R"));
    // Y desde el norte, quien aterriza por el 21 mira al sur: su izquierda es el este.
    expect(x("21L")).toBeGreaterThan(x("21R"));
  });
});
