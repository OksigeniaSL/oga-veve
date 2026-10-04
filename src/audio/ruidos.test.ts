/**
 * Los ruidos del vuelo, comprobados: **qué suena, cuánto, según la vista, el
 * avión y el momento**.
 *
 * No se oye nada aquí —eso lo mide `scripts/verificar-sonidos.mjs` en un
 * navegador—, pero lo que se decide se puede comprobar entero: que en el
 * pasaje la lluvia apenas se oiga en vuelo, que el tren fijo no suene a tren,
 * que el granizo pegue más que la lluvia, que la APU no se encienda sola en el
 * punto de espera.
 */

import { describe, expect, it } from "vitest";
import {
  LIMPIAS_HASTA,
  NADA_PASA,
  OidoDelVuelo,
  avionQueSuena,
  curvaDelViento,
  fuerzaDelCinturon,
  oidoDe,
  tonoDelGolpe,
  type LoQuePasa,
  type Niveles,
  type Oido,
  type Suceso,
} from "./ruidos";
import { AIRCRAFT, ARAI, ARASUNU, MAINUMBY, PANAMBI, PYKASU, YVAGA } from "../flight/aircraft";
import { FIRMES } from "../world/firme";

const EN_VUELO: LoQuePasa = {
  ...NADA_PASA,
  ias: 70,
  gs: 70,
  enElSuelo: false,
  motor: true,
  gas: 0.7,
  tren: 0,
};

const AGUACERO = { clase: "lluvia" as const, fuerza: 1, aqui: 1 };

/** Un paso suelto, con un oído recién hecho. */
function uno(avion = ARAI, p: Partial<LoQuePasa> = {}): Niveles {
  return new OidoDelVuelo(avionQueSuena(avion)).paso(1 / 60, { ...EN_VUELO, ...p }).niveles;
}

/** Varios pasos seguidos con el mismo oído, y lo que sonó en ellos. */
function seguidos(
  avion: typeof ARAI,
  pasos: Partial<LoQuePasa>[],
  base: LoQuePasa = EN_VUELO,
): { niveles: Niveles[]; sucesos: Suceso[] } {
  const o = new OidoDelVuelo(avionQueSuena(avion));
  const niveles: Niveles[] = [];
  const sucesos: Suceso[] = [];
  for (const p of pasos) {
    const r = o.paso(1 / 60, { ...base, ...p });
    niveles.push(r.niveles);
    sucesos.push(...r.sucesos);
  }
  return { niveles, sucesos };
}

describe("desde dónde se escucha", () => {
  it("la cabina es cabina, las ventanillas son pasaje y lo demás es fuera", () => {
    expect(oidoDe("cockpit")).toBe("cabina");
    expect(oidoDe("pasaje-izquierda")).toBe("pasaje");
    expect(oidoDe("pasaje-derecha")).toBe("pasaje");
    expect(oidoDe("pasaje-ala-izquierda")).toBe("pasaje");
    expect(oidoDe("pasaje-ala-derecha")).toBe("pasaje");
    for (const v of ["chase", "wing", "izquierda", "morro"] as const)
      expect(oidoDe(v)).toBe("fuera");
  });

  it("la de pájaro va por fuera: es la cabina sin avión", () => {
    expect(oidoDe("pajaro")).toBe("fuera");
  });

  it("dentro, la pared se come los agudos, y más cuanto más aísla el avión", () => {
    const fuera = uno(YVAGA, { oido: "fuera" }).pared;
    const cabinaGrande = uno(YVAGA, { oido: "cabina" }).pared;
    const pasajeGrande = uno(YVAGA, { oido: "pasaje" }).pared;
    const cabinaPequena = uno(PYKASU, { oido: "cabina" }).pared;
    expect(cabinaGrande).toBeLessThan(fuera);
    expect(pasajeGrande).toBeLessThan(cabinaGrande);
    expect(cabinaPequena).toBeGreaterThan(cabinaGrande);
  });
});

