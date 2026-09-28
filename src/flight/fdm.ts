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

import { Quaternion, Vector3 } from "three";
import { resistenciaDelTren } from "./tren";
import { fraccionDeLosFlaps, resistenciaDeLosFlaps } from "./flaps";
import { anguloDeAviso, SE_CALLA_EL_AVISADOR } from "./avisos-de-actitud";
import {
  AIRE_ESTANDAR,
  type Aire,
  GRAVITY,
  SEA_LEVEL_DENSITY,
  airDensity,
} from "./atmosphere";
import {
  topeDeVelocidad,
  type QuienManda,
  machDe,
  resistenciaDeOnda,
} from "./limites";
import {
  esDeChorro,
  loQueDaElMotor,
  tieneReversa,
  type AircraftConfig,
} from "./aircraft";
import { REVERSA_HASTA } from "./arcade";

/**
 * Cuánto empuje da la reversa, como fracción del empuje máximo.
 *
 * Cuatro décimas. Un turbofán con las compuertas desplegadas da entre un tercio
 * y la mitad de su empuje hacia delante —no más, porque el chorro se desvía y
 * pierde—, y un turbohélice con la hélice en paso negativo anda por ahí. Es
 * bastante para acortar una parada y muy poco para mover el avión hacia atrás,
 * que es lo que hace que no se pueda usar de marcha atrás.
 */
const REVERSA_DA = 0.4;
import { type AssistLayers, uniformAssists } from "./assists";
import type {
  ControlInputs,
  FlightModel,
  FlightState,
  GroundSampler,
  InitialConditions,
} from "./model";

/** Paso máximo de integración. Por encima, el modelo se vuelve inestable. */
const MAX_SUBSTEP = 1 / 240;

/**
 * Lo máximo que se simula de una vez, en segundos.
 *
 * **Vive aquí y la usa también el bucle del juego**, y eso es el arreglo: eran
 * dos topes distintos que tenían que valer lo mismo y no lo valían. El bucle
 * dejaba pasar un cuarto de segundo y aquí se recortaba otra vez a un cuarto,
 * así que subir el del bucle no servía de nada — el recorte de verdad estaba
 * en esta línea, dos ficheros más allá.
 *
 * Lo que provocaba: por debajo de este ritmo el juego no pierde fotogramas,
 * **va a cámara lenta**. Medido con reloj de verdad a dos fotogramas por
 * segundo, el avión marcaba 18,4 m/s y avanzaba 7,3 — marcaba cien por hora y
 * se movía a cuarenta. De ahí salía todo lo que se notaba jugando: la avioneta
 * de juguete sobre un aeropuerto de verdad, la pista que no se acaba y el
 * rodaje eterno.
 *
 * Un segundo cubre hasta un fotograma por segundo. Más allá vale más perder
 * tiempo simulado que integrar un salto y mandar el avión a la estratosfera,
 * que es de lo que protege este tope; del salto grande al volver de una
 * pestaña en segundo plano se encarga `visibilitychange`.
 */
export const MAX_PASO = 1;
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
/**
 * Hasta qué velocidad sostiene la subida el compensador automático con su
 * ganancia de siempre, en m/s. Por encima, la ganancia baja con la velocidad
 * para mandar sobre el ángulo de la trayectoria. Ver `climbLaw` en `step`.
 */
const VELOCIDAD_DE_LA_AYUDA = 60;

/** Cuánto tarda el compensador automático en fijar la actitud, en segundos. */
const TRIM_SETTLE = 1.1;

/**
 * Cuánto ascenso sostenido pide cada unidad de compensador que se mueve, en
 * m/s: un toque de flecha —dos centésimas— es medio metro por segundo, cien
 * pies por minuto. Ver el compensador automático en `step`.
 */
export const SUBIDA_POR_COMPENSADOR = 25;

/**
 * Lo más que se mueve el compensador en un paso para que cuente como alguien
 * tocándolo. Un toque son dos centésimas; más que el triple de eso de golpe
 * es otra cosa —el piloto automático soltando, un vuelo nuevo—.
 */
const PASO_QUE_SE_PIDE = 0.06;

/** Por debajo de esta velocidad, con el freno pisado, el avión se para. */
/**
 * Holgura, en metros, antes de considerar que el avión ha dejado el suelo.
 * Un palmo: menos que el recorrido de una amortiguación de verdad.
 */
const PEGADO_AL_SUELO = 0.2;

const STATIC_GRIP = 1.2;

/**
 * Qué parte del peso carga la rueda de morro. Ver `momentoDelTren`.
 *
 * Una décima: Raymer pide entre el 8 y el 15 % para un tren triciclo.
 */
const CARGA_EN_EL_MORRO = 0.1;

/**
 * El amortiguamiento de la pata de morro, como fracción del crítico.
 *
 * Siete décimas: la pata se asienta sin rebotar, que es para lo que lleva
 * aceite. Con menos, el morro cabeceaba solo al frenar; con el crítico
 * entero, se quedaba clavado en vez de comprimirse.
 */
const AMORTIGUA_LA_PATA = 0.7;

/** Cuánto tiene que aguantar el ángulo pasado para que sea pérdida, s. */
const STALL_DELAY = 0.35;

/** Cuánto hay que bajar del umbral para salir de ella, rad (~3,5°). */
const STALL_RECOVERY = 0.06;
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
   * Asistencia de vuelo. Se puede dar como un número —todas las capas al
   * mismo nivel, que es lo que hacía el viejo Arcade/Piloto— o como capas
   * independientes, que es lo que usan los tramos de dificultad.
   */
  assist?: number | AssistLayers;
}

import { ROZAMIENTO, type Superficie } from "../world/superficie";

/**
 * A qué ritmo gira este avión en el suelo, en radianes por segundo.
 *
 * **La misma geometría que la de un coche**: con la rueda de morro girada un
 * ángulo `δ`, el avión recorre una circunferencia de radio `batalla / tan δ`,
 * y a velocidad `v` eso son `v·tan δ / batalla` radianes por segundo. Es una
 * cuenta de bachillerato y es exactamente lo que hace un avión rodando.
 *
 * **Aquí no había geometría ninguna**: el ritmo de giro era `mando · 2,2`,
 * igual para los seis aviones y **sin mirar la velocidad**. Un ritmo que no
 * depende de la velocidad quiere decir que el radio se encoge según se acelera
 * —al revés de lo que pasa— y que un 747 gira como un kart. Medido con el gas
 * a la mitad: con un tercio de palanca los seis giraban a 45°/s con radios de
 * 5,6 a 8,5 metros, el de fuselaje ancho igual que la avioneta; y a fondo
 * pivotaban a 72°/s con la velocidad hundida a menos de un metro por segundo.
 *
 * Con esto, el radio más cerrado de cada avión sale de su batalla: sesenta
 * centímetros la avioneta —que pivota sobre una rueda frenada, como se hace de
 * verdad— y nueve metros y medio el de fuselaje ancho, que es el radio mínimo
 * de morro publicado de un 747.
 *
 * ## Y el tope de lo que se puede tirar de lado
 *
 * La geometría sola, a velocidad de rodaje, deja ritmos absurdos en un avión
 * pequeño —cuatrocientos ochenta grados por segundo—, porque la geometría no
 * sabe que las ruedas agarran lo que agarran. El tope es el mismo que ya usa
 * el modelo sencillo y por el mismo motivo: `v²/R = a`, así que el ritmo no
 * puede pasar de `a/v`. Ver `DE_LADO_RODANDO` en `arcade.ts`.
 *
 * Con seis metros por segundo al cuadrado, el tope es quien manda en los
 * aviones pequeños —o sea que ruedan como rodaban— y la geometría es quien
 * manda en los grandes, que es donde estaba el fallo.
 */
