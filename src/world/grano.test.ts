/**
 * El grano del suelo.
 *
 * Dos cosas se pueden comprobar sin tarjeta gráfica, y las dos son las que
 * fallaron:
 *
 * 1. **El contraste de la trama.** Fue la avería de verdad, y engañó durante
 *    cuatro intentos: sumar tres octavas de valores aleatorios da una campana
 *    estrecha alrededor de 0,5, así que la trama salía casi plana. Multiplicar
 *    el suelo por algo casi plano no hace nada — ni subiendo la fuerza a 0,9.
 *
 *    Ésa es exactamente la trampa que esta casa ya tiene anotada: **un efecto
 *    que no cambia nada al multiplicarlo por seis no está flojo, está roto en
 *    otro sitio.** Se acabó viendo pintando el suelo con el grano puro.
 *
 * 2. **El texto del sombreador.** Un shader no se ejecuta aquí, pero las
 *    averías de sombreador de este proyecto han sido siempre de texto: una
 *    palabra de más, un sumando de más, un `mix` donde iba un `+=`. Ver
 *    `sky.test.ts`, que aprendió lo mismo con el sol trece grados fuera de
 *    sitio.
 */

import { describe, expect, it } from "vitest";
import {
  GLSL_DEL_GRANO,
  HASTA_DONDE,
  lienzoDeGrano,
  METROS_POR_REPETICION,
} from "./grano";

/**
 * Un lienzo de mentira: no hay documento en una prueba, así que se imita lo
 * justo que usa `lienzoDeGrano` —ancho, alto y un contexto 2D con `getImageData`
 * y `putImageData`—.
 */
function lienzoDeMentira(): {
  hacer: () => HTMLCanvasElement;
  pixeles: () => Uint8ClampedArray;
} {
  let guardado: ImageData | null = null;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      createImageData: (w: number, h: number) =>
        ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }) as
          unknown as ImageData,
      putImageData: (d: ImageData) => {
        guardado = d;
      },
    }),
  };
  return {
    hacer: () => canvas as unknown as HTMLCanvasElement,
    pixeles: () => {
      if (!guardado) throw new Error("no se pintó nada");
      return guardado.data;
    },
  };
}

describe("la trama del grano", () => {
  it("usa el recorrido entero, que es lo que falló", () => {
    /*
     * Sin estirar el contraste, esta trama se quedaba entre 90 y 160 sobre
     * 255 —un tercio del recorrido— y era invisible por mucho que se
     * multiplicara. Lo que se exige es que llegue a los dos extremos.
     */
    const l = lienzoDeMentira();
    lienzoDeGrano(l.hacer);
    const d = l.pixeles();
    let bajo = 255;
    let alto = 0;
    for (let i = 0; i < d.length; i += 4) {
      const v = d[i]!;
      if (v < bajo) bajo = v;
      if (v > alto) alto = v;
    }
    expect(bajo).toBeLessThanOrEqual(2);
    expect(alto).toBeGreaterThanOrEqual(253);
  });

  it("y no se queda apelotonada en el medio", () => {
    /*
     * Llegar a los extremos no basta: con dos píxeles en 0 y 255 y el resto
     * en 128, la prueba de arriba pasaría y el suelo seguiría liso. Lo que
     * hace textura es que **haya reparto**, así que se mide cuántos se salen
     * del tercio central.
     */
    const l = lienzoDeMentira();
    lienzoDeGrano(l.hacer);
    const d = l.pixeles();
    let fuera = 0;
    let total = 0;
    for (let i = 0; i < d.length; i += 4) {
      total++;
      const v = d[i]!;
      if (v < 85 || v > 170) fuera++;
    }
    expect(fuera / total).toBeGreaterThan(0.25);
  });

  it("y es la misma siempre, para poder comparar dos capturas", () => {
    const a = lienzoDeMentira();
    const b = lienzoDeMentira();
    lienzoDeGrano(a.hacer, 7);
    lienzoDeGrano(b.hacer, 7);
    expect([...a.pixeles().slice(0, 64)]).toEqual([...b.pixeles().slice(0, 64)]);
  });

  it("y con otra semilla es otra", () => {
    const a = lienzoDeMentira();
    const b = lienzoDeMentira();
    lienzoDeGrano(a.hacer, 7);
    lienzoDeGrano(b.hacer, 8);
    expect([...a.pixeles().slice(0, 64)]).not.toEqual([
      ...b.pixeles().slice(0, 64),
    ]);
  });
});

describe("el sombreador del grano", () => {
  it("multiplica sobre el color de la foto, no lo sustituye", () => {
    /*
     * El color tiene que seguir siendo **el medido**: es lo que hace que un
     * sitio se reconozca desde el aire, y es la regla de la casa sobre lo que
     * se enseña. El grano solo lo asperea. Un `=` donde va un `*=` convertiría
     * el paisaje en ruido gris, que es literalmente lo que se vio al
     * diagnosticarlo.
     */
    expect(GLSL_DEL_GRANO.cuerpo).toContain("diffuseColor.rgb *=");
    expect(GLSL_DEL_GRANO.cuerpo).not.toContain("diffuseColor.rgb =");
  });

  it("y centra el grano en uno, para que no oscurezca el suelo de media", () => {
    // `(grano - 0.5) * 2.0` va de −1 a 1, así que el suelo ni se apaga ni se
    // quema: se asperea alrededor del color que tenía. Sin el −0,5, la foto
    // entera se iría a oscuras.
    expect(GLSL_DEL_GRANO.cuerpo).toContain("(grano - 0.5) * 2.0");
  });

  it("y lee la trama por coordenadas del mundo, no de la malla", () => {
    /*
     * El terreno tiene triángulos muy distintos de cerca y de lejos. Con las
     * uv de la malla, la trama se estiraría justo donde los triángulos son
     * grandes — y eso es lejos, que es donde ya no debe verse.
     */
    expect(GLSL_DEL_GRANO.cuerpo).toContain("vSitioDelMundo.xz");
  });

  it("y se apaga con la distancia, que si no hierve", () => {
    expect(GLSL_DEL_GRANO.cuerpo).toContain("smoothstep");
    expect(GLSL_DEL_GRANO.cuerpo).toContain("vLejosDelOjo");
  });

  it("y el vértice declara las dos varying que el fragmento espera", () => {
    // Una varying usada y no declarada no compila, y un shader que no compila
    // en esta casa se ve como «no pasa nada», que es el peor de los avisos.
    for (const nombre of ["vSitioDelMundo", "vLejosDelOjo"]) {
      expect(GLSL_DEL_GRANO.cabeceraDelVertice).toContain(nombre);
      expect(GLSL_DEL_GRANO.cabecera).toContain(nombre);
      expect(GLSL_DEL_GRANO.vertice).toContain(nombre);
    }
  });
});

describe("y las dos medidas que lo gobiernan", () => {
  it("la trama se repite cada pocos metros, no cada palmo ni cada cuadra", () => {
    // Cada palmo se lee como rejilla; cada cuadra ya no es textura de suelo.
    expect(METROS_POR_REPETICION).toBeGreaterThanOrEqual(3);
    expect(METROS_POR_REPETICION).toBeLessThanOrEqual(20);
  });

  it("y se ve en la franja por la que se vuela cuando el paisaje importa", () => {
    // El circuito de un aeródromo va a unos trescientos metros; la
    // aproximación entra desde unos mil. Por debajo de eso el grano no
    // llegaría a la parte del vuelo en la que se mira el suelo.
    expect(HASTA_DONDE).toBeGreaterThanOrEqual(1000);
  });
});
