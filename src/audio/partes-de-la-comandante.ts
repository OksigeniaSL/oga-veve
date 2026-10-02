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
import { HASTA } from "../flight/nivel-de-crucero";

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
 * **Los minutos que se dicen, o `null` si pasan de lo grabado.**
 *
 * Lo grabado acaba en sesenta, y `minutosDichos` redondea al más cercano: un
 * vuelo de hora y tres cuartos salía «unos sesenta minutos». Con la duración
 * contada con su subida y su bajada —ver `segundosPorElPerfil`— eso le pasa
 * al JAZ 60 en las rutas largas de Paraguay: a Pedro Juan, al Chaco. Un
 * número que no puede sonar a su altura no se dice; las piezas que faltan
 * están en `PENDIENTE-VOCES-sueltos.md`.
 */
export function minutosQueSeDicen(segundos: number): number | null {
  const ultimo = MINUTOS_QUE_SE_DICEN[MINUTOS_QUE_SE_DICEN.length - 1]!;
  return segundos / 60 > ultimo + 2.5 ? null : minutosDichos(segundos);
}

/*
 * **Cuánto dura el vuelo no se cuenta aquí.** Se contaba —la ruta al crucero
 * y cuatro minutos más— y daba quince minutos de Los Rodeos a La Palma, donde
 * Binter pone treinta. Lo dice la hora del plan, la misma de la pantalla de
 * navegación: ver `segundosPorElPerfil` en `flight/ruta.ts`.
 */

/**
 * Cuánto falta para tocar tierra desde aquí, en segundos, **sin plan**: en
 * una vuelta al campo, que no lleva hora de llegada.
 *
 * A la velocidad que se lleva y con un minuto más para la aproximación, que
 * es donde se frena. Con plan, lo que falta es la hora del plan.
 */
export function segundosHastaTocar(metros: number, velocidadMs: number): number {
  return metros / Math.max(40, velocidadMs) + 60;
}

/** Los niveles que se dicen, en miles de pies. */
export const PRIMER_NIVEL = 5;
export const ULTIMO_NIVEL = HASTA / 1000;

/**
 * A qué altura se va a cruzar, en miles de pies: **el crucero del plan**,
 * dicho como se dice. O `null` si ese nivel no está entre los que hay
 * grabados.
 *
 * No hay aquí una cuenta propia, y es a propósito. Había una —nueve mil pies y
 * treinta más por kilómetro en línea recta— y el plan tenía otra, y de Los
 * Rodeos a Tenerife Sur la comandante anunciaba diez mil pies para un plan de
 * doce mil. Lo que se dice es lo que se vuela: el nivel lo pone
 * `cruceroDelPlan` en `flight/ruta.ts`, con la regla semicircular y el relieve,
 * y aquí solo se pasa a miles de pies.
 *
 * Y fuera de lo grabado, **no se dice**: redondear un plan de tres mil pies a
 * los cinco mil de la primera grabación sería anunciar una altura que no es.
 * Un número que no puede sonar a su altura no se dice.
 */
export function nivelDicho(cruceroM: number): number | null {
  const miles = Math.round(cruceroM / 0.3048 / 1000);
  return miles >= PRIMER_NIVEL && miles <= ULTIMO_NIVEL ? miles : null;
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
  const min = segundosPrevistos === null ? null : minutosQueSeDicen(segundosPrevistos);
  if (min === null || nivelMiles === null)
    return { clave: bienvenida.id, relleno: {}, texto: bienvenida.texto };
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
  const min = segundos === null ? null : minutosQueSeDicen(segundos);
  if (min !== null) {
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
