/**
 * **Con vos en la base, la torre no le da la pista a quien no se iría antes.**
 *
 * La fila de llegadas te cuenta desde la fase de final, y para dar la pista a
 * uno que sale solo miraba esa fila y la ruta del plan: volando el circuito de
 * casa, en la base y a un minuto del umbral, no estabas. Se le daba la pista
 * —alinearse y esperar, o despegar— y podía seguir en ella cuando llegabas. Lo
 * de verdad es que la torre te ve en el circuito y no suelta a quien no habrá
 * pasado el final de la pista antes de que cruces el umbral (OACI, PANS-ATM
 * 7.10). Ver `llegaAntesDeQueSalga` en `trafico.ts`.
 */
import { describe, expect, it } from "vitest";
import { sinTorre, type Aerodrome } from "./aerodrome";
import { SCENARIOS } from "./scenarios";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { crearTrafico, tiposDelCampo, type QuienJuega } from "./trafico";

const PASO = 0.2;

describe("la salida con vos en el circuito", () => {
  it("no se le da la pista con vos a un minuto, y sí con vos lejos", () => {
    const esc = SCENARIOS.find((s) => s.id === "tenerife-norte")!;
    const aero = esc.aerodrome as Aerodrome;
    const pista = esc.runway;
    const cota = aero.elevationM ?? 0;
    const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
    let tu: QuienJuega | null = null;
    const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
      tierra: () => (suelo ? { suelo, alto: () => cota } : null),
      quienJuega: () => tu,
    });
    const vaASalir = "EC-SAL";
    trafico.anuncia(vaASalir, "otro.rodando");
    // Hasta su doble raya, que es donde se le da la pista. Sin nadie en el aire.
    let enSuRaya = false;
    for (let t = 0; t < 600 && !enSuRaya; t += PASO) {
      trafico.paso(PASO);
      enSuRaya =
        trafico.dibujado(vaASalir) && !trafico.todaviaNo(vaASalir, "torre.lineUpWait");
    }
    expect(enSuRaya).toBe(true);

    // En la base, a un minuto del umbral, todavía sin la fase de final.
    tu = { alUmbral: null, llegada: 60, enLaPista: false };
    expect(trafico.todaviaNo(vaASalir, "torre.lineUpWait")).toBe(true);
    expect(trafico.todaviaNo(vaASalir, "torre.clearedTakeoff")).toBe(true);

    // Y en el viento en cola lejos, a seis minutos: sale, que le da tiempo.
    tu = { alUmbral: null, llegada: 360, enLaPista: false };
    expect(trafico.todaviaNo(vaASalir, "torre.lineUpWait")).toBe(false);
    expect(trafico.todaviaNo(vaASalir, "torre.clearedTakeoff")).toBe(false);
  });
});
