/**
 * Que las ráfagas sean las de verdad: **a ratos**, con **la fuerza que dice el
 * parte** y **nada en aire quieto**. Es lo que pidió Enrique —«real y de vez
 * en cuando», «sacudidas según su intensidad, y no un temblor continuo»—
 * dicho en pruebas, con las tablas publicadas al lado:
 *
 * - a ratos: el AIM, 7-1-21 y su tabla TBL 7-1-11 —ocasional, menos de un
 *   tercio del tiempo; intermitente, de un tercio a dos; continua, más—;
 * - con su fuerza: el ICAO Doc 4444, apéndice 1 —moderada, cambios de 0,5 a
 *   1,0 g en el acelerómetro; fuerte, más de 1 g— y la ligera de la Oficina
 *   de Meteorología de Australia, de 0,15 a 0,49 g. Medido como lo mide el
 *   acelerómetro: lo que va de la lectura más baja a la más alta en cada racha.
 *
 * El avión de referencia es uno de línea mediano en crucero, que es para el
 * que están escritos esos umbrales (ICAO Doc 10157, nota a 3.1.4.6). Cómo
 * responde a la ráfaga es lo de siempre: la carga de Pratt y Walker y el avión
 * yéndose con el aire, que es lo que hace el modelo sencillo.
 */
import { describe, expect, it } from "vitest";
import { airDensity, GRAVITY } from "./atmosphere";
import { cargaPorRafaga, fuerzaDelBache, Rafagas, UDE_DE_CADA, type Momento } from "./rafagas";
import { QUIETO } from "./turbulencia";

/** Uno de línea mediano —sesenta y cuatro toneladas, 122,6 m²— en crucero. */
const DE_LINEA = { masa: 64000, ala: 122.6, clAlpha: 4.8, cuerda: 4.19, envergadura: 34.1 };
const CRUCERO = 10700;
const V = 230;

function momento(sigma: number, constancia: number, extra: Partial<Momento> = {}): Momento {
  return {
    sigma,
    constancia,
    sobreElSuelo: CRUCERO,
    enTierra: false,
    velocidad: V,
    densidad: airDensity(CRUCERO),
    envergadura: DE_LINEA.envergadura,
    cuerda: DE_LINEA.cuerda,
    rumbo: 0,
    ...extra,
  };
}

/**
 * Vuela `segundos` en ese aire y devuelve, por cada racha cruzada, lo que va
 * de la carga más baja a la más alta; y qué parte del rato hubo racha.
 */
function volar(
  sigma: number,
  constancia: number,
  segundos: number,
  avion = DE_LINEA,
  m: Partial<Momento> = {},
): { picoAPico: number[]; enRacha: number; cargas: number[] } {
  const r = new Rafagas(11);
  const mom = momento(sigma, constancia, { envergadura: avion.envergadura, cuerda: avion.cuerda, ...m });
  const porMetro = cargaPorRafaga({
    densidad: mom.densidad,
    velocidad: mom.velocidad,
    clAlpha: avion.clAlpha,
    cargaAlar: (avion.masa * GRAVITY) / avion.ala,
  });
  const dt = 1 / 60;
  let conAire = 0;
  let dentro = 0;
  let antes = false;
  let alta = -Infinity;
  let baja = Infinity;
  const picoAPico: number[] = [];
  const cargas: number[] = [];
  for (let t = 0; t < segundos; t += dt) {
    const w = r.paso(dt, mom).y;
    // El avión se va con el aire al ritmo de su carga: `g·Δn/U`.
    const cambia = (w - conAire) * (1 - Math.exp(-GRAVITY * porMetro * dt));
    conAire += cambia;
    const carga = cambia / dt / GRAVITY;
    cargas.push(carga);
    if (r.enRacha) {
      dentro++;
      alta = Math.max(alta, carga);
      baja = Math.min(baja, carga);
    } else if (antes) {
      picoAPico.push(alta - baja);
      alta = -Infinity;
      baja = Infinity;
    }
    antes = r.enRacha;
  }
  return { picoAPico, enRacha: (dentro * dt) / segundos, cargas };
}

