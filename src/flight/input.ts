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

export interface InputActions {
  toggleCamera: () => void;
  toggleAssist: () => void;
  resetFlight: () => void;
  toggleCredits: () => void;
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

    const pitchTarget = gamepad?.pitch ?? this.touchPitch + this.keyAxis('ArrowDown', 'ArrowUp', 'KeyS', 'KeyW');
    const rollTarget = gamepad?.roll ?? this.touchRoll + this.keyAxis('ArrowRight', 'ArrowLeft', 'KeyD', 'KeyA');
    const rudderTarget = gamepad?.rudder ?? this.touchRudder + this.keyAxis('KeyE', 'KeyQ');

    this.controls.elevator = approach(this.controls.elevator, clamp(pitchTarget, -1, 1), dt);
    this.controls.aileron = approach(this.controls.aileron, clamp(rollTarget, -1, 1), dt);
    this.controls.rudder = approach(this.controls.rudder, clamp(rudderTarget, -1, 1), dt);

    if (this.touchThrottle !== null) {
      this.controls.throttle = this.touchThrottle;
    } else if (gamepad?.throttle !== undefined) {
      this.controls.throttle = gamepad.throttle;
    } else {
      const delta = (this.held('ShiftLeft', 'ShiftRight') ? 1 : 0) - (this.held('ControlLeft', 'ControlRight') ? 1 : 0);
      this.controls.throttle = clamp(this.controls.throttle + delta * dt * 0.6, 0, 1);
    }

    const braking = this.touchBrakes || this.held('KeyB') || (gamepad?.brakes ?? false);
    this.controls.brakes = approach(this.controls.brakes, braking ? 1 : 0, dt * 2);
    this.controls.flaps = this.held('KeyF') ? 1 : this.controls.flaps;
  }

  // ── Teclado ───────────────────────────────────────────────────────────

  private onKeyDown = (event: KeyboardEvent): void => {
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
      case 'F1':
        event.preventDefault();
        this.actions.toggleCredits();
        break;
      case 'KeyF':
        this.controls.flaps = this.controls.flaps > 0.5 ? 0 : 1;
        break;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  /** Al perder el foco se sueltan todas las teclas: si no, se quedan pegadas. */
  private onBlur = (): void => {
    this.keys.clear();
  };

  private held(...codes: string[]): boolean {
    return codes.some((code) => this.keys.has(code));
  }

  private keyAxis(positive: string, negative: string, positiveAlt?: string, negativeAlt?: string): number {
    const pos = this.held(positive, ...(positiveAlt ? [positiveAlt] : [])) ? 1 : 0;
    const neg = this.held(negative, ...(negativeAlt ? [negativeAlt] : [])) ? 1 : 0;
    return pos - neg;
  }

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

    if (stick) {
      bindPad(stick, (x, y) => {
        this.touchRoll = x;
        this.touchPitch = -y;
      });
    }
    if (rudder) bindPad(rudder, (x) => { this.touchRudder = x; });
    if (throttle) {
      bindPad(throttle, (_x, y) => {
        this.touchThrottle = clamp((1 - y) / 2, 0, 1);
      });
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
function bindPad(element: HTMLElement, onMove: (x: number, y: number) => void): void {
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
