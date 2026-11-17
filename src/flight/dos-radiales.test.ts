/**
 * **«Dos radiales que se cortan», volado por un piloto de prueba**: el
 * ejercicio entero con la radio de verdad (`leerNav`) en las dos estaciones,
 * una después de otra con una sola NAV, y un avión de cinemática —rumbo, la
 * verdadera, el viento que lo empuja—, sin navegador.
 *
 * Lo que tiene que salir, y es la lección: los dos radiales leídos son los de
 * verdad, a menos de un grado; la cruz de las dos rayas cae encima del avión,
 * a menos de lo que da el VOR (`loQueDaElVor`: un grado de cada raya a la
 * distancia de su radio, partido por el seno del corte); y si entre leer una
 * y otra el avión vuela de través, la cruz se queda donde estaba.
 */

import { describe, expect, it } from "vitest";
import { ARAI, MAINUMBY, PYKASU } from "./aircraft";
import { ejercicioPorId, ejerciciosPara } from "./ejercicios";
import {
  centrado,
  EMISORAS,
  leerNav,
  MILLA,
  rumboOrtodromico,
  vuelta,
  type Emisora,
} from "./radio-de-navegacion";
import { sitioDelMundo } from "./salto-bajo-tapa";
import {
  anguloDelCorte,
  colocacionDelCruce,
  CORTE,
  corteDeDosRadiales,
  DosRadiales,
  LEJOS,
  loQueDaElVor,
  parejaDelCampo,
  type SucesoDelCruce,
} from "./dos-radiales";
import { OBS_APARTADO } from "./en-que-radial-estoy";
import type { PuntoDelMundo } from "./seguir-la-aguja";
import { dondeCae } from "../world/entre-aerodromos";

const GRADO = Math.PI / 180;
const NUDO = 0.514444;
/** El origen del mundo de la prueba: cerca del aeropuerto de Fuerteventura. */
const ORIGEN = { lat: 28.45, lon: -13.865 };
const PAREJA = parejaDelCampo("GCFV")!;
const FTV = PAREJA.primera;
const LTE = PAREJA.segunda;
const EN_EL_MUNDO = (e: Emisora) => ({ emisora: e, ...dondeCae(ORIGEN, e.estacion) });
const PRIMERA = EN_EL_MUNDO(FTV);
const SEGUNDA = EN_EL_MUNDO(LTE);
const CRUCE = ejercicioPorId("cruce")!;
const ALTITUD = 900;

/** Hacia dónde va un viento que viene `de` grados a `kt` nudos, en x, z del mundo. */
function vientoDe(de: number, kt: number): PuntoDelMundo {
  const ms = kt * NUDO;
  return { x: -Math.sin(de * GRADO) * ms, z: Math.cos(de * GRADO) * ms };
}
/** Fuerteventura al oeste de FTV y el mar al este, que es como está (FTV, en la costa de levante). */
const SUELO = (x: number): number => (x - PRIMERA.x < -2000 ? 600 : 0);
/** El alisio de Fuerteventura: del treinta a veinte nudos. */
const ALISIO = vientoDe(30, 20);
const CALMA = { x: 0, z: 0 };

/** Lo que marca la NAV con esta emisora en un punto del mundo. */
function nav(e: Emisora, x: number, z: number, curso: number, rumbo = 0) {
  const s = sitioDelMundo(ORIGEN, x, z);
  return leerNav(e.mhz, curso, { lat: s.lat, lon: s.lon, altitud: ALTITUD, rumbo });
}
/** El radial de verdad de una emisora, sin pasar por `leerNav`. */
function radialDeVerdad(e: Emisora, x: number, z: number): number {
  return vuelta(rumboOrtodromico(e.estacion, sitioDelMundo(ORIGEN, x, z)) + e.declinacion);
}

