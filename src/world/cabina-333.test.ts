/**
 * La cabina de dos pasillos: lo que hay en ella, en qué avión sale, y las quejas
 * del primer bloque, que aquí no pueden volver sin que salte una prueba.
 */
import { BufferGeometry, Mesh, Raycaster, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById } from "../flight/aircraft";
import type { AsientoDeAra } from "./asiento-de-ara";
import type { AsientoDePasaje, PuertaDePasaje, VentanillaDePasaje } from "./asiento-de-pasaje";
import {
  BLOQUE,
  CRISTAL,
  disposicion333,
  filasDeLaCabina,
  fovParaLaPantalla,
  montarLaCabina333,
  PANTALLA,
  PASO_DE_CUADERNAS,
  SECCION,
  ventanillasDeLaPared,
} from "./cabina-333";
import { pasoDeVentanillas } from "./marco-de-ventanilla";
import { montarElPasillo } from "./pasillo-de-pasaje";

/** Unas medidas como las del JAZ 110: las puertas 1 y 2 por delante de Ara, y Ara a nueve filas de la 2. */
const VENTANILLA: VentanillaDePasaje = {
  centro: { x: -2.8, y: 0.9, z: 26 },
  normal: { x: -1, y: 0, z: 0 },
  ancho: CRISTAL.ancho,
  alto: CRISTAL.alto,
};
const SENTADA: AsientoDePasaje = {
  ojo: { x: -2.41, y: 0.97, z: 26.06 },
  guinada: 1.5,
  cabeceo: -0.17,
  ventanilla: VENTANILLA,
};
const ARA: AsientoDeAra = {
  ventanilla: VENTANILLA,
  poses: { sentada: SENTADA, motor: SENTADA, abajo: SENTADA },
  delMotor: { cristal: 0.2, motor: 0.1, ala: 0.1, cielo: 0, suelo: 0 },
};
const puerta = (z: number): PuertaDePasaje => ({ zMin: z - 0.535, zMax: z + 0.535, yMin: -0.28, yMax: 1.65, x: 2.8 });
const PUERTAS = [puerta(6), puerta(18), puerta(35), puerta(49)];

function montar(): NonNullable<ReturnType<typeof montarLaCabina333>> {
  const c = montarLaCabina333(ARA, "izquierda", PUERTAS, 0xb5532f);
  if (!c) throw new Error("sin cabina");
  c.grupo.updateMatrixWorld(true);
  return c;
}

/** Lo primero que corta un rayo en la cabina: a cuánto está. */
function primero(c: ReturnType<typeof montar>, desde: Vector3, hacia: Vector3, cercano = 0): number | null {
  const r = new Raycaster(desde, hacia.clone().normalize(), cercano);
  const corte = r.intersectObjects(c.mallas as Mesh[], false)[0];
  return corte?.distance ?? null;
}

describe("Tres, tres y tres con dos pasillos", () => {
  it("nueve asientos en tres bloques, con un pasillo de verdad entre cada dos", () => {
    const { asientos, pasillos } = disposicion333();
    expect(asientos).toHaveLength(9);
    expect([...asientos].sort((a, b) => a - b)).toEqual(asientos);
    expect(pasillos[0]).toBeCloseTo(-pasillos[1], 6);
    // Cada pasillo queda entre un bloque y el otro, sin asiento dentro.
    for (const p of pasillos)
      for (const x of asientos) expect(Math.abs(x - p)).toBeGreaterThan(SECCION.pasillo / 2 + SECCION.asiento / 2);
  });

  it("con las medidas de la fig. 2.5.1: 1,52 m el bloque y 18 pulgadas el pasillo", () => {
    expect(BLOQUE).toBeCloseTo(1.52, 2);
    expect(SECCION.pasillo).toBeCloseTo(0.46, 2);
  });

  it("y todo cabe dentro de la pared, a la altura de los brazos", () => {
    const { asientos } = disposicion333();
    const extremo = Math.abs(asientos[0]!) + SECCION.asiento / 2 + SECCION.brazo;
    const a = 0.62 - SECCION.centro;
    expect(extremo).toBeLessThan(Math.sqrt(SECCION.radio ** 2 - a ** 2));
  });

  it("Ara va en el asiento A, a la izquierda, junto a su ventanilla", () => {
    const { asientoA } = disposicion333();
    expect(asientoA).toBeLessThan(0);
    expect(Math.abs(asientoA - SENTADA.ojo.x)).toBeLessThan(0.15);
  });
});

