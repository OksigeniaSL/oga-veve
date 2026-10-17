/**
 * Lo que se dibuja en el modo inicio: el mando que se tiene en la mano, con lo
 * que hay que tocar encendido. Que cambiar de mando cambie el dibujo, y que
 * cada mando enseñe lo que de verdad hace ese gesto en él. Ver `ui/inicio.ts`.
 */

import { describe, expect, it } from "vitest";
import type { Accion } from "../flight/keymap";
import type { Gesto, Mando } from "../flight/inicio";
import { caraDe, dibujoDelGesto, mandoQueSenala, type ConQueTeclas } from "./inicio";

/** Las teclas de fábrica, con la mano derecha. */
const DE_FABRICA: Record<string, string> = {
  engine: "KeyI",
  throttleUp: "+",
  pitchUp: "ArrowUp",
  pitchDown: "ArrowDown",
  rollLeft: "ArrowLeft",
  rollRight: "ArrowRight",
};
const teclas: ConQueTeclas = {
  teclaDe: (a: Accion) => DE_FABRICA[a] ?? "",
  chorro: false,
};

const GESTOS: readonly Gesto[] = ["motor", "gas", "subir", "izquierda", "derecha", "nivelar"];
const MANDOS: readonly Mando[] = ["teclado", "dedo", "consola", "joystick"];

/** Cuántas veces sale un trozo en un texto. */
const veces = (en: string, que: string): number => en.split(que).length - 1;

describe("el cambio de mando cambia el dibujo", () => {
  it("cada gesto se dibuja distinto con cada mando, y dice cuál es", () => {
    for (const g of GESTOS) {
      const dibujos = MANDOS.map((m) => dibujoDelGesto(g, m, 1, teclas));
      expect(new Set(dibujos).size, g).toBe(MANDOS.length);
      MANDOS.forEach((m, i) => {
        expect(dibujos[i], `${g} con ${m}`).toContain(`data-mando="${m}"`);
        expect(dibujos[i], `${g} con ${m}`).toContain(`data-gesto="${g}"`);
      });
    }
  });

  it("y con el mismo mando, cada gesto es otro dibujo", () => {
    for (const m of MANDOS) {
      const dibujos = GESTOS.map((g) => dibujoDelGesto(g, m, 1, teclas));
      expect(new Set(dibujos).size, m).toBe(GESTOS.length);
    }
  });
});

