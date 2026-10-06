import { describe, expect, it } from "vitest";
import { AIRCRAFT, ARAI, ARASUNU, PANAMBI, PYKASU, YVAGA } from "./aircraft";
import {
  EJERCICIOS,
  ejercicioPorId,
  ejerciciosPara,
  esAvisado,
} from "./ejercicios";
import {
  ALTURA_PARA_ASEGURAR,
  ladoDelMotor,
  Practica,
  type Lectura,
  type Suceso,
} from "./practica";

const QUIETO: Lectura = {
  enElSuelo: true,
  corriendo: false,
  enPista: true,
  indicada: 0,
  sobreElCampo: 0,
  vertical: 0,
  parado: true,
  percance: false,
  enFinal: false,
};

const V = { v1: 70, vr: 78 };

function practica(id: string, avion = ARAI, azar = () => 0.1): Practica {
  return new Practica(ejercicioPorId(id)!, avion, V, azar);
}

/** Pasos de un segundo con la misma lectura; devuelve todo lo que pasó. */
function durante(p: Practica, l: Lectura, segundos: number): Suceso[] {
  const todo: Suceso[] = [];
  for (let i = 0; i < segundos * 10; i++) todo.push(...p.paso(l, 0.1));
  return todo;
}

const cuales = (s: readonly Suceso[]) => s.map((x) => x.que);

describe("los ejercicios que se ofrecen", () => {
  it("en Guyrami, ninguno", () => {
    for (const a of AIRCRAFT) expect(ejerciciosPara("guyrami", a)).toEqual([]);
  });

  it("en Tukã, solo el planeo, avisado", () => {
    for (const a of AIRCRAFT) {
      const ids = ejerciciosPara("tuka", a).map((e) => e.id);
      expect(ids).toEqual(["planeo"]);
    }
    expect(esAvisado(ejercicioPorId("planeo")!)).toBe(true);
  });

  it("en Taguato, V1 y el motor parado en vuelo, pero solo con más de un motor", () => {
    expect(ejerciciosPara("taguato", PYKASU).map((e) => e.id)).toEqual(["planeo"]);
    expect(ejerciciosPara("taguato", PANAMBI).map((e) => e.id)).toEqual([
      "planeo",
      "antes-de-v1",
      "despues-de-v1",
      "un-motor",
    ]);
  });

  it("y la despresurización, de Taguató para arriba y solo en los presurizados", () => {
    for (const a of AIRCRAFT) {
      const ofrece = ejerciciosPara("taguato", a).some((e) => e.id === "despresurizacion");
      expect(ofrece).toBe(a.presurizacion !== null);
      expect(ejerciciosPara("tuka", a).some((e) => e.id === "despresurizacion")).toBe(false);
    }
    const d = ejercicioPorId("despresurizacion")!;
    expect(esAvisado(d)).toBe(true);
    // Empieza arriba: lo que se practica es lo que pasa en crucero.
    expect(d.colocacion).toBe("crucero");
    expect(d.leccion).toBe("aterrizaje");
  });

  it("y la sesión de simulador, sin avisar de qué, solo arriba del todo", () => {
    const sim = ejercicioPorId("simulador")!;
    expect(sim.peldanos).toEqual(["taguato-ruvicha"]);
    expect(esAvisado(sim)).toBe(false);
    expect(ejerciciosPara("taguato", ARAI).some((e) => e.id === "simulador")).toBe(false);
  });

  it("todos enseñan algo, dicho en una línea", () => {
    for (const e of EJERCICIOS) expect(e.ensena.length).toBeGreaterThan(20);
  });
});

