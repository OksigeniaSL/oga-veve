/**
 * La mano que sostiene: la tecla pide un ritmo, el dedo un sitio, y lo
 * conseguido se queda al soltar. Ver `flight/mano.ts`.
 *
 * Dos capas, como en el piloto automático: las piezas sueltas —la consigna,
 * la curva del dedo— y el lazo cerrado, con la mano volando el modelo de
 * vuelo de verdad de toda la flota.
 */

import { describe, expect, it } from "vitest";
import {
  Consigna,
  INCLINACION_DEL_DEDO,
  INCLINACION_DEL_DEDO_PROTEGIDA,
  INCLINACION_PROTEGIDA,
  INCLINACION_TOPE,
  INCLINACION_TOPE_DEL_REACTOR,
  RAMPA_AL_APRETAR,
  TOQUE_DE_SENDA,
  ZONA_MUERTA_DEL_DEDO,
  curvaDelDedo,
  palancaDeLaCurva,
  ritmoDeAlabeoDeLaMano,
  ritmoDeSendaDeLaMano,
} from "./mano";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { GUYRAMI, TAGUATO, TAGUATO_RUVICHA, TUKA, type Tier } from "./tiers";
import { EN_GRADOS, empezar, volar, type Medida, type VueloDeBanco } from "./mano-banco";
import { airDensity, GRAVITY } from "./atmosphere";
import { empujeLleno } from "./fdm";

const RAD = Math.PI / 180;
const avion = (id: string): AircraftConfig => AIRCRAFT.find((a) => a.id === id)!;

/** Una velocidad de maniobra para cada avión, indicada, m/s. */
const maniobra = (a: AircraftConfig): number =>
  Math.min(a.cruiseSpeed * 0.7, a.approachSpeed * 1.9);

function ultima(v: VueloDeBanco, segundos: number, pide: Parameters<typeof volar>[2]): Medida {
  let m: Medida | null = null;
  volar(v, segundos, pide, (x) => (m = x));
  return m!;
}

function extremos(
  v: VueloDeBanco,
  segundos: number,
  pide: Parameters<typeof volar>[2],
): { min: Medida[]; max: number; minAlabeo: number; maxAlabeo: number; todas: Medida[] } {
  const todas: Medida[] = [];
  volar(v, segundos, pide, (m) => todas.push(m));
  return {
    min: todas,
    max: Math.max(...todas.map((m) => m.alabeo)),
    minAlabeo: Math.min(...todas.map((m) => Math.abs(m.alabeo))),
    maxAlabeo: Math.max(...todas.map((m) => Math.abs(m.alabeo))),
    todas,
  };
}

describe("la consigna", () => {
  it("apretando, el ritmo arranca despacio y llega entero en su rampa", () => {
    const c = new Consigna();
    c.mover(0.1, 1, 1, -10, 10);
    expect(c.ritmo).toBeLessThan(0.3);
    for (let t = 0.1; t < RAMPA_AL_APRETAR + 0.05; t += 0.01) c.mover(0.01, 1, 1, -10, 10);
    expect(c.ritmo).toBeCloseTo(1, 6);
  });

  it("soltando, se para sin golpe y se queda donde llegó", () => {
    const c = new Consigna();
    for (let t = 0; t < 2; t += 0.01) c.mover(0.01, 1, 1, -10, 10);
    const alSoltar = c.valor;
    for (let t = 0; t < 2; t += 0.01) c.mover(0.01, 0, 1, -10, 10);
    expect(c.ritmo).toBe(0);
    // Lo que recorre parándose es poco: la rampa, no otro tanto.
    expect(c.valor - alSoltar).toBeGreaterThan(0);
    expect(c.valor - alSoltar).toBeLessThan(0.3);
  });

  it("yendo a un sitio, llega y no se pasa", () => {
    const c = new Consigna();
    let mas = 0;
    for (let t = 0; t < 5; t += 1 / 60) {
      c.hacia(1 / 60, 0.5, 0.2, -1, 1);
      mas = Math.max(mas, c.valor);
    }
    expect(c.valor).toBeCloseTo(0.5, 6);
    expect(mas).toBeLessThanOrEqual(0.5 + 1e-9);
  });
});

