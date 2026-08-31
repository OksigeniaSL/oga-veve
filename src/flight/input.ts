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
const KEYS = {
  pitchUp: ['ArrowUp', 'KeyW'],
  pitchDown: ['ArrowDown', 'KeyS'],
  rollRight: ['ArrowRight', 'KeyD'],
  rollLeft: ['ArrowLeft', 'KeyA'],
  yawRight: ['KeyE'],
  yawLeft: ['KeyQ'],
  // Más y menos como mandos principales del motor: **los símbolos dicen lo
  // que hacen**, así que no hay nada que aprender ni que recordar. Shift y
  // Control se mantienen porque quien viene de otros simuladores los busca,
  // pero dejan de ser los únicos: Control en un navegador es además
  // peligroso —Ctrl+W cierra la pestaña— y no puede ser la única forma de
  // bajar el gas.
  throttleUp: ['Equal', 'NumpadAdd', 'ShiftLeft', 'ShiftRight'],
  throttleDown: ['Minus', 'NumpadSubtract', 'ControlLeft', 'ControlRight'],
  // B de *brakes*, y también la barra espaciadora: es la tecla que la mano
  // encuentra sola y la que todo el mundo prueba primero cuando algo no
  // para. Tener frenos y que nadie los encuentre es lo mismo que no
  // tenerlos.
  brakes: ['KeyB', 'Space'],
} as const;

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
  private touchBrakes = false;
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
      gamepad?.pitch ?? this.touchPitch + axisFromKeys(this.keys, KEYS.pitchUp, KEYS.pitchDown);
    const rollTarget =
      gamepad?.roll ?? this.touchRoll + axisFromKeys(this.keys, KEYS.rollRight, KEYS.rollLeft);
    const rudderTarget =
      gamepad?.rudder ?? this.touchRudder + axisFromKeys(this.keys, KEYS.yawRight, KEYS.yawLeft);

    this.controls.elevator = approach(this.controls.elevator, clamp(pitchTarget, -1, 1), dt);
    this.controls.aileron = approach(this.controls.aileron, clamp(rollTarget, -1, 1), dt);
    this.controls.rudder = approach(this.controls.rudder, clamp(rudderTarget, -1, 1), dt);

    if (this.touchThrottle !== null) {
      this.controls.throttle = this.touchThrottle;
    } else if (gamepad?.throttle !== undefined) {
      this.controls.throttle = gamepad.throttle;
    } else {
      const delta = axisFromKeys(this.keys, KEYS.throttleUp, KEYS.throttleDown);
      this.controls.throttle = clamp(this.controls.throttle + delta * dt * 0.6, 0, 1);
    }

    // Tocar el acelerador con el teclado le devuelve el mando: en un portátil
    // con pantalla táctil se puede usar uno u otro sin quedarse encerrado en
    // el que se tocó primero.
    if (this.touchThrottle !== null && axisFromKeys(this.keys, KEYS.throttleUp, KEYS.throttleDown) !== 0) {
      this.touchThrottle = null;
    }

    const braking =
      this.touchBrakes || KEYS.brakes.some((k) => this.keys.has(k)) || (gamepad?.brakes ?? false);
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

    switch (event.code) {
      case 'KeyC':
        this.actions.toggleCamera();
        break;
      case 'KeyM':
        this.actions.toggleAssist();
        break;
      case 'KeyR':
        this.actions.resetFlight();
        break;
      case 'KeyL':
        this.actions.cycleLanguage();
        break;
      case 'KeyV':
        this.actions.toggleSound();
        break;
      case 'KeyP':
        this.actions.cycleAircraft();
        break;
      case 'KeyN':
        this.actions.cycleMission();
        break;
      case 'F1':
        event.preventDefault();
        this.actions.toggleCredits();
        break;
      case 'KeyF':
        this.controls.flaps = this.controls.flaps > 0.5 ? 0 : 1;
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
  };

  /** Al perder el foco se sueltan todas las teclas: si no, se quedan pegadas. */
  private onBlur = (): void => {
    this.keys.clear();
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
