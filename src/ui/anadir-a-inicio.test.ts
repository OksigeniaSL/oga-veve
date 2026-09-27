/**
 * Cuándo se enseña cómo añadir el juego a la pantalla de inicio.
 *
 * Solo en Safari de iPhone y sin instalar: en cualquier otro sitio la tarjeta
 * enseñaría unos botones que no están, o una solución a un problema que no
 * hay. Ver `anadir-a-inicio.ts`.
 */

import { describe, expect, it } from "vitest";
import { hayQueAnadirAInicio } from "./anadir-a-inicio";

const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const CHROME_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36";

describe("añadir a inicio", () => {
  it("se enseña en Safari de iPhone, abierto en el navegador", () => {
    expect(hayQueAnadirAInicio(false, SAFARI_IPHONE, false)).toBe(true);
  });

  it("y no abierto desde el ícono, que ya va a pantalla completa", () => {
    expect(hayQueAnadirAInicio(true, SAFARI_IPHONE, false)).toBe(false);
  });

  it("ni en Android, donde no existe `standalone` y se pide al primer toque", () => {
    expect(hayQueAnadirAInicio(undefined, ANDROID, true)).toBe(false);
  });

  it("ni en otro navegador del iPhone, que tiene los botones en otro sitio", () => {
    expect(hayQueAnadirAInicio(false, CHROME_IPHONE, false)).toBe(false);
  });

  it("ni donde se puede pedir la pantalla completa, como en el iPad", () => {
    expect(hayQueAnadirAInicio(false, SAFARI_IPHONE, true)).toBe(false);
  });
});
