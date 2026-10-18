/**
 * **Lo que se ve del modo inicio**: quién habla, qué hay que hacer y con qué.
 *
 * La secuencia vive en `flight/inicio.ts`; esto la dibuja. Y lo dibuja **sin
 * hacer falta leer**, que es la regla 2 del AGENTS.md: el mando que se tiene
 * en la mano, con la parte que hay que tocar brillando y moviéndose como hay
 * que moverla.
 *
 * - **Con teclado**, la tecla dibujada como en la pantalla de teclas, latiendo:
 *   la llave en la I, el motor con su flecha en el más, y las cuatro flechas
 *   juntas —la de subir arriba, las otras tres debajo, como están en el
 *   teclado de verdad— con la que toca encendida. Se busca por dónde está.
 * - **Con el dedo**, la palanca o el gas de la pantalla dibujados con un dedo
 *   que los mueve, y **otro dedo encima del mando de verdad**, haciendo el
 *   gesto donde hay que hacerlo: es la flecha hacia lo que hay que mirar. La
 *   llave, como en la tarjeta de siempre, se toca en el propio dibujo.
 * - **Con un mando de consola**, el mando con la palanca izquierda moviéndose,
 *   el gatillo derecho apretándose o el botón de empezar latiendo.
 * - **Con un joystick de vuelo** —el HOTAS X, que se reconoce por su nombre—,
 *   la palanca de gases y la palanca de mando, moviéndose las dos.
 *
 * Al lado, **lo que pasa en el avión** cuando se hace: la nariz que sube, el
 * ala que baja, las alas derechas. Mover algo y ver qué hace es la lección.
 *
 * Arriba, la cara de quien habla y su frase. El texto acompaña: mientras las
 * frases no estén grabadas, es lo que queda para quien está al lado del niño.
 *
 * Las funciones de dibujo devuelven texto y no tocan el DOM, para poder
 * probarlas sin navegador. `PantallaDelInicio` es lo único que lo toca.
 */

import type { Accion } from "../flight/keymap";
import { nombreDeTecla } from "../flight/keymap";
import type { Gesto, Mando, Quien } from "../flight/inicio";
import type { QueMirar } from "../flight/inicio-pasaje";
import { t } from "../i18n";
import { RETRATO_DE_JAZLYN } from "./ilustraciones";
import { motorMas, motorMenos } from "./pictogramas";
import { DIBUJOS } from "./senal";
import { FLECHAS } from "./teclas";

/** Lo que hace falta para dibujar las teclas de quien juega. */
export interface ConQueTeclas {
  /** La tecla que se enseña para cada acción: depende de la mano elegida. */
  readonly teclaDe: (accion: Accion) => string;
  /** Si el avión es de reactor: el gas lleva su fan y no una hélice. */
  readonly chorro: boolean;
}

/**
 * Hacia dónde está inclinado el avión: −1 a la izquierda, 1 a la derecha.
 * Para enderezar se pide **el lado contrario**.
 */
export type Lado = -1 | 0 | 1;

// ── Las caras ────────────────────────────────────────────────────────────

/**
 * **Jazlyn, con su gorra de comandante y sus gafas de sol**, que son las del
 * juego: ver `flight/gafas.ts`. Y **Ara**, de cara más redonda y sin gorra. Dos
 * caras que se distinguen de un vistazo, que es lo que hace falta para saber
 * quién habla sin leer el nombre. La de Ara no dice si es niño o niña, como
 * su voz y su nombre: quien juega se pone en su sitio, sea quien sea.
 */
const CARAS: Readonly<Record<Quien, string>> = {
  mama: `
      <circle class="cara__fondo" cx="24" cy="24" r="23" />
      <path class="cara__pelo" d="M10.5 31 q0-18 13.5-18 q13.5 0 13.5 18 v8 q-3 3-6 0 v-11 h-15 v11 q-3 3-6 0 Z" />
      <ellipse class="cara__piel" cx="24" cy="28.5" rx="9.6" ry="11" />
      <path class="cara__gorra" d="M11.5 21 q12.5-11 25 0 l-1.6 3 h-21.8 Z" />
      <circle class="cara__insignia" cx="24" cy="16.4" r="2" />
      <rect class="cara__gafas" x="15.6" y="24.6" width="7.2" height="5" rx="2.2" />
      <rect class="cara__gafas" x="25.2" y="24.6" width="7.2" height="5" rx="2.2" />
      <path class="cara__trazo" d="M22.8 26.4 h2.4" />
      <path class="cara__trazo" d="M20.4 34.2 q3.6 2.8 7.2 0" />`,
  ara: `
      <circle class="cara__fondo" cx="24" cy="24" r="23" />
      <ellipse class="cara__piel" cx="24" cy="28" rx="10.4" ry="10.6" />
      <path class="cara__pelo" d="M13.2 25 q0.6-11 10.8-11 q10.2 0 10.8 11 q-4.6-5-10.8-5 q-6.2 0-10.8 5 Z" />
      <circle class="cara__ojo" cx="20.2" cy="27.4" r="1.6" />
      <circle class="cara__ojo" cx="27.8" cy="27.4" r="1.6" />
      <circle class="cara__mejilla" cx="17.4" cy="31.4" r="1.8" />
      <circle class="cara__mejilla" cx="30.6" cy="31.4" r="1.8" />
      <path class="cara__trazo" d="M20.6 32.8 q3.4 3.6 6.8 0" />`,
  /*
   * **La tripulación de cabina no tiene cara: tiene altavoz.** Desde el
   * asiento no se la ve hablar —se la oye por el techo—, y dibujarle una cara
   * sería inventarse a alguien. El altavoz con sus ondas es lo que se ve y se
   * oye de verdad. Ver `flight/inicio-pasaje.ts`.
   */
  tripulacion: `
      <circle class="cara__fondo" cx="24" cy="24" r="23" />
      <path class="cara__altavoz" d="M11 19.5 h6.5 l9-7.5 v24 l-9-7.5 h-6.5 Z" />
      <path class="cara__ondas" d="M30.5 18.5 q3.6 5.5 0 11 M34.5 14.5 q6.6 9.5 0 19" />`,
};

