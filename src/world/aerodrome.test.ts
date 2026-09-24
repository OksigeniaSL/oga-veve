/**
 * El aeródromo real, medido.
 *
 * Silvio Pettirossi tiene 54 calles de rodaje y 21 plataformas. Dibujadas una
 * a una son setenta y cinco llamadas de dibujo y una tablet de gama media no
 * lo aguanta. Esta prueba es la que impide que eso vuelva a pasar sin que
 * nadie se entere.
 */

import { describe, expect, it, vi } from "vitest";
import sgas from "../../data/aerodromes/sgas.aero.json";
import gcxo from "../../data/aerodromes/gcxo.aero.json";
import {
  createAerodrome,
  extension,
  type Aerodrome,
  aLaPolilinea,
  puntoMasCercanoDe,
  type Punto,
  alturaDeEdificio,
  esTorreDeControl,
  esDeposito,
  esRadar,
  esAntena,
  paraUnAvion,
} from "./aerodrome";
import gcts from "../../data/aerodromes/gcts.aero.json";

const AERODROMOS = [sgas as unknown as Aerodrome, gcxo as unknown as Aerodrome];

function medir(aero: Aerodrome) {
  const grupo = createAerodrome(aero);
  let triangulos = 0;
  let llamadas = 0;
  grupo.traverse((o) => {
    const geo = (
      o as {
        geometry?: {
          index?: { count: number } | null;
          attributes?: { position?: { count: number } };
        };
      }
    ).geometry;
    if (!geo) return;
    llamadas++;
    triangulos +=
      (geo.index ? geo.index.count : (geo.attributes?.position?.count ?? 0)) /
      3;
  });
  return { triangulos: Math.round(triangulos), llamadas };
}

describe("el aeródromo cabe en el presupuesto", () => {
  for (const aero of AERODROMOS) {
    it(`${aero.id} se dibuja en pocas llamadas`, () => {
      const { triangulos, llamadas } = medir(aero);
      expect(llamadas).toBeLessThanOrEqual(12);
      expect(triangulos).toBeLessThanOrEqual(50000);
      // Y que no esté vacío, que un presupuesto se cumple muy bien sin dibujar.
      expect(triangulos).toBeGreaterThan(100);
    });
  }
});

describe("la pista tiene su pendiente", () => {
  it("la de Asunción cae trece metros de un umbral al otro", () => {
    const pista = (sgas as unknown as Aerodrome).runways[0]!;
    const umbrales = Object.values(pista.thresholds).filter(
      (u) => u?.elevM != null,
    );
    expect(umbrales).toHaveLength(2);
    const caida = Math.abs(umbrales[0]!.elevM! - umbrales[1]!.elevM!);
    expect(caida).toBeGreaterThan(12);
    expect(caida).toBeLessThan(15);
  });

  it("y el pavimento la respeta en vez de tumbarse a una cota", () => {
    const grupo = createAerodrome(sgas as unknown as Aerodrome);
    const malla = grupo.children[0] as unknown as {
      geometry: {
        attributes: { position: { array: ArrayLike<number>; count: number } };
      };
    };
    const pos = malla.geometry.attributes.position;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.array[i * 3 + 1]!;
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
    // El pavimento de la pista tiene que abarcar la caída real.
    expect(max - min).toBeGreaterThan(10);
  });
});

describe("el tamaño del aeródromo", () => {
  it("Silvio Pettirossi ocupa un par de kilómetros", () => {
    const { radio } = extension(sgas as unknown as Aerodrome);
    expect(radio).toBeGreaterThan(1500);
    expect(radio).toBeLessThan(4000);
  });
});

describe("el punto más cercano de la raya", () => {
  /*
   * Decir «volvé a la raya verde» sin decir hacia dónde es medio consejo: si
   * te has ido lejos, la raya está dibujada pero te queda fuera de la
   * pantalla. «Será que se la metió por la nariz, porque yo no la veo.»
   * Ver `puntoMasCercanoDe` y `updateHomeIndicator`.
   */
  const raya: Punto[] = [
    [0, 0],
    [100, 0],
    [100, 100],
  ];

  it("perpendicular a un tramo, cae en el tramo", () => {
    expect(puntoMasCercanoDe([50, 40], raya)).toEqual([50, 0]);
  });

  it("y pasado el final, cae en el final", () => {
    expect(puntoMasCercanoDe([200, 200], raya)).toEqual([100, 100]);
  });

  it("elige el tramo bueno cuando hay varios cerca", () => {
    // Junto al codo: lo que hay que devolver es el punto del tramo vertical,
    // no el del horizontal, porque es el que tiene más cerca.
    const q = puntoMasCercanoDe([140, 60], raya)!;
    expect(q[0]).toBeCloseTo(100, 5);
    expect(q[1]).toBeCloseTo(60, 5);
  });

  it("y dice lo mismo que la distancia, que es la otra mitad de la cuenta", () => {
    // Las dos funciones tienen que estar de acuerdo o la aguja apuntaría a un
    // sitio distinto del que mide el aviso.
    for (const p of [
      [50, 40],
      [200, 200],
      [140, 60],
      [-30, -30],
    ] as Punto[]) {
      const q = puntoMasCercanoDe(p, raya)!;
      expect(Math.hypot(p[0] - q[0], p[1] - q[1])).toBeCloseTo(
        aLaPolilinea(p, raya),
        5,
      );
    }
  });

  it("sin raya no hay punto", () => {
    expect(puntoMasCercanoDe([0, 0], [])).toBe(null);
    expect(puntoMasCercanoDe([0, 0], [[5, 5]])).toBe(null);
  });
});

