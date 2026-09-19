/**
 * La marca de Granja Óga en las pantallas que no son el vuelo.
 *
 * Vive en su propio módulo por lo mismo que cualquier otra regla de esta casa:
 * porque hay **dos** pantallas antes de volar —la de pilotos y el hangar— y
 * una marca que se escribe dos veces acaba siendo dos marcas. Lo que se pidió
 * es continuidad: «debería estar presente la granja y su logo en varios
 * lugares, hay que mostrar el producto con cierta continuidad».
 *
 * Y lo que **no** lleva ninguna pantalla de vuelo: durante el vuelo no hay
 * sello, ni palabra, ni pie. La ventana es el instrumento más importante que
 * hay, y una marca encima de ella estorba. La marca se va a donde estaría de
 * verdad — en la cola del avión y en el portón del hangar.
 */

import { t } from "../i18n";

/**
 * El cielo del hangar: Paraguay al atardecer visto desde la ventanilla.
 *
 * El hangar era un degradado plano y funcionaba, pero parecía una
 * herramienta y no un producto. Pedido así: «algún fondo de pantalla para
 * ese index que se vea bonito y llamativo».
 *
 * Tres decisiones que no son de gusto:
 *
 * - **La paleta no crece.** La profundidad de los cerros son tres opacidades
 *   del mismo verde bosque, no tres verdes nuevos. Un fondo que añade colores
 *   se lleva por delante la semántica cerrada del resto del juego.
 * - **La calidez vive a la derecha**, entre el sesenta y el noventa por
 *   ciento del ancho, para que el tercio de abajo en el medio —donde está el
 *   botón de despegar— siga siendo lo más oscuro de la pantalla. El botón es
 *   terracota: no puede tener con quién pelear.
 * - **Se mueve una sola cosa**, el avioncito, y se mueve con transform. Es lo
 *   que le dice a alguien de cuatro años «acá se vuela» sin una letra, y es
 *   lo único que cuesta fotogramas. Con movimiento reducido, desaparece.
 *
 * Y lo que **no** lleva, que costó decidirlo: ninguna pista. Si aparece una
 * pista hay que señalizarla como una de verdad —umbrales, designador, eje— y
 * en un fondo decorativo eso no se puede sin mentir. Por eso el fondo es
 * campo, y las pistas viven solo en las tarjetas, dibujadas en serio.
 */
export function cielo(): string {
  return `
    <div class="cielo" aria-hidden="true">
      <svg class="cielo__svg" viewBox="0 0 1440 810"
           preserveAspectRatio="xMidYMax slice" focusable="false">
        <defs>
          <!--
            El cielo, de arriba abajo: verde bosque en lo alto y calentándose
            hacia el horizonte. Es el orden de verdad de un atardecer, y es lo
            que deja la mitad de arriba quieta para el título.
          -->
          <linearGradient id="cielo-alto" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--verde-bosque)" />
            <stop offset="0.58" stop-color="var(--verde-bosque)" />
            <stop offset="1" stop-color="var(--ocre)" stop-opacity="0.35" />
          </linearGradient>
          <!--
            Y la bruma, centrada en el sol. Que la calidez nazca del sol y no
            de una esquina cualquiera es lo que hace que se lea como luz.
          -->
          <radialGradient id="cielo-bruma" cx="0.70" cy="0.73" r="0.52">
            <stop offset="0" stop-color="var(--ocre)" stop-opacity="0.75" />
            <stop offset="0.45" stop-color="var(--terracota)" stop-opacity="0.35" />
            <stop offset="1" stop-color="var(--terracota)" stop-opacity="0" />
          </radialGradient>
        </defs>

        <rect width="1440" height="810" fill="url(#cielo-alto)" />
        <ellipse cx="1010" cy="590" rx="820" ry="360" fill="url(#cielo-bruma)" />

        <g fill="var(--beige)">
          <ellipse cx="280" cy="150" rx="150" ry="24" opacity="0.10" />
          <ellipse cx="1150" cy="210" rx="210" ry="30" opacity="0.08" />
          <ellipse cx="720" cy="80" rx="120" ry="17" opacity="0.07" />
          <ellipse cx="470" cy="288" rx="90" ry="14" opacity="0.06" />
        </g>

        <!-- El sol, apoyado en el primer cerro y medio escondido detrás. -->
        <circle cx="1010" cy="596" r="58" fill="var(--terracota)" opacity="0.9" />

        <!--
          Los cerros, en tierra y no en verde.

          Kimi los proponía en el mismo verde del cielo, a tres opacidades. Se
          pintó y no se veían: mismo color sobre mismo color no hace relieve, y
          los cerros solo asomaban donde les daba la bruma. En tierra —que es
          el color que ya usa el juego para el suelo— cada plano se separa del
          de atrás y el horizonte aparece solo.
        -->
        <path fill="var(--barro-claro)" opacity="0.72"
              d="M0 604 C 260 566, 460 610, 720 588 C 990 564, 1180 602, 1440 572 L1440 810 L0 810 Z" />
        <path fill="var(--barro)" opacity="0.88"
              d="M0 668 C 210 642, 430 690, 710 664 C 1000 638, 1210 666, 1440 642 L1440 810 L0 810 Z" />
        <rect y="742" width="1440" height="68" fill="var(--barro)" />

        <!--
          El molino: la granja se anuncia sin una letra, que es como tiene que
          anunciarse todo aquí. En beige apagado para que se recorte contra la
          tierra.
        -->
        <g stroke="var(--beige)" stroke-width="5" fill="none" opacity="0.30"
           stroke-linecap="round">
          <path d="M158 742 L176 640 L194 742" />
          <circle cx="176" cy="636" r="20" />
          <path d="M176 616 L176 656 M156 636 L196 636 M162 622 L190 650 M190 622 L162 650"
                stroke-width="4" />
        </g>

        <g class="cielo__avion">
          <path d="M-22 0 L-194 0" fill="none" stroke="var(--beige)"
                stroke-opacity="0.5" stroke-width="3" stroke-dasharray="1 12"
                stroke-linecap="round" />
          <ellipse cx="0" cy="0" rx="17" ry="4.5" fill="var(--beige)" />
          <path fill="var(--beige)" d="M-1 -3 L-16 -15 L-8 -15 L4 -3 Z" />
          <path fill="var(--beige)" d="M-14 -2 L-20 -9 L-16 -9.5 L-10 -2 Z" />
        </g>
      </svg>
    </div>`;
}

