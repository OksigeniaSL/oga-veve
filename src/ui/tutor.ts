/**
 * Tutor de despegue: una sola cosa que hacer, en cada momento.
 *
 * Existe porque el primer adulto que probó el juego no supo despegar. Si no
 * lo saca alguien que sabe lo que es un acelerador, no lo va a sacar una
 * niña de cinco años, y el público empieza ahí.
 *
 * No es un tutorial con pantallas ni con texto que haya que leer: es un
 * cartel grande que mira el estado del avión y dibuja **la tecla que hay que
 * pulsar ahora**, con su forma y su nombre, para que se pueda comparar con
 * el teclado de verdad y encontrarla. La palabra de debajo es un extra para
 * quien ya lee, no el mensaje. Ver AGENTS.md, regla 2.
 *
 * La primera versión usaba glifos sueltos y el del acelerador (⇧) se leía
 * igual que la flecha de tirar (↑): dos pasos seguidos con la misma forma.
 * De ahí que ahora se dibuje la tecla entera, ancha o cuadrada, que es como
 * se distinguen en el teclado.
 *
 * En táctil las teclas no sirven de nada, así que se enseña el mando de la
 * pantalla y el gesto. La tablet es el aparato que más va a usarse.
 *
 * Se apaga solo en cuanto el avión está en el aire, y vuelve a aparecer si
 * se reinicia el vuelo.
 */

import type { FlightState } from '../flight/model';
import { t, type TranslationKey } from '../i18n';

/** Velocidad indicada a partir de la cual conviene rotar, en m/s. */
const ROTATION_SPEED = 30;

type Step = 'throttle' | 'speed' | 'pull' | 'flying' | 'slow' | 'done';

/** Distancia a la cabecera desde la que se avisa de bajar el motor, en metros. */
const APPROACH_DISTANCE = 2400;
/** Por encima de este gas no se puede bajar para aterrizar. */
const APPROACH_THROTTLE = 0.45;

interface StepView {
  /** Qué se dibuja: una tecla con su nombre, o un símbolo suelto. */
  cue: { kind: 'key'; label: string; wide?: boolean } | { kind: 'symbol'; glyph: string };
  /** Lo mismo, para quien juega con el dedo. */
  touchCue: { kind: 'key'; label: string; wide?: boolean } | { kind: 'symbol'; glyph: string };
  key: TranslationKey;
  /** Progreso de 0 a 1 para la barra, o null si no aplica. */
  progress: (state: FlightState, throttle: number) => number | null;
}

const STEPS: Record<Exclude<Step, 'done'>, StepView> = {
  throttle: {
    cue: { kind: 'key', label: '+' },
    touchCue: { kind: 'symbol', glyph: '⇡' },
    key: 'tutor.throttle',
    progress: (_state, throttle) => throttle,
  },
  speed: {
    cue: { kind: 'symbol', glyph: '⏱' },
    touchCue: { kind: 'symbol', glyph: '⏱' },
    key: 'tutor.speed',
    progress: (state) => Math.min(1, state.airspeed / ROTATION_SPEED),
  },
  pull: {
    cue: { kind: 'key', label: '↑' },
    touchCue: { kind: 'symbol', glyph: '⇡' },
    key: 'tutor.pull',
    progress: () => null,
  },
  flying: {
    cue: { kind: 'symbol', glyph: '✦' },
    touchCue: { kind: 'symbol', glyph: '✦' },
    key: 'tutor.flying',
    progress: () => null,
  },
  // Volver a la pista era el paso que faltaba: el tutor enseñaba a despegar
  // y se callaba justo cuando empieza lo difícil. Sin bajar el gas no hay
  // forma de perder velocidad para posarse, y eso no lo adivina nadie.
  slow: {
    cue: { kind: 'key', label: '−' },
    touchCue: { kind: 'symbol', glyph: '⇣' },
    key: 'tutor.slow',
    progress: (_state, throttle) => 1 - throttle,
  },
};

export class Tutor {
  private root: HTMLElement | null = null;
  private cue: HTMLElement | null = null;
  private label: HTMLElement | null = null;
  private bar: HTMLElement | null = null;
  private fill: HTMLElement | null = null;

