/**
 * **Fuerteventura, con los puestos que publica el AIP** (ADR 0025, enmienda H85).
 *
 * OpenStreetMap no trae ninguno, y la ficha llevaba cuatro a mano: de ahí salían y ahí llegaban
 * todos, las avionetas y los reactores, sin pasarela ni tractor. Ahora son los 56 de las cartas
 * AD 2-GCFV PDC 1.2 y 1.3, en su punto, con la línea que dibuja la PDC 1.1 y por las calles que
 * dice la casilla 20.5. El APROAR de su columna no es el de los demás campos: lo llevan también los
 * de salida autónoma, y es hacia dónde mira el avión en el puesto.
 */
import { describe, expect, it } from "vitest";
import carta from "../../data/aerodromes/aip/gcfv.pdc.json";
import { enElPavimentoDe, type Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { admite, aproarDe, cumpleElAproar, delAipEn, llegaPorDe, type DelAip } from "./puestos-del-aip";
import { edificiosDePasarela, empujeDesdeElPuesto, entradaDelPuesto, rayaDeLado, quedaSobreLaRaya } from "./remolque";
import { construirGrafo, grafoPorSusCalles, pasandoElCruce, pavimentoDibujado, rodajeEntre, type Grafo, type Ruta, type Tramo } from "./rodaje";
import { conLaRuedaEn, morroDe, MORRO_DEL_TRAFICO } from "./rueda-de-morro";
import { empujaSobrePavimento } from "./ruedas-en-el-empuje";
import { conSuAerodromo, FUERTEVENTURA } from "./scenarios";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { pasarelaDelTrafico, pistaQuePideConSuMargen, TIPOS } from "./trafico";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";

const GRADO = Math.PI / 180;
const CARDINAL: Readonly<Record<string, number>> = { N: 0, E: 90, S: 180, W: 270 };
const avion = (id: string) => AIRCRAFT.find((a) => a.id === id)!;
const aviones = AIRCRAFT.filter((a) => vaALaPasarela(a));

describe("los puestos de Fuerteventura", async () => {
  const campo = await conSuAerodromo(FUERTEVENTURA);
  const aero = campo.aerodrome!;
  const puestos = aero.parkingPositions!;
  const el = (ref: string) => puestos.find((p) => p.ref === ref)!;
  const la01 = campo.runway.heading;
  const la19 = (la01 + 180) % 360;
  const planDe = (id: string, rumbo: number, deContacto = true): PlanDeVuelo => {
    const plan = new PlanDeVuelo(aero, { ...campo.runway, heading: rumbo }, () => 600, avion(id));
    plan.deContacto = deContacto;
    return plan;
  };
  type PorDentro = {
    puestosDeContacto(): { ref: string | null; xy: Punto }[];
    puestosCandidatos(): { ref: string | null }[];
    puestosDeLinea(): { ref: string | null }[];
    grafoDeLlegada(p: Punto): Grafo;
    llegaEn(p: Punto): object;
    ruta: Ruta | null;
  };
  const dentro = (plan: PlanDeVuelo) => plan as unknown as PorDentro;

  it("son los de la carta, todos y en su punto, y ninguno de los cuatro que había a mano", () => {
    expect(puestos.map((p) => p.ref)).toEqual(carta.puestos.map((p) => p.ref));
    expect(puestos).toHaveLength(56);
    const kx = Math.cos((aero.origin.lat * Math.PI) / 180);
    const metros = (6371008 * Math.PI) / 180;
    for (const q of carta.puestos) {
      const p = el(q.ref);
      const d = Math.hypot((q.lon - aero.origin.lon) * kx * metros - p.xy[0], (q.lat - aero.origin.lat) * metros - p.xy[1]);
      expect(d, q.ref).toBeLessThan(0.1);
      expect(p.aip?.salida, q.ref).toBe(q.salida);
      expect(p.aip?.max, q.ref).toBe(q.max);
      expect(p.aip?.morro, q.ref).toBe(q.aproar);
    }
    const pav = enElPavimentoDe(aero);
    for (const p of puestos) expect(pav(p.xy), `el ${p.ref}, en el pavimento`).toBe(true);
  });

  it("cada uno con la línea que dibuja la carta, del eje de su calle a la parada; menos el 14B y el 51B, que no son rectas", () => {
    expect(puestos.filter((p) => !p.entrada).map((p) => p.ref)).toEqual(["14B", "51B"]);
    for (const p of puestos) {
      if (!p.entrada) continue;
      expect(p.entradaDeducida, p.ref!).toBe(true);
      expect(p.entrada.at(-1), p.ref!).toEqual(p.xy);
      const [a, b] = p.entrada as [Punto, Punto];
      // Acaba con el morro adonde publica.
      const rumbo = Math.atan2(b[0] - a[0], b[1] - a[1]) / GRADO;
      const fuera = Math.abs(((rumbo - CARDINAL[p.aip!.morro!]! + 540) % 360) - 180);
      expect(fuera, `el ${p.ref} mira al ${p.aip!.morro}`).toBeLessThan(6);
      // Y empieza en el eje de una calle.
      const alEje = Math.min(
        ...aero.taxiways.flatMap((t) =>
          t.path.slice(1).map((q, i) => {
            const o = t.path[i]!;
            const l2 = (q[0] - o[0]) ** 2 + (q[1] - o[1]) ** 2 || 1;
            const k = Math.max(0, Math.min(1, ((a[0] - o[0]) * (q[0] - o[0]) + (a[1] - o[1]) * (q[1] - o[1])) / l2));
            return Math.hypot(o[0] + (q[0] - o[0]) * k - a[0], o[1] + (q[1] - o[1]) * k - a[1]);
          }),
        ),
      );
      expect(alEje, `el ${p.ref} sale de su calle`).toBeLessThan(0.6);
    }
  });

  it("las tres que la carta dibuja sesgadas entran un poco al sur del oeste, y no las de al lado", () => {
    const rumbo = (ref: string) => {
      const [a, b] = el(ref).entrada as [Punto, Punto];
      return (Math.atan2(b[0] - a[0], b[1] - a[1]) / GRADO + 360) % 360;
    };
    for (const [sesgado, recto] of [["18B", "18"], ["19B", "19"], ["23", "23B"]] as const) {
      expect(rumbo(recto) - rumbo(sesgado), sesgado).toBeGreaterThan(3.5);
      expect(rumbo(recto) - rumbo(sesgado), sesgado).toBeLessThan(5);
    }
  });

  it("el APROAR de la carta es el morro en el puesto: lo llevan los autónomos, y al acabar el empuje manda la casilla 20.5", () => {
    expect(el("33").aip).toMatchObject({ salida: "A", morro: "W", salePor: ["A1", "L2"] });
    expect(el("33B").aip).toMatchObject({ salida: "A", morro: "E", salePor: ["T3"] });
    for (const p of puestos) {
      if (p.aip!.salida === "A") expect(aproarDe(p.aip, la01), p.ref!).toBeNull();
      else if (!p.aip!.uso) expect(p.aip!.aproar, p.ref!).toBe("S");
    }
    expect(aero.aipPuestos?.rodaje).toContain("casilla 20.5");
  });

  it("y por dónde se sale y se llega, puesto a puesto, como lo dice la casilla", () => {
    expect(el("11").aip!.salePor).toEqual(["A1", "L2"]);
    expect(el("19B").aip!.salePor).toEqual(["A2", "L3"]);
    expect(el("28").aip!.salePor).toEqual(["A3", "L4"]);
    expect(llegaPorDe(el("13").aip, la01)).toEqual(["L1", "A1"]);
    expect(llegaPorDe(el("13").aip, la19)).toEqual(["L2"]);
    expect(llegaPorDe(el("42").aip, la01)).toEqual(["T4"]);
    expect(llegaPorDe(null, la01)).toBeNull();
  });

  it("el mayor avión por su envergadura, y el B747, el 747-400: el -8 no aparca en la plataforma (20.7)", () => {
    const de = (max: string): DelAip => ({ salida: "R", max, contacto: null, carta: null });
    expect(admite(de("24 m"), 19.81)).toBe(true);
    expect(admite(de("24 m"), 26)).toBe(false);
    expect(admite(de("15 m"), 17.66)).toBe(false);
    expect(admite(de("B747"), avion("jaz-110").wingSpan)).toBe(true);
    expect(el("26").aip!.max).toBe("B747");
    expect(el("21B").aip!.max).toBe("AT72");
  });

  /*
   * **De cada puesto de pasarela**, con los tres reactores y por las dos cabeceras: de culo por su
   * línea, a la calle, con el morro hacia donde sale, por la L que publica, sin una rueda fuera.
   */
  it.each(aviones.map((a) => a.id))("de cada puesto de contacto con el %s: por su línea, con el morro al S y por su L", (id) => {
    const edificios = edificiosDePasarela(aero);
    let filas = 0;
    for (const rumbo of [la01, la19]) {
      const plan = planDe(id, rumbo);
      for (const p of dentro(plan).puestosDeContacto()) {
        const nombre = `${rumbo.toFixed(0)}° · el ${p.ref}`;
        const aip = el(p.ref!).aip!;
        expect(aip.uso, nombre).toBeUndefined();
        expect(plan.reiniciarDesde(p.xy), nombre).toBe(true);
        const [x, z] = plan.arranque()!;
        const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
        const a = avion(id);
        const suyo = empujeDesdeElPuesto({ x, z }, edificios, raya, entradaDelPuesto(aero, x, z), a.batalla, (r) =>
          conLaRuedaEn({ x, z }, r, morroDe(a)),
        )!;
        const fin = suyo.empuje!.poses.at(-1)!;
        expect(suyo.porLaPintada, `${nombre}: por su línea`).toBe(true);
        expect(rayaDeLado(suyo.rumbo, raya), `${nombre}: de lado`).toBe(false);
        expect(quedaSobreLaRaya(fin, raya), `${nombre}: sobre la raya`).toBe(true);
        expect(cumpleElAproar(fin.rumbo, aproarDe(aip, rumbo)!), `${nombre}: el morro`).toBe(true);
        expect(empujaSobrePavimento(a, suyo.empuje!.poses, pavimentoDibujado(aero)), `${nombre}: sobre pavimento`).toBe(true);
        const letras = dentro(plan).ruta!.letras;
        expect(letras, nombre).toContain(aip.salePor!.at(-1)!);
        for (const c of aero.aipPuestos!.callesDePlataforma!)
          if (!aip.salePor!.includes(c)) expect(letras, `${nombre}: sin la ${c}`).not.toContain(c);
        filas++;
      }
    }
    expect(filas).toBe(id === "jaz-90" ? 38 : 10);
  });

  it("del 18 la L2 queda detrás de su línea: se empuja más allá y se sale por ella, por las dos cabeceras", () => {
    for (const rumbo of [la01, la19]) {
      const plan = planDe("jaz-90", rumbo);
      expect(plan.reiniciarDesde(el("18").xy)).toBe(true);
      const ruta = dentro(plan).ruta!;
      expect(ruta.vuelveEn).toBeDefined();
      expect(ruta.letras).toContain("L2");
      // La vuelta, al norte de la L2, que deja la A1 a la altura de los 157,6 m.
      expect(ruta.puntos[ruta.vuelveEn!]![1]).toBeGreaterThan(157.6 + 25);
    }
  });

  it("el puesto del que sale cada uno con pasaje es de pasarela y lo admite", () => {
    for (const a of aviones)
      for (const rumbo of [la01, la19]) {
        const plan = planDe(a.id, rumbo);
        const [x, z] = plan.arranque()!;
        const p = puestos.find((q) => Math.hypot(q.xy[0] - x, q.xy[1] + z) < 1)!;
        expect(dentro(plan).puestosDeContacto().map((q) => q.ref), a.id).toContain(p.ref);
        expect(admite(p.aip, a.wingSpan), a.id).toBe(true);
      }
  });

  it("las avionetas, a la plataforma de aviación general; el turbohélice y los reactores, no", () => {
    expect(puestos.filter((p) => p.aip!.uso === "general").map((p) => p.ref)).toEqual(["52B", "52C", "53B", "54", "55", "56", "57", "58", "59", "60"]);
    expect(puestos.filter((p) => p.aip!.uso === "carga").map((p) => p.ref)).toEqual(["51", "51B", "52", "53"]);
    for (const id of ["jaz-20", "jaz-25", "jaz-40"])
      for (const p of dentro(planDe(id, la01, false)).puestosCandidatos()) expect(el(p.ref!).aip!.uso, `${id} · ${p.ref}`).toBe("general");
    for (const id of ["jaz-50", "jaz-60", "jaz-90"])
      for (const p of dentro(planDe(id, la01, false)).puestosDeLinea()) expect(el(p.ref!).aip!.uso, `${id} · ${p.ref}`).toBeUndefined();
  });

  it("y el tráfico, igual: cada uno a un puesto que lo admite, por las calles del suyo", () => {
    const refDe = (q: { x: number; z: number }) =>
      [...puestos].sort((a, b) => Math.hypot(a.xy[0] - q.x, a.xy[1] + q.z) - Math.hypot(b.xy[0] - q.x, b.xy[1] + q.z))[0]!;
    for (const heading of [la01, la19])
      for (const t of [TIPOS.avioneta, TIPOS.bimotor, TIPOS.turbohelice]) {
        const suelo = sueloDelTrafico(aero, { ...campo.runway, heading }, aero.runways[0]?.widthM ?? 45)!;
        const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), undefined, undefined, MORRO_DEL_TRAFICO[t.id], t.envergadura)!;
        const llega = suelo.llegada(t.toca + t.frena, undefined, undefined, undefined, undefined, MORRO_DEL_TRAFICO[t.id], t.envergadura)!;
        for (const q of [sale.camino[0]!, llega.camino.at(-1)!]) {
          const p = refDe(q);
          const nombre = `${heading.toFixed(0)}° · ${t.id} · el ${p.ref}`;
          expect(Math.hypot(p.xy[0] - q.x, p.xy[1] + q.z), nombre).toBeLessThan(15);
          expect(admite(p.aip, t.envergadura), nombre).toBe(true);
          expect(p.aip!.uso, nombre).toBe(t.envergadura < 15 ? "general" : undefined);
        }
      }
  });

  it("de un autónomo se sale de frente a su calle de plataforma, y a él se llega por detrás, de la paralela", () => {
    const plan = planDe("jaz-60", la01, false);
    expect(plan.reiniciarDesde(el("45").xy)).toBe(true);
    const ruta = dentro(plan).ruta!;
    expect(ruta.letras.slice(0, 2)).toEqual(["A3", "L4"]);
    // Los primeros metros, hacia el oeste: el morro al W de la carta.
    const [a, b] = ruta.puntos as [Punto, Punto];
    expect(b[0]).toBeLessThan(a[0] - 30);
    expect(Math.abs(b[1] - a[1])).toBeLessThan(10);
  });

  it.each([
    ["15", 1.6, [-120, 435.5], ["L1", "A1"]],
    ["15", 181.6, [-120, 155], ["L2", "A1"]],
    ["27", 181.6, [-205.3, -1966], ["L4", "A3"]],
    ["19", 1.6, [-120, 155], ["L2", "A2"]],
    ["47", 181.6, [-205.3, -1966], ["T5"]],
    ["33B", 1.6, [-120, 435.5], ["L1", "A1"]],
  ] as const)("al %s con la pista al %s° se llega por las suyas y se entra por su raya", (ref, rumbo, desde, por) => {
    const plan = planDe("jaz-90", rumbo);
    plan.reiniciar();
    const meta = el(ref).xy;
    const d = dentro(plan);
    const r = rodajeEntre(d.grafoDeLlegada(meta), [desde[0], desde[1]], meta, 600, undefined, { desdeFuera: true, desdeLaCalle: true, ...d.llegaEn(meta) })!;
    expect(r.letras.slice(-por.length)).toEqual([...por]);
    const [a, b] = [r.puntos.at(-2)!, r.puntos.at(-1)!];
    const [c, e] = el(ref).entrada as [Punto, Punto];
    const u = Math.hypot(e[0] - c[0], e[1] - c[1]);
    const v = Math.hypot(b[0] - a[0], b[1] - a[1]);
    expect(((e[0] - c[0]) * (b[0] - a[0]) + (e[1] - c[1]) * (b[1] - a[1])) / (u * v)).toBeGreaterThan(Math.cos(2 * GRADO));
  });

  it("el reactor del tráfico sale empujado de la terminal, sobre pavimento, por la L de su puesto", () => {
    const reactor = TIPOS.reactor;
    const pav = enElPavimentoDe(aero);
    for (const heading of [la01, la19]) {
      const suelo = sueloDelTrafico(aero, { ...campo.runway, heading }, aero.runways[0]?.widthM ?? 45)!;
      const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(reactor), pasarelaDelTrafico(reactor)!, undefined, MORRO_DEL_TRAFICO.reactor)!;
      const poses = sale.empuje!.trayectoria.poses;
      const m = MORRO_DEL_TRAFICO.reactor.rueda;
      const aip = delAipEn(aero, poses[0]!.x + Math.sin(poses[0]!.rumbo) * m, poses[0]!.z - Math.cos(poses[0]!.rumbo) * m)!;
      expect(aip.salida).toBe("R");
      expect(aip.uso).toBeUndefined();
      for (const q of poses) expect(pav([q.x, -q.z])).toBe(true);
      // La L por la que cruza de la A a la T: la que publica su puesto.
      const laL: Readonly<Record<string, number>> = { L1: 490, L2: 111, L3: -191, L4: -459 };
      const k = sale.camino.findIndex((q, i) => i > 0 && q.x >= -260 && sale.camino[i - 1]!.x < -260);
      const [a, b] = [sale.camino[k - 1]!, sale.camino[k]!];
      const y = -(a.z + ((b.z - a.z) * (-260 - a.x)) / (b.x - a.x));
      expect(Math.abs(y - laL[aip.salePor!.at(-1)!]!), aip.salePor!.join("-")).toBeLessThan(6);
      expect(cumpleElAproar(poses.at(-1)!.rumbo, aproarDe(aip, heading)!)).toBe(true);
    }
  });

  it("las restricciones de rodaje de la casilla 20.4: la A4 hasta la letra C; la E2 y la E9, hasta la D", () => {
    expect(aero.restriccionesDeRodaje!.map((r) => [r.calle, r.masDeM])).toEqual([["A4", 36], ["E2", 52], ["E9", 52]]);
    for (const r of aero.restriccionesDeRodaje!) expect(r.fuente).toMatch(/AD 2-GCFV, casilla 20\.4|^Ídem/);
    const estrechas = (ancho: number) => {
      const g = construirGrafo(aero, ancho / 2);
      return (letra: string) => g.tramos.filter((t) => t.ref === letra).every((t) => t.estrecho);
    };
    const grande = estrechas(60.12);
    for (const letra of ["A4", "E2", "E9"]) expect(grande(letra), letra).toBe(true);
    for (const letra of ["A4", "E2", "E9"]) expect(estrechas(26)(letra), letra).toBe(false);
    for (const letra of ["E1", "E10", "A3", "L4"]) expect(grande(letra), letra).toBe(false);
  });
});

