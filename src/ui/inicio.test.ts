/**
 * Lo que se dibuja en el modo inicio: el mando que se tiene en la mano, con lo
 * que hay que tocar encendido. Que cambiar de mando cambie el dibujo, y que
 * cada mando enseñe lo que de verdad hace ese gesto en él. Ver `ui/inicio.ts`.
 */

import { describe, expect, it } from "vitest";
import type { Accion } from "../flight/keymap";
import type { Gesto, Mando } from "../flight/inicio";
import { caraDe, dibujoDeMirar, dibujoDelGesto, mandoQueSenala, type ConQueTeclas } from "./inicio";

/** Las teclas de fábrica, con la mano derecha. */
const DE_FABRICA: Record<string, string> = {
  engine: "KeyI",
  throttleUp: "+",
  throttleDown: "-",
  brakes: "KeyB",
  pitchUp: "ArrowUp",
  pitchDown: "ArrowDown",
  rollLeft: "ArrowLeft",
  rollRight: "ArrowRight",
};
const teclas: ConQueTeclas = {
  teclaDe: (a: Accion) => DE_FABRICA[a] ?? "",
  chorro: false,
};

/** Los del despegue, y los del aterrizaje. Ver `flight/inicio-aterrizar.ts`. */
const GESTOS: readonly Gesto[] = [
  "motor",
  "gas",
  "subir",
  "izquierda",
  "derecha",
  "nivelar",
  "menosGas",
  "bajar",
  "frenar",
];
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

describe("los gestos de aterrizar", () => {
  it("con teclado: el menos con el motor, la flecha de bajar y el freno en su tecla", () => {
    const menos = dibujoDelGesto("menosGas", "teclado", 0, teclas);
    expect(menos).toContain('class="tecla__letra">-<');
    expect(veces(menos, "inicio__tecla--late")).toBe(1);
    const bajar = dibujoDelGesto("bajar", "teclado", 0, teclas);
    expect(veces(bajar, 'class="tecla ')).toBe(4);
    expect(bajar).toMatch(/inicio__tecla--late">[\s\S]*?class="tecla__letra">↓</);
    expect(dibujoDelGesto("frenar", "teclado", 0, teclas)).toContain('class="tecla__letra">B<');
  });

  it("el freno se toca en el dibujo con cualquier mando, como la llave", () => {
    for (const m of ["teclado", "dedo", "consola", "joystick"] as const)
      expect(dibujoDelGesto("frenar", m, 0, teclas), m).toContain('data-inicio="freno"');
    expect(dibujoDelGesto("bajar", "teclado", 0, teclas)).not.toContain("data-inicio=");
  });

  it("con el dedo: el gas baja desde la mitad, la palanca baja, y el dedo de encima va al freno rojo", () => {
    expect(dibujoDelGesto("menosGas", "dedo", 0, teclas)).toContain("dib__mueve--gas-menos");
    expect(dibujoDelGesto("bajar", "dedo", 0, teclas)).toContain("dib__mueve--abajo");
    expect(mandoQueSenala("menosGas", "dedo")).toBe("throttle");
    expect(mandoQueSenala("bajar", "dedo")).toBe("stick");
    expect(mandoQueSenala("frenar", "dedo")).toBe("freno");
    expect(mandoQueSenala("frenar", "teclado")).toBeNull();
  });

  it("con los mandos de juego: el gatillo apenas, la palanca adelante y el freno en su gatillo", () => {
    const menos = dibujoDelGesto("menosGas", "consola", 0, teclas);
    expect(menos).toContain("dib__aprieta--poco");
    expect(menos).not.toContain("dib__aprieta--si");
    expect(dibujoDelGesto("bajar", "consola", 0, teclas)).toContain("dib__mueve--abajo");
    expect(dibujoDelGesto("frenar", "consola", 0, teclas)).toContain("dib__aprieta--si");
    expect(dibujoDelGesto("menosGas", "joystick", 0, teclas)).toContain("dib__mueve--gases-menos");
    expect(dibujoDelGesto("bajar", "joystick", 0, teclas)).toContain("dib__mango--adelante");
    expect(dibujoDelGesto("frenar", "joystick", 0, teclas)).toContain("dib__late");
  });
});

describe("con el dedo", () => {
  it("la llave se toca en el propio dibujo", () => {
    expect(dibujoDelGesto("motor", "dedo", 0, teclas)).toContain('data-inicio="llave"');
    // Y con los demás mandos también: su tecla o su botón valen, y un clic en
    // la llave que brilla, también. «Le hago clic pero no se despierta la llave.»
    for (const m of ["teclado", "consola", "joystick"] as const)
      expect(dibujoDelGesto("motor", m, 0, teclas)).toContain('data-inicio="llave"');
    // Y solo la llave: los demás gestos no son botones.
    for (const m of ["teclado", "consola", "joystick"] as const)
      expect(dibujoDelGesto("gas", m, 0, teclas)).not.toContain('data-inicio="llave"');
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

  /*
   * El retrato de sus ilustraciones va **encima** de la cara de trazos, que se
   * queda debajo por si no llega: detrás en el SVG, delante en la pantalla. Y
   * el altavoz pequeño, encima de todo. Ver `ui/ilustraciones.ts`.
   */
  it("Jazlyn, con su retrato encima de la cara dibujada; Ara, con la suya", () => {
    const suya = caraDe("mama", true);
    expect(suya).toMatch(/<image class="cara__retrato" href="[^"]*retrato-jazlyn[^"]*\.webp"/);
    expect(suya.indexOf("cara__gafas")).toBeLessThan(suya.indexOf("cara__retrato"));
    expect(suya.indexOf("cara__retrato")).toBeLessThan(suya.indexOf("cara__chapa"));
    expect(caraDe("ara")).not.toContain("cara__retrato");
    expect(caraDe("tripulacion")).not.toContain("cara__retrato");
  });
});

/*
 * **La escena de pasaje**: no se pide ningún gesto, se dice qué mirar. Y quien
 * habla por la megafonía se reconoce: la comandante con su altavoz pequeño, y
 * la tripulación —a la que no se ve— con el altavoz del techo y sin cara. Ver
 * `flight/inicio-pasaje.ts`.
 */
describe("de pasaje: qué mirar y quién habla por la megafonía", () => {
  it("cada cosa que mirar es otro dibujo, y dice cuál es", () => {
    const cosas = ["ventanilla", "ala", "motor", "nubes", "cinturon"] as const;
    const dibujos = cosas.map((m) => dibujoDeMirar(m));
    expect(new Set(dibujos).size).toBe(cosas.length);
    cosas.forEach((m, i) => expect(dibujos[i]).toContain(`data-mirar="${m}"`));
    // Y lo que hay que mirar late; lo demás, quieto.
    for (const d of dibujos) expect(veces(d, "dib__late")).toBe(1);
  });

  it("la comandante por la megafonía lleva su cara y el altavoz; al lado, sin él", () => {
    const alLado = caraDe("mama");
    const porElAltavoz = caraDe("mama", true);
    expect(alLado).not.toContain("cara__chapa");
    expect(porElAltavoz).toContain("cara__chapa");
    expect(porElAltavoz).toContain("cara__gorra");
  });

  it("y la tripulación, el altavoz del techo y ninguna cara inventada", () => {
    const t = caraDe("tripulacion", true);
    expect(t).toContain("cara__altavoz");
    expect(t).not.toContain("cara__piel");
    expect(t).not.toContain("cara__chapa");
  });
});
