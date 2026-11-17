/**
 * El margen de la final con viento y rachas (#92), y la banda de la
 * aproximación comparando lo mismo con lo mismo.
 *
 * Ver `margenDeLaFinal` en `escalera-de-velocidades.ts` y `referenciaEnVerdadera`
 * en `velocidad-de-aproximacion.ts`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById, esDeChorro } from "./aircraft";
import { aireDelParte } from "./atmosphere";
import {
  FINAL_SOBRE_VREF,
  FINAL_SOBRE_VREF_MAXIMO,
  margenDeLaFinal,
  velocidadQueToca,
  vrefKt,
  type VientoDeLaFinal,
} from "./escalera-de-velocidades";
import { porQueNoEstaEstabilizada } from "./minimos";
import { limitesDe, parteDe, type CampoDelParte } from "./parte-de-salida";
import { bandaDeVelocidad, referenciaEnVerdadera } from "./velocidad-de-aproximacion";
import { leerMetar, type Meteo } from "../world/meteo";
import { cifraDeAproximacion } from "../ui/tarjeta-del-tiempo";

const NUDO = 0.514444;
const jaz90 = aircraftById("jaz-90");
const jaz20 = aircraftById("jaz-20");
const viento = (deCaraKt: number, vientoKt: number, rachaKt = 0): VientoDeLaFinal => ({
  deCaraKt,
  vientoKt,
  rachaKt,
});

describe("el margen de la final del reactor: la mitad del viento de cara y la racha entera, de 5 a 20", () => {
  it("en calma, los cinco de siempre", () => {
    expect(margenDeLaFinal(jaz90, null)).toBe(FINAL_SOBRE_VREF);
    expect(margenDeLaFinal(jaz90, viento(0, 0))).toBe(FINAL_SOBRE_VREF);
  });

  it("diez de cara sin rachas: la mitad son cinco, y no baja de cinco", () => {
    expect(margenDeLaFinal(jaz90, viento(10, 10))).toBe(5);
    expect(margenDeLaFinal(jaz90, viento(4, 4))).toBe(5);
  });

  it("veinte de cara: diez", () => {
    expect(margenDeLaFinal(jaz90, viento(20, 20))).toBe(10);
  });

  it("quince de cara con rachas de veinticinco: siete y medio más diez", () => {
    expect(margenDeLaFinal(jaz90, viento(15, 15, 25))).toBe(17.5);
  });

  it("la racha cuenta entera aunque el viento venga de costado", () => {
    // Quince de costado (nada de cara) con rachas de veinticinco: los diez de la racha.
    expect(margenDeLaFinal(jaz90, viento(0, 15, 25))).toBe(10);
  });

  it("el viento de cola no suma ni resta", () => {
    expect(margenDeLaFinal(jaz90, viento(-10, 10))).toBe(5);
  });

  it("y nunca más de veinte", () => {
    expect(margenDeLaFinal(jaz90, viento(30, 30, 45))).toBe(FINAL_SOBRE_VREF_MAXIMO);
  });

  it("en los tres reactores la misma regla", () => {
    const reactores = AIRCRAFT.filter((a) => esDeChorro(a));
    expect(reactores.map((a) => a.id).sort()).toEqual(["jaz-110", "jaz-120", "jaz-90"]);
    for (const a of reactores) expect(margenDeLaFinal(a, viento(15, 15, 25))).toBe(17.5);
  });
});

describe("el de la avioneta y el turbohélice: la mitad de lo que racha, sobre la de la calma", () => {
  it("el ejemplo del manual de la FAA: rachas de quince, siete y medio más", () => {
    expect(margenDeLaFinal(jaz20, viento(10, 10, 25))).toBe(FINAL_SOBRE_VREF + 7.5);
  });

  it("sin rachas, el viento de cara no suma", () => {
    expect(margenDeLaFinal(jaz20, viento(20, 20))).toBe(FINAL_SOBRE_VREF);
  });

  it("en todos los que no son de chorro", () => {
    for (const a of AIRCRAFT.filter((x) => !esDeChorro(x) && !x.helicoptero))
      expect(margenDeLaFinal(a, viento(0, 10, 30))).toBe(FINAL_SOBRE_VREF + 10);
  });
});

describe("la escalera lo pide en la final", () => {
  const enFinal = (a = jaz90, v: VientoDeLaFinal | null = null) =>
    velocidadQueToca(a, {
      altitud: 300,
      restante: 3 * 1852,
      bajando: true,
      enFinal: true,
      subiendo: false,
      vientoDeLaFinal: v,
    });

  it("en calma, la Vref y cinco, como antes", () => {
    expect(enFinal().kt).toBe(Math.round(vrefKt(jaz90) + 5));
  });

  it("con quince de cara y rachas de veinticinco, la Vref y diecisiete y medio", () => {
    const v = enFinal(jaz90, viento(15, 15, 25));
    expect(v.peldano).toBe("final");
    expect(v.kt).toBe(Math.round(vrefKt(jaz90) + 17.5));
  });

  it("y el viento no cambia los peldaños de antes de la final", () => {
    const antes = velocidadQueToca(jaz90, {
      altitud: 900,
      restante: 7 * 1852,
      bajando: true,
      enFinal: false,
      subiendo: false,
      vientoDeLaFinal: viento(15, 15, 25),
    });
    expect(antes.peldano).toBe("segundos-flaps");
    expect(antes.kt).toBe(Math.round(vrefKt(jaz90) + 20));
  });
});

describe("la banda de la aproximación lo cuenta", () => {
  const bajando = (velocidad: number) => ({
    sobreElSuelo: 200,
    enElSuelo: false,
    vertical: -3,
    velocidad,
  });

  it("la avioneta con rachas de treinta, a su velocidad: sin contarlo era «rápido», ahora «bien»", () => {
    const vref = jaz20.approachSpeed;
    const margen = margenDeLaFinal(jaz20, viento(0, 10, 40));
    const vapp = vref + margen * NUDO;
    const sobra = (margen - FINAL_SOBRE_VREF) * NUDO;
    expect(bandaDeVelocidad(bajando(vapp), vref)).toBe("rapido");
    expect(bandaDeVelocidad(bajando(vapp), vref, null, sobra)).toBe("bien");
  });

  it("y el borde de «lento» no se mueve: la racha se pone para no bajar de la Vref", () => {
    const vref = jaz90.approachSpeed;
    const sobra = 12 * NUDO;
    expect(bandaDeVelocidad(bajando(vref * 0.95), vref, null, sobra)).toBe("lento");
    expect(bandaDeVelocidad(bajando(vref * 0.95), vref)).toBe("lento");
  });

  it("y la puerta de los quinientos pies tampoco manda al aire a quien viene con su margen", () => {
    const puerta = {
      kt: vrefKt(jaz90) + 20,
      referenciaKt: vrefKt(jaz90),
      vertical: -3.5,
      delEje: 0,
      torcido: 0,
      puntos: 0,
      configurado: true,
    };
    expect(porQueNoEstaEstabilizada(puerta)).toBe("rapido");
    expect(porQueNoEstaEstabilizada({ ...puerta, porElVientoKt: 15 })).toBeNull();
    // Y lento sigue siendo lento.
    expect(
      porQueNoEstaEstabilizada({ ...puerta, kt: vrefKt(jaz90) - 6, porElVientoKt: 15 }),
    ).toBe("lento");
  });
});

describe("la banda compara la verdadera con la Vref en verdadera", () => {
  /*
   * Los Rodeos: 632 m y la tarde de 21 °C de la enmienda H25a, a la altura
   * del circuito, trescientos metros sobre la pista, que es donde empieza la
   * banda de la aproximación.
   */
  const CAMPO = 632;
  const LOS_RODEOS = CAMPO + 300;
  const aire = aireDelParte(21, CAMPO, 1018);
  const bajando = (velocidad: number) => ({
    sobreElSuelo: 200,
    enElSuelo: false,
    vertical: -3,
    velocidad,
  });

  it("allí la misma indicada es un seis por ciento más de verdadera, y en la pista un cuatro y medio", () => {
    const r = referenciaEnVerdadera(jaz90.approachSpeed, 0, LOS_RODEOS, aire);
    expect(r.vref / jaz90.approachSpeed).toBeGreaterThan(1.05);
    expect(r.vref / jaz90.approachSpeed).toBeLessThan(1.08);
    const enLaPista = referenciaEnVerdadera(jaz90.approachSpeed, 0, CAMPO, aire);
    expect(enLaPista.vref / jaz90.approachSpeed).toBeGreaterThan(1.04);
  });

  it("a un siete por ciento por debajo de la Vref indicada: era «bien» y es «lento»", () => {
    const r = referenciaEnVerdadera(jaz90.approachSpeed, 0, LOS_RODEOS, aire);
    const verdadera = 0.93 * r.vref;
    // Como estaba: la verdadera contra la Vref indicada.
    expect(bandaDeVelocidad(bajando(verdadera), jaz90.approachSpeed)).toBe("bien");
    expect(bandaDeVelocidad(bajando(verdadera), r.vref)).toBe("lento");
  });

  it("y a la Vref indicada, «bien»", () => {
    const r = referenciaEnVerdadera(jaz90.approachSpeed, 0, LOS_RODEOS, aire);
    expect(bandaDeVelocidad(bajando(r.vref), r.vref)).toBe("bien");
  });

  it("lo que suma el viento también se pasa a verdadera", () => {
    const r = referenciaEnVerdadera(jaz90.approachSpeed, 10 * NUDO, LOS_RODEOS, aire);
    expect(r.porElViento / (10 * NUDO)).toBeCloseTo(r.vref / jaz90.approachSpeed, 9);
  });
});

