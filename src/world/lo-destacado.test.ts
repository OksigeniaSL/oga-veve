/**
 * **Que lo destacado esté donde dice estar, y que tenga qué decir.**
 *
 * La lista se elige a mano, pero dónde está cada cosa no: sale de
 * OpenStreetMap o de Natural Earth, con la referencia al lado. Lo que se
 * comprueba aquí es lo que se puede comprobar sin volar:
 *
 * - que cada punto cae en su zona, que un signo cambiado pone el Teide en el
 *   Atlántico sin romper nada;
 * - que las cumbres están **donde el relieve tiene una cumbre**: el mapa de
 *   alturas del juego, leído del disco, tiene que subir hasta cerca de la cota
 *   que dice el dato. Es la prueba de que las coordenadas son las de verdad;
 * - y que cada sitio tiene su frase, en los dos registros y en inglés.
 */

import { describe, expect, it } from "vitest";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import { dondeCae } from "./entre-aerodromos";
import { DESTACADOS, destacadosDesde } from "./lo-destacado";
import { relieveDe } from "./relieve-en-disco";
import { SCENARIOS } from "./scenarios";

/** El recuadro de cada zona, con margen: las islas y el país entero. */
const ZONA = {
  canarias: { lat: [27.5, 29.5], lon: [-18.3, -13.3] },
  paraguay: { lat: [-27.8, -19.2], lon: [-62.7, -54.2] },
} as const;

const CAMPOS = {
  canarias: SCENARIOS.filter((e) => e.pais === "es" && e.id !== "cuatro-vientos"),
  paraguay: SCENARIOS.filter((e) => e.pais !== "es" && e.aerodrome),
};

describe("lo destacado", () => {
  it("hay de las dos zonas, y ni un nombre ni una clave repetidos", () => {
    expect(DESTACADOS.some((d) => d.zona === "canarias")).toBe(true);
    expect(DESTACADOS.some((d) => d.zona === "paraguay")).toBe(true);
    expect(new Set(DESTACADOS.map((d) => d.clave)).size).toBe(DESTACADOS.length);
    expect(new Set(DESTACADOS.map((d) => d.nombre)).size).toBe(DESTACADOS.length);
  });

  it.each(DESTACADOS.map((d) => [d.clave, d] as const))(
    "%s cae en su zona, dice de dónde sale y tiene su peso",
    (_clave, d) => {
      const caja = ZONA[d.zona];
      expect(d.puntos.length).toBeGreaterThan(0);
      for (const p of d.puntos) {
        expect(p[0]!, `${d.nombre} en latitud`).toBeGreaterThanOrEqual(caja.lat[0]);
        expect(p[0]!, `${d.nombre} en latitud`).toBeLessThanOrEqual(caja.lat[1]);
        expect(p[1]!, `${d.nombre} en longitud`).toBeGreaterThanOrEqual(caja.lon[0]);
        expect(p[1]!, `${d.nombre} en longitud`).toBeLessThanOrEqual(caja.lon[1]);
      }
      expect(d.de.length).toBeGreaterThan(8);
      expect([1, 2, 3]).toContain(d.peso);
      expect(d.alcance).toBeGreaterThan(0);
      expect(["montana", "isla", "ciudad", "agua", "bosque"]).toContain(d.clase);
    },
  );

  it.each(DESTACADOS.map((d) => [d.clave, d] as const))(
    "%s tiene su frase: la de la comandante, la de la instructora y en inglés",
    (clave) => {
      for (const k of [`ventanilla.${clave}`, `ventanilla.vos.${clave}`]) {
        expect(k in ES_PY, k).toBe(true);
        expect(k in EN, `${k} en inglés`).toBe(true);
      }
      // Y la de la comandante, sin voseo: le habla al pasaje de usted.
      const suya = ES_PY[`ventanilla.${clave}` as keyof typeof ES_PY];
      expect(suya).not.toMatch(/\b(mirá|fijate|vos|tenés|podés|sabés)\b/i);
    },
  );

  /*
   * **Las cumbres, contra el relieve del juego.** El mapa del horizonte va a
   * cientos de metros por muestra y redondea las puntas, así que se mira lo
   * más alto a setecientos metros a la redonda y se pide que llegue a tres
   * cuartos de la cota del dato, y que no la pase de largo.
   */
  const cumbres = DESTACADOS.filter((d) => d.ele !== null && d.ele > 400);
  it.each(cumbres.map((d) => [d.clave, d] as const))(
    "%s está donde el relieve tiene su cumbre",
    (_clave, d) => {
      const campos = CAMPOS[d.zona];
      const origen = campos[0]!.aerodrome!.origin;
      const suelo = relieveDe(
        campos.map((e) => e.id),
        origen,
      );
      const [lat, lon] = d.puntos[0]!;
      const { x, z } = dondeCae(origen, { lat: lat!, lon: lon! });
      let alto = -Infinity;
      for (let dx = -750; dx <= 750; dx += 150)
        for (let dz = -750; dz <= 750; dz += 150)
          alto = Math.max(alto, suelo(x + dx, z + dz) ?? -Infinity);
      expect(alto, d.nombre).toBeGreaterThan(d.ele! * 0.75);
      expect(alto, d.nombre).toBeLessThan(d.ele! + 300);
    },
  );

  it("y se ponen en el mundo de cada zona, no en el de la otra", () => {
    const tenerife = SCENARIOS.find((e) => e.id === "tenerife-norte")!.aerodrome!.origin;
    const asuncion = SCENARIOS.find((e) => e.id === "pettirossi")!.aerodrome!.origin;
    const enTenerife = destacadosDesde(tenerife).map((h) => h.nombre);
    const enAsuncion = destacadosDesde(asuncion).map((h) => h.nombre);
    expect(enTenerife).toContain("Teide");
    expect(enTenerife).not.toContain("Río Paraguay");
    expect(enAsuncion).toContain("Río Paraguay");
    expect(enAsuncion).not.toContain("Teide");
  });
});
