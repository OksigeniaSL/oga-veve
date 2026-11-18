/**
 * **La escala de la senda en la pantalla de navegación de la cabina en 3D**
 * (ADR 0030, H26j): la misma que el HSI del cuadro plano, en el mismo sitio y
 * con el mismo punto.
 */
import { describe, expect, it } from "vitest";
import { escalaDeLaSendaEnLaRosa } from "./pantallas-cabina";
import type { LaRadioPintada } from "../ui/radio-en-la-rosa";

const TEXTOS: LaRadioPintada["textos"] = {
  navId: "LOC IFV",
  navMhz: "109.50",
  crs: "CRS 005",
  dme: "",
  adfId: "",
  adfKhz: "",
  crsCifra: "005",
  navIdent: "IFV",
  adfIdent: "",
};
const conLaSenda = (senda: number | null, bandera = false): LaRadioPintada => ({
  adf: null,
  curso: 5,
  barra: 0,
  toFrom: "TO",
  bandera: false,
  senda,
  conSenda: true,
  banderaSenda: bandera,
  textos: TEXTOS,
});

describe("la escala de la senda en la pantalla de navegación de la cabina", () => {
  // La rosa de la pantalla de un cristal: centro, radio, la franja de motor a la izquierda.
  const cx = 600;
  const cy = 300;
  const r = 200;
  const izquierda = 208;
  const ancho = 784;

  it("a la derecha de la rosa, a su radio y dieciséis más, con el punto del cuadro plano", () => {
    const e = escalaDeLaSendaEnLaRosa(conLaSenda(0), cx, cy, r, izquierda, ancho)!;
    expect(e.x).toBe(cx + r + 16);
    expect(e.y).toBe(cy);
    expect(e.punto).toBeCloseTo(r * 0.17, 9);
    expect(e.rombo).toBe(0);
  });

  it("pegada al borde si no cabe", () => {
    const e = escalaDeLaSendaEnLaRosa(conLaSenda(0), cx, cy, r, izquierda, cx - izquierda + r)!;
    expect(e.x).toBe(cx + r - 14);
  });

  it("el rombo baja cuando se va alto: a fondo, dos puntos", () => {
    const e = escalaDeLaSendaEnLaRosa(conLaSenda(1), cx, cy, r, izquierda, ancho)!;
    expect(e.rombo).toBeCloseTo(2 * e.punto, 9);
    expect(escalaDeLaSendaEnLaRosa(conLaSenda(-0.5), cx, cy, r, izquierda, ancho)!.rombo).toBeCloseTo(-e.punto, 9);
  });

  it("con la bandera GS, la escala y la bandera, sin rombo", () => {
    const e = escalaDeLaSendaEnLaRosa(conLaSenda(null, true), cx, cy, r, izquierda, ancho)!;
    expect(e.rombo).toBeNull();
    expect(e.bandera).toBe(true);
  });

  it("con un VOR, o sin NAV, no hay escala", () => {
    expect(escalaDeLaSendaEnLaRosa({ ...conLaSenda(null), conSenda: false }, cx, cy, r, izquierda, ancho)).toBeNull();
  });
});
