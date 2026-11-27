/**
 * **La paciencia de la fila es para el de delante al que no se le da su
 * salida pudiendo dársela, no para lo que esperáis los dos** (H107c).
 *
 * `PACIENCIA_EN_LA_FILA` es la red de la fila de salida: si la frecuencia no
 * le da su salida al que espera delante de ti, a los tres minutos la torre te
 * la da a ti. Contaba todo el rato en la roja, y la mesa encontraba la verde
 * para quien juega con otro listo delante que todavía no había entrado:
 *
 * - en Encarnación y en Concepción, uno remontaba la pista cuatro minutos,
 *   el de delante y tú esperabais los dos a que la dejara, y al dejarla la
 *   paciencia ya se había gastado;
 * - en Gando, el que llegaba daba vuelta tras vuelta por tu turno, y al de
 *   delante no le valía: no se alineaba, y a los tres minutos salías tú;
 * - en el banco de La Palma, a ×12, de los 182 s de roja 144 fueron con voz
 *   sonando, y con el canal ocupado la frecuencia no le dice nada a nadie.
 *
 * Las salidas van en el orden en que están listas (OACI, Doc 4444, 7.9): o
 * sale primero el de delante, o hay un motivo que se ve y el de detrás también
 * espera. Aquí se monta lo que monta el juego —la frecuencia, el tráfico con
 * sus calles y sus tipos, y el turno—, con quien juega esperando en su doble
 * raya con su salida contada como la cuenta el juego, y se mira:
 *
 * - que con el canal ocupado la paciencia no se gasta;
 * - que en esos campos, con alguien listo delante cuando llegas, la verde no
 *   llega antes de que ése se haya ido.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia } from "./radio";
import { TurnoDePista, PACIENCIA_EN_LA_FILA } from "./turno-de-pista";
import { AIRCRAFT } from "./aircraft";
import { distanciaDeDespegue } from "./carrera";
import { categoriaDeEstela } from "./estela";
import { crearTrafico, tiposDelCampo } from "../world/trafico";
import { sueloDelTrafico } from "../world/suelo-del-trafico";
import { SCENARIOS, conViento } from "../world/scenarios";
import { TIEMPO_DE_CASA } from "../world/meteo";
import type { Aerodrome } from "../world/aerodrome";

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

/**
 * El campo con su viento, y quien juega en un JAZ esperando lejos de las
 * calles, con su salida como la cuenta el juego: entrar y alinearse, lo que
 * remonta y su carrera. Ver `tuSalidaParaLaTorre` en `game.ts`.
 */
function campo(id: string, vientoDe: number, kt: number, avionId: string, semilla: number) {
  const base = SCENARIOS.find((e) => e.id === id)!;
  const esc = conViento(base, { ...TIEMPO_DE_CASA, vientoDe, vientoKt: kt });
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
  const avion = AIRCRAFT.find((a) => a.id === avionId)!;
  const carrera = distanciaDeDespegue(avion);
  const remonta = suelo?.salida(undefined, undefined, carrera * 1.15)?.remonta ?? 0;
  const remonte = remonta > 0 ? remonta / 8 + 25 : 0;
  const corre = (2 * carrera) / Math.max(10, avion.rotationSpeed);
  const radio = new Frecuencia(dados(semilla), aero.id);
  let esperando = false;
  const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length),
    tierra: () => (suelo ? { suelo, alto: () => cota } : null),
    quienJuega: () => ({
      alUmbral: null,
      enLaPista: false,
      velocidad: 15,
      enTierra: {
        x: 1e6,
        z: 1e6,
        separacion: 30,
        porDondeVa: [],
        esperandoLaPista: esperando,
      },
      sale: {
        enElAire: (esperando ? 30 : 10) + remonte + corre,
        conLaPista: !esperando,
        carrera,
        velocidad: avion.velocidadDeCircuito,
        sube: avion.velocidadDeCircuito * 0.1,
      },
    }),
  });
  const turno = new TurnoDePista({
    radio,
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => trafico,
    torre: () => true,
    privado: () => false,
    alUmbral: () => Infinity,
    alto: () => 0,
    miEstela: () => categoriaDeEstela(avion.mass),
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
  });
  return {
    trafico,
    turno,
    oir: (fase: string, canalOcupado = false) =>
      turno.oir(PASO, { fase, deDia: true, instructorHablando: false, canalOcupado }),
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

/**
 * Rueda hasta que alguien espere listo en su doble raya, llega a la tuya y
 * espera la verde. Devuelve los de delante que no se habían ido, o `null` si
 * no hubo nadie delante.
 */
function colados(a: ReturnType<typeof campo>): string[] | null {
  let t = 0;
  while (t < 1500 && a.turno.salenAntes.length === 0) {
    a.oir("rodando");
    t += PASO;
  }
  const delante = [...a.turno.salenAntes];
  if (!delante.length) return null;
  a.esperar(true);
  let libre = 0;
  let espera = 0;
  while (libre <= TORRE_TARDA && espera < 1500) {
    a.oir("esperando");
    libre = a.turno.pistaDeOtros ? 0 : libre + PASO;
    espera += PASO;
  }
  return delante.filter((m) => !seFue(a.trafico, m));
}

describe("la paciencia de la fila de salida", () => {
  it("con el canal ocupado no se gasta: la frecuencia no puede darle nada al de delante", () => {
    let vistos = 0;
    for (let semilla = 1; semilla <= 160 && vistos < 5; semilla++) {
      const a = campo("tenerife-sur", 69, 10, "jaz-60", semilla);
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
      vistos++;
      a.esperar(true);
      // Más que la paciencia, con alguien hablando todo el rato.
      for (let s = 0; s < PACIENCIA_EN_LA_FILA + 60; s += PASO) a.oir("esperando", true);
      expect(a.turno.salenAntes, `semilla ${semilla}`).toEqual(delante);
      a.trafico.dispose();
    }
    expect(vistos).toBeGreaterThan(0);
  });

  /*
   * Gando, Guaraní y Tenerife Sur: los campos en los que, con tu salida contada
   * como la cuenta el juego, salías antes que el de delante. En Gando el que
   * llega daba su vuelta por tu turno y al de delante no le valía; en Guaraní
   * el de delante y tú esperabais a uno que remontaba la pista, y luego su
   * estela.
   */
  for (const [id, vientoDe, kt] of [
    ["gran-canaria", 21, 10],
    ["guarani", 41, 10],
    ["tenerife-sur", 69, 10],
  ] as const)
    it(`en ${id}, con alguien listo delante cuando llegas, la verde espera a que se vaya`, () => {
      let conFila = 0;
      const malos: string[] = [];
      for (let semilla = 1; semilla <= 60; semilla++) {
        const a = campo(id, vientoDe, kt, "jaz-20", semilla);
        const c = colados(a);
        if (c !== null) conFila++;
        if (c?.length) malos.push(`semilla ${semilla}: verde con ${c.join(", ")} delante`);
        a.trafico.dispose();
      }
      expect(conFila, "hay frecuencias con alguien delante").toBeGreaterThan(5);
      expect(malos, malos.join("\n")).toEqual([]);
    });
});
