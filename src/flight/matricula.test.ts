/**
 * El indicativo del otro avión: que cambie, y que sea de donde dice ser.
 *
 * Estaba escrito a mano en las cinco frases de la radio —«Zulu Papa Alfa Bravo
 * Charlie»—, así que en cada vuelo y en cada aeropuerto era el mismo avión. Se
 * vio jugando: «hay unas pocas frases y en cada vuelo dice lo mismo».
 *
 * Y de propina, ZP- es la matrícula de Paraguay: en Tenerife te acompañaba
 * siempre un avión paraguayo.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
import torre from "../../data/voces/torre/manifiesto.json";
import torreCanarias from "../../data/voces/torre-canarias/manifiesto.json";
import instructora from "../../data/voces/instructor/manifiesto.json";
import { recetaDe, type Manifiesto } from "../audio/banco-de-voz";
import {
  calleDicha,
  FONETICO,
  matriculaDe,
  metrosDichos,
  pistaEnPiezas,
  prefijoDe,
  rellenoDe,
  sortearIndicativo,
  vientoEnPiezas,
} from "./matricula";

/** Un azar de mentira, para que lo que monta se pueda comprobar. */
const fijo = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length]!;
};

describe("la matrícula es la del país del aeródromo", () => {
  it("en Paraguay, ZP", () => {
    expect(prefijoDe("SGAS")).toBe("ZP");
    expect(prefijoDe("SGES")).toBe("ZP");
  });

  it("y en España, EC, tanto en Canarias como en la península", () => {
    expect(prefijoDe("GCXO")).toBe("EC");
    expect(prefijoDe("GCLP")).toBe("EC");
    expect(prefijoDe("LECU")).toBe("EC");
  });

  /*
   * Un campo inventado —Yvytu Rape no tiene indicativo OACI— es del país del
   * juego. Es la misma regla que usa `hablaDe` y por el mismo motivo.
   */
  it("y un campo sin indicativo es del país del juego", () => {
    expect(prefijoDe(null)).toBe("ZP");
    expect(prefijoDe(undefined)).toBe("ZP");
    expect(prefijoDe("")).toBe("ZP");
  });
});

describe("el indicativo se monta letra a letra", () => {
  it("empieza por el prefijo del país, dicho en alfabeto", () => {
    const i = sortearIndicativo("SGAS", fijo(0));
    expect(i.letras.slice(0, 2)).toEqual(["zulu", "papa"]);
    expect(i.dicho.startsWith("Zulu Papa ")).toBe(true);
    expect(i.matricula.startsWith("ZP-")).toBe(true);
  });

  it("y en Canarias empieza por Echo Charlie", () => {
    const i = sortearIndicativo("GCXO", fijo(0));
    expect(i.letras.slice(0, 2)).toEqual(["echo", "charlie"]);
    expect(i.matricula.startsWith("EC-")).toBe(true);
  });

  it("y son cinco letras, como una matrícula de verdad", () => {
    const i = sortearIndicativo("SGAS", fijo(0.1, 0.5, 0.9));
    expect(i.letras).toHaveLength(5);
    expect(i.matricula).toMatch(/^[A-Z]{2}-[A-Z]{3}$/);
    expect(i.dicho.split(" ").filter(Boolean)).toHaveLength(5);
  });

  /*
   * Y **cambia**, que es de lo que iba todo esto. Con el azar de verdad, cien
   * sorteos no pueden dar uno solo.
   */
  it("y cambia de un vuelo a otro", () => {
    const vistos = new Set<string>();
    for (let n = 0; n < 100; n++)
      vistos.add(sortearIndicativo("SGAS").matricula);
    expect(vistos.size).toBeGreaterThan(20);
  });

  /*
   * El relleno es lo que hace que veintiséis piezas de una sílaba cubran todos
   * los indicativos posibles. Los nombres de los huecos tienen que ser los
   * mismos que use la receta del pack de voz.
   */
  it("y el relleno nombra las cinco piezas del alfabeto", () => {
    const i = sortearIndicativo("GCXO", fijo(0));
    const r = rellenoDe(i);
    expect(Object.keys(r)).toEqual(["c1", "c2", "c3", "c4", "c5"]);
    expect(r.c1).toBe("fonetico.echo");
    expect(r.c2).toBe("fonetico.charlie");
    for (const pieza of Object.values(r))
      expect(pieza.startsWith("fonetico.")).toBe(true);
  });

  it("y el alfabeto está entero y sin repetidos", () => {
    expect(FONETICO).toHaveLength(26);
    expect(new Set(FONETICO).size).toBe(26);
  });
});

