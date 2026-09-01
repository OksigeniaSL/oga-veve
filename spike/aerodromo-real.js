/**
 * Nuestro aeropuerto encima del mundo de verdad.
 *
 * Es la prueba que decide si esto funciona. Todo lo anterior era mirar fotos
 * bonitas; aquí hay que hacer coincidir dos asfaltos que vienen de sitios
 * distintos y no se conocen.
 *
 *     npx vite --port 5173
 *     → /spike/aerodromo-real.html?sitio=gcxo
 *
 * ## Se mueven las teselas, no el aeropuerto
 *
 * Las teselas de Google vienen en coordenadas de la Tierra —centro del planeta
 * en el origen— y el juego entero vive en metros locales con el aeródromo en el
 * cero y el norte en la Z negativa. Se podría llevar el juego al sistema de
 * Google, y eso obligaría a tocar el modelo de vuelo, la cámara, el plan, el
 * HUD y las catorce fases. O se puede llevar Google al sistema del juego, que
 * es **una matriz**, y no tocar nada más.
 *
 * El error de aplanar la Tierra en el trozo que ocupa un aeropuerto es de
 * veinte centímetros en las puntas de una pista de tres kilómetros. Menos que
 * el margen con el que ya se pintan las marcas.
 *
 * ## Y la altura se mide, no se calcula
 *
 * Nuestras cotas salen de Copernicus, que las da sobre el geoide; Google las da
 * sobre el elipsoide. Entre uno y otro hay doce metros en Asunción y cuarenta y
 * cinco en Tenerife — suficiente para dejar la pista flotando o enterrada. En
 * vez de pelearse con los datums, se lanza un rayo hacia abajo sobre el punto
 * de referencia del aeródromo y se pregunta al mundo a qué altura está. Eso
 * funciona con cualquier dato de partida y es lo que habría que hacer de todos
 * modos.
 */

import {
  ACESFilmicToneMapping,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Matrix4,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { TilesRenderer, WGS84_ELLIPSOID } from '3d-tiles-renderer';
import { GoogleCloudAuthPlugin } from '3d-tiles-renderer/core/plugins';
import { createAerodrome } from '../src/world/aerodrome';
import { crearCiudad } from '../src/world/ciudad';

const AERODROMOS = {
  gcxo: { fichero: 'gcxo', cabecera: '30' },
  sgas: { fichero: 'sgas', cabecera: '20' },
};

const q = new URLSearchParams(location.search);
const cual = AERODROMOS[q.get('sitio') ?? 'gcxo'] ?? AERODROMOS.gcxo;
const clave = import.meta.env.VITE_GOOGLE_TILES;
const estado = document.getElementById('estado');
const credito = document.getElementById('credito');

const aero = (await import(`../data/aerodromes/${cual.fichero}.aero.json`)).default;

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const escena = new Scene();
const sol = new DirectionalLight(0xfff0dd, 2.2);
sol.position.set(-1, 0.6, -0.4);
escena.add(sol);
escena.add(new HemisphereLight(0xbcd6ea, 0x6b6350, 1.1));

const camara = new PerspectiveCamera(62, innerWidth / innerHeight, 1, 220000);
escena.add(camara);

// ── El mundo, traído a nuestras coordenadas ─────────────────────────────

const { lat, lon } = aero.origin;
const la = MathUtils.degToRad(lat);
const lo = MathUtils.degToRad(lon);

const origen = new Vector3();
WGS84_ELLIPSOID.getCartographicToPosition(la, lo, 0, origen);

// Los tres ejes locales en coordenadas de la Tierra.
const arriba = new Vector3(Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la));
const este = new Vector3(-Math.sin(lo), Math.cos(lo), 0);
const norte = new Vector3().crossVectors(arriba, este).normalize();
// En el juego el norte es la Z **negativa**, así que la Z local es el sur.
const sur = norte.clone().negate();

const localATierra = new Matrix4().makeBasis(este, arriba, sur).setPosition(origen);
const tierraALocal = localATierra.clone().invert();

