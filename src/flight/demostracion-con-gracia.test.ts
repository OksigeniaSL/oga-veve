/**
 * **La demostración con gracia, de vez en cuando** (punto 294): cada cuánto
 * sale y cuál. Ver `demostracion-con-gracia.ts`.
 */
import { describe, expect, it } from "vitest";
import { ES_PY } from "../i18n/es-PY";
import { EN } from "../i18n/en";
import {
  conGracia,
  FORMAS_CON_GRACIA,
  GRACIA,
  laDemostracion,
  type FormaDeLaDemostracion,
} from "./demostracion-con-gracia";

/** Un azar que se puede repetir. */
function azarDe(semilla: number): () => number {
  let x = semilla;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

const todas = (): boolean => true;

describe("la demostración de cada vuelo", () => {
  it("después de un vuelo con gracia, la de siempre", () => {
    for (const f of FORMAS_CON_GRACIA)
      for (const a of [0, 0.3, 0.99])
        expect(laDemostracion({ ultima: f, ultimaConGracia: f, grabada: todas, azar: () => a })).toBe("sobria");
  });

  it("sin sus dos frases grabadas, una forma no sale: una gracia muda es la tripulante callada", () => {
    for (const a of [0, 0.2, 0.4])
      expect(laDemostracion({ ultima: null, ultimaConGracia: null, grabada: () => false, azar: () => a })).toBe("sobria");
    // Con solo la entrada grabada, tampoco: o las dos, o ninguna.
    const soloLaEntrada = (c: string): boolean => c === GRACIA.examen.entrada;
    expect(laDemostracion({ ultima: null, ultimaConGracia: null, grabada: soloLaEntrada, azar: () => 0 })).toBe("sobria");
    // Y con una entera, esa.
    const examen = (c: string): boolean => c === GRACIA.examen.entrada || c === GRACIA.examen.despedida;
    expect(laDemostracion({ ultima: null, ultimaConGracia: null, grabada: examen, azar: () => 0 })).toBe("examen");
  });

  it("entre las de gracia, nunca la misma dos veces seguidas", () => {
    for (const f of FORMAS_CON_GRACIA)
      for (const a of [0, 0.1, 0.2, 0.3, 0.4, 0.49])
        expect(laDemostracion({ ultima: "sobria", ultimaConGracia: f, grabada: todas, azar: () => a })).not.toBe(f);
  });

  it("en uno de cada tres vuelos, de media, nunca dos seguidos, y salen las tres", () => {
    const azar = azarDe(7);
    let ultima: string | null = null;
    let ultimaConGracia: string | null = null;
    const salidas: FormaDeLaDemostracion[] = [];
    for (let i = 0; i < 3000; i++) {
      const f = laDemostracion({ ultima, ultimaConGracia, grabada: todas, azar });
      salidas.push(f);
      ultima = f;
      if (conGracia(f)) ultimaConGracia = f;
    }
    const conLa = salidas.filter((f) => conGracia(f)).length / salidas.length;
    expect(conLa).toBeGreaterThan(0.28);
    expect(conLa).toBeLessThan(0.38);
    for (let i = 1; i < salidas.length; i++) expect(conGracia(salidas[i]!) && conGracia(salidas[i - 1]!)).toBe(false);
    for (const f of FORMAS_CON_GRACIA) expect(salidas).toContain(f);
  });

  it("cada frase, en castellano paraguayo y en inglés, de más de treinta letras, por la megafonía y de usted", () => {
    for (const f of FORMAS_CON_GRACIA)
      for (const clave of [GRACIA[f].entrada, GRACIA[f].despedida]) {
        const es = ES_PY[clave as keyof typeof ES_PY] as string;
        expect(es, clave).toBeTruthy();
        expect(es.length, clave).toBeGreaterThan(30);
        expect(EN[clave as keyof typeof EN], clave).toBeTruthy();
        expect(clave.startsWith("inicio.tripulacion.pasaje.demo.gracia."), clave).toBe(true);
        expect(es, clave).not.toMatch(/\b(vos|tú|tu|te|ti|tienes|sabes|querés|tenés)\b/i);
      }
  });
});
