/**
 * **Sin radio, los que llegan ceden el turno al que tapa tu única calle** (H102).
 *
 * En Encarnación, con el fallo de radio y uno en la doble raya de la única
 * calle, la lámpara te da la roja en la final: remontar la pista le lleva más
 * de cinco minutos y tu circuito entero son cuatro y medio. Después se le da la
 * pista en cuanto queda libre (H100), pero no se le daba con alguien del
 * tráfico a punto de aterrizar dentro de su remontada (OACI, Doc 4444,
 * 7.9.3.1), y con alguien llegando cada pocos minutos esperaba en la raya hasta
 * que volvías: otra roja por el mismo. Quien cede es el tráfico que oye a la
 * torre (7.7.3.1): el que todavía no ha girado a la base da su vuelta de espera.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia } from "../flight/radio";
import type { TuLlegadaALaPista } from "../flight/salida-tapada";
import { TurnoDePista, type DibujoDelTurno } from "../flight/turno-de-pista";
import type { Aerodrome } from "./aerodrome";
import { TIEMPO_DE_CASA } from "./meteo";
import { conViento, SCENARIOS } from "./scenarios";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { crearTrafico, tiposDelCampo, type QuienTapaTuSalida } from "./trafico";

const PASO = 0.5;
function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
const EN_VUELO = { fase: "en-vuelo", deDia: true, instructorHablando: false } as const;

describe("sin radio, la torre pide que le cedan el turno al que ya te mandó al aire", () => {
  /** La roja por el de tu calle, y luego tú en el circuito: ¿a quién se le cede? */
  const trasLaRoja = (sinRadio: boolean) => {
    const radio = new Frecuencia(dados(3), "SGEN");
    const m = radio.sacarARodar()!;
    for (let t = 0; t < 30 && !radio.vaASalir(m); t += PASO) radio.update(PASO, EN_VUELO);
    const tapa: QuienTapaTuSalida = { matricula: m, leHace: 330, espera: 0, enLaPista: false, teDejaOtra: false };
    const cedidos: (string | null)[] = [];
    const dibujo: DibujoDelTurno = {
      anuncia: () => {},
      paso: () => [],
      todaviaNo: () => false,
      enFinal: () => null,
      ocupanLaPista: () => [],
      tapanTuSalida: () => [tapa],
      puedeSalirSinEsperarte: () => false,
      cederleElTurno: (x) => cedidos.push(x),
    };
    let llegada: TuLlegadaALaPista = { segundos: 80, donde: "final", alto: 250 };
    let frustrando = false;
    const turno = new TurnoDePista({
      radio,
      boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
      trafico: () => dibujo,
      torre: () => true,
      privado: () => false,
      alUmbral: () => llegada.segundos * 35,
      alto: () => llegada.alto,
      enTierra: () => false,
      decirAOtro: () => null,
      sinRadio: () => sinRadio,
      rumbo: () => 0,
      autorizarte: () => {},
      retirarteElPermiso: () => {},
      mandarteAlAire: () => {},
      mandanFrustrar: () => frustrando,
      darteUnaVuelta: () => {},
      acabarTuVuelta: () => {},
      mandarteAlAirePorTuSalida: () => (frustrando = true),
      tuLlegada: () => llegada,
    });
    turno.alSerTuya("final");
    turno.pedirAterrizaje();
    llegada = { segundos: 30, donde: "final", alto: 100 };
    turno.paso("final");
    frustrando = false;
    llegada = { segundos: 270, donde: "circuito", alto: 250 };
    turno.paso("en-vuelo");
    turno.paso("en-vuelo");
    return { m, cedidos };
  };

  it("sin radio, a él", () => {
    const { m, cedidos } = trasLaRoja(true);
    expect(cedidos.length).toBeGreaterThan(0);
    expect(new Set(cedidos)).toEqual(new Set([m]));
  });

  it("con radio, a nadie: a quien oye se le puede pedir una vuelta", () => {
    expect(trasLaRoja(false).cedidos).toEqual([]);
  });
});

