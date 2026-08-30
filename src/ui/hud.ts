/**
 * HUD: los cinco números que hacen falta para volar y nada más.
 *
 * Es DOM y CSS, no canvas. Un canvas obligaría a redibujar texto a mano, a
 * pelearse con el dpi de cada pantalla y a reimplementar la accesibilidad.
 * El navegador ya sabe pintar texto nítido; que lo haga él.
 *
 * Cada instrumento se rotula dos veces. Arriba, la abreviatura aeronáutica
 * real —IAS, ALT, HDG, V/S, THR—, que es la misma en todo el mundo y en
 * todos los idiomas, exactamente como en una cabina de verdad. Debajo, en
 * pequeño, la palabra corriente en el idioma activo. Quien todavía no lee
 * se guía por la posición y el tamaño del número; quien empieza a leer lee
 * la palabra; y para cuando lea bien, ya conoce la abreviatura que va a
 * encontrarse el día que se suba a un avión. Ver AGENTS.md, regla 3.
 *
 * Las unidades siguen al modo de vuelo, no a un ajuste aparte: en Arcade se
 * ve km/h y metros, y en Piloto nudos y pies, que es lo que marca un
 * altímetro real. Así el paso a las unidades de verdad llega cuando alguien
 * decide que quiere volar en serio, y no antes.
 */

import type { FlightState } from '../flight/model';
import { indicatedAirspeed } from '../flight/atmosphere';
import { t } from '../i18n';
import { Tutor } from './tutor';

/**
 * Rótulos de instrumento. No se traducen a propósito: son los mismos en
 * cualquier cabina del mundo, y aprenderlos es parte de lo que el juego
 * enseña sin proponérselo.
 */
const INSTRUMENTS = {
  speed: 'IAS',
  vspeed: 'V/S',
  altitude: 'ALT',
  heading: 'HDG',
  throttle: 'THR',
} as const;

/** Conversión y rótulo de unidades para un sistema de medida. */
interface UnitSystem {
  /** Velocidad indicada, desde m/s. */
  speed: (metresPerSecond: number) => number;
  speedLabel: () => string;
  /** Altitud, desde metros. */
  altitude: (metres: number) => number;
  altitudeLabel: () => string;
  /** Velocidad vertical, desde m/s. */
  vspeed: (metresPerSecond: number) => number;
  vspeedLabel: () => string;
  /** Decimales de la velocidad vertical: los pies por minuto son enteros. */
  vspeedDecimals: number;
}

const METRIC: UnitSystem = {
  speed: (v) => v * 3.6,
  speedLabel: () => t('units.kmh'),
  altitude: (h) => h,
  altitudeLabel: () => t('units.metres'),
  vspeed: (v) => v,
  vspeedLabel: () => t('units.mps'),
  vspeedDecimals: 1,
};

/** Nudos, pies y pies por minuto. Lo que marca un avión de verdad. */
const AERONAUTICAL: UnitSystem = {
  speed: (v) => v * 1.943844,
  speedLabel: () => t('units.knots'),
  altitude: (h) => h * 3.28084,
  altitudeLabel: () => t('units.feet'),
  vspeed: (v) => v * 196.8504,
  vspeedLabel: () => t('units.fpm'),
  vspeedDecimals: 0,
};

export const UNIT_SYSTEMS = { metric: METRIC, aeronautical: AERONAUTICAL } as const;
export type UnitSystemName = keyof typeof UNIT_SYSTEMS;

export class Hud {
  readonly tutor = new Tutor();
  private readonly root: HTMLElement;
  private units: UnitSystem = METRIC;

  private speed!: HTMLElement;
  private altitude!: HTMLElement;
  private heading!: HTMLElement;
  private vspeed!: HTMLElement;
  private throttleFill!: HTMLElement;
  private horizon!: HTMLElement;
  private warning!: HTMLElement;
  private warningText!: HTMLElement;
  private warningArrow!: HTMLElement;
  private vignette!: HTMLElement;
  private badge!: HTMLElement;
  private hint!: HTMLElement;

