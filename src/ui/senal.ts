/**
 * La señal: qué toca hacer ahora, dibujado.
 *
 * El tramo Guyrami no lleva texto porque empieza a los cuatro años y no lee.
 * Eso dejó un hueco que la voz del instructor tiene que llenar, pero **la voz
 * no puede ser lo único**: hay quien juega en silencio, hay quien tiene la
 * pestaña muteada, y hay quien no oye. Un juego que solo se puede seguir con
 * sonido excluye a gente por una decisión de diseño, no por una limitación.
 *
 * Así que cada fase del vuelo tiene su dibujo, y el dibujo manda. La voz
 * acompaña; el texto, cuando el peldaño lo permite, acompaña también.
 *
 * Los once dibujos salen de `GUION`, en `vuelo.ts`, que es donde vive la
 * lección. Aquí solo se pintan.
 */

/** Un icono de veinticuatro por veinticuatro, como todos los del juego. */
const icono = (cuerpo: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${cuerpo}</svg>`;

/** La llave de contacto: arrancar o apagar. */
const LLAVE = icono(`
  <circle cx="8" cy="8" r="4.6" />
  <circle class="senal__hueco" cx="8" cy="8" r="1.7" />
  <path d="M11 9.6 L20.5 19.1 L18.4 21.2 L16.6 19.4 L15.2 20.8 L13.4 19 L14.8 17.6 L12.9 15.7
           L11.5 17.1 L9.7 15.3 L11.1 13.9 L9.2 12 Z" />
`);

/** La hélice girando. */
const HELICE = icono(`
  <ellipse cx="12" cy="5.4" rx="1.9" ry="5.4" />
  <ellipse cx="12" cy="18.6" rx="1.9" ry="5.4" />
  <ellipse cx="5.4" cy="12" rx="5.4" ry="1.9" />
  <ellipse cx="18.6" cy="12" rx="5.4" ry="1.9" />
  <circle class="senal__hueco" cx="12" cy="12" r="2.1" />
`);

/** La raya que hay que seguir, curvándose hacia delante. */
const RAYA = icono(`
  <path d="M9 22 q0-7 3-10 q3-3 3-9" stroke-width="3.4" fill="none" stroke="currentColor"
        stroke-linecap="round" />
  <path d="M15 3 L18.2 8 L11.8 8 Z" />
`);

/** La mano abierta de parar. La misma que el botón de freno, a propósito. */
const MANO = icono(`
  <path d="M8 20 v-6 l-2.4-2.4 a1.4 1.4 0 0 1 2-2 L9.4 11.2 V4.6
           a1.3 1.3 0 0 1 2.6 0 v5 v-5.6 a1.3 1.3 0 0 1 2.6 0 V10
           v-4.4 a1.3 1.3 0 0 1 2.6 0 V14 a6 6 0 0 1-6 6 Z" />
`);

/** La luz verde: adelante. */
const VERDE = icono(`
  <circle cx="12" cy="12" r="9.5" />
  <path class="senal__hueco" d="M12 5.5 L18 14 H14.4 V19.5 H9.6 V14 H6 Z" />
`);

/** El eje de la pista: ponerse derecho. */
const EJE = icono(`
  <path d="M3.5 21 L10 3 h4 l6.5 18 h-4.2 L12 8.6 L7.7 21 Z" opacity="0.45" />
  <rect x="11" y="3" width="2" height="4" rx="1" />
  <rect x="11" y="9" width="2" height="4" rx="1" />
  <rect x="11" y="15" width="2" height="4" rx="1" />
`);

/** Motor a fondo: la palanca arriba del todo. */
const MOTOR = icono(`
  <rect x="4" y="18" width="16" height="3.4" rx="1.7" />
  <rect x="10.6" y="4" width="2.8" height="14" rx="1.4" />
  <circle cx="12" cy="4.6" r="3.2" />
  <path d="M17 10 L20.5 6.5 L20.5 13.5 Z" />
`);

/** El ala: ya estás volando. */
const ALA = icono(`
  <path d="M2 13.4 L11 12.4 V5.4 a1 1 0 0 1 2 0 v7 l9 1 v2.2 l-9 1 v3.4 l2.4 1.4 v1.2
           l-4.4-1 l-4.4 1 v-1.2 L9 20 v-3.4 l-7-1 Z" />
`);

/** La senda de aproximación: bajar suave. */
const SENDA = icono(`
  <path d="M2 20 h20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none" />
  <path d="M3.5 5 L19 17.5" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2.6"
        fill="none" stroke-linecap="round" />
  <path d="M6.4 3 L2.4 6.4 L7.4 7.6 Z" />
`);

/** El freno. */
const FRENO = icono(`
  <circle cx="12" cy="12" r="9.2" />
  <circle class="senal__hueco" cx="12" cy="12" r="4.4" />
  <rect x="11" y="1.4" width="2" height="4" />
  <rect x="11" y="18.6" width="2" height="4" />
  <rect x="1.4" y="11" width="4" height="2" />
  <rect x="18.6" y="11" width="4" height="2" />
`);

/** Salir de la pista: la flecha que se va a un lado. */
const SALIDA = icono(`
  <path d="M2 6 h20 v3.2 H2 Z" opacity="0.45" />
  <path d="M6 9.2 q0 6 5 8" stroke="currentColor" stroke-width="3" fill="none"
        stroke-linecap="round" />
  <path d="M9.4 21.4 L16 19 L11.6 14.6 Z" />
`);

const DIBUJOS: Record<string, string> = {
  llave: LLAVE,
  helice: HELICE,
  amarillo: RAYA,
  mano: MANO,
  verde: VERDE,
  eje: EJE,
  motor: MOTOR,
  ala: ALA,
  senda: SENDA,
  freno: FRENO,
  salida: SALIDA,
};

/**
 * La tarjeta de señal del vuelo.
 *
 * Vive fuera del HUD de instrumentos a propósito: el HUD cambia de forma con
 * cada peldaño —en Guyrami no hay ni un instrumento— y esto tiene que estar
 * siempre, en todos.
 */
export class Senal {
  private raiz: HTMLElement | null = null;
  private caja: HTMLElement | null = null;
  private dibujo: HTMLElement | null = null;
  private texto: HTMLElement | null = null;
  private letra: HTMLElement | null = null;
  private actual = '';
  private queda = 0;

  static markup(): string {
    return `
      <div class="senal" data-hud="senal" hidden role="status">
        <span class="senal__dibujo" data-hud="senal-dibujo"></span>
        <span class="senal__letra" data-hud="senal-letra" hidden></span>
        <span class="senal__texto" data-hud="senal-texto"></span>
      </div>
    `;
  }

  bind(raiz: HTMLElement): void {
    this.raiz = raiz;
    this.caja = raiz.querySelector('[data-hud="senal"]');
    this.dibujo = raiz.querySelector('[data-hud="senal-dibujo"]');
    this.texto = raiz.querySelector('[data-hud="senal-texto"]');
    this.letra = raiz.querySelector('[data-hud="senal-letra"]');
  }

  /**
   * Enseña una señal.
   *
   * `texto` puede venir vacío: en el peldaño de los pequeños no hay palabras y
   * la tarjeta se queda solo con el dibujo, que es lo que se entiende sin
   * saber leer.
   */
  mostrar(dibujo: string, texto: string, letra: string | null, segundos = 6): void {
    if (!this.caja || !this.dibujo) return;
    this.actual = dibujo;
    this.queda = segundos;
    this.caja.hidden = false;
    this.dibujo.innerHTML = DIBUJOS[dibujo] ?? '';
    if (this.texto) {
      this.texto.textContent = texto;
      this.texto.hidden = !texto;
    }
    if (this.letra) {
      // La letra de la calle es un dato, no una palabra: una «A» pintada en el
      // suelo se reconoce sin leer, igual que se reconoce el número de la
      // pista. Por eso se queda incluso donde no hay texto.
      this.letra.textContent = letra ?? '';
      this.letra.hidden = !letra;
    }
  }

  /** El aviso se apaga solo. Un cartel permanente deja de mirarse. */
  update(dt: number): void {
    if (!this.caja || this.caja.hidden) return;
    this.queda -= dt;
    if (this.queda <= 0) {
      this.caja.hidden = true;
      this.actual = '';
    }
  }

  get visible(): boolean {
    return !!this.caja && !this.caja.hidden;
  }

  get presente(): boolean {
    return this.raiz !== null && this.caja !== null;
  }

  /** Qué se está enseñando ahora. Vacío si nada. */
  get mostrando(): string {
    return this.actual;
  }
}
