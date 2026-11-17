import { describe, expect, it } from "vitest";
import { type Caja, colocar, pisa, RESPIRO, tramosLibres } from "./reparto";

const caja = (izq: number, arr: number, der: number, aba: number): Caja => ({ izq, arr, der, aba });
const PANTALLA = caja(0, 0, 864, 330);

/*
 * Una frase de mentira: ocupa siempre lo mismo de superficie, así que al
 * estrecharla crece hacia abajo, como el texto de verdad.
 */
const frase =
  (superficie: number, ancla: "arriba" | "abajo" = "arriba") =>
  ({ izq, der, fila }: { izq: number; der: number; fila: number }): Caja => {
    const ancho = Math.min(der - izq, 420);
    const centro = (izq + der) / 2;
    const alto = Math.ceil(superficie / ancho);
    return ancla === "arriba"
      ? caja(centro - ancho / 2, fila, centro + ancho / 2, fila + alto)
      : caja(centro - ancho / 2, fila - alto, centro + ancho / 2, fila);
  };

describe("tramosLibres", () => {
  it("quita lo que cae en la banda, con su respiro", () => {
    expect(tramosLibres(0, 600, 100, 140, [caja(200, 120, 300, 160)])).toEqual([
      [0, 200 - RESPIRO],
      [300 + RESPIRO, 600],
    ]);
  });

  it("no quita lo que está por encima o por debajo de la banda", () => {
    expect(tramosLibres(0, 600, 100, 140, [caja(200, 150, 300, 200)])).toEqual([[0, 600]]);
  });
});

describe("colocar", () => {
  it("si en su sitio no pisa nada, se queda en su sitio", () => {
    const natural = caja(178, 66, 603, 135);
    const sitio = colocar(
      { natural, hueco: [178, 603], ancla: "arriba", sitios: [], mueve: true },
      [caja(357, 202, 507, 246)],
      PANTALLA,
      () => {
        throw new Error("no se prueba nada");
      },
    );
    expect(sitio).toBe(natural);
  });

  it("si pisa el asa, la que manda más sube al sitio de la que va detrás (864 × 330 de fuera)", () => {
    // La lámpara, debajo del subtítulo, llegaba al asa; el subtítulo va detrás.
    const asa = caja(357, 202, 507, 246);
    const sitio = colocar(
      { natural: caja(178, 139, 603, 213), hueco: [178, 603], ancla: "arriba", sitios: [66], mueve: true },
      [asa],
      PANTALLA,
      frase(425 * 74),
    );
    expect(sitio).not.toBeNull();
    expect(sitio && pisa(sitio, asa)).toBe(false);
    expect(sitio?.arr).toBe(66);
  });

  it("si no cabe en ninguna fila, espera", () => {
    const sitio = colocar(
      { natural: caja(178, 139, 603, 213), hueco: [178, 603], ancla: "arriba", sitios: [], mueve: true },
      [caja(0, 100, 864, 330)],
      PANTALLA,
      frase(425 * 74),
    );
    expect(sitio).toBeNull();
  });

  it("lo que no se mueve y pisa, espera", () => {
    const sitio = colocar(
      { natural: caja(494, 157, 752, 361), hueco: [494, 752], ancla: "arriba", sitios: [], mueve: false },
      [caja(181, 346, 719, 375)],
      caja(0, 0, 900, 600),
      frase(1),
    );
    expect(sitio).toBeNull();
  });

  it("nunca más estrecha que la mitad de su hueco", () => {
    // Un mando en medio deja dos tramos de 200 en un hueco de 600: se baja de fila.
    const mando = caja(200, 100, 400, 150);
    const sitio = colocar(
      { natural: caja(100, 100, 500, 140), hueco: [0, 600], ancla: "arriba", sitios: [], mueve: true },
      [mando],
      caja(0, 0, 600, 400),
      frase(400 * 40),
    );
    expect(sitio?.arr).toBe(150 + RESPIRO);
    expect(sitio && sitio.der - sitio.izq).toBeGreaterThanOrEqual(300);
  });

  it("anclada abajo, sube por encima de lo que pisa", () => {
    const tren = caja(608, 61, 652, 140);
    const sitio = colocar(
      { natural: caja(252, 102, 612, 140), hueco: [158, 706], ancla: "abajo", sitios: [], mueve: true },
      [tren],
      PANTALLA,
      frase(360 * 38, "abajo"),
    );
    expect(sitio).not.toBeNull();
    expect(sitio && pisa(sitio, tren)).toBe(false);
  });
});
