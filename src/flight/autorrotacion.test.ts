/**
 * **Cortar los motores a 500 ft y llegar al suelo entero**: el criterio de cierre
 * del issue #110, volado sin pantalla con el Super Puma al peso máximo.
 *
 * Se vuela como lo pide el manual de helicópteros de la FAA (FAA-H-8083-21B,
 * capítulo 11, «Straight-In Autorotation»): el colectivo abajo en cuanto se paran
 * los motores, las vueltas del rotor en su banda con él, la velocidad de planeo con
 * el cíclico, la recogida a la altura del manual —el morro arriba, que frena y
 * mete vueltas—, nivelar a la actitud de posarse y amortiguar con el colectivo, que
 * gasta lo que guarda el rotor girando. Las alturas y la velocidad son las de
 * `helicoptero.ts` (`ALTURA_DE_RECOGIDA` y las demás), que dicen de dónde salen.
 *
 * Dos maneras de volarlo, las dos que tiene el juego: con la palanca de verdad, la
 * de la estabilización de actitud de Taguató y Taguató Ruvichá, con un piloto de
 * prueba que hace el procedimiento; y con la ayuda de los peldaños de abajo, la de
 * estacionario, sin tocar nada. Y lo que el diagrama de altura y velocidad dice que
 * no se puede: parado en el aire a 500 ft, no se llega.
 *
 * «Entero» es lo que juzga el juego (`HelicopteroComoModelo`): la toma por debajo
 * de la dura del tren de su clase (CS 29.725, unos 2,0 m/s); y lo que el modelo no
 * mira y un helicóptero de verdad sí: tocar con el morro a menos de diez grados,
 * que con más el primero en llegar al suelo es el rotor de cola, y quedarse de pie.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { HelicopteroComoModelo } from "./fdm-helicoptero";
import { airDensity } from "./atmosphere";
import {
  ALTURA_DE_RECOGIDA,
  colectivoNivelado,
  ALTURA_DE_TOMA,
  ModeloDeHelicoptero,
  VELOCIDAD_DE_AUTORROTACION,
  mandosNeutros,
  type Estabilizacion,
} from "./helicoptero";
import { SUPER_PUMA as F } from "./super-puma";

const GRADO = Math.PI / 180;
const NUDO = 1852 / 3600;
const RPM = (2 * Math.PI) / 60;
const PIE = 0.3048;
const DT = 1 / 60;
const APOYO = Math.max(...F.ruedas.map((r) => r.z));
const JUEZ = new HelicopteroComoModelo({ ficha: F, ground: () => 0, estabilizacion: "actitud" });
/** La toma que ya no es buena, m/s: la que juzga el juego. */
const TOMA_DURA = JUEZ.limiteDeDuro();
/** Las vueltas sin motor de la ficha, rpm (TCDS R.002, III.9). */
const [SIN_MOTOR_MIN, SIN_MOTOR_MAX] = F.vueltasPermitidas!.sinMotor;

interface Vuelo {
  /** Por encima de las ruedas al cortar, m. */
  readonly alCortar: number;
  /** Las vueltas más bajas y más altas del planeo, rpm. */
  readonly planeoMin: number;
  readonly planeoMax: number;
  /** Lo que bajaba en el planeo ya hecho, m/s. */
  readonly bajada: number;
  readonly tocaA: number;
  readonly cabeceoAlTocar: number;
  readonly alabeoAlTocar: number;
  readonly nudosAlTocar: number;
  readonly vueltasAlTocar: number;
  /** Y después de rodar con los frenos. */
  readonly roto: boolean;
  readonly paradoA: number;
  readonly peorAlabeoEnElSuelo: number;
  readonly segundos: number;
}

/**
 * Corta los motores a `pies` sobre el suelo, volando a `nudos` —o parado— y deja
 * que lo vuele `piloto`: el de prueba con la palanca de verdad, o nadie, con la
 * ayuda de estacionario.
 */
