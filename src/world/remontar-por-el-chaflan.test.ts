/**
 * **Lo que dice la radio es lo que hace el avión en la pista** (H41e).
 *
 * En El Hierro, por la 34, con cuatro metros por segundo de cola, el JAZ 40
 * pide 740,7 m. Desde la 3A se llega a la pista por los dos chaflanes de la
 * C: el que mira hacia donde se despega deja 724,9 m por delante, y el que
 * mira a la cabecera, 23 m más atrás, 748,1, pero mirando al revés. Se
 * entraba por el segundo, se rodaban unos diez metros pista abajo hacia la
 * cabecera, se daba la media vuelta y se despegaba, y la radio lo llamaba
 * «salida por intersección». Rodar por la pista hacia atrás es remontar,
 * aunque sean diez metros, y la torre lo autoriza con esa palabra:
 * «backtrack runway three four» (Doc 4444, 12.3.4.7 p; «regreso por pista»
 * en la fraseología española, RD 1180/2018, anexo V, 1.4.8).
 *
 * Esto rueda con un piloto perfecto —el avión puesto sobre la raya, a la
 * velocidad que pide el juego, como en `remontar-por-tipo.test.ts`— desde el
 * puesto hasta que empieza la carrera, y compara lo que se cuenta —rodando,
 * que es cuando la torre ofrece la intersección, y con la verde, que es
 * cuando autoriza a remontar— con lo que el avión hace sobre el asfalto.
 */

import { describe, expect, it } from "vitest";
import type { Punto } from "./aerodrome";
import { PlanDeVuelo, type ComoSeSale } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import type { DiaDeDespegue } from "../flight/carrera";
import { enEjesDePista } from "./rumbo";
import { conViento, EL_HIERRO, LA_GOMERA, PILAR, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";

interface HastaLaCarrera {
  /** Lo que se sabía rodando hacia el punto de espera, lo último preguntado. */
  readonly rodando: ComoSeSale | null;
  /** Lo que pone la verde. */
  readonly conLaVerde: ComoSeSale | null;
  /**
   * Metros rodados sobre la pista hacia la cabecera antes de la carrera: lo
   * que se va hacia atrás, a lo largo del eje, con las ruedas en el asfalto.
   */
  readonly haciaAtras: number;
  /** La pista que queda por delante al empezar la carrera, m. */
  readonly porDelante: number;
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
  let rodando: ComoSeSale | null = null;
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
      return { rodando, conLaVerde, haciaAtras, porDelante: mitad - e.along };
    if (!verde && plan.vaAlPuntoDeEspera) rodando = plan.comoSeSaldraDesdeLaEspera() ?? rodando;
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

/**
 * Lo que se puede ir hacia atrás sin remontar, m: cruzar el borde de la
 * pista por una calle que no llega del todo a escuadra.
 */
const SIN_REMONTAR = 5;

const jaz40 = AIRCRAFT.find((a) => a.id === "jaz-40")!;
// Desde H58 el Seneca pide 775 m —lo que vuela por su margen— y la 3A de la 34
// le deja 749: ya remonta. La avioneta pide hoy los 606 que pedía él, y hace
// de ejemplo de quien sale desde la intersección.
const jaz20 = AIRCRAFT.find((a) => a.id === "jaz-20")!;
const cola = (ms: number): DiaDeDespegue => ({
  densidad: 1.225,
  vientoDeFrente: -ms,
  superficie: "asfalto",
});

describe("la radio dice lo que hace el avión en la pista", () => {
  it("El Hierro por la 34, el JAZ 40 con 4 m/s de cola: remonta, y se dice remontar", () => {
    const r = hastaLaCarrera(EL_HIERRO, jaz40, 0, cola(4))!;
    expect(r).not.toBeNull();
    // Lo que se cuenta con la verde: remontar, y por el viento.
    expect(r.conLaVerde!.desde).toBe("remonte");
    expect(r.conLaVerde!.porQue).toBe("cola");
    // Y rodando no se le ofrece la intersección: no es por donde va a salir.
    expect(r.rodando?.desde ?? null).not.toBe("interseccion");
    // Lo que hace: rueda por la pista hacia la cabecera, y no diez metros.
    expect(r.haciaAtras).toBeGreaterThan(100);
    // Y sale con la pista que pide, con su margen.
    expect(r.porDelante).toBeGreaterThanOrEqual(r.conLaVerde!.necesitaHoy);
  });

  it("y sin cola la avioneta sale desde la C, por el chaflán que mira hacia donde se despega", () => {
    const r = hastaLaCarrera(EL_HIERRO, jaz20, 0)!;
    expect(r.conLaVerde!.desde).toBe("interseccion");
    expect(r.rodando!.desde).toBe("interseccion");
    expect(r.haciaAtras).toBeLessThan(SIN_REMONTAR);
    expect(r.porDelante).toBeGreaterThanOrEqual(r.conLaVerde!.necesitaHoy);
  });

  /*
   * Y en los campos sin calle hasta la cabecera, con cada avión que cabe y
   * por las dos: lo que se dice con la verde y lo que se rueda casan. Quien
   * sale desde la cabecera o desde una intersección no va por la pista hacia
   * atrás; quien remonta, sí.
   */
  const CAMPOS: readonly [Scenario, number, number][] = [
    [EL_HIERRO, 160, 340],
    [LA_GOMERA, 90, 270],
    [PILAR, 20, 200],
  ];
  for (const [esc, ...vientos] of CAMPOS) {
    for (const avion of AIRCRAFT) {
      if (!cabeEn(avion, campoDe(esc)).cabe) continue;
      for (const viento of vientos) {
        const donde = `${esc.id} ${avion.id} con viento de ${viento}`;
        it(`${donde}: lo que se dice es lo que se rueda`, () => {
          const r = hastaLaCarrera(esc, avion, viento);
          if (!r) return;
          const desde = r.conLaVerde?.desde;
          if (desde === "remonte") expect(r.haciaAtras, donde).toBeGreaterThan(100);
          else expect(r.haciaAtras, donde).toBeLessThan(SIN_REMONTAR);
          if (r.rodando?.desde === "interseccion") expect(desde, donde).toBe("interseccion");
        });
      }
    }
  }
});
