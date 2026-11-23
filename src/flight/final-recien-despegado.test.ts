/**
 * **Recién despegado no hay final**, ni permiso de aterrizar, hasta haberse
 * dado la vuelta (enmienda H71c del ADR 0014).
 *
 * En el banco del fallo de radio con el JAZ 20 en Gran Canaria, la torre
 * encendió la verde fija a 176 m en la subida por el eje, y el juego lo contó
 * como una frustrada. Ya se había visto una vez, y se arregló cerrando la
 * final de la torre al callarse la radio (`FinalDeLaTorre.despegado`, H71);
 * volvió porque el permiso no salía de ahí. La pista de Gando mide 3.104 m: la
 * avioneta pasa de los ciento veinte metros —ya ha volado— antes del centro, y
 * un bache que deja el variómetro un momento por debajo de cero cumplía lo que
 * `deducir` en `flight/vuelo.ts` pide para la fase «final». La torre mira esa
 * fase antes que su propia final (`faseQueVeLaTorre`), y la vio.
 *
 * Aquí se vuela esa subida con la máquina de fases de verdad, paso a paso, y
 * con la final de la torre cerrada como la cierra el fallo de radio. Y lo que
 * no tiene que cambiar: la final de vuelta del circuito, la de quien se pone
 * en el aire en una final y la de quien se coloca en una desde el suelo.
 */
import { describe, expect, it } from "vitest";
import { FinalDeLaTorre } from "./final-de-la-torre";
import { faseQueVeLaTorre, NO_CALLA_NADA } from "./lo-que-calla-el-ejercicio";
import { Vuelo, type Fase, type Situacion } from "./vuelo";

/** La mitad de la 03L de Gran Canaria, m: 3.104 entre umbrales. */
const MEDIA_PISTA = 1552;
const PASO = 0.05;

/** Dónde está el avión y qué hace, en lo que la máquina mira. */
interface Avion {
  /** Metros a lo largo de la pista desde su centro, negativo antes. */
  x: number;
  /** Metros del eje. */
  eje: number;
  /** Altura sobre el suelo, m. */
  h: number;
  /** Velocidad vertical, m/s. */
  vs: number;
  /** Velocidad sobre el suelo, m/s. */
  gs: number;
  /** Grados entre el rumbo y el de la pista. */
  rumbo: number;
  enElSuelo: boolean;
}

function situacion(a: Avion): Situacion {
  return {
    estado: {
      airspeed: a.gs,
      groundSpeed: a.gs,
      verticalSpeed: a.vs,
      onGround: a.enElSuelo,
    } as Situacion["estado"],
    alaRuta: 0,
    restante: 5000,
    alEjeDePista: a.eje,
    backTaxi: false,
    alLargoDePista: a.x,
    pistaRestante: Math.max(0, MEDIA_PISTA - a.x),
    pistaQueNecesita: 400,
    enPista: a.eje < 22.5 + 3 && Math.abs(a.x) < MEDIA_PISTA + 3,
    sobreElSuelo: a.h,
    motor: true,
    desalineado: a.rumbo,
  };
}

/** La torre, como la mira el juego: la fase del plan y su propia final. */
class Torre {
  readonly final = new FinalDeLaTorre();
  paso(fase: Fase, a: Avion): string {
    const enSuFinal = this.final.paso({
      enElAire: !a.enElSuelo,
      faseDelPlan: fase,
      enLaFinalDelPlan: false,
      // Subiendo, pasado el umbral: fuera del cono de su aproximación.
      alUmbral: a.x < -MEDIA_PISTA ? -MEDIA_PISTA - a.x : null,
      torcido: a.rumbo,
      sobreLaPista: a.h,
      vertical: a.vs,
      gas: 1,
    });
    return faseQueVeLaTorre(fase, enSuFinal, NO_CALLA_NADA);
  }
}

/** Un paso de los dos, y lo que vieron. */
function paso(v: Vuelo, t: Torre, a: Avion, vistas: { plan: Set<Fase>; torre: Set<string> }): void {
  const fase = v.paso(situacion(a), PASO).fase;
  vistas.plan.add(fase);
  vistas.torre.add(t.paso(fase, a));
}