function cortarA(pies: number, nudos: number, modo: Estabilizacion, masa = F.masaMaxima): Vuelo {
  const h = new ModeloDeHelicoptero(F);
  h.ponerMasa(masa);
  h.ponerEstabilizacion(modo);
  h.reset({ position: new Vector3(0, pies * PIE + APOYO, 0), heading: 0, airspeed: nudos * NUDO, rotorEnMarcha: true });
  const m = mandosNeutros();
  m.tren = 1;
  const adelante = (): number => {
    const r = h.actitud().rumbo;
    return h.state.velocity.x * Math.sin(r) - h.state.velocity.z * Math.cos(r);
  };
  const ruedas = (): number => h.state.heightAboveGround - APOYO;
  /** El cíclico a una actitud, alas a nivel: en la de actitud, el cíclico mueve el morro. */
  const actitudA = (cabeceo: number): void => {
    const a = h.actitud();
    m.cabeceo = Math.max(-1, Math.min(1, (cabeceo - a.cabeceo) * 3));
    m.alabeo = Math.max(-1, Math.min(1, -a.alabeo * 3));
  };
  let cabeceoAprendido = 0;
  const aVelocidad = (objetivo: number): void => {
    const falta = objetivo - adelante();
    cabeceoAprendido = Math.max(-15, Math.min(15, cabeceoAprendido - 0.15 * falta * DT));
    actitudA(Math.max(-15, Math.min(12, cabeceoAprendido - 0.8 * falta)) * GRADO);
  };

  // ── Antes: diez segundos nivelado con motor, a la altura y la velocidad de cortar ──
  const altura = h.state.position.y;
  let integral = 0;
  for (let t = 0; t < 10; t += DT) {
    if (modo === "estacionario") {
      // En la de estacionario el cíclico pide velocidad y media palanca, la altura.
      m.colectivo = 0.5;
      m.cabeceo = -(nudos * NUDO) / 70;
    } else {
      const quiere = Math.max(-3, Math.min(3, 0.5 * (altura - h.state.position.y)));
      const falta = quiere - h.state.velocity.y;
      integral += falta * DT * 0.05;
      m.colectivo = Math.max(0, Math.min(1, 0.45 + integral + 0.08 * falta));
      aVelocidad(nudos * NUDO);
    }
    h.step(DT, m);
  }
  const alCortar = ruedas();

  // ── Se paran los motores ──
  m.motores = false;
  let colectivo = m.colectivo;
  let t = 0;
  let planeoMin = Infinity;
  let planeoMax = 0;
  let bajada = 0;
  let n = 0;
  let fase: "planeo" | "recogida" | "toma" = "planeo";
  while (t < 120 && !h.state.onGround) {
    const nr = h.rotor().vueltas / F.rotor.vueltas;
    if (modo === "estacionario") {
      // La ayuda lo vuela: la palanca suelta, las dos.
      m.colectivo = 0.5;
      m.cabeceo = 0;
      m.alabeo = 0;
    } else {
      if (fase === "planeo" && ruedas() < ALTURA_DE_RECOGIDA) fase = "recogida";
      if (fase === "recogida" && ruedas() < ALTURA_DE_TOMA) fase = "toma";
      if (fase === "planeo") {
        // Abajo del todo en un segundo, y con él las vueltas: si suben, un poco arriba.
        colectivo = Math.max(0, colectivo + Math.max(-1, Math.min(1, 4 * (nr - 1))) * DT);
        aVelocidad(VELOCIDAD_DE_AUTORROTACION);
      } else if (fase === "recogida") {
        colectivo = Math.max(0, colectivo + Math.max(-1, Math.min(1, 4 * (nr - 1))) * DT);
        // El morro arriba con lo que baja, sin hacerlo subir.
        actitudA(20 * GRADO * Math.max(0.15, Math.min(1, -h.state.velocity.y / 6)));
      } else {
        actitudA(F.actitudDeEstacionario.cabeceo);
        const falta = -Math.max(0.5, 0.4 * ruedas()) - h.state.velocity.y;
        colectivo = Math.max(0, Math.min(1, colectivo + Math.max(-1, Math.min(1, 0.4 * falta)) * DT));
        m.colectivo = Math.max(0, Math.min(1, colectivo + Math.min(0.25, 0.12 * falta)));
      }
      if (fase !== "toma") m.colectivo = colectivo;
    }
    h.step(DT, m);
    t += DT;
    // El planeo hecho: pasados los primeros segundos y antes de recoger.
    if (t > 8 && ruedas() > ALTURA_DE_RECOGIDA) {
      planeoMin = Math.min(planeoMin, h.rotor().vueltas / RPM);
      planeoMax = Math.max(planeoMax, h.rotor().vueltas / RPM);
      bajada += h.state.velocity.y;
      n++;
    }
  }
  const tocaA = h.state.touchdownSinkRate;
  const cabeceoAlTocar = h.actitud().cabeceo / GRADO;
  const alabeoAlTocar = h.actitud().alabeo / GRADO;
  const nudosAlTocar = adelante() / NUDO;
  const vueltasAlTocar = h.rotor().vueltas / RPM;
  const segundos = t;

  // ── En el suelo: el colectivo abajo, el cíclico al centro y los frenos ──
  let peorAlabeoEnElSuelo = 0;
  let paradoA = Infinity;
  m.colectivo = 0;
  m.cabeceo = 0;
  m.alabeo = 0;
  m.frenos = 1;
  for (let s = 0; s < 30; s += DT) {
    h.step(DT, m);
    peorAlabeoEnElSuelo = Math.max(peorAlabeoEnElSuelo, Math.abs(h.actitud().alabeo / GRADO));
    if (paradoA === Infinity && h.state.groundSpeed < 0.5) paradoA = s;
  }
  return {
    alCortar,
    planeoMin,
    planeoMax,
    bajada: bajada / Math.max(1, n),
    tocaA,
    cabeceoAlTocar,
    alabeoAlTocar,
    nudosAlTocar,
    vueltasAlTocar,
    roto: tocaA > JUEZ.limiteDeCaida(),
    paradoA,
    peorAlabeoEnElSuelo,
    segundos,
  };
}

