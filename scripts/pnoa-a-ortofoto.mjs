/**
 * Ortofoto pública → `data/ortho/<escenario>-<encuadre>.jpg`.
 *
 * La manta que va encima del relieve. Sale del **PNOA del IGN de España**, que
 * publica todo el país a veinticinco centímetros por píxel bajo **CC BY 4.0**
 * —lo dice el propio servicio en sus `AccessConstraints`— y no pide cuenta, ni
 * clave, ni tarjeta.
 *
 * Existe porque las teselas fotorrealistas de Google dejaron de servirse una
 * tarde con un «no disponible para tu cuenta y tu región», y con ellas se fue
 * el mundo entero. Un juego que va a estar en aulas no puede quedarse sin
 * mundo porque una cuenta ajena diga que no.
 *
 * ## Qué hace
 *
 * Pide las teselas WMTS que cubren un cuadrado alrededor del aeródromo, las
 * pega en una sola imagen y la guarda con su ficha de procedencia. Es el mismo
 * patrón que `copernicus-a-relieve.mjs` y `osm-a-aerodromo.mjs`: **el dato se
 * extrae una vez, se anota su licencia y se versiona**. Nada de pedirle nada a
 * nadie en tiempo de juego.
 *
 * ## Cómo se usa
 *
 *   node scripts/pnoa-a-ortofoto.mjs tenerife-norte
 *   node scripts/pnoa-a-ortofoto.mjs tenerife-norte --cerca
 *
 * Sin más, saca la capa ancha —el escenario entero, para verlo desde el aire—.
 * Con `--cerca`, la fina sobre el aeródromo, que es la que se mira rodando.
 *
 * Hace falta `ffmpeg` en la máquina. No es dependencia del juego: esto corre
 * una vez, aquí, y lo que se versiona es el resultado.
 *
 * ## Y lo que este extractor **no** puede hacer
 *
 * El PNOA es de España. Para Paraguay —que es de lo que va este juego— habrá
 * que buscar lo que publique el IGM y, si no hay nada abierto, caer a
 * Sentinel-2: diez metros por píxel, licencia ya anotada en el proyecto, poco
 * para rodar y de sobra para volar. Ver #141.
 */

import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/** El servicio, su capa y su licencia. Los tres van juntos a propósito. */
const SERVICIO = 'https://www.ign.es/wmts/pnoa-ma';
const CAPA = 'OI.OrthoimageCoverage';
const FUENTE = 'PNOA · Instituto Geográfico Nacional de España';
const LICENCIA = 'CC BY 4.0 · scne.es';

/** Lado de una tesela WMTS, píxeles. Es el estándar y no se negocia. */
const TESELA = 256;

/**
 * Los dos encuadres, y por qué son dos.
 *
 * El relieve ya funciona así —uno fino y otro lejano— y por el mismo motivo:
 * el detalle que hace falta rodando por la pista es absurdo a diez kilómetros,
 * y una sola imagen que sirviera para las dos cosas o pesaría veinte megas o
 * sería una acuarela.
 *
 * Los niveles salen de un presupuesto: unos tres mil píxeles de lado, que en
 * JPEG son décimas de mega y una textura que cualquier tableta traga.
 */
const ENCUADRES = {
  lejos: { lado: 18000, zoom: 14 },
  cerca: { lado: 3000, zoom: 17 },
};

/** Qué fichero de aeródromo le toca a cada escenario. */
const AERODROMO = { 'tenerife-norte': 'gcxo', pettirossi: 'sgas' };

/** De grados a la tesela que le toca en el mosaico de Web Mercator. */
function aTesela(lat, lon, z) {
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  };
}

