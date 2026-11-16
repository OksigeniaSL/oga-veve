/**
 * De qué está hecho el suelo que hay debajo del avión.
 *
 * Hasta hoy el juego sabía «suelo» y «no suelo», y eso deja fuera media
 * lección: **el avión se pasa la pista y sigue, y sigue. Es un todoterreno y
 * no se estrella nunca.** Un campo de hierba, la tierra del interior y el
 * asfalto de un aeropuerto no se ruedan igual, no suenan igual y no perdonan
 * igual, y con Yvytu Rape —que es de hierba entera— eso dejó de ser teórico.
 *
 * ## Tres, y no más
 *
 * - `asfalto`: la pista, las calles y las plataformas pavimentadas.
 * - `hierba`: lo preparado pero blando — una pista de hierba segada, la
 *   plataforma de tierra de un campo particular. Se rueda, cuesta más y
 *   traquetea.
 * - `campo`: lo de fuera. Ni está segado ni está allanado.
 *
 * Podrían ser diez, y no valdría de nada: lo que cambia el vuelo es rodar por
 * algo firme o por algo blando, y el tercer escalón es «esto no es sitio para
 * un avión».
 *
 * ## Los números son los de verdad
 *
 * El coeficiente de rodadura de un neumático de avión sobre asfalto está en
 * dos centésimas; sobre hierba corta, entre cuatro y seis; sobre tierra y
 * hierba alta, cerca de una décima. De ahí sale que una pista de hierba pida
 * más carrera de despegue que una de asfalto, que es exactamente lo que pasa
 * en la vida real y lo que hace que un piloto mire de qué es la pista antes de
 * ir.
 */

import type { Aerodrome, Pista } from "./aerodrome";
import { ANCHO_RODADURA } from "./ancho-de-rodadura";
import { enEjesDePista } from "./rumbo";
import type { Scenario } from "./scenarios";

export type Superficie = "asfalto" | "hierba" | "campo";

/**
 * Coeficiente de rodadura de cada superficie.
 *
 * Es lo que frena a un avión que rueda sin frenos puestos, y lo que le cuesta
 * acelerar. Ver la cabecera.
 */
export const ROZAMIENTO: Record<Superficie, number> = {
  asfalto: 0.02,
  hierba: 0.05,
  campo: 0.09,
};

/**
 * Cuánto traquetea cada una, como múltiplo del asfalto.
 *
 * La vibración de la carrera ya existe y sube con la velocidad; esto la
 * multiplica. Rodar por un campo tiene que **notarse** antes de que nadie lo
 * explique: es la manera de decir «esto no es una pista» sin una palabra.
 */
export const TRAQUETEO: Record<Superficie, number> = {
  asfalto: 1,
  hierba: 1.8,
  campo: 3,
};

/** ¿Está pavimentada esta superficie, según lo que dice el fichero? */
export function esDura(surface: string | null | undefined): boolean {
  if (!surface) return true;
  const s = surface.toLowerCase();
  return !(
    s.includes("grass") ||
    s.includes("dirt") ||
    s.includes("gravel") ||
    s.includes("earth") ||
    s.includes("sand") ||
    s.includes("ground")
  );
}

/** ¿El punto cae dentro del rectángulo de esta pista? */
function enLaPista(pista: Pista, x: number, z: number): boolean {
  const a = pista.centerline[0];
  const b = pista.centerline[pista.centerline.length - 1];
  if (!a || !b) return false;
  // Del fichero al mundo: la Y del norte es la Z negativa.
  const ax = a[0];
  const az = -a[1];
  const bx = b[0];
  const bz = -b[1];
  const largo = Math.hypot(bx - ax, bz - az);
  if (largo < 1) return false;
  const rumbo = (Math.atan2(bx - ax, -(bz - az)) * 180) / Math.PI;
  const { along, across } = enEjesDePista(
    x,
    z,
    (ax + bx) / 2,
    (az + bz) / 2,
    rumbo,
  );
  return (
    Math.abs(along) <= largo / 2 && Math.abs(across) <= (pista.widthM ?? 45) / 2
  );
}

/**
 * **Si el punto cae en alguna pista del aeródromo**: lo que no cruza un tractor
 * remolcando, ni es sitio donde dejar un avión. Ver `world/vuelta-a-la-raya.ts`.
 */
export function enAlgunaPista(aero: Aerodrome, x: number, z: number): boolean {
  return aero.runways.some((p) => enLaPista(p, x, z));
}

/**
 * De qué está hecho el suelo en un punto del mundo.
 *
 * Las calles y las plataformas salen del aeródromo del escenario, con su borde
 * de verdad: ver `pavimentoDe`. Sin aeródromo —una pista inventada— solo
 * cuentan la pista y el campo.
 */
export function superficieEn(
  escenario: Scenario,
  x: number,
  z: number,
): Superficie {
  return sueloEn(escenario, x, z).superficie;
}

