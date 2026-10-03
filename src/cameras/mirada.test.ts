/**
 * Mirar sin soltar los mandos, comprobado sin navegador.
 *
 * Lo que se pidió fueron dos cosas —«no puedo mirar hacia donde está el objeto
 * nombrado por la comandante» y que vuelva sola— y lo que las rompe sin que
 * nadie se entere es esto: un signo cambiado que manda la cámara al otro lado,
 * un muelle que se pasa y deja la vista bailando, un giro que se suma consigo
 * mismo, o una cámara que da la vuelta al avión y se mete en el suelo. Y la que
 * importa de verdad: que lo señalado **quede dentro del cuadro**, mire desde
 * donde se mire.
 */
import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";

import {
  comoSeMiraDesde,
  construirCamaras,
  esDePasaje,
  siguienteVista,
  vistasDe,
  CAMERA_MODES,
  type CameraMode,
  type Contexto,
} from "./index";
import {
  asomarse,
  darLaVuelta,
  girarLaCabeza,
  giroDeCabezaHacia,
  giroDeVueltaHacia,
  giroParaQueSeVea,
  MiradaLibre,
  SE_QUEDA,
  TOPES,
} from "./mirada";
import { escucharLaMirada, UMBRAL, yaEsArrastre } from "./dedo-que-mira";
import { asientoAnteVentanilla } from "../world/asiento-de-pasaje";
import { seVePorLaVentanilla } from "../world/marco-de-ventanilla";
import { CAMPO_DEL_PASAJE } from "../world/hitos";
import type { FlightState } from "../flight/model";

const GRADO = Math.PI / 180;

