/**
 * **Lo que la torre le dice al tráfico que remonta y al que retiene.**
 *
 * - El que remonta la pista para salir oía «line up and wait», que es entrar
 *   y esperar en el eje. Lo que se le dice es «backtrack runway» y su número
 *   (Doc 4444, 12.3.4.7 p), y la salida cuando se ha dado la vuelta: en la
 *   frecuencia va por el guion de la espera, que es el que sujeta la pista
 *   mientras la remonta.
 * - El que la torre no deja salir de su puesto no llamaba. Ahora llama y se le
 *   contesta que espere, una vez por retención y solo con voz grabada: un
 *   AFIS le da la pista en uso y el tráfico que aterriza, que está grabado; el
 *   «hold position» de una torre espera su toma.
 *
 * Ver `remonta` y `RETENIDO` en `flight/radio.ts`, y `AL_QUE_REMONTA` en
 * `audio/torre.ts`.
 */

import { describe, expect, it } from "vitest";
import manifiesto from "../../data/voces/torre/manifiesto.json";
import canarias from "../../data/voces/torre-canarias/manifiesto.json";
import { recetaDe, type Manifiesto } from "../audio/banco-de-voz";
import {
  AL_QUE_REMONTA,
  claveDeTorre,
  DICE_LA_TORRE,
  EN_UN_AFIS,
  ESPERAN_SU_TOMA,
  NOMBRA_LA_PISTA,
  PISTA_DETRAS,
} from "../audio/torre";
import {
  EMPIEZA_A_RODAR,
  Frecuencia,
  GUIONES,
  RETENIDO,
  type Momento,
  type Transmision,
} from "./radio";

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

const TRANQUILO: Momento = { fase: "rodando", deDia: true, instructorHablando: false };

/** Lo que dice ese avión, y lo que le dicen, en `segundos`. */
function deUno(
  radio: Frecuencia,
  matricula: string,
  segundos: number,
  m: (t: number) => Momento = () => TRANQUILO,
): Transmision[] {
  const oido: Transmision[] = [];
  for (let t = 0; t < segundos; t += 0.5) {
    const dice = radio.update(0.5, m(t));
    if (dice && dice.de.matricula === matricula) oido.push(dice);
  }
  return oido;
}

const YO = {
  c1: "fonetico.echo",
  c2: "fonetico.charlie",
  c3: "fonetico.alfa",
  c4: "fonetico.romeo",
  c5: "fonetico.sierra",
};
const PISTA = { r1: "cifra.3", r2: "cifra.4" };

describe("al que remonta, «backtrack runway»", () => {
  it("se dice por su texto, con la pista detrás y en las dos voces, con cada lado", () => {
    expect(claveDeTorre("backtrack runway")).toBe("torre.backtrack");
    expect(DICE_LA_TORRE["torre.backtrack"]).toBe("backtrack runway");
    expect(PISTA_DETRAS.has("torre.backtrack")).toBe(true);
    expect(NOMBRA_LA_PISTA.has("torre.backtrack")).toBe(true);
    expect(AL_QUE_REMONTA["torre.lineUpWait"]).toBe("torre.backtrack");
    for (const lado of ["", ".L", ".C", ".R"]) {
      expect(recetaDe(manifiesto as Manifiesto, `torre.backtrack${lado}`, { ...YO, ...PISTA })).not.toBeNull();
      expect(
        recetaDe(canarias as Manifiesto, `torre.canario.backtrack${lado}`, { ...YO, ...PISTA }),
      ).not.toBeNull();
    }
  });

  it("y un AFIS no se la da: quien vuela dice lo que hace", () => {
    expect(EN_UN_AFIS["torre.backtrack"]).toBeNull();
  });

  it("el que remonta va por el guion de la espera: la pista para remontarla, y la salida al darse la vuelta", () => {
    const radio = new Frecuencia(dados(7), "GCHI");
    radio.remonta = () => true;
    const m = radio.sacarARodar()!;
    const claves = deUno(radio, m, 600).map((d) => d.clave);
    expect(claves).toEqual([
      "otro.buenosDias",
      "torre.holdShort",
      "torre.lineUpWait",
      "torre.clearedTakeoff",
    ]);
  });

  it("y el que entra y despega desde donde entra, como siempre: sin esperar en el eje", () => {
    const radio = new Frecuencia(dados(7), "GCHI");
    const m = radio.sacarARodar()!;
    const claves = deUno(radio, m, 600).map((d) => d.clave);
    expect(claves).toEqual(["otro.buenosDias", "torre.holdShort", "torre.clearedTakeoff"]);
    // Y los dos guiones son el mismo hasta la doble raya, que es lo que deja cambiar sin mover el paso.
    expect(GUIONES.sale.slice(0, 2)).toEqual(GUIONES.espera.slice(0, 2));
  });
});