const colocar = (viento: PuntoDelMundo, velocidad = PYKASU.cruiseSpeed) =>
  colocacionDelCruce({
    primera: PRIMERA,
    segunda: SEGUNDA,
    declinacion: FTV.declinacion,
    viento,
    velocidad,
    suelo: (x) => SUELO(x),
    cotaDeLaPista: 0,
  })!;

describe("dónde se ofrece «Dos radiales que se cortan»", () => {
  const ids = (p: Parameters<typeof ejerciciosPara>[0], a = PYKASU, oaci: string | null = "GCFV") =>
    ejerciciosPara(p, a, oaci).map((e) => e.id);

  it("en el peldaño de la radio, con NAV, y en un campo con VOR que tenga pareja", () => {
    expect(ids("taguato-ruvicha")).toContain("cruce");
    for (const p of ["guyrami", "tuka", "taguato"] as const) expect(ids(p)).not.toContain("cruce");
    // El biplano fumiga a vista y no lleva NAV.
    expect(ids("taguato-ruvicha", MAINUMBY)).not.toContain("cruce");
    for (const oaci of ["GCFV", "GCXO", "GCTS", "GCLP", "GCRR"]) expect(ids("taguato-ruvicha", PYKASU, oaci)).toContain("cruce");
    // Asunción tiene VOR, pero el más cercano está a más de lo que se oye: no hay cruz.
    for (const oaci of ["SGAS", "GCLA", "LECU"]) expect(ids("taguato-ruvicha", PYKASU, oaci)).not.toContain("cruce");
    expect(CRUCE.averias).toEqual([]);
    expect(CRUCE.escena).toBe("radio");
    expect(CRUCE.acabaEnElAire).toBe(true);
  });

  it("cada campo con la pareja de la propuesta: FTV y LTE, TFN y TFS —no LRO—, GDV y LPC", () => {
    const pareja = (oaci: string) => {
      const p = parejaDelCampo(oaci);
      return p ? `${p.primera.estacion.id} ${p.segunda.estacion.id}` : null;
    };
    expect(pareja("GCFV")).toBe("FTV LTE");
    expect(pareja("GCXO")).toBe("TFN TFS");
    expect(pareja("GCLP")).toBe("GDV LPC");
    expect(pareja("SGAS")).toBeNull();
  });

  it("dos radios a cinco millas y media no se ofrecen: TFN y LRO se cortan mal en todas partes", () => {
    const solas = EMISORAS.filter((e) => e.estacion.id === "TFN" || e.estacion.id === "LRO");
    expect(parejaDelCampo("GCXO", solas)).toBeNull();
    // En su prolongación, las dos rayas son la misma: ni corte, ni cruz que diga nada.
    const tfn = dondeCae(ORIGEN, solas.find((e) => e.estacion.id === "TFN")!.estacion);
    const lro = dondeCae(ORIGEN, solas.find((e) => e.estacion.id === "LRO")!.estacion);
    const lejos = { x: tfn.x + (tfn.x - lro.x) * 2, z: tfn.z + (tfn.z - lro.z) * 2 };
    expect(anguloDelCorte(lejos, tfn, lro)).toBeLessThan(1);
    expect(loQueDaElVor(11 * MILLA, 16 * MILLA, 1)).toBeGreaterThan(5 * MILLA);
  });
});

