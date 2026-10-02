/**
 * **Lo que nombra la radio está en el mundo cuando lo nombra.**
 *
 * La frecuencia y el dibujo llevaban la cuenta cada uno por su lado: el
 * dibujo retiraba a quien se cansaba de esperar en su doble raya o se quedaba
 * quieto en la pista, y la frecuencia seguía con él. Jugando se vio así: la
 * torre te dejaba esperando «por un avión en la pista» que no estaba, y al
 * rato aparecía de la nada a mitad de pista; en el Chaco el AFIS daba
 * «tráfico aterrizando» y no aterrizaba nadie.
 *
 * Aquí, con una frecuencia de verdad y un dibujo que olvida aviones como el
 * del juego, se comprueba lo que pide la regla: cada vez que la radio nombra
 * a un tráfico —lo dice él, se lo dicen a él, o es por quien se espera—, ese
 * tráfico está dibujado.
 */
import { describe, expect, it } from "vitest";
import { Boca } from "../audio/boca";
import { Frecuencia } from "./radio";
import { TurnoDePista, type DibujoDelTurno } from "./turno-de-pista";

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/**
 * Un dibujo como el del juego en lo que importa aquí: pone a cada uno al
 * nombrarlo —salvo con las llamadas que no tienen sitio, como el «hold short»
 * a otro— y **lo olvida** de vez en cuando, que es lo que hace el de verdad
 * con el que espera demasiado. `olvidaCada` segundos se lleva al más antiguo.
 *
 * Y apunta lo que no puede pasar: que a uno ya olvidado se le vuelva a poner
 * porque la radio lo nombra. Eso es el avión que aparece «de la nada a mitad
 * de pista».
 */
function dibujoQueOlvida(olvidaCada: number): DibujoDelTurno & {
  dibujados: Set<string>;
  reaparecidos: string[];
} {
  const dibujados = new Set<string>();
  const olvidados = new Set<string>();
  const reaparecidos: string[] = [];
  let reloj = 0;
  let ultimo = 0;
  return {
    dibujados,
    reaparecidos,
    anuncia(matricula, clave) {
      if (clave === "torre.holdShort") return;
      if (olvidados.has(matricula)) reaparecidos.push(matricula);
      olvidados.delete(matricula);
      dibujados.add(matricula);
    },
    paso(dt) {
      reloj += dt;
      if (reloj - ultimo >= olvidaCada && dibujados.size) {
        ultimo = reloj;
        const primero = dibujados.values().next().value;
        if (primero) {
          dibujados.delete(primero);
          olvidados.add(primero);
        }
      }
      return [];
    },
    todaviaNo: () => false,
    enFinal: () => null,
    ocupanLaPista: () => [],
    dibujado: (m) => dibujados.has(m),
  };
}

function montar(radio: Frecuencia, dibujo: DibujoDelTurno) {
  const boca = new Boca({ ahora: () => 0, cancelar: () => {} });
  return new TurnoDePista({
    radio,
    boca,
    trafico: () => dibujo,
    torre: () => true,
    privado: () => false,
    alUmbral: () => 1800,
    alto: () => 90,
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
  });
}

/** Las fases de un vuelo, una detrás de otra: rodar, esperar, volar. */
const FASES = ["rodando", "esperando", "en-vuelo", "final", "abandonando"];

describe("una sola fuente: la radio y el dibujo", () => {
  it("cada avión que se nombra está dibujado, y nadie reaparece al nombrarlo", () => {
    let nombrados = 0;
    let porQuien = 0;
    for (let semilla = 1; semilla <= 40; semilla++) {
      const radio = new Frecuencia(dados(semilla), "GCXO");
      const dibujo = dibujoQueOlvida(170);
      const turno = montar(radio, dibujo);
      const resucitados: string[] = [];
      for (let t = 0; t < 3000; t += 0.5) {
        // Cada cinco minutos, otra fase del vuelo.
        const fase = FASES[Math.floor(t / 300) % FASES.length]!;
        /*
         * Reaparecer es que vuelva **el mismo vuelo**: uno que iba por la
         * mitad. Uno nuevo puede caer con una matrícula que ya sonó —se
         * sortean—, y ése no es un fantasma: es otro avión.
         */
        const aMedias = new Set(radio.aMedias);
        const antes = dibujo.reaparecidos.length;
        const dice = turno.oir(0.5, { fase, deDia: true, instructorHablando: false });
        for (const m of dibujo.reaparecidos.slice(antes))
          if (aMedias.has(m)) resucitados.push(`${m} a los ${t} s`);
        if (dice) {
          nombrados++;
          expect(
            dibujo.dibujados.has(dice.de.matricula),
            `${dice.clave} de ${dice.de.matricula}`,
          ).toBe(true);
        }
        // Y por quién se espera, o de quién informa un AFIS: también está.
        for (const por of [turno.porQueEsperasDe, turno.traficoConocidoDe])
          if (por?.matricula) {
            porQuien++;
            expect(
              dibujo.dibujados.has(por.matricula),
              `${por.porque} por ${por.matricula}`,
            ).toBe(true);
          }
      }
      expect(resucitados, `semilla ${semilla}`).toEqual([]);
    }
    // Y la prueba no es de escaparate: se nombró a cientos, y se esperó.
    expect(nombrados).toBeGreaterThan(200);
    expect(porQuien).toBeGreaterThan(100);
  });

  it("quien no se puede dibujar no habla, y deja la frecuencia", () => {
    const radio = new Frecuencia(dados(7), "GCXO");
    const nadie: DibujoDelTurno = {
      anuncia: () => {},
      paso: () => [],
      todaviaNo: () => false,
      enFinal: () => null,
      ocupanLaPista: () => [],
      dibujado: () => false,
    };
    const turno = montar(radio, nadie);
    for (let t = 0; t < 1200; t += 0.5)
      expect(turno.oir(0.5, { fase: "rodando", deDia: true, instructorHablando: false })).toBeNull();
    expect(turno.porQueEsperas).toBeNull();
    expect(turno.traficoConocido).toBeNull();
  });

  it("y sin dibujo que mirar —las pruebas que no lo montan—, como siempre", () => {
    const radio = new Frecuencia(dados(7), "GCXO");
    const boca = new Boca({ ahora: () => 0, cancelar: () => {} });
    const turno = new TurnoDePista({
      radio,
      boca,
      trafico: () => null,
      torre: () => true,
      privado: () => false,
      alUmbral: () => 1800,
      alto: () => 90,
      decirAOtro: () => null,
      autorizarte: () => {},
      mandarteAlAire: () => {},
    });
    let dichas = 0;
    for (let t = 0; t < 600; t += 0.5)
      if (turno.oir(0.5, { fase: "rodando", deDia: true, instructorHablando: false })) dichas++;
    expect(dichas).toBeGreaterThan(3);
  });
});
