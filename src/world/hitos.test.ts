/**
 * Qué se ve por la ventanilla, por qué lado, y si de verdad se ve.
 *
 * El lado es la mitad de lo que se enseña aquí: a alguien de cuatro años se le
 * dice «a la izquierda» y mira a la izquierda. Decirlo al revés no es un fallo
 * de presentación —es enseñarle mal dónde está el Teide—, y es además el único
 * error de este módulo que quien juega nota siempre.
 *
 * La otra mitad es que se vea: señalar un pueblo con una cordillera en medio
 * es mandar a mirar una ladera. Eso se prueba aquí con un relieve de mentira
 * —una pared, el mar curvo— y en `lo-que-se-ve-en-ruta.test.ts` con el de
 * verdad.
 */

import { describe, expect, it } from "vitest";
import {
  ALCANCE,
  DESDE_EL_MORRO,
  RADIO_PARA_MIRAR,
  VALE_UN_PESO,
  laCapaTapa,
  queSeVe,
  seVe,
  type Hito,
} from "./hitos";

/** Un hito en `(x, z)`, con la Z hacia el sur como en todo el juego. */
const en = (nombre: string, x: number, z: number, extra: Partial<Hito> = {}): Hito => ({
  nombre,
  clase: "montana",
  x,
  z,
  ele: 1000,
  ...extra,
});

/** Volando hacia el norte desde el origen. */
const alNorte = { x: 0, z: 0, rumbo: 0 };

describe("qué se ve desde donde se va", () => {
  it("lo que queda al oeste, yendo al norte, está a la izquierda", () => {
    const v = queSeVe([en("cumbre", -8000, -2000)], alNorte);
    expect(v?.lado).toBe("izquierda");
  });

  it("y lo que queda al este, a la derecha", () => {
    const v = queSeVe([en("cumbre", 8000, -2000)], alNorte);
    expect(v?.lado).toBe("derecha");
  });

  it("y con el avión mirando al sur, los lados se cambian", () => {
    // El mismo sitio del mundo, el avión al revés: lo que estaba a babor pasa
    // a estribor. Si esto no cambiara, el lado no se estaría calculando.
    const sitio = [en("cumbre", -8000, 0)];
    expect(queSeVe(sitio, { x: 0, z: 0, rumbo: 0 })?.lado).toBe("izquierda");
    expect(queSeVe(sitio, { x: 0, z: 0, rumbo: 180 })?.lado).toBe("derecha");
  });

  it("no se señala lo que ya se pasó", () => {
    // Justo detrás, yendo al norte: eso está a la espalda.
    expect(queSeVe([en("cumbre", 0, 9000)], alNorte)).toBeNull();
  });

  it("ni lo que va justo delante del morro, que por la ventanilla no se ve", () => {
    // Cinco grados a la derecha del morro: la fila de la derecha vería el ala.
    const delante = en("cumbre", 800, -9000);
    expect(queSeVe([delante], alNorte)).toBeNull();
    // Y en cuanto queda a un lado, sí.
    const angulo = ((DESDE_EL_MORRO + 5) * Math.PI) / 180;
    const aUnLado = en("cumbre", 15000 * Math.sin(angulo), -15000 * Math.cos(angulo));
    expect(queSeVe([aUnLado], alNorte)?.lado).toBe("derecha");
  });

  it("ni lo que está demasiado lejos para verse", () => {
    const lejos = (d: number) => en("cumbre", -d * Math.SQRT1_2, -d * Math.SQRT1_2);
    expect(queSeVe([lejos(ALCANCE + 1000)], alNorte)).toBeNull();
    expect(queSeVe([lejos(ALCANCE - 1000)], alNorte)).not.toBeNull();
  });

  it("pero lo grande se ve más lejos, con su propio alcance", () => {
    const teide = en("Teide", -60_000, -40_000, { alcance: 100_000 });
    expect(queSeVe([teide], alNorte)?.hito.nombre).toBe("Teide");
  });

  it("y de dos que se ven, el que más merece, con la distancia en contra", () => {
    // Lo mismo de peso: el más cerca.
    const v = queSeVe([en("lejana", -20000, -15000), en("cerca", 2000, -4000)], alNorte);
    expect(v?.hito.nombre).toBe("cerca");
    // Un punto más de peso adelanta a lo que está hasta treinta kilómetros más
    // cerca, y no a lo que está más cerca que eso.
    const grande = en("grande", -20000, -15000, { peso: 3, alcance: 60_000 });
    const pueblo = en("pueblo", 4000, -3000, { peso: 2 });
    expect(queSeVe([grande, pueblo], alNorte)?.hito.nombre).toBe("grande");
    const lejisimo = en("grande", -40000, -40000, { peso: 3, alcance: 90_000 });
    expect(Math.hypot(40000, 40000) - 5000).toBeGreaterThan(VALE_UN_PESO);
    expect(queSeVe([lejisimo, pueblo], alNorte)?.hito.nombre).toBe("pueblo");
  });

  it("y lo ya dicho no se repite", () => {
    const sitio = [en("cumbre", 2000, -4000)];
    expect(queSeVe(sitio, alNorte, new Set(["cumbre"]))).toBeNull();
  });

  it("un río se ve por el punto que se tiene más cerca, y por su lado", () => {
    // Un río que corre de norte a sur por la izquierda, con un punto detrás y
    // otro delante del ala: se mira por el de delante, que es el que se ve.
    const rio = en("río", -6000, 20_000, {
      clase: "agua",
      ele: null,
      otros: [{ x: -6000, z: -3000, ele: null }],
    });
    const v = queSeVe([rio], alNorte);
    expect(v?.lado).toBe("izquierda");
    expect(v?.distancia).toBeCloseTo(Math.hypot(6000, 3000), 0);
    // Y **por ahí** se mira: la cámara que se gira hacia lo señalado apunta
    // a este punto, no al primero del fichero, que va detrás del ala.
    expect(v?.punto).toMatchObject({ x: -6000, z: -3000 });
  });

  it("y lo señalado dice a qué altura apuntar: a la cumbre, o un poco sobre el suelo", () => {
    const cumbre = queSeVe([en("Teide", -12000, -6000, { ele: 3715 })], { ...alNorte, y: 3000 }, new Set(), () => 0);
    expect(cumbre?.punto?.y).toBe(3715);
    // Un lago no tiene cota: se apunta a su orilla, por encima del suelo que
    // dice el relieve.
    const lago = queSeVe(
      [en("Ypacaraí", -12000, -6000, { clase: "agua", ele: null })],
      { ...alNorte, y: 3000 },
      new Set(),
      () => 63,
    );
    expect(lago?.punto?.y).toBeGreaterThan(63);
    expect(lago?.punto?.y).toBeLessThan(200);
  });

  it("sin hitos no pasa nada", () => {
    expect(queSeVe([], alNorte)).toBeNull();
  });
});

