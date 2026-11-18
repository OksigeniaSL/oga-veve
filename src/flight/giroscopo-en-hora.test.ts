/**
 * «Poné en hora el giróscopo», volado en la mesa con un piloto de cinemática,
 * la brújula de verdad (`brujula.ts`) y el direccional de verdad
 * (`direccional.ts`), en un campo de cada hemisferio: el direccional se va
 * hacia un lado en Tenerife Norte y hacia el otro en Asunción, y se pone con
 * la perilla. Ver `giroscopo-en-hora.ts`.
 */

import { describe, expect, it } from "vitest";
import { Brujula, centrado, vuelta, type Orientacion } from "./brujula";
import { inclinacionDelCampo } from "./brujula-que-baila";
import { Direccional, derivaDelDireccional } from "./direccional";
import {
  CUADRA,
  GiroscopoEnHora,
  RUMBO_DEL_GIROSCOPO,
  SE_FUE,
  TARDA_EN_IRSE,
  dondeSeVaElGiroscopo,
  type SucesoDelGiroscopo,
} from "./giroscopo-en-hora";
import { ejercicioPorId, seOfrece } from "./ejercicios";
import { ARAI, JAZ_50, MAINUMBY, PANAMBI, PYKASU } from "./aircraft";

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

const ejercicio = ejercicioPorId("giroscopo")!;

/**
 * **Un vuelo entero**: derecho al norte; al pedirlo, la perilla una muesca
 * cada cuarto de segundo hacia la brújula. Con `virandoAlPoner`, se gira la
 * perilla virando con quince grados de alabeo durante seis segundos, y
 * después derecho.
 */
function volar(o: {
  readonly lat: number;
  readonly oaci: string;
  readonly variacion: number;
  readonly modelo?: string;
  readonly pone?: boolean;
  readonly virandoAlPoner?: boolean;
}) {
  const b = new Brujula(inclinacionDelCampo(o.oaci)!);
  const d = new Direccional();
  const deriva = derivaDelDireccional(o.lat, o.modelo ?? "jaz-20");
  const e = new GiroscopoEnHora(ejercicio, deriva);
  const V = 51.4;
  const dt = 1 / 60;
  let verdadero = vuelta(RUMBO_DEL_GIROSCOPO - o.variacion);
  let alabeo = 0;
  let pedido = -1;
  let ultimaMuesca = 0;
  let masIdo = 0;
  const sucesos: (SucesoDelGiroscopo & { readonly t: number })[] = [];
  for (let t = 0; t < 240 && e.fase !== "cerrada"; t += dt) {
    const virando = o.virandoAlPoner && pedido >= 0 && t - pedido < 6;
    alabeo = virando ? Math.min(15, alabeo + 10 * dt) : Math.max(0, alabeo - 10 * dt);
    verdadero = vuelta(verdadero + ((G * Math.tan(alabeo * GRADO)) / V / GRADO) * dt);
    const q = avion(verdadero, alabeo);
    const brujula = b.paso(
      { orientacion: q, velocidad: { x: V * Math.sin(verdadero * GRADO), y: 0, z: -V * Math.cos(verdadero * GRADO) }, variacion: o.variacion },
      dt,
    );
    d.paso(deriva, dt, e.apuro);
    const magnetico = vuelta(verdadero + o.variacion);
    masIdo = Math.max(masIdo, Math.abs(d.error));
    let girando = false;
    if ((o.pone ?? true) && pedido >= 0 && t - ultimaMuesca >= 0.25) {
      const falta = centrado(brujula - d.marca(magnetico));
      if (Math.abs(falta) > 0.5) {
        d.girar(Math.sign(falta));
        ultimaMuesca = t;
        girando = true;
      }
    }
    for (const s of e.paso(
      { brujula, direccional: d.marca(magnetico), magnetico, alabeo, girando, enElSuelo: false, parado: false, percance: false },
      dt,
    )) {
      sucesos.push({ ...s, t });
      if (s.que === "ponelo") pedido = t;
    }
  }
  return { e, d, sucesos, que: sucesos.map((s) => s.que), masIdo };
}

describe("dónde se ofrece", () => {
  it("en todos los campos de hoy, al norte y al sur; no fuera del mundo", () => {
    for (const oaci of ["GCXO", "GCLP", "GCRR", "SGAS", "SGME"]) expect(dondeSeVaElGiroscopo(oaci)).toBe(true);
    expect(dondeSeVaElGiroscopo(null)).toBe(false);
    expect(dondeSeVaElGiroscopo("ZZZZ")).toBe(false);
  });

  it("desde Taguató, en los de esferas con brújula en el parabrisas; no en Tukã ni en los de cristal", () => {
    for (const a of [PYKASU, MAINUMBY, PANAMBI]) {
      expect(seOfrece(ejercicio, "taguato", a, "GCXO")).toBe(true);
      expect(seOfrece(ejercicio, "taguato-ruvicha", a, "SGAS")).toBe(true);
      expect(seOfrece(ejercicio, "tuka", a, "SGAS")).toBe(false);
      expect(seOfrece(ejercicio, "guyrami", a, "SGAS")).toBe(false);
    }
    expect(seOfrece(ejercicio, "taguato", ARAI, "GCXO")).toBe(false);
    expect(seOfrece(ejercicio, "taguato", JAZ_50, "GCXO")).toBe(false);
  });
});

