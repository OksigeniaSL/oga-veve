/**
 * **El Super Puma, volado sin pantalla.** Lo que pide el issue #109 para dar el
 * modelo por bueno —estacionario estable y paso a crucero sin cosas raras— y lo
 * que la ficha publica y el modelo tiene que dar. Ver el ADR 0026.
 *
 * Las pruebas vuelan con pilotos de prueba sencillos: uno lleva el colectivo
 * para sostener la altura y otro el cíclico para la velocidad. No son quien
 * juega; son la forma de preguntar al modelo «¿y si se vuela así?».
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { airDensity } from "./atmosphere";
import {
  ModeloDeHelicoptero,
  mandosNeutros,
  potenciaDisponible,
  potenciaEnEstacionario,
  type Estabilizacion,
  type MandosDeHelicoptero,
} from "./helicoptero";
import { SUPER_PUMA as F } from "./super-puma";

const GRADO = Math.PI / 180;
const NUDO = 1852 / 3600;
const RPM = (2 * Math.PI) / 60;
const DT = 1 / 60;
const DESPEGUE = F.motores.cuantos * F.motores.potencia;

/** El techo en estacionario al peso máximo, m, con el buje a esa altura del suelo. */
function techo(alturaDelBuje: number): number {
  let bajo = 0;
  let alto = 8000;
  for (let i = 0; i < 40; i++) {
    const medio = (bajo + alto) / 2;
    const rho = airDensity(medio);
    if (potenciaEnEstacionario(F, F.masaMaxima, rho, alturaDelBuje) < potenciaDisponible(F, rho)) bajo = medio;
    else alto = medio;
  }
  return bajo;
}

/** Un helicóptero en el aire, con un piloto de prueba que lleva el colectivo para sostener `altura`. */
function enElAire(altura: number, modo: Estabilizacion, nudos = 0) {
  const h = new ModeloDeHelicoptero(F);
  h.ponerEstabilizacion(modo);
  h.reset({ position: new Vector3(0, altura, 0), heading: 0, airspeed: nudos * NUDO, rotorEnMarcha: true });
  const m: MandosDeHelicoptero = mandosNeutros();
  m.colectivo = 0.45;
  let integral = 0;
  const colectivo = (objetivo = altura): void => {
    const quiere = Math.max(-3, Math.min(3, 0.5 * (objetivo - h.state.position.y)));
    const falta = quiere - h.state.velocity.y;
    integral += falta * DT * 0.05;
    m.colectivo = Math.max(0, Math.min(1, 0.45 + integral + 0.08 * falta));
  };
  /** La velocidad hacia delante sobre el suelo, m/s: sin viento, la del aire. */
  const adelante = (): number => {
    const r = h.actitud().rumbo;
    return h.state.velocity.x * Math.sin(r) - h.state.velocity.z * Math.cos(r);
  };
  let cabeceoAprendido = 2;
  /** El cíclico para ir a `nudos`, en `actitud`: la actitud que lo da, y alas a nivel. */
  const ciclico = (nudosObjetivo: number): void => {
    const falta = nudosObjetivo * NUDO - adelante();
    cabeceoAprendido = Math.max(-15, Math.min(15, cabeceoAprendido - 0.15 * falta * DT));
    const quiere = (Math.max(-15, Math.min(12, cabeceoAprendido - 0.8 * falta)) * GRADO);
    const a = h.actitud();
    m.cabeceo = Math.max(-1, Math.min(1, (quiere - a.cabeceo) * 3));
    m.alabeo = Math.max(-1, Math.min(1, -a.alabeo * 3));
  };
  return { h, m, colectivo, ciclico, adelante };
}

describe("la ficha del Super Puma es la de la EASA y la de Airbus", () => {
  it("rotor, vueltas, peso y motores", () => {
    // TCDS R.002, número 18: III.4.2, III.4.3, III.9 y III.12.
    expect(F.rotor.radio * 2).toBeCloseTo(15.6, 2);
    expect(F.rotor.palas).toBe(4);
    expect(F.cola.radio * 2).toBeCloseTo(3.05, 2);
    expect(F.cola.palas).toBe(5);
    expect(F.rotor.vueltas / RPM).toBeCloseTo(265, 3);
    expect(F.masaMaxima).toBe(8600);
    // Airbus: dos Makila 1A1 de 1.357 kW al despegue.
    expect(F.motores.cuantos).toBe(2);
    expect(F.motores.potencia).toBe(1_357_000);
  });
});

