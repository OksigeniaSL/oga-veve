/**
 * **El suelo que pisa el avión es el asfalto que se ve**, en todos los campos.
 *
 * Existe por Guaraní: el JAZ 40, el 60, el 90 y el 120, los cuatro con las
 * ruedas medio metidas en la pista. No era de Guaraní: era de todos. El
 * terreno del aeródromo se aplana `RESALTE` por debajo del pavimento para que
 * el relieve no asome entre los triángulos del asfalto, y el modelo de vuelo
 * apoyaba las ruedas en el terreno. Treinta y cinco centímetros en todas las
 * pistas, calles y plataformas del juego, y ninguna prueba que lo mirara:
 * cada una medía una superficie contra sí misma.
 *
 * Aquí se miden **las dos**: el pavimento dibujado, con un rayo hacia abajo
 * contra sus mallas, y lo que contesta `sampleSurface`, que es exactamente lo
 * que usa el modelo de vuelo para apoyar las ruedas. Por las pistas, por cada
 * calle de rodaje y en cada puesto, en el aeródromo tal y como lo deja el
 * juego después de ponerle el tiempo —ver `rehacerAerodromo`—.
 *
 * Y al revés, en la hierba: lejos del asfalto, el avión pisa el terreno y no
 * treinta y cinco centímetros de aire.
 *
 * Que el modelo de cada avión apoye sus ruedas donde el modelo de vuelo lo
 * pone, y que en el campo de llegada conteste el pavimento del vecino, lo
 * mira `scripts/verificar-ruedas.mjs` en el juego de verdad, con la flota.
 */

import { Mesh, Raycaster, Vector3, type Object3D } from "three";
import { describe, expect, it } from "vitest";
import type { Punto } from "./aerodrome";
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

const ruta = (id: string): string => `data/terrain/${id}.bin`;

function relieve(id: string): Scenario["relieve"] {
  if (!fs.existsSync(ruta(id))) return undefined;
  const b = fs.readFileSync(ruta(id));
  const datos = new Int16Array(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
  return { datos, resolucion: Math.round(Math.sqrt(datos.length)) };
}

/**
 * Cuánto se perdona, m. «Unos centímetros»: menos que el grosor de un
 * neumático aplastado, y más que la diferencia entre interpolar el mapa de
 * alturas en bilineal —el modelo de vuelo— y en triángulos —el dibujo—.
 */
const TOLERANCIA = 0.03;

/**
 * Ocho puntos a tres metros alrededor de uno: si en alguno cambia el suelo
 * —asfalto a un lado, hierba al otro—, hay filo cerca. Ocho y no cuatro,
 * porque las cuñas de hierba que quedan donde se juntan dos calles van en
 * diagonal.
 */
const FILO: readonly (readonly [number, number])[] = Array.from(
  { length: 8 },
  (_, k) => [3 * Math.cos((k * Math.PI) / 4), 3 * Math.sin((k * Math.PI) / 4)],
);

/** Si hay filo de pavimento cerca de un punto. Ver `FILO`. */
function cercaDelFilo(pavimento: Object3D[], x: number, z: number): boolean {
  const aqui = asfaltoEn(pavimento, x, z) !== null;
  return FILO.some(
    ([ox, oz]) => (asfaltoEn(pavimento, x + ox, z + oz) !== null) !== aqui,
  );
}

const rayo = new Raycaster();
const ABAJO = new Vector3(0, -1, 0);

/** La cota del pavimento dibujado en un punto del mundo, o `null` si no hay. */
function asfaltoEn(pavimento: Object3D[], x: number, z: number): number | null {
  rayo.set(new Vector3(x, 10000, z), ABAJO);
  const golpe = rayo.intersectObjects(pavimento, false)[0];
  return golpe ? golpe.point.y : null;
}

/** Puntos repartidos a lo largo de una polilínea, cada `paso` metros. */
function aLoLargo(eje: readonly Punto[], paso: number): Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i < eje.length - 1; i++) {
    const [ax, ay] = eje[i]!;
    const [bx, by] = eje[i + 1]!;
    const largo = Math.hypot(bx - ax, by - ay);
    for (let d = 0; d < largo; d += paso) {
      const t = d / largo;
      puntos.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
  }
  return puntos;
}