/** Un avión volando hacia el norte —la Z negativa— a tres mil metros. */
const avion = (cambios: Partial<FlightState> = {}): FlightState =>
  ({
    position: new Vector3(0, 3000, 0),
    velocity: new Vector3(0, 0, -120),
    orientation: new Quaternion(),
    rollRate: 0,
    pitchRate: 0,
    yawRate: 0,
    airspeed: 120,
    alpha: 0,
    beta: 0,
    heightAboveGround: 3000,
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

/**
 * El asiento de ventanilla del JAZ 90, como lo mide el modelo: el cristal en
 * la piel a metro y medio del eje, la pared inclinada dieciséis grados.
 */
const asiento = (lado: "izquierda" | "derecha") => {
  const s = lado === "izquierda" ? -1 : 1;
  return asientoAnteVentanilla(
    {
      centro: { x: s * 1.49, y: 0.52, z: -1.57 },
      normal: { x: s * Math.cos(16 * GRADO), y: Math.sin(16 * GRADO), z: 0 },
      ancho: 0.27,
      alto: 0.4,
    },
    lado,
  );
};

const contexto = (cambios: Partial<Contexto> = {}): Contexto => ({
  aircraft: { wingSpan: 26, chord: 3, largo: 31 },
  ojo: { x: -0.5, y: 1.2, z: -13 },
  suelo: () => 0,
  movimientoReducido: false,
  traqueteo: 1,
  pasaje: { izquierda: asiento("izquierda"), derecha: asiento("derecha") },
  ...cambios,
});

/**
 * **Vuela unos segundos mirando lo señalado**, como lo hace el juego: la
 * vista pone la cámara, la mirada calcula hacia dónde queda el punto y se
 * aplica el giro encima. Devuelve dónde cae el punto en la pantalla.
 */
function mirarHacia(
  modo: CameraMode,
  punto: Vector3,
  state = avion(),
  segundos = 3,
): {
  x: number;
  y: number;
  delante: boolean;
  porElCristal: boolean | null;
  mirada: MiradaLibre;
  camara: PerspectiveCamera;
} {
  const rig = construirCamaras()[modo];
  const ctx = contexto();
  const camara = new PerspectiveCamera(62, 915 / 412, 0.6, 2e5);
  const mirada = new MiradaLibre();
  const { como, topes } = comoSeMiraDesde(modo);
  mirada.ponerTopes(topes);
  const pose = { p: new Vector3(), q: new Quaternion(), puesta: false };
  const sentado =
    modo === "pasaje-izquierda" ? asiento("izquierda") : modo === "pasaje-derecha" ? asiento("derecha") : null;
  const dt = 1 / 60;
  // Primero la vista asentada, sin mirar nada.
  for (let i = 0; i < 120; i++) rig.update(camara, state, dt, ctx);
  mirada.empezarAMirar();
  for (let i = 0; i < segundos * 60; i++) {
    if (pose.puesta) {
      camara.position.copy(pose.p);
      camara.quaternion.copy(pose.q);
    }
    rig.update(camara, state, dt, ctx);
    pose.p.copy(camara.position);
    pose.q.copy(camara.quaternion);
    pose.puesta = true;
    mirada.apuntarA(
      como === "cabeza"
        ? giroDeCabezaHacia(camara, state.orientation, punto)
        : giroDeVueltaHacia(camara, state.position, punto),
    );
    mirada.paso(dt);
    const giro = { guinada: mirada.guinada, cabeceo: mirada.cabeceo };
    // Como el juego: en el pasaje se asoma uno al cristal.
    if (sentado) asomarse(camara, state.orientation, sentado, giro);
    else if (como === "cabeza") girarLaCabeza(camara, state.orientation, giro);
    else darLaVuelta(camara, state.position, giro, () => 0);
  }
  camara.updateMatrixWorld();
  const delante = punto.clone().applyMatrix4(camara.matrixWorldInverse).z < 0;
  const p = punto.clone().project(camara);
  const porElCristal = sentado
    ? seVePorLaVentanilla(camara.position, punto, state, sentado.ventanilla)
    : null;
  return { x: p.x, y: p.y, delante, porElCristal, mirada, camara };
}

/** El Teide visto desde el norte de Tenerife: a la izquierda y algo por debajo. */
const TEIDE = new Vector3(-30_000, 3715, 12_000);

describe("girarse hacia lo que se señala", () => {
  for (const modo of ["chase", "cockpit", "wing", "izquierda", "morro", "pajaro"] as const) {
    it(`desde ${modo}, lo señalado queda dentro del cuadro`, () => {
      const r = mirarHacia(modo, TEIDE);
      expect(r.delante).toBe(true);
      // Dentro, y bien dentro: no rozando el borde.
      expect(Math.abs(r.x)).toBeLessThan(0.6);
      expect(Math.abs(r.y)).toBeLessThan(0.6);
    });
  }

  it("desde la ventanilla de su lado, también, y por el cristal", () => {
    // Un sitio por el través izquierdo y abajo, que es lo que se ve por una
    // ventanilla: un río a veinte kilómetros.
    const rio = new Vector3(-20_000, 100, 2_000);
    const r = mirarHacia("pasaje-izquierda", rio);
    expect(r.delante).toBe(true);
    expect(Math.abs(r.x)).toBeLessThan(0.6);
    expect(Math.abs(r.y)).toBeLessThan(0.6);
    expect(r.porElCristal).toBe(true);
  });

  it("y lo que va por delante del través, asomándose: no detrás de la pared", () => {
    /*
     * Lo que pasó en el teléfono: el Teide a cincuenta grados del morro, la
     * cabeza girada hacia él y en el centro de la pantalla, la pared. Girando
     * solo la cabeza el cristal se queda a un lado; asomándose, se mira a
     * través de él.
     */
    const a = 50 * GRADO;
    const teide = new Vector3(-Math.sin(a) * 30_000, 3715, -Math.cos(a) * 30_000);
    const r = mirarHacia("pasaje-izquierda", teide);
    expect(Math.abs(r.x)).toBeLessThan(0.6);
    expect(r.porElCristal).toBe(true);
  });

  /*
   * **Lo que la comandante puede señalar, se puede mirar.** Ella solo cuenta
   * lo que cae en el campo de la ventanilla del pasaje —ver
   * `CAMPO_DEL_PASAJE`—, y eso tiene que poder verse por el cristal de ese
   * lado, en sus cuatro esquinas: lo más adelantado, lo de más atrás, lo más
   * alto y lo más bajo. Con la ventanilla más estrecha de la flota, la del
   * JAZ 90.
   */
  for (const lado of ["izquierda", "derecha"] as const)
    it(`todo lo que se cuenta con pasaje se ve por la ventanilla de la ${lado}`, () => {
      const s = lado === "izquierda" ? -1 : 1;
      const c = CAMPO_DEL_PASAJE;
      for (const desdeElMorro of [c.desde, (c.desde + c.hasta) / 2, c.hasta])
        for (const altura of [c.arriba!, 0, -c.abajo!]) {
          const a = desdeElMorro * GRADO;
          const lejos = 30_000;
          const p = new Vector3(
            s * Math.sin(a) * lejos,
            3000 + Math.tan(altura * GRADO) * lejos,
            -Math.cos(a) * lejos,
          );
          const r = mirarHacia(`pasaje-${lado}`, p);
          const donde = `${desdeElMorro}° del morro, ${altura}° de altura`;
          expect(r.porElCristal, donde).toBe(true);
          expect(Math.abs(r.x), donde).toBeLessThan(0.85);
          expect(Math.abs(r.y), donde).toBeLessThan(0.85);
        }
    });

  it("sin girar nada, los ojos se quedan donde los pone el asiento", () => {
    const camara = new PerspectiveCamera();
    const s = asiento("derecha");
    camara.position.set(s.ojo.x, s.ojo.y, s.ojo.z);
    asomarse(camara, new Quaternion(), s, { guinada: 0, cabeceo: 0 });
    expect(camara.position.toArray()).toEqual([s.ojo.x, s.ojo.y, s.ojo.z]);
    // Y con un giro de nada, casi donde estaban: sin saltos al empezar.
    asomarse(camara, new Quaternion(), s, { guinada: 0.001, cabeceo: 0 });
    expect(camara.position.distanceTo(new Vector3(s.ojo.x, s.ojo.y, s.ojo.z))).toBeLessThan(0.002);
  });

  it("y por la ventanilla no se gira más de lo que deja la ventanilla", () => {
    // Casi delante del morro: por una ventanilla del costado no se ve, y la
    // cabeza se queda en su tope en vez de atravesar la pared.
    const r = mirarHacia("pasaje-izquierda", new Vector3(-3_000, 3000, -30_000));
    expect(Math.abs(r.mirada.guinada)).toBeLessThanOrEqual(TOPES.pasaje.derecha + 1e-9);
  });

  it("el signo: lo de la izquierda se mira girando a la izquierda", () => {
    const r = mirarHacia("cockpit", TEIDE);
    expect(r.mirada.guinada).toBeGreaterThan(0);
    const d = mirarHacia("cockpit", new Vector3(30_000, 3000, 12_000));
    expect(d.mirada.guinada).toBeLessThan(0);
  });

  it("y con el avión ladeado, sigue encontrándolo", () => {
    // Treinta grados de alabeo a la derecha: la cabeza gira con el avión y
    // la cuenta tiene que deshacerlo.
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -30 * GRADO);
    const r = mirarHacia("cockpit", TEIDE, avion({ orientation: q }));
    expect(r.delante).toBe(true);
    expect(Math.abs(r.x)).toBeLessThan(0.6);
    expect(Math.abs(r.y)).toBeLessThan(0.6);
  });

  it("se queda un rato y vuelve sola", () => {
    const m = new MiradaLibre();
    m.ponerTopes(TOPES.cabina);
    m.empezarAMirar();
    for (let i = 0; i < 120; i++) {
      m.apuntarA({ guinada: 1.2, cabeceo: -0.1 });
      m.paso(1 / 60);
    }
    expect(m.guinada).toBeGreaterThan(1);
    // Pasado su rato, vuelve a cero sin que nadie haga nada.
    for (let i = 0; i < (SE_QUEDA + 3) * 60; i++) {
      m.apuntarA({ guinada: 1.2, cabeceo: -0.1 });
      m.paso(1 / 60);
    }
    expect(m.apuntando).toBe(false);
    expect(Math.abs(m.guinada)).toBeLessThan(0.01);
  });
});

/*
 * ── Y desde fuera, que se vea al señalarse ────────────────────────────────
 *
 * Desde la vista de detrás, el Teide que la comandante acababa de señalar
 * quedaba justo detrás del avión, o fuera del cuadro a un costado. Al
 * señalarse, la cámara gira un poco o sube lo justo: ver `giroParaQueSeVea`.
 */
describe("dejar a la vista lo señalado, desde detrás", () => {
  /** Lo que mide el bulto del avión de prueba: un tercio de su largo. */
  const BULTO = 31 * 0.3;

  /**
   * La vista de detrás asentada, y unos segundos de encuadre como lo hace el
   * juego. Devuelve el giro que pidió al empezar, dónde cae lo señalado en la
   * pantalla y cuánto se aparta del avión, en radianes, visto desde la cámara.
   */
  function encuadrar(punto: (camara: PerspectiveCamera) => Vector3, state = avion()) {
    const rig = construirCamaras().chase;
    const ctx = contexto();
    const camara = new PerspectiveCamera(62, 16 / 9, 0.6, 2e5);
    const mirada = new MiradaLibre();
    mirada.ponerTopes(TOPES.fuera);
    const dt = 1 / 60;
    for (let i = 0; i < 180; i++) rig.update(camara, state, dt, ctx);
    const pose = { p: camara.position.clone(), q: camara.quaternion.clone() };
    const sitio = punto(camara);
    const pedido = giroParaQueSeVea(camara, state.position, BULTO, sitio);
    mirada.empezarAMirar();
    for (let i = 0; i < 4 * 60; i++) {
      camara.position.copy(pose.p);
      camara.quaternion.copy(pose.q);
      rig.update(camara, state, dt, ctx);
      pose.p.copy(camara.position);
      pose.q.copy(camara.quaternion);
      mirada.apuntarA(giroParaQueSeVea(camara, state.position, BULTO, sitio));
      mirada.paso(dt);
      darLaVuelta(camara, state.position, { guinada: mirada.guinada, cabeceo: mirada.cabeceo }, () => 0);
    }
    camara.updateMatrixWorld();
    const p = sitio.clone().project(camara);
    const haciaSitio = sitio.clone().sub(camara.position).normalize();
    const haciaAvion = state.position.clone().sub(camara.position).normalize();
    return { pedido, x: p.x, y: p.y, delante: p.z < 1, aparte: haciaSitio.angleTo(haciaAvion) };
  }

  it("lo que queda justo detrás del avión, asoma por encima o a un lado", () => {
    // En la línea de la cámara al avión, kilómetros más allá: tapado.
    const r = encuadrar((c) =>
      c.position.clone().add(avion().position.clone().sub(c.position).multiplyScalar(300)),
    );
    expect(Math.hypot(r.pedido.guinada, r.pedido.cabeceo)).toBeGreaterThan(GRADO);
    expect(r.delante).toBe(true);
    expect(Math.abs(r.x)).toBeLessThan(0.85);
    expect(Math.abs(r.y)).toBeLessThan(0.85);
    // Apartado del avión más de lo que mide el avión visto desde aquí: la
    // cámara de detrás va a unos cuarenta y cinco metros de este.
    expect(r.aparte).toBeGreaterThan(Math.asin(BULTO / 45));
  });

  it("lo que cae fuera del cuadro, a un costado, entra; girando lo justo y no hasta el centro", () => {
    const a = 75 * GRADO;
    const r = encuadrar(() => new Vector3(Math.sin(a) * 30_000, 2500, -Math.cos(a) * 30_000));
    expect(r.delante).toBe(true);
    expect(Math.abs(r.x)).toBeLessThan(0.85);
    // Lo justo: queda hacia el borde de su lado, no en el centro.
    expect(r.x).toBeGreaterThan(0.4);
    // A la derecha, la vuelta es a la derecha: guiñada negativa.
    expect(r.pedido.guinada).toBeLessThan(0);
  });

  it("y lo que ya se ve no mueve nada", () => {
    const a = 20 * GRADO;
    const r = encuadrar(() => new Vector3(-Math.sin(a) * 30_000, 3600, -Math.cos(a) * 30_000));
    expect(Math.abs(r.pedido.guinada)).toBeLessThan(1e-6);
    expect(Math.abs(r.pedido.cabeceo)).toBeLessThan(1e-6);
  });

  it("y en un viraje, con la cámara a la altura del avión, tampoco lo tapa", () => {
    // Veinticinco grados de alabeo: la cámara de detrás se va con el lomo.
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -25 * GRADO);
    const state = avion({ orientation: q });
    const r = encuadrar(
      (c) => c.position.clone().add(state.position.clone().sub(c.position).multiplyScalar(300)),
      state,
    );
    expect(Math.abs(r.x)).toBeLessThan(0.85);
    expect(Math.abs(r.y)).toBeLessThan(0.85);
    expect(r.aparte).toBeGreaterThan(Math.asin(BULTO / 45));
  });
});

