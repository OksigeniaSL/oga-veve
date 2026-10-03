/**
 * **El control fino en la final**: corregir de lado con el teclado, con los
 * flaps a tope y el tren fuera, a la velocidad de la final. Ver
 * `flight/mano.ts`.
 *
 * Existe por un aterrizaje de Enrique con el JAZ 120 en Guyrami: «cuando está
 * llegando, en maniobra de aterrizaje con flaps a tope de abajo y tren puesto,
 * para moverlo derecha izquierda (fino) e ir estabilizando, tienes que verme
 * dando dedazos a las flechas de los nervios. Es como llevar un cochito
 * loco». Aquí se mide, en los aviones de la final —JAZ 120, JAZ 90 y JAZ 60—
 * y en cuatro peldaños: lo que se mueve el avión sin tocar nada, lo que deja
 * un toque y cuánto rumbo cambia, lo que deja la tecla según lo que se
 * aprieta, qué hace el imán y un piloto que intenta meterse en el eje a
 * toques.
 *
 * Con `OGA_MEDIR=1` saca la tabla; `OGA_TRAZA_EJE=jaz-120,tuka` escribe el
 * piloto fotograma a fotograma (y `OGA_NERVIOSO=1`, el nervioso).
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import { GUYRAMI, TAGUATO, TAGUATO_RUVICHA, TUKA, type Tier } from "./tiers";
import { DT, EN_GRADOS, empezar, volar, type VueloDeBanco } from "./mano-banco";
import { gasDeLosAutomaticos, memoriaDeGasesNueva, type MemoriaDeGases } from "./gases-automaticos";
import { empujeLleno } from "./fdm";
import { bankAngleOf } from "../ui/actitud";
import type { LoQuePide } from "./mano";

const RAD = Math.PI / 180;
type Pide = Partial<LoQuePide>;

/**
 * Cómo se lleva el gas: quieto donde quedó, con los gases automáticos —los
 * de la final de Guyrami, y la ley de los del reactor— o con el integrador de
 * `mano-respuesta.test.ts`.
 */
type Gas = "fijo" | "automatico" | "integrador";

interface Final {
  v: VueloDeBanco;
  ias: number;
  gas: Gas;
  memoria: MemoriaDeGases;
}

function iasDe(v: VueloDeBanco): number {
  const s = v.modelo.state;
  return s.airspeed * Math.sqrt(airDensity(s.position.y) / SEA_LEVEL_DENSITY);
}

function moverElGas(f: Final): void {
  const v = f.v;
  if (f.gas === "fijo") return;
  if (f.gas === "integrador") {
    v.gas = Math.max(0, Math.min(1, v.gas + DT * 0.08 * (f.ias - iasDe(v))));
    return;
  }
  const s = v.modelo.state;
  v.gas = gasDeLosAutomaticos(
    {
      velocidad: iasDe(v),
      gas: v.gas,
      empujeAFondo: empujeLleno(v.aircraft, airDensity(s.position.y), s.airspeed),
      masa: v.aircraft.mass,
      ...(v.tier.model === "simple" ? { equilibrio: v.modelo.gasPara(f.ias) } : {}),
    },
    "SPD",
    f.ias,
    DT,
    f.memoria,
  );
}

function vuela(
  f: Final,
  segundos: number,
  pide: (t: number) => Pide,
  medir?: (t: number) => void,
): void {
  let t = 0;
  volar(
    f.v,
    segundos,
    (ahora) => {
      t = ahora;
      moverElGas(f);
      return pide(ahora);
    },
    medir && (() => medir(t + DT)),
  );
}

/**
 * En la final: a su velocidad de aproximación, flaps a tope, tren fuera
 * —`neutralControls` lo trae fuera—, con la mano llevando los dos ejes, alas
 * niveladas y la senda pedida, y un minuto con los gases automáticos para que
 * se asiente. Después, el gas que se pida.
 */
function enLaFinal(a: AircraftConfig, tier: Tier, senda = -3, gas: Gas = "automatico"): Final {
  const ias = a.approachSpeed;
  const v = empezar(a, tier, ias, senda < 0 ? 600 : 300, 1);
  // Con el gas buscando la velocidad, la mano sostiene la senda en todos. Ver
  // `sostieneLaVelocidad` en `mano.ts`.
  v.gasLlevaLaVelocidad = true;
  const f: Final = { v, ias, gas: "automatico", memoria: memoriaDeGasesNueva() };
  vuela(f, 0.1, () => ({}));
  v.mano.ponerPalanca(0, 0);
  v.mano.cabeceo.meta = senda * RAD;
  v.mano.cabeceo.metaDelDedo = false;
  v.mano.cabeceo.prisa = false;
  vuela(f, 60, () => ({}));
  f.gas = gas;
  v.gasLlevaLaVelocidad = gas !== "fijo";
  return f;
}

