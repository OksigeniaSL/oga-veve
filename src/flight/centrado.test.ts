/**
 * El centrado entra en el modelo (H38b): con la carga de siempre nada cambia;
 * en el 172 cambiarse de asiento se nota y en el 747 no. Las cifras de la
 * tabla del ADR 0033 salen de `medir`, con `OGA_MEDIR=1`.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, PYKASU, conCentrado, conMasa, type AircraftConfig } from "./aircraft";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls, type ControlInputs } from "./model";
import { compensadorDeDespegue } from "./compensador-de-despegue";
import {
  centradoDeSuTipo,
  centroDeGravedad,
  centradoDeReferencia,
  desplazamientoDelCentrado,
  dondeCae,
  enLaCuerda,
  limitesDelCentrado,
  moverCarga,
  puntoNeutro,
  repartoQueVale,
  type CentradoDeSuTipo,
} from "./centrado";
import { ADULTO, MALETA, masaSinCombustibleDeLaHoja, pasajerosDeSuFicha } from "./hoja-de-carga";

const JUMBO = AIRCRAFT.find((a) => a.id === "jaz-120")!;
const T172 = centradoDeSuTipo(PYKASU)!;
const PULGADA = 0.0254;
/** El combustible de la prueba: media hora larga de 172, kg. */
const COMBUSTIBLE = 60;

function fly(m: CoefficientFlightModel, s: number, c: Partial<ControlInputs>, hasta?: () => boolean): void {
  const input = { ...neutralControls(), ...c };
  for (let i = 0; i < Math.round(s * 60); i++) {
    m.step(1 / 60, input);
    if (hasta?.()) return;
  }
}

/** El avión con la masa y el centrado de una carga, como lo arma el juego. */
function cargado(a: AircraftConfig, masa: number, dx: number): AircraftConfig {
  return conCentrado(conMasa(a, masa), dx);
}

/**
 * **Si levanta el morro a la Vr con esta palanca**: carrera a fondo con la
 * palanca suelta hasta la Vr, y desde ahí la palanca fija tres segundos. Se
 * levanta si el morro pasa de dos grados con las ruedas todavía abajo o ya en
 * el aire.
 */
function rota(a: AircraftConfig, palanca: number, trim = 0): boolean {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
  fly(m, 120, { throttle: 1, trim }, () => m.state.airspeed >= a.rotationSpeed);
  let arriba = false;
  fly(m, 3, { throttle: 1, trim, elevator: palanca }, () => {
    arriba = m.state.alpha > (2 * Math.PI) / 180 || !m.state.onGround;
    return arriba;
  });
  return arriba;
}

