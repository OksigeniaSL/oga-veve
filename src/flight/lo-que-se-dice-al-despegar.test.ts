import { describe, expect, it } from "vitest";
import { ARAI, ARASUNU, JAZ_50, MAINUMBY, PANAMBI, PYKASU, TIJERETA, YVAGA } from "./aircraft";
import {
  SE_DICE_HASTA,
  SIGUE_DESDE,
  seSigueConElTren,
  seSigueEnV1,
  yaSeSigue,
} from "./lo-que-se-dice-al-despegar";

const NUDOS = 1 / 0.514444;

/** Recién metido el tren, a 90 nudos y a cien metros: el momento del de pistón. */
const SUBIENDO = {
  enElAire: true,
  trenPedidoArriba: true,
  indicada: 90 / NUDOS,
  sobreElCampo: 100,
};

describe("lo que se dice en el despegue de cada tipo", () => {
  it("en V1, «seguí» solo en los multimotores de turbina, que deciden con ella", () => {
    for (const a of [JAZ_50, ARASUNU, ARAI, TIJERETA, YVAGA]) expect(seSigueEnV1(a), a.id).toBe(true);
    // Los monomotores no tienen otro motor con el que seguir, y el de pistón para a esa velocidad.
    for (const a of [PYKASU, MAINUMBY, PANAMBI]) expect(seSigueEnV1(a), a.id).toBe(false);
  });

  it("y con el tren solo el bimotor de pistón: ni los monomotores ni los de turbina", () => {
    expect(seSigueConElTren(PANAMBI)).toBe(true);
    for (const a of [PYKASU, MAINUMBY, JAZ_50, ARASUNU, ARAI, TIJERETA, YVAGA])
      expect(seSigueConElTren(a), a.id).toBe(false);
  });

  it("los 85 nudos de su manual, por encima de su V1 del juego, que es su Vmc", () => {
    expect(SIGUE_DESDE * NUDOS).toBeCloseTo(85, 5);
    expect(SIGUE_DESDE).toBeGreaterThan(PANAMBI.decisionSpeed);
    // Y rota antes: con las ruedas en el suelo no se llega nunca.
    expect(SIGUE_DESDE).toBeGreaterThan(PANAMBI.rotationSpeed);
  });

  it("el de pistón sigue en el aire, con el tren pedido arriba y a 85 nudos o más", () => {
    expect(yaSeSigue(PANAMBI, SUBIENDO)).toBe(true);
    expect(yaSeSigue(PANAMBI, { ...SUBIENDO, indicada: SIGUE_DESDE })).toBe(true);
  });

  it("y no con el tren fuera, en el suelo, por debajo de 85 o ya pasada la salida", () => {
    expect(yaSeSigue(PANAMBI, { ...SUBIENDO, trenPedidoArriba: false })).toBe(false);
    expect(yaSeSigue(PANAMBI, { ...SUBIENDO, enElAire: false })).toBe(false);
    expect(yaSeSigue(PANAMBI, { ...SUBIENDO, indicada: 84 / NUDOS })).toBe(false);
    // Su V1 del juego, la Vmc: a esa velocidad su manual para.
    expect(yaSeSigue(PANAMBI, { ...SUBIENDO, indicada: PANAMBI.decisionSpeed })).toBe(false);
    expect(yaSeSigue(PANAMBI, { ...SUBIENDO, sobreElCampo: SE_DICE_HASTA + 1 })).toBe(false);
  });

  it("y en ningún otro tipo, aunque meta el tren", () => {
    for (const a of [PYKASU, MAINUMBY, ARASUNU, ARAI, TIJERETA, YVAGA])
      expect(yaSeSigue(a, { ...SUBIENDO, indicada: 160 / NUDOS }), a.id).toBe(false);
  });
});
