/**
 * **«Apuntá al viento», volado por un piloto de cinemática**: el morro donde
 * se diga, la verdadera del avión y el viento que lo empuja, sin navegador.
 *
 * Lo que tiene que salir, y es la lección: con el morro quieto en el puente,
 * uno se aparta de la recta lo que el viento de costado por el tiempo; con el
 * morro apartado lo que dice el triángulo de vientos, se llega encima.
 */

import { describe, expect, it } from "vitest";
import { ARAI, PYKASU } from "./aircraft";
import { ejercicioPorId, ejerciciosPara } from "./ejercicios";
import { centrado } from "./radio-de-navegacion";
import {
  colocacionDeLaDeriva,
  correccionDelViento,
  DE_LADO,
  Deriva,
  LLEGADA,
  sitioDeLaDeriva,
  vientoDeCostado,
  vientoTipico,
  type ColocacionDeLaDeriva,
  type SucesoDeLaDeriva,
} from "./deriva";
import { dondeCae } from "../world/entre-aerodromos";
import { SCENARIOS, oaciDe } from "../world/scenarios";
import { vientoComoVector } from "../world/meteo";

const GRADO = Math.PI / 180;
const NUDO = 0.514444;
const DERIVA = ejercicioPorId("deriva")!;
/** La avioneta a su crucero, m/s: unos cien nudos. */
const VERDADERA = 51;

const ASUNCION = SCENARIOS.find((s) => oaciDe(s) === "SGAS")!;
const ORIGEN = ASUNCION.aerodrome!.origin;
const REMANSO = sitioDeLaDeriva("SGAS")!;
const SITIO = { ...REMANSO, ...dondeCae(ORIGEN, REMANSO) };
const TIPICO = vientoTipico("SGAS")!;
const VIENTO = vientoComoVector({ vientoDe: TIPICO.de, vientoKt: TIPICO.kt } as never);
const CALMA = { x: 0, z: 0 };
const LLANO = (): number => 60;

const colocar = (viento: { x: number; z: number }, velocidad = VERDADERA): ColocacionDeLaDeriva =>
  colocacionDeLaDeriva({ sitio: SITIO, campo: { x: 0, z: 0 }, viento, velocidad, suelo: LLANO, cotaDeLaPista: 89 });

/**
 * **El piloto de cinemática**: cada décima de segundo, el morro hacia donde
 * diga `morro` (rad verdaderos, girando como mucho tres grados por segundo) y
 * el avión a la verdadera por el morro, más el viento. Devuelve lo que dijo
 * el ejercicio, dónde pasó más cerca del sitio y dónde estaba al acabar.
 */
function volar(
  viento: { x: number; z: number },
  morro: (p: { x: number; z: number; t: number; fase: string; rumbo: number }) => number,
  velocidad = VERDADERA,
  tope = 600,
): {
  sucesos: SucesoDeLaDeriva[];
  masCerca: number;
  ej: Deriva;
  t: number;
  enDeLado: number | null;
  fin: { x: number; z: number };
} {
  const c = colocar(viento, velocidad);
  const ej = new Deriva(DERIVA, SITIO);
  ej.colocar(c);
  let x = c.x;
  let z = c.z;
  let rumbo = c.rumbo;
  const sucesos: SucesoDeLaDeriva[] = [];
  let masCerca = Infinity;
  let enDeLado: number | null = null;
  const dt = 0.1;
  let t = 0;
  for (; t < tope && ej.fase !== "cerrada"; t += dt) {
    const quiero = morro({ x, z, t, fase: ej.fase, rumbo });
    const giro = Math.max(-3 * GRADO * dt, Math.min(3 * GRADO * dt, Math.atan2(Math.sin(quiero - rumbo), Math.cos(quiero - rumbo))));
    rumbo += giro;
    const vx = velocidad * Math.sin(rumbo) + viento.x;
    const vz = -velocidad * Math.cos(rumbo) + viento.z;
    x += vx * dt;
    z += vz * dt;
    masCerca = Math.min(masCerca, Math.hypot(SITIO.x - x, SITIO.z - z));
    const s = ej.paso({ x, z, vx, vz, rumbo: rumbo / GRADO, enElSuelo: false, parado: false, percance: false }, dt);
    if (enDeLado === null && s.some((u) => u.que === "deLado")) enDeLado = t;
    sucesos.push(...s);
  }
  return { sucesos, masCerca, ej, t, enDeLado, fin: { x, z } };
}