describe("dónde empieza", () => {
  it("entre diez y quince millas de FTV, sobre el mar, con las dos rayas cortándose bien", () => {
    const c = colocar(ALISIO);
    const lejos = Math.hypot(c.x - PRIMERA.x, c.z - PRIMERA.z);
    expect(lejos).toBeGreaterThanOrEqual(LEJOS.min - 1);
    expect(lejos).toBeLessThanOrEqual(LEJOS.max + 1);
    expect(c.x).toBeGreaterThan(PRIMERA.x);
    expect(c.corte).toBeGreaterThanOrEqual(CORTE.min);
    expect(c.corte).toBeLessThanOrEqual(CORTE.max);
    expect(c.alto).toBeCloseTo(3000 * 0.3048, 0);
  });

  it("volando hacia FTV con el morro corrigiendo el alisio, y el OBS veinte grados apartado, con FROM y la barra a tope", () => {
    const c = colocar(ALISIO);
    const v = PYKASU.cruiseSpeed;
    // El camino de verdad —el morro más el viento— va derecho a la radio.
    const vx = Math.sin(c.rumbo) * v + ALISIO.x;
    const vz = -Math.cos(c.rumbo) * v + ALISIO.z;
    const camino = Math.atan2(vx, -vz) / GRADO;
    const aLaRadio = Math.atan2(PRIMERA.x - c.x, -(PRIMERA.z - c.z)) / GRADO;
    expect(Math.abs(centrado(camino - aLaRadio))).toBeLessThan(0.1);
    // Y el morro no apunta a la radio: apunta contra el viento.
    expect(Math.abs(centrado(c.rumbo / GRADO - aLaRadio))).toBeGreaterThan(3);
    const n = nav(FTV, c.x, c.z, c.curso);
    expect(Math.abs(centrado(radialDeVerdad(FTV, c.x, c.z) - c.curso))).toBeCloseTo(OBS_APARTADO, -0.5);
    expect(n.toFrom).toBe("FROM");
    expect(Math.abs(n.desviacion!)).toBeGreaterThanOrEqual(10);
    // Y LTE se oye desde ahí.
    expect(nav(LTE, c.x, c.z, 360).emisora?.estacion.id).toBe("LTE");
  });
});

describe("la cruz en la esfera", () => {
  it("con los radiales de verdad, cae en el avión a menos de cincuenta metros", () => {
    for (const [dx, dz] of [
      [20000, 0],
      [18000, -9000],
      [15000, 12000],
      [-5000, -25000],
    ] as const) {
      const x = PRIMERA.x + dx;
      const z = PRIMERA.z + dz;
      const r1 = radialDeVerdad(FTV, x, z) - FTV.declinacion;
      const r2 = radialDeVerdad(LTE, x, z) - LTE.declinacion;
      const c = corteDeDosRadiales(FTV.estacion, r1, LTE.estacion, r2)!;
      const p = dondeCae(ORIGEN, c);
      expect(Math.hypot(p.x - x, p.z - z)).toBeLessThan(50);
    }
  });

  it("no hay cruz si las rayas se separan", () => {
    // De FTV hacia el sur y de LTE hacia el norte: no se cortan por delante de sus radios.
    expect(corteDeDosRadiales(FTV.estacion, 180, LTE.estacion, 0)).toBeNull();
  });

  it("leídos en el mismo instante, con el número entero del OBS que centra la barra, la cruz cae a menos de lo que da el VOR", () => {
    let peor = 0;
    for (let i = 0; i < 40; i++) {
      // Sitios al este de FTV, donde se empieza, de diez a quince millas.
      const a = (40 + i * 3.5) * GRADO;
      const d = (10 + (i % 6)) * MILLA;
      const x = PRIMERA.x + Math.sin(a) * d;
      const z = PRIMERA.z - Math.cos(a) * d;
      const corte = anguloDelCorte({ x, z }, PRIMERA, SEGUNDA);
      if (corte < CORTE.min || corte > CORTE.max) continue;
      // El número del OBS más apartado del de verdad que todavía centra la barra (a menos de un grado).
      const leido = (e: Emisora, signo: number) => {
        const r = radialDeVerdad(e, x, z);
        const obs = Math.round(r) + signo;
        return Math.abs(nav(e, x, z, obs).desviacion!) < 1 ? obs : Math.round(r);
      };
      for (const s1 of [-1, 1])
        for (const s2 of [-1, 1]) {
          const r1 = leido(FTV, s1);
          const r2 = leido(LTE, s2);
          const c = corteDeDosRadiales(FTV.estacion, r1 - FTV.declinacion, LTE.estacion, r2 - LTE.declinacion)!;
          const p = dondeCae(ORIGEN, c);
          const lejos = Math.hypot(p.x - x, p.z - z);
          const tolera = loQueDaElVor(
            Math.hypot(p.x - PRIMERA.x, p.z - PRIMERA.z),
            Math.hypot(p.x - SEGUNDA.x, p.z - SEGUNDA.z),
            corte,
          );
          expect(lejos).toBeLessThanOrEqual(tolera);
          peor = Math.max(peor, lejos / MILLA);
        }
    }
    // Y lo que da el VOR allí, en millas: menos de una.
    expect(peor).toBeGreaterThan(0.05);
    expect(peor).toBeLessThan(1);
  });
});

