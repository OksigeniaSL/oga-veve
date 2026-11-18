/**
 * **«Rumbo de noche», volado por un piloto de cinemática**: el morro donde se
 * diga, la verdadera del avión y el viento del sitio, con el sol de verdad
 * —el mismo `solALaHora` que pinta el cielo— y el reloj del cielo apurado.
 *
 * Lo que tiene que salir, y es la lección: siguiendo el río con luz, la noche
 * cae en el puente; con la flecha quieta en la marca se llega encima de donde
 * el río sigue, y con el morro apartado se pasa al lado lo que dice el seno.
 */

import { describe, expect, it } from "vitest";
import { ARAI, PANAMBI, PYKASU } from "./aircraft";
import { ejercicioPorId, ejerciciosPara } from "./ejercicios";
import { centrado } from "./radio-de-navegacion";
import {
  alturaDelSol,
  avanceSobreElCauce,
  bajadaDelSol,
  colocacionDelRumbo,
  EN_LA_MARCA,
  horaConElSolA,
  LLEGADA,
  NOCHE,
  PRISA,
  PRISA_SIN_AVANZAR,
  rioDeNoche,
  RumboDeNoche,
  type SucesoDelRumbo,
} from "./rumbo-de-noche";
import { SCENARIOS, oaciDe } from "../world/scenarios";
import { vientoComoVector } from "../world/meteo";
import { solALaHora } from "../world/cielo-de-noche";
import { TOPE_POR_DEBAJO_DE_DIEZ_MIL } from "./seguir-la-aguja";
import { NUDO, maniobraLimpiaKt } from "./escalera-de-velocidades";

const GRADO = Math.PI / 180;
const RUMBO = ejercicioPorId("rumbo")!;
const ASUNCION = SCENARIOS.find((s) => oaciDe(s) === "SGAS")!;
const RIO = rioDeNoche("SGAS")!;
const VARIACION = ASUNCION.magneticVariation;
const TIPICO = ASUNCION.vientoDominante!;
const VIENTO = vientoComoVector({ vientoDe: TIPICO.vientoDe, vientoKt: TIPICO.vientoKt } as never);
/** El día del encargo: el 18 de noviembre de 2026, a mediodía en Greenwich. */
const HOY = new Date(Date.UTC(2026, 10, 18, 12));
/** La avioneta a su crucero, m/s: unos cien nudos. */
const AVIONETA = 51;
/** Un reactor a doscientos cincuenta nudos, el tope por debajo de diez mil pies. */
const REACTOR = 129;
/**
 * **Lo que cuenta el juego** para el JAZ 40 y el JAZ 90: su crucero con el
 * tope de los diez mil pies, y como mucho la de maniobra limpia. Ver `velocidadDelRumbo`.
 */
const cuentaDe = (a: typeof PANAMBI): number =>
  Math.min(a.cruiseSpeed, TOPE_POR_DEBAJO_DE_DIEZ_MIL, maniobraLimpiaKt(a) * NUDO);
const CUENTA_DEL_BIMOTOR = cuentaDe(PANAMBI);
const CUENTA_DEL_REACTOR = cuentaDe(ARAI);

/**
 * **El piloto de cinemática**: cada décima de segundo, el morro hacia donde
 * diga `morro` (rad verdaderos, girando como mucho tres grados por segundo),
 * el avión a la verdadera por el morro más el viento, y el sol el del cielo a
 * la hora que lleva el ejercicio. Con luz, persigue el cauce por delante,
 * como quien sigue el río mirándolo.
 */
