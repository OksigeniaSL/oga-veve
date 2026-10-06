/**
 * **Un motor parado, en el modelo de vuelo**: que se vuela con uno, que se
 * para en la pista antes de V1 y que sin ninguno se planea.
 *
 * No miden cuentas sueltas —eso lo hace `velocidades-de-despegue.ts` con sus
 * fórmulas—: miden **el avión**. Un piloto de prueba muy simple lleva el
 * modelo de coeficientes sin ninguna ayuda, como en el peldaño de cabina, y
 * se mira lo que sale. Si la cuenta de la Vmc dijera una cosa y el timón del
 * modelo hiciera otra, o si la V1 prometiera una parada que el avión no hace,
 * saltaría aquí.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT, ARAI, PYKASU, type AircraftConfig } from "./aircraft";
import { NO_ASSISTS } from "./assists";
import { neutralControls, type ControlInputs } from "./model";
import { motorCritico, parDeLosMotores } from "./motores";
import {
  conUnMotor,
  velocidadesDeDespegue,
  vmc,
} from "./velocidades-de-despegue";
import { pistaQueNecesita as lasDosPistas } from "./carrera";

/**
 * La pista más corta que se le deja a este avión: la mayor de la de despegar
 * y la de aterrizar, cada una con el margen de su norma. Ver el ADR 0019.
 */
function pistaQueNecesita(a: AircraftConfig): number {
  const p = lasDosPistas(a);
  return Math.max(p.despegar, p.aterrizar);
}
import { planeoDe } from "./sin-motor";

const LLANO = () => 0;
const DT = 1 / 120;

function modelo(a: AircraftConfig): CoefficientFlightModel {
  return new CoefficientFlightModel({
    aircraft: a,
    ground: LLANO,
    assist: NO_ASSISTS,
  });
}

/** Alabeo y cabeceo del avión, rad, como los mide el modelo. */
function actitud(m: CoefficientFlightModel): { alabeo: number; cabeceo: number } {
  const q = m.state.orientation;
  const adelante = new Vector3(0, 0, -1).applyQuaternion(q);
  const derecha = new Vector3(1, 0, 0).applyQuaternion(q);
  const abajo = new Vector3(0, -1, 0).applyQuaternion(q);
  return {
    alabeo: Math.atan2(-derecha.y, -abajo.y),
    cabeceo: Math.asin(Math.max(-1, Math.min(1, adelante.y))),
  };
}

const diferencia = (a: number, b: number): number => {
  let e = a - b;
  while (e > Math.PI) e -= 2 * Math.PI;
  while (e < -Math.PI) e += 2 * Math.PI;
  return e;
};

const BIMOTORES = AIRCRAFT.filter((a) => a.motores > 1);

/**
 * **Sostener una velocidad con el timón de profundidad**, como lo hace un
 * piloto: la velocidad pide una actitud y la actitud se sostiene con el mando.
 * Perseguir la velocidad con el mando a secas es una fugoide —el primer
 * intento de estas pruebas subía y bajaba cien metros cada veinte segundos—;
 * en dos lazos, el de fuera lento y el de dentro rápido, se queda quieta.
 */
function sostenerVelocidad(
  m: CoefficientFlightModel,
  velocidad: number,
): (dt: number) => number {
  let lenta = 0;
  let deActitud = 0;
  return (dt: number) => {
    const s = m.state;
    const error = s.airspeed - velocidad;
    lenta = Math.max(-0.3, Math.min(0.3, lenta + 0.004 * error * dt));
    const quiere = Math.max(-0.4, Math.min(0.4, 0.02 * error + lenta));
    const falta = quiere - actitud(m).cabeceo;
    deActitud = Math.max(-0.5, Math.min(0.5, deActitud + 0.8 * falta * dt));
    return Math.max(-1, Math.min(1, 2.5 * falta - 1.2 * s.pitchRate + deActitud));
  };
}

