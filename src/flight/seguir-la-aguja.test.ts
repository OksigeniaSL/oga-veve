/**
 * **«Seguí la aguja», volado por un piloto de prueba**: el ejercicio entero
 * con la radio de verdad (`leerAdf`) y un avión de cinemática —rumbo, la
 * verdadera de la avioneta y el viento que lo empuja—, sin navegador.
 *
 * Lo que tiene que salir, y es la lección: con el alisio de Fuerteventura de
 * costado, quien sigue la aguja con el morro clavado en ella hace la curva del
 * perro; sin viento, la estela sale recta; y en los dos casos el ejercicio se
 * acaba al pasar por encima de FV, cuando la aguja da la vuelta.
 */

import { describe, expect, it } from "vitest";
import { MAINUMBY, PYKASU } from "./aircraft";
import { ejercicioPorId, ejerciciosPara } from "./ejercicios";
import { centrado, leerAdf } from "./radio-de-navegacion";
import { sitioDelMundo } from "./salto-bajo-tapa";
import {
  APARTADO_AL_EMPEZAR,
  colocacionDeLaAguja,
  ENCIMA,
  ndbDelCampo,
  PIDE_SINTONIZAR,
  rumboEnElMundo,
  SE_CURVA,
  SeguirLaAguja,
  type PuntoDelMundo,
  type SucesoDeLaAguja,
} from "./seguir-la-aguja";
import { dondeCae } from "../world/entre-aerodromos";

const GRADO = Math.PI / 180;
const NUDO = 0.514444;
/** El origen del mundo de la prueba: cerca del aeropuerto de Fuerteventura. */
const ORIGEN = { lat: 28.45, lon: -13.865 };
const FV = ndbDelCampo("GCFV")!;
const ESTACION = { emisora: FV, ...dondeCae(ORIGEN, FV.estacion) };
const AGUJA = ejercicioPorId("aguja")!;

/** Hacia dónde va un viento que viene `de` grados a `kt` nudos, en x, z del mundo. */
function vientoDe(de: number, kt: number): PuntoDelMundo {
  const ms = kt * NUDO;
  return { x: -Math.sin(de * GRADO) * ms, z: Math.cos(de * GRADO) * ms };
}

/**
 * El suelo de la prueba: Fuerteventura al noroeste de FV y el mar al sudeste,
 * que es como está de verdad (FV está en la costa de levante).
 */
const SUELO = (x: number, z: number): number =>
  (x - ESTACION.x) * -0.7 + (z - ESTACION.z) * -0.7 > 2000 ? 600 : 0;

/** El alisio de Fuerteventura: `vientoDominante` del escenario, del treinta a veinte nudos. */
const ALISIO = vientoDe(30, 20);
const CALMA = { x: 0, z: 0 };

type Piloto = "sigue" | "corrige";

/**
 * **Un vuelo entero**: se coloca como lo coloca el juego, se sintoniza a los
 * cinco segundos, el morse acaba a los quince, y el piloto vuela.
 *
 * - `sigue`: gira para llevar la aguja arriba, a régimen estándar —tres
 *   grados por segundo— como mucho. Es lo que pide el ejercicio la primera vez.
 * - `corrige`: igual hasta que la instructora pide apuntar al viento; desde
 *   ahí, el morro hacia la estación más el ángulo que se come el viento, que
 *   deja la aguja quieta a un lado.
 */
