/**
 * **La frenada en tierra**: lo que para un avión desde que toca hasta que se
 * queda quieto, y por qué no lo para igual un avión que otro.
 *
 * ## Lo que estaba
 *
 * Un solo número para los seis: el pie a fondo eran veintiocho centésimas de
 * g sobre **todo** el peso, desde el primer instante. Para una avioneta parada
 * vale; para un reactor que toca a su Vref es mentira por dos lados. Al tocar,
 * el ala todavía sostiene tres cuartas partes del avión, y una rueda que no
 * carga no frena: el freno de verdad muerde sobre el peso que le queda a las
 * ruedas, y por eso existen los frenos de tierra. Y en mojado la rueda patina
 * antes, sobre todo deprisa, que es justo donde más hace falta frenar.
 *
 * Contado volando: «al pulsar la B el avión frena bastante», «he llegado a
 * frenar en poco espacio». Con el ala sosteniendo el avión y sin frenos de
 * tierra, frenar al tocar casi no hace nada; con ellos, lo que dice el manual.
 *
 * ## Lo que hay ahora
 *
 * - **El freno, sobre el peso que cargan las ruedas** —el del avión menos lo
 *   que sostiene el ala—, con el coeficiente de su tipo. Ver `FrenosDelTipo`.
 * - **Los frenos de tierra**, que matan la sustentación al tocar y pasan el
 *   peso a las ruedas. Ver `frenosDeTierra` en la ficha y
 *   `flight/palanca-de-aerofrenos.ts`, que decide cuándo salen.
 * - **La pista mojada**, con la curva de la norma de certificación: 14 CFR
 *   25.109(c), el coeficiente máximo entre neumático y pista mojada contra la
 *   velocidad, por la presión del neumático, multiplicado por lo que saca de
 *   él el antideslizante.
 * - **El autofreno**, LO, MED o MAX: una deceleración pedida que el sistema
 *   sostiene modulando el freno, contando lo que ya frenan el aire y las
 *   reversas. Los números son los de la familia de Airbus —1,7 y 3 m/s², y el
 *   máximo para el despegue abortado—, y se activa cuando salen los frenos de
 *   tierra, como en ella: sin armarlos, el autofreno no entra.
 * - **La reversa**, que ya estaba, aquí con el resto de lo que frena.
 *
 * Es la cuenta que comparten los dos modelos de vuelo y la que decide qué
 * avión cabe en qué pista: el de coeficientes frena con sus fuerzas, el de
 * Guyrami pregunta aquí cuánto frena, y `carrera.ts` integra esto mismo.
 * Que frenar, caber y aterrizar no digan tres cosas distintas.
 */

import { masaDe, tieneReversa, type AircraftConfig } from "./aircraft";
import { GRAVITY, SEA_LEVEL_DENSITY } from "./atmosphere";
import { fraccionDeLosFlaps, resistenciaDeLosFlaps } from "./flaps";
import { resistenciaDelTren } from "./tren";
import { ROZAMIENTO, type Superficie } from "../world/superficie";

/**
 * **Cómo frenan las ruedas de un tipo.** Va en su ficha.
 *
 * - `enSeco`: el coeficiente de frenado a fondo en asfalto seco, ya con lo
 *   que deja el antideslizante o el pie. Es la deceleración máxima, en g, de
 *   un avión que no tenga nada sostenido por el ala: de tres décimas en una
 *   avioneta de rueda de cola a cuatro y media en un reactor con frenos de
 *   carbono.
 * - `psi`: la presión de los neumáticos, que es lo que manda en mojado. La
 *   tabla de la 25.109 va de 50 a 300 psi; fuera de ella, la de su borde.
 * - `antideslizante`: la eficiencia del sistema en mojado, de la 25.109(c)(2):
 *   0,3 todo o nada, 0,5 casi modulado y 0,8 modulado del todo. En el avión
 *   que no lo lleva, lo que saca un pie con cuidado sin bloquear la rueda: el
 *   escalón de en medio, que es lo que deja la rodadura en mojado entre un
 *   quince y un veinte por ciento más larga, como dicen las guías de aviación
 *   general para el asfalto mojado.
 */
