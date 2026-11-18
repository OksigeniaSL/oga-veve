/**
 * «La brújula baila», volado en la mesa con un piloto de cinemática y la
 * brújula de verdad (`brujula.ts`), en un campo de cada hemisferio: en
 * Tenerife Norte se atrasa y en Asunción se adelanta, y en los dos baila al
 * salir y se queda quieta. Ver `brujula-que-baila.ts`.
 */

import { describe, expect, it } from "vitest";
import { Brujula, centrado, vuelta, type Orientacion } from "./brujula";
import { BrujulaQueBaila, RUMBO_DE_SALIDA, RUMBO_PEDIDO, inclinacionDelCampo, type SucesoDeLaBrujula } from "./brujula-que-baila";
import { ejercicioPorId, seOfrece } from "./ejercicios";
import { ARAI, MAINUMBY, PANAMBI, PYKASU } from "./aircraft";

const GRADO = Math.PI / 180;
const G = 9.80665;

function mult(a: Orientacion, b: Orientacion): Orientacion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

function avion(rumbo: number, alabeo: number): Orientacion {
  const y = (-rumbo * GRADO) / 2;
  const r = (-alabeo * GRADO) / 2;
  return mult({ w: Math.cos(y), x: 0, y: Math.sin(y), z: 0 }, { w: Math.cos(r), x: 0, y: 0, z: Math.sin(r) });
}

const ejercicio = ejercicioPorId("brujula")!;

/**
 * **Un vuelo entero**: derecho al oeste, y al pedirlo, un viraje coordinado a
 * la derecha con `alabeo` grados hasta el norte del direccional, saliendo a
 * diez grados por segundo. Con la variación del sitio, que no cambia nada:
 * se lee en magnético.
 */
function volar(o: { readonly inclinacion: number; readonly variacion: number; readonly alabeo?: number; readonly vira?: boolean }) {
  const b = new Brujula(o.inclinacion);
  const e = new BrujulaQueBaila(ejercicio, o.inclinacion);
  const V = 51.4;
  const dt = 1 / 60;
  let verdadero = vuelta(RUMBO_DE_SALIDA - o.variacion);
  let alabeo = 0;
  let pedido = false;
  let saliendo = false;
  const sucesos: (SucesoDeLaBrujula & { readonly t: number })[] = [];
  for (let t = 0; t < 120 && e.fase !== "cerrada"; t += dt) {
    const magnetico = vuelta(verdadero + o.variacion);
    if (pedido && (o.vira ?? true)) {
      if (!saliendo && Math.abs(centrado(RUMBO_PEDIDO - magnetico)) < 6) saliendo = true;
      alabeo = saliendo ? Math.max(0, alabeo - 10 * dt) : Math.min(o.alabeo ?? 20, alabeo + 10 * dt);
    }
    verdadero = vuelta(verdadero + ((G * Math.tan(alabeo * GRADO)) / V / GRADO) * dt);
    const q = avion(verdadero, alabeo);
    const marca = b.paso(
      { orientacion: q, velocidad: { x: V * Math.sin(verdadero * GRADO), y: 0, z: -V * Math.cos(verdadero * GRADO) }, variacion: o.variacion },
      dt,
    );
    for (const s of e.paso(
      { brujula: marca, direccional: vuelta(verdadero + o.variacion), alabeo, enElSuelo: false, parado: false, percance: false },
      dt,
    )) {
      sucesos.push({ ...s, t });
      if (s.que === "virar") pedido = true;
    }
  }
  return { e, sucesos, que: sucesos.map((s) => s.que) };
}

describe("dónde se ofrece", () => {
  it("la inclinación de cada campo, del WMM2025: abajo en Canarias, arriba en Paraguay", () => {
    expect(inclinacionDelCampo("GCXO")).toBeGreaterThan(35);
    expect(inclinacionDelCampo("GCLP")).toBeGreaterThan(34);
    expect(inclinacionDelCampo("SGAS")).toBeLessThan(-31);
    expect(inclinacionDelCampo("SGME")).toBeLessThan(-25);
    expect(inclinacionDelCampo(null)).toBeNull();
    expect(inclinacionDelCampo("ZZZZ")).toBeNull();
  });

  it("en los que llevan brújula en el parabrisas, desde Tukã, en un campo de cada hemisferio", () => {
    for (const a of [PYKASU, MAINUMBY, PANAMBI]) {
      expect(seOfrece(ejercicio, "tuka", a, "GCXO")).toBe(true);
      expect(seOfrece(ejercicio, "taguato", a, "SGAS")).toBe(true);
      expect(seOfrece(ejercicio, "guyrami", a, "SGAS")).toBe(false);
    }
    // El reactor no la lleva en su cabina de aquí.
    expect(seOfrece(ejercicio, "tuka", ARAI, "GCXO")).toBe(false);
  });
});

describe("volado", () => {
  it("en Tenerife Norte: presenta, pide el norte, la brújula se atrasa, baila al salir y se queda quieta", () => {
    const { e, sucesos, que } = volar({ inclinacion: inclinacionDelCampo("GCXO")!, variacion: 4 });
    expect(que).toEqual(["presentar", "virar", "miente", "baila", "quieta", "cerrar"]);
    const miente = sucesos.find((s) => s.que === "miente");
    expect(miente && miente.que === "miente" && miente.como).toBe("seAtrasa");
    expect(e.cierre).toBe("hecho");
    // Virando a la derecha y atrasada: marcaba a la izquierda del direccional, más de ocho grados.
    expect(e.mentiraMasGrande).toBeLessThan(-8);
    expect(e.bailoHasta).toBeGreaterThan(2);
  });

  it("en Asunción, al revés: la brújula se adelanta", () => {
    const { e, sucesos, que } = volar({ inclinacion: inclinacionDelCampo("SGAS")!, variacion: 16 });
    expect(que).toEqual(["presentar", "virar", "miente", "baila", "quieta", "cerrar"]);
    const miente = sucesos.find((s) => s.que === "miente");
    expect(miente && miente.que === "miente" && miente.como).toBe("seAdelanta");
    expect(e.mentiraMasGrande).toBeGreaterThan(8);
    expect(e.cierre).toBe("hecho");
  });

  it("un suceso, una voz: el baile se deja mirar antes de decir que se quedó quieta", () => {
    const { sucesos } = volar({ inclinacion: inclinacionDelCampo("GCXO")!, variacion: 4 });
    const baila = sucesos.find((s) => s.que === "baila")!;
    const quieta = sucesos.find((s) => s.que === "quieta")!;
    expect(quieta.t - baila.t).toBeGreaterThan(5);
  });

  it("con poco alabeo miente poco, y se cierra igual", () => {
    const { e, que } = volar({ inclinacion: inclinacionDelCampo("GCXO")!, variacion: 4, alabeo: 7 });
    expect(que[0]).toBe("presentar");
    expect(que).toContain("quieta");
    expect(e.cierre).toBe("hecho");
  });

  it("sin virar no pasa nada: ni miente ni se cierra", () => {
    const { e, que } = volar({ inclinacion: inclinacionDelCampo("SGAS")!, variacion: 16, vira: false });
    expect(que).toEqual(["presentar", "virar"]);
    expect(e.fase).toBe("virando");
  });

  it("con un percance se cierra para otra vez", () => {
    const e = new BrujulaQueBaila(ejercicio, 36);
    const s = e.paso({ brujula: 270, direccional: 270, alabeo: 0, enElSuelo: false, parado: false, percance: true }, 1 / 60);
    expect(s.map((x) => x.que)).toEqual(["presentar", "cerrar"]);
    expect(e.cierre).toBe("otraVez");
  });
});