describe("la lluvia, según dónde se esté", () => {
  it("desde fuera suena la de siempre: siseo y cuerpo, y nada de gotas", () => {
    const n = uno(ARAI, { oido: "fuera", lluvia: AGUACERO }).lluvia;
    // La cuenta de antes: cuánta × (0,35 + 0,65 × v/60) × 0,5, a tope a 70.
    expect(n.siseo).toBeCloseTo(0.5, 5);
    expect(n.cuerpo).toBeCloseTo(0.65, 5);
    expect(n.gotas).toBe(0);
  });

  it("en la cabina de mando, a velocidad, es un tamborileo fuerte y continuo", () => {
    const n = uno(ARAI, { oido: "cabina", lluvia: AGUACERO }).lluvia;
    expect(n.gotas).toBeCloseTo(1, 5);
    expect(n.ritmo).toBeGreaterThan(300);
    expect(n.tambor).toBeGreaterThan(0.7);
  });

  it("y crece con la velocidad: parado contra el cristal no pega igual", () => {
    const lento = uno(ARAI, { oido: "cabina", lluvia: AGUACERO, ias: 10, gs: 10, enElSuelo: true });
    const rapido = uno(ARAI, { oido: "cabina", lluvia: AGUACERO, ias: 70 });
    expect(rapido.lluvia.gotas).toBeGreaterThan(lento.lluvia.gotas * 2);
    expect(rapido.lluvia.ritmo).toBeGreaterThan(lento.lluvia.ritmo * 2);
  });

  it("en el pasaje, en vuelo, apenas se oye: mucho menos que en la cabina", () => {
    const cabina = uno(ARAI, { oido: "cabina", lluvia: AGUACERO }).lluvia;
    const pasaje = uno(ARAI, { oido: "pasaje", lluvia: AGUACERO }).lluvia;
    expect(pasaje.gotas).toBeLessThan(cabina.gotas / 5);
    expect(pasaje.siseo).toBeLessThan(cabina.siseo);
    // Algún golpeteo, no un tamborileo.
    expect(pasaje.ritmo).toBeLessThan(15);
  });

  it("y en tierra y despacio el pasaje la oye más clara que volando", () => {
    const volando = uno(ARAI, { oido: "pasaje", lluvia: AGUACERO }).lluvia;
    const parado = uno(ARAI, {
      oido: "pasaje",
      lluvia: AGUACERO,
      ias: 0,
      gs: 0,
      enElSuelo: true,
    }).lluvia;
    expect(parado.gotas).toBeGreaterThan(volando.gotas * 3);
    expect(parado.siseo).toBeGreaterThan(volando.siseo * 3);
  });

  it("encima de las nubes no llueve, y no suena", () => {
    for (const oido of ["fuera", "cabina", "pasaje"] as Oido[]) {
      const n = uno(ARAI, { oido, lluvia: { ...AGUACERO, aqui: 0 } }).lluvia;
      expect(n.siseo + n.gotas).toBe(0);
    }
  });
});

describe("los limpias", () => {
  const conAgua = { oido: "cabina" as Oido, lluvia: AGUACERO, ias: 60 };

  it("van en los aviones que los llevan, con agua y desde la cabina", () => {
    for (const a of [ARASUNU, ARAI, YVAGA]) expect(uno(a, conAgua).limpias.nivel).toBe(1);
  });

  it("las avionetas no los llevan, y no suenan", () => {
    for (const a of [PYKASU, MAINUMBY, PANAMBI]) expect(uno(a, conAgua).limpias.nivel).toBe(0);
  });

  it("sin lluvia no se ponen, ni con el motor parado, ni pasada su velocidad", () => {
    expect(uno(ARAI, { ...conAgua, lluvia: NADA_PASA.lluvia }).limpias.nivel).toBe(0);
    expect(uno(ARAI, { ...conAgua, motor: false }).limpias.nivel).toBe(0);
    expect(uno(ARAI, { ...conAgua, ias: LIMPIAS_HASTA + 5 }).limpias.nivel).toBe(0);
  });

  it("y no llegan al pasaje ni a fuera: el motor está bajo el parabrisas", () => {
    expect(uno(ARAI, { ...conAgua, oido: "pasaje" }).limpias.nivel).toBe(0);
    expect(uno(ARAI, { ...conAgua, oido: "fuera" }).limpias.nivel).toBe(0);
  });

  it("con mucha agua van más deprisa que con llovizna", () => {
    const fuerte = uno(ARAI, conAgua).limpias.barridas;
    const llovizna = uno(ARAI, { ...conAgua, lluvia: { clase: "llovizna", fuerza: 0.7, aqui: 1 } })
      .limpias.barridas;
    expect(fuerte).toBeGreaterThan(llovizna);
  });
});

