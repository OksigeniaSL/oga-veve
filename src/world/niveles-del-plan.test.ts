/**
 * **El nivel del plan cumple la tabla de niveles de crucero** (H49), en cada
 * tramo que ofrece el juego, en Canarias y en Paraguay, y con cada avión.
 *
 * Existe porque esto estuvo al revés sin que nada lo viera: `cruceroDelPlan`,
 * cuando elegía por kilos, empezaba a contar los niveles un millar más arriba
 * de lo que tocaba, y daba pares hacia el este e impares hacia el oeste. De Los
 * Rodeos a La Palma, con rumbo oeste, el plan subía a FL170. Las pruebas de
 * `nivel-de-crucero.ts` estaban en verde, porque miraban `nivelPara`, y el plan
 * hacía su propia cuenta.
 *
 * **La tabla, copiada aquí de sus fuentes** y no importada, para que una copia
 * mal hecha en el código no se dé la razón a sí misma:
 *
 * - **OACI**, Anexo 2, apéndice 3, tabla de niveles de crucero (y la misma en el
 *   apéndice 3 de SERA, Reglamento de Ejecución (UE) 923/2012): con derrota
 *   magnética de 000° a 179°, impares —FL010, 030, 050…—; de 180° a 359°,
 *   pares —FL020, 040, 060…—. Los visuales, quinientos pies más: FL035, 055…
 *   y FL045, 065… Es la de Paraguay: las cartas de acuerdo de Asunción con sus
 *   vecinos remiten a ella.
 * - **España**, AIP ENR 1.7, «Tabla de niveles de crucero» (enmienda 403/26,
 *   19-feb-2026), que rige también en el FIR de Canarias: con derrota magnética
 *   de **090° a 269°, impares**; de **270° a 089°, pares**. Es el semicírculo
 *   norte-sur y no el este-oeste: hacia el sur, impares. Los visuales, igual,
 *   con quinientos pies más.
 *
 * Por encima de FL290, con RVSM, sigue la misma alternancia de dos mil en dos
 * mil hasta FL410; el juego no planea por encima de FL290 (`HASTA`).
 *
 * **La derrota es la magnética de verdad**: la del Modelo Magnético Mundial en
 * el campo de salida, no la `magneticVariation` del escenario, que está para
 * que cuadren los números de las pistas inventadas.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { ANO_DE_HOY } from "../flight/radio-de-navegacion";
import { type Ruta } from "../flight/ruta";
import { declinacion } from "../ui/carta/declinacion";
import { desplazarAerodromo } from "./aerodromo-desplazado";
import { campoDeCasa, campoVecino, type CampoEnElMundo } from "./campo-del-vuelo";
import { dondeCae } from "./entre-aerodromos";
import { TIEMPO_DE_CASA, type Meteo } from "./meteo";
import { relieveDe } from "./relieve-en-disco";
import { cruceroDelTramo, rutaDelTramo, type DelJuego } from "./ruta-del-tramo";
import { conViento, destinosDe, SCENARIOS, type Scenario } from "./scenarios";

const PIE = 0.3048;
const GRADO = Math.PI / 180;

/** Si a esta derrota magnética le tocan los impares, según la tabla del país. */
function tocanImpares(pais: Scenario["pais"], magnetico: number): boolean {
  const m = ((magnetico % 360) + 360) % 360;
  return pais === "es" ? m >= 90 && m < 270 : m < 180;
}

/** Las cabeceras de un campo, por su nombre. */
function cabeceras(e: Scenario): string[] {
  const pista = e.aerodrome!.runways[0]!;
  return Object.entries(pista.thresholds)
    .filter(([, u]) => u?.xy)
    .map(([n]) => n);
}

/** El viento que pone en uso esa cabecera: de frente, quince nudos. Como `rutas-de-canarias.test.ts`. */
function vientoPara(e: Scenario, cabecera: string): Meteo {
  const pista = e.aerodrome!.runways[0]!;
  const u = pista.thresholds[cabecera]!.xy!;
  const otro = Object.entries(pista.thresholds).find(([n, v]) => n !== cabecera && v?.xy)![1]!.xy!;
  const rumbo = ((Math.atan2(otro[0] - u[0], otro[1] - u[1]) / GRADO) + 360) % 360;
  return { ...TIEMPO_DE_CASA, vientoDe: Math.round(rumbo), vientoKt: 15 };
}

interface Tramo {
  readonly nombre: string;
  readonly pais: Scenario["pais"];
  readonly salida: CampoEnElMundo;
  readonly ruta: Ruta;
  readonly juego: Omit<DelJuego, "techo">;
  /** La derrota magnética de la salida a la llegada, grados. */
  readonly magnetico: number;
}

const por = (id: string) => SCENARIOS.find((e) => e.id === id)!;
const conPistas = (e: Scenario | undefined): e is Scenario =>
  !!e && !!e.aerodrome && cabeceras(e).length >= 2;

