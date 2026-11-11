/**
 * **El plato oscilante: las cifras de la ficha y solo en su tarjeta.**
 *
 * La figura llegó con sus números dentro —el paso colectivo, el cíclico, la
 * torsión, el radio— copiados de `flight/super-puma.ts` el día que se hizo. Si
 * un día se afina la ficha y la figura se queda con los de antes, enseñaría
 * un helicóptero que no es el que se vuela: aquí se caza.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../../flight/aircraft";
import { SUPER_PUMA } from "../../flight/super-puma";
import { ES_PY } from "../../i18n/es-PY";
import { rellenar } from "./figura";
import { figuraEnLaTarjeta } from "./montar";
import { CABEZA, DIBUJO } from "./plato-dibujo";
import { pasoAl75 } from "./plato";
import { textosDelPlato } from "./textos";

const GRADO = Math.PI / 180;

describe("el plato oscilante", () => {
  it("lleva las cifras de la ficha del Super Puma", () => {
    const r = SUPER_PUMA.rotor;
    expect(CABEZA.pitch[0]).toBeCloseTo(r.paso.minimo / GRADO, 6);
    expect(CABEZA.pitch[1]).toBeCloseTo(r.paso.maximo / GRADO, 6);
    expect(CABEZA.cyc[0]).toBeCloseTo(r.ciclico.cabeceo / GRADO, 6);
    expect(CABEZA.cyc[1]).toBeCloseTo(r.ciclico.alabeo / GRADO, 6);
    expect(CABEZA.twist).toBeCloseTo(r.torsion / GRADO, 6);
    expect(CABEZA.R).toBe(r.radio);
    expect(CABEZA.chord).toBe(r.cuerda);
    // El paso que se lee, el del 75 % del radio: de 3,5° a 20°.
    expect(pasoAl75(0)).toBeCloseTo(3.5, 6);
    expect(pasoAl75(1)).toBeCloseTo(20, 6);
  });

  it("solo sale en la tarjeta del Super Puma", () => {
    expect(figuraEnLaTarjeta("avion.plato", { id: SUPER_PUMA.id })).toEqual({ cual: "plato" });
    for (const a of AIRCRAFT) expect(figuraEnLaTarjeta("avion.plato", a), a.id).toBeNull();
  });

  it("y sus palabras salen del diccionario, sin un hueco sin llenar", () => {
    const dibujo = rellenar(DIBUJO, textosDelPlato().dibujo);
    expect(dibujo).not.toContain("{{");
    expect(dibujo).toContain(ES_PY["figura.plato.platoQueGira"]);
    // Las vueltas por segundo, las de la ficha: 265 por minuto.
    expect(dibujo).toContain("4,4 vueltas por segundo");
  });
});
