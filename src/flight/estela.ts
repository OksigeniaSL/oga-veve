/**
 * La estela: **la turbulencia que dejamos los aviones.**
 *
 * No es del aire, es del avión de delante. Un ala que sostiene un avión empuja
 * aire hacia abajo, y en las puntas ese aire se enrolla en dos torbellinos que
 * giran en sentidos contrarios, **bajan despacio y duran minutos**. Es por lo
 * que hay separación entre aviones, y por lo que la separación es mayor detrás
 * de uno grande: el torbellino crece con el peso y se hace más fuerte cuanto
 * más despacio va quien lo deja —o sea despegando y aterrizando—. Ver #82.
 *
 * Lo que se enseña con esto es real y se puede hacer: **la estela se evita
 * pasando por encima de la trayectoria del grande**, porque baja y no sube. Es
 * la regla de siempre para despegar o aterrizar detrás de un pesado.
 *
 * ## La cuenta
 *
 * La de todos los libros de estelas (Gerz, Holzäpfel y Darracq, *Commercial
 * aircraft wake vortices*, Progress in Aerospace Sciences 38, 2002):
 *
 * - Circulación inicial `Γ0 = m·g / (ρ·V·b0)`, con `b0 = π/4·b` la separación
 *   entre los dos torbellinos de un ala de carga elíptica.
 * - Bajan a `w0 = Γ0 / (2π·b0)`, el uno arrastrando al otro. Un reactor de
 *   pasillo único en aproximación, a metro y medio largo por segundo: los
 *   trescientos pies por minuto de los manuales.
 * - Y se apagan: enteros hasta dos veces su tiempo propio `t0 = b0/w0` y a
 *   cero a las seis, que es el orden de lo que se mide con aire tranquilo —un
 *   par de minutos detrás de un avión de línea—.
 * - Se los lleva el viento, y a ras de suelo dejan de bajar.
 *
 * Cada torbellino es de Lamb-Oseen, con el núcleo en un cinco por ciento de la
 * envergadura: fuera de él la velocidad cae con la distancia, y dentro, a cero
 * en el centro.
 */

import { GRAVITY } from "./atmosphere";

/** Densidad para la circulación, kg/m³. A la altura a la que importa, la de abajo. */
const RHO = 1.225;

/** Cada cuánto se apunta por dónde va quien deja estela, s. */
const APUNTA_CADA = 1;

/** Y cuánto se guarda: más allá la estela ya no existe. */
const DURA_COMO_MUCHO = 180;

/** El núcleo de cada torbellino, como fracción de la envergadura. */
const NUCLEO = 0.05;

/**
 * **El peso y el ala de cada clase de avión que vuela por ahí**, para su
 * estela. Por el tipo del tráfico del circuito y por la silueta del de la ruta.
 *
 * De las fichas públicas de un avión de cada clase, con el peso de ir
 * aterrizando o despegando, que es cuando la estela importa: un 172, un Baron,
 * un ATR 72, un A320, un reactor privado mediano y un 747.
 */
export const DE_CLASE: Readonly<
  Record<string, { readonly masa: number; readonly envergadura: number }>
> = {
  avioneta: { masa: 1100, envergadura: 11 },
  "ala-alta": { masa: 1100, envergadura: 11 },
  biplano: { masa: 1500, envergadura: 12.5 },
  bimotor: { masa: 2500, envergadura: 11.5 },
  turbohelice: { masa: 21000, envergadura: 27 },
  // En la ruta, la silueta de ala baja y dos motores es el turbohélice regional.
  "bimotor-ala-baja": { masa: 21000, envergadura: 27 },
  "cola-en-t": { masa: 12000, envergadura: 16 },
  reactor: { masa: 64000, envergadura: 34 },
  cuatrimotor: { masa: 285000, envergadura: 60 },
};

/** Quien deja estela: un avión con su peso y su ala. */
export interface QuienVuela {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Masa, kg. */
  readonly masa: number;
  /** Envergadura, m. */
  readonly envergadura: number;
  /** Altura sobre el suelo, m. En el suelo no hay sustentación ni estela. */
  readonly sobreElSuelo: number;
}

