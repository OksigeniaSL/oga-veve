/**
 * El piloto automático.
 *
 * Dos capas de prueba, y las dos hacen falta:
 *
 * - **Las leyes de mando**, aquí: signos, topes y el lado corto del rumbo. Son
 *   las que se escriben mal solas y las que, mal escritas, dan la vuelta entera
 *   para corregir diez grados.
 * - **El lazo cerrado**, abajo: el piloto automático pilotando el motor de
 *   vuelo de verdad hasta que el avión llega y se queda. Una ley de mando con
 *   los signos bien puede oscilar sin parar, y eso no lo enseña ninguna prueba
 *   de signos.
 */

import { describe, expect, it } from "vitest";
import {
  type Objetivos,
  ALABEO_MAXIMO,
  loSolto,
  mandosPara,
  porElLadoCorto,
  RITMO_MAXIMO,
  CABECEO_MAXIMO,
} from "./piloto-automatico";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT } from "./aircraft";
import { neutralControls } from "./model";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";

const grados = (g: number): number => (g * Math.PI) / 180;
const enGrados = (r: number): number => (r * 180) / Math.PI;

const quieto = {
  heading: 0,
  alabeo: 0,
  cabeceo: 0,
  altitud: 1000,
  vertical: 0,
  // El canal de gas quiere saber a qué va y con cuánto motor. Ver `Estado`.
  velocidad: 120,
  gas: 0.6,
};

describe("el lado corto de un rumbo", () => {
  it("de 350 a 10 son veinte grados a la derecha, no trescientos cuarenta", () => {
    expect(enGrados(porElLadoCorto(grados(350), grados(10)))).toBeCloseTo(
      20,
      4,
    );
  });

  it("y de 10 a 350, veinte a la izquierda", () => {
    expect(enGrados(porElLadoCorto(grados(10), grados(350)))).toBeCloseTo(
      -20,
      4,
    );
  });

  it("y nunca pide más de media vuelta", () => {
    for (let a = 0; a < 360; a += 7)
      for (let b = 0; b < 360; b += 11)
        expect(
          Math.abs(porElLadoCorto(grados(a), grados(b))),
        ).toBeLessThanOrEqual(Math.PI + 1e-9);
  });
});

describe("las leyes de mando", () => {
  it("con el rumbo a la derecha, alerón a la derecha", () => {
    const m = mandosPara(quieto, { rumbo: grados(30), altitud: null, velocidad: null });
    expect(m.aileron).toBeGreaterThan(0);
  });

  it("y a la izquierda, a la izquierda", () => {
    const m = mandosPara(quieto, { rumbo: grados(-30), altitud: null, velocidad: null });
    expect(m.aileron).toBeLessThan(0);
  });

  it("y no pide poner el avión de canto por un error grande", () => {
    /*
     * El tope es lo que separa un piloto automático de un tirón. Con el rumbo
     * a ciento ochenta grados, el alabeo pedido tiene que ser el máximo y ni
     * un grado más — y el máximo son veinticinco, no noventa.
     */
    const m = mandosPara(quieto, { rumbo: grados(179), altitud: null, velocidad: null });
    // Con el ala a nivel, el alerón pedido es proporcional al alabeo que falta.
    expect(m.aileron).toBeCloseTo(Math.min(1, ALABEO_MAXIMO * 2.2), 3);
    expect(enGrados(ALABEO_MAXIMO)).toBeCloseTo(25, 6);
  });

  it("y ya inclinado lo que toca, deja de pedir alerón", () => {
    // Es lo que hace que entre en el viraje y se quede, en vez de seguir
    // metiendo alabeo hasta darse la vuelta.
    const m = mandosPara(
      { ...quieto, alabeo: ALABEO_MAXIMO },
      { rumbo: grados(179), altitud: null, velocidad: null },
    );
    expect(Math.abs(m.aileron)).toBeLessThan(0.01);
  });

  it("con la altura por encima, tira; por debajo, empuja", () => {
    expect(
      mandosPara(quieto, { rumbo: null, altitud: 1500, velocidad: null }).elevator,
    ).toBeGreaterThan(0);
    expect(
      mandosPara(quieto, { rumbo: null, altitud: 500, velocidad: null }).elevator,
    ).toBeLessThan(0);
  });

  it("y no pide subir más deprisa de lo cómodo", () => {
    // Con la altura muy por encima, el morro pedido es el tope y ni un grado
    // más; el timón sale de perseguir ese morro.
    const m = mandosPara(quieto, { rumbo: null, altitud: 100000, velocidad: null });
    expect(m.elevator).toBeCloseTo(Math.min(1, CABECEO_MAXIMO * 3), 3);
    expect((CABECEO_MAXIMO * 180) / Math.PI).toBeCloseTo(12, 6);
    expect(RITMO_MAXIMO).toBe(7.5);
  });

  it("y el eje que no gobierna lo deja quieto", () => {
    // Con solo el rumbo puesto, la altura es de quien vuela.
    const m = mandosPara(quieto, { rumbo: grados(90), altitud: null, velocidad: null });
    expect(m.elevator).toBe(0);
    const n = mandosPara(quieto, { rumbo: null, altitud: 2000, velocidad: null });
    expect(n.aileron).toBe(0);
  });
});

