/**
 * El relieve español, del bueno: PNOA-LiDAR del IGN.
 *
 * Los escenarios se montaban todos con **Copernicus GLO-30**, que es lo único
 * que cubre el mundo entero y por eso se queda como fondo. Pero tiene dos
 * límites que se ven volando:
 *
 * - **Treinta metros de rejilla.** Un barranco de veinte metros de ancho no
 *   existe; un acantilado se convierte en una cuesta. En una isla como La
 *   Palma eso se lleva por delante justo lo que hace que el sitio sea ese
 *   sitio.
 * - **Y es un modelo de *superficie*.** Incluye la copa de los árboles, así
 *   que un monte cerrado sale entre quince y veinticinco metros más alto de lo
 *   que está.
 *
 * España publica algo mucho mejor y gratis: el **MDT05 del PNOA-LiDAR**, cinco
 * metros de rejilla y **modelo del suelo**, sin arbolado. Seis veces más fino
 * y sin el error de la vegetación. Cubre península, Baleares y Canarias.
 *
 * ## Cómo, y por qué sin dependencias
 *
 * Por WCS —el servicio de coberturas del IDEE—, que además sabe **reescalar en
 * el servidor**: se le pide el recuadro del escenario ya en la resolución que
 * hace falta y llega un TIFF pequeño en vez de veinte megas. Es un TIFF sin
 * comprimir por bandas, y leerlo son cuarenta líneas: cabecera, etiquetas,
 * bandas y enteros de dieciséis bits. Ver AGENTS.md, regla 5.
 *
 * ## La licencia, que es la razón de poder usarlo
 *
 * Los productos del IGN son gratuitos y de libre uso **con atribución**
 * (CC BY 4.0). La atribución va en el `.json` de al lado, en `CREDITOS.md` y en
 * los créditos del juego, y no se puede quitar ni resumir.
 *
 * ## Qué hace y qué no
 *
 * Solo el **mapa fino**, el de doce o dieciocho kilómetros donde se vuela. El
 * anillo del horizonte llega a cien kilómetros y se sale de España en cuanto
 * el escenario es isleño —y ahí lo que hay es mar—, así que ese se sigue
 * sacando de Copernicus, que sí cubre el océano. Los dos ficheros conviven sin
 * enterarse uno del otro.
 *
 * Uso:
 *   npx tsx scripts/ign-a-relieve.mjs la-palma
 *   npx tsx scripts/ign-a-relieve.mjs tenerife-norte cuatro-vientos
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { SCENARIOS } from "../src/world/scenarios.ts";

/** El servicio de coberturas del IDEE. Sin clave y sin registro. */
const WCS = "https://servicios.idee.es/wcs-inspire/mdt";

/** La cobertura: MDT05, cinco metros, en coordenadas geográficas ETRS89. */
const COBERTURA = "Elevacion4258_5";

/** La atribución, que es obligatoria y literal. */
const ATRIBUCION =
  "Modelo Digital del Terreno MDT05 del PNOA-LiDAR © Instituto Geográfico " +
  "Nacional de España, CC BY 4.0";

const SALIDA = "data/terrain";

/** Radio terrestre medio, m. El mismo que usan los demás extractores. */
const R = 6371008;

/**
 * Cuántas muestras se piden por cada muestra del escenario.
 *
 * Cuatro. El escenario guarda 385 o 401 puntos por lado; pidiendo el cuádruple
 * y promediando cada bloque de cuatro por cuatro, lo que se guarda es la media
 * de dieciséis medidas del terreno y no un pinchazo suelto. Es la diferencia
 * entre «el terreno mide esto» y «el terreno medía esto justo en este punto»,
 * y se nota en las laderas.
 *
 * Más no compensa: a cuatro ya se está pidiendo por debajo de los cinco metros
 * del propio dato en los escenarios pequeños.
 */
const FINURA = 4;

// ── El TIFF que devuelve el servicio ──────────────────────────────────────

/**
 * Lee un TIFF sin comprimir por bandas y devuelve una función de muestreo.
 *
 * No es un lector de TIFF: es el trozo que hace falta para este servicio, que
 * siempre contesta lo mismo —little-endian, una banda, enteros de dieciséis
 * bits con signo, sin comprimir—. Si algún día contesta otra cosa, lo dice y
 * se para, que es mejor que devolver alturas inventadas.
 */
