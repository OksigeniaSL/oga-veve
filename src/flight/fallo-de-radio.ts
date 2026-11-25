/**
 * **El fallo de radio**: el número que lo dice por ti y la lámpara que te
 * contesta (#90, #83).
 *
 * Se va la radio en la subida: ni se oye a la torre ni ella te oye. Lo que se
 * hace es lo del SERA, el Reglamento de Ejecución (UE) 923/2012, que es el que
 * vale en Canarias; las páginas, en el ADR 0014, enmienda H71. **En Paraguay
 * manda la DINAC**, y en todo lo de este ejercicio dice lo mismo: el 7600, el
 * R 10 volumen II, 5.2.2.7.1.3.3, con el volumen IV, 2.1.4.2.2, y el AIP, ENR
 * 1.6, 2.4; seguir en visual, aterrizar en el más próximo y mirar a la torre,
 * el R 2, 3.6.5.2; las luces y las alas o los faros, su apéndice 1, 4.1. Las
 * páginas, en la enmienda H86. El SERA:
 *
 * - **El 7600 en el transpondedor** (SERA.14083 c) 2) y SERA.13005 a) 2)). Es
 *   el código de «fallo de la radiocomunicación»: en la pantalla de la torre
 *   tu etiqueta cambia, y sin decir nada ya saben lo que te pasa. Es lo que
 *   «lo dice por ti». **Donde la torre no tiene radar se marca igual**, que lo
 *   manda la norma y lo ve quien te tenga en su pantalla; pero a esa torre la
 *   avisan otras dos cosas: que no contestas y que te ve volver. Vigila
 *   mirando, con un radar o sin él (DINAC R 4444, 7.1.1.2). Es Encarnación:
 *   ver `sinRadarPublicado` en `ejercicios.ts` y la enmienda H91.
 * - **Seguir en visual y aterrizar en el aeródromo adecuado más próximo**
 *   (c) 3)), que aquí es el de salida; y, en el tránsito de un aeródromo
 *   controlado, **estar atento a las señales visuales** (c) 1)): mirar a la
 *   torre, que es quien te habla ahora, con una lámpara.
 * - **Lo que dice cada luz a un avión en vuelo** (apéndice 1, tabla AP 1-1):
 *   verde fija, autorizado para aterrizar; roja fija, ceder el paso a las
 *   otras aeronaves y seguir en el circuito; serie de destellos verdes,
 *   regresar para aterrizar —el permiso llegará a su debido tiempo—. La serie
 *   de destellos rojos (aeródromo peligroso, no aterrizar), la de destellos
 *   blancos (aterrizar aquí y dirigirse a la plataforma) y la pirotecnia roja
 *   existen y no salen en este ejercicio: aquí no hay aeródromo peligroso ni
 *   una plataforma a la que mandar a nadie sin el permiso de aterrizar.
 * - **Acusar recibo** (apéndice 1, 3.1.2 a)): de día, alabeando, **excepto en
 *   la base y en la final** —para la DINAC es una nota: ahí no debe esperarse—;
 *   de noche, con dos destellos de los faros. La noche es la de la norma, desde
 *   el fin del crepúsculo civil: ver `esDeNoche` en `sellos.ts`.
 *
 * **La lámpara manda lo que el tráfico pide, con la misma regla que los
 * permisos de siempre**: la roja cuando la torre te manda irte —la pista
 * ocupada, la otra punta, tu salida tapada—, la verde fija cuando te deja
 * aterrizar, y los destellos mientras te cuenta en su circuito sin haberte
 * dejado todavía. Esto no decide ni el permiso ni la orden: los lee del juego,
 * que los decide como siempre (`flight/turno-de-pista.ts`,
 * `flight/la-aproximacion.ts`). Lo único nuevo es que, sin radio, la torre
 * no lo dice: lo enciende.
 *
 * Sin three.js ni DOM: se prueba en `fallo-de-radio.test.ts`.
 */

