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
  /**
   * **La actitud con la que se queda quieto en el aire**, rad: la que el piloto
   * deja puesta en el cíclico antes de despegar. Sale del propio modelo —el
   * mástil inclinado, el centro de gravedad y el empuje del rotor de cola—, y
   * una prueba mira que siga siéndolo. Ver la de actitud en `estabilizar`.
   */
  readonly actitudDeEstacionario: { readonly cabeceo: number; readonly alabeo: number };
  /**
   * Y **dónde va el cíclico** para sostenerla, de −1 a 1: lo que la
   * estabilización aprende en el aire, puesto ya en el suelo.
   */
  readonly ciclicoDeEstacionario: { readonly cabeceo: number; readonly alabeo: number };
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
    /** La que añade el tren fuera, de frente, m². Ver `tren` en los mandos. */
    readonly tren: number;
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
  /**
   * **Las vueltas del rotor que se admiten**, rpm: con motor y sin él. No las
   * usa el modelo —el regulador lleva las nominales— sino el reloj del rotor,
   * que pinta con ellas sus bandas. Ver `bandasDelRotor` en `vms.ts`.
   */
  readonly vueltasPermitidas?: {
    readonly conMotor: readonly [number, number];
    readonly sinMotor: readonly [number, number];
  };
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
  /**
   * Dónde está el tren, de 0 dentro a 1 fuera y trabado; sin poner, fuera. Lo
   * mueve la palanca del juego, que es la de los aviones: ver `flight/tren.ts`.
   */
  tren?: number;
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
 * - `anillo`: si se mira el anillo turbillonario. Solo el rotor principal: el
 *   de cola también lo tiene —es parte de la pérdida de eficacia del rotor de
 *   cola—, pero eso es otra lección y no se ha medido aquí.
 *
 * **El anillo turbillonario**: bajando casi en vertical a la velocidad de lo
 * que el rotor echa hacia abajo, la cantidad de movimiento no vale —supone una
 * estela limpia, y ahí el aire da vueltas por el disco—: su solución seguía la
 * rama de subir, estable, como si nada. En esa zona la inducida sale del modelo
 * empírico de Johnson; ver `inducidaEnDescenso`. Fuera de ella no se toca nada:
 * el resultado es el de la cantidad de movimiento, el mismo de siempre.
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
  anillo = false,
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
  const perfil = ((solidez * d.cd0) / 8) * densidad * A * puntas * puntas * puntas * (1 + 4.65 * mu * mu);
  const rotacion = (v: number): Rotacion => {
    const empuje = porLaPala(v);
    const enElDisco = v * (1 - delSuelo(v));
    const potencia = FACTOR_INDUCIDO * empuje * enElDisco - empuje * normal + perfil;
    return { empuje, inducida: v, enElDisco, potencia, avance: mu, flujo: (enElDisco - normal) / puntas };
  };
  const conMomento = rotacion(vi);
  if (!anillo || !(conMomento.empuje > 0)) return conMomento;
  /*
   * **¿Cerca del anillo?** Se mira con la inducida en estacionario del empuje que
   * da la cantidad de movimiento. Fuera de la zona del modelo de Johnson —bajando
   * menos de una quinta parte de ella, o con velocidad en el plano de casi una
   * entera— se devuelve tal cual: así lejos del anillo no cambia nada, ni un
   * decimal. En el borde los dos modelos dan lo mismo, así que no hay salto.
   */
  const doble = 2 * densidad * A;
  const enHover = Math.sqrt(conMomento.empuje / doble);
  if (-normal / enHover >= ANILLO.vzD || enElPlano / enHover >= ANILLO.vxM) return conMomento;
  /*
   * Dentro, la incógnita es esa inducida en estacionario, vh: con ella, Johnson
   * da la inducida, la pala da el empuje, y el empuje tiene que ser el de esa vh,
   * 2ρA·vh². Lo que sobra baja siempre al crecer vh —la inducida crece con ella
   * en toda la zona—, así que hay una sola solución, y se encuentra por falsa
   * posición con el truco de Illinois, que no se escapa de su horquilla.
   */
  const inducidaCon = (vh: number): number => vh * inducidaEnDescenso(-normal / vh, enElPlano / vh);
  const sobra = (vh: number): number => porLaPala(inducidaCon(vh)) - doble * vh * vh;
  let a = 0.05;
  let fa = sobra(a);
  if (!(fa > 0)) return conMomento;
  let b = Math.max(1, 2 * enHover);
  let fb = sobra(b);
  for (let k = 0; k < 20 && fb > 0; k++) {
    a = b;
    fa = fb;
    b *= 2;
    fb = sobra(b);
  }
  if (fb > 0) return conMomento;
  let lado = 0;
  let vh = b;
  for (let k = 0; k < 60; k++) {
    vh = (a * fb - b * fa) / (fb - fa);
    const fc = sobra(vh);
    if (Math.abs(fc) < 1e-6 * doble * vh * vh || b - a < 1e-7) break;
    if (fc > 0) {
      a = vh;
      fa = fc;
      if (lado === 1) fb /= 2;
      lado = 1;
    } else {
      b = vh;
      fb = fc;
      if (lado === -1) fa /= 2;
      lado = -1;
    }
  }
  return rotacion(inducidaCon(vh));
}

// ── El anillo turbillonario ──────────────────────────────────────────────

