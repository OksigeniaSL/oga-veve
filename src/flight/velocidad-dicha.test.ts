/**
 * Que las cifras de la velocidad que se graban sean **las que el juego puede
 * pedir**: ni una que falte —se diría la frase sin su número— ni una de más,
 * que es pagar por una toma que no suena nunca. Ver `velocidad-dicha.ts`.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
import { canalesDe, laInstructoraLoExplica } from "./escalera";
import { velocidadQueToca } from "./escalera-de-velocidades";
import { topeDeLoSacado } from "./limites";
import { PELDANOS_QUE_SE_DICEN } from "./siguiente-paso";
import { TIERS } from "./tiers";
import {
  KMH_QUE_SE_DICEN,
  piezaDeVelocidad,
  velocidadDicha,
} from "./velocidad-dicha";

const PIE = 0.3048;
const MILLA = 1852;

/**
 * **Todas las marcas de un paso de velocidad**, nudos, por avión: la escalera
 * de cada uno, en cualquier sitio de la ruta, subiendo o bajando, con lo que
 * se lleve sacado y con el aire de un día frío, uno estándar y uno caliente.
 *
 * Solo en los peldaños que se dicen como velocidad —ver
 * `PELDANOS_QUE_SE_DICEN`— y **sin el Mach**: el paso de la subida se dice al
 * cruzar los diez mil pies, por debajo del *crossover*, y por encima la marca
 * ya no cambia de peldaño.
 */
function marcasDe(a: (typeof AIRCRAFT)[number]): Set<number> {
  const marcas = new Set<number>();
  const techo = Math.max(a.alturaDeCrucero, 12000 * PIE) / PIE + 2000;
  const sacados = [0, 1 / 3, 2 / 3, 1].flatMap((flaps) =>
    [0, 1].map((tren) => ({ flaps, tren })),
  );
  const aires = [
    { desviacion: -25, qnh: 1035 },
    { desviacion: 0, qnh: 1013.25 },
    { desviacion: 25, qnh: 995 },
  ];
  for (let pies = 0; pies <= techo; pies += 250)
    for (const restante of [null, 1e9, 40 * MILLA, 25 * MILLA, 10 * MILLA, 6 * MILLA, 3 * MILLA])
      for (const bajando of [false, true])
        for (const subiendo of [false, true])
          for (const sacado of sacados)
            for (const aire of aires) {
              const v = velocidadQueToca(a, {
                altitud: pies * PIE,
                restante,
                bajando,
                enFinal: false,
                subiendo,
                topeKt: topeDeLoSacado(a, sacado),
                aire,
              });
              if (!PELDANOS_QUE_SE_DICEN.has(v.peldano) || v.mach !== null) continue;
              marcas.add(v.kt);
            }
  return marcas;
}

describe("la velocidad dicha con su número", () => {
  it("se graban justo las cifras que pide la escalera de los seis aviones", () => {
    const pedidas = new Set<number>();
    for (const a of AIRCRAFT)
      for (const kt of marcasDe(a)) pedidas.add(velocidadDicha(kt, "metric"));
    expect([...pedidas].sort((x, y) => x - y)).toEqual([...KMH_QUE_SE_DICEN]);
  });

  it("y el peldaño que las dice vuela en km/h: si alguno volara en nudos, faltarían sus tomas", () => {
    const conCifras = TIERS.filter(
      (t) => canalesDe(t.avisos).cifra && laInstructoraLoExplica(t.avisos),
    );
    expect(conCifras.length).toBeGreaterThan(0);
    for (const t of conCifras) expect(t.units, t.id).toBe("metric");
  });

  it("la tarjeta y la voz dicen la misma cifra, a la decena", () => {
    // La de 212 nudos: 392,6 km/h, que se escribe y se dice 390.
    expect(velocidadDicha(212, "metric")).toBe(390);
    expect(piezaDeVelocidad(212, "metric")).toBe("vuelo.paso.velocidad.390");
    // Y 300 no la pide ningún avión: sin pieza, la frase va sin el número.
    expect(piezaDeVelocidad(162, "metric")).toBe(null);
    // La de 250 nudos, el tope de los diez mil pies: 463 km/h, 460.
    expect(velocidadDicha(250, "metric")).toBe(460);
    expect(piezaDeVelocidad(250, "metric")).toBe("vuelo.paso.velocidad.460");
  });

  it("y en nudos no hay pieza: la cifra va solo en la tarjeta", () => {
    expect(velocidadDicha(250, "aeronautical")).toBe(250);
    expect(piezaDeVelocidad(250, "aeronautical")).toBe(null);
  });
});
