/**
 * **El ave en el motor**: el petardeo, la palanca que lo calla y lo que vuela
 * el modelo con ese motor (#90, ADR 0014, enmienda H77).
 *
 * Lo que manda es la guía de la FAA para tripulaciones, *Airplane Turbofan
 * Engine Operation and Malfunctions*, pp. 18 a 24, y el ensayo de 14 CFR 33.76.
 */
import { describe, expect, it } from "vitest";
import { Group, Mesh, BoxGeometry, MeshBasicMaterial, Vector3 } from "three";
import { ARAI, AIRCRAFT, YVAGA, type AircraftConfig } from "./aircraft";
import {
  ENTRE_ESTALLIDOS,
  PALANCA_ADELANTE,
  PALANCA_ATRAS,
  PRIMER_ESTALLIDO,
  Petardeo,
  PalancaDelAve,
  REGIMEN_QUE_AGUANTA,
  SE_ESPERA,
  UMBRAL_RECIEN,
  UMBRAL_RECUPERADO,
  type PasoDeLaPalanca,
} from "./ave-en-el-motor";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls, type ControlInputs } from "./model";
import { TAGUATO, TAGUATO_RUVICHA } from "./tiers";
import { nacelaDe, Llamarada, DURA_LA_LLAMARADA } from "../world/llamarada";

const DT = 1 / 60;

/** Lo que hace el petardeo durante unos segundos a un empuje. */
function petardea(da: number, umbral: number, segundos: number) {
  const p = new Petardeo();
  const cuando: number[] = [];
  let empuje = 1;
  let vueltas = 1;
  for (let i = 0; i < segundos * 60; i++) {
    const antes = p.estallidos;
    p.paso(DT, da, umbral);
    if (p.estallidos > antes) cuando.push(i * DT);
    empuje = Math.min(empuje, p.empuje);
    vueltas = Math.min(vueltas, p.vueltas);
  }
  return { p, cuando, empuje, vueltas };
}

describe("el petardeo", () => {
  it("estalla espaciado, cada par de segundos, y nunca más deprisa", () => {
    const { cuando } = petardea(1, UMBRAL_RECIEN, 20);
    expect(cuando[0]).toBeCloseTo(PRIMER_ESTALLIDO, 1);
    expect(cuando.length).toBe(5);
    for (let i = 1; i < cuando.length; i++) expect(cuando[i]! - cuando[i - 1]!).toBeCloseTo(ENTRE_ESTALLIDOS, 1);
  });

  it("le quita a ese motor lo que dice la guía: medio empuje y del 103 al 95 % de N1, y vuelve al 98 %", () => {
    const { empuje, vueltas } = petardea(1, UMBRAL_RECIEN, 20);
    expect(empuje).toBeCloseTo(0.5, 2);
    expect(vueltas).toBeCloseTo(95 / 103, 3);
    // Entre uno y otro, el 98 %.
    const { p } = petardea(1, UMBRAL_RECIEN, PRIMER_ESTALLIDO + 3);
    expect(p.empuje).toBeCloseTo(0.98, 3);
    expect(p.vueltas).toBeCloseTo(0.98, 3);
  });

  it("por debajo de su umbral no estalla, y lo que iba se recupera entero", () => {
    expect(petardea(UMBRAL_RECIEN, UMBRAL_RECIEN, 20).cuando).toEqual([]);
    const p = new Petardeo();
    for (let i = 0; i < 60; i++) p.paso(DT, 1, UMBRAL_RECIEN);
    expect(p.estallidos).toBe(1);
    for (let i = 0; i < 180; i++) p.paso(DT, 0.1, UMBRAL_RECIEN);
    expect(p.estallidos).toBe(1);
    expect(p.empuje).toBe(1);
    expect(p.vueltas).toBe(1);
  });
});

