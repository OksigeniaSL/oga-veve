import { describe, expect, it } from "vitest";
import { ARAI, ARASUNU } from "./aircraft";
import { ejercicioPorId } from "./ejercicios";
import {
  AVISA_A,
  colocacionDeLaTormenta,
  DEJA_GIRAR,
  escenaDeLaTormenta,
  EXPLICA_A,
  LADO_DEL_VIENTO,
  MARGEN_DE_RODEO,
  margenEnUnidades,
  pasoPorEsteRumbo,
  PracticaDeTormenta,
  RADIO_DEL_ECO,
  radioDelEco,
  radioDelRojo,
  RAYO_TRAS_ENTRAR,
  type LecturaDeTormenta,
  type SucesoDeTormenta,
} from "./practica-de-tormenta";
import { MILLA } from "./ruta";
import { colorDelEco, ecoEn, seRodea } from "./tormentas";

/*
 * La escena de las pruebas: el camino va hacia el norte —rumbo cero, el morro
 * a −Z— y la tormenta está en el origen. Se empieza al sur, en +Z, mirándola.
 */
const ESCENA = escenaDeLaTormenta({ x: 0, z: 0 }, 0);
const ROJO = radioDelRojo(ESCENA.celda);

function tormenta(): PracticaDeTormenta {
  return new PracticaDeTormenta(ejercicioPorId("tormenta")!, ESCENA);
}

const EN_EL_AIRE = { enElSuelo: false, parado: false, percance: false } as const;

/**
 * Vuela en línea recta desde (x, z) por el rumbo, a `v` m/s, durante `s`
 * segundos; devuelve dónde acaba y lo que pasó.
 */
function volar(
  p: PracticaDeTormenta,
  desde: { x: number; z: number },
  rumbo: number,
  v: number,
  s: number,
  extra: Partial<LecturaDeTormenta> = {},
): { x: number; z: number; sucesos: SucesoDeTormenta[] } {
  let { x, z } = desde;
  const sucesos: SucesoDeTormenta[] = [];
  const dt = 0.5;
  for (let t = 0; t < s; t += dt) {
    sucesos.push(...p.paso({ x, z, rumbo, ...EN_EL_AIRE, ...extra }, dt));
    x += Math.sin(rumbo) * v * dt;
    z += -Math.cos(rumbo) * v * dt;
  }
  return { x, z, sucesos };
}

const cuales = (s: readonly SucesoDeTormenta[]) => s.map((x) => x.que);
const GRADOS = Math.PI / 180;

describe("la escena", () => {
  it("una tormenta de las que se rodean: núcleo rojo y magenta, que es el eco intenso", () => {
    expect(seRodea(ESCENA.celda)).toBe(true);
    expect(colorDelEco(ecoEn([ESCENA.celda], 0, 0))).toBe("magenta");
    // El rojo, de unos dos kilómetros; lo que pinta el radar, hasta unos siete.
    expect(ROJO).toBeGreaterThan(1500);
    expect(ROJO).toBeLessThan(2600);
    expect(radioDelEco(ESCENA.celda)).toBeGreaterThan(6000);
    expect(radioDelEco(ESCENA.celda)).toBeLessThan(RADIO_DEL_ECO);
  });

  it("el margen son veinte millas náuticas del rojo", () => {
    expect(MARGEN_DE_RODEO).toBeCloseTo(20 * MILLA, 6);
    expect(margenEnUnidades(MARGEN_DE_RODEO, "aeronautical")).toEqual({ n: 20, unidad: "NM" });
    expect(margenEnUnidades(MARGEN_DE_RODEO, "metric")).toEqual({ n: 37, unidad: "km" });
  });

  it("se empieza a unas cuarenta millas, con la tormenta en medio del camino a casa", () => {
    for (const a of [ARASUNU, ARAI]) {
      const c = colocacionDeLaTormenta(a);
      const delante = c.lejos - c.tormenta;
      // Desde donde Airbus pide empezar a rodear, más o menos…
      expect(delante).toBeGreaterThan(38 * MILLA);
      expect(delante).toBeLessThan(44 * MILLA);
      // …y ya en el radar, que en el cuadro llega a cuarenta millas.
      expect(delante - radioDelEco(ESCENA.celda)).toBeLessThan(40 * MILLA);
      // Y entre la tormenta y la pista, sitio para bajar sin tenerla encima.
      expect(c.tormenta - RADIO_DEL_ECO).toBeGreaterThan(50000);
      expect(c.alto).toBeLessThanOrEqual(6000);
    }
  });

  it("el yunque se estira hacia la izquierda del camino, y se rodea por la derecha", () => {
    expect(LADO_DEL_VIENTO).toBe("derecha");
    // A la izquierda, con rumbo norte, es −X.
    expect(ESCENA.yunque.x).toBeLessThan(-0.5);
    expect(Math.hypot(ESCENA.yunque.x, ESCENA.yunque.z)).toBeCloseTo(1, 6);
  });

  it("la línea del rumbo, juzgada como con el radar: derecho entra, a treinta grados pasa", () => {
    // A cuarenta y tres millas, lo que pide treinta grados: el seno de 30° es ½.
    const desde = { x: 0, z: 80000 };
    expect(pasoPorEsteRumbo(desde.x, desde.z, 0, ESCENA.celda).margen).toBeLessThan(0);
    const derecha = pasoPorEsteRumbo(desde.x, desde.z, 30 * GRADOS, ESCENA.celda);
    expect(derecha.margen).toBeGreaterThan(MARGEN_DE_RODEO);
    // Pasando por la derecha, la tormenta queda a la izquierda.
    expect(derecha.queda).toBe("izquierda");
  });
});

