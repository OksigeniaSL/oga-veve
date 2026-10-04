/**
 * **El plan sale del final de la pista, subiendo con su rumbo**, en todos los
 * campos y por todas sus cabeceras.
 *
 * Lo contó Enrique despegando por la 30 de Los Rodeos con el JAZ 120: la raya
 * magenta nacía en la cabecera 30, donde empieza la carrera, y salía hacia el
 * nordeste, a sus espaldas; ya en el aire le pedía virar a la derecha, «pero
 * debería nacer en la salida, no en la 30, sino en la 12 en este caso en que
 * despego hacia el oeste», y «me obliga a ir a buscar el punto de cruce:
 * durante un rato vuelo fuera del plan de ruta por lo ilógico del diseño de
 * inicio». Lo de verdad es lo que dice la OACI de cualquier salida (PANS-OPS,
 * Doc 8168, vol. II, parte I, sección 3): empieza en el final de la pista que
 * se usa (el DER) y sube con el rumbo de pista hasta donde la carta —o, sin
 * carta, los 120 m de una salida omnidireccional— deja virar.
 *
 * Se mira sin relieve, que la forma del primer tramo no depende de él: con el
 * relieve de Canarias lo mira también `rutas-de-canarias.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { MILLA, PIE } from "../flight/ruta";
import { desplazarAerodromo } from "./aerodromo-desplazado";
import { campoDeCasa, campoVecino, enLaPistaDe } from "./campo-del-vuelo";
import { dondeCae } from "./entre-aerodromos";
import { TIEMPO_DE_CASA, type Meteo } from "./meteo";
import { SUBIDA_SIN_CARTA } from "./procedimientos";
import { rutaDelTramo, type DelJuego } from "./ruta-del-tramo";
import { SCENARIOS, conViento, destinosDe, oaciDe, type Scenario } from "./scenarios";
import { cabeceraEnUso } from "./terrain";

const RAD = Math.PI / 180;

/** El viento que pone en uso esa cabecera: de frente a ella, quince nudos. */
function vientoPara(e: Scenario, cabecera: string): Meteo {
  const pista = e.aerodrome!.runways[0]!;
  const u = pista.thresholds[cabecera]!.xy!;
  const otro = Object.entries(pista.thresholds).find(([n, v]) => n !== cabecera && v?.xy)![1]!.xy!;
  const rumbo = (Math.atan2(otro[0] - u[0], otro[1] - u[1]) / RAD + 360) % 360;
  return { ...TIEMPO_DE_CASA, vientoDe: Math.round(rumbo), vientoKt: 15 };
}

const cabeceras = (e: Scenario): string[] =>
  Object.entries(e.aerodrome!.runways[0]!.thresholds)
    .filter(([, u]) => u?.xy)
    .map(([n]) => n);

const rumboDe = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  (Math.atan2(b.x - a.x, -(b.z - a.z)) / RAD + 360) % 360;
const difer = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

const CAMPOS = SCENARIOS.filter((e) => e.aerodrome && destinosDe(e).length > 0);
const por = (id: string) => SCENARIOS.find((e) => e.id === id);

describe("el plan sale del final de la pista, subiendo con su rumbo", () => {
  it("se miran los campos de Canarias y de Paraguay", () => {
    const paises = new Set(CAMPOS.map((e) => e.pais));
    expect(paises.has("es")).toBe(true);
    expect(paises.has("py")).toBe(true);
  });

  for (const sal of CAMPOS)
    for (const cs of cabeceras(sal)) {
      const nombre = `${oaciDe(sal) ?? sal.id} ${cs}`;
      it(`${nombre}: el primer tramo arranca en el final de la pista y va con su rumbo`, () => {
        const salida = campoDeCasa(conViento(sal, vientoPara(sal, cs)));
        expect(cabeceraEnUso(salida.escenario)).toBe(cs);
        const origen = sal.aerodrome!.origin;
        const juego: DelJuego = {
          origen,
          enElAire: null,
          cotaDePista: (campo) => campo.escenario.aerodrome?.elevationM ?? 0,
          cota: null,
          techo: 12000 * PIE,
        };
        const L = salida.pista.length;
        const [cx, cz] = enLaPistaDe(salida, L / 2);
        let vistos = 0;
        for (const id of destinosDe(sal)) {
          const lle = por(id);
          if (!lle?.aerodrome) continue;
          const d = dondeCae(origen, lle.aerodrome.origin);
          const llegada = campoVecino(lle, d, desplazarAerodromo(lle.aerodrome, d.x, d.z));
          const ruta = rutaDelTramo(salida, llegada, juego);
          const [der, primero] = ruta.fijos;
          const dicho = `${nombre} → ${id}: ${ruta.fijos.map((f) => f.nombre).join(" ")}`;
          expect(der!.papel, dicho).toBe("despegue");
          expect(der!.nombre, dicho).toBe(`RW${cs}`);
          // En el final: a lo largo de la pista entera desde la cabecera.
          const h = salida.pista.heading * RAD;
          const along = (der!.x - cx) * Math.sin(h) - (der!.z - cz) * Math.cos(h);
          expect(Math.abs(along - L), dicho).toBeLessThan(60);
          // Y el primer tramo, con el rumbo de pista y más allá de la subida
          // mínima de una salida sin carta.
          expect(difer(rumboDe(der!, primero!), salida.pista.heading), dicho).toBeLessThan(2);
          const minimo = ((SUBIDA_SIN_CARTA * PIE) / (1000 * PIE)) * 2 * MILLA;
          expect(Math.hypot(primero!.x - der!.x, primero!.z - der!.z), dicho).toBeGreaterThan(
            minimo * 0.99,
          );
          vistos++;
        }
        expect(vistos, nombre).toBeGreaterThan(0);
      });
    }
});