  private badgeText = '';
  private hintTimer = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.render();
  }

  /**
   * Vuelve a pintar los rótulos. Se llama al cambiar de idioma o de
   * unidades: los textos fijos se generan una vez y no se atan a variables,
   * así que la forma barata y sin sorpresas de traducirlos es rehacerlos.
   */
  render(): void {
    this.root.innerHTML = `
      <div class="hud__arriba">
        <div class="tarjeta insignia" data-hud="badge"></div>
      </div>
      <div class="hud__izquierda">
        ${gauge('speed', INSTRUMENTS.speed, t('hud.speed'), this.units.speedLabel())}
        ${gauge('vspeed', INSTRUMENTS.vspeed, t('hud.vspeed'), this.units.vspeedLabel())}
      </div>
      <div class="hud__derecha">
        ${gauge('altitude', INSTRUMENTS.altitude, t('hud.altitude'), this.units.altitudeLabel())}
        ${gauge('heading', INSTRUMENTS.heading, t('hud.heading'), '°')}
        <div class="tarjeta medidor motor">
          <span class="medidor__etiqueta">${INSTRUMENTS.throttle}</span>
          <div class="motor__pista"><div class="motor__relleno" data-hud="throttle"></div></div>
          <span class="medidor__glosa">${t('hud.throttle')}</span>
        </div>
        <div class="tarjeta horizonte">
          <div class="horizonte__cielo" data-hud="horizon"></div>
          <div class="horizonte__cruz"></div>
        </div>
      </div>
      <div class="vineta" data-hud="vignette"></div>
      ${Tutor.markup()}
      <div class="hud__abajo">
        <div class="aviso-hud" data-hud="warning">
          <span class="aviso-hud__flecha" data-hud="warning-arrow" aria-hidden="true"></span>
          <span data-hud="warning-text"></span>
        </div>
        <div class="tarjeta insignia" data-hud="hint" style="margin-top:8px"></div>
      </div>
    `;

    this.speed = pick(this.root, 'speed');
    this.altitude = pick(this.root, 'altitude');
    this.heading = pick(this.root, 'heading');
    this.vspeed = pick(this.root, 'vspeed');
    this.throttleFill = pick(this.root, 'throttle');
    this.horizon = pick(this.root, 'horizon');
    this.warning = pick(this.root, 'warning');
    this.warningText = pick(this.root, 'warning-text');
    this.warningArrow = pick(this.root, 'warning-arrow');
    this.vignette = pick(this.root, 'vignette');
    this.badge = pick(this.root, 'badge');
    this.hint = pick(this.root, 'hint');

    this.badge.textContent = this.badgeText;
    this.tutor.bind(this.root);
  }

  setUnits(name: UnitSystemName): void {
    this.units = UNIT_SYSTEMS[name];
    this.render();
  }

  update(state: FlightState, throttle: number, dt: number): void {
    // Velocidad indicada, no verdadera: es la que importa para no caerse, y
    // la que marcaría el instrumento de un avión real.
    const ias = indicatedAirspeed(state.airspeed, state.position.y);
    this.speed.textContent = Math.round(this.units.speed(ias)).toString();
    this.altitude.textContent = Math.round(this.units.altitude(state.position.y)).toString();
    this.vspeed.textContent = this.units
      .vspeed(state.verticalSpeed)
      .toFixed(this.units.vspeedDecimals);

    const degrees = Math.round((state.heading * 180) / Math.PI) % 360;
    this.heading.textContent = degrees.toString().padStart(3, '0');

    this.throttleFill.style.width = `${Math.round(throttle * 100)}%`;

    // El horizonte gira al revés que el avión y sube y baja con el cabeceo:
    // así el instrumento representa el mundo, no la máquina.
    const bank = bankAngleOf(state);
    const pitch = pitchAngleOf(state);
    this.horizon.style.transform = `rotate(${(-bank * 180) / Math.PI}deg) translateY(${((pitch * 180) / Math.PI) * 1.6}px)`;

    this.setWarning(state);

    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hint.textContent = '';
    }
  }

  setBadge(text: string): void {
    this.badgeText = text;
    this.badge.textContent = text;
  }

  /** Mensaje efímero: cambio de modo, de cámara, de idioma. */
  flash(text: string, seconds = 2.4): void {
    this.hint.textContent = text;
    this.hintTimer = seconds;
  }

  /**
   * Aviso de peligro, por tres canales a la vez: color en el borde de la
   * pantalla, una flecha que señala adónde hay que llevar la palanca, y el
   * texto. Los dos primeros funcionan sin saber leer, que es el caso de la
   * jugadora más joven. Ver AGENTS.md, regla 2.
   */
  private setWarning(state: FlightState): void {
    let text = '';
    let arrow = '';
    let blink = false;

    if (state.crashed) {
      text = t('hud.crashed');
      arrow = '↺';
    } else if (state.stalled) {
      text = t('hud.stall');
      arrow = '↓';
      blink = true;
    }

    this.warningText.textContent = text;
    this.warningArrow.textContent = arrow;
    this.warning.classList.toggle('aviso-hud--visible', text !== '');
    this.warning.classList.toggle('aviso-hud--parpadeo', blink);
    this.vignette.classList.toggle('vineta--activa', text !== '');
  }
}

/** Una tarjeta de instrumento: abreviatura, número, unidad y glosa. */
function gauge(name: string, instrument: string, gloss: string, unit: string): string {
  return `
    <div class="tarjeta medidor">
      <span class="medidor__etiqueta">${instrument}</span>
      <span class="medidor__valor"><span data-hud="${name}">0</span
        ><span class="medidor__unidad">${unit}</span></span>
      <span class="medidor__glosa">${gloss}</span>
    </div>
  `;
}

function pick(root: HTMLElement, name: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-hud="${name}"]`);
  if (!element) throw new Error(`Falta el elemento del HUD: ${name}`);
  return element;
}

/** Alabeo respecto al horizonte, a partir del cuaternión del avión. */
function bankAngleOf(state: FlightState): number {
  const q = state.orientation;
  // Componente Y del eje derecho del avión, rotado. Expandido a mano para no
  // reservar un Vector3 en cada fotograma del HUD.
  const y = 2 * (q.x * q.y + q.w * q.z);
  return Math.asin(Math.max(-1, Math.min(1, y)));
}

/** Cabeceo respecto al horizonte. */
function pitchAngleOf(state: FlightState): number {
  const q = state.orientation;
  // Componente Y del morro (-Z local) rotado.
  const y = -(2 * (q.y * q.z + q.w * q.x));
  return Math.asin(Math.max(-1, Math.min(1, y)));
}
