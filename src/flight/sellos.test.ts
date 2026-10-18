/**
 * Los sellos con nombre, comprobados donde se pueden estropear: cada regla con
 * lo que la cumple y con lo que casi la cumple, lo guardado que no se pierde,
 * y el momento de celebrarlo.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { escribirYa, olvidar, ponerProgreso } from "../datos/guardado";
import { SCENARIOS } from "../world/scenarios";
import { CUADERNO_VACIO } from "./cuaderno";
import {
  CAMPOS_DEL_PARAGUAY,
  CIEN_HORAS,
  esDeNoche,
  esMomentoDeCelebrar,
  ganarSello,
  leerSellos,
  MedidorDeSellos,
  selloCelebrado,
  SELLOS,
  sellosDelCuaderno,
  sellosPorCelebrar,
  type LecturaDeLosSellos,
  type MomentoDeCelebrar,
  type TomaDelSello,
} from "./sellos";

const memoria = new Map<string, string>();
const almacen: Storage = {
  getItem: (k) => memoria.get(k) ?? null,
  setItem: (k, v) => void memoria.set(k, String(v)),
  removeItem: (k) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: (i) => [...memoria.keys()][i] ?? null,
  get length() {
    return memoria.size;
  },
};
vi.stubGlobal("localStorage", almacen);

beforeEach(() => {
  memoria.clear();
  olvidar();
});

/** Un avión parado en el puesto, sin nada alrededor: lo que no gana nada. */
const QUIETO: LecturaDeLosSellos = {
  enTierra: true,
  porElSuelo: 0,
  altura: 1,
  velocidad: 0,
  vertical: 0,
  avisoDePerdida: false,
  vref: 33,
  rodajeMaximo: 10,
  enPista: null,
  enNube: 0,
  porInstrumentos: false,
  alTajamar: null,
  galones: [],
};

/** Volando alto y tranquilo, a velocidad de crucero. */
const VOLANDO: LecturaDeLosSellos = {
  ...QUIETO,
  enTierra: false,
  porElSuelo: 55,
  altura: 600,
  velocidad: 55,
};

const TOMA: TomaDelSello = {
  campo: "pettirossi",
  salida: "pettirossi",
  noche: false,
  sola: false,
  sinMotor: false,
};

/** Pasa `segundos` de lo mismo, a pasos de una décima. */
function durante(m: MedidorDeSellos, segundos: number, l: LecturaDeLosSellos) {
  const salen = [];
  for (let t = 0; t < segundos - 1e-9; t += 0.1) salen.push(...m.paso(0.1, l));
  return salen;
}

describe("los dieciséis del issue", () => {
  it("son dieciséis, cada uno una vez, y un tercio de escuela", () => {
    const ids = SELLOS.map((s) => s.id);
    expect(ids).toHaveLength(16);
    expect(new Set(ids).size).toBe(16);
    const de = (tramo: string) => SELLOS.filter((s) => s.tramo === tramo).length;
    expect([de("escuela"), de("piloto"), de("comandante")]).toEqual([6, 5, 5]);
  });

  it("y uno es el de renunciar: Mbarete, con la primera frustrada", () => {
    expect(sellosDelCuaderno({ ...CUADERNO_VACIO, frustradas: 1 })).toContain("mbarete");
  });
});

