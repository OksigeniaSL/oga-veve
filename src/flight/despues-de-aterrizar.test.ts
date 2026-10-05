/**
 * Los flaps, arriba al dejar la pista y no en la carrera. Ver
 * `despues-de-aterrizar.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  ANTES_DE_EMPEZAR,
  ENTRE_PUNTOS,
  ListaDeDespuesDeAterrizar,
  NADA_DICHO,
  PACIENCIA,
  flapsTrasLaToma,
  listaDe,
  type LecturaDeLaLista,
  type LoDicho,
  type PuntoLeido,
} from "./despues-de-aterrizar";
import type { Fase } from "./vuelo";

/** Recorre una secuencia de fases con su palanca y devuelve lo que tocó. */
function recorrer(pasos: readonly (readonly [Fase, number])[]): string[] {
  let dicho: LoDicho = NADA_DICHO;
  let antes: { fase: Fase | ""; palanca: number } = { fase: "", palanca: 0 };
  const dichos: string[] = [];
  for (const [fase, palanca] of pasos) {
    const r = flapsTrasLaToma(antes, { fase, palanca }, dicho);
    if (r.toca) dichos.push(r.toca);
    dicho = r.dicho;
    antes = { fase, palanca };
  }
  return dichos;
}

describe("después de tocar", () => {
  it("al salir de la pista con los flaps fuera, se recuerda subirlos", () => {
    expect(
      recorrer([
        ["final", 1],
        ["aterrizado", 1],
        ["abandonando", 1],
        ["a-plataforma", 1],
      ]),
    ).toEqual(["alSalir"]);
  });

  it("y si ya se subieron al salir, no se dice nada", () => {
    expect(
      recorrer([
        ["final", 1],
        ["aterrizado", 1],
        ["abandonando", 1],
        ["a-plataforma", 1],
        ["a-plataforma", 0],
        ["en-puesto", 0],
      ]),
    ).toEqual(["alSalir"]);
  });

  it("subirlos corriendo por la pista tiene su porqué, una vez", () => {
    expect(
      recorrer([
        ["final", 1],
        ["aterrizado", 1],
        ["aterrizado", 0],
        ["aterrizado", 1 / 3],
        ["aterrizado", 0],
        ["abandonando", 0],
        ["a-plataforma", 0],
      ]),
    ).toEqual(["enLaCarrera"]);
  });

  it("y llegar al puesto con ellos fuera se nota, sin castigo y una vez", () => {
    expect(
      recorrer([
        ["final", 1],
        ["aterrizado", 1],
        ["abandonando", 1],
        ["a-plataforma", 1],
        ["a-plataforma", 1],
        ["en-puesto", 1],
        ["en-puesto", 1],
      ]),
    ).toEqual(["alSalir", "alPuesto"]);
  });

  it("si se llega al puesto directo desde la pista, no se dicen dos seguidas", () => {
    expect(
      recorrer([
        ["aterrizado", 1],
        ["abandonando", 1],
        ["en-puesto", 1],
      ]),
    ).toEqual(["alSalir"]);
  });

  it("una toma nueva empieza de cero", () => {
    expect(
      recorrer([
        ["aterrizado", 1],
        ["abandonando", 1],
        ["a-plataforma", 1],
        ["rodando", 1],
        ["en-vuelo", 1],
        ["final", 1],
        ["aterrizado", 1],
        ["abandonando", 1],
        ["a-plataforma", 1],
      ]),
    ).toEqual(["alSalir", "alSalir"]);
  });

  it("sin flaps fuera no hay nada que recordar", () => {
    expect(
      recorrer([
        ["aterrizado", 0],
        ["abandonando", 0],
        ["a-plataforma", 0],
        ["en-puesto", 0],
      ]),
    ).toEqual([]);
  });
});

/*
 * **La lista de después del aterrizaje, cada cosa a su ritmo.** «Los flaps los
 * estoy recogiendo ahora, que la instructora no me da ni tiempo a hacerlo
 * todo.» Ver `ListaDeDespuesDeAterrizar`.
 */
