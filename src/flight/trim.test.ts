/**
 * El compensador: el mando que faltaba para volar nivelado.
 *
 * Contado jugando con el de fuselaje ancho: «cuando uso las teclas de flecha
 * el avión no tiene *stops*: o bajo o subo, pero no me deja marcar pequeños
 * pasos, y eso impide que pueda mantener el avión estable… entiendo que debo
 * tener un mando para decidir si a cualquier velocidad puedo mantener el
 * avión a una altitud fija».
 *
 * Y es exactamente eso. Lo que se comprueba aquí es lo que lo distingue del
 * cabeceo: **que no vuelve al centro**, y que con él puesto el avión se queda
 * donde lo dejaste en vez de caer o de subirse.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { ArcadeFlightModel } from "./arcade";
import { ARAI, PYKASU } from "./aircraft";
import { neutralControls } from "./model";

const DT = 1 / 60;

function enElAire(velocidad: number, alto = 2000): CoefficientFlightModel {
  const m = new CoefficientFlightModel({
    aircraft: ARAI,
    ground: () => 0,
    assist: 0,
  });
  m.reset({ position: new Vector3(0, alto, 0), heading: 0, airspeed: velocidad });
  return m;
}

/** Vuela `segundos` con estos mandos y devuelve cuánto ha subido o bajado. */
function volar(
  m: CoefficientFlightModel,
  segundos: number,
  mandos: Partial<ReturnType<typeof neutralControls>> = {},
): number {
  const y0 = m.state.position.y;
  for (let k = 0; k < Math.round(segundos / DT); k++) {
    m.step(DT, { ...neutralControls(), engineOn: true, throttle: 0.6, ...mandos });
  }
  return m.state.position.y - y0;
}

describe("el compensador manda en el timón", () => {
  it("con el compensador al morro arriba, el avión sube", () => {
    const m = enElAire(ARAI.cruiseSpeed * 0.8);
    expect(volar(m, 20, { trim: 0.35 })).toBeGreaterThan(0);
  });

  it("y al morro abajo, baja", () => {
    const m = enElAire(ARAI.cruiseSpeed * 0.8);
    expect(volar(m, 20, { trim: -0.35 })).toBeLessThan(0);
  });

  it("y suelto y sin compensar hace lo suyo, que no es lo mismo", () => {
    /*
     * Ésta es la comprobación que de verdad importa: **el compensador cambia
     * el vuelo con la palanca en el centro**. Si no lo hiciera, seguiría sin
     * haber manera de mantener una altitud sin tener una tecla apretada.
     */
    const suelto = volar(enElAire(ARAI.cruiseSpeed * 0.8), 20);
    const compensado = volar(enElAire(ARAI.cruiseSpeed * 0.8), 20, {
      trim: 0.35,
    });
    expect(Math.abs(compensado - suelto)).toBeGreaterThan(20);
  });

  it("y se suma al mando en vez de sustituirlo", () => {
    // Tirar con el compensador puesto tiene que dar más que tirar a secas.
    const soloMando = volar(enElAire(ARAI.cruiseSpeed * 0.8), 12, {
      elevator: 0.2,
    });
    const conAmbos = volar(enElAire(ARAI.cruiseSpeed * 0.8), 12, {
      elevator: 0.2,
      trim: 0.3,
    });
    expect(conAmbos).toBeGreaterThan(soloMando);
  });

  it("y el timón tiene topes: pasado el tope no da más", () => {
    // Con el compensador al final del recorrido, tirar más no puede añadir
    // nada. Un timón es una superficie, no un deseo.
    const aTope = volar(enElAire(ARAI.cruiseSpeed * 0.8), 12, { trim: 1 });
    const masAlla = volar(enElAire(ARAI.cruiseSpeed * 0.8), 12, {
      trim: 1,
      elevator: 1,
    });
    expect(masAlla).toBeCloseTo(aTope, 0);
  });
});

describe("y el modelo sencillo no lo usa", () => {
  /*
   * En Guyrami el cabeceo no es un timón: es directamente cuánto sube el
   * avión, y el avión ya se sostiene solo. Un compensador allí no compensaría
   * nada, y lo que haría es dejar a un crío de cuatro años con el morro
   * clavado arriba sin saber por qué.
   */
  it("el compensador no mueve el avión en el peldaño de los pequeños", () => {
    const con = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
    const sin = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
    for (const m of [con, sin])
      m.reset({
        position: new Vector3(0, 800, 0),
        heading: 0,
        airspeed: PYKASU.cruiseSpeed * 0.7,
      });
    for (let k = 0; k < Math.round(20 / DT); k++) {
      con.step(DT, { ...neutralControls(), engineOn: true, throttle: 0.7, trim: 1 });
      sin.step(DT, { ...neutralControls(), engineOn: true, throttle: 0.7 });
    }
    expect(con.state.position.y).toBeCloseTo(sin.state.position.y, 3);
  });
});

describe("y con la ayuda del peldaño, el toque también se queda", () => {
  /*
   * En los peldaños con ayuda, el compensador automático sostiene la subida
   * que había al soltar, y un toque de flecha —dos centésimas de
   * compensador— se lo comía entero: el avión seguía donde la ayuda quería.
   * Y la ayuda no sostiene nunca una bajada, así que «si lo pongo a bajar,
   * que lo deje fijo» era justo lo que no pasaba. Ver
   * `SUBIDA_POR_COMPENSADOR` en `fdm.ts`.
   */
  function conAyuda(): CoefficientFlightModel {
    const m = new CoefficientFlightModel({
      aircraft: ARAI,
      ground: () => 0,
      assist: 1,
    });
    m.reset({ position: new Vector3(0, 3000, 0), heading: 0, airspeed: 100 });
    return m;
  }

  /** Vuela con toques de compensador cada medio segundo y mide la bajada. */
  function conToques(toques: number, paso: number): number {
    const m = conAyuda();
    let trim = 0;
    const mandos = () => ({
      ...neutralControls(),
      engineOn: true,
      throttle: 0.35,
      trim,
    });
    for (let k = 0; k < Math.round(8 / DT); k++) m.step(DT, mandos());
    for (let i = 0; i < toques; i++) {
      trim += paso;
      for (let k = 0; k < Math.round(0.5 / DT); k++) m.step(DT, mandos());
    }
    for (let k = 0; k < Math.round(10 / DT); k++) m.step(DT, mandos());
    let vs = 0;
    const n = Math.round(10 / DT);
    for (let k = 0; k < n; k++) {
      m.step(DT, mandos());
      vs += m.state.verticalSpeed / n;
    }
    return vs;
  }

  it("cinco toques morro abajo dejan el avión bajando, y bajando se queda", () => {
    const sinTocar = conToques(0, 0);
    const bajando = conToques(5, -0.02);
    // Medio metro por segundo por toque, y la ayuda lo sostiene.
    expect(bajando).toBeLessThan(-1.5);
    expect(bajando).toBeLessThan(sinTocar - 1.5);
  });

  it("y cinco morro arriba, subiendo", () => {
    expect(conToques(5, 0.02)).toBeGreaterThan(conToques(0, 0) + 1.5);
  });

  it("un salto grande del compensador no es nadie tocándolo", () => {
    // El automático, al soltarse, deja su timón en el compensador de golpe:
    // eso no pide ninguna subida. Un solo salto de 0,1 no mueve lo sostenido.
    const salto = conToques(1, 0.1);
    const toques = conToques(5, 0.02);
    expect(salto).toBeLessThan(toques);
  });
});
