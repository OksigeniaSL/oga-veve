/**
 * Las luces lejanas: lo que se puede mirar sin tarjeta gráfica es el texto
 * que se inyecta. Ver `material-de-luces.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  GLSL_DE_LUCES,
  materialDeLuces,
  oscuridadParaVerDeLejos,
  ponerOscuridad,
} from "./material-de-luces";

describe("las luces de lejos, con el sol", () => {
  const grados = (g: number): number => Math.sin((g * Math.PI) / 180);

  it("el mínimo que las deja ver de lejos llega con el crepúsculo", () => {
    /*
     * Con el sol en el horizonte detrás de Tenerife, las farolas de su
     * costa, a noventa kilómetros, salían encendidas de amarillo justo
     * debajo del disco: se leía como el sol a través del terreno.
     */
    expect(oscuridadParaVerDeLejos(grados(10))).toBe(0);
    expect(oscuridadParaVerDeLejos(grados(0))).toBe(0);
    expect(oscuridadParaVerDeLejos(grados(-3))).toBeCloseTo(0.5, 1);
    expect(oscuridadParaVerDeLejos(grados(-6))).toBeCloseTo(1, 5);
    expect(oscuridadParaVerDeLejos(grados(-40))).toBe(1);
    expect(GLSL_DE_LUCES.tamano).toContain("lucesSuelo * lejania * lucesNoche");
  });

  it("y se cambia sin recompilar: el uniforme es el mismo objeto", () => {
    const m = materialDeLuces(3);
    const shader = {
      uniforms: {} as Record<string, { value: number }>,
      vertexShader: "void main() {\n gl_PointSize = size;\n}",
      fragmentShader: "void main() {\n#include <color_fragment>\n}",
    };
    m.onBeforeCompile(shader as never, undefined as never);
    ponerOscuridad(m, grados(-6));
    expect(shader.uniforms.lucesNoche!.value).toBeCloseTo(1, 5);
    ponerOscuridad(m, 0);
    expect(shader.uniforms.lucesNoche!.value).toBe(0);
  });
});

describe("las luces de lejos", () => {
  it("encogen y se apagan con la distancia, sin bajar de un mínimo", () => {
    expect(GLSL_DE_LUCES.tamano).toContain("gl_PointSize = size * max(");
    expect(GLSL_DE_LUCES.tamano).toContain("lucesSuelo");
  });

  it("la bruma las apaga, no las pinta del color de la niebla", () => {
    /*
     * La niebla de serie mezcla hacia su color, y en una luz que se suma
     * eso enciende el cielo: una mancha del color del horizonte donde había
     * una farola perdida en la bruma.
     */
    const m = materialDeLuces(3);
    const shader = {
      uniforms: {},
      vertexShader: "void main() {\n gl_PointSize = size;\n}",
      fragmentShader:
        "void main() {\n#include <color_fragment>\n#include <fog_fragment>\n}",
    };
    m.onBeforeCompile(shader as never, undefined as never);
    expect(shader.fragmentShader).not.toContain("#include <fog_fragment>");
    expect(shader.fragmentShader).toContain("diffuseColor.rgb *= vBrillo");
    expect(shader.vertexShader).not.toContain("gl_PointSize = size;\n");
    expect(m.customProgramCacheKey()).toBe("luces-lejanas");
  });
});
