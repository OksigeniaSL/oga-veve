/**
 * **«¿En qué radial estoy?», volado por un piloto de prueba**: el ejercicio
 * entero con la radio de verdad (`leerNav`) y un avión de cinemática —rumbo,
 * la verdadera del avión y el viento que lo empuja—, sin navegador.
 *
 * Lo que tiene que salir, y es la lección: el curso del OBS que centra la
 * barra con FROM es el radial de la cuenta; girar el avión no lo cambia —en
 * el sitio, nada; volando, lo que se avanza al girar—; y al pasar por encima
 * de FTV sale la bandera y TO pasa a FROM, y ahí se acaba.
 */

import { describe, expect, it } from "vitest";
import { ARAI, MAINUMBY, PYKASU } from "./aircraft";
import { ejercicioPorId, ejerciciosPara } from "./ejercicios";
import { centrado, leerNav, MILLA, rumboOrtodromico, vuelta } from "./radio-de-navegacion";
import { sitioDelMundo } from "./salto-bajo-tapa";
import {
  CENTRADA,
  colocacionDelRadial,
  comoEnElObs,
  EnQueRadialEstoy,
  ENCIMA,
  LEJOS,
  OBS_APARTADO,
  PIDE_SINTONIZAR,
  vorDelCampo,
  type SucesoDelRadial,
} from "./en-que-radial-estoy";
import { rumboEnElMundo, type PuntoDelMundo } from "./seguir-la-aguja";
import { dondeCae } from "../world/entre-aerodromos";

const GRADO = Math.PI / 180;
const NUDO = 0.514444;
/** El origen del mundo de la prueba: cerca del aeropuerto de Fuerteventura. */
const ORIGEN = { lat: 28.45, lon: -13.865 };
const FTV = vorDelCampo("GCFV")!;
const ESTACION = { emisora: FTV, ...dondeCae(ORIGEN, FTV.estacion) };
const RADIAL = ejercicioPorId("radial")!;
const ALTITUD = 900;

/** Hacia dónde va un viento que viene `de` grados a `kt` nudos, en x, z del mundo. */
function vientoDe(de: number, kt: number): PuntoDelMundo {
  const ms = kt * NUDO;
  return { x: -Math.sin(de * GRADO) * ms, z: Math.cos(de * GRADO) * ms };
}

/**
 * El suelo de la prueba: Fuerteventura al oeste de FTV y el mar al este, que
 * es como está de verdad (FTV está en la costa de levante).
 */
const SUELO = (x: number): number => (x - ESTACION.x < -2000 ? 600 : 0);

/** El alisio de Fuerteventura: `vientoDominante` del escenario, del treinta a veinte nudos. */
const ALISIO = vientoDe(30, 20);
const CALMA = { x: 0, z: 0 };

/** Lo que marca la NAV en un punto del mundo con un curso en el OBS. */
function nav(x: number, z: number, curso: number, rumbo = 0) {
  const s = sitioDelMundo(ORIGEN, x, z);
  return leerNav(FTV.mhz, curso, { lat: s.lat, lon: s.lon, altitud: ALTITUD, rumbo });
}

/** El radial de verdad, sin pasar por `leerNav`: el rumbo de la estación al avión con su norte. */
function radialDeVerdad(x: number, z: number): number {
  const s = sitioDelMundo(ORIGEN, x, z);
  return vuelta(rumboOrtodromico(FTV.estacion, s) + FTV.declinacion);
}

type Vuelo = {
  sucesos: SucesoDelRadial[];
  ejercicio: EnQueRadialEstoy;
  /** Lo que marcaba todo al centrar la barra, para compararlo. */
  alCentrar: { x: number; z: number; curso: number } | null;
  segundos: number;
};

/**
 * **Un vuelo entero**: se coloca como lo coloca el juego, se sintoniza a los
 * cinco segundos, el morse acaba a los quince, y el piloto hace lo que pide
 * la instructora:
 *
 * - gira el OBS de grado en grado, dos toques por segundo, hacia donde se
 *   centra la barra, hasta que se centra con FROM;
 * - gira el avión hacia la radio a régimen estándar, tres grados por
 *   segundo: noventa grados, porque empieza de través;
 * - cuando se le pide, gira el OBS media vuelta —con la rueda girando, diez
 *   grados por paso— y vuela con la barra: el rumbo del curso más tres veces
 *   lo que se aparta, con un tope de treinta.
 *
 * `conFrom`: no gira el OBS media vuelta, y va a la radio con FROM, siguiendo
 * la barra del HSI al revés de la flecha. También tiene que pasar.
 */