describe("lo que puede sostener, contra lo que publica Airbus", () => {
  it("el techo fuera del efecto suelo, en los 2.300 m de la ficha: es con lo que se ajusta", () => {
    expect(techo(Infinity)).toBeGreaterThan(2250);
    expect(techo(Infinity)).toBeLessThan(2350);
  });

  it("y el de dentro, cerca de los 3.250 m, sin ajustar nada: con las ruedas a un metro del suelo", () => {
    // El disco va a 4,6 m del suelo posado; con las ruedas a un metro, a 5,6.
    const dentro = techo(5.6);
    expect(dentro).toBeGreaterThan(3050);
    expect(dentro).toBeLessThan(3450);
  });

  it("parado a nivel del mar y al peso máximo pide unas tres cuartas partes de la potencia de despegue", () => {
    const fraccion = potenciaEnEstacionario(F, F.masaMaxima, airDensity(0)) / DESPEGUE;
    expect(fraccion).toBeGreaterThan(0.6);
    expect(fraccion).toBeLessThan(0.85);
  });

  it("cerca del suelo pide menos: el efecto suelo", () => {
    const lejos = potenciaEnEstacionario(F, F.masaMaxima, airDensity(0));
    const cerca = potenciaEnEstacionario(F, F.masaMaxima, airDensity(0), 5.6);
    expect(cerca).toBeLessThan(0.92 * lejos);
  });
});

describe("estacionario", () => {
  it("volado, pide lo mismo que la cuenta sin volarlo", () => {
    const { h, m, colectivo } = enElAire(60, "estacionario");
    for (let t = 0; t < 40; t += DT) {
      colectivo();
      h.step(DT, m);
    }
    const cuenta = potenciaEnEstacionario(F, F.masaMaxima, airDensity(60));
    expect(Math.abs(h.rotor().potenciaMotores / cuenta - 1)).toBeLessThan(0.03);
    expect(h.rotor().vueltasPorUno).toBeCloseTo(1, 2);
  });

  it("con su estabilización se queda quieto: sin deriva, sin girar y con la actitud firme", () => {
    const { h, m, colectivo } = enElAire(60, "estacionario");
    for (let t = 0; t < 30; t += DT) {
      colectivo();
      h.step(DT, m);
    }
    const antes = h.actitud();
    let peor = 0;
    for (let t = 0; t < 30; t += DT) {
      colectivo();
      h.step(DT, m);
      const a = h.actitud();
      peor = Math.max(peor, Math.abs(a.cabeceo - antes.cabeceo), Math.abs(a.alabeo - antes.alabeo));
    }
    expect(h.state.groundSpeed).toBeLessThan(0.5);
    expect(peor).toBeLessThan(1 * GRADO);
    expect(Math.abs(h.actitud().rumbo - antes.rumbo)).toBeLessThan(2 * GRADO);
    expect(Math.abs(h.state.position.y - 60)).toBeLessThan(1);
    // Cuelga con el lado derecho un poco bajo: el rotor de cola empuja a la izquierda y
    // el disco se inclina para pararlo. Es como cuelga un helicóptero de rotor horario.
    expect(h.actitud().alabeo).toBeGreaterThan(0.5 * GRADO);
    expect(h.actitud().alabeo).toBeLessThan(5 * GRADO);
  });

  /**
   * **Por qué hace falta la estabilización**: un helicóptero sin ella, en
   * estacionario, es inestable. Con un empujón de 3 °/s en cabeceo y la palanca
   * quieta en su sitio, se va: es la oscilación que crece de cualquier
   * helicóptero sin aumentación. Amortiguado se queda; con la actitud, vuelve.
   */
  it("sin estabilización se va; amortiguado se queda, y con la actitud vuelve", () => {
    const peorTras = (modo: Estabilizacion): { peor: number; final: number } => {
      const { h, m, colectivo } = enElAire(60, "estacionario");
      for (let t = 0; t < 40; t += DT) {
        colectivo();
        h.step(DT, m);
      }
      const equilibrio = h.actitud();
      const sostenido = h.mandosAhora();
      h.ponerEstabilizacion(modo);
      // Quien vuela deja el cíclico y los pies donde estaban, salvo con la actitud, que los suelta.
      const quieto: MandosDeHelicoptero =
        modo === "actitud" ? { ...m } : { ...m, cabeceo: sostenido.cabeceo, alabeo: sostenido.alabeo, pedales: sostenido.pedales };
      h.state.pitchRate += 3 * GRADO;
      let peor = 0;
      let final = 0;
      for (let t = 0; t < 20; t += DT) {
        h.step(DT, quieto);
        const a = h.actitud();
        final = Math.max(Math.abs(a.cabeceo - equilibrio.cabeceo), Math.abs(a.alabeo - equilibrio.alabeo));
        peor = Math.max(peor, final);
      }
      return { peor, final };
    };
    expect(peorTras("ninguna").peor).toBeGreaterThan(10 * GRADO);
    expect(peorTras("amortiguada").peor).toBeLessThan(10 * GRADO);
    const actitud = peorTras("actitud");
    expect(actitud.peor).toBeLessThan(2 * GRADO);
    expect(actitud.final).toBeLessThan(0.5 * GRADO);
  });

  it("al dar potencia sin pisar, el morro se va a la izquierda: el rotor gira en horario", () => {
    const { h, m, colectivo } = enElAire(60, "estacionario");
    for (let t = 0; t < 40; t += DT) {
      colectivo();
      h.step(DT, m);
    }
    const e = h.mandosAhora();
    h.ponerEstabilizacion("ninguna");
    const mas = { ...m, cabeceo: e.cabeceo, alabeo: e.alabeo, pedales: e.pedales, colectivo: m.colectivo + 0.15 };
    for (let t = 0; t < 2; t += DT) h.step(DT, mas);
    expect(h.state.yawRate).toBeLessThan(-10 * GRADO);
    // Y el pedal derecho lo para.
    const conPie = { ...mas, pedales: 1 };
    for (let t = 0; t < 3; t += DT) h.step(DT, conPie);
    expect(h.state.yawRate).toBeGreaterThan(0);
  });

  it("por encima del techo, pidiendo más de lo que hay, caen las vueltas y se hunde", () => {
    const { h, m, colectivo } = enElAire(3500, "estacionario");
    for (let t = 0; t < 40; t += DT) {
      colectivo();
      h.step(DT, m);
    }
    // Por debajo del mínimo con motor de la ficha, 245 rpm (TCDS III.9).
    expect(h.rotor().vueltas / RPM).toBeLessThan(245);
    expect(h.state.position.y).toBeLessThan(3450);
  });
});

