import { describe, expect, it } from "vitest";
import { AIRCRAFT, ARAI, ARASUNU, JAZ_50, PANAMBI, PYKASU, TIJERETA, YVAGA } from "./aircraft";
import {
  conV1,
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
  tren: "fuera",
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

/** Los de avería: la tormenta va aparte, ver su `describe`. */
const deAveria = (ids: readonly string[]): string[] => ids.filter((id) => id !== "tormenta");

describe("los ejercicios que se ofrecen", () => {
  it("en Guyrami, ninguna avería", () => {
    for (const a of AIRCRAFT)
      expect(deAveria(ejerciciosPara("guyrami", a).map((e) => e.id))).toEqual([]);
  });

  it("en Tukã, solo el planeo, avisado", () => {
    for (const a of AIRCRAFT) {
      const ids = deAveria(ejerciciosPara("tuka", a).map((e) => e.id));
      expect(ids).toEqual(["planeo"]);
    }
    expect(esAvisado(ejercicioPorId("planeo")!)).toBe(true);
  });

  it("y la tormenta, en los cuatro peldaños y solo con radar meteorológico", () => {
    const tormenta = ejercicioPorId("tormenta")!;
    expect(tormenta.peldanos).toEqual(["guyrami", "tuka", "taguato", "taguato-ruvicha"]);
    expect(tormenta.averias).toEqual([]);
    expect(tormenta.escena).toBe("tormenta");
    expect(esAvisado(tormenta)).toBe(true);
    // Los de turbina, que son los que lo llevan; la avioneta y el pistón, no.
    for (const a of [ARASUNU, ARAI, YVAGA])
      expect(ejerciciosPara("guyrami", a).map((e) => e.id)).toEqual(["tormenta"]);
    for (const a of [PYKASU, PANAMBI])
      expect(ejerciciosPara("taguato", a).some((e) => e.id === "tormenta")).toBe(false);
  });

  it("en Taguato, V1 y el motor parado en vuelo, pero solo con más de un motor", () => {
    // Y en la avioneta, la carga suelta, que es de su hoja de centrado: ver `carga-suelta.test.ts`.
    expect(ejerciciosPara("taguato", PYKASU).map((e) => e.id)).toEqual(["planeo", "carga"]);
    for (const a of [JAZ_50, ARASUNU, ARAI, TIJERETA, YVAGA]) {
      const ids = ejerciciosPara("taguato", a).map((e) => e.id);
      expect(ids.slice(0, 4), a.id).toEqual(["planeo", "antes-de-v1", "despues-de-v1", "un-motor"]);
    }
  });

  /*
   * El bimotor de pistón no lleva V1: su manual para con el tren fuera y deja
   * seguir con el tren dentro (Seneca III, VB-1110, sección 3; FAA-H-8083-3C,
   * p. 13-12). Ver `conV1`.
   */
  it("y en el bimotor de pistón, lo de su manual: parar con el tren fuera, seguir con el tren dentro", () => {
    expect(conV1(PANAMBI)).toBe(false);
    for (const a of [JAZ_50, ARASUNU, ARAI, TIJERETA, YVAGA]) expect(conV1(a), a.id).toBe(true);
    expect(ejerciciosPara("taguato", PANAMBI).map((e) => e.id)).toEqual([
      "planeo",
      "en-la-carrera",
      "tren-arriba",
      "un-motor",
    ]);
    // Y ninguno de los suyos se le ofrece a los de turbina.
    for (const a of [JAZ_50, ARASUNU, ARAI, TIJERETA, YVAGA]) {
      const ids = ejerciciosPara("taguato-ruvicha", a).map((e) => e.id);
      expect(ids).not.toContain("en-la-carrera");
      expect(ids).not.toContain("tren-arriba");
    }
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
      { que: "fallo", averia: "motor", motor: 0, parar: true, enElSuelo: true },
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
      { que: "fallo", averia: "motor", motor: 1, parar: false, enElSuelo: true },
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


  it("parar pasada V1 también se cierra, y se cuenta qué se hace", () => {
    const p = practica("despues-de-v1");
    p.paso(QUIETO, 0.1);
    p.paso({ ...QUIETO, corriendo: true, parado: false, indicada: 75 }, 0.1);
    durante(p, { ...QUIETO, corriendo: false, parado: false, indicada: 20 }, 3);
    durante(p, QUIETO, 2);
    expect(p.cierre).toBe("paradoTrasV1");
  });
});

describe("el bimotor de pistón: lo de su manual, sin V1", () => {
  const VP = { v1: 34, vr: 37 };
  const dePiston = (id: string, azar = () => 0.1) => new Practica(ejercicioPorId(id)!, PANAMBI, VP, azar);
  const corriendo = { ...QUIETO, corriendo: true, parado: false };

  it("rodando cerca de la rotación, pasada la V1 del juego: se para, y parar es lo bien hecho", () => {
    const p = dePiston("en-la-carrera");
    p.paso(QUIETO, 0.1);
    // A medio camino entre su V1, que es su Vmc, y la rotación.
    expect(p.paso({ ...corriendo, indicada: 35 }, 0.1)).toEqual([]);
    expect(p.paso({ ...corriendo, indicada: 35.6 }, 0.1)).toEqual([
      { que: "fallo", averia: "motor", motor: 0, parar: true, enElSuelo: true },
    ]);
    // Ni velocidad de un motor ni bandera: gases atrás y frenos.
    const frenando = durante(p, { ...corriendo, corriendo: false, indicada: 15 }, 4);
    expect(cuales(frenando)).toEqual([]);
    expect(cuales(durante(p, QUIETO, 2))).toEqual(["bomberos", "cerrar"]);
    expect(p.cierre).toBe("parado");
  });

  it("recién despegado y con el tren fuera, también: se apoya y se para", () => {
    const p = dePiston("en-la-carrera");
    p.paso(QUIETO, 0.1);
    p.paso({ ...corriendo, indicada: 34.5 }, 0.1);
    // Rota antes de llegar al punto: falla en cuanto se va del suelo.
    const fallo = p.paso({ ...corriendo, enElSuelo: false, enPista: false, sobreElCampo: 4, vertical: 1, indicada: 36 }, 0.1);
    expect(fallo).toEqual([{ que: "fallo", averia: "motor", motor: 0, parar: true, enElSuelo: false }]);
    expect(cuales(durante(p, { ...corriendo, enElSuelo: false, sobreElCampo: 2, vertical: -1, indicada: 34 }, 3))).toEqual([]);
    durante(p, { ...corriendo, corriendo: false, indicada: 15 }, 3);
    durante(p, QUIETO, 2);
    expect(p.cierre).toBe("parado");
  });

  it("y si se sigue con el tren fuera y se vuelve, se cierra contando que tocaba parar", () => {
    const p = dePiston("en-la-carrera");
    p.paso(QUIETO, 0.1);
    p.paso({ ...corriendo, indicada: 35.6 }, 0.1);
    const subiendo = durante(
      p,
      { ...QUIETO, enElSuelo: false, parado: false, sobreElCampo: 60, vertical: 1, indicada: 40, tren: "dentro" },
      12,
    );
    // Siguió: la compañera lo asegura en cuanto vuela.
    expect(cuales(subiendo)).toEqual(["velocidad", "asegurar", "declarar"]);
    durante(p, { ...QUIETO, enFinal: true, enElSuelo: false, sobreElCampo: 100, indicada: 45, parado: false }, 2);
    durante(p, QUIETO, 2);
    expect(p.cierre).toBe("seguidoAntesDeV1");
  });

  it("con el tren pedido fuera o entrando no falla; dentro y subiendo, sí, y se sigue", () => {
    const p = dePiston("tren-arriba");
    p.paso(QUIETO, 0.1);
    p.paso({ ...corriendo, indicada: 37 }, 0.1);
    const aire = { ...QUIETO, enElSuelo: false, enPista: false, parado: false, vertical: 3, indicada: 45 };
    expect(durante(p, { ...aire, sobreElCampo: 40 }, 3)).toEqual([]);
    expect(durante(p, { ...aire, sobreElCampo: 70, tren: "entrando" }, 3)).toEqual([]);
    expect(p.paso({ ...aire, sobreElCampo: 90, tren: "dentro" }, 0.1)).toEqual([
      { que: "fallo", averia: "motor", motor: 0, parar: false, enElSuelo: false },
    ]);
  });

  /*
   * Lo que haría un instructor: el ejercicio no se queda armado el resto del
   * vuelo. A 650 ft ya no queda pista para posarse, y su manual manda seguir
   * y meter el tren (Seneca III, VB-1110, sección 3). Ver `sinTrenA`.
   */
  it("y si nadie mete el tren, a 650 ft falla igual, con el tren fuera, y se sigue", () => {
    const p = dePiston("tren-arriba", () => 0.9);
    p.paso(QUIETO, 0.1);
    p.paso({ ...corriendo, indicada: 37 }, 0.1);
    const aire = { ...QUIETO, enElSuelo: false, enPista: false, parado: false, vertical: 3, indicada: 45 };
    expect(durante(p, { ...aire, sobreElCampo: 190 }, 5)).toEqual([]);
    // Entrando a esa altura tampoco: falla al llegar dentro, como siempre.
    expect(durante(p, { ...aire, sobreElCampo: 210, tren: "entrando" }, 1)).toEqual([]);
    expect(p.trenFueraAlFallar).toBe(false);
    expect(p.paso({ ...aire, sobreElCampo: 200 }, 0.1)).toEqual([
      { que: "fallo", averia: "motor", motor: 1, parar: false, enElSuelo: false },
    ]);
    expect(p.trenFueraAlFallar).toBe(true);
    // La bandera, enseguida igual; «con un motor se sube», no con el tren fuera.
    expect(cuales(durante(p, { ...aire, sobreElCampo: 195, vertical: -0.5 }, 4.2))).toEqual(["asegurar"]);
    // Metido el tren, sí.
    expect(cuales(durante(p, { ...aire, sobreElCampo: 195, vertical: 1, tren: "dentro" }, 1))).toEqual(["velocidad"]);
    expect(cuales(durante(p, { ...aire, sobreElCampo: 220, tren: "dentro" }, 4))).toEqual(["declarar"]);
    durante(p, { ...aire, enFinal: true }, 1);
    durante(p, QUIETO, 2);
    expect(p.cierre).toBe("vuelta");
    // Y el vuelo siguiente empieza limpio.
    p.reiniciar();
    expect(p.trenFueraAlFallar).toBe(false);
  });

  it("y con el tren metido a tiempo no cambia nada: falla al entrar, y no con él fuera", () => {
    const p = dePiston("tren-arriba");
    p.paso(QUIETO, 0.1);
    p.paso({ ...corriendo, indicada: 37 }, 0.1);
    const aire = { ...QUIETO, enElSuelo: false, enPista: false, parado: false, vertical: 3, indicada: 45 };
    p.paso({ ...aire, sobreElCampo: 90, tren: "dentro" }, 0.1);
    expect(p.fase).toBe("fallo");
    expect(p.trenFueraAlFallar).toBe(false);
  });

  it("y la compañera pone la bandera enseguida, sin esperar a los 400 ft ni a nada", () => {
    const p = dePiston("tren-arriba", () => 0.9);
    p.paso(QUIETO, 0.1);
    p.paso({ ...corriendo, indicada: 37 }, 0.1);
    // Recién metido el tren, a dieciséis metros: el fallo más bajo que da el ejercicio.
    const aire = { ...QUIETO, enElSuelo: false, enPista: false, parado: false, vertical: 2, indicada: 44, tren: "dentro" as const };
    const fallo = p.paso({ ...aire, sobreElCampo: 16 }, 0.1);
    expect(fallo).toEqual([{ que: "fallo", averia: "motor", motor: 1, parar: false, enElSuelo: false }]);
    // Identificar, verificar y bandera: a los cuatro segundos, a la altura que sea.
    const despues = durante(p, { ...aire, sobreElCampo: 18, vertical: 0.5 }, 4.2);
    expect(cuales(despues)).toEqual(["velocidad", "asegurar"]);
    expect(despues[1]).toEqual({ que: "asegurar", motor: 1 });
    expect(cuales(durante(p, { ...aire, sobreElCampo: 30 }, 5))).toEqual(["declarar"]);
    durante(p, { ...aire, enFinal: true, tren: "fuera" }, 1);
    durante(p, QUIETO, 2);
    expect(p.cierre).toBe("vuelta");
  });

  it("y en la sesión de simulador, los dos fallos de la carrera se paran y el de la subida se sigue", () => {
    const sim = ejercicioPorId("simulador")!;
    for (const [tirada, parar] of [
      [0.1, true],
      [0.5, true],
      [0.9, false],
    ] as const) {
      const p = new Practica(sim, PANAMBI, VP, () => tirada);
      p.paso(QUIETO, 0.1);
      const sucesos = [
        ...durante(p, { ...corriendo, indicada: 36 }, 0.5),
        ...durante(p, { ...QUIETO, enElSuelo: false, parado: false, sobreElCampo: 320, vertical: 3, indicada: 46, tren: "dentro" }, 0.5),
      ];
      const fallo = sucesos.find((x) => x.que === "fallo");
      expect(fallo && fallo.que === "fallo" && fallo.parar, String(tirada)).toBe(parar);
    }
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
      parar: false,
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
      parar: false,
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
