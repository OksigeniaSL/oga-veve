/**
 * El tutor: qué consejo toca, y sobre todo cuál **no**.
 *
 * La regla de la casa para las máquinas de estados pequeñas es que vivan
 * aparte y se comprueben con pruebas en vez de volando a mano veinte veces.
 * Ésta llevaba dentro de la clase que dibuja, y por eso su último consejo
 * —«seguí la raya y salí de la pista»— pudo pasarse meses pidiendo lo
 * imposible sin que nada lo dijera.
 */
import { describe, expect, it } from "vitest";
import type { FlightState } from "../flight/model";
import { pasoQueToca } from "./tutor";

/** Un avión en el suelo, con lo poco que mira el tutor. */
const enElSuelo = (airspeed: number, onRunway = true) =>
  ({ onGround: true, onRunway, airspeed, heightAboveGround: 0 }) as FlightState;

const enElAire = (airspeed: number, heightAboveGround = 300) =>
  ({
    onGround: false,
    onRunway: false,
    airspeed,
    heightAboveGround,
  }) as FlightState;

const recienAterrizado = {
  paso: "frenar" as const,
  celebrando: 0,
  haVolado: true,
};
const mirada = (state: FlightState, hayRaya: boolean, enFinal = false) => ({
  state,
  throttle: 0,
  dt: 0.1,
  hayRaya,
  enFinal,
});

describe("después de aterrizar", () => {
  it("mientras se corre, pide frenar", () => {
    const r = pasoQueToca(recienAterrizado, mirada(enElSuelo(40), true));
    expect(r.paso).toBe("frenar");
  });

  it("ya despacio y con raya, pide seguirla y salir", () => {
    const r = pasoQueToca(recienAterrizado, mirada(enElSuelo(6), true));
    expect(r.paso).toBe("salir");
  });

  /*
   * El caso que lo motivó todo. Los escenarios inventados —el Valle de la
   * Cordillera, el Chaco— son una pista en medio del campo: sin calles de
   * rodaje, sin plataforma, sin puesto y sin raya verde. Pedir que se salga de
   * la pista siguiendo una raya es pedir dos cosas que no existen. «¿Qué raya?
   * ¿Y por dónde salgo de esta pista si no hay nada fuera de pista?»
   */
  it("y sin raya se calla, porque no hay ni raya ni a dónde ir", () => {
    const r = pasoQueToca(recienAterrizado, mirada(enElSuelo(6), false));
    expect(r.paso).toBe("done");
  });

  it("fuera de la pista también se calla, haya raya o no", () => {
    for (const raya of [true, false]) {
      const r = pasoQueToca(
        recienAterrizado,
        mirada(enElSuelo(6, false), raya),
      );
      expect(r.paso, `con raya ${raya}`).toBe("done");
    }
  });
});

describe("antes de volar, la raya no cambia nada", () => {
  const parado = { paso: "throttle" as const, celebrando: 0, haVolado: false };

  it("sin gas, pide motor", () => {
    const r = pasoQueToca(parado, {
      ...mirada(enElSuelo(4), false),
      throttle: 0.2,
    });
    expect(r.paso).toBe("throttle");
  });

  it("y a velocidad de rotación, pide tirar aunque falte gas", () => {
    const r = pasoQueToca(parado, {
      ...mirada(enElSuelo(30), false),
      throttle: 0.5,
    });
    expect(r.paso).toBe("pull");
  });
});

describe("volver a despegar después de aterrizar", () => {
  /*
   * En este juego se aterriza y se vuelve a salir sin pasar por el hangar, y
   * «ya ha volado» se quedaba puesto: la segunda carrera de despegue entraba
   * por la rama del aterrizaje y el cartel pedía frenar con la pista entera
   * por delante. «¿Por qué me pide que frene?»
   */
  it("con el motor puesto pide motor, no frenar", () => {
    const r = pasoQueToca(recienAterrizado, {
      ...mirada(enElSuelo(20), true),
      throttle: 0.7,
    });
    expect(r.paso).not.toBe("frenar");
    expect(r.haVolado).toBe(false);
  });

  it("pero corriendo sin motor sigue pidiendo frenar", () => {
    const r = pasoQueToca(recienAterrizado, {
      ...mirada(enElSuelo(20), true),
      throttle: 0.1,
    });
    expect(r.paso).toBe("frenar");
  });
});

describe("aflojar el motor solo viniendo a aterrizar", () => {
  const enElAireYaVolado = {
    paso: "done" as const,
    celebrando: 0,
    haVolado: true,
  };

  it("en final y con altura, pide bajar el motor", () => {
    const r = pasoQueToca(enElAireYaVolado, {
      ...mirada(enElAire(40, 200), true, true),
      throttle: 0.9,
    });
    expect(r.paso).toBe("slow");
  });

  /*
   * «Me pide insistentemente que baje el motor, pero si lo bajo, caigo y me la
   * pego contra el suelo.» Volando bajo por el valle el consejo salía igual,
   * porque solo miraba la distancia al umbral.
   */
  it("pero no pegado al suelo, que obedecer eso es estrellarse", () => {
    const r = pasoQueToca(enElAireYaVolado, {
      ...mirada(enElAire(40, 20), true, true),
      throttle: 0.9,
    });
    expect(r.paso).toBe("done");
  });

  it("ni pasando cerca sin venir en final", () => {
    const r = pasoQueToca(enElAireYaVolado, {
      ...mirada(enElAire(40, 200), true, false),
      throttle: 0.9,
    });
    expect(r.paso).toBe("done");
  });
});

describe("el primer despegue se celebra una vez", () => {
  it("al despegar entra en celebración y se apunta que ya se voló", () => {
    const r = pasoQueToca(
      { paso: "pull", celebrando: 0, haVolado: false },
      mirada(enElAire(32), true),
    );
    expect(r.paso).toBe("flying");
    expect(r.haVolado).toBe(true);
    expect(r.celebrando).toBeGreaterThan(0);
  });

  it("y se acaba sola", () => {
    // Con menos de un paso de celebración por delante, el siguiente la cierra.
    const m = { paso: "flying" as const, celebrando: 0.05, haVolado: true };
    expect(pasoQueToca(m, mirada(enElAire(32), true)).paso).toBe("done");
  });

  it("y no se acaba antes de tiempo", () => {
    const m = { paso: "flying" as const, celebrando: 2.6, haVolado: true };
    expect(pasoQueToca(m, mirada(enElAire(32), true)).paso).toBe("flying");
  });
});
