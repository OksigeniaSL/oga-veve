/**
 * Dos fases que bailaban, y todo lo que colgaba de ellas bailaba detrás.
 *
 * **La final, con el variómetro.** «Final» pedía ir bajando, así que cada vez
 * que el avión se nivelaba un instante la fase se iba a «en vuelo» y volvía.
 * En una final recta a Los Rodeos fueron treinta y cinco segundos alternando:
 * «estás en final», «estás volando», la autorización de aterrizar pedida una
 * y otra vez, y un tramo de circuito cantado —«girá otra vez y empezá a
 * bajar»— con el avión alineado a cuatro kilómetros.
 *
 * **La carrera de aterrizaje, con el viento.** Para volver a «aterrizado» se
 * miraba la velocidad del aire, y con veinte nudos de cara un avión que rueda
 * por la pista a la velocidad que le pide el juego ya marca veinte metros por
 * segundo en el anemómetro. En Fuerteventura el avión volvía a «aterrizado»
 * cada vez que aceleraba hacia su salida, y a «abandonando» cada vez que
 * frenaba para tomarla: seis veces en una sola vuelta.
 */

import { describe, expect, it } from "vitest";
import { Vuelo, type Fase, type Situacion } from "./vuelo";

const BASE: Situacion = {
  estado: {
    airspeed: 0,
    groundSpeed: 0,
    verticalSpeed: 0,
  } as Situacion["estado"],
  alaRuta: 0,
  restante: 500,
  alEjeDePista: 500,
  backTaxi: false,
  alLargoDePista: -900,
  pistaRestante: 2400,
  pistaQueNecesita: 0,
  enPista: false,
  sobreElSuelo: 0,
  motor: true,
  desalineado: 0,
};

const con = (cambios: Partial<Situacion>): Situacion => ({
  ...BASE,
  ...cambios,
  estado: { ...BASE.estado, ...(cambios.estado ?? {}) },
});

/** Las fases por las que se pasa, a veinte fotogramas por segundo. */
function durante(v: Vuelo, s: Situacion, segundos: number): Fase[] {
  const vistas: Fase[] = [];
  for (let t = 0; t < segundos; t += 0.05) {
    const f = v.paso(s, 0.05).fase;
    if (vistas[vistas.length - 1] !== f) vistas.push(f);
  }
  return vistas;
}

/** Un vuelo que ya ha volado de verdad: alto y un buen rato. */
function yaVolado(): Vuelo {
  const v = new Vuelo();
  v.reiniciar(true);
  durante(v, con({ enPista: true, sobreElSuelo: 400 }), 20);
  return v;
}

/** En final: alineado, por delante del umbral y bajando. */
const enFinal = (vertical: number): Situacion =>
  con({
    sobreElSuelo: 150,
    alEjeDePista: 20,
    alLargoDePista: -4000,
    estado: { airspeed: 30, groundSpeed: 30, verticalSpeed: vertical } as never,
  });

describe("la final no depende del signo del variómetro", () => {
  it("nivelarse un instante no saca de final", () => {
    const v = yaVolado();
    durante(v, enFinal(-3), 2);
    expect(v.actual).toBe("final");
    // Lo que hace quien corrige la senda: baja, se nivela, sube un pelo,
    // vuelve a bajar. Veinte segundos así.
    const vistas: Fase[] = [];
    for (let i = 0; i < 10; i++) {
      vistas.push(...durante(v, enFinal(2.5), 1));
      vistas.push(...durante(v, enFinal(-4), 1));
    }
    expect(new Set(vistas)).toEqual(new Set(["final"]));
  });

  it("pero irse al aire de verdad, sí", () => {
    // Renunciar es una maniobra, y la fase tiene que enterarse: subiendo a
    // cinco metros por segundo, a los pocos segundos ya no se está en final.
    const v = yaVolado();
    durante(v, enFinal(-3), 2);
    expect(v.actual).toBe("final");
    const vistas = durante(v, enFinal(5), 8);
    expect(vistas[vistas.length - 1]).toBe("en-vuelo");
  });

  it("y volver a bajar después de irse al aire es otra final", () => {
    const v = yaVolado();
    durante(v, enFinal(-3), 2);
    durante(v, enFinal(5), 8);
    expect(v.actual).toBe("en-vuelo");
    durante(v, enFinal(-3), 2);
    expect(v.actual).toBe("final");
  });

  it("y lo demás sigue sacando de final en el acto: pasarse del centro", () => {
    const v = yaVolado();
    durante(v, enFinal(-3), 2);
    const vistas = durante(
      v,
      con({
        sobreElSuelo: 150,
        alEjeDePista: 20,
        alLargoDePista: 100,
        estado: { airspeed: 30, groundSpeed: 30, verticalSpeed: 0 } as never,
      }),
      0.2,
    );
    expect(vistas).toContain("en-vuelo");
  });
});

