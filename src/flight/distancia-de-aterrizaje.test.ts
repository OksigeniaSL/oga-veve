/**
 * **Lo que tarda en parar cada avión, contra lo que dice su manual.**
 *
 * Contado volando: «he llegado a frenar en poco espacio; al pulsar la B el
 * avión frena bastante; también es cierto que suelo entrar despacio (al
 * mínimo) y no sé si eso es así». Para saber si es así hay que tener con qué
 * compararlo, y lo que hay es el manual de cada clase de avión: la distancia
 * de aterrizaje certificada, que es la del freno a fondo, los frenos de
 * tierra fuera, sin reversa y en seco.
 *
 * Aquí se vuela la rodadura en el motor de coeficientes —el de verdad, con
 * sus fuerzas— y se compara con:
 *
 * - **JAZ 20**, con el Cessna 172S: 575 ft de rodadura a 2.550 lb, nivel del
 *   mar y 15 °C (manual de vuelo, sección 5).
 * - **JAZ 40**, con el Beechcraft Baron 58: 1.440 ft de rodadura a su peso
 *   máximo de 5.400 lb.
 * - **JAZ 60**, con el Beechcraft 1900D: 2.800 ft de distancia de aterrizaje
 *   sobre quince metros a su peso máximo de 16.765 lb; quitando los mil pies
 *   del aire, unos 550 m de rodadura.
 * - **JAZ 90**, con el Embraer 170: 1.228 m de pista de aterrizaje a su peso
 *   máximo de 32.800 kg (manual de aeropuertos), que es la distancia de
 *   verdad partida por 0,6: unos 737 m, y quitando los trescientos del aire,
 *   unos 440 de rodadura.
 * - **JAZ 120**, con el Boeing 747-400: 1.900 m de pista a 574.000 lb, unos
 *   1.140 de distancia y, sin los trescientos cincuenta del aire, unos 790 de
 *   rodadura.
 *
 * Y como cada ficha pesa lo que pesa y no lo que pesa ese avión, la referencia
 * se escala con el peso: a igual carga alar la distancia va con la velocidad
 * al cuadrado, y la velocidad al cuadrado con el peso. El biplano fumigador no
 * tiene manual a mano con el que medirlo y entra solo en las otras pruebas.
 *
 * La prueba no busca el metro —el aire de la referencia es una estimación y
 * cada manual mide a su manera—: busca que ningún avión pare en la mitad ni en
 * el doble de lo que para el suyo. Medido al escribirla:
 *
 *     jaz-20   178 m  (ref. 175)   jaz-60   366 m  (ref. 404)
 *     jaz-40   308 m  (ref. 358)   jaz-90   455 m  (ref. 400)
 *                                   jaz-120  700 m  (ref. 776)
 *
 * Y el resto de lo que pidió la tanda: la pista mojada, el peso, la velocidad
 * al tocar, los frenos de tierra, la reversa y el autofreno.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { ArcadeFlightModel } from "./arcade";
import { AIRCRAFT, tieneReversa, type AircraftConfig } from "./aircraft";
import { rodaduraDeFrenada, velocidadDeToma } from "./carrera";
import { neutralControls, type ControlInputs } from "./model";
import { DECELERACION_DEL_AUTOFRENO } from "./frenada";

const PIE = 0.3048;
const LIBRA = 0.45359237;

function avion(id: string): AircraftConfig {
  return AIRCRAFT.find((a) => a.id === id)!;
}

interface Rodadura {
  readonly metros: number;
  readonly segundos: number;
  /** El peso en las ruedas el primer segundo, como parte del peso. */
  readonly enLasRuedas: number;
  /** La deceleración media entre la mitad y un tercio de la de toma, m/s². */
  readonly enMedio: number;
}

/**
 * Posa el avión a `desde` m/s con los flaps de aterrizaje y rueda con estos
 * mandos hasta parar, en el modelo que se diga.
 */