const DE_LADO_RODANDO = 6;
/**
 * Lo que llega a girar la rueda de morro, en radianes.
 *
 * Setenta grados: lo que da la rueda de un avión grande con la barra del
 * capitán. En una avioneta los pedales no llegan a tanto, pero el piloto suma
 * freno de una rueda, y el resultado es el mismo giro cerrado — así que un
 * número vale para los dos y no hay que inventarse una segunda columna en la
 * ficha para decir lo mismo.
 */
export const GIRO_DE_MORRO = (70 * Math.PI) / 180;

function esteGiro(
  ac: AircraftConfig,
  mando: number,
  velocidad: number,
): number {
  const v = Math.abs(velocidad);
  const radioMinimo = ac.batalla / Math.tan(GIRO_DE_MORRO);
  const tope = DE_LADO_RODANDO / Math.max(1, v);
  return (
    clamp(mando * (v / radioMinimo), -tope, tope) * Math.sign(velocidad || 1)
  );
}

/**
 * Cuánto del viento llega a esta altura sobre el suelo, de 0 a 1.
 *
 * El viento no sopla igual a ras de suelo que arriba: el terreno lo frena, y eso
 * es la capa límite. La forma que tiene de verdad es una potencia de la altura;
 * la raíz vale de sobra para esto.
 *
 * **La referencia son diez metros, y no es un número cualquiera**: es la altura
 * a la que se mide el viento que da un METAR, o sea el que el juego enseña en su
 * panel. Así que a diez metros llega entero, que es lo que de verdad siente un
 * avión en la pista — y por debajo baja hasta un sesenta por ciento al ras,
 * porque el suelo frena las capas de abajo.
 *
 * El primer intento dejaba solo una quinta parte al ras y no llegaba al viento
 * entero hasta los cien metros. Con eso, un viento de veinte nudos acortaba la
 * carrera de despegue un diecinueve por ciento en vez de un cuarenta, y la
 * lección de por qué se despega contra el viento se quedaba en un matiz.
 */
export function perfilDeViento(altoSobreElSuelo: number): number {
  const h = Math.max(0, altoSobreElSuelo);
  return 0.6 + 0.4 * Math.min(1, Math.sqrt(h / 10));
}

export class CoefficientFlightModel implements FlightModel {
  readonly implementationName = "FDM Óga Veve (coeficientes)";

  readonly state: FlightState;

  private readonly aircraft: AircraftConfig;
  private readonly ground: GroundSampler;

  /** Segundos que lleva el ala pasada de ángulo. Ver la nota de la pérdida. */
  private stallFor = 0;
  private layers: AssistLayers;
  /**
   * Ritmo de ascenso que sostiene el compensador automático, en m/s, o `null`
   * si el jugador tiene el mando en la mano.
   */
  private trimClimb: number | null = null;
  /** Segundos que le quedan al compensador para fijar el objetivo. */
  private trimSettle = 0;
  /**
   * El compensador de quien vuela, tal como se vio en el paso anterior, para
   * saber cuánto lo ha movido. Ver `SUBIDA_POR_COMPENSADOR`.
   */
  private trimVisto: number | null = null;

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
    this.layers =
      typeof options.assist === "number" || options.assist === undefined
        ? uniformAssists(options.assist ?? 1)
        : options.assist;

