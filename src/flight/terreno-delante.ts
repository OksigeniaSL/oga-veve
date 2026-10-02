/**
 * *Caution terrain* y *terrain ahead, pull up*: **el relieve que viene por
 * delante**.
 *
 * ## Por qué existe
 *
 * Llegando a La Palma por la final calculada de la 18, el JAZ 90 volaba a mil
 * ochocientos pies, alineado con la pista y sobre la ladera de Barlovento, con
 * la montaña subiendo por delante. Y no sonó nada: «que me avise, que tengo
 * una montaña bien grande delante». El aviso de terreno del juego —ver
 * `aviso-de-terreno.ts`— mira **lo que hay debajo**: salta por debajo de
 * ciento veinte metros sobre el suelo, y se calla en final, que es donde
 * estar bajo es lo que toca. A quinientos metros sobre una ladera que sube no
 * tenía nada que decir, y para cuando lo tuviera ya no habría con qué.
 *
 * Los aviones de línea llevan para eso un avisador que **mira hacia delante**
 * por la base de datos del relieve: es el TAWS de clase A, el EGPWS de
 * Honeywell, obligatorio en los de turbina con seis asientos de pasaje o más
 * (14 CFR 135.154; en Europa, la parte CAT). Su función de mirar delante (FLTA,
 * *forward looking terrain avoidance*) proyecta la trayectoria y avisa en dos
 * escalones, que son los que hay aquí:
 *
 * - **Precaución**, «caution terrain», unos cuarenta a sesenta segundos antes:
 *   ámbar. Hay tiempo de sobra y lo que se hace es subir o apartarse.
 * - **Aviso**, «terrain ahead, pull up», unos veinte a treinta segundos antes:
 *   rojo. Ahí ya no se piensa: motor y morro arriba.
 *
 * ## Cuánto margen pide
 *
 * El que fija la norma de esos equipos (TSO-C151c, tabla de la FLTA) por fase
 * del vuelo, nivelado y bajando: en ruta, 700 y 500 pies; en la terminal, a
 * menos de quince millas de una pista, 350 y 300; en la aproximación, a menos
 * de cinco, 150 y 100. Cerca de la pista el margen se va acabando, que es
 * para lo que se baja, y **sobre la pista no se mira**: el suelo que hay ahí
 * es donde se va a tocar. Es lo que hace el equipo de verdad con su base de
 * pistas, y por el mismo motivo: si sonara en cada final, se aprendería a no
 * hacerle caso.
 *
 * ## Lo que se simplifica
 *
 * La trayectoria se proyecta con lo que lleva el avión —su rumbo sobre el
 * suelo, su giro y su ritmo de subida o bajada— a sesenta segundos en ruta y a
 * cuarenta cerca de una pista, y se cata el relieve por el eje y a los dos
 * lados, en un pasillo que se abre con la distancia y se cierra hacia la
 * pista. Los números de tiempo y de margen son los de la norma. Lo que el
 * equipo de verdad hace con su propia rejilla y sus propias curvas —acortar
 * la mirada según se acerca a la pista— aquí es una regla sola y nuestra:
 * como mucho, un tercio de lo que falta hasta ella. Ver `HASTA_LA_PISTA`.
 *
 * Esto no habla ni dibuja: dice si hay que avisar, de qué y en cuánto. Quién
 * lo dice y en qué avión lo decide `Game`, con la escalera: ver
 * `flight/escalera.ts`.
 */

import type { AvisoDeTerreno } from "./aviso-de-terreno";

/** Un pie, m. */
const PIE = 0.3048;
/** Una milla náutica, m. */
const MILLA = 1852;

/** Lo que dice: precaución, aviso o nada. */
export type AvisoDelante = "precaucion" | "aviso" | null;

/**
 * A cuántos segundos del choque se avisa con calma, en ámbar, y con prisa, en
 * rojo: en ruta, y cerca de una pista.
 *
 * Los de la norma van de cuarenta a sesenta segundos la precaución y de veinte
 * a treinta el aviso, y el equipo de verdad acorta la mirada cerca de los
 * aeropuertos, que es donde se vuela bajo a propósito: entrando a la vista en
 * una final, sesenta segundos de recta por delante son la costa de al lado.
 * Así que en ruta, lo largo de cada tramo, y en la terminal, lo corto.
 */
export const PRECAUCION = { ruta: 60, terminal: 40 } as const;
export const AVISO = { ruta: 30, terminal: 20 } as const;

/** Cada cuánto se cata la trayectoria, s. */
const PASO = 1.5;

/**
 * El margen sobre el relieve que pide cada fase, nivelado y bajando, m. Ver
 * la cabecera: TSO-C151c.
 */
export const MARGEN = {
  ruta: { nivelado: 700 * PIE, bajando: 500 * PIE },
  terminal: { nivelado: 350 * PIE, bajando: 300 * PIE },
  aproximacion: { nivelado: 150 * PIE, bajando: 100 * PIE },
} as const;

