/**
 * **La salida del viaje largo, en Barajas**: del puesto de la T1 a la doble
 * raya de la 36L, por las calles y sin pisar ninguna pista.
 *
 * Barajas no entra en `rodar-por-el-asfalto.test.ts`, que mira cada puesto de
 * cada campo con toda la flota: aquí solo sale el JAZ 110 del capítulo, y sale
 * de un puesto. Lo que se mira es ese rodaje, que es el que se va a volar. Ver
 * `SALIDA_DE_BARAJAS` en `scenarios.ts`.
 */
import { describe, expect, it } from "vitest";
import { aLaPolilinea, type Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { conSuAerodromo, MADRID_BARAJAS as SIN_AERODROMO, SALIDA_DE_BARAJAS } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";

// El aeródromo se baja al abrir el capítulo: ver `aerodromoAparte`.
const MADRID_BARAJAS = await conSuAerodromo(SIN_AERODROMO);
const aero = MADRID_BARAJAS.aerodrome!;
const avion = AIRCRAFT.find((a) => a.id === "jaz-110")!;

describe("la salida de Barajas del vuelo de Asunción", () => {
  it("el aeródromo no va en el juego: se baja al abrirlo, y la pista escrita es la del fichero", () => {
    expect(SIN_AERODROMO.aerodrome).toBeUndefined();
    const escrita = SIN_AERODROMO.runway;
    const delFichero = MADRID_BARAJAS.runway;
    expect(escrita.x).toBeCloseTo(delFichero.x, 1);
    expect(escrita.z).toBeCloseTo(delFichero.z, 1);
    expect(escrita.heading).toBeCloseTo(delFichero.heading, 2);
    expect({ ...escrita, x: 0, z: 0, heading: 0 }).toEqual({ ...delFichero, x: 0, z: 0, heading: 0 });
  });

  it("el puesto está en el fichero, frente al dique de la T1", () => {
    const puesto = (aero.parkingPositions ?? []).find((p) => p.ref === SALIDA_DE_BARAJAS.puesto);
    expect(puesto).toBeDefined();
    // La T1 de OpenStreetMap tiene su centro hacia (-49, -3424).
    expect(Math.hypot(puesto!.xy[0] + 49, puesto!.xy[1] + 3424)).toBeLessThan(500);
  });

  it("y de él se rueda a la doble raya de la 36L sin pisar ninguna pista", () => {
    expect(MADRID_BARAJAS.runway.heading).toBeCloseTo(359.76, 1);
    const puesto = (aero.parkingPositions ?? []).find((p) => p.ref === SALIDA_DE_BARAJAS.puesto)!;
    const plan = new PlanDeVuelo(aero, MADRID_BARAJAS.runway, () => 600, avion);
    expect(plan.reiniciarDesde(puesto.xy)).toBe(true);
    const ruta = plan.rutaCruda() as readonly Punto[];
    const fin = ruta[ruta.length - 1]!;
    const [ex, ey] = SALIDA_DE_BARAJAS.espera;
    expect(Math.hypot(fin[0] - ex, fin[1] - ey)).toBeLessThan(1);

    let largo = 0;
    for (let i = 1; i < ruta.length; i++)
      largo += Math.hypot(ruta[i]![0] - ruta[i - 1]![0], ruta[i]![1] - ruta[i - 1]![1]);
    // Unos cuatro kilómetros: Barajas es grande, y la T1 está en la otra punta.
    expect(largo).toBeGreaterThan(3000);
    expect(largo).toBeLessThan(5000);

    // Ni un punto encima de ninguna de las cuatro pistas.
    for (const p of ruta)
      for (const pista of aero.runways)
        expect(aLaPolilinea(p, pista.centerline), `${pista.ref} en ${p.map(Math.round)}`).toBeGreaterThan(
          (pista.widthM ?? 45) / 2,
        );

    // Y la doble raya, junto a la cabecera 36L: al lado de la pista y cerca de su punta sur.
    const umbral = aero.runways[0]!.thresholds["36L"]!.xy!;
    expect(Math.hypot(fin[0] - umbral[0], fin[1] - umbral[1])).toBeLessThan(250);
  });

  it("y con el puesto pedido, el vuelo sale de él sin elegir entre todos", () => {
    const plan = new PlanDeVuelo(aero, MADRID_BARAJAS.runway, () => 600, avion);
    plan.puestoPedido = SALIDA_DE_BARAJAS.puesto;
    expect(plan.reiniciar()).toBe(true);
    const puesto = (aero.parkingPositions ?? []).find((p) => p.ref === SALIDA_DE_BARAJAS.puesto)!;
    const [x, z] = plan.arranque()!;
    expect(Math.hypot(x - puesto.xy[0], z + puesto.xy[1])).toBeLessThan(1);
    const ruta = plan.rutaCruda() as readonly Punto[];
    const fin = ruta[ruta.length - 1]!;
    expect(Math.hypot(fin[0] - SALIDA_DE_BARAJAS.espera[0], fin[1] - SALIDA_DE_BARAJAS.espera[1])).toBeLessThan(1);
    // Sin haber mirado los demás: lo que se miró para elegir se queda vacío.
    expect(plan.paresVistos.length).toBe(0);
  });
});
