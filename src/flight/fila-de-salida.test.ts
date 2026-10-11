/**
 * **En la fila de salida, sale primero el que esperaba antes.**
 *
 * Enrique, con el JAZ 60 en el punto de espera B de Tenerife Sur y dos aviones
 * por salir: «nada, me dejaron salir a mí antes». La torre le dio la verde con
 * el segundo esperando en su doble raya desde antes que él. Era la fase de
 * esperar, que calla la frecuencia: al que esperaba su «cleared for take-off»
 * no se le podía decir, y en cuanto la pista quedaba libre la verde era para
 * quien juega. Las salidas se autorizan en el orden en que están listas (Doc
 * 4444, 7.9).
 *
 * Aquí se monta lo mismo que en el juego —la frecuencia, el dibujo con sus
 * calles y sus tipos, y el turno— en Tenerife Sur, y se mira, con cientos de
 * frecuencias sorteadas:
 *
 * - que con alguien listo en su doble raya antes de que llegues a la tuya, la
 *   roja no se apaga hasta que ése se ha ido al aire;
 * - que ése sale, y no se queda esperando para siempre;
 * - que la torre sabe tu número en la fila;
 * - y que el que llega a su doble raya después que tú, sale después.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia } from "./radio";
import { TurnoDePista, type DibujoDelTurno } from "./turno-de-pista";
import { crearTrafico, tiposDelCampo } from "../world/trafico";
import { sueloDelTrafico } from "../world/suelo-del-trafico";
import { SCENARIOS } from "../world/scenarios";
import type { Aerodrome } from "../world/aerodrome";
import { categoriaDeEstela } from "./estela";

const PASO = 0.5;
/** Lo que tarda la torre en mirarte en la raya. Ver `TORRE_TARDA` en `vuelo.ts`. */
const TORRE_TARDA = 2.2;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Tenerife Sur, con quien juega en un JAZ 60 —ligero— lejos de las calles. */
function tenerifeSur(semilla: number, masa = 5600) {
  const esc = SCENARIOS.find((e) => e.id === "tenerife-sur")!;
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  const radio = new Frecuencia(dados(semilla), aero.id);
  let esperando = false;
  const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length),
    tierra: () => (suelo ? { suelo, alto: () => cota } : null),
    quienJuega: () => ({
      alUmbral: null,
      enLaPista: false,
      enTierra: {
        x: 1e6,
        z: 1e6,
        separacion: 30,
        porDondeVa: [],
        esperandoLaPista: esperando,
      },
    }),
  });
  const dibujo: DibujoDelTurno = {
    anuncia: (m, c, p) => trafico.anuncia(m, c, p),
    paso: (dt, al) => trafico.paso(dt, al),
    todaviaNo: (m, c) => trafico.todaviaNo(m, c),
    enFinal: (m) => trafico.enFinal(m),
    ocupanLaPista: () => trafico.ocupanLaPista(),
    dibujado: (m) => trafico.dibujado(m),
    esperanPorTi: () => trafico.esperanPorTi(),
    delanteEnLaSalida: () => trafico.delanteEnLaSalida(),
    ultimaSalida: () => trafico.ultimaSalida(),
  };
  const turno = new TurnoDePista({
    radio,
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => dibujo,
    torre: () => true,
    privado: () => false,
    alUmbral: () => Infinity,
    alto: () => 0,
    miEstela: () => categoriaDeEstela(masa),
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
  });
  const oir = (fase: string) =>
    turno.oir(PASO, { fase, deDia: true, instructorHablando: false });
  return {
    radio,
    trafico,
    turno,
    oir,
    esperar(si: boolean) {
      esperando = si;
    },
  };
}

/** Si ese avión ya se fue al aire: por el camino de salida, pasada su carrera. */
function seFue(t: ReturnType<typeof crearTrafico>, m: string): boolean {
  const d = t.porDentro().find((q) => q.matricula === m);
  if (!d) return true;
  return d.camino === "salida" && d.despega !== null && d.recorrido >= d.despega;
}

