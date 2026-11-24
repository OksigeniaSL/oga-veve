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
  ANTES_DE_LA_PALANCA,
  COMO_MUCHO_SIN_PALANCA,
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
      // Y el tren de nariz que no sale, que es de su tren: ver abajo.
      "tren-de-morro",
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

/*
 * **El tren de nariz que no sale** (#90, H70): al pedir el tren fuera para
 * aterrizar, la pata de morro se queda en su pozo. Lo de su manual: la
 * extensión de emergencia por debajo de 85 KIAS (POH del Seneca III, VB-1110,
 * p. 7-7); y si tampoco, PAN PAN, los bomberos esperando y la toma.
 */
describe("el tren de nariz que no sale", () => {
  const VP = { v1: 34, vr: 37 };
  const morro = () => new Practica(ejercicioPorId("tren-de-morro")!, PANAMBI, VP, () => 0.1);
  const volando = { ...QUIETO, enElSuelo: false, enPista: false, parado: false, sobreElCampo: 300 };

  it("solo en el bimotor de tren retráctil y desde Taguató", () => {
    const e = ejercicioPorId("tren-de-morro")!;
    expect(esAvisado(e)).toBe(true);
    for (const a of AIRCRAFT) {
      const ofrece = ejerciciosPara("taguato", a).some((x) => x.id === "tren-de-morro");
      expect(ofrece, a.id).toBe(a.id === "jaz-40");
      expect(ejerciciosPara("tuka", a).some((x) => x.id === "tren-de-morro"), a.id).toBe(false);
    }
  });

  it("sin haber metido el tren no falla nada: no hay pata que no salga", () => {
    const p = morro();
    p.paso({ ...QUIETO, corriendo: true, parado: false, indicada: 40 }, 0.1);
    expect(cuales(durante(p, { ...volando, tren: "fuera", indicada: 45 }, 5))).toEqual([]);
    expect(p.fase).toBe("armada");
  });

  it("al sacar el tren, falla; la de emergencia, despacio; y tampoco: PAN PAN y los bomberos", () => {
    const p = morro();
    p.paso({ ...QUIETO, corriendo: true, parado: false, indicada: 40 }, 0.1);
    durante(p, { ...volando, tren: "dentro", indicada: 50 }, 3);
    expect(p.paso({ ...volando, tren: "fuera", indicada: 50 }, 0.1)).toEqual([
      { que: "fallo", averia: "morro", motor: null, parar: false, enElSuelo: false },
    ]);
    // Deprisa no se prueba: por encima de 85 KIAS el manual no deja.
    expect(cuales(durante(p, { ...volando, tren: "fuera", indicada: 46 }, 10))).toEqual([]);
    expect(p.extensionProbada).toBe(false);
    const despacio = p.paso({ ...volando, tren: "fuera", indicada: 42 }, 0.1);
    expect(cuales(despacio)).toEqual(["extension"]);
    expect(p.extensionProbada).toBe(true);
    // Lo que tarda en salir un tren, y no sale.
    expect(cuales(durante(p, { ...volando, tren: "fuera", indicada: 42 }, 6.5))).toEqual([]);
    const tampoco = durante(p, { ...volando, tren: "fuera", indicada: 42 }, 1);
    expect(tampoco).toEqual([{ que: "tampoco" }, { que: "declarar", socorro: "panpan" }]);
    expect(p.declaradaYa).toBe(true);
    expect(cuales(durante(p, { ...volando, tren: "fuera", indicada: 42, enFinal: true }, 1))).toEqual(["bomberos"]);
    // En la pista, rodando, y al pararse, «vuelta».
    durante(p, { ...QUIETO, parado: false, indicada: 30, tren: "fuera" }, 5);
    expect(cuales(durante(p, { ...QUIETO, tren: "fuera" }, 1))).toEqual(["cerrar"]);
    expect(p.cierre).toBe("vuelta");
  });

  it("y si sale mal, sale mal el ejercicio", () => {
    const p = morro();
    p.paso({ ...QUIETO, corriendo: true, parado: false, indicada: 40 }, 0.1);
    durante(p, { ...volando, tren: "dentro", indicada: 50 }, 1);
    p.paso({ ...volando, tren: "fuera", indicada: 50 }, 0.1);
    expect(cuales(p.paso({ ...QUIETO, percance: true }, 0.1))).toEqual(["cerrar"]);
    expect(p.cierre).toBe("otraVez");
  });
});