/**
 * Lo mismo que `superficieEn`, y además **lo que dice el fichero que es**:
 * `asphalt`, `concrete`, `grass`… o `null` si no lo dice.
 *
 * La física se conforma con firme o blando; el oído no. Rodar sobre las losas
 * de hormigón de una plataforma suena a juntas —«trocotó, trocotó»— y rodar
 * sobre asfalto, no, aunque las dos cosas sean «asfalto» para el rozamiento.
 * Va en la misma función para que las dos preguntas se contesten con la misma
 * geometría: si cada una mirara la pista a su manera, el avión podría rodar
 * por hierba sonando a hormigón. Ver `world/firme.ts`.
 */
export function sueloEn(
  escenario: Scenario,
  x: number,
  z: number,
): { superficie: Superficie; dicho: string | null } {
  const aero: Aerodrome | undefined = escenario.aerodrome;
  if (!aero) {
    // Una pista inventada es de asfalto, y su rectángulo es el de siempre.
    const r = escenario.runway;
    const { along, across } = enEjesDePista(x, z, r.x, r.z, r.heading);
    return Math.abs(along) <= r.length / 2 && Math.abs(across) <= r.width / 2
      ? { superficie: "asfalto", dicho: null }
      : { superficie: "campo", dicho: null };
  }

  for (const pista of aero.runways) {
    if (!enLaPista(pista, x, z)) continue;
    return {
      superficie: esDura(pista.surface) ? "asfalto" : "hierba",
      dicho: pista.surface ?? null,
    };
  }

  if (pavimentoDe(aero).cubre(x, z)) {
    /*
     * Las calles y las plataformas van todas juntas: el fichero no dice de
     * qué son las calles, y se pintan con las plataformas como un solo
     * dibujo. Así que manda lo que diga la primera plataforma del fichero y, si no lo dice
     * —OpenStreetMap muchas veces no lo dice—, lo que diga la pista: un campo
     * de hierba lo es entero, y uno de asfalto también.
     */
    const dicho = aero.aprons[0]?.surface ?? aero.runways[0]?.surface ?? null;
    return { superficie: esDura(dicho) ? "asfalto" : "hierba", dicho };
  }

  return { superficie: "campo", dicho: null };
}

/**
 * **Las calles y las plataformas, con su borde de verdad**, para saber qué
 * pisan las ruedas.
 *
 * Esto le preguntaba al mapa de la vegetación —`mapaDePavimento`—, y ese mapa
 * no es el pavimento: es **donde no se plantan árboles**, con treinta metros a
 * cada lado del eje de cada calle y quince alrededor de cada plataforma,
 * porque las alas sobresalen mucho del tren. Para los árboles está bien; para
 * las ruedas, no. Rodando por la hierba junto a una calle, el avión frenaba y
 * sonaba como en el asfalto en toda esa franja, y lo que enseña la hierba
 * —que cuesta más, que traquetea y que ahí no se rueda— no se notaba justo
 * donde uno se sale. Se vio con la vuelta a la raya con el tractor, que para
 * saber si el avión estaba en la hierba tuvo que medir con `enElPavimento`
 * mientras el rozamiento lo daba por asfalto. Ver #193.
 *
 * La geometría es la de `enElPavimento` sin margen —el eje de cada calle con
 * su media anchura y el polígono de cada plataforma—, que es también la que
 * se dibuja: lo que se ve como asfalto es lo que se rueda como asfalto.
 *
 * **Y con una rejilla delante, porque se pregunta en cada fotograma.** Mirar
 * todas las calles cada vez son, en Barajas, tres mil cuatrocientos tramos por
 * fotograma. La rejilla apunta en cada celda los tramos y las plataformas que
 * la tocan, y la pregunta mide solo esos: el mismo número que
 * `enElPavimento`, con un puñado de cuentas. Ver `superficie.test.ts`.
 */
export class PavimentoDeVerdad {
  /**
   * Lado de la celda, m. Grande, para que apuntar una calle cueste poco; y no
   * tanto que una celda de una plataforma llena de calles lleve docenas.
   */
  static readonly CELDA = 32;

  private constructor(
    /** Los tramos de calle, de cinco en cinco: ax, az, bx, bz y su media anchura al cuadrado. */
    private readonly tramos: Float64Array,
    /** Las plataformas, en coordenadas del mundo. */
    private readonly plataformas: readonly (readonly (readonly [number, number])[])[],
    private readonly minX: number,
    private readonly minZ: number,
    private readonly columnas: number,
    private readonly filas: number,
    /**
     * Lo que toca cada celda: índices de tramo y, a partir del número de
     * tramos, de plataforma.
     */
    private readonly celdas: readonly (Int32Array | undefined)[],
  ) {}

