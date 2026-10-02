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
  type Estado,
  type Objetivos,
  ALABEO_MAXIMO,
  ALABEO_POR_SEGUNDO,
  CARGA_QUE_PIDE,
  loSolto,
  mandosPara,
  memoriaNueva,
  porElLadoCorto,
  RITMO_MAXIMO,
  sePuedeConectar,
} from "./piloto-automatico";
import { CoefficientFlightModel, empujeLleno } from "./fdm";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { neutralControls } from "./model";
import { airDensity, GRAVITY, SEA_LEVEL_DENSITY } from "./atmosphere";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";
import { NO_ASSISTS, type AssistLayers } from "./assists";
import { TAGUATO, TUKA } from "./tiers";
import { Vector3 } from "three";

const grados = (g: number): number => (g * Math.PI) / 180;
const enGrados = (r: number): number => (r * 180) / Math.PI;

const quieto: Estado = {
  heading: 0,
  alabeo: 0,
  cabeceo: 0,
  altitud: 1000,
  vertical: 0,
  // El canal de gas quiere saber a qué va y con cuánto motor. Ver `Estado`.
  velocidad: 120,
  gas: 0.6,
  verdadera: 120,
  ritmoDeCabeceo: 0,
};

/**
 * Lo que la memoria del automático va pidiendo con el avión quieto, fotograma
 * a fotograma: sirve para ver sus topes de ritmo sin el avión de por medio.
 */
