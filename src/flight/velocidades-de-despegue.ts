/**
 * **Las velocidades de un despegue con un motor de menos**: Vmc, V1, Vr y V2,
 * sacadas del mismo avión que vuela.
 *
 * Cada una es una respuesta a una pregunta, y así se enseñan:
 *
 * - **Vmc**, *velocidad mínima de control*: por debajo, con un motor parado y
 *   el otro a tope, el timón ya no puede sujetar el morro. Sale del timón de
 *   la ficha contra el par de los motores —ver `flight/motores.ts`—, igual en
 *   el suelo que en el aire, porque el timón es el mismo.
 * - **V1**, *la decisión*: la más rápida desde la que todavía cabe parar en
 *   lo que queda de pista. Antes de ella, si algo falla, se para; pasada, se
 *   vuela. **No es una velocidad: es el momento en que la decisión ya está
 *   tomada.** Y depende de la pista, del aire y del avión: por eso se calcula.
 * - **Vr**, *rotar*: la de la ficha. Es a la que el timón de profundidad
 *   levanta el morro, y no cambia con la pista.
 * - **V2**, *la de subir con un motor menos*: la que se sostiene después de
 *   despegar con uno parado, con margen sobre la pérdida y sobre la Vmc.
 *
 * Las reglas son las de certificación —la CS-25 de EASA y la parte 25 de la
 * FAA, que dicen lo mismo—, con el avión de este juego dentro:
 *
 * - V1 no puede ser menor que la Vmc en tierra (25.107 a): si fallara un motor
 *   antes, no se podría seguir recto para parar.
 * - Vr no menor que V1, y V2 no menor que Vr.
 * - V2 no menor que 1,2 veces la pérdida con los flaps de despegue ni que 1,1
 *   veces la Vmc (25.107 b y c; la norma nueva dice 1,13 veces la pérdida de
 *   referencia, que en un modelo como éste es lo mismo con otro nombre).
 *
 * El bimotor de pistón no se certifica así —es de otra norma, la parte 23, y
 * no tiene V2—. Lo que se vuela en él con un motor es la **línea azul**, la
 * Vyse: la velocidad a la que sube más con uno solo. Se calcula igual, de la
 * polar y del empuje. Ver `conUnMotor`.
 *
 * Todas salen **indicadas**, en m/s, que es como se leen en el anemómetro y
 * como vienen en una ficha. Con menos aire —calor, altura— las cuentas se
 * hacen en verdadera y se devuelven indicadas: V1 y la carrera cambian, la Vr
 * y la V2 no.
 */

import { masaDe, type AircraftConfig } from "./aircraft";
import { SEA_LEVEL_DENSITY, GRAVITY } from "./atmosphere";
import { empujeLleno } from "./fdm";
import { areaDelMotor, llevaBandera, motorCritico } from "./motores";
import { resistenciaDelTren } from "./tren";
import { fraccionDeLosFlaps, resistenciaDeLosFlaps } from "./flaps";
import { deceleracionRodando } from "./frenada";
import { ROZAMIENTO } from "../world/superficie";

/**
 * **Lo que tarda en decidirse y empezar a parar**, s.
 *
 * Dos segundos a V1, que es lo que da la norma para el reconocimiento y los
 * primeros gestos (CS-25.109: la distancia de «dos segundos a V1»). En ellos
 * el avión sigue corriendo, y eso son ciento cincuenta metros en un reactor.
 */
export const DECIDIR = 2;

/**
 * **La palanca de flaps con la que despega este juego**: la primera muesca,
 * que es la que pone el vuelo de línea en la cabecera (`vuelo-de-linea.ts`).
 */
export const FLAPS_DE_DESPEGUE = 1 / 3;

/**
 * **La Vr de un avión de transporte, sobre su pérdida con los flaps de
 * despegue**: 1,1.
 *
 * Es la regla de la que sale: el avión tiene que irse del suelo, con todos los
 * motores, a no menos de 1,1 veces su velocidad mínima de despegue (CS
 * 25.107 e 1 iv y 14 CFR 25.107 e 1 iv), y esa velocidad mínima, la VMU, es la
 * pérdida con los flaps de despegue y la cola a punto de tocar. En un modelo
 * sin efecto suelo como éste, las dos son la misma, y se rota a la vez que se
 * llega a ella.
 *
 * Las Vr de la flota estaban escritas a mano, y las de los tres reactores eran
 * las de su peso máximo al despegar puestas en una ficha más ligera: por encima
 * de su propia V2. Con esta regla, la del 747-100 sale en 145 nudos a 255.826
 * kg, que es lo que dicen a la vez su V2 publicada —169 nudos a su peso máximo,
 * 147 a éste— y la pista que pide Boeing a este peso. Ver `aircraft.ts` y el
 * ADR 0027. La comprueba `despegue-y-toma-del-manual.test.ts`.
 */