/**
 * **Los puntos del modelo del anillo turbillonario de Johnson** (W. Johnson,
 * *Model for Vortex Ring State Influence on Rotorcraft Flight Dynamics*,
 * NASA/TP-2005-213477, 2005, tabla 4), en múltiplos de la inducida en
 * estacionario vh = √(T/2ρA): `vz` es la velocidad vertical del rotor —positiva
 * subiendo—, `vx` la que lleva en el plano, y `total` el aire que atraviesa el
 * disco, Vz + v. Salen de los ensayos en túnel y en vuelo que el informe reúne:
 * un Dauphin en vuelo, un V-22, y los rotores de Drees, Castles y Betzina.
 *
 * - **A y B, C**: donde el modelo de base une las dos ramas de la cantidad de
 *   movimiento, que en vertical no se tocan; hasta `vxC` de velocidad en el plano.
 * - **D**: donde empieza a apartarse de la cantidad de movimiento, bajando a una
 *   quinta parte de vh.
 * - **N y X**: el borde de la inestabilidad. Entre ellos, bajar más deprisa hace
 *   pasar más aire por el disco, y con el mismo colectivo eso es menos empuje:
 *   bajar hace bajar más. Es el anillo.
 * - **E**: donde vuelve al modelo de base, ya con el aire subiendo por el disco.
 * - **M**: la velocidad en el plano a la que el anillo deja de existir.
 */
const ANILLO = {
  vzA: -1.5,
  vzB: -2.1,
  vxC: 0.75,
  vzD: -0.2,
  vzN: -0.45,
  totalN: 0.85,
  vzX: -1.5,
  totalX: 1.25,
  vzE: -2.0,
  vxM: 0.95,
} as const;

/**
 * La cantidad de movimiento sin dimensiones: v·√(vx² + (vz + v)²) = 1. Bajando
 * en vertical entre 0 y 2 vh tiene una sola rama, la de trabajo; más deprisa
 * tiene tres, y `molino` pide la de abajo, la del molino frenado, con el aire
 * subiendo por el disco. Se busca por bisección donde la función solo cruza una
 * vez: no tiene que ser rápida, que esto solo se hace cerca del anillo.
 */
function inducidaDeMomento(vz: number, vx: number, molino: boolean): number {
  const g = (v: number): number => v * v * ((vz + v) * (vz + v) + vx * vx);
  let bajo = 0;
  let alto = Math.max(0, -vz) + 2;
  if (vz < 0 && molino && g(-vz / 2) >= 1) alto = -vz / 2;
  else if (vz < 0 && g(-vz / 2) < 1) bajo = -vz / 2;
  else if (vz < 0 && !molino && g(-vz) < 1) bajo = -vz;
  for (let k = 0; k < 50; k++) {
    const medio = (bajo + alto) / 2;
    if (g(medio) < 1) bajo = medio;
    else alto = medio;
  }
  return (bajo + alto) / 2;
}

/** Cómo cambia esa inducida con la velocidad vertical, dv/dvz, derivando la ecuación. */
function pendienteDeMomento(v: number, vz: number, vx: number): number {
  const total = vz + v;
  const abajo = total * total + vx * vx + v * total;
  return Math.abs(abajo) < 1e-9 ? 0 : (-v * total) / abajo;
}

/** El cúbico sin término constante que pasa por (x1, y1) con pendiente s1 y por (x2, y2): [b, c, d]. */
function cubicoSinConstante(x1: number, y1: number, s1: number, x2: number, y2: number): [number, number, number] {
  // b·x + c·x² + d·x³ = y en x1 y en x2, y b + 2c·x1 + 3d·x1² = s1: por Cramer.
  const m = [
    [x1, x1 * x1, x1 * x1 * x1],
    [1, 2 * x1, 3 * x1 * x1],
    [x2, x2 * x2, x2 * x2 * x2],
  ] as const;
  const y = [y1, s1, y2] as const;
  const det = (k: readonly (readonly number[])[]): number =>
    k[0]![0]! * (k[1]![1]! * k[2]![2]! - k[1]![2]! * k[2]![1]!) -
    k[0]![1]! * (k[1]![0]! * k[2]![2]! - k[1]![2]! * k[2]![0]!) +
    k[0]![2]! * (k[1]![0]! * k[2]![1]! - k[1]![1]! * k[2]![0]!);
  const D = det(m);
  const columna = (j: number): number[][] => m.map((fila, i) => fila.map((x, k) => (k === j ? y[i]! : x)));
  return [det(columna(0)) / D, det(columna(1)) / D, det(columna(2)) / D];
}

/** El cúbico de Hermite entre (x0, y0, s0) y (x1, y1, s1), en x. */
function hermite(x: number, x0: number, y0: number, s0: number, x1: number, y1: number, s1: number): number {
  const h = x1 - x0;
  const t = (x - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * s0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * s1
  );
}

/**
 * **El modelo de base de Johnson**: la cantidad de movimiento, con sus dos
 * ramas unidas por un cúbico donde en vertical no se tocan (pasos 1 y 2 de su
 * tabla 3). Devuelve la inducida y su pendiente, dv/dvz.
 */
function inducidaDeBase(vz: number, vx: number): [number, number] {
  if (vz >= 0 || vx >= ANILLO.vxC) {
    const v = inducidaDeMomento(vz, vx, vz < ANILLO.vzA);
    return [v, pendienteDeMomento(v, vz, vx)];
  }
  const r = vx / ANILLO.vxC;
  const vzA = ANILLO.vzA + 0.2 * r * r;
  let vzB = ANILLO.vzB + 0.2 * r * r;
  if (r > 0.5) vzB += 0.7 * (vzA - vzB) * (2 * r - 1) ** 3;
  if (vz >= vzA || vz <= vzB) {
    const v = inducidaDeMomento(vz, vx, vz <= vzB);
    return [v, pendienteDeMomento(v, vz, vx)];
  }
  const vA = inducidaDeMomento(vzA, vx, false);
  const vB = inducidaDeMomento(vzB, vx, true);
  const [b, c, d] = cubicoSinConstante(vzA, vA, pendienteDeMomento(vA, vzA, vx), vzB, vB);
  return [b * vz + c * vz * vz + d * vz * vz * vz, b + 2 * c * vz + 3 * d * vz * vz];
}