/** **La palanca que hace falta para rotar a la Vr**, de 0 a 1; más de 1 si ni a fondo. */
function palancaParaRotar(a: AircraftConfig): number {
  if (!rota(a, 1)) return Number.POSITIVE_INFINITY;
  let lo = -0.5;
  let hi = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (rota(a, mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * **Lo que hace el morro después de un tirón**, con el avión equilibrado a
 * 1,5 veces su Vr y compensado: un golpe de cabeceo de 0,1 rad/s y las manos
 * fuera. Devuelve el mayor ángulo de ataque que alcanza por encima del de
 * equilibrio y lo que queda de él a los seis segundos, en grados.
 */
function tiron(a: AircraftConfig): { pico: number; queda: number } {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  const v = a.rotationSpeed * 1.5;
  m.reset({ position: new Vector3(0, 1500, 0), heading: 0, airspeed: v, equilibrado: true });
  const trim = m.timonDeEquilibrio();
  const gas = m.gasPara?.(v, { flaps: 0, tren: 0 }) ?? 0.6;
  const alfa0 = m.state.alpha;
  m.state.pitchRate += 0.1;
  let pico = 0;
  fly(m, 6, { throttle: gas, trim, tren: 0 }, () => {
    pico = Math.max(pico, m.state.alpha - alfa0);
    return false;
  });
  const grados = 180 / Math.PI;
  return { pico: pico * grados, queda: (m.state.alpha - alfa0) * grados };
}

/**
 * **Una pérdida y su salida**: equilibrado y compensado a 1,5 veces su Vr, al
 * ralentí, se va tirando poco a poco —tres centésimas de palanca por
 * segundo— hasta pasar el ángulo de pérdida, se sostiene un segundo, y se
 * suelta la palanca con gas a fondo. Devuelve la palanca con la que entró y
 * cuánto tardó el ala en bajar del 70 % de su ángulo de pérdida; `null` si en
 * veinte segundos no bajó.
 */
function perdida(a: AircraftConfig): { palanca: number; sale: number | null } {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  m.reset({ position: new Vector3(0, 1500, 0), heading: 0, airspeed: a.rotationSpeed * 1.5, equilibrado: true });
  const trim = m.timonDeEquilibrio();
  const angulo = a.aero.alphaStall;
  let palanca = 0;
  for (let i = 0; i < 60 * 40 && m.state.alpha <= angulo; i++) {
    palanca = Math.min(1, palanca + 0.03 / 60);
    m.step(1 / 60, { ...neutralControls(), throttle: 0, trim, elevator: palanca, tren: 0 });
  }
  fly(m, 1, { throttle: 0, trim, elevator: palanca, tren: 0 });
  let sale: number | null = null;
  let t = 0;
  fly(m, 20, { throttle: 1, trim, tren: 0 }, () => {
    t += 1 / 60;
    if (m.state.alpha < angulo * 0.7) sale = t;
    return sale !== null;
  });
  return { palanca, sale };
}

function caso(t: CentradoDeSuTipo, filas: number[], bodegas: number[] = [0, 0]) {
  const reparto = repartoQueVale(t, filas.reduce((s, n) => s + n, 0), { filas, bodegas });
  const cg = centroDeGravedad(t, reparto, COMBUSTIBLE);
  const pasajeros = filas.reduce((s, n) => s + n, 0);
  const dx = desplazamientoDelCentrado(PYKASU, pasajeros, COMBUSTIBLE, reparto);
  return { cg, dx, avion: cargado(PYKASU, cg.masa, dx) };
}

describe("la carga de siempre no cambia nada", () => {
  it("el desplazamiento es cero exacto con la gente de su ficha, con cualquier combustible", () => {
    const n = pasajerosDeSuFicha(PYKASU);
    for (const kg of [0, 30, 60, 144]) expect(desplazamientoDelCentrado(PYKASU, n, kg)).toBe(0);
    // Y el avión sin hoja de centrado no se mueve con nada.
    expect(desplazamientoDelCentrado(JUMBO, 0, 50000)).toBe(0);
  });

  it("la copia sin desplazamiento es la misma ficha, y la marca del compensador es la misma", () => {
    expect(conCentrado(PYKASU, 0)).toBe(PYKASU);
    const masa = masaSinCombustibleDeLaHoja(PYKASU, pasajerosDeSuFicha(PYKASU)) + COMBUSTIBLE;
    expect(compensadorDeDespegue(cargado(PYKASU, masa, 0))).toEqual(
      compensadorDeDespegue(conMasa(PYKASU, masa)),
    );
  });

  it("el despegue con `ponerCentrado(0)` es el mismo bit a bit", () => {
    const vuela = (poner: boolean) => {
      const m = new CoefficientFlightModel({ aircraft: PYKASU, ground: () => 0, assist: 0 });
      m.reset({ position: new Vector3(0, PYKASU.gearHeight, 0), heading: 0, airspeed: 0 });
      if (poner) m.ponerCentrado(0);
      fly(m, 14, { throttle: 1 });
      fly(m, 8, { throttle: 1, elevator: 0.45 });
      return [m.state.position.x, m.state.position.y, m.state.position.z, m.state.alpha, m.state.pitchRate];
    };
    expect(vuela(true)).toEqual(vuela(false));
  });
});

describe("el centrado del 172, de su manual", () => {
  it("la carga de su ficha cae dentro de la envolvente, y el pasajero detrás también", () => {
    const ref = centradoDeReferencia(PYKASU, T172, COMBUSTIBLE);
    expect(ref.brazo / PULGADA).toBeCloseTo(39.4, 1);
    expect(dondeCae(T172, ref)).toBe("dentro");
    expect(dondeCae(T172, caso(T172, [0, 1]).cg)).toBe("dentro");
  });

  it("la envolvente es la de la p. 2-7: 35,0 hasta 1.950 lb, 40,0 a 2.450 y 47,3 detrás", () => {
    const lb = 0.45359237;
    expect(limitesDelCentrado(T172, 1800 * lb).delante / PULGADA).toBeCloseTo(35, 5);
    expect(limitesDelCentrado(T172, 2200 * lb).delante / PULGADA).toBeCloseTo(37.5, 5);
    expect(limitesDelCentrado(T172, 2450 * lb).detras / PULGADA).toBeCloseTo(47.3, 5);
  });

  it("con la cola cargada por encima del rótulo se sale por detrás", () => {
    // Quien pilota solo, dos atrás y 80 kg de maletas en la bodega 2, que
    // admite 50 lb: el error clásico.
    const { cg } = caso(T172, [0, 2], [0, 80]);
    expect(dondeCae(T172, cg)).toBe("detras");
  });
});

describe("en el 172 cambiarse de asiento se nota", () => {
  const delante = caso(T172, [1, 0]);
  const detras = caso(T172, [0, 1]);

  it("el pasajero de delante es la carga de su ficha: cero", () => {
    expect(delante.dx).toBe(0);
    // Y detrás, tres pulgadas largas hacia la cola.
    expect(detras.dx / PULGADA).toBeGreaterThan(2.9);
  });

  it("con el morro pesado hace falta más palanca para rotar", () => {
    const conMorro = palancaParaRotar(delante.avion);
    const conCola = palancaParaRotar(detras.avion);
    expect(conMorro).toBeGreaterThan(conCola + 0.05);
  });

  it("y la marca del compensador va más hacia morro arriba", () => {
    const a = compensadorDeDespegue(delante.avion).marca;
    const b = compensadorDeDespegue(detras.avion).marca;
    expect(a - b).toBeGreaterThan(0.03);
  });

  it("con la cola pesada es menos estable, y pasado el punto neutro el morro se va arriba solo", () => {
    const base = tiron(delante.avion);
    const enElLimite = tiron(
      cargado(delante.avion, delante.cg.masa, limitesDelCentrado(T172, delante.cg.masa).detras - delante.cg.brazo),
    );
    // Con la carga de su ficha el morro vuelve; en el límite de atrás vuelve
    // peor, y pasado el punto neutro no vuelve: sigue subiendo.
    expect(base.queda).toBeLessThan(0.2);
    expect(enElLimite.pico).toBeGreaterThan(base.pico);
    expect(enElLimite.queda).toBeGreaterThan(2 * base.queda);
    const pasado = tiron(cargado(delante.avion, delante.cg.masa, puntoNeutro(PYKASU) + 0.05));
    expect(pasado.queda).toBeGreaterThan(1);
    expect(pasado.queda).toBeGreaterThan(0.9 * pasado.pico);
    // Y en el suelo, a la Vr, levanta el morro hasta empujando la palanca.
    expect(rota(cargado(delante.avion, delante.cg.masa, puntoNeutro(PYKASU) + 0.05), -0.3)).toBe(true);
  });

  it("con la cola pesada se entra en pérdida con menos mano y cuesta más salir", () => {
    const base = perdida(delante.avion);
    const enElLimite = perdida(
      cargado(delante.avion, delante.cg.masa, limitesDelCentrado(T172, delante.cg.masa).detras - delante.cg.brazo),
    );
    const pasado = perdida(cargado(delante.avion, delante.cg.masa, puntoNeutro(PYKASU) + 0.05));
    expect(base.sale).not.toBeNull();
    expect(enElLimite.palanca).toBeLessThan(base.palanca * 0.6);
    expect(enElLimite.sale!).toBeGreaterThan(3 * base.sale!);
    // Pasado el punto neutro, soltando la palanca no sale.
    expect(pasado.sale).toBeNull();
  });
});

describe("en el 747 una persona no se nota", () => {
  it("de punta a punta del avión, la marca del compensador se mueve diez veces menos que en el 172", () => {
    const masa = JUMBO.masaSinCombustible + 30000;
    // Los 70,66 m del avión entero: más de lo que nadie puede andar dentro.
    const dx = moverCarga(masa, ADULTO + MALETA, 0, 70.66);
    expect(dx / JUMBO.chord).toBeLessThan(0.005);
    const a = compensadorDeDespegue(conMasa(JUMBO, masa)).marca;
    const b = compensadorDeDespegue(cargado(JUMBO, masa, dx)).marca;
    const en172 =
      compensadorDeDespegue(caso(T172, [1, 0]).avion).marca -
      compensadorDeDespegue(caso(T172, [0, 1]).avion).marca;
    expect(Math.abs(a - b)).toBeLessThan(en172 / 10);
  });
});

/*
 * **La tabla del ADR 0033.** Solo con `OGA_MEDIR=1`: no comprueba nada,
 * escribe las cifras.
 */
const entorno =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
describe.runIf(Boolean(import.meta.env.OGA_MEDIR || entorno.OGA_MEDIR))("medir", () => {
  it("escribe la tabla", () => {
    const filas: string[] = [];
    const nota = (nombre: string, a: AircraftConfig, extra: string) => {
      const r = palancaParaRotar(a);
      const c = compensadorDeDespegue(a).marca;
      const t = tiron(a);
      const p = perdida(a);
      filas.push(
        `${nombre} | ${extra} | marca ${c.toFixed(3)} | palanca ${Number.isFinite(r) ? r.toFixed(3) : "no rota"} | pico ${t.pico.toFixed(2)}° | queda ${t.queda.toFixed(2)}° | pérdida con ${p.palanca.toFixed(2)}, sale en ${p.sale === null ? "no sale" : p.sale.toFixed(2) + " s"}`,
      );
    };
    const pct = (brazo: number) => `${(enLaCuerda(T172, brazo) * 100).toFixed(1)} % MAC`;
    const np = puntoNeutro(PYKASU);
    const ref = centradoDeReferencia(PYKASU, T172, COMBUSTIBLE);
    filas.push(`172 punto neutro: ${((ref.brazo + np) / PULGADA).toFixed(1)} in, ${pct(ref.brazo + np)}`);
    for (const [nombre, f, b] of [
      ["172 ficha (1 delante)", [1, 0], [0, 0]],
      ["172 pasajero detrás", [0, 1], [0, 0]],
      ["172 tres pasajeros", [1, 2], [0, 0]],
      ["172 dos detrás + 80 kg en bodega 2", [0, 2], [0, 80]],
    ] as const) {
      const c = caso(T172, [...f], [...b]);
      nota(
        nombre,
        c.avion,
        `${c.cg.masa.toFixed(0)} kg, ${(c.cg.brazo / PULGADA).toFixed(2)} in, ${pct(c.cg.brazo)}, dx ${(c.dx * 100).toFixed(1)} cm, margen ${(((np - c.dx) / PYKASU.chord) * 100).toFixed(1)} % c, ${dondeCae(T172, c.cg)}`,
      );
    }
    const d = caso(T172, [1, 0]);
    for (const [nombre, dx] of [
      ["172 en el límite de atrás", limitesDelCentrado(T172, d.cg.masa).detras - d.cg.brazo],
      ["172 pasado el punto neutro (+5 cm)", np + 0.05],
      ["172 en el límite de delante a 2.450 lb", 40 * PULGADA - d.cg.brazo],
      ["172 15 cm delante", -0.15],
      ["172 30 cm delante", -0.3],
    ] as const) {
      nota(nombre, cargado(PYKASU, d.cg.masa, dx), `dx ${(dx * 100).toFixed(1)} cm, ${pct(d.cg.brazo + dx)}`);
    }
    const masa = JUMBO.masaSinCombustible + 30000;
    const dx = moverCarga(masa, ADULTO + MALETA, 0, 70.66);
    nota("747 carga de su ficha", conMasa(JUMBO, masa), `${masa} kg`);
    nota("747 una persona de punta a punta", cargado(JUMBO, masa, dx), `dx ${(dx * 100).toFixed(2)} cm, ${((dx / JUMBO.chord) * 100).toFixed(2)} % c`);
    console.log("\nTABLA\n" + filas.join("\n"));
  });
});