function volar(
  morro: (p: { x: number; z: number; t: number; deNoche: number | null; pedido: number | null }) => number | null,
  o: {
    velocidad?: number;
    /** **La que vuela de verdad**, m/s, si no es la de la cuenta: la que sostiene el avión, o quien lo lleva. */
    vuela?: number;
    fecha?: Date;
    viento?: { x: number; z: number };
  } = {},
): {
  sucesos: SucesoDelRumbo[];
  ej: RumboDeNoche;
  dondeAnochecio: { x: number; z: number } | null;
  masCerca: number;
} {
  const cuenta = o.velocidad ?? AVIONETA;
  const velocidad = o.vuela ?? cuenta;
  const viento = o.viento ?? VIENTO;
  const fecha = o.fecha ?? HOY;
  const ej = new RumboDeNoche(RUMBO, RIO, VARIACION);
  const c = colocacionDelRumbo({ rio: RIO, velocidad: cuenta, fecha, viento });
  ej.colocar(c);
  let x = c.x;
  let z = c.z;
  let rumbo = c.rumbo;
  const sucesos: SucesoDelRumbo[] = [];
  let dondeAnochecio: { x: number; z: number } | null = null;
  let deNoche: number | null = null;
  let masCerca = Infinity;
  const g = ej.destino;
  const dt = 0.1;
  for (let t = 0; t < 900 && ej.fase !== "cerrada"; t += dt) {
    /*
     * Con luz, el río **mirando por delante**: el punto del cauce a ocho
     * segundos de vuelo de donde se va. Perseguir cada punto a doscientos
     * metros era la avioneta; uno rápido, que vira más ancho, se pasaba la
     * curva del puente y volvía a buscarlo.
     */
    const p = puntoDelCauce(avanceSobreElCauce(RIO.cauce, x, z) + Math.max(400, 8 * velocidad));
    const alRio = Math.atan2(p.x - x, -(p.z - z));
    const quiero = morro({ x, z, t, deNoche, pedido: ej.rumboPedido }) ?? alRio;
    const giro = Math.max(-3 * GRADO * dt, Math.min(3 * GRADO * dt, Math.atan2(Math.sin(quiero - rumbo), Math.cos(quiero - rumbo))));
    rumbo += giro;
    x += (velocidad * Math.sin(rumbo) + viento.x) * dt;
    z += (-velocidad * Math.cos(rumbo) + viento.z) * dt;
    const sol = alturaDelSol(fecha, ej.hora!, RIO.lat, RIO.lon);
    const antes = ej.fase;
    for (const s of ej.paso({ x, z, rumbo: rumbo / GRADO, sol, enElSuelo: false, parado: false, percance: false }, dt))
      sucesos.push(s);
    if (antes === "rio" && ej.fase === "rumbo") {
      dondeAnochecio = { x, z };
      deNoche = t;
    }
    if (ej.fase === "rumbo") masCerca = Math.min(masCerca, Math.hypot(g.x - x, g.z - z));
  }
  return { sucesos, ej, dondeAnochecio, masCerca };
}

/** El punto del cauce a `s` metros de su principio, por él; pasado el final, el final. */
function puntoDelCauce(s: number): { x: number; z: number } {
  let resta = s;
  for (let i = 1; i < RIO.cauce.length; i++) {
    const a = RIO.cauce[i - 1]!;
    const b = RIO.cauce[i]!;
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    if (resta <= l) return { x: a.x + ((b.x - a.x) * resta) / l, z: a.z + ((b.z - a.z) * resta) / l };
    resta -= l;
  }
  return RIO.cauce[RIO.cauce.length - 1]!;
}

/** El morro en el rumbo pedido, de noche; con luz, el río. */
const enLaMarca = (p: { pedido: number | null }): number | null =>
  p.pedido === null ? null : (p.pedido - VARIACION) * GRADO;

const PUENTE = RIO.cauce[RIO.anochece]!;

describe("Rumbo de noche: dónde se ofrece", () => {
  it("en Asunción, desde Tukã y en todo avión; ni en Guyrami, ni en un campo sin río medido", () => {
    for (const peldano of ["tuka", "taguato", "taguato-ruvicha"] as const) {
      expect(ejerciciosPara(peldano, ARAI, "SGAS").map((e) => e.id)).toContain("rumbo");
      expect(ejerciciosPara(peldano, PYKASU, "SGAS").map((e) => e.id)).toContain("rumbo");
    }
    expect(ejerciciosPara("guyrami", ARAI, "SGAS").map((e) => e.id)).not.toContain("rumbo");
    expect(ejerciciosPara("taguato", ARAI, "GCXO").map((e) => e.id)).not.toContain("rumbo");
    expect(RUMBO.acabaEnElAire).toBe(true);
    expect(RUMBO.escena).toBe("navegacion");
  });

  it("el tramo del rumbo es una recta: ningún punto del cauce se aparta de ella más de ciento veinte metros", () => {
    const a = PUENTE;
    const b = RIO.cauce[RIO.cauce.length - 1]!;
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    for (const p of RIO.cauce.slice(RIO.anochece + 1, -1)) {
      const cruz = ((p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x)) / l;
      // El cauce tiene ochocientos de ancho: con ciento veinte, la recta va siempre encima del agua.
      expect(Math.abs(cruz)).toBeLessThan(120);
    }
    // Siete kilómetros y medio: un par de minutos largos con la avioneta.
    expect(l).toBeGreaterThan(7000);
  });
});

