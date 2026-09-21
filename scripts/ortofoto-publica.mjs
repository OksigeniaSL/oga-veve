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
import { SCENARIOS, vecesLejosDe } from '../src/world/scenarios.ts';

/**
 * Cuántas veces más ancho es el mapa lejano de este escenario.
 *
 * Sale de la misma tabla que usan el terreno y el extractor de relieve, porque
 * si aquí se usara otro número la foto del horizonte se dibujaría a una escala
 * distinta de la del relieve que cubre. Ver `vecesLejosDe`.
 */
function ladoDelHorizonte(id) {
  const esc = SCENARIOS.find((e) => e.id === id);
  if (!esc) throw new Error(`${id} no está en SCENARIOS`);
  /*
   * **Y el lado sale del `size` del escenario, no del de la ortofoto fina.**
   *
   * La tabla de aquí abajo dice 18.000 para los campos canarios, que es lo que
   * cubre su foto de dieciocho kilómetros — pero el mapa lejano se dibuja sobre
   * `size`, que en casi todos es 16.000. Con el número equivocado la foto
   * cubriría 144 km donde el terreno mide 128 y el paisaje saldría desplazado
   * un ocho por ciento: bastante para que la costa no caiga en la costa.
   */
  return esc.size * vecesLejosDe(esc);
}

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
    /*
     * **La tanda de 2025, no la de 2020.**
     *
     * EOX publica una capa por año y se estaba pidiendo la de hace cinco. La
     * resolución es la misma —diez metros es el dato de Sentinel-2 y no hay
     * más— pero la imagen es otra: Asunción y Ciudad del Este han crecido en
     * cinco años, y el compuesto sin nubes de cada año se hace con más pasadas
     * que el anterior.
     *
     * Cambiar de año cuesta una palabra y no cuesta licencia: es la misma
     * fuente y la misma atribución.
     */
    capa: 's2cloudless-2025_3857',
    // Diez metros de píxel: a z14 ya se está pidiendo el dato entero.
    tope: 14,
    url: (z, col, fila) =>
      'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default' +
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
 *
 * **Y el encuadre fino tiene que caber el aeródromo entero.** El primero eran
 * tres kilómetros a un metro por píxel, muy nítido y demasiado pequeño: la
 * pista de Tenerife Norte mide tres mil cuatrocientos metros, así que la foto
 * fina se acababa antes que la propia pista y las dos cabeceras quedaban
 * fuera. Seis kilómetros a dos metros por píxel cogen la pista, sus dos
 * aproximaciones y el circuito, con los mismos tres mil píxeles de lado. Se
 * pierde nitidez y se gana que la lección entera pase sobre la foto buena.
 *
 * La pintura de la pista no se pierde por bajar a dos metros: la dibuja el
 * juego encima con su geometría, no sale de la fotografía.
 */
/**
 * Lo más ancho que cubre el horizonte a su zoom de siempre, m.
 *
 * Ciento sesenta kilómetros a sesenta y siete metros por píxel son dos mil
 * cuatrocientos de lado, que es una imagen de ciento cincuenta kilobytes. Por
 * encima de eso se baja un nivel de zoom por cada duplicación: la foto sigue
 * siendo más fina que el relieve que viste, que es lo único que tiene que
 * cumplir. Ver dónde se elige el zoom.
 */
const LO_MAS_ANCHO = 160000;