describe("de estacionario a crucero", () => {
  it("acelera hasta los 136 kt del crucero de Airbus sin cosas raras", () => {
    const { h, m, colectivo, ciclico, adelante } = enElAire(150, "actitud");
    let peorAlabeo = 0;
    let cabeceoMin = 0;
    let cabeceoMax = 0;
    let vueltasMin = Infinity;
    let vueltasMax = 0;
    let alturaPeor = 0;
    for (let t = 0; t < 150; t += DT) {
      colectivo();
      ciclico(Math.min(136, t * 2));
      h.step(DT, m);
      if (t < 5) continue;
      const a = h.actitud();
      peorAlabeo = Math.max(peorAlabeo, Math.abs(a.alabeo));
      cabeceoMin = Math.min(cabeceoMin, a.cabeceo);
      cabeceoMax = Math.max(cabeceoMax, a.cabeceo);
      vueltasMin = Math.min(vueltasMin, h.rotor().vueltas);
      vueltasMax = Math.max(vueltasMax, h.rotor().vueltas);
      alturaPeor = Math.max(alturaPeor, Math.abs(h.state.position.y - 150));
    }
    expect(adelante() / NUDO).toBeGreaterThan(130);
    expect(alturaPeor).toBeLessThan(25);
    expect(peorAlabeo).toBeLessThan(6 * GRADO);
    expect(cabeceoMin).toBeGreaterThan(-15 * GRADO);
    expect(cabeceoMax).toBeLessThan(12 * GRADO);
    // Las vueltas, dentro de las de motor de la ficha: 245 a 275 rpm.
    expect(vueltasMin / RPM).toBeGreaterThan(245);
    expect(vueltasMax / RPM).toBeLessThan(275);
    // Y en crucero con el morro un poco abajo, como va un helicóptero deprisa.
    expect(h.actitud().cabeceo).toBeLessThan(0);
    expect(h.actitud().cabeceo).toBeGreaterThan(-6 * GRADO);
    expect(h.rotor().potenciaMotores).toBeLessThan(h.rotor().potenciaDisponible);
  });

  /**
   * **La curva de la potencia**: parado se gasta mucho, a media velocidad mucho
   * menos —el disco coge aire nuevo y no el que él mismo ha echado abajo— y
   * deprisa vuelve a subir por la resistencia. Con lo que publica Airbus: 4 h 25
   * min de autonomía y 866 km de alcance con el mismo combustible; si el alcance
   * se vuela a 136 kt, ahí se gasta un 29 % más que en el mínimo.
   */
  it("la potencia baja con la velocidad hasta un mínimo y vuelve a subir", () => {
    const nivelado = (nudos: number): number => {
      const { h, m, colectivo, ciclico } = enElAire(300, "actitud", nudos);
      let suma = 0;
      let n = 0;
      for (let t = 0; t < 90; t += DT) {
        colectivo();
        ciclico(nudos);
        h.step(DT, m);
        if (t > 70) {
          suma += h.rotor().potenciaMotores;
          n++;
        }
      }
      return suma / n;
    };
    const parado = potenciaEnEstacionario(F, F.masaMaxima, airDensity(300));
    const curva = [40, 60, 70, 80, 100, 120, 136].map((v) => ({ v, p: nivelado(v) }));
    const minimo = curva.reduce((a, b) => (b.p < a.p ? b : a));
    expect(minimo.v).toBeGreaterThanOrEqual(60);
    expect(minimo.v).toBeLessThanOrEqual(100);
    expect(minimo.p).toBeLessThan(0.6 * parado);
    const crucero = curva.at(-1)!.p;
    expect(crucero / minimo.p).toBeGreaterThan(1.15);
    expect(crucero / minimo.p).toBeLessThan(1.55);
    expect(crucero).toBeLessThan(parado);
  });
});

