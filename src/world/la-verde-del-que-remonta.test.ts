/**
 * **A quien remonta, la autorización de despegar al dar la vuelta, y una
 * vez** (H41h).
 *
 * En El Hierro, a 42 °C con el JAZ 40, la torre le decía a quien juega
 * «cleared for take-off» en la doble raya, luego «backtrack runway three
 * four», y al acabar la media vuelta otra vez la verde y otra vez «cleared for
 * take-off». La verde fija es la autorización de despegar (SERA, apéndice 1,
 * tabla AP 1-1), y a quien remonta se le da después, cuando ha dado la vuelta
 * (Doc 4444, 7.9.3.4); hasta entonces la torre le autoriza a rodar por la
 * pista: destellos verdes. Ver `flight/luz-de-la-salida.ts`.
 *
 * Esto rueda con el piloto perfecto de `remontar-por-el-chaflan.test.ts` —el
 * avión puesto sobre la raya, a la velocidad que pide el juego— desde el
 * puesto hasta que empieza la carrera, y apunta la luz que toca en cada paso.
 * Lo que se pide: quien remonta ve la roja, los destellos y **una** verde
 * fija, ya vuelto; quien no remonta, la roja y la verde, sin destellos.
 */

import { describe, expect, it } from "vitest";
import type { Punto } from "./aerodrome";
import { PlanDeVuelo, type ComoSeSale } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import type { DiaDeDespegue } from "../flight/carrera";
import { luzDeLaSalida, type LuzDeLaTorre } from "../flight/luz-de-la-salida";
import { enEjesDePista } from "./rumbo";
import { conViento, EL_HIERRO, LA_GOMERA, PILAR, TENERIFE_NORTE, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";

interface Luces {
  /** Por dónde se sale, lo que pone la verde. */
  readonly sale: ComoSeSale | null;
  /** Las luces que se encendieron, por orden y sin repetir la de seguido. */
  readonly luces: readonly Exclude<LuzDeLaTorre, null>[];
  /** Si la verde fija se encendió con la media vuelta todavía por dar. */
  readonly verdeAntesDeLaVuelta: boolean;
}

/** Rueda del puesto a la carrera y apunta las luces. `null` si no se llega a correr. */
function lucesHastaLaCarrera(
  esc: Scenario,
  avion: AircraftConfig,
  vientoDe: number,
  dia?: DiaDeDespegue,
): Luces | null {
  const pista = conViento(esc, { ...TIEMPO_DE_CASA, vientoDe, vientoKt: 15 }).runway;
  const plan = new PlanDeVuelo(esc.aerodrome!, pista, () => 0, avion);
  if (dia) plan.diaDeDespegue = () => dia;
  plan.reiniciar();
  const dt = 0.1;
  const mitad = pista.length / 2;
  let p: Punto | null = null;
  let rumbo = 0;
  let v = 0;
  let sale: ComoSeSale | null = null;
  const luces: Exclude<LuzDeLaTorre, null>[] = [];
  let verdeAntesDeLaVuelta = false;
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
    // Lo mismo que lee `game.ts` en cada paso para la lámpara.
    const remontePorDelante = plan.dondeSeGira !== null;
    const luz = luzDeLaSalida(vista.fase, vista.luzVerde, remontePorDelante);
    if (luz && luces.at(-1) !== luz) luces.push(luz);
    if (luz === "verde" && remontePorDelante) verdeAntesDeLaVuelta = true;
    if (!sale && vista.luzVerde) sale = plan.comoSeSale;
    if (vista.fase === "despegando") return { sale, luces, verdeAntesDeLaVuelta };
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

const jaz40 = AIRCRAFT.find((a) => a.id === "jaz-40")!;
const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
const cola = (ms: number): DiaDeDespegue => ({
  densidad: 1.225,
  vientoDeFrente: -ms,
  superficie: "asfalto",
});

describe("la luz de la torre para quien sale", () => {
  it("en el punto de espera, roja; con la pista dada, verde; y apagada en la carrera", () => {
    expect(luzDeLaSalida("esperando", false, false)).toBe("roja");
    expect(luzDeLaSalida("autorizado", true, false)).toBe("verde");
    expect(luzDeLaSalida("alineando", true, false)).toBe("verde");
    expect(luzDeLaSalida("despegando", true, false)).toBeNull();
    expect(luzDeLaSalida("rodando", false, false)).toBeNull();
  });

  it("y con la media vuelta por dar, destellos: rodar por la pista, no despegar", () => {
    expect(luzDeLaSalida("autorizado", true, true)).toBe("rodar");
    expect(luzDeLaSalida("back-taxi", true, true)).toBe("rodar");
    // Sin la pista dada no hay luz que valga, ni remontando.
    expect(luzDeLaSalida("back-taxi", false, true)).toBeNull();
  });
});

describe("a quien remonta, la verde fija al dar la vuelta, y una", () => {
  it("El Hierro por la 34, el JAZ 40 con 4 m/s de cola: roja, destellos y una verde", () => {
    const r = lucesHastaLaCarrera(EL_HIERRO, jaz40, 0, cola(4))!;
    expect(r).not.toBeNull();
    expect(r.sale!.desde).toBe("remonte");
    expect(r.luces).toEqual(["roja", "rodar", "verde"]);
    expect(r.verdeAntesDeLaVuelta).toBe(false);
  });

  it("y sin cola sale desde la C, sin remontar: roja y verde, sin destellos", () => {
    const r = lucesHastaLaCarrera(EL_HIERRO, jaz40, 0)!;
    expect(r.sale!.desde).toBe("interseccion");
    expect(r.luces).toEqual(["roja", "verde"]);
  });

  it("Los Rodeos por la 12 y la E-2, el JAZ 90: roja y verde, como siempre", () => {
    const r = lucesHastaLaCarrera(TENERIFE_NORTE, jaz90, 120)!;
    expect(r).not.toBeNull();
    expect(r.sale!.desde).not.toBe("remonte");
    expect(r.luces).toEqual(["roja", "verde"]);
  });

  /*
   * Y en los campos sin calle hasta la cabecera, con cada avión que cabe y
   * por las dos: quien remonta tiene destellos y una sola verde, ya vuelto;
   * quien no, ningún destello.
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
        it(`${donde}: una sola verde, y después de remontar`, () => {
          const r = lucesHastaLaCarrera(esc, avion, viento);
          if (!r) return;
          expect(r.luces.filter((l) => l === "verde"), donde).toHaveLength(1);
          expect(r.luces.at(-1), donde).toBe("verde");
          expect(r.verdeAntesDeLaVuelta, donde).toBe(false);
          if (r.sale?.desde === "remonte") expect(r.luces, donde).toContain("rodar");
          else expect(r.luces, donde).not.toContain("rodar");
        });
      }
    }
  }
});

/**
 * **Quien da la vuelta antes del lazo dibujado** (H41i).
 *
 * Remonta con el piloto perfecto hasta llevar `tras` metros hacia la cabecera
 * desde donde pisó la pista —`"alEntrar"`: nada, nada más pisarla—, y ahí se
 * pone mirando pista abajo, parado, unos segundos. Apunta las luces de antes
 * y de después, y si la bandera del remonte se bajó.
 */
function girarAntes(
  esc: Scenario,
  avion: AircraftConfig,
  vientoDe: number,
  dia: DiaDeDespegue,
  tras: number | "alEntrar",
): {
  readonly sale: ComoSeSale | null;
  readonly antes: readonly Exclude<LuzDeLaTorre, null>[];
  readonly despues: readonly Exclude<LuzDeLaTorre, null>[];
  readonly remontado: number;
  /** Lo que faltaba hasta el sitio de girar dibujado al dar la vuelta, m. */
  readonly antesDelLazo: number;
  readonly bandera: boolean;
  readonly fase: string;
} | null {
  const pista = conViento(esc, { ...TIEMPO_DE_CASA, vientoDe, vientoKt: 15 }).runway;
  const plan = new PlanDeVuelo(esc.aerodrome!, pista, () => 0, avion);
  plan.diaDeDespegue = () => dia;
  plan.reiniciar();
  const dt = 0.1;
  const mitad = pista.length / 2;
  let p: Punto | null = null;
  let rumbo = 0;
  let v = 0;
  let sale: ComoSeSale | null = null;
  const antes: Exclude<LuzDeLaTorre, null>[] = [];
  const despues: Exclude<LuzDeLaTorre, null>[] = [];
  let entra: number | null = null;
  let masAtras = Infinity;
  let vuelto: { remontado: number; antesDelLazo: number } | null = null;
  let parado = 0;
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
    const luz = luzDeLaSalida(vista.fase, vista.luzVerde, plan.dondeSeGira !== null);
    const apunta = vuelto ? despues : antes;
    if (luz && apunta.at(-1) !== luz) apunta.push(luz);
    if (!sale && vista.luzVerde) sale = plan.comoSeSale;
    if (vuelto) {
      parado += dt;
      if (parado > 6 || vista.fase === "despegando")
        return {
          sale,
          antes,
          despues,
          ...vuelto,
          bandera: plan.dondeSeGira !== null,
          fase: vista.fase,
        };
      continue;
    }
    if (vista.fase === "esperando") {
      v = 0;
      continue;
    }
    // Lo remontado, con la pista pisada y la torre ya dada.
    if (enPista && vista.luzVerde) {
      entra ??= e.along;
      masAtras = Math.min(masAtras, e.along);
      const remontado = entra - masAtras;
      const giro = plan.dondeSeGira;
      if (giro !== null && (tras === "alEntrar" || remontado >= tras)) {
        vuelto = { remontado, antesDelLazo: e.along - giro };
        // Mirando pista abajo, parado.
        rumbo = (pista.heading * Math.PI) / 180;
        v = 0;
        continue;
      }
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

describe("quien da la vuelta antes del lazo dibujado (H41i)", () => {
  /*
   * El Hierro por la 34 con el JAZ 40 y 4 m/s de cola remonta hasta el final:
   * entra hacia el −113 y el lazo está hacia el −590. Quien da la vuelta a los
   * sesenta metros ya ha remontado, y mirando pista abajo es que ya ha dado
   * la vuelta: verde fija, una vez.
   */
  it("remontó sesenta metros y mira pista abajo: la verde fija, ya", () => {
    const r = girarAntes(EL_HIERRO, jaz40, 0, cola(4), 60)!;
    expect(r).not.toBeNull();
    expect(r.sale!.desde).toBe("remonte");
    expect(r.remontado).toBeGreaterThanOrEqual(60);
    // De verdad antes del lazo, y lejos: no es la vuelta dibujada.
    expect(r.antesDelLazo).toBeGreaterThan(200);
    expect(r.antes).toEqual(["roja", "rodar"]);
    expect(r.bandera).toBe(false);
    expect(r.despues).toEqual(["verde"]);
    expect(r.fase).toBe("alineando");
  });

  /*
   * Y quien llega a la pista ya mirando pista abajo, sin haber remontado
   * nada, no ha dado ninguna vuelta: sigue con los destellos, que todavía
   * tiene la pista por remontar (H41h). Mirar pista abajo solo no basta.
   */
  it("mirando pista abajo nada más pisarla, sin remontar: siguen los destellos", () => {
    const r = girarAntes(EL_HIERRO, jaz40, 0, cola(4), "alEntrar")!;
    expect(r).not.toBeNull();
    expect(r.sale!.desde).toBe("remonte");
    expect(r.remontado).toBeLessThan(30);
    expect(r.bandera).toBe(true);
    expect(r.despues).not.toContain("verde");
    expect([...r.antes, ...r.despues].at(-1)).toBe("rodar");
  });

  /*
   * Y a menos de treinta metros, igual: es entrar y alinearse, la misma
   * cuenta que la de `vigilarElRemonte`. Ver `flight/lo-remontado.ts`.
   */
  it("a veinte metros de remonte tampoco: la regla es la de quien no remonta", () => {
    const r = girarAntes(EL_HIERRO, jaz40, 0, cola(4), 20)!;
    expect(r).not.toBeNull();
    expect(r.remontado).toBeLessThan(30);
    expect(r.bandera).toBe(true);
    expect(r.despues).not.toContain("verde");
  });
});
