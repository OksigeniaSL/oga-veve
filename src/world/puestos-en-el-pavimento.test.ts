/**
 * **Todo puesto en el que el juego puede aparcar un avión está sobre el
 * pavimento que se dibuja**, en todos los campos.
 *
 * Existe por el JAZ 90 en Tenerife Sur (#191): `verificar-ruedas` lo
 * encontraba con las ruedas cinco centímetros por debajo de la manta de la
 * ortofoto, o sea sobre tierra, en un puesto de aviación general de la punta
 * oeste. Ese puesto no existía: era el centro de una línea de entrada, la vía
 * que OpenStreetMap dibuja de la calle hasta donde para la rueda de morro, y
 * caía a mitad de camino, fuera de la plataforma. Ver `puestosDeOsm` en
 * `scripts/puestos-de-osm.mjs`.
 *
 * Y no lo veía nadie porque el filtro del juego miraba el pavimento de
 * OpenStreetMap con media calle de holgura —ver `MARGEN_DEL_PAVIMENTO`—, que
 * es para que la raya cruce las rendijas del dibujo, mientras que las ruedas
 * se apoyan en la rejilla del pavimento **dibujado**: la de
 * `data/aerodromes/*.pavimento.bin`. Con esa holgura pasaban además treinta y
 * un puestos de Barajas y dos de Silvio Pettirossi sin asfalto debajo. Aquí
 * se cruzan las dos cosas: lo que deja pasar el filtro del juego,
 * `puestosEnElPavimento`, tiene que tener asfalto en la rejilla.
 *
 * Sin navegador: la rejilla horneada es, por construcción, la cuenta del
 * navegador —lo comprueba `npm run pavimento -- --comprobar`— y se lee aquí
 * tal cual. Que cada avión de la flota se apoye por sus ruedas en su puesto
 * lo mira `scripts/verificar-ruedas.mjs` en el juego de verdad.
 */
import { describe, expect, it } from "vitest";
import type { Aerodrome } from "./aerodrome";
import { NADA_EN_LA_REJILLA, type RejillaDelPavimento } from "./mapa-del-pavimento";
import { descodificarRejilla, ficheroDelPavimento } from "./pavimento-horneado";
import { construirGrafo, puestosEnElPavimento } from "./rodaje";
import { conSuAerodromo, SCENARIOS } from "./scenarios";

/* El `fs` de Node pedido en marcha, como en `pavimento-horneado.test.ts`. */
const nodo = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown; cwd(): string };
  }
).process;
const { existsSync, readFileSync } = nodo.getBuiltinModule("node:fs") as {
  existsSync(ruta: string): boolean;
  readFileSync(ruta: string): Uint8Array;
};

/** Si hay pavimento dibujado en la celda de un punto del aeródromo (`y` al norte). */
function conAsfalto(r: RejillaDelPavimento, x: number, y: number): boolean {
  const i = Math.floor((x - r.x0) / r.celda);
  const j = Math.floor((-y - r.z0) / r.celda);
  if (i < 0 || j < 0 || i >= r.nx || j >= r.nz) return false;
  return r.alzado[j * r.nx + i] !== NADA_EN_LA_REJILLA;
}

describe("los puestos en los que se aparca tienen pavimento debajo", async () => {
  // Cada aeródromo una vez, como lo monta el juego: con sus plataformas cosidas.
  const campos = new Map<string, Aerodrome>();
  for (const e of await Promise.all(SCENARIOS.map(conSuAerodromo)))
    if (e.aerodrome && !campos.has(e.aerodrome.id)) campos.set(e.aerodrome.id, e.aerodrome);

  const conRejilla = [...campos.values()].filter((a) =>
    existsSync(`${nodo.cwd()}/data/aerodromes/${ficheroDelPavimento(a.id)}`),
  );

  it("hay campos que mirar", () => {
    expect(conRejilla.length).toBeGreaterThan(15);
  });

  for (const aero of conRejilla) {
    it(`en ${aero.id}`, () => {
      const r = descodificarRejilla(
        readFileSync(`${nodo.cwd()}/data/aerodromes/${ficheroDelPavimento(aero.id)}`),
      );
      expect(r, `${aero.id}: la rejilla horneada no se lee`).not.toBeNull();
      const rejilla = r!;
      /*
       * Que la rejilla y el aeródromo casan: el centro de su pista tiene
       * asfalto. Sin esto, una rejilla corrida de sitio daría por malos todos
       * los puestos, o por buenos los de un campo sin rejilla.
       */
      const eje = aero.runways[0]!.centerline;
      const [ax, ay] = eje[0]!;
      const [bx, by] = eje[eje.length - 1]!;
      expect(conAsfalto(rejilla, (ax + bx) / 2, (ay + by) / 2), `${aero.id}: la pista sin asfalto`).toBe(true);

      // Los que deja pasar el juego, con su misma cuenta. Ver `puestosEnElAsfalto`.
      const puestos = aero.parkingPositions ?? [];
      const elegibles = puestosEnElPavimento(puestos, aero, construirGrafo(aero));
      const sinAsfalto = elegibles.filter((p) => !conAsfalto(rejilla, p.xy[0], p.xy[1]));
      expect(
        sinAsfalto.map((p) => `${p.ref ?? "sin nombre"} (${p.xy[0]}, ${p.xy[1]})`),
        `${aero.id}: puestos que el juego puede elegir y que no tienen asfalto debajo`,
      ).toEqual([]);
    });
  }
});
