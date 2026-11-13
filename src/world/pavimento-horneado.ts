/**
 * **La rejilla del pavimento, traída hecha en los datos.** Ver el ADR 0028.
 *
 * ## Por qué
 *
 * `rejillaDelPavimento` pasa a una rejilla de dos metros cada triángulo del
 * asfalto dibujado, y lo hace al arrancar porque el avión empieza en un
 * puesto y la primera cuenta del modelo de vuelo ya pisa ese asfalto. En
 * Barajas son once millones de celdas y, con la CPU de una tablet, nueve
 * décimas del arranque. Y sale siempre igual: los mismos triángulos sobre el
 * mismo mapa de alturas dan la misma rejilla, celda a celda.
 *
 * ## Por qué con huella y no con una fecha
 *
 * La rejilla no sale de un fichero de datos, sale **del dibujo**: de cómo
 * `aerodrome.ts` tiende el asfalto sobre el relieve, que cambia cada semana,
 * y del relieve, que se aplana bajo ese asfalto. Comparar fechas o el fichero
 * del aeródromo no diría nada de eso. Así que la rejilla horneada lleva la
 * huella de lo que la hizo —los triángulos del pavimento y el mapa de alturas
 * con su paso— y el juego, antes de usarla, saca la huella de lo que tiene
 * delante. Si no coinciden, la rejilla es de otro dibujo y se hace aquí, como
 * siempre. Sacar la huella es leer los números una vez; hacer la rejilla es
 * rasterizar cada triángulo y preguntar la cota de cada celda.
 *
 * Una rejilla vieja no rompe nada: se ignora y cuesta lo que costaba. Lo que
 * dice que hay que volver a hornear es `npm run pavimento -- --comprobar`.
 *
 * ## El formato
 *
 * Cabecera de 48 bytes —firma, versión, huella, celda, esquina y tamaño— y
 * después la rejilla en carreras: cuántas celdas seguidas valen lo mismo, en
 * base 128, y ese valor en un byte. Casi toda la rejilla es hierba o asfalto
 * a la cota de su resalte, así que las carreras son largas: Barajas son once
 * megas de rejilla y 149 KB en carreras.
 *
 * Y viaja en gzip, 43 KB, como los relieves: en `data/aerodromes` van en
 * crudo y se comprimen al empaquetar —`relievesComprimidos` en
 * `vite.config.ts` comprime todo `.bin`—, porque el servidor no sabe qué es
 * un `.bin` y no lo comprime. Se abren con lo mismo que los relieves,
 * `descomprimirGzip`, que sin `DecompressionStream` tira de `desgzip`.
 */
import type { Mesh } from "three";
import type { RejillaDelPavimento } from "./mapa-del-pavimento";
import { conPlazo, PLAZO_DE_DATO } from "../datos/con-plazo";
import { descomprimirGzip } from "../navegador-viejo";

/** «OVPV» al principio del fichero, para no leer como rejilla lo que no lo es. */
const FIRMA = 0x5650564f;

/**
 * Cuándo cambia la forma de la cuenta y no los datos. Se sube a mano al tocar
 * `rejillaDelPavimento` o `sampleHeight`: va dentro de la huella, así que todo
 * lo horneado antes deja de valer de golpe. Y si se olvida, lo ve
 * `--comprobar`, que compara celda a celda con la cuenta del navegador.
 */
export const VERSION_DEL_HORNEADO = 1;

const CABECERA = 48;

/**
 * La huella de lo que hace la rejilla: los triángulos de las mallas, en su
 * orden, y lo que se le pase detrás —el mapa de alturas y su paso—. Dos
 * sumas de 32 bits por caminos distintos, en hexadecimal: para saber si algo
 * cambió basta y sobra, que esto no defiende de nadie.
 */
export function huellaDelPavimento(
  mallas: readonly Mesh[],
  suelo: readonly (ArrayBufferView | number)[],
): string {
  const h = new Suma();
  h.numero(VERSION_DEL_HORNEADO);
  h.numero(mallas.length);
  for (const malla of mallas) {
    const geo = malla.geometry;
    const pos = geo.getAttribute("position");
    const indice = geo.getIndex();
    h.numero(indice ? indice.count : -1);
    if (indice) h.vista(indice.array);
    h.numero(pos ? pos.count : -1);
    h.numero(pos ? pos.itemSize : -1);
    if (pos) h.vista(pos.array as ArrayBufferView);
  }
  for (const s of suelo) {
    if (typeof s === "number") h.numero(s);
    else h.vista(s);
  }
  return h.hex();
}

/** FNV-1a y una mezcla a lo murmur, palabra a palabra. */
class Suma {
  private a = 0x811c9dc5;
  private b = 0x9747b28c;
  private readonly f64 = new Float64Array(1);
  private readonly u32 = new Uint32Array(this.f64.buffer);

