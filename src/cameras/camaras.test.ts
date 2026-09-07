/**
 * Las vistas, ahora que se pueden mirar de una en una.
 *
 * Antes esto eran tres `if` dentro de un método de cien líneas de `game.ts` y
 * la única forma de comprobar una era arrancar el juego entero y sacar una
 * captura. Lo que se comprueba aquí es lo que se rompía sin que nadie se
 * enterara: que la de detrás **mira lejos y no al avión** —que es lo que
 * tapaba la pista en corta final—, que la de cabina va pegada al piloto sin
 * suavizar nada, y que ninguna se mete debajo del terreno.
 */

import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";

import { construirCamaras, type Contexto } from "./index";
import { BASE_FOV, FOV_DE_CABINA } from "./tipos";
import type { FlightState } from "../flight/model";

/** Un avión volando hacia el norte, o parado si se le quita la velocidad. */
const avion = (cambios: Partial<FlightState> = {}): FlightState =>
  ({
    position: new Vector3(0, 100, 0),
    velocity: new Vector3(0, 0, -50),
    orientation: new Quaternion(),
    rollRate: 0,
    pitchRate: 0,
    yawRate: 0,
    airspeed: 50,
    alpha: 0,
    beta: 0,
    heightAboveGround: 100,
    onRunway: false,
    verticalSpeed: 0,
    loadFactor: 1,
    heading: 0,
    onGround: false,
    stalled: false,
    crashed: false,
    secondsToImpact: Infinity,
    ...cambios,
  }) as FlightState;

const contexto = (cambios: Partial<Contexto> = {}): Contexto => ({
  aircraft: { wingSpan: 11, chord: 1.5 },
  ojo: null,
  suelo: () => 0,
  movimientoReducido: false,
  traqueteo: 1,
  ...cambios,
});

/** Deja que la cámara se asiente: el suavizado tarda unos fotogramas. */
function volar(
  rig: ReturnType<typeof construirCamaras>[keyof ReturnType<
    typeof construirCamaras
  >],
  state: FlightState,
  ctx: Contexto,
  cuantos = 90,
): PerspectiveCamera {
  const camara = new PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 1e6);
  for (let i = 0; i < cuantos; i++) rig.update(camara, state, 1 / 60, ctx);
  return camara;
}

describe("la vista de cabina", () => {
  it("va donde el modelo dice que están los ojos, sin suavizar nada", () => {
    const c = construirCamaras().cockpit;
    const camara = new PerspectiveCamera();
    const ojo = { x: 0.3, y: 1.2, z: -0.8 };
    // Un solo fotograma: desde dentro no hay retardo que valga, la cámara es
    // la cabeza del piloto.
    c.update(camara, avion(), 1 / 60, contexto({ ojo }));
    expect(camara.position.x).toBeCloseTo(0.3, 5);
    expect(camara.position.y).toBeCloseTo(101.2, 5);
    expect(camara.position.z).toBeCloseTo(-0.8, 5);
  });

  it("sin modelo con asientos, se sitúa sobre la cuerda del ala", () => {
    const c = construirCamaras().cockpit;
    const camara = new PerspectiveCamera();
    c.update(camara, avion(), 1 / 60, contexto());
    // 1,5 de cuerda: 0,825 arriba y 0,6 hacia delante.
    expect(camara.position.y).toBeCloseTo(100.825, 3);
    expect(camara.position.z).toBeCloseTo(-0.6, 3);
  });

  it("cierra el ángulo, que si no se vuela por una rendija", () => {
    const camaras = construirCamaras();
    expect(camaras.cockpit.fovDeseado(avion(), contexto())).toBe(FOV_DE_CABINA);
    // Y la de pájaro no: es una vista de fuera puesta en el sitio de dentro.
    expect(camaras.pajaro.fovDeseado(avion(), contexto())).toBeGreaterThan(
      BASE_FOV,
    );
  });

  it("la de pájaro esconde el avión y la de cabina no", () => {
    const camaras = construirCamaras();
    expect(camaras.pajaro.muestraElAvion).toBe(false);
    expect(camaras.cockpit.muestraElAvion).toBe(true);
  });
});

