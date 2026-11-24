/**
 * **La ruta empieza donde acaba el empuje** (ADR 0025, enmienda H79), y lo que dejó abierto la H76:
 * el segundo tramo, que también sale hacia el APROAR de su puesto, y las restricciones de rodaje de
 * Lanzarote.
 *
 * El caso es el T2 de Lanzarote por la 03: la ruta se trazaba desde donde la línea del puesto cruza
 * la calle de la plataforma, con el morro al NE, y la C, que la cruza ocho metros por detrás, ya
 * había quedado atrás: se bajaba a la R por la B, quinientos cincuenta metros más. Un tractor empuja
 * unos metros más y deja el avión antes de la C.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { aproarDe, cumpleElAproar, delAipEn, puestoEn } from "./puestos-del-aip";
import {
  acabaEnLaCalle,
  diferencia,
  dondeVuelve,
  edificiosDePasarela,
  empujeDesdeElPuesto,
  entradaDelPuesto,
  rumboEntre,
  vector,
  type PuntoXZ,
} from "./remolque";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { construirGrafo, pasandoElCruce, rodajeEntre, type Grafo, type Tramo } from "./rodaje";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import type { FlightState } from "../flight/model";
import { conLaRuedaEn, morroDe, MORRO_DEL_TRAFICO, ruedaDeMorroEn } from "./rueda-de-morro";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { pasarelaDelTrafico, pistaQuePideConSuMargen, TIPOS } from "./trafico";
import type { Punto } from "./aerodrome";

const GRADO = Math.PI / 180;
const largoDe = (raya: readonly PuntoXZ[]): number =>
  raya.reduce((m, p, i) => m + (i ? Math.hypot(p.x - raya[i - 1]!.x, p.z - raya[i - 1]!.z) : 0), 0);

describe("la ruta que pasa el cruce", () => {
  /*
   * Una calle de oeste a este, de la que sale al norte un ramal en x = 100; el puesto, al sur, con
   * su línea en x = 120, y la salida al este: el ramal queda veinte metros por detrás del cruce. Por
   * el este se llega a la misma doble raya dando la vuelta.
   */
  const nudos: Punto[] = [
    [0, 0],
    [100, 0],
    [400, 0],
    [400, 200],
    [100, 200],
  ];
  const tramo = (a: number, b: number): Tramo => ({
    a,
    b,
    largo: Math.hypot(nudos[b]![0] - nudos[a]![0], nudos[b]![1] - nudos[a]![1]),
    ref: null,
    puntos: [nudos[a]!, nudos[b]!],
    pista: false,
  });
  const grafo = (tramos: Tramo[]): Grafo => ({
    nudos,
    tramos,
    desde: nudos.map((_, n) => tramos.flatMap((t, k) => (t.a === n || t.b === n ? [k] : []))),
  });
  const conRamal = grafo([tramo(0, 1), tramo(1, 2), tramo(2, 3), tramo(3, 4), tramo(1, 4)]);
  const sinRamal = grafo([tramo(0, 1), tramo(1, 2), tramo(2, 3), tramo(3, 4)]);
  const elPuesto: Punto = [120, -80];
  const doble: Punto = [100, 150];
  const deEspaldas: Punto = [0, 1];
  const sentido: Punto[] = [[1, 0]];

  it("empuja hasta treinta y dos metros antes del ramal que queda detrás del cruce, y sale por él", () => {
    const desdeElCruce = rodajeEntre(conRamal, elPuesto, doble, 220, undefined, { deEspaldas, sentido })!;
    expect(desdeElCruce.largo).toBeCloseTo(80 + 280 + 200 + 300 + 50, 0);
    const r = pasandoElCruce(conRamal, [doble], [desdeElCruce], deEspaldas)[0]!;
    expect(r.vuelveEn).toBe(2);
    expect(r.puntos).toEqual([elPuesto, [120, 0], [68, 0], [100, 0], doble]);
    expect(r.largo).toBeCloseTo(80 + 52 + 32 + 150, 0);
  });

  it("no si el ramal queda por delante, si no ahorra, si no lo hay o si la calle no sigue recta hasta ahí", () => {
    // Hacia el oeste el ramal queda por delante: la ruta de siempre ya sale por él.
    const alOeste = rodajeEntre(conRamal, elPuesto, doble, 220, undefined, { deEspaldas, sentido: [[-1, 0]] })!;
    expect(pasandoElCruce(conRamal, [doble], [alOeste], deEspaldas)).toEqual([null]);
    const alFondo: Punto = [390, 200];
    const corta = rodajeEntre(conRamal, elPuesto, alFondo, 220, undefined, { deEspaldas, sentido })!;
    expect(pasandoElCruce(conRamal, [alFondo], [corta], deEspaldas)).toEqual([null]);
    const sin = rodajeEntre(sinRamal, elPuesto, doble, 220, undefined, { deEspaldas, sentido })!;
    expect(pasandoElCruce(sinRamal, [doble], [sin], deEspaldas)).toEqual([null]);
    expect(pasandoElCruce(conRamal, [doble], [null], deEspaldas)).toEqual([null]);
    // El puesto más al oeste de la calle: no hay treinta y dos metros antes del ramal.
    const acortada = { ...conRamal, nudos: [[90, 0] as Punto, ...nudos.slice(1)], tramos: conRamal.tramos.map((t) => (t.a === 0 ? { ...t, largo: 10, puntos: [[90, 0] as Punto, [100, 0] as Punto] } : t)) };
    const r = rodajeEntre(acortada, elPuesto, doble, 220, undefined, { deEspaldas, sentido })!;
    expect(pasandoElCruce(acortada, [doble], [r], deEspaldas)).toEqual([null]);
  });
});