describe("y se suelta cuando lo tocan", () => {
  it("mover el alerón suelta el rumbo", () => {
    expect(
      loSolto({ rumbo: 0, altitud: null, velocidad: null }, { aileron: 0.5, elevator: 0 }),
    ).toBe(true);
  });

  it("pero un roce no", () => {
    expect(
      loSolto({ rumbo: 0, altitud: null, velocidad: null }, { aileron: 0.05, elevator: 0 }),
    ).toBe(false);
  });

  it("y tocar un eje que no gobierna no suelta nada", () => {
    /*
     * Con solo el rumbo puesto, tirar de la palanca para subir no desconecta:
     * el avión no estaba llevando la altura, así que no hay nada que quitarle.
     */
    expect(
      loSolto({ rumbo: 0, altitud: null, velocidad: null }, { aileron: 0, elevator: 0.9 }),
    ).toBe(false);
  });
});

describe("y pilotando de verdad, llega y se queda", () => {
  /**
   * El lazo cerrado: el piloto automático mandando el motor de vuelo real.
   *
   * Sin esto, unas leyes con los signos bien podrían oscilar sin parar y las
   * pruebas de arriba saldrían verdes igual.
   */
  function volar(
    id: string,
    objetivos: Objetivos,
    segundos: number,
  ) {
    const aircraft = AIRCRAFT.find((a) => a.id === id)!;
    const modelo = new CoefficientFlightModel({
      aircraft,
      ground: () => 0,
      assist: 0,
    });
    const s = modelo.state;
    s.onGround = false;
    s.position.set(0, 2000, 0);
    /*
     * Y se arranca **a la velocidad que se le va a pedir**, que es como se
     * engancha un piloto automático: coge el avión como está. Arrancando al
     * crucero de la ficha y pidiéndole otra cosa, lo que se mediría es el
     * frenazo inicial y no si mantiene.
     */
    const tasPedida =
      objetivos.velocidad === null
        ? aircraft.cruiseSpeed
        : objetivos.velocidad /
          Math.sqrt(airDensity(objetivos.altitud ?? 2000) / SEA_LEVEL_DENSITY);
    s.velocity.set(0, 0, -tasPedida);
    s.heading = 0;
    const dt = 1 / 60;
    let peorAlabeo = 0;
    let peorAltura = 0;
    let masRapido = 0;
    // El gas también lo lleva el automático cuando hay velocidad pedida; si
    // no, se queda donde estaba, como el de quien vuela.
    let gas = 0.7;
    for (let t = 0; t < segundos; t += dt) {
      const ias =
        s.airspeed * Math.sqrt(airDensity(s.position.y) / SEA_LEVEL_DENSITY);
      const m = mandosPara(
        {
          heading: s.heading,
          alabeo: bankAngleOf(s.orientation),
          cabeceo: pitchAngleOf(s.orientation),
          altitud: s.position.y,
          vertical: s.velocity.y,
          velocidad: ias,
          gas,
        },
        objetivos,
      );
      if (m.throttle !== null) gas = m.throttle;
      modelo.step(dt, {
        ...neutralControls(),
        throttle: gas,
        aileron: m.aileron,
        elevator: m.elevator,
      });
      peorAlabeo = Math.max(peorAlabeo, Math.abs(bankAngleOf(s.orientation)));
      if (objetivos.altitud !== null)
        peorAltura = Math.max(
          peorAltura,
          Math.abs(s.position.y - objetivos.altitud),
        );
      masRapido = Math.max(masRapido, ias);
    }
    return { estado: s, peorAlabeo, peorAltura, masRapido };
  }

  it("llega al rumbo pedido y se queda", () => {
    const { estado } = volar(
      "jaz-60",
      { rumbo: grados(90), altitud: 2000, velocidad: null },
      120,
    );
    const falta = Math.abs(
      enGrados(porElLadoCorto(estado.heading, grados(90))),
    );
    expect(falta, `${falta.toFixed(1)}° de error`).toBeLessThan(5);
  });

  it("y sin ponerse de canto por el camino", () => {
    const { peorAlabeo } = volar(
      "jaz-60",
      { rumbo: grados(90), altitud: 2000, velocidad: null },
      120,
    );
    expect(
      enGrados(peorAlabeo),
      `${enGrados(peorAlabeo).toFixed(0)}°`,
    ).toBeLessThan(35);
  });

  it("y mantiene la altura mientras vira, que es lo difícil", () => {
    // Un viraje pierde sustentación vertical: si la altura no se sostiene, el
    // avión sale del viraje quinientos pies más abajo. Eso es lo que hace que
    // un piloto automático de verdad valga la pena.
    const { estado } = volar(
      "jaz-60",
      { rumbo: grados(90), altitud: 2000, velocidad: null },
      120,
    );
    expect(
      Math.abs(estado.position.y - 2000),
      `${Math.round(estado.position.y)} m`,
    ).toBeLessThan(120);
  });

  describe("y el de fuselaje ancho, que es donde se rompió", () => {
    /*
     * Contado jugando con el JAZ 120 y el gas a tope: «me sube a la
     * estratosfera y ahora me baja, hice un bucle y todo»; «sube mucho, baja en
     * barrena, *too fast*, vuelve a subir mucho, vuelve a bajar en barrena».
     *
     * No era el fugoide del avión —medido, son 137 segundos con ζ 0,10, que es
     * un 747 de verdad—: era este piloto automático alimentándolo. Sostenía la
     * altura solo con el morro y dejaba el gas donde estaba, y un reactor con
     * empuje de sobra **no puede** mantener nivel así: pica para no subir, se
     * pasa de velocidad, corrige, y arranca el vaivén.
     *
     * Así que lo que se mide aquí es lo que se contó: cuánto se va de la altura
     * pedida y si se pasa de Vmo. Tres minutos, que es donde el vaivén ya había
     * dado dos vueltas enteras.
     */
    it("mantiene la altura sin irse a la estratosfera", () => {
      const { peorAltura } = volar(
        "jaz-120",
        { rumbo: null, altitud: 2000, velocidad: 120 },
        180,
      );
      // Doscientos metros: un piloto automático de verdad no se va de cien, y
      // el vaivén que se contó pasaba de tres mil.
      expect(peorAltura, `se fue ${Math.round(peorAltura)} m`).toBeLessThan(200);
    });

    it("y sin pasarse de Vmo por el camino", () => {
      const { masRapido } = volar(
        "jaz-120",
        { rumbo: null, altitud: 2000, velocidad: 120 },
        180,
      );
      const vmo = 365 * 0.514444;
      expect(masRapido, `llegó a ${Math.round(masRapido / 0.514444)} kt`).toBeLessThan(vmo);
    });

    it("y llevando rumbo a la vez, que es como se usa", () => {
      const { peorAltura, estado } = volar(
        "jaz-120",
        { rumbo: grados(90), altitud: 2000, velocidad: 120 },
        180,
      );
      expect(peorAltura, `se fue ${Math.round(peorAltura)} m`).toBeLessThan(300);
      const falta = Math.abs(enGrados(porElLadoCorto(estado.heading, grados(90))));
      expect(falta, `${falta.toFixed(1)}° de error`).toBeLessThan(5);
    });
  });
});
/**
 * **Y con el avión trimado, que es como se engancha de verdad.**
 *
 * El lazo cerrado de arriba vuela con los mandos a cero, y con eso no se ve
 * la avería que se ve jugando: «¿por qué el piloto automático sube hasta la
 * estratosfera el avión?».
 *
 * El trim **se suma** al timón —`fdm.ts`: `clamp(assisted.elevator + trim)`—
 * y el automático, en el juego, copia los mandos de quien vuela con el trim
 * dentro y sólo pisa `elevator`. O sea que no toma el avión: **pelea contra
 * él**. Y quien engancha un piloto automático acaba de subir, así que lleva
 * el trim con morro arriba, que es justo el sesgo que lo manda a la
 * estratosfera.
 *
 * Un piloto automático de verdad no pelea con el trim: lo lleva él. Es la
 * misma lección que ya tiene este módulo escrita dos veces —«coge el avión
 * como está»— aplicada al tercer mando.
 */