describe("si de verdad se ve", () => {
  /** Mar en todas partes. */
  const mar = () => 0;
  /** Una pared de dos mil metros a lo largo de x = −5000. */
  const pared = (x: number) => (x < -4000 && x > -6000 ? 2000 : 0);

  it("lo que está detrás de una sierra más alta que la vista, no se ve", () => {
    const desde = { x: 0, y: 1500, z: 0 };
    expect(seVe(desde, { x: -12000, y: 50, z: 0 }, pared)).toBe(false);
    // Y por encima de la sierra, sí: una cumbre más alta que la pared.
    expect(seVe(desde, { x: -12000, y: 3700, z: 0 }, pared)).toBe(true);
    // Y subiendo lo bastante, también el pueblo de detrás.
    expect(seVe({ ...desde, y: 6000 }, { x: -12000, y: 50, z: 0 }, pared)).toBe(true);
  });

  it("y queSeVe se salta lo tapado y cuenta lo siguiente que sí se ve", () => {
    const tapado = en("Candelaria", -12000, -1000, { clase: "ciudad", ele: null, peso: 3 });
    const teide = en("Teide", -12000, -6000, { ele: 3715, peso: 2 });
    const desde = { ...alNorte, y: 1500 };
    expect(queSeVe([tapado, teide], desde, new Set(), (x) => pared(x))?.hito.nombre).toBe(
      "Teide",
    );
    // Sin relieve no se sabe, y se contaría el tapado: es lo que pasaba.
    expect(queSeVe([tapado, teide], desde)?.hito.nombre).toBe("Candelaria");
  });

  it("y la Tierra es curva: un barco a ras de agua se esconde tras el horizonte", () => {
    // A trescientos metros de altura el horizonte está a unos setenta kilómetros.
    const horizonte = Math.sqrt(2 * RADIO_PARA_MIRAR * 300);
    expect(horizonte).toBeGreaterThan(60_000);
    expect(horizonte).toBeLessThan(80_000);
    const desde = { x: 0, y: 300, z: 0 };
    expect(seVe(desde, { x: horizonte * 0.8, y: 10, z: 0 }, mar)).toBe(true);
    expect(seVe(desde, { x: horizonte * 1.3, y: 10, z: 0 }, mar)).toBe(false);
  });

  it("donde nadie sabe la cota, se toma como mar", () => {
    expect(seVe({ x: 0, y: 500, z: 0 }, { x: 20000, y: 50, z: 0 }, () => null)).toBe(true);
  });
});

