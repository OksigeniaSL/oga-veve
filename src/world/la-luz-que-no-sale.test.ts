/**
 * **La luz que no salía, y lo que dejaron del tráfico H96 y H97** (H98).
 *
 * En la ronda de la tanda 26, en Pettirossi y sin radio, quien juega llegó a la
 * decisión sin verde y sin roja. La torre le había pedido una vuelta de espera
 * —con la voz, que no oía— por un reactor que rodaba hacia su doble raya, le
 * quitó el permiso al pedírsela y nadie se lo volvió a dar. Con radio pasaba lo
 * mismo a quien no daba la vuelta. Y el reactor rodaba porque, en la esquina de
 * quien alarga el viento en cola, la torre había dejado de verle.
 *
 * Y lo demás: quien llega no entra en su puesto con uno empujado en el de al
 * lado, quien todavía no ha girado a la base no cruza el umbral contigo en el
 * aire sobre la pista, y nadie se mete delante de ti si va a tardar en dejarla.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { CircuitoDeLaTorre, SIGUE_VIENDOTE, type LoQueVeDeTuCircuito } from "../flight/circuito-de-la-torre";
import { distanciaDeAterrizaje } from "../flight/carrera";
import { Frecuencia } from "../flight/radio";
import { ALTURA_DE_DECISION } from "../flight/minimos";
import {
  remedioParaTuSalida,
  TOPE_DE_LA_VUELTA,
  VUELTA_DESDE_EN_FINAL,
  type TuLlegadaALaPista,
} from "../flight/salida-tapada";
import { TurnoDePista, type AlrededorDelTurno, type DibujoDelTurno } from "../flight/turno-de-pista";
import type { Aerodrome } from "./aerodrome";
import type { Pista } from "./circuito";
import { TIEMPO_DE_CASA } from "./meteo";
import { conSuAerodromo, conViento, SCENARIOS } from "./scenarios";
import { sueloDelTrafico } from "./suelo-del-trafico";
import {
  crearTrafico,
  ESPERA_AL_DE_AL_LADO,
  tiposDelCampo,
  TIPOS,
  type EnTierra,
  type QuienJuega,
  type QuienTapaTuSalida,
  type TuSalida,
} from "./trafico";

const EN_FINAL = (segundos: number, alto = 300): TuLlegadaALaPista => ({ segundos, donde: "final", alto });
/** El de la ronda: rodando, a minutos de irse, y con otra salida por la que dejar la pista. */
const RUEDA: QuienTapaTuSalida = { matricula: "ZP-TCC", leHace: 330, espera: 0, enLaPista: false, teDejaOtra: true };

/** Tú en la final, con el turno de verdad y el dibujo a mano. */
function enTuFinal(tapa: Partial<QuienTapaTuSalida> = {}, cambios: Partial<AlrededorDelTurno> = {}) {
  const e = { alto: 300, segundos: 118, rumbo: 0, sinRadio: false };
  const pasos: string[] = [];
  const dibujo: DibujoDelTurno = {
    anuncia: () => {},
    paso: () => [],
    todaviaNo: () => false,
    enFinal: () => null,
    ocupanLaPista: () => [],
    tapanTuSalida: () => [{ ...RUEDA, ...tapa }],
  };
  const radio = new Frecuencia(() => 0.5, "SGAS");
  // La frecuencia lo tiene: a uno sin vuelo no se le mira.
  radio.indicativoDe = (() => ({ matricula: "ZP-TCC" })) as unknown as typeof radio.indicativoDe;
  const turno = new TurnoDePista({
    radio,
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => dibujo,
    torre: () => true,
    privado: () => false,
    alUmbral: () => e.segundos * 45,
    alto: () => e.alto,
    enTierra: () => false,
    decirAOtro: () => null,
    sinRadio: () => e.sinRadio,
    rumbo: () => e.rumbo,
    autorizarte: () => pasos.push("permiso"),
    retirarteElPermiso: () => pasos.push("retirado"),
    mandarteAlAire: () => pasos.push("al aire"),
    darteUnaVuelta: () => pasos.push("vuelta"),
    acabarTuVuelta: (dada) => pasos.push(dada ? "dada" : "sin dar"),
    mandarteAlAirePorTuSalida: () => pasos.push("al aire por tu salida"),
    tuLlegada: () => EN_FINAL(e.segundos, e.alto),
    ...cambios,
  });
  turno.alSerTuya("final");
  turno.pedirAterrizaje();
  return { e, pasos, turno, paso: () => turno.paso("final") };
}

