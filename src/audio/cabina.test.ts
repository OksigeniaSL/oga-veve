/**
 * Que no sobre ninguna grabación de cabina.
 *
 * Es la prueba que faltaba el día que se grabaron veintiuna frases de cabina y
 * no sonó ninguna: el código las pedía por su texto en inglés y el pack las
 * guardaba por clave, y nadie unía las dos cosas. Una receta del manifiesto a
 * la que no apunta la tabla es una frase grabada, horneada, publicada, bajada a
 * cada tablet y tirada.
 */

import { describe, expect, it } from "vitest";
import manifiesto from "../../data/voces/cabina/manifiesto.json";
import fuenteDelJuego from "../game.ts?raw";
import { AIRCRAFT, ARAI, ARASUNU, PANAMBI, PYKASU } from "../flight/aircraft";
import {
  ESCALONES,
  ESCALONES_EN_PIES,
} from "../flight/avisos-de-altura";
import {
  CLAVE_DE_CABINA,
  claveDeCabina,
  DE_LOS_AVISADORES,
  loDiceElAvion,
} from "./cabina";

/**
 * Lo que el juego pide cantar: los textos en inglés que se le pasan a
 * `cantar`, sacados del propio `game.ts`. Se lee el primer argumento de cada
 * llamada hasta su coma, que puede ser un literal o un ternario con dos.
 */
function loQueCantaElJuego(): string[] {
  const salida: string[] = [];
  let desde = 0;
  for (;;) {
    const i = fuenteDelJuego.indexOf("this.cantar(", desde);
    if (i < 0) break;
    desde = i + 1;
    let j = i + "this.cantar(".length;
    let hondo = 0;
    let en: string | null = null;
    let primero = "";
    for (; j < fuenteDelJuego.length; j++) {
      const c = fuenteDelJuego[j]!;
      if (en) {
        if (c === en) en = null;
      } else if (c === '"' || c === "'" || c === "`") en = c;
      else if (c === "(") hondo++;
      else if (c === ")") {
        if (hondo === 0) break;
        hondo--;
      } else if (c === "," && hondo === 0) break;
      primero += c;
    }
    // Los literales que son lo que se dice: el argumento entero, o las dos
    // ramas de un ternario. Los de la condición —`veredicto === "rapido"`— no.
    for (const m of primero.trim().matchAll(/(?:^|[?:])\s*"([^"]+)"/g))
      salida.push(m[1]!);
  }
  return salida;
}