export interface FrenosDelTipo {
  readonly enSeco: number;
  readonly psi: number;
  readonly antideslizante: number;
}

/**
 * Cuánto empuje da la reversa, como fracción del empuje máximo.
 *
 * Cuatro décimas. Un turbofán con las compuertas desplegadas da entre un
 * tercio y la mitad de su empuje hacia delante —no más, porque el chorro se
 * desvía y pierde—, y un turbohélice con la hélice en paso negativo anda por
 * ahí. Es bastante para acortar una parada y muy poco para mover el avión
 * hacia atrás, que es lo que hace que no se pueda usar de marcha atrás.
 *
 * Vivía en `fdm.ts`; está aquí porque ahora la usan los dos modelos.
 */
export const REVERSA_DA = 0.4;

/**
 * Y por debajo de cuántos metros por segundo se apaga sola.
 *
 * Quince, que son unos treinta nudos. Por debajo de ahí la reversa deja de
 * frenar y empieza a levantar del suelo lo que haya —piedras, agua, nieve— y a
 * metérselo al motor, así que en un avión de verdad se cancela antes de parar.
 * Aquí se cancela sola porque lo que se enseña es el gesto correcto, no el
 * castigo por no saberlo.
 */
export const REVERSA_HASTA = 15;

/**
 * **Lo que frena la hierba**, comparado con el asfalto.
 *
 * Seis décimas. El manual del 172 lo dice con su número: en hierba seca, la
 * rodadura de aterrizaje un 45 % más larga. Rodar sin frenar cuesta más en
 * hierba —el avión se para antes solo—, pero frenar cuesta menos: la rueda
 * patina sobre la hierba en vez de agarrarse. Y en el campo sin preparar,
 * menos todavía.
 */
const EN_HIERBA = 0.6;
const EN_CAMPO = 0.5;

/**
 * **El coeficiente de la pista mojada**, de la 25.109(c)(1): el máximo entre
 * el neumático y una pista mojada lisa, contra la velocidad sobre el suelo en
 * nudos, para cada presión de neumático. Entre dos filas, en línea recta, como
 * dice la propia norma.
 *
 * Deprisa la rueda casi no agarra —a 130 nudos y 200 psi, dos décimas— y
 * despacio agarra casi como en seco. Por eso en mojado lo que se alarga es el
 * principio de la carrera, y por eso ahí ayudan tanto la reversa y los
 * frenos de tierra.
 */
const MOJADO: readonly { psi: number; c: readonly [number, number, number, number] }[] = [
  { psi: 50, c: [-0.035, 0.306, -0.851, 0.883] },
  { psi: 100, c: [-0.0437, 0.32, -0.805, 0.804] },
  { psi: 200, c: [-0.0331, 0.252, -0.658, 0.692] },
  { psi: 300, c: [-0.0401, 0.263, -0.611, 0.614] },
];

/** Metros por segundo a nudos. */
const NUDOS = 1.94384;

function filaMojada(c: readonly [number, number, number, number], nudos: number): number {
  const x = nudos / 100;
  return c[0] * x * x * x + c[1] * x * x + c[2] * x + c[3];
}

/** El coeficiente de la tabla de la 25.109 a esta presión y velocidad. */
export function coeficienteEnMojado(psi: number, velocidadSuelo: number): number {
  const nudos = Math.max(0, Math.abs(velocidadSuelo) * NUDOS);
  const p = Math.max(MOJADO[0]!.psi, Math.min(MOJADO[MOJADO.length - 1]!.psi, psi));
  let i = 0;
  while (i < MOJADO.length - 2 && MOJADO[i + 1]!.psi < p) i++;
  const a = MOJADO[i]!;
  const b = MOJADO[i + 1]!;
  const t = (p - a.psi) / (b.psi - a.psi);
  return Math.max(
    0,
    filaMojada(a.c, nudos) * (1 - t) + filaMojada(b.c, nudos) * t,
  );
}