type Vuelo = {
  sucesos: SucesoDelCruce[];
  ejercicio: DosRadiales;
  /** Los radiales de verdad en el instante de leer cada raya. */
  deVerdad: number[];
  /** Dónde estaba el avión al leer cada raya. */
  alLeer: PuntoDelMundo[];
};

/**
 * **Un vuelo entero**: se coloca como lo coloca el juego y el piloto hace lo
 * que pide la instructora, con una sola NAV:
 *
 * - a los `obsA` segundos gira el OBS hacia donde centra la barra, de grado
 *   en grado, cuatro por segundo; si sale TO, lo gira seguido, veinte por
 *   segundo, hasta que diga FROM;
 * - con la primera leída, a los `espera` segundos pone la otra radio, y su
 *   morse acaba `morse` segundos después;
 * - `rumbo`: lo que hace con el morro desde que lee la primera. `"igual"`
 *   sigue hacia la primera radio, que es como empieza; `"aLaOtra"` vira hacia
 *   la segunda, a régimen estándar.
 */
function volar(
  viento: PuntoDelMundo,
  o: { velocidad?: number; obsA?: number; espera?: number; morse?: number; rumbo?: "igual" | "aLaOtra" } = {},
): Vuelo {
  const v = o.velocidad ?? PYKASU.cruiseSpeed;
  const c = colocar(viento, v);
  const ej = new DosRadiales(CRUCE, PRIMERA, SEGUNDA, ORIGEN);
  let { x, z, rumbo } = c;
  let curso = c.curso;
  let puesta: Emisora = FTV;
  let puestaEn: number | null = null;
  const sucesos: SucesoDelCruce[] = [];
  const deVerdad: number[] = [];
  const alLeer: PuntoDelMundo[] = [];
  let leidaLaPrimera: number | null = null;
  const dt = 0.25;
  for (let t = 0; t < 900 && ej.fase !== "cerrada"; t += dt) {
    const n = nav(puesta, x, z, curso, vuelta(rumbo / GRADO));
    const nuevos = ej.paso(
      {
        x,
        z,
        enElSuelo: false,
        parado: false,
        percance: false,
        oida: n.emisora?.estacion.id ?? null,
        identificada: puesta === FTV || (puestaEn !== null && t - puestaEn >= (o.morse ?? 10)),
        curso,
        desviacion: n.desviacion,
        toFrom: n.toFrom,
        bandera: n.bandera,
      },
      dt,
    );
    for (const s of nuevos) {
      if (s.que === "primera" || s.que === "cruce") {
        deVerdad.push(radialDeVerdad(puesta, x, z));
        alLeer.push({ x, z });
      }
      if (s.que === "primera") leidaLaPrimera = t;
    }
    sucesos.push(...nuevos);
    // La otra radio, a los `espera` segundos de leer la primera.
    if (leidaLaPrimera !== null && puesta === FTV && t - leidaLaPrimera >= (o.espera ?? 12)) {
      puesta = LTE;
      puestaEn = t;
    }
    // El OBS: seguido hasta FROM, y de grado en grado hasta centrar.
    if (t >= (o.obsA ?? 8) && n.desviacion !== null) {
      if (n.toFrom === "TO") curso = vuelta(curso + 5) || 360;
      else if (Math.abs(n.desviacion) >= 0.5) curso = vuelta(curso - Math.sign(n.desviacion)) || 360;
    }
    // El morro.
    let quiero = c.rumbo;
    if (leidaLaPrimera !== null && o.rumbo === "aLaOtra") quiero = Math.atan2(SEGUNDA.x - x, -(SEGUNDA.z - z));
    const falta = centrado((quiero - rumbo) / GRADO);
    rumbo += Math.max(-3, Math.min(3, falta * 0.8)) * GRADO * dt;
    x += (Math.sin(rumbo) * v + viento.x) * dt;
    z += (-Math.cos(rumbo) * v + viento.z) * dt;
  }
  return { sucesos, ejercicio: ej, deVerdad, alLeer };
}

