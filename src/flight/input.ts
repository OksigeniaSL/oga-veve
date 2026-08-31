/**
 * Entrada del jugador: teclado, mando y táctil, unificados.
 *
 * Los tres caminos escriben sobre el mismo `ControlInputs`. El teclado no da
 * valores continuos, así que sus ejes se suavizan hacia el objetivo: sin eso
 * el avión pega tirones y se siente barato.
 *
 * El táctil no es un añadido: media de las partidas van a ser en la tablet
 * de alguien. Ver AGENTS.md, regla del test Ña Emy.
 */

import { neutralControls, type ControlInputs } from './model';
import { Keymap, type Accion } from './keymap';

/** Velocidad a la que un eje de teclado alcanza el tope, por segundo. */
const KEY_RAMP = 2.6;
/** Velocidad a la que un eje suelto vuelve al centro, por segundo. */
const KEY_CENTRE = 3.4;
/** Zona muerta de los sticks del mando. */
const DEADZONE = 0.12;

/**
 * Teclas por eje, declaradas por intención y no por posición.
 *
 * Están así porque la versión anterior pasaba las teclas como argumentos
 * posicionales de una función `keyAxis(positive, negative, ...)` y se
 * colaron invertidas: la flecha arriba bajaba el morro y el avión se
 * clavaba contra la pista. El táctil y el mando estaban bien, así que solo
 * fallaba el teclado y no se veía en ninguna prueba.
 *
 * Flecha arriba sube. En un simulador de verdad la palanca se empuja hacia
 * delante para bajar, pero quien tiene cinco años espera que arriba sea
 * arriba, y ese es el público. Un ajuste para invertirlo puede venir después.
 */

/**
 * Valor de un eje a partir de las teclas pulsadas: +1, 0 o -1.
 *
 * Función pura y exportada para poder probarla sin navegador, que es lo que
 * faltaba cuando se invirtió el cabeceo.
 */
export function axisFromKeys(
  held: ReadonlySet<string>,
  positive: readonly string[],
  negative: readonly string[],
): number {
  const up = positive.some((code) => held.has(code)) ? 1 : 0;
  const down = negative.some((code) => held.has(code)) ? 1 : 0;
  return up - down;
}

export interface InputActions {
  toggleCamera: () => void;
  toggleAssist: () => void;
  resetFlight: () => void;
  toggleKeys: () => void;
  toggleCredits: () => void;
  cycleAircraft: () => void;
  cycleMission: () => void;
  cycleLanguage: () => void;
  toggleSound: () => void;
  /** Se llama en el primer gesto: los navegadores no dejan sonar antes. */
  firstGesture: () => void;
}

export class InputManager {
  readonly controls: ControlInputs = { ...neutralControls(), throttle: 0 };

  private readonly keys = new Set<string>();
  private readonly actions: InputActions;
  /** Ejes del stick táctil, -1 a 1. */
  private touchPitch = 0;
  private touchRoll = 0;
  private touchRudder = 0;
  private touchThrottle: number | null = null;
  /** Qué carácter dio cada tecla física al pulsarla. Ver `onKeyUp`. */
  private readonly chars = new Map<string, string>();

  /** Qué tecla hace qué. Se puede cambiar desde la pantalla de teclas. */
  readonly keymap = new Keymap();


  private touchBrakes = false;

  /** Dirección pedida por los botones de motor de la pantalla. */
  private buttonThrottle = 0;

  /**
   * Freno desde un botón de la interfaz, no del teclado ni del mando.
   *
   * Existe porque el freno del primer peldaño es un botón rojo grande y no
   * una tecla: a los cuatro años, y en una tablet, un rótulo que pone
   * «espacio» no sirve de nada.
   */
  setTouchBrakes(pressed: boolean): void {
    this.touchBrakes = pressed;
  }

