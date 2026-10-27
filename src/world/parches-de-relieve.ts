/**
 * **El relieve fino donde el horizonte lo alisa.**
 *
 * El horizonte de cada mundo es un mapa de una muestra cada trescientos
 * metros en Canarias y cada kilómetro y setecientos en Paraguay (ver
 * `buildFarMesh` en `terrain.ts`). A esa escala no existe lo que más se
 * reconoce desde el avión: el Teide pierde la punta, el Roque Nublo y el de
 * Agando se quedan en lomas, y el cañón del Paraná bajo Itaipú —cuatrocientos
 * metros de ancho, cien de hondo— es una rampa suave por la que la presa
 * asoma treinta metros de sus ciento noventa y seis.
 *
 * Un **parche** es un recuadro pequeño de relieve fino alrededor de un sitio,
 * en una rejilla de grados y a veinte o treinta metros por muestra. Lo saca
 * `scripts/relieve-fino.mjs`, y aquí se pone encima del horizonte de
 * **cualquier mundo que lo cubra**: el Teide se ve igual desde Los Rodeos, desde
 * Gran Canaria y desde La Gomera, cada uno con su rejilla de horizonte.
 *
 * ## Cómo se pone: refinando cuadros del horizonte
 *
 * No es una malla aparte encima, que tendría que seguir a la de debajo o
 * morderse con ella. Es **el mismo horizonte con algunos cuadros partidos**:
 * los cuadros del mapa lejano que caen enteros dentro de un parche no se
 * dibujan, y en su lugar va una rejilla de `s × s` cuadros más pequeños, en la
 * misma malla, con la misma foto, las mismas teselas y la misma curva de la
 * Tierra. Ver `refinarElHorizonte`.
 *
 * **Sin costuras.** En el borde de lo refinado manda el horizonte: la cota de
 * cada nudo pequeño es la del mapa lejano interpolada, y en un lado de cuadro
 * eso es la recta entre sus dos nudos, que es exactamente el lado del
 * triángulo de al lado. Hacia dentro se pasa al parche en `RAMPA` metros.
 *
 * **Y la física pisa lo mismo que se ve**: `Terrain.sampleHeight`, fuera del
 * mapa fino, pregunta aquí antes que al horizonte. Ver `cota`.
 */

import { mallarConDetalle } from "./malla-lejana";

/** La ficha de un parche, tal cual la escribe el extractor. */
export interface FichaDeParche {
  readonly id: string;
  readonly nombre: string;
  readonly fuente: string;
  readonly atribucion: string;
  readonly sur: number;
  readonly norte: number;
  readonly oeste: number;
  readonly este: number;
  /** Muestras de norte a sur. */
  readonly filas: number;
  /** Muestras de oeste a este. */
  readonly columnas: number;
  /** Cada cuántos metros se dibuja, más o menos. Ver `subdivisionDe`. */
  readonly dibujo: number;
  /** Dónde se aparta el dibujo bajo un sitio con modelo. Ver `asentar`. */
  readonly asientos?: readonly Asiento[];
  readonly minM: number;
  readonly maxM: number;
}

/**
 * **El asiento de un sitio con modelo**: donde el modelo trae su propio suelo
 * —la roca del Roque Nublo y del de Agando, el salto del Monday—, el parche
 * se aparta debajo para que no salgan dos suelos. Por encima de `corte` y a
 * menos de `radio` metros, el dibujo baja `hundido` metros (doce si no se
 * dice), y vuelve a su sitio en diez metros de cota y ochenta de radio, sin
 * escalón.
 *
 * **Solo el dibujo.** La física y la línea de vista siguen pisando el suelo
 * medido: el roque está ahí aunque lo dibuje su modelo, y tapa lo que tapa.
 * Hundido también para ellas, la ventanilla veía Garajonay a través del
 * roque de Agando.
 */
