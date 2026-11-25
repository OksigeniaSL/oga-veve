/**
 * **La verde con uno en la base, y el que se va al aire con otro despegando**
 * (H94). Ver `estorbanTuSalida`, `alAirePorElLado` y `seEchariaEncima` en
 * `trafico.ts`.
 *
 * En la mesa de H93, en 54 de 600 vuelos desde Los Rodeos alguien del tráfico
 * que no daba vueltas pasaba a menos de trescientos metros y ciento cincuenta
 * de altura de quien juega, casi siempre en su subida y a diez metros en
 * planta: la torre daba la verde con uno en la base que no había cantado
 * final, llegaba a la decisión con el avión en la pista, se iba al aire y subía
 * por su misma línea. Y detrás de una avioneta salía un reactor que la
 * alcanzaba antes de su giro.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { Frecuencia } from "../flight/radio";
import {
  LO_QUE_SE_ESPERA_POR_QUIEN_LLEGA,
  TurnoDePista,
  type DibujoDelTurno,
} from "../flight/turno-de-pista";
import { sinTorre, type Aerodrome } from "./aerodrome";
import { porDondeSigues, verticesDelCircuito, type Mano, type Pista, type PuntoDeCircuito } from "./circuito";
import { elCampo, volar, type ComoSeVuela, type Medida } from "./mesa-del-circuito-de-prueba";
import { SCENARIOS } from "./scenarios";
import { sueloDelTrafico } from "./suelo-del-trafico";
import {
  crearTrafico,
  tiposDelCampo,
  type QuienJuega,
  type Sitio,
  type Trafico,
  type TuSalida,
} from "./trafico";

const PISTA: Pista = { x: 0, z: 0, heading: 90, length: 2400 };
const COTA = 100;
const PASO = 0.5;
const EC = "EC-LLE";

const SALE: TuSalida = { enElAire: 50, conLaPista: false, carrera: 400, velocidad: 41, sube: 4.5 };
const EN_TIERRA: QuienJuega = { alUmbral: null, enLaPista: false };

/** Uno que llega por el circuito de una pista inventada, y quien juega. */
function conUnoQueLlega(mano: Mano = "izquierda") {
  let tu: QuienJuega = EN_TIERRA;
  const trafico = crearTrafico(PISTA, COTA, "ala-alta", mano, 1, undefined, {
    quienJuega: () => tu,
  });
  trafico.anuncia(EC, "otro.enCola");
  const dentro = () => trafico.porDentro().find((q) => q.matricula === EC)!;
  const sitio = () => trafico.quienes().find((q) => q.matricula === EC)!;
  return {
    trafico,
    dentro,
    sitio,
    seas: (q: Partial<QuienJuega>) => (tu = { ...EN_TIERRA, ...q }),
    hasta(ya: () => boolean, comoMucho = 900) {
      for (let t = 0; t < comoMucho; t += PASO) {
        if (ya()) return t;
        trafico.paso(PASO);
      }
      return null;
    },
  };
}

/** Lo que le queda a la decisión, s. */
const aDecidir = (d: ReturnType<Trafico["porDentro"]>[number]) => (d.decide! - d.recorrido) / d.velocidad;

