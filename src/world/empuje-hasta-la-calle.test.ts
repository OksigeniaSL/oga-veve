/**
 * **El empuje acaba con el morro hacia donde va la raya**, en cada campo con pasarelas
 * y desde cada puesto del que se sale empujado (H47, ADR 0029).
 *
 * En un aeropuerto de verdad el tractor deja el avión parado en la calle, con el morro
 * hacia donde va a rodar, y la tripulación arranca recto. Desde el 24 de Los Rodeos,
 * que el plan elige desde que el grafo no suelda los cruces (H41c), el empuje se hacía
 * «de frente»: noventa grados a los 34 m y el avión atravesado a la raya, que al
 * soltarlo giraba 78° en sus primeros treinta metros. La raya salía recta 90 m por la
 * plataforma y torcía en una curva cuyo primer tramo se apartaba solo 6°, y la calle se
 * buscaba un metro más allá de la recta. Ver `RECTA_DE_LA_PLATAFORMA`.
 *
 * Lo que se mira aquí no es la regla de `trayectoriaDelEmpuje`, sino la raya: si sale
 * del puesto de espaldas, recta por la plataforma, y tuerce a su calle al acabar esa
 * recta, el empuje tiene que acabar en esa calle con el morro hacia donde sigue. Se
 * mira con el JAZ 90 desde **todos** los puestos de contacto, que a cualquiera se puede
 * llegar y de cualquiera se sale empujado (`salirEmpujadoDeDondeSeLlego` en `game.ts`),
 * y con los tres reactores desde el puesto que elige el plan.
 *
 * Lo que queda fuera, a propósito, es la raya que no tuerce cerca: la que sigue recta
 * más de `RECTA_DE_LA_PLATAFORMA`, la que solo se tuerce poco y gira lejos, y la que sale
 * del puesto de lado. Ahí el empuje sale «de frente», como dice `trayectoriaDelEmpuje`,
 * y lo que se mide de ellas está en el ADR.
 */
import { describe, expect, it } from "vitest";
import {
  diferencia,
  edificiosDePasarela,
  LA_CALLE_TUERCE,
  MIRA_LA_CALLE,
  RECTA_DE_LA_PLATAFORMA,
  rumboEnElPuesto,
  rumboEntre,
  saleConRemolque,
  trayectoriaDelEmpuje,
  vector,
  type PuntoXZ,
} from "./remolque";
import type { Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { conLaRuedaEn, morroDe } from "./rueda-de-morro";

const GRADO = Math.PI / 180;
/** Lo que se aparta el morro de la raya al acabar: los «pocos grados» de rodar casi recto. */
const TORCIDO = 5 * GRADO;
/** Lo que puede apartarse la raya de su recta y seguir siendo la recta de la plataforma, m. */
const DE_SU_RECTA = 3;
/** Cuándo sale la raya de espaldas al edificio, y no de lado: ver `SALE_DE_LADO`. */
const DE_ESPALDAS = 50 * GRADO;

/** Los metros de raya hasta cada uno de sus puntos. */
function acumulado(raya: readonly PuntoXZ[]): number[] {
  const acum = [0];
  for (let i = 1; i < raya.length; i++) acum.push(acum[i - 1]! + Math.hypot(raya[i]!.x - raya[i - 1]!.x, raya[i]!.z - raya[i - 1]!.z));
  return acum;
}

/** El punto de la raya a `s` metros de su principio. */
function aLos(raya: readonly PuntoXZ[], acum: readonly number[], s: number): PuntoXZ {
  const d = Math.max(0, Math.min(acum.at(-1)!, s));
  let i = 1;
  while (i < raya.length - 1 && acum[i]! < d) i++;
  const a = raya[i - 1]!;
  const b = raya[i]!;
  const k = (d - acum[i - 1]!) / (acum[i]! - acum[i - 1]! || 1);
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
}

/** Dónde queda `p` a lo largo de la raya, m. */
function sobreLaRaya(raya: readonly PuntoXZ[], acum: readonly number[], p: PuntoXZ): number {
  let mejor = Infinity;
  let s = 0;
  for (let k = 1; k < raya.length; k++) {
    const a = raya[k - 1]!;
    const b = raya[k]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz;
    if (l2 < 1e-9) continue;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
    const d = Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z);
    if (d < mejor) {
      mejor = d;
      s = acum[k - 1]! + t * (acum[k]! - acum[k - 1]!);
    }
  }
  return s;
}

/**
 * **Si la raya tuerce a su calle al acabar la recta de la plataforma**, mirado en la raya
 * y no en la regla del empuje: sale de espaldas al edificio, sigue recta —sin apartarse
 * más de `DE_SU_RECTA` de su primera dirección— como mucho `RECTA_DE_LA_PLATAFORMA`, y
 * antes de `MIRA_LA_CALLE` más allá ya va a más de `LA_CALLE_TUERCE` de ella. Hacia
 * dónde va se mira metro a metro, en los `MIRA_LA_CALLE` metros siguientes, y no tramo a
 * tramo: un quiebro de pocos metros que vuelve a su dirección no es una calle.
 */
