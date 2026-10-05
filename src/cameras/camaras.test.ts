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
import { encuadreDeCabina } from "./dentro";
import { mirarSinPerderNada } from "./fuera";
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
    stallWarning: false,
    stallWarningAlpha: Math.PI,
    crashed: false,
    secondsToImpact: Infinity,
    ...cambios,
  }) as FlightState;

const contexto = (cambios: Partial<Contexto> = {}): Contexto => ({
  aircraft: { wingSpan: 11, chord: 1.5, largo: 8.2 },
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

/*
 * «Algo más cerca y algo más baja en tierra», pedido para ver levantarse los
 * frenos de tierra del JAZ 120 y del JAZ 90, que desde ciento dos metros eran
 * dos o tres píxeles de canto. Solo en el avión que los lleva, y sin saltos al
 * tocar ni al despegar.
 */
describe("la de detrás, en tierra, en los que llevan frenos de tierra", () => {
  const grande = { wingSpan: 59.64, chord: 8.32, largo: 64 };
  /** La JAZ 120 en la pista, parada. */
  const enTierra = (cambios: Partial<FlightState> = {}) =>
    avion({
      position: new Vector3(0, 6, 0),
      velocity: new Vector3(0, 0, 0),
      airspeed: 0,
      onGround: true,
      heightAboveGround: 6,
      ...cambios,
    });
  /** Dónde está la cámara respecto del avión, sin el traqueteo ni la mirada. */
  const dondeVa = (camara: PerspectiveCamera, state: FlightState) =>
    camara.position.clone().sub(state.position);

  it("sin frenos de tierra en el modelo, va donde fue siempre", () => {
    const state = enTierra();
    const ctx = contexto({ aircraft: grande, movimientoReducido: true });
    const camara = volar(construirCamaras().chase, state, ctx, 600);
    expect(dondeVa(camara, state).z).toBeCloseTo(59.64 * 1.6, 0);
  });

  it("con ellos recogidos, se acerca sin cambiar el ángulo desde el que mira", () => {
    const state = enTierra();
    const ctx = contexto({ aircraft: grande, movimientoReducido: true, frenosDeTierra: 0 });
    const d = dondeVa(volar(construirCamaras().chase, state, ctx, 600), state);
    expect(d.z).toBeLessThan(59.64 * 1.35);
    expect(d.z).toBeGreaterThan(59.64 * 1.0);
    expect(Math.atan2(d.y, d.z)).toBeCloseTo(Math.atan2(0.6, 1.6), 2);
  });

  it("y con ellos fuera, más baja", () => {
    const state = enTierra();
    const ctx = contexto({ aircraft: grande, movimientoReducido: true, frenosDeTierra: 1 });
    const d = dondeVa(volar(construirCamaras().chase, state, ctx, 600), state);
    const grados = (Math.atan2(d.y, d.z) * 180) / Math.PI;
    expect(grados).toBeLessThan(15);
    expect(grados).toBeGreaterThan(10);
  });

  it("volando, aunque los lleve, donde siempre", () => {
    const ctx = contexto({ aircraft: grande, movimientoReducido: true, frenosDeTierra: 0 });
    const state = avion();
    const camara = volar(construirCamaras().chase, state, ctx, 600);
    expect(dondeVa(camara, state).z).toBeCloseTo(59.64 * 1.6, 0);
  });

  it("al tocar y al despegar se mueve sin saltos", () => {
    const rig = construirCamaras().chase;
    const camara = new PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 1e6);
    const ctx = contexto({ aircraft: grande, movimientoReducido: true, frenosDeTierra: 0 });
    const dt = 1 / 60;
    let antes: Vector3 | null = null;
    let salto = 0;
    // Corriendo a setenta metros por segundo por la pista, como al tocar.
    const velocidad = new Vector3(0, 0, -70);
    const donde = new Vector3(0, 6, 0);
    const paso = (suelo: boolean, frenos: number, medir = true) => {
      donde.addScaledVector(velocidad, dt);
      const state = enTierra({
        position: donde.clone(),
        velocity: velocidad,
        airspeed: 70,
        onGround: suelo,
      });
      rig.update(camara, state, dt, { ...ctx, frenosDeTierra: frenos });
      const d = dondeVa(camara, state);
      if (antes && medir) salto = Math.max(salto, d.distanceTo(antes));
      antes = d;
    };
    // Volando, asentada —lo que tarda en llegar desde el origen no cuenta—;
    // tocando, con los frenos saliendo en un segundo; y despegando otra vez.
    for (let i = 0; i < 300; i++) paso(false, 0, false);
    for (let i = 0; i < 360; i++) paso(true, Math.min(1, i / 60));
    for (let i = 0; i < 360; i++) paso(false, 0);
    // Treinta metros de acercamiento en dos segundos y medio son unos veinte
    // centímetros por fotograma; un tirón serían metros.
    expect(salto).toBeLessThan(0.6);
  });

  it("y en la carrera, a setenta metros por segundo, no se queda atrás", () => {
    const ctx = contexto({ aircraft: grande, movimientoReducido: true, frenosDeTierra: 1 });
    const rig = construirCamaras().chase;
    const camara = new PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 1e6);
    const dt = 1 / 60;
    const velocidad = new Vector3(0, 0, -70);
    let state = enTierra({ velocity: velocidad, airspeed: 70 });
    for (let i = 0; i < 600; i++) {
      state = enTierra({
        position: state.position.clone().addScaledVector(velocidad, dt),
        velocity: velocidad,
        airspeed: 70,
      });
      rig.update(camara, state, dt, ctx);
    }
    const parado = enTierra();
    const quieta = volar(construirCamaras().chase, parado, ctx, 600);
    // Donde la pondría parado, a menos de un metro: sin los diez de retraso.
    expect(dondeVa(camara, state).distanceTo(dondeVa(quieta, parado))).toBeLessThan(1);
  });

  it("y abriendo el juego en tierra ya está cerca, sin acercarse delante de nadie", () => {
    const state = enTierra();
    const ctx = contexto({ aircraft: grande, movimientoReducido: true, frenosDeTierra: 0 });
    const rig = construirCamaras().chase;
    const camara = new PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 1e6);
    // Un fotograma para la posición deseada; el suavizado de la posición la
    // lleva luego, como siempre.
    for (let i = 0; i < 120; i++) rig.update(camara, state, 1 / 60, ctx);
    expect(dondeVa(camara, state).z).toBeLessThan(59.64 * 1.35);
  });
});

