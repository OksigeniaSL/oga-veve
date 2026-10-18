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
import { AIRCRAFT, CASA, LIBREA } from "../flight/aircraft";
import { CONTRASTE_DE_COLA, contraste, motivoQueSeLee } from "./librea";

const hex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;
const DE_LA_CASA: readonly number[] = Object.values(CASA);

/** Un crema: claro y casi sin color, que es lo que es un casco pintado. */
function esCrema(n: number): boolean {
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return Math.min(r, g, b) >= 200 && Math.max(r, g, b) - Math.min(r, g, b) <= 16;
}

/** Lo que lleva pintado cada pieza de un avión, con lo que toma por defecto. */
function piezasDe(a: (typeof AIRCRAFT)[number]) {
  const { body, accent, trim, cola = accent, remate = accent } = a.appearance;
  return { body, accent, trim, cola, remate };
}

describe("los colores de la flota", () => {
  it("salen del logotipo, y el casco es crema", () => {
    for (const a of AIRCRAFT) {
      const { body, accent, trim, cola, remate } = piezasDe(a);
      expect(DE_LA_CASA.includes(body) || esCrema(body), `${a.id} casco ${hex(body)}`).toBe(true);
      for (const [que, c] of [
        ["capó", accent],
        ["raya", trim],
        ["cola", cola],
        ["remate", remate],
      ] as const)
        expect(DE_LA_CASA, `${a.id} ${que} ${hex(c)}`).toContain(c);
    }
  });

  /*
   * **El ocre se queda en el sol.** Es el del sol del motivo y el del
   * logotipo, y nada más: pintado en grande —el fumigador entero, la franja y
   * la T del JAZ 60, la raya y los motores del JAZ 120— se leía naranja, y
   * «el color de la granja es terracota y no naranja».
   */
  it("ninguna pieza del avión es ocre: el ocre es del sol", () => {
    for (const a of AIRCRAFT)
      for (const [que, c] of Object.entries(piezasDe(a)))
        expect(c, `${a.id}: ${que} en ocre`).not.toBe(CASA.ocre);
  });

  /*
   * **Toda la flota lleva la misma librea**, como una compañía aérea de
   * verdad: casco crema, cola verde, franja terracota con la raya en verde y
   * las aletas en terracota.
   *
   * Aquí se comprobaba lo contrario: que ningún avión fuera igual al de al
   * lado en la fila del hangar, y para cumplirlo cada uno repartía los colores
   * a su manera —uno con la cola terracota, otro entero en ocre, otro con la
   * franja verde—. Junto a sus ilustraciones, que llevan todas la misma, no
   * casaban: «intenta que queden homogéneos». Lo que distingue a un avión de
   * otro es **la silueta** —ala alta o baja, una hélice o dos, la cola en T,
   * dos motores o cuatro—, que es lo que cada uno enseña y lo que se reconoce
   * el día que se ve uno de verdad. La pintura dice de quién es.
   */
  it("toda la flota lleva la misma librea: la de la casa", () => {
    expect(LIBREA.cola, "la cola de la casa").toBe(CASA.verde);
    expect(LIBREA.accent, "la franja de la casa").toBe(CASA.terracota);
    for (const a of AIRCRAFT) expect(piezasDe(a), a.id).toEqual(LIBREA);
  });
});

describe("el terracota", () => {
  /*
   * «Se echa de menos el terracota: el logo de Granja Óga lo lleva y es un
   * color fundamental.» Lo dijo quien juega del JAZ 120, que iba de verde con
   * raya ocre. Con la librea de la casa lo lleva toda la flota en la franja;
   * esto vigila que no vuelva a faltar en ninguno.
   */
  it("lo lleva todo avión de la casa, en algún sitio", () => {
    for (const a of AIRCRAFT) {
      const { accent, trim, cola, remate } = piezasDe(a);
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