describe("en la fila de salida de Tenerife Sur", () => {
  it("el que esperaba antes que tú sale antes, y la torre sabe tu número", () => {
    let conFila = 0;
    let colados = 0;
    let atascados = 0;
    const numeros = new Set<number>();
    const malos: string[] = [];
    for (let semilla = 1; semilla <= 160; semilla++) {
      const a = tenerifeSur(semilla);
      // Rodando, hasta que alguien espere listo en su doble raya.
      let t = 0;
      while (t < 1500 && a.turno.salenAntes.length === 0) {
        a.oir("rodando");
        t += PASO;
      }
      const delante = [...a.turno.salenAntes];
      if (!delante.length) {
        a.trafico.dispose();
        continue;
      }
      conFila++;
      // Llegas a tu doble raya y paras: esperas tu turno.
      a.esperar(true);
      a.oir("esperando");
      const por = a.turno.porQueEsperasDe;
      if (por?.porque === "fila") numeros.add(por.numero ?? 0);
      let libre = 0;
      let espera = 0;
      while (libre <= TORRE_TARDA && espera < 900) {
        a.oir("esperando");
        libre = a.turno.pistaDeOtros ? 0 : libre + PASO;
        espera += PASO;
      }
      if (espera >= 900) {
        atascados++;
        malos.push(`semilla ${semilla}: la roja no se apagó en 900 s`);
      }
      for (const m of delante)
        if (!seFue(a.trafico, m)) {
          colados++;
          malos.push(`semilla ${semilla}: verde con ${m} esperando delante`);
        }
      a.trafico.dispose();
    }
    expect(conFila, "hay frecuencias con alguien delante").toBeGreaterThan(20);
    expect(colados, malos.join("\n")).toBe(0);
    expect(atascados, malos.join("\n")).toBe(0);
    expect(numeros.has(2), "número dos").toBe(true);
  });

  it("el que llega a su doble raya después que tú no va delante", () => {
    let detras = 0;
    for (let semilla = 1; semilla <= 160 && detras < 5; semilla++) {
      const a = tenerifeSur(semilla);
      // Esperas en la tuya desde el principio, con la pista ocupada por otro
      // motivo o no: lo que se mira es quién llega después.
      a.esperar(true);
      let t = 0;
      let alguien: string | null = null;
      while (t < 900 && !alguien) {
        a.oir("rodando");
        t += PASO;
        alguien =
          a.trafico.porDentro().find(
            (d) =>
              d.camino === "salida" &&
              d.espera !== null &&
              Math.abs(d.recorrido - d.espera) < 1,
          )?.matricula ?? null;
      }
      if (alguien) {
        detras++;
        expect(a.trafico.delanteEnLaSalida(), `semilla ${semilla}`).not.toContain(alguien);
      }
      a.trafico.dispose();
    }
    expect(detras).toBeGreaterThan(0);
  });

  /*
   * **Y detrás de uno más grande, sus dos minutos de estela** (Doc 4444,
   * 5.8.3.1): en Tenerife Sur todo el tráfico es de estela media, y el JAZ 60
   * es ligero.
   */
  it("con el JAZ 60 detrás de un reactor o un turbohélice, la verde espera sus dos minutos desde que se fue al aire", () => {
    let medidas = 0;
    for (let semilla = 1; semilla <= 160 && medidas < 8; semilla++) {
      const a = tenerifeSur(semilla);
      let t = 0;
      while (t < 1500 && a.turno.salenAntes.length === 0) {
        a.oir("rodando");
        t += PASO;
      }
      if (!a.turno.salenAntes.length) {
        a.trafico.dispose();
        continue;
      }
      a.esperar(true);
      let libre = 0;
      let espera = 0;
      while (libre <= TORRE_TARDA && espera < 900) {
        a.oir("esperando");
        libre = a.turno.pistaDeOtros ? 0 : libre + PASO;
        espera += PASO;
      }
      const ultima = a.trafico.ultimaSalida();
      if (ultima && ultima.estela === "media") {
        medidas++;
        expect(ultima.hace, `semilla ${semilla}`).toBeGreaterThanOrEqual(120);
      }
      a.trafico.dispose();
    }
    expect(medidas).toBeGreaterThan(0);
  });
});
