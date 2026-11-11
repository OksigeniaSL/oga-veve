/**
 * **El modelo de vuelo del helicóptero.**
 *
 * Lo pidió Jazlyn —«un helicóptero, grande»— y el de los aviones no vale: un
 * avión se sostiene porque avanza, y un helicóptero porque gira su rotor. Lo
 * que aquí se mueve con los mandos no es un timón sino el paso de las palas
 * (el colectivo, todas a la vez; el cíclico, cada una según por dónde pasa) y
 * el del rotor de cola (los pedales). Ver el ADR 0026.
 *
 * La base es el modelo de mínima complejidad de la NASA (Heffley y Mnich,
 * CR-177476, 1988, de dominio público), que es lo que pide el issue #109:
 * deliberadamente mínimo y aun así con estacionario, respuesta a los mandos y
 * maniobra moderada, y con un procedimiento para ajustarlo a un helicóptero
 * concreto con lo que publica su manual. De él vienen:
 *
 * - **El empuje del rotor** por el elemento de pala, con la velocidad inducida
 *   de la cantidad de movimiento, resueltas juntas por Newton-Raphson en cada
 *   paso. Así salen solos el efecto de la velocidad —a sesenta nudos se
 *   sostiene con menos potencia que parado— y el de subir y bajar.
 * - **El plano de las puntas** que sigue al cíclico con un retraso de una
 *   fracción de segundo, que se echa hacia atrás con la velocidad y que se
 *   queda atrás cuando el fuselaje gira: de ahí la amortiguación natural.
 * - **El par**: lo que el motor da al rotor lo devuelve el fuselaje girando al
 *   revés, y lo para el rotor de cola.
 * - **El efecto suelo**, con la fórmula de Cheeseman y Bennett, que se apaga
 *   con la velocidad.
 * - **El motor con su regulador**, que sostiene las vueltas del rotor, y el
 *   rotor como un volante: si se pide más potencia de la que hay, las vueltas
 *   caen y el empuje con ellas; sin motor, el aire que sube por el disco lo
 *   hace girar, que es la autorrotación.
 *
 * Y **la estabilización**: un helicóptero sin ella es inestable en
 * estacionario y frustrante de volar, y el que se vuela aquí, el Super Puma,
 * lleva piloto automático de verdad (EASA TCDS R.002, III.16). Va por niveles,
 * de nada a sostener el estacionario solo. Ver `Estabilizacion`.
 *
 * Ejes como en `fdm.ts`: dentro, ejes cuerpo aeronáuticos —x adelante, y a la
 * derecha, z abajo—; fuera, los del mundo de three.js —Y arriba, X este, Z
 * sur—. Unidades SI en todo el módulo.
 */

import { Quaternion, Vector3 } from "three";
import { AIRE_ESTANDAR, type Aire, GRAVITY, SEA_LEVEL_DENSITY, airDensity } from "./atmosphere";
import type { FlightState, GroundSampler } from "./model";

const FORWARD_LOCAL = new Vector3(0, 0, -1);
const RIGHT_LOCAL = new Vector3(1, 0, 0);
const DOWN_LOCAL = new Vector3(0, -1, 0);
const GRADO = Math.PI / 180;

// ── La ficha ─────────────────────────────────────────────────────────────

/** **Un rotor**, el principal o el de cola: lo que hace falta para su empuje y su potencia. */
export interface Disco {
  /** m. */
  readonly radio: number;
  readonly palas: number;
  /** La cuerda de la pala, m. */
  readonly cuerda: number;
  /** Las vueltas nominales, rad/s. */
  readonly vueltas: number;
  /** La pendiente de sustentación del perfil, 1/rad. */
  readonly pendiente: number;
  /** El alabeo de la pala de la raíz a la punta, rad: negativo, menos paso en la punta. */
  readonly torsion: number;
  /** El coeficiente de resistencia del perfil. */
  readonly cd0: number;
}

export interface FichaDeHelicoptero {
  readonly id: string;
  /** kg. */
  readonly masaVacia: number;
  readonly masaMaxima: number;
  readonly rotor: Disco & {
    /**
     * **Hacia dónde gira, visto desde arriba**: 1 en el sentido de las agujas del
     * reloj, −1 al revés. Decide hacia qué lado se va el morro al dar potencia y
     * qué pedal se pisa para pararlo.
     */
    readonly sentido: 1 | -1;
    /** El número de Lock: cuánto pesa el aire frente a la inercia de la pala. */
    readonly lock: number;
    /** Lo que empuja el buje por radián que se inclina el disco, N·m/rad. */
    readonly rigidez: number;
    /** Dónde está el buje respecto al centro de gravedad, m. */
    readonly alturaDelBuje: number;
    readonly bujeAdelante: number;
    /** Lo que el mástil cae hacia delante, rad. */
    readonly inclinacionDelMastil: number;
    /** El momento de inercia del rotor alrededor del mástil, kg·m². */
    readonly inercia: number;
    /** El paso colectivo con la palanca abajo y arriba del todo, rad. */
    readonly paso: { readonly minimo: number; readonly maximo: number };
    /** Lo que inclina el cíclico a tope, rad. */
    readonly ciclico: { readonly cabeceo: number; readonly alabeo: number };
  };
  readonly cola: Disco & {
    /** Detrás y encima del centro de gravedad, m. */
    readonly brazo: number;
    readonly altura: number;
    /** El paso con los pedales al centro y lo que cambia a tope, rad. */
    readonly paso: { readonly centro: number; readonly recorrido: number };
  };
  readonly fuselaje: {
    /** Las áreas de placa plana equivalente de frente, de lado y por debajo, m². */
    readonly frente: number;
    readonly lado: number;
    readonly planta: number;
    /** kg·m², en ejes cuerpo. */
    readonly inercia: { readonly xx: number; readonly yy: number; readonly zz: number };
  };
  readonly estabilizador: { readonly area: number; readonly brazo: number; readonly pendiente: number };
  readonly deriva: { readonly area: number; readonly brazo: number; readonly altura: number; readonly pendiente: number };
  readonly motores: {
    readonly cuantos: number;
    /** La potencia de despegue de cada uno al nivel del mar, en la atmósfera estándar, W. */
    readonly potencia: number;
    /** Cómo cae con la densidad: la potencia va con (ρ/ρ₀) elevado a esto. */
    readonly caida: number;
    /** Lo que llega al rotor de lo que dan los motores. */
    readonly rendimiento: number;
    /** Lo que tardan en responder, s. */
    readonly respuesta: number;
    /**
     * Lo que tarda un motor parado en dar potencia de vuelo, s: el arrancador, el
     * encendido y la subida del generador de gas. Sin poner, medio minuto.
     */
    readonly arranque?: number;
  };
  /** Las ruedas, respecto al centro de gravedad y en ejes cuerpo (z abajo), m. */
  readonly ruedas: readonly {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    /** Si se orienta sola, como la de morro: no agarra de lado ni frena. */
    readonly loca?: boolean;
  }[];
  /**
   * **El freno del rotor**: el par que hace, N·m, y por debajo de qué vueltas se
   * puede poner, en tanto por uno de las nominales. Más arriba no se pone: se
   * quemaría el disco.
   */
  readonly frenoDelRotor?: { readonly par: number; readonly hasta: number };
}