describe("la torre no te da la pista con uno en la base que llegaría antes de que te vayas", () => {
  it("girado a la base y a menos de lo que tardas, no; y en el viento en cola espera él", () => {
    const k = conUnoQueLlega();
    k.seas({ sale: { ...SALE, enElAire: 200 } });
    // En el viento en cola no te frena: en la esquina espera él.
    expect(k.dentro().recorrido).toBeLessThan(k.dentro().base!);
    expect(k.trafico.estorbanTuSalida()).toEqual([]);
    // Girado a la base, sin que salgas: sigue su camino.
    k.seas({});
    k.hasta(() => k.dentro().recorrido > k.dentro().base! + 100);
    const queda = aDecidir(k.dentro());
    k.seas({ sale: { ...SALE, enElAire: queda + 1 } });
    expect(k.trafico.estorbanTuSalida()).toEqual([{ matricula: EC, llega: true }]);
    // Si te vas antes de que llegue a la decisión, sí se te da.
    k.seas({ sale: { ...SALE, enElAire: queda - 12 } });
    expect(k.trafico.estorbanTuSalida()).toEqual([]);
    // Y con la pista ya tuya, no hay nada que no dar.
    k.seas({ sale: { ...SALE, enElAire: 200, conLaPista: true } });
    expect(k.trafico.estorbanTuSalida()).toEqual([]);
  });

  it("y el que no ha girado, con la pista tuya, da su vuelta hasta que le da tiempo", () => {
    const k = conUnoQueLlega();
    k.seas({ enLaPista: true, sale: { ...SALE, enElAire: 80, conLaPista: true } });
    k.hasta(() => k.sitio().esperandoTurno);
    expect(k.sitio().esperandoTurno).toBe(true);
    // Te vas, y baja.
    k.seas({});
    expect(k.hasta(() => !k.sitio().esperandoTurno && k.dentro().recorrido > k.dentro().base!)).not.toBeNull();
  });

  it("y la red: pasados tres minutos la torre te la da igual, y dice por quién se espera", () => {
    const estorba = [{ matricula: EC, llega: true }];
    const dibujo: DibujoDelTurno = {
      anuncia: () => {},
      paso: () => [],
      todaviaNo: () => false,
      enFinal: () => null,
      estorbanTuSalida: () => estorba,
    };
    const turno = new TurnoDePista({
      radio: new Frecuencia(() => 0.5, "GCXO"),
      boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
      trafico: () => dibujo,
      torre: () => true,
      privado: () => false,
      alUmbral: () => Infinity,
      alto: () => 0,
      enTierra: () => true,
      decirAOtro: () => null,
      autorizarte: () => {},
      mandarteAlAire: () => {},
    });
    // Sin que la frecuencia diga nada: la instructora habla todo el rato.
    const esperar = (segundos: number) => {
      for (let t = 0; t < segundos; t += PASO)
        turno.oir(PASO, { fase: "esperando", deDia: true, instructorHablando: true });
    };
    esperar(LO_QUE_SE_ESPERA_POR_QUIEN_LLEGA - 5);
    expect(turno.pistaDeOtros).toBe(true);
    expect(turno.piezasDeLaPistaDeOtros).toEqual(["llega"]);
    expect(turno.porQueEsperasDe).toEqual({ porque: "aterriza", matricula: EC });
    esperar(10);
    expect(turno.pistaDeOtros).toBe(false);
    // Y en la espera siguiente, otra vez desde cero.
    turno.oir(PASO, { fase: "rodando", deDia: true, instructorHablando: true });
    esperar(2);
    expect(turno.pistaDeOtros).toBe(true);
  });
});

describe("el que se va al aire con otro despegando se aparta al lado muerto", () => {
  /** Hasta dónde se aparta del eje sobre la pista, hacia la derecha (+) o la izquierda (−). */
  const alPasarLaPista = (k: ReturnType<typeof conUnoQueLlega>): number[] => {
    const lados: number[] = [];
    k.hasta(() => {
      const p = k.sitio();
      // Rumbo 90: a lo largo es x, y la derecha es z positiva.
      if (p.x > -1200 && p.x < 1200 && p.y - COTA > 20) lados.push(p.z);
      return p.x > 1400;
    });
    return lados;
  };

  for (const mano of ["izquierda", "derecha"] as const)
    it(`con el circuito a la ${mano}, por el otro lado`, () => {
      const k = conUnoQueLlega(mano);
      k.hasta(() => k.dentro().recorrido > k.dentro().entra!);
      k.seas({ enLaPista: true, sale: { ...SALE, conLaPista: true } });
      const lados = alPasarLaPista(k).map((z) => (mano === "izquierda" ? z : -z));
      expect(lados.length).toBeGreaterThan(10);
      // Se va en la decisión, antes del umbral, y cruza la pista apartándose.
      expect(lados.at(-1)!).toBeGreaterThan(550);
      expect(Math.min(...lados)).toBeGreaterThan(0);
    });

  it("sin nadie saliendo, por el eje como siempre", () => {
    const k = conUnoQueLlega();
    k.hasta(() => k.dentro().recorrido > k.dentro().entra!);
    // Uno que aterrizó y sigue en la pista: no sale.
    k.seas({ enLaPista: true });
    expect(Math.max(...alPasarLaPista(k).map(Math.abs))).toBeLessThan(1);
  });

  it("y no se queda ahí: gira cuando ya no se encuentra contigo y vuelve al circuito", () => {
    const k = conUnoQueLlega();
    k.hasta(() => k.dentro().recorrido > k.dentro().entra!);
    k.seas({ enLaPista: true, sale: { ...SALE, conLaPista: true } });
    k.hasta(() => k.dentro().camino === "otro");
    expect(k.dentro().camino).toBe("otro");
    // Te quedas en la pista para siempre: aun así, acaba girando y da otra vuelta.
    const vuelve = k.hasta(() => k.dentro().camino === "sinPermiso" || k.dentro().camino === "llegada");
    expect(vuelve).not.toBeNull();
    expect(vuelve!).toBeLessThan(400);
  });
});