describe("la tarjeta del tiempo lo dice con las cifras", () => {
  const campo = (metar: string, rumbo: number): CampoDelParte => ({
    oaci: "GCXO",
    pista: "30",
    rumbo,
    meteo: leerMetar(metar) as Meteo,
  });
  const aproximacion = {
    vrefKt: vrefKt(jaz90),
    margenKt: (v: VientoDeLaFinal) => margenDeLaFinal(jaz90, v),
  };

  it("con quince de cara y rachas de veinticinco: VAPP con la Vref y diecisiete", () => {
    const p = parteDe(campo("GCXO 171200Z 30015G25KT 9999 FEW025 21/14 Q1018", 300), "llegada", limitesDe(jaz90));
    expect(cifraDeAproximacion(p, aproximacion)).toBe(
      `VAPP ${Math.round(vrefKt(jaz90) + 17.5)}KT (VREF ${Math.round(vrefKt(jaz90))}+${
        Math.round(vrefKt(jaz90) + 17.5) - Math.round(vrefKt(jaz90))
      })`,
    );
  });

  it("y en calma, la Vref y cinco", () => {
    const p = parteDe(campo("GCXO 171200Z 00000KT 9999 FEW025 21/14 Q1018", 300), "llegada", limitesDe(jaz90));
    expect(cifraDeAproximacion(p, aproximacion)).toBe(
      `VAPP ${Math.round(vrefKt(jaz90) + 5)}KT (VREF ${Math.round(vrefKt(jaz90))}+5)`,
    );
  });
});
