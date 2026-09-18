/**
 * La banda de velocidad de la aproximación.
 *
 * Lo que se comprueba es **cuándo se calla**, que es la mitad del diseño: una
 * señal que está siempre encendida deja de ser una señal.
 */

import { describe, expect, it } from "vitest";
import { MARGENES } from "./minimos";
import {
  bandaDeAhora,
  bandaDeRodaje,
  queSeDice,
  bandaDeVelocidad,
  type Aproximando,
} from "./velocidad-de-aproximacion";

const VREF = 33;
const bajando = (cambios: Partial<Aproximando> = {}): Aproximando => ({
  sobreElSuelo: 120,
  enElSuelo: false,
  vertical: -3,
  velocidad: VREF,
  ...cambios,
});

describe("la banda de velocidad", () => {
  it("en la senda y a su velocidad, va bien", () => {
    expect(bandaDeVelocidad(bajando(), VREF)).toBe("bien");
  });

  it("avisa de lento antes que de rápido, que es lo que mata", () => {
    /*
     * Un cinco por ciento por debajo ya avisa. Por encima aguanta mucho más, y
     * **el listón sale del que usa el juego para juzgar**: avisa diez puntos
     * antes del treinta y cinco por ciento con el que una aproximación deja de
     * valer. Antes avisaba al doce, o sea que regañaba durante veintitrés
     * puntos de velocidad que el propio juego daba por buenos — y un aviso que
     * salta donde no pasa nada se aprende a no oír.
     */
    expect(bandaDeVelocidad(bajando({ velocidad: VREF * 0.95 }), VREF)).toBe(
      "lento",
    );
    expect(bandaDeVelocidad(bajando({ velocidad: VREF * 1.05 }), VREF)).toBe(
      "bien",
    );
    expect(bandaDeVelocidad(bajando({ velocidad: VREF * 1.2 }), VREF)).toBe(
      "bien",
    );
    expect(bandaDeVelocidad(bajando({ velocidad: VREF * 1.3 }), VREF)).toBe(
      "rapido",
    );
  });

  it("y el aviso llega antes que el suspenso, no después", () => {
    /*
     * La propiedad que ata los dos números: la voz tiene que avisar **dentro**
     * de lo que el juego todavía da por bueno, y con sitio para corregir. Si
     * el aviso saltara igual o más tarde que el listón, sería un aviso que
     * llega cuando ya no sirve.
     */
    const avisa = bandaDeVelocidad(
      bajando({ velocidad: VREF * MARGENES.rapido }),
      VREF,
    );
    expect(avisa).toBe("rapido");
    expect(
      bandaDeVelocidad(
        bajando({ velocidad: VREF * (MARGENES.rapido - 0.05) }),
        VREF,
      ),
    ).toBe("rapido");
  });

  it("se calla en crucero, por deprisa que se vaya", () => {
    expect(
      bandaDeVelocidad(bajando({ sobreElSuelo: 1200, velocidad: 70 }), VREF),
    ).toBeNull();
  });

  it("se calla volando bajo y nivelado: eso no es aproximar", () => {
    expect(bandaDeVelocidad(bajando({ vertical: 0 }), VREF)).toBeNull();
  });

  it("se calla en el suelo y en la recogida", () => {
    expect(bandaDeVelocidad(bajando({ enElSuelo: true }), VREF)).toBeNull();
    expect(bandaDeVelocidad(bajando({ sobreElSuelo: 2 }), VREF)).toBeNull();
  });

  it("cada avión con la suya: lo que es bien para uno es rápido para otro", () => {
    // Treinta y tres es su velocidad para uno y un treinta y siete por ciento
    // de más para otro que se aproxima a veinticuatro.
    expect(bandaDeVelocidad(bajando({ velocidad: 33 }), 33)).toBe("bien");
    expect(bandaDeVelocidad(bajando({ velocidad: 33 }), 24)).toBe("rapido");
  });
});

describe("la banda de rodaje", () => {
  it("a paso de rodaje, bien", () => {
    expect(bandaDeRodaje(9, true, false)).toBe("bien");
  });

  it("pasado de vueltas, aviso", () => {
    expect(bandaDeRodaje(20, true, false)).toBe("rapido");
  });

  it("no hay banda de lento: ir despacio rodando no tiene nada de malo", () => {
    expect(bandaDeRodaje(4, true, false)).toBe("bien");
  });

  it("se calla en la pista, que es donde toca correr", () => {
    expect(bandaDeRodaje(60, true, true)).toBeNull();
  });

  it("se calla en el aire y estando parado", () => {
    expect(bandaDeRodaje(60, false, false)).toBeNull();
    expect(bandaDeRodaje(0.5, true, false)).toBeNull();
  });
});

