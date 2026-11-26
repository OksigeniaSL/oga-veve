/**
 * **Sin radio, nadie a tu única calle mientras vienes, y al que te mandó al
 * aire la pista en cuanto quede libre** (H100).
 *
 * En Encarnación, con el fallo de radio, la lámpara daba la roja fija en la
 * final dos veces: las dos por uno que esperaba en la doble raya de la única
 * calle. La torre dejaba de contarte en su circuito al despegar o al subir tras
 * la roja, y en ese rato dejaba rodar hacia tu calle a quien luego no se iba a
 * tiempo; y al que ya te había mandado al aire no le daba la pista si la orden
 * se levantaba con la pista ocupada por otro, y te mandaba al aire otra vez por
 * el mismo avión.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { distanciaDeAterrizaje } from "../flight/carrera";
import { Frecuencia } from "../flight/radio";
import type { TuLlegadaALaPista } from "../flight/salida-tapada";
import {
  RETENCION_MAXIMA,
  RETENCION_SIN_RADIO,
  TurnoDePista,
  type DibujoDelTurno,
} from "../flight/turno-de-pista";
import type { Aerodrome } from "./aerodrome";
import { TIEMPO_DE_CASA } from "./meteo";
import { conViento, SCENARIOS } from "./scenarios";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { crearTrafico, tiposDelCampo, TU, type QuienJuega, type QuienTapaTuSalida } from "./trafico";

const PASO = 0.5;
function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
const EN_VUELO = { fase: "en-vuelo", deDia: true, instructorHablando: false } as const;

describe("sin radio, nadie rueda hacia tu única calle mientras vienes", () => {
  const JAZ_20 = AIRCRAFT.find((a) => a.id === "jaz-20")!;
  const esc = conViento(SCENARIOS.find((e) => e.id === "encarnacion")!, {
    ...TIEMPO_DE_CASA,
    vientoDe: 20,
    vientoKt: 8,
  });
  const aero = esc.aerodrome as Aerodrome;
  const cota = aero.elevationM ?? 0;
  const calles = sueloDelTrafico(aero, esc.runway, aero.runways[0]?.widthM ?? 45);
  const sale = { porDonde: [], frenaEn: distanciaDeAterrizaje(JAZ_20) };
  // Cuatro que saldrían: todos acaban en la doble raya de la única calle.
  const SALEN = ["ZP-AAA", "ZP-BBB", "ZP-CCC", "ZP-DDD"];

  /** A quién retiene la torre por la doble raya de cada uno de los que van a salir, contigo así. */
  const retiene = (tu: QuienJuega) => {
    const trafico = crearTrafico(esc.runway, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: tiposDelCampo(aero.id, esc.runway.length, false),
      quienJuega: () => tu,
      tierra: () => (calles ? { suelo: calles, alto: () => cota } : null),
    });
    const quienes = SALEN.map((m) => trafico.quienDejaLaPistaPorSuRaya(m));
    trafico.dispose();
    return quienes;
  };

  it("con radio y lejos, se le deja rodar: le da tiempo, y si no, se te pide una vuelta", () => {
    expect(calles?.unaSolaCalle()).toBe(true);
    const lejos: QuienJuega = { alUmbral: null, llegada: 1500, enLaPista: false, saleDeLaPista: sale };
    expect(retiene(lejos)).toEqual(SALEN.map(() => null));
    // Y cerca, como siempre, no.
    expect(retiene({ ...lejos, llegada: 120 })).toEqual(SALEN.map(() => TU));
  });

  it("sin radio, no: ni lejos, ni cuando la torre no te ve en su circuito", () => {
    const lejos: QuienJuega = { alUmbral: null, llegada: 1500, enLaPista: false, sinRadio: true, saleDeLaPista: sale };
    expect(retiene(lejos)).toEqual(SALEN.map(() => TU));
    expect(retiene({ ...lejos, llegada: null })).toEqual(SALEN.map(() => TU));
  });

  it("y si no vienes a aterrizar aquí, a nadie", () => {
    expect(retiene({ alUmbral: null, llegada: null, enLaPista: false, sinRadio: true })).toEqual(SALEN.map(() => null));
  });
});

