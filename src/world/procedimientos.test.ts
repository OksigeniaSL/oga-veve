/**
 * Los procedimientos publicados, puestos a volar sobre los aeródromos del
 * juego.
 *
 * Lo que se comprueba es lo que se pidió, en aritmética: que cada ruta entre
 * dos campos de Canarias o de Paraguay **acabe alineada con la pista en uso a
 * ocho millas o más**, y no en el centro del aeropuerto; que vaya por puntos publicados; y
 * que no dé rodeos absurdos. Se hace con las cabeceras de verdad del
 * aeródromo del juego —las de `data/aerodromes`—, no con las de la carta: si
 * la carta y el aeródromo no casaran, el tramo final saldría torcido, y eso
 * es lo primero que tiene que saltar aquí.
 */

import { describe, expect, it } from "vitest";
import { destinosDe, oaciDe, SCENARIOS, type Scenario } from "./scenarios";
import { dondeCae, type Sitio } from "./entre-aerodromos";
import {
  procedimientosDe,
  ramasDe,
  ramasDeLlegada,
  salidasDe,
  type Publicado,
} from "./procedimientos";
import { MILLA, PIE, trazar, type Fijo, type Ruta } from "../flight/ruta";

const canarias = SCENARIOS.filter(
  (e) => e.pais === "es" && e.aerodrome && procedimientosDe(oaciDe(e)),
);
const por = (id: string): Scenario | undefined => SCENARIOS.find((e) => e.id === id);

/** Las cabeceras del aeródromo del juego, en el mundo de `origen`. */
function cabeceras(e: Scenario, origen: Sitio) {
  const aero = e.aerodrome!;
  const d = dondeCae(origen, aero.origin);
  const u = aero.runways[0]!.thresholds;
  const lista = Object.entries(u).filter(([, v]) => v?.xy);
  return lista.map(([nombre, v]) => {
    const otro = lista.find(([n]) => n !== nombre)![1]!;
    const x = d.x + v!.xy![0];
    const z = d.z - v!.xy![1];
    const ox = d.x + otro.xy![0];
    const oz = d.z - otro.xy![1];
    // El rumbo de aterrizaje por esta cabecera: de ella hacia la otra.
    const rumbo = ((Math.atan2(ox - x, -(oz - z)) * 180) / Math.PI + 360) % 360;
    return { nombre, x, z, rumbo };
  });
}

const aMundo =
  (origen: Sitio) =>
  (p: Publicado): Fijo => ({
    ...dondeCae(origen, p),
    nombre: p.nombre,
    papel: p.papel,
    minima: p.minimaPies === null ? null : p.minimaPies * PIE,
  });

/** El plan de `salida` a `llegada` por estas cabeceras, como lo hace el juego. */
function plan(
  salida: Scenario,
  cabSalida: ReturnType<typeof cabeceras>[number],
  llegada: Scenario,
  cabLlegada: ReturnType<typeof cabeceras>[number],
): Ruta {
  const origen = salida.aerodrome!.origin;
  const umbral: Fijo = { ...cabLlegada, nombre: `RW${cabLlegada.nombre}`, papel: "umbral", minima: null };
  const ramas = ramasDeLlegada(
    oaciDe(llegada),
    cabLlegada.nombre,
    umbral,
    cabLlegada.rumbo,
    aMundo(origen),
  );
  return trazar({
    desde: { ...cabSalida, nombre: `RW${cabSalida.nombre}`, papel: "despegue", minima: null },
    salidas: salidasDe(oaciDe(salida), cabSalida.nombre).map((r) => r.map(aMundo(origen))),
    ramas,
    umbral,
    cotaDelUmbral: 0,
  });
}

const rumboDe = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  ((Math.atan2(b.x - a.x, -(b.z - a.z)) * 180) / Math.PI + 360) % 360;
const difer = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/** Las millas del final que van alineadas con la pista, desde el umbral. */
function alineadas(r: Ruta, rumboDePista: number): number {
  let millas = 0;
  for (let i = r.fijos.length - 1; i > 0; i--) {
    const a = r.fijos[i - 1]!;
    const b = r.fijos[i]!;
    if (difer(rumboDe(a, b), rumboDePista) > 5) break;
    millas += Math.hypot(b.x - a.x, b.z - a.z) / MILLA;
  }
  return millas;
}

