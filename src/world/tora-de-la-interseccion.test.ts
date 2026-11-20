/**
 * **La TORA que dice la torre es la publicada, y la que decide resta la
 * alineación** (H41f).
 *
 * Saliendo por una intersección la torre decía la pista desde el nudo del
 * eje —725 m en la C de El Hierro con el JAZ 40—, la cuenta de si bastaba
 * usaba ese mismo número, y el avión soltaba frenos con menos: 717,6 m con un
 * piloto perfecto, porque ponerse en el eje se come unos metros. De verdad son
 * dos números: la TORA de una intersección se publica desde el borde de la
 * calle (CAP 168, cap. 3), y quien despega le resta la pérdida por alineación
 * (AMC1 CAT.POL.A.205). La torre dice la primera; la cuenta, la segunda.
 *
 * Rueda con un piloto perfecto —el avión puesto sobre la raya, a la velocidad
 * que pide el juego, como en `remontar-por-el-chaflan.test.ts`— desde el
 * puesto hasta que empieza la carrera.
 */

import { describe, expect, it } from "vitest";
import type { Punto } from "./aerodrome";
import { PlanDeVuelo, type ComoSeSale } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { pistaNecesariaHoy, type DiaDeDespegue } from "../flight/carrera";
import { enEjesDePista } from "./rumbo";
import { conViento, EL_HIERRO, TENERIFE_NORTE, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";

interface HastaLaCarrera {
  /** Lo que pone la verde. */
  readonly conLaVerde: ComoSeSale | null;
  /** Metros rodados sobre la pista hacia la cabecera antes de la carrera. */
  readonly haciaAtras: number;
  /** La pista que queda por delante al quedar alineado en el eje, m. */
  readonly alSoltarFrenos: number;
}

/** Rueda del puesto a la carrera y mide. `null` si no se llega a correr. */
function hastaLaCarrera(
  esc: Scenario,
  avion: AircraftConfig,
  vientoDe: number,
  dia?: DiaDeDespegue,
): HastaLaCarrera | null {
  const pista = conViento(esc, { ...TIEMPO_DE_CASA, vientoDe, vientoKt: 15 }).runway;
  const plan = new PlanDeVuelo(esc.aerodrome!, pista, () => 0, avion);
  if (dia) plan.diaDeDespegue = () => dia;
  plan.reiniciar();
  const dt = 0.1;
  const mitad = pista.length / 2;
  let p: Punto | null = null;
  let rumbo = 0;
  let v = 0;
  let conLaVerde: ComoSeSale | null = null;
  let verde = false;
  let haciaAtras = 0;
  let antes: number | null = null;
  for (let t = 0; t < 1200; t += dt) {
    const ruta = plan.rutaVisible();
    if (!p) {
      const a = ruta[0];
      const b = ruta[1];
      if (!a || !b) return null;
      p = [a[0], a[1]];
      rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
    }
    const e = enEjesDePista(p[0], p[1], pista.x, pista.z, pista.heading);
    const enPista = Math.abs(e.across) < pista.width / 2 && Math.abs(e.along) < mitad;
    const vista = plan.paso(
      {
        position: { x: p[0], y: 0, z: p[1] },
        velocity: { x: Math.sin(rumbo) * v, y: 0, z: -Math.cos(rumbo) * v },
        heading: rumbo,
        airspeed: v,
        groundSpeed: v,
        verticalSpeed: 0,
        yawRate: 0,
        onGround: true,
        onRunway: enPista,
      } as never,
      0,
      true,
      dt,
    );
    if (vista.fase === "despegando")
      return { conLaVerde, haciaAtras, alSoltarFrenos: mitad - e.along };
    if (
      !verde &&
      (vista.fase === "autorizado" || vista.fase === "back-taxi" || vista.fase === "alineando")
    ) {
      verde = true;
      conLaVerde = plan.comoSeSale;
    }
    if (enPista && antes !== null) haciaAtras += Math.max(0, antes - e.along);
    antes = enPista ? e.along : null;
    if (vista.fase === "esperando") {
      v = 0;
      continue;
    }
    v = Math.max(0.5, vista.velocidadSugerida);
    const meta = plan.avanceEnLaRuta + v * dt;
    let anda = 0;
    let sig: Punto | null = null;
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = ruta[i]!;
      const b = ruta[i + 1]!;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (anda + l >= meta) {
        const u = l > 0 ? (meta - anda) / l : 0;
        sig = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
        rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
        break;
      }
      anda += l;
    }
    if (!sig) return null;
    p = sig;
  }
  return null;
}

