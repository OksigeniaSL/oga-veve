/**
 * El modelo del esquema del ala.
 *
 * Lo que se comprueba aquí no es que los números sean bonitos: es que **el
 * dibujo enseñe lo que pasa de verdad**. Las tres cosas que el esquema promete
 * —sube la sustentación, sube más deprisa la resistencia, y en un punto el
 * flujo se despega y se cae todo— tienen que salir del modelo, no del dibujo.
 */

import { describe, expect, it } from "vitest";
import {
  ALFA_MAXIMA,
  ALFA_MINIMA,
  CUANTAS_PRESIONES,
  cuantoDesprendido,
  dondeSeDespega,
  loQueLevantan,
  mirarElAla,
  PARTE_DE_ARRIBA,
  presiones,
} from "./ala";
import { PYKASU } from "./aircraft";
import { liftCoefficient } from "./fdm";

const PERDIDA = (PYKASU.aero.alphaStall * 180) / Math.PI;
const ala = (grados: number, v = 40) => mirarElAla(PYKASU, grados, v);

describe("cómo vuela un ala", () => {
  it("el tirador cubre de antes de nivelado a bien pasada la pérdida", () => {
    expect(ALFA_MINIMA).toBeLessThan(0);
    expect(ALFA_MAXIMA).toBeGreaterThan(PERDIDA + 5);
  });

  /*
   * **Uno: sube el ángulo, sube la sustentación, casi en línea recta.**
   */
  it("hasta la pérdida es la misma curva que vuela el avión", () => {
    for (let g = ALFA_MINIMA; g < PERDIDA; g += 1) {
      const suya = liftCoefficient(
        (g * Math.PI) / 180,
        PYKASU.aero,
        PYKASU.aero.alphaStall,
      );
      expect(ala(g).cl).toBeCloseTo(suya, 9);
    }
  });

  it("y pasada la pérdida se cae más que la del avión, que perdona", () => {
    const g = PERDIDA + 7;
    const suya = liftCoefficient(
      (g * Math.PI) / 180,
      PYKASU.aero,
      PYKASU.aero.alphaStall,
    );
    expect(ala(g).cl).toBeLessThan(suya);
    // Y sobre todo: por debajo de lo que daba a un ángulo cómodo, que es lo
    // que el cartel del esquema dice que pasa.
    expect(ala(g).cl).toBeLessThan(ala(6).cl * 1.25);
  });

  it("hasta la pérdida, la sustentación sube y sube casi recta", () => {
    const paso = [];
    for (let g = 0; g < PERDIDA - 1; g += 1) {
      paso.push(ala(g + 1).cl - ala(g).cl);
    }
    for (const d of paso) expect(d).toBeGreaterThan(0);
    const primero = paso[0]!;
    for (const d of paso) expect(Math.abs(d - primero)).toBeLessThan(1e-6);
  });

  /*
   * **Dos: la resistencia sube más deprisa.** Ahí está la explicación entera
   * de por qué no se vuela con el morro arriba del todo.
   */
  it("y la resistencia sube más deprisa que la sustentación", () => {
    const bajo = ala(2);
    const alto = ala(PERDIDA - 2);
    expect(alto.cd / bajo.cd).toBeGreaterThan(alto.cl / bajo.cl);
    // Y la finura empeora: lo que se gana levantando se paga arrastrando.
    expect(alto.cl / alto.cd).toBeLessThan(bajo.cl / bajo.cd);
  });

  /*
   * **Tres: pasado el ángulo de pérdida, el flujo se despega y se cae todo.**
   *
   * Y hasta la pérdida es exactamente la curva del avión: mismo `cl0`, misma
   * pendiente, mismo ángulo. Pasado ese punto el esquema enseña lo que hace un
   * ala y el modelo de vuelo sigue perdonando, que es otra cosa y está puesta
   * a propósito. Ver `SE_LLEVA_EL_DESPRENDIMIENTO`.
   */
  describe("y en un punto se despega", () => {
    it("por debajo de la pérdida no hay nada desprendido", () => {
      expect(cuantoDesprendido(PERDIDA - 1, PYKASU.aero.alphaStall)).toBe(0);
      expect(dondeSeDespega(PERDIDA - 1, PYKASU.aero.alphaStall)).toBe(1);
    });

    it("y por encima se desprende más cuanto más se insiste", () => {
      const poco = cuantoDesprendido(PERDIDA + 2, PYKASU.aero.alphaStall);
      const mucho = cuantoDesprendido(PERDIDA + 7, PYKASU.aero.alphaStall);
      expect(poco).toBeGreaterThan(0);
      expect(mucho).toBeGreaterThan(poco);
      expect(mucho).toBeLessThanOrEqual(1);
    });

    it("el punto de despegue se corre hacia el borde de ataque", () => {
      expect(dondeSeDespega(PERDIDA + 2, PYKASU.aero.alphaStall)).toBeLessThan(
        1,
      );
      expect(dondeSeDespega(PERDIDA + 8, PYKASU.aero.alphaStall)).toBeLessThan(
        dondeSeDespega(PERDIDA + 2, PYKASU.aero.alphaStall),
      );
    });

    it("y la sustentación se cae de golpe", () => {
      expect(ala(PERDIDA + 6).cl).toBeLessThan(ala(PERDIDA).cl);
    });
  });

  /*
   * **La mayor parte de la sustentación la hace la succión de arriba**, que es
   * lo que casi todo el mundo supone al revés. Si el dibujo dejara de decirlo,
   * el esquema habría perdido su motivo.
   */
  describe("el mapa de presiones", () => {
    it("chupa arriba y empuja abajo", () => {
      const p = presiones(PYKASU, 6);
      expect(p.arriba).toHaveLength(CUANTAS_PRESIONES);
      for (const e of p.arriba) expect(e.cp).toBeLessThan(0);
      for (const e of p.abajo) expect(e.cp).toBeGreaterThan(0);
    });

    it("y la mayor parte la hace la succión de arriba", () => {
      const l = loQueLevantan(presiones(PYKASU, 6));
      expect(l.arriba).toBeGreaterThan(l.abajo);
      expect(l.arriba / l.total).toBeGreaterThan(0.6);
    });

    it("la succión vive en el primer trozo de cuerda, no repartida", () => {
      const { arriba } = presiones(PYKASU, 6);
      const delante = arriba.filter((e) => e.x < 0.25);
      const detras = arriba.filter((e) => e.x >= 0.25);
      const media = (l: typeof arriba) =>
        l.reduce((s, e) => s + Math.abs(e.cp), 0) / l.length;
      expect(media(delante)).toBeGreaterThan(2 * media(detras));
    });

    it("crece con el ángulo mientras el flujo va pegado", () => {
      const poco = loQueLevantan(presiones(PYKASU, 2)).total;
      const mucho = loQueLevantan(presiones(PYKASU, 10)).total;
      expect(mucho).toBeGreaterThan(poco);
    });

    /*
     * Y esta es la que importa: **el azul desaparece solo**. No hay nadie
     * apagándolo; se apaga porque detrás del punto de despegue ya no hay
     * succión, y por eso el dibujo y la curva se caen a la vez.
     */
    it("y se cae al desprenderse, sin que nadie lo apague", () => {
      const pegado = loQueLevantan(presiones(PYKASU, PERDIDA)).total;
      const poco = loQueLevantan(presiones(PYKASU, PERDIDA + 7)).total;
      const del_todo = loQueLevantan(presiones(PYKASU, PERDIDA + 9)).total;
      // El campo hace cumbre justo en la pérdida y a partir de ahí baja.
      expect(poco).toBeLessThan(pegado * 0.7);
      expect(del_todo).toBeLessThan(pegado * 0.5);
      // Y la curva del avión también, que es de donde viene la lección.
      expect(ala(PERDIDA + 7).cl).toBeLessThan(ala(PERDIDA).cl);
    });

    /*
     * El campo se cae **más deprisa que la curva del avión**, y eso es a
     * propósito: el modelo de vuelo mezcla hacia una placa plana, que sigue
     * levantando algo, mientras que lo que el dibujo enseña es la succión, y
     * la succión se va antes. Las dos bajan, que es la lección; el número que
     * se enseña al lado es siempre el del avión, no el de esta integral.
     */
    it("el campo hace cumbre en la pérdida y no antes ni después", () => {
      let mayor = -Infinity;
      let donde = 0;
      for (let g = 0; g <= PERDIDA + 12; g += 0.5) {
        const v = loQueLevantan(presiones(PYKASU, g)).total;
        if (v > mayor) {
          mayor = v;
          donde = g;
        }
      }
      expect(donde).toBeCloseTo(PERDIDA, 0);
    });

    it("detrás del despegue no queda succión, solo la estela", () => {
      const { arriba } = presiones(PYKASU, PERDIDA + 7);
      const corte = dondeSeDespega(PERDIDA + 7, PYKASU.aero.alphaStall);
      for (const e of arriba) {
        if (e.x > corte) expect(Math.abs(e.cp)).toBeLessThan(0.2);
      }
    });
  });

  /*
   * **El segundo tirador: la velocidad.** La sustentación crece con el
   * cuadrado, y de ahí sale por qué despacio hay que ir con el morro más alto.
   */
  describe("y la velocidad", () => {
    it("la sustentación crece con el cuadrado de la velocidad", () => {
      const lenta = ala(6, 30).sustentacion;
      const rapida = ala(6, 60).sustentacion;
      expect(rapida / lenta).toBeCloseTo(4, 5);
    });

    it("por eso despacio hace falta más ángulo para el mismo peso", () => {
      const bastaPara = (v: number) => {
        for (let g = ALFA_MINIMA; g <= ALFA_MAXIMA; g += 0.1) {
          if (ala(g, v).veces >= 1) return g;
        }
        return Infinity;
      };
      expect(bastaPara(30)).toBeGreaterThan(bastaPara(50));
    });

    it("y el reparto entre arriba y abajo no depende de la velocidad", () => {
      expect(PARTE_DE_ARRIBA).toBeGreaterThan(0.5);
      const a = loQueLevantan(presiones(PYKASU, 6));
      expect(a.arriba / a.total).toBeCloseTo(PARTE_DE_ARRIBA, 1);
    });
  });
});
