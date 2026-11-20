import { describe, expect, it } from "vitest";
import {
  AIRCRAFT,
  ARAI,
  ARASUNU,
  JAZ_50,
  MAINUMBY,
  PANAMBI,
  PYKASU,
  TIJERETA,
  YVAGA,
} from "./aircraft";
import { conV1, pasadaLaV1 } from "./decide-con-v1";
import { conV1 as conV1DeLosEjercicios } from "./ejercicios";

const SIN_V1 = [PYKASU, MAINUMBY, PANAMBI];
const CON_V1 = [JAZ_50, ARASUNU, ARAI, TIJERETA, YVAGA];

/** En la carrera de despegue, con gas, un pelo pasada la V1 de su ficha. */
const pasada = (a: (typeof AIRCRAFT)[number], gas = 1) =>
  pasadaLaV1(a, {
    enLaCarrera: true,
    pitotTapado: false,
    indicada: a.decisionSpeed + 0.5,
    v1: a.decisionSpeed,
    gas,
  });

describe("quién decide el despegue con V1", () => {
  it("los multimotores de turbina sí; los monomotores y el bimotor de pistón no", () => {
    for (const a of CON_V1) expect(conV1(a), a.id).toBe(true);
    for (const a of SIN_V1) expect(conV1(a), a.id).toBe(false);
    // Y no queda ninguno sin repartir.
    expect(new Set([...CON_V1, ...SIN_V1].map((a) => a.id))).toEqual(
      new Set(AIRCRAFT.filter((a) => !a.helicoptero).map((a) => a.id)),
    );
  });

  it("y es el mismo criterio que leen los ejercicios: un solo sitio", () => {
    expect(conV1DeLosEjercicios).toBe(conV1);
  });
});

/*
 * **El freno en la carrera, pasada la V1** (H44a). El destello sale en todos;
 * el freno se va solo donde V1 decide. En el 172 y en el Seneca frenar sigue
 * siendo lo que toca mientras quede pista, y se veía jugando: el botón se
 * despedía a 53 nudos en el JAZ 20 y a 66 en el JAZ 40.
 */
describe("pasada la V1, en la carrera de despegue", () => {
  it("el destello y la nota salen en todos", () => {
    for (const a of [...CON_V1, ...SIN_V1]) expect(pasada(a).destello, a.id).toBe(true);
  });

  it("el freno se queda en el JAZ 20, el JAZ 25 y el JAZ 40", () => {
    for (const a of SIN_V1) expect(pasada(a).seVaElFreno, a.id).toBe(false);
  });

  it("y se va en los de turbina: el JAZ 90 y los demás", () => {
    expect(pasada(ARAI).seVaElFreno).toBe(true);
    for (const a of CON_V1) expect(pasada(a).seVaElFreno, a.id).toBe(true);
  });

  it("el aviso de fin de pista: en los de V1 calla aunque se corte el gas", () => {
    for (const a of CON_V1) {
      expect(pasada(a, 1).callaElFinDePista, a.id).toBe(true);
      expect(pasada(a, 0).callaElFinDePista, a.id).toBe(true);
    }
  });

  it("y en los demás calla mientras se siga con gas, y avisa a quien lo corta", () => {
    for (const a of SIN_V1) {
      expect(pasada(a, 1).callaElFinDePista, a.id).toBe(true);
      expect(pasada(a, 0).callaElFinDePista, a.id).toBe(false);
    }
  });

  it("antes de V1, nada en ninguno; y con la funda del pitot, la aguja no pasa nunca", () => {
    for (const a of [...CON_V1, ...SIN_V1]) {
      const antes = pasadaLaV1(a, {
        enLaCarrera: true,
        pitotTapado: false,
        indicada: a.decisionSpeed - 0.5,
        v1: a.decisionSpeed,
        gas: 1,
      });
      expect(antes, a.id).toEqual({ destello: false, seVaElFreno: false, callaElFinDePista: false });
      const tapado = pasadaLaV1(a, {
        enLaCarrera: true,
        pitotTapado: true,
        indicada: a.decisionSpeed + 10,
        v1: a.decisionSpeed,
        gas: 1,
      });
      expect(tapado.destello || tapado.seVaElFreno, a.id).toBe(false);
    }
  });

  it("y fuera de una carrera de despegue —aterrizando rápido—, tampoco", () => {
    for (const a of [...CON_V1, ...SIN_V1]) {
      const r = pasadaLaV1(a, {
        enLaCarrera: false,
        pitotTapado: false,
        indicada: a.decisionSpeed + 10,
        v1: a.decisionSpeed,
        gas: 1,
      });
      expect(r.seVaElFreno, a.id).toBe(false);
    }
  });
});
