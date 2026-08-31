/**
 * Modelo de vuelo propio, de coeficientes aerodinámicos.
 *
 * Cómo funciona, en cuatro pasos por cada instante de simulación:
 *
 *   1. Se proyecta la velocidad respecto al aire sobre los ejes del avión y
 *      se sacan el ángulo de ataque (alpha) y el de derrape (beta).
 *   2. Con alpha, beta, las velocidades angulares y la posición de los
 *      mandos se evalúan los coeficientes de la aeronave: sustentación,
 *      resistencia, fuerza lateral y los tres momentos.
 *   3. Los coeficientes se multiplican por la presión dinámica y la
 *      geometría para dar fuerzas en newtons y momentos en newton-metro.
 *   4. Se integran la segunda ley de Newton y las ecuaciones de Euler del
 *      sólido rígido.
 *
 * Convención de ejes. Dentro del FDM se usan ejes cuerpo aeronáuticos
 * —x adelante, y a la derecha, z hacia abajo— porque es como están escritas
 * las ecuaciones en cualquier libro y como vienen tabulados los
 * coeficientes. La malla de three.js, en cambio, mira hacia -Z con +Y
 * arriba. La conversión no se hace con matrices sino proyectando sobre los
 * tres vectores unitarios del avión en coordenadas de mundo, que es más
 * corto y no se puede equivocar de signo en silencio.
 *
 * Simplificación consciente: la transformación de ejes viento a ejes cuerpo
 * se hace solo con alpha, ignorando beta en las componentes de sustentación
 * y resistencia. Con derrapes pequeños —los que hace cualquiera que pilote
 * esto— el error es despreciable, y a cambio el código se lee.
 */

import { Quaternion, Vector3 } from 'three';
import { GRAVITY, SEA_LEVEL_DENSITY, airDensity } from './atmosphere';
import type { AircraftConfig } from './aircraft';
import type {
  ControlInputs,
  FlightModel,
  FlightState,
  GroundSampler,
  InitialConditions,
} from './model';

/** Paso máximo de integración. Por encima, el modelo se vuelve inestable. */
const MAX_SUBSTEP = 1 / 240;
/** Por debajo de esta velocidad no hay aerodinámica que valga. */
const MIN_AIRSPEED = 0.5;
/**
 * Umbrales de rotura, en modo Piloto. En Arcade se relajan mucho: ver
 * `crashLimits`.
 */
const CRASH_SINK_RATE = 6.0;
const CRASH_BANK = 0.5; // ~29°
/**
 * Fuerza del nivelado automático, como múltiplo de la autoridad del alerón.
 *
 * Es un equilibrio con dos lados. Muy fuerte y las alas vuelven al instante,
 * pero cancelan el viraje en cuanto se suelta la tecla: quien da toques
 * cortos —es decir, cualquier crío— no consigue girar para volver a la
 * pista. Muy flojo y se repite el problema original, no poder recuperar la
 * horizontal. Calibrado midiendo las dos cosas a la vez: rumbo ganado por
 * toque de alerón y segundos hasta nivelar.
 */
const WING_LEVELLER = 2.0;
/*
 * Aquí vivía un rebote: por encima de cierta velocidad de descenso, una toma
 * dura devolvía el avión al aire para que se notara que había salido mal.
 *
 * Se ha quitado, y conviene dejar escrito por qué para que no vuelva. Nació
 * con el umbral demasiado bajo y empeoraba los aterrizajes normales —una toma
 * firme te devolvía al aire sin velocidad para volar—. Subido el umbral a
 * donde debía, el compensador automático de Arcade frena las caídas y ya no
 * se llegaba nunca: con los mandos sueltos la ayuda arresta el descenso, y
 * volando el avión contra el suelo se pasa de 0,9 m/s a 21 m/s sin escala
 * intermedia. Cinco intentos de escribirle un test que lo alcanzara y ninguno
 * lo consiguió, que es la señal de que no se ejecutaba nunca.
 *
 * Lo que hacía falta —que una llegada regular se note— ya lo da el sonido:
 * el toque de ruedas suena distinto por encima de 2,5 m/s de descenso.
 */
