/**
 * Lo que cuenta la comandante con números: cuánto dura el vuelo, a qué altura
 * se va, cuánto falta y qué tiempo hace allí.
 *
 * Es lo que dice cualquier comandante de verdad en los dos anuncios que más
 * se oyen de un vuelo de línea:
 *
 * - **Al salir**, detrás de la bienvenida: «el vuelo va a durar unos veinte
 *   minutos y vamos a volar a once mil pies».
 * - **Al empezar a bajar**: «vamos a aterrizar en unos diez minutos; allá el
 *   cielo está despejado y hay veintiún grados».
 *
 * ## Por trozos, pero trozos enteros
 *
 * Cambian con cada vuelo, así que no se pueden grabar enteros: se montan como
 * un GPS monta el nombre de la calle. Pero cada trozo es **una frase entera
 * con su número dentro** —«Vamos a aterrizar en unos diez minutos.»— y no una
 * palabra suelta, porque un «diez» grabado aparte y pegado en mitad de una
 * frase de megafonía se nota al instante. Ver #160 y `recetaDe` en
 * `banco-de-voz.ts`.
 *
 * ## Y redondeados como redondea una persona
 *
 * Nadie dice por megafonía «vamos a aterrizar en diecisiete minutos»: dice
 * «en unos quince». Los minutos van de cinco en cinco a partir de cinco, que
 * es como se cuentan, y los grados y los pies al entero. Así además hay una
 * cantidad finita de trozos que grabar.
 *
 * Sin three.js ni audio, para poder comprobarlo sin navegador.
 */

import { hayTexto, t, type TranslationKey } from "../i18n";
import type { Meteo } from "../world/meteo";
import { HASTA, nivelPara } from "../flight/nivel-de-crucero";

/** Los minutos que se dicen: los pocos de una bajada corta y de cinco en cinco. */
export const MINUTOS_QUE_SE_DICEN = [
  2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
] as const;

/** Los minutos, redondeados como se dicen. `segundos` es lo que falta. */
export function minutosDichos(segundos: number): number {
  const min = segundos / 60;
  let mejor: number = MINUTOS_QUE_SE_DICEN[0];
  for (const m of MINUTOS_QUE_SE_DICEN)
    if (Math.abs(m - min) < Math.abs(mejor - min)) mejor = m;
  return mejor;
}

/**
 * Cuánto se tarda en volar esta distancia, en segundos, **visto desde el
 * puesto de pilotaje antes de salir**.
 *
 * La distancia al crucero del avión, más lo que se pierde subiendo y
 * aproximando: cuatro minutos, que es lo que cuesta en el juego una salida y
 * una llegada con su circuito. No es el combustible —eso lleva su reserva de
 * ley, ver `flight/combustible.ts`—: es lo que se le dice al pasaje.
 */
export function segundosDeVuelo(metros: number, cruceroMs: number): number {
  return metros / Math.max(20, cruceroMs) + 4 * 60;
}

/**
 * Cuánto falta para tocar tierra desde aquí, en segundos.
 *
 * A la velocidad que se lleva y con un minuto más para la aproximación, que
 * es donde se frena. Es la cuenta que hace una comandante mirando la
 * distancia que le queda en la pantalla.
 */
export function segundosHastaTocar(metros: number, velocidadMs: number): number {
  return metros / Math.max(40, velocidadMs) + 60;
}

/** Los niveles que se dicen, en miles de pies. */
export const PRIMER_NIVEL = 5;
export const ULTIMO_NIVEL = HASTA / 1000;

/**
 * A qué altura se va a cruzar, en miles de pies: **el nivel que le toca por
 * el rumbo**, con la regla semicircular. Ver `flight/nivel-de-crucero.ts`.
 *
 * Lo que se pide es lo que pediría un plan de vuelo regional: nueve mil pies
 * y treinta más por kilómetro de ruta, que deja los saltos entre islas en once
 * o trece mil y las rutas largas de Paraguay cerca de los veinte mil — que es
 * donde vuelan de verdad. Y nunca por encima de lo que da el avión.
 */
export function nivelPrevisto(
  rumboGrados: number,
  metros: number,
  techoDelAvionM: number,
): number {
  const techoPies = Math.floor(techoDelAvionM / 0.3048 / 1000) * 1000;
  const pedido = Math.min(9000 + (metros / 1000) * 30, techoPies);
  const pies = nivelPara(rumboGrados, pedido);
  // Si el nivel que toca se pasa del techo del avión, uno por debajo en su
  // mismo sentido: dos mil pies menos.
  const cabe = pies > techoPies ? pies - 2000 : pies;
  return Math.max(PRIMER_NIVEL, Math.min(ULTIMO_NIVEL, Math.round(cabe / 1000)));
}

/** Las temperaturas que se dicen, en grados. */
export const MAS_FRIO = -5;
export const MAS_CALOR = 45;

/** La temperatura, redondeada y dentro de lo que hay grabado. */
export function gradosDichos(c: number): number {
  return Math.max(MAS_FRIO, Math.min(MAS_CALOR, Math.round(c)));
}

