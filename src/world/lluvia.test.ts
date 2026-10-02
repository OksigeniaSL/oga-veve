/**
 * La lluvia, en lo que se puede medir sin navegador.
 *
 * Lo que se ve —las rayas, el fogonazo— hay que mirarlo; lo que se puede probar
 * aquí es la aritmética, que es donde se rompe: cuántas gotas caben, que el
 * envoltorio de la caja no deje la lluvia subiendo, y que un rayo no caiga
 * nunca fuera de una tormenta.
 */

import { describe, expect, it } from "vitest";
import type { BufferAttribute, LineSegments } from "three";
import {
  CAE,
  CAJA,
  crearLluvia,
  cuantasGotas,
  envolver,
  tocaRelampago,
  type LluviaEnElMundo,
} from "./lluvia";

describe("cuántas gotas", () => {
  it("sin lluvia no hay ninguna", () => {
    expect(cuantasGotas("nada", 1)).toBe(0);
  });

  it("la llovizna es menos agua, no agua más floja", () => {
    expect(cuantasGotas("llovizna", 1)).toBeLessThan(cuantasGotas("lluvia", 1));
  });

  it("y la fuerza suma dentro de su clase", () => {
    expect(cuantasGotas("lluvia", 1)).toBeGreaterThan(
      cuantasGotas("lluvia", 0),
    );
    // Ni con fuerza cero se queda sin gotas: si llueve, se ve.
    expect(cuantasGotas("lluvia", 0)).toBeGreaterThan(0);
  });

  it("y no se pasa aunque le pidan una fuerza absurda", () => {
    expect(cuantasGotas("lluvia", 9)).toBe(cuantasGotas("lluvia", 1));
    expect(cuantasGotas("lluvia", -4)).toBe(cuantasGotas("lluvia", 0));
  });
});

describe("el envoltorio de la caja", () => {
  it("deja en paz lo que está dentro", () => {
    expect(envolver(3)).toBe(3);
    expect(envolver(-3)).toBe(-3);
  });

  it("y devuelve arriba lo que sale por abajo", () => {
    // Es el signo que, mal puesto, deja la lluvia subiendo.
    expect(envolver(-CAJA / 2 - 1)).toBeCloseTo(CAJA / 2 - 1, 6);
  });

  it("y abajo lo que sale por arriba", () => {
    expect(envolver(CAJA / 2 + 1)).toBeCloseTo(-CAJA / 2 + 1, 6);
  });

  it("y un salto de diez kilómetros es una cuenta, no doscientas vueltas", () => {
    // Al cambiar de vista la cámara salta: la gota tiene que caer dentro.
    expect(envolver(10_000 + 3)).toBeCloseTo(envolver(3 + (10_000 % CAJA)), 6);
    expect(Math.abs(envolver(-123_456.7))).toBeLessThanOrEqual(CAJA / 2);
  });

  it("aguante lo que le echen, sin quedarse dando vueltas", () => {
    for (const y of [-500, -47, 0, 47, 500, 10000]) {
      const v = envolver(y);
      expect(v).toBeGreaterThanOrEqual(-CAJA / 2 - 1e-6);
      expect(v).toBeLessThanOrEqual(CAJA / 2 + 1e-6);
    }
  });
});

describe("el relámpago", () => {
  it("no cae nunca sin tormenta", () => {
    // Un rayo con sol es un fallo, no un adorno. Ni con el azar a favor.
    for (const clase of ["nada", "llovizna", "lluvia"] as const)
      expect(tocaRelampago(clase, 1, 1, () => 0)).toBe(false);
  });

  it("y en tormenta cae", () => {
    expect(tocaRelampago("tormenta", 1, 1, () => 0)).toBe(true);
    expect(tocaRelampago("tormenta", 1, 1, () => 1)).toBe(false);
  });

  it("y la tormenta fuerte relampaguea más que la floja", () => {
    // Se busca el umbral: con qué azar cae en cada caso.
    const umbral = (f: number) => {
      let lo = 0;
      for (let k = 0; k <= 1000; k++)
        if (tocaRelampago("tormenta", f, 1, () => k / 1000)) lo = k / 1000;
      return lo;
    };
    expect(umbral(1)).toBeGreaterThan(umbral(0));
  });

  it("y el ritmo no depende de los fotogramas", () => {
    /*
     * La trampa clásica: una probabilidad fija por paso hace que el juego
     * relampaguee seis veces más a sesenta fotogramas que a diez. Aquí la
     * probabilidad va con `dt`, así que en un paso el doble de largo cae el
     * doble de fácil.
     */
    const cae = (dt: number, a: number) =>
      tocaRelampago("tormenta", 0.5, dt, () => a);
    expect(cae(1 / 60, 0.004)).toBe(cae(1 / 30, 0.008));
  });
});

/** Dónde está cada raya: su principio y su final, en coordenadas de la caja. */
function rayas(ll: LluviaEnElMundo): Float32Array {
  const linea = ll.grupo.children[0] as LineSegments;
  return (linea.geometry.getAttribute("position") as BufferAttribute)
    .array as Float32Array;
}

/**
 * Las gotas que en un paso no han dado la vuelta a la caja: en esas se puede
 * medir cuánto se han movido.
 */
function sinVuelta(a: Float32Array, b: Float32Array, n: number): number[] {
  const quedan: number[] = [];
  for (let i = 0; i < n; i++)
    if ([0, 1, 2].every((e) => Math.abs(b[i * 6 + e]! - a[i * 6 + e]!) < 5))
      quedan.push(i);
  return quedan;
}