const mediana = (xs: number[]): number => {
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)] ?? 0;
};

describe("en aire quieto", () => {
  it("nada: ni un bache en una hora", () => {
    const r = new Rafagas(3);
    for (let t = 0; t < 3600; t += 1 / 30) expect(r.paso(1 / 30, momento(0, 0.5))).toBe(QUIETO);
  });

  it("y al salir de una zona movida, se acaba", () => {
    const r = new Rafagas(5);
    for (let t = 0; t < 120; t += 1 / 60) r.paso(1 / 60, momento(1.5, 0.95));
    expect(r.paso(1 / 60, momento(0, 0.95))).toBe(QUIETO);
  });
});

describe("a ratos, como dice el AIM", () => {
  it("la ligera es ocasional: menos de un tercio del tiempo", () => {
    const { enRacha } = volar(0.95, 0.3, 3600);
    expect(enRacha).toBeLessThan(1 / 3 + 0.03);
    expect(enRacha).toBeGreaterThan(0.2);
  });

  it("la moderada, intermitente: de un tercio a dos tercios", () => {
    const { enRacha } = volar(1.5, 0.45, 3600);
    expect(enRacha).toBeGreaterThan(1 / 3);
    expect(enRacha).toBeLessThan(2 / 3);
  });

  it("la de una tormenta, continua: más de dos tercios", () => {
    const { enRacha } = volar(2.4, 0.85, 3600);
    expect(enRacha).toBeGreaterThan(2 / 3);
  });

  /*
   * **Y entre racha y racha el aire está tranquilo de verdad**: eso es lo que
   * hace que un bache sea un bache y no un temblor que no para.
   */
  it("fuera de la racha se mueve mucho menos que dentro", () => {
    const r = new Rafagas(9);
    const mom = momento(1.5, 0.45);
    let dentro = 0;
    let nDentro = 0;
    let fuera = 0;
    let nFuera = 0;
    for (let t = 0; t < 3600; t += 1 / 60) {
      const w = r.paso(1 / 60, mom).y;
      if (r.cuanta > 0.95) {
        dentro += w * w;
        nDentro++;
      } else if (r.cuanta < 0.2) {
        fuera += w * w;
        nFuera++;
      }
    }
    expect(Math.sqrt(dentro / nDentro)).toBeGreaterThan(5 * Math.sqrt(fuera / nFuera));
  });
});

describe("con la fuerza que dice el parte", () => {
  it("las ráfagas equivalentes de AMDAR en los umbrales de cada nivel", () => {
    expect(fuerzaDelBache(0)).toBe(0);
    expect(fuerzaDelBache(0.4)).toBeCloseTo(UDE_DE_CADA.ligera);
    expect(fuerzaDelBache(1.15)).toBeCloseTo(UDE_DE_CADA.moderada);
    expect(fuerzaDelBache(1.9)).toBeCloseTo(UDE_DE_CADA.severa);
    expect(fuerzaDelBache(10)).toBe(UDE_DE_CADA.extrema);
  });

  it("ligera: de 0,15 a 0,49 g de pico a pico", () => {
    const m = mediana(volar(0.95, 0.3, 3600).picoAPico);
    expect(m).toBeGreaterThan(0.15);
    expect(m).toBeLessThan(0.5);
  });

  it("moderada: de 0,5 a 1,0 g", () => {
    const m = mediana(volar(1.5, 0.45, 3600).picoAPico);
    expect(m).toBeGreaterThanOrEqual(0.5);
    expect(m).toBeLessThan(1.0);
  });

  it("fuerte: más de 1 g", () => {
    const m = mediana(volar(2.3, 0.6, 3600).picoAPico);
    expect(m).toBeGreaterThan(1.0);
  });

  /*
   * **Y el grande lo nota menos**, por su carga alar: el mismo aire, la
   * avioneta a ras de suelo y el cuatrimotor en crucero. Por metro por segundo
   * de ráfaga la avioneta carga seis veces más; se queda en algo menos del
   * triple porque también se va con el aire seis veces antes —es el factor de
   * alivio de Pratt, 0,66 en ella y 0,85 en el grande— y porque arriba el
   * mismo bache equivalente es más rápido de verdad.
   */
  it("la avioneta, con el mismo aire, se lleva más del doble que el cuatrimotor", () => {
    const avioneta = { masa: 1100, ala: 16.2, clAlpha: 5.1, cuerda: 1.5, envergadura: 11 };
    const grande = { masa: 255826, ala: 511, clAlpha: 4.8, cuerda: 8.32, envergadura: 59.64 };
    const enLaAvioneta = mediana(
      volar(1.5, 0.45, 1800, avioneta, {
        sobreElSuelo: 700,
        velocidad: 60,
        densidad: airDensity(1000),
      }).picoAPico,
    );
    const enElGrande = mediana(volar(1.5, 0.45, 1800, grande).picoAPico);
    expect(enLaAvioneta).toBeGreaterThan(2 * enElGrande);
  });
});