describe("dónde van los motores: lo mismo en la ficha que en el modelo", () => {
  /*
   * El `.py` de cada avión es quien los dibuja, y la ficha quien los vuela:
   * si un día dicen cosas distintas, el motor que se ve parado está a un
   * metro del que tuerce. Se lee el guion en vez del `.glb` porque ahí está el
   * número con su nombre.
   */
  const fs = (
    globalThis as unknown as {
      process: { getBuiltinModule(nombre: string): unknown };
    }
  ).process.getBuiltinModule("node:fs") as {
    readFileSync(ruta: string, cod: string): string;
    readdirSync(ruta: string): string[];
  };
  const guion = (id: string): string => {
    const f = fs.readdirSync("modelos").find((n) => n.startsWith(`${id}-`));
    if (!f) throw new Error(`sin modelo para ${id}`);
    return fs.readFileSync(`modelos/${f}`, "utf8");
  };
  const numero = (texto: string, nombre: string): number[] => {
    const m = new RegExp(`^${nombre}\\s*=\\s*\\(?([0-9., ]+)\\)?`, "m").exec(
      texto,
    );
    if (!m) throw new Error(`sin ${nombre}`);
    return m[1]!
      .split(",")
      .map((x) => Number(x.trim()))
      .filter(Number.isFinite);
  };

  for (const a of BIMOTORES) {
    it(`${a.id}: a la distancia del eje que dibuja su modelo`, () => {
      const texto = guion(a.id);
      const deFuera = a.motoresA.filter((y) => y > 0).sort((x, y) => x - y);
      const dibujo = /^MOTORES\s*=/m.test(texto)
        ? numero(texto, "MOTORES")
        : /^MOTOR\s*=/m.test(texto)
          ? numero(texto, "MOTOR")
          : numero(texto, "QUIEBRO");
      expect(deFuera).toEqual(dibujo);
      // Y simétricos: el de la izquierda, en el espejo del de la derecha.
      const izquierda = a.motoresA
        .filter((y) => y < 0)
        .map((y) => -y)
        .sort((x, y) => x - y);
      expect(izquierda).toEqual(deFuera);
    });
  }

  it("con todos en marcha los pares se anulan", () => {
    for (const a of AIRCRAFT) {
      const todos = a.motoresA.map(() => "marcha" as const);
      expect(Math.abs(parDeLosMotores(a, todos, 10000, 3000))).toBeLessThan(
        1e-6,
      );
    }
  });
});

describe("las velocidades de un despegue con un motor de menos", () => {
  for (const a of BIMOTORES) {
    const pista = pistaQueNecesita(a);
    const v = velocidadesDeDespegue(a, pista);
    it(`${a.id}: la Vmc, por debajo de V1, y V1 ≤ Vr ≤ V2`, () => {
      expect(v.vmc).not.toBeNull();
      expect(v.v1).not.toBeNull();
      // CS-25.107: V1 no menor que la Vmc en tierra; Vr no menor que V1.
      expect(v.v1!).toBeGreaterThanOrEqual(v.vmc!);
      expect(v.vr).toBeGreaterThanOrEqual(v.v1!);
      expect(v.v2).toBeGreaterThanOrEqual(v.vr);
      // Y la V2, con su margen de un diez por ciento sobre la Vmc.
      expect(v.v2).toBeGreaterThanOrEqual(v.vmc! * 1.1 - 1e-9);
    });
  }

  it("en una pista corta la V1 baja, y con calor también", () => {
    const larga = velocidadesDeDespegue(ARAI, 3400);
    const justa = velocidadesDeDespegue(ARAI, pistaQueNecesita(ARAI));
    expect(justa.v1!).toBeLessThan(larga.v1!);
    // Con un 8 % menos de aire —una tarde de calor— cabe parar desde menos.
    const caliente = velocidadesDeDespegue(
      ARAI,
      pistaQueNecesita(ARAI),
      1.225 * 0.92,
    );
    expect(caliente.v1Maxima).toBeLessThan(justa.v1Maxima);
  });
});

/**
 * Un piloto de prueba que sostiene una velocidad con el timón de profundidad,
 * las alas con el alerón y el rumbo con el timón de dirección. El timón lleva
 * por delante el par que dice la cuenta —como el pie de un piloto que sabe qué
 * motor se ha parado— y corrige lo que falte mirando el rumbo y el derrape.
 */