describe("la curva del dedo", () => {
  it("en el centro no pide nada, y a fondo, todo", () => {
    expect(curvaDelDedo(0)).toBe(0);
    expect(curvaDelDedo(ZONA_MUERTA_DEL_DEDO * 0.9)).toBe(0);
    expect(curvaDelDedo(1)).toBeCloseTo(1, 9);
    expect(curvaDelDedo(-1)).toBeCloseTo(-1, 9);
  });

  it("es suave al principio: media palanca es bastante menos que medio mando", () => {
    expect(curvaDelDedo(0.5)).toBeLessThan(0.35);
    expect(curvaDelDedo(0.25)).toBeLessThan(0.12);
  });

  it("y su vuelta pinta la palanca donde la dejó el dedo", () => {
    for (const v of [-0.9, -0.4, 0.2, 0.55, 1])
      expect(palancaDeLaCurva(curvaDelDedo(v))).toBeCloseTo(v, 4);
  });
});

describe("los ritmos salen del avión", () => {
  it("el de línea alabea a pocos grados por segundo; la avioneta, más viva", () => {
    const ritmo = (id: string) => {
      const a = avion(id);
      return ritmoDeAlabeoDeLaMano(a, maniobra(a), 0) * EN_GRADOS;
    };
    expect(ritmo("jaz-120")).toBeLessThan(6);
    expect(ritmo("jaz-90")).toBeLessThan(8);
    expect(ritmo("jaz-20")).toBeGreaterThan(ritmo("jaz-90") * 1.8);
    expect(ritmo("jaz-20")).toBeLessThan(22);
  });

  it("despacio y con flaps, más lento", () => {
    const a = avion("jaz-90");
    const rapido = ritmoDeAlabeoDeLaMano(a, maniobra(a), 0);
    const final = ritmoDeAlabeoDeLaMano(a, a.approachSpeed, 1);
    expect(final).toBeLessThan(rapido * 0.85);
  });

  it("la trayectoria cambia con un cuarto de g, y deprisa es menos ángulo", () => {
    expect(ritmoDeSendaDeLaMano(150)).toBeLessThan(ritmoDeSendaDeLaMano(50));
    expect((ritmoDeSendaDeLaMano(150) * 150) / 9.80665).toBeCloseTo(0.25, 6);
  });
});

const PELDANOS: readonly Tier[] = [GUYRAMI, TUKA, TAGUATO, TAGUATO_RUVICHA];

describe("la inclinación que se deja, se queda", () => {
  for (const a of AIRCRAFT)
    for (const tier of PELDANOS)
      it(`${a.id} en ${tier.id}`, () => {
        const v = empezar(a, tier, maniobra(a));
        volar(v, 2.5, () => ({ teclaAlabeo: 1 }));
        // Se deja que la rampa de soltar acabe y se mira qué queda.
        const asentado = ultima(v, 1.5, () => ({})).alabeo;
        const luego = extremos(v, 10, () => ({}));
        expect(Math.abs(asentado) * EN_GRADOS, "se inclinó").toBeGreaterThan(5);
        for (const m of luego.todas)
          expect(Math.abs(m.alabeo - asentado) * EN_GRADOS, `a los ${m.t.toFixed(1)} s`).toBeLessThan(2.5);
      });
});

