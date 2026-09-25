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
 * - **Motor**: una hélice que gira, y gira más deprisa cuanto más gas hay. En
 *   los reactores, el fan dentro de su góndola, que gira igual.
 *
 * Ninguna necesita número, ni palabra, ni saber qué significa una aguja. Y
 * las tres se entienden igual en Coronel Oviedo que en Canarias.
 *
 * La idea de la tortuga vino de las maquetas de diseño; el resto es la misma
 * regla de siempre: si hace falta explicarlo, no vale para este peldaño.
 */

/**
 * El motor del gas, con su flecha: más motor y menos motor. Hélice en los
 * aviones de hélice y reactor en los de reactor: ver `fan`.
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
const conFlecha = (motor: string, flecha: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">
     <g class="cap__helice">${motor}</g>
     <path class="cap__flecha" d="${flecha}" />
   </svg>`;

/** La hélice de cuatro palas vista de frente, centrada en (cx, cy). */
const palasDeHelice = (cx: number, cy: number, r: number): string => {
  const a = r * 0.17; // el grueso de la pala
  const m = r / 2;
  return `
    <ellipse cx="${cx}" cy="${cy - m}" rx="${a}" ry="${m}" />
    <ellipse cx="${cx}" cy="${cy + m}" rx="${a}" ry="${m}" />
    <ellipse cx="${cx - m}" cy="${cy}" rx="${m}" ry="${a}" />
    <ellipse cx="${cx + m}" cy="${cy}" rx="${m}" ry="${a}" />`;
};

/**
 * **El reactor visto de frente: el aro de la góndola y el fan dentro.**
 *
 * Los dos reactores de la flota —el JAZ 90 y el JAZ 120— llevaban en el
 * pictograma del motor, en los botones del gas, en la tecla dibujada y en la
 * palanca táctil una hélice que no tienen. «¿Para qué el icono de la hélice?»,
 * mirando la cabina de un cuatrirreactor. Y es la regla 4 del AGENTS.md: quien
 * vea aquí una hélice en un 747 tiene que desaprenderlo el día que se asome a
 * la ventanilla y vea el motor de verdad, que es exactamente esto — un aro
 * gordo y, dentro, un disco de palas curvas alrededor del cono.
 *
 * Ocho palas y no las veintitantas de un fan real: es lo que cabe a quince
 * píxeles sin volverse un borrón. Van curvadas, que es lo que distingue un fan
 * de una hélice de un vistazo, y el aro no gira porque la góndola no gira.
 *
 * Devuelve dos piezas porque el pictograma hace girar las palas y deja quieto
 * el aro; los botones las pintan juntas.
 */
export function fan(
  cx: number,
  cy: number,
  r: number,
): { aro: string; palas: string } {
  const dentro = r * 0.8;
  const aro = `<path fill-rule="evenodd" d="M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z
      M${cx - dentro} ${cy} a${dentro} ${dentro} 0 1 0 ${2 * dentro} 0 a${dentro} ${dentro} 0 1 0 ${-2 * dentro} 0 Z" />`;
  // Una pala apuntando arriba, en un radio de 1, y se reparte girándola.
  const q = r * 0.74;
  const f = (n: number): string => (n * q).toFixed(2);
  const pala = `M${f(-0.14)} ${f(-0.3)} L${f(0.16)} ${f(-0.3)} Q${f(0.38)} ${f(-0.62)} ${f(0.44)} ${f(-0.97)}
    L${f(0.1)} ${f(-1)} Q${f(0.02)} ${f(-0.62)} ${f(-0.14)} ${f(-0.3)} Z`;
  const palas =
    Array.from(
      { length: 8 },
      (_, i) =>
        `<path d="${pala}" transform="translate(${cx} ${cy}) rotate(${i * 45})" />`,
    ).join("") + `<circle cx="${cx}" cy="${cy}" r="${(q * 0.36).toFixed(2)}" />`;
  return { aro, palas };
}

/** El motor de este avión, entero, centrado en (cx, cy) y de radio r. */
export function dibujoDelMotor(
  chorro: boolean,
  cx: number,
  cy: number,
  r: number,
): string {
  if (!chorro) return palasDeHelice(cx, cy, r);
  const { aro, palas } = fan(cx, cy, r);
  return aro + palas;
}

const FLECHA_MAS = "M20 1.5 L24 10 H16 Z";
const FLECHA_MENOS = "M20 22.5 L16 14 H24 Z";