/*
 * «No veo el cielo cuando estoy en la pista; está bien ver algo de horizonte,
 * porque parece que va uno encajonado.» Parada en la pista, la de cola miraba
 * al avión desde arriba, y con el cuadro abierto el cielo quedaba fuera.
 */
describe("la vista de detrás deja ver el horizonte", () => {
  const grado = Math.PI / 180;

  it("parado, levanta la vista hasta dejar el horizonte dentro", () => {
    const state = avion({
      position: new Vector3(0, 2, 0),
      velocity: new Vector3(0, 0, 0),
      airspeed: 0,
      onGround: true,
      heightAboveGround: 2,
    });
    const bajada = 10 * grado;
    const camara = volar(
      construirCamaras().chase,
      state,
      contexto({ suelo: () => 0, bajadaMaxima: bajada }),
    );
    const aDondeMira = new Vector3(0, 0, -1).applyQuaternion(camara.quaternion);
    expect(Math.asin(aDondeMira.y)).toBeGreaterThanOrEqual(-bajada - 1e-3);
  });

  it("y si no caben el horizonte y el avión, gana el avión", () => {
    // El avión, veinte grados por debajo; la franja, pequeña.
    const al = mirarSinPerderNada(-20 * grado, -20 * grado, 4 * grado, 6 * grado, 9 * grado);
    expect(al).toBeCloseTo(-11 * grado);
  });

  it("y si caben, el horizonte manda sobre mirar al avión", () => {
    const al = mirarSinPerderNada(-14 * grado, -18 * grado, 4 * grado, 10 * grado, 13 * grado);
    expect(al).toBeCloseTo(-10 * grado);
  });

  it("volando y mirando lejos, no toca nada", () => {
    const al = mirarSinPerderNada(-3 * grado, -6 * grado, 4 * grado, 10 * grado, 13 * grado);
    expect(al).toBeCloseTo(-3 * grado);
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

/*
 * ── La cámara de costado encuadra el avión que hay ─────────────────────────
 *
 * Se colocaba por la envergadura, y de costado lo que ocupa la pantalla es el
 * largo. Las dos no guardan proporción a lo largo de la flota: la avioneta
 * mide once de ala y ocho de morro a cola; el regional, veintiséis y
 * veintiséis. Así que una distancia sacada de la envergadura encuadraba bien a
 * la avioneta y metía la cámara dentro del regional — lo que se veía era una
 * plancha gris con la deriva asomando. Dicho jugando con el JAZ 90: «¿me has
 * vuelto a poner los aviones asquerosamente diseñados de hace semanas?», y era
 * el modelo de siempre visto desde dos metros.
 */
describe("la cámara de costado encuadra el avión que hay", () => {
  const aLado = (a: { wingSpan: number; largo: number }): number => {
    const ctx = contexto({
      aircraft: { wingSpan: a.wingSpan, chord: 1.5, largo: a.largo },
    });
    const cam = volar(construirCamaras().wing, avion(), ctx);
    return Math.hypot(cam.position.x, cam.position.z);
  };

  it("manda el largo, no la envergadura", () => {
    // Misma ala, distinto fuselaje: la cámara tiene que separarse.
    expect(aLado({ wingSpan: 11, largo: 26 })).toBeGreaterThan(
      aLado({ wingSpan: 11, largo: 8 }) * 2.5,
    );
    // Mismo fuselaje, distinta ala: la cámara se queda donde estaba.
    expect(aLado({ wingSpan: 30, largo: 8 })).toBeCloseTo(
      aLado({ wingSpan: 11, largo: 8 }),
      5,
    );
  });

  it("y los dos extremos de la flota quedan igual de lejos en proporción", () => {
    const avioneta = aLado({ wingSpan: 11, largo: 9 }) / 9;
    const regional = aLado({ wingSpan: 26, largo: 31 }) / 31;
    // Tres decimales y no cinco: lo que queda por debajo es el suavizado de
    // la cámara terminando de posarse, no una diferencia de encuadre.
    expect(regional).toBeCloseTo(avioneta, 3);
  });

  it("y nunca dentro del avión", () => {
    for (const a of [
      { wingSpan: 11, largo: 9 },
      { wingSpan: 26, largo: 31 },
      { wingSpan: 60, largo: 70 },
    ]) {
      // Más lejos que el propio avión: dentro de esa distancia la cámara está
      // pegada al fuselaje, que es exactamente lo que se veía.
      expect(aLado(a)).toBeGreaterThan(a.largo);
    }
  });
});

/*
 * ── La de frente tiene que ver el avión ────────────────────────────────────
 *
 * Pedida así: «un POV para ver el avión de frente, podría quedar bonito». La
 * primera versión la puso delante y le dejó la mira de las demás —un poco por
 * delante del avión, hacia donde va—, y desde delante eso apunta al horizonte
 * **de espaldas al avión**: en captura, pantalla vacía de día y de noche.
 */
describe("la vista de frente", () => {
  it("se pone delante del avión", () => {
    const camara = volar(construirCamaras().morro, avion(), contexto());
    // El avión mira al norte —z negativa—, así que delante es z negativa.
    expect(camara.position.z).toBeLessThan(-10);
  });

  it("y mira al avión, que es lo único que tiene que salir", () => {
    const state = avion();
    const camara = volar(construirCamaras().morro, state, contexto());
    const haciaElAvion = state.position
      .clone()
      .sub(camara.position)
      .normalize();
    const aDondeMira = new Vector3(0, 0, -1).applyQuaternion(camara.quaternion);
    // Alineadas: el avión en el centro del cuadro y no a la espalda.
    expect(aDondeMira.dot(haciaElAvion)).toBeGreaterThan(0.99);
  });

  it("y acelerando no se la traga el avión", () => {
    /*
     * El retroceso por aceleración empuja la cámara hacia atrás en el marco
     * del avión, y delante «atrás» es hacia el morro. En un despegue a tope
     * eso se comía la separación entera.
     */
    const ctx = contexto();
    const rig = construirCamaras().morro;
    const camara = new PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 1e6);
    let v = 0;
    for (let i = 0; i < 240; i++) {
      v += 6 / 60;
      rig.update(camara, avion({ airspeed: v }), 1 / 60, ctx);
    }
    const separacion = Math.hypot(camara.position.x, camara.position.z);
    expect(separacion).toBeGreaterThan(20);
  });
});

describe("el encuadre de la cabina", () => {
  const grados = (r: number) => (r * 180) / Math.PI;
  const avioneta = { visera: 0.02, lados: 0.4, abajo: 0.55 };
  it("deja la visera en el mismo sitio de la pantalla en cualquier avión", () => {
    const a = encuadreDeCabina(avioneta, 1.6);
    const b = encuadreDeCabina({ ...avioneta, visera: 0.02 + (15 * Math.PI) / 180, abajo: 0.8 }, 1.6);
    expect(grados(b.inclinacion - a.inclinacion)).toBeCloseTo(15);
    expect(a.fov).toBe(FOV_DE_CABINA);
  });
  it("si los instrumentos no caben a lo ancho, abre el ángulo en vez de cortarlos", () => {
    const reactor = { visera: 0.05, lados: 1.0, abajo: 0.6 };
    const tablet = encuadreDeCabina(reactor, 1.6);
    const telefono = encuadreDeCabina(reactor, 915 / 412);
    expect(tablet.fov).toBeGreaterThan(FOV_DE_CABINA);
    const t = Math.tan(((tablet.fov / 2) * Math.PI) / 180);
    expect(reactor.lados).toBeLessThanOrEqual(1.6 * t);
    // En el teléfono, más apaisado, ya caben con el de siempre.
    expect(telefono.fov).toBe(FOV_DE_CABINA);
  });
  it("sin cabina que medir, lo de siempre", () => {
    const r = encuadreDeCabina(undefined, 1.6);
    expect(grados(r.inclinacion)).toBeCloseTo(12);
    expect(r.fov).toBe(FOV_DE_CABINA);
  });
});