function pedirDurante(o: Objetivos, segundos: number) {
  const m = memoriaNueva();
  let ultimo = mandosPara(quieto, o, 1 / 60, m);
  for (let t = 1 / 60; t < segundos; t += 1 / 60)
    ultimo = mandosPara(quieto, o, 1 / 60, m);
  return { memoria: m, mandos: ultimo };
}

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
     * a ciento setenta grados, el alabeo pedido tiene que llegar al máximo y
     * ni un grado más — y el máximo son veinticinco, no noventa.
     */
    const { memoria } = pedirDurante(
      { rumbo: grados(170), altitud: null, velocidad: null },
      20,
    );
    expect(enGrados(memoria.alabeo)).toBeCloseTo(25, 3);
    expect(enGrados(ALABEO_MAXIMO)).toBeCloseTo(25, 6);
  });

  it("y entra en el viraje a cinco grados por segundo, no de golpe", () => {
    // Lo primero que nota el pasaje es el ala que se va. Ver `ALABEO_POR_SEGUNDO`.
    const { memoria } = pedirDurante(
      { rumbo: grados(170), altitud: null, velocidad: null },
      2,
    );
    expect(enGrados(memoria.alabeo)).toBeCloseTo(10, 0);
    expect(enGrados(ALABEO_POR_SEGUNDO)).toBeCloseTo(5, 6);
  });

  it("y ya inclinado lo que toca, deja de pedir alerón", () => {
    // Es lo que hace que entre en el viraje y se quede, en vez de seguir
    // metiendo alabeo hasta darse la vuelta.
    const m = memoriaNueva();
    const inclinado = { ...quieto, alabeo: ALABEO_MAXIMO };
    mandosPara(inclinado, { rumbo: grados(170), altitud: null, velocidad: null }, 1 / 60, m);
    const r = mandosPara(
      inclinado,
      { rumbo: grados(170), altitud: null, velocidad: null },
      1 / 60,
      m,
    );
    expect(Math.abs(r.aileron)).toBeLessThan(0.01);
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
    // Con la altura muy por encima, el ritmo pedido llega al tope y ni un
    // metro por segundo más.
    const { memoria } = pedirDurante({ rumbo: null, altitud: 100000, velocidad: null }, 30);
    expect(memoria.ritmo).toBeCloseTo(RITMO_MAXIMO, 6);
    expect(RITMO_MAXIMO).toBe(7.5);
  });

  it("y llega a ese ritmo con una décima de g, no de un tirón", () => {
    // En un segundo, el ritmo pedido sube lo que da una décima de g: casi un
    // metro por segundo. Ver `CARGA_QUE_PIDE`.
    const { memoria } = pedirDurante({ rumbo: null, altitud: 100000, velocidad: null }, 1);
    expect(memoria.ritmo).toBeCloseTo(CARGA_QUE_PIDE * GRAVITY, 1);
    expect(CARGA_QUE_PIDE).toBe(0.1);
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

describe("y en tierra no se conecta", () => {
  /*
   * Si se conectara, la regla de «en tierra se suelta» lo soltaría al
   * fotograma siguiente cantando la desconexión: una alarma por apretar un
   * botón en la plataforma. Ver `sePuedeConectar`.
   */
  it("con peso en las ruedas, el botón no engancha", () => {
    expect(sePuedeConectar({ enTierra: true })).toBe(false);
  });

  it("en el aire, sí", () => {
    expect(sePuedeConectar({ enTierra: false })).toBe(true);
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
    const memoria = memoriaNueva();
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
          verdadera: s.airspeed,
          ritmoDeCabeceo: s.pitchRate,
          // El empuje y la masa, como se los da el juego a los gases.
          empujeAFondo: empujeLleno(aircraft, airDensity(s.position.y), s.airspeed),
          masa: aircraft.mass,
        },
        objetivos,
        dt,
        memoria,
      );
      if (m.throttle !== null) gas = m.throttle;
      modelo.step(dt, {
        ...neutralControls(),
        throttle: gas,
        aileron: m.aileron,
        elevator: m.elevator,
        automatico: true,
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
 * y el automático, en el juego, copiaba los mandos de quien vuela con el trim
 * dentro y sólo pisaba `elevator`. O sea que no tomaba el avión: **peleaba
 * contra él**. Y quien engancha un piloto automático acaba de subir, así que
 * lleva el trim con morro arriba, que es justo el sesgo que lo manda a la
 * estratosfera.
 *
 * Un piloto automático de verdad no pelea con el trim: lo lleva él. Es la
 * misma lección que ya tiene este módulo escrita dos veces —«coge el avión
 * como está»— aplicada al tercer mando. Y desde que el automático mueve el
 * timón con un servo, lo coge **donde estaba**: el timón con el que el avión
 * venía volando, compensador incluido. Ver `timonAhora` en `model.ts`.
 */
describe("y con el avión trimado, que es como se engancha de verdad", () => {
  /**
   * Vuela con el automático enganchado a un avión que venía nivelado y
   * compensado, con el compensador de quien vuela en `trim` y la palanca
   * sosteniendo lo que falte. Lo que el automático coge al engancharse es el
   * timón con el que venía volando, que es lo que coge el juego.
   */
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
    const alto = objetivos.altitud ?? 2000;
    const tas =
      (objetivos.velocidad ?? aircraft.approachSpeed * 1.5) /
      Math.sqrt(airDensity(alto) / SEA_LEVEL_DENSITY);
    // Nivelado y compensado: el ángulo que sostiene el peso y su timón.
    const q = 0.5 * airDensity(alto) * tas * tas;
    const a = aircraft.aero;
    const alfa =
      ((aircraft.mass * GRAVITY) / (q * aircraft.wingArea) - a.cl0) / a.clAlpha;
    const venia = -(a.cm0 + a.cmAlpha * alfa) / a.cmElevator;
    s.onGround = false;
    s.position.set(0, alto, 0);
    s.velocity.set(0, 0, -tas);
    s.orientation.setFromAxisAngle(new Vector3(1, 0, 0), alfa);
    const dt = 1 / 60;
    let gas = 0.7;
    let masAlto = s.position.y;
    const memoria = memoriaNueva();
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
          verdadera: s.airspeed,
          ritmoDeCabeceo: s.pitchRate,
          // El empuje y la masa, como se los da el juego a los gases.
          empujeAFondo: empujeLleno(aircraft, airDensity(s.position.y), s.airspeed),
          masa: aircraft.mass,
          timon: venia,
        },
        objetivos,
        dt,
        memoria,
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
        automatico: true,
      });
      masAlto = Math.max(masAlto, s.position.y);
    }
    return { estado: s, masAlto, subio: masAlto - alto };
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
   *
   * Se va menos que antes, y es por el servo: el automático busca el timón
   * que sostiene el avión, y con el trim sumado lo busca más abajo. Mientras
   * cabe en el recorrido del timón, lo encuentra; con el trim a tope ya no
   * cabe —el timón no baja de −1—, y el avión se le escapa hacia arriba.
   */
  it("y sin tomar el trim se iba de verdad: la prueba podía fallar", () => {
    const { subio } = volarConTrim(
      "jaz-90",
      { rumbo: null, altitud: 2000, velocidad: 140 },
      300,
      1,
      false,
    );
    expect(subio).toBeGreaterThan(1000);
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

/**
 * **Y sin sacudir a nadie: los topes de un automático de verdad, en toda la
 * flota.**
 *
 * Un piloto automático de verdad se limita en lo que se nota desde el asiento:
 * la carga, unas tres décimas de g arriba o abajo como mucho, y lo deprisa que
 * gira el morro, unos pocos grados por segundo. El de antes no: el JAZ 90, ya
 * nivelado y sin hacer nada más que sostener dos mil metros, cabeceaba entre
 * −2,2 g y 3,6 g con el morro girando a sesenta grados por segundo.
 *
 * Aquí se mide en cada avión de la flota, con las ayudas de cada peldaño que
 * lleva automático, abajo y en su crucero, y en todo lo que hace: sostener,
 * subir y bajar a otra altura, cambiar de rumbo, y soltarlo para volar a mano
 * y volver a cogerlo. Bajar por el plan está en `bajar-por-el-plan.test.ts`.
 *
 * Se arranca **compensado**, que es como se engancha un automático: con el
 * ángulo y el timón con los que el avión vuela nivelado. Arrancando con el
 * ala a cero grados, lo que se mediría es la caída del primer segundo.
 */
describe("y sin sacudir a nadie: los topes de un automático de verdad", () => {
  /** La carga que no se pasa, g arriba o abajo de uno. */
  const CARGA = 0.3;
  /** Lo más deprisa que gira el morro, °/s. */
  const GIRO = 3;

  const PELDANOS: readonly (readonly [string, AssistLayers])[] = [
    ["sin ayudas", NO_ASSISTS],
    ["Taguato", TAGUATO.assists],
    ["Tukã", TUKA.assists],
  ];

  interface Medida {
    cargaMin: number;
    cargaMax: number;
    giroMax: number;
    altura: number;
  }

  /** Un avión nivelado y compensado: con el ángulo y el timón con los que vuela así. */
  function compensado(
    a: AircraftConfig,
    capas: AssistLayers,
    alto: number,
    ias: number,
  ): { modelo: CoefficientFlightModel; timon: number } {
    const modelo = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: capas });
    const s = modelo.state;
    const tas = ias / Math.sqrt(airDensity(alto) / SEA_LEVEL_DENSITY);
    const q = 0.5 * airDensity(alto) * tas * tas;
    const alfa = ((a.mass * GRAVITY) / (q * a.wingArea) - a.aero.cl0) / a.aero.clAlpha;
    s.onGround = false;
    s.position.set(0, alto, 0);
    s.velocity.set(0, 0, -tas);
    s.orientation.setFromAxisAngle(new Vector3(1, 0, 0), alfa);
    return { modelo, timon: -(a.aero.cm0 + a.aero.cmAlpha * alfa) / a.aero.cmElevator };
  }

  /**
   * Vuela una maniobra y mide la carga y el giro del morro **mientras manda
   * el automático**. `pide(t)` dice qué se le pide en cada momento, o `null`
   * si en ese momento vuela una persona: entonces tira un poco de la palanca
   * y la suelta, y al volver a engancharlo, el automático coge el avión como
   * lo encuentre.
   */
  function maniobra(
    a: AircraftConfig,
    capas: AssistLayers,
    alto: number,
    ias: number,
    pide: (t: number, altura: number) => Objetivos | null,
    segundos: number,
  ): Medida {
    const { modelo, timon } = compensado(a, capas, alto, ias);
    const s = modelo.state;
    const dt = 1 / 60;
    let gas = 0.6;
    let trim = 0;
    let memoria = memoriaNueva();
    let puesto = false;
    let antes = pitchAngleOf(s.orientation);
    let aMano = 0;
    const m: Medida = { cargaMin: 9, cargaMax: -9, giroMax: 0, altura: alto };
    for (let t = 0; t < segundos; t += dt) {
      const o = pide(t, s.position.y);
      let aileron = 0;
      let elevator = 0;
      if (o) {
        if (!puesto) memoria = memoriaNueva();
        const r = mandosPara(
          {
            heading: s.heading,
            alabeo: bankAngleOf(s.orientation),
            cabeceo: pitchAngleOf(s.orientation),
            altitud: s.position.y,
            vertical: s.velocity.y,
            velocidad: s.airspeed * Math.sqrt(airDensity(s.position.y) / SEA_LEVEL_DENSITY),
            gas,
            verdadera: s.airspeed,
            ritmoDeCabeceo: s.pitchRate,
            // El empuje y la masa, como se los da el juego a los gases.
            empujeAFondo: empujeLleno(a, airDensity(s.position.y), s.airspeed),
            masa: a.mass,
            // Lo que hace el juego al engancharlo. Ver `conElPilotoAutomatico`.
            timon: t === 0 ? timon : modelo.timonAhora(),
          },
          o,
          dt,
          memoria,
        );
        if (r.throttle !== null) gas = r.throttle;
        aileron = r.aileron;
        elevator = r.elevator;
        // Y al soltarlo, su timón se queda en el compensador, como en el juego.
        trim = elevator;
        aMano = 0;
      } else {
        // A mano: un tirón suave de tres segundos, y soltar.
        elevator = aMano < 3 ? 0.08 : 0;
        aMano += dt;
      }
      puesto = o !== null;
      modelo.step(dt, {
        ...neutralControls(),
        throttle: gas,
        aileron,
        elevator,
        trim: puesto ? 0 : trim,
        automatico: puesto,
      });
      const ahora = pitchAngleOf(s.orientation);
      if (puesto && t > 0) {
        m.cargaMin = Math.min(m.cargaMin, s.loadFactor);
        m.cargaMax = Math.max(m.cargaMax, s.loadFactor);
        m.giroMax = Math.max(m.giroMax, Math.abs(ahora - antes) / dt);
      }
      antes = ahora;
    }
    m.altura = s.position.y;
    return m;
  }

  const enTopes = (m: Medida, que: string): void => {
    const detalle = `${que}: de ${m.cargaMin.toFixed(2)} a ${m.cargaMax.toFixed(2)} g, morro a ${enGrados(m.giroMax).toFixed(1)}°/s`;
    expect(m.cargaMax, detalle).toBeLessThan(1 + CARGA);
    expect(m.cargaMin, detalle).toBeGreaterThan(1 - CARGA);
    expect(enGrados(m.giroMax), detalle).toBeLessThan(GIRO);
  };

  for (const a of AIRCRAFT) {
    // Abajo, a vez y media la de aproximación —la de un circuito o una
    // espera— y arriba, a su crucero.
    const donde: readonly (readonly [string, number, number])[] = [
      ["a dos mil metros", 2000, a.approachSpeed * 1.5],
      [
        "en su crucero",
        a.alturaDeCrucero,
        a.cruiseSpeed * Math.sqrt(airDensity(a.alturaDeCrucero) / SEA_LEVEL_DENSITY),
      ],
    ];
    for (const [nombre, capas] of PELDANOS)
      for (const [dondeVa, alto, ias] of donde)
        it(`${a.id}, ${nombre}, ${dondeVa}`, () => {
          const va = (o: Partial<Objetivos>) => (): Objetivos => ({
            rumbo: 0,
            altitud: alto,
            velocidad: ias,
            ...o,
          });
          enTopes(maniobra(a, capas, alto, ias, va({}), 60), "sosteniendo");
          /*
           * Tres minutos para subir trescientos metros: de sobra en un
           * reactor, y lo justo en una avioneta en su crucero, donde lo que
           * sube es lo poco que le sobra al motor.
           */
          const sube = maniobra(a, capas, alto, ias, va({ altitud: alto + 300 }), 180);
          enTopes(sube, "subiendo trescientos metros");
          expect(Math.abs(sube.altura - (alto + 300))).toBeLessThan(15);
          const baja = maniobra(a, capas, alto, ias, va({ altitud: alto - 300 }), 120);
          enTopes(baja, "bajando trescientos metros");
          expect(Math.abs(baja.altura - (alto - 300))).toBeLessThan(15);
          enTopes(maniobra(a, capas, alto, ias, va({ rumbo: grados(90) }), 150), "virando a la derecha");
          enTopes(maniobra(a, capas, alto, ias, va({ rumbo: grados(-150) }), 150), "virando a la izquierda");
          // Soltarlo a los veinte segundos, volar a mano diez, y volver a
          // cogerlo con la altura que haya: la que coge el juego.
          let cogida: number | null = null;
          const vuelve = maniobra(
            a,
            capas,
            alto,
            ias,
            (t, altura) => {
              if (t >= 20 && t < 30) return null;
              if (t >= 30 && cogida === null) cogida = altura;
              return { rumbo: 0, altitud: cogida ?? alto, velocidad: ias };
            },
            120,
          );
          enTopes(vuelve, "soltado y vuelto a coger");
          expect(Math.abs(vuelve.altura - (cogida ?? alto))).toBeLessThan(15);
        });
  }

  /*
   * **Y la prueba de que la medida ve la carga.** Un «no se pasa» solo vale
   * si el aparejo es capaz de ver que se pasa: el mismo JAZ 90, compensado
   * igual, con una mano que tira de la palanca un segundo, pasa de las tres
   * décimas de largo.
   */
  it("y un tirón a mano sí se pasa: la medida ve la carga", () => {
    const a = AIRCRAFT.find((x) => x.id === "jaz-90")!;
    const { modelo, timon } = compensado(a, NO_ASSISTS, 2000, a.approachSpeed * 1.5);
    let peor = 1;
    for (let t = 0; t < 3; t += 1 / 60) {
      modelo.step(1 / 60, {
        ...neutralControls(),
        throttle: 0.6,
        trim: timon,
        elevator: t < 1 ? 0.3 : 0,
      });
      peor = Math.max(peor, modelo.state.loadFactor);
    }
    expect(peor).toBeGreaterThan(1 + CARGA);
  });
});