describe("el granizo", () => {
  it("sin granizo, nada", () => {
    expect(uno(ARAI, { oido: "cabina", lluvia: AGUACERO }).granizo.nivel).toBe(0);
  });

  it("pega más que la lluvia más fuerte, y en todas las vistas", () => {
    for (const oido of ["fuera", "cabina", "pasaje"] as Oido[]) {
      const n = uno(ARAI, { oido, lluvia: AGUACERO, granizo: 1 });
      const lluviaQueSeOye = Math.max(n.lluvia.gotas, n.lluvia.siseo);
      expect(n.granizo.nivel).toBeGreaterThan(lluviaQueSeOye);
    }
  });

  it("donde más se oye es en la cabina, contra el parabrisas", () => {
    const en = (oido: Oido): number => uno(ARAI, { oido, granizo: 1 }).granizo.nivel;
    expect(en("cabina")).toBeGreaterThan(en("pasaje"));
    expect(en("pasaje")).toBeGreaterThan(en("fuera"));
  });

  it("y a su fuerza, sin pasarse: uno y medio a tope, no más", () => {
    expect(uno(ARAI, { oido: "cabina", granizo: 1 }).granizo.nivel).toBeLessThanOrEqual(1.5);
    expect(uno(ARAI, { oido: "cabina", granizo: 0.3 }).granizo.nivel).toBeLessThan(0.6);
  });
});

describe("la rodadura y sus juntas", () => {
  const rodando = (firme = FIRMES.losas.cuidado, gs = 10, oido: Oido = "cabina") =>
    uno(ARAI, { oido, enElSuelo: true, ias: gs, gs, firme }).rodadura;

  it("sobre losas suenan los golpes del eje, a su compás: quince metros entre la velocidad", () => {
    const r = rodando(FIRMES.losas.cuidado, 10);
    expect(r.juntas).toBeGreaterThan(0);
    expect(r.cada).toBeCloseTo(1.5, 5);
    expect(rodando(FIRMES.losas.cuidado, 20).cada).toBeCloseTo(0.75, 5);
  });

  /*
   * «Eso cuando se nota es en carrera; en rodadura podrá notarse, pero mucho
   * más espaciado.» Rodando a 22 kt, menos de un golpe por segundo y flojo; en
   * la carrera, a 140 kt, varios por segundo y enteros.
   */
  it("rodando, espaciados y flojos; en la carrera, seguidos y enteros", () => {
    const rodaje = rodando(FIRMES.losas.cuidado, 11.3);
    const carrera = rodando(FIRMES.losas.cuidado, 72);
    expect(1 / rodaje.cada).toBeLessThan(1);
    expect(1 / carrera.cada).toBeGreaterThan(4);
    expect(rodaje.juntas).toBeLessThan(carrera.juntas * 0.25);
  });

  it("y el tren principal pisa la misma junta una batalla después", () => {
    const r = rodando(FIRMES.losas.cuidado, 10);
    expect(r.retardo).toBeCloseTo(ARAI.batalla / 10, 5);
  });

  it("sobre asfalto no hay juntas", () => {
    expect(rodando(FIRMES.asfalto.cuidado).juntas).toBe(0);
    expect(rodando(FIRMES.asfalto.gastado).juntas).toBe(0);
  });

  it("y lo gastado suena más que lo cuidado", () => {
    expect(rodando(FIRMES.losas.gastado).juntas).toBeGreaterThan(rodando(FIRMES.losas.cuidado).juntas);
    expect(rodando(FIRMES.asfalto.gastado).baches).toBeGreaterThan(rodando(FIRMES.asfalto.cuidado).baches * 5);
  });

  it("la hierba y el campo dan golpes sueltos y muchos", () => {
    const hierba = rodando(FIRMES.hierba.cuidado);
    const campo = rodando(FIRMES.campo.cuidado);
    expect(hierba.baches).toBeGreaterThan(0.5);
    expect(campo.baches).toBeGreaterThan(hierba.baches);
    expect(campo.cadaBache).toBeLessThan(0.2);
  });

  it("desde la cabina se oye más el morro, y desde el pasaje las principales", () => {
    const cabina = rodando(FIRMES.losas.cuidado, 10, "cabina");
    const pasaje = rodando(FIRMES.losas.cuidado, 10, "pasaje");
    expect(cabina.morro).toBeGreaterThan(cabina.principal);
    expect(pasaje.principal).toBeGreaterThan(pasaje.morro);
  });

  it("en el aire no se rueda", () => {
    const r = uno(ARAI, { firme: FIRMES.losas.gastado }).rodadura;
    expect(r.rumor + r.juntas + r.baches).toBe(0);
  });

  it("parado con viento de cara la rueda no gira, y no suena", () => {
    const r = uno(ARAI, { enElSuelo: true, ias: 15, gs: 0, firme: FIRMES.losas.gastado }).rodadura;
    expect(r.rumor + r.juntas + r.baches).toBe(0);
  });

  it("y la rueda grande golpea más grave que la pequeña", () => {
    expect(tonoDelGolpe(YVAGA.mass)).toBeLessThan(tonoDelGolpe(ARAI.mass));
    expect(tonoDelGolpe(ARAI.mass)).toBeLessThan(tonoDelGolpe(PYKASU.mass));
  });
});