const teselas = new TilesRenderer();
teselas.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: clave }));
teselas.setCamera(camara);
teselas.setResolutionFromRenderer(camara, renderer);
teselas.group.matrixAutoUpdate = false;
teselas.group.matrix.copy(tierraALocal);
teselas.group.matrixWorldNeedsUpdate = true;
escena.add(teselas.group);

// ── Nuestro aeropuerto ──────────────────────────────────────────────────

const nuestro = new Group();
nuestro.name = 'nuestro-aerodromo';
escena.add(nuestro);
nuestro.add(createAerodrome(aero, 0, { de: null, kt: 0 }, cual.cabecera));

/*
 * **`?tinte=1` pinta lo nuestro de magenta**, y no es un capricho.
 *
 * La primera captura buena de Tenerife enseñaba el eje discontinuo perfectamente
 * pegado al asfalto… y no había forma de saber si eran nuestras marcas o las que
 * ya están pintadas en la foto de Google. Una prueba que no distingue lo que
 * mide no ha probado nada. Con un color que no existe en la naturaleza, la
 * pregunta se contesta de un vistazo.
 */
if (q.get('tinte') === '1') {
  nuestro.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    const uno = (x) => {
      x.color?.setHex(0xff00c8);
      x.vertexColors = false;
      x.needsUpdate = true;
    };
    Array.isArray(m) ? m.forEach(uno) : uno(m);
  });
}

/**
 * Pregunta al mundo a qué altura está el suelo bajo un punto local.
 *
 * Un rayo desde muy arriba hacia abajo. Devuelve `null` mientras las teselas de
 * esa zona no hayan llegado, que al principio es siempre.
 */
let asentado = false;
let cotaMedida = null;
let anterior = null;
let ciudadPuesta = false;

/**
 * Los puntos donde se mide el suelo: **sobre la pista, y varios**.
 *
 * El primer intento medía en el punto de referencia del aeródromo, que es el
 * (0,0) de todas nuestras coordenadas. Y un punto de referencia no está en la
 * pista: en Tenerife Norte cae junto a la terminal, así que el rayo le medía el
 * tejado y el aeropuerto entero salía ochenta metros en el aire.
 *
 * Sobre la pista no hay edificios por definición. Se toman siete catas
 * repartidas y se usa la **mediana**, que aguanta que una o dos caigan en un
 * avión aparcado o en una tesela a medio cargar sin que se note.
 */
function puntosDeCata() {
  const pista = aero.runways[0];
  const u = Object.values(pista.thresholds).filter((t) => t?.xy);
  if (u.length < 2) return [[0, 0]];
  const [a, b] = u;
  return [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].map((t) => {
    const s = 0.5 + t;
    return [a.xy[0] + (b.xy[0] - a.xy[0]) * s, -(a.xy[1] + (b.xy[1] - a.xy[1]) * s)];
  });
}
const CATAS = puntosDeCata();

/**
 * Lo que dice **nuestro** fichero en esos mismos puntos.
 *
 * Aquí se cayó el intento anterior. `createAerodrome` no construye una pista a
 * la altura cero: la construye con las cotas absolutas de los umbrales, 628,5 y
 * 611,7 en Tenerife. Sumarle encima la cota que dice Google dejaba el asfalto a
 * mil doscientos setenta y ocho metros — seiscientos en el aire y fuera de
 * cuadro, que es por lo que no se veía ni un píxel magenta.
 *
 * Lo que hay que aplicar no es la cota del mundo: es **la diferencia entre los
 * dos**, que es justamente lo único que separa un datum del otro.
 */
function cotaDelFicheroEnLaPista() {
  const pista = aero.runways[0];
  const u = Object.values(pista.thresholds).filter((t) => t?.xy);
  if (u.length < 2) return COTA_DEL_FICHERO;
  const [a, b] = u;
  const alturas = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].map((t) => {
    const s = 0.5 + t;
    return (a.elevM ?? COTA_DEL_FICHERO) + ((b.elevM ?? COTA_DEL_FICHERO) - (a.elevM ?? COTA_DEL_FICHERO)) * s;
  });
  alturas.sort((p, q) => p - q);
  return alturas[Math.floor(alturas.length / 2)];
}

