/**
 * **La bajada de la tripulación de línea, en indicada y Mach** (H38g): lo que
 * pide a FL350, FL250 y FL150 en los tres reactores que vuela, y que el modelo
 * sencillo lo da y baja con ello lo que pide la senda del plan. Era una
 * verdadera que iba del crucero a 280 nudos en los diez mil pies, porque el
 * modelo sencillo no llegaba a la indicada del tipo a media altura y, con el
 * gas a fondo, no bajaba más de unos 1.760 pies por minuto (enmiendas H38f y
 * H38g del ADR 0019).
 *
 * Que el vuelo entero llega a la senda de la final a la altura que toca lo
 * mira `bajada-del-vuelo-largo.test.ts`, con el plan de verdad.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { indicatedAirspeed, velocidadDelSonido } from "./atmosphere";
import { velocidadQueToca } from "./escalera-de-velocidades";
import { neutralControls } from "./model";
import { MILLAS_POR_MIL_PIES } from "./ruta";
import { arribaDe, enLosMandosDeLinea, VueloDeLinea, type LecturaDeLinea, type TramoDeLinea } from "./vuelo-de-linea";

const PIE = 0.3048;
const NUDO = 1852 / 3600;
const DT = 1 / 30;
const PERMISOS = { arrancar: true, rodar: true, entrar: true, despegar: true };
/** Lo que baja la senda del plan por cada metro: tres millas por cada mil pies. */
const TRES_POR_MIL = (1000 * PIE) / (MILLAS_POR_MIL_PIES * 1852);

/** El par de cada tipo, escrito a mano: ver `arriba-indicada-y-mach.test.ts`. */
const PARES = [
  { id: "jaz-90", kt: 280, mach: 0.75 },
  { id: "jaz-110", kt: 320, mach: 0.85 },
  { id: "jaz-120", kt: 290, mach: 0.78 },
] as const;

/** Lo que se lee a esa altitud con esa verdadera: la aguja y el Mach del mismo aire. */
function lectura(altitud: number, velocidad: number): LecturaDeLinea {
  return {
    enTierra: false,
    enPista: false,
    x: 0,
    z: 0,
    rumbo: 0,
    velocidad,
    indicada: indicatedAirspeed(velocidad, altitud),
    mach: velocidad / velocidadDelSonido(altitud),
    porElSuelo: velocidad,
    altitud,
    altura: altitud,
    vertical: 0,
    motor: true,
    flaps: 0,
    tren: 0,
    fase: "en-vuelo",
    autorizado: true,
    raya: [],
    pista: { rumbo: 0, lado: 0, queda: 0 },
    tramo: { desde: { x: 0, z: 400_000 }, hasta: { x: 0, z: 0 }, recta: false },
    alturaPedida: altitud - 3000,
    ritmoPedido: -12,
    faltaParaTocar: 400_000,
    enLaFinal: false,
    localizador: null,
    senda: null,
    cotaDelCampo: 0,
  };
}

