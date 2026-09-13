/**
 * Prestaciones: que cada avión **haga lo que dice su ficha**.
 *
 * Una ficha no está terminada porque compile. Los coeficientes de
 * `aircraft.ts` son treinta números, y de ellos salen cuatro velocidades que
 * el juego enseña como si fueran verdad: la de pérdida, la de rotación, la de
 * decisión y la de cruzar el umbral. Hasta hoy nadie comprobaba que los
 * treinta primeros produjeran las cuatro últimas — se escribían a mano en el
 * mismo fichero, al lado, y nada las ataba.
 *
 * Eso es exactamente lo que convierte la regla 4 de `AGENTS.md` —«lo que se
 * enseña es real»— en algo que puede comprobar una máquina en vez de una
 * intención. Ver #57.
 *
 * ## Cómo se mide
 *
 * Volando, no despejando ecuaciones: se construye el modelo de coeficientes
 * sin ninguna asistencia y se le da un piloto automático de una línea que
 * persigue velocidad vertical cero. **Nivelado y a un g**, que es la
 * condición en la que están definidas todas las velocidades de un avión.
 *
 * Costó una medida equivocada antes de acertar: tirando de la palanca a
 * ciegas el avión baja mientras se frena, el ala va descargada, y la pérdida
 * salía a 14 m/s en vez de a 26 — cuarenta por ciento por debajo de la de
 * verdad. Una pérdida medida en descenso no es la velocidad de pérdida de
 * nada.
 *
 * ## Lo que sale hoy
 *
 * ```
 *   jaz-20   pérdida 26,7 m/s (coeficientes 25,2) · crucero 75 % 56,2 ·
 *            a tope 60,5 (ficha 60) · Vref 1,31·Vs
 *   jaz-25   pérdida 23,3 m/s (coeficientes 22,2) · crucero 75 % 49,6 ·
 *            a tope 57,3 (ficha 55) · Vref 1,30·Vs
 * ```
 *
 * Las dos fichas están sanas, y el número que más tranquiliza es el último:
 * **Vref sale 1,3 veces la velocidad de pérdida en las dos**, que es la regla
 * con la que se cruza el umbral en la aviación de verdad. No estaba escrito en
 * ningún sitio; estaba en los números.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { neutralControls } from "./model";

/** Densidad del aire a nivel del mar, kg/m³. */
const RHO = 1.225;
const G = 9.81;
/** El paso del modelo. El juego corre a 240; aquí basta la mitad. */
const DT = 1 / 120;

function nuevo(a: AircraftConfig, velocidad: number): CoefficientFlightModel {
  const m = new CoefficientFlightModel({
    // Sin una sola capa de asistencia: lo que se mide es el avión, no las
    // ayudas. Con ellas puestas se estaría midiendo el peldaño.
    aircraft: a,
    ground: () => 0,
    assist: 0,
  });
  m.reset({
    // Mil quinientos metros: aire de sobra para frenar hasta la pérdida sin
    // que el suelo entre en la cuenta.
    position: new Vector3(0, 1500, 0),
    heading: 0,
    airspeed: velocidad,
  });
  return m;
}

/**
 * Vuela nivelado tantos segundos, con el gas que se le diga.
 *
 * El piloto es un proporcional-integral sobre la velocidad vertical, que es lo
 * mínimo que hace falta para que el avión no cabecee: un proporcional solo
 * deja un error permanente —el avión se queda subiendo despacio— y entonces la
 * velocidad que se mide no es la de vuelo nivelado.
 *
 * `alSalir` corta antes si pasa algo, y lo que devuelve dice si pasó.
 */
function nivelado(
  m: CoefficientFlightModel,
  segundos: number,
  throttle: number,
  alSalir?: (m: CoefficientFlightModel) => boolean,
): boolean {
  let integral = 0;
  for (let k = 0; k < Math.round(segundos / DT); k++) {
    const vs = m.state.verticalSpeed;
    integral = Math.max(-0.6, Math.min(0.6, integral + vs * DT * 0.05));
    const elevator = Math.max(-1, Math.min(1, -vs * 0.12 - integral));
    m.step(DT, { ...neutralControls(), engineOn: true, throttle, elevator });
    if (alSalir?.(m)) return true;
  }
  return false;
}

/** La velocidad de pérdida que dicen los coeficientes, m/s. */
function perdidaDeLaFicha(a: AircraftConfig, conFlaps = false): number {
  const clMax =
    a.aero.cl0 +
    a.aero.clAlpha * a.aero.alphaStall +
    (conFlaps ? a.flapsLift : 0);
  return Math.sqrt((2 * a.mass * G) / (RHO * a.wingArea * clMax));
}

/** Vuela hasta que el ala avisa, y devuelve a qué velocidad fue. */
function medirPerdida(a: AircraftConfig, flaps = 0): number {
  const m = nuevo(a, a.cruiseSpeed * 0.7);
  nivelado(m, 6, 0.35);
  let v = 0;
  let integral = 0;
  for (let k = 0; k < Math.round(90 / DT); k++) {
    const vs = m.state.verticalSpeed;
    integral = Math.max(-0.6, Math.min(0.6, integral + vs * DT * 0.05));
    m.step(DT, {
      ...neutralControls(),
      engineOn: true,
      throttle: 0,
      flaps,
      elevator: Math.max(-1, Math.min(1, -vs * 0.12 - integral)),
    });
    v = m.state.airspeed;
    if (m.state.stalled) return v;
  }
  return v;
}