/** Lo que el anillo añade en N y en X bajando en vertical: lo medido menos lo de la cantidad de movimiento. */
const SUBE_EN_N = ANILLO.totalN - (ANILLO.vzN + inducidaDeMomento(ANILLO.vzN, 0, false));
const SUBE_EN_X = ANILLO.totalX - (ANILLO.vzX + inducidaDeMomento(ANILLO.vzX, 0, false));

/**
 * **El borde del anillo con velocidad en el plano** (paso 3.1 de la tabla 3 de
 * Johnson): N y X se acercan con ella y se juntan en M, donde el anillo deja de
 * existir; D se queda, y E se mueve con X.
 */
function bordeDelAnillo(vx: number): { vzN: number; vzX: number; vzE: number } {
  const r = Math.min(1, vx / ANILLO.vxM);
  const medio = 0.5 * (ANILLO.vzN + ANILLO.vzX);
  const mitad = 0.5 * (ANILLO.vzN - ANILLO.vzX);
  const vzN = medio + mitad * (1 - r * r) ** 0.2;
  const vzX = medio - mitad * (1 - r * r) ** 1.5;
  return { vzN, vzX, vzE: ANILLO.vzE + (vzX - ANILLO.vzX) };
}

/**
 * **La inducida bajando, en múltiplos de vh**, con el anillo turbillonario: el
 * modelo de Johnson (NASA/TP-2005-213477, tabla 3) con su κ en 1 —aquí la
 * pérdida de las puntas va en la potencia, `FACTOR_INDUCIDO`— y la
 * inestabilidad entera (su f = 1).
 *
 * `vz` es la velocidad vertical del rotor entre vh, positiva subiendo; `vx`, la
 * que lleva en el plano entre vh. Fuera del anillo es la cantidad de movimiento.
 * Dentro, al modelo de base se le suma lo que el anillo añade al aire que
 * atraviesa el disco, con tres cúbicos —de D a N, de N a X y de X a E— que en N
 * y en X dejan el aire total sin pendiente: entre los dos, bajar más deprisa
 * hace pasar **más** aire por el disco, que es lo que la cantidad de movimiento
 * no puede dar y lo que hace que el helicóptero se hunda solo.
 */
export function inducidaEnDescenso(vz: number, vx: number): number {
  const [base] = inducidaDeBase(vz, vx);
  if (vz >= ANILLO.vzD || vx >= ANILLO.vxM) return base;
  const { vzN, vzX, vzE } = bordeDelAnillo(vx);
  if (vz <= vzE) return base;
  const r = vx / ANILLO.vxM;
  const cuanto = Math.sqrt(Math.max(0, 1 - r ** 6));
  const enN = SUBE_EN_N * cuanto;
  const enX = SUBE_EN_X * cuanto;
  // En N y en X el aire total no tiene pendiente: lo que se añade compensa la de la base.
  const pendienteN = -(1 + inducidaDeBase(vzN, vx)[1]);
  const pendienteX = -(1 + inducidaDeBase(vzX, vx)[1]);
  let sube: number;
  if (vz >= vzN) sube = hermite(vz, vzN, enN, pendienteN, ANILLO.vzD, 0, 0);
  else if (vz >= vzX) sube = hermite(vz, vzX, enX, pendienteX, vzN, enN, pendienteN);
  else {
    // De X a E: sin término constante y sin casar la pendiente en E, como dice Johnson.
    const [b, c, d] = cubicoSinConstante(vzX, enX, pendienteX, vzE, 0);
    sube = b * vz + c * vz * vz + d * vz * vz * vz;
  }
  return base + sube;
}

/**
 * **Dónde está un rotor respecto al anillo**, con su descenso y su velocidad en
 * el plano en múltiplos de vh (`descenso` positivo bajando):
 *
 * - `"dentro"`: pasado el borde de N, donde bajar hace bajar más, y hasta E;
 * - `"cerca"`: en la zona del modelo, entre D y N, donde el aire ya no es el de
 *   la cantidad de movimiento pero todavía no se hunde solo;
 * - `"fuera"`: lo demás, que incluye bajar más deprisa que E, con el aire ya
 *   subiendo por el disco, que es el molino frenado.
 */
export type ZonaDelAnillo = "fuera" | "cerca" | "dentro";