function rodar(
  a: AircraftConfig,
  mandos: Partial<ControlInputs>,
  opciones: {
    readonly desde?: number;
    readonly mojada?: boolean;
    readonly sencillo?: boolean;
  } = {},
): Rodadura {
  const desde = opciones.desde ?? velocidadDeToma(a);
  const m = opciones.sencillo
    ? new ArcadeFlightModel({ aircraft: a, ground: () => 0 })
    : new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  m.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: desde });
  const s = m.state;
  s.onGround = true;
  s.position.y = a.gearHeight;
  m.setOnRunway(true);
  m.ponerPistaMojada?.(opciones.mojada ?? false);
  const c = { ...neutralControls(), throttle: 0, flaps: 1, ...mandos };
  const dt = 1 / 60;
  let metros = 0;
  let segundos = 0;
  let v = desde;
  let enLasRuedas = 0;
  let muestras = 0;
  let tMitad: number | null = null;
  let tTercio: number | null = null;
  while (v > 0.5 && segundos < 240) {
    const antes = s.position.clone();
    m.step(dt, c);
    metros += Math.hypot(s.position.x - antes.x, s.position.z - antes.z);
    segundos += dt;
    v = Math.hypot(s.velocity.x, s.velocity.z);
    if (segundos <= 1 && !opciones.sencillo) {
      // Lo que no sostiene el ala, a la vista del factor de carga.
      enLasRuedas += 1 - s.loadFactor;
      muestras++;
    }
    if (tMitad === null && v <= desde / 2) tMitad = segundos;
    if (tTercio === null && v <= desde / 3) tTercio = segundos;
  }
  return {
    metros,
    segundos,
    enLasRuedas: muestras > 0 ? enLasRuedas / muestras : NaN,
    enMedio:
      tMitad !== null && tTercio !== null && tTercio > tMitad
        ? (desde / 2 - desde / 3) / (tTercio - tMitad)
        : NaN,
  };
}

/** Como se certifica: freno a fondo, frenos de tierra fuera, sin reversa. */
function comoElManual(a: AircraftConfig): Partial<ControlInputs> {
  return { brakes: 1, frenosDeTierra: a.frenosDeTierra ? 1 : 0 };
}

/** La rodadura del manual de su clase, en metros, al peso de su ficha. */
const DEL_MANUAL: Readonly<Record<string, { metros: number; kilos: number }>> = {
  "jaz-20": { metros: 575 * PIE, kilos: 2550 * LIBRA },
  "jaz-40": { metros: 1440 * PIE, kilos: 5400 * LIBRA },
  "jaz-60": { metros: 2800 * PIE - 1000 * PIE, kilos: 16765 * LIBRA },
  "jaz-90": { metros: 1228 * 0.6 - 300, kilos: 32800 },
  "jaz-120": { metros: 1900 * 0.6 - 350, kilos: 574000 * LIBRA },
};

describe("la distancia de aterrizaje, contra el manual de su clase", () => {
  for (const [id, ref] of Object.entries(DEL_MANUAL)) {
    it(`${id} para en lo que para el de verdad`, () => {
      const a = avion(id);
      const esperado = ref.metros * (a.mass / ref.kilos);
      const { metros } = rodar(a, comoElManual(a));
      const r = metros / esperado;
      const dicho = `${id}: ${Math.round(metros)} m contra ${Math.round(esperado)} del manual`;
      expect(r, dicho).toBeGreaterThan(0.75);
      expect(r, dicho).toBeLessThan(1.3);
    });
  }
});

