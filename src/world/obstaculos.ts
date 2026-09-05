/**
 * Contra qué se choca, además del suelo.
 *
 * «Aterricé sobre la facultad de Biología, atravesé la de Farmacia, crucé San
 * Francisco de Paula.» Hasta hoy **lo único que paraba el avión era el
 * suelo**: la ciudad entera se atravesaba como si no estuviera.
 *
 * Y el coste va más allá de lo raro que se ve. Este juego enseña **por qué
 * existen las reglas** —la senda de aproximación, la altura mínima, el
 * circuito— y todas esas reglas existen porque hay cosas contra las que
 * chocar. Un mundo sin obstáculos convierte cada lección de seguridad en una
 * manía del profesor.
 *
 * ## Cajas, no geometría
 *
 * Lo que se guarda de cada edificio es su **volumen**, no su forma: un
 * paralelepípedo recto con su base y su cima. Es a propósito. Un simulador que
 * castiga rozar una farola enseña a tener miedo, no a volar, así que la
 * colisión tiene que ser generosa: contra el bulto del edificio, y con margen.
 *
 * Las casas de la ciudad van giradas —cuatro orientaciones y un pelo de
 * desvío—, y aquí se guarda la caja recta que las envuelve. La diferencia con
 * la caja girada es de centímetros para un giro de un octavo de radián, y a
 * cambio la consulta es una comparación de cuatro números.
 *
 * ## Y por qué hay una rejilla
 *
 * Porque son cuarenta mil. Preguntar «¿choco con algo?» recorriendo cuarenta
 * mil cajas sesenta veces por segundo es dos millones y medio de
 * comparaciones por segundo para contestar «no» casi siempre. Con la rejilla
 * se miran las de la celda de debajo, que son un puñado.
 *
 * Medido con cuarenta mil casas repartidas por doce kilómetros: **veinte
 * milisegundos** montar el índice, una sola vez al cargar el escenario, y
 * **diecisiete microsegundos** la consulta de un fotograma —y eso en el caso
 * malo, con la ciudad tan tupida que ocho de cada diez consultas dan choque—.
 * Sobre un fotograma de dieciséis milisegundos es la milésima parte.
 *
 * Esto no dibuja, no suena y no decide nada: dice si en un punto hay bulto.
 * Qué pasa entonces —que el mundo te lo impida o que el avión se rompa— es
 * cosa de quien pregunta, porque la respuesta cambia con el peldaño.
 */

/** Lado de la celda de la rejilla, m. */
const CELDA = 64;

/**
 * Cuánto se encoge cada caja al guardarla, m.
 *
 * Metro y medio por cada lado. Es el margen que pide el issue: se choca contra
 * el bulto del edificio, no contra su esquina. Rozar el canto de una azotea no
 * puede ser lo mismo que meterse en el edificio.
 */
const MARGEN = 1.5;

/**
 * Cada cuántos metros se mira el camino entre un fotograma y el siguiente, m.
 *
 * **Porque si no, se atraviesan las casas estrechas.** A sesenta metros por
 * segundo y sesenta fotogramas, el avión avanza un metro por paso y no hay
 * problema; con la pestaña de fondo o un aparato lento, el paso puede ser de
 * una décima de segundo y entonces el salto son seis metros — más que el
 * fondo de una casa. Se cruzaría entera sin que ningún punto cayera dentro.
 */
const PASO_DEL_CAMINO = 3;

/** Una caja recta, en coordenadas del mundo. */
interface Caja {
  readonly x: number;
  readonly z: number;
  readonly semiX: number;
  readonly semiZ: number;
  /** Cota del suelo bajo el edificio, m. */
  readonly base: number;
  /** Y la de su tejado. */
  readonly cima: number;
}

/** El índice de bultos del escenario. */
export class Obstaculos {
  private readonly celdas = new Map<number, Caja[]>();
  private cuenta = 0;

  /** Cuántos bultos hay. Para poder comprobar que se han cargado. */
  get cuantos(): number {
    return this.cuenta;
  }

  /**
   * Mete un edificio.
   *
   * @param semiX medio ancho en X **de la caja recta que lo envuelve**
   * @param base cota del suelo bajo él
   * @param cima cota de su tejado
   */
  anadir(
    x: number,
    z: number,
    semiX: number,
    semiZ: number,
    base: number,
    cima: number,
  ): void {
    const caja: Caja = {
      x,
      z,
      // El margen se come la caja; una casucha más estrecha que el margen
      // simplemente no estorba, que es exactamente lo que se quiere.
      semiX: semiX - MARGEN,
      semiZ: semiZ - MARGEN,
      base,
      cima,
    };
    if (caja.semiX <= 0 || caja.semiZ <= 0) return;
    this.cuenta++;
    // En todas las celdas que toca: una nave industrial mide más que una celda.
    const i0 = Math.floor((x - semiX) / CELDA);
    const i1 = Math.floor((x + semiX) / CELDA);
    const j0 = Math.floor((z - semiZ) / CELDA);
    const j1 = Math.floor((z + semiZ) / CELDA);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const clave = i * 100003 + j;
        const lista = this.celdas.get(clave);
        if (lista) lista.push(caja);
        else this.celdas.set(clave, [caja]);
      }
    }
  }

  /** Si ese punto está dentro de algún edificio. */
  choca(x: number, y: number, z: number): boolean {
    const lista = this.celdas.get(
      Math.floor(x / CELDA) * 100003 + Math.floor(z / CELDA),
    );
    if (!lista) return false;
    for (const c of lista) {
      if (y < c.base || y > c.cima) continue;
      if (Math.abs(x - c.x) > c.semiX) continue;
      if (Math.abs(z - c.z) > c.semiZ) continue;
      return true;
    }
    return false;
  }

  /**
   * Y si el camino de un punto a otro atraviesa alguno.
   *
   * Es lo que hay que preguntar de verdad: entre un fotograma y el siguiente
   * el avión no se teletransporta, recorre un tramo. Ver `PASO_DEL_CAMINO`.
   */
  chocaEnElCamino(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
  ): boolean {
    const largo = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const pasos = Math.max(1, Math.ceil(largo / PASO_DEL_CAMINO));
    for (let k = 1; k <= pasos; k++) {
      const t = k / pasos;
      if (
        this.choca(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t)
      )
        return true;
    }
    return false;
  }
}
