/**
 * **En la frustrada no se está en final**, aunque se nivele alineado por
 * debajo de los trescientos metros (enmienda H69 del ADR 0029).
 *
 * En el banco del JAZ 20 en Los Rodeos con la pista ocupada, la fase del plan
 * volvió a «final» en la subida de la frustrada: siete segundos a 281 m y
 * 1.329 m pasado el umbral, nivelando. La torre lo vio en final y le dio el
 * «cleared to land» a quien se estaba yendo, a los 683 s de un vuelo y a los
 * 689 s de otro. `deducir` en `flight/vuelo.ts` admitía la final hasta el
 * centro de la pista a cualquier altura por debajo de trescientos, y bastaba
 * con que el variómetro pasara por debajo de cero al nivelar.
 *
 * Aquí se vuela esa frustrada con la máquina de fases de verdad, paso a paso:
 * de la decisión a la altura del circuito por el eje, nivelando encima de la
 * primera mitad de la pista. Y lo que no tiene que cambiar: quien corrige la
 * senda subiendo unos metros sin irse sigue en su final, y la final siguiente,
 * después de darse la vuelta, vuelve a ser final.
 */
import { describe, expect, it } from "vitest";
import { Vuelo, type Fase, type Situacion } from "./vuelo";

/** La mitad de la pista de Los Rodeos, m: el umbral de la 30 a −1.700. */
const MEDIA_PISTA = 1700;
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
  /** Grados entre el rumbo y el de la pista. */
  rumbo: number;
}

function situacion(a: Avion): Situacion {
  return {
    estado: {
      airspeed: 33,
      groundSpeed: 33,
      verticalSpeed: a.vs,
      onGround: false,
    } as Situacion["estado"],
    alaRuta: 0,
    restante: 5000,
    alEjeDePista: a.eje,
    backTaxi: false,
    alLargoDePista: a.x,
    pistaRestante: Math.max(0, MEDIA_PISTA - a.x),
    pistaQueNecesita: 0,
    enPista: a.eje < 25 && Math.abs(a.x) < MEDIA_PISTA,
    sobreElSuelo: a.h,
    motor: true,
    desalineado: a.rumbo,
  };
}

/** Un vuelo que ya voló, en final a 120 m y bajando por la senda. */
function enFinal(): { v: Vuelo; a: Avion } {
  const v = new Vuelo();
  v.reiniciar(true);
  const arriba = situacion({ x: -9000, eje: 3000, h: 400, vs: 0, rumbo: 90 });
  for (let t = 0; t < 20; t += PASO) v.paso(arriba, PASO);
  const a: Avion = { x: -MEDIA_PISTA - 2300, eje: 10, h: 120, vs: -1.7, rumbo: 0 };
  for (let t = 0; t < 2; t += PASO) v.paso(situacion(a), PASO);
  expect(v.actual).toBe("final");
  return { v, a };
}

/**
 * Vuela `segundos` con la vertical que diga `vs` y a 33 m/s por el rumbo, y
 * devuelve las fases que se vieron.
 */
function volar(v: Vuelo, a: Avion, segundos: number, vs: (a: Avion) => number): Set<Fase> {
  const vistas = new Set<Fase>();
  for (let t = 0; t < segundos; t += PASO) {
    a.vs = vs(a);
    a.h += a.vs * PASO;
    const r = (a.rumbo * Math.PI) / 180;
    a.x += 33 * Math.cos(r) * PASO;
    a.eje = Math.abs(a.eje + 33 * Math.sin(r) * PASO);
    vistas.add(v.paso(situacion(a), PASO).fase);
  }
  return vistas;
}

/** Baja por la senda hasta la altura de decisión, sesenta metros. */
const hastaLaDecision = (v: Vuelo, a: Avion): void => {
  volar(v, a, (a.h - 60) / 1.7, () => -1.7);
  expect(v.actual).toBe("final");
};

/**
 * La subida de la frustrada: a cuatro metros por segundo hasta los 280, y ahí
 * nivela —con el variómetro un pelo por debajo de cero, como al nivelar de
 * verdad— hasta pasar la mitad de la pista.
 */
const frustrada = (a: Avion): number => (a.h < 280 ? 4 : -0.3);

/** Los segundos hasta cincuenta metros antes del centro de la pista. */
const hastaElCentro = (a: Avion): number => (-a.x - 50) / 33;

describe("la fase en la frustrada (H69)", () => {
  it("con el gas de despegue, nivelando encima de la pista no se vuelve a final", () => {
    const { v, a } = enFinal();
    hastaLaDecision(v, a);
    v.gas = 1;
    // Lo que sube desde la decisión hasta salir de la final, todavía final.
    volar(v, a, 6, frustrada);
    expect(v.actual).toBe("en-vuelo");
    const vistas = volar(v, a, hastaElCentro(a), frustrada);
    // Y ha llegado a nivelar antes del centro, que es donde se veía.
    expect(a.h).toBeGreaterThan(270);
    expect([...vistas]).toEqual(["en-vuelo"]);
  });

  it("con la orden de irse puesta, igual, aunque el gas no llegue a fondo", () => {
    const { v, a } = enFinal();
    hastaLaDecision(v, a);
    v.gas = 0.8;
    v.ordenDeIrse = true;
    volar(v, a, 6, frustrada);
    const vistas = volar(v, a, hastaElCentro(a), frustrada);
    expect(a.h).toBeGreaterThan(270);
    expect([...vistas]).toEqual(["en-vuelo"]);
  });

  it("y sin gas ni orden, subir cien metros también es irse", () => {
    const { v, a } = enFinal();
    hastaLaDecision(v, a);
    v.gas = 0.7;
    // Los cien metros, a cuatro por segundo, son veinticinco segundos.
    volar(v, a, 26, frustrada);
    const vistas = volar(v, a, hastaElCentro(a), frustrada);
    expect(a.h).toBeGreaterThan(270);
    expect([...vistas]).toEqual(["en-vuelo"]);
  });

  it("pero corregir la senda subiendo unos metros no es irse: se vuelve a final al bajar", () => {
    const { v, a } = enFinal();
    v.gas = 0.6;
    // Treinta metros de subida a dos por segundo, con el teclado.
    volar(v, a, 15, () => 2);
    expect(v.actual).toBe("en-vuelo");
    volar(v, a, 3, () => -2.5);
    expect(v.actual).toBe("final");
  });

  it("y tras darse la vuelta, la final siguiente vuelve a ser final", () => {
    const { v, a } = enFinal();
    hastaLaDecision(v, a);
    v.gas = 1;
    volar(v, a, hastaElCentro(a) + 10, frustrada);
    expect(v.actual).toBe("en-vuelo");
    v.gas = 0.6;
    // El viento en cola, a 1.200 m del eje y de vuelta.
    Object.assign(a, { eje: 1200, rumbo: 180, vs: 0 });
    volar(v, a, 20, () => 0);
    // Y la final, alineado otra vez y bajando, por delante del umbral.
    Object.assign(a, { x: -MEDIA_PISTA - 3000, eje: 20, rumbo: 0, h: 250 });
    volar(v, a, 2, () => -2);
    expect(v.actual).toBe("final");
  });

  it("y la que se pasa de largo, al pasar el centro de la pista, también la deja", () => {
    const { v, a } = enFinal();
    hastaLaDecision(v, a);
    v.gas = 1;
    volar(v, a, 10, frustrada);
    expect(v.enLaFrustrada).toBe(true);
    volar(v, a, hastaElCentro(a) + 5, frustrada);
    expect(v.enLaFrustrada).toBe(false);
  });
});
