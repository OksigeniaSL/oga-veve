/**
 * El banco de voz: la parte que se puede equivocar sin un altavoz delante.
 *
 * Todo lo de aquí decide **qué va a sonar**, y eso se comprueba sin navegador.
 * Lo que no está aquí es tocar el sonido, que es diez líneas de Web Audio y no
 * tiene nada que decidir.
 */

import { describe, expect, it } from "vitest";
import {
  cuantoDura,
  elegirFormato,
  EXTENSIONES,
  ficheroDe,
  leerManifiesto,
  loQueHaceFalta,
  MIMES,
  queSuena,
  recetaDe,
  type Manifiesto,
} from "./banco-de-voz";

const PACK: Manifiesto = {
  version: 1,
  voz: "instructor",
  idioma: "es-PY",
  piezas: {
    segui: { ms: 480 },
    "la-raya-verde": { ms: 620 },
    "la-calle": { ms: 400 },
    "hueco.a": { ms: 260 },
    "hueco.b": { ms: 260 },
    para: { ms: 380 },
    "en-la-doble-raya": { ms: 700 },
  },
  recetas: {
    "vuelo.rodando": ["segui", "la-raya-verde"],
    "vuelo.calle": ["segui", "la-calle", "{letra}"],
    "vuelo.esperando": ["para", "en-la-doble-raya"],
    "vuelo.rota": ["segui", "esta-pieza-no-existe"],
  },
};

describe("qué formato se baja", () => {
  /*
   * Opus pesa la mitad y suena bien en voz, así que es el que se quiere. Pero
   * solo cuando el navegador dice que sí de verdad.
   */
  it("Opus cuando el navegador lo dice sin dudar", () => {
    expect(elegirFormato((m) => (m === MIMES.opus ? "probably" : ""))).toBe(
      "opus",
    );
  });

  /*
   * **Y AAC cuando el «sí» de Opus es un «quizá».** Es lo que contesta Safari
   * justo antes de no poder, y una voz muda en la mitad de las tablets de un
   * aula cuesta mucho más que doscientos kilobytes.
   */
  it("AAC cuando Opus solo dice «quizá» y AAC dice que sí", () => {
    const puede = (m: string) => (m === MIMES.opus ? "maybe" : "probably");
    expect(elegirFormato(puede)).toBe("aac");
  });

  it("y Opus con un «quizá» si AAC ni eso", () => {
    const puede = (m: string) => (m === MIMES.opus ? "maybe" : "");
    expect(elegirFormato(puede)).toBe("opus");
  });

  it("y ninguno si no puede con nada", () => {
    expect(elegirFormato(() => "")).toBeNull();
  });

  it("un navegador que revienta al preguntarle no rompe nada", () => {
    expect(
      elegirFormato(() => {
        throw new Error("nope");
      }),
    ).toBeNull();
  });

  it("los ficheros llevan la extensión de su formato", () => {
    expect(ficheroDe("segui", "opus", "instructor")).toBe(
      `data/voces/instructor/segui.${EXTENSIONES.opus}`,
    );
    expect(ficheroDe("segui", "aac", "instructor")).toMatch(/\.m4a$/);
  });
});

describe("montar la frase, como los GPS", () => {
  it("una receta llana son sus piezas en orden", () => {
    expect(recetaDe(PACK, "vuelo.rodando")).toEqual(["segui", "la-raya-verde"]);
  });

  /*
   * El hueco es lo que hace que veintiséis piezas de una sílaba cubran todas
   * las calles de rodaje de todos los aeropuertos del juego.
   */
  it("y el hueco se rellena con la pieza que toca", () => {
    expect(recetaDe(PACK, "vuelo.calle", { letra: "hueco.b" })).toEqual([
      "segui",
      "la-calle",
      "hueco.b",
    ]);
  });

  it("sin relleno, la receta con hueco no se monta", () => {
    expect(recetaDe(PACK, "vuelo.calle")).toBeNull();
  });

  it("y con un relleno que el pack no trae, tampoco", () => {
    expect(recetaDe(PACK, "vuelo.calle", { letra: "hueco.z" })).toBeNull();
  });

  /*
   * **Media frase es peor que ninguna.** Una receta que nombra una pieza que
   * el pack no trae diría «seguí…» y se callaría a la mitad, que a los cuatro
   * años es peor que no decir nada: se cae entera al navegador.
   */
  it("una receta con una pieza que falta se cae entera", () => {
    expect(recetaDe(PACK, "vuelo.rota")).toBeNull();
  });

  it("una clave sin receta no es un fallo, es que falta grabarla", () => {
    expect(recetaDe(PACK, "vuelo.loQueSea")).toBeNull();
  });

  it("sin pack, ninguna receta", () => {
    expect(recetaDe(null, "vuelo.rodando")).toBeNull();
  });

  it("y la frase dura lo que suman sus piezas", () => {
    expect(cuantoDura(PACK, ["segui", "la-raya-verde"])).toBe(1100);
    expect(cuantoDura(PACK, ["segui", "no-existe"])).toBe(480);
  });
});

