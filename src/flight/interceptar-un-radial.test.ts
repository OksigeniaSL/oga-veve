/**
 * **«Interceptar un radial», volado por un piloto de prueba**: el ejercicio
 * entero con la radio de verdad (`leerNav`) y un avión de cinemática —rumbo,
 * la verdadera del avión, giros de régimen estándar como mucho y el viento
 * que lo empuja—, sin navegador.
 *
 * Lo que tiene que salir, y es la lección: con el OBS en el pedido la barra
 * sale a tope; cortándolo a cuarenta y cinco grados se despega; quien empieza
 * a virar en cuanto se despega llega al centro sin pasarse; quien espera a
 * verla en el centro se pasa y vuelve, y también acaba; y con el viento de
 * costado, el morro establecido no es el curso.
 */

import { describe, expect, it } from "vitest";
import { ARAI, MAINUMBY, PYKASU } from "./aircraft";
import { ejercicioPorId, ejerciciosPara } from "./ejercicios";
import { centrado, leerNav, rumboOrtodromico, vuelta } from "./radio-de-navegacion";
import { sitioDelMundo } from "./salto-bajo-tapa";
import { vorDelCampo } from "./en-que-radial-estoy";
import {
  A_TOPE,
  anticipacion,
  APARTADO,
  CERCA,
  colocacionDelCorte,
  CORRIGE,
  CORTADA,
  EN_EL_CENTRO,
  InterceptarUnRadial,
  PASADO,
  type SucesoDelCorte,
} from "./interceptar-un-radial";
import type { PuntoDelMundo } from "./seguir-la-aguja";
import { dondeCae } from "../world/entre-aerodromos";

const GRADO = Math.PI / 180;
const NUDO = 0.514444;
/** El origen del mundo de la prueba: cerca del aeropuerto de Fuerteventura. */
const ORIGEN = { lat: 28.45, lon: -13.865 };
const FTV = vorDelCampo("GCFV")!;
const ESTACION = { emisora: FTV, ...dondeCae(ORIGEN, FTV.estacion) };
const INTERCEPTAR = ejercicioPorId("interceptar")!;
const ALTITUD = 900;

/** Hacia dónde va un viento que viene `de` grados a `kt` nudos, en x, z del mundo. */
function vientoDe(de: number, kt: number): PuntoDelMundo {
  const ms = kt * NUDO;
  return { x: -Math.sin(de * GRADO) * ms, z: Math.cos(de * GRADO) * ms };
}

/** Fuerteventura al oeste de FTV y el mar al este, que es como está (FTV, en la costa de levante). */
const SUELO = (x: number): number => (x - ESTACION.x < -2000 ? 600 : 0);
/** El alisio de Fuerteventura: del treinta a veinte nudos. */
const ALISIO = vientoDe(30, 20);
const CALMA = { x: 0, z: 0 };

/** Lo que marca la NAV en un punto del mundo con un curso en el OBS. */
function nav(x: number, z: number, curso: number, rumbo = 0) {
  const s = sitioDelMundo(ORIGEN, x, z);
  return leerNav(FTV.mhz, curso, { lat: s.lat, lon: s.lon, altitud: ALTITUD, rumbo });
}

/** El radial de verdad, sin pasar por `leerNav`. */
function radialDeVerdad(x: number, z: number): number {
  const s = sitioDelMundo(ORIGEN, x, z);
  return vuelta(rumboOrtodromico(FTV.estacion, s) + FTV.declinacion);
}

const colocar = (viento: PuntoDelMundo, velocidad = PYKASU.cruiseSpeed) =>
  colocacionDelCorte({
    estacion: ESTACION,
    declinacion: FTV.declinacion,
    viento,
    velocidad,
    suelo: SUELO,
    cotaDeLaPista: 0,
  });

type Vuelo = {
  sucesos: SucesoDelCorte[];
  ejercicio: InterceptarUnRadial;
  /** Lo más que la barra se fue al otro lado del centro, grados. */
  sePaso: number;
  /** El radial de verdad al cerrar, y el rumbo verdadero del morro. */
  alCerrar: { radial: number; rumbo: number } | null;
  /** La barra cuando el piloto empezó a virar hacia el curso, grados. */
  empezoAVirarCon: number | null;
};