function volar(
  viento: PuntoDelMundo,
  piloto: Piloto,
  o: { velocidad?: number; sintonizarA?: number; desviado?: number } = {},
): {
  sucesos: SucesoDeLaAguja[];
  ejercicio: SeguirLaAguja;
  estela: PuntoDelMundo[];
  segundos: number;
} {
  const v = o.velocidad ?? PYKASU.cruiseSpeed;
  const c = colocacionDeLaAguja({
    estacion: ESTACION,
    viento,
    velocidad: v,
    suelo: SUELO,
    cotaDeLaPista: 0,
  });
  const ej = new SeguirLaAguja(AGUJA, ESTACION);
  let x = c.x + (o.desviado ?? 0);
  let z = c.z;
  let rumbo = c.rumbo;
  const sucesos: SucesoDeLaAguja[] = [];
  const estela: PuntoDelMundo[] = [];
  let corrigiendo = false;
  const dt = 0.5;
  let t = 0;
  for (; t < 3600 && ej.fase !== "cerrada"; t += dt) {
    const sitio = sitioDelMundo(ORIGEN, x, z);
    const sintonizada = t >= (o.sintonizarA ?? 5);
    const adf = leerAdf(sintonizada ? FV.mhz : null, {
      lat: sitio.lat,
      lon: sitio.lon,
      altitud: 900,
      rumbo: ((rumbo / GRADO) % 360 + 360) % 360,
    });
    const nuevos = ej.paso(
      {
        x,
        z,
        enElSuelo: false,
        parado: false,
        percance: false,
        sintonizada: sintonizada && adf.emisora !== null,
        identificada: t >= 15,
        relativa: adf.relativa,
      },
      dt,
    );
    sucesos.push(...nuevos);
    if (nuevos.some((s) => s.que === "corregir") && piloto === "corrige") corrigiendo = true;
    // El piloto: con la aguja, gira; sin ella, recto.
    if (adf.relativa !== null && t >= 15) {
      let quiero = centrado(adf.relativa);
      if (corrigiendo) {
        // El ángulo de corrección: lo que se come el viento de costado de la recta a la estación.
        const hacia = rumboEnElMundo({ x, z }, ESTACION);
        const costado = viento.x * Math.cos(hacia) + viento.z * Math.sin(hacia);
        quiero -= Math.asin(Math.max(-1, Math.min(1, costado / v))) / GRADO;
      }
      const giro = Math.max(-3, Math.min(3, quiero * 0.5));
      rumbo += giro * GRADO * dt;
    }
    x += (Math.sin(rumbo) * v + viento.x) * dt;
    z += (-Math.cos(rumbo) * v + viento.z) * dt;
    estela.push({ x, z });
  }
  return { sucesos, ejercicio: ej, estela, segundos: t };
}

const que = (s: readonly SucesoDeLaAguja[]): string[] => s.map((x) => x.que);

describe("dónde se ofrece «Seguí la aguja»", () => {
  it("en el peldaño de la radio, con ADF y en un campo con NDB", () => {
    const ids = (p: Parameters<typeof ejerciciosPara>[0], a = PYKASU, oaci: string | null = "GCFV") =>
      ejerciciosPara(p, a, oaci).map((e) => e.id);
    expect(ids("taguato-ruvicha")).toContain("aguja");
    // En los de abajo no hay aguja en el cuadro ni frecuencia en la carta.
    for (const p of ["guyrami", "tuka", "taguato"] as const) expect(ids(p)).not.toContain("aguja");
    // El biplano no lleva ADF.
    expect(ids("taguato-ruvicha", MAINUMBY)).not.toContain("aguja");
    // Tenerife Sur no tiene NDB; Pedro Juan Caballero, sí.
    expect(ids("taguato-ruvicha", PYKASU, "GCTS")).not.toContain("aguja");
    expect(ids("taguato-ruvicha", PYKASU, "SGPJ")).toContain("aguja");
    // Sin saber el campo, no: pide uno con NDB.
    expect(ejerciciosPara("taguato-ruvicha", PYKASU).map((e) => e.id)).not.toContain("aguja");
    expect(AGUJA.averias).toEqual([]);
    expect(AGUJA.escena).toBe("radio");
  });

  it("FV es el NDB de Fuerteventura, en el 397", () => {
    expect(FV.estacion.id).toBe("FV");
    expect(FV.mhz).toBeCloseTo(0.397);
  });
});

describe("dónde empieza", () => {
  it("con el viento de costado, a seis minutos, por el lado más bajo y con el morro apartado", () => {
    const c = colocacionDeLaAguja({ estacion: ESTACION, viento: ALISIO, velocidad: 60, suelo: SUELO, cotaDeLaPista: 25 });
    expect(c.lejos).toBeCloseTo(60 * 360);
    // Del lado del mar: al sudeste de la estación, x mayor y z mayor (z es el sur).
    expect(c.x).toBeGreaterThan(ESTACION.x);
    expect(c.z).toBeGreaterThan(ESTACION.z);
    // El camino a la estación, de costado al viento.
    const hacia = rumboEnElMundo(c, ESTACION);
    const va = Math.atan2(ALISIO.x, -ALISIO.z);
    expect(Math.abs(Math.cos(hacia - va))).toBeLessThan(0.02);
    // Y el morro, treinta grados apartado.
    expect(Math.abs(centrado((c.rumbo - hacia) / GRADO))).toBeCloseTo(APARTADO_AL_EMPEZAR / GRADO, 5);
    // Tres mil pies sobre la pista, que el mar no pide más.
    expect(c.alto).toBeCloseTo(3000 * 0.3048, 0);
  });
});