export const VR_SOBRE_LA_PERDIDA = 1.1;

/** Todo lo que dice este fichero de un despegue, en m/s indicados. */
export interface VelocidadesDeDespegue {
  /**
   * V1, o `null` si esta pista no deja ninguna: la parada desde la Vmc ya no
   * cabe. Un avión así no debería despegar de aquí con este aire.
   */
  readonly v1: number | null;
  readonly vr: number;
  /** V2, o la Vyse en el bimotor de pistón. Ver `conUnMotor`. */
  readonly v2: number;
  /** Vmc, o `null` en un monomotor. */
  readonly vmc: number | null;
  /** Hasta dónde podría llegar V1 en esta pista: la parada justa. */
  readonly v1Maxima: number;
}

/** El alargamiento, que va en todas las cuentas de la resistencia inducida. */
function alargamiento(a: AircraftConfig): number {
  return (a.wingSpan * a.wingSpan) / a.wingArea;
}

/**
 * **La Vmc**, indicada, m/s. `null` en un monomotor.
 *
 * El timón a fondo contra el par del motor crítico parado y los demás a tope:
 * `q·S·b·Cnδr = (T + D)·y`, con `T` lo que da cada motor a esa velocidad, `D`
 * lo que frena el parado y `y` su distancia al eje. El timón crece con la
 * presión dinámica y el empuje casi no cambia, así que por debajo de un punto
 * ya no llega: ése es el número.
 *
 * El motor parado, como lo pide la norma para la Vmc en vuelo: en molinete, o
 * en bandera si el avión la pone solo. Y sin el alabeo de cinco grados hacia
 * el motor bueno que la norma deja usar: aquí el derrape es cero, que es lo
 * que ese alabeo consigue, así que la cuenta ya es la de ese caso.
 */
export function vmc(
  a: AircraftConfig,
  densidad: number = SEA_LEVEL_DENSITY,
): number | null {
  const k = motorCritico(a);
  if (k < 0) return null;
  const brazo = Math.abs(a.motoresA[k]!);
  const n = a.motoresA.length;
  const area = areaDelMotor(
    a,
    a.motorParado.autoBandera && llevaBandera(a) ? "bandera" : "molinete",
  );
  const sobra = (v: number): number => {
    const q = 0.5 * densidad * v * v;
    const timon = q * a.wingArea * a.wingSpan * a.aero.cnRudder;
    const tuerce = brazo * (empujeLleno(a, densidad, v) / n + q * area);
    return timon - tuerce;
  };
  let lento = 0.5;
  let rapido = 400;
  if (sobra(rapido) < 0) return Infinity;
  for (let i = 0; i < 60; i++) {
    const medio = (lento + rapido) / 2;
    if (sobra(medio) >= 0) rapido = medio;
    else lento = medio;
  }
  return rapido * Math.sqrt(densidad / SEA_LEVEL_DENSITY);
}

/**
 * La resistencia en el suelo, como el modelo de vuelo la ve rodando: el ala
 * sin ángulo, el tren fuera y los flaps que lleve. N a `v` verdadera.
 */
function frenaElAire(
  a: AircraftConfig,
  densidad: number,
  v: number,
  flaps: number,
): number {
  const cl = a.aero.cl0 + a.flapsLift * flaps;
  const cd =
    a.aero.cd0 +
    (cl * cl) / (Math.PI * alargamiento(a) * a.aero.oswald) +
    resistenciaDelTren(a, 1, fraccionDeLosFlaps(a, flaps)) +
    resistenciaDeLosFlaps(a, flaps);
  return 0.5 * densidad * v * v * a.wingArea * cd;
}