describe("la bajada que se deja, se queda", () => {
  /*
   * «Bajo muy de golpe: o bajo o subo.» En los peldaños con ayuda, soltar la
   * tecla bajando devolvía el avión a nivelado: el compensador automático
   * nunca sostenía un descenso. Ahora, lo que se suelta bajando sigue bajando
   * por la misma trayectoria.
   */
  /*
   * **Por tipo.** Con mandos eléctricos —y en el modelo sencillo, donde la
   * palanca compensada se queda con su trayectoria mientras el gas no cambie—,
   * lo que se suelta bajando sigue por la misma trayectoria. En un avión de
   * cables, suelto, lo que se sostiene es la velocidad: con el gas quitado
   * sigue bajando, a la velocidad a la que se soltó, por la trayectoria que da
   * ese gas. Tampoco vuelve a nivelado. Ver `sostieneLaVelocidad` en `mano.ts`.
   */
  for (const a of AIRCRAFT)
    for (const tier of PELDANOS)
      it(`${a.id} en ${tier.id}`, () => {
        const v = empezar(a, tier, maniobra(a));
        // Un poco de gas menos, que es como se baja sin acelerar.
        v.gas = Math.max(0, v.gas - 0.1);
        // Se aprieta hasta ir bajando unos dos grados y medio, y se suelta.
        volar(v, 8, () => ({
          teclaCabeceo: v.mano.cabeceo.activo && v.mano.cabeceo.consigna.valor < -2.5 * RAD ? 0 : -1,
        }));
        const asentado = ultima(v, 3, () => ({}));
        const gamma = (m: Medida, ias: number) => m.vertical / ias;
        const porVelocidad = tier.model !== "simple" && a.mandos === "convencionales";
        // Con la velocidad compensada, lo que baja es lo que da el gas quitado:
        // seis décimas de metro por segundo en la avioneta, que es poco.
        expect(asentado.vertical, "baja").toBeLessThan(porVelocidad ? -0.3 : -0.5);
        const compensada = v.mano.velocidadCompensada;
        if (porVelocidad) expect(compensada, "suelta, compensa la velocidad").not.toBeNull();
        let peor = 0;
        let lejos = 0;
        volar(v, porVelocidad ? 30 : 10, () => ({}), (m) => {
          peor = Math.max(peor, Math.abs(gamma(m, m.ias) - gamma(asentado, asentado.ias)));
          if (compensada !== null) lejos = Math.max(lejos, Math.abs(m.ias - compensada));
          expect(m.vertical, `a los ${m.t.toFixed(1)} s sigue bajando`).toBeLessThan(0);
        });
        if (porVelocidad) expect(lejos / 0.514444, "la velocidad se mantiene, kt").toBeLessThan(3);
        else expect(peor * EN_GRADOS, "la trayectoria se mantiene").toBeLessThan(1.2);
      });
});

describe("sin sacudidas", () => {
  it("apretando la tecla del cabeceo, nadie se levanta del asiento", () => {
    for (const a of AIRCRAFT)
      for (const tier of [TUKA, TAGUATO_RUVICHA]) {
        const v = empezar(a, tier, maniobra(a));
        let peor = 0;
        volar(v, 3, () => ({ teclaCabeceo: 1 }), (m) => (peor = Math.max(peor, Math.abs(m.carga - 1))));
        volar(v, 6, () => ({}), (m) => (peor = Math.max(peor, Math.abs(m.carga - 1))));
        expect(peor, `${a.id} en ${tier.id}`).toBeLessThan(0.45);
      }
  });

  it("y en un viraje sostenido no se pierde altura", () => {
    for (const a of AIRCRAFT) {
      const v = empezar(a, TAGUATO_RUVICHA, maniobra(a));
      // Más gas, que es lo que se pone para virar sin perder velocidad.
      v.gas = Math.min(1, v.gas + 0.1);
      const alto = v.modelo.state.position.y;
      const ias = v.modelo.state.airspeed;
      // Lo que sube de más con la décima de gas, `ΔT·V/W`. Ver abajo.
      const sobra =
        (0.1 * empujeLleno(a, airDensity(alto), ias) * ias) / (a.mass * GRAVITY);
      let peor = 0;
      let lejos = 0;
      // Un viraje normal, de unos treinta grados: se aprieta hasta ahí.
      volar(
        v,
        20,
        () => ({ teclaAlabeo: v.mano.alabeo.consigna.valor < 28 * RAD ? 1 : 0 }),
        (m) => {
          peor = Math.max(peor, Math.abs(m.vertical));
          lejos = Math.max(lejos, Math.abs(v.modelo.state.airspeed - ias));
        },
      );
      expect(Math.abs(v.mano.alabeo.consigna.valor) * EN_GRADOS, a.id).toBeGreaterThan(25);
      if (a.mandos === "electricos")
        expect(Math.abs(v.modelo.state.position.y - alto), a.id).toBeLessThan(30);
      else {
        /*
         * **En uno de cables, la velocidad**: suelto en un viraje, el avión
         * compensado sostiene la velocidad y no se mete en espiral —la de
         * antes de la mano bajaba cien metros por segundo—, y lo que suba es
         * lo que dé la décima de gas de más, `ΔT·V/W`: el JAZ 120, con sus
         * ochenta y dos kilonewtons de más, unos cuatro metros por segundo, y
         * algo más al asentarse, que es lo que se pasa un lazo amortiguado.
         * Ver `sostieneLaVelocidad` en `mano.ts`.
         */
        expect(peor, `${a.id}: V/S`).toBeLessThan(1.4 * sobra + 0.5);
        expect(lejos / 0.514444, `${a.id}: velocidad, kt`).toBeLessThan(5);
      }
    }
  });
});

