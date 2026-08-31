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
import { bankAngleOf, pitchAngleOf } from './actitud';
import { SixPack } from './six-pack';
import type { Tier } from '../flight/tiers';

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
  brakes: 'BRK',
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
  /**
   * Cuántos instrumentos enseña el HUD.
   *
   * Es la mitad visible de la escalera de tramos: de ninguno a los cinco. Un
   * niño de cinco años no necesita saber su rumbo, y enseñárselo solo le
   * quita paisaje.
   */
  private instruments: Tier['instruments'] = 'numeric';

  /**
   * El cuadro de mandos clásico. Solo existe en el peldaño más alto: seis
   * esferas son ruido para quien todavía está aprendiendo a mantener el
   * rumbo, y son *la cabina* para quien ya vuela.
   */
  private readonly sixPack = new SixPack();

  private speed: HTMLElement | null = null;
  private altitude: HTMLElement | null = null;
  private heading: HTMLElement | null = null;
  private vspeed: HTMLElement | null = null;
  private throttleFill!: HTMLElement;
  private brakes!: HTMLElement;
  private horizon: HTMLElement | null = null;
  private homeArrow!: HTMLElement;
  private homeDistance: HTMLElement | null = null;
  private homeGloss: HTMLElement | null = null;
  private home!: HTMLElement;
  private warning!: HTMLElement;
  private warningText!: HTMLElement;
  private warningArrow!: HTMLElement;
  private vignette!: HTMLElement;
  private badge!: HTMLElement;
  private progress!: HTMLElement;
  private sound!: HTMLElement;
  private hint!: HTMLElement;

  private badgeText = '';
  private progressState: { done: number; total: number } | null = null;
  private soundState = { glyph: '🔊', label: '' };
  private soundHandler: (() => void) | null = null;
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
    const gauges = this.instruments !== 'none';
    const pictorial = this.instruments === 'pictorial';
    const panel = this.instruments === 'full';
    // En el peldaño más alto las cifras sueltas desaparecen: lo que se lee
    // son las seis esferas, que es como se lee una cabina de verdad. Dejar
    // las dos cosas sería enseñar a mirar el número y no el instrumento,
    // justo el hábito que este peldaño existe para quitar.
    const numbers = this.instruments === 'numeric';

    this.root.innerHTML = `
      <div class="hud__arriba">
        <div class="tarjeta insignia" data-hud="badge"></div>
        <!--
          Progreso de la misión, en puntos. Sin cifras ni fracciones: se ve
          cuántos faltan de un vistazo, y funciona igual con cinco años que
          con cuarenta.
        -->
        <div class="progreso" data-hud="progress" hidden></div>
        <!--
          Botón de sonido. Es un botón de verdad y no un adorno: se pulsa con
          el dedo, se enfoca con el tabulador y dice su estado. Existe porque
          la tecla V silenciaba sin dejar rastro en pantalla, y un estado
          invisible no es un estado: es un fallo esperando.
        -->
        <button class="sonido" type="button" data-hud="sound" aria-pressed="false"></button>
      </div>
      <div class="hud__izquierda">
        ${numbers ? gauge('speed', INSTRUMENTS.speed, t('hud.speed'), this.units.speedLabel()) : ''}
        ${numbers ? gauge('vspeed', INSTRUMENTS.vspeed, t('hud.vspeed'), this.units.vspeedLabel()) : ''}
        ${pictorial ? arcGauge('speed', INSTRUMENTS.speed, t('hud.speed')) : ''}
      </div>
      <div class="hud__derecha">
        ${numbers ? gauge('altitude', INSTRUMENTS.altitude, t('hud.altitude'), this.units.altitudeLabel()) : ''}
        ${numbers ? gauge('heading', INSTRUMENTS.heading, t('hud.heading'), '°') : ''}
        ${pictorial ? arcGauge('altitude', INSTRUMENTS.altitude, t('hud.altitude')) : ''}
        <!--
          El motor lleva sus dos teclas dibujadas al lado, y no una sola en
          el tutor cuando toca. Un mando que solo enseña la mitad de su
          pareja no se puede deducir: se veía «baja el motor» y no había
          manera de saber con qué se sube.
        -->
        <div class="tarjeta medidor motor">
          ${gauges ? `<span class="medidor__etiqueta">${INSTRUMENTS.throttle}</span>` : ''}
          <div class="motor__fila">
            <span class="motor__tecla" aria-hidden="true">−</span>
            <div class="motor__pista"><div class="motor__relleno" data-hud="throttle"></div></div>
            <span class="motor__tecla" aria-hidden="true">+</span>
          </div>
          ${gauges ? `<span class="medidor__glosa">${t('hud.throttle')}</span>` : ''}
        </div>
        <!--
          El freno. Sale solo cuando se está en el suelo, porque en el aire
          no sirve de nada y ocuparía sitio; y sale **con su tecla dibujada**,
          igual que el motor. Estaba conectado desde el principio y nadie lo
          encontraba: se aterrizaba y el avión rodaba hasta el fin del mundo.
          Un mando que no se anuncia no existe.
        -->
        <div class="tarjeta medidor freno" data-hud="brakes" hidden>
          ${gauges ? `<span class="medidor__etiqueta">${INSTRUMENTS.brakes}</span>` : ''}
          <span class="motor__tecla motor__tecla--ancha" aria-hidden="true">␣</span>
          ${gauges ? `<span class="medidor__glosa">${t('hud.brakes')}</span>` : ''}
        </div>
        ${numbers ? `<div class="tarjeta horizonte">
          <div class="horizonte__cielo" data-hud="horizon"></div>
          <div class="horizonte__cruz"></div>
        </div>` : ''}
        <div class="tarjeta casa" data-hud="home">
          <div class="casa__aguja" data-hud="home-arrow" aria-hidden="true">➤</div>
          ${gauges ? '<span class="casa__distancia" data-hud="home-distance">0</span>' : ''}
          ${gauges ? `<span class="medidor__glosa" data-hud="home-gloss">${t('hud.home')}</span>` : ''}
        </div>
      </div>
      <div class="vineta" data-hud="vignette"></div>
      ${Tutor.markup()}
      <div class="hud__abajo">
        <!--
          Aquí sí: el aviso es assertive porque interrumpe (pérdida, suelo)
          y el mensaje efímero es polite porque puede esperar. Son las dos
          únicas cosas del HUD que un lector de pantalla debe leer.
        -->
        <div class="aviso-hud" role="alert" aria-live="assertive" data-hud="warning">
          <span class="aviso-hud__flecha" data-hud="warning-arrow" aria-hidden="true"></span>
          <span data-hud="warning-text"></span>
        </div>
        <div class="tarjeta insignia" aria-live="polite" data-hud="hint" style="margin-top:8px"></div>
        <!--
          El cuadro de mandos va aquí y no flotando aparte: compartiendo la
          franja de abajo se apila con el aviso en vez de taparlo, que es lo
          que pasaba. Un panel bonito que esconde un «terrain, pull up» es
          peor que no tener panel.
        -->
        ${panel ? SixPack.markup() : ''}
      </div>
    `;

    // Los instrumentos que este peldaño no enseña sencillamente no están en
    // el DOM, así que la actualización tiene que tolerar su ausencia.
    this.speed = optional(this.root, 'speed');
    this.altitude = optional(this.root, 'altitude');
    this.heading = optional(this.root, 'heading');
    this.vspeed = optional(this.root, 'vspeed');
    this.throttleFill = pick(this.root, 'throttle');
    this.brakes = pick(this.root, 'brakes');
    this.horizon = optional(this.root, 'horizon');
    this.home = pick(this.root, 'home');
    this.homeArrow = pick(this.root, 'home-arrow');
    this.homeDistance = optional(this.root, 'home-distance');
    this.homeGloss = optional(this.root, 'home-gloss');
    this.warning = pick(this.root, 'warning');
    this.warningText = pick(this.root, 'warning-text');
    this.warningArrow = pick(this.root, 'warning-arrow');
    this.vignette = pick(this.root, 'vignette');
    this.badge = pick(this.root, 'badge');
    this.progress = pick(this.root, 'progress');
    this.sound = pick(this.root, 'sound');
    this.sound.addEventListener('click', () => this.soundHandler?.());
    this.paintSound();
    this.paintProgress();
    this.hint = pick(this.root, 'hint');

    this.badge.textContent = this.badgeText;
    this.sixPack.bind(this.root);
    this.tutor.bind(this.root);
    this.reserveForPanel();
  }

  /**
   * El tutor va fijo sobre el fondo de la pantalla y el cuadro de mandos
   * también vive abajo, así que sin esto el cartel se planta encima de las
   * esferas. Se mide el panel y se levanta el tutor exactamente eso: la
   * altura cambia con el tamaño de pantalla y con la fila única del modo
   * apaisado, y un número escrito a mano acertaría en un caso y fallaría en
   * los otros.
   */
  private reserveForPanel(): void {
    const panel = this.root.querySelector<HTMLElement>('[data-hud="sixpack"]');
    this.root.style.setProperty('--panel-alto', `${panel ? panel.offsetHeight + 10 : 0}px`);
  }

  /**
   * Hacia dónde queda la pista y a qué distancia.
   *
   * La aguja gira respecto al morro: arriba es de frente. Es el canal que
   * funciona sin leer — se gira hasta que la flecha apunta arriba y se va
   * hacia allá. El número está para quien ya lee.
   *
   * @param relativeBearing rad, 0 al frente, positivo a la derecha
   * @param toObjective si señala un objetivo de misión en vez de la pista
   */
  setHome(relativeBearing: number, metres: number, toObjective = false): void {
    // El glifo apunta a la derecha en reposo, de ahí los noventa grados. La
    // rotación entera se calcula aquí y no repartida entre CSS y JS: dos
    // sitios distintos girando el mismo elemento es como nacen los errores
    // de signo.
    const degrees = (relativeBearing * 180) / Math.PI - 90;
    this.homeArrow.style.transform = `rotate(${degrees}deg)`;
    if (this.homeDistance) {
      this.homeDistance.textContent =
        metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
    }
    // Cerca y de frente, se apaga: ya la estás viendo por la ventanilla.
    this.home.classList.toggle('casa--cerca', metres < 900);
    // Y dice a qué apunta: con misión en curso no es la pista.
    this.home.classList.toggle('casa--objetivo', toObjective);
    if (this.homeGloss) {
      this.homeGloss.textContent = t(toObjective ? 'hud.objective' : 'hud.home');
    }
  }

  setUnits(name: UnitSystemName): void {
    this.units = UNIT_SYSTEMS[name];
    this.render();
  }

  /** Cuántos instrumentos enseña este peldaño de la escalera. */
  setInstruments(level: Tier['instruments']): void {
    this.instruments = level;
    this.render();
  }

  update(state: FlightState, throttle: number, dt: number, braking = 0): void {
    // Velocidad indicada, no verdadera: es la que importa para no caerse, y
    // la que marcaría el instrumento de un avión real.
    const ias = indicatedAirspeed(state.airspeed, state.position.y);

    if (this.instruments === 'pictorial') {
      // Sin cifras: la aguja del arco dice deprisa o despacio, alto o bajo.
      setArc(this.speed, this.units.speed(ias) / 220);
      setArc(this.altitude, this.units.altitude(state.position.y) / 900);
    } else {
      if (this.speed) this.speed.textContent = Math.round(this.units.speed(ias)).toString();
      if (this.altitude) {
        this.altitude.textContent = Math.round(this.units.altitude(state.position.y)).toString();
      }
      if (this.vspeed) {
        this.vspeed.textContent = this.units
          .vspeed(state.verticalSpeed)
          .toFixed(this.units.vspeedDecimals);
      }
      if (this.heading) {
        const degrees = Math.round((state.heading * 180) / Math.PI) % 360;
        this.heading.textContent = degrees.toString().padStart(3, '0');
      }
    }

    this.throttleFill.style.width = `${Math.round(throttle * 100)}%`;

    // El freno aparece al tocar suelo y se enciende al pisarlo.
    this.brakes.hidden = !state.onGround;
    this.brakes.classList.toggle('freno--pisado', braking > 0.05);

    // Alabeo y cabeceo los quieren dos consumidores —la tarjeta del horizonte
    // y el cuadro de mandos—, y solo uno de los dos existe a la vez. Se
    // calculan aquí una vez y no dentro de cada rama, que es como se acaba
    // teniendo dos definiciones del mismo signo.
    const bank = bankAngleOf(state.orientation);
    const pitch = pitchAngleOf(state.orientation);

    if (this.sixPack.present) {
      this.sixPack.update(
        state,
        // Nudos y pies, siempre, sin pasar por el selector de unidades: un
        // anemómetro de verdad marca nudos aunque el resto de la pantalla
        // esté en kilómetros por hora. La esfera no negocia.
        ias * 1.94384,
        state.position.y * 3.28084,
        state.verticalSpeed * 196.85,
        bank,
        pitch,
      );
    }

    // El horizonte gira al revés que el avión y sube y baja con el cabeceo:
    // así el instrumento representa el mundo, no la máquina.
    if (this.horizon) {
      this.horizon.style.transform = `rotate(${(-bank * 180) / Math.PI}deg) translateY(${((pitch * 180) / Math.PI) * 1.6}px)`;
    }

    this.setWarning(state);

    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hint.textContent = '';
    }
  }

  /**
   * Cuántos objetivos van y cuántos hay, como una fila de puntos.
   *
   * `null` esconde la fila: en vuelo libre no hay nada que contar.
   */
  setMissionProgress(progress: { done: number; total: number } | null): void {
    this.progressState = progress;
    this.paintProgress();
  }

  private paintProgress(): void {
    if (!this.progress) return;
    const progress = this.progressState;
    this.progress.hidden = progress === null;
    if (!progress) return;

    this.progress.innerHTML = Array.from({ length: progress.total }, (_, index) =>
      `<span class="progreso__punto${index < progress.done ? ' progreso__punto--hecho' : ''}"></span>`,
    ).join('');
  }

  /** Estado del sonido: glifo y etiqueta accesible. */
  setSoundLevel(glyph: string, label: string): void {
    this.soundState = { glyph, label };
    this.paintSound();
  }

  onSoundClick(handler: () => void): void {
    this.soundHandler = handler;
  }

  private paintSound(): void {
    if (!this.sound) return;
    this.sound.textContent = this.soundState.glyph;
    this.sound.setAttribute('aria-label', this.soundState.label);
    this.sound.setAttribute('aria-pressed', String(this.soundState.glyph === '🔇'));
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
    } else if (closingWithGround(state)) {
      text = t('hud.pullUp');
      arrow = '↑';
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

/**
 * Arco de aguja para el peldaño pictórico: sin una sola cifra.
 *
 * Es un `conic-gradient` de CSS, así que no hay canvas, ni SVG, ni un solo
 * byte de imagen. La banda verde marca dónde está bien y la roja dónde no,
 * que es toda la lectura que necesita alguien de siete años.
 */
function arcGauge(name: string, instrument: string, gloss: string): string {
  return `
    <div class="tarjeta medidor">
      <span class="medidor__etiqueta">${instrument}</span>
      <div class="arco" data-hud="${name}">
        <span class="arco__banda"></span>
        <span class="arco__aguja"></span>
      </div>
      <span class="medidor__glosa">${gloss}</span>
    </div>
  `;
}

/** Coloca la aguja de un arco, con la fracción acotada a su recorrido. */
function setArc(element: HTMLElement | null, fraction: number): void {
  if (!element) return;
  const clamped = Math.max(0, Math.min(1, fraction));
  element.style.setProperty('--v', String(clamped));
}

function optional(root: HTMLElement, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-hud="${name}"]`);
}

function pick(root: HTMLElement, name: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-hud="${name}"]`);
  if (!element) throw new Error(`Falta el elemento del HUD: ${name}`);
  return element;
}

/**
 * Aviso de proximidad del suelo.
 *
 * No avisa por estar bajo —volar rasante sobre el valle es media gracia del
 * juego— sino por **ir a chocar**: mide cuánto falta para llegar al suelo al
 * ritmo al que se está bajando. Es como funciona un GPWS de verdad, y tiene
 * la ventaja de que no salta al pasar rozando una loma en horizontal.
 *
 * Va por el mismo canal que la pérdida: flecha, viñeta roja y palabra. Los
 * dos primeros funcionan sin saber leer.
 */
function closingWithGround(state: FlightState): boolean {
  if (state.onGround || state.crashed) return false;
  return state.secondsToImpact < 6;
}