function leerTiff(b) {
  if (b.toString("ascii", 0, 2) !== "II" || b.readUInt16LE(2) !== 42) {
    throw new Error("no es un TIFF little-endian clásico");
  }
  const u16 = (o) => b.readUInt16LE(o);
  const u32 = (o) => b.readUInt32LE(o);
  const ifd = u32(4);
  const n = u16(ifd);
  const etiquetas = {};
  for (let i = 0; i < n; i++) {
    const o = ifd + 2 + i * 12;
    const tipo = u16(o + 2);
    const cuenta = u32(o + 4);
    const tam = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 11: 4, 12: 8 }[tipo] ?? 1;
    const p = cuenta * tam <= 4 ? o + 8 : u32(o + 8);
    const leer = (k) =>
      tipo === 3
        ? u16(p + k * 2)
        : tipo === 12
          ? b.readDoubleLE(p + k * 8)
          : u32(p + k * 4);
    etiquetas[u16(o)] = Array.from({ length: cuenta }, (_, k) => leer(k));
  }
  const uno = (t) => etiquetas[t]?.[0];

  const ancho = uno(256);
  const alto = uno(257);
  const bits = uno(258);
  const compresion = uno(259) ?? 1;
  const formato = uno(339) ?? 1;
  const filasPorBanda = uno(278) ?? alto;
  const bandas = etiquetas[273] ?? [];
  const escala = etiquetas[33550] ?? [];
  const atadura = etiquetas[33922] ?? [];

  if (compresion !== 1)
    throw new Error(`el TIFF viene comprimido (${compresion})`);
  if (bits !== 16 || formato !== 2) {
    throw new Error(
      `se esperaban enteros de 16 bits con signo, hay ${bits}/${formato}`,
    );
  }
  if (!escala.length || !atadura.length)
    throw new Error("el TIFF no dice dónde está");

  // Esquina noroeste y tamaño de píxel, en grados.
  const lon0 = atadura[3];
  const lat0 = atadura[4];
  const dLon = escala[0];
  const dLat = escala[1];

  /** La cota en un punto, con interpolación bilineal. `NaN` si cae fuera. */
  const en = (lat, lon) => {
    const px = (lon - lon0) / dLon - 0.5;
    const py = (lat0 - lat) / dLat - 0.5;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    if (x0 < 0 || y0 < 0 || x0 + 1 >= ancho || y0 + 1 >= alto) return NaN;
    const fx = px - x0;
    const fy = py - y0;
    const muestra = (x, y) => {
      const banda = Math.floor(y / filasPorBanda);
      const dentro = y - banda * filasPorBanda;
      const o = bandas[banda] + (dentro * ancho + x) * 2;
      const v = b.readInt16LE(o);
      // El mar y los huecos vienen con un número muy negativo.
      return v < -500 ? 0 : v;
    };
    const a = muestra(x0, y0) * (1 - fx) + muestra(x0 + 1, y0) * fx;
    const c = muestra(x0, y0 + 1) * (1 - fx) + muestra(x0 + 1, y0 + 1) * fx;
    return a * (1 - fy) + c * fy;
  };

  return { ancho, alto, en };
}

// ── El programa ───────────────────────────────────────────────────────────

const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!ids.length) {
  console.error("Uso: npx tsx scripts/ign-a-relieve.mjs <escenario…>");
  console.error(`Escenarios: ${SCENARIOS.map((s) => s.id).join(", ")}`);
  process.exit(1);
}

mkdirSync(SALIDA, { recursive: true });