const avion = (id: string): AircraftConfig => AIRCRAFT.find((a) => a.id === id)!;
const jaz40 = avion("jaz-40");
const cola = (ms: number): DiaDeDespegue => ({
  densidad: 1.225,
  vientoDeFrente: -ms,
  superficie: "asfalto",
});

/**
 * Lo que puede apartarse lo que da la cuenta de donde suelta frenos el piloto
 * perfecto, m: «alineado» es a menos de ocho grados del rumbo de la pista, y
 * eso llega un par de metros antes de acabar el codo.
 */
const LO_QUE_SE_MIDE = 3;

describe("la TORA de la intersección (H41f)", () => {
  it("El Hierro por la 34, el JAZ 40 sin viento: la torre dice la publicada, y la cuenta resta la alineación", () => {
    const r = hastaLaCarrera(EL_HIERRO, jaz40, 0)!;
    expect(r).not.toBeNull();
    const sale = r.conLaVerde!;
    expect(sale.desde).toBe("interseccion");
    // Una sola cuenta: lo que queda al soltar frenos es la TORA menos la alineación.
    expect(sale.porDelante).toBeCloseTo(sale.desdeLaEntrada - sale.alinearse, 6);
    // La que se dice, desde el borde de la calle, es más de la que queda alineado.
    expect(sale.desdeLaEntrada).toBeGreaterThan(r.alSoltarFrenos + 10);
    // Y la que decide es la que tiene el avión al quedar en el eje.
    expect(Math.abs(sale.porDelante - r.alSoltarFrenos)).toBeLessThan(LO_QUE_SE_MIDE);
    expect(r.alSoltarFrenos).toBeGreaterThanOrEqual(sale.necesitaHoy);
    expect(r.haciaAtras).toBeLessThan(5);
  });

  /*
   * Y si con la alineación ya no basta, se remonta: un día que pide más de lo
   * que queda alineado y menos que la TORA dicha. Sin restar la alineación,
   * ése salía desde la C.
   */
  it("y si la que queda alineado no basta, aunque la TORA sí, remonta", () => {
    const sinViento = hastaLaCarrera(EL_HIERRO, jaz40, 0)!.conLaVerde!;
    const quiere = sinViento.porDelante + 3;
    let lo = 0;
    let hi = 6;
    for (let k = 0; k < 40; k++) {
      const mitad = (lo + hi) / 2;
      if (pistaNecesariaHoy(jaz40, cola(mitad)) < quiere) lo = mitad;
      else hi = mitad;
    }
    const dia = cola(hi);
    const pide = pistaNecesariaHoy(jaz40, dia);
    expect(pide).toBeGreaterThan(sinViento.porDelante);
    expect(pide).toBeLessThan(sinViento.desdeLaEntrada);
    const r = hastaLaCarrera(EL_HIERRO, jaz40, 0, dia)!;
    expect(r.conLaVerde!.desde).toBe("remonte");
    expect(r.haciaAtras).toBeGreaterThan(100);
    expect(r.alSoltarFrenos).toBeGreaterThanOrEqual(pide);
  });

  /*
   * Donde el AIP publica la TORA de la intersección, la torre dice ésa: en
   * Los Rodeos, por la 12 desde la E-2, 2.546 m (AD 2.13, «12 INT E-2»).
   */
  it("en Los Rodeos, por la 12 con el JAZ 90, la torre dice la del AIP desde la E-2", () => {
    const r = hastaLaCarrera(TENERIFE_NORTE, avion("jaz-90"), 120)!;
    expect(r).not.toBeNull();
    const sale = r.conLaVerde!;
    expect(sale.desde).toBe("interseccion");
    expect(sale.desdeLaEntrada).toBe(2546);
    expect(sale.porDelante).toBeCloseTo(2546 - sale.alinearse, 6);
    expect(sale.porDelante).toBeGreaterThanOrEqual(sale.necesitaHoy);
  });
});
