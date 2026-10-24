/**
 * La ventanilla viva: que lo que se dice de cada cosa tocada lo diga quien
 * puede —Ara, la tripulante si está a mano, la comandante nunca—, que sea
 * verdad con lo que se ve, que no se repita y que cada cosa dé su sello del
 * cuaderno de viaje. Ver `flight/lo-que-se-toca.ts`; cuándo se dice, en
 * `inicio-pasaje.test.ts`, y que se vea de verdad, en el banco
 * `scripts/verificar-inicio-3.mjs`.
 */

import { describe, expect, it } from "vitest";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import { DIBUJOS_DEL_PASAJE } from "../ui/dibujos-del-pasaje";
import { CON_FICHERO } from "../ui/ilustraciones";
import {
  laminaDe,
  LINEAS_DE_LA_VENTANILLA_VIVA,
  loQueSeDiceAlTocar,
  selloDe,
  SELLOS_DEL_VIAJE,
  type AlTocar,
  type Tocable,
} from "./lo-que-se-toca";

/** Arriba, sobre el mar de nubes, con la tripulante por el pasillo y nada dicho todavía. */
const ARRIBA: AlTocar = {
  conLaTripulante: true,
  yaDicha: () => false,
  charlaContada: () => false,
  altitud: 5000,
  nubes: { base: 1500, techo: 1950 },
  enLaFinal: false,
  faltaParaTocar: 90_000,
  altura: 5000,
};

const TODO: readonly Tocable[] = [
  "motor",
  "ala",
  "mar",
  "nubes",
  "isla-de-llegada",
  "ladera-de-mazo",
  "hito:teide",
  "hito:garajonay",
  "hito:taburiente",
  "hito:orotava",
  "hito:anaga",
  "hito:hierro",
];

