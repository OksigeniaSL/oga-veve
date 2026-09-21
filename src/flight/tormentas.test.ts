/**
 * Las tormentas y su radar.
 *
 * Lo que se comprueba es lo que hace que esto sea una lección: que la escala de
 * colores sea **la de verdad**, que con buen tiempo el radar no pinte nada, y
 * que lo que el instrumento enseña sea exactamente lo que se siente — porque si
 * no coinciden, lo que se aprende es a no creerle al instrumento.
 */

import { describe, expect, it } from "vitest";
import {
  anillosDe,
  celdasDe,
  colorDelEco,
  cuantoSacude,
  ecoEn,
  type Celda,
  laQueVieneDelante,
} from "./tormentas";

const LADO = 18000;

describe("la escala del radar", () => {
  it("va de nada a magenta, en ese orden", () => {
    expect(colorDelEco(0)).toBe("nada");
    expect(colorDelEco(0.3)).toBe("verde");
    expect(colorDelEco(0.55)).toBe("ambar");
    expect(colorDelEco(0.8)).toBe("rojo");
    expect(colorDelEco(1)).toBe("magenta");
  });

  it("y nunca se salta un escalón al subir", () => {
    const orden = ["nada", "verde", "ambar", "rojo", "magenta"];
    let antes = 0;
    for (let e = 0; e <= 1; e += 0.01) {
      const i = orden.indexOf(colorDelEco(e));
      expect(i - antes, `en ${e.toFixed(2)}`).toBeLessThanOrEqual(1);
      expect(i).toBeGreaterThanOrEqual(antes);
      antes = i;
    }
  });
});

describe("qué células hay hoy", () => {
  it("con buen tiempo, ninguna", () => {
    /*
     * Un radar encendido que no pinta nada es lo que hace un radar el noventa
     * por ciento de los días. Inventar una tormenta en un cielo despejado
     * sería mentir sobre el tiempo y sobre el instrumento a la vez.
     */
    expect(celdasDe("nada", 0, LADO)).toEqual([]);
  });

  it("y con llovizna tampoco: eso es una capa, no una célula", () => {
    expect(celdasDe("llovizna", 1, LADO)).toEqual([]);
  });

  it("con lluvia, algunas y flojas", () => {
    const c = celdasDe("lluvia", 0.5, LADO);
    expect(c.length).toBeGreaterThan(0);
    for (const x of c) expect(x.fuerza).toBeLessThan(0.7);
  });

  it("y con tormenta, más y más fuertes", () => {
    const lluvia = celdasDe("lluvia", 1, LADO);
    const tormenta = celdasDe("tormenta", 1, LADO);
    expect(tormenta.length).toBeGreaterThan(lluvia.length);
    const peorT = Math.max(...tormenta.map((c) => c.fuerza));
    const peorLl = Math.max(...lluvia.map((c) => c.fuerza));
    expect(peorT).toBeGreaterThan(peorLl);
  });

  it("y ninguna encima del aeropuerto", () => {
    /*
     * El aeropuerto está en el origen. Despegar desde dentro de una célula no
     * es una lección, es una encerrona.
     */
    for (const semilla of [1, 2, 3, 7, 11]) {
      for (const c of celdasDe("tormenta", 1, LADO, semilla)) {
        const alCampo = Math.hypot(c.x, c.z);
        expect(alCampo, `semilla ${semilla}`).toBeGreaterThan(LADO * 0.2);
      }
    }
  });

  it("y la misma tormenta está siempre en el mismo sitio", () => {
    // Una tormenta que cambia de sitio cada vez es un enemigo, no un fenómeno.
    expect(celdasDe("tormenta", 1, LADO, 5)).toEqual(
      celdasDe("tormenta", 1, LADO, 5),
    );
    expect(celdasDe("tormenta", 1, LADO, 5)).not.toEqual(
      celdasDe("tormenta", 1, LADO, 6),
    );
  });
});

describe("el eco en un punto", () => {
  const una: Celda[] = [{ x: 0, z: 0, radio: 4000, fuerza: 1 }];

  it("es máximo en el centro y cero fuera", () => {
    expect(ecoEn(una, 0, 0)).toBeCloseTo(1, 5);
    expect(ecoEn(una, 4001, 0)).toBe(0);
    expect(ecoEn(una, 20000, 0)).toBe(0);
  });

  it("y se apaga hacia fuera sin bordes", () => {
    /*
     * Una célula no tiene borde: por eso el radar pinta anillos y por eso se
     * puede pasar **cerca** de una tormenta sin pasar por dentro. Con un borde
     * duro, rodearla no serviría de nada.
     */
    let antes = ecoEn(una, 0, 0);
    for (let d = 100; d <= 4000; d += 100) {
      const ahora = ecoEn(una, d, 0);
      expect(ahora, `a ${d} m`).toBeLessThan(antes + 1e-9);
      antes = ahora;
    }
  });

  it("y rodearla de lejos deja de pintar rojo antes de salir del todo", () => {
    // Que haya sitio entre «rojo» y «nada» es lo que hace que rodear sea una
    // decisión y no un salto.
    const colores = new Set<string>();
    for (let d = 0; d <= 4000; d += 50)
      colores.add(colorDelEco(ecoEn(una, d, 0)));
    expect(colores.size).toBeGreaterThanOrEqual(4);
  });

  it("y donde hay dos, manda la que más pega", () => {
    const dos: Celda[] = [
      { x: 0, z: 0, radio: 3000, fuerza: 0.4 },
      { x: 1000, z: 0, radio: 3000, fuerza: 1 },
    ];
    expect(ecoEn(dos, 1000, 0)).toBeCloseTo(1, 5);
  });
});