export function zonaDelAnillo(descenso: number, avance: number): ZonaDelAnillo {
  const vz = -descenso;
  if (vz >= ANILLO.vzD || avance >= ANILLO.vxM) return "fuera";
  const { vzN, vzE } = bordeDelAnillo(avance);
  if (vz <= vzE) return "fuera";
  return vz < vzN ? "dentro" : "cerca";
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

/**
 * **El colectivo que sostiene la altura volando a `velocidad`**, m/s, de 0 a 1,
 * lejos del suelo: el disco echado hacia delante lo justo para tirar contra la
 * resistencia del fuselaje, y el paso que da ese empuje con el aire entrando de
 * frente. A setenta nudos es mucho menos que el del estacionario —el disco coge
 * aire nuevo—, y con el del estacionario el helicóptero subía a diez metros por
 * segundo. Como el de arriba, sin el rotor de cola ni la estela: vale para
 * colocar la palanca cerca.
 */
export function colectivoNivelado(f: FichaDeHelicoptero, masa: number, densidad: number, velocidad: number): number {
  if (!(velocidad > 1)) return colectivoDeEstacionario(f, masa, densidad);
  const peso = masa * GRAVITY;
  const resistencia = 0.5 * densidad * (f.fuselaje.frente + f.fuselaje.tren) * velocidad * velocidad;
  const empuje = Math.hypot(peso, resistencia);
  const echado = Math.atan2(resistencia, peso);
  // El disco va hacia delante y algo hacia donde empuja: el aire le entra por arriba.
  const normal = -velocidad * Math.sin(echado);
  const enElPlano = velocidad * Math.cos(echado);
  let bajo = -0.2;
  let alto = 0.6;
  let vi = 5;
  for (let k = 0; k < 40; k++) {
    const medio = (bajo + alto) / 2;
    const r = resolverDisco(f.rotor, densidad, f.rotor.vueltas, medio, normal, enElPlano, vi);
    vi = r.inducida;
    if (r.empuje < empuje) bajo = medio;
    else alto = medio;
  }
  const { minimo, maximo } = f.rotor.paso;
  return Math.max(0, Math.min(1, ((bajo + alto) / 2 - minimo) / (maximo - minimo)));
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

/**
 * **Lo más deprisa que vuelve la de estacionario a su sitio**, m/s, con el cíclico
 * suelto: andando, que es lo que se ve bien desde la cabina y no tuerce nada.
 */
const VUELVE_AL_SITIO = 1.5;

/**
 * **Cómo cambia la subida pedida en la de estacionario**, m/s cada segundo: para
 * empezar a subir o a bajar, metro y medio, que no hace bailar el par; para
 * pararse, cuatro. Con metro y medio también para pararse, soltar la X subiendo
 * a cuatro metros por segundo eran cinco metros más de subida solo en frenar, y
 * soltada a tres metros se quedaba a diez; así son dos.
 */
const CAMBIA_LA_SUBIDA = 1.5;
const FRENA_LA_SUBIDA = 4;

/** Por debajo de estas vueltas, en tanto por uno, la estabilización de estacionario quita colectivo. */
const VUELTAS_QUE_SE_GUARDAN = 0.985;

/**
 * **La autorrotación en la estabilización de estacionario**, la de los peldaños de
 * abajo: lo que hace sola cuando se paran los motores. Es el procedimiento del
 * manual de la FAA (FAA-H-8083-21B, capítulo 11, «Straight-In Autorotation»), que
 * pide las alturas y la velocidad al manual de cada helicóptero; el del Super Puma
 * no es público, así que:
 *
 * - **La velocidad**, 70 kt, m/s: la que el modelo ya prueba contra las vueltas sin
 *   motor de la ficha (TCDS R.002, III.9), cerca de la de menos potencia, que es la
 *   de menos bajada.
 * - **Dónde se recoge**, a cien pies de las ruedas: el alto de la horquilla de la
 *   FAA, de 40 a 100 ft según el helicóptero (FAA-P-8740-71), porque este es de los
 *   pesados y baja a once metros por segundo.
 * - **Dónde se nivela y se amortigua**, a quince pies: el alto de los 3 a 15 ft de
 *   la FAA para el tren al nivelar.
 * - **Cuánto sube el morro en la recogida**: lo que dio en la prueba la toma más
 *   suave sin que la cola llegue al suelo. Ver `autorrotacion.test.ts`.
 */
export const VELOCIDAD_DE_AUTORROTACION = 70 * 0.514444;
export const ALTURA_DE_RECOGIDA = 100 * 0.3048;
export const ALTURA_DE_TOMA = 15 * 0.3048;
const RECOGIDA_SIN_MOTOR = 20 * GRADO;

/** Las tres partes de una autorrotación, en su orden. Ver `faseDeAutorrotacion`. */
export type FaseDeAutorrotacion = "planeo" | "recogida" | "toma";
const ORDEN_DE_FASE: Record<FaseDeAutorrotacion, number> = { planeo: 0, recogida: 1, toma: 2 };

/**
 * **Lo que tarda en apagarse un motor que falla**, s, contra los ocho de pararlo a
 * mano: con la mitad, ya no da nada. Un turboeje que se queda sin llama no da
 * potencia a la turbina libre aunque el generador de gas siga girando un rato, y
 * la norma de certificación trata el fallo como una pérdida de potencia de golpe,
 * con un segundo como mínimo antes de que nadie toque nada (14 CFR 29.143 (e)).
 * Fallando como al pararlos a mano, la potencia tardaba unos ocho segundos en
 * irse, y el rotor perdía vueltas despacio: no era lo que hay que aprender a
 * contestar, colectivo abajo en cuanto se nota.
 */
const SE_APAGA_DE_GOLPE = 1;

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
  private descensoRelativo = 0;
  private avanceRelativo = 0;
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
  /** Por dónde va la autorrotación: no se vuelve atrás si un globo sube un palmo. */
  private faseSinMotor: FaseDeAutorrotacion | null = null;
  /** Si los motores se han parado por un fallo, y no a mano. Ver `fallanLosMotores`. */
  private fallo = false;
  /** Encima de qué sitio se queda la de estacionario con el cíclico suelto, o ninguno. */
  private sitio: { x: number; z: number } | null = null;
  /** A qué altura se queda la de estacionario con el colectivo a media palanca, m, o a ninguna. */
  private alturaSostenida: number | null = null;

  /**
   * **Los pedales, para quien vuela**: el eje de la guiñada se queda con la
   * amortiguación y nada más, sin sostener el rumbo ni adelantar el pie al par.
   * Es lo que hace el instructor que enseña el estacionario de un mando en un
   * mando —«tuyos los pedales»—, y lo pide la lección del par (#113,
   * `flight/lecciones-del-rotor.ts`): con el pie puesto por la estabilización,
   * subir el colectivo no movía el morro en ningún peldaño, y la lección no
   * tenía nada que enseñar. El cíclico y el colectivo siguen como estaban.
   */
  piesDeQuienVuela = false;
  /**
   * **El pie que pone la estabilización**, sin el de quien vuela: lo que se le
   * deja puesto al darle los pedales. Entero —lo aprendido, lo que sostiene el
   * rumbo y lo que se adelanta al par—, y no solo lo aprendido: en el banco del
   * navegador, en Taguató, con lo aprendido solo el morro se seguía yendo a
   * cuatro grados por segundo con el pie de banco puesto.
   */
  private pieDeLaAyuda = 0;
  /** Si en el paso anterior los pedales eran de quien vuela. */
  private piesSueltosAntes = false;

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

  /**
   * **Dónde está el rotor principal respecto al anillo turbillonario**: lo que
   * baja y lo que avanza en su plano, en múltiplos de la inducida en
   * estacionario del empuje que da, y la zona que eso es. Ver `zonaDelAnillo`.
   */
  anillo(): { readonly descenso: number; readonly avance: number; readonly zona: ZonaDelAnillo } {
    const descenso = this.descensoRelativo;
    const avance = this.avanceRelativo;
    return { descenso, avance, zona: zonaDelAnillo(descenso, avance) };
  }

  /**
   * **Fallan los motores**, que no es pararlos: con los mandos de los motores
   * cortados en el mismo paso, la potencia se va en menos de un segundo en vez de
   * en los ocho de una parada. Lo piden el ejercicio de la autorrotación y
   * quedarse sin combustible. Ver `SE_APAGA_DE_GOLPE`.
   */
  fallanLosMotores(): void {
    this.fallo = true;
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
    this.descensoRelativo = 0;
    this.avanceRelativo = 0;
    this.ultimosMandos = mandosNeutros();
    this.anclas.length = 0;
    this.faseSinMotor = null;
    this.fallo = false;
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
    this.pieDeLaAyuda = this.ultimosMandos.pedales;
    this.piesSueltosAntes = false;
    // El sitio y la altura se cogen de nuevo, donde se pare y donde esté.
    this.sitio = null;
    this.alturaSostenida = null;
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
        ? resolverDisco(rot, densidad, vueltas, paso, normal, enElPlano, this.inducida, delSuelo, true)
        : { empuje: 0, inducida: 0, enElDisco: 0, potencia: 0, avance: 0, flujo: 0 };
    this.inducida = principal.inducida;
    // Lo que se baja y se avanza en múltiplos de la inducida en estacionario: dónde está respecto al anillo.
    const enHover = Math.sqrt(Math.max(1, principal.empuje) / (2 * densidad * Math.PI * rot.radio * rot.radio));
    this.descensoRelativo = normal / enHover;
    this.avanceRelativo = enElPlano / enHover;
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
    // Arrancar otra vez es empezar de nuevo, también tras un fallo.
    if (piloto.motores) this.fallo = false;
    this.arranque = piloto.motores
      ? Math.min(1, this.arranque + dt / tardaEnArrancar)
      : Math.max(0, this.arranque - dt / (this.fallo ? SE_APAGA_DE_GOLPE : 8));
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
    const respuesta = piloto.motores ? f.motores.respuesta : this.fallo ? 0.2 : 2;
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
    // Y el tren fuera, que frena: ver `fuselaje.tren` en la ficha.
    const frente = fus.frente + fus.tren * Math.max(0, Math.min(1, mandos.tren ?? 1));
    aplicar(
      -0.5 * densidad * frente * vf * u,
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

    /*
     * Lo que se pide: en `actitud`, el cíclico mueve la actitud y al soltarlo se
     * queda. **Y posado, la del estacionario**, que es donde un piloto deja el
     * cíclico antes de subir el colectivo. Sostenía la de las ruedas, casi plana,
     * y al despegar con el cíclico suelto se quedaba con ella: dos grados de
     * morro abajo y de ala izquierda de más, y a un minuto el helicóptero iba a
     * cincuenta nudos hacia delante y a la izquierda. Con la actitud y el
     * cíclico que la sostiene, los dos: con la actitud sola, el cíclico se
     * quedaba a media distancia mientras despegaba y salía a nueve nudos. Se
     * llega despacio y a valores fijos, sin acumular nada que el suelo no deje
     * tomar: ver la nota de arriba.
     */
    if (conLaMano) {
      const sigue = 1 - Math.exp(-dt / 2);
      const quieto = this.ficha.actitudDeEstacionario;
      const ciclico = this.ficha.ciclicoDeEstacionario;
      this.cabeceoPedido += (quieto.cabeceo - this.cabeceoPedido) * sigue;
      this.alabeoPedido += diferencia(quieto.alabeo, this.alabeoPedido) * sigue;
      this.sostieneCabeceo += (ciclico.cabeceo - this.sostieneCabeceo) * sigue;
      this.sostieneAlabeo += (ciclico.alabeo - this.sostieneAlabeo) * sigue;
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
      /*
       * **Sin motor, soltar el cíclico no es pararse**: es la velocidad de la
       * autorrotación mientras queda altura, y pararse abajo, que es la recogida.
       * Parado en el aire y sin motor, un helicóptero baja casi en vertical y
       * deprisa, y abajo ya no tiene con qué frenar; con su velocidad baja la mitad
       * de deprisa y la recogida le quita la que le sobra (FAA-H-8083-21B, 11-2 y
       * 11-4). **Y la velocidad y la recogida las pone la ayuda**, con la palanca
       * como esté: en estos peldaños son suyas, como el colectivo. Empujando se
       * picaba a cien nudos y a diecinueve metros por segundo, y la recogida desde
       * ahí subía quince metros y dejaba el helicóptero sin vueltas; empujando hasta
       * el suelo, no había recogida. A los lados, la palanca sigue virando.
       */
      const fase = this.faseDeAutorrotacion(piloto);
      /*
       * **Y quieto es quieto encima de un sitio**, no solo a cero sobre el suelo.
       * Posado, el sitio es donde está —la hache—; con el cíclico suelto se queda
       * ese, y se vuelve a él despacio, a no más de `VUELVE_AL_SITIO`. Moviendo el
       * cíclico no hay sitio, y al soltarlo se coge el de donde se para. Pedía
       * velocidad cero y nada más, así que lo que se deslizaba al despegar ya no se
       * recuperaba: diez metros de lado, y no volvía encima de la hache. Sin motor
       * no hay sitio que guardar: manda la autorrotación.
       */
      const suelto = Math.abs(piloto.cabeceo) < 0.05 && Math.abs(piloto.alabeo) < 0.05;
      if (fase !== null || !suelto) this.sitio = null;
      else if (posado || (this.sitio === null && s.groundSpeed < 1)) this.sitio = { x: s.position.x, z: s.position.z };
      let alSitioAdelante = 0;
      let alSitioDerecha = 0;
      if (this.sitio && !posado) {
        const dx = this.sitio.x - s.position.x;
        const dz = this.sitio.z - s.position.z;
        const lejos = Math.hypot(dx, dz);
        const ir = Math.min(VUELVE_AL_SITIO, 0.3 * lejos) / Math.max(lejos, 1e-6);
        alSitioAdelante = (dx * sen - dz * cos) * ir;
        alSitioDerecha = (dx * cos + dz * sen) * ir;
      }
      const sinTocar =
        fase === "planeo"
          ? VELOCIDAD_DE_AUTORROTACION
          : fase !== null
            ? 0
            : -piloto.cabeceo * VA_EN_ESTACIONARIO + alSitioAdelante;
      const errAdelante = sinTocar - adelante;
      const errDerecha = (piloto.alabeo * 8 + alSitioDerecha) * (1 - deprisa) - derecha * (1 - deprisa);
      /*
       * Lo aprendido, solo cerca de la velocidad pedida: frenando desde veinte metros
       * por segundo se iba acumulando, y al llegar se pasaba y volvía a ir a dos y
       * medio; con viento tardaba medio minuto en quedarse quieto.
       */
      if (!posado && Math.abs(errAdelante) < 3)
        this.integralCabeceo = acotar(this.integralCabeceo - 0.01 * errAdelante * dt, 10 * GRADO);
      if (!posado && Math.abs(errDerecha) < 3)
        this.integralAlabeo = acotar(this.integralAlabeo + 0.01 * errDerecha * dt, 10 * GRADO);
      /*
       * **Y posado, con el cíclico del estacionario ya puesto**, como en la de
       * actitud (arriba): lo aprendido va despacio a la actitud del estacionario de
       * la ficha y lo que la sostiene al cíclico que la da. Posada no aprendía nada,
       * y despegaba con el disco derecho: el rotor de cola empujaba a un lado sin
       * nada que lo parara, y hasta que lo aprendía en el aire se deslizaba a casi
       * tres metros por segundo. Es lo que hace un piloto antes de subir el
       * colectivo: el cíclico donde lo pide el estacionario.
       */
      if (posado && fase === null) {
        const sigue = 1 - Math.exp(-dt / 2);
        const quieto = this.ficha.actitudDeEstacionario;
        const ciclico = this.ficha.ciclicoDeEstacionario;
        this.integralCabeceo += (quieto.cabeceo - 3 * GRADO - this.integralCabeceo) * sigue;
        this.integralAlabeo += (quieto.alabeo - this.integralAlabeo) * sigue;
        this.sostieneCabeceo += (ciclico.cabeceo - this.sostieneCabeceo) * sigue;
        this.sostieneAlabeo += (ciclico.alabeo - this.sostieneAlabeo) * sigue;
      }
      /*
       * En la recogida sin motor, el morro sube más que para frenar con motor: es lo
       * que convierte la velocidad en vueltas del rotor y en menos bajada. Y para
       * tocar, a la actitud de posarse, que con el morro alto lo primero que toca el
       * suelo es el rotor de cola (FAA-H-8083-21B, 11-4 y 11-5). Sube con lo que
       * baja, y no más: una recogida que hace subir el helicóptero gasta lo que
       * guarda el rotor y lo deja más alto y sin velocidad (la misma página).
       */
      const tope =
        fase === "recogida" ? RECOGIDA_SIN_MOTOR * Math.max(0.15, Math.min(1, -s.velocity.y / 6)) : 12 * GRADO;
      this.cabeceoPedido =
        fase === "toma"
          ? this.ficha.actitudDeEstacionario.cabeceo
          : acotar(-0.04 * errAdelante + this.integralCabeceo + 3 * GRADO, tope);
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
      const fase = this.faseDeAutorrotacion(piloto);
      let pide = Math.abs(palanca) < 0.05 ? 0 : acotar(palanca * 2 * SUBE_EN_ESTACIONARIO * 1.1, SUBE_EN_ESTACIONARIO);
      /*
       * **A media palanca, a una altura**: donde se para la subida frenando como
       * frena la ayuda, y lo que se pase de ahí se devuelve, a no más de dos metros
       * por segundo. Pedía subida cero y nada más, así que todo lo que subía
       * mientras frenaba se quedaba: soltada la X a tres metros, se quedaba a diez.
       * Es el modo de mantener la altura de un piloto automático, que coge una y la
       * sostiene. Y no la de soltar justo: soltada a medio metro del suelo, lo que
       * se pasaba lo devolvía hasta tocar, y un toque corto de X era un saltito.
       */
      if (pide !== 0 || posado || fase !== null) this.alturaSostenida = null;
      else {
        this.alturaSostenida ??= s.position.y + (this.subidaPedida * Math.abs(this.subidaPedida)) / (2 * FRENA_LA_SUBIDA);
        pide = acotar(0.5 * (this.alturaSostenida - s.position.y), 2);
      }
      // Y cerca del suelo la bajada se frena sola: a medio metro por segundo en los últimos metros.
      const ruedas = s.heightAboveGround - Math.max(...this.ficha.ruedas.map((r) => r.z));
      pide = Math.max(pide, -Math.max(0.5, 0.5 * ruedas));
      /*
       * **La subida pedida cambia poco a poco**, y el colectivo se adelanta lo que
       * esa subida pide. Saltando de cero a cuatro, el colectivo daba un tirón
       * arriba al apretar y otro abajo al soltar, y el par bailaba entre el 33 y el
       * 87 % (Enrique: «el indicador de potencia me pasa de 80 a 130 todo el rato»).
       * Para pararse, más deprisa: ver `FRENA_LA_SUBIDA`.
       */
      const frena = Math.abs(pide) < Math.abs(this.subidaPedida) || pide * this.subidaPedida < 0;
      this.subidaPedida += acotar(pide - this.subidaPedida, (frena ? FRENA_LA_SUBIDA : CAMBIA_LA_SUBIDA) * dt);
      if (fase !== null) {
        /*
         * **Sin motor, el colectivo cuida las vueltas, y abajo las gasta.** Mientras
         * baja, el paso sigue a las vueltas: si suben, más paso, y si caen, abajo del
         * todo, que es lo primero que se hace cuando se para el motor. Y en los
         * últimos metros se sube para posarse con lo que guarda el rotor girando, que
         * es la única energía que queda: las vueltas caen, y para eso estaban
         * (FAA-H-8083-21B, 11-1 y 11-5). Aquí no se guardan las vueltas del 98,5 %,
         * que dejarían caer el helicóptero entero en el suelo con el rotor lleno.
         *
         * Abajo, lo que falta de bajada mueve el paso al momento y además lo va
         * subiendo: solo con lo segundo, el paso llegaba tarde y de más, el
         * helicóptero subía un metro, se soltaba el paso y caía con el rotor ya
         * gastado a 2,3 m/s, que es romper el tren.
         */
        const vueltas = this.vueltas / this.ficha.rotor.vueltas;
        const falta = -Math.max(0.5, 0.4 * ruedas) - s.velocity.y;
        const ritmo = fase === "toma" ? acotar(0.4 * falta, 1) : acotar(4 * (vueltas - 1), 1);
        this.colectivoSuave = Math.max(0, Math.min(1, this.colectivoSuave + ritmo * dt));
        // Lo aprendido, lo de ahora: si vuelve el motor, se sigue desde aquí y sin tirón.
        this.colectivoAprendido = this.colectivoSuave;
        this.subidaPedida = s.velocity.y;
        salida.colectivo =
          fase === "toma" ? Math.max(0, Math.min(1, this.colectivoSuave + Math.min(0.25, 0.12 * falta))) : this.colectivoSuave;
      } else if (posado && pide <= 0) {
        this.subidaPedida = 0;
        salida.colectivo = this.colectivoSuave = Math.max(0, this.colectivoSuave - 0.25 * dt);
      } else {
        /*
         * Lo que falta pesa más que lo aprendido, que si no se carga de más mientras
         * sube: al soltar la X, eso que sobraba seguía subiendo el helicóptero unos
         * metros más de lo que pedía frenar, y volvía después.
         */
        const falta = this.subidaPedida - s.velocity.y;
        this.colectivoAprendido = Math.max(0, Math.min(1, this.colectivoAprendido + 0.02 * falta * dt));
        let colectivo = this.colectivoAprendido + 0.02 * this.subidaPedida + 0.08 * falta;
        const vueltas = this.vueltas / this.ficha.rotor.vueltas;
        if (vueltas < VUELTAS_QUE_SE_GUARDAN) {
          const sobra = (VUELTAS_QUE_SE_GUARDAN - vueltas) * 6;
          colectivo -= sobra;
          this.colectivoAprendido = Math.max(0, this.colectivoAprendido - sobra * dt);
        }
        /*
         * Y suave, como lo movería una mano: subiéndolo de golpe, el regulador no
         * llega y las vueltas caen. Bajándolo no hay vueltas que caigan, así que baja
         * algo más deprisa: es lo que frena una subida a tiempo.
         */
        const quiere = Math.max(0, Math.min(1, colectivo));
        this.colectivoSuave += Math.max(-0.4 * dt, Math.min(0.25 * dt, quiere - this.colectivoSuave));
        salida.colectivo = this.colectivoSuave;
      }
    }
    /*
     * **Con los pedales de quien vuela**, la amortiguación de la guiñada y el pie
     * que ya sostenía el estacionario, quieto: así no gira solo al soltarlos, y lo
     * que cambie el par lo tiene que poner el pie. Ver `piesDeQuienVuela`.
     */
    if (this.piesDeQuienVuela && !posado) {
      this.rumboPedido = a.rumbo;
      this.colectivoDePie = salida.colectivo;
      this.piesSueltosAntes = true;
      salida.pedales = acotar(piloto.pedales + this.pieDeLaAyuda + acotar(-1.0 * r, 0.3), 1);
      return salida;
    }
    /*
     * Y al devolverlos, la ayuda sigue desde el pie que había, sin tirón: lo
     * aprendido pasa a ser lo que llegaba al rotor menos lo que pisa quien vuela.
     */
    if (this.piesSueltosAntes) {
      this.piesSueltosAntes = false;
      // Más lo que va a frenar el giro de ahora la ayuda, que ya lo frenaba la amortiguación.
      this.integralPedales = acotar(this.ultimosMandos.pedales - piloto.pedales + 1.2 * r * (1 - volando), 0.6);
    }
    /*
     * **Y posado no aprende**, como el cíclico de arriba: en el suelo el rumbo lo
     * sujetan las ruedas, y lo que se iba sumando contra un rumbo pedido que no
     * se alcanzaba salía de golpe al despegar, con el morro girando. Lo vio la
     * lección del par (enmienda H17a del ADR 0026).
     */
    if (!posado)
      this.integralPedales = acotar(this.integralPedales + 0.4 * (sostener * (1 - volando) + coordinar * volando) * dt, 0.6);
    /*
     * **Y el pie se adelanta al par**: al subir el colectivo sube el par y el morro
     * se va, así que la estabilización mete pie con el colectivo, sin esperar a que
     * el rumbo se tuerza. Lo que falte lo sigue poniendo lo aprendido. **Sin motor,
     * no**: no hay par que adelantar, y el colectivo de la toma metía todo el pie,
     * el morro giraba treinta grados por segundo y tocaba ladeado siete.
     */
    const conMotor = this.faseDeAutorrotacion(piloto) === null || s.onGround ? 1 : 0;
    const adelantaPar = conMotor * this.ficha.rotor.sentido * 2 * (salida.colectivo - this.colectivoDePie);
    // Solo mientras cambia: lo que se queda, lo aprende la integral.
    this.colectivoDePie += (salida.colectivo - this.colectivoDePie) * (1 - Math.exp(-dt / 4));
    salida.pedales = acotar(
      piloto.pedales + (1 - volando) * sostener + volando * coordinar + this.integralPedales + adelantaPar,
      1,
    );
    // Sin lo que frena el giro de ahora, que con los pedales sueltos lo pone la amortiguación.
    this.pieDeLaAyuda = salida.pedales - piloto.pedales + 1.2 * r * (1 - volando);
    return salida;
  }

  /**
   * **Por dónde va la autorrotación**, o `null` con motor o posado: el planeo, la
   * recogida o la toma, según la altura de las ruedas. Sin motor es sin los mandos
   * de los motores o mientras no dan ni un cuarto de su potencia, que es lo que
   * tardan en apagarse o en volver.
   */
  faseDeAutorrotacion(piloto: Pick<MandosDeHelicoptero, "motores"> = this.ultimosMandos): FaseDeAutorrotacion | null {
    const s = this.state;
    if (s.onGround || (piloto.motores && this.arranque >= 0.75)) return (this.faseSinMotor = null);
    const ruedas = s.heightAboveGround - Math.max(...this.ficha.ruedas.map((r) => r.z));
    const ahora: FaseDeAutorrotacion =
      ruedas < ALTURA_DE_TOMA ? "toma" : ruedas < ALTURA_DE_RECOGIDA ? "recogida" : "planeo";
    if (this.faseSinMotor === null || ORDEN_DE_FASE[ahora] > ORDEN_DE_FASE[this.faseSinMotor]) this.faseSinMotor = ahora;
    return this.faseSinMotor;
  }

  // ── Lo que se calcula al final de cada paso ──

  private derivados(): void {
    const s = this.state;
    this.ejes();
    this.tmp.copy(s.velocity).sub(this.viento);
    const u = this.tmp.dot(this.forward);
    const v = this.tmp.dot(this.right);
    const w = this.tmp.dot(this.down);
    /*
     * **La velocidad es la que mide el anemómetro, y el anemómetro mide a lo largo
     * del morro.** El tubo de pitot apunta hacia delante y lo que le entra es el
     * aire que viene de frente; el que le llega de lado o de abajo no le entra, y
     * el que le viene de atrás deja la aguja en el tope. Aquí era el aire total, y
     * bajando en vertical a 20 m/s marcaba 38 nudos —en la lección del anillo
     * turbillonario, que es justo donde la aguja tiene que estar casi en cero:
     * por eso se entra sin darse cuenta—. Ahora es lo que va a lo largo del eje.
     *
     * **Y por debajo de unos veinte nudos, el de verdad no es de fiar**: la norma
     * lo calibra en vuelo nivelado de veinte nudos para arriba (CS 29.1323 y
     * 14 CFR 29.1323 (b)(1)), y el manual de helicópteros de la FAA avisa de que
     * la estela del rotor lo engaña a poca velocidad (FAA-H-8083-21B, capítulo
     * 12). Ese error no se simula: no se sabe cuánto es en el Super Puma, y
     * un número inventado sería enseñar mal; la cifra pequeña que queda es la
     * del aire de frente, sin más.
     */
    const total = Math.sqrt(u * u + v * v + w * w);
    s.airspeed = Math.max(0, u);
    s.groundSpeed = Math.hypot(s.velocity.x, s.velocity.z);
    s.alpha = Math.atan2(w, Math.max(0.1, Math.abs(u)));
    s.beta = total > 0.5 ? Math.asin(Math.max(-1, Math.min(1, v / total))) : 0;
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
