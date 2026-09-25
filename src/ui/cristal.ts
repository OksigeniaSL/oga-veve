/**
 * Las pantallas de cristal: el cuadro de los aviones que llevan cristal.
 *
 * Un turbohélice de línea y un reactor no llevan esferas, y fingir que sí es
 * enseñar una cabina que no existe. Lo que llevan son cintas: **ventanas sobre
 * una magnitud que fluye**. El puntero no se mueve nunca; lo que pasa por
 * delante es el mundo. Esa es la diferencia entera entre un instrumento vivo y
 * una cifra que salta, y es la razón de que aquí no haya ni un número suelto.
 *
 * Tres pantallas y lo que lleva cada una:
 *
 * - **Actitud** — cinta de velocidad, horizonte, cinta de altitud, variómetro
 *   y la referencia de rumbo. Los seis instrumentos clásicos, en las mismas
 *   posiciones relativas que en la avioneta pero como regiones de una pantalla
 *   en vez de como esferas. Ese parecido **es** el hallazgo del juego: quien
 *   aprendió a leer una avioneta sabe leer un Boeing.
 * - **Navegación** — la rosa de rumbo completa, la ruta en magenta y el viento
 *   en cian. Solo en los de línea; el de cristal lleva la rosa dentro de la de
 *   actitud, porque **una sola referencia de rumbo por avión**.
 * - **Motores** — la firma de cada avión. Dos agujas en el mediano y cuatro en
 *   el grande, que es al 747 lo que la joroba al fuselaje.
 *
 * Las cintas se dibujan **una sola vez, enteras**, y luego se desplazan. No se
 * vuelven a generar en cada imagen: además de costar, redondear el dibujo en
 * cada cuadro es justo lo que hace temblar una cinta en reposo, y la calma
 * también es información.
 */

import type { AircraftConfig } from "../flight/aircraft";
import { PALETA } from "./paleta";
import { QUIETA_LA_ALTITUD, marcasDeCinta, rodillo } from "./cinta";
import {
  marca,
  MARCA_CIFRA,
  MARCA_CON_SU_APARATO,
  MARCA_ROTULO,
} from "./familia";
import type { Cuadro } from "./cuadro";
import { ANCLA_DE_ACTITUD, patasDe } from "./familia";

/** Píxeles por nudo en la cinta de velocidad. */
export const POR_NUDO = 4;
/** Píxeles por pie en la de altitud. */
export const POR_PIE = 0.5;
/** Píxeles por grado en la de rumbo. */
export const POR_GRADO = 3;
/**
 * Hasta dónde llega la cinta de altitud, en pies.
 *
 * Cincuenta mil, que está por encima de donde llega el avión más alto de la
 * flota con sitio de sobra. Si la cinta se acabara, lo que pasaría es que las
 * marcas dejarían de dibujarse y la ventana se quedaría en negro sin que nada
 * fallara — la peor clase de tope.
 */
export const TECHO_DE_CINTA = 50000;
/** De cuánto en cuánto está grabado el tambor de la altitud. */
export const PASO_DE_TAMBOR = 20;

/**
 * Un número que no se repite, para los recortes.
 *
 * Un `id` de SVG vale para **todo el documento**, así que dos cuadros en la
 * misma página comparten recorte: el segundo se recorta con la caja del
 * primero y sale mal sin que nada falle. En el juego solo hay un cuadro a la
 * vez y por eso no se notaba, pero la página que los enseña los seis a la vez
 * —`scripts/ver-cuadros.html`— los tiene todos juntos, y ahí sí.
 */
let cuenta = 0;
function nuevoNombre(): string {
  return `cr${++cuenta}`;
}

const ANCHO_CINTA = 84;
const ANCHO_VSI = 22;
const ALTO_RUMBO = 44;

/** El hueco de actitud de una pantalla de horizonte de este ancho. */
export function huecoDeActitud(ancho: number): { x: number; ancho: number } {
  const x = ANCHO_CINTA + 8;
  return { x, ancho: ancho - ANCHO_CINTA * 2 - ANCHO_VSI - 16 };
}

// ── La pantalla de actitud ────────────────────────────────────────────

/**
 * @param rosa si la referencia de rumbo va aquí como rosa completa (cristal)
 *             o como cinta al pie (línea, que lleva la rosa en la de
 *             navegación).
 */
export function pantallaDeActitud(
  ancho: number,
  alto: number,
  c: Cuadro,
  opciones: { rosa: boolean; mach: boolean },
): string {
  const yo = nuevoNombre();
  const act = huecoDeActitud(ancho);
  const altoAct = opciones.rosa ? alto - 26 : alto - ALTO_RUMBO;
  const xAlt = ancho - ANCHO_VSI - ANCHO_CINTA;
  return `
    <rect data-fondo="pfd" width="${ancho}" height="${alto}" rx="6" fill="${PALETA.pantalla}" />
    ${horizonte(act.x, 0, act.ancho, altoAct, yo)}
    ${cintaDeVelocidad(0, 0, ANCHO_CINTA, altoAct, c, yo)}
    ${cintaDeAltitud(xAlt, 0, ANCHO_CINTA, altoAct, yo)}
    ${variometro(ancho - ANCHO_VSI, 0, ANCHO_VSI, altoAct, c)}
    ${
      opciones.rosa
        ? (() => {
            /*
             * La rosa vive **dentro** de la región de actitud, en su tercio de
             * abajo, como la de un cristal de verdad. Colocada a ojo se salía
             * de la pantalla por abajo y quedaba flotando sobre las cintas, que
             * es de las cosas que el reparto no ve: seguía cuadrando.
             */
            const rr = Math.min(act.ancho / 2 - 10, 82);
            return rosaDeRumbo(
              act.x + act.ancho / 2,
              altoAct - rr - 10,
              rr,
              true,
            );
          })()
        : cintaDeRumbo(act.x, alto - ALTO_RUMBO, act.ancho, ALTO_RUMBO, yo)
    }
    ${opciones.mach ? `<text data-cristal="mach" x="${ANCHO_CINTA / 2}" y="${alto - 8}" data-desde="4" class="cr__aux" text-anchor="middle"></text>` : ""}
    <text data-cristal="gs" x="${xAlt + ANCHO_CINTA / 2}" y="${alto - 8}" ${MARCA_ROTULO} class="cr__aux" text-anchor="middle"></text>
    ${radioaltimetro(act.x + act.ancho / 2, altoAct - 30)}
  `;
}

