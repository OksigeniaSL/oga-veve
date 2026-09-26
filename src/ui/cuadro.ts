/**
 * De qué está hecho el cuadro de mandos **de este avión**.
 *
 * Jugando, con la flota ya en seis: «el cuadro de mandos del avión me salen
 * todos iguales; si estoy en un reactor o en un 747, el niño que juega quiere
 * fliparlo y ver botones y lucecitas, quiere un monstruo de avión, no una
 * avioneta».
 *
 * Y no era solo una cuestión de gusto: era **falso**. El anemómetro tenía el
 * fondo de escala en ciento sesenta nudos para los seis aviones, así que el de
 * fuselaje ancho —que cruza a cuatrocientos cuarenta y siete— volaba con la
 * aguja clavada en el tope desde poco después de despegar. Un instrumento
 * clavado no dice nada, y lo que enseñaba era mentira.
 *
 * Aquí se decide lo que cambia de un avión a otro, y sale todo de su ficha:
 *
 * - **Las escalas** de las esferas, para que la aguja viva dentro y no en el
 *   tope: anemómetro, variómetro y los arcos de color, que en un avión de
 *   verdad son sus velocidades y no un adorno.
 * - **Cuántos motores hay y qué marca cada uno.** Un pistón enseña vueltas, un
 *   turbohélice su par, un turbofán el régimen del fan — que es lo que se
 *   llama N1 y es el mando con el que se vuela de verdad un avión de línea.
 *
 * Lo que **no** cambia es la disposición de los seis instrumentos clásicos:
 * esa es la misma en una avioneta y en un Boeing, y ese es justo el hallazgo
 * que se lleva quien aprende aquí. Ver `six-pack.ts`.
 */

import { esDeChorro, type AircraftConfig } from "../flight/aircraft";
import { ascensoMaximo } from "../flight/carrera";

/**
 * Las tres conversiones del cuadro de mandos, en un solo sitio.
 *
 * Estaban escritas a pelo en cada fichero que las necesitaba —`1.94384`,
 * `3.28084`, `196.85`, repetidas en el HUD, en las pantallas de la cabina y
 * aquí— y ese es el camino conocido a que dos instrumentos del mismo avión
 * digan cifras distintas. Un cuadro de mandos tiene una escala; la conversión
 * es parte de la escala.
 */
export const NUDOS = 1.94384;
/** Un metro, en pies. */
export const PIES = 3.28084;
/** Un metro por segundo, en pies por minuto. */
export const PIES_POR_MINUTO = 196.85;

/** Qué marca cada aguja de motor, y cómo se llama en la cabina. */
export type Motor = "rpm" | "par" | "n1";

export interface Cuadro {
  /** Fondo de escala del anemómetro, en nudos. */
  readonly asiMax: number;
  /** Fondo de escala del variómetro, en pies por minuto. */
  readonly vsiMax: number;
  /**
   * Los tres arcos del anemómetro, como fracción del fondo de escala.
   *
   * Verde de la pérdida al crucero, ámbar del crucero a la de nunca pasar,
   * rojo de ahí al final. Son las marcas de un anemómetro de verdad, y con
   * ellas la esfera enseña **este** avión: dónde empieza a volar y dónde deja
   * de ser buena idea.
   */
  readonly arcos: {
    readonly verde: readonly [number, number];
    readonly ambar: readonly [number, number];
    readonly rojo: readonly [number, number];
  };
  /** Cuántas agujas de motor hay. */
  readonly motores: number;
  /** Y qué marcan. */
  readonly queMarca: Motor;
  /** El rótulo de esas agujas: `N1`, `RPM` o `TRQ`. */
  readonly rotulo: string;
  /**
   * **Los grados de cada muesca de flaps**, para rotular su regla.
   *
   * Eran 0, 10, 20 y 30 en los seis, y en un reactor eso es enseñar un tope
   * que no tiene: el suyo primero son cinco. Salen de la ficha, como todo lo
   * de aquí. Ver `muescasDeFlaps` en `aircraft.ts`.
   *
   * **Vacía en el avión que no los lleva**, y entonces no hay regla: una
   * regla con su puntero quieto en el cero enseña un mando que no existe.
   */
  readonly flaps: readonly number[];
}