function volar(viento: PuntoDelMundo, o: { velocidad?: number; sintonizarA?: number; conFrom?: boolean } = {}): Vuelo {
  const v = o.velocidad ?? PYKASU.cruiseSpeed;
  const c = colocacionDelRadial({
    estacion: ESTACION,
    declinacion: FTV.declinacion,
    viento,
    velocidad: v,
    suelo: SUELO,
    cotaDeLaPista: 0,
  });
  const ej = new EnQueRadialEstoy(RADIAL, ESTACION);
  let { x, z, rumbo } = c;
  let curso = c.curso;
  const sucesos: SucesoDelRadial[] = [];
  let alCentrar: Vuelo["alCentrar"] = null;
  let quiero: number | null = null;
  let aLaRadio = false;
  const dt = 0.5;
  let t = 0;
  for (; t < 3600 && ej.fase !== "cerrada"; t += dt) {
    const sintonizada = t >= (o.sintonizarA ?? 5);
    const n = nav(x, z, curso, vuelta(rumbo / GRADO));
    const nuevos = ej.paso(
      {
        x,
        z,
        enElSuelo: false,
        parado: false,
        percance: false,
        sintonizada: sintonizada && n.emisora !== null,
        identificada: t >= 15,
        rumbo: vuelta(rumbo / GRADO),
        curso,
        desviacion: sintonizada ? n.desviacion : null,
        toFrom: sintonizada ? n.toFrom : null,
        bandera: sintonizada ? n.bandera : true,
      },
      dt,
    );
    sucesos.push(...nuevos);
    for (const s of nuevos) {
      if (s.que === "centrada") {
        alCentrar = { x, z, curso };
        // De través al radial: la radio queda a noventa grados de un lado.
        quiero = rumboEnElMundo({ x, z }, ESTACION);
      }
      if (s.que === "haciaLaRadio") aLaRadio = true;
    }
    if (ej.fase === "centrar" && t >= 16 && n.desviacion !== null) {
      // Con FROM, la barra a la izquierda es el radial a más grados: el OBS, hacia arriba.
      curso = comoEnElObs(curso + (n.desviacion < 0 ? 1 : -1));
    }
    if (aLaRadio) {
      const destino = comoEnElObs(alCentrar!.curso + 180);
      if (!o.conFrom && curso !== destino) {
        const falta = centrado(destino - curso);
        curso = comoEnElObs(curso + Math.max(-10, Math.min(10, falta)));
      } else if (n.desviacion !== null) {
        // Con TO, el curso es hacia la radio; con FROM, la radio queda a la cola de la flecha.
        const adelante = n.toFrom === "FROM" || o.conFrom ? curso + 180 : curso;
        const signo = o.conFrom ? -1 : 1;
        const mag = adelante + signo * Math.max(-30, Math.min(30, 3 * n.desviacion));
        quiero = (mag - FTV.declinacion) * GRADO;
      }
    }
    if (quiero !== null) {
      const falta = centrado((quiero - rumbo) / GRADO);
      rumbo += Math.max(-3, Math.min(3, falta * 0.8)) * GRADO * dt;
    }
    x += (Math.sin(rumbo) * v + viento.x) * dt;
    z += (-Math.cos(rumbo) * v + viento.z) * dt;
  }
  return { sucesos, ejercicio: ej, alCentrar, segundos: t };
}

const que = (s: readonly SucesoDelRadial[]): string[] => s.map((x) => x.que);