  private step: Step = 'throttle';
  private celebrating = 0;
  /** Una vez se ha volado, el guion de despegue no vuelve a aparecer. */
  private hasFlown = false;

  /** Devuelve el marcado, para que el HUD lo inserte con el resto. */
  static markup(): string {
    return `
      <div class="tutor" data-hud="tutor" hidden>
        <div class="tutor__pista" data-hud="tutor-cue" aria-hidden="true"></div>
        <div class="tutor__texto" data-hud="tutor-text"></div>
        <div class="tutor__barra" data-hud="tutor-bar"><div data-hud="tutor-fill"></div></div>
      </div>
    `;
  }

  /** Se llama después de cada repintado del HUD. */
  bind(root: HTMLElement): void {
    this.root = root.querySelector('[data-hud="tutor"]');
    this.cue = root.querySelector('[data-hud="tutor-cue"]');
    this.label = root.querySelector('[data-hud="tutor-text"]');
    this.bar = root.querySelector('[data-hud="tutor-bar"]');
    this.fill = root.querySelector('[data-hud="tutor-fill"]');
  }

  /** Vuelve al principio: al reiniciar el vuelo hay que volver a explicar. */
  reset(): void {
    this.step = 'throttle';
    this.celebrating = 0;
    this.hasFlown = false;
  }

  /** @param distanceToRunway metros hasta la cabecera de pista */
  update(state: FlightState, throttle: number, dt: number, distanceToRunway: number): void {
    if (!this.root) return;

    this.step = this.nextStep(state, throttle, dt, distanceToRunway);

    if (this.step === 'done' || state.crashed) {
      this.root.hidden = true;
      return;
    }

    const view = STEPS[this.step];
    this.root.hidden = false;

    if (this.cue) this.cue.innerHTML = renderCue(isTouch() ? view.touchCue : view.cue);
    if (this.label) this.label.textContent = t(view.key);

    const progress = view.progress(state, throttle);
    if (this.bar) this.bar.hidden = progress === null;
    if (this.fill && progress !== null) {
      this.fill.style.width = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
    }
  }

  /**
   * Qué toca ahora. El orden no es un guion cerrado: se deduce del estado,
   * así que si alguien acelera, frena y vuelve a acelerar, el cartel le
   * sigue en vez de quedarse colgado en un paso.
   */
  private nextStep(
    state: FlightState,
    throttle: number,
    dt: number,
    distanceToRunway: number,
  ): Step {
    if (this.step === 'flying') {
      this.celebrating -= dt;
      return this.celebrating > 0 ? 'flying' : 'done';
    }

    if (state.onGround) {
      // El guion de despegue solo mientras no se haya volado nunca. Después
      // de una vuelta completa, quien está rodando ya sabe salir.
      if (this.hasFlown) return 'done';
      // El orden importa: con velocidad de rotación alcanzada, lo que toca es
      // tirar aunque no se haya llegado al gas máximo. Al revés, el cartel
      // seguía pidiendo motor a ciento treinta por hora, con el avión ya
      // listo para volar, y contradecía a la pista que se veía por delante.
      if (state.airspeed >= ROTATION_SPEED) return 'pull';
      if (throttle < 0.85) return 'throttle';
      return 'speed';
    }

    if (!this.hasFlown) {
      this.hasFlown = true;
      this.celebrating = 2.6;
      return 'flying';
    }

    // En el aire y de vuelta hacia la pista.
    if (distanceToRunway < APPROACH_DISTANCE && throttle > APPROACH_THROTTLE) return 'slow';
    return 'done';
  }
}

function renderCue(cue: StepView['cue']): string {
  if (cue.kind === 'symbol') return `<span class="tutor__glifo">${cue.glyph}</span>`;
  const wide = cue.wide ? ' tutor__tecla--ancha' : '';
  return `<span class="tutor__tecla${wide}">${cue.label}</span>`;
}

/**
 * Dedo o ratón. Se consulta en cada fotograma en vez de una sola vez porque
 * un portátil con pantalla táctil puede cambiar de uno a otro sin recargar.
 */
function isTouch(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}