// ── Los mandos ───────────────────────────────────────────────────────────

/**
 * **Los mandos de un helicóptero**, con el mismo sentido que los del avión para
 * que el teclado, el dedo y el mando valgan igual: tirar es morro arriba.
 */
export interface MandosDeHelicoptero {
  /** La palanca del colectivo, de 0 abajo a 1 arriba. */
  colectivo: number;
  /** El cíclico adelante y atrás, −1 a 1: +1 es tirar, morro arriba. */
  cabeceo: number;
  /** El cíclico a los lados, −1 a 1: +1 a la derecha. */
  alabeo: number;
  /** Los pedales, −1 a 1: +1 es el pie derecho, morro a la derecha. */
  pedales: number;
  motores: boolean;
  /** El freno de las ruedas, 0 a 1. */
  frenos: number;
  /** El freno del rotor, puesto o quitado. Sin poner, quitado. */
  frenoDelRotor?: boolean;
}

export function mandosNeutros(): MandosDeHelicoptero {
  return { colectivo: 0, cabeceo: 0, alabeo: 0, pedales: 0, motores: true, frenos: 0 };
}

/**
 * **La estabilización**, de menos a más. Es la del piloto automático del
 * helicóptero de verdad, por capas, y la escalera de peldaños elige cuál lleva
 * cada uno (paso 3 del ADR 0026):
 *
 * - `ninguna`: el helicóptero tal cual, inestable en estacionario como
 *   cualquiera sin aumentación.
 * - `amortiguada`: frena los giros, con autoridad limitada. Es el canal de
 *   amortiguación de cualquier piloto automático de helicóptero.
 * - `actitud`: el cíclico manda el ritmo al que cambia la actitud, y al
 *   soltarlo se queda la que había; los pies, el rumbo en estacionario y el
 *   derrape cero volando. Es el modo básico del piloto automático del Super
 *   Puma.
 * - `estacionario`: además, a poca velocidad, el cíclico pide velocidad sobre
 *   el suelo y al soltarlo el helicóptero se para y se queda. Es la ayuda de los
 *   peldaños de abajo: lo que tiene un sistema moderno de mandos con su modo de
 *   estacionario.
 */
export type Estabilizacion = "ninguna" | "amortiguada" | "actitud" | "estacionario";

// ── El rotor ─────────────────────────────────────────────────────────────

/**
 * **El factor de la potencia inducida**: la que haría falta con el aire bajando
 * igual por todo el disco, más lo que se pierde porque no baja igual y por las
 * puntas. 1,15 es el valor de manual (Johnson, *Helicopter Theory*; y el del
 * informe de la NASA).
 */
const FACTOR_INDUCIDO = 1.15;

/** Lo que sale de resolver un rotor. */
export interface Rotacion {
  /** El empuje, N. */
  readonly empuje: number;
  /** La velocidad inducida de la cantidad de movimiento, m/s. */
  readonly inducida: number;
  /** La que de verdad atraviesa el disco, con el efecto suelo, m/s. */
  readonly enElDisco: number;
  /** La potencia que se lleva del eje, W: negativa si el aire lo mueve. */
  readonly potencia: number;
  /** La relación de avance: la velocidad en el plano entre la de las puntas. */
  readonly avance: number;
  /** El flujo que atraviesa el disco entre la velocidad de las puntas: positivo hacia abajo. */
  readonly flujo: number;
}

/**
 * **Resuelve un rotor**: su empuje, su velocidad inducida y su potencia.
 *
 * El empuje sale del elemento de pala —cada trozo de pala con su ángulo y su
 * aire— y depende del aire que baja por el disco; ese aire sale de la cantidad
 * de movimiento —para empujar hacia arriba hay que echar aire hacia abajo— y
 * depende del empuje. Se buscan los dos a la vez por Newton-Raphson, empezando
 * por la del paso anterior, que es como lo hace el informe de la NASA.
 *
 * - `normal`: lo que el rotor se mueve contra su empuje, m/s: positivo bajando
 *   en el principal. Bajando entra aire por debajo y empuja más.
 * - `enElPlano`: lo que se mueve en el plano del disco, m/s.
 * - `suelo`: (R/4z)², con z la altura del buje sobre el suelo; 0 lejos de él.
 *
 * **Lo que no hace**: el anillo turbillonario, cuando se baja casi en vertical a
 * la velocidad de lo que el rotor echa hacia abajo. Ahí la cantidad de
 * movimiento no vale y la solución puede no converger: se queda la del último
 * paso, acotada.
 */
export function resolverDisco(
  d: Disco,
  densidad: number,
  vueltas: number,
  paso: number,
  normal: number,
  enElPlano: number,
  inducidaAntes: number,
  suelo = 0,
): Rotacion {
  const R = d.radio;
  const A = Math.PI * R * R;
  const puntas = Math.max(1, vueltas * R);
  const solidez = (d.palas * d.cuerda) / (Math.PI * R);
  const mu = enElPlano / puntas;
  const C = 0.5 * densidad * d.pendiente * solidez * A * puntas * puntas;
  const angulo = paso * (1 / 3 + (mu * mu) / 2) + d.torsion * (1 / 4 + (mu * mu) / 4);
  /*
   * El efecto suelo de Cheeseman y Bennett: el disco cerca del suelo echa menos
   * aire hacia abajo para el mismo empuje. Con velocidad la estela se va hacia
   * atrás y el suelo deja de notarse: el término (V/vᵢ)² lo apaga.
   */
  const delSuelo = (vi: number): number => {
    if (suelo <= 0) return 0;
    const r = enElPlano / Math.max(0.5, Math.abs(vi));
    return suelo / (1 + r * r);
  };
  const porLaPala = (vi: number): number => C * (angulo - (vi * (1 - delSuelo(vi)) - normal) / (2 * puntas));
  const porElAire = (vi: number): number =>
    2 * densidad * A * vi * Math.sqrt(enElPlano * enElPlano + (vi - normal) * (vi - normal));
  let vi = Number.isFinite(inducidaAntes) ? inducidaAntes : 10;
  for (let k = 0; k < 10; k++) {
    const h = porLaPala(vi) - porElAire(vi);
    const dv = 1e-3;
    const dh = (porLaPala(vi + dv) - porElAire(vi + dv) - h) / dv;
    if (Math.abs(dh) < 1e-6) break;
    const salto = Math.max(-4, Math.min(4, -h / dh));
    vi += 0.8 * salto;
    if (Math.abs(salto) < 1e-4) break;
  }
  const empuje = porLaPala(vi);
  const enElDisco = vi * (1 - delSuelo(vi));
  const perfil = ((solidez * d.cd0) / 8) * densidad * A * puntas * puntas * puntas * (1 + 4.65 * mu * mu);
  const potencia = FACTOR_INDUCIDO * empuje * enElDisco - empuje * normal + perfil;
  return { empuje, inducida: vi, enElDisco, potencia, avance: mu, flujo: (enElDisco - normal) / puntas };
}

/** **La potencia que dan los motores** a esta densidad, W, en total. */
export function potenciaDisponible(f: FichaDeHelicoptero, densidad: number): number {
  return f.motores.cuantos * f.motores.potencia * Math.pow(densidad / SEA_LEVEL_DENSITY, f.motores.caida);
}

