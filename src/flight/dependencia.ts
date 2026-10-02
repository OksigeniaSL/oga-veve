/**
 * **Con quién se habla por la radio ahora**: la dependencia del control en
 * cuya frecuencia se está.
 *
 * A veinticuatro mil pies, camino de otra isla, se oía «Buenos días, Zulu Papa
 * Kilo Bravo Whiskey, rodando a la cabecera»: el tráfico del aeropuerto de
 * salida seguía hablando en la cabina como si se estuviera en su plataforma.
 * No hay radio que haga eso. Un vuelo de verdad va pasando de una frecuencia a
 * otra, y al cambiar la de antes **deja de oírse**:
 *
 *     tierra → torre → salida → control → aproximación → torre → tierra
 *
 * - **Tierra** mientras se rueda por la plataforma y las calles.
 * - **Torre** desde el punto de espera hasta que se deja la zona del
 *   aeródromo subiendo, y otra vez al entrar en ella bajando: es la que da la
 *   pista, y la del circuito.
 * - **Salida**, ya fuera de la zona y cerca todavía del campo de salida.
 * - **Control**, en ruta.
 * - **Aproximación**, otra vez cerca, ya del campo al que se va.
 *
 * Este juego junta tierra y torre en una sola frecuencia —la del campo, con
 * su torre y sus aviones—, que es como funciona de verdad en los aeródromos
 * pequeños, y la simplificación es de presentación: lo que se oye en las dos
 * es lo mismo, el tráfico del campo. Lo que no hace es seguir oyéndola fuera
 * de la zona. Salida, control y aproximación no tienen todavía voces propias
 * —el relevo de frecuencia se graba cuando haya saldo, ver
 * `PENDIENTE-VOCES-radar.md`—, así que fuera de la zona del campo, por ahora,
 * la radio de los demás calla.
 *
 * ## Dónde acaba la zona de la torre
 *
 * La de una zona de control de aeródromo pequeña, que es lo que vuela este
 * juego: **diez millas y cuatro mil pies** sobre el campo. Cabe el circuito
 * más grande de la flota —el del reactor, el triple del de la avioneta— y la
 * final entera de una llegada, que empieza a seis. Para salir hay que pasar
 * de once millas o de cuatro mil quinientos pies: así, quien vuela justo por
 * el borde no salta de frecuencia sesenta veces por segundo. Lo que lo cambia
 * es moverse de verdad, no un número que tiembla.
 *
 * Sin three.js ni DOM: se comprueba sin volar.
 */

/** Las dependencias del control, en el orden en que se recorren. */
export type Dependencia =
  | "tierra"
  | "torre"
  | "salida"
  | "control"
  | "aproximacion";

/** La zona de la torre: hasta dónde, en millas, y hasta qué altura, en pies. */
export const ZONA_DE_LA_TORRE = { millas: 10, pies: 4000 } as const;

/** Y lo que hay que pasar para dejarla. Ver la cabecera. */
export const SALIR_DE_LA_ZONA = { millas: 11, pies: 4500 } as const;

/** Hasta dónde se habla con salida o con aproximación, millas. */
export const CERCA_DEL_CAMPO = 30;

/**
 * Las fases en tierra que son de la torre: del punto de espera a dejar la
 * pista. El resto de las de tierra son de rodar.
 */
const DE_LA_TORRE_EN_TIERRA: ReadonlySet<string> = new Set([
  "esperando",
  "autorizado",
  "back-taxi",
  "alineando",
  "despegando",
  "comprometido",
  "aterrizado",
  "percance",
]);

/** Dónde está quien escucha, respecto al campo cuya frecuencia se oye. */
export interface DondeEscucha {
  readonly fase: string;
  readonly enTierra: boolean;
  /** Millas al campo montado: el de ahora. */
  readonly millas: number;
  /** Pies sobre su pista. */
  readonly pies: number;
  /** Si ese campo es del que se salió en este tramo. */
  readonly esElDeSalida: boolean;
}

/** La dependencia con la que se habla ahora. `antes`, la de hace un momento. */
export function dependenciaDe(
  d: DondeEscucha,
  antes: Dependencia | null = null,
): Dependencia {
  if (d.enTierra) return DE_LA_TORRE_EN_TIERRA.has(d.fase) ? "torre" : "tierra";
  const estaba = antes === "torre" || antes === "tierra";
  const borde = estaba ? SALIR_DE_LA_ZONA : ZONA_DE_LA_TORRE;
  if (d.millas <= borde.millas && d.pies <= borde.pies) return "torre";
  if (d.millas <= CERCA_DEL_CAMPO)
    return d.esElDeSalida ? "salida" : "aproximacion";
  return "control";
}

/** Si en esa dependencia se oye la frecuencia del campo: su tráfico y su torre. */
export function seOyeElCampo(d: Dependencia): boolean {
  return d === "tierra" || d === "torre";
}