/** A menos de esto de una pista se está en la terminal, m. */
export const TERMINAL = 15 * MILLA;
/** Y a menos de esto, en la aproximación, m. */
export const APROXIMACION = 5 * MILLA;

/** Bajando, a efectos del margen: más de cuatrocientos pies por minuto, m/s. */
const BAJANDO = -2;

/**
 * Por debajo de esta velocidad sobre el suelo no se mira, m/s: rodando o
 * parado no hay trayectoria que proyectar. Cincuenta nudos.
 */
const DESPACIO = 26;

/** Lo que hace falta saber del avión. */
export interface Trayectoria {
  readonly x: number;
  readonly z: number;
  /** Altitud, m. */
  readonly altitud: number;
  /** Velocidad sobre el suelo, m/s: al este (`vx`) y al sur (`vz`). */
  readonly vx: number;
  readonly vz: number;
  /** Lo que sube, m/s; negativo bajando. */
  readonly vertical: number;
  /** Lo que gira el rumbo sobre el suelo, rad/s; positivo a la derecha. */
  readonly giro: number;
}

/** Una pista de la base del equipo: dónde, hacia dónde, cuánto y a qué cota. */
export interface PistaConocida {
  readonly x: number;
  readonly z: number;
  /** Rumbo verdadero, grados. */
  readonly heading: number;
  readonly length: number;
  readonly width: number;
  /** Cota del asfalto, m. */
  readonly cota: number;
}

/** Lo que se encontró por delante. */
export interface Delante {
  readonly aviso: AvisoDelante;
  /** En cuántos segundos se toca el margen, o `null` si no se toca. */
  readonly segundos: number | null;
  /** El margen que se pidió, m. Para los bancos y las pruebas. */
  readonly margen: number;
}

/** El margen de esta fase, con el ritmo de ahora. */
export function margenDeLaFase(distanciaALaPista: number, vertical: number): number {
  const fase =
    distanciaALaPista < APROXIMACION
      ? MARGEN.aproximacion
      : distanciaALaPista < TERMINAL
        ? MARGEN.terminal
        : MARGEN.ruta;
  return vertical < BAJANDO ? fase.bajando : fase.nivelado;
}

/**
 * A cuánto se está de la pista más cercana, m, contando la pista entera: del
 * eje entre sus dos puntas. `Infinity` sin pistas.
 */
function aLaPista(pistas: readonly PistaConocida[], x: number, z: number): {
  readonly d: number;
  readonly pista: PistaConocida | null;
} {
  let d = Infinity;
  let cual: PistaConocida | null = null;
  for (const p of pistas) {
    const h = (p.heading * Math.PI) / 180;
    const fx = Math.sin(h);
    const fz = -Math.cos(h);
    const along = (x - p.x) * fx + (z - p.z) * fz;
    const across = (x - p.x) * fz * -1 + (z - p.z) * fx;
    const fuera = Math.max(0, Math.abs(along) - p.length / 2);
    const esta = Math.hypot(fuera, across);
    if (esta < d) {
      d = esta;
      cual = p;
    }
  }
  return { d, pista: cual };
}

/**
 * Lo que queda de margen junto a una pista, m: se acaba en ella.
 *
 * Una senda de tres grados va a cinco centésimas de la distancia por encima
 * de la pista; el margen va a la mitad de eso —un grado y medio— hasta el de
 * la fase. Así una final bien hecha no lo toca nunca, y una que viene por
 * debajo de la mitad de la senda sobre un monte, sí.
 */
const MARGEN_JUNTO_A_LA_PISTA = Math.tan((1.5 * Math.PI) / 180);

/** La última media milla antes de la pista, m: ver `mirarDelante`. */
const ULTIMA_MEDIA_MILLA = 0.5 * MILLA;

/** Qué parte de lo que falta hasta la pista se mira, como mucho. Ver `mirarDelante`. */
const HASTA_LA_PISTA = 1 / 3;

/**
 * **Mira por delante**: si con lo que lleva el avión va a meterse en el
 * margen del relieve, y en cuánto.
 *
 * `cota` es el relieve que conoce el juego, o `null` donde no se sabe —eso
 * no cuenta—. `pistas`, las que conoce el equipo.
 */