/*
 * **La rueda que revienta en la carrera** (#90, H74): a dieciocho nudos de
 * V1, dentro de la franja en que la guía de la FAA recoge «not rejecting a
 * takeoff for a suspected tire failure at speeds above V1−20 knots» (*Takeoff
 * Safety Training Aid*, p. 2.27).
 */
describe("el reventón en la carrera", () => {
  const KT = 0.514444;
  const reventon = (azar = 0.1) => new Practica(ejercicioPorId("reventon")!, ARAI, V, () => azar);
  const corriendo = { ...QUIETO, corriendo: true, parado: false };
  const CASI = V.v1 - 18 * KT;
  const volando = { ...QUIETO, enElSuelo: false, enPista: false, parado: false, vertical: 5, indicada: 80 };

  /** Presentado y reventado, a la velocidad a la que toca. */
  function reventada(azar = 0.1): Practica {
    const p = reventon(azar);
    p.paso(QUIETO, 0.1);
    p.paso({ ...corriendo, indicada: CASI + 0.1 }, 0.1);
    return p;
  }

  it("solo en el que tiene su tren medido, desde Taguató", () => {
    const e = ejercicioPorId("reventon")!;
    expect(esAvisado(e)).toBe(true);
    for (const a of AIRCRAFT) {
      expect(ejerciciosPara("taguato", a).some((x) => x.id === "reventon"), a.id).toBe(a.id === "jaz-90");
      expect(ejerciciosPara("tuka", a).some((x) => x.id === "reventon"), a.id).toBe(false);
    }
  });

  it("revienta casi a V1, dentro de los veinte nudos, y no antes; y de los dos lados", () => {
    const p = reventon();
    expect(cuales(p.paso(QUIETO, 0.1))).toEqual(["presentar"]);
    expect(durante(p, { ...corriendo, indicada: V.v1 - 20 * KT }, 2)).toEqual([]);
    expect(p.paso({ ...corriendo, indicada: CASI + 0.1 }, 0.1)).toEqual([
      { que: "fallo", averia: "neumatico", motor: null, parar: false, enElSuelo: true },
    ]);
    expect(p.ladoReventado).toBe("izquierdo");
    expect(reventada(0.9).ladoReventado).toBe("derecho");
    // Y mientras dura, el tren se queda fuera.
    expect(p.trenSeQuedaFuera).toBe(true);
  });

  it("seguir: el tren fuera, PAN PAN a los cuatrocientos pies, la toma en la final, el pie al tocar y la vuelta", () => {
    const p = reventada();
    // Rotando, nada: se sostiene el eje.
    expect(durante(p, { ...corriendo, indicada: 75 }, 3)).toEqual([]);
    expect(cuales(durante(p, { ...volando, sobreElCampo: 10 }, 1))).toEqual([]);
    expect(cuales(durante(p, { ...volando, sobreElCampo: 20 }, 1))).toEqual(["trenFuera"]);
    expect(p.declaradaYa).toBe(false);
    expect(durante(p, { ...volando, sobreElCampo: ALTURA_PARA_ASEGURAR + 1 }, 1)).toEqual([
      { que: "declarar", socorro: "panpan" },
    ]);
    expect(p.declaradaYa).toBe(true);
    expect(cuales(durante(p, { ...volando, sobreElCampo: 600, vertical: 0 }, 20))).toEqual([]);
    expect(cuales(durante(p, { ...volando, sobreElCampo: 300, vertical: -4, enFinal: true }, 5))).toEqual([
      "bomberos",
      "toma",
    ]);
    expect(cuales(durante(p, { ...QUIETO, parado: false, indicada: 55, enFinal: true }, 3))).toEqual(["alTocar"]);
    expect(cuales(durante(p, QUIETO, 1))).toEqual(["cerrar"]);
    expect(p.cierre).toBe("vuelta");
    expect(p.trenSeQuedaFuera).toBe(false);
  });

  it("parar antes de V1 está bien hecho, y cuenta como parar a tiempo", () => {
    const p = reventada();
    durante(p, { ...corriendo, indicada: 40 }, 4);
    expect(cuales(durante(p, QUIETO, 2))).toEqual(["bomberos", "cerrar"]);
    expect(p.cierre).toBe("parado");
  });

  it("parar pasada V1, si cabe, también se cierra bien", () => {
    const p = reventada();
    p.paso({ ...corriendo, indicada: V.v1 + 1 }, 0.1);
    durante(p, { ...corriendo, indicada: 40 }, 4);
    durante(p, QUIETO, 2);
    expect(p.cierre).toBe("paradoTrasV1");
  });

  it("si se mete el tren, se cuenta una vez; y otra solo si se saca y se vuelve a meter", () => {
    const p = reventada();
    durante(p, { ...volando, sobreElCampo: 20 }, 1);
    expect(cuales(durante(p, { ...volando, sobreElCampo: 60, tren: "entrando" }, 3))).toEqual(["trenDentro"]);
    expect(cuales(durante(p, { ...volando, sobreElCampo: 80, tren: "dentro" }, 3))).toEqual([]);
    expect(cuales(durante(p, { ...volando, sobreElCampo: 90, tren: "fuera" }, 3))).toEqual([]);
    expect(cuales(durante(p, { ...volando, sobreElCampo: 95, tren: "entrando" }, 1))).toEqual(["trenDentro"]);
  });

  it("y si sale mal, sale mal el ejercicio; y reiniciado, otra vez entero", () => {
    const p = reventada();
    expect(cuales(p.paso({ ...QUIETO, percance: true }, 0.1))).toEqual(["cerrar"]);
    expect(p.cierre).toBe("otraVez");
    p.reiniciar();
    expect(p.ladoReventado).toBeNull();
    expect(p.fase).toBe("armada");
    expect(p.trenSeQuedaFuera).toBe(false);
  });
});