export interface Asiento {
  /** El sitio cuyo modelo pone el suelo, por su clave en `data/sitios/sitios.json`. */
  readonly sitio: string;
  readonly lat: number;
  readonly lon: number;
  /** Desde qué cota, m. Cero: todo lo que hay en el radio. */
  readonly corte: number;
  /** Hasta qué distancia del punto, m. */
  readonly radio: number;
  /** Cuánto se aparta, m. */
  readonly hundido?: number;
}

/** Lo que se aparta el dibujo bajo un modelo si su asiento no dice otra cosa, m. */
export const HUNDIDO_DEL_ASIENTO = 12;

/** Lo que baja el dibujo en un punto por los asientos de un parche, m (positivo). */
export function asentar(h: number, lat: number, lon: number, asientos: readonly Asiento[] | undefined): number {
  if (!asientos?.length) return 0;
  let baja = 0;
  for (const a of asientos) {
    const d = Math.hypot((lon - a.lon) * R * RAD * Math.cos(a.lat * RAD), (lat - a.lat) * R * RAD);
    const enRadio = 1 - Math.min(1, Math.max(0, (d - a.radio) / 80));
    const enCota = Math.min(1, Math.max(0, (h - (a.corte - 12)) / 10));
    const w = enRadio * enCota;
    baja = Math.max(baja, (a.hundido ?? HUNDIDO_DEL_ASIENTO) * w * w * (3 - 2 * w));
  }
  return baja;
}

/** Radio con el que se sacaron los parches, m: el de los extractores. */
const R = 6371008;
const RAD = Math.PI / 180;

/** Un parche cargado: su ficha y sus cotas, m, filas de norte a sur. */
export interface ParcheDeRelieve extends FichaDeParche {
  readonly datos: Int16Array;
}

/**
 * A lo largo de cuántos metros se pasa del horizonte al parche.
 *
 * Un kilómetro, o un cuadro del horizonte si es más ancho: en Paraguay lo es,
 * y entonces la rampa ocupa el primer cuadro de dentro. Lo que importa —la
 * presa, la cumbre, el roque— va con holgura más adentro: ver los recuadros
 * en `scripts/relieve-fino.mjs`.
 */
export const RAMPA = 1000;

/**
 * A cuántos metros del centro del mundo se dibuja un parche a un metro por
 * muestra: a cien kilómetros, cincuenta; a doscientos cincuenta, ciento
 * veinticinco. Ver `refinarElHorizonte`.
 */
export const LEJANIA = 2000;

/** Cuánto puede apartarse un bloque llano de sus muestras, m. */
const TOLERANCIA = 3;
/** El bloque llano más grande, en cuadros pequeños. */
const BLOQUE = 16;

/**
 * La cota del parche en un punto, interpolada, o `null` fuera.
 *
 * En grados y no en metros: el parche no sabe de qué mundo es, y cada mundo
 * pasa sus metros a grados con su propio origen.
 */
export function cotaDelParche(p: ParcheDeRelieve, lat: number, lon: number): number | null {
  const fy = ((p.norte - lat) / (p.norte - p.sur)) * (p.filas - 1);
  const fx = ((lon - p.oeste) / (p.este - p.oeste)) * (p.columnas - 1);
  if (!(fy >= 0 && fx >= 0 && fy <= p.filas - 1 && fx <= p.columnas - 1)) return null;
  const y0 = Math.min(p.filas - 2, Math.floor(fy));
  const x0 = Math.min(p.columnas - 2, Math.floor(fx));
  const ty = fy - y0;
  const tx = fx - x0;
  const h = (y: number, x: number): number => p.datos[y * p.columnas + x]!;
  return (
    (h(y0, x0) * (1 - tx) + h(y0, x0 + 1) * tx) * (1 - ty) +
    (h(y0 + 1, x0) * (1 - tx) + h(y0 + 1, x0 + 1) * tx) * ty
  );
}