/**
 * Y **tu** avión, que no se sortea: lleva su matrícula pintada.
 *
 * «Al menos una matrícula para cada avión.» Es lo que hace que la radio deje de
 * ser ruido de fondo: cuando dicen tu nombre, te están hablando a vos.
 */
describe("la matrícula de tu avión", () => {
  it("es fija y del país de la flota", () => {
    for (const a of AIRCRAFT) {
      const i = matriculaDe(a.id);
      expect(i.matricula).toMatch(/^ZP-[A-Z]{3}$/);
      expect(i.letras).toHaveLength(5);
      expect(i.letras.slice(0, 2)).toEqual(["zulu", "papa"]);
    }
  });

  it("y cada avión tiene la suya, sin repetir", () => {
    const todas = AIRCRAFT.map((a) => matriculaDe(a.id).matricula);
    expect(new Set(todas).size).toBe(AIRCRAFT.length);
  });

  /*
   * Y **no cambia al cruzar una frontera**, que es como funciona una matrícula
   * de verdad: en Tenerife te llaman «Zulu Papa…» y está bien.
   */
  it("y no cambia por volar en Canarias", () => {
    expect(matriculaDe("jaz-120", "GCXO").matricula).toBe(
      matriculaDe("jaz-120", "SGAS").matricula,
    );
  });

  it("y el Yvága es el ZP-YVA", () => {
    const i = matriculaDe("jaz-120");
    expect(i.matricula).toBe("ZP-YVA");
    expect(i.dicho).toBe("Zulu Papa Yankee Victor Alfa");
  });
});

/**
 * El número de pista, que es lo primero que un piloto lee en su vida.
 */
describe("la pista, dicha por radio", () => {
  it("se dice cifra a cifra, como está pintada", () => {
    const p = pistaEnPiezas("03");
    expect(p?.dicho).toBe("zero three");
    expect(p?.relleno).toEqual({ r1: "cifra.0", r2: "cifra.3" });
    expect(p?.sufijo).toBe("");
  });

  it("y una de una cifra lleva su cero delante", () => {
    expect(pistaEnPiezas("7")?.dicho).toBe("zero seven");
  });

  /*
   * Y «niner», que por una radio con ruido «nine» y «five» se confunden —y en
   * alemán *nein* es que no—. Es de las cosas que suenan a capricho hasta que
   * se sabe por qué.
   */
  it("y el nueve se dice niner", () => {
    expect(pistaEnPiezas("09")?.dicho).toBe("zero niner");
  });

  /*
   * Y el lado, donde hay paralelas: en Gran Canaria, decir «zero three» a secas
   * es no decir cuál de las dos.
   */
  it("y donde hay dos paralelas, de qué lado", () => {
    const p = pistaEnPiezas("03L");
    expect(p?.dicho).toBe("zero three left");
    expect(p?.sufijo).toBe(".L");
    expect(pistaEnPiezas("21R")?.dicho).toBe("two one right");
  });

  it("y lo que no es un número de pista no se inventa", () => {
    expect(pistaEnPiezas(null)).toBe(null);
    expect(pistaEnPiezas("")).toBe(null);
    expect(pistaEnPiezas("ABC")).toBe(null);
  });
});

/*
 * **El viento de la autorización**, como lo da una torre: cifra a cifra, en
 * magnéticos, a la decena, y «calm» cuando no hay.
 */
