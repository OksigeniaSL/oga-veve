/**
 * **Los árboles que se tocan**: dónde está cada copa y cada tronco, para
 * saber si el avión se ha metido en uno (H35b).
 *
 * Hasta hoy los árboles eran dibujo y nada más: el avión los atravesaba. Se
 * notaba sobre todo en el despegue de pista corta, donde la lección entera es
 * pasar por encima de los lapachos del final, y pasar por debajo de sus copas
 * se contaba pero no pasaba nada. Ver `flight/percance.ts`, el de `arbol`.
 *
 * **La forma que se toca es la que se dibuja.** Los del monte y los de la
 * vegetación son un octaedro achatado sobre un tronco (`world/vegetation.ts`),
 * y aquí se mira ese mismo octaedro, girado como el dibujo; los de la granja
 * son bolas de piezas (`world/granja.ts`), y se mira la bola principal como un
 * elipsoide. Si la forma que se toca fuera mayor que la que se ve, el avión
 * chocaría contra el aire; si fuera menor, se vería pasar por dentro.
 *
 * **Y no cuesta nada por fotograma**: los árboles van en una rejilla de
 * celdas de treinta y dos metros, cada celda sabe lo alto que llega lo más
 * alto que tiene, y la pregunta de un punto mira nueve celdas —en vuelo, casi
 * siempre ninguna, porque el avión va por encima de todo lo que hay en
 * ellas—. Sin reservar memoria al preguntar. Medido en `arboleda.test.ts`.
 */

/** Cómo es un árbol, a escala uno y con el suelo en cero. */
export interface FormaDeArbol {
  /**
   * La copa: un octaedro (`octaedro`) o un elipsoide de revolución
   * (`elipsoide`), con su radio de lado, su semialto y la altura de su centro.
   */
  readonly copa: {
    readonly tipo: "octaedro" | "elipsoide";
    readonly radio: number;
    readonly semialto: number;
    readonly centro: number;
  };
  /** El tronco: un cilindro desde el suelo. */
  readonly tronco: { readonly radio: number; readonly alto: number };
}

/** Un árbol de la arboleda, en el mundo: su pie y su copa entera. Ver `Arboleda.arbolEn`. */
export interface ArbolDeLaArboleda {
  /** El pie del tronco, m. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** El radio de lado de la copa y su semialto, m. */
  readonly radio: number;
  readonly semialto: number;
  /** La altura del centro de la copa sobre el pie, m. */
  readonly centro: number;
}

/** Lo más que se encoge una copa por la holgura, en parte de su semieje. Ver `toca`. */
const PIEL = 0.4;

/** Lo que se guarda de cada árbol, en números seguidos. */
const CAMPOS = 11;
const CELDA = 32;

export class Arboleda {
  /** x, y, z, cos y sen del giro, radio y semialto de la copa, centro de la copa, radio y alto del tronco, octaedro (1) o no (0). */
  private datos: number[] = [];
  private celdas = new Map<number, number[]>();
  /** Lo más alto de cada celda, m. */
  private techos = new Map<number, number>();

  get cuantos(): number {
    return this.datos.length / CAMPOS;
  }

  vaciar(): void {
    this.datos = [];
    this.celdas.clear();
    this.techos.clear();
  }

  /** Un árbol plantado en `(x, y, z)`, a esa escala y girado `giro` radianes sobre la vertical. */
  plantar(x: number, y: number, z: number, escala: number, giro: number, forma: FormaDeArbol): void {
    const i = this.cuantos;
    const c = forma.copa;
    this.datos.push(
      x,
      y,
      z,
      Math.cos(giro),
      Math.sin(giro),
      c.radio * escala,
      c.semialto * escala,
      c.centro * escala,
      forma.tronco.radio * escala,
      forma.tronco.alto * escala,
      c.tipo === "octaedro" ? 1 : 0,
    );
    const alcance = c.radio * escala;
    const techo = y + (c.centro + c.semialto) * escala;
    for (let cx = Math.floor((x - alcance) / CELDA); cx <= Math.floor((x + alcance) / CELDA); cx++)
      for (let cz = Math.floor((z - alcance) / CELDA); cz <= Math.floor((z + alcance) / CELDA); cz++) {
        const k = clave(cx, cz);
        let lista = this.celdas.get(k);
        if (!lista) this.celdas.set(k, (lista = []));
        lista.push(i);
        this.techos.set(k, Math.max(this.techos.get(k) ?? -Infinity, techo));
      }
  }

