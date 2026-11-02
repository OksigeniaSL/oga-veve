/**
 * **La noche en el mapa**: las cuentas. Lo que tiene que seguir siendo verdad es lo que dice
 * el capítulo 3, «mientras dormías cruzamos el ecuador», y que nadie se quede dentro.
 */
import { describe, expect, it } from "vitest";
import { SE_DESAYUNA_A } from "./guion-llegada-a-asuncion";
import {
  EL_MAPA_CORRE,
  NocheEnElMapa,
  planDeLaNoche,
  SE_TAPA_POR_DEBAJO,
  SE_VA_EL_MAPA,
  TOPE_DEL_DESPERTAR,
  type SucesoDeLaNoche,
} from "./noche-en-el-mapa";
import { cruceDelEcuador, cuandoPasa, DE_MADRID_A_ASUNCION, dondeVa, horarioDelDia, PASA_EL_HIERRO, perfilDelVuelo } from "./ruta-larga";

const INVIERNO = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
const VERANO = perfilDelVuelo(horarioDelDia(new Date("2026-07-15T12:00:00Z")));
const DT = 1 / 30;

/** La noche entera, con lo del medio despertar durando `dura` s; o sin acabar nunca, con `null`. */
function laNoche(plan: ReturnType<typeof planDeLaNoche>, dura: number | null): { pared: number; sucesos: { que: SucesoDeLaNoche; pared: number; hora: number }[]; n: NocheEnElMapa } {
  const n = new NocheEnElMapa(plan, 0);
  const sucesos: { que: SucesoDeLaNoche; pared: number; hora: number }[] = [];
  let pared = 0;
  let despierta: number | null = null;
  while (n.retieneElSalto && pared < 600) {
    pared += DT;
    const callados = n.fase !== "despierta" || (dura !== null && despierta !== null && pared - despierta >= dura);
    const que = n.paso(pared, callados);
    if (que) sucesos.push({ que, pared, hora: n.hora });
    if (que === "ding") despierta = pared;
  }
  return { pared, sucesos, n };
}