import type { TranslationKey } from "../i18n";

/**
 * **Lo que se dice donde la torre no tiene radar**: allí no es verdad que el
 * 7600 se lo diga a la torre, que es lo que cuentan las tres de siempre. Las
 * demás —cada luz, las alas, el otro cierre— valen igual en los dos sitios.
 * Ver `segunElRadar` en `ejercicios.ts` y el ADR 0014, enmienda H91.
 */
export const SIN_RADAR: Readonly<Partial<Record<TranslationKey, TranslationKey>>> = {
  "ejercicio.fallo-de-radio.antes": "ejercicio.fallo-de-radio.antesSinRadar",
  "ejercicio.radio.callada": "ejercicio.radio.calladaSinRadar",
  "ejercicio.radio.bien": "ejercicio.radio.bienSinRadar",
};

/** El código de fallo de comunicaciones, en el transpondedor. */
export const CODIGO_SIN_RADIO = "7600";

/**
 * **Lo que tarda cada cifra en marcarse**, s. Se ve marcar una a una en la
 * tarjeta: la caja tiene cuatro ruedas, y se giran de una en una.
 */
export const CADA_CIFRA = 0.8;

/**
 * **Las cifras ya marcadas** a los `segundos` de empezar: «7», «76», «760» y
 * «7600». Vacío antes de empezar.
 */
export function cifrasMarcadas(segundos: number): string {
  if (!(segundos >= 0)) return "";
  const cuantas = Math.min(CODIGO_SIN_RADIO.length, 1 + Math.floor(segundos / CADA_CIFRA));
  return CODIGO_SIN_RADIO.slice(0, cuantas);
}

/** Lo que tarda en estar puesto el código entero, s. */
export const MARCADO_EN = CADA_CIFRA * CODIGO_SIN_RADIO.length;

/**
 * **Lo que tarda la torre en verte el código y buscarte con la lámpara**, s,
 * desde que está marcado entero. Sin fuente: es lo que tarda en refrescarse
 * una pantalla de radar y en coger una lámpara, y deja a la instructora
 * contar el 7600 antes de que la torre conteste.
 */
export const LA_TORRE_LO_VE = 10;

/**
 * **Lo que tarda en darse cuenta la torre que no tiene radar**, s, desde que
 * se calló la radio: te llama, no contestas, te llama por la otra frecuencia
 * —Encarnación publica dos, 118.0 y 118.2— y coge la lámpara. Que se llame por
 * la principal y por la secundaria es lo que manda el R 10, volumen II,
 * 5.2.2.7.2.1; cuánto se espera lo fija la autoridad en cada sitio
 * (5.2.2.7.2.2) y no está publicado: los segundos son nuestros, y más que con
 * radar, que es lo que pasa cuando hay que darse cuenta sin una pantalla.
 */
export const LA_TORRE_SE_DA_CUENTA = 20;

/**
 * Lo que enciende la lámpara **para un avión en vuelo**: verde fija, roja fija
 * o verde a destellos. `null`, apagada.
 */
export type LuzSinRadio = "verde" | "roja" | "destellos" | null;

/** Lo que la torre sabe de ti en cada paso. */
export interface LoQueVeLaTorre {
  readonly enElAire: boolean;
  /**
   * **Si te tiene mandado irte**, por lo que sea: la pista ocupada, la otra
   * punta o tu salida tapada. Ver `mandaronIrseAlAire` en `game.ts`.
   */
  readonly teMandaIrte: boolean;
  /** Si te ha dejado aterrizar: el permiso de siempre. Ver `autorizarElAterrizaje`. */
  readonly teDejaAterrizar: boolean;
  /** Si te cuenta en su circuito. Ver `flight/circuito-de-la-torre.ts`. */
  readonly teCuenta: boolean;
  /**
   * **Si vas en la base o en la final**: ahí no se pide alabear para
   * contestar, y los destellos no se encienden —en la final lo que toca es
   * la fija, verde o roja—.
   */
  readonly enLaBaseOEnLaFinal: boolean;
  /** Segundos desde que el 7600 está marcado entero, o `null` sin él. */
  readonly conElCodigo: number | null;
  /**
   * **En un campo sin radar publicado**, segundos desde que se calló la radio:
   * ahí el código no lo ve la torre, y lo que la avisa es que no contestas.
   * Sin decir, o `null`, la torre ve el código. Ver `sinRadarPublicado`.
   */
  readonly sinContestar?: number | null;
  /**
   * Segundos desde la última vez que se tocó el suelo, o `null` si no se ha
   * tocado desde el despegue. Ver `REBOTE`.
   */
  readonly desdeQueToco?: number | null;
}