describe("Rumbo de noche: el sol, el de verdad y apurado", () => {
  it("en Asunción, el 18 de noviembre, se pone al oesuroeste y del ocaso a la noche pasan veinticinco minutos largos", () => {
    const ocaso = horaConElSolA(0, HOY, RIO.lat, RIO.lon);
    const noche = horaConElSolA(NOCHE, HOY, RIO.lat, RIO.lon);
    const minutos = (noche - ocaso) * 60;
    expect(minutos).toBeGreaterThan(24);
    expect(minutos).toBeLessThan(30);
    const v = solALaHora(HOY, ocaso, RIO.lat, RIO.lon);
    const acimut = ((Math.atan2(v[0], -v[2]) / GRADO) + 360) % 360;
    expect(acimut).toBeGreaterThan(240);
    expect(acimut).toBeLessThan(260);
    // Un quinto de grado por minuto; a `PRISA`, dos.
    expect(bajadaDelSol(HOY, noche, RIO.lat, RIO.lon) * 60).toBeCloseTo(0.22, 1);
    expect(PRISA).toBe(10);
  });

  it("se sale con el sol recién puesto, a la hora solar de verdad en que está a esa altura hoy", () => {
    const c = colocacionDelRumbo({ rio: RIO, velocidad: AVIONETA, fecha: HOY, viento: VIENTO });
    expect(c.solDeSalida).toBeLessThan(0);
    expect(c.solDeSalida).toBeGreaterThan(NOCHE);
    expect(alturaDelSol(HOY, c.hora, RIO.lat, RIO.lon)).toBeCloseTo(c.solDeSalida, 6);
    // Por la tarde, como un ocaso: entre las seis y las ocho de sol.
    expect(c.hora).toBeGreaterThan(18);
    expect(c.hora).toBeLessThan(20);
    // Encima del cauce y por él, a mil quinientos pies.
    expect(c.x).toBe(RIO.cauce[0]!.x);
    expect(Math.abs(centrado(c.rumbo / GRADO - 157))).toBeLessThan(2);
    expect(c.alto).toBeCloseTo(457.2, 1);
  });
});