/**
 * El radioaltímetro: **cuánto hay hasta el suelo**, no hasta el mar.
 *
 * Aparece por debajo de dos mil quinientos pies y desaparece por encima, que es
 * como funciona el de verdad: mientras sobra altura no dice nada, y en cuanto
 * empieza a faltar es el único número que se mira. La diferencia con el
 * altímetro de al lado es la lección entera —uno mide sobre el mar y el otro
 * sobre lo que tenés debajo— y en un sitio como La Palma o El Hierro esa
 * diferencia son seiscientos metros de montaña.
 *
 * Y se pone ámbar en los últimos doscientos pies: ahí ya no es un dato, es un
 * aviso.
 */
function radioaltimetro(cx: number, y: number): string {
  return `
    <g data-cristal="radio" data-desde="4" visibility="hidden">
      <text x="${cx}" y="${y}" class="cr__radio" text-anchor="middle"></text>
      <text x="${cx}" y="${y + 13}" ${MARCA_ROTULO} class="cr__rotulo cr__rotulo--menudo"
            text-anchor="middle">RA</text>
    </g>
  `;
}

/**
 * El horizonte.
 *
 * Colores planos y un filo de luz de un píxel, nunca un degradado: un
 * degradado de cielo bandea feo a doce imágenes por segundo. Y el avioncito va
 * en amarillo porque tiene que leerse sobre el cielo **y** sobre la tierra, que
 * es exactamente por lo que los de verdad son amarillos.
 *
 * Es el instrumento más directo de la cabina: responde al momento. Meterle
 * retardo o un temblor decorativo sería enseñar mal.
 */
function horizonte(
  x: number,
  y: number,
  w: number,
  h: number,
  yo: string,
): string {
  const cx = w / 2;
  const cy = h * ANCLA_DE_ACTITUD;
  const porGrado = h / 46;
  let escala = "";
  for (let g = -30; g <= 30; g += 5) {
    if (g === 0) continue;
    const largo = g % 10 === 0 ? 34 : 17;
    escala += `<line x1="${cx - largo}" y1="${-g * porGrado}" x2="${cx + largo}" y2="${-g * porGrado}" class="cr__paso" />`;
    if (g % 10 === 0) {
      escala += `<text x="${cx - largo - 6}" y="${-g * porGrado + 4}" ${MARCA_CIFRA} class="cr__paso-cifra" text-anchor="end">${Math.abs(g)}</text>`;
      escala += `<text x="${cx + largo + 6}" y="${-g * porGrado + 4}" ${MARCA_CIFRA} class="cr__paso-cifra">${Math.abs(g)}</text>`;
    }
  }
  let arco = "";
  for (const g of [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60]) {
    const a = (g * Math.PI) / 180;
    const r1 = Math.abs(g) % 30 === 0 || Math.abs(g) === 45 ? 12 : 7;
    const r = cx * 0.82;
    arco += `<line x1="${cx + Math.sin(a) * r}" y1="${cy - Math.cos(a) * r}" x2="${cx + Math.sin(a) * (r + r1)}" y2="${cy - Math.cos(a) * (r + r1)}" class="cr__alabeo" />`;
  }
  return `
    <g transform="translate(${x} ${y})">
      <clipPath id="${yo}-act"><rect width="${w}" height="${h}" rx="4" /></clipPath>
      <g clip-path="url(#${yo}-act)">
        <g data-cristal="disco" data-cx="${cx}" data-cy="${cy}" data-porgrado="${porGrado}"
             transform="translate(0 ${cy})">
          <rect x="${-w}" y="${-h * 2}" width="${w * 3}" height="${h * 2}" fill="${PALETA.cielo}" />
          <rect x="${-w}" y="0" width="${w * 3}" height="${h * 2}" fill="${PALETA.tierra}" />
          <line x1="${-w}" y1="0" x2="${w * 2}" y2="0" class="cr__horizonte" />
          ${escala}
        </g>
        ${arco}
        <path class="cr__flecha-alabeo" d="M${cx} ${cy - cx * 0.8} l-7 -12 l14 0 Z" />
        <g data-cristal="deslizamiento" data-ampl="${cx * 0.4}" transform="translate(0 0)">
          <path class="cr__deslizamiento" d="M${cx - 8} ${cy - cx * 0.8 + 4} l16 0 l3 7 l-22 0 Z" />
        </g>
      </g>
      <path class="cr__simbolo" d="M${cx - 44} ${cy} l24 0 l0 10 M${cx + 44} ${cy} l-24 0 l0 10 M${cx - 4} ${cy} l8 0" />
      <rect data-cristal="perdida" width="${w}" height="${h}" rx="4" class="cr__alerta" visibility="hidden" />
    </g>
  `;
}