/**
 * **Encarnación con su tráfico, y uno en la doble raya de la única calle que
 * remonta la pista** mientras otro viene por el viento en cola sin haber girado
 * a la base, a menos de lo que tarda el de la raya en irse. Ahí, si `cede`, se
 * le pide al tráfico que le ceda el turno, y se miran cuatro minutos: si se le
 * puede dar la salida, y si el que llega da su vuelta de espera, aterriza o se
 * va al aire. `null` si en esa semilla no se da el caso. Quien juega no viene:
 * la cesión se pide a mano, que es lo que hace el turno sin radio.
 *
 * Hasta H104b el caso pedía también que el de la raya no pudiera salir todavía.
 * Con la pista al que espera listo en su raya (H100) y la salida que la tiene
 * en el turno de los que llegan, eso ya no se da en trescientas semillas: se le
 * da la pista antes de que llegue nadie dentro de su remontada.
 */
function laRayaYElQueLlega(semilla: number, cede: boolean) {
  const esc = conViento(SCENARIOS.find((e) => e.id === "encarnacion")!, {
    ...TIEMPO_DE_CASA,
    vientoDe: 12,
    vientoKt: 10,
  });
  const aero = esc.aerodrome as Aerodrome;
  const cota = aero.elevationM ?? 0;
  const pista = esc.runway;
  const calles = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length, false),
    quienJuega: () => ({ alUmbral: null, llegada: null, enLaPista: false }),
    tierra: () => (calles ? { suelo: calles, alto: () => cota } : null),
  });
  const turno = new TurnoDePista({
    radio: new Frecuencia(dados(semilla), aero.id),
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => trafico,
    torre: () => true,
    privado: () => false,
    calleUnica: () => calles?.unaSolaCalle() ?? false,
    alUmbral: () => Infinity,
    alto: () => 300,
    enTierra: () => false,
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
  });
  const paso = () => {
    turno.oir(PASO, EN_VUELO);
    turno.paso("en-vuelo");
  };
  /** El de la raya y el que llega, si se da el caso ahora. */
  const elCaso = (): { sale: string; llega: string } | null => {
    const dentro = trafico.porDentro();
    const llegan = dentro.filter((d) => d.camino === "llegada" || d.camino === "sinPermiso");
    const sale = dentro.find(
      (d) =>
        d.camino === "salida" &&
        d.espera !== null &&
        Math.abs(d.recorrido - d.espera) < 1 &&
        trafico.remonta(d.matricula) > 0,
    );
    const llega = llegan.find(
      (d) =>
        d.base !== null &&
        d.toca !== null &&
        d.recorrido < d.base - 200 &&
        (d.toca - d.recorrido) / d.velocidad < 300 &&
        !trafico.secuencia().find((q) => q.matricula === d.matricula)?.esperandoTurno,
    );
    return sale && llega ? { sale: sale.matricula, llega: llega.matricula } : null;
  };
  let caso: { sale: string; llega: string } | null = null;
  for (let t = 0; t < 2400 && !caso; t += PASO) {
    paso();
    caso = elCaso();
  }
  if (!caso) {
    trafico.dispose();
    return null;
  }
  if (cede) trafico.cederleElTurno(caso.sale);
  let puede = false;
  let daLaVuelta = false;
  let aterriza = false;
  let alAire = false;
  for (let t = 0; t < 240; t += PASO) {
    paso();
    puede ||= trafico.puedeSalirSinEsperarte(caso.sale);
    const suyo = trafico.porDentro().find((d) => d.matricula === caso!.llega);
    daLaVuelta ||= !!trafico.secuencia().find((q) => q.matricula === caso!.llega)?.esperandoTurno;
    aterriza ||= !!suyo && suyo.toca !== null && suyo.recorrido >= suyo.toca && suyo.camino === "llegada";
    alAire ||= suyo?.camino === "otro";
  }
  trafico.dispose();
  return { ...caso, puede, daLaVuelta, aterriza, alAire };
}

describe("en Encarnación, el que llega le cede el turno al de la única calle", () => {
  /*
   * Semillas en las que se da el caso, buscadas con este mismo arnés: uno en la
   * raya que remonta y otro en el viento en cola que aterrizaría dentro de su
   * remontada. Antes de H104b, en las tres el que llega se iba al aire si no se
   * le pedía la cesión: la frecuencia le daba la pista al de la raya y el que
   * llegaba no lo contaba.
   */
  const SEMILLAS = [52, 54, 78] as const;

  it("sin cederle el turno, el que llega ya no se va al aire: en cuanto el otro tiene la pista, la espera (H104b)", () => {
    for (const s of SEMILLAS) {
      const r = laRayaYElQueLlega(s, false);
      expect(r, `semilla ${s}`).not.toBeNull();
      expect(r!.daLaVuelta, `semilla ${s}`).toBe(true);
      expect(r!.alAire, `semilla ${s}`).toBe(false);
    }
  });

  it("cediéndoselo, el que llega da su vuelta de espera, no se va al aire, y él tiene la pista", () => {
    for (const s of SEMILLAS) {
      const r = laRayaYElQueLlega(s, true);
      expect(r!.daLaVuelta, `semilla ${s}`).toBe(true);
      expect(r!.alAire, `semilla ${s}`).toBe(false);
      expect(r!.puede, `semilla ${s}`).toBe(true);
    }
  });
});