/** Cuánto tarda el compensador automático en fijar la actitud, en segundos. */
const TRIM_SETTLE = 1.1;
/**
 * Instantes por delante en los que se busca terreno, en segundos.
 *
 * Llegaban hasta seis y el aviso se encendía el 16 % de un vuelo normal a
 * baja cota sobre las lomas del valle. Un aviso que salta continuamente
 * deja de ser un aviso. Cuatro segundos a velocidad de crucero son unos
 * ciento sesenta metros por delante: de sobra para reaccionar.
 */
const LOOKAHEAD_SECONDS = [0.7, 1.3, 2, 2.7, 3.4, 4] as const;

const FORWARD_LOCAL = new Vector3(0, 0, -1);
const RIGHT_LOCAL = new Vector3(1, 0, 0);
const DOWN_LOCAL = new Vector3(0, -1, 0);

export interface FdmOptions {
  aircraft: AircraftConfig;
  ground: GroundSampler;
  /**
   * Asistencia de vuelo, 0 a 1. 0 = modo Piloto, sin ayudas.
   * 1 = modo Arcade: timón automático, alas que se enderezan solas,
   * pérdida indulgente y amortiguamiento extra.
   */
  assist?: number;
}

export class CoefficientFlightModel implements FlightModel {
  readonly implementationName = 'FDM Óga Veve (coeficientes)';

  readonly state: FlightState;

  private readonly aircraft: AircraftConfig;
  private readonly ground: GroundSampler;
  private assistLevel: number;
  /**
   * Ritmo de ascenso que sostiene el compensador automático, en m/s, o `null`
   * si el jugador tiene el mando en la mano.
   */
  private trimClimb: number | null = null;
  /** Segundos que le quedan al compensador para fijar el objetivo. */
  private trimSettle = 0;

  // Vectores de trabajo reutilizados: este bucle corre 240 veces por
  // segundo y no queremos darle basura al recolector.
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly down = new Vector3();
  private readonly force = new Vector3();
  private readonly omega = new Vector3();
  private readonly spin = new Quaternion();

  constructor(options: FdmOptions) {
    this.aircraft = options.aircraft;
    this.ground = options.ground;
    this.assistLevel = options.assist ?? 1;

    this.state = {
      position: new Vector3(),
      velocity: new Vector3(),
      orientation: new Quaternion(),
      rollRate: 0,
      pitchRate: 0,
      yawRate: 0,
      airspeed: 0,
      alpha: 0,
      beta: 0,
      heightAboveGround: 0,
      verticalSpeed: 0,
      loadFactor: 1,
      heading: 0,
      onGround: true,
      stalled: false,
      crashed: false,
      secondsToImpact: Number.POSITIVE_INFINITY,
      touchdownSinkRate: 0,
    };
  }

  get assist(): number {
    return this.assistLevel;
  }

  set assist(value: number) {
    this.assistLevel = Math.max(0, Math.min(1, value));
  }

  reset(initial: InitialConditions): void {
    const s = this.state;
    s.position.copy(initial.position);
    s.orientation.setFromAxisAngle(new Vector3(0, 1, 0), -initial.heading);
    this.updateBodyAxes();
    s.velocity.copy(this.forward).multiplyScalar(initial.airspeed);
    s.rollRate = 0;
    s.pitchRate = 0;
    s.yawRate = 0;
    s.crashed = false;
    s.stalled = false;
    s.loadFactor = 1;
    this.trimClimb = null;
    this.trimSettle = 0;
    this.updateDerived();
  }