describe("sin radio, a ti no se te pide una vuelta que no oyes", () => {
  it("se retiene al que sale, que sí oye, y la verde sale", () => {
    const k = enTuFinal();
    k.e.sinRadio = true;
    k.paso();
    expect(k.pasos).toEqual(["permiso"]);
  });

  it("y si su doble raya está en tu única salida, la roja", () => {
    const k = enTuFinal({ teDejaOtra: false });
    k.e.sinRadio = true;
    k.paso();
    k.paso();
    expect(k.pasos).toEqual(["al aire por tu salida"]);
  });

  it("en el circuito, nada: en la final se decide", () => {
    const enElCircuito: TuLlegadaALaPista = { segundos: 200, donde: "circuito", alto: 250 };
    expect(remedioParaTuSalida(enElCircuito, RUEDA, "torre", 0)).toBe("vuelta");
    expect(remedioParaTuSalida(enElCircuito, RUEDA, "torre", 0, false)).toBeNull();
    // Y al que ya está en la pista se le da la salida, oigas o no.
    expect(remedioParaTuSalida(EN_FINAL(60), { ...RUEDA, enLaPista: true }, "torre", 0, false)).toBe("despegar");
    expect(remedioParaTuSalida(EN_FINAL(118), RUEDA, "torre", 0, false)).toBe("retener");
    expect(remedioParaTuSalida(EN_FINAL(118), { ...RUEDA, teDejaOtra: false }, "torre", 0, false)).toBe("alAire");
  });

  it("y si la radio se va con la vuelta pedida, no se espera a que la des", () => {
    const k = enTuFinal();
    k.paso();
    expect(k.pasos).toEqual(["retirado", "vuelta"]);
    k.e.sinRadio = true;
    k.paso();
    expect(k.pasos).toEqual(["retirado", "vuelta", "sin dar", "permiso"]);
  });
});

describe("la vuelta pedida en la final, y el permiso que se cayó al pedirla", () => {
  it("con radio, quien no la da lo tiene otra vez al dejar de esperarla", () => {
    const k = enTuFinal();
    k.paso();
    expect(k.pasos).toEqual(["retirado", "vuelta"]);
    k.e.segundos = VUELTA_DESDE_EN_FINAL + 1;
    k.paso();
    expect(k.pasos).toEqual(["retirado", "vuelta"]);
    k.e.segundos = VUELTA_DESDE_EN_FINAL - 1;
    k.paso();
    k.paso();
    expect(k.pasos).toEqual(["retirado", "vuelta", "sin dar", "permiso"]);
  });

  it("quien la da sin que se le vea salir de la final, también", () => {
    const k = enTuFinal({ leHace: 125 });
    k.paso();
    expect(k.pasos).toEqual(["retirado", "vuelta"]);
    for (let g = 0; g < 2 * Math.PI; g += 0.2) {
      k.e.rumbo = g;
      k.paso();
    }
    expect(k.pasos.slice(0, 3)).toEqual(["retirado", "vuelta", "dada"]);
    // Y si se le pide otra, la última también acaba en permiso, en la red.
    for (let t = 0; t < 3 * TOPE_DE_LA_VUELTA && k.pasos.at(-1) !== "permiso"; t++) {
      k.turno.oir(1, { fase: "final", deDia: true, instructorHablando: true });
      k.e.segundos = Math.max(20, k.e.segundos - 1);
      k.paso();
    }
    expect(k.pasos.at(-1)).toBe("permiso");
  });

  it("y quien sale de ella dándola, lo pide al volver y no antes", () => {
    const k = enTuFinal();
    k.paso();
    k.turno.paso("en-vuelo");
    k.e.segundos = 80;
    k.turno.paso("en-vuelo");
    expect(k.pasos).not.toContain("permiso");
  });
});

const PASO = 0.5;
function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

const JAZ_20 = AIRCRAFT.find((a) => a.id === "jaz-20")!;

