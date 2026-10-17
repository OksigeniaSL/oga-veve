/**
 * **El tráfico sale desde donde su AIP deja, y con la pista que necesita.**
 *
 * En Los Rodeos el tráfico despegaba desde la E3: el AIP solo deja salir por
 * intersección desde la E-2 y la E-4 (AD 2-GCXO, 2.20.1.2 K), y el reactor
 * salía con mil quinientos setenta metros por delante cuando pide dos mil
 * setenta. Medido antes de arreglarlo, tres causas a la vez:
 *
 * - las dos entradas de cabecera, la E-1 y la E-5, llegan al asfalto detrás
 *   de los umbrales, y las bocas se buscaban solo entre ellos;
 * - la E-2 es una salida rápida que se aparta del eje en un ángulo cerrado, y
 *   se tomaba por «rodar por la pista desde otra boca»;
 * - y sin ninguna de las tres, se cogía la que quedaba, sin mirar el AIP ni
 *   si cabía. Lo mismo en La Palma, donde el AIP no deja salir por
 *   intersección a nadie, y en La Gomera con cuatrocientos metros por la 09.
 *
 * Lo que se pide es lo de verdad: desde una intersección, solo si su AIP la
 * deja y con su TORA; y si ninguna entrada da la pista, se remonta hasta el
 * principio y se da la vuelta allí.
 */
import { describe, expect, it } from "vitest";
import { enElPavimento, sinTorre, type Aerodrome } from "./aerodrome";
import { SCENARIOS, conViento, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";
import { sueloDelTrafico, type EnElPlano } from "./suelo-del-trafico";
import { pistaQuePideConSuMargen, tiposDelCampo, TIPOS } from "./trafico";
import { enEjesDePista } from "./rumbo";
import { construirGrafo } from "./rodaje";
import {
  cabeceraPorRumbo,
  calleDeLaBoca,
  desdeLaInterseccion,
  nombreDeCalle,
} from "./salidas-por-interseccion";
import { umbralPublicado } from "./umbrales-publicados";

const porId = (id: string): Scenario => SCENARIOS.find((e) => e.id === id)!;

/** Las dos cabeceras de un campo, por el viento. */
function cabeceras(esc0: Scenario): Scenario[] {
  const por = new Map<number, Scenario>();
  for (const v of [0, 90, 180, 270]) {
    const e = conViento(esc0, { ...TIEMPO_DE_CASA, vientoDe: v, vientoKt: 15 });
    por.set(Math.round(e.runway.heading), e);
  }
  return [...por.values()];
}

describe("lo que dice el AIP de cada intersección", () => {
  const gcxo = porId("tenerife-norte").aerodrome!;
  const gcgm = porId("la-gomera").aerodrome!;

  it("Los Rodeos: la E-2 por la 12 y la E-4 por la 30, con la TORA de su AD 2.13", () => {
    expect(desdeLaInterseccion(gcxo, "12", "E2")).toEqual({ permitida: true, tora: 2546 });
    expect(desdeLaInterseccion(gcxo, "30", "E-4")).toEqual({ permitida: true, tora: 1906 });
    // Las otras no salen en ninguna fila: ni la E3, ni la E-2 por la 30.
    expect(desdeLaInterseccion(gcxo, "12", "E3").permitida).toBe(false);
    expect(desdeLaInterseccion(gcxo, "30", "E2").permitida).toBe(false);
    expect(desdeLaInterseccion(gcxo, "12", "E4").permitida).toBe(false);
  });

  it("La Gomera, desde la A por las dos; Lanzarote y La Palma, desde ninguna", () => {
    expect(desdeLaInterseccion(gcgm, "09", "A")).toEqual({ permitida: true, tora: 400 });
    expect(desdeLaInterseccion(gcgm, "27", "A")).toEqual({ permitida: true, tora: 1100 });
    expect(desdeLaInterseccion(porId("lanzarote").aerodrome!, "03", "E3").permitida).toBe(false);
    expect(desdeLaInterseccion(porId("la-palma").aerodrome!, "36", "A").permitida).toBe(false);
  });

  it("y donde el AIP calla, desde cualquiera", () => {
    expect(desdeLaInterseccion(porId("pettirossi").aerodrome!, "02", "B")).toEqual({
      permitida: true,
      tora: null,
    });
  });

  it("la cabecera sale del rumbo, y «E-2» y «E2» son la misma calle", () => {
    const tfn = porId("tenerife-norte");
    const r = (v: number) =>
      conViento(tfn, { ...TIEMPO_DE_CASA, vientoDe: v, vientoKt: 15 }).runway.heading;
    expect(cabeceraPorRumbo(gcxo, r(110))).toBe("12");
    expect(cabeceraPorRumbo(gcxo, r(290))).toBe("30");
    expect(nombreDeCalle("E-2")).toBe(nombreDeCalle("E2"));
  });

  it("y la calle de una boca sin nombre es la primera con nombre que sale de ella", () => {
    // En La Gomera los ramales que tocan la pista no lo llevan; la A, sí.
    const grafo = construirGrafo(gcgm);
    const calles = new Set<string>();
    grafo.nudos.forEach((_, i) => {
      const tramos = (grafo.desde[i] ?? []).map((k) => grafo.tramos[k]!);
      if (tramos.some((t) => t.pista) && tramos.some((t) => !t.pista && !t.ref))
        calles.add(calleDeLaBoca(grafo, i));
    });
    expect(calles.has("A")).toBe(true);
  });
});

/** Dónde se alinea y cuánta pista le queda desde ahí, por la cabecera de `esc`. */
function comoSale(esc: Scenario, pide: number) {
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45, 17);
  const sale = suelo?.salida(undefined, undefined, pide) ?? null;
  if (!sale) return null;
  const ejes = (p: EnElPlano) => enEjesDePista(p.x, p.z, pista.x, pista.z, pista.heading);
  const alineado = sale.camino[sale.camino.length - 1]!;
  const queda = pista.length / 2 - ejes(alineado).along;
  // La boca por la que entra: el primer punto del camino sobre el eje después de la raya.
  let entra: number | null = null;
  let recorrido = 0;
  for (let i = 1; i < sale.camino.length; i++) {
    const a = sale.camino[i - 1]!;
    const b = sale.camino[i]!;
    recorrido += Math.hypot(b.x - a.x, b.z - a.z);
    if (recorrido <= sale.espera) continue;
    const e = ejes(b);
    if (Math.abs(e.across) < 1) {
      entra = pista.length / 2 - e.along;
      break;
    }
  }
  return { sale, queda, entra, ejes, aero, pista };
}

