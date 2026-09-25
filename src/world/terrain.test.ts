/**
 * Tests del terreno.
 *
 * Lo que se comprueba no es el aspecto —eso se mira con los ojos— sino las
 * dos propiedades de las que depende que el juego funcione: que la pista
 * quede realmente plana y que la consulta de cota sea coherente con la malla.
 * Si la pista tiene un escalón, el avión tropieza al despegar y nadie
 * entiende por qué.
 */

import { describe, expect, it } from "vitest";
import type { Mesh } from "three";
import { Terrain } from "./terrain";
import { CHACO, SCENARIOS, VALLE_CORDILLERA } from "./scenarios";

describe("terreno del Valle de la Cordillera", () => {
  const terrain = new Terrain(VALLE_CORDILLERA);

  it("genera cotas finitas y dentro del rango del escenario", () => {
    for (let i = 0; i < 200; i++) {
      const x = (i / 200 - 0.5) * VALLE_CORDILLERA.size;
      const height = terrain.sampleHeight(x, x * 0.37);
      expect(Number.isFinite(height)).toBe(true);
      expect(height).toBeLessThanOrEqual(VALLE_CORDILLERA.reliefHeight);
    }
  });

  it("deja la pista plana de punta a punta", () => {
    const { runway } = VALLE_CORDILLERA;
    const heading = (runway.heading * Math.PI) / 180;

    for (let t = -0.5; t <= 0.5; t += 0.05) {
      const x = runway.x + Math.sin(heading) * runway.length * t;
      const z = runway.z + Math.cos(heading) * runway.length * t;
      // Un centímetro de tolerancia: la interpolación bilineal no da cero
      // exacto, pero un escalón real se vería enseguida.
      expect(terrain.sampleHeight(x, z)).toBeCloseTo(
        terrain.runwayElevation,
        2,
      );
    }
  });

  it("nunca devuelve superficie por debajo del nivel del agua", () => {
    for (let i = 0; i < 100; i++) {
      const x = (i / 100 - 0.5) * VALLE_CORDILLERA.size;
      expect(terrain.sampleSurface(x, -x * 0.6)).toBeGreaterThanOrEqual(
        VALLE_CORDILLERA.waterLevel,
      );
    }
  });

  it("fuera de los límites del mapa sigue dando una cota utilizable", () => {
    const far = VALLE_CORDILLERA.size * 4;
    expect(Number.isFinite(terrain.sampleHeight(far, far))).toBe(true);
    expect(Number.isFinite(terrain.sampleHeight(-far, far))).toBe(true);
  });

  it("es determinista: la misma semilla da el mismo relieve", () => {
    const other = new Terrain(VALLE_CORDILLERA);
    expect(other.sampleHeight(1234, -567)).toBe(
      terrain.sampleHeight(1234, -567),
    );
  });
});

describe("llanura del Chaco", () => {
  it("es sensiblemente más llana que la cordillera", () => {
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

    expect(spread(chaco, CHACO.size)).toBeLessThan(
      spread(cordillera, VALLE_CORDILLERA.size),
    );
  });
});

