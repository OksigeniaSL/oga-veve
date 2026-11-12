/**
 * Todo lo que se vuela, y dónde: los aviones donde cabe su pista y el
 * helicóptero donde tiene su helipuerto. **Cada aparato va solo donde puede
 * ir**, y eso no puede depender de por qué camino se llega —el hangar, la
 * dirección o la tecla de cambiar—: por eso hay una sola regla.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById } from "./aircraft";
import { AERONAVES, aeronavePorId, laQueSeVuelaEn, seVuelaEn } from "./aeronaves";
import { modeloPorId } from "./flota";
import { ESCENARIO_DEL_HELICOPTERO, SUPER_PUMA_EN_EL_JUEGO } from "./helicoptero-en-el-juego";
import { SCENARIOS, TENERIFE_NORTE } from "../world/scenarios";

const HELICOPTERO = SUPER_PUMA_EN_EL_JUEGO;

describe("las aeronaves", () => {
  it("son los aviones y el helicóptero, de pequeño a grande", () => {
    expect(AERONAVES).toHaveLength(AIRCRAFT.length + 1);
    const numeros = AERONAVES.map((a) => modeloPorId(a.id)!.numero);
    expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
    // El JAZ 70 entre el JAZ 60 y el JAZ 90, como en la flota.
    const i = AERONAVES.indexOf(HELICOPTERO);
    expect(AERONAVES[i - 1]?.id).toBe("jaz-60");
    expect(AERONAVES[i + 1]?.id).toBe("jaz-90");
  });

  it("se encuentran por su identificador, también el helicóptero", () => {
    expect(aeronavePorId("super-puma")).toBe(HELICOPTERO);
    expect(aeronavePorId("jaz-20")).toBe(aircraftById("jaz-20"));
    expect(aeronavePorId("oga-172")).toBeUndefined();
    expect(aeronavePorId(null)).toBeUndefined();
  });
});

describe("dónde se vuela cada una", () => {
  it("el helicóptero, solo en Tenerife Norte, que es donde tiene su helipuerto", () => {
    expect(ESCENARIO_DEL_HELICOPTERO).toBe(TENERIFE_NORTE.id);
    expect(TENERIFE_NORTE.aerodrome?.helipuertosAMano?.puntos.length ?? 0).toBeGreaterThan(0);
    for (const e of SCENARIOS) expect(seVuelaEn(HELICOPTERO, e), e.id).toBe(e.id === TENERIFE_NORTE.id);
  });

  it("y los aviones donde cabe su pista, como siempre", () => {
    const valle = SCENARIOS.find((e) => e.id === "valle-cordillera")!;
    expect(seVuelaEn(aircraftById("jaz-20"), valle)).toBe(true);
    expect(seVuelaEn(aircraftById("jaz-120"), valle)).toBe(false);
  });

  /*
   * **El helicóptero pedido fuera de su campo**: con el perfil de otro día o
   * con `?escenario=` en la dirección. Se vuela el avión que se tenía —si
   * cabe—, y si no, el mayor que quepa: nunca el helicóptero donde no está.
   */
  it("pedido fuera de su campo, se vuela el avión de antes, o el mayor que quepa", () => {
    const fuera = SCENARIOS.find((e) => e.id !== TENERIFE_NORTE.id && e.aerodrome)!;
    expect(laQueSeVuelaEn(HELICOPTERO, TENERIFE_NORTE)).toBe(HELICOPTERO);
    const queda = laQueSeVuelaEn(HELICOPTERO, fuera, aircraftById("jaz-20"));
    expect(queda).not.toBe(HELICOPTERO);
    expect(seVuelaEn(queda, fuera)).toBe(true);
    expect(laQueSeVuelaEn(HELICOPTERO, fuera, aircraftById("jaz-20")).id).toBe("jaz-20");
  });
});
