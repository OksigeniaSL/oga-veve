/**
 * No se riñe a nadie por lo que hace otro.
 *
 * En Guyrami el juego lleva el avión por el suelo: el tope de rodaje cierra el
 * gas y frena a la velocidad que dice el plan. Y a la vez la instructora
 * juzgaba esa velocidad como si fuera de quien juega. Contado jugando en
 * Fuerteventura, en el peldaño de los cuatro años: «que si más despacio, que
 * si "te pasaste" que si "frená y volvé" y el avión se mueve solo y coge
 * curvas solo».
 *
 * Los avisos de velocidad en tierra preguntan ahora a `laVelocidadEsDelJuego`
 * antes de hablar, y el tope decide con la misma función. Lo que se prueba
 * aquí es eso: que la pregunta contesta lo que hace el tope, caso por caso, y
 * que en los peldaños donde quien juega lleva el gas se le sigue avisando.
 */

import { describe, expect, it } from "vitest";
import { laVelocidadEsDelJuego, limitarElRodaje } from "./tope-de-rodaje";
import { GUYRAMI, TAGUATO, TIERS, TUKA, type Tier } from "./tiers";
import type { Fase } from "./vuelo";

function estado(
  velocidad: number,
  { enPista = false, enElSuelo = true } = {},
): never {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: -velocidad },
    heading: 0,
    airspeed: velocidad,
    groundSpeed: velocidad,
    verticalSpeed: 0,
    onGround: enElSuelo,
    onRunway: enPista,
  } as never;
}

function vista(fase: Fase, luzVerde = false): never {
  return {
    fase,
    clave: "",
    icono: "",
    luzVerde,
    letra: null,
    velocidadSugerida: 8,
    rapido: false,
    restante: 300,
    saltoLaLuz: false,
    leccionHecha: false,
    fuera: false,
    cambio: false,
  } as never;
}

/** Si el tope tocó el gas o el freno de quien pilota, con el gas a fondo. */
function elTopeTocaAlgo(
  tier: Tier,
  e: never,
  v: never,
): boolean {
  const mandos = { throttle: 1, brakes: 0 } as never as {
    throttle: number;
    brakes: number;
  };
  limitarElRodaje(e, mandos as never, (x) => x / 30, tier, v, Infinity);
  return mandos.throttle < 1 || mandos.brakes > 0;
}

describe("de quién es la velocidad por el suelo", () => {
  it("en Guyrami y Tukã, rodando por una calle, es del juego", () => {
    for (const tier of [GUYRAMI, TUKA])
      for (const fase of ["rodando", "abandonando", "a-plataforma", "en-puesto"] as Fase[])
        expect(laVelocidadEsDelJuego(estado(12), tier, vista(fase)), `${tier.id} ${fase}`).toBe(
          true,
        );
  });

  it("de Taguató para arriba es de quien juega, y ahí se le avisa", () => {
    expect(laVelocidadEsDelJuego(estado(12), TAGUATO, vista("a-plataforma"))).toBe(
      false,
    );
  });

  it("en la pista y con la luz verde, de quien pilota: ahí se corre", () => {
    expect(
      laVelocidadEsDelJuego(estado(12, { enPista: true }), GUYRAMI, vista("abandonando")),
    ).toBe(false);
    expect(laVelocidadEsDelJuego(estado(12), GUYRAMI, vista("rodando", true))).toBe(
      false,
    );
  });

  it("y en la carrera de aterrizaje también: frenar ahí es la lección", () => {
    expect(
      laVelocidadEsDelJuego(estado(30, { enPista: true }), GUYRAMI, vista("aterrizado")),
    ).toBe(false);
  });

  /*
   * **Y la pregunta contesta lo que hace el tope**, que es el porqué de que
   * sea una función y no una copia. Rodando por calles, en todos los peldaños
   * y en todas las fases: si el tope se mete con el gas o con el freno, la
   * velocidad es del juego, y si no, no.
   */
  it("y dice exactamente cuándo el tope mete mano, peldaño a peldaño", () => {
    const fases: Fase[] = [
      "estacionado",
      "arrancando",
      "rodando",
      "esperando",
      "autorizado",
      "abandonando",
      "a-plataforma",
      "en-puesto",
    ];
    for (const tier of TIERS)
      for (const fase of fases)
        for (const verde of [false, true]) {
          // Deprisa, para que el tope tenga algo que quitar si le toca.
          const e = estado(20);
          const v = vista(fase, verde);
          expect(
            laVelocidadEsDelJuego(e, tier, v),
            `${tier.id} ${fase}${verde ? " verde" : ""}`,
          ).toBe(elTopeTocaAlgo(tier, e, v));
        }
  });
});
