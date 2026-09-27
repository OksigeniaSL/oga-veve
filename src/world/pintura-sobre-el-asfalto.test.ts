/**
 * **La pintura va sobre el asfalto que se ve, a dos centímetros**, en todos
 * los campos.
 *
 * Iba veinte centímetros por encima de la cota del aeródromo, para que no
 * quedara enterrada donde el pavimento —triángulos grandes— se aparta de esa
 * cota. Y aun así quedaba enterrada en algunos sitios —treinta y siete
 * centímetros bajo el asfalto en las bandas laterales de Los Rodeos, cuarenta
 * en una plataforma de Cuatro Vientos— y flotando ochenta y cinco en otros;
 * mientras, la rueda que paraba encima de una línea se hundía veinte en ella.
 * Ahora cada vértice de la pintura se apoya en el pavimento dibujado —ver
 * `alturaDelPavimento`— y las tiras se tienden en rejilla para que se apoyen
 * también por en medio. Aquí se mide con un rayo contra el pavimento, en los
 * vértices y en el centro de los triángulos.
 *
 * Lo que la separa del asfalto de lejos no es la altura sino el desplazamiento
 * de polígono (`ENCIMA_PINTURA`); que no parpadee lo mira
 * `scripts/verificar-pintura-lejos.mjs` con la tarjeta de verdad.
 */

import { BufferGeometry, Mesh, Raycaster, Vector3, type Object3D } from "three";
import { describe, expect, it } from "vitest";
import { SCENARIOS, type Scenario } from "./scenarios";
import { Terrain } from "./terrain";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
  existsSync(ruta: string): boolean;
};

function relieve(id: string): Scenario["relieve"] {
  const ruta = `data/terrain/${id}.bin`;
  if (!fs.existsSync(ruta)) return undefined;
  const b = fs.readFileSync(ruta);
  const datos = new Int16Array(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
  return { datos, resolucion: Math.round(Math.sqrt(datos.length)) };
}

const rayo = new Raycaster();
const ABAJO = new Vector3(0, -1, 0);

function asfaltoEn(pavimento: Object3D[], x: number, z: number): number | null {
  rayo.set(new Vector3(x, 10000, z), ABAJO);
  const golpe = rayo.intersectObjects(pavimento, false)[0];
  return golpe ? golpe.point.y : null;
}

/** Las mallas de pintura: la de la pista, el amarillo, las letras y los números. */
const PINTURA = ["pintura", "amarillo", "designador", "letreros"];

describe("la pintura va sobre el asfalto, ni dentro ni flotando", () => {
  for (const esc of SCENARIOS.filter((e) => e.aerodrome)) {
    it(`en ${esc.id}`, () => {
      const terreno = new Terrain({ ...esc, relieve: relieve(esc.id) ?? esc.relieve });
      terreno.rehacerAerodromo(esc);
      const aero = terreno.group.getObjectByName(`aerodromo:${esc.aerodrome!.id}`)!;
      aero.updateMatrixWorld(true);
      const pavimento: Object3D[] = [];
      const pintura: Mesh[] = [];
      aero.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        if (o.name.startsWith("pavimento:")) pavimento.push(o);
        if (PINTURA.includes(o.name)) pintura.push(o);
      });
      // Y que esté: si las piezas no se pueden fundir, la malla no sale, y una
      // prueba que no encuentra pintura pasaría sin mirar nada.
      if (esc.aerodrome!.taxiways.length)
        expect(pintura.some((m) => m.name === "amarillo"), "sin amarillo").toBe(true);

      let peor = { d: 0.02, x: 0, z: 0 };
      let medidos = 0;
      const v = [new Vector3(), new Vector3(), new Vector3()];
      for (const m of pintura) {
        const geo = m.geometry as BufferGeometry;
        const pos = geo.getAttribute("position");
        const idx = geo.getIndex();
        const n = idx ? idx.count : pos.count;
        // Uno de cada once triángulos: de sobra para ver una tira hundida.
        for (let t = 0; t + 2 < n; t += 3 * 11) {
          for (let k = 0; k < 3; k++)
            v[k]!.fromBufferAttribute(pos, idx ? idx.getX(t + k) : t + k).applyMatrix4(
              m.matrixWorld,
            );
          const centro = new Vector3().add(v[0]!).add(v[1]!).add(v[2]!).divideScalar(3);
          for (const p of [v[0]!, centro]) {
            const a = asfaltoEn(pavimento, p.x, p.z);
            if (a === null) continue;
            medidos++;
            const d = p.y - a;
            if (Math.abs(d - 0.03) > Math.abs(peor.d - 0.03)) peor = { d, x: p.x, z: p.z };
          }
        }
      }
      expect(medidos).toBeGreaterThan(0);
      expect(
        peor.d,
        `${esc.id}: la pintura queda ${(peor.d * 100).toFixed(1)} cm sobre el asfalto en (${peor.x.toFixed(0)}, ${peor.z.toFixed(0)})`,
      ).toBeGreaterThan(0.005);
      expect(peor.d).toBeLessThan(0.06);
    });
  }
});
