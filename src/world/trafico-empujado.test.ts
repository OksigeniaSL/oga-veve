/**
 * **El tráfico sale empujado**, como quien juega con un reactor y como los
 * vuelos de pasaje: el reactor del tráfico aparca en un puesto de contacto con
 * el morro al edificio, de ahí lo saca un tractor de espaldas hasta la calle,
 * y rueda solo después del saludo. Y mientras empuja, lo que barre es suyo.
 * Ver `empujar` en `trafico.ts`, `empujado` en `suelo-del-trafico.ts` y el
 * ADR 0025.
 */
import { describe, expect, it } from "vitest";
import { sinTorre, type Aerodrome } from "./aerodrome";
import { conSuAerodromo, SCENARIOS } from "./scenarios";
import { sueloDelTrafico, type EnElPlano } from "./suelo-del-trafico";
import {
  crearTrafico,
  pasarelaDelTrafico,
  pistaQuePideConSuMargen,
  tiposDelCampo,
  TIPOS,
  type EnTierra,
  type QuienJuega,
} from "./trafico";
import { esPuestoDeContacto, largoPorLaBatalla, paredMasCercana, vector } from "./remolque";
import { dondeSeAcerca } from "./tramo-de-frente";

const REACTOR = TIPOS.reactor;
const PASARELA = pasarelaDelTrafico(REACTOR)!;
const LARGO = largoPorLaBatalla(PASARELA.batalla);

describe("quién del tráfico embarca por pasarela", () => {
  it("el reactor sí, con la batalla del modelo que se dibuja; los demás, no", () => {
    expect(PASARELA.batalla).toBeCloseTo(11.5, 1);
    for (const t of [TIPOS.turbohelice, TIPOS.bimotor, TIPOS.avioneta]) expect(pasarelaDelTrafico(t)).toBeUndefined();
  });
});

interface Medida {
  readonly campo: string;
  readonly empujado: boolean;
  readonly largo?: number;
  readonly deCulo?: number;
  readonly pared?: number;
  readonly vuelve?: number;
  readonly llegaDeContacto?: boolean;
  readonly morroAlEdificio?: boolean;
}

