/**
 * Los avisos de cómo se vuela.
 *
 * Lo que se comprueba no son los umbrales —esos están escritos con su
 * derivación al lado— sino las tres cosas que, mal hechas, convierten un aviso
 * en ruido: que **no salte volando normal**, que sea **más exigente cuanto más
 * bajo**, y que **calle en la recogida**, porque un aterrizaje se hace bajando
 * a propósito.
 */

import { describe, expect, it } from "vitest";
import { ARAI, AIRCRAFT } from "./aircraft";
import { TAGUATO } from "./tiers";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import { Vector3 } from "three";
import {
  ALABEO_QUE_SOBRA,
  anguloDeAviso,
  avisaLaPerdida,
  avisoDeActitud,
  DEMASIADO_ALTO,
  RECOGIDA,
  ritmoQueSobra,
  SE_QUITA,
} from "./avisos-de-actitud";

/** Un avión volando, al que se le cambia lo que haga falta. */
const volando = (cambios: Partial<Parameters<typeof avisoDeActitud>[0]>) => ({
  enSuelo: false,
  altura: 200,
  vertical: -2,
  alabeo: 0,
  ...cambios,
});

const grados = (g: number) => (g * Math.PI) / 180;

describe("el ritmo de bajada que sobra", () => {
  it("es más exigente cuanto más bajo, que es lo que lo hace real", () => {
    // Un número fijo diría que bajar a seis por segundo está igual de mal a
    // trescientos metros que a treinta, y no: a trescientos es un descenso.
    expect(ritmoQueSobra(61)).toBeLessThan(ritmoQueSobra(305));
  });

  it("y cuadra con lo que dispara un GPWS de verdad", () => {
    /*
     * Los tres puntos del modo 1, pasados a m/s:
     *   200 ft → 1000 ft/min = 5,0    500 ft → 1500 = 7,6    1000 ft → 2500 = 12,7
     * Si alguien toca la recta, esto lo dice.
     */
    expect(ritmoQueSobra(61)).toBeCloseTo(5.0, 1);
    expect(ritmoQueSobra(152)).toBeCloseTo(7.9, 1);
    expect(ritmoQueSobra(305)).toBeCloseTo(12.7, 1);
  });
});

describe("sink rate", () => {
  it("no salta en una aproximación normal", () => {
    /*
     * La que más importa de todas. Una senda de tres grados a la velocidad de
     * aproximación de una avioneta baja a unos tres metros y medio por
     * segundo: si el aviso saltara ahí, saltaría en **todos** los aterrizajes
     * y se aprendería a no oírlo.
     */
    expect(avisoDeActitud(volando({ altura: 150, vertical: -3.5 }))).toBe(null);
    expect(avisoDeActitud(volando({ altura: 60, vertical: -3.5 }))).toBe(null);
    expect(avisoDeActitud(volando({ altura: 30, vertical: -3 }))).toBe(null);
  });

  /*
   * **Y un reactor bien volado, tampoco.** A su velocidad de aproximación un
   * JAZ 90 baja por una senda de tres grados a unos tres metros y ochenta por
   * segundo, y la recta de antes, prolongada por debajo de doscientos pies,
   * pedía menos: la final buena soltaba *sink rate* cerca del suelo, justo
   * detrás de un «metéle gas». Abajo la caja se queda en mil pies por minuto.
   */
  it("ni la de un reactor a su velocidad, cerca del suelo", () => {
    const senda = 68 * Math.tan((3 * Math.PI) / 180);
    for (const altura of [20, 30, 45, 60])
      expect(
        avisoDeActitud(volando({ altura, vertical: -senda })),
        `${altura} m`,
      ).toBe(null);
    expect(ritmoQueSobra(20)).toBeCloseTo(5.0, 5);
  });

  it("y sí cuando se baja de más para lo bajo que se está", () => {
    expect(avisoDeActitud(volando({ altura: 60, vertical: -8 }))).toBe(
      "sink rate",
    );
  });

  it("y el mismo ritmo, alto, no es nada", () => {
    // Ocho por segundo a sesenta metros es un problema; a doscientos ochenta
    // es un avión bajando. El aviso mira los dos números, no uno.
    expect(avisoDeActitud(volando({ altura: 280, vertical: -8 }))).toBe(null);
  });

  it("calla en la recogida, porque un aterrizaje se hace bajando", () => {
    /*
     * Por debajo de quince metros el avión se está posando a propósito y el
     * aviso no avisa de nada: solo tapa lo que sí importa. Es la misma
     * decisión que el canto de pérdida, y por el mismo motivo — aterrizar no
     * se dramatiza.
     */
    expect(avisoDeActitud(volando({ altura: RECOGIDA - 1, vertical: -9 }))).toBe(
      null,
    );
  });

  it("y por encima de mil pies tampoco, que ahí bajar es bajar", () => {
    expect(
      avisoDeActitud(volando({ altura: DEMASIADO_ALTO + 10, vertical: -20 })),
    ).toBe(null);
  });

  it("y subiendo, jamás", () => {
    expect(avisoDeActitud(volando({ altura: 60, vertical: 9 }))).toBe(null);
  });
});