describe("los cantos de cabina", () => {
  const grabadas = Object.keys(
    (manifiesto as { recetas: Record<string, unknown> }).recetas,
  );

  it("cada grabación de cabina la pide alguien", () => {
    const apuntadas = new Set(Object.values(CLAVE_DE_CABINA));
    expect(grabadas.filter((c) => !apuntadas.has(c))).toEqual([]);
  });

  it("y la tabla no apunta a grabaciones que no existen", () => {
    const hay = new Set(grabadas);
    expect(Object.values(CLAVE_DE_CABINA).filter((c) => !hay.has(c))).toEqual(
      [],
    );
  });

  it("reconoce la llamada tal y como la pide el juego", () => {
    expect(claveDeCabina("V one")).toBe("cabina.v1");
    expect(claveDeCabina("rotate")).toBe("cabina.vr");
    expect(claveDeCabina("five hundred")).toBe("cabina.fiveHundred");
  });

  it("y la reconoce con cola, que es como salen dos de ellas", () => {
    expect(claveDeCabina("go around, runway occupied")).toBe(
      "cabina.goAroundOrder",
    );
    expect(claveDeCabina("go around")).toBe("cabina.goAroundOrder");
  });

  it("y la orden de frustrar no suena con el elogio de después", () => {
    /*
     * `cabina.goAround` se grabó con «going around. good decision», y la
     * orden «go around» apuntaba a ella: en el peldaño de cabina, al mandar
     * frustrar, se oía el elogio antes de que nadie hiciera nada.
     */
    expect(claveDeCabina("going around. good decision")).toBe(
      "cabina.goAround",
    );
    expect(claveDeCabina("go around")).not.toBe(
      claveDeCabina("going around. good decision"),
    );
  });

  it("y «too low» no se queda con «too low, climb»", () => {
    expect(claveDeCabina("too low")).toBe("cabina.tooLow");
    expect(claveDeCabina("too low, climb")).toBe("cabina.tooLowClimb");
  });

  it("lo que el juego no dice se queda sin clave", () => {
    /*
     * **Y el ejemplo dejó de moverse, que costó cuatro vueltas.**
     *
     * Esta prueba usaba como ejemplo frases «todavía sin grabar», y fallaba
     * cada vez que alguien hacía su trabajo: cayó con «minimums», con «sink
     * rate» y con «positive rate». Falló bien —avisaba de que el ejemplo
     * caducaba— pero un ejemplo que caduca cada semana es un ejemplo mal
     * elegido.
     *
     * Ahora son dos que **no van a estar**, y por decisión y no por pereza:
     *
     * - «retard» es la llamada del autoempuje de un Airbus, y este juego no
     *   modela autoempuje. La regla de la casa es que un aviso sonoro solo se
     *   pone en un avión que lo llevaría; sin autoempuje sería decoración.
     * - «cleared to land» es de la torre, no de la cabina: tiene su propia
     *   voz, su propia tabla y su propio pack.
     *
     * Lo que se comprueba, entonces, es lo de siempre y mejor dicho: esta
     * tabla es para lo que **esta** cabina canta, y no un cajón donde meter
     * frases de aviación.
     */
    expect(claveDeCabina("retard")).toBe(null);
    expect(claveDeCabina("cleared to land")).toBe(null);
  });

  /*
   * **Y todo lo que el juego canta en inglés tiene su toma**, o está aquí
   * dicho por qué no.
   *
   * «Four hundred→sin clave», «airspeed low→navegador(sin voz)»: cantos que
   * el juego pedía y el pack no tenía, y que por eso decía el sintetizador del
   * navegador —o nadie, donde no hay voces instaladas—. Una tabla escrita a
   * mano se queda atrás en cuanto alguien añade un canto; ésta se lee del
   * propio `game.ts`.
   */
  it("cada canto que pide el juego tiene toma de cabina", () => {
    /*
     * Los que no la tienen a propósito: no son cantos de ninguna cabina de
     * verdad —un elogio, un consejo— y en el peldaño de cabina los dice la
     * instructora con su grabación. Y «cleared to land» es de la torre.
     */
    const SIN_TOMA_A_PROPOSITO = new Set([
      "on the glide path",
      "flaps",
      "cleared to land",
    ]);
    const pedidos = [
      ...loQueCantaElJuego(),
      ...ESCALONES.map((e) => e.dice),
      ...ESCALONES_EN_PIES.map((e) => e.dice),
    ];
    // Y que el lector vea lo que tiene que ver, ramas de ternario incluidas:
    // una regla de medir que no ve nada da siempre verde.
    expect(pedidos).toEqual(
      expect.arrayContaining([
        "airspeed low",
        "stall, stall",
        "going around. good decision",
        "too fast",
        "off the runway",
        "go around, runway occupied",
        "too low, climb",
      ]),
    );
    const sinToma = pedidos.filter(
      (p) => !claveDeCabina(p) && !SIN_TOMA_A_PROPOSITO.has(p),
    );
    expect(sinToma).toEqual([]);
  });

  it("y la cuenta de la toma en casa tiene su clave, que sin ella no suena", () => {
    for (const e of [...ESCALONES, ...ESCALONES_EN_PIES])
      expect(e.clave, e.dice).toBe(`cuenta.${e.encasa}`);
  });
});

/*
 * **Qué avión canta qué.** Un aviso sonoro solo se pone en un avión que lo
 * llevaría: la cuenta del radioaltímetro, el «terrain» o el «stall, stall»
 * los dice una caja que lleva el de transporte y no la avioneta de escuela.
 */
describe("los cantos de cada avión", () => {
  it("la avioneta de escuela no lleva radioaltímetro que cante", () => {
    expect(loDiceElAvion("cabina.fifty", PYKASU)).toBe(false);
    expect(loDiceElAvion("cabina.terrainPullUp", PYKASU)).toBe(false);
    expect(loDiceElAvion("cabina.stall", PYKASU)).toBe(false);
  });

  it("ni el bimotor de pistón, aunque meta el tren", () => {
    expect(loDiceElAvion("cabina.fiveHundred", PANAMBI)).toBe(false);
    // Y lo que dice quien vuela, sí: «gear up» no lo dice una caja.
    expect(loDiceElAvion("cabina.gearUp", PANAMBI)).toBe(true);
  });

  it("el turbohélice de pasaje y los reactores, sí", () => {
    for (const a of [ARASUNU, ARAI])
      for (const clave of DE_LOS_AVISADORES)
        expect(loDiceElAvion(clave, a), `${a.id} ${clave}`).toBe(true);
  });

  it("y el «traffic, traffic» lo canta quien lleva TCAS, y nadie más", () => {
    for (const a of AIRCRAFT)
      expect(loDiceElAvion("cabina.traffic", a), a.id).toBe(a.tcas !== null);
  });

  it("y los de la tripulación los canta cualquiera", () => {
    for (const a of AIRCRAFT) expect(loDiceElAvion("cabina.vr", a)).toBe(true);
  });

  it("y todo lo de los avisadores está grabado", () => {
    const grabadas = new Set(Object.values(CLAVE_DE_CABINA));
    for (const c of DE_LOS_AVISADORES) expect(grabadas.has(c), c).toBe(true);
  });
});