/**
 * **La subida del banco**: la carrera desde la cabecera, la avioneta en el
 * aire a unos trescientos metros y subiendo a 4,8 m/s con 35 de suelo, como el
 * JAZ 20 —110 m a 320 del centro, 148 m a 110—, un poco a la izquierda del
 * eje. A los ciento cuarenta metros se calla la radio, si se pide, y llega el
 * bache: dos segundos bajando a dos y medio, antes del centro, y detrás diez
 * subiendo a menos de un metro por segundo, con el centro pasando por debajo.
 * Y sigue subiendo hasta nivelar a unos trescientos, medio kilómetro pasada
 * la pista.
 */
function despegarConBache(radioCallada: boolean): {
  v: Vuelo;
  t: Torre;
  a: Avion;
  enLaSubida: { plan: Set<Fase>; torre: Set<string> };
} {
  const v = new Vuelo();
  v.reiniciar(true);
  const t = new Torre();
  const a: Avion = { x: -MEDIA_PISTA + 40, eje: 1, h: 0, vs: 0, gs: 0, rumbo: 1, enElSuelo: true };
  const enTierra = { plan: new Set<Fase>(), torre: new Set<string>() };
  // La carrera: a 2 m/s² hasta los 30 m/s, unos 230 m.
  while (a.gs < 30) {
    a.gs += 2 * PASO;
    a.x += a.gs * PASO;
    paso(v, t, a, enTierra);
  }
  Object.assign(a, { enElSuelo: false, gs: 35, vs: 4.8 });
  const enLaSubida = { plan: new Set<Fase>(), torre: new Set<string>() };
  let bache = 0;
  let despues = 0;
  let dondeElBache: number | null = null;
  let callada = false;
  while (a.x < MEDIA_PISTA + 500) {
    if ((a.h >= 140 || bache > 0) && bache < 2) {
      if (radioCallada && !callada) {
        t.final.despegado();
        callada = true;
      }
      dondeElBache ??= a.x;
      a.vs = -2.5;
      bache += PASO;
    } else if (bache >= 2 && despues < 10) {
      // Y detrás, diez segundos subiendo poco, como a los 64 s del banco.
      a.vs = 0.8;
      despues += PASO;
    } else a.vs = a.h < 290 ? 4.8 : 0;
    a.h += a.vs * PASO;
    a.x += a.gs * PASO;
    a.eje = Math.min(25, a.eje + 0.5 * PASO);
    paso(v, t, a, enLaSubida);
  }
  // El bache ha caído entero y antes del centro, que es donde la fase lo admitía.
  expect(bache).toBeGreaterThanOrEqual(2);
  expect(dondeElBache).toBeLessThan(0);
  return { v, t, a, enLaSubida };
}