/** La cinta de velocidad, con los arcos de este avión metidos en el borde. */
function cintaDeVelocidad(
  x: number,
  y: number,
  w: number,
  h: number,
  c: Cuadro,
  yo: string,
): string {
  const tope = c.asiMax + 40;
  const marcas = marcasDeCinta({
    valor: tope / 2,
    paso: 10,
    rotulaCada: 2,
    porUnidad: POR_NUDO,
    alto: tope * POR_NUDO * 2,
    minimo: 0,
  });
  const tira = marcas
    .map((m) => {
      const yy = -m.valor * POR_NUDO;
      const largo = m.rotula ? 12 : 7;
      return (
        `<line x1="${w - largo}" y1="${yy}" x2="${w}" y2="${yy}" class="cr__marca" />` +
        (m.rotula
          ? `<text x="${w - 16}" y="${yy + 5}" ${MARCA_CIFRA} class="cr__cifra" text-anchor="end">${m.valor}</text>`
          : "")
      );
    })
    .join("");
  /*
   * Las bandas de color de la ficha, como franja vertical en el borde de
   * dentro. Son las velocidades **de este avión** —dónde empieza a volar y
   * dónde deja de ser buena idea—, no un adorno repetido de un avión a otro.
   */
  const banda = (
    desde: number,
    hasta: number,
    clase: string,
  ) => `<rect x="${w - 5}" y="${-hasta * c.asiMax * POR_NUDO}" width="5"
      height="${(hasta - desde) * c.asiMax * POR_NUDO}" class="${clase}" />`;
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${w}" height="${h}" rx="3" class="cr__ventana" />
      <clipPath id="${yo}-ias"><rect width="${w}" height="${h}" /></clipPath>
      <g clip-path="url(#${yo}-ias)">
        <g data-tira="ias" data-medio="${h / 2}" data-porunidad="${POR_NUDO}"
             transform="translate(0 ${h / 2})">
          ${banda(c.arcos.verde[0], c.arcos.verde[1], "cr__banda cr__banda--verde")}
          ${banda(c.arcos.ambar[0], c.arcos.ambar[1], "cr__banda cr__banda--ambar")}
          ${banda(c.arcos.rojo[0], c.arcos.rojo[1], "cr__banda cr__banda--roja")}
          ${tira}
          <g data-bug="v1" data-desde="4">${bug(w)}</g>
          <g data-bug="vr" data-desde="4">${bug(w)}</g>
          <g data-bug="vref" data-desde="4">${bug(w)}</g>
        </g>
        <rect data-tendencia="ias" data-medio="${h / 2}" data-porunidad="${POR_NUDO}"
              x="${w - 3}" y="${h / 2}" width="3" height="0" class="cr__tendencia" />
      </g>
      ${punteroDeCinta(w, h, true)}
      ${lectura(w, h, "ias")}
      ${rotuloDeCinta(w, h, "IAS", "KT")}
    </g>
  `;
}

/**
 * El rótulo de una cinta: qué instrumento es y en qué unidad va.
 *
 * **No estaba, y se notó a la primera pregunta.** Las esferas llevan IAS y ALT
 * desde siempre; las pantallas de cristal no llevaban nada, así que no había de
 * dónde deducir la unidad. Preguntado jugando, delante de un 2020 en la cinta
 * de altitud: «¿Tenerife está a 2020? ¿Esos son pies o metros?».
 *
 * Eran pies —Tenerife Norte está a 632,8 m, que son 2076— y la pregunta era
 * buena: el número solo no lo dice.
 *
 * El rótulo va en inglés aeronáutico y no se traduce nunca, que es la regla 3:
 * IAS y ALT son los mismos en toda cabina del mundo y quien juegue aquí se los
 * va a encontrar tal cual. Lo que se añade es **la unidad debajo**, en pequeño,
 * que es la glosa que sí se puede leer sin haber volado nunca.
 *
 * Y va arriba y abajo de la ventana y no en medio: en medio está la cifra, que
 * es lo que hay que poder leer de un vistazo.
 */
function rotuloDeCinta(
  w: number,
  h: number,
  que: string,
  unidad: string,
): string {
  return `
    <text x="${w / 2}" y="11" ${MARCA_ROTULO}
          class="cr__rotulo cr__rotulo--menudo" text-anchor="middle">${que}</text>
    <text x="${w / 2}" y="${h - 4}" ${MARCA_ROTULO}
          class="cr__rotulo cr__rotulo--menudo" text-anchor="middle">${unidad}</text>`;
}

/** Un bug de velocidad: una escuadra magenta pegada al borde de dentro. */
function bug(w: number): string {
  return `<path class="cr__bug" d="M${w} -7 l7 0 l0 14 l-7 0 Z" />`;
}

/**
 * El puntero de una cinta: **la línea de fe**, fija en el centro.
 *
 * En el peldaño de arriba queda escondido detrás de la caja de la cifra, y en
 * el primero es lo único que hay. Y con eso basta para volar: la aguja no dice
 * cuánto, dice **dónde** —en el verde o fuera de él—, que es exactamente lo que
 * se le pide a alguien de cuatro años. Un arco de color y algo que lo señala es
 * el instrumento más viejo que existe.
 */
function punteroDeCinta(w: number, h: number, haciaDentro: boolean): string {
  const x = haciaDentro ? w : 0;
  const s = haciaDentro ? -1 : 1;
  return `<path class="cr__fe-cinta" d="M${x} ${h / 2} l${s * 11} -7 l0 14 Z" />`;
}

/** La caja del valor de ahora: fija en el centro, con filete blanco. */
function lectura(w: number, h: number, que: string): string {
  /*
   * La caja lleva marca porque es **lo que parpadea** cuando la velocidad se
   * sale de sitio. Parpadea el marco, jamás los dígitos: el número tiene que
   * poder leerse siempre, y un número que parpadea es un número que la mitad
   * del tiempo no está.
   */
  return `
    <path data-alerta="${que}" ${MARCA_CIFRA} class="cr__caja" d="M0 ${h / 2 - 18} l${w} 0 l0 36 l${-w} 0 Z" />
    <text data-cristal="${que}" x="${w - 8}" y="${h / 2 + 9}" ${MARCA_CIFRA} class="cr__valor" text-anchor="end"></text>
  `;
}

/**
 * La cinta de altitud, con el tambor de los últimos dígitos.
 *
 * Los dos últimos ruedan en vez de saltar, como el de un altímetro de tambor
 * de verdad. Una cifra que salta es invisible para la atención de un niño; una
 * que rueda la captura.
 */
function cintaDeAltitud(
  x: number,
  y: number,
  w: number,
  h: number,
  yo: string,
): string {
  const marcas = marcasDeCinta({
    valor: TECHO_DE_CINTA / 2,
    paso: 100,
    rotulaCada: 2,
    porUnidad: POR_PIE,
    alto: TECHO_DE_CINTA * POR_PIE * 2,
    minimo: -1000,
  });
  const tira = marcas
    .map((m) => {
      const yy = -m.valor * POR_PIE;
      const largo = m.rotula ? 12 : 7;
      return (
        `<line x1="0" y1="${yy}" x2="${largo}" y2="${yy}" class="cr__marca" />` +
        (m.rotula
          ? `<text x="${largo + 4}" y="${yy + 5}" ${MARCA_CIFRA} class="cr__cifra">${m.valor}</text>`
          : "")
      );
    })
    .join("");
  const tambor = [-1, 0, 1]
    .map(
      (k) =>
        `<text data-tambor-cifra="${k + 1}" x="${w - 4}" y="${h / 2 + 9 + k * 26}" ${MARCA_CIFRA} class="cr__valor" text-anchor="end"></text>`,
    )
    .join("");
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${w}" height="${h}" rx="3" class="cr__ventana" />
      <clipPath id="${yo}-alt"><rect width="${w}" height="${h}" /></clipPath>
      <clipPath id="${yo}-tambor"><rect x="${w - 34}" y="${h / 2 - 16}" width="34" height="32" /></clipPath>
      <g clip-path="url(#${yo}-alt)">
        <g data-tira="alt" data-medio="${h / 2}" data-porunidad="${POR_PIE}"
             transform="translate(0 ${h / 2})">
          ${tira}
          <!-- La pista vive en el cero: quien juegue sin leer descubrirá que
               el suelo **está** en el cero antes de saber leer la altitud. -->
          <path class="cr__pista" d="M2 -1 l${w - 20} 0 l0 2 l${-(w - 20)} 0 Z" />
        </g>
        <rect data-tendencia="alt" data-medio="${h / 2}" data-porunidad="${POR_PIE}"
              x="0" y="${h / 2}" width="3" height="0" class="cr__tendencia" />
      </g>
      ${punteroDeCinta(w, h, false)}
      <path ${MARCA_CIFRA} class="cr__caja" d="M0 ${h / 2 - 18} l${w} 0 l0 36 l${-w} 0 Z" />
      <text data-cristal="alt" x="${w - 36}" y="${h / 2 + 9}" ${MARCA_CIFRA} class="cr__valor" text-anchor="end"></text>
      <g clip-path="url(#${yo}-tambor)"><g data-tambor="alt" data-paso="26">${tambor}</g></g>
      ${rotuloDeCinta(w, h, "ALT", "FT")}
      <!--
        **La ventanilla de presión, debajo de la cinta.**

        Es donde va en cualquier pantalla de vuelo del mundo, y es la
        información que a esta cabina le faltaba: un altímetro no mide altura,
        mide presión, y traduce suponiendo un día concreto. Cuál es ese día lo
        dice este número.

        En ámbar cuando no es el del sitio, y **no se castiga**: el
        instrumento sigue funcionando y mintiendo, que es exactamente lo que
        hace uno de verdad. Ver flight/altimetro.ts.
      -->
      <text data-cristal="qnh" x="${w / 2}" y="${h - 6}" ${MARCA_CIFRA}
            class="cr__qnh" text-anchor="middle"></text>
    </g>
  `;
}