describe("las rutas de Canarias, por lo publicado", () => {
  it("están los ocho aeropuertos de las islas", () => {
    expect(canarias.map((e) => oaciDe(e)).sort()).toEqual([
      "GCFV",
      "GCGM",
      "GCHI",
      "GCLA",
      "GCLP",
      "GCRR",
      "GCTS",
      "GCXO",
    ]);
  });

  it("cada cabecera con aproximación publicada tiene la del aeródromo del juego", () => {
    // Una cabecera de la carta que el juego no tiene es una aproximación a
    // ninguna parte: pasó con La Palma, que hoy es 18/36 y no 01/19.
    for (const e of canarias) {
      const nombres = cabeceras(e, e.aerodrome!.origin).map((c) => c.nombre);
      for (const cab of Object.keys(procedimientosDe(oaciDe(e))!.aproximaciones))
        expect(nombres, `${oaciDe(e)} ${cab}`).toContain(cab);
    }
  });

  for (const salida of canarias)
    for (const id of destinosDe(salida)) {
      const llegada = por(id);
      if (!llegada?.aerodrome) continue;
      const origen = salida.aerodrome!.origin;
      for (const cs of cabeceras(salida, origen))
        for (const cl of cabeceras(llegada, origen)) {
          const nombre = `${oaciDe(salida)} ${cs.nombre} → ${oaciDe(llegada)} ${cl.nombre}`;
          it(`${nombre}: acaba alineada a ocho millas o más, sin rodeos`, () => {
            const r = plan(salida, cs, llegada, cl);
            const ultimo = r.fijos[r.fijos.length - 1]!;
            expect(ultimo.nombre).toBe(`RW${cl.nombre}`);
            const recto = alineadas(r, cl.rumbo);
            /*
             * **Salvo la que acaba en circuito**, que se alinea a la vista
             * donde la isla deja: la 18 de La Palma, a dos millas y media. Ver
             * `Aproximacion.aLaVista`.
             */
            const aLaVista =
              procedimientosDe(oaciDe(llegada))?.aproximaciones[cl.nombre]?.aLaVista;
            expect(recto, `${recto.toFixed(1)} NM alineadas: ${r.fijos.map((f) => f.nombre).join(" ")}`).toBeGreaterThanOrEqual(
              aLaVista === undefined ? 8 : aLaVista - 0.05,
            );
            /*
             * Y sin rodeos absurdos. **La ruta de verdad es bastante más larga
             * que la recta en los saltos cortos**, y es de lo que va esto: de
             * Lanzarote a la 01 de Fuerteventura, que aterriza hacia el norte,
             * hay que bajar hasta el sur de la isla para entrar por SOTAD — tres
             * veces la recta. Ese es el «tengo que abrirme» que se pidió. Lo que
             * no puede pasar es más que eso.
             */
            const directo = Math.hypot(ultimo.x - cs.x, ultimo.z - cs.z);
            expect(r.total / directo, r.fijos.map((f) => f.nombre).join(" ")).toBeLessThan(3);
          });
        }
    }

  it("de Gran Canaria a Los Rodeos por la 30: sale por la TFN4A y entra directo a BUNIX", () => {
    /*
     * BUNIX es el punto intermedio de la RNP a la 30, y viniendo de Gran
     * Canaria cae de camino: el giro en él es de pocos grados. Ir antes a
     * CANDE, el punto de inicio, es lo que se hacía; el «directo a BUNIX» es
     * lo que da el controlador. Ver `trazar`.
     */
    const gc = por("gran-canaria")!;
    const tfn = por("tenerife-norte")!;
    const origen = gc.aerodrome!.origin;
    const cs = cabeceras(gc, origen).find((c) => c.nombre === "03L")!;
    const cl = cabeceras(tfn, origen).find((c) => c.nombre === "30")!;
    const nombres = plan(gc, cs, tfn, cl).fijos.map((f) => f.nombre);
    expect(nombres.slice(0, 2)).toEqual(["RW03L", "ECKOS"]);
    expect(nombres).not.toContain("BASUX");
    expect(nombres.slice(-3)).toEqual(["BUNIX", "XO69E", "RW30"]);
  });
});