const CAMPOS = SCENARIOS.filter((e) => e.aerodrome);

describe("las ruedas apoyan en el asfalto que se ve", () => {
  it("hay campos que mirar", () => {
    expect(CAMPOS.length).toBeGreaterThan(15);
  });

  for (const esc of CAMPOS) {
    it(`en ${esc.id}`, () => {
      const aero = esc.aerodrome!;
      const terreno = new Terrain({ ...esc, relieve: relieve(esc.id) ?? esc.relieve });
      // Como lo deja el juego al ponerle el tiempo: sobre el mapa de alturas.
      terreno.rehacerAerodromo(esc);
      const pavimento: Object3D[] = [];
      terreno.group
        .getObjectByName(`aerodromo:${aero.id}`)
        ?.traverse((o) => {
          if (o instanceof Mesh && o.name.startsWith("pavimento:"))
            pavimento.push(o);
        });
      expect(pavimento.length).toBeGreaterThan(0);

      /*
       * Por el medio de cada pista y de cada calle —ahí no hay filo que
       * discutir— y en cada puesto, que es donde el avión pasa más rato
       * parado y donde más se ve.
       */
      const donde: Punto[] = [
        ...aero.runways.flatMap((p) => aLoLargo(p.centerline, 60)),
        ...aero.taxiways.flatMap((t) => aLoLargo(t.path, 80)),
        ...(aero.parkingPositions ?? []).map((p) => p.xy),
      ];
      let medidos = 0;
      let peor = { d: 0, x: 0, z: 0 };
      for (const [fx, fy] of donde) {
        const x = fx;
        const z = -fy;
        const asfalto = asfaltoEn(pavimento, x, z);
        if (asfalto === null) continue;
        /*
         * **Y lejos del filo**: a menos de una celda del borde el suelo del
         * avión es una rampa a propósito —ver «Por qué se interpola» en
         * `mapa-del-pavimento.ts`— y lo que se mide aquí es el asfalto, no
         * la rampa. Las puntas de las calles caen justo ahí.
         */
        if (cercaDelFilo(pavimento, x, z)) continue;
        medidos++;
        const d = terreno.sampleSurface(x, z) - asfalto;
        if (Math.abs(d) > Math.abs(peor.d)) peor = { d, x, z };
      }
      // Que se haya medido de verdad: una prueba que no encuentra asfalto
      // pasaría sin mirar nada.
      expect(medidos).toBeGreaterThan(donde.length * 0.6);
      expect(
        Math.abs(peor.d),
        `${esc.id}: las ruedas quedan ${(peor.d * 100).toFixed(0)} cm ` +
          `${peor.d < 0 ? "dentro del" : "por encima del"} asfalto en ` +
          `(${peor.x.toFixed(0)}, ${peor.z.toFixed(0)})`,
      ).toBeLessThan(TOLERANCIA);

      /*
       * Y fuera, en la hierba, el suelo es el terreno: el arreglo no puede
       * consistir en poner al avión a flotar en todas partes. Se mira a
       * doscientos metros del eje de la pista, donde no haya pavimento.
       */
      const pista = aero.runways[0]!.centerline;
      const [ax, ay] = pista[0]!;
      const [bx, by] = pista[pista.length - 1]!;
      const l = Math.hypot(bx - ax, by - ay);
      let enHierba = 0;
      for (let t = 0.1; t < 0.95; t += 0.1) {
        for (const lado of [-1, 1]) {
          const x = ax + (bx - ax) * t + (-(by - ay) / l) * 200 * lado;
          const y = ay + (by - ay) * t + ((bx - ax) / l) * 200 * lado;
          if (asfaltoEn(pavimento, x, -y) !== null) continue;
          if (cercaDelFilo(pavimento, x, -y)) continue;
          if (terreno.sampleHeight(x, -y) <= esc.waterLevel) continue;
          enHierba++;
          expect(terreno.sampleSurface(x, -y)).toBeCloseTo(
            terreno.sampleHeight(x, -y),
            3,
          );
        }
      }
      expect(enHierba).toBeGreaterThan(0);
    });
  }
});
