/**
 * Un avión parado con viento no se sienta sobre la cola.
 *
 * En el puesto de Gando, con veinte nudos, el JAZ 90 quedaba con 9,2° de morro
 * arriba —el tope de cola—, la rueda de morro a metro y medio del suelo y las
 * principales hundidas dieciocho centímetros. En el suelo el cabeceo solo lo
 * movía el aire: nada hacía de tren. Ver `momentoDelTren` en `fdm.ts`.
 *
 * Y lo que arregla eso no puede impedir lo otro: **rotar**. El mismo par que
 * sostiene el morro en el suelo es el que el timón vence al llegar a Vr.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { neutralControls } from "./model";
import { causasDe, constanciaDe, cuantoSeMueve, type Aire } from "./turbulencia";
import { Rafagas } from "./rafagas";
import { flapsDeDespegue } from "./flaps";

const KT = 0.514444;

function cabeceo(m: CoefficientFlightModel): number {
  const f = new Vector3(0, 0, -1).applyQuaternion(m.state.orientation);
  return Math.asin(f.y);
}

/** Aparcado con los frenos puestos, con este viento y sus ráfagas. */
function aparcado(
  a: AircraftConfig,
  deDonde: number,
  nudos: number,
): { peor: number; mas: number; menos: number } {
  const m = new CoefficientFlightModel({
    aircraft: a,
    ground: () => 0,
    assist: 0,
  });
  m.reset({
    position: new Vector3(0, a.gearHeight, 0),
    heading: 0,
    airspeed: 0,
  });
  const rad = (deDonde * Math.PI) / 180;
  // Hacia donde va: al revés de donde viene. Norte es −Z.
  const vx = -Math.sin(rad) * nudos * KT;
  const vz = Math.cos(rad) * nudos * KT;
  m.ponerViento(vx, vz);
  // Relieve de barlovento, que es el caso de las islas: ráfagas moderadas.
  const aire: Aire = {
    sobreElSuelo: a.gearHeight,
    vientoKt: nudos,
    baseDeNubes: null,
    altura: a.gearHeight,
    rugosidad: 0.5,
  };
  let peor = 0;
  let mas = -Infinity;
  let menos = Infinity;
  const rafagas = new Rafagas(deDonde + nudos);
  for (let t = 0; t < 60; t += 1 / 60) {
    const r = rafagas.paso(1 / 60, {
      sigma: cuantoSeMueve(aire),
      constancia: constanciaDe(causasDe(aire)),
      sobreElSuelo: a.gearHeight,
      enTierra: true,
      velocidad: m.state.airspeed,
      densidad: 1.225,
      envergadura: a.wingSpan,
      cuerda: a.chord,
      rumbo: 0,
    });
    m.ponerRacha(r.x, r.y, r.z, r.alabeo);
    m.step(1 / 60, {
      ...neutralControls(),
      engineOn: true,
      throttle: 0,
      brakes: 1,
    });
    peor = Math.max(peor, Math.abs(cabeceo(m)));
    mas = Math.max(mas, cabeceo(m));
    menos = Math.min(menos, cabeceo(m));
  }
  return { peor, mas, menos };
}

describe.each(AIRCRAFT.map((a) => [a.id, a] as const))(
  "el %s aparcado",
  (_id, a) => {
    /*
     * Apoyado en sus tres ruedas es a nivel en un triciclo y en tres puntos en
     * el de rueda de cola, con el morro arriba (enmienda H10b del ADR 0027).
     */
    const reposo = a.actitudEnTresPuntos ?? 0;

    it("con veinte nudos de cualquier lado, sigue apoyado en sus tres ruedas", () => {
      for (const de of [0, 45, 90, 135, 180, 225, 270, 315]) {
        const { mas, menos } = aparcado(a, de, 20);
        // Ni un grado de morro arriba: la rueda de morro no se separa.
        expect(mas - reposo, `viento de ${de}°`).toBeLessThan((0.5 * Math.PI) / 180);
        // Y en el de rueda de cola, la cola no se levanta: su ballesta se
        // estira algo más de un grado antes de que la rueda deje el suelo.
        if (a.actitudEnTresPuntos !== undefined)
          expect(reposo - menos, `viento de ${de}°`).toBeLessThan((1 * Math.PI) / 180);
      }
    });

    it("y sin salirse de lo que da la pata de morro por abajo", () => {
      const { peor, menos } = aparcado(a, 180, 25);
      if (a.actitudEnTresPuntos === undefined)
        expect(peor).toBeLessThanOrEqual(Math.abs(a.minGroundPitch) + 1e-3);
      // El de rueda de cola no tiene pata de morro: con viento de cola, la cola
      // sigue en el suelo.
      else expect(reposo - menos).toBeLessThan((1 * Math.PI) / 180);
    });
  },
);

/*
 * Lo que sostiene el morro no puede ser más de lo que el timón vence: tirando
 * como tira quien despega, el avión rota y se va en la pista que tiene.
 */
describe.each(AIRCRAFT.map((a) => [a.id, a] as const))(
  "el %s todavía rota",
  (_id, a) => {
    it("tirando en Vr, el morro sube y se va del suelo", () => {
      const m = new CoefficientFlightModel({
        aircraft: a,
        ground: () => 0,
        assist: 0,
      });
      m.reset({
        position: new Vector3(0, a.gearHeight, 0),
        heading: 0,
        airspeed: 0,
      });
      m.setOnRunway(true);
      let seVa = 0;
      for (let t = 0; t < 120; t += 1 / 120) {
        const v = m.state.airspeed;
        m.step(1 / 120, {
          ...neutralControls(),
          engineOn: true,
          throttle: 1,
          // Con los flaps de despegue, como se despega: con la Vr de su peso, un
          // reactor sin ellos no se va hasta pasar su pérdida limpia (ADR 0027).
          flaps: flapsDeDespegue(a),
          elevator: v >= a.rotationSpeed ? 0.8 : 0,
        });
        if (!m.state.onGround && m.state.heightAboveGround > a.gearHeight + 3) {
          seVa = v;
          break;
        }
      }
      expect(seVa).toBeGreaterThanOrEqual(a.rotationSpeed);
      // Y no mucho más tarde: una rotación, no una carrera más.
      expect(seVa).toBeLessThan(a.rotationSpeed * 1.2);
    });
  },
);