describe("y lo que se ve es lo que se siente", () => {
  it("sacude exactamente lo que pinta el radar", () => {
    /*
     * **Ésta es la que importa de verdad.** Si el instrumento y la sensación
     * no coinciden, lo que se aprende es a no creerle al instrumento — y eso
     * es lo contrario de lo que este juego quiere enseñar.
     */
    const c = celdasDe("tormenta", 1, LADO, 9);
    for (let x = -9000; x <= 9000; x += 750)
      for (let z = -9000; z <= 9000; z += 750)
        expect(cuantoSacude(c, x, z)).toBe(ecoEn(c, x, z));
  });
});

describe("los anillos con los que se pinta una célula", () => {
  it("una floja solo llega a verde", () => {
    expect(anillosDe(0.3).map((a) => a.color)).toEqual(["verde"]);
  });

  it("y una a tope llega hasta magenta", () => {
    expect(anillosDe(1).map((a) => a.color)).toEqual([
      "verde",
      "ambar",
      "rojo",
      "magenta",
    ]);
  });

  it("y ninguna por debajo del primer corte pinta nada", () => {
    expect(anillosDe(0.1)).toEqual([]);
  });

  it("y van de fuera hacia dentro, sin cruzarse", () => {
    let antes = Infinity;
    for (const a of anillosDe(1)) {
      expect(a.parte, a.color).toBeLessThan(antes);
      expect(a.parte).toBeGreaterThan(0);
      antes = a.parte;
    }
  });

  it("**y el borde de cada color cae donde el eco cambia de color**", () => {
    /*
     * La prueba que habría cazado el fallo. Los anillos se repartían a ojo —uno,
     * dos tercios, dos quintos, un quinto del radio— y con eso el de rojo caía
     * en 0,16 de eco: por debajo del corte del **verde**. O sea que el rojo y el
     * magenta no se pintaban nunca, ni con la célula a tope.
     */
    const una: Celda[] = [{ x: 0, z: 0, radio: 5000, fuerza: 1 }];
    for (const a of anillosDe(1)) {
      // Justo dentro del anillo tiene que verse ya su color.
      const dentro = ecoEn(una, a.parte * 5000 * 0.98, 0);
      expect(colorDelEco(dentro), a.color).toBe(a.color);
    }
  });
});

/*
 * ── Y decir que viene una, que nadie las nombraba ─────────────────────────
 *
 * El radar las pintaba con la escala de color de verdad y no las nombraba
 * nadie. Preguntado con una foto delante: «¿qué son esos círculos?». Un
 * color en una pantalla no es un canal.
 */
describe("la que viene delante", () => {
  const celda = (x: number, z: number, radio = 3000) => ({
    x,
    z,
    radio,
    fuerza: 0.6,
  });

  it("la de delante se ve, la de atrás no", () => {
    // Rumbo cero: el morro mira al norte, que en el juego es la Z negativa.
    const delante = laQueVieneDelante([celda(0, -9000)], 0, 0, 0);
    expect(delante?.distancia).toBeCloseTo(9000, -1);
    expect(laQueVieneDelante([celda(0, 9000)], 0, 0, 0)).toBeNull();
  });

  it("y la que queda de costado tampoco, que ésa no se rodea", () => {
    expect(laQueVieneDelante([celda(9000, 0)], 0, 0, 0)).toBeNull();
  });

  it("ni la que está más lejos que el alcance", () => {
    expect(laQueVieneDelante([celda(0, -40000)], 0, 0, 0)).toBeNull();
  });

  it("ni una en la que ya se está metido: se anuncia lo que viene", () => {
    expect(laQueVieneDelante([celda(0, -1000, 3000)], 0, 0, 0)).toBeNull();
  });

  it("y de dos, la más cercana", () => {
    const dos = [celda(0, -12000), celda(0, -6000)];
    expect(laQueVieneDelante(dos, 0, 0, 0)?.distancia).toBeCloseTo(6000, -1);
  });

  it("y el rumbo manda: la misma célula deja de venir si se vira", () => {
    const una = [celda(0, -9000)];
    expect(laQueVieneDelante(una, 0, 0, 0)).not.toBeNull();
    // Noventa grados a la derecha: la célula se queda a la izquierda.
    expect(laQueVieneDelante(una, 0, 0, Math.PI / 2)).toBeNull();
  });
});
