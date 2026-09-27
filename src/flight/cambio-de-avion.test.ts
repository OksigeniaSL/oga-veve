/**
 * Cambiar de avión: solo en tierra y parado, y empezando otro vuelo.
 *
 * Ver `cambio-de-avion.ts`. Que el vuelo nuevo lleve los destinos y el
 * combustible del avión nuevo lo mira el banco `verificar-cambio-de-avion`,
 * que es donde está el arranque de verdad; aquí van las dos reglas y el recado
 * entre las dos cargas.
 */

import { describe, expect, it } from "vitest";
import {
  leerRearranque,
  pedirRearranque,
  sePuedeCambiarDeAvion,
} from "./cambio-de-avion";
import { AIRCRAFT } from "./aircraft";
import { cabeEn, campoDe, destinosParaEsteAvion } from "./cabe";
import { destinosDe, SCENARIOS } from "../world/scenarios";

/** Un almacén de sesión de mentira, como el del navegador. */
function sesion(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

describe("se cambia de avión en tierra y parado", () => {
  it("parado en la plataforma, sí", () => {
    expect(sePuedeCambiarDeAvion({ enTierra: true, velocidad: 0 })).toBe(true);
  });

  it("rodando, no: sería bajarse de un avión en marcha", () => {
    expect(sePuedeCambiarDeAvion({ enTierra: true, velocidad: 4 })).toBe(false);
  });

  it("y en el aire, nunca", () => {
    expect(sePuedeCambiarDeAvion({ enTierra: false, velocidad: 0 })).toBe(false);
    expect(sePuedeCambiarDeAvion({ enTierra: false, velocidad: 70 })).toBe(false);
  });
});

describe("el recado entre el vuelo que acaba y el que empieza", () => {
  it("se lee una vez y se borra", () => {
    const s = sesion();
    expect(pedirRearranque(s, { escenario: "pettirossi", avion: "jaz-20" })).toBe(
      true,
    );
    expect(leerRearranque(s)).toEqual({ escenario: "pettirossi", avion: "jaz-20" });
    // Si se quedara, cada recarga se saltaría el hangar para siempre.
    expect(leerRearranque(s)).toBeNull();
  });

  it("sin almacén, o con algo raro dentro, no hay recado", () => {
    expect(leerRearranque(null)).toBeNull();
    const s = sesion();
    s.setItem("oga-veve:rearranque", "{roto");
    expect(leerRearranque(s)).toBeNull();
  });
});

describe("y por eso el vuelo nuevo tiene los destinos del avión nuevo", () => {
  /*
   * El caso contado: Pettirossi con el cuatrimotor no tiene destino; con la
   * avioneta, sí. El arranque los filtra con `destinosParaEsteAvion`, así que
   * volver a arrancar es lo que hace que aparezcan.
   */
  it("en Pettirossi, el JAZ 120 no tiene a dónde ir y el JAZ 20 sí", () => {
    const casa = SCENARIOS.find((e) => e.id === "pettirossi")!;
    const todos = destinosDe(casa)
      .map((id) => SCENARIOS.find((e) => e.id === id))
      .filter((e) => e !== undefined);
    const grande = AIRCRAFT.find((a) => a.id === "jaz-120")!;
    const avioneta = AIRCRAFT.find((a) => a.id === "jaz-20")!;
    expect(destinosParaEsteAvion(grande, todos)).toHaveLength(0);
    expect(destinosParaEsteAvion(avioneta, todos).length).toBeGreaterThan(0);
    // Y la avioneta cabe en casa, que es donde empieza el vuelo nuevo.
    expect(cabeEn(avioneta, campoDe(casa)).cabe).toBe(true);
  });
});