describe("qué suena al pedir una frase", () => {
  it("la persona grabada, si está grabada", () => {
    expect(queSuena(PACK, "vuelo.rodando", true)).toEqual({
      como: "grabado",
      piezas: ["segui", "la-raya-verde"],
    });
  });

  /*
   * El pack va a llegar por partes, y eso es a propósito: se puede grabar de
   * diez en diez y oír el resultado el mismo día. Lo que todavía no está
   * grabado lo dice el navegador, que es lo que hay hoy.
   */
  it("el navegador, si esa frase todavía no está grabada", () => {
    expect(queSuena(PACK, "vuelo.loQueSea", true).como).toBe("navegador");
    expect(queSuena(null, "vuelo.rodando", true).como).toBe("navegador");
  });

  /*
   * Y en guaraní no habla nadie: no existe voz de guaraní en ningún
   * sintetizador, y una voz castellana leyendo guaraní suena a burla. Callado
   * y con el dibujo, que es lo honesto.
   */
  it("y nada, si tampoco hay navegador que pueda", () => {
    expect(queSuena(PACK, "vuelo.loQueSea", false).como).toBe("callado");
    expect(queSuena(null, null, false).como).toBe("callado");
  });

  it("una frase grabada suena grabada aunque no haya navegador", () => {
    expect(queSuena(PACK, "vuelo.rodando", false).como).toBe("grabado");
  });
});

describe("leer el manifiesto que llega por la red", () => {
  it("acepta el bueno", () => {
    expect(leerManifiesto(structuredClone(PACK))).not.toBeNull();
  });

  /*
   * Lo que llega por la red no es de fiar aunque lo hayamos escrito nosotros:
   * un pack a medio subir o el `index.html` de un 404 dan un objeto que casi
   * vale, y «casi» aquí es un instructor mudo sin decir por qué.
   */
  it.each([
    ["nada", null],
    ["una cadena", "hola"],
    ["sin versión", { ...PACK, version: undefined }],
    ["con versión cero", { ...PACK, version: 0 }],
    ["sin voz", { ...PACK, voz: "" }],
    ["sin idioma", { ...PACK, idioma: "" }],
    ["sin piezas", { ...PACK, piezas: undefined }],
    ["sin recetas", { ...PACK, recetas: undefined }],
    ["con una pieza sin duración", { ...PACK, piezas: { a: {} } }],
    ["con una pieza de duración cero", { ...PACK, piezas: { a: { ms: 0 } } }],
    ["con una receta que no es lista", { ...PACK, recetas: { a: "segui" } }],
    ["con una receta de números", { ...PACK, recetas: { a: [1, 2] } }],
  ])("y rechaza %s", (_que, crudo) => {
    expect(leerManifiesto(crudo)).toBeNull();
  });

  it("no lanza nunca: quedarse sin grabaciones no rompe un vuelo", () => {
    expect(() => leerManifiesto(undefined)).not.toThrow();
  });
});

describe("qué hace falta bajar", () => {
  it("las piezas que nombra alguna receta, sin repetir", () => {
    const falta = loQueHaceFalta(PACK);
    expect(falta).toContain("segui");
    expect(falta.filter((p) => p === "segui")).toHaveLength(1);
    expect(falta).toContain("en-la-doble-raya");
  });

  /*
   * Y las piezas de hueco, que no las nombra ninguna receta por su nombre
   * —van dentro de `{letra}`— y sin ellas esas frases no se montan nunca.
   */
  it("y las de hueco, que ninguna receta nombra", () => {
    expect(loQueHaceFalta(PACK)).toContain("hueco.a");
    expect(loQueHaceFalta(PACK)).toContain("hueco.b");
  });

  it("no baja lo que el pack trae y nadie usa", () => {
    const conSobra: Manifiesto = {
      ...PACK,
      piezas: { ...PACK.piezas, "nadie-me-usa": { ms: 100 } },
    };
    expect(loQueHaceFalta(conSobra)).not.toContain("nadie-me-usa");
  });
});
