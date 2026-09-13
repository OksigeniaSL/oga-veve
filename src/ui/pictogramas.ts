/**
 * Los instrumentos del primer peldaño, para quien no lee.
 *
 * Antes eran arcos con aguja, y un arco con aguja **sigue siendo un
 * instrumento**: hay que saber que la aguja a la izquierda es poco y a la
 * derecha es mucho, y eso ya es una convención que hay que aprender. A los
 * cuatro años no se tiene.
 *
 * Así que aquí no hay agujas. Hay tres cosas que se leen sin que nadie las
 * explique:
 *
 * - **Velocidad**: una tortuga a un lado, un pájaro al otro, y el avioncito
 *   moviéndose entre los dos. Cerca de la tortuga es despacio.
 * - **Altura**: un cerro abajo y el avión subiendo por la tarjeta. Su
 *   posición *es* la altura, sin traducir nada.
 * - **Motor**: una hélice que gira, y gira más deprisa cuanto más gas hay.
 *
 * Ninguna necesita número, ni palabra, ni saber qué significa una aguja. Y
 * las tres se entienden igual en Coronel Oviedo que en Canarias.
 *
 * La idea de la tortuga vino de las maquetas de diseño; el resto es la misma
 * regla de siempre: si hace falta explicarlo, no vale para este peldaño.
 */

/**
 * La hélice del gas, con su flecha: más motor y menos motor.
 *
 * **El gas no es la velocidad**, y confundirlos fue un error de bulto: los
 * botones del motor llevaron un día la tortuga y el pájaro, que son los
 * extremos del **velocímetro**. En pantalla quedaban dos cosas con los mismos
 * dibujos midiendo magnitudes distintas, y en cuanto discrepaban —que es
 * siempre, porque el motor manda y la velocidad obedece con retraso— parecía
 * que una de las dos mentía. «La tortuga, avión y ave dicen que estoy casi a
 * tope y el velocímetro está por debajo de la mitad.»
 *
 * El motor tiene su propio dibujo en este juego desde el principio: la hélice.
 *
 * **Y lo que las distingue es la flecha, no el tamaño.** Los dos botones del
 * motor llevaban la misma hélice en dos tamaños —una de radio 7 y otra de 11—
 * y en pantalla las dos se leen como un `+`: una hélice de cuatro palas vista
 * de frente **es** una cruz. La diferencia de tamaño la termina de comer el
 * botón, que las escala a lo mismo. Quien jugaba no sabía cuál daba gas:
 * «quiere que suba, pero no me deja meter gas ¿cómo subo?» — apretando el de
 * bajar, que parecía el de subir.
 *
 * La flecha ya existía, en las teclas dibujadas del panel de mandos, y era el
 * único sitio donde el motor se entendía. Ahora es la misma pareja en los dos
 * sitios: un dibujo, un significado.
 */