/**
 * **Un vuelo entero**: se coloca como lo coloca el juego y el piloto hace lo
 * que pide la instructora:
 *
 * - a los `obsA` segundos gira el OBS hasta el pedido, con la rueda que sigue
 *   girando: veinte grados por segundo;
 * - mantiene la cortada de cuarenta y cinco grados mientras la barra está a
 *   tope;
 * - `anticipa`: en cuanto la barra se despega, vira hacia el curso **de a
 *   poco**, con el rumbo del curso más cuatro veces y media lo que se aparta
 *   la barra —a tope, los cuarenta y cinco de la cortada; en el centro, el
 *   curso—. Si no, sigue cortando hasta que la barra llega al centro, y solo
 *   entonces vira: es quien no anticipa.
 * - Y en cuanto vira hacia el curso **apunta contra el viento** lo que pide:
 *   el ángulo de corrección del viento que sabe, como quien leyó el parte.
 *
 * Giros de régimen estándar como mucho: tres grados por segundo.
 */
function volar(
  viento: PuntoDelMundo,
  o: { velocidad?: number; anticipa?: boolean; obsA?: number; noCorrige?: boolean } = {},
): Vuelo {
  const v = o.velocidad ?? PYKASU.cruiseSpeed;
  const anticipa = o.anticipa ?? true;
  const c = colocar(viento, v);
  const ej = new InterceptarUnRadial(INTERCEPTAR, ESTACION, c.radial);
  let { x, z, rumbo } = c;
  let curso = c.curso;
  const sucesos: SucesoDelCorte[] = [];
  const cursoV = (c.radial - FTV.declinacion) * GRADO;
  // La corrección de viento de quien sabe el viento: el que empuja de costado, partido por la verdadera.
  const deCostado = viento.x * Math.cos(cursoV) + viento.z * Math.sin(cursoV);
  const wca = o.noCorrige ? 0 : -Math.asin(Math.max(-1, Math.min(1, deCostado / v))) / GRADO;
  let siguiendo = false;
  let sePaso = 0;
  let empezoAVirarCon: number | null = null;
  let alCerrar: Vuelo["alCerrar"] = null;
  const dt = 0.5;
  for (let t = 0; t < 1800 && ej.fase !== "cerrada"; t += dt) {
    const n = nav(x, z, curso, vuelta(rumbo / GRADO));
    const nuevos = ej.paso(
      {
        x,
        z,
        enElSuelo: false,
        parado: false,
        percance: false,
        sintonizada: n.emisora !== null,
        rumbo: vuelta(rumbo / GRADO),
        curso,
        desviacion: n.desviacion,
        toFrom: n.toFrom,
        bandera: n.bandera,
      },
      dt,
    );
    sucesos.push(...nuevos);
    if (ej.cierre !== null) alCerrar = { radial: radialDeVerdad(x, z), rumbo: vuelta(rumbo / GRADO) };
    if (t >= (o.obsA ?? 12) && curso !== c.radial) {
      const falta = centrado(c.radial - curso);
      curso = ((Math.round(curso + Math.max(-10, Math.min(10, falta))) % 360) + 360) % 360 || 360;
    }
    const d = curso === c.radial && n.toFrom === "FROM" ? n.desviacion : null;
    if (d !== null && ej.fase === "acercarse") {
      const lado = c.lado === 1 ? -1 : 1;
      if (!siguiendo && (anticipa || Math.sign(d) !== lado || Math.abs(d) < 0.2)) {
        siguiendo = true;
        empezoAVirarCon = Math.abs(d);
      }
      if (Math.sign(d) === -lado) sePaso = Math.max(sePaso, Math.abs(d));
    }
    let quiero = c.rumbo;
    if (siguiendo && d !== null) quiero = cursoV + (Math.max(-CORTADA, Math.min(CORTADA, 4.5 * d)) + wca) * GRADO;
    const falta = centrado((quiero - rumbo) / GRADO);
    rumbo += Math.max(-3, Math.min(3, falta * 0.8)) * GRADO * dt;
    x += (Math.sin(rumbo) * v + viento.x) * dt;
    z += (-Math.cos(rumbo) * v + viento.z) * dt;
  }
  return { sucesos, ejercicio: ej, sePaso, alCerrar, empezoAVirarCon };
}

const que = (s: readonly SucesoDelCorte[]): string[] => s.map((x) => x.que);

