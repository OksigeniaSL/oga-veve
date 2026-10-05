/**
 * Qué teselas de ortofoto hay que tener, y a qué nivel: la cobertura.
 *
 * Existe por una captura de Enrique sobre La Palma (punto 166 de la lista):
 * Santa Cruz y su volcán, con foto fina, «preciosos»; el resto de la isla,
 * «verde plano y a bloques, como estar jugando en Minecraft». La foto fina
 * cubre dieciocho kilómetros alrededor del aeropuerto y la isla mide cuarenta
 * y siete de punta a punta, así que casi todo lo que se ve desde el avión
 * caía a la foto del horizonte, a ciento treinta y cuatro metros por píxel.
 *
 * La respuesta es la de cualquier mapa de internet: **teselas por niveles**,
 * que se bajan según se miran. Este módulo decide cuáles existen; quién las
 * pinta y cuándo se bajan es `world/teselas-de-ortofoto.ts`.
 *
 * ## Los niveles, y por qué esos
 *
 * Son los del mosaico de Web Mercator del propio IGN (`EPSG:3857`), a
 * doscientos cincuenta y seis píxeles por tesela. A la latitud de Canarias:
 *
 *     z16    2,1 m/px   537 m de lado   los pasillos de llegada y salida, y las cumbres
 *     z15    4,2 m/px   1,1 km          la isla entera, costa incluida
 *     z14    8,4 m/px   2,1 km          la isla entera
 *     z11–13            hasta 17 km     la isla entera, hechas aquí a partir de la z14
 *
 * **La isla entera hasta z15**, y no solo los pasillos: es lo que pidió
 * Enrique —«que cubra la isla entera»— y en el servidor cuesta poco, porque
 * quien juega no se baja lo que hay sino lo que mira. Lo que hace ligero el
 * juego es la regla de la distancia (`nivelParaDistancia` en `teselas-de-ortofoto.ts`),
 * no tener menos teselas en el servidor.
 *
 * **z16 donde se vuela bajo o se mira de cerca**: la prolongación de cada
 * pista veinte kilómetros por cada lado —la final y la salida, que es donde
 * se va a mil pies mirando el suelo— y las cumbres que la comandante señala
 * por la ventanilla, que se miran de frente y desde cerca de su cota.
 *
 * **Y por debajo de z14 no se le pide nada al IGN**: sus niveles bajos son
 * otro mosaico, con otra exposición —el horizonte salía hasta un 47 % más
 * claro que el mapa fino, ver `scripts/casar-exposicion.mjs`—. Hechas aquí
 * promediando las de z14, las teselas gruesas son la misma foto que las finas
 * y no hay costura de color entre niveles.
 *
 * ## Sin dependencias, a propósito
 *
 * Este fichero no importa nada: lo usan el juego, las pruebas y el extractor
 * (`scripts/pnoa-a-teselas.mjs`), que lo carga con Node tal cual. Los datos
 * —las pistas, las cumbres, dónde hay tierra— se le pasan.
 */

/** Lado de una tesela del mosaico, píxeles. El estándar, y el del IGN. */
export const LADO_DE_TESELA = 256;

/** El nivel más grueso que se sirve. A 28° de latitud, 17 km de lado. */
export const NIVEL_MIN = 11;

/** Hasta aquí se piden al IGN; por debajo se hacen promediando. */
export const NIVEL_PEDIDO_MIN = 14;

/** El de la isla entera. */
export const NIVEL_DE_LA_ISLA = 15;

/** El más fino: pasillos y cumbres. */
export const NIVEL_MAX = 16;

/** Hasta dónde se prolonga cada pista por cada lado para el pasillo, m. */
export const LARGO_DEL_PASILLO = 20000;

/**
 * Medio ancho del pasillo, m.
 *
 * Tres kilómetros a cada lado del eje: la final de verdad no es una raya —se
 * entra desde un tramo de base o desde una curva, y la de La Palma por la 18
 * llega costeando—, y lo que se mira desde la ventanilla en final es una
 * franja ancha, no el eje.
 */
export const ANCHO_DEL_PASILLO = 3000;

/**
 * Radio alrededor de cada cumbre, m.
 *
 * Cuatro kilómetros: lo que ocupa en el cuadro una montaña vista desde
 * crucero a quince o veinte kilómetros, que es desde donde se señala.
 */