/** El variómetro: una franja al borde de la cinta de altitud. */
function variometro(
  x: number,
  y: number,
  w: number,
  h: number,
  c: Cuadro,
): string {
  let marcas = "";
  for (let i = -2; i <= 2; i++) {
    const yy = h / 2 - (i / 2) * (h / 2 - 10);
    marcas += `<line x1="0" y1="${yy}" x2="${i % 2 === 0 ? 8 : 5}" y2="${yy}" class="cr__marca" />`;
  }
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${w}" height="${h}" rx="3" class="cr__ventana" />
      ${marcas}
      <text x="${w / 2}" y="11" ${MARCA_ROTULO} class="cr__rotulo cr__rotulo--menudo" text-anchor="middle">VS</text>
      <text x="${w / 2}" y="${h - 4}" ${MARCA_CIFRA} class="cr__rotulo cr__rotulo--menudo" text-anchor="middle">${Math.round(c.vsiMax / 1000)}</text>
      <g data-cristal="vsi" data-ampl="${h / 2 - 10}" data-max="${c.vsiMax}">
        <path class="cr__aguja-vsi" d="M0 ${h / 2} l${w} 0" />
      </g>
    </g>
  `;
}

/** La cinta de rumbo al pie del horizonte: treinta y cinco grados a cada lado. */
function cintaDeRumbo(
  x: number,
  y: number,
  w: number,
  h: number,
  yo: string,
): string {
  let tira = "";
  for (let g = 0; g <= 720; g += 5) {
    const xx = g * POR_GRADO;
    const larga = g % 10 === 0;
    tira += `<line x1="${xx}" y1="0" x2="${xx}" y2="${larga ? 9 : 5}" class="cr__marca" />`;
    if (g % 30 === 0) {
      tira += `<text x="${xx}" y="${h - 10}" ${MARCA_CIFRA} class="cr__cifra" text-anchor="middle">${((g % 360) / 10).toFixed(0).padStart(2, "0")}</text>`;
    }
  }
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${w}" height="${h}" rx="3" class="cr__ventana" />
      <clipPath id="${yo}-hdg"><rect width="${w}" height="${h}" /></clipPath>
      <g clip-path="url(#${yo}-hdg)">
        <g data-tira="hdg" data-medio="${w / 2}" data-porunidad="${POR_GRADO}"
             transform="translate(${w / 2} 0)">
          ${tira}
          <g data-bug="hdg"><path class="cr__bug" d="M-7 0 l14 0 l0 7 l-7 -5 l-7 5 Z" /></g>
        </g>
      </g>
      <path ${MARCA_CIFRA} class="cr__caja" d="M${w / 2 - 26} 0 l52 0 l0 20 l-52 0 Z" />
      <text data-cristal="hdg" x="${w / 2}" y="${15}" ${MARCA_CIFRA} class="cr__valor" text-anchor="middle"></text>
      <path class="cr__fe" d="M${w / 2} 0 l0 ${h}" />
    </g>
  `;
}

/**
 * El mundo debajo de la rosa: la pista, el eje de entrada y los otros aviones.
 *
 * **Estaba solo en las pantallas de la cabina.** Se hizo mirando una captura
 * de cabina y ahí se quedó, mientras el cuadro plano —el que se ve desde
 * fuera, que es desde donde se vuela la mayor parte del tiempo— seguía con la
 * brújula sobre el fondo vacío. Dicho al llegar a Lanzarote: «no veo la
 * pista». Es el mismo error de siempre, arreglar la superficie que uno tiene
 * delante; ver `familia.ts` y el porqué de que las reglas vivan fuera.
 *
 * Aquí se dibuja el hueco con sus piezas quietas, y `Tablero.carta` las mueve.
 * Las cuentas son las de `ui/carta.ts`, las mismas que usa la cabina: el
 * dibujo puede ser distinto —SVG y lienzo— pero **dónde va cada cosa, no**.
 *
 * Va **encima de la rosa y debajo del avión**. Puesta debajo de la rosa —que
 * es donde parece que debe ir, porque el mapa es el fondo— no se veía nada: el
 * disco de la rosa es opaco y se la comía entera. En el lienzo de la cabina no
 * pasaba porque allí el disco va al treinta y cinco por ciento, y ése es
 * exactamente el tipo de diferencia que hace que dos superficies que deberían
 * enseñar lo mismo enseñen cosas distintas.
 */