/**
 * **El colectivo que sostiene el peso, quieto y lejos del suelo**, de 0 a 1: el
 * paso que da ese empuje, sin el rotor de cola ni la estela sobre el fuselaje, así
 * que se queda un poco corto. Vale para colocar la palanca cerca.
 */
export function colectivoDeEstacionario(f: FichaDeHelicoptero, masa: number, densidad: number): number {
  const peso = masa * GRAVITY;
  let bajo = -0.2;
  let alto = 0.6;
  let vi = 10;
  for (let k = 0; k < 40; k++) {
    const medio = (bajo + alto) / 2;
    const r = resolverDisco(f.rotor, densidad, f.rotor.vueltas, medio, 0, 0, vi);
    vi = r.inducida;
    if (r.empuje < peso) bajo = medio;
    else alto = medio;
  }
  const paso = (bajo + alto) / 2;
  const { minimo, maximo } = f.rotor.paso;
  return Math.max(0, Math.min(1, (paso - minimo) / (maximo - minimo)));
}

/** (R/4z)² para el efecto suelo, con z la altura del buje: acotado a medio radio, donde la fórmula deja de valer. */
export function terminoDelSuelo(radio: number, alturaDelBuje: number): number {
  const z = Math.max(0.5 * radio, alturaDelBuje);
  const k = radio / (4 * z);
  return k * k;
}

/**
 * **La potencia para sostenerse quieto**, W, en los motores: la del rotor
 * principal, la del de cola para parar su par, y lo que se pierde por el
 * camino. Es la cuenta del estacionario sin tener que volarlo, con las mismas
 * fórmulas que el vuelo; la usan las pruebas para los techos de la ficha.
 *
 * `alturaDelBuje`: sobre el suelo, m, o `Infinity` lejos de él.
 */
export function potenciaEnEstacionario(
  f: FichaDeHelicoptero,
  masa: number,
  densidad: number,
  alturaDelBuje = Infinity,
): number {
  const suelo = Number.isFinite(alturaDelBuje) ? terminoDelSuelo(f.rotor.radio, alturaDelBuje) : 0;
  const peso = masa * GRAVITY;
  let empuje = peso;
  let vi = 10;
  let rotor: Rotacion = resolverDisco(f.rotor, densidad, f.rotor.vueltas, 0, 0, 0, vi, suelo);
  for (let i = 0; i < 6; i++) {
    // El paso que da este empuje, por bisección: el empuje crece con el paso.
    let bajo = -0.1;
    let alto = 0.5;
    for (let k = 0; k < 40; k++) {
      const medio = (bajo + alto) / 2;
      rotor = resolverDisco(f.rotor, densidad, f.rotor.vueltas, medio, 0, 0, vi, suelo);
      vi = rotor.inducida;
      if (rotor.empuje < empuje) bajo = medio;
      else alto = medio;
    }
    // La estela da en el fuselaje: hay que sostener también eso.
    empuje = peso + descargaDelFuselaje(f, densidad, rotor.enElDisco, 0);
  }
  const par = rotor.potencia / f.rotor.vueltas;
  const cola = empujeDeColaPara(f, densidad, par / f.cola.brazo);
  return (rotor.potencia + cola.potencia) / f.motores.rendimiento;
}

/** El rotor de cola dando este empuje, quieto en el aire. */
function empujeDeColaPara(f: FichaDeHelicoptero, densidad: number, empuje: number): Rotacion {
  const vueltas = f.cola.vueltas;
  let bajo = -0.3;
  let alto = 0.6;
  let r = resolverDisco(f.cola, densidad, vueltas, 0, 0, 0, 10);
  let vi = 10;
  for (let k = 0; k < 40; k++) {
    const medio = (bajo + alto) / 2;
    r = resolverDisco(f.cola, densidad, vueltas, medio, 0, 0, vi);
    vi = r.inducida;
    if (r.empuje < empuje) bajo = medio;
    else alto = medio;
  }
  return r;
}

/**
 * **Lo que la estela del rotor empuja hacia abajo al fuselaje**, N. Debajo del
 * disco el aire baja más deprisa que en él —media vez más, a medio camino de
 * las dos veces de lejos—, y con velocidad la estela se va hacia atrás y deja
 * de darle.
 */
function descargaDelFuselaje(f: FichaDeHelicoptero, densidad: number, enElDisco: number, enElPlano: number): number {
  const baja = 1.5 * enElDisco * desvioDeLaEstela(enElPlano, enElDisco);
  return 0.5 * densidad * f.fuselaje.planta * baja * Math.abs(baja);
}

/** Cuánto de la estela sigue cayendo sobre el fuselaje: 1 quieto, nada volando. */
function desvioDeLaEstela(enElPlano: number, enElDisco: number): number {
  const r = enElPlano / Math.max(0.5, Math.abs(enElDisco));
  return 1 / (1 + r * r);
}

// ── El modelo ────────────────────────────────────────────────────────────

/**
 * **Lo más deprisa que pide el cíclico a tope en la estabilización de estacionario**,
 * m/s sobre el suelo: los 136 nudos del crucero recomendado de Airbus. Era la mitad,
 * unos ochenta, y quien lo probaba no pasaba de ahí sin saber por qué.
 */
export const VA_EN_ESTACIONARIO = 70;

/**
 * **Lo que sube o baja el colectivo por segundo con la tecla**: de abajo a tope
 * en unos seis segundos, y no en uno y medio como el gas de un avión. Ver
 * `Input.ponerRitmoDelGas`.
 */
export const RITMO_DEL_COLECTIVO = 0.16;

/**
 * **En la estabilización de estacionario, el colectivo pide subir o bajar**, m/s:
 * a media palanca se queda a la altura que tiene, y a tope arriba o abajo, esto.
 */
export const SUBE_EN_ESTACIONARIO = 4;

/** Por debajo de estas vueltas, en tanto por uno, la estabilización de estacionario quita colectivo. */
const VUELTAS_QUE_SE_GUARDAN = 0.985;

/** El paso de integración más largo, s: el disco tarda unas centésimas en seguir al cíclico. */
const PASO_MAXIMO = 1 / 240;
/** Lo que el regulador tarda en recuperar las vueltas, s. */
const REGULADOR = 0.5;
/** La rigidez y la amortiguación de cada rueda, N/m y N·s/m: unos centímetros de amortiguador. */
const MUELLE = 400_000;
const AMORTIGUADOR = 45_000;
/** El agarre de la rueda frenada o de lado, y lo que frena rodando. */
const AGARRE = 0.6;
const RODADURA = 0.03;
/** El muelle con que la rueda se agarra a su punto del suelo, N/m y N·s/m. */
const AGARRE_MUELLE = 200_000;
const AGARRE_AMORTIGUA = 20_000;

/** Lo que se ve del rotor y de los motores, para la pantalla y las pruebas. */
export interface EstadoDelRotor {
  /** Las vueltas del rotor, rad/s, y en tanto por uno de las nominales. */
  readonly vueltas: number;
  readonly vueltasPorUno: number;
  /** Lo que dan los motores, W, y en tanto por uno de la de despegue de todos. */
  readonly potenciaMotores: number;
  readonly par: number;
  readonly potenciaDisponible: number;
  /** Lo que piden los dos rotores en el eje, W. */
  readonly potenciaRotores: number;
  readonly empuje: number;
  readonly empujeCola: number;
  /** El disco respecto al mástil, rad: atrás y a la derecha. */
  readonly a1: number;
  readonly b1: number;
  /** El aire que atraviesa el disco, m/s. */
  readonly inducida: number;
  /** Cuánto han arrancado los motores: 0 parados, 1 dando potencia de vuelo. */
  readonly arranque: number;
  /** Si el freno del rotor está puesto: pedido y por debajo de sus vueltas. */
  readonly frenoDelRotor: boolean;
}

