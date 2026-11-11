/**
 * **La silueta provisional del Super Puma mide lo de la ficha y gira como el de
 * verdad**: es lo único de ella que se enseña, y por eso es lo que se prueba.
 */
import { describe, expect, it } from "vitest";
import { Box3, Vector3 } from "three";
import { SUPER_PUMA_EN_EL_JUEGO } from "../flight/helicoptero-en-el-juego";
import { SUPER_PUMA } from "../flight/super-puma";
import { createAircraftMesh } from "./aircraft-mesh";

describe("la silueta del Super Puma", () => {
  const malla = createAircraftMesh(SUPER_PUMA_EN_EL_JUEGO);
  malla.group.updateMatrixWorld(true);

  it("sale del helicóptero y no de la fábrica de aviones, con sus rotores", () => {
    expect(malla.rotores).toBeTruthy();
    expect(malla.helices ?? []).toHaveLength(0);
  });

  it("15,60 m de rotor, unos 19 de punta a punta y 4,95 de alto, con las ruedas en el suelo", () => {
    const caja = new Box3().setFromObject(malla.group);
    const tam = caja.getSize(new Vector3());
    // De ancho, el rotor entero.
    expect(tam.x).toBeGreaterThan(15.4);
    expect(tam.x).toBeLessThan(15.8);
    // De la punta delantera del rotor a la trasera del de cola: 18,70 m (Airbus).
    expect(-caja.min.z + SUPER_PUMA.cola.brazo + SUPER_PUMA.cola.radio).toBeGreaterThan(18.4);
    expect(caja.max.z).toBeGreaterThan(SUPER_PUMA.cola.brazo);
    // El suelo, donde el juego pone las ruedas: un tren por debajo del origen.
    expect(caja.min.y).toBeCloseTo(-SUPER_PUMA_EN_EL_JUEGO.gearHeight, 1);
    /*
     * Y de alto, del suelo a la punta de arriba del rotor de cola, que es lo
     * más alto de un Puma: 4,95 m en la ficha. Con la altura del rotor de cola
     * que supone la ficha del modelo sale algo más, 5,1 m; la silueta la sigue.
     */
    const puntaDeLaCola = SUPER_PUMA_EN_EL_JUEGO.gearHeight + SUPER_PUMA.cola.altura + SUPER_PUMA.cola.radio;
    expect(tam.y).toBeCloseTo(puntaDeLaCola, 1);
    expect(tam.y).toBeLessThan(5.2);
  });

  it("el principal gira en horario visto desde arriba, y no gira si el rotor está parado", () => {
    const rotores = malla.rotores!;
    const principal = malla.group.children.find((o) => o.position.y === SUPER_PUMA.rotor.alturaDelBuje)!;
    expect(principal).toBeTruthy();
    rotores.avanzar(0.01, SUPER_PUMA.rotor.vueltas);
    const antes = principal.rotation.y;
    rotores.avanzar(0.01, SUPER_PUMA.rotor.vueltas);
    // En three.js, girar en +Y es antihorario visto desde arriba: el horario es hacia menos.
    expect(principal.rotation.y).toBeLessThan(antes);
    const parado = principal.rotation.y;
    rotores.avanzar(1, 0);
    expect(principal.rotation.y).toBe(parado);
  });
});