describe("el piloto de prueba que sigue la aguja", () => {
  it("con el alisio de costado hace la curva del perro, y se acaba al pasar por encima de FV", () => {
    const { sucesos, ejercicio, segundos } = volar(ALISIO, "sigue");
    expect(que(sucesos).slice(0, 2)).toEqual(["presentar", "identificada"]);
    expect(que(sucesos)).toContain("curva");
    expect(que(sucesos)).toContain("corregir");
    expect(que(sucesos).slice(-2)).toEqual(["pasada", "cerrar"]);
    expect(ejercicio.cierre).toBe("hecho");
    // La estela se aparta de la recta: más de un kilómetro, un seis por ciento del camino.
    const lejos = ejercicio.lejosAlEmpezar!;
    expect(ejercicio.desvio).toBeGreaterThan(1000);
    expect(ejercicio.desvio / lejos).toBeGreaterThan(0.05);
    // Y el lado: el alisio viene del nordeste y la empuja al sudoeste, a la izquierda de quien va al noroeste.
    const curva = sucesos.find((s) => s.que === "curva");
    expect(curva?.que === "curva" && curva.lado).toBe("izquierda");
    const corregir = sucesos.find((s) => s.que === "corregir");
    expect(corregir?.que === "corregir" && corregir.lado).toBe("derecha");
    // La curva del perro es más larga que la recta: más de seis minutos.
    expect(segundos).toBeGreaterThan(360);
  });

  it("sin viento, la estela sale recta: ni curva ni corrección, y también se acaba al pasar", () => {
    const { sucesos, ejercicio } = volar(CALMA, "sigue");
    expect(que(sucesos)).not.toContain("curva");
    expect(que(sucesos)).not.toContain("corregir");
    expect(que(sucesos).slice(-2)).toEqual(["pasada", "cerrar"]);
    expect(ejercicio.cierre).toBe("hecho");
    expect(ejercicio.desvio).toBeLessThan(100);
    expect(ejercicio.desvio).toBeLessThan(SE_CURVA * ejercicio.lejosAlEmpezar! * 0.25);
  });

  it("quien apunta al viento cuando se le pide deja la aguja quieta a un lado, y se le dice", () => {
    const sigue = volar(ALISIO, "sigue");
    const corrige = volar(ALISIO, "corrige");
    expect(que(corrige.sucesos)).toContain("asiVa");
    expect(que(corrige.sucesos).slice(-2)).toEqual(["pasada", "cerrar"]);
    // Y llega antes: la recta es más corta que la curva.
    expect(corrige.segundos).toBeLessThan(sigue.segundos);
  });

  it("con el reactor a doscientos cincuenta nudos la curva es menor, pero sale", () => {
    const { sucesos, ejercicio } = volar(ALISIO, "sigue", { velocidad: 250 * NUDO });
    expect(que(sucesos)).toContain("curva");
    expect(ejercicio.cierre).toBe("hecho");
  });

  it("sin sintonizar, se pide una vez y no vuelve por el reloj", () => {
    const { sucesos } = volar(ALISIO, "sigue", { sintonizarA: 400 });
    const pedidas = sucesos.filter((s) => s.que === "sintonizar");
    expect(pedidas).toHaveLength(1);
    expect(que(sucesos).indexOf("sintonizar")).toBe(1);
    expect(PIDE_SINTONIZAR).toBeLessThan(400);
  });
});

describe("pasar por encima es que la aguja dé la vuelta cerca", () => {
  it("dar media vuelta lejos de la estación no es haber llegado", () => {
    const ej = new SeguirLaAguja(AGUJA, ESTACION);
    const lejos = { x: ESTACION.x + 3 * ENCIMA, z: ESTACION.z };
    const base = { ...lejos, enElSuelo: false, parado: false, percance: false, sintonizada: true, identificada: true };
    ej.paso({ ...base, relativa: 0 }, 0.5);
    const s = ej.paso({ ...base, relativa: 180 }, 0.5);
    expect(que(s)).not.toContain("pasada");
    expect(ej.fase).toBe("seguir");
  });

  it("un percance cierra el intento para repetirlo, y se repite desde el principio", () => {
    const ej = new SeguirLaAguja(AGUJA, ESTACION);
    const base = { x: 0, z: 0, enElSuelo: false, parado: false, sintonizada: false, identificada: false, relativa: null };
    ej.paso({ ...base, percance: false }, 0.5);
    expect(que(ej.paso({ ...base, percance: true }, 0.5))).toEqual(["cerrar"]);
    expect(ej.cierre).toBe("otraVez");
    ej.reiniciar();
    expect(que(ej.paso({ ...base, percance: false }, 0.5))).toEqual(["presentar"]);
  });
});