describe("dónde se ofrece «¿En qué radial estoy?»", () => {
  it("en el peldaño de la radio, con NAV y en un campo con VOR", () => {
    const ids = (p: Parameters<typeof ejerciciosPara>[0], a = PYKASU, oaci: string | null = "GCFV") =>
      ejerciciosPara(p, a, oaci).map((e) => e.id);
    expect(ids("taguato-ruvicha")).toContain("radial");
    for (const p of ["guyrami", "tuka", "taguato"] as const) expect(ids(p)).not.toContain("radial");
    // El biplano no lleva NAV.
    expect(ids("taguato-ruvicha", MAINUMBY)).not.toContain("radial");
    // Se vende al mundo: Los Rodeos, Tenerife Sur y Asunción tienen VOR; La Palma y Cuatro Vientos, no.
    for (const oaci of ["GCXO", "GCTS", "SGAS"]) expect(ids("taguato-ruvicha", PYKASU, oaci)).toContain("radial");
    for (const oaci of ["GCLA", "LECU"]) expect(ids("taguato-ruvicha", PYKASU, oaci)).not.toContain("radial");
    expect(ejerciciosPara("taguato-ruvicha", PYKASU).map((e) => e.id)).not.toContain("radial");
    expect(RADIAL.averias).toEqual([]);
    expect(RADIAL.escena).toBe("radio");
  });

  it("FTV es el VOR de Fuerteventura, en el 114.1, con su «3°W»", () => {
    expect(FTV.estacion.id).toBe("FTV");
    expect(FTV.mhz).toBeCloseTo(114.1);
    expect(FTV.declinacion).toBe(3);
    expect(FTV.declinacionPublicada).toBe(true);
  });
});

describe("dónde empieza", () => {
  const c = colocacionDelRadial({
    estacion: ESTACION,
    declinacion: FTV.declinacion,
    viento: ALISIO,
    velocidad: PYKASU.cruiseSpeed,
    suelo: SUELO,
    cotaDeLaPista: 25,
  });

  it("en un radial redondo de costado al alisio, del lado del mar: el 120 de FTV", () => {
    // Del 030 viene el alisio: de costado son el 120 y el 300, y el 300 es la isla.
    expect(c.radial).toBe(120);
    expect(c.x).toBeGreaterThan(ESTACION.x);
    // A ocho minutos de la avioneta, entre doce y treinta millas.
    expect(c.lejos).toBeCloseTo(PYKASU.cruiseSpeed * 480);
    expect(c.lejos).toBeGreaterThanOrEqual(LEJOS.min);
    // Y es el radial que marca la radio de verdad, a menos de medio grado del redondo.
    expect(Math.abs(centrado(nav(c.x, c.z, 120).radial! - 120))).toBeLessThan(0.5);
    expect(Math.abs(centrado(radialDeVerdad(c.x, c.z) - 120))).toBeLessThan(0.5);
    expect(c.alto).toBeCloseTo(3000 * 0.3048, 0);
  });

  it("con el OBS veinte grados apartado: FROM y la barra a tope", () => {
    expect(c.curso).toBe(120 - OBS_APARTADO);
    const n = nav(c.x, c.z, c.curso);
    expect(n.toFrom).toBe("FROM");
    expect(n.bandera).toBe(false);
    // A la izquierda: el radial queda a más grados que el curso.
    expect(n.desviacion!).toBeLessThan(-10);
  });

  it("con el morro de través al radial y contra el viento", () => {
    const fuera = rumboEnElMundo(ESTACION, c);
    expect(Math.abs(Math.abs(centrado((c.rumbo - fuera) / GRADO)) - 90)).toBeLessThan(0.01);
    // Contra el viento: el avance y el aire van al revés.
    expect(Math.sin(c.rumbo) * ALISIO.x - Math.cos(c.rumbo) * ALISIO.z).toBeLessThan(0);
  });
});

describe("girar en el sitio no mueve el radial", () => {
  it("con el avión quieto en un punto, ningún rumbo cambia el radial, la barra ni el TO/FROM", () => {
    const c = colocacionDelRadial({
      estacion: ESTACION,
      declinacion: FTV.declinacion,
      viento: ALISIO,
      velocidad: PYKASU.cruiseSpeed,
      suelo: SUELO,
      cotaDeLaPista: 0,
    });
    const base = nav(c.x, c.z, 117, 0);
    for (let rumbo = 0; rumbo < 360; rumbo += 15) {
      const n = nav(c.x, c.z, 117, rumbo);
      expect(n.radial).toBe(base.radial);
      expect(n.desviacion).toBe(base.desviacion);
      expect(n.toFrom).toBe(base.toFrom);
    }
  });
});

