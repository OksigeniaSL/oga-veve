/**
 * Qué tecla hace qué, y cómo cambiarlo.
 *
 * Nació de una queja concreta y muy justa: las flechas, el más y el menos
 * están todos en la mitad derecha del teclado, así que hay que volar con las
 * dos manos en el mismo sitio. Para alguien zurdo es peor, pero tampoco
 * funciona para nadie más — en una cabina de verdad una mano lleva el mando
 * y la otra el motor, cada una en su lado.
 *
 * Y trae de regalo algo que no se había resuelto: **una lista de teclas es la
 * única forma de descubrir que existen**. Quien lo probó llevaba semanas sin
 * saber que la B frenaba. Un mando que no se anuncia no existe, y esto es lo
 * que anuncia todos a la vez.
 *
 * Las teclas se guardan por **carácter cuando lo tienen y por tecla física
 * cuando no**, que es lo que hace que funcione igual en un teclado español
 * que en uno americano. Ver la nota en `input.ts`.
 */

import type { TranslationKey } from '../i18n';

export type Accion =
  | 'pitchUp'
  | 'pitchDown'
  | 'rollLeft'
  | 'rollRight'
  | 'yawLeft'
  | 'yawRight'
  | 'throttleUp'
  | 'throttleDown'
  | 'brakes'
  | 'flaps'
  | 'camera'
  | 'assist'
  | 'reset'
  | 'aircraft'
  | 'mission'
  | 'sound'
  | 'language'
  | 'credits'
  | 'keys'
  | 'engine';

interface Definicion {
  /** Clave de traducción del nombre de la acción. */
  readonly label: TranslationKey;
  /** Teclas de fábrica. Varias por acción a propósito: ver abajo. */
  readonly defecto: readonly string[];
  /** Se mantiene pulsada (mandos) o se pulsa y suelta (conmutadores). */
  readonly held: boolean;
}

/**
 * Las teclas de fábrica.
 *
 * Cada mando tiene **dos juegos completos, uno a cada lado del teclado**, y
 * eso es deliberado: quien lleva el mando con la derecha usa las flechas y
 * quiere el motor a la izquierda; quien lo lleva con la izquierda usa W A S D
 * y quiere el motor a la derecha. Antes solo existía el segundo caso a
 * medias, y el motor no tenía ninguna tecla en el lado izquierdo.
 */
export const ACCIONES: Readonly<Record<Accion, Definicion>> = {
  // Orden: primero la de la derecha, después la de la izquierda. Ese orden
  // es lo que hace que `PAREJAS` pueda quedarse con la posición y acertar.
  pitchUp: { label: 'tecla.pitchUp', defecto: ['ArrowUp', 'KeyW'], held: true },
  pitchDown: { label: 'tecla.pitchDown', defecto: ['ArrowDown', 'KeyS'], held: true },
  rollLeft: { label: 'tecla.rollLeft', defecto: ['ArrowLeft', 'KeyA'], held: true },
  rollRight: { label: 'tecla.rollRight', defecto: ['ArrowRight', 'KeyD'], held: true },
  yawLeft: { label: 'tecla.yawLeft', defecto: ['KeyQ'], held: true },
  yawRight: { label: 'tecla.yawRight', defecto: ['KeyE'], held: true },
  // El motor, a los dos lados: «+/−» a la derecha y «X/Z» a la izquierda,
  // junto a W A S D. Mayúsculas y Control siguen por costumbre de otros
  // simuladores, y el carácter suelto porque `event.code` nombra la tecla
  // americana y en un teclado español el «−» ni siquiera se llamaba así.
  throttleUp: {
    label: 'tecla.throttleUp',
    // El orden importa: quien enseña el mando —el tutor, el teclado
    // dibujado— coge las primeras, así que delante van las dos que se
    // quieren enseñar, y son las de manos distintas. Detrás, las que están
    // por compatibilidad y no hacen falta anunciar.
    // **Sin mayúsculas.** Estaban «por costumbre de otros simuladores» y la
    // costumbre sale cara aquí: Shift es la tecla con la que se hace una
    // selección al capturar la pantalla, así que al ir a sacar una foto del
    // juego el avión se aceleraba y se escapaba justo lo que se quería
    // fotografiar. Un mando de más que estorba vale menos que no tenerlo.
    defecto: ['+', 'KeyX', 'Equal', 'NumpadAdd'],
    held: true,
  },
  throttleDown: {
    label: 'tecla.throttleDown',
    // Y sin Control, por lo mismo: es media docena de atajos del navegador.
    defecto: ['-', 'KeyZ', 'Minus', 'NumpadSubtract'],
    held: true,
  },
  brakes: { label: 'tecla.brakes', defecto: ['KeyB', 'Space'], held: true },
  flaps: { label: 'tecla.flaps', defecto: ['KeyF'], held: false },
  camera: { label: 'tecla.camera', defecto: ['KeyC'], held: false },
  assist: { label: 'tecla.assist', defecto: ['KeyM'], held: false },
  reset: { label: 'tecla.reset', defecto: ['KeyR'], held: false },
  aircraft: { label: 'tecla.aircraft', defecto: ['KeyP'], held: false },
  mission: { label: 'tecla.mission', defecto: ['KeyN'], held: false },
  sound: { label: 'tecla.sound', defecto: ['KeyV'], held: false },
  language: { label: 'tecla.language', defecto: ['KeyL'], held: false },
  credits: { label: 'tecla.credits', defecto: ['F1'], held: false },
  keys: { label: 'tecla.keys', defecto: ['KeyK'], held: false },
  engine: { label: 'tecla.engine', defecto: ['KeyI'], held: false },
};

