/**
 * La hoja de la instructora, comprobada.
 *
 * Lo que se gana en cada vuelo dejó de ser barras en la manga —seis barras no
 * las lleva ningún uniforme— y pasó a ser la hoja de evaluación de una
 * escuela de verdad: una fila por parte bien hecha, con su visto. Lo que se
 * comprueba aquí es lo que no se ve de un vistazo:
 *
 * - que marca lo ganado y **nada más**: ni filas vacías ni tachadas;
 * - que un perfil guardado por una versión anterior se sigue leyendo y
 *   pintando, porque el cuaderno vive en el aparato de quien juega;
 * - y que la línea de cada vuelo enseña lo de antes de volar.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { hoja, hojaDelVuelo, nombresDelPeldano, partesDeLaHoja } from "./hoja";
import { tarjetaDeVuelo } from "./cuaderno";
import { GALONES } from "../flight/galones";
import { canalesDe, PELDANOS } from "../flight/escalera";
import { leerBitacora, type Vuelo } from "../flight/bitacora";
import { barrasDe, grado, leerCuaderno } from "../flight/cuaderno";
import { olvidar } from "../datos/guardado";
import { ES_PY } from "../i18n/es-PY";

/** Un `localStorage` de mentira, como el de `bitacora.test.ts`. */
const memoria = new Map<string, string>();
(globalThis as { localStorage: Storage }).localStorage = {
  getItem: (k) => memoria.get(k) ?? null,
  setItem: (k, v) => void memoria.set(k, String(v)),
  removeItem: (k) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: (i) => [...memoria.keys()][i] ?? null,
  get length() {
    return memoria.size;
  },
};

/** Las filas que pinta una hoja, por su nombre. */
const filas = (html: string): string[] =>
  [...html.matchAll(/data-parte="([^"]+)"/g)].map((m) => m[1]!);
/** Y cuántos vistos lleva. */
const vistos = (html: string): number => html.match(/class="hoja__visto"/g)?.length ?? 0;

/** Lo que no puede salir nunca en una hoja: tachones, huecos, barras. */
const REPROCHES = /tach|hueco|vac[ií]a|manga__barra|▮|senal__tachon/;