  static de(aero: Aerodrome): PavimentoDeVerdad {
    const tramos: number[] = [];
    // Del fichero al mundo: la Y del norte es la Z negativa.
    for (const calle of aero.taxiways) {
      const media = (calle.widthM ?? ANCHO_RODADURA) / 2;
      for (let i = 0; i < calle.path.length - 1; i++) {
        const a = calle.path[i]!;
        const b = calle.path[i + 1]!;
        tramos.push(a[0], -a[1], b[0], -b[1], media * media);
      }
    }
    const plataformas = aero.aprons
      .map((p) => p.polygon.map((q) => [q[0], -q[1]] as const))
      .filter((p) => p.length >= 3);

    // La caja de cada cosa, con su media anchura: es lo que se apunta en las celdas.
    const n = tramos.length / 5;
    const cajas: [number, number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const k = i * 5;
      const media = Math.sqrt(tramos[k + 4]!);
      cajas.push([
        Math.min(tramos[k]!, tramos[k + 2]!) - media,
        Math.min(tramos[k + 1]!, tramos[k + 3]!) - media,
        Math.max(tramos[k]!, tramos[k + 2]!) + media,
        Math.max(tramos[k + 1]!, tramos[k + 3]!) + media,
      ]);
    }
    for (const poli of plataformas) {
      const xs = poli.map((q) => q[0]);
      const zs = poli.map((q) => q[1]);
      cajas.push([Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]);
    }
    if (!cajas.length) return new PavimentoDeVerdad(new Float64Array(0), [], 0, 0, 0, 0, []);

    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (const [x0, z0, x1, z1] of cajas) {
      minX = Math.min(minX, x0);
      minZ = Math.min(minZ, z0);
      maxX = Math.max(maxX, x1);
      maxZ = Math.max(maxZ, z1);
    }
    const C = PavimentoDeVerdad.CELDA;
    const columnas = Math.max(1, Math.ceil((maxX - minX) / C));
    const filas = Math.max(1, Math.ceil((maxZ - minZ) / C));
    const listas: number[][] = [];
    cajas.forEach(([x0, z0, x1, z1], id) => {
      const c0 = Math.max(0, Math.floor((x0 - minX) / C));
      const c1 = Math.min(columnas - 1, Math.floor((x1 - minX) / C));
      const f0 = Math.max(0, Math.floor((z0 - minZ) / C));
      const f1 = Math.min(filas - 1, Math.floor((z1 - minZ) / C));
      for (let f = f0; f <= f1; f++)
        for (let c = c0; c <= c1; c++) (listas[f * columnas + c] ??= []).push(id);
    });
    const celdas: (Int32Array | undefined)[] = [];
    for (let i = 0; i < columnas * filas; i++) {
      const l = listas[i];
      celdas.push(l ? Int32Array.from(l) : undefined);
    }
    return new PavimentoDeVerdad(
      new Float64Array(tramos),
      plataformas,
      minX,
      minZ,
      columnas,
      filas,
      celdas,
    );
  }

  /** ¿Hay calle o plataforma bajo este punto del mundo? Sin margen: el borde dibujado. */
  cubre(x: number, z: number): boolean {
    const C = PavimentoDeVerdad.CELDA;
    const c = Math.floor((x - this.minX) / C);
    const f = Math.floor((z - this.minZ) / C);
    if (c < 0 || f < 0 || c >= this.columnas || f >= this.filas) return false;
    const ids = this.celdas[f * this.columnas + c];
    if (!ids) return false;
    const t5 = this.tramos;
    const n = t5.length / 5;
    for (const id of ids) {
      if (id >= n) {
        if (dentroDelPoligono(this.plataformas[id - n]!, x, z)) return true;
        continue;
      }
      const k = id * 5;
      const ax = t5[k]!;
      const az = t5[k + 1]!;
      const dx = t5[k + 2]! - ax;
      const dz = t5[k + 3]! - az;
      // La cuenta de `aLaPolilinea`: lo más cerca del tramo, sin salirse de él.
      const l = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l));
      const ex = x - (ax + t * dx);
      const ez = z - (az + t * dz);
      if (ex * ex + ez * ez < t5[k + 4]!) return true;
    }
    return false;
  }
}

/** Punto dentro de un polígono, por el número de cruces: la cuenta de `dentroDelRecinto`. */
function dentroDelPoligono(
  poli: readonly (readonly [number, number])[],
  x: number,
  z: number,
): boolean {
  let dentro = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, zi] = poli[i]!;
    const [xj, zj] = poli[j]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

/**
 * El pavimento de un aeródromo, hecho la primera vez que se pregunta y
 * guardado contra ese objeto: el aeródromo no cambia una vez cargado, y el de
 * un vecino corrido a este mundo es otro objeto con el suyo. Débil, para que
 * un aeródromo que se deja se vaya con su índice, como `mapaDePavimento` con
 * el de los árboles.
 */
export function pavimentoDe(aero: Aerodrome): PavimentoDeVerdad {
  let hecho = HECHOS.get(aero);
  if (!hecho) {
    hecho = PavimentoDeVerdad.de(aero);
    HECHOS.set(aero, hecho);
  }
  return hecho;
}

const HECHOS = new WeakMap<Aerodrome, PavimentoDeVerdad>();
