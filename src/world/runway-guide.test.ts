/**
 * Tests de la guía de aterrizaje.
 *
 * Existen por un fallo reportado jugando: "algunos [aros] están incrustados
 * en la montaña y me puedo estrellar". El juego dibujaba una senda que
 * llevaba a chocar, que es peor que no dibujar nada.
 */

import { describe, expect, it } from "vitest";
import { Mesh, Vector3 } from "three";
import { RunwayGuide } from "./runway-guide";
import { Terrain } from "./terrain";
import { CHACO, SCENARIOS, VALLE_CORDILLERA } from "./scenarios";

/** Posiciones de los aros de aproximación de un escenario. */
function ringPositions(scenario = VALLE_CORDILLERA): {
  terrain: Terrain;
  rings: Vector3[];
} {
  const terrain = new Terrain(scenario);
  const guide = new RunwayGuide(scenario, terrain.runwayElevation, (x, z) =>
    terrain.sampleSurface(x, z),
  );
  const group = guide.group.getObjectByName("aros");
  expect(group).toBeDefined();

  const rings: Vector3[] = [];
  group!.traverse((object) => {
    if (object instanceof Mesh) rings.push(object.position.clone());
  });
  return { terrain, rings };
}

describe("aros de aproximación", () => {
  it("dibuja una senda de varios aros", () => {
    expect(ringPositions().rings.length).toBeGreaterThanOrEqual(6);
  });

  it.each(SCENARIOS.map((s) => [s.id, s] as const))(
    "%s: ningún aro queda dentro del terreno",
    (_id, scenario) => {
      const { terrain, rings } = ringPositions(scenario);
      for (const ring of rings) {
        const ground = terrain.sampleSurface(ring.x, ring.z);
        // Margen holgado: un aro rozando la loma sigue guiando contra ella.
        expect(ring.y - ground).toBeGreaterThan(30);
      }
    },
  );

  it("la senda desciende hacia la pista", () => {
    const { rings } = ringPositions();
    const sorted = [...rings].sort(
      (a, b) =>
        a.distanceTo(new Vector3(0, 0, 0)) - b.distanceTo(new Vector3(0, 0, 0)),
    );
    // El aro más lejano de la cabecera está más alto que el más cercano.
    expect(sorted[sorted.length - 1]!.y).toBeGreaterThan(sorted[0]!.y);
  });

  it("en la llanura del Chaco la senda es casi recta", () => {
    // Sin relieve que salvar, la corrección por terreno apenas debe actuar:
    // si aquí los aros subieran mucho, el margen estaría mal calculado.
    const { terrain, rings } = ringPositions(CHACO);
    const clearances = rings.map((r) => r.y - terrain.sampleSurface(r.x, r.z));
    expect(Math.min(...clearances)).toBeGreaterThan(30);
  });
});

describe("la senda reacciona", () => {
  const senda = () => {
    const terrain = new Terrain(VALLE_CORDILLERA);
    return new RunwayGuide(VALLE_CORDILLERA, terrain.runwayElevation, (x, z) =>
      terrain.sampleSurface(x, z),
    );
  };
  /**
   * Los aros en el orden en que se cruzan: del más lejano al umbral al más
   * cercano. **Por distancia y no por altura**, que es lo que descolocaba el
   * orden en cuanto la senda subía para salvar una loma.
   */
  const enOrden = () => {
    const { rings } = ringPositions();
    const umbral = new Vector3(0, 0, 0);
    return [...rings].sort(
      (a, b) => b.distanceTo(umbral) - a.distanceTo(umbral),
    );
  };

  it("cruzar el aro que toca cuenta", () => {
    const guide = senda();
    const aros = enOrden();
    expect(guide.check(aros[0]!)).toBe("cruzado");
    expect(guide.check(aros[1]!)).toBe("cruzado");
  });

  it("pasar lejos de un aro lo da por perdido, y la senda sigue", () => {
    const guide = senda();
    const aros = enOrden();
    /*
     * Cuatrocientos metros **al lado**, y «al lado» hay que calcularlo: en el
     * Valle la aproximación corre a lo largo de la X, así que sumar 400 en X
     * es adelantarse por la senda, no salirse de ella. El primer intento de
     * esta prueba hacía exactamente eso y daba el aro por cruzado.
     */
    const eje = new Vector3().subVectors(aros[1]!, aros[0]!).normalize();
    const alLado = new Vector3(0, 1, 0)
      .cross(eje)
      .normalize()
      .multiplyScalar(400);
    expect(guide.check(aros[0]!.clone().add(alLado))).toBe("perdido");
    // Y lo importante: la senda **avanza**. Antes se quedaba clavada en el
    // aro fallado para siempre y dejaba de funcionar entera.
    expect(guide.check(aros[1]!)).toBe("cruzado");
  });

  it("colarse por el tercero no cuenta como cruzarlo", () => {
    const guide = senda();
    const aros = enOrden();
    // Aparecer en el tercero sin pasar los dos primeros: el que tocaba era el
    // primero y ese se ha perdido, no cruzado.
    expect(guide.check(aros[2]!)).toBe("perdido");
  });

  it("todavía por delante del aro, no hay veredicto", () => {
    const guide = senda();
    const aros = enOrden();
    // Un kilómetro por detrás del primero, hacia fuera de la aproximación.
    const atras = aros[0]!
      .clone()
      .sub(
        new Vector3()
          .subVectors(aros[1]!, aros[0]!)
          .normalize()
          .multiplyScalar(1000),
      );
    expect(guide.check(atras)).toBeNull();
  });

  it("reiniciar el vuelo devuelve la senda al principio", () => {
    const guide = senda();
    const aros = enOrden();
    expect(guide.check(aros[0]!)).toBe("cruzado");
    guide.reset();
    expect(guide.check(aros[0]!)).toBe("cruzado");
  });

  it("reiniciar desde el aire se salta los aros que quedan detrás", () => {
    const guide = senda();
    const aros = enOrden();
    // Empezando en final, o sea a la altura del penúltimo aro: los primeros
    // ya quedan a la espalda y no hay que esperarlos.
    guide.reset(aros[aros.length - 2]!);
    expect(guide.check(aros[aros.length - 2]!)).toBe("cruzado");
  });
});

