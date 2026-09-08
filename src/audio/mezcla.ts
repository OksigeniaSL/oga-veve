/**
 * La mezcla: seis buses, una prioridad y un limitador.
 *
 * «Con motor, lluvia, viento y una voz de cabina a la vez, sin mezcla se oye
 * todo y no se entiende nada.» Hasta hoy las veinte fuentes del juego iban
 * todas al mismo sitio con su volumen a mano, y la única defensa era un
 * compresor al final — que no distingue lo que hay que entender de lo que hay
 * que sentir.
 *
 * ## La prioridad no es una preferencia de gusto
 *
 * **Voz, bocina, interfaz, motor, ambiente, música.** En ese orden y con la
 * música dieciocho decibelios por debajo de todo. Es el orden de lo que pasa
 * si te lo pierdes: perderse la voz es perderse la lección; perderse el motor
 * es perderse una sensación. Un simulador de cabina real ordena igual, y por
 * lo mismo.
 *
 * ## El ducking, y por qué existe
 *
 * Cuando habla la voz o suena un aviso, **todo lo demás baja diez decibelios**
 * en cincuenta milisegundos y vuelve en cuatro décimas. Cincuenta es lo que
 * tarda en no oírse el escalón; cuatro décimas es lo que tarda en no oírse la
 * vuelta.
 *
 * Esto es la otra mitad de la regla de oro del proyecto. Cada aviso hablado
 * tiene su gemelo en pantalla **para quien juega sin sonido**; el ducking es
 * lo que garantiza que se entienda **para quien juega con él**. Media aula
 * tiene el volumen apagado y la otra media no, y las dos tienen que enterarse.
 *
 * ## Lo que hay aquí y lo que hay en `audio.ts`
 *
 * Aquí, la aritmética: qué gana cada bus, cuánto baja al agacharse y cuándo se
 * levanta. Es lo único de la mezcla que se puede comprobar sin un navegador
 * con tarjeta de sonido. En `audio.ts`, los nodos.
 */

/** Los seis buses, en orden de prioridad: el primero manda. */
export const BUSES = [
  "voz",
  "avisos",
  "interfaz",
  "motor",
  "ambiente",
  "musica",
] as const;

export type Bus = (typeof BUSES)[number];

/**
 * Cuánto suena cada bus, en decibelios respecto al maestro.
 *
 * La voz a cero —manda ella— y a partir de ahí se va bajando. La música a
 * dieciocho por debajo de todo, que es donde una canción acompaña sin
 * competir: si se nota que hay música, ya está demasiado alta.
 */
export const NIVEL: Record<Bus, number> = {
  voz: 0,
  avisos: -1.5,
  interfaz: -5,
  motor: -6.5,
  ambiente: -8,
  musica: -18,
};

/** Cuánto se agacha lo demás cuando hay voz o aviso, en decibelios. */
export const AGACHADO_DB = -10;

/** Lo que tarda en agacharse y lo que tarda en levantarse, en segundos. */
export const TARDA_EN_BAJAR = 0.05;
export const TARDA_EN_SUBIR = 0.4;

/** Los buses que **no** se agachan: los que mandan agacharse a los demás. */
export const MANDAN: readonly Bus[] = ["voz", "avisos"];

/** De decibelios a ganancia lineal, que es lo que entiende un `GainNode`. */
export const ganancia = (db: number): number => Math.pow(10, db / 20);

/**
 * A cuánto tiene que estar cada bus ahora mismo.
 *
 * Es toda la mezcla en una función pura: el nivel del bus, y diez decibelios
 * menos si hay alguien hablando y este no es de los que hablan.
 */
export function nivelesAhora(agachado: boolean): Record<Bus, number> {
  const salida = {} as Record<Bus, number>;
  for (const bus of BUSES) {
    const baja = agachado && !MANDAN.includes(bus);
    salida[bus] = ganancia(NIVEL[bus] + (baja ? AGACHADO_DB : 0));
  }
  return salida;
}

/**
 * Cuánta gente está hablando a la vez.
 *
 * Es un contador y no un interruptor por una razón concreta: el instructor y
 * el otro avión de la radio pueden solaparse, y con un interruptor el primero
 * que termina levanta la mezcla mientras el otro sigue hablando. Con la cuenta,
 * se levanta cuando se calla el último.
 *
 * Y no baja de cero. Una voz que avisa dos veces de que ha terminado —pasa: el
 * navegador dispara `end` y `error` sobre la misma frase— dejaría el contador
 * en negativo y la mezcla agachada para siempre.
 */
export class Agachado {
  private cuantos = 0;

  get activo(): boolean {
    return this.cuantos > 0;
  }

  /** Empieza a hablar alguien. Devuelve si la mezcla acaba de agacharse. */
  entra(): boolean {
    this.cuantos++;
    return this.cuantos === 1;
  }

  /** Termina alguien. Devuelve si la mezcla acaba de levantarse. */
  sale(): boolean {
    if (this.cuantos === 0) return false;
    this.cuantos--;
    return this.cuantos === 0;
  }

  /** Todos callados de golpe: al reiniciar el vuelo o al poner en mudo. */
  vaciar(): boolean {
    const habia = this.cuantos > 0;
    this.cuantos = 0;
    return habia;
  }
}