describe("emplazamiento de las pistas", () => {
  // Este test existe porque la primera pista del valle cayó dentro del cauce
  // del río: quedaba bajo el agua y no se descubría hasta arrancar el juego.
  // Un escenario nuevo mal colocado tiene que fallar aquí, no en la pantalla.
  //
  // La holgura es de veinte metros salvo que el escenario declare otra cosa,
  // que es lo que hace Encarnación: su pista está a ochenta y cinco y el
  // Paraná embalsado a ochenta y tres, y eso son de verdad dos metros y medio.
  // Ver `orilla` en `scenarios.ts`.
  it.each(SCENARIOS.map((s) => [s.id, s] as const))(
    "%s: la pista está en seco y por encima del agua",
    (_id, scenario) => {
      const terrain = new Terrain(scenario);
      expect(terrain.runwayElevation).toBeGreaterThan(
        scenario.waterLevel + (scenario.orilla ?? 20),
      );
    },
  );

  /*
   * Y **la pista entera**, no solo su punto de referencia.
   *
   * Es la pregunta que la de arriba no llega a hacer: una pista con la
   * cabecera metida en el agua y el otro extremo en tierra sale bien colocada
   * mirando un solo punto. Con la orilla declarada de Encarnación en dos
   * metros, esto es lo que queda de guardarraíl allí, así que tiene que ser
   * el de verdad — cada metro de asfalto por encima de la lámina.
   */
  it.each(SCENARIOS.map((s) => [s.id, s] as const))(
    "%s: y no solo su punto medio: la pista entera está fuera del agua",
    (_id, scenario) => {
      const terrain = new Terrain(scenario);
      const { x, z, heading, length, width } = scenario.runway;
      const rad = (heading * Math.PI) / 180;
      const ux = Math.sin(rad);
      const uz = -Math.cos(rad);
      let peor = Infinity;
      for (let i = -20; i <= 20; i++) {
        const d = (i / 20) * (length / 2);
        for (const lado of [-width / 2, 0, width / 2]) {
          peor = Math.min(
            peor,
            terrain.sampleHeight(
              x + ux * d - uz * lado,
              z + uz * d + ux * lado,
            ),
          );
        }
      }
      expect(peor).toBeGreaterThan(scenario.waterLevel);
    },
  );
});

describe("el suelo fuera del mapa fino", () => {
  /*
   * **Fuera del escenario el suelo era una meseta invisible.**
   *
   * El mapa de alturas cubre dieciocho kilómetros y fuera devolvía el borde
   * repetido: una llanura a la cota del último nudo, sin dibujar, contra la que
   * se choca. Con el mundo de la foto puesto se tapaba con las teselas; sin
   * ellas —y a cuentas del Espacio Económico Europeo no se sirven— quedaba al
   * aire.
   *
   * Medido volando de Tenerife Norte a Tenerife Sur, a treinta kilómetros y
   * sobre mar abierto: **1409 metros de suelo**. El mapa del horizonte, que
   * lleva ahí desde que el Teide no cabía y solo se dibujaba, dice cero.
   */
  const conHorizonte = (cotas: number[], lado: number) => {
    const resolucion = Math.round(Math.sqrt(cotas.length));
    return {
      ...VALLE_CORDILLERA,
      relieveLejano: { datos: Int16Array.from(cotas), resolucion },
      vecesLejos: lado / VALLE_CORDILLERA.size,
    };
  };

  it("sale del mapa del horizonte y no del borde repetido", () => {
    // Un horizonte de 2×2 nudos: todo a cien metros menos la esquina.
    const lado = VALLE_CORDILLERA.size * 6;
    const t = new Terrain(conHorizonte([100, 100, 100, 100], lado));
    const fuera = VALLE_CORDILLERA.size / 2 + 1000;
    expect(t.sampleHeight(fuera, 0)).toBeCloseTo(100, 0);
    // Y dentro del mapa fino manda el mapa fino, no el horizonte.
    expect(t.sampleHeight(0, 0)).not.toBeCloseTo(100, 0);
  });

  it("y quien sabe más contesta antes", () => {
    /*
     * El orden importa y es el que se rompe solo: el vecino —otro aeropuerto
     * puesto a su distancia, con su mapa de un metro— tiene que contestar
     * antes que el horizonte, que va a trescientos metros por muestra.
     */
    const lado = VALLE_CORDILLERA.size * 6;
    const t = new Terrain(conHorizonte([100, 100, 100, 100], lado));
    const fuera = VALLE_CORDILLERA.size / 2 + 1000;
    t.ponerSueloLejano((x) => (x > 0 ? 777 : null));
    expect(t.sampleHeight(fuera, 0)).toBe(777);
    // Y donde el de más detalle dice «no sé», contesta el horizonte.
    expect(t.sampleHeight(-fuera, 0)).toBeCloseTo(100, 0);
  });

  it("y más allá del horizonte se vuelve al borde repetido", () => {
    // El mundo se acaba en alguna parte, y ahí lo que había antes sigue
    // valiendo: es suelo que nadie va a pisar en un vuelo.
    const lado = VALLE_CORDILLERA.size * 6;
    const t = new Terrain(conHorizonte([100, 100, 100, 100], lado));
    expect(t.sampleHeight(lado, 0)).not.toBeCloseTo(100, 0);
  });

  it("y sin mapa del horizonte se comporta como siempre", () => {
    // Los escenarios sin relieve medido no cambian de comportamiento.
    const t = new Terrain(VALLE_CORDILLERA);
    const borde = VALLE_CORDILLERA.size / 2;
    expect(t.sampleHeight(borde + 5000, 0)).toBeCloseTo(
      t.sampleHeight(borde, 0),
      1,
    );
  });
});

