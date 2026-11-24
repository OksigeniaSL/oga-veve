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
 * Esa primera prueba deja fuera la raya que no tuerce cerca: la que sigue recta más de
 * `RECTA_DE_LA_PLATAFORMA`, la que solo se tuerce poco y gira lejos, y la que sale del
 * puesto de lado. **Desde el puesto que elige el plan** la segunda no deja fuera más que la
 * que sale de lado (H47b): con los tres reactores, el avión acaba sobre la raya y con el
 * morro por ella, y eso se mide por delante del morro, sin la regla del empuje. Y aparte,
 * con `OGA_BARRIDO_DEL_EMPUJE`, la tabla de todos los empujes de contacto.
 */
import { describe, expect, it } from "vitest";
import {
  diferencia,
  edificiosDePasarela,
  empujeDesdeElPuesto,
  entradaDelPuesto,
  LA_CALLE_TUERCE,
  MIRA_LA_CALLE,
  RECTA_DE_LA_PLATAFORMA,
  rumboEntre,
  saleConRemolque,
  vector,
  type PuntoXZ,
} from "./remolque";
import type { Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { delAipEn } from "./puestos-del-aip";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { conLaRuedaEn, morroDe } from "./rueda-de-morro";
import { fueraDelPavimento } from "./ruedas-en-el-empuje";
import { pavimentoDibujado } from "./rodaje";

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
  if (!saleConRemolque(vaALaPasarela(c.avion), x, z, edificios, morro, delAipEn(aero, x, z))) return null;
  const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
  // Sobre su raya pintada si sale bien por ella, y con la rueda de morro en el punto del puesto, como lo pone el juego.
  const enElSuyo = empujeDesdeElPuesto({ x, z }, edificios, raya, entradaDelPuesto(aero, x, z), c.avion.batalla, (r) => conLaRuedaEn({ x, z }, r, morro));
  if (!enElSuyo?.empuje) return null;
  const { rumbo, empuje: e } = enElSuyo;
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

/** Lo que puede quedar el avión al lado de la raya al acabar el empuje, m: la tripulación lo rueda recto. */
const SOBRE_LA_RAYA = 3;

/** Cómo deja el empuje el avión respecto a la raya, mirado por delante del morro. */
interface ComoAcaba {
  /** Dónde arranca el avión, en metros del campo: lo que dice qué puesto es. */
  readonly ref: string;
  /** Si la raya sale del puesto de lado, a lo largo de la fachada. */
  readonly deLado: boolean;
  /** Si la raya tuerce debajo del avión: deja de ir recta más cerca del puesto que el tren principal. */
  readonly debajo: boolean;
  /** Lo que se aparta el morro de la raya en el sitio de ella más alineado con él, rad. */
  readonly torcido: number;
  /** Lo que queda ese sitio al lado del eje del avión, m. */
  readonly aparte: number;
  /** Lo que acaba el centro del avión de la raya, m. */
  readonly lejos: number;
  readonly largo: number;
  readonly giro: number;
  /** Si el avión está sobre su raya pintada (H60b): ver `empujeDesdeElPuesto`. */
  readonly porLaPintada: boolean;
  /** Lo que se aparta su rumbo del que tendría por la raya del plan, rad. */
  readonly cambia: number;
  /** Lo que se aparta la raya pintada de la del plan, si la hay y mira al edificio, rad. */
  readonly seAparta: number | null;
  readonly porQueNo: string | null;
  /** Lo que va el empuje con alguna rueda fuera del pavimento, m, y las que quedan fuera al acabar (H81). */
  readonly fuera: { readonly metros: number; readonly alAcabar: number };
}

/**
 * **Cómo acaba el empuje, sin mirar su regla**: de la raya por delante del morro —hasta
 * ciento cincuenta metros—, el sitio que queda en el eje del avión (a menos de
 * `SOBRE_LA_RAYA`) con la raya más alineada con el morro. Si no hay ninguno en el eje,
 * el más cercano a él. La dirección de la raya, la de sus quince metros siguientes.
 */
function comoAcaba(c: Caso): ComoAcaba | null {
  const aero = c.campo.aerodrome!;
  const plan = new PlanDeVuelo(aero, { ...c.campo.runway, heading: c.rumboDePista }, () => 600, c.avion);
  plan.deContacto = true;
  if (!(c.puesto ? plan.reiniciarDesde(c.puesto) : plan.reiniciar())) return null;
  const arranque = plan.arranque();
  if (!arranque) return null;
  const [x, z] = arranque;
  const edificios = edificiosDePasarela(aero);
  const morro = morroDe(c.avion);
  if (!saleConRemolque(vaALaPasarela(c.avion), x, z, edificios, morro, delAipEn(aero, x, z))) return null;
  const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
  // Sobre su raya pintada si sale bien por ella, y con la rueda de morro en el punto del puesto, como lo pone el juego.
  const enElSuyo = empujeDesdeElPuesto({ x, z }, edificios, raya, entradaDelPuesto(aero, x, z), c.avion.batalla, (r) => conLaRuedaEn({ x, z }, r, morro));
  if (!enElSuyo?.empuje) return null;
  const { rumbo, empuje: e } = enElSuyo;
  const fin = e.poses.at(-1)!;
  const n = vector(fin.rumbo);
  const acum = acumulado(raya);
  const salida = rumboEntre(raya[0]!, aLos(raya, acum, 20));
  // Lo que va recta la raya desde el puesto, sin apartarse más de `DE_SU_RECTA` de su primera dirección.
  const ns = vector(salida);
  let recta = 0;
  for (let i = 1; i < raya.length; i++) {
    if (Math.abs((raya[i]!.x - raya[0]!.x) * -ns.z + (raya[i]!.z - raya[0]!.z) * ns.x) > DE_SU_RECTA) break;
    recta = acum[i]!;
  }
  let mejor = { torcido: Math.PI, aparte: Infinity };
  for (let s = 0; s <= Math.min(acum.at(-1)!, 600); s += 1) {
    const q = aLos(raya, acum, s);
    const delante = (q.x - fin.x) * n.x + (q.z - fin.z) * n.z;
    if (delante < 0 || delante > 150) continue;
    const aparte = Math.abs((q.x - fin.x) * -n.z + (q.z - fin.z) * n.x);
    const torcido = Math.abs(diferencia(fin.rumbo, rumboEntre(q, aLos(raya, acum, s + 15))));
    const enElEje = aparte < SOBRE_LA_RAYA;
    const mejorEnElEje = mejor.aparte < SOBRE_LA_RAYA;
    if (enElEje ? !mejorEnElEje || torcido < mejor.torcido : !mejorEnElEje && aparte < mejor.aparte) mejor = { torcido, aparte };
  }
  const alLado = aLos(raya, acum, sobreLaRaya(raya, acum, fin));
  return {
    ref: `${x.toFixed(0)},${z.toFixed(0)}`,
    deLado: Math.abs(diferencia(rumbo + Math.PI, salida)) > DE_ESPALDAS,
    // De la rueda de morro, que está en el punto del puesto, al tren principal hay una batalla.
    debajo: recta < c.avion.batalla,
    lejos: Math.hypot(alLado.x - fin.x, alLado.z - fin.z),
    ...mejor,
    largo: e.largo,
    giro: e.giro,
    porLaPintada: enElSuyo.porLaPintada,
    cambia: Math.abs(diferencia(rumbo, enElSuyo.porLaRuta)),
    seAparta: enElSuyo.pintada === null ? null : Math.abs(diferencia(enElSuyo.pintada, enElSuyo.porLaRuta)),
    porQueNo: enElSuyo.porQueNo,
    fuera: fueraDelPavimento(c.avion, e.poses, pavimentoDibujado(aero)),
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

  /*
   * **Desde el puesto que elige el plan, sobre la raya y mirando por ella** (H47b): con
   * los tres reactores y por las dos cabeceras, sin mirar cómo es la raya. Es el puesto
   * del que sale el pasaje, y de él el tractor tiene que dejar el avión en la calle, con
   * el morro hacia donde va a rodar: la tripulación arranca recto. Se mide hacia delante
   * del morro, sin la regla del empuje: el sitio de la raya más alineado con él, que tiene
   * que estar en su eje y torcer menos de `TORCIDO`.
   *
   * Lo que queda fuera es la raya que sale del puesto de lado, a lo largo de la fachada,
   * y, de lo que queda al lado de la raya, la que tuerce debajo del avión —más cerca del
   * puesto que su tren principal, como el 329 de Barajas con el JAZ 120—: la calle pasa
   * entre la rueda de morro y el tren, y ningún empuje de menos de media vuelta deja el
   * avión en ella con el morro hacia donde va. Ahí se mira solo que el morro acabe
   * mirando por la raya. Ver el ADR 0029, enmienda H47b.
   */
  it.each(campos.map((c) => [c.aerodrome!.id, c] as const))("y desde el que elige el plan, sobre la raya: %s", (_id, campo) => {
    for (const rumboDePista of [campo.runway.heading, (campo.runway.heading + 180) % 360])
      for (const avion of AIRCRAFT.filter((a) => vaALaPasarela(a))) {
        const m = comoAcaba({ campo, rumboDePista, avion, puesto: null, nombre: "" });
        if (!m) continue;
        const nombre = `${campo.aerodrome!.id} · ${avion.id} · ${rumboDePista.toFixed(0)}° · el puesto de ${m.ref}`;
        // Y sobre pavimento con las tres ruedas, también el que sale de lado (H81).
        expect(m.fuera, `${nombre}: las ruedas, fuera del pavimento`).toEqual({ metros: 0, alAcabar: 0 });
        if (m.deLado) continue;
        expect(m.torcido / GRADO, `${nombre}: el morro, contra la raya`).toBeLessThan(TORCIDO / GRADO);
        if (!m.debajo) expect(m.aparte, `${nombre}: el avión, fuera de la raya`).toBeLessThan(SOBRE_LA_RAYA);
      }
  });

  it("y el de Los Rodeos del banco de la tripulación de línea es de esos", () => {
    const campo = campos.find((c) => c.aerodrome!.id === "GCXO")!;
    const m = medir({ campo, rumboDePista: campo.runway.heading, avion: jaz90, puesto: null, nombre: "GCXO" })!;
    expect(m.tuerce).toBe(true);
    expect(m.torcido / GRADO).toBeLessThan(TORCIDO / GRADO);
  });
});

const entorno = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

/*
 * **El barrido de todos los empujes de contacto** (H47, H47b): los tres reactores, las dos
 * cabeceras y cada puesto de contacto de cada campo con pasarelas, medidos como la prueba
 * de arriba. No es una prueba —muchos de esos puestos no los elige nunca el plan, y lo
 * que se exige está arriba—, sino la tabla para ver qué cambia un arreglo: tarda un minuto
 * largo con dos hilos. `OGA_BARRIDO_DEL_EMPUJE=1 npx vitest run empuje-hasta-la-calle`; con
 * `=jaz-90`, solo ese avión.
 */
describe.runIf(entorno.OGA_BARRIDO_DEL_EMPUJE)("el barrido de todos los empujes de contacto", () => {
  it("la tabla", async () => {
    const filas: string[] = [];
    const cuenta = { fuera: 0, todos: 0, bien: 0, deLado: 0, debajo: 0, elegidos: 0, elegidosBien: 0, pintada: 0, cambian: 0, conRaya: 0, seAparta: 0 };
    const vistos = new Set<string>();
    const solo = entorno.OGA_BARRIDO_DEL_EMPUJE!.startsWith("jaz-") ? entorno.OGA_BARRIDO_DEL_EMPUJE! : null;
    for (const e of SCENARIOS) {
      const campo = await conSuAerodromo(e);
      const aero = campo.aerodrome;
      if (!aero?.pasarelas?.hay || vistos.has(aero.id)) continue;
      vistos.add(aero.id);
      for (const avion of AIRCRAFT.filter((a) => vaALaPasarela(a) && (!solo || solo === a.id)))
        for (const rumboDePista of [campo.runway.heading, (campo.runway.heading + 180) % 360]) {
          const elegido = comoAcaba({ campo, rumboDePista, avion, puesto: null, nombre: "" });
          const plan = new PlanDeVuelo(aero, { ...campo.runway, heading: rumboDePista }, () => 600, avion);
          plan.deContacto = true;
          const puestos = (plan as unknown as { puestosDeContacto(): { ref: string | null; xy: Punto }[] }).puestosDeContacto();
          for (const p of puestos) {
            const m = comoAcaba({ campo, rumboDePista, avion, puesto: p.xy, nombre: "" });
            if (!m) continue;
            // El que saca una rueda del pavimento no cuenta como bueno, acabe como acabe (H81).
            const pisaFuera = m.fuera.metros > 0 || m.fuera.alAcabar > 0;
            const bien = !pisaFuera && m.torcido < TORCIDO && (m.aparte < SOBRE_LA_RAYA || m.debajo);
            if (pisaFuera) cuenta.fuera++;
            const delPlan = elegido?.ref === m.ref;
            cuenta.todos++;
            if (bien) cuenta.bien++;
            if (m.porLaPintada) cuenta.pintada++;
            if (m.cambia > GRADO) cuenta.cambian++;
            if (m.seAparta !== null && m.seAparta > GRADO) cuenta.seAparta++;
            if (entradaDelPuesto(aero, Number(m.ref.split(",")[0]), Number(m.ref.split(",")[1]))) cuenta.conRaya++;
            if (m.deLado) cuenta.deLado++;
            else if (m.debajo && m.aparte >= SOBRE_LA_RAYA) cuenta.debajo++;
            if (delPlan) {
              cuenta.elegidos++;
              if (bien) cuenta.elegidosBien++;
            }
            filas.push(
              `${bien ? "  bien" : "  MAL "} ${aero.id} ${avion.id} ${rumboDePista.toFixed(0).padStart(3)} ${(p.ref ?? "—").padEnd(5)} ${m.ref.padEnd(11)}${delPlan ? " (plan)" : "       "}` +
                ` ${m.deLado ? "de lado " : m.debajo ? "debajo  " : "        "} torcido ${((m.torcido * 180) / Math.PI).toFixed(0).padStart(3)}°` +
                ` aparte ${Number.isFinite(m.aparte) ? m.aparte.toFixed(1).padStart(5) : "  —  "} m` +
                ` empuje ${m.largo.toFixed(0).padStart(3)} m giro ${((m.giro * 180) / Math.PI).toFixed(0).padStart(4)}°` +
                ` a ${m.lejos.toFixed(0).padStart(3)} m de la raya${pisaFuera ? ` · FUERA DEL PAVIMENTO ${m.fuera.metros.toFixed(0)} m, ${m.fuera.alAcabar} ruedas al acabar` : ""}${m.porLaPintada ? ` · pintada, ${((m.cambia * 180) / Math.PI).toFixed(0)}° de la del plan` : m.seAparta !== null && m.seAparta > GRADO ? ` · la pintada no sale (${m.porQueNo}), ${((m.seAparta * 180) / Math.PI).toFixed(0)}°` : ""}`,
            );
          }
        }
    }
    filas.push(
      `\n${cuenta.todos} empujes: ${cuenta.bien} bien —${cuenta.debajo} de ellos con la raya torciendo debajo del avión,` +
        ` mirando por ella pero a su lado—, y ${cuenta.todos - cuenta.bien} no; salen de lado ${cuenta.deLado} y pisan fuera del pavimento ${cuenta.fuera}.` +
        ` Del plan: ${cuenta.elegidosBien} de ${cuenta.elegidos}. Con raya pintada: ${cuenta.conRaya}; sobre ella: ${cuenta.pintada}; se aparta más de un grado de la del plan en ${cuenta.seAparta}, y de esos se aparcan en ella ${cuenta.cambian}.`,
    );
    (globalThis as { process?: { stderr: { write(s: string): void } } }).process?.stderr.write(`\n${filas.join("\n")}\n`);
  }, 900_000);
});