describe("guardados", () => {
  it("de entrada no hay ninguno", () => {
    expect(leerSellos()).toEqual([]);
    expect(sellosPorCelebrar()).toEqual([]);
  });

  /*
   * **Una vez, y no cada vez**: lo mismo que las gafas. El momento se celebra
   * una vez y el estado no se vuelve a celebrar.
   */
  it("ganar uno devuelve que sí la primera vez y que no las siguientes", () => {
    expect(ganarSello("veve")).toBe(true);
    expect(ganarSello("veve")).toBe(false);
    expect(leerSellos()).toEqual(["veve"]);
    expect(sellosPorCelebrar()).toEqual(["veve"]);
  });

  it("celebrarlo lo saca de la cola, y no lo quita del álbum", () => {
    ganarSello("veve");
    ganarSello("jasy");
    selloCelebrado("veve");
    expect(sellosPorCelebrar()).toEqual(["jasy"]);
    expect(leerSellos()).toEqual(["veve", "jasy"]);
  });

  it("y lo que se gana se queda: otro arranque lo lee igual", () => {
    ganarSello("karumbe");
    escribirYa();
    olvidar(); // Lo que hay en memoria se va; lo escrito en el aparato, no.
    expect(leerSellos()).toEqual(["karumbe"]);
    expect(sellosPorCelebrar()).toEqual(["karumbe"]);
  });

  it("los de antes de existir los sellos se estampan sin fiesta", () => {
    expect(ganarSello("cien-horas", false)).toBe(true);
    expect(leerSellos()).toEqual(["cien-horas"]);
    expect(sellosPorCelebrar()).toEqual([]);
  });

  it("y un guardado raro no rompe nada: lo que no se reconoce no sale", () => {
    ponerProgreso("sellos.ganados", ["veve", "un-sello-que-no-existe", 7, "veve", null]);
    expect(leerSellos()).toEqual(["veve"]);
    ponerProgreso("sellos.ganados", "esto no es una lista");
    expect(leerSellos()).toEqual([]);
  });
});

describe("los que dice el cuaderno", () => {
  it("¡Veve! con el primer despegue, y no antes", () => {
    expect(sellosDelCuaderno(CUADERNO_VACIO)).toEqual([]);
    expect(sellosDelCuaderno({ ...CUADERNO_VACIO, despegues: 1 })).toEqual(["veve"]);
  });

  it("cien horas, justas", () => {
    expect(sellosDelCuaderno({ ...CUADERNO_VACIO, segundos: CIEN_HORAS - 1 })).toEqual([]);
    expect(sellosDelCuaderno({ ...CUADERNO_VACIO, segundos: CIEN_HORAS })).toEqual(["cien-horas"]);
  });

  /** El cuaderno apunta el indicativo del aeródromo, no el del escenario. */
  const oaci = (id: string) => SCENARIOS.find((e) => e.id === id)!.aerodrome!.id;

  it("la Ruta Jesuítica, con Encarnación y Ayolas volados", () => {
    const uno = { ...CUADERNO_VACIO, aerodromos: [oaci("encarnacion")] };
    expect(sellosDelCuaderno(uno)).not.toContain("ruta-jesuitica");
    const los2 = { ...uno, aerodromos: [oaci("encarnacion"), oaci("ayolas")] };
    expect(sellosDelCuaderno(los2)).toContain("ruta-jesuitica");
  });

  it("y de pasaje no cuenta: el sello es de lo volado a los mandos", () => {
    const deViaje = { ...CUADERNO_VACIO, deViaje: [oaci("encarnacion"), oaci("ayolas")] };
    expect(sellosDelCuaderno(deViaje)).not.toContain("ruta-jesuitica");
  });

  it("la hazaña de Pettirossi, con los nueve del Paraguay y ni uno menos", () => {
    expect(CAMPOS_DEL_PARAGUAY).toHaveLength(9);
    expect(CAMPOS_DEL_PARAGUAY).not.toContain("chaco");
    expect(CAMPOS_DEL_PARAGUAY).not.toContain("valle-cordillera");
    const todos = CAMPOS_DEL_PARAGUAY.map((id) =>
      SCENARIOS.find((e) => e.id === id)!.aerodrome?.id ?? id,
    );
    const casi = { ...CUADERNO_VACIO, aerodromos: todos.slice(1) };
    expect(sellosDelCuaderno(casi)).not.toContain("pettirossi");
    expect(sellosDelCuaderno({ ...casi, aerodromos: todos })).toContain("pettirossi");
  });
});