describe("baches y no temblor", () => {
  it("casi nada de la carga va por encima de cinco hercios", () => {
    const { cargas } = volar(1.5, 0.45, 1800);
    // Lo que queda al quitarle un paso bajo de cinco hercios.
    let lenta = 0;
    let rapido = 0;
    let todo = 0;
    const k = 1 - Math.exp((-2 * Math.PI * 5) / 60);
    for (const c of cargas) {
      lenta += (c - lenta) * k;
      rapido += (c - lenta) ** 2;
      todo += c * c;
    }
    // En amplitud, menos de un quinto; en potencia, menos del cuatro por ciento.
    expect(Math.sqrt(rapido / todo)).toBeLessThan(0.2);
  });

  /*
   * **El fondo, con las proporciones de Dryden**: a ras de suelo empuja más de
   * lado que hacia arriba, que el suelo aplasta los remolinos verticales.
   */
  it("cerca del suelo, más de lado que hacia arriba", () => {
    const r = new Rafagas(13);
    const mom = momento(1.2, 0.95, { sobreElSuelo: 40, velocidad: 60, densidad: 1.2, enTierra: true });
    let lado = 0;
    let arriba = 0;
    for (let t = 0; t < 1800; t += 1 / 60) {
      const x = r.paso(1 / 60, mom);
      lado += x.x * x.x;
      arriba += x.y * x.y;
    }
    expect(Math.sqrt(lado)).toBeGreaterThan(1.3 * Math.sqrt(arriba));
  });

  /*
   * **Y el avión cruza el aire**: a más velocidad, más baches por segundo. Es
   * la hipótesis de Taylor, la de todos los modelos de turbulencia de vuelo.
   */
  it("más rápido, más baches por segundo", () => {
    const cruces = (velocidad: number) => {
      const r = new Rafagas(17);
      const mom = momento(1.5, 0.95, { velocidad });
      let n = 0;
      let antes = 0;
      for (let t = 0; t < 600; t += 1 / 60) {
        const w = r.paso(1 / 60, mom).y;
        if (Math.sign(w) !== Math.sign(antes)) n++;
        antes = w;
      }
      return n;
    };
    expect(cruces(240)).toBeGreaterThan(1.8 * cruces(80));
  });

  it("el alabeo es pequeño: un bache mueve las alas, no las voltea", () => {
    const r = new Rafagas(19);
    let p = 0;
    let n = 0;
    for (let t = 0; t < 1800; t += 1 / 60) {
      const x = r.paso(1 / 60, momento(1.5, 0.45, { velocidad: 60, sobreElSuelo: 700, densidad: 1.1, envergadura: 11, cuerda: 1.5 }));
      p += x.alabeo * x.alabeo;
      n++;
    }
    const rms = Math.sqrt(p / n);
    expect(rms).toBeGreaterThan(0);
    expect(rms).toBeLessThan(0.1);
  });
});