/** Todos los tramos que ofrece el juego, con cada par de cabeceras. */
const TRAMOS: Tramo[] = [];
for (const sal of SCENARIOS) {
  if (sal.pais === "inventado" || !conPistas(sal)) continue;
  for (const id of destinosDe(sal)) {
    const lle = por(id);
    if (!conPistas(lle)) continue;
    const origen = sal.aerodrome!.origin;
    const cota = relieveDe([sal.id, lle.id], origen);
    for (const cs of cabeceras(sal))
      for (const cl of cabeceras(lle)) {
        const salida = campoDeCasa(conViento(sal, vientoPara(sal, cs)));
        const d = dondeCae(origen, lle.aerodrome!.origin);
        const llegada = campoVecino(lle, d, desplazarAerodromo(lle.aerodrome!, d.x, d.z), vientoPara(lle, cl));
        const juego: Omit<DelJuego, "techo"> = {
          origen,
          enElAire: null,
          cotaDePista: (campo) => campo.escenario.aerodrome?.elevationM ?? 0,
          cota,
        };
        const ruta = rutaDelTramo(salida, llegada, { ...juego, techo: 11000 });
        const a = ruta.fijos[0]!;
        const b = ruta.fijos[ruta.fijos.length - 1]!;
        const verdadero = Math.atan2(b.x - a.x, -(b.z - a.z)) / GRADO;
        TRAMOS.push({
          nombre: `${sal.id} ${cs} → ${lle.id} ${cl}`,
          pais: sal.pais,
          salida,
          ruta,
          juego,
          // El WMM da el este positivo; el magnético es el verdadero menos ella.
          magnetico: (((verdadero - declinacion(origen.lat, origen.lon, ANO_DE_HOY)) % 360) + 360) % 360,
        });
      }
  }
}

/** El crucero que pone el juego para este avión, en pies. Como `Game.cruceroDe`. */
function crucero(t: Tramo, avion: (typeof AIRCRAFT)[number]): number {
  return (
    cruceroDelTramo(t.ruta, t.salida, {
      ...t.juego,
      techo: avion.alturaDeCrucero,
      visual: avion.reglasDeVuelo === "visual",
      ficha: avion,
    }) / PIE
  );
}

/** Si un crucero en pies es un nivel de la tabla para esa derrota. */
function cumple(t: Tramo, pies: number, visual: boolean): boolean {
  const millares = (pies - (visual ? 500 : 0)) / 1000;
  const entero = Math.round(millares);
  if (Math.abs(millares - entero) > 1e-6) return false;
  return (entero % 2 === 1) === tocanImpares(t.pais, t.magnetico);
}

/*
 * La sonda: con `H49_SONDA=<fichero>` se escribe en él el nivel de cada tramo
 * para cada avión, en centenares de pies y con «!» si no cumple: para medir
 * antes y después de tocar la regla.
 */
const proceso = (
  globalThis as unknown as {
    process: { env: Record<string, string | undefined>; getBuiltinModule(nombre: string): unknown };
  }
).process;
const SONDA = proceso.env.H49_SONDA;

describe("el nivel del plan cumple la tabla de niveles de crucero", () => {
  it("hay tramos de los dos países y de los dos semicírculos de cada tabla", () => {
    for (const pais of ["es", "py"] as const) {
      const suyos = TRAMOS.filter((t) => t.pais === pais);
      expect(suyos.length, pais).toBeGreaterThan(0);
      expect(new Set(suyos.map((t) => tocanImpares(pais, t.magnetico))).size, pais).toBe(2);
    }
  });

  if (SONDA) {
    it("sonda: el nivel de cada tramo", () => {
      const filas: string[] = [];
      const vistos = new Set<string>();
      for (const t of TRAMOS) {
        const clave = t.nombre.replace(/ \S+ →/, " →").replace(/ \S+$/, "");
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        const niveles = AIRCRAFT.map((a) => {
          const p = crucero(t, a);
          return `${a.id}:${Math.round(p / 100)}${cumple(t, p, a.reglasDeVuelo === "visual") ? "" : "!"}`;
        });
        filas.push(`${clave.padEnd(32)} ${t.magnetico.toFixed(0).padStart(3)}° ${niveles.join(" ")}`);
      }
      const fs = proceso.getBuiltinModule("node:fs") as { writeFileSync(ruta: string, texto: string): void };
      fs.writeFileSync(SONDA, `${filas.join("\n")}\n`);
    });
  }

  for (const avion of AIRCRAFT) {
    const visual = avion.reglasDeVuelo === "visual";
    it(`${avion.id}: ${visual ? "medio nivel visual" : "nivel"} de su semicírculo en cada tramo`, () => {
      const mal: string[] = [];
      for (const t of TRAMOS) {
        const p = crucero(t, avion);
        if (p <= 0) continue;
        if (!cumple(t, p, visual))
          mal.push(`${t.nombre} (${t.magnetico.toFixed(0)}° M): ${Math.round(p)} ft`);
      }
      expect(mal).toEqual([]);
    });
  }
});