/** Pettirossi con su tráfico, y tú bajando la final desde nueve kilómetros, sin radio. */
function finalEnPettirossi(semilla: number) {
  const base = SCENARIOS.find((e) => e.id === "pettirossi")!;
  const esc = conViento(base, { ...TIEMPO_DE_CASA, vientoDe: 20, vientoKt: 10 });
  const aero = esc.aerodrome as Aerodrome;
  const cota = aero.elevationM ?? 0;
  const pista = esc.runway;
  const calles = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  const azar = dados(semilla * 7919 + 13);
  for (let i = 0; i < 5; i++) azar();
  const V = 45;
  let falta = Infinity;
  const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length, false),
    quienJuega: () => ({
      alUmbral: Number.isFinite(falta) ? falta : null,
      llegada: Number.isFinite(falta) ? falta : null,
      enLaPista: false,
      velocidad: V,
      saleDeLaPista: Number.isFinite(falta) ? { porDonde: [], frenaEn: distanciaDeAterrizaje(JAZ_20) } : null,
    }),
    tierra: () => (calles ? { suelo: calles, alto: () => cota } : null),
  });
  const alto = () => (Number.isFinite(falta) ? falta * V * Math.tan(Math.PI / 60) + 15 : 250);
  let senal: "verde" | "roja" | null = null;
  const turno = new TurnoDePista({
    radio: new Frecuencia(dados(semilla), aero.id),
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => trafico,
    torre: () => true,
    privado: () => false,
    alUmbral: () => falta * V,
    alto,
    enTierra: () => false,
    decirAOtro: () => null,
    sinRadio: () => true,
    rumbo: () => 0,
    autorizarte: () => (senal = "verde"),
    retirarteElPermiso: () => (senal = null),
    mandarteAlAire: () => (senal = "roja"),
    mandanFrustrar: () => senal === "roja",
    darteUnaVuelta: () => {},
    acabarTuVuelta: () => {},
    mandarteAlAirePorTuSalida: () => (senal = "roja"),
    tuLlegada: () => (Number.isFinite(falta) ? EN_FINAL(falta, alto()) : null),
  });
  const antes = 60 + azar() * 900;
  for (let t = 0; t < antes; t += PASO) {
    turno.oir(PASO, { fase: "en-vuelo", deDia: true, instructorHablando: false });
    turno.paso("en-vuelo");
  }
  falta = 9000 / V;
  turno.alSerTuya("final");
  turno.pedirAterrizaje();
  while (alto() >= ALTURA_DE_DECISION) {
    falta -= PASO;
    turno.oir(PASO, { fase: "final", deDia: true, instructorHablando: false });
    turno.paso("final");
  }
  trafico.dispose();
  return senal as "verde" | "roja" | null;
}

describe("en Pettirossi, sin radio y con su tráfico", () => {
  it("ninguna final llega a la decisión sin señal", () => {
    const senales = Array.from({ length: 24 }, (_, n) => finalEnPettirossi(n + 1));
    expect(senales.filter((s) => s === null)).toEqual([]);
    expect(senales.filter((s) => s === "verde").length).toBeGreaterThan(12);
  });
});

describe("la torre no te pierde en la esquina de quien alarga el viento en cola", () => {
  const VE: LoQueVeDeTuCircuito = {
    enSuFranja: true,
    tramo: "encola",
    vuelvesAqui: true,
    trasIrse: false,
    vertical: 0,
    aSuAltura: true,
    reloj: 100,
  };
  const FUERA: LoQueVeDeTuCircuito = { ...VE, enSuFranja: false, tramo: null };

  it("te sigue viendo fuera de su franja, y con su red", () => {
    const torre = new CircuitoDeLaTorre();
    expect(torre.paso(VE)).toBe(true);
    for (let t = 101; t < 101 + SIGUE_VIENDOTE; t += 10) expect(torre.paso({ ...FUERA, reloj: t }), `${t}`).toBe(true);
    expect(torre.paso({ ...FUERA, reloj: 101 + SIGUE_VIENDOTE })).toBe(false);
    // Y de vuelta en ella, otra vez desde cero.
    expect(torre.paso({ ...VE, tramo: "base", reloj: 400 })).toBe(true);
    expect(torre.paso({ ...FUERA, reloj: 401 })).toBe(true);
  });

  it("si la dejas por arriba, por abajo o subiendo, no; y sin reloj, lo de antes", () => {
    const con = (antes: Partial<LoQueVeDeTuCircuito>, luego: Partial<LoQueVeDeTuCircuito>) => {
      const torre = new CircuitoDeLaTorre();
      torre.paso({ ...VE, ...antes });
      return torre.paso({ ...FUERA, reloj: 101, ...luego });
    };
    expect(con({}, { aSuAltura: false })).toBe(false);
    expect(con({ tramo: "subida" }, {})).toBe(false);
    expect(con({ tramo: "cruzado" }, {})).toBe(false);
    expect(con({}, { reloj: undefined })).toBe(false);
    // Y a quien no había visto volver, tampoco: con el plan a otro campo y subiendo por el viento en cola.
    expect(con({ vuelvesAqui: false, vertical: 3 }, {})).toBe(false);
  });
});