  /**
   * Motor desde los botones de la pantalla: -1 baja, +1 sube, 0 suelta.
   *
   * No fija un valor: empuja en una dirección, exactamente igual que las
   * teclas. Así el botón y la tecla hacen lo mismo y no se pelean.
   */
  /**
   * Suelta todos los mandos pegajosos y pone el motor a cero.
   *
   * Se llama al reiniciar el vuelo. Antes se ponía a cero `controls.throttle`
   * y nada más, así que si la palanca táctil estaba agarrada volvía a imponer
   * su valor en el fotograma siguiente y el avión reaparecía en la pista con
   * el motor a tope y sin forma de bajarlo.
   */
  /**
   * Qué tecla enseñar cuando hay que enseñar un mando.
   *
   * **La última que usó esta persona**, y si todavía no ha usado ninguna, la
   * primera de fábrica. Cada mando tiene teclas a los dos lados del teclado
   * para que cada mano tenga la suya, y enseñar las dos a la vez sale mal:
   * puestas una al lado de otra se leen como una pareja —«esta sube y esta
   * baja»— cuando en realidad son dos maneras de hacer lo mismo. A los
   * cuatro años eso no se aclara con una «o» pequeñita.
   *
   * Así que se enseña una, y se enseña la suya. Quien vuela con la
   * izquierda ve la X; quien vuela con la derecha ve el más.
   */
  preferredKey(accion: Accion): string {
    return this.keymap.shownKey(accion);
  }

  /** Eje a partir de dos acciones: +1, 0 o -1. */
  private axis(mas: Accion, menos: Accion): number {
    return axisFromKeys(this.keys, this.keymap.keys(mas), this.keymap.keys(menos));
  }

  /** ¿Está pulsada alguna tecla de esta acción? */
  private held(accion: Accion): boolean {
    return this.keymap.keys(accion).some((k) => this.keys.has(k));
  }

  releaseAll(): void {
    this.touchThrottle = null;
    this.buttonThrottle = 0;
    this.touchBrakes = false;
    this.controls.throttle = 0;
  }

  setButtonThrottle(direction: number): void {
    this.buttonThrottle = direction;
    if (direction !== 0) this.touchThrottle = null;
  }
  /** Solo se avisa del primer gesto una vez. */
  private gestured = false;