/**
 * **El altavoz pequeño, en la esquina de la cara de quien habla por la
 * megafonía**: la comandante desde la cabina de mando. Es ella —su gorra, sus
 * gafas— y se la oye por el techo, no sentada al lado como en las otras dos
 * escenas.
 */
const POR_EL_ALTAVOZ = `
      <circle class="cara__chapa" cx="38" cy="38" r="9.5" />
      <path class="cara__altavoz" d="M32.5 35.8 h3 l4.2-3.4 v11.2 l-4.2-3.4 h-3 Z" />
      <path class="cara__ondas cara__ondas--chicas" d="M41.6 35 q1.7 3 0 6" />`;

/**
 * **La tripulante, cuando se acerca al asiento**: ya no es el altavoz del
 * techo, es una persona a la que Ara ve, así que tiene cara —su moño, el
 * pañuelo al cuello en los colores de la casa y las alas en la solapa—. La
 * misma que habla por la megafonía, que es la misma persona. Ver `esDeCerca`
 * en `flight/inicio-pasaje.ts`.
 */
const LA_TRIPULANTE = `
      <circle class="cara__fondo" cx="24" cy="24" r="23" />
      <circle class="cara__pelo" cx="24" cy="12.6" r="5.2" />
      <path class="cara__pelo" d="M13.4 27 q0-13.4 10.6-13.4 q10.6 0 10.6 13.4 q-4.4-6.6-10.6-6.6 q-6.2 0-10.6 6.6 Z" />
      <ellipse class="cara__piel" cx="24" cy="27.6" rx="9.4" ry="10.4" />
      <path class="cara__pelo" d="M14.6 25.4 q1.8-6.4 9.4-6.4 q7.6 0 9.4 6.4 q-3.6-3.8-9.4-3.8 q-5.8 0-9.4 3.8 Z" />
      <circle class="cara__ojo" cx="20.4" cy="27.2" r="1.4" />
      <circle class="cara__ojo" cx="27.6" cy="27.2" r="1.4" />
      <path class="cara__trazo" d="M21 32.4 q3 2.8 6 0" />
      <path class="cara__panuelo" d="M16.6 38.6 l7.4 4.2 l7.4 -4.2 l-2 5.6 h-10.8 Z" />
      <path class="cara__alas" d="M30.6 41.2 h5.6 M33.4 40 v2.4" />`;

/**
 * **Y la de Jazlyn, como en los cuentos**: el retrato de sus ilustraciones
 * —ver `ui/ilustraciones.ts`—, en redondo y encima de la de trazos, dejando
 * a la vista un filo del ocre de su círculo. La de trazos se queda debajo por
 * si el retrato no llega —sin red, la primera vez—, y entonces es la que se
 * ve: la cara de quien habla no falta nunca.
 */
function retratoEncima(quien: Quien): string {
  if (quien !== "mama" || !RETRATO_DE_JAZLYN) return "";
  return `<image class="cara__retrato" href="${RETRATO_DE_JAZLYN}" x="2.5" y="2.5" width="43" height="43" />`;
}

export function caraDe(quien: Quien, megafonia = false): string {
  if (quien === "tripulacion" && !megafonia)
    return `<svg class="inicio__cara inicio__cara--tripulante" viewBox="0 0 48 48" aria-hidden="true">${LA_TRIPULANTE}</svg>`;
  const altavoz = megafonia && quien !== "tripulacion" ? POR_EL_ALTAVOZ : "";
  return `<svg class="inicio__cara inicio__cara--${quien}" viewBox="0 0 48 48" aria-hidden="true">${CARAS[quien]}${retratoEncima(quien)}${altavoz}</svg>`;
}

// ── Qué mirar ────────────────────────────────────────────────────────────

/**
 * **La ventanilla del avión, dibujada**: el marco redondeado, el cielo, el
 * suelo, el ala entrando por abajo con su motor colgado. Es lo que se tiene
 * delante en la escena de pasaje —ver `world/asiento-de-pasaje.ts`—, y el
 * dibujo dice qué parte mirar sin una palabra: lo que hay que mirar late.
 */
function ventanillaCon(late: "cielo" | "ala" | "motor" | "nubes"): string {
  const parte = (de: typeof late, clase: string, d: string): string =>
    `<g class="${late === de ? "dib__late" : ""}"><path class="${clase}${late === de ? " dib__parte--activa" : ""}" d="${d}" /></g>`;
  return `
    <svg class="dib dib--mirar" viewBox="0 0 64 64" aria-hidden="true">
      <rect class="dib__cuerpo" x="9" y="2" width="46" height="60" rx="21" />
      <rect class="mirar__cielo" x="14" y="7" width="36" height="50" rx="16" />
      <path class="mirar__suelo" d="M14 41 H50 V45 q0 12-16 12 h-4 q-16 0-16-12 Z" />
      ${parte("nubes", "mirar__nube", "M18 29 a4.5 4.5 0 0 1 6.5-4.5 a6 6 0 0 1 11 1.5 a4 4 0 0 1 1.5 7.5 h-17 a3.4 3.4 0 0 1-2-4.5 Z")}
      ${parte("ala", "mirar__ala", "M14 45 L50 37.5 V42 L14 54 Z")}
      ${parte("motor", "mirar__motor", "M21 48.5 h12 a3.6 3.6 0 0 1 0 7.2 h-12 a3.6 3.6 0 0 1 0-7.2 Z")}
      ${late === "cielo" ? `<g class="dib__late"><circle class="dib__parte--activa" cx="40" cy="18" r="4" /></g>` : ""}
    </svg>`;
}

