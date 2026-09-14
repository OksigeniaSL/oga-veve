/**
 * Que el peldaño de Guyrami **haga los metros de verdad**.
 *
 * Guyrami no tiene fuerzas: el gas *es* la velocidad, y esa simplificación es a
 * propósito —es el peldaño de los cuatro años—. Lo que no puede ser es que la
 * simplificación cambie los **metros**, porque los metros son lo que se ve: si
 * el avión de fuselaje ancho para en veintiuno, el niño aprende que un 747 para
 * como un karting, y eso es justo lo contrario de lo que este juego existe para
 * enseñar.
 *
 * Y pasaba. Medido antes de este arreglo, con el freno a fondo desde la
 * velocidad de toma:
 *
 * ```
 *              Guyrami   coeficientes   la cuenta
 *   jaz-20         9 m        157 m       207 m
 *   jaz-120       21 m        840 m     1.112 m
 * ```
 *
 * Veintiún metros. Quien lo jugó lo dijo antes que nadie: «frené el 747 en Los
 * Rodeos en una distancia muy poco creíble; cuando se aterriza con un bicho de
 * este tamaño, el avión se está un rato para perder velocidad y se come un buen
 * tramo de pista».
 *
 * Lo mismo por el otro lado: la carrera de despegue salía de un ritmo fijo, así
 * que el grande despegaba en doscientos cincuenta metros.
 *
 * Aquí se comprueba que los dos modelos de vuelo y la cuenta de `carrera.ts`
 * —la misma que decide si un avión cabe en una pista— dicen los mismos metros.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ArcadeFlightModel } from "./arcade";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { neutralControls, type ControlInputs } from "./model";
import {
  ascensoMaximo,
  caidaSinMotor,
  carreraHastaVr,
  rodaduraDeFrenada,
  velocidadDeToma,
} from "./carrera";

const DT = 1 / 120;

function enElSuelo(a: AircraftConfig, velocidad: number): ArcadeFlightModel {
  const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
  m.reset({
    position: new Vector3(0, a.gearHeight, 0),
    heading: 0,
    airspeed: velocidad,
  });
  return m;
}

/** Rueda hasta que se cumpla algo, y dice cuántos metros costó. */
function metros(
  m: ArcadeFlightModel,
  mandos: Partial<ControlInputs>,
  hasta: (v: number) => boolean,
): number {
  const c = { ...neutralControls(), engineOn: true, ...mandos };
  let d = 0;
  for (let i = 0; i < 300 * 120; i++) {
    const antes = m.state.position.clone();
    m.step(DT, c);
    d += m.state.position.distanceTo(antes);
    if (hasta(m.state.groundSpeed)) break;
  }
  return d;
}

describe("los metros de Guyrami", () => {
  for (const a of AIRCRAFT) {
    it(`${a.id} frena en los metros que dice la física`, () => {
      const d = metros(
        enElSuelo(a, velocidadDeToma(a)),
        { throttle: 0, brakes: 1 },
        (v) => v < 0.5,
      );
      const cuenta = rodaduraDeFrenada(a);
      // Un diez por ciento: lo que separa «los mismos metros» de «parecidos».
      expect(Math.abs(d - cuenta) / cuenta).toBeLessThan(0.1);
    });

    it(`${a.id} corre hasta rotar los metros que dice la física`, () => {
      const d = metros(
        enElSuelo(a, 0),
        { throttle: 1 },
        (v) => v >= a.rotationSpeed,
      );
      const cuenta = carreraHastaVr(a, "asfalto");
      expect(Math.abs(d - cuenta) / cuenta).toBeLessThan(0.1);
    });
  }

  it("y frenar en hierba cuesta más que en asfalto", () => {
    const a = AIRCRAFT[0]!;
    const enAsfalto = enElSuelo(a, velocidadDeToma(a));
    const enHierba = enElSuelo(a, velocidadDeToma(a));
    enHierba.ponerSuperficie("hierba");
    const d1 = metros(enAsfalto, { throttle: 0, brakes: 1 }, (v) => v < 0.5);
    const d2 = metros(enHierba, { throttle: 0, brakes: 1 }, (v) => v < 0.5);
    // Menos, que en hierba se frena antes: el rozamiento de rodadura ayuda.
    expect(d2).toBeLessThan(d1);
  });
});

describe("cada avión sube y baja lo suyo", () => {
  it("el grande sube mucho más que la avioneta", () => {
    const avioneta = ascensoMaximo(AIRCRAFT[0]!);
    const grande = ascensoMaximo(AIRCRAFT[AIRCRAFT.length - 1]!);
    expect(avioneta).toBeLessThan(5);
    expect(grande).toBeGreaterThan(10);
  });

  it("y baja más deprisa, aunque planee mejor", () => {
    const avioneta = AIRCRAFT[0]!;
    const grande = AIRCRAFT[AIRCRAFT.length - 1]!;
    const caeLaAvioneta = caidaSinMotor(avioneta, avioneta.cruiseSpeed * 0.62);
    const caeElGrande = caidaSinMotor(grande, grande.cruiseSpeed * 0.62);
    expect(caeElGrande).toBeGreaterThan(2 * caeLaAvioneta);
  });

  it("ninguno sube ni baja lo mismo que otro", () => {
    const suben = AIRCRAFT.map((a) => Math.round(ascensoMaximo(a) * 10));
    expect(new Set(suben).size).toBeGreaterThanOrEqual(AIRCRAFT.length - 1);
  });
});

describe("la punta depende de la altura", () => {
  it("abajo no llega al crucero de la ficha, y arriba sí", () => {
    const a = AIRCRAFT[AIRCRAFT.length - 1]!;
    const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
    m.reset({ position: new Vector3(0, 100, 0), heading: 0, airspeed: 100 });
    const abajo = m.velocidadMaxima();
    m.reset({
      position: new Vector3(0, a.alturaDeCrucero, 0),
      heading: 0,
      airspeed: 100,
    });
    const arriba = m.velocidadMaxima();
    expect(abajo).toBeLessThan(a.cruiseSpeed * 0.7);
    expect(arriba).toBeCloseTo(a.cruiseSpeed, 0);
  });

  it("y la avioneta no se entera, porque no sube ahí", () => {
    const a = AIRCRAFT[0]!;
    const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
    m.reset({ position: new Vector3(0, 300, 0), heading: 0, airspeed: 30 });
    expect(m.velocidadMaxima()).toBeLessThan(a.cruiseSpeed * 0.7);
  });
});