describe("arrastrar el paisaje", () => {
  it("el paisaje sigue al dedo: a la derecha es mirar a la izquierda", () => {
    const m = new MiradaLibre();
    m.ponerTopes(TOPES.cabina);
    m.arrastrar(0.3, 0.1);
    expect(m.guinada).toBeCloseTo(0.3);
    expect(m.cabeceo).toBeCloseTo(0.1);
    expect(m.agarrada).toBe(true);
  });

  it("al soltar vuelve sola, sin pasarse y sin tirón", () => {
    const m = new MiradaLibre();
    m.ponerTopes(TOPES.cabina);
    m.arrastrar(1.5, 0.4);
    m.soltar();
    let antes = m.guinada;
    let maxPaso = 0;
    for (let i = 0; i < 180; i++) {
      m.paso(1 / 60);
      // Siempre hacia cero, nunca al otro lado.
      expect(m.guinada).toBeGreaterThanOrEqual(-1e-6);
      expect(m.guinada).toBeLessThanOrEqual(antes + 1e-9);
      maxPaso = Math.max(maxPaso, antes - m.guinada);
      antes = m.guinada;
    }
    // En tres segundos, en su sitio.
    expect(m.enSuSitio).toBe(true);
    // Y sin tirón: ningún fotograma se lleva más de un décimo del camino.
    expect(maxPaso).toBeLessThan(0.15);
  });

  it("mientras se arrastra no vuelve: manda el dedo", () => {
    const m = new MiradaLibre();
    m.ponerTopes(TOPES.cabina);
    m.arrastrar(0.5, 0);
    for (let i = 0; i < 60; i++) m.paso(1 / 60);
    expect(m.guinada).toBeCloseTo(0.5);
  });

  it("agarrar el paisaje deja de mirar lo señalado", () => {
    const m = new MiradaLibre();
    m.ponerTopes(TOPES.cabina);
    m.empezarAMirar();
    m.arrastrar(0.1, 0);
    expect(m.apuntando).toBe(false);
  });

  it("cada vista con su tope, también lo que ya estaba girado", () => {
    const m = new MiradaLibre();
    m.ponerTopes(TOPES.cabina);
    m.arrastrar(2, 0);
    // Se pasa al pasaje con la cabeza girada a la cola: la ventanilla no
    // deja tanto.
    m.ponerTopes(TOPES.pasaje);
    m.paso(1 / 60);
    expect(m.guinada).toBeLessThanOrEqual(TOPES.pasaje.izquierda + 1e-9);
  });
});