describe("al que te mandó al aire por tu salida, la pista en cuanto quede libre", () => {
  /**
   * Tú sin radio en la final, y uno en la doble raya de tu única calle que tarda
   * en irse más de lo que te falta. La roja; luego subes y vuelves al circuito,
   * todavía sin tiempo para él. ¿Se le da la salida? `pistaDeOtro` es si en ese
   * rato la tiene otro.
   */
  const trasLaRoja = (pistaDeOtro: boolean) => {
    const radio = new Frecuencia(dados(3), "SGEN");
    const m = radio.sacarARodar()!;
    // Su «rodando» y su «hold short»: ya está en la calle.
    for (let t = 0; t < 30 && !radio.vaASalir(m); t += PASO) radio.update(PASO, EN_VUELO);
    expect(radio.vaASalir(m)).toBe(true);
    const tapa: QuienTapaTuSalida = { matricula: m, leHace: 330, espera: 0, enLaPista: false, teDejaOtra: false };
    let libre = true;
    const anunciado: string[] = [];
    const dibujo: DibujoDelTurno = {
      anuncia: (quien, clave) => anunciado.push(`${quien} ${clave}`),
      paso: () => [],
      todaviaNo: () => false,
      enFinal: () => null,
      ocupanLaPista: () => [],
      tapanTuSalida: () => [tapa],
      puedeSalirSinEsperarte: () => libre,
    };
    let llegada: TuLlegadaALaPista = { segundos: 80, donde: "final", alto: 250 };
    let frustrando = false;
    const rojas: string[] = [];
    const turno = new TurnoDePista({
      radio,
      boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
      trafico: () => dibujo,
      torre: () => true,
      privado: () => false,
      alUmbral: () => llegada.segundos * 35,
      alto: () => llegada.alto,
      enTierra: () => false,
      decirAOtro: () => null,
      sinRadio: () => true,
      rumbo: () => 0,
      autorizarte: () => {},
      retirarteElPermiso: () => {},
      mandarteAlAire: () => {},
      mandanFrustrar: () => frustrando,
      darteUnaVuelta: () => {},
      acabarTuVuelta: () => {},
      mandarteAlAirePorTuSalida: (_alto, por) => {
        rojas.push(por);
        frustrando = true;
      },
      tuLlegada: () => llegada,
    });
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    // Mientras sube, la pista la tiene otro; luego queda libre.
    libre = !pistaDeOtro;
    turno.paso("final");
    expect(rojas).toEqual([m]);
    // Subes, la orden se levanta y vuelves al circuito, a cuatro minutos y medio.
    frustrando = false;
    llegada = { segundos: 270, donde: "circuito", alto: 250 };
    turno.paso("en-vuelo");
    libre = true;
    turno.paso("en-vuelo");
    turno.paso("en-vuelo");
    return anunciado.includes(`${m} torre.clearedTakeoff`);
  };

  it("con la pista ocupada al levantarse la orden, en cuanto queda libre", () => {
    expect(trasLaRoja(true)).toBe(true);
  });

  it("y con ella libre, igual", () => {
    expect(trasLaRoja(false)).toBe(true);
  });
});

describe("y al que la torre retiene por ti sin radio, no se le suelta a los siete minutos", () => {
  /**
   * Uno en su puesto, a punto de llamar para rodar, retenido porque su doble
   * raya está en tu calle; tú en el aire, `segundos` dando vueltas. Devuelve
   * lo más que estuvo retenido y si llegó a llamar para rodar.
   */
  const retenido = (sinRadio: boolean, segundos: number) => {
    const radio = new Frecuencia(dados(11), "SGEN");
    const m = radio.sacarARodar()!;
    const dibujo: DibujoDelTurno = {
      anuncia: () => {},
      paso: () => [],
      todaviaNo: () => false,
      enFinal: () => null,
      ocupanLaPista: () => [],
      tapanTuSalida: () => [],
      quienDejaLaPistaPorSuRaya: (x) => (x === m ? TU : null),
    };
    const turno = new TurnoDePista({
      radio,
      boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
      trafico: () => dibujo,
      torre: () => true,
      privado: () => false,
      alUmbral: () => 9000,
      alto: () => 300,
      enTierra: () => false,
      decirAOtro: () => null,
      sinRadio: () => sinRadio,
      autorizarte: () => {},
      mandarteAlAire: () => {},
    });
    let llamo = false;
    for (let t = 0; t < segundos; t += PASO) {
      turno.oir(PASO, EN_VUELO);
      if (radio.loQueToca(m)?.primera !== true) llamo = true;
    }
    return { lleva: turno.retencionMasLarga, llamo };
  };

  it("con radio, la red de siempre: a los siete minutos se le suelta", () => {
    const r = retenido(false, RETENCION_MAXIMA + 120);
    expect(r.lleva).toBeLessThanOrEqual(RETENCION_MAXIMA + PASO);
    expect(r.llamo).toBe(true);
  });

  it("sin radio, sigue en su puesto mientras das vueltas", () => {
    const r = retenido(true, RETENCION_MAXIMA + 300);
    expect(r.lleva).toBeGreaterThan(RETENCION_MAXIMA + 250);
    expect(r.llamo).toBe(false);
  });

  it("y con su red, la larga: si no vienes nunca, sale", () => {
    const r = retenido(true, RETENCION_SIN_RADIO + 120);
    expect(r.lleva).toBeLessThanOrEqual(RETENCION_SIN_RADIO + PASO);
    expect(r.llamo).toBe(true);
  });
});
