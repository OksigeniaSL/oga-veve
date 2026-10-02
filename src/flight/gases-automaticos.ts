/**
 * **Los gases automáticos**: la otra mano del piloto automático, la de las
 * palancas. A/THR en un Airbus, A/T en un Boeing.
 *
 * ## Quién los lleva
 *
 * Los reactores de línea, y nadie más de esta flota: el JAZ 90 y el JAZ 120.
 * Un turbohélice de diecinueve plazas lleva piloto automático —rumbo y
 * altitud, y su ventanilla— pero las palancas las mueve quien vuela; una
 * avioneta, lo mismo, y un fumigador ni siquiera lleva automático. Hasta
 * ahora el automático del juego movía el gas en los seis, que es justo lo que
 * no hace el avión de verdad: «lo que el avión no lleva no se inventa».
 *
 * ## Por qué esto se reescribió: el bombeo
 *
 * Enrique, nivelado a veintinueve mil pies con el JAZ 120 y el automático:
 * «el N1 va y viene entre 51 y 79 todo el rato», y en Guyrami y en Taguató
 * igual, «no noto que los aviones hagan eso todo el tiempo». Y tiene razón: en
 * crucero tranquilo los gases de un avión de verdad apenas se mueven —décimas
 * de N1, despacio— y solo trabajan con turbulencia, con viento o al cambiar
 * de nivel.
 *
 * Una traza de quién escribía el gas en cada fotograma —un espía en el objeto
 * de los mandos, ver `scripts/verificar-crucero.mjs`— dio un solo nombre en el
 * aire: el canal de velocidad del piloto automático. No había dos manos
 * peleándose; había una mal hecha. Su ley era **un integrador puro** sobre el
 * error de velocidad —cada nudo que faltaba empujaba la palanca un poco más
 * cada segundo— y nada miraba la aceleración. Con un avión de doscientas
 * cincuenta toneladas, que tarda en notar el empuje y casi no tiene
 * resistencia que lo frene, eso es un columpio sin amortiguar: medido con la
 * cuenta, un 2 % de amortiguamiento y medio minuto de periodo. Medido en el
 * juego: el N1 del 58 al 95 cada vaivén.
 *
 * ## Cómo manda ahora, y por qué en dos pisos
 *
 * Como uno de verdad, en dos lazos encadenados que se explican solos:
 *
 * - **La velocidad que falta pide una aceleración**, suave: la que la
 *   recupera en una docena de segundos, y como mucho un nudo por segundo, que
 *   es lo que se nota sin molestar a nadie.
 * - **La aceleración que falta mueve la palanca**, medida sobre la que ya
 *   lleva el avión —por eso no se pasa—, con lo que de verdad empuja el motor
 *   a esa altura: arriba, donde el aire es fino, la misma palanca empuja la
 *   mitad, y la corrección tiene que ser el doble para hacer lo mismo.
 *
 * Y la palanca no va más deprisa que un servo: un doce por ciento de su
 * recorrido por segundo. En crucero quieto la velocidad está en su sitio, la
 * aceleración es cero y la palanca no se mueve: N1 quieto, que es lo que se
 * pedía.
 *
 * Sin three.js ni DOM: se comprueba sin volar.
 */

import type { AircraftConfig } from "./aircraft";
import { GRAVITY as GRAVEDAD } from "./atmosphere";

/**
 * **Si este avión lleva piloto automático.**
 *
 * Todos menos el fumigador. La avioneta de escuela y el bimotor llevan uno de
 * dos ejes —rumbo y altitud—, como cualquier avioneta de escuela moderna; el
 * turbohélice y los reactores, el de su panel. Un biplano de fumigar vuela a
 * diez metros del cultivo y no lleva nada de eso: lo que el avión no lleva no
 * se inventa, en ningún peldaño.
 *
 * **Y es del avión, no del peldaño.** Estaba al revés: el botón salía de
 * Tukã para arriba en los seis y en Guyrami en ninguno, así que el JAZ 120 de
 * los pequeños tenía que sostener veintinueve mil pies a flechazos. «El
 * peldaño no le quita equipo al avión.»
 */
export function llevaPilotoAutomatico(a: Pick<AircraftConfig, "sound">): boolean {
  return a.sound.engine !== "radial";
}

/** **Si lleva gases automáticos**: los reactores. Ver la cabecera. */
export function llevaGasesAutomaticos(a: Pick<AircraftConfig, "sound">): boolean {
  return a.sound.engine === "turbofan";
}

