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
 *   jaz-20   pérdida 26,7 m/s (coeficientes 25,2) · a tope 64,4 · Vref 1,31·Vs
 *   jaz-25   pérdida 23,3 m/s (coeficientes 22,2) · a tope 61,5 · Vref 1,30·Vs
 *   jaz-40   pérdida 34,5 m/s (coeficientes 33,9) · a tope 87,4 · Vref 1,30·Vs
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
 *   jaz-20   planeo teórico 12,0 · alabeo 98 °/s · margen estático 17,6 %
 *            fugoide 33 s ζ 0,09 · corto 6,2 ζ 0,59
 *            holandés 3,41 ζ 0,20 · alabeo 13,4 · espiral −0,013
 *   jaz-25   planeo teórico  8,1 · alabeo 119 °/s · margen 19,4 %
 *            fugoide 32 s ζ 0,16 · corto 7,3 ζ 0,67
 *            holandés 3,76 ζ 0,31 · alabeo 21,6 · espiral −0,006
 *   jaz-40   planeo teórico 13,3 · alabeo  75 °/s · margen 16,1 %
 *            fugoide 43 s ζ 0,09 · corto 5,4 ζ 0,55
 *            holandés 3,40 ζ 0,20 · alabeo  8,6 · espiral −0,014
 * ```
 *
 * **Y el bimotor es el primero que rueda dentro de la regla de la casa**: 75
 * grados por segundo, contra los 98 del entrenador. No es casualidad — es el
 * primero cuyo `clAileron` se eligió con la cuenta delante en vez de a ojo.
 * Ver `aircraft.ts`.
 *
 * **El planeo cuadra al uno por ciento con lo que el ala permite**, que es la
 * comprobación que ata el motor de vuelo a la ficha: si los dos discreparan,
 * ese número no saldría. Comprobado metiéndole al motor un quince por ciento
 * de resistencia de más sin tocar la ficha — se cae en los dos aviones.
 *
 * Y los modos salen con la misma maquinaria que reproduce los cinco del
 * Navion a la cuarta cifra. Ver `referencia.ts`.
 *
 * ## Y la carrera de despegue, que era la última fila
 *
 * ```
 *   jaz-20   rodadura hasta Vr 234 m (cuenta 225) · rotación 43 m más
 *   jaz-25   rodadura hasta Vr 135 m (cuenta 130) · rotación 25 m más
 * ```
 *
 * **Dos números y no uno**, que es como los separa cualquier tabla de despegue
 * de verdad. Juntarlos hizo que la primera medida saliera un veintitrés por
 * ciento larga —y en los dos aviones exactamente igual, que es la pista de que
 * faltaba un término y no de que sobrara precisión—. Separados cuadran al
 * cuatro por ciento.
 *
 * Comprobado que se cae: quitándole el rozamiento de rodadura al motor, o
 * dándole un diez por ciento más de empuje, fallan tres comprobaciones.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT, RESERVADOS, type AircraftConfig } from "./aircraft";

/**
 * Los que se miden: los que vuelan **y los que están hechos y todavía no**.
 *
 * Un avión terminado tiene que estar comprobado aunque le falte el rótulo. El
 * reactor está entero y no vuela porque su nombre está en disputa; medirlo no
 * depende de cómo se llame. Ver `aircraft.ts` y #69.
 */
const TODOS = [...AIRCRAFT, ...RESERVADOS];
import { neutralControls } from "./model";
import { ROZAMIENTO, type Superficie } from "../world/superficie";
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
 * `alSalir` corta antes si pasa antes, y lo que devuelve dice si pasó.
 *
 * ## Y con amortiguamiento de cabeceo, que faltaba
 *
 * Era un proporcional-integral sobre la velocidad vertical y nada más, y eso
 * **oscilaba**. En los dos primeros aviones se notaba poco —el JAZ 20 daba
 * tumbos de ±8° de ángulo de ataque alrededor de lo que buscaba— y las
 * medidas salían del promedio del bamboleo, no del avión. Al entrar el tercero
 * la oscilación se hizo divergente: el Panambi se ponía a 38 grados de ángulo
 * de ataque, entraba en pérdida y se quedaba ahí, y el banco lo acusaba de
 * perder a cincuenta metros por segundo.
 *
 * El término que faltaba es el de siempre en un lazo de cabeceo: **la
 * velocidad angular**. Con él los dos se asientan en cuatro segundos y se
 * quedan clavados en vertical cero — y las cifras cambian, porque las de antes
 * eran de un avión dando tumbos: el JAZ 20 a todo gas no volaba a 60,5 sino a
 * 64,4.
 */

/**
 * Cuánta prisa puede darse el piloto del banco con este avión.
 *
 * Un lazo de cabeceo no puede ir más rápido que el modo que está controlando.
 * Las ganancias estaban escritas para el entrenador —corto período de 6,2
 * radianes por segundo— y con el reactor, que responde a 3,9, se pasaban: al
 * frenar hacia la pérdida el lazo tiraba de más, el ángulo de ataque se iba
 * por encima del crítico y **el banco daba la pérdida a 93 metros por segundo
 * en un avión que pierde a 73**.
 *
 * Así que las ganancias se escalan con el corto período de cada uno. El
 * entrenador se queda exactamente como estaba —es la referencia— y los demás
 * salen proporcionados.
 */
function prisa(a: AircraftConfig): number {
  const d = derivadasDeLaFicha(a, a.cruiseSpeed);
  const modos = modosDe(polinomioCaracteristico(d.longitudinal));
  const corto = Math.max(...modos.map((m) => m.omega));
  return corto / 6.2;
}

function nivelado(
  m: CoefficientFlightModel,
  /** De qué avión es, que hace falta para saber cuánta prisa darse. */
  a: AircraftConfig,
  segundos: number,
  throttle: number,
  alSalir?: (m: CoefficientFlightModel) => boolean,
): boolean {
  let integral = 0;
  const k1 = prisa(a);
  for (let k = 0; k < Math.round(segundos / DT); k++) {
    const vs = m.state.verticalSpeed;
    integral = Math.max(-0.6, Math.min(0.6, integral + vs * DT * 0.05 * k1));
    const elevator = Math.max(
      -1,
      Math.min(1, (-vs * 0.12 - integral) * k1 - m.state.pitchRate * 1.2),
    );
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
  /*
   * **Se arranca cerca de la pérdida, no a siete décimas del crucero.**
   *
   * Un avión se acerca a la pérdida desde poco por encima de ella, que es como
   * se hace de verdad. Arrancando desde el crucero, el reactor —limpio y de
   * treinta toneladas— tardaba más de los noventa segundos del bucle en
   * frenar, así que el banco devolvía la velocidad a la que iba cuando se
   * acabó el tiempo: **cien metros por segundo**, y lo llamaba pérdida. No
   * perdía: no le daba tiempo a llegar.
   */
  const m = nuevo(a, perdidaDeLaFicha(a, flaps > 0.5) * 1.35);
  nivelado(m, a, 6, 0.35);
  let v = 0;
  let integral = 0;
  /** Si ya se le ha visto volar recto. Ver más abajo. */
  let volandoYa = false;
  const k1 = prisa(a);
  for (let k = 0; k < Math.round(90 / DT); k++) {
    const vs = m.state.verticalSpeed;
    integral = Math.max(-0.6, Math.min(0.6, integral + vs * DT * 0.05 * k1));
    m.step(DT, {
      ...neutralControls(),
      engineOn: true,
      throttle: 0,
      flaps,
      elevator: Math.max(
        -1,
        Math.min(1, (-vs * 0.12 - integral) * k1 - m.state.pitchRate * 1.2),
      ),
    });
    v = m.state.airspeed;
    /*
     * **Y la pérdida no cuenta hasta que el avión ha volado nivelado.**
     *
     * Se suelta con las alas a cero ángulo de ataque, o sea fuera de
     * equilibrio, y lo primero que hace es hundirse mientras el lazo lo
     * recoge. En una avioneta ese tirón dura dos segundos y no llega a nada;
     * en el reactor, con trescientas mil unidades de inercia en cabeceo, la
     * recogida se pasaba hasta los quince grados —su ángulo de pérdida— y el
     * banco **lo acusaba de perder a 125 metros por segundo**, que es
     * velocidad de crucero. No perdía el avión: perdía el arranque.
     *
     * Alargar el asentamiento no valía: a medio gas, treinta segundos dejan al
     * avión en otra velocidad y entonces lo que se mide es otra cosa. Lo que
     * hace falta es decir **cuándo empieza a contar**, y eso es en cuanto se
     * le ha visto volar recto una vez.
     */
    if (Math.abs(m.state.verticalSpeed) < 1.5) volandoYa = true;
    if (volandoYa && m.state.stalled) return v;
  }
  return v;
}

/** A qué velocidad se queda, nivelado y con ese gas. */
function medirCrucero(a: AircraftConfig, throttle: number): number {
  const m = nuevo(a, a.cruiseSpeed);
  nivelado(m, a, 90, throttle);
  return m.state.airspeed;
}

describe.each(TODOS.map((a) => [a.id, a] as const))(
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
  /*
   * Tres mil metros: la ventana de medida son ciento cincuenta segundos y el
   * reactor planea bajando seis por segundo, o sea novecientos. Y no más, que
   * a esa altura el aire ya es otro.
   */
  const m = nuevo(a, v, 3000);
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
  /*
   * **Noventa segundos para asentarse y sesenta para medir**, que es más de un
   * fugoide entero en cualquiera de los cinco.
   *
   * Iban sesenta y treinta, y con eso el turbohélice daba un planeo de 17,6
   * contra los 15,0 que permite su ala. La ventana caía en la mitad **de
   * subida** de un fugoide todavía vivo: el avión bajaba cuatro metros en
   * treinta segundos y la razón se disparaba. Un planeo medido en una ventana
   * más corta que el modo que lo mece no es un planeo.
   */
  for (let k = 0; k < Math.round(90 / DT); k++) paso();
  const desde = m.state.position.clone();
  for (let k = 0; k < Math.round(60 / DT); k++) paso();
  const caida = desde.y - m.state.position.y;
  // Y si apenas ha bajado, la muestra no vale: no se estaba planeando.
  if (caida < 50) return 0;
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

/**
 * La carrera de despegue: hasta Vr y hasta que las ruedas se van.
 *
 * **Dos números y no uno**, que es como los separa cualquier tabla de despegue
 * de verdad: la rodadura es hasta la velocidad de rotación y lo que viene
 * después es la rotación, que es otra maniobra. Juntarlos fue lo que hizo que
 * la primera medida saliera un veintitrés por ciento por encima de la cuenta
 * —y en los dos aviones exactamente igual, que es la pista de que faltaba un
 * término y no de que sobrara precisión—. Separados cuadran al cuatro.
 */
function carreraDeDespegue(
  a: AircraftConfig,
  superficie: Superficie = "asfalto",
): { hastaVr: number; hastaIrse: number; seVaA: number } {
  const m = new CoefficientFlightModel({
    aircraft: a,
    ground: () => 0,
    assist: 0,
  });
  m.ponerSuperficie(superficie);
  m.reset({
    position: new Vector3(0, a.gearHeight, 0),
    heading: 0,
    airspeed: 0,
  });
  let hastaVr = 0;
  let hastaIrse = 0;
  const antes = new Vector3();
  for (let k = 0; k < Math.round(120 / DT); k++) {
    antes.copy(m.state.position);
    const v = m.state.airspeed;
    m.step(DT, {
      ...neutralControls(),
      engineOn: true,
      throttle: 1,
      // Se tira al llegar a Vr, que es lo que hace quien pilota.
      elevator: v >= a.rotationSpeed ? 0.55 : 0,
    });
    if (!m.state.onGround) break;
    const paso = Math.hypot(
      m.state.position.x - antes.x,
      m.state.position.z - antes.z,
    );
    hastaIrse += paso;
    if (v < a.rotationSpeed) hastaVr += paso;
  }
  return { hastaVr, hastaIrse, seVaA: m.state.airspeed };
}

/**
 * Y la que predicen las cuentas: integrar `V·dV/a` hasta Vr.
 *
 * `a = (T − D − μ(W − L))/m`, con el empuje cayendo con la velocidad como lo
 * hace en el modelo y el avión rodando a su sustentación de cero grados. Es la
 * cuenta de un libro, y no sabe nada del motor de vuelo — que es justo lo que
 * la hace servir para comprobarlo.
 */
function carreraTeorica(a: AircraftConfig, superficie: Superficie): number {
  const AR = (a.wingSpan * a.wingSpan) / a.wingArea;
  const peso = a.mass * G;
  const cl = a.aero.cl0;
  const cd = a.aero.cd0 + (cl * cl) / (Math.PI * AR * a.aero.oswald);
  const mu = ROZAMIENTO[superficie];
  const pasos = 4000;
  const dv = a.rotationSpeed / pasos;
  let s = 0;
  for (let i = 0; i < pasos; i++) {
    const v = (i + 0.5) * dv;
    const q = 0.5 * RHO * v * v * a.wingArea;
    const empuje = a.maxThrust * Math.max(0.2, 1 - v / (2.4 * a.cruiseSpeed));
    const acc = (empuje - q * cd - mu * Math.max(0, peso - q * cl)) / a.mass;
    if (acc <= 0) return Infinity;
    s += (v / acc) * dv;
  }
  return s;
}

describe.each(TODOS.map((a) => [a.id, a] as const))(
  "lo que hace el %s",
  (_id, a) => {
    const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;

    /*
     * **La carrera de despegue, contra la cuenta del suelo.**
     *
     * Es la última fila de #57 y la única que no se mide en el aire: hacen
     * falta el rozamiento de rodadura, el empuje cayendo con la velocidad y el
     * peso que el ala va quitándole a las ruedas. La cuenta es de un libro y no
     * sabe nada del motor de vuelo, que es lo que la hace servir.
     *
     * Medido sobre asfalto: jaz-20 234 m contra 225 de cuenta; jaz-25 135
     * contra 130. Un cuatro por ciento.
     */
    it("rueda hasta Vr lo que dicen el empuje y el rozamiento", () => {
      const { hastaVr } = carreraDeDespegue(a, "asfalto");
      const teorica = carreraTeorica(a, "asfalto");
      expect(hastaVr).toBeGreaterThan(teorica * 0.93);
      expect(hastaVr).toBeLessThan(teorica * 1.07);
    });

    /*
     * **Y la rotación es otra cosa, y se cuenta aparte.**
     *
     * Tirar en Vr no despega el avión: lo pone en actitud, y las ruedas se van
     * unos metros después y un par de metros por segundo más deprisa. Juntar
     * las dos cosas es lo que hacía que la medida saliera un veintitrés por
     * ciento larga.
     *
     * Medido: cuarenta y tres metros en el entrenador y veinticinco en el
     * biplano, o sea entre un quinto y un sexto de la rodadura. Lo que este
     * listón caza es un avión que se va en cuanto se roza la palanca —eso no
     * es rotar— y uno que no se va nunca.
     */
    it("y después rota, que son unos metros más", () => {
      const { hastaVr, hastaIrse, seVaA } = carreraDeDespegue(a, "asfalto");
      const rotacion = hastaIrse - hastaVr;
      expect(rotacion).toBeGreaterThan(5);
      expect(rotacion).toBeLessThan(hastaVr * 0.5);
      // Y se va por encima de Vr, nunca por debajo.
      expect(seVaA).toBeGreaterThanOrEqual(a.rotationSpeed);
    });

    /*
     * **Y en hierba cuesta más**, que es lo que el propio modelo dice de sí
     * mismo: «de ellos sale que una pista de hierba pida más carrera de
     * despegue que una de asfalto». Estaba escrito y no lo comprobaba nadie —y
     * es la diferencia entre Yvytu Rape y Tenerife Norte.
     */
    it("y en hierba hace falta más pista", () => {
      const asfalto = carreraDeDespegue(a, "asfalto").hastaVr;
      const hierba = carreraDeDespegue(a, "hierba").hastaVr;
      expect(hierba).toBeGreaterThan(asfalto);
      // Y la cuenta lo dice igual: el rozamiento sube de 0,02 a 0,05.
      const cuenta = carreraTeorica(a, "hierba") / carreraTeorica(a, "asfalto");
      expect(hierba / asfalto).toBeGreaterThan(cuenta * 0.9);
      expect(hierba / asfalto).toBeLessThan(cuenta * 1.1);
    });

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
    it("sube en un ángulo que tiene sentido, y a una Vy que también", () => {
      const { subida, a: vy } = mejorAscenso(a);
      /*
       * **La pendiente, no el régimen.**
       *
       * Iba en metros por segundo, de dos a siete, y eso era una banda escrita
       * mirando dos avionetas: en cuanto entraron el turbohélice y el reactor
       * —8,7 y 9,6 m/s— la comprobación acusó de subir demasiado a dos aviones
       * que suben lo que tienen que subir. Un avión grande sube más deprisa
       * porque va más deprisa, y eso no es un defecto.
       *
       * Lo que sí se parece en todos es **el ángulo**: la pendiente de subida
       * de cualquier avión con motor de hélice o de turbina anda entre uno y
       * quince grados. Por debajo no sube; por encima es un caza.
       */
      const pendiente = (Math.asin(subida / vy) * 180) / Math.PI;
      expect(pendiente).toBeGreaterThan(1);
      expect(pendiente).toBeLessThan(15);
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
      /*
       * **Contra la cuenta de Lanchester, no contra un rango fijo.**
       *
       * El período del fugoide no es una propiedad del avión: es
       * `2π·V/(g·√2)`, o sea que **crece con la velocidad**. Estaba escrito
       * como «entre veinte y sesenta segundos», que es lo que dura en una
       * avioneta, y el reactor lo tiró a la primera con noventa y tres — que
       * es exactamente lo que tiene que durar a ciento ochenta metros por
       * segundo.
       *
       * Eso, además, **es lo que se siente al pilotar algo grande**: no que
       * vaya rápido, sino que todo tarde más en pasar.
       *
       * Lanchester se queda corto siempre —no lleva la resistencia— y los
       * cinco aviones salen entre un 1,19 y un 1,29 por encima. La banda es
       * de 0,9 a 1,6.
       */
      const lanchester = (2 * Math.PI * a.cruiseSpeed) / (G * Math.SQRT2);
      expect(periodo).toBeGreaterThan(lanchester * 0.9);
      expect(periodo).toBeLessThan(lanchester * 1.6);
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