/**
 * Cómo está el cielo, dicho en palabras.
 *
 * Seis y no más, que son las que dice una comandante por megafonía. Salen del
 * parte y en su orden de importancia: lo que cae del cielo manda sobre las
 * nubes, y la niebla —menos de mil metros de visibilidad, que es la
 * definición del METAR— sobre cualquier capa.
 *
 * **Y la tormenta se dice**, porque es verdad y porque a quien va sentado
 * atrás le ahorra el susto de descubrirla. Se dice en calma y con lo que hay
 * que hacer: ver `comandante.cielo.tormenta`.
 */
export type Cielo =
  | "despejado"
  | "nubes"
  | "nublado"
  | "lluvia"
  | "tormenta"
  | "niebla";

export function cieloDe(m: Meteo): Cielo {
  if (m.lluvia === "tormenta") return "tormenta";
  if (m.lluvia === "lluvia" || m.lluvia === "llovizna") return "lluvia";
  if (m.visibilidadM < 1000) return "niebla";
  if (m.techoM === null) return "despejado";
  const tapa = m.tapadura ?? (m.techoM < 300 ? 0.9 : 0.45);
  return tapa >= 0.75 ? "nublado" : "nubes";
}

/** La pieza de cada cosa, que es como se llama su grabación. */
export const piezaDeMinutos = (n: number): string => `comandante.minutos.${n}`;
export const piezaDeDuracion = (n: number): string =>
  `comandante.previsto.vuelo.${n}`;
export const piezaDeNivel = (n: number): string =>
  `comandante.previsto.nivel.${n}`;
export const piezaDeCielo = (c: Cielo): string => `comandante.cielo.${c}`;
export const piezaDeGrados = (n: number): string =>
  n < 0 ? `comandante.temperatura.menos${-n}` : `comandante.temperatura.${n}`;

/** Un anuncio montado: la receta, qué va en sus huecos y el texto entero. */
export interface AnuncioMontado {
  readonly clave: string;
  readonly relleno: Readonly<Record<string, string>>;
  readonly texto: string;
}

/**
 * El texto de un trozo con número, como se lee en pantalla.
 *
 * Con el singular arreglado a mano: «1 grados» es lo único que la plantilla
 * no sabe decir, y pasa las noches frías del Chaco.
 */
function textoDe(clave: TranslationKey, n: number): string {
  return t(clave, { n })
    .replace(/\b1 grados\b/, "1 grado")
    .replace(/\b1 degrees\b/, "1 degree");
}

/**
 * La bienvenida con el plan: la de siempre de este destino, y detrás cuánto
 * se tarda y a qué altura se va.
 *
 * `bienvenida` es la forma que ya se eligió —la del destino o la de reserva—;
 * aquí solo se le cuelga el plan. En una vuelta al campo no se cuelga nada:
 * decirle a nadie a qué nivel se va a dar una vuelta es un plan de vuelo que
 * no existe. Ver `bienvenidaPara`.
 */
export function bienvenidaConPlan(
  bienvenida: { readonly id: string; readonly texto: string },
  segundosPrevistos: number | null,
  nivelMiles: number | null,
): AnuncioMontado {
  if (segundosPrevistos === null || nivelMiles === null)
    return { clave: bienvenida.id, relleno: {}, texto: bienvenida.texto };
  const min = minutosDichos(segundosPrevistos);
  return {
    clave: "comandante.bienvenidaConPlan",
    relleno: {
      bienvenida: bienvenida.id,
      vuelo: piezaDeDuracion(min),
      nivel: piezaDeNivel(nivelMiles),
    },
    texto: [
      bienvenida.texto,
      textoDe("comandante.previsto.vuelo", min),
      textoDe("comandante.previsto.nivel", nivelMiles),
    ].join(" "),
  };
}

/**
 * El anuncio del descenso: hacia dónde, cuánto falta y qué tiempo hace allí.
 *
 * `campo` es el aeródromo donde se va a tocar tierra, o `null` si se vuelve
 * al de salida. Si ese campo no tiene su trozo grabado —uno nuevo—, sale el
 * de reserva, que no lo nombra pero no calla. `segundos` puede faltar si no se
 * sabe a dónde se va: entonces no se promete una hora.
 *
 * `meteo` es **el tiempo de allí** si se sabe y, si no, el que haya. Lo que
 * cuenta una comandante es el del destino, que es el que le importa a quien
 * va a bajarse. Ver `game.ts`, que es quien decide cuál hay.
 */
export function descensoPara(
  campo: string | null,
  segundos: number | null,
  meteo: Meteo,
): AnuncioMontado {
  const suya = campo ? `comandante.descenso.hacia.${campo}` : null;
  const hacia: TranslationKey =
    campo === null
      ? "comandante.descenso.vuelta"
      : suya && hayTexto(suya)
        ? suya
        : "comandante.descenso.hacia";
  const cielo = cieloDe(meteo);
  const grados = gradosDichos(meteo.temp);
  const relleno: Record<string, string> = {
    hacia,
    cielo: piezaDeCielo(cielo),
    temperatura: piezaDeGrados(grados),
  };
  const textos = [t(hacia)];
  if (segundos !== null) {
    const min = minutosDichos(segundos);
    relleno.minutos = piezaDeMinutos(min);
    textos.push(textoDe("comandante.minutos", min));
  }
  textos.push(t(piezaDeCielo(cielo) as TranslationKey));
  textos.push(
    grados < 0
      ? textoDe("comandante.temperaturaBajoCero", -grados)
      : textoDe("comandante.temperatura", grados),
  );
  return { clave: "comandante.descenso", relleno, texto: textos.join(" ") };
}
