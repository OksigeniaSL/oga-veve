/**
 * **El fallo de radio**: el número que lo dice por ti y la lámpara que te
 * contesta (#90, #83).
 *
 * Se va la radio en la subida: ni se oye a la torre ni ella te oye. Lo que se
 * hace es lo del SERA, el Reglamento de Ejecución (UE) 923/2012, que es el que
 * vale en Canarias; las páginas, en el ADR 0014, enmienda H71:
 *
 * - **El 7600 en el transpondedor** (SERA.14083 c) 2) y SERA.13005 a) 2)). Es
 *   el código de «fallo de la radiocomunicación»: en la pantalla de la torre
 *   tu etiqueta cambia, y sin decir nada ya saben lo que te pasa. Es lo que
 *   «lo dice por ti».
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
 *   la base y en la final**; de noche, con dos destellos de los faros.
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
}

/**
 * **La luz que toca**, para quien no tiene radio. Primero la orden de irse,
 * que corta todo lo demás; después el permiso; y si no hay ni lo uno ni lo
 * otro y te cuenta en su circuito con el 7600 ya visto, los destellos:
 * «regresar para aterrizar». Ver la cabecera.
 */
export function luzParaQuienNoTieneRadio(v: LoQueVeLaTorre): LuzSinRadio {
  if (!v.enElAire) return null;
  if (v.teMandaIrte) return "roja";
  if (v.teDejaAterrizar) return "verde";
  if (
    v.teCuenta &&
    !v.enLaBaseOEnLaFinal &&
    v.conElCodigo !== null &&
    v.conElCodigo >= LA_TORRE_LO_VE
  )
    return "destellos";
  return null;
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