  step(dt: number, controls: ControlInputs): void {
    // Si la pestaña ha estado en segundo plano llega un dt enorme. Vale más
    // perder tiempo simulado que integrar un salto y mandar el avión a la
    // estratosfera. El tope acompaña al del bucle de juego: con subpasos de
    // 240 Hz, un cuarto de segundo son sesenta subpasos y se integra igual
    // de bien.
    const total = Math.min(dt, 0.25);
    const substeps = Math.max(1, Math.ceil(total / MAX_SUBSTEP));
    const h = total / substeps;
    for (let i = 0; i < substeps; i++) this.integrate(h, controls);
    this.updateDerived();
  }

  // ── Núcleo ────────────────────────────────────────────────────────────

  private integrate(dt: number, controls: ControlInputs): void {
    const s = this.state;
    const ac = this.aircraft;
    const a = ac.aero;

    this.updateBodyAxes();

    // Velocidad respecto al aire, en ejes cuerpo. Sin viento todavía: el día
    // que se añada, se resta aquí el vector de viento y todo lo demás sigue
    // funcionando igual.
    const u = s.velocity.dot(this.forward);
    const v = s.velocity.dot(this.right);
    const w = s.velocity.dot(this.down);
    const speed = Math.sqrt(u * u + v * v + w * w);

    const density = airDensity(s.position.y);

    if (speed > MIN_AIRSPEED) {
      s.alpha = Math.atan2(w, u);
      s.beta = Math.asin(Math.max(-1, Math.min(1, v / speed)));
    } else {
      s.alpha = 0;
      s.beta = 0;
    }
    s.airspeed = speed;

    const assisted = this.applyAssist(controls, s.alpha, s.beta);

    const qDyn = 0.5 * density * speed * speed;
    const qS = qDyn * ac.wingArea;
    const aspectRatio = (ac.wingSpan * ac.wingSpan) / ac.wingArea;

    // Alarga la pérdida en modo arcade en vez de eliminarla: el avión sigue
    // cayendo si insistís, pero perdona el tirón nervioso de un crío.
    const stallAngle = a.alphaStall * (1 + 0.45 * this.assistLevel);
    const cl = liftCoefficient(s.alpha, a, stallAngle) + ac.flapsLift * assisted.flaps;
    const cd =
      a.cd0 +
      (cl * cl) / (Math.PI * aspectRatio * a.oswald) +
      postStallDrag(s.alpha, stallAngle) +
      ac.flapsDrag * assisted.flaps;
    const cy = a.cyBeta * s.beta;

    s.stalled = Math.abs(s.alpha) > stallAngle && speed > MIN_AIRSPEED;

    const lift = qS * cl;
    const drag = qS * cd;
    const side = qS * cy;

    // Empuje. Cae con la densidad y con la velocidad: una hélice que ya va
    // rápida muerde menos aire. No es un modelo de hélice de verdad, pero
    // reproduce lo que se nota al pilotar.
    const densityRatio = density / SEA_LEVEL_DENSITY;
    const speedFactor = Math.max(0.2, 1 - speed / (2.4 * ac.cruiseSpeed));
    const thrust = assisted.throttle * ac.maxThrust * Math.pow(densityRatio, 0.7) * speedFactor;

    const sinA = Math.sin(s.alpha);
    const cosA = Math.cos(s.alpha);
    const forceX = thrust - drag * cosA + lift * sinA;
    const forceY = side;
    const forceZ = -drag * sinA - lift * cosA;

    // Momentos. Las velocidades angulares se adimensionalizan con la
    // semi-envergadura y la cuerda partido por la velocidad; a velocidad
    // baja eso se dispara, así que el divisor tiene suelo.
    const vRef = Math.max(speed, ac.cruiseSpeed * 0.35);
    const pHat = (s.rollRate * ac.wingSpan) / (2 * vRef);
    const qHat = (s.pitchRate * ac.chord) / (2 * vRef);
    const rHat = (s.yawRate * ac.wingSpan) / (2 * vRef);

    const clMoment =
      a.clBeta * s.beta + a.clP * pHat + a.clAileron * assisted.aileron;
    const cmMoment =
      a.cm0 + a.cmAlpha * s.alpha + a.cmQ * qHat + a.cmElevator * assisted.elevator;
    const cnMoment =
      a.cnBeta * s.beta +
      a.cnR * rHat +
      a.cnRudder * assisted.rudder +
      a.cnAileron * assisted.aileron;

    let rollMoment = qS * ac.wingSpan * clMoment;
    let pitchMoment = qS * ac.chord * cmMoment;
    let yawMoment = qS * ac.wingSpan * cnMoment;

    // Ayudas que actúan como momentos y no como mandos: amortiguamiento
    // extra y un empujón para nivelar las alas cuando nadie toca nada.
    if (this.assistLevel > 0) {
      const k = this.assistLevel * qS;
      rollMoment -= k * 0.5 * pHat * ac.wingSpan;
      pitchMoment -= k * 0.6 * qHat * ac.chord;
      yawMoment -= k * 0.9 * rHat * ac.wingSpan;

      // Compensador automático: mantiene **la actitud que dejaste**.
      //
      // La primera versión llevaba el morro al horizonte, y eso está mal por
      // dos motivos que se notan enseguida al jugar. Peleaba contra
      // cualquier subida que hubieras establecido —soltabas la tecla y el
      // avión se empeñaba en nivelarse—, así que costaba ganar altura y no
      // se apreciaba que subieras. Y como llevar el morro al horizonte no
      // controla la velocidad, el avión entraba igualmente en fugoide: subía
      // y bajaba, ganaba y perdía velocidad, sin estabilizarse nunca.
      //
      // Lo que hace un piloto de verdad es compensar: pone la actitud que
      // quiere y suelta, y el avión la mantiene. Eso es lo que hay aquí. Al
      // soltar el cabeceo se captura la actitud del momento y se sostiene,
      // con amortiguamiento sobre la velocidad de cabeceo para que llegue
      // sin rebotar.
      if (Math.abs(controls.elevator) < 0.08 && !s.onGround) {
        // Se sostiene **la subida**, no la actitud del morro.
        //
        // Las dos versiones anteriores intentaron mantener el cabeceo y las
        // dos fallaron por el mismo motivo: la actitud no determina si subes.
        // Llevando el morro al horizonte, el avión peleaba contra cualquier
        // ascenso que hubieras establecido y además entraba en fugoide.
        // Capturando la actitud al soltar, cogía la foto en mitad del
        // transitorio —con el morro cayendo— y acababa descendiendo hasta el
        // suelo. Lo que el jugador percibe y quiere conservar es el ritmo de
        // ascenso, así que es eso lo que se controla.
        //
        // El objetivo se toma al soltar, tras un margen para que el avión se
        // asiente, y se sostiene con un proporcional sobre el error de
        // velocidad vertical más amortiguamiento de cabeceo.
        if (this.trimClimb === null) {
          this.trimClimb = clamp(s.verticalSpeed, -4, 6);
          this.trimSettle = TRIM_SETTLE;
        } else if (this.trimSettle > 0) {
          this.trimSettle -= dt;
          this.trimClimb = clamp(s.verticalSpeed, -4, 6);
        }

        // Protección de velocidad: sostener una subida con el gas fijo acaba
        // comiéndose la velocidad. Cerca de la pérdida el objetivo se relaja
        // hasta cero, y el avión baja el morro solo antes de caerse.
        // Calibrado contra la velocidad de pérdida, no a ojo. La Óga 172
        // entra en pérdida sobre 25 m/s y sube a unos 30: con el suelo puesto
        // en 0,48 del crucero —28,8— la protección se comía casi todo el
        // objetivo justo a la velocidad normal de ascenso, y el avión no
        // subía. El suelo va por debajo de la pérdida y el margen se abre
        // antes de llegar a la velocidad de subida.
        const floor = ac.cruiseSpeed * 0.42;
        const safe = ac.cruiseSpeed * 0.52;
        const margin = clamp((speed - floor) / (safe - floor), 0, 1);
        const wanted = this.trimClimb * margin;

        // La ganancia se programa con la velocidad. El momento disponible
        // crece con la presión dinámica —o sea con el cuadrado de la
        // velocidad— mientras que la inercia del avión no cambia, así que una
        // ganancia fija que va bien a treinta metros por segundo oscila a
        // sesenta. Se normaliza contra la velocidad de crucero, que es como
        // programan la ganancia los pilotos automáticos de verdad.
        const reference = ac.cruiseSpeed * ac.cruiseSpeed;
        const schedule = Math.min(1, reference / (speed * speed + 1));
        const authority = this.assistLevel * qS * a.cmElevator * ac.chord * schedule;
        pitchMoment += authority * ((wanted - s.verticalSpeed) * 0.12 - s.pitchRate * 0.75);
      } else {
        // Con el mando en la mano, no hay compensador que valga.
        this.trimClimb = null;
        this.trimSettle = 0;
      }

      // Nivelado automático al soltar los alerones. La ganancia está atada a
      // la autoridad del propio alerón: la versión anterior usaba 0,35 fijo,
      // que con el alerón ya corregido sería casi el doble del mando a fondo
      // y devolvería las alas de un latigazo. Así, a treinta grados de
      // alabeo empuja aproximadamente como medio mando.
      if (Math.abs(controls.aileron) < 0.08 && !s.onGround) {
        rollMoment -= this.assistLevel * qS * a.clAileron * ac.wingSpan * levelling(this.bankAngle());
      }
    }

    // ── Traslación ─────────────────────────────────────────────────────
    this.force
      .copy(this.forward)
      .multiplyScalar(forceX)
      .addScaledVector(this.right, forceY)
      .addScaledVector(this.down, forceZ);
    this.force.y -= ac.mass * GRAVITY;

    // Factor de carga: lo que siente el piloto, sin contar gravedad ni
    // empuje. Es la componente de la fuerza aerodinámica hacia su cabeza.
    s.loadFactor = -forceZ / (ac.mass * GRAVITY);

    s.velocity.addScaledVector(this.force, dt / ac.mass);
    s.position.addScaledVector(s.velocity, dt);

    // ── Rotación ───────────────────────────────────────────────────────
    // Ecuaciones de Euler: los términos cruzados son los que hacen que un
    // avión en alabeo rápido guiñe solo. Se notan poco pero están.
    const { xx, yy, zz } = ac.inertia;
    const p = s.rollRate;
    const qq = s.pitchRate;
    const r = s.yawRate;
    s.rollRate += (dt * (rollMoment + (yy - zz) * qq * r)) / xx;
    s.pitchRate += (dt * (pitchMoment + (zz - xx) * r * p)) / yy;
    s.yawRate += (dt * (yawMoment + (xx - yy) * p * qq)) / zz;

    this.omega
      .copy(this.forward)
      .multiplyScalar(s.rollRate)
      .addScaledVector(this.right, s.pitchRate)
      .addScaledVector(this.down, s.yawRate);

    // Integración del cuaternión: dq/dt = ½·ω·q, con ω en ejes de mundo.
    this.spin.set(
      this.omega.x * dt * 0.5,
      this.omega.y * dt * 0.5,
      this.omega.z * dt * 0.5,
      1,
    );
    s.orientation.premultiply(this.spin).normalize();

    this.resolveGround(dt, assisted);
  }