  constructor(target: HTMLElement, actions: InputActions) {
    this.actions = actions;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.bindTouch(target);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  update(dt: number): void {
    const gamepad = this.readGamepad();

    const pitchTarget =
      gamepad?.pitch ?? this.touchPitch + this.axis('pitchUp', 'pitchDown');
    const rollTarget =
      gamepad?.roll ?? this.touchRoll + this.axis('rollRight', 'rollLeft');
    const rudderTarget =
      gamepad?.rudder ?? this.touchRudder + this.axis('yawRight', 'yawLeft');

    this.controls.elevator = approach(this.controls.elevator, clamp(pitchTarget, -1, 1), dt);
    this.controls.aileron = approach(this.controls.aileron, clamp(rollTarget, -1, 1), dt);
    this.controls.rudder = approach(this.controls.rudder, clamp(rudderTarget, -1, 1), dt);

    // Tocar el motor con el teclado o con los botones **suelta la palanca
    // táctil antes de leer nada**, no después. Yendo después, la palanca
    // seguía mandando ese fotograma; y si se quedaba agarrada —por ejemplo
    // porque un botón encima de ella se llevó el `pointerdown` y no el
    // `pointerup`—, el teclado quedaba anulado del todo y el motor clavado
    // donde estuviera. Con el gas a tope eso es un avión que no se para.
    const teclado = this.axis('throttleUp', 'throttleDown');
    if (releasesTouchThrottle(teclado, this.buttonThrottle)) this.touchThrottle = null;

    if (this.touchThrottle !== null) {
      this.controls.throttle = this.touchThrottle;
    } else if (gamepad?.throttle !== undefined) {
      this.controls.throttle = gamepad.throttle;
    } else {
      const delta = clamp(teclado + this.buttonThrottle, -1, 1);
      this.controls.throttle = clamp(this.controls.throttle + delta * dt * 0.6, 0, 1);
    }

    const braking =
      this.touchBrakes || this.held('brakes') || (gamepad?.brakes ?? false);
    this.controls.brakes = approach(this.controls.brakes, braking ? 1 : 0, dt * 2);
    // Los flaps no se leen aquí: son un conmutador, y lo lleva `onKeyDown`.
    // Forzarlos también desde el bucle impedía apagarlos sin soltar la tecla.
  }

  // ── Teclado ───────────────────────────────────────────────────────────

  private onKeyDown = (event: KeyboardEvent): void => {
    this.noteGesture();
    // Las flechas hacen scroll de la página si no se les para los pies.
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    this.keys.add(event.code);
    // El carácter también: ver la nota de KEYS sobre los teclados que no son
    // el americano.
    if (event.key.length === 1) {
      this.keys.add(event.key);
      // Se apunta qué carácter dio esta tecla física, porque al soltarla
      // puede dar otro: si se suelta Mayúsculas antes que el «+», el
      // `keyup` llega con «=» y el «+» se quedaría pegado para siempre —con
      // el motor subiendo solo, que es de los peores fallos posibles.
      this.chars.set(event.code, event.key);
    }

    // Las acciones puntuales salen del mapa de teclas, no de una lista de
    // códigos escrita a mano: así se pueden cambiar todas, y así la pantalla
    // de teclas dice la verdad sobre lo que hace cada una.
    const accion = this.keymap.actionFor(event.code) ?? this.keymap.actionFor(event.key);
    switch (accion) {
      case 'camera':
        this.actions.toggleCamera();
        break;
      case 'assist':
        this.actions.toggleAssist();
        break;
      case 'reset':
        this.actions.resetFlight();
        break;
      case 'language':
        this.actions.cycleLanguage();
        break;
      case 'sound':
        this.actions.toggleSound();
        break;
      case 'aircraft':
        this.actions.cycleAircraft();
        break;
      case 'mission':
        this.actions.cycleMission();
        break;
      case 'credits':
        event.preventDefault();
        this.actions.toggleCredits();
        break;
      case 'keys':
        this.actions.toggleKeys();
        break;
      case 'flaps':
        this.controls.flaps = this.controls.flaps > 0.5 ? 0 : 1;
        break;
      default:
        break;
    }
  };

  /**
   * Primer gesto del jugador.
   *
   * Los navegadores no dejan que suene nada hasta que alguien toca algo. En
   * vez de una pantalla de «activa el sonido», que es fea y que hay que leer,
   * se aprovecha el primer gesto que este juego recibe de todos modos: la
   * tecla del motor o el dedo en la palanca.
   */
  private noteGesture(): void {
    if (this.gestured) return;
    this.gestured = true;
    this.actions.firstGesture();
  }

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    if (event.key.length === 1) this.keys.delete(event.key);
    const anotado = this.chars.get(event.code);
    if (anotado !== undefined) {
      this.keys.delete(anotado);
      this.chars.delete(event.code);
    }
  };

  /** Al perder el foco se sueltan todas las teclas: si no, se quedan pegadas. */
  private onBlur = (): void => {
    this.keys.clear();
    this.chars.clear();
  };

  // ── Mando ─────────────────────────────────────────────────────────────

  private readGamepad(): { pitch: number; roll: number; rudder: number; throttle?: number; brakes: boolean } | null {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = Array.from(pads).find((p): p is Gamepad => p !== null && p.connected);
    if (!pad) return null;

    const axis = (index: number): number => applyDeadzone(pad.axes[index] ?? 0);
    // Gatillos como motor: derecho acelera, izquierdo frena. Es la
    // disposición que espera cualquiera que haya jugado a algo de coches.
    const rightTrigger = pad.buttons[7]?.value ?? 0;
    const leftTrigger = pad.buttons[6]?.value ?? 0;

    return {
      roll: axis(0),
      pitch: -axis(1),
      rudder: axis(2),
      throttle: rightTrigger > 0.02 ? rightTrigger : undefined,
      brakes: leftTrigger > 0.4 || (pad.buttons[0]?.pressed ?? false),
    };
  }

