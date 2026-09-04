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

/**
 * Ya no se puede parar: **la mano de parar, tachada**.
 *
 * Es el punto de no retorno del despegue, y se dibuja con la misma mano del
 * freno para que se lea sin palabras: lo que hasta ahora podías hacer —parar—
 * ya no. Un dibujo nuevo diría «esto es otra cosa»; la mano tachada dice
 * «esto de aquí, ya no».
 *
 * Retirar la mano y ya está no bastaba: «no basta con que se retire la mano,
 * algo debe hacer entender que estás en V1, que ya no puedes abortar».
 * Desaparecer no se ve; tacharse, sí.
 */
const NO_PARAR = icono(`
  <path d="M8 20 v-6 l-2.4-2.4 a1.4 1.4 0 0 1 2-2 L9.4 11.2 V4.6
           a1.3 1.3 0 0 1 2.6 0 v5 v-5.6 a1.3 1.3 0 0 1 2.6 0 V10
           v-4.4 a1.3 1.3 0 0 1 2.6 0 V14 a6 6 0 0 1-6 6 Z" />
  <path class="senal__tachon" d="M3.4 3.4 L20.6 20.6" fill="none" stroke="currentColor"
        stroke-width="2.8" stroke-linecap="round" />
`);

/**
 * Volver a casa: **la raya que entra en un sitio**.
 *
 * Rodar para despegar y rodar porque acabas de aterrizar usaban el mismo
 * dibujo —la raya amarilla—, así que para quien no lee eran la misma cosa. Y
 * no lo son: «no es lo mismo rodar porque vas a despegar que rodar porque
 * aterrizaste». Ir es seguir la raya hasta la cabecera; volver es meter el
 * avión en su hueco.
 *
 * Por eso este lleva la raya **y el hueco**: dos rayas cortas a los lados y la
 * de rodaje entrando entre ellas, que es exactamente lo que hay pintado en un
 * estacionamiento de verdad.
 */
const A_CASA = icono(`
  <path d="M12 22 q0-6 0-9" stroke-width="3" fill="none" stroke="currentColor"
        stroke-linecap="round" />
  <path d="M6 3 v9 M18 3 v9" stroke-width="2.6" fill="none" stroke="currentColor"
        stroke-linecap="round" />
  <path d="M12 13 L9 17 h6 Z" />
`);

/**
 * *Terrain, pull up*: **el cerro y la flecha de subir**.
 *
 * Es el único dibujo del juego que dice «esto va mal». Los demás enseñan qué
 * hacer; este enseña qué está pasando, y por eso lleva las dos cosas: el
 * relieve que viene por delante y la flecha que sale de él hacia arriba.
 *
 * A los cuatro años no hace falta saber qué es un radioaltímetro para
 * entender un cerro y una flecha que sube.
 */
const TERRENO = icono(`
  <path d="M1 21 L7 12 L11 17 L16 8 L23 21 Z" />
  <path class="senal__hueco" d="M12 20 V11 M12 9 L8.5 13 M12 9 L15.5 13"
        stroke="currentColor" stroke-width="2.2" fill="none"
        stroke-linecap="round" stroke-linejoin="round" />
`);

/** La luz verde: adelante. */
const VERDE = icono(`
  <circle cx="12" cy="12" r="9.5" />
  <path class="senal__hueco" d="M12 5.5 L18 14 H14.4 V19.5 H9.6 V14 H6 Z" />
`);

/**
 * Ponerse en el eje de la pista: **la pista con un avión encima**.
 *
 * El primero era la pista en perspectiva con su eje discontinuo, sin más. Quien
 * lo probó no vio una pista: «un icono como de una mirilla de escopeta que a mí
 * no me dice nada». Y tenía razón — dos rectas que convergen con tres rayas en
 * medio son un retículo de puntería mirado sin contexto.
 *
 * Lo que faltaba era el avión. Con el avión dentro, la pista se lee como pista
 * y el dibujo dice lo que hay que hacer en vez de describir un sitio: **ponte
 * ahí**.
 */
const EJE = icono(`
  <path d="M4 22 L9.6 3 h4.8 L20 22 Z" opacity="0.3" />
  <rect x="11.2" y="4" width="1.6" height="3" rx="0.8" opacity="0.75" />
  <rect x="11.2" y="8.4" width="1.6" height="3" rx="0.8" opacity="0.75" />
  <path d="M4.2 16.6 L11.2 15.8 V12 a0.8 0.8 0 0 1 1.6 0 v3.8 l7 0.8 v1.7 l-7 0.8 v2.4
           l1.9 1.1 v1 L12 20.7 L8.3 21.4 v-1 l1.9-1.1 v-2.4 l-6-0.8 Z" />
`);

/**
 * Despegar: **el avión saliendo, con las rayas de velocidad detrás**.
 *
 * Era la palanca de gases a tope, que es lo que hay que hacer pero no lo que
 * pasa. Una palanca no se reconoce a los cuatro años; un avión saliendo
 * disparado, sí. Y la palanca ya está dibujada en su propio mando, con su
 * flecha, que es donde tiene sentido.
 */