describe("detrás de ti no sale uno que te alcanza antes de que gires", () => {
  const esc = SCENARIOS.find((s) => s.id === "tenerife-norte")!;
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  const h = (pista.heading * Math.PI) / 180;
  const enElEje = (along: number, y: number) => ({
    x: pista.x + Math.sin(h) * along,
    y: cota + y,
    z: pista.z - Math.cos(h) * along,
  });

  /** Uno más rápido que tú esperando en su doble raya, y tú subiendo por el eje. */
  const conUnoEnSuRaya = () => {
    let tu: QuienJuega | null = null;
    const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
      tierra: () => (suelo ? { suelo, alto: () => cota } : null),
      quienJuega: () => tu,
    });
    const sal = ["EC-SAL", "EC-SAM", "EC-SAN", "EC-SAO", "EC-SAP", "EC-SAQ"].find((m) => {
      trafico.anuncia(m, "otro.rodando");
      if (trafico.quienes()[0]?.tipo === "turbohelice") return true;
      trafico.vaciar();
      return false;
    })!;
    for (let t = 0; t < 900 && trafico.todaviaNo(sal, "torre.clearedTakeoff"); t += PASO)
      trafico.paso(PASO);
    const volando = (porDonde: Sitio[]) =>
      (tu = { alUmbral: null, enLaPista: false, velocidad: 41, porDondeVuela: () => porDonde });
    return {
      trafico,
      sal,
      /** Recién ido al aire, a medio kilómetro de la cabecera. */
      subes: () =>
        volando([
          enElEje(500 - pista.length / 2, 20),
          enElEje(3000 - pista.length / 2, 280),
          enElEje(15000, 280),
        ]),
      lejos: () => volando([enElEje(1000, 280), enElEje(2000, 280)].map((p) => ({ ...p, x: p.x + 30000 }))),
    };
  };

  it("subiendo despacio por el eje, espera; lejos, sale", () => {
    const k = conUnoEnSuRaya();
    expect(k.trafico.todaviaNo(k.sal, "torre.clearedTakeoff")).toBe(false);
    k.subes();
    expect(k.trafico.todaviaNo(k.sal, "torre.clearedTakeoff")).toBe(true);
    // Alinearse sí puede: lo que se separa es el despegue.
    expect(k.trafico.todaviaNo(k.sal, "torre.lineUpWait")).toBe(false);
    k.lejos();
    expect(k.trafico.todaviaNo(k.sal, "torre.clearedTakeoff")).toBe(false);
  });

  it("y la red: a los dos minutos y medio sale aunque sigas ahí", () => {
    const k = conUnoEnSuRaya();
    k.subes();
    let espera = 0;
    while (espera < 400 && k.trafico.todaviaNo(k.sal, "torre.clearedTakeoff")) {
      k.trafico.paso(PASO);
      espera += PASO;
    }
    expect(espera).toBeGreaterThan(100);
    expect(espera).toBeLessThan(200);
  });
});

describe("la vuelta que la torre te pide a ti, por el lado por el que no pasa nadie", () => {
  it("hacia fuera, y hacia la pista si por fuera viene uno", () => {
    const k = conUnoQueLlega();
    // Circuito a la izquierda al norte: en el viento en cola se va al oeste.
    const el = k.sitio();
    expect(el.z).toBeLessThan(-900);
    const a = { x: el.x - 600, y: el.y, z: -800 };
    k.seas({ velocidad: 25, porDondeVuela: () => [a, { ...a, x: a.x - 1000 }] });
    expect(k.trafico.ladoDeTuVuelta()).toBe("dentro");
    k.trafico.vaciar();
    expect(k.trafico.ladoDeTuVuelta()).toBe("fuera");
  });

  it("y si hacia la pista no cabe, hacia fuera", () => {
    const k = conUnoQueLlega();
    const el = k.sitio();
    const a = { x: el.x - 600, y: el.y, z: -800 };
    k.seas({ velocidad: 60, porDondeVuela: () => [a, { ...a, x: a.x - 1000 }] });
    expect(k.trafico.ladoDeTuVuelta()).toBe("fuera");
  });
});