describe("lo que alarga y lo que acorta la parada", () => {
  it("la pista mojada la alarga, y más cuanto más deprisa toca el avión", () => {
    /*
     * La curva de la 25.109: deprisa la rueda casi no agarra en mojado. Una
     * avioneta toca a cincuenta nudos y apenas lo nota —las guías de
     * aviación general dicen un quince por ciento más en asfalto mojado—; un
     * reactor toca a ciento treinta, donde la rueda mojada agarra la mitad
     * que seca. Medido: 1,04 a 1,23 los de pistón, 1,37 el turbohélice, 1,40
     * y 1,61 los reactores.
     */
    const banda: Record<string, [number, number]> = {
      piston: [1.0, 1.35],
      radial: [1.0, 1.35],
      turboprop: [1.15, 1.6],
      turbofan: [1.25, 1.8],
    };
    for (const a of AIRCRAFT) {
      const seca = rodar(a, comoElManual(a)).metros;
      const mojada = rodar(a, comoElManual(a), { mojada: true }).metros;
      const [min, max] = banda[a.sound.engine]!;
      const r = mojada / seca;
      expect(r, `${a.id}: ×${r.toFixed(2)}`).toBeGreaterThanOrEqual(min);
      expect(r, `${a.id}: ×${r.toFixed(2)}`).toBeLessThan(max);
    }
  });

  it("más pesado, más largo: la distancia va con el peso", () => {
    /*
     * Con un quinto menos de peso la velocidad de aproximación baja con la
     * raíz —la carga alar manda en la pérdida— y la rodadura, con el cuadrado
     * de la velocidad: un quinto menos, más o menos. Es lo que dicen las
     * tablas de cualquier manual por cada mil kilos.
     */
    for (const a of AIRCRAFT) {
      const ligero: AircraftConfig = {
        ...a,
        mass: a.mass * 0.8,
        approachSpeed: a.approachSpeed * Math.sqrt(0.8),
      };
      const r = rodar(ligero, comoElManual(ligero)).metros / rodar(a, comoElManual(a)).metros;
      expect(r, `${a.id}: ×${r.toFixed(2)}`).toBeGreaterThan(0.7);
      expect(r, `${a.id}: ×${r.toFixed(2)}`).toBeLessThan(0.9);
    }
  });

  it("y la velocidad al tocar pesa al cuadrado: diez por ciento más rápido, una quinta parte más de pista", () => {
    /*
     * La lección de «entrar al mínimo» por el otro lado: la energía que hay
     * que quitar va con el cuadrado de la velocidad. Diez por ciento por
     * encima de la de toma son un veintiuno por ciento más de rodadura en la
     * cuenta de la escuela, y algo más en el avión, porque deprisa el ala
     * sostiene más y la rueda carga menos.
     */
    for (const a of AIRCRAFT) {
      const justa = rodar(a, comoElManual(a)).metros;
      const rapida = rodar(a, comoElManual(a), {
        desde: velocidadDeToma(a) * 1.1,
      }).metros;
      const r = rapida / justa;
      /*
       * En el que no tiene con qué matar la sustentación, bastante más: diez
       * por ciento por encima de la de toma, con los flaps de aterrizaje, el
       * ala de una avioneta sostiene nueve décimas del avión y la rueda casi
       * no frena hasta perder lo que sobra. Es el «flota y no para» de entrar
       * rápido. Medido: ×1,47 el JAZ 20 y ×1,67 el turbohélice, que con sus
       * flaps casi vuelve a volar; ×1,2 a ×1,3 los que matan la sustentación.
       */
      const tope = a.frenosDeTierra ? 1.35 : 1.75;
      expect(r, `${a.id}: ×${r.toFixed(2)}`).toBeGreaterThan(1.15);
      expect(r, `${a.id}: ×${r.toFixed(2)}`).toBeLessThan(tope);
    }
  });

  it("sin los frenos de tierra, el reactor no frena al tocar: el ala lleva el peso", () => {
    /*
     * Para lo que salen. Tocando a su velocidad con los flaps de aterrizaje,
     * el ala de un reactor todavía sostiene tres cuartas partes del avión, y
     * una rueda que no carga no frena. Con los paneles arriba el peso pasa a
     * las ruedas: medido, el regional rueda un 46 % más sin ellos.
     */
    for (const a of AIRCRAFT.filter((x) => x.frenosDeTierra)) {
      const con = rodar(a, { brakes: 1, frenosDeTierra: 1 });
      const sin = rodar(a, { brakes: 1, frenosDeTierra: 0 });
      expect(con.enLasRuedas, `${a.id}: con ellos`).toBeGreaterThan(0.6);
      expect(sin.enLasRuedas, `${a.id}: sin ellos`).toBeLessThan(0.35);
      expect(sin.metros / con.metros, a.id).toBeGreaterThan(1.25);
    }
  });

  it("la reversa la acorta en el que la lleva, y en el que no, no hace nada", () => {
    for (const a of AIRCRAFT) {
      const sin = rodar(a, comoElManual(a)).metros;
      const con = rodar(a, { ...comoElManual(a), reversa: 1 }).metros;
      if (tieneReversa(a)) expect(con, a.id).toBeLessThan(sin * 0.9);
      else expect(con, a.id).toBeCloseTo(sin, 0);
    }
  });
});