const que = (s: readonly SucesoDelCruce[]): string[] => s.map((x) => x.que);
const elCruce = (s: readonly SucesoDelCruce[]) => {
  const c = s.find((x) => x.que === "cruce");
  if (c?.que !== "cruce") throw new Error("no hubo cruce");
  return c;
};

describe("el vuelo, con una sola NAV", () => {
  it("con el alisio, volando hacia FTV: los dos radiales leídos son los de verdad y la cruz cae encima del avión", () => {
    const { sucesos, ejercicio, deVerdad } = volar(ALISIO);
    expect(que(sucesos)).toEqual(["presentar", "primera", "otra", "identificada", "cruce", "cerrar"]);
    expect(ejercicio.cierre).toBe("hecho");
    const leidas = ejercicio.leidas;
    expect(leidas.map((r) => r.estacion.emisora.estacion.id)).toEqual(["FTV", "LTE"]);
    leidas.forEach((r, i) => expect(Math.abs(centrado(r.radial - deVerdad[i]!))).toBeLessThan(1));
    const c = elCruce(sucesos);
    expect(c.tarde).toBe(false);
    expect(c.cruce.cruz).not.toBeNull();
    expect(c.cruce.lejos).toBeLessThanOrEqual(c.cruce.tolerancia);
    // Y la tolerancia es la del VOR a esa distancia: menos de una milla.
    expect(c.cruce.tolerancia).toBeLessThan(MILLA);
    // Entre una lectura y otra pasó más de medio minuto: volando hacia FTV, su raya no cambió.
    expect(c.cruce.entreMedias).toBeGreaterThan(30);
    expect(c.cruce.corte).toBeGreaterThan(CORTE.min - 10);
  });

  it("en calma, igual", () => {
    const c = elCruce(volar(CALMA).sucesos);
    expect(c.tarde).toBe(false);
    expect(c.cruce.lejos).toBeLessThanOrEqual(c.cruce.tolerancia);
  });

  it("con el reactor a doscientos cincuenta nudos, más lejos, y la cruz igual en el avión", () => {
    const v = Math.min(ARAI.cruiseSpeed, 250 * NUDO);
    expect(Math.hypot(colocar(ALISIO, v).x - PRIMERA.x, colocar(ALISIO, v).z - PRIMERA.z)).toBeCloseTo(LEJOS.max, -2);
    const { sucesos, ejercicio } = volar(ALISIO, { velocidad: v });
    expect(ejercicio.cierre).toBe("hecho");
    const c = elCruce(sucesos);
    expect(c.tarde).toBe(false);
    expect(c.cruce.lejos).toBeLessThanOrEqual(c.cruce.tolerancia);
  });

  it("virando hacia la otra radio entre una y otra, la cruz se queda donde estaba el avión al leer la primera: lo que voló", () => {
    const { sucesos, alLeer } = volar(ALISIO, { rumbo: "aLaOtra", espera: 40 });
    const c = elCruce(sucesos);
    const [primera, segunda] = alLeer as [PuntoDelMundo, PuntoDelMundo];
    const volado = Math.hypot(segunda.x - primera.x, segunda.z - primera.z);
    // Un minuto largo a cien nudos: casi dos millas.
    expect(volado).toBeGreaterThan(1.5 * MILLA);
    expect(c.tarde).toBe(true);
    expect(c.cruce.lejos).toBeGreaterThan(c.cruce.tolerancia);
    const cruz = c.cruce.cruz!;
    // La cruz, cerca de donde se leyó la primera —el viraje la aparta un poco—, y del avión, lo que voló.
    expect(Math.hypot(cruz.x - primera.x, cruz.z - primera.z)).toBeLessThan(0.35 * volado);
    expect(c.cruce.lejos / volado).toBeGreaterThan(0.65);
    expect(c.cruce.lejos / volado).toBeLessThan(1.35);
  });

  it("si se quita la otra radio después de ponerla, se pide otra vez, una vez", () => {
    const c = colocar(CALMA);
    const ej = new DosRadiales(CRUCE, PRIMERA, SEGUNDA, ORIGEN);
    const base = {
      x: c.x,
      z: c.z,
      enElSuelo: false,
      parado: false,
      percance: false,
      identificada: false,
      bandera: false,
    };
    const r1 = radialDeVerdad(FTV, c.x, c.z);
    const s: SucesoDelCruce[] = [];
    s.push(...ej.paso({ ...base, oida: "FTV", curso: Math.round(r1), desviacion: 0.2, toFrom: "FROM" }, 0.5));
    s.push(...ej.paso({ ...base, oida: "LTE", curso: Math.round(r1), desviacion: 10, toFrom: "TO" }, 0.5));
    s.push(...ej.paso({ ...base, oida: null, curso: Math.round(r1), desviacion: null, toFrom: null }, 0.5));
    s.push(...ej.paso({ ...base, oida: null, curso: Math.round(r1), desviacion: null, toFrom: null }, 30));
    expect(que(s)).toEqual(["presentar", "primera", "otra"]);
    expect(ej.fase).toBe("otra");
  });

  it("la primera quitada antes de leerla se pide, una vez por cada vez que se quita", () => {
    const ej = new DosRadiales(CRUCE, PRIMERA, SEGUNDA, ORIGEN);
    const l = (oida: string | null) => ({
      x: 0,
      z: 0,
      enElSuelo: false,
      parado: false,
      percance: false,
      oida,
      identificada: false,
      curso: 100,
      desviacion: oida ? 10 : null,
      toFrom: oida ? ("FROM" as const) : null,
      bandera: !oida,
    });
    const s = [...ej.paso(l("FTV"), 1), ...ej.paso(l(null), 1), ...ej.paso(l(null), 60), ...ej.paso(l("FTV"), 1), ...ej.paso(l(null), 1)];
    expect(que(s)).toEqual(["presentar", "sintonizar", "sintonizar"]);
  });

  it("las rayas del plano salen de su radio y pasan por la cruz", () => {
    const { ejercicio } = volar(ALISIO);
    const cruz = ejercicio.cruce!.cruz!;
    for (const r of ejercicio.rayasEnElMundo()) {
      const largo = Math.hypot(r.hasta.x - r.desde.x, r.hasta.z - r.desde.z);
      const aLaCruz = Math.hypot(cruz.x - r.desde.x, cruz.z - r.desde.z);
      expect(largo).toBeGreaterThan(aLaCruz);
      // Lo que la cruz se aparta de la recta de la raya en el plano, m.
      const ux = (r.hasta.x - r.desde.x) / largo;
      const uz = (r.hasta.z - r.desde.z) / largo;
      const fuera = Math.abs((cruz.x - r.desde.x) * uz - (cruz.z - r.desde.z) * ux);
      expect(fuera).toBeLessThan(60);
    }
  });
});