  palabra(w: number): void {
    this.a = Math.imul(this.a ^ w, 0x01000193);
    let k = Math.imul(w, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    this.b ^= Math.imul(k, 0x1b873593);
    this.b = (this.b << 13) | (this.b >>> 19);
    this.b = (Math.imul(this.b, 5) + 0xe6546b64) | 0;
  }

  /** Un número cualquiera, con todos sus bits: dos palabras. */
  numero(x: number): void {
    this.f64[0] = x;
    this.palabra(this.u32[0]!);
    this.palabra(this.u32[1]!);
  }

  /** Los bytes de un arreglo, tal cual están en memoria. */
  vista(v: ArrayBufferView): void {
    this.numero(v.byteLength);
    const enteras = v.byteOffset % 4 === 0 ? v.byteLength >>> 2 : 0;
    if (enteras) {
      const w = new Uint32Array(v.buffer, v.byteOffset, enteras);
      for (let i = 0; i < w.length; i++) this.palabra(w[i]!);
    }
    const b = new Uint8Array(v.buffer, v.byteOffset + enteras * 4, v.byteLength - enteras * 4);
    for (let i = 0; i < b.length; i++) this.palabra(b[i]!);
  }

  hex(): string {
    return (this.a >>> 0).toString(16).padStart(8, "0") + (this.b >>> 0).toString(16).padStart(8, "0");
  }
}

/** La rejilla y su huella, en bytes para el fichero. */
export function codificarRejilla(r: RejillaDelPavimento, huella: string): Uint8Array {
  const carreras: number[] = [];
  const a = r.alzado;
  for (let k = 0; k < a.length; ) {
    const v = a[k]!;
    let n = 1;
    while (k + n < a.length && a[k + n] === v) n++;
    // Cuántas, en base 128 y de la cifra baja a la alta; y el valor.
    let m = n;
    while (m >= 0x80) {
      carreras.push((m & 0x7f) | 0x80);
      m >>>= 7;
    }
    carreras.push(m, v & 0xff);
    k += n;
  }
  const salida = new Uint8Array(CABECERA + carreras.length);
  const d = new DataView(salida.buffer);
  d.setUint32(0, FIRMA, true);
  d.setUint32(4, VERSION_DEL_HORNEADO, true);
  d.setUint32(8, parseInt(huella.slice(0, 8), 16), true);
  d.setUint32(12, parseInt(huella.slice(8, 16), 16), true);
  d.setFloat64(16, r.celda, true);
  d.setFloat64(24, r.x0, true);
  d.setFloat64(32, r.z0, true);
  d.setUint32(40, r.nx, true);
  d.setUint32(44, r.nz, true);
  salida.set(carreras, CABECERA);
  return salida;
}

/** La huella que lleva un fichero, o `null` si no es una rejilla de esta versión. */
export function huellaDeLaRejilla(bytes: Uint8Array): string | null {
  if (bytes.length < CABECERA) return null;
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (d.getUint32(0, true) !== FIRMA || d.getUint32(4, true) !== VERSION_DEL_HORNEADO) return null;
  return (
    d.getUint32(8, true).toString(16).padStart(8, "0") +
    d.getUint32(12, true).toString(16).padStart(8, "0")
  );
}

/** La rejilla de un fichero, o `null` si no lo es o viene a medias. */
export function descodificarRejilla(bytes: Uint8Array): RejillaDelPavimento | null {
  if (huellaDeLaRejilla(bytes) === null) return null;
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const celda = d.getFloat64(16, true);
  const x0 = d.getFloat64(24, true);
  const z0 = d.getFloat64(32, true);
  const nx = d.getUint32(40, true);
  const nz = d.getUint32(44, true);
  const alzado = new Int8Array(nx * nz);
  let k = 0;
  let p = CABECERA;
  while (p < bytes.length) {
    let n = 0;
    let desplaza = 0;
    let b: number;
    do {
      b = bytes[p++]!;
      n += (b & 0x7f) * 2 ** desplaza;
      desplaza += 7;
    } while (b & 0x80 && p < bytes.length);
    if (p >= bytes.length || k + n > alzado.length) return null;
    const v = (bytes[p++]! << 24) >> 24;
    alzado.fill(v, k, k + n);
    k += n;
  }
  // Una rejilla a la que le faltan celdas no es la rejilla: mejor hacerla.
  return k === alzado.length ? { celda, x0, z0, nx, nz, alzado } : null;
}

const HORNEADOS = import.meta.glob("../../data/aerodromes/*.pavimento.bin", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Lo bajado, por aeródromo. Se pide antes de montar el mundo: ver `main.ts`. */
const BAJADOS = new Map<string, Uint8Array>();

/** El nombre del fichero de un aeródromo: el de su `.aero.json`, en minúsculas. */
export function ficheroDelPavimento(id: string): string {
  return `${id.toLowerCase()}.pavimento.bin`;
}

/**
 * Baja la rejilla horneada de un aeródromo, si la hay. No falla nunca: sin
 * ella, la rejilla se hace en el navegador como siempre. Ver `datos/con-plazo.ts`.
 */
export async function cargarPavimentoHorneado(id: string | null | undefined): Promise<void> {
  if (!id || BAJADOS.has(id)) return;
  const ruta = Object.entries(HORNEADOS).find(([k]) => k.endsWith(`/${ficheroDelPavimento(id)}`))?.[1];
  if (!ruta) return;
  try {
    const res = await conPlazo(fetch(ruta), PLAZO_DE_DATO, `el pavimento de ${id}`);
    if (!res?.ok) return;
    // Comprimido al empaquetar y en crudo en desarrollo: lo dice la cabecera,
    // que la nuestra empieza por «OV» y no por los `1f 8b` del gzip.
    const llegado = await res.arrayBuffer();
    const v = new Uint8Array(llegado, 0, Math.min(2, llegado.byteLength));
    const bytes = v[0] === 0x1f && v[1] === 0x8b ? await descomprimirGzip(llegado) : llegado;
    BAJADOS.set(id, new Uint8Array(bytes));
  } catch {
    // Sin el fichero se hace la cuenta: es lo que se hacía antes de tenerlo.
  }
}

/**
 * La rejilla horneada de este aeródromo **si es de este mismo dibujo**: la
 * huella del fichero tiene que ser la de lo que hay delante. Si no, `null`, y
 * quien pregunta la hace él.
 */
export function pavimentoHorneado(id: string, huella: string): RejillaDelPavimento | null {
  const bytes = BAJADOS.get(id);
  if (!bytes || huellaDeLaRejilla(bytes) !== huella) return null;
  return descodificarRejilla(bytes);
}