/*
 * **Un aviso puesto se quita por dentro, no por su borde.** Con un solo
 * umbral, bajar rondándolo ponía y quitaba el *sink rate* a cada momento, y
 * cada vez era un canto nuevo: tres en cinco segundos en Los Rodeos.
 */
describe("y los dos avisos no tiemblan en su borde", () => {
  const umbral = ritmoQueSobra(90);
  it("el sink rate puesto sigue puesto rondando su umbral", () => {
    const rozando = volando({ altura: 90, vertical: -(umbral * 0.95) });
    expect(avisoDeActitud(rozando)).toBe(null);
    expect(avisoDeActitud(rozando, "sink rate")).toBe("sink rate");
  });

  it("y se quita al bajar de verdad más despacio", () => {
    const corregido = volando({
      altura: 90,
      vertical: -(umbral * SE_QUITA * 0.95),
    });
    expect(avisoDeActitud(corregido, "sink rate")).toBe(null);
  });

  it("y el alabeo, igual", () => {
    const casi = volando({ alabeo: ALABEO_QUE_SOBRA * 0.95 });
    expect(avisoDeActitud(casi)).toBe(null);
    expect(avisoDeActitud(casi, "bank angle")).toBe("bank angle");
    expect(
      avisoDeActitud(volando({ alabeo: ALABEO_QUE_SOBRA * 0.7 }), "bank angle"),
    ).toBe(null);
  });
});

describe("bank angle", () => {
  it("no salta en un viraje bien hecho", () => {
    // Treinta grados es un viraje de manual y el automático de este juego se
    // para en veinticinco. Un aviso que salte ahí enseña a no hacer caso.
    expect(avisoDeActitud(volando({ alabeo: grados(30) }))).toBe(null);
  });

  it("y sí cuando el avión va de lado", () => {
    expect(avisoDeActitud(volando({ alabeo: grados(50) }))).toBe("bank angle");
  });

  it("y da igual hacia qué lado", () => {
    expect(avisoDeActitud(volando({ alabeo: -grados(50) }))).toBe("bank angle");
  });

  it("y a cualquier altura, porque un mal viraje es un mal viraje", () => {
    expect(
      avisoDeActitud(volando({ altura: 2000, alabeo: grados(60) })),
    ).toBe("bank angle");
  });

  it("y el tope está donde el ala empieza a pedir vez y media su peso", () => {
    // A 45° el factor de carga es 1/cos(45) = 1,41. Es el número del que sale
    // la pérdida en viraje, y por eso el aviso va ahí y no en treinta y cinco.
    expect(1 / Math.cos(ALABEO_QUE_SOBRA)).toBeCloseTo(1.41, 2);
  });
});

describe("y los dos a la vez", () => {
  it("manda el de bajar, que es el que tiene suelo debajo", () => {
    // Dos frases pisándose son dos frases perdidas. Quien va de lado bajando
    // deprisa tiene un problema, no dos.
    expect(
      avisoDeActitud(
        volando({ altura: 60, vertical: -9, alabeo: grados(60) }),
      ),
    ).toBe("sink rate");
  });
});

describe("y en el suelo", () => {
  it("no se avisa de nada, por torcido que esté", () => {
    // Rodando con una rueda en la hierba el alabeo puede ser cualquier cosa.
    expect(
      avisoDeActitud({
        enSuelo: true,
        altura: 0,
        vertical: -12,
        alabeo: grados(70),
      }),
    ).toBe(null);
  });
});

describe("el aviso de pérdida y el peso en ruedas", () => {
  it("aparcado con el viento de cola no avisa", () => {
    // Lo que daba el modelo en La Palma, en el puesto y con el motor parado.
    expect(avisaLaPerdida({ stallWarning: true, onGround: true })).toBe(false);
  });

  it("en el aire, sí", () => {
    expect(avisaLaPerdida({ stallWarning: true, onGround: false })).toBe(true);
    expect(avisaLaPerdida({ stallWarning: false, onGround: false })).toBe(false);
  });
});

