/**
 * Ortofoto pública → `data/ortho/<escenario>-<encuadre>.jpg`.
 *
 * La manta que va encima del relieve, de fuentes abiertas y sin cuenta de
 * nadie. Cada escenario tiene la mejor que hay para su sitio:
 *
 *   Tenerife Norte     · PNOA del IGN de España  · hasta 25 cm/píxel · CC BY 4.0
 *   Silvio Pettirossi  · Sentinel-2 cloudless    ·       10 m/píxel  · CC BY 4.0
 *
 * Que Canarias tenga cuarenta veces más detalle que Asunción no es una
 * decisión: es que España publica ortofoto nacional y Paraguay todavía no —o
 * no de forma que se pueda alcanzar—. Diez metros por píxel es poco para
 * rodar y de sobra para volar, y el aeródromo lo pinta el juego encima.
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

/**
 * Los proveedores, cada uno con su servicio, su licencia y su límite.
 *
 * El `tope` es el nivel más allá del cual **no hay más información que pedir**:
 * en Sentinel-2 el píxel mide diez metros de verdad, así que pedir más zoom
 * solo devuelve el mismo dato ampliado. Un extractor que finge detalle es peor
 * que uno que dice cuánto hay.
 */
const PROVEEDORES = {
  pnoa: {
    fuente: 'PNOA · Instituto Geográfico Nacional de España',
    licencia: 'CC BY 4.0 · scne.es',
    servicio: 'https://www.ign.es/wmts/pnoa-ma',
    capa: 'OI.OrthoimageCoverage',
    tope: 19,
    url: (z, col, fila) =>
      'https://www.ign.es/wmts/pnoa-ma?service=WMTS&request=GetTile&version=1.0.0' +
      '&layer=OI.OrthoimageCoverage&style=default&format=image/jpeg' +
      `&tilematrixset=EPSG:3857&TileMatrix=${z}&TileRow=${fila}&TileCol=${col}`,
  },
  sentinel: {
    fuente: 'Sentinel-2 cloudless · EOX IT Services, sobre datos Copernicus/ESA',
    licencia: 'CC BY 4.0 · EOX & contribuidores, datos Copernicus Sentinel',
    servicio: 'https://tiles.maps.eox.at/wmts',
    capa: 's2cloudless-2020_3857',
    // Diez metros de píxel: a z14 ya se está pidiendo el dato entero.
    tope: 14,
    url: (z, col, fila) =>
      'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default' +
      `/GoogleMapsCompatible/${z}/${fila}/${col}.jpg`,
  },
};

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
  lejos: { zoom: 14 },
  cerca: { lado: 3000, zoom: 17 },
};

/** Qué aeródromo y qué proveedor le toca a cada escenario. */
const ESCENARIOS = {
  'tenerife-norte': { aero: 'gcxo', proveedor: 'pnoa', lado: 18000 },
  pettirossi: { aero: 'sgas', proveedor: 'sentinel', lado: 22000 },
};

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

async function teselaJpeg(prov, z, col, fila) {
  const res = await fetch(prov.url(z, col, fila));
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
  if (!id || !ESCENARIOS[id]) {
    console.error('uso: node scripts/ortofoto-publica.mjs <escenario> [--cerca]');
    console.error(`escenarios: ${Object.keys(ESCENARIOS).join(', ')}`);
    process.exit(1);
  }
  const cual = opciones.includes('--cerca') ? 'cerca' : 'lejos';
  const escenario = ESCENARIOS[id];
  const prov = PROVEEDORES[escenario.proveedor];
  const lado = cual === 'cerca' ? ENCUADRES.cerca.lado : escenario.lado;

  /*
   * **El zoom se recorta al tope del proveedor**, y se dice.
   *
   * Con Sentinel-2 la capa fina no puede ser más fina que el dato: pedir z17
   * a un satélite de diez metros devuelve el mismo píxel ampliado cuatro
   * veces. Antes que fabricar detalle que no existe, se avisa y se baja.
   */
  const pedido = ENCUADRES[cual].zoom;
  const zoom = Math.min(pedido, prov.tope);
  if (zoom !== pedido) {
    console.log(`  (z${pedido} pedido, z${zoom} es todo lo que da ${escenario.proveedor})`);
  }

  // El origen sale del propio aeródromo, que es de donde sale todo lo demás.
  const aero = JSON.parse(
    await readFile(
      join(RAIZ, 'data', 'aerodromes', `${escenario.aero}.aero.json`),
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
        await writeFile(nombre, await teselaJpeg(prov, zoom, c, f));
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
        fuente: prov.fuente,
        licencia: prov.licencia,
        servicio: prov.servicio,
        capa: prov.capa,
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