describe("sin motor", () => {
  it("en autorrotación las vueltas se quedan en las de la ficha sin motor y baja a su ritmo", () => {
    const { h, m, ciclico } = enElAire(3000, "actitud", 70);
    m.motores = false;
    m.colectivo = 0;
    let suma = 0;
    let n = 0;
    for (let t = 0; t < 60; t += DT) {
      ciclico(70);
      h.step(DT, m);
      if (t > 40) {
        suma += h.state.velocity.y;
        n++;
      }
    }
    // Sin motor, de 220 a 290 rpm por debajo de 100 kt (TCDS III.9).
    expect(h.rotor().vueltas / RPM).toBeGreaterThan(220);
    expect(h.rotor().vueltas / RPM).toBeLessThan(290);
    // Bajando entre 8 y 16 m/s, que son de 1.600 a 3.100 pies por minuto.
    expect(suma / n).toBeLessThan(-8);
    expect(suma / n).toBeGreaterThan(-16);
  });
});

describe("en el suelo", () => {
  it("posado con el rotor girando y el freno puesto, quieto; y despega antes de lo que pide lejos del suelo", () => {
    const h = new ModeloDeHelicoptero(F);
    h.ponerEstabilizacion("estacionario");
    h.reset({ position: new Vector3(0, 0, 0), heading: 0, rotorEnMarcha: true });
    const m = mandosNeutros();
    m.frenos = 1;
    for (let t = 0; t < 10; t += DT) h.step(DT, m);
    expect(h.state.onGround).toBe(true);
    expect(Math.hypot(h.state.position.x, h.state.position.z)).toBeLessThan(0.05);
    let despega = -1;
    for (let t = 0; t < 20; t += DT) {
      m.colectivo = Math.min(0.6, t * 0.05);
      h.step(DT, m);
      if (despega < 0 && !h.state.onGround) despega = m.colectivo;
    }
    expect(h.state.position.y).toBeGreaterThan(10);
    // El colectivo del estacionario lejos del suelo, medido volándolo.
    const lejos = enElAire(60, "estacionario");
    for (let t = 0; t < 40; t += DT) {
      lejos.colectivo();
      lejos.h.step(DT, lejos.m);
    }
    expect(despega).toBeGreaterThan(0.5 * lejos.m.colectivo);
    expect(despega).toBeLessThan(lejos.m.colectivo);
  });
});