/**
 * **Lo que hacen los gases**, con la palabra de su pantalla, la de Boeing:
 *
 * - `SPD`: sostienen la velocidad de la ventanilla.
 * - `THR`: cambiando de nivel hacia arriba, dan el empuje que pide la subida
 *   —como mucho, el de subida— y la velocidad la lleva el morro.
 * - `IDLE`: al ralentí para bajar; la velocidad, también el morro.
 */
export type ModoDeGases = "SPD" | "THR" | "IDLE";

/**
 * **El gas de subida**, de 0 a 1: el empuje de subida de un reactor, que no
 * es el de despegue. Un motor de línea sube con algo menos que lo que da en
 * la carrera —le alarga la vida y casi no cuesta subida—, y en la pantalla
 * del motor es la raya de «CLB» un poco por debajo de la de «TO».
 */
export const GAS_DE_SUBIDA = 0.92;

/**
 * **A qué ritmo se sube cambiando de nivel**, m/s: unos dos mil quinientos
 * pies por minuto, y menos si el cambio es pequeño —un millar se sube a mil y
 * pico—. Es lo que hace el modo `THR` de un Boeing: no mete todo el empuje
 * de subida para subir mil pies, mete el que da una subida cómoda. Un
 * reactor ligero con todo el empuje de subida subiría a más de cinco mil pies
 * por minuto con el morro a quince grados, que no se le hace a ningún pasaje.
 */
export const SUBIDA_DE_CAMBIO = 12.5;

/** Cuánto ritmo de subida por cada metro que falta, 1/s. Ver `subidaPara`. */
const SUBIDA_POR_METRO = 0.02;

/** El ritmo de subida que se le pide al empuje para subir `falta` metros, m/s. */
export function subidaPara(falta: number): number {
  return Math.min(SUBIDA_DE_CAMBIO, Math.max(5, Math.abs(falta) * SUBIDA_POR_METRO));
}

/** En cuánto tiempo se recupera la velocidad que falta, s. */
export const PARA_LA_VELOCIDAD = 12;

/** La aceleración más fuerte que se pide, m/s²: un nudo por segundo. */
export const ACELERACION_MAXIMA = 0.5;

/**
 * En cuánto tiempo se consigue la aceleración que se pide, s.
 *
 * Tres, que es lo que tarda un turbofán en dar lo que se le pide desde el
 * crucero; con menos, la palanca correría por delante del motor.
 */
const PARA_EL_EMPUJE = 3;

/**
 * Lo que se promedia la aceleración medida, s.
 *
 * Segundo y medio: lo bastante para que un bache no mueva la palanca y lo
 * bastante poco para que el lazo no vaya por detrás. Con los dos números de
 * arriba sale un lazo de amortiguamiento 0,7, que es lo que se busca en un
 * mando que no debe pasarse nunca.
 */
const PROMEDIO_DE_LA_ACELERACION = 1.5;

/**
 * **Lo más deprisa que el servo mueve las palancas**, fracción de su recorrido
 * por segundo.
 *
 * Doce centésimas: de ralentí a subida en ocho segundos, que es lo que se ve
 * hacer a las palancas de un avión de línea cuando entran solas a por el
 * empuje de subida. Y es también lo que separa una corrección de un tirón.
 */
export const RITMO_DEL_SERVO = 0.12;

/** Lo que los gases recuerdan de un paso al siguiente. */
export interface MemoriaDeGases {
  /** La indicada del paso anterior, m/s, o `null` recién enganchados. */
  velocidad: number | null;
  /** La aceleración medida, promediada, m/s². */
  aceleracion: number;
}

/** Unos gases recién enganchados: todavía no han medido nada. */
export function memoriaDeGasesNueva(): MemoriaDeGases {
  return { velocidad: null, aceleracion: 0 };
}

/** Lo que miran los gases en cada paso. */
export interface EstadoDeGases {
  /** La indicada de ahora, m/s. */
  readonly velocidad: number;
  /** Dónde están las palancas, de 0 a 1: se corrige sobre lo que hay. */
  readonly gas: number;
  /**
   * El empuje de todos los motores **con las palancas a fondo, aquí y ahora**,
   * N: el que da el aire de esta altura a esta velocidad. Con él se sabe
   * cuánto acelera cada trozo de palanca. Ver `empujeLleno` en `fdm.ts`.
   *
   * Sin él —una prueba que no lo sabe—, se supone el de un reactor a media
   * altura. Ver `ACELERA_SIN_SABER`.
   */
  readonly empujeAFondo?: number;
  /** La masa del avión, kg. */
  readonly masa?: number;
  /**
   * **El gas que sostiene la velocidad pedida, si el modelo lo sabe de
   * cierto.** En el modelo sencillo de Guyrami el gas **es** la velocidad, y
   * la cuenta es exacta: ahí no hace falta medir nada, se va derecho a él.
   * Ver `gasPara` en `arcade.ts`.
   */
  readonly equilibrio?: number;
  /** El ritmo de subida de ahora, m/s, para el modo `THR`. */
  readonly vertical?: number;
  /** La velocidad verdadera, m/s, para el modo `THR`. */
  readonly verdadera?: number;
  /** El ritmo de subida que se le pide al empuje en `THR`, m/s. */
  readonly subidaPedida?: number;
}