/** Metros por píxel a esa latitud y ese nivel. Para saber qué se está pidiendo. */
const metrosPorPixel = (lat, z) =>
  (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;

async function teselaJpeg(z, col, fila) {
  const url =
    `${SERVICIO}?service=WMTS&request=GetTile&version=1.0.0` +
    `&layer=${CAPA}&style=default&format=image/jpeg` +
    `&tilematrixset=EPSG:3857&TileMatrix=${z}&TileRow=${fila}&TileCol=${col}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Lanza ffmpeg y espera. Se usa dos veces, y así no se repite el ceremonial. */
const ffmpeg = (args) =>
  new Promise((listo, falla) => {
    const p = spawn('ffmpeg', ['-v', 'error', ...args], { stdio: 'inherit' });
    p.on('close', (code) =>
      code === 0 ? listo() : falla(new Error(`ffmpeg salió con ${code}`)),
    );
  });

async function main() {
  const [id, ...opciones] = process.argv.slice(2);
  if (!id || !AERODROMO[id]) {
    console.error('uso: node scripts/pnoa-a-ortofoto.mjs <escenario> [--cerca]');
    console.error(`escenarios: ${Object.keys(AERODROMO).join(', ')}`);
    process.exit(1);
  }
  const cual = opciones.includes('--cerca') ? 'cerca' : 'lejos';
  const { lado, zoom } = ENCUADRES[cual];

  // El origen sale del propio aeródromo, que es de donde sale todo lo demás.
  const aero = JSON.parse(
    await readFile(
      join(RAIZ, 'data', 'aerodromes', `${AERODROMO[id]}.aero.json`),
      'utf8',
    ),
  );
  const { lat, lon } = aero.origin;

  const mpp = metrosPorPixel(lat, zoom);
  const centro = aTesela(lat, lon, zoom);
  const mitad = lado / mpp / 2 / TESELA;
  const col0 = Math.floor(centro.x - mitad);
  const col1 = Math.ceil(centro.x + mitad);
  const fila0 = Math.floor(centro.y - mitad);
  const fila1 = Math.ceil(centro.y + mitad);
  const columnas = col1 - col0;
  const filas = fila1 - fila0;

  console.log(`${id} · ${cual}`);
  console.log(`  ${lado} m de lado a z${zoom} → ${mpp.toFixed(2)} m/píxel`);
  console.log(`  ${columnas * filas} teselas (${columnas} × ${filas})`);

  const salida = join(RAIZ, 'data', 'ortho');
  await mkdir(salida, { recursive: true });
  const tmp = join(salida, `.tmp-${id}-${cual}`);
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });

  /*
   * **Una tesela negra de verdad, hecha por ffmpeg.**
   *
   * El PNOA no cubre el mar, así que en un aeropuerto costero como Los Rodeos
   * faltan teselas por el norte, y un hueco no puede tirar el encuadre entero.
   *
   * El primer intento llevaba un JPEG mínimo incrustado en base64 y salió mal
   * de dos maneras a la vez: medía un píxel —y el filtro `tile` exige que
   * todas midan lo mismo— y además estaba mal formado, así que el demuxer
   * abortaba la secuencia al llegar a él y el mosaico se quedaba con las
   * cuatro primeras teselas y el resto en negro. Generarla aquí es una línea y
   * no puede estar corrupta.
   */
  const negra = join(tmp, 'negra.jpg');
  await ffmpeg([
    '-f', 'lavfi', '-i', `color=c=black:s=${TESELA}x${TESELA}`,
    '-frames:v', '1', negra, '-y',
  ]);
  const NEGRA = await readFile(negra);
  await rm(negra, { force: true });

  let hechas = 0;
  let huecos = 0;
  for (let f = fila0; f < fila1; f++) {
    for (let c = col0; c < col1; c++) {
      const nombre = join(
        tmp,
        `${String(f - fila0).padStart(3, '0')}_${String(c - col0).padStart(3, '0')}.jpg`,
      );
      try {
        await writeFile(nombre, await teselaJpeg(zoom, c, f));
      } catch {
        await writeFile(nombre, NEGRA);
        huecos++;
      }
      hechas++;
      if (hechas % 40 === 0) {
        process.stdout.write(`\r  ${hechas}/${columnas * filas}`);
      }
    }
  }
  process.stdout.write(`\r  ${hechas}/${columnas * filas}, ${huecos} huecos\n`);

  const destino = join(salida, `${id}-${cual}.jpg`);
  await ffmpeg([
    '-pattern_type', 'glob', '-i', join(tmp, '*.jpg'),
    // `scale` antes de `tile`: todas tienen que medir lo mismo.
    '-filter_complex', `scale=${TESELA}:${TESELA},tile=${columnas}x${filas}`,
    '-frames:v', '1', '-q:v', '4', destino, '-y',
  ]);
  await rm(tmp, { recursive: true, force: true });

  await writeFile(
    join(salida, `${id}-${cual}.json`),
    `${JSON.stringify(
      {
        id,
        encuadre: cual,
        fuente: FUENTE,
        licencia: LICENCIA,
        servicio: SERVICIO,
        capa: CAPA,
        /*
         * La esquina del mosaico, en teselas. Hace falta porque **el centro de
         * la imagen no es el aeródromo**: es el centro del mosaico, que cae
         * donde caen las teselas enteras. Quien la use tiene que saber dónde
         * empieza, no dónde estaba el avión.
         */
        esquina: { col: col0, fila: fila0 },
        origen: { lat, lon },
        tamanoM: lado,
        zoom,
        metrosPorPixel: Number(mpp.toFixed(3)),
        pixeles: { ancho: columnas * TESELA, alto: filas * TESELA },
        huecos,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`  ${destino.replace(`${RAIZ}/`, '')}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