  /**
   * **Si el punto está dentro de algún árbol**, con la copa encogida
   * `holgura` metros por cada lado: lo que se puede rozar sin que pase nada.
   * Ver `holguraDeLaCopa` en `flight/percance.ts`. El tronco no encoge: un
   * tronco no se roza.
   */
  toca(px: number, py: number, pz: number, holgura = 0): boolean {
    return this.cual(px, py, pz, holgura) >= 0;
  }

  /**
   * **El árbol que tiene dentro este punto**, entero y sin holgura: dónde
   * está su pie y cómo es su copa. Es para apuntarle a uno desde el banco
   * (`scripts/verificar-arboles.mjs`), que tiene que meter el avión por el
   * centro de la copa: por el borde, la piel que se perdona en Guyrami deja
   * pasar al avión rozando, y eso no es lo que el banco quiere comprobar.
   * Devuelve un objeto nuevo: no es para preguntar en cada fotograma.
   */
  arbolEn(px: number, py: number, pz: number): ArbolDeLaArboleda | null {
    const i = this.cual(px, py, pz, 0);
    if (i < 0) return null;
    const d = this.datos;
    const b = i * CAMPOS;
    return {
      x: d[b]!,
      y: d[b + 1]!,
      z: d[b + 2]!,
      radio: d[b + 5]!,
      semialto: d[b + 6]!,
      centro: d[b + 7]!,
    };
  }

  /** El número del árbol que tiene dentro el punto, o −1. Ver `toca`. */
  private cual(px: number, py: number, pz: number, holgura: number): number {
    const k = clave(Math.floor(px / CELDA), Math.floor(pz / CELDA));
    if (py > (this.techos.get(k) ?? -Infinity)) return -1;
    const lista = this.celdas.get(k);
    if (!lista) return -1;
    const d = this.datos;
    for (let n = 0; n < lista.length; n++) {
      const b = lista[n]! * CAMPOS;
      const dx = px - d[b]!;
      const dy = py - d[b + 1]!;
      const dz = pz - d[b + 2]!;
      // El tronco.
      if (dy >= 0 && dy <= d[b + 9]! && dx * dx + dz * dz <= d[b + 8]! * d[b + 8]!) return lista[n]!;
      /*
       * **La piel, y nunca más de dos quintos de la copa.** Con los dos metros
       * de Tukã enteros, un naranjo o un karanday de la granja, con menos de
       * dos de semialto, se quedaban sin copa que tocar: se volaba a través.
       */
      const r = d[b + 5]! - Math.min(holgura, d[b + 5]! * PIEL);
      const h = d[b + 6]! - Math.min(holgura, d[b + 6]! * PIEL);
      const v = Math.abs(dy - d[b + 7]!) / h;
      if (v > 1) continue;
      if (d[b + 10] === 1) {
        // En los ejes del árbol: el octaedro es |x| + |y| + |z| ≤ 1 escalado.
        const co = d[b + 3]!;
        const se = d[b + 4]!;
        const lx = co * dx - se * dz;
        const lz = se * dx + co * dz;
        if ((Math.abs(lx) + Math.abs(lz)) / r + v <= 1) return lista[n]!;
      } else if ((dx * dx + dz * dz) / (r * r) + v * v <= 1) return lista[n]!;
    }
    return -1;
  }
}

/** Una clave numérica por celda, sin cadenas que reservar. */
function clave(cx: number, cz: number): number {
  return (cx + 0x8000) * 0x10000 + (cz + 0x8000);
}