/**
 * **Lo que puede frenar la rueda aquí y ahora**: el coeficiente del freno a
 * fondo, sobre esta superficie, seca o mojada, a esta velocidad.
 *
 * En seco no depende de la velocidad: lo pone el freno. En mojado lo pone la
 * pista, y nunca más que en seco.
 */
export function coeficienteDeFrenado(
  f: FrenosDelTipo,
  superficie: Superficie,
  mojada: boolean,
  velocidadSuelo: number,
): number {
  const suelo =
    superficie === "asfalto" ? 1 : superficie === "hierba" ? EN_HIERBA : EN_CAMPO;
  const seco = f.enSeco * suelo;
  if (!mojada) return seco;
  return Math.min(
    seco,
    f.antideslizante * coeficienteEnMojado(f.psi, velocidadSuelo) * suelo,
  );
}

/** Los modos del autofreno, en el orden en que gira el selector. */
export type ModoDeAutofreno = "off" | "lo" | "med" | "max";
export const MODOS_DE_AUTOFRENO: readonly ModoDeAutofreno[] = [
  "off",
  "lo",
  "med",
  "max",
];

/**
 * **La deceleración que sostiene cada modo**, m/s², y cuánto espera tras
 * salir los frenos de tierra.
 *
 * Los de la familia de Airbus, que son los que se dicen con estas letras:
 * LO, 1,7 m/s² a los cuatro segundos; MED, 3 m/s² a los dos. MAX es el freno a
 * fondo en cuanto salen los frenos de tierra, y se arma para despegar: si hay
 * que abortar, el avión frena solo con todo lo que tiene mientras quien vuela
 * pone el gas al ralentí y la reversa. Se puede dejar puesto para aterrizar y
 * frena, pero es una parada que nadie quiere de pasajero.
 */
export const DECELERACION_DEL_AUTOFRENO: Readonly<
  Record<Exclude<ModoDeAutofreno, "off">, number>
> = { lo: 1.7, med: 3, max: Infinity };
export const ESPERA_DEL_AUTOFRENO: Readonly<
  Record<Exclude<ModoDeAutofreno, "off">, number>
> = { lo: 4, med: 2, max: 0 };

/** Lo que se le pide a la frenada en un instante. Todo de 0 a 1. */
export interface MandosDeFrenada {
  readonly freno: number;
  readonly frenosDeTierra: number;
  readonly reversa: number;
  readonly flaps: number;
  /** El tren: 1 fuera, que es como se rueda. */
  readonly tren?: number;
}

/** Y el suelo sobre el que se frena. */
export interface SueloDeFrenada {
  readonly superficie: Superficie;
  readonly mojada: boolean;
  /** kg/m³. Sin ella, la del nivel del mar en un día estándar. */
  readonly densidad?: number;
}

/**
 * **El coeficiente de sustentación rodando**, con la parte que se llevan los
 * frenos de tierra.
 *
 * Rodando, el ala va con el ángulo del avión apoyado en sus tres patas, que
 * en esta flota es cero: lo que sustenta es el ala con su curvatura y lo que
 * añaden los flaps.
 */
export function sustentacionRodando(
  ac: AircraftConfig,
  flaps: number,
  frenosDeTierra: number,
): number {
  const cl = ac.aero.cl0 + ac.flapsLift * Math.max(0, Math.min(1, flaps));
  return cl * (1 - parteQueSeLlevan(ac, frenosDeTierra));
}

