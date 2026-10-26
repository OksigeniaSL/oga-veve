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
 * es como se cuentan; pasada la hora, de cuarto en cuarto y en horas —«una
 * hora y media»—, y los grados y los pies al entero. Así además hay una
 * cantidad finita de trozos que grabar.
 *
 * Sin three.js ni audio, para poder comprobarlo sin navegador.
 */

import { hayTexto, t, type TranslationKey } from "../i18n";
import type { Meteo } from "../world/meteo";
import { HASTA } from "../flight/nivel-de-crucero";

/**
 * Los minutos que se dicen **en minutos**: los pocos de una bajada corta y de
 * cinco en cinco hasta la hora. Son las que se montan con la plantilla —«unos
 * {n} minutos»— en `scripts/frases-para-grabar.mjs`.
 */
export const MINUTOS_QUE_SE_DICEN = [
  2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
] as const;

/**
 * **Y pasada la hora, en horas**, en minutos y de cuarto en cuarto: «una hora
 * y cuarto», «una hora y media», «una hora y cuarenta y cinco», «dos horas».
 *
 * Es como lo dice una comandante de verdad: nadie anuncia por megafonía
 * «unos noventa minutos». Y hace falta, porque la duración se cuenta con su
 * subida y su bajada —ver `segundosPorElPerfil`— y con eso el JAZ 60 pasa de
 * la hora en las rutas largas de Paraguay: de Pedro Juan a Guaraní, unos
 * setenta y tres minutos sin viento y casi noventa con treinta nudos de
 * cara. Con dos horas sobra para todo lo que el juego le puede pedir a un
 * avión con pasaje.
 *
 * Cada una es **una frase entera con su número dentro**, como las de los
 * minutos, pero escrita a mano en el diccionario —`comandante.previsto.vuelo.h75`,
 * `comandante.minutos.h75`…—, porque «una hora y cuarto» no sale de rellenar
 * «unos {n} minutos». Ver `piezaDeDuracion`.
 */
export const HORAS_QUE_SE_DICEN = [75, 90, 105, 120] as const;

/** Todo lo que se dice, en minutos y en orden: las dos listas juntas. */
const LO_QUE_SE_DICE: readonly number[] = [...MINUTOS_QUE_SE_DICEN, ...HORAS_QUE_SE_DICEN];

/** Si esos minutos se dicen en horas. Ver `HORAS_QUE_SE_DICEN`. */
export const seDiceEnHoras = (n: number): boolean =>
  n > MINUTOS_QUE_SE_DICEN[MINUTOS_QUE_SE_DICEN.length - 1]!;

/** Los minutos, redondeados como se dicen. `segundos` es lo que falta. */
export function minutosDichos(segundos: number): number {
  const min = segundos / 60;
  let mejor: number = LO_QUE_SE_DICE[0]!;
  for (const m of LO_QUE_SE_DICE)
    if (Math.abs(m - min) < Math.abs(mejor - min)) mejor = m;
  return mejor;
}

/**
 * **Los minutos que se dicen, o `null` si no se pueden decir a su altura.**
 *
 * Lo grabado acababa en sesenta, y `minutosDichos` redondeaba al más cercano:
 * un vuelo de hora y tres cuartos salía «unos sesenta minutos». Ahora, pasada
 * la hora, se dice en horas —ver `HORAS_QUE_SE_DICEN`—, y más allá de la
 * última, nada: un número que no puede sonar a su altura no se dice.
 *
 * `grabada` dice si la pieza de esa duración tiene ya su grabación, por su
 * nombre. **Solo se pregunta por las de horas**, que son nuevas: las de
 * minutos están en el pack desde que existe el plan, y preguntar por ellas
 * con el pack todavía bajando dejaría la bienvenida sin plan para nada. Sin
 * `grabada`, las de horas no se dicen: una frase que el juego pide y nadie
 * grabó la dice la voz del navegador, que en Brave para Linux es muda, y se
 * lleva por delante el anuncio entero.
 */