describe("quien llega no entra en su puesto con uno empujado en el de al lado", async () => {
  const campo = await conSuAerodromo(
    conViento(SCENARIOS.find((e) => e.id === "tenerife-sur")!, { ...TIEMPO_DE_CASA, vientoDe: 69, vientoKt: 12 }),
  );
  const aero = campo.aerodrome as Aerodrome;
  const el = (ref: string) => {
    const { xy } = aero.parkingPositions!.find((p) => p.ref === ref)!;
    return { x: xy[0], z: -xy[1] };
  };
  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, campo.runway, aero.runways[0]?.widthM ?? 45)!;
  const lejos: EnTierra = { x: 9000, z: 9000, separacion: 5, porDondeVa: [], esperandoLaPista: false, ruta: [] };
  const QUIEN = "EC-JAZ";
  /** El reactor del tráfico llega al J1. Lo que tarda en parar en él, y lo más cerca que está mientras te empujan. */
  const llega = (maniobra: string | null, dura: number) => {
    let tu: QuienJuega = { alUmbral: null, enLaPista: false, enTierra: lejos };
    const t = crearTrafico(campo.runway, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: [TIPOS.reactor],
      quienJuega: () => tu,
      tierra: () => ({ suelo, alto: () => cota }),
    });
    t.anuncia(QUIEN, "otro.final", true);
    const j1 = el("J1");
    let masCerca = Infinity;
    let parado: number | null = null;
    for (let s = 0; s < 1500 && parado === null; s += 0.1) {
      const q = t.quienes().find((x) => x.matricula === QUIEN);
      if (!q) break;
      const d = Math.hypot(q.x - j1.x, q.z - j1.z);
      // Te empujan desde que él rueda por las calles, y mientras dure.
      const empujan = maniobra !== null && s < dura;
      tu = { ...tu, enTierra: { ...lejos, ...(empujan ? { maniobra: el(maniobra) } : {}) } };
      if (empujan && q.y - cota < 5) masCerca = Math.min(masCerca, d);
      t.paso(0.1);
      if (d < 25) parado = s;
    }
    t.dispose();
    return { masCerca, parado };
  };
  const solo = llega(null, 0);

  it("al J1 con el del G2: espera en la calle, y entra en cuanto acaba", () => {
    expect(solo.parado).not.toBeNull();
    const k = llega("G2", solo.parado! + 60);
    expect(k.masCerca).toBeGreaterThan(80);
    expect(k.parado! - solo.parado!).toBeGreaterThan(50);
    expect(k.parado! - solo.parado!).toBeLessThan(100);
  });

  it("y con el del G9, que no es de los suyos, no espera", () => {
    expect(llega("G9", 3000).parado).toBeCloseTo(solo.parado!, 0);
  });

  it("y la red: si no acaban nunca, entra a los tres minutos", () => {
    const k = llega("G2", 3000);
    expect(k.parado! - solo.parado!).toBeGreaterThan(ESPERA_AL_DE_AL_LADO - 5);
    expect(k.parado! - solo.parado!).toBeLessThan(ESPERA_AL_DE_AL_LADO + 30);
  });
});

