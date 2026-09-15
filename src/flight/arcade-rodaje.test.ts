/**
 * Girar rodando: para girar hay que ir despacio.
 *
 * **Faltaba el número que hace que eso sea verdad.** La autoridad de la rueda
 * de morro no dependía de la velocidad más que para apagarse, así que el
 * *radio* de giro se encogía según se frenaba: al revés de como funciona
 * cualquier cosa con ruedas.
 *
 * Medido en el banco con la ayuda de rodaje mandando: a doce metros por
 * segundo el avión giraba a **cincuenta y cinco grados por segundo**, o sea un
 * radio de doce metros a cuarenta y tres por hora — más de un g de lado. Un
 * avión así se sale de la calle o se apoya en un ala. Y en la pantalla se veía
 * exactamente eso: una pirueta al pasar la boca de la salida.
 *
 * Lo que se comprueba aquí es el hecho físico, no un número de ajuste: **a más
 * velocidad, más radio**.
 */

import { describe, expect, it } from "vitest";
import { ArcadeFlightModel } from "./arcade";
import { PYKASU } from "./aircraft";
import { neutralControls } from "./model";
import { Vector3 } from "three";

/**
 * Rueda un segundo a esa velocidad con el timón a fondo y devuelve el radio
 * de la curva que sale, en metros.
 */
function curvaRodando(velocidad: number): { radio: number; v: number } {
  const m = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
  m.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: velocidad });
  const mandos = {
    ...neutralControls(),
    engineOn: true,
    // Gas para sostener la velocidad; el timón, a fondo.
    throttle: m.gasPara(velocidad),
    aileron: 1,
  };
  const antes = m.state.heading;
  let giro = 0;
  let suma = 0;
  let n = 0;
  /*
   * Y se mide con la **velocidad media** del tramo, no con la de partida: el
   * avión frena mientras gira, y dividiendo por la inicial salía un radio
   * mayor del real. La prueba culpaba al modelo de algo que era suyo.
   */
  for (let t = 0; t < 1; t += 0.02) {
    // Y se sostiene la velocidad a mano: `gasPara` está calibrado para volar,
    // no para rodar, así que con él puesto el avión frenaba mientras giraba y
    // lo que se medía era la curva de otra velocidad.
    mandos.throttle = m.state.airspeed < velocidad ? 1 : 0;
    m.step(0.02, mandos);
    giro = m.state.heading - antes;
    suma += m.state.airspeed;
    n++;
  }
  // v = ω·R, con ω en radianes por segundo y el paso de un segundo.
  const v = suma / n;
  return { radio: v / Math.abs(giro), v };
}

/** El radio de la curva a esa velocidad, m. */
const radioRodando = (velocidad: number): number =>
  curvaRodando(velocidad).radio;

/**
 * Y lo que se tira de lado en esa curva, en fracción de g.
 *
 * Con la misma velocidad media con la que se midió el radio: mezclar la
 * nominal con la medida da un número que no es de nadie.
 */
const deLado = (velocidad: number): number => {
  const c = curvaRodando(velocidad);
  return c.v ** 2 / c.radio / 9.81;
};

describe("girar rodando", () => {
  it("a paso de peatón el avión pivota, que es lo que hace uno de verdad", () => {
    // Un radio pequeño a poca velocidad no es raro: es dar la vuelta en el
    // puesto, y sin eso no se puede abortar un despegue y volver.
    expect(radioRodando(2)).toBeLessThan(12);
  });

  it("y lanzado no gira cerrado, por mucho que se pida", () => {
    expect(radioRodando(12)).toBeGreaterThan(20);
    expect(radioRodando(25)).toBeGreaterThan(90);
  });

  it("el radio crece con la velocidad, que es de lo que va esto", () => {
    const radios = [4, 8, 12, 18, 25].map(radioRodando);
    for (let i = 1; i < radios.length; i++) {
      expect(radios[i]!).toBeGreaterThan(radios[i - 1]!);
    }
  });

  it("y nunca se tira de lado más de lo que aguanta un tren de aterrizaje", () => {
    // Antes de esto, a doce metros por segundo salía **más de un g**. El
    // tope está calibrado contra la maniobra más cerrada que el juego pide:
    // alinearse en la cabecera desde el punto de espera.
    for (const v of [8, 12, 18, 25, 35]) {
      expect(deLado(v)).toBeLessThan(0.7);
    }
  });

  it("la calibración que ya estaba escrita sigue en pie: veinte metros al rodaje", () => {
    // Nueve metros por segundo es la velocidad de rodaje de este juego, y con
    // ella una calle de rodaje tiene que poder tomarse.
    expect(radioRodando(9)).toBeLessThan(20);
  });
});

