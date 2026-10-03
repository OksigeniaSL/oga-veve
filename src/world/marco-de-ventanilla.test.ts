/**
 * El marco de la ventanilla sin pintar: lo que tapa la persiana, dónde caen
 * las de al lado y qué se toca con el dedo.
 *
 * El sombreador no se puede probar sin tarjeta —para eso está
 * `scripts/ver-pasaje.mjs`—, pero las cuentas que hace las repiten estas
 * funciones, y son las que deciden lo que se ve por el cristal y lo que hace
 * un toque.
 */

import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import {
  cortinaDe,
  MarcoDeVentanilla,
  pasoDeVentanillas,
  queSeTocaEnLaPared,
  seVePorLaVentanilla,
} from "./marco-de-ventanilla";
import { asientoAnteVentanilla } from "./asiento-de-pasaje";

const GRADO = Math.PI / 180;

/** El asiento de la derecha del JAZ 90, como lo mide el modelo. */
const asiento = asientoAnteVentanilla(
  {
    centro: { x: 1.49, y: 0.52, z: -1.57 },
    normal: { x: Math.cos(16 * GRADO), y: Math.sin(16 * GRADO), z: 0 },
    ancho: 0.27,
    alto: 0.4,
  },
  "derecha",
);
const avion = { position: new Vector3(0, 3000, 0), orientation: new Quaternion() };

/** La cámara sentada en el asiento, mirando por la ventanilla. */
function sentado(): PerspectiveCamera {
  const c = new PerspectiveCamera(64, 16 / 9, 0.1, 1e5);
  c.position.set(asiento.ojo.x, asiento.ojo.y, asiento.ojo.z).add(avion.position);
  c.quaternion
    .setFromAxisAngle(new Vector3(0, 1, 0), asiento.guinada)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), asiento.cabeceo));
  c.updateMatrixWorld();
  return c;
}

/** Un punto lejano por el centro de la ventanilla, visto desde los ojos. */
const porElCentro = (): Vector3 => {
  const c = asiento.ventanilla.centro;
  const ojo = new Vector3(asiento.ojo.x, asiento.ojo.y, asiento.ojo.z);
  return new Vector3(c.x, c.y, c.z).sub(ojo).normalize().multiplyScalar(20_000).add(ojo).add(avion.position);
};

describe("la persiana", () => {
  const v = asiento.ventanilla;
  it("subida deja asomar su filo, y bajada tapa el cristal entero", () => {
    expect(cortinaDe(v, "persiana", 0)).toBeCloseTo(0.05, 6);
    expect(cortinaDe(v, "persiana", 1)).toBeCloseTo(v.alto, 6);
  });

  it("el cristal que se oscurece no tiene persiana: no tapa nada", () => {
    expect(cortinaDe(v, "electrocromica", 1)).toBe(0);
  });

  it("subida se ve por el centro del cristal; bajada, no", () => {
    const ojo = new Vector3(asiento.ojo.x, asiento.ojo.y, asiento.ojo.z).add(avion.position);
    const p = porElCentro();
    expect(seVePorLaVentanilla(ojo, p, avion, v, cortinaDe(v, "persiana", 0))).toBe(true);
    expect(seVePorLaVentanilla(ojo, p, avion, v, cortinaDe(v, "persiana", 1))).toBe(false);
    // Bajada a medias tapa justo la mitad de arriba: el centro, en el borde.
    expect(seVePorLaVentanilla(ojo, p, avion, v, cortinaDe(v, "persiana", 0.4))).toBe(true);
  });
});

describe("las de al lado", () => {
  it("a un paso de cuaderna: medio metro, y algo más con el cristal grande", () => {
    expect(pasoDeVentanillas(0.27)).toBeCloseTo(0.53, 6);
    expect(pasoDeVentanillas(0.36)).toBeCloseTo(0.61, 6);
  });
});

describe("qué se toca en la pared", () => {
  const camara = sentado();

  it("en el centro de la pantalla, la ventanilla", () => {
    const p = porElCentro().project(camara);
    expect(queSeTocaEnLaPared(camara, p.x, p.y, avion, asiento.ventanilla, "persiana")).toBe(
      "ventanilla",
    );
  });

  it("en la esquina de la pared, nada", () => {
    expect(queSeTocaEnLaPared(camara, -0.95, 0.9, avion, asiento.ventanilla, "persiana")).toBe(
      null,
    );
  });
});

describe("el tinte del cristal", () => {
  it("solo se pinta con el cristal que se oscurece y algo oscurecido", () => {
    const m = new MarcoDeVentanilla();
    m.visible = true;
    const camara = sentado();
    const base = {
      vecinas: { delante: true, detras: true },
      luz: 0.3,
      parpadeo: 0,
    };
    m.poner(camara, avion, asiento, 1, {
      ...base,
      tipoDeVentanilla: "persiana",
      tapan: [1, 1, 1],
    });
    expect(m.cristal.visible, "con persiana no hay tinte").toBe(false);
    m.poner(camara, avion, asiento, 1, {
      ...base,
      tipoDeVentanilla: "electrocromica",
      tapan: [0, 0, 0],
    });
    expect(m.cristal.visible, "todo claro, no se pinta").toBe(false);
    m.poner(camara, avion, asiento, 1, {
      ...base,
      tipoDeVentanilla: "electrocromica",
      tapan: [0, 0.5, 0],
    });
    expect(m.cristal.visible).toBe(true);
    m.visible = false;
    expect(m.cristal.visible, "fuera del pasaje, nada").toBe(false);
    m.dispose();
  });
});
