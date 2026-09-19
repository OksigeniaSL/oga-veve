/**
 * Una llegada, una puerta.
 *
 * Lo que se comprueba es que **elegir se llama una vez**, porque el fallo no
 * era elegir mal: era volver a elegir. Ver `puerta-asignada.ts`.
 */

import { describe, expect, it, vi } from "vitest";
import { PuertaAsignada } from "./puerta-asignada";

describe("la puerta de una llegada", () => {
  it("una vez en firme, no se vuelve a elegir", () => {
    const p = new PuertaAsignada<string>();
    const elegir = vi.fn(() => "A");
    expect(p.pedir(true, elegir)).toBe("A");
    // Cien fotogramas de rodaje, que es lo que dura abandonar una pista.
    for (let i = 0; i < 100; i++) p.pedir(true, elegir);
    expect(elegir).toHaveBeenCalledTimes(1);
  });

  it("y aunque el sitio más cercano cambie al avanzar, la puerta no", () => {
    /*
     * **Éste es el fallo tal cual pasaba.** La regla mide «el más cercano
     * rodando desde donde estás», así que al moverse el avión el ganador
     * cambia solo. Lo que no puede cambiar es la puerta ya asignada.
     */
    const p = new PuertaAsignada<string>();
    const puertas = ["A", "B", "C", "D"];
    let i = 0;
    const elegir = () => puertas[i++ % puertas.length]!;
    expect(p.pedir(true, elegir)).toBe("A");
    for (let n = 0; n < 50; n++) expect(p.pedir(true, elegir)).toBe("A");
  });

  it("pero la provisional sí se sustituye, y una sola vez", () => {
    const p = new PuertaAsignada<string>();
    expect(p.pedir(false, () => "provisional")).toBe("provisional");
    expect(p.enFirme).toBe(null);
    expect(p.pedir(true, () => "la buena")).toBe("la buena");
    expect(p.enFirme).toBe("la buena");
    expect(p.pedir(true, () => "otra más")).toBe("la buena");
  });

  it("y sin arreglo se elegiría cada vez, que es lo que se está evitando", () => {
    // Para que las de arriba no pasen por estar rota la máquina: sin la
    // memoria, cien fotogramas son cien elecciones.
    const elegir = vi.fn(() => "A");
    for (let i = 0; i < 100; i++)
      new PuertaAsignada<string>().pedir(true, elegir);
    expect(elegir).toHaveBeenCalledTimes(100);
  });

  it("irse al aire la olvida: el vuelo siguiente asigna la suya", () => {
    const p = new PuertaAsignada<string>();
    p.pedir(true, () => "A");
    p.olvidar();
    expect(p.enFirme).toBe(null);
    expect(p.pedir(true, () => "B")).toBe("B");
  });

  it("y si no hay ningún puesto, no se da nada por asignado", () => {
    // Un campo sin plataformas no puede dejar la asignación clavada en null y
    // no volver a preguntar nunca.
    const p = new PuertaAsignada<string>();
    expect(p.pedir(true, () => null)).toBe(null);
    expect(p.enFirme).toBe(null);
    expect(p.pedir(true, () => "A")).toBe("A");
  });
});