/** La palanca hasta que no se mueve más, con un motor que sigue lo que le deja. */
function lleva(seRecupera: boolean, gas = 1) {
  const p = new PalancaDelAve(seRecupera);
  const m = new Petardeo();
  const pasos: { paso: PasoDeLaPalanca; t: number; tope: number }[] = [];
  p.empezar();
  for (let t = 0; t < 60; t += DT) {
    m.paso(DT, Math.min(gas, p.tope), p.umbral);
    const llega = p.avanzar(DT, m.estallidos);
    if (llega) pasos.push({ paso: llega, t, tope: p.tope });
  }
  return { p, m, pasos };
}

describe("la palanca de ese motor", () => {
  it("hasta que no se empieza, no se toca, aunque estalle", () => {
    const p = new PalancaDelAve(true);
    for (let i = 0; i < 600; i++) expect(p.avanzar(DT, i)).toBeNull();
    expect(p.paso).toBe("petardea");
    expect(p.tope).toBe(1);
  });

  it("atrás hasta el ralentí, se espera, adelante despacio y se queda donde aguanta", () => {
    const { p, pasos } = lleva(true);
    expect(pasos.map((x) => x.paso)).toEqual(["quieto", "adelante", "aguanta"]);
    expect(pasos[0]!.tope).toBe(0);
    expect(pasos[0]!.t).toBeCloseTo(PALANCA_ATRAS, 0);
    expect(pasos[1]!.t - pasos[0]!.t).toBeCloseTo(SE_ESPERA, 0);
    expect(pasos[2]!.t - pasos[1]!.t).toBeCloseTo(PALANCA_ADELANTE + ENTRE_ESTALLIDOS, 0);
    expect(p.tope).toBeCloseTo(REGIMEN_QUE_AGUANTA, 6);
    // Y por debajo del umbral, «below the stall threshold», que es lo que su ensayo le pide conservar.
    expect(REGIMEN_QUE_AGUANTA).toBeLessThan(UMBRAL_RECUPERADO);
    expect(p.umbral).toBe(UMBRAL_RECUPERADO);
  });

  it("si al avanzarla vuelve a estallar, atrás y se para", () => {
    const { p, pasos } = lleva(false);
    expect(pasos.map((x) => x.paso)).toEqual(["quieto", "adelante", "noAguanta", "parado"]);
    // Estalla al pasar de lo que da, no al moverla.
    expect(pasos[2]!.tope).toBeGreaterThan(UMBRAL_RECIEN);
    expect(p.tope).toBe(0);
  });

  it("y si aguantaba porque se iba despacio, al pedirle más también se para", () => {
    const { p } = lleva(false, 0.2);
    expect(p.paso).toBe("aguanta");
    expect(p.avanzar(DT, 99)).toBe("noAguanta");
  });
});

const rumboDe = (m: CoefficientFlightModel): number => {
  const h = m.state.heading;
  return h > Math.PI ? h - 2 * Math.PI : h;
};

/** Ocho segundos subiendo a fondo, con el motor `motor` tocado o ninguno. */
function subiendo(
  a: AircraftConfig,
  tocado: { motor: number; tope: number; umbral: number } | null,
  mandos: Partial<ControlInputs> = {},
  assist = TAGUATO_RUVICHA.assists,
  segundos = 8,
) {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist });
  m.reset({ position: new Vector3(0, 400, 0), heading: 0, airspeed: a.approachSpeed * 1.25 });
  let empujeMinimo = Infinity;
  for (let i = 0; i < 60 * segundos; i++) {
    m.ponerMotorTocado(tocado);
    m.step(DT, { ...neutralControls(), throttle: 1, flaps: 0.2, tren: 0, ...mandos });
    if (i > 30) empujeMinimo = Math.min(empujeMinimo, m.empujeAhora());
  }
  return { m, rumbo: rumboDe(m), empujeMinimo };
}