describe("el mar abierto del mapa fino", () => {
  /*
   * El fondo del mar a dos metros bajo el agua no se distingue de ella en el
   * fondo de profundidad a ochenta kilómetros: el mar de la isla de enfrente
   * salía rayado y su costa, con un zócalo que parecía flotar. Lo que queda
   * entero bajo el agua no se malla. El cauce del río del valle es ese caso:
   * baja hasta treinta y dos metros bajo el nivel.
   */
  const nivel = VALLE_CORDILLERA.waterLevel;
  const bajoElAgua = (t: Terrain): { triangulos: number; nudos: number } => {
    const malla = t.group.getObjectByName("terreno") as Mesh;
    const pos = malla.geometry.getAttribute("position");
    const indice = malla.geometry.getIndex()!;
    let triangulos = 0;
    for (let i = 0; i < indice.count; i += 3) {
      const tres = [indice.getX(i), indice.getX(i + 1), indice.getX(i + 2)];
      if (tres.every((v) => pos.getY(v) <= nivel)) triangulos++;
    }
    let nudos = 0;
    for (let v = 0; v < pos.count; v++) if (pos.getY(v) <= nivel) nudos++;
    return { triangulos, nudos };
  };

  it("no dibuja un solo cuadro que quede entero bajo el agua", () => {
    const t = new Terrain(VALLE_CORDILLERA);
    const { triangulos, nudos } = bajoElAgua(t);
    // Que la prueba no pase en vacío: tiene que haber fondo que quitar.
    expect(nudos).toBeGreaterThan(0);
    // Un triángulo de un cuadro de costa puede tener sus tres esquinas bajo
    // el agua si la cuarta está en tierra; un cuadro entero, no. Se mira que
    // ninguno de los que quedan tenga las cuatro: cada par de triángulos
    // comparte cuadro.
    const malla = t.group.getObjectByName("terreno") as Mesh;
    const pos = malla.geometry.getAttribute("position");
    const indice = malla.geometry.getIndex()!;
    let enteros = 0;
    for (let i = 0; i < indice.count; i += 6) {
      const cuatro = new Set<number>();
      for (let k = 0; k < 6; k++) cuatro.add(indice.getX(i + k));
      if ([...cuatro].every((v) => pos.getY(v) <= nivel)) enteros++;
    }
    expect(enteros).toBe(0);
    expect(triangulos).toBeLessThan(indice.count / 3);
  });

  it("y con menos detalle, tampoco", () => {
    const t = new Terrain(VALLE_CORDILLERA);
    t.ponerDetalle(4);
    const malla = t.group.getObjectByName("terreno") as Mesh;
    const pos = malla.geometry.getAttribute("position");
    const indice = malla.geometry.getIndex()!;
    let enteros = 0;
    for (let i = 0; i < indice.count; i += 6) {
      const cuatro = new Set<number>();
      for (let k = 0; k < 6; k++) cuatro.add(indice.getX(i + k));
      if ([...cuatro].every((v) => pos.getY(v) <= nivel)) enteros++;
    }
    expect(enteros).toBe(0);
  });

  it("pero la cota del suelo sigue siendo la del mapa, agua incluida", () => {
    const t = new Terrain(VALLE_CORDILLERA);
    const lado = VALLE_CORDILLERA.size;
    let bajo = false;
    for (let i = 0; i < 400 && !bajo; i++)
      for (let j = 0; j < 400 && !bajo; j++)
        if (t.sampleHeight((i / 400 - 0.5) * lado, (j / 400 - 0.5) * lado) < nivel)
          bajo = true;
    expect(bajo).toBe(true);
  });
});