describe("Karumbe: la pista entera, despacio y por el medio", () => {
  const pista = { across: 0, largo: 1000, ancho: 30 };
  const rodando = (along: number, porElSuelo = 6, across = 0): LecturaDeLosSellos => ({
    ...QUIETO,
    porElSuelo,
    enPista: { ...pista, along, across },
  });

  it("de punta a punta, sí", () => {
    const m = new MedidorDeSellos();
    const salen = [];
    for (let a = -440; a <= 440; a += 5) salen.push(...m.paso(0.1, rodando(a)));
    expect(salen).toEqual(["karumbe"]);
  });

  it("media pista, no", () => {
    const m = new MedidorDeSellos();
    for (let a = -440; a <= 0; a += 5) expect(m.paso(0.1, rodando(a))).toEqual([]);
  });

  it("saliéndose a la hierba se empieza otra vez", () => {
    const m = new MedidorDeSellos();
    for (let a = -440; a <= 0; a += 5) m.paso(0.1, rodando(a));
    m.paso(0.1, rodando(0, 6, 20));
    for (let a = 0; a <= 440; a += 5) expect(m.paso(0.1, rodando(a))).toEqual([]);
  });

  it("y corriendo como en el despegue, no: eso es una carrera", () => {
    const m = new MedidorDeSellos();
    for (let a = -440; a <= 440; a += 5) expect(m.paso(0.1, rodando(a, 30))).toEqual([]);
  });
});

describe("Mainumby: diez segundos despacio, alto y nivelado", () => {
  const despacio: LecturaDeLosSellos = { ...VOLANDO, velocidad: 34 };

  it("a los diez segundos, y no antes", () => {
    const m = new MedidorDeSellos();
    expect(durante(m, 9.8, despacio)).toEqual([]);
    expect(durante(m, 0.3, despacio)).toEqual(["mainumby"]);
  });

  it("con el avisador de pérdida sonando, no: se premia el vuelo lento, no la pérdida", () => {
    const m = new MedidorDeSellos();
    expect(durante(m, 15, { ...despacio, avisoDePerdida: true })).toEqual([]);
  });

  it("ni rápido, ni bajo, ni cayendo", () => {
    const m = new MedidorDeSellos();
    expect(durante(m, 15, { ...despacio, velocidad: 50 })).toEqual([]);
    expect(durante(m, 15, { ...despacio, altura: 80 })).toEqual([]);
    expect(durante(m, 15, { ...despacio, vertical: -5 })).toEqual([]);
  });

  it("y la cuenta es seguida: cortarla empieza otra vez", () => {
    const m = new MedidorDeSellos();
    durante(m, 8, despacio);
    m.paso(0.1, VOLANDO);
    expect(durante(m, 8, despacio)).toEqual([]);
  });
});

describe("Ñandutí: atravesar una nube, por instrumentos", () => {
  const ifr: LecturaDeLosSellos = { ...VOLANDO, porInstrumentos: true };

  it("entrar, estar dentro y salir", () => {
    const m = new MedidorDeSellos();
    expect(durante(m, 3, { ...ifr, enNube: 0.95 })).toEqual([]);
    expect(m.paso(0.1, { ...ifr, enNube: 0.02 })).toEqual(["nanduti"]);
  });

  it("rozarla no es atravesarla", () => {
    const m = new MedidorDeSellos();
    durante(m, 1, { ...ifr, enNube: 0.95 });
    expect(m.paso(0.1, { ...ifr, enNube: 0.02 })).toEqual([]);
  });

  /*
   * La regla 4: una avioneta de vuelo visual no se mete en una nube. Premiar
   * que lo haga enseñaría lo que mata a más pilotos de avioneta.
   */
  it("y en una avioneta de vuelo visual, nunca", () => {
    const m = new MedidorDeSellos();
    durante(m, 5, { ...VOLANDO, enNube: 0.95 });
    expect(m.paso(0.1, { ...VOLANDO, enNube: 0 })).toEqual([]);
  });
});