describe("el empuje de una raya que da la vuelta en seco", () => {
  // El puesto al norte de una calle de oeste a este, con el morro al norte; la raya sale al sur, va al oeste y vuelve al este.
  const raya: PuntoXZ[] = [
    { x: 0, z: 0 },
    { x: 0, z: 100 },
    { x: -60, z: 100 },
    { x: 200, z: 100 },
  ];
  const terminal = [{ polygon: [[-60, 60], [60, 60], [60, 15], [-60, 15]] as unknown as Punto[] }];

  it("la raya de siempre no la da; la que sí, en su punto", () => {
    expect(dondeVuelve(raya)).toBe(2);
    expect(dondeVuelve([raya[0]!, raya[1]!, raya[3]!])).toBeNull();
  });

  it("acaba pasada la vuelta, con ella por delante, sobre la calle y mirando por ella", () => {
    const e = empujeDesdeElPuesto({ x: 0, z: 0 }, terminal, raya, null, 11.5, (r) => ({ x: -vector(r).x * 10, z: -vector(r).z * 10 }))!;
    const fin = e.empuje!.poses.at(-1)!;
    expect(fin.x).toBeCloseTo(-63, 0);
    expect(fin.z).toBeCloseTo(100, 0);
    expect(Math.abs(diferencia(fin.rumbo, Math.PI / 2))).toBeLessThan(GRADO);
    expect(acabaEnLaCalle(e.empuje!, raya, 11.5)).toBe(true);
    // Y el tráfico, que los demás los hace cortos, este también.
    const t = empujeDesdeElPuesto({ x: 0, z: 0 }, terminal, raya, null, 11.5, (r) => ({ x: -vector(r).x * 10, z: -vector(r).z * 10 }), {
      porLaPlataforma: false,
      siempreLaPintada: true,
    })!;
    expect(t.empuje!.poses.at(-1)!.x).toBeCloseTo(-63, 0);
  });

  it("y si la vuelta queda demasiado cerca para el giro, no hay empuje por ahí", () => {
    const cerrada: PuntoXZ[] = [{ x: 0, z: 0 }, { x: 0, z: 12 }, { x: -2, z: 12 }, { x: 200, z: 12 }];
    const e = empujeDesdeElPuesto({ x: 0, z: 0 }, terminal, cerrada, null, 20, (r) => ({ x: -vector(r).x * 10, z: -vector(r).z * 10 }))!;
    expect(e.empuje).toBeNull();
  });
});