const marcacion = (p: { x: number; z: number }): number => Math.atan2(SITIO.x - p.x, -(SITIO.z - p.z));
const ques = (s: readonly SucesoDeLaDeriva[]): string[] => s.map((u) => u.que);

describe("«Apuntá al viento»: dónde vale", () => {
  it("en los campos con un sitio bajo cerca y viento típico: el puente en Asunción, el Auditorio en Los Rodeos", () => {
    expect(sitioDeLaDeriva("SGAS")?.id).toBe("puente-remanso");
    expect(sitioDeLaDeriva("GCXO")?.id).toBe("auditorio");
    expect(sitioDeLaDeriva("SGEN")?.id).toBe("puente-encarnacion");
    // Fuerteventura no tiene ninguno; La Gomera solo una cumbre, el Roque de Agando.
    expect(sitioDeLaDeriva("GCFV")).toBeNull();
    expect(sitioDeLaDeriva("GCGM")).toBeNull();
    expect(sitioDeLaDeriva(null)).toBeNull();
  });

  it("se ofrece desde Tukã a quien vuela con viento —no en Guyrami, cuyo modelo no lo sabe—, y no al helicóptero", () => {
    expect(ejerciciosPara("tuka", PYKASU, "SGAS").map((e) => e.id)).toContain("deriva");
    expect(ejerciciosPara("taguato-ruvicha", ARAI, "SGAS").map((e) => e.id)).toContain("deriva");
    expect(ejerciciosPara("guyrami", PYKASU, "SGAS").map((e) => e.id)).not.toContain("deriva");
    expect(ejerciciosPara("tuka", PYKASU, "GCFV").map((e) => e.id)).not.toContain("deriva");
  });
});

describe("«Apuntá al viento»: el triángulo de vientos", () => {
  it("la corrección es el arcoseno del viento de costado partido por la verdadera, contra el viento", () => {
    // Viento del oeste —va hacia el este—, camino al norte: empuja a la derecha.
    const delOeste = { x: 10 * NUDO, z: 0 };
    expect(vientoDeCostado(delOeste, 0)).toBeCloseTo(10 * NUDO, 6);
    expect(correccionDelViento(delOeste, 0, 100 * NUDO)).toBeCloseTo(-Math.asin(0.1) / GRADO, 6);
    // El alisio de veinte nudos a cien: once grados y medio.
    expect(Math.abs(correccionDelViento({ x: 0, z: 20 * NUDO }, Math.PI / 2, 100 * NUDO))).toBeCloseTo(11.54, 1);
    // De cara, nada.
    expect(correccionDelViento({ x: 0, z: 10 }, 0, 50)).toBeCloseTo(0, 6);
  });
});

describe("«Apuntá al viento»: dónde empieza", () => {
  it("en Asunción, a dos minutos y medio del puente, con el morro en él y el viento entero de costado", () => {
    const c = colocar(VIENTO);
    expect(TIPICO).toEqual({ de: 20, kt: 8 });
    expect(Math.hypot(SITIO.x - c.x, SITIO.z - c.z)).toBeCloseTo(VERDADERA * 150, 0);
    expect(Math.abs(centrado((marcacion(c) - c.rumbo) / GRADO))).toBeLessThan(0.01);
    // Todo el viento de costado: la recta va a noventa grados del aire.
    expect(Math.abs(vientoDeCostado(VIENTO, c.rumbo))).toBeCloseTo(8 * NUDO, 3);
    expect(c.lado).not.toBe(0);
    expect(Math.abs(c.correccion)).toBeCloseTo(Math.asin((8 * NUDO) / VERDADERA) / GRADO, 3);
    // Mil quinientos pies sobre la pista, en llano.
    expect(c.alto).toBeCloseTo(457.2, 0);
  });

  it("en calma, desde el campo hacia el puente", () => {
    const c = colocar(CALMA);
    expect(c.lado).toBe(0);
    expect(c.correccion).toBeCloseTo(0, 9);
    const delCampo = Math.atan2(SITIO.x, -SITIO.z);
    expect(Math.abs(centrado((c.rumbo - delCampo) / GRADO))).toBeLessThan(0.01);
  });
});