/**
 * En cuántos cuadros pequeños se parte cada lado de un cuadro del horizonte.
 *
 * Los que hagan falta para dibujar a `dibujo` metros, más o menos, y al menos
 * uno. Con el horizonte de Los Rodeos a 316 m y el Teide a 45, siete; con el
 * de Guaraní a 1.719 y la presa a 60, veintinueve.
 */
export function subdivisionDe(pasoLejano: number, dibujo: number): number {
  return Math.max(1, Math.round(pasoLejano / Math.max(1, dibujo)));
}

/** La rejilla del horizonte de un mundo, lo que hace falta para refinarla. */
export interface RejillaDelHorizonte {
  /** Nudos por lado. */
  readonly lado: number;
  /** Metros entre nudos. */
  readonly paso: number;
  /** La mitad del lado, m: el nudo (0, 0) está en (−mitad, −mitad). */
  readonly mitad: number;
  /** La cota que se dibuja en un nudo (con el mar hundido), m. */
  cota(fila: number, col: number): number;
  /**
   * Si el horizonte de este mundo dibuja el cuadro (fila, col), en la mitad
   * del anillo que sea: fuera del mapa fino de casa y de los de los vecinos,
   * y fuera del mar abierto.
   */
  dibujable(fila: number, col: number): boolean;
}

/** De metros del mundo a grados. La de cada mundo, con su origen. */
export type AGrados = (x: number, z: number) => { lat: number; lon: number };
/** Y de grados a metros del mundo. */
export type AMetros = (lat: number, lon: number) => { x: number; z: number };

/** Un parche puesto en la rejilla de un mundo. */
export interface ParcheRefinado {
  readonly parche: ParcheDeRelieve;
  /** Los cuadros del horizonte que cubre: filas `f0..f1-1`, columnas `c0..c1-1`. */
  readonly f0: number;
  readonly f1: number;
  readonly c0: number;
  readonly c1: number;
  /** Cuadros pequeños por lado de cuadro del horizonte. */
  readonly s: number;
  /** Nudos pequeños por fila y por columna: `(f1 − f0)·s + 1`, `(c1 − c0)·s + 1`. */
  readonly filas: number;
  readonly columnas: number;
  /** La cota de cada nudo pequeño, m, fila a fila desde `f0`: la que se pisa. */
  readonly alturas: Float32Array;
  /**
   * Y la que se dibuja: la misma, salvo bajo los asientos. Es el mismo
   * arreglo si el parche no tiene ninguno. Ver `Asiento`.
   */
  readonly dibujadas: Float32Array;
  /** Si el cuadro del horizonte (fila, col) va refinado. */
  refinado(fila: number, col: number): boolean;
}

/** Todos los parches de un mundo, y la cota que dan. */
export interface HorizonteRefinado {
  readonly parches: readonly ParcheRefinado[];
  /** Si el cuadro del horizonte (fila, col) va refinado en algún parche. */
  refinado(fila: number, col: number): boolean;
  /** La cota en un punto del mundo si cae en un cuadro refinado, o `null`. */
  cota(x: number, z: number): number | null;
}

/**
 * **Pone los parches en la rejilla del horizonte de un mundo.**
 *
 * `retocar` es lo que el mundo le hace a cada cota del parche antes de
 * dibujarla —hundir el fondo de un lago, por ejemplo—, y le llega la cota en
 * grados para saber dónde cae.
 */