describe("el reactor del tráfico sale empujado de un puesto de contacto, en cada campo", async () => {
  const campos = (await Promise.all(SCENARIOS.map((e) => conSuAerodromo(e)))).filter(
    (e) => e.aerodrome && !e.aerodrome.privado && e.aerodrome.taxiways.length,
  );
  const medidas: Medida[] = [];
  for (const esc of campos) {
    it(esc.id, () => {
      const aero = esc.aerodrome as Aerodrome;
      const suelo = sueloDelTrafico(aero, esc.runway, aero.runways[0]?.widthM ?? 45);
      if (!suelo) return;
      const edificios = aero.buildings ?? [];
      const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(REACTOR), PASARELA);
      const llega = suelo.llegada(REACTOR.toca + REACTOR.frena, undefined, undefined, PASARELA);
      // Al llegar, si el puesto es de contacto, con el morro al edificio: el último tramo va hacia la pared.
      let llegaDeContacto = false;
      let morroAlEdificio = false;
      if (llega && llega.camino.length > 2) {
        const fin = llega.camino.at(-1)!;
        const antes = llega.camino.at(-2)!;
        llegaDeContacto = esPuestoDeContacto(fin.x, fin.z, edificios, LARGO);
        if (llegaDeContacto) {
          const d = Math.hypot(fin.x - antes.x, fin.z - antes.z);
          const morro = { x: fin.x + ((fin.x - antes.x) / d) * 10, z: fin.z + ((fin.z - antes.z) / d) * 10 };
          morroAlEdificio = paredMasCercana(morro.x, morro.z, edificios)!.distancia < paredMasCercana(fin.x, fin.z, edificios)!.distancia;
          expect(morroAlEdificio, "entra con el morro al edificio").toBe(true);
        }
      }
      if (!sale?.empuje) {
        medidas.push({ campo: esc.id, empujado: false, llegaDeContacto, morroAlEdificio });
        return;
      }
      const { trayectoria, hasta } = sale.empuje;
      const p0 = sale.camino[0]!;
      expect(esPuestoDeContacto(p0.x, p0.z, edificios, LARGO), "sale de un puesto de contacto").toBe(true);
      // De culo: el avión se mueve contra su morro.
      let suma = 0;
      let n = 0;
      let pared = Infinity;
      for (let i = 1; i < trayectoria.poses.length; i++) {
        const a = trayectoria.poses[i - 1]!;
        const b = trayectoria.poses[i]!;
        const d = Math.hypot(b.x - a.x, b.z - a.z);
        pared = Math.min(pared, paredMasCercana(b.x, b.z, edificios)!.distancia - LARGO / 2);
        if (d < 1e-6) continue;
        const m = vector(a.rumbo);
        suma += ((b.x - a.x) * m.x + (b.z - a.z) * m.z) / d;
        n++;
      }
      const deCulo = suma / n;
      expect(deCulo, "va de culo").toBeLessThan(-0.95);
      expect(pared, "el morro fuera de toda pared").toBeGreaterThan(0);
      // Y la doble raya, después del empuje: primero se empuja, luego se rueda hasta ella.
      expect(sale.espera).toBeGreaterThan(hasta);
      // Y suelto el tractor, rueda hacia delante: el camino sigue por delante del morro.
      const fin = trayectoria.poses.at(-1)!;
      const adelante = vector(fin.rumbo);
      let i = 0;
      let metros = 0;
      while (i < sale.camino.length - 1 && metros <= hasta + 0.01) {
        metros += Math.hypot(sale.camino[i + 1]!.x - sale.camino[i]!.x, sale.camino[i + 1]!.z - sale.camino[i]!.z);
        i++;
      }
      const sigue = sale.camino[i]!;
      const vuelve = (sigue.x - fin.x) * adelante.x + (sigue.z - fin.z) * adelante.z;
      expect(vuelve, "rueda hacia delante al soltarse").toBeGreaterThan(0);
      medidas.push({
        campo: esc.id,
        empujado: true,
        largo: Math.round(trayectoria.largo),
        deCulo: +deCulo.toFixed(2),
        pared: +pared.toFixed(1),
        vuelve: +vuelve.toFixed(1),
        llegaDeContacto,
        morroAlEdificio,
      });
    });
  }
  it("lo medido", () => {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    if (env?.OGA_MEDIDAS === "1") console.table(medidas);
    // Barajas y Los Rodeos tienen terminal con puestos de contacto: ahí se empuja.
    for (const c of ["barajas", "tenerife-norte"])
      expect(medidas.find((m) => m.campo === c)?.empujado, c).toBe(true);
  });
});

