/**
 * **No se alinea a quien no se va a haber ido antes de que cruce el umbral el
 * que viene por el viento en cola.**
 *
 * Los Rodeos por la 12, desde que las avionetas salen de la GA 1 por la E2,
 * en la cabecera misma y sin remontar (H105): en la semilla 20, EC-GCN llega a
 * su doble raya a los setenta segundos y la torre la alinea; en la fila no hay
 * nadie, porque EC-OZZ, un turbohélice, va todavía por el viento en cola, a
 * minuto y medio del umbral. Al girar a la base EC-OZZ ya está en la fila, y
 * con él ahí la avioneta no tiene salida —no habría pasado el final de los
 * tres kilómetros de pista antes de que cruzara el umbral—; pero él no cuenta
 * con ella para esperar, y baja hasta la decisión con la avioneta alineada,
 * 63 s parada en la cabecera, y se va al aire (H107). En la mesa de los 600
 * vuelos de Los Rodeos, dieciséis de las 61 frustradas del tráfico con H105
 * eran ésta, y ninguna antes.
 *
 * Lo de verdad: la torre ve al del viento en cola y no alinea a quien no se
 * va a haber ido antes de que él cruce el umbral (OACI, Doc 4444, 7.10.1.2):
 * la avioneta espera en su doble raya, fuera de la pista, y sale detrás. Ver
 * `vieneDelTraficoAntesDe` en `trafico.ts`.
 *
 * Aquí se monta lo que monta el juego —la frecuencia, el tráfico con sus
 * calles y sus tipos, y el turno— sin quien juega, por la 12, y se mira cada
 * vez que uno del tráfico se va al aire quién tenía la pista:
 *
 * - **el caso se ve**: las avionetas de la GA 1 salen, y en la semilla 20
 *   EC-GCN despega;
 * - **nadie se va al aire por una salida alineada que no despega.**
 */
import { describe, expect, it } from "vitest";
import { Frecuencia } from "../flight/radio";
import { TurnoDePista, type DibujoDelTurno } from "../flight/turno-de-pista";
import { crearTrafico, tiposDelCampo } from "./trafico";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { SCENARIOS, conViento } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";
import type { Aerodrome } from "./aerodrome";

const PASO = 0.5;
const SEMILLAS = 30;
const DURA = 1500;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

interface LoQuePasa {
  /** Cada ida al aire del tráfico con una salida encima de la pista sin despegar. */
  porUnaAlineada: string[];
  /** Las salidas que despegan, por semilla y matrícula. */
  despegan: Set<string>;
  /** Y de ellas, las avionetas y los bimotores. */
  deLaGeneral: number;
}

function porLaDoce(): LoQuePasa {
  const base = SCENARIOS.find((e) => e.id === "tenerife-norte")!;
  const esc = conViento(base, { ...TIEMPO_DE_CASA, vientoDe: 40, vientoKt: 12 });
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45)!;
  const sale: LoQuePasa = { porUnaAlineada: [], despegan: new Set(), deLaGeneral: 0 };
  for (let semilla = 1; semilla <= SEMILLAS; semilla++) {
    const radio = new Frecuencia(dados(semilla), aero.id);
    const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: tiposDelCampo(aero.id, pista.length),
      tierra: () => ({ suelo, alto: () => cota }),
    });
    const dibujo: DibujoDelTurno = {
      anuncia: (m, c, p) => trafico.anuncia(m, c, p),
      paso: (dt) => {
        const seVan = trafico.paso(dt);
        if (seVan.length) {
          const dentro = trafico.porDentro();
          for (const m of trafico.ocupanLaPista()) {
            const e = dentro.find((d) => d.matricula === m);
            if (e?.camino === "salida" && e.despega !== null && e.recorrido < e.despega)
              sale.porUnaAlineada.push(`s${semilla}: ${seVan.join(", ")} por ${m} (${e.tipo})`);
          }
        }
        return seVan;
      },
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
    for (let t = 0; t < DURA; t += PASO) {
      turno.oir(PASO, { fase: "aparcado", deDia: true, instructorHablando: false });
      for (const e of trafico.porDentro()) {
        const k = `s${semilla} ${e.matricula}`;
        if (e.camino !== "salida" || e.despega === null || e.recorrido < e.despega || sale.despegan.has(k)) continue;
        sale.despegan.add(k);
        if (e.tipo === "avioneta" || e.tipo === "bimotor") sale.deLaGeneral++;
      }
    }
    trafico.dispose();
  }
  return sale;
}

describe("en Los Rodeos por la 12, no se alinea a quien no se va a ir antes del que viene por el viento en cola", () => {
  const visto = porLaDoce();

  it("el caso se ve: las avionetas de la GA 1 salen, y EC-GCN en la semilla 20", () => {
    expect(visto.despegan.has("s20 EC-GCN"), [...visto.despegan].filter((k) => k.startsWith("s20 ")).join(", ")).toBe(true);
    expect(visto.deLaGeneral).toBeGreaterThan(SEMILLAS / 2);
  });

  it("nadie se va al aire por una salida alineada que no despega", () => {
    expect(visto.porUnaAlineada).toEqual([]);
  });
});