const alabeoDe = (f: Final): number => bankAngleOf(f.v.modelo.state.orientation);
/** La derrota, rad: hacia dónde va sobre el suelo. Rumbo cero es −z. */
const derrotaDe = (f: Final): number => {
  const vel = f.v.modelo.state.velocity;
  return Math.atan2(vel.x, -vel.z);
};
const ladoDe = (f: Final): number => f.v.modelo.state.position.x;

/**
 * Una tecla apretada `dura` segundos, como llega de `input.ts`: hasta dos
 * décimas es un toque, y en el fotograma de soltar llega su paso.
 */
const DURA = 0.1;
function toque(t: number, signo: number, dura = DURA): Pide {
  if (t < dura - 1e-9) return { teclaAlabeo: signo };
  if (t < dura + DT - 1e-9) return dura <= 0.2 ? { toqueAlabeo: signo } : {};
  return {};
}

// ── Medidas ─────────────────────────────────────────────────────────────

interface SinTocar {
  /** La V/S, ± m/s, en los noventa segundos y en los cuarenta y cinco últimos. */
  vsPico: number;
  vsAsentada: number;
  vsPeriodo: number;
  /** Lo que cambia la derrota en noventa segundos, °, y lo más inclinado. */
  rumbo: number;
  alabeo: number;
  /** La IAS, ± m/s. */
  ias: number;
}

/** Noventa segundos sin tocar nada: lo que se mueve solo. */
function sinTocar(a: AircraftConfig, tier: Tier, senda: number, gas: Gas): SinTocar {
  const f = enLaFinal(a, tier, senda, gas);
  const vs: number[] = [];
  const ias: number[] = [];
  let alabeo = 0;
  const r0 = derrotaDe(f);
  vuela(f, 90, () => ({}), () => {
    vs.push(f.v.modelo.state.verticalSpeed);
    ias.push(iasDe(f.v));
    alabeo = Math.max(alabeo, Math.abs(alabeoDe(f)));
  });
  const media = vs.reduce((x, y) => x + y, 0) / vs.length;
  let cruces = 0;
  let primero = -1;
  let ultimo = -1;
  for (let i = 1; i < vs.length; i++)
    if ((vs[i - 1]! - media) * (vs[i]! - media) < 0) {
      cruces++;
      if (primero < 0) primero = i;
      ultimo = i;
    }
  const tarde = vs.slice(vs.length / 2);
  return {
    vsPico: (Math.max(...vs) - Math.min(...vs)) / 2,
    vsAsentada: (Math.max(...tarde) - Math.min(...tarde)) / 2,
    vsPeriodo: cruces >= 3 ? (2 * (ultimo - primero) * DT) / (cruces - 1) : Infinity,
    rumbo: (derrotaDe(f) - r0) * EN_GRADOS,
    alabeo: alabeo * EN_GRADOS,
    ias: (Math.max(...ias) - Math.min(...ias)) / 2,
  };
}

interface DelToque {
  /** Lo que deja un toque, °. */
  alabeo: number;
  /** A qué ritmo cambia el rumbo con él, °/s, y cuánto en tres segundos, °. */
  ritmoDeRumbo: number;
  rumboEn3: number;
  /** Dónde queda el ala con un contratoque a los tres segundos, °. */
  vuelve: number;
  /** Cuánto rumbo se ganó en total con el toque y el contratoque, °. */
  rumboTotal: number;
  /** Lo que se aparta la V/S de la del vuelo sin tocar, m/s. */
  vsDelToque: number;
}

