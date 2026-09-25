/**
 * Las luces lejanas: lo que se puede mirar sin tarjeta gráfica es el texto
 * que se inyecta. Ver `material-de-luces.ts`.
 */
import { describe, expect, it } from "vitest";
import { GLSL_DE_LUCES, materialDeLuces } from "./material-de-luces";

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
