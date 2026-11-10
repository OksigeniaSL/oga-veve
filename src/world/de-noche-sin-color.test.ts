/**
 * De noche, la pintura sin color: lo que se puede mirar sin tarjeta gráfica es
 * la cuenta de la hora y el texto que se inyecta. Ver `de-noche-sin-color.ts`.
 */
import { Group, Mesh, MeshLambertMaterial, MeshStandardMaterial, ShaderLib } from "three";
import { describe, expect, it } from "vitest";
import {
  colorQueSeLlevaLaNoche,
  PINTURA,
  pinturaSinColorDeNoche,
  ponerLaNoche,
  SIN_COLOR,
  sinColorDeNoche,
} from "./de-noche-sin-color";

/** Lo que `onBeforeCompile` recibe, con el fragmento de verdad de ese material. */
const programa = (fragmento: string) => ({
  uniforms: {} as Record<string, { value: unknown }>,
  vertexShader: "void main() {\n}",
  fragmentShader: fragmento,
});
const compilar = (m: MeshStandardMaterial | MeshLambertMaterial, fragmento: string) => {
  const p = programa(fragmento);
  m.onBeforeCompile(p as never, {} as never);
  return p;
};

describe("de noche, la pintura del avión no tiene color", () => {
  it("se va con el crepúsculo: nada con el civil, casi todo con el náutico y todo con la noche cerrada", () => {
    // Las estrellas de `MOMENTOS` en `sky.ts`: de día, con el sol en el horizonte, a −6°, −12° y −18°.
    expect(colorQueSeLlevaLaNoche(0)).toBe(0);
    expect(colorQueSeLlevaLaNoche(0.12)).toBe(0);
    expect(colorQueSeLlevaLaNoche(0.55)).toBe(0);
    expect(colorQueSeLlevaLaNoche(0.85)).toBeCloseTo(2 / 3, 5);
    expect(colorQueSeLlevaLaNoche(1)).toBe(1);
    ponerLaNoche(1);
    expect(SIN_COLOR.value).toBe(1);
    ponerLaNoche(0);
    expect(SIN_COLOR.value).toBe(0);
  });

  it("se cuela en los materiales de verdad, detrás del color de la pieza y antes de alumbrarla", () => {
    for (const [m, fragmento] of [
      [new MeshStandardMaterial(), ShaderLib.standard.fragmentShader],
      [new MeshLambertMaterial(), ShaderLib.lambert.fragmentShader],
    ] as const) {
      sinColorDeNoche(m);
      const p = compilar(m, fragmento);
      expect(p.fragmentShader).toContain("uniform float uSinColor;");
      const despues = p.fragmentShader.indexOf("#include <color_fragment>");
      const cuenta = p.fragmentShader.indexOf("uSinColor\n");
      expect(despues).toBeGreaterThan(0);
      expect(cuenta).toBeGreaterThan(despues);
      expect(cuenta).toBeLessThan(p.fragmentShader.indexOf("#include <lights_fragment_begin>"));
      // El mismo objeto: la hora se pone una vez y llega a todos sin recompilar.
      expect(p.uniforms.uSinColor).toBe(SIN_COLOR);
    }
  });

  it("envuelve lo que ya hubiera, con su propia llave de caché, y una sola vez", () => {
    const m = new MeshStandardMaterial();
    let antes = 0;
    m.onBeforeCompile = () => {
      antes++;
    };
    const llave = m.customProgramCacheKey();
    sinColorDeNoche(m);
    sinColorDeNoche(m);
    const p = compilar(m, ShaderLib.standard.fragmentShader);
    expect(antes).toBe(1);
    expect(p.fragmentShader.match(/uniform float uSinColor;/g)?.length).toBe(1);
    expect(m.customProgramCacheKey()).toBe(`${llave}|sin-color-de-noche`);
    // Un clon no se lleva el `onBeforeCompile`, así que tampoco dice que lo lleva.
    const clon = m.clone();
    sinColorDeNoche(clon);
    expect(compilar(clon, ShaderLib.standard.fragmentShader).fragmentShader).toContain("uSinColor");
  });

  it("solo la pintura: el metal, el cristal y lo de dentro, como estaban", () => {
    const raiz = new Group();
    const de = (nombre: string) => {
      const m = new MeshStandardMaterial({ name: nombre });
      raiz.add(new Mesh(undefined, m));
      return m;
    };
    const capo = de("capo");
    // Dos piezas con el mismo material, como el capó y el manguito de la reversa.
    raiz.add(new Mesh(undefined, capo));
    const otros = ["gris", "aluminio", "oscuro", "cristal", "goma", "tablero"].map(de);
    for (const n of PINTURA) if (n !== "capo") de(n);
    expect(pinturaSinColorDeNoche(raiz)).toBe(PINTURA.size);
    expect(capo.customProgramCacheKey()).toContain("sin-color-de-noche");
    for (const m of otros) expect(m.customProgramCacheKey()).not.toContain("sin-color-de-noche");
  });
});