describe("el autofreno", () => {
  const reactores = AIRCRAFT.filter((a) => a.autofreno);

  it("lo llevan los dos reactores y nadie más", () => {
    expect(reactores.map((a) => a.id).sort()).toEqual(["jaz-120", "jaz-90"]);
  });

  it("sostiene su deceleración: 1,7 m/s² en LO y 3 en MED", () => {
    for (const a of reactores) {
      for (const modo of ["lo", "med"] as const) {
        const objetivo = DECELERACION_DEL_AUTOFRENO[modo];
        const { enMedio } = rodar(a, { frenosDeTierra: 1, autofreno: objetivo });
        expect(enMedio / objetivo, `${a.id} ${modo}: ${enMedio.toFixed(2)} m/s²`).toBeGreaterThan(0.9);
        expect(enMedio / objetivo, `${a.id} ${modo}: ${enMedio.toFixed(2)} m/s²`).toBeLessThan(1.1);
      }
    }
  });

  it("LO para más largo que MED, y MED más largo que el pie a fondo", () => {
    for (const a of reactores) {
      const lo = rodar(a, { frenosDeTierra: 1, autofreno: 1.7 }).metros;
      const med = rodar(a, { frenosDeTierra: 1, autofreno: 3 }).metros;
      const max = rodar(a, { frenosDeTierra: 1, autofreno: Infinity }).metros;
      expect(lo, a.id).toBeGreaterThan(med * 1.4);
      expect(med, a.id).toBeGreaterThan(max * 1.2);
      // Y MAX es el freno a fondo, como el pie.
      expect(max / rodar(a, comoElManual(a)).metros, a.id).toBeCloseTo(1, 1);
    }
  });

  it("en mojado, LO para igual: lo que pide la rueda le alcanza", () => {
    /*
     * Es por lo que se usa el autofreno en mojado: pide una deceleración y
     * no un pie, y uno virgen de 1,7 m/s² cabe dentro de lo que agarra una
     * rueda mojada. El pie a fondo, en cambio, se encuentra con la pista.
     */
    for (const a of reactores) {
      const seca = rodar(a, { frenosDeTierra: 1, autofreno: 1.7 }).metros;
      const mojada = rodar(a, { frenosDeTierra: 1, autofreno: 1.7 }, { mojada: true }).metros;
      expect(mojada / seca, a.id).toBeLessThan(1.05);
    }
  });

  it("con la reversa para igual en MED, gastando menos freno, y en LO antes", () => {
    /*
     * El autofreno sostiene una deceleración: con la reversa, lo que frena el
     * chorro lo deja de frenar la rueda, y la parada es la misma. En LO, la
     * reversa a fondo y los paneles frenan ya más de 1,7 m/s² deprisa, y el
     * freno no puede empujar hacia delante: para antes. Es lo de verdad.
     */
    for (const a of reactores) {
      const sin = rodar(a, { frenosDeTierra: 1, autofreno: 3 }).metros;
      const con = rodar(a, { frenosDeTierra: 1, autofreno: 3, reversa: 1 }).metros;
      expect(Math.abs(con - sin) / sin, a.id).toBeLessThan(0.05);
      const loSin = rodar(a, { frenosDeTierra: 1, autofreno: 1.7 }).metros;
      const loCon = rodar(a, { frenosDeTierra: 1, autofreno: 1.7, reversa: 1 }).metros;
      expect(loCon, a.id).toBeLessThanOrEqual(loSin);
    }
  });

  it("y en Guyrami para en los mismos metros que en el modelo completo", () => {
    for (const a of reactores) {
      const completo = rodar(a, { frenosDeTierra: 1, autofreno: 1.7 }).metros;
      const sencillo = rodar(a, { frenosDeTierra: 1, autofreno: 1.7 }, { sencillo: true }).metros;
      expect(Math.abs(sencillo - completo) / completo, a.id).toBeLessThan(0.05);
      expect(rodaduraDeFrenada(a, "asfalto", { autofreno: "lo" }) / completo, a.id).toBeCloseTo(1, 1);
    }
  });
});

describe("y en la ficha", () => {
  it("frenos de tierra solo en los que llevan aerofrenos, y el turbohélice no", () => {
    for (const a of AIRCRAFT)
      expect(a.frenosDeTierra !== null, a.id).toBe(a.aerofrenos !== null);
    expect(avion("jaz-60").frenosDeTierra).toBeNull();
  });

  it("frenan entre tres décimas y media g, según su clase", () => {
    for (const a of AIRCRAFT) {
      expect(a.frenos.enSeco, a.id).toBeGreaterThanOrEqual(0.3);
      expect(a.frenos.enSeco, a.id).toBeLessThanOrEqual(0.45);
    }
  });
});