export class ModeloDeHelicoptero {
  readonly state: FlightState;
  private masa: number;
  private aire: Aire = AIRE_ESTANDAR;
  private estabilizacion: Estabilizacion = "actitud";
  private readonly viento = new Vector3();
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly down = new Vector3();
  private readonly spin = new Quaternion();
  private readonly fuerza = new Vector3();
  private readonly tmp = new Vector3();

  // El rotor y los motores.
  private vueltas = 0;
  private potenciaMotores = 0;
  /** Cuánto ha arrancado el motor: 0 parado, 1 en vuelo. */
  private arranque = 0;
  private frenoDelRotorPuesto = false;
  private a1 = 0;
  private b1 = 0;
  private inducida = 10;
  private inducidaCola = 5;
  private ultimo: EstadoDelRotor;
  private ultimosMandos: MandosDeHelicoptero = mandosNeutros();
  /** Dónde se agarra cada rueda al suelo, o `null` si está en el aire. */
  private readonly anclas: ({ x: number; z: number } | null)[] = [];

  // La estabilización: lo que sostiene y lo que va aprendiendo.
  private cabeceoPedido = 0;
  private alabeoPedido = 0;
  private rumboPedido = 0;
  private integralCabeceo = 0;
  private integralAlabeo = 0;
  private integralPedales = 0;
  private sostieneCabeceo = 0;
  private sostieneAlabeo = 0;
  /** El colectivo que sostiene la altura, aprendido: ver el colectivo en `estabilizar`. */
  private colectivoAprendido = 0.3;
  /** Y el que llega al rotor, que se mueve suave. */
  private colectivoSuave = 0;
  /** La subida que se va pidiendo, m/s, que llega poco a poco a la de la palanca. */
  private subidaPedida = 0;
  /** El colectivo con el que se aprendió el pie, para adelantarlo al par cuando cambia. */
  private colectivoDePie = 0.3;