describe("la protección de la inclinación", () => {
  it("en los peldaños de abajo no pasa de 33°, aunque se apriete todo el rato", () => {
    for (const id of ["jaz-20", "jaz-60", "jaz-90"])
      for (const tier of [GUYRAMI, TUKA]) {
        const v = empezar(avion(id), tier, maniobra(avion(id)));
        const r = extremos(v, 20, () => ({ teclaAlabeo: 1 }));
        expect(r.maxAlabeo * EN_GRADOS, `${id} en ${tier.id}`).toBeLessThan(
          (INCLINACION_PROTEGIDA + 2.5 * RAD) * EN_GRADOS,
        );
      }
  });

  it("el reactor llega hasta 67° apretando, y al soltar vuelve a 33° despacio", () => {
    const a = avion("jaz-90");
    const v = empezar(a, TAGUATO_RUVICHA, maniobra(a));
    v.gas = 1;
    const apretando = extremos(v, 25, () => ({ teclaAlabeo: 1 }));
    expect(apretando.maxAlabeo).toBeLessThan(INCLINACION_TOPE_DEL_REACTOR + 3 * RAD);
    expect(apretando.maxAlabeo).toBeGreaterThan(45 * RAD);
    const vuelve = extremos(v, 15, () => ({}));
    const fin = Math.abs(vuelve.todas.at(-1)!.alabeo);
    expect(fin * EN_GRADOS).toBeCloseTo(INCLINACION_PROTEGIDA * EN_GRADOS, -0.5);
    // Despacio: a su ritmo de mano, sin latigazo.
    let pico = 0;
    for (let i = 1; i < vuelve.todas.length; i++)
      pico = Math.max(pico, Math.abs(vuelve.todas[i]!.alabeo - vuelve.todas[i - 1]!.alabeo) * 60);
    expect(pico * EN_GRADOS).toBeLessThan(12);
  });

  it("la avioneta en los de arriba no está protegida, pero no pasa de 60°", () => {
    const a = avion("jaz-20");
    const v = empezar(a, TAGUATO_RUVICHA, maniobra(a));
    v.gas = 1;
    const r = extremos(v, 15, () => ({ teclaAlabeo: 1 }));
    expect(r.maxAlabeo).toBeLessThan(INCLINACION_TOPE + 3 * RAD);
    expect(r.maxAlabeo).toBeGreaterThan(45 * RAD);
    // Y soltada se queda donde estaba: no hay protección que la devuelva.
    const despues = ultima(v, 1.5, () => ({})).alabeo;
    const luego = ultima(v, 6, () => ({})).alabeo;
    expect(Math.abs(luego - despues) * EN_GRADOS).toBeLessThan(4);
  });
});