describe("la lluvia va contra el avión", () => {
  /*
   * «Estaba lloviendo y la lluvia iba hacia adelante en lugar de venir contra
   * el avión; me parece que la mueves al contrario.» Lo era: la caja va con
   * la cámara y a la gota se le **sumaba** lo que avanzaba el avión, así que
   * corría hacia delante con él. Aquí se mide la gota en el mundo y en la
   * caja, que son las dos cuentas que se pueden equivocar de signo.
   */
  const dt = 1 / 60;
  /** Un avión hacia el norte —la Z negativa— a sesenta metros por segundo. */
  const alNorte = { x: 0, y: 0, z: -60 };

  function dosPasos(viento?: { x: number; z: number }) {
    const ll = crearLluvia();
    ll.poner("lluvia", 1);
    const ojo = { x: 100, y: 800, z: 200 };
    ll.paso(dt, { camara: ojo, velocidad: alNorte, ...(viento ? { viento } : {}) });
    const antes = Float32Array.from(rayas(ll));
    const caja0 = ll.grupo.position.clone();
    const ojo2 = { x: ojo.x, y: ojo.y, z: ojo.z + alNorte.z * dt };
    ll.paso(dt, { camara: ojo2, velocidad: alNorte, ...(viento ? { viento } : {}) });
    const despues = rayas(ll);
    const caja1 = ll.grupo.position.clone();
    return { ll, antes, despues, caja0, caja1 };
  }

  it("en la caja, la gota va hacia atrás lo que avanza el avión", () => {
    const { ll, antes, despues } = dosPasos();
    const medibles = sinVuelta(antes, despues, ll.pintadas);
    expect(medibles.length).toBeGreaterThan(ll.pintadas * 0.9);
    for (const i of medibles) {
      // Hacia el sur, que es hacia atrás yendo al norte: un metro.
      expect(despues[i * 6 + 2]! - antes[i * 6 + 2]!).toBeCloseTo(1, 4);
      // Y cayendo lo suyo.
      expect(despues[i * 6 + 1]! - antes[i * 6 + 1]!).toBeCloseTo(-CAE * dt, 4);
      expect(despues[i * 6]! - antes[i * 6]!).toBeCloseTo(0, 4);
    }
  });

  it("y en el mundo se queda quieta en el aire, cayendo", () => {
    const { ll, antes, despues, caja0, caja1 } = dosPasos();
    for (const i of sinVuelta(antes, despues, ll.pintadas)) {
      const z0 = caja0.z + antes[i * 6 + 2]!;
      const z1 = caja1.z + despues[i * 6 + 2]!;
      expect(z1 - z0).toBeCloseTo(0, 3);
    }
  });

  it("y con viento, se la lleva el viento y no el avión", () => {
    const viento = { x: 6, z: 0 };
    const { ll, antes, despues, caja0, caja1 } = dosPasos(viento);
    for (const i of sinVuelta(antes, despues, ll.pintadas)) {
      const x0 = caja0.x + antes[i * 6]!;
      const x1 = caja1.x + despues[i * 6]!;
      expect(x1 - x0).toBeCloseTo(viento.x * dt, 3);
    }
  });

  it("y la raya apunta hacia atrás, de donde viene el agua", () => {
    const { ll, despues } = dosPasos();
    for (let i = 0; i < ll.pintadas; i++) {
      // Del principio al final de la raya: hacia el sur y hacia abajo.
      expect(despues[i * 6 + 5]! - despues[i * 6 + 2]!).toBeGreaterThan(0);
      expect(despues[i * 6 + 4]! - despues[i * 6 + 1]!).toBeLessThan(0);
    }
  });
});

describe("y solo donde cae", () => {
  it("encima del techo de la capa no se pinta ni una gota", () => {
    const ll = crearLluvia();
    ll.poner("tormenta", 1);
    const ojo = { x: 0, y: 3000, z: 0 };
    ll.paso(1 / 60, { camara: ojo, velocidad: { x: 0, y: 0, z: -100 }, aqui: 0 });
    expect(ll.pintadas).toBe(0);
    expect(ll.grupo.visible).toBe(false);
    // Y al volver a bajar, toda la del parte.
    ll.paso(1 / 60, { camara: ojo, velocidad: { x: 0, y: 0, z: -100 }, aqui: 1 });
    expect(ll.pintadas).toBe(cuantasGotas("tormenta", 1));
  });

  it("y dentro de la capa, menos", () => {
    const ll = crearLluvia();
    ll.poner("lluvia", 1);
    ll.paso(1 / 60, { camara: { x: 0, y: 0, z: 0 }, velocidad: { x: 0, y: 0, z: 0 }, aqui: 0.5 });
    expect(ll.pintadas).toBe(Math.round(cuantasGotas("lluvia", 1) / 2));
  });

  it("y desde la cabina no llueve dentro de la cabina", () => {
    const ll = crearLluvia();
    ll.poner("lluvia", 1);
    ll.paso(1 / 60, {
      camara: { x: 0, y: 0, z: 0 },
      velocidad: { x: 0, y: 0, z: -60 },
      hueco: 10,
    });
    const r = rayas(ll);
    for (let i = 0; i < ll.pintadas; i++) {
      const [x, y, z] = [r[i * 6]!, r[i * 6 + 1]!, r[i * 6 + 2]!];
      if (Math.hypot(x, y, z) < 10)
        // La raya se queda en un punto: no se ve.
        expect([r[i * 6 + 3], r[i * 6 + 4], r[i * 6 + 5]]).toEqual([x, y, z]);
    }
  });
});
