/**
 * **Lo que cuesta dibujar el tractor**: cada malla es una llamada de dibujo, y con las
 * piezas sueltas eran treinta y una por tractor —un 14 % más en la escena de Los Rodeos con uno
 * a la vista—. Aquí se mira que sigan juntas y que juntarlas no haya movido nada.
 */
import { describe, expect, it } from "vitest";
import { Box3, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { DibujoDelRemolque } from "./tractor-de-remolque";
import { tractorPara } from "./remolque";

const mallas = (d: DibujoDelRemolque): Mesh[] => {
  const todas: Mesh[] = [];
  d.grupo.traverse((o) => {
    if (o instanceof Mesh) todas.push(o);
  });
  return todas;
};

describe("el dibujo del remolque", () => {
  const medidas = tractorPara(11.5);
  const d = new DibujoDelRemolque(medidas);

  it("cuesta dieciocho llamadas de dibujo, no treinta y una", () => {
    // Tractor: pintura, negro, cristal, faros, pilotos y baliza. Persona: chaleco, bandas,
    // piel, casco y cascos de oír; los cuatro miembros, el pasador con su cinta y el cable.
    expect(mallas(d).length).toBeLessThanOrEqual(18);
  });

  it("y el tractor sigue midiendo lo que mide, con las ruedas en el suelo", () => {
    const tractor = d.grupo.children[0]!;
    const caja = new Box3().setFromObject(tractor);
    const tam = caja.getSize(new Vector3());
    // Las ruedas asoman un poco por los lados, como en el de verdad.
    expect(tam.x).toBeGreaterThanOrEqual(medidas.ancho);
    expect(tam.x).toBeLessThan(medidas.ancho + 0.3);
    expect(tam.z).toBeGreaterThan(medidas.largo - 0.1);
    expect(tam.z).toBeLessThan(medidas.largo + 0.2);
    expect(caja.min.y).toBeCloseTo(0, 2);
  });

  it("y la baliza destella sola, sin llevarse la pintura con ella", () => {
    const ambar = mallas(d).filter(
      (m) => m.material instanceof MeshBasicMaterial && m.material.color.getHex() === 0xff9c2a,
    );
    expect(ambar.length).toBe(1);
    // Las dos balizas en una malla: la del techo y la de la esquina, 2 × 10 lados.
    const caja = new Box3().setFromObject(ambar[0]!);
    expect(caja.getSize(new Vector3()).x).toBeGreaterThan(medidas.ancho * 0.6);
  });

  it("y se suelta entero", () => {
    expect(() => d.quitar()).not.toThrow();
  });
});