describe("el tren", () => {
  // De dos en dos décimas: lo que se mueve un tren en un par de segundos.
  const bajando = [0, 0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 1, 1].map((tren) => ({ tren }));

  it("el que se mete suena al soltarse y al trabarse abajo", () => {
    const { sucesos } = seguidos(PANAMBI, bajando);
    const como = sucesos.filter((s) => s.que === "tren").map((s) => (s as { como: string }).como);
    expect(como).toEqual(["suelta", "fuera"]);
  });

  it("y al subir, al soltarse y al quedarse dentro", () => {
    const { sucesos } = seguidos(
      PANAMBI,
      [1, 0.9, 0.7, 0.5, 0.3, 0.1, 0, 0].map((tren) => ({ tren })),
    );
    const como = sucesos.filter((s) => s.que === "tren").map((s) => (s as { como: string }).como);
    expect(como).toEqual(["suelta", "dentro"]);
  });

  it("el golpe de abajo es el más fuerte", () => {
    const { sucesos } = seguidos(PANAMBI, bajando);
    const [suelta, fuera] = sucesos as { fuerza: number }[];
    expect(fuera!.fuerza).toBeGreaterThan(suelta!.fuerza);
  });

  it("el tren fijo no suena a tren: ni golpes ni patas", () => {
    for (const a of [PYKASU, MAINUMBY]) {
      const { niveles, sucesos } = seguidos(a, bajando);
      expect(sucesos).toEqual([]);
      expect(niveles.every((n) => n.tren.patas === 0 && n.tren.motor === 0)).toBe(true);
    }
  });

  it("recolocar el avión no es bajar el tren", () => {
    const { sucesos } = seguidos(ARAI, [{ tren: 0 }, { tren: 1 }]);
    expect(sucesos).toEqual([]);
  });

  it("mientras se mueve suena su motor, y quieto no", () => {
    const { niveles } = seguidos(ARAI, bajando);
    expect(niveles[4]!.tren.motor).toBeGreaterThan(0);
    expect(niveles[8]!.tren.motor).toBe(0);
  });

  it("las patas fuera hacen viento, más cuanto más deprisa", () => {
    const lento = uno(ARAI, { tren: 1, ias: 60 }).tren.patas;
    const rapido = uno(ARAI, { tren: 1, ias: 90 }).tren.patas;
    expect(lento).toBeGreaterThan(0);
    expect(rapido).toBeGreaterThan(lento);
    expect(uno(ARAI, { tren: 0, ias: 90 }).tren.patas).toBe(0);
  });

  it("hay trenes ruidosos y trenes discretos: el turbohélice más que el cuatrimotor", () => {
    const golpe = (a: typeof ARAI): number =>
      (seguidos(a, bajando, { ...EN_VUELO, oido: "pasaje" }).sucesos.at(-1) as { fuerza: number })
        .fuerza;
    expect(golpe(ARASUNU)).toBeGreaterThan(golpe(YVAGA));
  });
});