/** Un trozo de estela: dónde se hizo, cuándo, con qué fuerza y hacia dónde. */
interface Trozo {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly t: number;
  /** Circulación inicial, m²/s. */
  readonly gamma: number;
  /** Separación entre los dos torbellinos, m. */
  readonly b0: number;
  /** Hacia dónde iba, vector unitario en horizontal. */
  readonly haciaX: number;
  readonly haciaZ: number;
  /** El suelo debajo, m sobre el mar: ahí dejan de bajar. */
  readonly suelo: number;
}

/**
 * Cuánta circulación queda a esta edad, como fracción de la inicial, y cuánto
 * ha bajado ya el par, m.
 */
export function edadDeLaEstela(
  gamma0: number,
  b0: number,
  edad: number,
): { queda: number; bajado: number } {
  const w0 = gamma0 / (2 * Math.PI * b0);
  const t0 = b0 / Math.max(1e-3, w0);
  const a = 2 * t0;
  const fin = 6 * t0;
  if (edad <= a) return { queda: 1, bajado: w0 * Math.max(0, edad) };
  if (edad >= fin) return { queda: 0, bajado: w0 * (a + (fin - a) / 2) };
  const f = (edad - a) / (fin - a);
  // La bajada es la integral de la velocidad, que cae con la circulación.
  return { queda: 1 - f, bajado: w0 * (a + (edad - a) * (1 - f / 2)) };
}

/** Lo que llega de la estela al avión: bache vertical, m/s, y alabeo, rad/s. */
export interface EnLaEstela {
  /** Hacia arriba, m/s. */
  readonly vertical: number;
  /**
   * La ráfaga de alabeo, con el convenio de `rachaEn`: la variación a lo ancho
   * de la ráfaga vertical **hacia abajo**, rad/s.
   */
  readonly alabeo: number;
}

const NADA: EnLaEstela = { vertical: 0, alabeo: 0 };

export class Estelas {
  private readonly trozos = new Map<string, Trozo[]>();
  private readonly antes = new Map<string, { x: number; z: number; t: number }>();

  /** Vuelo nuevo: sin estelas. */
  vaciar(): void {
    this.trozos.clear();
    this.antes.clear();
  }

  /**
   * Apunta por dónde va cada uno. `suelo` da la cota del terreno.
   *
   * Una vez por segundo y por avión: la estela de un segundo son setenta metros
   * de trayectoria, y entre dos trozos se busca el más cercano.
   */
  anotar(
    ahora: number,
    quienes: readonly QuienVuela[],
    suelo: (x: number, z: number) => number,
  ): void {
    const vistos = new Set<string>();
    for (const q of quienes) {
      vistos.add(q.id);
      const antes = this.antes.get(q.id);
      if (antes && ahora - antes.t < APUNTA_CADA) continue;
      this.antes.set(q.id, { x: q.x, z: q.z, t: ahora });
      if (!antes || q.sobreElSuelo < 5) continue;
      const dt = ahora - antes.t;
      const dx = q.x - antes.x;
      const dz = q.z - antes.z;
      const v = Math.hypot(dx, dz) / Math.max(dt, 1e-3);
      if (!(v > 15) || dt > 5) continue;
      const b0 = (Math.PI / 4) * q.envergadura;
      const lista = this.trozos.get(q.id) ?? [];
      lista.push({
        x: q.x,
        y: q.y,
        z: q.z,
        t: ahora,
        gamma: (q.masa * GRAVITY) / (RHO * v * b0),
        b0,
        haciaX: dx / (v * dt),
        haciaZ: dz / (v * dt),
        suelo: suelo(q.x, q.z),
      });
      while (lista.length && ahora - lista[0]!.t > DURA_COMO_MUCHO) lista.shift();
      this.trozos.set(q.id, lista);
    }
    // Quien ya no está sigue dejando su estela hasta que se apague.
    for (const [id, lista] of this.trozos) {
      if (vistos.has(id)) continue;
      while (lista.length && ahora - lista[0]!.t > DURA_COMO_MUCHO) lista.shift();
      if (!lista.length) this.trozos.delete(id);
    }
  }