const ENCUADRES = {
  lejos: { zoom: 14 },
  cerca: { lado: 6000, zoom: 16 },
  /*
   * **Y la de en medio, que era el agujero grande.**
   *
   * Había tres capas y un salto enorme entre la segunda y la tercera: la
   * ancha cubre el escenario —dieciocho kilómetros— a ocho metros por píxel,
   * y a partir de ahí manda la del horizonte, que en un mundo de
   * trescientos veinticuatro kilómetros va a **ciento treinta y cuatro**.
   *
   * Tenerife mide ochenta kilómetros. O sea que en cuanto te alejas nueve de
   * Los Rodeos —enseguida— todo lo que mirás está en la de 134, y eso desde
   * seis mil pies es barro. Contado jugando, y llevaba semanas dicho de
   * muchas maneras: «las ortofotos de Tenerife, fatal», «¿dónde están los
   * paisajes?», «¿de qué me sirven unos triángulos o paisajes sin nada en un
   * juego donde quiero contar historia, enseñar, que descubran, que vean
   * ríos, bosques, ciudades?».
   *
   * Cincuenta y cuatro kilómetros a diecisiete metros por píxel: la isla
   * entera, **ocho veces más fina** que lo que había, en tres mil doscientos
   * píxeles de lado. Es la franja donde de verdad se vuela.
   *
   * Y cincuenta y cuatro y no más porque es lo que cabe en el presupuesto de
   * píxeles de esta casa —unos tres mil de lado— sin bajar otro nivel de
   * zoom y volver a donde estábamos.
   */
  medio: { lado: 54000, zoom: 13 },
  /*
   * **Y el horizonte: el mapa lejano entero, a zoom de mapa de pared.**
   *
   * Sin esto, donde acaba la ortofoto de dieciocho kilómetros empieza una
   * llanura de color plano. Contado jugando, y dos veces: «el paisaje es de
   * estilo Minecraft, no se extiende el mapa realista en todo el trayecto» y
   * «aparte de lo mal que se ve la topografía…».
   *
   * Zoom once son unos setenta y seis metros por píxel. Suena poco y es de
   * sobra: la geometría de ese mapa va a trescientos veinte metros por
   * muestra, o sea que la foto es **cuatro veces más fina que el relieve que
   * viste**. Pedir más sería pagar megabytes por detalle que no se puede
   * apoyar en ninguna forma.
   *
   * El lado no es fijo: es el del mapa lejano de cada escenario, que desde que
   * hay rutas ya no es el mismo para todos. Ver `vecesLejosDe`.
   */
  horizonte: { zoom: 11 },
};

/**
 * Qué aeródromo y qué proveedor le toca a cada escenario.
 *
 * **Estaban dos de dieciséis**, y eso era todo el problema del paisaje. Se dijo
 * jugando: «no me gusta volar sobre Maincraft… casi todos los aeropuertos están
 * sin paisaje realista, encima tú le metes edificios inventados». Y era exacto:
 * catorce escenarios volaban sobre relieve pelado con las casas del sorteo
 * encima, que es lo peor de los dos mundos.
 *
 * No era un problema de licencias ni de diseño — el guion estaba escrito y
 * probado. Eran catorce descargas que nadie había lanzado.
 *
 * Y la mitad salen a veinticinco centímetros por píxel: PNOA cubre **toda**
 * España, Canarias incluida, así que los ocho campos españoles pueden tener la
 * misma foto que Los Rodeos. Los paraguayos se quedan en los diez metros de
 * Sentinel-2, y no es decisión nuestra: España publica ortofoto nacional y
 * Paraguay todavía no de forma alcanzable.
 */