export function minutosQueSeDicen(
  segundos: number,
  pieza: (n: number) => string = piezaDeDuracion,
  grabada: (pieza: string) => boolean = () => false,
): number | null {
  const ultimo = HORAS_QUE_SE_DICEN[HORAS_QUE_SE_DICEN.length - 1]!;
  if (segundos / 60 > ultimo + 7.5) return null;
  const n = minutosDichos(segundos);
  if (seDiceEnHoras(n) && !grabada(pieza(n))) return null;
  return n;
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
 * **Y los de los saltos cortos, cuando tengan su toma**: tres y cuatro mil
 * pies. De El Hierro a La Gomera el plan del JAZ 60 cruza a cuatro mil, y con
 * la primera grabación en cinco la bienvenida no podía decirlo. Se dicen el
 * día que estén grabados, y hasta entonces no: ver `nivelDicho`.
 */
export const NIVELES_BAJOS = [3, 4] as const;

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
export function nivelDicho(
  cruceroM: number,
  /** Si una pieza tiene su grabación: los niveles bajos, solo con ella. */
  grabada: (pieza: string) => boolean = () => false,
): number | null {
  const miles = Math.round(cruceroM / 0.3048 / 1000);
  if ((NIVELES_BAJOS as readonly number[]).includes(miles))
    return grabada(piezaDeNivel(miles)) ? miles : null;
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

/**
 * La pieza de cada cosa, que es como se llama su grabación. Las de horas
 * llevan una `h` delante del número —`comandante.minutos.h90`, «una hora y
 * media»— porque son otra frase, escrita a mano. Ver `HORAS_QUE_SE_DICEN`.
 */
export const piezaDeMinutos = (n: number): string =>
  `comandante.minutos.${seDiceEnHoras(n) ? "h" : ""}${n}`;
export const piezaDeDuracion = (n: number): string =>
  `comandante.previsto.vuelo.${seDiceEnHoras(n) ? "h" : ""}${n}`;
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

/** Un trozo grabado entero: cómo se llama su pieza y qué dice. */
export interface Trozo {
  readonly id: string;
  readonly texto: string;
}

/**
 * **El tiempo de allá, en dos frases enteras**: cómo está el cielo y cuántos
 * grados hay. Es lo mismo en la bienvenida, a mitad de un vuelo largo y al
 * empezar a bajar, y por eso se monta en un solo sitio: las tres veces con las
 * mismas piezas y el mismo redondeo. Ver `cieloDe` y `gradosDichos`.
 */
export function elTiempoDeAlla(meteo: Meteo): {
  readonly relleno: { readonly cielo: string; readonly temperatura: string };
  readonly texto: string;
} {
  const cielo = cieloDe(meteo);
  const grados = gradosDichos(meteo.temp);
  return {
    relleno: { cielo: piezaDeCielo(cielo), temperatura: piezaDeGrados(grados) },
    texto: [
      t(piezaDeCielo(cielo) as TranslationKey),
      grados < 0
        ? textoDe("comandante.temperaturaBajoCero", -grados)
        : textoDe("comandante.temperatura", grados),
    ].join(" "),
  };
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
 * El texto de una duración: con la plantilla si va en minutos, y la frase
 * entera de su pieza si va en horas. Ver `HORAS_QUE_SE_DICEN`.
 */
export function textoDeLaDuracion(
  plantilla: TranslationKey,
  pieza: (n: number) => string,
  n: number,
): string {
  return seDiceEnHoras(n) ? t(pieza(n) as TranslationKey) : textoDe(plantilla, n);
}

/** Lo que se le puede poner a la bienvenida alrededor del plan. */
export interface AlrededorDeLaBienvenida {
  /**
   * El saludo de delante, con su nombre —«Buenas tardes, señores pasajeros.
   * Les habla la comandante Jazlyn.»—, cuando la frase del destino no lo
   * lleva. Ver `audio/bienvenidas.ts`.
   */
  readonly saludo?: Trozo;
  /** Y la de despedirse hasta el aterrizaje: «Relájense…». */
  readonly cierre?: Trozo;
  /**
   * **El tiempo de allá**, si se va a alguna parte. En una vuelta al campo no
   * se dice: «allá» es el destino, y volver aquí no lo tiene.
   */
  readonly alla?: Meteo | null;
}

/**
 * La bienvenida con el plan: la frase del destino, y detrás cuánto se tarda,
 * a qué altura se va y qué tiempo hace allá.
 *
 * `bienvenida` es la frase que ya se eligió —la del destino o la de reserva—;
 * aquí solo se le cuelga lo demás. En una vuelta al campo no se cuelga el
 * plan: decirle a nadie a qué nivel se va a dar una vuelta es un plan de vuelo
 * que no existe. Ver `bienvenidaPara`.
 *
 * **Y el tiempo de allá, que es lo que de verdad cuenta una comandante al
 * saludar**: cuánto dura, a qué altura y qué cielo y cuántos grados hay donde
 * se va. Lo decía solo al empezar a bajar; ahora se dice también al salir,
 * como en cualquier vuelo de línea. Va en su hueco con interrogante, así que
 * la receta es la misma con él y sin él. Ver `elTiempoDeAlla`.
 *
 * La duración y el nivel van **juntos o ninguno**: sin la grabación de una
 * duración en horas, o con un nivel fuera de lo grabado, el plan se calla
 * entero, como siempre. Un número que no puede sonar a su altura no se dice.
 */
export function bienvenidaConPlan(
  bienvenida: Trozo,
  segundosPrevistos: number | null,
  nivelMiles: number | null,
  /** Si una pieza tiene su grabación. Ver `minutosQueSeDicen`. */
  grabada?: (pieza: string) => boolean,
  alrededor: AlrededorDeLaBienvenida = {},
): AnuncioMontado {
  const min =
    segundosPrevistos === null
      ? null
      : minutosQueSeDicen(segundosPrevistos, piezaDeDuracion, grabada);
  /*
   * **Cuánto dura y a qué altura, cada uno por su lado.** Iban juntos —o los
   * dos, o ninguno—, y en un salto corto el nivel cae por debajo de lo
   * grabado: de El Hierro a La Gomera, cuatro mil pies, y la bienvenida se
   * quedaba sin decir ni cuánto duraba el vuelo, que es lo primero que quiere
   * saber quien va sentado. Lo que se puede decir, se dice.
   */
  const conDuracion = min !== null;
  const conNivel = nivelMiles !== null;
  const { saludo, cierre, alla } = alrededor;
  if (!conDuracion && !conNivel && !saludo && !cierre && !alla)
    return { clave: bienvenida.id, relleno: {}, texto: bienvenida.texto };
  const relleno: Record<string, string> = {};
  const textos: string[] = [];
  if (saludo) {
    relleno.saludo = saludo.id;
    textos.push(saludo.texto);
  }
  relleno.bienvenida = bienvenida.id;
  textos.push(bienvenida.texto);
  if (conDuracion) {
    relleno.vuelo = piezaDeDuracion(min);
    textos.push(textoDeLaDuracion("comandante.previsto.vuelo", piezaDeDuracion, min));
  }
  if (conNivel) {
    relleno.nivel = piezaDeNivel(nivelMiles);
    textos.push(textoDe("comandante.previsto.nivel", nivelMiles));
  }
  if (alla) {
    const tiempo = elTiempoDeAlla(alla);
    Object.assign(relleno, tiempo.relleno);
    textos.push(tiempo.texto);
  }
  if (cierre) {
    relleno.cierre = cierre.id;
    textos.push(cierre.texto);
  }
  return { clave: "comandante.bienvenidaConPlan", relleno, texto: textos.join(" ") };
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
  /** Si una pieza tiene su grabación. Ver `minutosQueSeDicen`. */
  grabada?: (pieza: string) => boolean,
): AnuncioMontado {
  const suya = campo ? `comandante.descenso.hacia.${campo}` : null;
  const hacia: TranslationKey =
    campo === null
      ? "comandante.descenso.vuelta"
      : suya && hayTexto(suya)
        ? suya
        : "comandante.descenso.hacia";
  const tiempo = elTiempoDeAlla(meteo);
  const relleno: Record<string, string> = { hacia, ...tiempo.relleno };
  const textos = [t(hacia)];
  const min =
    segundos === null ? null : minutosQueSeDicen(segundos, piezaDeMinutos, grabada);
  if (min !== null) {
    relleno.minutos = piezaDeMinutos(min);
    textos.push(textoDeLaDuracion("comandante.minutos", piezaDeMinutos, min));
  }
  textos.push(tiempo.texto);
  return { clave: "comandante.descenso", relleno, texto: textos.join(" ") };
}