export const ORDEN: readonly Accion[] = Object.keys(ACCIONES) as Accion[];

/**
 * Mandos que van en pareja y **tienen que enseñarse con la misma mano**.
 *
 * El tutor recordaba qué tecla usaste para cada acción por separado, y si
 * subías el motor con la X y lo bajabas con el menos te devolvía una de cada
 * lado del teclado. Fiel a lo que hiciste y completamente incoherente de
 * leer: parecía que cada mando vivía en un sitio distinto.
 *
 * Se recuerda **el lado**, no la tecla. Como las listas de fábrica están
 * ordenadas por lado —primero la de la derecha, después la de la izquierda—,
 * basta con quedarse con la posición y usar esa misma en la pareja.
 */
export const PAREJAS: readonly (readonly Accion[])[] = [
  ['throttleUp', 'throttleDown'],
  ['pitchUp', 'pitchDown'],
  ['rollLeft', 'rollRight'],
  ['yawLeft', 'yawRight'],
];

/** La pareja a la que pertenece una acción, o solo ella misma. */
export function parejaDe(accion: Accion): readonly Accion[] {
  return PAREJAS.find((p) => p.includes(accion)) ?? [accion];
}

const ALMACEN = 'oga-veve:teclas';
const ALMACEN_MANO = 'oga-veve:mano';

/**
 * Con qué mano se lleva el motor.
 *
 * Cada mando tiene teclas a los dos lados del teclado para que cada mano
 * tenga la suya. Pero **enseñar las dos confunde**: quien lo probó preguntó
 * «¿en qué quedamos, es la Z o el más?», y con cuatro años «hay dos teclas
 * que hacen lo mismo» es peor que «hay una».
 *
 * Así que se elige el lado **una vez**, y a partir de ahí el juego enseña una
 * sola tecla por mando: en el tutor, en el teclado dibujado y en la lista.
 * Las del otro lado siguen funcionando en silencio — no se rompe nada para
 * quien ya las tenía en los dedos—, pero no se anuncian.
 *
 * La posición en la lista de teclas ES el lado: 0 la derecha, 1 la izquierda.
 */
export type Mano = 'derecha' | 'izquierda';

/** Las teclas efectivas: las de fábrica con los cambios de quien juega encima. */
export class Keymap {
  private readonly cambios = new Map<Accion, string[]>();

  private manoActual: Mano = 'derecha';

  constructor() {
    this.load();
  }

  get mano(): Mano {
    return this.manoActual;
  }

  setMano(mano: Mano): void {
    this.manoActual = mano;
    try {
      localStorage.setItem(ALMACEN_MANO, mano);
    } catch {
      // Vale para esta partida.
    }
  }

  /**
   * La tecla que se enseña para este mando: la del lado elegido, y si no
   * tiene, la primera. Una sola, siempre la misma.
   */
  shownKey(accion: Accion): string {
    const teclas = this.keys(accion);
    const i = this.manoActual === 'izquierda' ? 1 : 0;
    return teclas[Math.min(i, teclas.length - 1)] ?? '';
  }

  /** ¿Es esta tecla la que se enseña para su mando? */
  isShown(key: string): boolean {
    const accion = this.actionFor(key);
    return accion !== null && mismaTecla(this.shownKey(accion), key);
  }

