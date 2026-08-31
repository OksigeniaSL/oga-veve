/**
 * Los diccionarios, comprobados.
 *
 * Un idioma que no está no rompe nada: cae al castellano y se juega igual. Lo
 * que sí rompe son dos cosas que no se ven mirando la pantalla, porque hay que
 * estar en ese idioma **y** en ese momento del vuelo para verlas:
 *
 * - Perder un hueco `{name}` al traducir. El texto sale con un agujero o con
 *   la llave a la vista, y quien lo vea será alguien que juega en guaraní.
 * - Dejar una clave que ya no existe. No hace daño, pero es trabajo tirado y
 *   despista al siguiente que traduzca.
 */

import { describe, expect, it } from 'vitest';
import { EN } from './en';
import { ES_PY } from './es-PY';
import { GUG } from './gug';

const DICCIONARIOS = [
  ['guaraní', GUG],
  ['inglés', EN],
] as const;

const huecos = (texto: string): string[] =>
  [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe.each(DICCIONARIOS)('el diccionario en %s', (_nombre, dicc) => {
  it('no inventa claves que no existen en castellano', () => {
    const inventadas = Object.keys(dicc).filter((k) => !(k in ES_PY));
    expect(inventadas).toEqual([]);
  });

  it('conserva todos los huecos de cada texto', () => {
    const rotos: string[] = [];
    for (const [clave, texto] of Object.entries(dicc)) {
      const origen = huecos(ES_PY[clave as keyof typeof ES_PY] ?? '');
      const traducido = huecos(texto ?? '');
      if (origen.join() !== traducido.join()) {
        rotos.push(`${clave}: {${origen.join('} {')}} → {${traducido.join('} {')}}`);
      }
    }
    expect(rotos).toEqual([]);
  });

  it('no deja ningún texto vacío', () => {
    // Una clave presente pero vacía es peor que ausente: la ausente cae al
    // castellano y la vacía deja el hueco en blanco.
    const vacias = Object.entries(dicc)
      .filter(([, v]) => !v || !v.trim())
      .map(([k]) => k);
    expect(vacias).toEqual([]);
  });
});

describe('los rótulos aeronáuticos', () => {
  it('no se traducen: las unidades son iguales en los tres idiomas', () => {
    // IAS, ALT y compañía no pasan por el diccionario. Las unidades sí, y
    // tienen que quedarse tal cual: un anemómetro marca «kt» en Asunción y en
    // Tenerife, y traducirlo sería enseñar algo falso.
    for (const clave of ['units.knots', 'units.feet', 'units.fpm', 'units.kmh'] as const) {
      for (const [, dicc] of DICCIONARIOS) {
        if (clave in dicc) expect(dicc[clave]).toBe(ES_PY[clave]);
      }
    }
  });
});