  // ── Suelo ─────────────────────────────────────────────────────────────

  private resolveGround(dt: number, controls: ControlInputs): void {
    const s = this.state;
    const ac = this.aircraft;
    const terrain = this.ground(s.position.x, s.position.z);
    const wheelLevel = terrain + ac.gearHeight;

    if (s.position.y > wheelLevel) {
      s.onGround = false;
      return;
    }

    const wasFlying = !s.onGround;
    const sinkRate = -s.velocity.y;
    s.onGround = true;
    s.position.y = wheelLevel;

    if (wasFlying) {
      s.touchdownSinkRate = Math.max(0, sinkRate);
      const limit = this.crashLimits();
      if (sinkRate > limit.sink || Math.abs(this.bankAngle()) > limit.bank) {
        s.crashed = true;
      }
    }

    if (s.velocity.y < 0) s.velocity.y = 0;

    // Ruedas: mucho rozamiento lateral —por eso un avión en tierra va donde
    // apunta— y poco longitudinal hasta que se pisan los frenos.
    this.updateBodyAxes();
    const lateral = s.velocity.dot(this.right);
    s.velocity.addScaledVector(this.right, -lateral * Math.min(1, dt * 9));

    const rolling = 0.02 + 0.55 * controls.brakes;
    const longitudinal = s.velocity.dot(this.forward);
    s.velocity.addScaledVector(
      this.forward,
      -Math.sign(longitudinal) * Math.min(Math.abs(longitudinal), rolling * GRAVITY * dt),
    );

    // El tren de aterrizaje no deja alabear ni guiñar libremente. El cabeceo
    // sí se respeta: es lo que permite rotar en el despegue.
    const settle = Math.min(1, dt * 6);
    s.rollRate *= 1 - settle;
    s.yawRate *= 1 - settle * 0.5;
    this.levelWings(settle);
    this.constrainGroundPitch();
    // Guiñada en tierra proporcional al timón y a la velocidad: dirigible
    // rodando, inútil parado, como una rueda de morro de verdad.
    s.yawRate += controls.rudder * 0.6 * Math.min(1, Math.abs(longitudinal) / 25) * settle;
  }