for (const id of ids) {
  const esc = SCENARIOS.find((s) => s.id === id);
  if (!esc?.aerodrome) {
    console.error(`«${id}» no existe o no tiene aeródromo real.`);
    process.exit(1);
  }

  const { lat: lat0, lon: lon0 } = esc.aerodrome.origin;
  const res = esc.segments + 1;
  const paso = esc.size / esc.segments;
  const mitad = esc.size / 2;

  // La misma proyección que el extractor de aeródromos y que Copernicus: si
  // estas cuentas se separan, el aeropuerto queda flotando o enterrado.
  const k = Math.cos((lat0 * Math.PI) / 180);
  const aLatLon = (x, y) => [
    lat0 + (y * 180) / (R * Math.PI),
    lon0 + (x * 180) / (R * Math.PI * k),
  ];

  const [latMin, lonMin] = aLatLon(-mitad, -mitad);
  const [latMax, lonMax] = aLatLon(mitad, mitad);
  const pedidas = (res - 1) * FINURA + 1;

  console.log(`${esc.id} · ${esc.aerodrome.name}`);
  console.log(
    `  ${esc.size / 1000} km · ${res}×${res} muestras a ${paso.toFixed(0)} m · ` +
      `se piden ${pedidas}×${pedidas} al IGN (${(esc.size / (pedidas - 1)).toFixed(1)} m)`,
  );

  const url =
    `${WCS}?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage` +
    `&COVERAGEID=${COBERTURA}` +
    `&SUBSET=lat(${latMin.toFixed(6)},${latMax.toFixed(6)})` +
    `&SUBSET=long(${lonMin.toFixed(6)},${lonMax.toFixed(6)})` +
    `&FORMAT=image/tiff` +
    `&SCALESIZE=long(${pedidas}),lat(${pedidas})`;

  process.stdout.write("  pidiendo al IDEE… ");
  const res_ = await fetch(url);
  if (!res_.ok) throw new Error(`el IDEE respondió ${res_.status}`);
  const tif = Buffer.from(await res_.arrayBuffer());
  const mapa = leerTiff(tif);
  console.log(
    `ok · ${(tif.length / 1024).toFixed(0)} KB · ${mapa.ancho}×${mapa.alto}`,
  );

  /*
   * Y de lo pedido a lo que se guarda: **promediando**, no pinchando.
   *
   * Cada muestra del escenario es la media de un bloque de cuatro por cuatro
   * del mapa del IGN. Pinchar un solo punto en una ladera de treinta grados
   * puede errar quince metros según dónde caiga; la media de dieciséis no.
   */
  const alturas = new Int16Array(res * res);
  let min = Infinity;
  let max = -Infinity;
  let fuera = 0;
  for (let fila = 0; fila < res; fila++) {
    const z = -mitad + fila * paso;
    for (let col = 0; col < res; col++) {
      const x = -mitad + col * paso;
      let suma = 0;
      let cuantas = 0;
      for (let dy = 0; dy < FINURA; dy++) {
        for (let dx = 0; dx < FINURA; dx++) {
          const sx = x + ((dx - (FINURA - 1) / 2) * paso) / FINURA;
          const sz = z + ((dy - (FINURA - 1) / 2) * paso) / FINURA;
          // El mundo tiene el norte en la Z negativa; el mapa, la Y al norte.
          const [la, lo] = aLatLon(sx, -sz);
          const h = mapa.en(la, lo);
          if (Number.isFinite(h)) {
            suma += h;
            cuantas++;
          }
        }
      }
      if (!cuantas) fuera++;
      const v = Math.round(cuantas ? suma / cuantas : 0);
      alturas[fila * res + col] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (fila % 60 === 0) {
      process.stdout.write(
        `\r  muestreando… ${Math.round((fila / res) * 100)} %`,
      );
    }
  }
  console.log("\r  muestreando… 100 %          ");
  if (fuera) {
    console.log(`  ⚠ ${fuera} muestras fuera de la cobertura, puestas a cero`);
  }

  writeFileSync(`${SALIDA}/${esc.id}.bin`, Buffer.from(alturas.buffer));
  writeFileSync(
    `${SALIDA}/${esc.id}.json`,
    JSON.stringify(
      {
        id: esc.id,
        fuente: "PNOA-LiDAR MDT05 (IGN)",
        atribucion: ATRIBUCION,
        origen: { lat: lat0, lon: lon0 },
        tamanoM: esc.size,
        resolucion: res,
        minM: min,
        maxM: max,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `  cotas de ${min} a ${max} m · ${(alturas.byteLength / 1024).toFixed(0)} KB → ${SALIDA}/${esc.id}.bin`,
  );
}