function carta(cx: number, cy: number, r: number): string {
  const recorte = nuevoNombre();
  // Un recorte al círculo de la rosa: una pista que asome por fuera deja de
  // ser una carta y pasa a ser una mancha.
  const rombos = Array.from(
    { length: CUANTOS_OTROS },
    (_, i) =>
      `<path data-carta="otro-${i}" class="cr__otro" visibility="hidden" d="M0 -6 L6 0 L0 6 L-6 0 Z" />`,
  ).join("");
  return `
    <!--
      **El recorte, en el sitio del grupo y no en el de la pantalla.**

      Un recorte se aplica en el espacio del elemento que lo usa, y ese
      grupo ya va trasladado al centro de la rosa: con el círculo escrito en
      coordenadas de pantalla acababa al doble de distancia, o sea fuera, y
      recortaba la carta **entera**. Se veía como si no se dibujara nada, que
      es la peor forma de fallar: todo correcto en el árbol y negro en la
      pantalla.
    -->
    <clipPath id="${recorte}"><circle cx="0" cy="0" r="${r}" /></clipPath>
    <g data-carta="grupo" transform="translate(${cx} ${cy})" clip-path="url(#${recorte})">
      <!--
        El radar meteorológico, debajo de todo lo demás: la tormenta es el
        fondo sobre el que se decide, y la pista y los tráficos tienen que
        verse encima. Un radar que tapa la pista deja de ser un instrumento de
        decidir. Ver flight/tormentas.ts.
      -->
      <g data-carta="radar"></g>
      <line data-carta="eje" class="cr__eje" visibility="hidden" />
      <line data-carta="pista" class="cr__pista" visibility="hidden" />
      ${rombos}
      <!--
        **El aeropuerto de destino.**

        Un círculo con una barra dentro, que es el símbolo de aeródromo de
        cualquier carta del mundo: el círculo es el campo y la barra, la pista.
        Quien lo aprenda aquí lo va a reconocer en una carta de verdad, que es
        la prueba de la regla 4.

        Y cuando todavía cae fuera del alcance de la carta, el mismo símbolo se
        pega al borde con una punta de flecha: el sitio no se ve, pero se sabe
        por dónde cae. Ver Dibujo.destino en ui/carta.ts.
      -->
      <!--
        **El alternativo, debajo del destino y en cian.**

        El mismo símbolo de aeródromo —es un aeródromo— en el color de lo
        que está preparado y no activo, y con su indicativo al lado. Va antes
        que el destino para que, si los dos caen juntos en el borde, el que se
        vea entero sea el destino.
      -->
      <g data-carta="alterno" class="cr__alterno" visibility="hidden">
        <circle cx="0" cy="0" r="6" />
        <line x1="-3.8" y1="0" x2="3.8" y2="0" />
        <!-- A la izquierda del símbolo, y el del destino a la derecha: los
             dos suelen caer juntos en el borde, y con los dos rótulos del
             mismo lado se montaban uno encima del otro. -->
        <text data-carta="alterno-oaci" x="-9" y="4" ${MARCA_ROTULO}
              class="cr__oaci cr__oaci--alterno" text-anchor="end"></text>
      </g>
      <!--
        Y el destino lleva al lado su indicativo, que es como se rotula un
        aeródromo en una carta de verdad: con sus cuatro letras.
      -->
      <g data-carta="destino" class="cr__destino" visibility="hidden">
        <circle cx="0" cy="0" r="7" />
        <line x1="-4.5" y1="0" x2="4.5" y2="0" />
        <path data-carta="destino-punta" d="M0 -13 L5 -7 L-5 -7 Z"
              visibility="hidden" />
        <text data-carta="destino-oaci" x="10" y="4" ${MARCA_ROTULO}
              class="cr__oaci"></text>
      </g>
    </g>
    <!--
      La cifra del rango lleva «NM» pegado, así que es rótulo y no cifra: lo
      que hay que saber leer para entenderla es la palabra. Misma regla que
      «2.3 NM» y «GS 108»; ver esCifra en familia.ts. En el primer peldaño los
      anillos se quedan sin número, que es lo que toca — ahí la carta son
      formas y la pista es la barra blanca.
    -->
    <text data-cristal="rango" x="${cx + r - 4}" y="${cy + r + 14}"
          ${MARCA_ROTULO} class="cr__rotulo cr__rotulo--menudo" text-anchor="end"></text>
    <!--
      Y las millas que faltan para el destino, en la esquina de enfrente del
      rango. Con «NM» pegado, que es lo que la hace legible: el rótulo es la
      palabra, no la cifra.
    -->
    <text data-cristal="millas-destino" x="${cx - r + 4}" y="${cy + r + 14}"
          ${MARCA_ROTULO} class="cr__rotulo cr__rotulo--menudo"></text>`;
}

/** Cuántos tráficos caben en la carta. Ver `CUANTOS` en `flight/radio.ts`. */
export const CUANTOS_OTROS = 4;

/**
 * La rosa de rumbo. Gira la carta, no el avión: lo que se mueve es el mundo.
 *
 * @param conAvion si lleva el avioncito fijo en el centro (la del horizonte) o
 *                 no (la de navegación, que lo lleva abajo).
 */
export function rosaDeRumbo(
  cx: number,
  cy: number,
  r: number,
  conAvion: boolean,
): string {
  let carta = `<circle cx="0" cy="0" r="${r}" class="cr__rosa" />`;
  for (let g = 0; g < 360; g += 5) {
    const a = (g * Math.PI) / 180;
    const larga = g % 10 === 0;
    const r1 = r - (larga ? 10 : 6);
    carta += `<line x1="${Math.sin(a) * r1}" y1="${-Math.cos(a) * r1}" x2="${Math.sin(a) * r}" y2="${-Math.cos(a) * r}" class="cr__marca" />`;
    if (g % 30 === 0) {
      const letra =
        g === 0
          ? "N"
          : g === 90
            ? "E"
            : g === 180
              ? "S"
              : g === 270
                ? "W"
                : String(g / 10);
      carta += `<text x="${Math.sin(a) * (r - 22)}" y="${-Math.cos(a) * (r - 22) + 5}" ${marca(letra)} class="cr__cifra" text-anchor="middle">${letra}</text>`;
    }
  }
  return `
    <g transform="translate(${cx} ${cy})">
      <circle cx="0" cy="0" r="${r + 3}" class="cr__rosa-caja" />
      <g data-cristal="rosa" data-radio="${r}">${carta}
        <g data-bug="rosa"><path class="cr__bug" d="M0 ${-r} l-6 -9 l12 0 Z" /></g>
      </g>
      <path class="cr__fe" d="M0 ${-r - 4} l0 10" />
      ${conAvion ? `<path class="cr__simbolo" d="M0 -12 l0 24 M-10 4 l20 0 M-5 12 l10 0" />` : ""}
    </g>
  `;
}

// ── La pantalla de navegación ─────────────────────────────────────────

