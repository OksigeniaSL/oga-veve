/**
 * La brújula del parabrisas, en la mesa y en los dos hemisferios: lo que
 * marca contra la regla de cada uno. Ver `brujula.ts`.
 *
 * Las reglas, como las dan los manuales del norte (FAA-H-8083-25C, cap. 8):
 * virando desde el norte la brújula se atrasa —al principio marca el viraje al
 * revés— y desde el sur se adelanta; en rumbo este u oeste, acelerando marca
 * hacia el norte y frenando hacia el sur (ANDS). En el sur magnético, las
 * cuatro al revés. Las inclinaciones son las del WMM2025 en cada campo.
 */

import { describe, expect, it } from "vitest";
import { Brujula, INCLINA_COMO_MUCHO, arribaDelFlotador, centrado, marcaQuieta, rumboDelMorro, vuelta, type Orientacion } from "./brujula";
import { bankAngleOf } from "../ui/actitud";
import { anoDecimal, inclinacion } from "../ui/carta/declinacion";

const GRADO = Math.PI / 180;
const G = 9.80665;
const ANO = anoDecimal(new Date(Date.UTC(2026, 10, 18)));
/** Tenerife Norte y Asunción. */
const CANARIAS = inclinacion(28.4827, -16.3417, ANO);
const ASUNCION = inclinacion(-25.240156, -57.519227, ANO);

function mult(a: Orientacion, b: Orientacion): Orientacion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

/** El avión con su rumbo verdadero y su alabeo (positivo, ala derecha abajo), grados. */
function avion(rumbo: number, alabeo = 0): Orientacion {
  const y = (-rumbo * GRADO) / 2;
  const r = (-alabeo * GRADO) / 2;
  return mult({ w: Math.cos(y), x: 0, y: Math.sin(y), z: 0 }, { w: Math.cos(r), x: 0, y: 0, z: Math.sin(r) });
}

/** El eje vertical del avión: la gravedad aparente de un viraje coordinado. */
function techo(q: Orientacion): [number, number, number] {
  // (0, 1, 0) girado.
  const { x, y, z, w } = q;
  return [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)];
}

/** Lo que se aparta la marca del rumbo magnético, grados: positivo, la brújula marca más a la derecha. */
const error = (marca: number, rumbo: number): number => centrado(marca - rumbo);

describe("la brújula, quieta y derecha", () => {
  it("la inclinación de cada campo es la del WMM2025: abajo en Canarias, arriba en Asunción", () => {
    expect(CANARIAS).toBeGreaterThan(35);
    expect(ASUNCION).toBeLessThan(-31);
  });

  it("el avión de prueba es el del modelo: el rumbo por el morro y el alabeo con el ala derecha abajo", () => {
    expect(rumboDelMorro(avion(30))).toBeCloseTo(30, 6);
    expect(bankAngleOf(avion(30, 20)) / GRADO).toBeCloseTo(20, 6);
  });

  it("derecha y sin acelerar marca el magnético, en los dos hemisferios y con la variación de cada sitio", () => {
    for (const inc of [CANARIAS, ASUNCION])
      for (const [rumbo, variacion] of [
        [0, 4],
        [90, 16],
        [200, -3],
        [315, 13],
      ] as const) {
        const q = avion(rumbo);
        expect(error(marcaQuieta(q, [0, 1, 0], inc, variacion), vuelta(rumbo + variacion))).toBeCloseTo(0, 6);
      }
  });
});