/**
 * Lo que acelera cada unidad de palanca cuando no se sabe, m/s²: la de un
 * reactor de línea a media altura. Equivocarse al doble o a la mitad solo
 * cambia lo deprisa que llega, no si llega: el lazo sigue amortiguado.
 */
const ACELERA_SIN_SABER = 1.5;

const acotar = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/**
 * **Mide la aceleración**, promediada, con la indicada de este paso. La miran
 * los gases y, en los modos en que la velocidad la lleva el morro, también el
 * piloto automático: una medida para los dos. Ver `PROMEDIO_DE_LA_ACELERACION`.
 */
export function medirLaAceleracion(m: MemoriaDeGases, velocidad: number, dt: number): void {
  if (dt > 0 && m.velocidad !== null) {
    /*
     * Con un tope de verosimilitud: ningún avión de esta flota acelera ni
     * frena más de un tercio de g volando. Una lectura así es un salto de la
     * medida —el avión recolocado, el primer fotograma de un modelo nuevo—, y
     * dejarla entrar le hacía cerrar las palancas de golpe por nada.
     */
    const medida = Math.max(-3, Math.min(3, (velocidad - m.velocidad) / dt));
    m.aceleracion += (medida - m.aceleracion) * Math.min(1, dt / PROMEDIO_DE_LA_ACELERACION);
  }
  m.velocidad = velocidad;
}

/**
 * **Dónde dejan las palancas los gases en este paso**, de 0 a 1.
 *
 * `objetivo` es la indicada que se sostiene, m/s, en el modo `SPD`; en los
 * otros dos no se mira: el empuje es fijo y la velocidad la lleva el morro.
 * Con `yaMedida`, la aceleración de la memoria ya es la de este paso —la
 * midió el piloto automático— y no se vuelve a medir.
 */
export function gasDeLosAutomaticos(
  e: EstadoDeGases,
  modo: ModoDeGases,
  objetivo: number,
  dt: number,
  m: MemoriaDeGases,
  yaMedida = false,
): number {
  if (!yaMedida) medirLaAceleracion(m, e.velocidad, dt);
  const paso = RITMO_DEL_SERVO * dt;
  const hacia = (meta: number): number =>
    e.gas + acotar(acotar(meta, 0, 1) - e.gas, -paso, paso);
  if (modo === "IDLE") return hacia(0);
  const porUnidad =
    e.empujeAFondo !== undefined && e.masa !== undefined
      ? Math.max(0.05, e.empujeAFondo / Math.max(1, e.masa))
      : ACELERA_SIN_SABER;
  if (modo === "THR") {
    if (e.vertical === undefined || e.verdadera === undefined || e.subidaPedida === undefined)
      return hacia(GAS_DE_SUBIDA);
    /*
     * **El empuje sube; el morro reparte.** Lo que se mide es la energía que
     * gana el avión por segundo —lo que sube más lo que acelera, en metros de
     * subida—, que responde al empuje al momento, mientras el morro la reparte
     * entre subir y acelerar. Así los dos lazos no se pisan: es la cuenta de
     * los automáticos de energía total de los aviones de línea. Y nunca más
     * que el empuje de subida.
     */
    const v = Math.max(1, e.verdadera);
    const gana = e.vertical + (v * m.aceleracion) / GRAVEDAD;
    const falta = e.subidaPedida - gana;
    const mover = (falta * GRAVEDAD) / (porUnidad * v * PARA_EL_EMPUJE);
    return acotar(e.gas + acotar(mover * dt, -paso, paso), 0, GAS_DE_SUBIDA);
  }
  if (e.equilibrio !== undefined) return hacia(e.equilibrio);
  const quiere = acotar(
    (objetivo - e.velocidad) / PARA_LA_VELOCIDAD,
    -ACELERACION_MAXIMA,
    ACELERACION_MAXIMA,
  );
  /*
   * Cuánto acelera cada unidad de palanca aquí: el empuje lleno entre la
   * masa —arriba la mitad que abajo—, con un suelo, porque sin motor que
   * responda no hay cuenta que valga y la palanca no debe salir disparada.
   */
  const mover = (quiere - m.aceleracion) / (porUnidad * PARA_EL_EMPUJE);
  return acotar(e.gas + acotar(mover * dt, -paso, paso), 0, 1);
}