/** La rosa grande, la ruta en magenta y el viento en cian. */
export function pantallaDeNavegacion(ancho: number, alto: number): string {
  const cx = ancho / 2;
  const cy = alto * 0.54;
  /*
   * La rosa cabe **entera**, con su corona de cifras dentro de la pantalla.
   * Puesta a ojo se salía por abajo y pisaba la chapa del avión, que es la
   * clase de cosa que solo se ve mirando: el reparto seguía cuadrando.
   */
  const r = Math.min(ancho / 2 - 34, cy - 30, alto - cy - 30);
  let arcos = "";
  for (const f of [0.5, 0.75]) {
    arcos += `<circle cx="${cx}" cy="${cy}" r="${r * f}" class="cr__arco-rango" />`;
  }
  return `
    <rect data-fondo="nd" width="${ancho}" height="${alto}" rx="6" fill="${PALETA.pantalla}" />
    ${arcos}
    ${rosaDeRumbo(cx, cy, r, false)}
    ${carta(cx, cy, r)}
    <g data-cristal="ruta" transform="translate(${cx} ${cy})">
      <path class="cr__ruta" d="M0 0 l0 0" />
    </g>
    <path class="cr__simbolo" transform="translate(${cx} ${cy})"
          d="M0 -14 l0 26 M-12 4 l24 0 M-6 12 l12 0" />
    <text data-cristal="nd-rumbo" x="${cx}" y="22" ${MARCA_CIFRA} class="cr__valor" text-anchor="middle"></text>
    <text x="${cx}" y="36" ${MARCA_ROTULO} class="cr__rotulo" text-anchor="middle">HDG</text>
    <text data-cristal="viento" x="12" y="22" ${MARCA_CIFRA} class="cr__aux"></text>
    <text data-cristal="distancia" x="${ancho - 12}" y="22" ${MARCA_ROTULO} class="cr__aux" text-anchor="end"></text>
  `;
}

/**
 * El depósito: cuánto queda y dónde empieza la reserva.
 *
 * Pedido jugando —«se echa de menos un indicador de combustible»— y es el
 * único instrumento del cuadro que cuenta hacia atrás, así que se dibuja como
 * lo que es: **un depósito que se vacía**. La barra se acorta, y eso se
 * entiende a los cuatro años sin una palabra encima, que es la regla de la
 * casa.
 *
 * Lo que enseña no es «queda poco»: es **la reserva**. La franja ámbar del
 * fondo está pintada donde empiezan los cuarenta y cinco minutos de ley, y no
 * se mueve. Ver bajar la barra hacia una raya que estaba ahí desde el
 * principio es la lección entera —se decide antes, con margen— y es lo
 * contrario de un aviso que salta cuando ya no hay nada que decidir.
 *
 * La franja se coloca desde fuera porque no es un porcentaje: son los kilos
 * que este avión concreto necesita para volar cuarenta y cinco minutos, y eso
 * depende de su motor. Ver `reservaEnKilos`.
 */
export function reglaDeCombustible(
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  const tumbada = w > h;
  const largo = tumbada ? w : h;
  /*
   * La barra crece desde el borde por el que se vacía: por la izquierda si
   * está tumbada y **desde abajo** si está de pie. Un depósito de pie que se
   * vaciara por abajo dejando el líquido arriba no se parecería a nada.
   */
  const fondo = tumbada
    ? `<rect data-combustible="reserva" x="0" y="0" width="0" height="${h}" />`
    : `<rect data-combustible="reserva" x="0" y="${h}" width="${w}" height="0" />`;
  const barra = tumbada
    ? `<rect data-combustible="barra" x="0" y="0" width="0" height="${h}" />`
    : `<rect data-combustible="barra" x="0" y="${h}" width="${w}" height="0" />`;
  /*
   * **Y la raya, encima de todo.**
   *
   * La franja sola no basta: mientras sobre combustible la barra la tapa
   * entera, y una meta que solo se ve cuando ya llegaste no es una meta. La
   * raya se ve desde el primer segundo, sobresale un poco por los dos lados
   * —como la marca roja de un manómetro— y es la que convierte el
   * instrumento en una cuenta atrás con final escrito.
   */
  const raya = tumbada
    ? `<line data-combustible="raya" x1="0" y1="-3" x2="0" y2="${h + 3}" />`
    : `<line data-combustible="raya" x1="-3" y1="${h}" x2="${w + 3}" y2="${h}" />`;
  return `
    <g data-cristal="combustible" data-largo="${largo}" data-tumbada="${tumbada ? 1 : 0}">
      <g transform="translate(${x} ${y})">
        <text x="${tumbada ? -10 : w / 2}" y="${tumbada ? h - 8 : -8}"
              ${MARCA_ROTULO} class="cr__rotulo"
              text-anchor="${tumbada ? "end" : "middle"}">FUEL</text>
        <rect width="${w}" height="${h}" rx="2" class="cr__ventana" />
        <g class="cr__reserva">${fondo}</g>
        <g class="cr__deposito">${barra}</g>
        <g class="cr__reserva-raya">${raya}</g>
        <text data-combustible="cifra"
              x="${tumbada ? w : w / 2}" y="${tumbada ? -6 : h + 16}"
              ${MARCA_CIFRA} class="cr__aux"
              text-anchor="${tumbada ? "end" : "middle"}"></text>
      </g>
    </g>
  `;
}

// ── La pantalla de motores ────────────────────────────────────────────

/**
 * El EICAS: una aguja por motor, los flaps y el tren.
 *
 * **Los instrumentos de motor tienen que ser aburridos.** Verdes y quietos el
 * noventa y nueve por ciento del tiempo; solo hablan cuando algo se sale de
 * rango. Esa quietud es lo que separa una cabina de línea de una máquina
 * recreativa, y es la razón de que aquí no parpadee nada porque sí.
 */
export function pantallaDeMotores(
  ancho: number,
  alto: number,
  c: Cuadro,
  a: AircraftConfig,
): string {
  const n = c.motores;
  /*
   * Las agujas ocupan la pantalla, y no una franja arriba con medio EICAS en
   * negro debajo. **Esto es la firma del avión**: cuatro columnas de N1 es al
   * grande lo que la joroba al fuselaje, y con cuatro agujas de estampilla no
   * se le nota nada.
   */
  const hueco = ancho - 24;
  const paso = hueco / n;
  const r = Math.min(paso / 2 - 5, 66);
  const cy = 34 + r;
  let diales = "";
  for (let i = 0; i < n; i++) {
    diales += dialDeMotor(12 + paso * (i + 0.5), cy, r, i);
  }
  /*
   * Los flaps ocupan el ancho de abajo en vez de una columna estrecha a un
   * lado: así las agujas se quedan con la pantalla entera —que es lo que hace
   * que cuatro columnas de N1 se vean como cuatro columnas de N1— y la regla
   * se lee del tirón, como la palanca que representa.
   */
  const patas = patasDe(a);
  const yTren = alto - 26;
  return `
    <rect data-fondo="eicas" width="${ancho}" height="${alto}" rx="6" fill="${PALETA.pantalla}" />
    <text x="${ancho / 2}" y="20" ${MARCA_ROTULO} class="cr__rotulo" text-anchor="middle">${c.rotulo}</text>
    ${diales}
    ${mandoDeMotor(12, cy + r + 46, hueco, n)}
    ${reglaDeCombustible(40, alto - 156, ancho - 80, 16)}
    ${reglaDeFlaps(40, alto - 96, ancho - 80, 26)}
    ${lucesDeTren(14, yTren, patas)}
    <text data-cristal="reversa" x="${ancho - 14}" y="${yTren + 13}"
          ${MARCA_CON_SU_APARATO} class="cr__reversa" text-anchor="end" visibility="hidden">REV</text>
  `;
}