function pilotoConUnMotor(
  m: CoefficientFlightModel,
  a: AircraftConfig,
  velocidad: number,
  rumbo: number,
): { mandos: ControlInputs; paso: (dt: number) => void } {
  const mandos: ControlInputs = {
    ...neutralControls(),
    throttle: 1,
    tren: 0,
    flaps: 0,
  };
  const profundidad = sostenerVelocidad(m, velocidad);
  let integralRumbo = 0;
  return {
    mandos,
    paso: (dt: number) => {
      const s = m.state;
      const q = 0.5 * 1.225 * s.airspeed * s.airspeed;
      const n = a.motoresA.length;
      const cadaUno = s.airspeed > 0 ? m.empujeAhora() / Math.max(1, n - 1) : 0;
      const par = parDeLosMotores(a, m.motoresAhora(), cadaUno, q);
      const deLaCuenta = -par / (q * a.wingArea * a.wingSpan * a.aero.cnRudder);
      const errorRumbo = diferencia(s.heading, rumbo);
      integralRumbo += errorRumbo * dt;
      mandos.rudder = Math.max(
        -1,
        Math.min(
          1,
          deLaCuenta - 2 * errorRumbo - 0.4 * integralRumbo + 3 * s.beta,
        ),
      );
      const { alabeo } = actitud(m);
      mandos.aileron = Math.max(
        -1,
        Math.min(1, -2.5 * alabeo - 0.6 * s.rollRate),
      );
      mandos.elevator = profundidad(dt);
    },
  };
}

describe("con un motor parado, el avión vuela y sube", () => {
  for (const a of BIMOTORES) {
    it(`${a.id}: a su ${conUnMotor(a).nombre}, con el timón que haga falta`, () => {
      const m = modelo(a);
      const objetivo = conUnMotor(a).velocidad;
      m.reset({
        position: new Vector3(0, 600, 0),
        heading: 0,
        airspeed: objetivo,
      });
      const k = motorCritico(a);
      m.pararMotor(k);
      const piloto = pilotoConUnMotor(m, a, objetivo, 0);
      const pasos = (s: number) => Math.round(s / DT);
      let asegurado = false;
      let subida = 0;
      let muestras = 0;
      let timon = 0;
      let lento = Infinity;
      for (let i = 0; i < pasos(120); i++) {
        const t = i * DT;
        // El motor parado, asegurado: la hélice en bandera si la tiene.
        if (!asegurado && t > 4) {
          m.asegurarMotor(k);
          asegurado = true;
        }
        piloto.paso(DT);
        m.step(DT, piloto.mandos);
        if (t > 60) {
          subida += m.state.verticalSpeed;
          timon += Math.abs(piloto.mandos.rudder);
          muestras++;
          lento = Math.min(lento, m.state.airspeed);
        }
      }
      const media = subida / muestras;
      // Sube, poco o mucho según el avión, y no se ha caído ni ha virado.
      expect(media).toBeGreaterThan(0.3);
      expect(Math.abs(diferencia(m.state.heading, 0))).toBeLessThan(
        (5 * Math.PI) / 180,
      );
      expect(m.state.crashed).toBe(false);
      // A su velocidad, y por encima de la Vmc.
      expect(Math.abs(m.state.airspeed - objetivo)).toBeLessThan(objetivo * 0.06);
      expect(lento).toBeGreaterThan(vmc(a)!);
      // Con el timón que hace falta, que no es todo: queda margen.
      expect(timon / muestras).toBeGreaterThan(0.05);
      expect(timon / muestras).toBeLessThan(0.95);
    });
  }

  it("y en la Vmc hace falta el timón entero: la cuenta y el avión dicen lo mismo", () => {
    for (const a of BIMOTORES) {
      const v = vmc(a)!;
      const m = modelo(a);
      // A ras del mar, que es donde se calcula: arriba el motor da menos.
      m.reset({ position: new Vector3(0, 40, 0), heading: 0, airspeed: v });
      m.pararMotor(motorCritico(a));
      // Como lo pide la norma: el parado en molinete, o en bandera si el avión
      // la pone solo.
      if (a.motorParado.autoBandera) m.asegurarMotor(motorCritico(a));
      const q = 0.5 * 1.225 * v * v;
      const n = a.motoresA.length;
      m.step(DT, { ...neutralControls(), throttle: 1, tren: 0 });
      const cadaUno = m.empujeAhora() / (n - 1);
      const par = parDeLosMotores(a, m.motoresAhora(), cadaUno, q);
      const hace = -par / (q * a.wingArea * a.wingSpan * a.aero.cnRudder);
      expect(hace).toBeGreaterThan(0.97);
      expect(hace).toBeLessThan(1.03);
    }
  });
});

