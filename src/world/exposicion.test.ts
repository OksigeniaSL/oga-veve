/**
 * Que el horizonte y el mapa fino tengan la misma luz.
 *
 * El anillo lejano y el mapa fino son dos fotografías distintas del mismo
 * sitio, y se juntan a tope. Sin casar la exposición eso es **un cuadrado
 * dibujado en el suelo**, que es lo que se contó jugando con foto: «las
 * ortofotos siguen mal». No era la nitidez.
 *
 * Aquí se comprueban las dos mitades: la regla —qué se hace con el número— y
 * el dato —que el número esté puesto en todas las fichas que lo necesitan y
 * dentro de lo razonable—. La segunda es la que avisa el día que se extraiga
 * una ortofoto nueva y se olvide pasar `scripts/casar-exposicion.mjs`.
 */

import { describe, expect, it } from "vitest";
import { exposicionDe, type FichaDeOrtofoto } from "./ortofoto";

/*
 * Las fichas de verdad, con `import.meta.glob` como el resto del proyecto:
 * leerlas con `node:fs` obligaría a meter los tipos de Node en un `tsconfig`
 * que es de navegador. Ver `style.test.ts`, que hace lo mismo y por lo mismo.
 */
const FICHAS = import.meta.glob("../../data/ortho/*-horizonte.json", {
  eager: true,
  import: "default",
}) as Record<string, FichaDeOrtofoto>;

const HAY_FINO = new Set(
  Object.keys(
    import.meta.glob("../../data/ortho/*-lejos.json", { eager: true }),
  ).map((r) => r.split("/").pop()!.replace("-lejos.json", "")),
);

describe("la corrección de exposición", () => {
  it("sin medir, no se corrige", () => {
    // No tocar es la respuesta correcta cuando no se sabe.
    expect(exposicionDe({})).toBe(1);
  });

  it("nunca aclara: el que manda es el mapa fino", () => {
    // Y además el color de un material no sabe multiplicar por más de uno.
    expect(exposicionDe({ exposicion: 1.4 })).toBe(1);
  });

  it("y no apaga el paisaje por una ficha estropeada", () => {
    expect(exposicionDe({ exposicion: 0.01 })).toBe(0.5);
    expect(exposicionDe({ exposicion: Number.NaN })).toBe(1);
  });

  it("y con un número medido, lo aplica tal cual", () => {
    // El de Fuerteventura, que era el peor: el horizonte un 47 % más claro.
    expect(exposicionDe({ exposicion: 0.684 })).toBeCloseTo(0.684, 6);
  });
});

describe("las fichas del horizonte que hay en el repositorio", () => {
  const entradas = Object.entries(FICHAS).map(
    ([ruta, ficha]) =>
      [ruta.split("/").pop()!.replace("-horizonte.json", ""), ficha] as const,
  );

  it("las hay, que si no esto no comprueba nada", () => {
    expect(entradas.length).toBeGreaterThan(10);
    // Y hay mapas finos con los que casarlas, que es la otra mitad.
    expect(entradas.filter(([id]) => HAY_FINO.has(id)).length).toBeGreaterThan(
      10,
    );
  });

  it.each(entradas)("%s lleva su exposición medida", (id, ficha) => {
    // Solo se puede casar con lo que haya con qué casar: el mapa fino.
    if (!HAY_FINO.has(id)) return;
    expect(typeof ficha.exposicion).toBe("number");
    // Por debajo del suelo de la corrección es que la foto está mal, no que
    // haga falta más corrección.
    expect(ficha.exposicion!).toBeGreaterThanOrEqual(0.5);
    expect(ficha.exposicion!).toBeLessThanOrEqual(1);
  });
});