describe("la vuelta al avión", () => {
  it("da la vuelta sin acercarse ni alejarse, y sin meterse en el suelo", () => {
    const camara = new PerspectiveCamera(62, 1.6, 0.6, 1e5);
    const centro = new Vector3(0, 10, 0);
    camara.position.set(0, 18, 40);
    camara.lookAt(0, 10, -100);
    const antes = camara.position.distanceTo(centro);
    darLaVuelta(camara, centro, { guinada: Math.PI / 2, cabeceo: 0 }, () => 0);
    expect(camara.position.distanceTo(centro)).toBeCloseTo(antes, 6);
    // Media vuelta a la izquierda: la cámara pasa al costado derecho y mira
    // hacia la izquierda.
    expect(camara.position.x).toBeGreaterThan(30);
    // Mirando hacia arriba la cámara baja; con el suelo a 15 m, se queda encima.
    camara.position.set(0, 18, 40);
    camara.lookAt(0, 10, -100);
    darLaVuelta(camara, centro, { guinada: 0, cabeceo: 0.4 }, () => 15);
    expect(camara.position.y).toBeGreaterThanOrEqual(17);
  });

  it("sin giro no toca nada", () => {
    const camara = new PerspectiveCamera();
    camara.position.set(1, 2, 3);
    camara.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), 0.3);
    const q = camara.quaternion.clone();
    darLaVuelta(camara, new Vector3(), { guinada: 0, cabeceo: 0 });
    girarLaCabeza(camara, new Quaternion(), { guinada: 0, cabeceo: 0 });
    expect(camara.quaternion.equals(q)).toBe(true);
    expect(camara.position.toArray()).toEqual([1, 2, 3]);
  });
});