export function mirarDelante(
  t: Trayectoria,
  cota: (x: number, z: number) => number | null,
  pistas: readonly PistaConocida[],
): Delante {
  const suelo = Math.hypot(t.vx, t.vz);
  const fase = aLaPista(pistas, t.x, t.z);
  const margen = margenDeLaFase(fase.d, t.vertical);
  if (suelo < DESPACIO) return { aviso: null, segundos: null, margen };
  const enRuta = fase.d >= TERMINAL;
  /*
   * **Y junto a la pista, más corto todavía**: como mucho lo que se tarda en
   * recorrer un tercio de lo que falta hasta ella. Es lo que hace el equipo
   * de verdad cerca de los aeropuertos, que acorta su mirada según se acerca
   * a la pista para no avisar de la final; sin eso, la maniobra visual
   * publicada de la 21 de Lanzarote, que baja hacia la cantera de Argana y
   * gira allí, veía las lomas de San Bartolomé de detrás del giro. Lejos de
   * la pista no cambia nada: a seis millas de La Palma se seguía mirando
   * cuarenta segundos.
   */
  const hasta = Math.min(
    enRuta ? PRECAUCION.ruta : PRECAUCION.terminal,
    (fase.d / suelo) * HASTA_LA_PISTA,
  );
  const aviso = Math.min(enRuta ? AVISO.ruta : AVISO.terminal, hasta / 2);
  let rumbo = Math.atan2(t.vx, -t.vz);
  let x = t.x;
  let z = t.z;
  for (let s = PASO; s <= hasta + 1e-6; s += PASO) {
    rumbo += t.giro * PASO;
    x += Math.sin(rumbo) * suelo * PASO;
    z -= Math.cos(rumbo) * suelo * PASO;
    const altitud = t.altitud + t.vertical * s;
    /*
     * **Sobre la pista, o en su última media milla bajando a ella, no se
     * mira, y se deja de mirar**: eso es aterrizar, y lo que viene después de
     * tocar no es una trayectoria. Lo que se cae ahí, corto o pesado, lo
     * dicen el aviso de debajo y el de la senda. Ver `aviso-de-terreno.ts`.
     */
    const junto = aLaPista(pistas, x, z);
    if (
      junto.pista &&
      junto.d < Math.max(junto.pista.width, ULTIMA_MEDIA_MILLA) &&
      altitud < junto.pista.cota + junto.d * 0.1 + 30
    )
      break;
    const aqui = Math.min(margen, junto.d * MARGEN_JUNTO_A_LA_PISTA);
    /*
     * **El pasillo se abre con la distancia**, que es lo que se tarda en
     * apartarse, **y se cierra hacia la pista**, como las superficies de una
     * aproximación: a quince por ciento por cada lado desde su franja. Sin
     * eso, en una final bien hecha a La Palma o a El Hierro, la ladera que
     * hay junto a la pista entraba en el pasillo y avisaba de lo que se ve
     * en cada toma.
     */
    const ancho = Math.min(60 + 0.05 * suelo * s, 60 + 0.15 * junto.d);
    const ux = Math.cos(rumbo);
    const uz = Math.sin(rumbo);
    for (const lado of [0, -1, 1]) {
      const c = cota(x + ux * lado * ancho, z + uz * lado * ancho);
      if (c === null) continue;
      if (c + aqui > altitud) {
        return { aviso: s <= aviso ? "aviso" : "precaucion", segundos: s, margen };
      }
    }
  }
  return { aviso: null, segundos: null, margen };
}

/**
 * **El aviso del suelo, con lo de debajo y lo de delante juntos**: el de
 * `aviso-de-terreno.ts` —lo que hay debajo— y el de aquí. El suelo es uno y
 * avisa una vez, con lo más urgente de los dos: el aviso de delante es el
 * mismo «sube» que el de debajo, y su precaución, «monte», va por detrás de
 * ir bajo ahora mismo.
 */
export type AvisoDelSuelo = AvisoDeTerreno | "monte";

export function juntarAvisos(debajo: AvisoDeTerreno, delante: AvisoDelante): AvisoDelSuelo {
  if (debajo === "sube" || delante === "aviso") return "sube";
  if (debajo === "bajo") return "bajo";
  return delante === "precaucion" ? "monte" : null;
}

/**
 * **Lo que pesa cada aviso del suelo**, para saber cuándo va a más: «sube»
 * más que «bajo», y «bajo» más que «monte». Ir a más se dice siempre, aunque
 * el aviso de antes siga puesto; ver el aviso de terreno en `Game`.
 */
export function gravedadDelSuelo(a: AvisoDelSuelo): number {
  return a === "sube" ? 3 : a === "bajo" ? 2 : a === "monte" ? 1 : 0;
}

/**
 * **El color del relieve en la pantalla de navegación**, por lo que está por
 * encima o por debajo del avión, como lo pinta el EGPWS de verdad: rojo lo que
 * pasa de dos mil pies por encima; ámbar fuerte de mil a dos mil; ámbar flojo
 * de quinientos por debajo —doscientos cincuenta con el tren fuera— a mil por
 * encima; verde fuerte de mil a quinientos por debajo; verde flojo de dos mil
 * a mil por debajo; y nada por debajo de eso ni en el mar. Los puntitos de
 * las pantallas de verdad, que dicen lo mismo con la densidad, aquí son la
 * opacidad.
 */
export type ColorDelRelieve =
  | "rojo"
  | "ambar"
  | "ambar-flojo"
  | "verde"
  | "verde-flojo";

export function colorDelRelieve(
  /** La cota del relieve menos la altitud del avión, m. */
  porEncima: number,
  trenFuera: boolean,
): ColorDelRelieve | null {
  const pies = porEncima / PIE;
  if (pies > 2000) return "rojo";
  if (pies > 1000) return "ambar";
  if (pies > (trenFuera ? -250 : -500)) return "ambar-flojo";
  if (pies > -1000) return "verde";
  if (pies > -2000) return "verde-flojo";
  return null;
}