describe("y con el avión trimado, que es como se engancha de verdad", () => {
  function volarConTrim(
    id: string,
    objetivos: Objetivos,
    segundos: number,
    trim: number,
    /**
     * Si el automático toma el trim, que es lo que hace el juego desde que
     * esto se arregló: mientras lleva la altura, el timón es solo el suyo.
     */
    loToma = false,
  ) {
    const aircraft = AIRCRAFT.find((a) => a.id === id)!;
    const modelo = new CoefficientFlightModel({
      aircraft,
      ground: () => 0,
      assist: 0,
    });
    const s = modelo.state;
    s.onGround = false;
    s.position.set(0, 2000, 0);
    const tasPedida =
      objetivos.velocidad === null
        ? aircraft.cruiseSpeed
        : objetivos.velocidad /
          Math.sqrt(airDensity(objetivos.altitud ?? 2000) / SEA_LEVEL_DENSITY);
    s.velocity.set(0, 0, -tasPedida);
    s.heading = 0;
    const dt = 1 / 60;
    let gas = 0.7;
    let masAlto = s.position.y;
    for (let t = 0; t < segundos; t += dt) {
      const ias =
        s.airspeed * Math.sqrt(airDensity(s.position.y) / SEA_LEVEL_DENSITY);
      const m = mandosPara(
        {
          heading: s.heading,
          alabeo: bankAngleOf(s.orientation),
          cabeceo: pitchAngleOf(s.orientation),
          altitud: s.position.y,
          vertical: s.velocity.y,
          velocidad: ias,
          gas,
        },
        objetivos,
      );
      if (m.throttle !== null) gas = m.throttle;
      // Lo que hace `game.ts`: los mandos de quien vuela —trim incluido— con
      // lo del automático encima.
      modelo.step(dt, {
        ...neutralControls(),
        // Ver `conElPilotoAutomatico`: con la altura puesta, el trim va a cero.
        trim: loToma && objetivos.altitud !== null ? 0 : trim,
        throttle: gas,
        aileron: m.aileron,
        elevator: m.elevator,
      });
      masAlto = Math.max(masAlto, s.position.y);
    }
    return { estado: s, masAlto, subio: masAlto - 2000 };
  }

  it("sin trim mantiene la altura, que es lo que ya se sabía", () => {
    const { subio } = volarConTrim(
      "jaz-60",
      { rumbo: null, altitud: 2000, velocidad: 140 },
      180,
      0,
    );
    expect(subio).toBeLessThan(120);
  });

  /*
   * **Y con el trim arriba del todo, que es como queda quien acaba de subir.**
   *
   * Medido antes de tomar el trim, mandando mantener dos mil metros durante
   * cinco minutos: el jaz-60 acababa en 3.996 m, el jaz-120 en 7.205 y el
   * jaz-90 en **8.774** — literalmente la estratosfera, que es la palabra que
   * se usó al contarlo.
   *
   * Lo que se comprueba aquí es la cura: mientras el automático lleva la
   * altura, el timón que ve el avión es solo el suyo, así que da igual cómo
   * estuviera trimado. Ver `conElPilotoAutomatico` en `game.ts`.
   */
  it.each([0, 0.5, 1])(
    "y con el trim en %s, porque el automático lo toma en vez de pelearlo",
    (trim) => {
      const { subio } = volarConTrim(
        "jaz-60",
        { rumbo: null, altitud: 2000, velocidad: 140 },
        180,
        trim,
        // Lo que hace el juego desde que el automático toma el trim.
        true,
      );
      expect(subio).toBeLessThan(120);
    },
  );

  /*
   * **Y la prueba de que estas pruebas podían fallar.**
   *
   * Un «no se va» solo vale si el aparejo era capaz de ver que se iba. Esta
   * mide justo lo contrario que las de arriba: con el trim sumándose al timón
   * —como estaba antes— el avión **sí** se va, y por eso las otras significan
   * algo. Si algún día ésta deja de pasar, lo primero que hay que mirar no es
   * el piloto automático: es si el trim sigue llegando al modelo de vuelo.
   */
  it("y sin tomar el trim se iba de verdad: la prueba podía fallar", () => {
    const { subio } = volarConTrim(
      "jaz-90",
      { rumbo: null, altitud: 2000, velocidad: 140 },
      300,
      1,
      false,
    );
    expect(subio).toBeGreaterThan(5000);
  });

  it("y el avión más pesado tampoco se va, que es donde más se notaba", () => {
    const { subio } = volarConTrim(
      "jaz-90",
      { rumbo: null, altitud: 2000, velocidad: 140 },
      300,
      1,
      true,
    );
    expect(subio).toBeLessThan(200);
  });
});