  /**
   * Mantiene el cabeceo dentro de lo que permite el tren de aterrizaje.
   *
   * Con las ruedas en el suelo el avión no puede apuntar donde quiera: por
   * arriba lo frena la cola y por abajo la rueda de morro. Es lo que obliga
   * a acelerar hasta la velocidad de rotación en vez de despegar tirando de
   * la palanca desde parado.
   */
  private constrainGroundPitch(): void {
    const s = this.state;
    this.updateBodyAxes();
    const pitch = Math.asin(clamp(this.forward.y, -1, 1));
    const max = this.aircraft.maxGroundPitch;
    const min = -0.035;

    if (pitch > max) {
      this.rotateAboutRight(max - pitch);
      if (s.pitchRate > 0) s.pitchRate = 0;
    } else if (pitch < min) {
      this.rotateAboutRight(min - pitch);
      if (s.pitchRate < 0) s.pitchRate = 0;
    }
  }

  /** Gira el avión alrededor de su eje transversal. Positivo: morro arriba. */
  private rotateAboutRight(angle: number): void {
    this.spin.setFromAxisAngle(this.right, angle);
    this.state.orientation.premultiply(this.spin).normalize();
    this.updateBodyAxes();
  }

  /**
   * Cuánto falta para llegar al suelo, siguiendo la trayectoria actual.
   *
   * Se muestrea el terreno unos segundos por delante en vez de dividir
   * altura entre velocidad de descenso. La diferencia importa: volando en
   * horizontal contra una ladera no se está bajando nada, y una cuenta
   * basada solo en el descenso no avisa hasta que ya es tarde. Fue
   * exactamente lo que pasó en las pruebas — un viraje cerrado a baja cota
   * terminaba en rotura sin un solo aviso previo.
   *
   * Se ignora la gravedad en la extrapolación: a estas escalas de tiempo
   * cambia poco y ahorra integrar una trayectoria entera cada fotograma.
   */
  private timeToImpact(): number {
    const s = this.state;
    if (s.onGround || s.velocity.lengthSq() < 1) return Number.POSITIVE_INFINITY;

    for (const t of LOOKAHEAD_SECONDS) {
      const x = s.position.x + s.velocity.x * t;
      const y = s.position.y + s.velocity.y * t;
      const z = s.position.z + s.velocity.z * t;
      if (y <= this.ground(x, z) + this.aircraft.gearHeight) return t;
    }
    return Number.POSITIVE_INFINITY;
  }

