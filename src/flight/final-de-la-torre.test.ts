/**
 * La final de la torre: desde dónde te da la pista. Ver
 * `flight/final-de-la-torre.ts`.
 *
 * «La torre me dio el permiso con el avión ya en la cabecera, con la máquina
 * contando "one hundred"» (Enrique, en La Palma). El permiso se pedía al
 * entrar en la fase «final» del plan, que empieza a mil pies como muy pronto
 * y a cuarenta metros si uno se alinea tarde; y cada vez que esa fase se salía
 * un instante y volvía, se pedía otro.
 */
import { describe, expect, it } from "vitest";
import {
  FINAL_DE_LA_TORRE,
  FinalDeLaTorre,
  TECHO_DE_LA_FINAL,
  type LoQueVeLaTorre,
} from "./final-de-la-torre";
import { MILLA } from "./ruta";

/** Una final de tres grados, a `metros` del umbral. */
function enLaSenda(metros: number, extra: Partial<LoQueVeLaTorre> = {}): LoQueVeLaTorre {
  return {
    enElAire: true,
    faseDelPlan: "en-vuelo",
    enLaFinalDelPlan: false,
    alUmbral: metros,
    torcido: 0,
    sobreLaPista: metros * Math.tan((3 * Math.PI) / 180),
    vertical: -3.5,
    ...extra,
  };
}

describe("la final de la torre", () => {
  it("empieza a cinco millas en la senda, no a los mil pies de la fase del plan", () => {
    const f = new FinalDeLaTorre();
    expect(f.paso(enLaSenda(FINAL_DE_LA_TORRE + 300))).toBe(false);
    expect(f.paso(enLaSenda(FINAL_DE_LA_TORRE - 100))).toBe(true);
    // A esa distancia la senda va a mil seiscientos pies, lejos de los mil.
    expect(enLaSenda(FINAL_DE_LA_TORRE - 100).sobreLaPista / 0.3048).toBeGreaterThan(1500);
  });

  it("y la del plan de vuelo, desde su punto de final, aunque llegue de lado", () => {
    const f = new FinalDeLaTorre();
    // La 19 de La Palma: se llega por el mar, fuera del cono, por los puntos.
    expect(
      f.paso(enLaSenda(7 * MILLA, { alUmbral: null, enLaFinalDelPlan: true, torcido: 40 })),
    ).toBe(true);
  });

  it("no se entra subiendo, ni de través, ni pasando alto por encima", () => {
    expect(new FinalDeLaTorre().paso(enLaSenda(3000, { vertical: 4 }))).toBe(false);
    expect(new FinalDeLaTorre().paso(enLaSenda(3000, { torcido: 90 }))).toBe(false);
    expect(
      new FinalDeLaTorre().paso(enLaSenda(3000, { sobreLaPista: TECHO_DE_LA_FINAL + 50 })),
    ).toBe(false);
    expect(new FinalDeLaTorre().paso(enLaSenda(3000, { alUmbral: null }))).toBe(false);
    expect(new FinalDeLaTorre().paso(enLaSenda(3000, { enElAire: false }))).toBe(false);
  });

  /*
   * **La causa del permiso repetido.** La fase del plan se sale de «final» en
   * un fotograma —«en-vuelo» no espera— y vuelve medio segundo después; cada
   * vuelta era un permiso nuevo, con su lámpara y su voz, a la altura que
   * fuera. La final de la torre no se entera de ese parpadeo.
   */
  it("y no se sale porque la fase del plan parpadee en la final corta", () => {
    const f = new FinalDeLaTorre();
    const dentro: boolean[] = [];
    for (let d = 4000; d > 0; d -= 50) {
      const fase = d < 2000 && Math.floor(d / 100) % 3 === 0 ? "en-vuelo" : "final";
      dentro.push(f.paso(enLaSenda(d, { faseDelPlan: fase, torcido: (d % 7) - 3 })));
    }
    expect(dentro.every(Boolean)).toBe(true);
  });

  it("se sale yéndose al aire, dándose la vuelta o pasando la pista", () => {
    const sube = new FinalDeLaTorre();
    expect(sube.paso(enLaSenda(2000))).toBe(true);
    // Veinte metros por encima de lo más bajo de esta final: se fue al aire.
    expect(sube.paso(enLaSenda(1900, { sobreLaPista: 105 + 21, vertical: 6 }))).toBe(false);
    // Y no vuelve a entrar subiendo.
    expect(sube.paso(enLaSenda(1800, { sobreLaPista: 140, vertical: 6 }))).toBe(false);

    const vuelta = new FinalDeLaTorre();
    vuelta.paso(enLaSenda(3000));
    expect(vuelta.paso(enLaSenda(3000, { torcido: 150 }))).toBe(false);

    const pasada = new FinalDeLaTorre();
    pasada.paso(enLaSenda(500));
    expect(pasada.paso(enLaSenda(0, { alUmbral: null, sobreLaPista: 20 }))).toBe(false);
  });

  it("y tocar tierra la acaba", () => {
    const f = new FinalDeLaTorre();
    f.paso(enLaSenda(300));
    expect(f.paso(enLaSenda(0, { enElAire: false, faseDelPlan: "aterrizado" }))).toBe(false);
  });
});