    this.state = {
      position: new Vector3(),
      velocity: new Vector3(),
      orientation: new Quaternion(),
      rollRate: 0,
      pitchRate: 0,
      yawRate: 0,
      airspeed: 0,
      groundSpeed: 0,
      alpha: 0,
      beta: 0,
      heightAboveGround: 0,
      onRunway: false,
      verticalSpeed: 0,
      loadFactor: 1,
      heading: 0,
      onGround: true,
      stalled: false,
      stallWarning: false,
      stallWarningAlpha: Math.PI,
      crashed: false,
      secondsToImpact: Number.POSITIVE_INFINITY,
      touchdownSinkRate: 0,
    };
  }

  /** Nivel medio de asistencia. Sirve para el rótulo del HUD y poco más. */
  get assist(): number {
    const l = this.layers;
    return (
      (l.wingLeveller +
        l.autoRudder +
        l.climbHold +
        l.stallProtection +
        l.extraDamping) /
      5
    );
  }

  set assist(value: number) {
    this.layers = uniformAssists(value);
  }

  /** Cambia las ayudas capa a capa. Es lo que hacen los tramos. */
  setAssists(layers: AssistLayers): void {
    this.layers = layers;
  }

  /** De qué está hecho el suelo de debajo. Ver `ponerSuperficie` en el modelo. */
  private superficie: Superficie = "asfalto";

  ponerSuperficie(superficie: Superficie): void {
    this.superficie = superficie;
  }

  /** El timón que sostiene el avión ahora mismo. Ver `timonAhora`. */
  private timonQueSostiene = 0;

  timonAhora(): number {
    return this.timonQueSostiene;
  }

  /** El último empuje calculado, para el combustible. Ver `empujeAhora`. */
  private ultimoEmpuje = 0;

  empujeAhora(): number {
    return this.ultimoEmpuje;
  }

  setOnRunway(enPista: boolean): void {
    this.state.onRunway = enPista;
  }

  /** Se rompió: por el mismo camino que una toma dura. */
  /**
   * El viento que sopla, en ejes del mundo y en metros por segundo.
   *
   * Va a dónde **va** el aire, no de dónde viene: un viento del norte de diez
   * nudos es un vector que apunta al sur. La conversión la hace quien lo pone,
   * que es el que tiene el dato del METAR. Ver `ponerViento`.
   */
  private readonly viento = new Vector3();
  /** Velocidad respecto al aire. Se reusa para no crear un vector por paso. */
  private readonly relativa = new Vector3();

  /**
   * El aire del día: la temperatura y la presión del parte, que mueven la
   * densidad y con ella todo. Ver `atmosphere.ts` y `ponerAire` en `model.ts`.
   */
  private aire: Aire = AIRE_ESTANDAR;

  ponerAire(aire: Aire): void {
    this.aire = aire;
  }

  aireDelDia(): Aire {
    return this.aire;
  }

  ponerViento(x: number, z: number): void {
    this.vientoDelParte.x = x;
    this.vientoDelParte.z = z;
    this.viento.set(x + this.racha.x, this.racha.y, z + this.racha.z);
  }

  /**
   * La ráfaga, que se suma al viento del parte.
   *
   * Se guarda aparte y se suma en `ponerViento` para que las dos se puedan
   * mandar por separado y desde sitios distintos: el viento lo pone el parte
   * cuando cambia, y la ráfaga el bucle en cada fotograma.
   */
  private readonly racha = { x: 0, y: 0, z: 0 };
  private readonly vientoDelParte = { x: 0, z: 0 };

  ponerRacha(x: number, y: number, z: number, alabeo = 0): void {
    this.racha.x = x;
    this.racha.y = y;
    this.racha.z = z;
    this.rachaDeAlabeo = alabeo;
    this.viento.set(this.vientoDelParte.x + x, y, this.vientoDelParte.z + z);
  }

  /**
   * La ráfaga de alabeo, rad/s: el aire que sube por un ala y baja por la
   * otra. Entra en el amortiguamiento de alabeo como si el avión rodara al
   * revés, que es lo que ve el ala. Ver `rachaEn` en `turbulencia.ts`.
   */
  private rachaDeAlabeo = 0;

  romper(): void {
    this.state.crashed = true;
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
    s.stallWarning = false;
    this.stallFor = 0;
    s.loadFactor = 1;
    this.trimClimb = null;
    this.trimSettle = 0;
    this.trimVisto = null;
    this.updateDerived();
    /*
     * **Y en el suelo solo si las ruedas tocan.**
     *
     * `onGround` se quedaba con lo que dijera el vuelo anterior —y el primero
     * empieza en `true`—, así que un avión colocado ciento cincuenta metros en
     * el aire seguía «en el suelo» hasta el primer paso. Y en ese hueco llega
     * `recolocarTrasElMoldeado`, que se fía de la bandera y lo **baja al
     * suelo**: la lección de aterrizar de Yvytu Rape empezaba rodando por un
     * potrero a tres kilómetros de la pista, de morros contra un árbol. El
     * modelo sencillo no lo tenía porque su `reset` ya pasa por el suelo.
     */
    s.onGround =
      s.heightAboveGround <= this.aircraft.gearHeight + PEGADO_AL_SUELO;
  }

  /**
   * Aquí no hay cuenta exacta: el empuje pelea contra la resistencia y la
   * velocidad de equilibrio depende de la actitud, del alabeo y de si se sube
   * o se baja. Se estima con la proporción al crucero, que en el rango de la
   * aproximación se queda cerca, y el modelo termina de ajustarla en unos
   * segundos como haría un piloto con la palanca.
   */
  /**
   * Vez y media la de aproximación: rápido para posarse, y lo bastante lento
   * como para que la aproximación sea una aproximación. Medido, este modelo la
   * sostiene nivelada durante el minuto entero que dura la senda.
   */
  /**
   * El crucero de la ficha. Aquí el modelo llega bastante más arriba en
   * picado, pero como listón de «esto ya es demasiado» el crucero es honesto.
   *
   * **Y no es Vmo**, aunque lo parezca. Esto lo usan el juez del aterrizaje
   * —«tocaste demasiado rápido»— y la escala del velocímetro, y para las dos
   * cosas lo que hace falta es la velocidad a la que se vuela, no la que
   * rompe el avión. Poner Vmo aquí dejaría al de fuselaje ancho aterrizando a
   * seiscientos por hora sin que nadie dijera nada. El tope de verdad está
   * abajo, en `limiteDeVelocidad`.
   */
  velocidadMaxima(): number {
    return this.aircraft.cruiseSpeed;
  }

  /**
   * **Vmo o Mmo, el que mande a esta altura.** El tope de verdad.
   *
   * Este modelo no tenía velocidad máxima ninguna: el empuje peleaba contra la
   * resistencia y donde se cruzaban, ahí se quedaba. Medido nivelado a tope de
   * gas y sin asistencia, el JAZ 90 daba **1.054 km/h a quinientos metros** —
   * Mach 0,86 a ras de suelo, con una presión dinámica que no aguanta ningún
   * fuselaje de esa clase. El avión no se rompía porque el juego no sabía que
   * eso se rompe.
   *
   * Y **cambia con la altura**: abajo lo pone la estructura y arriba el aire.
   * Ver `flight/limites.ts`, que es donde está la cuenta y el porqué. Es el
   * #159.
   */
  limiteDeVelocidad(): number {
    return topeDeVelocidad(this.aircraft, this.state.position.y, this.aire)
      .verdadera;
  }

  /** Y quién lo pone aquí: la estructura o el aire. Para poder decirlo. */
  quienLimita(): QuienManda {
    return topeDeVelocidad(this.aircraft, this.state.position.y, this.aire)
      .manda;
  }

  /** El mismo con el que se rompe de verdad. Ver `crashLimits`. */
  limiteDeCaida(): number {
    return this.crashLimits().sink;
  }

  velocidadDeEntradaEnFinal(vref: number): number {
    return vref * 1.5;
  }

  gasPara(velocidad: number): number {
    return Math.max(
      0.15,
      Math.min(1, (velocidad / this.aircraft.cruiseSpeed) * 0.8),
    );
  }

  /**
   * Aquí el gas es empuje, no velocidad, así que no hay cuenta exacta: rodar a
   * nueve metros por segundo se sostiene con muy poco empuje —lo único que hay
   * que vencer es la rodadura— y lo que importa de este número es que **deje
   * salir del puesto** y no dé para una carrera. Un quinto de gas por cada
   * treinta metros por segundo, con suelo para arrancar parado.
   */
  gasParaRodar(velocidad: number): number {
    return Math.max(
      0.2,
      Math.min(1, velocidad / (this.aircraft.cruiseSpeed * 0.5)),
    );
  }

  step(dt: number, controls: ControlInputs): void {
    // El tope, uno solo y compartido con el bucle del juego. Ver `MAX_PASO`.
    const total = Math.min(dt, MAX_PASO);
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

    /*
     * Velocidad **respecto al aire**, en ejes cuerpo: la del avión menos la del
     * viento. Es la que hace la sustentación, la resistencia y todo lo demás.
     *
     * Aquí ponía «sin viento todavía», y ese todavía duró: el panel del tiempo
     * enseñaba el viento, la manga lo señalaba, la torre elegía cabecera con él
     * y el METAR lo traía de verdad — y el avión no lo notaba. Despegar con
     * quince nudos de cola y con quince de cara era exactamente lo mismo, que
     * es lo contrario de lo que este juego enseña.
     *
     * **Y con perfil de altura**, que es lo que impide que el rodaje se vuelva
     * un despropósito: el viento no sopla igual a ras de suelo que a cien
     * metros, porque el suelo lo frena. Una quinta parte abajo y entero arriba,
     * subiendo con la raíz de la altura — que es la forma que tiene de verdad
     * la capa límite y lo que usa cualquier tabla de viento en superficie.
     */
    const { u, v, w, speed } = this.respectoAlAire();

    // La del día, no la de las tablas: con calor el aire pesa menos, y
    // sustenta, frena y empuja menos. Ver `atmosphere.ts`.
    const density = airDensity(s.position.y, this.aire);

    if (speed > MIN_AIRSPEED) {
      s.alpha = anguloDeAtaque(u, w);
      s.beta = Math.asin(Math.max(-1, Math.min(1, v / speed)));
    } else {
      s.alpha = 0;
      s.beta = 0;
    }
    s.airspeed = speed;

    const assisted = this.applyAssist(controls, s.alpha, s.beta);

    const qDyn = 0.5 * density * speed * speed;
    const qS = qDyn * ac.wingArea;
    /*
     * **Y lo que sustenta, frena y cabecea es el aire que pasa por el plano de
     * simetría**, no todo el que llega.
     *
     * Con el avión volando esto es lo mismo —derrapes de unos grados, coseno
     * al cuadrado de casi uno—, y por eso la cuenta de siempre valía. Parado
     * con viento no: con veinte nudos de costado, `u` y `w` son casi cero y el
     * ángulo de ataque salía de dividir dos ráfagas —más o menos noventa
     * grados, según soplara—, multiplicado por la presión del viento **entera**.
     * Un avión en el puesto cabeceaba con el viento de lado como si volara de
     * canto. Lo lateral —la fuerza de costado, el alabeo, la guiñada— sigue
     * con la presión entera, que es la que le corresponde.
     */
    const qSSimetria =
      0.5 * density * (u * u + w * w) * ac.wingArea;
    const aspectRatio = (ac.wingSpan * ac.wingSpan) / ac.wingArea;

    // Alarga la pérdida en modo arcade en vez de eliminarla: el avión sigue
    // cayendo si insistís, pero perdona el tirón nervioso de un crío.
    const stallAngle = a.alphaStall * (1 + 0.45 * this.layers.stallProtection);
    const cl =
      liftCoefficient(s.alpha, a, stallAngle) + ac.flapsLift * assisted.flaps;
    const cd =
      a.cd0 +
      (cl * cl) / (Math.PI * aspectRatio * a.oswald) +
      postStallDrag(s.alpha, stallAngle) +
      // Los flaps, por el ángulo al que están y no por la palanca. Ver
      // `resistenciaDeLosFlaps`.
      resistenciaDeLosFlaps(ac, assisted.flaps) +
      /*
       * **Y el tren, que fuera frena.**
       *
       * Es la lección que hay detrás de medio oficio: una cosa que te hace
       * falta para aterrizar te estorba para volar. **Se suma** con el tren
       * fuera sobre el `cd0` limpio de la ficha, y con él dentro no quita
       * nada: restarlo dejaba a los reactores sin resistencia parásita —el
       * JAZ 90 en cero, el JAZ 120 en negativo— y planeando de más (#170).
       *
       * **Solo en los que lo meten.** El `cd0` del entrenador ya incluye sus
       * patas porque las lleva siempre, y sumárselas otra vez sería contarlas
       * dos veces. Ver `resistenciaDelTren` en `flight/tren.ts`.
       */
      resistenciaDelTren(
        ac,
        assisted.tren,
        fraccionDeLosFlaps(ac, assisted.flaps),
      ) +
      /*
       * **Y la onda, que es lo que impide cruzar la barrera del sonido.**
       *
       * Sin ella el empuje y la resistencia se igualaban donde les daba la
       * gana: medido, el de fuselaje ancho nivelado y con gas a fondo llegaba
       * a Mach 1,06 a tres mil metros. Ningún avión de pasaje hace eso, y el
       * aviso de sobrevelocidad quedaba avisando de un límite que luego no
       * costaba nada pasar — que es como se enseña a desoír los avisos.
       *
       * Ver `resistenciaDeOnda` en `flight/limites.ts`, donde está la curva y
       * el porqué de cada número.
       */
      resistenciaDeOnda(
        machDe(speed, this.state.position.y, this.aire),
        ac.mmo,
        a.cd0,
      );
    const cy = a.cyBeta * s.beta;

    // ── Pérdida, con histéresis y con paciencia ──────────────────────────
    //
    // Antes se marcaba pérdida en el instante en que el ángulo rozaba el
    // umbral. Dos consecuencias, las dos malas: la alarma parpadeaba al
    // entrar y salir, y saltaba **subiendo normalmente después de despegar**,
    // que es cuando el ala va más cargada y menos falta hace asustar a nadie.
    //
    // Un ala no entra en pérdida por tocar un ángulo una décima de segundo.
    // Así que entra si se mantiene, y no sale hasta bajar bien por debajo —
    // que además es lo que pasa de verdad: recuperar cuesta más que entrar.
    const pasado = Math.abs(s.alpha) > stallAngle && speed > MIN_AIRSPEED;
    this.stallFor = pasado ? this.stallFor + dt : 0;
    if (!s.stalled && this.stallFor > STALL_DELAY) s.stalled = true;
    else if (s.stalled && Math.abs(s.alpha) < stallAngle - STALL_RECOVERY)
      s.stalled = false;

    /*
     * **Y el avisador, que va por delante de la pérdida.**
     *
     * Es la veleta del costado del morro: mira el ángulo de ataque —con signo,
     * que empujando no avisa de nada— contra un umbral que baja con los flaps,
     * y suena **antes** de que el ala se vaya. Lo de arriba es la pérdida; esto
     * es lo que la anuncia, y en cualquier cabina son dos cosas distintas. Ver
     * `anguloDeAviso`. No toca la física: es un instrumento.
     */
    const umbral = anguloDeAviso(
      stallAngle,
      a,
      ac.flapsLift * assisted.flaps,
    );
    s.stallWarningAlpha = umbral;
    if (speed <= MIN_AIRSPEED) s.stallWarning = false;
    else if (!s.stallWarning && s.alpha > umbral) s.stallWarning = true;
    else if (s.stallWarning && s.alpha < umbral - SE_CALLA_EL_AVISADOR)
      s.stallWarning = false;

    const lift = qSSimetria * cl;
    const drag = qSSimetria * cd;
    const side = qS * cy;

    /*
     * Empuje. Cae con la densidad, y con la velocidad **según qué empuje el
     * aire**.
     *
     * Una hélice que ya va rápida muerde menos aire y pierde empuje deprisa;
     * un turbofán casi no lo pierde, porque lo que acelera es el aire que él
     * mismo traga. Ninguna de las dos es un modelo de propulsión de verdad,
     * pero la diferencia entre ellas sí lo es.
     *
     * **Aquí había una sola ley, la de la hélice, para los seis aviones**, y
     * con seis aviones dejó de valer: medido con el motor sin ayudas, el JAZ
     * 120 necesitaba 4.404 m para irse del suelo y el JAZ 90, 3.057. La pista
     * más larga del juego son los 3.516 de Mariscal Estigarribia. O sea que
     * los dos reactores no despegaban en ningún escenario en cuanto el tramo
     * usaba este motor — y el Yvága, en ninguno de los once.
     *
     * Con la ley de chorro la cuenta da 1.676 m y 1.111 m, que es lo que dicen
     * los libros: un 747 despega en unos 1.800 m al nivel del mar y un
     * regional de treinta toneladas en unos 1.600.
     */
    const densityRatio = density / SEA_LEVEL_DENSITY;
    const speedFactor = esDeChorro(ac)
      ? Math.max(0.5, 1 - (0.3 * speed) / ac.cruiseSpeed)
      : Math.max(0.2, 1 - speed / (2.4 * ac.cruiseSpeed));
    const thrust =
      (controls.engineOn ? assisted.throttle : 0) *
      ac.maxThrust *
      loQueDaElMotor(ac, densityRatio) *
      speedFactor;
    // Se guarda para el combustible, que gasta por el empuje que se da y no
    // por el gas que se pide. Ver `empujeAhora` en `model.ts`.
    this.ultimoEmpuje = thrust;

    const sinA = Math.sin(s.alpha);
    const cosA = Math.cos(s.alpha);
    const forceX = thrust - drag * cosA + lift * sinA;
    const forceY = side;
    const forceZ = -drag * sinA - lift * cosA;

    // Momentos. Las velocidades angulares se adimensionalizan con la
    // semi-envergadura y la cuerda partido por la velocidad; a velocidad
    // baja eso se dispara, así que el divisor tiene suelo.
    const vRef = Math.max(speed, ac.cruiseSpeed * 0.35);
    const pHat = ((s.rollRate - this.rachaDeAlabeo) * ac.wingSpan) / (2 * vRef);
    const qHat = (s.pitchRate * ac.chord) / (2 * vRef);
    const rHat = (s.yawRate * ac.wingSpan) / (2 * vRef);

    const clMoment =
      a.clBeta * s.beta + a.clP * pHat + a.clAileron * assisted.aileron;
    /*
     * **El timón de profundidad es el mando más el compensador.**
     *
     * El mando vuelve al centro al soltarlo; el compensador se queda. Sumados
     * dan la posición real de la superficie, que es exactamente cómo funciona
     * en un avión: la rueda mueve el punto de reposo y la palanca se mueve
     * alrededor de él. Ver `ControlInputs.trim`.
     *
     * Y se satura, que un timón tiene topes: con el compensador al final del
     * recorrido, tirar más no da más.
     */
    const timon = clamp(assisted.elevator + controls.trim, -1, 1);
    let timonDeAhora = timon;
    const cmMoment =
      a.cm0 +
      a.cmAlpha * anguloQueEstabiliza(s.alpha, a.alphaStall) +
      a.cmQ * qHat +
      a.cmElevator * timon;
    const cnMoment =
      a.cnBeta * s.beta +
      a.cnR * rHat +
      a.cnRudder * assisted.rudder +
      a.cnAileron * assisted.aileron;

    let rollMoment = qS * ac.wingSpan * clMoment;
    let pitchMoment = qSSimetria * ac.chord * cmMoment;
    let yawMoment = qS * ac.wingSpan * cnMoment;

    // Con las ruedas en el suelo, lo que manda en el cabeceo es el tren. Ver
    // `momentoDelTren`.
    if (s.onGround) pitchMoment += this.momentoDelTren(-forceZ);

    // Ayudas que actúan como momentos y no como mandos: amortiguamiento
    // extra y un empujón para nivelar las alas cuando nadie toca nada.
    if (this.layers.extraDamping > 0) {
      const k = this.layers.extraDamping * qS;
      // El alabeo del avión, no el del aire: la ayuda frena lo que el avión
      // gira, y la ráfaga no es suya.
      rollMoment -=
        ((k * 0.5 * s.rollRate * ac.wingSpan) / (2 * vRef)) * ac.wingSpan;
      pitchMoment -= k * 0.6 * qHat * ac.chord;
      yawMoment -= k * 0.9 * rHat * ac.wingSpan;
    }

    {
      /*
       * **Y con el piloto automático puesto, estas dos manos se apartan.**
       *
       * El compensador y el nivelado de abajo imitan a quien suelta la
       * palanca en un avión bien compensado, y saben que la ha soltado porque
       * el mando está cerca del centro. Con el automático puesto el mando lo
       * mueve él, y en vuelo recto lo lleva **justo ahí**, cerca del centro:
       * cada vez que su timón bajaba de ocho centésimas, entraba la otra mano
       * con su propia ley, y al subir se iba. Dos pilotos a los mandos a la
       * vez, turnándose sesenta veces por segundo. Medido con el automático
       * sosteniendo dos mil metros en el peldaño de todas las ayudas: el JAZ
       * 120 iba de 0,2 g a 1,9 g, y el JAZ 25 alabeaba a trece grados por
       * segundo en un viraje que sin ayudas lleva a cinco.
       *
       * En un avión de verdad no hay dos: quien lleva los mandos es el
       * automático, y la mano que imita a un piloto no tiene nada que hacer.
       * Las ayudas que amortiguan —las que un avión de verdad lleva como
       * amortiguador de guiñada— se quedan. Ver `ControlInputs.automatico`.
       */
      const manoDelAutomatico = controls.automatico === true;
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
      if (
        this.layers.climbHold > 0 &&
        Math.abs(controls.elevator) < 0.08 &&
        !s.onGround &&
        !manoDelAutomatico
      ) {
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
        // El objetivo nunca es un descenso.
        //
        // Capturando la velocidad vertical tal cual, si al soltar el avión
        // bajaba un poco —cosa normalísima en pleno transitorio— la ayuda
        // memorizaba ese descenso y lo sostenía indefinidamente. El avión se
        // iba al suelo despacio y con obstinación. Al soltar, lo que se
        // memoriza es entre nivelado y subiendo: para bajar hay que empujar
        // el morro, y mientras se empuja no hay ayuda que valga.
        if (this.trimClimb === null) {
          this.trimClimb = clamp(s.verticalSpeed, 0, 5);
          this.trimSettle = TRIM_SETTLE;
        } else if (this.trimSettle > 0) {
          this.trimSettle -= dt;
          this.trimClimb = clamp(s.verticalSpeed, 0, 5);
        }
        /*
         * **Y el compensador de quien vuela mueve lo que se sostiene.**
         *
         * Esta ayuda sostiene una subida, y el compensador que se mueve a
         * toques de flecha pide otra: sin esto se peleaban, y ganaba la ayuda.
         * Medido con media ayuda: dos centésimas de compensador, un toque,
         * cambiaban el ritmo de ascenso en veinte o treinta centímetros por
         * segundo en el JAZ 20, el JAZ 60 y el JAZ 90, que no se ve. O sea que en los peldaños con ayuda el toque
         * no hacía nada, y justo ahí es donde se pedía: «si lo pongo a bajar,
         * que lo deje fijo».
         *
         * Así que cada toque mueve **el ascenso que se sostiene** —medio metro
         * por segundo, cien pies por minuto, que es lo que da un clic de la
         * rueda de velocidad vertical de un piloto automático— y **hacia
         * abajo también**: la regla de que el objetivo nunca es un descenso
         * era para no coger por descenso un transitorio al soltar, y un toque
         * no es un transitorio, es una petición. Con tope en cinco metros por
         * segundo hacia cada lado.
         *
         * Solo los pasos pequeños: un salto grande del compensador no es
         * nadie tocándolo, es el piloto automático devolviéndolo al soltarse
         * o un vuelo nuevo, y ahí no se pide ninguna subida.
         */
        const movido =
          this.trimVisto === null ? 0 : controls.trim - this.trimVisto;
        if (movido !== 0 && Math.abs(movido) <= PASO_QUE_SE_PIDE)
          this.trimClimb = clamp(
            this.trimClimb + movido * SUBIDA_POR_COMPENSADOR,
            -5,
            5,
          );

        // Dos leyes que se mezclan, no un interruptor.
        //
        // La versión anterior escalaba el objetivo de ascenso con un factor
        // que iba de 0 a 1 en una banda estrecha de velocidad. Eso creaba un
        // ciclo límite justo en esa banda: al bajar de ella el objetivo se
        // anulaba, el morro caía, la velocidad subía, el objetivo volvía, el
        // morro subía, y vuelta a empezar. Es exactamente el cabeceo con la
        // velocidad yendo y viniendo que se veía volando despacio.
        //
        // Un factor que multiplica no es una realimentación: no corrige, solo
        // apaga. Así que cuando se va lento, el control **pasa a sostener la
        // velocidad** —morro abajo proporcional a lo que falte— y se mezcla
        // suavemente con el control de ascenso. Las dos leyes son estables,
        // y su mezcla también.
        /*
         * **Y «lento» es lento para este avión, no para el crucero.** Los dos
         * umbrales iban en proporción al crucero, y eso vale para los de
         * hélice —su aproximación es un sesenta por ciento del crucero— pero
         * no para un reactor, cuya aproximación es un tercio: con el JAZ 90,
         * «lento» empezaba en 92 m/s y «seguro» en 128, así que a su
         * velocidad de aproximación —75— esta ayuda creía que se iba a
         * entrar en pérdida y **le bajaba el morro a fondo**. Medido en la
         * lección de aterrizar: 42 m/s de bajada y al suelo en ocho segundos.
         *
         * Cada umbral es el menor entre el de siempre y uno atado a la
         * aproximación. En los cuatro de hélice sale casi el mismo número —lo
         * afinado no se mueve—; en los reactores baja a donde tiene que estar.
         */
        const floor = Math.min(ac.cruiseSpeed * 0.42, ac.approachSpeed * 0.8);
        const safe = Math.min(ac.cruiseSpeed * 0.58, ac.approachSpeed * 1.05);
        const shortfall = safe - speed;
        const blend = clamp(shortfall / (safe - floor), 0, 1);

        /*
         * **Y la subida se sostiene por su ángulo, no por los metros por
         * segundo.**
         *
         * Las doce centésimas por metro por segundo se afinaron con los de
         * hélice, que vuelan por debajo de sesenta metros por segundo. Un
         * metro por segundo de subida a sesenta es casi un grado de
         * trayectoria; a ciento cuarenta, menos de medio. Con la misma
         * ganancia, el reactor corregía cada metro por segundo como si fuera
         * el doble o el triple de ángulo, y un reactor tarda más que una
         * avioneta en cambiar de trayectoria cuando cambia el morro: la
         * corrección llegaba tarde y de más, y la siguiente, más tarde y más
         * de más. Medido soltando la palanca con el avión compensado y
         * nivelado a dos mil metros, en el peldaño de todas las ayudas: el
         * JAZ 90 iba solo de −1,6 g a 3,4 g, y el JAZ 120 igual.
         *
         * Por encima de `VELOCIDAD_DE_LA_AYUDA` la ganancia baja con la
         * velocidad, que es lo mismo que mandar sobre el ángulo de la
         * trayectoria: la misma firmeza en todos. Por debajo no cambia nada,
         * así que lo afinado en los de hélice sigue igual.
         */
        const climbLaw =
          (this.trimClimb - s.verticalSpeed) *
          0.12 *
          Math.min(1, VELOCIDAD_DE_LA_AYUDA / Math.max(1, speed));
        const speedLaw = -shortfall * 0.1;
        /*
         * **Y el compensador no tira hasta el avisador.**
         *
         * Sostiene la subida tirando del morro, y sin mirar el ala: con el
         * JAZ 90 a ciento noventa nudos, soltando la palanca mientras el avión
         * bajaba, tiraba hasta 12,8° y el avisador cantaba «stall, stall» una
         * treintena de veces en un vuelo —con quien vuela sin tocar nada, que
         * es justo cuando actúa esta ayuda—. Ningún piloto automático de
         * verdad hace eso: el que sostiene altura o subida tiene su tope de
         * ángulo y, si no le da, cede antes que meter el ala en pérdida.
         *
         * Así que por encima de tres grados antes del avisador ya no tira, y
         * pasado ese punto empuja en proporción. Es la regla de las tres eses
         * aplicada a una ayuda: una red que te mete en pérdida no es una red.
         *
         * **Mirando a dónde va el ángulo, no solo dónde está**, y con la
         * orden acotada. Soltando la palanca bajando a treinta metros por
         * segundo, la ley pedía casi cuatro veces el mando entero, el morro
         * subía a cuarenta y cinco grados por segundo y el ala pasaba de −4° a
         * 21° en ocho décimas: el tope llegaba tarde. Con el ángulo de dentro
         * de un cuarto de segundo y la orden en ±0,6 —lo que da la palanca de
         * un piloto automático, que tampoco tira de golpe—, llega y se queda.
         */
        const hacia = s.alpha + s.pitchRate * 0.25;
        const cerca = hacia - (umbral - 0.05);
        const law = Math.min(
          clamp(climbLaw * (1 - blend) + speedLaw * blend, -1, 1),
          cerca > 0 ? -cerca * 2 : Infinity,
        );

        // La ganancia se programa con la velocidad. El momento disponible
        // crece con la presión dinámica —o sea con el cuadrado de la
        // velocidad— mientras que la inercia del avión no cambia, así que una
        // ganancia fija que va bien a treinta metros por segundo oscila a
        // sesenta. Se normaliza contra la velocidad de crucero, que es como
        // programan la ganancia los pilotos automáticos de verdad.
        const reference = ac.cruiseSpeed * ac.cruiseSpeed;
        const schedule = Math.min(1, reference / (speed * speed + 1));
        const authority =
          this.layers.climbHold * qS * a.cmElevator * ac.chord * schedule;
        pitchMoment += authority * (law - s.pitchRate * 0.75);
        // Lo que empuja esta mano, contado en timón. Ver `timonAhora`.
        timonDeAhora +=
          (this.layers.climbHold * schedule * (law - s.pitchRate * 0.75) * qS) /
          Math.max(1, qSSimetria);
      } else {
        // Con el mando en la mano, no hay compensador que valga.
        this.trimClimb = null;
        this.trimSettle = 0;
      }
      this.trimVisto = controls.trim;

      // Nivelado automático al soltar los alerones. La ganancia está atada a
      // la autoridad del propio alerón: la versión anterior usaba 0,35 fijo,
      // que con el alerón ya corregido sería casi el doble del mando a fondo
      // y devolvería las alas de un latigazo. Así, a treinta grados de
      // alabeo empuja aproximadamente como medio mando.
      if (
        this.layers.wingLeveller > 0 &&
        Math.abs(controls.aileron) < 0.08 &&
        !s.onGround &&
        !manoDelAutomatico
      ) {
        rollMoment -=
          this.layers.wingLeveller *
          qS *
          a.clAileron *
          ac.wingSpan *
          levelling(this.bankAngle());
      }
    }

    /*
     * El timón que sostiene el avión, **promediado**: el de quien vuela, el
     * compensador y lo que empuje la ayuda, pasado por un filtro de dos
     * segundos. Promediado porque lo que tiene que coger el automático es el
     * timón con el que el avión vuela, no el de un instante: con el avión
     * cabeceando, el de un instante es la cresta o el valle. Ver `timonAhora`.
     */
    this.timonQueSostiene +=
      (timonDeAhora - this.timonQueSostiene) * Math.min(1, dt / 2);

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

    /*
     * **Un palmo de holgura antes de dar el avión por volando.**
     *
     * Sin ella, cualquier empujón de la sustentación de unos centímetros
     * apagaba `onGround`, y con él se encendía el aviso «¡el suelo, subí!»
     * mientras se rodaba tan tranquilo. Se dijo tal cual: «claro que estoy en
     * el suelo, estoy rodando». Y también: «de nada que le soples se levanta».
     *
     * El modelo sencillo ya lo tenía —un metro entero, ver `PEGADO_AL_SUELO`
     * en `arcade.ts`— y por eso el peldaño de los pequeños se comportaba y este
     * no. Aquí basta con un palmo, porque este modelo sí tiene que dejar
     * despegar de verdad en cuanto se rota.
     */
    if (s.position.y > wheelLevel + PEGADO_AL_SUELO) {
      s.onGround = false;
      return;
    }

    const wasFlying = !s.onGround;
    const sinkRate = -s.velocity.y;
    s.onGround = true;
    /*
     * **Se pega al suelo solo si está por debajo**, no si está dentro de la
     * holgura.
     *
     * Pegarlo siempre es un trinquete: dentro del palmo de holgura, cada paso
     * lo devolvía al suelo, así que la subida no podía acumularse y el avión
     * no despegaba nunca. Lo cazó la prueba de la carrera de despegue, y es el
     * segundo trinquete del mismo arreglo — el primero fue anular la velocidad
     * de subida en cada paso, con el mismo resultado y por el mismo motivo.
     *
     * Es lo que ya hacía el modelo sencillo: allí solo se pega cuando no se
     * está pidiendo subir.
     *
     * **Y por eso se pega también hacia abajo mientras no se esté subiendo.**
     * Sin eso, en una pista con pendiente el suelo se escapa por debajo y el
     * avión se queda flotando: en tierra la velocidad vertical negativa se
     * anula —justo aquí abajo—, así que las ruedas no pueden seguir una pista
     * que baja. Cuando el hueco pasa del palmo de holgura, `onGround` se apaga;
     * la gravedad lo baja, vuelve a tocar, y otra vez, todo el recorrido.
     *
     * Medido en La Palma, cuya pista cae dos metros en los cuatrocientos de la
     * frenada: **el 73 % de la frenada con la bandera en el aire**, y como el
     * freno solo frena si la rueda toca, frenaba a 0,09 g en vez de a los 0,32
     * que frena en llano. El banco lo contaba como «este avión frena mal», y
     * frenaba perfectamente: no tocaba el suelo.
     *
     * La condición es «mientras no se esté subiendo», y no «siempre», porque
     * siempre vuelve a ser el trinquete que impedía despegar.
     */
    if (s.position.y < wheelLevel || s.velocity.y <= 0)
      s.position.y = wheelLevel;

    if (wasFlying) {
      s.touchdownSinkRate = Math.max(0, sinkRate);
      const limit = this.crashLimits();
      if (sinkRate > limit.sink || Math.abs(this.bankAngle()) > limit.bank) {
        s.crashed = true;
      }
    }

    /*
     * Solo se anula la velocidad hacia abajo, y **la de subida se respeta**.
     *
     * Hubo un intento de anular también la de subida por debajo de medio metro
     * por segundo, para que el tren se comiera los botes pequeños. Lo cazó la
     * prueba de la carrera de despegue: la velocidad se reconstruye de las
     * fuerzas en cada paso, así que anularla cada paso impide que se acumule y
     * el avión no despegaba **nunca**. La holgura de posición de arriba hace el
     * mismo trabajo sin ese efecto: mientras el bote quepa en un palmo, el
     * avión sigue en el suelo; en cuanto la subida es de verdad, sale.
     */
    if (s.velocity.y < 0) s.velocity.y = 0;

    // Ruedas: mucho rozamiento lateral —por eso un avión en tierra va donde
    // apunta— y poco longitudinal hasta que se pisan los frenos.
    this.updateBodyAxes();
    const lateral = s.velocity.dot(this.right);
    s.velocity.addScaledVector(this.right, -lateral * Math.min(1, dt * 9));

    /*
     * **Y el freno frenaba como el de un coche.**
     *
     * Cero coma cincuenta y cinco de coeficiente son cinco metros y medio por
     * segundo al cuadrado sobre todo el peso: desde velocidad de aproximación,
     * parada en noventa y cuatro metros. Una Cessna necesita ciento setenta y
     * cinco, y frena a dos y medio o tres. El propio juego lo sabía y calculaba
     * con dos y medio en dos sitios —el aviso de fin de pista y la fase de «ya
     * no se puede parar»—, así que la física iba por un lado y las cuentas por
     * otro.
     *
     * Cero coma veintiocho son unos tres metros por segundo al cuadrado y
     * ciento ochenta de parada: lo de verdad, y lo que las cuentas ya suponían.
     */
    /*
     * **Y el suelo tiene tipo.** Dos centésimas sobre asfalto, cinco sobre
     * hierba segada, nueve sobre campo: son los coeficientes de rodadura de
     * verdad, y de ellos sale que una pista de hierba pida más carrera de
     * despegue que una de asfalto. Ver `world/superficie.ts`.
     */
    const rolling = ROZAMIENTO[this.superficie] + 0.28 * controls.brakes;
    const longitudinal = s.velocity.dot(this.forward);
    /*
     * **Y la reversa, que frena sin tocar las ruedas.**
     *
     * No existía: «cuando tomo tierra no tengo reversa». Se suma a la rodadura
     * porque en un avión es otra fuerza y no un freno mejor — y por eso es la
     * que salva una pista mojada, donde la rueda patina y el chorro no.
     *
     * Y se apaga sola por debajo de treinta nudos, como en un avión de verdad:
     * más despacio deja de frenar y empieza a levantar del suelo lo que haya y
     * a metérselo al motor. Ver `REVERSA_HASTA` en `arcade.ts`.
     */
    if (
      tieneReversa(this.aircraft) &&
      controls.reversa > 0 &&
      Math.abs(longitudinal) > REVERSA_HASTA
    ) {
      const empuje =
        Math.min(1, controls.reversa) * this.aircraft.maxThrust * REVERSA_DA;
      s.velocity.addScaledVector(
        this.forward,
        (-Math.sign(longitudinal) * empuje * dt) / this.aircraft.mass,
      );
    }
    s.velocity.addScaledVector(
      this.forward,
      -Math.sign(longitudinal) *
        Math.min(Math.abs(longitudinal), rolling * GRAVITY * dt),
    );

    // Rozamiento estático: con el freno pisado y a paso de peatón, el avión
    // se queda quieto de verdad en vez de reptar contra el ralentí del
    // motor. Va después de la fricción y del empuje, que es donde importa:
    // cada paso el motor empuja un poquito y esto lo anula.
    if (controls.brakes > 0.5 && Math.abs(longitudinal) < STATIC_GRIP) {
      s.velocity.addScaledVector(this.forward, -s.velocity.dot(this.forward));
    }

    // El tren de aterrizaje no deja alabear ni guiñar libremente. El cabeceo
    // sí se respeta: es lo que permite rotar en el despegue.
    const settle = Math.min(1, dt * 6);
    s.rollRate *= 1 - settle;
    s.yawRate *= 1 - settle * 0.5;
    this.levelWings(settle);
    this.constrainGroundPitch();
    // Guiñada en tierra proporcional al timón y a la velocidad: dirigible
    // rodando, inútil parado, como una rueda de morro de verdad.
    // Timón: dirige más cuanto más deprisa se va, porque es aerodinámico.
    s.yawRate +=
      controls.rudder * 0.6 * Math.min(1, Math.abs(longitudinal) / 25) * settle;
    /*
     * Y la rueda de morro, que es al revés que el timón: manda a paso de
     * peatón y se queda sin autoridad al coger carrerilla. Va con el mando de
     * alabeo porque es el que la mano busca para girar, y en el suelo las alas
     * no sirven de nada. Sin esto no se podía dar la vuelta en la pista tras
     * abortar un despegue: el avión seguía recto hiciera uno lo que hiciera.
     *
     * Plena hasta ocho metros por segundo y apagándose a los veintiocho, que
     * es cuando toma el relevo el timón. Decayendo desde parado, a treinta por
     * hora el radio de giro se iba a cincuenta y cinco metros y las curvas de
     * las calles de rodaje no se podían tomar. Medido.
     *
     * **Y lo que manda es la geometría del avión, no un número igual para
     * todos.** Ver `esteGiro`.
     */
    const nosewheel = 1 - clamp((Math.abs(longitudinal) - 8) / 20, 0, 1);
    s.yawRate +=
      (esteGiro(ac, controls.aileron * nosewheel, longitudinal) - s.yawRate) *
      settle;
  }

  /**
   * **El par que hace el tren sobre el cabeceo**, con las ruedas en el suelo,
   * en N·m. Positivo: morro arriba.
   *
   * ## Lo que faltaba
   *
   * En el suelo, el cabeceo lo movían solo los momentos del aire, y lo único
   * que los paraba eran los dos topes de `constrainGroundPitch`. O sea que un
   * avión parado era una veleta en cabeceo: cualquier par de morro arriba, por
   * pequeño que fuera, lo llevaba hasta el tope de cola. Medido con el JAZ 90
   * en el puesto de Gando y veinte nudos de viento: **9,2° de morro arriba**,
   * la rueda de morro a metro y medio del suelo y las principales hundidas
   * dieciocho centímetros. Y con viento de cara, cinco grados — porque el
   * `cm0` de cualquier ficha es positivo.
   *
   * Un avión parado no se levanta con el viento por lo que se levanta un avión
   * que rota: **el peso**. El centro de gravedad va por delante de las ruedas
   * principales, así que el peso es un par de morro abajo alrededor de ellas,
   * y la pata de morro lo sostiene. Para levantar el morro, el aire tiene que
   * vencer ese par, y eso es exactamente lo que se hace al rotar: tirar a la
   * velocidad a la que el timón puede con él.
   *
   * ## Las dos piezas
   *
   * - **El peso** que todavía cargan las ruedas —el del avión menos lo que ya
   *   sostiene el ala— por el brazo que va del centro de gravedad a las
   *   principales. Morro abajo, siempre que haya ruedas en el suelo.
   * - **La pata de morro**, que empuja cuando toca y no tira nunca: cargada de
   *   serie con ese mismo par —de modo que en reposo el avión queda a nivel,
   *   que es la actitud en la que están dibujadas sus tres ruedas—, con muelle
   *   para comprimirse y amortiguador para no rebotar. El muelle se elige para
   *   que el doble de la carga de serie la lleve justo hasta el tope de
   *   `minGroundPitch`, que es lo que se le admite a la pata.
   *
   * El brazo sale de cuánto peso carga la rueda de morro: **un diez por
   * ciento**. Raymer, *Aircraft Design: A Conceptual Approach*, capítulo 11,
   * pide entre el 8 y el 15 % —menos, y no se gobierna; más, y el timón no
   * levanta el morro— y el diez es el que lleva un avión de esta clase. Por la
   * palanca, el brazo es esa fracción de la batalla.
   *
   * El biplano, que es de rueda de cola, se queda con la misma cuenta: su
   * actitud en reposo también es la de su dibujo, y su batalla va de las
   * principales a la de cola. No es su física exacta, pero no se levanta con
   * el viento, que es lo que había que arreglar.
   */
  private momentoDelTren(sustentacion: number): number {
    const s = this.state;
    const ac = this.aircraft;
    const cabeceo = Math.asin(clamp(this.forward.y, -1, 1));
    const peso = ac.mass * GRAVITY;
    const apoyado = Math.max(0, peso - sustentacion);
    const brazo = ac.batalla * CARGA_EN_EL_MORRO;
    let par = -apoyado * brazo;
    if (cabeceo <= 0) {
      const muelle = (peso * brazo) / Math.max(0.002, -ac.minGroundPitch);
      const amortiguador =
        2 * AMORTIGUA_LA_PATA * Math.sqrt(muelle * ac.inertia.yy);
      par += Math.max(
        0,
        apoyado * brazo - muelle * cabeceo - amortiguador * s.pitchRate,
      );
    }
    return par;
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
    /*
     * **Y el de abajo también sale de la ficha, que era un número para todos.**
     *
     * Estaba escrito aquí, `-0.035`, o sea dos grados para los seis. Dos
     * grados en una avioneta de ocho metros son diez centímetros de pata; en
     * un reactor de treinta y uno, treinta y siete — y eso no es una pata
     * comprimiéndose, es la rueda de morro dentro del asfalto. Medido con el
     * avión parado: el JAZ 90 hundido 0,37 m y el JAZ 120, 0,20.
     *
     * Ver `minGroundPitch`, donde está la cuenta de la que sale cada uno.
     */
    const min = this.aircraft.minGroundPitch;

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
    if (s.onGround || s.velocity.lengthSq() < 1)
      return Number.POSITIVE_INFINITY;

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
      sink: CRASH_SINK_RATE + this.layers.crashTolerance * 14,
      bank: CRASH_BANK + this.layers.crashTolerance * 1.9,
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
  private applyAssist(
    controls: ControlInputs,
    alpha: number,
    beta: number,
  ): ControlInputs {
    const { autoRudder, stallProtection } = this.layers;
    if (autoRudder <= 0 && stallProtection <= 0) return controls;

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
    const rudder = clamp(
      controls.rudder + autoRudder * clamp(beta * 4.5, -1, 1),
      -1,
      1,
    );

    // Limitador de ángulo de ataque: cuanto más cerca de la pérdida, menos
    // autoridad tiene el tirón. No la impide, la hace costar.
    const margin = this.aircraft.aero.alphaStall;
    const excess = clamp((alpha - margin * 0.82) / (margin * 0.35), 0, 1);
    const limitado =
      controls.elevator > 0
        ? controls.elevator * (1 - stallProtection * 0.75 * excess)
        : controls.elevator;

    /*
     * **Con las ruedas fuera de la pista, el morro no sube.**
     *
     * Esto era regla solo del modelo sencillo, y aquí ponía que en el de
     * coeficientes «manda la física, y un avión que consiga volar desde una
     * calle de rodaje ha volado». Es defendible como física y es malo como
     * juego: la mitad de lo que este juego enseña es *ir hasta la pista*, y si
     * se puede saltar ese trámite tirando del morro en la plataforma, no se
     * enseña. Se probó jugando y se pidió cambiarlo.
     *
     * No se bloquea el vuelo, se bloquea **la orden de subir**: quien ya está
     * en el aire manda como siempre, y quien está rodando rueda. Y si el
     * terreno se le cae por debajo seguirá quedándose sin ruedas un instante,
     * porque eso no es despegar y no lo arregla esta regla.
     */
    const enElSuelo = this.state.onGround && !this.state.onRunway;
    const elevator = enElSuelo ? Math.min(0, limitado) : limitado;

    return { ...controls, rudder, elevator };
  }

  /**
   * La velocidad respecto al aire, en ejes cuerpo.
   *
   * **Una sola cuenta, y por eso está aquí.** La hacían dos sitios: `integrate`,
   * para las fuerzas, y `updateDerived`, para el dato que publica el estado. Al
   * meter el viento se cambió una y no la otra, con lo cual el ala lo notaba y
   * el anemómetro no: el avión rotaba a velocidad **respecto al suelo** y un
   * viento de cara, en vez de acortar la carrera, la alargaba —porque añadía
   * resistencia sin adelantar la rotación—. Justo lo contrario de lo que pasa.
   *
   * Es el fallo clásico de esta casa: el mismo número calculado en dos sitios.
   */
  private respectoAlAire(): {
    u: number;
    v: number;
    w: number;
    speed: number;
  } {
    const s = this.state;
    const cuanto = perfilDeViento(
      s.position.y - this.ground(s.position.x, s.position.z),
    );
    this.relativa.copy(s.velocity).addScaledVector(this.viento, -cuanto);
    const u = this.relativa.dot(this.forward);
    const v = this.relativa.dot(this.right);
    const w = this.relativa.dot(this.down);
    return { u, v, w, speed: Math.sqrt(u * u + v * v + w * w) };
  }

  private updateDerived(): void {
    const s = this.state;
    this.updateBodyAxes();

    // Se recalculan aquí y no solo dentro de `integrate` para que el estado
    // sea correcto nada más llamar a `reset()`, antes del primer paso. Quien
    // lea `airspeed` justo después de reiniciar tiene que ver la velocidad
    // con la que ha arrancado, no un cero.
    const { u, v, w, speed } = this.respectoAlAire();
    s.airspeed = speed;
    // Y la del suelo, que es otra cosa desde que hay viento. Ver `groundSpeed`.
    s.groundSpeed = Math.hypot(s.velocity.x, s.velocity.z);
    if (s.airspeed > MIN_AIRSPEED) {
      s.alpha = anguloDeAtaque(u, w);
      s.beta = Math.asin(clamp(v / s.airspeed, -1, 1));
    } else {
      s.alpha = 0;
      s.beta = 0;
    }

    s.verticalSpeed = s.velocity.y;
    s.heightAboveGround =
      s.position.y - this.ground(s.position.x, s.position.z);
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

/**
 * Resistencia adicional al desprenderse el flujo.
 *
 * Se exporta porque el esquema de «cómo vuela un ala» tiene que dibujar **la
 * curva de este avión**, no la de un ala de libro: un esquema que enseñe una
 * pérdida distinta de la que se acaba de sentir a los mandos enseña dos cosas
 * a la vez. Ver `flight/ala.ts`.
 */
export function postStallDrag(alpha: number, stallAngle: number): number {
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

/**
 * **El ángulo con el que la estabilidad devuelve el morro**, rad.
 *
 * Hasta la pérdida es el ángulo tal cual: `cmα·α`, la recta de los libros, y
 * ahí no cambia nada de cómo vuela nadie. Pero la recta no se acababa nunca, y
 * con el viento por detrás el ángulo de ataque es de ±180°: `cmα·π`, un par de
 * morro enorme **que cambia de signo** según la ráfaga venga un pelo por
 * encima o por debajo. El avión parado con viento de cola se sentaba sobre la
 * cola o clavaba el morro a cara o cruz.
 *
 * Pasada la pérdida sigue la forma del seno —la de una placa plana, como la
 * sustentación de `liftCoefficient`—, empalmada para que en la pérdida valga
 * lo mismo: crece un poco hasta los noventa grados y vuelve a cero con el aire
 * de cola, que es lo que hace el aire de cola.
 */
export function anguloQueEstabiliza(alpha: number, alphaStall: number): number {
  const m = Math.abs(alpha);
  if (m <= alphaStall) return alpha;
  return (
    Math.sign(alpha) * alphaStall * (Math.sin(m) / Math.sin(alphaStall))
  );
}

/**
 * El ángulo de ataque del aire que pasa por el plano de simetría.
 *
 * Sin aire en ese plano no hay ángulo que valga: con el viento de costado y
 * el avión parado, `u` y `w` son lo que traiga la ráfaga, y su arcotangente
 * saltaba de −90° a +90° de un fotograma a otro. Ver `qSSimetria`.
 */
function anguloDeAtaque(u: number, w: number): number {
  return Math.hypot(u, w) > MIN_AIRSPEED ? Math.atan2(w, u) : 0;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