/** A qué velocidad se queda, nivelado y con ese gas. */
function medirCrucero(a: AircraftConfig, throttle: number): number {
  const m = nuevo(a, a.cruiseSpeed);
  nivelado(m, 90, throttle);
  return m.state.airspeed;
}

describe.each(AIRCRAFT.map((a) => [a.id, a] as const))(
  "las prestaciones del %s",
  (_id, a) => {
    const vs = perdidaDeLaFicha(a);

    it("entra en pérdida donde dicen sus coeficientes", () => {
      const medida = medirPerdida(a);
      // Un diez por ciento. El ala no avisa en el instante exacto en que se
      // pasa el ángulo —hay un retardo a propósito, para que la pérdida se
      // sienta llegar— así que la medida sale un pelo por encima siempre.
      expect(medida).toBeGreaterThan(vs * 0.9);
      expect(medida).toBeLessThan(vs * 1.15);
    });

    it("y con flaps entra más despacio, que es para lo que están", () => {
      expect(medirPerdida(a, 1)).toBeLessThan(medirPerdida(a));
    });

    /*
     * **Vref = 1,3 · Vs**, que es la regla con la que se cruza el umbral en la
     * aviación de verdad y la que decide si un aterrizaje sale o no: rápido, el
     * avión no quiere posarse y se come la pista; lento, se cae los últimos
     * metros.
     *
     * Está escrita a mano en cada ficha —`approachSpeed`— y nada la ataba a los
     * coeficientes de los que depende. Cambiar el peso o la superficie alar
     * movía la velocidad de pérdida y dejaba la de aproximación donde estaba.
     */
    it("cruza el umbral a 1,3 veces la de pérdida, como se hace de verdad", () => {
      expect(a.approachSpeed / vs).toBeGreaterThan(1.2);
      expect(a.approachSpeed / vs).toBeLessThan(1.42);
    });

    /*
     * Y las dos de la carrera de despegue, en su orden: se rota por encima de
     * la pérdida —si no, el avión se levanta y se cae— y la de decisión va
     * antes que la de rotación, que es lo que significa.
     */
    it("rota por encima de la pérdida y después de la de decisión", () => {
      expect(a.rotationSpeed).toBeGreaterThan(vs * 1.02);
      expect(a.rotationSpeed).toBeGreaterThan(a.decisionSpeed);
      expect(a.decisionSpeed).toBeGreaterThan(vs);
    });

    it("a todo gas y nivelado llega a su velocidad de crucero", () => {
      const tope = medirCrucero(a, 1);
      expect(tope).toBeGreaterThan(a.cruiseSpeed * 0.9);
      expect(tope).toBeLessThan(a.cruiseSpeed * 1.15);
    });

    /*
     * Y al setenta y cinco por ciento de gas —que es como se vuela de
     * verdad— tiene que quedarse por debajo del tope y por encima de la
     * velocidad de aproximación. Un avión que a tres cuartos de gas va igual
     * que a tope no tiene resistencia que valga.
     */
    it("y al setenta y cinco por ciento va más despacio, pero vuela", () => {
      const crucero = medirCrucero(a, 0.75);
      expect(crucero).toBeLessThan(medirCrucero(a, 1) - 2);
      expect(crucero).toBeGreaterThan(a.approachSpeed);
    });

    /*
     * **El ritmo de alabeo estabilizado**, con la fórmula que la propia ficha
     * escribe al lado de `clAileron`: `clAileron/|clP| · 2V/b`.
     *
     * Lo que se comprueba aquí es un rango ancho —de cuarenta a ciento ochenta
     * grados por segundo— porque los dos aviones que hay son de clases
     * distintas: un entrenador de ala alta y un biplano corto de alerones
     * grandes no alabean igual, y no tienen por qué. Lo que este rango caza es
     * un signo cambiado o un cero de más, que es el fallo que de verdad pasa.
     *
     * **Y de paso deja anotado lo que sale, que no cuadra con la regla.** La
     * ficha dice, con todas las letras, «para una ligera de escuela debe salir
     * entre 60 y 80 grados por segundo». Medido:
     *
     *   jaz-20 · ala alta · 98 °/s   ← su propia regla pide 60-80
     *   jaz-25 · biplano  · 119 °/s  ← un biplano corto alabea así, y está bien
     *
     * El del entrenador está un tercio por encima de lo que su ficha pide. Un
     * 172 de verdad anda por los cuarenta y cinco o sesenta. No se toca aquí
     * porque bajar `clAileron` cambia cómo se siente el avión en la mano, y eso
     * se decide jugando, no midiendo.
     */
    it("alabea dentro de lo que puede alabear un avión", () => {
      const ritmo =
        ((a.aero.clAileron / Math.abs(a.aero.clP)) * (2 * a.cruiseSpeed)) /
        a.wingSpan;
      const grados = (ritmo * 180) / Math.PI;
      expect(grados).toBeGreaterThan(40);
      expect(grados).toBeLessThan(180);
    });
  },
);