describe("la hoja marca lo ganado", () => {
  it("una fila por parte ganada, cada una con su visto", () => {
    const html = hoja(["toma", "aros"], { donde: "hud" });
    expect(filas(html)).toEqual(["toma", "aros"]);
    expect(vistos(html)).toBe(2);
  });

  it("en el orden de un vuelo, se ganen en el orden que se ganen", () => {
    expect(partesDeLaHoja(["rodaje", "toma", "frustrada", "aproximacion"])).toEqual([
      "aproximacion",
      "frustrada",
      "toma",
      "rodaje",
    ]);
  });

  it("y las seis, si se ganan las seis: un vuelo redondo cabe entero", () => {
    const html = hoja(GALONES, { donde: "fin" });
    expect(filas(html)).toEqual([...GALONES]);
    expect(vistos(html)).toBe(6);
  });

  it("sin nada ganado no hay hoja: una hoja en blanco sería un reproche", () => {
    expect(hoja([], { donde: "hud" })).toBe("");
    expect(hoja([], { donde: "fin" })).toBe("");
    expect(hojaDelVuelo({ galones: [] })).toBe("");
  });

  it("no tacha nada ni deja huecos: lo que no se ganó, no está", () => {
    for (let n = 0; n <= GALONES.length; n++) {
      for (const donde of ["hud", "fin", "cuaderno"] as const) {
        const html = hoja(GALONES.slice(0, n), { donde, conNombres: "entero" });
        expect(html, `${n} en ${donde}`).not.toMatch(REPROCHES);
        expect(filas(html)).toHaveLength(n);
        expect(vistos(html)).toBe(n);
      }
    }
  });

  it("y nada de lo ganado se cae al ganar otra", () => {
    let antes: string[] = [];
    for (const g of ["aros", "aproximacion", "toma", "rodaje"]) {
      const ahora = [...antes, g];
      const html = hoja(ahora, { donde: "hud", yaEstaban: antes });
      for (const ya of antes) expect(filas(html), g).toContain(ya);
      antes = ahora;
    }
  });

  it("solo entra animada la nueva, aunque caiga en medio de la hoja", () => {
    // La frustrada va delante de la toma: contar por posición la daba por vieja.
    const html = hoja(["toma", "frustrada"], { donde: "hud", yaEstaban: ["toma"] });
    expect(html).toMatch(/hoja__parte" data-parte="frustrada"/);
    expect(html).toMatch(/hoja__parte hoja__parte--ya" data-parte="toma"/);
  });
});

describe("y en cada peldaño, lo suyo", () => {
  it("en Guyrami, sin una palabra: el dibujo y el visto", () => {
    const html = hoja(GALONES, {
      donde: "fin",
      conNombres: nombresDelPeldano(canalesDe("dibujo")),
    });
    expect(html).not.toMatch(/hoja__nombre/);
    expect(vistos(html)).toBe(6);
    // Cada fila lleva su dibujo: un svg propio, además del visto.
    expect(html.match(/<svg viewBox="0 0 24 24"/g)?.length).toBe(6);
  });

  it("la palabra sola en el de la palabra, y el nombre entero desde las cifras", () => {
    expect(nombresDelPeldano(canalesDe("palabra"))).toBe("corto");
    expect(nombresDelPeldano(canalesDe("cifra"))).toBe("entero");
    expect(nombresDelPeldano(canalesDe("cabina"))).toBe("entero");
    expect(hoja(["toma"], { donde: "fin", conNombres: "corto" })).toContain(
      `>${ES_PY["galon.toma.corta"]}<`,
    );
    expect(hoja(["aproximacion"], { donde: "fin", conNombres: "entero" })).toContain(
      `>${ES_PY["galon.aproximacion"]}<`,
    );
  });

  it("y cada parte tiene su nombre y su palabra, para los cuatro peldaños", () => {
    expect(PELDANOS).toHaveLength(4);
    for (const g of GALONES) {
      expect(ES_PY, g).toHaveProperty(`galon.${g}`);
      expect(ES_PY, g).toHaveProperty(`galon.${g}.corta`);
    }
  });
});

describe("el perfil de antes se lee igual", () => {
  beforeEach(() => {
    memoria.clear();
    olvidar();
  });

  /*
   * El perfil vive en el aparato: lo guardó una versión que pintaba barras, y
   * tiene que seguir saliendo bien con la hoja. Se escribe con las claves
   * sueltas de antes del guardado con versión, que es lo más viejo que puede
   * haber en una tablet, y lo migra `datos/guardado.ts`.
   */
  it("los vuelos con sus galones de antes salen con su hoja, sin barras", () => {
    const viejo = {
      fecha: "2026-08-14T10:00:00.000Z",
      escenario: "tenerife-norte",
      leccion: "aterrizaje",
      tramo: "guyrami",
      segundos: 640,
      galones: ["aproximacion", "toma", "aros", "velocidad", "rodaje", "frustrada"],
      traza: [
        [0, 0],
        [500, 200],
      ],
    };
    memoria.set("oga-veve:bitacora", JSON.stringify([viejo]));
    const [v] = leerBitacora();
    expect(v).toBeDefined();
    const tarjeta = tarjetaDeVuelo(v!);
    expect(filas(tarjeta)).toEqual([...GALONES]);
    expect(vistos(tarjeta)).toBe(6);
    expect(tarjeta).not.toMatch(REPROCHES);
  });

  it("y una parte que esta versión no conoce no pinta una fila sin dibujo", () => {
    expect(partesDeLaHoja(["toma", "estrella", "", "toma"])).toEqual(["toma"]);
    expect(filas(hojaDelVuelo({ galones: ["toma", "galon-raro"] }))).toEqual(["toma"]);
  });

  it("y el cuaderno de antes da su grado, con las barras de verdad", () => {
    memoria.set(
      "oga-veve:cuaderno",
      JSON.stringify({ segundos: 9000, despegues: 14, aterrizajes: 12, frustradas: 1, completos: 9, percances: 2, aerodromos: ["GCXO", "GCTS"] }),
    );
    const c = leerCuaderno();
    expect(grado(c)).toBe("comandante");
    expect(barrasDe(grado(c))).toBe(4);
  });
});

describe("la línea de cada vuelo enseña lo de antes de volar", () => {
  const base: Vuelo = {
    fecha: "2026-10-05T10:00:00.000Z",
    escenario: "tenerife-norte",
    leccion: "despegue",
    tramo: "guyrami",
    segundos: 120,
    galones: [],
    traza: [[0, 0]],
  };

  it("la vuelta al avión entera, con su visto", () => {
    const html = tarjetaDeVuelo({ ...base, antes: { vuelta: "entera" } });
    expect(filas(html)).toEqual(["vuelta"]);
    expect(vistos(html)).toBe(1);
  });

  it("a medias, el dibujo de hasta dónde se llegó, sin visto y sin tachón", () => {
    const html = tarjetaDeVuelo({ ...base, antes: { vuelta: "a-medias" } });
    expect(filas(html)).toEqual(["vuelta-a-medias"]);
    expect(vistos(html)).toBe(0);
    expect(html).not.toMatch(REPROCHES);
  });

  it("quedarse en tierra es un día bien decidido: lleva su visto", () => {
    const html = tarjetaDeVuelo({
      ...base,
      antes: { vuelta: "entera", decision: "en-tierra" },
    });
    expect(filas(html)).toEqual(["vuelta", "en-tierra"]);
    expect(vistos(html)).toBe(2);
  });

  it("y el despegue abortado por la funda, como una frustrada", () => {
    const html = tarjetaDeVuelo({ ...base, antes: { decision: "abortado" } });
    expect(filas(html)).toEqual(["abortado"]);
    expect(vistos(html)).toBe(1);
  });

  it("lo de antes va delante de lo del vuelo, como en una hoja de escuela", () => {
    const html = tarjetaDeVuelo({
      ...base,
      galones: ["toma", "rodaje"],
      antes: { vuelta: "entera" },
    });
    expect(filas(html)).toEqual(["vuelta", "toma", "rodaje"]);
  });

  it("y quien lo lee con lector de pantalla oye qué es cada cosa", () => {
    const html = tarjetaDeVuelo({ ...base, antes: { decision: "en-tierra" } });
    expect(html).toContain(ES_PY["hoja.enTierra"]);
  });
});