describe("en Lanzarote", async () => {
  let campo: Scenario | null = null;
  for (const e of SCENARIOS) {
    const s = await conSuAerodromo(e);
    if (s.aerodrome?.id === "GCRR") campo ??= s;
  }
  const gcrr = campo!;
  const aero = gcrr.aerodrome!;
  const edificios = edificiosDePasarela(aero);
  const elDe = (ref: string): Punto => aero.parkingPositions!.find((p) => p.ref === ref)!.xy;
  const avionDe = (id: string) => AIRCRAFT.find((a) => a.id === id)!;
  const planDe = (id: string, rumbo: number): PlanDeVuelo => {
    const plan = new PlanDeVuelo(aero, { ...gcrr.runway, heading: rumbo }, () => 0, avionDe(id));
    plan.deContacto = true;
    return plan;
  };
  const la03 = gcrr.runway.heading;
  const la21 = (la03 + 180) % 360;
  const empujeDe = (plan: PlanDeVuelo, id: string, ref: string) => {
    const [x, z] = [elDe(ref)[0], -elDe(ref)[1]];
    const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
    const e = empujeDesdeElPuesto({ x, z }, edificios, raya, entradaDelPuesto(aero, x, z), avionDe(id).batalla, (r) =>
      conLaRuedaEn({ x, z }, r, morroDe(avionDe(id))),
    )!;
    return { e, raya };
  };
  const letras = (plan: PlanDeVuelo): readonly string[] => (plan as unknown as { ruta: { letras: readonly string[] } }).ruta.letras;

  it("el T2 por la 03, por la C: 1.859 m con el empuje, por los 2.316 de la B, y el morro al NE antes de ella", () => {
    const plan = planDe("jaz-90", la03);
    expect(plan.reiniciarDesde(elDe("T2"))).toBe(true);
    const { e, raya } = empujeDe(plan, "jaz-90", "T2");
    expect(letras(plan)).toEqual(["C", "R4", "R5"]);
    expect(largoDe(raya)).toBeLessThan(1900);
    expect(e.porLaPintada).toBe(true);
    const fin = e.empuje!.poses.at(-1)!;
    expect(fin.rumbo / GRADO).toBeCloseTo(28, -1);
    expect(e.empuje!.largo).toBeGreaterThan(140);
    expect(e.empuje!.largo).toBeLessThan(175);
    // La raya por la que se rueda, por delante del morro y recta.
    const v = dondeVuelve(raya)!;
    const delante = (raya[v]!.x - fin.x) * vector(fin.rumbo).x + (raya[v]!.z - fin.z) * vector(fin.rumbo).z;
    expect(delante).toBeGreaterThan(1);
    expect(delante).toBeLessThan(6);
  });

  it("con el avión ya donde lo deja el tractor, la raya empieza ahí, y por ella se rueda hacia delante", () => {
    const plan = planDe("jaz-90", la03);
    plan.reiniciarDesde(elDe("T2"));
    const { e, raya } = empujeDe(plan, "jaz-90", "T2");
    const poses = e.empuje!.poses;
    const paso = (x: number, z: number, rumbo: number) =>
      plan.paso(
        {
          position: new Vector3(x, 3, z),
          velocity: new Vector3(),
          heading: rumbo,
          airspeed: 0,
          groundSpeed: 1,
          onGround: true,
        } as unknown as FlightState,
        3,
        true,
        1 / 60,
      );
    // Empujando, la raya sigue entera hasta que el avión está en la calle con el morro hacia delante.
    for (const p of poses.filter((_, i) => i % 4 === 0 && i < poses.length / 2)) paso(p.x, p.z, p.rumbo);
    expect(dondeVuelve(plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz })))).not.toBeNull();
    for (const p of poses.filter((_, i) => i % 4 === 0 && i >= poses.length / 2)) paso(p.x, p.z, p.rumbo);
    const fin = poses.at(-1)!;
    paso(fin.x, fin.z, fin.rumbo);
    const deAhora = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
    expect(dondeVuelve(deAhora)).toBeNull();
    expect(Math.hypot(deAhora[0]!.x - fin.x, deAhora[0]!.z - fin.z)).toBeLessThan(6);
    expect(Math.abs(diferencia(fin.rumbo, rumboEntre(deAhora[0]!, deAhora[1]!)))).toBeLessThan(3 * GRADO);
    expect(largoDe(deAhora)).toBeLessThan(largoDe(raya) - 150);
    // Y rodando por ella, el avance crece.
    let antes = -1;
    for (let s = 5; s < 120; s += 5) {
      let quedan = s;
      let q = deAhora[0]!;
      for (let i = 1; i < deAhora.length; i++) {
        const l = Math.hypot(deAhora[i]!.x - deAhora[i - 1]!.x, deAhora[i]!.z - deAhora[i - 1]!.z);
        if (quedan <= l) {
          q = { x: deAhora[i - 1]!.x + ((deAhora[i]!.x - deAhora[i - 1]!.x) * quedan) / l, z: deAhora[i - 1]!.z + ((deAhora[i]!.z - deAhora[i - 1]!.z) * quedan) / l };
          break;
        }
        quedan -= l;
      }
      paso(q.x, q.z, fin.rumbo);
      expect(plan.avanceEnLaRuta).toBeGreaterThan(antes);
      antes = plan.avanceEnLaRuta;
    }
  });

  it("y de cualquier puesto, al acabar el empuje la raya empieza en el avión y sale por delante del morro", () => {
    let filas = 0;
    for (const id of ["jaz-90", "jaz-110", "jaz-120"])
      for (const rumbo of [la03, la21]) {
        const plan = planDe(id, rumbo);
        const puestos = (plan as unknown as { puestosDeContacto(): { ref: string; xy: Punto }[] }).puestosDeContacto();
        for (const p of puestos) {
          plan.reiniciarDesde(p.xy);
          const { e, raya } = empujeDe(plan, id, p.ref);
          const fin = e.empuje!.poses.at(-1)!;
          plan.acabaElEmpuje(fin);
          const deAhora = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
          const nombre = `${id} · ${rumbo.toFixed(0)}° · el ${p.ref}`;
          expect(Math.hypot(deAhora[0]!.x - fin.x, deAhora[0]!.z - fin.z), nombre).toBeLessThan(0.5);
          const a15 = deAhora.find((q) => Math.hypot(q.x - fin.x, q.z - fin.z) >= 15)!;
          expect(Math.abs(diferencia(fin.rumbo, rumboEntre(fin, a15))) / GRADO, nombre).toBeLessThan(8);
          // Y acaba donde acababa, sin lo que ya se hizo empujando.
          expect(Math.hypot(deAhora.at(-1)!.x - raya.at(-1)!.x, deAhora.at(-1)!.z - raya.at(-1)!.z), nombre).toBeLessThan(0.5);
          expect(largoDe(deAhora), nombre).toBeLessThan(largoDe(raya) - 30);
          filas++;
        }
      }
    expect(filas).toBe(30);
  });

  it("el reactor del tráfico que sale del T2 por la 03, también por la C y con el morro al NE", () => {
    const reactor = TIPOS.reactor;
    const suelo = sueloDelTrafico(aero, { ...gcrr.runway, heading: la03 }, 45)!;
    const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(reactor), pasarelaDelTrafico(reactor)!, undefined, MORRO_DEL_TRAFICO.reactor)!;
    const [a] = sale.empuje!.trayectoria.poses;
    const m = MORRO_DEL_TRAFICO.reactor.rueda;
    const aip = delAipEn(aero, a!.x + Math.sin(a!.rumbo) * m, a!.z - Math.cos(a!.rumbo) * m);
    const fin = sale.empuje!.trayectoria.poses.at(-1)!;
    expect(cumpleElAproar(fin.rumbo, aproarDe(aip, la03)!)).toBe(true);
    expect(sale.espera).toBeLessThan(2000);
    // De donde acaba el empuje, hacia delante: el camino no vuelve por detrás del morro.
    const k = sale.camino.findIndex((p) => Math.hypot(p.x - fin.x, p.z - fin.z) < 0.5);
    const sigue = sale.camino[k + 1]!;
    expect((sigue.x - fin.x) * vector(fin.rumbo).x + (sigue.z - fin.z) * vector(fin.rumbo).z).toBeGreaterThan(0);
  });

  /*
   * **El segundo tramo** (`salirEmpujadoDeDondeSeLlego`): se para con la rueda de morro en el punto
   * del puesto, o cerca, y la raya se traza desde él. Desde donde está el avión no hay ni raya
   * pintada ni APROAR.
   */
  it.each(["jaz-90", "jaz-110", "jaz-120"])("el segundo tramo con el %s: desde el puesto al que se llegó, el morro hacia su APROAR", (id) => {
    let filas = 0;
    let sinEl = 0;
    const avion = avionDe(id);
    for (const rumbo of [la03, la21]) {
      const plan = planDe(id, rumbo);
      const puestos = (plan as unknown as { puestosDeContacto(): { ref: string; xy: Punto }[] }).puestosDeContacto();
      for (const p of puestos) {
        const [px, pz] = [p.xy[0], -p.xy[1]];
        const aproar = aproarDe(delAipEn(aero, px, pz), rumbo);
        if (!aproar) continue;
        // Parado a metro y medio del punto, como se llega.
        const rumboLlegado = rumboEntre(entradaDelPuesto(aero, px, pz)!.at(-2)!, { x: px, z: pz });
        const centro = conLaRuedaEn({ x: px + 1, z: pz - 1 }, rumboLlegado, morroDe(avion));
        const rueda = ruedaDeMorroEn(centro, rumboLlegado, morroDe(avion));
        const suyo = puestoEn(aero, rueda.x, rueda.z)!;
        expect(suyo.xy).toEqual(p.xy);
        const acaba = (): number => {
          const raya = plan.rutaVisible().map(([qx, qz]) => ({ x: qx, z: qz }));
          return empujeDesdeElPuesto({ x: rueda.x, z: rueda.z }, edificios, raya, entradaDelPuesto(aero, rueda.x, rueda.z), avion.batalla, (r) =>
            conLaRuedaEn({ x: rueda.x, z: rueda.z }, r, morroDe(avion)),
          )!.empuje!.poses.at(-1)!.rumbo;
        };
        expect(plan.reiniciarDesde(suyo.xy)).toBe(true);
        expect(cumpleElAproar(acaba(), aproar), `${rumbo.toFixed(0)}° · el ${p.ref}`).toBe(true);
        filas++;
        plan.otroTramoDesde([centro.x, -centro.z]);
        if (!cumpleElAproar(acaba(), aproar)) sinEl++;
      }
    }
    expect(filas).toBeGreaterThan(3);
    // Con la raya desde donde está el avión, como se hacía, no en todos.
    if (id === "jaz-90") expect(sinEl).toBeGreaterThan(0);
  });

  describe("las restricciones de rodaje del AIP", () => {
    it("la ficha lleva las de la casilla 20, con su frase", () => {
      const r = aero.restriccionesDeRodaje!;
      expect(r.map((q) => q.masDeM)).toEqual([52, 50, 15]);
      for (const q of r) expect(q.fuente).toContain("AD 2-GCRR, casilla 20");
    });

    it("con más de 52 m la calle de la plataforma entre las puertas y la B son de las que no se toman; con menos, no", () => {
      const angosta = construirGrafo(aero, 26 / 2);
      const ancha = construirGrafo(aero, 59.6 / 2);
      expect(angosta.tramos.filter((t) => t.ref === "B").some((t) => t.estrecho)).toBe(false);
      expect(ancha.tramos.filter((t) => t.ref === "B").every((t) => t.estrecho)).toBe(true);
      // La C y la A se quedan: por ellas se sale.
      for (const letra of ["A", "C"]) expect(ancha.tramos.filter((t) => t.ref === letra && t.estrecho), letra).toEqual([]);
      // Entre la B y la C, en la calle de la plataforma.
      const entre = ancha.tramos.find((t) => !t.pista && t.puntos.some((p) => Math.hypot(p[0] + 94, p[1] - 555) < 2))!;
      expect(entre.estrecho).toBe(true);
    });

    it.each(["jaz-110", "jaz-120"])("el %s sale del T1 y del T7 por la C, por las dos cabeceras, y no por la B ni por la A", (id) => {
      let filas = 0;
      for (const rumbo of [la03, la21])
        for (const ref of ["T1", "T7"]) {
          const plan = planDe(id, rumbo);
          const puestos = (plan as unknown as { puestosDeContacto(): { ref: string | null }[] }).puestosDeContacto();
          if (!puestos.some((p) => p.ref === ref)) continue;
          expect(plan.reiniciarDesde(elDe(ref)), ref).toBe(true);
          expect(letras(plan)[0], `${rumbo.toFixed(0)}° · ${ref}`).toBe("C");
          expect(letras(plan)).not.toContain("B");
          expect(letras(plan)).not.toContain("A");
          filas++;
        }
      expect(filas).toBe(4);
    });

    it("y llega a ellos por la C: de la R al T1 y al T7", () => {
      const ancha = construirGrafo(aero, 59.6 / 2);
      for (const desde of [[-264, -122], [298, 986]] as Punto[])
        for (const ref of ["T1", "T7"]) {
          const r = rodajeEntre(ancha, desde, elDe(ref), 220)!;
          expect(r.letras, ref).toContain("C");
          expect(r.letras, ref).not.toContain("B");
        }
    });
  });
});

describe("los reactores que se empujan", () => {
  it("son los tres de siempre: la regla mira a quien sale empujado", () => {
    expect(AIRCRAFT.filter((a) => vaALaPasarela(a)).map((a) => a.id)).toEqual(["jaz-90", "jaz-110", "jaz-120"]);
  });
});