/**
 * **Lo que se recorre hasta llegar a `v`**, verdadera, con todos los motores
 * a tope, m. Como `carreraHastaVr` en `carrera.ts` pero con el empuje del
 * modelo de vuelo —el de chorro para los reactores— y su rodadura, que no
 * mira cuánto peso lleva ya el ala: esta cuenta tiene que decir lo mismo que
 * el avión, porque de ella sale dónde se decide.
 */
export function hastaLlegarA(
  a: AircraftConfig,
  v: number,
  densidad: number = SEA_LEVEL_DENSITY,
  flaps = 0,
): number {
  const mu = ROZAMIENTO.asfalto;
  const pasos = 300;
  const dv = v / pasos;
  let s = 0;
  for (let i = 0; i < pasos; i++) {
    const u = (i + 0.5) * dv;
    const acc =
      (empujeLleno(a, densidad, u) - frenaElAire(a, densidad, u, flaps)) /
        masaDe(a) -
      mu * GRAVITY;
    if (acc <= 0) return Infinity;
    s += (u / acc) * dv;
  }
  return s;
}

/**
 * **Lo que se recorre parando desde `v`**, verdadera, m: gas al mínimo, freno
 * a fondo y el motor parado frenando en molinete. Sin reversa —la norma no la
 * cuenta en pista seca, y lo que se quiere saber es si cabe **sin** ella— y
 * sin frenos de tierra, que solo salen solos si se han armado.
 *
 * **Con la frenada del avión que vuela**, `deceleracionRodando`: el freno de
 * su tipo sobre el peso que cargan las ruedas. Era un 0,28 de todo el peso
 * para todos, «el mismo que aplica el modelo de vuelo», y el modelo de vuelo
 * dejó de aplicarlo cuando cada tipo tuvo su freno (ADR 0016): la V1 prometía
 * una parada que no era la del avión. Con la Vr de su peso, en el JAZ 120 esa
 * parada vieja no cabía desde su Vmc en la pista que le pide el hangar (ADR
 * 0027).
 */
export function hastaPararDesde(
  a: AircraftConfig,
  v: number,
  densidad: number = SEA_LEVEL_DENSITY,
  flaps = 0,
): number {
  const molinete = a.motoresA.length > 1 ? a.motorParado.molinete : 0;
  const mandos = { freno: 1, frenosDeTierra: 0, reversa: 0, flaps };
  const suelo = { superficie: "asfalto" as const, mojada: false, densidad };
  const pasos = 300;
  const dv = v / pasos;
  let s = 0;
  for (let i = 0; i < pasos; i++) {
    const u = (i + 0.5) * dv;
    const frena =
      deceleracionRodando(a, u, mandos, suelo) +
      (0.5 * densidad * u * u * molinete) / masaDe(a);
    s += (u / frena) * dv;
  }
  return s;
}

/**
 * **La distancia de acelerar y parar**: correr hasta `v` con todos, dos
 * segundos decidiendo a esa velocidad y frenar hasta pararse, m. `v`
 * verdadera. Es la cuenta que dice si cabe abortar.
 */
export function acelerarYParar(
  a: AircraftConfig,
  v: number,
  densidad: number = SEA_LEVEL_DENSITY,
  flaps = 0,
): number {
  return (
    hastaLlegarA(a, v, densidad, flaps) +
    v * DECIDIR +
    hastaPararDesde(a, v, densidad, flaps)
  );
}

/**
 * La pérdida con estos flaps, indicada, m/s: el ala al ángulo de pérdida de
 * la ficha, con lo que añaden los flaps, sosteniendo el peso.
 */
export function perdidaCon(a: AircraftConfig, flaps = 0): number {
  const clMax =
    a.aero.cl0 + a.aero.clAlpha * a.aero.alphaStall + a.flapsLift * flaps;
  return Math.sqrt(
    (2 * masaDe(a) * GRAVITY) / (SEA_LEVEL_DENSITY * a.wingArea * clMax),
  );
}

/**
 * **Lo que sube con un motor menos** a `v` indicada, m/s: el tren dentro, los
 * flaps que se digan, los demás a tope y el parado como quede asegurado —en
 * bandera si se puede, en molinete si no—. Al nivel del mar y con el derrape
 * a cero, que es como se vuela.
 */
