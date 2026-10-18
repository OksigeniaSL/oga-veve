/**
 * **La bienvenida de Jazlyn, siempre y distinta.**
 *
 * Había una sola por destino, con la misma redacción —«Señores pasajeros,
 * buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo
 * a…»— y solo cambiaban el sitio, los minutos y el nivel. La decisión de
 * Enrique fue ésta: «si son saludos diferentes cada vez, prefiero que hable
 * siempre». Así que aquí están las formas, y nunca sale la misma dos vuelos
 * seguidos.
 *
 * ## Lo que dicen todas
 *
 * Lo que de verdad dice una comandante al saludar, y en el orden en que lo
 * dice: **quién habla, a dónde se va, cuánto dura, a qué altura y qué tiempo
 * hace allá**. Es el esquema que se repite en los guiones de cualquier
 * compañía y en los consejos de los propios pilotos —el destino, el tiempo de
 * vuelo, el tiempo en destino y un cierre— (Plane & Pilot, «This Is Your
 * Captain Speaking»; airlinepilotforums.com, «the welcome PA»). Lo que cambia
 * de una forma a otra es **cómo**: el saludo según la hora, desde la cabina,
 * con los más chicos de a bordo en el saludo —«Señoras y señores, y los más
 * chicos de a bordo», en masculino genérico, sin desdoblar: ver
 * `i18n/sin-desdoblar.test.ts`—, con un detalle cierto del
 * sitio al que se va, o con algo de gracia. Ninguna inventa un procedimiento:
 * todas son la misma bienvenida dicha por la misma persona otro día.
 *
 * ## Por trozos enteros, como el resto de la megafonía
 *
 * Cada forma es la receta de siempre —`comandante.bienvenidaConPlan`— con
 * otras piezas en sus huecos: el saludo, la frase del destino, el plan, el
 * tiempo de allá y el cierre. Cada pieza es **una frase entera**, nunca una
 * palabra suelta pegada en medio de otra. Ver `bienvenidaConPlan` en
 * `partes-de-la-comandante.ts`.
 *
 * ## Y solo las que suenan
 *
 * Una forma entra en el sorteo el día que tiene todas sus piezas grabadas. La
 * voz del navegador es muda en Brave para Linux, y sortear entre una forma que
 * suena y otra que no es sortear si la comandante saluda. Hasta entonces sale
 * la de siempre —la `clasica`—, que está grabada desde el principio y es
 * también una de las formas: no se retira, se queda en la rueda.
 *
 * ## La versión en inglés, cuando se decida
 *
 * La megafonía de verdad va en dos idiomas, y eso está pendiente de Enrique
 * —el punto 148: ¿siempre, o solo en los vuelos largos?—. El sitio está
 * hecho: una forma es una lista de piezas y una receta, así que la versión
 * inglesa sería otra receta detrás de ésta con sus piezas en inglés, elegidas
 * aquí mismo. No se monta nada mezclando idiomas.
 *
 * Sin three.js ni audio, para poder comprobarlo sin navegador.
 */

import { hayTexto, t, type TranslationKey } from "../i18n";
import type { Meteo } from "../world/meteo";
import { bienvenidaPara } from "./destino-dicho";
import {
  bienvenidaConPlan,
  type AnuncioMontado,
  type Trozo,
} from "./partes-de-la-comandante";
import { elegirSinRepetir } from "./sin-repetir";

/** Las formas de dar la bienvenida, por su nombre. */
export const FORMAS_DE_BIENVENIDA = [
  "clasica",
  "pasajeros",
  "cabina",
  "chicos",
  "gracia",
] as const;

export type FormaDeBienvenida = (typeof FORMAS_DE_BIENVENIDA)[number];

/** Con qué se saluda según la hora: buenos días, buenas tardes, buenas noches. */
export type HoraDelSaludo = "dias" | "tardes" | "noches";

/**
 * **Cómo se saluda a esta hora.**
 *
 * Por la mañana, buenos días, también de madrugada con el cielo todavía
 * oscuro: un vuelo de las seis se saluda así en cualquier compañía. Desde el
 * mediodía, buenas tardes **mientras haya sol**, y buenas noches en cuanto se
 * pone: en Asunción en junio a las seis ya es de noche, y en Tenerife en
 * agosto a las nueve todavía hay luz. Lo dice el sol, no el reloj. La hora es
 * la solar del sitio, que es la del juego: ver `world/hora.ts`.
 */
export function horaDelSaludo(horaSolar: number, solArriba: boolean): HoraDelSaludo {
  const h = ((horaSolar % 24) + 24) % 24;
  if (h >= 5 && h < 12) return "dias";
  if (h >= 12 && solArriba) return "tardes";
  return "noches";
}

/** Lo que lleva una forma: de dónde sale cada uno de sus trozos. */
interface ComoEs {
  /** Las piezas de saludo que valen a esta hora, o `null` si la lleva la frase del destino. */
  readonly saludo: ((hora: HoraDelSaludo) => readonly string[]) | null;
  /**
   * La frase del destino: `a` dice a dónde se va sin más, `detalle` lo dice
   * con algo cierto del sitio, y `null` es la de siempre, que lleva el saludo
   * dentro. Ver `bienvenidaPara`.
   */
  readonly destino: "a" | "detalle" | null;
  readonly cierre: string | null;
}

/** Los tres saludos con gracia, que no dependen de la hora. */
export const SALUDOS_CON_GRACIA = [
  "comandante.bienvenida.gracia.1",
  "comandante.bienvenida.gracia.2",
  "comandante.bienvenida.gracia.3",
] as const;

