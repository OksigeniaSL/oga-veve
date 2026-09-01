/**
 * La pantalla de teclas.
 *
 * Hace dos cosas y la segunda importa más que la primera.
 *
 * La primera es dejar cambiar las teclas, porque de fábrica las flechas y el
 * motor caen todos en la mitad derecha del teclado y hay que volar con las
 * dos manos amontonadas. En una cabina de verdad una mano lleva el mando y la
 * otra el motor, cada una en su lado.
 *
 * La segunda es que **es la lista de lo que existe**. Quien lo probó llevaba
 * semanas sin saber que la B frenaba, y no por despiste: no había forma de
 * enterarse. Un mando que no se anuncia no existe. Por eso esta pantalla
 * enseña todas las acciones aunque nadie vaya a cambiar ninguna, y por eso
 * dice qué hace cada una con palabras y no solo la tecla.
 */

import { ACCIONES, ORDEN, nombreDeTecla, type Accion, type Keymap } from '../flight/keymap';
import { t } from '../i18n';

/*
 * Los dibujos de las teclas. En SVG y no emoji: un emoji se ve distinto en
 * cada sistema y aquí lo que importa es que la flecha de subir sea siempre
 * la misma flecha.
 */
const flecha = (d: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" /></svg>`;

const FLECHA_ARR = flecha('M12 4 L20 14 H15 V21 H9 V14 H4 Z');
const FLECHA_ABA = flecha('M12 21 L4 11 H9 V4 H15 V11 H20 Z');
const FLECHA_IZQ = flecha('M3 12 L13 4 V9 H21 V15 H13 V20 Z');
const FLECHA_DER = flecha('M21 12 L11 20 V15 H3 V9 H11 V4 Z');

/** Hélice con una flecha: más motor y menos motor. */
const helice = (chevron: string): string => `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <g class="cap__helice">
      <ellipse cx="12" cy="5.5" rx="1.9" ry="5.5" />
      <ellipse cx="12" cy="18.5" rx="1.9" ry="5.5" />
      <ellipse cx="5.5" cy="12" rx="5.5" ry="1.9" />
      <ellipse cx="18.5" cy="12" rx="5.5" ry="1.9" />
    </g>
    <path class="cap__chevron" d="${chevron}" />
  </svg>
`;

const HELICE_MAS = helice('M17 8 L20.5 4.5 L24 8');
const HELICE_MENOS = helice('M17 4.5 L20.5 8 L24 4.5');

/** La mano de parar, la misma que el botón de freno. */
const MANO = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 20 v-6 l-2.4-2.4 a1.4 1.4 0 0 1 2-2 L9.4 11.2 V4.6
             a1.3 1.3 0 0 1 2.6 0 v5 v-5.6 a1.3 1.3 0 0 1 2.6 0 V10
             v-4.4 a1.3 1.3 0 0 1 2.6 0 V14 a6 6 0 0 1-6 6 Z" />
  </svg>
`;

/** La llave de contacto, la misma que la tarjeta de «arrancá el motor». */
const LLAVE = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="8" cy="8" r="4.6" />
    <circle cx="8" cy="8" r="1.7" fill="rgba(0,0,0,.55)" />
    <path d="M11 9.6 L20.5 19.1 L18.4 21.2 L16.6 19.4 L15.2 20.8 L13.4 19 L14.8 17.6 L12.9 15.7
             L11.5 17.1 L9.7 15.3 L11.1 13.9 L9.2 12 Z" />
  </svg>
`;

/**
 * Qué dibujo lleva cada mando en el teclado pintado. Solo los que un niño
 * necesita: nada de flaps, ni de idioma, ni de créditos.
 *
 * **Y el motor, que faltaba.** Es la primera tecla que se pulsa en toda la
 * partida —la tarjeta lo pide antes que nada— y era la única que no salía
 * marcada: el juego decía «pulsá la I» y en el mapa de teclas la I estaba
 * apagada como cualquier otra letra.
 */
const GLIFOS: Partial<Record<Accion, string>> = {
  engine: LLAVE,
  pitchUp: FLECHA_ARR,
  pitchDown: FLECHA_ABA,
  rollLeft: FLECHA_IZQ,
  rollRight: FLECHA_DER,
  throttleUp: HELICE_MAS,
  throttleDown: HELICE_MENOS,
  brakes: MANO,
};

/**
 * El teclado, dibujado entero y con las filas escalonadas como el de verdad.
 *
 * Entero a propósito, y esto es lo importante: **el niño mira la pantalla,
 * la compara con el teclado que tiene delante y encuentra la tecla por dónde
 * está**, no por cómo se llama. Siete teclas sueltas no sirven para eso — hay
 * que ver el conjunto para poder situarse en él.
 *
 * Las teclas sin función salen apagadas, y ahí siguen: quitarlas rompería la
 * comparación, que es justo lo único que esta pantalla tiene que conseguir.
 *
 * Cada tecla se nombra por su código físico. Es lo correcto aquí: lo que se
 * está enseñando es **una posición**.
 */
const FILAS: ReadonlyArray<{ sangria: number; teclas: readonly string[] }> = [
  { sangria: 0, teclas: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'] },
  { sangria: 0.5, teclas: ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'] },
  { sangria: 0.8, teclas: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'] },
  { sangria: 1.2, teclas: ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM'] },
];

export class KeyScreen {
  /** Sin letras: teclado dibujado. Con letras: la tabla de siempre. */
  private simple = false;

  /** Teclas pulsadas ahora mismo, para encender su dibujo. */
  private readonly pulsadas = new Set<string>();

  private readonly root: HTMLElement;
  private readonly keymap: Keymap;
  private previousFocus: HTMLElement | null = null;

  /** Qué acción está esperando una tecla nueva, si alguna. */
  private capturando: Accion | null = null;

  constructor(root: HTMLElement, keymap: Keymap) {
    this.root = root;
    this.keymap = keymap;
    this.root.hidden = true;

    this.root.addEventListener('click', (event) => {
      const bruto = event.target as HTMLElement;
      if (bruto === this.root) return this.hide();
      // Del elemento que recibió el clic se sube al botón: si dentro hay un
      // dibujo, el clic llega al dibujo y no al botón, y no pasaba nada.
      const target = bruto.closest<HTMLElement>('button') ?? bruto;
      const accion = target.dataset.accion as Accion | undefined;
      if (accion) this.capture(accion);
      if (target.dataset.todo === 'restaurar') {
        this.keymap.restoreAll();
        this.capturando = null;
        this.render();
      }
      if (target.dataset.mano) {
        this.keymap.setMano(target.dataset.mano as 'izquierda' | 'derecha');
        this.render();
      }
      if (target.dataset.cerrar !== undefined) this.hide();
    });

    // La captura se hace aquí y en fase de captura, para llegar antes que el
    // juego: mientras se espera una tecla, esa tecla no debe volar el avión.
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('keyup', this.onKeyUp, true);
  }

  private onKeyUp = (event: KeyboardEvent): void => {
    if (this.pulsadas.delete(event.code) || this.pulsadas.delete(event.key)) this.paintPressed();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.root.hidden) return;

    // En la cara de dibujos, la tecla se enciende. Es todo el tutorial: se
    // aprieta algo y algo responde.
    if (this.simple && !this.capturando) {
      this.pulsadas.add(event.code);
      if (event.key.length === 1) this.pulsadas.add(event.key);
      this.paintPressed();
    }

    if (event.key === 'Escape') {
      event.stopPropagation();
      if (this.capturando) {
        this.capturando = null;
        this.render();
      } else {
        this.hide();
      }
      return;
    }

    if (!this.capturando) return;

    event.preventDefault();
    event.stopPropagation();
    // Se guarda el carácter cuando la tecla lo tiene y el código cuando no.
    // Es lo que hace que una tecla asignada en un teclado español siga
    // significando lo mismo, en vez de nombrar una posición del americano.
    const tecla = event.key.length === 1 ? event.key : event.code;
    this.keymap.assign(this.capturando, tecla);
    this.capturando = null;
    this.render();
  };

  /**
   * Qué cara enseña.
   *
   * En los peldaños sin letras, un teclado dibujado con las teclas que
   * importan y su dibujo encima; se encienden al pulsarlas de verdad, que es
   * la única manera de aprenderse un mando a los cuatro años: probándolo y
   * viendo que responde. En los peldaños con letras, la tabla completa, que
   * es lo que quiere quien viene a reasignar teclas.
   *
   * Se me olvidó la regla 2 del AGENTS.md al hacer esta pantalla y salió una
   * tabla de diecinueve filas de texto delante de una niña que no lee.
   */
  setSimple(simple: boolean): void {
    this.simple = simple;
    if (!this.root.hidden) this.render();
  }

  toggle(): void {
    if (this.root.hidden) this.show();
    else this.hide();
  }

  show(): void {
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.root.hidden = false;
    this.render();
    this.root.querySelector<HTMLElement>('button')?.focus();
  }

  hide(): void {
    this.capturando = null;
    this.root.hidden = true;
    this.previousFocus?.focus();
  }

  private capture(accion: Accion): void {
    this.capturando = accion;
    this.render();
  }

  /** Enciende las teclas dibujadas que están pulsadas ahora mismo. */
  private paintPressed(): void {
    // Se guarda la acción en el atributo y las teclas se consultan al mapa.
    // Antes iban serializadas en el propio atributo con un separador que no
    // sobrevive a pasar por HTML, así que nunca coincidía ninguna y las
    // teclas no se encendían jamás. Y de paso esto no se queda desfasado
    // cuando alguien cambia una tecla.
    for (const cap of this.root.querySelectorAll<HTMLElement>('[data-cap]')) {
      cap.classList.toggle('tecla--pulsada', this.pulsadas.has(cap.dataset.cap!));
    }
  }

  /** Una tecla del teclado dibujado, encendida si tiene función. */
  private cap(code: string, extra = ''): string {
    // Solo se enciende **la tecla que se enseña**. La del otro lado sigue
    // funcionando, pero no se dibuja: dos teclas encendidas para el mismo
    // mando es la pregunta «¿en qué quedamos?» dibujada en pantalla.
    const accion = this.keymap.isShown(code) ? this.keymap.actionFor(code) : null;
    const glifo = accion ? GLIFOS[accion] : undefined;
    const clases = ['tecla', extra, glifo ? 'tecla--activa' : ''].filter(Boolean).join(' ');
    return `
      <div class="${clases}" data-cap="${code}">
        ${glifo ?? ''}
        <span class="tecla__letra">${nombreDeTecla(code)}</span>
      </div>
    `;
  }

  /**
   * **El teclado dibujado sale siempre, y la tabla va debajo.**
   *
   * Estaba al revés: el dibujo solo para los peldaños que no leen y, para todos
   * los demás, una tabla de dieciséis filas de texto. O sea que casi nadie veía
   * el dibujo, y quien lo vio se lo dijo así: «no me puedo creer que en lugar de
   * mejorar la imagen del teclado hayas vuelto a esto».
   *
   * Y tenía razón por partida doble. Un teclado dibujado no es una versión
   * simplificada para niños: **es la única forma de encontrar una tecla por
   * dónde está en vez de por cómo se llama**, y eso sirve igual a los cuarenta
   * años. La tabla no sobra —hay que poder cambiar una tecla— pero es una
   * pantalla de ajustes, no una explicación.
   */
  private render(): void {
    const teclado = this.mapaDeTeclas();
    const tabla = this.simple ? '' : this.tablaDeCambios();
    this.root.innerHTML = `
      <div class="creditos__panel teclado" role="dialog" aria-modal="true"
           aria-label="${t('teclas.title')}">
        ${teclado}
        ${tabla}
        <!--
          La cruz iba flotando arriba a la derecha y se montaba encima de la
          última tecla. Va debajo, ancha y centrada: hay que poder darle sin
          apuntar.
        -->
        <div class="teclas__pie">
          ${this.simple ? '' : `<button type="button" data-todo="restaurar">${t('teclas.restore')}</button>`}
          <button class="teclado__cerrar" type="button" data-cerrar aria-label="${t('teclas.close')}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 L10 17 L19 7" /></svg>
          </button>
        </div>
      </div>
    `;
    this.paintPressed();
  }

  /** La tabla de cambiar teclas. Ajustes, no explicación: va debajo y discreta. */
  private tablaDeCambios(): string {
    const filas = ORDEN.map((accion) => {
      const esperando = this.capturando === accion;
      const teclas = this.keymap
        .keys(accion)
        .map(nombreDeTecla)
        // Sin repetidos: las dos mayúsculas o los dos controles se ven como
        // una sola tecla, que es como los ve quien está mirando el teclado.
        .filter((nombre, i, todas) => todas.indexOf(nombre) === i)
        .join(' · ');
      return `
        <tr>
          <th scope="row">${t(ACCIONES[accion].label)}</th>
          <td>
            <button class="teclas__tecla${esperando ? ' teclas__tecla--esperando' : ''}"
                    type="button" data-accion="${accion}">
              ${esperando ? t('teclas.pulsa') : teclas}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <details class="teclas__cambiar">
        <summary>${t('teclas.cambiar')}</summary>
        <p class="teclas__pista">${t('teclas.hint')}</p>
        <table class="teclas__tabla"><tbody>${filas}</tbody></table>
      </details>
    `;
  }

  /**
   * La cara para quien no lee: teclas dibujadas, sin una sola palabra.
   *
   * Se enseñan las dos teclas de cada mando —la de la izquierda y la de la
   * derecha—, porque enseñar solo una obliga a elegir por quien juega, y el
   * motivo de todo esto era justamente que cada mano tenga su lado.
   */
  /** El teclado dibujado: el mapa, con la mano y los mandos encima. */
  private mapaDeTeclas(): string {
    const filas = FILAS.map(
      ({ sangria, teclas }) =>
        `<div class="fila" style="padding-left:${sangria * 2.6}em">${teclas.map((k) => this.cap(k)).join('')}</div>`,
    ).join('');

    // La barra espaciadora y el bloque de flechas, que en un teclado de
    // verdad están aparte y son lo primero que un niño reconoce.
    const abajo = `
      <div class="fila fila--abajo">
        <div class="teclado__espacio">${this.cap('Space', 'ancha')}</div>
        <div class="teclado__flechas">
          <div class="fila">${this.cap('ArrowUp')}</div>
          <div class="fila">${this.cap('ArrowLeft')}${this.cap('ArrowDown')}${this.cap('ArrowRight')}</div>
        </div>
      </div>
    `;

    return `
        <!--
          Con qué mano se lleva el motor. Va arriba y con dibujos de mano
          porque es lo primero que hay que decidir y no hace falta leer para
          entenderlo: se toca la mano con la que se maneja.
        -->
        <div class="mano" role="group" aria-label="${t('teclas.mano')}">
          ${['izquierda', 'derecha'].map((m) => `
            <button class="mano__opcion" type="button" data-mano="${m}"
                    aria-pressed="${this.keymap.mano === m}" aria-label="${t(
                      m === 'izquierda' ? 'teclas.zurda' : 'teclas.diestra',
                    )}">
              <svg viewBox="0 0 24 24" aria-hidden="true"
                   style="transform:scaleX(${m === 'izquierda' ? -1 : 1})">
                <path d="M8 21 v-6.4 l-2.6-2.6 a1.5 1.5 0 0 1 2.1-2.1 L9.4 12.4 V4.4
                         a1.4 1.4 0 0 1 2.8 0 v5.4 V3.8 a1.4 1.4 0 0 1 2.8 0 V9.8
                         V5 a1.4 1.4 0 0 1 2.8 0 V14.6 A6.4 6.4 0 0 1 11.6 21 Z" />
              </svg>
            </button>`).join('')}
        </div>
        <div class="teclado__mapa">${filas}${abajo}</div>
    `;
  }
}
