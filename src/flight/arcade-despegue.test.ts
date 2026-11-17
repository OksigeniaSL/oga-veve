/**
 * **Al irse del suelo, el modelo sencillo no acelera más que rodando.**
 *
 * Nace del #192 (H29g): en el banco del despegue de Guyrami
 * (`verificar-despegue.mjs tenerife-norte guyrami "" jaz-90`) el JAZ 90 «rotaba»
 * a 84 m/s con la Vr en 66. No rotaba ahí: se soltaba del suelo a su Vr, y en
 * el segundo y medio que tardaba en tener quince metros debajo pasaba de 66,4 a
 * 84,1 m/s, doce metros por segundo al cuadrado. Rodando, este modelo acelera lo
 * que dice la física de la carrera (`carreraHastaVr`); en el aire iba hacia la
 * punta del gas con la constante de cinco segundos y medio de toda la flota,
 * que con el gas a fondo y la punta lejos es más de un g en la espalda. Lo que
 * acelera un avión es lo que le sobra de empuje, y al irse del suelo solo se
 * quitan las ruedas. Ver `ritmoEnElAire` en `arcade.ts`.
 *
 * Se vuela como el banco: gas a fondo desde parado en una pista de asfalto a
 * nivel del mar, y a la Vr de la ficha media palanca atrás.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, esDeChorro, type AircraftConfig } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { neutralControls } from "./model";

const DT = 1 / 60;
const PIE = 0.3048;

interface Despegue {
  /** Lo que acelera en el último medio segundo rodando, m/s². */
  readonly rodando: number;
  /** Y en el primer segundo en el aire, m/s². */
  readonly enElAire: number;
  /** La velocidad con las ruedas a 35 ft, por la Vr. */
  readonly a35PorVr: number;
}

function despega(a: AircraftConfig): Despegue {
  const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
  m.setOnRunway(true);
  const c = neutralControls();
  c.throttle = 1;
  c.engineOn = true;
  const v: number[] = [];
  let suelta = -1;
  let a35 = Number.NaN;
  for (let i = 0; i < 60 * 180; i++) {
    const s = m.state;
    c.elevator = s.airspeed > a.rotationSpeed ? 0.5 : 0;
    m.step(DT, c);
    v.push(s.airspeed);
    if (suelta < 0 && !s.onGround) suelta = v.length - 1;
    if (suelta >= 0 && Number.isNaN(a35) && s.position.y - a.gearHeight > 35 * PIE)
      a35 = s.airspeed / a.rotationSpeed;
    if (suelta >= 0 && !Number.isNaN(a35) && v.length > suelta + 61) break;
  }
  const en = (k: number): number => v[k] ?? Number.NaN;
  return {
    rodando: (en(suelta - 1) - en(suelta - 31)) / 0.5,
    enElAire: en(suelta + 60) - en(suelta),
    a35PorVr: a35,
  };
}

describe("el despegue del modelo sencillo", () => {
  const flota = AIRCRAFT.filter((a) => !a.helicoptero);

  it.each(flota.map((a) => [a.id, a] as const))(
    "%s: en el primer segundo de aire acelera lo que acelera rodando, no más",
    (_id, a) => {
      const d = despega(a);
      /*
       * Medido antes de acotarlo (H29g): el JAZ 90, 2,8 m/s² rodando y doce en
       * el aire. Ahora, de 0,88 a 0,98 veces lo de rodar en toda la flota: lo
       * que se quita es el rozamiento de las ruedas, y la recta de la carrera
       * ya sin ellas da algo menos con la punta del aire.
       */
      expect(d.enElAire, `${d.enElAire.toFixed(2)} m/s² con ${d.rodando.toFixed(2)} rodando`).toBeLessThan(
        d.rodando * 1.05,
      );
    },
  );

  it.each(flota.filter((a) => esDeChorro(a)).map((a) => [a.id, a] as const))(
    "%s: pasa los 35 ft cerca de su Vr, como un reactor a su V2",
    (_id, a) => {
      /*
       * Un reactor pasa los 35 ft a la V2 o algo más (CS 25.107 y 25.111): la Vr
       * y unos pocos nudos, una décima larga por encima con todos los motores.
       * Antes, el JAZ 90 los pasaba a 1,25 veces su Vr; ahora, a 1,06.
       */
      const d = despega(a);
      expect(d.a35PorVr, `${d.a35PorVr.toFixed(3)} veces la Vr`).toBeLessThan(1.15);
    },
  );
});
