/**
 * **La toma larga, propuesta a tiempo** (punto 206 de la lista). Ver
 * `toma-larga.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  ALTURA_DE_LA_RECOGIDA,
  MARGEN_PARA_PARAR,
  TomaLarga,
  finDeLaZonaDeToma,
  puntoDeVisada,
  type EnLaToma,
} from "./toma-larga";
import { Frustrada } from "./frustrada";
import { rodaduraDeFrenada } from "./carrera";
import { YVAGA } from "./aircraft";

/** Los Rodeos: 3.400 m de pista, sin umbral desplazado. */
const LARGO = 3400;
const VREF = YVAGA.approachSpeed;
const paraParar = (v: number) => rodaduraDeFrenada(YVAGA, "asfalto", { desde: v });

/** Un instante de la toma a `pasado` metros del umbral. */
function en(pasado: number, cambios: Partial<EnLaToma> = {}): EnLaToma {
  return {
    enFinal: true,
    enElSuelo: false,
    enLaPista: false,
    sobreLaPista: 10,
    pasado,
    queda: LARGO - pasado,
    paraAterrizar: LARGO,
    porElSuelo: VREF,
    aproximacion: VREF,
    reversa: false,
    paraParar,
    ...cambios,
  };
}

describe("la zona de toma", () => {
  it("el punto de visada del Anexo 14, por lo que mide la pista", () => {
    expect(puntoDeVisada(700)).toBe(150);
    expect(puntoDeVisada(1000)).toBe(250);
    expect(puntoDeVisada(2000)).toBe(300);
    expect(puntoDeVisada(3400)).toBe(400);
  });

  it("acaba de 300 a 600 m del umbral, según la pista, y nunca pasado el tercio", () => {
    expect(finDeLaZonaDeToma(3400)).toBe(600);
    expect(finDeLaZonaDeToma(2000)).toBe(500);
    expect(finDeLaZonaDeToma(1250)).toBeCloseTo(1250 / 3, 6);
    expect(finDeLaZonaDeToma(900)).toBe(300);
  });
});

describe("la instructora propone irse, a tiempo", () => {
  it("flotando pasada la zona, antes de tocar", () => {
    const t = new TomaLarga();
    expect(t.paso(en(300, { sobreLaPista: 12 }))).toBeNull();
    expect(t.paso(en(650, { sobreLaPista: ALTURA_DE_LA_RECOGIDA + 5 }))).toBeNull();
    expect(t.paso(en(700, { sobreLaPista: 8 }))).toBe("largo");
    // Una vez por toma.
    expect(t.paso(en(800, { sobreLaPista: 5 }))).toBeNull();
  });

  it("tocando pasada la zona, en el instante de tocar", () => {
    const t = new TomaLarga();
    const suelo = { enElSuelo: true, enLaPista: true, sobreLaPista: 0 };
    expect(t.paso(en(900, suelo))).toBe("largo");
    expect(t.propuestaAbierta).toBe(true);
    expect(t.idaTrasTocar).toBe(true);
  });

  it("y tocando dentro de la zona, nada: es una toma buena", () => {
    const t = new TomaLarga();
    const suelo = { enElSuelo: true, enLaPista: true, sobreLaPista: 0 };
    expect(t.paso(en(450, suelo))).toBeNull();
    expect(t.idaTrasTocar).toBe(false);
    // Y rodando con pista de sobra para parar, tampoco.
    expect(t.paso(en(900, { ...suelo, porElSuelo: VREF * 0.9 }))).toBeNull();
  });

  it("rodando sin pista para parar, mientras todavía se puede subir", () => {
    const t = new TomaLarga();
    const suelo = { enElSuelo: true, enLaPista: true, sobreLaPista: 0 };
    expect(t.paso(en(450, suelo))).toBeNull();
    // Tocó bien, pero sigue deprisa y la pista se acaba antes de lo que frena.
    const v = VREF * 0.95;
    const queda = paraParar(v) * MARGEN_PARA_PARAR * 0.9;
    expect(t.paso(en(LARGO - queda, { ...suelo, porElSuelo: v, queda }))).toBe("noPara");
    expect(t.idaTrasTocar).toBe(true);
  });

  it("con la reversa puesta ya no: la toma se termina parando", () => {
    const t = new TomaLarga();
    const suelo = { enElSuelo: true, enLaPista: true, sobreLaPista: 0 };
    t.paso(en(450, { ...suelo, reversa: true }));
    expect(t.paso(en(2800, { ...suelo, porElSuelo: VREF * 0.95, queda: 600 }))).toBeNull();
    expect(t.idaTrasTocar).toBe(false);
  });

  it("y tan despacio que ya no vuela, tampoco: ahí se frena", () => {
    const t = new TomaLarga();
    const suelo = { enElSuelo: true, enLaPista: true, sobreLaPista: 0 };
    expect(t.paso(en(900, { ...suelo, porElSuelo: VREF * 0.5 }))).toBeNull();
  });
});

describe("y si se va, se felicita como cualquier frustrada", () => {
  /** Toca largo, mete gas y sube: el detector de frustradas lo cuenta. */
  it("irse al aire después de una toma larga cuenta como frustrada", () => {
    const toma = new TomaLarga();
    const f = new Frustrada();
    // Bajando por la final.
    for (let h = 60; h > 0; h -= 2)
      f.paso({ enFinal: true, sobreElSuelo: h, vertical: -3, enElSuelo: false });
    // Toca largo.
    toma.paso(en(900, { enElSuelo: true, enLaPista: true, sobreLaPista: 0 }));
    expect(f.paso({ enFinal: true, sobreElSuelo: 0, vertical: 0, enElSuelo: true, idaTrasTocar: toma.idaTrasTocar })).toBe(false);
    // Y sube.
    let contada = false;
    for (let h = 1; h < 60 && !contada; h += 2)
      contada = f.paso({ enFinal: true, sobreElSuelo: h, vertical: 4, enElSuelo: false });
    expect(contada).toBe(true);
  });

  it("y un rebote de una toma buena sigue sin contar", () => {
    const toma = new TomaLarga();
    const f = new Frustrada();
    for (let h = 60; h > 0; h -= 2)
      f.paso({ enFinal: true, sobreElSuelo: h, vertical: -3, enElSuelo: false });
    toma.paso(en(450, { enElSuelo: true, enLaPista: true, sobreLaPista: 0 }));
    f.paso({ enFinal: true, sobreElSuelo: 0, vertical: 0, enElSuelo: true, idaTrasTocar: toma.idaTrasTocar });
    let contada = false;
    for (let h = 1; h < 60 && !contada; h += 2)
      contada = f.paso({ enFinal: true, sobreElSuelo: h, vertical: 4, enElSuelo: false });
    expect(contada).toBe(false);
  });
});