export const RADIO_DE_LA_CUMBRE = 4000;

const RAD = Math.PI / 180;

/** Radio de la Tierra de los extractores, m. Ver `entre-aerodromos.ts`. */
const R = 6371008;

export interface Caja {
  readonly sur: number;
  readonly norte: number;
  readonly oeste: number;
  readonly este: number;
}

export interface Isla {
  readonly id: string;
  readonly nombre: string;
  /** La caja que la contiene, en grados, con algo de mar alrededor. */
  readonly caja: Caja;
}

/**
 * Las siete islas, con sus islotes dentro: La Graciosa y Alegranza en la caja
 * de Lanzarote, Lobos en la de Fuerteventura.
 */
export const ISLAS_CANARIAS: readonly Isla[] = [
  { id: "la-palma", nombre: "La Palma", caja: { sur: 28.44, norte: 28.87, oeste: -18.02, este: -17.70 } },
  { id: "el-hierro", nombre: "El Hierro", caja: { sur: 27.62, norte: 27.87, oeste: -18.18, este: -17.86 } },
  { id: "la-gomera", nombre: "La Gomera", caja: { sur: 28.00, norte: 28.23, oeste: -17.36, este: -17.08 } },
  { id: "tenerife", nombre: "Tenerife", caja: { sur: 27.98, norte: 28.60, oeste: -16.94, este: -16.10 } },
  { id: "gran-canaria", nombre: "Gran Canaria", caja: { sur: 27.72, norte: 28.19, oeste: -15.86, este: -15.34 } },
  { id: "fuerteventura", nombre: "Fuerteventura", caja: { sur: 28.03, norte: 28.77, oeste: -14.53, este: -13.80 } },
  { id: "lanzarote", nombre: "Lanzarote", caja: { sur: 28.82, norte: 29.43, oeste: -13.90, este: -13.40 } },
];

/** Una tesela del mosaico: nivel, columna y fila. */
export interface Tesela {
  readonly z: number;
  readonly x: number;
  readonly y: number;
}

/** La llave de una tesela, para conjuntos y mapas. */
export function llave(t: Tesela): string {
  return `${t.z}/${t.x}/${t.y}`;
}

export function deLlave(k: string): Tesela {
  const [z, x, y] = k.split("/").map(Number) as [number, number, number];
  return { z, x, y };
}

/** Dónde cae un punto en el mosaico de ese nivel, en teselas con decimales. */
export function enTeselas(lat: number, lon: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const rad = lat * RAD;
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  };
}

/** Y al revés: la latitud y la longitud de una esquina de tesela. */
export function aGrados(x: number, y: number, z: number): { lat: number; lon: number } {
  const n = 2 ** z;
  const lon = (x / n) * 360 - 180;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) / RAD;
  return { lat, lon };
}

/** Metros por píxel a esa latitud y ese nivel. */
export function metrosPorPixel(lat: number, z: number): number {
  return (2 * Math.PI * 6378137 * Math.cos(lat * RAD)) / (LADO_DE_TESELA * 2 ** z);
}

/** La madre de una tesela, un nivel más grueso. */
export function madre(t: Tesela): Tesela {
  return { z: t.z - 1, x: Math.floor(t.x / 2), y: Math.floor(t.y / 2) };
}

/** Las cuatro hijas, un nivel más fino. */
export function hijas(t: Tesela): Tesela[] {
  const out: Tesela[] = [];
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++)
      out.push({ z: t.z + 1, x: t.x * 2 + dx, y: t.y * 2 + dy });
  return out;
}

/** A qué isla pertenece una tesela, por el centro, o `null`. */
export function islaDe(t: Tesela, islas: readonly Isla[] = ISLAS_CANARIAS): Isla | null {
  const c = aGrados(t.x + 0.5, t.y + 0.5, t.z);
  return (
    islas.find(
      (i) =>
        c.lat >= i.caja.sur && c.lat <= i.caja.norte && c.lon >= i.caja.oeste && c.lon <= i.caja.este,
    ) ?? null
  );
}

/** Lo que el extractor sabe de una pista: sus dos umbrales, en grados. */
export interface PistaEnGrados {
  readonly a: { readonly lat: number; readonly lon: number };
  readonly b: { readonly lat: number; readonly lon: number };
}