describe("arrancar, parar y rodar", () => {
  /** Posado en el suelo, con el rotor parado o girando. */
  const posado = (rotorEnMarcha: boolean, modo: Estabilizacion = "estacionario") => {
    const h = new ModeloDeHelicoptero(F);
    h.ponerEstabilizacion(modo);
    h.reset({ position: new Vector3(0, 0, 0), heading: 0, rotorEnMarcha });
    const m = mandosNeutros();
    m.motores = rotorEnMarcha;
    m.frenos = 1;
    return { h, m };
  };

  it("arranca en frío: el rotor coge vueltas cuando los motores dan potencia, y sin despegar", () => {
    const { h, m } = posado(false);
    m.motores = true;
    let llega = -1;
    for (let t = 0; t < 120; t += DT) {
      h.step(DT, m);
      expect(h.state.onGround).toBe(true);
      if (llega < 0 && h.rotor().vueltasPorUno >= 0.98) llega = t;
    }
    // Los motores no dan nada en la primera mitad de su arranque, quince segundos.
    expect(llega).toBeGreaterThan(15);
    expect(llega).toBeLessThan(90);
    expect(Math.abs(h.rotor().vueltasPorUno - 1)).toBeLessThan(0.01);
  });

  it("con el freno del rotor puesto, los motores arrancan y el rotor no gira; al quitarlo, sí", () => {
    const { h, m } = posado(false);
    m.motores = true;
    m.frenoDelRotor = true;
    for (let t = 0; t < 60; t += DT) h.step(DT, m);
    expect(h.rotor().arranque).toBe(1);
    expect(h.rotor().vueltasPorUno).toBeLessThan(0.02);
    m.frenoDelRotor = false;
    for (let t = 0; t < 60; t += DT) h.step(DT, m);
    expect(h.rotor().vueltasPorUno).toBeGreaterThan(0.98);
  });

  it("al parar los motores, el rotor sigue girando solo; el freno no se pone deprisa, y despacio lo para", () => {
    const { h, m } = posado(true);
    m.motores = false;
    m.frenoDelRotor = true;
    for (let t = 0; t < 5; t += DT) h.step(DT, m);
    // Por encima del 40 % de las vueltas el freno no entra: se quemaría.
    expect(h.rotor().frenoDelRotor).toBe(false);
    m.frenoDelRotor = false;
    for (let t = 0; t < 15; t += DT) h.step(DT, m);
    const aLos20 = h.rotor().vueltasPorUno;
    expect(aLos20).toBeGreaterThan(0.4);
    expect(aLos20).toBeLessThan(0.9);
    let t = 0;
    while (h.rotor().vueltasPorUno > 0.39 && t < 300) {
      h.step(DT, m);
      t += DT;
    }
    m.frenoDelRotor = true;
    for (let k = 0; k < 30; k += DT) h.step(DT, m);
    expect(h.rotor().frenoDelRotor).toBe(true);
    expect(h.rotor().vueltasPorUno).toBeLessThan(0.01);
  });

  it("rueda con un poco de colectivo y el cíclico adelante, gira con los pies y para con el freno", () => {
    const { h, m } = posado(true, "actitud");
    m.frenos = 0;
    m.colectivo = 0.15;
    m.cabeceo = -0.25;
    for (let t = 0; t < 10; t += DT) h.step(DT, m);
    expect(h.state.onGround).toBe(true);
    // A paso de rodaje: de unos pocos nudos a quince.
    expect(h.state.groundSpeed).toBeGreaterThan(1);
    expect(h.state.groundSpeed).toBeLessThan(8);
    const rumbo = h.actitud().rumbo;
    m.pedales = 0.5;
    for (let t = 0; t < 5; t += DT) h.step(DT, m);
    // A la derecha: la rueda de morro se orienta sola y el rotor de cola gira el helicóptero.
    expect(h.actitud().rumbo - rumbo).toBeGreaterThan(10 * GRADO);
    m.pedales = 0;
    m.cabeceo = 0;
    m.colectivo = 0;
    m.frenos = 1;
    for (let t = 0; t < 10; t += DT) h.step(DT, m);
    expect(h.state.groundSpeed).toBeLessThan(0.3);
  });

  /**
   * **El vuelco dinámico**, que es real y se enseña en cualquier curso: el rotor de
   * cola empuja a un lado, el helicóptero que se aligera pivota sobre la rueda de ese
   * lado y, sin cíclico en contra, vuelca. La estabilización lo para.
   */
  it("sin estabilización, despegar sin cíclico en contra lo vuelca; con ella, sube derecho", () => {
    const despega = (modo: Estabilizacion): number => {
      const { h, m } = posado(true, modo);
      for (let t = 0; t < 5; t += DT) h.step(DT, m);
      let peor = 0;
      for (let t = 0; t < 15; t += DT) {
        m.colectivo = Math.min(0.6, t * 0.05);
        h.step(DT, m);
        peor = Math.max(peor, Math.abs(h.actitud().alabeo));
      }
      return peor;
    };
    expect(despega("ninguna")).toBeGreaterThan(30 * GRADO);
    expect(despega("estacionario")).toBeLessThan(10 * GRADO);
  });
});