/**
 * **Lo que dura un bote**, s. Al tocar se gasta el permiso —lo que venga
 * después es otra final— y un bote de un segundo encendía los destellos a
 * siete metros de la pista: la torre no cambia de señal por un bote. Lo que
 * sigue en el aire pasado esto ya es irse.
 */
export const REBOTE = 5;

/**
 * **Si la torre ya sabe que estás sin radio**: con radar, porque ha visto el
 * 7600; sin él, porque no contestas. Ver `sinContestar`.
 */
export function laTorreSabeQueNoTienesRadio(v: Pick<LoQueVeLaTorre, "conElCodigo" | "sinContestar">): boolean {
  if (v.sinContestar !== undefined && v.sinContestar !== null) return v.sinContestar >= LA_TORRE_SE_DA_CUENTA;
  return v.conElCodigo !== null && v.conElCodigo >= LA_TORRE_LO_VE;
}

/**
 * **La luz que toca**, para quien no tiene radio. Primero la orden de irse,
 * que corta todo lo demás; después el permiso; y si no hay ni lo uno ni lo
 * otro y te cuenta en su circuito sabiendo ya que estás sin radio, los
 * destellos: «regresar para aterrizar». Ver la cabecera.
 */
export function luzParaQuienNoTieneRadio(v: LoQueVeLaTorre): LuzSinRadio {
  if (!v.enElAire) return null;
  if (v.teMandaIrte) return "roja";
  if (v.teDejaAterrizar) return "verde";
  if (v.teCuenta && !v.enLaBaseOEnLaFinal && laTorreSabeQueNoTienesRadio(v)) return "destellos";
  return null;
}

/**
 * **La lámpara no se apaga por geometría**: una vez que la torre te ha
 * llamado con los destellos, en el aire la lámpara siempre dice algo, y lo
 * último que dijo se queda hasta que mande otra cosa. Sin esto se apagaba
 * unos segundos en la esquina del tramo cruzado, donde la torre deja de
 * contarte en su circuito, y una lámpara de verdad no se apaga y se enciende
 * por dónde vas. El SERA no pide apagarla en ningún sitio.
 *
 * Lo que no se queda es lo que dejó de ser verdad: la verde fija sin
 * permiso, o la roja sin orden de irse. Entonces vuelven los destellos
 * —«regrese para aterrizar»—, que es lo que la torre te está diciendo
 * mientras no te deje aterrizar ni te mande irte. Lo que sí se mira solo al
 * empezar es la base y la final: los primeros destellos no se encienden ahí,
 * que es donde no se pide alabear para contestar.
 */
export class LamparaSinRadio {
  /** Si la torre ya te llamó con los destellos en este vuelo. */
  private llamado = false;
  /** La última luz encendida en el aire, que es la que se queda en un bote. */
  private ultima: LuzSinRadio = null;

  /** Un paso: la luz de ahora. */
  paso(v: LoQueVeLaTorre): LuzSinRadio {
    if (!v.enElAire) {
      this.llamado = false;
      return null;
    }
    // En un bote, lo que había antes de tocar. Ver `REBOTE`.
    if (v.desdeQueToco !== undefined && v.desdeQueToco !== null && v.desdeQueToco < REBOTE) return this.ultima;
    this.ultima = this.luzDelAire(v);
    return this.ultima;
  }