  constructor(
    readonly ficha: FichaDeHelicoptero,
    private readonly suelo: GroundSampler = () => 0,
  ) {
    this.masa = ficha.masaMaxima;
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
      onGround: false,
      stalled: false,
      stallWarning: false,
      stallWarningAlpha: Math.PI,
      crashed: false,
      secondsToImpact: Infinity,
      touchdownSinkRate: 0,
    };
    this.ultimo = this.estadoDelRotor(0, 0, 0, 0);
  }

  // ── Lo que se le pone ──

  ponerMasa(kg: number): void {
    this.masa = Math.max(this.ficha.masaVacia, Math.min(this.ficha.masaMaxima, kg));
  }

  masaAhora(): number {
    return this.masa;
  }

  ponerAire(aire: Aire): void {
    this.aire = aire;
  }

  /** El viento, m/s, hacia donde va: x al este, z al sur. */
  ponerViento(x: number, z: number): void {
    this.viento.set(x, 0, z);
  }

  /** La estabilización que lleva ahora. */
  estabilizacionAhora(): Estabilizacion {
    return this.estabilizacion;
  }

  ponerEstabilizacion(e: Estabilizacion): void {
    if (e === this.estabilizacion) return;
    this.estabilizacion = e;
    this.sostenerLoQueHay();
  }

  rotor(): EstadoDelRotor {
    return this.ultimo;
  }

  /** Los mandos que llegan al rotor: los de quien vuela con lo que añade la estabilización. */
  mandosAhora(): Readonly<MandosDeHelicoptero> {
    return this.ultimosMandos;
  }

  /** Cabeceo, alabeo y rumbo, rad: morro arriba, ala derecha abajo, al este. */
  actitud(): { readonly cabeceo: number; readonly alabeo: number; readonly rumbo: number } {
    this.ejes();
    return {
      cabeceo: Math.asin(Math.max(-1, Math.min(1, this.forward.y))),
      alabeo: Math.atan2(-this.right.y, -this.down.y),
      rumbo: Math.atan2(this.forward.x, -this.forward.z),
    };
  }

  /**
   * **Empieza de nuevo**: en `position`, mirando a `heading`, a `airspeed` hacia
   * delante, y con el rotor girando a sus vueltas si `rotorEnMarcha`. Si la
   * posición queda por debajo de las ruedas, se le pone sobre ellas.
   */
  reset(inicial: { position: Vector3; heading: number; airspeed?: number; rotorEnMarcha?: boolean }): void {
    const s = this.state;
    s.orientation.setFromAxisAngle(new Vector3(0, 1, 0), -inicial.heading);
    s.position.copy(inicial.position);
    const apoyo = Math.max(...this.ficha.ruedas.map((r) => r.z));
    const cota = this.suelo(s.position.x, s.position.z);
    if (s.position.y < cota + apoyo) s.position.y = cota + apoyo;
    this.ejes();
    s.velocity.copy(this.forward).multiplyScalar(inicial.airspeed ?? 0);
    s.rollRate = 0;
    s.pitchRate = 0;
    s.yawRate = 0;
    s.crashed = false;
    s.touchdownSinkRate = 0;
    const enMarcha = inicial.rotorEnMarcha ?? true;
    this.vueltas = enMarcha ? this.ficha.rotor.vueltas : 0;
    this.arranque = enMarcha ? 1 : 0;
    this.potenciaMotores = 0;
    this.a1 = 0;
    this.b1 = 0;
    this.inducida = 10;
    this.inducidaCola = 5;
    this.ultimosMandos = mandosNeutros();
    this.anclas.length = 0;
    this.sostenerLoQueHay();
    /*
     * Y el colectivo de la estabilización de estacionario, el que toca: colocado en
     * el aire, el del estacionario, que si no caía segundo y medio mientras lo
     * cogía; posado, abajo, y aprendido cerca del de despegar.
     */
    const sostiene = colectivoDeEstacionario(this.ficha, this.masa, airDensity(s.position.y, this.aire));
    const enElAire = s.position.y > cota + apoyo + 0.5;
    this.colectivoAprendido = enElAire ? sostiene : 0.9 * sostiene;
    this.colectivoSuave = enElAire ? sostiene : 0;
    this.derivados();
  }

  /**
   * **La estabilización se queda con la actitud y el rumbo de ahora**, y con los
   * mandos que llegaban al rotor: al cambiar de modo en el aire no se suelta nada.
   * Empezaba de cero, y el helicóptero se torcía diez grados mientras volvía a
   * encontrar el cíclico que lo sostenía.
   */
  private sostenerLoQueHay(): void {
    const a = this.actitud();
    this.cabeceoPedido = a.cabeceo;
    this.alabeoPedido = a.alabeo;
    this.rumboPedido = a.rumbo;
    this.integralCabeceo = 0;
    this.integralAlabeo = 0;
    this.integralPedales = this.ultimosMandos.pedales;
    this.sostieneCabeceo = this.ultimosMandos.cabeceo;
    this.sostieneAlabeo = this.ultimosMandos.alabeo;
    this.colectivoAprendido = this.ultimosMandos.colectivo || 0.3;
    this.colectivoSuave = this.ultimosMandos.colectivo;
  }

  // ── El paso ──

  step(dt: number, mandos: MandosDeHelicoptero): void {
    if (!(dt > 0)) return;
    const n = Math.max(1, Math.ceil(dt / PASO_MAXIMO));
    const h = dt / n;
    for (let i = 0; i < n; i++) this.integrar(h, mandos);
    this.derivados();
  }

  private ejes(): void {
    const q = this.state.orientation;
    this.forward.copy(FORWARD_LOCAL).applyQuaternion(q);
    this.right.copy(RIGHT_LOCAL).applyQuaternion(q);
    this.down.copy(DOWN_LOCAL).applyQuaternion(q);
  }

  private integrar(dt: number, piloto: MandosDeHelicoptero): void {
    const f = this.ficha;
    const s = this.state;
    this.ejes();
    const mandos = this.estabilizar(dt, piloto);
    this.ultimosMandos = mandos;

    // ── El aire, en ejes cuerpo ──
    const cota = this.suelo(s.position.x, s.position.z);
    const densidad = airDensity(s.position.y, this.aire);
    this.tmp.copy(s.velocity).sub(this.viento);
    const u = this.tmp.dot(this.forward);
    const v = this.tmp.dot(this.right);
    const w = this.tmp.dot(this.down);
    const p = s.rollRate;
    const q = s.pitchRate;
    const r = s.yawRate;
    /** La velocidad de un punto del helicóptero respecto al aire: la del centro más el giro. */
    const enElPunto = (x: number, y: number, z: number): [number, number, number] => [
      u + q * z - r * y,
      v + r * x - p * z,
      w + p * y - q * x,
    ];
    let X = 0;
    let Y = 0;
    let Z = 0;
    let L = 0;
    let M = 0;
    let N = 0;
    /** Una fuerza en ejes cuerpo aplicada en un punto: suma la fuerza y su momento. */
    const aplicar = (fx: number, fy: number, fz: number, x: number, y: number, z: number): void => {
      X += fx;
      Y += fy;
      Z += fz;
      L += y * fz - z * fy;
      M += z * fx - x * fz;
      N += x * fy - y * fx;
    };

    // ── El rotor principal ──
    const rot = f.rotor;
    const hx = rot.bujeAdelante;
    const hz = -rot.alturaDelBuje;
    const [uh, vh, wh] = enElPunto(hx, 0, hz);
    const paso = rot.paso.minimo + (rot.paso.maximo - rot.paso.minimo) * mandos.colectivo;
    const atras = this.a1 - rot.inclinacionDelMastil;
    const ca = Math.cos(atras);
    const sa = Math.sin(atras);
    const cb = Math.cos(this.b1);
    const sb = Math.sin(this.b1);
    // La normal del disco hacia arriba, en ejes cuerpo.
    const nx = -sa * cb;
    const ny = sb;
    const nz = -ca * cb;
    const haciaArriba = uh * nx + vh * ny + wh * nz;
    const normal = -haciaArriba;
    const enElPlano = Math.sqrt(Math.max(0, uh * uh + vh * vh + wh * wh - haciaArriba * haciaArriba));
    const alturaDelBuje = s.position.y - cota + rot.alturaDelBuje * -this.down.y;
    const delSuelo = terminoDelSuelo(rot.radio, alturaDelBuje);
    const vueltas = Math.max(0, this.vueltas);
    const principal =
      vueltas > 1
        ? resolverDisco(rot, densidad, vueltas, paso, normal, enElPlano, this.inducida, delSuelo)
        : { empuje: 0, inducida: 0, enElDisco: 0, potencia: 0, avance: 0, flujo: 0 };
    this.inducida = principal.inducida;
    aplicar(principal.empuje * nx, principal.empuje * ny, principal.empuje * nz, hx, 0, hz);
    // El buje empuja el fuselaje hacia donde se inclina el disco respecto al mástil.
    const rigidez = rot.rigidez * (vueltas / rot.vueltas) ** 2;
    L += rigidez * this.b1;
    M += rigidez * this.a1;

    /*
     * **El disco sigue al cíclico**, con un retraso de 16/(γΩ) —unas siete
     * centésimas en el Super Puma—, y se le añaden dos cosas que hace solo:
     * se echa hacia atrás con la velocidad, porque la pala que avanza sube más
     * que la que se retira, y se queda atrás cuando el fuselaje gira, que es lo
     * que amortigua.
     */
    const puntas = Math.max(1, vueltas * rot.radio);
    const mu = principal.avance;
    const atrasPorVelocidad =
      (2 * ((4 / 3) * paso + rot.torsion - principal.flujo)) / Math.max(0.5, 1 - (mu * mu) / 2);
    const retraso = 16 / (rot.lock * Math.max(1, vueltas));
    const a1Quiere = mandos.cabeceo * rot.ciclico.cabeceo + (atrasPorVelocidad * uh) / puntas - retraso * q;
    const b1Quiere = mandos.alabeo * rot.ciclico.alabeo - (atrasPorVelocidad * vh) / puntas - retraso * p;
    const sigue = 1 - Math.exp(-dt / retraso);
    this.a1 += (a1Quiere - this.a1) * sigue;
    this.b1 += (b1Quiere - this.b1) * sigue;

    // ── El rotor de cola ──
    const cola = f.cola;
    const tx = -cola.brazo;
    const tz = -cola.altura;
    const [ut, vt, wt] = enElPunto(tx, 0, tz);
    // Empuja hacia el lado que gira el morro contra el par: a la izquierda si el principal va en horario.
    const lado = -rot.sentido;
    const contraEmpuje = -(vt * lado);
    const enSuPlano = Math.sqrt(ut * ut + wt * wt);
    const vueltasCola = (cola.vueltas * vueltas) / rot.vueltas;
    const pasoCola = cola.paso.centro + rot.sentido * mandos.pedales * cola.paso.recorrido;
    const deCola =
      vueltasCola > 1
        ? resolverDisco(cola, densidad, vueltasCola, pasoCola, contraEmpuje, enSuPlano, this.inducidaCola)
        : { empuje: 0, inducida: 0, enElDisco: 0, potencia: 0, avance: 0, flujo: 0 };
    this.inducidaCola = deCola.inducida;
    aplicar(0, deCola.empuje * lado, 0, tx, 0, tz);

    /*
     * ── Los motores, el regulador y las vueltas ──
     *
     * **Arrancar lleva su rato.** El motor parado no da nada mientras el
     * arrancador lo mueve y se enciende —la primera mitad del arranque—, y
     * después la potencia que puede dar sube hasta la de vuelo. El regulador
     * pide la que haga falta para las vueltas nominales, así que el rotor sube
     * de vueltas tan deprisa como deja esa potencia contra su inercia. Al
     * pararlo, se apaga en unos segundos y el rotor sigue girando solo, frenado
     * por el aire, minutos, si no se le pone el freno.
     */
    const tardaEnArrancar = f.motores.arranque ?? 30;
    this.arranque = piloto.motores
      ? Math.min(1, this.arranque + dt / tardaEnArrancar)
      : Math.max(0, this.arranque - dt / 8);
    const encendido = Math.max(0, (this.arranque - 0.5) / 0.5);
    const disponible = potenciaDisponible(f, densidad) * encendido * encendido;
    const freno = f.frenoDelRotor;
    // El freno solo se pone por debajo de sus vueltas; y puesto, los motores se quedan al ralentí.
    if (!piloto.frenoDelRotor) this.frenoDelRotorPuesto = false;
    else if (freno && vueltas <= freno.hasta * rot.vueltas) this.frenoDelRotorPuesto = true;
    const piden = (principal.potencia + deCola.potencia) / f.motores.rendimiento;
    const corrige = (rot.inercia * rot.vueltas * (rot.vueltas - vueltas)) / REGULADOR;
    const objetivo = this.frenoDelRotorPuesto
      ? 0
      : Math.max(0, Math.min(disponible, piden + corrige / f.motores.rendimiento));
    const respuesta = piloto.motores ? f.motores.respuesta : 2;
    this.potenciaMotores += (objetivo - this.potenciaMotores) * (1 - Math.exp(-dt / respuesta));
    const alEje = this.potenciaMotores * f.motores.rendimiento;
    let nuevas = vueltas + ((alEje - principal.potencia - deCola.potencia) / (rot.inercia * Math.max(5, vueltas))) * dt;
    if (this.frenoDelRotorPuesto && freno) nuevas = Math.min(nuevas, Math.max(0, vueltas - (freno.par / rot.inercia) * dt));
    this.vueltas = Math.max(0, nuevas);
    /*
     * **El par**: lo que el eje da al rotor principal lo devuelve el fuselaje
     * girando al revés. Es el par del eje y no el del aire: mientras las vueltas
     * cambian no son lo mismo. Sin motor, el rotor arrastra al de cola y el par
     * cambia de lado, que es por qué en autorrotación se pisa el otro pedal.
     */
    const parDelEje = (alEje - deCola.potencia) / Math.max(5, vueltas);
    N += -rot.sentido * parDelEje;

    // ── El fuselaje y los empenajes ──
    const fus = f.fuselaje;
    const enElPlanoDelDisco = Math.sqrt(uh * uh + vh * vh);
    const estela = 1.5 * principal.enElDisco * desvioDeLaEstela(enElPlanoDelDisco, principal.enElDisco);
    const wf = w - estela;
    const vf = Math.sqrt(u * u + v * v + wf * wf);
    aplicar(
      -0.5 * densidad * fus.frente * vf * u,
      -0.5 * densidad * fus.lado * vf * v,
      -0.5 * densidad * fus.planta * vf * wf,
      0,
      0,
      0,
    );
    const est = f.estabilizador;
    {
      const [ue, , we] = enElPunto(-est.brazo, 0, 0);
      const ataque = Math.atan2(we, Math.max(0.1, Math.abs(ue)));
      const v2 = ue * ue + we * we;
      const cl = est.pendiente * Math.max(-0.3, Math.min(0.3, ataque));
      aplicar(0, 0, -0.5 * densidad * v2 * est.area * cl, -est.brazo, 0, 0);
    }
    const der = f.deriva;
    {
      const [ud, vd] = enElPunto(-der.brazo, 0, -der.altura);
      const derrape = Math.atan2(vd, Math.max(0.1, Math.abs(ud)));
      const v2 = ud * ud + vd * vd;
      const cy = der.pendiente * Math.max(-0.3, Math.min(0.3, derrape));
      aplicar(0, -0.5 * densidad * v2 * der.area * cy, 0, -der.brazo, 0, -der.altura);
    }

    // ── Las ruedas ──
    let enElSuelo = false;
    const frenoRuedas = Math.max(0, Math.min(1, piloto.frenos));
    // La velocidad de la toma es la de esta toma, no la peor del vuelo: se apunta al tocar.
    const veniaEnElAire = !s.onGround;
    let primeraRueda = true;
    for (let i = 0; i < f.ruedas.length; i++) {
      const rueda = f.ruedas[i]!;
      const py = s.position.y + this.forward.y * rueda.x + this.right.y * rueda.y + this.down.y * rueda.z;
      const px = s.position.x + this.forward.x * rueda.x + this.right.x * rueda.y + this.down.x * rueda.z;
      const pz = s.position.z + this.forward.z * rueda.x + this.right.z * rueda.y + this.down.z * rueda.z;
      const hunde = this.suelo(px, pz) - py;
      if (hunde <= 0) {
        this.anclas[i] = null;
        continue;
      }
      enElSuelo = true;
      // La velocidad de la rueda respecto al suelo, en ejes cuerpo y luego en el mundo.
      const vx = s.velocity.dot(this.forward) + q * rueda.z - r * rueda.y;
      const vy = s.velocity.dot(this.right) + r * rueda.x - p * rueda.z;
      const vz = s.velocity.dot(this.down) + p * rueda.y - q * rueda.x;
      const mundo = this.tmp
        .copy(this.forward)
        .multiplyScalar(vx)
        .addScaledVector(this.right, vy)
        .addScaledVector(this.down, vz);
      const apoyo = Math.max(0, MUELLE * hunde - AMORTIGUADOR * mundo.y);
      /*
       * **El agarre, estático de verdad**: la rueda se queda cogida a su punto del
       * suelo con un muelle, y solo resbala si lo que tira pasa de lo que agarra. De
       * lado siempre; hacia delante solo frenada, que sin freno rueda. Era un
       * rozamiento suavizado, y con él cualquier fuerza pequeña lo arrastraba: con el
       * freno puesto, el empuje del mástil, que cae hacia delante, y el par lo movían
       * centímetros y lo giraban un grado cada diez segundos.
       */
      const ancla = this.anclas[i] ?? (this.anclas[i] = { x: px, z: pz });
      // La de morro se orienta sola: ni agarra de lado ni lleva freno, y por eso se gira con los pies.
      const agarres = rueda.loca
        ? ([] as const)
        : ([
            [this.right, AGARRE, vy],
            [this.forward, AGARRE * frenoRuedas, vx],
          ] as const);
      let fx = 0;
      let fy = 0;
      for (const [eje, agarre, velocidadEnEje] of agarres) {
        // El eje, tumbado sobre el suelo.
        const ex = eje.x;
        const ez = eje.z;
        const largo = Math.hypot(ex, ez) || 1;
        const dx = ex / largo;
        const dz = ez / largo;
        const corrido = (px - ancla.x) * dx + (pz - ancla.z) * dz;
        const tope = agarre * apoyo;
        let tira = -AGARRE_MUELLE * corrido - AGARRE_AMORTIGUA * velocidadEnEje;
        if (Math.abs(tira) > tope) {
          // Resbala: el ancla se va con la rueda, a la distancia de lo que agarra.
          tira = Math.sign(tira) * tope;
          const queda = -tira / AGARRE_MUELLE;
          ancla.x += (corrido - queda) * dx;
          ancla.z += (corrido - queda) * dz;
        }
        if (eje === this.forward) fx += tira;
        else fy += tira;
      }
      // Y sin freno, rodando, apenas lo que frena el neumático.
      fx += -apoyo * RODADURA * (rueda.loca ? 1 : 1 - frenoRuedas) * Math.tanh(vx / 0.1);
      // El apoyo es vertical en el mundo: se pasa a ejes cuerpo.
      const fzMundo = apoyo;
      aplicar(
        fx + fzMundo * this.forward.y,
        fy + fzMundo * this.right.y,
        fzMundo * this.down.y,
        rueda.x,
        rueda.y,
        rueda.z,
      );
      if (veniaEnElAire) {
        s.touchdownSinkRate = primeraRueda ? -s.velocity.y : Math.max(s.touchdownSinkRate, -s.velocity.y);
        primeraRueda = false;
      }
    }
    s.onGround = enElSuelo;

    // ── Newton y Euler ──
    this.fuerza
      .copy(this.forward)
      .multiplyScalar(X)
      .addScaledVector(this.right, Y)
      .addScaledVector(this.down, Z);
    this.fuerza.y -= this.masa * GRAVITY;
    s.loadFactor = -Z / (this.masa * GRAVITY);
    s.velocity.addScaledVector(this.fuerza, dt / this.masa);
    s.position.addScaledVector(s.velocity, dt);
    const { xx, yy, zz } = fus.inercia;
    s.rollRate += (dt * (L + (yy - zz) * q * r)) / xx;
    s.pitchRate += (dt * (M + (zz - xx) * r * p)) / yy;
    s.yawRate += (dt * (N + (xx - yy) * p * q)) / zz;
    this.tmp
      .copy(this.forward)
      .multiplyScalar(s.rollRate)
      .addScaledVector(this.right, s.pitchRate)
      .addScaledVector(this.down, s.yawRate);
    this.spin.set(this.tmp.x * dt * 0.5, this.tmp.y * dt * 0.5, this.tmp.z * dt * 0.5, 1);
    s.orientation.premultiply(this.spin).normalize();

    this.ultimo = this.estadoDelRotor(disponible, principal.empuje, deCola.empuje, principal.potencia + deCola.potencia);
  }

  private estadoDelRotor(disponible: number, empuje: number, empujeCola: number, rotores: number): EstadoDelRotor {
    const f = this.ficha;
    const despegue = f.motores.cuantos * f.motores.potencia;
    return {
      vueltas: this.vueltas,
      vueltasPorUno: this.vueltas / f.rotor.vueltas,
      potenciaMotores: this.potenciaMotores,
      par: this.vueltas > 1 ? (this.potenciaMotores / this.vueltas) / (despegue / f.rotor.vueltas) : 0,
      potenciaDisponible: disponible,
      potenciaRotores: rotores,
      empuje,
      empujeCola,
      a1: this.a1,
      b1: this.b1,
      inducida: this.inducida,
      arranque: this.arranque,
      frenoDelRotor: this.frenoDelRotorPuesto,
    };
  }

  // ── La estabilización ──

  /**
   * **Lo que llega al rotor**: los mandos de quien vuela con lo que añade la
   * estabilización. Las ganancias salen de la autoridad del cíclico y la inercia
   * del Super Puma, para una respuesta de un par de segundos sin pasarse.
   */
  private estabilizar(dt: number, piloto: MandosDeHelicoptero): MandosDeHelicoptero {
    const modo = this.estabilizacion;
    const salida = { ...piloto };
    if (modo === "ninguna") return salida;
    const s = this.state;
    const p = s.rollRate;
    const q = s.pitchRate;
    const r = s.yawRate;
    if (modo === "amortiguada") {
      // Solo frenar los giros, y con autoridad limitada: la palanca sigue mandando.
      salida.cabeceo = acotar(piloto.cabeceo + acotar(-1.2 * q, 0.3), 1);
      salida.alabeo = acotar(piloto.alabeo + acotar(-0.6 * p, 0.3), 1);
      salida.pedales = acotar(piloto.pedales + acotar(-1.0 * r, 0.3), 1);
      return salida;
    }
    const a = this.actitud();
    this.tmp.copy(s.velocity).sub(this.viento);
    const aire = Math.sqrt(this.tmp.x * this.tmp.x + this.tmp.z * this.tmp.z);
    /*
     * **Posado**, la estabilización sigue sosteniendo la actitud, que es lo que
     * impide el vuelco dinámico al despegar —el rotor de cola empuja a un lado y
     * el helicóptero pivota sobre la rueda de ese lado—, pero no acumula: la
     * actitud que sostiene va siguiendo despacio la que tiene sobre las ruedas, y
     * lo aprendido se queda quieto. Sin eso iba sumando una actitud que el suelo
     * no le deja tomar y la soltaba de golpe al despegar. En `actitud`, el cíclico
     * de la mano llega además tal cual al rotor, que es como se rueda.
     */
    const posado = s.onGround;
    const conLaMano = posado && modo === "actitud";

    // Lo que se pide: en `actitud`, el cíclico mueve la actitud y al soltarlo se queda.
    if (conLaMano) {
      const sigue = 1 - Math.exp(-dt / 2);
      this.cabeceoPedido += (a.cabeceo - this.cabeceoPedido) * sigue;
      this.alabeoPedido += diferencia(a.alabeo, this.alabeoPedido) * sigue;
    } else if (modo === "actitud") {
      this.cabeceoPedido = acotar(this.cabeceoPedido + piloto.cabeceo * 10 * GRADO * dt, 30 * GRADO);
      this.alabeoPedido = acotar(this.alabeoPedido + piloto.alabeo * 15 * GRADO * dt, 45 * GRADO);
    } else {
      /*
       * **En estacionario, el cíclico pide velocidad sobre el suelo**, y soltarlo
       * pide estar quieto encima del mismo sitio, sople lo que sople. Adelante y
       * atrás, hasta `VA_EN_ESTACIONARIO`; a los lados, despacio, ir de lado, y
       * deprisa, inclinarse para virar, que al soltar se nivela. La actitud que lo
       * da la busca este lazo, que aprende con su integral la del estacionario.
       *
       * Sobre el suelo y no respecto al aire, y sin cambiar de modo por el camino:
       * pasaba a mandar la actitud en cuanto el aire iba a más de 12 m/s, y con 20
       * nudos de viento eso era empujar el cíclico. Soltarlo dejaba entonces el
       * morro abajo, y el helicóptero se iba a 95 nudos sin volver.
       */
      const sen = Math.sin(a.rumbo);
      const cos = Math.cos(a.rumbo);
      const adelante = s.velocity.x * sen - s.velocity.z * cos;
      const derecha = s.velocity.x * cos + s.velocity.z * sen;
      const deprisa = Math.max(0, Math.min(1, (Math.abs(adelante) - 8) / 6));
      const errAdelante = -piloto.cabeceo * VA_EN_ESTACIONARIO - adelante;
      const errDerecha = piloto.alabeo * 8 * (1 - deprisa) - derecha * (1 - deprisa);
      /*
       * Lo aprendido, solo cerca de la velocidad pedida: frenando desde veinte metros
       * por segundo se iba acumulando, y al llegar se pasaba y volvía a ir a dos y
       * medio; con viento tardaba medio minuto en quedarse quieto.
       */
      if (!posado && Math.abs(errAdelante) < 3)
        this.integralCabeceo = acotar(this.integralCabeceo - 0.01 * errAdelante * dt, 10 * GRADO);
      if (!posado && Math.abs(errDerecha) < 3)
        this.integralAlabeo = acotar(this.integralAlabeo + 0.01 * errDerecha * dt, 10 * GRADO);
      this.cabeceoPedido = acotar(-0.04 * errAdelante + this.integralCabeceo + 3 * GRADO, 12 * GRADO);
      this.alabeoPedido = acotar(
        (1 - deprisa) * (0.04 * errDerecha + this.integralAlabeo) + deprisa * piloto.alabeo * 20 * GRADO,
        20 * GRADO,
      );
    }
    /*
     * El lazo de actitud: proporcional a lo que falta, frenando el giro, y con lo
     * que va aprendiendo del cíclico que hace falta para sostenerla —el centro de
     * gravedad y la velocidad la piden distinta—, que es lo que hace el
     * compensador del piloto automático.
     */
    const faltaCabeceo = this.cabeceoPedido - a.cabeceo;
    const faltaAlabeo = diferencia(this.alabeoPedido, a.alabeo);
    if (!posado) {
      this.sostieneCabeceo = acotar(this.sostieneCabeceo + 0.8 * faltaCabeceo * dt, 0.7);
      this.sostieneAlabeo = acotar(this.sostieneAlabeo + 0.6 * faltaAlabeo * dt, 0.7);
    }
    const mano = conLaMano ? piloto : { cabeceo: 0, alabeo: 0 };
    salida.cabeceo = acotar(mano.cabeceo + 2.7 * faltaCabeceo - 2.1 * q + this.sostieneCabeceo, 1);
    salida.alabeo = acotar(mano.alabeo + 1.7 * faltaAlabeo - 0.9 * p + this.sostieneAlabeo, 1);

    /*
     * **Los pies**: parado, se sostiene el rumbo; volando, el derrape a cero y el
     * giro que pide la inclinación, que es como vuela un helicóptero coordinado.
     * Pisar manda: mientras se pisa, el rumbo que se sostiene es el que haya.
     */
    const volando = Math.max(0, Math.min(1, (aire - 10) / 10));
    if (Math.abs(piloto.pedales) > 0.05 || volando > 0.5) this.rumboPedido = a.rumbo;
    const sostener = 1.1 * diferencia(this.rumboPedido, a.rumbo) - 1.2 * r;
    const derrape = Math.atan2(this.tmp.dot(this.right), Math.max(1, aire));
    const giro = (GRAVITY * Math.tan(a.alabeo)) / Math.max(5, aire);
    const coordinar = 1.5 * derrape - 1.2 * (r - giro);
    /*
     * **El colectivo, en la de estacionario, pide subir o bajar**: a media palanca
     * se queda a la altura que tiene; arriba sube y abajo baja, hasta
     * `SUBE_EN_ESTACIONARIO`. El paso lo pone la estabilización, que aprende el del
     * estacionario y **nunca deja caer las vueltas**: con la palanca de verdad, la
     * tecla la llevaba a tope en dos segundos, las vueltas caían al 77 %, el rotor
     * de cola —engranado— perdía la fuerza justo cuando más par había y el
     * helicóptero giraba sobre sí mismo a cien grados por segundo. Es lo que hace el
     * modo de mantener la altura de un piloto automático moderno; en la de actitud,
     * la palanca es la de verdad.
     */
    if (modo === "estacionario") {
      const palanca = piloto.colectivo - 0.5;
      let pide = Math.abs(palanca) < 0.05 ? 0 : acotar(palanca * 2 * SUBE_EN_ESTACIONARIO * 1.1, SUBE_EN_ESTACIONARIO);
      // Y cerca del suelo la bajada se frena sola: a medio metro por segundo en los últimos metros.
      const ruedas = s.heightAboveGround - Math.max(...this.ficha.ruedas.map((r) => r.z));
      pide = Math.max(pide, -Math.max(0.5, 0.5 * ruedas));
      /*
       * **La subida pedida cambia poco a poco**, metro y medio por segundo cada
       * segundo, y el colectivo se adelanta lo que esa subida pide. Saltando de cero a
       * cuatro, el colectivo daba un tirón arriba al apretar y otro abajo al soltar, y
       * el par bailaba entre el 33 y el 87 % (Enrique: «el indicador de potencia me
       * pasa de 80 a 130 todo el rato»).
       */
      this.subidaPedida += acotar(pide - this.subidaPedida, 1.5 * dt);
      if (posado && pide <= 0) {
        this.subidaPedida = 0;
        salida.colectivo = this.colectivoSuave = Math.max(0, this.colectivoSuave - 0.25 * dt);
      } else {
        const falta = this.subidaPedida - s.velocity.y;
        this.colectivoAprendido = Math.max(0, Math.min(1, this.colectivoAprendido + 0.05 * falta * dt));
        let colectivo = this.colectivoAprendido + 0.012 * this.subidaPedida + 0.04 * falta;
        const vueltas = this.vueltas / this.ficha.rotor.vueltas;
        if (vueltas < VUELTAS_QUE_SE_GUARDAN) {
          const sobra = (VUELTAS_QUE_SE_GUARDAN - vueltas) * 6;
          colectivo -= sobra;
          this.colectivoAprendido = Math.max(0, this.colectivoAprendido - sobra * dt);
        }
        // Y suave, como lo movería una mano: de golpe, el regulador no llega y las vueltas caen.
        const quiere = Math.max(0, Math.min(1, colectivo));
        this.colectivoSuave += acotar(quiere - this.colectivoSuave, 0.25 * dt);
        salida.colectivo = this.colectivoSuave;
      }
    }
    this.integralPedales = acotar(this.integralPedales + 0.4 * (sostener * (1 - volando) + coordinar * volando) * dt, 0.6);
    /*
     * **Y el pie se adelanta al par**: al subir el colectivo sube el par y el morro
     * se va, así que la estabilización mete pie con el colectivo, sin esperar a que
     * el rumbo se tuerza. Lo que falte lo sigue poniendo lo aprendido.
     */
    const adelantaPar = this.ficha.rotor.sentido * 2 * (salida.colectivo - this.colectivoDePie);
    // Solo mientras cambia: lo que se queda, lo aprende la integral.
    this.colectivoDePie += (salida.colectivo - this.colectivoDePie) * (1 - Math.exp(-dt / 4));
    salida.pedales = acotar(
      piloto.pedales + (1 - volando) * sostener + volando * coordinar + this.integralPedales + adelantaPar,
      1,
    );
    return salida;
  }

  // ── Lo que se calcula al final de cada paso ──

  private derivados(): void {
    const s = this.state;
    this.ejes();
    this.tmp.copy(s.velocity).sub(this.viento);
    const u = this.tmp.dot(this.forward);
    const v = this.tmp.dot(this.right);
    const w = this.tmp.dot(this.down);
    s.airspeed = Math.sqrt(u * u + v * v + w * w);
    s.groundSpeed = Math.hypot(s.velocity.x, s.velocity.z);
    s.alpha = Math.atan2(w, Math.max(0.1, Math.abs(u)));
    s.beta = s.airspeed > 0.5 ? Math.asin(Math.max(-1, Math.min(1, v / s.airspeed))) : 0;
    s.heightAboveGround = s.position.y - this.suelo(s.position.x, s.position.z);
    s.verticalSpeed = s.velocity.y;
    s.heading = Math.atan2(this.forward.x, -this.forward.z);
  }
}

function acotar(x: number, tope: number): number {
  return Math.max(-tope, Math.min(tope, x));
}

/** a − b, en (−π, π]. */
function diferencia(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}