describe("lo que vuela el modelo con un ave en un motor", () => {
  it("tira hacia el motor tocado, y a los dos lados igual", () => {
    const izq = subiendo(ARAI, { motor: 0, tope: 1, umbral: UMBRAL_RECIEN }, {}, TAGUATO_RUVICHA.assists, 2);
    const der = subiendo(ARAI, { motor: 1, tope: 1, umbral: UMBRAL_RECIEN }, {}, TAGUATO_RUVICHA.assists, 2);
    expect(izq.rumbo).toBeLessThan(-0.01);
    expect(der.rumbo).toBeGreaterThan(0.01);
    expect(der.rumbo).toBeCloseTo(-izq.rumbo, 3);
    // Y lo sujeta el pie del otro lado.
    const pie = subiendo(ARAI, { motor: 0, tope: 1, umbral: UMBRAL_RECIEN }, { rudder: 0.25 }, TAGUATO_RUVICHA.assists, 2);
    expect(pie.rumbo).toBeGreaterThan(izq.rumbo);
  });

  it("pierde empuje en cada estallido, el de ese motor y no el otro", () => {
    const sano = subiendo(ARAI, null);
    const ave = subiendo(ARAI, { motor: 0, tope: 1, umbral: UMBRAL_RECIEN });
    expect(ave.empujeMinimo).toBeLessThan(sano.empujeMinimo * 0.8);
    expect(ave.empujeMinimo).toBeGreaterThan(sano.empujeMinimo * 0.65);
    expect(ave.m.motorTocado!.estallidos).toBe(2);
    expect(ave.m.motoresAhora()).toEqual(["marcha", "marcha"]);
  });

  it("se calla con su palanca atrás, y el otro sigue dando lo suyo", () => {
    const m = new CoefficientFlightModel({ aircraft: ARAI, ground: () => 0, assist: TAGUATO.assists });
    m.reset({ position: new Vector3(0, 400, 0), heading: 0, airspeed: ARAI.approachSpeed * 1.25 });
    const c = { ...neutralControls(), throttle: 1, flaps: 0.2, tren: 0 };
    for (let i = 0; i < 60 * 6; i++) {
      m.ponerMotorTocado({ motor: 1, tope: 1, umbral: UMBRAL_RECIEN });
      m.step(DT, c);
    }
    const antes = m.motorTocado!.estallidos;
    expect(antes).toBe(2);
    for (let i = 0; i < 60 * 14; i++) {
      m.ponerMotorTocado({ motor: 1, tope: 0, umbral: UMBRAL_RECIEN });
      m.step(DT, c);
    }
    // Tarda en bajar de vueltas lo que tarda un reactor: puede dar uno más, y ya.
    const callado = m.motorTocado!.estallidos;
    expect(callado).toBeLessThanOrEqual(antes + 1);
    for (let i = 0; i < 60 * 10; i++) {
      m.ponerMotorTocado({ motor: 1, tope: 0, umbral: UMBRAL_RECIEN });
      m.step(DT, c);
    }
    expect(m.motorTocado!.estallidos).toBe(callado);
    expect(m.motorTocado!.da).toBeLessThan(0.05);
    expect(m.gasDelMotor()).toBeGreaterThan(0.95);
    // Y adelante a media potencia, callado también, si aguanta.
    for (let i = 0; i < 60 * 20; i++) {
      m.ponerMotorTocado({ motor: 1, tope: REGIMEN_QUE_AGUANTA, umbral: UMBRAL_RECUPERADO });
      m.step(DT, c);
    }
    expect(m.motorTocado!.estallidos).toBe(callado);
    expect(m.motorTocado!.da).toBeCloseTo(REGIMEN_QUE_AGUANTA, 1);
  });

  it("y quitado, es el modelo de siempre, bit a bit; también en el que no tiene a quién torcer", () => {
    for (const a of AIRCRAFT.filter((x) => !x.helicoptero)) {
      const correr = (conSetter: boolean) => {
        const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: TAGUATO.assists });
        m.reset({ position: new Vector3(0, 400, 0), heading: 0.3, airspeed: a.approachSpeed * 1.25 });
        for (let i = 0; i < 600; i++) {
          if (conSetter) m.ponerMotorTocado(i < 5 ? null : null);
          m.step(DT, { ...neutralControls(), throttle: 0.4 + 0.4 * Math.sin(i / 50), rudder: 0.1, aileron: 0.05 });
        }
        const s = m.state;
        return [s.position.x, s.position.y, s.position.z, s.velocity.x, s.velocity.y, s.heading, s.yawRate];
      };
      expect(correr(true), a.id).toEqual(correr(false));
    }
    // Un motor que no existe, o un monomotor, no se toca.
    const m = new CoefficientFlightModel({ aircraft: ARAI, ground: () => 0, assist: TAGUATO.assists });
    m.ponerMotorTocado({ motor: 7, tope: 1, umbral: 0 });
    expect(m.motorTocado).toBeNull();
    const uno = AIRCRAFT.find((x) => x.motores === 1 && !x.helicoptero)!;
    const solo = new CoefficientFlightModel({ aircraft: uno, ground: () => 0, assist: TAGUATO.assists });
    solo.ponerMotorTocado({ motor: 0, tope: 1, umbral: 0 });
    expect(solo.motorTocado).toBeNull();
  });

  it("un vuelo nuevo empieza con los motores sin ave, y uno parado no petardea", () => {
    const { m } = subiendo(ARAI, { motor: 0, tope: 1, umbral: UMBRAL_RECIEN });
    expect(m.motorTocado).not.toBeNull();
    m.reset({ position: new Vector3(0, 400, 0), heading: 0, airspeed: 90 });
    expect(m.motorTocado).toBeNull();
    const parado = new CoefficientFlightModel({ aircraft: ARAI, ground: () => 0, assist: TAGUATO.assists });
    parado.reset({ position: new Vector3(0, 400, 0), heading: 0, airspeed: 90 });
    parado.pararMotor(0);
    for (let i = 0; i < 300; i++) {
      parado.ponerMotorTocado({ motor: 0, tope: 1, umbral: UMBRAL_RECIEN });
      parado.step(DT, { ...neutralControls(), throttle: 1 });
    }
    expect(parado.motorTocado!.estallidos).toBe(0);
  });

  it("y en el cuatrimotor, que no lo practica, también tira hacia su lado", () => {
    const r = subiendo(YVAGA, { motor: 0, tope: 1, umbral: UMBRAL_RECIEN }, {}, TAGUATO_RUVICHA.assists, 2);
    expect(r.rumbo).toBeLessThan(0);
  });
});