describe("en Los Rodeos, por la cabecera y no por la E3", () => {
  for (const viento of [110, 290])
    it(`por la ${viento === 110 ? 12 : 30}: cada tipo entra por la cabecera, con la pista entera`, () => {
      const esc = conViento(porId("tenerife-norte"), {
        ...TIEMPO_DE_CASA,
        vientoDe: viento,
        vientoKt: 15,
      });
      for (const tipo of tiposDelCampo("GCXO", esc.runway.length)) {
        const m = comoSale(esc, pistaQuePideConSuMargen(tipo))!;
        expect(m, tipo.id).not.toBeNull();
        expect(m.sale.remonta, tipo.id).toBe(0);
        expect(m.queda, tipo.id).toBeGreaterThan(esc.runway.length - 20);
      }
    });
});

describe("y en cada campo, con su AIP y la pista que pide cada tipo", () => {
  const CAMPOS = SCENARIOS.filter((e) => {
    const a = e.aerodrome;
    if (!a || a.privado || !a.taxiways.length) return false;
    return tiposDelCampo(a.id, e.runway.length, sinTorre(a)).length > 0;
  });

  it("hay campos que mirar", () => {
    expect(CAMPOS.length).toBeGreaterThanOrEqual(15);
  });

  for (const esc0 of CAMPOS)
    it(`${esc0.id}: desde la cabecera, desde una intersección que el AIP deja con su pista, o remontando`, () => {
      const mal: string[] = [];
      for (const esc of cabeceras(esc0)) {
        const aero = esc.aerodrome as Aerodrome;
        const cabecera = cabeceraPorRumbo(aero, esc.runway.heading);
        const tora = umbralPublicado(aero.id, cabecera)?.tora ?? esc.runway.length;
        for (const tipo of tiposDelCampo(aero.id, esc.runway.length, sinTorre(aero))) {
          const pide = pistaQuePideConSuMargen(tipo);
          const m = comoSale(esc, pide);
          const donde = `${esc0.id} ${cabecera ?? Math.round(esc.runway.heading)} ${tipo.id}`;
          if (!m) {
            mal.push(`${donde}: sin salida`);
            continue;
          }
          if (m.sale.remonta > 0) {
            /*
             * Remontando: por el pavimento de la pista, dando la vuelta al
             * principio y alineado con lo más que da la pista menos la vuelta.
             */
            const fuera = m.sale.camino
              .slice(-14)
              .filter((p) => !enElPavimento(aero, [p.x, -p.z], 6));
            if (fuera.length) mal.push(`${donde}: la media vuelta se sale del asfalto`);
            if (m.queda < esc.runway.length - 120)
              mal.push(`${donde}: remonta y se alinea con ${Math.round(m.queda)} m`);
            continue;
          }
          const enLaCabecera = m.entra !== null && m.entra > esc.runway.length - 150;
          if (enLaCabecera) continue;
          // Desde una intersección: que el AIP la deje, y con su pista.
          if (m.queda < Math.min(pide, tora) - 40)
            mal.push(`${donde}: sale de una intersección con ${Math.round(m.queda)} m y pide ${Math.round(pide)}`);
          if (aero.salidasPorInterseccion?.permitidas === false)
            mal.push(`${donde}: sale de una intersección y su AIP no lo deja`);
        }
      }
      expect(mal).toEqual([]);
    });
});

describe("el margen es el de su clase, como en el hangar", () => {
  it("de línea con el 1,15 de su certificación; avioneta y bimotor con el 1,33 de escuela", () => {
    expect(pistaQuePideConSuMargen(TIPOS.reactor)).toBeCloseTo(1800 * 1.15, 6);
    expect(pistaQuePideConSuMargen(TIPOS.turbohelice)).toBeCloseTo(1100 * 1.15, 6);
    expect(pistaQuePideConSuMargen(TIPOS.avioneta)).toBeCloseTo(300 * 1.33, 6);
    expect(pistaQuePideConSuMargen(TIPOS.bimotor)).toBeCloseTo(550 * 1.33, 6);
  });

  it("y con él, el reactor no cabe desde la E-4 por la 30 (1.906 m) y sí desde la E-2 por la 12 (2.546 m)", () => {
    const pide = pistaQuePideConSuMargen(TIPOS.reactor);
    expect(pide).toBeGreaterThan(1906);
    expect(pide).toBeLessThan(2546);
  });
});