/**
 * El sello de Granja Óga: avión sobre el horizonte, en un cuadrado terracota.
 *
 * Silueta de avión de verdad y no una mascota con cara. La tentación de
 * «Granja» era una gallina, y la regla de que lo que se enseña es real vale
 * también para el logo: quien vea este sello y luego vea un avión tiene que
 * reconocer lo mismo.
 */
export function sello(lado: number): string {
  return `
  <svg class="sello" viewBox="0 0 48 48" width="${lado}" height="${lado}"
       aria-hidden="true">
    <rect x="1" y="1" width="46" height="46" rx="13" fill="var(--terracota)" />
    <ellipse cx="24" cy="21" rx="14" ry="3.8" fill="var(--beige)" />
    <path fill="var(--beige)" d="M23 19 L12 9 L16 9 L26 18 Z" />
    <path fill="var(--beige)" d="M31 19 L36 14 L34 13 L29 18 Z" />
    <path d="M8 35 Q24 27 40 35" stroke="var(--ocre)" stroke-width="3"
          fill="none" stroke-linecap="round" />
  </svg>`;
}

/**
 * El pie: quién hizo esto y desde dónde.
 *
 * Pedido tal cual: «un pie de página que diga Granja Óga, hecho en Paraguay»
 * y «alguna referencia a Desarrollado por Oksigenia con enlace».
 *
 * Y no parece un aviso legal por tres cosas concretas: nada en mayúsculas,
 * nada en gris de diez píxeles, y la última línea es una promesa en voseo en
 * vez de letra chica. Un pie de cuatro columnas con privacidad y términos
 * sería mentira estética: este juego no recoge nada que avisar.
 *
 * El sitio se escribe **Capiibary** —municipalidad de San Pedro, que es
 * donde está la granja de verdad— por la misma regla que lo demás.
 */
/**
 * La marca arriba a la izquierda: sello y palabra.
 *
 * Va en las dos pantallas de antes de volar, en el mismo sitio y al mismo
 * tamaño en las dos. Ése es todo el truco de la continuidad.
 */
export function marca(): string {
  return `
    <a class="marca" href="https://granjaoga.com/" rel="noopener">
      ${sello(40)}
      <span class="marca__palabra">Granja Óga</span>
    </a>`;
}

export function pie(): string {
  return `
  <footer class="pie">
    <a class="pie__marca" href="https://granjaoga.com/" rel="noopener">
      ${sello(24)}
      <span>Granja Óga</span>
    </a>
    <span class="pie__hecho">${t("pie.hecho")}</span>
    <a class="pie__enlace" href="https://oksigenia.com" rel="noopener">
      ${t("pie.oksigenia")}
    </a>
    <a class="pie__enlace" href="https://github.com/OksigeniaSL/oga-veve"
       rel="noopener">${t("pie.codigo")}</a>
    <span class="pie__promesa">${t("pie.promesa")}</span>
  </footer>`;
}