/** Qué parte de la sustentación se llevan los frenos de tierra así de fuera. */
export function parteQueSeLlevan(ac: AircraftConfig, frenosDeTierra: number): number {
  const ft = ac.frenosDeTierra;
  if (!ft) return 0;
  return ft.sustentacion * Math.max(0, Math.min(1, frenosDeTierra));
}

/** Y lo que suman a la resistencia, contando el tope de vuelo de la palanca. */
export function resistenciaDeLosPaneles(
  ac: AircraftConfig,
  aerofrenos: number,
  frenosDeTierra: number,
): number {
  const enVuelo = (ac.aerofrenos ?? 0) * Math.max(0, Math.min(1, aerofrenos));
  const enTierra =
    (ac.frenosDeTierra?.resistencia ?? 0) * Math.max(0, Math.min(1, frenosDeTierra));
  // Son los mismos paneles: los de tierra son todos y del todo, así que no se
  // suman a los de vuelo, los contienen.
  return Math.max(enVuelo, enTierra);
}

/**
 * **Cuánto frena el avión rodando a esta velocidad**, m/s².
 *
 * El aire —su resistencia con lo que lleve fuera—, la rodadura y el freno
 * sobre el peso que cargan las ruedas, y la reversa. Es la cuenta del modelo
 * de coeficientes hecha con el avión apoyado en sus ruedas, y la usan el
 * modelo de Guyrami, que no tiene fuerzas, y la distancia de aterrizaje.
 */
export function deceleracionRodando(
  ac: AircraftConfig,
  velocidad: number,
  m: MandosDeFrenada,
  suelo: SueloDeFrenada,
): number {
  const v = Math.max(0, velocidad);
  const rho = suelo.densidad ?? SEA_LEVEL_DENSITY;
  // Lo que pesa ahora, con lo que quede en los depósitos. Ver `masaDe`.
  const masa = masaDe(ac);
  const peso = masa * GRAVITY;
  const q = 0.5 * rho * v * v * ac.wingArea;
  const cl = sustentacionRodando(ac, m.flaps, m.frenosDeTierra);
  const alargamiento = (ac.wingSpan * ac.wingSpan) / ac.wingArea;
  const cd =
    ac.aero.cd0 +
    (cl * cl) / (Math.PI * alargamiento * ac.aero.oswald) +
    resistenciaDeLosFlaps(ac, m.flaps) +
    resistenciaDelTren(ac, m.tren ?? 1, fraccionDeLosFlaps(ac, m.flaps)) +
    resistenciaDeLosPaneles(ac, 0, m.frenosDeTierra);
  const apoyado = Math.max(0, peso - q * cl);
  const mu = coeficienteDeFrenado(ac.frenos, suelo.superficie, suelo.mojada, v);
  const ruedas =
    (ROZAMIENTO[suelo.superficie] + mu * Math.max(0, Math.min(1, m.freno))) *
    apoyado;
  const reversa =
    tieneReversa(ac) && v > REVERSA_HASTA
      ? Math.max(0, Math.min(1, m.reversa)) * ac.maxThrust * REVERSA_DA
      : 0;
  return (q * cd + ruedas + reversa) / masa;
}

/**
 * **El freno que pide el autofreno** para sostener su deceleración, de 0 a 1,
 * sabiendo lo que frena el avión sin freno y con el freno a fondo.
 *
 * Es lo que hace el de verdad: mide la deceleración y modula la presión. Con
 * la reversa puesta frena menos con las ruedas —la deceleración ya la da el
 * chorro—, que es por lo que se usan las dos: se gastan menos los frenos.
 */
export function frenoDelAutofreno(
  objetivo: number,
  sinFreno: number,
  aFondo: number,
): number {
  if (!(objetivo > 0)) return 0;
  if (!Number.isFinite(objetivo)) return 1;
  const margen = aFondo - sinFreno;
  if (!(margen > 1e-6)) return objetivo > sinFreno ? 1 : 0;
  return Math.max(0, Math.min(1, (objetivo - sinFreno) / margen));
}