describe("al que la torre no deja salir de su puesto", () => {
  it("un AFIS le da la pista en uso y el tráfico que aterriza, que está grabado en las dos voces", () => {
    expect(EN_UN_AFIS[RETENIDO]).toBe("torre.afisInUseLanding");
    expect(recetaDe(manifiesto as Manifiesto, "torre.afisInUseLanding", { ...YO, ...PISTA })).not.toBeNull();
    expect(
      recetaDe(canarias as Manifiesto, "torre.canario.afisInUseLanding", { ...YO, ...PISTA }),
    ).not.toBeNull();
  });

  it("y el «hold position» de una torre espera su toma", () => {
    expect(claveDeTorre("hold position, landing traffic")).toBe(RETENIDO);
    expect(ESPERAN_SU_TOMA.has(RETENIDO)).toBe(true);
    expect(recetaDe(manifiesto as Manifiesto, RETENIDO, YO)).toBeNull();
  });

  it("con voz: llama, se le contesta que espere, y sin pasar de paso en su guion", () => {
    const radio = new Frecuencia(dados(11), "SGPI");
    radio.sabeRetener = () => true;
    const m = radio.sacarARodar()!;
    const retenido: Momento = { ...TRANQUILO, retenidos: new Set([m]) };
    const oido = deUno(radio, m, 400, () => retenido);
    expect(oido.map((d) => [d.voz, d.clave, !!d.enSuPuesto, d.respuesta])).toEqual([
      ["otro", "otro.buenosDias", true, false],
      ["torre", RETENIDO, true, true],
    ]);
    // Lo que le toca sigue siendo rodar: lo dirá al soltarle.
    expect(radio.loQueToca(m)).toEqual({ clave: EMPIEZA_A_RODAR, primera: true });
    // Suelto, llama otra vez —ya sin los buenos días— y sigue su guion.
    const despues = deUno(radio, m, 400).map((d) => [d.clave, !!d.enSuPuesto]);
    expect(despues.slice(0, 2)).toEqual([
      ["otro.rodando", false],
      ["torre.holdShort", false],
    ]);
  });

  it("una vez por retención: retenido otra vez después, vuelve a llamar", () => {
    const radio = new Frecuencia(dados(11), "SGPI");
    radio.sabeRetener = () => true;
    const m = radio.sacarARodar()!;
    const retenido: Momento = { ...TRANQUILO, retenidos: new Set([m]) };
    // La llamada y la respuesta llegan en segundos; lo siguiente suyo, en más de medio minuto.
    expect(deUno(radio, m, 20, () => retenido)).toHaveLength(2);
    // Suelto un instante, sin que le toque hablar todavía, y retenido otra vez.
    radio.update(0.5, TRANQUILO);
    expect(deUno(radio, m, 400, () => retenido).map((d) => d.clave)).toEqual([
      "otro.rodando",
      RETENIDO,
    ]);
  });

  it("sin voz, ni llama ni se le contesta, como antes", () => {
    const radio = new Frecuencia(dados(11), "SGPI");
    const m = radio.sacarARodar()!;
    const retenido: Momento = { ...TRANQUILO, retenidos: new Set([m]) };
    expect(deUno(radio, m, 400, () => retenido)).toEqual([]);
    expect(deUno(radio, m, 400).map((d) => d.clave).slice(0, 2)).toEqual([
      "otro.buenosDias",
      "torre.holdShort",
    ]);
  });
});