describe("recién despegado no hay final (H71c)", () => {
  it("un bache en la subida por el eje, antes del centro de la pista, no es final", () => {
    const { a, enLaSubida } = despegarConBache(false);
    expect(a.x).toBeGreaterThan(MEDIA_PISTA);
    expect([...enLaSubida.plan]).not.toContain("final");
  });

  it("y la torre no te ve en su final: sin radio no enciende la verde subiendo", () => {
    const { enLaSubida } = despegarConBache(true);
    expect([...enLaSubida.torre]).not.toContain("final");
  });

  it("con la radio de siempre, tampoco: la torre no te da la pista ni te la pide", () => {
    const { enLaSubida } = despegarConBache(false);
    expect([...enLaSubida.torre]).not.toContain("final");
  });

  it("y de vuelta por el circuito, la final es final", () => {
    const { v, t, a } = despegarConBache(true);
    expect(v.acabaDeDespegar).toBe(true);
    const vistas = { plan: new Set<Fase>(), torre: new Set<string>() };
    // El tramo cruzado y el viento en cola, a 1.200 m del eje y de vuelta.
    Object.assign(a, { eje: 1200, rumbo: 90, vs: 0 });
    paso(v, t, a, vistas);
    Object.assign(a, { rumbo: 180 });
    for (let s = 0; s < 20; s += PASO) paso(v, t, a, vistas);
    expect(v.acabaDeDespegar).toBe(false);
    // Y la final, alineado otra vez y bajando, por delante del umbral.
    Object.assign(a, { x: -MEDIA_PISTA - 3000, eje: 20, rumbo: 0, h: 250, vs: -2 });
    for (let s = 0; s < 2; s += PASO) {
      a.h += a.vs * PASO;
      a.x += a.gs * PASO;
      paso(v, t, a, vistas);
    }
    expect(v.actual).toBe("final");
    expect(t.paso(v.actual, a)).toBe("final");
  });

  it("un toque y despegue también es despegar: subiendo de la pista, no hay final", () => {
    const { v, t, a } = despegarConBache(false);
    const vistas = { plan: new Set<Fase>(), torre: new Set<string>() };
    // Vuelve, toca a 300 m del umbral y rueda.
    Object.assign(a, { x: -MEDIA_PISTA - 3000, eje: 20, rumbo: 0, h: 150, vs: -2.5, gs: 33 });
    for (let s = 0; s < 1; s += PASO) paso(v, t, a, vistas);
    Object.assign(a, { x: -MEDIA_PISTA + 300, eje: 2, h: 0, vs: 0, gs: 30, enElSuelo: true });
    for (let s = 0; s < 3; s += PASO) {
      a.x += a.gs * PASO;
      paso(v, t, a, vistas);
    }
    // Y se va otra vez: arriba, y un bache a 150 m antes del centro.
    Object.assign(a, { enElSuelo: false, gs: 35, vs: 4.8, h: 1 });
    const enLaSubida = { plan: new Set<Fase>(), torre: new Set<string>() };
    let bache = 0;
    while (a.h < 200) {
      if ((a.h >= 140 || bache > 0) && bache < 2) {
        a.vs = -2.5;
        bache += PASO;
      } else a.vs = 4.8;
      a.h += a.vs * PASO;
      a.x += a.gs * PASO;
      paso(v, t, a, enLaSubida);
    }
    expect(a.x).toBeLessThan(MEDIA_PISTA);
    expect([...enLaSubida.plan]).not.toContain("final");
  });

  it("puesto en el aire en una final, sin haber pisado el suelo, es final", () => {
    const v = new Vuelo();
    v.reiniciar();
    const t = new Torre();
    const vistas = { plan: new Set<Fase>(), torre: new Set<string>() };
    // Por encima del circuito un rato, que es lo que pide haber volado.
    const a: Avion = { x: -9000, eje: 3000, h: 400, vs: 0, gs: 33, rumbo: 90, enElSuelo: false };
    for (let s = 0; s < 20; s += PASO) paso(v, t, a, vistas);
    Object.assign(a, { x: -MEDIA_PISTA - 2300, eje: 10, h: 120, vs: -1.7, rumbo: 0 });
    for (let s = 0; s < 2; s += PASO) paso(v, t, a, vistas);
    expect(v.actual).toBe("final");
  });

  it("y colocado desde el suelo en una final por delante de la pista, también", () => {
    const v = new Vuelo();
    v.reiniciar(true);
    const t = new Torre();
    const vistas = { plan: new Set<Fase>(), torre: new Set<string>() };
    const a: Avion = { x: -MEDIA_PISTA + 40, eje: 1, h: 0, vs: 0, gs: 0, rumbo: 0, enElSuelo: true };
    for (let s = 0; s < 1; s += PASO) paso(v, t, a, vistas);
    // Un vuelo de antes, para haber volado; y de un salto, a la final.
    Object.assign(a, { x: -9000, eje: 3000, h: 400, gs: 33, rumbo: 90, enElSuelo: false });
    for (let s = 0; s < 20; s += PASO) paso(v, t, a, vistas);
    expect(v.acabaDeDespegar).toBe(false);
    Object.assign(a, { x: -MEDIA_PISTA - 2300, eje: 10, h: 120, vs: -1.7, rumbo: 0 });
    for (let s = 0; s < 2; s += PASO) paso(v, t, a, vistas);
    expect(v.actual).toBe("final");
  });

  it("y el salto directo del suelo a la final se entiende como estar delante de la pista", () => {
    const v = new Vuelo();
    v.reiniciar(true);
    const t = new Torre();
    const vistas = { plan: new Set<Fase>(), torre: new Set<string>() };
    const a: Avion = { x: -MEDIA_PISTA + 40, eje: 1, h: 0, vs: 0, gs: 0, rumbo: 0, enElSuelo: true };
    for (let s = 0; s < 1; s += PASO) paso(v, t, a, vistas);
    Object.assign(a, { x: -MEDIA_PISTA - 2300, eje: 10, h: 120, vs: -1.7, gs: 33, enElSuelo: false });
    paso(v, t, a, vistas);
    expect(v.acabaDeDespegar).toBe(false);
  });
});