/** **El cinturón**: las dos cintas y la hebilla, cerrándose. */
const EL_CINTURON = `
    <svg class="dib dib--mirar" viewBox="0 0 64 64" aria-hidden="true">
      <rect class="mirar__cinta" x="2" y="27" width="28" height="11" rx="2" />
      <rect class="mirar__cinta" x="34" y="27" width="28" height="11" rx="2" />
      <g class="dib__late">
        <rect class="dib__parte dib__parte--activa" x="22" y="22" width="20" height="21" rx="4" />
        <rect class="dib__hueco" x="27" y="27" width="10" height="11" rx="2" />
      </g>
    </svg>`;

/**
 * **Qué mirar**, dibujado: la ventanilla con el ala, el motor o las nubes
 * latiendo, o el cinturón. Lleva lo que pide en un atributo, que es como lo
 * encuentran las pruebas y el banco.
 */
export function dibujoDeMirar(mira: QueMirar): string {
  const dibujo =
    mira === "cinturon"
      ? EL_CINTURON
      : ventanillaCon(mira === "ventanilla" ? "cielo" : mira);
  return `<span class="inicio__mirar" data-mirar="${mira}">${dibujo}</span>`;
}

/**
 * **La misma cara dentro de otro dibujo**, en `x`, `y` y del tamaño que se
 * diga: la ficha del hangar lleva la de Jazlyn en una esquina, que es como se
 * reconoce sin leer con quién se va a volar.
 */
export function caraDentro(quien: Quien, x: number, y: number, lado: number): string {
  return `<svg class="inicio__cara--${quien}" x="${x}" y="${y}" width="${lado}" height="${lado}"
               viewBox="0 0 48 48" aria-hidden="true">${CARAS[quien]}${retratoEncima(quien)}</svg>`;
}

// ── El teclado ───────────────────────────────────────────────────────────

/** Una tecla dibujada, encendida o apagada, como en la pantalla de teclas. */
function tecla(glifo: string, letra: string, encendida: boolean): string {
  const clases = encendida
    ? "tecla tecla--activa inicio__tecla inicio__tecla--late"
    : "tecla tecla--activa inicio__tecla inicio__tecla--apagada";
  return `<span class="${clases}">${glifo}<span class="tecla__letra">${letra}</span></span>`;
}

/**
 * Las cuatro flechas como están en el teclado: la de subir arriba y las otras
 * tres debajo. **Juntas a propósito**, que es lo que permite encontrar la
 * buena por dónde está; una flecha suelta en medio de la nada no se sabe en
 * qué parte del teclado buscarla.
 */
function lasFlechas(cual: "arriba" | "abajo" | "izquierda" | "derecha", o: ConQueTeclas): string {
  const letra = (a: Accion): string => nombreDeTecla(o.teclaDe(a));
  return `
    <span class="inicio__flechas">
      <span class="inicio__fila">${tecla(FLECHAS.arriba, letra("pitchUp"), cual === "arriba")}</span>
      <span class="inicio__fila">
        ${tecla(FLECHAS.izquierda, letra("rollLeft"), cual === "izquierda")}
        ${tecla(FLECHAS.abajo, letra("pitchDown"), cual === "abajo")}
        ${tecla(FLECHAS.derecha, letra("rollRight"), cual === "derecha")}
      </span>
    </span>`;
}

function conTeclado(gesto: Gesto, lado: Lado, o: ConQueTeclas): string {
  switch (gesto) {
    case "motor":
      return tecla(DIBUJOS.llave, nombreDeTecla(o.teclaDe("engine")), true);
    case "gas":
      return tecla(motorMas(o.chorro), nombreDeTecla(o.teclaDe("throttleUp")), true);
    // El motor con su flecha para abajo, en la tecla del menos: la misma que lleva el botón.
    case "menosGas":
      return tecla(motorMenos(o.chorro), nombreDeTecla(o.teclaDe("throttleDown")), true);
    case "subir":
      return lasFlechas("arriba", o);
    case "bajar":
      return lasFlechas("abajo", o);
    case "izquierda":
      return lasFlechas("izquierda", o);
    case "derecha":
      return lasFlechas("derecha", o);
    case "nivelar":
      // Del lado contrario al que está inclinado.
      return lasFlechas(lado < 0 ? "derecha" : "izquierda", o);
    // El freno con el dibujo del botón que frena: el avión y la barra donde se para.
    case "frenar":
      return tecla(DIBUJOS.freno, nombreDeTecla(o.teclaDe("brakes")), true);
  }
}

// ── El dedo ──────────────────────────────────────────────────────────────

/**
 * **La mano que señala**, con el índice hacia arriba. La punta del dedo está
 * en el origen, para colocarla encima de lo que se toca.
 */
export const MANO_QUE_SENALA = `
  <path class="dedo__mano" d="M-3 0 a3 3 0 0 1 6 0 v13 l1.5-0.6 c2.6-0.9 4.4 0.6 4.6 2.6
     l0.6-0.2 c2.6-0.9 4.6 0.6 4.8 2.8 c2.4-0.6 4.2 0.9 4.2 3 v7.4 c0 6.4-4.4 10.8-10.6 10.8
     h-3.6 c-4.6 0-7.4-2.6-9.4-6.6 l-5-9.4 c-1.6-3.2 2.2-5.8 4.8-3.2 l2.4 2.6 Z" />`;

/** Hacia dónde se mueve cada gesto con el dedo, en el dibujo. El freno se toca. */
const DIRECCION: Readonly<Record<Exclude<Gesto, "motor">, string>> = {
  gas: "arriba",
  menosGas: "abajo",
  subir: "arriba",
  bajar: "abajo",
  izquierda: "izquierda",
  derecha: "derecha",
  nivelar: "centro",
  frenar: "toca",
};

/**
 * **Un mando que se toca en el propio dibujo**: la llave para arrancar y el
 * freno para parar. Con el dedo no hay otra forma más directa: el dibujo que
 * pide la cosa **es** la cosa. Ver `conElDedo`.
 */