/** La mediana de las catas plausibles, o `null` si aún no hay suficientes. */
function cotaDeLaPista() {
  const valores = CATAS.map(([x, z]) => cotaDelMundo(x, z)).filter(
    (c) => c !== null && Math.abs(c - COTA_DEL_FICHERO) < MARGEN_PLAUSIBLE,
  );
  if (valores.length < 4) return null;
  valores.sort((p, q) => p - q);
  return valores[Math.floor(valores.length / 2)];
}

const rayo = new Raycaster();
rayo.firstHitOnly = true;
function cotaDelMundo(x, z) {
  rayo.set(new Vector3(x, 9000, z), new Vector3(0, -1, 0));
  const golpes = rayo.intersectObject(teselas.group, true);
  return golpes.length ? golpes[0].point.y : null;
}

/**
 * La cota que dice el fichero, que sirve de dos cosas.
 *
 * De punto de partida para la cámara —y eso no es cosmético: **el cargador de
 * teselas elige el detalle según dónde está la cámara**, así que si la cámara
 * arranca en un sitio absurdo no pide nunca las teselas buenas y no hay forma
 * de medir nada. Es un pez que se muerde la cola, y así se cayó el primer
 * intento: la cámara acabó treinta y cuatro kilómetros bajo tierra mirando el
 * océano desde abajo.
 *
 * Y de criba. El rayo hacia abajo, mientras solo hay teselas bastas, golpea
 * triángulos que cubren medio Atlántico y devuelve cotas de decenas de
 * kilómetros. Lo que se está midiendo es la diferencia de datum entre
 * Copernicus y Google, que en el peor sitio del mundo son ciento diez metros:
 * cualquier cosa a más de cuatrocientos no es el suelo, es una tesela sin
 * terminar de cargar.
 */
const COTA_DEL_FICHERO = aero.elevationM ?? 0;
const MARGEN_PLAUSIBLE = 400;

const camaraEn = (x, y, z, haciaX, haciaY, haciaZ) => {
  camara.position.set(x, y, z);
  camara.up.set(0, 1, 0);
  camara.lookAt(haciaX, haciaY, haciaZ);
};

// Vista por defecto: aproximación a la cabecera en uso.
const vista = q.get('vista') ?? 'aproximacion';
const altura = Number(q.get('alt') ?? 260);

/** Cuántas casas propias se han levantado. Solo para el rótulo. */
let cuantasCasas = 0;

/**
 * Los edificios de Asunción, encima del suelo de verdad.
 *
 * Google no tiene fotogrametría allí: a ciento ochenta metros da veintinueve mil
 * triángulos contra los trescientos diecinueve mil de Madrid. Lo que hay es una
 * alfombra fotográfica pegada al relieve —el río, la bahía, las calles y el
 * aeropuerto, todo real y todo plano—.
 *
 * La pieza que falta ya existía por casualidad: la rejilla de ciudad de
 * `data/cities/`, noventa y seis por noventa y seis celdas de uso del suelo y
 * densidad sacadas de OpenStreetMap. **Google pone el suelo verdadero y nosotros
 * el volumen.** Se construyó por otro motivo y encaja aquí.
 *
 * ## Cuarenta mil rayos no, gracias
 *
 * Cada casa necesita saber a qué altura está su trozo de suelo, y son cuarenta
 * mil casas. Lanzar un rayo por cada una contra un cuarto de millón de
 * triángulos congela el navegador varios segundos.
 *
 * Así que se lanza una **rejilla gruesa** —sesenta y cuatro por sesenta y
 * cuatro, cuatro mil rayos— y se interpola entre sus cuatro esquinas. Un
 * edificio mal puesto por medio metro no lo nota nadie desde el aire; cuatro mil
 * rayos tardan medio segundo.
 */