describe("la vuelta al tajamar", () => {
  /** Una vuelta a un radio y una altura, en `pasos` trozos. */
  function vuelta(m: MedidorDeSellos, radio: number, altura: number, giro = 1.05) {
    const salen = [];
    for (let a = 0; a <= giro * 2 * Math.PI; a += 0.05)
      salen.push(
        ...m.paso(0.1, {
          ...VOLANDO,
          altura,
          alTajamar: { dx: radio * Math.cos(a), dz: radio * Math.sin(a) },
        }),
      );
    return salen;
  }

  it("una vuelta entera alrededor, a la altura de la maniobra", () => {
    expect(vuelta(new MedidorDeSellos(), 400, 300)).toEqual(["tajamar"]);
  });

  it("media vuelta, no", () => {
    expect(vuelta(new MedidorDeSellos(), 400, 300, 0.5)).toEqual([]);
  });

  it("ni rasante, ni lejísimos, ni sin granja", () => {
    expect(vuelta(new MedidorDeSellos(), 400, 60)).toEqual([]);
    expect(vuelta(new MedidorDeSellos(), 2000, 300)).toEqual([]);
    const m = new MedidorDeSellos();
    expect(durante(m, 60, { ...VOLANDO, alTajamar: null })).toEqual([]);
  });
});

describe("tres toques", () => {
  /** Tocar, rodar un poco sin parar y volver a subir. */
  function toque(m: MedidorDeSellos, parar = false) {
    const salen = [...m.alAterrizar(TOMA)];
    salen.push(...m.paso(0.1, { ...QUIETO, porElSuelo: parar ? 0 : 25 }));
    salen.push(...m.paso(0.1, { ...VOLANDO, altura: 15 }));
    salen.push(...m.paso(0.1, { ...VOLANDO, altura: 60 }));
    return salen;
  }

  it("al tercero, y no antes", () => {
    const m = new MedidorDeSellos();
    expect(toque(m)).toEqual([]);
    expect(toque(m)).toEqual([]);
    expect(toque(m)).toEqual(["tres-toques"]);
  });

  it("parando en la pista es una toma completa, no un toque", () => {
    const m = new MedidorDeSellos();
    toque(m);
    toque(m, true);
    expect(toque(m)).toEqual([]);
  });

  it("y un bote no es volver a subir", () => {
    const m = new MedidorDeSellos();
    for (let i = 0; i < 3; i++) {
      m.alAterrizar(TOMA);
      expect(m.paso(0.1, { ...VOLANDO, altura: 8 })).toEqual([]);
    }
  });

  it("y son del mismo vuelo: otro vuelo empieza de cero", () => {
    const m = new MedidorDeSellos();
    toque(m);
    toque(m);
    m.reiniciar();
    expect(toque(m)).toEqual([]);
  });
});

describe("lo que da una toma", () => {
  it("el Primer Solo, despegando y aterrizando sin instructora", () => {
    const m = new MedidorDeSellos();
    m.alDespegar(true);
    expect(m.alAterrizar({ ...TOMA, sola: true })).toEqual(["primer-solo"]);
  });

  it("y no si la instructora iba en el despegue, ni empezando en el aire", () => {
    const con = new MedidorDeSellos();
    con.alDespegar(false);
    expect(con.alAterrizar({ ...TOMA, sola: true })).toEqual([]);
    const enElAire = new MedidorDeSellos();
    expect(enElAire.alAterrizar({ ...TOMA, sola: true })).toEqual([]);
  });

  it("la chipa volandera, aterrizando en otro campo", () => {
    const m = new MedidorDeSellos();
    expect(m.alAterrizar(TOMA)).toEqual([]);
    expect(m.alAterrizar({ ...TOMA, salida: "", campo: "guarani" })).toEqual([]);
    expect(m.alAterrizar({ ...TOMA, campo: "guarani" })).toEqual(["chipa-volandera"]);
  });

  it("Jasy de noche, el planeador sin motor", () => {
    expect(new MedidorDeSellos().alAterrizar({ ...TOMA, noche: true })).toEqual(["jasy"]);
    expect(new MedidorDeSellos().alAterrizar({ ...TOMA, sinMotor: true })).toEqual(["planeador"]);
  });

  it("la Transchaco, de Asunción a Estigarribia o al revés", () => {
    const ida = { ...TOMA, salida: "pettirossi", campo: "estigarribia" };
    expect(new MedidorDeSellos().alAterrizar(ida)).toContain("transchaco");
    const vuelta = { ...TOMA, salida: "estigarribia", campo: "pettirossi" };
    expect(new MedidorDeSellos().alAterrizar(vuelta)).toContain("transchaco");
    const otra = { ...TOMA, salida: "pettirossi", campo: "concepcion" };
    expect(new MedidorDeSellos().alAterrizar(otra)).not.toContain("transchaco");
  });

  it("de noche es de noche de verdad: el sol a más de seis grados bajo el horizonte", () => {
    const seno = (g: number) => Math.sin((g * Math.PI) / 180);
    expect(esDeNoche(seno(-3))).toBe(false);
    expect(esDeNoche(seno(-5.9))).toBe(false);
    expect(esDeNoche(seno(-6.1))).toBe(true);
    expect(esDeNoche(seno(30))).toBe(false);
  });
});