function delToque(a: AircraftConfig, tier: Tier): DelToque {
  const f = enLaFinal(a, tier);
  const base = enLaFinal(a, tier);
  const r0 = derrotaDe(f);
  const rb0 = derrotaDe(base);
  let alabeo = 0;
  let rumboEn3 = 0;
  let vsDelToque = 0;
  const vsBase: number[] = [];
  vuela(base, 12, () => ({}), () => vsBase.push(base.v.modelo.state.verticalSpeed));
  let i = 0;
  vuela(
    f,
    12,
    (t) => (t < 3 ? toque(t, 1) : toque(t - 3, -1)),
    (t) => {
      if (Math.abs(t - 2.5) < DT / 2) alabeo = alabeoDe(f) * EN_GRADOS;
      if (Math.abs(t - 3) < DT / 2) rumboEn3 = (derrotaDe(f) - r0) * EN_GRADOS;
      vsDelToque = Math.max(vsDelToque, Math.abs(f.v.modelo.state.verticalSpeed - vsBase[i]!));
      i++;
    },
  );
  return {
    alabeo,
    ritmoDeRumbo: rumboEn3 / 3,
    rumboEn3,
    vuelve: alabeoDe(f) * EN_GRADOS,
    rumboTotal: (derrotaDe(f) - r0 - (derrotaDe(base) - rb0)) * EN_GRADOS,
    vsDelToque,
  };
}

/**
 * **Lo que deja un toque**, rad: lo que sabe quien vuela porque lo ha
 * probado. El piloto de `alEje` lo usa para decidir cuándo vale la pena dar
 * otro.
 */
function loQueDejaUnToque(a: AircraftConfig, tier: Tier): number {
  const f = enLaFinal(a, tier);
  vuela(f, 4, (t) => toque(t, 1));
  return alabeoDe(f);
}

/** **Lo que deja apretar la tecla `d` segundos** desde alas niveladas, °. */
function porDuracion(a: AircraftConfig, tier: Tier, d: number): number {
  const f = enLaFinal(a, tier);
  vuela(f, d + 5, (t) => toque(t, 1, d));
  return alabeoDe(f) * EN_GRADOS;
}
const DURACIONES = [0.05, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.7, 1.0];

/**
 * **El imán**: inclinado a `desde` grados, se aprieta hacia el centro y se
 * suelta al ver `suelta` grados. Dónde se queda el ala, °. Se suelta al ver,
 * como quien vuela.
 */
function iman(a: AircraftConfig, tier: Tier, desde: number, suelta: number): number {
  const f = enLaFinal(a, tier);
  let llego = false;
  vuela(f, 30, () => {
    llego = llego || alabeoDe(f) >= desde * RAD - 0.3 * RAD;
    return { teclaAlabeo: llego ? 0 : 1 };
  });
  vuela(f, 6, () => ({}));
  let soltada = false;
  vuela(f, 8, () => {
    soltada = soltada || alabeoDe(f) <= suelta * RAD;
    return { teclaAlabeo: soltada ? 0 : -1 };
  });
  return alabeoDe(f) * EN_GRADOS;
}

interface AlEje {
  /** Cuándo queda a menos de 3 m del eje para no salir, s. */
  dentro: number;
  /** Cuántas veces se va al otro lado más de metro y medio, y lo más, m. */
  cruces: number;
  pasado: number;
  /** Los toques en un minuto, y los que dio hasta quedar dentro. */
  toques: number;
  toquesHastaDentro: number;
  /** Lo más inclinado, °. */
  alabeo: number;
}

/**
 * **Un piloto que se mete en el eje a toques**, desde `desvio` metros a la
 * derecha y con la derrota de la pista. Ve el avión como estaba hace tres
 * décimas, que es lo que tarda una persona.
 *
 * Quiere cerrar el desvío con una constante de tiempo de `CIERRA` segundos y
 * la derrota con una de `GIRA`, sin pasar de cinco grados de derrota ni de
 * cinco de inclinación —lo que se hace en una final—. Da un toque cuando lo
 * que ve se aparta de lo que quiere más de `MEDIO_TOQUE` toques, y entre toque
 * y toque espera `espera` segundos. Y con un metro de eje y medio grado de
 * derrota, está contento y no toca.
 */
const CIERRA = 8;
const GIRA = 2.5;
const MEDIO_TOQUE = 0.6;
/**
 * Lo que espera entre toque y toque, s: el tranquilo, a ver qué ha hecho el
 * anterior; el nervioso, lo justo para apretar y mirar.
 */
const ESPERA_TRANQUILA = 1.2;
const ESPERA_NERVIOSA = 0.6;
const CONTENTO_EN_EL_EJE = 1;
const CONTENTO_EN_LA_DERROTA = 0.5 * RAD;
/** Lo que hay que irse al otro lado del eje para contar que se pasó, m. */
const PASARSE = 1.5;