/**
 * Lo que se le ha **pedido** a cada motor, debajo de lo que está **dando**.
 *
 * Es la lección entera de un reactor en una fila de barras: el mando se mueve
 * al momento y la aguja tarda tres segundos en alcanzarlo. Quien juega lo ve
 * —barra magenta arriba, aguja blanca persiguiéndola— y aprende sin que nadie
 * se lo diga que un avión pesado se vuela adelantándose. En magenta porque en
 * este juego magenta es siempre «lo que quiero».
 */
function mandoDeMotor(x: number, y: number, ancho: number, n: number): string {
  const paso = ancho / n;
  const anchoBarra = Math.min(paso - 18, 74);
  let barras = "";
  for (let i = 0; i < n; i++) {
    const bx = paso * (i + 0.5) - anchoBarra / 2;
    barras += `
      <rect x="${bx}" y="0" width="${anchoBarra}" height="10" rx="2" class="cr__ventana" />
      <rect data-mando-motor="${i}" data-ancho="${anchoBarra}"
            x="${bx}" y="0" width="0" height="10" rx="2" class="cr__mando" />`;
  }
  return `
    <g transform="translate(${x} ${y})">
      <text x="${ancho / 2}" y="-8" ${MARCA_ROTULO} class="cr__rotulo cr__rotulo--menudo"
            text-anchor="middle">MANDO</text>
      ${barras}
    </g>
  `;
}

/**
 * Un dial de motor: arco de doscientos cuarenta grados, aguja blanca, la marca
 * roja del límite, la banda ámbar del último tramo y el bug magenta de la
 * referencia. Debajo, la cifra.
 */
function dialDeMotor(cx: number, cy: number, r: number, i: number): string {
  const RECORRIDO = 240;
  const INICIO = -120;
  const punto = (f: number, rr: number) => {
    const a = ((INICIO + f * RECORRIDO) * Math.PI) / 180;
    return `${cx + Math.sin(a) * rr} ${cy - Math.cos(a) * rr}`;
  };
  const arco = (desde: number, hasta: number, clase: string, rr: number) =>
    `<path class="${clase}" d="M${punto(desde, rr)} A${rr} ${rr} 0 ${(hasta - desde) * RECORRIDO > 180 ? 1 : 0} 1 ${punto(hasta, rr)}" />`;
  let marcas = "";
  for (let k = 0; k <= 10; k++) {
    const rr = k % 5 === 0 ? r - 10 : r - 6;
    marcas += `<line x1="${punto(k / 10, rr).split(" ")[0]}" y1="${punto(k / 10, rr).split(" ")[1]}" x2="${punto(k / 10, r).split(" ")[0]}" y2="${punto(k / 10, r).split(" ")[1]}" class="cr__marca" />`;
  }
  return `
    <g data-motor="${i}">
      <circle cx="${cx}" cy="${cy}" r="${r}" class="cr__dial" />
      ${arco(0, 0.95, "cr__arco cr__arco--verde", r - 3)}
      ${arco(0.95, 1, "cr__arco cr__arco--ambar", r - 3)}
      ${marcas}
      <line class="cr__limite" x1="${punto(1, r - 12).split(" ")[0]}" y1="${punto(1, r - 12).split(" ")[1]}" x2="${punto(1, r + 2).split(" ")[0]}" y2="${punto(1, r + 2).split(" ")[1]}" />
      <g transform="translate(${cx} ${cy})"><g data-motor-bug="${i}"><path class="cr__bug" d="M0 ${-r - 2} l-4 -7 l8 0 Z" /></g></g>
      <g transform="translate(${cx} ${cy})">
        <g data-motor-aguja="${i}">
          <path class="cr__aguja" d="M0 0 L-2.5 ${-r * 0.72} L0 ${-r * 0.82} L2.5 ${-r * 0.72} Z" />
        </g>
      </g>
      <circle cx="${cx}" cy="${cy}" r="3" class="cr__buje" />
      <text data-motor-cifra="${i}" x="${cx}" y="${cy + r + 18}" ${MARCA_CIFRA} class="cr__valor" text-anchor="middle"></text>
      <text x="${cx}" y="${cy + 4}" ${MARCA_CIFRA} class="cr__rotulo" text-anchor="middle">${i + 1}</text>
    </g>
  `;
}

/**
 * La regla de flaps, con sus cuatro detentes y su puntero.
 *
 * En vertical donde hay una columna libre, en horizontal donde hay ancho. Es
 * la misma regla: cuatro muescas y un puntero que se para en ellas, igual que
 * la palanca de verdad — que no es un mando continuo, es una palanca con
 * topes, y eso se aprende viéndolo.
 */
export function reglaDeFlaps(
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  const tumbada = w > h;
  const largo = tumbada ? w : h;
  let detentes = "";
  for (let k = 0; k <= 3; k++) {
    const d = (k / 3) * largo;
    detentes += tumbada
      ? `<line x1="${d}" y1="0" x2="${d}" y2="${h}" class="cr__marca" />` +
        `<text x="${d}" y="${h + 15}" ${MARCA_CIFRA} class="cr__rotulo" text-anchor="middle">${k * 10}</text>`
      : `<line x1="0" y1="${d}" x2="${w}" y2="${d}" class="cr__marca" />` +
        `<text x="${w + 5}" y="${d + 4}" ${MARCA_CIFRA} class="cr__rotulo">${k * 10}</text>`;
  }
  return `
    <g transform="translate(${x} ${y})">
      <text x="${tumbada ? -10 : w / 2}" y="${tumbada ? h - 8 : -8}"
            ${MARCA_ROTULO} class="cr__rotulo" text-anchor="${tumbada ? "end" : "middle"}">FLAP</text>
      <rect width="${w}" height="${h}" rx="2" class="cr__ventana" />
      ${detentes}
      <g data-cristal="flaps" data-largo="${largo}" data-tumbada="${tumbada ? 1 : 0}">
        <path class="cr__puntero" d="${
          tumbada ? `M0 ${-4} l-6 -9 l12 0 Z` : "M-4 0 l-9 -6 l0 12 Z"
        }" />
      </g>
    </g>
  `;
}

