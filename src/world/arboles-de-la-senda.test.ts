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
 *
 * **Y con el monte de la pista corta puesto** (H35d), donde el campo lo
 * tiene: el ejercicio lo planta al montar el vuelo y no lo quita, así que es
 * parte del campo todo ese vuelo. Queda en la aproximación de la cabecera de
 * enfrente, y esa cabecera lleva entonces el umbral desplazado
 * (`world/monte-del-final.ts`): la senda se mide desde el umbral de toma y
 * tiene que librar sus copas como las del resto del mundo. La subida hacia el
 * monte no se mira contra él: pasarlo es el ejercicio, y lo mide la mesa de
 * `flight/pista-corta.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { Arboleda } from "./arboleda";
import { createVegetation, filaDeArboles } from "./vegetation";
import { dondeAcabaLaPista, monteDelCampo } from "../flight/pista-corta";
import {
  arbolesDelMonte,
  conElUmbralDelMonte,
  desplazadoPorElMonte,
  superficieDeAproximacion,
} from "./monte-del-final";
import { crearGranja } from "./granja";
import { conSuAerodromo, oaciDe, SCENARIOS, type Scenario } from "./scenarios";
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

      // El monte de la pista corta, plantado como lo planta el juego, y su umbral desplazado.
      const monte = new Arboleda();
      const delMonte = monteDelCampo(oaciDe(s));
      const fin = dondeAcabaLaPista(s.runway, s.runway.heading);
      let r = s.runway;
      // La granja es donde se practica: que la prueba no se quede sin monte sin decirlo.
      if (id === "yvytu-rape") expect(delMonte).not.toBeNull();
      if (delMonte) {
        filaDeArboles(arbolesDelMonte(fin, delMonte, cota), delMonte.alto, monte);
        const d = desplazadoPorElMonte(monte.arboles(), fin, t.cotaDeLaPista(fin.x, fin.z), r.length);
        // Sin desplazar, el monte asoma por la superficie (ADR 0027, H35c: 202 m).
        expect(d).toBeGreaterThan(150);
        r = conElUmbralDelMonte(s, fin, d).runway;
        // Y ninguna copa asoma por la superficie de aproximación que nace de él.
        const cotaDelUmbral = t.cotaDeLaPista(fin.x, fin.z);
        let peor = { pasado: 0, punta: -Infinity };
        for (const a of monte.arboles()) {
          const pasado = (a.x - fin.x) * fin.dx + (a.z - fin.z) * fin.dz;
          const lado = Math.max(0, Math.abs((a.x - fin.x) * -fin.dz + (a.z - fin.z) * fin.dx) - a.radio);
          const punta = a.y + a.centro + a.semialto - cotaDelUmbral;
          const techo = superficieDeAproximacion(pasado + d, lado);
          if (techo !== null) expect(punta).toBeLessThanOrEqual(techo);
          if (Math.abs(lado) < 1 && punta > peor.punta) peor = { pasado, punta };
        }
        /*
         * Lo que pasaba sin él (ADR 0027, H35c): la senda de tres grados a seis
         * metros de las copas con las ruedas, y una de 2,2° rozándolas. Con el
         * umbral donde lo pone el Anexo 14, la de tres grados las pasa holgada
         * y la de 2,2° todavía por encima.
         */
        const sobreLasCopas = (grados: number, desplazado: number): number =>
          (peor.pasado + desplazado + 300) * Math.tan((grados * Math.PI) / 180) - peor.punta;
        expect(sobreLasCopas(3, 0)).toBeLessThan(8);
        expect(sobreLasCopas(2.2, 0)).toBeLessThan(2);
        expect(sobreLasCopas(3, d)).toBeGreaterThan(15);
        expect(sobreLasCopas(2.2, d)).toBeGreaterThan(7);
      }

      const tocados: string[] = [];
      for (const sentido of [0, 180]) {
        const h = ((r.heading + sentido) * Math.PI) / 180;
        // Hacia donde se vuela, y el través.
        const fx = Math.sin(h);
        const fz = -Math.cos(h);
        const tx = Math.cos(h);
        const tz = Math.sin(h);
        // El umbral de toma por el que se entra —pasado el desplazado, si lo hay— y el final por el que se sale, en este sentido.
        const desplazado = (sentido === 0 ? r.desplazado : r.desplazadoEnfrente) ?? 0;
        const umbral = { x: r.x - (fx * (r.length - 2 * desplazado)) / 2, z: r.z - (fz * (r.length - 2 * desplazado)) / 2 };
        const final = { x: r.x + (fx * r.length) / 2, z: r.z + (fz * r.length) / 2 };
        // Hacia el monte se sale con la técnica del ejercicio, y eso se mide aparte.
        const haciaElMonte = (final.x - fin.x) ** 2 + (final.z - fin.z) ** 2 < 1;
        const yUmbral = cota(umbral.x, umbral.z);
        const yFinal = cota(final.x, final.z);
        const mirar = (que: string, x: number, y: number, z: number, d: number, conElMonte: boolean): void => {
          // Donde el monte mismo sube por encima del camino, lo que se toca es el suelo, no un árbol.
          if (cota(x, z) > y - 1) return;
          for (const lado of [-12, 0, 12]) {
            if (arboleda.toca(x + tx * lado, y, z + tz * lado))
              tocados.push(`${que} ${(r.heading + sentido) % 360}°, a ${Math.round(d)} m, ${lado} m de lado`);
            if (conElMonte && monte.toca(x + tx * lado, y, z + tz * lado))
              tocados.push(`monte, ${que} ${(r.heading + sentido) % 360}°, a ${Math.round(d)} m, ${lado} m de lado`);
          }
        };
        for (let d = 0; d <= 3000; d += 4) {
          const senda = yUmbral + (d + 300) * Math.tan((3 * Math.PI) / 180) - 10;
          mirar("senda", umbral.x - fx * d, Math.max(senda, yUmbral + 2), umbral.z - fz * d, d, true);
          mirar("subida", final.x + fx * d, yFinal + 10 + d * 0.04, final.z + fz * d, d, !haciaElMonte);
        }
      }
      expect(tocados.slice(0, 10)).toEqual([]);
    }, 60000);
});