describe("el error de viraje, contra la regla de cada hemisferio", () => {
  /** El rumbo verdadero que da un magnético, con variación cero para leer directo. */
  const enViraje = (rumbo: number, alabeo: number, inc: number): number => {
    const q = avion(rumbo, alabeo);
    return error(marcaQuieta(q, techo(q), inc, 0), rumbo);
  };

  it("en Canarias, virando desde el norte se atrasa —marca el viraje al revés— y desde el sur se adelanta", () => {
    // Virando a la derecha (alabeo positivo): atrasarse es marcar menos.
    expect(enViraje(0, 20, CANARIAS)).toBeLessThan(-10);
    expect(enViraje(180, 20, CANARIAS)).toBeGreaterThan(10);
    // Y a la izquierda, lo mismo de espejo.
    expect(enViraje(0, -20, CANARIAS)).toBeGreaterThan(10);
    expect(enViraje(180, -20, CANARIAS)).toBeLessThan(-10);
  });

  it("en Asunción, al revés: desde el norte se adelanta y desde el sur se atrasa", () => {
    expect(enViraje(0, 20, ASUNCION)).toBeGreaterThan(10);
    expect(enViraje(180, 20, ASUNCION)).toBeLessThan(-10);
    expect(enViraje(0, -20, ASUNCION)).toBeLessThan(-10);
  });

  it("y en este u oeste, virando no se aparta: el error de viraje es del norte y del sur", () => {
    for (const inc of [CANARIAS, ASUNCION]) {
      expect(Math.abs(enViraje(90, 20, inc))).toBeLessThan(0.5);
      expect(Math.abs(enViraje(270, -20, inc))).toBeLessThan(0.5);
    }
  });

  it("crece con el alabeo y con la inclinación: a 15° en Canarias, unos once grados en el norte", () => {
    const a15 = Math.abs(enViraje(0, 15, CANARIAS));
    expect(a15).toBeGreaterThan(9);
    expect(a15).toBeLessThan(13);
    expect(Math.abs(enViraje(0, 30, CANARIAS))).toBeGreaterThan(a15);
    // En Asunción el campo está menos inclinado: algo menos.
    expect(Math.abs(enViraje(0, 15, ASUNCION))).toBeLessThan(a15);
  });
});

describe("el error de aceleración, contra la regla de cada hemisferio", () => {
  /** Acelerando `k` g hacia delante con el morro en `rumbo`: la gravedad aparente se va hacia el morro. */
  const acelerando = (rumbo: number, k: number, inc: number): number => {
    const q = avion(rumbo);
    const m = [Math.sin(rumbo * GRADO), 0, -Math.cos(rumbo * GRADO)];
    return error(marcaQuieta(q, [k * m[0]!, 1, k * m[2]!], inc, 0), rumbo);
  };

  it("en Canarias, ANDS: al este, acelerando marca hacia el norte y frenando hacia el sur", () => {
    expect(acelerando(90, 0.1, CANARIAS)).toBeLessThan(-2);
    expect(acelerando(90, -0.1, CANARIAS)).toBeGreaterThan(2);
    // Al oeste, el norte está a la derecha.
    expect(acelerando(270, 0.1, CANARIAS)).toBeGreaterThan(2);
  });

  it("en Asunción, al revés: acelerando hacia el sur, frenando hacia el norte", () => {
    expect(acelerando(90, 0.1, ASUNCION)).toBeGreaterThan(2);
    expect(acelerando(90, -0.1, ASUNCION)).toBeLessThan(-2);
    expect(acelerando(270, 0.1, ASUNCION)).toBeLessThan(-2);
  });

  it("y al norte o al sur, acelerando no se aparta", () => {
    for (const inc of [CANARIAS, ASUNCION]) {
      expect(Math.abs(acelerando(0, 0.1, inc))).toBeLessThan(0.1);
      expect(Math.abs(acelerando(180, -0.1, inc))).toBeLessThan(0.1);
    }
  });
});

describe("el flotador tiene tope", () => {
  it(`con la gravedad aparente a más de ${INCLINA_COMO_MUCHO}° de la caja se queda en el tope`, () => {
    const q = avion(0);
    const u = arribaDelFlotador(q, [Math.tan(40 * GRADO), 1, 0]);
    expect(Math.acos(u[1]) / GRADO).toBeCloseTo(INCLINA_COMO_MUCHO, 6);
    const libre = arribaDelFlotador(q, [Math.tan(10 * GRADO), 1, 0]);
    expect(Math.acos(libre[1]) / GRADO).toBeCloseTo(10, 6);
  });
});