describe("dónde se ofrece «Interceptar un radial»", () => {
  it("en el peldaño de la radio, con NAV y en un campo con VOR, como «¿En qué radial estoy?»", () => {
    const ids = (p: Parameters<typeof ejerciciosPara>[0], a = PYKASU, oaci: string | null = "GCFV") =>
      ejerciciosPara(p, a, oaci).map((e) => e.id);
    expect(ids("taguato-ruvicha")).toContain("interceptar");
    for (const p of ["guyrami", "tuka", "taguato"] as const) expect(ids(p)).not.toContain("interceptar");
    expect(ids("taguato-ruvicha", MAINUMBY)).not.toContain("interceptar");
    for (const oaci of ["GCXO", "GCTS", "SGAS"]) expect(ids("taguato-ruvicha", PYKASU, oaci)).toContain("interceptar");
    for (const oaci of ["GCLA", "LECU"]) expect(ids("taguato-ruvicha", PYKASU, oaci)).not.toContain("interceptar");
    expect(INTERCEPTAR.averias).toEqual([]);
    expect(INTERCEPTAR.escena).toBe("radio");
  });
});

describe("dónde empieza", () => {
  const c = colocar(ALISIO);

  it("pide el 120 de FTV, de costado al alisio y sobre el mar, como «¿En qué radial estoy?»", () => {
    expect(c.radial).toBe(120);
    // Del lado del que viene el alisio, el del norte: en el 090, a cinco millas y alejándose.
    expect(c.lado).toBe(-1);
    expect(c.curso).toBe(120 - APARTADO);
    expect(c.lejos).toBe(CERCA.min);
    expect(Math.abs(centrado(radialDeVerdad(c.x, c.z) - c.curso))).toBeLessThan(0.5);
    expect(c.x).toBeGreaterThan(ESTACION.x);
    expect(c.alto).toBeCloseTo(3000 * 0.3048, 0);
  });

  it("con el morro a cuarenta y cinco grados del curso, cortándolo y alejándose", () => {
    const cursoV = c.radial - FTV.declinacion;
    expect(centrado(c.rumbo / GRADO - cursoV)).toBeCloseTo(CORTADA, 6);
    // Alejándose de la radio: el morro y la salida, del mismo lado.
    const fuera = Math.atan2(c.x - ESTACION.x, -(c.z - ESTACION.z));
    expect(Math.abs(centrado((c.rumbo - fuera) / GRADO))).toBeLessThan(90);
  });

  it("con el OBS en el radial de debajo la barra está en el centro; en el pedido, a tope y FROM", () => {
    const debajo = nav(c.x, c.z, c.curso);
    expect(debajo.toFrom).toBe("FROM");
    expect(Math.abs(debajo.desviacion!)).toBeLessThan(0.5);
    const pedido = nav(c.x, c.z, c.radial);
    expect(pedido.toFrom).toBe("FROM");
    expect(pedido.bandera).toBe(false);
    // A la derecha: el radial pedido queda hacia el sur, a la derecha del morro.
    expect(pedido.desviacion!).toBeGreaterThan(A_TOPE);
  });

  it("en calma, del lado de más grados; y un reactor, más lejos", () => {
    const calma = colocar(CALMA);
    expect(calma.lado).toBe(1);
    const reactor = colocar(ALISIO, Math.min(ARAI.cruiseSpeed, 250 * NUDO));
    expect(reactor.lejos).toBeGreaterThan(CERCA.min * 2);
    expect(reactor.lejos).toBeLessThanOrEqual(CERCA.max);
  });

  it("lo que se come el viraje: el radio por uno menos el coseno, trescientos cuarenta metros la avioneta", () => {
    expect(anticipacion(PYKASU.cruiseSpeed)).toBeCloseTo(336, 0);
  });
});