describe("el chirrido al tocar", () => {
  const tocar = (oido: Oido = "fuera", gs = 65, vs = -1.5) =>
    seguidos(ARAI, [
      { oido, tren: 1, ias: gs, gs, vs },
      { oido, tren: 1, ias: gs, gs, vs: 0, enElSuelo: true },
    ]).sucesos.find((s) => s.que === "toque") as
      | { chirrido: number; golpe: number; tono: number }
      | undefined;

  it("chirría al tocar, y más cuanto más deprisa", () => {
    expect(tocar("fuera", 65)!.chirrido).toBeGreaterThan(tocar("fuera", 30)!.chirrido);
  });

  it("y se oye más desde fuera que desde la cabina", () => {
    expect(tocar("fuera")!.chirrido).toBeGreaterThan(tocar("cabina")!.chirrido);
    expect(tocar("pasaje")!.chirrido).toBeGreaterThan(tocar("cabina")!.chirrido);
  });

  it("un toque duro da golpe, y el pasaje es quien más lo oye", () => {
    expect(tocar("pasaje", 65, -3)!.golpe).toBeGreaterThan(tocar("pasaje", 65, -0.5)!.golpe);
    expect(tocar("pasaje", 65, -3)!.golpe).toBeGreaterThan(tocar("fuera", 65, -3)!.golpe);
  });

  it("un rebote chirría menos que el primer toque: las ruedas ya giran", () => {
    const { sucesos } = seguidos(ARAI, [
      { tren: 1, ias: 65, gs: 65, vs: -1.5 },
      { tren: 1, ias: 65, gs: 65, vs: 0, enElSuelo: true },
      { tren: 1, ias: 64, gs: 64, vs: 0.5 },
      { tren: 1, ias: 64, gs: 64, vs: -1, enElSuelo: false },
      { tren: 1, ias: 63, gs: 63, vs: 0, enElSuelo: true },
    ]);
    const toques = sucesos.filter((s) => s.que === "toque") as { chirrido: number }[];
    expect(toques.length).toBe(2);
    expect(toques[1]!.chirrido).toBeLessThan(toques[0]!.chirrido * 0.1);
  });

  it("aparecer en el suelo, parado, no chirría", () => {
    const { sucesos } = seguidos(ARAI, [
      { tren: 1, ias: 0, gs: 0 },
      { tren: 1, ias: 0, gs: 0, enElSuelo: true },
    ]);
    expect(sucesos).toEqual([]);
  });

  it("y la rueda grande chirría más grave", () => {
    const tono = (a: typeof ARAI): number =>
      (
        seguidos(a, [
          { tren: 1, ias: 60, gs: 60, vs: -1 },
          { tren: 1, ias: 60, gs: 60, enElSuelo: true },
        ]).sucesos[0] as { tono: number }
      ).tono;
    expect(tono(YVAGA)).toBeLessThan(tono(PYKASU));
  });
});

describe("el viento crece con la velocidad", () => {
  it("hasta los setenta y cinco, como siempre", () => {
    expect(curvaDelViento(37.5)).toBeCloseTo(0.25, 5);
    expect(curvaDelViento(75)).toBeCloseTo(1, 5);
  });

  it("y por encima sigue subiendo: un reactor a trescientos nudos no suena como a ciento cincuenta", () => {
    expect(curvaDelViento(150)).toBeGreaterThan(curvaDelViento(110));
    expect(curvaDelViento(110)).toBeGreaterThan(curvaDelViento(76));
    // Sin salto en los setenta y cinco.
    expect(curvaDelViento(75.01) - curvaDelViento(74.99)).toBeLessThan(0.01);
  });

  it("desde dentro se oye menos que fuera, y silba menos", () => {
    const fuera = uno(ARAI, { oido: "fuera", ias: 120 }).viento;
    const cabina = uno(ARAI, { oido: "cabina", ias: 120 }).viento;
    const pasaje = uno(ARAI, { oido: "pasaje", ias: 120 }).viento;
    expect(cabina.nivel).toBeLessThan(fuera.nivel);
    expect(pasaje.nivel).toBeLessThan(cabina.nivel);
    expect(cabina.silbido).toBeLessThan(fuera.silbido);
  });
});