/** Más motor: el motor de este avión con la flecha hacia arriba. */
export const motorMas = (chorro: boolean): string =>
  conFlecha(dibujoDelMotor(chorro, 9, 12, chorro ? 8.4 : 10), FLECHA_MAS);
/** Menos motor: el mismo motor con la flecha hacia abajo. */
export const motorMenos = (chorro: boolean): string =>
  conFlecha(dibujoDelMotor(chorro, 9, 12, chorro ? 8.4 : 10), FLECHA_MENOS);

/** Los de hélice, que son los de siempre y los que salen si no se sabe el avión. */
export const HELICE_MAS = motorMas(false);
export const HELICE_MENOS = motorMenos(false);

/**
 * Los dos dibujos de la palanca táctil del gas: el motor grande arriba —más— y
 * pequeño abajo —menos—, en su lienzo alto de 24 por 60.
 */
export const dibujoDelGasTactil = (chorro: boolean): string =>
  dibujoDelMotor(chorro, 12, 13, chorro ? 10.4 : 13) +
  dibujoDelMotor(chorro, 12, 48.5, chorro ? 5.4 : 7);

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
  /** El tope de Vref en la vía. Ver el marcado. */
  private vrefMark: SVGElement | null = null;
  private altPlane: SVGElement | null = null;
  private propeller: SVGElement | null = null;
  private horizonte: SVGElement | null = null;

  /** Giro acumulado de la hélice, en grados. */
  private spin = 0;

  /** @param chorro si el avión de hoy es de reactor. Ver `fan`. */
  static markup(chorro = false): string {
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
            <!--
              **Y la marca de a qué velocidad se aterriza.**

              La vía decía dónde estás y no decía **dónde hay que estar**. El
              avioncito se teñía de verde al acertar, que es avisar después:
              sirve para corregir, no para apuntar. Y sin nada a lo que apuntar
              solo queda tantear — con un avión de fuselaje ancho, cada tanteo
              que se pasa de lento acaba en el agua. Contado jugando: «me hace
              ir tan lento que me caigo al agua».

              La velocidad de aproximación de este avión cae en el veinticinco
              por ciento del recorrido, muy cerca de la tortuga, y eso no lo
              adivina nadie. Ahora hay un tope ahí: se pone el avioncito encima
              de la marca y ya está. Sin leer, sin números y sin saber lo que
              es una Vref.

              **Y solo cuando significa algo**, que es la regla de esta escala:
              fuera de la aproximación la velocidad no tiene un valor bueno y
              marcar uno sería mentir. Aparece con la banda —bajando hacia el
              suelo— y se va con ella. Ver bandaDeVelocidad en flight/.
            -->
            <line class="picto__vref" data-picto="vref" x1="20" y1="14" x2="20" y2="24" />
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
            ${
              chorro
                ? `${fan(17, 17, 16).aro.replace("<path ", '<path class="picto__helice" ')}
                   <g class="picto__helice" data-picto="prop">${fan(17, 17, 16).palas}</g>`
                : `<g class="picto__helice" data-picto="prop">${palasDeHelice(17, 17, 15)}</g>
                   <circle class="picto__buje" cx="17" cy="17" r="3.2" />`
            }
          </svg>
        </div>
      </div>
    `;
  }

  bind(root: HTMLElement): void {
    this.root = root.querySelector('[data-hud="pictos"]');
    this.speedMark = this.pick("speed");
    this.vrefMark = this.pick("vref");
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
    /**
     * Dónde cae la velocidad de aproximación en esta misma escala, de 0 a 1,
     * o `null` si aquí no hay aproximación que marcar.
     *
     * Viene ya normalizada por quien llama, con la misma cuenta que `speed`:
     * dos escalas para la misma vía es la vía rápida a que la marca y el
     * avioncito digan cosas distintas del mismo número.
     */
    vref: number | null = null,
  ): void {
    if (!this.root) return;

    this.speedMark?.setAttribute(
      "transform",
      `translate(${20 + clamp01(speed) * 60} 11)`,
    );

    // La marca de Vref: donde hay que poner el avioncito para aterrizar.
    if (this.vrefMark) {
      const hay = vref !== null && banda !== null;
      this.vrefMark.setAttribute("visibility", hay ? "visible" : "hidden");
      if (hay) {
        const x = 20 + clamp01(vref) * 60;
        this.vrefMark.setAttribute("x1", String(x));
        this.vrefMark.setAttribute("x2", String(x));
      }
    }
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