describe("el viento de la torre", () => {
  it("en magnéticos y a la decena: 050 verdadero con trece al oeste es 060", () => {
    const v = vientoEnPiezas(50, 12, 13);
    expect(v.dicho).toBe("wind zero six zero degrees, one two knots");
    expect(v.relleno.split(" ")).toEqual([
      "viento.wind",
      "cifra.0",
      "cifra.6",
      "cifra.0",
      "viento.degrees",
      "cifra.1",
      "cifra.2",
      "viento.knots",
    ]);
  });

  it("el norte es 360, no 000", () => {
    expect(vientoEnPiezas(358, 8, 0).dicho).toBe(
      "wind three six zero degrees, eight knots",
    );
  });

  it("y el nueve es «niner», como en toda radio", () => {
    expect(vientoEnPiezas(90, 9, 0).dicho).toBe(
      "wind zero niner zero degrees, niner knots",
    );
  });

  it("sin viento, «wind calm»", () => {
    const v = vientoEnPiezas(null, 0, 13);
    expect(v.dicho).toBe("wind calm");
    expect(v.relleno).toBe("viento.wind viento.calm");
  });

  it("y sin dirección fija, «variable» y la fuerza", () => {
    expect(vientoEnPiezas(null, 3, 0).dicho).toBe(
      "wind variable, three knots",
    );
  });

  it("y con las piezas grabadas en las dos torres, que se llaman igual", () => {
    // Cada pieza del relleno tiene que estar en el pack de las dos torres:
    // el hueco no sabe qué torre habla.
    for (const pack of [torre, torreCanarias]) {
      const hay = new Set(Object.keys(pack.piezas));
      for (const v of [
        vientoEnPiezas(40, 15, 4),
        vientoEnPiezas(null, 0, 0),
        vientoEnPiezas(null, 3, 0),
      ])
        for (const p of v.relleno.split(" "))
          expect(hay.has(p), `${pack.voz}: ${p}`).toBe(true);
    }
  });
});

/*
 * **Y la instructora la presenta al empezar**: «Nuestro avión es Zulu Papa
 * Alfa Romeo India. Así nos llama la torre». Con las letras en su voz, para
 * los seis aviones: una matrícula que no se monta la diría la voz del
 * navegador, que es otra persona. Ver `presentarLaMatricula` en `game.ts`.
 */
describe("nuestra matrícula, dicha por la instructora", () => {
  it("se monta grabada para los seis aviones", () => {
    for (const a of AIRCRAFT) {
      const yo = matriculaDe(a.id);
      expect(
        recetaDe(instructora as Manifiesto, "vuelo.nuestroAvion", rellenoDe(yo)),
        `${a.id} ${yo.matricula}`,
      ).not.toBeNull();
    }
  });

  it("y con cualquier matrícula sorteada, también", () => {
    for (let i = 0; i < 26; i++) {
      const yo = sortearIndicativo("GCXO", fijo(i / 26, ((i * 7) % 26) / 26));
      expect(
        recetaDe(instructora as Manifiesto, "vuelo.nuestroAvion", rellenoDe(yo)),
        yo.matricula,
      ).not.toBeNull();
    }
  });
});

describe("la intersección y la pista que queda, como las dice la torre", () => {
  it("nombra la calle con el alfabeto y las cifras una a una", () => {
    expect(calleDicha("A")).toBe("Alfa");
    expect(calleDicha("E-2")).toBe("Echo two");
    expect(calleDicha("b9")).toBe("Bravo niner");
    expect(calleDicha(null)).toBeNull();
    expect(calleDicha("  ")).toBeNull();
  });

  it("redondea a la baja a la centena y dice los miles y los cientos", () => {
    expect(metrosDichos(1234)).toBe("one thousand two hundred");
    expect(metrosDichos(2948)).toBe("two thousand niner hundred");
    expect(metrosDichos(3000)).toBe("three thousand");
    expect(metrosDichos(807)).toBe("eight hundred");
  });
});
