/**
 * La voz de la máquina, probada sin navegador.
 *
 * Igual que la boca: aquí no suena nada, se apunta qué empieza a sonar, qué
 * se corta y qué se tira, y los finales se dan a mano.
 */

import { describe, expect, it } from "vitest";
import { CADUCA, VozDeLaMaquina, prioridadDe } from "./maquina";
import { DE_LA_CUENTA } from "./cabina";

function cabina(sinToma: readonly string[] = []) {
  let reloj = 0;
  const empieza: string[] = [];
  const cortadas: string[] = [];
  const acabar: Record<string, () => void> = {};
  const maquina = new VozDeLaMaquina({
    ahora: () => reloj,
    tocar(clave, alAcabar) {
      if (sinToma.includes(clave)) return null;
      empieza.push(clave);
      acabar[clave] = alAcabar;
      return () => {
        cortadas.push(clave);
        // Como el motor de audio: al cortar también avisa de que acabó.
        alAcabar();
      };
    },
  });
  return {
    maquina,
    empieza,
    cortadas,
    acabar,
    pasa: (ms: number) => void (reloj += ms),
  };
}

describe("la cuenta no espera a nadie", () => {
  it("lo que llega sin nada sonando, suena ya", () => {
    const c = cabina();
    expect(c.maquina.decir("cabina.oneHundred")).toBe("suena");
    expect(c.empieza).toEqual(["cabina.oneHundred"]);
  });

  /*
   * Si todavía suena «twenty» cuando toca «ten», lo que hay que oír es
   * «ten»: decir los dos seguidos es contar el pasado, y encima tarde.
   */
  it("un número corta al anterior: el siguiente lo sustituye", () => {
    const c = cabina();
    c.maquina.decir("cabina.thirty");
    c.maquina.decir("cabina.twenty");
    c.maquina.decir("cabina.ten");
    expect(c.empieza).toEqual(["cabina.thirty", "cabina.twenty", "cabina.ten"]);
    expect(c.cortadas).toEqual(["cabina.thirty", "cabina.twenty"]);
  });

  /*
   * **Y un aviso de peligro no lo pisa un número.** Medido en Gran Canaria
   * cuando la cuenta y los avisos iban por la misma cola: «sink rate» se
   * cayó cuatro veces porque llegaba un número detrás.
   */
  it("con un aviso sonando, el número se pierde, y no espera", () => {
    const c = cabina();
    c.maquina.decir("cabina.sinkRate");
    expect(c.maquina.decir("cabina.oneHundred")).toBe("no");
    c.acabar["cabina.sinkRate"]!();
    // Y al acabar el aviso no sale tarde: ya no es verdad.
    expect(c.empieza).toEqual(["cabina.sinkRate"]);
  });

  it("y un aviso corta a un número", () => {
    const c = cabina();
    c.maquina.decir("cabina.fifty");
    expect(c.maquina.decir("cabina.terrainPullUp")).toBe("suena");
    expect(c.cortadas).toEqual(["cabina.fifty"]);
  });

  it("todos los números mandan lo mismo, y menos que cualquier aviso", () => {
    for (const n of DE_LA_CUENTA) {
      expect(prioridadDe(n), n).toBe(0);
      expect(prioridadDe("cabina.traffic")).toBeGreaterThan(prioridadDe(n));
    }
  });
});

describe("entre avisos manda el más importante", () => {
  it("el que manda más corta al que suena", () => {
    const c = cabina();
    c.maquina.decir("cabina.traffic");
    expect(c.maquina.decir("cabina.terrainPullUp")).toBe("suena");
    expect(c.cortadas).toEqual(["cabina.traffic"]);
  });

  it("el que manda menos espera a que acabe, y suena detrás", () => {
    const c = cabina();
    c.maquina.decir("cabina.terrainPullUp");
    expect(c.maquina.decir("cabina.traffic")).toBe("espera");
    c.pasa(1500);
    c.acabar["cabina.terrainPullUp"]!();
    expect(c.empieza).toEqual(["cabina.terrainPullUp", "cabina.traffic"]);
  });

  it("pero si espera demasiado ya no describe nada, y no suena", () => {
    const c = cabina();
    c.maquina.decir("cabina.terrainPullUp");
    c.maquina.decir("cabina.traffic");
    c.pasa(CADUCA + 1);
    c.acabar["cabina.terrainPullUp"]!();
    expect(c.empieza).toEqual(["cabina.terrainPullUp"]);
  });
});

describe("y detrás, la instructora", () => {
  it("lo explica cuando la máquina termina, no a la vez", () => {
    const c = cabina();
    const oido: string[] = [];
    c.maquina.decir("cabina.sinkRate", () => oido.push("explica"));
    expect(oido).toEqual([]);
    c.acabar["cabina.sinkRate"]!();
    expect(oido).toEqual(["explica"]);
  });

  it("y si al aviso lo corta otro, no explica lo que ya no pasa", () => {
    const c = cabina();
    const oido: string[] = [];
    c.maquina.decir("cabina.traffic", () => oido.push("tráfico"));
    c.maquina.decir("cabina.stall", () => oido.push("pérdida"));
    c.acabar["cabina.stall"]!();
    expect(oido).toEqual(["pérdida"]);
  });

  it("si no hay toma que tocar, quien pidió se entera", () => {
    const c = cabina(["cabina.sinkRate"]);
    expect(c.maquina.decir("cabina.sinkRate")).toBe("no");
    expect(c.maquina.ocupada).toBe(false);
  });

  it("y callar al empezar otro vuelo no explica nada", () => {
    const c = cabina();
    const oido: string[] = [];
    c.maquina.decir("cabina.sinkRate", () => oido.push("explica"));
    c.maquina.callar();
    expect(oido).toEqual([]);
    expect(c.maquina.ocupada).toBe(false);
  });
});