  private luzDelAire(v: LoQueVeLaTorre): LuzSinRadio {
    const luz = luzParaQuienNoTieneRadio(v);
    if (luz === "destellos") this.llamado = true;
    if (luz !== null) return luz;
    return this.llamado ? "destellos" : null;
  }

  /** Otro vuelo, o la radio de vuelta. */
  reiniciar(): void {
    this.llamado = false;
    this.ultima = null;
  }
}

/** El alabeo que cuenta como mover las alas para contestar, rad: diez grados. */
export const ALABEO_DE_ACUSE = (10 * Math.PI) / 180;

/**
 * **Lo que se tiene para pasar de un lado al otro**, s. Un alabeo de
 * contestar es de un lado y enseguida del otro; un viraje del circuito es de
 * un lado y largo, y el siguiente es del mismo lado.
 */
export const ACUSE_EN = 4;

/**
 * **Las alas que contestan**: un alabeo de más de diez grados a un lado y,
 * en menos de cuatro segundos desde que se dejó ese lado, otro al contrario.
 */
export class AlasQueContestan {
  /** El último lado por encima del umbral: 1 a la derecha, −1 a la izquierda. */
  private lado: 1 | -1 | 0 = 0;
  /** Segundos desde que se estuvo por última vez de ese lado. */
  private desde = 0;

  /** Un paso, con el alabeo de ahora en rad. Verdad el paso en que contestan. */
  paso(alabeo: number, dt: number): boolean {
    this.desde += dt;
    const ahora: 1 | -1 | 0 = alabeo > ALABEO_DE_ACUSE ? 1 : alabeo < -ALABEO_DE_ACUSE ? -1 : 0;
    if (ahora === 0) return false;
    const contesta = this.lado !== 0 && ahora !== this.lado && this.desde <= ACUSE_EN;
    this.lado = ahora;
    this.desde = 0;
    return contesta;
  }
}

/**
 * **Lo que tarda la instructora en contestar con los faros**, s, desde que la
 * torre enciende los destellos: los ve, y en su frase va contando qué quieren
 * decir cuando los prende. Sin fuente.
 */
export const CONTESTA_CON_LOS_FAROS_A_LOS = 5;

/** Lo que dura cada golpe de los faros, encendidos o apagados, s: que se vea y se cuente. */
export const GOLPE_DE_FAROS = 0.7;

/**
 * **Los dos destellos de los faros**, a los `segundos` de empezar: apagados,
 * encendidos, apagados, encendidos, apagados, y de vuelta a como iban. Van
 * apagados primero porque abajo vuelan siempre encendidos, por debajo de diez
 * mil pies: sin apagarlos no hay destello que ver. `null`, antes de empezar o
 * ya acabados: mandan las luces de siempre. Ver `lucesDelTrafico`.
 */
export function farosEnElAcuse(segundos: number): boolean | null {
  if (!(segundos >= 0)) return null;
  const golpe = Math.floor(segundos / GOLPE_DE_FAROS);
  return golpe >= GOLPES_DE_FAROS ? null : golpe % 2 === 1;
}

/** Cuántos golpes son: dos encendidos, con un apagado antes, entre medias y después. */
export const GOLPES_DE_FAROS = 5;

/**
 * **Si en este campo hay una torre con lámpara**: ni privado, ni sin
 * servicio, ni AFIS. Es lo mismo que `sinTorre` y `esAfis` de
 * `world/aerodrome.ts`, que no se importa aquí porque arrastra el dibujo; lo
 * comprueba `fallo-de-radio.test.ts` contra los dos en cada escenario.
 */
export function hayLampara(
  aero: { readonly privado?: boolean; readonly sinTorre?: boolean; readonly afis?: boolean } | null | undefined,
): boolean {
  return !!aero && aero.privado !== true && aero.sinTorre !== true && aero.afis !== true;
}