  /**
   * Las teclas que se anuncian de un mando: **la de cada mano**.
   *
   * `shownKey` da una sola, la del lado elegido, y para la tarjeta del tutor
   * está bien —ahí se enseña un gesto y hay que enseñar uno—. Pero el teclado
   * dibujado se compara con el teclado de verdad, y ahí esconder la mitad de
   * los mandos es mentir: la Z y la X mueven el gas desde siempre y en el
   * dibujo salían apagadas como cualquier letra sin función.
   *
   * Son las dos primeras porque el orden de `defecto` es exactamente ese —
   * primero la de la derecha, después la de la izquierda—, y detrás van las
   * que están por compatibilidad y no hace falta anunciar.
   */
  announcedKeys(accion: Accion): readonly string[] {
    return this.keys(accion).slice(0, 2);
  }

  /** ¿Se anuncia esta tecla en el teclado dibujado? */
  isAnnounced(key: string): boolean {
    const accion = this.actionFor(key);
    if (accion === null) return false;
    return this.announcedKeys(accion).some((k) => mismaTecla(k, key));
  }

  keys(accion: Accion): readonly string[] {
    return this.cambios.get(accion) ?? ACCIONES[accion].defecto;
  }

  /** Qué acción dispara esta tecla, o `null`. La primera que coincida. */
  actionFor(key: string): Accion | null {
    for (const accion of ORDEN) {
      if (this.keys(accion).includes(key)) return accion;
    }
    return null;
  }

  /**
   * Asigna una tecla a una acción, **quitándosela a quien la tuviera**.
   *
   * Sin eso se puede dejar el teclado en un estado en que dos cosas pasan a
   * la vez y no hay forma de deshacerlo sin borrar el navegador.
   */
  assign(accion: Accion, key: string): void {
    for (const otra of ORDEN) {
      if (otra === accion) continue;
      const actuales = this.keys(otra);
      if (actuales.includes(key)) {
        this.cambios.set(otra, actuales.filter((k) => k !== key));
      }
    }
    this.cambios.set(accion, [key]);
    this.save();
  }

  /** Devuelve una acción a sus teclas de fábrica. */
  restore(accion: Accion): void {
    this.cambios.delete(accion);
    this.save();
  }

  /** Devuelve el teclado entero a como venía. */
  restoreAll(): void {
    this.cambios.clear();
    this.save();
  }

  get customised(): boolean {
    return this.cambios.size > 0;
  }

  private load(): void {
    try {
      const mano = localStorage.getItem(ALMACEN_MANO);
      if (mano === 'izquierda' || mano === 'derecha') this.manoActual = mano;
    } catch {
      // Sin almacenamiento, mano derecha.
    }
    try {
      const crudo = localStorage.getItem(ALMACEN);
      if (!crudo) return;
      const datos = JSON.parse(crudo) as Record<string, string[]>;
      for (const accion of ORDEN) {
        const teclas = datos[accion];
        // Se comprueba la forma antes de creérsela: esto sale de un sitio
        // que cualquiera puede editar a mano, y un teclado corrupto deja el
        // juego injugable sin forma obvia de arreglarlo.
        if (Array.isArray(teclas) && teclas.every((k) => typeof k === 'string')) {
          this.cambios.set(accion, teclas);
        }
      }
    } catch {
      // Sin almacenamiento —modo privado, permisos— se juega con las de
      // fábrica y no se dice nada. No es un error que le importe a nadie.
    }
  }

  private save(): void {
    try {
      localStorage.setItem(ALMACEN, JSON.stringify(Object.fromEntries(this.cambios)));
    } catch {
      // Igual: si no se puede guardar, los cambios valen para esta partida.
    }
  }
}

/**
 * ¿Son la misma tecla del teclado?
 *
 * El más y el menos se nombran de varias formas —por carácter, por tecla
 * física americana, por teclado numérico— y todas son el mismo dedo en el
 * mismo sitio. Sin esto, el teclado dibujado no encendía el menos: él lo
 * llama `Minus` y el ajuste guardaba «-».
 */
export function mismaTecla(a: string, b: string): boolean {
  return canonica(a) === canonica(b);
}

function canonica(key: string): string {
  if (key === '-' || key === 'Minus' || key === 'NumpadSubtract') return 'menos';
  if (key === '+' || key === 'Equal' || key === 'NumpadAdd') return 'mas';
  return key;
}

/**
 * Cómo se escribe una tecla para que se lea.
 *
 * `ArrowUp` no le dice nada a nadie y `KeyW` menos. Lo que hay que enseñar es
 * lo que está pintado en la tecla.
 */
export function nombreDeTecla(key: string): string {
  const especiales: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Space: '␣',
    ShiftLeft: '⇧',
    ShiftRight: '⇧',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl',
    Equal: '=',
    Minus: '−',
    NumpadAdd: '+',
    NumpadSubtract: '−',
  };
  if (especiales[key]) return especiales[key]!;
  if (key.startsWith('Key')) return key.slice(3);
  if (key.startsWith('Digit')) return key.slice(5);
  return key;
}
