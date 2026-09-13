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
 *
 * ## Y lo que el avión hace con esas velocidades
 *
 * Las velocidades son la mitad de #57. La otra mitad es el planeo, el ascenso
 * y los cinco modos propios, y va contra dos cosas que no son una opinión: la
 * cuenta del ala y un avión de verdad.
 *
 * ```
 *   jaz-20   planeo 11,9 (teórico 12,0) a 38 m/s · sube 3,3 m/s a Vy 42
 *            fugoide 33 s ζ 0,09 · corto período 6,2 ζ 0,59
 *            holandés 3,46 ζ 0,20 · alabeo 13,4 · espiral −0,006
 *   jaz-25   planeo 8,0 (teórico 8,1) a 34 m/s · sube 4,4 m/s a Vy 34
 *            fugoide 32 s ζ 0,16 · corto período 7,3 ζ 0,67
 *            holandés 3,79 ζ 0,32 · alabeo 21,6 · espiral −0,0007
 * ```
 *
 * **El planeo cuadra al uno por ciento con lo que el ala permite**, que es la
 * comprobación que ata el motor de vuelo a la ficha: si los dos discreparan,
 * ese número no saldría. Comprobado metiéndole al motor un quince por ciento
 * de resistencia de más sin tocar la ficha — se cae en los dos aviones.
 *
 * Y los modos salen con la misma maquinaria que reproduce los cinco del
 * Navion a la cuarta cifra. Ver `referencia.ts`.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { neutralControls } from "./model";
import {
  derivadasDeLaFicha,
  modosDe,
  polinomioCaracteristico,
} from "./referencia";

/** Densidad del aire a nivel del mar, kg/m³. */
const RHO = 1.225;
const G = 9.81;
/** El paso del modelo. El juego corre a 240; aquí basta la mitad. */
const DT = 1 / 120;