async function levantarCiudad() {
  const { cargarCiudad } = await import('../src/world/ciudades');
  const ciudad = await cargarCiudad(q.get('sitio') === 'sgas' ? 'pettirossi' : 'tenerife-norte');
  if (!ciudad) return;

  const REJILLA = 64;
  const lado = ciudad.tamanoM;
  const paso = lado / (REJILLA - 1);
  const cotas = new Float32Array(REJILLA * REJILLA);
  const base = cotaMedida ?? COTA_DEL_FICHERO;

  for (let f = 0; f < REJILLA; f++) {
    for (let c = 0; c < REJILLA; c++) {
      const x = -lado / 2 + c * paso;
      const z = -lado / 2 + f * paso;
      const golpe = cotaDelMundo(x, z);
      // Donde el rayo no llega —tesela sin cargar, o fuera del mundo— se usa la
      // del aeródromo. Es mejor una casa a la altura equivocada que un agujero.
      cotas[f * REJILLA + c] =
        golpe !== null && Math.abs(golpe - base) < 900 ? golpe : base;
    }
  }

  /** La cota interpolada entre las cuatro esquinas de su celda. */
  const cotaDeLaRejilla = (x, z) => {
    const fx = Math.max(0, Math.min(REJILLA - 1.001, (x + lado / 2) / paso));
    const fz = Math.max(0, Math.min(REJILLA - 1.001, (z + lado / 2) / paso));
    const c0 = Math.floor(fx);
    const f0 = Math.floor(fz);
    const tx = fx - c0;
    const tz = fz - f0;
    const v = (f, c) => cotas[f * REJILLA + c];
    const a = v(f0, c0) * (1 - tx) + v(f0, c0 + 1) * tx;
    const b = v(f0 + 1, c0) * (1 - tx) + v(f0 + 1, c0 + 1) * tx;
    return a * (1 - tz) + b * tz;
  };

  const { zonaDeAeropuerto } = await import('../src/world/vegetation');
  const { SCENARIOS } = await import('../src/world/scenarios');
  const esc = SCENARIOS.find((e) => e.aerodrome?.id === aero.id);
  const dentro = esc ? zonaDeAeropuerto(esc, 200) : () => false;

  const grupo = crearCiudad(ciudad, cotaDeLaRejilla, dentro, -9999);
  grupo.name = 'ciudad-real';
  escena.add(grupo);
  cuantasCasas = grupo.children.reduce((n, m) => n + (m.count ?? 0), 0);
}

let fps = 0;
let cuadros = 0;
let desde = performance.now();

