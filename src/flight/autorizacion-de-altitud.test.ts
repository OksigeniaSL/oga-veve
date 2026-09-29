import { describe, expect, it } from "vitest";
import {
  AutorizacionDeSubida,
  MILES_EN_CASA,
  TRANSICION_CANARIAS,
  TRANSICION_PARAGUAY,
  alturaEnRadio,
  altitudDeTransicion,
  escalonesDeSubida,
  piezaDeSubirEnCasa,
} from "./autorizacion-de-altitud";
import { HASTA } from "./nivel-de-crucero";
import casa from "../../data/voces/torre/manifiesto.json";
import islas from "../../data/voces/torre-canarias/manifiesto.json";
import { recetaDe, type Manifiesto } from "../audio/banco-de-voz";

/*
 * **Y todo lo que se puede autorizar está grabado**, en las dos torres: un
 * número que se pide y no está se dice con la voz del navegador, que en Brave
 * para Linux es silencio.
 */
describe("y suena con la voz de su torre", () => {
  const letras = {
    c1: "fonetico.zulu",
    c2: "fonetico.papa",
    c3: "fonetico.alfa",
    c4: "fonetico.bravo",
    c5: "fonetico.charlie",
  };
  const packs = [
    ["torre", casa as unknown as Manifiesto, "", 3000],
    ["torre-canarias", islas as unknown as Manifiesto, "canario.", 6000],
  ] as const;

  for (const [voz, pack, habla, transicion] of packs)
    it(`${voz}: cada millar, en casa y en fraseología`, () => {
      for (let miles = 3; miles <= HASTA / 1000; miles++) {
        const pies = miles * 1000;
        const subir = piezaDeSubirEnCasa(pies)!.replace("torre.", `torre.${habla}`);
        expect(
          recetaDe(pack, `torre.${habla}subir`, { ...letras, subir }),
          `${voz} ${pies}`,
        ).not.toBeNull();
        const enRadio = alturaEnRadio(pies, transicion);
        expect(enRadio, `${voz} ${pies}`).not.toBeNull();
        expect(
          recetaDe(pack, `torre.${habla}climbTo`, { ...letras, altura: enRadio!.piezas }),
          `${voz} ${enRadio!.dicho}`,
        ).not.toBeNull();
      }
    });
});

describe("la altitud de transición", () => {
  it("seis mil en Canarias y tres mil en Paraguay", () => {
    expect(altitudDeTransicion("GCXO")).toBe(TRANSICION_CANARIAS);
    expect(altitudDeTransicion("SGAS")).toBe(TRANSICION_PARAGUAY);
    expect(TRANSICION_CANARIAS).toBe(6000);
    expect(TRANSICION_PARAGUAY).toBe(3000);
  });
});

describe("los escalones de la subida", () => {
  it("primero la transición y luego el crucero", () => {
    expect(escalonesDeSubida(11000, 6000, null)).toEqual([6000, 11000]);
  });

  it("nunca por debajo de la mínima de la salida, redondeada al millar", () => {
    expect(escalonesDeSubida(13000, 6000, 7200)).toEqual([8000, 13000]);
  });

  it("y si el crucero no queda mil pies por encima, un solo escalón", () => {
    expect(escalonesDeSubida(7000, 6000, null)).toEqual([7000]);
    expect(escalonesDeSubida(5000, 6000, null)).toEqual([5000]);
  });
});

describe("cómo se dice por radio", () => {
  it("por encima de la transición, en nivel y cifra a cifra, con niner", () => {
    expect(alturaEnRadio(11000, 6000)).toEqual({
      dicho: "flight level one one zero",
      piezas: "altura.nivel cifra.1 cifra.1 cifra.0",
    });
    expect(alturaEnRadio(9000, 3000)!.dicho).toBe("flight level zero niner zero");
  });

  it("por debajo, en pies", () => {
    expect(alturaEnRadio(6000, 6000)).toEqual({
      dicho: "six thousand feet",
      piezas: "altura.pies.6",
    });
    expect(alturaEnRadio(3000, 3000)!.dicho).toBe("three thousand feet");
  });

  it("y lo que no está grabado no se dice", () => {
    expect(alturaEnRadio(4500, 6000)).toBeNull();
  });

  it("en casa, todos los niveles que puede dar el plan están grabados", () => {
    expect(MILES_EN_CASA.hasta).toBe(HASTA / 1000);
    for (let miles = 3; miles <= HASTA / 1000; miles++)
      expect(piezaDeSubirEnCasa(miles * 1000)).toBe(`torre.solo.subir.${miles}`);
    expect(piezaDeSubirEnCasa(4500)).toBeNull();
  });
});

describe("cuándo se da cada escalón", () => {
  const paso = (a: AutorizacionDeSubida, pies: number, sobreElSuelo = pies, enTierra = false) =>
    a.paso({ pies, sobreElSuelo, enTierra });

  it("tras despegar, no en el despegue; y el siguiente al acercarse al anterior", () => {
    const a = new AutorizacionDeSubida();
    a.poner([6000, 11000]);
    expect(paso(a, 2000, 0, true)).toBeNull();
    expect(paso(a, 2800, 800)).toBeNull();
    expect(paso(a, 3700, 1600)).toBe(6000);
    expect(paso(a, 4000, 1900)).toBeNull();
    expect(paso(a, 5100, 3000)).toBe(11000);
    expect(paso(a, 10500, 8400)).toBeNull();
    expect(a.autorizada).toBe(11000);
  });

  it("si ya se está cerca del primero, se da el siguiente", () => {
    const a = new AutorizacionDeSubida();
    a.poner([3000, 9000]);
    expect(paso(a, 2100, 1800)).toBe(9000);
  });

  it("un plan nuevo rearma; sin plan, nada", () => {
    const a = new AutorizacionDeSubida();
    a.poner([6000, 11000]);
    paso(a, 3700, 1600);
    a.poner(null);
    expect(paso(a, 5200, 3000)).toBeNull();
    a.poner([6000, 11000]);
    expect(paso(a, 3700, 1600)).toBe(6000);
  });

  it("y la de los baches deja la subida por hecha", () => {
    const a = new AutorizacionDeSubida();
    a.poner([6000, 11000]);
    paso(a, 3700, 1600);
    a.autorizar(13000);
    expect(paso(a, 12500, 10000)).toBeNull();
    expect(a.autorizada).toBe(13000);
  });
});