describe("Las filas", () => {
  const { filas, deAra } = filasDeLaCabina(25.76, 18);

  it("van contadas desde Ara, a treinta y una pulgadas, con una detrás", () => {
    expect(filas[deAra]).toBeCloseTo(25.76, 6);
    expect(filas[filas.length - 1]).toBeCloseTo(25.76 + SECCION.entreFilas, 6);
    for (let i = 1; i < filas.length; i++) expect(filas[i]! - filas[i - 1]!).toBeCloseTo(SECCION.entreFilas, 6);
  });

  it("y dejan libre el pasillo de las puertas", () => {
    expect(filas[0]).toBeGreaterThanOrEqual(18 + 0.9);
    expect(filas[0]).toBeLessThan(18 + 0.9 + SECCION.entreFilas);
  });
});

describe("Las ventanillas", () => {
  const zs = ventanillasDeLaPared(26, 18.62, 27.5);

  it("miden 27 × 47 cm", () => {
    expect([CRISTAL.ancho, CRISTAL.alto]).toEqual([0.27, 0.47]);
  });

  it("van cada veinticuatro pulgadas, y una es la de Ara", () => {
    expect(PASO_DE_CUADERNAS).toBeCloseTo(24 * 0.0254, 2);
    for (let i = 1; i < zs.length; i++) expect(zs[i]! - zs[i - 1]!).toBeCloseTo(PASO_DE_CUADERNAS, 6);
    expect(zs.some((z) => Math.abs(z - 26) < 1e-6)).toBe(true);
  });

  it("y ninguna cae en la puerta", () => {
    expect(zs[0]).toBeGreaterThan(18.62);
    expect(zs[0]! - 18.62).toBeLessThan(0.4 + PASO_DE_CUADERNAS);
  });
});

describe("En qué aviones sale", () => {
  it("solo en el JAZ 110", () => {
    expect(AIRCRAFT.filter((a) => a.disposicionDelPasaje).map((a) => a.id)).toEqual(["jaz-110"]);
    expect(aircraftById("jaz-110").disposicionDelPasaje).toBe("3-3-3");
  });

  it("y su cristal se oscurece: es el único sin persiana", () => {
    expect(AIRCRAFT.filter((a) => a.ventanillas === "electrocromica").map((a) => a.id)).toEqual(["jaz-110"]);
  });

  it("el pasillo de los demás es el de siempre, sin pantalla ni luz propia", () => {
    const p = montarElPasillo(ARA, "izquierda", { izquierda: [], derecha: [] }, PUERTAS, 0xb5532f);
    expect(p).not.toBeNull();
    expect(p!.pantalla).toBeUndefined();
    expect(p!.poseDelRespaldo).toBeUndefined();
    expect(p!.ponerLuz).toBeUndefined();
    expect(p!.grupo.name).toBe("pasillo-de-pasaje");
  });

  it("y el paso de sus ventanillas, la misma cuenta", () => {
    expect(pasoDeVentanillas(0.36)).toBeCloseTo(0.61, 6);
    expect(pasoDeVentanillas(0.24)).toBeCloseTo(0.53, 6);
  });

  it("el JAZ 110 sí la lleva", () => {
    const p = montarElPasillo(ARA, "izquierda", { izquierda: [], derecha: [] }, PUERTAS, 0xb5532f, "3-3-3");
    expect(p!.pantalla).toBeDefined();
    expect(p!.grupo.name).toBe("cabina-333");
  });
});