describe("antes de V1: se para", () => {
  it("se presenta, falla en la carrera antes de V1 y se cierra al pararse en la pista", () => {
    const p = practica("antes-de-v1");
    expect(cuales(p.paso(QUIETO, 0.1))).toEqual(["presentar"]);
    // Rodando por debajo del 80 % de V1, nada.
    const corriendo = { ...QUIETO, corriendo: true, parado: false, indicada: 50 };
    expect(durante(p, corriendo, 2)).toEqual([]);
    const fallo = p.paso({ ...corriendo, indicada: 57 }, 0.1);
    expect(fallo).toEqual([
      { que: "fallo", averia: "motor", motor: 0, antesDeV1: true, enElSuelo: true },
    ]);
    // Frenando, todavía nada; quieto, los bomberos a mirar los frenos y el cierre.
    expect(durante(p, { ...corriendo, indicada: 30, corriendo: false }, 3)).toEqual([]);
    const fin = durante(p, QUIETO, 2);
    expect(cuales(fin)).toEqual(["bomberos", "cerrar"]);
    expect(p.cierre).toBe("parado");
  });

  it("y si se sigue igual y se vuelve, también se cierra, contando qué se hace", () => {
    const p = practica("antes-de-v1");
    p.paso(QUIETO, 0.1);
    p.paso({ ...QUIETO, corriendo: true, parado: false, indicada: 60 }, 0.1);
    durante(p, { ...QUIETO, enElSuelo: false, sobreElCampo: 400, vertical: 3, indicada: 80, parado: false }, 30);
    durante(p, { ...QUIETO, enFinal: true, enElSuelo: false, sobreElCampo: 200, indicada: 70, parado: false }, 5);
    durante(p, QUIETO, 2);
    expect(p.cierre).toBe("seguidoAntesDeV1");
  });
});

describe("pasada V1: se vuela, y en su orden", () => {
  it("falla a medio camino de la rotación, y sigue: velocidad, asegurar a 400 ft, declarar, bomberos, cierre", () => {
    const p = practica("despues-de-v1", ARAI, () => 0.9);
    p.paso(QUIETO, 0.1);
    const corriendo = { ...QUIETO, corriendo: true, parado: false };
    expect(p.paso({ ...corriendo, indicada: 72 }, 0.1)).toEqual([]);
    const fallo = p.paso({ ...corriendo, indicada: 74 }, 0.1);
    // El motor de la derecha, con este sorteo.
    expect(fallo).toEqual([
      { que: "fallo", averia: "motor", motor: 1, antesDeV1: false, enElSuelo: true },
    ]);
    expect(ladoDelMotor(ARAI, 1)).toBe("derecho");
    // Subiendo, por debajo de 400 ft: la velocidad, y nada del motor.
    const bajo = { ...QUIETO, enElSuelo: false, parado: false, sobreElCampo: 60, vertical: 4, indicada: 83 };
    expect(cuales(durante(p, bajo, 5))).toEqual(["velocidad"]);
    // A 400 ft, se asegura; cuatro segundos después, se declara.
    const alto = { ...bajo, sobreElCampo: ALTURA_PARA_ASEGURAR + 5 };
    const arriba = durante(p, alto, 6);
    expect(cuales(arriba)).toEqual(["asegurar", "declarar"]);
    expect(arriba[1]).toEqual({ que: "declarar", socorro: "mayday" });
    // En final, los bomberos; quieto en el suelo, el cierre.
    expect(cuales(durante(p, { ...alto, enFinal: true }, 1))).toEqual(["bomberos"]);
    durante(p, QUIETO, 2);
    expect(p.cierre).toBe("vuelta");
  });

  it("el cuatrimotor que pierde uno declara urgencia, no socorro", () => {
    const p = practica("un-motor", YVAGA);
    const arriba = durante(
      p,
      { ...QUIETO, enElSuelo: false, parado: false, sobreElCampo: 900, indicada: 100 },
      40,
    );
    expect(arriba).toContainEqual({ que: "declarar", socorro: "panpan" });
  });

  it("en el bimotor de pistón la bandera no espera a los 400 ft: sin ella no sube", () => {
    const p = practica("despues-de-v1", PANAMBI);
    p.paso(QUIETO, 0.1);
    p.paso({ ...QUIETO, corriendo: true, parado: false, indicada: 75 }, 0.1);
    const bajo = durante(
      p,
      { ...QUIETO, enElSuelo: false, parado: false, sobreElCampo: 40, vertical: 1, indicada: 45 },
      6,
    );
    expect(cuales(bajo)).toContain("asegurar");
  });

  it("parar pasada V1 también se cierra, y se cuenta qué se hace", () => {
    const p = practica("despues-de-v1");
    p.paso(QUIETO, 0.1);
    p.paso({ ...QUIETO, corriendo: true, parado: false, indicada: 75 }, 0.1);
    durante(p, { ...QUIETO, corriendo: false, parado: false, indicada: 20 }, 3);
    durante(p, QUIETO, 2);
    expect(p.cierre).toBe("paradoTrasV1");
  });
});

