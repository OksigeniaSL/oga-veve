/**
 * La pista de hierba se tiene que encontrar desde el aire: segada, más clara
 * que el pasto, y con sus balizas a la vista desde la final.
 *
 * De un sombreador sin tarjeta gráfica solo se puede mirar el texto, y las
 * averías de sombreador en esta casa han sido siempre de texto. Y de lo que
 * lo monta, que lo monte donde toca.
 */
import { describe, expect, it } from "vitest";
import { Color, InstancedMesh, Mesh, type MeshLambertMaterial } from "three";
import YVYTU from "../../data/aerodromes/yvytu.aero.json";
import { createAerodrome, type Aerodrome } from "./aerodrome";
import {
  GLSL_DEL_MINIMO,
  GLSL_DEL_SEGADO,
  MINIMO_EN_PANTALLA,
  PASADA,
  RAYA,
} from "./pista-de-hierba";
import { potrerosDe } from "./granja";

const aero = YVYTU as unknown as Aerodrome;

/** La luz de un color de tres bytes, de cero a uno, en sRGB. */
function luz(hex: number): number {
  const c = new Color(hex).getRGB({ r: 0, g: 0, b: 0 });
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

describe("la pista de hierba, segada", () => {
  const grupo = createAerodrome(aero);
  const hierba = grupo.getObjectByName("pavimento:grass") as Mesh;

  it("lleva las pasadas de la segadora", () => {
    expect(hierba).toBeTruthy();
    const mat = hierba.material as MeshLambertMaterial;
    expect(mat.customProgramCacheKey()).toBe("pista-segada");
  });

  it("y es más clara que cualquier potrero de la granja", () => {
    // Si no, desde el aire es una raya oscura dentro de un potrero, que es
    // justo lo que se contó.
    const pista = luz((hierba.material as MeshLambertMaterial).color.getHex());
    for (const p of potrerosDe(aero)!.piezas)
      expect(pista, p.nombre).toBeGreaterThan(luz(p.color) * 1.25);
  });

  it("las pasadas van a lo largo, en coordenadas del campo, y se apagan de lejos", () => {
    expect(GLSL_DEL_SEGADO.vertice).toContain("position.xz");
    expect(GLSL_DEL_SEGADO.cuerpo).toContain("dot(vSitioDeLaPista - ejeDeLaPista.xy, ejeDeLaPista.zw)");
    expect(GLSL_DEL_SEGADO.cuerpo).toContain("fwidth");
    expect(GLSL_DEL_SEGADO.cuerpo).toContain("diffuseColor.rgb *=");
    // Una pasada de tractor, y rayas que se notan sin ser un tablero.
    expect(PASADA).toBeGreaterThanOrEqual(2);
    expect(PASADA).toBeLessThanOrEqual(5);
    expect(RAYA).toBeGreaterThan(0.02);
    expect(RAYA).toBeLessThan(0.15);
  });
});

describe("y sus balizas, a la vista desde la final", () => {
  const grupo = createAerodrome(aero);

  it("las del borde, las de la cabecera y los puntos de mira crecen de lejos", () => {
    for (const nombre of ["balizas", "cabeceras", "puntos-de-mira"]) {
      const m = grupo.getObjectByName(nombre) as InstancedMesh;
      expect(m, nombre).toBeTruthy();
      expect(
        (m.material as MeshLambertMaterial).customProgramCacheKey(),
        nombre,
      ).toBe("baliza-que-se-ve-de-lejos");
    }
  });

  it("y siguen siendo tablillas con su luz, no puntos que brillan de noche", () => {
    const m = grupo.getObjectByName("balizas") as InstancedMesh;
    expect((m.material as MeshLambertMaterial).type).toBe("MeshLambertMaterial");
  });

  it("crecen desde el pie y solo lo que falta para no bajar del mínimo", () => {
    expect(GLSL_DEL_MINIMO.vertice).toContain("max(1.0, minimoEnPantalla");
    expect(GLSL_DEL_MINIMO.vertice).toContain("pieDeLaBaliza + (transformed.y - pieDeLaBaliza)");
    expect(GLSL_DEL_MINIMO.vertice).toContain("instanceMatrix");
    // Dos píxeles: se ve y no se funde con la siguiente de la hilera.
    expect(MINIMO_EN_PANTALLA).toBeGreaterThanOrEqual(1.5);
    expect(MINIMO_EN_PANTALLA).toBeLessThanOrEqual(3);
  });
});

describe("y alrededor, la franja segada y lo pisado", () => {
  const pintura = potrerosDe(aero)!;

  /** Si el punto cae dentro del polígono, en coordenadas del campo. */
  const dentroDe = (
    poligono: readonly (readonly [number, number])[],
    x: number,
    z: number,
  ): boolean => {
    let si = false;
    for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
      const [ax, az] = poligono[i]!;
      const [bx, bz] = poligono[j]!;
      if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax)
        si = !si;
    }
    return si;
  };

  it("la franja cubre la pista entera, de cabecera a cabecera", () => {
    const eje = aero.runways[0]!.centerline;
    for (const [x, y] of eje) expect(dentroDe(pintura.franja, x, -y)).toBe(true);
    // Y un poco más allá de cada cabecera.
    const [a, b] = [eje[0]!, eje[eje.length - 1]!];
    const ux = (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
    const uy = (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
    expect(dentroDe(pintura.franja, a[0] - ux * 30, -(a[1] - uy * 30))).toBe(true);
    expect(dentroDe(pintura.franja, b[0] + ux * 30, -(b[1] + uy * 30))).toBe(true);
  });

  it("y la plataforma y las calles van como hierba pisada, con sus puestos", () => {
    expect(pintura.pisado.plataformas.length).toBe(aero.aprons.length);
    expect(pintura.pisado.calles.length).toBe(aero.taxiways.length);
    expect(pintura.pisado.puestos.length).toBe(aero.parkingPositions?.length ?? 0);
  });
});