/** Una cumbre o un sitio que se señala desde la ventanilla. */
export interface Cumbre {
  readonly clave: string;
  readonly lat: number;
  readonly lon: number;
}

/**
 * Las pistas de un aeródromo extraído, en grados, con la misma proyección que
 * su extractor —equirectangular sobre su origen—: si aquí se usara otra, el
 * pasillo se torcería respecto a la pista que se dibuja.
 */
export function pistasEnGrados(aero: {
  readonly origin: { readonly lat: number; readonly lon: number };
  readonly runways: readonly {
    readonly thresholds: Readonly<Record<string, { readonly xy: readonly number[] | null } | null>>;
  }[];
}): PistaEnGrados[] {
  const { lat: lat0, lon: lon0 } = aero.origin;
  const k = Math.cos(lat0 * RAD);
  const aGr = (xy: readonly number[]) => ({
    lat: lat0 + (xy[1]! / R) / RAD,
    lon: lon0 + (xy[0]! / (R * k)) / RAD,
  });
  const out: PistaEnGrados[] = [];
  for (const p of aero.runways) {
    const u = Object.values(p.thresholds).filter(
      (t): t is { readonly xy: readonly number[] } => !!t && !!t.xy,
    );
    if (u.length >= 2) out.push({ a: aGr(u[0]!.xy), b: aGr(u[1]!.xy) });
  }
  return out;
}

/**
 * Metros entre un punto y el pasillo de una pista: el segmento entre los dos
 * umbrales, prolongado `LARGO_DEL_PASILLO` por cada lado.
 */
export function distanciaAlPasillo(lat: number, lon: number, p: PistaEnGrados): number {
  // En metros locales, con el centro de la pista de origen: a veinte
  // kilómetros la proyección plana se equivoca en centímetros.
  const lat0 = (p.a.lat + p.b.lat) / 2;
  const lon0 = (p.a.lon + p.b.lon) / 2;
  const k = Math.cos(lat0 * RAD);
  const m = (la: number, lo: number) => ({ x: (lo - lon0) * RAD * R * k, y: (la - lat0) * RAD * R });
  const a = m(p.a.lat, p.a.lon);
  const b = m(p.b.lat, p.b.lon);
  const q = m(lat, lon);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo = Math.hypot(dx, dy) || 1;
  const ux = dx / largo;
  const uy = dy / largo;
  // A lo largo del eje, recortado al pasillo; al través, lo que quede.
  const t = Math.max(-LARGO_DEL_PASILLO, Math.min(largo + LARGO_DEL_PASILLO, (q.x - a.x) * ux + (q.y - a.y) * uy));
  return Math.hypot(q.x - (a.x + ux * t), q.y - (a.y + uy * t));
}

/** Metros entre dos puntos, en plano local. Para radios de pocos kilómetros. */
function metrosEntre(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const k = Math.cos(((lat1 + lat2) / 2) * RAD);
  return Math.hypot((lon2 - lon1) * RAD * R * k, (lat2 - lat1) * RAD * R);
}

/**
 * Metros entre un punto y el rectángulo de una tesela: cero si cae dentro.
 */
export function distanciaATesela(lat: number, lon: number, t: Tesela): number {
  const no = aGrados(t.x, t.y, t.z);
  const se = aGrados(t.x + 1, t.y + 1, t.z);
  const cLat = Math.max(se.lat, Math.min(no.lat, lat));
  const cLon = Math.max(no.lon, Math.min(se.lon, lon));
  return metrosEntre(lat, lon, cLat, cLon);
}

/**
 * Si en la tesela hay tierra, mirando una rejilla de puntos con un margen.
 *
 * El margen es para la costa: una tesela cuyo centro cae en el mar y que
 * lleva cien metros de acantilado en una esquina tiene que estar, o la isla
 * sale con el borde mordido. `tierra` lo da el relieve: ver el extractor.
 */
export function tieneTierra(
  t: Tesela,
  tierra: (lat: number, lon: number) => boolean,
  muestras = 6,
): boolean {
  const margen = 0.15;
  for (let j = 0; j <= muestras; j++)
    for (let i = 0; i <= muestras; i++) {
      const fx = -margen + ((1 + 2 * margen) * i) / muestras;
      const fy = -margen + ((1 + 2 * margen) * j) / muestras;
      const p = aGrados(t.x + fx, t.y + fy, t.z);
      if (tierra(p.lat, p.lon)) return true;
    }
  return false;
}

