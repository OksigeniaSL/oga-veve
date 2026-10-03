/**
 * Que la flota vaya vestida de la casa, y que su cola se lea.
 *
 * Los colores de un avión los decide su ficha y los pinta el juego al cargar
 * el modelo, así que un error de color no rompe nada: sale un avión azul y ya.
 * Pasó —el JAZ 60 y el JAZ 120 llevaban un azul marino que no está en el
 * logotipo— y lo vio quien jugaba: «el avión no parece de la granja». Esto lo
 * dice antes.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT, CASA } from "../flight/aircraft";
import { CONTRASTE_DE_COLA, contraste, motivoQueSeLee } from "./librea";

const hex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;
const DE_LA_CASA: readonly number[] = Object.values(CASA);

/** Un crema: claro y casi sin color, que es lo que es un casco pintado. */
function esCrema(n: number): boolean {
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return Math.min(r, g, b) >= 200 && Math.max(r, g, b) - Math.min(r, g, b) <= 16;
}

describe("los colores de la flota", () => {
  it("salen del logotipo: ocre, terracota y verde bosque, y el casco crema", () => {
    for (const a of AIRCRAFT) {
      const { body, accent, trim, cola, remate } = a.appearance;
      expect(DE_LA_CASA.includes(body) || esCrema(body), `${a.id} casco ${hex(body)}`).toBe(true);
      for (const [que, c] of [
        ["capó", accent],
        ["raya", trim],
        ["cola", cola ?? accent],
        ["remate", remate ?? accent],
      ] as const)
        expect(DE_LA_CASA, `${a.id} ${que} ${hex(c)}`).toContain(c);
    }
  });

  it("ningún avión es igual al de al lado en la fila", () => {
    const vestido = (i: number): string => {
      const p = AIRCRAFT[i]!.appearance;
      return [p.body, p.accent, p.trim, p.cola ?? p.accent, p.remate ?? p.accent].join("/");
    };
    for (let i = 1; i < AIRCRAFT.length; i++)
      expect(vestido(i), `${AIRCRAFT[i - 1]!.id} y ${AIRCRAFT[i]!.id}`).not.toBe(vestido(i - 1));
  });
});

describe("el terracota", () => {
  /*
   * «Se echa de menos el terracota: el logo de Granja Óga lo lleva y es un
   * color fundamental.» Lo dijo quien juega del JAZ 120, que iba de verde con
   * raya ocre. Los otros dos colores del logotipo ya estaban en toda la flota;
   * el terracota, que es el del tejado, faltaba en el avión grande.
   */
  it("lo lleva todo avión de la casa que lleva pasaje, en algún sitio", () => {
    for (const a of AIRCRAFT) {
      const { accent, trim, cola, remate, motivo } = a.appearance;
      if (!motivo) continue;
      expect(
        [accent, trim, cola, remate].includes(CASA.terracota),
        `${a.id} no lleva terracota en ninguna parte`,
      ).toBe(true);
    }
  });
});

describe("el motivo de la cola", () => {
  it("se lee sobre su cola en todos los que lo llevan", () => {
    for (const a of AIRCRAFT) {
      const { motivo, accent, cola = accent } = a.appearance;
      if (!motivo) continue;
      const pintado = motivoQueSeLee(motivo, cola);
      // El sol es ocre en todos: tiene que despegarse de la cola.
      expect(contraste(hex(CASA.ocre), hex(cola)), `${a.id}: el sol`).toBeGreaterThanOrEqual(
        CONTRASTE_DE_COLA,
      );
      if (pintado === "sol-y-hojas")
        expect(contraste(hex(CASA.verde), hex(cola)), `${a.id}: las hojas`).toBeGreaterThanOrEqual(
          CONTRASTE_DE_COLA,
        );
    }
  });

  it("en una cola verde, las hojas se quitan y queda el sol", () => {
    expect(motivoQueSeLee("sol-y-hojas", CASA.verde)).toBe("sol");
    expect(motivoQueSeLee("sol-y-hojas", CASA.terracota)).toBe("sol-y-hojas");
  });
});