describe("la reversa y los aerofrenos", () => {
  const frenando: Partial<LoQuePasa> = { enElSuelo: true, ias: 60, gs: 60, reversa: 1, gas: 0 };

  it("la reversa ruge en el que la lleva, y sube las vueltas del motor", () => {
    const n = seguidos(ARAI, [{ ...frenando, reversa: 0 }, frenando]).niveles[1]!;
    expect(n.reversa).toBeGreaterThan(0);
    expect(n.gasDelMotor).toBeGreaterThan(0.5);
  });

  it("las avionetas no tienen reversa", () => {
    expect(uno(PYKASU, frenando).reversa).toBe(0);
    expect(uno(PANAMBI, frenando).gasDelMotor).toBe(0);
  });

  it("en el aire no hay reversa que valga", () => {
    expect(uno(ARAI, { ...frenando, enElSuelo: false }).reversa).toBe(0);
  });

  it("las compuertas golpean al abrirse en el reactor, y el turbohélice no tiene", () => {
    const golpe = (a: typeof ARAI) =>
      seguidos(a, [{ ...frenando, reversa: 0 }, frenando]).sucesos.filter((s) => s.que === "reversa");
    expect(golpe(ARAI).length).toBe(1);
    expect(golpe(ARASUNU).length).toBe(0);
  });

  it("los aerofrenos tiemblan con la velocidad, y solo en quien los lleva", () => {
    const lento = uno(ARAI, { aerofrenos: 1, ias: 60 }).aerofrenos;
    const rapido = uno(ARAI, { aerofrenos: 1, ias: 110 }).aerofrenos;
    expect(rapido).toBeGreaterThan(lento);
    expect(uno(ARASUNU, { aerofrenos: 1, ias: 110 }).aerofrenos).toBe(0);
    expect(uno(ARAI, { aerofrenos: 0, ias: 110 }).aerofrenos).toBe(0);
  });

  it("y se notan más en el pasaje, sobre el ala, que fuera", () => {
    expect(uno(ARAI, { aerofrenos: 1, oido: "pasaje" }).aerofrenos).toBeGreaterThan(
      uno(ARAI, { aerofrenos: 1, oido: "fuera" }).aerofrenos,
    );
  });
});

describe("los flaps", () => {
  it("zumban mientras se mueven, y quietos no", () => {
    const { niveles } = seguidos(PYKASU, [{ flaps: 0 }, { flaps: 0.01 }, { flaps: 0.02 }, { flaps: 0.02 }], {
      ...EN_VUELO,
      oido: "cabina",
    });
    expect(niveles[1]!.flaps.nivel).toBeGreaterThan(0);
    expect(niveles[3]!.flaps.nivel).toBe(0);
  });

  it("el biplano no tiene flaps, y no zumba", () => {
    const { niveles } = seguidos(MAINUMBY, [{ flaps: 0 }, { flaps: 0.01 }], { ...EN_VUELO, oido: "cabina" });
    expect(niveles[1]!.flaps.nivel).toBe(0);
  });

  it("el motor eléctrico zumba más agudo que la hidráulica", () => {
    expect(uno(PYKASU).flaps.tono).toBeGreaterThan(uno(YVAGA).flaps.tono);
  });

  it("en un avión de pasaje se oyen desde el pasaje, sobre el ala, más que desde la cabina", () => {
    const en = (oido: Oido) =>
      seguidos(ARAI, [{ flaps: 0 }, { flaps: 0.01 }], { ...EN_VUELO, oido }).niveles[1]!.flaps.nivel;
    expect(en("pasaje")).toBeGreaterThan(en("cabina"));
  });
});

