/**
 * **La vuelta de espera, por donde no pasa nadie.** Ver `vueltaSegura` en
 * `trafico.ts`.
 *
 * Salió en la ronda de cierre de la tanda 26: en dos de cinco vuelos enteros
 * desde Los Rodeos, una avioneta de las que esperan turno dio su vuelta hacia
 * fuera y la volaba al revés por el viento en cola de quien juega. Medido con
 * esta misma mesa en seiscientos vuelos —las dos cabeceras, cinco aviones—: a
 * menos de trescientos metros y ciento cincuenta de altura en doce, y la peor
 * no era de frente: un turbohélice dándola encima de la base del JAZ 90, a
 * cuarenta y seis metros y a su misma altura.
 *
 * Se vuela en la mesa de `mesa-del-circuito-de-prueba.ts`, que monta lo que
 * monta el juego.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { lineaDelCircuito, porDondeSigues, verticesDelCircuito, type PuntoDeCircuito } from "./circuito";
import { elCampo, volar, type Medida } from "./mesa-del-circuito-de-prueba";

const avionDe = (id: string) => AIRCRAFT.find((a) => a.id === id)!;

describe("por dónde sigues", () => {
  const PISTA = { x: 0, z: 0, heading: 90, length: 2400 };
  const vs = verticesDelCircuito(PISTA, 100, "izquierda", 2);
  const [, , lejos, esquina, entrada] = vs as PuntoDeCircuito[];
  const umbral = { x: -1200, y: 100, z: 0 };
  // Despegando al este y por la izquierda, el viento en cola va al oeste por el norte.
  const alOeste = (270 * Math.PI) / 180;
  const enMedio = { x: (lejos!.x + esquina!.x) / 2, y: 460, z: esquina!.z };

  it("en el viento en cola, hasta el umbral y sin volver a la línea", () => {
    const fuera = { ...enMedio, z: enMedio.z - 250, rumbo: alOeste };
    const sigue = porDondeSigues(vs, umbral, fuera, 80, 2)!;
    expect(sigue[0]).toMatchObject({ x: fuera.x, z: fuera.z });
    expect(sigue.at(-1)).toEqual(umbral);
    // Doscientos cincuenta metros por fuera, hasta donde empieza a virar.
    expect(sigue[1]!.z).toBeCloseTo(fuera.z, 0);
    expect(sigue[1]!.y).toBeCloseTo(460, 0);
  });

  it("con la esquina virada: no pasa por el vértice", () => {
    const sigue = porDondeSigues(vs, umbral, { ...enMedio, rumbo: alOeste }, 80, 2)!;
    const alVertice = Math.min(...sigue.map((p) => Math.hypot(p.x - esquina!.x, p.z - esquina!.z)));
    expect(alVertice).toBeGreaterThan(250);
  });

  it("donde se baja en el viento en cola, a nivel hasta ahí y por la línea después", () => {
    // La altura publicada, doscientos metros por encima de la de la esquina.
    const linea = lineaDelCircuito(verticesDelCircuito(PISTA, 100, "izquierda", 2, 560, 360));
    const [, , alla, baja, acaba] = linea;
    expect(linea).toHaveLength(6);
    expect(baja!.y).toBe(alla!.y);
    const alPrincipio = { x: alla!.x - 400, y: alla!.y + 40, z: alla!.z - 200, rumbo: alOeste };
    const sigue = porDondeSigues(linea, umbral, alPrincipio, 80, 2)!;
    const enBaja = sigue.find((p) => Math.abs(p.x - baja!.x) < 1)!;
    expect(enBaja.y).toBeCloseTo(baja!.y + 40, 6);
    expect(enBaja.z).toBeCloseTo(baja!.z - 200, 6);
    // Donde empieza el viraje de la base, ya por la línea, y por fuera como la llevaba.
    const vira = sigue[sigue.indexOf(enBaja) + 1]!;
    const u = (vira.x - acaba!.x) / (baja!.x - acaba!.x);
    expect(u).toBeGreaterThan(0.05);
    expect(vira.y).toBeCloseTo(acaba!.y + 40 + u * (baja!.y - acaba!.y), 3);
    expect(vira.z).toBeCloseTo(acaba!.z - 200, 3);
    // Y ya bajando, lo que le quede de bajar.
    const bajando = {
      x: (baja!.x + acaba!.x) / 2,
      y: (baja!.y + acaba!.y) / 2,
      z: acaba!.z,
      rumbo: alOeste,
    };
    const queda = porDondeSigues(linea, umbral, bajando, 80, 2)!;
    expect(queda[1]!.y).toBeLessThan(bajando.y);
    expect(queda[1]!.y).toBeGreaterThan(acaba!.y - 1);
    expect(queda.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z))).toBe(true);
  });

  it("pasado de la esquina, gira desde donde está: no vuelve a ella", () => {
    const largo = { x: esquina!.x - 1500, y: 460, z: esquina!.z, rumbo: alOeste };
    const sigue = porDondeSigues(vs, umbral, largo, 80, 2)!;
    expect(sigue.length).toBeGreaterThan(1);
    expect(sigue.some((p) => Math.hypot(p.x - entrada!.x, p.z - entrada!.z) < 900)).toBe(true);
    expect(sigue.every((p) => p.x >= largo.x - 1)).toBe(true);
    expect(Math.min(...sigue.slice(1).map((p) => Math.hypot(p.x - esquina!.x, p.z - esquina!.z)))).toBeGreaterThan(600);
  });

  it("lejos del circuito, o al revés por él, no se sabe", () => {
    expect(porDondeSigues(vs, umbral, { x: 40000, y: 500, z: 40000, rumbo: 0 }, 80, 2)).toBeNull();
    const alReves = { ...enMedio, rumbo: alOeste + Math.PI };
    expect(porDondeSigues(vs, umbral, alReves, 80, 2)).toBeNull();
  });
});

describe("en Los Rodeos, con quien juega dando su circuito", () => {
  const campo = elCampo(40);
  const AVIONES = ["jaz-20", "jaz-50", "jaz-90", "jaz-120"];
  const todos = (seDice: boolean, hasta: number) =>
    AVIONES.flatMap((id) =>
      Array.from({ length: hasta }, (_, i) => volar(campo, avionDe(id), i + 1, { dondeVuelas: seDice, queSales: true })),
    );

  const con = todos(true, 40);
  const resumen = (q: readonly Medida[]) =>
    `${q.length} vuelos: ${q.flatMap((x) => x.cerca).length} cerca de ti, ${q.flatMap((x) => x.entreEllos).length} entre ellos, ` +
    `${q.reduce((a, x) => a + x.vueltas, 0)} esperas, ${q.reduce((a, x) => a + x.esperando, 0)} s esperando, ` +
    `${q.reduce((a, x) => a + x.aterrizaron, 0)} aterrizan`;

  it("nadie da su vuelta de espera a menos de trescientos metros de ti", () => {
    console.info(resumen(con));
    expect(con.flatMap((x) => x.cerca)).toEqual([]);
  });

  it("ni de otro del tráfico", () => {
    expect(con.flatMap((x) => x.entreEllos)).toEqual([]);
  });

  it("y se espera de verdad, aterrizan ellos y aterrizas tú", () => {
    expect(con.reduce((a, x) => a + x.vueltas, 0)).toBeGreaterThan(80);
    expect(con.reduce((a, x) => a + x.aterrizaron, 0)).toBeGreaterThan(100);
    expect(con.every((x) => x.acabo)).toBe(true);
  });

  /*
   * El instrumento tiene que ver el caso: con la torre sin saber por dónde
   * vuelas, sale. Con la vuelta de antes —dos minutos, siempre hacia fuera y
   * en la esquina— salía en seis de estos mismos vuelos.
   */
  it("y si la torre no supiera por dónde vuelas, sí", () => {
    const sin = todos(false, 40);
    console.info(`sin saber por dónde vuelas: ${resumen(sin)}`);
    expect(sin.flatMap((x) => x.cerca).length).toBeGreaterThan(0);
  });
});