  /**
   * Lo que le hace la estela a un avión que pasa por aquí.
   *
   * `vientoX`/`vientoZ` es el viento que se la lleva, m/s; `envergadura` y
   * `rumbo` —radianes, cero al norte—, los del avión que la cruza, para el
   * alabeo: siguiendo al grande por su misma senda, las dos puntas caen en
   * sitios distintos del par y el avión rueda; cruzándola de través, las dos
   * caen en el mismo y lo que se lleva es el bache.
   */
  aqui(
    ahora: number,
    x: number,
    y: number,
    z: number,
    envergadura: number,
    rumbo: number,
    vientoX: number,
    vientoZ: number,
  ): EnLaEstela {
    const derechaX = Math.cos(rumbo);
    const derechaZ = Math.sin(rumbo);
    let vertical = 0;
    let alabeo = 0;
    for (const lista of this.trozos.values())
      for (const trozo of lista) {
        const edad = ahora - trozo.t;
        const { queda, bajado } = edadDeLaEstela(trozo.gamma, trozo.b0, edad);
        if (queda <= 0) continue;
        const cx = trozo.x + vientoX * edad;
        const cz = trozo.z + vientoZ * edad;
        const cy = Math.max(trozo.y - bajado, trozo.suelo + trozo.b0 / 2);
        // A lo largo de su trayectoria: solo cuenta el trozo que se está
        // cruzando, el de este segundo de su vuelo.
        const rx = x - cx;
        const rz = z - cz;
        const largo = rx * trozo.haciaX + rz * trozo.haciaZ;
        if (Math.abs(largo) > 40) continue;
        // Y de lado, mirando hacia donde iba: derecha positiva.
        const lado = rx * -trozo.haciaZ + rz * trozo.haciaX;
        const alto = y - cy;
        if (Math.abs(lado) > trozo.b0 * 3 || Math.abs(alto) > trozo.b0 * 3)
          continue;
        const gamma = trozo.gamma * queda;
        const nucleo = NUCLEO * (trozo.b0 / (Math.PI / 4));
        const w = (l: number): number =>
          subidaDelPar(l, alto, gamma, trozo.b0, nucleo);
        const medio = Math.max(1, envergadura) / 2;
        vertical += w(lado);
        // Cuánto de su ala cae a lo ancho de la estela: uno siguiéndola, cero
        // cruzándola de través, menos uno yendo al revés.
        const aLoAncho =
          derechaX * -trozo.haciaZ + derechaZ * trozo.haciaX;
        alabeo +=
          -(w(lado + medio * aLoAncho) - w(lado - medio * aLoAncho)) /
          (2 * medio);
      }
    if (vertical === 0 && alabeo === 0) return NADA;
    return { vertical, alabeo };
  }

  /** Cuántos trozos vivos hay. Para los bancos. */
  get cuantos(): number {
    let n = 0;
    for (const l of this.trozos.values()) n += l.length;
    return n;
  }
}

/**
 * La velocidad vertical que induce el par de torbellinos en un punto, m/s,
 * hacia arriba. `lado` es la distancia al eje de la estela —derecha
 * positiva— y `alto`, la altura sobre el par.
 *
 * Entre los dos el aire baja y por fuera sube, que es la forma de la
 * estela: por eso cruzarla de lado es un vaivén de alabeo y entrar por el eje,
 * un hundimiento.
 */
export function subidaDelPar(
  lado: number,
  alto: number,
  gamma: number,
  b0: number,
  nucleo: number,
): number {
  const uno = (dy: number, signo: number): number => {
    const r2 = dy * dy + alto * alto;
    if (r2 < 1e-6) return 0;
    const f = 1 - Math.exp((-1.2526 * r2) / (nucleo * nucleo));
    return (signo * gamma * dy * f) / (2 * Math.PI * r2);
  };
  // El de la derecha, en +b0/2: baja por dentro y sube por fuera.
  return uno(lado - b0 / 2, 1) + uno(lado + b0 / 2, -1);
}