export function refinarElHorizonte(
  rejilla: RejillaDelHorizonte,
  parches: readonly ParcheDeRelieve[],
  aGrados: AGrados,
  aMetros: AMetros,
  retocar: (h: number, lat: number, lon: number) => number = (h) => h,
): HorizonteRefinado {
  const { lado, paso, mitad } = rejilla;
  const n = lado - 1;
  const puestos: ParcheRefinado[] = [];
  for (const p of parches) {
    // El recuadro del parche en metros de este mundo. Con la proyección de
    // los mapas —coseno fijo, el del origen— es un rectángulo de verdad.
    const no = aMetros(p.norte, p.oeste);
    const se = aMetros(p.sur, p.este);
    // Los cuadros que caben enteros, con un paso de margen por si la
    // proyección de este mundo tuerce un poco el recuadro.
    const c0 = Math.max(0, Math.ceil((no.x + mitad) / paso) + 1);
    const c1 = Math.min(n, Math.floor((se.x + mitad) / paso) - 1);
    const f0 = Math.max(0, Math.ceil((no.z + mitad) / paso) + 1);
    const f1 = Math.min(n, Math.floor((se.z + mitad) / paso) - 1);
    if (c1 - c0 < 2 || f1 - f0 < 2) continue;

    const ancho = c1 - c0;
    const alto = f1 - f0;
    const va = new Uint8Array(ancho * alto);
    let alguno = false;
    for (let f = 0; f < alto; f++)
      for (let c = 0; c < ancho; c++)
        if (rejilla.dibujable(f0 + f, c0 + c)) {
          va[f * ancho + c] = 1;
          alguno = true;
        }
    if (!alguno) continue;
    const refinado = (fila: number, col: number): boolean => {
      const f = fila - f0;
      const c = col - c0;
      return f >= 0 && c >= 0 && f < alto && c < ancho && va[f * ancho + c] === 1;
    };

    /*
     * **El peso del parche en cada nudo del horizonte**: cero en los que
     * tocan un cuadro que el horizonte dibuja sin refinar —ahí manda él, para
     * casar con el cuadro de al lado— y subiendo hacia dentro hasta uno a
     * `RAMPA` metros. La distancia, en cuadros, por capas desde el borde.
     *
     * **Lo que el horizonte no dibuja no cuenta como borde.** Al otro lado
     * está el mapa fino de casa o el de un vecino, que es el relieve medido,
     * como el parche; fundir hacia el horizonte ahí era bajar al Roque de
     * Agando, a cuatrocientos metros del mapa fino de La Gomera, a la loma
     * de siempre.
     */
    const nudos = (alto + 1) * (ancho + 1);
    const distancia = new Int32Array(nudos).fill(-1);
    const cola: number[] = [];
    const tosco = (fila: number, col: number): boolean =>
      !refinado(fila, col) && fila >= 0 && col >= 0 && fila < n && col < n && rejilla.dibujable(fila, col);
    for (let f = 0; f <= alto; f++)
      for (let c = 0; c <= ancho; c++) {
        const borde =
          tosco(f0 + f - 1, c0 + c - 1) ||
          tosco(f0 + f - 1, c0 + c) ||
          tosco(f0 + f, c0 + c - 1) ||
          tosco(f0 + f, c0 + c);
        if (borde) {
          distancia[f * (ancho + 1) + c] = 0;
          cola.push(f * (ancho + 1) + c);
        }
      }
    for (let k = 0; k < cola.length; k++) {
      const i = cola[k]!;
      const f = Math.floor(i / (ancho + 1));
      const c = i - f * (ancho + 1);
      for (let df = -1; df <= 1; df++)
        for (let dc = -1; dc <= 1; dc++) {
          const ff = f + df;
          const cc = c + dc;
          if (ff < 0 || cc < 0 || ff > alto || cc > ancho) continue;
          const j = ff * (ancho + 1) + cc;
          if (distancia[j]! >= 0) continue;
          distancia[j] = distancia[i]! + 1;
          cola.push(j);
        }
    }
    const rampa = Math.max(1, Math.round(RAMPA / paso));
    // Un nudo al que no llega ningún borde está todo él dentro: peso uno.
    const peso = Float32Array.from(distancia, (d) => {
      const t = d < 0 ? 1 : Math.min(1, d / rampa);
      return t * t * (3 - 2 * t);
    });

    /*
     * **Y más basto cuanto más lejos de casa.** El Teide se mira de cerca
     * desde Los Rodeos y a ciento treinta kilómetros desde Gran Canaria, y
     * a esa distancia un píxel cubre ciento ochenta metros: dibujarlo a
     * cuarenta y cinco era pagar triángulos que no se ven. A partir de
     * `LEJANIA` metros por metro de dibujo, el paso crece con la distancia
     * del parche al centro del mundo.
     */
    const centro = aMetros((p.norte + p.sur) / 2, (p.oeste + p.este) / 2);
    const s = subdivisionDe(paso, Math.max(p.dibujo, Math.hypot(centro.x, centro.z) / LEJANIA));
    const filas = alto * s + 1;
    const columnas = ancho * s + 1;
    const alturas = new Float32Array(filas * columnas);
    const conAsiento = !!p.asientos?.length;
    const dibujadas = conAsiento ? new Float32Array(filas * columnas) : alturas;
    for (let i = 0; i < filas; i++) {
      const gf = i / s;
      const fa = Math.min(alto - 1, Math.floor(gf));
      const tf = gf - fa;
      for (let j = 0; j < columnas; j++) {
        const gc = j / s;
        const ca = Math.min(ancho - 1, Math.floor(gc));
        const tc = gc - ca;
        // El horizonte en este punto, como lo dibuja su rejilla.
        const lejos =
          (rejilla.cota(f0 + fa, c0 + ca) * (1 - tc) + rejilla.cota(f0 + fa, c0 + ca + 1) * tc) * (1 - tf) +
          (rejilla.cota(f0 + fa + 1, c0 + ca) * (1 - tc) + rejilla.cota(f0 + fa + 1, c0 + ca + 1) * tc) * tf;
        const w0 = peso[fa * (ancho + 1) + ca]!;
        const w1 = peso[fa * (ancho + 1) + ca + 1]!;
        const w2 = peso[(fa + 1) * (ancho + 1) + ca]!;
        const w3 = peso[(fa + 1) * (ancho + 1) + ca + 1]!;
        const w = (w0 * (1 - tc) + w1 * tc) * (1 - tf) + (w2 * (1 - tc) + w3 * tc) * tf;
        let h = lejos;
        let baja = 0;
        if (w > 0) {
          const x = -mitad + (c0 + gc) * paso;
          const z = -mitad + (f0 + gf) * paso;
          const { lat, lon } = aGrados(x, z);
          const fino = cotaDelParche(p, lat, lon);
          if (fino !== null) {
            h = lejos + (retocar(fino, lat, lon) - lejos) * w;
            // El asiento mira la cota medida, no la retocada: ver `Asiento`.
            if (conAsiento) baja = asentar(fino, lat, lon, p.asientos) * w;
          }
        }
        alturas[i * columnas + j] = h;
        if (conAsiento) dibujadas[i * columnas + j] = h - baja;
      }
    }
    puestos.push({ parche: p, f0, f1, c0, c1, s, filas, columnas, alturas, dibujadas, refinado });
  }

  return {
    parches: puestos,
    refinado: (fila, col) => puestos.some((p) => p.refinado(fila, col)),
    cota: (x, z) => {
      const gc = (x + mitad) / paso;
      const gf = (z + mitad) / paso;
      for (const p of puestos) {
        const fila = Math.floor(gf);
        const col = Math.floor(gc);
        if (!p.refinado(fila, col)) continue;
        const i = (gf - p.f0) * p.s;
        const j = (gc - p.c0) * p.s;
        const i0 = Math.min(p.filas - 2, Math.floor(i));
        const j0 = Math.min(p.columnas - 2, Math.floor(j));
        const ti = i - i0;
        const tj = j - j0;
        const h = (a: number, b: number): number => p.alturas[a * p.columnas + b]!;
        return (
          (h(i0, j0) * (1 - tj) + h(i0, j0 + 1) * tj) * (1 - ti) +
          (h(i0 + 1, j0) * (1 - tj) + h(i0 + 1, j0 + 1) * tj) * ti
        );
      }
      return null;
    },
  };
}