function botonQueSeToca(gesto: "motor" | "frenar"): string {
  const llave = gesto === "motor";
  return `
      <button class="inicio__llave" type="button" data-inicio="${llave ? "llave" : "freno"}"
              aria-label="${t(llave ? "inicio.modo.llave" : "inicio.modo.freno")}">
        ${llave ? DIBUJOS.llave : DIBUJOS.freno}
        <svg class="inicio__toque" viewBox="-24 -6 48 52" aria-hidden="true">${MANO_QUE_SENALA}</svg>
      </button>`;
}

/** La flecha de un gesto, para poner al lado del mando que se mueve. */
function flechaHacia(dir: string, x: number, y: number): string {
  const giro = { arriba: 0, derecha: 90, abajo: 180, izquierda: 270 }[dir] ?? 0;
  return `<path class="dib__flecha" transform="translate(${x} ${y}) rotate(${giro})"
            d="M0 -16 L10 -4 H4 V12 H-4 V-4 H-10 Z" />`;
}

function conElDedo(gesto: Gesto, lado: Lado): string {
  /*
   * **La llave se toca en el dibujo**, como en la tarjeta de «arrancá el
   * motor» de siempre: con el dedo no hay otra forma de arrancar, y que la
   * instrucción y el mando sean el mismo objeto es lo más directo que hay. Y
   * el freno igual: el botón rojo de la pantalla frena, y el dibujo también.
   */
  if (gesto === "motor" || gesto === "frenar") return botonQueSeToca(gesto);
  const dir = DIRECCION[gesto];
  if (gesto === "gas" || gesto === "menosGas") {
    // Menos gas: el punto, que está por la mitad, baja un poco.
    const menos = gesto === "menosGas";
    return `
      <svg class="dib dib--dedo" viewBox="0 0 120 120" aria-hidden="true">
        <rect class="dib__pad" x="44" y="6" width="32" height="108" rx="16" />
        <g class="dib__mueve dib__mueve--${menos ? "gas-menos" : "gas"}">
          <circle class="dib__punto" cx="60" cy="96" r="13" />
          <g transform="translate(62 98) scale(0.9)">${MANO_QUE_SENALA}</g>
        </g>
        ${menos ? flechaHacia("abajo", 98, 78) : flechaHacia("arriba", 98, 50)}
      </svg>`;
  }
  // Para enderezar, el punto sale del lado al que está inclinado y vuelve al centro.
  const desde = gesto === "nivelar" ? (lado < 0 ? "izquierda" : "derecha") : "centro";
  const dondeLaFlecha: Readonly<Record<string, readonly [number, number]>> = {
    arriba: [60, 20],
    abajo: [60, 100],
    izquierda: [18, 60],
    derecha: [102, 60],
  };
  const flecha = dondeLaFlecha[dir];
  return `
    <svg class="dib dib--dedo" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="dib__pad" cx="60" cy="60" r="52" />
      <g class="dib__mueve dib__mueve--${dir} dib__mueve--desde-${desde}">
        <circle class="dib__punto" cx="60" cy="60" r="14" />
        <g transform="translate(62 62) scale(0.9)">${MANO_QUE_SENALA}</g>
      </g>
      ${gesto === "nivelar" || !flecha ? "" : flechaHacia(dir, flecha[0], flecha[1])}
    </svg>`;
}

// ── El mando de consola ──────────────────────────────────────────────────

/**
 * **El mando de consola de frente**, como lo dibuja cualquiera: el cuerpo con
 * sus dos asas, la palanca izquierda arriba, la cruceta debajo, los cuatro
 * botones a la derecha y los dos gatillos asomando por encima. Lo que manda
 * en este juego —ver `flight/mandos-fisicos.ts`—: la palanca izquierda vuela,
 * el gatillo derecho es el gas, el izquierdo el freno y el botón de empezar,
 * el de las tres rayas, la llave.
 *
 * **Menos gas, con el gatillo apenas apretado**: el gatillo es el gas, y
 * suelto se queda donde estaba —ver `leerConsola`—; apretarlo poquito es pedir
 * poco gas. Por eso se dibuja apretándose apenas, sin la flecha del de dar.
 */
function conConsola(gesto: Gesto, lado: Lado): string {
  const activo = (si: boolean): string => (si ? " dib__parte--activa" : "");
  const palanca =
    gesto === "subir" ||
    gesto === "bajar" ||
    gesto === "izquierda" ||
    gesto === "derecha" ||
    gesto === "nivelar";
  const dir = gesto === "motor" ? "" : DIRECCION[gesto];
  const desde = gesto === "nivelar" ? (lado < 0 ? "izquierda" : "derecha") : "centro";
  const gas = gesto === "gas" || gesto === "menosGas";
  const flecha =
    gesto === "subir"
      ? flechaHacia("arriba", 72, 18)
      : gesto === "bajar"
        ? flechaHacia("abajo", 40, 100)
        : gesto === "izquierda"
          ? flechaHacia("izquierda", 32, 62)
          : gesto === "derecha"
            ? flechaHacia("derecha", 112, 62)
            : gesto === "gas"
              ? flechaHacia("abajo", 178, -4)
              : gesto === "frenar"
                ? flechaHacia("abajo", 62, -4)
                : "";
  const aprieta = gesto === "gas" ? " dib__aprieta--si" : gesto === "menosGas" ? " dib__aprieta--poco" : "";
  return `
    <svg class="dib dib--consola" viewBox="0 -24 240 174" aria-hidden="true">
      <g class="dib__aprieta${gesto === "frenar" ? " dib__aprieta--si" : ""}">
        <path class="dib__parte dib__gatillo${activo(gesto === "frenar")}" d="M44 32 q4-20 26-22 h14 q8 0 8 10 v8 Z" />
      </g>
      <g class="dib__aprieta${aprieta}">
        <path class="dib__parte dib__gatillo${activo(gas)}" d="M196 32 q-4-20 -26-22 h-14 q-8 0 -8 10 v8 Z" />
      </g>
      <path class="dib__cuerpo" d="M64 26 h112 c26 0 40 14 46 40 l10 46 c4 20-18 32-32 18 l-22-24 h-116
        l-22 24 c-14 14-36 2-32-18 l10-46 c6-26 20-40 46-40 Z" />
      <circle class="dib__hueco" cx="72" cy="62" r="21" />
      <g class="dib__mueve${palanca ? ` dib__mueve--${dir} dib__mueve--desde-${desde} dib__mueve--corto` : ""}">
        <circle class="dib__parte${activo(palanca)}" cx="72" cy="62" r="13" />
      </g>
      <path class="dib__hueco" d="M90 96 h8 v-8 h8 v8 h8 v8 h-8 v8 h-8 v-8 h-8 Z" />
      <circle class="dib__hueco" cx="150" cy="102" r="17" />
      <circle class="dib__parte" cx="150" cy="102" r="10" />
      <circle class="dib__boton" cx="184" cy="48" r="7" />
      <circle class="dib__boton" cx="198" cy="62" r="7" />
      <circle class="dib__boton" cx="170" cy="62" r="7" />
      <circle class="dib__boton" cx="184" cy="76" r="7" />
      <circle class="dib__hueco" cx="104" cy="58" r="6" />
      <g class="${gesto === "motor" ? "dib__late" : ""}">
        <circle class="dib__parte${activo(gesto === "motor")}" cx="134" cy="58" r="8" />
        <path class="dib__rayas" d="M130 55 h8 M130 58 h8 M130 61 h8" />
      </g>
      ${flecha}
    </svg>`;
}