const conFlecha = (flecha: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">
     <g class="cap__helice">
       <ellipse cx="9" cy="5" rx="1.7" ry="5" />
       <ellipse cx="9" cy="19" rx="1.7" ry="5" />
       <ellipse cx="4" cy="12" rx="5" ry="1.7" />
       <ellipse cx="14" cy="12" rx="5" ry="1.7" />
     </g>
     <path class="cap__flecha" d="${flecha}" />
   </svg>`;

/** Más motor: la hélice con la flecha hacia arriba. */
export const HELICE_MAS = conFlecha("M20 1.5 L24 10 H16 Z");
/** Menos motor: la misma hélice con la flecha hacia abajo. */
export const HELICE_MENOS = conFlecha("M20 22.5 L16 14 H24 Z");

/** Silueta de tortuga: caparazón, cabeza y patas. Despacio. */
const TORTUGA = `
  <path d="M3 13 h2.2 v2 H3.4 Z M9.4 13 h2.2 v2 H9.6 Z" />
  <path d="M2.2 12.6 a5.6 4.4 0 0 1 11.2 0 Z" />
  <path d="M13.6 9.4 a1.9 1.9 0 1 1 0 3.2 h-1.2 v-3.2 Z" />
`;

/** Silueta de pájaro en vuelo, alas abiertas. Deprisa. */
const PAJARO = `
  <path d="M1 11.4 C4 7.6 6.4 6.6 8 9.6 C9.6 6.6 12 7.6 15 11.4
           C12 9.8 9.8 10.4 8 12.6 C6.2 10.4 4 9.8 1 11.4 Z" />
`;

/**
 * El horizonte, para la tarjeta de actitud.
 *
 * **Gira el mundo, no el avión**, que es como funciona un horizonte
 * artificial de verdad: el avioncito se queda quieto en el centro y lo que se
 * inclina es la línea del suelo. Se podría hacer al revés —sería más literal,
 * «tu avión está torcido así»— y sería un error de los que se pagan tarde:
 * quien aprenda aquí que la raya está quieta, el día que se siente delante de
 * uno de verdad tendrá que desaprenderlo.
 *
 * Es el mismo instrumento que llevan los peldaños de arriba, sin una cifra.
 */
const HORIZONTE = `
  <rect class="picto__tierra" x="-24" y="0" width="82" height="40" />
  <line class="picto__raya" x1="-24" y1="0" x2="58" y2="0" />
`;

/** Cerro con su falda, para la tarjeta de altura. */
const CERRO = `
  <path d="M0 34 L9 20 L15 26 L24 12 L34 34 Z" />
`;

/** El avioncito que se mueve. Visto desde detrás: alas y deriva. */
const AVION = `
  <path d="M8 5.2 v3.4 M1.6 8.2 h12.8 M5.4 10.4 h5.2" />
`;

/**
 * A partir de cuántos grados de alabeo el horizonte se pone ámbar.
 *
 * **Treinta y cinco, y el número sale de medirlo, no del manual.** En la
 * aviación de verdad un viraje normal son treinta grados y uno pronunciado
 * cuarenta y cinco, y el primer intento puso el ámbar en cuarenta y cinco por
 * eso.
 *
 * No servía: en estos dos peldaños el nivelador de alas está al máximo y **no
 * deja pasar de ahí**. Medido, con el alerón a fondo sostenido cinco segundos:
 * Guyrami se planta en 43° y Tukã en 46°. Un aviso en cuarenta y cinco es un
 * aviso que en Guyrami no sale nunca y en Tukã sale justo al final del
 * recorrido, cuando ya no queda nada que corregir.
 *
 * En treinta y cinco marca lo que de verdad se quiere marcar: que se está
 * virando fuerte, con sitio todavía para aflojar. Y de paso deja dicho algo
 * que no se ve por ningún lado — que en estos peldaños el avión **no te deja**
 * ponerte de canto, por mucho que empujes.
 */
const MUCHO_ALABEO = 35;

export class Pictogramas {
  private root: HTMLElement | null = null;
  private speedMark: SVGElement | null = null;
  private altPlane: SVGElement | null = null;
  private propeller: SVGElement | null = null;
  private horizonte: SVGElement | null = null;

  /** Giro acumulado de la hélice, en grados. */
  private spin = 0;

  static markup(): string {
    return `
      <div class="pictos" data-hud="pictos">
        <!--
          Velocidad. La tortuga y el pájaro están fijos en los extremos y el
          avioncito recorre el trecho entre los dos. No hay escala ni número:
          la posición es la respuesta.
        -->
        <div class="picto">
          <svg viewBox="0 0 100 34" aria-hidden="true">
            <g class="picto__bicho" transform="translate(2 12)">${TORTUGA}</g>
            <g class="picto__bicho" transform="translate(82 12)">${PAJARO}</g>
            <line class="picto__via" x1="20" y1="19" x2="80" y2="19" />
            <g class="picto__avion" data-picto="speed" transform="translate(20 11)">${AVION}</g>
          </svg>
        </div>

        <!--
          Altura. El cerro está abajo y el avión sube por la tarjeta. Es el
          único instrumento del juego que no traduce nada: lo que se ve es
          literalmente lo que pasa.
        -->
        <div class="picto">
          <svg viewBox="0 0 34 34" aria-hidden="true">
            <g class="picto__cerro">${CERRO}</g>
            <g class="picto__avion" data-picto="altitude" transform="translate(9 22)">${AVION}</g>
          </svg>
        </div>

        <!--
          **Cómo está puesto el avión.** Un horizonte que se inclina, con el
          avioncito quieto en el centro.

          Faltaba, y no se notaba porque desde la cámara de persecución se ve
          el mundo entero: parecía evidente. No lo es. «Yo ni escucho ni veo
          eso de los grados» — con el avión a ochenta grados de alabeo a baja
          altura, en el peldaño de los cuatro años, no había en pantalla una
          sola cosa que lo dijera. La tarjeta del horizonte y las esferas solo
          existen de Taguato para arriba.
        -->
        <div class="picto">
          <svg viewBox="0 0 34 34" aria-hidden="true">
            <g class="picto__mundo" data-picto="horizonte"
               transform="translate(17 17)">${HORIZONTE}</g>
            <g class="picto__avion picto__avion--fijo"
               transform="translate(9 13)">${AVION}</g>
          </svg>
        </div>

        <!--
          Motor. Gira, y gira más deprisa con más gas. No hay nada que
          interpretar: se ve la velocidad, no se lee.
        -->
        <div class="picto">
          <svg viewBox="0 0 34 34" aria-hidden="true">
            <g class="picto__helice" data-picto="prop">
              <ellipse cx="17" cy="7.5" rx="2.6" ry="7.5" />
              <ellipse cx="17" cy="26.5" rx="2.6" ry="7.5" />
              <ellipse cx="7.5" cy="17" rx="7.5" ry="2.6" />
              <ellipse cx="26.5" cy="17" rx="7.5" ry="2.6" />
            </g>
            <circle class="picto__buje" cx="17" cy="17" r="3.2" />
          </svg>
        </div>
      </div>
    `;
  }

  bind(root: HTMLElement): void {
    this.root = root.querySelector('[data-hud="pictos"]');
    this.speedMark = this.pick("speed");
    this.altPlane = this.pick("altitude");
    this.propeller = this.pick("prop");
    this.horizonte = this.pick("horizonte");
  }

  get present(): boolean {
    return this.root !== null;
  }

  /**
   * @param speed fracción de la velocidad de crucero, 0 a 1
   * @param height fracción de la altura que se considera «alto», 0 a 1
   * @param throttle 0 a 1
   * @param dt segundos desde el fotograma anterior
   */
  update(
    speed: number,
    height: number,
    throttle: number,
    dt: number,
    engineOn = true,
    /**
     * En qué banda va la velocidad, o `null` si aquí no hay banda que juzgar.
     *
     * **Es el único sitio donde la banda se puede ver en los peldaños de
     * abajo.** El color de la banda se pintaba en la tarjeta de cifras, y esa
     * tarjeta solo existe en Taguato: en Guyrami y en Tukã la banda se
     * calculaba, se pasaba al HUD y no la veía nadie. «Ni la velocidad me la
     * indica nadie», y era literal.
     */
    banda: "lento" | "bien" | "rapido" | null = null,
    /** Cuánto está alabeado el avión, rad. Positivo a la derecha. */
    alabeo = 0,
  ): void {
    if (!this.root) return;

    this.speedMark?.setAttribute(
      "transform",
      `translate(${20 + clamp01(speed) * 60} 11)`,
    );
    // El avioncito de la escala se tiñe con la banda. Verde es «así», y los
    // otros dos dicen hacia dónde hay que moverlo sin decir una palabra.
    const marca = this.speedMark?.classList;
    marca?.toggle("picto__avion--lento", banda === "lento");
    marca?.toggle("picto__avion--bien", banda === "bien");
    marca?.toggle("picto__avion--rapido", banda === "rapido");

    // El avión sube por la tarjeta. Se queda a media pieza del borde de
    // arriba para que no parezca que se sale, y apoyado en el cerro abajo.
    this.altPlane?.setAttribute(
      "transform",
      `translate(9 ${22 - clamp01(height) * 19})`,
    );

    // La hélice gira de verdad. A ralentí se mueve despacio y se distingue;
    // a tope se convierte en un disco, que es exactamente lo que hace una
    // hélice real y de paso enseña por qué no se pasa por delante.
    // El centro del giro va dentro del propio `rotate`, y **solo ahí**. Con
    // un `transform-origin` además, el navegador desplaza dos veces y las
    // palas se salen del encuadre: quedaba el buje solo, girando nada.
    // Con el motor parado, la hélice está parada. Llevaba un giro de base
    // que representaba el ralentí, y con el motor apagado ese ralentí no
    // existe: una hélice quieta es la señal de que el avión está apagado, y
    // es la única que hace falta para entenderlo a los cuatro años.
    this.spin = engineOn
      ? (this.spin + (60 + throttle * 900) * dt) % 360
      : this.spin;
    this.propeller?.setAttribute("transform", `rotate(${this.spin} 17 17)`);

    /*
     * **Y el horizonte, que gira al revés que el avión.**
     *
     * Con un tope: pasados los sesenta grados la raya ya no dice más —está
     * casi vertical y girar más no se distingue— y lo que sí cambia es el
     * color, que es lo que se ve de un vistazo sin mirar el dibujo. Ver
     * `picto__mundo--mucho`.
     */
    const grados = (alabeo * 180) / Math.PI;
    this.horizonte?.setAttribute(
      "transform",
      `translate(17 17) rotate(${-Math.max(-60, Math.min(60, grados))})`,
    );
    this.horizonte?.classList.toggle(
      "picto__mundo--mucho",
      Math.abs(grados) > MUCHO_ALABEO,
    );
  }

  private pick(name: string): SVGElement | null {
    return (
      this.root?.querySelector<SVGElement>(`[data-picto="${name}"]`) ?? null
    );
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