describe("y en la pista no hay banda: ni voz ni color", () => {
  /*
   * El de fuselaje ancho tocando: ochenta y dos nudos, Vref ciento cuarenta y
   * seis. La banda de aproximación dice «lento» —viene a la mitad—; la que
   * decía «rápido» era la de rodaje, que avisa desde los veintitrés nudos y
   * que se creía en una calle porque la fase aún no había pasado a
   * «aterrizado». «¿Voy muy rápido? ¡¿EN SERIO!?». Ver `bandaDeAhora`.
   */
  const tocando = {
    sobreElSuelo: 0,
    enElSuelo: true,
    enLaPista: true,
    vertical: -1,
    velocidad: 42,
  };
  const VREF_ANCHO = 75;

  it("tocando a ochenta y dos nudos no dice nada", () => {
    expect(bandaDeAhora(tocando, VREF_ANCHO, false)).toBe(null);
  });

  it("y a esa velocidad la banda de rodaje ya no dice nada, ni a solas", () => {
    /*
     * Antes sí lo decía, y por eso nació la regla de callar en la pista. Pero
     * esa regla mira el **sitio**, y el sitio se puede errar por un metro: con
     * las ruedas fuera del asfalto volvía a soltar «más despacio» aterrizando
     * a ciento treinta y dos nudos. Ahora la propia banda tiene un techo de
     * velocidad, que no se puede errar. Ver `YA_NO_ES_RODAJE`.
     */
    expect(bandaDeRodaje(tocando.velocidad, true, false)).toBe(null);
  });

  it("y la regla de la pista sigue haciendo falta, a velocidad de calle", () => {
    // Rodando por la pista para ir a la cabecera: la banda de rodaje sí
    // hablaría, y ahí calla porque una pista no es una calle.
    expect(bandaDeRodaje(20, true, false)).toBe("rapido");
    expect(
      bandaDeAhora(
        { ...tocando, velocidad: 20, vertical: 0 },
        VREF_ANCHO,
        false,
      ),
    ).toBe(null);
  });

  it("ni corriendo para despegar, con el gas a fondo", () => {
    expect(
      bandaDeAhora(
        { ...tocando, velocidad: 30, vertical: 0 },
        VREF_ANCHO,
        true,
      ),
    ).toBe(null);
  });

  it("ni rodando por la pista para ir a la cabecera", () => {
    // Lo dice la regla escrita: se avisa en las calles, que es donde una curva
    // se pasa por ir rápido.
    expect(
      bandaDeAhora(
        { ...tocando, velocidad: 20, vertical: 0 },
        VREF_ANCHO,
        false,
      ),
    ).toBe(null);
  });

  it("pero en una calle de rodaje sí, que es para lo que existe", () => {
    expect(
      bandaDeAhora(
        { ...tocando, enLaPista: false, velocidad: 20, vertical: 0 },
        VREF_ANCHO,
        false,
      ),
    ).toBe("rapido");
  });

  it("y en el aire manda la de aproximación, no la de rodaje", () => {
    const enFinal = {
      sobreElSuelo: 120,
      enElSuelo: false,
      enLaPista: false,
      vertical: -3,
      velocidad: 42,
    };
    // Cuarenta y dos metros por segundo son ochenta y dos nudos: en una calle
    // eso es «rápido»; bajando hacia el umbral con Vref setenta y cinco es
    // «lento», que es lo contrario y es lo que hay que decir.
    expect(bandaDeAhora(enFinal, VREF_ANCHO, false)).toBe("lento");
  });
});

describe("y lo que se dice no puede ser lo contrario de lo que pasa", () => {
  /*
   * `airspeed→vuelo.rapido [118 kt · vref 146 · 154 m]`, medido en el juego.
   * Veintiocho nudos por debajo de su Vref, y el juego pidiendo menos gas.
   * Ver `queSeDice`.
   */
  it("volando lento se pide gas, nunca calma", () => {
    expect(queSeDice("lento", false)).toBe("vuelo.lentoYBajo");
  });

  it("volando rápido sí se pide calma", () => {
    expect(queSeDice("rapido", false)).toBe("vuelo.rapido");
  });

  it("rodando pasado se pide calma, que es la única banda que hay en tierra", () => {
    expect(queSeDice("rapido", true)).toBe("vuelo.despacio");
  });

  it("y cuando se va bien, o no hay banda, no se dice nada", () => {
    expect(queSeDice("bien", false)).toBe(null);
    expect(queSeDice(null, false)).toBe(null);
    expect(queSeDice("bien", true)).toBe(null);
  });

  it("ninguna banda comparte frase con su contraria", () => {
    // La regla de fondo, escrita como prueba: lento y rápido no pueden
    // terminar diciendo lo mismo, ni en el aire ni en el suelo.
    for (const suelo of [true, false]) {
      const lento = queSeDice("lento", suelo);
      const rapido = queSeDice("rapido", suelo);
      if (lento !== null && rapido !== null) expect(lento).not.toBe(rapido);
    }
  });
});

describe("y a velocidad de aterrizaje no se está rodando, toque donde toque", () => {
  /*
   * Medido en el juego: el de fuselaje ancho tocando a ciento treinta y dos
   * nudos un metro fuera del asfalto, y el juego pidiéndole «más despacio».
   * Callar la banda «en la pista» no bastaba: el borde de una pista es un
   * polígono y las ruedas caen donde caen. Ver `YA_NO_ES_RODAJE`.
   */
  it("a ciento treinta nudos por el suelo no hay banda de rodaje", () => {
    expect(bandaDeRodaje(68, true, false)).toBe(null);
  });

  it("ni fuera de la pista, que es donde se colaba", () => {
    expect(
      bandaDeAhora(
        {
          sobreElSuelo: 0,
          enElSuelo: true,
          enLaPista: false,
          vertical: -1,
          velocidad: 68,
        },
        75,
        false,
      ),
    ).toBe(null);
  });

  it("pero a velocidad de calle sí, que es para lo que existe", () => {
    expect(bandaDeRodaje(20, true, false)).toBe("rapido");
    expect(bandaDeRodaje(8, true, false)).toBe("bien");
  });

  it("y el fumigador, que es el que más despacio se posa, queda por encima", () => {
    // Toca a cincuenta y cuatro nudos: la banda de rodaje ya está callada ahí.
    expect(bandaDeRodaje(54 / 1.94384, true, false)).toBe(null);
  });
});
