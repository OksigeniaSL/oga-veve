import { describe, expect, it } from "vitest";
import { proxyDelParte } from "./meteo";

describe("por qué proxy se pide el parte", () => {
  it("lo que pide la dirección manda: vacío es sin parte, y una dirección es ese proxy", () => {
    expect(proxyDelParte(new URLSearchParams("meteo="))).toBeNull();
    expect(proxyDelParte(new URLSearchParams("meteo=https://otro"))).toBe("https://otro");
  });

  it("y «verdad» es el del .env, aunque lo maneje un banco", () => {
    expect(proxyDelParte(new URLSearchParams("meteo=verdad"))).toBe(
      import.meta.env.VITE_METEO ?? null,
    );
  });
});
