/**
 * La recogida por clase de avión: a qué altura se pide la nariz y a qué
 * altura va el gas al ralentí, y que cada cosa se pide **una vez** por
 * aproximación. Ver `flight/recogida.ts`.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, ARAI, ARASUNU, PYKASU, YVAGA } from "./aircraft";
import { AvisosDeAltura, type Lectura } from "./avisos-de-altura";
import { ArcadeFlightModel } from "./arcade";
import { neutralControls } from "./model";
import { claseDeRecogida, escalonesDeLaRecogida, laRecogidaDe } from "./recogida";

const PIE = 0.3048;
const RAD = Math.PI / 180;
const enPies = (m: number) => Math.round(m / PIE);

describe("la altura de la recogida, por clase y con su manual", () => {
  it("el reactor de mandos eléctricos recoge a 30 ft y quita el gas a 20, como el A320", () => {
    const r = laRecogidaDe(ARAI);
    expect(r.clase).toBe("electricos");
    expect(enPies(r.nariz)).toBe(30);
    expect(enPies(r.gas)).toBe(20);
  });

  it("el reactor de cables recoge y quita el gas a 20 ft, como dice el FCTM de Boeing", () => {
    const r = laRecogidaDe(YVAGA);
    expect(r.clase).toBe("cables");
    expect(enPies(r.nariz)).toBe(20);
    expect(enPies(r.gas)).toBe(20);
  });

  it("los de hélice, a 15 ft las dos cosas: el medio de los 10 a 20 del manual de la FAA", () => {
    for (const a of AIRCRAFT.filter((x) => claseDeRecogida(x) === "helice")) {
      const r = laRecogidaDe(a);
      expect(enPies(r.nariz), a.id).toBe(15);
      expect(enPies(r.gas), a.id).toBe(15);
    }
    expect(claseDeRecogida(PYKASU)).toBe("helice");
    expect(claseDeRecogida(ARASUNU)).toBe("helice");
  });

  it("donde el manual junta la nariz y el gas, es un solo escalón: una frase", () => {
    expect(escalonesDeLaRecogida(laRecogidaDe(YVAGA)).map((e) => e.dice)).toEqual(["nariz y gas"]);
    expect(escalonesDeLaRecogida(laRecogidaDe(PYKASU)).map((e) => e.dice)).toEqual(["nariz y gas"]);
    expect(escalonesDeLaRecogida(laRecogidaDe(ARAI)).map((e) => e.dice)).toEqual(["nariz", "gas"]);
  });
});

describe("la recogida se pide una vez por aproximación", () => {
  /** Una bajada por la senda, con un bache que sube y baja a media recogida. */
  function bajar(avisos: AvisosDeAltura, desde: number, hasta: number): string[] {
    const dichos: string[] = [];
    const lectura = (ra: number, vertical: number): Lectura => ({
      radioAltura: ra,
      enTierra: false,
      enAproximacion: true,
      vertical,
      altitud: 100 + ra,
    });
    for (let ra = desde; ra >= hasta; ra -= 0.1) {
      const a = avisos.paso(lectura(ra, -3));
      if (a) dichos.push(a.dice);
      // Un bache: el avión sube medio metro y vuelve a bajar.
      if (Math.abs(ra - 5) < 0.05) {
        for (const x of [5.2, 5.5, 5.2, 5])
          if (avisos.paso(lectura(x, x > ra ? 1 : -1))) dichos.push("otra vez");
      }
    }
    return dichos;
  }

  it("el JAZ 120: «nariz y gas» una sola vez, aunque el aire lo suba un palmo", () => {
    const avisos = new AvisosDeAltura(escalonesDeLaRecogida(laRecogidaDe(YVAGA)));
    expect(bajar(avisos, 60, 0.5)).toEqual(["nariz y gas"]);
  });

  it("el JAZ 90: la nariz a 30 ft y el gas a 20, cada una una vez", () => {
    const avisos = new AvisosDeAltura(escalonesDeLaRecogida(laRecogidaDe(ARAI)));
    expect(bajar(avisos, 60, 0.5)).toEqual(["nariz", "gas"]);
  });
});

describe("en Guyrami, quien recoge al ralentí toca suave", () => {
  /**
   * Una final del modelo sencillo a la Vref y por la senda de tres grados,
   * con lo que hace la ayuda de la final —el gas que sostiene la Vref, y al
   * ralentí desde la altura de su clase— y lo que hace quien obedece: la
   * senda con la mano y, a la altura de la nariz, grado y medio más arriba,
   * como el piloto obediente del banco de vuelo entero.
   * Devuelve a qué ritmo se toca, m/s.
   */
  function tomar(a: typeof PYKASU, recoge: boolean): number {
    const r = laRecogidaDe(a);
    const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
    m.reset({ position: new Vector3(0, 40 + a.gearHeight, 0), heading: 0, airspeed: a.approachSpeed });
    const sacado = { flaps: 1, tren: 1 };
    const c = { ...neutralControls(), engineOn: true, flaps: 1, tren: 1 };
    let senda = -3 * RAD;
    let enRetard = false;
    let recogio = false;
    for (let t = 0; t < 120 && !m.state.onGround; t += 1 / 60) {
      const ruedas = m.state.position.y - a.gearHeight;
      if (ruedas < r.gas) enRetard = true;
      if (recoge && !recogio && ruedas < r.nariz) {
        recogio = true;
        senda += 1.5 * RAD;
      }
      c.throttle = enRetard
        ? Math.max(0, c.throttle - 0.35 / 60)
        : m.gasPara(a.approachSpeed, sacado);
      c.elevator = Math.max(-1, Math.min(1, m.mandoParaSubir(m.state.airspeed * Math.sin(senda))));
      m.step(1 / 60, c);
    }
    expect(m.state.onGround).toBe(true);
    return m.state.touchdownSinkRate;
  }

  for (const a of [PYKASU, ARASUNU, ARAI, YVAGA]) {
    it(`${a.id}: con la nariz un poquito arriba, entre medio y dos metros por segundo`, () => {
      const toca = tomar(a, true);
      expect(toca).toBeGreaterThan(0.5);
      expect(toca).toBeLessThanOrEqual(2);
    });
  }

  it("y sin levantar la nariz, el JAZ 120 toca más fuerte: la recogida es la que hace el trabajo", () => {
    expect(tomar(YVAGA, false)).toBeGreaterThan(tomar(YVAGA, true) + 1);
  });

  it("pero al ralentí no se vuela recto para siempre: lo prestado se acaba con la velocidad que sobra", () => {
    const m = new ArcadeFlightModel({ aircraft: YVAGA, ground: () => 0 });
    m.reset({ position: new Vector3(0, 600, 0), heading: 0, airspeed: YVAGA.approachSpeed });
    const c = { ...neutralControls(), engineOn: true, flaps: 1, tren: 1, throttle: 0, elevator: 1 };
    const y0 = m.state.position.y;
    for (let t = 0; t < 4; t += 1 / 60) m.step(1 / 60, c);
    // Los primeros segundos, la palanca atrás sostiene el avión...
    expect(m.state.position.y - y0).toBeGreaterThan(-10);
    for (let t = 0; t < 30; t += 1 / 60) m.step(1 / 60, c);
    // ...y gastado lo que sobraba, baja: sin motor no se vuela recto.
    expect(m.state.verticalSpeed).toBeLessThan(-1);
  });
});
