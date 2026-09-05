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
import { OGA_172 } from "./aircraft";
import { neutralControls } from "./model";
import { Vector3 } from "three";

/**
 * Rueda un segundo a esa velocidad con el timón a fondo y devuelve el radio
 * de la curva que sale, en metros.
 */
function curvaRodando(velocidad: number): { radio: number; v: number } {
  const m = new ArcadeFlightModel({ aircraft: OGA_172, ground: () => 0 });
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
