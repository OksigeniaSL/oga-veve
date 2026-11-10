/**
 * **El remolque en cada campo**, sin volar: en todos los escenarios con aeródromo,
 * con cada avión de pasarela, el puesto del que sale quien juega y el empuje hasta
 * la calle. La primera mitad se midió en Barajas, Los Rodeos, La Palma y Pettirossi;
 * esto recorre los demás (ADR 0025, «Lo que queda para la segunda mitad»).
 *
 * Y qué tipos se empujan, que no lo decide el campo sino el avión: ver
 * `vaALaPasarela`.
 */
import { describe, expect, it } from "vitest";
import {
  edificiosDePasarela,
  esPuestoDeContacto,
  largoPorLaBatalla,
  paredMasCercana,
  Remolque,
  rumboEnElPuesto,
  saleConRemolque,
  trayectoriaDelEmpuje,
  diferencia,
  vector,
  type Pose,
  type PuntoXZ,
} from "./remolque";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { conSuAerodromo, SCENARIOS } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { esDeLinea, vaALaPasarela } from "../flight/velocidades-en-tierra";

const GRADO = Math.PI / 180;

/**
 * **Los puestos en los que el empuje acaba con el cruce detrás del morro**, medidos: en
 * todos, la raya sale del puesto de lado. Ver «el empuje cabe y acaba en la raya» y el
 * ADR 0025.
 */
const CON_EL_CRUCE_DETRAS: ReadonlySet<string> = new Set([
  "barajas · jaz-110",
  "barajas · jaz-120",
]);
const DE_PASARELA = ["jaz-90", "jaz-110", "jaz-120"] as const;

describe("qué aviones se empujan", () => {
  it("los tres reactores sí; el turbohélice de cercanías y las avionetas, no", () => {
    const de = (id: string) => AIRCRAFT.find((a) => a.id === id)!;
    for (const id of DE_PASARELA) expect(vaALaPasarela(de(id)), id).toBe(true);
    // El JAZ 60 es de línea —rueda con sus reglas y va a la terminal— pero embarca por su escalerilla.
    expect(esDeLinea(de("jaz-60"))).toBe(true);
    expect(vaALaPasarela(de("jaz-60"))).toBe(false);
    for (const id of ["jaz-20", "jaz-25", "jaz-40"]) expect(vaALaPasarela(de(id)), id).toBe(false);
  });
});

/**
 * **Los campos que embarcan por pasarela**, escritos a mano con su fuente en el fichero de
 * cada uno: OpenStreetMap solo trae las de tres. En los demás no hay puesto de contacto, y
 * un reactor sale de frente. Ver `Aerodrome.pasarelas` y el ADR 0025.
 */
const CON_PASARELAS = ["GCFV", "GCLA", "GCLP", "GCRR", "GCTS", "GCXO", "LEMD", "SGAS"];

describe("solo hay puestos de contacto donde hay pasarelas", async () => {
  const conAerodromo = await Promise.all(SCENARIOS.map((e) => conSuAerodromo(e)));
  it("los ocho campos que las tienen, cada uno con su fuente", () => {
    const vistos = new Map<string, string>();
    for (const s of conAerodromo) {
      const p = s.aerodrome?.pasarelas;
      if (p?.hay) vistos.set(s.aerodrome!.id, p.fuente);
    }
    expect([...vistos.keys()].sort()).toEqual(CON_PASARELAS);
    for (const [id, fuente] of vistos) expect(fuente.length, `${id} sin fuente`).toBeGreaterThan(20);
  });
  it("y en los demás, ningún puesto es de contacto para ningún reactor", () => {
    for (const s of conAerodromo) {
      const aero = s.aerodrome;
      if (!aero || aero.pasarelas?.hay) continue;
      const edificios = edificiosDePasarela(aero);
      expect(edificios.length, s.id).toBe(0);
      for (const id of DE_PASARELA) {
        const avion = AIRCRAFT.find((a) => a.id === id)!;
        const largo = largoPorLaBatalla(avion.batalla);
        for (const p of aero.parkingPositions ?? [])
          expect(saleConRemolque(true, p.xy[0], -p.xy[1], edificios, largo), `${s.id} · ${id}`).toBe(false);
      }
    }
  });
});

