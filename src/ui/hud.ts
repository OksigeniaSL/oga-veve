/**
 * HUD: los cuatro números que hacen falta para volar y nada más.
 *
 * Es DOM y CSS, no canvas. Un canvas obligaría a redibujar texto a mano, a
 * pelearse con el dpi de cada pantalla y a reimplementar la accesibilidad.
 * El navegador ya sabe pintar texto nítido; que lo haga él.
 *
 * La velocidad va en km/h y la altura en metros, no en nudos y pies. El
 * público son chicos paraguayos, no alumnos de una escuela de vuelo: las
 * unidades aeronáuticas serían presumir a costa de que no se entienda.
 */

import type { FlightState } from '../flight/model';
import { indicatedAirspeed } from '../flight/atmosphere';
import { t } from '../i18n';

export class Hud {
  private readonly speed: HTMLElement;
  private readonly altitude: HTMLElement;
  private readonly heading: HTMLElement;
  private readonly vspeed: HTMLElement;
  private readonly throttleFill: HTMLElement;
  private readonly horizon: HTMLElement;
  private readonly warning: HTMLElement;
  private readonly badge: HTMLElement;
  private readonly hint: HTMLElement;

  private hintTimer = 0;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="hud__arriba">
        <div class="tarjeta insignia" data-hud="badge"></div>
      </div>
      <div class="hud__izquierda">
        <div class="tarjeta medidor">
          <span class="medidor__etiqueta">${t('hud.speed')}</span>
          <span class="medidor__valor"><span data-hud="speed">0</span
            ><span class="medidor__unidad">${t('units.kmh')}</span></span>
        </div>
        <div class="tarjeta medidor">
          <span class="medidor__etiqueta">${t('hud.vspeed')}</span>
          <span class="medidor__valor"><span data-hud="vspeed">0</span
            ><span class="medidor__unidad">${t('units.mps')}</span></span>
        </div>
      </div>
      <div class="hud__derecha">
        <div class="tarjeta medidor">
          <span class="medidor__etiqueta">${t('hud.altitude')}</span>
          <span class="medidor__valor"><span data-hud="altitude">0</span
            ><span class="medidor__unidad">${t('units.metres')}</span></span>
        </div>
        <div class="tarjeta medidor">
          <span class="medidor__etiqueta">${t('hud.heading')}</span>
          <span class="medidor__valor" data-hud="heading">000</span>
        </div>
        <div class="tarjeta medidor motor">
          <span class="medidor__etiqueta">${t('hud.throttle')}</span>
          <div class="motor__pista"><div class="motor__relleno" data-hud="throttle"></div></div>
        </div>
        <div class="tarjeta horizonte">
          <div class="horizonte__cielo" data-hud="horizon"></div>
          <div class="horizonte__cruz"></div>
        </div>
      </div>
      <div class="hud__abajo">
        <div class="aviso-hud" data-hud="warning"></div>
        <div class="tarjeta insignia" data-hud="hint" style="margin-top:8px"></div>
      </div>
    `;

    this.speed = pick(root, 'speed');
    this.altitude = pick(root, 'altitude');
    this.heading = pick(root, 'heading');
    this.vspeed = pick(root, 'vspeed');
    this.throttleFill = pick(root, 'throttle');
    this.horizon = pick(root, 'horizon');
    this.warning = pick(root, 'warning');
    this.badge = pick(root, 'badge');
    this.hint = pick(root, 'hint');
  }

  update(state: FlightState, throttle: number, dt: number): void {
    // Velocidad indicada, no verdadera: es la que importa para no caerse, y
    // la que marcaría el instrumento de un avión real.
    const kmh = indicatedAirspeed(state.airspeed, state.position.y) * 3.6;
    this.speed.textContent = Math.round(kmh).toString();
    this.altitude.textContent = Math.round(state.position.y).toString();
    this.vspeed.textContent = state.verticalSpeed.toFixed(1);

    const degrees = Math.round((state.heading * 180) / Math.PI) % 360;
    this.heading.textContent = degrees.toString().padStart(3, '0');

    this.throttleFill.style.width = `${Math.round(throttle * 100)}%`;

    // El horizonte gira al revés que el avión y sube y baja con el cabeceo:
    // así el instrumento representa el mundo, no la máquina.
    const bank = bankAngleOf(state);
    const pitch = pitchAngleOf(state);
    this.horizon.style.transform = `rotate(${(-bank * 180) / Math.PI}deg) translateY(${(pitch * 180) / Math.PI * 1.6}px)`;

    this.setWarning(state);

    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hint.textContent = '';
    }
  }

  setBadge(text: string): void {
    this.badge.textContent = text;
  }

  /** Mensaje efímero: cambio de modo, de cámara, lo que sea. */
  flash(text: string, seconds = 2.4): void {
    this.hint.textContent = text;
    this.hintTimer = seconds;
  }

  private setWarning(state: FlightState): void {
    let text = '';
    let blink = false;

    if (state.crashed) {
      text = t('hud.crashed', { key: 'R' });
    } else if (state.stalled) {
      text = t('hud.stall');
      blink = true;
    }

    this.warning.textContent = text;
    this.warning.classList.toggle('aviso-hud--visible', text !== '');
    this.warning.classList.toggle('aviso-hud--parpadeo', blink);
  }
}

function pick(root: HTMLElement, name: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-hud="${name}"]`);
  if (!element) throw new Error(`Falta el elemento del HUD: ${name}`);
  return element;
}

/** Alabeo respecto al horizonte, a partir del cuaternión del avión. */
function bankAngleOf(state: FlightState): number {
  const right = { x: 1, y: 0, z: 0 };
  const q = state.orientation;
  // Componente Y del eje derecho del avión, rotado. Expandido a mano para no
  // reservar un Vector3 en cada fotograma del HUD.
  const y =
    2 * (q.x * q.y + q.w * q.z) * right.x +
    (1 - 2 * (q.x * q.x + q.z * q.z)) * right.y +
    2 * (q.y * q.z - q.w * q.x) * right.z;
  return Math.asin(Math.max(-1, Math.min(1, y)));
}

/** Cabeceo respecto al horizonte. */
function pitchAngleOf(state: FlightState): number {
  const q = state.orientation;
  // Componente Y del morro (-Z local) rotado.
  const y = -(2 * (q.y * q.z + q.w * q.x));
  return Math.asin(Math.max(-1, Math.min(1, y)));
}
