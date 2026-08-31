/**
 * Tests de la guía de aterrizaje.
 *
 * Existen por un fallo reportado jugando: "algunos [aros] están incrustados
 * en la montaña y me puedo estrellar". El juego dibujaba una senda que
 * llevaba a chocar, que es peor que no dibujar nada.
 */

import { describe, expect, it } from 'vitest';
import { Mesh, Vector3 } from 'three';
import { RunwayGuide } from './runway-guide';
import { Terrain } from './terrain';
import { CHACO, SCENARIOS, VALLE_CORDILLERA } from './scenarios';

/** Posiciones de los aros de aproximación de un escenario. */
function ringPositions(scenario = VALLE_CORDILLERA): { terrain: Terrain; rings: Vector3[] } {
  const terrain = new Terrain(scenario);
  const guide = new RunwayGuide(scenario, terrain.runwayElevation, (x, z) =>
    terrain.sampleSurface(x, z),
  );
  const group = guide.group.getObjectByName('aros');
  expect(group).toBeDefined();

  const rings: Vector3[] = [];
  group!.traverse((object) => {
    if (object instanceof Mesh) rings.push(object.position.clone());
  });
  return { terrain, rings };
}

describe('aros de aproximación', () => {
  it('dibuja una senda de varios aros', () => {
    expect(ringPositions().rings.length).toBeGreaterThanOrEqual(6);
  });

  it.each(SCENARIOS.map((s) => [s.id, s] as const))(
    '%s: ningún aro queda dentro del terreno',
    (_id, scenario) => {
      const { terrain, rings } = ringPositions(scenario);
      for (const ring of rings) {
        const ground = terrain.sampleSurface(ring.x, ring.z);
        // Margen holgado: un aro rozando la loma sigue guiando contra ella.
        expect(ring.y - ground).toBeGreaterThan(30);
      }
    },
  );

  it('la senda desciende hacia la pista', () => {
    const { rings } = ringPositions();
    const sorted = [...rings].sort(
      (a, b) => a.distanceTo(new Vector3(0, 0, 0)) - b.distanceTo(new Vector3(0, 0, 0)),
    );
    // El aro más lejano de la cabecera está más alto que el más cercano.
    expect(sorted[sorted.length - 1]!.y).toBeGreaterThan(sorted[0]!.y);
  });

  it('en la llanura del Chaco la senda es casi recta', () => {
    // Sin relieve que salvar, la corrección por terreno apenas debe actuar:
    // si aquí los aros subieran mucho, el margen estaría mal calculado.
    const { terrain, rings } = ringPositions(CHACO);
    const clearances = rings.map((r) => r.y - terrain.sampleSurface(r.x, r.z));
    expect(Math.min(...clearances)).toBeGreaterThan(30);
  });
});

describe('la senda reacciona', () => {
  it('cruzar el aro que toca cuenta, y saltarse el orden no', () => {
    const terrain = new Terrain(VALLE_CORDILLERA);
    const guide = new RunwayGuide(VALLE_CORDILLERA, terrain.runwayElevation, (x, z) =>
      terrain.sampleSurface(x, z),
    );
    const rings = ringPositions().rings;
    const ordered = [...rings].sort((a, b) => b.y - a.y);

    // Colarse por el tercero sin haber pasado los dos primeros no vale: la
    // senda es una senda, no una colección de aros sueltos.
    expect(guide.check(ordered[2]!)).toBe(false);

    expect(guide.check(ordered[0]!)).toBe(true);
    expect(guide.check(ordered[1]!)).toBe(true);
  });

  it('pasar lejos de un aro no cuenta', () => {
    const terrain = new Terrain(VALLE_CORDILLERA);
    const guide = new RunwayGuide(VALLE_CORDILLERA, terrain.runwayElevation, (x, z) =>
      terrain.sampleSurface(x, z),
    );
    const first = [...ringPositions().rings].sort((a, b) => b.y - a.y)[0]!;
    expect(guide.check(first.clone().add(new Vector3(400, 0, 0)))).toBe(false);
    expect(guide.check(first)).toBe(true);
  });

  it('reiniciar el vuelo devuelve la senda al principio', () => {
    const terrain = new Terrain(VALLE_CORDILLERA);
    const guide = new RunwayGuide(VALLE_CORDILLERA, terrain.runwayElevation, (x, z) =>
      terrain.sampleSurface(x, z),
    );
    const ordered = [...ringPositions().rings].sort((a, b) => b.y - a.y);
    expect(guide.check(ordered[0]!)).toBe(true);
    guide.reset();
    expect(guide.check(ordered[0]!)).toBe(true);
  });
});
