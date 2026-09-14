/**
 * Que la comandante hable cuando toca y se calle cuando no.
 *
 * Lo que se comprueba aquí no es el texto: es **el momento**. Una megafonía que
 * saluda con el avión en el aire, o que repite la bienvenida cada vez que se
 * pasa por «rodando», no suena a vuelo: suena a máquina.
 */
import { describe, expect, it } from "vitest";
import { Megafonia, conPasaje } from "./megafonia";
import type { Fase } from "../flight/vuelo";

const CON_PASAJE = { conPasaje: true, instructorHablando: false };

/** Corre unos segundos en una fase y devuelve lo que se dijo. */
function correr(m: Megafonia, fase: Fase, segundos: number, extra = {}) {
  const dichos: string[] = [];
  for (let t = 0; t < segundos; t += 0.5) {
    const dice = m.paso(0.5, { fase, ...CON_PASAJE, ...extra });
    if (dice) dichos.push(dice);
  }
  return dichos;
}

describe("la megafonía de cabina", () => {
  it("saluda al pasaje mientras se rueda", () => {
    const m = new Megafonia();
    expect(correr(m, "rodando", 12)).toEqual(["capitana.bienvenida"]);
  });

  it("pero no en el primer segundo, que ahí habla la instructora", () => {
    const m = new Megafonia();
    expect(correr(m, "rodando", 3)).toEqual([]);
  });

  it("y no repite lo ya dicho aunque se vuelva a la misma fase", () => {
    const m = new Megafonia();
    correr(m, "rodando", 12);
    correr(m, "esperando", 6);
    expect(correr(m, "rodando", 12)).toEqual([]);
  });

  it("no habla por encima de la instructora", () => {
    const m = new Megafonia();
    expect(correr(m, "rodando", 12, { instructorHablando: true })).toEqual([]);
  });

  it("y si el momento se pasa, ese anuncio ya no se dice", () => {
    const m = new Megafonia();
    // Media fase entera con la instructora hablando: el momento se va.
    correr(m, "rodando", 40, { instructorHablando: true });
    expect(correr(m, "rodando", 10)).toEqual([]);
  });

  it("dice lo suyo en cada fase del vuelo, y en orden", () => {
    const m = new Megafonia();
    const todo = [
      ...correr(m, "rodando", 10),
      ...correr(m, "autorizado", 10),
      ...correr(m, "alineando", 10),
      ...correr(m, "en-vuelo", 10),
      ...correr(m, "final", 10),
      ...correr(m, "abandonando", 10),
    ];
    expect(todo).toEqual([
      "capitana.bienvenida",
      "capitana.crosscheck",
      "capitana.despegue",
      "capitana.crucero",
      "capitana.descenso",
      "capitana.llegada",
    ]);
  });

  it("y en un vuelo entero habla seis veces y ni una más", () => {
    const m = new Megafonia();
    let veces = 0;
    for (const fase of [
      "estacionado",
      "arrancando",
      "rodando",
      "esperando",
      "autorizado",
      "alineando",
      "despegando",
      "comprometido",
      "en-vuelo",
      "final",
      "aterrizado",
      "abandonando",
      "a-plataforma",
      "en-puesto",
    ] as Fase[]) {
      veces += correr(m, fase, 30).length;
    }
    expect(veces).toBe(6);
  });

  it("un vuelo nuevo la vuelve a dejar hablar", () => {
    const m = new Megafonia();
    correr(m, "rodando", 10);
    m.reiniciar();
    expect(correr(m, "rodando", 10)).toEqual(["capitana.bienvenida"]);
  });
});

describe("quién lleva megafonía", () => {
  it("los que llevan pasaje", () => {
    // Turbohélice, reactor regional y de fuselaje ancho.
    expect(conPasaje(7200)).toBe(true);
    expect(conPasaje(35000)).toBe(true);
    expect(conPasaje(255826)).toBe(true);
  });

  it("y no una avioneta, que no tiene a quién hablarle", () => {
    expect(conPasaje(1100)).toBe(false);
    expect(conPasaje(1500)).toBe(false);
    expect(conPasaje(2100)).toBe(false);
  });
});