describe("la APU y el aire de la cabina", () => {
  const EN_EL_PUESTO: LoQuePasa = { ...NADA_PASA, enElSuelo: true, motor: false };
  const paso = (o: OidoDelVuelo, p: Partial<LoQuePasa>, segundos = 1): Niveles => {
    let n!: Niveles;
    for (let i = 0; i < Math.round(segundos * 10); i++) n = o.paso(0.1, { ...EN_EL_PUESTO, ...p }).niveles;
    return n;
  };

  it("en el puesto con los motores parados, la APU de un reactor arranca", () => {
    const o = new OidoDelVuelo(avionQueSuena(ARAI));
    const n = paso(o, {}, 15);
    expect(n.apu.giro).toBeGreaterThan(0.95);
    expect(n.apu.nivel).toBeGreaterThan(0.9);
  });

  it("sigue mientras se arrancan los motores, y se apaga al rodar", () => {
    const o = new OidoDelVuelo(avionQueSuena(ARAI));
    paso(o, {}, 15);
    expect(paso(o, { motor: true }, 5).apu.giro).toBeGreaterThan(0.95);
    expect(paso(o, { motor: true, gs: 6 }, 30).apu.giro).toBeLessThan(0.05);
  });

  it("y no se enciende sola en el punto de espera", () => {
    const o = new OidoDelVuelo(avionQueSuena(ARAI));
    paso(o, {}, 15);
    paso(o, { motor: true, gs: 6 }, 30);
    expect(paso(o, { motor: true, gs: 0 }, 15).apu.giro).toBeLessThan(0.05);
  });

  it("al llegar y parar los motores vuelve", () => {
    const o = new OidoDelVuelo(avionQueSuena(ARAI));
    paso(o, { motor: true, gs: 6 }, 2);
    paso(o, { motor: true, enElSuelo: false, ias: 80, gs: 80 }, 5);
    paso(o, { motor: true, gs: 8 }, 5);
    expect(paso(o, { motor: false }, 15).apu.giro).toBeGreaterThan(0.95);
  });

  it("el turbohélice y las avionetas no llevan APU", () => {
    for (const a of [PYKASU, MAINUMBY, PANAMBI, ARASUNU]) {
      const o = new OidoDelVuelo(avionQueSuena(a));
      expect(paso(o, {}, 15).apu.nivel).toBe(0);
    }
  });

  it("la APU se oye sobre todo desde fuera, que está en la cola", () => {
    const en = (oido: Oido) => paso(new OidoDelVuelo(avionQueSuena(ARAI)), { oido }, 15).apu.nivel;
    expect(en("fuera")).toBeGreaterThan(en("pasaje"));
    expect(en("pasaje")).toBeGreaterThan(en("cabina"));
  });

  it("los packs soplan con la APU o con los motores, y se oyen en el pasaje", () => {
    const o = new OidoDelVuelo(avionQueSuena(ARAI));
    expect(paso(o, { oido: "pasaje" }, 15).aire).toBeGreaterThan(0);
    const pasaje = paso(new OidoDelVuelo(avionQueSuena(ARAI)), { oido: "pasaje", motor: true }, 1).aire;
    const fuera = paso(new OidoDelVuelo(avionQueSuena(ARAI)), { oido: "fuera", motor: true }, 1).aire;
    expect(pasaje).toBeGreaterThan(fuera);
  });

  it("el turbohélice ventila solo con los motores en marcha", () => {
    const o = new OidoDelVuelo(avionQueSuena(ARASUNU));
    expect(paso(o, { oido: "pasaje" }, 5).aire).toBe(0);
    expect(paso(o, { oido: "pasaje", motor: true }, 1).aire).toBeGreaterThan(0);
  });

  it("y la avioneta no tiene aire que suene", () => {
    const o = new OidoDelVuelo(avionQueSuena(PYKASU));
    expect(paso(o, { oido: "cabina", motor: true }, 1).aire).toBe(0);
  });
});

describe("el ding del cinturón", () => {
  it("suena a tope en el pasaje, que es donde está, y nunca se calla del todo", () => {
    expect(fuerzaDelCinturon("pasaje")).toBe(1);
    expect(fuerzaDelCinturon("cabina")).toBeLessThan(1);
    expect(fuerzaDelCinturon("fuera")).toBeLessThan(fuerzaDelCinturon("cabina"));
    expect(fuerzaDelCinturon("fuera")).toBeGreaterThan(0);
  });
});

describe("la ficha de cada avión dice lo mismo que el avión", () => {
  it("el tren suena si y solo si se mete", () => {
    for (const a of AIRCRAFT) expect(a.sound.ruidos.tren > 0).toBe(a.trenRetractil);
  });

  it("los flaps zumban si y solo si los lleva", () => {
    for (const a of AIRCRAFT) expect(a.sound.ruidos.flaps !== null).toBe(a.llevaFlaps);
  });

  it("APU solo los reactores, y limpias y aire solo los de transporte", () => {
    for (const a of AIRCRAFT) {
      if (a.sound.ruidos.apu) expect(a.sound.engine).toBe("turbofan");
      if (a.sound.ruidos.limpias || a.sound.ruidos.aire !== "nada")
        expect(a.mass).toBeGreaterThanOrEqual(5000);
    }
  });

  it("el aislamiento crece con el avión, y el que menos aísla es el fumigador", () => {
    // El fumigador no es el más ligero, pero es chapa y tirantes: va aparte.
    const resto = [...AIRCRAFT]
      .filter((a) => a !== MAINUMBY)
      .sort((x, y) => x.mass - y.mass)
      .map((a) => a.sound.ruidos.aislamiento);
    expect([...resto].sort((x, y) => x - y)).toEqual(resto);
    expect(Math.min(...resto)).toBeGreaterThan(MAINUMBY.sound.ruidos.aislamiento);
  });
});