describe("«Apuntá al viento»: volado", () => {
  it("sin corregir, con el morro quieto en el rumbo de salida, se aparta lo que dice el viento por el tiempo", () => {
    const c = colocar(VIENTO);
    const v = volar(VIENTO, () => c.rumbo, VERDADERA, 155);
    // A los ciento cincuenta segundos, a la altura del puente, lo apartado es el viento de costado por el tiempo.
    const esperado = 8 * NUDO * 150;
    expect(v.ej.loQueSeAparto).toBeGreaterThan(esperado * 0.97);
    expect(v.ej.loQueSeAparto).toBeLessThan(esperado * 1.06);
    expect(v.masCerca).toBeGreaterThan(LLEGADA);
    // Y lo dice al llegar a ciento cincuenta metros: lo que se tarda es eso partido por el viento de costado.
    expect(ques(v.sucesos).slice(0, 2)).toEqual(["presentar", "deLado"]);
    expect(v.enDeLado!).toBeCloseTo(DE_LADO / (8 * NUDO), -0.5);
  });

  it("corrigiendo desde el principio con el triángulo de vientos, llega encima sin apartarse", () => {
    const c = colocar(VIENTO);
    const v = volar(VIENTO, (p) => marcacion(p) + c.correccion * GRADO);
    expect(v.masCerca).toBeLessThan(LLEGADA);
    expect(v.ej.loQueSeAparto).toBeLessThan(20);
    expect(ques(v.sucesos)).toEqual(["presentar", "llegaste", "cerrar"]);
    expect(v.ej.llegada).toBe("derecho");
    expect(v.ej.cierre).toBe("hecho");
  });

  it("apuntando al puente hasta verse de lado y después al viento: llega, y mide la corrección que pide el viento", () => {
    const c = colocar(VIENTO);
    let alViento = false;
    const v = volar(VIENTO, (p) => {
      if (p.fase !== "apuntar") alViento = true;
      return marcacion(p) + (alViento ? c.correccion * GRADO : 0);
    });
    expect(ques(v.sucesos)).toEqual(["presentar", "deLado", "alViento", "llegaste", "cerrar"]);
    const al = v.sucesos.find((u) => u.que === "alViento") as Extract<SucesoDeLaDeriva, { que: "alViento" }>;
    // 4,6° con ocho nudos a cien.
    expect(Math.abs(al.correccion - al.pide)).toBeLessThan(0.3);
    expect(Math.abs(al.pide)).toBeCloseTo(4.63, 1);
    expect(Math.sign(al.correccion)).toBe(-c.lado);
    expect(v.ej.llegada).toBe("derecho");
  });

  it("quien sigue con el morro en el puente llega también, por la curva, y se le cuenta", () => {
    const v = volar(VIENTO, (p) => marcacion(p));
    expect(ques(v.sucesos)).toEqual(["presentar", "deLado", "llegaste", "cerrar"]);
    expect(v.ej.llegada).toBe("enCurva");
    // La curva del perro se aparta hacia donde empuja el viento, más que lo que se pide ver.
    expect(v.ej.loQueSeAparto).toBeGreaterThan(DE_LADO);
  });

  it("quien pasa de largo vuelve, y acaba igual", () => {
    const c = colocar(VIENTO);
    let vuelve = false;
    const v = volar(VIENTO, (p) => {
      if (Math.hypot(SITIO.x - p.x, SITIO.z - p.z) > 9000) vuelve = true;
      return vuelve ? marcacion(p) + c.correccion * GRADO : c.rumbo;
    }, VERDADERA, 900);
    expect(ques(v.sucesos)).toContain("deLargo");
    expect(v.ej.cierre).toBe("hecho");
  });

  it("en calma, no se aparta: lo dice a mitad de camino y llega con el morro en el puente", () => {
    const c = colocar(CALMA);
    const v = volar(CALMA, () => c.rumbo);
    expect(ques(v.sucesos)).toEqual(["presentar", "enCalma", "llegaste", "cerrar"]);
    expect(v.ej.llegada).toBe("enCalma");
    // Se cierra al llegar a los cuatrocientos metros, y el puente sigue justo delante del morro.
    expect(v.masCerca).toBeLessThan(LLEGADA);
    expect(Math.abs(centrado((marcacion(v.fin) - c.rumbo) / GRADO))).toBeLessThan(0.1);
  });

  it("con el alisio de Los Rodeos y el Auditorio, la corrección sale más grande y se llega igual", () => {
    const t = vientoTipico("GCXO")!;
    const alisio = vientoComoVector({ vientoDe: t.de, vientoKt: t.kt } as never);
    expect(Math.abs(correccionDelViento(alisio, Math.atan2(alisio.x, -alisio.z) + Math.PI / 2, VERDADERA))).toBeCloseTo(
      Math.asin((t.kt * NUDO) / VERDADERA) / GRADO,
      3,
    );
  });
});