/*
 * **El ave en el motor** (#90, H77): primero volar, y después la palanca de ese
 * motor (FAA, *Airplane Turbofan Engine Operation and Malfunctions*, p. 24).
 */
describe("el ave en el motor", () => {
  const ave = (azar: () => number = () => 0.1, avion = ARAI) => new Practica(ejercicioPorId("ave")!, avion, V, azar);
  const corriendo = { ...QUIETO, corriendo: true, parado: false, indicada: 75 };
  const volando = {
    ...QUIETO,
    enElSuelo: false,
    enPista: false,
    parado: false,
    vertical: 8,
    indicada: 85,
    tren: "dentro" as const,
    alabeo: 0,
    estallidos: 0,
  };

  /** Presentado, corrido y con el ave ya dentro, a cien metros. */
  function conElAve(azar?: () => number, avion = ARAI): Practica {
    const p = ave(azar, avion);
    p.paso(QUIETO, 0.1);
    p.paso(corriendo, 0.1);
    p.paso({ ...volando, sobreElCampo: 101 }, 0.1);
    return p;
  }

  it("se ofrece en los reactores de dos motores, desde Taguató, y se cuenta antes", () => {
    const e = ejercicioPorId("ave")!;
    expect(esAvisado(e)).toBe(true);
    for (const a of AIRCRAFT) {
      const bimotor = a.sound.engine === "turbofan" && a.motores === 2;
      expect(ejerciciosPara("taguato", a).some((x) => x.id === "ave"), a.id).toBe(bimotor);
      expect(ejerciciosPara("taguato-ruvicha", a).some((x) => x.id === "ave"), a.id).toBe(bimotor);
      expect(ejerciciosPara("tuka", a).some((x) => x.id === "ave"), a.id).toBe(false);
      expect(ejerciciosPara("guyrami", a).some((x) => x.id === "ave"), a.id).toBe(false);
    }
    expect(ejerciciosPara("taguato", ARAI).some((x) => x.id === "ave")).toBe(true);
  });

  it("entra subiendo, a cien metros, en un motor o en el otro, y no manda parar", () => {
    const p = ave();
    expect(cuales(p.paso(QUIETO, 0.1))).toEqual(["presentar"]);
    expect(durante(p, corriendo, 2)).toEqual([]);
    expect(durante(p, { ...volando, sobreElCampo: 95 }, 2)).toEqual([]);
    expect(p.ave).toBeNull();
    expect(p.paso({ ...volando, sobreElCampo: 101 }, 0.1)).toEqual([
      { que: "fallo", averia: "ave", motor: null, parar: false, enElSuelo: false },
    ]);
    expect(p.motorDelAve).toBe(0);
    expect(conElAve(() => 0.9).motorDelAve).toBe(1);
    // En marcha y sin tocar su palanca: no es un motor parado.
    expect(p.motorParado).toBeNull();
    expect(p.ave).toMatchObject({ motor: 0, tope: 1 });
  });

  it("primero se vuela: ni por debajo de cuatrocientos pies, ni con el avión sin sujetar, se toca la palanca", () => {
    const p = conElAve();
    expect(durante(p, { ...volando, sobreElCampo: ALTURA_PARA_ASEGURAR - 1, estallidos: 3 }, ANTES_DE_LA_PALANCA + 5)).toEqual([]);
    expect(p.ave!.tope).toBe(1);
    expect(durante(p, { ...volando, sobreElCampo: 300, alabeo: 0.7, estallidos: 5 }, 5)).toEqual([]);
    expect(p.paso({ ...volando, sobreElCampo: 300, estallidos: 5 }, 0.1)).toEqual([
      { que: "palanca", motor: 0, paso: "atras" },
    ]);
    // Y si nunca se sujeta, se toca igual, que esperar más tampoco es volarlo.
    const q = conElAve();
    expect(cuales(durante(q, { ...volando, sobreElCampo: 300, alabeo: 0.7 }, COMO_MUCHO_SIN_PALANCA - 1))).toEqual([]);
    expect(cuales(durante(q, { ...volando, sobreElCampo: 300, alabeo: 0.7 }, 2))).toEqual(["palanca"]);
  });

  it("si aguanta: atrás, se espera, adelante y ahí; PAN PAN, los bomberos y la vuelta", () => {
    const p = conElAve();
    const todo = durante(p, { ...volando, sobreElCampo: 500, estallidos: 4 }, 60);
    expect(todo.filter((s) => s.que === "palanca").map((s) => (s.que === "palanca" ? s.paso : ""))).toEqual([
      "atras",
      "quieto",
      "adelante",
      "aguanta",
    ]);
    expect(todo.filter((s) => s.que === "declarar")).toEqual([{ que: "declarar", socorro: "panpan" }]);
    expect(p.motorParado).toBeNull();
    expect(p.ave!.tope).toBeCloseTo(0.6, 6);
    expect(cuales(durante(p, { ...volando, sobreElCampo: 300, vertical: -4, enFinal: true }, 5))).toEqual(["bomberos"]);
    expect(cuales(durante(p, { ...QUIETO, parado: false, indicada: 50 }, 3))).toEqual([]);
    expect(cuales(durante(p, QUIETO, 1))).toEqual(["cerrar"]);
    expect(p.cierre).toBe("vuelta");
    // Cerrado, el modelo vuelve a ser el de siempre.
    expect(p.ave).toBeNull();
  });

  it("si vuelve a estallar: se para ese motor, y entonces es un bimotor con uno, MAYDAY", () => {
    // El primero elige el lado y el segundo, si aguanta: aquí no.
    const p = conElAve(() => 0.9);
    const va = { ...volando, sobreElCampo: 500, estallidos: 4 };
    let todo: Suceso[] = [];
    for (let t = 0; t < 60; t += 0.1)
      todo = todo.concat(p.paso({ ...va, estallidos: p.pasoDeLaPalanca === "adelante" && p.ave!.tope > 0.3 ? 5 : 4 }, 0.1));
    expect(todo.filter((s) => s.que === "palanca").map((s) => (s.que === "palanca" ? s.paso : ""))).toEqual([
      "atras",
      "quieto",
      "adelante",
      "noAguanta",
      "parado",
    ]);
    expect(p.motorParado).toBe(1);
    expect(p.aseguradoYa).toBe(true);
    expect(todo.filter((s) => s.que === "declarar")).toEqual([{ que: "declarar", socorro: "mayday" }]);
    durante(p, QUIETO, 1);
    expect(p.cierre).toBe("vuelta");
  });

  it("en el suelo no se toca la palanca, y si sale mal, se repite entero", () => {
    const p = conElAve();
    expect(cuales(durante(p, { ...QUIETO, parado: false, indicada: 60, estallidos: 5 }, 30))).toEqual([]);
    expect(p.pasoDeLaPalanca).toBe("petardea");
    const q = conElAve();
    expect(cuales(q.paso({ ...QUIETO, percance: true }, 0.1))).toEqual(["cerrar"]);
    expect(q.cierre).toBe("otraVez");
    q.reiniciar();
    expect(q.fase).toBe("armada");
    expect(q.motorDelAve).toBeNull();
    expect(q.pasoDeLaPalanca).toBeNull();
    expect(q.declaradaYa).toBe(false);
  });
});
