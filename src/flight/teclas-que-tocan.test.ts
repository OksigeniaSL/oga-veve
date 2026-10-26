import { describe, expect, it } from "vitest";
import {
  leerAprendidas,
  teclaDelPaso,
  TeclasQueTocan,
  yaSeHizo,
  type MandosParaLaTecla,
  type TeclaQueToca,
} from "./teclas-que-tocan";

const QUIETOS: MandosParaLaTecla = {
  gas: 0.6,
  profundidad: 0,
  flaps: 0,
  tren: false,
  aerofrenos: false,
};

function almacen(inicial: unknown = undefined) {
  const caja = { valor: inicial as unknown, escrituras: 0 };
  return {
    caja,
    leer: () => caja.valor,
    escribir: (v: readonly TeclaQueToca[]) => {
      caja.valor = [...v];
      caja.escrituras++;
    },
  };
}

describe("qué tecla toca con cada paso", () => {
  it("la del mando que pide el paso", () => {
    expect(teclaDelPaso("flaps", "flaps", 0)).toBe("flaps");
    expect(teclaDelPaso("tren", "tren", -600)).toBe("tren");
    expect(teclaDelPaso("bajar", "menosGas", 0)).toBe("menosGas");
    expect(teclaDelPaso("acelerar", "narizAbajo", 1200)).toBe("bajar");
    expect(teclaDelPaso("frenar", "narizArriba", 0)).toBe("subir");
  });

  it("subir, solo si no se está subiendo ya", () => {
    expect(teclaDelPaso("subir", null, 0)).toBe("subir");
    expect(teclaDelPaso("subir", null, 1200)).toBeNull();
  });

  it("y ninguna en los pasos que no piden mando", () => {
    expect(teclaDelPaso("senda", null, -700)).toBeNull();
    expect(teclaDelPaso("cota", null, -700)).toBeNull();
  });
});

describe("se va cuando se hace, no por reloj", () => {
  it("los flaps, al moverse la palanca", () => {
    expect(yaSeHizo("flaps", QUIETOS, QUIETOS)).toBe(false);
    expect(yaSeHizo("flaps", QUIETOS, { ...QUIETOS, flaps: 1 / 3 })).toBe(true);
  });

  it("el gas, al moverse hacia donde se pide", () => {
    expect(yaSeHizo("menosGas", QUIETOS, { ...QUIETOS, gas: 0.62 })).toBe(false);
    expect(yaSeHizo("menosGas", QUIETOS, { ...QUIETOS, gas: 0.5 })).toBe(true);
    expect(yaSeHizo("masGas", QUIETOS, { ...QUIETOS, gas: 0.5 })).toBe(false);
    expect(yaSeHizo("masGas", QUIETOS, { ...QUIETOS, gas: 0.7 })).toBe(true);
  });

  it("y la flecha, al tirar o empujar", () => {
    expect(yaSeHizo("subir", QUIETOS, { ...QUIETOS, profundidad: 0.05 })).toBe(false);
    expect(yaSeHizo("subir", QUIETOS, { ...QUIETOS, profundidad: 0.4 })).toBe(true);
    expect(yaSeHizo("bajar", QUIETOS, { ...QUIETOS, profundidad: -0.4 })).toBe(true);
  });

  it("la pista se apaga sola al hacerlo, y un paso nuevo la cambia", () => {
    const p = new TeclasQueTocan(almacen());
    p.pedir("flaps", QUIETOS);
    expect(p.mirar(QUIETOS)).toBe("flaps");
    expect(p.mirar({ ...QUIETOS, flaps: 1 / 3 })).toBeNull();
    p.pedir("tren", QUIETOS);
    p.pedir("menosGas", QUIETOS);
    expect(p.ahora).toBe("menosGas");
    p.quitar();
    expect(p.ahora).toBeNull();
  });
});

describe("ya me lo aprendí", () => {
  it("la retira para siempre en el perfil, cada una por separado", () => {
    const a = almacen();
    const p = new TeclasQueTocan(a);
    p.pedir("flaps", QUIETOS);
    p.aprender("flaps");
    expect(p.ahora).toBeNull();
    expect(a.caja.valor).toEqual(["flaps"]);
    p.pedir("flaps", QUIETOS);
    expect(p.ahora).toBeNull();
    p.pedir("tren", QUIETOS);
    expect(p.ahora).toBe("tren");
    // Y otra partida en el mismo perfil la sigue sin enseñar.
    const otra = new TeclasQueTocan(a);
    expect(otra.aprendida("flaps")).toBe(true);
    expect(otra.aprendida("tren")).toBe(false);
  });

  it("y desde los ajustes se recuperan todas", () => {
    const a = almacen(["flaps", "tren"]);
    const p = new TeclasQueTocan(a);
    expect(p.cuantasAprendidas).toBe(2);
    p.recuperarTodas();
    expect(p.cuantasAprendidas).toBe(0);
    expect(a.caja.valor).toEqual([]);
    p.pedir("flaps", QUIETOS);
    expect(p.ahora).toBe("flaps");
  });

  it("lo guardado se lee con desconfianza", () => {
    expect(leerAprendidas(undefined)).toEqual([]);
    expect(leerAprendidas("flaps")).toEqual([]);
    expect(leerAprendidas(["flaps", "despegar", 3, "tren"])).toEqual(["flaps", "tren"]);
  });
});
