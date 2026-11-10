/**
 * **El capítulo del viaje largo que se pide al recargar**, de una vez y por la pestaña.
 *
 * Al acabar el primer capítulo, su tarjeta lleva al segundo, y entrar en un capítulo es
 * recargar la página en su mundo. La dirección no sirve para decirlo fuera de
 * desarrollo —`?capitulo=` es de los bancos, y un enlace no puede abrir un capítulo que
 * no se ha jugado—, así que se deja el recado en la pestaña, como el cambio de avión
 * (`cambio-de-avion.ts`), y `main.ts` lo lee una vez al arrancar y lo borra.
 *
 * Es también por donde va el viaje seguido, los tres enganchados: ver el ADR 0023.
 *
 * ## Y el día del vuelo, con él
 *
 * El recado lleva **qué vuelo se está volando**: el día de su horario, el que da
 * `horarioDelDia`. Sin eso, el capítulo que sigue elegía el día otra vez, con la hora de
 * la recarga, y caía en otro vuelo cada vez que entre los dos pasaba la medianoche UTC
 * —las 21:00 en Asunción, la una o las dos de la madrugada en Madrid—: otro cielo y, el
 * día del cambio de hora, otra temporada, con la comandante anunciando una hora de
 * llegada en el primero y otra al llegar. Un viaje es un vuelo, y el día es del vuelo,
 * no de cada página. Quien lo usa es `Game.fechaDelVuelo`.
 */

/** La clave de la pestaña. */
const CLAVE = "oga-capitulo-pedido";

/**
 * Los capítulos que se pueden pedir así. El tercero también: es el que abre `?inicio=4`
 * sin más, pero sin recado se abriría con el día de la recarga, y no con el del vuelo.
 */
export type CapituloPedido = 1 | 2 | 3;

/** Lo que dice el recado: el capítulo y, si se sabe, el día del vuelo al que pertenece. */
export interface Recado {
  readonly capitulo: CapituloPedido;
  /** `AAAA-MM-DD`, el día del horario del vuelo que se está volando. Ver la cabecera. */
  readonly dia: string | null;
}

const UN_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** El día del horario de un vuelo, en la forma del recado: la fecha UTC de su salida. */
export function diaDelHorario(salida: Date): string {
  return salida.toISOString().slice(0, 10);
}

/** El día del recado, como lo lee `horarioDelDia`: a las doce en UTC, igual que `?fecha=`. */
export function fechaDelDia(dia: string | null): Date | null {
  if (!dia || !UN_DIA.test(dia)) return null;
  const f = new Date(`${dia}T12:00:00Z`);
  return Number.isFinite(f.getTime()) ? f : null;
}

/** Deja el recado. Devuelve si se pudo, que sin almacenamiento no se puede. */
export function pedirElCapitulo(
  almacen: Pick<Storage, "setItem"> | null,
  capitulo: CapituloPedido,
  dia: string | null = null,
): boolean {
  try {
    almacen?.setItem(CLAVE, JSON.stringify({ capitulo, dia: dia && UN_DIA.test(dia) ? dia : null }));
    return !!almacen;
  } catch {
    return false;
  }
}

const esCapitulo = (v: unknown): v is CapituloPedido => v === 1 || v === 2 || v === 3;

/** Lee el recado, si lo hay, y lo borra: vale para una carga y nada más. */
export function leerElCapituloPedido(almacen: Pick<Storage, "getItem" | "removeItem"> | null): Recado | null {
  try {
    const crudo = almacen?.getItem(CLAVE) ?? null;
    if (crudo === null) return null;
    almacen?.removeItem(CLAVE);
    // El de antes de llevar el día era el número a secas: una pestaña puede tenerlo aún.
    if (crudo === "1" || crudo === "2") return { capitulo: crudo === "1" ? 1 : 2, dia: null };
    const d = JSON.parse(crudo) as { capitulo?: unknown; dia?: unknown } | null;
    if (!d || !esCapitulo(d.capitulo)) return null;
    return { capitulo: d.capitulo, dia: typeof d.dia === "string" && UN_DIA.test(d.dia) ? d.dia : null };
  } catch {
    return null;
  }
}