const ESCENARIOS = {
  // España — PNOA del IGN, hasta 25 cm/píxel.
  'tenerife-norte': { aero: 'gcxo', proveedor: 'pnoa', lado: 18000 },
  'tenerife-sur': { aero: 'gcts', proveedor: 'pnoa', lado: 18000 },
  'la-palma': { aero: 'gcla', proveedor: 'pnoa', lado: 18000 },
  'gran-canaria': { aero: 'gclp', proveedor: 'pnoa', lado: 18000 },
  'el-hierro': { aero: 'gchi', proveedor: 'pnoa', lado: 18000 },
  'la-gomera': { aero: 'gcgm', proveedor: 'pnoa', lado: 18000 },
  lanzarote: { aero: 'gcrr', proveedor: 'pnoa', lado: 18000 },
  fuerteventura: { aero: 'gcfv', proveedor: 'pnoa', lado: 18000 },
  'cuatro-vientos': { aero: 'lecu', proveedor: 'pnoa', lado: 18000 },
  // Paraguay — Sentinel-2 cloudless, 10 m/píxel. Es lo que hay y es real.
  pettirossi: { aero: 'sgas', proveedor: 'sentinel', lado: 22000 },
  guarani: { aero: 'sges', proveedor: 'sentinel', lado: 22000 },
  encarnacion: { aero: 'sgen', proveedor: 'sentinel', lado: 22000 },
  estigarribia: { aero: 'sgme', proveedor: 'sentinel', lado: 22000 },
  'pedro-juan': { aero: 'sgpj', proveedor: 'sentinel', lado: 22000 },
  'yvytu-rape': { aero: 'yvytu', proveedor: 'sentinel', lado: 22000 },
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
    console.error(
      'uso: node scripts/ortofoto-publica.mjs <escenario> [--cerca|--medio|--horizonte]' +
      ' [--zoom N] [--lado M] [--a carpeta]',
    );
    console.error(`escenarios: ${Object.keys(ESCENARIOS).join(', ')}`);
    process.exit(1);
  }
  /*
   * **Y a dónde va, que no siempre es a `data/ortho`.**
   *
   * Probar otro encuadre —más zoom, menos lado— exigía sobrescribir el
   * fichero bueno y bajarlo otra vez si no convencía, con lo que probar
   * costaba dos descargas y un susto. Con `--a <carpeta>` se deja en otro
   * sitio y se comparan los dos al lado.
   */
  const donde = opciones.indexOf('--a');
  const carpeta =
    donde >= 0 && opciones[donde + 1]
      ? opciones[donde + 1]
      : join(RAIZ, 'data', 'ortho');
  /*
   * Y el zoom, también a mano: `--zoom 17` sobre el mismo encuadre es
   * exactamente la pregunta «¿cuánto se gana con el doble de nitidez?», y sin
   * poder hacerla no se puede contestar con un número.
   */
  const pideZoom = opciones.indexOf('--zoom');
  const zoomAMano =
    pideZoom >= 0 && Number.isFinite(Number(opciones[pideZoom + 1]))
      ? Number(opciones[pideZoom + 1])
      : null;
  const pideLado = opciones.indexOf('--lado');
  const ladoAMano =
    pideLado >= 0 && Number.isFinite(Number(opciones[pideLado + 1]))
      ? Number(opciones[pideLado + 1])
      : null;

  const cual = opciones.includes('--cerca')
    ? 'cerca'
    : opciones.includes('--horizonte')
      ? 'horizonte'
      : opciones.includes('--medio')
        ? 'medio'
        : 'lejos';
  const escenario = ESCENARIOS[id];
  const prov = PROVEEDORES[escenario.proveedor];
  const lado =
    ladoAMano ??
    (cual === 'cerca'
      ? ENCUADRES.cerca.lado
      : cual === 'medio'
        ? // Sin pasarse del mundo que hay: en un escenario sin vecinos el
          // mapa lejano puede ser más pequeño que estos cincuenta y cuatro.
          Math.min(ENCUADRES.medio.lado, ladoDelHorizonte(id))
        : cual === 'horizonte'
          ? ladoDelHorizonte(id)
          : escenario.lado);

  /*
   * **El zoom se recorta al tope del proveedor**, y se dice.
   *
   * Con Sentinel-2 la capa fina no puede ser más fina que el dato: pedir z17
   * a un satélite de diez metros devuelve el mismo píxel ampliado cuatro
   * veces. Antes que fabricar detalle que no existe, se avisa y se baja.
   */
  /*
   * **Y el zoom del horizonte baja si el mundo es muy ancho.**
   *
   * El z11 se eligió para anillos de ciento veinte kilómetros: sesenta y
   * siete metros por píxel dan una imagen de dos mil y pico, que son ciento
   * cincuenta kilobytes. Con los trescientos veinticuatro que pide Los Rodeos
   * para alcanzar La Palma y El Hierro, ese mismo zoom da **cuatro mil
   * ochocientos píxeles de lado** y varios megabytes: una foto de pared para
   * mirarla desde cincuenta kilómetros.
   *
   * Y no hace falta. Lo que tiene que cumplir esta foto es ser más fina que
   * el relieve que viste, no más fina que la vista: con el mapa lejano a
   * trescientos dieciséis metros por muestra, ciento treinta y cuatro por
   * píxel siguen siendo el doble de detalle del que se puede apoyar en una
   * forma.
   */
  const pedido = zoomAMano ?? ENCUADRES[cual].zoom;
  const deMas =
    cual === 'horizonte'
      // Redondeo y no techo: 324 km son 2,02 veces el tope, y un techo baja
      // dos niveles enteros por ese dos por ciento de más — de 67 metros por
      // píxel a 269, que ya no es más fino que el relieve.
      ? Math.max(0, Math.round(Math.log2(lado / LO_MAS_ANCHO)))
      : 0;
  const zoom = Math.min(pedido - deMas, prov.tope);
  if (deMas > 0)
    console.log(
      `  (${Math.round(lado / 1000)} km no caben a z${pedido}: se baja a z${zoom})`,
    );
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

  const salida = carpeta;
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