describe("el piloto de prueba que busca su radial y va a la radio", () => {
  it("con el alisio: centra la barra en el radial de verdad, gira sin moverla, y se acaba al pasar FTV con la bandera y FROM", () => {
    const { sucesos, ejercicio, alCentrar, segundos } = volar(ALISIO);
    expect(que(sucesos)).toEqual([
      "presentar",
      "identificada",
      "centrada",
      "giro",
      "haciaLaRadio",
      "pasada",
      "cerrar",
    ]);
    expect(ejercicio.cierre).toBe("hecho");
    // El curso que centra la barra es el radial de la cuenta.
    const centrada = sucesos.find((s) => s.que === "centrada");
    expect(centrada?.que === "centrada" && centrada.radial).toBe(alCentrar!.curso);
    expect(Math.abs(centrado(alCentrar!.curso - radialDeVerdad(alCentrar!.x, alCentrar!.z)))).toBeLessThan(CENTRADA);
    // Girar noventa grados mueve la barra menos de lo que se tiene por centrada… casi.
    const giro = sucesos.find((s) => s.que === "giro");
    expect(giro?.que === "giro" && giro.giro).toBeGreaterThanOrEqual(80);
    expect(giro?.que === "giro" && giro.seMovio).toBeLessThan(3);
    // Al pasar: la bandera encima y TO a FROM.
    const pasada = sucesos.find((s) => s.que === "pasada");
    expect(pasada?.que === "pasada" && `${pasada.de}→${pasada.a}`).toBe("TO→FROM");
    expect(ejercicio.vioLaBandera).toBe(true);
    // Ocho minutos de camino, más lo que se tarda en buscar el radial.
    expect(segundos).toBeGreaterThan(400);
  });

  it("en calma, igual", () => {
    const { sucesos, ejercicio } = volar(CALMA);
    expect(que(sucesos).slice(-2)).toEqual(["pasada", "cerrar"]);
    expect(que(sucesos)).toContain("giro");
    expect(ejercicio.cierre).toBe("hecho");
  });

  it("con el reactor a doscientos cincuenta nudos, desde más lejos para que la barra siga quieta al girar", () => {
    const { sucesos, ejercicio } = volar(ALISIO, { velocidad: Math.min(ARAI.cruiseSpeed, 250 * NUDO) });
    const giro = sucesos.find((s) => s.que === "giro");
    expect(giro?.que === "giro" && giro.seMovio).toBeLessThan(3.5);
    expect(ejercicio.cierre).toBe("hecho");
  });

  it("quien va a la radio con FROM también pasa, y FROM pasa a TO", () => {
    const { sucesos, ejercicio } = volar(ALISIO, { conFrom: true });
    const pasada = sucesos.find((s) => s.que === "pasada");
    expect(pasada?.que === "pasada" && `${pasada.de}→${pasada.a}`).toBe("FROM→TO");
    expect(ejercicio.cierre).toBe("hecho");
  });

  it("sin sintonizar, se pide una vez y no vuelve por el reloj", () => {
    const { sucesos } = volar(ALISIO, { sintonizarA: 300 });
    expect(sucesos.filter((s) => s.que === "sintonizar")).toHaveLength(1);
    expect(que(sucesos).indexOf("sintonizar")).toBe(1);
    expect(PIDE_SINTONIZAR).toBeLessThan(300);
  });
});

describe("pasar es que TO y FROM se den la vuelta cerca", () => {
  const base = {
    enElSuelo: false,
    parado: false,
    percance: false,
    sintonizada: true,
    identificada: true,
    rumbo: 0,
    curso: 300,
    desviacion: 0,
    bandera: false,
  };

  it("cruzar de través lejos de la radio no es haber llegado", () => {
    const ej = new EnQueRadialEstoy(RADIAL, ESTACION);
    const lejos = { x: ESTACION.x + 3 * ENCIMA, z: ESTACION.z };
    ej.paso({ ...base, ...lejos, toFrom: "TO" }, 0.5);
    const s = ej.paso({ ...base, ...lejos, toFrom: "FROM" }, 0.5);
    expect(que(s)).not.toContain("pasada");
    expect(ej.fase).not.toBe("cerrada");
  });

  it("un percance cierra el intento para repetirlo, y se repite desde el principio", () => {
    const ej = new EnQueRadialEstoy(RADIAL, ESTACION);
    const nada = { ...base, x: 0, z: 0, sintonizada: false, identificada: false, toFrom: null, desviacion: null, bandera: true };
    ej.paso(nada, 0.5);
    expect(que(ej.paso({ ...nada, percance: true }, 0.5))).toEqual(["cerrar"]);
    expect(ej.cierre).toBe("otraVez");
    ej.reiniciar();
    expect(que(ej.paso(nada, 0.5))).toEqual(["presentar"]);
  });

  it("la milla de la cuenta es la de la radio", () => {
    expect(ENCIMA).toBe(3 * MILLA);
  });
});