describe("la vista de detrás", () => {
  it("se pone detrás y por encima del avión", () => {
    const camara = volar(construirCamaras().chase, avion(), contexto());
    // El avión mira al norte —z negativa—, así que detrás es z positiva.
    expect(camara.position.z).toBeGreaterThan(10);
    expect(camara.position.y).toBeGreaterThan(100);
  });

  it("mira lejos y no al avión, que es lo que tapaba la pista", () => {
    // Con la mira puesta en el avión, el fuselaje se queda clavado en el
    // centro del cuadro justo encima de la pista: «no se ve dónde tengo que
    // tomar tierra». Así que la línea de visión tiene que pasar **por encima**
    // del avión, no a través de él.
    const state = avion();
    const camara = volar(construirCamaras().chase, state, contexto());
    const haciaElAvion = state.position
      .clone()
      .sub(camara.position)
      .normalize();
    const aDondeMira = new Vector3(0, 0, -1).applyQuaternion(camara.quaternion);
    // Mirando más abajo que el avión: el avión cae en la parte baja del cuadro.
    expect(aDondeMira.y).toBeGreaterThan(haciaElAvion.y);
  });

  it("no se mete debajo del terreno", () => {
    // Volando a ras, la cámara de detrás se metería dentro de la loma.
    const state = avion({
      position: new Vector3(0, 1, 0),
      heightAboveGround: 1,
    });
    const camara = volar(
      construirCamaras().chase,
      state,
      contexto({ suelo: () => 0 }),
    );
    expect(camara.position.y).toBeGreaterThanOrEqual(3);
  });

  it("con el avión quieto sigue mirando a alguna parte", () => {
    // Sin velocidad no hay dirección que seguir, y `normalize` de un vector
    // nulo es un NaN que deja la cámara sin orientación para siempre.
    const state = avion({ velocity: new Vector3(0, 0, 0), airspeed: 0 });
    const camara = volar(construirCamaras().chase, state, contexto());
    expect(Number.isFinite(camara.position.x)).toBe(true);
    expect(Number.isFinite(camara.quaternion.x)).toBe(true);
  });
});

describe("las dos vistas de ala", () => {
  it("miran desde costados opuestos y a la misma altura", () => {
    const camaras = construirCamaras();
    const der = volar(camaras.wing, avion(), contexto());
    const izq = volar(camaras.izquierda, avion(), contexto());
    expect(der.position.x).toBeGreaterThan(5);
    expect(izq.position.x).toBeLessThan(-5);
    expect(der.position.x).toBeCloseTo(-izq.position.x, 3);
    expect(der.position.y).toBeCloseTo(izq.position.y, 3);
  });
});

describe("el traqueteo", () => {
  /** Cuánto se mueve la cámara en el sitio, rodando por el suelo. */
  const tiembla = (ctx: Contexto): number => {
    const rig = construirCamaras().chase;
    const state = avion({
      position: new Vector3(0, 2, 0),
      velocity: new Vector3(0, 0, -25),
      airspeed: 25,
      onGround: true,
      heightAboveGround: 0,
    });
    const camara = volar(rig, state, ctx, 120);
    let peor = 0;
    let antes = camara.position.y;
    for (let i = 0; i < 60; i++) {
      rig.update(camara, state, 1 / 60, ctx);
      peor = Math.max(peor, Math.abs(camara.position.y - antes));
      antes = camara.position.y;
    }
    return peor;
  };

  it("el campo sacude más que el asfalto", () => {
    expect(tiembla(contexto({ traqueteo: 3 }))).toBeGreaterThan(
      tiembla(contexto({ traqueteo: 1 })),
    );
  });

  it("con movimiento reducido no sacude nada", () => {
    // No es cero exacto: lo que queda es el suavizado terminando de posarse,
    // una millonésima de metro. El traqueteo son cuatro centímetros.
    expect(
      tiembla(contexto({ traqueteo: 3, movimientoReducido: true })),
    ).toBeLessThan(1e-4);
  });
});
