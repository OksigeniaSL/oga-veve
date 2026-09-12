/**
 * Los hechos del vuelo, y quién se entera de cada uno.
 *
 * ## Por qué existe
 *
 * En este juego casi nada pasa en un solo sitio. Cuando alguien renuncia a un
 * aterrizaje y se va al aire pasan **cuatro cosas**: sale su dibujo en la
 * pantalla, suena el sonido de haber ganado algo, se apunta en el cuaderno y
 * el instructor lo dice. Las cuatro estaban escritas seguidas, a mano, dentro
 * del método que decide que ha habido frustrada — así que ese método tiene que
 * saber de pantalla, de sonido, de cuaderno y de voz para hacer una sola cosa:
 * darse cuenta.
 *
 * Con dos o tres hechos eso se lleva. Con misiones que miran las tomas, con
 * logros que miran todo y con celebraciones, cada hecho nuevo obliga a tocar
 * el bucle y `Game` deja de ser un ensamblador para ser un dios. Es lo que
 * avisa #30, y lo que efectivamente pasó: de 318 líneas a casi seis mil.
 *
 * Aquí quien decide **cuenta lo que ha pasado** y se acabó su trabajo. Quien
 * tenga algo que hacer con eso se apunta por su cuenta.
 *
 * ## La regla dura
 *
 * **Un hecho es algo que ya ha pasado, nunca una orden.** «Se frustró el
 * aterrizaje» es un hecho; «celebra la frustrada» es una orden disfrazada, y
 * eso es exactamente lo que convierte un bus en un enredo: en cuanto un hecho
 * manda, el orden en que se apuntaron los oyentes empieza a importar, y
 * entonces hay que leerlos todos para entender uno.
 *
 * Por eso los nombres van en pasado y sin verbo de mando, y por eso el bucle
 * del juego **sigue siendo llamadas directas**: esto es para lo transversal,
 * no para lo que tiene que ocurrir en un orden.
 *
 * ## Lo que no es
 *
 * No hay prioridades, ni cancelación, ni hechos que devuelvan nada, ni cola
 * diferida: un `emit` llama a los suyos y vuelve. Todo eso hace falta el día
 * que haga falta, y hoy no: hay un avión y un terreno quieto.
 */

/**
 * Lo que puede pasar, y lo que se cuenta de cada cosa.
 *
 * Se añaden de uno en uno y con lo justo: un hecho con datos que nadie mira
 * es una promesa de mantenerlos al día para nada.
 */
export interface Hechos {
  /**
   * Se ha renunciado a un aterrizaje y el avión se ha ido al aire.
   *
   * `mandada` dice si lo pidió la torre o fue decisión de quien vuela. Las dos
   * se celebran igual —renunciar es ganar— pero el cuaderno y las misiones
   * pueden querer distinguirlas, y el dato ya está ahí cuando ocurre.
   */
  frustrada: { readonly mandada: boolean };
}

/** Quien escucha un hecho. No devuelve nada: enterarse no contesta. */
type Oyente<T> = (datos: T) => void;

/**
 * El reparto de hechos.
 *
 * Tipado por la tabla de arriba, así que `emit("frustrda", …)` no compila y
 * `on("frustrada", (d) => d.mandada)` sabe que `mandada` es un booleano sin
 * que nadie lo escriba dos veces.
 */
export class Reparto {
  private readonly oyentes = new Map<keyof Hechos, Oyente<never>[]>();

  /** Apuntarse a un hecho. Devuelve cómo darse de baja. */
  on<K extends keyof Hechos>(que: K, oyente: Oyente<Hechos[K]>): () => void {
    const lista = this.oyentes.get(que) ?? [];
    lista.push(oyente as Oyente<never>);
    this.oyentes.set(que, lista);
    return () => {
      const i = lista.indexOf(oyente as Oyente<never>);
      if (i >= 0) lista.splice(i, 1);
    };
  }

  /**
   * Contar que ha pasado algo.
   *
   * Se recorre **una copia** de la lista: un oyente que se da de baja a sí
   * mismo al enterarse —que es lo normal en una celebración que pasa una vez—
   * se saltaría al siguiente si se recorriera la lista viva. Es el mismo
   * cuidado que ya se tomó en `flight/agenda.ts` y por la misma razón.
   */
  emit<K extends keyof Hechos>(que: K, datos: Hechos[K]): void {
    const lista = this.oyentes.get(que);
    if (!lista?.length) return;
    for (const oyente of [...lista]) (oyente as Oyente<Hechos[K]>)(datos);
  }

  /** Cuántos escuchan un hecho. Para poder comprobarlo desde fuera. */
  cuantosEscuchan(que: keyof Hechos): number {
    return this.oyentes.get(que)?.length ?? 0;
  }
}
