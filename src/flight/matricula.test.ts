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
import { FONETICO, prefijoDe, rellenoDe, sortearIndicativo } from "./matricula";

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
