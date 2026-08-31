import { describe, expect, it } from 'vitest';
import { delante, traves, enEjesDePista, puntoDePista } from './rumbo';

const cerca = (a: readonly [number, number], b: readonly [number, number]) => {
  expect(a[0]).toBeCloseTo(b[0], 6);
  expect(a[1]).toBeCloseTo(b[1], 6);
};

describe('los rumbos apuntan a donde deben', () => {
  it('el norte es la Z negativa', () => cerca(delante(0), [0, -1]));
  it('el este es la X positiva', () => cerca(delante(90), [1, 0]));
  it('el sur es la Z positiva', () => cerca(delante(180), [0, 1]));
  it('el oeste es la X negativa', () => cerca(delante(270), [-1, 0]));

  /**
   * El caso que lo destapó todo. Con rumbos redondos la versión equivocada
   * —`(sen h, cos h)`— acierta o solo cambia un signo en un eje simétrico;
   * con un rumbo cualquiera, apunta a otro sitio.
   */
  it('un rumbo cualquiera no coincide con la versión equivocada', () => {
    const [x, z] = delante(192.45);
    const mala: readonly [number, number] = [Math.sin(3.3589), Math.cos(3.3589)];
    expect(Math.hypot(x - mala[0], z - mala[1])).toBeGreaterThan(1.5);
  });

  it('el través va a la derecha del avance', () => {
    for (const rumbo of [0, 37, 90, 192.45, 300]) {
      const [fx, fz] = delante(rumbo);
      const [tx, tz] = traves(rumbo);
      // Perpendiculares.
      expect(fx * tx + fz * tz).toBeCloseTo(0, 6);
      // Y a la derecha: el producto vectorial en Y es negativo con Z al sur.
      expect(fx * tz - fz * tx).toBeCloseTo(1, 6);
    }
  });
});

describe('los ejes de pista', () => {
  it('un punto delante del centro da along positivo', () => {
    const { along, across } = enEjesDePista(0, -100, 0, 0, 0);
    expect(along).toBeCloseTo(100, 6);
    expect(across).toBeCloseTo(0, 6);
  });

  it('y uno a la derecha da across positivo, con cualquier rumbo', () => {
    for (const rumbo of [0, 37, 192.45]) {
      const [tx, tz] = traves(rumbo);
      const { along, across } = enEjesDePista(tx * 50, tz * 50, 0, 0, rumbo);
      expect(across).toBeCloseTo(50, 5);
      expect(along).toBeCloseTo(0, 5);
    }
  });
});

describe('la cabecera de una pista', () => {
  it('queda por detrás del centro, en el eje', () => {
    // Rumbo 90°: la pista corre hacia el este, así que la cabecera está al
    // oeste del centro y a la misma Z.
    const [x, z] = puntoDePista({ x: 0, z: 0, heading: 90 }, 500);
    expect(x).toBeCloseTo(-500, 6);
    expect(z).toBeCloseTo(0, 6);
  });

  it('con rumbos no redondos también, que es donde fallaba', () => {
    // Tenerife Norte: 110,67° verdaderos. Con el signo del coseno cambiado la
    // cabecera salía a más de un kilómetro de donde está.
    const centro = { x: -4, z: 3, heading: 110.67 };
    const [x, z] = puntoDePista(centro, 1584);
    expect(x).toBeCloseTo(-4 - Math.sin((110.67 * Math.PI) / 180) * 1584, 3);
    expect(z).toBeCloseTo(3 + Math.cos((110.67 * Math.PI) / 180) * 1584, 3);
    // Y está en el eje: proyectada, su separación lateral es cero.
    const { across, along } = enEjesDePista(x, z, centro.x, centro.z, centro.heading);
    expect(Math.abs(across)).toBeLessThan(1e-6);
    expect(along).toBeCloseTo(-1584, 3);
  });

  it('coincide con el umbral medido de Tenerife Norte', () => {
    // El umbral 12 del fichero, pasado a coordenadas de mundo (Z invertida).
    const esperado = [-1485.8, -556.3];
    const [x, z] = puntoDePista(
      { x: (-1485.8 + 1477.9) / 2, z: -(556.3 - 562.1) / 2, heading: 110.67 },
      Math.hypot(1477.9 + 1485.8, -562.1 - 556.3) / 2,
    );
    expect(x).toBeCloseTo(esperado[0]!, 0);
    expect(z).toBeCloseTo(esperado[1]!, 0);
  });
});