/** Lo que es llegar entero: ver la cabecera. */
function llegaEntero(v: Vuelo): void {
  expect(v.tocaA).toBeLessThan(TOMA_DURA);
  expect(v.roto).toBe(false);
  // Con el morro arriba, pero no tanto que toque la cola, y con las alas a nivel.
  expect(v.cabeceoAlTocar).toBeGreaterThan(0);
  expect(v.cabeceoAlTocar).toBeLessThan(10);
  expect(Math.abs(v.alabeoAlTocar)).toBeLessThan(5);
  // Y rueda y para sin volcar.
  expect(v.paradoA).toBeLessThan(30);
  expect(v.peorAlabeoEnElSuelo).toBeLessThan(8);
}

describe("cortar los motores a 500 ft y llegar entero (#110)", () => {
  it("con la palanca de verdad, la de Taguató y Taguató Ruvichá, como lo pide el manual", () => {
    const v = cortarA(500, 80, "actitud");
    expect(v.alCortar / PIE).toBeGreaterThan(480);
    // El planeo con las vueltas sin motor de la ficha, y bajando a su ritmo.
    expect(v.planeoMin).toBeGreaterThan(SIN_MOTOR_MIN);
    expect(v.planeoMax).toBeLessThan(SIN_MOTOR_MAX);
    expect(v.bajada).toBeLessThan(-7);
    expect(v.bajada).toBeGreaterThan(-13);
    llegaEntero(v);
    // Las vueltas se gastan en amortiguar, y para eso estaban.
    expect(v.vueltasAlTocar).toBeLessThan(SIN_MOTOR_MIN);
  });

  it("con la ayuda de los peldaños de abajo, soltando las dos palancas", () => {
    const v = cortarA(500, 80, "estacionario");
    expect(v.planeoMin).toBeGreaterThan(SIN_MOTOR_MIN);
    expect(v.planeoMax).toBeLessThan(SIN_MOTOR_MAX);
    llegaEntero(v);
  });

  it("y con la ayuda, también desde más despacio y con menos peso", () => {
    llegaEntero(cortarA(500, 40, "estacionario"));
    llegaEntero(cortarA(500, 80, "estacionario", 6500));
  });

  /*
   * **El diagrama de altura y velocidad**, que cada helicóptero lleva en su manual
   * (FAA-H-8083-21B, capítulo 7): parado en el aire y bajo, sin motor no da tiempo
   * a coger la velocidad del planeo. Es lo que se enseña, y no se le pone remedio.
   */
  it("parado en el aire a 500 ft no llega; a 1.000 ft, sí: el diagrama de altura y velocidad", () => {
    expect(cortarA(500, 0, "estacionario").tocaA).toBeGreaterThan(TOMA_DURA);
    llegaEntero(cortarA(1000, 0, "estacionario"));
  });

  /*
   * **Y antes de cortar, nivelado**: el ejercicio empieza a 70 kt con la palanca
   * donde la pone el juego, `gasPara`, que en la de actitud es este colectivo.
   * Con el del estacionario subía a diez metros por segundo hasta el corte:
   * medido en el banco de Taguató, de 1.000 a 1.550 ft.
   */
  it("antes de cortar, a 70 kt, el colectivo que pone el juego lo deja casi nivelado", () => {
    const h = new ModeloDeHelicoptero(F);
    h.ponerEstabilizacion("actitud");
    h.reset({ position: new Vector3(0, 300, 0), heading: 0, airspeed: 70 * NUDO, rotorEnMarcha: true });
    const m = mandosNeutros();
    m.tren = 1;
    m.colectivo = colectivoNivelado(F, F.masaMaxima, airDensity(300), 70 * NUDO);
    let peor = 0;
    for (let t = 0; t < 14; t += DT) {
      // Las alas a nivel y el morro donde está: el cíclico suelto, que en la de actitud se queda.
      h.step(DT, m);
      if (t > 3) peor = Math.max(peor, Math.abs(h.state.velocity.y));
    }
    expect(peor).toBeLessThan(3);
  });
});