describe("Lo que se le vio al primer bloque", () => {
  const c = montar();

  /** El suelo y la altura de la cabina, y hacia delante por el pasillo. */
  const y = (h: number): number => c.suelo + h;

  it("«¿Cómo se sale del avión si has puesto una tapia al fondo?»: por el pasillo, hasta pasar la puerta, no hay nada", () => {
    const { pasillos } = disposicion333();
    for (const p of pasillos) {
      const desde = new Vector3(p, y(1), 26.2);
      const d = primero(c, desde, new Vector3(0, 0, -1));
      // Hasta la cortina: la puerta queda por detrás de ella, a un lado del pasillo.
      expect(d).not.toBeNull();
      expect(26.2 - d!).toBeLessThan(18 - 0.5);
    }
  });

  it("y a los dos lados del pasillo de las puertas está la puerta, no una pared", () => {
    for (const k of [-1, 1]) {
      const desde = new Vector3(0.95 * k, y(1), 18);
      const d = primero(c, desde, new Vector3(k, 0, 0));
      expect(d).not.toBeNull();
      // Lo que corta es la cara de la puerta, por dentro del forro.
      expect(0.95 + d!).toBeLessThan(SECCION.radio + 0.01);
      expect(0.95 + d!).toBeGreaterThan(2.5);
    }
  });

  it("cogiendo la puerta más cercana, no la primera del avión", () => {
    expect(c.desde).toBeGreaterThan(18 - 5);
    expect(c.desde).toBeLessThan(18);
  });

  it("«¿Dónde están los portaequipajes superiores?»: encima de cada bloque, un rayo hacia arriba da con ellos", () => {
    const { pasillos } = disposicion333();
    const zAra = 24;
    for (const x of [pasillos[0] * 2.05, 0, pasillos[1] * 2.05]) {
      const d = primero(c, new Vector3(x, y(1.4), zAra), new Vector3(0, 1, 0));
      expect(d).not.toBeNull();
      // Por debajo del techo: lo primero son los compartimentos o su panel, de 1,64 a 1,95.
      expect(1.4 + d!).toBeLessThan(2.0);
    }
    // Y sobre los pasillos, el techo, más alto: se ve la curva hasta 2,5 m.
    for (const p of pasillos) {
      const d = primero(c, new Vector3(p, y(1.4), zAra), new Vector3(0, 1, 0));
      expect(1.4 + d!).toBeGreaterThan(2.4);
    }
  });

  it("«¿Ventanillas? ¿Qué son esas cosas azules?»: la pared tiene su hueco, y por él no se corta nada", () => {
    // De los ojos de Ara al centro de su cristal: nada en medio de la cabina.
    const desde = new Vector3(SENTADA.ojo.x, SENTADA.ojo.y, SENTADA.ojo.z);
    const hacia = new Vector3(VENTANILLA.centro.x, VENTANILLA.centro.y, VENTANILLA.centro.z).sub(desde);
    const d = primero(c, desde, hacia);
    expect(d === null || d > hacia.length() - 0.05).toBe(true);
    // Y entre ventanilla y ventanilla, sí hay pared.
    const pilar = primero(c, new Vector3(-1.5, y(SECCION.alturaDeLaVentanilla), 26 + PASO_DE_CUADERNAS / 2), new Vector3(-1, 0, 0));
    expect(pilar).not.toBeNull();
  });

  it("«Justamente a Ara le has quitado la pantalla»: de frente, sin nada delante, y fuera del plano cercano", () => {
    expect(c.pantalla).toBeDefined();
    const pose = c.poseDelRespaldo!(16 / 9);
    const ojo = new Vector3(pose.ojo.x, pose.ojo.y, pose.ojo.z);
    const a = c.centroDeLaPantalla!;
    // Delante de Ara, en su columna.
    expect(Math.abs(a.x - disposicion333().asientoA)).toBeLessThan(0.01);
    expect(a.z).toBeLessThan(ojo.z);
    // Más lejos que el plano cercano de la cámara (0,6 m), y mirando a ella.
    const d = ojo.distanceTo(a);
    expect(d).toBeGreaterThan(0.62);
    expect(pose.guinada).toBe(0);
    expect(pose.cabeceo).toBeCloseTo(-Math.atan2(ojo.y - a.y, ojo.z - a.z), 6);
    // Y nada entre los ojos y la pantalla. El respaldo de Ara queda por detrás del plano cercano, y no se pinta.
    const hasta = primero(c, ojo, a.clone().sub(ojo), 0.6);
    expect(hasta === null || hasta > d - 0.03).toBe(true);
  });

  it("deja las señales de salida a la vista desde el pasillo", () => {
    const l = c.letreros[0]!;
    const ojo = new Vector3(c.pose.ojo.x, c.pose.ojo.y, c.pose.ojo.z);
    const hacia = new Vector3(l.x, l.y, l.z).sub(ojo);
    const d = primero(c, ojo, hacia);
    expect(d === null || d > hacia.length() - 0.03).toBe(true);
    expect(c.letreros).toHaveLength(4);
  });

  it("y no se pasa de triángulos: es para una tablet", () => {
    const g = c.mallas[0]!.geometry as BufferGeometry;
    expect(g.getAttribute("position").count / 3).toBeLessThan(45_000);
  });
});

describe("La pantalla llena la vista", () => {
  const cabe = (aspecto: number): { alto: number; ancho: number } => {
    const t = Math.tan(((fovParaLaPantalla(aspecto) / 2) * Math.PI) / 180);
    const d = 0.72;
    return { alto: PANTALLA.alto / (2 * d * t), ancho: PANTALLA.ancho / (2 * d * t * aspecto) };
  };

  it("en un portátil, en una tablet y en un teléfono apaisado: ocupa casi todo, y cabe entera", () => {
    for (const a of [16 / 9, 4 / 3, 20 / 9, 1.6]) {
      const c = cabe(a);
      expect(Math.max(c.alto, c.ancho)).toBeCloseTo(0.86, 2);
      expect(Math.min(c.alto, c.ancho)).toBeGreaterThan(0.6);
    }
  });

  it("y de pie, también entera: ahí manda el ancho", () => {
    const c = cabe(9 / 20);
    expect(c.ancho).toBeCloseTo(0.86, 2);
    expect(c.alto).toBeLessThan(0.86);
  });
});