describe("la noche en el mapa", () => {
  for (const [nombre, p] of [
    ["en invierno", INVIERNO],
    ["en verano", VERANO],
  ] as const) {
    const plan = planDeLaNoche(p, cuandoPasa(p, PASA_EL_HIERRO + 25_000), SE_DESAYUNA_A);
    const ecuador = cuandoPasa(p, cruceDelEcuador(DE_MADRID_A_ASUNCION)!.recorrido);

    it(`${nombre}: Ara se despierta en la zona de tormentas, antes de cruzar el ecuador`, () => {
      expect(plan.seDespiertaEn).toBeGreaterThan(6 * 3600);
      expect(plan.seDespiertaEn).toBeLessThan(ecuador);
      expect(ecuador - plan.seDespiertaEn).toBeGreaterThan(20 * 60);
      // Al norte del ecuador, y dentro de lo que la zona de convergencia ocupa en esta longitud.
      const donde = dondeVa(p, plan.seDespiertaEn).sitio;
      expect(donde.lat).toBeGreaterThan(2);
      expect(donde.lat).toBeLessThan(10);
    });

    it(`${nombre}: la noche entera cabe en menos de un minuto de pared, y cruza el ecuador con Ara ya durmiendo`, () => {
      const { pared, sucesos, n } = laNoche(plan, 22);
      expect(sucesos.map((s) => s.que)).toEqual(["se-destapa", "ding", "se-vuelve-a-dormir"]);
      expect(pared).toBeLessThan(60);
      expect(pared).toBeGreaterThan(30);
      expect(n.hora).toBe(SE_DESAYUNA_A);
      const seDuerme = sucesos.find((s) => s.que === "se-vuelve-a-dormir")!;
      expect(seDuerme.hora).toBeLessThan(ecuador);
    });

    it(`${nombre}: aunque lo de despertarse no acabe nunca, se suelta y la noche no se queda ahí`, () => {
      const { pared, sucesos, n } = laNoche(plan, null);
      expect(sucesos.map((s) => s.que)).toEqual(["se-destapa", "ding", "se-vuelve-a-dormir"]);
      expect(n.soltadoPorElTope).toBe(true);
      expect(n.fase).toBe("acabada");
      expect(pared).toBeLessThan(60);
      const ding = sucesos.find((s) => s.que === "ding")!;
      const seDuerme = sucesos.find((s) => s.que === "se-vuelve-a-dormir")!;
      expect(seDuerme.pared - ding.pared).toBeCloseTo(TOPE_DEL_DESPERTAR, 0);
    });
  }

  it("el mapa corre a su ritmo, se queda quieto durante el medio despertar y sigue por donde iba", () => {
    const n = new NocheEnElMapa({ desde: 1000, seDespiertaEn: 1000 + 2 * EL_MAPA_CORRE, hasta: 1000 + 4 * EL_MAPA_CORRE }, 0);
    expect(n.paso(SE_TAPA_POR_DEBAJO, true)).toBe("se-destapa");
    expect(n.hora).toBe(1000);
    n.paso(SE_TAPA_POR_DEBAJO + 1, true);
    expect(n.hora).toBeCloseTo(1000 + EL_MAPA_CORRE, 5);
    expect(n.paso(SE_TAPA_POR_DEBAJO + 2, true)).toBe("ding");
    const parado = n.hora;
    expect(parado).toBe(n.plan.seDespiertaEn);
    expect(n.paso(SE_TAPA_POR_DEBAJO + 5, false)).toBeNull();
    expect(n.hora).toBe(parado);
    expect(n.paso(SE_TAPA_POR_DEBAJO + 6, true)).toBe("se-vuelve-a-dormir");
    expect(n.hora).toBe(parado);
    n.paso(SE_TAPA_POR_DEBAJO + 7, true);
    expect(n.hora).toBeCloseTo(parado + EL_MAPA_CORRE, 5);
  });

  it("el ding suena una vez, sea lo que sea lo que pase", () => {
    const n = new NocheEnElMapa({ desde: 0, seDespiertaEn: 100, hasta: 1000 }, 0);
    let dings = 0;
    for (let t = 0; t < 120; t += DT) if (n.paso(t, true) === "ding") dings++;
    expect(dings).toBe(1);
  });

  it("el salto espera hasta que el mapa se ha ido, y no antes", () => {
    const n = new NocheEnElMapa({ desde: 0, seDespiertaEn: 0, hasta: EL_MAPA_CORRE }, 0);
    n.paso(SE_TAPA_POR_DEBAJO, true);
    n.paso(SE_TAPA_POR_DEBAJO + 1, true);
    expect(n.fase).toBe("acaba");
    expect(n.retieneElSalto).toBe(true);
    expect(n.seVaElMapa).toBe(true);
    n.paso(SE_TAPA_POR_DEBAJO + 1 + SE_VA_EL_MAPA / 2, true);
    expect(n.retieneElSalto).toBe(true);
    n.paso(SE_TAPA_POR_DEBAJO + 1 + SE_VA_EL_MAPA, true);
    expect(n.fase).toBe("acabada");
    expect(n.retieneElSalto).toBe(false);
  });

  it("una pausa no cuenta: ni el mapa da un salto, ni lo que se dice se corta por el tope", () => {
    const n = new NocheEnElMapa({ desde: 0, seDespiertaEn: 3600, hasta: 12_000 }, 0);
    n.paso(SE_TAPA_POR_DEBAJO, true);
    // Diez minutos de pared en pausa, y a seguir.
    n.paso(SE_TAPA_POR_DEBAJO + 600, true);
    expect(n.hora).toBeLessThanOrEqual(EL_MAPA_CORRE);
    expect(n.paso(SE_TAPA_POR_DEBAJO + 601, true)).toBeNull();
    n.paso(SE_TAPA_POR_DEBAJO + 602, true);
    expect(n.fase).toBe("despierta");
    expect(n.paso(SE_TAPA_POR_DEBAJO + 1200, false)).toBeNull();
    expect(n.soltadoPorElTope).toBe(false);
  });

  it("si ya se ha pasado el sitio del medio despertar, el mapa corre de una vez", () => {
    const { sucesos } = laNoche({ desde: 30_000, seDespiertaEn: 20_000, hasta: 34_000 }, 5);
    expect(sucesos.map((s) => s.que)).toEqual(["se-destapa"]);
  });
});