describe("el tractor no se suelta con los motores parados", () => {
  /** Un empuje recto de veinte metros, para mirar solo el final. */
  const recto = trayectoriaDelEmpuje(
    { x: 0, z: 0, rumbo: 0 },
    [
      { x: 0, z: 0 },
      { x: 0, z: 30 },
      { x: 100, z: 30 },
    ],
    11.5,
  )!;

  it("quien juega: frenado y enganchado hasta que arranca, y luego se suelta como siempre", () => {
    const r = new Remolque(recto, { batalla: 11.5, envergadura: 26 });
    r.esperaLosMotores = true;
    r.empezar();
    for (let i = 0; i < 4000 && r.fase === "empujando"; i++) r.paso(0.05);
    expect(r.fase).toBe("frenado");
    // Un minuto parado con el freno puesto y sin motores: el tractor sigue debajo del morro.
    for (let i = 0; i < 1200; i++) r.paso(0.05);
    expect(r.fase).toBe("frenado");
    expect(r.enganchado).toBe(true);
    r.motoresEnMarcha = true;
    for (let i = 0; i < 6000 && !r.libre; i++) r.paso(0.05);
    expect(r.libre).toBe(true);
  });

  it("la tripulación, que los arranca empujando, no espera nunca", () => {
    const r = new Remolque(recto, { batalla: 11.5, envergadura: 26 });
    r.empezar();
    for (let i = 0; i < 8000 && !r.libre; i++) r.paso(0.05);
    expect(r.libre).toBe(true);
  });
});

/** Lo que se mueve el avión contra su morro, de media: −1 es ir de culo del todo. */
function vaDeCulo(poses: readonly Pose[]): number {
  let suma = 0;
  let n = 0;
  for (let i = 1; i < poses.length; i++) {
    const a = poses[i - 1]!;
    const b = poses[i]!;
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    if (d < 1e-6) continue;
    const m = vector(a.rumbo);
    suma += ((b.x - a.x) * m.x + (b.z - a.z) * m.z) / d;
    n++;
  }
  return n ? suma / n : 0;
}

/** Lo que queda `p` de la raya, m, y el rumbo de la raya en ese punto. */
function enLaRaya(p: PuntoXZ, raya: readonly PuntoXZ[]): { readonly lejos: number; readonly rumbo: number } {
  let lejos = Infinity;
  let rumbo = 0;
  for (let k = 1; k < raya.length; k++) {
    const a = raya[k - 1]!;
    const b = raya[k]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz;
    if (l2 < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
    const d = Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z);
    if (d < lejos) {
      lejos = d;
      rumbo = Math.atan2(dx, -dz);
    }
  }
  return { lejos, rumbo };
}

/**
 * **Lo medido en cada campo y con cada avión**, para el ADR: si sale empujado, cuánto
 * se empuja, a qué distancia de la raya acaba y cuánto se aparta su morro de ella.
 */
interface Medida {
  readonly campo: string;
  readonly avion: string;
  readonly empujado: boolean;
  readonly largo?: number;
  readonly giro?: number;
  readonly radio?: number;
  readonly deFrente?: boolean;
  readonly deLaRaya?: number;
  readonly delante?: number;
  readonly deLado?: number;
  readonly torcido?: number;
  readonly deCulo?: number;
  readonly pared?: number;
}

