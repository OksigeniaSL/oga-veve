import { describe, expect, it } from "vitest";
import { type Caja, colocar, pisa, RESPIRO, tramosLibres, trasladar } from "./reparto";

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

describe("colocar lo que no puede esperar", () => {
  // 1280 × 800 con el dedo, de fuera (H28f): el aviso sube con el cuadro y le
  // quita a la lámpara el sitio del subtítulo; debajo, el cuadro.
  const P = caja(0, 0, 1280, 800);
  const barra = caja(260, 70, 550, 147);
  const aviso = caja(395, 278, 885, 342);
  const cuadro = caja(300, 348, 980, 800);
  // La frase de mentira no pasa de 420 de ancho: la lámpara, de ese ancho.
  const lampara = {
    natural: caja(95, 221, 515, 305),
    hueco: [95, 1029] as const,
    ancla: "arriba" as const,
    sitios: [],
    mueve: true,
  };

  it("sin buscar al otro lado, espera", () => {
    expect(colocar(lampara, [barra, cuadro, aviso], P, frase(420 * 84))).toBeNull();
  });

  it("buscando al otro lado, sube a la franja libre de debajo de la barra", () => {
    const sitio = colocar({ ...lampara, alOtroLado: true }, [barra, cuadro, aviso], P, frase(420 * 84));
    expect(sitio).not.toBeNull();
    expect(sitio && [barra, cuadro, aviso].some((o) => pisa(sitio, o))).toBe(false);
    expect(sitio?.arr).toBe(147 + RESPIRO);
  });
});

describe("trasladar", () => {
  const PANTALLA_TABLET = caja(0, 0, 900, 600);

  it("si en su sitio no pisa nada, se queda en su sitio", () => {
    const natural = caja(300, 70, 560, 96);
    expect(trasladar(natural, "arriba", [], [caja(0, 0, 60, 60)], PANTALLA_TABLET)).toEqual(natural);
  });

  it("si pisa la vuelta al avión, se lleva entera al lado, en su fila, sin estrecharse", () => {
    // La radio cae en la segunda fila de la barra, sobre la columna de la pausa.
    const vuelta = caja(16, 64, 60, 108);
    const natural = caja(20, 70, 280, 96);
    const sitio = trasladar(natural, "arriba", [], [vuelta], PANTALLA_TABLET);
    expect(sitio).not.toBeNull();
    expect(sitio && pisa(sitio, vuelta)).toBe(false);
    expect(sitio?.arr).toBe(70);
    expect(sitio && sitio.der - sitio.izq).toBe(260);
    expect(sitio?.izq).toBe(60 + RESPIRO);
  });

  it("si en su fila no cabe entera, baja debajo de lo que la estorba", () => {
    const fila = caja(0, 64, 900, 108);
    const natural = caja(20, 70, 280, 96);
    const sitio = trasladar(natural, "arriba", [], [fila], PANTALLA_TABLET);
    expect(sitio?.arr).toBe(108 + RESPIRO);
    expect(sitio?.izq).toBe(20);
  });

  it("si no cabe en ninguna fila, espera", () => {
    const natural = caja(20, 70, 280, 96);
    expect(trasladar(natural, "arriba", [], [caja(0, 60, 900, 600)], PANTALLA_TABLET)).toBeNull();
  });
});
