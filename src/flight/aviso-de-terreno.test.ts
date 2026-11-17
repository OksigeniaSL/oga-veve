/**
 * El aviso de terreno.
 *
 * Lo que se comprueba, como siempre con los avisos, es **cuándo se calla**:
 * volar bajo no es malo —se vuela bajo para aterrizar y para seguir un río—,
 * y un aviso que suena cuando no toca se aprende a no oír.
 */

import { describe, expect, it } from "vitest";
import { aircraftById } from "./aircraft";
import { aireDelParte, indicatedAirspeed, trueFromIndicated } from "./atmosphere";
import {
  avisoDeTerreno,
  DESPACIO_SOBRE_LA_DE_APROXIMACION,
  fueraDeLaSenda,
  vienePuestoParaAterrizar,
  type Cerca,
} from "./aviso-de-terreno";
import { SUPER_PUMA_EN_EL_JUEGO } from "./helicoptero-en-el-juego";

const volando = (c: Partial<Cerca> = {}): Cerca => ({
  sobreElSuelo: 400,
  vertical: 0,
  enElSuelo: false,
  enFinal: false,
  sobreLaPista: false,
  puestoParaAterrizar: false,
  ...c,
});

describe("el aviso de terreno", () => {
  it("en crucero no dice nada", () => {
    expect(avisoDeTerreno(volando())).toBeNull();
  });

  it("bajo y bajando fuera de la aproximación, manda subir", () => {
    expect(avisoDeTerreno(volando({ sobreElSuelo: 80, vertical: -3 }))).toBe(
      "sube",
    );
  });

  it("bajo pero nivelado, solo pide atención", () => {
    expect(avisoDeTerreno(volando({ sobreElSuelo: 80, vertical: -0.5 }))).toBe(
      "bajo",
    );
  });

  it("se calla en la aproximación: ahí estar bajo es lo que toca", () => {
    expect(
      avisoDeTerreno(
        volando({ sobreElSuelo: 40, vertical: -4, enFinal: true }),
      ),
    ).toBeNull();
  });

  it("se calla subiendo: quien sube ya está resolviendo el problema", () => {
    expect(
      avisoDeTerreno(volando({ sobreElSuelo: 40, vertical: 3 })),
    ).toBeNull();
  });

  it("se calla en el suelo", () => {
    expect(
      avisoDeTerreno(
        volando({ sobreElSuelo: 0, vertical: -2, enElSuelo: true }),
      ),
    ).toBeNull();
  });

  it("rozando el suelo y bajando es lo más urgente que hay", () => {
    expect(avisoDeTerreno(volando({ sobreElSuelo: 25, vertical: -2 }))).toBe(
      "sube",
    );
  });
});

/*
 * **Y cuándo deja de valer «final» como excusa.**
 *
 * Grabado volando: aproximación larga sobre la ciudad, el avión bajando entre
 * los edificios y la pantalla muda hasta que se posó en un descampado. La
 * máquina de fases decía «final» —alineado, por delante del umbral, bajando—
 * y con eso el aviso de terreno se callaba justo cuando era el único que
 * quedaba. Ver `fueraDeLaSenda`.
 */
describe("cuándo «final» deja de explicar lo que se está haciendo", () => {
  /** Tres grados, que es la senda de este juego. */
  const TRES = Math.tan((3 * Math.PI) / 180);

  it("en la senda, no pasa nada", () => {
    // A dos kilómetros la senda va por ciento cinco metros.
    expect(fueraDeLaSenda(2000, 105, TRES)).toBe(false);
  });

  it("un poco bajo tampoco: una senda no es un raíl", () => {
    expect(fueraDeLaSenda(2000, 70, TRES)).toBe(false);
  });

  it("pero a diez metros y a dos kilómetros, eso ya no es una senda", () => {
    expect(fueraDeLaSenda(2000, 10, TRES)).toBe(true);
  });

  it("y cerca del umbral no se juzga, que ahí hay que estar bajo", () => {
    expect(fueraDeLaSenda(200, 2, TRES)).toBe(false);
  });

  it("sin distancia conocida, no se opina", () => {
    expect(fueraDeLaSenda(Infinity, 0, TRES)).toBe(false);
  });
});

describe("sobre la pista", () => {
  it("no se avisa, aunque se vaya bajo y bajando", () => {
    // «Eso de que me avise que voy a terrain cuando ya estoy sobre la cabecera
    // de la pista.» Ahí ir bajo no es un peligro: es el plan.
    expect(
      avisoDeTerreno(
        volando({ sobreElSuelo: 20, vertical: -3, sobreLaPista: true }),
      ),
    ).toBe(null);
  });

  it("y fuera de ella el mismo caso sí avisa", () => {
    expect(
      avisoDeTerreno(volando({ sobreElSuelo: 20, vertical: -3 })),
    ).not.toBe(null);
  });
});