describe("el planeo: todos los motores", () => {
  it("falla en el aire a su hora, sin motor concreto, y se cierra al aterrizar", () => {
    const p = practica("planeo", PYKASU);
    const volando = { ...QUIETO, enElSuelo: false, parado: false, sobreElCampo: 500, indicada: 38 };
    // Primero se cuenta, y el motor se para cuando ya se ha contado.
    const antes = durante(p, volando, 13);
    expect(cuales(antes)).toEqual(["presentar"]);
    const falla = durante(p, volando, 3);
    expect(falla).toContainEqual({
      que: "fallo",
      averia: "motores",
      motor: null,
      antesDeV1: false,
      enElSuelo: false,
    });
    // Sin motores no hay nada que asegurar ni que declarar aparte: eso lo
    // hace el vuelo sin motor. Los bomberos, al verse la pista.
    expect(cuales(durante(p, { ...volando, enFinal: true }, 3))).toEqual(["bomberos"]);
    durante(p, QUIETO, 2);
    expect(p.cierre).toBe("vuelta");
  });
});

describe("la despresurización: el aire de la cabina", () => {
  it("se presenta, se va el aire a su hora, y con la emergencia declarada esperan los bomberos", () => {
    const p = practica("despresurizacion", ARAI);
    const arriba = { ...QUIETO, enElSuelo: false, parado: false, sobreElCampo: 11000, indicada: 140 };
    // Primero se cuenta, y el aire se va cuando ya se ha contado.
    const antes = durante(p, arriba, 17);
    expect(cuales(antes)).toEqual(["presentar"]);
    const falla = durante(p, arriba, 2);
    expect(falla).toContainEqual({
      que: "fallo",
      averia: "presion",
      motor: null,
      antesDeV1: false,
      enElSuelo: false,
    });
    /*
     * Ni velocidad de un motor, ni motor que asegurar, ni otra llamada: los
     * motores van bien, y el MAYDAY lo hace el descenso de emergencia. Lo
     * que queda es lo de cualquier emergencia declarada: los bomberos al ver
     * la pista, y el cierre al pararse.
     */
    const bajando = durante(p, { ...arriba, sobreElCampo: 3000, vertical: -25 }, 60);
    expect(cuales(bajando)).toEqual([]);
    expect(cuales(durante(p, { ...arriba, sobreElCampo: 300, enFinal: true }, 3))).toEqual([
      "bomberos",
    ]);
    durante(p, QUIETO, 2);
    expect(p.cierre).toBe("vuelta");
  });
});

describe("si sale mal, se repite", () => {
  it("un percance cierra el ejercicio, y un vuelo nuevo lo arma otra vez", () => {
    const p = practica("despues-de-v1", ARASUNU);
    p.paso(QUIETO, 0.1);
    const fin = p.paso({ ...QUIETO, percance: true }, 0.1);
    expect(fin).toEqual([{ que: "cerrar", como: "otraVez" }]);
    expect(p.fase).toBe("cerrada");
    p.reiniciar();
    expect(p.fase).toBe("armada");
    expect(cuales(p.paso(QUIETO, 0.1))).toEqual(["presentar"]);
  });

  it("la sesión de simulador sortea una avería cada vez", () => {
    let i = 0;
    const tiradas = [0.1, 0.5, 0.9];
    const p = new Practica(ejercicioPorId("simulador")!, ARAI, V, () => tiradas[i++ % 3]!);
    const vistas = new Set<string>();
    for (let k = 0; k < 6; k++) {
      vistas.add(JSON.stringify(p.averia.cuando));
      p.reiniciar();
    }
    expect(vistas.size).toBe(3);
  });
});