/**
 * Las luces del tren. **Verde solo cuando está abajo y trabado.**
 *
 * Tres estados y no dos, y el de en medio es el que enseña: dentro, moviéndose
 * y fuera. Un tren tarda diez segundos en salir, y una luz verde con el tren a
 * medio camino es la clase de mentira que en un avión de verdad se paga cara.
 * Ver `flight/tren.ts`.
 *
 * Tres luces en toda la flota y **cinco en el grande**: un 747 tiene cinco
 * patas, y quien las cuente va a sonreír. Ese detalle no enseña a volar,
 * enseña a mirar, que es lo anterior.
 */
export function lucesDeTren(x: number, y: number, patas: number): string {
  /*
   * **Ruedas, y no cuadraditos.**
   *
   * Eran tres rectángulos de dieciséis por dieciséis en una esquina, con la
   * palabra «GEAR» al lado y esa palabra solo desde el tercer peldaño. O sea
   * que en los dos peldaños de abajo el indicador del tren era **tres
   * cuadrados grises sin nombre**, y lo que pasó fue exactamente lo que tenía
   * que pasar: «¿en qué parte del panel veo que se está poniendo o quitando?».
   *
   * Una rueda con su llanta se reconoce sin saber leer, que es la regla de
   * toda la casa para el primer peldaño. Y más grandes: esto es una de las
   * tres cosas que hay que mirar antes de tocar el suelo, no un detalle.
   */
  const R = 11;
  const PASO = R * 2 + 8;
  let luces = "";
  for (let k = 0; k < patas; k++) {
    const cx = k * PASO + R;
    luces +=
      `<circle cx="${cx}" cy="${R}" r="${R}" class="cr__tren" />` +
      // El hueco de la llanta: es lo que la vuelve una rueda y no un punto.
      `<circle cx="${cx}" cy="${R}" r="${R * 0.42}" class="cr__tren-buje" />`;
  }
  return `<g data-cristal="tren" transform="translate(${x} ${y})">${luces}
    <text x="${patas * PASO + 4}" y="${R + 5}" ${MARCA_ROTULO} class="cr__rotulo">GEAR</text></g>`;
}

/**
 * La columna de motor de los de pistón: relojes, que es lo que llevan.
 *
 * Un tacómetro de verdad no tiene lectura digital, y aquí tampoco hace falta:
 * lo que enseña es si la aguja está en el verde. En el bimotor van dos lado a
 * lado y **la posición es la etiqueta** — el de la izquierda es el motor
 * izquierdo—, que es la forma de rotular que entiende alguien que no lee.
 */
export function columnaDeMotor(ancho: number, alto: number, c: Cuadro): string {
  const n = c.motores;
  const paso = ancho / n;
  const r = Math.min(paso / 2 - 12, 92);
  const cy = 34 + r;
  let diales = "";
  for (let i = 0; i < n; i++) {
    diales += dialDeMotor(paso * (i + 0.5), cy, r, i);
  }
  return `
    <rect data-fondo="motor" width="${ancho}" height="${alto}" rx="4" class="cr__franja" />
    <text x="${ancho / 2}" y="22" ${MARCA_ROTULO} class="cr__rotulo" text-anchor="middle">${c.rotulo}</text>
    ${diales}
    ${mandoDeMotor(16, cy + r + 46, ancho - 32, n)}
    ${reglaDeCombustible(34, alto - 118, ancho - 68, 16)}
    ${reglaDeFlaps(34, alto - 74, ancho - 68, 26)}
    <text data-cristal="reversa" x="${ancho - 12}" y="${alto - 14}"
          ${MARCA_CON_SU_APARATO} class="cr__reversa" text-anchor="end" visibility="hidden">REV</text>
  `;
}

/**
 * La franja de motor del de cristal: dos barras de par en vez de diales.
 *
 * Un turbohélice se vuela con el par, no con las vueltas —su hélice gira a
 * revoluciones constantes y lo que cambia es la fuerza con la que muerde—, y
 * por eso lo que lleva al lado del mapa es una pareja de barras.
 */
export function franjaDeMotor(
  ancho: number,
  alto: number,
  c: Cuadro,
  a: AircraftConfig,
): string {
  const n = c.motores;
  const anchoBarra = 22;
  const paso = ancho / (n + 1);
  const altoBarra = alto * 0.5;
  let barras = "";
  for (let i = 0; i < n; i++) {
    const bx = paso * (i + 0.5) + (paso - anchoBarra) / 4;
    barras += `
      <g data-motor="${i}">
        <rect x="${bx}" y="24" width="${anchoBarra}" height="${altoBarra}" rx="2" class="cr__ventana" />
        <rect x="${bx}" y="${24 + altoBarra}" width="${anchoBarra}" height="0"
              data-motor-barra="${i}" data-suelo="${24 + altoBarra}" data-alto="${altoBarra}"
              class="cr__barra" />
        <rect x="${bx}" y="24" width="${anchoBarra}" height="${altoBarra * 0.05}" class="cr__arco--ambar" />
        <text data-motor-cifra="${i}" x="${bx + anchoBarra / 2}" y="${24 + altoBarra + 18}"
              ${MARCA_CIFRA} class="cr__valor" text-anchor="middle"></text>
      </g>`;
  }
  return `
    <rect data-fondo="motor" width="${ancho}" height="${alto}" rx="4" class="cr__franja" />
    <text x="${ancho / 2}" y="16" ${MARCA_ROTULO} class="cr__rotulo" text-anchor="middle">${c.rotulo}</text>
    ${barras}
    ${reglaDeFlaps(16, 24 + altoBarra + 46, 22, alto - (24 + altoBarra + 46) - 34)}
    ${reglaDeCombustible(78, 24 + altoBarra + 46, 22, alto - (24 + altoBarra + 46) - 56)}
    ${lucesDeTren(12, alto - 24, patasDe(a))}
    <text data-cristal="reversa" x="${ancho / 2}" y="${alto - 8}"
          ${MARCA_CIFRA} class="cr__reversa" text-anchor="middle" visibility="hidden">REV</text>
  `;
}

/**
 * Dónde se planta el tambor de la altitud. Lo usa el actualizador.
 *
 * `fpm` es lo que sube o baja: un tambor solo rueda si la altitud se mueve.
 * Sin eso, el avión parado enseñaba dos medias cifras cortadas para siempre.
 * Ver `rodillo`.
 */
export function tamborDeAltitud(
  pies: number,
  fpm = 0,
): {
  centro: number;
  fraccion: number;
} {
  return rodillo(pies, PASO_DE_TAMBOR, Math.abs(fpm) >= QUIETA_LA_ALTITUD);
}