  /**
   * Hasta dónde aguanta el avión antes de romperse.
   *
   * Escalan con la ayuda de vuelo porque antes no lo hacían: los umbrales
   * eran fijos y en Arcade te estrellabas exactamente igual que en Piloto,
   * lo cual vacía de sentido el modo. En Arcade se aguantan quince metros
   * por segundo de descenso y casi sesenta grados de alabeo en la toma; en
   * Piloto, seis y veintinueve, que es lo que de verdad rompe un tren.
   */
  private crashLimits(): { sink: number; bank: number } {
    return {
      sink: CRASH_SINK_RATE + this.assistLevel * 14,
      bank: CRASH_BANK + this.assistLevel * 1.9,
    };
  }

  /** Endereza las alas girando alrededor del eje longitudinal. */
  private levelWings(amount: number): void {
    const bank = this.bankAngle();
    if (Math.abs(bank) < 1e-4) return;
    this.spin.setFromAxisAngle(this.forward, -bank * amount);
    this.state.orientation.premultiply(this.spin).normalize();
  }

  // ── Utilidades ────────────────────────────────────────────────────────

  private updateBodyAxes(): void {
    const q = this.state.orientation;
    this.forward.copy(FORWARD_LOCAL).applyQuaternion(q);
    this.right.copy(RIGHT_LOCAL).applyQuaternion(q);
    this.down.copy(DOWN_LOCAL).applyQuaternion(q);
  }

