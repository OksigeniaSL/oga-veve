/**
 * Que el circuito sea el de **este** avión.
 *
 * Los metros del circuito están medidos para una avioneta que se aproxima a
 * treinta y tres metros por segundo. El JAZ 120 vuela el mismo circuito a
 * ciento cuarenta: el viento en cola entero le dura siete segundos donde a la
 * avioneta le dura treinta y tres. Medido en La Palma antes de arreglarlo: no
 * pasaba de doscientos noventa metros de altura en toda la vuelta, entraba en
 * final a dos kilómetros y medio todavía a cien metros por segundo y se comía
 * la montaña.
 *
 * > «El vuelo para dar una vuelta y volver a aterrizar me parece que es muy
 * > corto, no le da tiempo a descender y perder potencia.»
 */

import { describe, it, expect } from "vitest";
import { aircraftById } from "../flight/aircraft";
import { escalaDeCircuito, verticesDelCircuito } from "./circuito";

const PISTA = { x: 0, z: 0, heading: 0, width: 45, length: 2200 };
const vertices = (aproximacion: number) =>
  verticesDelCircuito(PISTA, 0, "izquierda", escalaDeCircuito(aproximacion));

/** Lo que mide el circuito de punta a punta, a lo largo del eje de pista. */
const largo = (v: ReturnType<typeof vertices>) =>
  Math.max(...v.map((p) => p.z)) - Math.min(...v.map((p) => p.z));

describe("la escala del circuito", () => {
  it("deja el del entrenador exactamente como estaba", () => {
    /*
     * **Esto es lo que protege todo lo demás.** Los diez escenarios del
     * barrido están medidos con este circuito, y si la escala lo moviera un
     * metro habría que volver a medirlos todos. Treinta y tres es la
     * aproximación del JAZ 20.
     */
    expect(escalaDeCircuito(33)).toBe(1);
    const v = vertices(33);
    expect(v[1]!.y).toBe(250);
    expect(v[2]!.y).toBe(250);
    expect(v[3]!.y).toBe(250);
  });

  it("no lo encoge nunca, aunque el avión sea más lento", () => {
    // El biplano se aproxima a 29: lo que sobra de circuito no molesta, lo que
    // falta mata.
    expect(escalaDeCircuito(29)).toBe(1);
    expect(largo(vertices(29))).toBe(largo(vertices(33)));
  });

  it("lo estira con la velocidad de aproximación", () => {
    /*
     * Se mide la separación del viento en cola y no el largo total, y no es un
     * atajo: el largo total lleva dentro la pista, que mide lo que mide y no
     * se estira. Lo que tiene que crecer es la **figura**.
     */
    const separacion = (v: ReturnType<typeof vertices>) => Math.abs(v[2]!.x);
    expect(separacion(vertices(98)) / separacion(vertices(33))).toBeCloseTo(
      98 / 33,
      2,
    );
    // Y el circuito entero es más largo, con la pista dentro y todo.
    expect(largo(vertices(98))).toBeGreaterThan(largo(vertices(33)) * 2);
  });

  it("sube la altura hasta que la base pueda enganchar la senda", () => {
    /*
     * Estirar la figura sin subirla dejaría al avión llegando al punto de
     * entrada en final **por debajo** de la senda de tres grados, que a cinco
     * kilómetros y medio del umbral pasa por trescientos metros. La altura de
     * circuito tiene que quedar por encima de eso con sitio para la base.
     */
    const v = vertices(98);
    const entrada = v[4]!;
    const cola = v[3]!;
    expect(cola.y).toBeGreaterThan(entrada.y + 100);
    // Y mil quinientos pies, que es la altura de circuito de un avión de línea.
    expect(cola.y).toBeGreaterThan(420);
    expect(cola.y).toBeLessThan(520);
  });

  it("la flota entera tiene un circuito que crece con ella", () => {
    const grande = aircraftById("jaz-120")!;
    const pequeno = aircraftById("jaz-20")!;
    expect(escalaDeCircuito(grande.approachSpeed)).toBeGreaterThan(
      escalaDeCircuito(pequeno.approachSpeed),
    );
  });
});