function bucle() {
  requestAnimationFrame(bucle);

  camara.updateMatrixWorld();
  teselas.update();

  /*
   * **El aeropuerto se posa una sola vez, cuando el mundo ya está debajo.**
   *
   * Antes de que lleguen las teselas el rayo no golpea nada y la cota sale
   * nula; si se colocara con un valor por defecto, el asfalto aparecería
   * flotando y luego daría un salto. Se espera.
   */
  /*
   * **Se espera a que el mundo termine de cargar.**
   *
   * El rayo mide contra las teselas que hay en ese instante, y las de detalle
   * medio están hasta cuarenta metros por encima de las finas. Midiendo a la
   * primera, el aeropuerto se posaba sobre un mundo provisional y se quedaba
   * flotando cuarenta y cuatro metros sobre el de verdad — fuera de cuadro, sin
   * un solo píxel en pantalla.
   *
   * Así que se mide cuando el cargador se calla —nada descargándose, nada
   * analizándose— y aun así se exige que dos medidas seguidas coincidan en
   * menos de un metro. Una tesela que llegue tarde no vale para posar un
   * aeropuerto.
   */
  const cargando = teselas.stats ?? {};
  const quieto = (cargando.downloading ?? 1) === 0 && (cargando.parsing ?? 1) === 0;
  if (!asentado && quieto) {
    const cota = cotaDeLaPista();
    if (cota !== null && anterior !== null && Math.abs(cota - anterior) < 1) {
      cotaMedida = cota;
      // Dos centímetros por encima del suelo de la foto: lo justo para que
      // nuestro asfalto gane y no se peleen por el fondo de profundidad.
      // La diferencia de datum, y dos centímetros para ganar el sorteo del
      // fondo de profundidad contra el asfalto de la foto.
      nuestro.position.y = cota - cotaDelFicheroEnLaPista() + 0.02;
      asentado = true;
    }
    anterior = cota;
  }

  // Y la ciudad, una vez posado el aeropuerto.
  if (asentado && !ciudadPuesta && q.get('ciudad') !== '0') {
    ciudadPuesta = true;
    void levantarCiudad();
  }

  colocarCamara();
  renderer.render(escena, camara);

  cuadros++;
  const ahora = performance.now();
  if (ahora - desde > 500) {
    fps = Math.round((cuadros * 1000) / (ahora - desde));
    cuadros = 0;
    desde = ahora;
  }

  const s = teselas.stats ?? {};
  estado.textContent =
    `${aero.name ?? aero.id}\n` +
    `${fps} fps · teselas ${s.visible ?? '?'} de ${s.active ?? '?'}\n` +
    `cota del mundo bajo la ARP: ${cotaMedida === null ? 'esperando teselas…' : cotaMedida.toFixed(1) + ' m'}\n` +
    `el fichero dice: ${aero.elevationM ?? '?'} m\n` +
    `vista: ${vista}\n` +
    `edificios propios: ${cuantasCasas || '—'}`;

  const attr = teselas.getAttributions?.() ?? [];
  credito.textContent = attr.map((a) => a.value).join(' · ');
}

function colocarCamara() {
  const pista = aero.runways[0];
  const u = Object.entries(pista.thresholds).filter(([, t]) => t?.xy);
  const salida = (u.find(([n]) => n === cual.cabecera) ?? u[0])[1].xy;
  const otro = (u.find(([n]) => n !== cual.cabecera) ?? u[1])[1].xy;
  // Del fichero al mundo: la Y del norte es la Z negativa.
  const a = [salida[0], -salida[1]];
  const b = [otro[0], -otro[1]];
  const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / largo;
  const uz = (b[1] - a[1]) / largo;
  const suelo = (cotaMedida ?? COTA_DEL_FICHERO) + 0.02;

  if (vista === 'aproximacion') {
    camaraEn(a[0] - ux * 2200, suelo + altura, a[1] - uz * 2200, a[0], suelo, a[1]);
  } else if (vista === 'cabecera') {
    camaraEn(a[0] - ux * 90, suelo + 22, a[1] - uz * 90, a[0] + ux * 900, suelo, a[1] + uz * 900);
  } else {
    /*
     * Cenital, para ver si el asfalto casa con el de la foto. **Inclinada un
     * poco**, no a plomo: con la cámara mirando exactamente hacia abajo, la
     * dirección de vista y el vector de arriba son la misma recta, la matriz
     * degenera y el cargador de teselas se queda en «cero de cero». Se veía
     * como un aeropuerto flotando en negro absoluto, que parece un fallo del
     * mundo y era un fallo de la cámara.
     */
    const desvio = altura * 0.35;
    camaraEn(desvio, suelo + altura * 3.4, desvio, 0, suelo, 0);
  }
}

bucle();

addEventListener('resize', () => {
  camara.aspect = innerWidth / innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  teselas.setResolutionFromRenderer(camara, renderer);
});

globalThis.__spike = {
  teselas,
  nuestro,
  supuesta: COTA_DEL_FICHERO,
  catasDePista: () => CATAS.map(([x, z]) => cotaDelMundo(x, z)),
  plausible: (c) => c !== null && Math.abs(c - COTA_DEL_FICHERO) < MARGEN_PLAUSIBLE,
  fps: () => fps,
  cota: () => cotaMedida,
  cotaDelMundo,
};
