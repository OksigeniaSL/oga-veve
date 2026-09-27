/**
 * La consulta del teléfono apaisado vive dos veces —en `telefono.ts` para el
 * código y en la hoja, que no puede importarla— y tienen que decir lo mismo.
 *
 * Si se separan, el HUD cree que está en un teléfono y la hoja no, o al
 * revés: el cuadro deja de dibujarse mientras la hoja lo enseña abierto, o la
 * tarjeta de la orden se mide como si estuviera arriba sin estarlo. Nada de eso
 * falla con un error; se ve raro en un teléfono que nadie tiene a mano.
 */
import { describe, expect, it } from "vitest";
import CSS from "../style.css?raw";
import { TELEFONO_APAISADO } from "./telefono";

describe("el teléfono apaisado", () => {
  it("la hoja usa la misma consulta que el código", () => {
    expect(CSS).toContain(`@media ${TELEFONO_APAISADO} {`);
  });

  it("y los pictogramas salen solo con el cuadro recogido", () => {
    expect(CSS).toMatch(
      /\.hud:not\(\.hud--cuadro-bajado\) \.pictos,\s*\.hud\.hud--cabina \.pictos\s*\{\s*display: none;/,
    );
  });
});