describe("y sin nubes en medio", () => {
  /*
   * «No tiene sentido que Jazlyn diga que miren por la ventanilla para ver las
   * dunas de Maspalomas si hay nubes debajo: no se vería nada.» La capa del
   * parte, de mil a mil ochocientos metros.
   */
  const rota = { base: 1000, techo: 1800, tapadura: 0.75 };
  const cubierta = { ...rota, tapadura: 1 };
  const sueltas = { ...rota, tapadura: 0.45 };
  const mar = () => 0;
  const dunas = en("Dunas de Maspalomas", 9000, -3000, { clase: "agua", ele: null, peso: 3 });
  const teide = en("Teide", -12000, -6000, { ele: 3715, peso: 2 });

  it("por encima de una capa que tapa, lo de debajo no se anuncia", () => {
    const encima = { ...alNorte, y: 3000 };
    expect(queSeVe([dunas], encima, new Set(), mar, rota)).toBeNull();
    expect(queSeVe([dunas], encima, new Set(), mar, cubierta)).toBeNull();
    // Y sin la capa, sí: es lo que pasaba.
    expect(queSeVe([dunas], encima, new Set(), mar)?.hito.nombre).toBe(
      "Dunas de Maspalomas",
    );
  });

  it("entre nubes sueltas el suelo se ve", () => {
    const encima = { ...alNorte, y: 3000 };
    expect(queSeVe([dunas], encima, new Set(), mar, sueltas)?.hito.nombre).toBe(
      "Dunas de Maspalomas",
    );
  });

  it("y el Teide asomando por encima del mar de nubes, visto desde encima, sí", () => {
    const encima = { ...alNorte, y: 3000 };
    expect(
      queSeVe([dunas, teide], encima, new Set(), mar, cubierta)?.hito.nombre,
    ).toBe("Teide");
  });

  it("y desde debajo de la capa, la cumbre que asoma por encima no se ve", () => {
    const debajo = { ...alNorte, y: 600 };
    expect(queSeVe([teide], debajo, new Set(), mar, cubierta)).toBeNull();
    // Pero lo que está debajo con uno, sí.
    expect(queSeVe([dunas], debajo, new Set(), mar, cubierta)?.hito.nombre).toBe(
      "Dunas de Maspalomas",
    );
  });

  it("y desde dentro de la nube no se ve nada", () => {
    const dentro = { ...alNorte, y: 1400 };
    expect(queSeVe([dunas, teide], dentro, new Set(), mar, cubierta)).toBeNull();
  });

  it("y la capa se curva con la Tierra: de lejos, la recta se mete en ella", () => {
    /*
     * Dos puntos a cincuenta metros por encima del techo: la recta entre los
     * dos pasa más cerca de la Tierra por el medio, porque la Tierra —y la
     * capa con ella— se abomba hacia la recta. A veinte kilómetros baja siete
     * metros y no la toca; a ochenta baja más de cien y se mete en la nube.
     */
    const ojo = { x: 0, y: 1850, z: 0 };
    expect(laCapaTapa(ojo, { x: 20_000, y: 1850, z: 0 }, cubierta)).toBe(false);
    expect(laCapaTapa(ojo, { x: 80_000, y: 1850, z: 0 }, cubierta)).toBe(true);
  });
});