// ── El joystick de vuelo ─────────────────────────────────────────────────

/**
 * **El HOTAS: la palanca de gases y la palanca de mando**, vistas desde el
 * asiento. Hacia delante es hacia arriba en el dibujo, que es lejos de quien
 * mira. La de gases se empuja hacia delante para dar gas; la de mando se tira
 * hacia uno para subir —como en cualquier avión con palanca— y se inclina a
 * un lado o al otro para virar. Y la llave en el ST de la base de gases, y el
 * freno en el gatillo del mango, el del índice. Ver `flight/mandos-fisicos.ts`.
 */
function conJoystick(gesto: Gesto, lado: Lado): string {
  const activo = (si: boolean): string => (si ? " dib__parte--activa" : "");
  const mango =
    gesto === "subir"
      ? "dib__mango--atras"
      : gesto === "bajar"
        ? "dib__mango--adelante"
        : gesto === "izquierda"
          ? "dib__mango--izquierda"
          : gesto === "derecha"
            ? "dib__mango--derecha"
            : gesto === "nivelar"
              ? `dib__mango--endereza-desde-${lado < 0 ? "izquierda" : "derecha"}`
              : "";
  const usaMango = mango !== "";
  const flecha =
    gesto === "gas"
      ? flechaHacia("arriba", 28, 46)
      : gesto === "menosGas"
        ? flechaHacia("abajo", 28, 74)
        : gesto === "subir"
          ? flechaHacia("abajo", 216, 74)
          : gesto === "bajar"
            ? flechaHacia("arriba", 216, 40)
            : gesto === "izquierda"
              ? flechaHacia("izquierda", 128, 56)
              : gesto === "derecha"
                ? flechaHacia("derecha", 214, 56)
                : gesto === "frenar"
                  ? flechaHacia("derecha", 134, 64)
                  : "";
  // La palanca de gases sube desde el ralentí; para quitar, baja desde la mitad.
  const gases = gesto === "gas" ? " dib__mueve--gases" : gesto === "menosGas" ? " dib__mueve--gases-menos" : "";
  return `
    <svg class="dib dib--joystick" viewBox="0 0 240 150" aria-hidden="true">
      <rect class="dib__cuerpo" x="14" y="98" width="88" height="40" rx="10" />
      <rect class="dib__hueco" x="52" y="34" width="14" height="74" rx="7" />
      <g class="dib__mueve${gases}">
        <rect class="dib__parte${activo(gesto === "gas" || gesto === "menosGas")}" x="36" y="86" width="46" height="24" rx="9" />
      </g>
      <g class="${gesto === "motor" ? "dib__late" : ""}">
        <rect class="dib__parte${activo(gesto === "motor")}" x="74" y="114" width="20" height="14" rx="4" />
      </g>
      <ellipse class="dib__cuerpo" cx="170" cy="126" rx="50" ry="17" />
      <g class="dib__mango ${mango}">
        <rect class="dib__parte${activo(usaMango)}" x="158" y="28" width="24" height="98" rx="11" />
        <rect class="dib__hueco" x="162" y="34" width="16" height="12" rx="4" />
        <g class="${gesto === "frenar" ? "dib__late" : ""}">
          <rect class="${gesto === "frenar" ? "dib__parte dib__parte--activa" : "dib__hueco"}" x="152" y="56" width="8" height="16" rx="3" />
        </g>
      </g>
      ${flecha}
    </svg>`;
}

// ── Lo que pasa en el avión ──────────────────────────────────────────────

/** El avión visto desde atrás: alas, fuselaje y deriva. */
const AVION_DE_ESPALDAS = `
  <path d="M4 34 h22 a6 6 0 0 1 12 0 h22 v4 h-22 a6 6 0 0 1-12 0 h-22 Z" />
  <path d="M30 18 h4 l1 14 h-6 Z" />
  <path d="M20 40 h24 v2.5 h-24 Z" />`;

/** Y de lado, con la nariz a la derecha. */
const AVION_DE_LADO = `
  <path d="M8 34 l40-3.4 q9 0 10 3.4 q-1 3.4-10 3.4 l-40-1.4 Z" />
  <path d="M10 33 l-4-11 h5 l9 11 Z" />
  <path d="M30 35 l-8 9 h6 l12-9 Z" />`;