describe("en Los Rodeos, un reactor del tráfico empujado de su puesto", async () => {
  const esc = await conSuAerodromo(SCENARIOS.find((e) => e.id === "tenerife-norte")!);
  const aero = esc.aerodrome as Aerodrome;
  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, esc.runway, aero.runways[0]?.widthM ?? 45);
  const montar = (tu: () => QuienJuega | null = () => null) =>
    crearTrafico(esc.runway, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: [REACTOR],
      quienJuega: tu,
      tierra: () => (suelo ? { suelo, alto: () => cota } : null),
    });
  const PASO = 0.1;
  const QUIEN = "EC-JAZ";

  it("espera enganchado, empuja de culo con el tractor delante de la rueda de morro, y rueda después del saludo", () => {
    expect(tiposDelCampo(aero.id, esc.runway.length, sinTorre(aero)).some((t) => t.id === "reactor")).toBe(true);
    const trafico = montar();
    trafico.anuncia(QUIEN, "otro.rodando");
    const donde = () => trafico.quienes().find((q) => q.matricula === QUIEN)!;
    const tractor = () => trafico.grupo.children.find((o) => o.name === "remolque");
    const inicio = donde();
    const morro0 = vector((inicio.rumbo * Math.PI) / 180);
    // En el puesto, con el morro al edificio.
    const pared0 = paredMasCercana(inicio.x, inicio.z, aero.buildings)!.distancia;
    expect(paredMasCercana(inicio.x + morro0.x * 10, inicio.z + morro0.z * 10, aero.buildings)!.distancia).toBeLessThan(pared0);
    let deCulo = 0;
    let haciaDelante = 0;
    let conTractor = 0;
    let tractorDelante = Infinity;
    let reservada = 0;
    let fin = 0;
    let antes = inicio;
    for (let t = 0; t < 400; t += PASO) {
      trafico.paso(PASO);
      const q = donde();
      if (!q) break;
      const m = vector((antes.rumbo * Math.PI) / 180);
      const avance = (q.x - antes.x) * m.x + (q.z - antes.z) * m.z;
      const tr = tractor();
      if (tr) {
        conTractor += PASO;
        // El tractor, por delante del centro del avión: la cuna en la rueda de morro.
        const n = vector((q.rumbo * Math.PI) / 180);
        tractorDelante = Math.min(tractorDelante, (tr.children[0]!.position.x - q.x) * n.x + (tr.children[0]!.position.z - q.z) * n.z);
        if (trafico.tramosQueTienen().some((x) => x.matricula === QUIEN && x.empuja)) reservada += PASO;
        if (avance < -1e-4) deCulo += -avance;
        else if (avance > 1e-3) haciaDelante += avance;
      } else if (conTractor > 0) {
        fin = t;
        break;
      }
      antes = q;
    }
    expect(deCulo, "empujado de culo").toBeGreaterThan(20);
    expect(haciaDelante, "con el tractor no va hacia delante").toBeLessThan(0.5);
    expect(tractorDelante, "el tractor delante de la rueda de morro").toBeGreaterThan(PASARELA.batalla);
    expect(reservada, "la calle reservada mientras empuja").toBeGreaterThan(20);
    expect(fin, "el tractor se va").toBeGreaterThan(0);
    // Y suelto, rueda hacia delante.
    let rodado = 0;
    antes = donde();
    for (let t = 0; t < 30; t += PASO) {
      trafico.paso(PASO);
      const q = donde();
      const m = vector((antes.rumbo * Math.PI) / 180);
      rodado += (q.x - antes.x) * m.x + (q.z - antes.z) * m.z;
      antes = q;
    }
    expect(rodado, "rueda hacia delante después del saludo").toBeGreaterThan(20);
  });

  it("con quien juega a punto de pasar por detrás del puesto, no empuja hasta que pasa; y su raya se corta antes de la zona", () => {
    // Primero, por dónde barre: el camino de salida sin nadie.
    const solo = montar();
    solo.anuncia(QUIEN, "otro.rodando");
    const p = solo.quienes()[0]!;
    const atras = vector(((p.rumbo + 180) * Math.PI) / 180);
    const detras = { x: p.x + atras.x * 45, z: p.z + atras.z * 45 };
    let tu: QuienJuega | null = null;
    const enTierra: EnTierra = {
      x: detras.x + 200,
      z: detras.z,
      separacion: 17 + 13 + 7.5,
      porDondeVa: [detras],
      esperandoLaPista: false,
      ruta: [
        { x: detras.x + 200, z: detras.z },
        { x: detras.x - 200, z: detras.z },
      ],
    };
    tu = { alUmbral: null, enLaPista: false, enTierra };
    const trafico = montar(() => tu);
    trafico.anuncia(QUIEN, "otro.rodando");
    const tractor = () => trafico.grupo.children.some((o) => o.name === "remolque");
    for (let t = 0; t < 20; t += PASO) trafico.paso(PASO);
    expect(tractor(), "esperando a que pases").toBe(false);
    // Ya has pasado: nada por delante cerca.
    tu = { alUmbral: null, enLaPista: false, enTierra: { ...enTierra, x: detras.x - 400, porDondeVa: [], ruta: [] } };
    for (let t = 0; t < 10; t += PASO) trafico.paso(PASO);
    expect(tractor(), "empuja cuando pasaste").toBe(true);
    // Y si vuelves, tu raya se corta antes de lo que barre.
    const zona = trafico.tramosQueTienen().find((x) => x.empuja);
    expect(zona).toBeDefined();
    const tuRaya: EnElPlano[] = [];
    for (let s = 0; s <= 400; s += 4) tuRaya.push({ x: detras.x + 200 - s, z: detras.z });
    const corta = dondeSeAcerca(tuRaya, zona!.porDelante, enTierra.separacion);
    expect(corta, "tu raya se corta antes").not.toBeNull();
    expect(corta!.dentro).toBe(false);
  });
});
