/**
 * **Un bucle que se sortea a cada vuelta, y no a cada fotograma.**
 *
 * Las juntas y los baches de la rodadura son un chasquido en un búfer de
 * silencio que suena en bucle: el largo del bucle es cuándo cae el siguiente
 * golpe. Un `AudioBufferSourceNode` salta al principio en cuanto la cabeza
 * pasa de `loopEnd`, y también si se le pone un `loopEnd` por detrás de donde
 * va. Así que, sorteando el largo en cada fotograma, la vuelta no cae en el
 * largo sorteado sino en **el primer sorteo que queda por detrás de la
 * cabeza**: medido en Chrome (26-11-2026), los baches de las losas gastadas a
 * 13 m/s, pedidos cada 1,13 s de media y repartidos entre 0,40 y 1,86,
 * sonaban cada 0,57 s, el ochenta por ciento entre 0,44 y 0,75: el doble de
 * a menudo, y casi a compás, que es lo que los baches no tienen.
 *
 * Aquí se lleva la cuenta de por dónde va la cabeza con el reloj del contexto,
 * que es el mismo que la mueve, y se sortea el largo siguiente **al dar la
 * vuelta**. Y también en el acto si el largo puesto ya no es de la velocidad
 * de ahora, que acelerando en la carrera no se espera una vuelta entera de las
 * de rodar despacio.
 */
export class CabezaDelBucle {
  private desde: number;
  private pos: number;
  private fin: number;

  /** `ahora`, el reloj del contexto al arrancar la fuente; `pos`, desde dónde suena; `fin`, su `loopEnd`. */
  constructor(ahora: number, pos: number, fin: number) {
    this.desde = ahora;
    this.pos = pos;
    this.fin = fin;
  }

  /** El largo del bucle que lleva puesto, s. */
  get largo(): number {
    return this.fin;
  }

  /** Lleva la cabeza hasta `ahora`. Dice si ha dado alguna vuelta desde la última vez. */
  avanzar(ahora: number): boolean {
    let p = this.pos + Math.max(0, ahora - this.desde);
    this.desde = ahora;
    let vuelta = false;
    if (this.fin > 0)
      while (p >= this.fin) {
        p -= this.fin;
        vuelta = true;
      }
    this.pos = p;
    return vuelta;
  }

  /** Lo que se le pone a la fuente. Si queda por detrás de la cabeza, la fuente salta al principio ya. */
  poner(fin: number): void {
    this.fin = fin;
    if (this.pos >= fin) this.pos = 0;
  }
}

/**
 * El largo nuevo del bucle, o `null` si el que tiene sirve: se sortea al dar
 * la vuelta, o si el que lleva se ha salido de `[abajo, arriba]`, que es lo
 * que se puede sortear a la velocidad de ahora. Deja la cabeza al día.
 */
export function sortearBucle(
  cabeza: CabezaDelBucle,
  ahora: number,
  abajo: number,
  arriba: number,
  sorteo: () => number,
): number | null {
  const vuelta = cabeza.avanzar(ahora);
  const holgura = 1e-6;
  if (!vuelta && cabeza.largo >= abajo - holgura && cabeza.largo <= arriba + holgura) return null;
  const fin = sorteo();
  cabeza.poner(fin);
  return fin;
}