  /**
   * Ángulo de alabeo respecto al horizonte, rad. **Positivo a la derecha**,
   * en el mismo sentido que `rollRate` y que el mando de alerones.
   *
   * El signo importa mucho más de lo que parece. La primera versión devolvía
   * el contrario —con alerón a la derecha el avión rodaba a la derecha pero
   * esta función decía menos sesenta grados— y eso invertía en silencio las
   * dos cosas que la usan: el nivelado automático empujaba *hacia* el
   * alabeo en vez de contra él, y el enderezado en tierra igual. De ahí que
   * bastara rozar una flecha para no poder recuperar la horizontal nunca.
   *
   * El ala derecha por debajo del horizonte es alabeo a la derecha, y con
   * ella el eje transversal apunta hacia abajo: de ahí el signo del primer
   * argumento.
   */
  private bankAngle(): number {
    this.updateBodyAxes();
    return Math.atan2(-this.right.y, -this.down.y);
  }

  /**
   * Aplica las ayudas de pilotaje sobre los mandos antes de que lleguen a
   * la aerodinámica. Con `assist` a 0 devuelve los mandos tal cual.
   */
  private applyAssist(controls: ControlInputs, alpha: number, beta: number): ControlInputs {
    if (this.assistLevel <= 0) return controls;
    const k = this.assistLevel;

    // Timón automático: mantiene la bola centrada. Es lo que separa un viraje
    // que se siente bien de uno que da tumbos, y ningún crío va a pisar
    // pedales.
    //
    // La corrección va **con** el derrape, no contra él. Derrape positivo es
    // viento entrando por la derecha, y enderezar significa llevar el morro
    // hacia ese viento, o sea pie derecho: el mismo sentido en el que ya
    // empuja la estabilidad direccional del avión. La primera versión
    // restaba, así que peleaba contra la veleta y el derrape crecía hasta
    // dieciséis grados en vez de irse a cero.
    const rudder = clamp(controls.rudder + k * clamp(beta * 4.5, -1, 1), -1, 1);

    // Limitador de ángulo de ataque: cuanto más cerca de la pérdida, menos
    // autoridad tiene el tirón. No la impide, la hace costar.
    const margin = this.aircraft.aero.alphaStall;
    const excess = clamp((alpha - margin * 0.82) / (margin * 0.35), 0, 1);
    const elevator =
      controls.elevator > 0 ? controls.elevator * (1 - k * 0.75 * excess) : controls.elevator;

    return { ...controls, rudder, elevator };
  }