describe("la llamarada", () => {
  /** Un avión de mentira con sus dos motores en una malla, como los del taller. */
  function avion(): Group {
    const g = new Group();
    for (const x of [-4.4, 4.4]) {
      const geometria = new BoxGeometry(1.7, 1.7, 3.4);
      geometria.translate(x, -1, -1);
      const m = new Mesh(geometria, new MeshBasicMaterial());
      m.name = "motor";
      g.add(m);
    }
    return g;
  }

  it("se pone en el motor de ese lado, por la toma y por la tobera, y se apaga sola", () => {
    const g = avion();
    const n = nacelaDe(g, -1)!;
    expect(n.x).toBeCloseTo(-4.4, 3);
    expect(n.toma).toBeCloseTo(-2.7, 3);
    expect(n.tobera).toBeCloseTo(0.7, 3);
    expect(nacelaDe(g, 1)!.x).toBeCloseTo(4.4, 3);
    const l = new Llamarada();
    expect(l.grupo.visible).toBe(false);
    expect(l.encender(g, -1)).toBe(true);
    expect(l.grupo.visible).toBe(true);
    expect(l.grupo.children.map((c) => c.position.z)).toEqual([n.toma, n.tobera]);
    for (let t = 0; t < DURA_LA_LLAMARADA + 0.02; t += DT) l.paso(DT);
    expect(l.grupo.visible).toBe(false);
  });

  it("sin motor en el dibujo no hay llamarada, y no pasa nada", () => {
    const l = new Llamarada();
    expect(l.encender(new Group(), 1)).toBe(false);
    expect(l.grupo.visible).toBe(false);
  });
});