/*
 * **El avisador mira el ángulo, con los flaps, y va por delante.**
 *
 * Salió de un «stall, stall» a ciento ochenta y ocho nudos con el JAZ 90 que
 * parecía un aviso mirando la velocidad. No lo era: el ala estaba a 18,6° con
 * la pérdida a 14,9°, porque se tiraba de la palanca hasta ahí. Lo que se fija
 * aquí es lo que tiene que hacer un avisador de verdad, que es lo que el
 * juego no hacía: sonar **antes** de la pérdida, a cualquier velocidad, con
 * un umbral que baja al sacar flaps, y nunca empujando.
 */
describe("el avisador de pérdida", () => {
  it("suena por debajo del ángulo de pérdida, en toda la flota", () => {
    for (const a of AIRCRAFT) {
      const limpio = anguloDeAviso(a.aero.alphaStall, a.aero, 0);
      expect(limpio, a.id).toBeLessThan(a.aero.alphaStall);
      // Y no tan pronto que avise volando normal: menos de cuatro grados.
      expect(a.aero.alphaStall - limpio, a.id).toBeLessThan(grados(4));
    }
  });

  it("y con flaps suena antes, que es lo que hace el de un avión de línea", () => {
    const limpio = anguloDeAviso(ARAI.aero.alphaStall, ARAI.aero, 0);
    const conTodo = anguloDeAviso(ARAI.aero.alphaStall, ARAI.aero, ARAI.flapsLift);
    expect(conTodo).toBeLessThan(limpio);
  });

  const volandoA = (nudos: number) => {
    const m = new CoefficientFlightModel({
      aircraft: ARAI,
      ground: () => 0,
      assist: 0,
    });
    m.reset({
      position: new Vector3(0, 1500, 0),
      heading: 0,
      airspeed: nudos * 0.514444,
    });
    return m;
  };

  it("a ciento ochenta y ocho nudos, tirando fuerte, avisa antes de la pérdida", () => {
    const m = volandoA(188);
    const mandos = { ...neutralControls(), throttle: 1, elevator: 0.6 };
    let avisoEn: number | null = null;
    let perdidaEn: number | null = null;
    for (let i = 0; i < 240; i++) {
      m.step(1 / 60, mandos);
      if (avisoEn === null && m.state.stallWarning) avisoEn = i;
      if (perdidaEn === null && m.state.stalled) perdidaEn = i;
    }
    expect(avisoEn).not.toBeNull();
    expect(perdidaEn).not.toBeNull();
    expect(avisoEn!).toBeLessThan(perdidaEn!);
  });

  it("y volando recto a esa velocidad no dice nada", () => {
    const m = volandoA(188);
    const mandos = { ...neutralControls(), throttle: 0.6 };
    for (let i = 0; i < 240; i++) {
      m.step(1 / 60, mandos);
      expect(m.state.stallWarning).toBe(false);
    }
  });

  it("y el compensador de Taguató no mete el ala en el avisador al soltar", () => {
    /*
     * Lo que pasaba en Los Rodeos con el JAZ 90: bajando a ciento noventa
     * nudos, se suelta la palanca y el compensador, para sostener la subida,
     * tiraba hasta el avisador. Treinta «stall, stall» con nadie tirando.
     */
    const m = new CoefficientFlightModel({
      aircraft: ARAI,
      ground: () => 0,
      assist: TAGUATO.assists,
    });
    m.reset({
      position: new Vector3(0, 1500, 0),
      heading: 0,
      airspeed: 190 * 0.514444,
    });
    const bajando = { ...neutralControls(), throttle: 1, elevator: -0.25 };
    for (let i = 0; i < 180; i++) m.step(1 / 60, bajando);
    expect(m.state.verticalSpeed).toBeLessThan(-5);
    const suelto = { ...neutralControls(), throttle: 1 };
    let avisos = 0;
    for (let i = 0; i < 60 * 30; i++) {
      m.step(1 / 60, suelto);
      if (m.state.stallWarning) avisos++;
    }
    expect(avisos).toBe(0);
  });

  it("empujando no avisa, aunque el ala se vaya por abajo", () => {
    const m = volandoA(188);
    const mandos = { ...neutralControls(), throttle: 1, elevator: -1 };
    for (let i = 0; i < 240; i++) {
      m.step(1 / 60, mandos);
      expect(m.state.stallWarning).toBe(false);
    }
  });
});
