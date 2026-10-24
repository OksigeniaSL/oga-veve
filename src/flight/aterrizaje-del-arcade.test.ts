/**
 * **La toma corriente del peldaño de los cuatro años no es dura** (punto 299).
 *
 * El modelo de los pequeños no lleva recogida: bajando por la senda con el
 * gas al mínimo se posa a unos tres metros por segundo, que es lo normal sin
 * recogida. Con el listón de un tren certificado —diez pies por segundo, tres
 * metros— esa toma rozaba «duro», y con él se quedaba sin galón y oía que
 * había que revisar el avión. El listón lo pone su modelo: ver `limiteDeDuro`
 * en `arcade.ts`. Aquí se vuela esa toma con cada avión de la flota y se
 * cuenta cuántas salen duras: ninguna.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { LandingWatcher, type Aterrizaje } from "./aterrizaje";
import { neutralControls } from "./model";

const SENDA = (3 * Math.PI) / 180;

/** La toma corriente: por la senda o sin tocar nada, con el gas al mínimo y sin recoger. */
function tomaCorriente(a: (typeof AIRCRAFT)[number], porLaSenda: boolean): { caida: number; veredicto: Aterrizaje; duro: number } {
  const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
  m.reset({ position: new Vector3(0, 60, 0), heading: 0, airspeed: a.approachSpeed });
  const w = new LandingWatcher();
  const dt = 1 / 60;
  let veredicto: Aterrizaje = null;
  for (let i = 0; i < 60 * 120 && !veredicto; i++) {
    const s = m.state;
    const elevator = porLaSenda && !s.onGround ? (m.mandoParaSubir?.(-s.airspeed * Math.tan(SENDA)) ?? 0) : 0;
    m.step(dt, { ...neutralControls(), engineOn: true, throttle: 0, flaps: 1, tren: 1, elevator });
    veredicto = w.update(
      s.onGround,
      s.airspeed,
      s.touchdownSinkRate,
      s.crashed,
      true,
      a.approachSpeed,
      dt,
      m.velocidadMaxima(),
      true,
      false,
      false,
      m.limiteDeDuro(),
    );
  }
  return { caida: w.caidaAlTocar, veredicto, duro: m.limiteDeDuro() };
}

describe("la toma corriente del arcade", () => {
  /*
   * Por la senda, que es como baja quien sigue los aros. Medido el
   * 24-10-2026: de 2,4 a 3,5 m/s según el avión, y con el listón de los diez
   * pies salían duras dos de seis, el JAZ 40 y el JAZ 120. Sin tocar nada y
   * con el gas a cero no es una toma corriente: el reactor grande baja así a
   * más de siete metros por segundo, un picado, y eso sí es duro.
   */
  it("por la senda, con el gas al mínimo y sin recoger: ninguna sale dura", () => {
    const tomas = AIRCRAFT.map((a) => ({ id: a.id, ...tomaCorriente(a, true) }));
    const duras = tomas.filter((t) => t.veredicto === "duro");
    expect(duras.map((t) => `${t.id} a ${t.caida.toFixed(2)} m/s`)).toEqual([]);
    for (const t of tomas) {
      expect(t.veredicto, t.id).toBe("firme");
      // Y con margen: la más dura se queda lejos del listón.
      expect(t.caida, t.id).toBeLessThan(t.duro * 0.8);
    }
  });
});
