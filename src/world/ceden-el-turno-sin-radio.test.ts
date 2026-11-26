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
        trafico.remonta(d.matricula) > 0 &&
        !trafico.puedeSalirSinEsperarte(d.matricula),
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
   * remontada.
   */
  const SEMILLAS = [6, 64, 75] as const;

  it("sin cederle el turno, el que llega gira a la base y se va al aire: la pista la tiene él", () => {
    for (const s of SEMILLAS) {
      const r = laRayaYElQueLlega(s, false);
      expect(r, `semilla ${s}`).not.toBeNull();
      expect(r!.daLaVuelta, `semilla ${s}`).toBe(false);
      expect(r!.alAire, `semilla ${s}`).toBe(true);
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
