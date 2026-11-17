/**
 * **Elegir la salida más barato no cambia la salida que se elige.** Ver la
 * enmienda H23a del ADR 0028.
 *
 * Elegir el puesto y el punto de espera de Barajas costaba 1,4 s con la CPU
 * de una tablet, y se abarató sin tocar ninguna regla: guardando lo que se
 * preguntaba varias veces y sin medir contra calles que quedan lejos. Cada
 * atajo es exacto por construcción, y esto es la prueba de que lo son todos
 * juntos: en cada campo, con cada avión de la flota, despegando por cada
 * cabecera y —los de pasarela— saliendo de un puesto de contacto o no, el
 * puesto del que se arranca y la doble raya a la que lleva la raya son los
 * que salían antes de los atajos, al centímetro. Y el atajo que es una
 * pregunta suelta —`enElPavimentoDe`, el pavimento mirado con cajas— se
 * compara además con la cuenta sin ellas, punto a punto.
 *
 * `puesto-de-salida-de-cada-campo.json` es lo que salía en `1438bc99`, antes
 * de ellos. **Si se cambia a propósito cómo se elige la salida**, esta prueba
 * se cae, y es lo que tiene que hacer: se mira que el cambio sea el que se
 * quería y se rehace el fichero con `OGA_REHACER_SALIDAS=1` delante de
 * vitest. Lo que no puede pasar es que la cambie un atajo.
 *
 * Con el día de tablas y la cota fija, como el resto de pruebas del plan: lo
 * que depende del día no lo toca ningún atajo.
 */
import { describe, expect, it } from "vitest";
import { enElPavimento, enElPavimentoDe, type Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { DIA_DE_TABLAS } from "../flight/carrera";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import ANTES from "./puesto-de-salida-de-cada-campo.json";

const nodo = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown; env: Record<string, string | undefined> };
  }
).process;
const REHACER = nodo.env.OGA_REHACER_SALIDAS === "1";

/** El puesto y la doble raya, al centímetro, como van en el fichero. */
function salida(campo: Scenario, rumbo: number, avion: (typeof AIRCRAFT)[number], deContacto: boolean): string {
  const plan = new PlanDeVuelo(campo.aerodrome!, { ...campo.runway, heading: rumbo }, () => 600, avion);
  plan.deContacto = deContacto;
  plan.diaDeDespegue = () => DIA_DE_TABLAS;
  const arranque = plan.arranque();
  const ruta = plan.reiniciar() ? plan.rutaCruda() : null;
  const fin = ruta?.[ruta.length - 1];
  const cm = (v: number | undefined): string => (v === undefined ? "x" : v.toFixed(2));
  return [cm(arranque?.[0]), cm(arranque?.[1]), cm(fin?.[0]), cm(fin?.[1])].join(" ");
}

describe("el puesto de salida de cada campo, con cada avión", async () => {
  const vistos = new Set<string>();
  const campos: Scenario[] = [];
  for (const e of SCENARIOS) {
    const s = await conSuAerodromo(e);
    if (!s.aerodrome || vistos.has(s.aerodrome.id)) continue;
    vistos.add(s.aerodrome.id);
    campos.push(s);
  }
  const antes = ANTES as Record<string, string>;
  const ahora: Record<string, string> = {};

  it.each(campos.map((c) => [c.aerodrome!.id, c] as const))("%s", (id, campo) => {
    for (const avion of AIRCRAFT)
      for (const rumbo of [campo.runway.heading, (campo.runway.heading + 180) % 360])
        for (const deContacto of vaALaPasarela(avion) ? [false, true] : [false]) {
          const clave = `${id}|${avion.id}|${rumbo.toFixed(1)}|${deContacto}`;
          ahora[clave] = salida(campo, rumbo, avion, deContacto);
          if (!REHACER) expect(ahora[clave], clave).toBe(antes[clave]);
        }
  });

  it("el pavimento con cajas contesta lo mismo que sin ellas, en cada campo", () => {
    for (const campo of campos) {
      const aero = campo.aerodrome!;
      const conCajas = enElPavimentoDe(aero);
      // Los puestos, las dobles rayas y dos mil puntos sueltos por el recinto.
      const puntos: Punto[] = [
        ...(aero.parkingPositions ?? []).map((p) => p.xy),
        ...aero.holdingPositions.map((p) => p.xy),
      ];
      const xs = puntos.map((p) => p[0]);
      const ys = puntos.map((p) => p[1]);
      const [x0, x1, y0, y1] = [Math.min(...xs) - 500, Math.max(...xs) + 500, Math.min(...ys) - 500, Math.max(...ys) + 500];
      let semilla = 12345;
      const azar = (): number => ((semilla = (Math.imul(semilla, 1103515245) + 12345) >>> 0) / 2 ** 32);
      for (let k = 0; k < 2000; k++) puntos.push([x0 + azar() * (x1 - x0), y0 + azar() * (y1 - y0)]);
      for (const p of puntos) expect(conCajas(p), `${aero.id} ${p.join(",")}`).toBe(enElPavimento(aero, p));
    }
  });

  it("y no falta ni sobra ningún caso en el fichero", () => {
    if (REHACER) {
      const { writeFileSync } = nodo.getBuiltinModule("node:fs") as {
        writeFileSync(ruta: string, texto: string): void;
      };
      const orden = Object.fromEntries(Object.entries(ahora).sort(([a], [b]) => (a < b ? -1 : 1)));
      writeFileSync("src/world/puesto-de-salida-de-cada-campo.json", JSON.stringify(orden, null, 0).replace(/,"/g, ',\n"'));
      return;
    }
    expect(Object.keys(ahora).sort()).toEqual(Object.keys(antes).sort());
  });
});