/**
 * **Los triángulos de un parche puesto**, en nudos de su rejilla pequeña
 * (`fila * columnas + col`).
 *
 * Con los bloques llanos juntados como en el resto del horizonte —ver
 * `world/malla-lejana.ts`—: Itaipú es sobre todo potrero, y doscientos
 * triángulos de potrero dibujan lo mismo que cuatro. `va` dice qué cuadros
 * del horizonte entran en esta malla, que el anillo puede ir partido en dos.
 */
export function mallarElParche(
  p: ParcheRefinado,
  va: (fila: number, col: number) => boolean,
): number[] {
  // `mallarConDetalle` pide una rejilla cuadrada: se mete en la de su lado
  // mayor, y lo que sobra no va.
  const lado = Math.max(p.filas, p.columnas);
  const indices = mallarConDetalle(
    lado,
    (i, j) => p.dibujadas[Math.min(p.filas - 1, i) * p.columnas + Math.min(p.columnas - 1, j)]!,
    (i, j) =>
      i < p.filas - 1 &&
      j < p.columnas - 1 &&
      p.refinado(p.f0 + Math.floor(i / p.s), p.c0 + Math.floor(j / p.s)) &&
      va(p.f0 + Math.floor(i / p.s), p.c0 + Math.floor(j / p.s)),
    /*
     * Y el cerco de fuera, cuadro a cuadro: al otro lado está el horizonte,
     * que solo tiene nudos en sus esquinas, y un bloque que saltara de un
     * nudo del horizonte al siguiente se saltaría el quiebro entre los dos.
     */
    (i, j) => i === 0 || j === 0 || i >= p.filas - 2 || j >= p.columnas - 2,
    TOLERANCIA,
    BLOQUE,
  );
  // De la rejilla cuadrada a la de verdad.
  for (let k = 0; k < indices.length; k++) {
    const v = indices[k]!;
    const i = Math.floor(v / lado);
    indices[k] = i * p.columnas + (v - i * lado);
  }
  return indices;
}