/** Redondea hacia arriba a algo que se pueda rotular. */
function aCifraRedonda(v: number): number {
  const paso = v <= 200 ? 20 : v <= 600 ? 40 : 100;
  return Math.ceil(v / paso) * paso;
}

/** La velocidad de pérdida limpia que dicen los coeficientes, m/s. */
function perdida(a: AircraftConfig): number {
  const clMax = a.aero.cl0 + a.aero.clAlpha * a.aero.alphaStall;
  return Math.sqrt((2 * a.mass * 9.81) / (1.225 * a.wingArea * clMax));
}

/**
 * Las escalas de cada avión, calculadas una vez.
 *
 * Esto se pregunta en cada imagen desde dos sitios —el cuadro de la cabina en
 * tres dimensiones y el del HUD—, y la respuesta no cambia nunca para un avión
 * dado: es su ficha. Calcularla sesenta veces por segundo no rompe nada, pero
 * es trabajo tirado, y sobre todo es la puerta a que alguien guarde una copia
 * «para no recalcular» y acabemos con dos cifras para lo mismo.
 */
const YA_CALCULADO = new WeakMap<AircraftConfig, Cuadro>();

export function cuadroDe(a: AircraftConfig): Cuadro {
  const guardado = YA_CALCULADO.get(a);
  if (guardado) return guardado;
  const hecho = calcularCuadro(a);
  YA_CALCULADO.set(a, hecho);
  return hecho;
}

function calcularCuadro(a: AircraftConfig): Cuadro {
  /*
   * El fondo de escala deja un cuarto por encima del crucero, que es donde
   * están la de nunca pasar y el pico de un picado. Con la avioneta da los
   * ciento sesenta de siempre —o sea que **la esfera que ya estaba medida no
   * se mueve**— y con el grande, quinientos sesenta.
   */
  const asiMax = aCifraRedonda(a.cruiseSpeed * 1.25 * NUDOS);
  const vsiMax = Math.max(
    2000,
    Math.ceil((ascensoMaximo(a) * PIES_POR_MINUTO) / 500) * 500,
  );
  const vne = (a.cruiseSpeed * 1.15 * NUDOS) / asiMax;
  const queMarca: Motor = esDeChorro(a)
    ? "n1"
    : a.sound.engine === "turboprop"
      ? "par"
      : "rpm";
  return {
    asiMax,
    vsiMax,
    arcos: {
      verde: [(perdida(a) * NUDOS) / asiMax, (a.cruiseSpeed * NUDOS) / asiMax],
      ambar: [(a.cruiseSpeed * NUDOS) / asiMax, vne],
      rojo: [vne, 0.98],
    },
    motores: a.motores,
    queMarca,
    rotulo: queMarca === "n1" ? "N1" : queMarca === "par" ? "TRQ" : "RPM",
    flaps: a.llevaFlaps ? a.muescasDeFlaps : [],
  };
}

/**
 * A cuánto va cada motor ahora mismo, de 0 a 1.
 *
 * **Sale del mismo sitio que el sonido**, y eso no es una casualidad que
 * convenga: si la aguja dijera una cosa y el motor sonara otra, el instrumento
 * dejaría de ser un instrumento. Ver `audio/audio.ts`.
 *
 * A ralentí no marca cero, que es lo que confunde a quien mira: un motor en
 * marcha gira, y un turbofán a ralentí anda por el veinte por ciento de N1.
 */
export function regimen(
  a: AircraftConfig,
  gas: number,
  encendido: boolean,
): number {
  if (!encendido) return 0;
  const { idleRpm, maxRpm } = a.sound;
  return (
    (idleRpm + Math.max(0, Math.min(1, gas)) * (maxRpm - idleRpm)) / maxRpm
  );
}
