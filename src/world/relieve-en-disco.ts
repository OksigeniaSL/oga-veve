/**
 * **El relieve de verdad, leído del disco. Solo para las pruebas.**
 *
 * Los mismos ficheros que carga el juego —`data/terrain/<id>.bin`, el fino de
 * cada campo, y `<id>-lejos.bin`, el del horizonte—, leídos con el `fs` de
 * Node y sin escena. Es lo que permite probar la línea de vista contra la
 * Dorsal de Tenerife sin abrir un navegador. El juego no lo importa nunca: allí
 * el relieve lo da `Terrain.cotaConocida`.
 *
 * La lectura es la de `rutas-de-canarias.test.ts`, que la lleva dentro desde
 * antes; aquí está suelta para poder usarla con cualquier grupo de campos.
 */

import { type Sitio } from "./entre-aerodromos";

/*
 * El `fs` de Node pedido en marcha, como en `circuito-terreno.test.ts`: así no
 * hay que meter sus tipos en el `tsconfig`.
 */
const fs = () =>
  (
    globalThis as unknown as {
      process: { getBuiltinModule(nombre: string): unknown };
    }
  ).process.getBuiltinModule("node:fs") as {
    readFileSync(ruta: string, codificacion?: string): Uint8Array | string;
    existsSync(ruta: string): boolean;
  };

/** Radio terrestre, m: el de los extractores y el de `entre-aerodromos.ts`. */
const R = 6371008;
const RAD = Math.PI / 180;

interface Mapa {
  readonly lat0: number;
  readonly lon0: number;
  readonly mitad: number;
  readonly paso: number;
  readonly lado: number;
  readonly datos: Int16Array;
}

function mapa(id: string): Mapa | null {
  const base = `data/terrain/${id}`;
  if (!fs().existsSync(`${base}.bin`) || !fs().existsSync(`${base}.json`)) return null;
  const ficha = JSON.parse(fs().readFileSync(`${base}.json`, "utf8") as string) as {
    origen: { lat: number; lon: number };
    tamanoM: number;
  };
  const b = fs().readFileSync(`${base}.bin`) as Uint8Array;
  const datos = new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const lado = Math.round(Math.sqrt(datos.length));
  return {
    lat0: ficha.origen.lat,
    lon0: ficha.origen.lon,
    mitad: ficha.tamanoM / 2,
    paso: ficha.tamanoM / (lado - 1),
    lado,
    datos,
  };
}

/** La cota de un mapa en un punto, interpolada como `Terrain`, o `null` fuera. */
function cotaEn(m: Mapa, lat: number, lon: number): number | null {
  const x = (lon - m.lon0) * RAD * R * Math.cos(m.lat0 * RAD);
  const z = -(lat - m.lat0) * RAD * R;
  if (Math.abs(x) > m.mitad || Math.abs(z) > m.mitad) return null;
  const gx = (x + m.mitad) / m.paso;
  const gz = (z + m.mitad) / m.paso;
  const max = m.lado - 1;
  const x0 = Math.min(max, Math.floor(gx));
  const z0 = Math.min(max, Math.floor(gz));
  const x1 = Math.min(max, x0 + 1);
  const z1 = Math.min(max, z0 + 1);
  const tx = gx - x0;
  const tz = gz - z0;
  const h = (c: number, f: number) => m.datos[f * m.lado + c] ?? 0;
  return (
    (h(x0, z0) * (1 - tx) + h(x1, z0) * tx) * (1 - tz) +
    (h(x0, z1) * (1 - tx) + h(x1, z1) * tx) * tz
  );
}

/**
 * El relieve de estos campos en el mundo cuyo origen es `origen`: primero los
 * mapas finos, que contestan con más detalle, y luego los del horizonte.
 */
export function relieveDe(
  ids: readonly string[],
  origen: Sitio,
): (x: number, z: number) => number | null {
  const finos = ids.map((id) => mapa(id)).filter((m): m is Mapa => m !== null);
  const lejanos = ids
    .map((id) => mapa(`${id}-lejos`))
    .filter((m): m is Mapa => m !== null);
  return (x, z) => {
    // La inversa de `dondeCae`, con el coseno de la latitud media.
    const lat = origen.lat - z / (R * RAD);
    const lon = origen.lon + x / (R * RAD * Math.cos(((origen.lat + lat) / 2) * RAD));
    for (const m of finos) {
      const c = cotaEn(m, lat, lon);
      if (c !== null) return c;
    }
    for (const m of lejanos) {
      const c = cotaEn(m, lat, lon);
      if (c !== null) return c;
    }
    return null;
  };
}