/**
 * **Un viraje volado**: del oeste al norte a la derecha, coordinado, a 100
 * nudos y 20° de alabeo, y la salida en el norte. Paso de sesenta por segundo,
 * como el juego.
 */
function viraje(inc: number): {
  readonly enElViraje: number;
  readonly pasaDeLargo: number;
  readonly cruces: number;
  readonly quietaA: number;
} {
  const b = new Brujula(inc);
  const V = 51.4;
  const dt = 1 / 60;
  let rumbo = 270;
  let alabeo = 0;
  let enElViraje = 0;
  let pasaDeLargo = 0;
  let cruces = 0;
  let antes = 0;
  let quietaA = Infinity;
  let salida: number | null = null;
  for (let t = 0; t < 70; t += dt) {
    // Diez segundos derecho, se alabea en dos, se vira hasta el norte y se sale en dos.
    const falta = centrado(360 - rumbo);
    if (t > 10 && salida === null) alabeo = Math.min(20, alabeo + 10 * dt);
    if (salida === null && t > 10 && falta < 8) salida = t;
    if (salida !== null) alabeo = Math.max(0, alabeo - 10 * dt);
    rumbo = vuelta(rumbo + ((G * Math.tan(alabeo * GRADO)) / V / GRADO) * dt);
    const q = avion(rumbo, alabeo);
    const v = { x: V * Math.sin(rumbo * GRADO), y: 0, z: -V * Math.cos(rumbo * GRADO) };
    const marca = b.paso({ orientacion: q, velocidad: v, variacion: 0 }, dt);
    const e = error(marca, rumbo);
    if (salida === null && t > 10) enElViraje = Math.max(enElViraje, Math.abs(e));
    if (salida !== null && alabeo === 0) {
      if (Math.sign(e) !== Math.sign(antes) && antes !== 0) cruces++;
      if (cruces > 0) pasaDeLargo = Math.max(pasaDeLargo, Math.abs(e));
      if (Math.abs(e) > 1) quietaA = Infinity;
      else if (quietaA === Infinity) quietaA = t - salida;
      antes = e;
    }
    if (salida === null) antes = e;
  }
  return { enElViraje, pasaDeLargo, cruces, quietaA };
}

describe("y volando: miente en el viraje y baila al salir", () => {
  for (const [sitio, inc] of [
    ["Canarias", CANARIAS],
    ["Asunción", ASUNCION],
  ] as const) {
    it(`en ${sitio}`, () => {
      const r = viraje(inc);
      // En el viraje, llegando al norte, se aparta más de ocho grados del direccional.
      expect(r.enElViraje).toBeGreaterThan(8);
      // Al salir pasa de largo —cruza el rumbo— y vuelve: baila.
      expect(r.cruces).toBeGreaterThan(0);
      expect(r.pasaDeLargo).toBeGreaterThan(2);
      // Y en menos de diez segundos se queda a un grado.
      expect(r.quietaA).toBeLessThan(10);
    });
  }

  it("y quieta en el suelo o derecha, marca el magnético sin bailar", () => {
    const b = new Brujula(CANARIAS);
    let marca = 0;
    for (let i = 0; i < 300; i++)
      marca = b.paso({ orientacion: avion(123), velocidad: { x: 0, y: 0, z: 0 }, variacion: 4 }, 1 / 60);
    expect(marca).toBeCloseTo(127, 3);
  });

  it("un salto de sitio no la hace bailar: se coloca en reposo", () => {
    const b = new Brujula(ASUNCION);
    b.paso({ orientacion: avion(10), velocidad: { x: 0, y: 0, z: 0 }, variacion: 0 }, 1 / 60);
    const marca = b.paso({ orientacion: avion(10), velocidad: { x: 0, y: 0, z: -60 }, variacion: 0 }, 1 / 60);
    expect(marca).toBeCloseTo(10, 3);
  });
});