describe("antes de V1 se para, y cabe en la pista", () => {
  for (const a of BIMOTORES) {
    it(`${a.id}: en la pista más corta que se le deja`, () => {
      const pista = pistaQueNecesita(a);
      const v1 = velocidadesDeDespegue(a, pista).v1!;
      const m = modelo(a);
      m.reset({
        position: new Vector3(0, a.gearHeight, 0),
        heading: 0,
        airspeed: 0,
      });
      m.setOnRunway(true);
      const k = motorCritico(a);
      const mandos: ControlInputs = { ...neutralControls(), throttle: 1 };
      let fallo = -1;
      let t = 0;
      let antes = 0;
      while (t < 180) {
        const s = m.state;
        /*
         * Como lo cuenta la norma: el motor falla un segundo antes de V1 —lo
         * que se tarda en darse cuenta— y en V1 empiezan los gestos. La cuenta
         * de la V1 le da además dos segundos corriendo a V1 que aquí no se
         * gastan: ése es el margen.
         */
        const acelera = (s.airspeed - antes) / DT;
        antes = s.airspeed;
        if (fallo < 0 && s.airspeed + acelera * 1 >= v1) {
          m.pararMotor(k);
          fallo = t;
        }
        // Todo atrás y el freno a fondo. Sin reversa: cabe sin ella.
        if (fallo >= 0 && t - fallo >= 1) {
          mandos.throttle = 0;
          mandos.brakes = 1;
        }
        // Recto por el eje con la rueda de morro y el timón.
        const lado = s.position.x;
        mandos.aileron = Math.max(-1, Math.min(1, -0.05 * lado - 2 * diferencia(s.heading, 0)));
        mandos.rudder = mandos.aileron;
        m.step(DT, mandos);
        t += DT;
        if (fallo >= 0 && s.groundSpeed < 0.3) break;
      }
      const recorrido = -m.state.position.z;
      expect(fallo).toBeGreaterThan(0);
      expect(m.state.onGround).toBe(true);
      expect(recorrido).toBeLessThanOrEqual(pista);
      expect(Math.abs(m.state.position.x)).toBeLessThan(20);
    });
  }
});

describe("sin motores se planea a la velocidad de mejor planeo", () => {
  /**
   * La fineza que se mide sosteniendo una velocidad: metros avanzados por
   * metro bajado, en un minuto de planeo recto con el motor quitado.
   */
  function fineza(a: AircraftConfig, velocidad: number): number {
    const m = modelo(a);
    m.reset({ position: new Vector3(0, 3000, 0), heading: 0, airspeed: velocidad });
    const mandos: ControlInputs = {
      ...neutralControls(),
      engineOn: false,
      tren: a.trenRetractil ? 0 : 1,
    };
    const profundidad = sostenerVelocidad(m, velocidad);
    const volar = (s: number, medir: boolean) => {
      const inicio = m.state.position.clone();
      for (let i = 0; i < Math.round(s / DT); i++) {
        mandos.elevator = profundidad(DT);
        mandos.aileron = Math.max(-1, Math.min(1, -2.5 * actitud(m).alabeo));
        m.step(DT, mandos);
      }
      if (!medir) return 0;
      const fin = m.state.position;
      const avanza = Math.hypot(fin.x - inicio.x, fin.z - inicio.z);
      return avanza / Math.max(1e-6, inicio.y - fin.y);
    };
    volar(40, false);
    return volar(60, true);
  }

  for (const a of [PYKASU, ARAI]) {
    it(`${a.id}: la mejor fineza es la de su polar, y a su velocidad`, () => {
      const planeo = planeoDe(a);
      const alli = fineza(a, planeo.velocidad);
      expect(alli).toBeGreaterThan(planeo.fineza * 0.85);
      expect(alli).toBeLessThan(planeo.fineza * 1.15);
      // Más despacio o más deprisa se llega menos lejos.
      expect(fineza(a, planeo.velocidad * 0.8)).toBeLessThan(alli);
      expect(fineza(a, planeo.velocidad * 1.35)).toBeLessThan(alli);
    });
  }
});