describe("recién ido al aire, con el umbral desplazado", () => {
  it("sigues por la subida, y no por la final, que es la misma recta", () => {
    const pista: Pista = { x: 0, z: 0, heading: 1.7, length: 2400, desplazado: 900 };
    const h = (pista.heading * Math.PI) / 180;
    const enElEje = (a: number, y: number) => ({ x: Math.sin(h) * a, y, z: -Math.cos(h) * a });
    const vs = verticesDelCircuito(pista, 100, "izquierda", 1);
    const umbral: PuntoDeCircuito = enElEje(900 - 1200, 100);
    for (let a = -1190; a < 1200; a += 10) {
      const sigue = porDondeSigues(vs, umbral, { ...enElEje(a, 120), rumbo: h }, 41)!;
      // Hasta el final de la subida y la vuelta entera: no se acaba en el umbral.
      expect(sigue.length).toBeGreaterThan(10);
    }
  });
});

describe("en Los Rodeos, con quien juega saliendo", () => {
  const campo = elCampo(40);
  const avionDe = (id: string) => AIRCRAFT.find((a) => a.id === id)!;
  const vuelos = (aviones: readonly string[], semillas: readonly number[], como: ComoSeVuela): Medida[] =>
    aviones.flatMap((id) => semillas.map((s) => volar(campo, avionDe(id), s, como)));
  const hasta = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
  const resumen = (q: readonly Medida[]) => {
    const rojas = q.map((x) => x.roja).sort((a, b) => a - b);
    return (
      `${q.length} vuelos: ${q.flatMap((x) => x.encima).length} encima, ${q.flatMap((x) => x.cerca).length} dando vueltas, ` +
      `la verde, mediana ${rojas[Math.floor(rojas.length / 2)]} s, p90 ${rojas[Math.floor(rojas.length * 0.9)]}, máximo ${rojas.at(-1)}; ` +
      `${q.reduce((a, x) => a + x.alAire, 0)} al aire, ${q.reduce((a, x) => a + x.aterrizaron, 0)} aterrizan`
    );
  };
  // Las semillas en las que salía, de las sesenta medidas, y unas cuantas más.
  const SEMILLAS = [...hasta(20), 23, 29, 32, 33, 39, 40, 47, 50, 54, 58, 59];
  const COMO: ComoSeVuela = { dondeVuelas: true, queSales: true };

  const con = vuelos(["jaz-20", "jaz-60", "jaz-90"], SEMILLAS, COMO);

  it("nadie pasa a menos de trescientos metros de ti", () => {
    console.info(resumen(con));
    expect(con.flatMap((x) => x.encima)).toEqual([]);
    expect(con.flatMap((x) => x.cerca)).toEqual([]);
  });

  it("y la verde llega siempre, y aterrizan", () => {
    expect(con.every((x) => x.acabo)).toBe(true);
    expect(Math.max(...con.map((x) => x.roja))).toBeLessThan(300);
    expect(con.reduce((a, x) => a + x.aterrizaron, 0)).toBeGreaterThan(60);
  });

  it("ni tardando cien segundos alineado, que la torre no sabía", () => {
    const lento = vuelos(["jaz-20", "jaz-60"], SEMILLAS, { ...COMO, alineado: 100 });
    console.info(`tardando: ${resumen(lento)}`);
    expect(lento.flatMap((x) => x.encima)).toEqual([]);
  });

  it("y si la torre no supiera que sales, sí: el instrumento ve el caso", () => {
    const sin = vuelos(["jaz-20", "jaz-60"], SEMILLAS, { dondeVuelas: false, queSales: false });
    console.info(`sin saberlo: ${resumen(sin)}`);
    expect(sin.flatMap((x) => x.encima).length).toBeGreaterThan(5);
  });
});