function nuevo(
  a: AircraftConfig,
  velocidad: number,
  /*
   * Y a qué altura se suelta. Mil quinientos para lo que se mide planeando o
   * frenando; **quinientos para medir el ascenso**, que si no el avión se
   * pasa el rato subiendo por aire cada vez más fino y lo que se mide es el
   * techo y no el régimen.
   */
  alto = 1500,
): CoefficientFlightModel {
  const m = new CoefficientFlightModel({
    // Sin una sola capa de asistencia: lo que se mide es el avión, no las
    // ayudas. Con ellas puestas se estaría midiendo el peldaño.
    aircraft: a,
    ground: () => 0,
    assist: 0,
  });
  m.reset({
    // Aire de sobra para frenar hasta la pérdida sin que el suelo entre en la
    // cuenta.
    position: new Vector3(0, alto, 0),
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
     *
     * **Y ahora hay un avión real en esa fila**: el Navion de la NASA
     * CR-96008, con los recorridos de alerón de su certificado de tipo, sale a
     * **72 °/s** — en el medio de la banda. El entrenador alabea un 36 % más
     * que él. Ver `referencia.ts` y #54.
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

/**
 * El planeo, el ascenso y los cinco modos: la otra mitad de #57.
 *
 * Lo de arriba mide las **velocidades** que la ficha promete. Esto mide lo que
 * el avión *hace* con ellas, y contra dos cosas que no son una opinión:
 *
 * - **La teoría**, para el planeo. La mejor relación entre lo que se avanza y
 *   lo que se cae es `½·√(π·AR·e/CD0)` y sale del propio ala: si el modelo de
 *   vuelo y los coeficientes de la ficha discreparan, este número no cuadra.
 * - **Un avión de verdad**, para los modos. Salen con la misma maquinaria que
 *   reproduce los cinco del Navion a la cuarta cifra —ver `referencia.ts`—,
 *   así que no hace falta creerse nada.
 */

/** Lo mejor que planea, y a qué velocidad. Motor parado. */
function mejorPlaneo(a: AircraftConfig): { razon: number; a: number } {
  let mejor = { razon: 0, a: 0 };
  for (let v = a.approachSpeed * 0.85; v <= a.cruiseSpeed; v += 1.5) {
    const razon = planeoA(a, v);
    if (razon > mejor.razon) mejor = { razon, a: v };
  }
  return mejor;
}

/** Cuánto avanza por cada metro que cae, volando a esa velocidad sin motor. */
function planeoA(a: AircraftConfig, v: number): number {
  const m = nuevo(a, v);
  // El morro persigue la velocidad: así se planea de verdad, y así el avión se
  // asienta en vez de quedarse cabeceando.
  const paso = () => {
    const e = Math.max(-0.5, Math.min(0.5, (m.state.airspeed - v) * 0.06));
    m.step(DT, {
      ...neutralControls(),
      engineOn: false,
      throttle: 0,
      elevator: e,
    });
  };
  for (let k = 0; k < Math.round(60 / DT); k++) paso();
  const desde = m.state.position.clone();
  for (let k = 0; k < Math.round(30 / DT); k++) paso();
  const caida = desde.y - m.state.position.y;
  if (caida < 0.5) return 0;
  return (
    Math.hypot(m.state.position.x - desde.x, m.state.position.z - desde.z) /
    caida
  );
}

/** Lo más que sube, y a qué velocidad. A tope. */
function mejorAscenso(a: AircraftConfig): { subida: number; a: number } {
  let mejor = { subida: -99, a: 0 };
  for (let v = a.rotationSpeed; v <= a.cruiseSpeed; v += 1.5) {
    const m = nuevo(a, v, 500);
    const paso = () => {
      const e = Math.max(-0.5, Math.min(0.5, (m.state.airspeed - v) * 0.06));
      m.step(DT, {
        ...neutralControls(),
        engineOn: true,
        throttle: 1,
        elevator: e,
      });
    };
    for (let k = 0; k < Math.round(40 / DT); k++) paso();
    const y0 = m.state.position.y;
    for (let k = 0; k < Math.round(20 / DT); k++) paso();
    const subida = (m.state.position.y - y0) / 20;
    if (subida > mejor.subida) mejor = { subida, a: v };
  }
  return mejor;
}

describe.each(AIRCRAFT.map((a) => [a.id, a] as const))(
  "lo que hace el %s",
  (_id, a) => {
    const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;

    /*
     * **El planeo, contra la cuenta del ala.**
     *
     * `½·√(π·AR·e/CD0)` es la mejor relación de planeo que puede dar un ala
     * con ese alargamiento, esa eficiencia y esa resistencia parásita. Es
     * aerodinámica de primer curso y no depende del modelo de vuelo, así que
     * comparar una cosa con la otra es preguntarle al motor si está volando el
     * avión que dice su ficha.
     *
     * Medido: jaz-20 teórico 12,0 y volado 11,9; jaz-25 teórico 8,1 y volado
     * 8,0. Un uno por ciento, apagando el motor y midiendo lo que avanza.
     */
    it("planea lo que su ala permite", () => {
      const teorico =
        0.5 * Math.sqrt((Math.PI * alargamiento * a.aero.oswald) / a.aero.cd0);
      const { razon } = mejorPlaneo(a);
      expect(razon).toBeGreaterThan(teorico * 0.9);
      expect(razon).toBeLessThan(teorico * 1.1);
    });

    /*
     * **Y lo hace a la velocidad que toca.**
     *
     * La de mejor planeo sale del mismo sitio: es la que da el `CL` en el que
     * la inducida iguala a la parásita. Un avión que planeara lo que debe pero
     * a otra velocidad estaría compensando dos errores.
     */
    it("y a la velocidad de mejor planeo", () => {
      const clOptimo = Math.sqrt(
        Math.PI * alargamiento * a.aero.oswald * a.aero.cd0,
      );
      const vOptima = Math.sqrt(
        (2 * a.mass * G) / (RHO * a.wingArea * clOptimo),
      );
      const { a: donde } = mejorPlaneo(a);
      expect(Math.abs(donde - vOptima)).toBeLessThan(vOptima * 0.2);
    });

    /*
     * **El ascenso, y dónde está su Vy.**
     *
     * El rango es ancho porque un entrenador y un fumigador no suben igual
     * —medido, 3,3 y 4,4 metros por segundo—, y lo que este listón caza es lo
     * que de verdad pasa: un avión que no sube, o uno que sube como un caza.
     * Una ligera de escuela hace entre tres y cuatro.
     *
     * Y Vy **entre la pérdida y el crucero**, que es donde está en cualquier
     * avión: por debajo no hay ala y por encima la resistencia se come la
     * potencia sobrante.
     */
    it("sube como una avioneta, y a una Vy que tiene sentido", () => {
      const { subida, a: vy } = mejorAscenso(a);
      expect(subida).toBeGreaterThan(2);
      expect(subida).toBeLessThan(7);
      expect(vy).toBeGreaterThan(perdidaDeLaFicha(a));
      expect(vy).toBeLessThan(a.cruiseSpeed);
    });

    /*
     * **Los cinco modos propios**, con la maquinaria que reproduce los del
     * Navion a la cuarta cifra. Ver `referencia.ts`.
     *
     * Medido a crucero:
     *
     *     jaz-20   fugoide 33 s ζ 0,09 · corto período 6,2 ζ 0,59
     *              holandés 3,46 ζ 0,20 · alabeo 13,4 · espiral −0,006
     *     jaz-25   fugoide 32 s ζ 0,16 · corto período 7,3 ζ 0,67
     *              holandés 3,79 ζ 0,32 · alabeo 21,6 · espiral −0,0007
     */
    const d = derivadasDeLaFicha(a, a.cruiseSpeed);

    it("el fugoide es lento y casi no se amortigua", () => {
      const [uno, otro] = modosDe(polinomioCaracteristico(d.longitudinal));
      const fugoide = [uno!, otro!].sort((x, y) => x.omega - y.omega)[0]!;
      const periodo = (2 * Math.PI) / fugoide.omega;
      // Veinte a sesenta segundos: es el modo que se siente como un balanceo
      // largo de altura y velocidad, y por eso Guyrami usa otro modelo en vez
      // de amortiguarlo. Ver `tiers.ts`.
      expect(periodo).toBeGreaterThan(20);
      expect(periodo).toBeLessThan(60);
      // Estable, pero por poco: eso **es** un fugoide.
      expect(fugoide.zeta).toBeGreaterThan(0);
      expect(fugoide.zeta).toBeLessThan(0.35);
    });

    it("y el corto período es rápido y se apaga solo", () => {
      const [uno, otro] = modosDe(polinomioCaracteristico(d.longitudinal));
      const corto = [uno!, otro!].sort((x, y) => y.omega - x.omega)[0]!;
      expect(corto.omega).toBeGreaterThan(2);
      expect(corto.omega).toBeLessThan(12);
      /*
       * De 0,35 a 1,3 es el nivel 1 de la MIL-F-8785C, que es la norma con la
       * que se dice que un avión se pilota cómodo. El Navion sale a 0,70.
       */
      expect(corto.zeta).toBeGreaterThan(0.35);
      expect(corto.zeta).toBeLessThan(1.3);
    });

    it("el balanceo holandés se amortigua, no se queda bamboleando", () => {
      const modos = modosDe(polinomioCaracteristico(d.lateral));
      const holandes = modos.find((m) => m.raices.length === 0);
      expect(holandes).toBeTruthy();
      // Cero cinco es el mínimo de la norma; el Navion sale a 0,204.
      expect(holandes!.zeta).toBeGreaterThan(0.08);
      expect(holandes!.omega).toBeGreaterThan(1);
    });

    it("y las alas vuelven solas, sin que la espiral se dispare", () => {
      const modos = modosDe(polinomioCaracteristico(d.lateral));
      const reales = modos.find((m) => m.raices.length === 2);
      expect(reales).toBeTruthy();
      const [alabeo, espiral] = [...reales!.raices].sort((x, y) => x - y);
      /*
       * La convergencia de alabeo se apaga en una décima de segundo o menos:
       * es lo que hace que soltar la palanca pare el alabeo. El Navion, 8,4.
       */
      expect(-alabeo!).toBeGreaterThan(2);
      /*
       * Y la espiral, convergente o casi. Una espiral que se dispara es un
       * avión que se va metiendo solo en un viraje cada vez más cerrado sin
       * que nadie toque nada, y eso a los cuatro años no se detecta ni se
       * corrige. Se permite un pelo de divergencia —un tiempo de doblar la
       * inclinación de más de un minuto— porque muchos aviones de verdad la
       * tienen así.
       */
      expect(espiral!).toBeLessThan(0.012);
    });
  },
);