/** Un mapa de relieve tal y como está en `data/terrain/`, ya leído. */
export interface MapaDeRelieve {
  readonly origen: { readonly lat: number; readonly lon: number };
  readonly tamanoM: number;
  readonly datos: Int16Array;
}

/**
 * **Dónde hay tierra**, con los mapas de relieve que ya tiene el juego: sí
 * si alguna de las cuatro muestras de alrededor pasa de un metro. Mirar las
 * cuatro y no la más cercana ensancha la isla una muestra, y eso es lo que
 * se quiere: mejor una tesela de costa de más que un acantilado mordido.
 *
 * Se mira el mapa de paso más fino que cubra el punto.
 */
export function tierraDeLosRelieves(
  mapas: readonly MapaDeRelieve[],
): (lat: number, lon: number) => boolean {
  const listos = mapas
    .map((m) => {
      const lado = Math.round(Math.sqrt(m.datos.length));
      return {
        lat0: m.origen.lat,
        lon0: m.origen.lon,
        k: Math.cos(m.origen.lat * RAD),
        mitad: m.tamanoM / 2,
        paso: m.tamanoM / (lado - 1),
        lado,
        datos: m.datos,
      };
    })
    .sort((a, b) => a.paso - b.paso);
  return (lat, lon) => {
    for (const m of listos) {
      const x = (lon - m.lon0) * RAD * R * m.k;
      const z = -(lat - m.lat0) * RAD * R;
      if (Math.abs(x) > m.mitad || Math.abs(z) > m.mitad) continue;
      const c0 = Math.min(m.lado - 1, Math.floor((x + m.mitad) / m.paso));
      const f0 = Math.min(m.lado - 1, Math.floor((z + m.mitad) / m.paso));
      const c1 = Math.min(m.lado - 1, c0 + 1);
      const f1 = Math.min(m.lado - 1, f0 + 1);
      const d = m.datos;
      return (
        d[f0 * m.lado + c0]! > 1 ||
        d[f0 * m.lado + c1]! > 1 ||
        d[f1 * m.lado + c0]! > 1 ||
        d[f1 * m.lado + c1]! > 1
      );
    }
    return false;
  };
}

/** Las teselas de un nivel que tocan una caja. */
export function teselasDeLaCaja(caja: Caja, z: number): Tesela[] {
  const a = enTeselas(caja.norte, caja.oeste, z);
  const b = enTeselas(caja.sur, caja.este, z);
  const out: Tesela[] = [];
  for (let y = Math.floor(a.y); y <= Math.floor(b.y); y++)
    for (let x = Math.floor(a.x); x <= Math.floor(b.x); x++) out.push({ z, x, y });
  return out;
}

/** El plan: qué teselas se piden al IGN, nivel a nivel. */
export interface PlanDeTeselas {
  /** Las de z14 a z16, que se piden. */
  readonly pedidas: ReadonlyMap<number, ReadonlySet<string>>;
  /** Por qué está cada tesela de z16: pasillo o cumbre. Para el informe. */
  readonly motivo: ReadonlyMap<string, "pasillo" | "cumbre">;
}

/**
 * El plan de una isla: la isla entera hasta z15, y z16 en los pasillos de sus
 * pistas y alrededor de sus cumbres.
 */