/**
 * **Encarnación con su tráfico, y uno que ya remonta la pista para salir**
 * mientras otro viene por el viento en cola sin haber girado a la base, a menos
 * de dos minutos y medio del suelo. Se miran cuatro minutos: si el que sale se
 * va, y si el que llega da su vuelta de espera, aterriza o se va al aire. `null`
 * si en esa semilla no se da el caso. Quien juega no viene, y nadie cede nada.
 */
function remontaYElQueLlega(semilla: number) {
  const esc = conViento(SCENARIOS.find((e) => e.id === "encarnacion")!, {
    ...TIEMPO_DE_CASA,
    vientoDe: 12,
    vientoKt: 10,
  });
  const aero = esc.aerodrome as Aerodrome;
  const cota = aero.elevationM ?? 0;
  const pista = esc.runway;
  const calles = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length, false),
    quienJuega: () => ({ alUmbral: null, llegada: null, enLaPista: false }),
    tierra: () => (calles ? { suelo: calles, alto: () => cota } : null),
  });
  const turno = new TurnoDePista({
    radio: new Frecuencia(dados(semilla), aero.id),
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => trafico,
    torre: () => true,
    privado: () => false,
    calleUnica: () => calles?.unaSolaCalle() ?? false,
    alUmbral: () => Infinity,
    alto: () => 300,
    enTierra: () => false,
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
  });
  const paso = () => {
    turno.oir(PASO, EN_VUELO);
    turno.paso("en-vuelo");
  };
  const elCaso = (): { sale: string; llega: string } | null => {
    const dentro = trafico.porDentro();
    const sale = dentro.find(
      (d) =>
        d.camino === "salida" &&
        d.espera !== null &&
        d.despega !== null &&
        d.recorrido > d.espera + 1 &&
        d.recorrido < d.despega - 600 &&
        trafico.remonta(d.matricula) > 0,
    );
    if (!sale) return null;
    const llega = dentro.find(
      (d) =>
        (d.camino === "llegada" || d.camino === "sinPermiso") &&
        d.base !== null &&
        d.toca !== null &&
        d.recorrido < d.base - 200 &&
        (d.toca - d.recorrido) / d.velocidad < 150 &&
        !trafico.secuencia().find((q) => q.matricula === d.matricula)?.esperandoTurno,
    );
    return llega ? { sale: sale.matricula, llega: llega.matricula } : null;
  };
  let caso: { sale: string; llega: string } | null = null;
  for (let t = 0; t < 2400 && !caso; t += PASO) {
    paso();
    caso = elCaso();
  }
  if (!caso) {
    trafico.dispose();
    return null;
  }
  let [seFue, alAire] = [false, false];
  for (let t = 0; t < 240; t += PASO) {
    paso();
    const dentro = trafico.porDentro();
    const s = dentro.find((d) => d.matricula === caso!.sale);
    seFue ||= !s || s.camino !== "salida" || (s.despega !== null && s.recorrido >= s.despega);
    alAire ||= dentro.find((d) => d.matricula === caso!.llega)?.camino === "otro";
  }
  trafico.dispose();
  return { ...caso, seFue, alAire };
}

describe("en Encarnación, la salida que ya tiene la pista cuenta en el turno de los que llegan (H102, lo 2)", () => {
  /*
   * Buscadas con este mismo arnés. Hasta H104b, en las tres el que llegaba
   * giraba a la base contando solo con los que llegan, bajaba con el otro
   * remontando y se iba al aire en la decisión.
   */
  const SEMILLAS = [5, 6, 15] as const;

  it("el que llega y todavía no ha girado a la base espera a que se vaya: nadie se va al aire", () => {
    for (const s of SEMILLAS) {
      const r = remontaYElQueLlega(s);
      expect(r, `semilla ${s}`).not.toBeNull();
      expect(r!.seFue, `semilla ${s}`).toBe(true);
      expect(r!.alAire, `semilla ${s}`).toBe(false);
    }
  });
});