  private updateDerived(): void {
    const s = this.state;
    this.updateBodyAxes();

    // Se recalculan aquí y no solo dentro de `integrate` para que el estado
    // sea correcto nada más llamar a `reset()`, antes del primer paso. Quien
    // lea `airspeed` justo después de reiniciar tiene que ver la velocidad
    // con la que ha arrancado, no un cero.
    const u = s.velocity.dot(this.forward);
    const v = s.velocity.dot(this.right);
    const w = s.velocity.dot(this.down);
    s.airspeed = Math.sqrt(u * u + v * v + w * w);
    if (s.airspeed > MIN_AIRSPEED) {
      s.alpha = Math.atan2(w, u);
      s.beta = Math.asin(clamp(v / s.airspeed, -1, 1));
    } else {
      s.alpha = 0;
      s.beta = 0;
    }

    s.verticalSpeed = s.velocity.y;
    s.heightAboveGround = s.position.y - this.ground(s.position.x, s.position.z);
    s.secondsToImpact = this.timeToImpact();
    // Rumbo: proyección del morro sobre el plano horizontal. -Z es el norte.
    s.heading = Math.atan2(this.forward.x, -this.forward.z);
    if (s.heading < 0) s.heading += Math.PI * 2;
  }
}

// ── Aerodinámica ───────────────────────────────────────────────────────

/**
 * Curva de sustentación con pérdida.
 *
 * Hasta el ángulo de pérdida es una recta. Pasado ese punto se mezcla hacia
 * el comportamiento de una placa plana, que da mucha menos sustentación. Esa
 * mezcla es lo que hace que el morro se caiga de verdad en vez de quedarse
 * flotando con el avión colgado del elevador.
 */
export function liftCoefficient(
  alpha: number,
  a: { cl0: number; clAlpha: number },
  stallAngle: number,
): number {
  const magnitude = Math.abs(alpha);
  if (magnitude <= stallAngle) return a.cl0 + a.clAlpha * alpha;

  const sign = Math.sign(alpha) || 1;
  const clAtStall = a.cl0 * sign + a.clAlpha * stallAngle * sign;
  const clFlatPlate = 2 * Math.sin(alpha) * Math.cos(alpha);
  const blend = Math.min(1, (magnitude - stallAngle) / 0.32);
  return clAtStall * (1 - blend) + clFlatPlate * blend;
}

/** Resistencia adicional al desprenderse el flujo. */
function postStallDrag(alpha: number, stallAngle: number): number {
  const excess = Math.abs(alpha) - stallAngle;
  if (excess <= 0) return 0;
  const s = Math.sin(excess);
  return 2.1 * s * s;
}

/**
 * Cuánto empuja el nivelado automático, en función del alabeo.
 *
 * Progresivo a propósito. Un término lineal en sin(alabeo) obliga a elegir:
 * fuerte y el avión no vira porque se endereza en cuanto sueltas la tecla,
 * flojo y no recuperas la horizontal. Mezclando un tramo lineal con otro
 * cuadrático, un alabeo de veinte grados —el de un viraje querido— apenas se
 * toca, y uno de sesenta se corrige con ganas.
 */
function levelling(bank: number): number {
  const s = Math.sin(bank);
  return WING_LEVELLER * s * (0.3 + 0.7 * Math.abs(s));
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