/**
 * **Y Paraguay, con lo que publica la DINAC.**
 *
 * La misma aritmética, con una diferencia: aquí no todos los campos tienen
 * procedimientos. Las rutas que llegan a Concepción, a Pilar, a Ayolas o a la
 * 02 de Encarnación acaban en la aproximación calculada sobre el eje, y
 * también tienen que acabar alineadas: es la misma promesa por otro camino.
 */
const paraguay = SCENARIOS.filter((e) => e.pais === "py" && e.aerodrome);
const conCartas = paraguay.filter((e) => procedimientosDe(oaciDe(e)));

describe("las rutas de Paraguay, por lo publicado", () => {
  it("tienen procedimientos los cinco campos que los publican, y ninguno más", () => {
    expect(conCartas.map((e) => oaciDe(e)).sort()).toEqual([
      "SGAS",
      "SGEN",
      "SGES",
      "SGME",
      "SGPJ",
    ]);
  });

  it("cada cabecera con aproximación publicada tiene la del aeródromo del juego", () => {
    for (const e of conCartas) {
      const nombres = cabeceras(e, e.aerodrome!.origin).map((c) => c.nombre);
      for (const cab of Object.keys(procedimientosDe(oaciDe(e))!.aproximaciones))
        expect(nombres, `${oaciDe(e)} ${cab}`).toContain(cab);
      for (const cab of Object.keys(procedimientosDe(oaciDe(e))!.salidas))
        expect(nombres, `${oaciDe(e)} ${cab}`).toContain(cab);
    }
  });

  it("y el último tramo publicado va por el eje de la pista del juego", () => {
    /*
     * Del punto de final al umbral, con el umbral **del juego**: si el
     * aeródromo de OpenStreetMap y el de la carta no casaran, aquí saldría el
     * ángulo. Dos grados es lo que separa una final de una final torcida.
     */
    for (const e of conCartas) {
      const origen = e.aerodrome!.origin;
      for (const c of cabeceras(e, origen)) {
        for (const rama of ramasDe(oaciDe(e), c.nombre)) {
          const faf = rama.map(aMundo(origen)).find((f) => f.papel === "faf")!;
          expect(faf, `${oaciDe(e)} ${c.nombre}`).toBeDefined();
          expect(
            difer(rumboDe(faf, c), c.rumbo),
            `${oaciDe(e)} ${c.nombre}: ${faf.nombre}`,
          ).toBeLessThan(2);
        }
      }
    }
  });

  for (const salida of paraguay)
    for (const id of destinosDe(salida)) {
      const llegada = por(id);
      if (!llegada?.aerodrome) continue;
      const origen = salida.aerodrome!.origin;
      for (const cs of cabeceras(salida, origen))
        for (const cl of cabeceras(llegada, origen)) {
          const nombre = `${oaciDe(salida)} ${cs.nombre} → ${oaciDe(llegada)} ${cl.nombre}`;
          it(`${nombre}: acaba alineada a ocho millas o más, sin rodeos`, () => {
            const r = plan(salida, cs, llegada, cl);
            const ultimo = r.fijos[r.fijos.length - 1]!;
            expect(ultimo.nombre).toBe(`RW${cl.nombre}`);
            const recto = alineadas(r, cl.rumbo);
            expect(recto, `${recto.toFixed(1)} NM alineadas: ${r.fijos.map((f) => f.nombre).join(" ")}`).toBeGreaterThanOrEqual(8);
            const directo = Math.hypot(ultimo.x - cs.x, ultimo.z - cs.z);
            expect(r.total / directo, r.fijos.map((f) => f.nombre).join(" ")).toBeLessThan(3);
          });
        }
    }

  it("de Asunción a Ciudad del Este por la 23: sale por la 02 y entra por MOLMA", () => {
    const asu = por("pettirossi")!;
    const cde = por("guarani")!;
    const origen = asu.aerodrome!.origin;
    const cs = cabeceras(asu, origen).find((c) => c.nombre === "02")!;
    const cl = cabeceras(cde, origen).find((c) => c.nombre === "23")!;
    const nombres = plan(asu, cs, cde, cl).fijos.map((f) => f.nombre);
    expect(nombres[0]).toBe("RW02");
    expect(nombres.slice(-3)).toEqual(["ROGER", "MOLMA", "RW23"]);
  });
});