/**
 * Volar la senda y comprobar que la senda dice que la has volado.
 *
 * Es la prueba que faltaba, y la que habría cazado los dos fallos gordos de
 * esta guía: que los aros no dibujaban la recta que decían dibujar, y que el
 * veredicto se resolvía con lo más cerca que estuviste alguna vez en el tramo
 * y no con el punto por donde cruzaste. Con las dos cosas juntas se podía
 * pasar **ciento dieciocho metros por encima** de un aro y oír la campanita.
 */
function volar(
  scenario = CHACO,
  desvioVertical = 0,
): { veredictos: (string | null)[]; aros: number } {
  const terrain = new Terrain(scenario);
  const guide = new RunwayGuide(scenario, terrain.runwayElevation, (x, z) =>
    terrain.sampleSurface(x, z),
  );
  const centros: Vector3[] = [];
  guide.group.getObjectByName("aros")!.traverse((o) => {
    if (o instanceof Mesh) centros.push(o.position.clone());
  });
  // Del más lejano al más cercano al umbral, que es como se vuela. En llano
  // el más alto es el más lejano, y estas pruebas vuelan en llano.
  const orden = centros.slice().sort((a, b) => b.y - a.y);

  guide.reset(orden[0]!.clone().add(new Vector3(0, 0, 0)));
  const veredictos: (string | null)[] = [];
  // Un paso de diez metros: a velocidad de aproximación son cinco fotogramas.
  for (let i = 1; i < orden.length; i++) {
    const de = orden[i - 1]!;
    const a = orden[i]!;
    const largo = de.distanceTo(a);
    const pasos = Math.max(2, Math.ceil(largo / 10));
    for (let k = 1; k <= pasos; k++) {
      const p = de.clone().lerp(a, k / pasos);
      p.y += desvioVertical;
      guide.update(0.05, p);
      const v = guide.check(p);
      if (v) veredictos.push(v);
    }
  }
  return { veredictos, aros: orden.length };
}

describe("volar la senda que la senda dibuja", () => {
  it("pasando por los centros, todos los aros cuentan como cruzados", () => {
    const { veredictos, aros } = volar();
    // Uno por aro: se arranca sobre el más lejano y se cruzan todos.
    expect(veredictos.length).toBe(aros);
    expect(veredictos.every((v) => v === "cruzado")).toBe(true);
  });

  it("pasando muy por encima, ninguno cuenta", () => {
    // Cien metros por encima de la senda: más de un radio en todos los aros.
    const { veredictos } = volar(CHACO, 100);
    expect(veredictos.length).toBeGreaterThan(0);
    expect(veredictos.every((v) => v === "perdido")).toBe(true);
  });

  it("y en llano la senda es una recta, no un palo de hockey", () => {
    const { terrain, rings } = ringPositions(CHACO);
    const pendientes = rings.map((r) => {
      const d = Math.hypot(r.x, r.z);
      return Math.atan2(r.y - terrain.runwayElevation, d) * (180 / Math.PI);
    });
    // Todas dentro de medio grado de la senda de tres.
    for (const p of pendientes) {
      expect(Math.abs(p - 3)).toBeLessThan(0.9);
    }
  });
});