export function alEje(
  f: Final,
  pasoDelToque: number,
  desvio = 30,
  segundos = 60,
  traza = false,
  espera = ESPERA_TRANQUILA,
): AlEje {
  const s = f.v.modelo.state;
  s.position.x += desvio;
  const atras = Math.round(0.3 / DT);
  const visto: { lado: number; derrota: number; alabeo: number }[] = [];
  let ultimoToque = -Infinity;
  const momentos: number[] = [];
  let dentro = 0;
  let cruces = 0;
  let pasado = 0;
  let alabeoMax = 0;
  let signoAntes = Math.sign(desvio);
  let enCurso: { desde: number; signo: number } | null = null;
  const V = Math.max(s.airspeed, 1);
  vuela(
    f,
    segundos,
    (t) => {
      visto.push({ lado: ladoDe(f), derrota: derrotaDe(f), alabeo: alabeoDe(f) });
      const ve = visto.length > atras ? visto[visto.length - 1 - atras]! : visto[0]!;
      if (enCurso) {
        const p = toque(t - enCurso.desde, enCurso.signo);
        if (t - enCurso.desde > DURA + DT) enCurso = null;
        return p;
      }
      if (t - ultimoToque < espera) return {};
      if (
        Math.abs(ve.lado) < CONTENTO_EN_EL_EJE &&
        Math.abs(ve.derrota) < CONTENTO_EN_LA_DERROTA &&
        Math.abs(ve.alabeo) < pasoDelToque
      )
        return {};
      const derrotaQuiere = Math.max(-5 * RAD, Math.min(5 * RAD, -ve.lado / (CIERRA * V)));
      const alabeoQuiere = Math.max(
        -5 * RAD,
        Math.min(5 * RAD, ((derrotaQuiere - ve.derrota) * V) / (9.81 * GIRA)),
      );
      const falta = alabeoQuiere - ve.alabeo;
      if (Math.abs(falta) > MEDIO_TOQUE * pasoDelToque) {
        enCurso = { desde: t, signo: Math.sign(falta) };
        ultimoToque = t;
        momentos.push(t);
        return toque(0, enCurso.signo);
      }
      return {};
    },
    (t) => {
      const lado = ladoDe(f);
      if (Math.abs(lado) >= 3) dentro = t;
      if (lado * signoAntes < -PASARSE) {
        cruces++;
        signoAntes = Math.sign(lado);
      }
      pasado = Math.max(pasado, -Math.sign(desvio) * lado);
      alabeoMax = Math.max(alabeoMax, Math.abs(alabeoDe(f)));
      if (traza && Math.round(t * 60) % 15 === 0)
        console.log(
          `t=${t.toFixed(2)} y=${lado.toFixed(1)} χ=${(derrotaDe(f) * EN_GRADOS).toFixed(2)} φ=${(alabeoDe(f) * EN_GRADOS).toFixed(2)} c=${(f.v.mano.alabeo.consigna.valor * EN_GRADOS).toFixed(2)} vs=${s.verticalSpeed.toFixed(2)}`,
        );
    },
  );
  return {
    dentro,
    cruces,
    pasado,
    toques: momentos.length,
    toquesHastaDentro: momentos.filter((x) => x <= dentro).length,
    alabeo: alabeoMax * EN_GRADOS,
  };
}

const entorno =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const medir = import.meta.env.OGA_MEDIR || entorno.OGA_MEDIR;
const f1 = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "∞").padStart(6);

const AVIONES_DE_LA_FINAL = ["jaz-120", "jaz-90", "jaz-60"];
const PELDANOS: readonly Tier[] = [GUYRAMI, TUKA, TAGUATO, TAGUATO_RUVICHA];
const avion = (id: string): AircraftConfig => AIRCRAFT.find((a) => a.id === id)!;

describe.runIf(entorno.OGA_TRAZA_EJE)("traza", () => {
  it("al eje", () => {
    const [id, peldano] = entorno.OGA_TRAZA_EJE!.split(",");
    const tier = PELDANOS.find((x) => x.id === peldano)!;
    const a = avion(id!);
    alEje(
      enLaFinal(a, tier),
      loQueDejaUnToque(a, tier),
      30,
      40,
      true,
      entorno.OGA_NERVIOSO ? ESPERA_NERVIOSA : ESPERA_TRANQUILA,
    );
  });
});