  // ── Táctil ────────────────────────────────────────────────────────────

  private bindTouch(target: HTMLElement): void {
    const stick = target.querySelector<HTMLElement>('[data-touch="stick"]');
    const throttle = target.querySelector<HTMLElement>('[data-touch="throttle"]');
    const rudder = target.querySelector<HTMLElement>('[data-touch="rudder"]');
    const brakes = target.querySelector<HTMLElement>('[data-touch="brakes"]');

    window.addEventListener('pointerdown', () => this.noteGesture(), { passive: true });

    if (stick) {
      bindPad(stick, (x, y) => {
        this.touchRoll = x;
        this.touchPitch = -y;
      });
    }
    if (rudder) bindPad(rudder, (x) => { this.touchRudder = x; });
    if (throttle) {
      // Con memoria: la palanca se queda donde la dejas al levantar el dedo,
      // como una palanca de gases de verdad. Antes compartía el
      // comportamiento de la palanca de mando, que vuelve al centro al
      // soltarla, y eso dejaba el motor clavado al 50 % cada vez que
      // levantabas el dedo. En una tablet era imposible aterrizar.
      bindPad(
        throttle,
        (_x, y) => {
          this.touchThrottle = clamp((1 - y) / 2, 0, 1);
        },
        { springLoaded: false },
      );
    }
    if (brakes) {
      brakes.addEventListener('pointerdown', () => { this.touchBrakes = true; });
      brakes.addEventListener('pointerup', () => { this.touchBrakes = false; });
      brakes.addEventListener('pointercancel', () => { this.touchBrakes = false; });
    }
  }
}

/**
 * ¿Sueltan el mando del motor la palanca táctil?
 *
 * Función aparte y probada porque **es la segunda vez** que la palanca
 * táctil se queda agarrada y deja el teclado sin efecto: la primera dejaba
 * el motor clavado al cincuenta por ciento, y la segunda al cien, con un
 * avión que no había forma de parar. La regla es simple y no admite matices:
 * **si alguien toca el teclado o los botones, mandan ellos.**
 */
export function releasesTouchThrottle(keyboard: number, button: number): boolean {
  return keyboard !== 0 || button !== 0;
}

/**
 * Convierte un elemento en un pad analógico. Devuelve coordenadas
 * normalizadas -1..1 respecto al centro del elemento, y las pone a cero al
 * levantar el dedo.
 */
function bindPad(
  element: HTMLElement,
  onMove: (x: number, y: number) => void,
  options: { springLoaded?: boolean } = {},
): void {
  const springLoaded = options.springLoaded ?? true;
  let pointerId: number | null = null;

  const emit = (event: PointerEvent): void => {
    const rect = element.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    onMove(clamp(x, -1, 1), clamp(y, -1, 1));
    element.style.setProperty('--x', String(clamp(x, -1, 1)));
    element.style.setProperty('--y', String(clamp(y, -1, 1)));
  };

  element.addEventListener('pointerdown', (event) => {
    pointerId = event.pointerId;
    element.setPointerCapture(event.pointerId);
    emit(event);
  });
  element.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointerId) emit(event);
  });
  const release = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    // Los mandos con muelle —palanca y timón— vuelven al centro al soltarlos.
    // El acelerador no: se queda donde estaba.
    if (!springLoaded) return;
    onMove(0, 0);
    element.style.setProperty('--x', '0');
    element.style.setProperty('--y', '0');
  };
  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);
}

function approach(current: number, target: number, dt: number): number {
  const rate = Math.abs(target) > Math.abs(current) ? KEY_RAMP : KEY_CENTRE;
  const delta = target - current;
  const step = rate * dt;
  return Math.abs(delta) <= step ? target : current + Math.sign(delta) * step;
}

function applyDeadzone(value: number): number {
  if (Math.abs(value) < DEADZONE) return 0;
  return Math.sign(value) * ((Math.abs(value) - DEADZONE) / (1 - DEADZONE));
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