/**
 * Y el gas que sostiene una velocidad de rodaje.
 *
 * El tope de rodaje habla en metros por segundo y el juego lo traduce a gas
 * preguntándole al modelo. La primera vez se preguntó con `gasPara`, que está
 * calibrado para volar: contestó **cero** —para volar a nueve metros por
 * segundo hace falta un gas negativo— y el avión se quedó clavado en el puesto
 * con el motor en marcha. Lo cazó el banco: «fase arrancando a 0.0 m/s,
 * quedan 2034 m».
 */
describe("el gas de rodar", () => {
  it("sostiene la velocidad que se le pide", () => {
    const m = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
    m.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 0 });
    const mandos = {
      ...neutralControls(),
      engineOn: true,
      throttle: m.gasParaRodar(10.35),
    };
    for (let t = 0; t < 60; t += 0.02) m.step(0.02, mandos);
    expect(m.state.airspeed).toBeCloseTo(10.35, 0);
  });

  it("y no es cero para una velocidad de rodaje", () => {
    // El fallo, en una línea: preguntar por rodar con la cuenta de volar.
    const m = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
    expect(m.gasPara(9)).toBe(0);
    expect(m.gasParaRodar(9)).toBeGreaterThan(0.1);
  });
});

/**
 * Y **el modelo dice cuánto está girando**, que es lo que se le pregunta.
 *
 * Aquí se publicaba `yawRate = 0` siempre, al lado del alabeo y el cabeceo.
 * Pero no es lo mismo: el alabeo y el cabeceo de este modelo son de adorno —el
 * avión se inclina para que se vea bien—, mientras que **la guiñada es el giro
 * de verdad**, el número con el que se mueve el rumbo. Un cero ahí es decir que
 * el avión no gira mientras gira.
 *
 * Y lo leía alguien: la ayuda de rodaje amortigua con `yawRate` para aflojar
 * antes de llegar a la raya, así que en Guyrami —el único peldaño que vuela
 * este modelo— el amortiguador valía cero y la corrección era un proporcional
 * puro con tope. En la primera esquina del rodaje de Pettirossi el avión se
 * abría veinticuatro metros, que es fuera de una calle de veintitrés.
 */
describe("el modelo sencillo dice cuánto gira", () => {
  it("rodando, la guiñada es la que mueve el rumbo", () => {
    const m = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
    m.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 6 });
    const mandos = {
      ...neutralControls(),
      engineOn: true,
      throttle: m.gasPara(6),
      aileron: 1,
    };
    const antes = m.state.heading;
    m.step(0.02, mandos);
    const medido = (m.state.heading - antes) / 0.02;
    expect(m.state.yawRate).toBeGreaterThan(0);
    expect(m.state.yawRate).toBeCloseTo(medido, 6);
  });

  it("y con el volante quieto no gira", () => {
    const m = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
    m.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 6 });
    m.step(0.02, { ...neutralControls(), engineOn: true, throttle: 0.3 });
    expect(m.state.yawRate).toBe(0);
  });

  /*
   * Y el signo, que es de las cosas que se descubren tarde y caras: a la
   * derecha, positivo. Lo dice `model.ts` y lo dan por hecho el amortiguador de
   * la ayuda de rodaje y todo lo que mire esta cifra.
   */
  it("y a la izquierda gira al revés", () => {
    const m = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
    m.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 6 });
    const mandos = {
      ...neutralControls(),
      engineOn: true,
      throttle: m.gasPara(6),
      aileron: -1,
    };
    m.step(0.02, mandos);
    expect(m.state.yawRate).toBeLessThan(0);
  });
});