describe("la lista de después del aterrizaje", () => {
  const REACTOR = { llevaFlaps: true, aerofrenos: { tope: 1 } };
  const AVIONETA = { llevaFlaps: true, aerofrenos: null };

  /**
   * Un rodaje de vuelta, segundo a segundo, con lo que hace quien vuela
   * mientras tanto. Devuelve lo leído con el segundo en que se leyó.
   */
  function rodar(
    lista: ListaDeDespuesDeAterrizar,
    segundos: number,
    hace: (t: number, leidos: readonly PuntoLeido[]) => Partial<LecturaDeLaLista>,
  ): { t: number; leido: PuntoLeido }[] {
    const fuera: { t: number; leido: PuntoLeido }[] = [];
    const base = { flapsFuera: true, aerofrenosFuera: true, hablando: false, dt: 0.5 };
    lista.paso({ ...base, fase: "aterrizado" });
    lista.paso({ ...base, fase: "abandonando" });
    for (let t = 0; t <= segundos; t += 0.5) {
      const l = { ...base, fase: "a-plataforma" as const, ...hace(t, lista.leidos) };
      const leido = lista.paso(l);
      if (leido) fuera.push({ t, leido });
    }
    return fuera;
  }

  it("en un reactor: aerofrenos, flaps, luces y transpondedor, por ese orden", () => {
    expect(listaDe(REACTOR)).toEqual(["aerofrenos", "flaps", "luces", "transpondedor"]);
    expect(listaDe(AVIONETA)).toEqual(["flaps", "luces", "transpondedor"]);
    expect(listaDe({ llevaFlaps: false, aerofrenos: null })).toEqual(["luces", "transpondedor"]);
  });

  it("no pide lo siguiente hasta que se hace lo anterior", () => {
    const lista = new ListaDeDespuesDeAterrizar(REACTOR);
    // Quien vuela recoge los aerofrenos a los diez segundos y los flaps a los
    // dieciocho: lo de la instructora llega después, de uno en uno.
    const leidos = rodar(lista, 60, (t) => ({
      aerofrenosFuera: t < 10,
      flapsFuera: t < 18,
    }));
    expect(leidos.map((l) => `${l.leido.punto}:${l.leido.como}`)).toEqual([
      "aerofrenos:pide",
      "flaps:pide",
      "luces:hace",
      "transpondedor:hace",
    ]);
    const cuando = Object.fromEntries(leidos.map((l) => [l.leido.punto, l.t]));
    expect(cuando.aerofrenos).toBeGreaterThanOrEqual(ANTES_DE_EMPEZAR - 0.5);
    expect(cuando.flaps).toBeGreaterThanOrEqual(10 + ENTRE_PUNTOS - 0.5);
    expect(cuando.luces).toBeGreaterThanOrEqual(18 + ENTRE_PUNTOS - 0.5);
    expect(cuando.transpondedor! - cuando.luces!).toBeGreaterThanOrEqual(ENTRE_PUNTOS - 0.5);
  });

  it("lo que ya está hecho no se pide", () => {
    const lista = new ListaDeDespuesDeAterrizar(REACTOR);
    // Los aerofrenos se recogieron solos al meter gas para rodar.
    const leidos = rodar(lista, 40, (t) => ({ aerofrenosFuera: false, flapsFuera: t < 9 }));
    expect(leidos.map((l) => l.leido.punto)).toEqual(["flaps", "luces", "transpondedor"]);
  });

  it("y si no se hace, espera un rato razonable y sigue sin insistir", () => {
    const lista = new ListaDeDespuesDeAterrizar(AVIONETA);
    const leidos = rodar(lista, 60, () => ({ flapsFuera: true }));
    expect(leidos.map((l) => l.leido.punto)).toEqual(["flaps", "luces", "transpondedor"]);
    const flaps = leidos[0]!.t;
    expect(leidos[1]!.t - flaps).toBeGreaterThanOrEqual(PACIENCIA + ENTRE_PUNTOS - 0.5);
  });

  it("con alguien hablando, el punto siguiente espera a que acabe", () => {
    const lista = new ListaDeDespuesDeAterrizar(AVIONETA);
    const leidos = rodar(lista, 40, (t) => ({ flapsFuera: false, hablando: t < 20 }));
    expect(leidos[0]!.t).toBeGreaterThanOrEqual(20);
  });

  it("y en la pista no se lee nada: primero, dejarla libre", () => {
    const lista = new ListaDeDespuesDeAterrizar(REACTOR);
    const base = { flapsFuera: true, aerofrenosFuera: true, hablando: false, dt: 1 };
    lista.paso({ ...base, fase: "aterrizado" });
    for (let i = 0; i < 60; i++) expect(lista.paso({ ...base, fase: "abandonando" })).toBeNull();
  });
});