describe("Manos de seda: la aproximación estabilizada y la toma, en el mismo vuelo", () => {
  it("con las dos marcadas en la hoja", () => {
    const m = new MedidorDeSellos();
    expect(m.paso(0.1, { ...QUIETO, galones: ["toma"] })).toEqual([]);
    expect(m.paso(0.1, { ...QUIETO, galones: ["aproximacion", "toma"] })).toEqual(["manos-de-seda"]);
  });

  it("y una vez por vuelo: el medidor no repite", () => {
    const m = new MedidorDeSellos();
    m.paso(0.1, { ...QUIETO, galones: ["aproximacion", "toma"] });
    expect(m.paso(0.1, { ...QUIETO, galones: ["aproximacion", "toma"] })).toEqual([]);
  });
});

describe("el momento de celebrarlo", () => {
  const RODANDO_DESPACIO: MomentoDeCelebrar = {
    enTierra: true,
    porElSuelo: 6,
    rodando: 15,
    enEscena: false,
    percance: false,
    vueloTerminado: false,
    gafasPorCelebrar: false,
    alguienHabla: false,
    tarjetaQueImporta: false,
  };

  it("rodando despacio o parado, sí", () => {
    expect(esMomentoDeCelebrar(RODANDO_DESPACIO)).toBe(true);
    expect(esMomentoDeCelebrar({ ...RODANDO_DESPACIO, porElSuelo: 0 })).toBe(true);
  });

  it("en el aire o en la carrera, nunca: es mitad de una maniobra", () => {
    expect(esMomentoDeCelebrar({ ...RODANDO_DESPACIO, enTierra: false })).toBe(false);
    expect(esMomentoDeCelebrar({ ...RODANDO_DESPACIO, porElSuelo: 40 })).toBe(false);
  });

  it("ni encima de otra voz, ni de una tarjeta que importa más, ni antes que las gafas", () => {
    expect(esMomentoDeCelebrar({ ...RODANDO_DESPACIO, alguienHabla: true })).toBe(false);
    expect(esMomentoDeCelebrar({ ...RODANDO_DESPACIO, tarjetaQueImporta: true })).toBe(false);
    expect(esMomentoDeCelebrar({ ...RODANDO_DESPACIO, gafasPorCelebrar: true })).toBe(false);
  });

  it("ni en una escena del inicio, ni con un percance, ni con el final puesto", () => {
    expect(esMomentoDeCelebrar({ ...RODANDO_DESPACIO, enEscena: true })).toBe(false);
    expect(esMomentoDeCelebrar({ ...RODANDO_DESPACIO, percance: true })).toBe(false);
    expect(esMomentoDeCelebrar({ ...RODANDO_DESPACIO, vueloTerminado: true })).toBe(false);
  });
});