describe("las vistas de pasaje", () => {
  it("solo en el avión que lleva pasaje", () => {
    expect(vistasDe(false).some(esDePasaje)).toBe(false);
    expect(vistasDe(true).filter(esDePasaje)).toEqual(["pasaje-izquierda", "pasaje-derecha"]);
  });

  it("la tecla se las salta en una avioneta, y las recorre con pasaje", () => {
    expect(siguienteVista("cockpit", false)).toBe("wing");
    expect(siguienteVista("cockpit", true)).toBe("pasaje-izquierda");
    expect(siguienteVista("pasaje-izquierda", true)).toBe("pasaje-derecha");
    expect(siguienteVista("pasaje-derecha", true)).toBe("wing");
    // La recordada de otro avión, en uno sin pasaje: sigue por donde caería.
    expect(siguienteVista("pasaje-izquierda", false)).toBe("wing");
    // Y la vuelta entera pasa por todas las que hay.
    let v: CameraMode = "chase";
    const vistas = new Set<CameraMode>();
    for (let i = 0; i < CAMERA_MODES.length; i++) vistas.add((v = siguienteVista(v, true)));
    expect(vistas.size).toBe(CAMERA_MODES.length);
  });

  it("se sienta donde dice el asiento y mira por la ventanilla", () => {
    const rig = construirCamaras()["pasaje-derecha"];
    const camara = new PerspectiveCamera();
    rig.update(camara, avion(), 1 / 60, contexto());
    const s = asiento("derecha");
    expect(camara.position.x).toBeCloseTo(s.ojo.x, 5);
    expect(camara.position.y).toBeCloseTo(3000 + s.ojo.y, 5);
    const mira = new Vector3(0, 0, -1).applyQuaternion(camara.quaternion);
    // A la derecha, un poco hacia la cola y un poco hacia abajo.
    expect(mira.x).toBeGreaterThan(0.9);
    expect(mira.z).toBeGreaterThan(0);
    expect(mira.y).toBeLessThan(0);
    expect(rig.muestraElAvion).toBe(true);
  });
});