/**
 * **La torre de control y el parque de combustible.**
 *
 * Preguntado jugando, después de muchas horas de vuelo: «todavía no sé dónde
 * están los radares, dónde está el depósito de combustible». Y la respuesta
 * era que en ninguna parte: los dos existen en OpenStreetMap y ninguno de los
 * dos se pedía, y los pocos que llegaban por la puerta de `building` se
 * levantaban como cajas grises de cinco metros — indistinguibles de una
 * caseta de mangueras.
 *
 * Son los dos volúmenes que más delatan a un aeropuerto desde el aire después
 * de la pista, y en este juego además cierran lecciones que ya se enseñan: la
 * voz que te da el verde sale de esa torre, y el combustible que marca la
 * aguja sale de esos cilindros.
 */
describe("la torre de control y los depósitos", () => {
  /** Una planta cuadrada de `lado` metros, centrada en el origen. */
  const cuadrada = (lado: number): Punto[] => [
    [-lado / 2, -lado / 2],
    [lado / 2, -lado / 2],
    [lado / 2, lado / 2],
    [-lado / 2, lado / 2],
  ];

  it("una torre es alta aunque su planta sea pequeña", () => {
    /*
     * Es lo que la define: desde ella se ve la pista entera y los dos
     * circuitos. Con la regla general —que mira el área— una torre de doce
     * metros de lado caía en el último renglón y se levantaba cinco: una
     * caseta. Los Rodeos tiene treinta y tres metros; Lanzarote, treinta y uno.
     */
    const torre = { heightM: null, polygon: cuadrada(12), kind: "tower" };
    const caseta = { heightM: null, polygon: cuadrada(12), kind: "yes" };
    expect(alturaDeEdificio(torre)).toBeGreaterThan(25);
    expect(alturaDeEdificio(caseta)).toBeLessThan(10);
  });

  it("y si OSM dice cuánto mide, manda OSM", () => {
    // Lo medido gana siempre a lo supuesto: es la regla de la casa.
    const torre = { heightM: 33, polygon: cuadrada(12), kind: "tower" };
    expect(alturaDeEdificio(torre)).toBe(33);
  });

  it("un depósito es tan alto como ancho, que es lo que es un cilindro", () => {
    /*
     * Un depósito de combustible de aeropuerto ronda los doce o catorce
     * metros de diámetro y otros tantos de alto. Con la regla general su
     * planta pequeña lo dejaba en cinco metros: una tapa de alcantarilla.
     */
    const dep = { heightM: null, polygon: cuadrada(13), kind: "storage_tank" };
    expect(alturaDeEdificio(dep)).toBeGreaterThan(10);
    expect(alturaDeEdificio(dep)).toBeLessThan(18);
  });

  it("y ninguno de los dos se confunde con el otro ni con un tejado", () => {
    expect(esTorreDeControl({ kind: "tower" })).toBe(true);
    expect(esTorreDeControl({ kind: "storage_tank" })).toBe(false);
    expect(esDeposito({ kind: "storage_tank" })).toBe(true);
    expect(esDeposito({ kind: "tower" })).toBe(false);
    // Y el tejado sobre pilares sigue sin parar a un avión. Ver `paraUnAvion`.
    expect(paraUnAvion({ kind: "roof" })).toBe(false);
    expect(paraUnAvion({ kind: "tower" })).toBe(true);
  });
});

describe("el radar y las antenas", () => {
  const cuadrada = (lado: number): Punto[] => [
    [-lado / 2, -lado / 2],
    [lado / 2, -lado / 2],
    [lado / 2, lado / 2],
    [-lado / 2, lado / 2],
  ];

  it("una antena de telefonía no es la torre de control", () => {
    /*
     * `man_made=tower` es cualquier torre. Con cabina y cristalera, una
     * antena enseña una cosa que no existe.
     */
    expect(esTorreDeControl({ kind: "tower:communication" })).toBe(false);
    expect(esAntena({ kind: "tower:communication" })).toBe(true);
    expect(esAntena({ kind: "mast" })).toBe(true);
    expect(esAntena({ kind: "tower" })).toBe(false);
    expect(esTorreDeControl({ kind: "control_tower" })).toBe(true);
  });

  it("un radar va subido a su torre", () => {
    const radar = { heightM: null, polygon: cuadrada(10), kind: "radar" };
    expect(esRadar(radar)).toBe(true);
    expect(esTorreDeControl(radar)).toBe(false);
    expect(alturaDeEdificio(radar)).toBeGreaterThan(12);
  });

  it("y en Tenerife Sur, que tiene el suyo mapeado, lleva la antena encima", () => {
    const grupo = createAerodrome(gcts as unknown as Aerodrome);
    const radares: string[] = [];
    grupo.traverse((o) => {
      if (o.name === "radar") radares.push(o.name);
    });
    expect(radares.length).toBe(1);
  });

  it("y la antena da una vuelta cada cinco segundos", () => {
    const grupo = createAerodrome(gcts as unknown as Aerodrome);
    let antena: { onBeforeRender: () => void; parent: { rotation: { y: number } } } | null = null;
    grupo.traverse((o) => {
      if (o.parent?.parent?.name === "radar" && "geometry" in o)
        antena = o as unknown as typeof antena;
    });
    expect(antena).not.toBeNull();
    const reloj = vi.spyOn(performance, "now");
    const angulo = (ms: number) => {
      reloj.mockReturnValue(ms);
      antena!.onBeforeRender();
      return antena!.parent.rotation.y;
    };
    // Un cuarto de vuelta en un cuarto del periodo.
    expect(angulo(1250) - angulo(0)).toBeCloseTo(Math.PI / 2);
    reloj.mockRestore();
  });
});