describe("Rumbo de noche: volado", () => {
  it("siguiendo el río, la noche cae en el puente; con la flecha en la marca, se llega encima de donde sigue", () => {
    const { sucesos, ej, dondeAnochecio } = volar(enLaMarca);
    expect(sucesos[0]).toEqual({ que: "presentar" });
    // A menos de cuatrocientos metros del puente: la noche cae donde el río tuerce.
    expect(Math.hypot(dondeAnochecio!.x - PUENTE.x, dondeAnochecio!.z - PUENTE.z)).toBeLessThan(400);
    const anochece = sucesos.find((s) => s.que === "anochece");
    // El rumbo del puente al final, 215 verdaderos, en lo que marca la rosa de Asunción, de cinco en cinco.
    expect(anochece).toEqual({ que: "anochece", rumbo: 225 });
    expect(ej.solCuandoAnochecio!).toBeLessThanOrEqual(NOCHE);
    expect(ej.solCuandoAnochecio!).toBeGreaterThan(NOCHE - 0.1);
    expect(sucesos.some((s) => s.que === "seVa")).toBe(false);
    expect(sucesos.some((s) => s.que === "enLaMarca")).toBe(true);
    const llego = sucesos.find((s) => s.que === "llegaste");
    expect(llego).toMatchObject({ que: "llegaste", como: "encima" });
    expect(ej.desvioMedio!).toBeLessThan(1.5);
    expect(ej.cierre).toBe("hecho");
    // Y al llegar ya es de noche para el suelo: el sol, entre el ocaso civil y el náutico.
    const sol = alturaDelSol(HOY, ej.hora!, RIO.lat, RIO.lon);
    expect(sol).toBeLessThan(NOCHE - 2);
    expect(sol).toBeGreaterThan(-12);
  });

  it("en un reactor la noche cae igual en el puente, saliendo con el sol más bajo", () => {
    const lento = colocacionDelRumbo({ rio: RIO, velocidad: AVIONETA, fecha: HOY, viento: VIENTO });
    const rapido = colocacionDelRumbo({ rio: RIO, velocidad: REACTOR, fecha: HOY, viento: VIENTO });
    expect(rapido.solDeSalida).toBeLessThan(lento.solDeSalida);
    const { dondeAnochecio, ej } = volar(enLaMarca, { velocidad: REACTOR });
    /*
     * Cerca, y no tanto como la avioneta: a doscientos cincuenta nudos un viraje
     * de tres grados por segundo tiene dos kilómetros y medio de radio, y las
     * curvas del río se cortan. Siete segundos de vuelo; el rumbo se pide desde
     * donde se esté, así que se llega igual.
     */
    expect(Math.hypot(dondeAnochecio!.x - PUENTE.x, dondeAnochecio!.z - PUENTE.z)).toBeLessThan(1000);
    expect(ej.llegada).toBe("encima");
  });

  /*
   * H26u: la ronda de cierre voló el JAZ 40 y el JAZ 90, y la noche cayó a
   * 944 y a 1622 m del puente. La hora de salida se contaba con la velocidad
   * de la cuenta, y cada avión vuela la que sostiene: ahora, con luz, el reloj
   * del cielo va con lo andado por el río.
   */
  for (const [nombre, cuenta, vuelas] of [
    ["el bimotor", CUENTA_DEL_BIMOTOR, [0.8, 1.2]],
    ["el reactor", CUENTA_DEL_REACTOR, [0.9, 1.1]],
    ["la avioneta", AVIONETA, [0.75, 1.25]],
  ] as const)
    it(`con ${nombre}, más despacio o más deprisa de lo que dice la cuenta, la noche cae en el puente y pide el rumbo del río`, () => {
      for (const f of vuelas) {
        const { dondeAnochecio, ej, sucesos } = volar(enLaMarca, { velocidad: cuenta, vuela: cuenta * f });
        const como = `${nombre} a ${(f * 100).toFixed(0)} % de la cuenta`;
        const lejos = Math.hypot(dondeAnochecio!.x - PUENTE.x, dondeAnochecio!.z - PUENTE.z);
        expect(lejos, como).toBeLessThan(500);
        expect(sucesos.find((s) => s.que === "anochece"), como).toEqual({ que: "anochece", rumbo: 225 });
        expect(ej.solCuandoAnochecio!, como).toBeLessThanOrEqual(NOCHE);
        expect(ej.solCuandoAnochecio!, como).toBeGreaterThan(NOCHE - 0.1);
        expect(ej.llegada, como).toBe("encima");
      }
    });

  it("lo andado por el río es lo del cauce hasta el punto más cerca, encima o a un lado", () => {
    expect(avanceSobreElCauce(RIO.cauce, RIO.cauce[0]!.x, RIO.cauce[0]!.z)).toBe(0);
    const conLuz = colocacionDelRumbo({ rio: RIO, velocidad: AVIONETA, fecha: HOY }).conLuz;
    expect(avanceSobreElCauce(RIO.cauce, PUENTE.x, PUENTE.z)).toBeCloseTo(conLuz, 6);
    // A trescientos metros del puente, de costado al río: lo andado es el puente.
    const a = RIO.cauce[RIO.anochece - 1]!;
    const l = Math.hypot(PUENTE.x - a.x, PUENTE.z - a.z);
    const lado = { x: PUENTE.x + ((PUENTE.z - a.z) / l) * 300, z: PUENTE.z - ((PUENTE.x - a.x) / l) * 300 };
    expect(Math.abs(avanceSobreElCauce(RIO.cauce, lado.x, lado.z) - conLuz)).toBeLessThan(150);
  });

  it("apartado del río la tarde no se queda quieta: la noche cae igual, con el reloj a la mitad de su prisa", () => {
    // Hacia el este todo el rato, lejos del cauce.
    const ej = new RumboDeNoche(RUMBO, RIO, VARIACION);
    const c = colocacionDelRumbo({ rio: RIO, velocidad: AVIONETA, fecha: HOY, viento: VIENTO });
    ej.colocar(c);
    let x = c.x;
    let t = 0;
    while (ej.fase === "rio" && t < 900) {
      x += AVIONETA * 0.1;
      ej.paso({ x, z: c.z, rumbo: 90, sol: alturaDelSol(HOY, ej.hora!, RIO.lat, RIO.lon), enElSuelo: false, parado: false, percance: false }, 0.1);
      t += 0.1;
    }
    expect(ej.fase).toBe("rumbo");
    const debia = ((c.noche - c.hora) * 3600) / PRISA_SIN_AVANZAR;
    expect(t).toBeGreaterThan(debia - 2);
    expect(t).toBeLessThan(debia + 2);
  });

  it("en junio también: el sol se pone más al norte y más tarde de reloj, y la noche cae en el puente", () => {
    const junio = new Date(Date.UTC(2027, 5, 20, 12));
    const { dondeAnochecio, ej } = volar(enLaMarca, { fecha: junio });
    expect(Math.hypot(dondeAnochecio!.x - PUENTE.x, dondeAnochecio!.z - PUENTE.z)).toBeLessThan(400);
    expect(ej.llegada).toBe("encima");
  });

  it("el viraje hasta la marca no es irse de ella: con el morro treinta grados fuera al pedirlo, ni aviso ni desvío", () => {
    // Lo del primer vuelo del banco: el 225 pedido con el morro todavía en el río, en el 243 y virando.
    const { sucesos, ej } = volar((p) => {
      if (p.pedido === null || p.deNoche === null) return null;
      return (p.pedido - VARIACION + (p.t - p.deNoche < 2 ? 30 : 0)) * GRADO;
    });
    expect(sucesos.some((s) => s.que === "seVa")).toBe(false);
    expect(ej.desvioMedio!).toBeLessThan(1.5);
    expect(ej.desvioMasGrande).toBeLessThan(EN_LA_MARCA + 0.5);
    expect(ej.llegada).toBe("encima");
  });

  it("si el morro se va de la marca, se dice una vez, hacia qué lado, y se llega igual al volver", () => {
    const { sucesos, ej } = volar((p) => {
      if (p.pedido === null || p.deNoche === null) return null;
      // A los treinta segundos de noche, quince grados a la derecha durante doce; después, a la marca.
      const fuera = p.t - p.deNoche > 30 && p.t - p.deNoche < 42 ? 15 : 0;
      return (p.pedido - VARIACION + fuera) * GRADO;
    });
    const seVa = sucesos.filter((s) => s.que === "seVa");
    expect(seVa).toEqual([{ que: "seVa", lado: 1 }]);
    expect(ej.llegada).toBe("encima");
    expect(ej.desvioMasGrande).toBeGreaterThan(14);
  });

  it("y vuelve a decirlo solo cuando el morro ha vuelto a la marca, no porque pase el rato", () => {
    const { sucesos } = volar((p) => {
      if (p.pedido === null || p.deNoche === null) return null;
      const t = p.t - p.deNoche;
      // Fuera de veinte a sesenta segundos: un rato largo, y nada más que un aviso.
      const fuera = t > 20 && t < 60 ? -15 : t > 80 && t < 95 ? -15 : 0;
      return (p.pedido - VARIACION + fuera) * GRADO;
    });
    // Dos idas, a la izquierda, separadas por una vuelta a la marca: dos avisos.
    expect(sucesos.filter((s) => s.que === "seVa")).toEqual([
      { que: "seVa", lado: -1 },
      { que: "seVa", lado: -1 },
    ]);
  });

  it("con el morro apartado doce grados todo el rato, se pasa al lado lo que dice el seno, y se cuenta", () => {
    const { sucesos, ej, dondeAnochecio } = volar((p) => (p.pedido === null ? null : (p.pedido - VARIACION + 12) * GRADO));
    const llego = sucesos.find((s) => s.que === "llegaste");
    expect(llego).toMatchObject({ que: "llegaste", como: "alLado" });
    const g = ej.destino;
    const l = Math.hypot(g.x - dondeAnochecio!.x, g.z - dondeAnochecio!.z);
    /*
     * Lo que se aparta una recta doce grados torcida en ese largo, con el
     * viento y el giro dentro: los ocho nudos del 020, con el morro en el 227,
     * la empujan de vuelta hacia la recta un par de grados.
     */
    expect(ej.apartado!).toBeGreaterThan(l * Math.sin(9 * GRADO));
    expect(ej.apartado!).toBeLessThan(l * Math.sin(15 * GRADO));
    expect(ej.apartado!).toBeGreaterThan(LLEGADA);
    expect(ej.cierre).toBe("hecho");
    expect(ej.desvioMedio!).toBeGreaterThan(EN_LA_MARCA);
  });

  it("un percance o posarse lo cierra para otra vez", () => {
    const ej = new RumboDeNoche(RUMBO, RIO, VARIACION);
    ej.colocar(colocacionDelRumbo({ rio: RIO, velocidad: AVIONETA, fecha: HOY }));
    const s = ej.paso({ x: 0, z: 0, rumbo: 0, sol: -3, enElSuelo: false, parado: false, percance: true }, 0.1);
    expect(s.map((x) => x.que)).toEqual(["presentar", "cerrar"]);
    expect(ej.cierre).toBe("otraVez");
    ej.reiniciar();
    expect(ej.fase).toBe("rio");
    expect(ej.hora).toBeCloseTo(ej.colocacion!.hora, 9);
  });
});
