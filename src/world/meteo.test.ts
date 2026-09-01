import { describe, expect, it } from 'vitest';
import { deFrente, leerMetar, TIEMPO_DE_CASA } from './meteo';

describe('leerMetar', () => {
  it('lee el de Tenerife Norte, que es el que puso la 30 en uso', () => {
    const m = leerMetar('METAR GCXO 011930Z 29014KT 250V320 9999 FEW002 BKN010 21/18 Q1021 NOSIG');
    expect(m).not.toBeNull();
    expect(m!.vientoDe).toBe(290);
    expect(m!.vientoKt).toBe(14);
    expect(m!.qnh).toBe(1021);
    expect(m!.temp).toBe(21);
    // BKN010 son mil pies: trescientos cinco metros. FEW no pone techo.
    expect(m!.techoM).toBe(305);
    expect(m!.visibilidadM).toBe(10000);
  });

  it('lee el de Asunción', () => {
    const m = leerMetar('METAR SGAS 011900Z 18012KT 9999 OVC015 21/16 Q1016')!;
    expect(m.vientoDe).toBe(180);
    expect(m.vientoKt).toBe(12);
    expect(m.techoM).toBe(457);
  });

  it('el viento variable y la calma no son una dirección', () => {
    expect(leerMetar('METAR SGAS 011900Z VRB03KT 9999 21/16 Q1016')!.vientoDe).toBeNull();
    expect(leerMetar('METAR SGAS 011900Z 00000KT 9999 21/16 Q1016')!.vientoDe).toBeNull();
  });

  it('entiende las ráfagas y se queda con el viento sostenido', () => {
    const m = leerMetar('METAR SGAS 011900Z 18012G28KT 9999 21/16 Q1016')!;
    expect(m.vientoDe).toBe(180);
    expect(m.vientoKt).toBe(12);
  });

  it('pasa metros por segundo a nudos, que es lo que canta la manga', () => {
    expect(leerMetar('METAR UUEE 011900Z 27006MPS 9999 05/02 Q1009')!.vientoKt).toBe(12);
  });

  it('entiende las pulgadas de mercurio y el frío bajo cero', () => {
    const m = leerMetar('METAR KJFK 011951Z 31015KT 10SM FEW250 M03/M12 A2992')!;
    expect(m.qnh).toBe(1013);
    expect(m.temp).toBe(-3);
    expect(m.techoM).toBeNull();
  });

  it('un grupo raro no le quita el viento', () => {
    const m = leerMetar('METAR SGAS 011900Z 18012KT 9999 R02/0900U WS ALL RWY 21/16 Q1016')!;
    expect(m.vientoDe).toBe(180);
  });

  it('lo que no es un METAR devuelve nada, no un invento', () => {
    expect(leerMetar('')).toBeNull();
    expect(leerMetar('no hay datos')).toBeNull();
  });
});

describe('deFrente', () => {
  it('el viento del 290 es de frente entero en la pista 30 de Tenerife', () => {
    const m = leerMetar('METAR GCXO 011930Z 29014KT 9999 21/18 Q1021')!;
    // La 30 corre a 291° verdaderos: un grado de diferencia.
    expect(deFrente(291, m)).toBeCloseTo(14, 1);
    // Y por la contraria, el mismo viento es de cola.
    expect(deFrente(111, m)).toBeCloseTo(-14, 1);
  });

  it('el viento cruzado no empuja ni frena', () => {
    const m = leerMetar('METAR SGAS 011900Z 09010KT 9999 21/16 Q1016')!;
    expect(deFrente(180, m)).toBeCloseTo(0, 5);
  });

  it('el tiempo de casa sopla del norte, así que al sur es viento de cola', () => {
    expect(deFrente(180, TIEMPO_DE_CASA)).toBeCloseTo(-3, 5);
    expect(deFrente(0, TIEMPO_DE_CASA)).toBeCloseTo(3, 5);
  });

  it('sin dirección no hay viento de frente que valga', () => {
    expect(deFrente(180, { ...TIEMPO_DE_CASA, vientoDe: null })).toBe(0);
  });
});