/**
 * **Lo que hace el avión cuando se hace el gesto**: es la otra mitad de la
 * lección. Se aprieta la flecha de subir y la nariz sube; la de la izquierda,
 * y baja el ala de ese lado. Ver los mandos en `ui/senal.ts`, que hablan el
 * mismo idioma.
 */
function loQuePasa(gesto: Gesto, lado: Lado, chorro: boolean): string {
  switch (gesto) {
    case "motor":
      return `<span class="inicio__pasa inicio__pasa--motor">${chorro ? DIBUJOS.reactor : DIBUJOS.helice}</span>`;
    case "gas":
      return `<span class="inicio__pasa inicio__pasa--gas">${motorMas(chorro)}</span>`;
    case "menosGas":
      return `<span class="inicio__pasa inicio__pasa--gas">${motorMenos(chorro)}</span>`;
    case "subir":
      return `
        <svg class="inicio__pasa" viewBox="0 0 64 64" aria-hidden="true">
          <path class="pasa__suelo" d="M2 58 H62" />
          <g transform="rotate(-18 32 34)">${AVION_DE_LADO}</g>
        </svg>`;
    // La nariz un poco abajo, mirando la pista que espera delante.
    case "bajar":
      return `
        <svg class="inicio__pasa" viewBox="0 0 64 64" aria-hidden="true">
          <path class="pasa__suelo" d="M34 58 H62" />
          <g transform="rotate(12 32 30)">${AVION_DE_LADO}</g>
        </svg>`;
    // El avión y la barra donde se para: el dibujo del botón que frena.
    case "frenar":
      return `<span class="inicio__pasa inicio__pasa--freno">${DIBUJOS.freno}</span>`;
    case "izquierda":
    case "derecha": {
      const grados = gesto === "izquierda" ? -22 : 22;
      return `
        <svg class="inicio__pasa" viewBox="0 0 64 64" aria-hidden="true">
          <g transform="rotate(${grados} 32 36)">${AVION_DE_ESPALDAS}</g>
        </svg>`;
    }
    case "nivelar":
      return `
        <svg class="inicio__pasa" viewBox="0 0 64 64" aria-hidden="true">
          <path class="pasa__suelo" d="M2 52 H62" />
          <g class="pasa__endereza pasa__endereza--desde-${lado < 0 ? "izquierda" : "derecha"}">${AVION_DE_ESPALDAS}</g>
        </svg>`;
  }
}

/**
 * **El dibujo de un gesto con un mando**: el mando que se tiene en la mano,
 * con lo que hay que tocar brillando, y al lado lo que pasa en el avión.
 * Lleva el mando y el gesto en sus atributos, que es como lo encuentran las
 * pruebas y el banco.
 */
export function dibujoDelGesto(gesto: Gesto, mando: Mando, lado: Lado, o: ConQueTeclas): string {
  const dibujo =
    mando === "teclado"
      ? conTeclado(gesto, lado, o)
      : mando === "dedo"
        ? conElDedo(gesto, lado)
        : mando === "consola"
          ? conConsola(gesto, lado)
          : conJoystick(gesto, lado);
  /*
   * **Y la llave se puede tocar con cualquier mando.** Con el dedo ya es el
   * propio botón; con teclado o mando el dibujo era solo un dibujo, y un clic
   * en la llave que brilla —«apretala una vez, sin miedo»— no hacía nada.
   * Enrique, con el ratón: «le hago clic pero no se despierta la llave». La
   * I o el botón de empezar siguen valiendo igual. Y el freno, por lo mismo:
   * un dibujo que brilla y pide «apretalo» se aprieta.
   */
  const pulsable = (gesto === "motor" || gesto === "frenar") && mando !== "dedo";
  const llave = gesto === "motor";
  const hueco = pulsable
    ? `<button class="inicio__dibujo inicio__pulsable" type="button" data-inicio="${llave ? "llave" : "freno"}"
               aria-label="${t(llave ? "inicio.modo.llave" : "inicio.modo.freno")}">${dibujo}</button>`
    : `<span class="inicio__dibujo">${dibujo}</span>`;
  return `
    <span class="inicio__mando inicio__mando--${mando}" data-mando="${mando}" data-gesto="${gesto}">
      ${hueco}
      ${loQuePasa(gesto, lado, o.chorro)}
    </span>`;
}

/**
 * **A qué mando de la pantalla señala el dedo de encima**, con el dedo: la
 * palanca para volar, el gas para el gas y el botón rojo para frenar. La
 * llave no: se toca en el dibujo.
 */
export function mandoQueSenala(
  gesto: Gesto | null,
  mando: Mando,
): "stick" | "throttle" | "freno" | null {
  if (mando !== "dedo" || !gesto || gesto === "motor") return null;
  if (gesto === "frenar") return "freno";
  return gesto === "gas" || gesto === "menosGas" ? "throttle" : "stick";
}

/** Dónde está en la pantalla cada mando al que se señala. Ver `colocarElDedo`. */
const DONDE_ESTA: Readonly<Record<"stick" | "throttle" | "freno", string>> = {
  stick: '#tactil [data-touch="stick"]',
  throttle: '#tactil [data-touch="throttle"]',
  // El botón rojo del freno, que sale en el suelo: ver `brakes-touch` en `ui/hud.ts`.
  freno: '[data-hud="brakes-touch"]',
};

// ── La pantalla ──────────────────────────────────────────────────────────

/** Lo que el juego le da a la pantalla en cada paso. */
export interface VistaDelInicio {
  readonly gesto: Gesto | null;
  readonly mando: Mando;
  readonly lado: Lado;
  readonly linea: {
    readonly quien: Quien;
    readonly clave: string;
    readonly texto: string;
    /** Si se dice por la megafonía: la cara lleva su altavoz. */
    readonly megafonia?: boolean;
  } | null;
  readonly congelado: boolean;
  /**
   * El sello del final, en SVG, y si ya se puede seguir. Con `volver`, el
   * botón no es seguir volando sino volver al hangar: de pasaje no se sigue
   * volando el avión de otro.
   */
  readonly fin: { readonly sello: string; readonly puedeSeguir: boolean; readonly volver?: boolean } | null;
  /** Qué mirar, en la escena de pasaje, cuando no hay gesto que pedir. */
  readonly mira?: QueMirar | null;
}