describe("rodearla bien se celebra", () => {
  it("presenta, explica, avisa, y con un rumbo que la deja a su margen: «así va»", () => {
    const p = tormenta();
    const a = volar(p, { x: 0, z: 80000 }, 0, 200, AVISA_A + 1);
    expect(cuales(a.sucesos).slice(0, 3)).toEqual(["presentar", "explicar", "avisar"]);
    expect(a.sucesos.find((s) => s.que === "explicar")).toEqual({
      que: "explicar",
      lado: "derecha",
    });
    // Gira a treinta grados a la derecha: con eso pasa a más de veinte millas.
    const b = volar(p, a, 30 * GRADOS, 200, 5);
    const asi = b.sucesos.find((s) => s.que === "asiVa");
    expect(asi).toBeDefined();
    expect(asi && asi.que === "asiVa" && asi.margen).toBeGreaterThan(MARGEN_DE_RODEO * 0.95);
  });

  it("y al dejarla al costado yendo a casa: rodeada con margen, y hecho al pararse en tierra", () => {
    const p = tormenta();
    const a = volar(p, { x: 0, z: 80000 }, 0, 200, 20);
    const b = volar(p, a, 35 * GRADOS, 200, 400);
    const c = volar(p, b, -20 * GRADOS, 200, 200);
    const rodeada = [...b.sucesos, ...c.sucesos].find((s) => s.que === "rodeada");
    expect(rodeada).toMatchObject({ que: "rodeada", conMargen: true });
    expect(p.entroYa).toBe(false);
    expect(p.fase).toBe("rodeada");
    // Y se vuelve a casa: el cierre llega parado en el suelo.
    const enTierra = p.paso({ x: 0, z: -90000, rumbo: 0, enElSuelo: true, parado: true, percance: false }, 0.5);
    expect(enTierra).toEqual([{ que: "cerrar", como: "rodeada" }]);
    expect(p.cierre).toBe("rodeada");
  });

  it("y dar media vuelta no es rodearla: queda detrás, pero no se va a casa", () => {
    const p = tormenta();
    const a = volar(p, { x: 0, z: 80000 }, 0, 200, 20);
    const b = volar(p, a, Math.PI, 200, 200);
    expect(cuales(b.sucesos)).not.toContain("rodeada");
  });

  it("pasar sin entrar pero cerca también se celebra, con «la próxima, más lejos»", () => {
    const p = tormenta();
    // Desde muy cerca, solo da para separarse unos kilómetros.
    const a = volar(p, { x: 0, z: 40000 }, 12 * GRADOS, 200, 300);
    const rodeada = a.sucesos.find((s) => s.que === "rodeada");
    expect(rodeada).toMatchObject({ que: "rodeada", conMargen: false });
    expect(p.entroYa).toBe(false);
    p.paso({ x: 0, z: -90000, rumbo: 0, enElSuelo: true, parado: true, percance: false }, 0.5);
    expect(p.cierre).toBe("rodeadaCerca");
  });
});

