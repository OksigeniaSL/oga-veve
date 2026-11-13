/**
 * **Y esperando en la roja por alguien, se dice por quién**, también cuando
 * ese alguien ya no tiene la pista para la radio y sigue en ella.
 *
 * El banco del vuelo entero en Los Rodeos con el JAZ 90 y Guyrami: al llegar a
 * la raya, EC-PLR corría su despegue —su «cleared for take-off» ya sonado, así
 * que para la frecuencia la pista estaba libre— y EC-IPV esperaba listo en su
 * doble raya desde antes. La roja duró 109 s y el banco dijo «ocupaban la
 * pista a los 300 s: EC-PLR en la pista · no se dijo por qué».
 *
 * La torre sí lo dijo: «número dos para la salida», que es lo que dice una de
 * verdad con uno delante en la fila. Lo que pasaba era otra cosa: el banco no
 * contaba la fila como porqué, y la instructora, que lo cuenta en castellano
 * detrás del número, caducaba siempre en la cola —ver `explicaLaEspera` en
 * `audio/boca.ts`—, y al no oírse se volvía a pedir con el número delante.
 *
 * Aquí se monta lo mismo que en el juego —la frecuencia, el dibujo con sus
 * calles y sus tipos, y el turno— en Tenerife Norte, con cientos de
 * frecuencias sorteadas, y se mira que con uno encima de la pista al llegar a
 * la raya la torre sabe por quién esperas, y que lo que diría para contarlo
 * lleva el porqué: en fraseología de Taguató para arriba, en castellano de la
 * instructora en los de abajo. Lo que elige la frase está en `game.ts`
 * —`luzDeTorre` y `explicarSiCambiaElPorque`— y sale de estas tablas, que son
 * las que se comprueban.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia } from "./radio";
import {
  EXPLICA_LA_ESPERA,
  HOLD_SHORT_POR,
  holdShortEnLaFila,
  TurnoDePista,
  type DibujoDelTurno,
  type EsperaPor,
} from "./turno-de-pista";
import { crearTrafico, tiposDelCampo } from "../world/trafico";
import { sueloDelTrafico } from "../world/suelo-del-trafico";
import { SCENARIOS } from "../world/scenarios";
import type { Aerodrome } from "../world/aerodrome";
import { categoriaDeEstela } from "./estela";
import { claveDeTorre } from "../audio/torre";

const PASO = 0.5;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Los Rodeos, con quien juega en un JAZ 90 —estela media— lejos de las calles. */
function losRodeos(semilla: number) {
  const esc = SCENARIOS.find((e) => e.id === "tenerife-norte")!;
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
    miEstela: () => categoriaDeEstela(36_000),
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

/** El que corre su despegue: por el camino de salida, encima de la pista. */
function corriendoSuDespegue(t: ReturnType<typeof crearTrafico>): string | null {
  const encima = new Set(t.ocupanLaPista());
  return (
    t.porDentro().find((d) => d.camino === "salida" && encima.has(d.matricula))
      ?.matricula ?? null
  );
}

/**
 * **Lo que diría la torre por ese porqué**, de Taguató para arriba: la misma
 * cuenta que `luzDeTorre` y `elPorqueEnRadio` en `game.ts`, hasta su clave
 * grabada. La fila con su número, la estela con su «caution», y lo demás
 * por `HOLD_SHORT_POR`.
 */
function enFraseologia(por: EsperaPor): string | null {
  const dice =
    por.porque === "fila" ? holdShortEnLaFila(por.numero) : HOLD_SHORT_POR[por.porque];
  return claveDeTorre(dice);
}

/**
 * Las claves que **dicen el porqué**: las mismas que el banco del vuelo
 * entero da por dichas. Ver «y esperando en la roja por alguien, se dice por
 * quién» en `scripts/verificar-vuelo-entero.mjs`.
 */
const LLEVA_EL_PORQUE =
  /^(?:torre\.(?:[a-z]+\.)?holdShort(?:Landing|Departing|NumberTwo|NumberThree)|vuelo\.(?:esperaQue(?:Aterrice|Despegue)|esperaTurnoDeSalida))$/;

/**
 * Rueda hasta que uno corra su despegue y llega a la raya en ese momento.
 * Devuelve quién corría, o `null` si en esa frecuencia no salió nadie.
 */
function llegarConUnoEnLaPista(
  a: ReturnType<typeof losRodeos>,
  antes?: () => void,
): string | null {
  let t = 0;
  let encima: string | null = null;
  while (t < 1500 && !encima) {
    a.oir("rodando");
    t += PASO;
    encima = corriendoSuDespegue(a.trafico);
  }
  if (!encima) return null;
  antes?.();
  a.esperar(true);
  a.oir("esperando");
  return encima;
}

describe("en la roja de Los Rodeos, con uno corriendo su despegue", () => {
  it("la torre sabe por quién esperas, y lo que dice lleva el porqué en los dos registros", () => {
    let medidas = 0;
    const malos: string[] = [];
    for (let semilla = 1; semilla <= 120 && medidas < 20; semilla++) {
      const a = losRodeos(semilla);
      const encima = llegarConUnoEnLaPista(a);
      if (!encima) {
        a.trafico.dispose();
        continue;
      }
      // Ya no la tiene para la radio: soltó la pista al oír su «cleared for take-off».
      const enLaRadio = a.radio.ocupanLaPista.map((o) => o.matricula);
      if (enLaRadio.includes(encima)) {
        a.trafico.dispose();
        continue;
      }
      medidas++;
      expect(a.turno.pistaDeOtros, `semilla ${semilla}: la roja`).toBe(true);
      const por = a.turno.porQueEsperasDe;
      if (!por) {
        malos.push(`semilla ${semilla}: ${encima} en la pista y ningún porqué`);
        a.trafico.dispose();
        continue;
      }
      const radio = enFraseologia(por);
      if (!radio || !LLEVA_EL_PORQUE.test(radio))
        malos.push(`semilla ${semilla}: «${radio}» por ${por.porque}:${por.matricula}`);
      if (!LLEVA_EL_PORQUE.test(EXPLICA_LA_ESPERA[por.porque]))
        malos.push(`semilla ${semilla}: la instructora, «${EXPLICA_LA_ESPERA[por.porque]}»`);
      // Y nombra a uno que está: el que corre, o el primero de la fila.
      const fila = a.turno.salenAntes;
      if (por.matricula !== encima && por.matricula !== fila[0])
        malos.push(`semilla ${semilla}: nombra a ${por.matricula} con ${encima} en la pista`);
      a.trafico.dispose();
    }
    expect(medidas, "frecuencias con uno corriendo al llegar").toBeGreaterThan(10);
    expect(malos, malos.join("\n")).toEqual([]);
  });

  /*
   * **El caso del banco**: uno corriendo y otro esperando delante de ti en su
   * doble raya. Lo que dice una torre de verdad es tu número en la secuencia
   * de salida —«hold short of runway one two, number two for departure»—: es
   * información, no una autorización, y dice por quién esperas, que es el que
   * sale antes que tú (Doc 4444, 12.3.4.14 b). El que ya corre no se nombra
   * aparte: va delante del que va delante de ti.
   */
  it("con uno corriendo y otro listo delante, eres el número dos y se dice", () => {
    let medidas = 0;
    const malos: string[] = [];
    for (let semilla = 1; semilla <= 160 && medidas < 6; semilla++) {
      const a = losRodeos(semilla);
      // Dos que salen a rodar ya, como el `OGA_FILA_DE_SALIDA` del banco.
      a.radio.sacarARodar();
      a.radio.sacarARodar();
      let t = 0;
      let encima: string | null = null;
      while (t < 1500 && !(encima && a.turno.salenAntes.length)) {
        a.oir("rodando");
        t += PASO;
        encima = corriendoSuDespegue(a.trafico);
      }
      const delante = a.turno.salenAntes[0];
      if (!encima || !delante) {
        a.trafico.dispose();
        continue;
      }
      // Y llegas a la raya justo entonces.
      a.esperar(true);
      a.oir("esperando");
      if (!corriendoSuDespegue(a.trafico) || !a.turno.salenAntes.length) {
        a.trafico.dispose();
        continue;
      }
      medidas++;
      const por = a.turno.porQueEsperasDe;
      if (por?.porque !== "fila" || por.matricula !== delante)
        malos.push(`semilla ${semilla}: ${JSON.stringify(por)} con ${delante} delante y ${encima} corriendo`);
      else {
        expect(enFraseologia(por), `semilla ${semilla}`).toMatch(LLEVA_EL_PORQUE);
        expect(EXPLICA_LA_ESPERA[por.porque]).toBe("vuelo.esperaTurnoDeSalida");
      }
      a.trafico.dispose();
    }
    expect(medidas, "frecuencias con uno corriendo y otro delante").toBeGreaterThan(0);
    expect(malos, malos.join("\n")).toEqual([]);
  });
});