describe("con teclado, la tecla de verdad, latiendo", () => {
  it("la llave en la I y el motor con su flecha en el más", () => {
    const motor = dibujoDelGesto("motor", "teclado", 0, teclas);
    expect(motor).toContain('class="tecla__letra">I<');
    expect(veces(motor, "inicio__tecla--late")).toBe(1);
    const gas = dibujoDelGesto("gas", "teclado", 0, teclas);
    expect(gas).toContain('class="tecla__letra">+<');
  });

  it("con la mano izquierda, las suyas", () => {
    const zurda: ConQueTeclas = {
      teclaDe: (a) => ({ throttleUp: "KeyX", pitchUp: "KeyW", rollLeft: "KeyA" })[a as string] ?? "",
      chorro: false,
    };
    expect(dibujoDelGesto("gas", "teclado", 0, zurda)).toContain('class="tecla__letra">X<');
    expect(dibujoDelGesto("subir", "teclado", 0, zurda)).toContain('class="tecla__letra">W<');
  });

  it("las cuatro flechas juntas, y encendida solo la que toca", () => {
    const subir = dibujoDelGesto("subir", "teclado", 0, teclas);
    expect(veces(subir, 'class="tecla ')).toBe(4);
    expect(veces(subir, "inicio__tecla--late")).toBe(1);
    // La de subir es la primera, la de arriba.
    expect(subir.indexOf("inicio__tecla--late")).toBeLessThan(subir.indexOf("inicio__tecla--apagada"));
    const izquierda = dibujoDelGesto("izquierda", "teclado", 0, teclas);
    expect(izquierda).toMatch(/inicio__tecla--late">[\s\S]*?class="tecla__letra">←</);
  });

  it("para enderezar, la del lado contrario al que está inclinado", () => {
    const inclinadoIzquierda = dibujoDelGesto("nivelar", "teclado", -1, teclas);
    expect(inclinadoIzquierda).toMatch(/inicio__tecla--late">[\s\S]*?class="tecla__letra">→</);
    const inclinadoDerecha = dibujoDelGesto("nivelar", "teclado", 1, teclas);
    expect(inclinadoDerecha).toMatch(/inicio__tecla--late">[\s\S]*?class="tecla__letra">←</);
  });
});

describe("con el dedo", () => {
  it("la llave se toca en el propio dibujo", () => {
    expect(dibujoDelGesto("motor", "dedo", 0, teclas)).toContain('data-inicio="llave"');
    // Y con los demás mandos no: la llave es su tecla o su botón.
    for (const m of ["teclado", "consola", "joystick"] as const)
      expect(dibujoDelGesto("motor", m, 0, teclas)).not.toContain('data-inicio="llave"');
  });

  it("el dedo de encima señala la palanca para volar y el gas para el gas", () => {
    expect(mandoQueSenala("gas", "dedo")).toBe("throttle");
    for (const g of ["subir", "izquierda", "derecha", "nivelar"] as const)
      expect(mandoQueSenala(g, "dedo")).toBe("stick");
    expect(mandoQueSenala("motor", "dedo")).toBeNull();
    expect(mandoQueSenala(null, "dedo")).toBeNull();
    for (const m of ["teclado", "consola", "joystick"] as const)
      expect(mandoQueSenala("subir", m)).toBeNull();
  });
});

describe("con un mando de juego", () => {
  it("el de consola: el gatillo derecho aprieta, la palanca izquierda se mueve y la llave es el botón de empezar", () => {
    expect(dibujoDelGesto("gas", "consola", 0, teclas)).toContain("dib__aprieta--si");
    expect(dibujoDelGesto("subir", "consola", 0, teclas)).toContain("dib__mueve--arriba");
    expect(dibujoDelGesto("izquierda", "consola", 0, teclas)).toContain("dib__mueve--izquierda");
    expect(dibujoDelGesto("motor", "consola", 0, teclas)).toContain("dib__late");
  });

  it("el joystick: la palanca de gases adelante, la de mando hacia uno para subir y a los lados para virar", () => {
    expect(dibujoDelGesto("gas", "joystick", 0, teclas)).toContain("dib__mueve--gases");
    expect(dibujoDelGesto("subir", "joystick", 0, teclas)).toContain("dib__mango--atras");
    expect(dibujoDelGesto("izquierda", "joystick", 0, teclas)).toContain("dib__mango--izquierda");
    expect(dibujoDelGesto("derecha", "joystick", 0, teclas)).toContain("dib__mango--derecha");
    expect(dibujoDelGesto("nivelar", "joystick", 1, teclas)).toContain(
      "dib__mango--endereza-desde-derecha",
    );
    expect(dibujoDelGesto("motor", "joystick", 0, teclas)).toContain("dib__late");
  });
});

describe("lo que pasa en el avión, al lado", () => {
  it("cada gesto lleva su consecuencia dibujada, la misma con cualquier mando", () => {
    for (const g of GESTOS) {
      const pasa = MANDOS.map((m) => /<(?:span|svg) class="inicio__pasa[\s\S]*$/.exec(dibujoDelGesto(g, m, 1, teclas))?.[0]);
      expect(pasa[0], g).toBeTruthy();
      for (const p of pasa) expect(p).toBe(pasa[0]);
    }
  });
});

describe("quién habla", () => {
  it("Jazlyn con su gorra y sus gafas, y Ara sin ellas", () => {
    expect(caraDe("mama")).toContain("cara__gafas");
    expect(caraDe("mama")).toContain("cara__gorra");
    expect(caraDe("ara")).not.toContain("cara__gafas");
    expect(caraDe("ara")).not.toContain("cara__gorra");
  });
});