const MOTOR = icono(`
  <path d="M2.6 13.4 L11.2 12.5 V6 a0.9 0.9 0 0 1 1.8 0 v6.4 l8.4 0.9 v2 l-8.4 0.9 v3.2
           l2.1 1.2 v1.1 L12 20.9 L6.9 21.7 v-1.1 l2.1-1.2 v-3.2 l-6.4-0.9 Z"
        transform="translate(1.4 -2.6) rotate(-30 12 14)" />
  <rect x="1.6" y="18.4" width="9" height="1.7" rx="0.85" opacity="0.85" />
  <rect x="4.4" y="21" width="7.5" height="1.7" rx="0.85" opacity="0.55" />
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

/**
 * Frenar: **el avión y la raya donde se para**.
 *
 * Era un disco con cuatro marcas alrededor, o sea un freno de disco visto de
 * frente. A quien lo probó le pareció otra cosa: «un icono como de una mirilla
 * de escopeta que a mí no me dice nada». Y es que un freno de disco es un
 * dibujo de mecánico, no de piloto — y desde luego no de alguien de cuatro
 * años.
 *
 * Ahora es lo que de verdad pasa: el avión llegando y una barra gorda delante
 * que dice hasta aquí. Es el mismo lenguaje que la mano de parar, pero para
 * cuando ya se está en el suelo rodando.
 */
const FRENO = icono(`
  <rect x="2.4" y="3.2" width="19.2" height="3" rx="1.5" />
  <path d="M2.6 16.6 L11.2 15.8 V9.6 a0.9 0.9 0 0 1 1.8 0 v6.2 l8.4 0.9 v2 l-8.4 0.9 v3
           l2.1 1.2 v1 L12 24 L6.9 24.2 v-1 l2.1-1.2 v-3 l-6.4-0.9 Z"
        transform="translate(0 -1.6)" />
  <path d="M9.4 9.4 L12 6.2 L14.6 9.4 Z" opacity="0.55" />
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
  nopara: NO_PARAR,
  verde: VERDE,
  eje: EJE,
  motor: MOTOR,
  ala: ALA,
  senda: SENDA,
  freno: FRENO,
  salida: SALIDA,
  acasa: A_CASA,
  terreno: TERRENO,
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
  private tecla: HTMLElement | null = null;
  private actual = "";
  private queda = 0;
  private accion: (() => void) | null = null;

  /**
   * Es un **botón**, siempre, aunque a veces no haga nada.
   *
   * Cuando lo que toca es apretar una tecla —arrancar el motor, apagarlo—, la
   * tarjeta hace esa misma cosa al tocarla. Y no es un adorno: **en una tablet
   * no había ninguna forma de arrancar el motor**, ni una. Los mandos táctiles
   * son palanca, timón, gas y freno; el contacto no estaba.
   *
   * Además es lo más directo que hay para quien no lee: la instrucción y el
   * mando son el mismo objeto. No hay que aprender a qué tecla corresponde el
   * dibujo, porque el dibujo se pulsa.
   */
  static markup(): string {
    return `
      <button class="senal" data-hud="senal" hidden type="button" disabled>
        <span class="senal__dibujo" data-hud="senal-dibujo"></span>
        <span class="senal__tecla" data-hud="senal-tecla" hidden></span>
        <span class="senal__letra" data-hud="senal-letra" hidden></span>
        <span class="senal__texto" data-hud="senal-texto"></span>
      </button>
    `;
  }

  bind(raiz: HTMLElement): void {
    this.raiz = raiz;
    this.caja = raiz.querySelector('[data-hud="senal"]');
    this.dibujo = raiz.querySelector('[data-hud="senal-dibujo"]');
    this.texto = raiz.querySelector('[data-hud="senal-texto"]');
    this.letra = raiz.querySelector('[data-hud="senal-letra"]');
    this.tecla = raiz.querySelector('[data-hud="senal-tecla"]');
    this.caja?.addEventListener("click", () => this.accion?.());
  }

  /**
   * Enseña una señal.
   *
   * `texto` puede venir vacío: en el peldaño de los pequeños no hay palabras y
   * la tarjeta se queda solo con el dibujo, que es lo que se entiende sin
   * saber leer.
   */
  mostrar(
    dibujo: string,
    texto: string,
    letra: string | null,
    opciones: {
      /** Segundos que dura. `Infinity` para que se quede hasta que cambie. */
      readonly segundos?: number;
      /** El nombre de la tecla que hay que apretar, si hay una. */
      readonly tecla?: string | null;
      /** Qué hace la tarjeta al tocarla. Si hay algo, es un botón de verdad. */
      readonly accion?: (() => void) | null;
    } = {},
  ): void {
    if (!this.caja || !this.dibujo) return;
    this.actual = dibujo;
    this.queda = opciones.segundos ?? 6;
    this.caja.hidden = false;
    this.dibujo.innerHTML = DIBUJOS[dibujo] ?? "";

    if (this.texto) {
      this.texto.textContent = texto;
      this.texto.hidden = !texto;
    }
    if (this.letra) {
      // La letra de la calle es un dato, no una palabra: una «A» pintada en el
      // suelo se reconoce sin leer, igual que se reconoce el número de la
      // pista. Por eso se queda incluso donde no hay texto.
      this.letra.textContent = letra ?? "";
      this.letra.hidden = !letra;
    }
    if (this.tecla) {
      // La tecla, dibujada como una tecla. Es la misma pinta que tiene en la
      // pantalla de mandos, para que se reconozca sin leer una palabra.
      this.tecla.textContent = opciones.tecla ?? "";
      this.tecla.hidden = !opciones.tecla;
    }

    this.accion = opciones.accion ?? null;
    const boton = this.caja as HTMLButtonElement;
    boton.disabled = !this.accion;
    boton.classList.toggle("senal--pulsable", !!this.accion);
  }

  /** El aviso se apaga solo. Un cartel permanente deja de mirarse. */
  update(dt: number): void {
    if (!this.caja || this.caja.hidden) return;
    // `Infinity` quiere decir «hasta que cambie»: lo que está pendiente de
    // que alguien haga algo no puede desaparecer solo. Es lo que dejó a quien
    // lo probó mirando un avión parado sin saber qué hacer: la llave salía,
    // se apagaba a los seis segundos, y ya no había forma de enterarse.
    this.queda -= dt;
    if (this.queda <= 0) {
      this.caja.hidden = true;
      this.actual = "";
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