describe("el dedo que mira", () => {
  /** Un lienzo de mentira: guarda los oyentes y los llama a mano. */
  function lienzo() {
    const oyentes = new Map<string, ((e: PointerEvent) => void)[]>();
    const el = {
      addEventListener: (t: string, f: (e: PointerEvent) => void) =>
        oyentes.set(t, [...(oyentes.get(t) ?? []), f]),
      removeEventListener: () => undefined,
      setPointerCapture: () => undefined,
    } as unknown as HTMLElement;
    const lanzar = (t: string, e: Partial<PointerEvent>) => {
      for (const f of oyentes.get(t) ?? [])
        f({ pointerType: "touch", button: 0, defaultPrevented: false, ...e } as PointerEvent);
    };
    return { el, lanzar };
  }

  const anotar = () => {
    const visto = { arrastre: [0, 0], soltado: 0, tocado: 0 };
    return {
      visto,
      gestos: {
        alArrastrar: (dx: number, dy: number) => {
          visto.arrastre[0]! += dx;
          visto.arrastre[1]! += dy;
        },
        alSoltar: () => visto.soltado++,
        alTocar: () => visto.tocado++,
      },
    };
  };

  it("un toque es un toque, y no mueve la cabeza", () => {
    const { el, lanzar } = lienzo();
    const { visto, gestos } = anotar();
    escucharLaMirada(el, gestos);
    lanzar("pointerdown", { pointerId: 1, clientX: 100, clientY: 100 });
    lanzar("pointermove", { pointerId: 1, clientX: 103, clientY: 101 });
    lanzar("pointerup", { pointerId: 1, clientX: 103, clientY: 101 });
    expect(visto.tocado).toBe(1);
    expect(visto.arrastre).toEqual([0, 0]);
  });

  it("arrastrar mira, desde donde cayó el dedo, y al soltar no pulsa nada", () => {
    const { el, lanzar } = lienzo();
    const { visto, gestos } = anotar();
    escucharLaMirada(el, gestos);
    lanzar("pointerdown", { pointerId: 1, clientX: 100, clientY: 100 });
    lanzar("pointermove", { pointerId: 1, clientX: 100 + UMBRAL + 30, clientY: 90 });
    lanzar("pointerup", { pointerId: 1, clientX: 100 + UMBRAL + 30, clientY: 90 });
    expect(visto.arrastre).toEqual([UMBRAL + 30, -10]);
    expect(visto.soltado).toBe(1);
    expect(visto.tocado).toBe(0);
  });

  it("con el pulgar en la palanca, el segundo dedo en el paisaje mira", () => {
    // El pulgar cae en la palanca —otro elemento— y aquí no llega nada. El
    // segundo dedo cae en el lienzo: ese es el que mira, y el tercero no.
    const { el, lanzar } = lienzo();
    const { visto, gestos } = anotar();
    escucharLaMirada(el, gestos);
    lanzar("pointerdown", { pointerId: 7, clientX: 600, clientY: 200 });
    lanzar("pointerdown", { pointerId: 8, clientX: 300, clientY: 200 });
    lanzar("pointermove", { pointerId: 8, clientX: 200, clientY: 200 });
    lanzar("pointermove", { pointerId: 7, clientX: 500, clientY: 200 });
    expect(visto.arrastre).toEqual([-100, 0]);
  });

  it("un dedo que ya se quedó un mando no es de la mirada", () => {
    const { el, lanzar } = lienzo();
    const { visto, gestos } = anotar();
    escucharLaMirada(el, gestos);
    lanzar("pointerdown", { pointerId: 1, clientX: 0, clientY: 0, defaultPrevented: true });
    lanzar("pointermove", { pointerId: 1, clientX: 80, clientY: 0 });
    lanzar("pointerup", { pointerId: 1, clientX: 80, clientY: 0 });
    expect(visto).toEqual({ arrastre: [0, 0], soltado: 0, tocado: 0 });
  });

  it("un dedo que se pierde mirando suelta la cabeza, y no pulsa", () => {
    const { el, lanzar } = lienzo();
    const { visto, gestos } = anotar();
    escucharLaMirada(el, gestos);
    lanzar("pointerdown", { pointerId: 1, clientX: 0, clientY: 0 });
    lanzar("pointermove", { pointerId: 1, clientX: 60, clientY: 0 });
    lanzar("pointercancel", { pointerId: 1 });
    expect(visto.soltado).toBe(1);
    expect(visto.tocado).toBe(0);
  });

  it("el umbral: un temblor no es arrastrar", () => {
    expect(yaEsArrastre(3, 4)).toBe(false);
    expect(yaEsArrastre(UMBRAL, 0)).toBe(true);
  });
});