describe("contigo corriendo, el que todavía no ha girado cruza el umbral con el final pasado", () => {
  const PISTA: Pista = { x: 0, z: 0, heading: 90, length: 3200 };
  const COTA = 100;
  const SALE: TuSalida = { enElAire: 40, conLaPista: true, carrera: 400, velocidad: 41, sube: 4.5 };
  const SUBES_A = SALE.velocidad * 0.85;
  const pasaElFinal = SALE.enElAire + (PISTA.length - SALE.carrera) / SUBES_A;

  it("da más vuelta, y la da por el aire: a ti la verde no te cambia", () => {
    let t = 0;
    // Corres desde que él está en el viento en cola.
    const tu = (): QuienJuega =>
      t < SALE.enElAire
        ? { alUmbral: null, enLaPista: true, sale: { ...SALE, enElAire: SALE.enElAire - t } }
        : {
            alUmbral: null,
            enLaPista: false,
            velocidad: SUBES_A,
            // Subiendo por el eje: hasta pasar el final, la pista la tienes tú.
            porDondeVuela: () => {
              const x = SALE.carrera - PISTA.length / 2 + SUBES_A * (t - SALE.enElAire);
              return [
                { x, y: COTA + 50, z: 0 },
                { x: 8000, y: COTA + 300, z: 0 },
              ];
            },
          };
    const trafico = crearTrafico(PISTA, COTA, "ala-alta", "izquierda", 1, undefined, {
      quienJuega: tu,
    });
    trafico.anuncia("EC-LLE", "otro.enCola");
    const dentro = () => trafico.porDentro().find((q) => q.matricula === "EC-LLE")!;
    // Se le pone en la esquina: girando ahora cruzaría el umbral contigo encima.
    while (dentro().recorrido < dentro().base! - 5 * dentro().velocidad) trafico.paso(0.1);
    let giro: number | null = null;
    for (; t < 400 && giro === null; t += 0.1) {
      trafico.paso(0.1);
      const d = dentro();
      const q = trafico.quienes().find((x) => x.matricula === "EC-LLE")!;
      if (d.recorrido > d.base! + 1 && !q.esperandoTurno) giro = t;
    }
    const d = dentro();
    const alUmbral = giro! + (d.toca! - d.recorrido) / d.velocidad;
    expect(alUmbral).toBeGreaterThan(pasaElFinal);
  });
});

describe("nadie se mete delante de ti si va a tardar en dejar la pista", () => {
  it("en Mariscal Estigarribia, con la única calle a tres kilómetros del umbral de la 01", async () => {
    const campo = await conSuAerodromo(
      conViento(SCENARIOS.find((e) => e.id === "estigarribia")!, { ...TIEMPO_DE_CASA, vientoDe: 10, vientoKt: 10 }),
    );
    const aero = campo.aerodrome as Aerodrome;
    const cota = aero.elevationM ?? 0;
    const suelo = sueloDelTrafico(aero, campo.runway, aero.runways[0]?.widthM ?? 45)!;
    /** La avioneta en la esquina, contigo a `detras` segundos por detrás de ella en el umbral: ¿gira? */
    const gira = (detras: number) => {
      let tu: QuienJuega = { alUmbral: null, enLaPista: false };
      const t = crearTrafico(campo.runway, cota, "ala-alta", "izquierda", 1, undefined, {
        tipos: [TIPOS.avioneta],
        quienJuega: () => tu,
        tierra: () => ({ suelo, alto: () => cota }),
      });
      t.anuncia("ZP-LLE", "otro.enCola");
      const d = () => t.porDentro().find((q) => q.matricula === "ZP-LLE")!;
      while (d().recorrido < d().base! - 5 * d().velocidad) t.paso(0.1);
      tu = { alUmbral: (d().toca! - d().recorrido) / d().velocidad + detras, enLaPista: false, velocidad: 60 };
      for (let s = 0; s < 8; s += 0.1) t.paso(0.1);
      const espera = t.quienes().find((q) => q.matricula === "ZP-LLE")!.esperandoTurno;
      t.dispose();
      return !espera;
    };
    // Con los dos minutos y quince segundos de siempre cabía, y seguía en la pista al llegar tú.
    expect(gira(150)).toBe(false);
    expect(gira(230)).toBe(true);
  });
});