const COMO_ES: Readonly<Record<FormaDeBienvenida, ComoEs>> = {
  clasica: { saludo: null, destino: null, cierre: null },
  pasajeros: {
    saludo: (h) => [`comandante.bienvenida.saludo.pasajeros.${h}`],
    destino: "a",
    cierre: "comandante.bienvenida.cierre.disfruten",
  },
  cabina: {
    saludo: (h) => [`comandante.bienvenida.saludo.cabina.${h}`],
    destino: "detalle",
    cierre: null,
  },
  chicos: {
    saludo: (h) => [`comandante.bienvenida.saludo.chicos.${h}`],
    destino: "a",
    cierre: "comandante.bienvenida.cierre.gracias",
  },
  gracia: {
    saludo: () => SALUDOS_CON_GRACIA,
    destino: "detalle",
    cierre: "comandante.bienvenida.cierre.acomodense",
  },
};

/** Lo que hace falta saber del vuelo para dar la bienvenida. */
export interface ParaLaBienvenida {
  readonly salidaId: string;
  /** El destino del tramo, o `null` en una vuelta al campo. */
  readonly destinoId: string | null;
  readonly hora: HoraDelSaludo;
  /** Lo que dura el vuelo según el plan, s, o `null` sin plan. */
  readonly segundos: number | null;
  /** El nivel de crucero en miles de pies, o `null` si no se dice. */
  readonly nivel: number | null;
  /** El tiempo que hace allá, o `null` si no se va a ninguna parte. */
  readonly alla: Meteo | null;
  /** Si una pieza tiene su grabación. */
  readonly grabada: (pieza: string) => boolean;
  /** La forma de la última bienvenida, de este vuelo o de otro, o `null`. */
  readonly ultima: string | null;
  readonly azar?: () => number;
}

/** Si el tramo vuelve al campo de salida. */
const esUnaVuelta = (p: { salidaId: string; destinoId: string | null }): boolean =>
  !p.destinoId || p.destinoId === p.salidaId;

/** La frase del destino de una forma, por su pieza: `comandante.bienvenida.a.lanzarote`. */
function fraseDelDestino(como: "a" | "detalle", p: ParaLaBienvenida): string {
  return `comandante.bienvenida.${como}.${esUnaVuelta(p) ? "local" : p.destinoId}`;
}

/** Una pieza que se puede decir: escrita y grabada. */
const sePuede = (id: string, p: ParaLaBienvenida): boolean => hayTexto(id) && p.grabada(id);

const trozo = (id: string): Trozo => ({ id, texto: t(id as TranslationKey) });

/**
 * **Las piezas de una forma para este tramo**, o `null` si alguna no se puede
 * decir —un destino nuevo sin su frase, una pieza sin grabar—.
 *
 * La clásica siempre se puede: es la de siempre, con su frase por destino y la
 * de reserva para un campo nuevo, y no se le pregunta por la grabación porque
 * está en el pack desde que existe la comandante.
 */
export function piezasDe(
  forma: FormaDeBienvenida,
  p: ParaLaBienvenida,
): { readonly saludo?: Trozo; readonly bienvenida: Trozo; readonly cierre?: Trozo } | null {
  const como = COMO_ES[forma];
  if (!como.destino)
    return { bienvenida: trozo(bienvenidaPara(p.salidaId, esUnaVuelta(p) ? null : p.destinoId)) };
  const destino = fraseDelDestino(como.destino, p);
  if (!sePuede(destino, p)) return null;
  const saludos = (como.saludo?.(p.hora) ?? []).filter((id) => sePuede(id, p));
  if (como.saludo && saludos.length === 0) return null;
  if (como.cierre && !sePuede(como.cierre, p)) return null;
  const azar = p.azar ?? Math.random;
  const saludo = saludos.length
    ? saludos[Math.min(saludos.length - 1, Math.floor(azar() * saludos.length))]
    : undefined;
  return {
    ...(saludo ? { saludo: trozo(saludo) } : {}),
    bienvenida: trozo(destino),
    ...(como.cierre ? { cierre: trozo(como.cierre) } : {}),
  };
}

/** Las formas que caben hoy en este tramo, en su orden. La clásica, siempre. */
export function formasQueCaben(p: ParaLaBienvenida): FormaDeBienvenida[] {
  return FORMAS_DE_BIENVENIDA.filter((f) => piezasDe(f, p) !== null);
}

/**
 * **La bienvenida de este vuelo**: una de las formas que caben, nunca la de la
 * última vez, montada con su plan y el tiempo de allá.
 *
 * Devuelve también qué forma salió, para recordarla: es lo único que se guarda,
 * y no dice nada de nadie. Ver `datos/guardado.ts`.
 */
export function laBienvenida(p: ParaLaBienvenida): {
  readonly forma: FormaDeBienvenida;
  readonly anuncio: AnuncioMontado;
} {
  const azar = p.azar ?? Math.random;
  const forma =
    elegirSinRepetir(formasQueCaben(p), p.ultima as FormaDeBienvenida | null, azar) ??
    "clasica";
  const piezas = piezasDe(forma, p) ?? piezasDe("clasica", p)!;
  const vuelta = esUnaVuelta(p);
  return {
    forma,
    anuncio: bienvenidaConPlan(
      piezas.bienvenida,
      vuelta ? null : p.segundos,
      vuelta ? null : p.nivel,
      p.grabada,
      {
        ...(piezas.saludo ? { saludo: piezas.saludo } : {}),
        ...(piezas.cierre ? { cierre: piezas.cierre } : {}),
        alla: vuelta ? null : p.alla,
      },
    ),
  };
}