describe("el piloto de prueba que sale por el radial", () => {
  it("quien vira en cuanto la barra se despega llega al centro sin pasarse, y se queda corrigiendo el alisio", () => {
    const { sucesos, ejercicio, sePaso, alCerrar, empezoAVirarCon } = volar(ALISIO);
    expect(que(sucesos)).toEqual(["presentar", "aTope", "seMueve", "establecido", "cerrar"]);
    expect(ejercicio.cierre).toBe("hecho");
    expect(empezoAVirarCon!).toBeGreaterThan(5);
    expect(sePaso).toBeLessThan(PASADO);
    // En el radial: a menos de un grado del pedido, de verdad y sin `leerNav`.
    expect(Math.abs(centrado(alCerrar!.radial - 120))).toBeLessThan(EN_EL_CENTRO);
    // Y el morro, contra el viento: el alisio viene de la izquierda del curso.
    const est = sucesos.find((s) => s.que === "establecido");
    const correccion = est?.que === "establecido" ? est.correccion : 0;
    expect(correccion).toBeLessThan(-CORRIGE);
    expect(correccion).toBeGreaterThan(-15);
  });

  it("quien espera a ver la barra en el centro se pasa, vuelve y también acaba", () => {
    const { sucesos, ejercicio, sePaso, alCerrar } = volar(ALISIO, { anticipa: false });
    expect(que(sucesos)).toEqual(["presentar", "aTope", "seMueve", "pasado", "establecido", "cerrar"]);
    expect(sePaso).toBeGreaterThan(PASADO);
    expect(ejercicio.cierre).toBe("hecho");
    expect(Math.abs(centrado(alCerrar!.radial - 120))).toBeLessThan(EN_EL_CENTRO);
  });

  it("en calma, el morro establecido es el curso", () => {
    const { sucesos, ejercicio, sePaso } = volar(CALMA);
    expect(ejercicio.cierre).toBe("hecho");
    expect(sePaso).toBeLessThan(PASADO);
    const est = sucesos.find((s) => s.que === "establecido");
    expect(Math.abs(est?.que === "establecido" ? est.correccion : 99)).toBeLessThan(CORRIGE);
  });

  it("con el reactor a doscientos cincuenta nudos, desde más lejos, también", () => {
    const { ejercicio, sePaso } = volar(ALISIO, { velocidad: Math.min(ARAI.cruiseSpeed, 250 * NUDO) });
    expect(ejercicio.cierre).toBe("hecho");
    expect(sePaso).toBeLessThan(PASADO);
    const tarde = volar(ALISIO, { velocidad: Math.min(ARAI.cruiseSpeed, 250 * NUDO), anticipa: false });
    expect(que(tarde.sucesos)).toContain("pasado");
    expect(tarde.ejercicio.cierre).toBe("hecho");
  });

  it("con el OBS puesto tarde, con la barra ya despegada, no dice «a tope» y sigue", () => {
    const { sucesos, ejercicio } = volar(ALISIO, { obsA: 70 });
    expect(que(sucesos)).not.toContain("aTope");
    expect(que(sucesos)).toContain("seMueve");
    expect(ejercicio.cierre).toBe("hecho");
  });
});

describe("lo que se cuenta y lo que no", () => {
  const base = {
    x: ESTACION.x + 10000,
    z: ESTACION.z,
    enElSuelo: false,
    parado: false,
    percance: false,
    sintonizada: true,
    rumbo: 117,
    curso: 120,
    desviacion: 15 as number | null,
    toFrom: "FROM" as const,
    bandera: false,
  };

  it("con el OBS en otro número no avanza; y quitar la radio se pide una vez", () => {
    const ej = new InterceptarUnRadial(INTERCEPTAR, ESTACION, 120);
    expect(que(ej.paso({ ...base, curso: 90, desviacion: 0 }, 0.5))).toEqual(["presentar"]);
    expect(ej.fase).toBe("obs");
    expect(que(ej.paso({ ...base, sintonizada: false, desviacion: null, bandera: true }, 0.5))).toEqual(["sintonizar"]);
    expect(que(ej.paso({ ...base, sintonizada: false, desviacion: null, bandera: true }, 0.5))).toEqual([]);
    expect(que(ej.paso(base, 0.5))).toEqual(["aTope"]);
  });

  it("«te pasaste» se dice una vez aunque la barra vaya y vuelva", () => {
    const ej = new InterceptarUnRadial(INTERCEPTAR, ESTACION, 120);
    ej.paso(base, 0.5);
    ej.paso({ ...base, desviacion: 8 }, 0.5);
    const dichos: string[] = [];
    for (const d of [-3, 2, -4, 3, -5]) dichos.push(...que(ej.paso({ ...base, desviacion: d }, 0.5)));
    expect(dichos.filter((x) => x === "pasado")).toHaveLength(1);
    expect(ej.loQueSePaso).toBe(5);
  });

  it("un percance cierra el intento para repetirlo, y se repite desde el principio", () => {
    const ej = new InterceptarUnRadial(INTERCEPTAR, ESTACION, 120);
    ej.paso(base, 0.5);
    expect(que(ej.paso({ ...base, percance: true }, 0.5))).toEqual(["cerrar"]);
    expect(ej.cierre).toBe("otraVez");
    ej.reiniciar();
    expect(que(ej.paso(base, 0.5))).toEqual(["presentar", "aTope"]);
  });
});