describe("volado", () => {
  it("en Tenerife Norte: presenta, apura, el direccional se va hacia los números que bajan, se pide la perilla y se pone", () => {
    const { e, d, sucesos, que, masIdo } = volar({ lat: 28.48, oaci: "GCXO", variacion: 4 });
    expect(que).toEqual(["presentar", "apurar", "seFue", "ponelo", "puesto", "cerrar"]);
    const seFue = sucesos.find((s) => s.que === "seFue")!;
    expect(seFue.que === "seFue" && seFue.cuanto).toBeLessThan(-SE_FUE + 1);
    expect(masIdo).toBeGreaterThan(SE_FUE - 1);
    // Lo que tardó en irse con el reloj apurado, s: los cuarenta, con lo que se presenta antes.
    const apurar = sucesos.find((s) => s.que === "apurar")!;
    expect(seFue.t - apurar.t).toBeGreaterThan(TARDA_EN_IRSE - 1);
    expect(seFue.t - apurar.t).toBeLessThan(TARDA_EN_IRSE + 1);
    // Los minutos de verdad que se apuraron: una hora o algo más.
    expect(apurar.que === "apurar" && apurar.minutos).toBeGreaterThan(50);
    expect(e.cierre).toBe("hecho");
    // Puesto con la brújula derecha y quieta, queda a menos de `CUADRA` del de verdad.
    expect(Math.abs(e.queda!)).toBeLessThanOrEqual(CUADRA);
    expect(Math.abs(d.error)).toBeLessThanOrEqual(CUADRA);
    // Y con el ejercicio cerrado, el reloj vuelve a su paso.
    expect(e.apuro).toBe(1);
  });

  it("en Asunción, al revés: el direccional se va hacia los números que suben", () => {
    const { e, sucesos, que } = volar({ lat: -25.24, oaci: "SGAS", variacion: -16 });
    expect(que).toEqual(["presentar", "apurar", "seFue", "ponelo", "puesto", "cerrar"]);
    const seFue = sucesos.find((s) => s.que === "seFue")!;
    expect(seFue.que === "seFue" && seFue.cuanto).toBeGreaterThan(SE_FUE - 1);
    expect(e.cierre).toBe("hecho");
  });

  it("un suceso, una voz: la perilla se pide después de decir que se fue", () => {
    const { sucesos } = volar({ lat: 28.48, oaci: "GCXO", variacion: 4 });
    const seFue = sucesos.find((s) => s.que === "seFue")!;
    const ponelo = sucesos.find((s) => s.que === "ponelo")!;
    expect(ponelo.t - seFue.t).toBeGreaterThan(5);
  });

  it("girando la perilla virando, la brújula miente: se dice una vez, y se cierra al ponerlo derecho", () => {
    const { e, que } = volar({ lat: 28.48, oaci: "GCXO", variacion: 4, virandoAlPoner: true });
    expect(que.filter((q) => q === "virando")).toHaveLength(1);
    expect(que.indexOf("virando")).toBeLessThan(que.indexOf("puesto"));
    expect(e.cierre).toBe("hecho");
    expect(Math.abs(e.queda!)).toBeLessThanOrEqual(CUADRA + 1);
  });

  it("sin girar la perilla no pasa nada: ni se cierra ni se castiga", () => {
    const { e, que } = volar({ lat: 28.48, oaci: "GCXO", variacion: 4, pone: false });
    expect(que).toEqual(["presentar", "apurar", "seFue", "ponelo"]);
    expect(e.fase).toBe("ponerlo");
    expect(e.apuro).toBe(1);
  });

  it("con un percance se cierra para otra vez, y reiniciar lo deja como al principio", () => {
    const e = new GiroscopoEnHora(ejercicio, -7);
    const lectura = { brujula: 0, direccional: 0, magnetico: 0, alabeo: 0, girando: false, enElSuelo: false, parado: false };
    const s = e.paso({ ...lectura, percance: true }, 1 / 60);
    expect(s.map((x) => x.que)).toEqual(["presentar", "cerrar"]);
    expect(e.cierre).toBe("otraVez");
    e.reiniciar();
    expect(e.fase).toBe("derecho");
    expect(e.paso({ ...lectura, percance: false }, 1 / 60).map((x) => x.que)).toEqual(["presentar"]);
  });
});
