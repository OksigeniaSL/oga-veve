/**
 * **En Guyrami el avión se va del suelo con la aguja en su Vr**, no con la
 * verdadera.
 *
 * El modelo sencillo dejaba subir en cuanto la velocidad verdadera pasaba la
 * Vr de la ficha. A nivel del mar en un día estándar es lo mismo; en Los
 * Rodeos —632 m, el campo alto de la flota— con 40 °C, el JAZ 90 se soltaba
 * con la aguja en 61,5 m/s y su Vr en 66,4: el niño que tira desde el
 * principio despegaba antes de que salieran la flecha de tirar y «rotate», que
 * miran la aguja (enmienda H38e del ADR 0019).
 *
 * Mirarla en la aguja alarga la carrera en un campo alto o caliente, que es lo
 * de verdad: el JAZ 90 corre un 22 % más en Los Rodeos a 40 °C que a nivel del
 * mar, donde la cuenta completa de `carreraHastaVr` dice un 32 % —la otra
 * parte es el motor, que aquí no pierde fuerza—. Y la carrera del nivel del
 * mar, con la que se calibra este modelo, no cambia.
 *
 * Se vuela como el niño: gas a fondo desde parado y la palanca atrás desde el
 * principio.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { AIRE_ESTANDAR, aireDelParte, indicadaDe, type Aire } from "./atmosphere";
import { neutralControls } from "./model";
import type { Superficie } from "../world/superficie";

const DT = 1 / 60;
const LOS_RODEOS = 632;

interface Suelta {
  /** Lo rodado hasta irse del suelo, m. */
  readonly metros: number;
  /** La aguja y la verdadera en el primer paso en el aire, m/s. */
  readonly aguja: number;
  readonly verdadera: number;
}

function despegaTirando(
  a: AircraftConfig,
  cota: number,
  aire: Aire,
  superficie: Superficie = "asfalto",
): Suelta | null {
  const m = new ArcadeFlightModel({ aircraft: a, ground: () => cota });
  m.ponerAire(aire);
  m.reset({ position: new Vector3(0, cota + a.gearHeight, 0), heading: 0, airspeed: 0 });
  m.setOnRunway(true);
  m.ponerSuperficie(superficie);
  const c = neutralControls();
  c.throttle = 1;
  c.engineOn = true;
  c.elevator = 0.5;
  const s = m.state;
  let metros = 0;
  for (let i = 0; i < 60 * 240; i++) {
    const x = s.position.x;
    const z = s.position.z;
    m.step(DT, c);
    metros += Math.hypot(s.position.x - x, s.position.z - z);
    if (!s.onGround)
      return { metros, aguja: indicadaDe(s, m.aireDelDia()), verdadera: s.airspeed };
  }
  return null;
}

const de = (id: string): AircraftConfig => AIRCRAFT.find((a) => a.id === id)!;
const DE_ALA = AIRCRAFT.filter((a) => !a.helicoptero);

describe("en Guyrami, la Vr se mira en la aguja", () => {
  it.each(["jaz-20", "jaz-90"])(
    "%s en Los Rodeos a 40 °C: tirando desde el principio, no se va hasta que la aguja llega a la Vr",
    (id) => {
      const a = de(id);
      const r = despegaTirando(a, LOS_RODEOS, aireDelParte(40, LOS_RODEOS))!;
      expect(r).not.toBeNull();
      // Un paso de más como mucho: lo que gana en un sexagésimo de segundo.
      expect(r.aguja).toBeGreaterThanOrEqual(a.rotationSpeed);
      expect(r.aguja).toBeLessThan(a.rotationSpeed + 0.2);
      // Y la verdadera va bastante por encima: con la verdadera se habría ido antes.
      expect(r.verdadera).toBeGreaterThan(a.rotationSpeed * 1.06);
    },
  );

  it.each(["jaz-20", "jaz-90"])(
    "%s: a nivel del mar en un día estándar, la carrera de siempre",
    (id) => {
      const a = de(id);
      const r = despegaTirando(a, 0, AIRE_ESTANDAR)!;
      // Las dos son la misma —salvo el metro y pico de las ruedas, una centésima—:
      // se va a la Vr de la ficha, en las dos.
      expect(r.verdadera).toBeGreaterThanOrEqual(a.rotationSpeed);
      expect(r.verdadera).toBeLessThan(a.rotationSpeed + 0.2);
      expect(Math.abs(r.aguja - r.verdadera)).toBeLessThan(0.05);
    },
  );

  it.each(["jaz-20", "jaz-90"])(
    "%s: en Los Rodeos a 40 °C corre bastante más que a nivel del mar",
    (id) => {
      const a = de(id);
      const abajo = despegaTirando(a, 0, AIRE_ESTANDAR)!;
      const arriba = despegaTirando(a, LOS_RODEOS, aireDelParte(40, LOS_RODEOS))!;
      // Medido: el JAZ 20, 243 → 330 m; el JAZ 90, 636 → 775.
      expect(arriba.metros / abajo.metros).toBeGreaterThan(1.15);
    },
  );

  /*
   * **Y nadie se queda sin despegar.** La punta del suelo de este modelo no
   * crece con la altura, y la verdadera que hace falta, sí: si un día la Vr
   * de la aguja pidiera más de lo que el gas da rodando, el niño de cuatro
   * años correría la pista entera tirando y no se iría nunca. En el peor
   * campo con pista de la flota —hierba, que en asfalto sobra más— a 45 °C en
   * Los Rodeos, todos se van.
   */
  it.each(DE_ALA.map((a) => [a.id, a] as const))(
    "%s: en hierba, en Los Rodeos y a 45 °C, despega",
    (_id, a) => {
      const r = despegaTirando(a, LOS_RODEOS, aireDelParte(45, LOS_RODEOS), "hierba");
      expect(r, "no se fue del suelo en cuatro minutos").not.toBeNull();
      expect(r!.aguja).toBeGreaterThanOrEqual(a.rotationSpeed);
    },
  );
});