export function planDeLaIsla(
  isla: Isla,
  datos: {
    readonly tierra: (lat: number, lon: number) => boolean;
    readonly pistas: readonly PistaEnGrados[];
    readonly cumbres: readonly Cumbre[];
  },
): PlanDeTeselas {
  const pedidas = new Map<number, Set<string>>();
  const motivo = new Map<string, "pasillo" | "cumbre">();
  for (let z = NIVEL_PEDIDO_MIN; z <= NIVEL_MAX; z++) pedidas.set(z, new Set());

  // La isla entera, de z14 a z15.
  for (let z = NIVEL_PEDIDO_MIN; z <= NIVEL_DE_LA_ISLA; z++)
    for (const t of teselasDeLaCaja(isla.caja, z))
      if (tieneTierra(t, datos.tierra)) pedidas.get(z)!.add(llave(t));

  // Y z16 en pasillos y cumbres, solo donde la isla tiene tierra.
  const dentro = (lat: number, lon: number) =>
    lat >= isla.caja.sur && lat <= isla.caja.norte && lon >= isla.caja.oeste && lon <= isla.caja.este;
  const pistas = datos.pistas.filter((p) => dentro(p.a.lat, p.a.lon));
  const cumbres = datos.cumbres.filter((c) => dentro(c.lat, c.lon));
  const lado = metrosPorPixel((isla.caja.sur + isla.caja.norte) / 2, NIVEL_MAX) * LADO_DE_TESELA;
  for (const t of teselasDeLaCaja(isla.caja, NIVEL_MAX)) {
    const c = aGrados(t.x + 0.5, t.y + 0.5, t.z);
    // Con media diagonal de holgura: la tesela entra si la toca, no solo si
    // su centro cae dentro.
    const holgura = lado * 0.71;
    let por: "pasillo" | "cumbre" | null = null;
    if (pistas.some((p) => distanciaAlPasillo(c.lat, c.lon, p) <= ANCHO_DEL_PASILLO + holgura))
      por = "pasillo";
    else if (cumbres.some((k) => metrosEntre(c.lat, c.lon, k.lat, k.lon) <= RADIO_DE_LA_CUMBRE + holgura))
      por = "cumbre";
    if (!por || !tieneTierra(t, datos.tierra, 4)) continue;
    pedidas.get(NIVEL_MAX)!.add(llave(t));
    motivo.set(llave(t), por);
  }
  return { pedidas, motivo };
}

/**
 * Las de los niveles gruesos que salen de las de z14: todas sus madres hasta
 * `NIVEL_MIN`. Se hacen promediando —ver la cabecera—.
 */
export function madresHasta(
  teselas: Iterable<string>,
  hasta: number = NIVEL_MIN,
): Map<number, Set<string>> {
  const out = new Map<number, Set<string>>();
  for (const k of teselas) {
    let t = deLlave(k);
    while (t.z > hasta) {
      t = madre(t);
      let s = out.get(t.z);
      if (!s) out.set(t.z, (s = new Set()));
      s.add(llave(t));
    }
  }
  return out;
}

/**
 * **El índice de lo que hay**, tal y como lo escribe el extractor y lo lee el
 * juego: por nivel y por fila, los tramos de columnas que existen.
 *
 * Diez mil teselas sueltas serían diez mil nombres; por tramos, una isla
 * entera cabe en unos kilobytes. Y el juego necesita saberlo antes de pedir
 * nada: pedir una tesela que no está es una petición tirada y un 404 que el
 * trabajador de servicio no puede guardar.
 */
export type IndiceDeTeselas = Readonly<Record<string, Readonly<Record<string, readonly (readonly [number, number])[]>>>>;

export function aIndice(teselas: Iterable<Tesela>): IndiceDeTeselas {
  const filas = new Map<number, Map<number, number[]>>();
  for (const t of teselas) {
    let porFila = filas.get(t.z);
    if (!porFila) filas.set(t.z, (porFila = new Map()));
    let xs = porFila.get(t.y);
    if (!xs) porFila.set(t.y, (xs = []));
    xs.push(t.x);
  }
  const out: Record<string, Record<string, [number, number][]>> = {};
  for (const [z, porFila] of filas) {
    const nivel: Record<string, [number, number][]> = {};
    for (const [y, xs] of [...porFila].sort((a, b) => a[0] - b[0])) {
      xs.sort((a, b) => a - b);
      const tramos: [number, number][] = [];
      for (const x of xs) {
        const ultimo = tramos[tramos.length - 1];
        if (ultimo && x === ultimo[1] + 1) ultimo[1] = x;
        else if (!ultimo || x > ultimo[1]) tramos.push([x, x]);
      }
      nivel[String(y)] = tramos;
    }
    out[String(z)] = nivel;
  }
  return out;
}

/** Si el índice tiene esa tesela. */
export function enElIndice(indice: IndiceDeTeselas, t: Tesela): boolean {
  const tramos = indice[String(t.z)]?.[String(t.y)];
  if (!tramos) return false;
  for (const [a, b] of tramos) if (t.x >= a && t.x <= b) return true;
  return false;
}