describe("las calles que publica el AIP para un puesto", () => {
  // Dos calles de plataforma, la A y la C, de sur a norte, y la paralela P al este; el puesto, entre las dos.
  const nudos: Punto[] = [
    [0, 0],
    [0, 300],
    [100, 0],
    [100, 300],
  ];
  const tramo = (a: number, b: number, ref: string): Tramo => ({
    a,
    b,
    largo: Math.hypot(nudos[b]![0] - nudos[a]![0], nudos[b]![1] - nudos[a]![1]),
    ref,
    puntos: [nudos[a]!, nudos[b]!],
    pista: false,
    coste: Math.hypot(nudos[b]![0] - nudos[a]![0], nudos[b]![1] - nudos[a]![1]),
  });
  const tramos = [tramo(0, 1, "A"), tramo(0, 2, "L1"), tramo(1, 3, "L2"), tramo(2, 3, "P")];
  const grafo: Grafo = {
    nudos,
    tramos,
    desde: nudos.map((_, n) => tramos.flatMap((t, k) => (t.a === n || t.b === n ? [k] : []))),
  };
  const todas = new Set(["A", "L1", "L2"]);
  const puesto: Punto = [-60, 100];
  const doble: Punto = [100, 20];

  it("por la suya aunque sea más largo, y las que no nombra ninguna ruta no cambian", () => {
    expect(rodajeEntre(grafo, puesto, doble, 90)!.letras).toEqual(["A", "L1", "P"]);
    const porLaDos = grafoPorSusCalles(grafo, ["A", "L2"], todas);
    expect(rodajeEntre(porLaDos, puesto, doble, 90)!.letras).toEqual(["A", "L2", "P"]);
    expect(porLaDos.tramos.find((t) => t.ref === "P")).toBe(tramos[3]);
    expect(grafoPorSusCalles(grafo, ["A", "L2"], todas)).toBe(porLaDos);
  });

  it("y se engancha en la que toca, si se dice, y si de esa no hay, en la más cercana", () => {
    const enMedio: Punto = [40, 150];
    expect(rodajeEntre(grafo, enMedio, doble, 220, undefined, { saleEn: (t) => t.ref === "P" })!.letras).toEqual(["P"]);
    expect(rodajeEntre(grafo, enMedio, doble, 220, undefined, { saleEn: (t) => t.ref === "A" })!.letras[0]).toBe("A");
    expect(rodajeEntre(grafo, enMedio, doble, 220, undefined, { saleEn: (t) => t.ref === "Z" })).not.toBeNull();
    const porDetras = rodajeEntre(grafo, doble, puesto, 220, undefined, { llegaPorSuRaya: { haciaAtras: [1, 0], mide: 58 } })!;
    expect(porDetras.puntos.at(-2)).toEqual([0, 100]);
  });

  it("con el ramal suyo a menos de treinta y dos metros, se empuja lo que falta para quedar recto hasta él", () => {
    const deEspaldas: Punto = [1, 0];
    const suya = (r: Ruta) => r.letras.includes("L1");
    const cerca: Punto = [-60, 20];
    const r = rodajeEntre(grafo, cerca, doble, 220, undefined, { deEspaldas, sentido: [[0, -1]] })!;
    expect(r.puntos[1]).toEqual([0, 20]);
    const [otra] = pasandoElCruce(grafo, [doble], [r], deEspaldas, undefined, suya);
    expect(otra!.vuelveEn).toBe(2);
    expect(otra!.puntos[2]).toEqual([0, 32]);
    expect(otra!.largo).toBeCloseTo(r.largo + 24, 5);
    // Sin que lo mande el AIP, como siempre.
    expect(pasandoElCruce(grafo, [doble], [r], deEspaldas)[0]).toBeNull();
  });
});
