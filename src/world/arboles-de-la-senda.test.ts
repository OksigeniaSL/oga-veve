/**
 * **Que los árboles que se tocan no rompan lo de siempre** (H35b): ningún
 * árbol del mundo ni de la granja asoma por donde vuela un avión que despega o
 * aterriza normal, con el relieve de verdad.
 *
 * Desde que los árboles se tocan (`world/arboleda.ts`), uno que asome por la
 * senda o por la subida convertiría un vuelo corriente en un percance. La
 * vegetación ya se aparta de la franja y de las superficies de aproximación, y
 * la granja de la senda; aquí se mira con la forma que se toca, que es la que
 * se dibuja y llega más alta que la media con la que se planta.
 *
 * Por cada cabecera de la pista del escenario:
 *
 * - **la senda**: tres grados al punto de visada, a trescientos metros del
 *   umbral, y diez metros por debajo de ella, que es ir bajo de verdad; hasta
 *   tres kilómetros;
 * - **la subida**: desde el final de la pista a diez metros —los treinta y
 *   cinco pies de la norma— y al 4 %, que es menos de lo que sube cualquiera
 *   de la flota; hasta tres kilómetros.
 *
 * En los dos, el eje y las puntas de un ala de doce metros de semienvergadura.
 */

import { describe, expect, it } from "vitest";
import { Arboleda } from "./arboleda";
import { createVegetation } from "./vegetation";
import { crearGranja } from "./granja";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";
import { Terrain } from "./terrain";

const fs = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
  existsSync(ruta: string): boolean;
};

function relieve(id: string): Scenario["relieve"] {
  const ruta = `data/terrain/${id}.bin`;
  if (!fs.existsSync(ruta)) return undefined;
  const b = fs.readFileSync(ruta);
  const datos = new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  return { datos, resolucion: Math.round(Math.sqrt(datos.length)) };
}

const CAMPOS = ["yvytu-rape", "tenerife-norte", "pettirossi", "la-palma", "gran-canaria", "encarnacion"];

describe("ningún árbol asoma por la senda ni por la subida", () => {
  for (const id of CAMPOS)
    it(id, async () => {
      const base = SCENARIOS.find((e) => e.id === id);
      if (!base || !fs.existsSync(`data/terrain/${id}.bin`)) return;
      const s = await conSuAerodromo(base);
      const fino = relieve(id);
      const lejos = relieve(`${id}-lejos`);
      const t = new Terrain({ ...s, ...(fino ? { relieve: fino } : {}), ...(lejos ? { relieveLejano: lejos } : {}) });
      const cota = (x: number, z: number): number => t.sampleHeight(x, z);
      const arboleda = new Arboleda();
      const granja = s.aerodrome ? crearGranja(s.aerodrome, cota, new Date(2026, 10, 19), s.seed, arboleda) : null;
      createVegetation(s, cota, undefined, granja ? (x, z) => granja.ocupa(x, z) : undefined, arboleda);
      expect(arboleda.cuantos).toBeGreaterThan(0);

      const r = s.runway;
      const tocados: string[] = [];
      for (const sentido of [0, 180]) {
        const h = ((r.heading + sentido) * Math.PI) / 180;
        // Hacia donde se vuela, y el través.
        const fx = Math.sin(h);
        const fz = -Math.cos(h);
        const tx = Math.cos(h);
        const tz = Math.sin(h);
        // El umbral por el que se entra y el final por el que se sale, en este sentido.
        const umbral = { x: r.x - (fx * r.length) / 2, z: r.z - (fz * r.length) / 2 };
        const final = { x: r.x + (fx * r.length) / 2, z: r.z + (fz * r.length) / 2 };
        const yUmbral = cota(umbral.x, umbral.z);
        const yFinal = cota(final.x, final.z);
        const mirar = (que: string, x: number, y: number, z: number, d: number): void => {
          // Donde el monte mismo sube por encima del camino, lo que se toca es el suelo, no un árbol.
          if (cota(x, z) > y - 1) return;
          for (const lado of [-12, 0, 12])
            if (arboleda.toca(x + tx * lado, y, z + tz * lado))
              tocados.push(`${que} ${(r.heading + sentido) % 360}°, a ${Math.round(d)} m, ${lado} m de lado`);
        };
        for (let d = 0; d <= 3000; d += 4) {
          const senda = yUmbral + (d + 300) * Math.tan((3 * Math.PI) / 180) - 10;
          mirar("senda", umbral.x - fx * d, Math.max(senda, yUmbral + 2), umbral.z - fz * d, d);
          mirar("subida", final.x + fx * d, yFinal + 10 + d * 0.04, final.z + fz * d, d);
        }
      }
      expect(tocados.slice(0, 10)).toEqual([]);
    }, 60000);
});