describe("rodar contra el viento no es volver a aterrizar", () => {
  /** Tomar tierra y frenar hasta velocidad de rodaje, sobre la pista. */
  function aterrizadoYFrenado(v: Vuelo, viento: number): void {
    durante(
      v,
      con({
        sobreElSuelo: 1,
        enPista: true,
        alEjeDePista: 2,
        estado: {
          airspeed: 40,
          groundSpeed: 40 - viento,
          verticalSpeed: -1,
        } as never,
      }),
      2,
    );
    expect(v.actual).toBe("aterrizado");
    durante(
      v,
      con({
        sobreElSuelo: 1,
        enPista: true,
        alEjeDePista: 2,
        estado: { airspeed: 12, groundSpeed: 12 - viento } as never,
      }),
      2,
    );
    expect(v.actual).toBe("abandonando");
  }

  it("con veinte nudos de cara, rodar a trece por la pista sigue siendo rodar", () => {
    const v = yaVolado();
    aterrizadoYFrenado(v, 10);
    // Trece por el suelo son veintitrés en el anemómetro: por encima del
    // listón de la carrera, y no es una carrera.
    const vistas = durante(
      v,
      con({
        sobreElSuelo: 1,
        enPista: true,
        alEjeDePista: 2,
        estado: { airspeed: 23, groundSpeed: 13 } as never,
      }),
      10,
    );
    expect(vistas).toEqual(["abandonando"]);
  });

  it("pero acelerar por la pista como en una carrera sí vuelve a serlo", () => {
    // Es el tope que impide llevarse una velocidad de pista a la salida: «a
    // toda leche me pasé E5 y nada me avisó». Eso no se quita.
    const v = yaVolado();
    aterrizadoYFrenado(v, 0);
    const vistas = durante(
      v,
      con({
        sobreElSuelo: 1,
        enPista: true,
        alEjeDePista: 2,
        estado: { airspeed: 22, groundSpeed: 22 } as never,
      }),
      2,
    );
    expect(vistas[vistas.length - 1]).toBe("aterrizado");
  });

  it("y la toma con viento de cara sigue siendo una toma", () => {
    // Tocar a cuarenta de aire y treinta de suelo: la carrera empieza igual.
    const v = yaVolado();
    aterrizadoYFrenado(v, 10);
  });

  it("y con viento de cola la carrera tampoco va y viene", () => {
    // Ocho de cola: dieciséis en el anemómetro son veinticuatro por el suelo.
    // Saliendo de la carrera por el aire y volviendo por el suelo, eso era
    // salir y volver a entrar en el mismo fotograma.
    const v = yaVolado();
    const rodando = (aire: number): Situacion =>
      con({
        sobreElSuelo: 1,
        enPista: true,
        alEjeDePista: 2,
        estado: { airspeed: aire, groundSpeed: aire + 8 } as never,
      });
    durante(
      v,
      con({
        sobreElSuelo: 1,
        enPista: true,
        alEjeDePista: 2,
        estado: { airspeed: 34, groundSpeed: 42, verticalSpeed: -1 } as never,
      }),
      2,
    );
    expect(v.actual).toBe("aterrizado");
    // Frenando poco a poco hasta rodar: una sola salida de la carrera.
    const vistas: Fase[] = [];
    for (let aire = 20; aire >= 2; aire -= 0.5)
      vistas.push(...durante(v, rodando(aire), 0.5));
    const cambios = vistas.filter((f, i) => i === 0 || f !== vistas[i - 1]);
    expect(cambios).toEqual(["aterrizado", "abandonando"]);
  });
});