// ── Lo que hay, y cómo se carga ───────────────────────────────────────────

/*
 * Con `import.meta.glob`, como los relieves: así Vite emite cada fichero con
 * su huella. Las fichas van dentro del paquete —son unos cientos de bytes y
 * dicen qué parche cae en qué mundo sin pedir nada—, y las cotas se piden.
 */
const FICHAS = import.meta.glob("../../data/terrain/parches/*.json", {
  import: "default",
  eager: true,
}) as Record<string, FichaDeParche>;

const DATOS = import.meta.glob("../../data/terrain/parches/*.bin", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Todas las fichas de los parches que hay. */
export function fichasDeParches(): readonly FichaDeParche[] {
  return Object.values(FICHAS);
}

/**
 * Los parches que caen en un cuadrado del mundo, cargados.
 *
 * Se carga lo que toca al mapa del horizonte de ese mundo y nada más: Itaipú
 * no se baja volando por Canarias. Si alguno falla, se vuela sin él, con el
 * horizonte de siempre: ver `cargarRelieve`.
 */
export async function cargarParches(
  dentro: (f: FichaDeParche) => boolean,
  descomprimir: (b: ArrayBuffer) => Promise<ArrayBuffer>,
  pedir: (url: string) => Promise<Response | undefined> = (url) => fetch(url),
): Promise<ParcheDeRelieve[]> {
  const fichas = fichasDeParches().filter(dentro);
  const cargados = await Promise.all(
    fichas.map(async (f): Promise<ParcheDeRelieve | null> => {
      const url = Object.entries(DATOS).find(([k]) => k.endsWith(`/${f.id}.bin`))?.[1];
      if (!url) return null;
      try {
        const res = await pedir(url);
        if (!res?.ok) return null;
        const datos = new Int16Array(await descomprimir(await res.arrayBuffer()));
        return datos.length === f.filas * f.columnas ? { ...f, datos } : null;
      } catch {
        return null;
      }
    }),
  );
  return cargados.filter((p): p is ParcheDeRelieve => p !== null);
}