describe("el «girá más» se rearma con lo que pasa, no con un reloj", () => {
  it("derecho a ella: una vez, hacia el lado del viento, y no otra mientras nada cambie", () => {
    const p = tormenta();
    const a = volar(p, { x: 0, z: 140000 }, 0, 100, AVISA_A + DEJA_GIRAR + 60);
    const girar = a.sucesos.filter((s) => s.que === "girar");
    expect(girar).toEqual([{ que: "girar", lado: "derecha" }]);
  });

  it("y si la línea todavía entra en el rojo, por el lado del viento, aunque el viento la corra", () => {
    const p = tormenta();
    // A trescientos metros a la izquierda del centro: la tormenta, un pelo a la derecha.
    const a = volar(p, { x: -300, z: 140000 }, 0, 100, AVISA_A + DEJA_GIRAR + 2);
    expect(a.sucesos.filter((s) => s.que === "girar")).toEqual([{ que: "girar", lado: "derecha" }]);
  });

  it("y si después de ir bien vuelve hacia ella, otra vez: hacia el lado por el que iba", () => {
    const p = tormenta();
    const a = volar(p, { x: 0, z: 140000 }, 0, 100, AVISA_A + DEJA_GIRAR + 2);
    const b = volar(p, a, -40 * GRADOS, 100, 30);
    expect(cuales(b.sucesos)).toContain("asiVa");
    // Por la izquierda y con margen: no se le cambia de lado. Si vuelve a
    // apuntarle, se le pide girar más… a la izquierda.
    const c = volar(p, b, -2 * GRADOS, 100, 10);
    expect(c.sucesos.filter((s) => s.que === "girar")).toEqual([
      { que: "girar", lado: "izquierda" },
    ]);
  });
});

describe("si se entra, la consecuencia, sin castigo, y otra vez", () => {
  it("entra en el rojo, le toca un rayo y no pasa nada, sale y se repite", () => {
    const p = tormenta();
    const a = volar(p, { x: 0, z: 60000 }, 0, 200, 400);
    const que = cuales(a.sucesos);
    expect(que).toContain("entra");
    expect(que).toContain("rayoEnElAvion");
    expect(que).toContain("sale");
    // En ese orden, y el rayo a su tiempo de haber entrado.
    expect(que.indexOf("entra")).toBeLessThan(que.indexOf("rayoEnElAvion"));
    expect(que.indexOf("rayoEnElAvion")).toBeLessThan(que.indexOf("sale"));
    // Sin cierre ni reproche: la práctica no se cierra, se repite.
    expect(que).not.toContain("cerrar");
    expect(que).not.toContain("rodeada");
    expect(p.fase).toBe("fuera");
    p.reiniciar();
    expect(p.fase).toBe("delante");
    expect(p.entroYa).toBe(false);
    expect(cuales(p.paso({ x: 0, z: 80000, rumbo: 0, ...EN_EL_AIRE }, 0.5))).toEqual([
      "presentar",
    ]);
  });

  it("el rayo llega dentro, no al asomarse: y una sola vez", () => {
    const p = tormenta();
    const a = volar(p, { x: 0, z: 60000 }, 0, 200, 400);
    expect(a.sucesos.filter((s) => s.que === "rayoEnElAvion")).toHaveLength(1);
    expect(RAYO_TRAS_ENTRAR).toBeGreaterThan(0);
  });

  it("un percance cierra el ejercicio con «otra vez», que es repetirlo", () => {
    const p = tormenta();
    volar(p, { x: 0, z: 80000 }, 0, 200, 5);
    const s = p.paso({ x: 0, z: 79000, rumbo: 0, ...EN_EL_AIRE, percance: true }, 0.5);
    expect(s).toEqual([{ que: "cerrar", como: "otraVez" }]);
  });
});

describe("el rayo de lejos", () => {
  it("se ve una vez, después de contar qué es, yendo hacia ella", () => {
    const p = tormenta();
    const a = volar(p, { x: 0, z: 80000 }, 0, 200, 420);
    const rayos = a.sucesos.filter((s) => s.que === "rayoLejos");
    expect(rayos).toHaveLength(1);
    const que = cuales(a.sucesos);
    expect(que.indexOf("explicar")).toBeLessThan(que.indexOf("rayoLejos"));
    // Y antes de entrar: se ve desde fuera.
    expect(que.indexOf("rayoLejos")).toBeLessThan(que.indexOf("entra"));
  });

  it("y quien la rodea muy lejos también lo ve, al tenerla al costado", () => {
    const p = tormenta();
    const a = volar(p, { x: 0, z: 80000 }, 0, 200, EXPLICA_A + 1);
    const b = volar(p, a, 60 * GRADOS, 200, 600);
    expect(cuales(b.sucesos)).toContain("rayoLejos");
  });
});