describe.runIf(medir)("la final, medida", () => {
  it("sin tocar nada", () => {
    const filas = [
      "\navión    peldaño          senda gas        | V/S ± m/s · asentada · periodo s | rumbo ° en 90 s | alabeo máx ° | IAS ± m/s",
    ];
    for (const id of AVIONES_DE_LA_FINAL)
      for (const tier of PELDANOS)
        for (const senda of [0, -3])
          for (const gas of ["fijo", "automatico", "integrador"] as Gas[]) {
            const r = sinTocar(avion(id), tier, senda, gas);
            filas.push(
              `${id.padEnd(8)} ${tier.id.padEnd(16)} ${String(senda).padStart(3)}   ${gas.padEnd(10)} |` +
                `${f1(r.vsPico, 2)} ·${f1(r.vsAsentada, 2)} · ${f1(r.vsPeriodo, 0)}       |${f1(r.rumbo, 2)}          |${f1(r.alabeo, 2)}       |${f1(r.ias, 2)}`,
            );
          }
    console.log(filas.join("\n"));
  });

  it("el toque, el imán y la duración", () => {
    const filas = [
      "\navión    peldaño          | toque: φ° · rumbo °/s · rumbo a 3 s · contratoque φ° · rumbo total ° · V/S m/s | imán 10→5 · 10→3 · 8→2 ° | tecla " +
        DURACIONES.map((d) => String(d)).join(" · ") +
        " s → φ°",
    ];
    for (const id of AVIONES_DE_LA_FINAL)
      for (const tier of PELDANOS) {
        const a = avion(id);
        const t = delToque(a, tier);
        const im = [iman(a, tier, 10, 5), iman(a, tier, 10, 3), iman(a, tier, 8, 2)];
        const dur = DURACIONES.map((d) => porDuracion(a, tier, d));
        filas.push(
          `${id.padEnd(8)} ${tier.id.padEnd(16)} |` +
            `${f1(t.alabeo, 2)} ·${f1(t.ritmoDeRumbo, 2)} ·${f1(t.rumboEn3, 2)} ·${f1(t.vuelve, 2)} ·${f1(t.rumboTotal, 2)} ·${f1(t.vsDelToque, 2)} |` +
            im.map((x) => f1(x, 1)).join(" ·") +
            " |" +
            dur.map((x) => f1(x, 1)).join(" ·"),
        );
      }
    console.log(filas.join("\n"));
  });

  it("al eje desde 30 m", () => {
    const filas = [
      "\navión    peldaño          piloto    | dentro s · cruces · se pasa m · toques (hasta dentro) · φ máx °",
    ];
    for (const id of AVIONES_DE_LA_FINAL)
      for (const tier of PELDANOS) {
        const a = avion(id);
        const paso = loQueDejaUnToque(a, tier);
        for (const [nombre, espera] of [
          ["tranquilo", ESPERA_TRANQUILA],
          ["nervioso", ESPERA_NERVIOSA],
        ] as const) {
          const r = alEje(enLaFinal(a, tier), paso, 30, 60, false, espera);
          filas.push(
            `${id.padEnd(8)} ${tier.id.padEnd(16)} ${nombre.padEnd(9)} |${f1(r.dentro, 1)} · ${r.cruces} ·${f1(r.pasado, 1)} · ${String(r.toques).padStart(3)} (${String(r.toquesHastaDentro).padStart(2)}) ·${f1(r.alabeo, 1)}`,
          );
        }
      }
    console.log(filas.join("\n"));
  });
});

// ── Las pruebas ─────────────────────────────────────────────────────────────