describe("el empuje cabe y acaba en la raya en cada campo con aeródromo", async () => {
  const medidas: Medida[] = [];
  const conAerodromo = await Promise.all(SCENARIOS.map((e) => conSuAerodromo(e)));
  for (const s of conAerodromo) {
    const aero = s.aerodrome;
    if (!aero) continue;
    for (const id of DE_PASARELA) {
      it(`${s.id} · ${id}`, () => {
        const avion = AIRCRAFT.find((a) => a.id === id)!;
        const plan = new PlanDeVuelo(aero, s.runway, () => 600, avion);
        plan.deContacto = true;
        const sale = plan.reiniciar();
        const puesto = plan.arranque();
        const edificios = edificiosDePasarela(aero);
        const largo = largoPorLaBatalla(avion.batalla);
        if (!sale || !puesto || !saleConRemolque(vaALaPasarela(avion), puesto[0], puesto[1], edificios, largo)) {
          medidas.push({ campo: s.id, avion: id, empujado: false });
          return;
        }
        const [x, z] = puesto;
        expect(esPuestoDeContacto(x, z, edificios, largo)).toBe(true);
        const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
        const rumbo = rumboEnElPuesto(x, z, edificios, raya)!;
        expect(rumbo).not.toBeNull();
        const e = trayectoriaDelEmpuje({ x, z, rumbo }, raya, avion.batalla)!;
        expect(e, "hay empuje").not.toBeNull();
        const fin = e.poses.at(-1)!;
        let pared = Infinity;
        for (const p of e.poses) pared = Math.min(pared, paredMasCercana(p.x, p.z, edificios)!.distancia - largo / 2);
        /*
         * **Hacia dónde va la calle**: si la raya tuerce cerca, el cruce es uno de sus puntos y la
         * calle sigue por ella; si sale de frente, el empuje gira noventa grados y lo demás lo
         * rueda el avión. Ver `trayectoriaDelEmpuje`.
         */
        const k = raya.indexOf(e.cruce as { x: number; z: number });
        const deFrente = k < 0;
        const n = vector(fin.rumbo);
        const hasta = { x: e.cruce.x - fin.x, z: e.cruce.z - fin.z };
        // El cruce, por delante del morro y en su eje: rodando hacia delante se pasa por él.
        const delante = hasta.x * n.x + hasta.z * n.z;
        const deLado = Math.abs(hasta.x * -n.z + hasta.z * n.x);
        let torcido = 0;
        if (!deFrente) {
          let j = k + 1;
          while (j < raya.length - 1 && Math.hypot(raya[j]!.x - e.cruce.x, raya[j]!.z - e.cruce.z) < 20) j++;
          const sigue = raya[Math.min(j, raya.length - 1)]!;
          torcido = Math.abs(diferencia(fin.rumbo, Math.atan2(sigue.x - e.cruce.x, -(sigue.z - e.cruce.z)))) / GRADO;
        }
        const deLaRaya = enLaRaya(fin, raya).lejos;
        const m: Medida = {
          deLaRaya: +deLaRaya.toFixed(1),
          campo: s.id,
          avion: id,
          empujado: true,
          deFrente,
          largo: Math.round(e.largo),
          giro: Math.round(e.giro / GRADO),
          radio: +e.radio.toFixed(1),
          delante: +delante.toFixed(1),
          deLado: +deLado.toFixed(1),
          torcido: Math.round(torcido),
          deCulo: +vaDeCulo(e.poses).toFixed(2),
          pared: +pared.toFixed(1),
        };
        medidas.push(m);
        // Hacia atrás, de verdad: la terminal se aleja por delante.
        expect(m.deCulo!, "va de culo").toBeLessThan(-0.95);
        // Y nunca con el morro dentro de un edificio: el centro, a medio largo de toda pared.
        expect(m.pared!, "el morro fuera de toda pared").toBeGreaterThan(0);
        // Y cabe: acaba a menos de un largo de avión de la raya, que es por donde se rueda.
        expect(m.deLaRaya!, "acaba junto a la raya").toBeLessThan(largo);
        /*
         * **Y con el cruce por delante**, que rodando hacia delante se pasa por él. Donde no,
         * está apuntado y dicho en el ADR: la raya sale del puesto de lado —más de cincuenta
         * grados de lo contrario a la pared—, el avión se pone mirando a la pared, y la recta
         * de su cola y la de la calle casi no se cortan; se gira desde el puesto con el radio
         * más cerrado y el cruce queda detrás. Si alguno se arregla, que salga de la lista.
         */
        const clave = `${s.id} · ${id}`;
        if (CON_EL_CRUCE_DETRAS.has(clave)) expect(m.delante!, `${clave} ya lo tiene delante: sácalo de la lista`).toBeLessThan(0);
        else expect(m.delante!, "el cruce, por delante del morro").toBeGreaterThan(0);
      });
    }
  }
  it("lo medido, para el ADR", () => {
    // Se escribe solo con OGA_MEDIDAS=1: es para copiarlo al ADR, no para mirar en cada pasada.
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    if (env?.OGA_MEDIDAS === "1") console.table(medidas);
    expect(medidas.length).toBeGreaterThan(0);
  });
});