function tuerceAlAcabarLaRecta(raya: readonly PuntoXZ[], rumboEnElPuesto: number): boolean {
  const acum = acumulado(raya);
  if (acum.at(-1)! < 20) return false;
  const salida = rumboEntre(raya[0]!, aLos(raya, acum, 20));
  if (Math.abs(diferencia(rumboEnElPuesto + Math.PI, salida)) > DE_ESPALDAS) return false;
  const n = vector(salida);
  let recta = 0;
  for (let i = 1; i < raya.length; i++) {
    const lado = Math.abs((raya[i]!.x - raya[0]!.x) * -n.z + (raya[i]!.z - raya[0]!.z) * n.x);
    if (lado > DE_SU_RECTA) break;
    recta = acum[i]!;
  }
  if (recta > RECTA_DE_LA_PLATAFORMA) return false;
  // Desde los ocho metros, como `trayectoriaDelEmpuje`: lo de antes es el quiebro del propio puesto.
  for (let s = 8; s <= Math.min(recta + MIRA_LA_CALLE, acum.at(-1)!); s++)
    if (Math.abs(diferencia(salida, rumboEntre(aLos(raya, acum, s), aLos(raya, acum, s + MIRA_LA_CALLE)))) > LA_CALLE_TUERCE)
      return true;
  return false;
}

interface Caso {
  readonly campo: Scenario;
  readonly rumboDePista: number;
  readonly avion: (typeof AIRCRAFT)[number];
  /** El puesto, en los ejes del fichero; `null` es el que elige el plan. */
  readonly puesto: Punto | null;
  readonly nombre: string;
}

/** Lo que mide un empuje: si la raya tuerce al acabar la recta y cómo acaba el avión. */
function medir(c: Caso): { readonly tuerce: boolean; readonly torcido: number; readonly delante: number } | null {
  const aero = c.campo.aerodrome!;
  const plan = new PlanDeVuelo(aero, { ...c.campo.runway, heading: c.rumboDePista }, () => 600, c.avion);
  plan.deContacto = true;
  if (!(c.puesto ? plan.reiniciarDesde(c.puesto) : plan.reiniciar())) return null;
  const arranque = plan.arranque();
  if (!arranque) return null;
  const [x, z] = arranque;
  const edificios = edificiosDePasarela(aero);
  const morro = morroDe(c.avion);
  if (!saleConRemolque(vaALaPasarela(c.avion), x, z, edificios, morro)) return null;
  const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
  const rumbo = rumboEnElPuesto(x, z, edificios, raya);
  if (rumbo === null) return null;
  // Con la rueda de morro en el punto del puesto, como lo pone el juego (#191).
  const centro = conLaRuedaEn({ x, z }, rumbo, morro);
  const e = trayectoriaDelEmpuje({ x: centro.x, z: centro.z, rumbo }, raya, c.avion.batalla);
  if (!e) return null;
  const fin = e.poses.at(-1)!;
  const acum = acumulado(raya);
  // Hacia dónde sigue la raya desde donde el empuje la deja: los treinta metros que mira el banco.
  const s = sobreLaRaya(raya, acum, e.cruce);
  const sigue = rumboEntre(aLos(raya, acum, s), aLos(raya, acum, s + MIRA_LA_CALLE));
  const n = vector(fin.rumbo);
  return {
    tuerce: tuerceAlAcabarLaRecta(raya, rumbo),
    torcido: Math.abs(diferencia(fin.rumbo, sigue)),
    delante: (e.cruce.x - fin.x) * n.x + (e.cruce.z - fin.z) * n.z,
  };
}

describe("el empuje acaba con el morro hacia donde va la raya", async () => {
  const vistos = new Set<string>();
  const campos: Scenario[] = [];
  for (const e of SCENARIOS) {
    const s = await conSuAerodromo(e);
    if (!s.aerodrome?.pasarelas?.hay || vistos.has(s.aerodrome.id)) continue;
    vistos.add(s.aerodrome.id);
    campos.push(s);
  }
  const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;

  /** Los casos de un campo: el JAZ 90 desde cada puesto de contacto y los tres desde el que elige el plan. */
  function casos(campo: Scenario): Caso[] {
    const out: Caso[] = [];
    for (const rumboDePista of [campo.runway.heading, (campo.runway.heading + 180) % 360]) {
      const plan = new PlanDeVuelo(campo.aerodrome!, { ...campo.runway, heading: rumboDePista }, () => 600, jaz90);
      plan.deContacto = true;
      const deContacto = (plan as unknown as { puestosDeContacto(): { ref: string | null; xy: Punto }[] }).puestosDeContacto();
      for (const p of deContacto)
        out.push({ campo, rumboDePista, avion: jaz90, puesto: p.xy, nombre: `jaz-90 · ${rumboDePista.toFixed(0)}° · ${p.ref ?? p.xy.join(",")}` });
      for (const avion of AIRCRAFT.filter((a) => vaALaPasarela(a)))
        out.push({ campo, rumboDePista, avion, puesto: null, nombre: `${avion.id} · ${rumboDePista.toFixed(0)}° · el del plan` });
    }
    return out;
  }

  it.each(campos.map((c) => [c.aerodrome!.id, c] as const))("%s", (_id, campo) => {
    for (const c of casos(campo)) {
      const m = medir(c);
      if (!m?.tuerce) continue;
      expect(m.torcido / GRADO, `${c.nombre}: el morro, contra la raya`).toBeLessThan(TORCIDO / GRADO);
      expect(m.delante, `${c.nombre}: la calle, por delante del morro`).toBeGreaterThan(0);
    }
  });

  it("y el de Los Rodeos del banco de la tripulación de línea es de esos", () => {
    const campo = campos.find((c) => c.aerodrome!.id === "GCXO")!;
    const m = medir({ campo, rumboDePista: campo.runway.heading, avion: jaz90, puesto: null, nombre: "GCXO" })!;
    expect(m.tuerce).toBe(true);
    expect(m.torcido / GRADO).toBeLessThan(TORCIDO / GRADO);
  });
});
