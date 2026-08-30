/**
 * Tests del terreno.
 *
 * Lo que se comprueba no es el aspecto —eso se mira con los ojos— sino las
 * dos propiedades de las que depende que el juego funcione: que la pista
 * quede realmente plana y que la consulta de cota sea coherente con la malla.
 * Si la pista tiene un escalón, el avión tropieza al despegar y nadie
 * entiende por qué.
 */

import { describe, expect, it } from 'vitest';
import { Terrain } from './terrain';
import { CHACO, SCENARIOS, VALLE_CORDILLERA } from './scenarios';

describe('terreno del Valle de la Cordillera', () => {
  const terrain = new Terrain(VALLE_CORDILLERA);

  it('genera cotas finitas y dentro del rango del escenario', () => {
    for (let i = 0; i < 200; i++) {
      const x = (i / 200 - 0.5) * VALLE_CORDILLERA.size;
      const height = terrain.sampleHeight(x, x * 0.37);
      expect(Number.isFinite(height)).toBe(true);
      expect(height).toBeLessThanOrEqual(VALLE_CORDILLERA.reliefHeight);
    }
  });

  it('deja la pista plana de punta a punta', () => {
    const { runway } = VALLE_CORDILLERA;
    const heading = (runway.heading * Math.PI) / 180;

    for (let t = -0.5; t <= 0.5; t += 0.05) {
      const x = runway.x + Math.sin(heading) * runway.length * t;
      const z = runway.z + Math.cos(heading) * runway.length * t;
      // Un centímetro de tolerancia: la interpolación bilineal no da cero
      // exacto, pero un escalón real se vería enseguida.
      expect(terrain.sampleHeight(x, z)).toBeCloseTo(terrain.runwayElevation, 2);
    }
  });

  it('nunca devuelve superficie por debajo del nivel del agua', () => {
    for (let i = 0; i < 100; i++) {
      const x = (i / 100 - 0.5) * VALLE_CORDILLERA.size;
      expect(terrain.sampleSurface(x, -x * 0.6)).toBeGreaterThanOrEqual(
        VALLE_CORDILLERA.waterLevel,
      );
    }
  });

  it('fuera de los límites del mapa sigue dando una cota utilizable', () => {
    const far = VALLE_CORDILLERA.size * 4;
    expect(Number.isFinite(terrain.sampleHeight(far, far))).toBe(true);
    expect(Number.isFinite(terrain.sampleHeight(-far, far))).toBe(true);
  });

  it('es determinista: la misma semilla da el mismo relieve', () => {
    const other = new Terrain(VALLE_CORDILLERA);
    expect(other.sampleHeight(1234, -567)).toBe(terrain.sampleHeight(1234, -567));
  });
});

describe('llanura del Chaco', () => {
  it('es sensiblemente más llana que la cordillera', () => {
    const chaco = new Terrain(CHACO);
    const cordillera = new Terrain(VALLE_CORDILLERA);

    const spread = (terrain: Terrain, size: number): number => {
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < 400; i++) {
        const x = (i / 400 - 0.5) * size * 0.8;
        const h = terrain.sampleHeight(x, Math.sin(i) * size * 0.3);
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
      return max - min;
    };

    expect(spread(chaco, CHACO.size)).toBeLessThan(spread(cordillera, VALLE_CORDILLERA.size));
  });
});

describe('emplazamiento de las pistas', () => {
  // Este test existe porque la primera pista del valle cayó dentro del cauce
  // del río: quedaba bajo el agua y no se descubría hasta arrancar el juego.
  // Un escenario nuevo mal colocado tiene que fallar acá, no en la pantalla.
  it.each(SCENARIOS.map((s) => [s.id, s] as const))(
    '%s: la pista está en seco y por encima del agua',
    (_id, scenario) => {
      const terrain = new Terrain(scenario);
      expect(terrain.runwayElevation).toBeGreaterThan(scenario.waterLevel + 20);
    },
  );
});