export function subidaConUnMotor(
  a: AircraftConfig,
  v: number,
  flaps = 0,
  parado: "asegurado" | "molinete" = "asegurado",
): number {
  const n = a.motoresA.length;
  if (n < 2) return -Infinity;
  const rho = SEA_LEVEL_DENSITY;
  const q = 0.5 * rho * v * v;
  const peso = masaDe(a) * GRAVITY;
  const cl = peso / (q * a.wingArea);
  const cd =
    a.aero.cd0 +
    (cl * cl) / (Math.PI * alargamiento(a) * a.aero.oswald) +
    resistenciaDeLosFlaps(a, flaps);
  const area = areaDelMotor(
    a,
    parado === "asegurado" && llevaBandera(a) ? "bandera" : "molinete",
  );
  const empuje = (empujeLleno(a, rho, v) * (n - 1)) / n;
  const resistencia = q * (a.wingArea * cd + area);
  return ((empuje - resistencia) * v) / peso;
}

/**
 * **La línea azul**: la Vyse, la velocidad a la que más sube con un motor
 * parado y asegurado, indicada, m/s. La que se pinta de azul en el anemómetro
 * de un bimotor ligero, y la que se vuela en él con un motor.
 */
export function lineaAzul(a: AircraftConfig): number {
  const desde = perdidaCon(a) * 1.05;
  let mejor = desde;
  let masSube = -Infinity;
  for (let v = desde; v < a.cruiseSpeed * 1.2; v += 0.25) {
    const sube = subidaConUnMotor(a, v);
    if (sube > masSube) {
      masSube = sube;
      mejor = v;
    }
  }
  return mejor;
}

/**
 * **Qué velocidad se vuela con un motor parado** y cómo se llama en ese
 * avión: la V2 en los que se certifican como de transporte —el turbohélice y
 * los reactores—, y la línea azul en el bimotor de pistón.
 */
export function conUnMotor(
  a: AircraftConfig,
  flaps = 0,
): { readonly nombre: "V2" | "VYSE"; readonly velocidad: number } {
  if (a.sound.engine === "piston")
    return { nombre: "VYSE", velocidad: lineaAzul(a) };
  const m = vmc(a) ?? 0;
  return {
    nombre: "V2",
    velocidad: Math.max(perdidaCon(a, flaps) * 1.2, m * 1.1, a.rotationSpeed),
  };
}

/**
 * **V1, Vr y V2 para esta pista y este aire.** Ver la cabecera.
 *
 * `pista`, los metros que hay por delante al empezar a correr; `densidad`, la
 * del aire del día en la pista; `flaps`, la palanca con la que se sale. Y el
 * peso es el que lleve `a`: con `conMasa`, el de hoy con su combustible, que
 * es la tercera cosa de «pesado, caliente, alto y corto». Ver el ADR 0019.
 *
 * La V1 es la de la ficha —la que lleva el tipo en una pista larga— salvo que
 * la pista no dé para parar desde ella: entonces baja hasta la que sí da, y si
 * ni desde la Vmc cabe parar, no hay V1.
 */
export function velocidadesDeDespegue(
  a: AircraftConfig,
  pista: number,
  densidad: number = SEA_LEVEL_DENSITY,
  flaps = 0,
): VelocidadesDeDespegue {
  const sigma = Math.max(0.05, densidad / SEA_LEVEL_DENSITY);
  const aVerdadera = (ias: number): number => ias / Math.sqrt(sigma);
  const aIndicada = (tas: number): number => tas * Math.sqrt(sigma);
  const vr = a.rotationSpeed;
  // La más rápida desde la que se para en la pista, sin pasar de la Vr.
  let lento = 0;
  let rapido = aVerdadera(vr);
  if (acelerarYParar(a, rapido, densidad, flaps) <= pista) lento = rapido;
  else
    for (let i = 0; i < 50; i++) {
      const medio = (lento + rapido) / 2;
      if (acelerarYParar(a, medio, densidad, flaps) <= pista) lento = medio;
      else rapido = medio;
    }
  const v1Maxima = aIndicada(lento);
  const m = vmc(a, densidad);
  const v1 = Math.min(a.decisionSpeed, v1Maxima);
  return {
    v1: m !== null && v1 < m ? null : v1,
    vr,
    v2: conUnMotor(a, flaps).velocidad,
    vmc: m,
    v1Maxima,
  };
}
