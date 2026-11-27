/**
 * **La pista se deja por la primera salida que sirve, aunque otro ruede por
 * delante hacia el mismo sitio.**
 *
 * Los Rodeos por la 30, desde que las avionetas aparcan en la GA 1, en la
 * punta oeste (H105): EC-CYD toca, deja la pista por su salida y rueda dos
 * kilómetros por la paralela hasta el AG2. Cinco minutos después toca EC-GVY,
 * que va al AG1, al lado. Sus dos rayas se encuentran de frente junto a los
 * puestos, y EC-CYD ya estaba en ese tramo —la paralela entera es un mismo
 * trozo de calle con él dentro—; como EC-GVY corría por la pista, pasaba
 * primero, y se le buscaba otra salida que no pasara por donde estaba EC-CYD:
 * la del final de la pista, 1.400 m más allá. Setenta segundos más encima de
 * ella —153 s de la toma a dejarla, contra 83—, con quien venía detrás ya en
 * final: en la mesa de los 600 vuelos de Los Rodeos, el JAZ 20 de la semilla
 * 6 tocaba con EC-GVY en la pista (H107).
 *
 * Lo de verdad: el que aterriza deja la pista en cuanto puede —«landing
 * aircraft (…) shall vacate the runway» (OACI, Doc 4444, 7.10.1)— y lo de la
 * calle se resuelve en la calle: espera fuera de la pista a que el otro
 * aparque. Ver `noEsperaFuera` en `trafico.ts`.
 *
 * Aquí se monta lo que monta el juego —la frecuencia, el tráfico con sus
 * calles y sus tipos, y el turno— sin quien juega, por la 30, y se mira dónde
 * deja la pista cada avioneta y cada bimotor que llega:
 *
 * - **el caso se ve**: en la semilla 6, EC-GVY toca con EC-CYD rodando todavía
 *   hacia la GA 1;
 * - **ninguno sigue hasta el final**: todos la dejan antes de los dos
 *   kilómetros del principio de la pista, y en menos de dos minutos desde que
 *   tocan.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia } from "../flight/radio";
import { TurnoDePista, type DibujoDelTurno } from "../flight/turno-de-pista";
import { crearTrafico, tiposDelCampo } from "./trafico";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { SCENARIOS, conViento } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";
import { enEjesDePista } from "./rumbo";
import type { Aerodrome } from "./aerodrome";

const PASO = 0.5;
const SEMILLAS = 30;
const DURA = 1500;
/** Pasados estos metros del principio de la pista ya no es la primera salida que le sirve, ni la siguiente. */
const MAS_ALLA = 2000;
/** De la toma a haber dejado la pista, s: lo de la primera salida son 83 a 85. */
const LO_MAS = 120;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

interface DejaLaPista {
  semilla: number;
  matricula: string;
  /** Metros del principio de la pista donde deja de estar encima de ella. */
  along: number;
  /** Segundos de la toma a dejarla. */
  tarda: number;
  /** Si al tocar otra de la GA 1 rodaba todavía hacia su puesto. */
  conOtra: string | null;
}

function porLaTreinta(): DejaLaPista[] {
  const base = SCENARIOS.find((e) => e.id === "tenerife-norte")!;
  const esc = conViento(base, { ...TIEMPO_DE_CASA, vientoDe: 300, vientoKt: 12 });
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45)!;
  const principio = -pista.length / 2;
  const sale: DejaLaPista[] = [];
  for (let semilla = 1; semilla <= SEMILLAS; semilla++) {
    const radio = new Frecuencia(dados(semilla), aero.id);
    const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: tiposDelCampo(aero.id, pista.length),
      tierra: () => ({ suelo, alto: () => cota }),
    });
    const dibujo: DibujoDelTurno = {
      anuncia: (m, c, p) => trafico.anuncia(m, c, p),
      paso: (dt) => trafico.paso(dt),
      todaviaNo: (m, c) => trafico.todaviaNo(m, c),
      enFinal: (m) => trafico.enFinal(m),
    };
    const turno = new TurnoDePista({
      radio,
      boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
      trafico: () => dibujo,
      torre: () => true,
      privado: () => false,
      alUmbral: () => Infinity,
      alto: () => 1000,
      decirAOtro: () => null,
      autorizarte: () => {},
      mandarteAlAire: () => {},
    });
    const toco = new Map<string, { t: number; conOtra: string | null }>();
    const dejo = new Set<string>();
    for (let t = 0; t < DURA; t += PASO) {
      turno.oir(PASO, { fase: "aparcado", deDia: true, instructorHablando: false });
      const dentro = trafico.porDentro();
      const encima = new Set(trafico.ocupanLaPista());
      for (const e of dentro) {
        if (e.tipo !== "avioneta" && e.tipo !== "bimotor") continue;
        if (e.camino !== "llegada" || e.toca === null || e.recorrido < e.toca) continue;
        if (!toco.has(e.matricula)) {
          const otra = dentro.find(
            (o) =>
              o.matricula !== e.matricula &&
              o.camino === "llegada" &&
              (o.tipo === "avioneta" || o.tipo === "bimotor") &&
              o.fuera !== null &&
              o.recorrido > o.fuera &&
              o.puesto !== null,
          );
          toco.set(e.matricula, { t, conOtra: otra?.matricula ?? null });
        }
        if (encima.has(e.matricula) || dejo.has(e.matricula)) continue;
        dejo.add(e.matricula);
        const q = trafico.quienes().find((w) => w.matricula === e.matricula)!;
        const k = toco.get(e.matricula)!;
        sale.push({
          semilla,
          matricula: e.matricula,
          along: enEjesDePista(q.x, q.z, pista.x, pista.z, pista.heading).along - principio,
          tarda: t - k.t,
          conOtra: k.conOtra,
        });
      }
    }
    trafico.dispose();
  }
  return sale;
}

describe("en Los Rodeos por la 30, la avioneta que llega deja la pista por la primera salida que sirve", () => {
  const todas = porLaTreinta();

  it("el caso se ve: EC-GVY toca en la semilla 6 con EC-CYD rodando hacia la GA 1", () => {
    const gvy = todas.find((d) => d.semilla === 6 && d.matricula === "EC-GVY");
    expect(gvy, JSON.stringify(todas.filter((d) => d.semilla === 6))).toBeDefined();
    expect(gvy!.conOtra).toBe("EC-CYD");
    expect(todas.length).toBeGreaterThan(SEMILLAS / 2);
  });

  it("ninguna sigue hasta el final de la pista, ni se queda en ella más de dos minutos", () => {
    const malas = todas.filter((d) => d.along > MAS_ALLA || d.tarda > LO_MAS);
    expect(malas.map((d) => `s${d.semilla} ${d.matricula}: ${Math.round(d.along)} m, ${d.tarda} s${d.conOtra ? `, con ${d.conOtra}` : ""}`)).toEqual([]);
  });
});