/**
 * **La tarjeta del modo inicio**, encima del vuelo: arriba en el centro, por
 * debajo de la barra, donde no tapa los mandos de los pulgares. Y el velo, que
 * oscurece un poco el mundo cuando espera: se ve que está quieto a propósito,
 * no que se ha colgado.
 */
export class PantallaDelInicio {
  private readonly tarjeta: HTMLElement;
  private readonly cara: HTMLElement;
  private readonly dice: HTMLElement;
  private readonly hueco: HTMLElement;
  private readonly dedo: HTMLElement;
  private readonly fin: HTMLElement;
  private dibujado = "";
  private dicho = "";
  private finPuesto = "";
  private senalado: ReturnType<typeof mandoQueSenala> = null;
  /** Si lo que se señala en el gas es quitarlo: el dedo empieza arriba y baja. */
  private quitaGas = false;
  /** Para volver a buscar un mando que todavía no está: el freno sale al tocar suelo. */
  private buscandoElMando = 0;
  private quieto: boolean | null = null;
  private abajoDeLaTarjeta = 0;

  /**
   * **Hasta dónde baja la tarjeta**, px de pantalla, lo más que ha bajado: la
   * cámara encuadra el avión debajo, que es lo que se está mirando. Lo más y
   * no lo de ahora para que el avión no salte de sitio a cada paso. Ver
   * `encuadrarSobreElCuadro` en `game.ts`.
   */
  get abajo(): number {
    return this.abajoDeLaTarjeta;
  }

  private medir(): void {
    const r = this.tarjeta.getBoundingClientRect();
    if (r.height > 2 && !this.raiz.hidden) this.abajoDeLaTarjeta = Math.max(this.abajoDeLaTarjeta, r.bottom);
  }