describe("y no lleva el avión a la pérdida", () => {
  it("soltada subiendo con el gas quitado, cede el morro antes que el avisador", () => {
    for (const a of AIRCRAFT) {
      const v = empezar(a, TAGUATO_RUVICHA, maniobra(a));
      volar(v, 3, () => ({ teclaCabeceo: 1 }));
      v.gas = 0;
      let canto = 0;
      volar(v, 40, () => ({}), () => {
        if (v.modelo.state.stallWarning) canto++;
      });
      expect(canto, a.id).toBe(0);
    }
  });
});

describe("el dedo", () => {
  it("la palanca puesta inclina hasta su sitio y se queda", () => {
    const a = avion("jaz-20");
    const v = empezar(a, TAGUATO_RUVICHA, maniobra(a));
    const fin = ultima(v, 8, (t) => (t === 0 ? { palanca: { x: 1, y: null } } : {}));
    expect(fin.alabeo * EN_GRADOS).toBeCloseTo(INCLINACION_DEL_DEDO * EN_GRADOS, -0.5);
    const luego = ultima(v, 6, () => ({}));
    expect(Math.abs(luego.alabeo - fin.alabeo) * EN_GRADOS).toBeLessThan(2);
    expect(v.mano.palanca().x).toBeCloseTo(1, 3);
  });

  it("en el reactor, protegida, la palanca a fondo es un viraje de treinta", () => {
    const a = avion("jaz-90");
    const v = empezar(a, TAGUATO_RUVICHA, maniobra(a));
    const fin = ultima(v, 15, (t) => (t === 0 ? { palanca: { x: -1, y: null } } : {}));
    expect(fin.alabeo * EN_GRADOS).toBeCloseTo(-INCLINACION_DEL_DEDO_PROTEGIDA * EN_GRADOS, -0.5);
  });

  it("subir el morro con el pulgar no cambia la inclinación: la sostiene", () => {
    const a = avion("jaz-60");
    const v = empezar(a, TAGUATO_RUVICHA, maniobra(a));
    volar(v, 1.5, () => ({ teclaAlabeo: 1 }));
    const inclinado = ultima(v, 2, () => ({})).alabeo;
    volar(v, 1, (t) => (t === 0 ? { palanca: { x: null, y: 0.6 } } : {}));
    const luego = ultima(v, 6, () => ({}));
    expect(v.mano.llevaCabeceo).toBe(true);
    expect(Math.abs(luego.alabeo - inclinado) * EN_GRADOS).toBeLessThan(2);
    expect(luego.vertical).toBeGreaterThan(0.5);
  });

  it("el doble toque deja el avión recto y nivelado, despacio", () => {
    const a = avion("jaz-60");
    const v = empezar(a, TAGUATO_RUVICHA, maniobra(a));
    v.gas = Math.min(1, v.gas + 0.15);
    volar(v, 10, (t) => (t === 0 ? { palanca: { x: 0.8, y: 0.7 } } : {}));
    expect(Math.abs(v.modelo.state.verticalSpeed)).toBeGreaterThan(1);
    const picos: number[] = [];
    const fin = ultima(v, 25, (t) => (t === 0 ? { centrar: true } : {}));
    volar(v, 0.1, () => ({}), (m) => picos.push(m.alabeo));
    expect(Math.abs(fin.alabeo) * EN_GRADOS).toBeLessThan(1.5);
    expect(Math.abs(fin.vertical)).toBeLessThan(0.6);
    expect(Math.abs(v.mano.palanca().x)).toBeLessThan(0.1);
    expect(Math.abs(v.mano.palanca().y)).toBeLessThan(0.1);
  });
});

describe("los toques cortos", () => {
  it("un toque de cabeceo sube la trayectoria medio grado, y se queda", () => {
    const a = avion("jaz-90");
    const v = empezar(a, TAGUATO_RUVICHA, maniobra(a));
    v.gas = Math.min(1, v.gas + 0.1);
    volar(v, 0.2, (t) => (t === 0 ? { toqueCabeceo: 1 } : {}));
    expect(v.mano.llevaCabeceo).toBe(true);
    expect(v.mano.cabeceo.meta).toBeCloseTo(TOQUE_DE_SENDA, 2);
  });
});