describe("y puesto para aterrizar no se avisa, lo diga la fase o no", () => {
  /*
   * El aviso ya se callaba «en final», pero eso lo decide una máquina de
   * estados con seis condiciones a la vez y basta con que una parpadee para
   * que vuelva. Medido en una aproximación clavada a Vref: la fase se salía de
   * «final» a ciento treinta y ocho metros y ya no volvía, así que el juego
   * soltaba «terrain, pull up» a sesenta y tres metros de la pista.
   *
   * «Tres veces que voy muy bajo y la señal de que me voy a dar contra el
   * suelo, pero si estoy aterrizando qué esperan.»
   */
  it("bajando bonito con todo fuera, callado — aunque la fase diga que no", () => {
    expect(
      avisoDeTerreno(
        volando({
          sobreElSuelo: 63,
          vertical: -3.3,
          enFinal: false,
          sobreLaPista: false,
          puestoParaAterrizar: true,
        }),
      ),
    ).toBe(null);
  });

  it("y sin configurar sí avisa, que es para lo que existe", () => {
    // El mismo avión, a la misma altura y bajando igual, pero limpio: eso no
    // es una aproximación, es alguien acercándose al suelo sin querer.
    expect(
      avisoDeTerreno(
        volando({
          sobreElSuelo: 63,
          vertical: -3.3,
          puestoParaAterrizar: false,
        }),
      ),
    ).not.toBe(null);
  });

  it("pero caer a plomo con el tren fuera sigue avisando", () => {
    /*
     * Lo que inhibe la configuración es acercarse al suelo **despacio**, que es
     * lo que hace un avión aterrizando. Caer a seis metros por segundo no lo
     * es, y ahí el aviso tiene que estar: es la diferencia entre aterrizar y
     * estrellarse con las patas fuera.
     */
    expect(
      avisoDeTerreno(
        volando({
          sobreElSuelo: 63,
          vertical: -9,
          puestoParaAterrizar: false,
        }),
      ),
    ).toBe("sube");
  });
});

/*
 * **Puesto para aterrizar, con la indicada contra la de aproximación**, que
 * es indicada. Se comparaba la verdadera: en un campo alto o con calor, la
 * misma indicada es más verdadera y se dejaba de estar «puesto» antes de
 * tiempo. Lo de la enmienda H25e del ADR 0027.
 */
describe("puesto para aterrizar", () => {
  const fumigador = aircraftById("jaz-25");
  const helicoptero = SUPER_PUMA_EN_EL_JUEGO;
  /** Los Rodeos, en la pista y con 21 °C: el campo del banco del vuelo entero. */
  const COTA = 632;
  const aire = aireDelParte(21, COTA);
  const bajando = { tren: 1, flaps: 0, vertical: -3 };

  it("el avión sin flaps y el helicóptero: hasta un veinte por ciento sobre la de aproximación, en indicada", () => {
    for (const a of [fumigador, helicoptero]) {
      const v = a.approachSpeed * DESPACIO_SOBRE_LA_DE_APROXIMACION;
      expect(vienePuestoParaAterrizar(a, { ...bajando, indicada: v * 0.99 })).toBe(true);
      expect(vienePuestoParaAterrizar(a, { ...bajando, indicada: v * 1.01 })).toBe(false);
    }
  });

  it("en Los Rodeos, a 1,18 veces la de aproximación indicada está puesto aunque la verdadera pase del 1,2", () => {
    for (const a of [fumigador, helicoptero]) {
      const indicada = a.approachSpeed * 1.18;
      const verdadera = trueFromIndicated(indicada, COTA, aire);
      // Lo que comparaba antes: la verdadera ya pasaba del listón.
      expect(verdadera).toBeGreaterThan(a.approachSpeed * DESPACIO_SOBRE_LA_DE_APROXIMACION);
      expect(indicatedAirspeed(verdadera, COTA, aire)).toBeCloseTo(indicada, 6);
      expect(vienePuestoParaAterrizar(a, { ...bajando, indicada })).toBe(true);
    }
  });

  it("cayendo a plomo no está puesto, ni con tren, ni despacio", () => {
    for (const a of [fumigador, helicoptero, aircraftById("jaz-90")]) {
      expect(
        vienePuestoParaAterrizar(a, { tren: 1, flaps: 1, vertical: -9, indicada: a.approachSpeed }),
      ).toBe(false);
    }
  });

  it("con flaps, lo dicen los flaps y no la velocidad; el helicóptero no mira el tren", () => {
    const jaz90 = aircraftById("jaz-90");
    const rapido = jaz90.approachSpeed * 1.5;
    expect(vienePuestoParaAterrizar(jaz90, { tren: 1, flaps: 1, vertical: -3, indicada: rapido })).toBe(true);
    expect(vienePuestoParaAterrizar(jaz90, { tren: 1, flaps: 0, vertical: -3, indicada: jaz90.approachSpeed })).toBe(false);
    expect(vienePuestoParaAterrizar(jaz90, { tren: 0, flaps: 1, vertical: -3, indicada: jaz90.approachSpeed })).toBe(false);
    expect(
      vienePuestoParaAterrizar(helicoptero, { tren: 0, flaps: 0, vertical: -1, indicada: helicoptero.approachSpeed }),
    ).toBe(true);
  });
});