  constructor(
    private readonly raiz: HTMLElement,
    private readonly velo: HTMLElement | null,
    private readonly teclas: () => ConQueTeclas,
    acciones: {
      readonly arrancar: () => void;
      readonly seguir: () => void;
      /** El freno dibujado, que también se toca. Ver `dibujoDelGesto`. */
      readonly frenar?: () => void;
    },
    /**
     * Hasta dónde baja la barra de botones del HUD, px de pantalla: la tarjeta
     * va justo debajo. Ver `Hud.altoDeArriba`.
     */
    private readonly arriba: () => number = () => 64,
    /** El nombre de la escena, para quien no ve la tarjeta: aprender o aterrizar. */
    nombre: string = t("inicio.modo.nombre"),
  ) {
    raiz.innerHTML = `
      <div class="inicio__tarjeta" role="group" aria-label="${nombre}">
        <div class="inicio__quien">
          <span class="inicio__cara-hueco"></span>
          <p class="inicio__dice" role="status" aria-live="polite"></p>
        </div>
        <div class="inicio__hueco"></div>
        <div class="inicio__fin" hidden></div>
      </div>
      <div class="inicio__dedo" hidden aria-hidden="true">
        <svg viewBox="-24 -6 48 52">${MANO_QUE_SENALA}</svg>
      </div>`;
    this.tarjeta = raiz.querySelector<HTMLElement>(".inicio__tarjeta")!;
    this.cara = raiz.querySelector<HTMLElement>(".inicio__cara-hueco")!;
    this.dice = raiz.querySelector<HTMLElement>(".inicio__dice")!;
    this.hueco = raiz.querySelector<HTMLElement>(".inicio__hueco")!;
    this.dedo = raiz.querySelector<HTMLElement>(".inicio__dedo")!;
    this.fin = raiz.querySelector<HTMLElement>(".inicio__fin")!;
    raiz.addEventListener("click", (event) => {
      const boton = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-inicio]");
      if (!boton) return;
      if (boton.dataset.inicio === "llave") acciones.arrancar();
      if (boton.dataset.inicio === "freno") acciones.frenar?.();
      if (boton.dataset.inicio === "seguir") acciones.seguir();
    });
    window.addEventListener("resize", this.alCambiarDeTamano);
    raiz.hidden = false;
    this.colocarElDedo();
  }

  /** La pantalla cambió de tamaño: lo medido ya no vale. */
  private readonly alCambiarDeTamano = (): void => {
    this.abajoDeLaTarjeta = 0;
    this.colocarElDedo();
  };

  pintar(v: VistaDelInicio): void {
    if (v.congelado !== this.quieto) {
      this.quieto = v.congelado;
      this.raiz.classList.toggle("inicio--quieto", v.congelado);
      if (this.velo) this.velo.hidden = !v.congelado;
    }

    const dicho = v.linea ? `${v.linea.quien}|${v.linea.clave}|${v.linea.texto}` : "";
    if (dicho !== this.dicho) {
      this.dicho = dicho;
      this.cara.innerHTML = v.linea ? caraDe(v.linea.quien, v.linea.megafonia) : "";
      // Quién habla, también para quien no ve la cara.
      if (v.linea) {
        this.cara.setAttribute("role", "img");
        this.cara.setAttribute(
          "aria-label",
          t(
            v.linea.quien === "tripulacion"
              ? v.linea.megafonia
                ? "inicio.modo.tripulacion"
                : "inicio.modo.tripulante"
              : v.linea.quien === "ara"
                ? "inicio.modo.ara"
                : v.linea.megafonia
                  ? "inicio.modo.megafonia"
                  : "inicio.modo.mama",
          ),
        );
      } else {
        this.cara.removeAttribute("role");
        this.cara.removeAttribute("aria-label");
      }
      this.dice.textContent = v.linea?.texto ?? "";
      this.tarjeta.dataset.quien = v.linea?.quien ?? "";
    }

    const o = this.teclas();
    const mira = v.gesto ? null : (v.mira ?? null);
    const dibujo = v.gesto
      ? `${v.gesto}|${v.mando}|${v.lado}|${o.chorro}|${o.teclaDe("pitchUp")}`
      : mira
        ? `mirar|${mira}`
        : "";
    if (dibujo !== this.dibujado) {
      this.dibujado = dibujo;
      this.hueco.innerHTML = v.gesto
        ? dibujoDelGesto(v.gesto, v.mando, v.lado, o)
        : mira
          ? dibujoDeMirar(mira)
          : "";
      this.hueco.hidden = !v.gesto && !mira;
      this.raiz.dataset.mirar = mira ?? "";
      this.raiz.dataset.mando = v.mando;
      this.raiz.dataset.gesto = v.gesto ?? "";
      this.senalado = mandoQueSenala(v.gesto, v.mando);
      this.quitaGas = v.gesto === "menosGas";
      const dir = v.gesto && v.gesto !== "motor" ? DIRECCION[v.gesto] : "";
      const desde = v.gesto === "nivelar" ? ` inicio__dedo--desde-${v.lado < 0 ? "izquierda" : "derecha"}` : "";
      this.dedo.className = `inicio__dedo inicio__dedo--${dir}${desde}`;
      this.colocarElDedo();
    } else if (this.senalado && this.dedo.hidden && ++this.buscandoElMando % 30 === 0) {
      /*
       * **Y si el mando todavía no estaba, se vuelve a buscar** de vez en
       * cuando: el botón del freno sale al tocar el suelo, y puede llegar un
       * fotograma después de pedirlo.
       */
      this.colocarElDedo();
    }

    const fin = v.fin ? `${v.fin.puedeSeguir}` : "";
    if (fin !== this.finPuesto) {
      const antes = this.finPuesto;
      this.finPuesto = fin;
      this.fin.hidden = !v.fin;
      this.tarjeta.classList.toggle("inicio__tarjeta--fin", !!v.fin);
      if (v.fin && !antes) {
        /*
         * De pasaje, **volver al hangar**, con su dibujo: el arco del hangar
         * con el avión dentro. Seguir volando un avión de línea que se acaba
         * de traer de pasajero no es algo que se pueda hacer.
         */
        const icono = v.fin.volver
          ? `<path d="M6 30 V16 Q24 1 42 16 V30 H36 V19 Q24 9 12 19 V30 Z" />
             <path d="M15 27 L24 24.5 L27 21 L28.6 21.5 L27 25 L32 24 L33 25.6 L27.5 27.6 L16 28.6 Z" />`
          : `<path d="M9 19 L27 13 L33 6 L36 7 L33 14 L42 12 L44 15 L34 19 L26 22 L11 22 Z" />`;
        this.fin.innerHTML = `
          <div class="inicio__sello">${v.fin.sello}</div>
          <button class="inicio__seguir" type="button" data-inicio="seguir" hidden>
            <svg viewBox="0 0 48 32" aria-hidden="true">${icono}</svg>
            <span>${t(v.fin.volver ? "inicio.modo.volver" : "inicio.modo.seguir")}</span>
          </button>`;
      }
      this.medir();
      const seguir = this.fin.querySelector<HTMLButtonElement>("[data-inicio='seguir']");
      if (seguir) seguir.hidden = !v.fin?.puedeSeguir;
      if (v.fin?.puedeSeguir) seguir?.focus({ preventScroll: true });
    }
  }

  /**
   * **El dedo de encima, sobre el mando de verdad.** Se mide cada vez que
   * cambia el gesto o la pantalla, no en cada fotograma: leer el tamaño de
   * algo obliga al navegador a rehacer la página.
   */
  private colocarElDedo(): void {
    const arriba = this.arriba();
    if (arriba > 0) this.raiz.style.setProperty("--inicio-arriba", `${Math.round(arriba)}px`);
    this.medir();
    const cual = this.senalado;
    const pad = cual ? document.querySelector<HTMLElement>(DONDE_ESTA[cual]) : null;
    const r = pad?.getBoundingClientRect();
    const visible =
      !!r &&
      r.width > 4 &&
      r.height > 4 &&
      !pad!.closest("[hidden]") &&
      getComputedStyle(pad!).visibility !== "hidden";
    this.dedo.hidden = !visible;
    if (!visible || !r) return;
    /*
     * En el gas, el dedo sale de abajo para dar y de la mitad para quitar, que
     * es por donde anda el gas de una final; en la palanca, del centro; y en
     * el freno, encima, tocando.
     */
    const gas = cual === "throttle";
    const recorrido = gas ? r.height * (this.quitaGas ? 0.25 : 0.55) : Math.min(r.width, r.height) * 0.28;
    // Para quitar, encima del punto del gas, que es lo que se arrastra.
    const punto = gas && this.quitaGas ? pad!.querySelector(".pad__punto")?.getBoundingClientRect() : null;
    const top = gas
      ? this.quitaGas
        ? punto && punto.height > 2
          ? punto.top + punto.height / 2
          : r.top + r.height * 0.45
        : r.bottom - r.height * 0.2
      : r.top + r.height / 2;
    this.dedo.style.left = `${r.left + r.width / 2}px`;
    this.dedo.style.top = `${top}px`;
    this.dedo.style.setProperty("--recorrido", `${recorrido.toFixed(0)}px`);
  }

  /** Se acabó: fuera la tarjeta, el velo y el dedo. */
  quitar(): void {
    window.removeEventListener("resize", this.alCambiarDeTamano);
    this.abajoDeLaTarjeta = 0;
    this.raiz.hidden = true;
    this.raiz.innerHTML = "";
    if (this.velo) this.velo.hidden = true;
  }
}