describe("lo que se dice al tocar algo de la ventanilla", () => {
  it("lo dice Ara, o la tripulante en persona: la comandante nunca, ni por la megafonía", () => {
    for (const que of TODO)
      for (const conLaTripulante of [true, false]) {
        const d = loQueSeDiceAlTocar(que, { ...ARRIBA, conLaTripulante });
        expect(d, que).not.toBeNull();
        for (const l of d!.lineas) {
          expect(l.quien, `${que}: ${l.clave}`).not.toBe("mama");
          expect(l.megafonia, `${que}: ${l.clave}`).toBeFalsy();
          if (l.quien === "tripulacion") {
            expect(conLaTripulante, l.clave).toBe(true);
            expect(l.clave, l.clave).toMatch(/^inicio\.tripulacion\.pasaje\.cerca\./);
          } else expect(l.clave, l.clave).toMatch(/^inicio\.ara\.pasaje\./);
          // Con su texto en los dos idiomas, y ninguna tan corta que la voz se invente lo que falta.
          expect((ES_PY[l.clave as keyof typeof ES_PY] as string).length, l.clave).toBeGreaterThanOrEqual(30);
          expect(EN[l.clave as keyof typeof EN], l.clave).toBeTruthy();
        }
      }
  });

  it("la tripulante cuenta lo suyo si está a mano, y lo que cuenta ya no lo vuelve a contar la escena", () => {
    const motor = loQueSeDiceAlTocar("motor", ARRIBA)!;
    expect(motor.lineas.map((l) => l.clave)).toEqual([
      "inicio.tripulacion.pasaje.cerca.motor1",
      "inicio.tripulacion.pasaje.cerca.motor2",
      "inicio.ara.pasaje.secador",
    ]);
    expect(motor.charlas).toEqual(["tcpMotor"]);
    // Sin ella, o con lo suyo ya contado, Ara lo que sabe.
    for (const c of [{ conLaTripulante: false }, { charlaContada: (id: string) => id === "tcpMotor" }]) {
      const solo = loQueSeDiceAlTocar("motor", { ...ARRIBA, ...c })!;
      expect(solo.lineas.map((l) => l.clave)).toEqual(["inicio.ara.pasaje.toque.motor"]);
      expect(solo.charlas).toEqual([]);
    }
    // Y en la final, una frase y corta: la llegada no espera.
    const enLaFinal = loQueSeDiceAlTocar("hito:teide", { ...ARRIBA, enLaFinal: true })!;
    expect(enLaFinal.lineas).toHaveLength(1);
  });

  it("lo que dice Ara es verdad con lo que se ve: la punta del Teide sobre las nubes, el mar quieto desde alto", () => {
    const clave = (que: Tocable, c: Partial<AlTocar>): string | undefined =>
      loQueSeDiceAlTocar(que, { ...ARRIBA, conLaTripulante: false, ...c })?.lineas[0]?.clave;
    expect(clave("hito:teide", {})).toBe("inicio.ara.pasaje.teide");
    expect(clave("hito:teide", { nubes: null })).toBe("inicio.ara.pasaje.loVeo");
    expect(clave("mar", {})).toBe("inicio.ara.pasaje.marQuieto");
    expect(clave("mar", { altitud: 900 })).toBe("inicio.ara.pasaje.toque.mar");
    expect(clave("mar", { altitud: 300, enLaFinal: true })).toBe("inicio.ara.pasaje.cerquita");
    expect(clave("isla-de-llegada", {})).toBe("inicio.ara.pasaje.isla");
    expect(clave("isla-de-llegada", { faltaParaTocar: 30_000, altura: 1200 })).toBe("inicio.ara.pasaje.islaCerca");
    expect(clave("hito:garajonay", {})).toBe("inicio.ara.pasaje.toque.gomera");
  });

  it("no se repite: lo que ya se dijo en el vuelo no se dice otra vez, lo dijera quien lo dijera", () => {
    for (const que of TODO) {
      const dichas = new Set<string>();
      const contadas = new Set<string>();
      const c: AlTocar = { ...ARRIBA, yaDicha: (k) => dichas.has(k), charlaContada: (id) => contadas.has(id) };
      // Se toca hasta que ya no queda nada que decir: cada vez, nada de lo de antes.
      for (let vez = 0; vez < 6; vez++) {
        const d = loQueSeDiceAlTocar(que, c);
        if (!d) break;
        for (const l of d.lineas) {
          expect(dichas.has(l.clave), `${que}: ${l.clave}`).toBe(false);
          dichas.add(l.clave);
        }
        d.charlas.forEach((x) => contadas.add(x));
      }
      expect(loQueSeDiceAlTocar(que, c), que).toBeNull();
    }
  });

  it("cada cosa con su lámina, si la tiene, y cada lámina existe", () => {
    for (const que of TODO) {
      const lamina = laminaDe(que);
      if (!lamina) continue;
      // Un dibujo de la ventanita, o una ilustración sola con su receta y su fichero.
      if (lamina.startsWith("ilustracion:")) expect(CON_FICHERO, que).toContain(lamina.slice("ilustracion:".length));
      else expect(Object.keys(DIBUJOS_DEL_PASAJE), que).toContain(lamina);
    }
    expect(laminaDe("motor")).toBe("motor");
    expect(laminaDe("ladera-de-mazo")).toBe("ilustracion:mazo");
    expect(laminaDe("hito:garajonay")).toBe("gomera");
    expect(laminaDe("mar")).toBeNull();
  });

  it("y su sello del cuaderno de viaje: lo que el vuelo enseña, de la ventanilla", () => {
    expect(SELLOS_DEL_VIAJE.length).toBeGreaterThanOrEqual(6);
    expect(SELLOS_DEL_VIAJE.length).toBeLessThanOrEqual(10);
    expect(selloDe("hito:teide")).toBe("teide");
    expect(selloDe("hito:garajonay")).toBe("gomera");
    expect(selloDe("isla-de-llegada")).toBe("palma");
    expect(selloDe("hito:tajogaite")).toBe("palma");
    expect(selloDe("ladera-de-mazo")).toBe("mazo");
    expect(selloDe("mar")).toBeNull();
    // Todos se pueden tocar, menos las ruedas, que se ven por fuera: las da la escena.
    const porToque = new Set(TODO.map(selloDe).filter(Boolean));
    for (const s of SELLOS_DEL_VIAJE) if (s !== "ruedas") expect(porToque, s).toContain(s);
  });

  it("las frases nuevas, en su lista para grabar", () => {
    const claves = LINEAS_DE_LA_VENTANILLA_VIVA.map((l) => l.clave);
    expect(claves).toEqual([
      "inicio.ara.pasaje.toque.invita",
      "inicio.ara.pasaje.toque.motor",
      "inicio.ara.pasaje.toque.gomera",
      "inicio.ara.pasaje.toque.mar",
    ]);
    for (const k of claves) expect((ES_PY[k as keyof typeof ES_PY] as string).length, k).toBeGreaterThan(30);
  });
});