describe.each(PARES)("bajando, el $id", ({ id, kt, mach }) => {
  const avion = AIRCRAFT.find((a) => a.id === id)!;
  const ficha = {
    vr: avion.rotationSpeed,
    vref: avion.approachSpeed,
    alturaDeLaRecogida: 9,
    alturaDelGas: 9,
    reversa: true,
    trenQueSeMete: true,
    arriba: arribaDe(avion),
  };
  const bajando = (t = new VueloDeLinea(ficha)): VueloDeLinea => {
    (t as unknown as { pasarA(tramo: TramoDeLinea): void }).pasarA("bajada");
    return t;
  };
  /** Lo que pide bajando a ese nivel: la verdadera, y lo que marca en la aguja y en el Mach. */
  const pide = (nivel: number, t = bajando()) => {
    const altitud = nivel * 100 * PIE;
    // Con cualquier verdadera de partida: la proporción de la lectura solo depende de la altitud.
    const v = t.paso(DT, lectura(altitud, 200), PERMISOS).velocidad;
    return { v, kt: indicatedAirspeed(v, altitud) / NUDO, mach: v / velocidadDelSonido(altitud), altitud };
  };

  it("a FL350 pide su Mach; a FL250 y FL150, su indicada", () => {
    const arriba = pide(350);
    expect(arriba.mach).toBeCloseTo(mach, 4);
    expect(arriba.kt).toBeLessThan(kt);
    for (const nivel of [250, 150]) {
      const p = pide(nivel);
      expect(p.kt).toBeCloseTo(kt, 3);
      expect(p.mach).toBeLessThan(mach);
    }
  });

  it("y desde mil pies antes de los diez mil, los 250 de aguja, para cruzarlos frenado", () => {
    expect(pide(112).kt).toBeCloseTo(kt, 3);
    expect(pide(108).kt).toBeCloseTo(250, 3);
    expect(pide(95).kt).toBeCloseTo(250, 3);
  });

  it("y es lo que pide la ventanilla SPD bajando, que es la misma escalera del plan", () => {
    for (const nivel of [350, 250, 150, 108]) {
      const p = pide(nivel);
      const toca = velocidadQueToca(avion, { altitud: p.altitud, restante: 200 * 1852, bajando: true, enFinal: false, subiendo: false });
      expect(Math.abs(p.kt - toca.kt)).toBeLessThan(0.6);
    }
  });

  /*
   * La tripulación pide hasta un cuarto más que la senda —ver `bajaComoMucho`—, y lo
   * que da el avión es su planeo al ralentí a esa velocidad: a FL250, un tercio más
   * que la senda; a FL350, con el aire fino, algo más de un décimo. Es lo de
   * verdad: la senda de tres por mil es ese planeo.
   */
  it("y el modelo sencillo da esa velocidad y baja con ella más que la senda", () => {
    for (const nivel of [350, 250, 150]) {
      const { v, altitud, kt: aguja, mach: alMach } = pide(nivel);
      const m = new ArcadeFlightModel({ aircraft: avion, ground: () => -1e5 });
      m.reset({ position: new Vector3(0, altitud, 0), heading: 0, airspeed: v, equilibrado: true });
      // La punta llega: el gas que la sostiene no está contra el tope.
      expect(m.velocidadMaxima()).toBeGreaterThan(v - 0.5);
      const senda = TRES_POR_MIL * v;
      const c = { ...neutralControls(), engineOn: true, tren: 0, flaps: 0 };
      let vertical = 0;
      for (let t = 0; t < 20; t += DT) {
        const s = m.state;
        const mandos = enLosMandosDeLinea(
          { motor: true, velocidad: v, gas: "velocidad", subida: -1.25 * senda, alabeo: 0, volante: null, pedal: null, freno: 0, flaps: 0, tren: false, armados: false, autofreno: 0, reversa: 0 },
          m,
          { porElSuelo: s.groundSpeed, sacado: { flaps: 0, tren: 0 } },
        );
        c.throttle = mandos.throttle;
        c.elevator = mandos.elevator ?? 0;
        m.step(DT, c);
        vertical = m.state.verticalSpeed;
        /*
         * Sin perder la velocidad pedida por el camino: la aguja, o el Mach arriba.
         * La verdadera sí baja, que con la misma aguja el aire de abajo es más denso.
         */
        const q = m.state;
        if (nivel >= 350) expect(q.airspeed / velocidadDelSonido(q.position.y)).toBeGreaterThan(alMach - 0.005);
        else expect(indicatedAirspeed(q.airspeed, q.position.y) / NUDO).toBeGreaterThan(aguja - 2);
      }
      console.log(`${id} FL${nivel}: ${(v / NUDO).toFixed(0)} kt de verdadera, la senda pide ${((senda / PIE) * 60).toFixed(0)} ft/min y baja ${((-vertical / PIE) * 60).toFixed(0)}`);
      expect(-vertical).toBeGreaterThan(1.1 * senda);
    }
  });
});

describe("en un vuelo largo, desde el Mach de su crucero", () => {
  const avion = AIRCRAFT.find((a) => a.id === "jaz-110")!;
  const ficha = {
    vr: avion.rotationSpeed,
    vref: avion.approachSpeed,
    alturaDeLaRecogida: 9,
    alturaDelGas: 9,
    reversa: true,
    trenQueSeMete: true,
    arriba: arribaDe(avion),
  };

  it("baja a ese Mach hasta que la aguja llega a la indicada del tipo, sin frenar al empezar", () => {
    const t = new VueloDeLinea(ficha);
    const crucero = 40_000 * PIE;
    // El de la cuenta del vuelo: Mach 0,78, más despacio que el 0,85 de la escalera.
    const v = 0.78 * velocidadDelSonido(crucero);
    t.ponerEnCrucero(v);
    t.paso(DT, lectura(crucero, v), PERMISOS);
    (t as unknown as { pasarA(tramo: TramoDeLinea): void }).pasarA("bajada");
    const en = (nivel: number) => {
      const altitud = nivel * 100 * PIE;
      const w = t.paso(DT, lectura(altitud, 200), PERMISOS).velocidad;
      return { kt: indicatedAirspeed(w, altitud) / NUDO, mach: w / velocidadDelSonido(altitud) };
    };
    expect(en(399).mach).toBeCloseTo(0.78, 4);
    expect(en(350).mach).toBeCloseTo(0.78, 4);
    // A FL250, Mach 0,78 son unos 314 nudos de aguja: todavía manda el Mach.
    const medio = en(250);
    expect(medio.mach).toBeCloseTo(0.78, 4);
    expect(medio.kt).toBeLessThan(320);
    const abajo = en(150);
    expect(abajo.kt).toBeCloseTo(320, 3);
    expect(abajo.mach).toBeLessThan(0.78);
  });
});