describe("la final, con los flaps a tope y el tren fuera", () => {
  const casos = AVIONES_DE_LA_FINAL.flatMap((id) => PELDANOS.map((tier) => ({ a: avion(id), tier })));
  const donde = (c: { a: AircraftConfig; tier: Tier }): string => `${c.a.id} en ${c.tier.id}`;

  it("sin tocar nada, la V/S y el rumbo se quedan quietos", () => {
    /*
     * El JAZ 120 subía y bajaba solo ±5,4 m/s cada 22 s, y el JAZ 90 ±1,4: ver
     * `apretonPorVelocidad` en `mano.ts`. En crucero, limpios, se quedan en
     * ±0,1 m/s; con los flaps abajo, igual de quietos, pasado el primer
     * minuto y medio que tarda en asentarse lo que deja el banco al sacar los
     * flaps.
     */
    for (const c of casos)
      for (const senda of [0, -3]) {
        const r = sinTocar(c.a, c.tier, senda, "automatico");
        const aqui = `${donde(c)}, senda ${senda}`;
        expect(r.vsAsentada, aqui).toBeLessThan(0.1);
        expect(Math.abs(r.rumbo), aqui).toBeLessThan(0.5);
        expect(r.alabeo, aqui).toBeLessThan(0.5);
      }
  });

  it("y quietos aunque el gas se quede donde está", () => {
    for (const c of casos) {
      const r = sinTocar(c.a, c.tier, -3, "fijo");
      expect(r.vsAsentada, donde(c)).toBeLessThan(0.1);
    }
  });

  it("un toque es una corrección fina: grado y medio, y el contratoque la deshace", () => {
    for (const c of casos) {
      const r = delToque(c.a, c.tier);
      expect(r.alabeo, donde(c)).toBeGreaterThan(1);
      expect(r.alabeo, donde(c)).toBeLessThan(2);
      expect(Math.abs(r.vuelve), donde(c)).toBeLessThan(0.3);
      // Y el morro no se entera: la V/S no se mueve con la corrección de lado.
      expect(r.vsDelToque, donde(c)).toBeLessThan(0.3);
    }
  });

  it("apretar un poco más que un toque no deja menos que un toque", () => {
    for (const c of casos) {
      const dejan = DURACIONES.map((d) => porDuracion(c.a, c.tier, d));
      for (let i = 0; i < dejan.length; i++) {
        expect(dejan[i]!, `${donde(c)}, ${DURACIONES[i]} s`).toBeGreaterThan(1);
        if (i > 0)
          expect(dejan[i]!, `${donde(c)}, ${DURACIONES[i]} s`).toBeGreaterThan(dejan[i - 1]! - 0.2);
      }
      // Y mantenida un segundo, sigue sirviendo para virar de verdad.
      expect(dejan[dejan.length - 1]!, donde(c)).toBeGreaterThan(2.5);
    }
  });

  it("el imán no se come una corrección: soltar a cinco grados deja una inclinación", () => {
    for (const c of casos) {
      expect(iman(c.a, c.tier, 10, 5), donde(c)).toBeGreaterThan(2);
      // Y soltar al ver el ala casi nivelada, la nivela.
      expect(Math.abs(iman(c.a, c.tier, 10, 1.5)), donde(c)).toBeLessThan(0.5);
    }
  });

  /*
   * **La cifra**: treinta metros de desvío con alas casi niveladas no se
   * cierran en un momento. Con cinco grados de inclinación como mucho —lo que
   * se hace en una final—, a la velocidad del JAZ 120 el avión empuja de lado
   * menos de un metro por segundo cada segundo, y llevarlo al eje y pararlo
   * ahí pide doce segundos aunque se hiciera perfecto. Veinte es meterse en el
   * eje con calma.
   */
  const EN_EL_EJE = 20;

  it("un piloto tranquilo se mete en el eje desde 30 m a toques, sin pasarse más de una vez", () => {
    for (const c of casos) {
      const r = alEje(enLaFinal(c.a, c.tier), loQueDejaUnToque(c.a, c.tier));
      expect(r.dentro, donde(c)).toBeLessThan(EN_EL_EJE);
      expect(r.cruces, donde(c)).toBeLessThanOrEqual(1);
      expect(r.pasado, donde(c)).toBeLessThan(3);
      expect(r.toquesHastaDentro, donde(c)).toBeLessThanOrEqual(15);
    }
  });

  /*
   * Y el nervioso, que da un toque cada seis décimas sin esperar a ver qué hizo
   * el anterior: llega igual, y nunca se va más de tres metros al otro lado.
   * Con el JAZ 120 en los peldaños de arriba se queda bailando alrededor del
   * eje —dos grados a cada lado cada tres segundos—, porque el ala del grande
   * tarda un segundo en ponerse donde se le pide (la del 747 en aproximación,
   * Heffley y Jewell, NASA CR-2144) y él no le da ese segundo. Eso es de
   * verdad: con un avión así, se corrige con calma.
   */
  it("y uno nervioso, a toque cada poco, también llega sin irse de lado a lado", () => {
    for (const c of casos) {
      const r = alEje(
        enLaFinal(c.a, c.tier),
        loQueDejaUnToque(c.a, c.tier),
        30,
        60,
        false,
        ESPERA_NERVIOSA,
      );
      expect(r.dentro, donde(c)).toBeLessThan(EN_EL_EJE);
      expect(r.cruces, donde(c)).toBeLessThanOrEqual(2);
      expect(r.pasado, donde(c)).toBeLessThan(3);
    }
  });
});
